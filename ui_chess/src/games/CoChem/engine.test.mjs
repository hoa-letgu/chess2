import test from 'node:test';
import assert from 'node:assert/strict';
import { applyChemMove, chooseChemMove, countPieces, forcedMoves, ganhAt, legalMoves, neighbors, newChemGame, surrounded } from './engine.ts';
function fixture(){const s=newChemGame();s.board.fill(null);s.history=[];return s;}
test('initial board contains eight pieces per side and nine free points',()=>{
  const s=newChemGame();assert.equal(countPieces(s,0),8);assert.equal(countPieces(s,1),8);assert.equal(s.board.filter(c=>c===null).length,9);assert.ok(legalMoves(s).length>0);assert.equal(s.turn,0);
});
test('graph is symmetric; diagonal edges exist only at even parity nodes',()=>{
  assert.deepEqual(new Set(neighbors(0)),new Set([1,5,6]));assert.deepEqual(new Set(neighbors(1)),new Set([0,2,6]));assert.equal(neighbors(12).length,8);assert.equal(neighbors(7).length,4);assert.deepEqual(neighbors(30),[]);
  for(let i=0;i<25;i++)for(const j of neighbors(i)){assert.ok(neighbors(j).includes(i));assert.ok(j>=0&&j<25);}
});
test('only own pieces may move one connected step into an empty point',()=>{
  const s=newChemGame();assert.throws(()=>applyChemMove(s,{from:0,to:6}));assert.throws(()=>applyChemMove(s,{from:20,to:21}));assert.throws(()=>applyChemMove(s,{from:15,to:7}));
  const before=structuredClone(s),next=applyChemMove(s,{from:15,to:16});assert.equal(next.board[15],null);assert.equal(next.board[16],0);assert.equal(next.turn,1);assert.deepEqual(s,before);
});
test('ganh converts opposed pairs around the moved piece, not a bracketed single piece',()=>{
  const s=fixture();s.board[7]=0;s.board[22]=0;s.board[11]=1;s.board[13]=1;s.board[0]=1;
  const next=applyChemMove(s,{from:7,to:12});assert.deepEqual(new Set(next.ganh),new Set([11,13]));assert.equal(next.board[11],0);assert.equal(next.board[13],0);assert.equal(next.board[0],1);assert.equal(next.board.filter(x=>x!==null).length,5);
  const board=Array(25).fill(null);board[12]=0;board[11]=1;board[10]=0;assert.deepEqual(ganhAt(board,12,0),[]);
});
test('one move may ganh horizontal and diagonal pairs simultaneously',()=>{
  const s=fixture();s.board[7]=0;for(const i of [11,13,6,18,0])s.board[i]=1;
  const next=applyChemMove(s,{from:7,to:12});assert.deepEqual(new Set(next.ganh),new Set([11,13,6,18]));assert.equal(next.converted.length,4);
});
test('odd parity points cannot capture across undrawn diagonal edges',()=>{
  const b=Array(25).fill(null);b[7]=0;b[1]=1;b[13]=1;assert.deepEqual(ganhAt(b,7,0),[]);
});
test('vay flips an entire enemy group when its final connected liberty is closed',()=>{
  const s=fixture();for(const i of [2,5,7])s.board[i]=0;for(const i of [0,1,24])s.board[i]=1;
  const next=applyChemMove(s,{from:7,to:6});assert.deepEqual(new Set(next.vay),new Set([0,1]));assert.equal(next.board[24],1);
});
test('diagonal liberties keep an otherwise blocked corner group alive',()=>{
  const b=Array(25).fill(null);b[0]=1;b[1]=0;b[5]=0;assert.deepEqual(surrounded(b,1),[]);b[6]=0;assert.deepEqual(surrounded(b,1),[0]);
});
test('mo forces a ganh response into the last vacated point; can be disabled',()=>{
  for(const enabled of [true,false]){
    const s=fixture();s.useMo=enabled;for(const i of [11,12,13])s.board[i]=0;for(const i of [17,24])s.board[i]=1;
    const opened=applyChemMove(s,{from:12,to:7});assert.deepEqual(opened.converted,[]);
    if(enabled){assert.deepEqual(forcedMoves(opened),[{from:17,to:12}]);assert.deepEqual(legalMoves(opened),[{from:17,to:12}]);assert.throws(()=>applyChemMove(opened,{from:24,to:23}));}
    else{assert.deepEqual(forcedMoves(opened),[]);assert.ok(legalMoves(opened).some(m=>m.from===24&&m.to===23));}
    const answer=applyChemMove(opened,{from:17,to:12});assert.equal(answer.board[11],1);assert.equal(answer.board[13],1);
  }
});
test('converting all opposing pieces wins and forbids later moves',()=>{
  const s=fixture();s.board[7]=0;s.board[11]=1;s.board[13]=1;
  const next=applyChemMove(s,{from:7,to:12});assert.equal(next.winner,0);assert.equal(countPieces(next,1),0);assert.deepEqual(legalMoves(next),[]);assert.throws(()=>applyChemMove(next,{from:12,to:7}));
});
test('threefold position repetition draws, including side to move',()=>{
  for(const mo of [true,false]){let s=newChemGame(mo);
    for(let cycle=0;cycle<2;cycle++)for(const m of [{from:15,to:16},{from:9,to:8},{from:16,to:15},{from:8,to:9}])s=applyChemMove(s,m);
    assert.equal(s.winner,-1);assert.ok(s.reason.includes('3 lần'));
  }
});
test('bots select legal moves and prefer an immediate win',()=>{
  const s=fixture();s.board[7]=0;s.board[11]=1;s.board[13]=1;
  for(const level of ['easy','smart']){const m=chooseChemMove(s,level);assert.ok(legalMoves(s).some(x=>x.from===m.from&&x.to===m.to));assert.equal(applyChemMove(s,m).winner,0);}
});
test('complete simulated games preserve sixteen pieces and terminate',()=>{
  for(const mo of [true,false]){
    let s=newChemGame(mo),i=0;
    while(s.winner===null&&i++<201){const m=chooseChemMove(s,'easy');assert.ok(m);s=applyChemMove(s,m);assert.equal(s.board.filter(x=>x!==null).length,16);assert.equal(countPieces(s,0)+countPieces(s,1),16);}
    assert.ok([-1,0,1].includes(s.winner));
  }
});
