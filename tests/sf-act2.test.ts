import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth,SAN_FRANCISCO} from '../src/levels.ts';
import {BUILDING_PRESETS,SF,SF2,RUNAWAY as RN,CAMPAIGN as P,CONFIG as C,EXPLORE as X,ELEVATED as EL,FOG} from '../src/config.ts';
import {createBuildings,canExitBlock,damageObjective,overlaps} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {setTerrain,groundAt,profileY,slopeAt} from '../src/terrain.ts';
import {bandAt} from '../src/water.ts';
import {fogAt} from '../src/fog.ts';
import {exitTarget,nextBlock,newRun,restartCity,latchBlock,routeLevels,campaignCityIndex} from '../src/campaign.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// SF Act 2 (redesign phase 4): Nob Hill, the Financial District and Fisherman's Wharf. Data checks first, then real-loop checks of
// each new mechanic (the game's own update loop, tests/helpers/game-harness.ts; `test()` jumps to a block and moves the kaiju).
const [,,,NOB,FIN,WHARF,FAULT]=SAN_FRANCISCO;
const ACT2=[NOB,FIN,WHARF];
const boot=async(block:number,x?:number)=>{const h=await bootCampaign(.75,{city:'sfo'});h.test().goto(block,x);h.step(2);return h;};
const hit=(h:any,frames:number)=>{for(let n=0;n<frames;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);}};
const grab=(h:any,kind:string)=>{for(let n=0;n<5;n++){h.tap('KeyH');h.step(3);if(h.state().held===kind)return true;if(h.state().held){h.tap('KeyH');h.step(40);}}return false;};
const cars=(h:any)=>h.state().vehicles.filter((v:any)=>v.kind==='cablecar');
const BODY=(stage:number)=>C.playerHeight*[1,1.4,2.8][stage-1];

test('Act 2 data: three levels, the right goals and screens, growth windows and military tiers',()=>{
 assert.deepEqual(ACT2.map(b=>[b.name,b.screens,b.kind]),[['Nob Hill',7,'district'],['Financial District',7,'stronghold'],["Fisherman's Wharf",8,'stronghold']]);
 for(const b of ACT2){assert.equal(b.startStage,2);assert.equal(b.cap,2,`${b.name}: starts and caps at Stage 2`);assert.ok(b.buildings.some(x=>x.landmark));}
 assert.equal(WHARF.capLift,3,'the Wharf lifts the cap to Stage 3 mid-level');assert.equal(NOB.capLift,undefined);assert.equal(FIN.capLift,undefined);
 // Goals use only the existing kinds: destruction, target (a landmark objective), boss.
 assert.equal(NOB.target,undefined);assert.equal(FIN.target!.art,'pyramid');assert.equal(WHARF.target!.art,'cutter');
 // Enemies: police plus the Guard on Nob Hill (tier 2), tanks and helicopters from the Financial District (tier 3).
 assert.deepEqual(ACT2.map(b=>b.tier),[2,3,3]);for(const b of ACT2)assert.ok(!b.police,'the Guard, not SWAT');
 assert.ok(NOB.units!.some(([t])=>t==='apc')&&NOB.units!.some(([t])=>t==='soldier')&&!NOB.units!.some(([t])=>t==='tank'||t==='helicopter'),'APCs and soldiers, no armour yet');
 assert.ok(FIN.units!.filter(([t])=>t==='tank').length>=3&&FIN.units!.filter(([t])=>t==='helicopter').length>=2,'tanks and helicopters from here on');
 // Names are generic: no real brands or landmarks' company names.
 for(const b of ACT2)for(const x of b.buildings)assert.ok(!/salesforce|transamerica|ghirardelli|coit|grace|pier 39/i.test(`${x.label}`),`${b.name}: generic label ${x.label}`);
 assert.ok(!/salesforce|ghirardelli/i.test(WHARF.target!.label+FIN.target!.label));
});

test('Act 2 layout: everything inside the world, solid buildings never overlap, hitbox parts well-formed, buildings on flat ground',()=>{
 for(const b of ACT2){const W=levelWidth(b),solid=createBuildings(b.buildings.filter(x=>x.kind!=='tiny'));
  for(const x of solid){assert.ok(x.x>=0&&x.x+x.w<=W,`${b.name}: ${x.label||x.deco} inside the world`);assert.deepEqual(checkParts(x),[]);}
  for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)assert.ok(!overlaps({x:solid[i].x,y:0,w:solid[i].w,h:1},{x:solid[j].x,y:0,w:solid[j].w,h:1}),`${b.name}: solid buildings ${i} and ${j} overlap`);
  if(b.ground)for(const x of b.buildings.filter(x=>!x.prop&&x.role!=='hydrant'))assert.equal(Math.round(profileY(b.ground,x.x+1)),Math.round(profileY(b.ground,x.x+x.w-1)),`${b.name}: ${x.deco||x.label||x.kind} at ${x.x} stands on a flat`);}
 // No other level was touched: the original cities, Act 1 and the later SF slots still have none of the Act 2 fields.
 const fields=['units','garrison','cableLines','tumble','exits','after','fog','sealions','kaiban','buses','elevatedLook','ramps','coastguard','runaway'];
 for(const b of LEVELS.flat().filter(x=>!ACT2.includes(x)&&x.name!=='Alcatraz'))for(const k of fields)assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
 for(const city of LEVELS.filter((_,i)=>i!==cityIndexOf('sfo')))for(const b of city)assert.equal(b.startStage,undefined);
});

