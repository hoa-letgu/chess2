import test from 'node:test';
import assert from 'node:assert/strict';
import {newOthello,playMove} from './engine.ts';
import {othelloBeats,flipDelay} from './othelloMotion.ts';
test('hold score during flip, settle after last disc, reject duplicate/reset',()=>{
 const s=newOthello(),n=playMove(s,26),beats=othelloBeats(s,n);
 assert.deepEqual(beats.map(b=>b.kind),['flip','score']);assert.equal(beats[0].state,s);
 assert.equal(beats[0].duration,460);assert.equal(beats[1].state,n);
 assert.deepEqual(othelloBeats(n,n),[]);assert.deepEqual(othelloBeats(n,s),[]);
});
test('distance wave is parallel across directions and 60ms apart',()=>{
 assert.equal(flipDelay(27,28),180);assert.equal(flipDelay(27,35),180);
 assert.equal(flipDelay(27,29),240);assert.equal(flipDelay(27,30),300);
});
test('final move settles score before 1500ms victory',()=>{
 const s=newOthello();s.board=Array(64).fill(0);s.board[0]=null;s.board[1]=1;
 const n=playMove(s,0);assert.deepEqual(othelloBeats(s,n).map(b=>b.kind),['flip','score','win']);
 assert.equal(othelloBeats(s,n).at(-1).duration,1500);
});
