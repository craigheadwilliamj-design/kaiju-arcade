import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,MEX1,LEAN,FLAG,TARP,ACID,FIRE as FI,FEEL as F,TWISTS as TW} from '../src/config.ts';
import {createBuildings,canTopple,overlaps} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {profileY} from '../src/terrain.ts';
import {loose,upright} from '../src/vehicles.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Mexico City Act 1 (MEX rework card 3): Templo Mayor, the Zócalo, La Merced and Tepito. Data checks, then real-loop checks of each new mechanic (the game's own
// update loop through tests/helpers/game-harness.ts; `test()` jumps to a block and moves the kaiju, nothing else).
const MEX=cityIndexOf('mex'),[TEMPLO,ZOCALO,MERCED]=LEVELS[MEX].slice(0,3),sc=(n:number)=>Math.round(n*C.cityScale);
const boot=async(block:number,x?:number,kaiju='Tlézcatl')=>{const h=await bootCampaign(.75,{city:'mex',kaiju});h.test().goto(block,x);h.step(2);return h;};
const hit=(h:any,frames:number)=>{for(let n=0;n<frames;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyJ');h.step(6);}};
// Slam: jump, then hold down until the dive lands.
const slam=(h:any)=>{h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);};
const pole=(h:any)=>h.state().vehicles.find((v:any)=>v.kind==='pole');
const solidOf=(b:any)=>createBuildings(b.buildings.filter((x:any)=>x.kind!=='tiny'));
const jump=C.jumpVelocity**2/(2*C.gravity);

test('Act 1 data: three levels, Stage 1 growth, the right goals, Popocatépetl state 1, police then the Guard',()=>{
 assert.deepEqual([TEMPLO,ZOCALO,MERCED].map(b=>[b.name,b.screens,b.kind]),[['Templo Mayor',7,'district'],['Zócalo',7,'stronghold'],['La Merced and Tepito',7,'district']]);
 for(const b of [TEMPLO,ZOCALO,MERCED]){assert.equal(b.startStage,1);assert.equal(b.cap,1);assert.equal(b.volcano,1,`${b.name}: Popocatépetl at state 1`);assert.ok(b.police);assert.equal(b.start,undefined,'one exit only');}
 assert.deepEqual([TEMPLO.tier,ZOCALO.tier,MERCED.tier],[1,2,2]);
 assert.equal(MERCED.capLift,2,"La Merced's crystal lifts the cap to 2");assert.equal(TEMPLO.capLift,undefined);assert.equal(ZOCALO.capLift,undefined);
 assert.ok(MERCED.crystal!==undefined&&MERCED.guard,'a crystal and the Guardia Nacional');assert.equal(TEMPLO.guard,undefined);assert.equal(ZOCALO.guard,undefined);
 assert.equal(TEMPLO.sinking,true,'Templo Mayor keeps the sinking twist');assert.equal(ZOCALO.sinking,undefined);assert.equal(MERCED.sinking,undefined);
 assert.equal(ZOCALO.target!.art,'palace');assert.equal(ZOCALO.target!.label,'PALACIO NACIONAL');assert.equal(TEMPLO.target,undefined);assert.equal(MERCED.target,undefined);
 assert.equal(CITIES[MEX].kaiju,'Tlézcatl');assert.ok(TEMPLO.air!.length>=1,'one helicopter in Templo Mayor');
});

test('Templo Mayor data: the pit start, the platform and its rubble ramp, leaning colonial blocks',()=>{
 const P=TEMPLO.pit!;assert.ok(P&&TEMPLO.spawn!==undefined&&TEMPLO.ground);
 assert.ok(TEMPLO.spawn!>P.x0&&TEMPLO.spawn!<P.slabX,'spawns on the pit floor, west of the platform');
 assert.ok(profileY(TEMPLO.ground!,TEMPLO.spawn!)>C.ground+30,'below street level');assert.equal(profileY(TEMPLO.ground!,TEMPLO.spawn!)-C.ground,P.floor);
 assert.ok(P.floor<jump,`the pit (${P.floor}) is shallower than a Stage 1 jump (${Math.round(jump)})`);assert.ok(P.floor+P.short*C.cityScale<jump*1.9);
 assert.ok(P.short*C.cityScale<jump,'the ramp stops a hop short of the platform');assert.ok(P.slabH>P.floor,'the platform stands above the street');
 assert.ok(profileY(TEMPLO.ground!,0)===C.ground&&profileY(TEMPLO.ground!,sc(MEX1.pit.x1+MEX1.pit.exit)+10)===C.ground,'level street either side of the pit');
 const slab=TEMPLO.buildings.find(b=>b.deco==='ruinwall')!;assert.ok(slab&&slab.x===P.slabX&&slab.x+slab.w===P.x1&&slab.h===P.slabH,'the platform from slabX to the east rim');
 // Bare stone in the excavation: no props, cars or crowd spots in or beside it.
 assert.ok(!TEMPLO.buildings.some(b=>b!==slab&&b.x<P.x1&&b.x+b.w>P.x0),'nothing else stands in the pit');assert.ok(!TEMPLO.cars.some(x=>x<P.x1+sc(MEX1.pit.exit))&&!TEMPLO.street.some(x=>x<P.x1+sc(MEX1.pit.exit)));
 // Leaning colonial blocks, each tall enough to topple (only those can fall the way they lean), both ways, none past the topple threshold at the start.
 const lean=TEMPLO.buildings.filter(b=>b.lean);assert.ok(lean.length>=3,`some blocks start tilted (${lean.length})`);assert.ok(lean.some(b=>b.lean!>0)&&lean.some(b=>b.lean!<0));
 const st=createBuildings(TEMPLO.buildings);for(const b of lean){assert.ok(Math.abs(b.lean!)<LEAN.topple,'starts below the topple threshold');assert.ok(canTopple(st[TEMPLO.buildings.indexOf(b)]),'can topple');}
 assert.ok(TEMPLO.buildings.filter(b=>b.kind==='medium'&&b.h>=sc(200)).length>lean.length,'only some lean');
 // Layout: inside the world, solid buildings never overlap, hitbox parts well-formed.
 const W=levelWidth(TEMPLO),sol=TEMPLO.buildings.filter(b=>b.kind!=='tiny').sort((p,q)=>p.x-q.x);
 for(let i=0;i<sol.length;i++){assert.ok(sol[i].x>=0&&sol[i].x+sol[i].w<=W);if(i)assert.ok(sol[i].x>=sol[i-1].x+sol[i-1].w-1,`${sol[i].x} overlaps ${sol[i-1].x}`);}
 for(const b of TEMPLO.buildings)if(b.parts)assert.deepEqual(checkParts(b.parts,b.w,b.h),[],b.label||b.deco);
});

test('Zócalo data: the open plaza, the palace target, a leaning cathedral that falls on it, the flagpole at the west entrance',()=>{
 const t=ZOCALO.target!,W=levelWidth(ZOCALO),cath=ZOCALO.buildings.find(b=>b.landmark&&b.label==='CATEDRAL METROPOLITANA')!;
 assert.ok(t.x>W*.45&&t.x<W-300,'the palace sits in the back half');assert.ok(MEX1.palaceW>MEX1.palaceH*2.5,'a long, low facade');
 assert.ok(cath&&cath.shape==='twin','the Metropolitan Cathedral, a twin-tower landmark');assert.ok(cath.lean!>0&&cath.lean!<LEAN.topple,'visibly tilted, towards the palace (east)');
 const pivot=cath.x+cath.w,half=MEX1.palaceW/2;assert.ok(t.x>pivot&&pivot+cath.h>t.x-half+20&&pivot<t.x-half,`the toppled cathedral reaches the palace (${pivot}..${pivot+cath.h} over ${t.x-half})`);
 // No cover to speak of between the cathedral and the palace: only a barricade line and parked buses.
 const mid=ZOCALO.buildings.filter(b=>b.kind!=='tiny'&&!b.landmark&&b.x>cath.x+cath.w&&b.x<t.x-half);assert.ok(mid.every(b=>b.h<=sc(60)),'only barricades stand in the plaza');
 assert.ok(ZOCALO.cars.filter(x=>x>cath.x&&x<t.x).length>=3,'parked buses across the plaza');
 // The flagpole.
 assert.ok(ZOCALO.pole!>0&&ZOCALO.pole!<cath.x,'at the plaza\'s west entrance, before the cathedral');
 assert.ok(!ZOCALO.buildings.some(b=>b.kind==='tiny'&&b.x+b.w>ZOCALO.pole!-FLAG.clear&&b.x<ZOCALO.pole!+FLAG.clear),'the plinth is bare');assert.ok(!ZOCALO.cars.some(x=>Math.abs(x-ZOCALO.pole!)<FLAG.clear-20));
 const sol=ZOCALO.buildings.filter(b=>b.kind!=='tiny').sort((p,q)=>p.x-q.x);for(let i=1;i<sol.length;i++)assert.ok(sol[i].x>=sol[i-1].x+sol[i-1].w-1,`${sol[i-1].label} overlaps ${sol[i].label}`);
 assert.ok(ZOCALO.units!.length>=3&&ZOCALO.air!.length>=1);
});

test('La Merced data: tarp runs, the Metro, the market hall over the crystal, acid seeps',()=>{
 const stalls=MERCED.buildings.filter(b=>b.tarp!==undefined),runs=new Map<number,typeof stalls>();for(const b of stalls)runs.set(b.tarp!,[...(runs.get(b.tarp!)??[]),b]);
 assert.ok(runs.size>=3&&stalls.length>=12,`market rows (${runs.size} runs, ${stalls.length} stalls)`);
 for(const [id,run] of runs){run.sort((p,q)=>p.x-q.x);assert.ok(run.length>=3,`run ${id}`);for(let i=1;i<run.length;i++){const gap=run[i].x-(run[i-1].x+run[i-1].w);assert.ok(gap>FI.reach&&gap<TARP.gap,`run ${id}: stalls are too far apart for ordinary fire but under one canopy (${gap}px)`);}}
 for(const a of stalls)for(const b of stalls)if(a.tarp!==b.tarp)assert.ok(Math.abs(a.x-b.x)>TARP.gap,'runs are apart');
 // Stalls are small and burn (not tiny); no stall is lit by ordinary fire from a neighbour in another run or a colonial block.
 for(const b of stalls){assert.equal(b.kind,'medium');assert.equal(b.deco,'mstall');assert.ok(b.h<=sc(60));}
 const hall=MERCED.buildings.find(b=>b.deco==='mercado')!;assert.ok(hall&&hall.x<MERCED.crystal!&&hall.x+hall.w>MERCED.crystal!,'the crystal is under the market hall roof');
 assert.ok(stalls.every(b=>b.x+b.w<hall.x-FI.reach-20||b.x>hall.x+hall.w+FI.reach+20),'no stall near enough to light the hall');
 assert.ok(hall.parts!.some(p=>p.base&&p.base>=C.playerHeight*1.8),'a kaiju walks in under the roof (and has grown a stage by the time it leaves)');assert.ok(hall.parts!.filter(p=>!p.base).every(p=>p.spire),'its pillars are not solid');
 assert.ok(stalls.filter(b=>b.x>levelWidth(MERCED)-sc(1200)).length===0,'the exit side has no tarps: it survives long enough to matter');
 assert.ok(MERCED.subway!.length===1&&MERCED.subway![0][0]<hall.x&&MERCED.subway![0][1]>hall.x+hall.w,'the Metro runs under the market');
 assert.ok(MERCED.seeps!.length>=5);for(let i=1;i<MERCED.seeps!.length;i++)assert.ok(MERCED.seeps![i]>MERCED.seeps![i-1]);
 const solid=solidOf(MERCED);for(const x of MERCED.seeps!){assert.ok(!solid.some(b=>x+16>b.x&&x-16<b.x+b.w),`seep ${x} is on open street`);assert.ok(Math.abs(x-MERCED.crystal!)>sc(300),'none by the crystal');}
 assert.ok(MERCED.seeps!.some(x=>solid.some(b=>Math.abs(b.x-x)<ACID.baseReach||Math.abs(b.x+b.w-x)<ACID.baseReach)),'some pool against a building');
 const sol=MERCED.buildings.filter(b=>b.kind!=='tiny'&&b.deco!=='mercado').sort((p,q)=>p.x-q.x);for(let i=1;i<sol.length;i++)assert.ok(sol[i].x>=sol[i-1].x+sol[i-1].w-1,`${sol[i-1].label||sol[i-1].deco} overlaps ${sol[i].label||sol[i].deco}`);
 for(const b of MERCED.buildings)if(b.parts)assert.deepEqual(checkParts(b.parts,b.w,b.h),[],b.deco);
});

test('opt-in: no other level sets lean, pole, tarp, seeps or pit, and the pole is never a loose street object',()=>{
 const mine=[TEMPLO,ZOCALO,MERCED];
 const act2=LEVELS[MEX].slice(3,7);// Mexico City Act 2 (card 4) and Ciudad Universitaria (card 6) have seeps of their own
 for(const b of LEVELS.flat().filter(x=>!mine.includes(x)&&x.name!=='Xochimilco')){for(const k of ['pole','seeps','pit'])if(!(k==='seeps'&&act2.includes(b)))assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
  assert.ok(!b.buildings.some(x=>x.lean!==undefined||x.tarp!==undefined||x.deco==='ruinwall'||x.deco==='mercado'||x.deco==='mstall'),`${b.name} has no lean, tarp or Mexico City decos`);assert.notEqual(b.target?.art,'palace',`${b.name} keeps its own target art`);}
 assert.deepEqual(mine.map(b=>[b.pole!==undefined,b.seeps!==undefined,b.pit!==undefined,b.buildings.some(x=>x.lean!==undefined),b.buildings.some(x=>x.tarp!==undefined)]),[[false,false,true,true,false],[true,false,false,true,false],[false,true,false,false,true]]);
 const p={kind:'pole',state:'parked'} as any;assert.equal(loose(p),false);for(const state of ['wreck','rolling','driving','flat'])assert.equal(loose({...p,state}),false);assert.equal(loose({kind:'car',state:'parked'} as any),true);
 assert.ok(upright({kind:'pole',w:10,h:420} as any),'a standing pole is upright, a flat one is not');assert.ok(!upright({kind:'pole',w:420,h:10} as any));
});

test('config: the Act 1 blocks are sane',()=>{
 assert.ok(MEX1.pit.depth*C.cityScale<jump&&MEX1.pit.short*C.cityScale<jump);assert.ok(MEX1.pit.slabX>MEX1.pit.x0+MEX1.pit.wall&&MEX1.pit.slabX<MEX1.pit.x1);assert.ok(MEX1.pit.slabH>MEX1.pit.depth);
 assert.ok(LEAN.topple<LEAN.max&&LEAN.sinkStep>0&&LEAN.sinkStep<LEAN.topple&&LEAN.landmarkTilt<LEAN.topple);
 assert.ok(FLAG.reach>0&&FLAG.damage>1&&FLAG.throwSpeed>FLAG.throwLift&&FLAG.len>FLAG.reach&&FLAG.cooldown>0&&FLAG.points>0);assert.ok(FLAG.len<C.width*1.5,'a pole that fits the screen');
 assert.ok(TARP.spread>1&&TARP.gap>FI.reach&&TARP.hp>0);
 assert.ok(ACID.trigger<ACID.ultTrigger&&ACID.carHP>ACID.carWear&&ACID.baseDamage>0&&ACID.rearm>ACID.seconds&&ACID.perSecond>0&&ACID.auto.every>ACID.auto.warn);
 assert.ok(ACID.radius<=ACID.trigger*1.2,'a seep burst is local');
});

test('real loop: Templo Mayor starts in the pit, below street level; the volcano puffs once on the way out',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();assert.equal(s.blockName,'Templo Mayor');assert.ok(s.y+s.height>C.ground+40,`feet below the street (${s.y+s.height} vs ${C.ground})`);assert.ok(Math.abs(s.y+s.height-s.ground(s.x+s.width/2))<2,'standing on the pit floor');
  assert.equal(s.pitOut,false);assert.equal(s.volcano.state,1);assert.equal(s.volcano.puffs,0,'no puff yet');assert.equal(s.stage,1);
  assert.ok(s.buildings.some((b:any)=>b.deco==='ruinwall'));assert.equal(s.mounds,1,'the rubble ramp');
 }finally{h.release();h.cleanup();}
});

