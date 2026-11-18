import express from 'express';
import QRCode from 'qrcode';
import { randomUUID, randomInt } from 'node:crypto';
import { PAYMENT_METHODS, settings, saveSettings, environment, walletMode } from './payment-config.js';
import { paymentDriver, providerConfig } from './payment-providers.js';
import { paymentEnv, credentialMetadata, saveCredentials } from './payment-credentials.js';
import { reportRange } from './analytics.js';
import { topupEvent, topupQuote } from './topup-events.js';

const validKey = value => typeof value === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(value);
export function createPaymentService(store, options = {}) {
  const env = options.env ?? process.env, inflight = new Map(), qrCache = new Map();
  let reconciling = false, closed = false;
  store.paymentEnvironment = env.PAYMENT_ENV ?? 'sandbox';
  const driver = (gateway, mode) => paymentDriver(gateway, mode, { ...options, env: paymentEnv(store, env) });
  const order = id => { const row = store.db.prepare('SELECT * FROM payment_orders WHERE id=?').get(id); if (!row) throw Error('Không tìm thấy đơn nạp.'); return row; };
  function config(admin = false) {
    const s = settings(store), e = environment(store), resolvedEnv = paymentEnv(store, env);
    return { ...s, topupEvent: topupEvent(store), environment: e, walletMode: walletMode(store), methods: Object.entries(PAYMENT_METHODS).map(([id, method]) => {
      const gateway = id === 'bank' ? s.bankGateway ?? 'payos' : method.gateway;
      const c = providerConfig(gateway, e, resolvedEnv);
      return { id, gateway, name: method.name, description: id === 'bank' && gateway === 'zalopay' ? 'VietQR qua ZaloPay · ngân hàng và ví' : method.description, enabled: s.enabled.includes(id), ready: c.ready, available: s.mode === 'paid' && s.enabled.includes(id) && c.ready && !!s.vndPerCoin, ...(admin ? { missing: c.missing } : {}), ...(id === 'paypal' && c.ready ? { vndPerUsd: Number(c.VND_PER_USD) } : {}) };
    }) };
  }
  async function publicOrder(row) {
    const expired = row.expires < Date.now() && ['pending', 'creating', 'unknown'].includes(row.status);
    let qrImage = null;
    if (!expired && row.qr_data && row.qr_data.length <= 6000 && row.status !== 'paid') {
      try { qrImage = qrCache.get(row.id) ?? await QRCode.toDataURL(row.qr_data, { width: 320, margin: 2, errorCorrectionLevel: 'M' }); qrCache.set(row.id, qrImage); if (qrCache.size > 500) qrCache.delete(qrCache.keys().next().value); } catch { /* Hosted checkout remains usable if a provider URL exceeds QR capacity. */ }
    }
    return { id: row.id, method: row.method, environment: row.environment, walletMode: row.wallet_mode, amountVnd: row.amount_vnd, faceAmountVnd: row.base_amount_vnd || row.amount_vnd, baseCoins: row.base_coins || row.coins, bonusCoins: row.bonus_coins || 0, promotion: row.promotion ? JSON.parse(row.promotion) : null, coins: row.coins, currency: row.currency, chargedMinor: row.charged_minor, status: expired ? 'expired' : row.status, checkoutUrl: expired || row.status === 'paid' ? null : row.checkout_url, qrImage, created: row.created, expires: row.expires, paidAt: row.paid_at, manuallyCredited: !!store.db.prepare('SELECT id FROM wallet_adjustments WHERE payment_order_id=?').get(row.id), reviewRequired: !!row.review_required, error: row.error };
  }
  function event(row, kind, detail) { store.db.prepare('INSERT INTO payment_events VALUES(?,?,?,?,?)').run(randomUUID(), row?.id ?? null, kind, detail.slice(0, 500), Date.now()); }
  function review(row, reason) { store.db.prepare('UPDATE payment_orders SET review_required=1,error=? WHERE id=?').run(reason, row.id); event(row, 'review_required', reason); }
  function settle(id, result) {
    if (closed) throw Error('Máy chủ đang dừng.');
    return store.transaction(() => {
      const row = order(id);
      if (result.reversed) { review(row, 'Nhà cung cấp báo hoàn/đảo giao dịch. Cần đối soát thủ công; chưa tự thay đổi xu.'); return order(id); }
      if (!result.paid) return row;
      if (!Number.isSafeInteger(result.amount) || result.amount !== row.charged_minor || result.currency !== row.currency || (result.expectedAmount !== undefined && result.expectedAmount !== row.charged_minor) || (result.captureCount !== undefined && result.captureCount !== 1) || typeof result.transactionId !== 'string' || !result.transactionId || result.transactionId.length > 200) {
        review(row, 'Số tiền, loại tiền hoặc mã xác nhận không khớp đơn gốc. Chưa cộng xu.'); return order(id);
      }
      if (row.status === 'paid') return row;
      const receipt = store.db.prepare('SELECT * FROM payment_receipts WHERE gateway=? AND environment=? AND transaction_id=?').get(row.gateway, row.environment, result.transactionId);
      if (receipt && receipt.order_id !== row.id) { review(row, 'Mã thanh toán đã được dùng cho đơn khác. Chưa cộng xu.'); return order(id); }
      store.db.prepare('INSERT OR IGNORE INTO payment_receipts VALUES(?,?,?,?,?)').run(row.gateway, row.environment, result.transactionId, row.id, Date.now());
      const compensation = store.db.prepare('SELECT * FROM wallet_adjustments WHERE payment_order_id=?').get(row.id);
      if (compensation) {
        // The full order was credited by an admin. Recognize the verified top-up without crediting twice.
        store.db.prepare('UPDATE ledger SET kind=? WHERE user_id=? AND request_key=?').run(row.environment === 'live' ? 'paid_topup' : 'sandbox_topup', row.user_id, `admin-adjustment:${compensation.request_id}`);
      } else store.credit(row.user_id, row.coins, row.environment === 'live' ? 'paid_topup' : 'sandbox_topup', null, `payment:${row.id}`, row.wallet_mode);
      store.db.prepare("UPDATE payment_orders SET status='paid',paid_at=?,transaction_id=?,error=NULL,review_required=0 WHERE id=?").run(Date.now(), result.transactionId, row.id);
      event(row, 'paid', 'Đã xác minh trực tiếp với nhà cung cấp và cộng xu đúng một lần.');
      return order(id);
    });
  }
  async function check(id, capture = false) {
    if (inflight.has(id)) return inflight.get(id);
    const task = (async () => {
      if (closed) throw Error('Máy chủ đang dừng.');
      store.db.prepare('UPDATE payment_orders SET last_checked=? WHERE id=?').run(Date.now(), id);
      const row = order(id), d = driver(row.gateway, row.environment);
      if (capture && row.status !== 'paid') {
        // A prior capture may already have succeeded despite a network timeout.
        const before = await d.check(row);
        if (before.paid || before.reversed) return settle(id, before);
        await d.capture(row);
      }
      const next = settle(id, await d.check(row)); options.notify?.(); return next;
    })();
    inflight.set(id, task); try { return await task; } finally { inflight.delete(id); }
  }
  async function create(userId, input) {
    if (!validKey(input?.requestId) || !Object.hasOwn(PAYMENT_METHODS, input?.method ?? '') || !Number.isSafeInteger(input.amountVnd) || input.amountVnd < 10000 || input.amountVnd > 1000000 || input.amountVnd % 1000 !== 0) throw Error('Chọn số tiền 10.000–1.000.000 VNĐ, là bội số 1.000.');
    const old = store.db.prepare('SELECT * FROM payment_orders WHERE user_id=? AND request_key=?').get(userId, input.requestId);
    if (old) { if (old.method !== input.method || (old.base_amount_vnd || old.amount_vnd) !== input.amountVnd) throw Error('Mã yêu cầu đã dùng cho gói nạp khác.'); return old; }
    const s = config(), method = s.methods.find(m => m.id === input.method);
    if (s.mode !== 'paid' || !method?.available) throw Error('Kênh nạp này chưa được bật hoặc chưa sẵn sàng.');
    if (input.amountVnd % s.vndPerCoin !== 0) throw Error('Số tiền cần chia hết cho tỷ lệ VNĐ/xu đã cấu hình.');
    const quote = topupQuote(store, input.amountVnd, input.method, s.vndPerCoin);
    if (input.quoteKey !== undefined && input.quoteKey !== quote.key) throw Error('Ưu đãi hoặc tỷ lệ đã thay đổi. Hãy kiểm tra lại gói nạp trước khi tạo đơn.');
    const pending = store.db.prepare("SELECT COUNT(*) n FROM payment_orders WHERE user_id=? AND status IN ('creating','pending','unknown') AND expires>?").get(userId, Date.now()).n;
    if (pending >= 3) throw Error('Bạn đã có 3 đơn đang chờ. Hãy kiểm tra các đơn trước khi tạo thêm.');
    const id = randomUUID(), gateway = method.gateway;
    const ref = gateway === 'zalopay' ? `${new Date(Date.now() + 7 * 3600000).toISOString().slice(2, 10).replaceAll('-', '')}_${id.replaceAll('-', '').slice(0, 24)}` : gateway === 'payos' ? String(randomInt(100000000, 1000000000000)) : id;
    const coins = quote.coins, currency = gateway === 'paypal' ? 'USD' : 'VND';
    const chargedMinor = currency === 'USD' ? Math.ceil(quote.payAmountVnd * 100 / method.vndPerUsd) : quote.payAmountVnd;
    store.db.prepare(`INSERT INTO payment_orders(id,user_id,request_key,method,gateway,environment,wallet_mode,amount_vnd,coins,currency,charged_minor,provider_ref,status,created,expires,base_amount_vnd,base_coins,bonus_coins,promotion) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'creating',?,?,?,?,?,?)`).run(id, userId, input.requestId, input.method, gateway, s.environment, s.walletMode, quote.payAmountVnd, coins, currency, chargedMinor, ref, Date.now(), Date.now() + 1200000, quote.faceAmountVnd, quote.baseCoins, quote.bonusCoins, quote.promotion ? JSON.stringify(quote.promotion) : null);
    const row = order(id);
    try {
      const created = await driver(gateway, row.environment).create(row, input.platform === 'mweb' ? 'mweb' : 'pc');
      if (!created.checkoutUrl && !created.qrData) throw Error('Cổng chưa trả về mã thanh toán.');
      store.db.prepare("UPDATE payment_orders SET provider_ref=?,checkout_url=?,qr_data=?,status=CASE WHEN status='paid' THEN status ELSE 'pending' END WHERE id=?").run(created.providerRef, created.checkoutUrl, created.qrData ?? created.checkoutUrl, id);
    } catch {
      store.db.prepare("UPDATE payment_orders SET status=CASE WHEN status='paid' THEN status ELSE 'unknown' END,error=? WHERE id=?").run('Chưa nhận được phản hồi chắc chắn từ cổng. Kiểm tra đơn trước khi tạo đơn mới.', id);
      event(row, 'create_unknown', 'Không có phản hồi tạo đơn chắc chắn; giữ nguyên mã để đối soát.');
    }
    return order(id);
  }
  async function webhook(gateway, raw, headers) {
    if (!Object.values(PAYMENT_METHODS).some(m => m.gateway === gateway)) throw Error('Cổng không hợp lệ.');
    // Resolve environment by a verified signature, never a caller-controlled flag.
    let verified;
    for (const e of ['live', 'sandbox']) {
      if (!providerConfig(gateway, e, paymentEnv(store, env)).ready) continue;
      try { const info = await driver(gateway, e).webhook(raw, headers); verified = { ...info, environment: e }; break; } catch { /* Try the other configured environment. */ }
    }
    if (!verified || typeof verified.ref !== 'string' || !verified.ref) throw Error('Không thể xác minh thông báo thanh toán.');
    const row = store.db.prepare('SELECT * FROM payment_orders WHERE gateway=? AND environment=? AND (provider_ref=? OR id=?)').get(gateway, verified.environment, verified.ref, verified.ref);
    if (!row) return { ignored: true }; // Includes payOS's signed onboarding probe.
    if (verified.review) review(row, 'Nhận thông báo hoàn/đảo/khiếu nại. Cần đối soát thủ công.');
    await check(row.id); return { ok: true };
  }
  async function reconcile() {
    if (closed || reconciling) return;
    reconciling = true;
    try {
      const rows = store.db.prepare("SELECT id FROM payment_orders WHERE status IN ('creating','pending','unknown') AND created>? AND created<? AND last_checked<? ORDER BY last_checked,created LIMIT 3").all(Date.now()-86400000, Date.now()-30000, Date.now()-60000);
      await Promise.allSettled(rows.map(r => check(r.id)));
    } finally { reconciling = false; }
  }
  return { credentials: () => credentialMetadata(store, env), saveCredentials: (actor, input) => saveCredentials(store, actor, input, env), config, create, order, publicOrder, check, webhook, settle, reconcile, close: () => { closed = true; } };
}

