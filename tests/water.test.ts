import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';
import {setTerrain,depthAt} from '../src/terrain.ts';
import {waterBand,bandAt,bandSpeed,bandRuns,bandJump,blockedStep,drowning,safeGround,nearestDry,startDrown,tickDrown,slideX} from '../src/water.ts';
import type {DrownEvent} from '../src/water.ts';
import {createCombat,receiveHit} from '../src/combat.ts';
import {createMilitary,spawnUnit,tickMilitary,hitUnit,captureUnit,spawnSquad,navigable,NAVAL_UNITS} from '../src/military.ts';
import {WATER_DRILL,WATER_LAKE,WATER_STEPS,DRILL_BLOCK,LEVELS,cityIndexOf} from '../src/levels.ts';
import {CONFIG as C,COMBAT as B,WATER as W,RIVER,UNIT_CONFIG,MILITARY} from '../src/config.ts';
import {emptyPermanent,PERMANENT_KEY} from '../src/campaign.ts';

const height=(stage:number)=>C.playerHeight*B.stageScale[stage-1];
const loadDrill=()=>setTerrain(WATER_DRILL.ground!,WATER_DRILL.water!,[]);
// The band at the middle of each authored step of the drill lake, west to east.
const EXPECTED:Record<number,string[]>={
 1:['shallows','wading','deep','deep','deep','wading'],
 2:['shallows','wading','wading','deep','deep','wading'],
 3:['shallows','shallows','wading','wading','deep','shallows'],
};

const SF_ACT1=['Embarcadero','Union Square','Chinatown',"Fisherman's Wharf"]; // Act 1, plus the Wharf (Act 2) which opts into water bands
test('depth bands: under 25% of your height is shallows, to 65% wading, over that over your head',()=>{
 assert.equal(waterBand(0,69),'dry');assert.equal(waterBand(17,69),'shallows');assert.equal(waterBand(18,69),'wading');
 assert.equal(waterBand(44,69),'wading');assert.equal(waterBand(46,69),'deep');
 assert.ok(bandSpeed('shallows')<1&&bandSpeed('shallows')>bandSpeed('wading'),'shallows slow you a little, wading a lot');
 assert.equal(bandSpeed('dry'),1);assert.equal(bandSpeed('wading'),W.wadeSlow);
 assert.ok(bandRuns('dry')&&bandRuns('shallows')&&!bandRuns('wading'),'no running in wading water');
 assert.equal(bandJump('shallows'),1);assert.ok(bandJump('wading')<1,'shorter jumps when wading');
});

test('water drill: every step of the lake lands in the expected band at each stage, and each stage meets all three bands',()=>{
 loadDrill();
 try{for(const stage of [1,2,3]){const got=WATER_STEPS.map(([a,z])=>bandAt((a+z)/2,height(stage)));
  assert.deepEqual(got,EXPECTED[stage],`Stage ${stage}`);
  for(const b of ['shallows','wading','deep'])assert.ok(got.includes(b as any),`Stage ${stage} meets ${b}`);}
  for(const [a,z,d] of WATER_STEPS)assert.equal(depthAt((a+z)/2),d,'depth is surface to bed');
  assert.equal(depthAt(WATER_LAKE[0]-40),0,'dry street before the lake');}
 finally{setTerrain(null);}
});

test('water drill block: opt-in bands, the deep tunnel and boats; no other block opts in',()=>{
 const b=WATER_DRILL;assert.equal(b.bands,true);assert.equal(b.tunnel,'deep');assert.equal(b.boats!.length,2);
 const [la,lz]=WATER_LAKE;assert.ok(b.buildings.every(x=>x.x>lz),'nothing stands in or west of the lake');
 assert.ok(b.subway![0][1]<la,'the subway line runs under the open street west of the lake');
 loadDrill();try{for(const x of b.boats!)assert.ok(navigable(x+UNIT_CONFIG.boat.w/2),`boat at ${x} is on water deep enough`);}finally{setTerrain(null);}
 // The SF Act 1 levels opt in to the water/tunnel systems (phase 3); every other block is unchanged.
 for(const blk of [DRILL_BLOCK,...LEVELS.flat().filter(b=>!SF_ACT1.includes(b.name)&&!['Bay Bridge','Golden Gate','Alcatraz'].includes(b.name))]){assert.ok(!blk.bands&&!blk.tunnel&&!blk.boats,`${blk.name} is unchanged`);}
 assert.equal(RIVER.deepPitDepth-RIVER.deepTunnelRoof,80,'about 80px inside the deep tunnel');
 assert.ok(RIVER.deepPitDepth-RIVER.deepTunnelRoof>height(1),'a Stage 1 kaiju stands up in it');
 assert.ok(C.jumpVelocity**2/(2*C.gravity)>=RIVER.deepPitDepth,'and can jump back out of a deep pit');
});

