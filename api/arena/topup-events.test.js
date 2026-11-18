import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { createServer } from 'node:http';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArenaStore } from './store.js';
import { topupEvent, saveTopupEvent, topupQuote } from './topup-events.js';
import { PAYMENT_METHODS, saveSettings, settings } from './payment-config.js';
import { createPaymentService } from './payments.js';
import { fakePaymentEnv, fakeGateway } from './test-support/payment-fixtures.mjs';
import { dashboard } from './analytics.js';
import { installArena } from './server.js';

function setup(path = ':memory:') {
  const store = new ArenaStore(path), mock = fakeGateway(), service = createPaymentService(store, { env: fakePaymentEnv('live'), fetch: mock.fetch });
  const admin = store.register('event_admin','password123').user, user = store.register('event_player','password123').user;
  store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.id);
  saveSettings(store, admin.id, { ...settings(store), mode:'paid',vndPerCoin:1 });
  const event = (extra = {}) => saveTopupEvent(store, admin.id, { ...topupEvent(store), enabled:true,title:'Ưu đãi cuối tuần',type:'discount',percent:10,starts:Date.now()-60000,ends:Date.now()+86400000,minAmount:10000,maxAmount:1000000,methods:Object.keys(PAYMENT_METHODS),...extra });
  return { store,mock,service,admin,user,event,close:()=>{service.close();store.close();} };
}
test('event scheduling, payment channels, amount ranges, integer rounding and server validation', () => {
  const f=setup();try {
    f.event({starts:1000,ends:2000,methods:['momo'],minAmount:50000,maxAmount:200000,percent:13});
    assert.equal(topupQuote(f.store,100000,'momo',1,999).promotion,null);
    assert.equal(topupQuote(f.store,100000,'momo',1,1000).payAmountVnd,87000);
    assert.equal(topupQuote(f.store,100000,'momo',1,2000).promotion,null);
    assert.equal(topupQuote(f.store,100000,'bank',1,1500).promotion,null);
    assert.equal(topupQuote(f.store,10000,'momo',1,1500).promotion,null);
    f.event({starts:1000,ends:2000,type:'bonus',percent:50});
    assert.throws(()=>topupQuote(f.store,10000,'momo',4000,1500));
    assert.equal(topupQuote(f.store,10000,'momo',2000,1500).coins,7);
  } finally {f.close();}
});
for (const method of Object.keys(PAYMENT_METHODS)) test(`${method}: discount is charged correctly and paid revenue uses actual money, never face value`, async()=>{
  const f=setup();try {
    f.event(); const quote=topupQuote(f.store,100000,method,1), input={requestId:randomUUID(),method,amountVnd:100000,quoteKey:quote.key};
    const row=await f.service.create(f.user.id,input);
    assert.equal(row.amount_vnd,90000);assert.equal(row.base_amount_vnd,100000);assert.equal(row.coins,100000);
    assert.equal(row.base_coins,100000);assert.equal(row.bonus_coins,0);
    f.event({enabled:false});assert.equal((await f.service.create(f.user.id,input)).id,row.id);
    if(method==='paypal')await f.service.check(row.id,true);else {f.mock.setPaid(true);await f.service.check(row.id);}
    await f.service.check(row.id);assert.equal(f.store.publicUser(f.user.id).balance,100000);
    assert.equal(dashboard(f.store,{from:Date.now()-86400000,to:Date.now()+86400000}).summary.revenue_vnd,90000);
    assert.equal((await f.service.publicOrder(f.service.order(row.id))).promotion.percent,10);
  }finally{f.close();}
});
test('bonus snapshot credits once after event/rate change and rejects stale quotes or forged client rewards',async()=>{
  const f=setup();try {
    f.event({type:'bonus',percent:200});const quote=topupQuote(f.store,100000,'momo',1);
    f.event({type:'bonus',percent:50});
    await assert.rejects(f.service.create(f.user.id,{requestId:randomUUID(),method:'momo',amountVnd:100000,quoteKey:quote.key}),/thay đổi/);
    f.event({type:'bonus',percent:200});const fresh=topupQuote(f.store,100000,'momo',1);
    const row=await f.service.create(f.user.id,{requestId:randomUUID(),method:'momo',amountVnd:100000,quoteKey:fresh.key,coins:99999999,bonusCoins:99999999});
    assert.equal(row.coins,300000);assert.equal(row.bonus_coins,200000);assert.equal(row.amount_vnd,100000);
    f.event({enabled:false});saveSettings(f.store,f.admin.id,{...settings(f.store),vndPerCoin:100});
    f.mock.setPaid(true);await f.service.check(row.id);await f.service.check(row.id);
    assert.equal(f.store.publicUser(f.user.id).balance,300000);assert.equal(f.store.ledger(f.user.id).length,1);
  }finally{f.close();}
});
test('admin authorization, optimistic version and malformed event inputs are enforced',()=>{
  const f=setup();try {
    const draft={...topupEvent(f.store),enabled:true,starts:Date.now()-1000,ends:Date.now()+100000};
    assert.throws(()=>saveTopupEvent(f.store,f.user.id,draft),/quản trị/);
    for(const extra of [{percent:0},{type:'discount',percent:51},{type:'bonus',percent:501},{percent:1.5},{ends:0},{methods:[]},{methods:['unknown']},{minAmount:0},{maxAmount:9999},{title:' '}])assert.throws(()=>saveTopupEvent(f.store,f.admin.id,{...draft,...extra}));
    f.event();assert.throws(()=>saveTopupEvent(f.store,f.admin.id,draft),/thay đổi/);
    const quote=topupQuote(f.store,100000,'momo',1);assert.equal(quote.coins,100000);
  }finally{f.close();}
});
test('SQLite preserves event settings and order promotion snapshots across restart',async()=>{
  const path=join(tmpdir(),`arena-topup-event-${randomUUID()}.sqlite`),f=setup(path);let id;
  try{f.event({type:'bonus',percent:500});id=(await f.service.create(f.user.id,{requestId:randomUUID(),method:'momo',amountVnd:1000000})).id;}finally{f.close();}
  const store=new ArenaStore(path);try{assert.equal(topupEvent(store).percent,500);const order=store.db.prepare('SELECT * FROM payment_orders WHERE id=?').get(id);assert.equal(order.coins,6000000);assert.equal(JSON.parse(order.promotion).type,'bonus');}finally{store.close();for(const file of [path,`${path}-wal`,`${path}-shm`])if(existsSync(file))unlinkSync(file);}
});
test('HTTP limits event editing to admin and provides matching quotes to authenticated players',async t=>{
  const app=express(),server=createServer(app),mock=fakeGateway(),arena=installArena(app,server,{dbPath:':memory:',paymentEnv:fakePaymentEnv(),paymentFetch:mock.fetch});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>arena.close());
  const admin=arena.store.register('http_event_admin','password123').user,user=arena.store.register('http_event_user','password123').user;arena.store.db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(admin.id);
  saveSettings(arena.store,admin.id,{...settings(arena.store),mode:'paid',vndPerCoin:1});
  const req=async(path,account,body,origin)=>{const token=account?arena.store.newSession(account.id).token:'';const response=await fetch(`http://127.0.0.1:${server.address().port}/api/arena${path}`,{headers:{Cookie:`arena_session=${token}`,'Content-Type':'application/json','X-Arena-Request':'1',...(origin?{Origin:origin}:{})},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});return {status:response.status,data:await response.json()};};
  const body={...topupEvent(arena.store),enabled:true,type:'bonus',percent:100,starts:Date.now()-1000,ends:Date.now()+100000};
  assert.equal((await req('/admin/topup-event',null,body)).status,401);assert.equal((await req('/admin/topup-event',user,body)).status,403);assert.equal((await req('/admin/topup-event',admin,body,'https://evil.example')).status,403);
  assert.equal((await req('/admin/topup-event',admin,body)).status,200);
  assert.equal((await req('/payments/quote?amountVnd=10000&method=momo',null)).status,401);
  const quote=(await req('/payments/quote?amountVnd=10000&method=momo',user)).data;assert.equal(quote.coins,20000);
  const order=(await req('/payments/orders',user,{amountVnd:10000,method:'momo',requestId:randomUUID(),quoteKey:quote.key})).data.order;assert.equal(order.coins,20000);assert.equal(order.bonusCoins,10000);
});
