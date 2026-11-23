import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {MOVE as MV} from '../src/config.ts';
import {animImpact} from '../src/presentation.ts';

async function city(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='MYR';h.callbacks.get('#initials:input')!();h.click('#launch');
 h.click(`#kaiju-${KAIJU.indexOf('Myrmex')}`);h.step(2);h.click('#confirm-kaiju');h.click('#begin-city');assert.equal(h.state().activeKaiju,'Myrmex');
 h.step(30);return h;
}
const until=(h:any,f:()=>boolean,max=300)=>{for(let n=0;n<max&&!f();n++)h.step();return f();};
// Back up east against the next building, then face west: the street runs clear for ~390 units there (Hong Kong start), so the
// glob comes down on the street rather than a wall.
function faceWest(h:any){h.down('KeyD');let x=-1;for(let n=0;n<240&&h.state().x!==x;n++){x=h.state().x;h.step(4);}h.up('KeyD');h.step(3);
 h.down('KeyA');h.step(2);h.up('KeyA');h.step(3);assert.equal(h.state().face,-1);}
// Spit and return where its venom puddle lands (centre x), or null.
function spitLanding(h:any,lob=false){const before=h.state().entityCounts.venomPoolX.length;if(lob)h.down('KeyW');h.tap('KeyL');
 const ok=until(h,()=>h.state().entityCounts.venomPoolX.length>before,240);if(lob)h.up('KeyW');return ok?h.state().entityCounts.venomPoolX.at(-1):null;}

test('Myrmex Venom Spit: the glob leaves the stinger on the flick impact frame, high over his back, and lands in a venom puddle',async()=>{
 const h=await city();
 try{
  faceWest(h);h.tap('KeyL');h.step();
  assert.equal(h.state().anim,'rangedStand','the flick strip plays');assert.equal(h.state().entityCounts.venomGlobs,0,'nothing leaves before the impact frame');
  assert.ok(h.state().rangedCooldown>0);
  const impact=animImpact('Myrmex','rangedStand',h.state().stage);assert.ok(impact>0);
  assert.ok(until(h,()=>h.state().entityCounts.venomGlobs>0,Math.ceil(impact*60)+3),'the glob leaves on the impact frame');
  const top=h.state().y,mid=h.state().y+h.state().height/2;
  assert.ok(h.state().entityCounts.venomGlobY[0]<mid,`spat from up at the stinger (${h.state().entityCounts.venomGlobY[0]} vs body middle ${mid}, top ${top})`);
  assert.ok(until(h,()=>h.state().entityCounts.venomPools>0,240),'a glob that reaches the street leaves a venom puddle');
  assert.equal(h.state().entityCounts.venomGlobs,0);
 }finally{h.cleanup();}
});

test('Myrmex Venom Spit: W lobs it further',async()=>{
 const h=await city();
 try{
  faceWest(h);const x=h.state().x+h.state().width/2;
  const flat=spitLanding(h);assert.ok(flat!==null,'flat spit lands');h.step(Math.ceil(MV.spitCooldown*60)+5);
  const lob=spitLanding(h,true);assert.ok(lob!==null,'lobbed spit lands');
  assert.ok(x-lob!>x-flat!+20,`lob lands further: ${x-lob!} vs ${x-flat!}`);
 }finally{h.cleanup();}
});

test('Myrmex Venom Spit: troops in the splash are poisoned and keep losing health afterwards',async()=>{
 const h=await city();
 try{
  // The police arrive from the east: wait until one is within spitting range.
  assert.ok(until(h,()=>h.state().militaryUnits.some((u:any)=>u.hp>0&&Math.abs(u.x-h.state().x)<320),5400),'troops arrive');
  for(let k=0;k<12&&h.state().entityCounts.poisoned===0;k++){const s=h.state(),u=s.militaryUnits.filter((u:any)=>u.hp>0).sort((a:any,b:any)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];
   if((u.x>s.x?1:-1)!==s.face){const d=u.x>s.x?'KeyD':'KeyA';h.down(d);h.step(2);h.up(d);}
   h.tap('KeyL');until(h,()=>h.state().entityCounts.poisoned>0,60);}
  assert.ok(h.state().entityCounts.poisoned>0,'the splash poisons troops');
  const hp=()=>h.state().militaryUnits.reduce((t:number,u:any)=>t+Math.max(0,u.hp),0),dead=()=>h.state().militaryUnits.filter((u:any)=>u.hp<=0).length;
  const h0=hp(),n0=h.state().militaryUnits.length;h.step(Math.ceil(MV.poisonTick*60*2)+2);
  assert.ok(hp()<h0||h.state().militaryUnits.length<n0||dead()>0,'poison keeps hurting them with no more hits');
 }finally{h.cleanup();}
});
