import {CITY as Y,CONFIG as C} from './config.ts';
import type {Building} from './rules.ts';

// Rampage: a heat gauge fed by destruction. It holds for a short grace period after the last feed, then drains.
export type Rampage={heat:number,idle:number,peak:number};
export function createRampage():Rampage{return {heat:0,idle:0,peak:0};}
export function rampageLevel(r:Rampage){let n=0;for(let i=0;i<Y.rampageLevels.length;i++)if(r.heat>=Y.rampageLevels[i])n=i;return n;}
export function rampageMult(r:Rampage){return Y.rampageMult[rampageLevel(r)];}
// Returns the level reached when the feed crossed a threshold upward, otherwise -1.
export function feedRampage(r:Rampage,heat:number){if(!(heat>0))return -1;const before=rampageLevel(r);r.heat=Math.min(100,r.heat+heat);r.idle=0;r.peak=Math.max(r.peak,rampageLevel(r));const after=rampageLevel(r);return after>before?after:-1;}
export function pointsHeat(points:number){return points>0?Math.min(Y.gainMax,Y.gainPerRootPoint*Math.sqrt(points)):0;}
export function tickRampage(r:Rampage,dt:number){r.idle+=dt;if(r.idle>Y.rampageGrace)r.heat=Math.max(0,r.heat-Y.rampageDecay*dt);}

// Power grids: each [from,to] range is fed by the substation standing in it. A building, pole or unit belongs to the grid its
// centre is in.
export function gridOf(x:number,grids:[number,number][]|undefined){if(!grids)return -1;for(let i=0;i<grids.length;i++)if(x>=grids[i][0]&&x<grids[i][1])return i;return -1;}
export function substations(buildings:Building[],grids:[number,number][]|undefined){
 return (grids??[]).map(()=>null as Building|null).map((_,i)=>buildings.find(b=>b.role==='substation'&&gridOf(b.x+b.w/2,grids)===i)??null);}
// A grid with no substation is unpowered (nothing to knock out); one with a standing substation is live.
export function gridPowered(subs:(Building|null)[]){return subs.map(b=>!!b&&b.hpNow>0);}

// Rooftop fixtures sit on their host's roof; boxes are in world coordinates with y measured down from the top of the canvas.
export type RoofProp={b:Building,kind:'radar'|'tank',hp:number,max:number,dead:boolean,call:number,grid:number};
const ROOF={radar:{w:Math.round(30*C.cityScale),h:Math.round(34*C.cityScale),at:.62},tank:{w:Math.round(34*C.cityScale),h:Math.round(46*C.cityScale),at:.28}};
export function createRoofProps(buildings:Building[],grids:[number,number][]|undefined):RoofProp[]{
 return buildings.filter(b=>b.roof).map(b=>{const kind=b.roof!,max=kind==='radar'?Y.radarHP:Y.tankHP;return {b,kind,hp:max,max,dead:false,call:0,grid:gridOf(b.x+b.w/2,grids)};});}
export function roofBox(p:RoofProp,height=p.b.h){const d=ROOF[p.kind],x=Math.round(p.b.x+(p.b.w-7)*d.at-d.w/2);return {x,y:p.b.base-height-d.h,w:d.w,h:d.h};}

// Live wire: a downed pole's span, arcing on the street.
export type LiveWire={from:number,to:number,t:number,grid:number,tick:number,pole:number};
// The span a downed pole drops: from the neighbour pole on one side to the one on the other (or a fixed reach past the end of the line).
export function wireSpan(xs:number[],i:number):[number,number]{const reach=Math.round(140*C.cityScale);
 return [i>0?xs[i-1]:xs[i]-reach,i<xs.length-1?xs[i+1]:xs[i]+reach];}
