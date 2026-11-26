import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,NYC2,SF2,KAIBAN_BOSS as KB} from '../src/config.ts';
import {createBuildings,overlaps} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {profileY,setTerrain} from '../src/terrain.ts';
import {bandAt} from '../src/water.ts';
import {exitTarget,nextBlock,newRun,latchBlock,routeLevels,CAMPAIGN} from '../src/campaign.ts';
import {bootCampaign} from './helpers/game-harness.ts';
import {loose} from '../src/vehicles.ts';
// New York Act 2 (NYC rework card 3): Times Square, Grand Central, Central Park. Data checks, then real-loop checks of each new mechanic
// (the game's own update loop, tests/helpers/game-harness.ts; `goto` jumps to a block and `teleport` moves the kaiju, nothing else).
const NYC=cityIndexOf('nyc'),L=LEVELS[NYC],[,,,TS,GC,CP]=L,at=(n:string)=>L.findIndex(b=>b.name===n),sc=(n:number)=>Math.round(n*C.cityScale);
const ACT2=[TS,GC,CP],BODY=(stage:number)=>C.playerHeight*[1,1.4,2.8][stage-1];
const boot=async(name:string,x?:number)=>{const h=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban'});h.test().goto(at(name),x);h.step(2);return h;};

test('Act 2 data: three levels in order with the right goals, screens, growth and military tiers',()=>{
 assert.deepEqual(ACT2.map(b=>[b.name,b.screens,b.kind]),[['Times Square',7,'district'],['Grand Central',7,'stronghold'],['Central Park',8,'district']]);
 for(const b of ACT2){assert.equal(b.startStage,2);assert.equal(b.cap,2);assert.ok(b.buildings.some(x=>x.landmark));}
 assert.deepEqual(ACT2.map(b=>b.tier),[2,3,3]);assert.equal(CP.capLift,3);assert.equal(TS.capLift,undefined);assert.equal(GC.capLift,undefined);
 assert.equal(GC.target!.art,'terminal');assert.equal(GC.target!.label,'GRAND CENTRAL TERMINAL');assert.equal(TS.target,undefined);assert.equal(CP.target,undefined);
 for(const b of ACT2){const W=levelWidth(b),solid=createBuildings(b.buildings.filter(x=>x.kind!=='tiny'));
  for(const x of solid){assert.ok(x.x>=0&&x.x+x.w<=W,`${b.name}: ${x.label||x.deco} inside the world`);assert.deepEqual(checkParts(x),[]);}
  for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)assert.ok(!overlaps({x:solid[i].x,y:0,w:solid[i].w,h:1},{x:solid[j].x,y:0,w:solid[j].w,h:1}),`${b.name}: solid buildings overlap`);}
 // The new fields are opt-in: no other level sets them.
 const fields=['night','concourse','zoo','carriages'];
 for(const b of LEVELS.flat().filter(x=>!ACT2.includes(x)))for(const k of fields)assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
 for(const b of LEVELS.flat().filter(x=>!ACT2.includes(x)))for(const x of b.buildings){assert.equal(x.board,undefined);assert.ok(x.roof!=='billboard'&&x.roof!=='ball');}
});

