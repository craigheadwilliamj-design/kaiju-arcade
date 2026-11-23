import {CONFIG as C} from './config.ts';

// Ground profile for the current block: the street's height at any x. With no profile set (the default, and every block that
// does not author one) the street is flat at CONFIG.ground, exactly as before terrain existed.
// A profile is a list of [x, y] points (world x, street y; smaller y = higher ground), sorted by x, joined by straight lines and
// held flat past either end. Buildings must stand on flat stretches; slopes go in the streets and plazas between them.
let points:[number,number][]|null=null;
export function setTerrain(p:[number,number][]|null){points=p&&p.length?[...p].sort((a,b)=>a[0]-b[0]):null;}
export function hasTerrain(){return !!points;}
export function groundAt(x:number){
 if(!points)return C.ground;
 if(x<=points[0][0])return points[0][1];
 for(let i=1;i<points.length;i++){const [x1,y1]=points[i];if(x<=x1){const [x0,y0]=points[i-1];return x1===x0?y1:y0+(y1-y0)*(x-x0)/(x1-x0);}}
 return points[points.length-1][1];
}
// Highest street (smallest y) anywhere under a span: what something that wide rests on.
export function groundUnder(x:number,w:number){let y=Math.min(groundAt(x),groundAt(x+w));if(points)for(const [px,py] of points)if(px>x&&px<x+w)y=Math.min(y,py);return y;}
// Rise per pixel at x (positive = the street climbs toward +x).
export function slopeAt(x:number){return (groundAt(x-4)-groundAt(x+4))/8;}
// Authored profiles are [x, rise] pairs at authored scale: rise is how far above the default street the ground is (negative dips).
export function profileFrom(rises:[number,number][],scale:number):[number,number][]{return rises.map(([x,r])=>[Math.round(x*scale),Math.round(C.ground-r*scale)]);}
// The profile's points, for drawing the street.
export function terrainPoints(){return points;}
