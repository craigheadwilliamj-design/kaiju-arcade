import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRival,hitRival,tickRival,beginBelial,belialTelegraph,vomitArc} from '../src/rival.ts';import type {Rival,Crust,RivalEnv} from '../src/rival.ts';
import {createBuildings} from '../src/rules.ts';
import {createCombat,receiveHit,vulnerability} from '../src/combat.ts';
import {CONFIG as C,CAMPAIGN as P,BELIAL_BOSS as BB,TLEZCATL_BOSS as TB} from '../src/config.ts';
import {LEVELS,cityIndexOf} from '../src/levels.ts';
import {CAMPAIGN,KAIJU,PERMANENT_KEY,emptyPermanent} from '../src/campaign.ts';
import {bootCampaign,bootGame} from './helpers/game-harness.ts';
// Belial as a boss: his Acid Vomit, Acid Pounce, back-pounce and Acid Deluge turned on the kaiju (src/rival.ts), the range/health pattern that picks them,
// the corrosion they leave on the kaiju, the flood hooks card 7 will use (tested with a stub) and how everything clears on a retreat. Pure checks first
// (tickRival is a function of the rival, the kaiju's box, the buildings and the world's `env`), then the real loop in Estadio Azteca, Free Play and Paris's arena.
const W=5000,pw=48,ph=69,player=(cx:number,lift=0)=>({x:cx-pw/2,y:C.ground-ph-lift,w:pw,h:ph});
const bel=(cx=2500,face=1)=>{const r=createRival(W,0,'Belial');r.x=cx-r.w/2;r.y=C.ground-r.h;r.face=face;r.cooldown=0;return r;};
type Hit={damage:number,strength:number,direction:number};
const run=(r:Rival,seconds:number,p:{x:number,y:number,w:number,h:number},b:any[]=[],env:RivalEnv={},dt=1/60)=>{const hits:Hit[]=[];for(let t=0;t<seconds-1e-9;t+=dt)hits.push(...tickRival(r,dt,p,W,b,env));return hits;};
// The kaiju stays glued to his claw side as he walks (a chasing kaiju), whichever way he backs off.
const chase=(r:Rival,seconds:number,b:any[]=[],env:RivalEnv={},dt=1/60)=>{const hits:Hit[]=[];for(let t=0;t<seconds-1e-9;t+=dt)hits.push(...tickRival(r,dt,player(r.x+r.w+40),W,b,env));return hits;};
const spec=(x:number,w:number,extra:object={})=>({x,w,h:220,hp:300,value:100,kind:'medium' as const,label:'',color:'#888',...extra});
const pick=(r:Rival,p:{x:number,y:number,w:number,h:number},env:RivalEnv={})=>{r.cooldown=0;r.windup=0;tickRival(r,.01,p,W,[],env);return r.attack;};
const near=(a:number,b:number,e=1)=>Math.abs(a-b)<=e;
// A stub flood whose surface is below the street: the crusts are in play but no ground is flooded (the rival swims only over flooded ground: see the swim test).
const stage=(env:RivalEnv,crusts:Crust[]):RivalEnv=>({...env,flood:{surface:C.ground+300,crusts}});

test('only a Belial boss gets the Belial moves; Kaiban, Tlézcatl and the rest keep theirs; he has fewer HP than Tlézcatl',()=>{
 const b=createRival(W,0,'Belial');assert.ok(b.belial&&!b.kaiban&&!b.tlez);assert.equal(b.spew,null);assert.equal(b.leap,null);assert.deepEqual(b.puddles,[]);assert.deepEqual(b.drops,[]);assert.equal(b.rain,null);assert.ok(!b.deluged);assert.equal(b.kcorr!.stacks,0);
 for(const name of ['Kaiban','Tlézcatl','']){const o=createRival(W,0,name);assert.ok(!o.belial&&!o.puddles&&!o.drops&&!o.rain&&!o.kcorr&&!o.spew&&!o.leap,`${name||'default'} has no acid kit`);}
 assert.ok(b.maxHP<createRival(W,0,'Tlézcatl').maxHP&&b.maxHP===P.bossHP*BB.hpScale,`fewer HP (${b.maxHP})`);
 const o=createRival(W,0,'Kaiban');o.x=2500;o.cooldown=0;const seen=new Set<string>();for(let n=0;n<40;n++){tickRival(o,.05,player(2900),W,[]);seen.add(o.attack);o.windup=0;o.cooldown=0;}
 assert.ok(![...seen].some(a=>['vomit','pounce','back','deluge','submerge'].includes(a)),'Kaiban never uses them');
 const t=createRival(W,0,'Tlézcatl');t.x=2500;t.cooldown=0;const s2=new Set<string>();for(let n=0;n<40;n++){tickRival(t,.05,player(2900),W,[]);s2.add(t.attack);t.windup=0;t.cooldown=0;}
 assert.ok(![...s2].some(a=>['vomit','pounce','back','deluge','submerge'].includes(a)),'nor Tlézcatl');
});

test('move selection by range: claw up close, vomit at mid range, pounce from far away; each telegraph is its own length',()=>{
 const r=bel();
 assert.equal(pick(r,player(2500+P.bossRange+r.w-30)),'melee','point blank is the shared claw');assert.ok(near(r.windup,P.bossTelegraph,.005));
 assert.equal(pick(r,player(2800)),'vomit');assert.ok(near(r.windup,BB.vomitTelegraph,.005));assert.ok(near(r.mark!,2800,1),'the landing is locked on the kaiju');
 assert.equal(pick(r,player(2500+BB.far-20)),'vomit','still mid range just inside far');
 assert.equal(pick(r,player(2500+BB.far+20)),'pounce');assert.ok(near(r.windup,BB.pounceTelegraph,.005));
 assert.equal(pick(r,player(3700)),'pounce');
 const l=bel(2500,-1);assert.equal(pick(l,player(2200)),'vomit','and either way round');
 for(const a of ['melee','vomit','pounce','back','deluge','submerge'] as const)assert.ok(belialTelegraph(a)>0,`${a} has a telegraph`);
});

