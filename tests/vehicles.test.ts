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
  for(let n=0;n<240&&h.state().vehicles.find((v:any)=>v.id===car.id).state==='flying';n++)h.step();
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
  const before=h.state().score;h.tap('KeyH');h.step(1);
  let s=h.state();assert.equal(s.held,'stand');assert.equal(s.buildings[standIndex].hp,0);assert.equal(s.buildings[standIndex].lifted,true);assert.ok(s.score>before,'lifting pays the building value');
  h.tap('KeyH');h.step(1);assert.equal(h.state().held,null);
  s=h.state();assert.ok(s.vehicles.some((v:any)=>v.kind==='stand'&&v.state==='flying'),'stand thrown');
 }finally{h.release();h.cleanup();}
});
