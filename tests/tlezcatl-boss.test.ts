import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRival,hitRival,tickRival,flameBoxes} from '../src/rival.ts';import type {Rival} from '../src/rival.ts';
import {createBuildings} from '../src/rules.ts';
import {CONFIG as C,CAMPAIGN as P,TLEZCATL_BOSS as TB} from '../src/config.ts';
import {LEVELS,cityIndexOf} from '../src/levels.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Tlézcatl as a boss: his Flame Jet, lava lobs, Magma Dive and Eruption turned on the kaiju (src/rival.ts), the range/health pattern that
// picks them, and how they recover, expire and clear on a retreat. Pure checks first (tickRival is a function of the rival, the kaiju's box
// and the buildings), then the real loop in Mexico City's flat Tlézcatl Arena and New York's Empire State.
const W=5000,pw=48,ph=69,player=(cx:number,lift=0)=>({x:cx-pw/2,y:C.ground-ph-lift,w:pw,h:ph});
const tlez=(cx=2500,face=1)=>{const r=createRival(W,0,'Tlézcatl');r.x=cx-r.w/2;r.y=C.ground-r.h;r.face=face;r.cooldown=0;return r;};
type Hit={damage:number,strength:number,direction:number};
const run=(r:Rival,seconds:number,p:{x:number,y:number,w:number,h:number},b:any[]=[],dt=1/60)=>{const hits:Hit[]=[];for(let t=0;t<seconds;t+=dt)hits.push(...tickRival(r,dt,p,W,b));return hits;};
const spec=(x:number,w:number,extra:object={})=>({x,w,h:220,hp:300,value:100,kind:'medium' as const,label:'',color:'#888',...extra});
const pick=(r:Rival,p:{x:number,y:number,w:number,h:number})=>{r.cooldown=0;r.windup=0;tickRival(r,.01,p,W,[]);return r.attack;};

test('only a Tlézcatl boss gets the Tlézcatl moves; Kaiban and the rest keep theirs',()=>{
 const t=createRival(W,0,'Tlézcatl');assert.ok(t.tlez&&!t.kaiban);assert.deepEqual(t.globs,[]);assert.deepEqual(t.pools,[]);assert.equal(t.flame,null);assert.equal(t.dive,null);assert.ok(!t.erupted);
 for(const name of ['Kaiban','Belial','']){const o=createRival(W,0,name);assert.ok(!o.tlez&&!o.globs&&!o.pools&&!o.flame,`${name||'default'} has no lava kit`);}
 const o=createRival(W,0,'Kaiban');o.x=2500;o.cooldown=0;const seen=new Set<string>();for(let n=0;n<40;n++){tickRival(o,.05,player(2900),W,[]);seen.add(o.attack);o.windup=0;o.cooldown=0;}
 assert.ok(![...seen].some(a=>['jet','lob','dive','erupt'].includes(a)),'Kaiban never uses them');
});

test('move selection by range: melee up close, flame jet at mid range, lava lobs from far away',()=>{
 const r=tlez();
 assert.equal(pick(r,player(2500+P.bossRange+r.w-30)),'melee','point blank is the shared claw');assert.ok(Math.abs(r.windup-P.bossTelegraph)<.005);
 assert.equal(pick(r,player(2800)),'jet');assert.ok(Math.abs(r.windup-TB.jetTelegraph)<.005);
 assert.equal(pick(r,player(2500+TB.far-20)),'jet','still mid range just inside far');
 assert.equal(pick(r,player(2500+TB.far+20)),'lob');assert.ok(Math.abs(r.windup-TB.lobTelegraph)<.005);
 assert.equal(pick(r,player(3600)),'lob');
 const l=tlez(2500,-1);assert.equal(pick(l,player(2200)),'jet','and either way round');
});

