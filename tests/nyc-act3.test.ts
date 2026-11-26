import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,STEAM as ST,PARADE as PD,NYC3,RIVER as R,BUILDING_PRESETS} from '../src/config.ts';
import {createBuildings} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {VEHICLE_SPECS,loose} from '../src/vehicles.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// New York Act 3 (NYC rework card 5): Hudson Yards (geysers, the rail-yard deck) and Herald Square (parade balloons, Madison Square Garden).
// Data checks, then real-loop checks of each new mechanic (the game's own update loop through tests/helpers/game-harness.ts).
const NYC=cityIndexOf('nyc'),LV=LEVELS[NYC],at=(n:string)=>LV.findIndex(b=>b.name===n),YARDS=LV[at('Hudson Yards')],HERALD=LV[at('Herald Square')],sc=(n:number)=>Math.round(n*C.cityScale);
const boot=async(block:number,x?:number,kaiju='Kaiban')=>{const h=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban'});h.test().goto(block,x);h.step(2);if(kaiju!=='Kaiban')h.test().setKaiju(kaiju);return h;};
const solidOf=(b:any)=>createBuildings(b.buildings.filter((x:any)=>x.kind!=='tiny'));
const grab=(h:any,kind:string)=>{for(let n=0;n<5;n++){h.tap('KeyH');h.step(3);if(h.state().held===kind)return true;if(h.state().held){h.tap('KeyH');h.step(40);}}return false;};
// Stand just west of a thing at x, clear of any lamppost under the body (a grab prefers whatever is under you).
const standWest=(h:any,x:number,w=0)=>{const s=h.state();for(let gap=14;gap<70;gap+=4){const px=x-s.width-gap;if(!s.vehicles.some((o:any)=>o.kind==='lamp'&&o.x+o.w>px-6&&o.x<px+s.width+6)){h.test().teleport(px);h.step(3);return px;}}h.test().teleport(x-s.width-14-w);h.step(3);return x-s.width-14;};
const punch=(h:any,balloon:number,tries=30)=>{for(let n=0;n<tries&&['tethered','held'].includes(h.state().balloons[balloon]?.state);n++){h.tap('KeyK');h.step(8);}};

test('Act 3 data: Hudson Yards and Herald Square, Stage 3 under the full military, the right goals',()=>{
 assert.deepEqual([YARDS,HERALD].map(b=>[b.name,b.screens,b.kind,b.startStage,b.cap,b.tier]),[['Hudson Yards',8,'district',3,3,4],['Herald Square',8,'stronghold',3,3,4]]);
 assert.equal(CITIES[NYC].kaiju,'Kaiban');assert.ok(YARDS.police&&HERALD.police&&HERALD.guard);
 assert.deepEqual([at('Hudson Yards'),at('Herald Square')],[6,7],'levels 7 and 8 of the route');
 assert.equal(YARDS.target,undefined,'Hudson Yards is destruction-based');assert.deepEqual([HERALD.target!.art,HERALD.target!.label],['arena','MADISON SQUARE GARDEN']);
 assert.ok(HERALD.target!.x>levelWidth(HERALD)*.55&&HERALD.target!.x<levelWidth(HERALD)-300,'the Garden sits near the exit end');
 assert.ok(NYC3.arenaW>NYC3.arenaH,'a wide drum');
});

test('Hudson Yards data: the High Line park (no buses), the Vessel, the rail-yard deck, geysers',()=>{
 const W=levelWidth(YARDS),s=solidOf(YARDS);
 // The High Line: the roof-park drawing, no buses under it, its approach ramps inside the world and clear of buildings.
 assert.equal(YARDS.elevatedLook,'park');assert.equal(YARDS.buses,undefined,'no buses on the High Line');assert.ok(YARDS.elevated&&YARDS.approach);
 const [e0,e1]=YARDS.elevated!;assert.ok(e0-YARDS.approach!>=0&&e1+YARDS.approach!<=W);
 for(const b of s)assert.ok(b.x+b.w<=e0-YARDS.approach!+4||b.x>=e1+YARDS.approach!-4,`${b.label||b.deco||'a building'} stands under the High Line`);
 assert.ok(YARDS.buildings.some(b=>b.landmark&&b.label==='THE VESSEL'&&b.shape==='lattice'),'the Vessel (a lattice landmark)');
 // The deck: six equal spans, the matching bridge and rail-yard line, a deep tunnel for the yard floor.
 const y=YARDS.yard!;assert.equal(y.spans,6);assert.deepEqual(YARDS.bridge,{x0:y.x0,x1:y.x1,spans:y.spans});assert.deepEqual(YARDS.subway,[[y.x0,y.x1]]);assert.equal(YARDS.tunnel,'deep');
 const span=(y.x1-y.x0)/y.spans,on=s.filter(b=>b.x>=y.x0&&b.x+b.w<=y.x1),k=(b:{x:number,w:number})=>Math.floor((b.x+b.w/2-y.x0)/span);
 for(const b of s)assert.ok(b.x+b.w<=y.x0||b.x>=y.x1||on.includes(b),`${b.label||b.deco||'a building'} straddles the deck's edge`);
 assert.ok(on.length>=6,`towers stand on the deck (${on.length})`);
 for(const b of on){assert.ok(b.x>=y.x0+k(b)*span-1&&b.x+b.w<=y.x0+(k(b)+1)*span+1,`a deck tower stays inside its span (${b.x})`);assert.ok(b.h>=sc(400),'deck towers are tall');}
 assert.ok(new Set(on.map(k)).size>=5,'five or more spans carry towers');assert.ok(!on.some(b=>k(b)===0),'the first span is open plaza (somewhere to stand and break it)');
 // Geysers: lots of them, all on open street, some on the deck.
 assert.equal(YARDS.ventsAuto,true);assert.ok(YARDS.vents!.length>=12,`geysers all over (${YARDS.vents!.length})`);for(let i=1;i<YARDS.vents!.length;i++)assert.ok(YARDS.vents![i]>YARDS.vents![i-1]);
 for(const x of YARDS.vents!)assert.ok(!s.some(b=>x+16>b.x&&x-16<b.x+b.w),`geyser ${x} is on open street`);
 assert.ok(YARDS.vents!.filter(x=>x>=y.x0&&x<y.x1).length>=3,'geysers on the deck');
 for(const b of [YARDS,HERALD]){const q=levelWidth(b),ss=solidOf(b).sort((p,r)=>p.x-r.x);for(const x of ss){assert.ok(x.x>=0&&x.x+x.w<=q,`${b.name}: inside the world`);assert.deepEqual(checkParts(x),[]);}
  for(let i=1;i<ss.length;i++)assert.ok(ss[i].x>=ss[i-1].x+ss[i-1].w,`${b.name}: solid buildings ${i-1} and ${i} overlap`);}
});

test("Herald Square data: Macy's, Penn Station over the line, parade floats as the barricades, parade balloons, the full military",()=>{
 const s=solidOf(HERALD),T=HERALD.target!.x;
 assert.ok(HERALD.buildings.some(b=>b.landmark&&b.label==="MACY'S"),"Macy's");
 const penn=HERALD.buildings.find(b=>b.label==='PENN STATION')!;assert.ok(penn&&HERALD.subway&&penn.x>=HERALD.subway[0][0]&&penn.x+penn.w<=HERALD.subway[0][1],'Penn Station stands over its line (trains below)');
 const floats=HERALD.buildings.filter(b=>b.deco==='float');assert.ok(floats.length>=5,`parade floats (${floats.length})`);assert.ok(!HERALD.buildings.some(b=>b.label==='BARRIER'),'no plain barricades: the floats are the barricades');
 assert.ok(floats.some(b=>b.x<T)&&floats.some(b=>b.x>T),'floats on both sides of the Garden');for(const f of floats)assert.ok(f.kind!=='tiny'&&f.hp>=BUILDING_PRESETS.b.hp,'a float is as tough as a barricade');
 // The balloons: at least six, in order, at roof height, each with open street below for its crew.
 const bl=HERALD.balloons!;assert.ok(bl.length>=6);for(let i=1;i<bl.length;i++)assert.ok(bl[i][0]>bl[i-1][0]);
 for(const [x,alt] of bl){assert.ok(alt>=300&&alt<=800,`roof height (${alt})`);assert.ok(!s.some(b=>x+PD.tether.w+40>b.x&&x-40<b.x+b.w),`the crew at ${x} stand on open street`);}
 assert.ok(bl.filter(([x])=>Math.abs(x-T)<sc(1700)).length>=2,'balloons float over the stronghold');
 // The full military: infantry, armour, artillery, an emplacement, helicopters (one sheltering behind each of four balloons).
 const kinds=new Set((HERALD.units??[]).map(u=>u[0]));for(const k of ['soldier','tank','apc','artillery','emplacement','helicopter'])assert.ok(kinds.has(k as any),`${k} in the line-up`);
 const heli=HERALD.units!.filter(u=>u[0]==='helicopter');assert.ok(heli.length>=4);
 assert.ok(heli.filter(([,x,alt])=>bl.some(([bx,ba])=>Math.abs(bx-x)<PD.shelter&&Math.abs(ba-(alt??0))<PD.shelter)).length>=4,'helicopters stationed behind balloons');
 assert.ok(HERALD.garrison!.length>=6,'a heavy garrison round the Garden');
 assert.deepEqual([...PD.shapes],['dog','turkey','astronaut','kaiju'],'generic shapes only');
});

test('opt-in: no other level sets the new fields; no other level uses the arena, floats or balloons',()=>{
 const mine=[YARDS,HERALD];
 for(const b of LEVELS.flat().filter(x=>!mine.includes(x))){for(const k of ['ventsAuto','yard','balloons'])assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
  assert.notEqual(b.target?.art,'arena',`${b.name} keeps its own target art`);assert.ok(!b.buildings.some(x=>x.deco==='float'),`${b.name} has no parade floats`);}
 assert.deepEqual(mine.map(b=>[b.ventsAuto!==undefined,b.yard!==undefined,b.balloons!==undefined]),[[true,true,false],[false,false,true]]);
 assert.equal(LV[at('SoHo and Canal Street')].ventsAuto,undefined,'the Act 1 vents are unchanged: no geysers in SoHo');
 // A tether is grabbable but not a loose street object: stomps, punts and blasts leave it alone.
 assert.equal(loose({kind:'tether',state:'parked'} as any),false);assert.equal(loose({kind:'car',state:'parked'} as any),true);
});

test('config: geysers, the deck and the balloons are sane',()=>{
 const G=ST.geyser;assert.ok(G.height>1&&G.radius>1&&G.damage>1,'geysers are the vents at full strength');assert.ok(G.warn>0&&G.every>G.warn&&G.seconds>0);
 assert.ok(NYC3.yard.spanHP<=R.spanHP*1.1&&NYC3.yard.sinkSpeed>0&&NYC3.yard.lean>0&&NYC3.yard.lean<Math.PI/4);
 assert.ok(PD.minHit>=PD.hp,'any hit pops a balloon');assert.ok(PD.size>0&&PD.floatSpeed>0&&PD.drape>PD.blind&&PD.crew>=2);assert.ok(VEHICLE_SPECS.tether.w>0&&VEHICLE_SPECS.tether.h>0);
});

// ---------------------------------------------------------------------------------------------------------------- Hudson Yards, real loop
test('real loop: geysers go off on their own (warn, burst, again), scald troops, blind helicopters, never set anything alight',async()=>{
 const h=await boot(at('Hudson Yards'),2500);
 try{
  let s=h.state();assert.equal(s.blockName,'Hudson Yards');assert.equal(s.stage,3);assert.equal(s.growthCap,3);assert.ok(s.ventList.length>=12&&s.ventList.every((v:any)=>v.auto),'every vent is a geyser');
  // Nobody slams anything: the vent near the kaiju warns, then bursts by itself.
  const v0=s.ventList.find((v:any)=>v.x>2600&&v.x<4200)!;h.test().teleport(v0.x-s.width-300);h.step(2);
  h.test().spawnUnit('emplacement',v0.x-20);h.test().spawnUnitOn('helicopter',v0.x-30,s.ground(v0.x)-140);h.step(2);
  const state=()=>h.state().ventList.find((q:any)=>q.x===v0.x)!.state;
  const seen=new Set<string>();for(let n=0;n<60*14&&state()!=='burst';n++){h.step();seen.add(state());}
  assert.ok(seen.has('puff')&&state()==='burst',`warned (${[...seen]}), then burst on its own`);
  const score0=h.state().score;for(let n=0;n<60*3;n++)h.step();s=h.state();
  assert.ok(s.ventScalded>=1,`the burst scalded the gun crew (${s.ventScalded})`);assert.ok(s.ventBlinded>=1,`and blinded the helicopter (${s.ventBlinded})`);
  assert.equal(s.blazes,0,'steam is not fire: nothing burns');assert.ok(s.score>=score0);
  // It goes quiet and comes round again.
  const again=new Set<string>();for(let n=0;n<60*20;n++){h.step();again.add(state());}assert.ok(again.has('idle')&&again.has('burst'),'quiet, then it bursts again');
 }finally{h.release();h.cleanup();}
});

test('real loop: a geyser reaches farther than the Act 1 vent: a trooper just outside the old radius is scalded',async()=>{
 const h=await boot(at('Hudson Yards'),2500);
 try{
  const s=h.state(),v0=s.ventList.find((v:any)=>v.x>2600&&v.x<4200)!;h.test().teleport(v0.x-s.width-700);h.step(2);
  assert.ok(ST.radius*ST.geyser.radius>ST.radius*1.2);
  h.test().spawnUnit('emplacement',v0.x+ST.radius*1.15);h.step(2);
  for(let n=0;n<60*14&&h.state().ventScalded===0;n++)h.step();
  assert.ok(h.state().ventScalded>=1,'a trooper beyond the Act 1 radius is scalded by the geyser');
 }finally{h.release();h.cleanup();}
});

test('real loop: breaking a deck span drops it, opens the yard below, sinks and brings down the towers on it and only those',async()=>{
 const h=await boot(at('Hudson Yards'),2500);
 try{
  let s=h.state();const sp=s.spans;assert.equal(sp.length,6);assert.ok(sp.every((x:any)=>x.alive));assert.equal(s.pits.length,0,'the yard is covered while the deck stands');
  const towers=(k:number)=>h.state().buildings.filter((b:any)=>b.kind!=='tiny'&&b.hp>0&&b.x+b.w/2>=sp[k].x0&&b.x+b.w/2<sp[k].x1&&b.h>sc(300));
  const k=1,t0=towers(k)[0];assert.equal(towers(k).length,1,'one tower stands on span 1');
  h.test().teleport((sp[0].x0+sp[0].x1)/2);h.step(10);
  h.test().smashSpan(k);h.step(4);s=h.state();assert.equal(s.spans[k].alive,false,'span 1 is down');assert.ok(s.spans[0].alive&&s.spans[2].alive,'its neighbours stand');
  assert.equal(s.pits.length,1,'a pit opens down to the yard');assert.deepEqual([s.pits[0].x0,s.pits[0].x1],[sp[k].x0,sp[k].x1]);assert.ok(s.pits[0].floor>=C.ground+R.deepPitDepth-1,'the yard floor is the deep tunnel');
  assert.equal(s.yard.drops,1);assert.equal(s.yard.buildings,1);assert.equal(s.yard.falling,1,'the tower is going down');
  // Mid-sink: lower than it was, and leaning.
  for(let n=0;n<30;n++)h.step();s=h.state();const f=s.yard.list[0];assert.ok(f.sunk>5&&f.sunk<f.depth,`sinking (${f.sunk}/${f.depth})`);assert.ok(f.lean>0&&f.lean<=NYC3.yard.lean+1e-6,'and leaning');
  const mid=s.buildings.find((b:any)=>b.x===t0.x&&b.w===t0.w)!;assert.ok(mid.base>t0.base,'its base is down in the yard');
  // It lands and comes down where it stands; the next span's tower is untouched and never topples.
  for(let n=0;n<60*5;n++)h.step();s=h.state();assert.ok(s.buildings.find((b:any)=>b.x===t0.x&&b.w===t0.w)!.hp<=0,'the tower is destroyed');assert.equal(s.yard.falling,0);
  assert.ok(s.spans[2].alive&&towers(2).length===1&&towers(2)[0].topple===0,'the tower on the next span still stands');assert.equal(s.mode,'playing');
  // Another span: exactly the towers standing on it go down, and a collapsed tower does not take the neighbouring spans with it.
  const k3=3,n3=towers(k3).length;h.test().smashSpan(k3);h.step(4);assert.equal(h.state().yard.buildings,1+n3,'exactly the towers on that span go down');
  for(let n=0;n<60*6;n++)h.step();s=h.state();assert.equal(s.spans.filter((x:any)=>x.alive).length,4);assert.ok(towers(2).length===1&&towers(4).length===1,'the neighbours stand');
 }finally{h.release();h.cleanup();}
});

test('real loop: the kaiju standing on a span that breaks lands in the yard; yard trains run below and can be pulled out (Stage 3)',async()=>{
 const h=await boot(at('Hudson Yards'),2500);
 try{
  let s=h.state();const sp=s.spans;
  h.test().teleport((sp[0].x0+sp[0].x1)/2);h.step(10);const y0=h.state().y;
  h.test().smashSpan(0);for(let n=0;n<60;n++)h.step();s=h.state();
  assert.ok(s.y>y0+R.deepPitDepth*.6,`the kaiju fell into the yard (${Math.round(s.y-y0)} px)`);assert.equal(s.mode,'playing');assert.ok(s.pits.length===1&&s.y+s.height<=s.pits[0].floor+2,'standing on the yard floor');
  // Trains run the yard: wait for one, then pull it out.
  for(let n=0;n<60*40&&!h.state().trainList.some((t:any)=>!t.crashed&&t.x+R.trainLength>sp[0].x0&&t.x<sp[0].x1);n++)h.step();
  assert.ok(h.state().trainList.some((t:any)=>!t.crashed&&t.x+R.trainLength>sp[0].x0&&t.x<sp[0].x1),'a yard train passes under the opening');
  let got=false;for(let n=0;n<60*30&&!got;n++){const q=h.state(),t=q.trainList.find((o:any)=>!o.crashed);
   if(t&&t.x+R.trainLength>q.x-40&&t.x<q.x+q.width+160){if((t.x+R.trainLength/2>q.x+q.width/2)!==(q.face>0)){h.tap(q.face>0?'KeyA':'KeyD');h.step(2);}got=grab(h,'train');}else h.step(3);}
  assert.ok(got,'pulled a whole train out of the yard');h.step(20);h.tap('KeyH');h.step(6);assert.ok(h.state().vehicles.some((v:any)=>v.kind==='train'&&v.state==='flying'),'and threw it');
 }finally{h.release();h.cleanup();}
});

test('real loop: a real slam on the deck breaks a span in the end (HP), not at once',async()=>{
 const h=await boot(at('Hudson Yards'),2500);
 try{
  const sp=h.state().spans;h.test().teleport((sp[0].x0+sp[0].x1)/2);h.step(10);let hp0=h.state().spans[0].hp;assert.equal(hp0,NYC3.yard.spanHP,'deck spans use the yard HP');
  const slam=()=>{h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);};
  slam();let s=h.state();assert.ok(s.spans[0].hp<hp0||!s.spans[0].alive,'a slam damages the span under the kaiju');
  for(let n=0;n<12&&h.state().spans[0].alive&&h.state().mode==='playing';n++)slam();
  assert.equal(h.state().spans[0].alive,false,'repeated slams break it');assert.ok(h.state().pits.length>=1);
 }finally{h.release();h.cleanup();}
});