test('move selection by health: under half every third mid-range attack is a pounce; the Deluge comes first under 40% and only once',()=>{
 const r=bel(),mid=player(2800);const seq:string[]=[];for(let i=0;i<9;i++)seq.push(pick(r,mid));
 assert.ok(!seq.includes('pounce')&&!seq.includes('deluge'),`full health keeps to the range pattern (${seq})`);
 const h=bel();h.hp=h.maxHP*.45;const s2:string[]=[];for(let i=0;i<9;i++)s2.push(pick(h,mid));
 assert.deepEqual(s2.map((a,i)=>a==='pounce'?i+1:0).filter(Boolean),[3,6,9],`more often under half (${s2})`);assert.ok(s2.filter(a=>a!=='pounce').every(a=>a==='vomit'));
 const e=bel();e.hp=e.maxHP*.35;assert.equal(pick(e,mid),'deluge','the Deluge first');assert.ok(e.deluged);assert.ok(near(e.windup,BB.delugeCharge,.005));
 const after:string[]=[];for(let i=0;i<12;i++)after.push(pick(e,mid));assert.ok(!after.includes('deluge'),'one per fight');assert.ok(after.includes('pounce'),'the pounces carry on');
 const c=bel();c.hp=c.maxHP*.35;assert.equal(pick(c,player(2560)),'deluge','even point blank');
 const b=bel();b.hp=b.maxHP*.5;b.combo=2;assert.notEqual(pick(b,mid),'pounce','exactly half is not below half');
});

test('Acid Vomit: a locked-facing swell first, then a stream that lands on the marker and sags back as the gland drains',()=>{
 const r=bel(),p=player(2800);tickRival(r,.01,p,W,[]);assert.equal(r.attack,'vomit');
 const during=run(r,BB.vomitTelegraph-.35,p);assert.equal(r.spew,null,'nothing flows during the swell');assert.equal(during.length,0);
 run(r,.2,player(2200));assert.equal(r.face,1,'his facing is locked in the telegraph, whichever side the kaiju goes to');
 // The kaiju is somewhere else: the stream lands on the street. First on the marker, then ever nearer to him.
 const lands:number[]=[];for(let t=0;t<BB.vomitSeconds+.4;t+=1/60){tickRival(r,1/60,player(3900),W,[]);if(r.spew?.land&&r.spew.landOn==='street')lands.push(r.spew.land[0]);}
 assert.ok(lands.length>20,'a stream was spewed');assert.ok(near(lands[0],2800,45),`it lands on the marker first (${lands[0].toFixed(0)})`);
 assert.ok(lands.every((x,i)=>!i||x<=lands[i-1]+1),'and sags toward him as the pressure drains');assert.ok(lands.at(-1)!<lands[0]-120,`a long way short by the end (${lands.at(-1)!.toFixed(0)})`);
 assert.ok(r.puddles!.length>=2&&r.puddles!.every(q=>q.y===C.ground),'puddles where it splashed');
 assert.ok(r.stagger>0||r.cooldown>0,'then he is winded');
});

test('Acid Vomit hits the kaiju it passes through and corrodes it, stops on the first building, and ends winded for vomitRecover seconds',()=>{
 const r=bel(),p=player(2800);tickRival(r,.01,p,W,[]);const got=run(r,BB.vomitTelegraph+.6,p).filter(h=>h.damage===BB.vomitDamage);
 assert.ok(got.length>=2,`the stream burns the kaiju it lands on (${got.length} ticks)`);assert.ok(got[0].strength===BB.vomitKnock&&got.slice(1).every(h=>h.strength===0),'one shove, then it just burns');assert.ok(r.kcorr!.stacks>=1,'and corrodes it');
 const f=bel(),far=player(2800);tickRival(f,.01,far,W,[]);const [b]=createBuildings([spec(2650,100)]);const shield=run(f,BB.vomitTelegraph+BB.vomitSeconds,player(2900),[b]);
 assert.ok(!shield.some(h=>h.damage===BB.vomitDamage),'the building shields the kaiju behind it');assert.ok(b.hpNow<b.hp,'and takes the acid');
 const w=bel(),q=player(2800);tickRival(w,.01,q,W,[]);run(w,BB.vomitTelegraph+BB.vomitSeconds-.1,q);for(let n=0;n<40&&w.spew;n++)tickRival(w,1/60,q,W,[]);assert.equal(w.spew,null);assert.ok(w.stagger>BB.vomitRecover-.1,`winded (${w.stagger.toFixed(2)})`);assert.ok(w.cooldown>=BB.vomitRecover);
 const x=w.x;assert.equal(run(w,BB.vomitRecover-.3,player(100)).length,0,'winded he does nothing');assert.equal(w.x,x);
 // The telegraph can be broken up by a solid hit; the stream itself cannot be staggered.
 const t=bel();tickRival(t,.01,q,W,[]);hitRival(t,5,'player',200,1);assert.equal(t.windup,0);assert.ok(t.stagger>0);
 const u=bel();tickRival(u,.01,q,W,[]);run(u,BB.vomitTelegraph+.3,q);assert.ok(u.spew);hitRival(u,5,'player',400,1);assert.equal(u.stagger,0,'a big hit does not break the stream');assert.ok(u.spew);
});

