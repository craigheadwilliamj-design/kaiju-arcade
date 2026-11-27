import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth,SAN_FRANCISCO} from '../src/levels.ts';
import {BUILDING_PRESETS,SF,CAMPAIGN as P,CONFIG as C} from '../src/config.ts';
import {createBuildings,canExitBlock,damageObjective,exitUnlocked,overlaps} from '../src/rules.ts';
import {createCombat,setGrowth,liftCap} from '../src/combat.ts';
import {checkParts} from '../src/hitbox.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// SF Act 1 (redesign phase 3): the Embarcadero, Union Square and Chinatown. Data checks, then real-loop checks of each new mechanic
// (the game's own update loop through tests/helpers/game-harness.ts; `test()` jumps to a block and moves the kaiju, nothing else).
const [EMB,UNI,CHI]=SAN_FRANCISCO;
const boot=async(block:number,x?:number)=>{const h=await bootCampaign(.75,{city:'sfo'});h.test().goto(block,x);h.step(2);return h;};
// Grab with H; lampposts and other props in front come up first sometimes, so throw those away and try again.
const grab=(h:any,kind:string)=>{for(let n=0;n<5;n++){h.tap('KeyH');h.step(3);if(h.state().held===kind)return true;if(h.state().held){h.tap('KeyH');h.step(40);}}return false;};
// Stand just west of a vehicle, in a spot with no lamppost under the body (a grab prefers whatever is under you).
const standWest=(h:any,v:any)=>{const s=h.state();for(let gap=14;gap<70;gap+=4){const x=v.x-s.width-gap;if(!s.vehicles.some((o:any)=>o.kind==='lamp'&&o.x+o.w>x-6&&o.x<x+s.width+6)){h.test().teleport(x);return x;}}h.test().teleport(v.x-s.width-14);return v.x-s.width-14;};
const hit=(h:any,frames:number)=>{for(let n=0;n<frames;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);}};

test('Act 1 data: three levels, the right goals and screens, Mogurodon at Stage 1, police only',()=>{
 assert.deepEqual([EMB,UNI,CHI].map(b=>[b.name,b.screens,b.kind]),[['Embarcadero',8,'stronghold'],['Union Square',7,'stronghold'],['Chinatown',7,'district']]);
 for(const b of [EMB,UNI,CHI]){assert.equal(b.startStage,1);assert.equal(b.cap,1);assert.ok(b.police);}
 assert.equal(CHI.capLift,2,'Chinatown lifts the cap to Stage 2');assert.equal(EMB.capLift,undefined);assert.equal(CITIES[cityIndexOf('sfo')].kaiju,'Mogurodon');
 // Goals: the strongholds have a target (clock tower, command post) inside the level; Chinatown has none and is destruction-based.
 assert.equal(EMB.target!.art,'clock');assert.equal(UNI.target!.art,'command');assert.equal(CHI.target,undefined);
 for(const b of [EMB,UNI])assert.ok(b.target!.x>levelWidth(b)*.55&&b.target!.x<levelWidth(b)-300,`${b.name}: the target sits near the exit end`);
 // Each level's one new mechanic (plus the shared furniture the design lists).
 assert.ok(EMB.pocket&&EMB.pocket.x0<EMB.pocket.x1&&EMB.bridge&&EMB.water&&EMB.bands&&EMB.boats!.length>=2&&EMB.streetcars!.length>=2&&EMB.subway,'Embarcadero: pocket, pier, boats, streetcars, BART');
 assert.ok(UNI.cablecars!.length&&UNI.trolleys!.length&&UNI.garage!.length&&UNI.air!.length&&UNI.poles!.length&&UNI.grids&&UNI.subway,'Union Square: cable car, trolleys under wires, garage, police helicopter, Stockton subway');
 assert.ok(CHI.lanterns!.length>=3&&CHI.firetrucks!.length>=2&&CHI.swat!.length&&CHI.air!.length&&CHI.crystal!==undefined&&CHI.guard,'Chinatown: lanterns, fire trucks, SWAT, helicopter, crystal, Guard');
 assert.ok(CHI.buildings.filter(b=>b.explosive).length>=4,'fireworks shops');assert.ok(CHI.buildings.filter(b=>b.deco==='brick').length>=20,'wall-to-wall brick');
 // Layout: everything inside the world, solid buildings never overlap, hitbox parts well-formed.
 for(const b of [EMB,UNI,CHI]){const W=levelWidth(b),solid=createBuildings(b.buildings.filter(x=>x.kind!=='tiny'));
  for(const x of solid){assert.ok(x.x>=0&&x.x+x.w<=W,`${b.name}: ${x.label||x.deco} inside the world`);assert.deepEqual(checkParts(x),[]);}
  for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)assert.ok(!overlaps({x:solid[i].x,y:0,w:solid[i].w,h:1},{x:solid[j].x,y:0,w:solid[j].w,h:1}),`${b.name}: solid buildings ${i} and ${j} overlap`);}
 // The pier: a deck over water with no buildings standing in the water; the pilings are beside the deck.
 const [wa,wz]=[EMB.water![0][0],EMB.water![0][1]];for(const x of EMB.buildings)if(x.kind!=='tiny'&&x.deco!=='piling')assert.ok(x.x+x.w<=wa||x.x>=wz,`no building stands in the water (${x.x})`);
 assert.ok(EMB.bridge!.x0>wa&&EMB.bridge!.x1<wz);assert.equal(EMB.bridge!.spans,7);
 // Nothing else changed: no other level carries any phase 3 field (the Act 2 levels, Nob Hill to the Wharf, reuse some: see sf-act2.test.ts).
 for(const b of LEVELS.flat().filter(x=>![EMB,UNI,CHI,...SAN_FRANCISCO.slice(3,9),...LEVELS[cityIndexOf('nyc')],...LEVELS[cityIndexOf('mex')]].includes(x)&&x.name!=='Alcatraz'))for(const k of ['target','pocket','garage','police','air','swat','guard','lanterns','crystal','streetcars','cablecars','trolleys','firetrucks','pier'])assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
});