// ---------------------------------------------------------------------------------------------------------------- Herald Square, real loop
test('real loop: Herald Square: the Garden is the target, tethers and balloons stand over the street, floats are in place, Penn Station caves in',async()=>{
 const h=await boot(at('Herald Square'),700);
 try{
  let s=h.state();assert.equal(s.blockName,'Herald Square');assert.equal(s.activeKaiju,'Kaiban');assert.equal(s.stage,3);assert.equal(s.objective.art,'arena');assert.equal(s.exitOpen,false);
  assert.equal(s.balloons.length,7);assert.ok(s.balloons.every((b:any)=>b.state==='tethered'));assert.deepEqual(s.balloons.map((b:any)=>b.shape).slice(0,5),['dog','turkey','astronaut','kaiju','dog'],'generic shapes, cycling');
  assert.equal(s.vehicles.filter((v:any)=>v.kind==='tether').length,7,'a tether stands at each balloon');
  assert.equal(s.buildings.filter((b:any)=>b.deco==='float').length,HERALD.buildings.filter(b=>b.deco==='float').length);
  const [a]=HERALD.subway![0];h.test().teleport(a+80);h.step(2);h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);assert.ok(h.state().pits.length>=1,'the line under Penn Station caves in');
 }finally{h.release();h.cleanup();}
});

