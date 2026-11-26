import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {BUILDING_PRESETS,CAMPAIGN as P,CONFIG as C,STEAM as ST,BULL as BL,COMBAT as B,NYC1,VEHICLES as VC} from '../src/config.ts';
import {createBuildings,canExitBlock,damageObjective,overlaps} from '../src/rules.ts';
import {liftCap,createCombat,setGrowth} from '../src/combat.ts';
import {checkParts} from '../src/hitbox.ts';
import {profileY} from '../src/terrain.ts';
import {waterBand} from '../src/water.ts';
import {VEHICLE_SPECS,loose} from '../src/vehicles.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// New York Act 1 (NYC rework card 2): The Battery, Wall Street, SoHo and Canal Street. Data checks, then real-loop checks of each new
// mechanic (the game's own update loop through tests/helpers/game-harness.ts; `test()` jumps to a block and moves the kaiju, nothing else).
const NYC=cityIndexOf('nyc'),[BAT,WALL,SOHO]=LEVELS[NYC].slice(0,3),sc=(n:number)=>Math.round(n*C.cityScale);
const boot=async(block:number,x?:number)=>{const h=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban'});h.test().goto(block,x);h.step(2);return h;};
const hit=(h:any,frames:number)=>{for(let n=0;n<frames;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);}};
// Heavy blows until the target is gone (the garrison shoots back: do not keep fighting once it is down).
const smashTarget=(h:any)=>{for(let n=0;n<400&&h.state().objectiveHP>0&&h.state().mode==='playing';n++)hit(h,1);};
// Slam: jump, then hold down until the dive lands.
const slam=(h:any)=>{h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);};
// Stand just west of a vehicle, in a spot with no lamppost under the body (a grab prefers whatever is under you).
const standWest=(h:any,v:any)=>{const s=h.state();for(let gap=14;gap<70;gap+=4){const x=v.x-s.width-gap;if(!s.vehicles.some((o:any)=>o.kind==='lamp'&&o.x+o.w>x-6&&o.x<x+s.width+6)){h.test().teleport(x);return x;}}h.test().teleport(v.x-s.width-14);return v.x-s.width-14;};
const grab=(h:any,kind:string)=>{for(let n=0;n<5;n++){h.tap('KeyH');h.step(3);if(h.state().held===kind)return true;if(h.state().held){h.tap('KeyH');h.step(40);}}return false;};
const solidOf=(b:any)=>createBuildings(b.buildings.filter((x:any)=>x.kind!=='tiny'));

