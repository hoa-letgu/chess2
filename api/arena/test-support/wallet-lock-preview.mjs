// UI verification only: disposable in-memory accounts, no real balances or gateways.
import express from 'express';
import { createServer } from 'node:http';
import { installArena } from '../server.js';
const app = express(), server = createServer(app);
const arena = installArena(app, server, { dbPath: ':memory:' });
const admin = arena.store.register('admin_preview', 'preview-password');
const player = arena.store.register('player_preview', 'preview-password');
arena.store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.user.id);
arena.store.topup(player.user.id, 1000, 'wallet-lock-preview-topup');
await new Promise(resolve => server.listen(3304, '127.0.0.1', resolve));
console.log('Wallet lock preview: 127.0.0.1:3304, in-memory demo accounts only.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { arena.close(); process.exit(0); });
