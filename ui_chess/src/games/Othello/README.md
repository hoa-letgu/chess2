# Othello · Huyền Ngọc

Standalone free practice game: local two-player or human versus bot, two bot levels, selectable side, board reversal, pause, resign, move previews and hints. No wallet, online rooms, persistence or payout integration.

Rules follow the [World Othello Federation](https://www.worldothello.org/about/about-othello/othello-rules/official-rules/english): black starts; a placement must outflank enemy discs; every directly outflanked line is flipped across eight directions. No chained capture from newly flipped discs. A player without moves passes automatically; neither player having a move ends the game, including with empty squares remaining. This implementation counts actual discs, with equal counts a draw; no tournament empty-square bonus.

`engine.ts` is immutable and UI-independent. Bot uses bounded iterative alpha-beta search with legal mobility, corners, frontier and anchored edges; its node budget keeps the last completed search iteration. Search is deterministic and is not a claim of perfect play. Small endgames search to completion when the budget permits.

Run `npm run test:othello` from `ui_chess`. Tests cover eight-direction flips, edge boundaries, immutable invalid moves, forced passes, partial-board endings, ties, color symmetry, bot legality, comparison against exhaustive endgame results, and seeded full-game invariants. The board animates direct flips before committing the next turn; input and bot scheduling are locked during animation and dialogs.
