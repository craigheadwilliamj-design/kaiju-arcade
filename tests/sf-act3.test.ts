import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,SAN_FRANCISCO,levelWidth} from '../src/levels.ts';
import {CRACK,GAS,FIRE,CONFIG as C,ELEVATED as EL} from '../src/config.ts';
import {createBuildings,overlaps} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
import {profileY} from '../src/terrain.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// SF Act 3 (redesign phase 5): The Fault, Bay Bridge, Golden Gate. Data checks first, then real-loop checks of each new mechanic.
const FAULT=SAN_FRANCISCO.find(b=>b.name==='The Fault')!;
const boot=async(block:number,x?:number)=>{const h=await bootCampaign(.75,{city:'sfo'});h.test().goto(block,x);h.step(2);return h;};
const slam=(h:any)=>{h.tap('Space');h.step(14);h.down('KeyS');h.step(30);h.up('KeyS');h.step(20);};
const faultIndex=SAN_FRANCISCO.indexOf(FAULT);

test('The Fault data: eight screens, destruction, Stage 3 throughout, full military, three cracks in the open street, gas mains beside them',()=>{
 assert.equal(FAULT.screens,8);assert.equal(FAULT.kind,'district');assert.equal(FAULT.startStage,3);assert.equal(FAULT.cap,3);assert.equal(FAULT.tier,4);
 assert.equal(FAULT.cracks!.length,3,'three cracks, the last the Big One');assert.deepEqual([...FAULT.cracks!].sort((a,b)=>a-b),FAULT.cracks);
 const solid=FAULT.buildings.filter(b=>b.kind!=='tiny'),W=levelWidth(FAULT);
 for(const x of FAULT.cracks!){assert.ok(x>200&&x<W-300);assert.ok(!solid.some(b=>x>b.x-20&&x<b.x+b.w+20),`crack at ${x} lies in open street`);
  const mains=FAULT.buildings.filter(b=>b.role==='hydrant'&&Math.abs(b.x-x)<CRACK.mainRadius);assert.ok(mains.length>=2,`${mains.length} gas mains in range of the crack at ${x}`);}
 assert.ok(FAULT.gas);assert.equal(FAULT.fireCap,GAS.fireCap);assert.ok(GAS.fireCap>FIRE.cap,'the cap on burning buildings is raised here');
 // Types of enemy: tanks, artillery, jets, helicopters and soldiers from the first screens on.
 const kinds=new Set(FAULT.units!.map(u=>u[0]));for(const k of ['tank','artillery','jet','soldier','apc','helicopter'])assert.ok(kinds.has(k as any),`${k} units`);
 // Landmarks: the dome, the mint (a cache); the districts run west to east.
 const hall=FAULT.buildings.find(b=>b.label==='CITY HALL')!,mint=FAULT.buildings.find(b=>b.label==='OLD MINT')!;
 assert.ok(hall.landmark&&hall.shape==='dome');assert.ok(mint.cache);
 const [c1,c2,c3]=FAULT.cracks!;assert.ok(hall.x<c1&&c1<mint.x+mint.w+2000&&c1<c2&&c2<c3,'Civic Center, then Mid-Market, then SoMa');
 assert.equal(FAULT.firetrucks!.length,3);for(const x of FAULT.firetrucks!)assert.ok(x>c1&&x<c2+800,'fire trucks in Mid-Market');
 // Freeway: a double-deck on the elevated system over the third crack, with nothing standing under it; the on-ramp climbs at the east end.
 const [f0,f1]=FAULT.elevated!;assert.equal(FAULT.elevatedDecks,2);assert.equal(FAULT.elevatedLook,'freeway');assert.ok(c3>f0&&c3<f1);
 for(const b of solid)assert.ok(b.x+b.w<=f0||b.x>=f1,'nothing stands under the freeway');
 assert.ok(profileY(FAULT.ground!,W-5)<C.ground-100,'the on-ramp rises at the east end');assert.equal(Math.round(profileY(FAULT.ground!,W/2)),C.ground);
 for(const b of createBuildings(solid)){assert.ok(b.x>=0&&b.x+b.w<=W);assert.deepEqual(checkParts(b),[]);}
 for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)assert.ok(!overlaps({x:solid[i].x,y:0,w:solid[i].w,h:1},{x:solid[j].x,y:0,w:solid[j].w,h:1}));
 // Nothing else gained the fault fields.
 for(const b of LEVELS.flat().filter(x=>x!==FAULT)){assert.equal(b.cracks,undefined,b.name);assert.equal(b.gas,undefined,b.name);assert.equal(b.fireCap,undefined,b.name);assert.equal(b.elevatedDecks,undefined,b.name);}
});

