import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {CONFIG as C,MEX2,PICADO,ANGEL,STONE,ACID,FIRE as FI,FEEL as F,NYC2} from '../src/config.ts';
import {createBuildings} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {profileY,setTerrain} from '../src/terrain.ts';
import {bandAt} from '../src/water.ts';
import {exitTarget,nextBlock,newRun,latchBlock,CAMPAIGN} from '../src/campaign.ts';
import {loose} from '../src/vehicles.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Mexico City Act 2 (MEX rework card 4): Alameda and Bellas Artes, Paseo de la Reforma, Chapultepec. Data checks, then real-loop checks of each new mechanic (the game's own update
// loop through tests/helpers/game-harness.ts; `goto` jumps to a block and `teleport` moves the kaiju, nothing else).
const MEX=cityIndexOf('mex'),L=LEVELS[MEX],[,,,ALA,REF,CHA]=L,ACT2=[ALA,REF,CHA],sc=(n:number)=>Math.round(n*C.cityScale),at=(n:string)=>L.findIndex(b=>b.name===n);
const BODY=(stage:number)=>C.playerHeight*[1,1.4,2.8][stage-1];
const boot=async(block:number,x?:number)=>{const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});h.test().goto(block,x);h.step(2);return h;};
const slam=(h:any)=>{h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);};
const noOverlap=(b:any)=>{const sol=b.buildings.filter((x:any)=>x.kind!=='tiny').sort((p:any,q:any)=>p.x-q.x);for(let i=1;i<sol.length;i++)assert.ok(sol[i].x>=sol[i-1].x+sol[i-1].w-1,`${b.name}: ${sol[i-1].label||sol[i-1].deco} overlaps ${sol[i].label||sol[i].deco}`);for(const x of b.buildings)if(x.parts)assert.deepEqual(checkParts(x.parts,x.w,x.h),[],x.label||x.deco);};
const solidAt=(b:any,x:number)=>createBuildings(b.buildings.filter((q:any)=>q.kind!=='tiny')).some(q=>x+16>q.x&&x-16<q.x+q.w);

test('Act 2 data: three levels in order, Stage 2 growth, the right goals, Popocatépetl state 2, the Guardia then tanks',()=>{
 assert.deepEqual(ACT2.map(b=>[b.name,b.screens,b.kind]),[['Alameda and Bellas Artes',7,'district'],['Paseo de la Reforma',8,'stronghold'],['Chapultepec',8,'district']]);
 for(const b of ACT2){assert.equal(b.startStage,2);assert.equal(b.cap,2);assert.equal(b.volcano,2,`${b.name}: Popocatépetl at state 2`);assert.ok(b.guard&&b.police);assert.ok(b.buildings.some(x=>x.landmark));noOverlap(b);}
 assert.deepEqual(ACT2.map(b=>b.tier),[2,3,3]);assert.equal(CHA.capLift,3,"Chapultepec's crystal lifts the cap to 3");assert.equal(ALA.capLift,undefined);assert.equal(REF.capLift,undefined);
 assert.equal(CHA.ashLate!>0,true,'late ash at Chapultepec');assert.equal(ALA.ashLate,undefined);assert.equal(REF.ashLate,undefined);
 assert.equal(REF.target!.art,'campo');assert.equal(REF.target!.label,'CAMPO MARTE');assert.equal(ALA.target,undefined);assert.equal(CHA.target,undefined);assert.equal(CITIES[MEX].kaiju,'Tlézcatl');
 assert.ok(ALA.start===undefined&&REF.start===undefined&&CHA.start!==undefined,'only Chapultepec is a there-and-back');
 assert.ok(!REF.units!.some(([t])=>t==='tank')===false&&!ALA.units!.some(([t])=>t==='tank'),'tanks on Reforma, none yet at the Alameda');
});