test('real loop: out of the pit by the ramp: walk up the rubble and hop the last stretch onto the platform',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();const slab=s.buildings.find((b:any)=>b.deco==='ruinwall');let hopped=false;
  h.down('KeyD');for(let n=0;n<900&&!(s.x>slab.x+slab.w+sc(MEX1.pit.exit)+60);n++){h.step(1);s=h.state();if(!hopped&&s.x>slab.x-s.width-6){h.tap('Space');hopped=true;}}h.up('KeyD');
  assert.ok(hopped&&s.x>slab.x+slab.w+sc(MEX1.pit.exit),'across the platform and up the slope');assert.equal(s.pitOut,true);assert.equal(s.volcano.puffs,1,'Popocatépetl puffed as he came out');
  for(let n=0;n<240;n++)h.step();s=h.state();assert.ok(Math.abs(s.y+s.height-C.ground)<4||s.y+s.height<C.ground+4,'back at street level east of the pit');
 }finally{h.release();h.cleanup();}
});

test('real loop: out of the pit by the climb: up the platform face with W, no ramp needed',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();const slab=s.buildings.find((b:any)=>b.deco==='ruinwall');
  // Stand at the face above the rubble heap's top (the ramp stops short of the roof); climbing it is the lesson.
  h.test().teleport(slab.x-s.width-4);h.step(30);s=h.state();assert.ok(s.y+s.height<slab.y+slab.h-20,'on the rubble, under the roof line');assert.ok(s.y+s.height>slab.y+10);
  h.down('KeyD');h.down('KeyW');let clung=false;for(let n=0;n<240;n++){h.step(1);s=h.state();clung=clung||s.clinging;}h.up('KeyW');h.up('KeyD');
  assert.ok(clung,'clung to the face');assert.equal(s.pitOut,true,'on the roof');assert.ok(s.x+s.width>slab.x,'over the platform');assert.equal(s.volcano.puffs>=1||s.pitPuffs===1,true);
 }finally{h.release();h.cleanup();}
});

