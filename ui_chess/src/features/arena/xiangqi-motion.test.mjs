import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmedXiangqiMove, xiangqiDuration } from './xiangqi-motion-model.ts';
const board=()=>Array(90).fill(null);
test('all seven timings and cannon capture match requested ranges',()=>{
 for(const [kind,min,max] of [['S',250,350],['A',300,400],['G',400,500],['E',400,550],['H',500,650],['R',300,450],['C',300,400]])assert.ok(xiangqiDuration(kind,false)>=min&&xiangqiDuration(kind,false)<=max);
 assert.equal(xiangqiDuration('C',true),660);
});
test('confirmed moves and captures animate, duplicate/undo/snapshot do not',()=>{
 const before=board();before[54]={key:'S',kind:'S'};before[45]={key:'s',kind:'S'};
 const after=[...before];after[45]=before[54];after[54]=null;
 assert.ok(confirmedXiangqiMove(before,after,54,45));
 assert.equal(confirmedXiangqiMove(after,after,54,45),false);
 assert.equal(confirmedXiangqiMove(after,before,54,45),false);
 const reset=[...after];reset[0]={key:'R',kind:'R'};
 assert.equal(confirmedXiangqiMove(before,reset,54,45),false);
});
test('covered piece reveals with stable id while movement uses original role',()=>{
 const before=board();before[64]={key:'red-hidden',kind:'C'};
 const after=board();after[37]={key:'red-hidden',kind:'H'};
 assert.ok(confirmedXiangqiMove(before,after,64,37));
 assert.equal(xiangqiDuration(before[64].kind,false),360);
});
