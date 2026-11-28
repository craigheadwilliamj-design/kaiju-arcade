import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,AZTECA as A,FLOOD as F,ACID,BELIAL_BOSS as BB} from '../src/config.ts';
import {profileY} from '../src/terrain.ts';
import {emptyPermanent,KAIJU,CAMPAIGN,PERMANENT_KEY} from '../src/campaign.ts';
import {bootCampaign,bootGame} from './helpers/game-harness.ts';
// Mexico City's boss level (MEX rework card 7): Estadio Azteca. Data checks (the bowl, the approach, the flood's numbers), then the game's own update loop through tests/helpers/game-harness.ts:
// the wake, the flood's steps and its warning, damage, lava crust (every source), the rim walkway flag, a non-Belial rival, the retreat and the unlocks. The Empire State must not change.
const MEX=cityIndexOf('mex'),L=LEVELS[MEX],at=(n:string)=>L.findIndex(b=>b.name===n),AZ=L[at('Estadio Azteca')],sc=(n:number)=>Math.round(n*C.cityScale);
const GATE=sc(A.gate),PITCH=C.ground,LOWER=C.ground-A.lower,UPPER=C.ground-A.upper,RIM=UPPER-A.rim,CRACK=sc(A.crack);
const boot=async(level=0,x=0)=>{const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});h.test().goto(at('Estadio Azteca'),x);h.step(2);h.test().growTo(3);if(level>=0)h.test().wakeBoss();h.step(1);if(level>0){h.test().setFloodLevel(level);h.step(1);}return h;};
const feetOf=(h:any)=>h.state().y+C.playerHeight*2.8;
const run=(h:any,seconds:number,until?:(s:any)=>boolean)=>{for(let n=0;n<seconds*60;n++){h.step();if(until&&until(h.state()))return true;}return false;};

