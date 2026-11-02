import test from 'node:test';
import assert from 'node:assert/strict';
import {newCheckers,legalSteps,legalTurns,applyStep,chooseTurn,positionKey,playable} from './engine.ts';
function blank(){const s=newCheckers();s.board.fill(null);s.history=[];return s;}
function put(s,i,side,king=false){assert(playable(i));s.board[i]={side,king};}
function key(s){s.history=[positionKey(s)];return s;}
function chain(){const s=blank();put(s,42,0);put(s,35,1);put(s,19,1);put(s,1,1);return key(s);}
test('initial board has 12 men each, all on dark squares, red first with seven legal moves',()=>{
 const s=newCheckers();assert.equal(s.board.length,64);assert.equal(s.board.filter(Boolean).length,24);assert.equal(s.turn,0);assert.equal(legalSteps(s).length,7);
 for(const side of [0,1])assert.equal(s.board.filter(p=>p?.side===side).length,12);assert(s.board.every((p,i)=>!p||playable(i)&&!p.king));assert.equal(legalTurns(s).length,7);
});
test('ordinary moves are one diagonal forward and do not mutate original',()=>{
 const s=newCheckers(),copy=structuredClone(s);const n=applyStep(s,40,33);assert.deepEqual(s,copy);assert.equal(n.board[40],null);assert.equal(n.board[33].side,0);assert.equal(n.turn,1);assert.equal(n.ply,1);assert.equal(n.quiet,0);
 assert.throws(()=>applyStep(s,40,41));assert.throws(()=>applyStep(s,40,24));assert.throws(()=>applyStep(s,1,8));
});
test('men cannot move or capture backwards; kings can, but cannot fly',()=>{
 const s=blank();put(s,35,0);put(s,7,1,true);assert.deepEqual(legalSteps(s).map(m=>m.to).sort((a,b)=>a-b),[26,28]);put(s,35,0,true);assert.deepEqual(legalSteps(s).map(m=>m.to).sort((a,b)=>a-b),[26,28,42,44]);assert.throws(()=>applyStep(s,35,17));
 const b=blank();put(b,26,0);put(b,35,1);assert(!legalSteps(b).some(m=>m.to===44));b.board[26].king=true;assert(legalSteps(b).some(m=>m.to===44&&m.capture===35));
});
test('any available capture suppresses all ordinary moves globally',()=>{
 const s=chain();put(s,40,0);const moves=legalSteps(s);assert(moves.every(m=>m.capture!==null));assert(!moves.some(m=>m.from===40));assert.throws(()=>applyStep(s,40,33));
});
test('a multi-jump locks the same piece and completes only after the last capture',()=>{
 const s=chain();put(s,44,0);const n=applyStep(s,42,28);assert.equal(n.chain,28);assert.equal(n.turn,0);assert.equal(n.ply,0);assert.equal(n.history.length,s.history.length);assert.equal(n.captured[0].length,1);assert.deepEqual(n.path,[42,28]);assert.deepEqual(legalSteps(n),[{from:28,to:10,capture:19}]);assert.throws(()=>applyStep(n,44,35));
 const end=applyStep(n,28,10);assert.equal(end.turn,1);assert.equal(end.chain,null);assert.equal(end.ply,1);assert.equal(end.captured[0].length,2);assert.equal(end.history.length,s.history.length+1);assert.match(end.logs[0],/bắt 2 quân/);assert.equal(end.path.length,0);
});
test('all complete capture routes are generated; longest route is not compulsory',()=>{
 const s=chain();put(s,33,1);const turns=legalTurns(s);assert(turns.some(m=>m.captures.length===1));assert(turns.some(m=>m.captures.length===2));assert(turns.every(m=>m.captures.length));
 const short=applyStep(s,42,24);assert.equal(short.turn,1);assert.equal(short.chain,null);assert.equal(short.captured[0].length,1);
});
test('a man may capture a king, but not friendly pieces or into occupied landing squares',()=>{
 const s=blank();put(s,42,0);put(s,35,1,true);put(s,7,1);const n=applyStep(s,42,28);assert(n.captured[0][0].king);
 put(s,28,1);assert(!legalSteps(s).some(m=>m.from===42&&m.to===28));s.board[28]=null;s.board[35].side=0;assert(!legalSteps(s).some(m=>m.from===42&&m.to===28));
});
test('ordinary arrival at the far rank crowns and ends turn',()=>{
 const s=blank();put(s,8,0);put(s,62,1,true);const n=applyStep(s,8,1);assert(n.board[1].king);assert(n.last.crowned);assert.equal(n.turn,1);assert.equal(n.chain,null);assert.match(n.logs[0],/phong Vua/);
});
test('capture onto king row stops immediately, even if the new king could jump back',()=>{
 const s=blank();put(s,17,0);put(s,10,1);put(s,12,1);const turns=legalTurns(s);assert.deepEqual(turns,[{path:[17,3],captures:[10],crowned:true}]);
 const n=applyStep(s,17,3);assert(n.board[3].king);assert.equal(n.chain,null);assert.equal(n.turn,1);assert(n.board[12]);assert.equal(n.captured[0].length,1);
});
test('an existing king can turn and continue capturing backwards',()=>{
 const s=blank();put(s,42,0,true);put(s,35,1);put(s,37,1);put(s,7,1);const n=applyStep(s,42,28);assert.equal(n.chain,28);assert(legalSteps(n).some(m=>m.to===46&&m.capture===37));const end=applyStep(n,28,46);assert.equal(end.turn,1);assert.equal(end.captured[0].length,2);assert(!end.last.crowned);
});
test('capture of last enemy wins and no further action is accepted',()=>{
 const s=blank();put(s,42,0);put(s,35,1);const n=applyStep(s,42,28);assert.equal(n.winner,0);assert.match(n.reason,/hết quân/);assert.throws(()=>applyStep(n,28,19));
});
test('blocking every enemy move is a win even with enemy pieces remaining',()=>{
 const s=blank();for(const i of [40,42,56,58])put(s,i,0);put(s,49,1);const n=applyStep(s,40,33);assert.equal(n.winner,0);assert.match(n.reason,/phong tỏa/);assert(n.board[49]);
});
test('threefold repetition includes turn and kings and is checked on full turns',()=>{
 let s=blank();put(s,56,0,true);put(s,7,1,true);key(s);const initial=positionKey(s);s.turn=1;assert.notEqual(positionKey(s),initial);s.turn=0;s.board[56].king=false;assert.notEqual(positionKey(s),initial);s.board[56].king=true;
 const route=[[56,49],[7,14],[49,56],[14,7]];for(let i=0;i<8;i++)s=applyStep(s,...route[i%4]);assert.equal(s.winner,-1);assert.match(s.reason,/lặp 3 lần/);
});
test('80 quiet half-moves draw; any capture or ordinary-man advance resets progress counter',()=>{
 let s=blank();put(s,56,0,true);put(s,7,1,true);s.quiet=79;assert.equal(applyStep(s,56,49).winner,-1);
 s=blank();put(s,40,0);put(s,7,1,true);s.quiet=79;assert.equal(applyStep(s,40,33).quiet,0);
 s=chain();s.board[42].king=true;s.quiet=79;const n=applyStep(s,42,28);assert.equal(n.quiet,0);assert.equal(n.winner,null);
});
test('practice cap draws after 400 completed half-moves',()=>{
 const s=blank();put(s,56,0,true);put(s,7,1,true);s.ply=399;const n=applyStep(s,56,49);assert.equal(n.winner,-1);assert.match(n.reason,/400/);
});
test('full-turn generator never returns truncated jump sequences or duplicates a victim',()=>{
 const s=chain();for(const m of legalTurns(s)){assert.equal(m.path.length,m.captures.length+1);assert.equal(new Set(m.captures).size,m.captures.length);let n=s;for(let i=1;i<m.path.length;i++)n=applyStep(n,m.path[i-1],m.path[i]);assert.equal(n.chain,null);assert.equal(n.turn,1);}
 const n=applyStep(s,42,28);assert.deepEqual(legalTurns(n),[{path:[28,10],captures:[19],crowned:false}]);
});
test('both bot levels return legal complete turns without modifying source',()=>{
 for(const s of [newCheckers(),chain()]){const before=structuredClone(s);for(const level of ['easy','smart']){const m=chooseTurn(s,level);assert(m);assert(legalTurns(s).some(x=>JSON.stringify(x)===JSON.stringify(m)));let n=s;for(let i=1;i<m.path.length;i++)n=applyStep(n,m.path[i-1],m.path[i]);assert.equal(n.chain,null);}assert.deepEqual(s,before);}
});
test('eight complete simulated games preserve stock, dark-square occupancy and forced-turn ownership',()=>{
 for(let seed=1;seed<=8;seed++){let s=newCheckers(),random=seed,steps=0;
  while(s.winner===null&&steps++<1000){random=(Math.imul(random,1664525)+1013904223)>>>0;const moves=legalTurns(s),m=s.turn===0?chooseTurn(s,'easy'):moves[random%moves.length],actor=s.turn;assert(m);
   for(let i=1;i<m.path.length;i++){s=applyStep(s,m.path[i-1],m.path[i]);if(s.chain!==null)assert.equal(s.turn,actor);assert(s.board.every((p,i)=>!p||playable(i)));for(const side of [0,1])assert.equal(s.board.filter(p=>p?.side===side).length+s.captured[1-side].length,12);}
   assert.equal(s.chain,null);
  }assert.notEqual(s.winner,null,`seed ${seed} did not finish`);
 }
});