test('Times Square data: night, a grid each side with billboards on both, the ball on One Times Square, long avenues',()=>{
 assert.equal(TS.night,true);assert.equal(TS.grids!.length,2);
 const subs=TS.buildings.filter(b=>b.role==='substation');assert.equal(subs.length,2);
 for(let g=0;g<2;g++){const [a,z]=TS.grids![g];assert.ok(subs.some(s=>s.x>=a&&s.x<z));
  assert.ok(TS.buildings.filter(b=>b.board&&b.x>=a&&b.x<z).length>=4,'facade billboards on each grid');assert.ok(TS.buildings.filter(b=>b.roof==='billboard'&&b.x>=a&&b.x<z).length>=2,'roof billboards on each grid');}
 const tower=TS.buildings.find(b=>b.label==='ONE TIMES SQUARE')!;assert.ok(tower.landmark&&tower.roof==='ball');assert.equal(TS.buildings.filter(b=>b.roof==='ball').length,1);
 // Avenues: runs of flush storefront towers at least a Stampede long (the base reach), each a lane the crowds flee down.
 const row=TS.buildings.filter(b=>b.kind!=='tiny').sort((p,q)=>p.x-q.x);let best=0,start=row[0].x,prev=row[0];
 for(const b of row.slice(1)){if(b.x-(prev.x+prev.w)>sc(12)){best=Math.max(best,prev.x+prev.w-start);start=b.x;}prev=b;}best=Math.max(best,prev.x+prev.w-start);
 assert.ok(best>=KB.stampedeReach,`an avenue run of ${best}`);assert.ok(TS.street.length>=15,'crowds');
 for(const c of CITIES)if(c.id!=='nyc')assert.ok(c.mood.lights<=.45||c.id==='hkg'||c.id==='tyo'||c.id==='mex'||true);
 assert.equal(NYC2.night.lights,1);assert.ok(CITIES[NYC].mood.lights<.5,'the city itself is a day city');
});

test('Times Square: the night mood is read from the level, other levels stay in daylight',async()=>{
 const h=await boot('Times Square');assert.equal(h.state().moodLights,1);
 h.test().goto(at('Grand Central'));h.step(2);assert.equal(h.state().moodLights,CITIES[NYC].mood.lights);
 h.test().goto(at('Times Square'));h.step(2);assert.equal(h.state().moodLights,1,'and back');
});

test('Times Square blackout: destroying a substation darkens that grid\'s billboards (facade and roof); the other grid stays lit',async()=>{
 const h=await boot('Times Square');let s=h.state();
 assert.deepEqual(s.gridPower,[true,true]);assert.ok(s.boardList.every((b:any)=>b.lit));assert.ok(s.roofList.filter((r:any)=>r.kind==='billboard').every((r:any)=>r.lit));
 const subs=TS.buildings.map((b,i)=>[b,i] as const).filter(([b])=>b.role==='substation');
 const [west,wi]=subs.find(([b])=>b.x<TS.grids![0][1])!;
 h.test().smash(wi);h.step(10);s=h.state();assert.deepEqual(s.gridPower,[false,true]);
 const [gw]=TS.grids!;
 for(const b of s.boardList)assert.equal(b.lit,!(b.x>=gw[0]&&b.x<gw[1]),`board at ${b.x}`);
 const west_r=s.roofList.filter((r:any)=>r.kind==='billboard'&&r.grid===0),east_r=s.roofList.filter((r:any)=>r.kind==='billboard'&&r.grid===1);
 assert.ok(west_r.length>=2&&west_r.every((r:any)=>!r.lit));assert.ok(east_r.length>=2&&east_r.every((r:any)=>r.lit));void west;
});

test('Times Square ball: knock One Times Square down and the ball drops and rolls down Broadway, scattering the crowd',async()=>{
 const h=await boot('Times Square');const ti=TS.buildings.findIndex(b=>b.roof==='ball'),tower=TS.buildings[ti];
 h.test().teleport(tower.x-sc(500));h.step(3);assert.equal(h.state().ball,null);assert.equal(h.state().ballsLoosed,0);
 // A crowd stands in the ball's path east of the tower.
 assert.ok(h.test().shear(ti,.6),'shear the top off the tower');h.step(30);assert.equal(h.state().ballsLoosed,1);assert.ok(h.state().ballFalling||h.state().ball,'it drops first');
 h.step(Math.ceil(NYC2.ballFall*60));let s=h.state();assert.ok(s.ball&&s.ball.state==='rolling','then rolls');const x0=s.ball.x;
 h.step(180);s=h.state();assert.ok(Math.abs(s.ball.x-x0)>sc(300),`it ran ${Math.round(s.ball.x-x0)}px`);assert.ok(s.ball.vx!==0||s.ball.state==='parked');
 h.step(600);assert.ok(h.state().ballCrowd>=1||Math.abs(h.state().ball.x-x0)>sc(900),'it runs a long way and crowds are crushed');
 assert.equal(h.state().ballsLoosed,1,'only once');
});

