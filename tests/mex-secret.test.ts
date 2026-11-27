import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,XOCHI as X,WATER} from '../src/config.ts';
import {CAMPAIGN,newRun,latchBlock,nextBlock,exitTarget,secretIds,secretLevelOf} from '../src/campaign.ts';
import {createBuildings} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {setTerrain,depthAt} from '../src/terrain.ts';
import {waterBand} from '../src/water.ts';
import {VEHICLE_SPECS,loose,BURNS} from '../src/vehicles.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Mexico City's secret level (MEX rework card 8): Xochimilco, fire on water. Data checks (routing, the canal profile, the opt-in fields), then the game's own update loop through
// tests/helpers/game-harness.ts: the current (floating things on its band only; powered boats ignore it), a burning trajinera (stays alight while it drifts, lights the boats it bumps and
// the chinampa it brushes; an unlit one does nothing), chinampa ground (wading speed, no running), axolotls, and nothing of it on any other level. Coney Island must not change.
const MEX=cityIndexOf('mex'),L=LEVELS[MEX],at=(n:string)=>L.findIndex(b=>b.name===n),XI=at('Xochimilco'),XO=L[XI],W=levelWidth(XO),sc=(n:number)=>Math.round(n*C.cityScale);
const HEIGHT=(stage:number)=>C.playerHeight*[1,1.4,2.8][stage-1];
const DOCK=sc(10);
const boot=async(x=200)=>{const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});h.test().goto(XI,x);h.step(2);h.test().shield(1e9);return h;};
const run=(h:any,seconds:number,until?:(s:any)=>boolean)=>{for(let n=0;n<seconds*60;n++){h.step();if(until&&until(h.state()))return true;}return false;};
const boats=(h:any)=>h.state().xochi.boats as any[];
const longCanal=XO.water![XO.current![0]],side=XO.water!.filter((_,i)=>i!==XO.current![0]);
const SURF=XO.water![0][2],midCanal=Math.round((longCanal[0]+longCanal[1])/2),CLEAR=sc(1230);// open water west of the free flotilla

