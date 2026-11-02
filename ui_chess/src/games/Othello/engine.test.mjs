import test from 'node:test';
import assert from 'node:assert/strict';
import {newOthello,counts,captureLines,flipsFor,legalMoves,playMove,chooseMove} from './engine.ts';
function blank(){const s=newOthello();s.board.fill(null);return s;}
test('standard opening: two discs each, black first, four legal moves',()=>{
 const s=newOthello();assert.equal(s.board.length,64);assert.deepEqual(counts(s.board),[2,2]);assert.equal(s.turn,0);assert.equal(s.board[27],1);assert.equal(s.board[28],0);assert.equal(s.board[35],0);assert.equal(s.board[36],1);assert.deepEqual(legalMoves(s.board,0).map(m=>m.at),[19,26,37,44]);
});
test('placing C4 flips D4 and gives white the documented C3/E3/C5 replies',()=>{
 const s=newOthello(),copy=structuredClone(s),n=playMove(s,26);assert.deepEqual(s,copy);assert.deepEqual(n.last.flips,[27]);assert.deepEqual(counts(n.board),[4,1]);assert.equal(n.turn,1);assert.equal(n.moves,1);assert.deepEqual(legalMoves(n.board,1).map(m=>m.at),[18,20,34]);
});
test('a move flips all eight bracketed directions, without double-counting',()=>{
 const s=blank(),at=27,dirs=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
 for(const [dr,dc]of dirs){s.board[(3+dr)*8+3+dc]=1;s.board[(3+2*dr)*8+3+2*dc]=0;}
 const lines=captureLines(s.board,at,0);assert.equal(lines.length,8);assert.equal(new Set(lines.flat()).size,8);const n=playMove(s,at);assert.equal(n.last.flips.length,8);assert.equal(n.last.directions,8);assert.deepEqual(counts(n.board),[17,0]);
});
test('entire enclosed line flips, but own discs, gaps and unclosed lines stop capture',()=>{
 const s=blank();s.board[0]=0;for(const i of [1,2,3,4,5])s.board[i]=1;assert.deepEqual(flipsFor(s.board,6,0),[5,4,3,2,1]);s.board[3]=null;assert.deepEqual(flipsFor(s.board,6,0),[]);s.board[3]=0;assert.deepEqual(flipsFor(s.board,6,0),[5,4]);
});
test('no cascading flips from discs that just changed color',()=>{
 const s=blank();s.board[0]=0;s.board[1]=1;s.board[9]=1;s.board[17]=0;const n=playMove(s,2);assert.deepEqual(n.last.flips,[1]);assert.equal(n.board[9],1);
});
test('edge scans do not wrap from H file to A file',()=>{
 const s=blank();s.board[8]=1;s.board[9]=0;assert.deepEqual(flipsFor(s.board,7,0),[]);s.board[55]=1;s.board[54]=0;assert.deepEqual(flipsFor(s.board,56,0),[]);
});
test('illegal occupied, empty non-capture and out-of-range moves reject without mutation',()=>{
 const s=newOthello(),copy=structuredClone(s);for(const at of [27,28,0,-1,64,NaN,2.5])assert.throws(()=>playMove(s,at));assert.deepEqual(s,copy);
});
test('forced pass keeps the same player moving, then ends when both have no move',()=>{
 const s=newOthello();s.board.fill(0);s.board[0]=null;s.board[2]=null;s.board[1]=1;s.board[3]=1;
 const n=playMove(s,2);assert.equal(n.passed,1);assert.equal(n.passes,1);assert.equal(n.turn,0);assert.equal(n.winner,null);assert.match(n.logs[0],/nhường lượt/);assert.deepEqual(legalMoves(n.board,1),[]);
 const end=playMove(n,0);assert.equal(end.winner,0);assert.deepEqual(counts(end.board),[64,0]);assert.equal(end.moves,2);assert.throws(()=>playMove(end,3));
});
test('game can end with empty squares, using actual on-board score',()=>{
 const s=blank();s.board[0]=0;s.board[1]=1;const n=playMove(s,2);assert.equal(n.winner,0);assert.equal(n.board.filter(c=>c===null).length,61);assert.deepEqual(counts(n.board),[3,0]);assert.match(n.reason,/còn ô trống/);
});
test('a full-board tie is a draw',()=>{
 const s=newOthello();s.board.fill(0);s.board[0]=null;s.board[1]=1;for(let i=10;i<=41;i++)s.board[i]=1;assert.deepEqual(counts(s.board),[30,33]);const n=playMove(s,0);assert.deepEqual(counts(n.board),[32,32]);assert.equal(n.winner,-1);
});
test('white majority wins normally and pass flag clears after an ordinary move',()=>{
 const s=blank();s.turn=1;s.board[0]=1;s.board[1]=0;s.passed=0;const n=playMove(s,2);assert.equal(n.winner,1);assert.equal(n.passed,null);assert.deepEqual(counts(n.board),[0,3]);
});
test('rotation plus color swap preserves legal capture sets',()=>{
 const s=newOthello();let p=playMove(s,26);p=playMove(p,18);const reversed=p.board.map((_,i)=>p.board[63-i]===null?null:1-p.board[63-i]);
 for(const m of legalMoves(p.board,p.turn)){const mirror=flipsFor(reversed,63-m.at,1-p.turn);assert.deepEqual(mirror.sort((a,b)=>a-b),m.flips.map(i=>63-i).sort((a,b)=>a-b));}
});
test('preview generation never changes board; either bot level returns a legal move',()=>{
 const s=newOthello(),before=structuredClone(s);for(const level of ['easy','smart']){const m=chooseMove(s,level);assert(m);assert(legalMoves(s.board,s.turn).some(x=>x.at===m.at));assert.doesNotThrow(()=>playMove(s,m.at));}assert.deepEqual(s,before);
 const no=blank();no.board[0]=0;assert.equal(chooseMove(no,'smart'),undefined);
});
function late(seed){let s=newOthello(),r=seed;while(s.winner===null&&s.board.filter(x=>x===null).length>6){r=(Math.imul(r,1664525)+1013904223)>>>0;const m=legalMoves(s.board,s.turn);s=playMove(s,m[r%m.length].at);}return s;}
function solve(s,side){if(s.winner!==null){const c=counts(s.board);return c[side]-c[1-side];}const values=legalMoves(s.board,s.turn).map(m=>solve(playMove(s,m.at),side));return s.turn===side?Math.max(...values):Math.min(...values);}
test('late-game search matches exhaustive results, including passes',()=>{
 for(const seed of [3,7,12]){const s=late(seed);if(s.winner!==null)continue;const chosen=chooseMove(s,'smart');assert(chosen);assert.equal(solve(playMove(s,chosen.at),s.turn),solve(s,s.turn));}
});
test('sixteen complete games preserve occupancy, exact flipped colors and automatic pass legality',()=>{
 for(let seed=1;seed<=16;seed++){let s=newOthello(),r=seed;
  while(s.winner===null){r=(Math.imul(r,1664525)+1013904223)>>>0;const m=legalMoves(s.board,s.turn),pick=m[r%m.length],actor=s.turn,n=playMove(s,pick.at),changed=new Set([pick.at,...pick.flips]);
   assert.equal(n.board.filter(x=>x!==null).length,4+n.moves);assert(n.moves<=60);for(let i=0;i<64;i++)assert.equal(n.board[i],changed.has(i)?actor:s.board[i]);for(const i of pick.flips)assert.equal(s.board[i],1-actor);
   if(n.winner===null)assert(legalMoves(n.board,n.turn).length>0);if(n.passed!==null){assert.equal(n.turn,actor);assert.equal(legalMoves(n.board,n.passed).length,0);}s=n;
  }assert.equal(legalMoves(s.board,0).length,0);assert.equal(legalMoves(s.board,1).length,0);const c=counts(s.board);assert.equal(s.winner,c[0]===c[1]?-1:c[0]>c[1]?0:1);
 }
});
