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

test('vay, trap and victory preserve conversion rules and requested timings',()=>{
 let s=newChemGame();s.board=Array(25).fill(null);for(const i of [2,5,7])s.board[i]=0;for(const i of [0,1,24])s.board[i]=1;
 let n=applyChemMove(s,{from:7,to:6}),beats=chemBeats(s,n),v=beats.find(b=>b.kind==='vay');assert.equal(v.duration,600);assert.deepEqual(v.targets,[0,1]);assert.equal(v.state.board[0],1);assert.equal(n.board[0],0);
 s=newChemGame();s.board=Array(25).fill(null);for(const i of [11,12,13])s.board[i]=0;for(const i of [17,24])s.board[i]=1;
 n=applyChemMove(s,{from:12,to:7});assert.equal(chemBeats(s,n).at(-1).kind,'trap');
 s=newChemGame(false);s.board=Array(25).fill(null);s.board[7]=0;s.board[11]=1;s.board[13]=1;
 n=applyChemMove(s,{from:7,to:12});beats=chemBeats(s,n);assert.deepEqual(beats.map(b=>b.duration),[250,520,1200]);assert.equal(n.board.filter(x=>x!==null).length,3);
});
