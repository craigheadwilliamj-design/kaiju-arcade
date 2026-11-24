import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';
import {setTerrain,groundAt,bedAt,submerged,waterAt,deckAt,addPit,pitAt,pitList,profileFrom} from '../src/terrain.ts';
import {createMilitary,spawnSquad,spawnUnit,tickMilitary} from '../src/military.ts';
import {LEVELS,cityIndexOf} from '../src/levels.ts';
import {CONFIG as C,FEEL,RIVER} from '../src/config.ts';
import {emptyPermanent,PERMANENT_KEY} from '../src/campaign.ts';

test('terrain: water is only "submerged" where no live deck covers it; pits are lower ground and merge',()=>{
 const deck={x0:100,x1:300,y:C.ground,alive:true};
 setTerrain([[0,435],[100,435],[120,480],[280,480],[300,435]],[[110,290,450]],[deck]);
 assert.equal(groundAt(200),C.ground,'the deck is the ground while it stands');assert.equal(bedAt(200),480,'the riverbed is under it');
 assert.equal(waterAt(200),450);assert.equal(submerged(200),false);
 deck.alive=false;assert.equal(groundAt(200),480);assert.equal(submerged(200),true,'deck gone: under water');assert.equal(deckAt(200),null);
 assert.equal(submerged(50),false,'dry land is never submerged');
 addPit(500,560,500);addPit(550,620,500);assert.equal(pitList().length,1,'touching pits merge');assert.deepEqual([pitAt(600)!.x0,pitAt(600)!.x1],[500,620]);assert.equal(groundAt(590),500);
 setTerrain(null);assert.equal(pitList().length,0,'a new block starts with no pits');
});

test('East River: a river under a three-span bridge, a subway line under the west half, an armory at each end',()=>{
 const b=LEVELS[cityIndexOf('nyc')][3];assert.equal(b.name,'East River Offensive');
 assert.equal(b.water!.length,1);const [wa,wz,wy]=b.water![0];assert.ok(wy>C.ground,'the surface sits a little below the street');
 assert.equal(b.bridge!.spans,3);assert.ok(b.bridge!.x0<=wa&&b.bridge!.x1>=wz,'the bridge spans the whole river');
 for(const x of b.buildings)if(x.kind!=='tiny')assert.ok(x.x+x.w<=b.bridge!.x0||x.x>=b.bridge!.x1,`${x.x}: nothing stands in the river`);
 const [sa,sz]=b.subway![0];assert.ok(sz<wa&&sz-sa>1500,'a long subway line on the Manhattan side');
 const armories=b.buildings.filter(x=>x.role==='armory');assert.equal(armories.length,2);assert.ok(armories[0].x<b.start!&&armories[1].x>b.start!,'one each side');
 assert.ok(b.start!<b.subway![0][1]+600,'the start is near the subway');
});

test('an armory down cuts off squads from its side; troops never walk into open water on their own',()=>{
 const s=createMilitary(2,0,()=>.2);s.cutOff['1']=30;const types=spawnSquad(s,1000,960,0);assert.ok(types);
 assert.ok(s.units.every(u=>u.face===-1),'with the west cut off the squad arrives from the east');
 const t=createMilitary(2,0,()=>.2);t.cutOff['1']=30;t.cutOff['-1']=30;assert.equal(spawnSquad(t,1000,960,0),null,'both cut off: nobody comes');
 setTerrain([[0,435],[400,435],[420,480],[700,480],[720,435]],[[410,710,450]],[]);
 const m=createMilitary(2,0,()=>.5);const u=spawnUnit(m,'soldier',300,1);const player={x:900,y:C.ground-69,w:48,h:69};
 for(let n=0;n<600;n++)tickMilitary(m,1/60,0,2000,player,0,undefined,'player',1920,1);
 assert.ok(u.x+u.w/2<410,`stopped at the bank (x ${u.x})`);
 const v=spawnUnit(m,'soldier',560,1);assert.ok(!submerged(v.x+v.w/2),'never spawned in the water');
 setTerrain(null);
});