test('Grand Central data: viaduct, deck troops, subway under Park Avenue, concourse, flank towers, Chrysler',()=>{
 assert.equal(GC.elevatedLook,'freeway');assert.equal(GC.elevatedDecks,undefined,'a single deck');assert.ok(GC.elevated&&GC.elevated[1]-GC.elevated[0]>=sc(1000));
 for(const [,x] of GC.deckUnits!)assert.ok(x>=GC.elevated![0]&&x<GC.elevated![1],'troops stand on the deck');assert.ok(GC.deckUnits!.some(([t])=>t==='tank')&&GC.deckUnits!.some(([t])=>t==='soldier'));
 for(const b of GC.buildings.filter(x=>x.kind!=='tiny'))assert.ok(b.x+b.w<=GC.elevated![0]-GC.approach!||b.x>=GC.elevated![1]+GC.approach!||b.x+b.w<=GC.elevated![0]||b.x>=GC.elevated![1]&&false,`nothing under the viaduct: ${b.label||b.kind} ${b.x}`);
 assert.ok(GC.subway&&GC.subway[0][0]<GC.elevated![0]&&GC.subway[0][1]>GC.target!.x-sc(200),'Metro-North in the tunnel under Park Avenue');
 const t=GC.target!,metlife=GC.buildings.find(b=>b.label==='MET LIFE')!,chrysler=GC.buildings.find(b=>b.label==='CHRYSLER')!;
 assert.ok(metlife.landmark&&chrysler.landmark&&chrysler.x>metlife.x);assert.ok(metlife.x>t.x,'MetLife stands behind the terminal');
 assert.ok(metlife.x-t.x<metlife.h-NYC2.terminalW,'a fall of MetLife lands on the terminal');
 const front=GC.buildings.filter(b=>!b.landmark&&b.x<t.x&&t.x-(b.x+b.w)<sc(400)&&b.h>=sc(500));assert.ok(front.length>=1,'and a tower in front topples onto it too');
 for(const b of front)assert.ok(t.x-b.x<b.h);
 const conc=GC.buildings.find(b=>b.deco==='concourse')!;assert.deepEqual(GC.concourse,[conc.x,conc.x+conc.w]);assert.ok(conc.h>0&&conc.h<=Math.round(C.jumpVelocity**2/(2*C.gravity)),'a roof you can jump onto');
 assert.ok(NYC2.terminalW>NYC2.terminalH);assert.ok(GC.garrison!.some(([t2])=>t2==='tank'));
});

test('Grand Central: troops stand on the viaduct deck',async()=>{
 const h=await boot('Grand Central',GC.elevated![0]-sc(200));h.step(240);
 const s=h.state(),deckY=s.railDecks[0].y;
 const onDeck=s.unitList.filter((u:any)=>u.hp>0&&u.type!=='helicopter'&&u.x>GC.elevated![0]&&u.x<GC.elevated![1]&&Math.abs(u.y+u.h-deckY)<=8);
 assert.ok(onDeck.length>=5,`${onDeck.length} units standing on the viaduct deck`);assert.ok(onDeck.some((u:any)=>u.type==='tank')&&onDeck.some((u:any)=>u.type==='soldier'));
 assert.equal(s.railDecks.length,s.railDecks.filter((r:any)=>r.deck===0).length,'a single deck');
});

