// New York rework, card 1 (scaffold): the route, per-level growth, Kaiban forced, Tlézcatl as boss, the Central Park exits and the
// Coney Island rejoin, and the off-route fixture city that keeps the old five blocks. See docs/NYC_REWORK.md.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {CITIES,LEVELS,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CAMPAIGN,PERMANENT_KEY,emptyPermanent,newRun,restartCity,latchBlock,nextBlock,conquerCity,advanceCity,exitTarget,routeLevels,kaijuFor,campaignCity,readSaves,freePlayLevels,KAIJU} from '../src/campaign.ts';
import {validFreePlay} from '../src/presentation.ts';
import {bootCampaign,bootGame} from './helpers/game-harness.ts';
const NYC=cityIndexOf('nyc'),levels=LEVELS[NYC],at=(name:string)=>levels.findIndex(b=>b.name===name);
// name, screens, kind, startStage-cap(capLift), tier: the plan's Levels section.
const PLAN:[string,number,string,number,number,number|undefined,number][]=[
 ['The Battery',8,'stronghold',1,1,undefined,1],['Wall Street',7,'stronghold',1,1,undefined,2],['SoHo and Canal Street',7,'district',1,1,2,2],
 ['Times Square',7,'district',2,2,undefined,2],['Grand Central',7,'stronghold',2,2,undefined,3],['Central Park',8,'district',2,2,3,3],
 ['Hudson Yards',8,'district',3,3,undefined,4],['Herald Square',8,'stronghold',3,3,undefined,4],['Empire State',6,'boss',3,3,undefined,5]];
const landmarkNames=(name:string)=>levels[at(name)].buildings.filter(b=>b.landmark).map(b=>b.label);

test('New York route: nine levels in order, Coney Island off the route as a secret',()=>{
 assert.deepEqual(routeLevels(NYC).map(i=>levels[i].name),PLAN.map(p=>p[0]));assert.equal(levels.length,10);
 assert.deepEqual(routeLevels(NYC),[0,1,2,3,4,5,6,7,8],'the route is the first nine');
 const coney=levels[at('Coney Island')];assert.equal(coney.secret,true);assert.equal(coney.after,'Hudson Yards');assert.ok(coney.secretId);
 assert.equal(levels.filter(b=>b.secret).length,1);
 for(const [name,screens,kind] of PLAN){const b=levels[at(name)];assert.equal(b.screens,screens,`${name} screens`);assert.equal(b.kind,kind,`${name} kind`);assert.equal(levelWidth(b)/screens,levelWidth(levels[0])/8,`${name} width follows its screens`);}
 assert.deepEqual([coney.screens,coney.kind],[4,'district']);
 assert.equal(levels.filter(b=>b.kind==='boss').length,1,'Empire State is the only boss level');assert.equal(levels[routeLevels(NYC).at(-1)!].name,'Empire State');
});

test('growth per level follows the SF curve: Stage 1/cap 1, then 2/2, then 3/3, with the crystals lifting the cap',()=>{
 for(const [name,,,startStage,cap,capLift,tier] of PLAN){const b=levels[at(name)];assert.equal(b.startStage,startStage,`${name} startStage`);assert.equal(b.cap,cap,`${name} cap`);assert.equal(b.capLift,capLift,`${name} capLift`);assert.equal(b.tier,tier,`${name} tier`);}
 const coney=levels[at('Coney Island')];assert.deepEqual([coney.startStage,coney.cap,coney.tier],[3,3,5]);
 for(const name of ['SoHo and Canal Street','Central Park'])assert.ok(levels[at(name)].crystal!==undefined,`${name} has the crystal that lifts the cap`);
 assert.deepEqual(PLAN.map(p=>p[3]),[1,1,1,2,2,2,3,3,3],'Act 1 Stage 1, Act 2 Stage 2, Act 3 Stage 3');
});

test('landmarks and targets use the real names',()=>{
 const names=levels.flatMap(b=>[...b.buildings.filter(x=>x.landmark).map(x=>x.label),...(b.target?[b.target.label]:[])]);
 for(const n of ['CASTLE CLINTON','TRINITY CHURCH','CHRYSLER','MET LIFE','BELVEDERE CASTLE','THE VESSEL',"MACY'S",'MADISON SQUARE GARDEN','EMPIRE STATE','PARACHUTE JUMP'])assert.ok(names.includes(n),n);
 assert.deepEqual(landmarkNames('Grand Central').sort(),['CHRYSLER','MET LIFE']);
 for(const b of levels.filter(x=>x.kind==='stronghold'))assert.ok(b.target&&['clock','command','pyramid','cutter','fort','exchange','terminal'].includes(b.target.art),`${b.name} has a target`);
});

test('Central Park has two exits; the west leads on, the east leads to Coney Island, which rejoins at Hudson Yards',()=>{
 const park=at('Central Park'),yards=at('Hudson Yards'),coney=at('Coney Island');
 assert.deepEqual(levels[park].exits,{west:'Hudson Yards',east:'Coney Island'});assert.ok(levels[park].start!==undefined,'a there-and-back level starts mid-map');
 assert.equal(exitTarget(NYC,park,'west'),yards);assert.equal(exitTarget(NYC,park,'east'),coney);assert.equal(exitTarget(NYC,park),yards,'no side goes the main way');
 assert.equal(exitTarget(NYC,coney),yards,'Coney Island rejoins at Hudson Yards');
 assert.equal(exitTarget(NYC,at('SoHo and Canal Street')),at('Times Square'),'ordinary levels go to the next route level');
 const r=newRun('ABC');r.city=CAMPAIGN.indexOf('nyc');r.block=park;r.phase='playing';assert.ok(latchBlock(r));assert.ok(nextBlock(r,10,'east'));assert.equal(r.block,coney);
 r.phase='results';assert.ok(nextBlock(r,20));assert.equal(r.block,yards,'leaving Coney Island lands on Hudson Yards');
});

