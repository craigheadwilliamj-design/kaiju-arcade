import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRival,hitRival,tickRival} from '../src/rival.ts';import type {Rival} from '../src/rival.ts';
import {createBuildings} from '../src/rules.ts';
import {CONFIG as C,CAMPAIGN as P,GATE,KAIBAN_BOSS as KB} from '../src/config.ts';
import {SAN_FRANCISCO} from '../src/levels.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Kaiban as a boss: his Debris Shotgun and Stampede turned on the kaiju (src/rival.ts), the pattern that picks them, and how they sit with
// the Golden Gate's fog charge and retreat. Pure checks first (tickRival is a function of the rival, the kaiju's box and the buildings).
const W=5000,pw=48,ph=69,player=(cx:number)=>({x:cx-pw/2,y:C.ground-ph,w:pw,h:ph});
const kaiban=(cx=2500,face=1)=>{const r=createRival(W,0,'Kaiban');r.x=cx-r.w/2;r.y=C.ground-r.h;r.face=face;r.cooldown=0;return r;};
type Hit={damage:number,strength:number,direction:number};
const run=(r:Rival,seconds:number,p:{x:number,y:number,w:number,h:number},b:any[]=[],dt=1/60)=>{const hits:Hit[]=[];for(let t=0;t<seconds;t+=dt)hits.push(...tickRival(r,dt,p,W,b));return hits;};
const spec=(x:number,w:number,extra:object={})=>({x,w,h:220,hp:300,value:100,kind:'medium' as const,label:'',color:'#888',...extra});

test('only a Kaiban boss gets the Kaiban moves; every other boss keeps the shared moveset',()=>{
 const o=createRival(W,0,'Belial'),d=createRival(W,0);assert.ok(!o.kaiban&&!d.kaiban&&!o.rocks&&!o.charge);
 const k=createRival(W,0,'Kaiban');assert.ok(k.kaiban);assert.deepEqual(k.rocks,[]);assert.equal(k.charge,null);
 o.x=2500;o.cooldown=0;const seen=new Set<string>();for(let n=0;n<40;n++){tickRival(o,.05,player(2900),W,[]);seen.add(o.attack);o.windup=0;o.cooldown=0;}
 assert.ok([...seen].every(a=>a==='melee'||a==='ranged'),`shared moves only (${[...seen]})`);
});

test('Debris Shotgun: the scoop telegraphs, then a fan of rocks leaves in one burst, flat ones fast and high ones lobbed',()=>{
 const r=kaiban(),p=player(2800);
 tickRival(r,.01,p,W,[]);assert.equal(r.attack,'shotgun','mid range opens with the shotgun');assert.ok(Math.abs(r.windup-KB.shotgunTelegraph)<.005);
 run(r,KB.shotgunTelegraph-.1,p);assert.equal(r.rocks!.length,0,'nothing flies during the scoop');
 tickRival(r,.12,p,W,[]);assert.equal(r.rocks!.length,KB.rocks,'the whole fan leaves on the fling');
 const flat=r.rocks![0],high=r.rocks![KB.rocks-1];assert.ok(Math.hypot(flat.vx,flat.vy)>Math.hypot(high.vx,high.vy),'flat fast, high slow');assert.ok(-high.vy>-flat.vy,'high ones are lobbed');
 assert.ok(flat.vx>0,'thrown the way he faces');assert.ok(Math.abs(r.cooldown-KB.shotgunCooldown)<.05);
});

test('Debris Shotgun damage and range: harsh point-blank, thinner at range, nothing past it; rocks stop on the first thing they hit',()=>{
 const total=(gap:number)=>{const r=kaiban();r.attack='shotgun';r.windup=.01;const hits=run(r,2,player(2500+gap));return {sum:hits.reduce((n,h)=>n+h.damage,0),n:hits.length,hits};};
 const near=total(150),mid=total(330),far=total(700);
 assert.ok(near.n>=2&&near.sum>=KB.rockDamage*2,`point blank lands several rocks (${near.n})`);assert.ok(near.sum<=KB.rocks*KB.rockDamage);
 assert.ok(near.sum>mid.sum,`closer hurts more (${near.sum} vs ${mid.sum})`);assert.equal(far.sum,0,'the fan falls short');
 assert.ok(near.hits.every(h=>h.damage===KB.rockDamage&&h.strength===KB.rockKnock&&h.direction===1));
 // A building in the way takes the rocks instead of the kaiju.
 const [b]=createBuildings([spec(2600,200)]),r=kaiban();r.attack='shotgun';r.windup=.01;const hits=run(r,2,player(2900),[b]);
 assert.equal(hits.length,0,'shielded by the building');assert.ok(b.hpNow<b.hp,'the building took the rocks');assert.equal(r.rocks!.length,0,'every rock landed');
});

