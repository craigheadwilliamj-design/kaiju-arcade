import {CONFIG} from './config.ts';
// Building hitboxes. A building is a list of rectangular parts. Ordinary buildings have one part, their whole footprint, so
// they behave exactly like the old single box. Landmarks author several (tiers, setbacks, crowns, spires, raised bodies on
// stilts) and every collision, hit and raycast goes through the parts, so the silhouette you see is the one you can hit.
export type Box={x:number,y:number,w:number,h:number};
// Authored, building-local part: `x` from the building's left edge, `top` and `base` as heights above the street.
// A `spire` can be hit but is not solid: you can't stand on it, climb it or be blocked by it.
export type Part={x:number,w:number,top:number,base?:number,spire?:boolean};
// World-space part. `solid` parts block movement, carry roofs and can be climbed.
export type HitPart=Box&{solid:boolean};
type Shape={x:number,w:number,h:number,parts?:readonly Part[]};

const cache=new WeakMap<object,{x:number,w:number,h:number,all:HitPart[],solid:HitPart[]}>();
function entry(b:Shape){
 const c=cache.get(b);if(c&&c.x===b.x&&c.w===b.w&&c.h===b.h)return c;
 const g=CONFIG.ground;
 const all:HitPart[]=b.parts?.length?b.parts.map(p=>({x:b.x+p.x,y:g-p.top,w:p.w,h:p.top-(p.base??0),solid:!p.spire})):[{x:b.x,y:g-b.h,w:b.w,h:b.h,solid:true}];
 const e={x:b.x,w:b.w,h:b.h,all,solid:all.filter(p=>p.solid)};cache.set(b,e);return e;
}
// Every part: what attacks, projectiles and effects test against.
export function hitParts(b:Shape):readonly HitPart[]{return entry(b).all;}
// Solid parts only: what bodies collide with, stand on and climb.
export function solidParts(b:Shape):readonly HitPart[]{return entry(b).solid;}
// The whole building's bounding box (street up to its highest part).
export function bounds(b:Shape):Box{return {x:b.x,y:CONFIG.ground-b.h,w:b.w,h:b.h};}

function overlap(a:Box,b:Box){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
// First part overlapping the box, or null.
export function partHit(b:Shape,box:Box,solidOnly=false):HitPart|null{for(const p of solidOnly?solidParts(b):hitParts(b))if(overlap(box,p))return p;return null;}
export function hitsBox(b:Shape,box:Box,solidOnly=false){return !!partHit(b,box,solidOnly);}
// Part containing the point (edges inclusive), or null.
export function partAt(b:Shape,x:number,y:number,solidOnly=false):HitPart|null{for(const p of solidOnly?solidParts(b):hitParts(b))if(x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h)return p;return null;}
export function circleHits(b:Shape,cx:number,cy:number,r:number){
 for(const p of hitParts(b)){const nx=Math.max(p.x,Math.min(cx,p.x+p.w)),ny=Math.max(p.y,Math.min(cy,p.y+p.h));if((cx-nx)**2+(cy-ny)**2<=r*r)return true;}return false;}
// Highest surface (smallest y) of any part over street column x, or null if the column misses the building.
export function topAt(b:Shape,x:number,solidOnly=false):number|null{let top:number|null=null;
 for(const p of solidOnly?solidParts(b):hitParts(b))if(x>=p.x&&x<=p.x+p.w&&(top===null||p.y<top))top=p.y;return top;}
// The solid roof under a body spanning [x0,x1] whose feet are within `tol` of it, highest first.
export function roofUnder(b:Shape,x0:number,x1:number,feet:number,tol=6):HitPart|null{let best:HitPart|null=null;
 for(const p of solidParts(b))if(p.x<x1&&p.x+p.w>x0&&Math.abs(p.y-feet)<tol&&(!best||p.y<best.y))best=p;return best;}
// The part nearest a point (inside counts as distance 0), for placing impact marks on the struck tier.
export function nearestPart(b:Shape,x:number,y:number):HitPart{let best=hitParts(b)[0],bd=Infinity;
 for(const p of hitParts(b)){const dx=x-Math.max(p.x,Math.min(x,p.x+p.w)),dy=y-Math.max(p.y,Math.min(y,p.y+p.h)),d=dx*dx+dy*dy;if(d<bd){bd=d;best=p;}}return best;}

// Authoring checks: parts sit inside the footprint, the highest one defines the height, and every part is held up,
// either standing on the street or resting on/overlapping another part under it. Returns a list of problems.
export function checkParts(b:Shape):string[]{if(!b.parts?.length)return [];const out:string[]=[];
 const top=Math.max(...b.parts.map(p=>p.top));if(top!==b.h)out.push(`height ${b.h} but highest part tops out at ${top}`);
 b.parts.forEach((p,i)=>{const base=p.base??0;
  if(p.w<=0||p.top<=base)out.push(`part ${i} is empty`);
  if(p.x<0||p.x+p.w>b.w)out.push(`part ${i} spills outside the ${b.w}-wide footprint`);
  if(base>0&&!b.parts!.some((q,j)=>j!==i&&q.x<p.x+p.w&&q.x+q.w>p.x&&q.top>=base&&(q.base??0)<base))out.push(`part ${i} floats at ${base}`);
 });
 if(!b.parts.some(p=>!(p.base??0)&&!p.spire))out.push('nothing solid stands on the street');
 return out;
}
