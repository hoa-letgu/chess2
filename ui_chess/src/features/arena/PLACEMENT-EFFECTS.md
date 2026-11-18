# Caro & Go placement effects

Shared renderer: ArenaBoard + usePlacementMotion. Canonical game state remains authoritative; animation layers never submit moves or change scores.

Caro: sequential X strokes, O stroke/pop, optional stone display, last-move waiting ring, invalid-cell feedback, exact five-cell win sweep and draw overlay. The winning segment includes the decisive move even when joining an overline. Appearance selection is local to each player.

Go: subtle drop, 500ms halo, simultaneous captured-stone fade/sparks, optional short synthesized placement sound (enabled by checkbox and user gesture), optional atari outlines based on distinct group liberties. End-state empty territory is flood-filled, mixed borders remain neutral. Scoring follows the existing area rule with 6.5 komi; no automatic removal/adjudication of dead groups. Offline practice has pass and an explicit current-board scoring button. The offline bot searches in a worker, retaining the strongest completed depth within five seconds.

Reduced-motion preferences disable the placement drawing/drop/flash and invalid shake. Repeated board updates, initial snapshots and resets do not replay placement effects.

Verification:
- Four model tests passed: five-in-a-row/overline, unique liberties, territory/neutral regions, placement/capture vs duplicate/reset.
- Playwright through normal lobby: offline Caro X strokes sampled mid-animation (second stroke delayed 170ms), occupied cell error; offline Go drop and finish controls.
- Two isolated browser contexts, temporary in-memory API, zero-coin rooms: Go two-stone atari/capture (two fading ghosts + two subtle particles in receiving browser), illegal suicide feedback, both sides identical, two passes to matching 77 marked territory intersections.
- Online Caro: five cells highlighted on both boards, win sweep sampled while running, stone drop sampled and screenshot saved by Playwright, agreed draw shows Hòa and opacity .45 on both clients.
- Mobile 393px: document width 393px, no horizontal overflow. Reduced-motion sample reports animation none.
- Vite production build and focused ESLint passed. Project-wide TypeScript still reports pre-existing legacy errors.
