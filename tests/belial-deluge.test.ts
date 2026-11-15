import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {COMBAT as B} from '../src/config.ts';
import {moveList} from '../src/presentation.ts';

async function belialCity(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='BEL';h.callbacks.get('#initials:input')!();h.click('#launch');
 h.click(`#kaiju-${KAIJU.indexOf('Belial')}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');assert.equal(h.state().activeKaiju,'Belial');
 return h;
}
const until=(h:any,f:()=>boolean,max=300)=>{for(let n=0;n<max&&!f();n++)h.step();return f();};

test('Belial Acid Deluge: heaves, rears up, geyser, rain soaks both sides in full corrosion, puddles, planted, no meter refill',async()=>{
 const h=await belialCity();
 try{h.step(30);
  // Fill the meter with real attacks: walk east and spew at whatever is in front.
  for(let n=0;n<800&&h.state().ultimate<B.ultimateMax;n++){h.down('KeyD');h.step(6);h.up('KeyD');h.down('KeyL');h.step(40);h.up('KeyL');h.step(20);}
  assert.equal(h.state().ultimate,B.ultimateMax,'meter filled');
  for(let n=0;n<300&&!(h.state().canAct&&h.state().jet===null&&h.state().jetFuel>=1);n++)h.step();
  const x0=h.state().x,y0=h.state().y,hp0=h.state().buildingHP.reduce((a:number,b:number)=>a+b,0),cx=x0+h.state().width/2;
  // (Strip names can't be checked here: the harness has no Image, so no strip is ever ready; timing is data-only.)
  // The harness pins Math.random to one value; the rain needs real scatter.
  let seed=11;Math.random=()=>((seed=Math.imul(seed^seed>>>15,seed|1)+0x6d2b79f5|0)>>>0)/4294967296;
  h.tap('KeyU');assert.ok(h.state().ultimateTime>0,'Ultimate active');
  h.step(Math.round(B.delugeCharge*60*.8));
  assert.equal(h.state().delugeSpout,false,'still heaving');assert.equal(h.state().rainDrops,0);
  assert.ok(until(h,()=>h.state().delugeSpout,60),'the geyser goes up');
  for(let n=0;n<240&&h.state().ultimateTime>0;n++){h.step();const s=h.state();
   assert.ok(Math.abs(s.x-x0)<1&&Math.abs(s.y-y0)<1,'planted for the whole Ultimate');}
  assert.equal(h.state().ultimate,0,'its own damage never refills the meter');
  // The rain outlives the Ultimate until the last drop is down.
  assert.ok(until(h,()=>!h.state().delugeActive&&h.state().rainDrops===0,240),'every drop has fallen');
  const landed=h.state().delugeLandings as number[];
  assert.equal(landed.length,B.delugeDrops,`every drop came down somewhere (${landed.length})`);
  const left=landed.filter(x=>x<cx).length,right=landed.filter(x=>x>cx).length;
  assert.ok(left>=B.delugeDrops/3&&right>=B.delugeDrops/3,`rain on both sides (${left} west, ${right} east)`);
  assert.ok(landed.every(x=>Math.abs(x-cx)<=B.delugeRange+1),'never past the rain radius');
  assert.ok(landed.some(x=>Math.abs(x-cx)>B.delugeRange*.6),'and far out');
  const st=h.state();
  assert.ok(st.corrosion.some((c:number)=>c===B.corrodeMax),'buildings in the downpour are fully corroded');
  assert.ok(st.delugePools>0,'puddles left on the street');
  assert.ok(st.buildingHP.reduce((a:number,b:number)=>a+b,0)<hp0,'buildings took damage');
  // The corrosion it left keeps eating (Ultimate damage) without touching the meter.
  const hp1=st.buildingHP.reduce((a:number,b:number)=>a+b,0);h.step(120);
  assert.ok(h.state().buildingHP.reduce((a:number,b:number)=>a+b,0)<hp1,'the corrosion keeps eating');
  assert.equal(h.state().ultimate,0,'lingering corrosion and puddles do not refill the meter');
  assert.ok(until(h,()=>h.state().canAct,60),'free to act again');
 }finally{h.release();h.cleanup();}
});

test('Belial move list names the Acid Deluge, not the shared preview',()=>{
 const sig=moveList('Belial').moves[0].moves.find((m:any)=>m.keys==='U')!;
 assert.equal(sig.name,'Acid Deluge');
});
