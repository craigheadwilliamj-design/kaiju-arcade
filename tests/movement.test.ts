import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame} from './helpers/game-harness.ts';import {CONFIG as C,MOVE as MV} from '../src/config.ts';

async function drills(){const h=await bootGame(.75);h.click('#drills');h.click('#start');assert.equal(h.state().mode,'playing');return h;}
// Walk into the first wall, climb it with W and stand on the roof. Returns that building's index.
function climbFirst(h:any){
 h.down('KeyD');h.step(120);h.up('KeyD');
 const i=h.state().buildings.findIndex((b:any)=>b.x>h.state().x),roof=h.state().buildings[i].y;
 h.down('KeyW');for(let n=0;n<400&&h.state().y+h.state().height>roof+1;n++)h.step();h.up('KeyW');h.step(30);
 assert.ok(Math.abs(h.state().y+h.state().height-roof)<1,'on the roof');
 // Step inboard so the whole body is over the roof.
 h.down('KeyD');h.step(8);h.up('KeyD');h.step(2);return i;}

test('Shift runs faster than walking; a double-tapped direction runs too and opens with a dash',async()=>{
 const h=await drills();
 try{
  h.down('KeyA');h.step(60);h.up('KeyA');h.step(2);
  let x=h.state().x;h.down('KeyD');h.step(20);const walk=h.state().x-x;h.up('KeyD');h.step(2);
  assert.equal(h.state().running,false);
  x=h.state().x;h.down('ShiftLeft');h.down('KeyD');h.step(20);const run=h.state().x-x;assert.equal(h.state().running,true);h.up('KeyD');h.up('ShiftLeft');h.step(2);
  assert.ok(run>walk*1.6,`run ${run} vs walk ${walk}`);
  h.down('KeyA');h.step(60);h.up('KeyA');h.step(2);
  x=h.state().x;h.tap('KeyD');h.step(2);h.down('KeyD');h.step(20);const dash=h.state().x-x;assert.equal(h.state().running,true,'double-tap latches the run');
  assert.ok(dash>walk*1.6,`dash ${dash} vs walk ${walk}`);
  h.up('KeyD');h.step(2);h.down('KeyD');h.step(2);assert.equal(h.state().running,false,'releasing the direction ends the run');h.up('KeyD');
 }finally{h.cleanup();}
});

test('running into a building shoulder-barges it',async()=>{
 const h=await drills();
 try{
  const i=h.state().buildings.findIndex((b:any)=>b.x>h.state().x),hp=h.state().buildings[i].hp;
  h.down('ShiftLeft');h.down('KeyD');h.step(150);h.up('KeyD');h.up('ShiftLeft');
  assert.ok(h.state().buildings[i].hp<hp,'barge damaged the wall');
 }finally{h.cleanup();}
});

test('jumping into a wall grabs it without W, and pushing into it climbs onto the roof',async()=>{
 const h=await drills();
 try{
  h.down('KeyD');h.step(120);h.up('KeyD');
  const i=h.state().buildings.findIndex((b:any)=>b.x>h.state().x),roof=h.state().buildings[i].y;
  h.down('KeyA');h.step(25);h.up('KeyA');
  h.down('KeyD');h.step(4);h.tap('Space');
  let grabbed=false;for(let n=0;n<60&&!grabbed;n++){h.step();grabbed=h.state().clinging||h.state().y+h.state().height<=roof+1;}
  assert.ok(grabbed,'leap caught the wall');
  for(let n=0;n<400&&h.state().y+h.state().height>roof+1;n++)h.step();h.up('KeyD');h.step(20);
  assert.ok(Math.abs(h.state().y+h.state().height-roof)<1,'climbed up onto the roof by holding D');
  assert.equal(h.state().grounded,true);
 }finally{h.cleanup();}
});

test('S in the air dives and slams the roof below; S+J pounds the building you stand on',async()=>{
 const h=await drills();
 try{
  const i=climbFirst(h);
  // Pound: crouch on the roof and hit J.
  let hp=h.state().buildings[i].hp;h.down('KeyS');h.step(4);assert.equal(h.state().crouched,true);
  h.tap('KeyJ');h.step(1);assert.ok(h.state().buildings[i].hp<hp,'pound hits the building underfoot');
  assert.ok(['ultPound','heavySlam'].includes(h.state().anim));
  h.up('KeyS');h.step(40);
  // Slam: jump, S in the air, land on the same roof harder than a pound.
  hp=h.state().buildings[i].hp;const pounded=h.state().buildings.map((b:any)=>b.hp);
  if(hp>0){h.tap('Space');h.step(18);h.tap('KeyS');assert.equal(h.state().diving,true);
   for(let n=0;n<120&&h.state().diving;n++)h.step();
   assert.ok(h.state().buildings[i].hp<hp,'slam damaged the roof');
   assert.ok(hp-h.state().buildings[i].hp>C.lightDamage*MV.poundMult,'slam out-hits a pound');}
  else assert.ok(pounded[i]===0);
 }finally{h.cleanup();}
});