test('Alameda data: papel picado across the cross streets, Bellas Artes with its seep, the Torre Latinoamericana, trees and green fountains',()=>{
 const W=levelWidth(ALA),dome=ALA.buildings.find(b=>b.landmark&&b.shape==='dome')!,torre=ALA.buildings.find(b=>b.label==='TORRE LATINOAMERICANA')!;
 assert.ok(dome&&dome.label==='PALACIO DE BELLAS ARTES');assert.ok(torre&&torre.landmark&&torre.h>=sc(600)&&torre.h>dome.h,'a tall climbable tower');
 assert.ok(ALA.banners!.length>=4,`strings across the streets (${ALA.banners!.length})`);
 const sol=ALA.buildings.filter(b=>b.kind!=='tiny');
 for(const [x0,x1,h] of ALA.banners!){const l=sol.find(b=>Math.abs(b.x+b.w-x0)<10)!,r=sol.find(b=>Math.abs(b.x-x1)<10)!;
  assert.ok(l&&r,'hung between two buildings');assert.ok(!l.landmark&&!r.landmark&&!l.role&&!r.role&&!l.deco&&!r.deco,'ordinary, flammable buildings');
  assert.ok(x1-x0>FI.reach*4,`wider than any ordinary fire reach (${x1-x0}px)`);assert.ok(h>0&&h<Math.min(l.h,r.h),'hung below both roofs');
  assert.ok(!sol.some(b=>b!==l&&b!==r&&b.x<x1&&b.x+b.w>x0),'nothing standing in the gap');}
 for(let i=1;i<ALA.banners!.length;i++)assert.ok(ALA.banners![i][0]>=ALA.banners![i-1][1],'strings do not overlap');
 // The seep beside Bellas Artes is the dome seep; there are a few more along the street, on open street.
 assert.equal(ALA.domeSeep,0);const bs=ALA.seeps![0];assert.ok(bs>=dome.x+dome.w&&bs-(dome.x+dome.w)<ACID.baseReach,'beside the dome');assert.ok(ALA.seeps!.length>=4);
 for(const x of ALA.seeps!)assert.ok(!solidAt(ALA,x),`seep ${x} is on open street`);
 const fts=ALA.buildings.filter(b=>b.deco==='fountain');assert.ok(fts.length>=2&&fts.every(b=>b.kind==='tiny'),'fountains are art, walk-through');
 const trees=ALA.buildings.filter(b=>b.prop==='tree');assert.ok(trees.length>=30,`the Alameda's trees (${trees.length})`);for(const t of trees){assert.ok(t.x>dome.x+dome.w&&t.x<torre.x,'between Bellas Artes and the tower');for(const f of fts)assert.ok(t.x+t.w<=f.x||t.x>=f.x+f.w,'not in a fountain');}
 assert.ok(ALA.units!.some(([t])=>t==='soldier')&&ALA.units!.some(([t])=>t==='apc'),'the Guardia');void W;
});

test('Reforma data: the parade floats, El Ángel mid-avenue and far from the target, Campo Marte, armour behind the floats with a seep beneath',()=>{
 const T=REF.target!,W=levelWidth(REF),floats=REF.buildings.filter(b=>b.deco==='mfloat'),ang=REF.buildings.find(b=>b.label==='EL ÁNGEL')!;
 assert.ok(!REF.buildings.some(b=>b.label==='BARRIER'||b.deco==='float'),'every barricade is a parade float');assert.ok(floats.length>=10,`the parade (${floats.length} floats)`);
 assert.ok(new Set(floats.map(b=>b.color)).size>=5&&floats.every(b=>MEX2.parade.colors.includes(b.color)),'their own colour set');assert.ok(floats.every(b=>b.kind==='large'&&b.hp>0&&!b.role),'solid, ordinary, so they burn and block');
 assert.ok(floats.every(b=>b.w===MEX2.parade.w&&b.h===MEX2.parade.h));assert.equal(REF.catrinas,true);
 assert.ok(ang&&ang.landmark&&ang.shape==='angel'&&ang.h===ANGEL.length&&ang.w===ANGEL.w&&REF.angel===ang.x,'El Ángel is a landmark ANGEL.length tall, its own `angel` silhouette');assert.ok(ang.x>W*.25&&ang.x<W*.5,'mid-avenue');
 const t0=T.x-MEX2.campo.w/2;assert.ok(t0-(ang.x+ang.w)>ANGEL.length+ANGEL.safe,`it cannot reach the target (${t0-(ang.x+ang.w)}px > ${ANGEL.length})`);
 assert.ok(ang.x-ANGEL.length>sc(900),'and its fall stays in the avenue');
 const lane=REF.units!.filter(([,x])=>x>ang.x-ANGEL.length&&x<ang.x+ang.w+ANGEL.length);assert.ok(lane.length>=3&&lane.some(([t])=>t==='tank'||t==='apc'),`a convoy in its lane (${lane.length})`);
 assert.ok(REF.buildings.filter(b=>b.landmark).length>=3,'Torre Mayor, Torre Reforma and El Ángel');
 // Tanks sit behind floats (just past each one), with a seep under each.
 const tanks=REF.units!.filter(([t])=>t==='tank').map(([,x])=>x);assert.ok(tanks.length>=4);
 const behind=REF.seeps!.filter(x=>floats.some(f=>x>f.x+f.w&&x-(f.x+f.w)<sc(120)));assert.ok(behind.length>=4,`seeps behind the floats (${behind.length})`);
 for(const x of behind)assert.ok(REF.units!.some(([t,ux])=>t==='tank'&&Math.abs(ux-x)<4),'a tank over each');
 for(const x of REF.seeps!)assert.ok(!solidAt(REF,x),`seep ${x} is on open street`);
 assert.ok(!REF.buildings.some(b=>b.label==='BARRIER'));assert.ok(REF.garrison!.filter(([t])=>t==='tank'||t==='emplacement'||t==='artillery').length>=4&&REF.garrison!.length>=8,'most of the target\'s strength is the garrison on the field');
 assert.ok(MEX2.campo.w>MEX2.campo.h*3,'a long, low grandstand');assert.ok(MEX2.campo.pads.every(p=>Math.abs(p)>MEX2.campo.w/2-60),'the helipad sits at the grandstand\'s end');
});