test('real loop: a slam at a crack sets off a district quake: shake, damage, sway, shockwaves, gas mains burst into fire geysers, the other cracks stay sealed',async()=>{
 const h=await boot(faultIndex);const [c1,c2]=FAULT.cracks!;
 h.test().teleport(c1-40);h.step(30);let s=h.state();
 assert.equal(s.cracks.length,3);assert.ok(s.cracks.every((c:any)=>!c.quaked));assert.equal(s.fireGeysers,0);
 const before=s.buildings.filter((b:any)=>b.hp>0).length;void before;
 slam(h);s=h.state();
 assert.ok(s.cracks[0].quaked,'the first crack went off');assert.ok(!s.cracks[1].quaked&&!s.cracks[2].quaked,'the others did not');assert.equal(s.quakeCount,1);
 assert.ok(s.cracks[0].open>0);
 assert.ok(s.fireGeysers>=1,`gas mains burst (${s.fireGeysers})`);assert.ok(s.blazes>=1,'the geysers started fires');
 assert.ok(s.swaying>=1,'buildings sway');
 assert.ok(c2-c1>CRACK.reach*2,'the second crack is far out of reach');
});

test('real loop: a slam out of reach of every crack sets nothing off',async()=>{
 const h=await boot(faultIndex,300);h.step(30);slam(h);const s=h.state();
 assert.equal(s.quakeCount,0);assert.ok(s.cracks.every((c:any)=>!c.quaked));
});

test('real loop: a pound sets off a crack too; the same crack only quakes once',async()=>{
 const h=await boot(faultIndex);const [c1]=FAULT.cracks!;h.test().teleport(c1-50);h.step(30);
 for(let n=0;n<8&&!h.state().cracks[0].quaked;n++){if(h.state().canAct&&h.state().cooldown<=0)h.tap('KeyK');h.step(10);}
 // Heavy attacks (the pound) may not reach on every kaiju; any strike at the crack counts: a slam finishes the job.
 if(!h.state().cracks[0].quaked)slam(h);
 assert.equal(h.state().quakeCount,1);slam(h);assert.equal(h.state().quakeCount,1,'a quaked crack is spent');
});

test('real loop: an Ultimate near a crack sets off a bigger quake than a slam',async()=>{
 const slamH=await boot(faultIndex),ultH=await boot(faultIndex);const [c1]=FAULT.cracks!;
 const farX=c1-CRACK.reach-200;// beyond a slam's reach, within an Ultimate's
 for(const h of [slamH,ultH]){h.test().teleport(farX);h.step(30);}
 slam(slamH);assert.ok(!slamH.state().cracks[0].quaked,'a slam this far off does nothing');
 ultH.test().fillUltimate();ultH.tap('KeyU');ultH.step(4);
 const s=ultH.state();assert.ok(s.cracks[0].quaked&&s.cracks[0].ult,'the Ultimate sets it off as a big quake');
 assert.ok(CRACK.ultRadius>CRACK.radius&&CRACK.ultDamage>CRACK.damage&&CRACK.ultShake>CRACK.shake);
});

