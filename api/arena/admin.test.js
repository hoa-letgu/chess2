import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { io } from 'socket.io-client';
import { ArenaStore } from './store.js';
import { dashboard, userStats, reportRange, presenceStart, presenceTouch } from './analytics.js';
import { installArena } from './server.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

const range = () => ({ from: Date.now() - 86400000, to: Date.now() + 86400000 });
function pair(store) { return ['test_admin', 'test_player'].map(username => store.register(username, 'password123')); }
test('admin report counts games once, full stake pool, and net profit excluding returned capital/topups', () => {
  const s = new ArenaStore(':memory:'); try {
    const [a, b] = pair(s); for (const u of [a, b]) s.topup(u.user.id, 1000, `initial-topup-${u.user.id}`);
    let m = s.create(a.user.id, { name: 'Report', game: 'othello', stake: 100 }); m = s.join(b.user.id, m.id);
    s.action(b.user.id, m.id, { type: 'resign', version: m.version });
    const d = dashboard(s, range(), 1), game = d.games.find(g => g.id === 'othello');
    assert.equal(d.summary.matches, 1); assert.equal(game.matches, 1); assert.equal(game.completed, 1); assert.equal(game.players, 2); assert.equal(game.stake_volume, 200);
    assert.equal(d.summary.topup, 2000); assert.equal(d.summary.revenue_vnd, 0); assert.equal(d.summary.platform_fee, 0);
    assert.equal(d.rankings.profit[0].profit, 100); assert.equal(d.rankings.profit[0].payout, 200);
    assert.equal(d.rankings.best[0].win_rate, 100); assert.equal(d.rankings.weakest[0].win_rate, 0);
    assert.equal(d.games.length, 13); assert.ok(userStats(s, range()).every(u => u.discrepancy === 0));
    assert.equal(dashboard(s, range(), 5).rankings.best.length, 0);
    assert.ok(!JSON.stringify(d).includes('password'));
  } finally { s.close(); }
});
test('finished-period results include a game started earlier; held stakes are not player losses', () => {
  const s = new ArenaStore(':memory:'); try {
    const [a, b] = pair(s); for (const u of [a, b]) s.topup(u.user.id, 1000, `initial-topup-${u.user.id}`);
    let m = s.create(a.user.id, { name: 'Across dates', game: 'chess', stake: 100 }); m = s.join(b.user.id, m.id);
    m.started = Date.now() - 5 * 86400000; s.save(m);
    assert.ok(userStats(s, range()).every(u => u.profit === 0));
    s.action(b.user.id, m.id, { type: 'resign', version: m.version });
    const users = userStats(s, range()); assert.equal(users.find(u => u.id === a.user.id).wins, 1);
    assert.equal(users.find(u => u.id === a.user.id).games, 0); assert.equal(users.find(u => u.id === a.user.id).profit, 100);
  } finally { s.close(); }
});
test('presence clips to date range and duplicate tabs do not create duplicate active spans', () => {
  const s = new ArenaStore(':memory:'); try {
    const [a] = pair(s); const time = Date.now(); presenceStart(s, a.user.id, time); presenceStart(s, a.user.id, time + 1000); presenceTouch(s, a.user.id, time + 60000, true);
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM online_spans').get().n, 1);
    assert.equal(userStats(s, { from: time + 10000, to: time + 50000 })[0].online_seconds, 40);
  } finally { s.close(); }
});
test('alerts explain large/rapid topups and reconciliation mismatch, without changing balances', () => {
  const s = new ArenaStore(':memory:'); try {
    const [a] = pair(s); for (let i = 0; i < 5; i++) s.topup(a.user.id, 10000, `test-topup-key-${i}`);
    s.db.prepare('UPDATE users SET balance=balance+7 WHERE id=?').run(a.user.id);
    const alerts = dashboard(s, range()).alerts;
    assert.deepEqual(new Set(alerts.map(a => a.rule)), new Set(['large_topup', 'rapid_topup', 'balance_mismatch']));
    assert.equal(s.publicUser(a.user.id).balance, 50007);
    assert.throws(() => reportRange({ from: '2026-02-30' })); assert.throws(() => reportRange({ from: '2020-01-01', to: '2026-01-01' }));
  } finally { s.close(); }
});
test('admin HTTP denies guests/players, paginates safely, audits reviews and tracks multi-tab presence', async t => {
  const app = express(), server = createServer(app); let time = Date.now();
  const arena = installArena(app, server, { dbPath: ':memory:', now: () => time });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, sockets = [];
  t.after(() => { sockets.forEach(s => s.disconnect()); arena.close(); });
  async function req(path, cookie = '', body, headers = {}) { const r = await fetch(base + '/api/arena' + path, { headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Arena-Request': '1', ...headers }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) }); return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] }; }
  assert.equal((await req('/admin/dashboard')).status, 401);
  const a = await req('/auth/register', '', { username: 'admin_test', password: 'password123', is_admin: 1 });
  const b = await req('/auth/register', '', { username: 'ordinary_test', password: 'password123' });
  assert.equal(a.data.user.is_admin, 0); assert.equal((await req('/admin/dashboard', a.cookie)).status, 403);
  arena.store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(a.data.user.id);
  for (let i = 0; i < 5; i++) arena.store.topup(b.data.user.id, 10000, `http-admin-key-${i}`);
  let response = await req('/admin/dashboard?minGames=1', a.cookie); assert.equal(response.status, 200); assert.equal(response.data.summary.topup, 50000);
  assert.equal((await req('/admin/users?q=ordinary&limit=1', a.cookie)).data.total, 1);
  assert.equal((await req('/admin/users?page=-1', a.cookie)).status, 400);
  assert.equal((await req('/admin/topups?limit=2&page=2', a.cookie)).data.items.length, 2);
  assert.equal((await req('/admin/users/' + b.data.user.id, a.cookie)).data.ledgerTotal, 5);
  assert.equal((await req('/admin/users/' + b.data.user.id, b.cookie)).status, 403);
  const fingerprint = response.data.alerts[0].fingerprint;
  assert.equal((await req('/admin/reviews', a.cookie, { fingerprint, status: 'resolved', note: 'Đã kiểm tra' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await req('/admin/reviews', a.cookie, { fingerprint, status: 'resolved', note: 'Đã kiểm tra' })).status, 200);
  assert.equal(arena.store.db.prepare('SELECT COUNT(*) n FROM admin_audit').get().n, 1);
  assert.equal((await req('/admin/dashboard', a.cookie)).data.alerts.find(a => a.fingerprint === fingerprint).review.status, 'resolved');
  arena.store.topup(b.data.user.id, 1000, 'changed-evidence-key');
  const changed = (await req('/admin/dashboard', a.cookie)).data.alerts.find(a => a.rule === 'large_topup');
  assert.notEqual(changed.fingerprint, fingerprint); assert.equal(changed.review, null);
  async function connect() { const socket = io(base, { path: '/arena-socket', transports: ['websocket'], extraHeaders: { Cookie: b.cookie }, forceNew: true }); sockets.push(socket); await once(socket, 'connect'); return socket; }
  const first = await connect(), second = await connect(); time += 30000; arena.sweep();
  const gone = once(arena.io.sockets.sockets.get(first.id), 'disconnect'); first.disconnect(); await gone;
  time += 30000; arena.sweep();
  assert.equal((await req('/admin/dashboard', a.cookie)).data.summary.online, 1);
  const row = (await req('/admin/users?q=ordinary', a.cookie)).data.items[0]; assert.equal(row.online_seconds, 60);
  const gone2 = once(arena.io.sockets.sockets.get(second.id), 'disconnect'); second.disconnect(); await gone2;
  assert.equal((await req('/admin/dashboard', a.cookie)).data.summary.online, 0);
  const activity = io(base, { path: '/arena-socket', auth: { activityOnly: true }, transports: ['websocket'], extraHeaders: { Cookie: b.cookie }, forceNew: true }); sockets.push(activity); await once(activity, 'connect');
  assert.equal((await req('/admin/dashboard', a.cookie)).data.summary.online, 1);
  assert.equal((await req('/rooms', b.cookie, { name: 'Activity is not a match connection', game: 'chess', stake: 0 })).status, 400);
});

test('SQLite migration preserves legacy accounts and backfills saved match history without granting admin', () => {
  const directory = mkdtempSync(join(tmpdir(), 'arena-admin-migration-')), path = join(directory, 'test.sqlite');
  try {
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE,password TEXT NOT NULL,balance INTEGER NOT NULL DEFAULT 0); CREATE TABLE matches(id TEXT PRIMARY KEY,data TEXT NOT NULL);`);
    old.prepare('INSERT INTO users VALUES(?,?,?,?)').run('old-a', 'old_player', 'unchanged-hash', 0);
    old.prepare('INSERT INTO users VALUES(?,?,?,?)').run('old-b', 'old_other', 'unchanged-hash', 0);
    const now = Date.now();
    old.prepare('INSERT INTO matches VALUES(?,?)').run('old-match', JSON.stringify({ id: 'old-match', game: 'chess', name: 'Historical', stake: 0, created: now - 100000, started: now - 90000, finished: now - 1000, status: 'finished', players: [{ id: 'old-a' }, { id: 'old-b' }], result: { winner: 0 } }));
    old.close();
    let store = new ArenaStore(path);
    assert.equal(store.publicUser('old-a').is_admin, 0); assert.equal(store.publicUser('old-a').balance, 0);
    assert.equal(store.db.prepare('SELECT password FROM users WHERE id=?').get('old-a').password, 'unchanged-hash');
    assert.equal(dashboard(store, range(), 1).summary.matches, 1); store.close();
    store = new ArenaStore(path); assert.equal(dashboard(store, range(), 1).summary.matches, 1); store.close();
  } finally { if (!resolve(directory).startsWith(resolve(tmpdir()) + sep + 'arena-admin-migration-')) throw Error('Unexpected cleanup path'); rmSync(directory, { recursive: true, force: true }); }
});
