import {test} from 'node:test';import assert from 'node:assert/strict';
import {SAN_FRANCISCO,levelWidth} from '../src/levels.ts';
import {CONFIG as C,BRIDGE,ELEVATED as EL} from '../src/config.ts';
import {checkParts,shapeParts,clipParts} from '../src/hitbox.ts';
import {createBuildings,overlaps} from '../src/rules.ts';
import {setTerrain,groundAt,addMound,streetAt} from '../src/terrain.ts';
import {createMilitary,spawnUnit,cruiseY,tickMilitary,setCover} from '../src/military.ts';
import {createParked,spawnTraffic,tickDriving} from '../src/vehicles.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Bug fixes for the San Francisco levels (playtest list): each one pinned by the real loop where it can be, by the pure module otherwise.
const [EMB,UNI,CHI,NOB,FIN,WHARF,FAULT,BAY,GG]=SAN_FRANCISCO;
const boot=async(block:number,x?:number)=>{const h=await bootCampaign(.75,{city:'sfo'});h.test().goto(block,x);h.step(2);return h;};

test('Embarcadero: a train outside its line neither shows nor hits (the tunnel pocket you start in is not on the line)',async()=>{
 const h=await boot(0,150);const [a]=EMB.subway![0];
 // The pocket is a pit west of the line: a westbound train used to run on into it, unseen, and smash the kaiju standing there.
 assert.ok(EMB.pocket!.x1<a,'the pocket lies west of the line');
 for(let n=0;n<60*40;n++){h.step();const s=h.state();for(const t of s.trainList)assert.ok(t.crashed||t.dir>0||t.x+C.cityScale*240>a,'a westbound train is gone once it has left its line');}
 assert.equal(h.state().trainsWrecked,0,'no train ever hit the kaiju in the pocket');
});

test('Trees come up by the roots and are thrown like a lamppost, at Stage 1 as well as Stage 3',async()=>{
 for(const [block,stage] of [[3,2],[0,1]] as const){
  const h=await boot(block);let s=h.state();const palm=s.buildings.findIndex((b:any)=>b.prop==='palm');assert.ok(palm>=0,'a tree in the level');
  const b=s.buildings[palm];h.test().teleport(b.x-s.width-12);h.step(3);
  let got=false;for(let n=0;n<6&&!got;n++){h.tap('KeyH');h.step(3);got=h.state().held==='lamp';if(!got&&h.state().held){h.tap('KeyH');h.step(40);}}
  assert.ok(got,`stage ${stage}: the tree was picked up`);assert.equal(h.state().buildings[palm].lifted,true,'and it is out of the ground');
  h.tap('KeyH');h.step(6);assert.equal(h.state().held,null,'thrown');
 }
});

test('Traffic keeps to the road: never over water or out on a pier, and parked cars are not left on one',async()=>{
 for(const [block,blk] of [[0,EMB],[5,WHARF]] as const){
  const spans=blk.water!;const over=(x:number)=>spans.some(([a,z])=>x>=a&&x<z);
  const h=await boot(block,blk===WHARF?blk.start:600);
  for(let n=0;n<60*45;n++){h.step(1);if(n%10)continue;const s=h.state();
   for(const v of s.vehicles)if(v.state==='driving'&&!(v.kind==='lamp'))assert.ok(!over(v.x+v.w/2),`${blk.name}: a ${v.kind} drove onto the water at ${Math.round(v.x)}`);}
 }
 // Parked rows never stand on a pier or in the water.
 setTerrain(null,[[1000,2000,C.ground+6]],[]);const rows=createParked([900,1200,1500,1800]);assert.ok(rows.every(v=>v.x+v.w<=1000||v.x>=2000),'no parked car on the water');
 setTerrain(null,[],[]);
});

test('Traffic drives on the street, not up over a pile of rubble', ()=>{
 setTerrain(null,[],[]);addMound(100,400,40);
 const v=spawnTraffic(1,0,1,()=>.5,960);v.x=200;v.dir=1;v.speed=0;v.cruise=60;tickDriving(v,.016,5000);
 assert.equal(v.y+v.h,C.ground,'on the road');assert.ok(groundAt(250)<C.ground-10,'the rubble itself is still a mound');assert.equal(streetAt(250),C.ground);
 setTerrain(null,[],[]);
});

