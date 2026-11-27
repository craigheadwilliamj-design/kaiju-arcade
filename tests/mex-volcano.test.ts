// Mexico City rework, card 2: Popocatépetl's schedule. Opt-in `volcano` state per level (0 = today's skyline), the puff hook, the Eruption flare and tremor
// (state 2+), ash fall (3-4, or 2 past `ashLate`), the scripted switch to 4 when the stronghold target dies, and volcanic bombs from Eruption at state 4 only.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf} from '../src/levels.ts';import {COMBAT as B,VOLCANO as V} from '../src/config.ts';
import {bootCampaign} from './helpers/game-harness.ts';

const boot=(city='mex-classic',kaiju='Tlézcatl')=>bootCampaign(.75,{city,kaiju});
// Eruption needs a real meter and a free kaiju; fire it and run past the blast.
async function erupt(h:any){h.test().fillUltimate();for(let n=0;n<120&&!h.state().canAct;n++)h.step();h.tap('KeyU');for(let n=0;n<240&&!h.state().erupting;n++)h.step();}
const scatter=()=>{let seed=7;Math.random=()=>((seed=Math.imul(seed^seed>>>15,seed|1)+0x6d2b79f5|0)>>>0)/4294967296;};

test('no other city sets a volcano state, mex-classic reads as state 0, and a level without `volcano` is state 0',async()=>{
 for(let i=0;i<CITIES.length;i++){const id=CITIES[i].id;if(id==='mex')continue;for(const b of LEVELS[i])assert.equal(b.volcano,undefined,`${id} ${b.name} has no volcano`),assert.equal(b.volcanoOn,undefined),assert.equal(b.ashLate,undefined);}
 const h=await boot();try{h.step(5);const v=h.state().volcano;assert.equal(v.state,0);assert.equal(v.ash,false);assert.equal(v.mood.top,CITIES[cityIndexOf('mex-classic')].mood.top,'the classic mood is untouched');
  h.test().volcanoPuff();assert.equal(h.state().volcano.puffs,0,'the puff hook does nothing at state 0');
  await erupt(h);assert.equal(h.state().volcano.flares,0);assert.equal(h.state().volcano.queued+h.state().volcano.dropped,0,'no bombs at state 0');
 }finally{h.release();h.cleanup();}
});

test('the puff hook: one extra puff at states 1 and up, and it clears by itself',async()=>{
 const h=await boot();try{h.step(5);h.test().setVolcano(1);h.test().volcanoPuff();assert.equal(h.state().volcano.puffs,1);
  h.step(Math.round(V.puffSeconds*60)+30);assert.equal(h.state().volcano.puffs,0,'a puff is one-off');
 }finally{h.release();h.cleanup();}
});

test('Eruption flares the crater and shakes the ground at state 2 and not at 0 or 1',async()=>{
 for(const [state,fires] of [[0,false],[1,false],[2,true]] as const){
  const h=await boot();try{scatter();h.step(10);h.test().setVolcano(state);await erupt(h);
   assert.equal(h.state().volcano.flares,fires?1:0,`state ${state}`);assert.equal(h.state().volcano.flare>0,fires,`state ${state} flare`);
   if(fires){for(let n=0;n<Math.round(V.flareSeconds*60)+20;n++)h.step();assert.equal(h.state().volcano.flare,0,'the flare dies down');}
   assert.equal(h.state().volcano.dropped,0,'bombs are state 4 only');
  }finally{h.release();h.cleanup();}}
});

test('ash falls at states 3 and 4 only; at state 2 only past `ashLate`; the sky darkens at 3 and goes red and black at 4',async()=>{
 const h=await boot();try{h.step(10);
  const base=h.state().volcano.mood;
  for(const s of [0,1,2])h.test().setVolcano(s),h.step(2),assert.equal(h.state().volcano.ash,false,`state ${s}`);
  h.test().setVolcano(2,{ashLate:h.state().x-100});h.step(2);assert.equal(h.state().volcano.ash,true,'past ashLate');
  h.test().setVolcano(2,{ashLate:h.state().x+5000});h.step(2);assert.equal(h.state().volcano.ash,false,'before ashLate');
  h.test().setVolcano(3);h.step(2);const m3=h.state().volcano;assert.equal(m3.ash,true);assert.equal(m3.mood.smog,true);assert.notEqual(m3.mood.sun,base.sun,'a dimmer sun');
  h.test().setVolcano(4);h.step(2);const m4=h.state().volcano;assert.equal(m4.ash,true);assert.notEqual(m4.mood.top,m3.mood.top,'red and black');
  h.test().setVolcano(0);h.step(2);assert.equal(h.state().volcano.mood.top,base.top,'back to state 0 restores the mood');
 }finally{h.release();h.cleanup();}
});