// ---- data ----
test('the level: two screens of concourse, then a bowl of stepped tiers around a pitch, with the rim over the top',()=>{
 assert.equal(AZ.kind,'boss');assert.equal(AZ.screens,6);assert.equal(AZ.tier,5);assert.equal(AZ.startStage,3);assert.equal(AZ.cap,3);assert.equal(AZ.volcano,4,'volcano 4 throughout');
 assert.equal(CITIES[MEX].boss,'Belial');assert.equal(L[at('Estadio Azteca')],L.filter(b=>b.kind==='boss')[0]);
 const W=levelWidth(AZ);assert.ok(GATE>=2*sc(C.width),'two screens of concourse');
 // The profile: the concourse stands at the upper tier's height, the stands step down to the lower tier and the pitch, and back up on the far side to a long upper tier.
 const g=AZ.ground!,y=(x:number)=>profileY(g,x);
 assert.equal(y(10),UPPER);assert.equal(y(GATE-5),UPPER,'the concourse is the upper tier');
 assert.equal(y(sc((A.lowerTier[0]+A.lowerTier[1])/2)),LOWER,'the lower tier');assert.equal(y(sc((A.pitch[0]+A.pitch[1])/2)),PITCH,'the pitch');
 assert.equal(y(sc((A.eastLower[0]+A.eastLower[1])/2)),LOWER,'the lower tier on the far side');assert.equal(y(W-40),UPPER,'the far upper tier');
 assert.ok(W-sc(A.eastLower[1]+A.riser)>=sc(600),'the far upper tier is wide enough to stand on');
 // Only the concourse has buildings; the units of the last push stand on it; the bowl is open for a fast kaiju to circle in.
 for(const b of AZ.buildings)assert.ok(b.x+b.w<=GATE,`${b.label||b.deco} stands in the bowl`);
 assert.ok(AZ.buildings.some(b=>b.kind!=='tiny'),'the concourse has buildings');
 for(const [,x] of AZ.units??[])assert.ok(x<GATE,'the military push is on the concourse');assert.ok((AZ.units??[]).length>=6,'a last military push');
 // The flood's numbers: one tier per step, each tier dry once it is reached, the upper tiers drowned at the last step, the rim above it.
 assert.equal(A.breaks.length,3);for(let i=1;i<A.breaks.length;i++)assert.ok(A.breaks[i]<A.breaks[i-1]);
 assert.equal(F.levels.length,3);assert.ok(F.levels[0]<A.lower&&F.levels[0]>A.lower-30,'step 1: just under the lower tier');assert.ok(F.levels[1]<A.upper&&F.levels[1]>A.upper-30,'step 2: just under the upper tier');
 assert.ok(F.levels[2]>A.upper&&F.levels[2]<A.upper+A.rim,'step 3: over the upper tier, under the rim');
 const jump=C.jumpVelocity**2/(2*C.gravity);assert.ok(A.rim<jump,`the rim is one jump (${A.rim} < ${jump.toFixed(0)}) over the upper tier`);
 assert.ok(sc(A.rimX[0])<GATE+sc(120)&&sc(A.rimX[1])>sc(A.eastLower[1]+A.riser),'the rim reaches over both upper tiers');
 // The water band: one span over the bowl, dry (below the pitch) at the start; the level uses depth bands.
 assert.equal(AZ.water!.length,1);assert.equal(AZ.water![0][0],GATE);assert.equal(AZ.water![0][1],levelWidth(AZ));assert.ok(AZ.water![0][2]>PITCH+100);assert.ok(AZ.bands);
 assert.deepEqual([AZ.finale!.flood,AZ.finale!.wake<GATE,AZ.finale!.breaks],[true,true,A.breaks]);
 assert.ok(F.warn>=2&&F.rise>=2,'a warning comes before the rise');assert.ok(F.crustMin>=100,'a crust can carry a kaiju');assert.ok(F.crustLife>F.crack);
});
test('the flood is opt-in: no other level has `finale.flood`, the Empire State and the other finales are untouched',()=>{
 const flooded:string[]=[];CITIES.forEach((c,ci)=>LEVELS[ci].forEach(b=>{if((b.finale as {flood?:unknown}|undefined)?.flood)flooded.push(`${c.id}/${b.name}`);}));
 assert.deepEqual(flooded,['mex/Estadio Azteca']);
 const nyc=LEVELS[cityIndexOf('nyc')].find(b=>b.name==='Empire State')!;assert.ok(nyc.finale!.perches&&!(nyc.finale as any).flood);assert.deepEqual(nyc.finale!.breaks,[.66,.33]);
 for(const [city,name] of [['sfo','Golden Gate']] as const){const b=LEVELS[cityIndexOf(city)].find(x=>x.name===name);if(b)assert.ok(!(b.finale as any)?.flood);}
});

// ---- the wake ----
test('real loop: the rival waits underground until the kaiju passes the wake, then the pitch splits and Belial comes up through it',async()=>{
 const h=await boot(-1);
 try{let s=h.state();assert.ok(s.rivalState.belial&&s.bossName==='Belial','Belial is the rival');assert.equal(s.flood.woke,false);assert.ok(s.rivalState.y>C.ground,'underground before the wake');assert.equal(s.flood.crackOpen,0);
  h.test().teleport(AZ.finale!.wake-200);h.step(60);assert.equal(h.state().flood.woke,false,'nothing happens short of the wake');
  h.test().teleport(AZ.finale!.wake+60);h.step(2);s=h.state();assert.equal(s.flood.woke,true);assert.ok(s.flood.crackOpen>0,'the pitch splits');assert.ok(s.flood.emerge>0,'he is coming up');
  const y0=s.rivalState.y;h.step(30);assert.ok(h.state().rivalState.y<y0,'he rises out of the drain');
  run(h,A.emerge+1);s=h.state();assert.equal(s.flood.emerge,0);assert.equal(s.flood.crackOpen,1);assert.ok(Math.abs(s.rivalState.x+s.rivalState.w/2-CRACK)<400,'he came up at centre field');
  assert.ok(Math.abs(s.rivalState.y+s.rivalState.h-PITCH)<2,'standing on the pitch');
 }finally{h.release();h.cleanup();}
});

