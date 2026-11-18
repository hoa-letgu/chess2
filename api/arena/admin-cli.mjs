import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ArenaStore } from './store.js';
const [action, username] = process.argv.slice(2);
if (!['grant', 'revoke'].includes(action) || !username) {
  console.error('Cách dùng: npm run admin -- grant <username> hoặc revoke <username>');
  process.exitCode = 1;
} else {
  const store = new ArenaStore(process.env.ARENA_DB_PATH ?? fileURLToPath(new URL('../data/arena.sqlite', import.meta.url)));
  try {
    const user = store.db.prepare('SELECT id,username FROM users WHERE username=?').get(username);
    if (!user) throw Error('Tài khoản chưa tồn tại. Đăng ký tài khoản trong game trước.');
    store.transaction(() => {
      store.db.prepare('UPDATE users SET is_admin=? WHERE id=?').run(Number(action === 'grant'), user.id);
      store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), user.id, `cli_${action}`, user.id, 'Thay đổi quyền bằng công cụ quản trị máy chủ.', Date.now());
    });
    console.log(`${action === 'grant' ? 'Đã cấp' : 'Đã thu hồi'} quyền quản trị: ${user.username}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { store.close(); }
}
