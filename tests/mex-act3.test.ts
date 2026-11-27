import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,MEX3,ROCK,SINKHOLE,ACID,MOVE as MV,RIVER as R,NYC3} from '../src/config.ts';
import {createBuildings} from '../src/rules.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Mexico City Act 3, levels 7-8 (MEX rework card 6): Ciudad Universitaria (auto seeps, the Periférico, volcanic rock) and Calzada de Tlalpan (the Tren Ligero, sinkholes, the field HQ and the eruption).
// Data checks, then real-loop checks of each new mechanic (the game's own update loop through tests/helpers/game-harness.ts).
const MEX=cityIndexOf('mex'),L=LEVELS[MEX],at=(n:string)=>L.findIndex(b=>b.name===n),CU=L[at('Ciudad Universitaria')],TL=L[at('Calzada de Tlalpan')],ACT3=[CU,TL],sc=(n:number)=>Math.round(n*C.cityScale);
const boot=async(block:number,x?:number)=>{const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});h.test().goto(block,x);h.step(2);return h;};
const slam=(h:any)=>{h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);};
const solidAt=(b:any,x:number)=>createBuildings(b.buildings.filter((q:any)=>q.kind!=='tiny')).some(q=>x+16>q.x&&x-16<q.x+q.w);
const noOverlap=(b:any)=>{const sol=b.buildings.filter((x:any)=>x.kind!=='tiny').sort((p:any,q:any)=>p.x-q.x);for(let i=1;i<sol.length;i++)assert.ok(sol[i].x>=sol[i-1].x+sol[i-1].w-1,`${b.name}: ${sol[i-1].label||sol[i-1].deco} overlaps ${sol[i].label||sol[i].deco}`);};
const GROUND=['soldier','tank','apc','artillery','emplacement','patrol','police'];

test('Ciudad Universitaria data: Insurgentes with its buses, the Periférico as a double-deck freeway with troops on it, UNAM, auto seeps, volcanic rock, ash fall, light military',()=>{
 assert.deepEqual([CU.name,CU.screens,CU.kind,CU.startStage,CU.cap,CU.tier,CU.volcano],['Ciudad Universitaria',8,'district',3,3,4,3]);assert.equal(CU.volcanoOn,undefined);assert.equal(CU.capLift,undefined);
 noOverlap(CU);const W=levelWidth(CU),F=CU.elevated!;
 assert.equal(CU.elevatedLook,'freeway');assert.equal(CU.elevatedDecks,2,'the elevated system supports two decks: the Periférico has both');assert.ok(F[0]>0&&F[1]<W&&F[1]-F[0]>sc(1200));assert.equal(CU.approach,sc(MEX3.cu.approach));
 assert.ok(!CU.buildings.some(b=>b.kind!=='tiny'&&!b.landmark&&b.x+b.w>F[0]-CU.approach!&&b.x<F[1]+CU.approach!),'the freeway and its ramps are clear of buildings');
 assert.ok(CU.deckUnits!.length>=3&&CU.deckUnits!.every(([,x])=>x>F[0]&&x<F[1]),'troops on the deck');
 assert.ok(CU.buses!.length>=3&&CU.buses!.every(x=>x<F[0]),"Insurgentes' Metrobús lane runs down the avenue before the freeway");
 const lib=CU.buildings.find(b=>b.label==='BIBLIOTECA CENTRAL')!,stad=CU.buildings.find(b=>b.label==='ESTADIO OLÍMPICO')!;
 assert.ok(lib&&lib.landmark&&(lib.shape==='tower')&&lib.h>=600,'a tall climbable mosaic tower');assert.ok(stad&&stad.landmark&&stad.shape==='dome');assert.ok(lib.x>F[1]&&stad.x>lib.x,'UNAM is past the freeway: library, then stadium');
 // Seeps: auto, two runs (Insurgentes, the lava field), all on open street, in x order.
 assert.equal(CU.seepsAuto,true);const n=MEX3.cu.run[0].n+MEX3.cu.run[1].n;assert.equal(CU.seeps!.length,n,'two runs of storm drains');
 for(let i=1;i<CU.seeps!.length;i++)assert.ok(CU.seeps![i]>CU.seeps![i-1],'listed in x order, so they go off one after another along the street');
 for(const x of CU.seeps!)assert.ok(!solidAt(CU,x),`seep ${x} is on open street`);
 assert.ok(CU.seeps!.filter(x=>x<sc(MEX3.cu.run[0].x1+50)).length>=MEX3.cu.run[0].n,'the first run is on Insurgentes');assert.ok(CU.seeps!.filter(x=>x>sc(MEX3.cu.run[1].x0-50)).length>=MEX3.cu.run[1].n,'the second on the Pedregal');
 // Rock: inside the level, ordered, disjoint, under UNAM.
 assert.ok(CU.rock!.length>=2);for(const [a,z] of CU.rock!)assert.ok(a>=0&&z<=W&&z>a);for(let i=1;i<CU.rock!.length;i++)assert.ok(CU.rock![i][0]>=CU.rock![i-1][1]);
 assert.ok(CU.rock!.some(([a,z])=>lib.x>=a&&lib.x<z)&&CU.rock!.some(([a,z])=>stad.x>=a&&stad.x<z),'the Pedregal runs under UNAM');
 // Light military: no armour on the ground, and fewer troops than Tlalpan.
 const cu=[...CU.units!,...CU.deckUnits!].filter(([t])=>GROUND.includes(t)),tl=TL.units!.filter(([t])=>GROUND.includes(t));
 assert.ok(!CU.units!.some(([t])=>t==='tank'||t==='artillery'||t==='emplacement'),'no tanks, artillery or emplacements on the busiest level');assert.ok(cu.length<tl.length,`lighter than Tlalpan (${cu.length} < ${tl.length})`);assert.equal(CU.garrison,undefined);
});

