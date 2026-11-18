import express from 'express';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const builtUiPath=fileURLToPath(new URL('../ui_chess/dist/',import.meta.url));
export function installPublicUi(app,directory=builtUiPath){
  const root=resolve(directory),index=resolve(root,'index.html');
  if(!existsSync(index))throw Error('Chưa có giao diện đã build. Chạy scripts/start-public.ps1 từ thư mục dự án.');
  app.disable('x-powered-by');
  app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','same-origin');next();});
  app.use(express.static(root,{index:false,dotfiles:'deny',maxAge:'1h'}));
  app.get('/{*path}',(req,res)=>{
    if(req.path.startsWith('/api/')||req.path.startsWith('/socket.io')||req.path.startsWith('/arena-socket')||extname(req.path)||req.path.split('/').some(part=>part.startsWith('.')))return res.status(404).end();
    res.set('Cache-Control','no-store').sendFile(index);
  });
}

export function sameHostOrigin(req){
  if(!req.headers.origin)return true;
  try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}
}