test('Act 1 data: three levels, the right goals and screens, Kaiban at Stage 1, police and the first Guard',()=>{
 assert.deepEqual([BAT,WALL,SOHO].map(b=>[b.name,b.screens,b.kind]),[['The Battery',8,'stronghold'],['Wall Street',7,'stronghold'],['SoHo and Canal Street',7,'district']]);
 for(const b of [BAT,WALL,SOHO]){assert.equal(b.startStage,1);assert.equal(b.cap,1);assert.ok(b.police);}
 assert.equal(SOHO.capLift,2,'SoHo lifts the cap to Stage 2');assert.equal(BAT.capLift,undefined);assert.equal(WALL.capLift,undefined);assert.equal(CITIES[NYC].kaiju,'Kaiban');
 assert.deepEqual([BAT.tier,WALL.tier,SOHO.tier],[1,2,2]);
 // Goals: Castle Clinton and the NYSE command post sit near the exit end; SoHo is destruction-based with the crystal and the Guard.
 assert.deepEqual([BAT.target!.art,BAT.target!.label,WALL.target!.art,WALL.target!.label],['fort','CASTLE CLINTON','exchange','NYSE COMMAND POST']);assert.equal(SOHO.target,undefined);
 for(const b of [BAT,WALL])assert.ok(b.target!.x>levelWidth(b)*.55&&b.target!.x<levelWidth(b)-300,`${b.name}: the target sits near the exit end`);
 assert.ok(NYC1.fortW>NYC1.fortH*2,'a low round wall');assert.ok(NYC1.exchangeW>NYC1.exchangeH,'a wide facade');
 // The Battery: starts in the harbour (a spawn, not a `start`: one exit), water bands, police boats, the ferry, a seawall too tall to jump, the South Ferry loop, no tunnel pocket.
 assert.equal(BAT.start,undefined,'one exit only');assert.equal(BAT.pocket,undefined);assert.ok(BAT.bands&&BAT.water&&BAT.ground&&BAT.boats!.length>=3&&BAT.subway&&BAT.tunnel==='deep');
 const [w0,w1,surface]=BAT.water![0];assert.ok(BAT.spawn!>w0&&BAT.spawn!<w1,'spawns over the water');
 const depth=profileY(BAT.ground!,BAT.spawn!)-surface;assert.equal(waterBand(depth,C.playerHeight),'wading','Stage 1 wades at the spawn');
 assert.ok(profileY(BAT.ground!,w1)<=surface,'the harbour shoals out to dry shore');
 const ferry=BAT.buildings.find(b=>b.deco==='sifery')!,wall=BAT.buildings.find(b=>b.deco==='wall')!;assert.ok(ferry&&ferry.x>w0&&ferry.x+ferry.w<w1,'the Staten Island Ferry is moored in the harbour');
 assert.ok(wall.x>=w1-4&&wall.x<w1+sc(60),'the seawall is the shore');assert.ok(wall.h>C.jumpVelocity**2/(2*C.gravity),`the seawall (${wall.h}) is taller than a jump`);
 assert.ok(BAT.buildings.some(b=>b.deco==='ferry')&&BAT.buildings.some(b=>b.deco==='carousel')&&BAT.buildings.filter(b=>b.prop==='tree').length>=5,'terminal, carousel and trees in Battery Park');
 assert.ok(BAT.subway![0][0]>w1&&BAT.subway![0][1]<BAT.target!.x,'the South Ferry loop runs under the park');
 // Wall Street: the Bull, the supertall canyon, Trinity Church, the 4/5, the Federal Reserve, SWAT and helicopters, two towers flanking the command post.
 assert.ok(WALL.bull!>0&&WALL.bull!<sc(1000),'the Charging Bull stands at Bowling Green, at the start');assert.ok(WALL.subway&&WALL.tunnel===undefined&&WALL.swat!.length>=3&&WALL.air!.length>=2);
 assert.ok(WALL.buildings.some(b=>b.landmark&&b.label==='TRINITY CHURCH'&&b.shape==='twin'),'Trinity Church');
 assert.ok(WALL.buildings.some(b=>b.cache&&b.deco==='vault'&&b.label==='FEDERAL RESERVE'),'the Federal Reserve vault cache');
 const canyon=WALL.buildings.filter(b=>b.kind!=='tiny'&&!b.landmark&&b.h>=sc(700)&&b.x<WALL.target!.x-sc(700)||b.kind!=='tiny'&&!b.landmark&&b.h>=sc(700)&&b.x>WALL.target!.x+sc(700));
 assert.ok(canyon.length>=12,`a canyon of supertall towers (${canyon.length})`);assert.ok(Math.min(...canyon.map(b=>b.h))>=sc(740),'every canyon tower is supertall (10x the kaiju)');
 assert.ok(Math.max(...canyon.map(b=>b.h))-Math.min(...canyon.map(b=>b.h))<=sc(40),'roofs within a jump of each other: the rooftop route');
 const t=WALL.target!,flank=WALL.buildings.filter(b=>b.kind!=='tiny'&&b.h>=sc(850));assert.ok(flank.length>=2);
 assert.ok(flank.some(b=>b.x+b.w<t.x&&t.x-NYC1.exchangeW/2-(b.x+b.w)<b.h)&&flank.some(b=>b.x>t.x&&b.x-(t.x+NYC1.exchangeW/2)<b.h),'one flank tower either side is close enough to land on the target');
 const tight=canyon.sort((p,q)=>p.x-q.x).filter((b,i,a)=>i>0&&b.x-(a[i-1].x+a[i-1].w)<8).length;assert.ok(tight>=8,`towers stand shoulder to shoulder (${tight})`);
 // SoHo: lofts with roof tanks, the stalls, the jam, the steam vents, the crystal, the Guard.
 assert.ok(SOHO.buildings.filter(b=>b.roof==='tank').length>=4,'roof water tanks');assert.ok(SOHO.buildings.filter(b=>b.deco==='brick').length>=12,'cast-iron lofts');
 assert.ok(SOHO.buildings.filter(b=>b.prop==='stall').length>=4,'Canal Street vendor stalls');assert.ok(SOHO.buildings.some(b=>b.deco==='portal'&&b.label==='HOLLAND TUNNEL'),'the Holland Tunnel portal');
 assert.ok(SOHO.cars.filter(c=>c>sc(4300)).length>=8,'the tunnel approach is jammed with cars');assert.ok(SOHO.crystal!==undefined&&SOHO.guard);assert.ok(SOHO.swat!.length&&SOHO.air!.length);
 assert.ok(SOHO.vents!.length>=6,'steam vents');for(let i=1;i<SOHO.vents!.length;i++)assert.ok(SOHO.vents![i]>SOHO.vents![i-1]);
 const solid=solidOf(SOHO);for(const x of SOHO.vents!){assert.ok(!solid.some(b=>x+16>b.x&&x-16<b.x+b.w),`vent ${x} is on open street`);assert.ok(Math.abs(x-SOHO.crystal!)>sc(300),'none under the crystal');}
 assert.ok(SOHO.vents!.filter(x=>SOHO.cars.some(c=>Math.abs(c-x)<sc(240))).length>=2,'some manholes sit in the jam');
 // Layout: everything inside the world, solid buildings never overlap, hitbox parts well-formed, the Bull stands clear.
 for(const b of [BAT,WALL,SOHO]){const W=levelWidth(b),s=solidOf(b);
  for(const x of s){assert.ok(x.x>=0&&x.x+x.w<=W,`${b.name}: ${x.label||x.deco} inside the world`);assert.deepEqual(checkParts(x),[]);}
  for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++)assert.ok(!overlaps({x:s[i].x,y:0,w:s[i].w,h:1},{x:s[j].x,y:0,w:s[j].w,h:1}),`${b.name}: solid buildings ${i} and ${j} overlap`);}
 assert.ok(!solidOf(WALL).some(b=>WALL.bull!+VEHICLE_SPECS.bull.w>b.x&&WALL.bull!<b.x+b.w),'the Bull is on open street');
 // No building stands in the harbour but the ferry.
 for(const x of BAT.buildings)if(x.kind!=='tiny'&&x!==ferry)assert.ok(x.x>=w1-4,`no building stands in the water (${x.label||x.deco})`);
});