test('Tlalpan data: a stronghold with the field HQ, the Tren Ligero beside the road, three sinkholes (one under the HQ\'s walls), the full military, troops past the HQ, the eruption trigger',()=>{
 assert.deepEqual([TL.name,TL.screens,TL.kind,TL.startStage,TL.cap,TL.tier,TL.volcano,TL.volcanoOn],['Calzada de Tlalpan',8,'stronghold',3,3,4,3,'target']);noOverlap(TL);
 const W=levelWidth(TL),T=TL.target!;assert.equal(T.label,'FIELD HQ');assert.equal(T.art,'command');assert.ok(T.x>W*.55&&W-T.x>sc(1400),'room east of the HQ for the walk to the exit');
 // The Tren: a long open stretch with nothing solid on it, west of the HQ.
 const [t0,t1]=TL.tren!;assert.ok(t1-t0>sc(1800)&&t1<T.x-sc(1000));assert.ok(!TL.buildings.some(b=>b.kind!=='tiny'&&b.x+b.w>t0&&b.x<t1),'the Tren runs on an open right of way');assert.equal(TL.subway,undefined,'a surface line, no subway under the street');
 // Sinkholes: ordered, disjoint, marked in the road, on neither the Tren line nor the target; one under the target's walls (barricades) and one under a convoy.
 const holes=TL.sinkholes!,conv0=holes[0];assert.equal(holes.length,3);for(let i=0;i<holes.length;i++){const [a,z]=holes[i];assert.ok(z-a>=sc(200)&&z-a<=sc(700),`a stretch of street (${z-a}px)`);if(i)assert.ok(a>=holes[i-1][1]);assert.ok(a>=t1||z<=t0,'not under the train line');assert.ok(z<=T.x-sc(60)||a>=T.x+sc(60),'not under the HQ itself');}
 const walls=TL.buildings.filter(b=>b.label==='BARRIER'),inHole=([a,z]:number[])=>walls.filter(b=>b.x+b.w/2>=a&&b.x+b.w/2<z).length,under=holes.find(h=>inHole(h)>=2)!;assert.ok(under,"a sinkhole under at least two of the target's walls");assert.ok(under[0]>conv0[1]);
 const conv=holes[0];assert.ok(TL.units!.filter(([,x])=>x>=conv[0]&&x<conv[1]).length>=3,'a convoy waits on a hollow');assert.ok(TL.cars!.filter(x=>x>=conv[0]&&x<conv[1]).length>=3,'and cars');
 assert.ok(TL.buildings.some(b=>b.kind!=='tiny'&&b.x+b.w/2>=conv[0]&&b.x+b.w/2<conv[1]),'a building stands on it');
 // Military: armour, artillery, emplacement, helicopters, a garrison; heavier than level 7. A few troops between the HQ and the exit.
 const ty=TL.units!.map(([t])=>t);for(const k of ['tank','apc','soldier','artillery','emplacement','helicopter'])assert.ok(ty.includes(k as any),`Tlalpan has ${k}`);assert.ok(TL.garrison!.length>=6&&TL.garrison!.length<=8,'a garrison round the HQ, small enough that martial law (tier +1, a smaller cap) does not leave the field over the cap');
 assert.ok(TL.units!.filter(([,x])=>x>T.x+sc(250)&&x<W-sc(200)).length>=3,'troops between the target and the exit for the first bomb Eruption');
 assert.ok(TL.units!.filter(([t])=>GROUND.includes(t)).length>CU.units!.length,'heavier than Ciudad Universitaria');
 assert.equal(TL.seeps,undefined);assert.equal(TL.seepsAuto,undefined);assert.equal(TL.rock,undefined);
});