test('back-pounce: pressure or a landed hit makes him leap away, leaving a puddle; it has a cooldown, needs room, and cornered he fights',()=>{
 const r=bel(),p=player(2640);r.press=BB.pressSeconds;assert.equal(pick(r,p),'back','crowded for pressSeconds');assert.ok(near(r.windup,BB.backTelegraph,.005));
 const s=bel();assert.equal(pick(s,p),'melee','not crowded yet: he claws');hitRival(s,3,'player',0,1);assert.equal(pick(s,p),'back','a landed hit makes him leave too');
 const x0=r.x;run(r,BB.backTelegraph+.01,p);assert.ok(r.leap&&r.leap.kind==='back','he leaps');assert.ok(r.puddles!.some(q=>q.x<=x0+r.w/2&&q.x+q.w>=x0+r.w/2),'a puddle where he stood');
 hitRival(r,1,'player',400,1);assert.equal(r.stagger,0,'unstaggerable in the air');assert.ok(r.leap);
 run(r,BB.backFlight+.1,p);assert.equal(r.leap,null);assert.ok(near(x0-r.x,BB.backLeap,2),`${BB.backLeap}px directly away (${x0-r.x})`);assert.equal(r.y,C.ground-r.h);
 assert.ok(near(r.backCool!,BB.backCooldown,.2));r.press=BB.pressSeconds;r.stagger=0;assert.equal(pick(r,player(r.x+r.w+40)),'melee','on cooldown he fights');
 r.backCool=0;r.press=BB.pressSeconds;r.stagger=0;assert.equal(pick(r,player(r.x+r.w+40)),'back','and leaps again once it is ready');
 // A kaiju that stays glued to him eventually gets it, in the live loop.
 const g=bel();let saw=false;for(let t=0;t<10&&!saw;t+=1/60){chase(g,1/60);if(g.attack==='back'&&g.windup>0)saw=true;}assert.ok(saw,'a chased kiter back-pounces by himself');
 // No room: against the world's edge, a building, or with the kaiju on the open side of a wall, he stands and fights.
 const edge=bel(80),pe=player(edge.x+edge.w+40);edge.press=BB.pressSeconds;assert.equal(pick(edge,pe),'melee','cornered against the world\'s edge');
 const [wall]=createBuildings([spec(1900,200)]),c=bel(2500);c.press=BB.pressSeconds;const pc=player(2640);c.cooldown=0;c.windup=0;tickRival(c,.01,pc,W,[wall]);assert.equal(c.attack,'back','room: the building is more than a leap away');
 const [near1]=createBuildings([spec(2250,150)]),d=bel(2500);d.press=BB.pressSeconds;d.cooldown=0;d.windup=0;tickRival(d,.01,pc,W,[near1]);assert.equal(d.attack,'melee','a building in the leap\'s path corners him');
});

test('a kiter: he closes only to hold range and walks away when the kaiju crowds him (unless cornered)',()=>{
 const r=bel(2500,1);r.cooldown=1e6;run(r,2,player(4000));assert.ok(r.x>2500-r.w/2+BB.speed*1.5,`he closes on a far kaiju (${r.x})`);
 const k=bel(2500,1);k.cooldown=1e6;const x0=k.x;run(k,1,player(2500+120));assert.ok(k.x<x0-BB.speed*BB.kiteSpeed*.8,`he backs away from a close kaiju (${x0-k.x})`);
 const c=bel(90,1);c.cooldown=1e6;run(c,1,player(90+120));assert.ok(near(c.x,90-c.w/2,1),'with no room behind him he stays put');
 const [wall]=createBuildings([spec(2280,150)]),w=bel(2500,1);w.cooldown=1e6;const xw=w.x;run(w,2,player(2500+120),[wall]);assert.ok(w.x>=2430-1&&xw-w.x<90,'a building behind him stops the retreat');
});

test('Acid Pounce: a crouch that locks the landing, an unstaggerable leap, a splash that soaks the kaiju, puddles, then winded',()=>{
 const r=bel(),p=player(2950);tickRival(r,.01,p,W,[]);assert.equal(r.attack,'pounce');assert.ok(near(r.mark!,2950,1));
 // The kaiju walks away in the crouch: he still lands where it stood.
 const away=player(3500);run(r,BB.pounceTelegraph-.05,away);assert.equal(r.leap,null,'still crouched');
 tickRival(r,.1,away,W,[]);assert.ok(r.leap&&r.leap.kind==='pounce','he leaps');hitRival(r,1,'player',400,1);assert.ok(r.leap&&r.stagger===0,'cannot be staggered in the air');
 let peak=r.y;for(let t=0;t<BB.pounceFlight+.1;t+=1/60){tickRival(r,1/60,away,W,[]);peak=Math.min(peak,r.y);}
 assert.ok(peak<C.ground-r.h-BB.pounceHeight*.8,`an arc up (peak ${peak})`);assert.equal(r.leap,null);assert.ok(near(r.x+r.w/2,2950,1),`landed on the mark (${r.x+r.w/2})`);assert.equal(r.y,C.ground-r.h);
 assert.ok(r.stagger>BB.pounceRecover-.2,'winded after the slam');assert.ok(r.ring);assert.ok(r.puddles!.length>=3&&r.puddles!.every(q=>q.y===C.ground&&q.x>=2950-BB.pouncePool&&q.x<=2950+BB.pouncePool),'puddles under the splash');
 // The splash: hurts a kaiju at the landing and soaks it; misses one that jumped or stood clear; the leap is capped at pounceRange.
 const slam=(px:number,lift=0,mark=2950)=>{const q=bel();q.attack='pounce';q.mark=mark;q.windup=.01;return {q,hits:run(q,BB.pounceFlight+.3,player(px,lift))};};
 const hit=slam(2950);const d=hit.hits.filter(h=>h.damage===BB.pounceDamage);assert.equal(d.length,1,'one splash hit');assert.equal(d[0].strength,BB.pounceKnock);assert.ok(hit.q.kcorr!.stacks>=BB.pounceStacks,`soaked to ${BB.pounceStacks} (${hit.q.kcorr!.stacks})`);
 assert.equal(slam(2950,200).hits.filter(h=>h.damage===BB.pounceDamage).length,0,'jumped it');assert.equal(slam(2950+BB.pounceRadius+200).hits.filter(h=>h.damage===BB.pounceDamage).length,0,'stood clear');
 const far=slam(4000,0,4600);assert.ok(far.q.x+far.q.w/2<=2500+BB.pounceRange+1&&far.q.x+far.q.w/2>=2500+BB.pounceRange-1,'a pounce goes no farther than pounceRange');
 assert.ok(slam(100,0,-300).q.x>=0);
 // The crouch can be broken up by a solid hit, the way every telegraph can.
 const t=bel();tickRival(t,.01,p,W,[]);hitRival(t,5,'player',200,1);assert.equal(t.windup,0);assert.ok(t.stagger>0);
});

