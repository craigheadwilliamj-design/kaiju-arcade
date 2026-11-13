import {test} from 'node:test';import assert from 'node:assert/strict';
import {hudScore,ROSTER,ENDINGS,introScene,INTRO_DURATION,selectable,validFreePlay,unlockEnding,canViewEnding} from '../src/presentation.ts';
import {KAIJU,emptyPermanent,newRun,conquerCity,readSaves,PERMANENT_KEY} from '../src/campaign.ts';
test('four static intro scenes span twelve seconds with bounded indices',()=>{assert.equal(INTRO_DURATION,12);assert.deepEqual([0,2.9,3,5.9,6,8.9,9,12,50,-1].map(introScene),[0,0,1,1,2,2,3,3,3,0]);});
test('six roster entries have four provisional 1–5 ratings and confirmed ending titles',()=>{assert.deepEqual(ROSTER.map(r=>r.name),KAIJU);for(const r of ROSTER){assert.equal(r.ratings.length,4);assert.ok(r.ratings.every(n=>n>=1&&n<=5));}assert.deepEqual(ENDINGS.map(e=>e.title),['The Earth Belongs to Him','The World in Flames','The Great Dissolution','King of the Ruins','The Swarm Ascendant','The World Reclaimed']);});
test('locked kaiju cannot be selected and unknown identities are rejected',()=>{const p=emptyPermanent();assert.equal(selectable(p,'Mogurodon'),true);assert.equal(selectable(p,'Kaiban'),false);p.unlocked.push('Kaiban');assert.equal(selectable(p,'Kaiban'),true);p.unlocked.push('Unknown');assert.equal(selectable(p,'Unknown'),false);});
test('Free Play requires conquered city plus independent player/boss unlocks; mirrors allowed',()=>{const p=emptyPermanent(),c={kaiju:'Mogurodon',city:0,boss:'Mogurodon'};assert.equal(validFreePlay(p,c),false);p.conquered.push(0);assert.equal(validFreePlay(p,c),true);assert.equal(validFreePlay(p,{...c,boss:'Kaiban'}),false);p.unlocked.push('Kaiban');assert.equal(validFreePlay(p,{kaiju:'Kaiban',city:0,boss:'Kaiban'}),true);assert.equal(validFreePlay(p,{...c,city:1}),false);assert.equal(validFreePlay(p,{...c,city:-1}),false);assert.equal(validFreePlay(p,{...c,city:99}),false);});
test('gallery stays locked until awarded; awards are idempotent and identity-bound',()=>{const p=emptyPermanent();assert.equal(canViewEnding(p,'Mogurodon'),false);assert.equal(unlockEnding(p,'Mogurodon'),true);assert.equal(unlockEnding(p,'Mogurodon'),false);assert.equal(canViewEnding(p,'Kaiban'),false);assert.equal(unlockEnding(p,'Unknown'),false);assert.equal(canViewEnding(p,'Mogurodon'),true);});
test('completion with each selected kaiju unlocks only its corresponding ending',()=>{for(const name of KAIJU){const p=emptyPermanent(),r=newRun('ABC',name);r.city=4;r.block=4;r.phase='playing';assert.equal(conquerCity(p,r,100,'Sargathoth'),true);assert.deepEqual(p.gallery,[name]);assert.equal(p.scores[0].kaiju,name);}});
test('known completed M4 leaderboard records migrate into gallery, failures do not',()=>{const p=emptyPermanent();p.scores=[{id:'complete',initials:'ABC',kaiju:'Mogurodon',score:500,cities:5,completed:true},{id:'failed',initials:'XYZ',kaiju:'Kaiban',score:100,cities:2,completed:false}];const loaded=readSaves({getItem:k=>k===PERMANENT_KEY?JSON.stringify(p):null,setItem:()=>{},removeItem:()=>{}});assert.deepEqual(loaded.permanent.gallery,['Mogurodon']);});
test('missing original epilogues remain explicit empty slots rather than invented lore',()=>{assert.ok(ENDINGS.every(e=>e.epilogue===null));});
test('HUD score keeps the sign ahead of the zero padding',()=>{assert.deepEqual([0,42,123456,1234567,-12,-0.4,-99999,-123456].map(n=>hudScore(n)),['000000','000042','123456','1234567','-00012','000000','-99999','-123456']);});

test('move lists: signature moves are per kaiju, combat and controls are shared',async()=>{
 const {moveList}=await import('../src/presentation.ts');
 const names=(k:string)=>moveList(k).moves.flatMap(s=>s.moves.map(m=>m.name));
 assert.ok(names('Mogurodon').includes('Cannonball')&&names('Mogurodon').includes('Tremor Slam'));
 assert.ok(names('Kaiban').includes('Stampede')&&names('Kaiban').includes('Debris Shotgun')&&!names('Kaiban').includes('Cannonball'));
 for(const k of ['Mogurodon','Kaiban','Belial']){assert.ok(names(k).includes('Pound')&&names(k).some(n=>/Slam$/.test(n)));assert.ok(moveList(k).controls.flatMap(s=>s.moves).some(m=>m.name==='Leap-grab'));}
});

test('pause menu opens the Moves & Controls panel with tabs and returns to pause',async()=>{
 const {bootGame}=await import('./helpers/game-harness.ts');const h=await bootGame(.75);
 try{
  h.click('#drills');h.click('#start');h.step(2);h.tap('Escape');assert.equal(h.state().mode,'paused');
  h.click('#moves');const o=h.node('#overlay');assert.match(o.innerHTML,/Cannonball/);assert.match(o.innerHTML,/MOGURODON/);
  h.click('#tab-controls');assert.match(o.innerHTML,/Leap-grab/);assert.doesNotMatch(o.innerHTML,/Cannonball/);
  h.click('#moves-back');assert.match(o.innerHTML,/RESUME/);assert.equal(h.state().mode,'paused');
  h.click('#resume');assert.equal(h.state().mode,'playing');
 }finally{h.cleanup();}
});