test('Traffic turns round at the water instead of driving in',()=>{
 setTerrain(null,[[1000,2000,C.ground+6]],[]);const v=spawnTraffic(1,0,1,()=>.5,960);v.x=900-v.w;v.y=C.ground-v.h;v.dir=1;v.speed=80;v.cruise=80;v.panic=0;
 for(let n=0;n<300;n++)tickDriving(v,.016,-9999);assert.ok(v.x+v.w<=1000,'it never reached the water');assert.equal(v.dir,-1,'and turned back');
 setTerrain(null,[],[]);
});

test('Aircraft hold their height above the street under them: not inside a hill, not under a bridge deck',()=>{
 setTerrain(null,[],[]);const s0=createMilitary(5);assert.equal(spawnUnit(s0,'helicopter',300).y,285,'flat street: the old height');assert.equal(cruiseY('jet',100),267);
 setTerrain([[0,C.ground-210],[6000,C.ground-210]],[],[]);const s=createMilitary(5);
 for(const t of ['helicopter','jet','bomber'] as const){const u=spawnUnit(s,t,400);assert.ok(u.y+u.h<groundAt(400)-100,`${t} spawns well above the raised street (${u.y} vs ${groundAt(400)})`);}
 // A jet flying toward rising ground climbs over it.
 setTerrain([[0,C.ground],[1000,C.ground],[1400,C.ground-210]],[],[]);const s2=createMilitary(5),j=spawnUnit(s2,'jet',900);j.pass=1;
 for(let n=0;n<240;n++)tickMilitary(s2,1/60,0,6000,{x:0,y:300,w:50,h:100},0);
 assert.ok(j.hp<=0||j.y+j.h<groundAt(j.x+j.w/2)-60,'it rose with the ground');
 setTerrain(null,[],[]);
});

test('A shot from above is stopped by a deck over the street',()=>{
 setTerrain(null,[],[]);const s=createMilitary(5);
 const shot=()=>({id:1,weapon:'bullet' as const,x:100,y:150,vx:0,vy:300,life:2,owner:0,damage:10,radius:0,strength:0,dead:false,age:0,startX:100,startY:150,targetX:100,flight:1});
 const player={x:80,y:265,w:40,h:100};
 s.projectiles.push(shot());tickMilitary(s,.5,0,3000,player,0);assert.ok(s.events.some(e=>e.kind==='playerHit'),'with no deck the round reaches the kaiju');
 const s2=createMilitary(5);setCover((x,oy,y)=>oy<=200&&y>=200?200:null);s2.projectiles.push(shot());tickMilitary(s2,.5,0,3000,player,0);
 assert.ok(!s2.events.some(e=>e.kind==='playerHit'),'a deck above the kaiju takes it');setCover(()=>null);
});

test('A dive hits an aircraft it plunges through (a high gunship used to be untouchable)',async()=>{
 const h=await boot(0,1000);const s0=h.state();h.test().spawnUnitOn('helicopter',s0.x+s0.width/2-20,C.ground-330);h.step(2);
 const heli=()=>h.state().militaryUnits.find((u:any)=>u.type==='helicopter');const before=heli().hp;
 h.test().place(h.state().x,C.ground-520);h.tap('KeyS');
 for(let n=0;n<40&&heli()&&heli().hp===before;n++)h.step();
 assert.ok(!heli()||heli().hp<before,'the dive damaged the gunship on the way down');
});

test('Sheared landmarks: the hitbox follows the stump, and the chunk keeps its shape',async()=>{
 const h=await boot(2,7300);const s=h.state();const i=s.buildings.findIndex((b:any)=>b.landmark&&b.parts.length>3&&b.w>200&&b.x>7500);assert.ok(i>=0,'the pagoda');
 const before=s.buildings[i];assert.equal(h.test().shear(i,.55),true,'sheared');h.step(2);
 const b=h.state().buildings[i];assert.ok(b.h<before.h);
 const tallest=Math.max(...b.parts.filter((p:any)=>p.solid).map((p:any)=>b.base-p.y));assert.ok(tallest<=b.h+1,`the hitbox (${tallest}) stops at the roof (${b.h})`);
 assert.ok(b.parts.length<=before.parts.length);
});

test('clipParts cuts a landmark to its new height',()=>{
 const parts=shapeParts('tower','nyc',266,700);const cut=clipParts(parts,300);assert.ok(cut.every(p=>(p.base??0)<300&&p.top<=300));assert.deepEqual(checkParts({x:0,w:266,h:300,parts:cut}),[]);
 const arch=shapeParts('arch','nyc',266,700);assert.ok(Math.max(...arch.map(p=>p.top))<=525,'the arch is 0.75 of its box');
});

