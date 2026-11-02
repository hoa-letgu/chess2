import ArenaBoard from '@/features/arena/ArenaBoard';
import type { Board } from '../utils/rules';

export function GoBoard({ board, onClick, canMove = true }: { board: Board; onClick: (r: number, c: number) => void; canMove?: boolean }) {
  return <ArenaBoard game="go" board={board} seat={0} canMove={canMove} selected={null} lastMove={null} onSquare={([r,c]) => onClick(r,c)} />;
}