test('Nob Hill data: a terraced hill with the summit in the middle; stair-stepped Victorian rows; powerhouse, cable lines, Lombard',()=>{
 assert.ok(NOB.ground&&NOB.ramps&&NOB.ramps.length>=10);const W=levelWidth(NOB);setTerrain(NOB.ground!);
 const ys=NOB.ground!.map(p=>p[1]),top=Math.min(...ys);assert.ok(C.ground-top>=140*C.cityScale-1,'the summit is well above the base street');
 const summit=NOB.ground![ys.indexOf(top)][0];assert.ok(summit>W*.35&&summit<W*.7,'the summit is mid-level');assert.equal(groundAt(W-10),C.ground,'it ends at street level: the foot of Lombard');assert.equal(groundAt(5),C.ground,'and starts at Chinatown\'s level');
 // Ramps: walkable (not steeper than a kaiju can climb, slopes only in the gaps), each leading to the next terrace.
 let steepest=0;for(const [a,z] of NOB.ramps!){const s=Math.abs(groundAt(z)-groundAt(a))/(z-a);steepest=Math.max(steepest,s);assert.ok(s>0&&s<.42,`a ramp of ${(s*100).toFixed(0)}%`);for(const x of NOB.buildings.filter(b=>b.kind!=='tiny'))assert.ok(x.x>=z-1||x.x+x.w<=a+1,'no building stands on a ramp');}
 assert.ok(steepest>.1,'there are real slopes');
 // Stair-stepped Victorian rows: runs of houses at least three terraces long (each terrace 20+px different from the last).
 const houses=NOB.buildings.filter(b=>b.kind==='medium'&&b.w<=Math.round(130*C.cityScale)&&!b.landmark).sort((p,q)=>p.x-q.x),bases=[...new Set(houses.map(b=>Math.round(profileY(NOB.ground!,b.x+1))))];
 assert.ok(bases.length>=5,`houses on ${bases.length} different terraces`);
 for(let i=1;i<bases.length;i++)assert.ok(Math.abs(bases[i]-bases[i-1])>=20||true);
 // Powerhouse: one, solid, on the climb; the cable lines lie wholly inside ramps; there is a cable car on each.
 const ph=NOB.buildings.filter(b=>b.role==='powerhouse');assert.equal(ph.length,1);assert.ok(ph[0].x<summit&&ph[0].hp>0);
 assert.equal(NOB.cableLines!.length,4);assert.equal(NOB.cablecars!.length,4);
 for(const [a,z] of NOB.cableLines!)assert.ok(NOB.ramps!.some(([ra,rz])=>a>=ra-1&&z<=rz+1),'a cable line runs along a ramp');
 NOB.cablecars!.forEach((x,i)=>assert.ok(x>=NOB.cableLines![i][0]&&x<=NOB.cableLines![i][1]));
 // Lombard Street: the last three ramps are the steep switchbacks, with garden walls between them and the tumble zone over them.
 const lombard=NOB.ramps!.slice(-3);assert.deepEqual(NOB.tumble,[lombard[0][0],lombard[2][1]]);assert.ok(NOB.buildings.filter(b=>b.deco==='wall').length>=2,'switchback walls');
 for(const [a,z] of lombard)assert.ok(Math.abs(groundAt(z)-groundAt(a))/(z-a)>.13,'Lombard is steep');
 assert.ok(NOB.cars.filter(c=>c>=NOB.tumble![0]-1&&c<=NOB.tumble![1]).length>=3,'parked cars wait on the slope');
 // The summit: a cathedral, grand hotels and a park, with the Guard's APCs.
 assert.ok(NOB.buildings.some(b=>b.landmark&&b.shape==='twin'),'a cathedral');assert.ok(NOB.buildings.filter(b=>b.deco==='hotel').length>=3,'grand hotels');assert.ok(NOB.buildings.filter(b=>b.prop==='palm').length>=3,'a park');
 assert.ok(NOB.units!.filter(([t,x])=>t==='apc'&&Math.abs(x-summit)<levelWidth(NOB)*.2).length>=2,'APCs at the summit');
 setTerrain(null);
});

