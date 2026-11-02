# Shared match presentation

`MatchSurface.tsx` provides the decorative `BoardSurface`, the `MatchHeader`, and the two-seat `MatchPlayers`. Online `ArenaBoard` and all twelve offline boards use the same board furniture. The eight custom boards keep their coordinate systems, controls, themed pieces, and game rules inside that frame.

`OfflineArena` scopes the shared dark/gold offline presentation. It is applied once in `App.tsx`, for chess, xiangqi, go, gomoku, ludo, ô ăn quan, cờ chém, cờ úp, tycoon, Shogi, checkers, and Othello. Theme styles only target match furniture, panels, and controls; they do not replace native grids or hide game actions. Xiangqi retains its approved landscape and viewport-fitting layout.

Go and gomoku adapt their board values directly to `ArenaBoard`. Gomoku keeps its existing 25×15 rules and highlights winning squares. Go keeps its existing 19×19 rules. Chess retains its existing drag/drop setup, selected/legal highlights, animation and captured-piece renderer, inside the shared frame; its board colors match the online board. Detailed engine output remains available in a disclosure below the chess match.

This is a presentation change. Offline games remain free and local; it does not add online rooms, account requirements, coin settlement or new rule engines. The shared online match header retains its current account and room behavior.

Validation: Vite production build, targeted ESLint for new/shared board components, browser checks of all twelve games at desktop and 393px phone width, and move smoke checks for the legacy adapters and custom boards. The wider repository has pre-existing TypeScript errors outside these shared components.