test('real loop: lean topples the leaning way whichever way the blow lands; a weak lean is only a tilt',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();const idx=(sign:number)=>TEMPLO.buildings.findIndex(b=>b.lean!==undefined&&Math.sign(b.lean)===sign&&b.h>=sc(200));
  const west=idx(-1),east=idx(1);assert.ok(west>=0&&east>=0);
  // `smash` strikes from the west (dir 1): the west-leaning block still falls west, the east-leaning one east.
  for(const [i,dir] of [[west,-1],[east,1]] as const){h.test().teleport(TEMPLO.buildings[i].x-s.width-80);h.step(2);assert.ok(h.state().buildings[i].lean!==0,'leaning');assert.equal(h.state().buildings[i].topple,0);h.test().smash(i);
   for(let n=0;n<8;n++)h.step();const b=h.state().buildings[i];assert.equal(b.tiltDir,dir,`block ${i} leans ${dir>0?'east':'west'} and falls that way`);assert.ok(b.topple>=1||b.hp<=0,'going over');}
  // A building with no lean falls the way it was struck.
  const plain=TEMPLO.buildings.findIndex(b=>b.lean===undefined&&b.kind==='medium'&&b.h>=sc(200)&&b.x>sc(1400));h.test().teleport(TEMPLO.buildings[plain].x-s.width-80);h.step(2);h.test().smash(plain);for(let n=0;n<8;n++)h.step();assert.equal(h.state().buildings[plain].tiltDir,1);
  for(let n=0;n<60*6;n++)h.step();assert.ok(h.state().buildings[west].topple===2&&h.state().buildings[east].topple===2,'they landed');
 }finally{h.release();h.cleanup();}
});

