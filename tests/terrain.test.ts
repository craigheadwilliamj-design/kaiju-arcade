import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';
import {setTerrain,groundAt,groundUnder,profileFrom,slopeAt} from '../src/terrain.ts';
import {createBuildings,wearFloor,floorAt,floorHeightOf} from '../src/rules.ts';
import {LEVELS,DRILL_BLOCK,cityIndexOf} from '../src/levels.ts';
import {CONFIG as C,FLOORS} from '../src/config.ts';

test('terrain: flat by default, piecewise-linear profiles, highest point under a footprint',()=>{
 setTerrain(null);assert.equal(groundAt(-50),C.ground);assert.equal(groundAt(1e5),C.ground);
 setTerrain([[100,435],[200,385],[300,385],[400,455]]);
 assert.equal(groundAt(0),435,'flat before the first point');assert.equal(groundAt(150),410);assert.equal(groundAt(250),385);assert.equal(groundAt(999),455,'flat after the last');
 assert.equal(groundUnder(150,200),385,'a span rests on its highest ground');assert.ok(slopeAt(150)>0&&slopeAt(350)<0);
 assert.deepEqual(profileFrom([[0,0],[10,20]],1.4),[[0,C.ground],[14,C.ground-28]]);
 const [b]=createBuildings([{x:210,w:60,h:200,hp:100,value:1,kind:'medium',label:'',color:'#000'}]);assert.equal(b.base,385,'buildings stand on the ground under them');
 setTerrain(null);
});

test('Midtown has a sunken start plaza and a raised terrace; buildings stay on flat ground',()=>{
 const b=LEVELS[cityIndexOf('nyc-classic')][1];assert.equal(b.name,'Midtown Corridor');assert.ok(b.ground);setTerrain(b.ground!);
 assert.ok(groundAt(b.start!)>C.ground+20,'the start plaza is sunken');
 const bs=createBuildings(b.buildings);const raised=bs.filter(x=>x.base<C.ground);assert.ok(raised.length>=3,'a cluster stands on the terrace');
 for(const x of bs)if(x.kind!=='tiny')assert.equal(groundAt(x.x),groundAt(x.x+x.w),`${x.x}: footprint is flat`);
 assert.deepEqual(LEVELS.flat().filter(x=>x.ground).map(x=>x.name),['Embarcadero','Nob Hill',"Fisherman's Wharf",'The Fault','Bay Bridge','Golden Gate','Alcatraz','The Battery','Central Park','Coney Island','Templo Mayor','Chapultepec','Estadio Azteca','Xochimilco','Kowloon Streets','Nathan Road','Victoria Assault','Midtown Corridor','East River Offensive','The Rocks','Harbour Bridge Assault']);
 // Hong Kong's open blocks climb a hillside; every building still stands on flat ground.
 // Street junk may sit on a gentle slope.
 for(const hk of LEVELS[cityIndexOf('hkg')].filter(x=>x.ground)){setTerrain(hk.ground!);const bs=createBuildings(hk.buildings);assert.ok(Math.min(...bs.map(x=>x.base))<C.ground-100,`${hk.name} climbs`);
  for(const x of bs.filter(x=>!x.prop))assert.equal(groundAt(x.x+1),groundAt(x.x+x.w-1),`${hk.name} ${x.x}: flat footprint`);}
 // Sydney's terraces are gentle (half Hong Kong's rises), with every footprint still flat.
 for(const sy of LEVELS[cityIndexOf('syd')].filter(x=>x.ground)){setTerrain(sy.ground!);const bs=createBuildings(sy.buildings);const top=Math.min(...bs.map(x=>x.base));assert.ok(top<C.ground-40&&top>C.ground-100,`${sy.name} climbs gently`);
  for(const x of bs.filter(x=>!x.prop))assert.equal(groundAt(x.x+1),groundAt(x.x+x.w-1),`${sy.name} ${x.x}: flat footprint`);}
 setTerrain(b.ground!);assert.ok(!DRILL_BLOCK.ground,'drills stay flat');
 setTerrain(null);
});

