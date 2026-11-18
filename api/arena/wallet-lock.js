import { randomUUID } from 'node:crypto';
import { walletMode, BALANCE_COLUMNS } from './payment-config.js';

export function initWalletLocks(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS wallet_locks(
    user_id TEXT NOT NULL REFERENCES users(id), wallet_mode TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount>=0), reason TEXT NOT NULL, updated INTEGER NOT NULL,
    version INTEGER NOT NULL, PRIMARY KEY(user_id,wallet_mode));
  CREATE INDEX IF NOT EXISTS audit_wallet_lock ON admin_audit(target,action,created);`);
}
export function walletLock(store, id, mode = walletMode(store)) {
  const row = store.db.prepare('SELECT * FROM wallet_locks WHERE user_id=? AND wallet_mode=?').get(id, mode);
  return { locked_coins: row?.amount ?? 0, lock_reason: row?.reason ?? '', lock_updated: row?.updated ?? null, lock_version: row?.version ?? 0 };
}
export function assertWalletSpendable(store, id, amount, mode = walletMode(store)) {
  const column = BALANCE_COLUMNS[mode]; if (!column) throw Error('Ví không hợp lệ.');
  const balance = store.db.prepare(`SELECT ${column} AS balance FROM users WHERE id=?`).get(id)?.balance ?? 0;
  if (balance - walletLock(store, id, mode).locked_coins < amount) throw Error('Không đủ xu khả dụng. Xu đang khóa không thể dùng đặt cược; bạn vẫn có thể chơi bàn 0 xu.');
}
export function changeWalletLock(store, actor, id, input) {
  if (!Number.isSafeInteger(input?.amount) || input.amount < 0 || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 500 || !Number.isSafeInteger(input.version) || input.version < 0 || !BALANCE_COLUMNS[input.walletMode]) throw Error('Cần nhập số xu khóa nguyên không âm, lý do từ 1–500 ký tự và tải trạng thái ví mới nhất.');
  return store.transaction(() => {
    if (!store.db.prepare('SELECT is_admin FROM users WHERE id=?').get(actor)?.is_admin) throw Error('Cần quyền quản trị.');
    if (input.walletMode !== walletMode(store)) throw Error('Chế độ ví đã thay đổi. Hãy tải lại hồ sơ.');
    const user = store.publicUser(id); if (!user) throw Error('Không tìm thấy người chơi.');
    const previous = walletLock(store, id);
    if (previous.lock_version !== input.version) throw Error('Trạng thái khóa đã thay đổi. Hãy tải lại hồ sơ trước khi lưu.');
    if (input.amount > user.balance) throw Error('Số xu khóa không được vượt số dư hiện tại. Xu đã giữ cược không nằm trong số dư này.');
    if (previous.locked_coins === input.amount) return previous;
    const now = Date.now(), reason = input.reason.trim();
    store.db.prepare(`INSERT INTO wallet_locks VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,wallet_mode) DO UPDATE SET amount=excluded.amount,reason=excluded.reason,updated=excluded.updated,version=excluded.version`).run(id, input.walletMode, input.amount, reason, now, previous.lock_version + 1);
    store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), actor, 'wallet_lock', id, JSON.stringify({ amount: input.amount, reason, previous: previous.locked_coins, walletMode: input.walletMode }), now);
    return walletLock(store, id);
  });
}
export function walletLockHistory(store, id) {
  return store.db.prepare(`SELECT a.id,u.username AS actor,a.detail,a.created FROM admin_audit a JOIN users u ON u.id=a.actor WHERE a.target=? AND a.action='wallet_lock' ORDER BY a.created DESC,a.rowid DESC LIMIT 20`).all(id).map(row => ({ ...row, ...JSON.parse(row.detail), detail: undefined }));
}
