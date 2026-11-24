import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {MOVE as MV} from '../src/config.ts';

async function city(name:string){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='MYR';h.callbacks.get('#initials:input')!();h.click('#launch');
 h.click(`#kaiju-${KAIJU.indexOf(name)}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');assert.equal(h.state().activeKaiju,name);
 h.step(30);return h;
}
const until=(h:any,f:()=>boolean,max=600)=>{for(let n=0;n<max&&!f();n++)h.step();return f();};
// Jump from the street and return the peak height (px above the take-off feet line).
function peak(h:any){const y0=h.state().y;let top=y0;h.tap('Space');for(let n=0;n<400;n++){h.step();top=Math.min(top,h.state().y);if(n>5&&h.state().grounded)break;}return y0-top;}

test('Myrmex jumps higher than the others and floats: it takes him longer to come down',async()=>{
 const b=await city('Belial');let belial:number,belialAir=0;
 try{const y0=b.state().y;b.tap('Space');b.step();while(!b.state().grounded&&belialAir<600){b.step();belialAir++;}belial=y0;b.step(10);belial=peak(b);}finally{b.cleanup();}
 const m=await city('Myrmex');
 try{
  assert.equal(m.state().airJumps,MV.myrmexAirJumps,'wing beats ready on the ground');
  let air=0;m.tap('Space');m.step();while(!m.state().grounded&&air<600){m.step();air++;}
  assert.ok(air>belialAir*1.4,`Myrmex airtime ${air} frames vs Belial ${belialAir}`);
  m.step(10);const myr=peak(m);
  assert.ok(myr>belial*1.1,`Myrmex peak ${myr} vs Belial ${belial}`);
 }finally{m.cleanup();}
});

test('Myrmex triple jump: two wing beats in the air, the third press does nothing; they refill on landing',async()=>{
 const h=await city('Myrmex');
 try{
  h.tap('Space');h.step(20);assert.equal(h.state().grounded,false);
  h.tap('Space');h.step();assert.ok(h.state().vy<0,'first wing beat lifts him');assert.equal(h.state().airJumps,1);
  assert.equal(h.state().anim,'jumpFlap','the flap strip plays');
  h.step(20);h.tap('Space');h.step();assert.ok(h.state().vy<0,'second wing beat lifts him');assert.equal(h.state().airJumps,0);
  assert.ok(until(h,()=>h.state().vy>0),'starts coming down');
  const vy=h.state().vy;h.tap('Space');h.step();assert.ok(h.state().vy>=vy,'no fourth jump: still falling');
  assert.ok(until(h,()=>h.state().grounded,900),'lands');h.step();
  assert.equal(h.state().airJumps,MV.myrmexAirJumps,'wing beats refill on landing');
 }finally{h.cleanup();}
});

test('Myrmex falls no faster than myrmexFallMax, glides slower with Space held, and a slam dive still plunges',async()=>{
 const h=await city('Myrmex');
 try{
  // Burn both wing beats high up, then let him fall.
  h.tap('Space');h.step(18);h.tap('Space');h.step(18);h.tap('Space');
  assert.ok(until(h,()=>h.state().vy>0),'falling');let top=0;
  for(let n=0;n<40&&!h.state().grounded;n++){h.step();top=Math.max(top,h.state().vy);}
  assert.ok(top<=MV.myrmexFallMax+1e-6,`fall speed ${top} capped at ${MV.myrmexFallMax}`);
  if(!h.state().grounded){h.down('Space');h.step(20);if(!h.state().grounded)assert.ok(h.state().vy<=MV.myrmexGlideMax+1e-6,`glide ${h.state().vy}`);h.up('Space');}
  assert.ok(until(h,()=>h.state().grounded,900),'lands');h.step(10);
  h.tap('Space');h.step(25);h.tap('KeyS');h.step();
  assert.equal(h.state().diving,true);assert.ok(h.state().vy>MV.myrmexFallMax*2,`dive speed ${h.state().vy}`);
 }finally{h.cleanup();}
});