test('a `volcanoOn:target` level at 3 switches to 4 when its stronghold target dies, once, with the banner',async()=>{
 const h=await boot('mex-classic');try{h.step(5);h.test().gotoCity('mex-classic',2);h.step(5);assert.equal(h.state().blockKind,'stronghold');assert.ok(h.state().objective,'a target');
  h.test().setVolcano(3,{on:true});h.step(5);assert.equal(h.state().volcano.state,3);assert.equal(h.state().volcano.blown,0);
  h.test().sinkCutter();h.step(3);const v=h.state().volcano;assert.equal(v.state,4,'erupts');assert.equal(v.blown,1);assert.equal(h.state().banner,V.erupt.banner);assert.equal(v.flare>0,true);
  h.step(30);h.test().sinkCutter();h.step(30);assert.equal(h.state().volcano.blown,1,'once');
  // A level that never armed the trigger stays put when its target dies.
  h.test().gotoCity('mex-classic',2);h.step(5);h.test().setVolcano(3);h.test().sinkCutter();h.step(5);assert.equal(h.state().volcano.state,3);
 }finally{h.release();h.cleanup();}
});

test('bombs: only Eruption at state 4 drops them; they burn troops and the rival, never the player, and leave pools that expire',async()=>{
 const h=await boot();try{scatter();h.step(10);h.test().setVolcano(4);h.test().shield(60);
  for(let k=-6;k<=6;k++)if(k)h.test().spawnUnit(k%2?'soldier':'tank',h.state().x+k*100);h.step(3);
  const units0=h.state().military.map((u:any)=>u.hp);
  await erupt(h);assert.ok(h.state().volcano.queued>0||h.state().volcano.dropped>0,'Eruption at state 4 queues bombs');
  let peak=0,pools=0;for(let n=0;n<Math.round((V.bombDelay+3)*60);n++){h.step();peak=Math.max(peak,h.state().volcano.bombs);pools=Math.max(pools,h.state().eruptPools);}
  assert.equal(h.state().volcano.dropped,V.bombs,'every bomb falls');assert.ok(peak>0,'seen in the air');assert.ok(pools>0,'and they leave pools');
  assert.equal(h.state().volcano.bombs,0,'all landed');
  assert.ok(h.state().military.reduce((a:number,u:any)=>a+u.hp,0)<units0.reduce((a:number,b:number)=>a+b,0)||h.state().military.length<units0.length,'troops were hurt');
  for(let n=0;n<Math.round((V.poolSeconds+B.eruptPoolSeconds)*60);n++)h.step();assert.equal(h.state().eruptPools,0,'the pools expire');
  // No ambient bombs: with nothing fired, state 4 drops nothing.
  const d=h.state().volcano.dropped;h.step(600);assert.equal(h.state().volcano.dropped,d,'no random bombs');
 }finally{h.release();h.cleanup();}
});

test('bombs never hit the player: the same Eruption costs him exactly as much health at state 4 as at state 0',async()=>{
 const run=async(state:number)=>{const h=await boot();try{scatter();h.step(10);h.test().setVolcano(state);h.step(3);const dt0=h.state().damageTaken;
   await erupt(h);for(let n=0;n<Math.round((V.bombDelay+3)*60);n++)h.step();
   return {taken:h.state().damageTaken-dt0,dropped:h.state().volcano.dropped};}finally{h.release();h.cleanup();}};
 const calm=await run(0),bombed=await run(4);assert.equal(calm.dropped,0);assert.equal(bombed.dropped,V.bombs);assert.equal(bombed.taken,calm.taken,'the bombs add no damage to the player');
});

test('bombs hit the rival; other kaiju never drop them',async()=>{
 const h=await boot('mex-classic');try{scatter();h.step(5);h.test().gotoCity('mex-classic',4);h.step(10);h.test().setVolcano(4);assert.ok(h.state().rival,'Tlézcatl Arena has a rival');
  const px=h.state().x;h.test().teleport(h.state().rival.x-60);h.step(5);const hp0=h.state().rival.hp;h.test().shield(30);
  await erupt(h);for(let n=0;n<300;n++)h.step();assert.ok(h.state().rival.hp<hp0,'the rival took damage');assert.ok(h.state().volcano.dropped>0);void px;
 }finally{h.release();h.cleanup();}
 for(const k of ['Mogurodon','Kaiban','Belial','Myrmex']){
  const g=await boot('mex-classic',k);try{scatter();g.step(10);g.test().setKaiju(k);g.test().setVolcano(4);g.test().fillUltimate();for(let n=0;n<120&&!g.state().canAct;n++)g.step();g.tap('KeyU');g.step(400);
   assert.equal(g.state().volcano.dropped,0,`${k} drops no bombs`);assert.equal(g.state().volcano.flares,0,`${k} is not Tlézcatl: no flare`);
  }finally{g.release();g.cleanup();}}
});
