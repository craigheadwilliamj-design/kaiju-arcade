import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';
import {createRampage,feedRampage,tickRampage,rampageLevel,rampageMult,pointsHeat,gridOf,substations,gridPowered,createRoofProps,roofBox,wireSpan} from '../src/city.ts';
import {createBuildings} from '../src/rules.ts';
import {LEVELS} from '../src/levels.ts';
import {CITY as Y,CONFIG as C} from '../src/config.ts';

test('rampage: heat climbs through the multiplier levels, holds for the grace period, then drains',()=>{
 const r=createRampage();assert.equal(rampageMult(r),1);
 assert.equal(feedRampage(r,Y.rampageLevels[1]+1),1,'crossing a threshold reports the new level');assert.equal(rampageMult(r),Y.rampageMult[1]);
 assert.equal(feedRampage(r,1),-1,'no report without a new level');
 feedRampage(r,500);assert.equal(r.heat,100,'capped');assert.equal(rampageLevel(r),Y.rampageLevels.length-1);assert.equal(rampageMult(r),4);
 tickRampage(r,Y.rampageGrace*.9);assert.equal(r.heat,100,'holds during grace');
 for(let n=0;n<600;n++)tickRampage(r,1/60);assert.equal(r.heat,0,'drains to nothing');assert.equal(r.peak,4,'remembers the best level');
 assert.ok(pointsHeat(10000)<=Y.gainMax&&pointsHeat(1400)>pointsHeat(100)&&pointsHeat(0)===0);
});

test('power grids: membership by x, a grid is live while its substation stands',()=>{
 const grids:[number,number][]=[[0,1000],[1000,2000]];
 assert.equal(gridOf(10,grids),0);assert.equal(gridOf(1000,grids),1);assert.equal(gridOf(2500,grids),-1);assert.equal(gridOf(10,undefined),-1);
 const bs=createBuildings([{x:100,w:90,h:60,hp:10,value:1,kind:'tiny',label:'',color:'#000',role:'substation'},{x:1500,w:90,h:60,hp:10,value:1,kind:'tiny',label:'',color:'#000',role:'substation'},{x:1700,w:100,h:300,hp:10,value:1,kind:'medium',label:'',color:'#000',roof:'radar'}]);
 const subs=substations(bs,grids);assert.deepEqual(gridPowered(subs),[true,true]);bs[1].hpNow=0;assert.deepEqual(gridPowered(subs),[true,false]);
 const [radar]=createRoofProps(bs,grids);assert.equal(radar.kind,'radar');assert.equal(radar.grid,1);
 const box=roofBox(radar);assert.equal(box.y+box.h,C.ground-300,'sits on the roof');assert.ok(box.x>=1700&&box.x+box.w<=1800);
 assert.deepEqual(wireSpan([100,300,500],1),[100,500]);const [a,z]=wireSpan([100,300,500],0);assert.ok(a<100&&z===300);
});

test('Lower Manhattan is the city-systems pilot: two powered grids, depots, radars, water towers, poles',()=>{
 const b=LEVELS[0][0];assert.equal(b.name,'Lower Manhattan');assert.equal(b.grids!.length,2);
 const subs=substations(b.buildings as any,b.grids);assert.ok(subs.every(Boolean),'each grid has a substation');
 assert.equal(b.buildings.filter(x=>x.role==='depot').length,2);
 assert.ok(b.buildings.filter(x=>x.roof==='radar').length>=2&&b.buildings.filter(x=>x.roof==='tank').length>=4);
 for(const x of b.buildings.filter(x=>x.role))assert.equal(x.kind,'tiny','utility yards never wall off the street');
 assert.ok(b.poles!.length>=10);for(const g of [0,1])assert.ok(b.poles!.filter(x=>gridOf(x,b.grids)===g).length>=5,`grid ${g} has a pole line`);
 for(const x of b.buildings.filter(x=>x.roof))assert.ok(x.kind!=='tiny'&&!x.landmark);
 // Only the pilot block carries the systems for now.
 assert.ok(LEVELS.flat().filter(x=>x.grids).length===1);
});

async function manhattan(){const h=await bootGame(.75);
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='CTY';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');h.click('#begin-city');
 assert.equal(h.state().mode,'playing');return h;}

