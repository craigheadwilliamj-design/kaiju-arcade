// Mexico City rework, card 1 (scaffold): the route, per-level growth, Tlézcatl forced, Belial as boss, the Chapultepec exits and the
// Xochimilco rejoin, the opt-in sinking ground, and the off-route fixture city that keeps the old five districts. See docs/MEX_REWORK.md.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {CITIES,LEVELS,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CAMPAIGN,PERMANENT_KEY,emptyPermanent,newRun,restartCity,latchBlock,nextBlock,conquerCity,advanceCity,exitTarget,routeLevels,kaijuFor,campaignCity,readSaves,KAIJU} from '../src/campaign.ts';
import {validFreePlay} from '../src/presentation.ts';
import {bootCampaign,bootGame} from './helpers/game-harness.ts';
const MEX=cityIndexOf('mex'),levels=LEVELS[MEX],at=(name:string)=>levels.findIndex(b=>b.name===name);
// name, screens, kind, startStage, cap, capLift, tier: the plan's Levels table.
const PLAN:[string,number,string,number,number,number|undefined,number][]=[
 ['Templo Mayor',7,'district',1,1,undefined,1],['Zócalo',7,'stronghold',1,1,undefined,2],['La Merced and Tepito',7,'district',1,1,2,2],
 ['Alameda and Bellas Artes',7,'district',2,2,undefined,2],['Paseo de la Reforma',8,'stronghold',2,2,undefined,3],['Chapultepec',8,'district',2,2,3,3],
 ['Ciudad Universitaria',8,'district',3,3,undefined,4],['Calzada de Tlalpan',8,'stronghold',3,3,undefined,4],['Estadio Azteca',6,'boss',3,3,undefined,5]];

test('Mexico City route: nine levels in order, Xochimilco off the route as a secret',()=>{
 assert.deepEqual(routeLevels(MEX).map(i=>levels[i].name),PLAN.map(p=>p[0]));assert.equal(levels.length,10);assert.deepEqual(routeLevels(MEX),[0,1,2,3,4,5,6,7,8]);
 const x=levels[at('Xochimilco')];assert.equal(x.secret,true);assert.equal(x.after,'Ciudad Universitaria');assert.ok(x.secretId);assert.equal(levels.filter(b=>b.secret).length,1);
 for(const [name,screens,kind] of PLAN){const b=levels[at(name)];assert.equal(b.screens,screens,`${name} screens`);assert.equal(b.kind,kind,`${name} kind`);assert.equal(levelWidth(b)/screens,levelWidth(levels[0])/7,`${name} width follows its screens`);}
 assert.deepEqual([x.screens,x.kind],[5,'district']);assert.equal(levels.filter(b=>b.kind==='boss').length,1);assert.equal(levels[routeLevels(MEX).at(-1)!].name,'Estadio Azteca');
});

test('growth per level: Stage 1/cap 1, then 2/2, then 3/3, with the crystals lifting the cap; Xochimilco is Stage 3 tier 5',()=>{
 for(const [name,,,startStage,cap,capLift,tier] of PLAN){const b=levels[at(name)];assert.equal(b.startStage,startStage,`${name} startStage`);assert.equal(b.cap,cap,`${name} cap`);assert.equal(b.capLift,capLift,`${name} capLift`);assert.equal(b.tier,tier,`${name} tier`);}
 const x=levels[at('Xochimilco')];assert.deepEqual([x.startStage,x.cap,x.tier],[3,3,5]);
 for(const name of ['La Merced and Tepito','Chapultepec'])assert.ok(levels[at(name)].crystal!==undefined,`${name} has the crystal that lifts the cap`);
 assert.deepEqual(PLAN.map(p=>p[3]),[1,1,1,2,2,2,3,3,3]);
});

test('Chapultepec has two exits: west leads on to Ciudad Universitaria, east to Xochimilco, which rejoins at Ciudad Universitaria',()=>{
 const park=at('Chapultepec'),cu=at('Ciudad Universitaria'),x=at('Xochimilco');
 assert.deepEqual(levels[park].exits,{west:'Ciudad Universitaria',east:'Xochimilco'});assert.ok(levels[park].start!==undefined,'a there-and-back level starts mid-map');
 assert.equal(exitTarget(MEX,park,'west'),cu);assert.equal(exitTarget(MEX,park,'east'),x);assert.equal(exitTarget(MEX,park),cu);assert.equal(exitTarget(MEX,x),cu,'Xochimilco rejoins at Ciudad Universitaria');
 assert.equal(exitTarget(MEX,at('La Merced and Tepito')),at('Alameda and Bellas Artes'));
 const r=newRun('ABC');r.city=CAMPAIGN.indexOf('mex');r.block=park;r.phase='playing';assert.ok(latchBlock(r));assert.ok(nextBlock(r,10,'east'));assert.equal(r.block,x);
 r.phase='results';assert.ok(nextBlock(r,20));assert.equal(r.block,cu,'leaving Xochimilco lands on Ciudad Universitaria');
});

