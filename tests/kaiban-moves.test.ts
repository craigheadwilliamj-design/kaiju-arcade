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
  let far=0,face0=0,lo=x0,hi=x0;const track=()=>{const x=h.state().x;lo=Math.min(lo,x);hi=Math.max(hi,x);far=Math.max(far,Math.abs(x-x0));};
  for(let n=0;n<45;n++){h.step();if(h.state().stampeding&&!face0)face0=h.state().face;track();}
  assert.ok(face0!==0,'charge started');assert.ok(far>300,`charges a long way (${Math.round(far)})`);
  let turned=false;
  for(let n=0;n<150&&h.state().stampeding;n++){h.step();track();if(h.state().face!==face0)turned=true;}
  assert.ok(turned,'turns back for a second pass');
  assert.equal(h.state().stampeding,false,'charge ends with the Ultimate');
  assert.ok(far<=B.stampedeReach+20&&far<B.ultimateRange,`reach is shorter than Seismic Rupture (${Math.round(far)})`);
  assert.ok(Math.abs(h.state().x-x0)<60,'finishes back near where it started');
  // Like a train ran through it: every building in the charge path is down, whatever its HP.
  const w=h.state().w??48,inPath=h.state().buildings.filter((b:any)=>b.x<hi+w&&b.x+b.w>lo);
  assert.ok(inPath.length>0,'the charge crossed buildings');
  assert.deepEqual(inPath.filter((b:any)=>b.hp>0).map((b:any)=>b.x),[],'nothing in the path survives');
  assert.ok(h.state().buildingHP.reduce((a:number,b:number)=>a+b,0)<hpBefore);
 }finally{h.release();h.cleanup();}
});

test('Kaiban Meteor Drop flings a ring of rocks both ways and never rolls; Gore Charge rams far harder than a barge',async()=>{
 const h=await kaibanCity();const {MOVE:MV}=await import('../src/config.ts');
 try{
  h.step(30);h.tap('Space');h.step(15);h.tap('KeyS');h.down('KeyD');for(let n=0;n<60&&h.state().diving;n++)h.step();h.up('KeyD');
  assert.equal(h.state().rolling,false,'Kaiban does not roll');assert.ok(h.state().entityCounts.rocks>=MV.meteorRocks*.6,`rocks flung (${h.state().entityCounts.rocks})`);
  h.step(60);
  const s=h.state(),i=s.buildings.map((b:any,k:number)=>[b,k]).filter(([b]:any)=>b.hp>0&&b.kind!=='tiny'&&b.x>s.x+s.width).sort((p:any,q:any)=>p[0].x-q[0].x)[0][1];
  const hp=h.state().buildings[i].hp;h.down('ShiftLeft');h.down('KeyD');
  for(let n=0;n<600&&h.state().buildings[i].hp===hp;n++)h.step();h.up('KeyD');h.up('ShiftLeft');
  assert.ok(hp-h.state().buildings[i].hp>=MV.bargeDamage*MV.goreMult*.95,`gore hit ${hp-h.state().buildings[i].hp}`);
 }finally{h.cleanup();}
});
