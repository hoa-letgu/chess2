import { randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { settings, environment } from './payment-config.js';

export const CREDENTIAL_FIELDS = {
  momo: ['PARTNER_CODE', 'ACCESS_KEY', 'SECRET_KEY'],
  zalopay: ['APP_ID', 'KEY1', 'KEY2'],
  shopeepay: ['CLIENT_ID', 'SECRET_KEY', 'MERCHANT_ID', 'STORE_ID'],
  payos: ['CLIENT_ID', 'API_KEY', 'CHECKSUM_KEY'],
  paypal: ['CLIENT_ID', 'CLIENT_SECRET', 'WEBHOOK_ID', 'VND_PER_USD'],
};
function masterKey(store, env, create = false) {
  if (env.PAYMENT_CONFIG_KEY) {
    const key = Buffer.from(env.PAYMENT_CONFIG_KEY, /^[a-f\d]{64}$/i.test(env.PAYMENT_CONFIG_KEY) ? 'hex' : 'base64');
    if (key.length !== 32) throw Error('Khóa mã hóa cấu hình cần đủ 32 byte.');
    return key;
  }
  if (store.databasePath === ':memory:') { store._paymentConfigKey ??= randomBytes(32); return store._paymentConfigKey; }
  const file = join(dirname(resolve(store.databasePath)), 'payment-config.key');
  let key;
  try { key = readFileSync(file); }
  catch (error) {
    if (error.code !== 'ENOENT' || !create) throw error;
    key = randomBytes(32);
    try { writeFileSync(file, key, { flag: 'wx', mode: 0o600 }); }
    catch (e) { if (e.code !== 'EEXIST') throw e; key = readFileSync(file); }
  }
  if (key.length !== 32) throw Error('Khóa mã hóa cấu hình không hợp lệ.');
  return key;
}
function decrypt(store, row, env) {
  try {
    const decipher = createDecipheriv('aes-256-gcm', masterKey(store, env), Buffer.from(row.iv, 'hex'));
    decipher.setAAD(Buffer.from(`${row.gateway}:${row.environment}`)); decipher.setAuthTag(Buffer.from(row.tag, 'hex'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(row.ciphertext, 'hex')), decipher.final()]).toString('utf8'));
  } catch { throw Error('Không thể giải mã cấu hình thanh toán. Kiểm tra khóa mã hóa của máy chủ.'); }
}
export function paymentEnv(store, base = process.env) {
  const result = { ...base }, original = store.paymentEnvironment ?? base.PAYMENT_ENV ?? 'sandbox';
  // Unprefixed deployment keys belong only to their original environment.
  for (const [gateway, keys] of Object.entries(CREDENTIAL_FIELDS)) for (const key of keys) {
    const name = `${gateway.toUpperCase()}_${key}`, scoped = `${gateway.toUpperCase()}_${original.toUpperCase()}_${key}`;
    if (result[name] && !result[scoped]) result[scoped] = result[name]; delete result[name];
  }
  for (const row of store.db.prepare('SELECT * FROM payment_credentials').all()) {
    for (const [key, value] of Object.entries(decrypt(store, row, base))) result[`${row.gateway.toUpperCase()}_${row.environment.toUpperCase()}_${key}`] = value;
  }
  result.PAYMENT_ENV = environment(store);
  result.PAYMENT_PUBLIC_URL = settings(store).publicUrl || base.PAYMENT_PUBLIC_URL;
  return result;
}
export function credentialMetadata(store, base = process.env) {
  const source = paymentEnv(store, base);
  return Object.entries(CREDENTIAL_FIELDS).flatMap(([gateway, keys]) => ['sandbox', 'live'].map(e => ({ gateway, environment: e, fields: keys.map(key => ({ key, secret: /KEY|SECRET/.test(key), configured: !!source[`${gateway.toUpperCase()}_${e.toUpperCase()}_${key}`] })) })));
}
export function saveCredentials(store, actor, input, base = process.env) {
  const keys = CREDENTIAL_FIELDS[input?.gateway];
  if (!keys || !['sandbox', 'live'].includes(input.environment) || !input.values || typeof input.values !== 'object' || Array.isArray(input.values) || !Array.isArray(input.clear) || Object.keys(input.values).some(k => !keys.includes(k)) || input.clear.some(k => !keys.includes(k))) throw Error('Thông tin cổng thanh toán không hợp lệ.');
  for (const value of Object.values(input.values)) if (typeof value !== 'string' || value.length > 4000 || /[\r\n\0]/.test(value)) throw Error('Giá trị cấu hình không hợp lệ.');
  return store.transaction(() => {
    const row = store.db.prepare('SELECT * FROM payment_credentials WHERE gateway=? AND environment=?').get(input.gateway, input.environment);
    const next = row ? decrypt(store, row, base) : {};
    for (const key of input.clear) delete next[key];
    for (const [key, value] of Object.entries(input.values)) if (value.trim()) next[key] = value.trim();
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', masterKey(store, base, true), iv);
    cipher.setAAD(Buffer.from(`${input.gateway}:${input.environment}`));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(next), 'utf8'), cipher.final()]);
    store.db.prepare('INSERT INTO payment_credentials VALUES(?,?,?,?,?,?) ON CONFLICT(gateway,environment) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,tag=excluded.tag,updated=excluded.updated').run(input.gateway, input.environment, ciphertext.toString('hex'), iv.toString('hex'), cipher.getAuthTag().toString('hex'), Date.now());
    const changedKeys = [...new Set([...input.clear, ...Object.keys(input.values).filter(k => input.values[k].trim())])];
    store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?)').run(randomUUID(), actor, 'payment_credentials', `${input.gateway}:${input.environment}`, JSON.stringify({ changedKeys }), Date.now());
    return { ok: true };
  });
}
