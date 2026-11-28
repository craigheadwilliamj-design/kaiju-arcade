import {test} from 'node:test';import assert from 'node:assert/strict';
import {CONFIG as C,SARG} from '../src/config.ts';
import {animDuration} from '../src/presentation.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Frond Lash (docs/SARGATHOTH_KIT.md): Sargathoth's light combo plays his own strips, reaches further on each hit, and the third hit hauls troops in.
test('Frond Lash: his three light strips are registered, timed like the other kaiju and the reach grows hit by hit',()=>{
 assert.deepEqual(SARG.lashReach,[1,1.2,1.6]);
 for(const [a,fps] of [['light1',24],['light2',21],['light3',20]] as const)assert.equal(animDuration('Sargathoth',a),8/fps,a);
});
test('Frond Lash in the real loop: combo anims play in order; a target past the first hit\'s reach is caught by the whip and pulled to his feet',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Sargathoth'});
 try{
  h.step(40);const s=h.state(),seen:string[]=[];
  for(let n=0;n<3;n++){h.tap('KeyJ');h.step(3);seen.push(h.state().anim);h.step(Math.ceil(animDuration('Sargathoth',`light${n+1}`)*60)+1);}
  assert.deepEqual(seen,['light1','light2','light3']);
  h.step(120);
  // A policeman placed beyond hit 1 and hit 2's reach but inside hit 3's, spawned fresh before each swing (they walk at him): only the
  // whip touches it, and it hauls it in rather than knocking it away.
  const swing=(n:number)=>{const s2=h.state(),x=s2.x+s2.width+C.meleeReach*1.45;h.test().spawnUnit('police',x);h.step(1);
   const near=()=>h.state().military.filter((u:any)=>u.type==='police'&&Math.abs(u.x-x)<40);const before=near()[0];
   h.tap('KeyJ');h.step(4);const after=h.state().military.filter((u:any)=>u.type==='police'&&Math.abs(u.x-x)<200).sort((a:any,b:any)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
   h.step(Math.ceil(animDuration('Sargathoth',`light${n}`)*60)+1);return {before,after,x};};
  for(const n of [1,2]){const r=swing(n);assert.equal(r.after.hp,r.before.hp,`hit ${n} does not reach`);}
  const r=swing(3);assert.ok(!r.after||r.after.hp<r.before.hp,'hit 3 reaches');
  if(r.after)assert.ok(r.after.x<r.x,'and hauls it in toward him instead of knocking it away');
 }finally{h.cleanup();}
});