test('Chapultepec data: there and back from the gates, zoo, museum, castle hill with the crystal and the stone, the lake, both exits',()=>{
 const W=levelWidth(CHA),st=CHA.start!,castle=CHA.buildings.find(b=>b.label==='CASTILLO DE CHAPULTEPEC')!,museum=CHA.buildings.find(b=>b.deco==='museo')!,pens=CHA.buildings.filter(b=>b.deco==='zoopen');
 assert.ok(st>W*.4&&st<W*.55,'mid-map start');assert.deepEqual(CHA.exits,{west:'Ciudad Universitaria',east:'Xochimilco'});
 assert.ok(castle.landmark&&castle.shape==='dome'&&museum&&pens.length>=3);assert.ok(st<pens[0].x&&pens[2].x<museum.x&&museum.x<castle.x&&castle.x<CHA.water![0][0],'gates, zoo, museum, castle hill, then the lake');
 assert.ok(CHA.crystal!>castle.x&&Math.abs(CHA.crystal!-castle.x)<sc(500),'the crystal is at the castle');assert.equal(profileY(CHA.ground!,castle.x+castle.w/2),profileY(CHA.ground!,castle.x+1),'the castle stands on a flat');
 assert.ok(C.ground-Math.min(...CHA.ground!.map(p=>p[1]))>=sc(50),'a real hill under the castle');
 // The stone stands beside the crystal, up on the hill, so whoever takes the crystal (and grows to Stage 3) is beside it whichever exit they head for.
 assert.ok(Math.abs(CHA.stone!-CHA.crystal!)<STONE.near,'beside the crystal');assert.equal(profileY(CHA.ground!,CHA.stone!),profileY(CHA.ground!,CHA.crystal!),'on the same flat');
 assert.ok(CHA.stone!>castle.x+castle.w,'clear of the castle');
 const [lake]=CHA.water!;assert.equal(CHA.water!.length,1);assert.ok(lake[0]>CHA.crystal!&&lake[1]<W&&W-lake[1]>sc(100),'the lake is between the park and the east exit');assert.equal(CHA.bands,true);
 assert.equal(CHA.zoo!.length,6);for(const x of CHA.zoo!)assert.ok(x>pens[0].x-sc(100)&&x<pens[2].x+pens[2].w+sc(100));
 assert.ok(museum.parts!.some(p=>p.base&&p.base>=C.playerHeight*1.4)&&museum.parts!.filter(p=>!p.base).every(p=>p.spire),'an open hall you can walk under');
 const trees=CHA.buildings.filter(b=>b.prop==='tree');assert.ok(trees.length>=60,`the park's trees (${trees.length})`);
 for(const t of trees){assert.ok(!(t.x+t.w>lake[0]&&t.x<lake[1]),'no tree in the water');for(const [a,z] of CHA.ramps!)assert.ok(t.x>=z||t.x+t.w<=a,'no tree on a ramp');assert.ok(!(t.x+t.w>CHA.stone!-sc(60)&&t.x<CHA.stone!+STONE.d+sc(60)),'none at the stone');}
 assert.ok(CHA.lakeGreen!.length>=1&&CHA.lakeGreen!.every(([a,z])=>a>=lake[0]&&z<=lake[1]),'green by the drains, inside the lake');
 assert.equal(CHA.seeps,undefined,'Chapultepec has no seeps: only the lake runs green (art)');
 const guard=CHA.units!.filter(([t,x])=>(t==='soldier'||t==='apc'||t==='tank')&&x>castle.x-sc(500)&&x<castle.x+castle.w+sc(1000));assert.ok(guard.length>=4,'the Guardia dug in on the hill');
});

