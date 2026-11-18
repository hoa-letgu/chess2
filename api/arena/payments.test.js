import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ArenaStore } from './store.js';
import { saveSettings, settings, walletMode } from './payment-config.js';
import { createPaymentService } from './payments.js';
import { parseProviderJSON, sameSignature } from './payment-providers.js';
import { installArena } from './server.js';
import { dashboard, userStats } from './analytics.js';
import { fakePaymentEnv, fakeGateway, sign } from './test-support/payment-fixtures.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

function setup(e = 'sandbox') {
  const store = new ArenaStore(':memory:'), env = fakePaymentEnv(e), mock = fakeGateway();
  const account = store.register('payment_user', 'password123'), other = store.register('other_user', 'password123');
  const service = createPaymentService(store, { env, fetch: mock.fetch });
  const switchMode = mode => saveSettings(store, account.user.id, { ...settings(store), mode, vndPerCoin: 100 });
  return { store, env, mock, account, other, service, switchMode };
}
for (const method of ['momo', 'zalopay', 'shopeepay', 'bank', 'paypal', 'card']) test(`${method}: creates signed checkout/QR, verifies provider result and credits once`, async () => {
  const f = setup(method === 'bank' ? 'live' : 'sandbox');
  try {
    f.switchMode('paid'); const input = { requestId: randomUUID(), method, amountVnd: 50000, coins: 999999, status: 'paid' };
    let row = await f.service.create(f.account.user.id, input);
    assert.equal(row.status, 'pending'); assert.equal(row.coins, 500);
    const publicOrder = await f.service.publicOrder(row); assert.match(publicOrder.qrImage, /^data:image\/png;base64,/);
    assert.equal((await f.service.create(f.account.user.id, input)).id, row.id);
    assert.equal(f.store.publicUser(f.account.user.id).balance, 0);
    if (method === 'paypal') row = await f.service.check(row.id, true);
    else { f.mock.setPaid(true); row = await f.service.check(row.id); }
    assert.equal(row.status, 'paid'); assert.equal(f.store.publicUser(f.account.user.id).balance, 500);
    await f.service.check(row.id); assert.equal(f.store.ledger(f.account.user.id).length, 1);
    assert.equal(f.store.ledger(f.account.user.id)[0].kind, method === 'bank' ? 'paid_topup' : 'sandbox_topup');
    if (method === 'card') assert.deepEqual([...f.mock.rows.values()][0].embed.preferred_payment_method, ['international_card']);
    const d = dashboard(f.store, { from: Date.now() - 1000000, to: Date.now() + 1000 });
    assert.equal(d.summary.revenue_vnd, method === 'bank' ? 50000 : 0); assert.equal(d.summary.topup, 500); assert.ok(userStats(f.store, d.range).every(u => u.discrepancy === 0));
  } finally { f.store.close(); }
});
test('demo, sandbox and live balances stay isolated; pending order uses original rate and wallet after switch', async () => {
  const f = setup(); try {
    f.store.topup(f.account.user.id, 1000, randomUUID()); f.switchMode('paid'); assert.equal(walletMode(f.store), 'sandbox');
    const row = await f.service.create(f.account.user.id, { requestId: randomUUID(), method: 'momo', amountVnd: 50000 });
    assert.throws(() => f.store.topup(f.account.user.id, 1000, randomUUID()), /giả lập/);
    f.switchMode('demo'); f.mock.setPaid(true); await f.service.check(row.id);
    const user = f.store.publicUser(f.account.user.id); assert.equal(user.balance, 1000); assert.equal(user.sandbox_balance, 500); assert.equal(user.paid_balance, 0);
    f.switchMode('paid'); assert.equal(f.store.publicUser(user.id).balance, 500);
    saveSettings(f.store, f.account.user.id, { ...settings(f.store), environment: 'live' }); assert.equal(f.store.publicUser(user.id).balance, 0);
  } finally { f.store.close(); }
});
test('mode switch rejects active rooms, stale settings and missing rate; cancelling unblocks it', () => {
  const f = setup(); try {
    assert.throws(() => saveSettings(f.store, f.account.user.id, { ...settings(f.store), mode: 'paid', vndPerCoin: null }), /tỷ lệ/);
    const room = f.store.create(f.account.user.id, { name: 'Active', game: 'chess', stake: 0 });
    assert.throws(() => f.switchMode('paid'), /bàn đang mở/); f.store.cancel(f.account.user.id, room.id); f.switchMode('paid');
    assert.throws(() => saveSettings(f.store, f.account.user.id, { mode: 'demo', enabled: [], vndPerCoin: 100, version: 0 }), /vừa thay đổi/);
  } finally { f.store.close(); }
});
test('wrong amount and reused payment receipt require review without crediting another order', async () => {
  const f = setup(); try {
    f.switchMode('paid'); const make = () => f.service.create(f.account.user.id, { requestId: randomUUID(), method: 'momo', amountVnd: 10000 });
    const a = await make(); f.mock.setPaid(true); f.mock.setWrongAmount(true); await f.service.check(a.id);
    assert.equal(f.service.order(a.id).review_required, 1); assert.equal(f.store.publicUser(f.account.user.id).balance, 0);
    f.mock.setWrongAmount(false); await f.service.check(a.id); const b = await make();
    f.service.settle(b.id, { paid: true, amount: 10000, currency: 'VND', transactionId: f.service.order(a.id).transaction_id });
    assert.equal(f.service.order(b.id).review_required, 1); assert.equal(f.store.publicUser(f.account.user.id).balance, 100);
  } finally { f.store.close(); }
});
test('signed webhook is only a hint: re-query provider; duplicate, forged and late notifications are safe', async () => {
  const f = setup(); try {
    f.switchMode('paid'); const row = await f.service.create(f.account.user.id, { requestId: randomUUID(), method: 'momo', amountVnd: 10000 });
    const data = { amount: 10000, extraData: '', message: 'OK', orderId: row.provider_ref, orderInfo: 'Nap xu', orderType: 'momo_wallet', partnerCode: 'test_partner', payType: 'qr', requestId: row.id, responseTime: Date.now(), resultCode: 0, transId: '9007199254740993001' };
    const signed = () => ({ ...data, signature: sign('test_momo_secret', `accessKey=test_access&${Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('&')}`) });
    await assert.rejects(f.service.webhook('momo', JSON.stringify({ ...signed(), signature: 'fake' }), {}));
    await f.service.webhook('momo', JSON.stringify(signed()), {}); assert.equal(f.store.publicUser(f.account.user.id).balance, 0);
    f.store.db.prepare('UPDATE payment_orders SET expires=? WHERE id=?').run(Date.now() - 1000, row.id); f.switchMode('demo'); f.mock.setPaid(true);
    await f.service.webhook('momo', JSON.stringify(signed()), {}); await f.service.webhook('momo', JSON.stringify(signed()), {});
    assert.equal(f.store.publicUser(f.account.user.id).sandbox_balance, 100); assert.equal(f.store.publicUser(f.account.user.id).balance, 0);
    assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM payment_receipts').get().n, 1);
  } finally { f.store.close(); }
});
test('uncertain create keeps one order; browser cannot choose payout, unconfigured method cannot create orders', async () => {
  const f = setup(); try {
    f.switchMode('paid'); f.mock.setFailCreate(true);
    const input = { requestId: randomUUID(), method: 'momo', amountVnd: 10000 };
    const row = await f.service.create(f.account.user.id, input); assert.equal(row.status, 'unknown');
    await f.service.create(f.account.user.id, input); assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM payment_orders').get().n, 1);
    await assert.rejects(f.service.create(f.account.user.id, { ...input, amountVnd: 20000 }), /gói nạp khác/);
    await assert.rejects(f.service.create(f.account.user.id, { ...input, requestId: randomUUID(), method: 'bank' }), /chưa sẵn sàng/);
    const config = JSON.stringify(f.service.config()); assert.ok(!config.includes('test_momo_secret')); assert.ok(!config.includes('test_zalo'));
    assert.equal(parseProviderJSON('{"transId":9007199254740993001}').transId, '9007199254740993001'); assert.equal(sameSignature('éé', 'ab'), false);
  } finally { f.store.close(); }
});
test('HTTP payment settings are admin-only, paid mode disables demo API and users only read own orders', async t => {
  const app = express(), server = createServer(app), mock = fakeGateway();
  const arena = installArena(app, server, { dbPath: ':memory:', paymentEnv: fakePaymentEnv(), paymentFetch: mock.fetch });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => arena.close());
  const base = `http://127.0.0.1:${server.address().port}/api/arena`;
  async function req(path, cookie = '', body) { const r = await fetch(base + path, { headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-Arena-Request': '1' }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) }); return { status: r.status, body: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] }; }
  assert.equal((await req('/payments/config')).status, 200);
  const admin = await req('/auth/register', '', { username: 'payment_admin', password: 'password123' });
  const user = await req('/auth/register', '', { username: 'payment_user', password: 'password123' });
  assert.equal((await req('/admin/payments/settings', user.cookie)).status, 403); assert.equal((await req('/admin/payments/credentials', user.cookie)).status, 403); assert.equal((await req('/admin/payments/credentials', user.cookie, { gateway: 'momo', environment: 'sandbox', values: {}, clear: [] })).status, 403); assert.equal((await req('/payments/orders')).status, 401);
  arena.store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.body.user.id);
  const config = (await req('/admin/payments/settings', admin.cookie)).body;
  assert.equal((await req('/admin/payments/settings', admin.cookie, { ...config, mode: 'paid', vndPerCoin: 100 })).status, 200);
  assert.equal((await req('/wallet/demo-topup', user.cookie, { amount: 1000, requestId: randomUUID() })).status, 400);
  const created = await req('/payments/orders', user.cookie, { requestId: randomUUID(), method: 'momo', amountVnd: 10000, coins: 900000 });
  assert.equal(created.status, 200); assert.equal(created.body.order.coins, 100);
  assert.equal((await req('/payments/orders/' + created.body.order.id, admin.cookie)).status, 403);
  mock.setPaid(true); assert.equal((await req('/payments/orders/' + created.body.order.id + '/check', user.cookie, {})).body.order.status, 'paid');
  assert.equal((await req('/me', user.cookie)).body.user.balance, 100);
  assert.equal((await req('/admin/payments/orders', admin.cookie)).body.items.length, 1);
  assert.equal((await req('/admin/dashboard', admin.cookie)).body.summary.revenue_vnd, 0);
});

for (const method of ['zalopay', 'shopeepay', 'bank', 'paypal']) test(`${method}: webhook authentication and provider re-query reject forgery and duplicate credits`, async () => {
  const f = setup(method === 'bank' ? 'live' : 'sandbox'); try {
    f.switchMode('paid'); const row = await f.service.create(f.account.user.id, { method, requestId: randomUUID(), amountVnd: 10000 });
    let body, headers = {}, gateway = row.gateway;
    if (method === 'zalopay') { const data = JSON.stringify({ app_id: 1234, app_trans_id: row.provider_ref, amount: 10000, zp_trans_id: 'test_transaction' }); body = { data, mac: sign('test_zalo_2', data), type: 1 }; }
    if (method === 'shopeepay') { body = { reference_id: row.provider_ref, transaction_type: 13, transaction_status: 3, merchant_ext_id: 'test_merchant', store_ext_id: 'test_store', amount: 1000000 }; headers = { 'x-airpay-req-h': sign('test_shopee_secret', JSON.stringify(body), 'base64') }; }
    if (method === 'bank') { const data = { amount: 10000, orderCode: Number(row.provider_ref) }; body = { code: '00', success: true, data, signature: sign('test_checksum', `amount=10000&orderCode=${row.provider_ref}`) }; }
    if (method === 'paypal') { body = { id: 'test-event', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { supplementary_data: { related_ids: { order_id: row.provider_ref } } } }; headers = { 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/cert/test', 'paypal-transmission-id': 'test-transmission', 'paypal-transmission-sig': 'test_valid_signature', 'paypal-transmission-time': new Date().toISOString() }; }
    await assert.rejects(f.service.webhook(gateway, JSON.stringify({ ...body, mac: 'fake', signature: 'fake' }), { ...headers, 'x-airpay-req-h': 'fake', 'paypal-transmission-sig': 'fake' }));
    await f.service.webhook(gateway, JSON.stringify(body), headers); assert.equal(f.store.publicUser(f.account.user.id).balance, 0);
    f.mock.setPaid(true); await f.service.webhook(gateway, JSON.stringify(body), headers); await f.service.webhook(gateway, JSON.stringify(body), headers);
    assert.equal(f.store.publicUser(f.account.user.id).balance, 100); assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM payment_receipts').get().n, 1);
  } finally { f.store.close(); }
});
test('payment mode, receipts and live wallet persist in SQLite across restart; reversal is flagged', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'arena-payment-persistence-')), file = join(directory, 'wallet.sqlite');
  let s;
  try {
    s = new ArenaStore(file); const user = s.register('persist_payment', 'password123');
    const env = fakePaymentEnv('live'), mock = fakeGateway(); let service = createPaymentService(s, { env, fetch: mock.fetch });
    service.saveCredentials(user.user.id, { gateway: 'momo', environment: 'sandbox', values: { SECRET_KEY: 'persist_encrypted_secret' }, clear: [] });
    assert.ok(!JSON.stringify(s.db.prepare('SELECT * FROM payment_credentials').all()).includes('persist_encrypted_secret'));
    saveSettings(s, user.user.id, { ...settings(s), mode: 'paid', vndPerCoin: 100 });
    const row = await service.create(user.user.id, { method: 'bank', requestId: randomUUID(), amountVnd: 10000 }); mock.setPaid(true); await service.check(row.id); s.close();
    s = new ArenaStore(file); service = createPaymentService(s, { env, fetch: mock.fetch });
    assert.equal(service.credentials().find(e => e.gateway === 'momo' && e.environment === 'sandbox').fields.find(f => f.key === 'SECRET_KEY').configured, true);
    assert.equal(s.publicUser(user.user.id).paid_balance, 100); assert.equal(settings(s).mode, 'paid');
    await service.check(row.id); assert.equal(s.ledger(user.user.id).length, 1);
    service.settle(row.id, { reversed: true }); assert.equal(service.order(row.id).review_required, 1); assert.equal(s.publicUser(user.user.id).paid_balance, 100);
    assert.equal(dashboard(s, { from: Date.now() - 86400000, to: Date.now() + 1000 }).paymentReviews, 1);
  } finally { s?.close(); if (!resolve(directory).startsWith(resolve(tmpdir()) + sep + 'arena-payment-persistence-')) throw Error('Unexpected cleanup path'); rmSync(directory, { recursive: true, force: true }); }
});

