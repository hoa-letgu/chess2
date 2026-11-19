# Promotion / check freeze fix — 2026-11-19

Bot search previously ran synchronously 150ms after a move, interrupting the 260ms pawn-promotion animation. Search now runs in chess-bot.worker.ts with its existing depth/time budget. Results are discarded on stale generation/FEN, undo or pause. Worker failure/time limit falls back to a legal move without synchronous deep search. Effects have both animation finish cleanup and a bounded timeout, plus unmount cancellation. Reduced-motion bypasses the travel layer.

Browser QA via lobby and setup UI: white king e1, pawn b7; black king e8, rook h8, pawn f7. White b7-b8 automatically promotes to queen and checks king. Mid-animation two temporary effect nodes. After 900ms zero nodes and exactly white queen at b8; 50 requestAnimationFrame callbacks during that interval. Bot moves king to e7, effects clean to zero, white king selectable afterward. This directly covers offline promotion/check responsiveness; shared motion cleanup is also used online, but promotion online was not replayed in two browsers in this check.

ESLint shared motion/worker passed. Vite packaging passed. Global TypeScript checks continue to report older errors in other files.
