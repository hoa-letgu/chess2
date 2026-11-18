// Generated from Othello/engine.ts. SHA256: bd946b2ddaec8efb439afb021e47d7d23c21ce93d470d1fcfbb62553ff2401b3
                         
                               
                                                     
                                                                       
                                       
                                                                                               
                                                       
  
export const ARMIES = [
  { name: 'Huyền Long', color: '#d0bc82', short: 'Đen', han: '玄龍' },
  { name: 'Bạch Phượng', color: '#ecedd9', short: 'Trắng', han: '白鳳' },
]         ;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]         ;
const inside = (r        , c        ) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const coord = (i        ) => `${'abcdefgh'[i % 8]}${Math.floor(i / 8) + 1}`;
export function counts(board        )                   {
  const result                   = [0, 0]; for (const cell of board) if (cell !== null) result[cell]++; return result;
}
export function newOthello()               {
  const board         = Array(64).fill(null); board[27] = 1; board[36] = 1; board[28] = 0; board[35] = 0;
  return { board, turn: 0, moves: 0, winner: null, reason: '', passed: null, passes: 0, last: null, logs: ['Bàn ngọc khai mở. Huyền Long (Đen) đi trước.'] };
}
export function captureLines(board        , at        , side      )             {
  if (!Number.isInteger(at) || at < 0 || at >= 64 || board[at] !== null) return [];
  const row = Math.floor(at / 8), col = at % 8, lines             = [];
  for (const [dr, dc] of DIRS) {
    const line           = []; let r = row + dr, c = col + dc;
    while (inside(r, c) && board[r * 8 + c] === 1 - side) { line.push(r * 8 + c); r += dr; c += dc; }
    if (line.length && inside(r, c) && board[r * 8 + c] === side) lines.push(line);
  }
  return lines;
}
export function flipsFor(board        , at        , side      )           { return captureLines(board, at, side).flat(); }
export function legalMoves(board        , side      )         {
  const result         = [];
  for (let at = 0; at < 64; at++) if (board[at] === null) { const lines = captureLines(board, at, side); if (lines.length) result.push({ at, flips: lines.flat(), directions: lines.length }); }
  return result;
}
function placed(board        , m      , side      )         { const next = [...board]; next[m.at] = side; for (const i of m.flips) next[i] = side; return next; }
export function playMove(s              , at        )               {
  const lines = captureLines(s.board, at, s.turn);
  if (s.winner !== null || !lines.length) throw Error('Ô không hợp lệ. Mỗi nước phải kẹp và lật ít nhất một quân đối phương.');
  const flips = lines.flat(), board = placed(s.board, { at, flips, directions: lines.length }, s.turn), opponent = (1 - s.turn)        ;
  const next               = { ...s, board, turn: opponent, moves: s.moves + 1, passed: null, last: { at, flips, directions: lines.length, side: s.turn }, logs: [`${ARMIES[s.turn].name}: ${coord(at)} · lật ${flips.length} quân theo ${lines.length} hướng.`, ...s.logs].slice(0, 14) };
  if (!legalMoves(board, opponent).length) {
    if (legalMoves(board, s.turn).length) {
      next.turn = s.turn; next.passed = opponent; next.passes++;
      next.logs = [`${ARMIES[opponent].name} hết nước đi, nhường lượt. ${ARMIES[s.turn].name} đi tiếp.`, ...next.logs].slice(0, 14);
    } else {
      const [black, white] = counts(board); next.winner = black === white ? -1 : black > white ? 0 : 1;
      next.reason = `${black + white === 64 ? 'Bàn cờ đã kín.' : 'Cả hai bên không còn nước đi, dù bàn còn ô trống.'} Đen ${black} · Trắng ${white}.`;
    }
  }
  return next;
}
const WEIGHTS = [
  120,-25,18,6,6,18,-25,120,
  -25,-50,-4,-3,-3,-4,-50,-25,
  18,-4,12,3,3,12,-4,18,
  6,-3,3,2,2,3,-3,6,
  6,-3,3,2,2,3,-3,6,
  18,-4,12,3,3,12,-4,18,
  -25,-50,-4,-3,-3,-4,-50,-25,
  120,-25,18,6,6,18,-25,120,
];
const CORNERS = [0, 7, 56, 63];
const NEAR_CORNERS = [[1,8,9],[6,14,15],[48,49,57],[54,55,62]];
function squareValue(board        , i        )         {
  const near = NEAR_CORNERS.findIndex(group => group.includes(i)); return near >= 0 && board[CORNERS[near]] !== null ? 8 : WEIGHTS[i];
}
function terminal(board        , side      )         { const c = counts(board), diff = c[side] - c[1-side]; return diff === 0 ? 0 : Math.sign(diff) * 100000 + diff * 100; }
function evaluate(p          )         {
  const c = counts(p.board), occupied = c[0] + c[1], opponent = (1 - p.turn)        ;
  let value = (c[p.turn] - c[opponent]) * (occupied >= 50 ? 12 : occupied >= 40 ? 3 : 1), frontier = 0;
  p.board.forEach((cell, i) => {
    if (cell === null) return; const sign = cell === p.turn ? 1 : -1;
    value += sign * squareValue(p.board, i) * 5;
    const row = Math.floor(i / 8), col = i % 8;
    if (DIRS.some(([dr,dc]) => inside(row+dr,col+dc) && p.board[(row+dr)*8+col+dc] === null)) frontier += sign;
  });
  const mobility = legalMoves(p.board,p.turn).length - legalMoves(p.board,opponent).length;
  value += mobility * 13 - frontier * 6;
  const stable = new Set        ();
  for (const corner of CORNERS) {
    const cell = p.board[corner]; if (cell === null) continue;
    const row = Math.floor(corner/8), col = corner%8;
    for (const [dr,dc] of [[row===0?1:-1,0],[0,col===0?1:-1]]) for(let n=0;n<8;n++) {const i=(row+n*dr)*8+col+n*dc;if(p.board[i]!==cell)break;stable.add(i);}
  }
  for (const i of stable) value += p.board[i] === p.turn ? 24 : -24;
  return value;
}
function ordered(board        , moves        )         { return [...moves].sort((a,b) => squareValue(board,b.at)*8+b.flips.length-squareValue(board,a.at)*8-a.flips.length); }
// Passing switches perspective without consuming a placement ply. Terminal
// positions are scored by actual on-board discs, without tournament bonuses.
export function chooseMove(p          , level                   = 'smart')                   {
  const roots = ordered(p.board,legalMoves(p.board,p.turn)); if (roots.length <= 1) return roots[0];
  const empty = p.board.filter(c=>c===null).length, depthLimit = level==='smart'?(empty<=8?empty:5):2, limit=level==='smart'?16000:2500;
  let nodes=0,stopped=false,best=roots[0];
  function search(position         ,depth       ,alpha       ,beta       )        {
    if(++nodes>limit){stopped=true;return 0;}
    const moves=ordered(position.board,legalMoves(position.board,position.turn));
    if(!moves.length){const other=(1-position.turn)       ;if(!legalMoves(position.board,other).length)return terminal(position.board,position.turn);return -search({...position,turn:other},depth,-beta,-alpha);}
    if(depth===0)return evaluate(position);
    let value=-Infinity;
    for(const move of moves){value=Math.max(value,-search({board:placed(position.board,move,position.turn),turn:(1-position.turn)       },depth-1,-beta,-alpha));if(stopped)return value;alpha=Math.max(alpha,value);if(alpha>=beta)break;}return value;
  }
  for(let depth=1;depth<=depthLimit;depth++){
    let candidate=best,value=-Infinity;
    for(const move of [best,...roots.filter(m=>m!==best)]){const score=-search({board:placed(p.board,move,p.turn),turn:(1-p.turn)       },depth-1,-Infinity,-value);if(stopped)break;if(score>value){value=score;candidate=move;}}
    if(stopped)break;best=candidate;
  }
  return best;
}