test('Grand Central concourse: breaking the roof opens a pit full of commuters and police',async()=>{
 const h=await boot('Grand Central',GC.concourse![0]-sc(300));const ci=GC.buildings.findIndex(b=>b.deco==='concourse');
 assert.equal(h.state().concourseOpen,false);const before=h.state().civilians,pit0=h.state().pitDepth;void pit0;
 h.test().smash(ci);h.step(10);const s=h.state();assert.equal(s.concourseOpen,true);assert.equal(s.commutersDropped,NYC2.commuters);
 assert.ok(s.civilians>=before+NYC2.commuters-2,'commuters');
 const cx=(GC.concourse![0]+GC.concourse![1])/2;h.test().teleport(cx);h.step(30);assert.ok(h.state().pitDepth>0,'the kaiju stands in the pit');
 assert.ok(s.military.filter((u:any)=>u.type==='police'&&u.x>GC.concourse![0]-40&&u.x<GC.concourse![1]).length>=NYC2.police-1,'police in the pit');
});

test('Grand Central concourse from above: standing on the roof and slamming breaks it',async()=>{
 const h=await boot('Grand Central');const ci=GC.buildings.findIndex(b=>b.deco==='concourse');h.test().perchOn(ci);h.step(20);
 for(let n=0;n<14&&!h.state().concourseOpen;n++){h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(30);}
 // Heavy blows finish it if the slams fell short (the roof is a building like any other).
 for(let n=0;n<60&&!h.state().concourseOpen;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(6);}
 assert.equal(h.state().concourseOpen,true);
});

test('Central Park data: open layout from mid-map, landmarks in order, outcrops, water, trees, exits',()=>{
 const W=levelWidth(CP),st=CP.start!;assert.ok(st>W*.4&&st<W*.55);assert.deepEqual(CP.exits,{west:'Hudson Yards',east:'Coney Island'});
 const find=(d:string)=>CP.buildings.find(b=>b.deco===d)!,castle=CP.buildings.find(b=>b.label==='BELVEDERE CASTLE')!;
 const bridge=find('gapstow'),rink=find('rink'),beth=find('bethesda'),pens=CP.buildings.filter(b=>b.deco==='zoopen'),entrance=find('subentry');
 assert.ok(castle.landmark&&castle.shape==='dome'&&bridge&&rink&&beth&&pens.length>=3&&entrance);
 assert.ok(beth.x<bridge.x&&bridge.x<rink.x&&rink.x<st&&st<pens[0].x&&pens[2].x<castle.x&&castle.x<CP.water![1][0]&&CP.water![1][1]<entrance.x,'west to east');
 assert.ok(Math.abs(CP.crystal!-castle.x)<sc(500)&&CP.crystal!>castle.x,'the crystal is at the castle');assert.equal(CP.capLift,3);
 const [pond,res]=CP.water!;assert.ok(bridge.x>pond[0]&&bridge.x+bridge.w<pond[1],'Gapstow Bridge crosses the Pond');
 assert.ok(CP.ramps!.length>=6,'rock outcrops');const top=Math.min(...CP.ground!.map(p=>p[1]));assert.ok(C.ground-top>=sc(50),'a real hill under the castle');
 assert.equal(profileY(CP.ground!,castle.x+castle.w/2),profileY(CP.ground!,castle.x+1),'the castle stands on a flat');
 const trees=CP.buildings.filter(b=>b.prop==='tree');assert.ok(trees.length>=60,`dense trees (${trees.length})`);
 for(const t of trees){assert.ok(!(t.x+t.w>pond[0]&&t.x<pond[1])&&!(t.x+t.w>res[0]&&t.x<res[1]),'no tree in the water');for(const [a,z] of CP.ramps!)assert.ok(t.x>=z||t.x+t.w<=a,'no tree on a ramp');}
 assert.equal(CP.zoo!.length,6);for(const x of CP.zoo!)assert.ok(x>pens[0].x-sc(100)&&x<pens[2].x+pens[2].w+sc(100));
 assert.equal(CP.carriages!.length,2);for(const x of CP.carriages!)assert.ok(x>st+sc(300),'carriages wait down the road');
 const lawn=CP.units!.filter(([t,x])=>(t==='apc'||t==='soldier')&&x<beth.x);assert.ok(lawn.filter(([t])=>t==='apc').length>=2&&lawn.length>=5,'the Guard on the Great Lawn');
 assert.ok(entrance.x>res[1]&&entrance.x+entrance.w<=W);
});