test('the shore is a drop-off by stage; feet under over-your-head water drown; safe ground is dry street',()=>{
 loadDrill();
 try{const [,,s]=WATER_LAKE,edge=2700,over=2900;// wading step (34) beside the 56 step
  assert.equal(blockedStep(edge-20,over,height(1)),true,'Stage 1 will not walk from wading into the 56 step');
  assert.equal(blockedStep(edge-20,over,height(2)),false,'Stage 2 wades on');
  assert.equal(blockedStep(over,edge-20,height(1)),false,'walking back out is never refused');
  assert.equal(drowning(over,s+56,height(1)),true,'standing on the bed of the 56 step at Stage 1');
  assert.equal(drowning(over,s+56,height(2)),false,'the same water is a wade at Stage 2');
  assert.equal(drowning(over,s+4,height(1)),false,'feet barely in: not yet');
  assert.equal(drowning(3700,s+150,height(3)),true,'Stage 3 drowns in the 150 trench');
  assert.equal(safeGround(1500,48,C.ground),true);assert.equal(safeGround(2000,48,s+12),false,'shallows are not safe ground');
  assert.equal(safeGround(1500,48,C.ground-30),false,'off the street (airborne, on a roof) is not');
  const x=nearestDry(2000,48,5376);assert.ok(x+48<=WATER_LAKE[0]+12,`nearest dry spot west of the lake (${x})`);}
 finally{setTerrain(null);}
});

function runDrown(c=createCombat()){const d=startDrown(3000,1800),log:{e:DrownEvent,hp:number,stage:number,mercy:number,x:number}[]=[];
 for(let n=0;n<400&&d.phase!=='done';n++)for(const e of tickDrown(d,1/60,c))log.push({e,hp:c.hp,stage:c.stage,mercy:c.mercy,x:slideX(d)});return {d,c,log};}

test('drowning: slide back, respawn with invincibility, then the HP penalty, in that order',()=>{
 const c=createCombat(),before=c.hp,{log}=runDrown(c);
 assert.deepEqual(log.map(l=>l.e),['slide','respawn','penalty','done']);
 const r=log.find(l=>l.e==='respawn')!,p=log.find(l=>l.e==='penalty')!;
 assert.equal(r.hp,before,'no damage yet at the respawn');assert.equal(r.mercy,W.mercy,'flashing invincibility from the respawn');assert.equal(r.x,1800,'back on the safe spot');
 assert.equal(p.hp,before-W.penalty,'then the penalty');
 assert.equal(receiveHit(c,10,'military'),0,'still invincible after the penalty');
 const d=startDrown(3000,1800);d.phase='slide';d.t=W.slideSeconds/2;const mid=slideX(d);assert.ok(mid<3000&&mid>1800,'the slide carries you between');
});

test('drowning: the penalty can shrink you a stage, never below the soft floor, and never kills',()=>{
 const two=createCombat();two.hp=40;two.stage=2;const a=runDrown(two).log.find(l=>l.e==='penalty')!;
 assert.equal(a.hp,32);assert.equal(a.stage,1,'dropped a stage');assert.ok(two.transform>0,'the shrink plays');
 const floored=createCombat();floored.hp=40;floored.stage=2;floored.floor=2;const b=runDrown(floored).log.find(l=>l.e==='penalty')!;
 assert.equal(b.stage,2,'the soft floor holds Stage 2');assert.equal(b.hp,B.down[0],'HP stops at the floor stage threshold');
 const weak=createCombat();weak.hp=5;runDrown(weak);assert.equal(weak.hp,1);assert.equal(weak.dead,false,'drowning is never lethal');
});