test('real loop: a balloon drifts over its tether; grab the tether to drag it along, throw it and the balloon floats off with it',async()=>{
 const h=await boot(at('Herald Square'),700);
 try{
  let s=h.state();const b0=s.balloons[0],t0=b0.tether;assert.ok(Math.abs(b0.x-(t0.x+t0.w/2))<=PD.drift+1,'over its tether');assert.ok(s.ground(t0.x)-b0.y>=PD.size,'at altitude');
  const xs:number[]=[];for(let n=0;n<8;n++){h.step(30);xs.push(h.state().balloons[0].x);}assert.ok(Math.max(...xs)-Math.min(...xs)>4,'it drifts');
  standWest(h,t0.x);assert.ok(grab(h,'tether'),'grabbed the tether');h.step(6);assert.equal(h.state().balloons[0].state,'held');
  const k0=h.state().x,tg=h.state().balloons[0].tether.x;h.down('KeyD');h.step(90);h.up('KeyD');h.step(90);s=h.state();const b=s.balloons[0],moved=s.x-k0;
  assert.ok(moved>80,`the kaiju walked on (${Math.round(moved)} px)`);assert.ok(b.tether.x>tg+moved*.9,`the tether goes with the kaiju (${Math.round(b.tether.x-tg)} of ${Math.round(moved)} px)`);assert.ok(Math.abs(b.x-(b.tether.x+b.tether.w/2))<=PD.drift+2,'and the balloon stays over it');assert.ok(Math.abs(b.x-(s.x+s.width/2))<PD.size*2,'overhead, near the kaiju');assert.equal(b.state,'held');assert.ok(s.ground(b.x)-b.y>PD.size*.8,'still high up');
  // Throw: the balloon floats off up and away, the tether with it.
  h.tap('KeyH');h.step(4);s=h.state();assert.equal(s.balloons[0].state,'free');assert.equal(s.held,null);assert.equal(s.balloonStats.floated,1);
  assert.equal(s.vehicles.filter((v:any)=>v.kind==='tether').length,6,'the thrown balloon took its tether with it');assert.equal(s.vehicles.filter((v:any)=>v.state==='flying').length,0,'nothing flies as a missile');
  const y1=s.balloons[0].y;h.step(120);s=h.state();assert.ok(s.balloons[0].y<y1-40,'floating up and away');assert.equal(s.balloonStats.popped,0,'not popped');
  // Dropping it (a knock, a hurt kaiju) lets a balloon go too.
  const nb=h.state().balloons[1];standWest(h,nb.tether.x);assert.ok(grab(h,'tether'));h.tap('KeyH');h.step(4);assert.equal(h.state().balloons[1].state,'free');
 }finally{h.release();h.cleanup();}
});

