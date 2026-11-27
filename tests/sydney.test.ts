import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';
import {CITIES,LEVELS,cityIndexOf} from '../src/levels.ts';
import {CAMPAIGN,PERMANENT_KEY,emptyPermanent,newRun,restartCity,conquerCity,KAIJU} from '../src/campaign.ts';
import {FIRE as FI,TWISTS as TW} from '../src/config.ts';
import {shapeParts,checkParts} from '../src/hitbox.ts';
// Route shuffle card 2: Sydney is a complete placeholder city (Hong Kong's five districts mirrored). Card 3 put it on the route after Paris.
const SYD=cityIndexOf('syd');

test('Sydney is appended after nyc-classic and sits on the route after Paris: in CAMPAIGN, Free Play once conquered, and records',async()=>{
 assert.equal(CITIES[SYD+1].id,'mex-classic','mex-classic is appended after Sydney');assert.equal(SYD,CITIES.length-2,'Sydney is second to last');assert.equal(CITIES[SYD-1].id,'nyc-classic','after the classic fixture');assert.equal(LEVELS.length,CITIES.length);
 assert.equal(CAMPAIGN.indexOf('syd'),CAMPAIGN.indexOf('par')+1,'Sydney follows Paris');assert.equal(CAMPAIGN.indexOf('hkg'),CAMPAIGN.indexOf('syd')+1,'Hong Kong follows Sydney');
 const c=CITIES[SYD];assert.equal(c.name,'Sydney');assert.equal(c.code,'SYD');assert.equal(c.boss,'Myrmex');assert.equal(c.difficulty,2.5);assert.equal(c.style,'syd');assert.equal(c.kaiju,undefined);
 assert.ok(c.mood.lights<=.2,'harbour daylight');assert.ok(c.material.glass);
 // Conquering Sydney records it by id and unlocks Myrmex.
 const p=emptyPermanent(),r=newRun('ABC','Mogurodon','r');r.city=CAMPAIGN.indexOf('syd');restartCity(r);r.block=4;assert.ok(conquerCity(p,r,10,'Myrmex'));assert.deepEqual(p.conquered,['syd']);assert.ok(p.unlocked.includes('Myrmex'));
 // Free Play lists Sydney once conquered, and not before.
 const q=emptyPermanent();q.conquered=[...CAMPAIGN];q.unlocked=[...KAIJU];const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(q)]]));
 try{h.click('#freeplay');const html=h.node('#overlay').innerHTML;assert.ok(html.includes('Hong Kong'),'the city list rendered');assert.ok(html.includes('Sydney'),'Sydney in Free Play once conquered');}finally{h.release();h.cleanup();}
 const u=emptyPermanent();u.conquered=CAMPAIGN.filter(id=>id!=='syd');u.unlocked=[...KAIJU];const g=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(u)]]));
 try{g.click('#freeplay');const html=g.node('#overlay').innerHTML;assert.ok(html.includes('Hong Kong'));assert.ok(!html.includes('Sydney'),'no Sydney in Free Play before it is conquered');}finally{g.release();g.cleanup();}
});

test('Sydney mirrors Hong Kong: five districts at 4/6/8/8/4, the same kinds and slots, its own landmarks, junk and power',()=>{
 const syd=LEVELS[SYD],hk=LEVELS[cityIndexOf('hkg')];
 assert.deepEqual(syd.map(b=>b.name),['The Rocks','George Street','Barangaroo Bastion','Harbour Bridge Assault','Myrmex Arena']);
 assert.deepEqual(syd.map(b=>b.screens),[4,6,8,8,4]);assert.deepEqual(syd.map(b=>b.kind),hk.map(b=>b.kind));
 assert.deepEqual(syd.map(b=>b.start!==undefined),hk.map(b=>b.start!==undefined));assert.deepEqual(syd.map(b=>!!b.grids),hk.map(b=>!!b.grids));
 const marks=syd.map(b=>b.buildings.filter(x=>x.landmark).map(x=>`${x.label}|${x.shape}`));
 assert.deepEqual(marks,[['SYDNEY OPERA HOUSE|sails','CUSTOMS HOUSE|dome','AMP BUILDING|tower'],['QUEEN VICTORIA BUILDING|dome','GPO SYDNEY|tower','SYDNEY TOWER|needle'],[],
  ['LUNA PARK|arch','TOWN HALL|tower',"ST MARY'S CATHEDRAL|twin",'CROWN SYDNEY|needle'],[]]);
 assert.deepEqual(marks.map(m=>m.length),hk.map(b=>b.buildings.filter(x=>x.landmark).length),'one landmark per Hong Kong landmark slot');
 // The stronghold mirrors Harbour Stronghold's rules: crystal barriers, no landmarks; the arena is the same shape as HK's.
 assert.equal(syd[2].buildings.filter(x=>x.label==='BARRIER').length,hk[2].buildings.filter(x=>x.label==='BARRIER').length);
 assert.equal(syd[4].buildings.length,hk[4].buildings.length);
 // The Rocks and the Milsons Point side climb gentle terraces; George Street is flat.
 assert.deepEqual(syd.map(b=>!!b.ground),[true,false,false,true,false]);
 // Street junk is Sydney's own: bus shelters and wheelie bins, and nobody else's.
 const props=new Set(syd.flatMap(b=>b.buildings.map(x=>x.prop).filter(Boolean)));assert.deepEqual([...props].sort(),['bin','shelter']);
 for(const [i,city] of LEVELS.entries())if(i!==SYD)for(const b of city)assert.ok(!b.buildings.some(x=>x.prop==='shelter'||x.prop==='bin'),`${b.name} has no Sydney junk`);
 // Every level has a wind direction; no other city's level does.
 assert.deepEqual(syd.map(b=>b.wind),[1,-1,1,-1,1]);assert.ok(LEVELS.every((c,i)=>i===SYD||c.every(b=>b.wind===undefined)));
});

