import {test} from 'node:test';import assert from 'node:assert/strict';
import {bootGame,bootCampaign} from './helpers/game-harness.ts';
import {LEVELS,landmarkShape} from '../src/levels.ts';
import {CONFIG as C} from '../src/config.ts';
import {hitParts,solidParts,partHit,roofUnder,topAt,checkParts,circleHits} from '../src/hitbox.ts';

const landmarks=LEVELS.flat().flatMap(b=>b.buildings.filter(x=>x.landmark));
const named=(label:string)=>landmarks.find(b=>b.label===label)!;

test('ordinary buildings keep their single footprint box',()=>{
 for(const b of LEVELS.flat().flatMap(x=>x.buildings).filter(x=>!x.landmark&&!x.upperDeck&&x.deco!=='btower'&&x.deco!=='tallship'&&x.deco!=='guardtower')){
  assert.deepEqual(hitParts(b),[{x:b.x,y:C.ground-b.h,w:b.w,h:b.h,solid:true}]);
  assert.equal(solidParts(b).length,1);}
});

test('every landmark has a valid, distinct part silhouette',()=>{
 assert.ok(landmarks.length>=8);
 for(const b of landmarks){
  assert.ok(b.parts&&b.parts.length>=2,`${b.label} has tiers`);
  assert.deepEqual(checkParts(b),[],`${b.label} parts are sound`);
  // Inside the footprint and above the street; crowns and spires may rise above the box.
  for(const p of hitParts(b))assert.ok(p.x>=b.x&&p.x+p.w<=b.x+b.w&&p.y+p.h<=C.ground,`${b.label} part inside its footprint`);}
 // Named NYC towers each have their own authored tiers; every other landmark's parts follow its drawn shape.
 const nyc=landmarks.filter(b=>!b.shape);assert.ok(nyc.length>=8);
 for(const b of nyc)assert.deepEqual(b.parts?.map(p=>p.top),landmarkShape(b.label)!.map(p=>Math.round(p.top*C.cityScale)),`${b.label} uses its authored tiers`);
 assert.equal(new Set(nyc.map(b=>JSON.stringify(landmarkShape(b.label)))).size,new Set(nyc.map(b=>b.label)).size,'each NYC tower has its own outline');
 for(const b of landmarks.filter(b=>b.shape))assert.ok(b.parts!.some(p=>!p.spire&&!p.base),`${b.label} (${b.shape}) stands on the street`);
});

test('authoring checks catch floating, spilling and empty parts',()=>{
 const base={x:0,w:100,h:300};
 assert.match(checkParts({...base,parts:[{x:0,w:100,top:100},{x:0,w:50,top:300,base:200}]}).join(),/floats/);
 assert.match(checkParts({...base,parts:[{x:0,w:100,top:300},{x:80,w:40,top:200}]}).join(),/spills/);
 assert.match(checkParts({...base,parts:[{x:0,w:100,top:300},{x:10,w:10,top:200,base:200}]}).join(),/empty/);
});

test('spires can be hit but not stood on',()=>{
 const b=named('WOOLWORTH'),spire=hitParts(b).find(p=>!p.solid)!,crown=solidParts(b).reduce((a,p)=>p.y<a.y?p:a);
 assert.ok(spire&&spire.y<crown.y,'spire rises above the crown');
 const tip={x:spire.x,y:spire.y+2,w:spire.w,h:4};
 assert.equal(partHit(b,tip),spire,'a punch at the spire tip connects');
 assert.equal(partHit(b,tip,true),null,'but it blocks nothing');
 assert.ok(circleHits(b,spire.x+spire.w/2,spire.y+5,2));
 const cx=spire.x+spire.w/2;
 assert.equal(topAt(b,cx),spire.y);assert.equal(topAt(b,cx,true),crown.y,'the highest standable surface is the crown');
 assert.equal(roofUnder(b,cx-20,cx+20,spire.y),null);assert.equal(roofUnder(b,cx-20,cx+20,crown.y),crown);
 // The old single box would have stood you on thin air beside the tower.
 assert.equal(roofUnder(b,b.x,b.x+20,crown.y),null);
});

test('Citicorp stands on a column: Stages 1-2 walk under it, Stage 3 does not fit',()=>{
 const b=named('CITICORP'),body=(s:number)=>({x:b.x+2,y:C.ground-C.playerHeight*s,w:Math.min(C.playerWidth*s,100),h:C.playerHeight*s});
 assert.equal(partHit(b,body(1),true),null,'Stage 1 clears the cantilever');
 assert.equal(partHit(b,body(1.4),true),null,'Stage 2 clears it');
 const hitP=partHit(b,body(2.8),true);assert.ok(hitP&&hitP.y+hitP.h<C.ground,'Stage 3 hits the raised body');
});

test('a landmark is climbed tier by tier and each setback is a roof',async()=>{
 const h=await bootCampaign(.75,{kaiju:'Mogurodon'});
 try{
  
  assert.equal(h.state().mode,'playing');
  const se=h.state().buildings.find((b:any)=>b.landmark&&b.x>h.state().x),tiers=se.parts.filter((p:any)=>p.solid);
  assert.equal(tiers.length,3);
  const inside=()=>{const s=h.state();return tiers.some((p:any)=>s.x<p.x+p.w-1&&s.x+s.width>p.x+1&&s.y<p.y+p.h-1&&s.y+s.height>p.y+1);};
  // Run east over the rooftops (W held climbs anything in the way) to the roof just past the Stock Exchange.
  h.down('KeyD');h.down('KeyW');
  for(let i=0;i<3000;i++){h.step();const s=h.state();assert.equal(s.mode,'playing');assert.ok(!inside(),'never inside a tier');if(s.x>se.x+se.w+40&&s.grounded)break;}
  h.up('KeyD');
  assert.ok(h.state().x>se.x+se.w,'reached the east side');
  // Climb back west up its face: each tier's east wall in turn, standing on the setback and on top.
  h.down('KeyA');const clung=new Set<number>(),stood=new Set<number>();
  for(let i=0;i<900;i++){h.step();const s=h.state();assert.ok(!inside(),'never inside a tier');
   if(s.clinging)for(const [n,p] of tiers.entries())if(Math.abs(s.x-(p.x+p.w))<=4)clung.add(n);
   if(s.grounded)for(const [n,p] of tiers.entries())if(Math.abs(s.y+s.height-p.y)<1&&s.x+s.width>p.x&&s.x<p.x+p.w)stood.add(n);
   if(s.x+s.width<se.x)break;}
  assert.deepEqual([...clung].sort(),[0,1,2],'clung to every tier wall');
  assert.ok(stood.has(1)&&stood.has(2),`stood on the setback and the top (${[...stood]})`);
 }finally{h.release();h.cleanup();}
});
