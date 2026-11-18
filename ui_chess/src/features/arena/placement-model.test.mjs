import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fiveLine,goRegions,placementDelta} from './placement-model.ts';
const grid=(n)=>Array.from({length:n},()=>Array(n).fill(null));
test('highlight exactly five connected stones including the deciding move',()=>{
 const b=grid(9);for(let c=1;c<8;c++)b[4][c]='X';const line=fiveLine(b,[4,7]);assert.equal(line.length,5);assert.deepEqual(line[4],[4,7]);
 const d=grid(7);for(let i=0;i<5;i++)d[i][4-i]='O';assert.equal(fiveLine(d,[2,2]).length,5);
 assert.deepEqual(fiveLine(grid(5),[2,2]),[]);
});
test('atari counts distinct liberties for the whole connected group',()=>{
 const b=[['black','black','white'],['white',null,'white'],[null,'white',null]];
 assert.deepEqual(goRegions(b).atari,[[0,0],[0,1]]);
});
test('territory leaves mixed borders neutral and scoring includes 6.5 komi',()=>{
 const b=[['black','black','black'],['black',null,'black'],['black','black','black']];
 assert.deepEqual(goRegions(b).score,[9,6.5]);assert.deepEqual(goRegions(b).territory,[{point:[1,1],owner:'black'}]);
 b[0][1]='white';assert.equal(goRegions(b).territory.length,0);
});
test('single placement with captures animates, repeat/reset/initial state does not',()=>{
 const a=grid(3);a[0][0]='white';a[0][1]='white';const b=grid(3);b[1][1]='black';
 assert.deepEqual(placementDelta(a,b),{to:[1,1],removed:[[0,0],[0,1]]});
 assert.equal(placementDelta(null,b),null);assert.equal(placementDelta(b,b),null);assert.equal(placementDelta(b,grid(3)),null);
 const snap=grid(3);snap[1][1]='black';snap[2][2]='white';assert.equal(placementDelta(grid(3),snap),null);
});
