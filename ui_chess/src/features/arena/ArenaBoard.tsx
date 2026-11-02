import type { CSSProperties } from 'react';
import './imperial-board.css';
import { BoardSurface } from './MatchSurface';

type Game = 'chess' | 'xiangqi' | 'go' | 'gomoku';
type Pos = [number, number];
type Props = {
  game: Game;
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
};
const names: Record<Game, string> = { chess: 'Cờ vua', xiangqi: 'Cờ tướng', go: 'Cờ vây', gomoku: 'Cờ caro' };
const inscriptions: Record<Game, [string, string]> = {
  chess: ['VƯƠNG KỲ', 'Bản lĩnh từng nước đi'],
  xiangqi: ['LONG TRANH HỔ ĐẤU', 'Một nước cờ · Vạn biến thiên'],
  go: ['KỲ ĐẠO', 'Lấy tĩnh chế động · Lấy trí định cục'],
  gomoku: ['NGŨ TỬ LIÊN CHÂU', 'Năm quân hội tụ · Một thế quyết thắng'],
};

export default function ArenaBoard({ game, board, seat, canMove, selected, lastMove, onSquare, legalTargets = [], winningSquares = [], hiddenSquare = null, movingPiece = null }: Props) {
  const rows = board.length, cols = board[0].length;
  const flip = seat === 1 && (game === 'chess' || game === 'xiangqi');
  const style = { '--board-cols': cols, '--board-rows': rows, aspectRatio: `${cols} / ${rows}`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } as CSSProperties;
  return <section className={`imperial-table imperial-${game}`} aria-label={`Bàn ${names[game]}`}>
    <header className="imperial-heading"><span className="imperial-seal" aria-hidden="true">棋</span><div><p>{inscriptions[game][0]}</p><span>{inscriptions[game][1]}</span></div><span className="imperial-board-size">{cols} × {rows}</span></header>
    <BoardSurface className="imperial-frame">
      <div className="imperial-board-stage" style={style} role="group" aria-label={`Các vị trí trên bàn ${names[game]}`}>
        {game !== 'chess' && <BoardLines game={game} rows={rows} cols={cols} />}
        {Array.from({ length: rows }, (_, displayR) => Array.from({ length: cols }, (_, displayC) => {
          const r = flip ? rows - 1 - displayR : displayR, c = flip ? cols - 1 - displayC : displayC;
          const p = board[r][c], chosen = selected?.[0] === r && selected[1] === c;
          const last = lastMove?.to?.[0] === r && lastMove.to[1] === c;
          const origin = lastMove?.from?.[0] === r && lastMove.from[1] === c;
          const legal = legalTargets.some(([targetR, targetC]) => targetR === r && targetC === c);
          const hidden = hiddenSquare?.[0] === r && hiddenSquare[1] === c;
          return <button type="button" key={`${r}-${c}`} className={`imperial-cell ${(r + c) % 2 ? 'cell-dark' : ''} ${chosen ? 'cell-selected' : ''} ${last ? 'cell-last' : ''} ${origin ? 'cell-origin' : ''} ${p ? 'cell-occupied' : ''} ${legal ? 'cell-legal' : ''} ${winningSquares.some(([winR,winC]) => winR === r && winC === c) ? 'imperial-win-point' : ''}`} disabled={!canMove} onClick={() => onSquare([r, c])} aria-label={`Hàng ${r + 1}, cột ${c + 1}, ${pieceLabel(game, p)}${legal ? ', có thể đi' : ''}`} aria-pressed={chosen}>
            {p && !hidden && <BoardPiece game={game} piece={p} />}
            {legal && <span className={`imperial-legal-mark ${p ? 'capture-target' : ''}`} aria-hidden="true" />}
            {last && <span className="imperial-move-mark" aria-hidden="true" />}
          </button>;
        }))}
        {movingPiece && <div className="imperial-moving-cell" aria-hidden="true" style={{ width: `${100 / cols}%`, height: `${100 / rows}%`, left: `${((flip ? cols - 1 - movingPiece.position[1] : movingPiece.position[1]) + .5) * 100 / cols}%`, top: `${((flip ? rows - 1 - movingPiece.position[0] : movingPiece.position[0]) + .5) * 100 / rows}%` }}><BoardPiece game={game} piece={movingPiece.piece} /></div>}
      </div>
    </BoardSurface>
    <footer className="imperial-board-caption"><span aria-hidden="true">◆</span><span>{game === 'go' || game === 'gomoku' ? 'Đặt quân tại giao điểm' : 'Chọn quân · Chọn điểm đến'}</span><span aria-hidden="true">◆</span></footer>
  </section>;
}

function BoardLines({ game, rows, cols }: { game: Game; rows: number; cols: number }) {
  const width = cols * 100, height = rows * 100;
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
  if (game === 'gomoku') return <span className={`imperial-gomoku-piece ${piece === 'X' ? 'army-red' : 'army-black'}`}>{piece}</span>;
  if (game === 'chess') return <img className="imperial-chess-piece" src={`/chess/${piece === piece.toUpperCase() ? 'w' : 'b'}${piece.toLowerCase()}.png`} alt="" draggable={false} />;
  return <span className={`imperial-xiangqi-piece ${piece === piece.toUpperCase() ? 'army-red' : 'army-black'}`} data-piece={piece}><span>{xiangqiSymbols[piece]}</span></span>;
}