test('move selection by health: a Dive every third attack under half, the Eruption first under a quarter and only once',()=>{
 const r=tlez(),mid=player(2800);const seq:string[]=[];for(let i=0;i<9;i++)seq.push(pick(r,mid));
 assert.ok(!seq.includes('dive')&&!seq.includes('erupt'),`full health keeps to the range pattern (${seq})`);
 const h=tlez();h.hp=h.maxHP*.45;const s2:string[]=[];for(let i=0;i<9;i++)s2.push(pick(h,mid));
 assert.deepEqual(s2.map((a,i)=>a==='dive'?i+1:0).filter(Boolean),[3,6,9],`every third attack (${s2})`);assert.ok(s2.filter(a=>a!=='dive').every(a=>a==='jet'));
 const e=tlez();e.hp=e.maxHP*.2;assert.equal(pick(e,mid),'erupt','the Eruption comes first');assert.ok(e.erupted);assert.ok(Math.abs(e.windup-TB.eruptCharge)<.005);
 const after:string[]=[];for(let i=0;i<12;i++)after.push(pick(e,mid));assert.ok(!after.includes('erupt'),'one per fight');assert.ok(after.includes('dive'),'the Dives carry on');
 const c=tlez();c.hp=c.maxHP*.2;assert.equal(pick(c,player(2560)),'erupt','even point blank');
 const b=tlez();b.hp=b.maxHP*.5;b.combo=2;assert.notEqual(pick(b,mid),'dive','exactly half is not below half');
});

test('Flame Jet: a locked-facing flare first, then a sweeping cone that burns the kaiju in reach and nobody out of it',()=>{
 const r=tlez(),p=player(2780);tickRival(r,.01,p,W,[]);assert.equal(r.attack,'jet');
 const hits=run(r,TB.jetTelegraph-.1,p);assert.equal(r.flame,null,'nothing burns during the flare');assert.equal(hits.length,0);assert.equal(r.face,1);
 const near=run(r,TB.jetSweep+.3,p).filter(h=>h.damage===TB.jetDamage);
 assert.ok(near.length>=2,`the cone catches the kaiju (${near.length} ticks)`);assert.ok(near.every(h=>h.damage===TB.jetDamage&&h.direction===1));
 assert.ok(near[0].strength===TB.jetKnock&&near.slice(1).every(h=>h.strength===0),'one shove, then it just burns');
 const f=tlez(),far=player(3500);tickRival(f,.01,far,W,[]);f.attack='jet';f.windup=.01;assert.equal(run(f,3,far).length,0,'out of reach');
 // The sweep runs from jetUp down to jetDown, and stops where the building is.
 const g=tlez();g.attack='jet';g.windup=.01;const angles:number[]=[];for(let t=0;t<TB.jetSweep+.2;t+=1/60){tickRival(g,1/60,p,W,[]);if(g.flame)angles.push(g.flame.angle);}
 assert.ok(angles[0]<=TB.jetUp&&angles[0]>TB.jetUp-8&&angles.at(-1)!<TB.jetDown+8,`sweeps down (${angles[0].toFixed(1)} to ${angles.at(-1)!.toFixed(1)})`);assert.ok(angles.every((a,i)=>!i||a<=angles[i-1]));
 const [b]=createBuildings([spec(2650,100)]),w=tlez();w.attack='jet';w.windup=.01;const behind=run(w,3,player(2900),[b]);
 assert.equal(behind.length,0,'the building shields the kaiju behind it');assert.ok(b.hpNow<b.hp,'and takes the fire');
 const cone=tlez();cone.attack='jet';cone.windup=.01;tickRival(cone,.05,p,W,[b]);tickRival(cone,.05,p,W,[b]);assert.ok(flameBoxes(cone).length>0);assert.ok(cone.flame!.len<=TB.jetRange);
});

