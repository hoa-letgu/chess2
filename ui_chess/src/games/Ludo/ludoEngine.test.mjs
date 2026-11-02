import test from 'node:test';
import assert from 'node:assert/strict';
import { FINISH, TRACK, BASES, HOME, newGame, legalTokens, rollDice, moveToken, chooseBotToken, randomDice, trackIndex, tokenCoordinate } from './ludoEngine.ts';

test('board has 52 unique track cells and four separate home lanes', () => {
  assert.equal(TRACK.length, 52); assert.equal(new Set(TRACK.map(p => p.join(','))).size, 52);
  assert.equal(new Set(HOME.flat().map(p => p.join(','))).size, 24);
  for (let id = 0; id < 4; id++) { assert.deepEqual(tokenCoordinate(id, 0, -1), BASES[id][0]); assert.deepEqual(tokenCoordinate(id, 0, 0), TRACK[id * 13]); assert.deepEqual(tokenCoordinate(id, 0, FINISH), HOME[id][5]); }
});
test('a six is required to deploy and gives another roll after deployment', () => {
  let state = newGame(); const original = structuredClone(state);
  state = rollDice(state, 2); assert.equal(state.turn, 1); assert.equal(state.phase, 'roll');
  assert.deepEqual(original, newGame()); assert.throws(() => rollDice(original, 7));
  state = rollDice(newGame(), 6); assert.deepEqual(legalTokens(state), [0,1,2,3]);
  state = moveToken(state, 0); assert.equal(state.players[0].tokens[0], 0); assert.equal(state.turn, 0); assert.equal(state.phase, 'roll');
  assert.throws(() => moveToken(state, 1));
});
test('ordinary moves advance the correct token and switch turns', () => {
  const start = newGame(); start.players[0].tokens[2] = 10;
  const rolled = rollDice(start, 4); assert.deepEqual(legalTokens(rolled), [2]);
  const moved = moveToken(rolled, 2); assert.equal(moved.players[0].tokens[2], 14); assert.equal(moved.turn, 1); assert.equal(start.players[0].tokens[2], 10);
});
test('three consecutive sixes skip the third move', () => {
  let s = newGame(); s = moveToken(rollDice(s, 6), 0); s = moveToken(rollDice(s, 6), 0); const before = s.players[0].tokens[0];
  s = rollDice(s, 6); assert.equal(s.turn, 1); assert.equal(s.phase, 'roll'); assert.equal(s.players[0].tokens[0], before); assert.equal(s.consecutiveSixes, 0);
});
test('landing on an unsafe enemy square captures all opposing horses there', () => {
  const s = newGame(); s.players[0].tokens[0] = 14; s.players[1].tokens[0] = 2; s.players[1].tokens[1] = 2;
  assert.equal(trackIndex(0, 15), trackIndex(1, 2));
  const moved = moveToken(rollDice(s, 1), 0); assert.equal(moved.players[1].tokens[0], -1); assert.equal(moved.players[1].tokens[1], -1);
});
test('safe squares permit coexistence and own horses can stack', () => {
  const s = newGame(); s.players[0].tokens = [12,13,-1,-1]; s.players[1].tokens[0] = 0;
  const moved = moveToken(rollDice(s, 1), 0); assert.deepEqual(moved.players[0].tokens.slice(0,2), [13,13]); assert.equal(moved.players[1].tokens[0], 0);
});
test('home entry, exact finish and final victory use the player lane', () => {
  const s = newGame(); s.players[0].tokens = [50,56,56,56];
  let moved = moveToken(rollDice(s, 1), 0); assert.equal(moved.players[0].tokens[0], 51);
  const near = newGame(); near.players[0].tokens = [55,56,56,56];
  const bad = rollDice(near, 2); assert.equal(bad.turn, 1); assert.equal(bad.players[0].tokens[0], 55);
  moved = moveToken(rollDice(near, 1), 0); assert.equal(moved.winner, 0); assert.equal(moved.phase, 'finished'); assert.throws(() => rollDice(moved, 6));
});
test('local 2–4 player games have no bots and two players use opposite colors', () => {
  assert.deepEqual(newGame('local', 2).players.map(p => p.id), [0,2]);
  for (const n of [2,3,4]) { const s = newGame('local', n); assert.equal(s.players.length, n); assert.ok(s.players.every(p => !p.bot)); }
  assert.throws(() => newGame('local', 1)); assert.equal(newGame().players.filter(p => p.bot).length, 3);
});
test('bot prioritizes a finish and never picks an illegal horse', () => {
  const s = newGame(); s.players[0].tokens = [55,0,-1,-1];
  const rolled = rollDice(s, 1); assert.equal(chooseBotToken(rolled), 0);
  for (let i = 0; i < 100; i++) { const n = randomDice(); assert.ok(n >= 1 && n <= 6 && Number.isInteger(n)); }
});
test('complete deterministic bot simulation reaches a valid winner', () => {
  let s = newGame(), seed = 90210, iterations = 0;
  while (s.phase !== 'finished' && iterations++ < 20000) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    s = s.phase === 'roll' ? rollDice(s, (seed >>> 16) % 6 + 1) : moveToken(s, chooseBotToken(s));
    assert.ok(s.players.every(p => p.tokens.every(t => t >= -1 && t <= FINISH)));
  }
  assert.equal(s.phase, 'finished'); assert.ok(s.players.find(p => p.id === s.winner).tokens.every(t => t === FINISH));
});
