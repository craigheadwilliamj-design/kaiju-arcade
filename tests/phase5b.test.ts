import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';
import {LEVELS,DRILL_BLOCK,cityIndexOf} from '../src/levels.ts';
import {CONFIG as C,RESPONSE as RS,ELEVATED as EL,TUNNEL as TN} from '../src/config.ts';
import {emptyPermanent,PERMANENT_KEY,CAMPAIGN} from '../src/campaign.ts';

test('data: hydrants line district streets; Tokyo’s open blocks have an elevated railway',()=>{
 assert.ok(LEVELS[cityIndexOf('nyc')][0].buildings.some(b=>b.role==='hydrant'),'Lower Manhattan has hydrants');
 for(const b of LEVELS.flat())for(const x of b.buildings.filter(x=>x.role==='hydrant'))assert.equal(x.kind,'tiny');
 assert.deepEqual(LEVELS[cityIndexOf('tyo')].map(b=>!!b.elevated),[true,true,false,true,false]);assert.ok(LEVELS.filter((_,i)=>i!==cityIndexOf('tyo')).flat().every(b=>!b.elevated||b.elevatedLook==='park'||b.elevatedLook==='freeway'));
});

async function campaign(){const h=await bootCampaign(.75,{kaiju:'Mogurodon'});return h;}
const hold=(h:any,code:string,frames:number)=>{h.down(code);h.step(frames);h.up(code);};

test('real loop: the city responds in stages as the block falls (block 1 stops at martial law)',async()=>{
 const h=await campaign();
 try{const tier0=h.state().militaryTier;let barriers=0,top=0,seen=new Set<string>();
  const sweep=(f:string,b:string,lim:number)=>{for(let n=0;n<lim&&h.state().mode==='playing';n++){if(h.state().ultimate>=100&&h.state().transform===0)h.tap('KeyU');hold(h,f,8);h.tap('KeyK');h.step(40);hold(h,b,1);h.tap('KeyK');h.step(40);hold(h,f,3);
   const q=h.state();if(q.banner)seen.add(q.banner);top=Math.max(top,q.alert);barriers=Math.max(barriers,q.vehicles.filter((v:any)=>v.kind==='barrier').length);}};
  sweep('KeyD','KeyA',120);sweep('KeyA','KeyD',200);
  assert.equal(top,2,'evacuation, then martial law');
  assert.ok(barriers>=2,'roadblocks went up');assert.equal(h.state().militaryTier,Math.min(5,tier0+1),'the response stepped up a tier');
  assert.ok(!seen.has(`CITY RESPONSE · ${RS.labels[2]}`)&&h.state().alert<3,'no air strike in block 1');
 }finally{h.release();h.cleanup();}
});

test('real loop: walking into a hydrant bursts the main into a geyser',async()=>{
 const h=await campaign();
 try{const s=h.state(),cx=s.x+s.width/2,hy=s.buildings.filter((b:any)=>b.role==='hydrant').sort((a:any,b:any)=>Math.abs(a.x-cx)-Math.abs(b.x-cx))[0];assert.ok(hy,'a hydrant nearby');
  const k=hy.x>cx?'KeyD':'KeyA';let g=false;for(let n=0;n<900&&!g;n++){h.down(k);h.step(1);g=h.state().geysers>0;
   // Smash whatever is in the way.
   if(n%60===59){h.up(k);h.tap('KeyK');h.step(30);}}h.up(k);
  assert.ok(g,'the main burst');
 }finally{h.release();h.cleanup();}
});