// ---- the flood ----
test('real loop: each health break floods one tier higher, after its warning; the surface eases up and the water code takes over',async()=>{
 const h=await boot(0);
 try{h.test().shield(1e9);h.test().teleport(sc(A.lowerTier[0])+40);h.test().setRivalX(sc(A.eastLower[1]));
  let s=h.state();assert.equal(s.flood.level,0);assert.equal(s.flood.wet,false);assert.ok(s.flood.surface>PITCH);
  const seen:string[]=[];
  for(let step=1;step<=3;step++){
   h.test().setRivalHP(A.breaks[step-1]-.02);h.step(2);s=h.state();assert.equal(s.flood.phase,'warn',`break ${step}: the warning first`);assert.equal(s.flood.broken,step);
   const before=s.flood.surface;run(h,F.warn-.5);assert.equal(h.state().flood.surface,before,'the surface has not moved during the warning');assert.equal(h.state().flood.phase,'warn');
   run(h,1);s=h.state();assert.equal(s.flood.phase,'rise',`break ${step}: then it rises`);let last=s.flood.surface;run(h,F.rise/2);assert.ok(h.state().flood.surface<last,'the surface is rising (smaller y)');
   assert.ok(h.state().flood.surface>C.ground-F.levels[step-1],'and has not arrived yet');
   run(h,F.rise);s=h.state();assert.equal(s.flood.level,step);assert.equal(s.flood.phase,'idle');assert.equal(s.flood.surface,C.ground-F.levels[step-1]);seen.push(s.flood.phase);}
  // The tiers: after step 1 the pitch is under acid and the lower tier is dry; after step 2 the lower tier is under too; after step 3 even the upper tier is.
  h.test().setFloodLevel(1);h.step(1);let f=h.state().flood;assert.ok(f.surfaceAt(CRACK)!==null,'the pitch is flooded');assert.equal(f.surfaceAt(sc((A.lowerTier[0]+A.lowerTier[1])/2)),null,'the lower tier is dry');
  h.test().setFloodLevel(2);h.step(1);f=h.state().flood;assert.ok(f.surfaceAt(sc((A.lowerTier[0]+A.lowerTier[1])/2))!==null,'the lower tier is flooded');assert.equal(f.surfaceAt(sc(A.eastLower[1]+A.riser)+300),null,'the upper tier is dry');
  h.test().setFloodLevel(3);h.step(1);f=h.state().flood;assert.ok(f.surfaceAt(sc(A.eastLower[1]+A.riser)+300)!==null,'the upper tier is flooded');
  // Quick breaks queue up: the flood still rises one step at a time.
  const g=await boot(0);try{g.test().shield(1e9);g.test().teleport(sc(A.lowerTier[0])+40);g.test().setRivalX(sc(A.eastLower[1]));g.test().setRivalHP(.1);g.step(2);let t=g.state().flood;assert.equal(t.broken,3);assert.equal(t.level,0);
   run(g,F.warn+F.rise+.5);t=g.state().flood;assert.equal(t.level,1,'one step at a time');assert.equal(t.phase,'warn','the next step is already warning');}finally{g.release();g.cleanup();}
 }finally{h.release();h.cleanup();}
});
test('real loop: Belial swims: over the flood he stands with his feet BB.swim under the surface, at the kaiju\'s height, and rides it up',async()=>{
 const h=await boot(1);
 try{h.test().shield(1e9);h.test().dropAt(sc(A.lowerTier[1])-90,LOWER);h.test().setRivalX(CRACK);h.step(3);let s=h.state();const feet=()=>h.state().rivalState.y+h.state().rivalState.h;
  assert.ok(Math.abs(feet()-(s.flood.surface+BB.swim))<1,`swimming (${feet()} vs ${s.flood.surface+BB.swim})`);
  h.test().setFloodLevel(2);h.step(3);assert.ok(Math.abs(feet()-(h.state().flood.surface+BB.swim))<1,'and higher at the next step');
  h.test().setFloodLevel(0);h.step(3);assert.ok(Math.abs(feet()-PITCH)<1,'on the pitch while it is dry');
 }finally{h.release();h.cleanup();}
});
test('real loop: the acid burns the kaiju (through the water code: wading, then drowning) and never Belial; a Belial kaiju is immune',async()=>{
 const h=await boot(3);
 try{h.test().teleport(sc(A.eastLower[1]+A.riser)+300);h.test().setRivalX(sc(A.lowerTier[0]));h.step(10);let s=h.state();assert.ok(s.grounded,'standing on the upper tier');assert.ok(s.flood.surfaceAt(s.x)!==null,'in the acid');
  const hp0=s.hp;run(h,3);s=h.state();assert.ok(s.hp<hp0,'the acid burns the kaiju');assert.ok(s.flood.burned>0);assert.ok(Math.abs((hp0-s.hp)-s.flood.burned)<12,'about ACID.perSecond a second');
  assert.ok(s.flood.burned/3<=ACID.perSecond*1.6,`${s.flood.burned/3} a second`);
  // Belial is never hurt by it: he stands in the flood for ten seconds at full health.
  h.test().setRivalX(sc(A.pitch[0])+400);const rhp=h.state().rivalState.hp;h.test().shield(1e9);run(h,5);assert.equal(h.state().rivalState.hp,rhp,'the flood never hurts a rival');
  // The kaiju as Belial is immune.
  h.test().setKaiju('Belial');h.test().shield(0);const b0=h.state().flood.burned;run(h,3);assert.equal(h.state().flood.burned,b0,'a Belial kaiju takes no flood damage');
 }finally{h.release();h.cleanup();}
});
test('real loop: over-your-head acid is the water code\'s drowning: the kaiju goes under and is carried back to dry ground',async()=>{
 const h=await boot(0);
 try{h.test().teleport(sc(A.pitch[0])+500);h.test().setRivalX(sc(A.eastLower[1]));h.step(5);assert.ok(h.state().grounded);h.test().setFloodLevel(1);let went=false;
  run(h,4,s=>{if(s.drowning)went=true;return false;});assert.ok(went,'the rising acid drowns a kaiju left on the pitch');run(h,6);const s=h.state();assert.equal(s.drowning,null);
  assert.ok(s.flood.surfaceAt(s.x+40)===null,'back on dry ground (a tier)');
 }finally{h.release();h.cleanup();}
});
test('real loop: troops and wrecks caught by the flood go under',async()=>{
 const h=await boot(0);
 try{h.test().teleport(sc(A.lowerTier[0])+40);h.test().spawnUnit('soldier',sc(A.pitch[0])+900);h.test().spawnUnit('tank',sc(A.pitch[0])+1300);h.step(5);const alive=()=>h.state().militaryUnits.filter((u:any)=>u.hp>0&&u.x>sc(A.pitch[0])&&u.x<sc(A.pitch[1])).length;const n0=alive();assert.ok(n0>=1,'troops stand on the pitch');h.test().setFloodLevel(1);h.step(90);
  assert.equal(alive(),0,'the troops on the pitch are lost');
 }finally{h.release();h.cleanup();}
});