test('police boats: float at the surface, patrol and chase only on water, stay stationed, sink as wrecks, can be grabbed',()=>{
 loadDrill();
 try{const m=createMilitary(1,0,()=>.5),u=spawnUnit(m,'boat',3200,-1),[,,s]=WATER_LAKE;
  assert.ok(NAVAL_UNITS.has('boat'));assert.ok(Math.abs(u.y+u.h*(1-W.boatFloat)-s)<.01,'floats with its keel under the surface');
  const far={x:100,y:C.ground-69,w:48,h:69};let lo=Infinity,hi=-Infinity;
  for(let n=0;n<60*40;n++){tickMilitary(m,1/60,0,5376,far,0,undefined,'player',960,1);lo=Math.min(lo,u.x);hi=Math.max(hi,u.x+u.w);assert.ok(navigable(u.x+u.w/2),'never leaves the water');}
  assert.ok(m.units.includes(u),'stationed: not despawned though the camera is far away');assert.ok(hi-lo>400,`patrols the lake (${Math.round(lo)}-${Math.round(hi)})`);
  assert.ok(lo>=WATER_LAKE[0]&&hi<=WATER_LAKE[1],'within the lake');
  const near={x:2400,y:C.ground-69+34,w:48,h:69};for(let n=0;n<60*45;n++)tickMilitary(m,1/60,1900,5376,near,0,undefined,'player',960,1);
  assert.ok(Math.abs(u.x+u.w/2-(near.x+24))<UNIT_CONFIG.boat.range,'closes on a kaiju in the water');
  assert.ok(m.projectiles.length>0||m.units.some(x=>x.cooldown>0),'and shoots');
  const fleet=createMilitary(1,0,()=>.5);for(let k=0;k<MILITARY.caps[0];k++)spawnUnit(fleet,'boat',2400+k*60,-1);
  assert.ok(spawnSquad(fleet,1900,960,0),'boats do not use up the squad cap');
  const k=spawnUnit(m,'boat',3600,-1);hitUnit(m,k,k.hp,'player',100,1);
  assert.equal(m.wrecks.length,0,'a sunk boat leaves no military wreck (the game sinks its hulk)');
  assert.ok(m.events.some(e=>e.kind==='death'&&e.type==='boat'));
  const g=spawnUnit(m,'boat',3300,-1);assert.equal(captureUnit(m,g),true,'grabbable like a patrol car');}
 finally{setTerrain(null);}
});

async function waterDrill(){const h=await bootGame(.75);h.click('#drills');h.node('#drill-map').value='water';h.click('#start');assert.equal(h.state().mode,'playing');return h;}
const centre=(s:any)=>s.x+s.width/2;

test('real loop: the water drill loads its lake, boats and deep tunnel; the combat drill and East River keep the old tunnel',async()=>{
 const h=await waterDrill();
 try{const s=h.state();assert.equal(s.blockName,'Water Drills');assert.equal(s.pitDepth,RIVER.deepPitDepth);assert.equal(s.boats.length,2);
  assert.ok(Math.abs(s.depth(3000)-56)<1e-9);}
 finally{h.release();h.cleanup();}
 const d=await bootGame(.75);try{d.click('#drills');d.click('#start');assert.equal(d.state().blockName,'Combat Drills');assert.equal(d.state().pitDepth,RIVER.pitDepth);assert.equal(d.state().band,'dry');}finally{d.release();d.cleanup();}
 const e=await bootCampaign(.75,{kaiju:'Mogurodon'});
 try{e.test().goto(3);
  const s=e.state();assert.equal(s.blockName,'East River Offensive');assert.equal(s.pitDepth,RIVER.pitDepth);assert.equal(s.boats.length,0);}
 finally{e.release();e.cleanup();}
});

test('real loop: Stage 1 walks in from dry to shallows to wading, slower each band, no running, and stops at the drop-off',async()=>{
 const h=await waterDrill();
 try{const speed:Record<string,number[]>={},seen:string[]=[];h.down('KeyD');let last=h.state();
  for(let n=0;n<1100;n++){h.step();const s=h.state();if(s.grounded&&last.grounded&&s.band===last.band&&centre(s)>centre(last))(speed[s.band]??=[]).push(centre(s)-centre(last));
   if(seen[seen.length-1]!==s.band)seen.push(s.band);assert.notEqual(s.drowning,'sink','never walks off into deep water');last=s;}
  const stop=centre(last);
  assert.deepEqual(seen,['dry','shallows','wading'],'the bands in order, never over its head');
  assert.ok(stop<2730&&stop>2690,`stopped at the edge of the 56 step (${Math.round(stop)})`);
  const med=(a:number[])=>[...a].sort((p,q)=>p-q)[a.length>>1];
  assert.ok(Math.abs(med(speed.shallows)/med(speed.dry)-W.shallowSlow)<.03,'shallows: slight slow');
  assert.ok(Math.abs(med(speed.wading)/med(speed.dry)-W.wadeSlow)<.03,'wading: real slow');
  h.down('ShiftLeft');h.step(5);assert.equal(h.state().running,false,'no running while wading');h.up('ShiftLeft');
  // A jump from the wading step is lower than one on dry land.
  const rise=()=>{const y0=h.state().y;let top=y0;h.tap('Space');for(let n=0;n<60;n++){h.step();top=Math.min(top,h.state().y);}return y0-top;};
  h.up('KeyD');h.step(10);const wet=rise();
  h.down('KeyA');h.step(500);h.up('KeyA');assert.equal(h.state().band,'dry');const dry=rise();
  assert.ok(wet<dry*.7,`wading jump ${Math.round(wet)} vs dry ${Math.round(dry)}`);}
 finally{h.release();h.cleanup();}
});