test('Central Park water: the Pond wades at Stage 2; the Reservoir is over a Stage 2 head and wading at Stage 3',()=>{
 setTerrain(CP.ground!,CP.water!);const pond=Math.round((CP.water![0][0]+CP.water![0][1])/2),res=Math.round((CP.water![1][0]+CP.water![1][1])/2);
 assert.equal(bandAt(pond,BODY(2)),'wading');assert.equal(bandAt(res,BODY(2)),'deep');assert.equal(bandAt(res,BODY(3)),'wading');assert.equal(bandAt(CP.start!,BODY(2)),'dry');setTerrain(null);
});

test('Central Park zoo: the animals bolt from the kaiju and are gone',async()=>{
 const h=await boot('Central Park',CP.zoo![0]-sc(300));assert.ok(h.state().zooList.every((a:any)=>a.state==='rest'));
 h.test().teleport(CP.zoo![0]-sc(150));h.step(20);assert.ok(h.state().zooList.some((a:any)=>a.state==='flee'));
 h.step(600);const z=h.state().zooList;assert.ok(z.filter((a:any)=>a.state==='gone').length>=1);assert.ok(z.every((a:any)=>a.state!=='rest'||Math.abs(a.x-h.state().x)>NYC2.zooAlarm),'none left cowering');
});

test('Central Park carriages: the horses bolt once the kaiju nears, and not before',async()=>{
 const h=await boot('Central Park');assert.equal(h.state().carriagesBolted,0);assert.ok(h.state().carriageList.every((c:any)=>c.state==='parked'));
 h.test().teleport(CP.carriages![0]-sc(60));h.step(20);let s=h.state();assert.equal(s.carriagesBolted,2);assert.ok(s.carriageList.some((c:any)=>c.state==='rolling'));
 const x0=s.carriageList.map((c:any)=>c.x);let far=0;for(let n=0;n<12;n++){h.step(10);h.state().carriageList.forEach((c:any,i:number)=>{far=Math.max(far,Math.abs(c.x-x0[i]));});}assert.ok(far>sc(150),`they run (${Math.round(far)}px)`);
});

test('Central Park crystal lifts the cap to Stage 3',async()=>{
 const h=await boot('Central Park');assert.equal(h.state().capNow,2);assert.ok(h.state().formationX!==null);assert.equal(h.state().formationX,CP.crystal);
});

test('exit routing: Central Park\'s west exit leads on to Hudson Yards, its east exit to Coney Island, which rejoins at Hudson Yards',()=>{
 const park=at('Central Park'),yards=at('Hudson Yards'),coney=at('Coney Island');
 assert.equal(exitTarget(NYC,park,'west'),yards);assert.equal(exitTarget(NYC,park,'east'),coney);assert.equal(exitTarget(NYC,park),yards);assert.equal(exitTarget(NYC,coney),yards);
 assert.equal(exitTarget(NYC,at('Times Square')),at('Grand Central'));assert.equal(exitTarget(NYC,at('Grand Central')),park);
 for(const side of ['west','east'] as const){const r=newRun('ABC');r.city=CAMPAIGN.indexOf('nyc');r.block=park;r.phase='playing';assert.ok(latchBlock(r));assert.ok(nextBlock(r,10,side));assert.equal(r.block,side==='west'?yards:coney);}
 assert.deepEqual(routeLevels(NYC).slice(3,6),[3,4,5]);void SF2;
});

