import express from 'express';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const fields = 'id,kind,title,description,link,position,enabled,archived,width,height,version,created,updated';
export function initPromotions(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS promotions(id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',link TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0,enabled INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0,image BLOB NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,version INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL)`);
}
export function listPromotions(store, admin = false) {
  return store.db.prepare(`SELECT ${fields} FROM promotions ${admin ? '' : 'WHERE enabled=1 AND archived=0'} ORDER BY position,created,id`).all().map(row => ({ ...row, enabled: !!row.enabled, archived: !!row.archived, imageUrl: `/api/arena/promotions/${row.id}/image?v=${row.version}` }));
}
function audit(store, actor, action, id, data) {
  store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), actor, action, id, JSON.stringify(data), Date.now());
}
export async function preparePromotionImage(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) throw Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
  const png = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = buffer.subarray(0, 3).equals(Buffer.from([255,216,255]));
  const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpeg && !webp) throw Error('Ảnh phải là JPG, PNG hoặc WebP hợp lệ.');
  try {
    const image = sharp(buffer, { limitInputPixels: 20000000, failOn: 'warning' });
    const metadata = await image.metadata();
    if ((metadata.pages ?? 1) !== 1) throw Error('animated');
    const output = await image.rotate().resize({ width: 2400, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    return { image: output.data, width: output.info.width, height: output.info.height };
  } catch { throw Error('Không đọc được ảnh hoặc ảnh vượt 20 triệu điểm ảnh. Vui lòng chọn ảnh tĩnh JPG, PNG hoặc WebP khác.'); }
}
export function updatePromotion(store, actor, id, input) {
  if (!input || !['banner', 'event'].includes(input.kind) || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 100 || typeof input.description !== 'string' || input.description.length > 500 || typeof input.link !== 'string' || input.link.length > 1000 || typeof input.enabled !== 'boolean' || !Number.isSafeInteger(input.position) || input.position < 0 || input.position > 9999 || !Number.isSafeInteger(input.version)) throw Error('Kiểm tra tiêu đề, loại ảnh, thứ tự (0–9999) và nội dung.');
  const link = input.link.trim();
  if (link) { let url; try { url = new URL(link); } catch { throw Error('Liên kết phải là địa chỉ HTTPS đầy đủ.'); } if (url.protocol !== 'https:' || url.username || url.password) throw Error('Liên kết phải dùng HTTPS và không chứa thông tin đăng nhập.'); }
  return store.transaction(() => {
    const old = store.db.prepare(`SELECT ${fields} FROM promotions WHERE id=?`).get(id);
    if (!old || old.archived) throw Error('Ảnh không tồn tại hoặc đang lưu trữ.');
    if (old.version !== input.version) throw Error('Ảnh đã thay đổi. Hãy tải lại danh sách trước khi lưu.');
    store.db.prepare('UPDATE promotions SET kind=?,title=?,description=?,link=?,position=?,enabled=?,version=version+1,updated=? WHERE id=?').run(input.kind, input.title.trim(), input.description.trim(), link, input.position, Number(input.enabled), Date.now(), id);
    audit(store, actor, 'promotion_update', id, { kind: input.kind, title: input.title.trim(), enabled: input.enabled, position: input.position });
    return listPromotions(store, true);
  });
}
export function installPromotions(app, router, store, authenticate, notify) {
  app.get('/api/arena/promotions', (req, res) => res.set('Cache-Control', 'no-store').json({ items: listPromotions(store) }));
  app.get('/api/arena/promotions/:id/image', (req, res) => {
    const row = store.db.prepare('SELECT image,enabled,archived FROM promotions WHERE id=?').get(req.params.id);
    if (!row || ((!row.enabled || row.archived) && !authenticate(req)?.is_admin)) return res.sendStatus(404);
    res.set({ 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; sandbox" }).send(Buffer.from(row.image));
  });
  const raw = express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb' });
  const parseImage = (req, res, next) => raw(req, res, err => err ? res.status(413).json({ error: 'Ảnh quá lớn. Dung lượng tối đa là 5 MB.' }) : next());
  let processing = 0;
  router.get('/admin/promotions', (req, res) => res.json({ items: listPromotions(store, true) }));
  router.post('/admin/promotions/upload', parseImage, async (req, res, next) => {
    if (!['banner', 'event'].includes(req.query.kind)) return res.status(400).json({ error: 'Chọn loại banner hoặc sự kiện.' });
    if (processing >= 2) return res.status(429).json({ error: 'Đang xử lý ảnh khác. Vui lòng thử lại sau.' });
    processing++;
    try {
      const image = await preparePromotionImage(req.body), id = randomUUID(), now = Date.now();
      store.transaction(() => {
        const usage = store.db.prepare('SELECT COUNT(*) n,COALESCE(SUM(length(image)),0) bytes FROM promotions').get();
        if (usage.n >= 100 || usage.bytes + image.image.length > 200 * 1024 * 1024) throw Error('Thư viện đã đạt giới hạn 100 ảnh hoặc 200 MB.');
        store.db.prepare('INSERT INTO promotions(id,kind,title,image,width,height,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id, req.query.kind, req.query.kind === 'banner' ? 'Banner mới' : 'Sự kiện mới', image.image, image.width, image.height, now, now);
        audit(store, req.arenaUser.id, 'promotion_upload', id, { kind: req.query.kind, width: image.width, height: image.height });
      });
      notify(); res.json({ items: listPromotions(store, true), id });
    } catch (err) { next(err); } finally { processing--; }
  });
  router.post('/admin/promotions/:id', (req, res, next) => {
    try { const items = updatePromotion(store, req.arenaUser.id, req.params.id, req.body); notify(); res.json({ items }); } catch (err) { next(err); }
  });
  router.post('/admin/promotions/:id/archive', (req, res, next) => {
    try {
      const { archived, version } = req.body ?? {};
      if (typeof archived !== 'boolean' || !Number.isSafeInteger(version)) throw Error('Thông tin lưu trữ không hợp lệ.');
      store.transaction(() => {
        const changed = store.db.prepare('UPDATE promotions SET archived=?,enabled=0,version=version+1,updated=? WHERE id=? AND version=?').run(Number(archived), Date.now(), req.params.id, version);
        if (!changed.changes) throw Error('Ảnh đã thay đổi hoặc không còn tồn tại. Hãy tải lại danh sách.');
        audit(store, req.arenaUser.id, 'promotion_archive', req.params.id, { archived });
      });
      notify(); res.json({ items: listPromotions(store, true) });
    } catch (err) { next(err); }
  });
}