test('Flame Jet leaves fire patches on the street that burn the kaiju standing in them, then die out',()=>{
 const r=tlez(),p=player(3300);r.attack='jet';r.windup=.01;run(r,TB.jetSweep+.2,p);
 const fires=r.pools!.filter(q=>q.fire);assert.ok(fires.length>=2&&fires.length<=TB.fireCap,`patches on the street (${fires.length})`);
 assert.ok(fires.every(q=>q.w===TB.fireCell&&q.y===C.ground&&q.life<=TB.fireSeconds));
 const x=fires[0].x+fires[0].w/2,stand=player(x),burn=run(r,1,stand);assert.ok(burn.length>=2&&burn.every(h=>h.damage===TB.fireDamage&&h.strength===0),`standing in it burns (${burn.length})`);
 const clear=player(x,120);const q=tlez();q.cooldown=1e6;q.pools=fires.map(f=>({...f}));assert.equal(run(q,1,clear).length,0,'a kaiju in the air is not burned');
 run(r,TB.fireSeconds+.5,player(100));assert.equal(r.pools!.filter(q=>q.fire).length,0,'every patch has burned out');
 const many=tlez();many.attack='jet';many.windup=.01;for(let n=0;n<8;n++){many.flame=null;many.attack='jet';many.windup=.01;many.cooldown=0;many.stagger=0;run(many,TB.jetSweep+.1,player(3300));}
 assert.ok(many.pools!.filter(q=>q.fire).length<=TB.fireCap,'the patches stay capped');
});

test('Flame Jet cannot be staggered, and leaves him winded for jetRecover seconds (the opening)',()=>{
 const r=tlez(),p=player(2780);r.attack='jet';r.windup=.01;run(r,.5,p);assert.ok(r.flame);
 hitRival(r,5,'player',400,1);assert.equal(r.stagger,0,'a big hit does not break the flame');assert.ok(r.flame);
 for(let n=0;n<600&&r.flame;n++)tickRival(r,1/60,p,W,[]);assert.equal(r.flame,null);assert.ok(r.stagger>TB.jetRecover-.1,`winded (${r.stagger.toFixed(2)})`);assert.ok(r.cooldown>=TB.jetRecover);
 const x=r.x;assert.equal(run(r,TB.jetRecover-.2,player(100)).length,0,'winded he does nothing');assert.equal(r.x,x);assert.equal(r.windup,0);
 run(r,.5,p);assert.equal(r.stagger,0);
 // The telegraph itself can be broken up by a solid hit.
 const t=tlez();tickRival(t,.01,p,W,[]);hitRival(t,5,'player',200,1);assert.equal(t.windup,0,'a flare in progress is interrupted');assert.ok(t.stagger>0);
});

test('Lava lobs: a rear-up telegraph, then arcing globs onto the kaiju\'s spot; each hits or splashes a pool that burns, then cools',()=>{
 const r=tlez(),p=player(3300);tickRival(r,.01,p,W,[]);assert.equal(r.attack,'lob');
 run(r,TB.lobTelegraph-.1,p);assert.equal(r.globs!.length,0,'nothing flies during the rear-up');
 tickRival(r,.12,p,W,[]);assert.equal(r.globs!.length,TB.lobs,'the volley leaves together');assert.ok(Math.abs(r.cooldown-TB.lobCooldown)<.05);
 const apex=r.globs!.map(g=>g.vy);assert.ok(apex.every(v=>v<0),'lobbed upward');
 const hits=run(r,2,p);assert.ok(hits.length>=1&&hits.length<=TB.lobs,'globs falling onto the kaiju hit it');assert.ok(hits.every(h=>h.damage===TB.lobDamage&&h.strength===TB.lobKnock));
 const pools=r.pools!.filter(q=>!q.fire);assert.equal(pools.length,TB.lobs-hits.length,'the rest splash pools');assert.ok(pools.length>=1);assert.ok(pools.every(q=>q.w===TB.lobPool&&q.y===C.ground));
 assert.equal(r.globs!.length,0);
 const pc=pools[0].x+pools[0].w/2,burn=run(r,1,player(pc));assert.ok(burn.length>=2&&burn.every(h=>h.damage===TB.lobPoolDamage),`the pool burns (${burn.length})`);
 r.cooldown=1e6;r.windup=0;run(r,TB.lobPoolSeconds+.5,player(100));assert.equal(r.pools!.length,0,'pools cool');
 // A kaiju well off to the side is untouched and the volley still lands near where it stood.
 const f=tlez(),away=player(3300);f.attack='lob';f.windup=.01;const taken=run(f,.2,away);assert.equal(taken.length,0);const walked=run(f,2,player(4200));assert.equal(walked.length,0,'dodged by moving');
 // Buildings in the way take the glob.
 const [b]=createBuildings([spec(3200,200,{h:600})]),g=tlez();g.attack='lob';g.windup=.01;const shield=run(g,3,player(3500),[b]);assert.ok(b.hpNow<b.hp||shield.length<=1);
});

