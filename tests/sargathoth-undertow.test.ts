import {test} from 'node:test';import assert from 'node:assert/strict';
import {animDuration} from '../src/presentation.ts';
// Undertow (docs/SARGATHOTH_KIT.md) heavy strips: rear, hold, slam are registered and timed. The snares it throws come with the Kelp Snare card.
test('Undertow: his heavy rear, hold and slam strips are registered',()=>{
 for(const [a,d] of [['heavyRear',5/20],['heavyHold',4/10],['heavySlam',9/18]] as const)assert.equal(animDuration('Sargathoth',a),d,a);
});
import {SARG,CONFIG as C} from '../src/config.ts';
import {animImpact} from '../src/presentation.ts';
import {createCombat,beginHeavy,receiveHit,chargeArmor} from '../src/combat.ts';
import {bootCampaign} from './helpers/game-harness.ts';
test('Undertow: the slam strip has a crash frame the hit waits for',()=>{assert.equal(animImpact('Sargathoth','heavySlam'),3/18);});
test('Undertow armor: hits hurt but cannot stagger or cancel a charging heavy while it is on',()=>{
 for(const on of [true,false]){chargeArmor.on=on;const s=createCombat();beginHeavy(s);const hp=s.hp;receiveHit(s,5,'enemy' as any,10,1);
  assert.ok(s.hp<hp,'still takes damage');assert.equal(s.charging,on,on?'charge holds':'charge cancelled');assert.equal(s.stagger>0,!on);}
 chargeArmor.on=false;});
test('Undertow in the real loop: nothing is hit at release, the crash frame hits at 1.9x reach and rolls a surge ahead',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Sargathoth'});
 try{
  h.step(40);const s=h.state(),x=s.x+s.width+C.meleeReach*1.6;
  h.down('KeyK');h.step(20);h.test().spawnUnit('police',x);h.step(1);
  const hp=()=>h.state().military.filter((u:any)=>u.type==='police').map((u:any)=>u.hp);const before=hp();
  h.up('KeyK');h.step(2);assert.deepEqual(hp(),before,'no hit at release: the wave is still cresting');
  h.step(Math.ceil(animImpact('Sargathoth','heavySlam')*60)+4);
  assert.ok(hp().some((v:number,i:number)=>v<before[i])||hp().length<before.length,'the crash frame lands the hit past the normal heavy reach');
 }finally{h.cleanup();}
});
