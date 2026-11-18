import ArenaBoard from '@/features/arena/ArenaBoard';
import type { Pos } from '../utils/checkWin';
type Cell = 'X' | 'O' | null;

export function GomokuBoard({ board, onMove, winnerLine, lastPlacement = null, canMove = true }: { board: Cell[][]; lastPlacement?: [number,number]|null; onMove: (r: number, c: number) => void; winnerLine: Pos[] | null; canMove?: boolean }) {
  return <ArenaBoard game="gomoku" board={board} seat={0} canMove={canMove && !winnerLine} selected={null} lastMove={lastPlacement?{from:null,to:lastPlacement}:null} winningSquares={winnerLine?.map(({r,c}) => [r,c])} onSquare={([r,c]) => onMove(r,c)} />;
}
