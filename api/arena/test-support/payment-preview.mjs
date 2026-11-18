// Isolated preview: no real merchant credentials, no external requests, no disk DB.
import express from 'express';
import { createServer } from 'node:http';
import { installArena } from '../server.js';
import { saveSettings, settings } from '../payment-config.js';
import { fakePaymentEnv, fakeGateway } from './payment-fixtures.mjs';
const app = express(), server = createServer(app), mock = fakeGateway({ paidAfterMs: 15000 });
const arena = installArena(app, server, { dbPath: ':memory:', paymentEnv: fakePaymentEnv(), paymentFetch: mock.fetch });
const admin = arena.store.register('admin_preview', 'preview-password');
arena.store.register('player_preview', 'preview-password');
arena.store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.user.id);
saveSettings(arena.store, admin.user.id, { ...settings(arena.store), vndPerCoin: 1 });
await new Promise(resolve => server.listen(3303, '127.0.0.1', resolve));
console.log('Payment UI preview at 127.0.0.1:3303: in-memory DB, fictional gateways, no real payments.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { arena.close(); process.exit(0); });
