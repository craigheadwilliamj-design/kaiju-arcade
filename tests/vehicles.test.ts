import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';
import {createParked,spawnTraffic,tickDriving,tickFlying,launch} from '../src/vehicles.ts';
import {CONFIG as C,VEHICLES as V} from '../src/config.ts';

test('a launched vehicle flies, bounces and settles as a wreck on the street',()=>{
 const [v]=createParked([500]);launch(v,300,-300,40);assert.equal(v.state,'flying');
 let bounced=false,lastVy=v.vy;for(let n=0;n<600&&v.state==='flying';n++){tickFlying(v,1/60,4000);if(lastVy>0&&v.vy<0)bounced=true;lastVy=v.vy;}
 assert.equal(v.state,'wreck');assert.ok(bounced,'bounced at least once');assert.ok(v.x>500);assert.equal(v.y,C.ground-v.h);
 assert.ok(v.angle===0||v.angle===Math.PI,'rests on its wheels or roof');
});

test('traffic cruises, brakes when the kaiju is ahead, then U-turns and flees faster',()=>{
 const v=spawnTraffic(1,0,1,()=>.5);assert.equal(v.state,'driving');assert.equal(v.lane,0);const cruise=v.speed;
 const kaiju=v.x+v.w/2+V.panicRange-10;
 for(let n=0;n<10;n++)tickDriving(v,1/60,kaiju+1000);assert.equal(v.panic,0,'no panic while far away');
 for(let n=0;n<600&&v.panic!==2;n++)tickDriving(v,1/60,v.x+v.w/2+V.panicRange-10);
 assert.equal(v.panic,2);assert.equal(v.dir,-1,'turned around');
 for(let n=0;n<300;n++)tickDriving(v,1/60,v.x+5000);assert.ok(v.speed>cruise,'flees faster than it cruised');
 const w=spawnTraffic(2,1000,-1,()=>.99);assert.equal(w.lane,1);assert.equal(w.kind,'car');assert.ok(w.x>1000+C.width);
});

test('real loop: traffic drives by; grab a parked car with H and throw it into a building',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#new');h.click('#skip-intro');h.node('#initials').value='CAR';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');h.click('#begin-city');
  const s0=h.state(),car=s0.vehicles.find((v:any)=>v.x===2000)!;assert.equal(car.state,'parked');
  // Close in until the car is within reach but not underfoot, then grab.
  for(let n=0;n<40&&h.state().x+h.state().width+30<car.x;n++){h.down('KeyD');h.step(1);h.up('KeyD');}
  h.tap('KeyH');h.step(1);assert.equal(h.state().held,'car');
  const carried=h.state().vehicles.find((v:any)=>v.id===car.id)!;assert.equal(carried.state,'held');assert.ok(carried.y<h.state().y,'carried overhead');
  const target=h.state().buildings.find((b:any)=>b.x===2120)!;
  h.tap('KeyH');h.step(1);assert.equal(h.state().held,null);assert.equal(h.state().vehicles.find((v:any)=>v.id===car.id).state,'flying');
  assert.equal(h.state().vehicles.find((v:any)=>v.id===car.id).thrown,true,'armed to detonate');
  let blew=false;for(let n=0;n<240&&h.state().vehicles.find((v:any)=>v.id===car.id).state==='flying';n++){h.step();const v=h.state().vehicles.find((v:any)=>v.id===car.id);if(!blew&&!v.thrown){blew=true;assert.ok(v.burn>0,'detonated into a burning wreck');assert.ok(h.state().hitstop>0,'the blast freezes the frame');}}
  assert.ok(blew,'the thrown car detonated on impact');
  assert.ok(h.state().buildings.find((b:any)=>b.x===2120).hp<target.hp,'thrown car damaged the building');
  assert.equal(h.state().vehicles.find((v:any)=>v.id===car.id).state,'wreck');
  // Traffic arrives from off-screen over the next few seconds.
  h.step(60*8);assert.ok(h.state().vehicles.some((v:any)=>v.traffic),'traffic spawned');
 }finally{h.release();h.cleanup();}
});

