import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';
import {createBuildings,canTopple,toppleSpan,crushDamage} from '../src/rules.ts';
import {DRILL_BLOCK} from '../src/levels.ts';

test('topple span runs from the pivot edge out to full height in the fall direction',()=>{
 const [b]=createBuildings([{x:500,w:100,h:300,hp:10,value:10,kind:'medium',label:'',color:'#000'}]);
 assert.equal(canTopple(b),true);b.tiltDir=1;assert.deepEqual(toppleSpan(b),[600,900]);b.tiltDir=-1;assert.deepEqual(toppleSpan(b),[200,500]);
 const [short]=createBuildings([{x:0,w:80,h:150,hp:10,value:10,kind:'medium',label:'',color:'#000'}]);assert.equal(canTopple(short),false);
});

test('crush damage falls off along the path and across chain generations',()=>{
 assert.equal(Math.round(crushDamage(330,0,0)),264);assert.ok(crushDamage(330,1,0)<crushDamage(330,0,0)*.5);
 assert.equal(crushDamage(330,0,1),crushDamage(330,0,0)/2);assert.ok(crushDamage(500,0,2)<190,'third-generation landmark cannot flatten a medium tower');
});

test('real loop: hits leave holes/chunks/hitstop; short buildings squash; tall ones topple away and crush neighbours',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#drills');h.click('#start');
  const heavy=()=>{h.down('KeyK');h.step(20);h.up('KeyK');};
  h.down('KeyD');h.step(150);h.up('KeyD');
  heavy();
  let s=h.state();assert.ok(s.hitstop>0,'a connecting heavy starts hitstop');assert.ok(s.buildings[0].holes>0,'hole where it landed');assert.ok(s.chunks>0,'debris chunks');
  h.step(1);assert.ok(h.state().hitstop<s.hitstop,'hitstop counts down');
  for(let n=0;n<30&&h.state().buildings[0].hp>0;n++){h.step(40);heavy();}
  h.step(80);s=h.state();assert.equal(s.buildings[0].hp,0);assert.equal(s.buildings[0].topple,0,'150px building squashes, does not topple');
  // Second building is 420px tall: smash it from the west and it falls east onto the next block of buildings.
  assert.ok(DRILL_BLOCK.buildings[1].h>=200);const neighbourHP=s.buildings[2].hp;
  h.down('KeyD');h.step(60);h.up('KeyD');
  let toppling=false;
  for(let n=0;n<40&&h.state().buildings[1].hp>0;n++){h.step(40);heavy();}
  for(let n=0;n<120&&h.state().buildings[1].topple!==2;n++){h.step();if(h.state().buildings[1].topple===1)toppling=true;}
  s=h.state();assert.ok(toppling,'went through a falling phase');assert.equal(s.buildings[1].topple,2);assert.equal(s.buildings[1].tiltDir,1,'falls away from the attacker');
  assert.ok(s.buildings[2].hp<neighbourHP,'landing crushed the neighbour');
 }finally{h.release();h.cleanup();}
});