test('admin-entered credentials are encrypted, masked, retain blanks, can be cleared and reject tampering', () => {
  const s = new ArenaStore(':memory:'); try {
    const account = s.register('config_admin', 'password123');
    const service = createPaymentService(s, { env: { PAYMENT_ENV: 'sandbox', PAYMENT_PUBLIC_URL: 'https://arena.invalid' } });
    assert.equal(settings(s).vndPerCoin, 1);
    service.saveCredentials(account.user.id, { gateway: 'momo', environment: 'sandbox', values: { PARTNER_CODE: 'test_partner', ACCESS_KEY: 'test_access', SECRET_KEY: 'test_momo_secret' }, clear: [] });
    assert.equal(service.config().methods.find(m => m.id === 'momo').ready, true);
    assert.ok(!JSON.stringify(service.credentials()).includes('test_momo_secret')); assert.ok(!JSON.stringify(service.config(true)).includes('test_access'));
    assert.ok(!JSON.stringify(s.db.prepare('SELECT * FROM admin_audit').all()).includes('test_momo_secret'));
    service.saveCredentials(account.user.id, { gateway: 'momo', environment: 'sandbox', values: { SECRET_KEY: '' }, clear: [] });
    assert.equal(service.config().methods.find(m => m.id === 'momo').ready, true);
    service.saveCredentials(account.user.id, { gateway: 'momo', environment: 'sandbox', values: {}, clear: ['SECRET_KEY'] });
    assert.equal(service.config().methods.find(m => m.id === 'momo').ready, false);
    assert.throws(() => service.saveCredentials(account.user.id, { gateway: 'arbitrary', environment: 'sandbox', values: {}, clear: [] }));
    s.db.prepare("UPDATE payment_credentials SET ciphertext='00'").run(); assert.throws(() => service.config(), /giải mã/);
  } finally { s.close(); }
});
test('one configured ZaloPay merchant can serve wallet, VietQR bank and card; 1 VND gives 1 coin', async () => {
  const f = setup(); try {
    saveSettings(f.store, f.account.user.id, { ...settings(f.store), mode: 'paid', vndPerCoin: 1, bankGateway: 'zalopay' });
    assert.equal(f.service.config().methods.find(m => m.id === 'bank').available, true);
    const row = await f.service.create(f.account.user.id, { method: 'bank', requestId: randomUUID(), amountVnd: 10000 });
    assert.equal(row.gateway, 'zalopay'); assert.equal(row.coins, 10000);
    assert.deepEqual([...f.mock.rows.values()][0].embed.preferred_payment_method, ['vietqr']);
    f.mock.setPaid(true); await f.service.check(row.id); assert.equal(f.store.publicUser(f.account.user.id).balance, 10000);
  } finally { f.store.close(); }
});