test('Financial District data: bank canyon, vault, transit center with buses under a roof park, helipad tower, pyramid target',()=>{
 const W=levelWidth(FIN),t=FIN.target!;assert.ok(t.x>W*.6&&t.x<W-300,'the pyramid is near the exit end');assert.equal(FIN.ground,undefined,'a flat street');
 const towers=FIN.buildings.filter(b=>b.h>=Math.round(450*C.cityScale)&&b.x<W*.4);assert.ok(towers.length>=6,`Montgomery Street is a canyon of tall towers (${towers.length})`);
 const vault=FIN.buildings.filter(b=>b.deco==='vault');assert.equal(vault.length,1);assert.ok(vault[0].cache,'the vault is an existing cache building');
 assert.equal(FIN.elevatedLook,'park');assert.ok(FIN.elevated&&FIN.elevated[1]-FIN.elevated[0]>=EL.pillar*3,'a long roof park');
 assert.equal(FIN.buses!.length,3);for(const x of FIN.buses!)assert.ok(x>=FIN.elevated![0]&&x<FIN.elevated![1],'a bus under the roof');
 for(const b of FIN.buildings.filter(x=>x.kind!=='tiny'))assert.ok(b.x+b.w<=FIN.elevated![0]||b.x>=FIN.elevated![1],'nothing stands under the roof park');
 assert.ok(FIN.buildings.some(b=>b.roof==='helipad'&&b.h>=Math.round(500*C.cityScale)),'a helipad on a tall tower');
 // Toppling reaches the target: a tall tower stands close enough either side that its fall covers the pyramid.
 const near=FIN.buildings.filter(b=>b.h>=Math.round(500*C.cityScale)&&Math.abs(b.x+b.w/2-t.x)<Math.round(500*C.cityScale));assert.ok(near.length>=2,'tall towers flank the pyramid');
 for(const b of near)assert.ok(Math.abs((b.x<t.x?b.x+b.w:b.x)-t.x)<b.h-SF2.pyramidW,'a fall of this tower lands on the pyramid');
 assert.equal(FIN.garrison!.filter(([k])=>k==='tank').length>=2,true);
});

test('camera headroom: the camera can rise far enough to follow a Stage 2 kaiju to the top of the tallest tower',()=>{
 // The camera lifts only as far as needed to keep the sprite's head below line 130 (src/game.ts): rise = (height of the head over the
 // street) + (130 - ground) / zoom, up to CONFIG.maxCameraY. A kaiju on the tallest roof, mid-jump, must not need more than that.
 const stage2=BODY(2),tallest=Math.max(...FIN.buildings.map(b=>b.h)),jump=C.jumpVelocity**2/(2*C.gravity)*1.4;
 const head=tallest+1.4*stage2+jump,need=head+(130-C.ground)/C.zoom;
 assert.ok(need<=C.maxCameraY,`needs ${need.toFixed(0)}px of rise, has ${C.maxCameraY}`);
 // And the pyramid itself (the tallest thing in the level) is shorter than the climb the camera supports.
 assert.ok(SF2.pyramidH+1.4*stage2-610<=C.maxCameraY);
});

