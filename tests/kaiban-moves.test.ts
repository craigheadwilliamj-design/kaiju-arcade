import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {COMBAT as B} from '../src/config.ts';

async function kaibanCity(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='KBN';h.callbacks.get('#initials:input')!();h.click('#launch');
 h.click(`#kaiju-${KAIJU.indexOf('Kaiban')}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');assert.equal(h.state().activeKaiju,'Kaiban');
 return h;
}

test('Kaiban Debris Shotgun: rocks leave on the scoop fling frame as a fan, land fast; airborne he fires the single shot',async()=>{
 const h=await kaibanCity();
 try{h.step(30);
  h.tap('KeyL');assert.equal(h.state().entityCounts.playerShots,0,'no spine on the ground');assert.ok(Math.abs(h.state().rangedCooldown-B.debrisCooldown)<.05);
  h.step(10);assert.equal(h.state().entityCounts.rocks,0,'rocks wait for the fling frame');
  let most=0;for(let n=0;n<60;n++){h.step();most=Math.max(most,h.state().entityCounts.rocks);}
  assert.ok(most>=B.debrisCount-1,`a fan of rocks flies (saw ${most})`);
  assert.equal(h.state().entityCounts.rocks,0,'every rock lands or hits within a second (short range)');
  h.step(20);h.tap('Space');h.step(6);assert.equal(h.state().grounded,false);h.tap('KeyL');h.step();
  assert.equal(h.state().entityCounts.playerShots,1,'airborne falls back to the single shot');assert.equal(h.state().entityCounts.rocks,0);
 }finally{h.release();h.cleanup();}
});

test('Kaiban Stampede: bellow in place, then charges through the block, turns back and damages what it plows into',async()=>{
 const h=await kaibanCity();
 try{h.step(30);
  // Fill the Ultimate meter with real attacks: walk east and scoop-blast whatever is in front.
  for(let n=0;n<800&&h.state().ultimate<B.ultimateMax;n++){h.down('KeyD');h.step(6);h.up('KeyD');h.tap('KeyL');h.step(46);}
  assert.equal(h.state().ultimate,B.ultimateMax,'meter filled');
  for(let n=0;n<120&&!h.state().canAct;n++)h.step();
  const hpBefore=h.state().buildingHP.reduce((a:number,b:number)=>a+b,0),x0=h.state().x;
  h.tap('KeyU');h.step(30);
  assert.equal(h.state().stampeding,false,'still bellowing');assert.ok(Math.abs(h.state().x-x0)<5,'the bellow is in place');
  let far=0,face0=0;for(let n=0;n<45;n++){h.step();if(h.state().stampeding&&!face0)face0=h.state().face;far=Math.max(far,Math.abs(h.state().x-x0));}
  assert.ok(face0!==0,'charge started');assert.ok(far>300,`charges a long way (${Math.round(far)})`);
  const mid=h.state().x;let turned=false;
  for(let n=0;n<90&&h.state().stampeding;n++){h.step();if(h.state().face!==face0)turned=true;}
  assert.ok(turned,'turns back for a second pass');assert.notEqual(h.state().x,mid);
  for(let n=0;n<60&&h.state().stampeding;n++)h.step();
  assert.equal(h.state().stampeding,false,'charge ends with the Ultimate');
  assert.ok(h.state().buildingHP.reduce((a:number,b:number)=>a+b,0)<hpBefore,'buildings in the path took damage');
 }finally{h.release();h.cleanup();}
});