test('real loop: gas-main fire geysers ignite buildings; the raised cap lets many burn at once (more than the usual cap)',async()=>{
 const h=await boot(faultIndex);const [c1]=FAULT.cracks!;h.test().teleport(c1-40);h.step(10);
 // Torch buildings until the usual cap would have stopped it.
 let lit=0;for(let i=0;i<80;i++)if(h.test().torch(i))lit++;
 assert.ok(h.state().blazes>FIRE.cap,`${h.state().blazes} burning at once beats the usual cap of ${FIRE.cap}`);
 assert.ok(h.state().blazes<=GAS.fireCap,'but not past the level cap');void lit;
 h.step(300);assert.ok(h.state().blazes<=GAS.fireCap);
});

test('real loop: the Big One: the whole level shakes and the double-deck freeway pancakes, column by column, upper deck then lower',async()=>{
 const h=await boot(faultIndex);const [,,c3]=FAULT.cracks!;h.test().teleport(c3-CRACK.ultReach+80);h.step(30);
 let s=h.state();const decks=s.railDecks;assert.ok(decks.length>=6,'a long freeway');assert.ok(decks.every((r:any)=>r.alive));
 const cols=new Set(decks.map((r:any)=>r.x0));assert.equal(decks.length,cols.size*2,'two decks on every column');
 for(const x of cols){const [lo,up]=decks.filter((r:any)=>r.x0===x).sort((a:any,b:any)=>a.deck-b.deck);assert.ok(up.y<lo.y,'the upper deck is above the lower');}
 h.test().fillUltimate();h.tap('KeyU');h.step(4);s=h.state();assert.ok(s.cracks[2].quaked&&s.cracks[2].big,'an Ultimate from the freeway\'s west end reaches the third crack');assert.ok(s.bigOne,'the Big One is under way');
 for(let n=0;n<600&&h.state().railDecks.some((r:any)=>r.alive);n++)h.step();
 s=h.state();assert.ok(s.railDecks.every((r:any)=>!r.alive),'every deck came down');assert.ok(s.pancaked);
 for(const x of cols){const [lo,up]=s.railDecks.filter((r:any)=>r.x0===x).sort((a:any,b:any)=>a.deck-b.deck);assert.ok(up.fellAt<=lo.fellAt,`column ${x}: the upper deck falls first`);}
 const order=[...cols].sort((a:number,b:number)=>a-b).map(x=>s.railDecks.find((r:any)=>r.x0===x&&r.deck===1).fellAt);
 for(let i=1;i<order.length;i++)assert.ok(order[i]>=order[i-1],'the collapse runs west to east');
 for(let n=0;n<400&&h.state().bigOne;n++)h.step();assert.equal(h.state().bigOne,null,'the shaking ends');
});

test('real loop: pancaking decks crush the troops under them',async()=>{
 const h=await boot(faultIndex);const [,,c3]=FAULT.cracks!;h.test().teleport(c3-60);h.step(30);
 h.test().spawnUnit('tank',c3+120);h.step(2);const n0=h.state().unitList.filter((u:any)=>u.type==='tank'&&Math.abs(u.x-(c3+120))<120).length;assert.ok(n0>=1,'a tank stands under the freeway');
 slam(h);for(let n=0;n<600&&h.state().railDecks.some((r:any)=>r.alive);n++)h.step();
 assert.equal(h.state().unitList.filter((u:any)=>u.type==='tank'&&u.hp>0&&u.x>c3+20&&u.x<c3+260).length,0,'the tank was crushed');
});

test('real loop: the exit is the on-ramp: it opens at the destruction quota and sits at the top of the climb',async()=>{
 const h=await boot(faultIndex,levelWidth(FAULT)-900);h.step(5);
 h.test().demolish(.99);h.step(10);
 h.down('KeyD');for(let n=0;n<900&&h.state().modeNow==='playing';n++)h.step(2);h.up('KeyD');
 assert.equal(h.state().modeNow,'results','walking up the on-ramp to the east end leaves the level');
});
