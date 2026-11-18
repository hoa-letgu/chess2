import { randomUUID, createHash } from 'node:crypto';
import { walletMode, BALANCE_COLUMNS } from './payment-config.js';
import { walletLock } from './wallet-lock.js';
import { GAME_NAMES } from './games.js';

export function syncMatch(store, m) {
  store.db.prepare(`INSERT INTO match_stats(id,game,stake,status,created,started,finished,winner,name,wallet_mode) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    game=excluded.game,stake=excluded.stake,status=excluded.status,created=excluded.created,started=excluded.started,finished=excluded.finished,winner=excluded.winner,name=excluded.name,wallet_mode=excluded.wallet_mode`)
    .run(m.id, m.game, m.stake, m.status, m.created, m.started ?? null, m.finished ?? null, m.result?.winner ?? null, m.name, m.wallet_mode ?? 'demo');
  for (let seat = 0; seat < m.players.length; seat++) store.db.prepare('INSERT OR IGNORE INTO match_players VALUES(?,?,?)').run(m.id, m.players[seat].id, seat);
}
export function initAnalytics(store) {
  const columns = store.db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!columns.includes('is_admin')) store.db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  if (!columns.includes('created')) store.db.exec('ALTER TABLE users ADD COLUMN created INTEGER');
  store.db.exec(`CREATE TABLE IF NOT EXISTS match_stats(id TEXT PRIMARY KEY,game TEXT NOT NULL,stake INTEGER NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,started INTEGER,finished INTEGER,winner INTEGER,name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS match_players(match_id TEXT NOT NULL REFERENCES match_stats(id),user_id TEXT NOT NULL REFERENCES users(id),seat INTEGER NOT NULL,PRIMARY KEY(match_id,user_id));
    CREATE INDEX IF NOT EXISTS stats_started ON match_stats(started,game);
    CREATE INDEX IF NOT EXISTS stats_finished ON match_stats(finished);
    CREATE INDEX IF NOT EXISTS stats_player ON match_players(user_id,match_id);
    CREATE INDEX IF NOT EXISTS ledger_created ON ledger(created,kind);
    CREATE TABLE IF NOT EXISTS online_spans(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),started INTEGER NOT NULL,last_seen INTEGER NOT NULL,ended INTEGER);
    CREATE UNIQUE INDEX IF NOT EXISTS online_active ON online_spans(user_id) WHERE ended IS NULL;
    CREATE INDEX IF NOT EXISTS online_user ON online_spans(user_id,started);
    CREATE TABLE IF NOT EXISTS admin_reviews(fingerprint TEXT PRIMARY KEY,status TEXT NOT NULL,note TEXT NOT NULL,reviewer TEXT NOT NULL REFERENCES users(id),updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,target TEXT NOT NULL,detail TEXT NOT NULL,created INTEGER NOT NULL);`);
  if (!store.db.prepare('PRAGMA table_info(match_stats)').all().some(c => c.name === 'wallet_mode')) store.db.exec("ALTER TABLE match_stats ADD COLUMN wallet_mode TEXT NOT NULL DEFAULT 'demo'");
  // Rebuild the reporting index from persisted matches so existing installations immediately get history.
  store.transaction(() => {
    for (const m of store.allMatches()) syncMatch(store, m);
  });
}
export function presenceStart(store, id, now) {
  store.db.prepare('INSERT OR IGNORE INTO online_spans VALUES(?,?,?,?,NULL)').run(randomUUID(), id, now, now);
}
export function presenceTouch(store, id, now, end = false) {
  store.db.prepare('UPDATE online_spans SET last_seen=MAX(last_seen,?),ended=CASE WHEN ? THEN MAX(last_seen,?) ELSE NULL END WHERE user_id=? AND ended IS NULL').run(now, Number(end), now, id);
}
export function reportRange(query, now = Date.now()) {
  const parse = (value, fallback, end = false) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Ngày cần có dạng YYYY-MM-DD.');
    const ms = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) throw Error('Ngày không hợp lệ.');
    return ms + (end ? 86400000 : 0);
  };
  const to = parse(query.to, Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) + 86400000, true);
  const from = parse(query.from, to - 30 * 86400000);
  if (from >= to || to - from > 366 * 86400000) throw Error('Chọn khoảng ngày tối đa 366 ngày, ngày đầu không sau ngày cuối.');
  return { from, to };
}

