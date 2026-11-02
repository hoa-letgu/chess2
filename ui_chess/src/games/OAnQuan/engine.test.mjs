import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseQuanMove, legalPits, newQuanGame, playQuan, totalPoints } from './engine.ts';

test('initial board has 50 peasants, 2 quan and 70 points',()=>{
  const s=newQuanGame();assert.equal(s.pits.length,12);assert.equal(s.pits.reduce((a,b)=>a+b),50);assert.equal(s.quan.filter(Boolean).length,2);assert.equal(totalPoints(s),70);assert.deepEqual(legalPits(s),[0,1,2,3,4]);
});
test('only occupied own civilian pits and two directions are accepted',()=>{
  const s=newQuanGame();assert.throws(()=>playQuan(s,6,1));assert.throws(()=>playQuan(s,5,1));assert.throws(()=>playQuan(s,0,0));s.pits[0]=0;assert.throws(()=>playQuan(s,0,-1));s.finished=true;assert.deepEqual(legalPits(s),[]);
});
test('sowing in either direction relays and captures without mutating input',()=>{
  const s=newQuanGame(),before=structuredClone(s);
  for(const direction of [-1,1]){const result=playQuan(s,2,direction);assert.equal(result.frames[0].hand,5);assert.equal(result.frames[1].focus,direction===1?3:1);assert.equal(result.state.scores[0],6);assert.equal(result.state.turn,1);assert.equal(result.state.moves,1);assert.equal(totalPoints(result.state),70);}
  assert.deepEqual(s,before);
});
test('an occupied quan stops relay, it is not picked up',()=>{
  const s=newQuanGame();s.pits.fill(0);s.pits[3]=1;
  const result=playQuan(s,3,1);assert.equal(result.state.pits[4],1);assert.equal(result.state.quan[5],true);assert.equal(result.state.scores[0],0);assert.ok(!result.frames.some(f=>f.focus===5));
});
test('captures chain across empty gaps including a mature quan',()=>{
  const s=newQuanGame();s.pits.fill(0);s.pits[0]=1;s.pits[3]=3;s.pits[7]=2;
  const result=playQuan(s,0,1);assert.equal(result.state.scores[0],15);assert.equal(result.state.captured[0],1);assert.equal(result.state.quan[5],false);assert.equal(result.frames.filter(f=>f.text.startsWith('Ăn')).length,3);
});
test('young quan protection is optional and requires five peasants',()=>{
  const s=newQuanGame(true);s.pits.fill(0);s.pits[0]=1;s.pits[3]=3;
  let result=playQuan(s,0,1);assert.equal(result.state.scores[0],3);assert.equal(result.state.quan[5],true);
  s.pits[5]=5;result=playQuan(s,0,1);assert.equal(result.state.scores[0],18);assert.equal(result.state.quan[5],false);
});
test('empty next side is refilled at a cost of five points, preserving value',()=>{
  const s=newQuanGame();s.pits.fill(0);s.pits[0]=1;s.scores=[49,0];assert.equal(totalPoints(s),70);
  const result=playQuan(s,0,1);assert.equal(result.state.scores[1],-5);assert.deepEqual(result.state.pits.slice(6,11),[1,1,1,1,1]);assert.equal(totalPoints(result.state),70);assert.ok(result.state.log[0].includes('rải lại'));
});
test('last quan ends game and remaining own peasants are collected',()=>{
  const s=newQuanGame();s.pits.fill(0);s.quan[11]=false;s.captured=[1,0];s.pits[2]=1;s.pits[6]=4;s.pits[11]=2;s.scores=[20,33];assert.equal(totalPoints(s),70);
  const result=playQuan(s,2,1);assert.equal(result.state.finished,true);assert.deepEqual(result.state.scores,[33,37]);assert.equal(result.state.winner,1);assert.ok(result.state.pits.every(n=>n===0));assert.equal(totalPoints(result.state),70);
});
test('animation snapshots are independent and preserve final outcomes',()=>{
  const s=newQuanGame(),animated=playQuan(s,1,1),fast=playQuan(s,1,1,false);assert.deepEqual(animated.state,fast.state);assert.deepEqual(fast.frames,[]);for(const f of animated.frames)assert.equal(totalPoints(f)+f.hand,70);
  const first=animated.frames[0].pits[0];animated.frames[1].pits[0]=999;assert.equal(animated.frames[0].pits[0],first);assert.equal(totalPoints(animated.state),70);
});
test('bot chooses valid moves at both levels',()=>{
  const s=newQuanGame();for(const level of ['easy','smart']){const move=chooseQuanMove(s,level);assert.ok(legalPits(s).includes(move.pit));assert.ok([-1,1].includes(move.direction));}
});
test('complete bot game terminates and conserves points after every move',()=>{
  for(const protect of [false,true]){let s=newQuanGame(protect),turns=0;while(!s.finished&&turns++<301){const m=chooseQuanMove(s,'easy');s=playQuan(s,m.pit,m.direction,false).state;assert.equal(totalPoints(s),70);assert.ok(s.pits.every(n=>Number.isInteger(n)&&n>=0));assert.ok(s.quan.filter(Boolean).length+s.captured[0]+s.captured[1]===2);}assert.equal(s.finished,true);assert.ok([-1,0,1].includes(s.winner));}
});