test('Sydney landmark shapes: the Opera House sails and Sydney Tower have sound hitbox parts',()=>{
 for(const sh of ['sails','needle']){const parts=shapeParts(sh,'syd',190,500);assert.deepEqual(checkParts({x:0,w:190,h:500,parts}),[],sh);}
 assert.notDeepEqual(shapeParts('needle','syd',190,500),shapeParts('needle','hkg',190,500),'Sydney Tower is not the Bank of China lattice');
 assert.deepEqual(shapeParts('needle','tyo',190,500),shapeParts('needle','tyo',190,500));
 const opera=LEVELS[SYD][0].buildings.find(x=>x.label==='SYDNEY OPERA HOUSE')!;assert.equal(opera.parts!.length,4);assert.ok(opera.parts!.every(p=>p.x>=0&&p.x+p.w<=opera.w));
});

// Every other city still produces the data it did before Sydney arrived. Route card 3 moved Hong Kong's and Tokyo's bosses and renamed
// their arenas: their pins are the new data, and putting the old boss and arena name back reproduces the card-2 pins exactly (so
// nothing else about either city moved).
test('every other city is unchanged by Sydney (pinned data hashes); Hong Kong and Tokyo changed only boss and arena name',()=>{
 const hash=(c:unknown,l:unknown)=>createHash('sha256').update(JSON.stringify([c,l])).digest('hex').slice(0,16);
 const pins:Record<string,string>={sfo:'3821996d89f9ea38',nyc:'1cad94c8ae45aeff',mex:'db0f9d2c44ab96f7',par:'990f83d9c463c3ec',hkg:'356aa6c01e5bfa81',tyo:'672acd4b9f59803b','nyc-classic':'5f48ba99179897a7'};
 for(const [id,pin] of Object.entries(pins)){const i=cityIndexOf(id);assert.equal(hash(CITIES[i],LEVELS[i]),pin,id);}
 // The fixture city is provably the old Mexico City: put back its id and name, strip the opt-in `sinking`, and the old pin comes back.
 assert.equal(hash({...CITIES[cityIndexOf('mex-classic')],id:'mex',name:'Mexico City'},LEVELS[cityIndexOf('mex-classic')].map(({sinking,...b})=>b)),'faec75a8f7fe52bc','mex-classic is the old mex');
 const before:Record<string,[string,string,string]>={hkg:['Myrmex','Myrmex Arena','632e028bbec24fc1'],tyo:['Sargathoth','Sargathoth Arena','62f20fc8576f066d']};
 for(const [id,[boss,arena,pin]] of Object.entries(before)){const i=cityIndexOf(id);assert.equal(hash({...CITIES[i],boss},LEVELS[i].map((b,k)=>k===4?{...b,name:arena}:b)),pin,`${id} before card 3`);}
 assert.deepEqual([LEVELS[cityIndexOf('hkg')][4].name,LEVELS[cityIndexOf('tyo')][4].name],['Sargathoth Arena','Atomotitan Arena']);
});

