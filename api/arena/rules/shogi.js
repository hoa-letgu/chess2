// Generated from Shogi/engine.ts. SHA256: 93d1f3f24713d5a3a6eb7fdd1877c3c3e537e820d33e1812ac48576171933da1
                         
                                                                 
                                          
                                                                  
                                            
                                                                                                                               
                                                                                    
                                     
                                                                                             
                                                           
  
export const HAND_ORDER             = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];
export const NAMES                       = { K: 'Vương tướng', R: 'Phi xa', B: 'Giác hành', G: 'Kim tướng', S: 'Ngân tướng', N: 'Quế mã', L: 'Hương xa', P: 'Bộ binh' };
export const ROMAJI                       = { K: 'Ōshō', R: 'Hisha', B: 'Kakugyō', G: 'Kinshō', S: 'Ginshō', N: 'Keima', L: 'Kyōsha', P: 'Fuhyō' };
export const KANJI                       = { K: '王将', R: '飛車', B: '角行', G: '金将', S: '銀将', N: '桂馬', L: '香車', P: '歩兵' };
export const PROMOTED                                = { R: '龍王', B: '龍馬', S: '成銀', N: '成桂', L: '成香', P: 'と金' };
export const GUIDE                       = {
  K: 'Đi 1 ô theo mọi hướng. Không được đến ô bị đối phương khống chế.', R: 'Đi thẳng ngang hoặc dọc, không nhảy qua quân. Phong cấp thêm đi chéo 1 ô.',
  B: 'Đi chéo không giới hạn, không nhảy qua quân. Phong cấp thêm đi ngang/dọc 1 ô.', G: 'Đi 1 ô: tiến, chéo tiến, ngang hoặc lùi thẳng. Không chéo lùi.',
  S: 'Đi 1 ô tiến thẳng hoặc chéo theo cả hai chiều. Phong cấp đi như Kim tướng.', N: 'Nhảy 2 ô tiến và 1 ô ngang. Phong cấp đi như Kim tướng.',
  L: 'Đi thẳng về phía trước không giới hạn, không nhảy qua quân. Phong cấp đi như Kim tướng.', P: 'Tiến thẳng 1 ô, bắt quân cũng tiến thẳng. Phong cấp đi như Kim tướng.',
};
export const sideName = (side      ) => side === 0 ? 'Sente' : 'Gote';
export const coord = (i        ) => `${9 - i % 9}${'abcdefghi'[Math.floor(i / 9)]}`;
export const pieceName = (p       ) => p.promoted ? p.kind === 'R' ? 'Long vương' : p.kind === 'B' ? 'Long mã' : `${NAMES[p.kind]} đã phong cấp` : NAMES[p.kind];
export const emptyHand = ()       => ({ R: 0, B: 0, G: 0, S: 0, N: 0, L: 0, P: 0 });
const inside = (r        , c        ) => r >= 0 && r < 9 && c >= 0 && c < 9;
const camp = (side      , row        ) => side === 0 ? row <= 2 : row >= 6;
export function positionKey(p          )         { return p.board.map(x => x ? `${x.side}${x.kind}${x.promoted ? '+' : ''}` : '.').join('/') + `:${p.turn}:` + p.hands.map(h => HAND_ORDER.map(k => h[k]).join(',')).join('/'); }
export function newShogi()             {
  const board                   = Array(81).fill(null), back         = ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'];
  for (const side of [0, 1]         ) {
    function put(row        , col        , kind      ) { board[row * 9 + col] = { side, kind, promoted: false }; }
    back.forEach((k, c) => put(side === 0 ? 8 : 0, c, k));
    for (let c = 0; c < 9; c++) put(side === 0 ? 6 : 2, c, 'P');
    put(side === 0 ? 7 : 1, side === 0 ? 7 : 1, 'R'); put(side === 0 ? 7 : 1, side === 0 ? 1 : 7, 'B');
  }
  const s             = { board, hands: [emptyHand(), emptyHand()], turn: 0, moves: 0, winner: null, reason: '', last: null, logs: ['Khai cuộc. Sente đi trước. Một nước cờ, một thế trận.'], history: [] };
  s.history = [{ key: positionKey(s), turn: 0, checked: false }]; return s;
}
                               