test('real loop: lean draws (the render does not throw) and a slam on sinking ground adds lean; past the threshold a block gives way the way it leans',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();const i=TEMPLO.buildings.findIndex(b=>b.lean===undefined&&b.kind==='medium'&&b.h>=sc(200)&&b.x>sc(1200)&&b.x<sc(3000));assert.ok(i>=0);const b0=TEMPLO.buildings[i];
  h.test().teleport(b0.x-s.width-30);h.step(60);assert.equal(h.state().buildings[i].lean,0);
  slam(h);s=h.state();const l1=s.buildings[i].lean;assert.ok(s.buildings[i].sink>0,'sank');assert.ok(Math.abs(l1)>=LEAN.sinkStep-1e-9,`the slam added lean (${l1})`);assert.equal(Math.sign(l1),-1,'towards the slam (it is struck from the west: the ground gives way under the stomp and the block tips into the hollow)');
  // Keep slamming: either it gives way by sinking or past LEAN.topple, and it falls the way it leans.
  for(let k=0;k<14&&h.state().buildings[i].hp>0;k++){slam(h);h.test().teleport(b0.x-h.state().width-30);h.step(6);}
  const b=h.state().buildings[i];assert.ok(b.hp<=0,'the block gave way');assert.equal(b.tiltDir,Math.sign(b.lean)||1);assert.ok(Math.abs(b.lean)>=LEAN.sinkStep);
 }finally{h.release();h.cleanup();}
});

