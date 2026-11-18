import ArenaBoard from '@/features/arena/ArenaBoard';
import type { Board } from '../utils/rules';

export function GoBoard({ board, lastMove=null, finished=false, onClick, canMove = true }: { board: Board; lastMove?:[number,number]|null; finished?:boolean; onClick: (r: number, c: number) => void|string; canMove?: boolean }) {
  return <ArenaBoard game="go" board={board} seat={0} canMove={canMove} selected={null} finished={finished} lastMove={lastMove?{from:null,to:lastMove}:null} onSquare={([r,c]) => onClick(r,c)} />;
}