test('opt-in: no other level sets seepsAuto, rock, sinkholes or tren, and none of the other levels\' data moved',()=>{
 for(const b of LEVELS.flat().filter(x=>!ACT3.includes(x)))for(const k of ['seepsAuto','rock','sinkholes','tren'])assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
 assert.deepEqual(ACT3.map(b=>[b.seepsAuto!==undefined,b.rock!==undefined,b.sinkholes!==undefined,b.tren!==undefined]),[[true,true,false,false],[false,false,true,true]]);
 for(const id of ['mex-classic','nyc','nyc-classic','sfo'])for(const b of LEVELS[cityIndexOf(id)])assert.ok(!b.buildings.some(x=>x.label==='BIBLIOTECA CENTRAL'),`${id} has no Act 3 landmark`);
 // Every other Mexico City level that has seeps keeps them manual.
 for(const b of L.filter(x=>!ACT3.includes(x)&&x.seeps))assert.equal(b.seepsAuto,undefined);
 assert.ok(CITIES[MEX].kaiju==='Tlézcatl');
});

test('config: the Act 3 blocks are sane',()=>{
 assert.ok(ROCK.poolLife>1&&ROCK.spread>1&&ROCK.spread<2,'longer-lived and a little wider');
 assert.ok(SINKHOLE.depth>0&&SINKHOLE.depth<C.playerHeight*1.4,"shallower than a Stage 2 kaiju is tall (about waist-deep at Stage 3 and up), so he is never trapped");assert.ok(SINKHOLE.reach>0&&SINKHOLE.damage>0);
 assert.ok(MEX3.tren.every>0&&MEX3.tren.speed>0&&MEX3.tren.h>0&&MEX3.cu.freeway[1]>MEX3.cu.freeway[0]);assert.ok(R.trainWrecks>=1);assert.ok(ACID.auto.every>0&&ACID.auto.stagger>0&&ACID.auto.warn>0,'ACID.auto is in');
 for(const [a,z] of MEX3.cu.rock)assert.ok(z>a);
});