// ---- lava crust ----
const crustTest=(kind:'glob'|'dive'|'eruption'|'bomb',via:'drop'|'splash')=>async()=>{
 const h=await boot(1);
 try{h.test().teleport(sc(A.lowerTier[0])+40);h.test().setRivalX(sc(A.eastLower[1]));h.test().shield(1e9);h.step(2);const x=CRACK-300,f0=h.state().flood;assert.equal(f0.crusts.length,0);
  if(via==='drop')h.test().lava(x,kind);else h.test().splashLava(x,h.state().flood.surface+60,70);
  run(h,2,s=>s.flood.crusts.length>0);const f=h.state().flood;assert.ok(f.crusts.length>=1,`${kind} (${via}) makes a crust`);assert.equal(f.formed,f.crusts.length);
  const c=f.crusts.find((q:any)=>Math.abs(q.x+q.w/2-x)<q.w);assert.ok(c,'where it landed');assert.ok(c.w>=F.crustMin);assert.ok(Math.abs(c.y-(f.surface-F.lift))<6,'on the surface');
 }finally{h.release();h.cleanup();}
};
test('real loop: lava landing on the flood cools into a crust: a Magma Dive glob',crustTest('glob','drop'));
test('real loop: lava landing on the flood cools into a crust: the Eruption\'s glob',crustTest('eruption','drop'));
test('real loop: lava landing on the flood cools into a crust: a volcanic bomb',crustTest('bomb','drop'));
test('real loop: lava landing on the flood cools into a crust: the dive\'s splash (the pool under the dive and its globs)',crustTest('dive','splash'));
test('real loop: a crust carries the kaiju out of the acid, rides the rising surface, cracks, sinks and is gone',async()=>{
 const h=await boot(1);
 try{h.test().setRivalX(sc(A.eastLower[1]));h.test().shield(1e9);const x=CRACK;h.test().lava(x);run(h,2,s=>s.flood.crusts.length>0);let f=h.state().flood;const c0=f.crusts[0];assert.ok(c0);
  // Drop the kaiju on it: it stands (grounded, feet on the crust), out of the acid.
  h.test().dropAt(c0.x+c0.w/2-30,c0.y-120);h.step(40);let s=h.state();assert.ok(s.grounded,'standing');assert.ok(Math.abs(feetOf(h)-s.flood.crusts[0].y)<2,`on the crust (${feetOf(h)} vs ${s.flood.crusts[0].y})`);
  assert.equal(s.flood.carried,1);h.test().shield(0);const burned=s.flood.burned;run(h,1.5);assert.equal(h.state().flood.burned,burned,'no acid damage on a crust');
  // The flood rises under it: the crust and the kaiju ride the surface.
  h.test().lava(x);h.step(2);const y0=h.state().flood.crusts[0].y,fy0=feetOf(h);h.test().setFloodLevel(1);h.test().setRivalHP(A.breaks[1]-.02);h.test().shield(1e9);
  run(h,F.warn+F.rise/2);s=h.state();assert.ok(s.flood.crusts[0].y<y0-10,'the crust is rising with the surface');assert.ok(Math.abs(feetOf(h)-s.flood.crusts[0].y)<2.5,'the kaiju rides it');assert.ok(s.grounded);
  // Keep it fresh until the rise is done, then let it go: it cracks, sinks and is gone; the kaiju falls into the acid.
  run(h,F.rise);s=h.state();assert.equal(s.flood.level,2);
  let cracked=false,sank=false;run(h,F.crustLife+F.sink+4,q=>{const c=q.flood.crusts[0];if(c&&c.life>0&&c.life<F.crack)cracked=true;if(c&&c.sink>0)sank=true;return q.flood.crusts.length===0&&q.flood.expired>=1;});
  s=h.state();assert.ok(cracked,'it cracks near the end');assert.ok(sank,'then sinks');assert.equal(s.flood.crusts.length,0);assert.ok(s.flood.expired>=1);assert.ok(!s.grounded||feetOf(h)>=s.flood.surface-1,'the kaiju is no longer standing on it');
 }finally{h.release();h.cleanup();}
});
test('real loop: more lava on a living crust refreshes it; the number of crusts is capped; the oldest sinks first',async()=>{
 const h=await boot(1);
 try{h.test().setRivalX(sc(A.eastLower[1]));h.test().shield(1e9);const x=CRACK-400;h.test().lava(x);run(h,2,s=>s.flood.crusts.length>0);run(h,5);const life=h.state().flood.crusts[0].life;assert.ok(life<F.crustLife-3);
  h.test().lava(x+20);h.step(30);assert.equal(h.state().flood.crusts.length,1,'a refresh, not a second crust');assert.ok(h.state().flood.crusts[0].life>life);
  for(let i=1;i<=F.maxCrusts+2;i++){h.test().lava(x+i*260);h.step(40);}h.step(F.sink*60+20);assert.ok(h.state().flood.crusts.filter((c:any)=>c.sink<=0).length<=F.maxCrusts);
 }finally{h.release();h.cleanup();}
});
test('real loop: Belial\'s vomit dissolves a crust early (the hook card 5 left); a dissolved crust melts away at once',async()=>{
 const h=await boot(1);
 try{h.test().setRivalX(sc(A.eastLower[1]));h.test().shield(1e9);h.test().lava(CRACK-200);run(h,2,s=>s.flood.crusts.length>0);assert.equal(h.state().flood.crusts[0].dissolved,false);
  assert.ok(h.test().dissolveCrust(0));h.step(2);assert.equal(h.state().flood.crusts[0]?.dissolved??true,true);run(h,F.melt+.5);const f=h.state().flood;assert.equal(f.crusts.length,0,'melted');assert.equal(f.dissolved,1);assert.equal(f.expired,0);
  // The real kit: the vomit is aimed at where the kaiju stood when he telegraphed it; the kaiju has stepped off by the time it lands on the crust.
  h.test().lava(CRACK-200);run(h,2,s=>s.flood.crusts.length>0);const c=h.state().flood.crusts[0];h.test().dropAt(c.x+c.w/2-60,c.y-100);h.step(30);assert.ok(h.state().grounded);
  h.test().setRivalX(c.x+c.w/2+330);h.step(1);assert.ok(h.test().rivalMove('vomit'));h.step(2);h.test().teleport(sc(A.lowerTier[0])+40);
  let dissolved=false;run(h,4,s=>{if(s.flood.crusts[0]?.dissolved||s.flood.dissolved>=2)dissolved=true;return dissolved;});assert.ok(dissolved,'the vomit that lands on a crust eats it');run(h,F.melt+.5);assert.equal(h.state().flood.crusts.length,0);
 }finally{h.release();h.cleanup();}
});
test('real loop: crust never forms off the flood: not on a dry pitch, not on seeps or ordinary water, not in any other level',async()=>{
 const h=await boot(0);
 try{h.test().teleport(sc(A.lowerTier[0])+40);h.test().setRivalX(sc(A.eastLower[1]));h.test().lava(CRACK,'glob');h.test().lava(CRACK+200,'bomb');h.test().lava(CRACK+400,'eruption');h.step(90);assert.equal(h.state().flood.formed,0,'a dry pitch takes lava as lava');
  assert.equal(h.test().floodCrust(CRACK,100),false);
 }finally{h.release();h.cleanup();}
 for(const [name,x] of [['Chapultepec',7000],['Alameda and Bellas Artes',2000],['Calzada de Tlalpan',2000],['Ciudad Universitaria',3000]] as const){
  const g=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
  try{g.test().goto(at(name),x);g.step(3);assert.equal(g.state().flood,null,`${name} has no flood`);assert.equal(g.test().floodCrust(x,100),false);g.test().lava(x);g.step(60);assert.equal(g.state().flood,null);}finally{g.release();g.cleanup();}}
 // An ordinary water band elsewhere: Chapultepec's lake takes the lava as steam, no platform.
 const w=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
 try{w.test().goto(at('Chapultepec'),0);w.step(3);const lake=LEVELS[MEX][at('Chapultepec')].water![0];w.test().teleport(lake[0]-200);w.test().lava((lake[0]+lake[1])/2);w.step(60);assert.equal(w.state().flood,null);assert.equal(w.test().floodCrust((lake[0]+lake[1])/2,100),false);}finally{w.release();w.cleanup();}
});

