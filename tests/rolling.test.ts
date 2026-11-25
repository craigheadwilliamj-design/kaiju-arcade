import {test} from 'node:test';import assert from 'node:assert/strict';
import {setTerrain,groundAt,slopeAt,profileFrom} from '../src/terrain.ts';
import {createFleet,loose,grounded,VEHICLE_SPECS} from '../src/vehicles.ts';
import {startRolling,tickRolling,putOnCable,tickCable,releaseCables,rollDamage,downhill} from '../src/rolling.ts';
import {RUNAWAY as RN,CONFIG as C} from '../src/config.ts';
import {createShip,sinkShip,tickShip,shipSunk,deckY,hullBox} from '../src/ship.ts';
import {fogAt} from '../src/fog.ts';
import {SF2} from '../src/config.ts';
// Runaway physics (src/rolling.ts), the ship (src/ship.ts) and the fog (src/fog.ts), as pure modules.
const W=4000,cab=(x:number)=>createFleet('cablecar',[x],1,'#8a2f2a')[0];
// A ramp up toward +x from x=1000 to x=1400 (rise 60), flat either side.
const hill=()=>setTerrain([[0,C.ground],[1000,C.ground],[1400,C.ground-60],[W,C.ground-60]]);
const run=(v:any,seconds:number)=>{for(let t=0;t<seconds*60&&v.state==='rolling';t++)tickRolling(v,1/60,W);};

test('rolling: a loose car speeds up going downhill, and the steeper the street the faster it goes',()=>{
 hill();const v=cab(1100);assert.ok(slopeAt(1100+v.w/2)>0,'the street climbs toward +x here');assert.equal(downhill(v),-1,'downhill is west');
 startRolling(v);assert.equal(v.state,'rolling');assert.ok(v.vx<0,'shoved downhill');
 const v0=Math.abs(v.vx);for(let t=0;t<30;t++)tickRolling(v,1/60,W);assert.ok(Math.abs(v.vx)>v0+40,`it gathers speed on the slope (${v0.toFixed(0)} -> ${Math.abs(v.vx).toFixed(0)})`);
 // Steeper ramp, same distance: faster.
 setTerrain([[0,C.ground],[1000,C.ground],[1400,C.ground-160],[W,C.ground-160]]);const w=cab(1100);startRolling(w);for(let t=0;t<30;t++)tickRolling(w,1/60,W);
 assert.ok(Math.abs(w.vx)>Math.abs(v.vx),'a steeper street is faster');
 setTerrain(null);});

test('rolling: speed is capped, and the car follows the street (feet on the ground)',()=>{
 setTerrain([[0,C.ground],[200,C.ground],[500,C.ground-400],[W,C.ground-400]]);const v=cab(260);startRolling(v);run(v,2);
 assert.ok(Math.abs(v.vx)<=RN.maxSpeed,`never faster than maxSpeed (${v.vx.toFixed(0)})`);assert.ok(Math.abs(Math.abs(v.vx)-RN.maxSpeed)<1||v.state==='parked');
 assert.equal(v.y,groundAt(v.x+v.w/2)-v.h,'it rides the street');setTerrain(null);});

test('rolling: on flat ground a car coasts to a stop and parks, and a car on the flat does not start by itself',()=>{
 setTerrain(null);const v=cab(1000);startRolling(v,RN.shove*3,1);assert.equal(v.vx,RN.shove*3);const x0=v.x;
 let last=Infinity;for(let t=0;t<60*20&&v.state==='rolling';t++){tickRolling(v,1/60,W);assert.ok(Math.abs(v.vx)<=last+1e-9,'only ever slows on the flat');last=Math.abs(v.vx);}
 assert.equal(v.state,'parked','it came to rest');assert.equal(v.vx,0);assert.ok(v.x>x0+30,`it coasted a way first (${(v.x-x0).toFixed(0)}px)`);
 assert.ok(Math.abs(v.x-x0-(RN.shove*3)**2/(2*RN.friction))<20,'by the rolling resistance: v²/2f');
 assert.equal(tickRolling(v,1/60,W),'stopped','a parked car is left alone');assert.ok(loose(v)&&grounded(v));});

test('rolling: coasting up the far side of a dip slows it and brings it back',()=>{
 // A valley: it rolls into the bottom, climbs the far side part-way, stops being able to go further and rolls back.
 setTerrain(profileFrom([[0,40],[300,40],[600,0],[900,0],[1200,40],[4000,40]],1));const v=cab(300);startRolling(v);
 let min=Infinity,max=-Infinity,turned=false,dir=Math.sign(v.vx);for(let t=0;t<60*20&&v.state==='rolling';t++){tickRolling(v,1/60,W);min=Math.min(min,v.x);max=Math.max(max,v.x);if(Math.sign(v.vx)!==dir&&v.vx!==0)turned=true;}
 assert.ok(turned||v.state==='parked','it does not run away forever');assert.ok(max-min>200,'it travelled');setTerrain(null);});

