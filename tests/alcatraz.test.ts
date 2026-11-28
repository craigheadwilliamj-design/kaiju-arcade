import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,cityIndexOf,levelWidth,SAN_FRANCISCO,ALCATRAZ as AL} from '../src/levels.ts';
import {CONFIG as C} from '../src/config.ts';
import {createBuildings,overlaps} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {setTerrain,groundAt,profileY,depthAt} from '../src/terrain.ts';
import {bandAt,blockedStep} from '../src/water.ts';
import {exitTarget,nextBlock,newRun,restartCity,latchBlock,routeLevels,campaignCityIndex,emptyPermanent,unlockSecret,secretLevelOf,secretIds,freePlayLevels,readSaves,savePermanent,PERMANENT_KEY,KAIJU} from '../src/campaign.ts';
import {validFreePlay} from '../src/presentation.ts';
import {bootCampaign,bootGame} from './helpers/game-harness.ts';
// Phase 6: Alcatraz, the secret tenth level. Data first, then routing in and out, the land exits, the Free Play / gallery unlock, and the real loop.
const sfo=cityIndexOf('sfo'),LV=LEVELS[sfo],ALC=SAN_FRANCISCO.find(b=>b.name==='Alcatraz')!,alc=LV.indexOf(ALC),wharf=LV.findIndex(b=>b.name==="Fisherman's Wharf"),fault=LV.findIndex(b=>b.name==='The Fault');
const HEIGHT=(stage:number)=>C.playerHeight*[1,1.4,2.8][stage-1];
const W=levelWidth(ALC),sc=(n:number)=>Math.round(n*C.cityScale);
const find=(f:(b:any)=>boolean)=>ALC.buildings.filter(f);

test('Alcatraz data: a secret 4-screen district at Stage 3, a high exit threshold, hazmat lore and a crystal on the summit',()=>{
 assert.equal(alc,9,'the tenth SF level');assert.deepEqual([ALC.screens,ALC.kind,ALC.secret,ALC.startStage,ALC.cap],[4,'district',true,3,3]);
 assert.ok(ALC.exitAt!>.75&&ALC.exitAt!<=1,'a destruction goal with a higher threshold than the usual 75%');assert.equal(ALC.after,'The Fault');assert.equal(ALC.exits,undefined);
 assert.equal(ALC.secretId,'alcatraz');assert.equal(ALC.lore,'PROJECT MK: FUEL SOURCE CONFIRMED.');assert.equal(ALC.hazmat,true);
 assert.equal(ALC.target,undefined);assert.equal(ALC.capLift,undefined,'no cap lift: the kaiju is already at its largest');
 // Existing systems only: the same optional fields the Wharf already uses.
 for(const k of ['pocket','garage','lanterns','cracks','gas','finale','warships','tumble','sealions','kaiban','fog'])assert.equal((ALC as any)[k],undefined,`no ${k}`);
 // Only Alcatraz carries the Phase 6 fields.
 for(const b of LEVELS.flat().filter(x=>x!==ALC&&x.name!=='Coney Island'&&x.name!=='Xochimilco'))for(const k of ['exitAt','secretId','lore','hazmat'])assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
});