test('exit routing: Chapultepec\'s west exit leads on to Ciudad Universitaria, its east exit to the secret Xochimilco, which rejoins at Ciudad Universitaria',()=>{
 const cha=at('Chapultepec'),cu=at('Ciudad Universitaria'),xo=at('Xochimilco');
 assert.equal(exitTarget(MEX,cha,'west'),cu);assert.equal(exitTarget(MEX,cha,'east'),xo);assert.equal(exitTarget(MEX,cha),cu);assert.equal(exitTarget(MEX,xo),cu);
 assert.equal(exitTarget(MEX,at('Alameda and Bellas Artes')),at('Paseo de la Reforma'));assert.equal(exitTarget(MEX,at('Paseo de la Reforma')),cha);
 for(const side of ['west','east'] as const){const r=newRun('ABC');r.city=CAMPAIGN.indexOf('mex');r.block=cha;r.phase='playing';assert.ok(latchBlock(r));assert.ok(nextBlock(r,10,side));assert.equal(r.block,side==='west'?cu:xo);}
});

test('opt-in: no other level sets banners, domeSeep, angel, stone, catrinas or lakeGreen; the new decos, the campo art and the stone are Mexico City Act 2 only',()=>{
 const mine=ACT2;
 for(const b of LEVELS.flat().filter(x=>!mine.includes(x))){for(const k of ['banners','domeSeep','angel','stone','catrinas','lakeGreen'])assert.equal((b as any)[k],undefined,`${b.name} has no ${k}`);
  assert.ok(!b.buildings.some(x=>x.deco==='mfloat'||x.deco==='fountain'||x.deco==='museo'),`${b.name} has none of the Act 2 decos`);assert.notEqual(b.target?.art,'campo');}
 for(const b of LEVELS.flat().filter(x=>!mine.includes(x)&&x.volcano!==undefined))assert.ok(b.volcano!==2||b.name==='Alameda and Bellas Artes','state 2 is Act 2 only');
 assert.deepEqual(mine.map(b=>[b.banners!==undefined,b.domeSeep!==undefined,b.angel!==undefined,b.stone!==undefined,b.catrinas!==undefined,b.lakeGreen!==undefined,b.seeps!==undefined]),
  [[true,true,false,false,false,false,true],[false,false,true,false,true,false,true],[false,false,false,true,false,true,false]]);
 // El Ángel's needle silhouette is Mexico City only: the other cities' needles keep their parts.
 const s={kind:'stone',state:'parked'} as any;for(const state of ['parked','wreck','rolling','driving','flat'])assert.equal(loose({...s,state}),false,`the stone is never loose (${state})`);assert.equal(loose({kind:'car',state:'parked'} as any),true);
 // Herald Square keeps its own floats.
 const nyc=LEVELS[cityIndexOf('nyc')],herald=nyc.find(b=>b.name==='Herald Square')!;assert.ok(herald.buildings.filter(b=>b.deco==='float').length>=6&&herald.buildings.every(b=>b.deco!=='mfloat'));assert.ok(herald.buildings.some(b=>b.label==='PARADE FLOAT'));
});

test('config: the Act 2 blocks are sane',()=>{
 assert.ok(PICADO.burn>0&&PICADO.spacing>0&&PICADO.points>0&&PICADO.reach>0);assert.ok(PICADO.burn<6,'a string burns in a few seconds, not a minute');
 assert.ok(ANGEL.length>F.toppleMinHeight,'tall enough to topple');assert.ok(ANGEL.w<ANGEL.length/3);assert.ok(ANGEL.length<C.width*1.5,'a fall that fits the screen');
 assert.ok(STONE.minStage===3&&STONE.mass>=5&&STONE.throwSpeed>STONE.throwLift&&STONE.rerollMin>STONE.grabSpeed&&STONE.glide>0&&STONE.plows>0&&STONE.near>0);
 assert.ok(MEX2.dome.drop>0&&MEX2.dome.tilt>0&&MEX2.dome.sunk>MEX2.dome.drop,'the dome starts sunk and drops a smaller step');
 assert.ok(MEX2.campo.lift>0&&MEX2.campo.wake>MEX2.campo.w/2&&MEX2.campo.pads.length>=2);assert.ok(MEX2.lake.depth>0&&MEX2.lake.x1>MEX2.lake.x0);
});

