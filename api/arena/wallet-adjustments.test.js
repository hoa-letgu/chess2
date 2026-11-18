import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ArenaStore } from './store.js';
import { adjustWallet, adjustmentHistory } from './wallet-adjustments.js';
import { changeWalletLock } from './wallet-lock.js';
import { dashboard, userStats } from './analytics.js';
import { saveSettings, settings } from './payment-config.js';
import { createPaymentService } from './payments.js';
import { fakeGateway, fakePaymentEnv } from './test-support/payment-fixtures.mjs';
import { installArena } from './server.js';

function setup(s) {
  const [admin, a, b] = ['adjust_admin', 'adjust_player', 'adjust_other'].map(name => s.register(name, 'password123').user);
  s.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.id);
  s.topup(a.id, 1000, 'adjust-test-initial-topup');
  const input = (amount, extra = {}) => ({ amount, expectedBalance: s.publicUser(a.id).balance, walletMode: s.publicUser(a.id).wallet_mode, reason: 'Điều chỉnh sau đối soát', reference: 'SUPPORT-123', paymentOrderId: '', requestId: randomUUID(), ...extra });
  return { admin, a, b, input };
}
test('admin credit/debit is atomic, audited, idempotent and separate from topups, game profits and revenue', () => {
  const s = new ArenaStore(':memory:'); try {
    const { admin, a, input } = setup(s), data = input(250);
    const first = adjustWallet(s, admin.id, a.id, data); assert.equal(first.balance_before, 1000); assert.equal(first.balance_after, 1250);
    assert.equal(adjustWallet(s, admin.id, a.id, data).id, first.id); assert.equal(s.publicUser(a.id).balance, 1250);
    assert.throws(() => adjustWallet(s, admin.id, a.id, { ...data, amount: 300 }), /nội dung khác/);
    adjustWallet(s, admin.id, a.id, input(-100)); assert.equal(s.publicUser(a.id).balance, 1150);
    assert.equal(adjustmentHistory(s, a.id).length, 2); assert.equal(adjustmentHistory(s, a.id)[0].actor_name, 'adjust_admin');
    const range = { from: Date.now() - 86400000, to: Date.now() + 86400000 }, stats = userStats(s, range).find(u => u.id === a.id);
    assert.equal(stats.topup, 1000); assert.equal(stats.profit, 0); assert.equal(stats.discrepancy, 0); assert.equal(dashboard(s, range).summary.revenue_vnd, 0);
    assert.equal(s.db.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='wallet_adjustment'").get().n, 2);
  } finally { s.close(); }
});
test('validation blocks ordinary users, stale balances, wrong wallets, invalid amounts and deductions from locked/held funds', () => {
  const s = new ArenaStore(':memory:'); try {
    const { admin, a, b, input } = setup(s);
    assert.throws(() => adjustWallet(s, b.id, a.id, input(1)), /quản trị/);
    for (const amount of [0, 0.5, '1', 10000001, -1001]) assert.throws(() => adjustWallet(s, admin.id, a.id, input(amount)));
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(1, { reason: ' ' })));
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(1, { expectedBalance: 900 })), /Số dư đã thay đổi/);
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(1, { walletMode: 'paid' })), /Chế độ ví/);
    changeWalletLock(s, admin.id, a.id, { amount: 800, walletMode: 'demo', version: 0, reason: 'Khóa một phần' });
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(-201)), /khả dụng/);
    adjustWallet(s, admin.id, a.id, input(-200)); assert.equal(s.publicUser(a.id).available_coins, 0); assert.equal(s.publicUser(a.id).locked_coins, 800);
    assert.equal(adjustmentHistory(s, a.id).length, 1);
    changeWalletLock(s, admin.id, a.id, { amount: 0, walletMode: 'demo', version: 1, reason: 'Mở khóa thử nghiệm' });
    s.topup(b.id, 1000, 'adjust-opponent-topup');
    const waiting = s.create(a.id, { name: 'Hold test', game: 'chess', stake: 300 }), room = s.join(b.id, waiting.id);
    assert.equal(s.publicUser(a.id).balance, 500);
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(-501)), /khả dụng/);
    adjustWallet(s, admin.id, a.id, input(-500));
    s.action(b.id, room.id, { type: 'resign', version: room.version });
    assert.equal(s.publicUser(a.id).balance, 600);
  } finally { s.close(); }
});
test('full-order compensation prevents late verified payment and retries from crediting twice; mismatched orders fail', async () => {
  const s = new ArenaStore(':memory:'), mock = fakeGateway(), service = createPaymentService(s, { env: fakePaymentEnv(), fetch: mock.fetch });
  try {
    const { admin, a, b, input } = setup(s); saveSettings(s, admin.id, { ...settings(s), mode: 'paid', vndPerCoin: 1 });
    const order = await service.create(a.id, { requestId: randomUUID(), method: 'momo', amountVnd: 10000 });
    assert.throws(() => adjustWallet(s, admin.id, b.id, { ...input(order.coins), expectedBalance: 0, paymentOrderId: order.id }), /không thuộc/);
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(5000, { paymentOrderId: order.id })), /toàn bộ/);
    adjustWallet(s, admin.id, a.id, input(order.coins, { paymentOrderId: order.id }));
    assert.equal(s.publicUser(a.id).balance, 10000); assert.equal(service.order(order.id).status, 'pending');
    assert.equal((await service.publicOrder(service.order(order.id))).manuallyCredited, true);
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(order.coins, { paymentOrderId: order.id })), /cộng bù trước/);
    mock.setPaid(true); await service.check(order.id); await service.check(order.id);
    assert.equal(service.order(order.id).status, 'paid'); assert.equal(s.publicUser(a.id).balance, 10000);
    assert.equal(s.ledger(a.id).filter(row => row.kind === 'sandbox_topup').length, 1);
    assert.throws(() => adjustWallet(s, admin.id, a.id, input(order.coins, { paymentOrderId: order.id })), /chưa được cộng/);
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM payment_receipts').get().n, 1);
  } finally { service.close(); s.close(); }
});
test('adjustment and retry receipt persist across SQLite restart', () => {
  const path = join(tmpdir(), `arena-adjustment-${randomUUID()}.sqlite`); let s = new ArenaStore(path);
  try {
    const { admin, a, input } = setup(s), data = input(500); adjustWallet(s, admin.id, a.id, data);
    s.close(); s = new ArenaStore(path); adjustWallet(s, admin.id, a.id, data);
    assert.equal(s.publicUser(a.id).balance, 1500); assert.equal(adjustmentHistory(s, a.id).length, 1);
  } finally { s.close(); for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file); }
});
test('HTTP adjustment endpoint requires admin and same origin, exposes history only to admin and updates owner ledger', async t => {
  const app = express(), server = createServer(app), arena = installArena(app, server, { dbPath: ':memory:' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => arena.close());
  const { admin, a, b, input } = setup(arena.store), base = `http://127.0.0.1:${server.address().port}/api/arena`;
  const req = async (path, user, body, origin) => {
    const token = user ? arena.store.newSession(user.id).token : '';
    const response = await fetch(base + path, { headers: { Cookie: `arena_session=${token}`, 'Content-Type': 'application/json', 'X-Arena-Request': '1', ...(origin ? { Origin: origin } : {}) }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  };
  const path = `/admin/users/${a.id}/wallet-adjustment`, body = input(500);
  assert.equal((await req(path, null, body)).status, 401); assert.equal((await req(path, b, body)).status, 403);
  assert.equal((await req(path, admin, body, 'https://evil.example')).status, 403);
  assert.equal((await req(path, admin, body)).status, 200); assert.equal((await req(path, admin, body)).status, 200);
  const detail = (await req(`/admin/users/${a.id}`, admin)).data;
  assert.equal(detail.user.balance, 1500); assert.equal(detail.adjustmentHistory.length, 1);
  assert.equal((await req('/me', a)).data.ledger[0].kind, 'admin_credit');
});