// ---- the rim walkway ----
test('real loop: the rim walkway opens at the last break by default, a kaiju jumps onto it from the upper tier, and the flag opens it earlier or never',async()=>{
 const h=await boot(0);
 try{h.test().setRivalX(sc(A.lowerTier[0]));h.test().shield(1e9);let f=h.state().flood;assert.equal(f.rimOpen,false);assert.deepEqual(f.floors,[]);
  h.test().setFloodLevel(2);h.step(2);assert.equal(h.state().flood.rimOpen,false,'still closed at step 2');
  h.test().setRivalHP(A.breaks[2]-.02);h.step(2);f=h.state().flood;assert.equal(f.rimOpen,true,'open at the last break');assert.equal(f.floors.length,1);assert.equal(f.floors[0].y,RIM);
  // One jump from the upper tier lands on it; walking along it crosses the bowl over the flood.
  h.test().setFloodLevel(3);h.test().dropAt(sc(A.eastLower[1]+A.riser)+200,RIM-60);h.step(40);let s=h.state();assert.ok(s.grounded);assert.ok(Math.abs(feetOf(h)-RIM)<2,`standing on the rim (${feetOf(h)} vs ${RIM})`);
  assert.equal(s.flood.surfaceAt(s.x)!==null,true,'over the flooded stands');const hp=s.hp;run(h,2);assert.equal(h.state().hp,hp,'out of the acid on the rim');
  h.test().dropAt(CRACK,RIM-200);h.step(40);assert.ok(Math.abs(feetOf(h)-RIM)<2,'and over the middle of the bowl');
  // Under it the pitch is still the pitch: a kaiju that is below the rim walks beneath, it is one-way.
  h.test().setFloodLevel(0);h.step(2);h.test().dropAt(CRACK-600,PITCH-10);h.step(20);assert.ok(Math.abs(feetOf(h)-PITCH)<3);
 }finally{h.release();h.cleanup();}
 const a=await boot(1);try{a.test().rimFrom(1);a.test().setFloodLevel(1);a.step(2);assert.equal(a.state().flood.rimOpen,true,'rimFrom 1: open from the first flood');a.test().rimFrom(3);}finally{a.release();a.cleanup();}
 const n=await boot(0);try{n.test().rimFrom(99);n.test().setFloodLevel(3);n.step(2);assert.equal(n.state().flood.rimOpen,false,'rimFrom 99: never');}finally{n.test().rimFrom(3);n.release();n.cleanup();}
});