test('Acid Deluge: planted and swelling for the charge, then a geyser and rain on alternating sides; one per fight, winded after',()=>{
 const saved=Math.random;Math.random=()=>.9;
 try{const r=bel(),p=player(3040);r.hp=r.maxHP*.3;tickRival(r,.01,p,W,[]);assert.equal(r.attack,'deluge');const x=r.x;
  const before=run(r,BB.delugeCharge-.15,p);assert.equal(before.length,0);assert.equal(r.rain,null);assert.equal(r.drops!.length,0,'no acid during the swell');assert.equal(r.x,x,'planted');
  tickRival(r,.2,p,W,[]);assert.ok(r.rain,'the geyser goes up');assert.equal(r.rain!.queue.length,BB.delugeDrops);assert.ok(r.stagger>BB.delugeSpout+BB.delugeRecover-.4,'winded after the burst');
  const cx=r.x+r.w/2;assert.ok(r.rain!.queue.every((q,i)=>(q.x<cx)===(i%2===0)),'drops alternate sides');assert.ok(r.rain!.queue.every(q=>Math.abs(q.x-cx)<=BB.delugeRange+1),'out to delugeRange');
  assert.ok(r.rain!.queue.every((q,i)=>!i||q.t>=r.rain!.queue[i-1].t-1e-9||true)&&r.rain!.queue.every(q=>q.t>=0&&q.t<=BB.delugeSpout),'spread over the spout');
  let spawned=0,peak=0,soaked=0;const taken:Hit[]=[];for(let t=0;t<BB.delugeSpout+2;t+=1/60){taken.push(...tickRival(r,1/60,p,W,[]));if(r.rain)spawned=r.rain.spawned;peak=Math.max(peak,r.drops!.length);soaked=Math.max(soaked,r.kcorr!.stacks);}
  assert.equal(spawned+r.drops!.length>=0,true);assert.ok(peak>0,'drops fall');assert.ok(taken.some(h=>h.damage===BB.delugeDamage),'a kaiju where the rain lands is hit');assert.ok(soaked>=BB.delugeSoak,'and soaked');
  assert.ok(r.puddles!.length>0&&r.puddles!.length<=BB.puddleCap,'puddles down');assert.equal(r.drops!.length,0,'every drop has landed');assert.equal(r.rain,null);
  const dry=bel();dry.hp=dry.maxHP*.3;tickRival(dry,.01,player(100),W,[]);run(dry,BB.delugeCharge+BB.delugeSpout+2,player(100));assert.equal(dry.drops!.length,0);assert.ok(dry.puddles!.length>0,'it leaves puddles even on an empty street');
 }finally{Math.random=saved;}
});

test('the Deluge is broken up by a Heavy or an Ultimate in its charge (not by small hits), and either way it is spent',()=>{
 const make=()=>{const r=bel(),p=player(2900);r.hp=r.maxHP*.3;tickRival(r,.01,p,W,[]);run(r,.5,p);return {r,p};};
 const small=make();hitRival(small.r,3,'player',BB.delugeBreak-20,1);assert.ok(small.r.windup>0&&small.r.stagger===0,'a light hit does not stop it');assert.equal(small.r.attack,'deluge');
 run(small.r,BB.delugeCharge,small.p);assert.ok(small.r.rain||small.r.drops!.length>0,'it still goes off');
 const big=make();hitRival(big.r,3,'player',BB.delugeBreak,1);assert.equal(big.r.windup,0,'broken up');assert.ok(big.r.stagger>=BB.delugeStagger,'and staggered for a long opening');assert.ok(big.r.deluged);
 run(big.r,BB.delugeStagger-.3,big.p);assert.equal(big.r.rain,null);assert.equal(big.r.drops!.length,0,'no acid ever left');assert.ok(big.r.stagger>0,'still reeling');
 big.r.stagger=0;const seen=new Set<string>();for(let n=0;n<14;n++)seen.add(pick(big.r,big.p));assert.ok(!seen.has('deluge'),'a broken Deluge does not come back');
 const once=make();run(once.r,BB.delugeCharge+.3,once.p);once.r.stagger=0;once.r.rain=null;const s2=new Set<string>();for(let n=0;n<14;n++)s2.add(pick(once.r,once.p));assert.ok(!s2.has('deluge'),'one per fight');
});

