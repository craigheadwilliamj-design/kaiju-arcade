import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {COMBAT as B} from '../src/config.ts';

async function tlezcatlCity(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='TLZ';h.callbacks.get('#initials:input')!();h.click('#launch');
 h.click(`#kaiju-${KAIJU.indexOf('Tlézcatl')}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');assert.equal(h.state().activeKaiju,'Tlézcatl');
 return h;
}

test('Tlézcatl Eruption: charges, explodes in a true circle, the fallout rains untargeted magma both ways, pools outlast it, no meter refill',async()=>{
 const h=await tlezcatlCity();
 try{h.step(30);
  // Fill the meter with real attacks: walk east and burn whatever is in front.
  for(let n=0;n<800&&h.state().ultimate<B.ultimateMax;n++){h.down('KeyD');h.step(6);h.up('KeyD');h.down('KeyL');h.step(30);h.up('KeyL');h.step(20);}
  assert.equal(h.state().ultimate,B.ultimateMax,'meter filled');
  for(let n=0;n<120&&!h.state().canAct;n++)h.step();
  const x0=h.state().x,y0=h.state().y,hp0=h.state().buildingHP.reduce((a:number,b:number)=>a+b,0);
  // The harness pins Math.random to one value, which would land every glob on the same spot; the rain needs real scatter.
  let seed=7;Math.random=()=>((seed=Math.imul(seed^seed>>>15,seed|1)+0x6d2b79f5|0)>>>0)/4294967296;
  h.tap('KeyU');assert.ok(h.state().ultimateTime>0,'Ultimate active');
  // Charge: balled up and building pressure, nothing has gone off yet.
  h.step(Math.round(B.eruptCharge*60*.8));
  assert.equal(h.state().erupting,false,'still building pressure');assert.equal(h.state().eruptGlobs,0);
  let spat=0,before=h.state().buildings;const cx=x0+h.state().width/2,cy=y0+h.state().height/2,landed:number[]=[];
  for(let n=0;n<120&&!h.state().erupting;n++){before=h.state().buildings;h.step();}
  assert.ok(h.state().erupting,'exploded');spat=h.state().eruptSpat;
  assert.equal(h.state().eruptGlobs,B.eruptGlobs,'the blast throws all the magma out at once');
  // A true circle: every building it reaches is hit, nothing outside it is.
  const R=B.eruptBlastRange,inside=(b:any)=>{const dx=cx-Math.max(b.x,Math.min(cx,b.x+b.w)),dy=cy-Math.max(b.y,Math.min(cy,b.y+b.h));return dx*dx+dy*dy<=R*R;};
  const after=h.state().buildings,hitNow=before.map((b:any,k:number)=>b.hp>0&&after[k].hp<b.hp);
  assert.ok(before.some((b:any)=>b.hp>0&&inside(b)),'something stood in the blast');
  before.forEach((b:any,k:number)=>{if(b.hp>0)assert.equal(hitNow[k],inside(b),`building at ${b.x} (${inside(b)?'inside':'outside'} the circle)`);});
  for(let n=0;n<240&&h.state().ultimateTime>0;n++){h.step();const s=h.state();assert.ok(Math.abs(s.x-x0)<1&&Math.abs(s.y-y0)<1,'planted for the whole Ultimate');}
  assert.equal(spat,B.eruptGlobs,`spat every glob (${spat})`);
  assert.equal(h.state().ultimate,0,'its own damage never refills the meter');
  // Track the last globs landing after the Ultimate ends: pools on both sides of him.
  for(let n=0;n<120;n++)h.step();landed.push(...h.state().eruptLandings);
  assert.equal(h.state().eruptGlobs,0,'every glob has landed');
  assert.equal(h.state().ultimate,0,'lingering globs and pools do not refill the meter');
  assert.ok(h.state().buildingHP.reduce((a:number,b:number)=>a+b,0)<hp0,'buildings took damage');
  assert.equal(landed.length,B.eruptGlobs,'every glob came down somewhere');
  const left=landed.filter(x=>x<cx).length,right=landed.filter(x=>x>cx).length,far=landed.filter(x=>Math.abs(x-cx)>B.eruptBlastRange*1.5).length;
  assert.ok(left>=B.eruptGlobs/4&&right>=B.eruptGlobs/4,`magma lands on both sides (${left} west, ${right} east)`);
  assert.ok(far>=B.eruptGlobs/3,`and well out past the blast (${far})`);
  assert.ok(landed.every(x=>Math.abs(x-cx)<=B.eruptRange+B.eruptPool),'never past the rain radius');
 }finally{h.release();h.cleanup();}
});