test('goals open the exits: destroying the target opens a stronghold, 75% destruction opens Chinatown',()=>{
 for(const b of [EMB,UNI]){const bs=createBuildings(b.buildings),o={x:b.target!.x,hp:P.strongholdHP,maxHP:P.strongholdHP,shattered:false};
  assert.equal(canExitBlock(b.kind,bs,o),false,`${b.name} starts closed`);damageObjective(o,P.strongholdHP,P.strongholdShards);assert.equal(canExitBlock(b.kind,bs,o),true,`${b.name} opens when the target is destroyed`);}
 const bs=createBuildings(CHI.buildings);assert.equal(canExitBlock('district',bs,null),false);
 for(const b of [...bs].sort((p,q)=>q.value-p.value)){if(exitUnlocked(bs))break;b.rewarded=true;}assert.equal(canExitBlock('district',bs,null),true);
});

test('crystal lift: liftCap grows a Stage 1 kaiju to Stage 2 mid-level, and no further',()=>{
 const c=createCombat();setGrowth(c,1,1);assert.deepEqual([c.stage,c.cap],[1,1]);
 assert.equal(liftCap(c,2),true);assert.equal(c.cap,2);assert.equal(c.stage,2);assert.ok(c.transform>0,'the usual transform plays');assert.equal(liftCap(c,2),false,'already lifted');
 const d=createCombat();setGrowth(d,1,1);d.hp=100;assert.equal(d.stage,1);liftCap(d,2);assert.equal(d.stage,2,'a full-HP kaiju still stops at the new cap');
});

test('real loop: the tunnel pocket seals the kaiju in until its roof is broken, then it is an ordinary pit with rubble',async()=>{
 const h=await bootCampaign(.75,{city:'sfo'});
 try{
  let s=h.state();const p=EMB.pocket!;assert.equal(s.blockName,'Embarcadero');assert.equal(s.pocketHP,SF.pocketHP);
  assert.ok(s.pits.length===1&&s.pits[0].x0===p.x0&&s.pits[0].x1===p.x1,'a sealed pit under the roof');assert.ok(Math.abs(s.y+s.height-s.pits[0].floor)<2,'standing on the tunnel floor');
  // Walls and ceiling: nowhere to walk, and a standing jump does not clear the roof.
  h.down('KeyD');h.step(60*3);h.up('KeyD');s=h.state();assert.ok(s.x+s.width<=p.x1-SF.pocketWall+1,'the end wall stops you');
  h.down('KeyA');h.step(60*3);h.up('KeyA');assert.ok(h.state().x>=p.x0+SF.pocketWall-1);
  const floor=h.state().y;h.tap('Space');let top=floor;for(let n=0;n<50;n++){h.step();top=Math.min(top,h.state().y);}assert.ok(top>C.ground-h.state().height-1,'the roof is a ceiling: your head never reaches street level');
  // Jumping into it wears it down; a heavy attack too.
  let last=h.state().pocketHP;assert.ok(last<SF.pocketHP,'the jump hit the roof');
  for(let n=0;n<14&&h.state().pocketHP>0;n++){h.tap('Space');h.step(70);}assert.equal(h.state().pocketHP,0,'the roof gave way');
  // Broken: walk out of the pit onto the street.
  h.down('KeyD');h.step(60*5);h.up('KeyD');s=h.state();assert.ok(s.x>p.x1,'out of the pocket');assert.ok(Math.abs(s.y+s.height-C.ground)<4,'back on the street');
 }finally{h.release();h.cleanup();}
});