test('real loop: hopping off the drop-off drowns Stage 1: back to safe ground, respawn flashing, then the penalty',async()=>{
 const h=await waterDrill();
 try{h.down('KeyD');h.step(1000);let s=h.state();assert.equal(s.band,'wading');const safe=s.safeX;assert.ok(safe+s.width<WATER_LAKE[0]+12,'safe spot is on the dry street');
  h.tap('Space');const phases:string[]=[];let atRespawn:any=null,afterPenalty:any=null,prev=h.state();
  for(let n=0;n<240;n++){h.step();s=h.state();if(phases[phases.length-1]!==s.drowning)phases.push(s.drowning);
   if(s.drowning==='mercy'&&prev.drowning==='slide')atRespawn={...s,hpBefore:prev.hp};
   if(atRespawn&&!afterPenalty&&s.drowning===null&&prev.drowning==='mercy')afterPenalty={...s,hpBefore:prev.hp};prev=s;}
  h.up('KeyD');
  assert.deepEqual(phases,[null,'sink','slide','mercy',null]);
  assert.ok(atRespawn,'respawned');assert.equal(atRespawn.x,safe,'at the last safe ground');assert.equal(atRespawn.band,'dry');assert.ok(atRespawn.grounded);
  assert.equal(atRespawn.hp,atRespawn.hpBefore,'no damage at the respawn itself');assert.ok(atRespawn.mercy>0,'invincibility frames from the respawn');
  assert.ok(afterPenalty,'penalty applied');assert.ok(Math.abs(afterPenalty.hpBefore-afterPenalty.hp-W.penalty)<1e-9,'then the HP penalty');
  assert.ok(afterPenalty.mercy>0,'still flashing after the penalty');}
 finally{h.release();h.cleanup();}
});

test('real loop: grab a police boat while wading, throw it out over the lake, and it sinks',async()=>{
 const h=await waterDrill();
 try{h.down('KeyD');let s=h.state();
  for(let n=0;n<1400&&s.held!=='boat';n++){h.step();s=h.state();const b=s.boats[0];if(b&&s.band==='wading'&&b.x>s.x&&b.x-(s.x+s.width)<30){h.tap('KeyH');h.step();s=h.state();}}
  h.up('KeyD');assert.equal(s.held,'boat','grabbed a boat');assert.equal(s.boats.length,1,'out of the fight once lifted');
  h.tap('KeyJ');let sank=0;for(let n=0;n<240;n++){h.step();sank=Math.max(sank,h.state().sinking);}
  s=h.state();assert.ok(sank>0,'went under');assert.equal(s.vehicles.filter((v:any)=>v.kind==='boat').length,0,'no boat hulk left afloat');}
 finally{h.release();h.cleanup();}
});

test('real loop: a slam over the water drill subway opens a deep pit Stage 1 stands in and jumps out of',async()=>{
 const h=await waterDrill();
 try{h.down('KeyD');h.step(130);h.up('KeyD');h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);
  let s=h.state();assert.equal(s.pits.length,1,'the street caved in');assert.equal(s.pits[0].floor,C.ground+RIVER.deepPitDepth);
  assert.ok(Math.abs(s.y+s.height-s.pits[0].floor)<2,'standing on the deep pit floor');
  assert.ok(s.y>=C.ground+RIVER.deepTunnelRoof-1,'the whole Stage 1 body fits under the tunnel roof');
  h.down('KeyD');h.tap('Space');h.step(40);h.up('KeyD');s=h.state();assert.ok(s.grounded&&Math.abs(s.y+s.height-C.ground)<1,'jumped back up onto the street');}
 finally{h.release();h.cleanup();}
});

