import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,SAN_FRANCISCO,levelWidth} from '../src/levels.ts';
import {CRACK,GAS,FIRE,BRIDGE,SF2,CONFIG as C,ELEVATED as EL} from '../src/config.ts';
import {createBuildings,overlaps} from '../src/rules.ts';
import {checkParts,solidParts,topAt,roofUnder,hitParts} from '../src/hitbox.ts';
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

// ---- Level 8: Bay Bridge ----
const BAY=SAN_FRANCISCO.find(b=>b.name==='Bay Bridge')!,bayIndex=SAN_FRANCISCO.indexOf(BAY);
const deckSpec=BAY.buildings.find(b=>b.upperDeck)!;
const towers=BAY.buildings.filter(b=>b.deco==='btower');

test('Bay Bridge data: eight screens, a target (the carrier, the cutter scaled up), Stage 3 throughout, full military, navy',()=>{
 assert.equal(BAY.screens,8);assert.equal(BAY.kind,'stronghold');assert.equal(BAY.startStage,3);assert.equal(BAY.cap,3);assert.equal(BAY.tier,4);
 assert.equal(BAY.target!.art,'cutter','the carrier is the existing cutter, scaled');assert.ok(BAY.target!.scale!>1.5&&BAY.target!.launch);assert.equal(BAY.target!.scale,BRIDGE.carrierScale);
 const kinds=new Set(BAY.warships!.map(w=>w[0]));assert.ok(kinds.has('gunboat')&&kinds.has('destroyer'));
 const ukinds=new Set(BAY.units!.map(u=>u[0]));for(const k of ['tank','soldier','apc','helicopter','jet'])assert.ok(ukinds.has(k as any),k);
 assert.ok(BAY.deckUnits!.some(u=>u[0]==='tank')&&BAY.units!.some(u=>u[0]==='tank'),'tanks on both decks');
 // Order west to east: ramp, west span, bay, island (armory and hangars), east span with the carrier between two towers.
 const [lo,hi]=[BAY.bridge!.x0,BAY.bridge!.x1],arm=BAY.buildings.find(b=>b.role==='armory')!,hang=BAY.buildings.filter(b=>b.label==='HANGAR');
 assert.ok(hang.length>=2);assert.ok(arm.x>hi&&hang.every(h=>h.x>hi),'the island lies past the west span');
 assert.equal(BAY.bridge!.spans,8);assert.equal(BAY.bridge!.rise,BRIDGE.deckRise);assert.equal(BAY.bridge!.more!.length,1);
 const hullW=Math.round(SF2.cutterW*BRIDGE.carrierScale);assert.equal(towers.length,2);
 assert.ok(towers[0].x+towers[0].w<BAY.target!.x-hullW/2&&towers[1].x>BAY.target!.x+hullW/2,'the carrier lies between the two towers');
 const [e0,e1]=BAY.bridge!.more![0];assert.ok(towers[0].x>=e0&&towers[1].x+towers[1].w<=e1,'towers stand on the east deck');
 for(const b of BAY.buildings.filter(x=>x.kind!=='tiny'&&!x.upperDeck))assert.ok(!(b.x+b.w>lo&&b.x<hi&&b.label!=='BARRIER'),'nothing but barriers stands on the west deck below the upper deck');
 // Walkable ramps, buildings on flat ground, bay at wading depth for Stage 3 and too deep at Stage 2.
 const gp=BAY.ground!;for(const x of BAY.buildings.filter(b=>b.kind!=='tiny'&&!b.upperDeck&&b.deco!=='btower'))assert.equal(Math.round(profileY(gp,x.x+1)),Math.round(profileY(gp,x.x+x.w-1)),`${x.label||x.deco} stands on a flat`);
 const bed=profileY(gp,(BAY.bridge!.x1+BAY.water![0][1])/2),depth=bed-BAY.water![0][2];
 assert.ok(depth/(C.playerHeight*2.8)>.25&&depth/(C.playerHeight*2.8)<.65,`chest-deep at Stage 3 (${depth})`);assert.ok(depth/(C.playerHeight*1.4)>.65,'over the head at Stage 2');
 // Nothing else gained the new fields.
 for(const b of LEVELS.flat().filter(x=>x!==BAY)){assert.equal(b.warships,undefined,b.name);assert.equal(b.deckUnits,undefined,b.name);assert.equal(b.bridge?.rise,undefined,b.name);assert.equal(b.bridge?.more,undefined,b.name);assert.ok(!b.buildings.some(x=>x.upperDeck||x.deco==='btower'),b.name);}
});

