import { randomUUID } from 'node:crypto';
import { walletMode, BALANCE_COLUMNS } from './payment-config.js';

export function initWalletAdjustments(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS wallet_adjustments(
    id TEXT PRIMARY KEY,actor TEXT NOT NULL REFERENCES users(id),user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,wallet_mode TEXT NOT NULL,reason TEXT NOT NULL,reference TEXT NOT NULL,
    request_id TEXT NOT NULL UNIQUE,balance_before INTEGER NOT NULL,balance_after INTEGER NOT NULL,
    payment_order_id TEXT UNIQUE REFERENCES payment_orders(id),created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS wallet_adjustments_user ON wallet_adjustments(user_id,wallet_mode,created);`);
}
export function adjustmentHistory(store, id) {
  return store.db.prepare(`SELECT a.*,u.username AS actor_name FROM wallet_adjustments a JOIN users u ON u.id=a.actor WHERE a.user_id=? AND a.wallet_mode=? ORDER BY a.created DESC,a.rowid DESC LIMIT 20`).all(id, walletMode(store));
}
export function adjustWallet(store, actor, userId, input) {
  if (!Number.isSafeInteger(input?.amount) || input.amount === 0 || Math.abs(input.amount) > 10000000 || !Object.hasOwn(BALANCE_COLUMNS, input.walletMode) || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 500 || typeof input.reference !== 'string' || input.reference.length > 150 || typeof input.paymentOrderId !== 'string' || input.paymentOrderId.length > 80 || !/^[a-f0-9-]{36}$/i.test(input.requestId ?? '') || !Number.isSafeInteger(input.expectedBalance) || input.expectedBalance < 0) throw Error('Nhập từ 1 đến 10.000.000 xu, lý do và tải lại số dư trước khi điều chỉnh.');
  const reason = input.reason.trim(), reference = input.reference.trim(), orderId = input.paymentOrderId.trim() || null;
  return store.transaction(() => {
    if (!store.db.prepare('SELECT is_admin FROM users WHERE id=?').get(actor)?.is_admin) throw Error('Cần quyền quản trị.');
    const old = store.db.prepare('SELECT * FROM wallet_adjustments WHERE request_id=?').get(input.requestId);
    if (old) {
      if (old.actor !== actor || old.user_id !== userId || old.amount !== input.amount || old.wallet_mode !== input.walletMode || old.reason !== reason || old.reference !== reference || old.payment_order_id !== orderId) throw Error('Mã thao tác đã được dùng cho nội dung khác.');
      return old;
    }
    if (walletMode(store) !== input.walletMode) throw Error('Chế độ ví đã thay đổi. Hãy tải lại hồ sơ.');
    const user = store.publicUser(userId); if (!user) throw Error('Không tìm thấy người chơi.');
    if (user.balance !== input.expectedBalance) throw Error('Số dư đã thay đổi. Hãy tải lại hồ sơ và kiểm tra trước khi điều chỉnh.');
    if (orderId) {
      const order = store.db.prepare('SELECT * FROM payment_orders WHERE id=?').get(orderId);
      if (!order || order.user_id !== userId || order.wallet_mode !== input.walletMode) throw Error('Đơn nạp không thuộc người chơi hoặc ví đang chọn.');
      if (input.amount !== order.coins || order.status === 'paid') throw Error('Chỉ cộng bù toàn bộ số xu của đơn chưa được cộng thành công.');
      if (store.db.prepare('SELECT id FROM wallet_adjustments WHERE payment_order_id=?').get(orderId)) throw Error('Đơn nạp đã được cộng bù trước đó.');
    }
    const id = randomUUID(), now = Date.now();
    store.credit(userId, input.amount, input.amount > 0 ? 'admin_credit' : 'admin_debit', null, `admin-adjustment:${input.requestId}`, input.walletMode);
    const after = store.publicUser(userId).balance;
    store.db.prepare('INSERT INTO wallet_adjustments VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id, actor, userId, input.amount, input.walletMode, reason, reference, input.requestId, user.balance, after, orderId, now);
    store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), actor, 'wallet_adjustment', userId, JSON.stringify({ id, amount: input.amount, walletMode: input.walletMode, before: user.balance, after, reason, reference, paymentOrderId: orderId }), now);
    return store.db.prepare('SELECT * FROM wallet_adjustments WHERE id=?').get(id);
  });
}