// Two neighbours of a building, one on each side, both within the ordinary fire reach.
function flanked(s:any){const solid=s.buildings.map((b:any,i:number)=>({...b,i})).filter((b:any)=>b.hp>0&&b.kind!=='tiny'&&!b.role&&!b.landmark).sort((a:any,b:any)=>a.x-b.x);
 for(let k=1;k<solid.length-1;k++){const [w,c,e]=[solid[k-1],solid[k],solid[k+1]];if(c.x-(w.x+w.w)<FI.reach&&e.x-(c.x+c.w)<FI.reach)return {west:w.i,mid:c.i,east:e.i};}return null;}

test('real loop: the southerly buster pushes fire downwind and damps it upwind; smoke drifts with it',async()=>{
 // A low random seed so the fires throw smoke particles (the harness pins Math.random).
 const h=await bootCampaign(.1,{city:'syd'});
 try{h.test().shield(600);h.step(10);let s=h.state();assert.equal(s.cityCode,'SYD');assert.equal(s.wind,1,'The Rocks blows east');
  const f=flanked(s)!;assert.ok(f,'a building with a neighbour each side');h.test().torch(f.mid);
  let east=-1,west=-1;for(let n=0;n<60*40&&(east<0||west<0);n++){h.step();const b=h.state().blazeList;if(east<0&&b.includes(f.east))east=n;if(west<0&&b.includes(f.west))west=n;}
  assert.ok(east>=0,'the downwind neighbour caught');assert.ok(west<0||west>east*2,`downwind first and much sooner (east ${east}, west ${west})`);
  // Smoke: the particles over the fires drift east on average.
  assert.ok(h.state().blazes>0);assert.ok(h.state().particleDrift>TW.smokeDrift*.5,`smoke drifts downwind (${h.state().particleDrift})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: embers jump one gap downwind in Sydney and never do in Hong Kong',async()=>{
 // The nearest downwind building past the ordinary reach but within emberReach catches from embers alone.
 const jump=(s:any,dir:number)=>{const solid=s.buildings.map((b:any,i:number)=>({...b,i})).filter((b:any)=>b.hp>0&&b.kind!=='tiny'&&!b.role).sort((a:any,b:any)=>a.x-b.x);
  for(let k=0;k<solid.length;k++){const c=solid[k],nb=solid[k+dir],back=solid[k-dir];if(!nb)continue;const gap=dir>0?nb.x-(c.x+c.w):c.x-(nb.x+nb.w);
   const backGap=back?(dir>0?c.x-(back.x+back.w):back.x-(c.x+c.w)):Infinity;if(gap>=FI.reach&&gap<TW.emberReach&&backGap>=FI.reach&&!c.landmark)return {from:c.i,to:nb.i};}return null;};
 const run=async(city:string,block:number,dir:number)=>{const h=await bootCampaign(.75,{city});
  try{if(city!=='syd')h.test().goto(block);else h.test().gotoCity('syd',block);h.test().shield(600);h.step(10);const s=h.state();const j=jump(s,dir);assert.ok(j,`${city}: a gap to jump`);h.test().torch(j!.from);
   let caught=false;for(let n=0;n<60*45&&!caught;n++){h.step();caught=h.state().blazeList.includes(j!.to);}return {caught,wind:h.state().wind};}finally{h.release();h.cleanup();}};
 const syd=await run('syd',1,-1);assert.equal(syd.wind,-1,'George Street blows west');assert.ok(syd.caught,'embers carried the fire over the gap');
 const hk=await run('hkg',1,-1);assert.equal(hk.wind,0,'no wind in Hong Kong');assert.equal(hk.caught,false,'a gap stops the fire in Hong Kong');
});

test('the wind twist is on in Sydney only, in its authored direction per level',async()=>{
 const h=await bootCampaign(.75,{city:'syd'});
 try{for(const c of CITIES){h.test().gotoCity(c.id,0);h.step(2);assert.equal(h.state().wind,c.id==='syd'?1:0,c.id);}
  for(let b=0;b<5;b++){h.test().gotoCity('syd',b);h.step(2);assert.equal(h.state().wind,LEVELS[SYD][b].wind,`Sydney block ${b}`);}
 }finally{h.release();h.cleanup();}
});

test('real loop: Myrmex Arena loads Myrmex as the rival, under Sydney skies',async()=>{
 const h=await bootCampaign(.75,{city:'syd'});
 try{h.test().gotoCity('syd',4);h.step(20);const s=h.state();assert.equal(s.cityCode,'SYD');assert.ok(s.rival,'a rival');assert.equal(s.bossName,'Myrmex');
  const {CAMPAIGN:P}=await import('../src/config.ts');assert.equal(s.bossHP,P.bossHP*(1+2.5*.1),'difficulty 2.5');}finally{h.release();h.cleanup();}
});