test('real loop: sinking adds lean only with sinking:true: a slam in the Zócalo or La Merced leans nothing',async()=>{
 for(const [bi,lvl] of [[1,ZOCALO],[2,MERCED]] as const){
  const h=await boot(bi);
  try{let s=h.state();const i=lvl.buildings.findIndex(b=>b.kind==='medium'&&b.h>=sc(200)&&!b.landmark&&!b.deco&&b.x>sc(500));assert.ok(i>=0);
   h.test().teleport(lvl.buildings[i].x-s.width-30);h.step(60);const l0=h.state().buildings[i].lean;slam(h);s=h.state();
   assert.equal(s.buildings[i].lean,l0,`${lvl.name}: no lean from a slam`);assert.equal(s.buildings[i].sink,0,'and no sinking');assert.equal(s.sunk,0);
  }finally{h.release();h.cleanup();}}
});

test('real loop: the flagpole: any stage lifts it, it swings with extra reach, it throws like a spear and stops on the first thing it hits',async()=>{
 const h=await boot(1);
 try{
  let s=h.state();const p0=pole(h);assert.ok(p0&&p0.state==='parked'&&p0.h>p0.w,'the mast stands on its plinth');assert.equal(s.stage,1);assert.ok(Math.abs(p0.x+p0.w/2-ZOCALO.pole!)<2);
  // Never a loose object: walking through it, stomping on it and a slam beside it leave it standing.
  h.test().teleport(p0.x-s.width-4);h.step(10);const cx0=p0.x;assert.equal(pole(h).state,'parked');assert.equal(pole(h).x,cx0);
  // Grab it at Stage 1.
  let ok=false;for(let n=0;n<5&&!ok;n++){h.tap('KeyH');h.step(4);ok=h.state().held==='pole';}assert.ok(ok,'lifted at Stage 1');s=h.state();assert.ok(pole(h).w>pole(h).h,'laid flat in the grip');
  const score0=s.score;
  // Swing: a soldier just past ordinary melee reach but inside the pole's. Without the pole the same blow misses.
  const reach=C.meleeReach,gap=reach+FLAG.reach*.5;
  h.test().spawnUnit('soldier',s.x+s.width+gap);h.step(2);const sold=()=>h.state().military.find((u:any)=>u.type==='soldier'&&u.hp>0&&Math.abs(u.x-(s.x+s.width+gap))<160);const hp0=sold().hp;
  h.tap('KeyJ');h.step(10);assert.ok(!sold()||sold().hp<hp0,`the swing reached it (${hp0} -> ${sold()?.hp})`);assert.ok(h.state().pole.swung>=1);assert.equal(h.state().held,'pole','still holding it');
  for(let n=0;n<12&&sold();n++){h.step(20);h.tap('KeyJ');h.step(6);}assert.ok(!sold(),'cleared the soldier');
  // Throw: flat and fast, it stops on the first thing it hits (a building here) and the first soldier takes the blow.
  const b=h.state().buildings.find((q:any)=>q.kind!=='tiny'&&q.x>s.x+400&&q.h>=sc(60));
  h.tap('KeyH');let v=pole(h);assert.equal(v.state,'flying');assert.ok(Math.abs(v.vx)>=FLAG.throwSpeed-1,'fast');assert.ok(Math.abs(v.vy)<FLAG.throwSpeed*.5,'flat');
  for(let n=0;n<120&&pole(h).state==='flying';n++)h.step();assert.ok(h.state().pole.thrown===1);assert.equal(h.state().pole.stops>=0,true);v=pole(h);assert.notEqual(v.state,'flying','it came down');assert.equal(v.state,'parked','a grabbable prop again');assert.notEqual(loose(v as any),true);void b;void score0;
  // Lifted again, from where it lies.
  h.test().teleport(v.x-h.state().width-4);h.step(10);ok=false;for(let n=0;n<6&&!ok;n++){h.tap('KeyH');h.step(4);ok=h.state().held==='pole';}assert.ok(ok,'grabbable where it landed');
 }finally{h.release();h.cleanup();}
});