test('boss pattern: barge up close, Debris Shotgun at mid range, Stampede from afar and as every third mid-range attack; barges are broken up',()=>{
 const pick=(gap:number,r:Rival)=>{r.windup=0;r.cooldown=0;r.stagger=0;r.charge=null;r.x=2500-r.w/2;tickRival(r,.001,player(2500+gap),W,[]);return r.attack;};
 let r=kaiban();assert.deepEqual([0,1,2,3,4,5].map(()=>pick(300,r)),['shotgun','shotgun','stampede','shotgun','shotgun','stampede']);
 r=kaiban();assert.equal(pick(KB.far+50,r),'stampede','from far away he charges');
 r=kaiban();assert.deepEqual([0,1,2,3].map(()=>pick(100,r)),['melee','melee','stampede','melee'],'two barges, then a Stampede through the kaiju');
 assert.ok(pick(100,kaiban())==='melee');
});

test('Stampede telegraph: the bellow locks his facing and warns before the charge; the charge starts only when it ends',()=>{
 const r=kaiban(2500,1);r.attack='stampede';r.windup=KB.stampedeTelegraph;const behind=player(1800);
 for(let t=0;t<KB.stampedeTelegraph-.05;t+=1/60){tickRival(r,1/60,behind,W,[]);assert.equal(r.face,1,'facing is locked while he bellows');assert.equal(r.charge,null,'not charging yet');}
 assert.ok(r.windup>0&&r.attack==='stampede','still bellowing');const x0=r.x;assert.equal(r.x,x0);
 run(r,.1,behind);assert.ok(r.charge&&r.charge.dir===1,'charges the way he was facing, not at the kaiju behind him');
});

test('Stampede: one hit on the kaiju, flattens buildings in the lane, runs the reach, cannot be staggered, then stands winded',()=>{
 const bs=createBuildings([spec(2800,120),spec(3100,120)]),r=kaiban(2500,1);r.attack='stampede';r.windup=.01;const p=player(2900);
 const hits=run(r,.2,p,bs);assert.ok(r.charge,'charging');const x0=r.x;
 const more=run(r,.7,p,bs);const all=[...hits,...more];assert.ok(r.x-x0>250,`fast (${Math.round(r.x-x0)}px in under a second)`);
 assert.equal(all.length,1,'the kaiju is hit once, not every tick');assert.equal(all[0].damage,KB.stampedeDamage);assert.equal(all[0].strength,KB.stampedeKnock);assert.equal(all[0].direction,1);
 hitRival(r,20,'player',400,-1);assert.equal(r.stagger,0,'a heavy hit does not stop the charge');assert.ok(r.charge);
 for(let n=0;n<600&&r.charge;n++)run(r,1/60,p,bs);assert.equal(r.charge,null,'the charge ends');assert.ok(bs.every(b=>b.hpNow===0),'every building in the lane is flattened');
 assert.ok(r.x+r.w/2-2500<=KB.stampedeReach+r.w+10,'never past the reach');assert.ok(r.stagger>0&&r.cooldown>r.stagger,'winded after, and cooling down');
 const before=r.hp;hitRival(r,10);assert.equal(r.hp,before-10,'and hittable while he is winded');
});

test('Stampede: stops at a tower or landmark instead of flattening it, and at the edge of the world',()=>{
 const [t]=createBuildings([spec(2900,150,{deco:'btower'})]),r=kaiban(2500,1);r.attack='stampede';r.windup=.01;run(r,1.5,player(2000),[t]);
 assert.equal(r.charge,null);assert.equal(t.hpNow,t.hp,'the tower stands');assert.ok(r.x+r.w<=t.x+.5,'he stops against it');assert.ok(r.stagger>0);
 const e=kaiban(W-200,1);e.attack='stampede';e.windup=.01;run(e,2,player(100),[]);assert.equal(e.charge,null);assert.ok(e.x+e.w<=W);
});

test('Kaiban rival: slower than the shared rival, and a defeat clears any rocks and charge in flight',()=>{
 assert.ok(KB.speed<P.bossSpeed);const k=kaiban(2500,1),o=createRival(W,0);o.x=2500;o.face=1;o.cooldown=9;k.cooldown=9;const far=player(4000);
 run(k,1,far);run(o,1,far);assert.ok(k.x-2500<o.x-2500);
 const d=kaiban();d.retreats=true;d.rocks=[{x:1,y:1,vx:1,vy:1,life:1}];d.charge={dir:1,ran:0,hit:false};hitRival(d,1e6);
 assert.ok(d.retreating&&d.rocks!.length===0&&d.charge===null,'retreat drops the moves');
 const e=kaiban();e.rocks=[{x:1,y:1,vx:1,vy:1,life:1}];e.charge={dir:1,ran:0,hit:false};hitRival(e,1e6);assert.ok(e.dead&&e.rocks!.length===0&&e.charge===null);
});

