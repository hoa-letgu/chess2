import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArenaStore } from './store.js';
import { initialState, applyGameMove, goScore } from './games.js';

function fixture(t, balance = 1000) {
  const s = new ArenaStore(':memory:'); t.after(() => s.close());
  const a = s.register('player_a', 'password123').user, b = s.register('player_b', 'password123').user;
  if (balance) { s.topup(a.id, balance, 'aaaaaaaaaaaaaaaa'); s.topup(b.id, balance, 'bbbbbbbbbbbbbbbb'); }
  return { s, a, b };
}
function start(f, game = 'chess', stake = 100) {
  const m = f.s.create(f.a.id, { name: 'Test', game, stake }); return f.s.join(f.b.id, m.id);
}
test('passwords are hashed; authentication, session expiration and logout work', t => {
  const { s } = fixture(t, 0), login = s.login('PLAYER_A', 'password123');
  assert.equal(s.authenticate(login.token).username, 'player_a');
  assert.throws(() => s.login('player_a', 'incorrect'));
  assert.throws(() => s.register('PLAYER_A', 'password123'));
  assert.throws(() => s.register('short', '123'));
  assert.ok(!s.db.prepare('SELECT password FROM users LIMIT 1').get().password.includes('password123'));
  s.logout(login.token); assert.equal(s.authenticate(login.token), null);
  const session = s.login('player_a', 'password123'); s.db.exec('UPDATE sessions SET expires=0'); assert.equal(s.authenticate(session.token), null);
});
test('demo top-up is idempotent and validates amounts, keys and daily limits', t => {
  const { s, a } = fixture(t, 0);
  s.topup(a.id, 1000, 'request-0000000001'); s.topup(a.id, 1000, 'request-0000000001');
  assert.equal(s.publicUser(a.id).balance, 1000); assert.equal(s.ledger(a.id).length, 1);
  assert.throws(() => s.topup(a.id, 5000, 'request-0000000001'));
  assert.throws(() => s.topup(a.id, -1000, 'request-0000000002'));
  assert.throws(() => s.topup(a.id, 1000, 'bad'));
  for (let i = 0; i < 9; i++) s.topup(a.id, 10000, `daily-request-${i}-0000`);
  s.topup(a.id, 5000, 'daily-request-last1');
  assert.throws(() => s.topup(a.id, 10000, 'daily-request-last2'));
});
test('joining holds both stakes atomically, winning pays the pot exactly once', t => {
  const f = fixture(t), { s, a, b } = f; let m = start(f);
  assert.equal(s.publicUser(a.id).balance, 900); assert.equal(s.publicUser(b.id).balance, 900);
  assert.equal(s.join(b.id, m.id).version, m.version); // retry joining is safe
  m = s.action(b.id, m.id, { type: 'resign', version: m.version });
  assert.equal(s.publicUser(a.id).balance, 1100); assert.equal(s.publicUser(b.id).balance, 900);
  assert.throws(() => s.action(b.id, m.id, { type: 'resign', version: m.version }));
  s.timeout(m.id, 0); assert.equal(s.publicUser(a.id).balance, 1100);
  assert.equal(s.ledger(a.id).filter(x => x.kind === 'win_payout').length, 1);
});
test('failed second hold rolls back the first hold and room transition', t => {
  const f = fixture(t), { s, a, b } = f;
  const m = s.create(a.id, { name: 'Test', game: 'chess', stake: 100 });
  s.db.prepare('UPDATE users SET balance=0 WHERE id=?').run(b.id);
  assert.throws(() => s.join(b.id, m.id));
  assert.equal(s.publicUser(a.id).balance, 1000); assert.equal(s.match(m.id).status, 'waiting');
  assert.equal(s.match(m.id).players.length, 1); assert.equal(s.ledger(a.id).length, 1);
});
test('draw requires opponent offer and returns both holds', t => {
  const f = fixture(t), { s, a, b } = f; let m = start(f);
  assert.throws(() => s.action(a.id, m.id, { type: 'draw-accept', version: m.version }));
  m = s.action(a.id, m.id, { type: 'draw-offer', version: m.version });
  assert.throws(() => s.action(a.id, m.id, { type: 'draw-accept', version: m.version }));
  m = s.action(b.id, m.id, { type: 'draw-accept', version: m.version });
  assert.equal(m.result.winner, -1); assert.equal(s.publicUser(a.id).balance, 1000); assert.equal(s.publicUser(b.id).balance, 1000);
});
test('free tables create no wallet entries and outsiders cannot act', t => {
  const f = fixture(t, 0), { s, a, b } = f; const m = start(f, 'gomoku', 0);
  const c = s.register('outsider', 'password123').user;
  assert.throws(() => s.action(c.id, m.id, { type: 'resign', version: m.version }));
  s.action(b.id, m.id, { type: 'resign', version: m.version });
  assert.equal(s.publicUser(a.id).balance, 0); assert.equal(s.ledger(a.id).length, 0);
});
test('invalid stake, bot games, duplicate active rooms and stale actions are rejected', t => {
  const f = fixture(t), { s, a, b } = f;
  for (const stake of [-1, 0.5, '100', 100001]) assert.throws(() => s.create(a.id, { name: 'Test', game: 'chess', stake }));
  assert.throws(() => s.create(a.id, { name: 'Test', game: 'bot', stake: 0 }));
  const m = start(f);
  assert.throws(() => s.create(a.id, { name: 'Test2', game: 'chess', stake: 0 }));
  assert.throws(() => s.action(b.id, m.id, { type: 'move', version: m.version, from: [1, 0], to: [2, 0] }));
  assert.throws(() => s.action(a.id, m.id, { type: 'resign', version: 0 }));
});
test('checkmate is derived from legal server moves and pays the winner', t => {
  const f = fixture(t), { s, a, b } = f; let m = start(f);
  for (const [id, from, to] of [[a.id, [6, 5], [5, 5]], [b.id, [1, 4], [3, 4]], [a.id, [6, 6], [4, 6]], [b.id, [0, 3], [4, 7]]]) m = s.action(id, m.id, { type: 'move', version: m.version, from, to });
  assert.equal(m.status, 'finished'); assert.equal(m.result.winner, 1); assert.equal(s.publicUser(b.id).balance, 1100);
});
test('chess rejects illegal moves and detects history-based repetition', () => {
  let state = initialState('chess');
  assert.throws(() => applyGameMove('chess', state, { from: [6, 0], to: [3, 0] }));
  let result;
  for (let i = 0; i < 2; i++) for (const [from, to] of [[[7, 6], [5, 5]], [[0, 6], [2, 5]], [[5, 5], [7, 6]], [[2, 5], [0, 6]]]) { result = applyGameMove('chess', state, { from, to }); state = result.state; }
  assert.equal(result.winner, -1);
});
test('gomoku derives a five-stone victory; bounds and occupied cells are rejected', () => {
  let state = initialState('gomoku'), result;
  assert.throws(() => applyGameMove('gomoku', state, { to: [-1, 0] }));
  for (let c = 0; c < 4; c++) for (const r of [0, 1]) { result = applyGameMove('gomoku', state, { to: [r, c] }); state = result.state; }
  result = applyGameMove('gomoku', state, { to: [0, 4] }); assert.equal(result.winner, 0);
  assert.throws(() => applyGameMove('gomoku', result.state, { to: [0, 4] }));
});
test('xiangqi validates horse legs, cannon screens, river and self-check', () => {
  const s = initialState('xiangqi');
  assert.throws(() => applyGameMove('xiangqi', s, { from: [9, 0], to: [5, 0] }));
  assert.throws(() => applyGameMove('xiangqi', s, { from: [9, 1], to: [8, 3] })); // blocked horse leg
  assert.throws(() => applyGameMove('xiangqi', s, { from: [6, 0], to: [6, 1] })); // soldier before river
  assert.equal(applyGameMove('xiangqi', s, { from: [7, 1], to: [0, 1] }).state.board[0][1], 'C'); // one screen
  const open = initialState('xiangqi'); open.board = Array.from({ length: 10 }, () => Array(9).fill(null));
  open.board[9][4] = 'G'; open.board[0][4] = 'g'; open.board[5][4] = 'R';
  assert.throws(() => applyGameMove('xiangqi', open, { from: [5, 4], to: [5, 3] })); // facing generals
});
test('go captures, forbids suicide and superko, and scores two passes with komi', () => {
  let s = initialState('go', 9);
  assert.throws(() => initialState('go', 100)); assert.throws(() => applyGameMove('go', s, { to: [100, 0] }));
  s.board[0][0] = 'white'; s.board[1][0] = 'black';
  const capture = applyGameMove('go', s, { to: [0, 1] }); assert.equal(capture.state.board[0][0], null);
  const suicide = initialState('go', 9); suicide.board[0][1] = 'white'; suicide.board[1][0] = 'white';
  assert.throws(() => applyGameMove('go', suicide, { to: [0, 0] }));
  const repeated = initialState('go', 9), next = applyGameMove('go', repeated, { to: [0, 0] }); repeated.history.push(next.state.history.at(-1));
  assert.throws(() => applyGameMove('go', repeated, { to: [0, 0] }));
  s = applyGameMove('go', initialState('go', 9), { pass: true }).state;
  const end = applyGameMove('go', s, { pass: true }); assert.equal(end.winner, 1); assert.deepEqual(end.state.score, [0, 6.5]);
  assert.deepEqual(goScore([['black', null], [null, null]]), [4, 6.5]);
});
test('timeout settles once; both disconnected refund; persistence survives reopening', t => {
  const f = fixture(t), { s, a, b } = f; let m = start(f);
  s.timeout(m.id, 1); s.timeout(m.id, 1); assert.equal(s.publicUser(b.id).balance, 1100);
  m = start(f); s.timeout(m.id, -1); assert.equal(s.publicUser(a.id).balance, 900); assert.equal(s.publicUser(b.id).balance, 1100);
  const dir = mkdtempSync(join(tmpdir(), 'arena-test-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'test.sqlite'), first = new ArenaStore(path), session = first.register('persistent', 'password123');
  first.topup(session.user.id, 5000, 'persist-request-0001'); first.close();
  const second = new ArenaStore(path); assert.equal(second.authenticate(session.token).balance, 5000); assert.equal(second.ledger(session.user.id).length, 1); second.close();
});
