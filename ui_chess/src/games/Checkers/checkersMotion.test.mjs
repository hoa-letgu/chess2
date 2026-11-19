import test from 'node:test';
import assert from 'node:assert/strict';
import { newCheckers, applyStep } from './engine.ts';
import { checkersBeats } from './checkersMotion.ts';

const blank = () => { const s = newCheckers(); s.board = Array(64).fill(null); return s; };

test('slide, jump with combo count, and crown beats', () => {
  let s = blank(); s.board[40] = { side: 0, king: false }; s.board[1] = { side: 1, king: false };
  let n = applyStep(s, 40, 33);
  assert.deepEqual(checkersBeats(s, n).map(b => b.kind), ['slide']);

  s = blank(); s.board[40] = { side: 0, king: false }; s.board[33] = { side: 1, king: false }; s.board[1] = { side: 1, king: false };
  n = applyStep(s, 40, 26);
  const jump = checkersBeats(s, n);
  assert.deepEqual(jump.map(b => b.kind), ['jump']); assert.equal(jump[0].combo, 1); assert.equal(jump[0].state.board[33].side, 1);

  s = blank(); s.board[10] = { side: 0, king: false }; s.board[63] = { side: 1, king: false };
  n = applyStep(s, 10, 3);
  assert.deepEqual(checkersBeats(s, n).map(b => b.kind), ['slide', 'crown']);
  assert.deepEqual(checkersBeats(n, n), []);
});
