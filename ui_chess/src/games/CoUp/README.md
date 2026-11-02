# Long Ẩn Kỳ — Cờ úp

Standalone local game launched from the lobby. Bot (two heuristic levels) or two people on one device, red/black choice, board flip, pause, public-information hints, move history, capture trays and surrender. No online rooms or wallet integration in this version.

Rules follow Vietnamese 9×10 cờ úp: exposed generals, 15 covered pieces per side; first move uses the original position's role, subsequent moves use the revealed identity. Revealed advisors can leave the palace and revealed elephants can cross the river, retaining diagonal movement and eye blocking. King safety, facing generals, horse legs, cannon screens, checkmate and stalemate are enforced. Sources: [ClubXiangqi rules](https://www.clubxiangqi.com/vi/uprules.php), [ChessPlayX cờ úp](https://chessplayx.com/vi/coup).

Covered identities are dealt lazily without replacement using rejection-sampled `crypto.getRandomValues`. Each side's pool includes identities belonging to covered pieces already captured. Such captures stay unknown and do not remove a known identity from the pool. This is equivalent to uniformly shuffling the original army and marginalizing every unrevealed slot; a player cannot inspect preassigned hidden faces in state. There is no undo, avoiding reveal-and-retry. Not a server-authoritative competitive implementation.

The bot accepts only a copied public observation: visible faces, initial roles, and the army minus publicly revealed faces. It scores captures, advancement, development, expected material risk and potential checks. It never samples a future reveal, and is a heuristic practice opponent rather than a tournament engine.

Practice draw rules: same public position and turn three times; 120 half-moves without capture/reveal; 400 half-moves total. Competition-specific perpetual check/chase adjudication is not implemented. Games are not saved on reload.

Run `npm run test:up` for rule, secrecy, bot and state-invariant tests. SVG board/pieces/cover are original code-native artwork, with responsive CSS and reduced-motion support.
