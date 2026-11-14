import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {COMBAT as B} from '../src/config.ts';

async function tlezcatlCity(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='TLZ';h.callbacks.get('#initials:input')!();h.click('#launch');
 h.click(`#kaiju-${KAIJU.indexOf('Tlézcatl')}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');assert.equal(h.state().activeKaiju,'Tlézcatl');
 return h;
}
const until=(h:any,f:()=>boolean,max=300)=>{for(let n=0;n<max&&!f();n++)h.step();return f();};

test('Tlézcatl Flame Jet: a tap winds up, breathes a short burst, winds down; no projectile; fuel refills',async()=>{
 const h=await tlezcatlCity();
 try{h.step(30);
  h.tap('KeyL');assert.equal(h.state().jet,'start');assert.equal(h.state().entityCounts.playerShots,0,'no spine on the ground');
  assert.ok(until(h,()=>h.state().jet==='on',40),'wind-up leads into breathing');
  assert.ok(until(h,()=>h.state().jet==='end',40),'a tap still breathes the minimum burst, then winds down');
  const fuel=h.state().jetFuel;assert.ok(fuel<1&&fuel>.8,`a short burst spends a little fuel (${fuel.toFixed(2)})`);
  assert.ok(until(h,()=>h.state().jet===null,40),'wind-down ends the jet');
  assert.ok(until(h,()=>h.state().jetFuel>=1,120),'fuel refills');
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl Flame Jet: holding drains the fuel bar, locks until it refills to the relight level',async()=>{
 const h=await tlezcatlCity();
 try{h.step(30);
  h.down('KeyL');let frames=0;until(h,()=>h.state().jet==='on',40);
  // Count only simulated frames: a car the flame punts into a troop, or a collapse, freezes the game briefly (hitstop).
  for(let n=0;h.state().jet==='on'&&n<400;n++){if(h.state().hitstop===0)frames++;h.step();}
  assert.ok(Math.abs(frames/60-B.jetSeconds)<.1,`a full bar lasts about ${B.jetSeconds}s of breathing (${(frames/60).toFixed(2)}s)`);
  assert.equal(h.state().jetLocked,true,'running dry locks the jet');h.up('KeyL');
  until(h,()=>h.state().jet===null,40);
  h.tap('KeyL');h.step();assert.equal(h.state().jet,null,'locked: L does nothing');
  assert.ok(until(h,()=>!h.state().jetLocked,200),'unlocks as it refills');assert.ok(h.state().jetFuel>=B.jetRelight-.01);
  h.step(20);h.tap('KeyL');assert.equal(h.state().jet,'start','breathes again once relit');
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl Flame Jet: burns the building in front, stopping at its wall; W/S tilt the flame without crouching',async()=>{
 const h=await tlezcatlCity();
 try{h.step(30);
  const s0=h.state(),cx=s0.x+s0.width/2;
  const ahead=s0.buildings.filter((b:any)=>b.hp>0&&b.x>cx).sort((a:any,b:any)=>a.x-b.x)[0];
  assert.ok(ahead,'a building east of the spawn');
  h.down('KeyD');until(h,()=>h.state().x+h.state().width>ahead.x-60,600);h.up('KeyD');h.step(5);
  assert.equal(h.state().face,1);
  const i=h.state().buildings.findIndex((b:any)=>b.x===ahead.x),hp0=h.state().buildingHP[i];
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);h.step(30);
  const hp1=h.state().buildingHP[i];
  assert.ok(hp1<hp0,`the flame burns the building (${hp0} → ${hp1})`);
  assert.ok(h.state().jetLen<B.jetRange-1,`the cone stops at the wall (${Math.round(h.state().jetLen)})`);
  assert.equal(h.state().hitstop,0,'damage ticks do not freeze the game');
  h.down('KeyW');h.step(30);assert.ok(Math.abs(h.state().jetAngle-B.jetUp)<.5,`W tilts up to ${B.jetUp} (${h.state().jetAngle})`);h.up('KeyW');
  h.down('KeyS');h.step(45);assert.ok(Math.abs(h.state().jetAngle+B.jetDown)<.5,`S tilts down to -${B.jetDown} (${h.state().jetAngle})`);
  assert.equal(h.state().crouched,false,'S aims instead of crouching');assert.equal(h.state().jet,'on');
  h.up('KeyS');h.up('KeyL');
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl Flame Jet: creeps slowly while breathing; airborne falls back to the single shot',async()=>{
 const h=await tlezcatlCity();
 try{h.step(30);
  let x=h.state().x;h.down('KeyD');h.step(30);const walk=h.state().x-x;h.up('KeyD');h.step(5);
  h.down('KeyL');until(h,()=>h.state().jet==='on',40);x=h.state().x;h.down('KeyD');h.step(30);const creep=h.state().x-x;h.up('KeyD');h.up('KeyL');
  assert.ok(creep>0&&creep<walk*.4,`creeps at a fraction of walking speed (${creep.toFixed(1)} vs ${walk.toFixed(1)})`);
  until(h,()=>h.state().jet===null,60);h.step(20);
  h.tap('Space');h.step(6);assert.equal(h.state().grounded,false);h.tap('KeyL');h.step();
  assert.equal(h.state().entityCounts.playerShots,1,'airborne fires the shared shot');assert.equal(h.state().jet,null);
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl Magma Dive: plays his own dive and landing, splashes lava globs both ways and leaves burning pools that cool',async()=>{
 const h=await tlezcatlCity();const {MOVE:MV}=await import('../src/config.ts');
 try{h.step(30);
  h.tap('Space');h.step(15);h.tap('KeyS');h.step();assert.equal(h.state().diving,true);
  for(let n=0;n<60&&h.state().diving;n++)h.step();
  assert.equal(h.state().rolling,false,'Tlézcatl does not roll');
  assert.ok(h.state().entityCounts.lavaGlobs>=MV.lavaGlobs*.6,`globs splashed (${h.state().entityCounts.lavaGlobs})`);
  assert.ok(h.state().entityCounts.lavaPools>=1,'a pool under the landing');
  assert.ok(until(h,()=>h.state().entityCounts.lavaGlobs===0,120),'globs come down');
  assert.ok(h.state().entityCounts.lavaPools>1,`globs reaching the street leave pools (${h.state().entityCounts.lavaPools})`);
  assert.ok(until(h,()=>h.state().entityCounts.lavaPools===0,Math.ceil(MV.lavaPoolSeconds*60)+30),'pools cool off');
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl Flame Jet: leaves fire behind (street patches, afterburn on the wall) that dies out and never collapses a building alone',async()=>{
 const h=await tlezcatlCity();
 try{h.step(30);
  const s0=h.state(),cx=s0.x+s0.width/2;
  const ahead=s0.buildings.filter((b:any)=>b.hp>0&&b.x>cx).sort((a:any,b:any)=>a.x-b.x)[0];
  const i=h.state().buildings.findIndex((b:any)=>b.x===ahead.x);
  // Walk up to within flame range (the city-scaled start plaza is wider than the jet), then aim down: the flame washes along
  // the street into the next building's wall, then let go.
  for(let n=0;n<120&&ahead.x-(h.state().x+h.state().width)>B.jetRange*.6;n++){h.down('KeyD');h.step(1);h.up('KeyD');}
  h.down('KeyL');h.down('KeyS');until(h,()=>h.state().jet==='on',40);h.step(40);h.up('KeyS');h.up('KeyL');
  until(h,()=>h.state().jet===null,60);
  assert.ok(h.state().entityCounts.jetFires>0,`street fire left behind (${h.state().entityCounts.jetFires})`);
  assert.ok(h.state().entityCounts.jetFires<=B.jetFireCap);
  assert.ok(h.state().entityCounts.burning>=1,'the building it hit keeps burning');
  const hp=h.state().buildingHP[i];h.step(30);
  assert.ok(h.state().buildingHP[i]<hp,'afterburn keeps chipping it');
  assert.ok(until(h,()=>h.state().entityCounts.jetFires===0&&h.state().entityCounts.burning===0,Math.ceil(B.jetBurnSeconds*60)+30),'all of it burns out');
  assert.ok(h.state().buildingHP.every((v:number,n:number)=>n===i||v===s0.buildingHP[n]),'no spread to other buildings');
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl Flame Jet: sweeping up a wall leaves a track of fire up its side; more spots do not stack the damage',async()=>{
 const h=await tlezcatlCity();
 try{h.step(30);
  const s0=h.state(),cx=s0.x+s0.width/2;
  const ahead=s0.buildings.filter((b:any)=>b.hp>0&&b.x>cx).sort((a:any,b:any)=>a.x-b.x)[0];
  h.down('KeyD');until(h,()=>h.state().x+h.state().width>ahead.x-90,600);h.up('KeyD');h.step(5);
  const i=h.state().buildings.findIndex((b:any)=>b.x===ahead.x);
  h.down('KeyL');h.down('KeyS');until(h,()=>h.state().jet==='on',40);h.step(15);h.up('KeyS');h.down('KeyW');h.step(30);h.up('KeyW');h.up('KeyL');
  until(h,()=>h.state().jet===null,60);
  const n=h.state().entityCounts.burning;
  assert.ok(n>=3,`a track of fire spots up the wall (${n})`);assert.ok(n<=B.jetWallCap);
  const hp=h.state().buildingHP[i];h.step(60);
  const lost=hp-h.state().buildingHP[i],cap=B.jetBurnDamage*1.01*(Math.ceil(1/B.jetBurnTick)+1);
  assert.ok(lost>0&&lost<=cap,`one afterburn tick per building however many spots (${lost.toFixed(1)} ≤ ${cap.toFixed(1)} in 1s)`);
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl heavy: the slam splashes lava globs both ways, more when charged, and leaves a pool on the street',async()=>{
 const h=await tlezcatlCity();const {MOVE:MV}=await import('../src/config.ts');
 try{h.step(30);
  h.tap('KeyK');h.step();
  const tap=h.state().entityCounts.lavaGlobs;assert.equal(tap,MV.heavyLavaGlobs,`a tapped heavy splashes ${MV.heavyLavaGlobs} globs (${tap})`);
  assert.ok(h.state().entityCounts.lavaPools>=1,'a pool where the slam hit the street');
  assert.ok(until(h,()=>h.state().entityCounts.lavaGlobs===0&&h.state().entityCounts.lavaPools===0,400),'globs come down and pools cool');
  h.down('KeyK');h.step(Math.ceil(B.maxCharge*60)+5);h.up('KeyK');h.step();
  assert.equal(h.state().entityCounts.lavaGlobs,MV.heavyLavaGlobs+2,'a full charge splashes extra globs');
 }finally{h.release();h.cleanup();}
});

test('Tlézcatl Flame Jet: tilted all the way up, the flame reaches the airspace a hovering helicopter holds',async()=>{
 const h=await tlezcatlCity();const {UNIT_CONFIG:U}=await import('../src/config.ts');
 try{h.step(30);
  // Face west into the open plaza so no wall cuts the flame short.
  h.down('KeyA');h.step(2);h.up('KeyA');h.step(3);assert.equal(h.state().face,-1);
  h.down('KeyL');h.down('KeyW');until(h,()=>h.state().jet==='on',40);h.step(40);
  const s=h.state(),[ox,oy]=s.jetOrigin,a=s.jetAngle*Math.PI/180,cx=s.x+s.width/2,R=B.jetRange;
  assert.ok(Math.abs(s.jetAngle-B.jetUp)<.5);
  // A helicopter hovers at 70% of its weapon range from the kaiju, at its fixed altitude (top edge y=285).
  const heli={x:cx-U.helicopter.range*.7-U.helicopter.w/2,y:285,w:U.helicopter.w,h:U.helicopter.h};
  let reach=false;
  for(let d=0;d<=s.jetLen;d+=8){const r=B.jetWidth[0]+(B.jetWidth[1]-B.jetWidth[0])*Math.min(1,d/R),x=ox-Math.cos(a)*d,y=oy-Math.sin(a)*d;
   const nx=Math.max(heli.x,Math.min(x,heli.x+heli.w)),ny=Math.max(heli.y,Math.min(y,heli.y+heli.h));if((x-nx)**2+(y-ny)**2<=r*r)reach=true;}
  assert.ok(reach,`the cone at ${B.jetUp}° passes through a hovering helicopter`);
  h.up('KeyW');h.up('KeyL');
 }finally{h.release();h.cleanup();}
});