test('real loop: walking through a power pole on a live grid drops an arcing wire; the rampage gauge fills and drains',async()=>{
 const h=await manhattan();
 try{
  const s0=h.state();assert.deepEqual(s0.power,[true,true]);assert.equal(s0.wires,0);assert.ok(s0.poles.every((p:any)=>p.upright));
  for(let n=0;n<240&&!h.state().poles.some((p:any)=>p.snapped);n++){h.down('KeyA');h.step(1);}h.up('KeyA');
  const s=h.state();assert.ok(s.poles.some((p:any)=>p.snapped&&!p.upright),'a pole went down');assert.equal(s.wires,1,'its wire is live on the street');
  assert.ok(s.rampage.heat>0,'the downed pole feeds the rampage');
  h.step(Math.round((Y.wireSeconds+.5)*60));assert.equal(h.state().wires,0,'the wire burns out');
  assert.ok(h.state().rampage.heat<s.rampage.heat,'heat drains when nothing is happening');
 }finally{h.release();h.cleanup();}
});

test('real loop: a destroyed tower creaks (still solid) before it topples',async()=>{
 const h=await manhattan();
 try{
  const start=h.state(),i=start.buildings.findIndex((b:any)=>b.x>start.x+start.width&&b.kind!=='tiny');const tower=start.buildings[i];
  assert.ok(tower.h>=280,'the first building east of the plaza is tall enough to topple');
  for(let n=0;n<200&&h.state().x+h.state().width<tower.x-2;n++){h.down('KeyD');h.step(1);}h.up('KeyD');
  const heavy=()=>{h.down('KeyK');h.step(20);h.up('KeyK');};
  for(let n=0;n<40&&h.state().buildings[i].hp>0;n++){heavy();h.step(30);}
  let s=h.state();assert.equal(s.buildings[i].hp,0);
  let creaked=false,toppled=false;
  for(let n=0;n<160&&s.buildings[i].topple!==2;n++){if(s.creaking>0&&s.buildings[i].topple===0){creaked=true;assert.equal(toppled,false);}if(s.buildings[i].topple===1)toppled=true;h.step();s=h.state();}
  assert.ok(creaked,'it creaked first');assert.ok(toppled,'then fell');assert.equal(s.buildings[i].topple,2);
  assert.ok(s.rampage.heat>0,'the destruction fed the rampage');
 }finally{h.release();h.cleanup();}
});

test('real loop: a powered rooftop radar in range builds a call and marks an artillery strike',async()=>{
 const h=await manhattan();
 try{
  let peak=0,reset=false;
  for(let n=0;n<Math.round((Y.radarCall+2)*60);n++){h.step();const r=h.state().roofs.filter((p:any)=>p.kind==='radar'&&!p.dead).map((p:any)=>p.call);const c=Math.max(...r);
   if(c<peak-5)reset=true;peak=Math.max(peak,c);}
  assert.ok(peak>Y.radarCall*.9,`the radar near the plaza built its call (${peak.toFixed(1)}s)`);assert.ok(reset,'and fired, starting over');
 }finally{h.release();h.cleanup();}
});

test('real loop: smash east to the substation (blackout kills its radar) and west to a fuel depot (it explodes)',async()=>{
 const h=await manhattan();
 try{
  const seen=new Set<string>();const watch=()=>{const b=h.state().banner;if(b)seen.add(b);};
  const hold=(code:string,frames:number)=>{h.down(code);for(let n=0;n<frames;n++){h.step();watch();}h.up(code);};
  const sweep=(fwd:string,back:string,done:()=>boolean,limit:number)=>{for(let n=0;n<limit&&h.state().mode==='playing'&&!done();n++){
   if(h.state().ultimate>=100&&h.state().transform===0)h.tap('KeyU');
   hold(fwd,8);h.tap('KeyK');hold(fwd,0);for(let k=0;k<40;k++){h.step();watch();}hold(back,1);h.tap('KeyK');for(let k=0;k<40;k++){h.step();watch();}hold(fwd,3);}};
  sweep('KeyD','KeyA',()=>!h.state().power[1],140);
  let s=h.state();assert.deepEqual(s.power,[true,false],'east grid down, west still live');assert.ok(seen.has('BLACKOUT · EAST GRID DOWN'),[...seen].join(', '));
  const eastRadar=s.roofs.find((p:any)=>p.kind==='radar'&&p.x>s.worldWidth/2);
  assert.ok(eastRadar.dead||eastRadar.call===0,'the east radar is wrecked or offline');
  for(let n=0;n<120;n++)h.step();assert.ok(h.state().roofs.find((p:any)=>p.kind==='radar'&&p.x>s.worldWidth/2).call===0,'and never builds a call in the dark');
  const depot=()=>h.state().roles.find((r:any)=>r.role==='depot'&&r.x<s.worldWidth/2);
  sweep('KeyA','KeyD',()=>depot().hp<=0,200);
  assert.equal(depot().hp,0);for(let n=0;n<5;n++){h.step();watch();}assert.ok(seen.has('FUEL DEPOT EXPLODED'),[...seen].join(', '));
 }finally{h.release();h.cleanup();}
});