test('Alcatraz layout: west to east, everything inside the world and on flat ground, terraces and ramps walkable',()=>{
 const solid=createBuildings(ALC.buildings.filter(x=>x.kind!=='tiny'));
 for(const x of solid){assert.ok(x.x>=0&&x.x+x.w<=W);assert.deepEqual(checkParts(x),[]);}
 for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)assert.ok(!overlaps({x:solid[i].x,y:0,w:solid[i].w,h:1},{x:solid[j].x,y:0,w:solid[j].w,h:1}));
 for(const x of ALC.buildings)assert.equal(Math.round(profileY(ALC.ground!,x.x+1)),Math.round(profileY(ALC.ground!,x.x+x.w-1)),`${x.deco||x.prop||x.label||x.kind} at ${x.x} stands on a flat`);
 const dock=find(b=>b.deco==='boathouse')[0],tower=find(b=>b.deco==='guardtower')[0],water=find(b=>b.roof==='tank')[0],cell=find(b=>b.deco==='cellhouse')[0],light=find(b=>b.deco==='lighthouse')[0];
 assert.ok(dock&&tower&&water&&cell&&light,'dock, guard tower, water tower, cellhouse and lighthouse all exist');
 assert.ok(dock.x<tower.x&&tower.x<water.x&&water.x<cell.x&&cell.x+cell.w<ALC.crystal!&&ALC.crystal!<light.x,'dock < guard tower < water tower < cellhouse < crystal < lighthouse');
 // The island climbs: each section stands higher than the last, the cellhouse on the summit, the lighthouse back down at the far end.
 const y=(b:any)=>profileY(ALC.ground!,b.x+1);assert.ok(y(dock)>y(tower)&&y(tower)>y(water)&&y(water)>y(cell)&&y(cell)<y(light),'dock < road < summit, then down to the lighthouse');
 assert.ok(profileY(ALC.ground!,ALC.crystal!)===y(cell),'the crystal stands on the summit beside the cellhouse');
 for(const [a,z] of ALC.ramps!){const s=Math.abs(groundAt0(z)-groundAt0(a))/(z-a);assert.ok(s>0&&s<.42,`a ramp of ${(s*100).toFixed(0)}%`);for(const x of solid)assert.ok(x.x>=z-1||x.x+x.w<=a+1,'no building stands on a ramp');}
 function groundAt0(x:number){return profileY(ALC.ground!,x);}
 // The water tower's tank is the existing rooftop fixture; there are workbenches (props) on the summit and the lore props are not in the water.
 assert.equal(find(b=>b.prop==='workbench').length,2);for(const b of find(b=>b.prop==='workbench'))assert.ok(b.x<cell.x&&b.x>sc(2700));
 setTerrain(ALC.ground!,ALC.water!);for(const b of ALC.buildings)assert.equal(depthAt(b.x+b.w/2),0,`${b.deco||b.prop||b.label} is on dry land`);setTerrain(null);
});

test('Alcatraz enemies: Coast Guard boats circle the cove, hazmat soldiers and helicopters hold the summit',()=>{
 setTerrain(ALC.ground!,ALC.water!);
 assert.ok(ALC.coastguard!.length>=3);for(const x of ALC.coastguard!)assert.ok(depthAt(x)>=16,'a boat has water under it (WATER.boatMinDepth)');setTerrain(null);
 const cell=find(b=>b.deco==='cellhouse')[0],soldiers=ALC.units!.filter(([t])=>t==='soldier'),heli=ALC.units!.filter(([t])=>t==='helicopter');
 assert.ok(soldiers.filter(([,x])=>x>=cell.x-sc(200)&&x<=cell.x+cell.w+sc(100)).length>=4,'soldiers (drawn as hazmat) round the cellhouse');
 assert.ok(heli.length>=2&&heli.every(([,x,alt])=>x>=cell.x-sc(600)&&alt!>=400),'helicopters overhead');
});

test('land exits: both ends of the island are dry land and every stage can walk the whole level (no deep water, no drop-off)',()=>{
 setTerrain(ALC.ground!,ALC.water!);
 for(const stage of [1,2,3]){const h=HEIGHT(stage);
  assert.equal(depthAt(2),0,'the west exit is on dry land');assert.equal(depthAt(W-60),0,'the east exit is on dry land');
  let deepest=0;for(let x=0;x<W;x+=4){const b=bandAt(x,h);assert.notEqual(b,'deep',`Stage ${stage}: no over-your-head water at ${x}`);deepest=Math.max(deepest,depthAt(x));if(x>0)assert.equal(blockedStep(x-4,x,h),false,'no drop-off');}
  assert.ok(deepest<=AL.depth+1);}
 // The start is on land too, so a Free Play Stage 1 kaiju starts dry and can wade east or walk to the island.
 assert.equal(depthAt(ALC.start!),0);assert.ok(ALC.start!<sc(AL.cove[0]),'start on the west spit, the wade-in comes first');
 setTerrain(null);
});

