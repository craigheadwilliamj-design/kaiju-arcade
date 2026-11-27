import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {bootGame} from './helpers/game-harness.ts';import {MILITARY as M,COMBAT as B,CONFIG as C} from '../src/config.ts';
import {CHECKPOINT_KEY,PERMANENT_KEY,CAMPAIGN,campaignCityIndex,routeLevels} from '../src/campaign.ts';import {cityIndexOf} from '../src/levels.ts';import {NAVAL_UNITS} from '../src/military.ts';
const h=await bootGame(.75),rows:any[]=[],peaks:Record<string,number>={};let polls=0,landingProbe=false,cityStart=0,peakStage=1,evolutions:Record<string,number>={};
const check=(s:any)=>{assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.hp)&&Number.isFinite(s.score));assert.ok(s.x>=-.001&&s.x+s.width<=s.worldWidth+.001);assert.ok(s.hp>=0&&s.hp<=100);for(const [k,v] of Object.entries(s.entityCounts))peaks[k]=Math.max(peaks[k]||0,Number(v));// Police boats are stationed on the water and sit outside the squad cap (src/military.ts fielded()); everything else is under it.
 // Naval units (police boats, Bay Bridge's warships) are outside the cap, as in the game (NAVAL_UNITS in src/military.ts).
 assert.ok(s.entityCounts.units-s.military.filter((u:any)=>NAVAL_UNITS.has(u.type)).length<=M.caps[s.militaryTier-1], 'military cap');assert.ok(s.entityCounts.enemyShots<=M.projectileCap);assert.ok(s.entityCounts.wrecks<=M.wreckCap);assert.ok(s.shards<=B.shardCap);assert.ok(s.particleCount<=C.particleCap);};