// ---- data ----
test('routing: Chapultepec\'s east exit leads to Xochimilco, which rejoins the route at Ciudad Universitaria',()=>{
 const chap=at('Chapultepec'),cu=at('Ciudad Universitaria');
 assert.equal(exitTarget(MEX,chap,'east'),XI);assert.equal(exitTarget(MEX,chap,'west'),cu);assert.equal(exitTarget(MEX,XI),cu);
 const r=newRun('ABC');r.city=CAMPAIGN.indexOf('mex');r.block=chap;r.phase='playing';assert.ok(latchBlock(r));assert.ok(nextBlock(r,10,'east'));assert.equal(r.block,XI);
 r.phase='results';assert.ok(nextBlock(r,20));assert.equal(r.block,cu,'back on the route at Ciudad Universitaria');
});
test('the level: the secret, 5 screens, Stage 3, tier 5, ash falling (volcano 3), light military and no target',()=>{
 assert.deepEqual([XO.screens,XO.kind,XO.secret,XO.startStage,XO.cap,XO.tier,XO.volcano],[5,'district',true,3,3,5,3]);
 assert.equal(XO.after,'Ciudad Universitaria');assert.equal(XO.secretId,'xochimilco');assert.ok(XO.lore);assert.equal(XO.exits,undefined);assert.equal(XO.target,undefined);assert.equal(XO.bands,true);
 assert.deepEqual(secretLevelOf('xochimilco'),{city:MEX,block:XI});assert.ok(secretIds().includes('xochimilco'));
 assert.ok((XO.units??[]).length<=8&&(XO.air??[]).length<=2&&(XO.coastguard??[]).length>=2,'light: the Guardia on boats, a helicopter or two');
 assert.ok((XO.units??[]).filter(u=>u[0]==='emplacement').length===1,'one emplacement, on the dock');
 assert.ok((XO.trajineras??[]).some(t=>t[1]==='food')&&(XO.trajineras??[]).some(t=>t[1]==='mariachi')&&(XO.trajineras??[]).some(t=>t[2]===1),'food boats, mariachi boats and a moored dock');
});
test('the layout: the dock and its station, a long canal, chinampas of ahuejotes and huts between side canals, the doll island, the station to leave by',()=>{
 const solid=createBuildings(XO.buildings.filter(x=>x.kind!=='tiny')).sort((p,q)=>p.x-q.x);
 for(const b of solid){assert.ok(b.x>=0&&b.x+b.w<=W,`${b.label||b.deco} inside the world`);assert.deepEqual(checkParts(b),[],`${b.deco} parts`);}
 for(let i=1;i<solid.length;i++)assert.ok(solid[i].x>=solid[i-1].x+solid[i-1].w-1,`${solid[i].deco} overlaps the one before`);
 assert.equal(solid[0].deco,'estacion','the Tren Ligero\'s stop at the west end');assert.equal(solid[solid.length-1].deco,'estacion','and another to leave by');
 assert.ok(solid.some(b=>b.deco==='mstall'),'dock stalls');assert.ok(solid.some(b=>b.deco==='choza'),'chinampa huts');
 const trees=XO.buildings.filter(b=>b.prop==='ahuejote');assert.ok(trees.length>=20,'ahuejotes');for(const t of trees)assert.ok(t.kind==='tiny'&&t.hp>=40,'a tiny prop sturdy enough to burn');
 // The doll island: its trees carry the dolls and pay nothing; nothing is stationed on it.
 const [d0,d1]=XO.dolls!,isle=trees.filter(t=>t.x>=d0&&t.x<d1);assert.ok(isle.length>=6);for(const t of isle)assert.equal(t.value,0,'no score on the doll island');
 for(const u of XO.units??[])assert.ok(!(u[1]>=d0&&u[1]<d1),'no troops on the island');assert.equal(XO.target,undefined,'and no target');
 for(const b of XO.buildings)assert.ok(!/MUÑECAS|ISLA|DOLL/i.test(b.label),'a generic name: the island is atmosphere only');
 // The canal: one long canal (the biggest water span, carrying the current) and short side canals.
 assert.ok(longCanal[1]-longCanal[0]>W*.4,'one long canal');assert.equal(side.length,2,'two side canals');for(const [a,z] of side)assert.ok(z-a<(longCanal[1]-longCanal[0])/4,'short');
 setTerrain(XO.ground!,XO.water!);
 try{let deepest=0;for(let x=0;x<W;x+=8)deepest=Math.max(deepest,depthAt(x));
  for(const stage of [3,2])assert.equal(waterBand(deepest,HEIGHT(stage)),'wading',`wading at Stage ${stage}`);
  assert.equal(depthAt(sc(100)),0,'the dock is dry');assert.equal(depthAt(W-60),0,'and the exit');assert.ok(depthAt(midCanal)>=WATER.boatMinDepth,'the boats float');
  for(const [a,z] of XO.soft!)assert.equal(depthAt(Math.round((a+z)/2)),0,'chinampas stand over the water');}finally{setTerrain(null);}
 // Chinampa ground sits between the canals (west to east: dock, long canal, chinampa, side canal, island, side canal, chinampa).
 const spans=[...XO.water!].sort((p,q)=>p[0]-q[0]),soft=[...XO.soft!].sort((p,q)=>p[0]-q[0]);assert.equal(soft.length,3);
 assert.ok(spans[0][1]<=soft[0][0]&&soft[0][1]<=spans[1][0]&&spans[1][1]<=soft[1][0]&&soft[1][1]<=spans[2][0]&&spans[2][1]<=soft[2][0],'canals and chinampas alternate');
 assert.deepEqual([d0,d1],soft[1],'the doll island is the middle chinampa');
});
test('the opt-in fields and kinds belong to this level only (Coney Island and every other level are untouched)',()=>{
 const fields=['current','soft','trajineras','axolotls','dolls','ashWater'];
 for(const c of CITIES)for(const b of LEVELS[CITIES.indexOf(c)]??[]){if(b===XO)continue;
  for(const k of fields)assert.equal((b as any)[k],undefined,`${c.id}/${b.name} has no ${k}`);
  assert.ok(!b.buildings.some(x=>x.prop==='ahuejote'||['choza','estacion'].includes(x.deco??'')),`${c.id}/${b.name} uses none of Xochimilco's art`);}
 const nyc=LEVELS[cityIndexOf('nyc')],coney=nyc.find(b=>b.name==='Coney Island')!;assert.equal(coney.current,undefined);assert.equal(coney.soft,undefined);
 assert.deepEqual([...BURNS],['trajinera'],'only the trajinera can stay alight');assert.ok(VEHICLE_SPECS.trajinera.w===X.boat.w&&VEHICLE_SPECS.trajinera.mass===X.boat.mass);
});