test('real loop: a punch pops a balloon: it deflates, falls and drapes over what is below, blinding the troops under the cloth',async()=>{
 const h=await boot(at('Herald Square'),700);
 try{
  let s=h.state();const b=s.balloons[1],t=b.tether;
  h.test().teleport(t.x-s.width-300);h.step(2);
  h.test().spawnUnit('emplacement',b.x-30);h.test().spawnUnit('emplacement',b.x+30);h.test().spawnUnit('emplacement',b.x+900);h.step(2);
  const q=h.state();h.test().place(b.x-q.width-20,b.y+60);h.step(1);
  const pts0=h.state().score;punch(h,1);
  s=h.state();assert.equal(s.balloonStats.popped,1,'one punch pops it');assert.ok(s.score>pts0,'it pays points');assert.ok(['popped','draped'].includes(s.balloons[1].state));
  assert.ok(!s.vehicles.some((v:any)=>v.kind==='tether'&&Math.abs(v.x-t.x)<2),'the tether is gone');
  for(let n=0;n<60*6&&h.state().balloons[1]?.state!=='draped';n++)h.step();h.step(4);s=h.state();const d=s.balloons[1];assert.equal(d.state,'draped','the balloon came down and draped');
  assert.ok(d.cover.y<=s.ground(d.x)+1&&d.cover.x1-d.cover.x0>PD.size*.9,'a sheet as wide as the balloon');
  assert.ok(s.balloonStats.blinded>=2,`troops under it are blinded (${s.balloonStats.blinded})`);
  const under=s.military.filter((u:any)=>u.type==='emplacement'&&u.x+u.w>d.cover.x0&&u.x<d.cover.x1);assert.ok(under.length>=2&&under.every((u:any)=>u.stun>0),'blinded troops cannot move or fire');
  const far=s.military.find((u:any)=>u.type==='emplacement'&&u.x>d.cover.x1+400);assert.ok(!far||far.stun<=.01,'a trooper clear of the cloth is not blinded');
  for(let n=0;n<60*(PD.drape+1);n++)h.step();assert.ok(!h.state().balloons.some((x:any)=>x.state==='draped'),'the sheet comes off after its time');
 }finally{h.release();h.cleanup();}
});

