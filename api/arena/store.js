import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initialState, applyGameMove } from './games.js';

const fail = message => { throw Error(message); };
const hash = token => createHash('sha256').update(token).digest('hex');
export class ArenaStore {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE, password TEXT NOT NULL, balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0));
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, kind TEXT NOT NULL, match_id TEXT, request_key TEXT, created INTEGER NOT NULL, UNIQUE(user_id,request_key));
      CREATE INDEX IF NOT EXISTS ledger_user ON ledger(user_id,created);`);
  }
  transaction(fn) { this.db.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  publicUser(id) { return this.db.prepare('SELECT id,username,balance FROM users WHERE id=?').get(id); }
  register(username, password) {
    username = typeof username === 'string' ? username.trim() : '';
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) fail('Tên đăng nhập gồm 3–24 chữ, số hoặc dấu gạch dưới.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) fail('Mật khẩu cần từ 8 đến 128 ký tự.');
    const salt = randomBytes(16).toString('hex'), passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, id = randomUUID();
    try { this.db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id, username, passwordHash); } catch (e) {
      if (this.db.prepare('SELECT id FROM users WHERE username=?').get(username)) fail('Tên đăng nhập đã tồn tại.'); throw e;
    }
    return this.newSession(id);
  }
  login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 128) fail('Tên đăng nhập hoặc mật khẩu không đúng.');
    const u = this.db.prepare('SELECT * FROM users WHERE username=?').get(username.trim());
    // Derive even for unknown names to keep the verification path comparable.
    const [salt, key] = (u?.password ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
    const computed = scryptSync(password, salt, 64);
    if (!u || !timingSafeEqual(computed, Buffer.from(key, 'hex'))) fail('Tên đăng nhập hoặc mật khẩu không đúng.');
    return this.newSession(u.id);
  }
  newSession(id) {
    const token = randomBytes(32).toString('hex');
    this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), id, Date.now() + 7 * 86400000);
    return { token, user: this.publicUser(id) };
  }
  authenticate(token) {
    if (typeof token !== 'string' || token.length !== 64) return null;
    const row = this.db.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(hash(token), Date.now());
    return row ? this.publicUser(row.user_id) : null;
  }
  logout(token) { if (token) this.db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token)); }
  credit(id, amount, kind, matchId = null, requestKey = null) {
    if (!Number.isSafeInteger(amount)) fail('Số xu không hợp lệ.');
    const result = this.db.prepare('UPDATE users SET balance=balance+? WHERE id=? AND balance+?>=0').run(amount, id, amount);
    if (!result.changes) fail('Không đủ xu.');
    this.db.prepare('INSERT INTO ledger VALUES(?,?,?,?,?,?,?)').run(randomUUID(), id, amount, kind, matchId, requestKey, Date.now());
  }
  topup(id, amount, key) {
    if (![1000, 5000, 10000].includes(amount)) fail('Chọn gói 1.000, 5.000 hoặc 10.000 xu thử nghiệm.');
    if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) fail('Mã giao dịch không hợp lệ.');
    return this.transaction(() => {
      const old = this.db.prepare('SELECT amount,kind FROM ledger WHERE user_id=? AND request_key=?').get(id, key);
      if (old) { if (old.amount !== amount || old.kind !== 'demo_topup') fail('Mã giao dịch đã được sử dụng.'); return this.publicUser(id); }
      const sum = this.db.prepare("SELECT COALESCE(SUM(amount),0) total FROM ledger WHERE user_id=? AND kind='demo_topup' AND created>?").get(id, Date.now() - 86400000).total;
      if (sum + amount > 100000) fail('Giới hạn thử nghiệm là 100.000 xu mỗi 24 giờ.');
      this.credit(id, amount, 'demo_topup', null, key); return this.publicUser(id);
    });
  }
  ledger(id) { return this.db.prepare('SELECT id,amount,kind,match_id,created FROM ledger WHERE user_id=? ORDER BY created DESC,rowid DESC LIMIT 50').all(id); }
  allMatches() { return this.db.prepare('SELECT data FROM matches ORDER BY rowid DESC').all().map(r => JSON.parse(r.data)); }
  activeMatch(id) { return this.allMatches().find(m => ['waiting', 'playing'].includes(m.status) && m.players.some(p => p.id === id)); }
  match(id) { const r = this.db.prepare('SELECT data FROM matches WHERE id=?').get(id); if (!r) fail('Bàn không tồn tại.'); return JSON.parse(r.data); }
  save(m) { this.db.prepare('INSERT INTO matches VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(m.id, JSON.stringify(m)); return m; }
  create(id, { name, game, stake, size }) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 40) fail('Tên bàn cần từ 1 đến 40 ký tự.');
    if (!Number.isSafeInteger(stake) || stake < 0 || stake > 100000) fail('Mức cược cần là số nguyên từ 0 đến 100.000 xu.');
    const state = initialState(game, size);
    return this.transaction(() => {
      if (this.activeMatch(id)) fail('Bạn đang ở một bàn khác.');
      if (this.publicUser(id).balance < stake) fail('Không đủ xu tạo bàn.');
      if (this.allMatches().filter(m => m.status === 'waiting').length >= 100) fail('Sảnh đang đầy.');
      const u = this.publicUser(id);
      return this.save({ id: randomUUID(), name: name.trim(), game, stake, state, version: 0, status: 'waiting', players: [{ id, username: u.username }], drawOffer: null, result: null, created: Date.now() });
    });
  }
  join(id, matchId) {
    return this.transaction(() => {
      const m = this.match(matchId);
      if (m.players.some(p => p.id === id)) return m;
      if (m.status !== 'waiting' || m.players.length !== 1) fail('Bàn đã bắt đầu hoặc đã đóng.');
      if (this.activeMatch(id)) fail('Bạn đang ở một bàn khác.');
      const u = this.publicUser(id); m.players.push({ id, username: u.username });
      // Both holds and the transition to playing are committed together.
      for (const p of m.players) if (m.stake) this.credit(p.id, -m.stake, 'stake_hold', m.id);
      m.status = 'playing'; m.version++; m.started = Date.now(); return this.save(m);
    });
  }
  finish(m, winner, reason) {
    if (m.status !== 'playing') fail('Ván đã kết thúc.');
    if (m.stake) {
      if (winner === -1) for (const p of m.players) this.credit(p.id, m.stake, 'stake_refund', m.id);
      else this.credit(m.players[winner].id, m.stake * 2, 'win_payout', m.id);
    }
    m.status = 'finished'; m.result = { winner, reason }; m.finished = Date.now(); m.drawOffer = null;
  }
  action(id, matchId, action) {
    return this.transaction(() => {
      const m = this.match(matchId), seat = m.players.findIndex(p => p.id === id);
      if (seat < 0) fail('Bạn không thuộc bàn này.');
      if (m.status !== 'playing') fail('Bàn chưa bắt đầu hoặc đã kết thúc.');
      if (action.version !== m.version) fail('Bàn vừa thay đổi. Hãy thử lại.');
      if (action.type === 'resign') this.finish(m, 1 - seat, 'Đối phương đầu hàng');
      else if (action.type === 'draw-offer') { if (m.drawOffer !== null) fail('Đang có đề nghị hòa.'); m.drawOffer = seat; }
      else if (action.type === 'draw-accept' || action.type === 'draw-reject') {
        if (m.drawOffer !== 1 - seat) fail('Không có đề nghị hòa từ đối phương.');
        if (action.type === 'draw-accept') this.finish(m, -1, 'Hai bên đồng ý hòa'); else m.drawOffer = null;
      } else if (action.type === 'move') {
        if (m.state.turn !== seat) fail('Chưa đến lượt bạn.');
        const next = applyGameMove(m.game, m.state, action); m.state = next.state; m.drawOffer = null;
        if (next.winner !== null) this.finish(m, next.winner, next.reason);
      } else fail('Thao tác không hợp lệ.');
      m.version++; return this.save(m);
    });
  }
  cancel(id, matchId) {
    return this.transaction(() => {
      const m = this.match(matchId);
      if (m.status !== 'waiting' || m.players[0].id !== id) fail('Chỉ chủ bàn có thể hủy bàn đang chờ.');
      m.status = 'cancelled'; m.version++; return this.save(m);
    });
  }
  timeout(matchId, winner) {
    return this.transaction(() => {
      const m = this.match(matchId); if (m.status !== 'playing') return m;
      this.finish(m, winner, winner === -1 ? 'Cả hai mất kết nối · hoàn cược' : 'Đối phương mất kết nối quá 60 giây'); m.version++; return this.save(m);
    });
  }
  close() { this.db.close(); }
}
