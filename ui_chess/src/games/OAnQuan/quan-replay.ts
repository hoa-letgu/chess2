import { playQuan } from './engine.ts';
import type { Frame, QuanState } from './engine.ts';
export type QuanBeat={kind:'pickup'|'sow'|'capture'|'quan'|'settle'|'refill';from:number|null;to:number|null;actor:0|1;points:number;count:number;duration:number;before:Frame;after:Frame};
const frameOf=(s:QuanState):Frame=>({pits:[...s.pits],quan:[...s.quan],scores:[...s.scores],focus:null,hand:0,text:''});
const key=(s:Pick<QuanState,'pits'|'quan'|'scores'>)=>JSON.stringify([s.pits,s.quan,s.scores]);
export function quanReplay(before:QuanState,after:QuanState):QuanBeat[]{
 const move=after.lastMove;
 if(!move||after.moves!==before.moves+1||move.number!==after.moves||move.actor!==before.turn)return [];
 let replay;try{replay=playQuan(before,move.pit,move.direction);}catch{return [];}
 if(key(replay.state)!==key(after)||replay.state.turn!==after.turn||replay.state.finished!==after.finished)return [];
 let previous=frameOf(before),pickup=0;
 return replay.frames.map(frame=>{
  const focus=frame.focus,points=frame.scores[move.actor]-previous.scores[move.actor];
  const isPickup=frame.hand>previous.hand;
  const captured=focus!==null&&points>0;
  const quan=captured&&previous.quan[focus!]&&!frame.quan[focus!];
  const kind:QuanBeat['kind']=isPickup?'pickup':captured?quan?'quan':'capture':frame.hand<previous.hand?'sow':frame.scores.some((n,i)=>n<previous.scores[i])?'refill':'settle';
  const duration=isPickup?(pickup++?200:300):kind==='sow'?150:kind==='quan'?900:kind==='capture'?500:250;
  const beat={kind,from:isPickup||captured?focus:previous.focus,to:kind==='sow'?focus:null,actor:move.actor,points:Math.max(0,points),count:isPickup?frame.hand:captured?previous.pits[focus!]:1,duration,before:previous,after:frame};previous=frame;return beat;
 });
}