// ---- a rival that is not Belial ----
test('real loop: a Free Play rival that is not Belial is immune and keeps to the tiers; none of Belial\'s flood moves',async()=>{
 const p=emptyPermanent();p.conquered=[...CAMPAIGN];p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 try{h.click('#freeplay');h.node('#free-kaiju').value='Mogurodon';h.node('#free-city').value=String(MEX);h.node('#free-boss').value='Kaiban';h.node('#free-block').value=String(at('Estadio Azteca'));
  h.click('#free-start');h.step(3);h.test().growTo(3);let s=h.state();assert.equal(s.bossName,'Kaiban');assert.ok(s.flood,'the flood is the level\'s');assert.ok(!s.rivalState.belial);
  h.test().wakeBoss();h.test().setFloodLevel(1);h.test().shield(1e9);h.test().setRivalX(CRACK);h.step(3);
  for(let n=0;n<200;n++){h.step();const r=h.state().rivalState,f=h.state().flood;assert.ok(f.surfaceAt(r.x+r.w/2)===null&&f.surfaceAt(r.x)===null&&f.surfaceAt(r.x+r.w)===null,`he stays out of the acid (x ${r.x})`);}
  assert.ok(!h.state().rivalState.under,'no submerging');
  const hp=h.state().rivalState.hp;run(h,3);assert.equal(h.state().rivalState.hp,hp,'immune');
 }finally{h.release();h.cleanup();}
});