test('routing: the Wharf east exit leads to Alcatraz, both Alcatraz exits rejoin the route at The Fault, Alcatraz is off the route',()=>{
 assert.equal(exitTarget(sfo,wharf,'east'),alc);assert.equal(exitTarget(sfo,wharf,'west'),fault);assert.equal(exitTarget(sfo,wharf),fault);
 for(const side of ['west','east',undefined] as const)assert.equal(exitTarget(sfo,alc,side),fault,`Alcatraz ${side} exit goes on to The Fault`);
 assert.equal(routeLevels(sfo).includes(alc),false);assert.deepEqual(routeLevels(sfo),[0,1,2,3,4,5,6,7,8]);
 // A run: clear the Wharf out the east end, play Alcatraz, then The Fault. The Wharf counted as cleared (its results latched).
 const r=newRun('ABC');restartCity(r);r.block=wharf;assert.ok(latchBlock(r),'the Wharf clears');assert.equal(r.phase,'results');
 assert.ok(nextBlock(r,500,'east'));assert.equal(r.block,alc);assert.equal(r.phase,'playing');
 assert.ok(latchBlock(r),'Alcatraz clears like any level');assert.ok(nextBlock(r,900,'west'));assert.equal(r.block,fault,'then on to The Fault');
 assert.ok(latchBlock(r));assert.ok(nextBlock(r,1200));assert.equal(r.block,fault+1,'and the route carries on (Bay Bridge)');
 assert.equal(campaignCityIndex(r.city),sfo);
});

test('unlock: clearing Alcatraz adds it to Free Play and the gallery; unknown ids are ignored; it survives a save round trip',()=>{
 assert.deepEqual(secretIds(),['alcatraz','coney-island','xochimilco']);assert.deepEqual(secretLevelOf('alcatraz'),{city:sfo,block:alc});assert.equal(secretLevelOf('nowhere'),undefined);
 const p=emptyPermanent();p.conquered.push('sfo');
 assert.deepEqual(p.secrets,[]);assert.equal(validFreePlay(p,{kaiju:'Mogurodon',city:sfo,boss:'Mogurodon',block:alc}),false,'locked until cleared');assert.equal(freePlayLevels(p,sfo).includes(alc),false);
 assert.equal(unlockSecret(p,'alcatraz'),true);assert.equal(unlockSecret(p,'alcatraz'),false,'only once');assert.equal(unlockSecret(p,'nowhere'),false);assert.deepEqual(p.secrets,['alcatraz']);
 assert.equal(validFreePlay(p,{kaiju:'Mogurodon',city:sfo,boss:'Mogurodon',block:alc}),true,'now a Free Play start block');
 assert.deepEqual(freePlayLevels(p,sfo),[...routeLevels(sfo),alc]);assert.deepEqual(freePlayLevels(p,cityIndexOf('nyc')),routeLevels(cityIndexOf('nyc')),'no other city gains a level');
 const q=emptyPermanent();unlockSecret(q,'alcatraz');assert.equal(validFreePlay(q,{kaiju:'Mogurodon',city:sfo,boss:'Mogurodon',block:alc}),false,'the city still has to be conquered');
 const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);},removeItem:(k:string)=>{store.delete(k);}};
 assert.ok(savePermanent(storage,p));assert.deepEqual(readSaves(storage).permanent.secrets,['alcatraz']);
 store.set(PERMANENT_KEY,JSON.stringify({...p,secrets:['alcatraz','alcatraz','bogus',7]}));assert.deepEqual(readSaves(storage).permanent.secrets,['alcatraz'],'bad or duplicate entries dropped');
 store.set(PERMANENT_KEY,JSON.stringify({version:2,unlocked:['Mogurodon'],conquered:[],gallery:[],scores:[]}));assert.deepEqual(readSaves(storage).permanent.secrets,[],'an older save without the field loads');
 assert.ok(KAIJU.length>0);
});

