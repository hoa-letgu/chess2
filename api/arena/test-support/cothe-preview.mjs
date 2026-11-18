// In-memory browser QA only: the second account simulates a remote human.
import express from 'express';
import {createServer} from 'node:http';
import {io} from 'socket.io-client';
import {installArena} from '../server.js';
import {legalMoves} from '../rules/cothe.js';
const app=express(),server=createServer(app),arena=installArena(app,server,{dbPath:':memory:'});
arena.store.register('cothe_preview','preview-password');
const second=arena.store.register('cothe_remote','preview-password');
await new Promise(resolve=>server.listen(3307,'127.0.0.1',resolve));
const cookie=`arena_session=${second.token}`;
const socket=io('http://127.0.0.1:3307',{path:'/arena-socket',transports:['websocket'],extraHeaders:{Cookie:cookie}});
async function request(path,body){const r=await fetch('http://127.0.0.1:3307/api/arena'+path,{headers:{Cookie:cookie,'X-Arena-Request':'1','Content-Type':'application/json'},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
let busy=false;
const timer=setInterval(async()=>{if(busy)return;busy=true;try{
 const {rooms,current}=await request('/rooms');
 const waiting=rooms.find(room=>room.game==='cothe'&&room.status==='waiting');
 if(waiting&&!current)await request(`/rooms/${waiting.id}/join`,{});
 else if(current?.game==='cothe'&&current.status==='playing'&&current.state.turn===1){const move=legalMoves(current.state.board,1)[0];await request(`/rooms/${current.id}/action`,{type:'move',version:current.version,...move});}
}catch(e){console.error(e.message);}finally{busy=false;}},800);
console.log('Cothe QA on 3307 (memory only)');
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{clearInterval(timer);socket.disconnect();arena.close();process.exit(0);});
