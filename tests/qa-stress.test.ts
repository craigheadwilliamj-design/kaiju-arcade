import {test} from 'node:test';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {createMilitary,tickMilitary,hitUnit} from '../src/military.ts';import {MILITARY as M} from '../src/config.ts';
test('30 simulated minutes of reinforcement pressure across all 25 city/tier combinations remain bounded',async()=>{
 const start=performance.now(),rows:any[]=[];
 for(let city=0;city<5;city++)for(let tier=1;tier<=5;tier++){
  let seed=12345+city*7+tier;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const s=createMilitary(tier,city,rng),peaks={units:0,shots:0,wrecks:0,effects:0};
  for(let frame=0;frame<1800;frame++){
   const camera=2000+Math.sin(frame*.003)*1800,player={x:camera+400,y:321,w:79.2,h:114};tickMilitary(s,.04,camera,7680,player,1);if(frame%75===0)for(const u of s.units)hitUnit(s,u,80,'player',120,1);s.events=[];
   assert.ok(s.units.length<=M.caps[tier-1]);assert.ok(s.projectiles.length<=M.projectileCap);assert.ok(s.wrecks.length<=M.wreckCap);assert.ok(s.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.hp)));peaks.units=Math.max(peaks.units,s.units.length);peaks.shots=Math.max(peaks.shots,s.projectiles.length);peaks.wrecks=Math.max(peaks.wrecks,s.wrecks.length);peaks.effects=Math.max(peaks.effects,s.effects.length);
  }
  rows.push({city:city+1,tier,simulatedSeconds:72,spawns:s.sequence,peaks});
 }
 await writeFile('qa/stress.json',JSON.stringify({scope:'World simulation only; no browser/GPU FPS claim',totalSimulatedSeconds:1800,ticks:45000,nodeWorldUpdateMilliseconds:Math.round(performance.now()-start),rows},null,2)+'\n');
});
