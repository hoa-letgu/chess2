import test from 'node:test';
import assert from 'node:assert/strict';
import {ARMY,newUpGame,pseudo,legalUpMoves,applyUpMove,observeUp,chooseUpMove,isChecked,secureIndex} from './engine.ts';
function fixture(){const s=newUpGame();s.board.fill(null);s.history=[];put(s,4,1,'G');put(s,85,0,'G');put(s,49,0,'S');return s;}
function put(s,i,side,kind,role=kind){s.board[i]={id:`fixture-${i}`,side,kind,role};}
test('standard 9×10 layout: 32 pieces, 30 covered, no hidden assigned identities',()=>{
 const s=newUpGame(),pieces=s.board.filter(Boolean);assert.equal(s.board.length,90);assert.equal(pieces.length,32);assert.equal(pieces.filter(p=>p.kind===null).length,30);
 for(const side of [0,1]){assert.equal(pieces.filter(p=>p.side===side).length,16);assert.deepEqual(s.bags[side],ARMY);assert.equal(s.bags[side].includes('G'),false);}
 assert.equal(s.board[4].kind,'G');assert.equal(s.board[85].kind,'G');assert.equal(s.turn,0);assert.equal(new Set(pieces.map(p=>p.id)).size,32);
});
test('first move uses starting role, then the revealed identity controls movement',()=>{
 const s=newUpGame();assert(pseudo(s.board,54,45));assert(!pseudo(s.board,54,55));const next=applyUpMove(s,{from:54,to:45},()=>0);
 assert.equal(next.board[45].kind,'R');assert.equal(next.board[45].role,'S');assert.equal(next.bags[0].length,14);assert.equal(next.last.revealed,'R');assert(pseudo(next.board,45,46));
 assert.equal(s.board[54].kind,null);assert.equal(s.bags[0].length,15);assert.equal(next.quiet,0);
});
test('covered rook revealed as soldier loses rook movement immediately',()=>{
 const s=newUpGame(),next=applyUpMove(s,{from:81,to:72},n=>n-1);assert.equal(next.board[72].kind,'S');assert(pseudo(next.board,72,63));assert(!pseudo(next.board,72,73));
});
test('captured covered pieces stay covered and do not reveal or remove a bag identity',()=>{
 const s=fixture();put(s,72,0,'R');put(s,63,1,null,'H');const next=applyUpMove(s,{from:72,to:63},()=>{throw Error('No reveal should be sampled');});
 assert.equal(next.captured[0][0].kind,null);assert.equal(next.captured[0][0].role,'H');assert.deepEqual(next.bags,s.bags);assert.match(next.log[0],/bắt quân úp/);assert.equal(s.captured[0].length,0);
});
test('opened advisor can leave palace; covered advisor cannot on its first move',()=>{
 const s=fixture();put(s,40,0,'A');assert(pseudo(s.board,40,30));put(s,84,0,null,'A');assert(pseudo(s.board,84,76));assert(!pseudo(s.board,84,74));
});
test('opened elephant crosses river but its eye still blocks',()=>{
 const s=fixture();put(s,58,0,'E');assert(pseudo(s.board,58,38));put(s,48,0,'S');assert(!pseudo(s.board,58,38));s.board[48]=null;s.board[58].kind=null;s.board[58].role='E';assert(!pseudo(s.board,58,38));
});
test('horse leg, cannon screen, soldier river and backward movement',()=>{
 const s=fixture();put(s,64,0,'H');assert(pseudo(s.board,64,45));put(s,55,1,'S');assert(!pseudo(s.board,64,45));
 put(s,72,0,'C');put(s,54,1,'R');assert(!pseudo(s.board,72,54));put(s,63,1,null,'H');assert(pseudo(s.board,72,54));put(s,36,1,'R');assert(!pseudo(s.board,72,36));
 put(s,38,0,'S');assert(pseudo(s.board,38,37));assert(!pseudo(s.board,38,47));put(s,56,0,'S');assert(!pseudo(s.board,56,55));assert(pseudo(s.board,56,47));
});
test('king safety rejects facing generals and moves that fail to escape check',()=>{
 const s=fixture();put(s,49,0,'R');assert(!isChecked(s,0));assert(pseudo(s.board,49,48));assert(!legalUpMoves(s,49).some(m=>m.to===48));
 assert.throws(()=>applyUpMove(s,{from:49,to:48}),/không hợp lệ/);s.board[49]=null;assert(isChecked(s,0));
});
test('checkmate ends game and prevents further moves',()=>{
 const s=fixture();s.turn=1;put(s,75,1,'R');put(s,77,1,'R');put(s,67,1,'R');const n=applyUpMove(s,{from:67,to:76});
 assert.equal(n.winner,1);assert.match(n.reason,/Chiếu bí/);assert.equal(legalUpMoves(n).length,0);assert.throws(()=>applyUpMove(n,{from:85,to:84}));
});
test('stalemate is a loss even when the immobile general is not in check',()=>{
 const s=fixture();s.board[49]=null;put(s,40,1,'S');s.turn=1;put(s,66,1,'R');put(s,68,1,'R');put(s,72,1,'R');
 const n=applyUpMove(s,{from:72,to:73});assert(!isChecked(n,0));assert.equal(legalUpMoves(n).length,0);assert.equal(n.winner,1);assert.match(n.reason,/hết nước/);
});
test('bot uses only public information and never samples a hidden face',()=>{
 const s=newUpGame(),view=observeUp(s),before=structuredClone(view);const a=chooseUpMove(view,'smart');assert(legalUpMoves(s).some(m=>m.from===a.from&&m.to===a.to));assert.deepEqual(view,before);
 view.unseen[0].reverse();view.unseen[1].reverse();assert.deepEqual(chooseUpMove(view,'smart'),a);assert.equal(view.board.filter(p=>p?.kind===null).length,30);assert.equal('bags' in view,false);
 view.board[54].role='R';assert.equal(s.board[54].role,'S');
});
test('repeated public position three times draws; quiet and move limits also draw',()=>{
 let s=fixture();put(s,72,0,'R');put(s,9,1,'R');const cycle=[{from:72,to:73},{from:9,to:10},{from:73,to:72},{from:10,to:9}];
 for(let i=0;i<12&&s.winner===null;i++)s=applyUpMove(s,cycle[i%4]);assert.equal(s.winner,-1);assert.match(s.reason,/lặp 3 lần/);
 for(const limit of ['quiet','moves']){const f=fixture();put(f,72,0,'R');f[limit]=limit==='quiet'?119:399;const n=applyUpMove(f,{from:72,to:73});assert.equal(n.winner,-1);assert.match(n.reason,limit==='quiet'?/120/:/400/);}
});
test('invalid reveal index cannot mutate original game',()=>{
 const s=newUpGame(),copy=structuredClone(s);assert.throws(()=>applyUpMove(s,{from:54,to:45},()=>15));assert.deepEqual(s,copy);assert.throws(()=>secureIndex(0));assert.throws(()=>secureIndex(1.2));
});
test('simulated play preserves piece count, unique identities and undisclosed pool counts',()=>{
 let s=newUpGame();for(let turn=0;turn<90&&s.winner===null;turn++){
  const m=chooseUpMove(observeUp(s),turn%2?'smart':'easy');assert(m);s=applyUpMove(s,m,()=>0);
  const all=[...s.board.filter(Boolean),...s.captured.flat()];assert.equal(all.length,32);assert.equal(new Set(all.map(p=>p.id)).size,32);
  for(const side of [0,1]){assert.equal(all.filter(p=>p.side===side&&p.kind===null).length,s.bags[side].length);assert(s.bags[side].length<=15);}
 }
 assert(s.moves>10);
});
