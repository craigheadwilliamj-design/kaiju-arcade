import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';
import {LEVELS,DRILL_BLOCK,levelWidth} from '../src/levels.ts';
import {CONFIG} from '../src/config.ts';

test('open districts in every city: mid-map start plaza, named landmarks, hidden caches; drills keep the packed wall',()=>{
 assert.deepEqual(LEVELS[0].filter(b=>b.start!==undefined).map(b=>b.name),['Lower Manhattan','Midtown Corridor','East River Offensive']);
 // Every city: blocks 1, 2 and 4 are open layouts.
 for(const city of LEVELS)assert.deepEqual(city.map(b=>b.start!==undefined),[true,true,false,true,false]);
 const open=LEVELS.flat().filter(b=>b.start!==undefined);
 for(const b of open){
  assert.equal(b.kind,'district');assert.equal(b.start,levelWidth(b)/2);
  for(const x of b.buildings)if(x.kind!=='tiny')assert.ok(x.x>=b.start!+80||x.x+x.w<=b.start!-80,`${b.name}: start plaza clear`);
  const marks=b.buildings.filter(x=>x.landmark);assert.ok(marks.length>=2,`${b.name} has landmarks`);
  for(const m of marks){assert.ok(m.label.length>0);assert.equal(m.kind,'large');}
  assert.ok(b.buildings.some(x=>x.cache&&!x.landmark),`${b.name} hides a cache`);
  // Clusters, not one wall: there are real street/plaza gaps between solid buildings.
  const solid=b.buildings.filter(x=>x.kind!=='tiny').sort((p,q)=>p.x-q.x);
  const gaps=solid.slice(1).filter((x,i)=>x.x-(solid[i].x+solid[i].w)>=100).length;assert.ok(gaps>=4,`${b.name} has open gaps (${gaps})`);
 }
 assert.equal(DRILL_BLOCK.start,undefined);assert.equal(DRILL_BLOCK.buildings[0].x,Math.round(400*CONFIG.cityScale));
 assert.ok(!DRILL_BLOCK.buildings.some(x=>x.landmark||x.cache));
});

test('open district: roam east then west, leave by the west exit once the quota is met',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#new');h.click('#skip-intro');h.node('#initials').value='WST';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');h.click('#begin-city');
  assert.equal(h.state().mode,'playing');const start=h.state();
  assert.ok(Math.abs(start.x+start.width/2-start.worldWidth/2)<1,'spawns at the block centre');
  assert.equal(start.buildings.filter((b:any)=>b.landmark).length,2);
  const hold=(code:string,frames:number)=>{h.down(code);h.step(frames);h.up(code);};
  const sweep=(fwd:string,back:string,done:()=>boolean,limit:number)=>{for(let n=0;n<limit&&h.state().mode==='playing'&&!done();n++){
   if(h.state().ultimate>=100&&h.state().transform===0)h.tap('KeyU');
   hold(fwd,8);h.tap('KeyK');h.step(40);hold(back,1);h.tap('KeyK');h.step(40);hold(fwd,3);
  }};
  sweep('KeyD','KeyA',()=>h.state().x>h.state().worldWidth-h.state().width-120,120);
  assert.equal(h.state().mode,'playing','east half alone is not enough');
  sweep('KeyA','KeyD',()=>false,170);
  const end=h.state();
  assert.equal(end.mode,'results');assert.ok(end.destruction>=.75);assert.ok(end.x<=3,`left by the west exit (x=${end.x})`);
 }finally{h.release();h.cleanup();}
});