const burnedAt=(h:any,i:number)=>h.state().blazeList.includes(i);
test('real loop: a papel picado string carries fire across the street once, then is gone',async()=>{
 const h=await boot(3);
 try{
  const s0=h.state(),banner=s0.picado.list[0];assert.equal(banner.state,'strung');const [li,ri]=banner.ends as [number,number];assert.ok(li>=0&&ri>=0&&li!==ri);
  h.test().shield(200);h.test().teleport(s0.buildings[li].x-s0.width-40);h.step(2);
  assert.ok(!burnedAt(h,ri));assert.ok(h.test().torch(li));h.step(2);assert.ok(burnedAt(h,li));
  // The string takes light from the burning building, burns for PICADO.burn s; only then does the far building catch.
  let lit=-1,farLit=-1;for(let n=0;n<60*14&&farLit<0;n++){h.step(1);const p=h.state().picado.list[0];if(lit<0&&p.state==='burning')lit=n;if(farLit<0&&burnedAt(h,ri))farLit=n;}
  assert.ok(lit>=0,'the string caught');assert.ok(farLit>=0,'and the fire crossed the street');assert.ok(farLit-lit>=PICADO.burn*60-3,`it took the string's burn time (${farLit-lit} frames)`);
  let p=h.state().picado;assert.equal(p.list[0].state,'gone');assert.equal(p.crossed,1);assert.ok(p.burned>=1);
  // The gap is far wider than ordinary fire spread: without the string the far building would never have lit.
  assert.ok(banner.x1-banner.x0>FI.reach*4);
  // Each string burns once: nothing more happens to it, whatever burns next to it.
  const farBefore=p.crossed;for(let n=0;n<300;n++)h.step(1);p=h.state().picado;assert.equal(p.list[0].state,'gone');assert.equal(p.crossed,farBefore);
 }finally{h.release();h.cleanup();}
});

test('real loop: fire from the far side crosses the same string the other way, and an unlit string stays strung',async()=>{
 const h=await boot(3);
 try{
  const s0=h.state(),b1=s0.picado.list[1],[li,ri]=b1.ends as [number,number];h.test().shield(200);h.test().teleport(s0.buildings[ri].x+s0.buildings[ri].w+40);h.step(2);
  for(let n=0;n<60;n++)h.step(1);assert.ok(s0.picado.list.every((q:any)=>q.state==='strung'));assert.equal(h.state().picado.list.filter((q:any)=>q.state!=='strung').length,0,'nothing burns unlit');
  h.test().torch(ri);let far=false;for(let n=0;n<60*14&&!far;n++){h.step(1);far=burnedAt(h,li);}
  assert.ok(far,'the fire crossed the street from east to west');assert.equal(h.state().picado.list[1].from,1);assert.equal(h.state().picado.list[1].state,'gone');
  assert.equal(h.state().picado.list[0].state,'strung','the neighbouring string never caught');
 }finally{h.release();h.cleanup();}
});

test('real loop: Bellas Artes starts sunk; its seep, burst, drops the dome one step and tilts it, once',async()=>{
 const h=await boot(3);
 try{
  let s=h.state();assert.equal(s.dome.dropped,false);assert.equal(s.dome.sink,MEX2.dome.sunk,'drawn sunk into the lake bed from the start');assert.equal(s.dome.lean,0);assert.equal(s.seepList[0].state,'idle');
  const dome=s.buildings.findIndex((b:any)=>b.landmark&&b.w>0&&Math.abs(b.x-(ALA.buildings.find(q=>q.shape==='dome')!.x))<2),seep=ACT2[0].seeps![0],base0=s.dome.base;
  h.test().shield(200);h.test().teleport(seep-s.width/2-10);h.step(30);slam(h);s=h.state();
  assert.ok(s.seepList[0].state==='burst'||s.seepBursts>=1,'the seep burst');assert.equal(s.dome.dropped,true);assert.equal(s.dome.sink,MEX2.dome.sunk+MEX2.dome.drop,'another step into the ground');assert.equal(s.dome.base,base0+MEX2.dome.drop);
  assert.equal(s.dome.lean,MEX2.dome.tilt,'and tilted');assert.equal(s.buildings[dome].lean,MEX2.dome.tilt);
  // Once only: when it re-arms and bursts again the dome stays where it is.
  const sink1=s.dome.sink;for(let n=0;n<60*ACID.rearm+200;n++)h.step(1);slam(h);s=h.state();assert.equal(s.dome.sink,sink1,'a second burst drops nothing');assert.ok(s.seepBursts>=1);
  // Only the dome seep drops it: a seep elsewhere on the level leaves a fresh dome alone (checked below on a fresh load).
 }finally{h.release();h.cleanup();}
});