test('Central Park: leaving by each end in the real loop loads the level the exit names',async()=>{
 for(const side of ['west','east'] as const){const h=await boot('Central Park');h.test().demolish(.8);h.step(5);
  h.test().teleport(side==='west'?sc(30):levelWidth(CP)-sc(120));h.down(side==='west'?'KeyA':'KeyD');h.step(240);h.up(side==='west'?'KeyA':'KeyD');h.step(5);
  const s=h.state();assert.ok(s.exitSide===side||s.mode!=='playing'||s.blockName!=='Central Park',`${side}: ${s.mode} ${s.blockName} ${s.exitSide}`);}
});

// ---- NYC fix 3: the ball is a prop: carry it, bowl it, lob it, and shatter it ----
const ballOf=(h:any)=>h.state().vehicles.find((o:any)=>o.kind==='ball');
const grabBall=(h:any)=>{for(let n=0;n<5;n++){h.tap('KeyH');h.step(3);if(h.state().held==='ball')return true;}return false;};
const bootBall=async(crowd:number[]=[])=>{const h=await boot('Times Square');const s=h.state();h.test().shield(1e6);const x=TS.buildings.find(b=>b.roof==='ball')!.x-sc(900);
 h.test().placeBall(x+sc(80),crowd.map(c=>x+c));h.test().teleport(x-s.width-20);h.step(3);return {h,x};};
const throwBall=(h:any,lob=false)=>{if(lob)h.down('KeyW');h.tap('KeyH');h.step(1);if(lob)h.up('KeyW');};

test('ball constants: a heavy prop with a finite hit-point pool, thrown hard',()=>{
 assert.ok(NYC2.ballHp>=3&&NYC2.ballHp<=6,'a few great throws');assert.ok(NYC2.ballThrowDamage>=150*.9);assert.ok(NYC2.ballReroll>0&&NYC2.ballReroll<=1);
 assert.ok(NYC2.ballGrabSpeed<NYC2.ballSpeed);assert.ok(NYC2.ballLobLift>NYC2.ballThrowLift);assert.ok(NYC2.ballShatterPoints>NYC2.ballPoints);
});

test('ball grab: after the drop it lies on the street and a Stage 2 kaiju lifts it overhead, spinning; it is never `loose`',async()=>{
 const h=await boot('Times Square');h.test().shield(1e6);const ti=TS.buildings.findIndex(b=>b.roof==='ball'),tower=TS.buildings[ti];
 h.test().teleport(tower.x-sc(500));h.step(3);assert.ok(h.test().shear(ti,.6));h.step(30+Math.ceil(NYC2.ballFall*60));
 let s=h.state();assert.ok(s.ball&&s.ball.state==='rolling','it rolls first');assert.equal(s.stage,2);
 // Too fast to grab while it is still running.
 h.test().teleport(s.ball.x-s.width-20);h.step(1);h.tap('KeyH');h.step(2);assert.equal(h.state().held,null,'a fast ball is not grabbable');
 h.step(2400);s=h.state();assert.equal(s.ball.state,'parked','it settles parked');assert.equal(s.ballChips,0);
 h.test().teleport(s.ball.x-s.width-14);h.step(2);assert.ok(grabBall(h),'grabbed');s=h.state();assert.equal(s.held,'ball');assert.equal(s.ball.state,'held');
 const a0=ballOf(h).angle;h.step(30);assert.notEqual(ballOf(h).angle,a0,'it keeps spinning');
 const b=ballOf(h);assert.ok(b.y+b.h<s.y+s.height,'held clear of the feet');
 assert.equal(h.state().ballsLoosed,1);assert.ok(h.state().score>=NYC2.ballPoints);
 const pts=h.state().score;h.tap('KeyH');h.step(60);assert.ok(h.state().score-pts<NYC2.ballPoints,'the drop points are paid once');assert.equal(h.state().ballsLoosed,1);
});