test('real loop: at Stage 3 a shoulder barge bursts a walk-through tunnel (Combat Drills)',async()=>{
 const h=await bootGame(.75);
 try{h.click('#drills');h.click('#start');
  for(let n=0;n<500&&h.state().mode==='playing'&&h.state().stage<3;n++){if(h.state().ultimate>=100&&h.state().transform===0)h.tap('KeyU');hold(h,'KeyD',8);h.tap('KeyK');h.step(40);hold(h,'KeyA',1);h.tap('KeyK');h.step(40);hold(h,'KeyD',3);}
  assert.equal(h.state().stage,3);for(let n=0;n<60;n++)h.step();
  // The next tall building ahead.
  let s=h.state();const t=s.buildings.map((b:any,i:number)=>i).filter((i:number)=>{const b=s.buildings[i];return b.hp>300&&b.kind!=='tiny'&&b.h>=TN.minHeight*s.height&&b.x>s.x;}).sort((a:number,b:number)=>s.buildings[a].x-s.buildings[b].x)[0];
  assert.ok(t!==undefined,'a tall building ahead');const tb=s.buildings[t];
  for(let n=0;n<900&&h.state().x+h.state().width<tb.x-2;n++){h.down('KeyD');h.step(1);if(n%50===49){h.up('KeyD');h.tap('KeyK');h.step(30);}}h.up('KeyD');
  // Back off for a run-up, then charge into it.
  h.down('KeyA');h.step(130);h.up('KeyA');h.step(5);h.down('ShiftLeft');h.down('KeyD');for(let n=0;n<120&&h.state().tunnels===0;n++)h.step();h.up('KeyD');h.up('ShiftLeft');h.step(10);s=h.state();
  if(s.buildings[t].hp>0){assert.ok(s.tunnels>=1,'burst through');const x0=s.x;h.down('KeyD');h.step(60);h.up('KeyD');assert.ok(h.state().x>x0+40,'and walks into it');}
 }finally{h.release();h.cleanup();}
});

async function tokyo(){const p=emptyPermanent();p.conquered=[...CAMPAIGN];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 h.click('#freeplay');h.node('#free-kaiju').value='Mogurodon';h.node('#free-city').value=String(cityIndexOf('tyo'));h.node('#free-boss').value='Mogurodon';h.node('#free-block').value='0';h.click('#free-start');for(let n=0;n<20;n++)h.step();return h;}

test('real loop: Tokyo’s elevated line: jump onto it, a train smashes into the kaiju and falls off; the span can be pounded down',async()=>{
 const h=await tokyo();
 try{let s=h.state();assert.ok(s.rails.length>3,'the line is there');assert.ok(s.rails.every((r:any)=>r.alive));
  // A straight jump from the plaza reaches the track (it is just under a standing jump's height).
  let on=false;for(let k=0;k<4&&!on;k++){h.tap('Space');h.step(70);const q=h.state(),r=q.rails.find((r:any)=>q.x+q.width/2>=r.x0&&q.x+q.width/2<r.x1);on=!!r&&Math.abs(q.y+q.height-r.y)<2;}
  assert.ok(on,'standing on the track');
  let banner='',flying=false;for(let n=0;n<60*(EL.trainEvery*2+3);n++){h.step();const q=h.state();if(q.banner==='TRAIN SMASHED INTO THE KAIJU'){banner=q.banner;flying=q.vehicles.some((v:any)=>v.kind==='train'&&v.state==='flying');break;}}
  assert.equal(banner,'TRAIN SMASHED INTO THE KAIJU');assert.ok(flying,'the train came off the track');
  for(let n=0;n<60;n++)h.step();s=h.state();const r=s.rails.findIndex((r:any)=>s.x+s.width/2>=r.x0&&s.x+s.width/2<r.x1);
  // Pounding the span from on top damages it (a strike can knock the kaiju off before it breaks).
  if(r>=0&&Math.abs(s.y+s.height-s.rails[r].y)<2){const hp0=s.rails[r].hp;for(let n=0;n<6;n++){h.down('KeyS');h.step(3);h.tap('KeyJ');h.step(24);h.up('KeyS');h.step(4);}assert.ok(h.state().rails[r].hp<hp0,'pounding damages the span');}
 }finally{h.release();h.cleanup();}
});
