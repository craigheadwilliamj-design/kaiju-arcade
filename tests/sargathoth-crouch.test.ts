import {test} from 'node:test';import assert from 'node:assert/strict';
import {animDuration} from '../src/presentation.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Sargathoth's crouch (docs/SARGATHOTH_KIT.md): down / loop / up strips, registered and timed.
test('Crouch: the down and up strips are registered (5 frames at 22 fps)',()=>{for(const a of ['crouchDown','crouchUp'])assert.equal(animDuration('Sargathoth',a),5/22,a);});
test('Crouch in the real loop: S ducks him to the crouch hitbox and releasing stands him back up',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Sargathoth'});
 try{h.step(40);const stand=h.state().height;h.down('KeyS');h.step(30);assert.ok(h.state().height<stand,'ducked');h.up('KeyS');h.step(30);assert.equal(h.state().height,stand,'stood up');}finally{h.cleanup();}
});