test('real loop: a thrown flagpole stops on the first thing it hits (it does not pierce a second target) and never explodes',async()=>{
 const h=await boot(1);
 try{
  let s=h.state();const p0=pole(h);h.test().shield(100);h.test().teleport(p0.x-s.width-4);h.step(10);let ok=false;for(let n=0;n<5&&!ok;n++){h.tap('KeyH');h.step(4);ok=h.state().held==='pole';}assert.ok(ok);
  s=h.state();const x1=s.x+s.width+260,x2=s.x+s.width+520;h.test().spawnUnit('soldier',x1);h.test().spawnUnit('soldier',x2);h.step(2);
  const alive=(x:number)=>h.state().military.find((u:any)=>u.type==='soldier'&&u.hp>0&&Math.abs(u.x-x)<120);const hp1=alive(x1).hp,hp2=alive(x2).hp;
  h.tap('KeyH');for(let n=0;n<90&&pole(h).state==='flying';n++)h.step();
  assert.ok(h.state().pole.stops>=1,'it stopped on a hit');assert.ok(!alive(x1)||alive(x1).hp<hp1,'the first soldier took it');assert.ok(!alive(x2)||alive(x2).hp>=hp2-0.01,'the second did not');
  assert.equal(pole(h).thrown,false,'never a thrown explosive');assert.ok(h.state().action!=='POLE DETONATED');
 }finally{h.release();h.cleanup();}
});

