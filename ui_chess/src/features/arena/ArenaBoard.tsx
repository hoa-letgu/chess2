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
  winner?: 'w' | 'b' | null;
  board: (string | null)[][];
  seat: number;
  canMove: boolean;
  selected: Pos | null;
  lastMove: { from: Pos | null; to: Pos } | null;
  onSquare: (pos: Pos) => void;
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

export default function ArenaBoard({ game, winner, board, seat, canMove, selected, lastMove, onSquare, legalTargets = [], winningSquares = [], hiddenSquare = null, movingPiece = null, checkSide, playerNames, turnLabel }: Props) {
  const rows = board.length, cols = board[0].length;
  const flip = seat === 1 && (game === 'chess' || game === 'xiangqi');
  const stage = useChessMotion(game === 'chess' ? board.flat().map(p => p || '.').join('') : '', flip);
  const style = { '--board-cols': cols, '--board-rows': rows, aspectRatio: `${cols} / ${rows}`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } as CSSProperties;
  return <section className={`imperial-table imperial-${game}`} aria-label={`Bàn ${names[game]}`}>
    {game==='xiangqi'&&checkSide?<ChineseMatchHeader turn={checkSide==='red'?0:1} names={playerNames} label={turnLabel}/>:<header className="imperial-heading"><span className="imperial-seal" aria-hidden="true">{game==='gomoku'?'XO':'棋'}</span><div><p>{inscriptions[game][0]}</p><span>{inscriptions[game][1]}</span></div><span className="imperial-board-size">{cols} × {rows}</span></header>}
    <BoardSurface className="imperial-frame">
      {game==='xiangqi'&&<ChineseFiles flip={flip}/>}
      <div ref={stage} className="imperial-board-stage" style={style} role="group" aria-label={`Các vị trí trên bàn ${names[game]}`}>
        {game !== 'chess' && <BoardLines game={game} rows={rows} cols={cols} />}
        {Array.from({ length: rows }, (_, displayR) => Array.from({ length: cols }, (_, displayC) => {
          const r = flip ? rows - 1 - displayR : displayR, c = flip ? cols - 1 - displayC : displayC;
          const p = board[r][c], chosen = selected?.[0] === r && selected[1] === c;
          const last = lastMove?.to?.[0] === r && lastMove.to[1] === c;
          const origin = lastMove?.from?.[0] === r && lastMove.from[1] === c;
          const legal = legalTargets.some(([targetR, targetC]) => targetR === r && targetC === c);
          const hidden = hiddenSquare?.[0] === r && hiddenSquare[1] === c;
          return <button type="button" data-chess-cell={r * 8 + c} key={`${r}-${c}`} className={`imperial-cell ${(r + c) % 2 ? 'cell-dark' : ''} ${chosen ? 'cell-selected' : ''} ${last ? 'cell-last' : ''} ${origin ? 'cell-origin' : ''} ${p ? 'cell-occupied' : ''} ${legal ? 'cell-legal' : ''} ${winningSquares.some(([winR,winC]) => winR === r && winC === c) ? 'imperial-win-point' : ''}`} disabled={!canMove} onClick={() => onSquare([r, c])} aria-label={`Hàng ${r + 1}, cột ${c + 1}, ${pieceLabel(game, p)}${legal ? ', có thể đi' : ''}`} aria-pressed={chosen}>
            {p && !hidden && <BoardPiece game={game} piece={p} />}
            {game === 'chess' && <KingResultBadge piece={p} winner={winner} />}
            {legal && <span className={`imperial-legal-mark ${p ? 'capture-target' : ''}`} aria-hidden="true" />}
            {last && <span className="imperial-move-mark" aria-hidden="true" />}
          </button>;
        }))}
        {movingPiece && <div className="imperial-moving-cell" aria-hidden="true" style={{ width: `${100 / cols}%`, height: `${100 / rows}%`, left: `${((flip ? cols - 1 - movingPiece.position[1] : movingPiece.position[1]) + .5) * 100 / cols}%`, top: `${((flip ? rows - 1 - movingPiece.position[0] : movingPiece.position[0]) + .5) * 100 / rows}%` }}><BoardPiece game={game} piece={movingPiece.piece} /></div>}
        {game === 'xiangqi' && checkSide && <CheckCallout checked={!movingPiece && isInCheck(board, checkSide)} eventKey={`${checkSide}:${board.flat().join('.')}`}/>}
      </div>
      {game==='xiangqi'&&<ChineseFiles flip={flip} bottom/>}
    </BoardSurface>
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
  if (game === 'gomoku') return <svg className={`imperial-gomoku-piece caro-mark-${piece.toLowerCase()}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">{piece==='X'?<><path className="caro-ink" d="M25 23C40 32 62 59 77 77M76 24C62 37 37 61 23 79"/><path className="caro-ink-glint" d="M27 21Q40 29 46 38M72 24L57 39"/></>:<><path className="caro-ink" d="M77 31C68 16 44 15 29 28C12 43 16 70 33 80C50 91 75 81 81 63C85 51 80 39 76 34"/><path className="caro-ink-glint" d="M38 23Q55 17 68 25"/></>}</svg>;
  if (game === 'chess') return <img className="imperial-chess-piece" src={`/chess/${piece === piece.toUpperCase() ? 'w' : 'b'}${piece.toLowerCase()}.png`} alt="" draggable={false} />;
  return <span className={`imperial-xiangqi-piece ${piece === piece.toUpperCase() ? 'army-red' : 'army-black'}`} data-piece={piece}><span>{xiangqiSymbols[piece]}</span></span>;
}