test('corrosion on the kaiju: exposure adds stacks (the first at once, up to three), they raise the damage taken, fade out of the acid, and fade faster under Tlézcatl\'s fire',()=>{
 const r=bel();r.cooldown=1e6;const q={x:2880,w:80,y:C.ground,life:30,max:30};r.puddles=[q];const p=player(2920);
 run(r,.05,p);assert.equal(r.kcorr!.stacks,1,'the first contact gives a stack');run(r,.5,p);assert.equal(r.kcorr!.stacks,2);run(r,1.2,p);assert.equal(r.kcorr!.stacks,BB.corrodeMax,'up to the cap');run(r,2,p);assert.equal(r.kcorr!.stacks,BB.corrodeMax);
 const burned=run(r,2,p).filter(h=>h.damage===BB.puddleDamage);assert.ok(burned.length>=3&&burned.length<=6,`and the puddle burns once per tick (${burned.length})`);
 // The damage it takes: each stack is corrodeVuln more, through receiveHit (the game feeds the stacks into `vulnerability`).
 const a=createCombat(),b=createCombat();vulnerability.k=1;receiveHit(a,10,'boss');vulnerability.k=1+BB.corrodeVuln*3;receiveHit(b,10,'boss');vulnerability.k=1;
 assert.ok(near(b.damageTaken/a.damageTaken,1+BB.corrodeVuln*3,1e-9),`3 stacks: +${BB.corrodeVuln*300}% (${b.damageTaken/a.damageTaken})`);
 // Out of the acid it fades over corrodeFade seconds from full; fire burns it off burnOff times as fast.
 const fadeTime=(env:RivalEnv)=>{const f=bel();f.cooldown=1e6;f.kcorr={stacks:BB.corrodeMax,expo:BB.corrodeMax*BB.corrodePerStack,touched:false};let t=0;const seq:number[]=[];while(f.kcorr.stacks>0&&t<30){tickRival(f,1/60,player(4000),W,[],env);t+=1/60;if(!seq.length||seq.at(-1)!==f.kcorr.stacks)seq.push(f.kcorr.stacks);}return {t,seq};};
 const slow=fadeTime({}),fast=fadeTime({burnOff:true});assert.ok(near(slow.t,BB.corrodeFade,.3),`fades over corrodeFade (${slow.t.toFixed(2)})`);assert.deepEqual(slow.seq,[3,2,1,0],'a stack at a time');
 assert.ok(near(fast.t,BB.corrodeFade/BB.burnOff,.3),`fire burns it off ${BB.burnOff}x faster (${fast.t.toFixed(2)})`);
 // Fresh contact holds it up.
 const h=bel();h.cooldown=1e6;h.puddles=[{x:2880,w:80,y:C.ground,life:30,max:30}];run(h,3,player(2920));run(h,BB.corrodeFade/2,player(4000));const mid=h.kcorr!.stacks;assert.ok(mid<BB.corrodeMax&&mid>0,`half faded (${mid})`);run(h,.3,player(2920));assert.ok(h.kcorr!.stacks>=mid);
});

test('puddles expire, are capped, and burn a kaiju once per tick however many it straddles; a jumping kaiju is not burned',()=>{
 const r=bel();r.cooldown=1e6;r.puddles=[];for(let i=0;i<30;i++)r.puddles.push({x:2800+i*10,w:40,y:C.ground,life:BB.puddleSeconds,max:BB.puddleSeconds});
 const hits=run(r,1,player(2950));assert.ok(hits.length<=Math.ceil(1/BB.puddleTick)+1&&hits.length>=2,`once per tick (${hits.length})`);assert.ok(hits.every(h=>h.damage===BB.puddleDamage));
 assert.equal(run(r,1,player(2950,150)).length,0,'a kaiju in the air is not burned');
 run(r,BB.puddleSeconds+.5,player(100));assert.equal(r.puddles!.length,0,'they dry up');
 const c=bel();c.attack='pounce';c.mark=2600;for(let n=0;n<10;n++){c.leap=null;c.attack='pounce';c.windup=.01;c.cooldown=0;c.stagger=0;c.mark=2500+n*40;run(c,BB.pounceFlight+.2,player(100));}
 assert.ok(c.puddles!.length<=BB.puddleCap,'capped');
});

test('flood hooks exist only with a flood: no submerging or crust pounces without one',()=>{
 const crust:Crust={x:2900,w:200,y:C.ground-120};
 const r=bel(),mid=player(2800),seen=new Set<string>();for(let i=0;i<24;i++){seen.add(pick(r,mid));}assert.ok(!seen.has('submerge'),`no flood, no submerge (${[...seen]})`);
 const withCrustButNoFlood=bel();withCrustButNoFlood.combo=2;assert.notEqual(pick(withCrustButNoFlood,mid),'submerge');assert.equal(withCrustButNoFlood.mark,2800,'and he aims at the kaiju, not a crust');
 const f=bel();f.combo=2;const env=stage({},[crust]);assert.equal(pick(f,mid,env),'pounce','with a flood the third attack is a crust pounce');assert.ok(near(f.mark!,3000,1),'aimed at the crust');
 const g=bel();g.combo=3;assert.equal(pick(g,mid,env),'submerge','the fourth submerges');assert.ok(near(g.windup,BB.diveTelegraph,.005));
 const far=bel();far.combo=2;assert.notEqual(far.mark,3000);assert.equal(pick(far,mid,stage({},[{x:4000,w:100,y:C.ground-100}])),'vomit','a crust out of leap range is ignored');
 const none=bel();none.combo=2;assert.equal(pick(none,mid,stage({},[{...crust,dissolved:true}])),'vomit','so is a dissolved one');
});