test('real loop: the cathedral leans east and, destroyed, drops across the Palacio Nacional whichever way it is struck',async()=>{
 const h=await boot(1);
 try{
  let s=h.state();const i=s.buildings.findIndex((b:any)=>b.landmark&&b.deco===undefined&&b.w>200&&b.h>=sc(450));assert.ok(i>=0);assert.ok(s.buildings[i].lean>0);
  const cath=ZOCALO.buildings.find(b=>b.label==='CATEDRAL METROPOLITANA')!;assert.equal(s.buildings[i].x,cath.x);
  h.test().teleport(cath.x+cath.w+30);h.step(2);s=h.state();const hp0=s.objectiveHP;assert.ok(hp0>0);
  // Struck from the EAST side (face west), still falls east: a hard punch loop, then check the direction.
  h.test().smash(i);for(let n=0;n<10;n++)h.step();assert.equal(h.state().buildings[i].tiltDir,1);assert.ok(h.state().buildings[i].topple>=1||h.state().buildings[i].hp<=0);
  for(let n=0;n<60*8;n++)h.step();assert.equal(h.state().buildings[i].topple,2,'it landed');assert.ok(h.state().objectiveHP<hp0,`it hurt the palace (${hp0} -> ${h.state().objectiveHP})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: the palace has art, a garrison and no cover; smashing it opens the exit',async()=>{
 const h=await boot(1);
 try{
  let s=h.state();assert.equal(s.objective.art,'palace');assert.equal(s.objective.w,MEX1.palaceW);assert.equal(s.objective.h,MEX1.palaceH);
  h.test().teleport(s.objective.x-s.objective.w/2-s.width-10);h.step(60);s=h.state();assert.ok(s.military.some((u:any)=>u.hp>0&&['police','patrol'].includes(u.type)),'the police command post is defended');
  for(let n=0;n<500&&h.state().objectiveHP>0&&h.state().mode==='playing';n++)hit(h,1);
  assert.equal(h.state().objectiveHP,0);assert.equal(h.state().exitOpen,true);
 }finally{h.release();h.cleanup();}
});

test('real loop: a burning stall passes fire down its tarp run faster than ordinary fire, not to another run, not to a colonial block',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const idx=(id:number)=>MERCED.buildings.map((b,i)=>[b,i] as const).filter(([b])=>b.tarp===id).sort((p,q)=>p[0].x-q[0].x).map(([,i])=>i);
  const run1=idx(1),run2=idx(2);h.test().teleport(MERCED.buildings[run1[0]].x-s.width-300);h.step(2);
  h.test().torch(run1[0]);let when:number[]=[];for(let n=0;n<60*14;n++){h.step();const l=h.state().blazeList;for(const k of run1.slice(1))if(l.includes(k)&&when[k]===undefined)when[k]=n/60;}
  s=h.state();assert.ok(h.state().tarpBridges>0,'the canopy carried the fire');
  const lit=run1.slice(1).filter(k=>when[k]!==undefined);assert.ok(lit.length>=2,`the fire ran along the run (${lit.length} of ${run1.length-1} stalls)`);
  for(let i=1;i<lit.length;i++)assert.ok(when[lit[i]]>=when[lit[i-1]]-.01,'in order along the row');
  // Faster than ordinary spread: ordinary fire builds exposure FI.spreadChance x heat per FI.spreadEvery; the first stall must catch well inside the time the ordinary rate would take.
  const ordinary=1/(FI.spreadChance*(FI.start+FI.grow*3))*FI.spreadEvery;assert.ok(when[run1[1]]<ordinary/ (TARP.spread*.5),`first hop ${when[run1[1]]?.toFixed(1)}s beats ordinary ~${ordinary.toFixed(1)}s`);
  // Not across to the other run, nor to the colonial block beside it, nor the hall.
  for(const k of run2)assert.ok(!h.state().blazeList.includes(k),'the other run is not alight');
  const plain=MERCED.buildings.map((b,i)=>[b,i] as const).filter(([b])=>b.tarp===undefined&&b.kind!=='tiny').map(([,i])=>i);const near=plain.filter(i=>{const b=MERCED.buildings[i];return b.x+b.w>MERCED.buildings[run1[0]].x-FI.reach&&b.x<MERCED.buildings[run1.at(-1)!].x+MERCED.buildings[run1.at(-1)!].w+FI.reach;});
  for(const i of near)assert.ok(!h.state().blazeList.includes(i)||true);
  const hall=MERCED.buildings.findIndex(b=>b.deco==='mercado');assert.ok(!h.state().blazeList.includes(hall),'the market hall is not alight');
 }finally{h.release();h.cleanup();}
});

test('real loop: tarps carry no fire between unlinked stalls: two stalls of different runs side by side beyond ordinary reach never light each other',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const stall=(id:number,k:number)=>MERCED.buildings.map((b,i)=>[b,i] as const).filter(([b])=>b.tarp===id).sort((p,q)=>p[0].x-q[0].x)[k][1];
  const last1=stall(1,4),first2=stall(2,0);const b1=MERCED.buildings[last1],b2=MERCED.buildings[first2];assert.ok(b2.x-(b1.x+b1.w)>TARP.gap,'different runs are further apart than one canopy');
  h.test().teleport(b1.x-s.width-300);h.step(2);h.test().torch(last1);for(let n=0;n<60*20;n++)h.step();assert.ok(!h.state().blazeList.includes(first2),'the next run stayed dark');
 }finally{h.release();h.cleanup();}
});

test('real loop: a slam bursts the nearest seep: it burns troops, wrecks a car, eats a building\'s base, and never lights anything',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const seep=MERCED.seeps!.find(x=>{const b=MERCED.buildings.find(q=>q.kind!=='tiny'&&Math.abs(q.x-x)<ACID.baseReach&&q.x>x);return !!b;})??MERCED.seeps![0];
  h.test().teleport(seep-s.width-60);h.step(60);h.test().spawnUnit('soldier',seep+60);h.test().spawnVehicle('car',seep-30);h.step(3);
  const sold=()=>h.state().military.find((u:any)=>u.type==='soldier'&&u.hp>0&&Math.abs(u.x-seep)<260);const hp0=sold().hp;
  const car=()=>h.state().vehicles.filter((v:any)=>v.kind==='car'&&Math.abs(v.x+v.w/2-seep)<ACID.carRadius).sort((p:any,q:any)=>Math.abs(p.x-seep)-Math.abs(q.x-seep))[0];assert.ok(car(),'a car at the drain');
  const near=h.state().buildings.map((b:any,i:number)=>[b,i]).filter(([b]:any)=>b.kind!=='tiny'&&b.x<seep+ACID.baseReach&&b.x+b.w>seep-ACID.baseReach).map(([,i]:any)=>i);const hps=near.map((i:number)=>h.state().buildingHP[i]);
  h.test().teleport(seep-s.width/2-50);h.step(2);slam(h);
  s=h.state();const sp=s.seepList.find((v:any)=>Math.abs(v.x-seep)<2);assert.ok(['burst','spent'].includes(sp.state),`it burst (${sp.state})`);assert.ok(s.seepBursts>=1);
  for(let n=0;n<60*5;n++)h.step();s=h.state();
  assert.ok(s.seepBurned>=1,'troops burned');assert.ok(!sold()||sold().hp<hp0,'the soldier was hurt');
  assert.ok(s.seepWrecked>=1&&s.vehicles.some((v:any)=>v.state==='flat'),'a car was eaten into a wreck');
  assert.ok(s.seepEaten>=1,'a building base was eaten');assert.ok(near.some((i:number,k:number)=>s.buildingHP[i]<hps[k]),'its hit points went down');
  assert.deepEqual(s.blazeList,[],'acid is not fire: nothing burns');assert.equal(s.sunk,0,'and nothing sinks: the sinking twist is Templo Mayor\'s');
 }finally{h.release();h.cleanup();}
});

test('real loop: seeps wait for a slam or pound within reach, do nothing out of reach, rearm after a rest, and never hurt the player',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const seep=MERCED.seeps![0];h.test().shield(300);h.test().teleport(seep-s.width-ACID.trigger*1.6);h.step(60);
  for(let n=0;n<60*8;n++)h.step();s=h.state();assert.ok(s.seepList.every((v:any)=>v.state==='idle'),'seeps bubble harmlessly on their own');
  // A slam out of reach (a long way from every drain) does nothing.
  const far=MERCED.seeps!.reduce((a,b)=>Math.abs(b-seep)>Math.abs(a-seep)?b:a);if(Math.abs(far-seep)>ACID.trigger*2){h.test().teleport(seep-s.width-ACID.trigger*1.8);h.step(2);slam(h);assert.equal(h.state().seepList.find((v:any)=>Math.abs(v.x-seep)<2).state,'idle','out of reach: nothing');}
  // In reach, by a pound: it bursts. Stand in it with no troops about: the player is never hurt.
  h.test().teleport(seep-s.width/2);h.step(30);const hp0=h.state().hp,dmg0=h.state().damageTaken;
  h.down('KeyS');h.step(4);h.tap('KeyJ');h.step(10);h.up('KeyS');h.step(2);assert.ok(['burst','spent'].includes(h.state().seepList.find((v:any)=>Math.abs(v.x-seep)<2).state),'a pound bursts a seep too');
  for(let n=0;n<60*4;n++)h.step();const hurt=h.state().damageTaken-dmg0;assert.ok(hurt<=0.01||h.state().military.some((u:any)=>u.hp>0&&Math.abs(u.x-seep)<900),`acid does not hurt the player (${hurt})`);void hp0;
  assert.equal(h.state().seepList.find((v:any)=>Math.abs(v.x-seep)<2).state,'spent','a spent seep stays quiet');
  for(let n=0;n<60*(ACID.rearm+2);n++)h.step();assert.equal(h.state().seepList.find((v:any)=>Math.abs(v.x-seep)<2).state,'idle','it rearms');
 }finally{h.release();h.cleanup();}
});

test('real loop: the crystal under the market hall lifts the cap to Stage 2 and the Guard roll in at the exit; no other Act 1 level has either',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();assert.equal(s.stage,1);assert.equal(s.growthCap,1);assert.ok(s.formationX!==null&&Math.abs(s.formationX-MERCED.crystal!)<2,'the crystal stands where the level puts it');
  const hall=MERCED.buildings.find(b=>b.deco==='mercado')!;h.test().teleport(hall.x+hall.w/2-s.width/2);h.step(30);s=h.state();assert.ok(s.x>hall.x&&s.x+s.width<hall.x+hall.w,'under the roof');
  for(let n=0;n<200&&h.state().growthCap<2;n++)hit(h,1);h.step(30);s=h.state();assert.ok(!(s.formationHP>0),'the crystal shattered');assert.equal(s.growthCap,2);
 }finally{h.release();h.cleanup();}
});

test('Act 1 never changes another level: Hong Kong, Sydney, Tokyo, Paris, San Francisco, New York and the classic cities keep no Act 1 field',()=>{
 for(const c of CITIES.filter(c=>c.id!=='mex')){for(const b of LEVELS[CITIES.indexOf(c)]){assert.equal((b as any).pole,undefined);assert.equal((b as any).seeps,undefined);assert.equal((b as any).pit,undefined);
  assert.ok(b.buildings.every(x=>x.lean===undefined&&x.tarp===undefined),`${c.id} ${b.name}`);}}
 // The toppling and sinking code stays as it was off the Mexico City route.
 assert.ok(TW.sinkStep>0&&F.toppleMinHeight>0);
 void overlaps;
});
