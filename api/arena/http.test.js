import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import express from 'express';
import { Server } from 'socket.io';
import { installArena } from './server.js';

const require = createRequire(import.meta.url);
const { io: client } = require('socket.io-client');
const settle = () => new Promise(resolve => setImmediate(resolve));

test('HTTP + realtime: accounts, CSRF, holds, reconnect and 60s timeout with legacy socket coexistence', async t => {
  const app = express(), http = createServer(app); let time = Date.now();
  const arena = installArena(app, http, { dbPath: ':memory:', now: () => time });
  const legacy = new Server(http);
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${http.address().port}`;
  const sockets = [];
  t.after(async () => { for (const s of sockets) s.disconnect(); await settle(); arena.close(); legacy.close(); if (http.listening) await new Promise(resolve => http.close(resolve)); });
  async function request(path, cookie, data, extra = {}) {
    const res = await fetch(`${base}/api/arena${path}`, { headers: { Cookie: cookie ?? '', 'Content-Type': 'application/json', 'X-Arena-Request': '1', ...extra }, ...(data === undefined ? {} : { method: 'POST', body: JSON.stringify(data) }) }).catch(e => { throw new Error(`${e.message}: ${e.cause?.code ?? ''} ${e.cause?.message ?? ''}`); });
    return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
  }
  async function connect(cookie, path = '/arena-socket') {
    const s = client(base, { path, transports: ['websocket'], extraHeaders: { Cookie: cookie }, reconnection: false, forceNew: true }); sockets.push(s);
    await Promise.race([once(s, 'connect'), once(s, 'connect_error').then(([e]) => Promise.reject(e)), new Promise((_, reject) => { const timer = setTimeout(() => reject(Error('Socket connect timeout')), 5000); timer.unref(); })]);
    return s;
  }
  assert.equal((await request('/me')).status, 401);
  assert.equal((await request('/auth/register', '', { username: 'blocked', password: 'password123' }, { Origin: 'https://untrusted.example' })).status, 403);
  const a = await request('/auth/register', '', { username: 'alice', password: 'password123' });
  const b = await request('/auth/register', '', { username: 'bob', password: 'password123' });
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.ok(a.cookie.startsWith('arena_session='));
  await request('/wallet/demo-topup', a.cookie, { amount: 1000, requestId: 'http-topup-alice-01' });
  await request('/wallet/demo-topup', b.cookie, { amount: 1000, requestId: 'http-topup-bobby-01' });
  const sa = await connect(a.cookie); let sb = await connect(b.cookie); await connect('', '/socket.io');
  const created = await request('/rooms', a.cookie, { name: 'Integration', game: 'chess', stake: 100 });
  assert.equal(created.status, 200); const id = created.data.room.id;
  assert.equal((await request(`/rooms/${id}/join`, b.cookie, {})).data.room.status, 'playing');
  assert.equal((await request('/me', a.cookie)).data.user.balance, 900);
  const wrongMove = await request(`/rooms/${id}/action`, b.cookie, { type: 'move', version: 1, from: [1, 0], to: [2, 0] });
  assert.equal(wrongMove.status, 400);
  let disconnected = once(arena.io.sockets.sockets.get(sb.id), 'disconnect'); sb.disconnect(); await disconnected;
  time += 59000; arena.sweep(); assert.equal(arena.store.match(id).status, 'playing');
  sb = await connect(b.cookie); arena.sweep(); assert.equal(arena.store.match(id).status, 'playing');
  // A second tab keeps the account online when the first one closes.
  const sb2 = await connect(b.cookie);
  disconnected = once(arena.io.sockets.sockets.get(sb.id), 'disconnect'); sb.disconnect(); await disconnected;
  time += 61000; arena.sweep(); assert.equal(arena.store.match(id).status, 'playing');
  disconnected = once(arena.io.sockets.sockets.get(sb2.id), 'disconnect'); sb2.disconnect(); await disconnected;
  time += 59999; arena.sweep(); assert.equal(arena.store.match(id).status, 'playing');
  time += 2; arena.sweep(); assert.equal(arena.store.match(id).result.winner, 0);
  assert.equal((await request('/me', a.cookie)).data.user.balance, 1100);
  assert.equal((await request('/me', b.cookie)).data.user.balance, 900);
  arena.sweep(); assert.equal(arena.store.ledger(a.data.user.id).filter(e => e.kind === 'win_payout').length, 1);
  sb = await connect(b.cookie);
  const second = await request('/rooms', a.cookie, { name: 'Both disconnect', game: 'gomoku', stake: 100 });
  const secondId = second.data.room.id;
  await request(`/rooms/${secondId}/join`, b.cookie, {});
  const goneA = once(arena.io.sockets.sockets.get(sa.id), 'disconnect'), goneB = once(arena.io.sockets.sockets.get(sb.id), 'disconnect');
  sa.disconnect(); sb.disconnect(); await Promise.all([goneA, goneB]);
  time += 60001; arena.sweep(); assert.equal(arena.store.match(secondId).result.winner, -1);
  assert.equal((await request('/me', a.cookie)).data.user.balance, 1100);
  assert.equal((await request('/me', b.cookie)).data.user.balance, 900);
  await request('/auth/logout', a.cookie, {}); assert.equal((await request('/me', a.cookie)).status, 401);
});