test('real loop: the seeps of Ciudad Universitaria burst by themselves, after a warning, one after another; Merced\'s do not',async()=>{
 const h=await boot(at('Ciudad Universitaria'));
 try{
  const s0=h.state();assert.equal(s0.seepList.length,CU.seeps!.length);assert.ok(s0.seepList.every((v:any)=>v.auto&&v.state==='idle'),'armed and quiet at the start');
  const first=new Map<number,number>(),warn=new Map<number,number>();
  for(let n=0;n<60*18;n++){h.step(1);h.state().seepList.forEach((v:any,i:number)=>{if(v.state==='warn'&&!warn.has(i))warn.set(i,n);if(v.state==='burst'&&!first.has(i))first.set(i,n);});}
  assert.ok(first.size>=8,`most of the drains burst on their own, no slam (${first.size})`);assert.ok(h.state().seepBursts>=8);
  for(const [i,n] of first){assert.ok(warn.has(i)&&warn.get(i)!<n,`seep ${i} warned before it burst`);assert.ok(Math.abs((n-warn.get(i)!)/60-ACID.auto.warn)<.25,`about ACID.auto.warn s of warning (${(n-warn.get(i)!)/60})`);}
  const order=[...first].sort((p,q)=>p[1]-q[1]).map(([i])=>i).slice(0,6);assert.deepEqual(order,[0,1,2,3,4,5],'in the list\'s order: a run travelling along the street');
  const gap=(first.get(1)!-first.get(0)!)/60;assert.ok(Math.abs(gap-ACID.auto.stagger)<.25,`staggered by ACID.auto.stagger (${gap}s)`);
  assert.ok(Math.abs(first.get(0)!/60-(ACID.auto.first+ACID.auto.warn))<.4,'the first goes off at ACID.auto.first plus its warning');
  assert.ok(h.state().seepList.some((v:any)=>v.state==='burst'||v.state==='idle'&&v.puddle>=0),'and the cycle goes on');
 }finally{h.release();h.cleanup();}
 const m=await boot(at('La Merced and Tepito'));
 try{for(let n=0;n<60*14;n++)m.step(1);assert.equal(m.state().seepBursts,0,'Merced\'s drains wait for a slam');assert.ok(m.state().seepList.every((v:any)=>!v.auto&&v.state==='idle'));
 }finally{m.release();m.cleanup();}
});

test('real loop: an auto seep still bursts on a slam, and its burst is harder and wider than a Merced one',async()=>{
 const h=await boot(at('Ciudad Universitaria'));
 try{const s=h.state(),v=s.seepList[3];assert.ok(ACID.auto.damage>1&&ACID.auto.radius>1);
  h.test().shield(300);h.test().teleport(v.x-s.width/2);h.step(2);assert.equal(h.state().seepList[3].state,'idle');slam(h);
  assert.ok(h.state().seepBursts>=1,'a slam bursts it early');
 }finally{h.release();h.cleanup();}
});

test('real loop: lava pools last longer, and spread wider, on volcanic rock; elsewhere in the same level they do not',async()=>{
 const poolsAfterSlam=async(x:(s:any)=>number)=>{const h=await boot(at('Ciudad Universitaria'));try{const s=h.state();h.test().shield(300);h.test().teleport(x(s));h.step(3);slam(h);return h.state().mex3.pools as {x:number,w:number,life:number,max:number,rock:boolean}[];}finally{h.release();h.cleanup();}};
 const rock=await poolsAfterSlam(s=>(s.mex3.rock[1][0]+s.mex3.rock[1][1])/2-s.width/2),plain=await poolsAfterSlam(()=>sc(300));
 assert.ok(rock.length>=1&&plain.length>=1,`the Magma Dive leaves pools (${rock.length} on rock, ${plain.length} off it)`);
 assert.ok(rock.every(p=>p.rock),'every pool on the rock is marked');assert.ok(plain.every(p=>!p.rock));
 const r=Math.max(...rock.map(p=>p.max)),p0=Math.max(...plain.map(p=>p.max));assert.ok(Math.abs(p0-MV.lavaPoolSeconds)<1e-6,`ordinary pools last MOVE.lavaPoolSeconds (${p0})`);assert.ok(Math.abs(r-MV.lavaPoolSeconds*ROCK.poolLife)<1e-6,`on rock ${ROCK.poolLife} x longer (${r})`);
 assert.ok(Math.max(...rock.map(p=>p.w))>Math.max(...plain.map(p=>p.w))*ROCK.spread*.95,'and wider');
 // Something that outlasts the ordinary pool is still burning: step past MOVE.lavaPoolSeconds and the rock pool is still there.
 const h=await boot(at('Ciudad Universitaria'));
 try{const s=h.state();h.test().shield(300);h.test().teleport((s.mex3.rock[1][0]+s.mex3.rock[1][1])/2-s.width/2);h.step(3);slam(h);const n0=h.state().mex3.pools.length;assert.ok(n0>=1);
  for(let n=0;n<Math.round(MV.lavaPoolSeconds*60)+10;n++)h.step(1);
  assert.ok(h.state().mex3.pools.some((p:any)=>p.rock),'a rock pool is still burning after an ordinary one has gone out');
 }finally{h.release();h.cleanup();}
});