// Current balance and reconciliation are lifetime values; all ranked activity
// and earnings are restricted to the selected report period.
export function userStats(store, range) {
  const { from, to } = range, mode = walletMode(store), column = BALANCE_COLUMNS[mode];
  return store.db.prepare(`WITH
    funds AS (SELECT user_id,SUM(CASE WHEN kind IN ('demo_topup','paid_topup','sandbox_topup') THEN amount ELSE 0 END) topup,
      SUM(CASE WHEN kind IN ('demo_topup','paid_topup','sandbox_topup') THEN 1 ELSE 0 END) topup_count,
      SUM(CASE WHEN kind IN ('stake_hold','stake_refund','win_payout') THEN amount ELSE 0 END) net,
      SUM(CASE WHEN kind='win_payout' THEN amount ELSE 0 END) payout
      FROM ledger WHERE wallet_mode='${mode}' AND created>=? AND created<? GROUP BY user_id),
    played AS (SELECT p.user_id,SUM(m.started>=? AND m.started<?) games,SUM(m.status='finished' AND m.finished>=? AND m.finished<?) completed,
      SUM(m.status='finished' AND m.finished>=? AND m.finished<? AND m.winner=p.seat) wins,
      SUM(m.status='finished' AND m.finished>=? AND m.finished<? AND m.winner>=0 AND m.winner<>p.seat) losses,
      SUM(m.status='finished' AND m.finished>=? AND m.finished<? AND m.winner=-1) draws
      FROM match_players p JOIN match_stats m ON m.id=p.match_id
      WHERE m.started IS NOT NULL AND m.wallet_mode='${mode}' GROUP BY p.user_id),
    earnings AS (SELECT p.user_id,SUM(CASE WHEN m.winner=-1 THEN 0 WHEN m.winner=p.seat THEN m.stake ELSE -m.stake END) profit
      FROM match_players p JOIN match_stats m ON m.id=p.match_id WHERE m.wallet_mode='${mode}' AND m.status='finished' AND m.finished>=? AND m.finished<? GROUP BY p.user_id),
    duration AS (SELECT user_id,SUM(MAX(0,MIN(last_seen,?)-MAX(started,?)))/1000.0 online_seconds,MAX(last_seen) last_seen
      FROM online_spans WHERE started<? AND last_seen>=? GROUP BY user_id),
    totals AS (SELECT user_id,SUM(amount) ledger_balance FROM ledger WHERE wallet_mode='${mode}' GROUP BY user_id)
    SELECT u.id,u.username,u.${column} AS balance,u.balance AS demo_balance,u.paid_balance,u.sandbox_balance,u.created,u.is_admin,
      COALESCE(f.topup,0) topup,COALESCE(f.topup_count,0) topup_count,COALESCE(f.payout,0) payout,
      COALESCE(e.profit,0) profit,COALESCE(f.net,0) wallet_net,
      COALESCE(p.games,0) games,COALESCE(p.completed,0) completed,COALESCE(p.wins,0) wins,
      COALESCE(p.losses,0) losses,COALESCE(p.draws,0) draws,
      COALESCE(d.online_seconds,0) online_seconds,d.last_seen,
      u.${column}-COALESCE(t.ledger_balance,0) discrepancy
    FROM users u LEFT JOIN funds f ON f.user_id=u.id LEFT JOIN played p ON p.user_id=u.id
    LEFT JOIN earnings e ON e.user_id=u.id LEFT JOIN duration d ON d.user_id=u.id LEFT JOIN totals t ON t.user_id=u.id
    ORDER BY u.username COLLATE NOCASE`).all(from, to, from, to, from, to, from, to, from, to, from, to, from, to, to, from, to, from)
    .map(u => ({ ...u, ...walletLock(store, u.id), available_coins: u.balance - walletLock(store, u.id).locked_coins, wallet_mode: mode, win_rate: u.completed ? u.wins / u.completed * 100 : 0 }));
}
export function findAlerts(store, users, range) {
  const alerts = [], mode = walletMode(store);
  const add = (u, rule, severity, detail) => alerts.push({ fingerprint: `${u.id}:${mode}:${rule}:${range.from}:${range.to}:${createHash('sha256').update(detail).digest('hex').slice(0, 16)}`, user_id: u.id, username: u.username, rule, severity, detail });
  for (const u of users) {
    if (u.discrepancy) add(u, 'balance_mismatch', 'high', `Số dư lệch ${u.discrepancy} xu so với tổng sổ giao dịch toàn thời gian.`);
    if (u.topup >= 50000) add(u, 'large_topup', 'medium', `Nạp ${u.topup} xu nạp trong kỳ (ngưỡng 50.000).`);
    if (u.completed >= 10 && u.win_rate >= 90 && u.profit >= 10000) add(u, 'high_win_profit', 'medium', `Thắng ${u.win_rate.toFixed(1)}% trên ${u.completed} ván, lãi ${u.profit} xu; cần kiểm tra thủ công.`);
  }
  const rapid = store.db.prepare(`SELECT DISTINCT a.user_id FROM ledger a WHERE a.wallet_mode='${mode}' AND a.kind IN ('demo_topup','paid_topup','sandbox_topup') AND a.created>=? AND a.created<?
    AND (SELECT COUNT(*) FROM ledger b WHERE b.user_id=a.user_id AND b.wallet_mode='${mode}' AND b.kind IN ('demo_topup','paid_topup','sandbox_topup') AND b.created BETWEEN MAX(?,a.created-600000) AND a.created)>=5`).all(range.from, range.to, range.from);
  for (const r of rapid) { const u = users.find(u => u.id === r.user_id); if (u) add(u, 'rapid_topup', 'medium', 'Ít nhất 5 lần nạp trong 10 phút.'); }
  const pairs = store.db.prepare(`SELECT a.user_id,b.user_id opponent,COUNT(*) games,SUM(m.winner=a.seat) wins,SUM(CASE WHEN m.winner=a.seat THEN m.stake ELSE -m.stake END) profit
    FROM match_players a JOIN match_players b ON a.match_id=b.match_id AND a.user_id<>b.user_id JOIN match_stats m ON m.id=a.match_id
    WHERE m.wallet_mode='${mode}' AND m.status='finished' AND m.winner>=0 AND m.stake>0 AND m.finished>=? AND m.finished<?
    GROUP BY a.user_id,b.user_id HAVING COUNT(*)>=5 AND SUM(m.winner=a.seat)*1.0/COUNT(*)>=0.9 AND profit>=1000`).all(range.from, range.to);
  for (const p of pairs) { const u = users.find(u => u.id === p.user_id); if (u) add(u, `repeated_opponent_${p.opponent}`, 'medium', `Thắng ${p.wins}/${p.games} ván có xu với cùng một đối thủ, lãi ${p.profit} xu. Đây chỉ là tín hiệu rà soát.`); }
  const reviews = new Map(store.db.prepare('SELECT * FROM admin_reviews').all().map(r => [r.fingerprint, r]));
  return alerts.map(a => ({ ...a, review: reviews.get(a.fingerprint) ?? null })).sort((a, b) => (a.severity === 'high' ? -1 : 0) - (b.severity === 'high' ? -1 : 0));
}
export function dashboard(store, range, minGames = 5) {
  const users = userStats(store, range), { from, to } = range, mode = walletMode(store);
  const games = store.db.prepare(`SELECT m.game,COUNT(*) matches,COUNT(DISTINCT p.user_id) players,
    COUNT(DISTINCT CASE WHEN m.status='finished' THEN m.id END) completed,
    SUM(m.stake) stake_volume FROM match_stats m JOIN match_players p ON p.match_id=m.id
    WHERE m.wallet_mode='${mode}' AND m.started>=? AND m.started<? GROUP BY m.game`).all(from, to);
  // Count games once, but stake volume once per player (the full held pool).
  const counts = store.db.prepare(`SELECT game,COUNT(*) matches FROM match_stats WHERE wallet_mode='${mode}' AND started>=? AND started<? GROUP BY game`).all(from, to);
  const gameRows = Object.entries(GAME_NAMES).map(([id, name]) => ({ id, name, ...(games.find(g => g.game === id) ?? { players: 0, completed: 0, stake_volume: 0 }), matches: counts.find(g => g.game === id)?.matches ?? 0, revenue_vnd: 0 })).sort((a, b) => b.matches - a.matches);
  const daily = store.db.prepare(`SELECT strftime('%Y-%m-%d',created/1000,'unixepoch') day,SUM(amount) topup,COUNT(*) count FROM ledger WHERE wallet_mode='${mode}' AND kind IN ('demo_topup','paid_topup','sandbox_topup') AND created>=? AND created<? GROUP BY day ORDER BY day`).all(from, to);
  const ranked = (key, predicate = () => true, asc = false) => users.filter(predicate).sort((a, b) => (asc ? 1 : -1) * (a[key] - b[key]) || b.completed - a.completed || a.username.localeCompare(b.username)).slice(0, 10);
  const active = store.db.prepare("SELECT COUNT(*) count FROM match_stats WHERE status='playing'").get().count;
  const revenue = store.db.prepare("SELECT COALESCE(SUM(amount_vnd),0) total FROM payment_orders WHERE environment='live' AND status='paid' AND paid_at>=? AND paid_at<?").get(from,to).total;
  const paymentReviews = store.db.prepare('SELECT COUNT(*) n FROM payment_orders WHERE review_required=1').get().n;
  return { range, minGames, walletMode: mode, paymentReviews, summary: { users: users.length, active, matches: gameRows.reduce((s, g) => s + g.matches, 0), topup: users.reduce((s, u) => s + u.topup, 0), topup_count: users.reduce((s, u) => s + u.topup_count, 0), revenue_vnd: revenue, platform_fee: 0 }, games: gameRows, daily,
    rankings: { topup: ranked('topup', u => u.topup > 0), best: ranked('win_rate', u => u.completed >= minGames), weakest: ranked('win_rate', u => u.completed >= minGames, true), profit: ranked('profit', u => u.profit > 0), online: ranked('online_seconds', u => u.online_seconds > 0) }, alerts: findAlerts(store, users, range) };
}