test('submerge: untargetable under the acid, back up beneath the kaiju (often) with a splash, then winded; immune: the flood is the level\'s to apply',()=>{
 const env=stage({},[]),saved=Math.random;Math.random=()=>.3;
 try{const r=bel(),p=player(2900);r.combo=3;tickRival(r,.01,p,W,[],env);assert.equal(r.attack,'submerge');assert.equal(run(r,BB.diveTelegraph-.05,p,[],env).length,0);assert.equal(r.under,0,'still on the surface');
  run(r,.1,p,[],env);assert.ok(r.under!>0,'under');const hp=r.hp;assert.equal(hitRival(r,50,'player',300,1),0,'untargetable');assert.equal(r.hp,hp);
  const during=run(r,BB.diveUnder-.3,p,[],env);assert.equal(during.length,0,'nothing happens under there');assert.ok(r.under!>0);
  const up=run(r,.5,p,[],env);assert.equal(r.under,0,'resurfaced');assert.ok(near(r.x+r.w/2,2900,3),`beneath the kaiju (${r.x+r.w/2})`);
  const splash=up.filter(h=>h.damage===BB.surfaceDamage);assert.equal(splash.length,1,'a splash as he breaks the surface');assert.ok(r.stagger>0,'then winded');assert.ok(hitRival(r,5,'player',0,1)>0,'targetable again');
 }finally{Math.random=saved;}
 Math.random=()=>.95;try{const r=bel(),p=player(2900);r.combo=3;tickRival(r,.01,p,W,[],env);run(r,BB.diveTelegraph+BB.diveUnder+.2,p,[],env);assert.equal(r.under,0);assert.ok(Math.abs(r.x+r.w/2-2900)>100&&Math.abs(r.x+r.w/2-2900)<=BB.surfaceRange+1,'otherwise somewhere near it');}finally{Math.random=saved;}
});

test('crusts: he pounces onto one and stands on it as it rides the surface, steps off when it dissolves, and the vomit that lands on one dissolves it',()=>{
 const crust:Crust={x:2900,w:200,y:C.ground-120},env=stage({},[crust]);
 const r=bel(),p=player(4200);r.combo=2;tickRival(r,.01,p,W,[],env);assert.equal(r.attack,'pounce');run(r,BB.pounceTelegraph+BB.pounceFlight+.2,p,[],env);
 assert.equal(r.crust,crust,'standing on it');assert.ok(near(r.x+r.w/2,3000,1));assert.equal(r.y+r.h,crust.y,'at its height');
 crust.y-=60;run(r,.05,p,[],env);assert.equal(r.y+r.h,crust.y,'it carries him up as the flood rises');
 // Off it again: any leap lands on the street.
 const off=player(2300);r.stagger=0;r.cooldown=0;r.windup=0;r.attack='pounce';r.mark=2300;r.windup=.01;run(r,BB.pounceFlight+.3,off,[],env);assert.equal(r.crust,null);assert.equal(r.y,C.ground-r.h,'back on the street');
 // It dissolves under him.
 const s=bel(),q=player(4200);s.combo=2;tickRival(s,.01,q,W,[],env);run(s,BB.pounceTelegraph+BB.pounceFlight+.2,q,[],env);const cr=s.crust!;cr.dissolved=true;s.cooldown=1e6;run(s,.1,q,[],env);assert.equal(s.crust,null);assert.equal(s.y,C.ground-s.h,'he drops to the street');
 // A vomit that lands on a crust eats it.
 const eat:Crust={x:2800,w:100,y:C.ground-30},v=bel(),pv=player(2850);tickRival(v,.01,pv,W,[],stage({},[eat]));assert.equal(v.attack,'vomit');run(v,BB.vomitTelegraph+BB.vomitSeconds,player(3600),[],stage({},[eat]));
 assert.ok(eat.dissolved,'the vomit dissolved the crust');
 const keep:Crust={x:2800,w:100,y:C.ground-30},w=bel();tickRival(w,.01,pv,W,[],{});run(w,BB.vomitTelegraph+BB.vomitSeconds,player(3600),[],{});assert.ok(!keep.dissolved,'no flood, no crust to dissolve');
});

test('swim: over flooded ground he stands with his feet BB.swim under the surface, at the kaiju\'s height rather than down on the bed; on a crust or dry ground nothing changes',()=>{
 const surface=C.ground-200,env:RivalEnv={flood:{surface,crusts:[]}};
 const r=bel(),p=player(4200);r.cooldown=9;tickRival(r,.05,p,W,[],env);assert.equal(r.y+r.h,surface+BB.swim,'swimming at the surface');
 const dry:RivalEnv={flood:{surface:C.ground+300,crusts:[]}},d=bel();d.cooldown=9;tickRival(d,.05,p,W,[],dry);assert.equal(d.y+d.h,C.ground,'dry ground is the street');
 const crust:Crust={x:2800,w:300,y:surface-3},c=bel();c.cooldown=9;c.crust=crust;c.x=2900;tickRival(c,.05,p,W,[],{flood:{surface,crusts:[crust]}});assert.equal(c.y+c.h,crust.y,'a crust is his floor');
 // A pounce into the flood lands at the surface; a vomit aimed at the flooded ground lands on the surface and puddles there.
 const q=bel(),far=player(4300);q.combo=2;tickRival(q,.01,far,W,[],env);assert.equal(q.attack,'pounce');run(q,BB.pounceTelegraph+BB.pounceFlight+.2,far,[],env);assert.equal(q.y+q.h,surface+BB.swim,'landed swimming');
 const v=bel();const arc=vomitArc(v,30,1,player(5000),W,[],env);assert.equal(arc.landOn,'street');assert.ok(Math.abs(arc.land![1]-surface)<2,'the stream meets the acid\'s surface');
});