test('real loop: a Magma Dive on a sinkhole opens it; troops, cars and buildings go in; the kaiju drops in and walks out',async()=>{
 const h=await boot(at('Calzada de Tlalpan'));
 try{
  const s0=h.state(),[a,z]=TL.sinkholes![0],mx=(a+z)/2;assert.ok(s0.mex3.sinkholes.every((q:any)=>!q.open));assert.equal(s0.mex3.pits,0,'the road is whole until it is hit');
  h.test().shield(400);h.test().teleport(mx-s0.width/2-200);h.step(2);
  // Everything stationed on the hollow, plus a soldier and a car we know are there.
  h.test().spawnUnit('soldier',mx);h.test().spawnVehicle('car',mx-30);h.step(2);
  const solids=s0.buildings.filter((b:any)=>b.kind!=='tiny'&&b.x+b.w/2>=a&&b.x+b.w/2<z).length,troops=()=>h.state().militaryUnits.filter((u:any)=>u.hp>0&&u.x+30>a&&u.x<z).length;
  const t0=troops(),inHole=h.state().unitList.filter((u:any)=>u.hp>0&&u.x+30>a&&u.x<z).map((u:any)=>[u.id,u.hp]) as [number,number][],cars=h.state().vehicles.filter((v:any)=>v.x>=a&&v.x<z&&v.state!=='flat').length;assert.ok(solids>=1&&t0>=1&&cars>=1,`${solids} buildings, ${t0} troops, ${cars} cars on it`);
  // A pound (a light ground strike) does nothing; a Magma Dive does.
  h.test().teleport(mx-s0.width/2);h.step(2);h.tap('KeyJ');h.step(30);assert.equal(h.state().mex3.sinkholeDrops,0,'a light strike does not open it');
  slam(h);const s1=h.state();assert.equal(s1.mex3.sinkholeDrops,1,'the heavy landing opened it');assert.ok(s1.mex3.sinkholes[0].open&&s1.mex3.pits>=1);assert.equal(s1.mex3.sinkholeKaiju,1,'the kaiju was standing on it');
  for(let n=0;n<240;n++)h.step(1);
  const s2=h.state();assert.equal(s2.yard.drops,0,'it is not the rail yard');
  // Buildings that stood on it are gone (sunk and collapsed); the troops fell in and were hurt; the car went in.
  const left=s2.buildings.filter((b:any)=>b.kind!=='tiny'&&b.hp>0&&b.x+b.w/2>=a&&b.x+b.w/2<z).length;assert.ok(left<solids,`buildings on the hollow went down (${solids} -> ${left})`);
  assert.ok(s2.yard.buildings>=1,'they went down through the yard code');assert.ok(inHole.length>=1&&inHole.every(([id,hp0])=>{const u=s2.unitList.find((q:any)=>q.id===id);return !u||u.hp<hp0;}),'every trooper that stood on it was hurt or killed by the fall');
  assert.ok(s2.pits.some((p:any)=>p.x0<=a+1&&p.x1>=z-1&&p.floor>C.ground+SINKHOLE.depth*.5),'a real pit, SINKHOLE.depth deep');
  // The kaiju is never trapped: walk east out of the hole and be back on the street.
  h.down('KeyD');for(let n=0;n<60*10&&h.state().x<z+40;n++)h.step(1);h.up('KeyD');h.step(30);
  const s3=h.state();assert.ok(s3.x>=z-s3.width,`he walked out the far side (x=${s3.x}, edge ${z})`);assert.ok(s3.grounded);assert.ok(s3.hp>0);
  // It opens once: a second slam on the same hole opens nothing more.
  h.test().teleport(mx-s3.width/2);h.step(2);slam(h);assert.equal(h.state().mex3.sinkholeDrops,1);
 }finally{h.release();h.cleanup();}
});

