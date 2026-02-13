// games/goRules.js

export function opposite(color) {
  return color === "black" ? "white" : "black";
}

const DIRS = [
  [1, 0], [-1, 0],
  [0, 1], [0, -1],
];

export function getGroup(board, r, c, visited = new Set()) {
  const size = board.length;
  const color = board[r][c];
  if (!color) return { stones: [], liberties: 0 };

  const key = `${r},${c}`;
  if (visited.has(key)) return { stones: [], liberties: 0 };
  visited.add(key);

  let stones = [[r, c]];
  let liberties = 0;

  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;

    const t = board[nr][nc];
    if (t === null) liberties++;
    else if (t === color) {
      const g = getGroup(board, nr, nc, visited);
      stones.push(...g.stones);
      liberties += g.liberties;
    }
  }

  return { stones, liberties };
}

export function removeDeadGroups(board, color) {
  const size = board.length;
  const next = board.map(r => [...r]);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (next[r][c] !== color) continue;
      const g = getGroup(next, r, c);
      if (g.liberties === 0) {
        for (const [gr, gc] of g.stones) {
          next[gr][gc] = null;
        }
      }
    }
  }
  return next;
}

export function boardToKey(board) {
  return board.map(r => r.map(c => c || ".").join("")).join("/");
}

export function playMove(board, r, c, color, history) {
  if (board[r][c] !== null) return null;

  const next = board.map(row => [...row]);
  next[r][c] = color;

  // ăn quân đối phương
  const enemy = opposite(color);
  const afterCapture = removeDeadGroups(next, enemy);

  // suicide
  const g = getGroup(afterCapture, r, c);
  if (g.liberties === 0) return null;

  // KO
  const key = boardToKey(afterCapture);
  if (history.length >= 2 && history[history.length - 2] === key) {
    return null;
  }

  return afterCapture;
}