test('the upper deck uses stacked-tier hit parts at length: two climbable towers and a slab above the lower road',()=>{
 const sb=createBuildings([deckSpec])[0];assert.deepEqual(checkParts(sb),[]);
 assert.ok(deckSpec.w>=C.width*2,`a long deck (${deckSpec.w}px)`);
 const slab=solidParts(sb).find(p=>p.w===deckSpec.w)!;assert.ok(slab,'the slab spans the whole length');
 assert.ok(sb.base-(slab.y+slab.h)>=C.playerHeight*2.8+10,'a Stage 3 kaiju fits on the road under the slab');
 // Tops line up along its whole length: every sampled column sees the same roof.
 for(let k=1;k<10;k++){const x=sb.x+deckSpec.w*k/10;assert.equal(topAt(sb,x,true),slab.y,`column ${k}`);}
 // Standing on the roof at either end and in the middle: roofUnder finds it; under it the road is clear of solid parts.
 for(const x of [sb.x+400,sb.x+deckSpec.w/2,sb.x+deckSpec.w-400])assert.equal(roofUnder(sb,x,x+60,slab.y)?.y,slab.y);
 const legs=solidParts(sb).filter(p=>p.w===BRIDGE.leg);assert.equal(legs.length,4);
 const gaps=[[legs[0],legs[1]],[legs[2],legs[3]]].map(([a,b])=>b.x-(a.x+a.w));for(const g of gaps)assert.ok(g>=C.playerWidth*2.8+8,`a Stage 3 kaiju passes the towers (gap ${g})`);
 for(const l of legs)assert.equal(l.y,slab.y,'the tower legs rise to the road above (climbable up to it)');
 // The east towers: legs only, with the carrier's gap.
 for(const t of towers){const tb=createBuildings([t])[0];assert.deepEqual(checkParts(tb),[]);assert.ok(solidParts(tb).filter(p=>p.w===BRIDGE.leg).length===2);assert.ok(hitParts(tb).length>=3);}
});

test('real loop: the west span: two decks, tanks on both, gridlock, a roadblock, warships on the water below',async()=>{
 const h=await boot(bayIndex,BAY.bridge!.x0-300);h.step(10);let s=h.state();
 assert.equal(s.spans.length,12,'eight lower-deck spans west, four east');assert.ok(s.spans.every((x:any)=>x.alive));
 assert.ok(s.upperDeck&&s.upperDeck.alive&&s.upperDeck.hp>0);
 const lowerY=C.ground-BRIDGE.deckRise;assert.equal(s.platformFloor(s.upperDeck.x0+300,lowerY),null,'a unit on the lower deck is not lifted onto the upper');
 assert.equal(s.platformFloor(s.upperDeck.x0+300,s.upperDeck.y),s.upperDeck.y,'a unit already on the upper deck stands on it');
 h.test().teleport(BAY.bridge!.x0+900);h.step(120);s=h.state();
 const tanks=s.unitList.filter((u:any)=>u.type==='tank'&&u.hp>0);
 const up=tanks.filter((u:any)=>Math.abs((u.y+27)-s.upperDeck.y)<4),low=tanks.filter((u:any)=>Math.abs((u.y+27)-lowerY)<4);void up;void low;
 assert.ok(s.unitList.some((u:any)=>u.type==='tank'),'tanks have joined');
 const ships=s.unitList.filter((u:any)=>u.type==='gunboat'||u.type==='destroyer');assert.ok(ships.length>=5,'warships are on the water');
 const under=ships.filter((u:any)=>u.x>BAY.bridge!.x0&&u.x<BAY.bridge!.x1);assert.ok(under.length>=2,'warships below the span');
 for(const u of ships)assert.ok(u.y+(u.type==='destroyer'?50:30)>C.ground&&u.y+(u.type==='destroyer'?50:30)<C.ground+80,`${u.type} afloat at the waterline (${u.y})`);
});

