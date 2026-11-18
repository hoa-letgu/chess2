import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArenaStore } from './store.js';
import { preparePromotionImage, listPromotions } from './promotions.js';
import { installArena } from './server.js';

const image = (format = 'png') => sharp({ create: { width: 160, height: 60, channels: 3, background: '#174f42' } }).toFormat(format).toBuffer();
test('image processing decodes JPG/PNG/WebP, strips metadata and refuses spoofed, oversized or corrupt files', async () => {
  for (const format of ['png', 'jpeg', 'webp']) {
    const processed = await preparePromotionImage(await image(format)), metadata = await sharp(processed.image).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 160); assert.equal(metadata.height, 60); assert.equal(metadata.exif, undefined);
  }
  for (const data of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), Buffer.from('<html>bad</html>'), Buffer.alloc(5 * 1024 * 1024 + 1), Buffer.from([137,80,78,71,13,10,26,10,1,2])]) await assert.rejects(preparePromotionImage(data));
  const tooManyPixels = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(preparePromotionImage(tooManyPixels), /20 triệu/);
});
async function harness(path = ':memory:') {
  const app = express(), server = createServer(app), arena = installArena(app, server, { dbPath: path });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const admin = arena.store.register('media_admin', 'password123').user, player = arena.store.register('media_player', 'password123').user;
  arena.store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.id);
  const base = `http://127.0.0.1:${server.address().port}/api/arena`;
  async function req(url, user, body, type = 'application/json', origin) {
    const token = user ? arena.store.newSession(user.id).token : '';
    const r = await fetch(base + url, { headers: { Cookie: `arena_session=${token}`, 'Content-Type': type, 'X-Arena-Request': '1', ...(origin ? { Origin: origin } : {}) }, ...(body === undefined ? {} : { method: 'POST', body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }) });
    return { status: r.status, headers: r.headers, data: r.headers.get('content-type')?.includes('application/json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
  }
  return { arena, admin, player, req };
}
test('admin uploads drafts, publishes ordered banners/events, updates safely and archives/restores without deleting images', async t => {
  const { arena, admin, player, req } = await harness(); t.after(() => arena.close());
  const png = await image();
  assert.equal((await req('/admin/promotions/upload?kind=banner', null, png, 'image/png')).status, 401);
  assert.equal((await req('/admin/promotions/upload?kind=banner', player, png, 'image/png')).status, 403);
  assert.equal((await req('/admin/promotions/upload?kind=banner', admin, png, 'image/png', 'https://evil.example')).status, 403);
  assert.equal((await req('/admin/promotions/upload?kind=invalid', admin, png, 'image/png')).status, 400);
  assert.equal((await req('/admin/promotions/upload?kind=banner', admin, Buffer.from('not image'), 'image/png')).status, 400);
  assert.equal((await req('/admin/promotions/upload?kind=banner', admin, Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png')).status, 413);
  const uploaded = await req('/admin/promotions/upload?kind=banner', admin, png, 'image/png'); assert.equal(uploaded.status, 200);
  let item = uploaded.data.items[0]; assert.equal(item.enabled, false); assert.equal((await req('/promotions')).data.items.length, 0);
  assert.equal((await req(`/promotions/${item.id}/image`)).status, 404);
  assert.equal((await req(`/promotions/${item.id}/image`, admin)).headers.get('content-type'), 'image/webp');
  assert.equal((await req(`/admin/promotions/${item.id}`, admin, { ...item, enabled: true, link: 'javascript:alert(1)' })).status, 400);
  assert.equal((await req(`/admin/promotions/${item.id}`, admin, { ...item, enabled: true, link: 'https://user:secret@example.com/' })).status, 400);
  const published = await req(`/admin/promotions/${item.id}`, admin, { ...item, enabled: true, title: 'Giải cờ cuối tuần', link: 'https://example.com/event', position: 10 }); assert.equal(published.status, 200);
  assert.equal((await req(`/admin/promotions/${item.id}`, admin, { ...item, title: 'Stale' })).status, 400);
  item = published.data.items[0]; const publicItem = (await req('/promotions')).data.items[0];
  assert.equal(publicItem.title, 'Giải cờ cuối tuần'); assert.equal(Object.hasOwn(publicItem, 'image'), false);
  const publicImage = await req(`/promotions/${item.id}/image`); assert.equal(publicImage.status, 200); assert.equal(publicImage.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await sharp(publicImage.data).metadata()).width, 160);
  const eventUpload = await req('/admin/promotions/upload?kind=event', admin, png, 'image/png'), event = eventUpload.data.items.find(i => i.id === eventUpload.data.id);
  await req(`/admin/promotions/${event.id}`, admin, { ...event, enabled: true, position: 1 });
  assert.deepEqual((await req('/promotions')).data.items.map(i => i.kind), ['event', 'banner']);
  const archived = await req(`/admin/promotions/${item.id}/archive`, admin, { archived: true, version: item.version }); assert.equal(archived.status, 200);
  item = archived.data.items.find(i => i.id === item.id); assert.equal(item.archived, true); assert.equal((await req(`/promotions/${item.id}/image`)).status, 404);
  const restored = await req(`/admin/promotions/${item.id}/archive`, admin, { archived: false, version: item.version }); assert.equal(restored.status, 200);
  assert.equal(restored.data.items.find(i => i.id === item.id).enabled, false);
  assert.ok(arena.store.db.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action LIKE 'promotion_%'").get().n >= 6);
});
test('uploaded image and settings survive SQLite restart', async () => {
  const path = join(tmpdir(), `arena-media-${randomUUID()}.sqlite`), { arena, admin, req } = await harness(path);
  let id;
  try {
    const upload = await req('/admin/promotions/upload?kind=event', admin, await image(), 'image/png'); id = upload.data.id;
    const item = upload.data.items[0]; await req(`/admin/promotions/${id}`, admin, { ...item, enabled: true, title: 'Sự kiện đã lưu' });
  } finally { arena.close(); }
  const store = new ArenaStore(path);
  try {
    assert.equal(listPromotions(store)[0].title, 'Sự kiện đã lưu');
    assert.equal((await sharp(Buffer.from(store.db.prepare('SELECT image FROM promotions WHERE id=?').get(id).image)).metadata()).format, 'webp');
  } finally { store.close(); for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file); }
});