test('Magma Dive: a crouch that locks the landing, an unstoppable leap, a slam and lava ring, then winded',()=>{
 const r=tlez(),p=player(2800);r.hp=r.maxHP*.4;r.combo=2;tickRival(r,.01,p,W,[]);assert.equal(r.attack,'dive');assert.ok(Math.abs(r.windup-TB.diveTelegraph)<.005);assert.ok(Math.abs(r.mark!-2800)<1);
 // The kaiju walks away during the crouch: he still lands where it stood.
 const away=player(3300);const during=run(r,TB.diveTelegraph-.05,away);assert.equal(during.length,0);assert.equal(r.dive,null,'still crouched');
 tickRival(r,.1,away,W,[]);assert.ok(r.dive,'he leaps');hitRival(r,1,'player',400,1);assert.ok(r.dive&&r.stagger===0,'cannot be staggered in the air');
 let peak=r.y;for(let t=0;t<TB.diveFlight+.1;t+=1/60){tickRival(r,1/60,away,W,[]);peak=Math.min(peak,r.y);}
 assert.ok(peak<C.ground-r.h-TB.diveHeight*.8,`an arc up (peak ${peak})`);assert.equal(r.dive,null);assert.ok(Math.abs(r.x+r.w/2-2800)<1,`landed on the mark (${r.x+r.w/2})`);assert.equal(r.y,C.ground-r.h);
 assert.ok(r.stagger>TB.diveRecover-.2,'winded after the slam');assert.ok(r.ring);
 const rim=r.pools!.find(q=>!q.fire&&q.w===TB.divePool);assert.ok(rim,'a pool under him');assert.ok(r.globs!.length>=TB.diveGlobs-1,'the ring of lava goes out both ways');
 assert.ok(r.globs!.some(g=>g.vx>0)&&r.globs!.some(g=>g.vx<0));
 r.cooldown=1e6;r.stagger=0;run(r,TB.lobPoolSeconds+.5,player(100));assert.equal(r.pools!.length,0);assert.equal(r.globs!.length,0);
});

test('Magma Dive slam: hurts the kaiju beside him, misses one that jumped or stood clear, and is capped at diveRange',()=>{
 const slam=(px:number,lift=0,mark=2800)=>{const r=tlez();r.attack='dive';r.mark=mark;r.windup=.01;return {r,hits:run(r,TB.diveFlight+.3,player(px,lift))};};
 const near=slam(2800);const hit=near.hits.filter(h=>h.damage===TB.diveDamage);assert.equal(hit.length,1,'one slam hit');assert.equal(hit[0].strength,TB.diveKnock);
 assert.equal(slam(2800,200).hits.filter(h=>h.damage===TB.diveDamage).length,0,'jumped it');
 assert.equal(slam(2800+TB.diveRadius+200).hits.filter(h=>h.damage===TB.diveDamage).length,0,'stood clear');
 const far=slam(4000,0,4600);assert.ok(far.r.x+far.r.w/2<=2500+TB.diveRange+1,'a dive goes no farther than diveRange');assert.ok(far.r.x+far.r.w/2>=2500+TB.diveRange-1);
 const edge=slam(100,0,-300);assert.ok(edge.r.x>=0);
});