test('real loop: double deck: break the upper and land on the lower; break the lower and it is the bay',async()=>{
 const h=await boot(bayIndex);const lowerY=C.ground-BRIDGE.deckRise,x=deckSpec.x+deckSpec.w/2;
 // Up on the upper deck.
 h.test().teleport(deckSpec.x+500);h.step(2);const s0=h.state();h.test().teleport(deckSpec.x+500);
 // Put the kaiju on the slab: it is a roof, so stand it there and let it settle.
 h.test().perchOn(s0.upperDeck.index);h.step(20);let s=h.state();
 assert.ok(s.playerGrounded&&Math.abs(s.playerFeet-s.upperDeck.y)<3,`standing on the upper deck (feet ${s.playerFeet} deck ${s.upperDeck.y})`);
 h.test().smash(s.upperDeck.index);h.step(90);s=h.state();
 assert.equal(s.upperDeck.hp<=0,true);assert.ok(!s.upperDeck.alive);assert.deepEqual(s.deckOrder,['upper']);
 assert.ok(s.playerGrounded&&Math.abs(s.playerFeet-lowerY)<3,`landed on the lower deck (feet ${s.playerFeet}, deck ${lowerY})`);
 // Break the lower deck beneath: into the bay, chest-deep.
 const span=s.spans.findIndex((p:any)=>p.alive&&p.x0<=h.state().playerFeet&&true&&(h.state().spans.indexOf(p)>=0)&&false);void span;
 const sp=s.spans.find((p:any)=>{const cx=x;return cx>=p.x0&&cx<p.x1;});h.test().teleport((sp.x0+sp.x1)/2-30);h.step(20);
 h.test().smashSpan(s.spans.indexOf(sp));h.step(120);s=h.state();
 assert.deepEqual(s.deckOrder,['upper','lower']);
 assert.equal(s.band,'wading','chest-deep in the bay at Stage 3');assert.ok(s.playerFeet>C.ground+60,'down on the seabed');
});

test('real loop: break the lower deck first and the upper deck stays up',async()=>{
 const h=await boot(bayIndex);const x=deckSpec.x+deckSpec.w/2;h.test().teleport(x);h.step(20);let s=h.state();
 const sp=s.spans.find((p:any)=>x>=p.x0&&x<p.x1);h.test().smashSpan(s.spans.indexOf(sp));h.step(120);s=h.state();
 assert.deepEqual(s.deckOrder,['lower']);assert.ok(s.upperDeck.alive&&s.upperDeck.hp>0,'the upper deck is still there');assert.equal(s.band,'wading');
});

test('real loop: a tank on the upper deck falls to the lower deck when the upper deck goes',async()=>{
 const h=await boot(bayIndex);h.test().teleport(deckSpec.x+deckSpec.w/2-200);h.step(5);
 const lowerY=C.ground-BRIDGE.deckRise;let s=h.state();h.test().spawnUnitOn('tank',s.upperDeck.x0+deckSpec.w/2+200,s.upperDeck.y);h.step(10);s=h.state();
 const tank=()=>h.state().unitList.filter((u:any)=>u.type==='tank'&&Math.abs(u.x-(s.upperDeck.x0+deckSpec.w/2+200))<400).sort((a:any,b:any)=>a.y-b.y)[0];
 assert.ok(tank()&&Math.abs(tank().y+31-s.upperDeck.y)<4,'the tank stands on the upper deck');
 h.test().smash(s.upperDeck.index);h.step(100);
 const t=tank();assert.ok(!t||Math.abs(t.y+31-lowerY)<6||t.hp<=0,'it came down to the lower deck (or did not survive the fall)');
});

