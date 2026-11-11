import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {CONFIG as C,COMBAT as B} from '../src/config.ts';
test('all six shared-combat identities: selection, held input, crouch/jump, frame gaps and focus-loss cancellation',async()=>{
 for(let i=0;i<KAIJU.length;i++){
  const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
  try{h.click('#new');h.click('#skip-intro');h.node('#initials').value='QAA';h.callbacks.get('#initials:input')!();h.click('#launch');h.click(`#kaiju-${i}`);h.step(2);h.click('#confirm-kaiju');assert.equal(h.state().checkpoint.kaiju,KAIJU[i]);h.click('#begin-city');assert.equal(h.state().activeKaiju,KAIJU[i]);assert.equal(h.state().hp,B.startHP);
   const start=h.state().x;h.down('KeyD');h.step(18);h.up('KeyD');assert.ok(h.state().x>start+50);h.tap('KeyJ');assert.equal(h.state().combo,1);h.step(20);h.down('KeyJ');const combo=h.state().combo;for(let n=0;n<5;n++){h.down('KeyJ');h.step(8);}assert.equal(h.state().combo,combo,'holding does not auto-combo');h.up('KeyJ');
   h.down('KeyS');h.step();const x=h.state().x;h.down('KeyA');h.tap('Space');h.step(8);assert.equal(h.state().x,x);assert.equal(h.state().grounded,true);h.up('KeyA');h.up('KeyS');h.step();const standingY=h.state().y;h.tap('Space');h.step(12);assert.ok(h.state().y<standingY-20);const vy=h.state().vy;h.tap('Space');assert.equal(h.state().vy,vy,'no double jump');h.step(60);assert.equal(h.state().grounded,true);
   h.down('KeyD');const gapX=h.state().x;h.step(1,60000);h.up('KeyD');assert.ok(h.state().x-gapX<=C.moveSpeed*C.maxDelta+.01,'large frame gap is clamped');
   h.step(50);h.down('KeyK');h.step(8);assert.equal(h.state().charging,true);h.events.get('blur')!();assert.equal(h.state().mode,'paused');assert.equal(h.state().charging,false);h.up('KeyK');h.click('#resume');assert.equal(h.state().charging,false);assert.equal(h.state().mode,'playing');
  }finally{h.cleanup();}
 }
});
test('resize keeps integer scaling within allocated desktop space and falls back on small screens',async()=>{const h=await bootGame();try{h.click('#settings');h.callbacks.get('#integer-scale:change')!({target:{checked:true}});assert.equal(h.node('#frame').style.width,'960px');(globalThis as any).window.innerWidth=400;h.events.get('resize')!();assert.equal(h.node('#frame').style.width,'');(globalThis as any).window.innerWidth=1280;h.events.get('resize')!();assert.equal(h.node('#frame').style.width,'960px');}finally{h.cleanup();}});
test('duck or charge, not both: crouch is ignored while a heavy charges and returns on release',async()=>{
 const h=await bootGame();
 try{h.click('#drills');h.click('#start');h.step(200);
  h.down('KeyK');h.step(6);assert.equal(h.state().charging,true);h.down('KeyS');h.step(6);assert.equal(h.state().crouched,false,'S during a charge does not duck');
  h.up('KeyK');h.step(2);assert.equal(h.state().charging,false);assert.equal(h.state().crouched,true,'still holding S ducks after release');
  h.step(60);h.down('KeyK');h.step(2);assert.equal(h.state().charging,true);assert.equal(h.state().crouched,false,'charging from a duck stands up');
  h.up('KeyK');h.up('KeyS');
 }finally{h.release();h.cleanup();}
});
