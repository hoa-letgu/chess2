import { createHash, randomUUID } from 'node:crypto';
import { PAYMENT_METHODS } from './payment-config.js';

export function initTopupEvents(store) {
  store.db.exec('CREATE TABLE IF NOT EXISTS topup_event_settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
  store.db.prepare('INSERT OR IGNORE INTO topup_event_settings VALUES(1,?,0)').run(JSON.stringify({ enabled: false, title: 'Ưu đãi nạp xu', type: 'bonus', percent: 50, starts: 0, ends: 0, minAmount: 10000, maxAmount: 1000000, methods: Object.keys(PAYMENT_METHODS) }));
  const columns = store.db.prepare('PRAGMA table_info(payment_orders)').all().map(row => row.name);
  for (const [name, definition] of [['base_amount_vnd','INTEGER NOT NULL DEFAULT 0'],['base_coins','INTEGER NOT NULL DEFAULT 0'],['bonus_coins','INTEGER NOT NULL DEFAULT 0'],['promotion','TEXT']]) if (!columns.includes(name)) store.db.exec(`ALTER TABLE payment_orders ADD COLUMN ${name} ${definition}`);
}
export function topupEvent(store, now = Date.now()) {
  const row = store.db.prepare('SELECT * FROM topup_event_settings WHERE id=1').get(), event = JSON.parse(row.data);
  return { ...event, version: row.version, status: !event.enabled ? 'disabled' : now < event.starts ? 'scheduled' : now >= event.ends ? 'expired' : 'active' };
}
export function saveTopupEvent(store, actor, input) {
  if (typeof input?.enabled !== 'boolean' || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 100 || !['discount','bonus'].includes(input.type) || !Number.isInteger(input.percent) || input.percent < 1 || input.percent > (input.type === 'discount' ? 50 : 500) || ![input.starts,input.ends].every(value => Number.isSafeInteger(value) && value >= 0) || (input.enabled && input.ends <= input.starts) || ![input.minAmount,input.maxAmount].every(value => Number.isInteger(value) && value >= 10000 && value <= 1000000 && value % 1000 === 0) || input.maxAmount < input.minAmount || !Array.isArray(input.methods) || !input.methods.length || !input.methods.every(value => Object.hasOwn(PAYMENT_METHODS,value)) || !Number.isSafeInteger(input.version)) throw Error('Kiểm tra tên, thời gian, kênh nạp, mức nạp và tỷ lệ: giảm giá 1–50%, tặng xu 1–500%.');
  return store.transaction(() => {
    if (!store.db.prepare('SELECT is_admin FROM users WHERE id=?').get(actor)?.is_admin) throw Error('Cần quyền quản trị.');
    const old = topupEvent(store); if (old.version !== input.version) throw Error('Sự kiện đã thay đổi. Hãy tải lại trước khi lưu.');
    const data = { enabled: input.enabled, title: input.title.trim(), type: input.type, percent: input.percent, starts: input.starts, ends: input.ends, minAmount: input.minAmount, maxAmount: input.maxAmount, methods: [...new Set(input.methods)] };
    store.db.prepare('UPDATE topup_event_settings SET data=?,version=version+1 WHERE id=1').run(JSON.stringify(data));
    store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), actor, 'topup_event', 'global', JSON.stringify({ before: old, after: data }), Date.now());
    return topupEvent(store);
  });
}
export function topupQuote(store, amount, method, rate, now = Date.now()) {
  if (!Number.isSafeInteger(amount) || amount < 10000 || amount > 1000000 || amount % 1000 !== 0 || !Object.hasOwn(PAYMENT_METHODS,method) || !Number.isInteger(rate) || rate < 1 || amount % rate) throw Error('Chọn gói 10.000–1.000.000 VNĐ, bội số 1.000 và chia hết cho tỷ lệ VNĐ/xu.');
  const event = topupEvent(store, now), baseCoins = amount / rate;
  const applicable = event.status === 'active' && event.methods.includes(method) && amount >= event.minAmount && amount <= event.maxAmount;
  const promotion = applicable ? { title: event.title, type: event.type, percent: event.percent, version: event.version, starts: event.starts, ends: event.ends } : null;
  const payAmountVnd = applicable && event.type === 'discount' ? Math.ceil(amount * (100 - event.percent) / 100) : amount;
  const bonusCoins = applicable && event.type === 'bonus' ? Math.floor(baseCoins * event.percent / 100) : 0;
  const quote = { faceAmountVnd: amount, payAmountVnd, baseCoins, bonusCoins, coins: baseCoins + bonusCoins, promotion };
  return { ...quote, key: createHash('sha256').update(JSON.stringify([method,rate,quote])).digest('hex') };
}