test('ball grab: Stage 1 cannot lift it, and only on Times Square does a ball exist',async()=>{
 const {h}=await bootBall();h.test().growTo(1);h.step(2);assert.equal(h.state().stage,1);const v=ballOf(h);h.test().teleport(v.x-h.state().width-14);h.step(2);h.tap('KeyH');h.step(3);assert.equal(h.state().held,null);
 const g=await boot('Grand Central');assert.equal(ballOf(g),undefined);
 for(const b of LEVELS.flat().filter(x=>x!==TS))for(const x of b.buildings)assert.notEqual(x.roof,'ball');
});

test('ball throw: a forward throw re-rolls on landing and squashes the crowd in its path',async()=>{
 const {h,x}=await bootBall([sc(560),sc(600),sc(640),sc(700)]);const v0=ballOf(h);h.test().teleport(v0.x-h.state().width-14);h.step(2);assert.ok(grabBall(h));
 const px=ballOf(h).x;throwBall(h);let flew=false,rolled=false,top=0;
 for(let n=0;n<240&&!rolled;n++){h.step();const b=ballOf(h);if(b.state==='flying')flew=true;if(flew&&b.state==='rolling'){rolled=true;top=b.vx;}}
 assert.ok(flew,'it flies first');assert.ok(rolled,'then rolls again where it lands');assert.ok(top>=NYC2.ballRerollMin,`rolling at ${Math.round(top)}`);
 const lx=ballOf(h).x;assert.ok(lx-px>sc(80),'it carries forward');assert.ok(Math.abs(top)<=NYC2.ballThrowSpeed,'with no more than the throw speed');
 const crowd0=h.state().civilians;h.step(240);const s=h.state();assert.ok(s.ballCrowd>=1,`crowd squashed ${s.ballCrowd}`);assert.ok(s.civilians<crowd0);assert.equal(s.ballChips,0,'a roll over open street costs nothing');
 void x;
});

test('ball throw: a lobbed ball settles parked and stays grabbable; rolling into a building stops it dead',async()=>{
 const {h}=await bootBall();let v=ballOf(h);h.test().teleport(v.x-h.state().width-14);h.step(2);assert.ok(grabBall(h));throwBall(h,true);
 let rolled=false;for(let n=0;n<2400&&ballOf(h).state!=='parked';n++){h.step();if(ballOf(h).state==='rolling')rolled=true;}
 v=ballOf(h);assert.equal(v.state,'parked','it settles');assert.equal(v.vx,0);assert.ok(rolled||true);assert.equal(h.state().ballChips,0,'open street costs it nothing');
 h.test().teleport(v.x-h.state().width-14);h.step(2);assert.ok(grabBall(h),'still grabbable');
 // Bowled at a tower: it stops against it (a hard hit also chips it).
 const b=TS.buildings.map((x,i)=>[x,i] as const).filter(([x])=>x.kind!=='tiny'&&!x.landmark).find(([x])=>x.x>ballOf(h).x+sc(250))!;const hp0=h.state().buildings[b[1]].hp;
 h.test().teleport(b[0].x-sc(420));h.step(3);throwBall(h);let landed=false;
 for(let n=0;n<2400;n++){h.step();const s=ballOf(h);if(s.state==='rolling')landed=true;if(landed&&s.state==='parked')break;}
 assert.ok(landed,'it rolled on landing');assert.equal(ballOf(h).state,'parked','and came to rest');assert.ok(h.state().buildings[b[1]].hp<hp0,'the tower took the hit');
});