test('real loop: a sinkhole opens under a toppling tower and under a thrown building, and a level without sinkholes never opens one',async()=>{
 const h=await boot(at('Calzada de Tlalpan'));
 try{
  const s0=h.state(),[a,z]=TL.sinkholes![1];h.test().shield(400);
  // The hole is under the car park; a landing within SINKHOLE.reach of its edge counts.
  const tower=s0.buildings.map((b:any,i:number)=>({b,i})).filter(({b}:any)=>b.kind!=='tiny'&&b.h>=500&&!b.landmark&&b.x+b.w<=a&&b.x>=TL.sinkholes![0][1]-1).sort((p:any,q:any)=>q.b.x-p.b.x)[0];
  assert.ok(tower,'a tower stands between the convoy\'s hollow and the car park');h.test().teleport(tower.b.x-s0.width-60);h.step(2);h.test().smash(tower.i,1);for(let n=0;n<60*5;n++)h.step(1);
  assert.ok(h.state().buildings[tower.i].hp<=0,'the tower came down');assert.ok(h.state().mex3.sinkholes[1].open,'falling across the hollow, it opened it');
  h.test().teleport((a+z)/2-s0.width/2);h.step(2);slam(h);assert.ok(h.state().mex3.sinkholes[1].open,'and a dive on it does');
 }finally{h.release();h.cleanup();}
 const m=await boot(at('Paseo de la Reforma'));
 try{m.test().shield(400);slam(m);assert.equal(m.state().mex3.sinkholes.length,0);assert.equal(m.state().mex3.sinkholeDrops,0);assert.equal(m.state().mex3.pits,0,'no pit anywhere in an ordinary level');
 }finally{m.release();m.cleanup();}
});

test('real loop: the hole under the target\'s walls takes the barricades down; the HQ stays up',async()=>{
 const h=await boot(at('Calzada de Tlalpan'));
 try{
  const s0=h.state(),walls=TL.sinkholes!.find(([a,z])=>TL.buildings.some(b=>b.label==='BARRIER'&&b.x+b.w/2>=a&&b.x+b.w/2<z))!,idx=TL.sinkholes!.indexOf(walls),[a,z]=walls;
  const bars=()=>h.state().buildings.filter((b:any)=>b.hp>0&&b.x+b.w/2>=a&&b.x+b.w/2<z&&b.kind!=='tiny').length,n0=bars();assert.ok(n0>=2);
  h.test().shield(400);h.test().teleport((a+z)/2-s0.width/2);h.step(2);slam(h);assert.ok(h.state().mex3.sinkholes[idx].open);for(let n=0;n<60*5;n++)h.step(1);
  assert.ok(bars()<n0,`the walls went down (${n0} -> ${bars()})`);const o=h.state().objective;assert.ok(o&&!o.shattered&&o.hp>0,'the field HQ itself is untouched');
 }finally{h.release();h.cleanup();}
});

test('real loop: the Tren Ligero runs on its surface line, can be derailed, and a Stage 3 kaiju snatches a train with no pit',async()=>{
 const h=await boot(at('Calzada de Tlalpan'));
 try{
  h.test().shield(400);const [t0,t1]=TL.tren!;assert.equal(h.state().mex3.tren.length,0,'no train at the start');
  h.test().teleport((t0+t1)/2);let tr=null as any;for(let n=0;n<60*12&&!tr;n++){h.step(1);tr=h.state().mex3.tren[0]??null;}
  assert.ok(tr,'a train came by itself');assert.ok(tr.x<t0||tr.x+R.trainLength>t1||tr.x>=t0-R.trainLength,'it enters at an end of the line');
  const x1=h.state().mex3.tren[0].x;h.step(30);const x2=h.state().mex3.tren[0]?.x??x1;assert.ok(Math.abs(x2-x1)>MEX3.tren.speed*.3,`it moves (${Math.abs(x2-x1)}px in half a second)`);assert.ok(Math.abs(x2-x1)<MEX3.tren.speed,'at the Tren\'s own speed, not the subway\'s');
  assert.equal(h.state().pits.length,0,'and there is no pit anywhere');
  // It is attackable at street level: enough damage derails it into a burning wreck and counts towards closing the line.
  assert.ok(h.test().hitTrain(0,R.trainHP*2));h.step(2);assert.ok(h.state().mex3.tren[0].crashed);assert.equal(h.state().mex3.trenWrecked,1);
  // The wreck stays on the track, and is still in the way of the next train (a pile-up), not a hole in the world.
  for(let n=0;n<60*14;n++)h.step(1);assert.ok(h.state().mex3.tren.filter((q:any)=>q.crashed).length>=1);
 }finally{h.release();h.cleanup();}
 // Grab: a Stage 3 kaiju standing on the line takes a train as it arrives.
 const g=await boot(at('Calzada de Tlalpan'));
 try{
  g.test().shield(400);const [t0,t1]=TL.tren!;g.test().teleport((t0+t1)/2);let got=false;
  for(let n=0;n<60*20&&!got;n++){g.step(1);const st=g.state(),tr=st.mex3.tren.find((q:any)=>!q.crashed);if(!tr)continue;
   const kx=st.x+st.width/2,ahead=tr.dir>0?tr.x+R.trainLength:tr.x;if(Math.abs(ahead-kx)<st.width*.9||(tr.x<kx&&tr.x+R.trainLength>kx)){g.tap('KeyH');g.step(3);got=g.state().held==='train';}}
  assert.ok(got,'a Stage 3 kaiju snatched a Tren Ligero train off the surface line (no pit needed)');assert.equal(g.state().mex3.tren.filter((q:any)=>!q.crashed).length,0,'it is out of the list: it is in his hands');
 }finally{g.release();g.cleanup();}
});

