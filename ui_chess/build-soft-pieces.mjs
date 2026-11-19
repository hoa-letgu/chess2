import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('public/chess/soft',{recursive:true});
await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Piece from './src/features/arena/SoftChessPiece';import {writeFileSync} from 'node:fs';for(const p of 'pnbrqkPNBRQK'){const svg=renderToStaticMarkup(React.createElement(Piece,{piece:p})).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');writeFileSync('public/chess/soft/'+(p===p.toUpperCase()?'w':'b')+p.toLowerCase()+'.svg',svg);}`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',outfile:'.soft-pieces-build.mjs'});
await import('./.soft-pieces-build.mjs');