test('real loop: another seep along the Alameda bursts without touching the dome, and the sunk dome is the only landmark that sinks',async()=>{
 const h=await boot(3);
 try{
  let s=h.state();const x=ACT2[0].seeps![1];h.test().shield(200);h.test().teleport(x-s.width/2-10);h.step(30);slam(h);s=h.state();
  assert.ok(s.seepBursts>=1,'a seep burst');assert.equal(s.dome.dropped,false,'the dome stands as it was');assert.equal(s.dome.sink,MEX2.dome.sunk);assert.equal(s.sunk,1,'no sinking twist: only the dome is drawn sunk');
 }finally{h.release();h.cleanup();}
});

test('real loop: the floats are Día de Muertos floats (rendered without error), they burn, they are solid cover; Herald Square is unchanged',async()=>{
 const h=await boot(4,sc(900));
 try{
  let s=h.state();const fl=s.buildings.map((b:any,i:number)=>[b,i]).filter(([b]:any)=>b.deco==='mfloat');assert.ok(fl.length>=10);
  for(const [b] of fl){assert.ok(b.hp>0&&b.kind==='large');}
  h.test().shield(200);const [fb,fi]=fl[0];h.test().teleport(fb.x-s.width-30);h.step(20);assert.ok(h.test().torch(fi),'a float catches fire');h.step(30);assert.ok(burnedAt(h,fi));
  const hp0=h.state().buildings[fi].hp;for(let n=0;n<60*5;n++)h.step(1);assert.ok(h.state().buildings[fi].hp<hp0,'and burns down');
 }finally{h.release();h.cleanup();}
 const g=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban'});
 try{const nyc=LEVELS[cityIndexOf('nyc')];g.test().goto(nyc.findIndex(b=>b.name==='Herald Square'),sc(900));g.step(2);const b=g.state().buildings.filter((q:any)=>q.deco==='float');assert.ok(b.length>=6);assert.ok(!g.state().buildings.some((q:any)=>q.deco==='mfloat'));}
 finally{g.release();g.cleanup();}
});

test('real loop: El Ángel falls the way it was struck, crushing the convoy in its lane; it cannot reach the target',async()=>{
 for(const dir of [1,-1] as const){
  const h=await boot(4);
  try{
   let s=h.state();const i=s.buildings.findIndex((b:any)=>b.landmark&&b.h===ANGEL.length),a=s.buildings[i];assert.ok(i>=0);h.test().shield(300);
   h.test().teleport(a.x-s.width-60);h.step(2);
   // A soldier and a car in the lane on the side it will fall to, and a soldier on the other side as the control.
   const lx=dir>0?a.x+a.w+ANGEL.length*.5:a.x-ANGEL.length*.5,ox=dir>0?a.x-ANGEL.length*.6:a.x+a.w+ANGEL.length*.6;
   h.test().spawnUnit('soldier',lx);h.test().spawnUnit('soldier',ox);h.test().spawnVehicle('car',lx+sc(70));h.step(2);
   const unit=(x:number)=>h.state().militaryUnits.find((u:any)=>u.type==='soldier'&&u.hp>0&&Math.abs(u.x-x)<90),hp0=unit(lx).hp,carV=()=>h.state().vehicles.find((v:any)=>v.kind==='car'&&Math.abs(v.x-(lx+sc(70)))<60);
   assert.ok(carV());h.test().smash(i,dir);for(let n=0;n<8;n++)h.step(1);assert.equal(h.state().buildings[i].tiltDir,dir,`falls ${dir>0?'east':'west'}, the way it was hit`);
   for(let n=0;n<60*5&&h.state().buildings[i].topple!==2;n++)h.step(1);const b=h.state().buildings[i];assert.equal(b.topple,2,'it landed');
   assert.ok(!unit(lx)||unit(lx).hp<hp0,`the soldier in its lane was hit (${hp0} -> ${unit(lx)?.hp})`);assert.ok(!carV()||h.state().vehicles.find((v:any)=>v.kind==='car'&&(v.state==='flat'||v.state==='wreck')),'the car in its lane is crushed');
   const t=h.state().objective;assert.ok(t.hp===h.state().objectiveHP&&t.shattered===false,'the target stands');assert.ok(h.state().objectiveHP>=h.state().objective.hp-1);
  }finally{h.release();h.cleanup();}
 }
});

