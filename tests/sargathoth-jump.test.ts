import {test} from 'node:test';import assert from 'node:assert/strict';
import {SARG,CONFIG as C} from '../src/config.ts';
import {animDuration} from '../src/presentation.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Sargathoth's jump (docs/SARGATHOTH_KIT.md): three strips, the worst ground jump on the roster, and a slightly slower fall.
test('Jump: rise, air and land strips are registered and timed',()=>{
 for(const [a,d] of [['jumpRise',6/24],['jumpLand',5/20]] as const)assert.equal(animDuration('Sargathoth',a),d,a);
});
const jump=async(kaiju:string)=>{
 const h=await bootCampaign(.75,{kaiju});
 try{h.step(40);const y0=h.state().y;h.tap('Space');let peak=y0,fallAccel=0,prev=h.state().vy;
  for(let i=0;i<120&&!(i>5&&h.state().grounded);i++){h.step();const s=h.state();peak=Math.min(peak,s.y);if(s.vy>0&&prev>0&&!fallAccel)fallAccel=(s.vy-prev)*60;prev=s.vy;}
  return {height:y0-peak,fallAccel};}finally{h.cleanup();}
};
test('Jump: he launches at SARG.jump of a normal jump (its square in height) and falls under SARG.fallGravity',async()=>{
 const s=await jump('Sargathoth'),m=await jump('Mogurodon');
 assert.ok(s.height>20&&m.height>s.height,`heights ${s.height} vs ${m.height}`);
 assert.ok(Math.abs(s.height/m.height-SARG.jump**2)<.06,`height ratio ${s.height/m.height}`);
 assert.ok(Math.abs(s.fallAccel/m.fallAccel-SARG.fallGravity)<.03,`fall accel ${s.fallAccel} vs ${m.fallAccel} (gravity ${C.gravity})`);
});
