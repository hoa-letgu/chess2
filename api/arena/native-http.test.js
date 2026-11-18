import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import express from 'express';
import { installArena } from './server.js';
const require = createRequire(import.meta.url), { io: client } = require('socket.io-client');

test('eight new games over authenticated HTTP and two live sockets: join, move, sync, reconnect and private deck', async t => {
  const http = createServer(express()), app = express();
  http.removeAllListeners('request'); http.on('request', app);
  const arena = installArena(app, http, { dbPath: ':memory:' });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${http.address().port}`, sockets = [];
  t.after(async () => { sockets.forEach(s => s.disconnect()); await new Promise(resolve => setImmediate(resolve)); arena.close(); if (http.listening) await new Promise(resolve => http.close(resolve)); });
  async function request(path, cookie, body) {
    const r = await fetch(base + '/api/arena' + path, { headers: { Cookie: cookie ?? '', 'X-Arena-Request': '1', 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    const data = await r.json(); assert.equal(r.status, 200, JSON.stringify(data)); return { ...data, cookie: r.headers.get('set-cookie')?.split(';')[0] };
  }
  async function connect(cookie) {
    const socket = client(base, { path: '/arena-socket', transports: ['websocket'], extraHeaders: { Cookie: cookie }, reconnection: false, forceNew: true }); sockets.push(socket);
    await Promise.race([once(socket, 'connect'), once(socket, 'connect_error').then(([e]) => Promise.reject(e))]); return socket;
  }
  const a = await request('/auth/register', '', { username: 'online_first', password: 'password123' }), b = await request('/auth/register', '', { username: 'online_second', password: 'password123' });
  const sa = await connect(a.cookie), sb = await connect(b.cookie);
  const commands = { ludo: { op: 'roll' }, oanquan: { op: 'sow', pit: 0, direction: 1 }, cochem: { op: 'step', from: 14, to: 13 }, coup: { op: 'step', from: 54, to: 45 }, tycoon: { op: 'roll' }, shogi: { op: 'step', from: 54, to: 45, promote: false }, checkers: { op: 'step', from: 40, to: 33 }, othello: { op: 'place', to: 19 } };
  for (const [game, command] of Object.entries(commands)) {
    const created = await request('/rooms', a.cookie, { name: `Online ${game}`, game, stake: 0 });
    assert.equal(created.room.game, game); assert.equal(created.room.status, 'waiting');
    const list = await request('/rooms', b.cookie); assert.ok(list.rooms.some(m => m.id === created.room.id));
    if (game === 'tycoon') assert.deepEqual(created.room.state.native.deck, []);
    const joined = await request(`/rooms/${created.room.id}/join`, b.cookie, {});
    assert.equal(joined.room.players.length, 2); assert.equal(joined.room.status, 'playing');
    const changedA = once(sa, 'arena:changed'), changedB = once(sb, 'arena:changed');
    const moved = await request(`/rooms/${created.room.id}/action`, a.cookie, { type: 'move', version: joined.room.version, ...command });
    await Promise.all([changedA, changedB]);
    const [viewA, viewB] = await Promise.all([request(`/rooms/${created.room.id}`, a.cookie), request(`/rooms/${created.room.id}`, b.cookie)]);
    assert.equal(viewA.room.version, moved.room.version); assert.deepEqual(viewA.room.state, viewB.room.state); assert.notDeepEqual(viewA.room.state, joined.room.state);
    if (game === 'coup') assert.ok(viewA.room.state.native.board[45].kind);
    if (game === 'tycoon') assert.deepEqual(viewB.room.state.native.deck, []);
    if (game === 'othello') { sb.disconnect(); await connect(b.cookie); const resumed = await request(`/rooms/${created.room.id}`, b.cookie); assert.deepEqual(resumed.room.state, moved.room.state); }
    const ended = await request(`/rooms/${created.room.id}/action`, b.cookie, { type: 'resign', version: moved.room.version }); assert.equal(ended.room.result.winner, 0);
    assert.equal((await request('/me', a.cookie)).user.balance, 0); assert.equal((await request('/me', b.cookie)).user.balance, 0);
  }
});
