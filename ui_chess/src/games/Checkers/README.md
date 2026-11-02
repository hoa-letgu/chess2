# Iron Crown — Cờ Đam

Standalone English draughts 8×8, with original Western heraldic stone/metal artwork. Crimson Lion (red, first) against Ivory Eagle. Bot at two levels, human side selection, two local players, board flip, pause, resignation, tactical hints, capture trays and a completed-turn chronicle. Coins/online rooms are not integrated. Games are not persisted on reload.

Movement and capture rules follow [WCDF English checkers rules](https://wcdf.net/rules/rules_of_checkers_english.pdf): 12 pieces per side; forward-only men; short-range kings; compulsory capture; complete same-piece jump chains; free choice among capture routes, without a maximum-capture requirement. Reaching the crown row ends a man's turn immediately. No move on your turn means a loss. This is not international 10×10 or flying-king draughts.

This practice implementation automatically draws at threefold board-and-turn repetition or 80 completed half-moves without capture/man advance. WCDF handles these through claims/adjudication. A separate practice-only cap at 400 half-moves also draws; no clock or negotiated-draw flow is implemented.

The immutable `applyStep` reducer validates global capture priority and locks an unfinished chain to one piece. Turn count, repetition keys and journal entries advance only when the full chain finishes. Captured stock is preserved separately by capturing army. `legalTurns` enumerates every complete route for search and hints. Visual movement commits one validated step once; unmount/restart clears pending animations.

The bot searches full turns rather than individual jumps, using iterative deepening, alpha-beta pruning and material/development evaluation. Easy searches up to two plies under 2,500 nodes; smart up to five under 24,000. Only completed iterations replace the chosen move. Search does not incorporate historical draw adjudication; actual committed moves do. It is a practice opponent, not a tournament engine.

Original SVG heraldry, castle, cover and discs use CSS metal shading with reduced-motion support. Icons use the existing Lucide library. All UI styles are scoped to `ck-*` classes.

Run `npm run test:checkers`: 18 tests, including eight full simulated games. Targeted ESLint and `npx vite build` validate the frontend. Whole-project TypeScript errors outside this game predate the addition.