test('capturing an enemy ground vehicle takes it out of the fight, pays its kill points, leaves no wreck or crystals',async()=>{
 const {createMilitary,spawnUnit,captureUnit,UNITS}=await import('../src/military.ts');const {makeProp,mass}=await import('../src/vehicles.ts');
 const s=createMilitary(3,0,()=>.5);const tank=spawnUnit(s,'tank',600),heli=spawnUnit(s,'helicopter',700),gun=spawnUnit(s,'emplacement',800);
 assert.equal(captureUnit(s,heli),false,'aircraft cannot be grabbed');assert.equal(captureUnit(s,gun),false,'fixed guns cannot be grabbed');
 assert.equal(captureUnit(s,tank),true);assert.equal(tank.hp,0);assert.equal(captureUnit(s,tank),false,'only once');
 assert.deepEqual(s.events.map((e:any)=>[e.kind,e.points,e.shards]),[['reward',UNITS.tank.points,0]]);assert.equal(s.wrecks.length,0);
 const prop=makeProp(1,'tank',600,'#000');assert.equal(prop.state,'held');assert.equal(prop.rewarded,true);assert.ok(mass(prop)>3,'tanks are heavy');
});

test('real loop: lift the newsstand whole (it counts as destroyed, leaves no rubble) and throw it',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#new');h.click('#skip-intro');h.node('#initials').value='NWS';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');h.click('#begin-city');
  const shopIndex=h.state().buildings.findIndex((b:any)=>b.x===1600),standIndex=h.state().buildings.findIndex((b:any)=>b.x===1470&&b.kind==='tiny');assert.ok(standIndex>=0);
  // Face west and smash the shop between the start plaza and the newsstand.
  h.down('KeyA');h.step(30);h.up('KeyA');
  for(let n=0;n<40&&h.state().buildings[shopIndex].hp>0;n++){h.down('KeyK');h.step(15);h.up('KeyK');h.step(30);h.down('KeyA');h.step(4);h.up('KeyA');}
  assert.equal(h.state().buildings[shopIndex].hp,0);h.step(60);
  // Close in until the stand is in reach but not underfoot, then lift it.
  for(let n=0;n<200&&h.state().x-30>1470+32;n++){h.down('KeyA');h.step(1);h.up('KeyA');}
  // Parked rows stand beside the newsstand: a grab may come up with a car first, so throw those away until it is the stand.
  let before=0;for(let n=0;n<6;n++){before=h.state().score;h.tap('KeyH');h.step(1);if(h.state().held==='stand'||!h.state().held)break;h.tap('KeyH');h.step(40);}
  let s=h.state();assert.equal(s.held,'stand');assert.equal(s.buildings[standIndex].hp,0);assert.equal(s.buildings[standIndex].lifted,true);assert.ok(s.score>before,'lifting pays the building value');
  h.tap('KeyH');h.step(1);assert.equal(h.state().held,null);
  s=h.state();assert.ok(s.vehicles.some((v:any)=>v.kind==='stand'&&v.state==='flying'),'stand thrown');
 }finally{h.release();h.cleanup();}
});

test('lampposts stand at the old backdrop spacing and uproot into a flat javelin',async()=>{
 const {createLamps,uproot,upright}=await import('../src/vehicles.ts');
 const lamps=createLamps(3840,500);assert.deepEqual(lamps.slice(0,3).map(l=>l.x+2),[V.lampSpacing,V.lampSpacing*2,V.lampSpacing*3]);
 const l=lamps[0];assert.equal(upright(l),true);assert.equal(l.y+l.h,C.ground);const cx=l.x+l.w/2;
 uproot(l);assert.equal(upright(l),false);assert.ok(l.w>l.h);assert.equal(l.x+l.w/2,cx,'rotated about its centre');assert.ok(l.y+l.h<=C.ground);
 uproot(l);assert.ok(l.w>l.h,'uprooting twice is a no-op');
});

test('real loop: rip a lamppost out with H and throw it point-first',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#new');h.click('#skip-intro');h.node('#initials').value='LMP';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');h.click('#begin-city');
  const lamp=h.state().vehicles.find((v:any)=>v.kind==='lamp'&&v.x===1798)!;assert.equal(lamp.state,'parked');
  for(let n=0;n<60&&h.state().x-30>lamp.x+lamp.w;n++){h.down('KeyA');h.step(1);h.up('KeyA');}
  h.tap('KeyH');h.step(1);assert.equal(h.state().held,'lamp');
  const carried=h.state().vehicles.find((v:any)=>v.id===lamp.id)!;assert.ok(carried.w>carried.h,'carried lengthwise');
  h.tap('KeyH');h.step(6);const flying=h.state().vehicles.find((v:any)=>v.id===lamp.id)!;assert.equal(flying.state,'flying');
  assert.ok(Math.abs(Math.abs(flying.angle)-Math.PI)<.6,`thrown west, pointing along its flight (angle ${flying.angle})`);
 }finally{h.release();h.cleanup();}
});