// ---- the current ----
test('real loop: the current drifts free boats east along the long canal into a jam, and moves nothing off that band',async()=>{
 const h=await boot(200);
 try{const start=boats(h),moored=start.filter((b:any)=>b.moored),free=start.filter((b:any)=>!b.moored);assert.ok(moored.length>=2&&free.length>=3);
  // A free boat mid-canal drifts east, at about the current's speed, bobbing on the surface.
  const id=h.test().spawnBoat(CLEAR);h.step(2);const b0=boats(h).find((b:any)=>b.id===id);run(h,2);const b1=boats(h).find((b:any)=>b.id===id);
  assert.ok(b1.x>b0.x,'drifts east');assert.ok(Math.abs((b1.x-b0.x)/2-X.current)<4,`about ${X.current} px/s (${(b1.x-b0.x)/2})`);assert.ok(Math.abs(b1.y-SURF)<XOCHI_H(),'afloat');
  // The dock's moored boats stay put; a boat on a side canal does not drift.
  const m0=moored.map((b:any)=>b.x),sideX=Math.round((side[0][0]+side[0][1])/2),sid=h.test().spawnBoat(sideX);h.step(2);const s0=boats(h).find((b:any)=>b.id===sid).x;run(h,3);
  assert.equal(boats(h).find((b:any)=>b.id===sid).x,s0,'no current on a side canal');
  boats(h).filter((b:any)=>b.moored).forEach((b:any,i:number)=>assert.equal(b.x,m0[i],'moored boats stay tied up'));
  // The free flotilla ends up jammed against the first chinampa: touching, in a row.
  run(h,60);const jam=boats(h).filter((b:any)=>!b.moored&&b.x>midCanal&&b.x<longCanal[1]).sort((p:any,q:any)=>q.x-p.x);assert.ok(jam.length>=3);
  assert.ok(jam[0].x+jam[0].w<=longCanal[1],'held by the bank');for(let i=1;i<jam.length;i++)assert.ok(jam[i-1].x-(jam[i].x+jam[i].w)<=X.boat.touch+.5,'boats touch in the jam');
  assert.ok(h.state().xochi.stats.jams>0);
 }finally{h.release();h.cleanup();}
});
function XOCHI_H(){return X.boat.h*1.2;}
test('real loop: powered boats ignore the current, and the current is the only thing that moves a floating trajinera',async()=>{
 const run1=async(speed:number)=>{const h=await boot(200);try{h.test().setCurrent(speed);h.step(2);const id=h.test().spawnBoat(CLEAR);h.step(1);run(h,4);const s=h.state();return {unit:s.boats.map((b:any)=>b.x),boat:boats(h).find((b:any)=>b.id===id).x};}finally{h.release();h.cleanup();}};
 const a=await run1(X.current),b=await run1(0);
 assert.ok(a.boat>b.boat+X.current*3,'the trajinera drifted with the current');assert.equal(a.unit.length,b.unit.length);a.unit.forEach((x:number,i:number)=>assert.ok(Math.abs(x-b.unit[i])<1e-6,'the Guardia\'s boats sail exactly the same with or without it'));assert.ok(a.unit.length>=2);
});
test('real loop: a car or a boat thrown into the long canal floats off with the current for a while, then sinks; on a side canal it sinks at once',async()=>{
 const h=await boot(200);
 try{const y=SURF-160,id=h.test().lobVehicle('car',CLEAR,y);const car=()=>h.state().vehicles.find((v:any)=>v.id===id);
  run(h,2,()=>!car()||car().state==='wreck');let c=car();assert.ok(c,'still there (not sunk at once)');assert.equal(c.state,'wreck');assert.ok(Math.abs(c.y+c.h*.65-SURF)<14,'on the surface');
  const f0=h.state().xochi.floaters.find((v:any)=>v.id===id);assert.ok(f0&&f0.float>0);const x0=c.x;run(h,3);assert.ok(car().x>x0+X.current*2,'drifting east');
  run(h,X.floatLife+2);assert.equal(car(),undefined,'it sinks in the end');
  const sx=Math.round((side[0][0]+side[0][1])/2),id2=h.test().lobVehicle('car',sx,SURF-160);run(h,2);assert.equal(h.state().vehicles.find((v:any)=>v.id===id2),undefined,'a side canal sinks it at once (the ordinary rule)');
  // A thrown trajinera lands on the surface as a smashed hull that floats on, instead of falling to the canal bed.
  const bid=h.test().lobVehicle('trajinera',CLEAR+60,SURF-200);run(h,2,()=>h.state().vehicles.find((v:any)=>v.id===bid)?.state==='wreck');const bb=h.state().vehicles.find((v:any)=>v.id===bid);assert.equal(bb.state,'wreck');assert.ok(bb.y+bb.h<SURF+bb.h*.5,'floating');
 }finally{h.release();h.cleanup();}
});

