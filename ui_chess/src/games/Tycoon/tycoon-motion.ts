import type { EmpireState } from './engine';
export type TycoonBeat = { state: EmpireState; kind: 'dice'|'hop'|'card'|'jail'|'buy'|'build'|'money'|'turn'|'win'; duration: number; actor: number; delta?: number[]; tile?:number };
// Only consecutive confirmed actions animate. Reconnect snapshots never invent moves.
export function tycoonBeats(before:EmpireState, after:EmpireState):TycoonBeat[]{
 if(!after.lastAction || (after.revision??0)!==(before.revision??0)+1 || after.players.length!==before.players.length)return [];
 const actor=before.turn, beats:TycoonBeat[]=[], action=after.lastAction;
 const add=(state:EmpireState,kind:TycoonBeat['kind'],duration:number,extra:Partial<TycoonBeat>={})=>beats.push({state,kind,duration,actor,...extra});
 let display=before;
 if(action.type==='roll'){
  add({...before,dice:after.dice},'dice',1000);
  if(!before.players[actor].jailed){
   for(let step=1;step<=after.dice[0]+after.dice[1];step++){
    display={...before,dice:after.dice,players:before.players.map(p=>p.id===actor?{...p,position:(p.position+step)%32}:p)};
    add(display,'hop',150);
   }
  }
  if(after.lastCard!==null)add({...display,lastCard:after.lastCard},'card',800);
  if(after.players[actor].jailed)add({...display,players:display.players.map(p=>p.id===actor?{...p,position:8,jailed:true}:p)},'jail',850);
 }
 const delta=after.players.map((p,i)=>p.cash-before.players[i].cash);
 if(action.type==='buy'||action.type==='build')add(after,action.type,650,{tile:action.type==='build'?action.tile:after.players[actor].position,delta});
 else if(delta.some(Boolean))add(after,'money',750,{delta});
 if(after.phase==='finished')add(after,'win',1400);
 else if(before.turn!==after.turn)add(after,'turn',450);
 return beats;
}
