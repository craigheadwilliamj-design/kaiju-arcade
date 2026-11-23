import {CONFIG as C} from './config.ts';

// Ground profile for the current block: the street's height at any x. With no profile set (the default, and every block that
// does not author one) the street is flat at CONFIG.ground, exactly as before terrain existed.
// A profile is a list of [x, y] points (world x, street y; smaller y = higher ground), sorted by x, joined by straight lines and
// held flat past either end. Buildings must stand on flat stretches; slopes go in the streets and plazas between them.
// On top of the profile:
//  - water: [from, to, surfaceY] spans. Where the ground is below the surface (and no bridge deck covers it) things are submerged.
//  - decks: bridge spans. While a span is alive its deck is the ground across [x0, x1] (a riverbed below doesn't matter).
//  - pits: holes torn in the street at runtime (subway cave-ins); their floor is lower ground.
export type Deck={x0:number,x1:number,y:number,alive:boolean};
export type Pit={x0:number,x1:number,floor:number};
export type Mound={x0:number,x1:number,h:number,side:number};
// mounds: rubble heaps on top of the street (they raise groundAt but not bedAt, so the street is still drawn under them).
let points:[number,number][]|null=null,water:[number,number,number][]=[],decks:Deck[]=[],pits:Pit[]=[],mounds:Mound[]=[];
export function setTerrain(p:[number,number][]|null,w:[number,number,number][]=[],d:Deck[]=[]){
 points=p&&p.length?[...p].sort((a,b)=>a[0]-b[0]):null;water=w;decks=d;pits=[];mounds=[];}
export function hasTerrain(){return !!points||water.length>0||decks.length>0||pits.length>0||mounds.length>0;}
function profileAt(x:number){
 if(!points)return C.ground;
 if(x<=points[0][0])return points[0][1];
 for(let i=1;i<points.length;i++){const [x1,y1]=points[i];if(x<=x1){const [x0,y0]=points[i-1];return x1===x0?y1:y0+(y1-y0)*(x-x0)/(x1-x0);}}
 return points[points.length-1][1];
}
export function deckAt(x:number){for(const d of decks)if(d.alive&&x>=d.x0&&x<d.x1)return d;return null;}
export function pitAt(x:number){for(const p of pits)if(x>=p.x0&&x<p.x1)return p;return null;}
export function groundAt(x:number){
 if(!points&&!decks.length&&!pits.length&&!mounds.length)return C.ground;
 const d=deckAt(x);if(d)return d.y;
 const g=profileAt(x),p=pitAt(x);return (p?Math.max(g,p.floor):g)-moundAt(x);
}
// How high the rubble stands at x (0 off any mound): a flat top with sloped sides.
export function moundAt(x:number){let h=0;for(const m of mounds){if(x<=m.x0||x>=m.x1)continue;const t=Math.min(1,Math.min(x-m.x0,m.x1-x)/m.side);h=Math.max(h,m.h*t);}return h;}
export function addMound(x0:number,x1:number,h:number,side=.3){if(x1-x0<8||h<=0)return null;const m={x0,x1,h,side:Math.max(6,(x1-x0)*side)};mounds.push(m);return m;}
export function moundList(){return mounds;}
// The ground ignoring bridge decks: the street, the riverbed under a bridge, pit floors. For drawing what is under a deck.
export function bedAt(x:number){if(!points&&!pits.length)return C.ground;const g=profileAt(x),p=pitAt(x);return p?Math.max(g,p.floor):g;}
// Water surface at x, if x is over a river (whatever is under it).
export function waterAt(x:number){for(const [a,b,y] of water)if(x>=a&&x<b)return y;return null;}
// Under water: over a river, below its surface, with no deck in the way.
export function submerged(x:number){const s=waterAt(x);return s!==null&&groundAt(x)>s;}
// Highest street (smallest y) anywhere under a span: what something that wide rests on.
export function groundUnder(x:number,w:number){let y=Math.min(groundAt(x),groundAt(x+w));if(points)for(const [px,py] of points)if(px>x&&px<x+w)y=Math.min(y,py);return y;}
// Rise per pixel at x (positive = the street climbs toward +x).
export function slopeAt(x:number){return (groundAt(x-4)-groundAt(x+4))/8;}
// Authored profiles are [x, rise] pairs at authored scale: rise is how far above the default street the ground is (negative dips).
export function profileFrom(rises:[number,number][],scale:number):[number,number][]{return rises.map(([x,r])=>[Math.round(x*scale),Math.round(C.ground-r*scale)]);}
// The profile's points, for drawing the street.
export function terrainPoints(){return points;}
export function waterSpans(){return water;}
export function pitList(){return pits;}
// Open a pit over [x0, x1] down to `floor`, merging with any pit it touches. Returns the pit.
export function addPit(x0:number,x1:number,floor:number){
 for(const p of pits)if(x0<=p.x1&&x1>=p.x0){p.x0=Math.min(p.x0,x0);p.x1=Math.max(p.x1,x1);p.floor=Math.max(p.floor,floor);
  for(const q of [...pits])if(q!==p&&q.x0<=p.x1&&q.x1>=p.x0){p.x0=Math.min(p.x0,q.x0);p.x1=Math.max(p.x1,q.x1);pits.splice(pits.indexOf(q),1);}return p;}
 const p={x0,x1,floor};pits.push(p);return p;}
