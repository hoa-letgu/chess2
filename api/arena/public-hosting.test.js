import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer,request as httpRequest } from 'node:http';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { installPublicUi, sameHostOrigin } from '../public-ui.js';
import { installArena } from './server.js';
const {io:client}=createRequire(import.meta.url)('socket.io-client');
function hostedRequest(base,path,headers,body){return new Promise((resolve,reject)=>{
 const req=httpRequest(new URL(path,base),{method:body===undefined?'GET':'POST',headers},res=>{let text='';res.setEncoding('utf8');res.on('data',part=>{text+=part;});res.on('end',()=>{try{resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(text)});}catch(error){reject(error);}});});
 req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
});}

async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'arena-public-'));mkdirSync(join(root,'assets'));writeFileSync(join(root,'index.html'),'<h1>Public Arena</h1>');writeFileSync(join(root,'assets','app.js'),'console.log("built")');
 const app=express();app.set('trust proxy','loopback');const http=createServer(app),arena=installArena(app,http,{dbPath:':memory:'});installPublicUi(app,root);
 await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
 t.after(()=>{arena.close();rmSync(root,{recursive:true,force:true});});
 return {base:`http://127.0.0.1:${http.address().port}`,arena};
}
test('public server exposes only built files, SPA routes and the shared API',async t=>{
 const {base}=await fixture(t);
 for(const path of ['/','/admin','/rooms/example']){const r=await fetch(base+path);assert.equal(r.status,200);assert.equal(await r.text(),'<h1>Public Arena</h1>');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');}
 assert.equal(await (await fetch(base+'/assets/app.js')).text(),'console.log("built")');
 for(const path of ['/.env','/server.js','/src/App.tsx','/api/not-found','/assets/missing.js'])assert.equal((await fetch(base+path)).status,404,path);
 assert.equal((await (await fetch(base+'/api/arena/games')).json()).games.length,13);
 assert.equal((await fetch(base+'/api/arena/me')).status,401);
});
test('public origin checks keep same-host HTTPS and reject cross-site socket origins',()=>{
 const request=origin=>({headers:{host:'game.example',...(origin?{origin}:{})}});
 assert.equal(sameHostOrigin(request('https://game.example')),true);assert.equal(sameHostOrigin(request()),true);
 assert.equal(sameHostOrigin(request('https://evil.example')),false);assert.equal(sameHostOrigin(request('not-a-url')),false);
 assert.throws(()=>installPublicUi(express(),join(tmpdir(),'no-such-arena-built-ui')),/build/);
});
test('HTTPS tunnel host supports secure login and authenticated realtime on the same port',async t=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';t.after(()=>{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;});
 const {base}=await fixture(t),headers={Host:'game.example',Origin:'https://game.example','Content-Type':'application/json','X-Arena-Request':'1'};
 const r=await hostedRequest(base,'/api/arena/auth/register',headers,{username:'public_player',password:'password123'});
 assert.equal(r.status,200);const cookie=r.headers['set-cookie'][0];assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Secure/);
 const me=await hostedRequest(base,'/api/arena/me',{...headers,Cookie:cookie.split(';')[0]});assert.equal(me.data.user.username,'public_player');
 const socket=client(base,{path:'/arena-socket',transports:['websocket'],extraHeaders:{Host:'game.example',Origin:'https://game.example',Cookie:cookie.split(';')[0]}});t.after(()=>socket.disconnect());
 await Promise.race([once(socket,'connect'),once(socket,'connect_error').then(([error])=>Promise.reject(error)),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('realtime timeout')),4000);timer.unref();})]);assert.equal(socket.connected,true);socket.disconnect();
 const cross=await fetch(base+'/api/arena/auth/login',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:JSON.stringify({username:'public_player',password:'password123'})});assert.equal(cross.status,403);
});
test('trusted loopback proxy distinguishes login limits for separate visitor IPs',async t=>{
 const {base}=await fixture(t);
 const request=ip=>fetch(base+'/api/arena/auth/login',{method:'POST',headers:{'X-Forwarded-For':ip,'X-Arena-Request':'1','Content-Type':'application/json'},body:JSON.stringify({username:'x',password:''})});
 for(let i=0;i<20;i++)await request('203.0.113.10');
 assert.match((await (await request('203.0.113.10')).json()).error,/quá nhanh/);
 assert.doesNotMatch((await (await request('203.0.113.20')).json()).error,/quá nhanh/);
});
