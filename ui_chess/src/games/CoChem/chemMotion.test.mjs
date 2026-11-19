import test from 'node:test';
import assert from 'node:assert/strict';
import { newChemGame, applyChemMove } from './engine.ts';
import { chemBeats } from './chemMotion.ts';

test('ganh produces dash then ganh with converted pieces still shown as enemy', () => {
  const s = newChemGame(false); s.board = Array(25).fill(null);
  Object.assign(s.board, { 7: 0, 11: 1, 13: 1, 0: 0, 24: 1, 20: 1 });
  const after = applyChemMove(s, { from: 7, to: 12 }), beats = chemBeats(s, after);
  assert.deepEqual(beats.map(b => b.kind), ['dash', 'ganh']);
  assert.equal(beats[1].state.board[11], 1); assert.equal(after.board[11], 0);
  assert.deepEqual([...beats[1].targets].sort(), [11, 13]);
  assert.deepEqual(chemBeats(after, after), []); // identical snapshot
  assert.deepEqual(chemBeats(after, s), []); // going back plays nothing
});

test('plain move is just a dash', () => {
  const s = newChemGame(false), after = applyChemMove(s, { from: 15, to: 16 });
  assert.deepEqual(chemBeats(s, after).map(b => b.kind), ['dash']);
});