// ---- the fire boat ----
test('real loop: a burning trajinera keeps burning as it drifts, and lights the boats it bumps down the canal; an unlit one does not',async()=>{
 const h=await boot(200);
 try{const a=h.test().spawnBoat(sc(1400));h.test().teleport(sc(60));h.step(2);
  const of=(id:number)=>boats(h).find((q:any)=>q.id===id),others=()=>boats(h).filter((q:any)=>q.id!==a);
  run(h,8);assert.equal(of(a).blaze,0,'unlit boats do not light anything');assert.ok(others().every((q:any)=>q.blaze===0));
  // The first boat catches; the riders jump off it.
  assert.ok(of(a).riders>0);assert.ok(h.test().igniteVehicle(a));h.step(2);assert.ok(of(a).blaze>X.burn.seconds-1);assert.equal(of(a).riders,0,'the crowd leaps off');
  const x0=of(a).x;run(h,5);assert.ok(of(a).blaze>0&&of(a).blaze<X.burn.seconds-4,'still alight, burning down');assert.ok(of(a).x>x0+X.current*3,'and drifting');
  // It reaches the boats jammed down the canal and lights the one it bumps; that one lights the next.
  run(h,30,()=>others().some((q:any)=>q.blaze>0));assert.ok(others().some((q:any)=>q.blaze>0),'the boat it bumped is alight');assert.ok(h.state().xochi.stats.lit>=1);
  assert.ok(others().filter((q:any)=>q.moored).every((q:any)=>q.blaze===0),'fire never goes upstream to the dock');
  assert.equal(h.test().igniteVehicle(a),false,'already alight: nothing to do');
 }finally{h.release();h.cleanup();}
});
test('real loop: a burning boat in the jam against the first chinampa sets the ahuejotes and huts alight and the fire runs on across the island; an unlit one does not',async()=>{
 const h=await boot(200);
 try{h.test().teleport(sc(60));h.step(3);run(h,60);const lead=boats(h).filter((b:any)=>b.x>midCanal).sort((p:any,q:any)=>q.x-p.x)[0];assert.ok(lead.x+lead.w>longCanal[1]-30,'the lead boat is at the bank');
  // Unlit boats against the bank leave the chinampa alone.
  run(h,6);assert.equal(h.state().blazes,0,'no fire from unlit boats');
  h.test().igniteVehicle(lead.id);run(h,10,s=>s.blazes>0);assert.ok(h.state().blazes>0,'the chinampa catches');assert.ok(h.state().xochi.stats.huts>0);
  const blazing=()=>h.state().blazeList.map((i:number)=>h.state().buildings[i]);run(h,30);
  const trees=h.state().buildings.filter((b:any)=>b.prop==='ahuejote');assert.ok(trees.some((b:any)=>b.hp<60||b.hp<=0),'trees are burning down');
  assert.ok(h.state().blazes+h.state().buildings.filter((b:any)=>b.prop==='ahuejote'&&b.hp<=0).length>=2,'the fire spread tree to tree along the chinampa');void blazing;
  // The boats beside it caught too.
  assert.ok(boats(h).filter((b:any)=>b.blaze>0||b.charred).length>=2,'and the boats alongside');
 }finally{h.release();h.cleanup();}
});
test('real loop: fire does not cross water by itself, and a burning boat burns out to a charred hull that keeps floating',async()=>{
 const h=await boot(200);
 try{h.test().teleport(sc(60));const id=h.test().spawnBoat(midCanal-900);h.step(2);h.test().igniteVehicle(id);
  // Adrift mid-canal, nothing within reach: no building ever catches, and across the long canal the dock is untouched.
  run(h,12);assert.equal(h.state().blazes,0);
  run(h,X.burn.seconds);const b=boats(h).find((q:any)=>q.id===id);assert.equal(b.blaze,0,'burnt out');assert.equal(b.charred,true);assert.equal(h.state().xochi.stats.burnedOut>=1,true);
  const x=b.x;run(h,3);const b2=boats(h).find((q:any)=>q.id===id);assert.ok(b2.x>x,'the hull drifts on');assert.ok(b2.y<SURF+b2.h);
  assert.equal(h.test().igniteVehicle(id),false,'a charred hull cannot burn again');
 }finally{h.release();h.cleanup();}
});
test('real loop: Tlézcatl\'s lava lights a trajinera; a boat can be grabbed, carried alight and thrown, and is still burning where it lands',async()=>{
 const h=await boot(200);
 try{h.test().setCurrent(0);const id=h.test().spawnBoat(midCanal+500);h.step(2);const of=(i:number)=>boats(h).find((q:any)=>q.id===i);assert.equal(of(id).blaze,0);
  h.test().lava(of(id).x+of(id).w/2,'glob');run(h,3);assert.ok(of(id).blaze>0,'a lava glob lights it');assert.ok(of(id).riders===0);
  // Grab one from beside it (its feet clear of the hull): carried, then thrown east, alight, onto the water.
  const id2=h.test().spawnBoat(midCanal-700);h.step(1);const w=C.playerWidth*2.8,bx=of(id2).x;h.test().teleport(bx-w*.82-12);h.step(30);
  h.tap('KeyH');h.step(3);assert.equal(h.state().held,'trajinera','grabbed');assert.ok(h.test().igniteVehicle(id2),'alight in the kaiju\'s hands');h.step(30);assert.ok(of(id2).blaze>0,'still burning while carried');
  h.tap('KeyH');h.step(8);assert.equal(h.state().held,null,'thrown');assert.ok(['flying','wreck'].includes(of(id2).state));
  run(h,3,()=>of(id2).state==='wreck');assert.equal(of(id2).state,'wreck','it lands as a smashed hull on the surface');assert.ok(of(id2).x>bx+w,'thrown east');assert.ok(of(id2).blaze>0,'and is still alight where it lands');assert.ok(of(id2).y+of(id2).h<SURF+of(id2).h,'afloat');
 }finally{h.release();h.cleanup();}
});
test('real loop: smashing a trajinera leaves a hull that floats; the crowd aboard jumps',async()=>{
 const h=await boot(200);
 try{const id=h.test().spawnBoat(midCanal+300);h.step(2);assert.ok(boats(h).find((q:any)=>q.id===id).riders>0);
  h.test().teleport(midCanal+300+X.boat.w/2-C.playerWidth*1.4);run(h,2);const b=boats(h).find((q:any)=>q.id===id);assert.equal(b.state,'wreck');assert.equal(b.riders,0);assert.ok(h.state().vehicles.some((v:any)=>v.id===id&&v.kind==='trajinera'),'it stays');
 }finally{h.release();h.cleanup();}
});