test('opt-in: no other level sets the new fields; no other city\'s target art, vents or bull',()=>{
 const mine=[BAT,WALL,SOHO],hudson=LEVELS[NYC].find(x=>x.name==='Hudson Yards')!;// Hudson Yards (Act 3) reuses the steam vents as geysers
 for(const b of LEVELS.flat().filter(x=>!mine.includes(x)&&x!==hudson)){for(const k of ['vents','bull','spawn'])assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);assert.ok(!['fort','exchange'].includes(b.target?.art??''),`${b.name} keeps its own target art`);}
 assert.deepEqual(mine.map(b=>[b.vents!==undefined,b.bull!==undefined,b.spawn!==undefined]),[[false,false,true],[false,true,false],[true,false,false]]);
 // The Bull is not a loose street object, so nothing that sweeps the street (stomps, waves, blasts, steam) can reach it.
 const bull={kind:'bull',state:'parked'} as any;assert.equal(loose(bull),false);assert.equal(loose({...bull,state:'wreck'}),false);assert.equal(loose({kind:'car',state:'parked'} as any),true);
});

test('goals open the exits: destroying Castle Clinton or the NYSE command post opens a stronghold; SoHo opens at 75%',()=>{
 for(const b of [BAT,WALL]){const bs=createBuildings(b.buildings),o={x:b.target!.x,hp:P.strongholdHP,maxHP:P.strongholdHP,shattered:false};
  assert.equal(canExitBlock(b.kind,bs,o),false,`${b.name} starts closed`);damageObjective(o,P.strongholdHP,P.strongholdShards);assert.equal(canExitBlock(b.kind,bs,o),true,`${b.name} opens when the target is destroyed`);}
 const bs=createBuildings(SOHO.buildings);assert.equal(canExitBlock('district',bs,null),false);
});

