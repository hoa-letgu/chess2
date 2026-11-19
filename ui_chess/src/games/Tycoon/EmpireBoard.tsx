import { BoardSurface } from '@/features/arena/MatchSurface';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowRight, Banknote, Building2, Car, CircleHelp, Crown, Dog, Flag, Hammer, Landmark, Leaf, LockKeyhole, Rocket, Settings, Sparkles, TrainFront, Volume2, VolumeX, Zap, ArrowDownToLine } from 'lucide-react';
import type { TycoonBeat } from './tycoon-motion';
import { BOARD, CARDS, GROUPS, TOKENS, money, ownsGroup, canBuild, canSell, canDowngrade, rentAt } from './engine';
import type { EmpireState, TileKind, Action } from './engine';
export type Travel = { player: number; position: number };
export function TokenIcon({id,size=18}:{id:number;size?:number}) { return <span aria-hidden="true" className="emp-chibi" style={{width:size*1.8,height:size*1.8,backgroundPosition:`${id%2*100}% ${Math.floor(id/2)*100}%`}}/>; }
export function TileIcon({kind,size=18}:{kind:TileKind;size?:number}) { const Icon = kind==='rail'?TrainFront:kind==='utility'?Zap:kind==='chance'?Sparkles:kind==='tax'?Landmark:kind==='start'?Flag:kind==='jail'||kind==='goJail'?LockKeyhole:kind==='park'?Leaf:Building2;return <Icon size={size}/>; }
const PIECES={car:Car,rocket:Rocket,dog:Dog,crown:Crown} as const;
function Piece({id}:{id:number}){const Icon=PIECES[TOKENS[id].symbol as keyof typeof PIECES];return <Icon aria-hidden="true"/>;}
const pieceStyle=(id:number)=>({'--c':TOKENS[id].color}as CSSProperties);
function Die({value,rolling}:{value:number;rolling:boolean}){
 const pips:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
 return <div className={`fb-die ${rolling?'rolling':''}`} role="img" aria-label={`Xúc xắc ${value} điểm`}>{Array.from({length:9},(_,i)=><i key={i} className={pips[value].includes(i)?'pip':''}/>)}</div>;
}
function boardCell(index:number):[number,number]{
 if(index<=8)return [9,9-index];if(index<=16)return [17-index,1];if(index<=24)return [1,index-15];return [index-23,9];
}
const tileNote=(t:typeof BOARD[number])=>t.kind==='city'||t.kind==='rail'||t.kind==='utility'?money(t.price):t.kind==='tax'?`−${money(t.price)}`:t.kind==='start'?'+$200':t.kind==='park'?'+$40':t.kind==='jail'?'Thăm tù':t.kind==='goJail'?'Vào tù':'';
export default function EmpireBoard({state,travel,selected,onSelect,faces,rolling,beat,onRoll,canRoll=false,onAction,canAct=false,onSettings,onRules}:{onAction?:(action:Action)=>void;canAct?:boolean;onSettings?:()=>void;onRules?:()=>void;onRoll?:()=>void;canRoll?:boolean;beat?:TycoonBeat|null;state:EmpireState;travel:Travel|null;selected:number;onSelect:(i:number)=>void;faces:[number,number];rolling:boolean}){
 const [showCard,setShowCard]=useState(false),[sound,setSound]=useState(false),audio=useRef<AudioContext|null>(null);
 useEffect(()=>{if(!sound||!beat||!audio.current)return;const ctx=audio.current,osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(beat.kind==='hop'?520:beat.kind==='dice'?210:740,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(beat.kind==='hop'?320:480,ctx.currentTime+.09);gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.start();osc.stop(ctx.currentTime+.13);},[beat,sound]);
 useEffect(()=>()=>{void audio.current?.close();},[]);
 const me=state.players[state.turn],tile=BOARD[selected],asset=state.assets[selected],landed=BOARD[me.position];
 const why=(ok:boolean,fn:()=>string)=>!canAct?'Chưa đến lượt':ok?'':fn();
 const mine=!!asset&&asset.owner===state.turn,managing=state.phase==='manage'||state.phase==='debt';
 const buyWhy=why(state.phase==='buy'&&me.cash>=landed.price,()=>state.phase!=='buy'?'Không có đất để mua':'Không đủ tiền');
 const buildWhy=why(canBuild(state,selected),()=>!mine?'Chọn ô của bạn':tile.kind!=='city'?'Chỉ xây ở ô phố':state.phase!=='manage'?'Xây sau khi xử lý ô':asset!.level>=3?'Đã xây tối đa':!ownsGroup(state,state.turn,selected)?'Cần đủ bộ màu':me.cash<tile.fee?'Không đủ tiền':'Xây đều các ô');
 const downWhy=why(canDowngrade(state,selected),()=>!mine?'Chọn ô của bạn':asset!.level===0?'Ô chưa có nhà':!managing?'Chưa đến lúc quản lý':'Bán nhà cao nhất trước');
 const sellWhy=why(canSell(state,selected),()=>!mine?'Chọn ô của bạn':asset!.level>0?'Bán hết nhà trước':!managing?'Chưa đến lúc quản lý':'Bán hết nhà cả cặp trước');
 const endWhy=why(state.phase==='manage'||state.phase==='buy',()=>state.phase==='roll'?'Tung xúc xắc trước':'Cần xử lý nợ');
 const rollWhy=rolling?'Đang tung…':canRoll?'':state.phase!=='roll'?'Đã tung rồi':'Chưa đến lượt';
 const cardWhy=state.lastCard===null?'Chưa có thẻ':'';
 const Act=({why:w,onClick,icon,label}:{why:string;onClick:()=>void;icon:React.ReactNode;label:string})=><button type="button" className="fb-act" disabled={!!w} title={w||label} onClick={onClick}>{icon}<span>{label}</span>{w&&<small>{w}</small>}</button>;
 const rent=asset?rentAt(state,selected):tile.kind==='city'?tile.rent:0;
 return <BoardSurface className="emp-board-shell emp-flat">
  <div className="fb-layout">
   <div className="fb-top"><span className="emp-scene-asset sprite-5 fb-mascot" aria-hidden="true"/><strong className="fb-logo">Cờ Tỷ Phú</strong><span className="fb-round">Vòng {state.round}/{state.maxRounds}</span>
    <div className="fb-tools">
     {onSettings&&<button type="button" onClick={onSettings} aria-label="Cài đặt" title="Cài đặt"><Settings/></button>}
     <button type="button" aria-pressed={sound} aria-label={sound?'Tắt âm thanh':'Bật âm thanh'} title="Âm thanh" onClick={()=>{if(!sound){audio.current??=new AudioContext();void audio.current.resume();}setSound(!sound);}}>{sound?<Volume2/>:<VolumeX/>}</button>
     {onRules&&<button type="button" onClick={onRules} aria-label="Luật chơi" title="Luật chơi"><CircleHelp/></button>}
    </div></div>
   <div className="fb-players">{state.players.map(p=><div key={p.id} className={`fb-player ${p.id===state.turn?'current':''} ${!p.alive?'out':''}`} style={pieceStyle(p.id)}>
    <span className="fb-piece"><Piece id={p.id}/></span>
    <div><strong>{p.name}{p.id===state.turn&&state.phase!=='finished'?<em> · đang đi</em>:''}{!p.alive?<em> · phá sản</em>:''}</strong><b><AnimatedCash value={p.cash}/></b>
     {beat?.delta?.[p.id]?<i key={state.revision} className={`fb-delta ${beat.delta[p.id]>0?'gain':'loss'}`}>{beat.delta[p.id]>0?'+':'−'}{money(Math.abs(beat.delta[p.id]))}</i>:null}</div>
    <small>{TOKENS[p.id].name} · {state.assets.filter(a=>a?.owner===p.id).length} ô</small></div>)}</div>
   <div className="fb-board" data-tycoon-phase={beat?.kind??'idle'} role="group" aria-label="Bàn Cờ tỷ phú 32 ô">
    <div className="fb-center">
     <div className="fb-title">Cờ Tỷ Phú</div>
     <div className="fb-dice"><Die value={faces[0]} rolling={rolling}/><Die value={faces[1]} rolling={rolling}/></div>
     <div className="fb-sum" aria-live="polite">{rolling?'Đang tung…':state.rolls>0?`${faces[0]} + ${faces[1]} = ${faces[0]+faces[1]}`:'Hãy tung xúc xắc'}</div>
     <button type="button" className="fb-roll" aria-label="Gieo hai xúc xắc" disabled={!canRoll} onClick={onRoll}>Tung xúc xắc{rollWhy&&<small>{rollWhy}</small>}</button>
     <div className="fb-sub">Qua Xuất phát +$200 · Tiền riêng trong ván</div>
    </div>
    {(beat?.kind==='card'||showCard)&&state.lastCard!==null&&<div className="fb-overlay" key={state.revision} onClick={()=>setShowCard(false)}><span>THẺ CƠ HỘI</span><strong>{CARDS[state.lastCard].title}</strong><p>{CARDS[state.lastCard].text}</p></div>}
    {beat?.kind==='jail'&&<div className="fb-overlay"><LockKeyhole size={40}/><strong>Tạm nghỉ một lượt!</strong></div>}
    {beat?.kind==='win'&&<div className="fb-overlay">🏆<strong>{state.winners.map(id=>state.players[id].name).join(' & ')} chiến thắng!</strong></div>}
    {BOARD.map((t,i)=>{
     const [row,column]=boardCell(i),a=state.assets[i],people=state.players.filter(p=>p.alive&&(travel?.player===p.id?travel.position:p.position)===i),side=i%8===0?'corner':i<8?'b':i<16?'l':i<24?'t':'r';
     return <button key={i} data-tycoon-tile={i} type="button" className={`fb-tile kind-${t.kind} side-${side} ${a&&ownsGroup(state,a.owner,i)?'complete-set':''} ${beat?.tile===i?'fb-pop':''} ${selected===i?'is-inspected':''} ${people.some(p=>p.id===state.turn)?'has-turn':''}`} style={{gridRow:row,gridColumn:column,'--district':t.group>=0?GROUPS[t.group].color:'transparent','--owner':a?TOKENS[a.owner].color:'transparent'}as CSSProperties} onClick={()=>onSelect(i)} aria-label={`Ô ${i}: ${t.name}${t.price?`, ${money(t.price)}`:''}${a?`, của ${state.players[a.owner].name}, cấp ${a.level}`:['city','rail','utility'].includes(t.kind)?', chưa có chủ':''}${people.length?`, ${people.map(p=>p.name).join(', ')} đang ở đây`:''}`} aria-pressed={selected===i}>
      {t.kind==='city'&&<span className="fb-band">{a&&a.level>=3?<Building2 className="fb-hotel"/>:a?Array.from({length:a.level},(_,h)=><i className="fb-house" key={h}/>):null}</span>}
      <span className="fb-body">{t.kind==='chance'?<b className="fb-q">?</b>:t.kind!=='city'&&<TileIcon kind={t.kind}/>}<strong>{t.name}</strong><small>{tileNote(t)}</small></span>
      {a&&<span className="fb-ownerbar" aria-hidden="true"/>}
      <span className="fb-tokens">{people.map(p=><span key={p.id} data-tycoon-player={p.id} className={`fb-token ${beat?.kind==='hop'&&beat.actor===p.id?'hopping':''} ${p.jailed?'jailed':''} ${p.id===state.turn?'active':''}`} style={pieceStyle(p.id)} title={p.name}><Piece id={p.id}/></span>)}</span>
     </button>;
    })}
   </div>
   <div className="fb-side">
    <section className="fb-card fb-info" style={{'--district':tile.group>=0?GROUPS[tile.group].color:'#b9a8cc'}as CSSProperties}>
     <h3>{tile.name}</h3><small>{tile.group>=0?GROUPS[tile.group].name:tile.tag}</small>
     {tile.kind==='city'||tile.kind==='rail'||tile.kind==='utility'?<dl>
      <div><dt>Giá mua</dt><dd>{money(tile.price)}</dd></div>
      <div><dt>{asset?'Tiền thuê':'Thuê cơ bản'}</dt><dd>{tile.kind==='utility'&&!asset?'4× xúc xắc':money(tile.kind==='rail'&&!asset?25:rent)}</dd></div>
      <div><dt>Chủ sở hữu</dt><dd>{asset?<><span className="fb-dot" style={{background:TOKENS[asset.owner].color}}/>{state.players[asset.owner].name}</>:'Chưa có chủ'}</dd></div>
      {tile.kind==='city'&&<div><dt>Nhà</dt><dd>{asset?.level??0} / 3 · xây {money(tile.fee)}</dd></div>}
     </dl>:<p>{tileNote(tile)||'Ô đặc biệt'}</p>}
    </section>
    <section className="fb-card fb-log"><h3>Nhật ký lượt</h3><ol aria-live="polite">{state.logs.slice(0,6).map((l,i)=><li key={`${state.rolls}-${i}-${l}`}>{l}</li>)}</ol></section>
   </div>
   <div className="fb-dock">
    <Act why={buyWhy} icon={<Banknote/>} label="Mua đất" onClick={()=>onAction?.({type:'buy'})}/>
    <Act why={buildWhy} icon={<Hammer/>} label="Xây nhà" onClick={()=>onAction?.({type:'build',tile:selected})}/>
    <Act why={downWhy} icon={<ArrowDownToLine/>} label="Bán nhà" onClick={()=>onAction?.({type:'downgrade',tile:selected})}/>
    <Act why={sellWhy} icon={<Banknote/>} label="Bán đất" onClick={()=>onAction?.({type:'sell',tile:selected})}/>
    <Act why={cardWhy} icon={<Sparkles/>} label="Thẻ cơ hội" onClick={()=>setShowCard(!showCard)}/>
    <Act why={endWhy} icon={<ArrowRight/>} label={state.phase==='buy'?'Bỏ qua':'Hết lượt'} onClick={()=>onAction?.({type:state.phase==='buy'?'pass':'end'})}/>
   </div>
  </div>
 </BoardSurface>;
}

function AnimatedCash({value}:{value:number}){
 const current=useRef(value),[shown,setShown]=useState(value);
 useEffect(()=>{
  const from=current.current,start=performance.now();let frame:number;
  const tick=(now:number)=>{const t=matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(now-start)/650);current.current=Math.round(from+(value-from)*(1-(1-t)**3));setShown(current.current);if(t<1)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[value]);
 return <span aria-label={money(value)}>{money(shown)}</span>;
}