test('floors: tall buildings are stacks, a worn floor pancakes the ones above or is knocked off the top',()=>{
 const [b,small]=createBuildings([{x:0,w:100,h:FLOORS.floorHeight*6,hp:600,value:1,kind:'medium',label:'',color:'#000'},{x:0,w:30,h:40,hp:20,value:1,kind:'tiny',label:'',color:'#000'}]);
 assert.equal(b.floors.length,6);assert.equal(small.floors.length,0,'tiny structures are not stacked');
 assert.equal(b.floorMax,600/6*FLOORS.integrity);assert.equal(floorAt(b,10),0);assert.equal(floorAt(b,b.h-1),5);
 b.holes.push({x:20,y:FLOORS.floorHeight*3.5,r:8,seed:1},{x:20,y:10,r:8,seed:2});
 assert.equal(wearFloor(b,b.floorMax-1,10),null,'holds until its integrity is gone');
 const h0=b.h;assert.equal(wearFloor(b,1,10),'pancake');assert.equal(b.floors.length,5);assert.equal(b.h,h0-FLOORS.floorHeight);
 assert.deepEqual(b.holes.map(o=>o.y),[FLOORS.floorHeight*2.5],'holes in the lost floor go, those above drop a storey');
 assert.equal(wearFloor(b,1e9,b.h-1),'top');assert.equal(b.floors.length,4);
 b.floors=[5];assert.equal(wearFloor(b,1e9,1),null,'the last floor never fails on its own: HP decides');
});

test('real loop: undercutting a tower pancakes floors on the way down, and it still topples',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#drills');h.click('#start');
  const i=1,heavy=()=>{h.down('KeyK');h.step(20);h.up('KeyK');};
  assert.ok(DRILL_BLOCK.buildings[i].h>=280);const f0=h.state().buildings[i].floors,h0=h.state().buildings[i].h;
  for(let n=0;n<200&&h.state().x+h.state().width<h.state().buildings[i].x-2;n++){h.down('KeyD');h.step(1);}h.up('KeyD');
  for(let n=0;n<30&&h.state().buildings[0].hp>0;n++){h.step(40);heavy();}
  for(let n=0;n<120&&h.state().x+h.state().width<h.state().buildings[i].x-2;n++){h.down('KeyD');h.step(1);}h.up('KeyD');
  let pancaked=false;
  for(let n=0;n<60&&h.state().buildings[i].hp>0;n++){h.step(40);heavy();const b=h.state().buildings[i];if(b.hp>0&&b.floors<f0){pancaked=true;assert.ok(b.h<h0,'shorter after a floor gave out');}}
  assert.ok(pancaked,'a floor gave out before the tower fell');
  let s=h.state();for(let n=0;n<200&&s.buildings[i].topple!==2;n++){h.step();s=h.state();}
  assert.equal(s.buildings[i].topple,2,'still tall enough to topple');
 }finally{h.release();h.cleanup();}
});

test('real loop: Midtown spawns in the sunken plaza and walks up out of it',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Mogurodon'});
 try{
  
  const hold=(code:string,frames:number)=>{h.down(code);h.step(frames);h.up(code);};
  const sweep=(fwd:string,back:string,limit:number)=>{for(let n=0;n<limit&&h.state().mode==='playing';n++){
   if(h.state().ultimate>=100&&h.state().transform===0)h.tap('KeyU');hold(fwd,8);h.tap('KeyK');h.step(40);hold(back,1);h.tap('KeyK');h.step(40);hold(fwd,3);}};
  sweep('KeyD','KeyA',120);sweep('KeyA','KeyD',200);assert.equal(h.state().mode,'results','Lower Manhattan cleared');
  h.click('#advance');let s=h.state();assert.equal(s.mode,'playing');assert.equal(s.blockIndex,1);
  for(let n=0;n<30;n++)h.step();s=h.state();
  const feet=s.y+s.height;assert.ok(feet>C.ground+20,`feet in the sunken plaza (${feet})`);
  // Walking east the feet follow the ramp up (a Stage 3 body meets the next building partway up it).
  let top=feet,steps=0;for(let n=0;n<200;n++){h.down('KeyD');h.step(1);const q=h.state();top=Math.min(top,q.y+q.height);if(q.grounded&&q.y+q.height<feet-1)steps++;}h.up('KeyD');
  assert.ok(top<feet-20,`climbed the ramp out of the plaza (${feet} -> ${top})`);assert.ok(steps>3,'grounded on the slope, not hopping');
  for(let n=0;n<20;n++)h.step();assert.equal(h.state().grounded,true);
 }finally{h.release();h.cleanup();}
});