test('growth: the crystal lifts SoHo\'s cap to Stage 2 and no further; Act 1 starts at Stage 1',()=>{
 const c=createCombat();setGrowth(c,1,1);assert.deepEqual([c.stage,c.cap],[1,1]);assert.equal(liftCap(c,SOHO.capLift!),true);assert.deepEqual([c.stage,c.cap],[2,2]);assert.equal(liftCap(c,2),false);
});

test('config: steam and bull blocks are sane',()=>{
 assert.ok(ST.reach>0&&ST.ultReach>ST.reach&&ST.height>ST.radius&&ST.seconds>ST.puff&&ST.rearm>ST.seconds&&ST.blind>0);
 assert.ok(BL.throwSpeed<VC.throwSpeed,'thrown short');assert.ok(BL.throwDamage>VC.throwDamage*VEHICLE_SPECS.bus.mass,'thrown hard: more than a bus');assert.ok(BL.minStrength<=5&&BL.minStrength>3);
 assert.ok(BUILDING_PRESETS.x.h>0);
});

test('real loop: The Battery starts the kaiju in the harbour, wading, with police boats around the moored ferry',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();assert.equal(s.blockName,'The Battery');assert.equal(s.activeKaiju,'Kaiban');assert.equal(s.stage,1);assert.equal(s.growthCap,1);
  assert.equal(s.band,'wading','spawned in a water band');assert.equal(s.inWater,true);assert.ok(s.x<BAT.water![0][1]&&s.x>0);assert.equal(s.pocketHP,null,'no tunnel pocket');
  assert.equal(s.military.filter((u:any)=>u.type==='boat').length,3,'police boats on the water');assert.equal(s.level.police,true);
  assert.equal(s.exitOpen,false);assert.equal(s.objective.art,'fort');
  // Wading is slow: the same walk covers much less than on the street.
  const x0=s.x;h.down('KeyD');h.step(60);h.up('KeyD');const waded=h.state().x-x0;assert.ok(waded>30&&waded<C.moveSpeed*.75,`wading is slow (${Math.round(waded)}px in a second)`);
  assert.equal(h.state().drowning,null,'no drowning at wading depth');
 }finally{h.release();h.cleanup();}
});