test('a street slam makes a shockwave; S on the wall still climbs down instead of diving',async()=>{
 const h=await drills();
 try{
  h.step(30);h.tap('Space');h.step(15);assert.equal(h.state().grounded,false,'airborne');h.tap('KeyS');assert.equal(h.state().diving,true);
  for(let n=0;n<60&&h.state().diving;n++)h.step();
  assert.equal(h.state().diving,false);assert.ok(h.state().entityCounts.tremorWaves>=2,'shockwave both ways');
  h.down('KeyD');h.step(120);h.up('KeyD');h.down('KeyW');h.step(30);h.up('KeyW');assert.equal(h.state().clinging,true);
  h.down('KeyS');h.step(3);assert.equal(h.state().diving,false);assert.ok(h.state().clinging);h.up('KeyS');
 }finally{h.cleanup();}
});

test('a street slam with a direction held rolls the cannonball, plows ahead and ricochets off the first wall',async()=>{
 const h=await drills();
 try{
  // Back off west so there is street to roll on before the first building.
  h.down('KeyA');h.step(90);h.up('KeyA');h.step(30);
  const i=h.state().buildings.findIndex((b:any)=>b.x>h.state().x),hp=h.state().buildings[i].hp;
  h.tap('Space');h.step(15);h.tap('KeyS');h.down('KeyD');
  for(let n=0;n<60&&h.state().diving;n++)h.step();
  assert.equal(h.state().rolling,true,'kept rolling after the street slam');h.up('KeyD');
  h.step(6);const x0=h.state().x;h.step(6);assert.ok(h.state().x-x0>6*205/60*2,'rolls faster than walking without input');
  let bounced=false;for(let n=0;n<90&&h.state().rolling;n++){h.step();if(h.state().face<0)bounced=true;}
  assert.ok(h.state().buildings[i].hp<hp,'the ball smacked the wall');assert.ok(bounced,'ricocheted back west');
  for(let n=0;n<120&&h.state().rolling;n++)h.step();assert.equal(h.state().rolling,false,'roll ends');
  // Without a direction held the slam just bursts out.
  h.step(30);h.tap('Space');h.step(15);h.tap('KeyS');for(let n=0;n<60&&h.state().diving;n++)h.step();assert.equal(h.state().rolling,false);
 }finally{h.cleanup();}
});

test('Space jumps out of the roll; attacks are ignored inside the ball',async()=>{
 const h=await drills();
 try{
  h.down('KeyA');h.step(90);h.up('KeyA');h.step(30);
  h.tap('Space');h.step(15);h.tap('KeyS');h.down('KeyD');for(let n=0;n<60&&h.state().diving;n++)h.step();
  assert.equal(h.state().rolling,true);const c=h.state().combo;h.tap('KeyJ');h.step(1);assert.equal(h.state().combo,c,'no swipe while rolling');
  h.tap('Space');h.step(2);assert.equal(h.state().rolling,false);assert.equal(h.state().grounded,false,'jumped out');h.up('KeyD');
 }finally{h.cleanup();}
});

test('the roll is easy to trigger: a tap of A/D during the dive latches it, and Run + S curls up from the ground',async()=>{
 const h=await drills();
 try{
  h.down('KeyA');h.step(90);h.up('KeyA');h.step(30);
  // Tap D mid-dive and let go before landing: still rolls east.
  h.tap('Space');h.step(15);h.tap('KeyS');h.tap('KeyD');
  for(let n=0;n<60&&h.state().diving;n++)h.step();
  assert.equal(h.state().rolling,true,'direction latched during the dive');assert.equal(h.state().face,1);
  for(let n=0;n<200&&h.state().rolling;n++)h.step();h.step(30);
  // Running + S on the ground: straight into the ball.
  h.down('KeyA');h.step(60);h.up('KeyA');h.step(10);
  h.down('ShiftLeft');h.down('KeyD');h.step(10);h.tap('KeyS');h.step(1);
  assert.equal(h.state().rolling,true,'run + S rolls');assert.equal(h.state().crouched,false);
  h.up('KeyD');h.up('ShiftLeft');for(let n=0;n<200&&h.state().rolling;n++)h.step();assert.equal(h.state().rolling,false);
  // Walking + S is still just a crouch.
  h.step(30);h.down('KeyA');h.step(5);h.down('KeyS');h.step(3);assert.equal(h.state().rolling,false);assert.equal(h.state().crouched,true);h.up('KeyS');h.up('KeyA');
 }finally{h.cleanup();}
});
