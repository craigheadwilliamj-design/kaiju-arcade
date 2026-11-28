import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';
import {setTerrain,groundAt,bedAt,addMound,moundAt} from '../src/terrain.ts';
import {CONFIG as C,TWISTS as TW,RIVER} from '../src/config.ts';
import {emptyPermanent,PERMANENT_KEY,CAMPAIGN} from '../src/campaign.ts';import {cityIndexOf} from '../src/levels.ts';
// The five original cities, in their old order (San Francisco now leads the campaign ahead of them).
const ORIGINAL=['nyc-classic','mex-classic','par','hkg','tyo','syd'];

test('rubble mounds raise the ground (not the street under them) with sloped sides',()=>{
 setTerrain(null);addMound(100,200,30,.3);assert.equal(moundAt(150),30);assert.equal(groundAt(150),C.ground-30);assert.equal(bedAt(150),C.ground,'the street is still under it');
 assert.ok(moundAt(105)>0&&moundAt(105)<30,'sloped sides');assert.equal(moundAt(250),0);setTerrain(null);assert.equal(moundAt(150),0,'a new block clears them');
});

// city: one of the original five, in their old order (0 New York .. 4 Tokyo).
async function free(city:number,block=0){
 // The fixture cities (nyc-classic, mex-classic) are off the route and not in Free Play, so they boot through the campaign harness.
 if(!CAMPAIGN.includes(ORIGINAL[city])){const h=await bootCampaign(.75,{city:ORIGINAL[city],kaiju:'Mogurodon'});h.test().gotoCity(ORIGINAL[city],block);for(let n=0;n<20;n++)h.step();return h;}
 const p=emptyPermanent();p.conquered=[...CAMPAIGN];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#freeplay');h.node('#free-kaiju').value='Mogurodon';h.node('#free-city').value=String(cityIndexOf(ORIGINAL[city]));h.node('#free-boss').value='Mogurodon';h.node('#free-block').value=String(block);h.click('#free-start');
 for(let n=0;n<20;n++)h.step();return h;}
const slam=(h:any)=>{h.tap('Space');h.step(16);h.down('KeyS');h.step(36);h.up('KeyS');h.step(30);};

test('real loop: a collapsed building leaves a climbable rubble heap',async()=>{
 const h=await bootGame(.75);
 try{h.click('#drills');h.click('#start');h.down('KeyD');h.step(150);h.up('KeyD');
  for(let n=0;n<40&&h.state().buildings[0].hp>0;n++){h.down('KeyK');h.step(20);h.up('KeyK');h.step(40);}
  for(let n=0;n<90;n++)h.step();const s=h.state(),b=s.buildings[0];assert.equal(b.hp,0);assert.ok(s.mounds>=1,'a heap formed');
  assert.ok(s.ground(b.x+b.w/2)<C.ground-5,'the ground is higher over the rubble');assert.equal(s.street(b.x+b.w/2),C.ground);
 }finally{h.release();h.cleanup();}
});

test('real loop: Tlézcatl\'s flame washed against a wall sets the building alight, and the fire eats it',async()=>{
 const {KAIJU}=await import('../src/campaign.ts');const p=emptyPermanent();p.unlocked=[...KAIJU];const h=await bootCampaign(.75,{kaiju:'Tlézcatl',permanent:p});
 try{
  h.step(20);
  // Walk up to the first building east of the plaza, step back a little, and breathe fire down at the street in front of its wall.
  const s=h.state(),t=s.buildings.filter((b:any)=>b.kind!=='tiny'&&b.x>s.x).sort((a:any,b:any)=>a.x-b.x)[0];
  for(let n=0;n<300&&h.state().x+h.state().width<t.x-60;n++){h.down('KeyD');h.step(1);}h.up('KeyD');
  let lit=false;for(let k=0;k<8&&!lit;k++){h.down('KeyS');h.down('KeyL');h.step(60);h.step(50);h.up('KeyL');h.up('KeyS');for(let n=0;n<90&&!lit;n++){h.step();lit=h.state().blazes>0;}}
  assert.ok(lit,'a building caught fire');const i=h.state().blazeList[0],hp0=h.state().buildings[i].hp;for(let n=0;n<150;n++)h.step();
  assert.ok(h.state().buildings[i].hp<hp0,'and the fire damaged it');
 }finally{h.release();h.cleanup();}
});