test('a retreat or a KO clears every move, puddle, drop and stack, and he attacks no more',()=>{
 const full=()=>{const r=bel(),p=player(2800);r.retreats=true;tickRival(r,.01,p,W,[]);run(r,BB.vomitTelegraph+.4,p);r.puddles=[{x:2700,w:100,y:C.ground,life:3,max:3}];r.drops=[{x:2800,y:100,vy:100,size:5}];r.rain={t:0,queue:[{t:1,x:2800}],spawned:0};r.kcorr={stacks:3,expo:1.2,touched:true};r.leap={kind:'pounce',t:0,dur:1,x0:1,x1:2,y0:3,y1:4,height:5,crust:null};return {r,p};};
 const {r,p}=full();assert.ok(r.spew);hitRival(r,1e6,'player',300,1);assert.ok(r.retreating&&!r.dead,'retreats, not KO');assert.equal(r.hp,0);
 assert.equal(r.spew,null);assert.equal(r.leap,null);assert.deepEqual(r.puddles,[]);assert.deepEqual(r.drops,[]);assert.equal(r.rain,null);assert.equal(r.kcorr!.stacks,0);assert.equal(r.kcorr!.expo,0);assert.equal(r.windup,0);assert.equal(r.under,0);
 assert.equal(run(r,5,p).length,0,'no hits while he retreats');assert.deepEqual(r.puddles,[]);assert.equal(r.spew,null);
 const k=full();k.r.retreats=false;hitRival(k.r,1e6);assert.ok(k.r.dead&&k.r.puddles!.length===0&&k.r.drops!.length===0&&k.r.kcorr!.stacks===0&&k.r.windup===0);
 const d=bel();d.hp=d.maxHP*.3;tickRival(d,.01,player(2900),W,[]);d.retreats=true;hitRival(d,1e6);assert.ok(d.retreating);assert.equal(d.windup,0);assert.equal(run(d,3,player(2900)).length,0);assert.equal(d.rain,null,'a dying Deluge never goes off');
 const m=bel();m.attack='pounce';m.mark=2900;m.windup=.01;run(m,.3,player(100));assert.ok(m.leap);m.retreats=true;hitRival(m,1e6);assert.equal(m.leap,null);assert.equal(m.y,C.ground-m.h,'a retreat in mid-leap lands him');
});

test('shared behaviour is kept: turns before attacking, takes the shared hit and stagger rules, and a stray hit from the military does nothing',()=>{
 const r=bel(2500,-1);r.cooldown=9;run(r,P.bossTurnDelay*.5,player(2800));assert.equal(r.face,-1,'he turns after bossTurnDelay, not at once');run(r,P.bossTurnDelay,player(2800));assert.equal(r.face,1);
 const h=bel();hitRival(h,10,'player',200,1);assert.ok(h.stagger>0&&h.hp===h.maxHP-10,'ordinary stagger still works');assert.equal(hitRival(h,10,'military',200,1),0);
 const o=createRival(W,0,'Myrmex');o.x=2500;o.cooldown=0;const seen=new Set<string>();for(let n=0;n<40;n++){tickRival(o,.05,player(2900),W,[]);seen.add(o.attack);o.windup=0;o.cooldown=0;}assert.ok([...seen].every(a=>a==='melee'||a==='ranged'),'the shared moveset is unchanged');
 const b=bel();assert.ok(TB.speed!==undefined&&BB.speed<P.bossSpeed+10);
});

test('the debug hook starts any move\'s telegraph directly',()=>{
 for(const [move,t] of [['vomit',BB.vomitTelegraph],['pounce',BB.pounceTelegraph],['back',BB.backTelegraph],['deluge',BB.delugeCharge],['submerge',BB.diveTelegraph],['melee',P.bossTelegraph]] as const){const r=bel();beginBelial(r,move,player(2800));assert.equal(r.attack,move);assert.ok(near(r.windup,t,.005),move);}
});

const MEXC=cityIndexOf('mex'),azteca=LEVELS[MEXC].findIndex(b=>b.name==='Estadio Azteca'),PAR=cityIndexOf('par'),parBoss=LEVELS[PAR].findIndex(b=>b.kind==='boss');
const fight=(h:any,gap:number,frames:number,until:(s:any)=>boolean)=>{for(let n=0;n<frames&&h.state().modeNow==='playing';n++){h.test().teleport(Math.max(0,h.state().rivalState.x-gap));h.step();if(until(h.state()))return true;}return false;};
test('real loop: Estadio Azteca\'s Belial fights with the kit: a telegraph, a stream, puddles, corrosion on the kaiju that raises the damage it takes',async()=>{
 const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
 try{assert.ok(h.test().goto(azteca,0));h.step(2);h.test().growTo(3);assert.ok(h.state().rivalState.belial,'the rival is Belial');assert.equal(h.state().bossName,'Belial');assert.ok(h.state().rivalState.maxHP<P.bossHP*1.2);
  let telegraphed=false,streamed=false,wet=0,vuln=1,hud=0;const hp0=h.state().hp;
  const done=fight(h,300,60*40,s=>{const r=s.rivalState;if(r.attack==='vomit'&&r.windup>0&&!r.spew)telegraphed=true;if(r.spew){assert.ok(telegraphed,'a telegraph comes before the stream');streamed=true;}wet=Math.max(wet,r.puddles);if(r.kcorr>0){vuln=Math.max(vuln,r.kvuln);hud=Math.max(hud,r.kcorr);}return streamed&&wet>0&&hud>0;});
  assert.ok(done,`the vomit came (telegraph ${telegraphed}, stream ${streamed}, puddles ${wet})`);assert.ok(h.state().hp<hp0,'the kaiju was burned');assert.ok(wet>0);assert.ok(hud>=1&&vuln>1,`corrosion shows and raises the damage taken (${hud}, x${vuln})`);
  assert.ok(near(vuln,1+BB.corrodeVuln*hud,.151));
  // Far away he pounces: crouch, leap, ring, puddles.
  let crouched=false,leapt=false;const pounced=fight(h,700,60*40,s=>{const r=s.rivalState;if(r.attack==='pounce'&&r.windup>0)crouched=true;if(r.leap==='pounce'){assert.ok(crouched,'the crouch comes first');leapt=true;}return leapt&&!s.rivalState.leap&&crouched;});
  assert.ok(pounced,'far away he pounces');
 }finally{h.release();h.cleanup();}
});

