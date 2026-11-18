import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaStore } from './store.js';
import { initialState, applyGameMove } from './games.js';
import { legalMoves, solution, PUZZLES, readCustomPosition } from './rules/cothe.js';

function setup(t,index=10){
 const s=new ArenaStore(':memory:');t.after(()=>s.close());
 const a=s.register('puzzle_red','password123').user,b=s.register('puzzle_black','password123').user;
 const m=s.create(a.id,{name:'Truc Lam Ky Tran',game:'cothe',stake:0,size:index});s.join(b.id,m.id);
 return {s,a,b,id:m.id};
}
function move(s,id,user,command){const m=s.match(id);return s.action(user.id,id,{type:'move',version:m.version,...command});}
test('online rooms enforce seats, versions, valid puzzles and free practice',t=>{
 const {s,a,b,id}=setup(t);const m=s.match(id);
 assert.equal(m.state.puzzleId,'tam-diep');assert.equal(m.state.limit,3);
 assert.throws(()=>move(s,id,b,{from:[2,4],to:[1,4]}),/lượt/);
 assert.throws(()=>move(s,id,a,{from:[9,4],to:[0,4]}),/hợp lệ/);
 assert.throws(()=>move(s,id,a,{from:[4,3],to:[NaN,3]}),/hợp lệ/);
 assert.throws(()=>s.action(a.id,id,{type:'move',version:0,from:[4,3],to:[2,3]}),/thay đổi/);
 assert.throws(()=>s.create(a.id,{game:'cothe',name:'No stake',stake:1,size:0}),/0 xu/);
 assert.throws(()=>initialState('cothe',99),/hợp lệ/);
 assert.throws(()=>initialState('cothe','10'),/hợp lệ/);
 assert.equal(s.match(id).version,m.version);
});
test('two human players finish a three-move puzzle with immutable state and stored results',t=>{
 const {s,a,b,id}=setup(t);const original=s.match(id).state;
 for(const [user,from,to] of [[a,[4,3],[2,3]],[b,[2,4],[1,4]],[a,[2,3],[1,3]],[b,[1,4],[0,4]],[a,[4,8],[0,8]]])move(s,id,user,{from,to,winner:1,board:[]});
 const finished=s.match(id);assert.equal(finished.status,'finished');assert.equal(finished.result.winner,0);assert.equal(finished.state.used,3);
 assert.equal(original.board[4][3],'R');assert.equal(s.publicUser(a.id).balance,0);assert.equal(s.ledger(a.id).length,0);
 assert.throws(()=>move(s,id,a,{from:[0,8],to:[1,8]}),/kết thúc/);
 assert.equal(s.match(id).version,finished.version);
});
test('black wins when red breaks continuous checks or exhausts the puzzle limit',()=>{
 const s=initialState('cothe',0);
 const quiet=legalMoves(s.board,0).find(m=>m.from[0]===9);
 assert.equal(applyGameMove('cothe',s,quiet).winner,1);
 const badCheck=legalMoves(s.board,0).map(m=>applyGameMove('cothe',s,m)).find(r=>r.winner===1&&r.reason.includes('hết số'));
 assert.ok(badCheck);
});
test('all online puzzles accept a winning attack with human defense turns',()=>{
 for(let index=0;index<PUZZLES.length;index++){
  let state=initialState('cothe',index),result;
  for(let turn=0;turn<6;turn++){
   const command=state.turn===0?solution(state.board,state.limit-state.used):legalMoves(state.board,1)[0];
   result=applyGameMove('cothe',state,command);state=result.state;if(result.winner!==null)break;
  }
  assert.equal(result.winner,0,PUZZLES[index].id);
 }
});

test('custom positions reject malformed boards, missing kings, illegal placements and excess material',()=>{
 const valid={title:'  Thế riêng  ',moves:1,board:structuredClone(PUZZLES[0].board)};
 const parsed=readCustomPosition(valid);assert.equal(parsed.title,'Thế riêng');assert.notEqual(parsed.board,valid.board);
 assert.ok(solution(parsed.board,1));
 for(const input of [null,{}, {...valid,title:''},{...valid,title:'x'.repeat(61)},{...valid,moves:4},{...valid,moves:'1'},{...valid,board:[[]]}])assert.throws(()=>readCustomPosition(input));
 const invalid=edit=>{const p=structuredClone(valid);edit(p.board);assert.throws(()=>readCustomPosition(p));};
 invalid(b=>{b[9][4]=null;});
 invalid(b=>{b[5][4]=null;}); // Flying generals.
 invalid(b=>{b[9][4]=null;b[8][2]='G';});
 invalid(b=>{b[7][1]='A';});
 invalid(b=>{b[4][4]='E';});
 invalid(b=>{b[6][1]='S';});
 invalid(b=>{b[8][0]='R';});
 invalid(b=>{b[7][7]='?';});
 assert.equal(valid.board[9][4],'G');
});
test('custom room state is server-derived, uses human defense and never holds coins',t=>{
 const s=new ArenaStore(':memory:');t.after(()=>s.close());
 const a=s.register('custom_red','password123').user,b=s.register('custom_black','password123').user;
 const puzzle={...PUZZLES[8],title:'Thế chia sẻ',winner:0,turn:1,used:100};
 let m=s.create(a.id,{name:'Custom',game:'cothe',stake:0,puzzle});
 assert.equal(m.state.title,'Thế chia sẻ');assert.equal(m.state.used,0);assert.equal(m.state.turn,0);assert.equal(m.state.puzzleId,'custom');
 assert.equal(m.state.winner,undefined);m=s.join(b.id,m.id);
 m=move(s,m.id,a,{from:[3,3],to:[1,3]});assert.equal(m.state.turn,1);
 m=move(s,m.id,b,{from:[1,4],to:[0,4]});assert.equal(m.state.turn,0);
 m=move(s,m.id,a,{from:[3,8],to:[0,8]});assert.equal(m.result.winner,0);
 assert.equal(s.ledger(a.id).length,0);
 assert.throws(()=>s.create(a.id,{name:'Bad custom',game:'cothe',stake:0,puzzle:{...puzzle,board:[]}}));
});
