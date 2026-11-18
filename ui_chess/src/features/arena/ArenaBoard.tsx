import { useMemo, useState } from 'react';
import { usePlacementMotion } from './usePlacementMotion';
import { fiveLine, goRegions } from './placement-model';
import { useXiangqiMotion } from './useXiangqiMotion';
import { KingResultBadge } from '@/features/arena/KingResultBadge';
import { useChessMotion } from '@/features/arena/useChessMotion';
import ChineseMatchHeader, { ChineseFiles } from './ChineseMatchHeader';
import type { CSSProperties } from 'react';
import './imperial-board.css';
import './caro-paper.css';
import { BoardSurface } from './MatchSurface';
import CheckCallout from './CheckCallout';
import { isInCheck } from '@/games/xiangqi/utils/isInCheck';

type Game = 'chess' | 'xiangqi' | 'go' | 'gomoku';
type Pos = [number, number];
type Props = {
  game: Game;
  finished?: boolean;
  drawn?: boolean;
  winner?: 'w' | 'b' | null;
  board: (string | null)[][];
  seat: number;
  canMove: boolean;
  selected: Pos | null;
  lastMove: { from: Pos | null; to: Pos } | null;
  onSquare: (pos: Pos) => void | string | Promise<void | string>;
  legalTargets?: Pos[];
  winningSquares?: Pos[];
  hiddenSquare?: Pos | null;
  movingPiece?: { piece: string; position: Pos } | null;
  checkSide?: 'red' | 'black';
  playerNames?:[string,string];
  turnLabel?:string;
};
const names: Record<Game, string> = { chess: 'Cờ vua', xiangqi: 'Cờ tướng', go: 'Cờ vây', gomoku: 'Cờ caro' };
const inscriptions: Record<Game, [string, string]> = {
  chess: ['VƯƠNG KỲ', 'Bản lĩnh từng nước đi'],
  xiangqi: ['LONG TRANH HỔ ĐẤU', 'Một nước cờ · Vạn biến thiên'],
  go: ['KỲ ĐẠO', 'Lấy tĩnh chế động · Lấy trí định cục'],
  gomoku: ['CARO · TRANG GIẤY NHỎ', 'Năm quân nối tiếp · Một nước đi hay'],
};