test('Chinatown: a lantern string comes down with the building it hangs from',async()=>{
 const h=await boot(2,3000);let s=h.state();assert.ok(s.lanterns.length>=3&&s.lanterns.every((l:any)=>l.fall===null),'strings hang');
 const l=s.lanterns[0];const west=s.buildings.findIndex((b:any)=>b.kind!=='tiny'&&Math.abs(b.x+b.w-(l.x0+6))<10);assert.ok(west>=0);
 h.test().smash(west);h.step(30);assert.notEqual(h.state().lanterns[0].fall,null,'it let go');h.step(90);assert.ok(h.state().lanterns[0].fall>1.1,'and has fallen away');
 assert.ok(h.state().lanterns.slice(1).some((x:any)=>x.fall===null),'strings between standing buildings stay up');
});

test('The sailing ships: only the hull is a hitbox, the masts and sails are scenery',()=>{
 const ships=WHARF.buildings.filter(b=>b.deco==='tallship');assert.equal(ships.length,2);
 for(const b of ships){assert.ok(b.parts&&b.parts.length===1);assert.ok(b.parts![0].top<=b.h*.4,'the hull is the low part of the drawing');assert.deepEqual(checkParts(b),[]);}
});

test('Raised roads have a beginning and an end: ramps you can walk up',async()=>{
 const h=await boot(4,FIN.elevated![0]-FIN.approach!-80);h.step(30);
 h.down('KeyD');for(let n=0;n<60*3;n++)h.step();h.up('KeyD');h.step(10);
 const s=h.state();assert.ok(s.playerFeet<C.ground-40,`walked up the ramp (feet ${Math.round(s.playerFeet)})`);assert.ok(s.playerGrounded);
 assert.ok(FIN.approach!>EL.pillar,'a ramp longer than a span');assert.ok(FAULT.approach!>EL.pillar);assert.ok(BAY.deckApproach!>BRIDGE.clear*3);
 // The freeway's ends are clear of buildings (the ramps climb over open street) and still hold the third crack.
 const [f0,f1]=FAULT.elevated!;assert.ok(FAULT.cracks![2]>f0&&FAULT.cracks![2]<f1);
 for(const b of FAULT.buildings.filter(x=>x.kind!=='tiny'&&!x.landmark))assert.ok(b.x+b.w<=f0-FAULT.approach!||b.x>=f1+FAULT.approach!,'nothing stands under the freeway ramps');
});

test('Bay Bridge: the upper deck is reached by a ramp from the west',async()=>{
 const h=await boot(7,300);h.step(20);
 h.down('KeyD');let best=C.ground;for(let n=0;n<60*14;n++){h.step();best=Math.min(best,h.state().playerFeet);}h.up('KeyD');
 assert.ok(best<C.ground-BRIDGE.deckRise-BRIDGE.clear,`climbed past the lower deck on the way up (${Math.round(best)})`);
});

test('Ramps can be walked down without falling, and break section by section',async()=>{
 const h=await boot(4,FIN.elevated![0]-FIN.approach!-80);h.step(20);
 h.down('KeyD');for(let n=0;n<60*5;n++)h.step();h.up('KeyD');h.step(10);
 const top=h.state().playerFeet;assert.ok(top<C.ground-60,'up on the ramp');
 // Walk back down: the body never leaves the surface for more than a frame or two.
 h.down('KeyA');let air=0,worst=0;for(let n=0;n<60*3;n++){h.step();if(!h.state().playerGrounded){air++;worst=Math.max(worst,air);}else air=0;}h.up('KeyA');
 assert.ok(worst<=2,`walking down a ramp is a walk, not a fall (${worst} frames airborne in a row)`);assert.ok(h.state().playerFeet>top+30,'and it went down');
 // Sections break: smash the ramp under a section and it is gone as a surface (and the cover with it).
 const n0=h.state().slopes.filter((s:any)=>s.alive!==false).length;h.test().smashSlope(1);h.step(5);
 const sl=h.state().slopes;assert.equal(sl.filter((s:any)=>s.alive).length,n0-1,'one section down');assert.ok(sl.length>=4,'a ramp is built of several sections');
});
