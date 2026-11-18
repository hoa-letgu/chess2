export type Mode = 'bots' | 'local';
export type TileKind = 'start' | 'city' | 'chance' | 'tax' | 'rail' | 'utility' | 'jail' | 'park' | 'goJail';
export type Tile = { name: string; tag: string; kind: TileKind; price: number; rent: number; group: number; fee: number };
const city = (name: string, tag: string, price: number, group: number): Tile => ({ name, tag, kind: 'city', price, rent: price / 10, group, fee: 50 + group * 25 });
const special = (name: string, tag: string, kind: TileKind, price = 0): Tile => ({ name, tag, kind, price, rent: 0, group: -1, fee: 0 });
export const BOARD: Tile[] = [
  special('Xuất phát', 'START', 'start'), city('Brooklyn', 'NEW YORK', 100, 0), special('Cơ hội', 'CITY CARD', 'chance'), city('Queens', 'NEW YORK', 120, 0), special('Thuế thu nhập', 'TAX', 'tax', 100), city('Chicago', 'MIDWEST', 160, 1), special('Union Station', 'RAILWAY', 'rail', 180), city('Detroit', 'MIDWEST', 180, 1),
  special('Tạm giữ', 'JUST VISITING', 'jail'), city('Austin', 'TEXAS', 200, 2), special('Electric Co.', 'POWER', 'utility', 150), city('Dallas', 'TEXAS', 220, 2), special('Cơ hội', 'CITY CARD', 'chance'), city('Miami', 'FLORIDA', 240, 3), special('Pacific Rail', 'RAILWAY', 'rail', 220), city('Key West', 'FLORIDA', 260, 3),
  special('Công viên', 'CITY BREAK', 'park'), city('Denver', 'MOUNTAIN', 280, 4), special('Thuế tài sản', 'TAX', 'tax', 160), city('Seattle', 'NORTHWEST', 300, 4), special('Cơ hội', 'CITY CARD', 'chance'), city('Silicon Valley', 'BAY AREA', 320, 5), special('Water Works', 'WATER', 'utility', 150), city('San Francisco', 'BAY AREA', 340, 5),
  special('Đi tạm giữ', 'GO TO JAIL', 'goJail'), city('Los Angeles', 'CALIFORNIA', 360, 6), city('Hollywood', 'CALIFORNIA', 380, 6), special('Grand Central', 'RAILWAY', 'rail', 220), special('Cơ hội', 'CITY CARD', 'chance'), city('Manhattan', 'FINANCIAL', 420, 7), special('Thuế xa xỉ', 'TAX', 'tax', 200), city('Wall Street', 'FINANCIAL', 460, 7),
];
export const GROUPS = [
  { name: 'New York', color: '#8d8eff' }, { name: 'Midwest', color: '#63ccf4' }, { name: 'Texas', color: '#f69a66' }, { name: 'Florida', color: '#f28abe' },
  { name: 'North & West', color: '#6ccb9e' }, { name: 'Bay Area', color: '#b18cf1' }, { name: 'California', color: '#f3cb6b' }, { name: 'Financial District', color: '#e2ded1' },
];
export const TOKENS = [
  { name: 'Roadster', color: '#6ce4c2', symbol: 'car' }, { name: 'Rocket', color: '#7bb8ff', symbol: 'rocket' },
  { name: 'Lucky Dog', color: '#f5a36c', symbol: 'dog' }, { name: 'The Crown', color: '#bb98f3', symbol: 'crown' },
];
export const CARDS = [
  { title: 'Wall Street lên sóng', text: 'Danh mục đầu tư sinh lời. Nhận $120.', effect: 'cash', amount: 120 },
  { title: 'City maintenance', text: 'Đóng phí bảo trì đô thị $90.', effect: 'cash', amount: -90 },
  { title: 'Startup gọi vốn', text: 'Một thương vụ thành công. Nhận $180.', effect: 'cash', amount: 180 },
  { title: 'Vé phạt đại lộ', text: 'Thanh toán vé phạt $120.', effect: 'cash', amount: -120 },
  { title: 'Back to the beginning', text: 'Về Xuất phát và nhận $200.', effect: 'start', amount: 200 },
  { title: 'Một đêm tại precinct', text: 'Đến ô Tạm giữ. Không nhận tiền qua Xuất phát.', effect: 'jail', amount: 0 },
  { title: 'Đường đang sửa', text: 'Lùi 3 ô và xử lý ô vừa đến.', effect: 'back', amount: 0 },
  { title: 'Hoàn thuế', text: 'Hồ sơ thuế được duyệt. Nhận $80.', effect: 'cash', amount: 80 },
  { title: 'Nâng cấp hạ tầng', text: 'Trả $40, cộng $35 cho mỗi cấp nhà bạn đang sở hữu.', effect: 'repair', amount: 40 },
  { title: 'All aboard!', text: 'Đến ga kế tiếp. Nhận $200 nếu đi qua Xuất phát; xử lý ô ga như bình thường.', effect: 'rail', amount: 0 },
] as const;
export type Player = { id: number; name: string; bot: boolean; cash: number; position: number; jailed: boolean; alive: boolean };
export type Asset = { owner: number; level: number };
export type Debt = { amount: number; creditor: number | null; reason: string };
export type EmpireState = {
  revision?: number; lastAction?: Action;
  players: Player[]; assets: (Asset | null)[]; turn: number; round: number; maxRounds: number;
  phase: 'roll' | 'buy' | 'manage' | 'debt' | 'finished'; dice: [number, number]; rolls: number;
  debt: Debt | null; deck: number[]; cursor: number; lastCard: number | null; logs: string[]; winners: number[]; reason: string;
};
export type Action = { type: 'roll'; dice: [number, number] } | { type: 'buy' | 'pass' | 'end' | 'pay' | 'bankrupt' | 'bail' } | { type: 'build' | 'downgrade' | 'sell'; tile: number };
export const money = (value: number) => '$' + value.toLocaleString('en-US');
export function randomIndex(length: number): number {
  if (!Number.isInteger(length) || length < 1 || length > 0x100000000) throw Error('Khoảng ngẫu nhiên không hợp lệ.');
  const data = new Uint32Array(1), limit = Math.floor(0x100000000 / length) * length;
  do { crypto.getRandomValues(data); } while (data[0] >= limit);
  return data[0] % length;
}
export const dicePair = (): [number, number] => [randomIndex(6) + 1, randomIndex(6) + 1];
export function newEmpire(mode: Mode = 'bots', count = 4, maxRounds = 12, draw = randomIndex): EmpireState {
  if (!Number.isInteger(count) || count < 2 || count > 4 || ![12, 20, 30].includes(maxRounds)) throw Error('Cấu hình bàn không hợp lệ.');
  const deck = CARDS.map((_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) { const j = draw(i + 1); if (!Number.isInteger(j) || j < 0 || j > i) throw Error('Thẻ ngẫu nhiên không hợp lệ.'); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return {
    players: Array.from({ length: count }, (_, id) => ({ id, name: mode === 'bots' ? id === 0 ? 'Bạn' : ['','Alex','Jordan','Taylor'][id] : `Người chơi ${id + 1}`, bot: mode === 'bots' && id > 0, cash: 1500, position: 0, jailed: false, alive: true })),
    assets: Array(32).fill(null), turn: 0, round: 1, maxRounds, phase: 'roll', dice: [1, 1], rolls: 0, debt: null, deck, cursor: 0, lastCard: null,
    logs: ['Thành phố mở cửa. Mỗi người bắt đầu với $1,500.'], winners: [], reason: '',
  };
}
export function groupTiles(index: number): number[] { const group = BOARD[index]?.group; return group !== undefined && group >= 0 ? BOARD.flatMap((t, i) => t.group === group ? [i] : []) : []; }
export function ownsGroup(s: EmpireState, owner: number, index: number): boolean { const group = groupTiles(index); return group.length > 0 && group.every(i => s.assets[i]?.owner === owner); }
export function netWorth(s: EmpireState, owner: number): number { return s.players[owner].cash + s.assets.reduce((sum, asset, i) => sum + (asset?.owner === owner ? BOARD[i].price + asset.level * BOARD[i].fee : 0), 0); }
export function liquidationValue(s: EmpireState, owner: number): number { return s.players[owner].cash + s.assets.reduce((sum, asset, i) => sum + (asset?.owner === owner ? Math.floor(BOARD[i].price / 2) + asset.level * Math.floor(BOARD[i].fee / 2) : 0), 0); }
export function rentAt(s: EmpireState, index: number, dice = s.dice[0] + s.dice[1]): number {
  const tile = BOARD[index], asset = s.assets[index]; if (!tile || !asset) return 0;
  if (tile.kind === 'city') return tile.rent * (asset.level ? [1, 3, 8, 16][asset.level] : ownsGroup(s, asset.owner, index) ? 2 : 1);
  const count = s.assets.filter((a, i) => a?.owner === asset.owner && BOARD[i].kind === tile.kind).length;
  if (tile.kind === 'rail') return 25 * 2 ** (count - 1);
  if (tile.kind === 'utility') return dice * (count === 2 ? 10 : 4);
  return 0;
}
const tradingPhase = (s: EmpireState) => s.phase === 'manage' || s.phase === 'debt';
export function canBuild(s: EmpireState, index: number): boolean {
  const a = s.assets[index], t = BOARD[index];
  return !!a && !!t && s.phase === 'manage' && a.owner === s.turn && t.kind === 'city' && a.level < 3 && ownsGroup(s, s.turn, index) && s.players[s.turn].cash >= t.fee && groupTiles(index).every(i => s.assets[i]!.level >= a.level);
}
export function canDowngrade(s: EmpireState, index: number): boolean {
  const a = s.assets[index]; return !!a && tradingPhase(s) && a.owner === s.turn && a.level > 0 && groupTiles(index).every(i => (s.assets[i]?.level ?? 0) <= a.level);
}
export function canSell(s: EmpireState, index: number): boolean {
  const a = s.assets[index]; return !!a && tradingPhase(s) && a.owner === s.turn && a.level === 0 && groupTiles(index).every(i => !s.assets[i]?.level);
}
function note(s: EmpireState, text: string) { s.logs = [text, ...s.logs].slice(0, 40); }
function rankFinish(s: EmpireState) {
  s.phase = 'finished'; const living = s.players.filter(p => p.alive), best = Math.max(...living.map(p => netWorth(s, p.id)));
  s.winners = living.filter(p => netWorth(s, p.id) === best).map(p => p.id); s.reason = `Hết ${s.maxRounds} vòng. Xếp hạng theo tiền mặt + giá mua tài sản + chi phí xây nhà.`;
}
function advance(s: EmpireState) {
  const living = s.players.filter(p => p.alive);
  if (living.length === 1) { s.phase = 'finished'; s.winners = [living[0].id]; s.reason = 'Người chơi cuối cùng còn trụ lại trên đại lộ.'; return; }
  let next = (s.turn + 1) % s.players.length;
  while (!s.players[next].alive) next = (next + 1) % s.players.length;
  if (next <= s.turn) { if (s.round >= s.maxRounds) { rankFinish(s); return; } s.round++; }
  s.turn = next; s.phase = 'roll'; s.debt = null;
}
function charge(s: EmpireState, amount: number, creditor: number | null, reason: string) {
  const p = s.players[s.turn];
  if (p.cash < amount) { s.debt = { amount, creditor, reason }; s.phase = 'debt'; note(s, `${p.name} cần ${money(amount)} để ${reason}. Bán tài sản hoặc nhà để trả nợ.`); return; }
  p.cash -= amount; if (creditor !== null) s.players[creditor].cash += amount;
  s.debt = null; s.phase = 'manage'; note(s, `${p.name} trả ${money(amount)}${creditor !== null ? ` cho ${s.players[creditor].name}` : ''}: ${reason}.`);
}
function jail(s: EmpireState) { const p = s.players[s.turn]; p.position = 8; p.jailed = true; s.phase = 'manage'; note(s, `${p.name} bị tạm giữ. Lượt sau trả $50 hoặc chờ hết một lượt.`); }
function land(s: EmpireState) {
  const p = s.players[s.turn], i = p.position, tile = BOARD[i], a = s.assets[i]; s.phase = 'manage';
  if (['city','rail','utility'].includes(tile.kind)) {
    if (!a) { s.phase = 'buy'; note(s, `${p.name} đến ${tile.name}. Giá mua ${money(tile.price)}.`); }
    else if (a.owner !== s.turn) charge(s, rentAt(s, i), a.owner, `thuê ${tile.name}`);
    else note(s, `${p.name} ghé ${tile.name} của mình. Không trả tiền thuê.`);
  } else if (tile.kind === 'tax') charge(s, tile.price, null, tile.name.toLowerCase());
  else if (tile.kind === 'goJail') jail(s);
  else if (tile.kind === 'park') { p.cash += 40; note(s, `${p.name} nghỉ tại công viên. Nhận thưởng thành phố $40.`); }
  else if (tile.kind === 'chance') {
    const id = s.deck[s.cursor % s.deck.length], card = CARDS[id]; s.cursor++; s.lastCard = id; note(s, `${p.name} rút thẻ: ${card.title}. ${card.text}`);
    if (card.effect === 'cash') { if (card.amount >= 0) p.cash += card.amount; else charge(s, -card.amount, null, card.title); }
    else if (card.effect === 'start') { p.position = 0; p.cash += 200; }
    else if (card.effect === 'jail') jail(s);
    else if (card.effect === 'back') { p.position = (p.position + 29) % 32; land(s); }
    else if (card.effect === 'repair') charge(s, 40 + s.assets.reduce((sum, a) => sum + (a?.owner === p.id ? a.level * 35 : 0), 0), null, 'nâng cấp hạ tầng');
    else if (card.effect === 'rail') {
      const distance = Array.from({ length: 32 }, (_, n) => n + 1).find(n => BOARD[(p.position + n) % 32].kind === 'rail')!;
      if (p.position + distance >= 32) { p.cash += 200; note(s, `${p.name} qua Xuất phát, nhận $200.`); }
      p.position = (p.position + distance) % 32; land(s);
    }
  } else note(s, `${p.name} ${tile.kind === 'jail' ? 'ghé thăm khu tạm giữ, vẫn tự do.' : 'đứng tại Xuất phát.'}`);
}
export function empireAction(original: EmpireState, action: Action): EmpireState {
  if (original.phase === 'finished') throw Error('Ván đấu đã kết thúc.');
  const s: EmpireState = { ...original, players: original.players.map(p => ({ ...p })), assets: original.assets.map(a => a ? { ...a } : null), dice: [...original.dice], logs: [...original.logs], deck: [...original.deck], debt: original.debt ? { ...original.debt } : null, winners: [...original.winners] };
  const p = s.players[s.turn];
  if (action.type === 'roll') {
    if (s.phase !== 'roll' || action.dice.length !== 2 || action.dice.some(n => !Number.isInteger(n) || n < 1 || n > 6)) throw Error('Chưa thể tung xúc xắc.');
    s.dice = [...action.dice]; s.rolls++; s.lastCard = null;
    if (p.jailed) { p.jailed = false; s.phase = 'manage'; note(s, `${p.name} chờ một lượt và được thả. Không di chuyển ở lượt này.`); }
    else {
      const distance = action.dice[0] + action.dice[1]; if (p.position + distance >= 32) { p.cash += 200; note(s, `${p.name} qua Xuất phát, nhận $200.`); }
      p.position = (p.position + distance) % 32; note(s, `${p.name} tung ${action.dice[0]} + ${action.dice[1]} = ${distance}.`); land(s);
    }
  } else if (action.type === 'buy') {
    const t = BOARD[p.position]; if (s.phase !== 'buy' || s.assets[p.position] || p.cash < t.price || !['city','rail','utility'].includes(t.kind)) throw Error('Không thể mua tài sản này.');
    p.cash -= t.price; s.assets[p.position] = { owner: p.id, level: 0 }; s.phase = 'manage'; note(s, `${p.name} mua ${t.name} với ${money(t.price)}.`);
  } else if (action.type === 'pass') {
    if (s.phase !== 'buy') throw Error('Không có giao dịch để bỏ qua.'); s.phase = 'manage'; note(s, `${p.name} bỏ qua ${BOARD[p.position].name}.`);
  } else if (action.type === 'build') {
    if (!canBuild(s, action.tile)) throw Error('Cần trọn bộ màu, xây cân bằng, tối đa 3 cấp và đủ tiền.');
    p.cash -= BOARD[action.tile].fee; s.assets[action.tile]!.level++; note(s, `${p.name} nâng ${BOARD[action.tile].name} lên cấp ${s.assets[action.tile]!.level}.`);
  } else if (action.type === 'downgrade') {
    if (!canDowngrade(s, action.tile)) throw Error('Phải bán nhà cân bằng, từ nơi có nhiều cấp nhất.');
    s.assets[action.tile]!.level--; p.cash += Math.floor(BOARD[action.tile].fee / 2); note(s, `${p.name} bán 1 cấp nhà tại ${BOARD[action.tile].name}.`);
  } else if (action.type === 'sell') {
    if (!canSell(s, action.tile)) throw Error('Cần bán hết nhà trong nhóm trước khi bán đất.');
    s.assets[action.tile] = null; p.cash += Math.floor(BOARD[action.tile].price / 2); note(s, `${p.name} bán ${BOARD[action.tile].name} cho ngân hàng, thu ${money(Math.floor(BOARD[action.tile].price / 2))}.`);
  } else if (action.type === 'bail') {
    if (s.phase !== 'roll' || !p.jailed || p.cash < 50) throw Error('Không thể nộp tiền bảo lãnh.');
    p.cash -= 50; p.jailed = false; note(s, `${p.name} nộp $50 để được di chuyển ngay lượt này.`);
  } else if (action.type === 'pay') {
    if (s.phase !== 'debt' || !s.debt || p.cash < s.debt.amount) throw Error('Chưa đủ tiền trả nợ.'); const d = s.debt; charge(s, d.amount, d.creditor, d.reason);
  } else if (action.type === 'bankrupt') {
    if (s.phase !== 'debt' || !s.debt || liquidationValue(s, p.id) >= s.debt.amount) throw Error('Bạn vẫn còn đủ tài sản để trả nợ.');
    const remaining = liquidationValue(s, p.id); if (s.debt.creditor !== null) s.players[s.debt.creditor].cash += remaining; p.cash = 0; p.alive = false;
    s.assets = s.assets.map(a => a?.owner === p.id ? null : a); s.debt = null; note(s, `${p.name} phá sản. Tài sản được ngân hàng thu hồi.`); advance(s);
  } else if (action.type === 'end') { if (s.phase !== 'manage') throw Error('Cần xử lý ô hoặc khoản nợ trước khi hết lượt.'); advance(s); }
  s.revision = (original.revision ?? 0) + 1; s.lastAction = action;
  return s;
}
export function chooseEmpireAction(s: EmpireState): Action | null {
  const p = s.players[s.turn]; if (s.phase === 'finished') return null;
  if (s.phase === 'roll') return p.jailed && p.cash >= 350 ? { type: 'bail' } : null;
  if (s.phase === 'buy') { const t = BOARD[p.position], pair = groupTiles(p.position).some(i => s.assets[i]?.owner === p.id); return { type: p.cash >= t.price + (pair ? 70 : 180) ? 'buy' : 'pass' }; }
  if (s.phase === 'debt') {
    if (p.cash >= s.debt!.amount) return { type: 'pay' };
    const building = s.assets.findIndex((_, i) => canDowngrade(s, i)); if (building >= 0) return { type: 'downgrade', tile: building };
    const property = s.assets.findIndex((_, i) => canSell(s, i)); if (property >= 0) return { type: 'sell', tile: property };
    return { type: 'bankrupt' };
  }
  const upgrade = s.assets.findIndex((_, i) => canBuild(s, i) && p.cash - BOARD[i].fee >= 300);
  return upgrade >= 0 ? { type: 'build', tile: upgrade } : { type: 'end' };
}
