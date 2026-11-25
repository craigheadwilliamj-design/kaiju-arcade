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
// `base`: the street height under the building (terrain); without one it stands on the flat street.
type Shape={x:number,w:number,h:number,base?:number,parts?:readonly Part[]};

const cache=new WeakMap<object,{x:number,w:number,h:number,g:number,all:HitPart[],solid:HitPart[]}>();
function entry(b:Shape){
 const g=b.base??CONFIG.ground,c=cache.get(b);if(c&&c.x===b.x&&c.w===b.w&&c.h===b.h&&c.g===g)return c;
 const all:HitPart[]=b.parts?.length?b.parts.map(p=>({x:b.x+p.x,y:g-p.top,w:p.w,h:p.top-(p.base??0),solid:!p.spire})):[{x:b.x,y:g-b.h,w:b.w,h:b.h,solid:true}];
 const e={x:b.x,w:b.w,h:b.h,g,all,solid:all.filter(p=>p.solid)};cache.set(b,e);return e;
}
// Every part: what attacks, projectiles and effects test against.
export function hitParts(b:Shape):readonly HitPart[]{return entry(b).all;}
// Solid parts only: what bodies collide with, stand on and climb.
export function solidParts(b:Shape):readonly HitPart[]{return entry(b).solid;}
// A landmark that has lost floors (a sheared roof, a pancaked storey) is only as tall as it is now: cut every part to height H,
// dropping the ones that stood wholly above it.
export function clipParts(parts:readonly Part[],H:number):Part[]{return parts.filter(p=>(p.base??0)<H).map(p=>p.top>H?{...p,top:H}:p);}
// The whole building's bounding box (street up to its highest part).
export function bounds(b:Shape):Box{return {x:b.x,y:(b.base??CONFIG.ground)-b.h,w:b.w,h:b.h};}

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

// Authoring checks: parts sit inside the footprint and every part is held up, either standing on the street or resting
// on/overlapping another part under it. Parts may rise above b.h: crowns and spires drawn above the box are part of the
// silhouette. Returns a list of problems.
export function checkParts(b:Shape):string[]{if(!b.parts?.length)return [];const out:string[]=[];
 b.parts.forEach((p,i)=>{const base=p.base??0;
  if(p.w<=0||p.top<=base)out.push(`part ${i} is empty`);
  if(p.x<0||p.x+p.w>b.w)out.push(`part ${i} spills outside the ${b.w}-wide footprint`);
  if(base>0&&!b.parts!.some((q,j)=>j!==i&&q.x<p.x+p.w&&q.x+q.w>p.x&&q.top>=base&&(q.base??0)<base))out.push(`part ${i} floats at ${base}`);
 });
 if(!b.parts.some(p=>!(p.base??0)&&!p.spire))out.push('nothing solid stands on the street');
 return out;
}

// Parts for the drawn landmark silhouettes ('tower', 'lattice', 'dome', 'twin', 'arch', 'needle', 'pagoda'), sized to the
// building's world w and h and matching what drawLandmarkShape (src/game.ts) paints for that city style. Change one, change both.
// Lattices and arches keep their openings: small kaiju can walk through the gap under the Eiffel Tower or an arch.
export function shapeParts(shape:string,style:string,w:number,h:number):Part[]{
 const bw=w-7,c=bw/2,r=Math.round,P=(x:number,pw:number,top:number,base=0,spire=false):Part=>({x:r(x),w:Math.max(1,r(pw)),top:r(top),...(base?{base:r(base)}:{}),...(spire?{spire}:{})});
 switch(shape){
  case 'lattice':{const H=h-18,half=(t:number)=>(bw/2)*(1-t)**1.6+3,ar=bw*.32;
   return [P(0,c-ar,ar),P(c+ar,bw-c-ar,ar),P(c-half(.28)-4,2*half(.28)+8,.28*H,ar*.9),P(c-half(.56)-4,2*half(.56)+8,.56*H,.28*H-6),P(c-half(.85),2*half(.85),H,.56*H-6),P(c-1,2,h+30,H-6,true)];}
  case 'dome':return [P(0,bw,.62*h),P(c-bw*.3,bw*.6,.78*h),P(c-bw*.18,bw*.36,.88*h),P(c-8,16,h),P(c-1,2,h+6,h-4,true)];
  case 'twin':{const tw=bw*.36,parts=[P(0,tw,h),P(bw-tw,tw,h),P(tw,bw-2*tw,.55*h)];
   if(style==='tyo')parts.push(P(tw/2-3,6,h+30,h-4,true),P(bw-tw/2-3,6,h+30,h-4,true));return parts;}
  case 'arch':{const top=style==='mex'?.7*h:.75*h,aw=bw*.42,open=.42*h+aw/2,parts=[P(0,c-aw/2,top),P(c+aw/2,bw-c-aw/2,top),P(0,bw,top,open)];
   if(style==='mex')parts.push(P(c-bw*.22,bw*.44,.86*h,top-2),P(c-3,6,h,.86*h-2,true));return parts;}
  case 'needle':if(style==='tyo')return [P(bw*.2,bw*.6,.4*h),P(c-bw*.18,bw*.36,.7*h),P(c-18,36,.72*h),P(c-14,28,.85*h),P(c-7,14,h-30),P(c-2,4,h+40,h-34,true)];
   {// The drawn lattice is a polygon: straight up the left edge to 0.7h, rising to the peak over the middle and falling to 0.85h on the right.
    // Narrow columns follow its outline (each as tall as the outline at its centre), so the hitbox is the silhouette rather than a block.
    const N=8,cw=bw/N,out:Part[]=[];for(let k=0;k<N;k++){const m=(k+.5)*cw,top=m<=c?h*(.7+.3*m/c):h*(1-.15*(m-c)/(bw-c));out.push(P(k*cw,cw,top));}
    out.push(P(c-bw*.3-1,2,h+28,.7*h-4,true),P(c+bw*.3-1,2,h+28,.7*h-4,true));return out;}
  // Pagoda tiers are the drawn walls (76% of each tier); the eaves are trim.
  case 'pagoda':{const parts:Part[]=[];for(let t=0;t<5;t++){const tw=bw*(1-t*.13)*.76;parts.push(P(c-tw/2,tw,(t+1)*.16*h));}parts.push(P(c-2,4,h,.8*h-4,true));return parts;}
  // 'tower': the box with the stepped crown and spire drawn above it.
  default:return [P(0,w,h),P(12,w-31,h+17),P(36,w-79,h+37),P(c-3,6,h+97,h+33,true)];
 }
}
