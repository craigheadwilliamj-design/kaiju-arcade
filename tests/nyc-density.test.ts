import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,cityIndexOf} from '../src/levels.ts';
import {CONFIG as C,BUILDING_PRESETS as BP,VEHICLES as VC} from '../src/config.ts';
import {createBuildings,overlaps} from '../src/rules.ts';
import {checkParts} from '../src/hitbox.ts';
// NYC fix card 5: density behind the street (a back row of buildings, a taller far skyline), no needle towers, walk-through street clutter.
const NYC=cityIndexOf('nyc'),ROUTE=LEVELS[NYC],sc=(n:number)=>Math.round(n*C.cityScale);
const CAP=4.5;
test('no ordinary building on a New York level is a needle: height is at most 4.5x width',()=>{
 for(const b of ROUTE)for(const x of b.buildings){
  // Landmarks (a named spire) and hand-built pieces (halls, props, ships, coaster track, the Bull's plaza) are exempt; so are walk-through props and city-system yards.
  if(x.landmark||x.kind==='tiny'||x.deco||x.role||x.prop||x.parts)continue;
  assert.ok(x.h<=CAP*x.w+1,`${b.name}: ${x.label||x.color} at ${x.x} is ${x.w}x${x.h} (${(x.h/x.w).toFixed(1)}:1)`);}
});
test('the needle presets are retired from New York: no route level builds a tower from `n`, or from `x` at its old proportions',()=>{
 for(const b of ROUTE)for(const x of b.buildings)assert.ok(!(x.w===sc(BP.n.w)&&x.h===sc(BP.n.h))&&!(x.w===sc(BP.x.w)&&x.h===sc(BP.x.h)),`${b.name}: a needle tower at ${x.x}`);
 assert.ok(BP.y.w*C.cityScale>=170&&BP.y.h/BP.y.w<=CAP&&BP.u.h/BP.u.w<=CAP);
});
test('the wide towers keep each level\'s layout: solid buildings never overlap and everything is inside the world',()=>{
 for(const b of ROUTE){const W=sc(b.screens*C.width),s=createBuildings(b.buildings.filter(x=>x.kind!=='tiny'));
  for(const x of s){assert.ok(x.x>=0&&x.x+x.w<=W,`${b.name}: ${x.label||x.deco} inside the world`);assert.deepEqual(checkParts(x),[]);}
  for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++)assert.ok(!overlaps({x:s[i].x,y:0,w:s[i].w,h:1},{x:s[j].x,y:0,w:s[j].w,h:1}),`${b.name}: solid buildings ${i} and ${j} overlap`);}
});
