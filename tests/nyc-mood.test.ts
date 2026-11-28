import {test} from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,CITIES,cityIndexOf,levelWidth} from '../src/levels.ts';
import {NYC2} from '../src/config.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// NYC fix card 4: day -> dusk -> night -> dawn -> day across SoHo, Times Square and Grand Central (BlockDef `moodRamp`).
const NYC=cityIndexOf('nyc'),L=LEVELS[NYC],at=(n:string)=>L.findIndex(b=>b.name===n),day=CITIES[NYC].mood;
// Sample the blended mood the game reports with the camera centred at world x (the real loop, nothing mocked).
async function lightsAlong(name:string,xs:number[]){const h=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban'});const out:number[]=[];
 for(const x of xs){h.test().goto(at(name),0);h.test().setCamera(x);out.push(h.state().moodLights);}return out;}
const span=(name:string,n=24)=>{const W=levelWidth(L[at(name)]);return Array.from({length:n+1},(_,i)=>i/n*(W-1));};
const nonDecreasing=(a:number[])=>a.every((v,i)=>i===0||v>=a[i-1]-1e-9),nonIncreasing=(a:number[])=>a.every((v,i)=>i===0||v<=a[i-1]+1e-9);

test('only SoHo, Times Square and Grand Central have a moodRamp; every other level and city is untouched',()=>{
 const ramped=['SoHo and Canal Street','Times Square','Grand Central'];
 for(const [ci,city] of LEVELS.entries())for(const b of city){if(ci===NYC&&ramped.includes(b.name))assert.ok(b.moodRamp,b.name);else assert.equal(b.moodRamp,undefined,`${b.name} has no moodRamp`);}
 assert.equal(L[at('Times Square')].night,true,'night:true still works');
 for(const b of L.flat().filter(b=>b.name!=='Times Square'))assert.equal(b.night,undefined);
 for(const b of LEVELS.flat())for(const [x] of b.moodRamp??[])assert.ok(x>=0&&x<=levelWidth(b));
 for(const b of [L[at('SoHo and Canal Street')],L[at('Times Square')],L[at('Grand Central')]])assert.ok(b.moodRamp!.every(([x],i,a)=>i===0||x>a[i-1][0]),'stops ascend');
});

test('SoHo: day for most of it, golden hour from two thirds, dusk at the east exit; lights rise monotonically',async()=>{
 const W=levelWidth(L[at('SoHo and Canal Street')]),l=await lightsAlong('SoHo and Canal Street',span('SoHo and Canal Street'));
 assert.ok(nonDecreasing(l),l.join());assert.equal(l[0],day.lights);assert.equal(l[l.length-1],NYC2.dusk.lights);
 const [early,mid]=await lightsAlong('SoHo and Canal Street',[W*.3,W*.5]);assert.equal(early,day.lights);assert.equal(mid,day.lights);
 const [golden]=await lightsAlong('SoHo and Canal Street',[W*.72]);assert.equal(golden,NYC2.golden.lights);assert.ok(golden>day.lights&&golden<NYC2.dusk.lights);
});

test('Times Square: opens at dusk, full night within about a screen, night through the middle, pre-dawn at the east exit',async()=>{
 const W=levelWidth(L[at('Times Square')]),l=await lightsAlong('Times Square',span('Times Square'));
 assert.equal(l[0],NYC2.dusk.lights);assert.equal(Math.max(...l),1);
 const [start,screen,mid,ball,end]=await lightsAlong('Times Square',[0,1500,W*.5,3400,W]);
 assert.equal(start,NYC2.dusk.lights);assert.equal(screen,1);assert.equal(mid,1);assert.equal(ball,1);assert.equal(end,NYC2.predawn.lights);
 const rise=l.slice(0,l.indexOf(1)+1),fall=l.slice(l.lastIndexOf(1));assert.ok(nonDecreasing(rise)&&nonIncreasing(fall));
 assert.ok(NYC2.predawn.lights>day.lights&&NYC2.predawn.lights<1,'pre-dawn is lifting, not yet day');
});

test('Grand Central: opens at dawn and is in full day by a third of the way in; lights fall monotonically',async()=>{
 const W=levelWidth(L[at('Grand Central')]),l=await lightsAlong('Grand Central',span('Grand Central'));
 assert.ok(nonIncreasing(l),l.join());assert.equal(l[0],NYC2.dawn.lights);assert.equal(l[l.length-1],day.lights);
 const [third,half]=await lightsAlong('Grand Central',[W/3,W/2]);assert.equal(third,day.lights);assert.equal(half,day.lights);
});

test('the blend is continuous (no snaps between neighbouring camera spots) and the other levels keep their hard mood',async()=>{
 const h=await bootCampaign(.75,{city:'nyc',kaiju:'Kaiban'});
 for(const name of ['SoHo and Canal Street','Times Square','Grand Central']){const W=levelWidth(L[at(name)]);let prev=NaN;
  for(let x=0;x<=W;x+=40){h.test().goto(at(name),0);h.test().setCamera(x);const v=h.state().moodLights;if(!Number.isNaN(prev))assert.ok(Math.abs(v-prev)<.05,`${name} jumps at ${x}`);prev=v;}}
 h.test().goto(at('Wall Street'),0);h.step(2);assert.equal(h.state().moodLights,day.lights);
 const sf=await bootCampaign(.75,{city:'sfo'});sf.step(2);assert.equal(sf.state().moodLights,CITIES[cityIndexOf('sfo')].mood.lights);
});