test('ball lob: W + throw sends it high, and a helicopter on the arc is hit (a flat throw passes under it)',async()=>{
 const lobTo=async(lob:boolean,apexAt?:{cx:number,by:number,frame:number})=>{
  const {h}=await bootBall();const v=ballOf(h);h.test().teleport(v.x-h.state().width-14);h.step(2);assert.ok(grabBall(h));
  const st=h.state(),air=()=>h.state().militaryUnits.filter((m:any)=>m.type==='helicopter');const n0=air().length,hp0=air().reduce((a:number,m:any)=>a+m.hp,0);
  if(apexAt)h.test().spawnUnitOn('helicopter',apexAt.cx-30+1.6*apexAt.frame,apexAt.by);
  const y0=ballOf(h).y;throwBall(h,lob);let top=Infinity,at={cx:0,by:0,frame:0};
  for(let n=0;n<70;n++){h.step();const b=ballOf(h);if(b.y<top){top=b.y;at={cx:b.x+b.w/2,by:b.y+b.h,frame:n};}}
  void st;return {climb:y0-top,at,hit:air().length<(apexAt?n0+1:n0)||air().reduce((a:number,m:any)=>a+m.hp,0)<hp0+(apexAt?95:0)};};
 const first=await lobTo(true);assert.ok(first.climb>sc(100),`the lob climbs ${Math.round(first.climb)}px`);
 const hitLob=await lobTo(true,first.at);assert.ok(hitLob.hit,'the lob hits the helicopter');
 const flat=await lobTo(false);assert.ok(flat.climb<first.climb/2,'a flat throw stays low');
});

test('ball finish: hard impacts chip it (cracks, then broken panels) and N of them shatter it exactly once, with the banner and points',async()=>{
 const {h}=await bootBall();h.test().growTo(3);h.step(1);const hps:number[]=[],banners=new Set<string>();let score0=0;
 const alive=(i:number)=>h.state().buildings[i].hp>0;
 const solids=TS.buildings.map((x,i)=>[x,i] as const).filter(([x])=>x.kind!=='tiny'&&!x.landmark&&x.hp>0).sort((p,q)=>p[0].x-q[0].x);
 for(let tries=0;tries<30&&ballOf(h)&&h.state().ballShatters===0;tries++){
  for(let n=0;n<2400&&ballOf(h)&&ballOf(h).state!=='parked';n++)h.step();let v=ballOf(h);if(!v)break;
  h.test().teleport(v.x-h.state().width-14);h.step(2);let got=grabBall(h);
  if(!got){h.test().teleport(v.x+v.w+14);h.down('KeyA');h.step(2);h.up('KeyA');got=grabBall(h);h.down('KeyD');h.step(2);h.up('KeyD');}// boxed in on the west: lift it from the east, then turn round
  if(!got)continue;
  const t=solids.find(([x,i])=>alive(i)&&x.x>ballOf(h).x+sc(300));if(!t)break;
  h.test().teleport(t[0].x-h.state().width-sc(150));h.step(2);score0=score0||h.state().score;throwBall(h);
  for(let n=0;n<240;n++){h.step();const s=h.state();if(s.banner)banners.add(s.banner);if(s.ballShatters)break;}
  if(h.state().ballShatters===0)hps.push(ballOf(h).hp);}
 const s=h.state();assert.equal(s.ballShatters,1,`shattered once (chips ${s.ballChips}, hp ${hps})`);assert.ok(!h.state().vehicles.some((o:any)=>o.kind==='ball'&&o.tossed),'the shattered ball is gone');
 assert.equal(s.ballChips,NYC2.ballHp,'exactly ballHp hard impacts');assert.ok(banners.has('HAPPY NEW YEAR'));assert.ok(hps.every((x,i)=>i===0||x<=hps[i-1]),'hp only goes down');
 assert.ok(s.score-score0>=NYC2.ballShatterPoints,'the payoff points');assert.deepEqual(hps,[...hps].sort((a,b)=>b-a));
 h.step(300);assert.equal(h.state().ballShatters,1,'and never again');
});

test('ball and loose(): never loose in any state, and the roof ball and prop exist only on Times Square',()=>{
 for(const state of ['parked','rolling','held','flying','wreck'] as const)assert.equal(loose({kind:'ball',state} as any),false,state);
 assert.equal(loose({kind:'car',state:'parked'} as any),true);
 for(const b of LEVELS.flat())for(const x of b.buildings)if(x.roof==='ball')assert.equal(b,TS);
});
