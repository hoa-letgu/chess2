# Magic Flip / Royal Crown — 2026-11-19

Shared boards and replay sequences serve both offline and online.

## Cờ Chém
- Dash 250ms; double slash and conversion flip 520ms; surround 600ms; trap sparkle 380ms; victory 1200ms.
- Converted pieces retain their old side until the flip, then display the confirmed new side. They are not removed.
- Surround outlines trace the outside of occupied points rather than connecting their centres. Boundary pieces light sequentially; six particles per converted point.
- Hint mode shows dotted forced trap responses. Results wait for the victory animation.

## Cờ Đam
- Existing slide/jump, capture fade, multi-jump combo and 750ms coronation retained.
- Moving piece now uses the exact cell origin and 11% disc inset, including the reversed board.
- Replay validates the exact legal next board, turn, ply and chain before animating; skipped or duplicate snapshots do not fabricate jumps.

## Online fix
ArenaHub preserves each CoChem/Checkers board component for the room lifetime. Previously, a room-version key remounted the board on each move and prevented state-difference effects.

## Verification
- 31 rule tests and 5 motion-model tests passed, including surround, trap, victory, chained capture, promotion and missed snapshots.
- Playwright offline: entered from lobby, selected/moved a piece and sampled dash.
- Two isolated online sessions, free CoChem room: 22→17, 10→16; incoming capture showed two slashes, two flips, 12 particles, 0.52s flip duration; both boards retain 16 pieces.
- Two isolated online sessions, free Checkers room: 40→33, 19→26, 33→19; incoming reversed-board jump showed one ghost and one captured target; both boards end with 23 pieces.
- Mobile 393px: no horizontal overflow in Checkers.
- ESLint touched board/model files and Vite packaging passed. Surround, trap, victory, combo and promotion branches were tested at model level, not all exercised in live online browser sessions.
- No rule or wallet changes. Existing global TypeScript errors are outside these changes.