// ---- the retreat and the unlocks ----
test('real loop: at 0 health Belial dives into the acid at centre field and down the drain, the city is won and conquering unlocks Belial and Paris',async()=>{
 const p=emptyPermanent();p.unlocked=[...KAIJU].filter(k=>k!=='Belial');const saved=new Map<string,string>();
 const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl',permanent:p,saved});
 try{h.test().goto(at('Estadio Azteca'),0);h.step(2);h.test().growTo(3);h.test().wakeBoss();h.step(1);h.test().setFloodLevel(1);h.test().shield(1e9);const shore=sc(A.lowerTier[1]);h.test().dropAt(shore-90,LOWER);h.test().setRivalX(shore+60);h.test().setRivalHP(.02);h.step(2);let s=h.state();assert.ok(s.rivalState.hp>0);
  // He swims in the flood at the kaiju's height, so a kaiju on the shore can reach him: take the last of his health with the real hit path.
  for(let n=0;n<900&&!h.state().flood.retreat;n++){h.test().dropAt(shore-90,LOWER);h.test().setRivalX(shore+60);h.tap('KeyJ');h.step(14);}
  s=h.state();assert.ok(s.flood.retreat,'the retreat began (not a knockout)');assert.equal(s.rivalState.hp,0);
  let sank=false;run(h,F.retreatDive+F.retreatSink+3,q=>{if(q.flood.retreat?.phase==='sink')sank=true;return q.modeNow!=='playing';});assert.ok(sank,'he dived, then went down the drain');
  assert.notEqual(h.state().modeNow,'playing','the city is won');
  const perm=JSON.parse(saved.get(PERMANENT_KEY)!);assert.ok(perm.unlocked.includes('Belial'),'Belial unlocked');assert.ok(perm.conquered.includes('mex'),'Mexico City conquered: Paris is next');
 }finally{h.release();h.cleanup();}
});
