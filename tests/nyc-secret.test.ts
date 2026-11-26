import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,CONEY,RUNAWAY as RN} from '../src/config.ts';
import {CAMPAIGN,newRun,latchBlock,nextBlock,exitTarget,routeLevels,campaignCityIndex,secretIds,secretLevelOf,freePlayLevels,emptyPermanent,KAIJU} from '../src/campaign.ts';
import {createBuildings} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {profileY,depthAt,setTerrain} from '../src/terrain.ts';
import {waterBand} from '../src/water.ts';
import {VEHICLE_SPECS,loose,createFleet} from '../src/vehicles.ts';
import {startRolling,tickRolling,tickTrain,derail,startRunaway} from '../src/rolling.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// New York secret level (NYC rework card 7): Coney Island. Routing, data, the Ferris wheel coming loose and plowing, the coaster derailing, and
// the level staying off the route. Real-loop checks use the game's own update loop through tests/helpers/game-harness.ts.
const NYC=cityIndexOf('nyc'),LV=LEVELS[NYC],at=(n:string)=>LV.findIndex(b=>b.name===n),CI=at('Coney Island'),CONEYL=LV[CI],W=levelWidth(CONEYL),sc=(n:number)=>Math.round(n*C.cityScale);
const HEIGHT=(stage:number)=>C.playerHeight*[1,1.4,2.8][stage-1];
const boot=async(x=200)=>{const h=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban'});h.test().goto(CI,x);h.step(2);h.test().shield(1e6);return h;};
const bIndex=(h:any,f:(b:any)=>boolean)=>h.state().buildings.findIndex(f);
const veh=(h:any,kind:string)=>h.state().vehicles.find((v:any)=>v.kind===kind);

test('routing: Central Park\'s east exit leads to Coney Island, and Coney Island rejoins the route at Hudson Yards',()=>{
 const park=at('Central Park'),yards=at('Hudson Yards');
 assert.equal(exitTarget(NYC,park,'east'),CI);assert.equal(exitTarget(NYC,park,'west'),yards);assert.equal(exitTarget(NYC,CI),yards);
 const r=newRun('ABC');r.city=CAMPAIGN.indexOf('nyc');r.block=park;r.phase='playing';assert.ok(latchBlock(r));assert.ok(nextBlock(r,10,'east'));assert.equal(r.block,CI,'the Q train');
 r.phase='results';assert.ok(nextBlock(r,20));assert.equal(r.block,yards,'back on the route at Hudson Yards');
});

test('Coney Island data: a secret 4-screen district at Stage 3, tier 5, the counterpart of Alcatraz',()=>{
 assert.deepEqual([CONEYL.screens,CONEYL.kind,CONEYL.secret,CONEYL.startStage,CONEYL.cap,CONEYL.tier],[4,'district',true,3,3,5]);
 assert.equal(CONEYL.after,'Hudson Yards');assert.equal(CONEYL.secretId,'coney-island');assert.ok(CONEYL.lore);assert.equal(CONEYL.exits,undefined);assert.equal(CONEYL.target,undefined);
 assert.deepEqual(secretLevelOf('coney-island'),{city:NYC,block:CI});assert.ok(secretIds().includes('coney-island'));
 // The new fields are opt-in: only this level sets them.
 for(const b of LEVELS.flat().filter(x=>x!==CONEYL))for(const k of ['wheel','coaster'])assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
 for(const b of LEVELS.flat().filter(x=>x!==CONEYL))assert.ok(!b.buildings.some(x=>['wheelbase','track','lifeguard'].includes(x.deco??'')),`${b.name} uses no Coney decos`);
 assert.ok(CONEYL.wheel!==undefined&&CONEYL.coaster);
});

test('Coney Island layout: terminal at the west end, the amusement area, the rides, the boardwalk, the Parachute Jump, then the beach and the Atlantic',()=>{
 const solid=createBuildings(CONEYL.buildings.filter(x=>x.kind!=='tiny')).sort((p,q)=>p.x-q.x);
 for(const b of solid){assert.ok(b.x>=0&&b.x+b.w<=W,`${b.label||b.deco} inside the world`);assert.deepEqual(checkParts(b),[],`${b.label||b.deco} parts`);}
 for(let i=1;i<solid.length;i++)assert.ok(solid[i].x>=solid[i-1].x+solid[i-1].w-1,`${solid[i].label||solid[i].deco} overlaps the one before`);
 const first=solid[0],pj=solid.find(b=>b.landmark)!,pav=solid.find(b=>b.label==='BOARDWALK PAVILION')!;
 assert.equal(first.label,'STILLWELL TERMINAL','the subway terminal is at the west end');assert.equal(pj.label,'PARACHUTE JUMP');assert.equal(pj.shape,'lattice');
 assert.ok(solid.some(b=>b.label==='FRANKS')&&solid.some(b=>b.label==='ARCADE')&&solid.some(b=>b.deco==='lifeguard'),'a hot dog stand, arcades and a lifeguard tower');
 for(const b of CONEYL.buildings)assert.ok(!/NATHAN|CYCLONE|WONDER/i.test(b.label),'generic ride and stand names');
 // West to east: terminal, amusement area, coaster, wheel, boardwalk, Parachute Jump, sea.
 const track=solid.filter(b=>b.deco==='track'),base=solid.find(b=>b.deco==='wheelbase')!;
 assert.ok(first.x<track[0].x&&track[track.length-1].x<base.x&&base.x<pav.x&&pav.x<pj.x);
 // The water: at Stage 3 it is a wade (and still one at Stage 2); a jetty at the east end is dry land for the exit.
 setTerrain(CONEYL.ground!,CONEYL.water!);
 try{let deepest=0;for(let x=0;x<W;x+=8)deepest=Math.max(deepest,depthAt(x));
  assert.ok(deepest>40,`a real sea (${deepest})`);for(const stage of [3,2])assert.equal(waterBand(deepest,HEIGHT(stage)),'wading',`wading at Stage ${stage}`);
  assert.equal(depthAt(W-60),0,'the east exit stands on dry land');assert.equal(depthAt(sc(200)),0,'and the terminal end');}finally{setTerrain(null);}
 assert.equal(CONEYL.bands,true);
});

test('the coaster is a raised wooden track: stacked hit parts, climbable, with a train on it',()=>{
 const sections=CONEYL.buildings.filter(b=>b.deco==='track'),[a,z]=CONEYL.coaster!;
 assert.equal(sections.length,6);assert.equal(sections[0].x,a);assert.equal(sections[5].x+sections[5].w,z);
 for(const s of sections){assert.ok(s.parts!.length>=4,'posts, a brace and the deck are stacked');assert.deepEqual(checkParts(s),[]);
  const deck=s.parts!.reduce((m,p)=>Math.max(m,p.top),0);assert.ok(deck>HEIGHT(3),'the deck is above a Stage 3 kaiju\'s head, so it walks under');assert.ok(s.parts!.some(p=>(p.base??0)>0&&p.top===deck),'a deck part stacked on the posts');assert.equal(s.kind,'medium','solid, so it can be climbed');}
 assert.ok(sections[2].h>sections[0].h,'the hill is taller');
});

test('the wheel base and the wheel: a huge body standing on its base',()=>{
 const base=CONEYL.buildings.find(b=>b.deco==='wheelbase')!;assert.ok(Math.abs(base.x+base.w/2-CONEYL.wheel!)<2,'the base is under the wheel\'s hub');
 assert.equal(VEHICLE_SPECS.wheel.w,VEHICLE_SPECS.wheel.h);assert.ok(VEHICLE_SPECS.wheel.h>HEIGHT(3)*1.8,'taller than a Stage 3 kaiju by a long way');
 assert.equal(loose(createFleet('wheel',[0],1,'#fff')[0]),false,'nothing on the street stomps or carries the wheel');
});

test('rolling physics: the wheel speeds up on any slope, even a gentle one a car would not roll down',()=>{
 setTerrain([[0,C.ground],[1000,C.ground],[1400,C.ground+30],[6000,C.ground+30]]);
 try{const wheel=createFleet('wheel',[1000],1,'#fff')[0],car=createFleet('car',[1000],2,'#fff')[0];startRolling(wheel,CONEY.wheel.shove,1);startRolling(car,CONEY.wheel.shove,1);
  let v0=Math.abs(wheel.vx);for(let t=0;t<60;t++){tickRolling(wheel,1/60,6000);tickRolling(car,1/60,6000);}
  assert.ok(Math.abs(wheel.vx)>v0+25,`the wheel gathers speed (${v0} -> ${wheel.vx.toFixed(0)})`);assert.ok(Math.abs(car.vx)<Math.abs(wheel.vx),'a car loses to the same slope');
  assert.ok(wheel.angle>0,'it turns as it rolls');
  // Past the ramp it carries on over the flat for a long way.
  const x0=wheel.x;for(let t=0;t<60*6&&wheel.state==='rolling';t++)tickRolling(wheel,1/60,6000);assert.ok(wheel.x>x0+300,'it keeps rolling');
 }finally{setTerrain(null);}
});

test('the Ferris wheel breaking loose: smash the base and it comes off, rolls down the boardwalk, bowls through buildings and wrecks on the first it cannot flatten',async()=>{
 const h=await boot(200);
 let w=veh(h,'wheel');assert.ok(w,'the wheel stands in the level');assert.equal(w.state,'parked');
 const ib=bIndex(h,b=>b.deco==='wheelbase'),at0=w.x;
 h.step(60);assert.equal(veh(h,'wheel').state,'parked','a wheel on its base stays put');assert.equal(veh(h,'wheel').x,at0);
 const idxOf=(label:string)=>CONEYL.buildings.findIndex((b,i)=>b.label===label&&b.x>w.x+w.w);
 const east=[idxOf('FRANKS'),idxOf('ARCADE'),CONEYL.buildings.findIndex(b=>b.deco==='lifeguard')],pavilion=CONEYL.buildings.findIndex(b=>b.label==='BOARDWALK PAVILION');
 // The state's building order is the level's own (createBuildings keeps it).
 const hp=(i:number)=>h.state().buildings[i].hp;
 for(const i of [...east,pavilion])assert.ok(hp(i)>0);
 h.test().smash(ib);h.step(40);w=veh(h,'wheel');// (the smash's hit-stop eats the first few frames)
 assert.equal(w.state,'rolling','the wheel comes off its base');assert.equal(w.plows,CONEY.wheel.plows);assert.ok(w.vx>0);
 let top=0;for(let n=0;n<60*40&&veh(h,'wheel').state==='rolling';n++){h.step(1);top=Math.max(top,veh(h,'wheel').vx);}
 w=veh(h,'wheel');assert.ok(top>w.vx&&top>150,`it picked up speed on the way (${top.toFixed(0)})`);
 assert.ok(w.x>at0+200,'it rolled east');
 for(const i of east)assert.equal(hp(i),0,`it bowled through ${CONEYL.buildings[i].label||CONEYL.buildings[i].deco}`);
 assert.ok(hp(pavilion)>0,'the pavilion held');assert.notEqual(w.state,'rolling','and the wheel was wrecked against it');
 assert.ok(w.x+w.w<=CONEYL.buildings[pavilion].x+CONEYL.buildings[pavilion].w,'it did not roll on through');
 h.cleanup();
});

test('the wheel keeps its bowl-through budget: it flattens up to `plows` buildings, and a building it cannot flatten wrecks it',()=>{
 // Pure: the plow count it starts with is the config value, larger than a car\'s.
 const v=createFleet('wheel',[0],1,'#fff')[0];startRolling(v,50,1);assert.equal(v.plows,RN.plows,'startRolling gives the car default');assert.ok(CONEY.wheel.plows>RN.plows,'the wheel is set to more when it comes off');
 assert.ok(CONEY.wheel.mass>VEHICLE_SPECS.cablecar.mass*3,'and is far heavier than a cable car');
});

test('the roller coaster: the train shuttles on its track like a cable car, riding the deck',async()=>{
 const h=await boot(200);let t=veh(h,'coaster');assert.ok(t);assert.equal(t.state,'cable');const [a,z]=CONEYL.coaster!;
 const dir0=t.dir,x0=t.x;h.step(120);t=veh(h,'coaster');assert.ok((t.x-x0)*dir0>0,'it moves along the track');
 const decks=CONEYL.buildings.filter(b=>b.deco==='track');
 for(let n=0;n<60*14;n++){h.step(1);t=veh(h,'coaster');assert.equal(t.state,'cable','it stays on the rails');assert.ok(t.x>=a-1e-6&&t.x+t.w<=z+1e-6,'inside its line');
  const under=decks.find(d=>t.x+t.w/2>=d.x&&t.x+t.w/2<=d.x+d.w)!;assert.ok(t.y+t.h<=C.ground-HEIGHT(3)*0+1&&t.y+t.h>C.ground-under.h-80,'its wheels are on a deck up in the air');}
 assert.ok(t.y+t.h<C.ground-HEIGHT(3),'above a Stage 3 kaiju\'s head');
 const seen=new Set<number>();for(let n=0;n<60*14;n++){h.step(1);seen.add(veh(h,'coaster').dir);}assert.equal(seen.size,2,'it turns round at the ends');
 h.cleanup();
});

test('the coaster derailing: break a section of track and the train jumps the rails and careens off as a runaway',async()=>{
 const h=await boot(200);const sections=CONEYL.buildings.map((b,i)=>[b,i] as const).filter(([b])=>b.deco==='track').map(([,i])=>i);
 let t=veh(h,'coaster');const hill=sections[3];
 h.test().smash(hill);h.step(2);t=veh(h,'coaster');assert.equal(t.state,'cable','while it is not at the gap it keeps going');
 let seen=new Set<string>(),y0=t.y,top=y0;for(let n=0;n<60*30&&!['rolling'].includes(veh(h,'coaster').state)&&veh(h,'coaster').state!=='wreck';n++){h.step(1);seen.add(veh(h,'coaster').state);}
 assert.ok(seen.has('flying'),'it leaves the rails and falls');t=veh(h,'coaster');
 assert.equal(t.state,'rolling','a runaway once it lands');assert.equal(t.plows,CONEY.coaster.plows);assert.ok(Math.abs(t.vx)>=CONEY.coaster.runaway-1);assert.ok(t.y+t.h>C.ground-5,'down on the street');
 assert.equal(loose(t as any),true,'a runaway is a loose body: it can be punted, grabbed, wrecked');
 // It plows: the track it lands under is bowled through, so it does not just stop in place.
 const x1=t.x,intact=()=>sections.filter(i=>h.state().buildings[i].hp>0).length,left0=intact();h.step(60*3);t=veh(h,'coaster');assert.ok(t.plows<=CONEY.coaster.plows);void x1;
 assert.ok(intact()<left0||t.plows<CONEY.coaster.plows,'it bowled through track as it ran away');
 h.cleanup();
});

test('a train whose track is whole never derails; one with a gap under its nose does (pure)',()=>{
 const [a,z]=CONEYL.coaster!,deckAt=(gap:[number,number]|null)=>(x:number)=>x<a||x>z||(gap&&x>=gap[0]&&x<gap[1])?null:C.ground-300;
 const v=createFleet('coaster',[a+10],1,'#fff')[0];v.state='cable';v.line=[a,z];v.dir=1;
 for(let t=0;t<60*30;t++)assert.equal(tickTrain(v,1/60,deckAt(null)),'ok');
 v.x=a+10;v.dir=1;let out='ok';const gap:[number,number]=[a+300,a+420];for(let t=0;t<60*30&&out==='ok';t++)out=tickTrain(v,1/60,deckAt(gap));
 assert.equal(out,'derail');assert.ok(v.x+v.w>=gap[0]-4&&v.x+v.w<=gap[0]+12,'at the lip of the gap');
 derail(v);assert.equal(v.state,'flying');assert.ok(v.vx>0&&v.vy<0&&v.runaway);v.state='wreck';v.vx=0;v.runaway=true;startRunaway(v);assert.equal(v.state,'rolling');assert.equal(v.runaway,true,'it stays a runaway until it is picked up, crashes or stops');
});

test('Coney Island is off the route: it does not count in the route length or the QA playthrough\'s route',()=>{
 const route=routeLevels(NYC);assert.equal(route.length,9);assert.equal(route.includes(CI),false);assert.deepEqual(route,[0,1,2,3,4,5,6,7,8]);
 assert.equal(routeLevels(campaignCityIndex(CAMPAIGN.indexOf('nyc'))).includes(CI),false,'the playthrough walks routeLevels');
 const total=CAMPAIGN.reduce((n,id)=>n+routeLevels(cityIndexOf(id)).length,0),all=CAMPAIGN.reduce((n,id)=>n+LEVELS[cityIndexOf(id)].filter(b=>!b.secret).length,0);
 assert.equal(total,all,'the route length counts no secret level');assert.equal(LV.filter(b=>b.secret).length,1,'one secret level in New York');
 // Free Play only has it once it has been cleared in a campaign.
 const p=emptyPermanent();p.unlocked=[...KAIJU];assert.deepEqual(freePlayLevels(p,NYC),route);
 assert.equal(CITIES[NYC].kaiju,'Kaiban');
});