const boot=async(x?:number,permanent?:any)=>{const h=await bootCampaign(.75,{city:'sfo',permanent});h.test().goto(alc,x);h.step(2);return h;};
test('real loop: Alcatraz loads at Stage 3 on the west spit, exits stay shut until 90% and open at both ends, then results carry the lore and unlock it',async()=>{
 const h=await boot();
 try{
  let s=h.state();assert.equal(s.blockName,'Alcatraz');assert.equal(s.band,'dry');assert.ok(Math.abs(s.x+s.width/2-ALC.start!)<5,'start on the spit');
  assert.equal(s.exitOpen,false);h.test().demolish(.8);h.step(10);assert.equal(h.state().exitOpen,false,'80% is not enough here: the threshold is higher');
  h.test().demolish(.92);h.step(10);s=h.state();assert.equal(s.exitOpen,true);
  // Out the east end: results with the lore line, the unlock saved, and Next leads to The Fault.
  h.test().teleport(W-s.width-60);h.down('KeyD');h.step(200);h.up('KeyD');
  assert.equal(h.state().mode,'results');assert.equal(h.state().exitSide,'east');
  const text=[...h.node('#overlay').innerHTML?[h.node('#overlay').innerHTML]:[]].join('');
  assert.ok(text.includes('PROJECT MK: FUEL SOURCE CONFIRMED.'),'the results screen carries the lore line');assert.ok(text.includes('ADDED TO FREE PLAY AND THE GALLERY'));
  const saved=JSON.parse(h.saved.get(PERMANENT_KEY)!);assert.deepEqual(saved.secrets,['alcatraz'],'unlock persisted');
  h.click('#advance');h.step(2);assert.equal(h.state().blockName,'The Fault');
 }finally{h.release();h.cleanup();}
});

test('real loop: the west exit on the spit also works and leads to The Fault',async()=>{
 const h=await boot();
 try{
  h.test().demolish(.95);h.step(10);assert.equal(h.state().exitOpen,true);h.test().teleport(60);h.down('KeyA');h.step(200);h.up('KeyA');
  assert.equal(h.state().mode,'results');assert.equal(h.state().exitSide,'west');h.click('#advance');h.step(2);assert.equal(h.state().blockName,'The Fault');
 }finally{h.release();h.cleanup();}
});

test('real UI: Free Play and the gallery list Alcatraz only once it is cleared; a Free Play clear carries on to The Fault and unlocks nothing',async()=>{
 const profile=(secrets:string[])=>({...emptyPermanent(),conquered:['sfo'],secrets});
 const open=async(secrets:string[])=>{const saved=new Map<string,string>([[PERMANENT_KEY,JSON.stringify(profile(secrets))]]);return {h:await bootGame(.75,saved),saved};};
 // Locked: not in the Free Play list, and a disabled gallery entry.
 let {h,saved}=await open([]);
 try{h.click('#freeplay');assert.ok(!h.node('#overlay').innerHTML.includes('ALCATRAZ'));h.click('#back');h.click('#gallery');assert.match(h.node('#overlay').innerHTML,/id="secret-alcatraz"\s+disabled/);assert.ok(!h.node('#overlay').innerHTML.includes('PROJECT MK'));}finally{h.release();h.cleanup();}
 // Unlocked: a secret entry in the list, an enabled gallery entry showing the lore line.
 ({h,saved}=await open(['alcatraz']));
 try{
  h.click('#freeplay');assert.ok(h.node('#overlay').innerHTML.includes(`${alc+1} · Alcatraz ★ SECRET`));h.click('#back');
  h.click('#gallery');const html=h.node('#overlay').innerHTML;assert.match(html,/id="secret-alcatraz"\s*>/);assert.ok(html.includes('PROJECT MK: FUEL SOURCE CONFIRMED.'));h.click('#back');
  // Start Free Play on Alcatraz, clear it, and Next leads to The Fault; the saved profile is unchanged.
  h.click('#freeplay');h.node('#free-kaiju').value='Mogurodon';h.node('#free-city').value=String(sfo);h.node('#free-block').value=String(alc);h.node('#free-boss').value='Mogurodon';h.click('#free-start');h.step(2);
  let s=h.state();assert.equal(s.session,'freeplay');assert.equal(s.blockName,'Alcatraz');assert.equal(s.band,'dry','a Stage 1 Free Play start is on dry land');
  const before=saved.get(PERMANENT_KEY);h.test().demolish(.95);h.step(10);assert.equal(h.state().exitOpen,true);
  h.test().teleport(W-s.width-60);h.down('KeyD');h.step(200);h.up('KeyD');assert.equal(h.state().mode,'results');assert.ok(h.node('#overlay').innerHTML.includes('PROJECT MK: FUEL SOURCE CONFIRMED.'));
  h.click('#advance');h.step(2);assert.equal(h.state().blockName,'The Fault');assert.equal(saved.get(PERMANENT_KEY),before,'Free Play changes no unlocks');
 }finally{h.release();h.cleanup();}
});