test('Eruption: planted and shuddering for the charge, then a burst of globs that leave pools; one per fight, then winded',()=>{
 const savedRandom=Math.random;Math.random=()=>.9;
 try{const r=tlez(),p=player(2900);r.hp=r.maxHP*.2;tickRival(r,.01,p,W,[]);assert.equal(r.attack,'erupt');const x=r.x;
  const before=run(r,TB.eruptCharge-.15,p);assert.equal(before.length,0);assert.equal(r.globs!.length,0,'no lava during the charge');assert.equal(r.x,x,'planted');
  tickRival(r,.2,p,W,[]);assert.equal(r.globs!.length,TB.eruptGlobs,'the whole burst at once');assert.ok(r.stagger>TB.eruptRecover-.3,'winded after');assert.ok(r.cooldown>=TB.eruptRecover);
  assert.ok(r.globs!.every(g=>g.vy<0||g.vy>-1e4));
  const hits=run(r,2.5,player(100));assert.equal(hits.length,0,'nothing at all on the far side');const pools=r.pools!;assert.ok(pools.length>0&&pools.length<=TB.poolCap,`pools down (${pools.length})`);
  assert.ok(pools.every(q=>q.w===TB.eruptPool&&q.y===C.ground));
  r.cooldown=1e6;run(r,TB.eruptPoolSeconds+.3,player(100));assert.equal(r.pools!.length,0,'all cool');
  const dmg=tlez(),stand=player(2900+.9*0+TB.eruptRange*(.9*2-1)+2500-2900);dmg.hp=dmg.maxHP*.2;dmg.attack='erupt';dmg.erupted=true;dmg.windup=.01;
  const taken=run(dmg,2.5,stand);assert.ok(taken.some(h=>h.damage===TB.eruptGlobDamage),'a kaiju where the lava lands is hit');
 }finally{Math.random=savedRandom;}
});

test('Eruption is interruptible by a big hit (a Heavy or an Ultimate) but not by small ones, and either way it is spent',()=>{
 const make=()=>{const r=tlez(),p=player(2900);r.hp=r.maxHP*.2;tickRival(r,.01,p,W,[]);run(r,.5,p);return {r,p};};
 const small=make();hitRival(small.r,3,'player',TB.eruptBreak-20,1);assert.ok(small.r.windup>0&&small.r.stagger===0,'a light hit does not stop it');assert.equal(small.r.attack,'erupt');
 run(small.r,TB.eruptCharge,small.p);assert.equal(small.r.globs!.length+small.r.pools!.length>0,true,'it still goes off');
 const big=make();hitRival(big.r,3,'player',TB.eruptBreak,1);assert.equal(big.r.windup,0,'broken up');assert.ok(big.r.stagger>=TB.eruptStagger,'and staggered for a long opening');assert.ok(big.r.erupted);
 run(big.r,TB.eruptStagger-.3,big.p);assert.equal(big.r.globs!.length,0,'no lava ever left');assert.ok(big.r.stagger>0,'still reeling');
 big.r.stagger=0;const seen=new Set<string>();for(let n=0;n<14;n++){seen.add(pick(big.r,big.p));}assert.ok(!seen.has('erupt'),'a broken Eruption does not come back');
});

test('moves work from a roof: flames and lobs start at his own height and a dive lands at the height he left from',()=>{
 const lift=300,roof=()=>{const r=tlez();r.y=C.ground-r.h-lift;return r;};
 const j=roof();j.attack='jet';j.windup=.01;run(j,.3,player(3000));assert.ok(j.flame&&Math.abs(j.flame.my-(j.y+j.h*.32))<1,'the cone starts at his jaws');
 const l=roof();l.attack='lob';l.windup=.01;tickRival(l,.02,player(3000),W,[]);assert.equal(l.globs!.length,TB.lobs);assert.ok(l.globs!.every(g=>g.y<C.ground-lift),'launched from up there');
 run(l,3,player(3000));assert.ok(l.pools!.every(q=>q.y===C.ground),'and land on the street');
 const d=roof();const y0=d.y;d.attack='dive';d.mark=2900;d.windup=.01;run(d,TB.diveFlight+.2,player(3000));assert.equal(d.y,y0,'he lands at the height he left from');assert.ok(d.pools!.some(q=>q.y===y0+d.h),'the slam pool sits on his roof');
});