test('real loop: no Tren, no sinkholes and no trains anywhere else in Mexico City, and Hudson Yards\' deck still comes down as before',async()=>{
 const h=await boot(at('Paseo de la Reforma'));
 try{for(let n=0;n<60*14;n++)h.step(1);assert.equal(h.state().mex3.tren.length,0);assert.equal(h.state().trains,0);
 }finally{h.release();h.cleanup();}
 const y=await bootCampaign(.75,{city:'nyc',kaiju:'Tlézcatl'});
 try{const ni=cityIndexOf('nyc'),hi=LEVELS[ni].findIndex(b=>b.name==='Hudson Yards');y.test().goto(hi);y.step(2);const s=y.state();assert.ok(s.spans.length===6);
  y.test().shield(400);y.test().smashSpan(2);for(let n=0;n<60*5;n++)y.step(1);const s2=y.state();assert.equal(s2.yard.drops,1,'the rail-yard deck still drops a span');assert.ok(s2.yard.buildings>=1,'and the towers on it still sink');assert.equal(s2.mex3.sinkholeDrops,0);
 }finally{y.release();y.cleanup();}
});

test('real loop: destroying the field HQ erupts Popocatépetl (state 4) once, and Eruption then drops bombs',async()=>{
 const h=await boot(at('Calzada de Tlalpan'));
 try{
  h.test().shield(600);h.step(5);assert.equal(h.state().volcano.state,3,'ash fall until the HQ falls');assert.equal(h.state().volcano.ash,true);assert.equal(h.state().volcano.blown,0);
  h.test().hitTarget(1e6);for(let n=0;n<30;n++)h.step(1);
  const v=h.state().volcano;assert.equal(v.state,4,'the HQ fell: it erupts');assert.equal(v.blown,1);assert.ok(v.mood.smog&&v.ash);
  for(let n=0;n<240;n++)h.step(1);assert.equal(h.state().volcano.blown,1,'once');assert.equal(h.state().volcano.state,4);
  // Troops stand between the HQ and the exit for the first bomb Eruption.
  const T=h.state().objective!.x,left=h.state().militaryUnits.filter((u:any)=>u.hp>0&&u.x>T+sc(200));assert.ok(left.length>=1||TL.units!.filter(([,x])=>x>T+sc(250)).length>=3,'troops past the HQ');
  h.test().fillUltimate();for(let n=0;n<120&&!h.state().canAct;n++)h.step();h.tap('KeyU');for(let n=0;n<240&&!h.state().erupting;n++)h.step();for(let n=0;n<200;n++)h.step(1);
  assert.ok(h.state().volcano.dropped>=1||h.state().volcano.queued>=1||h.state().volcano.bombs>=1,'Eruption at state 4 calls bombs');
 }finally{h.release();h.cleanup();}
 const c=await boot(at('Ciudad Universitaria'));
 try{c.step(5);assert.equal(c.state().volcano.state,3);c.test().hitTarget(1e6);for(let n=0;n<30;n++)c.step(1);assert.equal(c.state().volcano.state,3,'Ciudad Universitaria has no eruption trigger');
 }finally{c.release();c.cleanup();}
});