export function installPayments(app, router, store, options = {}) {
  const service = createPaymentService(store, options);
  const wrap = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);
  app.get('/api/arena/payments/config', (req, res) => { res.set('Cache-Control', 'no-store'); try { res.json(service.config()); } catch { res.status(503).json({ error: 'Chưa tải được cấu hình thanh toán. Vui lòng thử lại sau.' }); } });
  app.post('/api/arena/payments/webhook/:gateway', express.raw({ type: 'application/json', limit: '64kb' }), async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'Invalid content type' });
      await service.webhook(req.params.gateway, req.body.toString('utf8'), req.headers);
      if (req.params.gateway === 'zalopay') return res.json({ return_code: 1, return_message: 'success' });
      if (req.params.gateway === 'shopeepay') return res.json({ errcode: 0 });
      res.status(req.params.gateway === 'momo' ? 204 : 200).end();
    } catch { res.status(400).json({ error: 'Không thể xác minh hoặc đối soát thông báo thanh toán.' }); }
  });
  const owner = (req, res) => { const row = service.order(req.params.id); if (row.user_id !== req.arenaUser.id) { res.status(403).json({ error: 'Đơn này không thuộc tài khoản của bạn.' }); return null; } return row; };
  router.get('/payments/quote', wrap((req, res) => {
    const s = settings(store); if (s.mode !== 'paid') throw Error('Ưu đãi áp dụng cho chế độ nạp thanh toán.');
    res.json(topupQuote(store, Number(req.query.amountVnd), req.query.method, s.vndPerCoin));
  }));
  router.get('/payments/orders', wrap(async (req, res) => { const rows = store.db.prepare('SELECT * FROM payment_orders WHERE user_id=? ORDER BY created DESC,rowid DESC LIMIT 20').all(req.arenaUser.id); res.json({ orders: await Promise.all(rows.map(service.publicOrder)) }); }));
  router.post('/payments/orders', wrap(async (req, res) => { const row = await service.create(req.arenaUser.id, req.body ?? {}); res.json({ order: await service.publicOrder(row) }); }));
  router.get('/payments/orders/:id', wrap(async (req, res) => { const row = owner(req, res); if (row) res.json({ order: await service.publicOrder(row) }); }));
  const lastCheck = new Map();
  for (const action of ['check', 'capture']) router.post(`/payments/orders/:id/${action}`, wrap(async (req, res) => {
    const row = owner(req, res); if (!row) return;
    if (action === 'capture' && row.gateway !== 'paypal') throw Error('Kênh này không có bước capture.');
    const now = Date.now(); if (now - (lastCheck.get(row.id) ?? 0) < 5000) return res.status(429).json({ error: 'Chờ 5 giây trước khi kiểm tra tiếp.' });
    lastCheck.set(row.id, now); if (lastCheck.size > 10000) for (const [key, time] of lastCheck) if (now - time > 60000) lastCheck.delete(key);
    const next = await service.check(row.id, action === 'capture'); res.json({ order: await service.publicOrder(next), user: store.publicUser(req.arenaUser.id) });
  }));
  router.get('/admin/payments/credentials', (req, res) => res.json({ credentials: service.credentials() }));
  router.post('/admin/payments/credentials', wrap((req, res) => { service.saveCredentials(req.arenaUser.id, req.body); options.notify?.(); res.json({ credentials: service.credentials(), config: service.config(true) }); }));
  router.get('/admin/payments/settings', (req, res) => res.json(service.config(true)));
  router.post('/admin/payments/settings', wrap((req, res) => { saveSettings(store, req.arenaUser.id, req.body); options.notify?.(); res.json(service.config(true)); }));
  router.get('/admin/payments/orders', wrap(async (req, res) => {
    const range = reportRange(req.query), page = Number(req.query.page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw Error('Trang không hợp lệ.');
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 64) : '';
    const where = 'o.created>=? AND o.created<? AND instr(lower(u.username),lower(?))>0';
    const rows = store.db.prepare(`SELECT o.*,u.username FROM payment_orders o JOIN users u ON u.id=o.user_id WHERE ${where} ORDER BY o.created DESC,o.rowid DESC LIMIT 20 OFFSET ?`).all(range.from, range.to, q, (page - 1) * 20);
    const total = store.db.prepare(`SELECT COUNT(*) n FROM payment_orders o JOIN users u ON u.id=o.user_id WHERE ${where}`).get(range.from, range.to, q).n;
    res.json({ items: await Promise.all(rows.map(async row => ({ ...await service.publicOrder(row), username: row.username, userId: row.user_id }))), total, page, limit: 20 });
  }));
  return service;
}