test('NYC forces Kaiban whatever the run picked; Tlézcatl is the boss and the conquest unlocks him and Mexico City',()=>{
 const ny=CITIES[NYC];assert.equal(ny.name,'New York');assert.equal(ny.kaiju,'Kaiban');assert.equal(ny.boss,'Tlézcatl');assert.equal(ny.difficulty,0);assert.equal(ny.style,'nyc');
 assert.equal(CAMPAIGN[1],'nyc');for(const k of KAIJU)assert.equal(kaijuFor({kaiju:k,city:1}),'Kaiban');
 assert.equal(campaignCity(1).boss,'Tlézcatl');assert.equal(CITIES[cityIndexOf('mex')].boss,'Tlézcatl','Mexico City keeps its own boss');
 const p=emptyPermanent(),r=newRun('ABC','Mogurodon');r.city=1;restartCity(r);
 assert.equal(conquerCity(p,r,100,'Tlézcatl'),false,'not before the last route level');
 for(const i of routeLevels(NYC).slice(0,-1)){assert.equal(r.block,i);assert.ok(latchBlock(r));assert.ok(nextBlock(r,100));}
 assert.equal(levels[r.block].name,'Empire State');assert.ok(conquerCity(p,r,1000,campaignCity(r.city).boss));
 assert.ok(p.unlocked.includes('Tlézcatl'),'Tlézcatl unlocks');assert.ok(p.conquered.includes('nyc'));
 assert.ok(advanceCity(r));assert.equal(CAMPAIGN[r.city],'mex','Mexico City is next');
});

test('the old five blocks are an off-route fixture city: verbatim, never on the campaign, in Free Play, saves or progress',()=>{
 const id='nyc-classic',ci=cityIndexOf(id),c=CITIES[ci];assert.ok(ci>=0);assert.equal(c.style,'nyc');assert.equal(c.kaiju,undefined,'no kaiju of its own: the run keeps its own');assert.equal(c.boss,'Kaiban');
 assert.ok(!CAMPAIGN.includes(id));assert.deepEqual(LEVELS[ci].map(b=>b.name),['Lower Manhattan','Midtown Corridor','Central Stronghold','East River Offensive','Kaiban Arena']);
 assert.deepEqual(LEVELS[ci].map(b=>b.screens),[4,6,8,8,4]);assert.deepEqual(LEVELS[ci].map(b=>b.kind),['district','district','stronghold','district','boss']);
 assert.equal(LEVELS.length,CITIES.length,'one level list per city');
 // Never offered: a profile that lists it as conquered gets nothing, a save that names it is stripped, the dev unlock does not add it.
 const p={...emptyPermanent(),unlocked:[...KAIJU],conquered:['sfo',id]};
 assert.equal(validFreePlay(p,{kaiju:'Mogurodon',boss:'Mogurodon',city:ci}),false);assert.equal(validFreePlay(p,{kaiju:'Mogurodon',boss:'Mogurodon',city:cityIndexOf('sfo')}),true,'a campaign city still validates');
 const m=new Map<string,string>([[PERMANENT_KEY,JSON.stringify(p)]]);const loaded=readSaves({getItem:k=>m.get(k)??null,setItem:()=>{},removeItem:()=>{}});assert.deepEqual(loaded.permanent.conquered,['sfo']);
});

test('the Free Play screen lists only campaign cities, even with everything unlocked',async()=>{
 const p=emptyPermanent();p.unlocked=[...KAIJU];p.conquered=[...CAMPAIGN,'nyc-classic'];
 const h=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));try{h.click('#freeplay');const html:string=h.node('#overlay').innerHTML;
  const options=[...html.matchAll(/<option value="(\d+)"[^>]*>([^<]*)<\/option>/g)].filter(m=>CITIES[+m[1]]&&m[2]===CITIES[+m[1]].name).map(m=>CITIES[+m[1]].id);
  assert.deepEqual(options,CAMPAIGN,'the city list is the campaign route, nothing else');assert.ok(!html.includes('classic'));
 }finally{h.cleanup();}
});

test('a campaign boots from a v2 checkpoint into New York playing Kaiban, and every NYC level loads',async()=>{
 const h=await bootCampaign(.75,{city:'nyc',kaiju:'Mogurodon'});
 try{let s=h.state();assert.equal(s.cityCode,'NYC');assert.equal(s.activeKaiju,'Kaiban');assert.equal(s.level.name,'The Battery');assert.equal(s.stage,1);assert.equal(s.growthCap,1);
  for(let i=0;i<levels.length;i++){assert.ok(h.test().goto(i));h.step(2);s=h.state();assert.equal(s.level.name,levels[i].name);assert.equal(s.activeKaiju,'Kaiban');assert.ok(s.worldWidth>0);
   if(levels[i].startStage&&!levels[i].secret)assert.equal(s.stage,levels[i].startStage,`${levels[i].name} starts at its stage`);
   assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.hp));}
 }finally{h.cleanup();}
});

test('the fixture city boots through kaijuTest.gotoCity with the run\'s own kaiju and its exact old layout',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Belial'});
 try{let s=h.state();assert.equal(s.level.name,'Lower Manhattan');assert.equal(s.activeKaiju,'Belial');assert.equal(s.cityCode,'NYC');
  assert.ok(h.test().goto(4));h.step(2);s=h.state();assert.equal(s.level.name,'Kaiban Arena');assert.ok(s.rival);
  assert.equal(h.test().gotoCity('nowhere',0),false);
 }finally{h.cleanup();}
});
