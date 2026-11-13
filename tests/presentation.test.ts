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
 assert.ok(names('Kaiban').includes('Gore Charge')&&names('Kaiban').includes('Meteor Drop'));
 assert.ok(names('Tlézcatl').includes('Magma Dive'));
 for(const k of ['Mogurodon','Kaiban','Belial']){assert.ok(names(k).includes('Pound')&&names(k).some(n=>/Slam$|Meteor Drop/.test(n)));assert.ok(moveList(k).controls.flatMap(s=>s.moves).some(m=>m.name==='Leap-grab'));}
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

test('sprite art loads per kaiju: boot fetches only base idles, a run fetches its own kaiju and drops the others',async()=>{
 const asked:string[]=[];
 class FakeImage{complete=true;naturalWidth=256;naturalHeight=256;set src(v:string){asked.push(v);}decode(){return Promise.resolve();}}
 (globalThis as any).Image=FakeImage;
 try{
  const art=await import(`../src/presentation.ts?art=${Date.now()}`);const settle=()=>new Promise(r=>setTimeout(r,0));
  art.loadPresentationArt();
  assert.ok(asked.length>0&&asked.every(s=>/-idle\.png$|^assets\/mogurodon\.png$/.test(s)||!/assets\//.test(s)),`boot asks for base idles only (${asked.filter(s=>!/idle/.test(s)).slice(0,3)})`);
  const boot=asked.length;assert.ok(boot<10,'a handful of files at boot, not the whole set');
  art.loadKaijuArt('Kaiban',1);await settle();
  const kaiban=asked.slice(boot);assert.ok(kaiban.length>20,'the picked kaiju loads its strips');
  assert.ok(kaiban.every(s=>s.includes('kaiban')),'and nobody else\'s');assert.ok(kaiban.some(s=>s.includes('kaiban-s3')),'later stages follow in the background');
  assert.ok(kaiban.findIndex(s=>s.includes('kaiban-s3'))>kaiban.findIndex(s=>!/-s[23]-/.test(s)),'the stage on screen is asked for first');
  assert.equal(art.hasAnim('Kaiban','walk',1),true);
  art.loadKaijuArt('Tlézcatl',1);await settle();
  assert.equal(art.hasAnim('Kaiban','walk',1),false,'the previous kaiju\'s strips are dropped');assert.equal(art.hasSprite('Kaiban'),true,'its base idle stays for previews and endings');
  assert.equal(art.hasAnim('Tlézcatl','walk',1),true);
  const again=asked.length;art.loadKaijuArt('Tlézcatl',2);await settle();assert.equal(asked.length,again,'asking again for the same kaiju fetches nothing twice');
 }finally{delete (globalThis as any).Image;}
});
