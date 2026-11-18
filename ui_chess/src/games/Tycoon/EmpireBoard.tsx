import { BoardSurface } from '@/features/arena/MatchSurface';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowUpRight, Building2, Flag, HandCoins, Landmark, Leaf, LockKeyhole, Sparkles, TrainFront, Zap, Settings, Volume2, VolumeX, Star, Users, Hammer, Banknote, ArrowRight, CircleHelp } from 'lucide-react';
import type { TycoonBeat } from './tycoon-motion';
import { BOARD, CARDS, GROUPS, TOKENS, money, ownsGroup, canBuild, canSell, canDowngrade } from './engine';
import type { EmpireState, TileKind, Action } from './engine';
export type Travel = { player: number; position: number };
export function TokenIcon({id,size=18}:{id:number;size?:number}) { return <span aria-hidden="true" className="emp-chibi" style={{width:size*1.8,height:size*1.8,backgroundPosition:`${id%2*100}% ${Math.floor(id/2)*100}%`}}/>; }
export function TileIcon({kind,size=18}:{kind:TileKind;size?:number}) { const Icon = kind==='rail'?TrainFront:kind==='utility'?Zap:kind==='chance'?Sparkles:kind==='tax'?Landmark:kind==='start'?Flag:kind==='jail'||kind==='goJail'?LockKeyhole:kind==='park'?Leaf:Building2;return <Icon size={size}/>; }
export function Skyline(){return <svg className="emp-skyline" viewBox="0 0 700 350" fill="none" aria-hidden="true"><defs><linearGradient id="emp-tower" x1="0" y1="0" x2="0.6" y2="1"><stop stopColor="#397888"/><stop offset="1" stopColor="#142d42"/></linearGradient><linearGradient id="emp-beam" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#80ead7" stopOpacity=".5"/><stop offset="1" stopColor="#80ead7" stopOpacity="0"/></linearGradient><pattern id="emp-windows" width="14" height="17" patternUnits="userSpaceOnUse"><rect x="4" y="5" width="3" height="5" fill="#8ae7d0" opacity=".42"/></pattern></defs><ellipse cx="350" cy="303" rx="280" ry="27" fill="#65dcb5" opacity=".08"/><path d="M80 280V142h46v-28h39v166m18 0V82h57v198m12 0V175h45v105m15 0V60h22V38h10V8h3v30h10v22h22v220m16 0V127h28v-21h24v21h26v153m12 0V94l18-36v-8h5v8l18 36v186m15 0V173h63v107m13 0V142h35v-30h31v168" fill="url(#emp-tower)"/><path d="M94 280V156h58v124m43 0V94h33v186m95 0V72h45v208m45 0V142h49v138m27 0V105h25v175m28 0V185h38v95m38 0V158h39v122" fill="url(#emp-windows)"/><path d="M296 281V110h24V63h30v47h25v171M456 282V132l27-43 27 43v150" stroke="#a0eee0" strokeOpacity=".24"/><path d="M196 87h40m-36 8h32m79-32h59m99 49h29" stroke="#aceedc" strokeOpacity=".5"/><path d="M337 0 290 282h94Z" fill="url(#emp-beam)" opacity=".15"/><path d="M40 283H660" stroke="#76c9bb" strokeOpacity=".25"/><path d="m120 320 230-38 230 38-230 20Z" fill="#3a7a7944"/><path d="m120 320 230-38 230 38-230 20Z" stroke="#73d9be55"/><path d="m200 318 150-26 150 26m-210 14 60-40 60 40" stroke="#6fd2bc33"/><g fill="#c2ecda"><circle cx="117" cy="60" r="1.5"/><circle cx="250" cy="30" r="1"/><circle cx="525" cy="45" r="1.5"/><circle cx="586" cy="91" r="1"/></g></svg>;}
export function Dice({value,rolling}:{value:number;rolling:boolean}){
 const pips:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
 return <div className={`emp-die ${rolling?'rolling':''}`} role="img" aria-label={`Xúc xắc ${value} điểm`}>{Array.from({length:9},(_,i)=><i key={i} className={pips[value].includes(i)?'pip':''}/>)}</div>;
}
function boardCell(index:number):[number,number]{
 if(index<=8)return [9,9-index];if(index<=16)return [17-index,1];if(index<=24)return [1,index-15];return [index-23,9];
}
export default function EmpireBoard({state,travel,selected,onSelect,faces,rolling,beat,onRoll,canRoll=false,onAction,canAct=false,onSettings,onRules}:{onAction?:(action:Action)=>void;canAct?:boolean;onSettings?:()=>void;onRules?:()=>void;onRoll?:()=>void;canRoll?:boolean;beat?:TycoonBeat|null;state:EmpireState;travel:Travel|null;selected:number;onSelect:(i:number)=>void;faces:[number,number];rolling:boolean}){
 const [showEffects,setShowEffects]=useState(()=>window.innerWidth>900),[showPlayers,setShowPlayers]=useState(true),[showCard,setShowCard]=useState(false);
 const [sound,setSound]=useState(false),audio=useRef<AudioContext|null>(null);
 useEffect(()=>{if(!sound||!beat||!audio.current)return;const ctx=audio.current,osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(beat.kind==='hop'?520:beat.kind==='dice'?210:740,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(beat.kind==='hop'?320:480,ctx.currentTime+.09);gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.start();osc.stop(ctx.currentTime+.13);},[beat,sound]);
 useEffect(()=>()=>{void audio.current?.close();},[]);
 return <BoardSurface className={`emp-board-shell emp-isometric ${showEffects?'with-effects':''} ${showPlayers?'with-players':''}`}>
  <div className="emp-scene-logo"><span>♛</span><strong>Cờ Tỷ Phú</strong><i>⚄</i></div>
  <div className="emp-scene-tools">
   {onSettings&&<button onClick={onSettings}><Settings/><span>Cài đặt</span></button>}
   <button aria-pressed={sound} aria-label={sound?'Tắt âm thanh':'Bật âm thanh'} onClick={()=>{if(!sound){audio.current??=new AudioContext();void audio.current.resume();}setSound(!sound);}}>{sound?<Volume2/>:<VolumeX/>}<span>Âm thanh</span></button>
   <button aria-pressed={showPlayers} onClick={()=>setShowPlayers(!showPlayers)}><Users/><span>Người chơi</span></button>
   <button aria-pressed={showEffects} onClick={()=>setShowEffects(!showEffects)}><Star/><span>Hiệu ứng</span></button>
   {onRules&&<button onClick={onRules}><CircleHelp/><span>Luật chơi</span></button>}
  </div><div className="emp-board" data-tycoon-phase={beat?.kind??'idle'} role="group" aria-label="Bàn Cờ tỷ phú hình thoi 32 ô">
  <span className="emp-scene-asset emp-scene-prop prop-hotel sprite-1" aria-hidden="true"/><span className="emp-scene-asset emp-scene-prop prop-house sprite-0" aria-hidden="true"/><span className="emp-scene-asset emp-scene-prop prop-shop sprite-2" aria-hidden="true"/><span className="emp-scene-asset emp-scene-prop prop-chest sprite-4" aria-hidden="true"/><div className="emp-board-center">
   <div className="emp-market">✦ WONDER CITY <span>Vòng {state.round}/{state.maxRounds}</span></div>
   <div className="emp-center-copy"><span>CHUYẾN PHIÊU LƯU TỶ PHÚ</span><h2>Cờ Tỷ Phú</h2><p>Mua phố nhỏ · Xây ước mơ lớn</p></div>
   <div className="emp-city-scenery"><Skyline/></div>
   <div className="emp-hero-character"><TokenIcon id={state.turn} size={70}/></div>
   <div className="emp-center-bottom"><div className="emp-city-card"><Sparkles/><span>THẺ<br/><strong>CƠ HỘI</strong></span></div><button type="button" className="emp-roll-control" aria-label="Gieo hai xúc xắc" disabled={!canRoll} onClick={onRoll}><span className="emp-dice-pair"><Dice value={faces[0]} rolling={rolling}/><Dice value={faces[1]} rolling={rolling}/></span><strong>{rolling?'Đang tung…':'Xúc xắc'}</strong></button><div className="emp-center-round"><small>TỔNG ĐIỂM</small><strong>{faces[0]+faces[1]}</strong></div></div>
   <div className="emp-center-caption"><HandCoins size={12}/><span>Qua Xuất phát +$200 · Tiền riêng trong ván</span></div>
   {(beat?.kind==='card'||showCard)&&state.lastCard!==null&&<div className="emp-mystery" key={state.revision} onClick={()=>setShowCard(false)}><span>✦ THẺ CƠ HỘI ✦</span><strong>{CARDS[state.lastCard].title}</strong><p>{CARDS[state.lastCard].text}</p></div>}
   {beat?.kind==='jail'&&<div className="emp-jail-overlay">☁<span>▥</span><strong>Tạm nghỉ một lượt!</strong></div>}
   {beat?.kind==='win'&&<div className="emp-celebration">🏆<strong>{state.winners.map(id=>state.players[id].name).join(' & ')} chiến thắng!</strong>{Array.from({length:20},(_,i)=><i key={i} style={{'--i':i}as CSSProperties}>✦</i>)}</div>}
   <div className="emp-mini-players">{state.players.map((player,rank)=><div key={player.id} className={`${player.id===state.turn?'current':''} ${!player.alive?'bankrupt':''}`}><small className="emp-rank">{rank+1}</small><TokenIcon id={player.id} size={17}/><span>{player.name}<b><AnimatedCash value={player.cash}/></b></span>{beat?.delta?.[player.id]?Array.from({length:4},(_,i)=><i key={`${state.revision}-${i}`} className="emp-coin-flight" style={{'--i':i}as CSSProperties}>🪙</i>):null}{beat?.delta?.[player.id]?<em className={beat.delta[player.id]>0?'gain':'loss'} key={state.revision}>{beat.delta[player.id]>0?'🪙 +':'☁ −'}{money(Math.abs(beat.delta[player.id]))}</em>:null}</div>)}</div>
  </div>
  {BOARD.map((tile,i)=>{
   const [row,column]=boardCell(i),a=state.assets[i],people=state.players.filter(p=>p.alive&&(travel?.player===p.id?travel.position:p.position)===i),color=tile.group>=0?GROUPS[tile.group].color:tile.kind==='chance'?'#d6b46e':'#8aabc0';
   return <button key={i} data-tycoon-tile={i} type="button" className={`emp-tile tile-${tile.kind} ${a&&ownsGroup(state,a.owner,i)?'complete-set':''} ${beat?.tile===i?'emp-property-pop':''} ${i%8===0?'is-corner':''} ${selected===i?'is-inspected':''} ${people.some(p=>p.id===state.turn)?'has-turn':''}`} style={{left:`${50+(column-row)*5.25}%`,top:`${48+(column+row-10)*3.75}%`,zIndex:Math.round(20+(column+row)*2),'--district':color,'--owner':a?TOKENS[a.owner].color:'transparent'}as CSSProperties} onClick={()=>onSelect(i)} aria-label={`Ô ${i}: ${tile.name}${tile.price?`, ${money(tile.price)}`:''}${a?`, của ${state.players[a.owner].name}, cấp ${a.level}`:['city','rail','utility'].includes(tile.kind)?', chưa có chủ':''}${people.length?`, ${people.map(p=>p.name).join(', ')} đang ở đây`:''}`} aria-pressed={selected===i}>
    <svg className="emp-iso-block" viewBox="0 0 120 100" aria-hidden="true"><path className="emp-block-depth" d="M2 40 Q2 34 10 30 L52 8 Q60 4 68 8 L110 30 Q118 34 118 40 L118 60 Q118 65 110 70 L68 94 Q60 98 52 94 L10 70 Q2 65 2 60Z"/><path className="emp-block-top" d="M8 32 L52 7 Q60 3 68 7 L112 32 Q120 37 112 43 L68 69 Q60 74 52 69 L8 43 Q0 37 8 32Z"/></svg>
    {(tile.kind==='jail'||tile.kind==='goJail'||(a&&a.level>0))&&<span className={`emp-scene-asset emp-building sprite-${tile.kind==='jail'||tile.kind==='goJail'?3:a!.level>=3?1:0}`} aria-hidden="true"/>}
    {tile.kind==='city'?<span className="emp-district-bar">{a&&a.level>0&&Array.from({length:a.level},(_,h)=><span className="emp-mini-house" key={h}><i/><b/></span>)}</span>:<span className="emp-tile-icon"><TileIcon kind={tile.kind}/></span>}
    <strong>{tile.name}</strong><small>{tile.kind==='city'?money(tile.price):tile.kind==='tax'?`−${money(tile.price)}`:tile.kind==='start'?'+$200':tile.kind==='park'?'+$40':tile.kind==='rail'||tile.kind==='utility'?money(tile.price):tile.tag}</small>
    {a&&<span className="emp-owner-mark" aria-hidden="true">⚑</span>}<span className="emp-tile-tokens">{people.map(p=><span key={p.id} data-tycoon-player={p.id} className={`emp-token ${beat?.kind==='hop'&&beat.actor===p.id?'hopping':''} ${p.jailed?'jailed':''} ${p.id===state.turn?'active':''}`} style={{'--token':TOKENS[p.id].color}as CSSProperties} title={p.name}><TokenIcon id={p.id}/></span>)}</span>{tile.kind==='start'&&<ArrowUpRight className="emp-start-arrow"/>}
   </button>;
  })}
 </div>
 <span className="emp-scene-asset emp-mascot sprite-5" aria-hidden="true"/>
 {showEffects&&<aside className="emp-effects-gallery"><h2>⭐ Hiệu ứng nổi bật ⭐</h2>{[
  ['dice','Xúc xắc','Xoay, nảy và phát sáng khi gieo.'],
  ['chibi','Di chuyển','Nhân vật nhảy từng ô, để lại ánh sao dễ thương.'],
  ['1','Mua đất','Cắm cờ sở hữu và tỏa sáng khi mua thành công.'],
  ['0','Xây nhà / Nâng cấp','Ngôi nhà mọc lên theo từng cấp.'],
  ['card','Thẻ cơ hội','Lật thẻ để nhận tiền, di chuyển hoặc vào tù.'],
  ['3','Vào tù','Song sắt hạ xuống, nghỉ chân một lượt.'],
  ['4','Chiến thắng','Cúp vàng, hoa giấy và bảng xếp hạng.'],
 ].map(([sprite,title,description])=><div key={title}><span className="emp-effect-art">{sprite==='dice'?<><Dice value={5} rolling={false}/><Dice value={3} rolling={false}/></>:sprite==='chibi'?<TokenIcon id={1} size={55}/>:sprite==='card'?<b>?</b>:<i className={`emp-scene-asset sprite-${sprite}`}/>}</span><span><strong>{title}</strong><p>{description}</p></span></div>)}</aside>}
 <div className="emp-scene-dock">
  <button disabled={!canAct||state.phase!=='buy'||state.players[state.turn].cash<BOARD[state.players[state.turn].position].price} onClick={()=>onAction?.({type:'buy'})}><Banknote/><span>Mua đất</span></button>
  <button disabled={!canAct||!canBuild(state,selected)} onClick={()=>onAction?.({type:'build',tile:selected})}><Hammer/><span>Xây nhà</span></button>
  <button disabled={!canAct||!canDowngrade(state,selected)} onClick={()=>onAction?.({type:'downgrade',tile:selected})}><ArrowUpRight/><span>Bán nhà</span></button>
  <button className="emp-main-roll" disabled={!canRoll} onClick={onRoll} aria-label="Tung xúc xắc trên thanh công cụ"><Dice value={faces[0]} rolling={rolling}/><strong>Xúc xắc</strong></button>
  <button disabled={!canAct||!canSell(state,selected)} onClick={()=>onAction?.({type:'sell',tile:selected})}><Banknote/><span>Bán đất</span></button>
  <button disabled={state.lastCard===null} onClick={()=>setShowCard(!showCard)}><Sparkles/><span>Thẻ cơ hội</span></button>
  <button disabled={!canAct||!['manage','buy'].includes(state.phase)} onClick={()=>onAction?.({type:state.phase==='buy'?'pass':'end'})}><ArrowRight/><span>{state.phase==='buy'?'Bỏ qua':'Hết lượt'}</span></button>
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
