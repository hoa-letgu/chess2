import test from 'node:test';
import assert from 'node:assert/strict';
import {newShogi,emptyHand,legalMoves,applyMove,attacks,isChecked,positionKey,chooseMove,declarationInfo,declareWin,HAND_ORDER} from './engine.ts';
const move=(from,to,promote=false)=>({type:'move',from,to,promote});
const drop=(kind,to)=>({type:'drop',kind,to});
function put(s,i,side,kind,promoted=false){s.board[i]={side,kind,promoted};}
function history(s){s.history=[{key:positionKey(s),turn:s.turn,checked:isChecked(s)}];return s;}
function blank(){const s=newShogi();s.board.fill(null);put(s,76,0,'K');put(s,0,1,'K');return history(s);}
function mating(){const s=blank();s.board[0]=null;put(s,4,1,'K');put(s,12,0,'R');put(s,14,0,'R');put(s,22,0,'G');s.hands[0].P=1;s.hands[0].G=1;return history(s);}
test('initial 9×9 setup: 40 pieces, correct bishop/rook orientation and 30 legal first moves',()=>{
 const s=newShogi();assert.equal(s.board.length,81);assert.equal(s.board.filter(Boolean).length,40);assert.equal(legalMoves(s).length,30);
 assert.equal(s.board[10].kind,'R');assert.equal(s.board[16].kind,'B');assert.equal(s.board[64].kind,'B');assert.equal(s.board[70].kind,'R');
 for(const side of [0,1]){assert.equal(s.board.filter(p=>p?.side===side).length,20);assert.deepEqual(s.hands[side],emptyHand());}
});
test('gold, silver and promoted minor pieces have correct oriented steps',()=>{
 const s=blank();put(s,40,0,'G');for(const i of [30,31,32,39,41,49])assert(attacks(s.board,40,i));for(const i of [48,50])assert(!attacks(s.board,40,i));
 put(s,40,0,'S');for(const i of [30,31,32,48,50])assert(attacks(s.board,40,i));for(const i of [39,41,49])assert(!attacks(s.board,40,i));
 for(const kind of ['P','L','N','S']){put(s,40,0,kind,true);assert(attacks(s.board,40,49));assert(!attacks(s.board,40,48));}
 put(s,40,1,'G');assert(attacks(s.board,40,48));assert(!attacks(s.board,40,30));
});
test('knight jumps forward over blockers, lance slides only forward, pawn captures straight',()=>{
 const s=blank();put(s,58,0,'N');put(s,49,0,'P');assert(attacks(s.board,58,39));assert(attacks(s.board,58,41));assert(!attacks(s.board,58,75));
 put(s,58,0,'L');assert(!attacks(s.board,58,40));s.board[49]=null;assert(attacks(s.board,58,13));assert(!attacks(s.board,58,67));
 put(s,58,0,'P');put(s,49,1,'S');assert(legalMoves(s,58).some(m=>m.to===49));assert(!attacks(s.board,58,48));
});
test('rook and bishop paths block; promoted major pieces gain one-step movement',()=>{
 const s=blank();put(s,40,0,'R');assert(attacks(s.board,40,13));assert(!attacks(s.board,40,30));put(s,31,1,'P');assert(!attacks(s.board,40,13));
 put(s,40,0,'R',true);assert(attacks(s.board,40,30));assert(!attacks(s.board,40,20));put(s,40,0,'B');assert(attacks(s.board,40,10));assert(!attacks(s.board,40,31));put(s,30,0,'P');assert(!attacks(s.board,40,10));
 put(s,40,0,'B',true);assert(attacks(s.board,40,31));assert(!attacks(s.board,40,22));
});
test('promotion offered on entering, within and leaving enemy camp',()=>{
 const s=blank();put(s,31,0,'P');assert.deepEqual(legalMoves(s,31).filter(m=>m.to===22).map(m=>m.promote),[false,true]);
 s.board[31]=null;put(s,22,0,'R');for(const to of [13,31])assert.deepEqual(legalMoves(s,22).filter(m=>m.to===to).map(m=>m.promote),[false,true]);
 put(s,40,0,'P');assert.deepEqual(legalMoves(s,40).filter(m=>m.to===31).map(m=>m.promote),[false]);
});
test('pawn/lance on final rank and knight on final two ranks must promote',()=>{
 for(const kind of ['P','L']){const s=blank();put(s,13,0,kind);assert.deepEqual(legalMoves(s,13).filter(m=>m.to===4).map(m=>m.promote),[true]);assert.throws(()=>applyMove(s,move(13,4,false)));}
 const s=blank();put(s,31,0,'N');assert(legalMoves(s,31).every(m=>m.promote));put(s,49,1,'N');s.turn=1;assert(legalMoves(s,49).every(m=>m.promote));
});
test('capture switches ownership into hand and removes promotion; drop is always unpromoted',()=>{
 const s=blank();put(s,40,0,'R');put(s,31,1,'S',true);const before=structuredClone(s);let n=applyMove(s,move(40,31));assert.equal(n.hands[0].S,1);assert.equal(n.board[31].side,0);assert.deepEqual(s,before);
 n.turn=0;n=applyMove(n,drop('S',50));assert.equal(n.board[50].side,0);assert(!n.board[50].promoted);assert.equal(n.hands[0].S,0);
});
test('nifu disallows two unpromoted pawns in one file, but tokin does not count',()=>{
 const s=newShogi();s.hands[0].P=1;assert.equal(legalMoves(s,'P').length,0);s.board[54].promoted=true;
 assert(legalMoves(s,'P').some(m=>m.to===36));assert(!legalMoves(s,'P').some(m=>m.to===37));
});
test('drops prohibit occupied squares, missing hand pieces and dead-end ranks on both sides',()=>{
 for(const side of [0,1]){const s=blank();s.turn=side;for(const kind of ['P','L','N']){s.hands[side][kind]=1;const m=legalMoves(s,kind);assert(m.length);assert(m.every(x=>{const r=Math.floor(x.to/9),d=side===0?r:8-r;return d>=(kind==='N'?2:1)&&!s.board[x.to];}));}}
 const s=blank();assert.throws(()=>applyMove(s,drop('G',40)));s.hands[0].G=1;assert(!legalMoves(s,'G').some(m=>m.to===76));
});
test('king safety rejects pinned moves and permits blocking check with a drop',()=>{
 const s=blank();put(s,4,1,'R');put(s,67,0,'G');assert(!isChecked(s));assert(!legalMoves(s,67).some(m=>m.to===66));s.board[67]=null;s.hands[0].G=1;assert(isChecked(s));assert(legalMoves(s,'G').some(m=>m.to===40));
 assert(!legalMoves(s,'G').some(m=>m.to===39));const n=applyMove(s,drop('G',40));assert(!isChecked(n,0));
});
test('uchifuzume: immediate pawn-drop mate is illegal, gold-drop mate is legal',()=>{
 const s=mating();assert(!isChecked(s,1));assert(!legalMoves(s,'P').some(m=>m.to===13));assert.throws(()=>applyMove(s,drop('P',13)));
 assert(legalMoves(s,'G').some(m=>m.to===13));const n=applyMove(s,drop('G',13));assert.equal(n.winner,0);assert.match(n.reason,/Chiếu bí/);assert.throws(()=>applyMove(n,move(4,3)));
});
test('checking pawn drop is legal if king can escape or another piece captures it',()=>{
 const s=mating();s.board[14]=null;assert(legalMoves(s,'P').some(m=>m.to===13));
 const defense=mating();put(defense,23,1,'S');assert(legalMoves(defense,'P').some(m=>m.to===13));const n=applyMove(defense,drop('P',13));assert(legalMoves(n,23).some(m=>m.to===13));
});
test('pawn move delivering mate is legal; only dropping a pawn is prohibited',()=>{
 const s=mating();put(s,22,0,'P');put(s,21,0,'G');put(s,23,0,'G');assert(legalMoves(s,22).some(m=>m.to===13&&!m.promote));const n=applyMove(s,move(22,13,false));assert.equal(n.winner,0);
});
test('kings cannot capture each other or move adjacent to opposing king',()=>{
 const s=blank();s.board[0]=null;put(s,58,1,'K');assert(!legalMoves(s,76).some(m=>m.to===67));assert(!legalMoves(s,76).some(m=>m.to===58));
});
test('fourfold repetition includes hands and turn; ordinary cycles draw',()=>{
 let s=blank();s.board[0]=null;put(s,4,1,'K');history(s);const key=positionKey(s);s.hands[0].P++;assert.notEqual(positionKey(s),key);s.hands[0].P--;
 const cycle=[move(76,75),move(4,3),move(75,76),move(3,4)];for(let n=0;n<12;n++)s=applyMove(s,cycle[n%4]);assert.equal(s.winner,-1);assert.match(s.reason,/Sennichite/);
});
test('the side giving every check in a fourfold cycle loses',()=>{
 let s=blank();s.board[0]=null;put(s,4,1,'K');put(s,13,0,'R');s.turn=1;history(s);const cycle=[move(4,3),move(13,12),move(3,4),move(12,13)];
 for(let n=0;n<12;n++)s=applyMove(s,cycle[n%4]);assert.equal(s.winner,1);assert.match(s.reason,/liên tục chiếu/);
});
function entering(){const s=blank();s.board.fill(null);put(s,13,0,'K');put(s,76,1,'K');[0,1,2,3,5,6,7,8,9,10].forEach((i,n)=>put(s,i,0,n<4?n%2?'B':'R':'P',n>=4));s.hands[0].G=2;return history(s);}
test('entering-king declaration counts only camp/hand, 28 Sente / 27 Gote points',()=>{
 const s=entering();assert.deepEqual(declarationInfo(s),{pieces:10,points:28,threshold:28,eligible:true});assert.equal(declareWin(s).winner,0);
 const g=entering();g.board=g.board.map((_,i)=>s.board[80-i]?{...s.board[80-i],side:1-s.board[80-i].side}:null);g.hands=[emptyHand(),emptyHand()];g.hands[1].G=1;g.turn=1;assert(declarationInfo(g).eligible);assert.equal(declarationInfo(g).points,27);
 s.hands[0].G=1;assert(!declarationInfo(s).eligible);assert.throws(()=>declareWin(s));s.hands[0].G=2;s.board[10]=null;assert(!declarationInfo(s).eligible);
});
test('declaration is forbidden in check and practice move limit draws',()=>{
 const s=entering();put(s,22,1,'R');assert(isChecked(s));assert(!declarationInfo(s).eligible);
 const n=blank();n.moves=511;assert.equal(applyMove(n,move(76,75)).winner,-1);
});
test('bot returns legal moves without mutation and finds an available drop mate',()=>{
 const s=newShogi(),copy=structuredClone(s);for(const level of ['easy','smart']){const m=chooseMove(s,level);assert(m);assert.doesNotThrow(()=>applyMove(s,m));}assert.deepEqual(s,copy);
 const m=mating(),best=chooseMove(m,'smart');assert.equal(applyMove(m,best).winner,0);
});
test('80 plies preserve all 40 pieces by kind, nonnegative hands and king safety',()=>{
 let s=newShogi();for(let ply=0;ply<80&&s.winner===null;ply++){
  const m=chooseMove(s,'easy');assert(m);const actor=s.turn;s=applyMove(s,m);assert(!isChecked(s,actor));
  const count={K:0,R:0,B:0,G:0,S:0,N:0,L:0,P:0};s.board.forEach(p=>{if(p)count[p.kind]++;});
  for(const side of [0,1])for(const k of HAND_ORDER){assert(Number.isInteger(s.hands[side][k])&&s.hands[side][k]>=0);count[k]+=s.hands[side][k];}
  assert.deepEqual(count,{K:2,R:2,B:2,G:4,S:4,N:4,L:4,P:18});
 }
 assert(s.moves>=10);
});
