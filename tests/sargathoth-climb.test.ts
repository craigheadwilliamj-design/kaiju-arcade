import {test} from 'node:test';import assert from 'node:assert/strict';
import {animDuration} from '../src/presentation.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Sargathoth's climb (docs/SARGATHOTH_KIT.md): grab / loop / punch / mantle strips, registered and timed.
test('Climb: the strips are registered with the shared climb timing',()=>{
 assert.equal(animDuration('Sargathoth','climbGrab'),5/20);assert.equal(animDuration('Sargathoth','climbPunch'),8/24);assert.equal(animDuration('Sargathoth','climbMantle'),9/20);
});
test('Climb in the real loop: W grabs the first wall and he climbs onto its roof',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Sargathoth'});
 try{
  h.step(40);h.down('KeyD');h.step(400);h.up('KeyD');
  const b=h.state().buildings.find((x:any)=>x.x>h.state().x);assert.ok(b,'a building ahead');const roof=b.y;
  h.down('KeyD');h.down('KeyW');for(let n=0;n<900&&h.state().y+h.state().height>roof+1;n++)h.step();h.up('KeyW');h.up('KeyD');h.step(30);
  assert.ok(Math.abs(h.state().y+h.state().height-roof)<2||h.state().y+h.state().height<roof,'on or above the roof');
 }finally{h.cleanup();}
});
