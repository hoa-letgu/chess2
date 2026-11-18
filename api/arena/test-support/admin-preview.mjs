// Local UI verification only: generated fixtures live exclusively in memory.
import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { installArena } from '../server.js';
import { GAME_NAMES } from '../games.js';
import { presenceStart, presenceTouch } from '../analytics.js';
const app = express(), server = createServer(app);
const arena = installArena(app, server, { dbPath: ':memory:' });
const store = arena.store;
const accounts = ['admin_preview', 'sen_hong', 'truc_xanh', 'rong_vang', 'co_thu', 'may_trang'].map(name => store.register(name, 'preview-password'));
store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(accounts[0].user.id);
const now = Date.now();
for (let i = 0; i < accounts.length; i++) {
  const id = accounts[i].user.id;
  for (let j = 0; j < 2 + i; j++) {
    store.topup(id, 10000, randomUUID());
    // Spread the valid deposits across days for a readable chart.
    store.db.prepare("UPDATE ledger SET created=? WHERE id=(SELECT id FROM ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 1)").run(now - ((i + j) % 14) * 86400000, id);
  }
  presenceStart(store, id, now - (i + 1) * 65 * 60000); presenceTouch(store, id, now - 60000, true);
}
let count = 0;
for (const game of Object.keys(GAME_NAMES)) {
  const plays = 2 + count % 5;
  for (let i = 0; i < plays; i++) {
    const a = accounts[1 + count % 4], b = accounts[5];
    let match = store.create(a.user.id, { name: `Bàn thử ${GAME_NAMES[game]}`, game, stake: 100 + count * 50 }); match = store.join(b.user.id, match.id);
    store.action(b.user.id, match.id, { type: 'resign', version: match.version });
    match = store.match(match.id); match.created = now - (1 + count % 12) * 86400000; match.started = match.created + 1000; match.finished = match.created + 600000; store.save(match);
  }
  count++;
}
await new Promise(resolve => server.listen(3302, '127.0.0.1', resolve));
console.log('Admin preview on 127.0.0.1:3302; in-memory fixtures only.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { arena.close(); process.exit(0); });
