# Shōgun Dojo — Shogi

Local 9×9 Shogi with an original Japanese ink/wood/vermilion visual design. Bot (Sente or Gote, two levels), two people on one device, board flip, pause, resignation, move hints, Vietnamese piece guides, promotion choice and komadai hand racks. SVG artwork is original; Lucide icons reuse the existing dependency. This game has no online rooms or wallet integration and is not persisted on reload.

Rules checked against the [FESA Laws of Shogi](https://fesashogi.eu/old/pdf/FESA%20rules.pdf) and [Japan Shogi Association rule FAQ](https://www.shogi.or.jp/faq/rules/):

- Captures enter the capturer's hand, demoted; drops use an empty square and an unpromoted piece. Nifu, dead-rank drops and pawn-drop mate are rejected.
- Promotion is available on moves entering, within or leaving the opposing three ranks. Pawn/lance and knight dead-rank promotions are mandatory. King safety and all promoted movements are enforced.
- Fourfold repetition includes board, hands and turn. A sole continuous checker loses; ordinary repetition draws. A mutually checking repetition is treated as a practice draw.
- Entering-king declaration uses camp/hand points, at least ten non-king camp pieces, safe camp king, and 28/27 Sente/Gote thresholds. No clock condition is needed in this untimed practice game. Eligible declarations are offered by the UI; the bot declares automatically.

The separate **practice-only limit of 512 half-moves** produces a draw. This is not tournament timing/adjudication software.

The immutable engine rejects illegal actions before committing. Pawn-drop mate validation checks legal board replies only: an adjacent checking pawn cannot be blocked with a drop, so recursive drop generation is unnecessary. Piece stock is preserved by kind across board and hands.

The easy bot orders moves by capture, promotion, check, activity and immediate exposure. The smart bot considers up to 24 ordered root moves and all opponent replies (two plies), with material/activity evaluation and a safe early cutoff. It is a bounded practice opponent, not a tournament-strength engine. It does not search game history for repetition/declaration during candidate evaluation; the actual state transition adjudicates repetition after every committed move.

`npm run test:shogi`: 20 tests cover setup, movement, promotion, drops, capture demotion, nifu, uchifuzume, king safety, repetition, perpetual check, declarations, bot legality and 80-ply stock invariants. Validate the frontend with targeted ESLint and `npx vite build`; repository-wide TypeScript errors predate this game.
