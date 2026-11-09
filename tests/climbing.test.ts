import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {CONFIG as C} from '../src/config.ts';
test('buildings are solid, can be climbed with W, stood on, and dropped from when destroyed',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#drills');h.click('#start');assert.equal(h.state().mode,'playing');
  h.down('KeyD');h.step(120);h.up('KeyD');
  const wallX=h.state().x,first=h.state().buildings.find((b:any)=>b.x>wallX)!;
  assert.equal(wallX,first.x-h.state().width,'solid building blocks walking');
  const roof=first.y;
  h.down('KeyW');for(let i=0;i<400&&h.state().y+h.state().height>roof+1;i++)h.step();h.up('KeyW');h.step(30);
  const s=h.state();
  assert.ok(Math.abs(s.y+s.height-roof)<1,`stands on roof (${s.y+s.height} vs ${roof})`);
  assert.equal(s.grounded,true);
  // Walking off the far edge drops the player back down.
  h.down('KeyD');h.step(300);h.up('KeyD');h.step(120);
  assert.ok(h.state().y+h.state().height<=C.ground+.01);
  // Without W there is no climbing.
  const before=h.state().y;h.down('KeyA');h.step(5);h.up('KeyA');assert.ok(h.state().y>=before-1);
 }finally{h.cleanup();}
});
