import { randomUUID } from 'node:crypto';

export const PAYMENT_METHODS = {
  momo: { name: 'MoMo', gateway: 'momo', description: 'Ví MoMo · QR và trang thanh toán' },
  zalopay: { name: 'ZaloPay', gateway: 'zalopay', description: 'Ví ZaloPay · QR đa năng' },
  shopeepay: { name: 'ShopeePay', gateway: 'shopeepay', description: 'Ví ShopeePay · QR và mở ứng dụng' },
  bank: { name: 'Ngân hàng Việt Nam', gateway: 'payos', description: 'Chuyển khoản VietQR qua payOS' },
  paypal: { name: 'PayPal', gateway: 'paypal', description: 'Thanh toán PayPal bằng USD' },
  card: { name: 'Visa / Mastercard', gateway: 'zalopay', description: 'Thẻ quốc tế qua cổng ZaloPay được cấp phép' },
};
export const BALANCE_COLUMNS = { demo: 'balance', sandbox: 'sandbox_balance', paid: 'paid_balance' };
export function initPaymentSchema(store) {
  const columns = store.db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  for (const name of ['paid_balance', 'sandbox_balance']) if (!columns.includes(name)) store.db.exec(`ALTER TABLE users ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0 CHECK(${name}>=0)`);
  if (!store.db.prepare('PRAGMA table_info(ledger)').all().some(c => c.name === 'wallet_mode')) store.db.exec("ALTER TABLE ledger ADD COLUMN wallet_mode TEXT NOT NULL DEFAULT 'demo'");
  store.db.exec(`CREATE TABLE IF NOT EXISTS payment_credentials(gateway TEXT NOT NULL,environment TEXT NOT NULL,ciphertext TEXT NOT NULL,iv TEXT NOT NULL,tag TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(gateway,environment));
    CREATE TABLE IF NOT EXISTS payment_settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS payment_orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,method TEXT NOT NULL,gateway TEXT NOT NULL,environment TEXT NOT NULL,wallet_mode TEXT NOT NULL,amount_vnd INTEGER NOT NULL,coins INTEGER NOT NULL,currency TEXT NOT NULL,charged_minor INTEGER NOT NULL,provider_ref TEXT UNIQUE,status TEXT NOT NULL,checkout_url TEXT,qr_data TEXT,created INTEGER NOT NULL,expires INTEGER NOT NULL,paid_at INTEGER,transaction_id TEXT,error TEXT,review_required INTEGER NOT NULL DEFAULT 0,last_checked INTEGER NOT NULL DEFAULT 0,UNIQUE(user_id,request_key));
    CREATE INDEX IF NOT EXISTS payment_user ON payment_orders(user_id,created);
    CREATE INDEX IF NOT EXISTS payment_status ON payment_orders(status,created);
    CREATE TABLE IF NOT EXISTS payment_receipts(gateway TEXT NOT NULL,environment TEXT NOT NULL,transaction_id TEXT NOT NULL,order_id TEXT NOT NULL REFERENCES payment_orders(id),created INTEGER NOT NULL,PRIMARY KEY(gateway,environment,transaction_id));
    CREATE TABLE IF NOT EXISTS payment_events(id TEXT PRIMARY KEY,order_id TEXT REFERENCES payment_orders(id),kind TEXT NOT NULL,detail TEXT NOT NULL,created INTEGER NOT NULL);`);
  if (!store.db.prepare('PRAGMA table_info(payment_orders)').all().some(c => c.name === 'review_required')) store.db.exec('ALTER TABLE payment_orders ADD COLUMN review_required INTEGER NOT NULL DEFAULT 0');
  if (!store.db.prepare('PRAGMA table_info(payment_orders)').all().some(c => c.name === 'last_checked')) store.db.exec('ALTER TABLE payment_orders ADD COLUMN last_checked INTEGER NOT NULL DEFAULT 0');
  store.db.prepare('INSERT OR IGNORE INTO payment_settings VALUES(1,?,0)').run(JSON.stringify({ mode: 'demo', environment: null, publicUrl: null, bankGateway: 'payos', vndPerCoin: 1, enabled: Object.keys(PAYMENT_METHODS) }));
}
export function settings(store) { const row = store.db.prepare('SELECT * FROM payment_settings WHERE id=1').get(); return { ...JSON.parse(row.data), version: row.version }; }
export function environment(store) { const value = settings(store).environment ?? store.paymentEnvironment ?? process.env.PAYMENT_ENV ?? 'sandbox'; if (!['sandbox', 'live'].includes(value)) throw Error('PAYMENT_ENV cần là sandbox hoặc live.'); return value; }
export function walletMode(store) { return settings(store).mode === 'demo' ? 'demo' : environment(store) === 'live' ? 'paid' : 'sandbox'; }
export function saveSettings(store, actor, input) {
  if (!['demo', 'paid'].includes(input?.mode) || !Array.isArray(input.enabled) || input.enabled.some(id => !Object.hasOwn(PAYMENT_METHODS, id))) throw Error('Cấu hình thanh toán không hợp lệ.');
  if (input.vndPerCoin !== null && (!Number.isSafeInteger(input.vndPerCoin) || input.vndPerCoin < 1 || input.vndPerCoin > 10000)) throw Error('Tỷ lệ cần là số nguyên 1–10.000 VNĐ/xu.');
  if (input.mode === 'paid' && !input.vndPerCoin) throw Error('Cần lưu tỷ lệ VNĐ/xu trước khi bật nạp tiền.');
  return store.transaction(() => {
    const old = settings(store);
    if (input.version !== old.version) throw Error('Cấu hình vừa thay đổi. Hãy tải lại.');
    const nextEnvironment = input.environment ?? old.environment ?? environment(store);
    if (!['sandbox','live'].includes(nextEnvironment)) throw Error('Môi trường cổng không hợp lệ.');
    let publicUrl = input.publicUrl === undefined ? old.publicUrl ?? null : input.publicUrl || null;
    if (publicUrl) { try { const u = new URL(publicUrl); if (u.username || u.password || u.hash || u.search || u.pathname !== '/' || (u.protocol !== 'https:' && !(nextEnvironment === 'sandbox' && u.protocol === 'http:' && ['localhost','127.0.0.1'].includes(u.hostname)))) throw Error(); publicUrl = u.origin; } catch { throw Error('Địa chỉ website cần là tên miền HTTPS, không kèm đường dẫn.'); } }
    if ((old.mode !== input.mode || (old.mode === 'paid' && environment(store) !== nextEnvironment)) && store.allMatches().some(m => ['waiting', 'playing'].includes(m.status))) throw Error('Hãy kết thúc hoặc hủy các bàn đang mở trước khi chuyển chế độ ví.');
    const bankGateway = input.bankGateway ?? old.bankGateway ?? 'payos';
    if (!['payos','zalopay'].includes(bankGateway)) throw Error('Kênh ngân hàng không hợp lệ.');
    const next = { bankGateway, mode: input.mode, environment: nextEnvironment, publicUrl, vndPerCoin: input.vndPerCoin, enabled: [...new Set(input.enabled)] };
    store.db.prepare('UPDATE payment_settings SET data=?,version=version+1 WHERE id=1').run(JSON.stringify(next));
    store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), actor, 'payment_settings', 'global', JSON.stringify({ before: old, after: next }), Date.now());
    return settings(store);
  });
}