test('rolling: stops at the world edge instead of leaving it',()=>{
 setTerrain(null);const v=cab(40);startRolling(v,300,-1);run(v,3);assert.ok(v.x>=0);assert.equal(v.vx,0);});

test('cable cars: shuttle between the ends of their line at a steady crawl, and the powerhouse releases every one',()=>{
 hill();const a=cab(1000),b=cab(1800);putOnCable(a,[1000,1300]);putOnCable(b,[1700,2100]);assert.equal(a.state,'cable');
 let seen=new Set<number>();for(let t=0;t<60*30;t++){tickCable(a,1/60);tickCable(b,1/60);seen.add(a.dir);assert.ok(a.x>=1000&&a.x+a.w<=1300+1e-6,'stays on its line');assert.equal(a.y,groundAt(a.x+a.w/2)-a.h);}
 assert.equal(seen.size,2,'it turns round at the ends');
 const p=cab(1500);p.state='parked';const n=releaseCables([a,b,p]);assert.equal(n,2,'only the cars on cables');assert.equal(a.state,'rolling');assert.equal(b.state,'rolling');assert.equal(p.state,'parked');
 assert.ok(Math.abs(a.vx)>=RN.shove-1e-6,'they are shoved off');assert.equal(a.plows,RN.plows);setTerrain(null);});

test('rolling: harder and heavier means more damage, clamped; a bus hits harder than a car',()=>{
 const v=cab(0);v.vx=RN.impactRef;const mid=rollDamage(v);v.vx=1;assert.equal(rollDamage(v),RN.impactDamage*VEHICLE_SPECS.cablecar.mass*RN.impactMin,'a crawl still hits a little');
 v.vx=-1e6;assert.equal(rollDamage(v),RN.impactDamage*VEHICLE_SPECS.cablecar.mass*RN.impactMax,'and a rocket is capped');assert.ok(mid>0);
 const bus=createFleet('bus',[0],2,'#fff')[0];bus.vx=RN.impactRef;assert.ok(rollDamage(bus)>mid,'heavier hits harder');});

test('ship: a cutter floats at the waterline, then sinks over a few seconds, listing as it goes; a bigger scale makes a bigger hull',()=>{
 const s=createShip(5000,1);assert.equal(s.w,SF2.cutterW);assert.equal(s.sink,0);const wl=441,box0=hullBox(s,wl);assert.equal(box0.y,wl-s.deck,'the deck rides above the waterline');assert.equal(deckY(s,wl),wl-s.deck);
 tickShip(s,10);assert.equal(s.sink,0,'afloat until it is hit');sinkShip(s);let list=0;for(let t=0;t<60*20&&!shipSunk(s);t++){tickShip(s,1/60);list=Math.max(list,s.list);}
 assert.ok(shipSunk(s),'it goes under');assert.ok(list>0&&list<=SF2.listMax+1e-9,'listing as it sinks');assert.ok(deckY(s,wl)>wl,'the deck is under water');
 // Sinking takes the full sinkSeconds at scale 1.
 const t=createShip(0,1);sinkShip(t);let n=0;while(!shipSunk(t)&&n<10000){tickShip(t,1/60);n++;}assert.ok(Math.abs(n/60-SF2.sinkSeconds)<.1,`about ${SF2.sinkSeconds}s (${(n/60).toFixed(2)})`);
 // Level 8's aircraft carrier: the same hull scaled up.
 const big=createShip(0,3);assert.equal(big.w,SF2.cutterW*3);assert.equal(big.h,SF2.cutterH*3);assert.equal(big.deck,SF2.cutterDeck*3);sinkShip(big);let m=0;while(!shipSunk(big)&&m<100000){tickShip(big,1/60);m++;}assert.ok(m>n,'a bigger ship takes longer to go down');});

test('fog: clear before `from`, thickens linearly to `max` at `to`, holds after; no fog without a fog entry',()=>{
 const f={fog:{from:1000,to:3000,max:.6}};assert.equal(fogAt(f,0),0);assert.equal(fogAt(f,1000),0);assert.ok(Math.abs(fogAt(f,2000)-.3)<1e-9);assert.equal(fogAt(f,3000),.6);assert.equal(fogAt(f,9999),.6);
 let last=-1;for(let x=0;x<=3500;x+=100){const a=fogAt(f,x);assert.ok(a>=last,'never thins going east');last=a;}assert.equal(fogAt({},2000),0);});