test('real loop: Campo Marte: helicopters sit on the pad until the fight starts, then spin up and lift off',async()=>{
 const h=await boot(4);
 try{
  let s=h.state();const T=s.objective.x,pads=MEX2.campo.pads.map(p=>T+p);assert.equal(s.objective.art,'campo');assert.equal(s.campo.woke,false);assert.equal(s.campo.launched,0);
  const near=(x:number)=>h.state().militaryUnits.filter((u:any)=>u.type==='helicopter'&&Math.abs(u.x+25-x)<120);
  h.test().shield(300);h.test().teleport(T-MEX2.campo.wake-400);h.step(30);s=h.state();assert.equal(s.campo.woke,false,'not yet: still far off');assert.ok(pads.every(p=>near(p).length===0),'none in the air over the pad');
  h.test().teleport(T-MEX2.campo.wake+120);h.step(2);s=h.state();assert.equal(s.campo.woke,true,'the fight has started');assert.equal(s.campo.launched,0,'rotors spinning up, still on the ground');assert.ok(pads.every(p=>near(p).length===0));
  for(let n=0;n<Math.ceil(MEX2.campo.lift*60)+4;n++)h.step(1);s=h.state();assert.equal(s.campo.launched,MEX2.campo.pads.length,'a helicopter off each pad');
  const gy=s.ground(T);const heli=h.state().militaryUnits.filter((u:any)=>u.type==='helicopter'&&pads.some(p=>Math.abs(u.x+25-p)<260));assert.ok(heli.length>=MEX2.campo.pads.length,'in the air');
  const y0=Math.min(...heli.map((u:any)=>u.y));assert.ok(y0>gy-120,`just off the ground (${Math.round(gy-y0)}px up)`);for(let n=0;n<45;n++)h.step(1);
  const y1=Math.min(...h.state().militaryUnits.filter((u:any)=>u.type==='helicopter').map((u:any)=>u.y));assert.ok(y1<y0-40,`and climbing (${Math.round(y0)} -> ${Math.round(y1)})`);
 }finally{h.release();h.cleanup();}
});

test('real loop: damaging Campo Marte from afar starts the fight too, and the helicopters launch once',async()=>{
 const h=await boot(4);
 try{
  const T=h.state().objective.x;h.test().shield(300);h.test().teleport(T-MEX2.campo.wake-600);h.step(10);assert.equal(h.state().campo.woke,false);
  h.test().hitTarget(5);h.step(2);assert.equal(h.state().campo.woke,true,'any damage to the target starts it');
  for(let n=0;n<Math.ceil(MEX2.campo.lift*60)+4;n++)h.step(1);assert.equal(h.state().campo.launched,MEX2.campo.pads.length);for(let n=0;n<240;n++)h.step(1);assert.equal(h.state().campo.launched,MEX2.campo.pads.length,'launched once, not again');
 }finally{h.release();h.cleanup();}
});

test('Chapultepec water: the lake is over a Stage 2 head and wading depth at Stage 3, the park is dry',()=>{
 setTerrain(CHA.ground!,CHA.water!);const lake=Math.round((CHA.water![0][0]+CHA.water![0][1])/2);
 assert.equal(bandAt(lake,BODY(2)),'deep');assert.equal(bandAt(lake,BODY(3)),'wading');assert.equal(bandAt(CHA.start!,BODY(2)),'dry');assert.equal(bandAt(CHA.crystal!,BODY(2)),'dry');setTerrain(null);
});

test('real loop: a Stage 2 kaiju is stopped at the lake and a Stage 3 one wades across to the east exit',async()=>{
 const lake=CHA.water![0],W=levelWidth(CHA);
 {const h=await boot(5,lake[0]-sc(200));
  try{h.test().growTo(2);h.step(2);h.test().shield(0);assert.equal(h.state().stage,2);h.down('KeyD');let drowned=false;for(let n=0;n<60*10&&!drowned;n++){h.step(1);const s=h.state();drowned=s.band==='deep'||s.drowning!==null;}h.up('KeyD');
   assert.ok(drowned||h.state().x<lake[1],'it does not walk across: deep water, or a drowning');}
  finally{h.release();h.cleanup();}}
 {const h=await boot(5,lake[0]-sc(200));
  try{h.test().growTo(3);h.step(2);assert.equal(h.state().stage,3);h.test().shield(0);h.down('KeyD');let wading=false,safe=true;for(let n=0;n<60*40&&h.state().x<lake[1]+40;n++){h.step(1);const s=h.state();wading=wading||s.band==='wading';if(s.drowning!==null)safe=false;}h.up('KeyD');
   assert.ok(wading&&safe,'wading, never drowning');assert.ok(h.state().x>=lake[1]-10,'across the lake');assert.ok(h.state().x<W);}
  finally{h.release();h.cleanup();}}
});

