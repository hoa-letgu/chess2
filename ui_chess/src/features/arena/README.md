# Shared match presentation

`MatchSurface.tsx` provides the decorative `BoardSurface`, the `MatchHeader`, and the two-seat `MatchPlayers`. Online `ArenaBoard` and all twelve offline boards use the same board furniture. The eight custom boards keep their coordinate systems, controls, themed pieces, and game rules inside that frame.

`OfflineArena` scopes the shared dark/gold offline presentation. It is applied once in `App.tsx`, for chess, xiangqi, go, gomoku, ludo, ô ăn quan, cờ chém, cờ úp, tycoon, Shogi, checkers, and Othello. Theme styles only target match furniture, panels, and controls; they do not replace native grids or hide game actions. Xiangqi retains its approved landscape and viewport-fitting layout.

Go and gomoku adapt their board values directly to `ArenaBoard`. Gomoku keeps its existing 25×15 rules and highlights winning squares. Go keeps its existing 19×19 rules. Chess retains its existing drag/drop setup, selected/legal highlights, animation and captured-piece renderer, inside the shared frame; its board colors match the online board. Detailed engine output remains available in a disclosure below the chess match.

Offline games remain free and local. The shared online match header retains its account, room and coin behavior; all twelve games can now enter this shared online flow.

Validation: Vite production build, targeted ESLint for new/shared board components, browser checks of all twelve games at desktop and 393px phone width, and move smoke checks for the legacy adapters and custom boards. The wider repository has pre-existing TypeScript errors outside these shared components.


## Direct BOT entry

Selecting practice in the lobby opens chess, xiangqi, go and gomoku directly in BOT mode, without an initial settings popup. Chess starts active (human White, bot Black), xiangqi starts human Red, go human Black, and gomoku human X. Settings remain available on demand and pause pending bot scheduling. Chess fresh matches also resume immediately.

`bot-presets.ts` names the highest existing engine profiles: chess depth 6 with a bounded 3.6s search budget, xiangqi depth 4, Go local search depth 5, and gomoku two reply plies after a candidate placement. These are per-engine limits, not comparable strength ratings or a claim of tournament-strength play. The chess hook now honors its configured search budget instead of overriding it with one second. Gomoku cancels scheduled replies when a game is reset or settings interrupt the turn.


## Online custom games

`game-types.ts` registers all twelve online game identifiers. Lobby cards open the common mode selector; online mode enters `ArenaHub`. `OnlineNativeMatch.tsx` renders the eight native boards and sends commands through the existing authenticated, versioned room action endpoint. It does not calculate authoritative dice, reveals, outcomes or wallet changes. The server validates commands with generated copies of the canonical offline rule engines.

Online custom rooms currently have two human seats, including Ludo and Tycoon. Offline 2–4 player options remain available. Shogi has hand drops and promotion choice; checkers retains forced capture chains; Othello passes automatically; Tycoon includes property management and debt actions. Dice, future cards and face-down piece reveals are server-controlled. Shared resign/join/exit confirmations use React dialogs.

Validation: 29 backend tests, production Vite bundling, focused TypeScript/ESLint checks, and browser move checks across the eight custom online games with two test accounts. Preview support uses an isolated in-memory database and never the user database.


## Admin reports

`AdminPage.tsx` is lazy-loaded at `/#admin` or `/admin`, with responsive sidebar/tab navigation, a daily top-up chart, game activity, searchable paginated users/top-ups, five leaderboards, user history and review dialogs. All reporting routes enforce the server-side admin role. `useArenaPresence.ts` records authenticated site activity separately from match connectivity. See the API arena README for provisioning, SQLite migration, metrics, reporting periods and alert thresholds. Normal users cannot promote themselves. Existing account data is retained.


## Payment UI and wallet modes

`AdminPayments.tsx` manages the Demo/Paid switch, Sandbox/Live selection, VND-per-coin rate, public origin, per-method switches, bank gateway choice and order history. `GatewayCredentials.tsx` lets admins enter merchant credentials without receiving stored secrets back. The API encrypts these values in SQLite. `WalletPanel.tsx` is lazy-loaded and shows free demo top-ups or the real/sandbox checkout form from the server config. `payment-client.ts` contains public DTOs only; provider keys never enter frontend config.

Hosted checkout and server-generated QR share one order ID. A return URL only opens the owner's order; it does not credit a wallet. PayPal capture requires an explicit owner action, and its actual USD price is displayed. Missing or disabled gateways cannot create orders. The server calculates and freezes amount, currency, coins and wallet environment. The default requested exchange rate is 1 VND per coin. See the API `PAYMENTS.md` for setup and operational limits.

## Caro paper theme
Caro uses cell-boundary grid lines and centered SVG marks shared by online and offline. `caro-paper.css` provides ivory paper, a thin olive grid, teal brush-style X strokes and orange O strokes. The offline Caro shell uses the same light paper palette. Go and Xiangqi retain intersection-based grids and their own themes.


## Chinese honey-wood tables
Xiangqi, Co Up and Co The share ChineseMatchHeader, ChineseFiles and chinese-table.css. Board and pieces use honey-wood.webp; the small local WenKai text subset gives consistent calligraphic chess symbols across devices. Coordinate labels are decorative (not extra squares), reversed when the board flips. All rules, hit areas and board indices remain unchanged.
Player seals and a turn track show actual side/room names and turn, without a fabricated engine evaluation or rank. Puzzle/end-state labels override the turn text after completion. Offline Xiangqi names reflect human/BOT side, online names come from room players, and Co Up keeps all unrevealed identities hidden.
The bamboo landscape remains outside the playing area. The board gets a thick wood edge, double-ring raised discs, proportional shadows and selected-square arrows. Editor boards use the same wood furniture without player headers. Responsive width rules reserve height for headers, coordinate rows and controls.
