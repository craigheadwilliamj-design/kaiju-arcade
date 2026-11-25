import {groundUnder} from './terrain.ts';
import {CONFIG,FEEL,FLOORS} from './config.ts';
import type {BuildingSpec} from './levels.ts';
// Hole positions are relative to the building: x from its left edge, y as height above the street.
export type Hole={x:number,y:number,r:number,seed:number};
// topple: 0 standing/squash, 1 falling (rigid rotation about the base corner on the tiltDir side), 2 lying as rubble.
export type Building=BuildingSpec & {hpNow:number,collapse:number,rewarded:boolean,jolt:number,joltDir:number,holes:Hole[],topple:0|1|2,tilt:number,tiltV:number,tiltDir:number,toppleUlt:boolean,toppleGen:number,lifted:boolean,creak:number,base:number,floors:number[],floorMax:number,sink:number,sway:number};
// sink: px the building has sunk into soft ground (base already includes it); sway: seconds left of a quake-proof sway.
// floors: integrity left per floor, bottom first (empty for tiny structures and utility yards); floorMax is a fresh floor's integrity.
// base: street height under the building (its foot; the roof is at base - h).
// creak: seconds left of a destroyed tower shuddering before it falls (it stays solid until then).
export function createBuildings(specs:BuildingSpec[]):Building[]{return specs.map(b=>({...b,hpNow:b.hp,collapse:0,rewarded:false,jolt:0,joltDir:1,holes:[],topple:0,tilt:0,tiltV:0,tiltDir:1,toppleUlt:false,toppleGen:0,lifted:false,creak:0,base:groundUnder(b.x,b.w),sink:0,sway:0,...floorStack(b)}));}
function floorStack(b:BuildingSpec){const n=Math.round(b.h/FLOORS.floorHeight);if(b.kind==='tiny'||b.role||n<FLOORS.minFloors)return {floors:[] as number[],floorMax:0};
 const max=b.hp/n*FLOORS.integrity;return {floors:Array(n).fill(max),floorMax:max};}
// Small enough for the kaiju to pick up whole (newsstands, stronghold barricades); Stage 3 can lift small buildings too.
export function liftable(b:Building,stage=1){if(b.hpNow<=0||b.lifted||b.role==='hydrant')return false;if(b.h<=FEEL.liftHeight)return true;
 // Trees come up by the roots at every stage, however tall: they are uprooted and carried like a lamppost.
 if(b.prop==='palm')return true;
 return stage>=3&&!b.landmark&&b.h<=FEEL.liftHeightStage3&&b.w<=FEEL.liftWidthStage3;}
export function canTopple(b:Building){return b.kind!=='tiny'&&b.h>=FEEL.toppleMinHeight;}
// Ground span [from,to] a fallen building covers: its pivot edge out to its full height in the fall direction.
// Damage to the index-th building (0 = nearest the pivot) under a faller of this height and chain generation.
export function crushDamage(height:number,index:number,generation:number,multiplier=1){return height*FEEL.toppleDamage*FEEL.toppleFalloff**index*FEEL.toppleChain**generation*multiplier;}
export function toppleSpan(b:Building):[number,number]{const pivot=b.tiltDir>0?b.x+b.w:b.x,end=pivot+b.tiltDir*b.h;return [Math.min(pivot,end),Math.max(pivot,end)];}
export function damageBuilding(b:Building,amount:number,source='player'):{damage:number,points:number,destroyed:boolean}{
 if((source!=='player'&&source!=='impact')||b.hpNow<=0||amount<=0)return {damage:0,points:0,destroyed:false};
 const damage=Math.min(b.hpNow,amount);b.hpNow-=damage;
 const destroyed=b.hpNow===0&&!b.rewarded;
 if(destroyed){b.rewarded=source==='player';b.collapse=CONFIG.collapseDuration;}
 return {damage,points:destroyed&&source==='player'?b.value*10:0,destroyed};
}
export function destruction(buildings:Building[]):number {const total=buildings.reduce((n,b)=>n+b.value,0);return total?buildings.reduce((n,b)=>n+(b.rewarded?b.value:0),0)/total:0;}
export function exitUnlocked(buildings:Building[],threshold=CONFIG.exitThreshold):boolean{return destruction(buildings)>=threshold;}
export function perfectBonus(buildings:Building[]):number{return destruction(buildings)===1?CONFIG.perfectBonus:0;}
export function solid(b:Building):boolean{return b.kind!=='tiny'&&(b.hpNow>0||b.creak>0);}
export function overlaps(a:{x:number,y:number,w:number,h:number},b:{x:number,y:number,w:number,h:number}){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

export type CrystalObjective={x:number,hp:number,maxHP:number,shattered:boolean};
export function canExitBlock(kind:'district'|'stronghold'|'boss',buildings:Building[],objective:CrystalObjective|null,threshold=CONFIG.exitThreshold){return kind==='district'?exitUnlocked(buildings,threshold):kind==='stronghold'?!!objective?.shattered:false;}
export function damageObjective(objective:CrystalObjective,damage:number,shardCount:number,source='player'){
 if(objective.shattered||damage<=0||source!=='player')return 0;
 objective.hp=Math.max(0,objective.hp-damage);if(objective.hp>0)return 0;
 objective.shattered=true;return shardCount;
}

// Buildings can be stood on and climbed; this resolves a size swap sideways so the body never ends inside one.
// Consider all solid edges together so growing in a narrow gap cannot push into a neighbor.
export function separateHorizontal(body:{x:number,y:number,w:number,h:number},obstacles:{x:number,y:number,w:number,h:number}[],worldWidth:number){
 const limit=Math.max(0,worldWidth-body.w),clamp=(x:number)=>Math.max(0,Math.min(limit,x));
 const x=clamp(body.x);if(!obstacles.some(o=>overlaps({...body,x},o)))return x;
 const candidates=[0,limit,...obstacles.flatMap(o=>[o.x-body.w,o.x+o.w])].filter(v=>v>=0&&v<=limit).sort((a,b)=>Math.abs(a-body.x)-Math.abs(b-body.x));
 return candidates.find(v=>!obstacles.some(o=>overlaps({...body,x:v},o)))??x;
}

// Floors: which one a blow `height` px above the foot lands on, how tall each is, and what happens when one gives out.
export function floorHeightOf(b:Building){return b.floors.length?b.h/b.floors.length:b.h;}
export function floorAt(b:Building,height:number){return Math.max(0,Math.min(b.floors.length-1,Math.floor(height/floorHeightOf(b))));}
// Wear the floor at `height` by `amount`. Returns the failure ('pancake' / 'top') if it gave out, after removing it: the building
// is one floor shorter, holes in that floor are gone and the ones above drop with the floors they are in.
export function wearFloor(b:Building,amount:number,height:number):null|'pancake'|'top'{
 if(b.floors.length<=1||b.hpNow<=0||amount<=0)return null;const i=floorAt(b,height);b.floors[i]-=amount;if(b.floors[i]>0)return null;
 const fh=floorHeightOf(b),lo=i*fh,top=i===b.floors.length-1;b.floors.splice(i,1);b.h=Math.round(b.h-fh);
 b.holes=b.holes.filter(o=>o.y<lo||o.y>=lo+fh).map(o=>o.y>=lo+fh?{...o,y:o.y-fh}:o);
 return top?'top':'pancake';}
