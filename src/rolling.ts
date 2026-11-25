import {RUNAWAY as RN} from './config.ts';
import {groundAt,slopeAt} from './terrain.ts';
import {mass} from './vehicles.ts';
import type {Vehicle} from './vehicles.ts';

// Runaway physics (SF Act 2): a loose cable car, or any car let go on a hill, is moved by the street's slope alone. Pure and
// deterministic: the game calls tickRolling each frame and handles what the car hits (rollDamage says how hard).
// Speed is v.vx (signed px/s, + is east). slopeAt is positive where the street climbs toward +x, so downhill is the other way.
const centre=(v:Vehicle)=>v.x+v.w/2;
// Direction a vehicle would roll from where it stands: downhill, or `fallback` on the flat.
export function downhill(v:Vehicle,fallback=1){const s=slopeAt(centre(v));return Math.abs(s)<.01?fallback:s>0?-1:1;}
export function startRolling(v:Vehicle,push=RN.shove,fallback=1){
 v.state='rolling';v.vx=downhill(v,fallback)*push;v.vy=0;v.speed=0;v.panic=0;v.plows=RN.plows;v.hits=new Set();v.line=undefined;}
// One step. Returns 'stopped' when the car has coasted to rest (it parks), else 'rolling'.
export function tickRolling(v:Vehicle,dt:number,worldWidth:number):'rolling'|'stopped'{
 if(v.state!=='rolling')return 'stopped';
 const s=slopeAt(centre(v));v.vx-=s*RN.gravity*dt;
 const drag=Math.min(Math.abs(v.vx),RN.friction*dt);v.vx-=Math.sign(v.vx)*drag;
 v.vx=Math.max(-RN.maxSpeed,Math.min(RN.maxSpeed,v.vx));
 v.x+=v.vx*dt;if(v.x<0||v.x+v.w>worldWidth){v.x=Math.max(0,Math.min(worldWidth-v.w,v.x));v.vx=0;}
 v.y=groundAt(centre(v))-v.h;
 if(Math.abs(v.vx)<RN.stopSpeed&&Math.abs(s)*RN.gravity<=RN.friction){v.vx=0;v.state='parked';return 'stopped';}
 return 'rolling';
}
// A cable car on its line: shuttles between the ends at a steady crawl, hill or no hill (it is held by the cable).
export function putOnCable(v:Vehicle,line:[number,number]){v.state='cable';v.line=line;v.dir=v.dir||1;v.vx=0;}
export function tickCable(v:Vehicle,dt:number){
 if(v.state!=='cable'||!v.line)return;const [a,z]=v.line;v.x+=v.dir*RN.cableSpeed*dt;
 if(v.x<a){v.x=a;v.dir=1;}else if(v.x+v.w>z){v.x=z-v.w;v.dir=-1;}
 v.y=groundAt(centre(v))-v.h;
}
// The powerhouse is down: every car on a cable comes loose and starts down the hill. Returns how many were set loose.
export function releaseCables(vehicles:Vehicle[]){let n=0;for(const v of vehicles)if(v.state==='cable'){startRolling(v,RN.shove,v.dir||1);n++;}return n;}
// How hard a rolling car hits a building: heavier and faster is worse.
export function rollDamage(v:Vehicle){return RN.impactDamage*mass(v)*Math.max(RN.impactMin,Math.min(RN.impactMax,Math.abs(v.vx)/RN.impactRef));}