test('retreat: at 0 health a retreating Tlézcatl drops every move and attacks no more; one that falls drops them too',()=>{
 const r=tlez(),p=player(2780);r.retreats=true;r.attack='jet';r.windup=.01;run(r,.4,p);
 r.globs=[{x:1,y:1,vx:1,vy:1,grav:1,floor:2,damage:1,size:1,pool:1,poolSeconds:1,life:1}];r.pools=[{x:2700,w:100,y:C.ground,life:3,max:3,damage:5}];r.dive={t:0,x0:1,x1:2,y0:3,y1:4};
 hitRival(r,1e6,'player',300,1);assert.ok(r.retreating&&!r.dead,'retreats, not KO');assert.equal(r.hp,0);
 assert.equal(r.flame,null);assert.deepEqual(r.globs,[]);assert.deepEqual(r.pools,[]);assert.equal(r.dive,null);assert.equal(r.windup,0);
 assert.equal(run(r,5,p).length,0,'no hits while he retreats');assert.deepEqual(r.pools,[]);assert.equal(r.flame,null);assert.equal(r.windup,0);
 const e=tlez();e.attack='erupt';e.windup=1;e.globs=[{x:1,y:1,vx:1,vy:1,grav:1,floor:2,damage:1,size:1,pool:1,poolSeconds:1,life:1}];hitRival(e,1e6);assert.ok(e.dead&&e.globs!.length===0&&e.windup===0);
 const k=tlez();k.retreats=true;k.attack='erupt';k.windup=1;hitRival(k,1e6);assert.ok(k.retreating);assert.equal(k.windup,0);assert.equal(run(k,3,p).length,0);assert.equal(k.globs!.length,0,'a dying Eruption never goes off');
});

test('shared behaviour is kept: slower than the default boss, turns before attacking, still takes the shared hit and stagger rules',()=>{
 assert.ok(TB.speed<P.bossSpeed);const r=tlez(),o=createRival(W,0);o.x=2500;o.face=1;o.cooldown=9;r.cooldown=9;const far=player(4000);run(r,1,far);run(o,1,far);assert.ok(r.x-(2500-r.w/2)<o.x-2500+1);
 const h=tlez();hitRival(h,10,'player',200,1);assert.ok(h.stagger>0&&h.hp===h.maxHP-10,'ordinary stagger still works');assert.equal(hitRival(h,10,'military',200,1),0);
});

const MEX=cityIndexOf('mex'),arena=LEVELS[MEX].findIndex(b=>b.name==='Tlézcatl Arena'),NYC=cityIndexOf('nyc'),empire=LEVELS[NYC].findIndex(b=>b.name==='Empire State');
test('real loop: a flat boss arena (Mexico City\'s Tlézcatl Arena) fights with the kit: telegraph, flame, lobs, pools, burning kaiju',async()=>{
 const h=await bootCampaign(.75,{city:'mex'});
 try{h.test().goto(arena,0);h.step(2);h.test().growTo(3);assert.ok(h.state().rivalState.tlez,'the rival is Tlézcatl');
  const bossX=()=>h.state().rivalState.x;
  // Phase 1: the kaiju stands at mid range until he has flamed it and the street has caught fire.
  let telegraphed=false,flame=0,patches=0,streetFlame=false,burned=0;const hp0=h.state().hp;
  for(let n=0;n<60*30&&h.state().modeNow==='playing'&&!(flame>0&&!h.state().rivalState.flame&&patches>0);n++){h.test().teleport(Math.max(0,bossX()-260));h.step();const r=h.state().rivalState;
   if(r.attack==='jet'&&r.windup>0)telegraphed=true;if(r.flame){assert.ok(telegraphed,'a telegraph comes before the flame');flame++;if(r.flame.street!==null)streetFlame=true;}patches=Math.max(patches,r.patches);}
  assert.ok(flame>0&&streetFlame,`the jet flamed (${flame} frames) down onto the street`);assert.ok(patches>0,'and left fire patches');assert.ok(h.state().hp<hp0,'the kaiju was burned');burned=h.state().damageTaken;assert.ok(burned>0);
  // Phase 2: far away he lobs lava, which leaves pools.
  let lobbed=false,globs=0,pools=0;
  for(let n=0;n<60*40&&h.state().modeNow==='playing'&&!(lobbed&&pools>0);n++){h.test().teleport(Math.max(0,bossX()-700));h.step();const r=h.state().rivalState;if(r.attack==='lob'&&r.windup>0)lobbed=true;globs=Math.max(globs,r.globs);pools=Math.max(pools,r.pools);}
  assert.ok(lobbed,'far away he winds up for lobs');assert.ok(globs>0&&pools>0,'globs flew and left pools');
 }finally{h.release();h.cleanup();}
});

