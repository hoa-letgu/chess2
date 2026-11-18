import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { ArenaStore } from './store.js';
import { GAME_NAMES } from './games.js';
import { changeWalletLock, walletLockHistory } from './wallet-lock.js';
import { saveSettings, settings } from './payment-config.js';
import { installArena } from './server.js';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function setup(s) {
  const [admin, a, b] = ['lock_admin', 'lock_player', 'lock_opponent'].map(name => s.register(name, 'password123').user);
  s.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.id);
  for (const u of [a, b]) s.topup(u.id, 1000, `initial-${u.id}`);
  const lock = (user, amount, version = s.publicUser(user.id).lock_version, walletMode = 'demo') => changeWalletLock(s, admin.id, user.id, { amount, version, walletMode, reason: 'Kiểm tra khóa một phần' });
  return { admin, a, b, lock };
}
test('partial locks preserve total/ledger, enforce available funds in all 12 games and permit zero-stake play', () => {
  for (const game of Object.keys(GAME_NAMES).filter(game=>game!=='cothe')) {
    const s = new ArenaStore(':memory:'); try {
      const { a, b, lock } = setup(s); lock(a, 800);
      assert.equal(s.publicUser(a.id).balance, 1000); assert.equal(s.publicUser(a.id).available_coins, 200);
      assert.equal(s.ledger(a.id).length, 1);
      assert.throws(() => s.create(a.id, { game, name: 'Locked', stake: 201 }), /khả dụng/);
      let m = s.create(a.id, { game, name: 'Free', stake: 0 }); m = s.join(b.id, m.id);
      s.action(a.id, m.id, { type: 'resign', version: m.version });
      m = s.create(a.id, { game, name: 'Allowed remainder', stake: 200 }); m = s.join(b.id, m.id);
      assert.equal(s.publicUser(a.id).balance, 800); assert.equal(s.publicUser(a.id).available_coins, 0);
      s.action(a.id, m.id, { type: 'resign', version: m.version });
      assert.equal(s.publicUser(a.id).locked_coins, 800);
    } finally { s.close(); }
  }
});
test('joining checks both players again after a waiting host is locked; rejected holds roll back together', () => {
  const s = new ArenaStore(':memory:'); try {
    const { a, b, lock } = setup(s); const m = s.create(a.id, { game: 'chess', name: 'Waiting', stake: 300 });
    lock(a, 800); assert.throws(() => s.join(b.id, m.id), /khả dụng/);
    assert.equal(s.match(m.id).players.length, 1); assert.equal(s.publicUser(b.id).balance, 1000);
    lock(a, 0); lock(b, 900); assert.throws(() => s.join(b.id, m.id), /khả dụng/);
    assert.equal(s.publicUser(a.id).balance, 1000);
    lock(b, 0); assert.equal(s.join(b.id, m.id).status, 'playing');
  } finally { s.close(); }
});
test('already-held wagers settle and new credits remain usable while a fixed amount stays locked', () => {
  const s = new ArenaStore(':memory:'); try {
    const { a, b, lock } = setup(s); let m = s.create(a.id, { game: 'chess', name: 'Active', stake: 200 }); m = s.join(b.id, m.id);
    lock(a, 800); s.action(b.id, m.id, { type: 'resign', version: m.version });
    assert.equal(s.publicUser(a.id).balance, 1200); assert.equal(s.publicUser(a.id).available_coins, 400);
    s.topup(a.id, 1000, 'another-topup-key-123'); assert.equal(s.publicUser(a.id).available_coins, 1400);
    assert.throws(() => s.credit(a.id, -1401, 'stake_hold'), /khả dụng/);
    assert.equal(s.publicUser(a.id).balance, 2200);
  } finally { s.close(); }
});
test('lock updates validate role, amount, reason, stale versions and wallet mode; histories never alter balances', () => {
  const s = new ArenaStore(':memory:'); try {
    const { a, b, lock } = setup(s);
    for (const amount of [-1, 0.5, '100', 1001, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => lock(a, amount));
    assert.throws(() => changeWalletLock(s, b.id, a.id, { amount: 100, version: 0, walletMode: 'demo', reason: 'X' }), /quản trị/);
    lock(a, 600); assert.throws(() => lock(a, 700, 0), /thay đổi/);
    saveSettings(s, b.id, { ...settings(s), environment: 'sandbox', mode: 'paid', vndPerCoin: 1 });
    assert.equal(s.publicUser(a.id).locked_coins, 0); assert.throws(() => lock(a, 0, 0), /ví đã thay đổi/);
    s.credit(a.id, 100, 'sandbox_topup'); lock(a, 60, 0, 'sandbox');
    assert.equal(s.publicUser(a.id).available_coins, 40);
    saveSettings(s, b.id, { ...settings(s), mode: 'demo' }); assert.equal(s.publicUser(a.id).locked_coins, 600);
    lock(a, 0); assert.equal(s.publicUser(a.id).available_coins, 1000);
    assert.equal(walletLockHistory(s, a.id).length, 3);
    assert.equal(walletLockHistory(s, a.id)[0].amount, 0);
  } finally { s.close(); }
});
test('wallet-lock HTTP is admin-only, CSRF protected, visible to owner and persisted in admin detail', async t => {
  const app = express(), server = createServer(app), arena = installArena(app, server, { dbPath: ':memory:' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => arena.close());
  const { admin, a, b } = setup(arena.store), base = `http://127.0.0.1:${server.address().port}/api/arena`;
  const req = async (path, id, body, origin) => {
    const token = id ? arena.store.newSession(id).token : '';
    const r = await fetch(base + path, { headers: { Cookie: `arena_session=${token}`, 'Content-Type': 'application/json', 'X-Arena-Request': '1', ...(origin ? { Origin: origin } : {}) }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    return { status: r.status, data: await r.json() };
  };
  const path = `/admin/users/${a.id}/wallet-lock`, body = { amount: 700, version: 0, walletMode: 'demo', reason: 'Rà soát thử nghiệm' };
  assert.equal((await req(path, null, body)).status, 401); assert.equal((await req(path, b.id, body)).status, 403);
  assert.equal((await req(path, admin.id, body, 'https://evil.example')).status, 403);
  assert.equal((await req(path, admin.id, body)).status, 200);
  assert.equal((await req('/me', a.id)).data.user.available_coins, 300);
  const detail = (await req(`/admin/users/${a.id}`, admin.id)).data;
  assert.equal(detail.user.locked_coins, 700); assert.equal(detail.lockHistory[0].actor, 'lock_admin');
  assert.equal((await req(path, admin.id, body)).status, 400);
});
test('partial lock and admin audit survive SQLite close/reopen without changing coin ledger', () => {
  const path = join(tmpdir(), `arena-wallet-lock-${randomUUID()}.sqlite`);
  let s = new ArenaStore(path);
  try {
    const { a, lock } = setup(s); lock(a, 750); s.close(); s = new ArenaStore(path);
    assert.equal(s.publicUser(a.id).locked_coins, 750);
    assert.equal(s.publicUser(a.id).available_coins, 250);
    assert.equal(s.publicUser(a.id).balance, 1000);
    assert.equal(walletLockHistory(s, a.id).length, 1);
    assert.equal(s.ledger(a.id).length, 1);
  } finally {
    s.close();
    for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file);
  }
});