const GG=SAN_FRANCISCO.find(b=>b.name==='Golden Gate')!,ggIndex=SAN_FRANCISCO.indexOf(GG);
const ggBoot=async(x:number)=>{const h=await bootCampaign(.75,{city:'sfo'});h.test().goto(ggIndex,x);h.step(2);return h;};
const towers=GG.buildings.filter(b=>b.deco==='btower');

test('real loop: the Golden Gate boss is Kaiban and fights with his kit: shotgun fans, bellows with a warning, Stampede charges',async()=>{
 const h=await ggBoot(towers[0].x-300);
 try{h.test().teleport(GG.finale!.wake+60);h.step(5);assert.ok(h.state().rivalState.face!==undefined);
  const seen=new Set<string>();let rocks=0,charging=false,bellowFirst=false,windupSeen=false;
  for(let n=0;n<60*40&&h.state().modeNow==='playing';n++){h.step();const s=h.state(),r=s.rivalState;if(s.finaleState.phase!=='idle')continue;
   if(r.windup>0){seen.add(r.attack);if(r.attack==='stampede'){windupSeen=true;assert.ok(!r.charging,'bellow before charge');}}
   rocks=Math.max(rocks,r.rocks);if(r.charging){charging=true;bellowFirst=windupSeen;}}
  assert.ok(seen.has('shotgun')||seen.has('stampede'),`Kaiban moves in play (${[...seen]})`);
  assert.ok(rocks>0||charging,'rocks flew or he charged');if(charging)assert.ok(bellowFirst);
 }finally{h.release();h.cleanup();}
});

test('real loop: the fog charge still telegraphs with a roar and silhouette, and cancels any Kaiban move in progress',async()=>{
 const h=await ggBoot(towers[0].x-300);
 try{h.test().teleport(GG.finale!.wake+60);h.step(5);
  let telegraphed=0,sawFog=false;
  for(let n=0;n<60*(GATE.chargeEvery+GATE.vanish+GATE.telegraph+8)&&h.state().finaleState.charges<1&&h.state().modeNow==='playing';n++){h.step();const s=h.state(),f=s.finaleState,r=s.rivalState;
   if(f.phase==='vanish'||f.phase==='telegraph'){sawFog=true;assert.equal(r.rocks,0,'no rocks hang in the fog');assert.ok(!r.charging&&r.windup===0,'no half-finished move');assert.ok(r.hidden);}
   if(f.phase==='telegraph')telegraphed++;}
  assert.ok(sawFog,'the fog charge came round');assert.ok(telegraphed>=GATE.telegraph*60*.9,`warned for ${telegraphed} frames`);assert.ok(h.state().finaleState.charges>=1);
 }finally{h.release();h.cleanup();}
});

test('real loop: beaten at the Golden Gate Kaiban retreats rather than falls, with no rocks or charge left behind and no more hits',async()=>{
 const h=await ggBoot(towers[0].x+towers[0].w+200);
 try{h.test().teleport(GG.finale!.wake+60);h.step(5);const max=h.state().rivalState.maxHP;
  h.test().hurtRival(max*.6);h.step(5);h.test().hurtRival(max);h.step(2);let s=h.state();
  assert.ok(s.rivalState.retreating&&!s.rivalState.dead,'retreats, not KO');assert.equal(s.rivalState.rocks,0);assert.ok(!s.rivalState.charging);assert.equal(s.rivalState.windup,0);
  const dmg=s.damageTaken;for(let n=0;n<60*3;n++){h.step();assert.equal(h.state().rivalState.rocks,0);assert.ok(!h.state().rivalState.charging);}
  assert.equal(h.state().damageTaken,dmg,'a retreating Kaiban attacks no more');
  for(let n=0;n<60*10&&h.state().modeNow==='playing';n++)h.step();assert.equal(h.state().modeNow,'conquered');assert.ok(h.state().rivalState.retreated);
 }finally{h.release();h.cleanup();}
});

test('real loop: a deck break cancels a Stampede in progress and holds Kaiban in place until the spans go, so he ends in the bay',async()=>{
 const h=await ggBoot(towers[0].x+towers[0].w+200);
 try{h.test().teleport(GG.finale!.wake+60);h.step(5);const max=h.state().rivalState.maxHP;
  h.test().hurtRival(max*.36);h.step(1);const r=h.state().rivalState,x=r.x;
  assert.ok(!r.charging&&r.windup===0&&r.rocks===0,'the quake cancels his move');
  for(let n=0;n<40;n++){h.step();assert.ok(!h.state().rivalState.charging);}assert.equal(h.state().rivalState.x,x,'he is rooted while the deck goes');
 }finally{h.release();h.cleanup();}
});
