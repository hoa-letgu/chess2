import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, rollDice, moveToken } from './ludoEngine.ts';
import { ludoBeats } from './ludoMotion.ts';

test('roll, exit, hops, kick and win produce the expected beats', () => {
  let s = newGame('local', 2); // players 0 and 2
  let n = rollDice(s, 6);
  assert.deepEqual(ludoBeats(s, n).map(b => b.kind), ['dice']);
  s = n; n = moveToken(s, 0);
  assert.deepEqual(ludoBeats(s, n).map(b => b.kind), ['exit']);
  s = n; n = rollDice(s, 3); assert.equal(ludoBeats(s, n)[0].value, 3);
  s = n; n = moveToken(s, 0);
  assert.deepEqual(ludoBeats(s, n).map(b => b.kind), ['hop', 'hop', 'hop']);
  assert.deepEqual(ludoBeats(n, n), []);

  // kick: player 0 token at progress 4 (track 4), player 2 token on track 7 -> progress 7-26+52=33
  const k = newGame('local', 2); k.players[0].tokens[0] = 4; k.players[1].tokens[0] = 33; k.phase = 'choose'; k.dice = 3;
  const kicked = moveToken(k, 0), beats = ludoBeats(k, kicked);
  assert.deepEqual(beats.map(b => b.kind), ['hop', 'hop', 'hop', 'kick']);
  assert.equal(beats.at(-1).state.players[1].tokens[0], 33);
  assert.deepEqual(beats.at(-1).kicked, [{ player: 2, token: 0 }]);

  const w = newGame('local', 2); w.players[0].tokens = [56, 56, 56, 55]; w.phase = 'choose'; w.dice = 1;
  assert.deepEqual(ludoBeats(w, moveToken(w, 3)).map(b => b.kind), ['hop', 'finish', 'win']);
});
