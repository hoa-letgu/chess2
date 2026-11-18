import { randomUUID } from 'node:crypto';
import { GAME_NAMES } from './games.js';
const CATALOG_NAMES = { ...GAME_NAMES, cothe: 'Cờ thế' };

export function initGameMaintenance(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS game_maintenance(game TEXT PRIMARY KEY,maintenance INTEGER NOT NULL CHECK(maintenance IN (0,1)),message TEXT NOT NULL,version INTEGER NOT NULL,updated INTEGER NOT NULL)`);
}
export function gameCatalog(store) {
  const rows = new Map(store.db.prepare('SELECT * FROM game_maintenance').all().map(row => [row.game, row]));
  return Object.entries(CATALOG_NAMES).map(([id, name]) => ({ id, name, mode: 'online', maintenance: !!rows.get(id)?.maintenance, message: rows.get(id)?.message ?? '', version: rows.get(id)?.version ?? 0, updated: rows.get(id)?.updated ?? null }));
}
export function assertGameAvailable(store, game) {
  if (store.db.prepare('SELECT maintenance FROM game_maintenance WHERE game=?').get(game)?.maintenance) throw Error('Trò chơi đang bảo trì. Vui lòng chọn trò khác hoặc quay lại sau.');
}
export function updateGameMaintenance(store, actor, game, input) {
  if (!Object.hasOwn(CATALOG_NAMES, game) || typeof input?.maintenance !== 'boolean' || typeof input.message !== 'string' || input.message.length > 300 || !Number.isSafeInteger(input.version) || input.version < 0) throw Error('Cấu hình bảo trì không hợp lệ.');
  return store.transaction(() => {
    if (!store.db.prepare('SELECT is_admin FROM users WHERE id=?').get(actor)?.is_admin) throw Error('Cần quyền quản trị.');
    const previous = gameCatalog(store).find(row => row.id === game);
    if (previous.version !== input.version) throw Error('Cấu hình đã thay đổi. Hãy tải lại danh sách trò chơi.');
    const now = Date.now(), message = input.message.trim();
    store.db.prepare(`INSERT INTO game_maintenance VALUES(?,?,?,?,?) ON CONFLICT(game) DO UPDATE SET maintenance=excluded.maintenance,message=excluded.message,version=excluded.version,updated=excluded.updated`).run(game, Number(input.maintenance), message, previous.version + 1, now);
    store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), actor, 'game_maintenance', game, JSON.stringify({ previous: previous.maintenance, maintenance: input.maintenance, message }), now);
    return gameCatalog(store);
  });
}
