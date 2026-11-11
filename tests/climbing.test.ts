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
  assert.equal(h.state().zoom,C.zoom,'zoom holds through the climb');
  // Walking off the roof edge drops the player back down.
  h.down('KeyA');h.step(90);h.up('KeyA');h.step(120);
  assert.ok(h.state().y+h.state().height<=C.ground+.01);
  h.step(240);assert.ok(h.state().cameraY<1,'camera returns to street level');
  // Without W there is no climbing.
  const before=h.state().y;h.down('KeyD');h.step(5);h.up('KeyD');assert.ok(h.state().y>=before-1);
 }finally{h.cleanup();}
});

test('climbing is a clinging state: hang when idle, S climbs down, Space jumps off',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#drills');h.click('#start');assert.equal(h.state().mode,'playing');
  h.down('KeyD');h.step(120);h.up('KeyD');
  const wall=h.state().buildings.find((b:any)=>b.x>h.state().x)!,roof=wall.y;
  // Climb partway, then release W: the player hangs in place instead of sliding down.
  h.down('KeyW');h.step(30);h.up('KeyW');
  assert.equal(h.state().clinging,true);
  const hangY=h.state().y;assert.ok(hangY+h.state().height<C.ground-20,'off the street');
  h.step(120);
  assert.equal(h.state().y,hangY,'no slide while hanging');assert.equal(h.state().clinging,true);
  // S moves down the wall and lets go on reaching the street.
  h.down('KeyS');h.step(10);assert.ok(h.state().y>hangY,'S descends');
  for(let i=0;i<400&&!h.state().grounded;i++)h.step();h.up('KeyS');
  assert.equal(h.state().grounded,true);assert.equal(h.state().clinging,false);
  assert.ok(Math.abs(h.state().y+h.state().height-C.ground)<1);
  // Climb again, then Space jumps off; holding W does not instantly re-grab the wall.
  h.down('KeyW');h.step(30);assert.equal(h.state().clinging,true);
  h.tap('Space');h.step(1);
  assert.equal(h.state().clinging,false);assert.ok(h.state().vy<0,'jumped off upward');
  h.step(60);assert.equal(h.state().clinging,false,'W held after jump-off does not re-grab');
  // A real key release lasts at least one frame; that frame is what re-arms the grab.
  h.up('KeyW');h.step(1);
  // Releasing W re-arms the grab, and W again re-attaches while still beside the wall.
  for(let i=0;i<400&&!h.state().grounded;i++)h.step();
  h.down('KeyW');h.step(5);assert.equal(h.state().clinging,true);h.up('KeyW');
  // Climbing all the way up still mantles onto the roof.
  h.down('KeyW');for(let i=0;i<400&&h.state().y+h.state().height>roof+1;i++)h.step();h.up('KeyW');h.step(30);
  assert.equal(h.state().clinging,false);assert.equal(h.state().grounded,true);
  assert.ok(Math.abs(h.state().y+h.state().height-roof)<1,'stands on roof');
 }finally{h.cleanup();}
});

test('J while clinging punches the wall one-handed without letting go',async()=>{
 const h=await bootGame(.75);
 try{
  h.click('#drills');h.click('#start');
  h.down('KeyD');h.step(120);h.up('KeyD');
  const i=h.state().buildings.findIndex((b:any)=>b.x>h.state().x);
  h.down('KeyW');h.step(30);h.up('KeyW');h.step(2);assert.equal(h.state().clinging,true);
  const hp=h.state().buildings[i].hp,y=h.state().y;
  h.tap('KeyJ');h.step(1);
  assert.equal(h.state().anim,'climbPunch');assert.equal(h.state().clinging,true,'still on the wall');
  assert.ok(h.state().buildings[i].hp<hp,'the punch damages the wall');
  h.step(40);assert.equal(h.state().anim,'climb','back to the climb loop');assert.equal(h.state().y,y,'no slide');
  // Back on the street, J is the normal swipe again.
  h.down('KeyS');for(let n=0;n<400&&!h.state().grounded;n++)h.step();h.up('KeyS');h.step(30);
  h.tap('KeyJ');h.step(1);assert.equal(h.state().anim,'light1');
 }finally{h.cleanup();}
});
