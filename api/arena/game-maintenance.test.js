import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GAME_NAMES } from './games.js';
import { ArenaStore } from './store.js';
import { gameCatalog, updateGameMaintenance } from './game-maintenance.js';
import { installArena } from './server.js';

function users(s) {
  const [admin, a, b] = ['maint_admin', 'maint_player', 'maint_other'].map(name => s.register(name, 'password123').user);
  s.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.id);
  for (const user of [a, b]) s.topup(user.id, 1000, `initial-${user.id}`);
  const update = (game, maintenance, version = gameCatalog(s).find(row => row.id === game).version) => updateGameMaintenance(s, admin.id, game, { maintenance, message: 'Nâng cấp bàn cờ', version });
  return { admin, a, b, update };
}
test('maintenance blocks creation/join for all 13 games, preserves balances and can reopen waiting games', () => {
  for (const game of Object.keys(GAME_NAMES)) {
    const s = new ArenaStore(':memory:'); try {
      const { a, b, update } = users(s);
      const room = s.create(a.id, { name: 'Waiting', game, stake: game==='cothe'?0:100 }); update(game, true);
      assert.throws(() => s.create(b.id, { name: 'Blocked', game, stake: 0 }), /bảo trì/);
      assert.throws(() => s.join(b.id, room.id), /bảo trì/);
      assert.equal(s.publicUser(a.id).balance, 1000); assert.equal(s.publicUser(b.id).balance, 1000);
      assert.equal(s.match(room.id).status, 'waiting'); update(game, false);
      assert.equal(s.join(b.id, room.id).status, 'playing');
    } finally { s.close(); }
  }
});
test('active match can reconnect and settle once while its game is hidden; other games remain available', () => {
  const s = new ArenaStore(':memory:'); try {
    const { a, b, update } = users(s); let room = s.create(a.id, { name: 'Playing', game: 'chess', stake: 100 }); room = s.join(b.id, room.id);
    update('chess', true); assert.equal(s.join(a.id, room.id).status, 'playing');
    s.action(b.id, room.id, { type: 'resign', version: room.version });
    assert.equal(s.publicUser(a.id).balance, 1100); assert.equal(s.publicUser(b.id).balance, 900);
    assert.equal(s.create(a.id, { name: 'Other game', game: 'othello', stake: 0 }).status, 'waiting');
    assert.equal(s.db.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='game_maintenance'").get().n, 1);
  } finally { s.close(); }
});
test('settings reject ordinary users, invalid game/values, stale updates and persist across SQLite restart', () => {
  const path = join(tmpdir(), `arena-maintenance-${randomUUID()}.sqlite`); let s = new ArenaStore(path);
  try {
    const { a, admin, update } = users(s), data = { maintenance: true, message: 'Bảo trì', version: 0 };
    assert.throws(() => updateGameMaintenance(s, a.id, 'chess', data), /quản trị/);
    for (const input of [{ ...data, maintenance: 'yes' }, { ...data, version: -1 }, { ...data, message: 'x'.repeat(301) }]) assert.throws(() => updateGameMaintenance(s, admin.id, 'chess', input));
    assert.throws(() => update('unknown', true, 0)); update('chess', true); assert.throws(() => update('chess', false, 0), /thay đổi/);
    s.close(); s = new ArenaStore(path);
    assert.equal(gameCatalog(s).find(row => row.id === 'chess').maintenance, true);
    assert.equal(gameCatalog(s).find(row => row.id === 'chess').message, 'Nâng cấp bàn cờ');
    assert.equal(gameCatalog(s).filter(row => !row.maintenance).length, 12);
  } finally { s.close(); for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file); }
});
test('public catalog and room filtering reflect admin-only, CSRF-protected maintenance updates', async t => {
  const app = express(), server = createServer(app), arena = installArena(app, server, { dbPath: ':memory:' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => arena.close());
  const { admin, a, b } = users(arena.store), base = `http://127.0.0.1:${server.address().port}/api/arena`;
  const request = async (path, user, body, origin) => {
    const token = user ? arena.store.newSession(user.id).token : '';
    const response = await fetch(base + path, { headers: { Cookie: `arena_session=${token}`, 'Content-Type': 'application/json', 'X-Arena-Request': '1', ...(origin ? { Origin: origin } : {}) }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await request('/games')).data.games.length, 13);
  const body = { maintenance: true, message: 'Cập nhật hệ thống', version: 0 }, path = '/admin/games/chess/maintenance';
  assert.equal((await request(path, null, body)).status, 401); assert.equal((await request(path, b, body)).status, 403);
  assert.equal((await request(path, admin, body, 'https://evil.example')).status, 403);
  arena.store.create(a.id, { game: 'chess', name: 'Hidden room', stake: 100 });
  assert.equal((await request(path, admin, body)).status, 200);
  assert.equal((await request('/games')).data.games.find(game => game.id === 'chess').maintenance, true);
  assert.equal((await request('/rooms', b)).data.rooms.length, 0);
  assert.equal((await request('/rooms', a)).data.current.name, 'Hidden room');
  assert.equal((await request(path, admin, body)).status, 400);
  const puzzlePath='/admin/games/cothe/maintenance';
  assert.equal((await request(puzzlePath,admin,body)).status,200);
  assert.equal((await request('/games')).data.games.find(game=>game.id==='cothe').mode,'online');
  assert.equal((await request('/games')).data.games.find(game=>game.id==='cothe').maintenance,true);
  assert.throws(()=>arena.store.create(b.id,{game:'cothe',name:'Invalid online puzzle',stake:100}),/0 xu/);
});