test('Mexico City forces Tlézcatl whatever the run picked; Belial is the boss and the conquest unlocks him and Paris',()=>{
 const c=CITIES[MEX];assert.equal(c.name,'Mexico City');assert.equal(c.kaiju,'Tlézcatl');assert.equal(c.boss,'Belial');assert.equal(c.difficulty,1);assert.equal(c.style,'mex');
 const ci=CAMPAIGN.indexOf('mex');for(const k of KAIJU)assert.equal(kaijuFor({kaiju:k,city:ci}),'Tlézcatl');assert.equal(campaignCity(ci).boss,'Belial');
 const p=emptyPermanent(),r=newRun('ABC','Mogurodon');r.city=ci;restartCity(r);assert.equal(conquerCity(p,r,100,'Belial'),false,'not before the last route level');
 for(const i of routeLevels(MEX).slice(0,-1)){assert.equal(r.block,i);assert.ok(latchBlock(r));assert.ok(nextBlock(r,100));}
 assert.equal(levels[r.block].name,'Estadio Azteca');assert.ok(conquerCity(p,r,1000,campaignCity(r.city).boss));assert.ok(p.unlocked.includes('Belial'));assert.ok(p.conquered.includes('mex'));
 assert.ok(advanceCity(r));assert.equal(CAMPAIGN[r.city],'par','Paris is next');
});

test('sinking ground is opt-in: Templo Mayor alone among the reworked levels; every mex-classic block keeps it',()=>{
 assert.deepEqual(levels.filter(b=>b.sinking).map(b=>b.name),['Templo Mayor']);
 const classic=LEVELS[cityIndexOf('mex-classic')];assert.equal(classic.length,5);assert.ok(classic.every(b=>b.sinking===true));
 for(const id of ['sfo','nyc','par','hkg','tyo','syd','nyc-classic'])assert.ok(LEVELS[cityIndexOf(id)].every(b=>!b.sinking),`${id} does not sink`);
});

test('the old five districts are an off-route fixture city: verbatim, never on the campaign, in Free Play, saves or progress',()=>{
 const id='mex-classic',ci=cityIndexOf(id),c=CITIES[ci];assert.ok(ci>=0);assert.equal(c.style,'mex');assert.equal(c.kaiju,undefined);assert.equal(c.boss,'Tlézcatl');assert.equal(c.difficulty,1);
 assert.ok(!CAMPAIGN.includes(id));assert.deepEqual(LEVELS[ci].map(b=>b.name),['Centro Histórico','Reforma Avenue','Crystal Bastion','Chapultepec Assault','Tlézcatl Arena']);
 assert.deepEqual(LEVELS[ci].map(b=>b.screens),[4,6,8,8,4]);assert.deepEqual(LEVELS[ci].map(b=>b.kind),['district','district','stronghold','district','boss']);assert.equal(LEVELS.length,CITIES.length);
 const p={...emptyPermanent(),unlocked:[...KAIJU],conquered:['sfo',id]};
 assert.equal(validFreePlay(p,{kaiju:'Mogurodon',boss:'Mogurodon',city:ci}),false);
 const m=new Map<string,string>([[PERMANENT_KEY,JSON.stringify(p)]]);const loaded=readSaves({getItem:k=>m.get(k)??null,setItem:()=>{},removeItem:()=>{}});assert.deepEqual(loaded.permanent.conquered,['sfo']);
});

test('the Free Play screen lists only campaign cities, mex-classic not among them',async()=>{
 const p=emptyPermanent();p.unlocked=[...KAIJU];p.conquered=[...CAMPAIGN,'mex-classic'];
 const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));try{h.click('#freeplay');const html:string=h.node('#overlay').innerHTML;
  const options=[...html.matchAll(/<option value="(\d+)"[^>]*>([^<]*)<\/option>/g)].filter(m=>CITIES[+m[1]]&&m[2]===CITIES[+m[1]].name).map(m=>CITIES[+m[1]].id);
  assert.deepEqual(options,CAMPAIGN);assert.ok(!html.includes('classic'));
 }finally{h.cleanup();}
});

test('a campaign boots into Mexico City playing Tlézcatl, all ten levels load, and Belial is the rival at Estadio Azteca',async()=>{
 const h=await bootCampaign(.75,{city:'mex',kaiju:'Mogurodon'});
 try{let s=h.state();assert.equal(s.cityCode,'MEX');assert.equal(s.activeKaiju,'Tlézcatl');assert.equal(s.level.name,'Templo Mayor');assert.equal(s.stage,1);assert.equal(s.growthCap,1);
  for(let i=0;i<levels.length;i++){assert.ok(h.test().goto(i));h.step(2);s=h.state();assert.equal(s.level.name,levels[i].name);assert.equal(s.activeKaiju,'Tlézcatl');assert.ok(s.worldWidth>0);
   if(levels[i].startStage&&!levels[i].secret)assert.equal(s.stage,levels[i].startStage,`${levels[i].name} starts at its stage`);assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.hp));}
  assert.ok(h.test().goto(at('Estadio Azteca')));h.step(2);s=h.state();assert.ok(s.rival);assert.equal(s.bossName,'Belial');
 }finally{h.cleanup();}
});

test('the fixture city boots through kaijuTest.gotoCity with the run\'s own kaiju and its exact old layout',async()=>{
 const h=await bootCampaign(.75,{city:'mex-classic',kaiju:'Tlézcatl'});
 try{let s=h.state();assert.equal(s.level.name,'Centro Histórico');assert.equal(s.activeKaiju,'Tlézcatl');assert.equal(s.cityCode,'MEX');
  assert.ok(h.test().gotoCity('mex-classic',4));h.step(2);s=h.state();assert.equal(s.level.name,'Tlézcatl Arena');assert.ok(s.rival);
 }finally{h.cleanup();}
});
