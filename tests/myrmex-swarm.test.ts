import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';import {emptyPermanent,KAIJU,PERMANENT_KEY} from '../src/campaign.ts';import {COMBAT as B} from '../src/config.ts';
import {animImpact} from '../src/presentation.ts';

async function city(){
 const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootCampaign(.75,{kaiju:'Myrmex',permanent:p});
 assert.equal(h.state().activeKaiju,'Myrmex');
 h.step(30);return h;
}
const until=(h:any,f:()=>boolean,max=300)=>{for(let n=0;n<max&&!f();n++)h.step();return f();};

test('Myrmex The Swarm: charge, rear up, drones pour out on the impact frame, hunt and poison troops, and outlive the Ultimate',async()=>{
 const h=await city();
 try{
  // Fill the meter with real attacks: walk east biting whatever is in front.
  for(let n=0;n<900&&h.state().ultimate<B.ultimateMax;n++){h.down('KeyD');h.step(4);h.up('KeyD');for(let k=0;k<3;k++){h.tap('KeyJ');h.step(12);}}
  assert.equal(h.state().ultimate,B.ultimateMax,'meter filled');
  // Wait for troops within reach so the drones have something alive to hunt.
  until(h,()=>h.state().militaryUnits.some((u:any)=>u.hp>0&&Math.abs(u.x-h.state().x)<500),5400);
  const hp=()=>h.state().militaryUnits.reduce((t:number,u:any)=>t+Math.max(0,u.hp),0);
  h.tap('KeyU');h.step();assert.ok(h.state().ultimateTime>0,'Ultimate active');
  assert.equal(h.state().wasps,0,'no drones while he charges');
  const release=B.swarmCharge+animImpact('Myrmex','ultRoar',h.state().stage);
  assert.ok(until(h,()=>h.state().wasps>0,Math.ceil(release*60)+3),'drones pour out on the roar impact frame');
  assert.equal(h.state().wasps,B.swarmCount);
  const h0=hp(),n0=h.state().militaryUnits.length;
  assert.ok(until(h,()=>h.state().entityCounts.poisoned>0,240),'drones sting and poison troops');
  assert.ok(until(h,()=>h.state().ultimateTime<=0,300),'the Ultimate ends');
  assert.ok(h.state().wasps>0,'the swarm outlives the Ultimate');
  assert.ok(hp()<h0||h.state().militaryUnits.length<n0,'troops took damage');
  assert.ok(until(h,()=>h.state().wasps===0,Math.ceil(B.swarmLife*1.3*60)),'the swarm burns out');
 }finally{h.cleanup();}
});