test('real loop: below half health and a quarter, the Dive and the Eruption join the pattern; the kaiju can break the Eruption with a Heavy',async()=>{
 const h=await bootCampaign(.75,{city:'mex'});
 try{h.test().goto(arena,0);h.step(2);h.test().growTo(3);const max=h.state().rivalState.maxHP;h.test().hurtRival(max*.55);
  const seen=new Set<string>();for(let n=0;n<60*40&&h.state().modeNow==='playing';n++){h.test().teleport(Math.max(0,h.state().rivalState.x-300));h.step();const r=h.state().rivalState;if(r.windup>0)seen.add(r.attack);if(r.dive)seen.add('leap');if(seen.has('leap'))break;}
  assert.ok(seen.has('dive')&&seen.has('leap'),`a Magma Dive under half (${[...seen]})`);
  const g=await bootCampaign(.75,{city:'mex'});
  try{g.test().goto(arena,0);g.step(2);g.test().growTo(3);const m=g.state().rivalState.maxHP;g.test().hurtRival(m*.8);let erupted=false,planted:number|null=null;
   for(let n=0;n<60*30&&g.state().modeNow==='playing';n++){g.test().teleport(Math.max(0,g.state().rivalState.x-300));g.step();const r=g.state().rivalState;if(r.attack==='erupt'&&r.windup>0){erupted=true;if(planted===null)planted=r.x;else assert.equal(r.x,planted,'planted');}if(r.erupted&&r.windup===0&&erupted)break;}
   assert.ok(erupted,'an Eruption under a quarter');assert.ok(g.state().rivalState.erupted);}
  finally{g.release();g.cleanup();}
 }finally{h.release();h.cleanup();}
});

test('real loop: a retreating Tlézcatl leaves no lava hanging and does no more damage',async()=>{
 const h=await bootCampaign(.75,{city:'mex'});
 try{h.test().goto(arena,0);h.step(2);h.test().growTo(3);const max=h.state().rivalState.maxHP;
  for(let n=0;n<60*20&&h.state().modeNow==='playing'&&!h.state().rivalState.flame&&h.state().rivalState.globs===0;n++){h.test().teleport(Math.max(0,h.state().rivalState.x-300));h.step();}
  h.test().hurtRival(max*2);h.step(2);const r=h.state().rivalState;assert.ok(r.dead||r.retreating,'the rival is down');assert.equal(r.flame,null);assert.equal(r.globs,0);assert.equal(r.pools,0);assert.equal(r.patches,0);
 }finally{h.release();h.cleanup();}
});

test('hooked up: the NYC Empire State boss level builds the kit (the placeholder is a flat street)',async()=>{
 const h=await bootCampaign(.75,{city:'nyc'});
 try{h.test().goto(empire,0);h.step(2);const s=h.state();assert.ok(s.rivalState.tlez,'the Empire State rival is Tlézcatl');assert.equal(s.blockName,'Empire State');
  const max=s.rivalState.maxHP;h.test().growTo(3);let flame=false,lob=false;
  for(let n=0;n<60*25&&h.state().modeNow==='playing';n++){const gap=Math.floor(n/(60*8))%2?640:260;h.test().teleport(Math.max(0,h.state().rivalState.x-gap));h.step();const r=h.state().rivalState;if(r.flame)flame=true;if(r.globs>0)lob=true;}
  assert.ok(flame||lob,'the placeholder boss fights with the kit');assert.ok(max>0);
 }finally{h.release();h.cleanup();}
});
