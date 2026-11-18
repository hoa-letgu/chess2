// Isolated manual browser QA. Not imported by the application server.
// Accounts and rooms only exist in this process's in-memory database.
import express from 'express';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { installArena } from '../server.js';
import * as quan from '../rules/oanquan.js';
import * as chem from '../rules/cochem.js';
import * as up from '../rules/coup.js';
import * as shogi from '../rules/shogi.js';
import * as checkers from '../rules/checkers.js';
import * as othello from '../rules/othello.js';
import * as ludo from '../rules/ludo.js';
import * as empire from '../rules/tycoon.js';
const require = createRequire(import.meta.url), { io } = require('socket.io-client');
const app = express(), http = createServer(app), arena = installArena(app, http, { dbPath: ':memory:' });
const a = arena.store.register('native_preview_a', 'preview-password'), b = arena.store.register('native_preview_b', 'preview-password');
await new Promise(resolve => http.listen(3301, '127.0.0.1', resolve));
const cookie = `arena_session=${b.token}`, socket = io('http://127.0.0.1:3301', { path: '/arena-socket', transports: ['websocket'], extraHeaders: { Cookie: cookie } });
await once(socket, 'connect');
async function request(path, body) {
  const r = await fetch('http://127.0.0.1:3301/api/arena' + path, { headers: { Cookie: cookie, 'X-Arena-Request': '1', 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
  const data = await r.json(); if (!r.ok) throw Error(data.error); return data;
}
function command(game, n) {
  if (game === 'oanquan') return { op: 'sow', pit: quan.legalPits(n)[0], direction: 1 };
  if (game === 'cochem') return { op: 'step', ...chem.legalMoves(n)[0] };
  if (game === 'coup') return { op: 'step', ...up.legalUpMoves(n)[0] };
  if (game === 'shogi') { const m = shogi.legalMoves(n)[0]; return m.type === 'move' ? { op: 'step', from: m.from, to: m.to, promote: m.promote } : { op: 'drop', kind: m.kind, to: m.to }; }
  if (game === 'checkers') { const m = checkers.legalSteps(n)[0]; return { op: 'step', from: m.from, to: m.to }; }
  if (game === 'othello') return { op: 'place', to: othello.legalMoves(n.board, n.turn)[0].at };
  if (game === 'ludo') return n.phase === 'roll' ? { op: 'roll' } : { op: 'token', token: ludo.legalTokens(n)[0] };
  const m = empire.chooseEmpireAction(n); return m ? { op: m.type, ...('tile' in m ? { tile: m.tile } : {}) } : { op: 'roll' };
}
let busy = false;
const timer = setInterval(async () => {
  if (busy) return; busy = true;
  try {
    const { rooms, current } = await request('/rooms');
    const waiting = rooms.find(m => m.players[0].id === a.user.id);
    if (waiting && !current) await request(`/rooms/${waiting.id}/join`, {});
    else if (current?.status === 'playing' && current.state.turn === 1) await request(`/rooms/${current.id}/action`, { type: 'move', version: current.version, ...command(current.game, current.state.native) });
  } catch (e) { if (!/lượt|thay đổi|trực tuyến/.test(e.message)) console.error(e.message); }
  finally { busy = false; }
}, 800);
console.log('Isolated native-game preview ready on 127.0.0.1:3301 (memory only).');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(timer); socket.disconnect(); arena.close(); process.exit(0); });
