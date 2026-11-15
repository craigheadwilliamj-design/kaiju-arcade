import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {COMBAT as B} from '../src/config.ts';
import {moveList} from '../src/presentation.ts';

async function belialCity(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='BEL';h.callbacks.get('#initials:input')!();h.click('#launch');
 h.click(`#kaiju-${KAIJU.indexOf('Belial')}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');assert.equal(h.state().activeKaiju,'Belial');
 return h;
}
const until=(h:any,f:()=>boolean,max=300)=>{for(let n=0;n<max&&!f();n++)h.step();return f();};
// Face west into the open start plaza so the stream comes down on the street, not a wall.
function faceWest(h:any){h.down('KeyA');h.step(2);h.up('KeyA');h.step(3);assert.equal(h.state().face,-1);}

test('Belial Acid Vomit: a tap winds up, spews a short burst, gags it down; no projectile; the gland refills',async()=>{
 const h=await belialCity();
 try{h.step(30);
  h.tap('KeyL');assert.equal(h.state().jet,'start');assert.equal(h.state().entityCounts.playerShots,0,'no spine on the ground');
  assert.equal(h.state().anim,'vomitStart','plays his own wind-up');
  assert.ok(until(h,()=>h.state().jet==='on',40),'wind-up leads into spewing');
  assert.ok(until(h,()=>h.state().jet==='end',40),'a tap still spews the minimum burst, then winds down');
  assert.equal(h.state().anim,'vomitEnd');
  const p=h.state().jetFuel;assert.ok(p<1&&p>.8,`a short burst spends a little pressure (${p.toFixed(2)})`);
  assert.ok(until(h,()=>h.state().jet===null,40),'the gag ends it');
  assert.ok(until(h,()=>h.state().jetFuel>=1,200),'the gland refills');
 }finally{h.release();h.cleanup();}
});

test('Belial Acid Vomit: holding drains the gland over vomitSeconds, gags and locks until it refills to the relight level',async()=>{
 const h=await belialCity();
 try{h.step(30);faceWest(h);
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);let frames=0;
  for(let n=0;h.state().jet==='on'&&n<400;n++){if(h.state().hitstop===0)frames++;h.step();}
  assert.ok(Math.abs(frames/60-B.vomitSeconds)<.1,`a full gland lasts about ${B.vomitSeconds}s (${(frames/60).toFixed(2)}s)`);
  assert.equal(h.state().jetLocked,true,'running dry locks it');h.up('KeyL');
  until(h,()=>h.state().jet===null,40);
  h.tap('KeyL');h.step();assert.equal(h.state().jet,null,'locked: L does nothing');
  assert.ok(until(h,()=>!h.state().jetLocked,200),'unlocks as it refills');assert.ok(h.state().jetFuel>=B.vomitRelight-.01);
 }finally{h.release();h.cleanup();}
});

test('Belial Acid Vomit: the arc lands on the street and walks back toward him as the gland drains; W lobs it further',async()=>{
 const h=await belialCity();
 try{h.step(30);faceWest(h);
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);h.step(20);
  const s1=h.state();assert.equal(s1.spewLandOn,'street',`lands on the street (${s1.spewLandOn})`);
  const mouth=s1.jetOrigin[0],far=mouth-s1.spewLand[0];
  until(h,()=>h.state().jetFuel<.15,300);
  const s2=h.state();assert.equal(s2.spewLandOn,'street');const near=mouth-s2.spewLand[0];
  assert.ok(far>0&&near>0&&near<far*.6,`low pressure lands much nearer (${Math.round(far)} → ${Math.round(near)})`);
  assert.ok(s2.entityCounts.acidPools>=2,`a stripe of puddles from far to near (${s2.entityCounts.acidPools})`);
  h.up('KeyL');until(h,()=>h.state().jet===null&&!h.state().jetLocked,400);until(h,()=>h.state().jetFuel>=1,300);
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);h.step(12);const level=h.state().jetOrigin[0]-h.state().spewLand[0];
  h.down('KeyW');h.step(25);const lob=h.state().jetOrigin[0]-h.state().spewLand[0];h.up('KeyW');h.up('KeyL');
  assert.ok(Math.abs(h.state().jetAngle-B.vomitUp)<1,`W tilts up to ${B.vomitUp} (${h.state().jetAngle})`);
  assert.ok(lob>level,`a higher arc reaches further (${Math.round(level)} → ${Math.round(lob)})`);
 }finally{h.release();h.cleanup();}
});

test('Belial Acid Vomit: puddles eat the street for vomitPuddleSeconds and dry up, never past the cap',async()=>{
 const h=await belialCity();
 try{h.step(30);faceWest(h);
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);h.step(60);h.up('KeyL');
  const n=h.state().entityCounts.acidPools;assert.ok(n>=1&&n<=B.vomitPuddleCap,`puddles left (${n})`);
  assert.equal(h.state().entityCounts.lavaPools,0,'acid is not lava');
  assert.ok(until(h,()=>h.state().entityCounts.acidPools===0,Math.ceil(B.vomitPuddleSeconds*60)+60),'they dry up');
 }finally{h.release();h.cleanup();}
});

test('Belial Acid Vomit: corrodes the building it lands on, stacking to three, which keeps eating it after he stops and wears off',async()=>{
 const h=await belialCity();
 try{h.step(30);
  const s0=h.state(),cx=s0.x+s0.width/2;
  const ahead=s0.buildings.filter((b:any)=>b.hp>0&&b.x>cx).sort((a:any,b:any)=>a.x-b.x)[0];
  assert.ok(ahead,'a building east of the spawn');
  h.down('KeyD');until(h,()=>h.state().x+h.state().width>ahead.x-120,600);h.up('KeyD');h.step(5);
  const i=h.state().buildings.findIndex((b:any)=>b.x===ahead.x),hp0=h.state().buildingHP[i];
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);h.step(10);
  assert.ok(['building','roof'].includes(h.state().spewLandOn),`the stream comes down on the building (${h.state().spewLandOn})`);
  assert.equal(h.state().corrosion[i],1,'first contact corrodes it');
  until(h,()=>h.state().corrosion[i]>=B.corrodeMax,Math.ceil(B.corrodePerStack*B.corrodeMax*60)+30);
  assert.equal(h.state().corrosion[i],B.corrodeMax,`contact stacks it up to ${B.corrodeMax}`);
  h.up('KeyL');until(h,()=>h.state().jet===null,60);
  const hp1=h.state().buildingHP[i];assert.ok(hp1<hp0,`the stream eats it (${hp0} → ${Math.round(hp1)})`);
  h.step(60);const hp2=h.state().buildingHP[i];
  assert.ok(hp2<hp1,`corrosion keeps eating it after he stops (${Math.round(hp1)} → ${Math.round(hp2)})`);
  assert.equal(h.state().hitstop,0,'corrosion ticks do not freeze the game');
  assert.ok(until(h,()=>h.state().corrosion[i]===0,Math.ceil(B.corrodeSeconds*60)+30),'and it wears off');
 }finally{h.release();h.cleanup();}
});

test('Belial Acid Vomit: walks at half speed while spewing; airborne falls back to the single shot',async()=>{
 const h=await belialCity();
 try{h.step(30);
  let x=h.state().x;h.down('KeyD');h.step(30);const walk=h.state().x-x;h.up('KeyD');h.step(5);
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);x=h.state().x;h.down('KeyD');h.step(30);const slow=h.state().x-x;h.up('KeyD');h.up('KeyL');
  assert.ok(Math.abs(slow/walk-B.vomitSlow)<.1,`walks at ${B.vomitSlow} of walking speed (${slow.toFixed(1)} vs ${walk.toFixed(1)})`);
  until(h,()=>h.state().jet===null,60);h.step(20);
  h.tap('Space');h.step(6);assert.equal(h.state().grounded,false);h.tap('KeyL');h.step();
  assert.equal(h.state().entityCounts.playerShots,1,'airborne fires the shared shot');assert.equal(h.state().jet,null);
 }finally{h.release();h.cleanup();}
});

test('Belial Acid Pounce: a street landing leaves a row of acid puddles on the street and nothing lava',async()=>{
 const h=await belialCity();
 try{h.step(30);faceWest(h);
  h.tap('Space');h.step(15);h.tap('KeyS');h.step();assert.equal(h.state().diving,true);
  for(let n=0;n<60&&h.state().diving;n++)h.step();
  assert.equal(h.state().diving,false);assert.equal(h.state().rolling,false,'Belial does not roll');
  const n=h.state().entityCounts.acidPools;assert.ok(n>=2&&n<=B.vomitPuddleCap,`a row of puddles under the landing (${n})`);
  assert.equal(h.state().entityCounts.lavaPools,0);assert.equal(h.state().entityCounts.lavaGlobs,0);
  assert.ok(until(h,()=>h.state().entityCounts.acidPools===0,Math.ceil(B.vomitPuddleSeconds*60)+60),'they dry up');
 }finally{h.release();h.cleanup();}
});

test('Belial Acid Pounce: a building caught in the slam is corroded straight to pounceStacks',async()=>{
 const h=await belialCity();const {MOVE:MV}=await import('../src/config.ts');
 try{h.step(30);
  const s0=h.state(),cx=s0.x+s0.width/2;
  const ahead=s0.buildings.filter((b:any)=>b.hp>0&&b.x>cx).sort((a:any,b:any)=>a.x-b.x)[0];
  h.down('KeyD');until(h,()=>h.state().x+h.state().width>ahead.x-30,600);h.up('KeyD');h.step(5);
  const i=h.state().buildings.findIndex((b:any)=>b.x===ahead.x);assert.equal(h.state().corrosion[i],0);
  h.tap('Space');h.step(15);h.tap('KeyS');for(let n=0;n<60&&h.state().diving;n++)h.step();
  assert.equal(h.state().corrosion[i],MV.pounceStacks,`soaked to ${MV.pounceStacks} stacks in one hit (${h.state().corrosion[i]})`);
 }finally{h.release();h.cleanup();}
});

test('Belial moves list: Acid Vomit, aiming and corrosion replace the preview spine',()=>{
 const names=moveList('Belial').moves.flatMap(s=>s.moves).map(m=>m.name);
 for(const n of ['Acid Vomit','Aim the arc','Corrosion','Acid Pounce'])assert.ok(names.includes(n),n);
 assert.ok(!names.includes('Spine'));
});