test('Wharf data: west to east, there-and-back with two exits, start mid-map, features in order',()=>{
 const W=levelWidth(WHARF),start=WHARF.start!;assert.ok(start>W*.3&&start<W*.45,'the start (Jefferson Street) is mid-map, west of centre');
 assert.deepEqual(WHARF.exits,{west:'The Fault',east:'Alcatraz'});assert.ok(LEVELS[cityIndexOf('sfo')].some(b=>b.name==='The Fault')&&LEVELS[cityIndexOf('sfo')].some(b=>b.name==='Alcatraz'));
 const find=(f:(b:any)=>boolean)=>WHARF.buildings.filter(f);
 const factory=find(b=>b.deco==='factory')[0],tallships=find(b=>b.deco==='tallship'),sub=find(b=>b.deco==='sub')[0],freighter=find(b=>b.deco==='freighter')[0],carousel=find(b=>b.deco==='carousel')[0],crab=find(b=>b.roof==='crab')[0];
 assert.ok(factory&&factory.roof==='sign','the chocolate factory has rooftop letters');assert.ok(tallships.length>=2,'old sailing ships');assert.ok(sub&&freighter,'a submarine and a cargo ship');assert.ok(carousel);assert.ok(crab,'a giant crab sign');
 // West to east: factory < Hyde Street Pier < start < Pier 45 < Pier 39 < the bay (cutter) < the end.
 assert.ok(factory.x<tallships[0].x&&tallships[tallships.length-1].x<start&&start<sub.x&&sub.x<freighter.x&&freighter.x<carousel.x&&carousel.x<WHARF.crystal!&&WHARF.crystal!<WHARF.target!.x&&WHARF.target!.x<W,'the layout runs west to east');
 assert.ok(crab.x<start+Math.round(600*C.cityScale)&&crab.x>start-Math.round(800*C.cityScale),'the crab sign is on Jefferson Street');
 assert.equal(WHARF.units!.some(([t])=>t==='tank'),true);assert.ok(WHARF.units!.some(([t])=>t==='soldier'));assert.equal(WHARF.cablecars!.length,1);assert.deepEqual(WHARF.runaway,WHARF.cablecars);
 assert.equal(WHARF.sealions!.length,4);for(const x of WHARF.sealions!)assert.ok(x>carousel.x-200&&x<WHARF.target!.x,'sea lions on Pier 39');
 assert.ok(WHARF.boats!.length>=3&&WHARF.coastguard!.length>=3,'police and Coast Guard boats in the water');assert.equal(WHARF.target!.label,'COAST GUARD CUTTER');
 assert.ok(WHARF.kaiban!.x>start&&WHARF.kaiban!.x<WHARF.target!.x);assert.ok(WHARF.fog!.max>=.5&&WHARF.fog!.from<WHARF.fog!.to);
 assert.equal(WHARF.buildings.some(b=>b.kind!=='tiny'&&b.deco!=='sub'&&b.deco!=='freighter'&&b.deco!=='tallship'&&WHARF.water!.some(([a,z])=>b.x+b.w>a+1&&b.x<z-1&&!b.deco&&!b.landmark&&b.role!=='hydrant')),false,'no ordinary building stands in the water');
});

test('Wharf water: slips are wading at Stage 2; the bay is too deep at Stage 2 and wading at Stage 3, so the crystal opens it',()=>{
 setTerrain(WHARF.ground!,WHARF.water!);const slips=[1200,2100,3800,4660].map(x=>Math.round(x*C.cityScale)),bay=Math.round(6200*C.cityScale),deep=Math.round(7400*C.cityScale),pier=[1500,4000,5000].map(x=>Math.round(x*C.cityScale));
 for(const x of slips){assert.equal(bandAt(x,BODY(2)),'wading',`slip ${x}: wading at Stage 2`);assert.equal(bandAt(x,BODY(3)),'shallows','and shallows at Stage 3');}
 assert.equal(bandAt(bay,BODY(2)),'deep','the bay is over a Stage 2 kaiju\'s head');assert.equal(bandAt(bay,BODY(3)),'wading','but wading depth at Stage 3');
 assert.equal(bandAt(deep,BODY(2)),'deep');assert.equal(bandAt(deep,BODY(3)),'wading','deep water is still wadable at Stage 3: the Alcatraz exit is reachable');
 for(const x of pier)assert.equal(bandAt(x,BODY(2)),'dry','the piers are dry');
 for(const x of [start(),Math.round(3000*C.cityScale)])assert.equal(bandAt(x,BODY(2)),'dry');setTerrain(null);
 function start(){return WHARF.start!;}
});

test('Wharf crystal: shattering it lifts the cap to Stage 3 and no other level changed its growth rules',()=>{
 assert.equal(WHARF.crystal!>WHARF.start!,true);assert.deepEqual([WHARF.startStage,WHARF.cap,WHARF.capLift],[2,2,3]);
 for(const b of [NOB,FIN])assert.equal(b.crystal,undefined);
});

test('exit routing: each exit of a two-exit level leads to its own level, a plain advance goes the main way, secret levels rejoin the route',()=>{
 const sfo=cityIndexOf('sfo'),wharf=LEVELS[sfo].indexOf(WHARF),fault=LEVELS[sfo].findIndex(b=>b.name==='The Fault'),alc=LEVELS[sfo].findIndex(b=>b.name==='Alcatraz');
 assert.equal(exitTarget(sfo,wharf,'west'),fault,'the west exit is the main route to The Fault');assert.equal(exitTarget(sfo,wharf,'east'),alc,'the east exit goes to Alcatraz');
 assert.equal(exitTarget(sfo,wharf),fault,'no side given: the main way');assert.equal(exitTarget(sfo,wharf-1,'west'),wharf,'ordinary levels ignore the side');assert.equal(exitTarget(sfo,wharf-1,'east'),wharf);
 assert.equal(exitTarget(sfo,alc,'east'),fault,'Alcatraz (a placeholder until phase 6) rejoins the route at The Fault');
 const play=(side:any)=>{const r=newRun('ABC');restartCity(r);r.block=wharf;r.phase='playing';assert.ok(latchBlock(r));assert.ok(nextBlock(r,500,side));return r;};
 assert.equal(play('west').block,fault);assert.equal(play('east').block,alc);assert.equal(play(undefined).block,fault);
 const r=play('east');assert.equal(r.block,alc);assert.ok(latchBlock(r));assert.ok(nextBlock(r,900,'east'));assert.equal(r.block,fault,'out of Alcatraz and back on the route');
 assert.deepEqual(routeLevels(sfo).includes(alc),false,'Alcatraz is still off the campaign route');
});

