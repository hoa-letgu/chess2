# Empire Avenue — Cờ tỷ phú

Original 32-space American city themed property game. Local 2–4 players, or one person against 1–3 bots. Launched from the shared lobby. Cash is private to the match and has no connection to the wallet, real payments, withdrawals or prizes. Games are not saved on reload.

## Rules of this edition

- Start with $1,500. Roll two dice once per turn; doubles do not grant another roll. Passing/landing on START while moving forward awards $200. Backward movement and transport to jail do not award salary.
- Buy an unowned city, station or utility, or pass. No auctions, mortgages or player-to-player trading. Owned properties charge rent automatically; your own properties are free to visit.
- Eight color pairs. A complete pair doubles base rent before development. Build evenly during management, at most three levels per city. Rent multipliers at levels 1/2/3 are 3/8/16 times base rent. Building fees depend on district.
- Railway rents are $25/$50/$100 for 1/2/3 stations. Utilities charge 4× dice sum, or 10× when both are owned. Parks grant $40; taxes and event payments go to the bank.
- Ten event cards are shuffled with unbiased crypto randomness on setup, then cycle in that order. Cards can award/charge cash, move backward, go to START/jail/next railway, or charge repair fees. Relocation resolves its destination, including rent/purchase/tax.
- Being sent to jail ends movement. Next turn pay $50 to move, or spend the whole turn waiting and leave jail. Visiting the jail space ordinarily has no effect.
- During management or a debt prompt, sell buildings evenly from the highest level. Clear all buildings in a color pair before selling land. All sales return half the original cost (rounded down).
- Debt remains pending in full until paid. If total liquidation cannot cover it, bankruptcy liquidates all remaining assets, transfers liquidation proceeds to a player creditor (or the bank), returns properties to the bank, and removes the player. Solvent players must settle instead of declaring bankruptcy.
- Last survivor wins. Otherwise 12/20/30 full rounds end with the highest cash + original property cost + building cost winning; exact ties share victory. Eliminated seats are skipped.

The reducer is immutable, validates actions by phase and rejects insufficient-fund purchases, unbalanced building, premature turn changes and invalid dice. The bot uses the same actions, reserves cash, prioritizes completing pairs, develops affordable full sets and liquidates when indebted. Animation is presentation only; each dice result is sampled once and the resolved state commits once.

Artwork is original native SVG/CSS: skyline, board, cover, dice and token markers. Icons use the existing Lucide library. Responsive styles, keyboard focus, accessible tile descriptions and reduced-motion support are included.

Validation: `npm run test:tycoon` (18 tests including 30 complete seeded simulations), targeted ESLint and `npx vite build`. Repository-wide TypeScript checking still reports preexisting errors outside this game.
