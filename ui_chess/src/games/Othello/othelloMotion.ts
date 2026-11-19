import { playMove } from './engine.ts';
import type { OthelloState } from './engine.ts';
export type OthelloBeat={state:OthelloState;duration:number;kind:'flip'|'score'|'win';motion:OthelloState['last']};
export const flipDelay=(at:number,i:number)=>180+(Math.max(Math.abs(Math.floor(i/8)-Math.floor(at/8)),Math.abs(i%8-at%8))-1)*60;
export function othelloBeats(before:OthelloState,after:OthelloState):OthelloBeat[]{
 if(after.moves!==before.moves+1||!after.last)return [];
 try{const expected=playMove(before,after.last.at);if(JSON.stringify(expected.board)!==JSON.stringify(after.board))return [];}catch{return [];}
 const duration=Math.max(...after.last.flips.map(i=>flipDelay(after.last!.at,i)))+280;
 const beats:OthelloBeat[]=[{kind:'flip',state:before,duration,motion:after.last},{kind:'score',state:after,duration:300,motion:null}];
 if(after.winner!==null)beats.push({kind:'win',state:after,duration:1500,motion:null});
 return beats;
}
