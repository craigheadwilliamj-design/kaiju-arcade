import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {bootGame} from './helpers/game-harness.ts';import {MILITARY as M,COMBAT as B,CONFIG as C} from '../src/config.ts';
import {CHECKPOINT_KEY,PERMANENT_KEY} from '../src/campaign.ts';
const h=await bootGame(.75),rows:any[]=[],peaks:Record<string,number>={};let polls=0,landingProbe=false,cityStart=0,peakStage=1,evolutions:Record<string,number>={};
const check=(s:any)=>{assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.hp)&&Number.isFinite(s.score));assert.ok(s.x>=-.001&&s.x+s.width<=s.worldWidth+.001);assert.ok(s.hp>=0&&s.hp<=100);for(const [k,v] of Object.entries(s.entityCounts))peaks[k]=Math.max(peaks[k]||0,Number(v));assert.ok(s.entityCounts.units<=M.caps[s.blockIndex], 'military cap');assert.ok(s.entityCounts.enemyShots<=M.projectileCap);assert.ok(s.entityCounts.wrecks<=M.wreckCap);assert.ok(s.shards<=B.shardCap);assert.ok(s.particleCount<=C.particleCap);};
function fightBlock(){
 const startFrames=h.frames();let lastX=-1,stuck=0;
 for(let n=0;n<4000;n++){
  const s=h.state();check(s);polls++;if(s.mode!=='playing')break;
  if(s.stage>peakStage){peakStage=s.stage;evolutions[`stage${s.stage}`]=Math.round((h.frames()-cityStart)/60);}
  if(s.superCharge>=40&&s.hp===100&&s.stage===3&&s.superTime===0)h.tap('KeyI');
  if(s.ultimate>=100&&s.canAct&&(s.blockIndex!==2||landingProbe))h.tap('KeyU');
  const px=s.x+s.width/2;
  let target:any=null,goal=s.worldWidth-s.width;
  if(s.rival){target=s.rival;goal=target.x-s.width-25;}
  else if(s.objectiveHP>0){target={x:s.worldWidth/2-30,y:335,w:60,h:100,hp:s.objectiveHP};goal=target.x-s.width-25;}
  else if(!s.exitOpen){target=s.buildings.filter((b:any)=>b.hp>0).sort((a:any,b:any)=>Math.abs(a.x-px)-Math.abs(b.x-px))[0];if(target)goal=target.x>=px?target.x-s.width-25:target.x+target.w+25;}
  // Clear solid obstructions en route, independent of quota/objective targets.
  const blocker=s.buildings.filter((b:any)=>b.hp>0&&b.kind==='large'&&(goal>=s.x?b.x>=s.x+s.width-4&&b.x<goal+s.width:b.x+b.w<=s.x+4&&b.x+b.w>goal)).sort((a:any,b:any)=>goal>=s.x?a.x-b.x:b.x-a.x)[0];
  if(blocker){target=blocker;goal=blocker.x>=px?blocker.x-s.width-25:blocker.x+blocker.w+25;}
  const short=s.buildings.find((b:any)=>b.hp>0&&b.kind==='large'&&b.h<70);
  if(!landingProbe&&s.cityIndex===0&&s.blockIndex===2&&short&&s.grounded&&s.canAct&&short.x-s.x-s.width<100&&short.x-s.x-s.width>45){
   h.release();h.down('KeyD');h.tap('Space');let penetrated=false;
   for(let frame=0;frame<85;frame++){h.step();const p=h.state();const b=p.buildings.find((x:any)=>x.x===short.x);if(b?.hp>0&&p.x<b.x+b.w&&p.x+p.width>b.x&&p.y<b.y+b.h&&p.y+p.height>b.y+.01)penetrated=true;}
   h.release();landingProbe=true;console.log(`Landing collision probe: penetration=${penetrated}`);assert.equal(penetrated,false,'Landing must not embed a kaiju in a short solid barricade');
  }
  let direction=goal>s.x+2?1:goal<s.x-2?-1:0;
  h.up('KeyA');h.up('KeyD');if(direction)h.down(direction>0?'KeyD':'KeyA');
  // Fight close ground reinforcements on either flank, then resume the objective.
  const threat=s.military.filter((u:any)=>u.hp>0&&u.y>370&&Math.abs(u.x+u.w/2-px)<110).sort((a:any,b:any)=>Math.abs(a.x-px)-Math.abs(b.x-px))[0];
  let facing=target?Math.sign(target.x+target.w/2-px)||1:direction||1;
  if(threat)facing=Math.sign(threat.x+threat.w/2-px)||1;
  if(s.canAct&&s.cooldown<=0){
   if(s.face!==facing){h.up('KeyA');h.up('KeyD');h.down(facing>0?'KeyD':'KeyA');h.step();h.up('KeyA');h.up('KeyD');}
   h.tap('KeyK');
  }
  h.step(6);
  const after=h.state();if(Math.abs(after.x-lastX)<.1)stuck++;else stuck=0;lastX=after.x;
  if(stuck>100&&after.canAct){h.tap('Space');stuck=0;}
 }
 h.release();const s=h.state();rows.push({city:s.cityIndex+1,block:s.blockIndex+1,kind:s.blockKind,stage:s.stage,...(s.blockIndex===4?{evolutionSeconds:evolutions}:{}),seconds:Math.round((h.frames()-startFrames)/60),mode:s.mode,hp:Math.round(s.hp),damage:Math.round(s.damageTaken),destruction:Math.round(s.destruction*100),score:s.score,x:Math.round(s.x),objectiveHP:s.objectiveHP,bossHP:s.bossHP});console.log(JSON.stringify(rows.at(-1)));
 assert.ok(['results','conquered'].includes(s.mode),`City ${s.cityIndex+1} block ${s.blockIndex+1}: ${s.mode} x=${s.x} quota=${s.destruction} hp=${s.hp}`);
}
try{
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='QAA';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');
 for(let city=0;city<5;city++){
  assert.equal(h.state().mode,'progress');h.click('#begin-city');assert.equal(h.state().hp,B.startHP);cityStart=h.frames();peakStage=1;evolutions={};
  for(let block=0;block<5;block++){assert.equal(h.state().blockIndex,block);fightBlock();if(city===0&&block===0){const before=h.state().score;h.click('#back');h.click('#no');assert.equal(h.state().score,before);h.click('#back');h.click('#no');assert.equal(h.state().score,before,'canceling results quit cannot repeat Perfect bonus');}if(block<4)h.click('#advance');}
  if(city<4){const cp=JSON.parse(h.saved.get(CHECKPOINT_KEY)!);assert.equal(cp.city,city+1);assert.equal(Math.round(cp.banked),h.state().score);h.click('#city-next');}
 }
 assert.equal(h.saved.has(CHECKPOINT_KEY),false);const permanent=JSON.parse(h.saved.get(PERMANENT_KEY)!);assert.equal(permanent.conquered.length,5);assert.equal(permanent.unlocked.length,6);assert.equal(permanent.scores.length,1);assert.equal(permanent.scores[0].completed,true);assert.ok(permanent.gallery.includes('Mogurodon'));h.click('#city-next');assert.equal(h.state().mode,'ending');
 await writeFile('qa/playthrough.json',JSON.stringify({scope:'Shared combat; no cheats; deterministic keyboard bot; not browser performance',seed:.75,rows,peaks,polls},null,2)+'\n');console.log('PASS: all 25 gameplay blocks, campaign completion, checkpoint cleanup and ending.');
}catch(error){await writeFile('qa/playthrough.json',JSON.stringify({scope:'Shared combat keyboard bot',seed:.75,rows,peaks,error:String(error)},null,2)+'\n');throw error;}finally{h.cleanup();}
