export type Side = 0 | 1;
export type Direction = -1 | 1;
export type QuanState = { lastMove?: {pit:number;direction:Direction;actor:Side;number:number}; pits: number[]; quan: boolean[]; scores: [number, number]; captured: [number, number]; turn: Side; moves: number; finished: boolean; winner: Side | -1 | null; reason: string; log: string[]; protectYoung: boolean };
export type Frame = Pick<QuanState, 'pits' | 'quan' | 'scores'> & { focus: number | null; hand: number; text: string };
export const ROWS = [[0,1,2,3,4],[6,7,8,9,10]];
export const isQuan = (i: number) => i === 5 || i === 11;
const step = (i: number, direction: Direction) => (i + direction + 12) % 12;
export const totalPoints = (s: Pick<QuanState, 'pits' | 'quan' | 'scores'>) => s.pits.reduce((a,b) => a+b,0) + s.quan.filter(Boolean).length * 10 + s.scores[0] + s.scores[1];
export function newQuanGame(protectYoung = false): QuanState {
  return { pits: Array.from({length:12},(_,i)=>isQuan(i)?0:5), quan: Array.from({length:12},(_,i)=>isQuan(i)), scores:[0,0], captured:[0,0], turn:0, moves:0, finished:false, winner:null, reason:'', log:['Mỗi ô 5 dân, mỗi đầu 1 quan. Mời bạn đi trước!'], protectYoung };
}
export function legalPits(s: QuanState) { return s.finished ? [] : ROWS[s.turn].filter(i=>s.pits[i]>0); }
export function playQuan(original: QuanState, pit: number, direction: Direction, record = true): { state: QuanState; frames: Frame[] } {
  if (!legalPits(original).includes(pit) || ![-1,1].includes(direction)) throw Error('Hãy chọn ô dân có quân ở phía mình và một hướng rải.');
  const s=structuredClone(original), frames:Frame[]=[], actor=s.turn;
  const title=actor===0?'Bên dưới':'Bên trên';
  function snapshot(focus:number|null,hand:number,text:string) { if(record)frames.push({pits:[...s.pits],quan:[...s.quan],scores:[...s.scores],focus,hand,text}); }
  let cursor=pit, hand=s.pits[cursor], captured=0;
  s.pits[cursor]=0; snapshot(cursor,hand,`Nhặt ${hand} dân từ ô ${pitLabel(cursor)}.`);
  const seen=new Set<string>();
  while(true) {
    while(hand>0) {cursor=step(cursor,direction); s.pits[cursor]++; hand--; snapshot(cursor,hand,`Rải 1 dân vào ${pitLabel(cursor)}.`);}
    const next=step(cursor,direction);
    if (s.pits[next]>0 || s.quan[next]) {
      if(isQuan(next))break;
      const key=JSON.stringify([s.pits,cursor]);
      if(seen.has(key)) {snapshot(next,0,'Thế rải lặp lại · dừng lượt.');break;}
      seen.add(key); cursor=next;hand=s.pits[cursor];s.pits[cursor]=0;snapshot(cursor,hand,`Tiếp tục nhặt ${hand} dân ở ${pitLabel(cursor)}.`);continue;
    }
    // The empty next pit creates a gap. Capture beyond it, then test the next gap.
    let gap=next;
    while(true) {
      const target=step(gap,direction);
      if(s.pits[target]===0&&!s.quan[target])break;
      if(s.quan[target]&&s.protectYoung&&s.pits[target]<5) {snapshot(target,0,'Quan còn non: cần ít nhất 5 dân trong ô quan để ăn.');break;}
      const points=s.pits[target]+(s.quan[target]?10:0);
      if(s.quan[target]) {s.captured[actor]++;s.quan[target]=false;}
      s.pits[target]=0;s.scores[actor]+=points;captured+=points;snapshot(target,0,`Ăn ${points} điểm từ ${pitLabel(target)}!`);
      if(!s.quan[5]&&!s.quan[11])break;
      gap=step(target,direction);
      if(s.pits[gap]>0||s.quan[gap])break;
    }
    break;
  }
  s.moves++;
  s.lastMove={pit,direction,actor,number:s.moves};
  s.log=[`${title} chọn ${pitLabel(pit)}, rải ${direction===1?'theo':'ngược'} chiều vòng bàn · ${captured?`ăn ${captured} điểm`:'chưa ăn quân'}.`,...s.log].slice(0,8);
  if(!s.quan[5]&&!s.quan[11]) {
    for(const side of [0,1] as const) {const remaining=ROWS[side].reduce((n,i)=>n+s.pits[i],0);s.scores[side]+=remaining;for(const i of ROWS[side])s.pits[i]=0;}
    // Remaining peasants in the two now-empty quan pits belong to the last capturer.
    s.scores[actor]+=s.pits[5]+s.pits[11];s.pits[5]=s.pits[11]=0;
    s.finished=true;s.reason='Hai quan đã được ăn hết. Dân còn lại chia về phía chủ ô.';
    snapshot(null,0,'Hết quan rồi! Thu dân còn lại và tính điểm.');
  } else if(s.moves>=300) {s.finished=true;s.reason='Đạt 300 lượt: so điểm đã ăn để khép lại ván dài.';}
  if(s.finished)s.winner=s.scores[0]===s.scores[1]?-1:s.scores[0]>s.scores[1]?0:1;
  else {
    s.turn=(1-actor) as Side;
    if(ROWS[s.turn].every(i=>s.pits[i]===0)) {
      for(const i of ROWS[s.turn])s.pits[i]=1;
      s.scores[s.turn]-=5;
      s.log=[`${s.turn===0?'Bên dưới':'Bên trên'} rải lại 5 dân · trừ 5 điểm (ghi nợ nếu chưa đủ).`,...s.log].slice(0,8);
      snapshot(null,0,'Phía tiếp theo hết dân: rải lại mỗi ô 1 dân, trừ 5 điểm.');
    }
  }
  return {state:s,frames};
}
export function pitLabel(i:number) {return i===5?'quan bên phải':i===11?'quan bên trái':`ô ${i<5?i+1:11-i}`;}
export function chooseQuanMove(s:QuanState, difficulty:'easy'|'smart'='smart') {
  const side=s.turn, choices=legalPits(s).flatMap(pit=>([-1,1] as Direction[]).map(direction=>({pit,direction})));
  let best=choices[0],value=-Infinity;
  for(const move of choices) {
    const after=playQuan(s,move.pit,move.direction,false).state;
    let score=evaluate(after,side);
    if(difficulty==='smart'&&!after.finished) {
      let worst=Infinity;
      for(const p of legalPits(after))for(const d of [-1,1] as Direction[])worst=Math.min(worst,evaluate(playQuan(after,p,d,false).state,side));
      score=worst;
    }
    if(score>value){value=score;best=move;}
  }
  return best;
}
function evaluate(s:QuanState,side:Side) {return s.finished?(s.winner===side?10000:s.winner===-1?0:-10000):s.scores[side]-s.scores[1-side]+(s.captured[side]-s.captured[1-side])*.4;}