const orth           = [[1, 0], [-1, 0], [0, 1], [0, -1]], diag           = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
function movement(p       )                                      {
  const gold           = [[1, -1], [1, 0], [1, 1], [0, -1], [0, 1], [-1, 0]];
  if (p.kind === 'K') return { steps: [...orth, ...diag], rays: [] };
  if (p.kind === 'G' || p.promoted && ['P', 'L', 'N', 'S'].includes(p.kind)) return { steps: gold, rays: [] };
  if (p.kind === 'S') return { steps: [[1, 0], ...diag], rays: [] };
  if (p.kind === 'N') return { steps: [[2, -1], [2, 1]], rays: [] };
  if (p.kind === 'P') return { steps: [[1, 0]], rays: [] };
  if (p.kind === 'L') return { steps: [], rays: [[1, 0]] };
  if (p.kind === 'R') return { steps: p.promoted ? diag : [], rays: orth };
  return { steps: p.promoted ? orth : [], rays: diag };
}
export function attacks(board                  , from        , to        )          {
  if (from === to || !board[from] || !Number.isInteger(to) || to < 0 || to >= 81) return false;
  const p = board[from] , r = Math.floor(from / 9), c = from % 9, rr = Math.floor(to / 9), cc = to % 9, direction = p.side === 0 ? -1 : 1;
  const dr = rr - r, dc = cc - c, { steps, rays } = movement(p);
  if (steps.some(([vr, vc]) => dr === vr * direction && dc === vc)) return true;
  for (const [vr, vc] of rays) {
    const stepR = vr * direction, distance = stepR ? dr / stepR : dc / vc;
    if (!Number.isInteger(distance) || distance <= 0 || dr !== stepR * distance || dc !== vc * distance) continue;
    let clear = true; for (let n = 1; n < distance; n++) if (board[(r + n * stepR) * 9 + c + n * vc]) { clear = false; break; }
    if (clear) return true;
  }
  return false;
}
export function kingSquare(p          , side      )         { return p.board.findIndex(x => x?.side === side && x.kind === 'K'); }
export function isChecked(p          , side       = p.turn)          {
  const king = kingSquare(p, side); return king < 0 || p.board.some((x, i) => x && x.side !== side && attacks(p.board, i, king));
}
function destinations(board                  , from        )           {
  const p = board[from] , r = Math.floor(from / 9), c = from % 9, direction = p.side === 0 ? -1 : 1, { steps, rays } = movement(p), result           = [];
  for (const [vr, vc] of steps) { const rr = r + vr * direction, cc = c + vc; if (inside(rr, cc) && board[rr * 9 + cc]?.side !== p.side) result.push(rr * 9 + cc); }
  for (const [vr, vc] of rays) for (let n = 1; n <= 8; n++) {
    const rr = r + n * vr * direction, cc = c + n * vc; if (!inside(rr, cc)) break; const i = rr * 9 + cc;
    if (board[i]?.side === p.side) break; result.push(i); if (board[i]) break;
  }
  return result;
}
function deadRank(kind      , side      , row        )          { const distance = side === 0 ? row : 8 - row; return (kind === 'P' || kind === 'L') ? distance === 0 : kind === 'N' && distance <= 1; }
function shifted(p          , m      )           {
  const board = [...p.board], hands               = [{ ...p.hands[0] }, { ...p.hands[1] }];
  if (m.type === 'drop') { hands[p.turn][m.kind]--; board[m.to] = { kind: m.kind, side: p.turn, promoted: false }; }
  else { const actor = p.board[m.from] , victim = p.board[m.to]; if (victim && victim.kind !== 'K') hands[p.turn][victim.kind]++; board[m.to] = { ...actor, promoted: actor.promoted || m.promote }; board[m.from] = null; }
  return { board, hands, turn: (1 - p.turn)         };
}
function boardMoves(p          , source         )         {
  const result         = [];
  for (let i = 0; i < 81; i++) if ((source === undefined || source === i) && p.board[i]?.side === p.turn) {
    const piece = p.board[i] ;
    for (const to of destinations(p.board, i)) {
      if (p.board[to]?.kind === 'K') continue;
      const eligible = !piece.promoted && piece.kind !== 'K' && piece.kind !== 'G' && (camp(p.turn, Math.floor(i / 9)) || camp(p.turn, Math.floor(to / 9)));
      const forced = !piece.promoted && deadRank(piece.kind, p.turn, Math.floor(to / 9));
      const options = forced ? [true] : eligible ? [false, true] : [false];
      const candidate       = { type: 'move', from: i, to, promote: options[0] };
      if (!isChecked(shifted(p, candidate), p.turn)) for (const promote of options) result.push({ ...candidate, promote });
    }
  }
  return result;
}
function legalDrop(p          , kind          , to        )          {
  if (p.hands[p.turn][kind] < 1 || p.board[to] || deadRank(kind, p.turn, Math.floor(to / 9))) return false;
  if (kind === 'P' && p.board.some((x, i) => i % 9 === to % 9 && x?.side === p.turn && x.kind === 'P' && !x.promoted)) return false;
  const next = shifted(p, { type: 'drop', kind, to }); if (isChecked(next, p.turn)) return false;
  // An adjacent pawn check cannot be blocked by a drop. Testing board replies
  // alone is sufficient for uchifuzume, avoiding recursive legal-drop searches.
  if (kind === 'P' && attacks(next.board, to, kingSquare(next, next.turn)) && !boardMoves(next).length) return false;
  return true;
}
export function legalMoves(p          , source                    )         {
  const moves = typeof source === 'string' ? [] : boardMoves(p, source);
  if (typeof source !== 'number') for (const kind of typeof source === 'string' ? [source] : HAND_ORDER) if (p.hands[p.turn][kind] > 0) for (let to = 0; to < 81; to++) if (legalDrop(p, kind, to)) moves.push({ type: 'drop', kind, to });
  return moves;
}
export function sameMove(a      , b      )          { return a.type === b.type && a.to === b.to && (a.type === 'move' && b.type === 'move' ? a.from === b.from && a.promote === b.promote : a.type === 'drop' && b.type === 'drop' && a.kind === b.kind); }
export function applyMove(s            , m      )             {
  if (s.winner !== null || !legalMoves(s, m.type === 'move' ? m.from : m.kind).some(x => sameMove(x, m))) throw Error('Nước đi không hợp lệ. Hãy giải chiếu và kiểm tra luật phong cấp/thả quân.');
  const next = shifted(s, m), checked = isChecked(next), history = [...s.history, { key: positionKey(next), turn: next.turn, checked }];
  const actor = s.turn, piece = m.type === 'move' ? s.board[m.from]  : { kind: m.kind, side: actor, promoted: false }, victim = s.board[m.to];
  const line = `${sideName(actor)}: ${m.type === 'drop' ? `thả ${NAMES[piece.kind]}` : `${pieceName(piece)} ${coord(m.from)} →`} ${coord(m.to)}${m.type === 'move' && m.promote ? ' · phong cấp' : ''}${victim ? ` · bắt ${pieceName(victim)}` : ''}${checked ? ' · chiếu' : ''}.`;
  const result             = { ...next, moves: s.moves + 1, winner: null, reason: '', history, last: m, logs: [line, ...s.logs].slice(0, 16) };
  if (!legalMoves(next).length) { result.winner = actor; result.reason = checked ? 'Chiếu bí. Vương tướng không còn đường giải vây.' : 'Đối phương không còn nước đi hợp lệ.'; }
  else {
    const matching = history.flatMap((h, i) => h.key === history[history.length - 1].key ? [i] : []);
    if (matching.length >= 4) {
      const cycle = history.slice(matching[matching.length - 4] + 1), checking = ([0, 1]          ).filter(side => { const turns = cycle.filter(h => h.turn !== side); return turns.length > 0 && turns.every(h => h.checked); });
      if (checking.length === 1) { result.winner = (1 - checking[0])        ; result.reason = `${sideName(checking[0])} thua vì liên tục chiếu trong chu kỳ lặp 4 lần.`; }
      else { result.winner = -1; result.reason = 'Sennichite: cùng bàn cờ, quân trong tay và lượt đi lặp 4 lần.'; }
    } else if (result.moves >= 512) { result.winner = -1; result.reason = 'Hòa theo giới hạn 512 nửa lượt của bản đấu tập.'; }
  }
  return result;
}
export function declarationInfo(p          , side       = p.turn) {
  let pieces = 0, points = 0;
  p.board.forEach((x, i) => { if (x?.side === side && x.kind !== 'K' && camp(side, Math.floor(i / 9))) { pieces++; points += x.kind === 'R' || x.kind === 'B' ? 5 : 1; } });
  for (const kind of HAND_ORDER) points += p.hands[side][kind] * (kind === 'R' || kind === 'B' ? 5 : 1);
  const threshold = side === 0 ? 28 : 27, king = kingSquare(p, side);
  return { pieces, points, threshold, eligible: side === p.turn && king >= 0 && camp(side, Math.floor(king / 9)) && !isChecked(p, side) && pieces >= 10 && points >= threshold };
}
export function declareWin(s            )             { if (s.winner !== null || !declarationInfo(s).eligible) throw Error('Chưa đủ điều kiện tuyên thắng nhập ngọc.'); return { ...s, winner: s.turn, reason: `${sideName(s.turn)} tuyên thắng nhập ngọc, đạt ${declarationInfo(s).points} điểm.` }; }
const VALUE                       = { K: 20000, R: 1000, B: 850, G: 550, S: 420, N: 300, L: 280, P: 100 };
const worth = (p       ) => p.promoted ? p.kind === 'R' ? 1350 : p.kind === 'B' ? 1150 : 560 : VALUE[p.kind];
function evaluate(p          , side      )         {
  let score = 0;
  p.board.forEach((x, i) => { if (x) { const row = Math.floor(i / 9), progress = x.side === 0 ? 8 - row : row, center = 4 - Math.abs(i % 9 - 4); const value = worth(x) + (x.kind === 'K' ? -progress * 3 : progress * 3 + center * 2); score += x.side === side ? value : -value; } });
  for (const army of [0, 1]         ) for (const kind of HAND_ORDER) score += (army === side ? 1 : -1) * p.hands[army][kind] * VALUE[kind] * 1.06;
  return score;
}
function moveOrder(p          , m      )         {
  const victim = p.board[m.to], piece = m.type === 'move' ? p.board[m.from]  : { kind: m.kind, side: p.turn, promoted: false }, next = shifted(p, m);
  let score = (victim ? worth(victim) + VALUE[victim.kind] : 0) + (m.type === 'move' && m.promote ? worth({ ...piece, promoted: true }) - worth(piece) : 0);
  score += (4 - Math.abs(m.to % 9 - 4)) * 3 + (p.turn === 0 ? 8 - Math.floor(m.to / 9) : Math.floor(m.to / 9)) * 2;
  if (isChecked(next)) score += 65;
  if (next.board.some((x, i) => x && x.side !== p.turn && attacks(next.board, i, m.to))) score -= worth(piece) * .8;
  if (m.type === 'drop') score -= 16;
  return score;
}
// Bounded two-ply search keeps an interactive practice game responsive even
// with many drops. It uses public board/hand information only.
export function chooseMove(p          , level                   = 'smart')                   {
  const ordered = legalMoves(p).map(m => ({ m, order: moveOrder(p, m) })).sort((a, b) => b.order - a.order);
  if (level === 'easy' || ordered.length <= 1) return ordered[0]?.m;
  let best = ordered[0]?.m, score = -Infinity;
  for (const { m, order } of ordered.slice(0, 24)) {
    const next = shifted(p, m), replies = legalMoves(next); let value        ;
    if (!replies.length) value = 100000;
    else { value = Infinity; for (const reply of replies) { const leaf = shifted(next, reply); value = Math.min(value, evaluate(leaf, p.turn)); if (value + order * .035 < score) break; } }
    value += order * .035; if (value > score) { score = value; best = m; }
  }
  return best;
}
