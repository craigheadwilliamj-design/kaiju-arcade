import {test} from 'node:test';import assert from 'node:assert/strict';import {COMBAT as B,MILITARY as M} from '../src/config.ts';
import {CHECKPOINT_KEY} from '../src/campaign.ts';import {bootCampaign} from './helpers/game-harness.ts';
test('real game loop: movement, crouch, jump, attacks, rubble, exit and restart',async()=>{
 const callbacks=new Map<string,Function>(),events=new Map<string,Function>();let nextFrame:Function=()=>{},now=performance.now();
 const savedRandom=Math.random;Math.random=()=>.75;
 const context=new Proxy({},{get:()=>()=>{}});
 const savedData=new Map<string,string>();const localStorage={getItem:(k:string)=>savedData.get(k)||null,setItem:(k:string,v:string)=>{savedData.set(k,v);},removeItem:(k:string)=>{savedData.delete(k);}};
 const canvas={getContext:()=>context,focus:()=>{},width:960,height:540};
 const nodes=new Map();nodes.set('#game',canvas);nodes.set('#overlay',{innerHTML:''});
 const element=(selector:string)=>{if(!nodes.has(selector))nodes.set(selector,{style:{},focus:()=>{},getContext:()=>context,addEventListener:(name:string,fn:Function)=>callbacks.set(selector+':'+name,fn)});return nodes.get(selector);};
 Object.assign(globalThis,{window:{localStorage,addEventListener:(name:string,fn:Function)=>events.set(name,fn)},document:{querySelector:element,addEventListener:()=>{}},requestAnimationFrame:(fn:Function)=>{nextFrame=fn;}});
 await import('../dist/game.js');
 const state=()=>((globalThis as any).window.kaijuDebug);
 const key=(code:string,type='keydown')=>events.get(type)!({code,repeat:false,preventDefault:()=>{}});
 let bestStage=1,usedUltimate=false;
 const step=(frames=1)=>{for(let i=0;i<frames;i++){now+=1000/60;nextFrame(now);bestStage=Math.max(bestStage,state().stage);}};
 const hold=(code:string,frames:number)=>{key(code);step(frames);key(code,'keyup');};
 callbacks.get('#drills:click')!();callbacks.get('#start:click')!();assert.equal(state().mode,'playing');
 const startX=state().x;hold('KeyD',60);assert.ok(state().x>startX+190);
 const beforeCrouch=state().y;key('KeyS');step();assert.equal(state().crouched,true);assert.ok(state().y>beforeCrouch);hold('KeyD',20);key('KeyS','keyup');step();assert.equal(state().crouched,false);
 key('Space');step(10);assert.ok(state().y<beforeCrouch-20);key('Space','keyup');step(80);
 // Move to the first solid building. It blocks horizontal movement.
 hold('KeyD',150);assert.equal(state().x,Math.round(400*1.4)-48,'stopped at the first building (x 400 authored, city-scaled)');assert.equal(state().exitOpen,false);
 key('Escape');assert.equal(state().mode,'paused');const px=state().x;step(60);assert.equal(state().x,px);callbacks.get('#resume:click')!();
 // Walk the district, destroying all structures with the actual attack path.
 // Strike both directions at regular intervals so passable targets are included.
 hold('KeyA',170);
 for(let n=0;n<155&&state().mode==='playing';n++){
  if(state().ultimate>=100&&state().transform===0&&!usedUltimate){key('KeyU');key('KeyU','keyup');usedUltimate=state().ultimateTime>0;}
  hold('KeyD',8);key('KeyK');key('KeyK','keyup');step(40);
  hold('KeyA',1);key('KeyK');key('KeyK','keyup');step(40);
  hold('KeyD',3);
 }
 assert.ok(bestStage>=3,'collected shards evolve through all three stages');assert.equal(usedUltimate,true,'damage charges a real U activation');
 assert.equal(state().mode,'results');assert.equal(state().exitOpen,true);assert.ok(state().destruction>=.75);assert.ok(state().score>0);assert.ok(state().buildingHP[2]===0);assert.ok(state().particleCount<=180);
 callbacks.get('#advance:click')!();assert.equal(state().mode,'playing');assert.equal(state().score,0);assert.equal(state().destruction,0);assert.equal(state().x,110);
 // Keyboard integration: hold/release, pause-cancel, actual stance origins.
 key('KeyK');step(100);assert.equal(state().charging,true);assert.equal(state().charge,1.5);key('Escape');assert.equal(state().charging,false);key('KeyK','keyup');callbacks.get('#resume:click')!();
 // Mogurodon's grounded L is the Tremor Slam: a forward shockwave, no quill. Airborne he still flicks a quill.
 key('KeyL');key('KeyL','keyup');step(8);assert.equal(state().entityCounts.tremorWaves,1,'grounded ranged launches one tremor wave');assert.equal(state().shotCount,0);step(60);
 key('Space');step(10);key('Space','keyup');key('KeyL');key('KeyL','keyup');assert.equal(state().shotCount,1,'airborne ranged still fires a quill');step(80);
 // With M3 weapons active, standing idle now causes real damage and eventual defeat.
 step(60*150);assert.ok(state().damageTaken>0);assert.equal(state().mode,'gameover');
 assert.ok(state().enemyShots<=100);assert.ok(state().military.length<=M.caps[0]);
 assert.ok(state().shards<=120);assert.ok(state().growths<=3);
 assert.equal(savedData.size,0,'drills never write campaign scores or checkpoint');
 callbacks.get('#back:click')!();callbacks.get('#new:click')!();assert.equal(state().mode,'intro');callbacks.get('#skip-intro:click')!();
 nodes.get('#initials').value='a1bcd';callbacks.get('#initials:input')!();assert.equal(nodes.get('#initials').value,'ABC');callbacks.get('#launch:click')!();assert.equal(state().mode,'selection');callbacks.get('#confirm-kaiju:click')!();
 assert.equal(state().mode,'progress');assert.equal(state().checkpoint.city,0);assert.equal(state().checkpoint.banked,0);
 callbacks.get('#begin-city:click')!();assert.equal(state().session,'campaign');assert.equal(state().hp,B.startHP);
 // The campaign opens in San Francisco: the Embarcadero, as Mogurodon, at Stage 1 with its cap at Stage 1 (soft floor at 1).
 assert.equal(state().cityIndex,0);assert.equal(state().blockIndex,0);assert.equal(state().blockKind,'stronghold');assert.equal(state().activeKaiju,'Mogurodon');
 assert.equal(state().stage,1);assert.equal(state().growthCap,1);assert.equal(state().growthFloor,1);assert.equal(state().x,110);
 step(30);
 key('Escape');callbacks.get('#restart:click')!();assert.equal(state().mode,'confirm');callbacks.get('#no:click')!();assert.equal(state().mode,'paused');assert.equal(state().blockIndex,0);
 callbacks.get('#restart:click')!();callbacks.get('#yes:click')!();assert.equal(state().blockIndex,0);assert.equal(state().hp,B.startHP);assert.equal(state().score,0);assert.equal(state().ultimate,0);assert.equal(state().superCharge,0);
 key('Escape');callbacks.get('#menu:click')!();assert.equal(state().mode,'confirm');callbacks.get('#yes:click')!();assert.equal(state().mode,'title');assert.equal(JSON.parse(savedData.get(CHECKPOINT_KEY)!).city,0);
 callbacks.get('#continue:click')!();assert.equal(state().mode,'progress');callbacks.get('#begin-city:click')!();assert.equal(state().blockIndex,0);step(60*150);assert.equal(state().mode,'gameover');assert.equal(state().checkpoint,null);assert.equal(savedData.has(CHECKPOINT_KEY),false);assert.equal(state().highScores.length,1);assert.equal(state().highScores[0].initials,'ABC');
 Math.random=savedRandom;
});

