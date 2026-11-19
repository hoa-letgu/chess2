# Soft classic chess set

Twelve SVG pieces, six silhouettes in charcoal and ivory. Rounded dark outlines, restrained gradients, lightweight ground shadows. Source: src/features/arena/SoftChessPiece.tsx. Rebuild from ui_chess with `node build-soft-pieces.mjs`.

Used by ArenaBoard online, offline PIECE_IMG, setup, promotion and the movement layer. Existing PNGs retained. This is a vector redraw inspired by the supplied reference, not a pixel-identical traced asset.

QA: offline opening shows all twelve shapes; normal move uses soft SVG in flight; no broken piece images; production Vite packaging and component ESLint passed. Online shares exactly the same SVGs.
