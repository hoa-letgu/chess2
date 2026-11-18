import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ArenaStore } from './store.js';
import { initialState, applyGameMove, GAME_NAMES } from './games.js';
import { publicGameState, NATIVE_NAMES } from './native-games.js';
import * as chem from './rules/cochem.js';
import * as up from './rules/coup.js';
import * as shogi from './rules/shogi.js';
import * as checkers from './rules/checkers.js';

export function firstCommand(game, state) {
  const n = state.native;
  if (game === 'ludo' || game === 'tycoon') return { op: 'roll' };
  if (game === 'oanquan') return { op: 'sow', pit: 0, direction: 1 };
  if (game === 'cochem') return { op: 'step', ...chem.legalMoves(n)[0] };
  if (game === 'coup') return { op: 'step', ...up.legalUpMoves(n)[0] };
  if (game === 'shogi') { const m = shogi.legalMoves(n)[0]; return { op: 'step', from: m.from, to: m.to, promote: m.promote }; }
  if (game === 'checkers') { const m = checkers.legalSteps(n)[0]; return { op: 'step', from: m.from, to: m.to }; }
  return { op: 'place', to: 19 };
}
function fixture(t, game, stake = 100) {
  const s = new ArenaStore(':memory:'); t.after(() => s.close());
  const a = s.register('first', 'password123').user, b = s.register('second', 'password123').user;
  s.topup(a.id, 1000, 'first-topup-request'); s.topup(b.id, 1000, 'second-topup-request');
  const waiting = s.create(a.id, { name: game, game, stake });
  return { s, a, b, m: s.join(b.id, waiting.id) };
}
for (const game of Object.keys(NATIVE_NAMES)) {
  test(`${game}: two humans share server state, reject outsiders/stale/forged commands and settle once`, t => {
    const { s, a, b, m } = fixture(t, game);
    assert.ok(GAME_NAMES[game]); assert.equal(m.state.turn, 0);
    if (m.state.native.players) assert.ok(m.state.native.players.every(p => !p.bot));
    const action = { type: 'move', version: m.version, ...firstCommand(game, m.state) }, snapshot = JSON.stringify(m.state);
    assert.throws(() => s.action(b.id, m.id, action), /lượt/);
    assert.throws(() => s.action('outsider', m.id, action));
    for (const forged of [{ dice: [6, 6] }, { winner: 0 }, { state: {} }, { reveal: 'R' }]) assert.throws(() => s.action(a.id, m.id, { ...action, ...forged }));
    assert.equal(JSON.stringify(s.match(m.id).state), snapshot);
    const moved = s.action(a.id, m.id, action);
    assert.equal(moved.version, m.version + 1); assert.notEqual(JSON.stringify(moved.state), snapshot);
    assert.throws(() => s.action(a.id, m.id, action), /thay đổi/);
    assert.equal(s.publicUser(a.id).balance, 900); assert.equal(s.publicUser(b.id).balance, 900);
    const final = s.action(b.id, m.id, { type: 'resign', version: moved.version });
    assert.equal(final.result.winner, 0); assert.equal(s.publicUser(a.id).balance, 1100); assert.equal(s.publicUser(b.id).balance, 900);
    assert.throws(() => s.action(b.id, m.id, { type: 'resign', version: final.version }));
    assert.equal(s.ledger(a.id).filter(e => e.kind === 'win_payout').length, 1);
  });
}
test('server rules are generated from the exact offline source files', () => {
  const sources = { ludo: 'Ludo/ludoEngine.ts', oanquan: 'OAnQuan/engine.ts', cochem: 'CoChem/engine.ts', coup: 'CoUp/engine.ts', tycoon: 'Tycoon/engine.ts', shogi: 'Shogi/engine.ts', checkers: 'Checkers/engine.ts', othello: 'Othello/engine.ts' };
  for (const [game, path] of Object.entries(sources)) {
    const hash = createHash('sha256').update(readFileSync(new URL(`../../ui_chess/src/games/${path}`, import.meta.url))).digest('hex');
    assert.ok(readFileSync(new URL(`./rules/${game}.js`, import.meta.url), 'utf8').startsWith(`// Generated from ${path}. SHA256: ${hash}`));
  }
});
test('Othello forced pass and partial-board ending settle using server-derived score', t => {
  const { s, a, b, m } = fixture(t, 'othello');
  m.state.native.board = Array(64).fill(0); m.state.native.board[0] = null; m.state.native.board[2] = null; m.state.native.board[1] = 1; m.state.native.board[3] = 1; s.save(m);
  const passed = s.action(a.id, m.id, { type: 'move', version: m.version, op: 'place', to: 2 });
  assert.equal(passed.state.turn, 0); assert.equal(passed.state.native.passed, 1); assert.equal(passed.status, 'playing');
  assert.throws(() => s.action(b.id, m.id, { type: 'move', version: passed.version, op: 'place', to: 0 }), /lượt/);
  const ended = s.action(a.id, m.id, { type: 'move', version: passed.version, op: 'place', to: 0 });
  assert.equal(ended.result.winner, 0); assert.equal(s.publicUser(a.id).balance, 1100);
});
test('Ludo maps the opposite color id 2 to player seat 1 when paying the pot', t => {
  const { s, a, b, m } = fixture(t, 'ludo');
  const n = m.state.native; n.turn = 1; m.state.turn = 1; n.phase = 'choose'; n.dice = 1; n.players[1].tokens = [56, 56, 56, 55]; s.save(m);
  const ended = s.action(b.id, m.id, { type: 'move', version: m.version, op: 'token', token: 3 });
  assert.equal(n.players[1].id, 2); assert.equal(ended.result.winner, 1);
  assert.equal(s.publicUser(a.id).balance, 900); assert.equal(s.publicUser(b.id).balance, 1100);
});
test('Tycoon chance deck is private and tied round-limit results refund both stakes', t => {
  const { s, a, b, m } = fixture(t, 'tycoon');
  assert.ok(m.state.native.deck.length > 0);
  assert.deepEqual(publicGameState('tycoon', m.state).native.deck, []);
  assert.ok(m.state.native.deck.length > 0);
  m.state.turn = 1; Object.assign(m.state.native, { turn: 1, phase: 'manage', round: 1, maxRounds: 1 }); s.save(m);
  const ended = s.action(b.id, m.id, { type: 'move', version: m.version, op: 'end' });
  assert.equal(ended.result.winner, -1); assert.equal(s.publicUser(a.id).balance, 1000); assert.equal(s.publicUser(b.id).balance, 1000);
});
test('checkers enforces a multi-capture before changing turn and resolves victory', () => {
  const s = initialState('checkers'), n = s.native;
  n.board.fill(null); n.board[42] = { side: 0, king: false }; n.board[33] = { side: 1, king: false }; n.board[17] = { side: 1, king: false };
  const first = applyGameMove('checkers', s, { op: 'step', from: 42, to: 24 });
  assert.equal(first.state.turn, 0); assert.equal(first.state.native.chain, 24);
  assert.throws(() => applyGameMove('checkers', first.state, { op: 'step', from: 24, to: 16 }));
  const last = applyGameMove('checkers', first.state, { op: 'step', from: 24, to: 10 });
  assert.equal(last.winner, 0);
});
test('Shogi refuses unearned hand drops and coup only reveals on a legal server move', () => {
  assert.throws(() => applyGameMove('shogi', initialState('shogi'), { op: 'drop', kind: 'R', to: 40 }));
  assert.throws(() => applyGameMove('shogi', initialState('shogi'), { op: 'step', from: 54, to: 45, promote: true }));
  const s = initialState('coup'), move = firstCommand('coup', s), next = applyGameMove('coup', s, move);
  assert.equal(s.native.board[move.from].kind, null); assert.ok(next.state.native.board[move.to].kind);
});