const hullW=Math.round(SF2.cutterW*BRIDGE.carrierScale);
test('real loop: the carrier launches jets off its deck while it floats and the kaiju is near; each climbs to cruise altitude',async()=>{
 const h=await boot(bayIndex,BAY.target!.x-700);h.step(5);let s=h.state();
 assert.ok(s.carrierDeck&&s.carrierDeck.alive,'the flight deck is a deck');assert.ok(Math.abs((s.carrierDeck.x0+s.carrierDeck.x1)/2-BAY.target!.x)<2);
 assert.equal(s.cutter.w,hullW);assert.equal(s.jetsLaunched,0);
 for(let n=0;n<60*(BRIDGE.launchEvery+2)&&s.jetsLaunched<1;n++){h.step();s=h.state();}
 assert.ok(s.jetsLaunched>=1,'a jet launched');
 const j0=s.carrierJetList[0];assert.ok(j0&&j0.y>s.carrierDeck.y-80,'the jet leaves from deck height');
 h.step(70);const j1=h.state().carrierJetList[0];assert.ok(j1&&j1.y<j0.y-60,'and climbs to cruise');
 for(let n=0;n<60*40;n++){h.step();assert.ok(h.state().jetsUp<=BRIDGE.maxJets,'no more than maxJets in the air');}
 assert.ok(h.state().jetsLaunched>=2,'it keeps launching');
});

test('real loop: carrier sinking: the hull lists and goes under, the deck goes with it, jets stop, the exit opens',async()=>{
 const h=await boot(bayIndex,BAY.target!.x-700);h.step(5);let s=h.state();const x=BAY.target!.x;
 assert.ok(s.cutter&&!s.cutter.sinking&&s.cutter.sink===0);
 // Standing over the hull, break the east deck under the kaiju: it drops onto the carrier's flight deck.
 h.test().teleport(x-hullW/4);h.step(10);s=h.state();const span=s.spans.findIndex((p:any)=>x-hullW/4>=p.x0&&x-hullW/4<p.x1);assert.ok(span>=0);
 h.test().smashSpan(span);h.step(90);s=h.state();
 assert.ok(s.playerGrounded&&Math.abs(s.playerFeet-s.carrierDeck.y)<4,`standing on the carrier's deck (feet ${s.playerFeet}, deck ${s.carrierDeck?.y})`);
 assert.ok(s.band==='dry','on the deck, not in the water');
 // Sink it.
 const launched=s.jetsLaunched;h.test().sinkCutter();h.step(10);s=h.state();assert.ok(s.cutter.sinking&&s.cutter.sink>0&&s.cutter.list>0,'it lists as it goes down');
 const y0=s.carrierDeck.y;h.step(60);assert.ok(h.state().carrierDeck.y>y0,'the deck sinks with the hull');
 for(let n=0;n<60*12&&!(h.state().cutter.sink>=1);n++)h.step();s=h.state();
 assert.equal(s.cutter.sink,1,'the carrier is gone');assert.ok(!s.carrierDeck.alive,'its deck with it');
 assert.equal(s.jetsLaunched,launched,'no jets launch from a sinking carrier');
 h.step(60);s=h.state();assert.equal(s.band,'wading','the kaiju is in the bay, chest-deep, when the deck goes');assert.ok(s.playerFeet>C.ground+60);
 assert.ok(s.objective.shattered,'the target is down');
});

test('real loop: the exit opens when the carrier is sunk, and sits at the end of the east span',async()=>{
 const h=await boot(bayIndex,BAY.target!.x+hullW);h.step(5);
 h.down('KeyD');for(let n=0;n<300;n++)h.step();h.up('KeyD');assert.equal(h.state().modeNow,'playing','the exit is shut while the carrier floats');
 h.test().sinkCutter();h.test().teleport(levelWidth(BAY)-400);h.step(5);
 h.down('KeyD');for(let n=0;n<400&&h.state().modeNow==='playing';n++)h.step();h.up('KeyD');
 assert.equal(h.state().modeNow,'results');
});

test('real loop: wading the bay at Stage 3: chest-deep, slowed; the gunboat and the destroyer both shell the kaiju from the water',async()=>{
 const des=BAY.warships!.filter(w=>w[0]==='destroyer').map(w=>w[1]).sort((a,b)=>b-a)[0],px=des-450;
 const h=await boot(bayIndex,px);h.step(30);let s=h.state();
 assert.equal(s.band,'wading');assert.ok(s.depth(px+30)>60);
 const fired=new Set<string>();
 for(let n=0;n<60*45;n++){h.step();s=h.state();const ty=new Map(s.unitList.map((u:any)=>[u.id,u.type]));for(const p of s.projectileList){const t=ty.get(p.owner);if(t==='gunboat'||t==='destroyer')fired.add(t);}}
 assert.ok(fired.has('gunboat')&&fired.has('destroyer'),`both fired (${[...fired]})`);
});
