import ArenaBoard from '@/features/arena/ArenaBoard';
import type { XiangqiPieceKey } from '../utils/pieces';

type Pos = [number, number];
type Props = {
  playerNames?:[string,string];
  turnLabel?:string;
  board: (XiangqiPieceKey | null | '')[][];
  selectedSquare?: string | null;
  legalTargets?: string[];
  lastMove?: { from: string; to: string } | null;
  viewSide?: 'red' | 'black';
  turn?: 'red' | 'black';
  onClick?: (square: string) => void;
  movingPiece?: { piece: XiangqiPieceKey; square: string } | null;
  hideSquare?: string | null;
};

// Offline uses ranks 1–10 from Red's edge; the shared board uses row/column positions.
const position = (square: string): Pos => [10 - Number(square.slice(1)), 'abcdefghi'.indexOf(square[0])];
const square = ([row, col]: Pos) => `${'abcdefghi'[col]}${10 - row}`;

export function XiangqiBoard({ board, selectedSquare = null, legalTargets = [], lastMove = null, viewSide = 'red', turn = 'red', onClick, movingPiece = null, hideSquare = null, playerNames, turnLabel }: Props) {
  return <ArenaBoard
    game="xiangqi"
    playerNames={playerNames}
    turnLabel={turnLabel}
    checkSide={turn}
    board={board.map(row => row.map(piece => piece || null))}
    seat={viewSide === 'black' ? 1 : 0}
    canMove={Boolean(onClick) && !movingPiece}
    selected={selectedSquare ? position(selectedSquare) : null}
    legalTargets={legalTargets.map(position)}
    lastMove={lastMove ? { from: position(lastMove.from), to: position(lastMove.to) } : null}
    hiddenSquare={hideSquare ? position(hideSquare) : null}
    movingPiece={movingPiece ? { piece: movingPiece.piece, position: position(movingPiece.square) } : null}
    onSquare={pos => onClick?.(square(pos))}
  />;
}