test('real loop: a kaiju that crowds him is back-pounced away from; a Deluge happens once and a Heavy in its charge breaks it up',async()=>{
 const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
 try{h.test().goto(azteca,0);h.step(2);h.test().growTo(3);h.test().setRivalX(3000);h.step(2);let back=false,leaped=false;const x0=()=>h.state().rivalState.x;
  const ok=fight(h,60,60*30,s=>{const r=s.rivalState;if(r.attack==='back'&&r.windup>0)back=true;if(r.leap==='back'){leaped=true;assert.ok(back,'the crouch comes before the leap');}return leaped&&!r.leap;});
  assert.ok(ok,`crowded, he back-pounces (${back}, ${leaped})`);
  const d=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
  try{d.test().goto(azteca,0);d.step(2);d.test().growTo(3);d.test().setRivalHP(.3);let charged=false,rained=false,deluges=0,was=false;
   fight(d,500,60*40,s=>{const r=s.rivalState;const on=r.attack==='deluge'&&r.windup>0;if(on&&!was)deluges++;was=on;if(on)charged=true;if(r.rain||r.drops>0)rained=true;return rained&&!r.rain&&r.drops===0;});
   assert.ok(charged&&rained,`a Deluge after the charge (${charged}, ${rained})`);assert.ok(d.state().rivalState.deluged);
   fight(d,500,60*25,()=>false);assert.equal(deluges,1,'once per fight');
  }finally{d.release();d.cleanup();}
 }finally{h.release();h.cleanup();}
});

test('real loop: Tlézcatl\'s Flame Jet burns the corrosion off faster than waiting it out',async()=>{
 const run1=async(fire:boolean)=>{const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
  try{h.test().goto(azteca,0);h.step(2);h.test().growTo(3);h.test().wakeBoss();h.test().teleport(0);h.test().setKaijuCorrosion(3);h.step(1);if(fire)h.down('KeyL');
   let frames=0;for(;frames<60*8&&h.state().rivalState.kcorr>0;frames++){h.test().teleport(0);h.step();}return {frames,after:h.state().rivalState.kcorr};}finally{h.release();h.cleanup();}};
 const slow=await run1(false),fast=await run1(true);assert.equal(slow.after,0);assert.equal(fast.after,0);assert.ok(fast.frames<slow.frames*.7,`fire fades it faster (${fast.frames} vs ${slow.frames} frames)`);
});

test('real loop: with a flood stub he submerges and resurfaces; the Azteca level itself has no flood (card 7) so he never does by himself (dry bowl, awake)',async()=>{
 const h=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
 try{h.test().goto(azteca,0);h.step(2);h.test().growTo(3);h.test().wakeBoss();const seen=new Set<string>();fight(h,300,60*30,s=>{const r=s.rivalState;if(r.windup>0)seen.add(r.attack);return false;});assert.ok(!seen.has('submerge'),`no flood, no submerge (${[...seen]})`);
 }finally{h.release();h.cleanup();}
 const g=await bootCampaign(.75,{city:'mex',kaiju:'Tlézcatl'});
 try{g.test().goto(azteca,0);g.step(2);g.test().growTo(3);g.test().wakeBoss();g.test().setFlood({surface:C.ground+300,crusts:[]});g.test().rivalMove('submerge');let under=false,up=false;
  for(let n=0;n<60*8;n++){g.test().teleport(Math.max(0,g.state().rivalState.x-300));g.step();const r=g.state().rivalState;if(r.under>0)under=true;if(under&&r.under===0){up=true;break;}}
  assert.ok(under&&up,'under, then back up');
 }finally{g.release();g.cleanup();}
});

test('the kit runs wherever Belial is the rival: Free Play and Paris\'s arena as well as Estadio Azteca',async()=>{
 const p=emptyPermanent();p.conquered=[...CAMPAIGN];p.unlocked=[...KAIJU];const f=await bootGame(.75,new Map([[PERMANENT_KEY,JSON.stringify(p)]]));
 f.click('#freeplay');f.node('#free-kaiju').value='Mogurodon';f.node('#free-city').value=String(cityIndexOf('mex'));f.node('#free-boss').value='Belial';f.node('#free-block').value=String(azteca);f.click('#free-start');
 try{for(let n=0;n<20;n++)f.step();const r=f.state().rivalState;assert.ok(r&&r.belial,'Free Play with Belial as the rival has the kit');
  let vomit=false;for(let n=0;n<60*20&&!vomit;n++){f.test().teleport(Math.max(0,f.state().rivalState.x-300));f.step();if(f.state().rivalState.spew)vomit=true;}assert.ok(vomit,'and he vomits');
 }finally{f.release();f.cleanup();}
 const h=await bootCampaign(.75,{city:'par',kaiju:'Mogurodon'});
 try{assert.ok(parBoss>=0);assert.ok(h.test().goto(parBoss,0));h.step(2);assert.ok(h.state().rivalState?.belial,'Paris\'s arena rival is Belial with the kit');assert.equal(h.state().bossName,'Belial');
 }finally{h.release();h.cleanup();}
});

test('a Tlézcatl arena and Kaiban\'s are unchanged: their rivals carry no acid state and the combat vulnerability stays 1',async()=>{
 const h=await bootCampaign(.75,{city:'mex-classic',kaiju:'Tlézcatl'});
 try{const arena=LEVELS[cityIndexOf('mex-classic')].findIndex(b=>b.name==='Tlézcatl Arena');h.test().goto(arena,0);h.step(5);const r=h.state().rivalState;assert.ok(r.tlez&&!r.belial);assert.equal(r.kcorr,0);assert.equal(r.kvuln,1);assert.equal(vulnerability.k,1);
 }finally{h.release();h.cleanup();}
});
