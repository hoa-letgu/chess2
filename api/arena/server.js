import { installPayments } from './payments.js';
import { installAdmin } from './admin.js';
import { presenceStart, presenceTouch } from './analytics.js';
import { publicGameState } from './native-games.js';
import express from 'express';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { ArenaStore } from './store.js';
import { gameCatalog } from './game-maintenance.js';
import { installPromotions } from './promotions.js';

export function installArena(app, httpServer, options = {}) {
  const store = new ArenaStore(options.dbPath ?? process.env.ARENA_DB_PATH ?? fileURLToPath(new URL('../data/arena.sqlite', import.meta.url)));
  app.get('/api/arena/games', (req, res) => res.set('Cache-Control', 'no-store').json({ games: gameCatalog(store) }));
  store.db.exec('UPDATE online_spans SET ended=last_seen WHERE ended IS NULL');
  let closing = false;
  const presence = new Map(), activityPresence = new Map(), offlineSince = new Map(), attempts = new Map();
  const allowed = new Set((process.env.ARENA_ORIGINS ?? '').split(',').filter(Boolean));
  const sameOrigin = req => {
    if (!req.headers.origin) return true;
    try { return new URL(req.headers.origin).host === req.headers.host || allowed.has(req.headers.origin); } catch { return false; }
  };
  const tokenOf = req => /(?:^|;\s*)arena_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
  const cookie = token => `arena_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? 604800 : 0}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  const now = options.now ?? Date.now;
  const io = new Server(httpServer, { path: '/arena-socket', maxHttpBufferSize: 16384, allowRequest: (req, cb) => cb(null, sameOrigin(req)) });
  const activeOnline = id => (activityPresence.get(id)?.size ?? 0) > 0;
  const online = id => (presence.get(id)?.size ?? 0) > 0;
  function decorate(m) {
    return { ...m, state: publicGameState(m.game, m.state), players: m.players.map(p => ({ ...p, online: online(p.id), reconnectUntil: online(p.id) ? null : (offlineSince.get(p.id) ?? now()) + 60000 })) };
  }
  function notify() { io.emit('arena:changed'); }
  io.use((socket, next) => {
    if (!sameOrigin(socket.request)) return next(Error('Nguồn kết nối không hợp lệ.'));
    const user = store.authenticate(tokenOf(socket.request));
    if (!user) return next(Error('Vui lòng đăng nhập.')); socket.data.userId = user.id; next();
  });
  io.on('connection', socket => {
    const id = socket.data.userId;
    if (!activityPresence.has(id)) { activityPresence.set(id, new Set()); presenceStart(store, id, now()); }
    activityPresence.get(id).add(socket.id);
    const activityOnly = socket.handshake.auth?.activityOnly === true;
    if (!activityOnly) {
      if (!presence.has(id)) presence.set(id, new Set());
      presence.get(id).add(socket.id); offlineSince.delete(id);
    }
    notify();
    socket.on('disconnect', () => {
      if (closing) return;
      activityPresence.get(id)?.delete(socket.id);
      if (!activeOnline(id)) { presenceTouch(store, id, now(), true); activityPresence.delete(id); }
      if (!activityOnly) {
        presence.get(id)?.delete(socket.id);
        if (!online(id)) { presence.delete(id); offlineSince.set(id, now()); }
      }
      notify();
    });
  });
  const router = express.Router();
  router.use(express.json({ limit: '16kb' }));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!sameOrigin(req) || (req.method !== 'GET' && req.headers['x-arena-request'] !== '1')) {
      return res.status(403).json({ error: 'Yêu cầu không hợp lệ.' });
    }
    next();
  });
  const wrap = fn => (req, res, next) => { try { fn(req, res); } catch (e) { next(e); } };
  const limit = (req, max = 20) => {
    const key = req.ip ?? req.socket.remoteAddress, time = now(), old = attempts.get(key);
    if (!old || time - old.start > 60000) attempts.set(key, { start: time, count: 1 });
    else if (++old.count > max) throw Error('Thao tác quá nhanh. Vui lòng thử lại sau một phút.');
    if (attempts.size > 10000) for (const [k, value] of attempts) if (time - value.start > 60000) attempts.delete(k);
  };
  for (const method of ['register', 'login']) router.post(`/auth/${method}`, wrap((req, res) => {
    limit(req); const { token, user } = store[method](req.body?.username, req.body?.password);
    res.setHeader('Set-Cookie', cookie(token)); res.json({ user });
  }));
  router.use((req, res, next) => {
    req.arenaUser = store.authenticate(tokenOf(req));
    if (!req.arenaUser) return res.status(401).json({ error: 'Vui lòng đăng nhập.' }); next();
  });
  installAdmin(router, store, activeOnline, notify);
  installPromotions(app, router, store, req => store.authenticate(tokenOf(req)), notify);
  const payments = installPayments(app, router, store, { env: options.paymentEnv ?? process.env, fetch: options.paymentFetch, notify });
  router.get('/me', wrap((req, res) => res.json({ user: req.arenaUser, ledger: store.ledger(req.arenaUser.id), payments: payments.config() })));
  router.post('/auth/logout', wrap((req, res) => {
    store.logout(tokenOf(req));
    for (const sid of activityPresence.get(req.arenaUser.id) ?? []) {
      const s = io.sockets.sockets.get(sid);
      if (s && tokenOf(s.request) === tokenOf(req)) s.disconnect(true);
    }
    res.setHeader('Set-Cookie', cookie('')); res.json({ ok: true });
  }));
  router.post('/wallet/demo-topup', wrap((req, res) => {
    const user = store.topup(req.arenaUser.id, req.body?.amount, req.body?.requestId); notify(); res.json({ user });
  }));
  router.get('/rooms', wrap((req, res) => {
    const hidden = new Set(gameCatalog(store).filter(game => game.maintenance).map(game => game.id));
    res.json({
      rooms: store.allMatches().filter(m => m.status === 'waiting' && !hidden.has(m.game)).map(decorate),
      current: (() => { const m = store.activeMatch(req.arenaUser.id); return m ? decorate(m) : null; })(),
    });
  }));
  router.post('/rooms', wrap((req, res) => {
    if (!online(req.arenaUser.id)) throw Error('Đang kết nối tới phòng chơi. Hãy thử lại.');
    const room = store.create(req.arenaUser.id, req.body ?? {}); notify(); res.json({ room: decorate(room) });
  }));
  router.get('/rooms/:id', wrap((req, res) => {
    const m = store.match(req.params.id);
    if (!m.players.some(p => p.id === req.arenaUser.id)) return res.status(403).json({ error: 'Bạn không thuộc bàn này.' });
    res.json({ room: decorate(m) });
  }));
  router.post('/rooms/:id/join', wrap((req, res) => {
    if (!online(req.arenaUser.id) || !online(store.match(req.params.id).players[0].id)) throw Error('Người chơi cần trực tuyến để bắt đầu.');
    const room = store.join(req.arenaUser.id, req.params.id); notify(); res.json({ room: decorate(room) });
  }));
  router.post('/rooms/:id/action', wrap((req, res) => {
    const room = store.action(req.arenaUser.id, req.params.id, req.body ?? {}); notify(); res.json({ room: decorate(room) });
  }));
  router.post('/rooms/:id/cancel', wrap((req, res) => {
    const room = store.cancel(req.arenaUser.id, req.params.id); notify(); res.json({ room: decorate(room) });
  }));
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const expected = !error.code && error instanceof Error;
    if (!expected) console.error('Arena request failed:', error);
    res.status(400).json({ error: expected ? error.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.' });
  });
  app.use('/api/arena', router);
  let lastPresenceTouch = now();
  function sweep() {
    if (now() - lastPresenceTouch >= 15000) { for (const id of activityPresence.keys()) presenceTouch(store, id, now()); lastPresenceTouch = now(); }
    for (const m of store.allMatches().filter(m => m.status === 'playing')) {
      for (const p of m.players) if (!online(p.id) && !offlineSince.has(p.id)) offlineSince.set(p.id, now());
      const expired = m.players.map(p => !online(p.id) && now() - offlineSince.get(p.id) >= 60000);
      if (expired.every(Boolean)) { store.timeout(m.id, -1); notify(); }
      else for (let i = 0; i < 2; i++) if (expired[i] && online(m.players[1 - i].id)) { store.timeout(m.id, 1 - i); notify(); break; }
    }
  }
  const paymentTimer = setInterval(() => void payments.reconcile().catch(() => {}), 60000); paymentTimer.unref();
  const timer = setInterval(sweep, 1000); timer.unref();
  return { store, io, payments, sweep, close: () => { closing = true; clearInterval(timer); clearInterval(paymentTimer); payments.close(); for (const id of activityPresence.keys()) presenceTouch(store, id, now(), true); presence.clear(); activityPresence.clear(); io.close(); store.close(); } };
}
