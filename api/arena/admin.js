import { randomUUID } from 'node:crypto';
import { walletMode } from './payment-config.js';
import { dashboard, reportRange, userStats, findAlerts } from './analytics.js';
import { walletLock, walletLockHistory, changeWalletLock } from './wallet-lock.js';
import { gameCatalog, updateGameMaintenance } from './game-maintenance.js';
import { adjustmentHistory, adjustWallet } from './wallet-adjustments.js';
import { topupEvent, saveTopupEvent } from './topup-events.js';

const number = (value, fallback, max) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw Error('Phân trang hoặc giới hạn không hợp lệ.');
  return Number(value);
};
export function installAdmin(router, store, online, notify = () => {}) {
  router.use('/admin', (req, res, next) => {
    if (!req.arenaUser.is_admin) return res.status(403).json({ error: 'Tài khoản này chưa có quyền quản trị.' });
    next();
  });
  const route = fn => (req, res, next) => { try { fn(req, res); } catch (e) { next(e); } };
  router.get('/admin/topup-event', route((req, res) => res.json(topupEvent(store))));
  router.post('/admin/topup-event', route((req, res) => { const event = saveTopupEvent(store, req.arenaUser.id, req.body); notify(); res.json(event); }));
  router.get('/admin/games', route((req, res) => res.json({ games: gameCatalog(store) })));
  router.post('/admin/games/:game/maintenance', route((req, res) => {
    const games = updateGameMaintenance(store, req.arenaUser.id, req.params.game, req.body); notify(); res.json({ games });
  }));
  router.get('/admin/dashboard', route((req, res) => {
    const data = dashboard(store, reportRange(req.query), number(req.query.minGames, 5, 100));
    data.summary.online = store.db.prepare('SELECT id FROM users').all().filter(u => online(u.id)).length;
    res.json(data);
  }));
  router.get('/admin/users', route((req, res) => {
    const range = reportRange(req.query), page = number(req.query.page, 1, 100000), limit = number(req.query.limit, 20, 100);
    const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 64).toLowerCase().trim() : '';
    const key = ['username', 'balance', 'topup', 'profit', 'games', 'win_rate', 'online_seconds'].includes(req.query.sort) ? req.query.sort : 'topup';
    const users = userStats(store, range).filter(u => u.username.toLowerCase().includes(query)).map(u => ({ ...u, online: online(u.id) }));
    users.sort((a, b) => key === 'username' ? a.username.localeCompare(b.username) : b[key] - a[key] || a.username.localeCompare(b.username));
    res.json({ items: users.slice((page - 1) * limit, page * limit), total: users.length, page, limit });
  }));
  router.get('/admin/topups', route((req, res) => {
    const { from, to } = reportRange(req.query), page = number(req.query.page, 1, 100000), limit = number(req.query.limit, 20, 100);
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 64).trim() : '';
    const where = `l.wallet_mode='${walletMode(store)}' AND l.kind IN ('demo_topup','paid_topup','sandbox_topup') AND l.created>=? AND l.created<? AND instr(lower(u.username),lower(?))>0`;
    const total = store.db.prepare(`SELECT COUNT(*) total FROM ledger l JOIN users u ON u.id=l.user_id WHERE ${where}`).get(from, to, q).total;
    const items = store.db.prepare(`SELECT l.id,l.user_id,u.username,l.amount,l.created,l.kind,l.wallet_mode FROM ledger l JOIN users u ON u.id=l.user_id WHERE ${where} ORDER BY l.created DESC,l.rowid DESC LIMIT ? OFFSET ?`).all(from, to, q, limit, (page - 1) * limit);
    res.json({ items, total, page, limit });
  }));
  router.get('/admin/users/:id', route((req, res) => {
    const range = reportRange(req.query), user = userStats(store, range).find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người chơi.' });
    const ledgerPage = number(req.query.ledgerPage, 1, 100000), matchPage = number(req.query.matchPage, 1, 100000), limit = 20;
    const ledgerWhere = `user_id=? AND wallet_mode='${walletMode(store)}' AND created>=? AND created<?`;
    const ledger = store.db.prepare(`SELECT id,amount,kind,match_id,created,wallet_mode FROM ledger WHERE ${ledgerWhere} ORDER BY created DESC,rowid DESC LIMIT ? OFFSET ?`).all(user.id, range.from, range.to, limit, (ledgerPage - 1) * limit);
    const ledgerTotal = store.db.prepare(`SELECT COUNT(*) n FROM ledger WHERE ${ledgerWhere}`).get(user.id, range.from, range.to).n;
    const matches = store.db.prepare(`SELECT m.*,p.seat FROM match_stats m JOIN match_players p ON p.match_id=m.id WHERE p.user_id=? AND m.wallet_mode='${walletMode(store)}' AND m.created>=? AND m.created<? ORDER BY m.created DESC LIMIT ? OFFSET ?`).all(user.id, range.from, range.to, limit, (matchPage - 1) * limit);
    const matchTotal = store.db.prepare(`SELECT COUNT(*) n FROM match_stats m JOIN match_players p ON p.match_id=m.id WHERE p.user_id=? AND m.wallet_mode='${walletMode(store)}' AND m.created>=? AND m.created<?`).get(user.id, range.from, range.to).n;
    res.json({ user: { ...user, ...walletLock(store, user.id), online: online(user.id) }, adjustmentHistory: adjustmentHistory(store, user.id), lockHistory: walletLockHistory(store, user.id), ledger, ledgerTotal, ledgerPage, matches, matchTotal, matchPage, limit });
  }));
  router.post('/admin/users/:id/wallet-adjustment', route((req, res) => {
    const adjustment = adjustWallet(store, req.arenaUser.id, req.params.id, req.body); notify(); res.json({ adjustment });
  }));
  router.post('/admin/users/:id/wallet-lock', route((req, res) => {
    const lock = changeWalletLock(store, req.arenaUser.id, req.params.id, req.body);
    notify(); res.json(lock);
  }));
  router.post('/admin/reviews', route((req, res) => {
    const { fingerprint, status, note } = req.body ?? {};
    if (typeof fingerprint !== 'string' || !['open', 'reviewing', 'resolved'].includes(status) || typeof note !== 'string' || note.length > 1000) throw Error('Thông tin rà soát không hợp lệ.');
    const range = reportRange(req.query), alerts = findAlerts(store, userStats(store, range), range);
    if (!alerts.some(a => a.fingerprint === fingerprint)) return res.status(404).json({ error: 'Cảnh báo không còn trong kỳ đã chọn. Hãy tải lại báo cáo.' });
    const now = Date.now();
    store.transaction(() => {
      store.db.prepare('INSERT INTO admin_reviews VALUES(?,?,?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET status=excluded.status,note=excluded.note,reviewer=excluded.reviewer,updated=excluded.updated').run(fingerprint, status, note.trim(), req.arenaUser.id, now);
      store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), req.arenaUser.id, 'review', fingerprint, JSON.stringify({ status, note: note.trim() }), now);
    });
    res.json({ ok: true });
  }));
}