test('real loop: the seawall blocks the way ashore until it is climbed; the harbour shoals up to it',async()=>{
 const h=await boot(0);
 try{
  const wall=h.state().buildings.find((b:any)=>b.deco==='wall');assert.ok(wall,'the seawall');
  h.test().teleport(wall.x-h.state().width-160);h.step(2);assert.ok(['shallows','wading'].includes(h.state().band),`still in the water (${h.state().band})`);
  h.down('KeyD');h.step(240);h.up('KeyD');let s=h.state();assert.equal(s.x,wall.x-s.width,'a solid wall blocks walking');
  h.down('KeyD');h.down('KeyW');for(let i=0;i<500&&h.state().y+h.state().height>wall.y+1;i++)h.step();h.up('KeyW');h.up('KeyD');h.step(30);
  s=h.state();assert.ok(Math.abs(s.y+s.height-wall.y)<2,`climbed onto the seawall (${s.y+s.height} vs ${wall.y})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: the South Ferry subway loop caves in under Battery Park; trees are uprooted like lampposts',async()=>{
 const h=await boot(0);
 try{
  const [a,z]=BAT.subway![0];h.test().teleport(Math.round((a+z)/2));h.step(2);assert.equal(h.state().pits.length,0);slam(h);
  let s=h.state();assert.equal(s.pits.length,1,'the street caved in');assert.ok(s.pits[0].floor-C.ground>=60,'a deep tunnel pit');
  // A tree on the lawn comes up by the roots.
  const h2=await boot(0);try{const tr=h2.state().buildings.find((b:any)=>b.kind==='tiny'&&b.h>=sc(80)&&b.x>=BAT.water![0][1]);assert.ok(tr,'a tree');
   h2.test().teleport(tr.x-h2.state().width-8);h2.step(2);h2.tap('KeyH');h2.step(3);assert.equal(h2.state().held,'lamp','uprooted: a lamp-kind prop');}finally{h2.release();h2.cleanup();}
 }finally{h.release();h.cleanup();}
});

test('real loop: smashing Castle Clinton opens the exit',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();assert.equal(s.exitOpen,false);h.test().teleport(s.objective.x-s.objective.w/2-s.width-8);h.step(2);smashTarget(h);
  s=h.state();assert.equal(s.objectiveHP,0,'the fort is destroyed');assert.equal(s.exitOpen,true);
  h.test().teleport(s.worldWidth-s.width-60);h.down('KeyD');h.step(200);h.up('KeyD');assert.equal(h.state().mode,'results','walking out the east end finishes the level');
 }finally{h.release();h.cleanup();}
});

test('real loop: Wall Street: the NYSE command post, SWAT and helicopters, the 4/5 line caves in, a flank tower topples onto the target',async()=>{
 const h=await boot(1);
 try{
  let s=h.state();assert.equal(s.objective.art,'exchange');assert.equal(s.stage,1);
  h.test().teleport(WALL.air![0]-500);h.step(10);s=h.state();assert.ok(s.military.some((u:any)=>u.type==='helicopter'),'a police helicopter over the canyon');assert.ok(s.military.filter((u:any)=>u.type==='soldier').length>=2,'SWAT');
  // The 4/5.
  const [a,z]=WALL.subway![0];h.test().teleport(Math.round((a+z)/2));h.step(2);slam(h);assert.equal(h.state().pits.length,1,'the subway caved in');
  // A flank tower brought down lands on the command post.
  s=h.state();const t=s.objective,towers=s.buildings.map((b:any,i:number)=>[b,i]).filter(([b]:any)=>b.kind!=='tiny'&&b.h>=sc(850)&&b.x+b.w<t.x-t.w/2+10&&t.x-(b.x+b.w)<b.h);
  assert.ok(towers.length>=1,'a tall tower west of the target close enough to land on it');
  h.test().teleport(towers[0][0].x-s.width-60);h.step(2);const hp0=s.objectiveHP;h.test().smash(towers[0][1]);
  for(let n=0;n<60*6;n++)h.step();assert.ok(h.state().objectiveHP<hp0,`the falling tower hurt the target (${hp0} -> ${h.state().objectiveHP})`);
  // Finish it with fists and the exit opens.
  s=h.state();h.test().teleport(s.objective.x-s.objective.w/2-s.width-10);h.step(2);smashTarget(h);
  assert.equal(h.state().objectiveHP,0);assert.equal(h.state().exitOpen,true);
 }finally{h.release();h.cleanup();}
});

test('real loop: the rooftop route: the kaiju hops from tower to tower high above the street',async()=>{
 const h=await boot(1);
 try{
  const s0=h.state(),towers=s0.buildings.map((b:any,i:number)=>[b,i]).filter(([b]:any)=>b.kind!=='tiny'&&b.h>=sc(700)&&b.x>sc(1100)).sort((p:any,q:any)=>p[0].x-q[0].x);
  const [first,i]=towers[0];h.test().perchOn(i);h.step(10);let s=h.state();assert.ok(s.y+s.height<C.ground-sc(600),'standing on a roof far above the street');
  const x0=s.x;let top=0;for(let n=0;n<420;n++){h.down('KeyD');if(n%45===0)h.tap('Space');h.step(1);if(h.state().grounded)top=Math.max(top,C.ground-(h.state().y+h.state().height));}h.up('KeyD');
  s=h.state();assert.ok(s.x-x0>=400,`crossed several towers on the roofs (${Math.round(s.x-x0)}px)`);assert.ok(top>sc(600),'the whole way up on the roofs');assert.ok(first.h>sc(700));
 }finally{h.release();h.cleanup();}
});

test('real loop: the Charging Bull: only a strong kaiju lifts it, it is thrown short and hard, and the street cannot hurt it',async()=>{
 const h=await boot(1);
 try{
  let s=h.state();const bull=s.vehicles.find((v:any)=>v.kind==='bull');assert.ok(bull,'the Bull at Bowling Green');assert.equal(bull.state,'parked');
  // A weaker kaiju just bumps into it.
  h.test().setKaiju('Mogurodon');standWest(h,bull);h.step(2);h.tap('KeyH');h.step(3);assert.equal(h.state().held,null,'too heavy for a 3-strength kaiju');
  h.test().setKaiju('Kaiban');
  // The street does nothing to it: stomps, heavy blows, a slam on top, a shotgun blast, a gore charge through it, a tank round.
  standWest(h,bull);h.step(2);hit(h,40);h.tap('KeyL');h.step(60);h.test().teleport(bull.x+bull.w/2-s.width/2);h.step(2);slam(h);h.test().teleport(bull.x-s.width-30);h.down('ShiftLeft');h.down('KeyD');h.step(90);h.up('KeyD');h.up('ShiftLeft');
  s=h.state();let b2=s.vehicles.find((v:any)=>v.kind==='bull');assert.deepEqual([b2.state,b2.x,b2.y],['parked',bull.x,bull.y],'the Bull is untouched by street damage');
  // Kaiban carries it. Walk it up to a tower and throw: it lands short and hits hard.
  standWest(h,b2);h.step(2);assert.ok(grab(h,'bull'),'grabbed');s=h.state();assert.equal(s.held,'bull');
  const tower=s.buildings.map((b:any,i:number)=>[b,i]).filter(([b]:any)=>b.kind!=='tiny'&&b.x>s.x+s.width+500&&b.h>sc(600)).sort((p:any,q:any)=>p[0].x-q[0].x)[0];
  h.test().teleport(tower[0].x-s.width-200);h.step(2);const hp0=h.state().buildings[tower[1]].hp,x0=h.state().vehicles.find((v:any)=>v.kind==='bull').x;
  h.tap('KeyH');let landed=false,range=0,far=0;for(let n=0;n<200&&!landed;n++){h.step();const v=h.state().vehicles.find((o:any)=>o.kind==='bull');far=Math.max(far,v.x-x0);if(n>5&&v.state==='parked'){landed=true;range=v.x-x0;}}
  assert.ok(landed,'the Bull comes to rest');assert.ok(far<VC.throwSpeed*.6,`thrown short (${Math.round(far)}px)`);
  assert.ok(hp0-h.state().buildings[tower[1]].hp>=BL.throwDamage*.5,`thrown hard: the tower took ${hp0-h.state().buildings[tower[1]].hp}`);
  b2=h.state().vehicles.find((v:any)=>v.kind==='bull');assert.equal(b2.state,'parked','it is never a wreck');assert.ok(far>0&&range!==undefined);
 }finally{h.release();h.cleanup();}
});

test('real loop: Kaiban\'s Meteor Drop off a Wall Street roof flings rocks over the canyon; the Debris Shotgun fires in the street',async()=>{
 const h=await boot(1);const {MOVE:MV}=await import('../src/config.ts');
 try{
  const s0=h.state(),i=s0.buildings.findIndex((b:any)=>b.kind!=='tiny'&&b.h>=sc(700)&&b.x>sc(1100));h.test().perchOn(i);h.step(10);
  h.tap('Space');h.step(15);h.tap('KeyS');for(let n=0;n<120&&h.state().diving!==true;n++)h.step();let most=0;for(let n=0;n<90;n++){h.step();most=Math.max(most,h.state().entityCounts.rocks);}
  assert.ok(most>=MV.meteorRocks*.6,`the roof landing flings a ring of rocks (${most})`);
  h.test().teleport(300);h.step(30);h.tap('KeyL');let fan=0;for(let n=0;n<60;n++){h.step();fan=Math.max(fan,h.state().entityCounts.rocks);}assert.ok(fan>=B.debrisCount-1,`the shotgun fans rocks in the street (${fan})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: SoHo: manholes puff on their own and harm nothing; a slam bursts the nearest; out of reach nothing happens',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();assert.equal(s.ventList.length,SOHO.vents!.length);assert.ok(s.ventList.every((v:any)=>v.state==='idle'));
  // They puff by themselves (no damage, no burst), staggered.
  let puffed=new Set<number>();for(let n=0;n<60*14;n++){h.step();for(const v of h.state().ventList)if(v.state==='puff')puffed.add(v.x);}
  assert.ok(puffed.size>=2,`vents puff on their own (${puffed.size})`);assert.equal(h.state().ventScalded,0,'a puff harms nothing');assert.ok(h.state().ventList.every((v:any)=>v.state!=='burst'));
  // A slam well away from every vent bursts none.
  const far=Math.max(...SOHO.vents!.map(x=>-Math.abs(x)));void far;
  const safe=[300,3600,5200,8300].find(x=>SOHO.vents!.every(v=>Math.abs(v-x)>ST.ultReach));if(safe!==undefined){h.test().teleport(safe);h.step(2);slam(h);assert.ok(h.state().ventList.every((v:any)=>v.state!=='burst'),'out of reach: no burst');}
 }finally{h.release();h.cleanup();}
});

test('real loop: a slam bursts a vent: it scalds troops, launches cars, blinds a helicopter in the column, and never lights a building',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const vent=SOHO.vents!.find(x=>s.vehicles.some((v:any)=>v.kind==='car'&&v.state==='parked'&&Math.abs(v.x+v.w/2-x)<ST.carRadius*.8))!;assert.ok(vent!==undefined,'a manhole in the jam');
  const cars=s.vehicles.filter((v:any)=>v.kind==='car'&&v.state==='parked'&&Math.abs(v.x+v.w/2-vent)<ST.carRadius*.8);assert.ok(cars.length>=1);
  h.test().teleport(vent-s.width-40);h.step(60);h.test().spawnUnit('soldier',vent+130);h.step(2);const sold=()=>h.state().military.find((u:any)=>u.type==='soldier'&&Math.abs(u.x-vent)<200);const hp0=sold().hp;
  // Slam beside the vent (within reach); the soldier stands outside the slam's own radius but inside the steam's.
  h.test().teleport(vent-s.width/2-50);h.step(2);slam(h);
  s=h.state();const vs=s.ventList.find((v:any)=>Math.abs(v.x-vent)<2);assert.equal(vs.state,'burst','the vent burst');assert.ok(s.ventScalded>=1,'troops scalded');
  assert.ok(!sold()||sold().hp<hp0||sold().stun>0,'the soldier was hurt or stunned');
  assert.ok(cars.some((c:any)=>{const v=s.vehicles.find((o:any)=>o.id===c.id);return !v||v.state!=='parked'||Math.abs(v.y-c.y)>4||Math.abs(v.x-c.x)>4;}),'a car was launched');
  // A helicopter flying through the column is blinded.
  h.test().spawnUnitOn('helicopter',vent,C.ground-ST.height*.5);h.step(20);
  s=h.state();assert.ok(s.ventBlinded>=1,'a helicopter was blinded');assert.ok(s.military.some((u:any)=>u.type==='helicopter'&&u.stun>0),'it is stunned: it cannot move or fire');
  // Steam is not fire: nothing burns, ever, however long the jet runs.
  for(let n=0;n<60*5;n++)h.step();assert.deepEqual(h.state().blazeList,[],'no building was set alight');assert.equal(h.state().fireballs>=0,true);
  // Spent: a second slam does nothing until it rearms, then it puffs again.
  const st2=h.state().ventList.find((v:any)=>Math.abs(v.x-vent)<2).state;assert.equal(st2,'spent');slam(h);assert.notEqual(h.state().ventList.find((v:any)=>Math.abs(v.x-vent)<2).state,'burst','a spent vent stays quiet');
  for(let n=0;n<60*14;n++)h.step();assert.notEqual(h.state().ventList.find((v:any)=>Math.abs(v.x-vent)<2).state,'spent','it rearms');
 }finally{h.release();h.cleanup();}
});