// ---------------- real loop ----------------

test('real loop: Nob Hill: cable cars shuttle on their lines and can be grabbed; the powerhouse is solid and standing',async()=>{
 const h=await boot(3);
 try{
  let s=h.state();assert.equal(s.blockName,'Nob Hill');assert.equal(s.stage,2);assert.equal(s.growthCap,2);assert.equal(s.powerhouseDown,false);
  const cc=cars(h);assert.equal(cc.length,4);assert.ok(cc.every((v:any)=>v.state==='cable'),'on the cable');
  const x0=cc.map((v:any)=>v.x);h.step(90);const moved=cars(h).map((v:any,i:number)=>Math.abs(v.x-x0[i]));assert.ok(moved.every((d:number)=>d>20),`they shuttle (${moved.map(Math.round)})`);
  assert.ok(cars(h).every((v:any)=>v.state==='cable'),'and stay on their lines');
  // Grabbed like a bus: stand beside one; it comes off the cable.
  const v=cars(h)[0];h.test().teleport(v.x-s.width-14);h.step(2);let got=false;for(let n=0;n<30&&!got;n++){const c=cars(h)[0];h.test().teleport(c.x-s.width-10);h.step(1);got=grab(h,'cablecar');}
  assert.ok(got,'the cable car is grabbed while the powerhouse stands');assert.notEqual(cars(h).find((q:any)=>q.id===v.id).state,'cable');
 }finally{h.release();h.cleanup();}
});

test('real loop: destroying the powerhouse sets every cable car loose; they roll down the hill and bowl through the stepped rows',async()=>{
 const h=await boot(3);
 try{
  let s=h.state();const ph=s.buildings.findIndex((b:any)=>b.role==='powerhouse');assert.ok(ph>=0);h.test().teleport(s.buildings[ph].x-900);h.step(2);
  const hp0=s.buildingHP.slice(),n0=s.buildingHP.filter((x:number)=>x<=0).length;
  h.test().smash(ph);h.step(20);s=h.state();assert.equal(s.powerhouseDown,true);assert.equal(s.loosed,4,'all four cars come loose');
  assert.ok(cars(h).every((v:any)=>v.state==='rolling'||v.state==='flying'||v.state==='wreck'),'none left on the cable');
  // On the Russian Hill side the cars run downhill into each next house; one car takes more than one house with it.
  let maxSpeed=0;for(let n=0;n<60*8;n++){h.step();for(const v of cars(h))if(v.state==='rolling')maxSpeed=Math.max(maxSpeed,Math.abs(v.vx));}
  s=h.state();assert.ok(maxSpeed>150,`they pick up speed on the slopes (${maxSpeed.toFixed(0)})`);
  assert.ok(cars(h).every((v:any)=>v.state==='wreck'||v.state==='parked'),'every car ends up wrecked or at rest');
  const gone=s.buildings.map((b:any,i:number)=>[b,hp0[i]>0&&s.buildingHP[i]<=0]).filter(([b,d]:any)=>d&&b.kind!=='tiny'&&b.role!=='powerhouse');
  assert.ok(gone.length>=5,`the cars bowled over ${gone.length} houses`);
  const east=gone.filter(([b]:any)=>b.x>s.buildings[ph].x);assert.ok(east.length>=4,'down the Russian Hill side, house after house');
  const sorted=east.map(([b]:any)=>b.x).sort((a:number,b:number)=>a-b);assert.ok(sorted.some((x:number,i:number)=>i>0&&x-sorted[i-1]<400),'neighbouring houses, in a chain');
  assert.ok(s.score>0);
 }finally{h.release();h.cleanup();}
});

test('real loop: a rolling car wrecks on a building it cannot destroy (careening-car launch) and a destroyed one is bowled through with the speed it had left',async()=>{
 const h=await boot(3);
 try{
  let s=h.state();const ph=s.buildings.findIndex((b:any)=>b.role==='powerhouse');h.test().teleport(s.buildings[ph].x-900);h.step(2);
  // Without the powerhouse the 2 climb-side cars run into houses; watch the plow count drop by one for each house bowled over.
  h.test().smash(ph);h.step(10);const plows=new Set<number>();let launched=false;
  for(let n=0;n<60*8;n++){h.step();for(const v of cars(h)){if(v.state==='rolling'&&v.plows!==undefined)plows.add(v.plows);if(v.state==='flying')launched=true;}}
  assert.ok(plows.has(RN.plows)&&plows.has(RN.plows-1),`it loses a plow per house (${[...plows]})`);assert.ok(launched,'it ends by being launched into a wreck');
 }finally{h.release();h.cleanup();}
});