test('real game loop: New York’s open first district, swept by keys; the next block keeps HP and meters; checkpoint untouched',async()=>{
 const h=await bootCampaign(.75,{city:'nyc'});const hold=(code:string,frames:number)=>{h.down(code);h.step(frames);h.up(code);};
 try{
 // Play New York's first district through the real input path. It is an open layout: start mid-map,
 // sweep west to the edge, then turn around and smash east until the quota opens and the east exit triggers.
 const cityStart=h.state().x;assert.ok(cityStart>1700*1.4&&cityStart<2000*1.4,'open district starts mid-map');
 const sweep=(fwd:string,back:string,done:()=>boolean,limit:number)=>{for(let n=0;n<limit&&h.state().mode==='playing'&&!done();n++){
  if(h.state().ultimate>=100&&h.state().transform===0){h.tap('KeyU');}
  hold(fwd,8);h.tap('KeyK');h.step(40);hold(back,1);h.tap('KeyK');h.step(40);hold(fwd,3);
 }};
 sweep('KeyA','KeyD',()=>h.state().x<120,110);assert.equal(h.state().mode,'playing','west sweep alone does not finish the block');
 sweep('KeyD','KeyA',()=>false,170);
 assert.equal(h.state().mode,'results');const hp=h.state().hp,energy=h.state().ultimate,superCharge=h.state().superCharge;
 h.click('#advance');assert.equal(h.state().blockIndex,1);assert.equal(h.state().worldWidth,Math.round(5760*1.4));assert.equal(h.state().hp,hp);assert.equal(h.state().ultimate,energy);assert.equal(h.state().superCharge,superCharge);assert.equal(h.state().checkpoint.city,1);assert.equal(h.state().checkpoint.banked,0);
 }finally{h.release();h.cleanup();}
});
