import test from 'node:test';
import assert from 'node:assert/strict';
import {newEmpire,empireAction} from './engine.ts';
import {tycoonBeats} from './tycoon-motion.ts';
test('confirmed roll holds cash, hops each tile at 150ms, then settles tax',()=>{
 const before=newEmpire('local',2),after=empireAction(before,{type:'roll',dice:[2,2]}),beats=tycoonBeats(before,after);
 assert.equal(beats[0].kind,'dice');assert.equal(beats[0].duration,1000);
 assert.deepEqual(beats.filter(b=>b.kind==='hop').map(b=>b.state.players[0].position),[1,2,3,4]);
 assert.ok(beats.filter(b=>b.kind==='hop').every(b=>b.duration===150&&b.state.players[0].cash===1500));
 assert.equal(beats.at(-1).delta[0],-100);assert.equal(beats.at(-1).state.players[0].cash,1400);
});
test('duplicate, missed actions and reset snapshots do not replay',()=>{
 const before=newEmpire('local',2),after=empireAction(before,{type:'roll',dice:[3,3]});
 assert.deepEqual(tycoonBeats(after,after),[]);assert.deepEqual(tycoonBeats(after,before),[]);
 assert.deepEqual(tycoonBeats(before,{...after,revision:3}),[]);
});
test('chance and jail precede settled state, purchase and build target their real tile',()=>{
 const before=newEmpire('local',2);before.deck=[5];
 const after=empireAction(before,{type:'roll',dice:[1,1]}),beats=tycoonBeats(before,after);
 assert.deepEqual(beats.map(b=>b.kind),['dice','hop','hop','card','jail']);
 assert.equal(beats.at(-1).state.players[0].position,8);
 const land=empireAction(newEmpire('local',2),{type:'roll',dice:[1,2]}),buy=empireAction(land,{type:'buy'});
 assert.equal(tycoonBeats(land,buy)[0].tile,3);
 const ready={...buy,assets:buy.assets.map((a,i)=>i===1?{owner:0,level:0}:a)},built=empireAction(ready,{type:'build',tile:1});
 assert.equal(tycoonBeats(ready,built)[0].kind,'build');assert.equal(tycoonBeats(ready,built)[0].tile,1);
});