export default function ArenaBoard({ game, finished = false, drawn = false, winner, board, seat, canMove, selected, lastMove, onSquare, legalTargets = [], winningSquares = [], hiddenSquare = null, movingPiece = null, checkSide, playerNames, turnLabel }: Props) {
  const rows = board.length, cols = board[0].length;
  const positionSignature=JSON.stringify(board);
  const placement=game==='go'||game==='gomoku';
  const [stoneStyle,setStoneStyle]=useState(false);
  const [sound,setSound]=useState(false),[hints,setHints]=useState(false),[invalid,setInvalid]=useState<{pos:Pos;reason:string;position:string}|null>(null);
  const motion=usePlacementMotion(board,placement,game==='go'&&sound);
  const regions=useMemo(()=>game==='go'?goRegions(board):null,[game,board]);
  const line=game==='gomoku'?(fiveLine(board,lastMove?.to).length?fiveLine(board,lastMove?.to):winningSquares.slice(0,5)):winningSquares;
  const draw=drawn||(game==='gomoku'&&!line.length&&board.every(row=>row.every(Boolean)));
  const ended=finished||draw||line.length===5&&game==='gomoku';
  async function choose(pos:Pos){
    if(!canMove||ended)return;
    motion.unlockSound();setInvalid(null);
    const reason=placement&&board[pos[0]][pos[1]]?'Vị trí này đã có quân.':await onSquare(pos);
    if(placement&&typeof reason==='string'){
      setInvalid({pos,reason,position:positionSignature});
      const cell=motion.host.current?.querySelector<HTMLElement>(`[data-placement-cell="${pos[0]}-${pos[1]}"]`);
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)cell?.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:250});
    }
  }

  const flip = seat === 1 && (game === 'chess' || game === 'xiangqi');
  const stage = useChessMotion(game === 'chess' ? board.flat().map(p => p || '.').join('') : '', flip);
  const xqStage = useXiangqiMotion(game === 'xiangqi' ? board.flat().map(p => p ? {key:p,kind:p.toUpperCase()} : null) : [], lastMove?.from ? {from:lastMove.from[0]*9+lastMove.from[1],to:lastMove.to[0]*9+lastMove.to[1]} : null, flip);
  const checked = game === 'xiangqi' && checkSide && isInCheck(board, checkSide);
  const style = { '--board-cols': cols, '--board-rows': rows, aspectRatio: `${cols} / ${rows}`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } as CSSProperties;
  return <section className={`imperial-table imperial-${game} ${draw ? "placement-draw" : ""} ${placement&&!canMove&&!ended?"placement-waiting":""}`} aria-label={`Bàn ${names[game]}`}>
    {game==='xiangqi'&&checkSide?<ChineseMatchHeader turn={checkSide==='red'?0:1} names={playerNames} label={turnLabel}/>:<header className="imperial-heading"><span className="imperial-seal" aria-hidden="true">{game==='gomoku'?'XO':'棋'}</span><div><p>{inscriptions[game][0]}</p><span>{inscriptions[game][1]}</span></div><span className="imperial-board-size">{cols} × {rows}</span></header>}
    <BoardSurface className="imperial-frame">
      {game==='xiangqi'&&<ChineseFiles flip={flip}/>}
      <div ref={placement ? motion.host : game === 'xiangqi' ? xqStage : stage} className="imperial-board-stage" style={style} role="group" aria-label={`Các vị trí trên bàn ${names[game]}`}>
        {game !== 'chess' && <BoardLines game={game} rows={rows} cols={cols} />}
        {Array.from({ length: rows }, (_, displayR) => Array.from({ length: cols }, (_, displayC) => {
          const r = flip ? rows - 1 - displayR : displayR, c = flip ? cols - 1 - displayC : displayC;
          const p = board[r][c], chosen = selected?.[0] === r && selected[1] === c;
          const last = lastMove?.to?.[0] === r && lastMove.to[1] === c;
          const origin = lastMove?.from?.[0] === r && lastMove.from[1] === c;
          const legal = legalTargets.some(([targetR, targetC]) => targetR === r && targetC === c);
          const hidden = hiddenSquare?.[0] === r && hiddenSquare[1] === c;
          return <button type="button" data-placement-cell={`${r}-${c}`} data-xq-cell={r * 9 + c} data-chess-cell={r * 8 + c} key={`${r}-${c}`} className={`imperial-cell ${invalid?.position===positionSignature&&invalid?.pos[0]===r&&invalid.pos[1]===c?"placement-invalid":""} ${checked && p === (checkSide === 'red' ? 'G' : 'g') ? 'xq-checked' : ''} ${(r + c) % 2 ? 'cell-dark' : ''} ${chosen ? 'cell-selected' : ''} ${last ? 'cell-last' : ''} ${origin ? 'cell-origin' : ''} ${p ? 'cell-occupied' : ''} ${legal ? 'cell-legal' : ''} ${line.some(([winR,winC]) => winR === r && winC === c) ? 'imperial-win-point' : ''}`} disabled={!canMove||ended} onClick={() => void choose([r, c])} aria-label={`Hàng ${r + 1}, cột ${c + 1}, ${pieceLabel(game, p)}${legal ? ', có thể đi' : ''}`} aria-pressed={chosen}>
            {p && !hidden && (game==='gomoku'&&stoneStyle?<span className={`imperial-stone stone-${p==='X'?'black':'white'}`} aria-hidden="true"/>:<BoardPiece game={game} piece={p} />)}
            {game==='go'&&hints&&regions?.atari.some(([rr,cc])=>rr===r&&cc===c)&&<span className="zen-atari" aria-label="Nhóm quân còn một khí"/>}
            {game==='go'&&finished&&regions?.territory.filter(t=>t.point[0]===r&&t.point[1]===c).map(t=><span key={t.owner} className={`zen-territory zen-territory-${t.owner}`} aria-label={`Lãnh thổ ${t.owner==='black'?'đen':'trắng'}`}/>)}
            {game === 'chess' && <KingResultBadge piece={p} winner={winner} />}
            {legal && <span className={`imperial-legal-mark ${p ? 'capture-target' : ''}`} aria-hidden="true" />}
            {last && <span className="imperial-move-mark" aria-hidden="true" />}
          </button>;
        }))}
        {game==='gomoku'&&line.length===5&&<svg className="caro-win-line" viewBox={`0 0 ${cols*100} ${rows*100}`} aria-label="Năm quân liên tiếp chiến thắng"><line pathLength="1" x1={line[0][1]*100+50} y1={line[0][0]*100+50} x2={line[4][1]*100+50} y2={line[4][0]*100+50}/></svg>}
        {placement&&draw&&<div className="placement-result" role="status">Hòa</div>}
        {movingPiece && <div className="imperial-moving-cell" aria-hidden="true" style={{ width: `${100 / cols}%`, height: `${100 / rows}%`, left: `${((flip ? cols - 1 - movingPiece.position[1] : movingPiece.position[1]) + .5) * 100 / cols}%`, top: `${((flip ? rows - 1 - movingPiece.position[0] : movingPiece.position[0]) + .5) * 100 / rows}%` }}><BoardPiece game={game} piece={movingPiece.piece} /></div>}
        {game === 'xiangqi' && checkSide && <CheckCallout checked={!movingPiece && isInCheck(board, checkSide)} eventKey={`${checkSide}:${board.flat().join('.')}`}/>}
      </div>
      {game==='xiangqi'&&<ChineseFiles flip={flip} bottom/>}
    </BoardSurface>
    {game==='gomoku'&&<div className="placement-tools"><label>Kiểu quân<select aria-label="Kiểu quân Caro" value={stoneStyle?'stone':'marks'} onChange={e=>setStoneStyle(e.target.value==='stone')}><option value="marks">X / O</option><option value="stone">Đá đen / trắng</option></select></label></div>}
    {game==='go'&&<div className="placement-tools"><label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>Âm thanh đặt quân</label><label><input type="checkbox" checked={hints} onChange={e=>setHints(e.target.checked)}/>Gợi ý atari</label>{finished&&<span>Lãnh thổ: xanh xám · Đen / kem · Trắng</span>}</div>}
    {placement&&<p className="placement-feedback" role="status">{invalid?.position===positionSignature?invalid.reason:''}</p>}
    <footer className="imperial-board-caption"><span aria-hidden="true">◆</span><span>{game === 'gomoku' ? 'Chọn ô trống để đánh X / O' : game === 'go' ? 'Đặt quân tại giao điểm' : 'Chọn quân · Chọn điểm đến'}</span><span aria-hidden="true">◆</span></footer>
  </section>;
}

