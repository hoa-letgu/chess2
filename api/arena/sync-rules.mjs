import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const ruleSources = {
  ludo: 'Ludo/ludoEngine.ts', oanquan: 'OAnQuan/engine.ts', cochem: 'CoChem/engine.ts',
  coup: 'CoUp/engine.ts', tycoon: 'Tycoon/engine.ts', shogi: 'Shogi/engine.ts',
  cothe: 'CoThe/engine.ts', checkers: 'Checkers/engine.ts', othello: 'Othello/engine.ts',
};
mkdirSync(new URL('./rules/', import.meta.url), { recursive: true });
for (const [game, path] of Object.entries(ruleSources)) {
  const source = new URL(`../../ui_chess/src/games/${path}`, import.meta.url), target = new URL(`./rules/${game}.js`, import.meta.url);
  // Generated JS ships with a standalone API deployment; the complete checkout
  // additionally refreshes it whenever the canonical offline rules change.
  if (!existsSync(source)) { if (!existsSync(target)) throw Error(`Missing rules: ${game}`); continue; }
  const text = readFileSync(source, 'utf8'), hash = createHash('sha256').update(text).digest('hex');
  const output = `// Generated from ${path}. SHA256: ${hash}\n` + stripTypeScriptTypes(text, { mode: 'strip' });
  if (!existsSync(target) || readFileSync(target, 'utf8') !== output) writeFileSync(target, output);
}