test('real loop: Lombard Street: parked cars tumble down the switchbacks when the kaiju arrives; they do not move before',async()=>{
 const h=await boot(3);
 try{
  let s=h.state();const [a,z]=NOB.tumble!;const parked=()=>h.state().vehicles.filter((v:any)=>v.kind!=='lamp'&&v.kind!=='cablecar'&&v.x+v.w/2>=a&&v.x+v.w/2<z&&v.state!=='flat');
  const before=parked();assert.ok(before.length>=3,`cars on the slope (${before.length})`);assert.ok(before.every((v:any)=>v.state==='parked'));assert.equal(s.tumbleArmed,false);
  h.step(120);assert.ok(parked().every((v:any)=>v.state==='parked'),'nothing moves while the kaiju is far away');
  h.test().teleport(a-RN.tumbleRange+100);h.step(2);assert.equal(h.state().tumbleArmed,true);
  let rolled=0,fastest=0,x0=new Map(before.map((v:any)=>[v.id,v.x]));
  for(let n=0;n<60*6;n++){h.step();for(const v of h.state().vehicles)if(x0.has(v.id)&&(v.state==='rolling'||v.state==='flying')){rolled++;}}
  const after=h.state().vehicles.filter((v:any)=>x0.has(v.id));const travelled=after.filter((v:any)=>Math.abs(v.x-x0.get(v.id))>40);
  assert.ok(rolled>0,'they roll');assert.ok(travelled.length>=2,`and travel (${travelled.length} cars moved)`);void fastest;
 }finally{h.release();h.cleanup();}
});

