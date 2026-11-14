import {CONFIG as C,MILITARY as M} from './config.ts';
import {overlaps} from './rules.ts';import type {Rect} from './military.ts';
export type Civilian={x:number,variant:number,escaped:boolean,squashed:boolean,panicked:boolean};
export type Car={x:number,crushed:boolean,color:string};
export type Population={civilians:Civilian[],cars:Car[],released:Set<number>,rng:()=>number};
const STREET=[175,375,520,805,1005,1185,1425,1605,1715,1920,2160,2330,2570,2815,3130,3390,3630];
const PARKED=[230,710,1005,1195,1580,1910,2160,2370,2550,2830,3120,3380,3650];
// Each street spot is a small crowd centred on it; the first person in each crowd stands exactly on the spot.
function crowd(street:number[]):Civilian[]{const out:Civilian[]=[],n=M.crowdSize;
 for(let i=0;i<street.length;i++)for(let k=0;k<n;k++){const off=k===0?0:(k%2?1:-1)*Math.ceil(k/2)*M.crowdSpread;out.push({x:street[i]+off,variant:(i+k)%3,escaped:false,squashed:false,panicked:false});}
 return out;}
export function createPopulation(rng=Math.random,street=STREET,parked=PARKED):Population{return {civilians:crowd(street),cars:parked.map((x,i)=>({x,crushed:false,color:['#b16d5b','#70958e','#a09b65'][i%3]})),released:new Set(),rng};}
export function releaseOccupants(s:Population,buildingID:number,x:number){
 if(s.released.has(buildingID))return 0;s.released.add(buildingID);const [lo,hi]=M.occupants,count=lo+Math.min(hi-lo,Math.floor(s.rng()*(hi-lo+1)));
 for(let n=0;n<count&&s.civilians.length<M.civilianMax;n++)s.civilians.push({x:x+n*8,variant:(buildingID+n)%3,escaped:false,squashed:false,panicked:true});return count;
}
export function crushCar(car:Car){if(car.crushed)return 0;car.crushed=true;return M.carPoints;}
export function carBox(car:Car):Rect{return {x:car.x,y:C.ground-16,w:33,h:16};}
export function tickPopulation(s:Population,dt:number,player:Rect,worldWidth:number,awardPoints=true){
 let points=0;
 for(const c of s.civilians){if(c.escaped||c.squashed)continue;
 if(overlaps(player,{x:c.x,y:C.ground-8,w:3,h:8})){c.squashed=true;if(awardPoints)points+=M.civilianPoints;continue;}
 if(Math.abs(c.x-player.x)<420)c.panicked=true;if(!c.panicked)continue;
 c.x+=(c.x<player.x+player.w/2?-1:1)*M.civilianSpeed*dt;
 if(c.x<-15||c.x>worldWidth+15)c.escaped=true;
 }return points;
}
