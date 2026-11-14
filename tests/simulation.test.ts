import {test} from 'node:test';import assert from 'node:assert/strict';import {COMBAT as B,MILITARY as M} from '../src/config.ts';
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
 hold('KeyD',150);assert.equal(state().x,352);assert.equal(state().exitOpen,false);
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
 // Play the first campaign district through the real input path. It is an open layout: start mid-map,
 // sweep west to the edge, then turn around and smash east until the quota opens and the east exit triggers.
 const cityStart=state().x;assert.ok(cityStart>1700&&cityStart<2000,'open district starts mid-map');
 const sweep=(fwd:string,back:string,done:()=>boolean,limit:number)=>{for(let n=0;n<limit&&state().mode==='playing'&&!done();n++){
  if(state().ultimate>=100&&state().transform===0){key('KeyU');key('KeyU','keyup');}
  hold(fwd,8);key('KeyK');key('KeyK','keyup');step(40);hold(back,1);key('KeyK');key('KeyK','keyup');step(40);hold(fwd,3);
 }};
 sweep('KeyA','KeyD',()=>state().x<120,110);assert.equal(state().mode,'playing','west sweep alone does not finish the block');
 sweep('KeyD','KeyA',()=>false,170);
 assert.equal(state().mode,'results');const hp=state().hp,energy=state().ultimate,superCharge=state().superCharge;
 callbacks.get('#advance:click')!();assert.equal(state().blockIndex,1);assert.equal(state().worldWidth,5760);assert.equal(state().hp,hp);assert.equal(state().ultimate,energy);assert.equal(state().superCharge,superCharge);assert.equal(state().checkpoint.city,0);assert.equal(state().checkpoint.banked,0);
 key('Escape');callbacks.get('#restart:click')!();assert.equal(state().mode,'confirm');callbacks.get('#no:click')!();assert.equal(state().mode,'paused');assert.equal(state().blockIndex,1);
 callbacks.get('#restart:click')!();callbacks.get('#yes:click')!();assert.equal(state().blockIndex,0);assert.equal(state().hp,B.startHP);assert.equal(state().score,0);assert.equal(state().ultimate,0);assert.equal(state().superCharge,0);
 key('Escape');callbacks.get('#menu:click')!();assert.equal(state().mode,'confirm');callbacks.get('#yes:click')!();assert.equal(state().mode,'title');assert.equal(JSON.parse(savedData.get('kaiju-arcade:campaign:v1')!).city,0);
 callbacks.get('#continue:click')!();assert.equal(state().mode,'progress');callbacks.get('#begin-city:click')!();assert.equal(state().blockIndex,0);step(60*150);assert.equal(state().mode,'gameover');assert.equal(state().checkpoint,null);assert.equal(savedData.has('kaiju-arcade:campaign:v1'),false);assert.equal(state().highScores.length,1);assert.equal(state().highScores[0].initials,'ABC');
 Math.random=savedRandom;
});