async function eastRiver(){const p=emptyPermanent();p.conquered=['nyc'];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#freeplay');h.node('#free-kaiju').value='Mogurodon';h.node('#free-city').value=String(cityIndexOf('nyc'));h.node('#free-boss').value='Mogurodon';h.node('#free-block').value='3';h.click('#free-start');return h;}

test('real loop: Free Play can start on any block; East River opens with the bridge standing and trains already running',async()=>{
 const h=await eastRiver();
 try{let seen=false;for(let n=0;n<Math.round((RIVER.trainEvery+1)*60);n++){h.step();if(h.state().trains>0){seen=true;break;}}assert.ok(seen,'trains run in the tunnel before any street is broken');
  const s=h.state();assert.equal(s.mode,'playing');assert.equal(s.blockIndex,3);assert.deepEqual(s.spans.map((x:any)=>x.alive),[true,true,true]);assert.equal(s.pits.length,0);}
 finally{h.release();h.cleanup();}
});

test('real loop: a slam on the street over the subway caves it in; the kaiju lands in the pit and a train comes through',async()=>{
 const h=await eastRiver();
 try{
  h.down('KeyA');h.step(90);h.up('KeyA');h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);
  let s=h.state();assert.equal(s.pits.length,1,'the street caved in');const p=s.pits[0];
  assert.ok(Math.abs(s.y+s.height-p.floor)<2,'standing on the pit floor');assert.ok(p.x1-p.x0>=RIVER.pitMin-1);
  h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);s=h.state();
  assert.equal(s.pits.length,1);assert.ok(Math.abs(s.pits[0].floor-p.floor)<1,'slamming inside a pit does not dig it deeper');
  // Standing in the pit puts the kaiju in the trains' way: the next one smashes into it and derails; the one after piles into the wreck.
  let smashed=false,banner='';
  for(let n=0;n<Math.round((RIVER.trainEvery*2+4)*60);n++){h.step();const q=h.state();if(q.banner)banner=q.banner;if(q.trainWrecks>0){smashed=true;break;}}
  assert.ok(smashed,'a train derailed against the kaiju');assert.equal(banner,'TRAIN SMASHED INTO THE KAIJU');assert.ok(h.state().damageTaken>0,'and it hurt a little');
  let pile=false;for(let n=0;n<Math.round((RIVER.trainEvery*3+4)*60);n++){h.step();if(h.state().trainWrecks>=2){pile=true;break;}}
  assert.ok(pile,'the next train piled into the wreck (or the kaiju)');
  for(let n=0;n<3;n++){h.tap('KeyH');h.step(20);}assert.notEqual(h.state().held,'train','only Stage 3 can lift a train');if(h.state().held){h.tap('KeyH');h.step(30);}
  // Three wrecks close the line: no more trains, so it can't be farmed.
  for(let n=0;n<Math.round((RIVER.trainEvery*4+4)*60)&&h.state().trainsWrecked<RIVER.trainWrecks;n++)h.step();
  assert.equal(h.state().trainsWrecked,RIVER.trainWrecks);for(let n=0;n<Math.round(RIVER.trainEvery*60*.2);n++)h.step();
  let more=false;for(let n=0;n<Math.round(RIVER.trainEvery*3*60);n++){h.step();if(h.state().trains>0){more=true;break;}}
  assert.equal(more,false,'the line is closed');assert.equal(h.state().trainsWrecked,RIVER.trainWrecks);
 }finally{h.release();h.cleanup();}
});

test('real loop: a fully charged Stage 3 heavy on a middle floor shears the top off and throws it',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Mogurodon'});
 try{
  // Clear Lower Manhattan (evolving to Stage 3 on the way); evolution carries into Midtown, whose plaza has untouched towers beside it.
  
  const hold=(code:string,frames:number)=>{h.down(code);h.step(frames);h.up(code);};
  const sweep=(fwd:string,back:string,limit:number)=>{for(let n=0;n<limit&&h.state().mode==='playing';n++){
   if(h.state().ultimate>=100&&h.state().transform===0)h.tap('KeyU');hold(fwd,8);h.tap('KeyK');h.step(40);hold(back,1);h.tap('KeyK');h.step(40);hold(fwd,3);}};
  sweep('KeyD','KeyA',120);sweep('KeyA','KeyD',200);assert.equal(h.state().mode,'results');h.click('#advance');assert.equal(h.state().stage,3,'still Stage 3 in Midtown');
  for(let n=0;n<60;n++)h.step();
  const s=h.state(),cx=s.x+s.width/2,k=s.buildings.map((b:any,i:number)=>i).filter((i:number)=>s.buildings[i].x+s.buildings[i].w<cx&&s.buildings[i].kind!=='tiny').sort((a:number,b:number)=>s.buildings[b].x-s.buildings[a].x)[0];
  const t=s.buildings[k];assert.ok(t.floors>=6&&t.hp>200&&!t.landmark,'a tall tower stands at the west edge of the plaza');
  for(let n=0;n<600&&h.state().x>t.x+t.w+2;n++){h.down('KeyA');h.step(1);}h.up('KeyA');for(let n=0;n<30;n++)h.step();
  const f0=h.state().buildings[k].floors;h.down('KeyK');h.step(100);h.up('KeyK');h.step(2);
  const after=h.state();assert.ok(after.buildings[k].hp>0,'the tower survives');assert.ok(after.buildings[k].floors<=f0-3,`sheared (${f0} -> ${after.buildings[k].floors} floors)`);
  assert.ok(after.vehicles.some((v:any)=>v.kind==='building'&&v.state==='flying'),'the top is flying');
  for(let n=0;n<240;n++)h.step();assert.ok(h.state().vehicles.every((v:any)=>v.kind!=='building'||v.state!=='flying'),'and lands');
 }finally{h.release();h.cleanup();}
});

