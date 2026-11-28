import {test} from 'node:test';import assert from 'node:assert/strict';
import {animDuration,SPRITES} from '../src/presentation.ts';
// Sargathoth's grab (docs/SARGATHOTH_KIT.md): a frond hauls the prop onto his crown, where the carry strips ride it.
test('Grab: the strips are registered (grab 13 frames at 22 fps; carry and carry-walk reuse idle and walk)',()=>{
 assert.equal(animDuration('Sargathoth','grab'),13/22);assert.equal(animDuration('Sargathoth','carry'),8/8);assert.equal(animDuration('Sargathoth','carryWalk'),8/10);
});
// Hold points are frame pixels; convert to world units from the feet and the body centre (the same maths as holdPoint, which needs loaded art).
const world=(a:any,p:number[])=>{const k=SPRITES.Sargathoth.width/(256*a.scale);return [(p[0]-a.anchor)*k,-(191-p[1])*k];};
test('Throw: the strip is registered (8 frames at 18 fps, once)',()=>{assert.equal(animDuration('Sargathoth','throw'),8/18);assert.equal(SPRITES.Sargathoth.anims.throw.once,true);});
test('Grab: the prop starts at his feet, follows the frond up, and lands where the carry strips hold it',()=>{
 const A=SPRITES.Sargathoth.anims,g=A.grab,c=A.carry,w=A.carryWalk,gh=g.hold as number[][],ch=c.hold as number[][],wh=w.hold as number[][];
 assert.equal(gh.length,g.frames);assert.equal(ch.length,c.frames);assert.equal(wh.length,w.frames);
 const s=world(g,gh[0]),e=world(g,gh[gh.length-1]),k=world(c,ch[0]);
 assert.ok(s[1]>-5&&s[0]>100&&s[0]<150,`starts on the street just ahead of him ${s}`);assert.ok(e[1]<s[1]-30,'hauled up');
 assert.ok(Math.abs(e[0]-k[0])<6&&Math.abs(e[1]-k[1])<8,`grab ends at the carry spot ${e} vs ${k}`);
 assert.ok(Math.abs(world(w,wh[0])[0]-k[0])<4&&Math.abs(world(w,wh[0])[1]-k[1])<4,'idle and walk carry hold the same point');
});
test('Grab: his tentacle reaches well past the normal grab box',async()=>{
 const {SARG,VEHICLES}=await import('../src/config.ts');
 assert.ok(SARG.grabReach>1&&VEHICLES.grabReach*SARG.grabReach+24>100,'reaches past 100 world units ahead of his centre');
});

// Grab a car in front of him and throw it; its launch speed is SARG.throwSpeed times another kaiju's.
const throwSpeed=async(kaiju:string)=>{
 const {bootCampaign}=await import('./helpers/game-harness.ts');const h=await bootCampaign(.75,{kaiju});
 try{
  h.step(40);const s=h.state();h.test().spawnVehicle('car',s.x+s.width+6);h.step(2);
  let ok=false;for(let n=0;n<8&&!ok;n++){h.tap('KeyH');h.step(4);ok=h.state().held==='car';}assert.ok(ok,'grabbed the car');
  h.step(30);h.tap('KeyH');h.step(1);const car=h.state().vehicles.find((v:any)=>v.kind==='car'&&v.state==='flying');assert.ok(car,'the car is flying');return Math.abs(car.vx);
 }finally{h.release();h.cleanup();}
};
test('Throw: a thrown car leaves his tentacle SARG.throwSpeed times as fast as another kaiju\'s throw',async()=>{
 const {SARG}=await import('../src/config.ts');const s=await throwSpeed('Sargathoth'),m=await throwSpeed('Mogurodon');
 assert.ok(Math.abs(s/m-SARG.throwSpeed)<.05,`throw ${s} vs ${m}`);
});