function fightBlock(){
 const startFrames=h.frames();let lastX=-1,stuck=0;
 for(let n=0;n<4000;n++){
  const s=h.state();check(s);polls++;if(s.mode!=='playing')break;
  if(s.stage>peakStage){peakStage=s.stage;evolutions[`stage${s.stage}`]=Math.round((h.frames()-cityStart)/60);}
  if(s.superCharge>=40&&s.hp===100&&s.stage===3&&s.superTime===0)h.tap('KeyI');
  // The landing probe waits for Ultimate off on the first New York level (its barricade ring); every other city's third level keeps its old bot rule.
  const probeBlock=s.cityIndex===cityIndexOf('nyc')&&s.blockIndex===0&&!landingProbe;
  if(s.ultimate>=100&&s.canAct&&(s.blockIndex!==2||landingProbe)&&!probeBlock)h.tap('KeyU');
  const px=s.x+s.width/2;
  // The Embarcadero starts sealed in a tunnel pocket: jump into the roof until it breaks.
  if(s.pocketHP>0){h.release();if(s.grounded)h.tap('Space');h.step(20);continue;}
  // Chinatown's crystal formation lifts the cap to Stage 2: the bot detours to shatter it once it is within a screen or two of the way.
  const formation=s.formationHP>0&&s.formationX!==null&&!s.exitOpen?{x:s.formationX-66,y:285,w:132,h:150,hp:s.formationHP}:null;
  let target:any=null,goal=s.worldWidth-s.width;
  // Fisherman's Wharf is there-and-back: the main route leaves by the west exit (to The Fault); the east exit is the secret Alcatraz.
  if(s.exitOpen&&s.level.name==='Fisherman\'s Wharf')goal=0;
  if(s.rival){target=s.rival;goal=target.x-s.width-25;}
  // A crystal formation comes before a stronghold's objective: the Wharf's cutter sits past deep water that only the Stage 3 lift opens.
  else if(formation){target=formation;goal=target.x-s.width-25;}
  else if(s.objectiveHP>0){const o=s.objective;target={x:o.x-o.w/2,y:435-o.h,w:o.w,h:o.h,hp:s.objectiveHP};goal=target.x-s.width-25;}
  else if(!s.exitOpen){target=s.buildings.filter((b:any)=>b.hp>0).sort((a:any,b:any)=>Math.abs(a.x-px)-Math.abs(b.x-px))[0];if(target)goal=target.x>=px?target.x-s.width-25:target.x+target.w+25;}
  // Clear solid obstructions en route, independent of quota/objective targets.
  const blocker=s.buildings.filter((b:any)=>b.hp>0&&b.kind==='large'&&(goal>=s.x?b.x>=s.x+s.width-4&&b.x<goal+s.width:b.x+b.w<=s.x+4&&b.x+b.w>goal)).sort((a:any,b:any)=>goal>=s.x?a.x-b.x:b.x-a.x)[0];
  if(blocker){target=blocker;goal=blocker.x>=px?blocker.x-s.width-25:blocker.x+blocker.w+25;}
  const short=s.buildings.find((b:any)=>b.hp>0&&b.kind==='large'&&b.h<70);
  if(!landingProbe&&s.cityIndex===cityIndexOf('nyc')&&s.blockIndex===0&&short&&s.grounded&&s.canAct&&short.x-s.x-s.width<100&&short.x-s.x-s.width>45){
   h.release();h.down('KeyD');h.tap('Space');let penetrated=false;
   for(let frame=0;frame<85;frame++){h.step();const p=h.state();const b=p.buildings.find((x:any)=>x.x===short.x);if(b?.hp>0&&p.x<b.x+b.w&&p.x+p.width>b.x&&p.y<b.y+b.h&&p.y+p.height>b.y+.01)penetrated=true;}
   h.release();landingProbe=true;console.log(`Landing collision probe: penetration=${penetrated}`);assert.equal(penetrated,false,'Landing must not embed a kaiju in a short solid barricade');
  }
  // Wading (Bay Bridge): a firing line on the far shore out-ranges the kaiju's punches but not Mogurodon's Tremor Slam (L on the
  // ground, about 670px at Stage 3 against a tank's 320). Hold just outside their reach and slam them before wading in: a volley
  // mid-bay would shrink the kaiju below the stage it needs to stay afloat.
  const ahead=goal>s.x?1:-1,edge=ahead>0?s.x+s.width:s.x,gap=(u:any)=>(u.x-edge)*ahead;
  const shore=s.inWater?s.military.filter((u:any)=>u.hp>0&&u.y>370&&['tank','apc','artillery','soldier'].includes(u.type)&&gap(u)>0&&gap(u)<620):[];
  if(shore.length&&Math.min(...shore.map(gap))>380){
   h.up('KeyA');h.up('KeyD');if(s.face!==ahead){h.down(ahead>0?'KeyD':'KeyA');h.step();h.up('KeyA');h.up('KeyD');}
   if(s.canAct&&s.rangedCooldown<=0&&s.cooldown<=0)h.tap('KeyL');h.step(6);continue;}
  // A target under a bridge deck (Bay Bridge's carrier): stand over the hull and Pound (crouch + light) through the span beneath,
  // which drops the kaiju onto the flight deck to finish it there.
  const deck=s.carrierDeck,feet=s.y+s.height;
  if(s.objectiveHP>0&&deck?.alive&&feet<deck.y-20&&s.grounded&&Math.abs(px-s.objective.x)<s.objective.w){
   const hull=s.objective,over=hull.x-s.width/2;
   if(Math.abs(s.x-over)>hull.w/4){goal=over;}
   else{h.up('KeyA');h.up('KeyD');h.down('KeyS');h.step();if(s.canAct&&s.cooldown<=0)h.tap('KeyJ');h.step(6);h.up('KeyS');continue;}
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
 h.release();const s=h.state();rows.push({city:s.cityIndex+1,code:s.cityCode,block:s.blockIndex+1,kind:s.blockKind,stage:s.stage,...(s.blockKind==='boss'?{evolutionSeconds:evolutions}:{}),seconds:Math.round((h.frames()-startFrames)/60),mode:s.mode,hp:Math.round(s.hp),damage:Math.round(s.damageTaken),destruction:Math.round(s.destruction*100),score:s.score,x:Math.round(s.x),objectiveHP:s.objectiveHP,bossHP:s.bossHP});console.log(JSON.stringify(rows.at(-1)));
 assert.ok(['results','conquered'].includes(s.mode),`City ${s.cityIndex+1} block ${s.blockIndex+1}: ${s.mode} x=${s.x} quota=${s.destruction} hp=${s.hp}`);
}
try{
 h.click('#new');h.click('#skip-intro');h.node('#initials').value='QAA';h.callbacks.get('#initials:input')!();h.click('#launch');h.click('#confirm-kaiju');
 for(let city=0;city<CAMPAIGN.length;city++){
  const route=routeLevels(campaignCityIndex(city));
  assert.equal(h.state().mode,'progress');h.click('#begin-city');assert.equal(h.state().hp,B.startHP);cityStart=h.frames();peakStage=1;evolutions={};
  for(let k=0;k<route.length;k++){const block=route[k];assert.equal(h.state().blockIndex,block);
   // Per-level growth: San Francisco levels start at their stage, capped; the original cities stay dynamic.
   const level=h.state().level;if(level.startStage){assert.equal(h.state().stage,level.startStage,`${level.name} start stage`);assert.equal(h.state().growthCap,level.cap);}
   fightBlock();if(level.cap)assert.ok(h.state().stage<=(level.capLift??level.cap),`${level.name} never grows past its cap`);
   if(city===0&&k===0){const before=h.state().score;h.click('#back');h.click('#no');assert.equal(h.state().score,before);h.click('#back');h.click('#no');assert.equal(h.state().score,before,'canceling results quit cannot repeat Perfect bonus');}if(k<route.length-1)h.click('#advance');}
  if(city<CAMPAIGN.length-1){const cp=JSON.parse(h.saved.get(CHECKPOINT_KEY)!);assert.equal(cp.city,city+1);assert.equal(Math.round(cp.banked),h.state().score);h.click('#city-next');}
 }
 assert.equal(h.saved.has(CHECKPOINT_KEY),false);const permanent=JSON.parse(h.saved.get(PERMANENT_KEY)!);assert.deepEqual(permanent.conquered,CAMPAIGN);assert.equal(permanent.unlocked.length,7);assert.equal(permanent.scores.length,1);assert.equal(permanent.scores[0].completed,true);assert.ok(permanent.gallery.includes('Mogurodon'));h.click('#city-next');assert.equal(h.state().mode,'ending');
 await writeFile('qa/playthrough.json',JSON.stringify({scope:'Shared combat; no cheats; deterministic keyboard bot; not browser performance',seed:.75,rows,peaks,polls},null,2)+'\n');console.log(`PASS: all ${rows.length} gameplay levels, campaign completion, checkpoint cleanup and ending.`);
}catch(error){await writeFile('qa/playthrough.json',JSON.stringify({scope:'Shared combat keyboard bot',seed:.75,rows,peaks,error:String(error)},null,2)+'\n');throw error;}finally{h.cleanup();}