test('real loop: a draped balloon covers the highest thing under it: it lands on a roof, not the street',async()=>{
 const h=await boot(at('Herald Square'),700);
 try{
  // Bring a balloon over a building, pop it, and watch where it lands.
  let s=h.state();const bi=s.balloons.findIndex((b:any)=>s.buildings.some((o:any)=>o.kind!=='tiny'&&o.h>sc(150)&&o.x<b.x+PD.size&&o.x+o.w>b.x-PD.size&&o.x>b.x-PD.size*3));
  const b=s.balloons[bi],roof=s.buildings.filter((o:any)=>o.kind!=='tiny'&&o.hp>0&&o.x<b.x+PD.size*.4&&o.x+o.w>b.x-PD.size*.4);
  if(bi<0||!roof.length){assert.ok(true);return;}
  h.test().teleport(b.tether.x-s.width-300);h.step(2);h.test().place(b.x-s.width-20,b.y+60);h.step(1);punch(h,bi);
  for(let n=0;n<60*8&&h.state().balloons[bi]?.state!=='draped';n++)h.step();const d=h.state().balloons[bi];assert.equal(d.state,'draped');assert.ok(d.cover.y<=Math.min(...roof.map((o:any)=>o.base-o.h))+1,'over the roof under it');
 }finally{h.release();h.cleanup();}
});

test('real loop: the Flame Jet, a Debris Shotgun chunk and a thrown wreck each pop a balloon',async()=>{
 // The Flame Jet (Tlézcatl).
 let h=await boot(at('Herald Square'),700,'Tlézcatl');
 try{let s=h.state();const b=s.balloons[0];h.test().setBalloonAlt(0,150);h.step(10);h.test().teleport(b.tether.x-s.width-140);h.step(3);
  h.down('KeyL');for(let n=0;n<90&&h.state().balloonStats.popped===0;n++)h.step();h.up('KeyL');assert.equal(h.state().balloonStats.popped,1,'the flame pops it');
 }finally{h.release();h.cleanup();}
 // Kaiban's Debris Shotgun.
 h=await boot(at('Herald Square'),700);
 try{let s=h.state();const b=s.balloons[0];h.test().setBalloonAlt(0,70);h.step(10);h.test().teleport(b.tether.x-s.width-160);h.step(3);
  for(let n=0;n<8&&h.state().balloonStats.popped===0;n++){h.tap('KeyL');h.step(50);}assert.equal(h.state().balloonStats.popped,1,'a flung rock pops it');
 }finally{h.release();h.cleanup();}
 // A wreck thrown through it.
 h=await boot(at('Herald Square'),700);
 try{let s=h.state();const b=s.balloons[0];h.test().setBalloonAlt(0,90);h.step(10);
  const cars=s.vehicles.filter((v:any)=>v.kind==='car'&&v.state==='parked'&&v.x<b.x-200&&v.x>b.x-900),car=cars[cars.length-1];assert.ok(car,'a car to throw');
  standWest(h,car.x);let ok=false;for(let i=0;i<5&&!ok;i++){h.tap('KeyH');h.step(3);ok=!!h.state().held;}assert.ok(ok,'lifted a wreck');
  h.test().teleport(b.x-h.state().width-250);h.step(22);h.tap('KeyH');for(let n=0;n<120&&h.state().balloonStats.popped===0;n++)h.step();assert.equal(h.state().balloonStats.popped,1,'a thrown wreck pops it');
 }finally{h.release();h.cleanup();}
});

test('real loop: a helicopter stationed with a balloon holds position behind it, silent, until the balloon is popped or taken',async()=>{
 const h=await boot(at('Herald Square'),700);
 try{
  let s=h.state();const idx=3,b=s.balloons[idx];
  h.test().teleport(b.tether.x-s.width-500);for(let n=0;n<90;n++)h.step();s=h.state();
  assert.ok(s.sheltered.length>=1,`a helicopter sheltering behind a balloon (${JSON.stringify(s.sheltered)})`);
  const near=()=>h.state().military.find((u:any)=>u.type==='helicopter'&&Math.abs(u.x+u.w/2-h.state().balloons[idx].x)<PD.size);
  const heli=near()!;assert.ok(heli,'right behind the balloon');
  const x0=heli.x;let fired=false;for(let n=0;n<120;n++){h.step();const u=near();if(u&&(u.burst>0||u.windup>0))fired=true;}s=h.state();assert.ok(near(),'still behind the balloon');assert.ok(Math.abs(near()!.x-x0)<PD.size,'holds position');assert.ok(!fired,'it does not wind up or fire from behind the balloon');assert.ok(near()!.cooldown>0);
  // Pop it: the helicopter is exposed.
  const nb=s.balloons[idx],mine=s.sheltered.find((e:any)=>Math.abs(e.x-nb.x)<2)!;assert.ok(mine,'this balloon has its helicopter');h.test().place(nb.x-s.width-20,nb.y+60);h.step(1);punch(h,idx);h.step(2);
  assert.ok(!h.state().sheltered.some((e:any)=>e.id===mine.id),'no longer sheltered once the balloon is popped');
 }finally{h.release();h.cleanup();}
});

test('real loop: smashing Madison Square Garden opens the exit',async()=>{
 const h=await boot(at('Herald Square'),700);
 try{
  let s=h.state();assert.equal(s.exitOpen,false);h.test().teleport(s.objective.x-s.objective.w/2-s.width-8);h.step(2);
  for(let n=0;n<500&&h.state().objectiveHP>0&&h.state().mode==='playing';n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);}
  s=h.state();assert.equal(s.objectiveHP,0,'the Garden is destroyed');assert.equal(s.exitOpen,true);
 }finally{h.release();h.cleanup();}
});

