import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, legalMoves, checked, play, solution, analyze, sameMove } from './engine.ts';
const empty=()=>Array.from({length:10},()=>Array(9).fill(null));
function bare(){const board=empty();board[0][4]='g';board[9][4]='G';board[5][4]='S';return board;}
const contains=(board,from,to)=>legalMoves(board,0).some(move=>sameMove(move,{from,to}));
for(const puzzle of PUZZLES)test(`${puzzle.id}: valid starting position and proven checkmate against every legal defense`,()=>{
  assert.equal(checked(puzzle.board,0),false);assert.equal(checked(puzzle.board,1),false);
  assert.equal(puzzle.board.flat().filter(piece=>piece==='G').length,1);assert.equal(puzzle.board.flat().filter(piece=>piece==='g').length,1);
  if(puzzle.moves>1)assert.equal(solution(puzzle.board,puzzle.moves-1),null);
  function verify(board,left){const move=solution(board,left);assert.ok(move);assert.ok(legalMoves(board,0).some(candidate=>sameMove(candidate,move)));const next=play(board,move);assert.equal(checked(next,1),true);const replies=legalMoves(next,1);if(!replies.length)return;assert.ok(left>1);for(const reply of replies){const response=play(next,reply);assert.equal(checked(response,1),false);verify(response,left-1);}}
  verify(puzzle.board,puzzle.moves);
});
test('horse legs, cannon screens, river restrictions, palace and exposed kings follow xiangqi rules',()=>{
  const b=bare();b[5][2]='H';b[4][2]='S';assert.equal(contains(b,[5,2],[3,3]),false);b[4][2]=null;assert.equal(contains(b,[5,2],[3,3]),true);
  b[5][0]='C';b[1][0]='r';b[3][0]='S';assert.equal(contains(b,[5,0],[1,0]),true);b[2][0]='s';assert.equal(contains(b,[5,0],[1,0]),false);
  const e=bare();e[5][2]='E';assert.equal(contains(e,[5,2],[3,0]),false);e[5][2]=null;e[7][2]='E';assert.equal(contains(e,[7,2],[5,0]),true);
  const s=bare();s[6][2]='S';assert.equal(contains(s,[6,2],[6,3]),false);s[6][2]=null;s[4][2]='S';assert.equal(contains(s,[4,2],[4,3]),true);
  assert.equal(contains(s,[9,4],[9,6]),false);s[5][4]=null;assert.equal(checked(s,0),true);assert.equal(checked(s,1),true);
});
test('legal move generation never permits capturing a king or exposing your own king',()=>{
  for(const puzzle of PUZZLES)for(const army of [0,1])for(const move of legalMoves(puzzle.board,army)){
    const next=play(puzzle.board,move);assert.equal(checked(next,army),false);assert.ok(next.flat().includes('G'));assert.ok(next.flat().includes('g'));
  }
});
test('analysis accepts distinct winning moves and exposes a real defense to a failed attempt',()=>{
  const puzzle=PUZZLES.find(p=>p.id==='binh-lam');
  assert.equal(analyze(puzzle.board,{from:[1,3],to:[0,3]},1).status,'won');
  assert.equal(analyze(puzzle.board,{from:[1,0],to:[0,0]},1).status,'won');
  const p=PUZZLES[0];assert.equal(analyze(p.board,{from:[2,8],to:[3,8]},1).status,'failed');
  assert.throws(()=>analyze(p.board,{from:[2,8],to:[3,7]},1),/không hợp lệ/);
});
test('analysis plays a legal defense on multi-move puzzles and preserves the original board',()=>{
  const puzzle=PUZZLES.find(p=>p.id==='tam-diep'),original=JSON.stringify(puzzle.board);let board=puzzle.board;
  for(let remaining=puzzle.moves;remaining>0;remaining--){const move=solution(board,remaining);assert.ok(move);const result=analyze(board,move,remaining);if(result.status==='won'){assert.equal(legalMoves(result.board,1).length,0);break;}assert.equal(result.status,'continue');assert.ok(result.reply);assert.equal(checked(result.board,1),false);board=result.board;}
  assert.equal(JSON.stringify(puzzle.board),original);
});