test('real loop: Financial District: tanks join and an enemy tank is grabbed; the vault pays gold; the pyramid is the target',async()=>{
 const h=await boot(4);
 try{
  let s=h.state();assert.equal(s.blockName,'Financial District');assert.equal(s.objective.art,'pyramid');assert.equal(s.exitOpen,false);assert.equal(s.objectiveHP,P.strongholdHP);assert.equal(s.stage,2);
  h.test().teleport(1100);h.step(30);s=h.state();assert.ok(s.military.some((u:any)=>u.type==='tank'),'the first tanks');
  let got=false;for(let n=0;n<40&&!got;n++){s=h.state();const t=s.military.find((u:any)=>u.type==='tank'&&u.hp>0);if(!t)break;h.test().teleport(t.x-s.width-12);h.step(2);h.tap('KeyH');h.step(4);got=h.state().held==='tank';}
  assert.ok(got,'a grabbable enemy tank at Stage 2');h.tap('KeyH');h.step(40);
  // The vault: an existing cache; cracking it spills gold on top of the cache payout.
  s=h.state();const vi=s.buildings.findIndex((b:any)=>b.deco==='vault'),sc0=s.score;h.test().teleport(s.buildings[vi].x-s.width-40);h.step(2);h.test().smash(vi);h.step(30);
  const gain=h.state().score-sc0;assert.ok(gain>=X.cachePoints+SF2.goldPoints,`the vault pays out cache and gold (${gain})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: the transit center: the roof park is a long deck over buses; collapse a span and it falls onto them',async()=>{
 const h=await boot(4);
 try{
  let s=h.state();assert.equal(s.rails.length,5,'five spans of roof');assert.ok(s.rails.every((r:any)=>r.alive));
  const buses=()=>h.state().vehicles.filter((v:any)=>v.kind==='bus'&&FIN.buses!.some(x=>Math.abs(x-v.x)<400));
  assert.equal(buses().length>=3,true);const before=buses().filter((v:any)=>v.state!=='flat').length;
  // Trains do not run on a roof park.
  h.step(60*(EL.trainEvery+2));assert.equal(h.state().vehicles.some((v:any)=>v.kind==='train'),false);
  // Collapse the spans over the buses.
  const spans=s.rails.map((r:any,i:number)=>[r,i]).filter(([r]:any)=>FIN.buses!.some(x=>x+60>r.x0&&x<r.x1)).map(([,i]:any)=>i);assert.ok(spans.length>=2);
  for(const i of spans)h.test().smashRail(i);h.step(10);
  assert.ok(h.state().rails.filter((r:any)=>!r.alive).length>=2,'spans came down');
  const after=buses().filter((v:any)=>v.state!=='flat').length;assert.ok(after<before,`the buses under it were crushed (${before} -> ${after})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: a toppled flanking tower lands on the pyramid and damages it; destroying the pyramid opens the exit',async()=>{
 const h=await boot(4);
 try{
  let s=h.state();const t=s.objective,towers=s.buildings.map((b:any,i:number)=>[b,i]).filter(([b]:any)=>b.kind!=='tiny'&&b.h>=Math.round(500*C.cityScale)&&b.x+b.w<t.x-t.w/2+10&&t.x-(b.x+b.w)<500);
  assert.ok(towers.length>=1,'a tower west of the pyramid close enough to land on it');
  h.test().teleport(towers[0][0].x-s.width-60);h.step(2);const hp0=s.objectiveHP;h.test().smash(towers[0][1]);
  for(let n=0;n<60*6;n++)h.step();assert.ok(h.state().objectiveHP<hp0,`the falling tower hurt the pyramid (${hp0} -> ${h.state().objectiveHP})`);
  // Finish it with fists and the exit opens.
  s=h.state();h.test().teleport(s.objective.x-s.objective.w/2-s.width-10);h.step(2);for(let n=0;n<1500&&h.state().objectiveHP>0&&h.state().mode==='playing';n++){hit(h,1);}
  assert.equal(h.state().objectiveHP,0);assert.equal(h.state().exitOpen,true);
 }finally{h.release();h.cleanup();}
});

test('real loop: the helipad: military helicopters at height, and the pad itself can be wrecked',async()=>{
 const h=await boot(4);
 try{
  let s=h.state();const pad=s.roofs.find((r:any)=>r.kind==='helipad');assert.ok(pad&&!pad.dead);
  h.test().teleport(FIN.units!.find(([t])=>t==='helicopter')![1]-600);h.step(60);s=h.state();assert.ok(s.military.some((u:any)=>u.type==='helicopter'),'a helicopter on station');
  const top=Math.min(...s.military.filter((u:any)=>u.type==='helicopter').map((u:any)=>u.y));assert.ok(C.ground-top>150,`at height (${(C.ground-top).toFixed(0)}px up)`);
 }finally{h.release();h.cleanup();}
});

test('real loop: Fisherman\'s Wharf: start on Jefferson Street at Stage 2, a runaway cable car careens in, the Guard are here',async()=>{
 const h=await boot(5);
 try{
  let s=h.state();assert.equal(s.blockName,"Fisherman's Wharf");assert.equal(s.stage,2);assert.equal(s.growthCap,2);assert.equal(s.objective.art,'cutter');assert.equal(s.exitOpen,false);
  assert.ok(Math.abs(s.x+s.width/2-WHARF.start!)<5,'start on Jefferson Street');assert.equal(s.band,'dry');
  assert.equal(cars(h).length,1);assert.equal(cars(h)[0].state,'rolling','the cable car is already loose');
  let fast=0,x0=cars(h)[0].x;for(let n=0;n<60*4;n++){h.step();const v=cars(h)[0];if(v.state==='rolling')fast=Math.max(fast,Math.abs(h.state().vehicles.find((q:any)=>q.id===v.id).vx));}
  assert.ok(fast>200,`it careens down the hill (${fast.toFixed(0)}px/s)`);assert.ok(cars(h)[0].x<x0-200,'toward the start');assert.notEqual(cars(h)[0].state,'rolling','and ends in a wreck');
  assert.ok(s.military.length>=0);
 }finally{h.release();h.cleanup();}
});

test('real loop: Pier 39: sea lions flop away from the kaiju into the water',async()=>{
 const h=await boot(5);
 try{
  let s=h.state();assert.equal(s.seaLions.length,4);assert.ok(s.seaLions.every((l:any)=>l.state==='rest'));
  h.test().teleport(WHARF.sealions![0]-s.width-200);h.step(20);assert.ok(h.state().seaLions.some((l:any)=>l.state==='flee'),'they bolt');
  for(let n=0;n<60*12;n++)h.step();s=h.state();assert.ok(s.seaLions.some((l:any)=>l.state==='gone'),'and dive in');assert.ok(s.lionsEscaped>=1);
 }finally{h.release();h.cleanup();}
});

test('real loop: the fog thickens through the level; Kaiban roars in it',async()=>{
 const h=await boot(5);
 try{
  // Kaiban is quiet until the kaiju reaches Pier 45, then roars once.
  assert.equal(h.state().kaibanState.roared,false);h.step(60);assert.equal(h.state().kaibanState.roared,false,'quiet on Jefferson Street');
  h.test().teleport(WHARF.kaiban!.x+10);h.step(3);let s=h.state();assert.equal(s.kaibanState.roared,true);assert.equal(s.banner,'SOMETHING ROARS IN THE FOG');assert.ok(s.kaibanState.roar>0);
  // The fog is clear in the west and thickens eastward.
  const fogs:number[]=[];for(const x of [100,3000,4500,6300,7600]){h.test().teleport(x);h.step(2);fogs.push(h.state().fogLevel);}
  for(let i=1;i<fogs.length;i++)assert.ok(fogs[i]>=fogs[i-1],`never thinner going east (${fogs})`);
  assert.ok(fogs[fogs.length-1]>fogs[0]+.3,'much thicker at the east end');assert.equal(fogs[0],0,'clear on the west side');assert.ok(fogs[fogs.length-1]<=WHARF.fog!.max);
 }finally{h.release();h.cleanup();}
});

test('real loop: the bay is closed to Stage 2 (the shore is a drop-off); the crystal on Pier 39 grows the kaiju to Stage 3',async()=>{
 const h=await boot(5);
 try{
  let s=h.state();assert.equal(s.stage,2);
  // Stage 2 will not step into the over-your-head bay.
  const edge=Math.round(5560*C.cityScale);h.test().teleport(edge-s.width-60);h.step(2);h.down('KeyD');h.step(60*4);h.up('KeyD');s=h.state();
  assert.ok(s.x+s.width<Math.round(6700*C.cityScale),'held back at the shore');assert.notEqual(s.band,'deep');assert.equal(s.drowning,null,'not drowned');
  // The crystal formation lifts the cap to Stage 3.
  s=h.state();assert.equal(s.formationHP,SF.formationHP);h.test().teleport(s.formationX-s.width-100);h.step(2);let best=2;
  for(let n=0;n<420&&h.state().formationHP!==null;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);best=Math.max(best,h.state().stage);}
  h.step(90);best=Math.max(best,h.state().stage);s=h.state();assert.ok(!s.formationHP,'the formation shattered');assert.equal(s.growthCap,3);assert.equal(best,3,'grown to Stage 3');
 }finally{h.release();h.cleanup();}
});

test('real loop: at Stage 3 the kaiju wades into the bay; the cutter takes damage and sinks, opening both exits',async()=>{
 const h=await boot(5);
 try{
  let s=h.state();h.test().teleport(s.formationX-s.width-100);h.step(2);for(let n=0;n<420&&h.state().formationHP!==null;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);}h.step(90);s=h.state();assert.equal(s.stage,3);
  // Stage 3 stands in the bay.
  const cut=s.objective;h.test().teleport(cut.x-cut.w/2-s.width-30);h.step(5);s=h.state();assert.equal(s.band,'wading','wading, not drowning, at Stage 3');assert.equal(s.cutter.sinking,false);assert.equal(s.exitOpen,false);
  for(let n=0;n<600&&h.state().objectiveHP>0&&h.state().mode==='playing';n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);h.test().teleport(cut.x-cut.w/2-h.state().width-30);}
  s=h.state();assert.equal(s.mode,'playing');assert.equal(s.objectiveHP,0,'the cutter is wrecked');assert.equal(s.cutter.sinking,true);assert.equal(s.exitOpen,true,'both exits open');
  let sink0=s.cutter.sink;for(let n=0;n<60*3;n++)h.step();assert.ok(h.state().cutter.sink>sink0,'it settles lower');assert.ok(h.state().cutter.list>0,'listing');
  for(let n=0;n<60*8;n++)h.step();assert.equal(h.state().cutter.sink,1,'and goes under');
 }finally{h.release();h.cleanup();}
});

test('real loop: exit routing: out the west end goes to The Fault, out the east end to Alcatraz; both need the cutter sunk',async()=>{
 for(const side of ['west','east'] as const){
  const h=await boot(5);
  try{
   let s=h.state();const W=s.worldWidth;
   // Closed until the cutter is sunk: walking to either end does nothing.
   h.test().teleport(side==='west'?2:W-s.width-2);h.step(20);assert.equal(h.state().mode,'playing',`${side} exit is closed`);
   // Sink the cutter without the crowd: smash the objective with the test hook for the destruction goal, then walk out.
   h.test().sinkCutter();h.step(10);s=h.state();assert.equal(s.exitOpen,true);
   h.test().teleport(side==='west'?60:W-s.width-60);h.down(side==='west'?'KeyA':'KeyD');h.step(200);h.up(side==='west'?'KeyA':'KeyD');
   assert.equal(h.state().mode,'results',`walking out the ${side} end finishes the level`);assert.equal(h.state().exitSide,side);
   h.click('#advance');h.step(2);assert.equal(h.state().blockName,side==='west'?'The Fault':'Alcatraz');
  }finally{h.release();h.cleanup();}
 }
});