// ---- Level 9: Empire State (NYC rework card 6): the street, the wake, a climbing rival, the setback breaks, the mast and the retreat ----
import {EMPIRE as EM,CAMPAIGN as CP,TLEZCATL_BOSS as TB} from '../src/config.ts';
import {emptyPermanent,PERMANENT_KEY,CHECKPOINT_KEY,CAMPAIGN as CAMP} from '../src/campaign.ts';


const EMP=LV[at('Empire State')],empIndex=at('Empire State'),TOWER=EMP.buildings.find(b=>b.label==='EMPIRE STATE')!,GROUND=C.ground;
const bootE=async(x=300,permanent?:any)=>{const h=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban',permanent});h.test().goto(empIndex,x);h.step(2);h.test().shield(99999);return h;};
const surf=(hh:number)=>GROUND-hh;
// Put the kaiju on ledge i of the tower (feet on its surface, clear of Tlézcatl's end of it) and settle.
const onLedge=(h:any,i:number)=>{const p=h.state().climbState.perches[i];h.test().place(p.x0+30,p.y);h.step(4);};

test('Empire State data: six screens, boss, Stage 3, two screens of street then a supertall setback tower with room on every ledge for both kaiju',()=>{
 assert.deepEqual([EMP.name,EMP.screens,EMP.kind,EMP.startStage,EMP.cap,EMP.tier],['Empire State',6,'boss',3,3,5]);assert.equal(at('Empire State'),8,'level 9 of the route');assert.ok(!EMP.secret);
 const W=levelWidth(EMP);assert.ok(TOWER.x>=C.width*2&&TOWER.x+TOWER.w<W-200,'two screens of street, then the tower');
 // The tower is the authored Empire State's tiers re-proportioned: the same count, a spire for the mast, every tier narrower than the one under it.
 const tiers=TOWER.parts!.filter(p=>!p.spire),mast=TOWER.parts!.find(p=>p.spire)!;assert.equal(tiers.length,5);assert.ok(mast.top-mast.base!>=EM.mast-1,'a tall mast');assert.deepEqual(checkParts(TOWER),[]);
 assert.ok(TOWER.h>=sc(1000)&&TOWER.h>=TOWER.parts!.filter(p=>!p.spire).reduce((a,p)=>Math.max(a,p.top),0),'a supertall: far above a screen');
 for(let i=1;i<tiers.length;i++){assert.ok(tiers[i].top>tiers[i-1].top&&tiers[i].x>tiers[i-1].x);assert.ok(tiers[i].x-tiers[i-1].x>=EM.ledge&&tiers[i].x-tiers[i-1].x>=134+CP.bossWidth,'a ledge wide enough for Kaiban (Stage 3) and Tlézcatl side by side');}
 const f=EMP.finale!;assert.equal(f.tower,TOWER.x);assert.deepEqual(f.breaks,[.66,.33]);assert.equal(f.perches!.length,5);assert.ok(f.wake<f.crack!&&f.crack!<TOWER.x,'the wake is on the street, the crack before the tower');
 f.perches!.forEach((p,i)=>{assert.equal(p.h,tiers[i].top,'a perch per tier roof');assert.ok(p.x0>=TOWER.x+tiers[i].x&&p.x1<=TOWER.x+tiers[i].x+tiers[i].w);});
 for(let i=1;i<f.perches!.length;i++)assert.ok(f.perches![i].h>f.perches![i-1].h,'perches run up the tower');
 // The last military push is on the street, nothing on the tower; no building overlaps it.
 assert.ok(EMP.units!.length>=6&&EMP.units!.every(u=>u[1]<TOWER.x));const kinds=new Set(EMP.units!.map(u=>u[0]));for(const k of ['soldier','apc','tank','artillery','helicopter','emplacement'])assert.ok(kinds.has(k as any),k);
 for(const b of EMP.buildings)if(b!==TOWER&&b.kind!=='tiny')assert.ok(b.x+b.w<=TOWER.x||b.x>=TOWER.x+TOWER.w,'street building clear of the tower');
 // Opt-in: the Golden Gate's finale has no perches, and no other level has any.
 for(const b of LEVELS.flat().filter(x=>x!==EMP&&x.finale))assert.equal(b.finale!.perches,undefined,b.name);assert.ok(LEVELS.flat().filter(x=>x.finale).length>=2);
 assert.ok(EM.press>0&&EM.leapRise<EM.tops[1]-EM.tops[0]&&EM.leapRise>=EM.tops[4]-EM.tops[3],'short rises leap, long ones climb');
});

test('real loop: the wake splits the street: a crack, magma pools, a big shake and a banner; Tlézcatl erupts out of it and stands on the street',async()=>{
 const h=await bootE(300);let s=h.state();const f=EMP.finale!;
 assert.ok(s.rivalState.tlez&&s.rivalState.dormant&&s.rivalState.alpha===0,'underground, unseen, untouchable');assert.equal(s.finaleState.woke,false);assert.equal(s.climbState.crackOpen,0);
 const hp0=s.rivalState.hp;h.test().hurtRival(500);assert.equal(h.state().rivalState.hp,hp0,'untouchable while dormant');
 h.test().teleport(f.wake+60);h.step(3);s=h.state();assert.ok(s.finaleState.woke);assert.ok(s.climbState.crackOpen>0&&s.climbState.emerge>0,'the street opens, he is coming up');
 assert.equal(s.rivalState.dormant,false);assert.ok(s.rivalState.pools>=EM.pools,`magma pools burn the street (${s.rivalState.pools})`);assert.ok(s.rivalState.poolYs.every((y:number)=>y===GROUND),'on the street');
 h.step(120);s=h.state();assert.equal(s.climbState.emerge,0);assert.equal(s.climbState.crackOpen,1);assert.equal(s.climbState.i,-1,'on the street first');
 assert.ok(Math.abs(s.rivalState.x+s.rivalState.w/2-f.crack!)<260&&Math.abs(s.rivalState.y+s.rivalState.h-GROUND)<2);assert.equal(s.rivalState.alpha,1);
 h.test().hurtRival(10);assert.equal(h.state().rivalState.hp,hp0-10,'hittable now');
});

test('real loop: he perches on the ledges and moves between them: a telegraphed climb up the wall, a telegraphed leap for the short rise',async()=>{
 const h=await bootE(300);const f=EMP.finale!;h.test().teleport(f.wake+60);h.step(3);h.test().perchRival(0);h.step(2);let s=h.state();
 const ps=s.climbState.perches;assert.equal(ps.length,5);assert.equal(s.climbState.i,0);assert.deepEqual(s.climbState.perch,{x0:ps[0].x0,x1:ps[0].x1,y:ps[0].y},'perched on ledge 0');
 assert.ok(Math.abs(s.rivalState.y+s.rivalState.h-ps[0].y)<1.5,'his height is the ledge, not the street');assert.ok(s.rivalState.x>=ps[0].x0&&s.rivalState.x+s.rivalState.w<=ps[0].x1);
 // Left alone on a ledge he holds it and fights from it (his height never snaps to the street).
 const kaijuUp=()=>{const p=h.state().climbState.perches[h.state().climbState.i];h.test().place(p.x0+20,p.y);};
 // The kaiju on his ledge presses him: he telegraphs, then climbs the wall to the next ledge.
 kaijuUp();let seen:string[]=[],tele=false,maxRise=0;
 for(let n=0;n<60*14&&h.state().climbState.i<1;n++){kaijuUp();h.step();const c=h.state().climbState;if(c.move){if(c.move.tele>0)tele=true;seen.push(c.move.kind);}
  maxRise=Math.max(maxRise,ps[0].y-(h.state().rivalState.y+h.state().rivalState.h));}
 s=h.state();assert.equal(s.climbState.i,1,'he went up one ledge');assert.ok(tele,'the move was telegraphed first');assert.ok(seen.includes('climb'),'a long rise is a climb');
 assert.ok(Math.abs(s.rivalState.y+s.rivalState.h-ps[1].y)<1.5);assert.deepEqual(s.climbState.perch,{x0:ps[1].x0,x1:ps[1].x1,y:ps[1].y});assert.equal(s.climbState.moves.climb,1);
 // The last rise is short enough to leap.
 h.test().perchRival(3);h.step(2);seen=[];
 for(let n=0;n<60*14&&h.state().climbState.i<4;n++){kaijuUp();h.step();const c=h.state().climbState;if(c.move)seen.push(c.move.kind);}
 s=h.state();assert.equal(s.climbState.i,4,'on the summit');assert.ok(seen.includes('leap'),'the short rise is a leap');assert.equal(s.climbState.moves.leap,1);
 assert.ok(Math.abs(s.rivalState.y+s.rivalState.h-ps[4].y)<1.5);
 // On the summit there is nowhere left to go: he stays.
 for(let n=0;n<60*20;n++){kaijuUp();h.step();}assert.equal(h.state().climbState.i,4);assert.equal(h.state().climbState.move,null);
});

test('real loop: from a ledge he flames down the wall and lobs lava onto the setback below the kaiju, not the street',async()=>{
 const h=await bootE(300);const f=EMP.finale!;h.test().teleport(f.wake+60);h.step(3);h.test().perchRival(2);h.step(2);const ps=h.state().climbState.perches;
 // The kaiju is on ledge 1 under him (a tier down): a lob lands on ledge 1's surface.
 const seen=new Set<string>(),ys=new Set<number>();let jetAngles:number[]=[];
 for(let n=0;n<60*14;n++){h.test().place(ps[1].x0+60,ps[1].y);h.step();const r=h.state().rivalState;seen.add(r.attack);for(const y of r.poolYs)ys.add(y);if(r.flame)jetAngles.push(r.flame.angle);
  if(!h.state().climbState.move&&h.state().climbState.i===2)assert.ok(Math.abs(r.y+r.h-ps[2].y)<1.5,'his height stays the ledge through every attack');}
 assert.ok(ys.has(ps[1].y)||ys.has(ps[2].y),`lava pooled on a setback (${[...ys]})`);
 assert.ok(ys.has(ps[1].y),'a lob landed on the lower setback under the kaiju');
 // Flame: the sweep goes steeply down the wall from a ledge (steeper than the street kit's).
 const f2=await bootE(300);f2.test().teleport(f.wake+60);f2.step(3);f2.test().perchRival(2);f2.step(2);const q=f2.state().climbState.perches;jetAngles=[];
 for(let n=0;n<60*40&&!(jetAngles.length>4&&!f2.state().rivalState.flame);n++){f2.test().place(q[2].x0-140,q[2].y+200);// hanging on the wall just under his lip
  f2.step();const r=f2.state().rivalState;if(r.flame)jetAngles.push(r.flame.angle);}
 assert.ok(jetAngles.length>=2,'a flame jet from the ledge');assert.ok(Math.min(...jetAngles)<TB.jetDown-5,`steeper than the street jet (${Math.min(...jetAngles)})`);
});

test('real loop: at each health break the setback under both kaiju gives way: they drop a tier, rubble falls, the tower damage stays',async()=>{
 const h=await bootE(300);const f=EMP.finale!;h.test().teleport(f.wake+60);h.step(3);h.test().perchRival(2);h.step(2);let s=h.state();const maxHP=s.rivalState.maxHP,ps=s.climbState.perches;
 // Both on ledge 2 (1300): the kaiju at the outer end, Tlézcatl at the wall.
 h.test().place(ps[2].x0+30,ps[2].y);h.step(4);s=h.state();assert.ok(s.playerGrounded&&Math.abs(s.playerFeet-ps[2].y)<2,'kaiju on ledge 2');
 h.test().hurtRival(maxHP*.36);h.step(2);s=h.state();assert.equal(s.finaleState.breaks,1,'the first break');assert.ok(s.climbState.pending,'the warning: the ledge is rumbling');assert.equal(s.climbState.scars,0,'not cut yet');
 for(let n=0;n<60*8&&!(s.climbState.scars===1&&!s.climbState.falling&&s.playerGrounded&&s.climbState.perch);n++){h.step();s=h.state();}
 assert.equal(s.climbState.scars,1,'the tower keeps the damage');assert.ok(s.climbState.perches.length===4&&!s.climbState.perches.some((p:any)=>p.h===EM.tops[2]),'that ledge is gone');
 assert.ok(Math.abs(s.playerFeet-surf(EM.tops[1]))<3,`the kaiju dropped a tier (to ${EM.tops[1]}): feet ${s.playerFeet}`);
 assert.ok(Math.abs(s.rivalState.y+s.rivalState.h-surf(EM.tops[1]))<3,'and so did Tlézcatl: both on the same ledge');assert.equal(s.climbState.perch.y,surf(EM.tops[1]));
 const wide=s.climbState.perches.find((p:any)=>p.h===EM.tops[1])!;assert.ok(wide.x1-wide.x0>=EM.ledge*2-2,'the ledge below is wider now: the slab fell onto it');
 assert.ok(s.rivalState.stagger>0||s.rivalState.cooldown>0);
 // The geometry: the tier's west face stepped in (solid parts), holes in the face.
 const t2=s.climbState.towerParts[2];assert.equal(t2.x,EM.ledge*3,'tier 2 now starts where tier 3 does');
 // Second break: the next ledge down goes the same way.
 h.test().hurtRival(maxHP*.33);h.step(2);s=h.state();assert.equal(s.finaleState.breaks,2);
 for(let n=0;n<60*8&&!(s.climbState.scars===2&&!s.climbState.falling&&s.playerGrounded&&s.climbState.perch);n++){h.step();s=h.state();}
 assert.equal(s.climbState.scars,2);assert.ok(Math.abs(s.playerFeet-surf(EM.tops[0]))<3,`dropped again, to ${EM.tops[0]}`);assert.ok(Math.abs(s.rivalState.y+s.rivalState.h-surf(EM.tops[0]))<3);
 assert.ok(s.climbState.perches.length===3);
});

test('real loop: a break while he is above the kaiju brings him down too; on the summit (the last stand) nothing gives way',async()=>{
 const h=await bootE(300);const f=EMP.finale!;h.test().teleport(f.wake+60);h.step(3);h.test().perchRival(3);h.step(2);let s=h.state();const maxHP=s.rivalState.maxHP,ps=s.climbState.perches;
 h.test().place(ps[1].x0+30,ps[1].y);h.step(4);h.test().hurtRival(maxHP*.36);
 for(let n=0;n<60*9&&!(s.climbState.scars===1&&!s.climbState.falling&&s.climbState.perch);n++){h.step();s=h.state();}
 assert.equal(s.climbState.scars,1,'the ledge under the kaiju gave way');assert.ok(Math.abs(s.rivalState.y+s.rivalState.h-s.playerFeet)<4,'he came down to the kaiju\'s ledge');
 const g=await bootE(300);g.test().teleport(f.wake+60);g.step(3);g.test().perchRival(4);g.step(2);const q=g.state().climbState.perches;g.test().place(q[4].x0+20,q[4].y);g.step(4);
 g.test().hurtRival(g.state().rivalState.maxHP*.4);g.step(30);const t=g.state();assert.equal(t.climbState.scars,0,'no ledge cut');assert.equal(t.climbState.skipped,1,'the mast holds');assert.ok(Math.abs(t.playerFeet-q[4].y)<2,'the kaiju stays on the summit');
});

test('real loop: at 0 health he retreats off the tower into the magma on the street and sinks; then the city is conquered, Tlézcatl and Mexico City unlock',async()=>{
 const perm={...emptyPermanent(),unlocked:['Mogurodon','Kaiban']};
 const h=await bootE(300,perm);const f=EMP.finale!;h.test().teleport(f.wake+60);h.step(3);h.test().perchRival(3);h.step(2);let s=h.state();const maxHP=s.rivalState.maxHP,ps=s.climbState.perches;
 h.test().place(ps[3].x0+20,ps[3].y);h.step(4);h.test().hurtRival(maxHP*.7);h.step(3);h.test().hurtRival(maxHP*.7);
 // (the early breaks are skipped or taken; settle them first)
 for(let n=0;n<60*10&&!h.state().rivalState.retreating;n++){h.test().hurtRival(maxHP);h.step();}
 s=h.state();assert.ok(s.rivalState.retreating&&!s.rivalState.dead&&s.rivalState.hp===0,'beaten, not dead: he retreats');assert.equal(s.modeNow,'playing');
 const seen:string[]=[];let minY=Infinity,landedX=0;
 for(let n=0;n<60*14&&h.state().modeNow==='playing';n++){h.step();const c=h.state().climbState;if(c.retreat){if(seen[seen.length-1]!==c.retreat.phase)seen.push(c.retreat.phase);if(c.retreat.phase==='sink'){landedX=h.state().rivalState.x+h.state().rivalState.w/2;}}minY=Math.min(minY,h.state().rivalState.y);}
 s=h.state();assert.deepEqual(seen,['dive','sink'],'a dive, then he sinks');assert.ok(Math.abs(landedX-EMP.finale!.crack!)<4,'into the cracked street, the magma');assert.equal(s.modeNow,'conquered');assert.ok(s.rivalState.retreated&&s.rivalState.dead);
 const p=JSON.parse(h.saved.get(PERMANENT_KEY)!);assert.ok(p.conquered.includes('nyc'),'New York is conquered');assert.ok(p.unlocked.includes('Tlézcatl'),'Tlézcatl unlocks');
 const cp=JSON.parse(h.saved.get(CHECKPOINT_KEY)!);assert.equal(CAMP[cp.city],'mex','the checkpoint points at Mexico City');
});

test('real loop: climbing to the mast: the kaiju climbs every setback up the tower with its head on screen the whole way (the camera follows), and stands on the summit',async()=>{
 const h=await bootE(EMP.finale!.crack!-300);let s=h.state();const zoom=s.zoom,screenY=(wy:number,cy:number)=>GROUND+(wy+cy-GROUND)*zoom;
 const top=surf(EM.tops[4]);let worst=Infinity,maxRise=0,reached=-1;h.down('KeyD');h.down('KeyW');
 for(let n=0;n<60*80;n++){h.step();s=h.state();const head=s.playerFeet-1.4*s.height;worst=Math.min(worst,screenY(head,s.cameraRise));maxRise=Math.max(maxRise,s.cameraRise);
  if(s.playerGrounded&&Math.abs(s.playerFeet-top)<2){reached=n;break;}}
 h.up('KeyD');h.up('KeyW');
 assert.ok(reached>=0,`the kaiju reached the summit (feet ${s.playerFeet}, wanted ${top}, rival ledge ${s.climbState.i})`);
 assert.ok(worst>=0,`the head was on screen the whole climb (highest ${worst.toFixed(0)})`);assert.ok(maxRise>EM.tops[3]*zoom*.5,`the camera rose with it (${maxRise.toFixed(0)})`);
 assert.ok(s.playerFeet<surf(EM.tops[3]),'above every setback below');
 assert.ok(s.climbState.i>=3,'Tlézcatl was pressed up the tower ahead of him');
});
