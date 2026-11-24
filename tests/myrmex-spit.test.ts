import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {MOVE as MV} from '../src/config.ts';
import {animImpact} from '../src/presentation.ts';

async function city(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootCampaign(.75,{kaiju:'Myrmex',permanent:p});
 assert.equal(h.state().activeKaiju,'Myrmex');
 h.step(30);return h;
}
const E=(h:any)=>h.state().entityCounts;
const until=(h:any,f:()=>boolean,max=300)=>{for(let n=0;n<max&&!f();n++)h.step();return f();};
// Back up east against the next building, then face west: the street runs clear for ~390 units there (Hong Kong start).
function faceWest(h:any){h.down('KeyD');let x=-1;for(let n=0;n<240&&h.state().x!==x;n++){x=h.state().x;h.step(4);}h.up('KeyD');h.step(3);
 h.down('KeyA');h.step(2);h.up('KeyA');h.step(3);assert.equal(h.state().face,-1);}
// Brew for `frames`, release, and return the cloud it makes.
function bomb(h:any,frames:number,lob=false){const n0=E(h).clouds.length;h.down('KeyL');h.step(frames);if(lob)h.down('KeyW');h.up('KeyL');
 const ok=until(h,()=>E(h).clouds.length>n0,300);if(lob)h.up('KeyW');return ok?E(h).clouds.at(-1):null;}

test('Myrmex Venom Bomb: holding L brews a bubble (nothing thrown); release throws it on the impact frame and it bursts into a cloud',async()=>{
 const h=await city();
 try{
  faceWest(h);h.down('KeyL');h.step(2);
  assert.equal(h.state().anim,'spitBrew','the brew strip plays');assert.ok(h.state().brewing>0);
  h.step(60);assert.equal(h.state().anim,'spitHold','then the hold loop');assert.equal(E(h).venomGlobs,0,'nothing is thrown while held');
  h.up('KeyL');h.step();assert.equal(h.state().anim,'spitThrow');assert.equal(h.state().brewing,null);assert.ok(h.state().rangedCooldown>0);
  const impact=animImpact('Myrmex','spitThrow',h.state().stage);
  assert.ok(until(h,()=>E(h).venomGlobs>0,Math.ceil(impact*60)+3),'the bomb leaves on the impact frame');
  assert.ok(E(h).venomGlobY[0]<h.state().y+h.state().height/2,'thrown from up at the stinger');
  assert.ok(until(h,()=>E(h).clouds.length>0,300),'it bursts into a poison cloud');
 }finally{h.cleanup();}
});

test('Myrmex Venom Bomb: a full brew flies further and makes a bigger cloud than a tap; clouds drift the way he threw',async()=>{
 const h=await city();
 try{
  faceWest(h);const x=h.state().x+h.state().width/2;
  const tap=bomb(h,1);assert.ok(tap,'tapped bomb bursts');h.step(Math.ceil(MV.spitCooldown*60)+5);
  const full=bomb(h,Math.ceil(MV.cloudCharge*60)+5);assert.ok(full,'full bomb bursts');
  assert.ok(full.r>tap.r*1.5,`bigger cloud: ${full.r} vs ${tap.r}`);
  assert.ok(x-full.x>x-tap.x,`further: ${x-full.x} vs ${x-tap.x}`);
  const cx=E(h).clouds.at(-1).x;h.step(60);assert.ok(E(h).clouds.at(-1).x<cx,'drifts west, the way it was thrown');
 }finally{h.cleanup();}
});

test('Myrmex Venom Bomb: troops in the cloud are poisoned and keep losing health afterwards',async()=>{
 const h=await city();
 try{
  // The police arrive from the east: wait until one is within throwing range.
  assert.ok(until(h,()=>h.state().militaryUnits.some((u:any)=>u.hp>0&&Math.abs(u.x-h.state().x)<320),5400),'troops arrive');
  for(let k=0;k<8&&E(h).poisoned===0;k++){const s=h.state(),u=s.militaryUnits.filter((u:any)=>u.hp>0).sort((a:any,b:any)=>Math.abs(a.x-s.x)-Math.abs(b.x-s.x))[0];
   if((u.x>s.x?1:-1)!==s.face){const d=u.x>s.x?'KeyD':'KeyA';h.down(d);h.step(2);h.up(d);}
   bomb(h,40);until(h,()=>E(h).poisoned>0,60);h.step(Math.ceil(MV.spitCooldown*60));}
  assert.ok(E(h).poisoned>0,'the cloud poisons troops');
  const hp=()=>h.state().militaryUnits.reduce((t:number,u:any)=>t+Math.max(0,u.hp),0);
  const h0=hp(),n0=h.state().militaryUnits.length;h.step(Math.ceil(MV.poisonTick*60*2)+2);
  assert.ok(hp()<h0||h.state().militaryUnits.length<n0,'poison keeps hurting them with no more hits');
 }finally{h.cleanup();}
});

test('Myrmex Sting Dive: the slam bursts into a poison cloud, bigger from a higher drop',async()=>{
 const h=await city();
 try{
  faceWest(h);
  const dive=(beats:number)=>{const n0=E(h).clouds.length;h.tap('Space');h.step(16);for(let b=0;b<beats;b++){h.tap('Space');h.step(16);}
   h.tap('KeyS');h.step();assert.equal(h.state().diving,true);assert.ok(until(h,()=>E(h).clouds.length>n0,300),'the dive bursts into a cloud');
   const c=E(h).clouds.at(-1);until(h,()=>h.state().grounded&&!h.state().diving,120);h.step(40);return c;};
  const low=dive(0),high=dive(2);
  assert.ok(high.r>low.r,`higher drop, bigger cloud: ${high.r} vs ${low.r}`);
 }finally{h.cleanup();}
});