test('only Stage 3 can lift buildings up to mid-rise size; landmarks and towers stay put',async()=>{
 const {createBuildings,liftable}=await import('../src/rules.ts');
 const [deli,hotel,landmark,stand]=createBuildings([{x:0,w:64,h:82,hp:60,value:70,kind:'medium',label:'DELI',color:'#577b84'},{x:200,w:130,h:330,hp:420,value:290,kind:'medium',label:'HOTEL',color:'#8b7688'},
  {x:400,w:80,h:120,hp:90,value:100,kind:'medium',label:'HALL',color:'#8b7688',landmark:true},{x:600,w:32,h:42,hp:20,value:20,kind:'tiny',label:'NEWS',color:'#ca9a50'}]);
 for(const stage of [1,2])assert.equal(liftable(deli,stage),false,`Stage ${stage} cannot lift the deli`);
 assert.equal(liftable(deli,3),true);assert.equal(liftable(hotel,3),false,'too tall');assert.equal(liftable(landmark,3),false,'landmarks are never lifted');
 assert.equal(liftable(stand,1),true,'newsstands stay liftable at every stage');
 const [mid]=createBuildings([{x:0,w:112,h:240,hp:300,value:220,kind:'medium',label:'DELI',color:'#b36d57'}]);
 assert.equal(liftable(mid,2),false);assert.equal(liftable(mid,3),true,'Stage 3 rips up a full mid-rise');
});


test('real loop: a thrown car flies far down an open street and detonates when it lands',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#new');h.click('#skip-intro');h.node('#initials').value='FAR';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');h.click('#begin-city');
  const car=h.state().vehicles.find((v:any)=>v.x===2000)!;
  for(let n=0;n<40&&h.state().x+h.state().width+30<car.x;n++){h.down('KeyD');h.step(1);h.up('KeyD');}
  h.tap('KeyH');h.step(1);assert.equal(h.state().held,'car');
  // Turn round (west is open street back to the start) and throw.
  h.down('KeyA');h.step(1);h.up('KeyA');const from=h.state().vehicles.find((v:any)=>v.id===car.id).x;
  h.tap('KeyH');let landed=0;
  for(let n=0;n<240;n++){h.step();const v=h.state().vehicles.find((v:any)=>v.id===car.id);if(!v.thrown){landed=v.x;break;}}
  assert.ok(landed,'detonated on landing');assert.ok(from-landed>200,`flew ${Math.round(from-landed)}px`);
 }finally{h.release();h.cleanup();}
});

test('real loop: punting a parked car hits like a military kill: hit-stop, fire, a burning tumble',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#new');h.click('#skip-intro');h.node('#initials').value='PNT';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');h.click('#begin-city');
  const car=h.state().vehicles.find((v:any)=>v.x===2000)!;
  for(let n=0;n<40&&h.state().x+h.state().width+30<car.x;n++){h.down('KeyD');h.step(1);h.up('KeyD');}
  let hit=false;for(let n=0;n<40&&!hit;n++){h.tap('KeyJ');for(let f=0;f<20&&!hit;f++){h.step();const v=h.state().vehicles.find((v:any)=>v.id===car.id);if(v.state==='flying'){hit=true;assert.ok(v.burn>0,'on fire');}}}
  assert.ok(hit,'punted');assert.ok(h.state().hitstop>0||h.state().fireballs>0,'it landed with weight');
 }finally{h.release();h.cleanup();}
});

test('each authored parked spot becomes a bumper-to-bumper row, originals keep their ids and kinds',async()=>{
 const xs=[200,1000,1800,2600],cars=createParked(xs);assert.equal(cars.length,xs.length*(1+V.parkedRow));
 xs.forEach((x,i)=>{assert.equal(cars[i].id,i+1);assert.equal(cars[i].x,x);assert.equal(cars[i].kind,i%4===3?'van':'car');});
 assert.equal(new Set(cars.map(c=>c.id)).size,cars.length,'unique ids');assert.ok(cars.every(c=>c.id<500),'below the lamppost ids');
 for(const c of cars)for(const o of cars)if(c!==o&&c.lane===o.lane)assert.ok(c.x+c.w<=o.x||o.x+o.w<=c.x,'no overlap within a lane');
 assert.ok(cars.some(c=>c.kind==='bus')&&cars.some(c=>c.kind==='van'),'mixed row');
});
