import test from 'node:test';
import assert from 'node:assert/strict';
import {newQuanGame,playQuan} from './engine.ts';
import {quanReplay} from './quan-replay.ts';
test('five pebbles sow sequentially at 150ms, scores credit only in after frame',()=>{
 const before=newQuanGame(),after=playQuan(before,2,1,false).state,beats=quanReplay(before,after);
 assert.equal(beats[0].kind,'pickup');assert.equal(beats[0].duration,300);
 assert.deepEqual(beats.slice(1,6).map(b=>b.kind),Array(5).fill('sow'));
 assert.equal(beats.slice(1,6).reduce((sum,b)=>sum+b.duration,0),750);
 const capture=beats.find(b=>b.kind==='capture');assert.ok(capture);assert.equal(capture.before.scores[0],0);assert.equal(capture.after.scores[0],6);assert.equal(capture.points,6);
 assert.deepEqual(beats.at(-1).after.pits,after.pits);
});
test('quan capture uses 900ms, exact points and keeps quan visible until arrival',()=>{
 const s=newQuanGame();s.pits.fill(0);s.pits[0]=1;s.pits[3]=3;s.pits[7]=2;
 const end=playQuan(s,0,1,false).state,beat=quanReplay(s,end).find(b=>b.kind==='quan');
 assert.equal(beat.duration,900);assert.equal(beat.points,10);assert.equal(beat.before.quan[5],true);assert.equal(beat.after.quan[5],false);
});
test('duplicate, reset, missed moves and inconsistent snapshots do not replay',()=>{
 const s=newQuanGame(),a=playQuan(s,2,1,false).state;
 assert.deepEqual(quanReplay(a,a),[]);assert.deepEqual(quanReplay(a,s),[]);
 const bad=structuredClone(a);bad.scores[0]++;assert.deepEqual(quanReplay(s,bad),[]);
 const missing=structuredClone(a);missing.moves++;assert.deepEqual(quanReplay(s,missing),[]);
});