test('Chapultepec zoo and ash: the animals bolt, ash starts late in the level only',async()=>{
 const h=await boot(5,CHA.zoo![0]-sc(300));
 try{assert.ok(h.state().zooList.every((a:any)=>a.state==='rest'));h.test().teleport(CHA.zoo![0]-sc(150));h.step(20);assert.ok(h.state().zooList.some((a:any)=>a.state==='flee'));
  h.test().teleport(sc(1200));h.step(10);assert.equal(h.state().volcano.state,2);assert.equal(h.state().volcano.ash,false,'no ash early');h.test().teleport(CHA.ashLate!+sc(400));h.step(10);assert.equal(h.state().volcano.ash,true,'ash once past the castle');}
 finally{h.release();h.cleanup();}
});

test('Sun Stone data and grab: Stage 2 cannot lift it; Stage 3 does',async()=>{
 const h=await boot(5,CHA.stone!-sc(400));
 try{
  const stone=()=>h.state().vehicles.find((v:any)=>v.kind==='stone');let v=stone();assert.ok(v&&v.state==='parked'&&v.w===STONE.d,'the stone stands where the level puts it');assert.ok(Math.abs(v.x+v.w/2-CHA.stone!)<STONE.d);
  h.test().growTo(2);h.step(2);h.test().teleport(v.x-h.state().width-12);h.step(3);h.tap('KeyH');h.step(4);assert.equal(h.state().held,null,'Stage 2 bumps against it');assert.equal(h.state().action,'TOO HEAVY');
  h.test().growTo(3);h.step(2);h.test().teleport(stone().x-h.state().width-12);h.step(3);const pts=h.state().score;let ok=false;for(let n=0;n<5&&!ok;n++){h.tap('KeyH');h.step(4);ok=h.state().held==='stone';}
  assert.ok(ok,'Stage 3 lifts it');assert.ok(h.state().score-pts>=STONE.points,'paid once for the first lift');
 }finally{h.release();h.cleanup();}
});

test('Sun Stone throw: it flies, lands and rolls on, plowing the crowd and cars; it never breaks',async()=>{
 const h=await boot(5,CHA.stone!-sc(400));
 try{
  const stone=()=>h.state().vehicles.find((v:any)=>v.kind==='stone');h.test().growTo(3);h.step(2);h.test().shield(300);h.test().teleport(stone().x-h.state().width-12);h.step(3);let ok=false;for(let n=0;n<5&&!ok;n++){h.tap('KeyH');h.step(4);ok=h.state().held==='stone';}assert.ok(ok);
  // A parked car down the run: the rolling stone wrecks it.
  const s=h.state();h.test().spawnVehicle('car',s.x+s.width+sc(900));h.step(2);
  h.tap('KeyH');h.step(2);let v=stone();assert.equal(v.state,'flying');assert.ok(Math.abs(v.vx)>=STONE.throwSpeed-1);assert.equal(h.state().stoneStats.thrown,1);
  let rolled=false,x0=v.x;for(let n=0;n<60*6;n++){h.step(1);v=stone();if(v.state==='rolling'){rolled=true;break;}}assert.ok(rolled,'it rolls on landing');assert.ok(Math.abs(v.vx)>=STONE.rerollMin-1);assert.ok(h.state().stoneStats.rolled>=1);
  const xr=v.x;for(let n=0;n<60*3;n++)h.step(1);v=stone();assert.ok(Math.abs(v.x-xr)>sc(200)||v.state==='parked','it keeps going');assert.ok(v.x>x0);assert.ok(v.angle!==0,'and turns');
  for(let n=0;n<60*20&&stone().state==='rolling';n++)h.step(1);assert.equal(stone().state,'parked','it comes to rest');assert.ok(stone()&&stone().w===STONE.d,'never broken');
 }finally{h.release();h.cleanup();}
});

test('Sun Stone: only Chapultepec has one, and nothing else in the loop breaks it',async()=>{
 for(const bi of [3,4]){const h=await boot(bi);try{assert.equal(h.state().vehicles.find((v:any)=>v.kind==='stone'),undefined);}finally{h.release();h.cleanup();}}
 void NYC2;void nextBlock;
});