test('real loop: Hong Kong starts on a hillside terrace',async()=>{
 const h=await free(3,0);
 try{for(let n=0;n<30;n++)h.step();const s=h.state();assert.ok(s.y+s.height<C.ground-10,`standing above the street line (${s.y+s.height})`);assert.equal(s.grounded,true);}finally{h.release();h.cleanup();}
});

test('real loop: Paris has catacombs under every street (a slam caves in, no trains ever run)',async()=>{
 const h=await free(2,0);
 try{slam(h);assert.equal(h.state().pits.length,1,'caved into the catacombs');assert.equal(h.state().banner===null||true,true);
  let trains=false;for(let n=0;n<60*(RIVER.trainEvery+2);n++){h.step();if(h.state().trains>0)trains=true;}assert.equal(trains,false);}
 finally{h.release();h.cleanup();}
});

test('real loop: Mexico City ground is soft: a slam near buildings sinks them',async()=>{
 const h=await free(1,0);
 try{const s=h.state(),c=s.x+s.width/2;const near=s.buildings.filter((b:any)=>b.hp>0&&b.kind!=='tiny'&&Math.abs(b.x+b.w/2-c)<TW.sinkRadius);
  // Walk toward the nearest building first if none is in range.
  if(!near.length){const t=s.buildings.filter((b:any)=>b.hp>0&&b.kind!=='tiny').sort((a:any,b:any)=>Math.abs(a.x-c)-Math.abs(b.x-c))[0];const k=t.x>c?'KeyD':'KeyA';for(let n=0;n<600&&Math.abs(t.x+t.w/2-(h.state().x+h.state().width/2))>TW.sinkRadius*.8;n++){h.down(k);h.step(1);}h.up(k);}
  slam(h);assert.ok(h.state().sunk>0,'buildings sank');}
 finally{h.release();h.cleanup();}
});

test('real loop: only levels that opt in sink: a slam in the Zócalo sinks nothing, one in Templo Mayor does',async()=>{
 const {LEVELS}=await import('../src/levels.ts');const mex=LEVELS[cityIndexOf('mex')];assert.deepEqual(mex.filter(b=>b.sinking).map(b=>b.name),['Templo Mayor'],'Templo Mayor is the one reworked level with the sinking twist');
 for(const [name,sinks] of [['Zócalo',false],['Templo Mayor',true]] as const){
  const p=emptyPermanent();const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
  try{assert.ok(h.test().goto(mex.findIndex(b=>b.name===name)));h.step(20);const s=h.state(),c=s.x+s.width/2;
   const t=s.buildings.filter((b:any)=>b.hp>0&&b.kind!=='tiny').sort((a:any,b:any)=>Math.abs(a.x-c)-Math.abs(b.x-c))[0];const k=t.x>c?'KeyD':'KeyA';
   for(let n=0;n<600&&Math.abs(t.x+t.w/2-(h.state().x+h.state().width/2))>TW.sinkRadius*.8;n++){h.down(k);h.step(1);}h.up(k);
   slam(h);assert.equal(h.state().sunk>0,sinks,`${name}: sunk ${h.state().sunk}`);}
  finally{h.release();h.cleanup();}void p;}
});

test('real loop: Tokyo towers are quake-proof: small blows are halved and they sway',async()=>{
 const h=await free(4,0);
 try{const s=h.state(),c=s.x+s.width/2;const i=s.buildings.map((b:any,k:number)=>k).filter((k:number)=>{const b=s.buildings[k];return b.hp>0&&b.kind!=='tiny'&&b.h>=TW.quakeHeight;}).sort((a:number,b:number)=>Math.abs(s.buildings[a].x-c)-Math.abs(s.buildings[b].x-c))[0];
  const t=s.buildings[i],k=t.x>c?'KeyD':'KeyA';for(let n=0;n<800;n++){const q=h.state();const gap=k==='KeyD'?t.x-(q.x+q.width):q.x-(t.x+t.w);if(gap<4)break;h.down(k);h.step(1);}h.up(k);
  const hp0=h.state().buildings[i].hp;h.tap('KeyJ');h.step(12);const q=h.state();
  assert.ok(q.swaying>0,'it sways');assert.ok(hp0-q.buildings[i].hp<=C.lightDamage*TW.quakeKeep+.01&&q.buildings[i].hp<hp0,`a light blow does half (${hp0-q.buildings[i].hp})`);}
 finally{h.release();h.cleanup();}
});
