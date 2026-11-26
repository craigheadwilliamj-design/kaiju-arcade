import {RUNAWAY as RN,CONEY} from './config.ts';
import {groundAt,streetAt,slopeAt} from './terrain.ts';
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
// The Ferris wheel (Coney Island) is round: it rolls on far less resistance than a car, and turns as it goes (v.angle, radians).
const friction=(v:Vehicle)=>v.kind==='wheel'?CONEY.wheel.friction:(v.glide??RN.friction);
// The wheel is too big for a heap of rubble to matter: it rolls over the street itself, not over the rubble lying on it.
const surface=(v:Vehicle,x:number)=>v.kind==='wheel'?streetAt(x):groundAt(x);
const slopeOf=(v:Vehicle)=>v.kind==='wheel'?(streetAt(centre(v)-4)-streetAt(centre(v)+4))/8:slopeAt(centre(v));
export function tickRolling(v:Vehicle,dt:number,worldWidth:number):'rolling'|'stopped'{
 if(v.state!=='rolling')return 'stopped';
 const s=slopeOf(v);v.vx-=s*RN.gravity*dt;
 const drag=Math.min(Math.abs(v.vx),friction(v)*dt);v.vx-=Math.sign(v.vx)*drag;
 v.vx=Math.max(-RN.maxSpeed,Math.min(RN.maxSpeed,v.vx));
 v.x+=v.vx*dt;if(v.x<0||v.x+v.w>worldWidth){v.x=Math.max(0,Math.min(worldWidth-v.w,v.x));v.vx=0;}
 v.y=surface(v,centre(v))-v.h;if(v.kind==='wheel')v.angle+=v.vx*dt/(v.h/2);
 if(Math.abs(v.vx)<RN.stopSpeed&&Math.abs(s)*RN.gravity<=friction(v)){v.vx=0;v.state='parked';return 'stopped';}
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

// A coaster train on its track (Coney Island): it shuttles between the ends of its line like a cable car, riding the deck under it. `deckAt` is the
// world y of the track's deck at x, or null where there is none (a broken section). Returns 'derail' when the middle or the leading end of the train has
// no deck under it. The caller throws it off the track (derail below).
export function tickTrain(v:Vehicle,dt:number,deckAt:(x:number)=>number|null):'ok'|'derail'{
 if(v.state!=='cable'||!v.line)return 'ok';const [a,z]=v.line;v.x+=v.dir*CONEY.coaster.speed*dt;
 if(v.x<a){v.x=a;v.dir=1;}else if(v.x+v.w>z){v.x=z-v.w;v.dir=-1;}
 const mid=deckAt(centre(v)),lead=deckAt(v.dir>0?v.x+v.w-2:v.x+2);
 if(mid===null||lead===null)return 'derail';
 v.y=Math.min(mid,lead)-v.h;return 'ok';}
// Off the rails: thrown forward off the broken track, and a runaway once it lands (game.ts calls startRunaway then). `runaway` stays set until it is picked up or
// crashes, so a knock on the way down (a lamppost it flung) does not end the run.
export function derail(v:Vehicle){const dir=v.dir||1;v.state='flying';v.line=undefined;v.vx=dir*CONEY.coaster.derailSpeed;v.vy=-CONEY.coaster.derailLift;v.spin=dir*1.2;v.damage=CONEY.coaster.derailDamage;v.hits=new Set();v.speed=0;v.panic=0;v.runaway=true;}
export function startRunaway(v:Vehicle){const dir=v.dir||1;// it keeps the way it was heading when it left the rails, however it bounced on the way down
 v.angle=0;v.spin=0;startRolling(v,CONEY.coaster.runaway,dir);v.vx=dir*CONEY.coaster.runaway;v.plows=CONEY.coaster.plows;}