test('real loop: traffic that drives into a pit careens off the edge instead of driving through it',async()=>{
 const h=await eastRiver();
 try{
  h.down('KeyA');h.step(90);h.up('KeyA');h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);
  const p=h.state().pits[0];assert.ok(p);h.down('KeyD');h.step(60);h.up('KeyD');
  let through=0,careened=0;const seen=new Set<number>();
  for(let n=0;n<60*40;n++){h.step();for(const v of h.state().vehicles){const c=v.x+v.w/2,inside=c>p.x0&&c<p.x1;
   if(inside&&v.state==='driving')through++;if(inside&&v.state==='flying'&&!seen.has(v.id)){seen.add(v.id);careened++;}}}
  assert.equal(through,0,'nothing drives along the pit floor');assert.ok(careened>0,'cars went over the edge');
 }finally{h.release();h.cleanup();}
});

test('real loop: Stage 3 pulls a whole train out of a pit and throws it (in Combat Drills, which has a subway at its east end)',async()=>{
 const {DRILL_BLOCK}=await import('../src/levels.ts');
 const h=await bootGame(.75);
 try{
  h.click('#drills');h.click('#start');
  const hold=(code:string,frames:number)=>{h.down(code);h.step(frames);h.up(code);};
  const [a,z]=DRILL_BLOCK.subway![0];
  // Smash east through the packed street until Stage 3 and standing over the subway line on open street.
  const open=()=>{const q=h.state(),c=q.x+q.width/2;return c>a+200&&c<z-300&&!q.buildings.some((b:any)=>b.hp>0&&b.kind!=='tiny'&&b.x<c+q.width&&b.x+b.w>c-q.width);};
  for(let n=0;n<500&&h.state().mode==='playing'&&!(h.state().stage>=3&&open());n++){if(h.state().ultimate>=100&&h.state().transform===0)h.tap('KeyU');hold('KeyD',8);h.tap('KeyK');h.step(40);hold('KeyA',1);h.tap('KeyK');h.step(40);hold('KeyD',3);}
  assert.equal(h.state().mode,'playing');assert.equal(h.state().stage,3,'Stage 3');assert.ok(open(),'on open street over the subway');
  h.tap('Space');h.step(20);h.down('KeyS');h.step(40);h.up('KeyS');h.step(30);assert.ok(h.state().pits.length>=1,'caved in');
  for(let n=0;n<60*20&&h.state().trainWrecks===0;n++)h.step();assert.ok(h.state().trainWrecks>0,'a train wrecked in the pit');
  let s=h.state();const t=s.trainList.find((x:any)=>x.crashed),cx=s.x+s.width/2;if((t.x+120>cx)!==(s.face>0)){h.tap(s.face>0?'KeyA':'KeyD');h.step(2);}
  for(let n=0;n<4&&h.state().held!=='train';n++){h.tap('KeyH');h.step(20);}
  assert.equal(h.state().held,'train','lifted the whole train');h.step(30);
  h.tap('KeyH');h.step(6);assert.ok(h.state().vehicles.some((v:any)=>v.kind==='train'&&v.state==='flying'),'thrown');
  for(let n=0;n<240;n++)h.step();assert.equal(h.state().mode,'playing');
 }finally{h.release();h.cleanup();}
});