function BoardLines({ game, rows, cols }: { game: Game; rows: number; cols: number }) {
  const width = cols * 100, height = rows * 100;
  // Caro marks occupy cells; Go and Xiangqi pieces occupy intersections.
  if(game==='gomoku')return <svg className="imperial-board-lines" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false"><g className="imperial-grid-lines">
    {Array.from({length:rows+1},(_,r)=><line key={`h${r}`} x1="0" y1={r*100} x2={width} y2={r*100}/>)}
    {Array.from({length:cols+1},(_,c)=><line key={`v${c}`} x1={c*100} y1="0" x2={c*100} y2={height}/>)}
  </g></svg>;
  const cross = (r: number, c: number) => {
    const x = c * 100 + 50, y = r * 100 + 50;
    return [-1, 1].flatMap(dx => [-1, 1].map(dy => c + dx < 0 || c + dx >= cols ? null : <path key={`${r}-${c}-${dx}-${dy}`} d={`M ${x + dx * 10} ${y + dy * 27} V ${y + dy * 10} H ${x + dx * 27}`} />));
  };
  const stars = rows === 19 ? [3, 9, 15] : rows === 13 ? [3, 6, 9] : [2, 4, 6];
  return <svg className="imperial-board-lines" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
    <g className="imperial-grid-lines">
      {Array.from({ length: rows }, (_, r) => <line key={`h${r}`} x1="50" y1={50 + r * 100} x2={width - 50} y2={50 + r * 100} />)}
      {Array.from({ length: cols }, (_, c) => game === 'xiangqi' && c > 0 && c < cols - 1 ? <path key={`v${c}`} d={`M ${50 + c * 100} 50 V 450 M ${50 + c * 100} 550 V 950`} /> : <line key={`v${c}`} x1={50 + c * 100} y1="50" x2={50 + c * 100} y2={height - 50} />)}
      <rect x="50" y="50" width={width - 100} height={height - 100} className="imperial-grid-outline" />
      {game === 'xiangqi' && <><path d="M350 50 L550 250 M550 50 L350 250 M350 750 L550 950 M550 750 L350 950" />{[2, 7].flatMap(r => [1, 7].map(c => cross(r, c)))}{[3, 6].flatMap(r => [0, 2, 4, 6, 8].map(c => cross(r, c)))}</>}
    </g>
    {game === 'xiangqi' && <g className="imperial-river"><text x="250" y="510">楚 河</text><text x="650" y="510">漢 界</text><path d="M390 500 H510" /></g>}
    {game === 'go' && <g className="imperial-stars">{stars.flatMap(r => stars.map(c => <circle key={`${r}-${c}`} cx={50 + c * 100} cy={50 + r * 100} r={rows === 19 ? 8 : 6} />))}</g>}
  </svg>;
}
const xiangqiSymbols: Record<string, string> = { G: '帥', A: '仕', E: '相', H: '傌', R: '俥', C: '炮', S: '兵', g: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', s: '卒' };
function pieceLabel(game: Game, p: string | null) {
  if (!p) return 'trống';
  if (game === 'go') return p === 'black' ? 'quân đen' : 'quân trắng';
  if (game === 'gomoku') return p;
  const names: Record<string, string> = game === 'xiangqi' ? { G: 'Tướng', A: 'Sĩ', E: 'Tượng', H: 'Mã', R: 'Xe', C: 'Pháo', S: 'Tốt' } : { K: 'Vua', Q: 'Hậu', R: 'Xe', B: 'Tượng', N: 'Mã', P: 'Tốt' };
  return `${names[p.toUpperCase()] ?? p} ${p === p.toUpperCase() ? game === 'xiangqi' ? 'đỏ' : 'trắng' : 'đen'}`;
}
function BoardPiece({ game, piece }: { game: Game; piece: string }) {
  if (game === 'go') return <span className={`imperial-stone stone-${piece}`} data-piece={piece} />;
  if (game === 'gomoku') return <svg className={`imperial-gomoku-piece caro-mark-${piece.toLowerCase()}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">{piece==='X'?<><path className="caro-ink" d="M25 23C40 32 62 59 77 77"/><path className="caro-ink caro-x-second" d="M76 24C62 37 37 61 23 79"/><path className="caro-ink-glint" d="M27 21Q40 29 46 38M72 24L57 39"/></>:<><path className="caro-ink" d="M77 31C68 16 44 15 29 28C12 43 16 70 33 80C50 91 75 81 81 63C85 51 80 39 76 34"/><path className="caro-ink-glint" d="M38 23Q55 17 68 25"/></>}</svg>;
  if (game === 'chess') return <img className="imperial-chess-piece" src={`/chess/${piece === piece.toUpperCase() ? 'w' : 'b'}${piece.toLowerCase()}.png`} alt="" draggable={false} />;
  return <span className={`imperial-xiangqi-piece ${piece === piece.toUpperCase() ? 'army-red' : 'army-black'}`} data-piece={piece}><span>{xiangqiSymbols[piece]}</span></span>;
}