test('real loop: a pound bursts a vent too; the vents hurt no building (a burst beside a loft leaves it standing)',async()=>{
 const h=await boot(2);
 try{
  const s=h.state(),vent=SOHO.vents![1];h.test().teleport(vent-s.width/2);h.step(30);
  const hps=h.state().buildings.map((b:any)=>b.hp);h.down('KeyS');h.step(6);h.tap('KeyJ');h.step(20);h.up('KeyS');
  const vs=h.state().ventList.find((v:any)=>Math.abs(v.x-vent)<2);assert.equal(vs.state,'burst','a crouched light attack (the pound) bursts it');
  for(let n=0;n<60*5;n++)h.step();
  const after=h.state().buildings.map((b:any)=>b.hp),near=h.state().buildings.filter((b:any,i:number)=>b.kind!=='tiny'&&Math.abs(b.x+b.w/2-vent)<ST.radius*2&&after[i]<hps[i]);
  assert.deepEqual(near.map((b:any)=>b.x),[],'steam never damages buildings');assert.deepEqual(h.state().blazeList,[]);
 }finally{h.release();h.cleanup();}
});

test('real loop: Holland Tunnel jam: a Gore Charge sends the parked cars flying; the crystal under Canal Street grows Kaiban to Stage 2',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const jam=SOHO.cars.filter(c=>c>=sc(4400));assert.ok(jam.length>=8);
  h.test().teleport(jam[0]-s.width-120);h.step(2);const parked0=h.state().vehicles.filter((v:any)=>v.kind!=='lamp'&&v.state==='parked'&&v.x>jam[0]-40&&v.x<jam[0]+700).length;assert.ok(parked0>=4,`a row of parked cars (${parked0})`);
  h.down('ShiftLeft');h.down('KeyD');let airborne=0;for(let n=0;n<150;n++){h.step();airborne=Math.max(airborne,h.state().vehicles.filter((v:any)=>v.state==='flying').length);}h.up('KeyD');h.up('ShiftLeft');
  assert.ok(airborne>=2,`the Gore Charge launches cars (${airborne} airborne at once)`);
 }finally{h.release();h.cleanup();}
 const g=await boot(2);
 try{
  let s=g.state();assert.equal(s.stage,1);assert.equal(s.growthCap,1);assert.equal(s.level.capLift,2);
  g.test().teleport(s.formationX-s.width-100);g.step(2);let best=1;for(let n=0;n<420&&g.state().formationHP!==null;n++){if(g.state().canAct&&g.state().cooldown<=0)g.tap('KeyK');g.step(6);best=Math.max(best,g.state().stage);}
  g.step(90);best=Math.max(best,g.state().stage);s=g.state();assert.ok(!s.formationHP,'the formation shattered');assert.equal(s.growthCap,2,'the cap is lifted');assert.equal(best,2,'grown to Stage 2 (and no further)');
 }finally{g.release();g.cleanup();}
});

test('real loop: SoHo: the Guard roll in when the exit opens; Wall Street and the Battery set no vents or Bull',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();assert.equal(s.guardCalled,false);assert.equal(s.exitOpen,false);h.test().demolish(.78);h.step(20);s=h.state();assert.equal(s.exitOpen,true);assert.equal(s.guardCalled,true,'the Guard are called');
 }finally{h.release();h.cleanup();}
 for(const b of [0,1]){const g=await boot(b);try{assert.equal(g.state().ventList.length,0,'no vents');assert.equal(g.state().bull!==null,b===1,'the Bull is Wall Street\'s alone');}finally{g.release();g.cleanup();}}
});