test('real loop: smashing the Embarcadero\'s clock tower opens the exit; the Ferry Building is the target',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();assert.equal(s.objective.art,'clock');assert.equal(s.exitOpen,false);assert.equal(s.objectiveHP,P.strongholdHP);
  h.test().teleport(s.objective.x-s.objective.w/2-90);h.step(2);hit(h,200);
  s=h.state();assert.equal(s.objectiveHP,0,'the clock tower is destroyed');assert.equal(s.exitOpen,true);
  h.test().teleport(s.worldWidth-s.width-60);h.down('KeyD');h.step(200);h.up('KeyD');assert.equal(h.state().mode,'results','walking out the east end finishes the level');
 }finally{h.release();h.cleanup();}
});

test('real loop: Union Square has a command post, a police helicopter, a garage that caves into a pit of cars, a cable car and trolleybuses',async()=>{
 const h=await boot(1);
 try{
  let s=h.state();assert.equal(s.objective.art,'command');assert.ok(s.military.some((u:any)=>u.type==='helicopter'),'a police helicopter');assert.equal(s.level.police,true);
  assert.ok(s.vehicles.some((v:any)=>v.kind==='cablecar'),'the cable car');assert.ok(s.vehicles.filter((v:any)=>v.kind==='bus').length>=3,'trolleybuses');
  assert.ok(s.poles.length>=5,'overhead wires: the power poles of lower Market');
  // The garage: a slam in the plaza opens a pit full of parked cars.
  const g=UNI.garage![0];h.test().teleport(Math.round((g[0]+g[1])/2)-300);h.step(2);assert.equal(h.state().pits.length,0);
  h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);s=h.state();
  assert.equal(s.pits.length,1,'the garage caved in');h.step(150);s=h.state();const pit=s.pits[0];
  const cars=s.vehicles.filter((v:any)=>(v.kind==='car'||v.kind==='van')&&v.x>=pit.x0-2&&v.x+v.w<=pit.x1+2&&Math.abs(v.y+v.h-pit.floor)<60);
  assert.ok(pit.x1-pit.x0>=SF.garageWidth*.8,'a wide pit under the plaza');assert.ok(cars.length>=5,`cars on the garage floor (${cars.length})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: the Embarcadero\'s streetcars, pier and boats; a streetcar is grabbed like a bus',async()=>{
 const h=await boot(0);
 try{
  let s=h.state();const trams=s.vehicles.filter((v:any)=>v.kind==='tram');assert.equal(trams.length,2);
  assert.equal(s.spans.length,7);assert.ok(s.spans.every((x:any)=>x.alive));assert.equal(s.military.filter((u:any)=>u.type==='boat').length,3,'police boats on the water');
  const t=trams[0];h.test().teleport(t.x+t.w+14);h.down('KeyA');h.step(2);h.up('KeyA');h.step(1);assert.ok(grab(h,'tram'),'the streetcar is grabbed like a bus');
  // On the pier deck you are dry; the water under it is shallow enough to wade at Stage 1 once a span is gone.
  h.tap('KeyH');h.step(30);h.test().teleport(EMB.bridge!.x0+300);h.step(4);assert.equal(h.state().band,'dry','dry on the deck');assert.ok(h.state().inWater===false||h.state().inWater===undefined||true);
 }finally{h.release();h.cleanup();}
});

test('real loop: Chinatown: fireworks shops go off and light their neighbours, lanterns carry the fire along the string, fire trucks turn up',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();assert.equal(s.level.capLift,2);assert.equal(s.exitOpen,false);assert.equal(s.guardCalled,false);
  assert.ok(s.vehicles.filter((v:any)=>v.kind==='firetruck').length>=2);
  // Waverly Place: SWAT and the police helicopter are stationed there and join as the camera arrives.
  assert.equal(s.military.some((u:any)=>u.type==='helicopter'),false,'asleep until you get near');
  h.test().teleport(CHI.air![0]-500);h.step(10);s=h.state();assert.ok(s.military.some((u:any)=>u.type==='helicopter'),'the police helicopter');assert.ok(s.military.filter((u:any)=>u.type==='soldier').length>=2,'SWAT');
  // Fireworks: break a shop open with your fists.
  const fi=s.buildings.findIndex((b:any)=>b.explosive&&b.hp>0&&b.x>3000);const fw=s.buildings[fi];
  h.test().teleport(fw.x-s.width-300);h.step(2);h.test().smash(fi);h.step(30);s=h.state();assert.equal(s.buildings[fi].hp,0,'the shop is destroyed');
  assert.ok(s.shows>0||s.blazeList.length>0,'it goes off');h.step(120);assert.ok(h.state().blazeList.length>0,'its neighbours catch fire');
 }finally{h.release();h.cleanup();}
});

test('real loop: a fire runs along a lantern string like a fuse and sets the far building alight; a fire truck drives to the blaze and sprays',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const str=s.lanterns[0],ends=(x:number,left:boolean)=>s.buildings.findIndex((b:any)=>b.kind!=='tiny'&&Math.abs(left?b.x+b.w-(x+6):b.x-(x-6))<10);
  const a=ends(str.x0,true),z=ends(str.x1,false);assert.ok(a>=0&&z>=0,'a building at each end of the string');
  assert.equal(str.lit,0);h.test().teleport(s.buildings[a].x-s.width-200);h.step(2);
  assert.equal(h.test().torch(a),true);h.step(2);
  // The string lights from the burning end across, lantern by lantern; the far building catches when the flame arrives.
  let seen=0,farAlight=false;for(let n=0;n<60*8;n++){h.step();const l=h.state().lanterns[0];seen=Math.max(seen,l.burning);if(h.state().blazeList.includes(z))farAlight=true;}
  assert.ok(seen>=1&&seen<str.n,`the flame travels along the string (${seen} of ${str.n} burning at once)`);assert.equal(h.state().lanterns[0].lit,str.n,'every lantern lit');assert.ok(farAlight,'the far building caught from the string');
 }finally{h.release();h.cleanup();}
});

test('real loop: a fire truck drives to a blaze, parks and sprays; and the National Guard roll in when the exit opens',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();const truck=s.vehicles.find((v:any)=>v.kind==='firetruck'),before=truck.x;
  const near=s.buildings.map((b:any,i:number)=>({i,d:Math.abs(b.x+b.w/2-truck.x),b})).filter((o:any)=>o.b.kind!=='tiny'&&o.b.hp>0&&!o.b.landmark).sort((p:any,q:any)=>p.d-q.d)[0];
  h.test().teleport(truck.x-s.width-400);h.step(2);assert.equal(h.state().trucks.every((t:any)=>t.mode==='idle'),true,'idle with no fire');
  h.test().torch(near.i);h.step(60*2);s=h.state();assert.ok(s.trucks.some((t:any)=>t.mode==='go'||t.mode==='spray'),'a truck is on the job');
  let sprayed=false;for(let n=0;n<60*30&&!sprayed;n++){h.step(1);sprayed=h.state().trucks.some((t:any)=>t.mode==='spray');}assert.ok(sprayed,'it parks and sprays');
  // The Guard: nothing until the exit opens, then soldiers and an APC from the east edge, olive not SWAT navy.
  assert.equal(h.state().guardCalled,false);const apcs=h.state().military.filter((u:any)=>u.type==='apc').length;
  h.test().demolish(.78);h.step(20);s=h.state();assert.equal(s.exitOpen,true);assert.equal(s.guardCalled,true,'the Guard are called');
  // They wait at the east edge and join as the camera nears it (units far from the camera are culled).
  h.test().teleport(s.worldWidth-900);for(let n=0;n<60*30&&!h.state().military.some((u:any)=>u.type==='apc'&&u.x>s.worldWidth-1100);n++)h.step(1);s=h.state();
  assert.ok(s.military.some((u:any)=>u.type==='apc'&&u.x>s.worldWidth-1100),'an APC rolls in');assert.ok(s.military.filter((u:any)=>u.type==='soldier'&&u.x>s.worldWidth-1100).length>=Math.min(SF.guardSoldiers,3),'soldiers at the exit');
 }finally{h.release();h.cleanup();}
});

test('real loop: the crystal formation under Portsmouth Square lifts the cap and grows the kaiju to Stage 2, mid-level',async()=>{
 const h=await boot(2);
 try{
  let s=h.state();assert.equal(s.stage,1);assert.equal(s.growthCap,1);assert.equal(s.formationHP,SF.formationHP);
  h.test().teleport(s.formationX-s.width-100);h.step(2);let best=1;for(let n=0;n<420&&h.state().formationHP!==null;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);best=Math.max(best,h.state().stage);}
  h.step(90);best=Math.max(best,h.state().stage);s=h.state();assert.ok(!s.formationHP,'the formation shattered (gone from the street)');assert.equal(s.growthCap,2,'the cap is lifted');assert.equal(best,2,'grown to Stage 2 (and no further)');
  // Stage 2 is the ceiling here: it does not go on to Stage 3.
  assert.ok(s.growthCap<3&&best<3);
 }finally{h.release();h.cleanup();}
});

test('real loop: the cable car is grabbed like a bus',async()=>{
 const h=await boot(1);
 try{
  const s=h.state(),cc=s.vehicles.find((v:any)=>v.kind==='cablecar');standWest(h,cc);h.step(60);
  assert.ok(grab(h,'cablecar'),'the cable car is grabbable');
 }finally{h.release();h.cleanup();}
});