// ---- chinampa ground ----
test('real loop: chinampa ground is ankle-deep mud: wading speed and no running; off it the kaiju moves at its normal speed',async()=>{
 const h=await boot(200);
 try{const dist=async(x:number,keys:string[])=>{h.test().teleport(x);h.step(40);const x0=h.state().x;for(const k of keys)h.down(k);h.step(22);for(const k of keys)h.up(k);return h.state().x-x0;};
  const [sa,sz]=XO.soft![0],soft=await dist(sa+sc(210),['KeyD']),dock=await dist(DOCK,['KeyD']);
  assert.equal(h.state().xochi.soft,false);h.test().teleport(sa+sc(210));h.step(5);assert.equal(h.state().xochi.soft,true,'on a chinampa');
  assert.ok(soft>0&&dock>0);assert.ok(Math.abs(soft/dock-WATER.wadeSlow)<.06,`wading speed (${soft/dock} vs ${WATER.wadeSlow})`);
  // Holding run on the mud does not run; on the dock it does.
  h.test().teleport(sa+sc(210));h.step(30);h.down('KeyD');h.down('ShiftLeft');h.step(15);assert.equal(h.state().running,false,'no running on the mud');assert.ok(Math.abs(h.state().xochi.wade-WATER.wadeSlow)<1e-9,'the wading factor');h.up('KeyD');h.up('ShiftLeft');
  h.test().teleport(DOCK);h.step(30);h.down('KeyD');h.down('ShiftLeft');h.step(8);assert.equal(h.state().running,true,'running works on the dock');assert.equal(h.state().xochi.wade,1);h.up('KeyD');h.up('ShiftLeft');
  assert.ok(sz>sa);
 }finally{h.release();h.cleanup();}
});

