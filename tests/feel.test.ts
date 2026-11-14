import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';
import {createBuildings,canTopple,toppleSpan,crushDamage} from '../src/rules.ts';
import {DRILL_BLOCK} from '../src/levels.ts';

test('topple span runs from the pivot edge out to full height in the fall direction',()=>{
 const [b]=createBuildings([{x:500,w:100,h:300,hp:10,value:10,kind:'medium',label:'',color:'#000'}]);
 assert.equal(canTopple(b),true);b.tiltDir=1;assert.deepEqual(toppleSpan(b),[600,900]);b.tiltDir=-1;assert.deepEqual(toppleSpan(b),[200,500]);
 const [short]=createBuildings([{x:0,w:80,h:150,hp:10,value:10,kind:'medium',label:'',color:'#000'}]);assert.equal(canTopple(short),false);
});

test('crush damage falls off along the path and across chain generations',async()=>{
 // Heights are city-scaled ('h' tower 330, landmark 500 authored); crush damage is the same as before the scale-up.
 const {CONFIG}=await import('../src/config.ts');const tower=Math.round(330*CONFIG.cityScale),mark=Math.round(500*CONFIG.cityScale);
 assert.equal(Math.round(crushDamage(tower,0,0)),165);assert.ok(crushDamage(tower,0,0)<190,'an ordinary tower cannot one-shot even a small building');
 assert.ok(crushDamage(tower,1,0)<crushDamage(tower,0,0)*.4);assert.ok(crushDamage(tower,0,1)<crushDamage(tower,0,0)*.4);
 assert.ok(crushDamage(mark,0,0)>190&&crushDamage(mark,1,0)<190,'a landmark flattens only a small building it lands on');
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

test('a street dive freezes the game once: its shockwaves, rocks and punted cars do not re-arm hitstop',async()=>{
 const {emptyPermanent,KAIJU,PERMANENT_KEY}=await import('../src/campaign.ts');const {FEEL}=await import('../src/config.ts');
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 try{
  h.click('#new');h.click('#skip-intro');h.node('#initials').value='TST';h.callbacks.get('#initials:input')!();h.click('#launch');
  h.click(`#kaiju-${KAIJU.indexOf('Kaiban')}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');h.step(30);
  h.down('KeyD');h.step(55);h.up('KeyD');h.step(20);h.tap('Space');h.step(16);h.tap('KeyS');
  for(let n=0;n<90&&h.state().diving;n++)h.step();
  assert.ok(h.state().hitstop>0,'the landing itself still freezes');assert.ok(h.state().entityCounts.rocks>0,'Meteor Drop threw its rocks');
  // Count separate freezes over the next 0.9s: before the echo rule this dive froze the game eight times.
  let arms=0,prev=0,hurt=0;const hp=h.state().buildingHP.reduce((a:number,b:number)=>a+b,0);
  for(let f=0;f<Math.round(FEEL.hitstopEcho*60);f++){const hs=h.state().hitstop;if(hs>0&&(prev===0||hs>prev))arms++;prev=hs;h.step();}
  hurt=hp-h.state().buildingHP.reduce((a:number,b:number)=>a+b,0);
  assert.equal(arms,1,'one freeze for the whole landing');assert.ok(hurt>0,'the follow-up hits still did their damage');
 }finally{h.release();h.cleanup();}
});
