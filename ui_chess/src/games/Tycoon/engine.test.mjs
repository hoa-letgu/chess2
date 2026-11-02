import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD,CARDS,newEmpire,empireAction,canBuild,canDowngrade,canSell,ownsGroup,rentAt,netWorth,liquidationValue,chooseEmpireAction,randomIndex} from './engine.ts';
const start=(count=2)=>newEmpire('local',count,12,()=>0);
const act=(s,type,tile)=>empireAction(s,tile===undefined?{type}:{type,tile});
const roll=(s,a,b)=>empireAction(s,{type:'roll',dice:[a,b]});
function own(s,index,owner=0,level=0){s.assets[index]={owner,level};return s;}
test('32-space board, 8 pairs, validated 2–4 player configuration, shuffled full deck',()=>{
 const s=start(4);assert.equal(BOARD.length,32);assert.equal(s.assets.length,32);assert.deepEqual(s.players.map(p=>p.cash),[1500,1500,1500,1500]);assert(s.players.every(p=>!p.bot&&p.alive&&p.position===0));
 for(let group=0;group<8;group++)assert.equal(BOARD.filter(t=>t.group===group).length,2);
 assert.equal(new Set(s.deck).size,CARDS.length);assert.equal(newEmpire('bots',3,20,()=>0).players.filter(p=>p.bot).length,2);
 assert.throws(()=>newEmpire('bots',5));assert.throws(()=>newEmpire('bots',2,1));assert.throws(()=>newEmpire('bots',2,12,()=>99));
});
test('roll, buy, end and skip are immutable and cannot double-purchase or skip decisions',()=>{
 const s=start(),copy=structuredClone(s),land=roll(s,1,2);assert.equal(land.players[0].position,3);assert.equal(land.phase,'buy');assert.deepEqual(s,copy);assert.throws(()=>act(land,'end'));
 const bought=act(land,'buy');assert.equal(bought.players[0].cash,1380);assert.equal(bought.assets[3].owner,0);assert.equal(bought.phase,'manage');assert.throws(()=>act(bought,'buy'));
 const next=act(bought,'end');assert.equal(next.turn,1);assert.equal(next.phase,'roll');assert.equal(next.round,1);assert.throws(()=>roll(bought,2,2));
 const skipped=act(land,'pass');assert.equal(skipped.assets[3],null);assert.equal(skipped.players[0].cash,1500);
});
test('forward crossing START awards once, arrival exactly at START awards once',()=>{
 const s=start();s.players[0].position=30;let n=roll(s,1,2);assert.equal(n.players[0].position,1);assert.equal(n.players[0].cash,1700);
 s.players[0].position=29;n=roll(s,1,2);assert.equal(n.players[0].position,0);assert.equal(n.players[0].cash,1700);
});
test('base rent, complete pair and three building rent levels',()=>{
 const s=start();own(s,1,1);assert.equal(rentAt(s,1),10);own(s,3,1);assert(ownsGroup(s,1,1));assert.equal(rentAt(s,1),20);
 for(const [level,rent]of [[1,30],[2,80],[3,160]]){s.assets[1].level=level;assert.equal(rentAt(s,1),rent);}
 s.players[0].position=0;const n=roll(s,1,2);assert.equal(n.players[0].cash,1476);assert.equal(n.players[1].cash,1524);assert.equal(n.phase,'manage');
});
test('rail and utility portfolios have correct scaled rent',()=>{
 const s=start();own(s,6);assert.equal(rentAt(s,6),25);own(s,14);assert.equal(rentAt(s,6),50);own(s,27);assert.equal(rentAt(s,6),100);
 own(s,10);assert.equal(rentAt(s,10,7),28);own(s,22);assert.equal(rentAt(s,10,7),70);
});
test('building requires full group, enough cash, even development and at most level 3',()=>{
 let s=start();s.phase='manage';own(s,1);assert(!canBuild(s,1));own(s,3);assert(canBuild(s,1));
 s=act(s,'build',1);assert.equal(s.players[0].cash,1450);assert(!canBuild(s,1));assert(canBuild(s,3));assert.throws(()=>act(s,'build',1));
 s=act(s,'build',3);for(let i=0;i<2;i++){s=act(s,'build',1);s=act(s,'build',3);}assert.equal(s.assets[1].level,3);assert(!canBuild(s,1));assert.equal(netWorth(s,0),1720);
 s.phase='roll';assert(!canBuild(s,1));s.phase='manage';s.players[0].cash=0;s.assets[1].level=2;assert(!canBuild(s,1));
});
test('house liquidation is balanced; sale requires cleared group; refunds are 50%',()=>{
 let s=start();s.phase='manage';own(s,1,0,2);own(s,3,0,1);assert(canDowngrade(s,1));assert(!canDowngrade(s,3));assert(!canSell(s,1));
 s=act(s,'downgrade',1);assert.equal(s.players[0].cash,1525);s=act(s,'downgrade',1);assert(!canSell(s,1));s=act(s,'downgrade',3);assert(canSell(s,1));s=act(s,'sell',1);assert.equal(s.assets[1],null);assert.equal(s.players[0].cash,1625);
 assert.equal(s.assets[3].level,0);assert(!ownsGroup(s,0,3));assert.throws(()=>act(s,'sell',1));
});
test('solvent debt pauses the turn, allows liquidation, pays creditor in full',()=>{
 const s=start();s.players[0].cash=5;own(s,3,1,3);own(s,31);let n=roll(s,1,2);assert.equal(n.phase,'debt');assert.equal(n.debt.amount,192);assert.equal(n.players[1].cash,1500);
 assert.throws(()=>act(n,'pay'));assert.throws(()=>act(n,'end'));assert.throws(()=>act(n,'bankrupt'));assert.equal(liquidationValue(n,0),235);
 n=act(n,'sell',31);n=act(n,'pay');assert.equal(n.phase,'manage');assert.equal(n.players[0].cash,43);assert.equal(n.players[1].cash,1692);assert.equal(n.debt,null);
});
test('bankruptcy liquidates assets, pays remaining proceeds and declares last survivor',()=>{
 const s=start();s.players[0].cash=5;own(s,3,1,3);own(s,6);let n=roll(s,1,2);assert.equal(liquidationValue(n,0),95);n=act(n,'bankrupt');
 assert(!n.players[0].alive);assert.equal(n.players[0].cash,0);assert.equal(n.assets[6],null);assert.equal(n.players[1].cash,1595);assert.equal(n.phase,'finished');assert.deepEqual(n.winners,[1]);assert.throws(()=>roll(n,1,1));
});
test('bankruptcy skips eliminated seats; round advances correctly',()=>{
 const s=start(4);s.turn=1;s.players[1].position=0;s.players[1].cash=0;own(s,3,0,3);s.players[2].alive=false;
 let n=roll(s,1,2);n=act(n,'bankrupt');assert.equal(n.turn,3);assert.equal(n.round,1);n.phase='manage';n=act(n,'end');assert.equal(n.turn,0);assert.equal(n.round,2);
});
test('jail arrival, visiting, wait-one-turn release and paid bail',()=>{
 const s=start();s.players[0].position=22;let n=roll(s,1,1);assert.equal(n.players[0].position,8);assert(n.players[0].jailed);assert.equal(n.players[0].cash,1500);
 n.phase='roll';const wait=roll(n,6,6);assert(!wait.players[0].jailed);assert.equal(wait.players[0].position,8);assert.equal(wait.phase,'manage');
 const bail=act(n,'bail');assert(!bail.players[0].jailed);assert.equal(bail.players[0].cash,1450);assert.equal(bail.phase,'roll');assert.equal(roll(bail,1,2).players[0].position,11);
 s.players[0].position=6;const visit=roll(s,1,1);assert(!visit.players[0].jailed);assert.equal(visit.phase,'manage');
});
test('tax, park and own property all resolve without a purchase prompt',()=>{
 const s=start();const tax=roll(s,2,2);assert.equal(tax.players[0].cash,1400);assert.equal(tax.phase,'manage');s.players[0].position=14;assert.equal(roll(s,1,1).players[0].cash,1540);
 own(s,19);s.players[0].position=16;assert.equal(roll(s,1,2).players[0].cash,1500);
});
function cardRoll(id,at=0,a=1,b=1){const s=start();s.deck=[id];s.players[0].position=at;return roll(s,a,b);}
test('chance cash, START, jail, backward, repairs and rail relocation',()=>{
 assert.equal(cardRoll(0).players[0].cash,1620);assert.equal(cardRoll(1).players[0].cash,1410);
 assert.equal(cardRoll(4).players[0].position,0);assert.equal(cardRoll(4).players[0].cash,1700);assert(cardRoll(5).players[0].jailed);
 const back=cardRoll(6);assert.equal(back.players[0].position,31);assert.equal(back.players[0].cash,1500);assert.equal(back.phase,'buy');
 const s=start();s.deck=[8];own(s,1,0,2);own(s,3,0,2);assert.equal(roll(s,1,1).players[0].cash,1320);
 const rail=cardRoll(9,26);assert.equal(rail.players[0].position,6);assert.equal(rail.players[0].cash,1700);assert.equal(rail.phase,'buy');
});
test('deck cycles without losing cards; repair card can create debt',()=>{
 const s=start();s.deck=[8,0];s.players[0].cash=10;const n=roll(s,1,1);assert.equal(n.phase,'debt');assert.equal(n.lastCard,8);assert.equal(n.cursor,1);assert.equal(n.debt.amount,40);assert.equal(s.cursor,0);
 const s2=start();s2.deck=[0,7];s2.cursor=2;assert.equal(roll(s2,1,1).lastCard,0);
});
test('round limit ranks book wealth, excludes eliminated seats and supports ties',()=>{
 let s=start();s.turn=1;s.round=12;s.phase='manage';own(s,1,0);s=act(s,'end');assert.equal(s.phase,'finished');assert.deepEqual(s.winners,[0]);
 let tie=start();tie.turn=1;tie.round=12;tie.phase='manage';tie=act(tie,'end');assert.deepEqual(tie.winners,[0,1]);
});
test('invalid dice and actions are rejected without changing source state',()=>{
 const s=start(),before=structuredClone(s);for(const dice of [[0,1],[7,2],[2.5,1],[NaN,2]])assert.throws(()=>empireAction(s,{type:'roll',dice}));
 for(const type of ['buy','pass','end','pay','bankrupt','bail'])assert.throws(()=>act(s,type));assert.deepEqual(s,before);assert.throws(()=>randomIndex(0));
});
test('bot decisions keep cash reserve, complete groups, build, and resolve debt',()=>{
 const s=start();s.phase='buy';s.players[0].position=31;s.players[0].cash=500;assert.equal(chooseEmpireAction(s).type,'pass');own(s,29);assert.equal(chooseEmpireAction(s).type,'pass');s.players[0].cash=600;assert.equal(chooseEmpireAction(s).type,'buy');
 s.phase='manage';own(s,31);assert.equal(chooseEmpireAction(s).type,'build');s.phase='debt';s.debt={amount:100,creditor:null,reason:'test'};assert.equal(chooseEmpireAction(s).type,'pay');
});
test('30 complete deterministic bot games terminate and preserve economy and ownership invariants',()=>{
 for(let seed=1;seed<=30;seed++){
  let value=seed;const draw=n=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value%n;};let s=newEmpire('bots',2+seed%3,12,draw),steps=0;
  while(s.phase!=='finished'&&steps++<1800){const a=chooseEmpireAction(s);s=empireAction(s,a??{type:'roll',dice:[draw(6)+1,draw(6)+1]});
   assert(s.players.every(p=>Number.isInteger(p.cash)&&p.cash>=0&&p.position>=0&&p.position<32));assert(s.players[s.turn].alive||s.phase==='finished');
   s.assets.forEach((a,i)=>{if(a){assert(s.players[a.owner].alive);assert(a.level>=0&&a.level<=3);if(a.level)assert(ownsGroup(s,a.owner,i));}});
  }
  assert.equal(s.phase,'finished',`seed ${seed} failed to terminate`);assert(s.winners.length>=1);assert(s.winners.every(id=>s.players[id].alive));
 }
});