// ---- axolotls ----
test('real loop: axolotls scatter as you wade: they bolt away along the bed and are gone, once each',async()=>{
 const h=await boot(200);
 try{const spots=XO.axolotls!;assert.ok(spots.length>=6);setTerrain(XO.ground!,XO.water!);try{for(const x of spots)assert.ok(depthAt(x)>=30,`axolotl at ${x} is in the water`);}finally{setTerrain(null);}
  let s=h.state();assert.equal(s.xochi.axolotls.filter((a:any)=>a.state==='rest').length,spots.length);const pts=s.score;
  h.test().teleport(spots[1]-C.playerWidth*2.8-180);h.step(5);run(h,3);s=h.state();assert.ok(s.xochi.axolotls.some((a:any)=>a.state==='flee'||a.state==='gone'),'they run');
  run(h,6);s=h.state();assert.ok(s.xochi.stats.axolotls>=1,'and are gone');assert.ok(s.score>pts,'a little score');assert.ok(s.xochi.axolotls.filter((a:any)=>a.state==='rest').length<spots.length);
 }finally{h.release();h.cleanup();}
});

// ---- nothing leaks ----
test('real loop: on every other level nothing of this runs: no boats, no soft ground, no current',async()=>{
 const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
 try{for(const name of ['Templo Mayor','Chapultepec','Ciudad Universitaria']){h.test().goto(at(name),400);h.step(3);const s=h.state();assert.equal(s.xochi.boats.length,0);assert.equal(s.xochi.current,null);assert.equal(s.xochi.soft,false);assert.equal(s.xochi.axolotls.length,0);}
  // A trajinera spawned on a level without a current just sits (no drift) and cannot burn from nothing.
  h.test().goto(at('Chapultepec'),400);h.step(2);const id=h.test().spawnBoat(sc(900));h.step(2);const x=boats(h).find((q:any)=>q.id===id).x;run(h,3);assert.equal(boats(h).find((q:any)=>q.id===id).x,x);
 }finally{h.release();h.cleanup();}
});
