import {CONFIG as C,COMBAT as B,MILITARY as M,MILITARY_FEEL as MF,CAMPAIGN as P,EXPLORE as X,FEEL as F,VEHICLES as VC,MOVE as MV,CITY as Y,FLOORS as FL,RIVER as R,FIRE as FI,RUBBLE as RB,TWISTS as TW} from './config.ts';
import {groundAt,groundUnder,setTerrain,terrainPoints,hasTerrain,profileFrom,submerged,waterAt,waterSpans,bedAt,addMound,moundList,deckAt,pitAt,pitList,addPit} from './terrain.ts';
import type {Deck} from './terrain.ts';
import {createRampage,feedRampage,tickRampage,rampageLevel,rampageMult,pointsHeat,gridOf,substations,gridPowered,createRoofProps,roofBox,wireSpan} from './city.ts';
import type {RoofProp,LiveWire} from './city.ts';
import {createParked,createLamps,createPoles,setVehicleLook,uproot,upright,impact,makeProp,spawnTraffic,tickDriving,tickFlying,launch,vehicleBox,mass,loose,grounded,liftedBuilding,VEHICLE_SPECS,EXPLOSIVE,CIVILIAN} from './vehicles.ts';
import type {Vehicle} from './vehicles.ts';
import {NEW_YORK_BLOCK_ONE,DRILL_BLOCK,CITIES,LEVELS,levelWidth} from './levels.ts';
import type {BlockDef} from './levels.ts';
import {createBuildings,damageBuilding,destruction,exitUnlocked,perfectBonus,solid,overlaps,canExitBlock,damageObjective,separateHorizontal,canTopple,toppleSpan,crushDamage,liftable} from './rules.ts';
import {wearFloor,floorAt,floorHeightOf} from './rules.ts';
import {createCombat,canAct,scale,damageMultiplier,collectCrystal,creditDamage,tickCombat,light,beginHeavy,releaseHeavy,ranged,activateUltimate,activateSuper,cancelCharge,receiveHit} from './combat.ts';
import type {Strike} from './combat.ts';
import {createMilitary,tickMilitary,spawnUnit,hitUnit as hitUnitBase,intercept,segmentHits,captureUnit,callStrike,GRABBABLE_UNITS,UNITS,WEAPONS,roadLane,ROAD_UNITS,smallArmsScale,blast} from './military.ts';
import type {MilitaryEvent} from './military.ts';
import type {Rect,Unit} from './military.ts';
import {createPopulation,releaseOccupants,tickPopulation} from './population.ts';
import {readSaves,savePermanent,saveCheckpoint,newRun,resumeRun,checkpointOf,restartCity,latchBlock,nextBlock,conquerCity,advanceCity,loseRun,initialsValid,KAIJU} from './campaign.ts';
import type {Run,Checkpoint,StorageLike} from './campaign.ts';
import {createRival,hitRival,tickRival} from './rival.ts';
import type {Rival} from './rival.ts';
import {moveList,hudScore,ROSTER,ENDINGS,INTRO_DURATION,INTRO_SCENES,introScene,selectable,validFreePlay,canViewEnding,endingFor,loadPresentationArt,loadKaijuArt,hasSprite,hasAnim,holdPoint,holdBite,aimTime,spinFrom,animDuration,animImpact,drawSilhouette,drawMenuBackdrop,drawIntro,drawEnding} from './presentation.ts';
import type {FreePlayChoice} from './presentation.ts';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
// The game draws in 960x540 units, but the canvas holds a whole number of device pixels per unit (enough to cover its on-screen
// size) and the browser smooths that down to fit. At 960x540 stretched by CSS, sprites were resampled twice by uneven amounts,
// which left ragged edges and stray pixels on enlarged art (Stage 3).
let res=0;
function fitCanvas(){if(!canvas.getBoundingClientRect||!ctx.setTransform)return; // headless test canvas
 const n=Math.max(1,Math.min(4,Math.ceil(canvas.getBoundingClientRect().width*(window.devicePixelRatio||1)/960-.02)));
 if(n!==res){res=n;canvas.width=960*n;canvas.height=540*n;}ctx.setTransform(n,0,0,n,0,0);ctx.imageSmoothingEnabled=false;}
const overlay=document.querySelector<HTMLDivElement>('#overlay')!;
type Mode='title'|'playing'|'paused'|'confirm'|'results'|'gameover'|'setup'|'progress'|'scores'|'conquered'|'intro'|'selection'|'freeplay-select'|'gallery'|'ending'|'settings';
let mode:Mode='title',buildings=createBuildings(NEW_YORK_BLOCK_ONE),score=0,camera=0,cameraY=0,zoom=C.zoom,time=0,shake=0,cleared=false,action='',actionTime=0;
const keys=new Set<string>();
let storage:StorageLike|undefined;try{storage=window.localStorage;}catch{}
let {permanent,checkpoint,available:storageOK}=readSaves(storage);
let run:Run|null=null,session:'campaign'|'drill'|'freeplay'='drill',citySettled=false;
let activeKaiju='Mogurodon',selectedKaiju='Mogurodon',pendingInitials='AAA',freeBlockStart=0;
let freeChoice:FreePlayChoice={kaiju:'Mogurodon',city:0,boss:'Mogurodon'};
let introElapsed=0,introCount=0,introIndex=-1,endingName='Mogurodon',endingSource:'gallery'|'completion'='gallery';
function bossName(){return session==='freeplay'?freeChoice.boss:CITIES[cityIndex].boss;}
function ultimateLabel(){return activeKaiju==='Mogurodon'?'SEISMIC RUPTURE':activeKaiju==='Kaiban'?'STAMPEDE':activeKaiju==='Tlézcatl'?'ERUPTION':activeKaiju==='Belial'?'ACID DELUGE':'ULTIMATE PREVIEW';}
const DISPLAY_KEY='kaiju-arcade:display:v1';let display={integer:false,shake:true};
try{const saved=JSON.parse(storage?.getItem(DISPLAY_KEY)||'null');if(saved?.version===1)display={integer:!!saved.integer,shake:saved.shake!==false};}catch{}
function applyDisplay(){const frame=document.querySelector<HTMLElement>('#frame')!;if(display.integer){const space=Math.max(0,Math.min(1160,(window.innerWidth||960)-40)),factor=Math.floor(space/960);frame.style.width=factor>=1?`${960*factor}px`:'';}else frame.style.width='';}
function saveDisplay(){try{storage?.setItem(DISPLAY_KEY,JSON.stringify({version:1,...display}));}catch{}applyDisplay();}
let cityIndex=0,blockIndex=0,block=LEVELS[0][0],worldWidth=levelWidth(block);
let objective:{x:number,hp:number,maxHP:number,shattered:boolean}|null=null,rival:Rival|null=null;
function cityScore(){return score-combat.penalty;}
function objectiveOpen(){return canExitBlock(block.kind,buildings,objective);}
// Open layouts start mid-map and have an exit at each end.
function openLayout(){return block.start!==undefined;}
function persist(){storageOK=savePermanent(storage,permanent)&&storageOK;}
function writeCheckpoint(c:Checkpoint|null){checkpoint=c;storageOK=saveCheckpoint(storage,c)&&storageOK;}

let selectedTier=1,military=createMilitary(),population=createPopulation();
let combat=createCombat(),ambientTimer=0,growthTimer=0,ultimateTimer=0;
let shards:{x:number,y:number,vx:number,vy:number,life:number}[]=[],growths:{x:number,hp:number}[]=[],waves:Wave[]=[];
// Shockwaves along the street: the Ultimate's (ult, size 1) and Mogurodon's Tremor Slam (smaller, charges the Ultimate meter).
type Wave={x:number,vx:number,life:number,max:number,damage:number,hits:Set<object>,ult:boolean,size:number,knockback:number};
// A Tremor Slam waiting for its strip's impact frame.
let tremor:{t:number,dir:number}|null=null;
// Kaiban's Debris Shotgun: the scoop waiting for its fling frame, and the rock chunks in flight (ballistic, stop on first hit).
let debris:{t:number,dir:number}|null=null;
type Rock={x:number,y:number,vx:number,vy:number,life:number,damage:number,knockback:number,spin:number,size:number};
let rocks:Rock[]=[];
// Tlézcatl's Magma Dive: molten globs in flight (ballistic, stop on the first hit, leave a pool where they reach the street) and the
// burning pools on the street (x = left edge, w wide; `hits` = last burn tick per target).
// Eruption globs and pools carry `ult`: their hits are Ultimate damage (no meter gain, no hitstop) and an Eruption glob only collides
// once it is falling.
type Glob={x:number,y:number,vx:number,vy:number,life:number,damage:number,size:number,ult?:boolean,grav?:number};
type Pool={x:number,w:number,life:number,max:number,damage:number,hits:Map<object,number>,ult?:boolean,fire?:boolean,acid?:boolean,tick?:number,size?:number};
let globs:Glob[]=[],pools:Pool[]=[];
// Flame Jet afterburn: a track of fire spots up the wall where the flame touched (x = wall face, y = height above the street, snapped
// to jetWallCell rows), each burning `t` more seconds. Damage ticks once per building however many spots it has (`burnHits`).
type Burn={b:typeof buildings[number],x:number,y:number,t:number,size:number,side:number};
let burns:Burn[]=[],burnHits=new Map<object,number>();
// Tlézcatl's Flame Jet: `start` plays the wind-up strip, `on` breathes (the aim strip's frame follows `angle`, degrees above level,
// negative = down), `end` plays the wind-down. `on` is time spent breathing; `hits` is the last tick time per target. The cone's
// current origin, direction and length are kept for drawing. Fuel (0-1) drains while breathing; running dry locks it until jetRelight.
// `bend` is the distance where the flame meets the street and washes along it (Infinity if it never does).
type Jet={phase:'start'|'on'|'end',t:number,on:number,angle:number,hits:Map<object,number>,ox:number,oy:number,dx:number,dy:number,len:number,stop:boolean,bend:number,bx:number,face:number};
let jet:Jet|null=null,jetFuel=1,jetLocked=false;
// Belial's Acid Vomit rides the same state machine (start / on / end, `angle`, `on`, `hits`; jetFuel is his gland pressure). While it is
// on, `pts` is the stream's arc (world points from the jaws to where it stops) and `land`/`landOn` where it came down this frame.
type Spew={pts:number[][],land:number[]|null,landOn:'street'|'building'|'roof'|null};
let spewState:Spew={pts:[],land:null,landOn:null};
const isBelial=()=>activeKaiju==='Belial';
// Corrosion per target (building, unit or the rival): stacks, seconds of stream contact so far, seconds left, last damage tick.
// `ult`: laid on by the Acid Deluge (or its puddles), so its ticks are Ultimate damage; any contact with the ordinary stream clears it.
type Corr={stacks:number,expo:number,t:number,tick:number,ult:boolean};
let corr=new Map<object,Corr>();
function corrode(o:object,dt:number,ult=false){let c=corr.get(o);if(!c){c={stacks:0,expo:0,t:0,tick:time,ult};corr.set(o,c);}else if(!ult)c.ult=false;
 c.expo+=dt;c.stacks=Math.min(B.corrodeMax,Math.max(1,Math.ceil(c.expo/B.corrodePerStack-1e-9)));c.t=B.corrodeSeconds;}
// A Deluge drop soaks its target: n stacks at once (as if it had sat in the stream that long), refreshed, as Ultimate corrosion. It
// takes over corrosion the stream already laid, so nothing the downpour eats (or knocks down) refills the meter.
function soak(o:object,n:number){let c=corr.get(o);if(!c){c={stacks:0,expo:0,t:0,tick:time,ult:true};corr.set(o,c);}
 c.ult=true;c.stacks=Math.min(B.corrodeMax,c.stacks+n);c.expo=Math.max(c.expo,c.stacks*B.corrodePerStack);c.t=B.corrodeSeconds;}
function vuln(o:object){const c=corr.get(o);return c?1+B.corrodeVuln*c.stacks:1;}
const ARMORED=new Set(['tank','apc']);
// Every player hit on a unit goes through here, so corrosion's extra damage (and the armour it eats) applies to all of it.
function hitUnit(m:typeof military,u:Unit,damage:number,source:'player'|'military'|'boss'='player',knockback=0,direction=1,ultimate=false,cause:Parameters<typeof hitUnitBase>[7]='melee'){
 const c=source==='player'?corr.get(u):undefined;if(c)damage*=vuln(u)*(ARMORED.has(u.type)?1+B.corrodeArmor:1);
 return hitUnitBase(m,u,damage,source,knockback,direction,ultimate,cause);}
// Kaiban's Stampede: bellow (blast on the roar's impact frame), then the charge. `hits` resets when he turns, so each pass hits once.
// Tlézcatl's Eruption: `blasted` once the explosion has gone off, `boom` seconds since, `spat` globs thrown, `flash` the white-out left.
// Where each Eruption glob came down (roof, wall, unit or street), for the debug view; cleared when the next Eruption starts.
let eruptLandings:number[]=[];
let eruption:{blasted:boolean,spat:number,flash:number,boom:number}|null=null;
// Belial's Acid Deluge: `spout` once the geyser is up (`spoutT` seconds since, `spoutLen` how long it lasts), `rain` the drops still
// to fall (each with its own start time after the geyser, landing x and size), `spawned` how many have started falling. It outlives the
// Ultimate until the last drop is out. `landings` (debug) is where each drop came down.
type Drop={x:number,y:number,vy:number,size:number,damage:number};
let deluge:{spout:boolean,spoutT:number,spoutLen:number,queue:{t:number,x:number,size:number}[],spawned:number,mx:number,my:number}|null=null,rain:Drop[]=[],delugeLandings:number[]=[];
let stampede:{dir:number,hits:Set<object>,turned:boolean,bellowed:boolean,charging:boolean,start:number,reach:number}|null=null;
function viewW(){return C.width/zoom;}
function screenX(wx:number){return (wx-camera)*zoom;}
function screenY(wy:number){return C.ground+(wy+cameraY-C.ground)*zoom;}
function bodyWidth(){return C.playerWidth*scale(combat);}
function bodyHeight(){return (player.crouched?C.crouchHeight:C.playerHeight)*scale(combat);}
let oldWidth=C.playerWidth,oldHeight=C.playerHeight;
function netScore(){return Math.round((run?.banked||0)+(citySettled?0:cityScore()));}
let walking=false;
// Light combo hits 1/2/3 each play a one-shot strip; heavy/ranged cancel it.
// While clinging to a wall every light hit is the one-armed climbPunch into the wall (combo damage still counts).
const LIGHT_ANIMS=['light1','light2','light3'];let attack:{anim:string,t:number}|null=null;
// Idle/walk loops restart at frame 0 whenever they begin (attacks start and end on idle frame 0).
let loopAnim='idle',loopT=0;
// Holding heavy: rear back once, then loop the hold pose until release triggers heavySlam.
let heavyT=0;
// Crouch: entering plays crouchDown, leaving plays crouchUp, before the next loop starts. The old 0.6 vertical squash is only a
// fallback for forms with no crouch art; a form that has it draws every strip (heavy hold, attacks) at full size while crouched.
let loopIntro:string|null=null;
// Airborne: jumpRise (only when launched upward) into the jumpAir loop; touching down plays jumpLand.
// Climbing: W grabs a wall, then W/S move up/down and the player hangs in place when neither is held. Space jumps off.
// climbGrab into the climb loop, climbMantle on reaching the roof; reaching the street on S just returns to idle.
// `grabLock` stops W+Space from instantly re-grabbing the wall you just jumped off (cleared when W is released).
let isClimbing=false,clingTo:ReturnType<typeof createBuildings>[number]|null=null,grabLock=false,climbDir=0,mantled=false;
// Run (Shift held, or a double-tapped A/D latched until both are released; the double-tap opens with a dash burst).
// `airRun` keeps run speed through a running jump (a leap). `grabWait` blocks the airborne leap-grab right after kicking off a wall.
// `dive` is the aerial slam: S in the air plunges straight down from startY and hits what is under you on landing.
let runLatch=false,lastTap={code:'',t:-9},dashT=0,airRun=false,running=false,bargeT=0,grabWait=0,dive:{startY:number,t0:number,dir:number}|null=null;
// Street roll after a cannonball slam: `t` is time left, `t0` keeps the spin continuous from the dive, `hits` = struck once this roll.
let roll:{dir:number,t:number,t0:number,power:number,bounced:boolean,hits:Set<object>}|null=null;
const bargeHits=new Map<object,number>();
// Run-up for barges: distance covered running one way on the ground; a wall hit spends it, so pushing into a wall can't repeat.
let runUp=0,runDir=0;
function jumpVelocity(){return C.jumpVelocity*scale(combat)**MV.jumpStageExp;}
function currentAnim():[string,number]{
 if(attack)return [attack.anim,attack.t];
 // A form with an ultSettle strip plays it over the last stretch of the Ultimate, so it comes down from the Ultimate pose and lands on
 // its idle exactly as the Ultimate ends.
 if(combat.ultimateTime>0&&hasAnim(activeKaiju,'ultSettle',combat.stage)){const d=animDuration(activeKaiju,'ultSettle',combat.stage);if(combat.ultimateTime<=d)return ['ultSettle',d-combat.ultimateTime];}
 if(combat.ultimateTime>0&&hasAnim(activeKaiju,'ultRoar',combat.stage)){const pre=eruption?B.eruptCharge:deluge?B.delugeCharge:0,el=B.ultimateDuration-combat.ultimateTime-pre;if(el<0)return ['ultCharge',el+pre];const roar=animDuration(activeKaiju,'ultRoar',combat.stage);return el<roar?['ultRoar',el]:['ultPound',el-roar];}
// Diving: the form's dive strip (time since the dive began) when it has one, else the jumpAir loop.
 if(dive&&hasAnim(activeKaiju,'dive',combat.stage))return ['dive',time-dive.t0];
 if(roll&&hasAnim(activeKaiju,'dive',combat.stage))return ['dive',time-roll.t0];
 if(combat.charging){const rear=animDuration(activeKaiju,'heavyRear',combat.stage);return heavyT<rear?['heavyRear',heavyT]:['heavyHold',heavyT-rear];}
 if(jet)return jetPose(jet);
 const intro=loopIntro?animDuration(activeKaiju,loopIntro,combat.stage):0;
 return loopIntro&&loopT<intro?[loopIntro,loopT]:[loopAnim,loopT-intro];
}
let player={x:110,y:groundAt(110)-C.playerHeight,vy:0,face:1,grounded:true,crouched:false,cooldown:0,pose:0};
type Particle={x:number,y:number,vx:number,vy:number,life:number,color:string,size:number};
// Chunks are separate from particles (own cap): building debris that flies, bounces once and settles.
type Chunk={x:number,y:number,vx:number,vy:number,s:number,color:string,life:number,bounces:number,hurt?:number,ult?:boolean};
// hurt: a slab that damages the first ground unit or vehicle it falls on (then it is just debris).
let chunks:Chunk[]=[],hitstop=0,crushGen=-1;
// City systems (src/city.ts): rampage heat, rooftop fixtures, power-grid state, downed live wires, water-tower splashes.
let rampage=createRampage(),rampFlash=0,roofs:RoofProp[]=[],roofOf=new Map<object,RoofProp>(),wires:LiveWire[]=[],subs:(typeof buildings[number]|null)[]=[],power:boolean[]=[];
let poles:Vehicle[]=[],poleXs:number[]=[],fired=new Set<object>(),ultKill=new Set<object>(),splashes:{x:number,top:number,t:number}[]=[],gridOfB=new Map<object,number>();
// Every point the player earns goes through award(): the rampage multiplier applies and the heat climbs.
function award(points:number){if(!points)return;score+=Math.round(points*rampageMult(rampage));if(points>0)heatUp(pointsHeat(points));}
function heatUp(n:number){const lv=feedRampage(rampage,n);if(lv>=1){rampFlash=1.2;shake=Math.max(shake,2+lv);}}
// Phase 3: bridge spans (shared with the terrain module as decks), subway trains, troops already hurt by a fall into a pit.
type Span=Deck&{hp:number,max:number,fall:number};
type Train={x:number,dir:number,hits:Set<object>,hp:number,crashed:boolean,flash:number};
let spans:Span[]=[],trains:Train[]=[],trainTimer=0,wrecked=0,pitted=new WeakSet<object>();
function makeSpans(b:BlockDef):Span[]{if(!b.bridge)return [];const {x0,x1,spans:n}=b.bridge,w=(x1-x0)/n;
 return Array.from({length:n},(_,i)=>({x0:Math.round(x0+i*w),x1:Math.round(x0+(i+1)*w),y:C.ground,alive:true,hp:R.spanHP,max:R.spanHP,fall:0}));}
function spanBox(s:Span){return {x:s.x0,y:s.y,w:s.x1-s.x0,h:R.deckThick};}
function hitSpan(s:Span,damage:number,ult=false,at?:number){if(!s.alive||damage<=0)return;s.hp-=damage;const x=at??(s.x0+s.x1)/2;
 sparks(x,s.y+4,player.face,4,'#fff0c9');spawnChunks(x,s.y+8,player.face,'#4d5a5c',2,.8);heatUp(damage*Y.gainPerDamage);if(s.hp<=0)dropSpan(s,ult);}
function dropSpan(s:Span,ult:boolean){if(!s.alive)return;s.alive=false;s.fall=.001;
 // Whatever was parked or lying on the deck drops with it.
 for(const v of vehicles)if((v.state==='parked'||v.state==='wreck')&&v.x+v.w/2>=s.x0&&v.x+v.w/2<s.x1)launch(v,0,-30,0);
 for(let x=s.x0;x<s.x1;x+=20)spawnChunks(x,s.y+6,x<(s.x0+s.x1)/2?-1:1,'#4d5a5c',2,1.1);award(R.spanPoints);heatUp(R.spanHeat);
 shake=Math.max(shake,14);if(!ult)freeze(.16);banner={label:'BRIDGE SPAN DOWN',side:0,life:2.4};action='BRIDGE SPAN COLLAPSED';actionTime=2;}
// Cave the street in over a subway line at cx (never under a standing building). Returns true if a pit opened.
function caveIn(cx:number,width:number,ult=false){
 const cata=style()==='par'&&block.kind!=='boss';if(!(cata||block.subway?.some(([a,z])=>cx>=a&&cx<z))||pitAt(cx))return false;let a=cx-width/2,z=cx+width/2;
 for(const b of buildings)if(b.kind!=='tiny'&&b.hpNow>0){if(b.x+b.w<=cx&&b.x+b.w>a)a=b.x+b.w;if(b.x>=cx&&b.x<z)z=b.x;}
 const [la,lz]=cata?[0,worldWidth]:block.subway!.find(([p,q])=>cx>=p&&cx<q)!;a=Math.max(a,la);z=Math.min(z,lz);if(z-a<60||deckAt(cx)||submerged(cx))return false;
 const fresh=true;addPit(a,z,groundAt(cx)+(cata?TW.catacombDepth:R.pitDepth));
 for(const v of vehicles)if((v.state==='parked'||v.state==='driving'||v.state==='wreck')&&v.pole===undefined&&v.x+v.w/2>=a&&v.x+v.w/2<z){if(!v.rewarded)rewardVehicle(v,ult);launch(v,0,-40,0);}
 for(let x=a;x<z;x+=16)spawnChunks(x,groundAt(x)-R.pitDepth,x<cx?-1:1,'#4c5755',2,1.2);burst(cx,C.ground-6,'#cfc6a8',24);
 if(fresh){award(R.pitPoints);heatUp(R.pitHeat);action=cata?'STREET CAVED IN · THE CATACOMBS':'STREET CAVED IN · SUBWAY BELOW';actionTime=1.6;}shake=Math.max(shake,8);return fresh;}
// Rivers, bridges and subways each frame: drowning, sinking, falling spans, troops dropped into pits, trains under the street.
function tickRiver(dt:number,w:number){
 for(const u of military.units){if(u.hp<=0||UNITS[u.type].air)continue;const cx=u.x+u.w/2;
  if(submerged(cx)&&u.y+u.h>=groundAt(cx)-4){splash(cx,waterAt(cx)!,6);hitUnit(military,u,u.hp,'player',0,1,false,'blast');continue;}
  if(pitAt(cx)&&!pitted.has(u)&&u.y+u.h>=groundAt(cx)-2){pitted.add(u);hitUnit(military,u,R.fallDamage,'player',0,1,false,'blast');}}
 for(const v of vehicles)if(loose(v)&&v.pole===undefined&&submerged(v.x+v.w/2)){splash(v.x+v.w/2,waterAt(v.x+v.w/2)!,10);if(!v.rewarded)rewardVehicle(v);(v as any).sunk=true;}
 vehicles=vehicles.filter(v=>!(v as any).sunk);
 for(const p of pools)if(submerged(p.x+p.w/2))p.life=0;
 for(const s of spans)if(s.fall>0&&s.fall<1)s.fall=Math.min(1,s.fall+dt/1.4);
 if(player.grounded&&submerged(player.x+w/2)&&walking&&particles.length<C.particleCap&&Math.random()<dt*20)splash(player.x+w/2-player.face*w*.3,waterAt(player.x+w/2)!,2);
 // Cars that drive into a hole careen off the edge, nose first, and go up when they land.
 for(const v of vehicles){if(v.state!=='driving')continue;const front=v.x+(v.dir>0?v.w:0);
  if(pitAt(front)&&!pitAt(v.x+v.w/2-v.dir*v.w*.4)){if(!v.rewarded)rewardVehicle(v);launch(v,v.dir*Math.max(80,v.speed)*R.careenSpeed,-R.careenLift,R.careenDamage);v.thrown=true;v.spin=v.dir*4;}}
 // Trains run the line on a timer, open street or not (they show in cutaway). Only what is down in a pit is in their way.
 if(block.subway&&wrecked<R.trainWrecks){trainTimer-=dt;if(trainTimer<=0){trainTimer=R.trainEvery;const dir=Math.random()<.5?1:-1,[a,z]=block.subway[0];
  trains.push({x:dir>0?a-R.trainLength:z,dir,hits:new Set(),hp:R.trainHP,crashed:false,flash:0});}}
 const inPit=player.y+bodyHeight()>C.ground+10&&!!pitAt(player.x+w/2);
 for(const t of trains){t.flash=Math.max(0,t.flash-dt);if(t.crashed)continue;t.x+=t.dir*R.trainSpeed*dt;const nose=t.dir>0?t.x+R.trainLength:t.x;
  // Pile-up: a train runs into a wreck already in the tunnel.
  const wreck=trains.find(o=>o!==t&&o.crashed&&nose>=o.x&&nose<=o.x+R.trainLength);if(wreck){t.x=t.dir>0?wreck.x-R.trainLength:wreck.x+R.trainLength;crashTrain(t,false,'PILE-UP IN THE TUNNEL');continue;}
  // The kaiju standing in a pit is in the way: the train smashes into it and derails.
  if(inPit&&nose>=player.x&&nose<=player.x+w){t.x=t.dir>0?player.x-R.trainLength:player.x+w;if(receiveHit(combat,R.trainHitDamage,'environment',R.trainKnock,t.dir)>0){hurtFlash=MF.hurtFlash;hurtRed=true;}crashTrain(t,false,'TRAIN SMASHED INTO THE KAIJU');continue;}
  for(const p of pitList()){if(t.x+R.trainLength<p.x0||t.x>p.x1)continue;const box={x:t.x,w:R.trainLength};
   for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&!t.hits.has(u)&&u.x+u.w>Math.max(box.x,p.x0)&&u.x<Math.min(box.x+box.w,p.x1)&&u.y+u.h>p.floor-30){t.hits.add(u);hitUnit(military,u,R.trainDamage,'player',360,t.dir,false,'blast');}
   for(const v of vehicles)if(loose(v)&&!t.hits.has(v)&&v.x+v.w>Math.max(box.x,p.x0)&&v.x<Math.min(box.x+box.w,p.x1)&&v.y+v.h>p.floor-30){t.hits.add(v);puntVehicle(v,30,t.dir,false,1.8);}
   if(Math.random()<dt*30&&particles.length<C.particleCap)particles.push({x:Math.max(p.x0,Math.min(p.x1,t.x+R.trainLength*Math.random())),y:p.floor-10,vx:t.dir*80,vy:-60,life:.3,color:'#fff0c9',size:2});}}
 const line=block.subway?.[0];trains=trains.filter(t=>t.crashed||!!line&&t.x+R.trainLength>line[0]-400&&t.x<line[1]+400);
 while(trains.filter(t=>t.crashed).length>R.trainWrecks)trains.splice(trains.findIndex(t=>t.crashed),1);
}
// Trains: the tunnel floor is the pit floor; a train fills the strip above it. Attacks reach a train only where it shows through a pit.
const tunnelFloor=()=>C.ground+R.pitDepth;
function trainBox(t:Train){return {x:t.x,y:tunnelFloor()-44,w:R.trainLength,h:37};}
function trainsIn(zone:{x:number,y:number,w:number,h:number}){return trains.filter(t=>!t.crashed&&overlaps(zone,trainBox(t))&&pitList().some(p=>p.x0<Math.min(zone.x+zone.w,t.x+R.trainLength)&&p.x1>Math.max(zone.x,t.x)));}
function hitTrain(t:Train,damage:number,ult=false){if(t.crashed||damage<=0)return;t.hp-=damage;t.flash=.12;heatUp(damage*Y.gainPerDamage);const b=trainBox(t),x=Math.max(b.x,Math.min(b.x+b.w,player.x+bodyWidth()/2));
 sparks(x,b.y+b.h/2,player.face,6,'#fff0c9');if(t.hp<=0)crashTrain(t,ult,'SUBWAY TRAIN DERAILED');}
function crashTrain(t:Train,ult:boolean,label:string){t.crashed=true;t.hp=0;wrecked++;const b=trainBox(t);if(wrecked>=R.trainWrecks)label=`${label} · LINE CLOSED`;
 for(let k=0;k<3;k++){const x=b.x+b.w*(k+.5)/3;fireball(x,b.y+b.h/2,26+k*4,true);burst(x,b.y,'#ffcf73',10);}spawnChunks(b.x+b.w/2,b.y,t.dir,'#a9b2b0',10,1.6);
 award(R.trainPoints);heatUp(R.trainHeat);shake=Math.max(shake,12);kick(t.dir*6,-3);if(!ult)freeze(.14);banner={label,side:0,life:2.2};action=label;actionTime=1.8;}
function splash(x:number,y:number,n:number){for(let k=0;k<n&&particles.length<C.particleCap;k++)particles.push({x:x+(Math.random()-.5)*24,y,vx:(Math.random()-.5)*160,vy:-(80+Math.random()*200),life:.45,color:Math.random()<.5?'#a8d8ee':'#e2f4fb',size:2+Math.floor(Math.random()*2)});}
// A thrown or sheared chunk of building lands: it smashes bridge decks and caves in the subway under it.
function heavyLanding(v:Vehicle){const a=v.x,z=v.x+v.w,cx=(a+z)/2;
 for(const s of spans)if(s.alive&&s.x0<z&&s.x1>a)hitSpan(s,R.chunkDamage*mass(v),false,Math.max(s.x0,Math.min(s.x1,cx)));
 if(caveIn(cx,Math.max(R.pitMin,v.w)))shake=Math.max(shake,10);}
// Shearing: a hard blow to a middle floor breaks the building there and throws everything above it off as one chunk.
function tryShear(b:typeof buildings[number],damage:number,at:{x:number,y:number}|undefined,ult:boolean,dir:number){
 // Crush damage from a falling tower doesn't shear (it already hits hard and can topple the next one).
 const n=b.floors.length;if(n<FL.shearMinFloors||damage<FL.shearDamage||!at||b.hpNow<=1||crushGen>=0)return false;
 const i=floorAt(b,b.base-at.y);if(i<1||i>n-3)return false;
 const fh=floorHeightOf(b),topH=Math.round((n-1-i)*fh),cut=b.base-(i+1)*fh,share=Math.min(b.hpNow-1,b.hp*(n-i)/n);
 b.hpNow-=share;creditDamage(combat,share,'player',ult);award(Math.round(b.value*10*FL.shearPoints*(n-i)/n));heatUp(FL.shearHeat);
 const p=roofOf.get(b);if(p&&!p.dead)breakRoof(p,ult);
 b.floors.splice(i);b.h=Math.round(i*fh);b.holes=b.holes.filter(o=>o.y<b.h-4);b.jolt=F.joltSeconds;b.joltDir=dir;
 const v=liftedBuilding(nextVehicle++,{x:b.x,w:b.w,h:topH,color:b.color,label:''});v.y=cut-topH;v.rewarded=true;
 launch(v,dir*FL.shearSpeed/Math.sqrt(mass(v)),-FL.shearLift,FL.shearImpact*mass(v));v.spin=dir*FL.shearSpin;v.hits.add(b);vehicles.push(v);
 for(let x=b.x;x<b.x+b.w;x+=12)burst(x,cut,'#d8cfb2',3);spawnDebris(b.x+b.w/2,cut,dir,10,1.6);spawnSlabs(b.x+b.w/2,cut,dir,b.color,4,ult,1.4);
 shake=Math.max(shake,10);if(!ult)freeze(F.hitstopCollapse*1.4);action='SHEARED';actionTime=1.4;return true;}
// ---- Phase 5: fire, rubble, city twists ----
const style=()=>CITIES[cityIndex].style;
// Burning buildings: heat 0..1 climbs while it burns; the next tick of damage / spread is due at `tick` / `spread`.
let blazes=new Map<object,{heat:number,tick:number,spread:number}>(),mounded=new Set<object>(),exposure=new Map<object,number>();
// Exposure: fire next to a building builds up; at 1 it catches (deterministic, so fire spreads predictably).
function expose(b:typeof buildings[number],amount:number){if(blazes.has(b)||b.hpNow<=0)return;const e=(exposure.get(b)??0)+amount;if(e>=1){exposure.delete(b);setAlight(b);}else exposure.set(b,e);}
function setAlight(b:typeof buildings[number]){if(b.hpNow<=0||b.kind==='tiny'||b.role||blazes.has(b)||blazes.size>=FI.cap)return false;blazes.set(b,{heat:FI.start,tick:time+.5,spread:time+FI.spreadEvery});return true;}
function douse(x:number,r:number){for(const b of [...blazes.keys()] as (typeof buildings[number])[])if(Math.abs(b.x+b.w/2-x)<r+b.w/2){blazes.delete(b);for(let n=0;n<6;n++)particles.push({x:b.x+Math.random()*b.w,y:b.base-b.h*Math.random(),vx:0,vy:-60,life:.6,color:'#d9dde0',size:3});}}
function tickFire(dt:number){const rain=!!CITIES[cityIndex].mood.rain;
 for(const [o,f] of [...blazes]){const b=o as typeof buildings[number];if(b.hpNow<=0||b.topple||b.lifted){blazes.delete(b);continue;}
  f.heat=Math.min(1,f.heat+FI.grow*(rain?.5:1)*dt);
  if(time>=f.tick){f.tick=time+.5;hit(b,FI.dps*f.heat*.5,true,player.face,undefined,true);}
  if(time>=f.spread){f.spread=time+FI.spreadEvery;for(const t of buildings)if(t!==b&&t.hpNow>0&&!blazes.has(t)&&t.kind!=='tiny'&&!t.role){const gap=Math.max(t.x-(b.x+b.w),b.x-(t.x+t.w));if(gap<FI.reach)expose(t,FI.spreadChance*f.heat*(rain?.5:1));}}
  if(particles.length<C.particleCap&&Math.random()<dt*14*f.heat)particles.push({x:b.x+b.w*(.2+Math.random()*.6),y:b.base-b.h,vx:(Math.random()-.5)*20,vy:-(50+Math.random()*60),life:.9+Math.random()*.6,color:Math.random()<.7?'#5a5552':'#3e3a38',size:3+Math.floor(Math.random()*4)});}
 // Flame scorching a wall (Tlézcatl's jet) can set the building alight, same odds as a fire on the pavement beside it.
 for(const f of burns)expose(f.b,FI.poolChance*dt/Math.max(1,burns.filter(o=>o.b===f.b).length));
 // Fuel and flame pools against a wall can set it alight.
 for(const p of pools){if(!p.fire)continue;for(const b of buildings)if(b.hpNow>0&&b.kind!=='tiny'&&p.x<b.x+b.w+FI.poolReach&&p.x+p.w>b.x-FI.poolReach){expose(b,FI.poolChance*dt);break;}}}
// A burning building's flames: tongues in its upper floors, more of it alight as the heat climbs; a glow at night.
function drawBlaze(b:typeof buildings[number],x:number,h:number){const f=blazes.get(b);if(!f)return;const y=b.base-h,bw=b.w-7,rows=Math.max(1,Math.ceil(f.heat*Math.min(6,h/40)));
 if(CITIES[cityIndex].mood.lights>.6){ctx.globalAlpha=.18*f.heat;rect(x-10,y-20,bw+20,h*.6,'#ff8a1f');ctx.globalAlpha=1;}
 for(let r=0;r<rows;r++){const yy=y+14+r*30;for(let xx=8;xx<bw-8;xx+=22){const hh=10+8*Math.abs(Math.sin(time*10+xx*.3+r*1.7));poly([[x+xx-6,yy+12],[x+xx-1,yy+12-hh],[x+xx+3,yy+12-hh*.6],[x+xx+7,yy+12]],r%2?'#ffb13b':'#e8401a');}}
 for(let k=0;k<3;k++){const cx=x+bw*(.25+k*.25),hh=(14+10*Math.abs(Math.sin(time*8+k)))*f.heat;poly([[cx-8,y+2],[cx,y-hh],[cx+8,y+2]],'#ff8a1f');}}
// Rubble: a collapsed building heaps over its footprint; a toppled tower leaves a ridge where it fell.
function heapRubble(b:typeof buildings[number],from?:number,to?:number){if(mounded.has(b)||b.kind==='tiny'||b.role||b.lifted)return;mounded.add(b);
 if(from!==undefined)addMound(from,to!,RB.ridge,RB.side);else addMound(b.x-6,b.x+b.w+4,Math.max(RB.min,Math.min(RB.max,b.h*RB.heightK)),RB.side);}
function drawMounds(){for(const m of moundList()){const a=m.x0-camera,z=m.x1-camera;if(z<-20||a>viewW()+20)continue;ctx.fillStyle='#6d6a5f';ctx.beginPath();ctx.moveTo(a,bedAt(m.x0));
 for(let x=m.x0;x<=m.x1;x+=6)ctx.lineTo(x-camera,groundAt(x));ctx.lineTo(z,bedAt(m.x1));ctx.closePath();ctx.fill();
 for(let x=m.x0+4;x<m.x1-6;x+=11){const t=groundAt(x);rect(x-camera,t+2+((x*7)%9),8,6,(x*13)%3?'#898879':'#55534b');}}}
// Mexico City: soft lake-bed ground. A heavy impact near buildings sinks them; sunk far enough, they give way.
function sinkAround(cx:number,ult=false){if(style()!=='mex')return;let any=false;
 for(const b of buildings){if(b.hpNow<=0||b.kind==='tiny'||b.role)continue;const d=Math.abs(b.x+b.w/2-cx);if(d>TW.sinkRadius)continue;
  b.sink+=TW.sinkStep;b.base+=TW.sinkStep;any=true;for(let x=b.x;x<b.x+b.w;x+=14)burst(x,b.base-b.sink,'#c9b79c',2);
  if(b.sink>=b.h*TW.sinkMax)hit(b,b.hpNow,ult,Math.sign(b.x+b.w/2-cx)||1,{x:b.x+b.w/2,y:b.base-10});else hit(b,TW.sinkDamage,ult,Math.sign(b.x+b.w/2-cx)||1,undefined,true);}
 if(any){action='THE GROUND GIVES WAY';actionTime=1.4;shake=Math.max(shake,6);}}
function powered(x:number){const g=gridOf(x,block.grids);return g<0||power[g];}
// Hitstop belongs to the blow itself. `echo` is set while follow-up hits resolve (shockwaves, flying rocks and lava, burning
// pools, punted cars): they still jolt, hole and shed chunks, but freeze the game at most once per F.hitstopEcho seconds and never
// within that long of another freeze. Without this a single dive in a dense street froze the game six to eleven times in a row.
let echo=false,lastFreeze=-9;
function freeze(seconds:number){if(echo&&time-lastFreeze<F.hitstopEcho)return;if(seconds>hitstop)hitstop=seconds;lastFreeze=time;}
// Vehicles replace the old static parked cars: traffic, punts, grabs and throws. `held` is carried overhead.
// `barges`: wall barges/gores landed this session (debug hook only).
let barges=0;
let vehicles:Vehicle[]=[],held:Vehicle|null=null,trafficTimer=0,trafficBudget=0,nextVehicle=1000;
// Military feel: the kaiju's hurt flash/jolt, a directional camera kick, fireballs and scorch/splat decals, scorch marks on the
// body, the HP ghost bar, wave banners and the stomp chain. All presentation; gameplay lives in military.ts.
type Fireball={x:number,y:number,r:number,life:number,max:number,big:boolean};
type Decal={x:number,w:number,life:number,kind:'scorch'|'splat'};
let hurtFlash=0,hurtRed=false,hurtJolt=0,kickX=0,kickY=0,hpGhost=0,ghostWait=0,fireballs:Fireball[]=[],decals:Decal[]=[],bodyMarks:{dx:number,dy:number,life:number}[]=[];
let banner:{label:string,side:number,life:number}|null=null,stomp={count:0,time:0};
function resetMilitaryFeel(){hurtFlash=0;hurtJolt=0;kickX=kickY=0;hpGhost=combat.hp;ghostWait=0;fireballs=[];decals=[];bodyMarks=[];banner=null;stomp={count:0,time:0};}
function kick(x:number,y=0){if(!display.shake)return;kickX=Math.max(-14,Math.min(14,kickX+x));kickY=Math.max(-10,Math.min(10,kickY+y));}
function fireball(x:number,y:number,r:number,big=false){if(fireballs.length>=40)fireballs.shift();const max=.32+r/160;fireballs.push({x,y,r,life:max,max,big});}
function decal(x:number,w:number,kind:Decal['kind']){if(decals.length>=48)decals.shift();decals.push({x,w,life:kind==='scorch'?14:9,kind});}
function sparks(x:number,y:number,dir:number,count:number,color='#ffe9a6'){for(let n=0;n<count&&particles.length<C.particleCap;n++)particles.push({x,y,vx:-dir*(60+Math.random()*200)+(Math.random()-.5)*80,vy:-(40+Math.random()*180),life:.18+Math.random()*.22,color,size:2});}
const UNIT_TINT:Record<string,string>={police:'#445b76',soldier:'#647653',patrol:'#557288',apc:'#7b8c61',tank:'#65795b',artillery:'#65795b',emplacement:'#6b7466',helicopter:'#596e60',jet:'#73877f',bomber:'#5d7160'};
// The kaiju is hit: sparks off the hide for bullets (no damage at Stage 3), a flash, jolt, kick and hit-stop for explosives.
function militaryHitsPlayer(e:Extract<MilitaryEvent,{kind:'playerHit'}>){
 const raw=e.damage*smallArmsScale(e.weapon,combat.stage),before=combat.hp,actual=receiveHit(combat,raw,'military',e.strength,e.direction);
 if(e.weapon==='bullet'){sparks(e.x,e.y,e.direction,actual>0?3:2,actual>0?'#ffd38a':'#fff3c4');if(actual>0){hurtFlash=Math.max(hurtFlash,MF.sparkFlash);hurtRed=false;}return;}
 if(actual<=0)return;
 const k=Math.min(1.6,e.strength/250+actual/20);
 hurtFlash=MF.hurtFlash;hurtRed=true;hurtJolt=e.direction*MF.hurtJolt*k;ghostWait=MF.ghostDelay;if(hpGhost<before)hpGhost=before;
 freeze(Math.min(MF.hurtHitstopMax,MF.hurtHitstop+actual*MF.hurtHitstopPerDamage));
 shake=Math.max(shake,4+k*4);kick(e.direction*(6+k*6),-3*k);
 fireball(e.x,e.y,16+e.strength/14);burst(e.x,e.y,'#f197b8',6);sparks(e.x,e.y,-e.direction,6,'#ffb35c');
 if(bodyMarks.length>=6)bodyMarks.shift();bodyMarks.push({dx:(e.x-(player.x+bodyWidth()/2))*player.face,dy:e.y-player.y,life:3});
 if(e.y>=groundAt(e.x)-14)decal(e.x-20,40,'scorch');
}
// A unit dies: troops leave a splat; vehicles and aircraft explode, bigger for heavier units and biggest on thrown/ranged kills.
// Road vehicles become burning wrecks that tumble with the blow (and, after a thrown/ranged kill, can knock others flying).
function unitDies(e:Extract<MilitaryEvent,{kind:'death'}>){
 const d=UNITS[e.type],m=d.mass,mine=e.source==='player',big=e.cause==='thrown'||e.cause==='ranged',dir=e.dir||1;
 if(e.type==='police'||e.type==='soldier'){
  decal(e.x-e.w*.7,e.w*1.4,'splat');burst(e.x,groundAt(e.x)-4,'#9b3b3b',5);spawnChunks(e.x,groundAt(e.x)-8,dir,UNIT_TINT[e.type],2,.5);
  if(mine){if(e.cause!=='ultimate')freeze(.025);if(time-stomp.time<1.1)stomp.count++;else stomp.count=1;stomp.time=time;if(stomp.count>=3){action=`STOMP ×${stomp.count}`;actionTime=.9;}}
  return;}
 const power=big?1.45:1;
 // Ultimate kills never freeze the game (the Ultimate's own rule: no hitstop).
 if(mine&&e.cause!=='ultimate'){freeze(Math.min(MF.deathHitstopMax,MF.deathHitstop+m*MF.deathHitstopPerMass+(big?MF.deathHitstopBig:0)));}
 shake=Math.max(shake,(3+m*1.6)*power);kick(dir*(2+m*1.6)*power,-(1+m*.6)*power);
 fireball(e.x,e.y,(14+m*8)*power,big);fireball(e.x+dir*e.w*.25,e.y-e.h*.3,(8+m*5)*power,big);
 burst(e.x,e.y,'#ffcf73',8+m*2);burst(e.x,e.y,'#5e6460',6+m);
 spawnChunks(e.x,e.y,dir,UNIT_TINT[e.type]??'#65795b',Math.round((3+m*2)*power),1+m*.15);
 if(!d.air)decal(e.x-e.w*.6,e.w*1.2,'scorch');
 // The tank's turret pops off and cartwheels away.
 if(e.type==='tank'&&chunks.length<F.chunkCap)chunks.push({x:e.x,y:e.y-e.h*.4,vx:dir*(90+Math.random()*80)*power,vy:-(380+Math.random()*120)*power,s:12,color:UNIT_TINT.tank,life:F.chunkLife*1.4,bounces:0});
 if(ROAD_UNITS.has(e.type)){
  const v=makeProp(nextVehicle++,e.type as Vehicle['kind'],e.x-e.w/2,UNIT_COLORS[e.type]);v.lane=e.lane??0;v.y=e.y-e.h/2;
  const [lo,hi]=MF.wreckLaunch,lift=(lo+(hi-lo)*Math.min(1,e.knockback/400))*power/Math.sqrt(m);
  launch(v,dir*(80+e.knockback*.6)*power/Math.sqrt(m),-lift,mine&&big?MF.wreckThrowDamage*m:0);v.burn=MF.wreckBurn;vehicles.push(v);
 }
 if(mine&&big&&m>=3){action=e.cause==='thrown'?`${e.type.toUpperCase()} DETONATED`:`${e.type.toUpperCase()} DESTROYED`;actionTime=.9;}
}
function crashFeel(e:Extract<MilitaryEvent,{kind:'crash'}>){
 const m=UNITS[e.type].mass;freeze(.06);shake=Math.max(shake,7+m);kick(0,6+m);
 fireball(e.x,e.y-10,e.radius*.7,true);fireball(e.x-20,e.y-24,e.radius*.45,true);fireball(e.x+22,e.y-18,e.radius*.4,true);
 burst(e.x,e.y,'#ffcf73',16);spawnChunks(e.x,e.y-6,1,UNIT_TINT[e.type]??'#596e60',5,1.4);spawnChunks(e.x,e.y-6,-1,'#3c4945',5,1.4);decal(e.x-e.radius*.5,e.radius,'scorch');
}
function tickMilitaryFeel(dt:number){
 hurtFlash=Math.max(0,hurtFlash-dt);hurtJolt*=Math.exp(-dt*16);kickX*=Math.exp(-dt*11);kickY*=Math.exp(-dt*11);
 if(ghostWait>0)ghostWait-=dt;else hpGhost=Math.max(combat.hp,hpGhost-MF.ghostDrain*dt);if(hpGhost<combat.hp)hpGhost=combat.hp;
 for(const f of fireballs)f.life-=dt;fireballs=fireballs.filter(f=>f.life>0);
 for(const d of decals)d.life-=dt;decals=decals.filter(d=>d.life>0);
 for(const b of bodyMarks)b.life-=dt;bodyMarks=bodyMarks.filter(b=>b.life>0);
 if(banner){banner.life-=dt;if(banner.life<=0)banner=null;}
 for(const v of vehicles)if(v.burn&&v.burn>0){v.burn-=dt;if(v.state==='flying'&&Math.random()<dt*30)burst(v.x+v.w/2,v.y+v.h/2,Math.random()<.5?'#ff9b3d':'#5e6460',1);}
}
let particles:Particle[]=[],shots:{x:number,y:number,vx:number,life:number,damage:number,knockback:number}[]=[];

function panel(content:string,wide=false){overlay.innerHTML=`<div class="panel ${wide?'panel-wide':''}">${content}</div>`;}
function focus(){canvas.focus();}
function beginIntro(){mode='intro';keys.clear();introElapsed=0;introIndex=-1;introCount++;introPanel();focus();}
function introPanel(){introIndex=introScene(introElapsed);panel(`<div class="intro-copy"><div class="eyebrow">${String(introIndex+1).padStart(2,'0')} / 04 · FIRST IMPACT</div><h2>${INTRO_SCENES[introIndex]}</h2><p class="asset-notice">TEMPORARY SCENE ART</p><button id="skip-intro">SKIP INTRO →</button></div>`);document.querySelector('#skip-intro')!.addEventListener('click',finishIntro);}
function finishIntro(){if(mode!=='intro')return;setup();}
function selectionScreen(){mode='selection';if(!selectable(permanent,selectedKaiju))selectedKaiju='Mogurodon';loadKaijuArt(selectedKaiju);
 const info=ROSTER.find(r=>r.name===selectedKaiju)!;
 panel(`<div class="eyebrow">CAMPAIGN / ${pendingInitials}</div><h1>CHOOSE YOUR <span>KAIJU.</span></h1><div class="roster-grid">${ROSTER.map((r,i)=>{const unlocked=selectable(permanent,r.name);return `<button id="kaiju-${i}" class="roster-card ${r.name===selectedKaiju?'selected':''}" ${unlocked?'':'disabled'} aria-label="${unlocked?r.name:`Locked kaiju slot ${i+1}`}"><span class="char-shadow ${unlocked?'known':'locked'}" style="--char-color:${unlocked?r.color:'#0e191b'}">${unlocked?'◆':'?'}</span><span>${unlocked?r.name:'???'}</span></button>`;}).join('')}</div><div class="stage-grid">${[1,2,3].map(stage=>`<div><canvas id="preview-stage-${stage}" width="240" height="120" aria-label="${selectedKaiju} stage ${stage} temporary idle preview"></canvas><span>STAGE 0${stage}</span></div>`).join('')}</div><div class="rating-grid">${['Damage','Speed','Resistance','Range'].map((label,i)=>`<div><span>${label.toUpperCase()}</span><b>${'●'.repeat(info.ratings[i])}${'○'.repeat(5-info.ratings[i])}</b></div>`).join('')}</div><p class="asset-notice">Temporary sprites / provisional ratings. Shared combat until Phase 5.</p><button id="confirm-kaiju" class="primary">PLAY AS ${selectedKaiju.toUpperCase()} →</button><button id="back">BACK</button>`,true);
 ROSTER.forEach((r,i)=>document.querySelector(`#kaiju-${i}`)!.addEventListener('click',()=>{if(!selectable(permanent,r.name))return;selectedKaiju=r.name;selectionScreen();}));
 document.querySelector('#confirm-kaiju')!.addEventListener('click',()=>{if(!selectable(permanent,selectedKaiju)||!initialsValid(pendingInitials))return;session='campaign';activeKaiju=selectedKaiju;run=newRun(pendingInitials,activeKaiju);score=0;combat=createCombat();cityIndex=0;blockIndex=0;citySettled=false;writeCheckpoint(checkpointOf(run));progressScreen();});document.querySelector('#back')!.addEventListener('click',setup);
}
function paintPreviews(){for(const stage of [1,2,3]){const preview=document.querySelector<HTMLCanvasElement>(`#preview-stage-${stage}`);if(!preview)return;const c=preview.getContext('2d')!;c.imageSmoothingEnabled=false;c.clearRect(0,0,240,120);c.fillStyle='#1d3031';c.fillRect(0,0,240,120);c.fillStyle='#46604f';c.fillRect(15,106,210,1);drawSilhouette(c,selectedKaiju,120,105,[.85,1.1,1.4][stage-1],time,false,'idle',stage);}}
function freePlayScreen(){mode='freeplay-select';if(!selectable(permanent,freeChoice.kaiju))freeChoice.kaiju='Mogurodon';if(!selectable(permanent,freeChoice.boss))freeChoice.boss='Mogurodon';if(!permanent.conquered.includes(freeChoice.city))freeChoice.city=permanent.conquered[0]??0;
 const unlocked=KAIJU.filter(k=>selectable(permanent,k));
 panel(`<div class="eyebrow">ONE CITY / NO CAMPAIGN SCORE</div><h1>FREE <span>PLAY.</span></h1>${permanent.conquered.length?'':'<p>Conquer a campaign city to unlock it here.</p>'}<div class="freeplay-fields"><label for="free-kaiju">PLAYABLE KAIJU</label><select id="free-kaiju">${unlocked.map(k=>`<option ${k===freeChoice.kaiju?'selected':''}>${k}</option>`).join('')}</select><label for="free-city">CONQUERED CITY</label><select id="free-city">${permanent.conquered.length?permanent.conquered.slice().sort().map(i=>`<option value="${i}" ${i===freeChoice.city?'selected':''}>${CITIES[i].name}</option>`).join(''):'<option value="">NO CITIES UNLOCKED</option>'}</select><label for="free-block">START BLOCK</label><select id="free-block">${LEVELS[freeChoice.city]?.map((b,i)=>`<option value="${i}" ${i===(freeChoice.block??0)?'selected':''}>${i+1} · ${b.name}</option>`).join('')??''}</select><label for="free-boss">UNLOCKED RIVAL</label><select id="free-boss">${unlocked.map(k=>`<option ${k===freeChoice.boss?'selected':''}>${k}</option>`).join('')}</select></div><p>Start on any block · Stage 1 start · City difficulty unchanged<br>Mirror matches permitted. Campaign checkpoint stays untouched.</p><p class="asset-notice">All selected kaiju currently use shared combat pending Phase 5.</p><button id="free-start" class="primary" ${validFreePlay(permanent,freeChoice)?'':'disabled'}>ENTER CITY →</button><button id="back">MAIN MENU</button>`);
 const update=()=>{freeChoice={kaiju:document.querySelector<HTMLSelectElement>('#free-kaiju')!.value,city:Number(document.querySelector<HTMLSelectElement>('#free-city')!.value),boss:document.querySelector<HTMLSelectElement>('#free-boss')!.value,block:Number(document.querySelector<HTMLSelectElement>('#free-block')?.value||0)};document.querySelector<HTMLButtonElement>('#free-start')!.disabled=!validFreePlay(permanent,freeChoice);loadKaijuArt(freeChoice.kaiju);};
 for(const id of ['free-kaiju','free-city','free-boss','free-block'])document.querySelector(`#${id}`)!.addEventListener('change',update);
 // A different city has different block names: redraw the list from its first block.
 document.querySelector('#free-city')!.addEventListener('change',()=>{freeChoice.block=0;freePlayScreen();});
 document.querySelector('#free-start')!.addEventListener('click',()=>{update();startFreePlay();});document.querySelector('#back')!.addEventListener('click',title);
}
function startFreePlay(){if(!validFreePlay(permanent,freeChoice))return;session='freeplay';run=null;activeKaiju=freeChoice.kaiju;cityIndex=freeChoice.city;blockIndex=freeChoice.block??0;freeBlockStart=0;citySettled=false;score=0;combat=createCombat();loadBlock();}
function finishFreePlay(){if(cleared)return;cleared=true;mode='conquered';keys.clear();panel(`<div class="eyebrow">FREE PLAY / ${CITIES[cityIndex].name.toUpperCase()}</div><h1>CITY<br><span>CLEARED.</span></h1><p>${activeKaiju.toUpperCase()} / RIVAL ${bossName().toUpperCase()}<br>SESSION SCORE ${netScore().toLocaleString()}<br>No campaign score, checkpoint or unlock changes.</p><button id="free-select" class="primary">CHOOSE CITY →</button><button id="free-again">RETRY SAME CITY</button><button id="back">MAIN MENU</button>`);document.querySelector('#free-select')!.addEventListener('click',freePlayScreen);document.querySelector('#free-again')!.addEventListener('click',startFreePlay);document.querySelector('#back')!.addEventListener('click',title);}
function galleryScreen(){mode='gallery';panel(`<div class="eyebrow">CAMPAIGN COMPLETION RECORDS</div><h1>ENDINGS <span>GALLERY.</span></h1><div class="gallery-grid">${ENDINGS.map((e,i)=>{const unlocked=canViewEnding(permanent,e.name);return `<button id="ending-${i}" ${unlocked?'':'disabled'}><span>${unlocked?e.name:'???'}</span><b>${unlocked?e.title:'LOCKED'}</b></button>`;}).join('')}</div><p>Complete a campaign with a kaiju to unlock its ending.</p><p class="asset-notice">Original illustrations and epilogues are pending. Titles are preserved.</p><button id="back" class="primary">MAIN MENU</button>`,true);
 ENDINGS.forEach((e,i)=>document.querySelector(`#ending-${i}`)!.addEventListener('click',()=>{if(canViewEnding(permanent,e.name))endingScreen(e.name,'gallery');}));document.querySelector('#back')!.addEventListener('click',title);
}
function endingScreen(name:string,source:'gallery'|'completion'){if(!canViewEnding(permanent,name))return;mode='ending';endingName=name;endingSource=source;const e=endingFor(name);panel(`<div class="ending-copy"><div class="eyebrow">${name.toUpperCase()} / CAMPAIGN ENDING</div><h1>${e.title}</h1><p>${e.epilogue||'Original epilogue not yet supplied.'}</p><p class="asset-notice">TEMPORARY ILLUSTRATION · FINAL ART PENDING</p><button id="ending-back" class="primary">${source==='gallery'?'BACK TO GALLERY':'LOCAL TOP 10'}</button><button id="back">MAIN MENU</button></div>`,true);document.querySelector('#ending-back')!.addEventListener('click',()=>source==='gallery'?galleryScreen():scoresScreen());document.querySelector('#back')!.addEventListener('click',title);}
function settingsScreen(){mode='settings';panel(`<div class="eyebrow">DISPLAY / FIXED KEYBOARD CONTROLS</div><h1>SETTINGS.</h1><div class="settings-fields"><label><input id="integer-scale" type="checkbox" ${display.integer?'checked':''}> Integer pixel scaling when space permits</label><label><input id="screen-shake" type="checkbox" ${display.shake?'checked':''}> Screen shake</label></div><button id="settings-fullscreen" class="primary">TOGGLE FULLSCREEN</button><div id="display-status" role="status" aria-live="polite"></div><button id="back">MAIN MENU</button><p>Game always keeps its 16:9 aspect ratio.<br>No audio assets yet; audio controls are deferred.</p>`);
 document.querySelector<HTMLInputElement>('#integer-scale')!.addEventListener('change',e=>{display.integer=(e.target as HTMLInputElement).checked;saveDisplay();});document.querySelector<HTMLInputElement>('#screen-shake')!.addEventListener('change',e=>{display.shake=(e.target as HTMLInputElement).checked;saveDisplay();});document.querySelector('#settings-fullscreen')!.addEventListener('click',toggleFullscreen);document.querySelector('#back')!.addEventListener('click',title);
}
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#frame')!.requestFullscreen();}catch{action='FULLSCREEN UNAVAILABLE';actionTime=2;const status=document.querySelector('#display-status');if(status)status.textContent='Fullscreen is not available here. Browser-fit display remains active.';}}

function title(){mode='title';keys.clear();panel(`<div class="eyebrow">KAIJU ARCADE / M7</div><h1>FIRST<br><span>IMPACT.</span></h1><div class="menu-grid"><button id="new" class="primary">NEW CAMPAIGN</button><button id="continue" ${checkpoint?'':'disabled'}>CONTINUE CAMPAIGN</button><button id="freeplay">FREE PLAY</button><button id="scores">LOCAL TOP 10</button><button id="settings">SETTINGS</button><button id="gallery">ENDINGS GALLERY</button></div><button id="drills" class="text-button">COMBAT DRILLS</button><p class="note">5 CITIES · 25 FIXED BLOCKS · Keyboard required<br>Phase 5 pending · Shared combat / temporary art<br>${storageOK?'Progress saves locally between cities.':'Local storage unavailable or corrupt. Progress may not survive closing.'}</p>`);
 document.querySelector('#new')!.addEventListener('click',()=>{if(checkpoint)confirmAction('A new campaign replaces the unfinished run. Permanent unlocks and scores remain.',beginIntro,title);else beginIntro();});
 document.querySelector('#continue')!.addEventListener('click',()=>{if(!checkpoint)return;session='campaign';run=resumeRun(checkpoint);activeKaiju=run.kaiju;score=0;combat=createCombat();citySettled=false;cityIndex=run.city;blockIndex=0;progressScreen();});
 document.querySelector('#scores')!.addEventListener('click',scoresScreen);document.querySelector('#drills')!.addEventListener('click',drills);document.querySelector('#freeplay')!.addEventListener('click',freePlayScreen);document.querySelector('#gallery')!.addEventListener('click',galleryScreen);document.querySelector('#settings')!.addEventListener('click',settingsScreen);
}
function setup(){mode='setup';panel(`<div class="eyebrow">NEW CAMPAIGN</div><h1>YOUR<br><span>INITIALS.</span></h1><label for="initials">EXACTLY THREE LETTERS</label><input id="initials" maxlength="3" autocomplete="off" spellcheck="false" placeholder="AAA" aria-describedby="initials-help"><p id="initials-help">Choose an unlocked kaiju next.<br>Every campaign begins at Stage 1.</p><button id="launch" class="primary" disabled>CHOOSE KAIJU →</button><button id="back">MAIN MENU</button>`);
 const input=document.querySelector<HTMLInputElement>('#initials')!,launch=document.querySelector<HTMLButtonElement>('#launch')!;
 input.addEventListener('input',()=>{input.value=input.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);launch.disabled=!initialsValid(input.value);});
 launch.addEventListener('click',()=>{if(!initialsValid(input.value))return;pendingInitials=input.value;selectedKaiju=selectable(permanent,selectedKaiju)?selectedKaiju:'Mogurodon';selectionScreen();});
 document.querySelector('#back')!.addEventListener('click',title);input.focus();
}
function progressScreen(){loadKaijuArt(activeKaiju);mode='progress';if(!run)return;cityIndex=run.city;panel(`<div class="eyebrow">CAMPAIGN / ${run.initials} / ${run.kaiju.toUpperCase()}</div><h1>${CITIES[cityIndex].name.toUpperCase()}</h1><p>CITY ${cityIndex+1} / 5 · BANKED SCORE ${Math.round(run.banked).toLocaleString()}<br>5 BLOCKS · RIVAL ${bossName().toUpperCase()}</p><div class="city-route">${CITIES.map((c,i)=>`<span class="${i===cityIndex?'current':''}">${i<cityIndex?'✓':String(i+1).padStart(2,'0')} ${c.name}</span>`).join('')}</div><button id="begin-city" class="primary">BEGIN CITY →</button><button id="back">MAIN MENU</button><p class="note">Checkpoint: ${CITIES[cityIndex].name}, Block 1.<br>Energy, Ultimate and Super reset for each city.</p>`);
 document.querySelector('#begin-city')!.addEventListener('click',()=>{if(!run)return;restartCity(run);score=0;citySettled=false;combat=createCombat();cityIndex=run.city;blockIndex=0;loadBlock(false);});document.querySelector('#back')!.addEventListener('click',title);
}
function scoresScreen(){mode='scores';panel(`<div class="eyebrow">LOCAL CAMPAIGN RECORDS</div><h1>TOP <span>10.</span></h1><div class="score-list">${permanent.scores.length?permanent.scores.map((r,i)=>`<div><span>${String(i+1).padStart(2,'0')} ${r.initials}</span><span>${r.kaiju}</span><b>${r.score.toLocaleString()}</b><span>${r.cities}/5 ${r.completed?'CLEAR':'FALLEN'}</span></div>`).join(''):'<p>No campaign records yet.<br>Failed and completed runs are both eligible.</p>'}</div><button id="back" class="primary">MAIN MENU</button><p class="note">Drill scores are excluded. Stored on this browser only.</p>`);document.querySelector('#back')!.addEventListener('click',title);}
function drills(){loadKaijuArt('Mogurodon');mode='setup';panel(`<div class="eyebrow">PRACTICE / NO CAMPAIGN SCORE</div><h1>COMBAT<br><span>DRILLS.</span></h1><label class="drill-label" for="tier">REINFORCEMENTS</label><select id="tier"><option value="1">Block 1 — Police patrol</option><option value="2">Drill — National Guard</option><option value="3">Drill — Stronghold forces</option><option value="4">Drill — Full military assault</option><option value="5">Drill — Limited arena support</option></select><button class="primary" id="start">ENTER DRILL →</button><button id="back">MAIN MENU</button><p class="note">Uses the original New York Block 1 map.<br>No checkpoint, unlock or Top 10 changes.</p>`);const select=document.querySelector<HTMLSelectElement>('#tier')!;select.value=String(selectedTier);select.addEventListener('change',()=>selectedTier=Number(select.value));document.querySelector('#start')!.addEventListener('click',start);document.querySelector('#back')!.addEventListener('click',title);}
function start(){session='drill';run=null;activeKaiju='Mogurodon';cityIndex=0;blockIndex=0;citySettled=false;score=0;combat=createCombat();loadBlock(true);}
function loadBlock(drill=false){
 block=drill?DRILL_BLOCK:LEVELS[cityIndex][blockIndex];spans=makeSpans(block);setTerrain(block.ground??null,block.water??[],spans);trains=[];wrecked=0;blazes=new Map();mounded=new Set();exposure=new Map();trainTimer=R.trainEvery*.5;pitted=new WeakSet();worldWidth=levelWidth(block);time=0;actionTime=0;military=createMilitary(drill?selectedTier:blockIndex+1,cityIndex);resetMilitaryFeel();population=createPopulation(Math.random,block.street,block.cars);buildings=createBuildings(block.buildings);camera=0;cameraY=0;cleared=false;particles=[];chunks=[];hitstop=0;echo=false;lastFreeze=-9;setVehicleLook(CITIES[cityIndex].cars,CITIES[cityIndex].taxi);vehicles=[...createParked(block.cars),...createLamps(worldWidth,500).filter(l=>!(block.poles??[]).some(x=>Math.abs(x-l.x)<70))];
  rampage=createRampage();rampFlash=0;wires=[];splashes=[];fired=new Set();ultKill=new Set();
  subs=substations(buildings,block.grids);power=gridPowered(subs);roofs=createRoofProps(buildings,block.grids);roofOf=new Map(roofs.map(p=>[p.b,p]));gridOfB=new Map(buildings.map(b=>[b,gridOf(b.x+b.w/2,block.grids)]));
  poleXs=block.poles??[];poles=createPoles(poleXs,poleXs.map(x=>gridOf(x,block.grids)),Y.poleH,800);vehicles.push(...poles);held=null;trafficTimer=0;trafficBudget=!drill&&block.kind!=='boss'?Math.round(worldWidth/C.width*VC.trafficPerScreen):0;shots=[];keys.clear();shards=[];growths=[];waves=[];tremor=null;debris=null;jet=null;jetFuel=1;jetLocked=false;burns=[];burnHits=new Map();rocks=[];globs=[];pools=[];corr=new Map();spewState={pts:[],land:null,landOn:null};stampede=null;eruption=null;deluge=null;rain=[];delugeLandings=[];ambientTimer=0;growthTimer=0;ultimateTimer=0;
 cancelCharge(combat);combat.cooldown=0;combat.rangedCooldown=0;combat.combo=0;combat.comboWindow=0;attack=null;combat.stagger=0;combat.staggerGuard=0;combat.knockback=0;
 clingTo=null;grabLock=false;isClimbing=false;climbDir=0;runLatch=false;dashT=0;airRun=false;running=false;bargeT=0;grabWait=0;dive=null;roll=null;runUp=0;runDir=0;bargeHits.clear();oldWidth=bodyWidth();oldHeight=C.playerHeight*scale(combat);player={x:block.start===undefined?110:block.start-oldWidth/2,y:groundAt(block.start===undefined?110:block.start-oldWidth/2)-oldHeight,vy:0,face:1,grounded:true,crouched:false,cooldown:0,pose:0};
 camera=Math.max(0,Math.min(worldWidth-viewW(),player.x+oldWidth/2-viewW()*.34));
 objective=!drill&&block.kind==='stronghold'?{x:worldWidth/2,hp:P.strongholdHP,maxHP:P.strongholdHP,shattered:false}:null;
 rival=!drill&&block.kind==='boss'?createRival(worldWidth,cityIndex):null;
 if(objective){for(const [type,offset] of [['tank',-390],['emplacement',-180],['emplacement',210],['artillery',510],['helicopter',-650]] as const)spawnUnit(military,type,objective.x+offset);}
 if(openLayout()&&!drill){action=`${block.buildings.filter(b=>b.landmark).length} LANDMARKS · EXITS EAST AND WEST`;actionTime=3.5;}
 loadKaijuArt(activeKaiju,combat.stage);
 mode='playing';overlay.innerHTML='';focus();
}
function pause(){if(mode!=='playing')return;mode='paused';keys.clear();cancelCharge(combat);panel(`<div class="eyebrow">${session==='campaign'?'CAMPAIGN':session==='freeplay'?'FREE PLAY':'DRILL'} PAUSED</div><h1>PAUSED</h1><p>${session==='campaign'?`${CITIES[cityIndex].name} · Block ${blockIndex+1}<br>Restart resets the entire city and its score.`:session==='freeplay'?`${CITIES[cityIndex].name} · Block ${blockIndex+1}<br>Free Play has no campaign score or save.`:'Your drill progress is paused.'}</p><button class="primary" id="resume">RESUME</button><button id="moves">MOVES &amp; CONTROLS</button><button id="restart">${session==='drill'?'RESTART DRILL':'RESTART CITY'}</button><button id="menu">QUIT TO MENU</button>`);
 document.querySelector('#resume')!.addEventListener('click',resume);document.querySelector('#moves')!.addEventListener('click',()=>movesPanel('moves'));document.querySelector('#restart')!.addEventListener('click',()=>confirmAction(session!=='drill'?'Restart this city at Block 1? Current city score and meters will reset.':'Restart the drill? Its score and progress will reset.',()=>{if(session==='campaign'&&run){restartCity(run);blockIndex=0;score=0;combat=createCombat();citySettled=false;loadBlock();}else if(session==='freeplay')startFreePlay();else start();},pauseAgain));
 document.querySelector('#menu')!.addEventListener('click',()=>confirmAction(session==='campaign'?`Quit? All progress in ${CITIES[cityIndex].name} will be lost. Continue resumes at Block 1. Earlier city scores remain saved.`:session==='freeplay'?'Leave Free Play? This city session is not saved. Campaign progress is unaffected.':'Leave the drill? Its score and progress will be lost.',title,pauseAgain));
}
function pauseAgain(){mode='playing';pause();}
// Pause → Moves & Controls: the active kaiju's signature moves and shared combat (Moves tab), movement and climbing (Controls tab).
const keyCaps=(keys:string)=>keys.split(' › ').map(step=>step.split('+').map(held=>held.split('/').map(k=>`<kbd>${k}</kbd>`).join('<i>/</i>')).join('<i>+</i>')).join('<i>›</i>');
function movesPanel(tab:'moves'|'controls'){const list=moveList(activeKaiju)[tab];
 panel(`<div class="eyebrow">${activeKaiju.toUpperCase()} · STAGE ${combat.stage}</div><h1>${tab==='moves'?'MOVES':'CONTROLS'}</h1>
 <div class="moves-tabs"><button id="tab-moves" class="${tab==='moves'?'active':''}">MOVES</button><button id="tab-controls" class="${tab==='controls'?'active':''}">CONTROLS</button></div>
 <div class="move-list">${list.map(sec=>`<h2>${sec.title}</h2>${sec.moves.map(m=>`<div class="move"><div class="move-keys">${keyCaps(m.keys)}</div><div><b>${m.name}</b><span>${m.desc}</span></div></div>`).join('')}`).join('')}</div>
 <button class="primary" id="moves-back">BACK</button>`,true);
 document.querySelector('#tab-moves')!.addEventListener('click',()=>movesPanel('moves'));document.querySelector('#tab-controls')!.addEventListener('click',()=>movesPanel('controls'));
 document.querySelector('#moves-back')!.addEventListener('click',pauseAgain);}
function resume(){mode='playing';overlay.innerHTML='';keys.clear();focus();}
function confirmAction(message:string,callback:()=>void,cancel=title){mode='confirm';panel(`<div class="eyebrow">CONFIRM</div><h1>ARE YOU<br><span>SURE?</span></h1><p>${message}</p><button id="yes" class="primary">CONFIRM</button><button id="no">CANCEL</button>`);document.querySelector('#yes')!.addEventListener('click',callback);document.querySelector('#no')!.addEventListener('click',cancel);}
function results(){if(cleared)return;if(session==='campaign'&&run&&!latchBlock(run))return;cleared=true;mode='results';keys.clear();const bonus=block.kind==='district'?perfectBonus(buildings):0;score+=bonus;const blockScore=Math.round(cityScore()-(session==='freeplay'?freeBlockStart:run?.blockStart||0));panel(`<div class="eyebrow">${CITIES[cityIndex].name.toUpperCase()} · BLOCK ${blockIndex+1}</div><h1>BLOCK<br><span>CLEARED.</span></h1><p>${block.kind==='stronghold'?'CENTRAL CRYSTAL SHATTERED':`DESTRUCTION ${Math.round(destruction(buildings)*100)}%`}<br>BLOCK SCORE ${blockScore.toLocaleString()}<br>${session==='campaign'?'CAMPAIGN':'SESSION'} SCORE ${netScore().toLocaleString()}${bonus?`<br>PERFECT DESTRUCTION +${bonus}`:''}</p><button id="advance" class="primary">${session==='drill'?'PLAY AGAIN →':'NEXT BLOCK →'}</button><button id="back">MAIN MENU</button>`);
 document.querySelector('#advance')!.addEventListener('click',()=>{if(session==='campaign'&&run){if(nextBlock(run,cityScore())){blockIndex=run.block;loadBlock();}}else if(session==='freeplay'){freeBlockStart=cityScore();blockIndex++;loadBlock();}else start();});document.querySelector('#back')!.addEventListener('click',()=>{if(session==='campaign')confirmAction('Quit this city? Continue resumes at Block 1 and current city progress is lost.',title,resultsAgain);else title();});
}
function resultsAgain(){cleared=false;if(run)run.phase='playing';resultsNoBonus();}
function resultsNoBonus(){// Reopen the interstitial without awarding its bonus again.
 const already=block.kind==='district'?perfectBonus(buildings):0;score-=already;results();
}
function winCity(){if(session==='freeplay'){finishFreePlay();return;}if(!run||!rival?.dead||cleared)return;cleared=true;keys.clear();const subtotal=cityScore(),newUnlock=!permanent.unlocked.includes(CITIES[cityIndex].boss);if(!conquerCity(permanent,run,subtotal,CITIES[cityIndex].boss))return;citySettled=true;persist();
 if(run.phase==='over')writeCheckpoint(null);else{const next={...run};advanceCity(next);writeCheckpoint(checkpointOf(next));}
 mode='conquered';panel(`<div class="eyebrow">${CITIES[cityIndex].name.toUpperCase()}</div><h1>${run.phase==='over'?'CAMPAIGN':'CITY'}<br><span>${run.phase==='over'?'COMPLETE.':'CONQUERED.'}</span></h1><p>RIVAL ${bossName().toUpperCase()} DEFEATED<br>CITY SCORE ${Math.round(subtotal).toLocaleString()}<br>TOTAL SCORE ${Math.round(run.banked).toLocaleString()}${newUnlock?`<br>${bossName().toUpperCase()} UNLOCK RECORDED`:''}</p><button id="city-next" class="primary">${run.phase==='over'?'VIEW ENDING →':'CAMPAIGN ROUTE →'}</button><button id="back">MAIN MENU</button><p class="note">Shared rival moveset pending Phase 5.${run.phase==='over'?'<br>Ending and gallery slot unlocked.':''}</p>`);
 document.querySelector('#city-next')!.addEventListener('click',()=>{if(!run)return;if(run.phase==='over')endingScreen(run.kaiju,'completion');else if(advanceCity(run))progressScreen();});document.querySelector('#back')!.addEventListener('click',title);
}
function endIfDead(){if(rival?.dead){winCity();return true;}if(!combat.dead)return false;mode='gameover';keys.clear();cancelCharge(combat);if(session==='campaign'&&run&&loseRun(permanent,run,cityScore())){persist();writeCheckpoint(null);}panel(`<div class="eyebrow">${activeKaiju.toUpperCase()} DEFEATED</div><h1>GAME OVER</h1><p>SCORE ${netScore().toLocaleString()}<br>CITIES CONQUERED ${session==='campaign'?cityIndex:0} / 5<br>${session==='campaign'?'This campaign is over. Score recorded locally.':session==='freeplay'?'Free Play is not leaderboard eligible.':'Drill score is not leaderboard eligible.'}</p><button id="back" class="primary">MAIN MENU</button>${session!=='campaign'?`<button id="retry">${session==='freeplay'?'RETRY CITY':'RETRY DRILL'}</button>`:''}`);document.querySelector('#back')!.addEventListener('click',title);if(session!=='campaign')document.querySelector('#retry')!.addEventListener('click',()=>session==='freeplay'?startFreePlay():start());return true;}
function burst(x:number,y:number,color:string,count=10){for(let n=0;n<count&&particles.length<C.particleCap;n++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*160,life:.4+Math.random()*.5,color,size:2+Math.floor(Math.random()*4)});}
function dropShards(x:number,count:number){
 for(let n=0;n<count&&shards.length<B.shardCap;n++)shards.push({x:x+(n%5-2)*8,y:groundAt(x+(n%5-2)*8)-30,vx:(n%5-2)*28,vy:-120-(n%3)*25,life:B.shardLifetime});
}
// dir: direction of the blow (away from the attacker); at: world point struck, for the hole and debris.
// `quiet`: a rapid damage tick (the Flame Jet), so no hole, hitstop or shake per tick unless it brings the building down.
function hit(b:typeof buildings[number],damage:number,fromUltimate=false,dir=player.face,at?:{x:number,y:number},quiet=false){
 if(style()==='tyo'&&b.h>=TW.quakeHeight&&!quiet&&!fromUltimate&&b.kind!=='tiny'){b.sway=TW.swaySeconds;if(damage<TW.quakeBreak)damage*=TW.quakeKeep;}
 const r=damageBuilding(b,damage*vuln(b));if(!r.damage)return;releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);award(r.points);heatUp(r.damage*Y.gainPerDamage);if(r.destroyed&&fromUltimate)ultKill.add(b);creditDamage(combat,r.damage,'player',fromUltimate);if(r.destroyed)dropShards(b.x+b.w/2,B.buildingShards);if(!quiet||r.destroyed)burst(b.x+b.w/2,groundAt(b.x+b.w/2)-Math.min(b.h,60),'#e8d8ab',r.destroyed?23:7);if(!quiet||r.destroyed)shake=r.destroyed?5:2;if(r.destroyed||!quiet||!fromUltimate){action=r.destroyed?'STRUCTURE COLLAPSED':quiet?(isBelial()?'ACID':'FLAME JET'):`IMPACT −${Math.round(r.damage)}`;actionTime=1.2;}
 // Fully corroded, it gives way well before its HP runs out.
 if(!r.destroyed&&b.hpNow>0&&b.hpNow<=b.hp*B.corrodeBreak&&(corr.get(b)?.stacks??0)>=B.corrodeMax){corr.delete(b);hit(b,b.hpNow,fromUltimate,dir,at);action='DISSOLVED';actionTime=1.4;return;}
 if(quiet&&!r.destroyed){b.jolt=F.joltSeconds*.5;b.joltDir=dir;return;}
 impactFeel(b,r.damage,r.destroyed,fromUltimate,dir,at);
 if(!r.destroyed&&!tryShear(b,r.damage,at,fromUltimate,dir))floorWear(b,r.damage,at,fromUltimate,dir);
 if(r.destroyed)exploreReward(b,fromUltimate);}
function rand(){return Math.random();}
// Building debris in the city's material: brick, stucco, heavy limestone blocks, glass that glints, steel and glass.
function spawnDebris(x:number,y:number,dir:number,count:number,spread=1){const mt=CITIES[cityIndex].material;
 for(let n=0;n<count&&chunks.length<F.chunkCap;n++)chunks.push({x:x+(rand()-.5)*14*spread,y:y+(rand()-.5)*10*spread,vx:dir*(50+rand()*170)*spread+(rand()-.5)*60,vy:-(110+rand()*230),s:Math.max(2,Math.round((3+Math.floor(rand()*7))*mt.slab*(mt.glass?.6:1))),color:mt.debris[n%mt.debris.length],life:F.chunkLife,bounces:0});
 if(mt.glass)for(let n=0;n<count*2&&particles.length<C.particleCap;n++)particles.push({x:x+(rand()-.5)*20,y:y+(rand()-.5)*20,vx:dir*(80+rand()*240),vy:-(60+rand()*220),life:.35+rand()*.3,color:rand()<.5?'#e8f8ff':'#9fd8ee',size:2});}
// Every hit also wears the floor it lands on (no impact point: low on the facade, where a street fighter hits). A floor that gives
// out pancakes the ones above it down onto the street, or, at the top, gets knocked off along with anything on the roof.
function floorWear(b:typeof buildings[number],damage:number,at:{x:number,y:number}|undefined,ult:boolean,dir:number){
 if(!b.floors.length)return;const height=at?b.base-at.y:b.h*.25,i=floorAt(b,height),fh=floorHeightOf(b),band=b.base-(i+.5)*fh,cx=b.x+b.w/2,top=i===b.floors.length-1;
 const p=top?roofOf.get(b):undefined,f=wearFloor(b,damage,height);if(!f)return;b.jolt=F.joltSeconds;b.joltDir=dir;
 for(let x=b.x;x<b.x+b.w;x+=14)burst(x,band,'#d8cfb2',2);spawnDebris(cx,band,dir,6,1.4);
 if(f==='top'){spawnSlabs(cx,band,dir,b.color,3,ult,1.2);if(p&&!p.dead)breakRoof(p,ult);award(FL.topPoints);heatUp(FL.topHeat);shake=Math.max(shake,4);action='TOP FLOOR KNOCKED OFF';actionTime=1;return;}
 // Pancake: the floors above drop one storey and slam down; dust blows out at the foot and whatever is crowded round it is crushed.
 spawnSlabs(cx,band,dir,b.color,4,ult,1.6);for(let x=b.x-20;x<b.x+b.w+20;x+=12)burst(x,b.base-6,'#cfc6a8',2);
 const zone={x:b.x-34,y:b.base-60,w:b.w+68,h:60};
 for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(zone,u))hitUnit(military,u,FL.pancakeDamage,'player',FL.pancakeKnockback,Math.sign(u.x+u.w/2-cx)||dir,ult,ult?'ultimate':'crush');
 for(const v of vehicles)if(loose(v)&&v.pole===undefined&&overlaps(zone,vehicleBox(v)))puntVehicle(v,FL.pancakeDamage,Math.sign(v.x+v.w/2-cx)||dir,ult,.8);
 award(FL.pancakePoints);heatUp(FL.pancakeHeat);shake=Math.max(shake,7);if(!ult)freeze(F.hitstopCollapse);action='FLOOR COLLAPSED';actionTime=1.2;}
// Falling slabs that hurt the first ground unit or vehicle they land on.
function spawnSlabs(x:number,y:number,dir:number,color:string,count:number,ult=false,spread=1){
 for(let n=0;n<count&&chunks.length<F.chunkCap;n++)chunks.push({x:x+(rand()-.5)*30*spread,y:y+(rand()-.5)*20,vx:dir*(30+rand()*150)*spread+(rand()-.5)*80,vy:-(40+rand()*140),s:10+Math.floor(rand()*7),color:n%2?'#4a5658':color,life:F.chunkLife*1.2,bounces:0,hurt:Y.slabDamage,ult});}
function spawnChunks(x:number,y:number,dir:number,color:string,count:number,spread=1){
 for(let n=0;n<count&&chunks.length<F.chunkCap;n++)chunks.push({x:x+(rand()-.5)*14*spread,y:y+(rand()-.5)*10*spread,vx:dir*(50+rand()*170)*spread+(rand()-.5)*60,vy:-(110+rand()*230),s:3+Math.floor(rand()*7),color:n%3===0?'#3b4a4c':color,life:F.chunkLife,bounces:0});
}
// Per-hit feedback: jolt + flash, a hole where it landed, chunks, hitstop; on destruction tall buildings topple, short ones squash.
function impactFeel(b:typeof buildings[number],damage:number,destroyed:boolean,fromUltimate:boolean,dir:number,at?:{x:number,y:number}){
 if(!damage)return;
 b.jolt=F.joltSeconds;b.joltDir=dir;
 // Holes sit a little into the wall from the struck face (jittered so repeats don't stack) and stay inside the facade.
 const r=Math.min(F.holeMax,F.holeMin+damage/F.holeDamage,b.w*.3,b.h*.3),inset=F.holeInset+(b.holes.length*11)%18;
 const raw=at?(at.x-b.x<b.w/2?at.x-b.x+inset:at.x-b.x-inset):b.w/2,hx=Math.max(r+2,Math.min(b.w-9-r,raw)),hy=Math.max(r+4,Math.min(b.h-r-6,at?b.base-at.y+((b.holes.length*7)%13-6):b.h*.4));
 if(b.kind!=='tiny'&&!destroyed){if(b.holes.length>=F.holeCap)b.holes.shift();b.holes.push({x:hx,y:hy,r,seed:b.holes.length*13+Math.round(hx*3+hy)});}
 spawnDebris(b.x+hx,groundAt(b.x+hx)-hy,dir,destroyed?4:Math.min(7,2+Math.round(damage/35)));
 if(!fromUltimate)freeze(Math.min(F.hitstopMax,F.hitstopBase+damage*F.hitstopPerDamage));
 if(!destroyed)return;
 if(!fromUltimate)freeze(F.hitstopCollapse);
 // Towers creak first (still solid, shuddering, shedding slabs), then fall (update starts the topple when the creak runs out).
 // Ultimate destruction skips the creak and goes straight over.
 if(canTopple(b)){b.tiltDir=dir;b.collapse=0;b.toppleUlt=fromUltimate;b.toppleGen=crushGen+1;if(fromUltimate){b.topple=1;b.tilt=0;b.tiltV=F.toppleKick;}else b.creak=crushGen>=0?Y.creakChain:Y.creakSeconds;}
 else{spawnDebris(b.x+b.w/2,b.base-b.h*.6,dir,10,1.4);spawnSlabs(b.x+b.w/2,b.base-b.h*.8,dir,b.color,Math.ceil(Y.slabCount*.6),fromUltimate);}
}
// A falling building lands: crush every structure, ground unit and car under its span; chains if that topples them too.
function landTopple(b:typeof buildings[number]){
 const hk=style()==='hkg',dm=(i:number,g:number)=>hk?(TW.dominoFalloff/F.toppleFalloff)**i*(TW.dominoChain/F.toppleChain)**g:1;
 const [from,to]=toppleSpan(b),damage=crushDamage(b.h,0,b.toppleGen,dm(0,b.toppleGen)),ult=b.toppleUlt,pivot=b.tiltDir>0?b.x+b.w:b.x;let crushed=0;
 // Nearest building takes the brunt; energy falls off along the path. crushGen tags anything this knocks over as the next generation.
 const victims=buildings.filter(t=>t!==b&&t.hpNow>0&&t.x<to&&t.x+t.w>from).sort((p,q)=>Math.abs(p.x+p.w/2-pivot)-Math.abs(q.x+q.w/2-pivot));
 crushGen=b.toppleGen;victims.forEach((t,i)=>{hit(t,crushDamage(b.h,i,b.toppleGen,dm(i,b.toppleGen)),ult,b.tiltDir,{x:b.tiltDir>0?t.x+8:t.x+t.w-8,y:groundAt(b.tiltDir>0?t.x+8:t.x+t.w-8)-Math.min(t.h-10,b.w*.7)});crushed++;});crushGen=-1;
 for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&u.x<to&&u.x+u.w>from)hitUnit(military,u,damage*F.toppleUnitFactor,'player',260,b.tiltDir,ult,'crush');
 for(const v of vehicles)if(grounded(v)&&v.state!=='flat'&&v.x<to&&v.x+v.w>from)flattenVehicle(v,true,ult);
 for(let x=from;x<to;x+=26)spawnDebris(x,groundAt(x)-12,b.tiltDir,2,.6);
  for(const sp of spans)if(sp.alive&&sp.x0<to&&sp.x1>from)hitSpan(sp,damage*R.toppleMult,ult,Math.max(sp.x0,Math.min(sp.x1,(from+to)/2)));
 if(b.h>=400)caveIn((from+to)/2,R.pitMin,ult);
 heapRubble(b,from,to);sinkAround((from+to)/2,ult);
 spawnSlabs((from+to)/2,groundAt((from+to)/2)-30,b.tiltDir,b.color,Y.slabCount,ult,2);heatUp(Y.toppleHeat*(1+crushed));
 for(let x=from;x<to;x+=40)burst(x,groundAt(x)-10,'#c9c1a3',3);
 shake=Math.max(shake,12);if(!ult)freeze(F.hitstopTopple);
 action=crushed?`TOPPLED · CRUSHED ${crushed}`:'TOPPLED';actionTime=1.6;
}
// Landmarks and hidden caches pay score and Ultimate charge, never crystals, so exploring does not speed evolution.
function exploreReward(b:typeof buildings[number],fromUltimate:boolean){if(!b.landmark&&!b.cache)return;
 const charge=fromUltimate||combat.ultimateTime>0?0:b.landmark?X.landmarkUltimate:X.cacheUltimate;combat.ultimate=Math.min(B.ultimateMax,combat.ultimate+charge);
 if(b.cache){award(X.cachePoints);burst(b.x+b.w/2,groundAt(b.x+b.w/2)-40,'#f6a8d6',26);action=`CRYSTAL CACHE +${X.cachePoints}`;}
 else{burst(b.x+b.w/2,groundAt(b.x+b.w/2)-80,'#f1dc96',34);shake=9;action=`LANDMARK TOPPLED · ${b.label}`;}actionTime=2;}
// ---- City systems ----
// Substations, depots and rooftop fixtures react once when their building goes down, however it went down (polled in update).
function cityEffects(b:typeof buildings[number]){if(fired.has(b))return;fired.add(b);const ult=ultKill.has(b),dir=b.joltDir||player.face;
 if(b.role==='substation')blackout(b,ult);else if(b.role==='depot')explodeDepot(b,ult,dir);
 else if(b.role==='armory'){const west=b.x+b.w/2<worldWidth/2;military.cutOff[west?'1':'-1']=R.armorySeconds;award(R.armoryPoints);heatUp(R.armoryHeat);
  banner={label:`${west?'WEST':'EAST'} REINFORCEMENTS CUT OFF · ${R.armorySeconds}s`,side:0,life:2.6};action='ARMORY DESTROYED';actionTime=2;}
 const p=roofOf.get(b);if(p&&!p.dead)breakRoof(p,ult);}
function blackout(b:typeof buildings[number],ult:boolean){const g=gridOf(b.x+b.w/2,block.grids),cx=b.x+b.w/2,cy=b.base-b.h*.6;
 if(!ult)award(Y.blackoutPoints);heatUp(Y.blackoutHeat);
 for(let n=0;n<4;n++)sparks(cx+(rand()-.5)*b.w,cy-rand()*30,n%2?1:-1,8,'#bfe8ff');burst(cx,cy,'#e8f6ff',30);fireball(cx,cy,40,false);
 shake=Math.max(shake,9);if(!ult)freeze(.12);const side=(block.grids?.length??0)===2?(g===0?'WEST ':'EAST '):'';
 banner={label:`BLACKOUT · ${side}GRID DOWN`,side:0,life:2.6};action='SUBSTATION DESTROYED · RADAR AND RADIOS DEAD';actionTime=2.4;}
function explodeDepot(b:typeof buildings[number],ult:boolean,dir:number){const cx=b.x+b.w/2,cy=b.base-b.h*.5,r=Y.depotRadius,dmg=Y.depotDamage,zone={x:cx-r,y:cy-r,w:r*2,h:r*2};
 blast(military,cx,cy,r,dmg,'player',ult);
 for(const t of buildings)if(t!==b&&t.hpNow>0&&overlaps(zone,{x:t.x,y:t.base-t.h,w:t.w,h:t.h}))hit(t,dmg*Y.depotBuildingFactor,ult,Math.sign(t.x+t.w/2-cx)||dir,{x:t.x<cx?t.x+t.w-8:t.x+8,y:Math.max(t.base-t.h+10,cy)});
 for(const p of roofs)if(!p.dead&&overlaps(zone,roofBox(p)))hitRoof(p,dmg,ult);
 for(const sp of spans)if(sp.alive&&overlaps(zone,spanBox(sp)))hitSpan(sp,dmg,ult,cx);
 for(const t of trainsIn(zone))hitTrain(t,dmg,ult);
 for(const v of vehicles)if(loose(v)&&overlaps(zone,vehicleBox(v)))puntVehicle(v,dmg*.5,Math.sign(v.x+v.w/2-cx)||dir,ult,2.2);
 if(rival&&!rival.dead&&overlaps(zone,rival))strikeRival(dmg*.5,260,Math.sign(rival.x+rival.w/2-cx)||dir,ult);
 for(const g of growths)if(g.hp>0&&Math.abs(g.x-cx)<r)hitGrowth(g,dmg);
 for(const t of buildings)if(t.hpNow>0&&Math.abs(t.x+t.w/2-cx)<r+t.w/2)setAlight(t);
 pools.push({x:cx-Y.depotFire/2,w:Y.depotFire,life:Y.depotFireSeconds,max:Y.depotFireSeconds,damage:Y.depotFireDamage,hits:new Map(),fire:true,tick:.5,size:1.5,ult});
 sinkAround(cx,ult);fireball(cx,cy,r*.7,true);fireball(cx-r*.35,cy-20,r*.4,true);fireball(cx+r*.35,cy-30,r*.45,true);fireball(cx,cy-r*.5,r*.4,true);
 burst(cx,cy,'#ffcf73',40);burst(cx,cy,'#5e6460',24);spawnChunks(cx,cy,dir,'#c4bea6',12,2);spawnSlabs(cx,cy-30,dir,'#8a8470',Y.slabCount,ult,2.4);decal(cx-r*.6,r*1.2,'scorch');
 if(!ult){const e=echo;echo=false;freeze(.18);echo=e;}shake=Math.max(shake,16);kick(dir*8,-5);heatUp(Y.explodeHeat);
 banner={label:'FUEL DEPOT EXPLODED',side:0,life:2};action='FUEL DEPOT EXPLODED';actionTime=1.8;}
function hitRoof(p:RoofProp,damage:number,ult=false){if(p.dead||damage<=0)return;p.hp-=damage;const r=roofBox(p);sparks(r.x+r.w/2,r.y+r.h/2,player.face,4,p.kind==='radar'?'#fff0c9':'#cfe9f5');if(p.hp<=0)breakRoof(p,ult);}
function breakRoof(p:RoofProp,ult:boolean){if(p.dead)return;p.dead=true;p.call=0;const r=roofBox(p),cx=r.x+r.w/2;
 if(p.kind==='radar'){award(Y.radarPoints);if(!ult&&combat.ultimateTime<=0)combat.ultimate=Math.min(B.ultimateMax,combat.ultimate+Y.radarUltimate);heatUp(Y.radarHeat);
  fireball(cx,r.y+r.h/2,28,false);burst(cx,r.y,'#ffcf73',14);spawnChunks(cx,r.y,player.face,'#7d8d8a',6,1.2);action='AIR DEFENCE RADAR DOWN';actionTime=1.8;return;}
 award(Y.tankPoints);heatUp(Y.splashHeat);splashes.push({x:cx,top:r.y,t:0});spawnChunks(cx,r.y+r.h/2,player.face,'#8a5a3a',8,1.4);
 // The water hits the street and washes outward: troops are knocked flat and stunned, cars shoved, fires doused.
 const R=Y.splashRadius;
 for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&Math.abs(u.x+u.w/2-cx)<R){hitUnit(military,u,Y.splashDamage,'player',Y.splashKnockback,Math.sign(u.x+u.w/2-cx)||1,true,'blast');u.stun=Math.max(u.stun,Y.splashStun);}
 for(const v of vehicles)if(loose(v)&&v.pole===undefined&&Math.abs(v.x+v.w/2-cx)<R*.8)puntVehicle(v,15,Math.sign(v.x+v.w/2-cx)||1,ult,.5);
 for(const q of pools)if(q.fire&&q.x<cx+R*1.3&&q.x+q.w>cx-R*1.3)q.life=0;
 burns=burns.filter(f=>Math.abs(f.x-cx)>R*1.3);douse(cx,R*1.3);
 action='WATER TOWER BURST';actionTime=1.4;}
function tickCity(dt:number,w:number){
 const px=player.x+w/2;
 if(rampFlash>0)rampFlash=Math.max(0,rampFlash-dt);tickRampage(rampage,dt);
 power=gridPowered(subs);
 for(const b of buildings)if((b.role||b.roof)&&b.hpNow<=0)cityEffects(b);
 // Radars build a call while powered, standing, in view and within range of the kaiju, then mark an artillery strike on it.
 for(const p of roofs){if(p.dead||p.kind!=='radar')continue;const r=roofBox(p),cx=r.x+r.w/2,live=p.grid<0||power[p.grid];
  if(!live||r.x+r.w<camera||r.x>camera+viewW()||Math.abs(cx-px)>Y.radarRange){p.call=Math.max(0,p.call-dt*2);continue;}
  p.call+=dt;if(p.call>=Y.radarCall){p.call=0;callStrike(military,{face:px>cx?1:-1,id:-1} as Unit,px);}}
 // Spotter radios have no signal inside a dark grid.
 for(const u of military.units)if(u.spotter&&u.hp>0&&!powered(u.x+u.w/2))u.call=0;
 // A pole knocked out of upright on a live grid drops its wire across the street.
 poles.forEach((v,i)=>{if(v.snapped||upright(v))return;v.snapped=true;const g=v.pole??-1;
  if(g>=0&&!power[g])return;const [a,z]=wireSpan(poleXs,i);wires.push({from:a,to:z,t:Y.wireSeconds,grid:g,tick:0,pole:i});heatUp(Y.wireHeat);action='LIVE WIRE';actionTime=1.1;sparks(poleXs[i],groundAt(poleXs[i])-20,player.face,10,'#bfe8ff');});
 for(const l of wires){if(l.grid>=0&&!power[l.grid])l.t=0;l.t-=dt;l.tick-=dt;if(l.t<=0||l.tick>0)continue;l.tick=Y.wireTick;
  const zone={x:l.from,y:groundAt(l.from)-40,w:l.to-l.from,h:40};
  for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(zone,u)){hitUnit(military,u,Y.wireDamage,'player',30,Math.sign(u.x+u.w/2-(l.from+l.to)/2)||1,true,'blast');u.stun=Math.max(u.stun,Y.wireStun);sparks(u.x+u.w/2,u.y+u.h*.6,1,4,'#bfe8ff');}
  if(particles.length<C.particleCap)for(let n=0;n<3;n++){const x=l.from+rand()*(l.to-l.from);particles.push({x,y:groundAt(x)-4,vx:(rand()-.5)*120,vy:-(60+rand()*140),life:.25,color:rand()<.5?'#e8f6ff':'#8fd4ff',size:2});}}
 wires=wires.filter(l=>l.t>0);
 for(const sp of splashes){sp.t+=dt;if(sp.t<.9&&particles.length<C.particleCap)for(let n=0;n<4;n++){const fall=Math.min(1,sp.t/.3);particles.push({x:sp.x+(rand()-.5)*30,y:sp.top+(groundAt(sp.x)-sp.top)*fall*rand(),vx:(rand()-.5)*260,vy:-(rand()*160),life:.4,color:rand()<.5?'#a8d8ee':'#e2f4fb',size:2+Math.floor(rand()*2)});}}
 splashes=splashes.filter(sp=>sp.t<1.4);
 // Slabs hurt the first ground unit or vehicle they come down on while falling. Slabs, splashes and live wires are area damage
 // ('blast'): no hitstop per zap. Live wires and splashes are city hazards: they pay points but never charge the Ultimate.
 for(const c of chunks){if(!c.hurt)continue;if(c.bounces>0){c.hurt=0;continue;}if(c.vy<60)continue;const box={x:c.x,y:c.y,w:c.s,h:c.s};
  const u=military.units.find(u=>u.hp>0&&!UNITS[u.type].air&&overlaps(box,u));if(u){hitUnit(military,u,c.hurt,'player',140,Math.sign(c.vx)||1,!!c.ult,c.ult?'ultimate':'blast');c.hurt=0;continue;}
  const v=vehicles.find(v=>loose(v)&&v.pole===undefined&&overlaps(box,vehicleBox(v)));if(v){puntVehicle(v,c.hurt*.6,Math.sign(c.vx)||1,!!c.ult,.7);c.hurt=0;}}
}
function hitGrowth(g:typeof growths[number],damage:number){if(g.hp<=0)return;g.hp=Math.max(0,g.hp-damage);burst(g.x,groundAt(g.x)-30,'#f291ca',8);if(g.hp===0){dropShards(g.x,B.growthShards);action='CRYSTAL GROWTH SHATTERED';actionTime=1.5;}}
function hitObjective(damage:number){if(!objective||objective.shattered)return;const shards=damageObjective(objective,damage,P.strongholdShards);burst(objective.x,groundAt(objective.x)-60,'#f4a1d0',8);if(shards){dropShards(objective.x,shards);shake=9;action='STRONGHOLD CRYSTAL SHATTERED';actionTime=2;}}
function strikeRival(damage:number,strength=0,direction=1,ultimate=false){if(!rival||combat.dead)return;const actual=hitRival(rival,damage*vuln(rival),'player',strength,direction);if(actual){score+=actual*P.bossDamagePoints;creditDamage(combat,actual,'player',ultimate);burst(rival.x+rival.w/2,rival.y+40,'#f3a9d0',8);} }
function startJet(){const bel=isBelial(),up=bel?B.vomitUp:B.jetUp,down=bel?B.vomitDown:B.jetDown;
 if(jet||jetLocked||jetFuel<(bel?B.vomitMinStart:B.jetMinStart))return;running=false;player.crouched=false;spewState={pts:[],land:null,landOn:null};
 jet={phase:'start',t:0,on:0,angle:keys.has('KeyW')?up*.4:keys.has('KeyS')?-down*.4:bel?B.vomitRest:0,hits:new Map(),ox:0,oy:0,dx:1,dy:0,len:0,stop:false,bend:Infinity,bx:0,face:1};}
function jetDuration(anim:string){return animDuration(activeKaiju,anim,combat.stage)||.15;}
function jetPose(j:Jet):[string,number]{const [S,A,E]=isBelial()?['vomitStart','vomitAim','vomitEnd']:['jetStart','jetAim','jetEnd'];
 if(j.phase==='start')return [S,j.t];if(j.phase==='end')return [E,j.t];
 return hasAnim(activeKaiju,A,combat.stage)?[A,aimTime(activeKaiju,A,j.angle,combat.stage)]:[S,99];}
function circleRect(cx:number,cy:number,r:number,b:{x:number,y:number,w:number,h:number}){const nx=Math.max(b.x,Math.min(cx,b.x+b.w)),ny=Math.max(b.y,Math.min(cy,b.y+b.h));return (cx-nx)**2+(cy-ny)**2<=r*r;}
// Wind-up, then breathe while L is held (at least jetMinBurst) and fuel lasts, then the wind-down. Being hit, leaving the ground, grabbing
// or the Ultimate snuffs it.
function tickJet(dt:number){const j=jet!,bel=isBelial();
 if(!canAct(combat)||!player.grounded||clingTo||held||combat.ultimateTime>0){jet=null;spewState.pts=[];return;}
 j.t+=dt;
 if(j.phase==='start'){if(j.t>=jetDuration(bel?'vomitStart':'jetStart')){j.phase='on';j.t=0;}return;}
 if(j.phase==='end'){if(j.t>=jetDuration(bel?'vomitEnd':'jetEnd'))jet=null;return;}
 j.on+=dt;jetFuel=Math.max(0,jetFuel-dt/(bel?B.vomitSeconds:B.jetSeconds));
 const up=bel?B.vomitUp:B.jetUp,down=bel?B.vomitDown:B.jetDown;
 const target=keys.has('KeyW')?up:keys.has('KeyS')?-down:bel?B.vomitRest:0,turn=(bel?B.vomitTurn:B.jetTurn)*dt;j.angle+=Math.max(-turn,Math.min(turn,target-j.angle));
 if(bel)spew(j,dt);else breathe(j);
 if(jetFuel<=0)jetLocked=true;
 if(jetFuel<=0||(!keys.has('KeyL')&&j.on>=(bel?B.vomitMinBurst:B.jetMinBurst))){j.phase='end';j.t=0;j.len=0;spewState.pts=[];spewState.land=null;spewState.landOn=null;
  combat.rangedCooldown=Math.max(combat.rangedCooldown,bel?B.vomitCooldown:B.jetCooldown);}}
// A point `d` along the flame: straight out of the jaws until it meets the street, then washing along the street, hugging it.
function jetPoint(j:Jet,d:number,r:number):[number,number]{return d<j.bend?[j.ox+j.dx*d,j.oy+j.dy*d]:[j.bx+j.face*(d-j.bend),groundAt(j.bx)-r*.45];}
const JET_WASH=.6;
// The cone: circles marched out from the jaws (mouth point from the strip), widening with distance. Where it meets the street it washes
// along it (the rest of its reach cut to JET_WASH), so aiming down sweeps fire across the road. It stops at the first building it
// touches (that building burns); everything else inside it takes a damage tick every jetTick.
function breathe(j:Jet){const s=scale(combat),g=Math.sqrt(s),w=bodyWidth(),h=bodyHeight(),[anim,t]=currentAnim();
 const m=holdPoint(activeKaiju,anim,t,combat.stage,'mouth')??[58,-26],a=j.angle*Math.PI/180,[w0,w1]=B.jetWidth,R=B.jetRange*g;
 j.ox=player.x+w/2+player.face*m[0]*s;j.oy=player.y+h+C.spriteDrop+m[1]*s;j.dx=player.face*Math.cos(a);j.dy=-Math.sin(a);j.face=player.face;
 j.bend=j.dy>0?Math.max(0,(groundAt(j.ox)-4-j.oy)/j.dy):Infinity;j.bx=j.ox+j.dx*j.bend;
 let max=R*Math.min(1,j.on/.15);if(max>j.bend)max=j.bend+(max-j.bend)*JET_WASH;
 const circles:number[][]=[];let len=max,wall:typeof buildings[number]|null=null;j.stop=false;
 for(let d=0;d<=max;d+=8){const r=(w0+(w1-w0)*Math.min(1,d/R))*g,[x,y]=jetPoint(j,d,r);
  circles.push([x,y,r]);wall=buildings.find(b=>solid(b)&&b.hpNow>0&&circleRect(x,y,r*.5,{x:b.x,y:b.base-b.h,w:b.w,h:b.h}))??null;
  if(wall){len=d;j.stop=true;break;}}
 // Point-blank against a wall the flame still shows as a short splash on it.
 j.len=j.stop?Math.max(len,12*g):len;
 const dmg=B.jetDamage*damageMultiplier(combat),kb=B.jetKnockback*(combat.superTime>0?B.superKnockback:1),dir=player.face;
 const inCone=(r:{x:number,y:number,w:number,h:number})=>circles.some(([x,y,rr])=>circleRect(x,y,rr,r));
 const tick=(o:object,f:()=>void)=>{if(time-(j.hits.get(o)??-9)<B.jetTick)return;j.hits.set(o,time);f();};
 if(wall){const b=wall,end=circles[circles.length-1];tick(b,()=>hit(b,dmg,false,dir,{x:end[0],y:end[1]},true));if(b.hpNow>0)ignite(b,b.base-end[1]);}
 if(j.bend<j.len)scorchStreet(j);
 if(objective&&!objective.shattered&&inCone({x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100}))tick(objective,()=>hitObjective(dmg));
 if(rival&&!rival.dead&&inCone(rival))tick(rival,()=>strikeRival(dmg,kb,dir));
 for(const gr of growths)if(gr.hp>0&&inCone({x:gr.x-20,y:groundAt(gr.x)-55,w:40,h:55}))tick(gr,()=>hitGrowth(gr,dmg));
 for(const u of military.units)if(u.hp>0&&inCone(u))tick(u,()=>hitUnit(military,u,UNITS[u.type].air?dmg*B.jetAirMult:dmg,'player',kb,dir,false,'ranged'));
 for(const p of military.projectiles)if(!p.dead&&WEAPONS[p.weapon].interceptable&&inCone({x:p.x-8,y:p.y-8,w:16,h:16}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&!(v.calm>0)&&inCone(vehicleBox(v)))tick(v,()=>puntVehicle(v,dmg*B.jetCarPush,dir));
 // Embers off the flame and a splash where it hits a wall or the street.
 const [tx,ty]=jetPoint(j,j.len,w1*g);
 for(let n=0;n<(j.stop||j.bend<j.len?3:1)&&particles.length<C.particleCap;n++)particles.push({x:tx+(Math.random()-.5)*12*g,y:ty+(Math.random()-.5)*10*g,vx:-j.dx*(30+Math.random()*90)+(Math.random()-.5)*80,vy:-(40+Math.random()*120)*g,life:.25+Math.random()*.35,color:['#ffd34d','#ff8a1f','#e8401a','#4a3a3a'][Math.floor(Math.random()*4)],size:2+Math.floor(Math.random()*3)});}
// Acid Vomit: the stream is traced as a ballistic arc out of the jaws (mouth point from the strip) at a launch speed set by the gland's
// pressure, so it lands nearer as the gland drains. The front grows out over the first moments of a spew. It passes through troops and
// aircraft (each takes a tick and gets corroded) and stops on the first building it meets (wall or roof: that building takes the tick
// and corrodes) or the street, where it splashes everything near the landing and leaves an acid puddle.
function spew(j:Jet,dt:number){const s=scale(combat),g=Math.sqrt(s),w=bodyWidth(),h=bodyHeight(),[anim,t]=currentAnim();
 const m=holdPoint(activeKaiju,anim,t,combat.stage,'mouth')??[58,-26],a=j.angle*Math.PI/180,[v0,v1]=B.vomitSpeed,v=(v0+(v1-v0)*jetFuel)*g,G=B.vomitGravity*g;
 j.ox=player.x+w/2+player.face*m[0]*s;j.oy=player.y+h+C.spriteDrop+m[1]*s;j.face=player.face;
 const vx=player.face*v*Math.cos(a),vy0=-v*Math.sin(a),flight=Math.min(4,j.on*2.2+.08),step=1/90,pts:number[][]=[[j.ox,j.oy]];
 const dmg=B.vomitDamage*damageMultiplier(combat),dir=player.face,through:object[]=[];
 const tick=(o:object,f:()=>void)=>{if(time-(j.hits.get(o)??-9)<B.vomitTick)return;j.hits.set(o,time);f();};
 let land:number[]|null=null,landOn:Spew['landOn']=null,wall:typeof buildings[number]|null=null;
 for(let tt=step;tt<=flight;tt+=step){const x=j.ox+vx*tt,y=j.oy+vy0*tt+.5*G*tt*tt;
  if(x<0||x>worldWidth)break;
  if(y>=groundAt(x)-2){land=[x,groundAt(x)];landOn='street';pts.push([x,groundAt(x)-2]);break;}
  wall=buildings.find(b=>solid(b)&&b.hpNow>0&&x>=b.x&&x<=b.x+b.w&&y>=b.base-b.h)??null;
  if(wall){land=[x,y];landOn=y<=wall.base-wall.h+6?'roof':'building';pts.push([x,y]);break;}
  pts.push([x,y]);
  const p={x:x-5*g,y:y-5*g,w:10*g,h:10*g};
  for(const u of military.units)if(u.hp>0&&!through.includes(u)&&overlaps(p,u))through.push(u);
  if(rival&&!rival.dead&&!through.includes(rival)&&overlaps(p,rival))through.push(rival);
  for(const pr of military.projectiles)if(!pr.dead&&WEAPONS[pr.weapon].interceptable&&overlaps(p,{x:pr.x-8,y:pr.y-8,w:16,h:16}))intercept(military,pr);}
 j.len=pts.length;spewState={pts,land,landOn};
 for(const o of through){if(o===rival){corrode(o,dt);tick(o,()=>strikeRival(dmg,20,dir));continue;}
  const u=o as Unit;corrode(u,dt);tick(u,()=>hitUnit(military,u,UNITS[u.type].air?dmg*B.vomitAirMult:dmg,'player',20,dir,false,'ranged'));}
 if(wall&&land){const b=wall,at={x:land[0],y:land[1]};corrode(b,dt);tick(b,()=>hit(b,dmg,false,dir,at,true));}
 if(landOn==='street'&&land){const r=B.vomitSplash*g,zone={x:land[0]-r,y:groundAt(land[0]-r)-r,w:r*2,h:r+2};
  for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&!through.includes(u)&&overlaps(zone,u)){corrode(u,dt);tick(u,()=>hitUnit(military,u,dmg,'player',20,dir,false,'ranged'));}
  for(const v of vehicles)if(loose(v)&&!(v.calm>0)&&overlaps(zone,vehicleBox(v)))tick(v,()=>puntVehicle(v,dmg*.3,dir));
  for(const b of buildings)if(b.kind==='tiny'&&b.hpNow>0&&overlaps(zone,{x:b.x,y:b.base-b.h,w:b.w,h:b.h})){corrode(b,dt);tick(b,()=>hit(b,dmg,false,dir,undefined,true));}
  for(const gr of growths)if(gr.hp>0&&overlaps(zone,{x:gr.x-20,y:groundAt(gr.x)-55,w:40,h:55}))tick(gr,()=>hitGrowth(gr,dmg));
  if(objective&&!objective.shattered&&overlaps(zone,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100}))tick(objective,()=>hitObjective(dmg));
  if(rival&&!rival.dead&&!through.includes(rival)&&overlaps(zone,rival)){corrode(rival,dt);tick(rival,()=>strikeRival(dmg,20,dir));}
  acidPuddle(land[0]);}
 // Spatter where it lands.
 if(land)for(let n=0;n<2&&particles.length<C.particleCap;n++)particles.push({x:land[0]+(Math.random()-.5)*8*g,y:land[1]-2,vx:-dir*(20+Math.random()*70)+(Math.random()-.5)*60,vy:-(50+Math.random()*120)*g,life:.25+Math.random()*.3,color:['#c8f03a','#9ccc2a','#e6ff8a','#5f7f16'][Math.floor(Math.random()*4)],size:2+Math.floor(Math.random()*3)});}
// The patch of street under the landing becomes (or stays) an acid puddle; past the cap the most dried-up one goes.
// Deluge puddles (`ult`) are Ultimate damage and keep their own cap; a stream landing on one keeps it a Deluge puddle.
function acidPuddle(x0:number,ult=false){const g=Math.sqrt(scale(combat)),cell=Math.round(B.vomitPuddleCell*g),x=Math.floor(x0/cell)*cell,p=pools.find(p=>p.acid&&p.x===x);
 if(p){p.life=p.max;return;}
 pools.push({x,w:cell,life:B.vomitPuddleSeconds,max:B.vomitPuddleSeconds,damage:B.vomitPuddleDamage*damageMultiplier(combat),hits:new Map(),acid:true,tick:B.vomitPuddleTick,size:g,ult});
 const mine=pools.filter(p=>p.acid&&!!p.ult===ult);if(mine.length>(ult?B.delugePuddleCap:B.vomitPuddleCap))pools.splice(pools.indexOf(mine.sort((p,q)=>p.life-q.life)[0]),1);}
// Corrosion runs down on its own: corrodeDamage x stacks every corrodeTick until it wears off (each contact refreshes it). Units fizz.
function tickCorrosion(dt:number){for(const [o,c] of corr){c.t-=dt;
  const b=buildings.includes(o as typeof buildings[number])?o as typeof buildings[number]:null,u=b||o===rival?null:o as Unit;
  const dead=b?b.hpNow<=0||!!b.topple||b.lifted:o===rival?!rival||rival.dead:u!.hp<=0;
  if(c.t<=0||dead){corr.delete(o);continue;}
  if(time-c.tick>=B.corrodeTick){c.tick=time;const d=B.corrodeDamage*c.stacks*damageMultiplier(combat);
   if(b)hit(b,d,c.ult,player.face,undefined,true);else if(o===rival)strikeRival(d,0,1,c.ult);else hitUnitBase(military,u!,d,'player',0,1,c.ult,c.ult?'ultimate':'ranged');}
  if(particles.length<C.particleCap&&Math.random()<.12*c.stacks){const r=b?{x:b.x,y:b.base-b.h,w:b.w,h:b.h}:o===rival?rival!:u!;
   particles.push({x:r.x+Math.random()*r.w,y:r.y+Math.random()*r.h,vx:(Math.random()-.5)*16,vy:-(15+Math.random()*35),life:.35+Math.random()*.3,color:Math.random()<.5?'#c8f03a':'#7fa61e',size:2});}}}
// Fire patches along the stretch of street the flame is washing over: new cells catch, cells already burning are topped back up.
function scorchStreet(j:Jet){const g=Math.sqrt(scale(combat)),cell=Math.round(B.jetFireCell*g),a=j.bx,b=j.bx+j.face*(j.len-j.bend),dm=damageMultiplier(combat);
 for(let c=Math.floor(Math.min(a,b)/cell);c<=Math.floor(Math.max(a,b)/cell);c++){const x=c*cell,p=pools.find(p=>p.fire&&p.x===x);
  if(p){p.life=p.max;continue;}
  pools.push({x,w:cell,life:B.jetFireSeconds,max:B.jetFireSeconds,damage:B.jetFireDamage*dm,hits:new Map(),fire:true,tick:B.jetFireTick,size:g});
  const mine=pools.filter(p=>p.fire);if(mine.length>B.jetFireCap)pools.splice(pools.indexOf(mine.sort((p,q)=>p.life-q.life)[0]),1);}}
// Set the wall alight at the row the flame touches (or top that row back up), on the face toward him. Tilting the jet across a wall
// paints a track of fire up or down it, like the street. Oldest spots go out past jetWallCap, and past jetBurnCap burning buildings.
function ignite(b:typeof buildings[number],y:number){const g=Math.sqrt(scale(combat)),cell=B.jetWallCell*g,side=player.face,row=Math.max(cell/2,Math.min(b.h-cell/2,(Math.floor(y/cell)+.5)*cell));
 const x=side>0?b.x:b.x+b.w-7,o=burns.find(f=>f.b===b&&f.side===side&&Math.abs(f.y-row)<cell/2);
 if(o){o.t=B.jetBurnSeconds;return;}
 burns.push({b,x,y:row,t:B.jetBurnSeconds,size:g,side});
 const oldest=()=>burns.reduce((p,q)=>q.t<p.t?q:p);
 while(burns.length>B.jetWallCap)burns.splice(burns.indexOf(oldest()),1);
 while(new Set(burns.map(f=>f.b)).size>B.jetBurnCap){const b0=oldest().b;burns=burns.filter(f=>f.b!==b0);}}
// Afterburn: one slow tick per burning building (more spots don't stack damage), stopping at 1 HP (it softens a building, it never
// brings one down), and no spreading to neighbours.
function tickBurns(dt:number){for(const f of burns){f.t-=dt;const b=f.b;if(b.hpNow<=0||b.topple||b.lifted){f.t=0;continue;}
  if(time-(burnHits.get(b)??-9)>=B.jetBurnTick){burnHits.set(b,time);const d=Math.min(B.jetBurnDamage*damageMultiplier(combat),b.hpNow-1);if(d>0)hit(b,d,false,player.face,undefined,true);}
  if(particles.length<C.particleCap&&Math.random()<.25)particles.push({x:f.x+(Math.random()-.5)*14,y:f.b.base-f.y-Math.random()*8,vx:(Math.random()-.5)*20,vy:-(40+Math.random()*60),life:.3+Math.random()*.4,color:['#ffd34d','#ff8a1f','#e8401a','#4a3a3a'][Math.floor(Math.random()*4)],size:2+Math.floor(Math.random()*3)});}
 burns=burns.filter(f=>f.t>0);}
function launchTremor(){if(!tremor)return;const dir=tremor.dir;tremor=null;if(combat.dead)return;
 const w=bodyWidth(),grow=Math.sqrt(scale(combat)),x=player.x+w/2+dir*w*.42,life=B.tremorRange*grow/B.tremorSpeed;
 waves.push({x,vx:dir*B.tremorSpeed,life,max:life,damage:B.tremorDamage*damageMultiplier(combat),hits:new Set(),ult:false,size:B.tremorSize*grow,knockback:B.tremorKnockback*(combat.superTime>0?B.superKnockback:1)});
 shake=Math.max(shake,3+grow);burst(x,groundAt(x)-6,'#c9a77c',10);spawnChunks(x,groundAt(x)-10,dir,'#8d7a66',3);}
// Debris Shotgun: a fan from flat-and-fast to high-and-lobbed, flung from the tusks low in front of the body.
function launchDebris(){if(!debris)return;const dir=debris.dir;debris=null;if(combat.dead)return;
 const w=bodyWidth(),h=bodyHeight(),grow=Math.sqrt(scale(combat)),x=player.x+w/2+dir*w*.55,y=player.y+h*.6,[a0,a1]=B.debrisAngle,[s0,s1]=B.debrisSpeed,n=B.debrisCount;
 for(let i=0;i<n;i++){const t=n>1?i/(n-1):.5,a=(a0+(a1-a0)*t+(Math.random()-.5)*6)*Math.PI/180,speed=(s1-(s1-s0)*t)*grow*(.92+Math.random()*.16);
  rocks.push({x,y,vx:dir*Math.cos(a)*speed,vy:-Math.sin(a)*speed,life:B.debrisLife*grow,damage:B.debrisDamage*damageMultiplier(combat),knockback:B.debrisKnockback*(combat.superTime>0?B.superKnockback:1),spin:Math.random()*6,size:(6+Math.random()*4)*grow});}
 shake=Math.max(shake,3+grow);burst(x,groundAt(x)-6,'#c9a77c',12);spawnChunks(x,groundAt(x)-10,dir,'#8d7a66',4);}
// Everything a player projectile can strike, nearest first along its travel direction. `y` is the impact height on buildings.
// The first thing a player projectile meets along its heading as it crosses (x1,y1)-(x2,y2) takes the hit: the candidate nearest the
// side it came from, in this order on ties (objective, rival, buildings, growths, units, enemy shots, vehicles). Returns whether it
// struck anything. Runs for every quill, rock and lava glob every frame, so it scans the live arrays instead of building a list.
const scratch={x:0,y:0,w:0,h:0};
function projectileStrike(x1:number,y1:number,x2:number,y2:number,damage:number,knockback:number,dir:number,y:number,ult=false,at?:{x:number,y:number}){
 let kind=0,ref:any=null,bx=0;
 const see=(r:{x:number,y:number,w:number,h:number},k:number,o:any)=>{if((!kind||(dir>0?r.x<bx:r.x>bx))&&segmentHits(x1,y1,x2,y2,r)){kind=k;ref=o;bx=r.x;}};
 const box=(x:number,y:number,w:number,h:number)=>{scratch.x=x;scratch.y=y;scratch.w=w;scratch.h=h;return scratch;};
 if(objective&&!objective.shattered)see(box(objective.x-30,groundAt(objective.x)-100,60,100),1,objective);
 if(rival&&!rival.dead)see(rival,2,rival);
 for(const b of buildings)if(b.hpNow>0)see(box(b.x,b.base-b.h,b.w,b.h),3,b);
 for(const g of growths)if(g.hp>0)see(box(g.x-20,groundAt(g.x)-55,40,55),4,g);
 for(const u of military.units)if(u.hp>0)see(u,5,u);
 for(const p of military.projectiles)if(!p.dead&&WEAPONS[p.weapon].interceptable)see(box(p.x-8,p.y-8,16,16),6,p);
 for(const v of vehicles)if(loose(v))see(vehicleBox(v),7,v);
 for(const p of roofs)if(!p.dead)see(roofBox(p),8,p);
 for(const sp of spans)if(sp.alive)see(spanBox(sp),9,sp);
 for(const t of trains)if(!t.crashed&&trainsIn(trainBox(t)).length)see(trainBox(t),10,t);
 if(kind===1)hitObjective(damage);else if(kind===2)strikeRival(damage,knockback,dir,ult);
 else if(kind===3)hit(ref,damage,ult,dir,at??{x:dir>0?ref.x+6:ref.x+ref.w-6,y});
 else if(kind===4)hitGrowth(ref,damage);else if(kind===5)hitUnit(military,ref,damage,'player',knockback,dir,ult,ult?'ultimate':'ranged');
 else if(kind===6)intercept(military,ref);else if(kind===7){if(!(ref.shield>0))puntVehicle(ref,damage*VC.shotPush,dir,ult);}
 else if(kind===8)hitRoof(ref,damage,ult);
 else if(kind===9)hitSpan(ref,damage,ult,x2);
 else if(kind===10)hitTrain(ref,damage,ult);
 return kind>0;}
// Pound (S+J): both fists down on whatever is under the feet. Standing on a roof it hits that building (and a neighbour you straddle);
// on the street it stomps troops, cars and newsstands at your feet. Combo multipliers still apply, so the third pound is the big one.
function pound(strike:Strike){
 const w=bodyWidth(),h=bodyHeight(),s=scale(combat),feet=player.y+h,cx=player.x+w/2,damage=strike.damage*MV.poundMult;
 attack={anim:hasAnim(activeKaiju,'pound',combat.stage)?'pound':hasAnim(activeKaiju,'ultPound',combat.stage)?'ultPound':'heavySlam',t:0};player.pose=.25;combat.cooldown=Math.max(combat.cooldown,MV.poundCooldown);
 const box={x:player.x-w*.15,y:feet-14*s,w:w*1.3,h:30*s},wide={x:box.x-18*s,y:feet-40*s,w:box.w+36*s,h:46*s};let struck=false;
 for(const b of buildings){if(b.hpNow<=0)continue;const r={x:b.x,y:b.base-b.h,w:b.w,h:b.h};if(!overlaps(box,r))continue;
  // Under the feet: the hole lands near the roof; a wall you are stood beside at street level takes it at the base.
  const onRoof=Math.abs(b.base-b.h-feet)<6,hx=Math.max(b.x+8,Math.min(b.x+b.w-8,cx));
  hit(b,damage*(onRoof?1:.6),false,player.face,{x:hx,y:onRoof?b.base-b.h+10:feet-8});struck=true;
  if(onRoof)spawnDebris(hx,b.base-b.h,0,3,1.2);}
 for(const u of military.units)if(u.hp>0&&overlaps(wide,u)){hitUnit(military,u,damage,'player',MV.poundKnockback,Math.sign(u.x+u.w/2-cx)||player.face,false,'crush');struck=true;}
 for(const v of vehicles)if(loose(v)&&overlaps(wide,vehicleBox(v)))flattenVehicle(v,true);
 for(const g of growths)if(g.hp>0&&overlaps(wide,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55}))hitGrowth(g,damage);
 for(const p of roofs)if(!p.dead&&overlaps(wide,roofBox(p)))hitRoof(p,damage);
 for(const sp of spans)if(sp.alive&&Math.abs(sp.y-feet)<6&&sp.x0<player.x+w&&sp.x1>player.x){hitSpan(sp,damage,false,cx);struck=true;}
 for(const t of trainsIn(wide)){hitTrain(t,damage);struck=true;}
 if(objective&&!objective.shattered&&overlaps(wide,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100}))hitObjective(damage);
 if(rival&&!rival.dead&&overlaps(wide,rival))strikeRival(damage,MV.poundKnockback,player.face);
 burst(cx,feet-2,'#c9a77c',strike.combo===3?14:7);shake=Math.max(shake,strike.combo===3?6:3);
 if(struck)freeze(Math.min(F.hitstopMax,F.hitstopBase+damage*F.hitstopPerDamage));
 action=`POUND ${strike.combo} / 3`;actionTime=.5;}
// Slam landing: the roof (or street) under the body takes the hit plus a radius around the feet, scaled by the drop.
// Returns true when the roof gave way, so the dive keeps falling into whatever is below.
function slamLand(){
 if(!dive)return false;const w=bodyWidth(),h=bodyHeight(),s=scale(combat),feet=player.y+h,cx=player.x+w/2,fall=Math.max(0,feet-dive.startY);
 const power=1+Math.min(MV.diveFallMax,fall/MV.diveFallBonus),damage=MV.diveDamage*damageMultiplier(combat)*power,radius=MV.diveRadius*s*(1+(power-1)*.4);
 const street=feet>=groundAt(cx)-1,kb=MV.diveKnockback*(combat.superTime>0?B.superKnockback:1),struck:object[]=[];let broke=false;
 for(const b of buildings){if(b.hpNow<=0)continue;
  const under=b.x<player.x+w&&b.x+b.w>player.x&&Math.abs(b.base-b.h-feet)<6,near=street&&b.x<cx+radius&&b.x+b.w>cx-radius;
  if(!under&&!near&&!(b.kind==='tiny'&&b.x<cx+radius&&b.x+b.w>cx-radius))continue;
  struck.push(b);hit(b,damage*(under?MV.diveRoofMult:.5),false,Math.sign(b.x+b.w/2-cx)||player.face,{x:Math.max(b.x+8,Math.min(b.x+b.w-8,cx)),y:under?b.base-b.h+10:b.base-20});
  if(under){spawnDebris(cx,b.base-b.h,0,6,1.6);if(b.hpNow<=0)broke=true;}}
 const zone={x:cx-radius,y:feet-radius,w:radius*2,h:radius+8};
 for(const u of military.units)if(u.hp>0&&overlaps(zone,u)){struck.push(u);hitUnit(military,u,damage,'player',kb,Math.sign(u.x+u.w/2-cx)||player.face,false,'crush');}
 for(const v of vehicles)if(loose(v)&&overlaps(zone,vehicleBox(v))){if(Math.abs(v.x+v.w/2-cx)<w*.4)flattenVehicle(v,true);else puntVehicle(v,damage*.5,Math.sign(v.x+v.w/2-cx)||player.face,false,1.8);}
 for(const g of growths)if(g.hp>0&&overlaps(zone,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55}))hitGrowth(g,damage);
 for(const p of roofs)if(!p.dead&&overlaps(zone,roofBox(p)))hitRoof(p,damage);
 // A slam on a bridge deck hits the span like a roof; on the street over a subway line it caves the street in.
 for(const sp of spans)if(sp.alive&&Math.abs(sp.y-feet)<6&&sp.x0<player.x+w&&sp.x1>player.x){hitSpan(sp,damage*MV.diveRoofMult,false,cx);broke=broke||!sp.alive;}
 for(const t of trainsIn(zone))hitTrain(t,damage*MV.diveRoofMult);
 if(street&&!deckAt(cx)&&caveIn(cx,Math.max(R.pitMin,w*1.1)))broke=true;
 if(street&&!broke)sinkAround(cx);
 if(objective&&!objective.shattered&&overlaps(zone,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100}))hitObjective(damage);
 if(rival&&!rival.dead&&overlaps(zone,rival)){struck.push(rival);strikeRival(damage,kb,Math.sign(rival.x+rival.w/2-cx)||player.face);}
 // On the street the impact rolls out as a short shockwave both ways.
 if(street){const grow=Math.sqrt(s),life=MV.diveWaveRange*grow*power/B.tremorSpeed;
  for(const dir of [-1,1])waves.push({x:cx+dir*w*.3,vx:dir*B.tremorSpeed,life,max:life,damage:damage*MV.diveWaveDamage,hits:new Set(),ult:false,size:MV.diveWaveSize*grow,knockback:B.tremorKnockback});}
 // Kaiban's Meteor Drop: the landing hurls a ring of rock chunks out both ways (Debris Shotgun rocks).
 if(activeKaiju==='Kaiban'){const n=MV.meteorRocks,grow=Math.sqrt(s),[a0,a1]=MV.meteorAngle,[v0,v1]=MV.meteorSpeed;
  for(let i=0;i<n;i++){const dir=i%2?1:-1,t=Math.floor(i/2)/Math.max(1,Math.floor(n/2)-1),a=(a0+(a1-a0)*t+(Math.random()-.5)*8)*Math.PI/180,sp=(v1-(v1-v0)*t)*grow*Math.min(1.6,power)*(.9+Math.random()*.2);
   rocks.push({x:cx+dir*w*.25,y:feet-6*s,vx:dir*Math.cos(a)*sp,vy:-Math.sin(a)*sp,life:B.debrisLife*grow*1.3,damage:MV.meteorDamage*damageMultiplier(combat)*power,knockback:B.debrisKnockback,spin:Math.random()*6,size:(6+Math.random()*5)*grow});}}
 // Tlézcatl's Magma Dive: the crash splashes molten globs both ways and, on the street, leaves a lava pool under him.
 if(activeKaiju==='Tlézcatl')splashLava(cx,feet,w*.3,power,MV.lavaGlobs,street?w*MV.lavaPoolWidth:0,14);
 // Belial's Acid Pounce: the impact bursts his gland. Everything the slam struck is soaked to pounceStacks of corrosion (one more on
 // a pounceFullPower drop), applied after the hit so the slam itself isn't boosted; on the street it leaves a row of acid puddles.
 if(isBelial())acidPounce(struck,cx,feet,w,power,street);
 burst(cx,feet-3,'#c9a77c',18+Math.round(power*6));spawnChunks(cx,feet-6,1,'#8d7a66',3);spawnChunks(cx,feet-6,-1,'#8d7a66',3);
 shake=Math.max(shake,6+power*4);freeze(.05+power*.02);
 // A form's own slamLand starts at impact; otherwise borrow heavySlam from its crash frames.
 attack=hasAnim(activeKaiju,'slamLand',combat.stage)?{anim:'slamLand',t:0}:{anim:hasAnim(activeKaiju,'heavySlam',combat.stage)?'heavySlam':'jumpLand',t:hasAnim(activeKaiju,'heavySlam',combat.stage)?animDuration(activeKaiju,'heavySlam',combat.stage)*.35:0};
 combat.cooldown=Math.max(combat.cooldown,MV.diveCooldown);action=broke?'SLAM · CRASHED THROUGH':(activeKaiju==='Kaiban'?'METEOR DROP':activeKaiju==='Tlézcatl'?'MAGMA DIVE':isBelial()?'ACID POUNCE':power>1.8?'MEGA SLAM':'SLAM');actionTime=.9;
 // A cannonball form keeps rolling if a direction was touched at any point in the dive (street or rooftop).
 const steer=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)||dive.dir;
 if(!broke&&steer&&canRoll()){roll={dir:steer,t:MV.rollSeconds,t0:dive.t0,power,bounced:false,hits:new Set()};player.face=steer;attack=null;action='CANNONBALL';actionTime=1;}
 return broke;}
function acidPounce(struck:object[],cx:number,feet:number,w:number,power:number,street:boolean){
 const st=Math.min(B.corrodeMax,MV.pounceStacks+(power>=MV.pounceFullPower?1:0));
 for(const o of struck){const d=o as {hpNow?:number,hp?:number};if((d.hpNow??1)<=0||(d.hp??1)<=0)continue;corrode(o,0);const c=corr.get(o)!;c.expo=Math.max(c.expo,st*B.corrodePerStack);c.stacks=Math.max(c.stacks,st);}
 if(street){const pw=w*MV.pouncePoolWidth*Math.min(1.5,power),cell=Math.round(B.vomitPuddleCell*Math.sqrt(scale(combat)));for(let x=cx-pw/2;x<cx+pw/2;x+=cell)acidPuddle(x);}
 burst(cx,feet-6,'#b8e63a',14+Math.round(power*5));}
// Tlézcatl's lava splash (Magma Dive landing, heavy slam): n molten globs out both ways from x0±spread at the feet, plus an
// optional pool of width poolW under the impact (street only) and a spray of molten sparks.
function splashLava(x0:number,feet:number,spread:number,power:number,n:number,poolW:number,sparks:number){
 const s=scale(combat),grow=Math.sqrt(s),[a0,a1]=MV.lavaAngle,[v0,v1]=MV.lavaSpeed,dm=damageMultiplier(combat);
 for(let i=0;i<n;i++){const dir=i%2?1:-1,t=Math.floor(i/2)/Math.max(1,Math.floor(n/2)-1),a=(a0+(a1-a0)*t+(Math.random()-.5)*10)*Math.PI/180,sp=(v1-(v1-v0)*t)*grow*Math.min(1.6,power)*(.85+Math.random()*.3);
  globs.push({x:x0+dir*spread,y:feet-8*s,vx:dir*Math.cos(a)*sp,vy:-Math.sin(a)*sp,life:2,damage:MV.lavaDamage*dm*power,size:(4+Math.random()*3)*grow});}
 if(poolW>0)addPool(x0,poolW,MV.lavaPoolDamage*dm*power);
 for(let k=0;k<sparks&&particles.length<C.particleCap;k++)particles.push({x:x0+(Math.random()-.5)*spread*2,y:feet-4,vx:(Math.random()-.5)*260,vy:-(80+Math.random()*220)*grow,life:.3+Math.random()*.4,color:['#ffd34d','#ff8a1f','#e8401a'][k%3],size:2+Math.floor(Math.random()*4)});}
// At most 12 Magma Dive pools at once; the Eruption's rain keeps its own 24 (oldest cool first). Flame Jet fires are capped separately.
function addPool(cx:number,w:number,damage:number,ult=false,life=MV.lavaPoolSeconds){pools.push({x:cx-w/2,w,life,max:life,damage,hits:new Map(),ult});
 const mine=pools.filter(p=>!p.fire&&!!p.ult===ult);if(mine.length>(ult?24:12))pools.splice(pools.indexOf(mine[0]),1);}
// Lava pools burn everything standing in them on the street (troops, cars, newsstands, growths, the rival, the objective).
function tickPools(dt:number){for(const p of pools){p.life-=dt;const zh=16*(p.size??1),zone={x:p.x,y:groundAt(p.x)-zh,w:p.w,h:zh+2},kb=p.fire||p.acid?8:20,every=p.tick??MV.lavaPoolTick;
  if(p.acid){for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(zone,u))corrode(u,dt,!!p.ult);if(rival&&!rival.dead&&overlaps(zone,rival))corrode(rival,dt,!!p.ult);}
  const tick=(o:object,f:()=>void)=>{if(time-(p.hits.get(o)??-9)<every)return;p.hits.set(o,time);f();};
  for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(zone,u))tick(u,()=>hitUnit(military,u,p.damage,'player',kb,Math.sign(u.x+u.w/2-(p.x+p.w/2))||1,p.ult,p.ult?'ultimate':'ranged'));
  for(const v of vehicles)if(loose(v)&&!(v.calm>0)&&overlaps(zone,vehicleBox(v)))tick(v,()=>puntVehicle(v,p.damage*.3,Math.sign(v.x+v.w/2-(p.x+p.w/2))||1,p.ult));
  for(const b of buildings)if(b.kind==='tiny'&&b.hpNow>0&&overlaps(zone,{x:b.x,y:b.base-b.h,w:b.w,h:b.h}))tick(b,()=>hit(b,p.damage,p.ult));
  for(const g of growths)if(g.hp>0&&overlaps(zone,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55}))tick(g,()=>hitGrowth(g,p.damage));
  if(objective&&!objective.shattered&&overlaps(zone,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100}))tick(objective,()=>hitObjective(p.damage));
  if(rival&&!rival.dead&&overlaps(zone,rival))tick(rival,()=>strikeRival(p.damage,kb,Math.sign(rival!.x+rival!.w/2-(p.x+p.w/2))||1,p.ult));
  if(particles.length<C.particleCap&&Math.random()<(p.fire?.35:p.acid?.2:.5)*p.life/p.max)particles.push({x:p.x+Math.random()*p.w,y:groundAt(p.x+Math.random()*p.w)-3,vx:(Math.random()-.5)*(p.acid?10:30),vy:-(p.acid?10+Math.random()*25:30+Math.random()*70),life:.25+Math.random()*.3,color:p.acid?(Math.random()<.5?'#c8f03a':'#e6ff8a'):Math.random()<.5?'#ffb13b':'#e8401a',size:2+Math.floor(Math.random()*2)});}
 pools=pools.filter(p=>p.life>0);}
function canRoll(){return spinFrom(activeKaiju,'dive',combat.stage)!=null;}
// Run + S: curl up on the spot and roll the way you are running (no slam, so base power).
function startRoll(){if(roll||dive||!player.grounded||clingTo||held||!canAct(combat)||combat.charging||!canRoll())return false;
 roll={dir:player.face,t:MV.rollSeconds,t0:time-(spinFrom(activeKaiju,'dive',combat.stage)??0),power:1,bounced:false,hits:new Set()};attack=null;
 burst(player.x+bodyWidth()/2,player.y+bodyHeight()-4,'#c9a77c',10);action='CANNONBALL';actionTime=1;return true;}
// The roll ends by bursting out of the ball: from the squash when it smacks a wall, else from the rebound frame.
function endRoll(squash:boolean){if(!roll)return;roll=null;
 if(hasAnim(activeKaiju,'slamLand',combat.stage))attack={anim:'slamLand',t:squash?0:animDuration(activeKaiju,'slamLand',combat.stage)*3/8};}
// Rolling: everything the ball runs over is hit once per roll; walls are handled in the movement step.
function tickRoll(w:number,h:number){if(!roll)return;
 const s=scale(combat),box={x:player.x-4*s,y:player.y,w:w+8*s,h},dmg=MV.rollDamage*damageMultiplier(combat)*roll.power,kb=MV.rollKnockback*(combat.superTime>0?B.superKnockback:1),r=roll,first=(o:object)=>!r.hits.has(o)&&(r.hits.add(o),true);
 for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(box,u)&&first(u))hitUnit(military,u,dmg,'player',kb,r.dir,false,'melee');
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v))&&first(v))puntVehicle(v,dmg,r.dir,false,1.5);
 for(const b of buildings)if(b.kind==='tiny'&&b.hpNow>0&&overlaps(box,{x:b.x,y:b.base-b.h,w:b.w,h:b.h})&&first(b))hit(b,b.hpNow,false,r.dir);
 for(const g of growths)if(g.hp>0&&overlaps(box,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55})&&first(g))hitGrowth(g,dmg);
 if(objective&&!objective.shattered&&overlaps(box,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100})&&first(objective))hitObjective(dmg);
 if(rival&&!rival.dead&&overlaps(box,rival)&&first(rival))strikeRival(dmg,kb,r.dir);
 if(player.grounded&&particles.length<C.particleCap&&Math.random()<.7)particles.push({x:player.x+w/2-r.dir*w*.35,y:player.y+h-3,vx:-r.dir*(60+Math.random()*120),vy:-(40+Math.random()*100),life:.3+Math.random()*.25,color:Math.random()<.5?'#c9a77c':'#a8957a',size:2+Math.floor(Math.random()*4)});}
function startDive(){if(dive||player.grounded||clingTo||held||!canAct(combat)||combat.charging)return false;
 // A dive out of a running leap already rolls the way you were going; touching A/D during the dive (re)latches it.
 dive={startY:player.y+bodyHeight(),t0:time,dir:airRun?player.face:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)};player.vy=Math.max(player.vy,MV.diveSpeed*Math.sqrt(scale(combat)));airRun=false;attack=null;action='DIVE';actionTime=.5;return true;}
// Mantle: up onto the roof of `b` from the wall, nudged a little inboard of the edge.
function mantle(b:NonNullable<typeof clingTo>,w:number,h:number){const roof=b.base-b.h;player.y=roof-h-.01;player.x=Math.max(b.x-w*.4,Math.min(b.x+b.w-w*.6,player.x+(player.x+w/2<b.x+b.w/2?w*.3:-w*.3)));player.vy=0;clingTo=null;mantled=true;}
function performStrike(strike:Strike|null){
 if(!strike||mode!=='playing')return;
 const {kind,damage}=strike;player.pose=kind==='heavy'?.3:.18;
 // Crouched light on any footing (street or rooftop) is the Pound: it beats down on what is under your feet.
 if(kind==='light'&&player.crouched&&player.grounded&&!clingTo){pound(strike);return;}
 attack=kind==='light'?{anim:clingTo?'climbPunch':LIGHT_ANIMS[strike.combo-1],t:0}:kind==='heavy'?{anim:'heavySlam',t:0}:{anim:player.crouched?'rangedCrouch':'rangedStand',t:0};
 const w=bodyWidth(),h=bodyHeight(),y=player.y+h*.45;
 // Mogurodon on the ground: Tremor Slam instead of a quill. Airborne or clinging he still flicks a quill (his only anti-air ranged).
 if(kind==='ranged'&&activeKaiju==='Mogurodon'&&player.grounded&&!clingTo){attack={anim:'rangedSlam',t:0};player.pose=.3;combat.rangedCooldown=B.tremorCooldown;
  tremor={t:animImpact(activeKaiju,'rangedSlam',combat.stage),dir:player.face};if(tremor.t<=0)launchTremor();return;}
 // Tlézcatl on the ground: Flame Jet (held). Airborne or clinging he fires the shared single shot.
 if(kind==='ranged'&&activeKaiju==='Tlézcatl'&&player.grounded&&!clingTo){attack=null;startJet();return;}
 // Belial on the ground: Acid Vomit (held), on the same machinery. Airborne or clinging he fires the shared single shot.
 if(kind==='ranged'&&activeKaiju==='Belial'&&player.grounded&&!clingTo){attack=null;startJet();return;}
 // Kaiban on the ground: Debris Shotgun. The rocks leave on the scoop's impact frame (the tusks wrenching up out of the street).
 // Airborne or clinging there is no street to scoop, so he fires the shared single shot like everyone else.
 if(kind==='ranged'&&activeKaiju==='Kaiban'&&player.grounded&&!clingTo){combat.rangedCooldown=B.debrisCooldown;
  debris={t:animImpact(activeKaiju,player.crouched?'rangedCrouch':'rangedStand',combat.stage),dir:player.face};if(debris.t<=0)launchDebris();return;}
 if(kind==='ranged'){if(shots.length<B.rangedMax)shots.push({x:player.x+w/2+player.face*w*.52,y,vx:player.face*C.projectileSpeed,life:1.8,damage,knockback:strike.knockback});return;}
 const reach=(C.meleeReach+(kind==='heavy'?20:0))*scale(combat);
 const box={x:player.face===1?player.x+w-10:player.x-reach+10,y:player.y-8,w:reach,h:h+16};
 if(objective&&!objective.shattered&&overlaps(box,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100}))hitObjective(damage);
 if(rival&&!rival.dead&&overlaps(box,rival)){strikeRival(damage,strike.knockback,player.face);if(rival.dead)return;}
 let struck=rival&&!rival.dead&&overlaps(box,rival);
 for(const u of military.units)if(u.hp>0&&overlaps(box,u)){hitUnit(military,u,damage,'player',strike.knockback,player.face,false,strike.kind==='ranged'?'ranged':'melee');struck=true;}
 if(struck)freeze(Math.min(F.hitstopMax,F.hitstopBase+damage*F.hitstopPerDamage));
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-7,y:p.y-7,w:14,h:14}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v)))puntVehicle(v,damage,player.face);
 for(const b of buildings)if(b.hpNow>0&&overlaps(box,{x:b.x,y:b.base-b.h,w:b.w,h:b.h}))hit(b,damage,false,player.face,{x:player.face===1?Math.max(b.x,box.x)+10:Math.min(b.x+b.w,box.x+box.w)-10,y:y});
 for(const g of growths)if(g.hp>0&&overlaps(box,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55}))hitGrowth(g,damage);
 for(const p of roofs)if(!p.dead&&overlaps(box,roofBox(p)))hitRoof(p,damage);
 // Bridge decks take melee only from beside or below (a span you stand on is pounded or slammed, never punched by accident).
 for(const t of trainsIn(box))hitTrain(t,damage);
 for(const sp of spans)if(sp.alive&&overlaps(box,spanBox(sp))&&!(player.grounded&&Math.abs(player.y+h-sp.y)<6&&player.x+w>sp.x0&&player.x<sp.x1))hitSpan(sp,damage,false,player.x+w/2+player.face*reach*.6);
 burst(player.x+w/2+player.face*reach*.8,y,kind==='heavy'?'#f2a8cb':'#d7f396',strike.combo===3?12:5);
 // Tlézcatl's heavy slams lava out of the ground in front of him: a smaller Magma Dive splash that grows with the charge.
 if(kind==='heavy'&&activeKaiju==='Tlézcatl'&&player.grounded&&!clingTo){const feet=player.y+h,c=strike.charge/B.maxCharge;
  splashLava(player.x+w/2+player.face*reach*.6,feet,w*.15,MV.heavyLavaPower[0]+(MV.heavyLavaPower[1]-MV.heavyLavaPower[0])*c,MV.heavyLavaGlobs+(c>.8?2:0),feet>=groundAt(player.x+w/2)-1?w*MV.heavyLavaPoolWidth:0,8);}
 if(kind==='light'){action=`LIGHT COMBO ${strike.combo} / 3`;actionTime=.5;}
 if(kind==='heavy'){shake=strike.charge>B.maxCharge*.8?7:3;action=strike.charge>B.maxCharge*.8?'CHARGED HEAVY': 'HEAVY IMPACT';actionTime=.7;}
}
// First player-caused wreck of a vehicle pays out once (traffic pays less, so passing cars can't be farmed). No crystals.
function rewardVehicle(v:Vehicle,fromUltimate=false){if(v.rewarded)return;v.rewarded=true;award(Math.round(VEHICLE_SPECS[v.kind].points*(v.traffic?VC.trafficPoints:1)));creditDamage(combat,M.carHP,'player',fromUltimate);}
function flattenVehicle(v:Vehicle,playerCaused=true,fromUltimate=false){if(v===held)held=null;
 if(v.kind==='lamp'){if(upright(v)){uproot(v);v.state='wreck';v.angle=player.face>0?0:Math.PI;v.y=groundAt(v.x+v.w/2)-v.h;spawnChunks(v.x+v.w/2,groundAt(v.x+v.w/2)-8,player.face,'#e9d6a2',3);if(playerCaused)rewardVehicle(v,fromUltimate);}return;}if(playerCaused&&!v.rewarded)wreckFeel(v,player.face,false,fromUltimate);v.state='flat';v.angle=0;v.vx=v.vy=0;v.y=groundAt(v.x+v.w/2)-v.h;
 burst(v.x+v.w/2,groundAt(v.x+v.w/2)-6,playerCaused?'#e6b983':'#b5aa8e',playerCaused?8:4);if(playerCaused)rewardVehicle(v,fromUltimate);}
// Punt: a hit sends the vehicle tumbling as a projectile that damages whatever it crashes into.
function puntVehicle(v:Vehicle,damage:number,dir:number,fromUltimate=false,lift=1){
uproot(v);v.shield=VC.puntShield;v.calm=VC.sustainedCalm;const fresh=!v.rewarded;const m=Math.sqrt(mass(v));launch(v,dir*(VC.kickSpeed+damage*1.4)/m,-(VC.kickLift+damage*.8)*lift/m,fromUltimate?0:damage*VC.kickDamage*mass(v));
 spawnChunks(v.x+v.w/2,v.y+v.h/2,dir,v.color,3);if(fresh)wreckFeel(v,dir,true,fromUltimate);rewardVehicle(v,fromUltimate);}
// A civilian vehicle's first wreck lands like a military kill: hit-stop, shake, camera kick, fireball, debris, scorch.
// Punted ones catch fire and burn as they tumble.
function wreckFeel(v:Vehicle,dir:number,airborne:boolean,fromUltimate=false){
 if(!CIVILIAN.has(v.kind))return;const m=mass(v),cx=v.x+v.w/2,cy=v.y+v.h/2;
 // Crushed underfoot is a crunch (a troop-stomp's beat); knocked flying is a full kill hit-stop.
 // Stomping along a parked row crunches once, not per car (the echo rule).
 if(!fromUltimate){if(airborne)freeze(Math.min(MF.deathHitstopMax,MF.deathHitstop+m*MF.deathHitstopPerMass));else if(time-lastFreeze>=F.hitstopEcho)freeze(VC.crushHitstop);}
 shake=Math.max(shake,3+m*1.6);kick(dir*(2+m*1.6),-(1+m*.6));
 fireball(cx,cy,VC.wreckFireball+m*VC.wreckPerMass);fireball(cx+dir*v.w*.25,cy-v.h*.3,(VC.wreckFireball+m*VC.wreckPerMass)*.6);
 burst(cx,cy,'#ffcf73',6+m*2);burst(cx,cy,'#5e6460',4+m);spawnChunks(cx,cy,dir,v.color,Math.round(2+m*2),1+m*.15);
 decal(cx-v.w*.6,v.w*1.2,'scorch');if(airborne)v.burn=MF.wreckBurn;}
// A thrown road vehicle goes off on its first impact: a blast that wrecks military, buildings, the rival, objectives,
// growths and other vehicles around it, then it bounces on as a burning wreck.
function detonate(v:Vehicle){
 if(!v.thrown)return;v.thrown=false;const m=mass(v),cx=v.x+v.w/2,cy=v.y+v.h/2,dir=Math.sign(v.vx)||player.face;
 const r=VC.blastRadius+m*VC.blastPerMass,dmg=VC.blastDamage*impact(v)*damageMultiplier(combat),zone={x:cx-r,y:cy-r,w:r*2,h:r*2};
 blast(military,cx,cy,r,dmg,'player');
 for(const b of buildings)if(solid(b)&&!v.hits.has(b)&&overlaps(zone,{x:b.x,y:b.base-b.h,w:b.w,h:b.h})){v.hits.add(b);hit(b,dmg*.6,false,dir,{x:cx,y:cy},true);}
 if(rival&&!rival.dead&&!v.hits.has(rival)&&overlaps(zone,rival)){v.hits.add(rival);strikeRival(dmg*.6,220,dir);}
 if(objective&&!objective.shattered&&!v.hits.has(objective)&&overlaps(zone,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100})){v.hits.add(objective);hitObjective(dmg*.6);}
 for(const g of growths)if(g.hp>0&&!v.hits.has(g)&&overlaps(zone,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55})){v.hits.add(g);hitGrowth(g,dmg*.6);}
 for(const p of roofs)if(!p.dead&&!v.hits.has(p)&&overlaps(zone,roofBox(p))){v.hits.add(p);hitRoof(p,dmg*.6);}
 for(const sp of spans)if(sp.alive&&!v.hits.has(sp)&&overlaps(zone,spanBox(sp))){v.hits.add(sp);hitSpan(sp,dmg*.6,false,cx);}
 for(const t of trainsIn(zone))if(!v.hits.has(t)){v.hits.add(t);hitTrain(t,dmg);}
 for(const o of vehicles)if(o!==v&&loose(o)&&!v.hits.has(o)&&overlaps(zone,vehicleBox(o))){v.hits.add(o);o.hits.add(v);puntVehicle(o,dmg*.4,Math.sign(o.x+o.w/2-cx)||dir,false,1.5);}
 // The blast is a main event, not a follow-up hit, so it freezes even inside the echo window.
 {const e=echo;echo=false;freeze(Math.min(MF.deathHitstopMax,MF.deathHitstop+m*MF.deathHitstopPerMass+MF.deathHitstopBig));echo=e;}
 shake=Math.max(shake,(4+m*1.8)*1.45);kick(dir*(3+m*1.6)*1.45,-(2+m*.6)*1.45);
 fireball(cx,cy,r*.75,true);fireball(cx+dir*v.w*.3,cy-v.h*.4,r*.45,true);fireball(cx-dir*v.w*.3,cy-v.h*.2,r*.35,true);
 burst(cx,cy,'#ffcf73',12+m*3);burst(cx,cy,'#5e6460',8+m*2);spawnChunks(cx,cy,dir,v.color,Math.round(4+m*2),1.2+m*.15);spawnChunks(cx,cy,-dir,'#3c4945',3,1.2);
 if(cy>groundAt(cx)-80)decal(cx-r*.5,r,'scorch');
 v.damage=0;v.vx*=VC.blastKeep;v.vy=Math.min(v.vy,-VC.blastBounce/Math.sqrt(m));v.spin=dir*(8+Math.random()*6);v.burn=MF.wreckBurn;
 action=`${v.kind.toUpperCase()} DETONATED`;actionTime=.9;}
function grabBox(){const w=bodyWidth(),reach=VC.grabReach*scale(combat);return {x:player.face>0?player.x+w*.5:player.x-reach,y:groundAt(player.face>0?player.x+w*.5:player.x-reach)-46,w:w*.5+reach,h:46};}
// Lifting a small structure destroys it for score/quota on the spot and leaves no rubble.
function liftBuilding(b:typeof buildings[number]){const r=damageBuilding(b,b.hpNow);award(r.points);creditDamage(combat,r.damage,'player');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);b.collapse=0;b.lifted=true;exploreReward(b,false);}
const UNIT_COLORS:Record<string,string>={patrol:'#557288',apc:'#7b8c61',tank:'#65795b',artillery:'#65795b'};
// H grabs the nearest thing in reach: loose vehicles/wrecks, enemy ground vehicles, or small structures.
function tryGrab(){if(held||!canAct(combat)||combat.charging||clingTo||combat.ultimateTime>0)return false;
 // Ranked by gap from the body's leading edge, so what is directly in front beats props under a wide Stage 3 body.
 const box=grabBox(),front=player.face>0?player.x+bodyWidth():player.x,dist=(r:{x:number,w:number})=>Math.abs(player.face>0?r.x-front:front-(r.x+r.w)),options:{d:number,take:()=>Vehicle}[]=[];
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v)))options.push({d:dist(v),take:()=>v});
 for(const u of military.units)if(u.hp>0&&GRABBABLE_UNITS.has(u.type)&&overlaps(box,u))options.push({d:dist(u),take:()=>{captureUnit(military,u);drainMilitary();const p=makeProp(nextVehicle++,u.type as Vehicle['kind'],u.x,UNIT_COLORS[u.type]);vehicles.push(p);return p;}});
 for(const b of buildings)if(liftable(b,combat.stage)&&overlaps(box,{x:b.x,y:b.base-b.h,w:b.w,h:b.h}))options.push({d:dist(b),take:()=>{liftBuilding(b);const p=b.h>F.liftHeight?liftedBuilding(nextVehicle++,b):makeProp(nextVehicle++,b.kind==='tiny'?'stand':'barrier',b.x,b.color,b.label);vehicles.push(p);return p;}});
 // Stage 3 reaches down through an open pit and pulls a whole subway train out of the tunnel (running or wrecked).
 if(combat.stage>=3)for(const t of trains){const r={x:t.x,w:R.trainLength};if(r.x+r.w<box.x||r.x>box.x+box.w)continue;
  if(!pitList().some(p=>p.x0<Math.min(box.x+box.w,r.x+r.w)&&p.x1>Math.max(box.x,r.x)))continue;
  options.push({d:dist(r),take:()=>{trains.splice(trains.indexOf(t),1);const v=makeProp(nextVehicle++,'train',t.x,'#a9b2b0',t.crashed?'wreck':'');
   if(t.crashed)v.burn=MF.wreckBurn;else{award(R.trainPoints);heatUp(R.trainHeat);}
   for(const p of pitList())if(p.x0<r.x+r.w&&p.x1>r.x)for(let x=Math.max(p.x0,r.x);x<Math.min(p.x1,r.x+r.w);x+=18)spawnChunks(x,C.ground,player.face,'#7d8580',2,1.2);
   shake=Math.max(shake,10);banner={label:'TRAIN SNATCHED',side:0,life:2};vehicles.push(v);return v;}});}
 options.sort((a,b)=>a.d-b.d);if(!options.length)return false;
 const pick=options[0].take();uproot(pick);held=pick;pick.state='held';pick.angle=0;pick.vx=pick.vy=0;pick.panic=0;pick.lane=1;attack=animDuration(activeKaiju,'grab',combat.stage)?{anim:'grab',t:0}:null;action=`GRAB · ${pick.kind.toUpperCase()}`;actionTime=.9;return true;}
// Throw forward, or with W held lob it high (anti-air). Damage scales with the vehicle's mass and the kaiju's stage.
function throwHeld(){if(!held||!canAct(combat))return;const v=held,m=mass(v),up=keys.has('KeyW');held=null;
 launch(v,player.face*(up?VC.upSpeed:VC.throwSpeed/Math.pow(m,VC.throwMassExp)),-(up?VC.upLift:v.kind==='lamp'?VC.lampLift:VC.throwLift)/(up?Math.sqrt(m):1),VC.throwDamage*impact(v)*damageMultiplier(combat));
 v.lane=1;v.thrown=EXPLOSIVE.has(v.kind);rewardVehicle(v);attack={anim:animDuration(activeKaiju,'throw',combat.stage)?'throw':'heavySlam',t:0};player.pose=.3;shake=Math.max(shake,3);action=up?'THROW · UP':'THROW';actionTime=.7;}
function dropHeld(){if(!held)return;const v=held;held=null;launch(v,0,0,0);v.thrown=false;if(attack?.anim==='grab')attack=null;}
// Thrown/punted vehicles crash into buildings, troops, the rival, objectives and other vehicles (which get knocked flying too).
function vehicleImpacts(v:Vehicle){
 if(v.state!=='flying'||v.damage<=1)return;const box=vehicleBox(v),dir=Math.sign(v.vx)||1,cx=v.x+v.w/2,cy=v.y+v.h/2,before=v.hits.size;
 for(const b of buildings)if(solid(b)&&!v.hits.has(b)&&overlaps(box,{x:b.x,y:b.base-b.h,w:b.w,h:b.h})){v.hits.add(b);hit(b,v.damage,false,dir,{x:cx,y:cy});if((v.burn??0)>0&&Math.random()<FI.wreckChance)setAlight(b);v.vx=-v.vx*VC.restitution;v.x=dir>0?b.x-v.w-1:b.x+b.w+1;v.damage*=VC.impactKeep;spawnChunks(cx,cy,-dir,v.color,4);detonate(v);return;}
 for(const u of military.units)if(u.hp>0&&!v.hits.has(u)&&overlaps(box,u)){v.hits.add(u);hitUnit(military,u,v.damage,'player',180*mass(v),dir,false,'thrown');v.damage*=v.kind==='lamp'?VC.lampPierce:VC.unitKeep;freeze(.04);}
 if(rival&&!rival.dead&&!v.hits.has(rival)&&overlaps(box,rival)){v.hits.add(rival);strikeRival(v.damage,160*mass(v),dir);v.vx=-v.vx*VC.restitution;v.damage*=VC.impactKeep;}
 if(objective&&!objective.shattered&&!v.hits.has(objective)&&overlaps(box,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100})){v.hits.add(objective);hitObjective(v.damage);v.vx=-v.vx*VC.restitution;v.damage*=VC.impactKeep;}
 for(const g of growths)if(g.hp>0&&!v.hits.has(g)&&overlaps(box,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55})){v.hits.add(g);hitGrowth(g,v.damage);}
 for(const p of roofs)if(!p.dead&&!v.hits.has(p)&&overlaps(box,roofBox(p))){v.hits.add(p);hitRoof(p,v.damage);}
 for(const o of vehicles)if(o!==v&&loose(o)&&!v.hits.has(o)&&overlaps(box,vehicleBox(o))){v.hits.add(o);o.hits.add(v);uproot(o);const fresh=!o.rewarded;launch(o,v.vx*VC.chainPush,-170/Math.sqrt(mass(o)),v.damage*.5);if(fresh)wreckFeel(o,dir,true);rewardVehicle(o);v.vx*=1-VC.chainPush*.6;spawnChunks(o.x+o.w/2,o.y,dir,o.color,3);}
 if(v.thrown&&(v.hits.size>before||v.y>=groundAt(v.x+v.w/2)-v.h-1))detonate(v);
}
function tickVehicles(dt:number){
 if(held&&!canAct(combat))dropHeld();
 const cx=player.x+bodyWidth()/2;
 if(trafficBudget>0){trafficTimer+=dt;if(trafficTimer>=VC.trafficInterval&&vehicles.filter(v=>v.state==='driving').length<VC.trafficCap){trafficTimer=0;trafficBudget--;
  vehicles.push(spawnTraffic(nextVehicle++,camera,Math.random()<.5?1:-1,Math.random,viewW()));}}
 for(const v of vehicles){
  if(v===held){const [anim,at]=currentAnim(),hp=holdPoint(activeKaiju,anim,at,combat.stage);
   if(hp){const k=scale(combat),feet=player.y+bodyHeight()+C.spriteDrop,bite=holdBite(activeKaiju,anim,combat.stage);
    // In the jaws (`bite`) the point is where the teeth close: the prop is gripped by its near end (its centre 0.3 of its width
    // ahead) at mid-height, and never sinks below the feet line while the head is down at the street.
    v.x=cx+player.face*(hp[0]*k+(bite?v.w*.3:0))-v.w/2;v.y=bite?Math.min(feet+hp[1]*k-v.h/2,feet-v.h):feet+hp[1]*k-v.h;}else{v.x=cx-v.w/2;v.y=player.y-v.h+C.spriteDrop*.5;}if(v.kind==='lamp')v.angle=player.face>0?0:Math.PI;continue;}
  if(v.shield)v.shield=Math.max(0,v.shield-dt);if(v.calm)v.calm=Math.max(0,v.calm-dt);
  tickDriving(v,dt,cx);
  const wasFlying=v.state==='flying',settled=tickFlying(v,dt,worldWidth);if(wasFlying)vehicleImpacts(v);if(settled)detonate(v);
  // A thrown building breaks apart where it lands instead of lying around as a wreck.
  if(settled&&v.kind==='building'){heavyLanding(v);v.state='flat';spawnChunks(v.x+v.w/2,groundAt(v.x+v.w/2)-v.h*.4,Math.sign(v.vx)||player.face,v.color,8,1.6);burst(v.x+v.w/2,groundAt(v.x+v.w/2)-8,'#b1ac91',14);shake=Math.max(shake,4);}
 }
 // Traffic that drives away is gone; old flattened wrecks are culled first once the cap is reached.
 vehicles=vehicles.filter(v=>!(v.state==='driving'&&(v.x<-VC.despawn*.2||v.x>worldWidth+VC.despawn*.2||(v.x<camera-VC.despawn||v.x>camera+viewW()+VC.despawn-C.width))));
 while(vehicles.length>VC.vehicleCap){const k=vehicles.findIndex(v=>v.state==='flat');if(k<0)break;vehicles.splice(k,1);}
}
function drainMilitary(){
 while(military.events.length){const events=military.events;military.events=[];
 for(const e of events){
  if(e.kind==='reward'){award(e.points);creditDamage(combat,e.damage,'player',e.ultimate);if(e.shards)dropShards(e.x,e.shards);
   if(e.interrupt){combat.ultimate=Math.min(B.ultimateMax,combat.ultimate+MF.interruptUltimate);action=`INTERRUPTED +${MF.interruptPoints}`;actionTime=1;}}
  else if(e.kind==='playerHit')militaryHitsPlayer(e);
  else if(e.kind==='unitHit'){if(e.source==='player'&&!e.killed){const m=UNITS[e.type].mass;sparks(e.x,e.y,-e.dir,2+Math.round(m),'#fff0c9');
   if(e.cause!=='ultimate'&&e.cause!=='blast'&&e.damage>=8)freeze(Math.min(.06,.012+e.damage*.0006*m));if(e.interrupted){burst(e.x,e.y-10,'#c9ef83',8);}}}
  else if(e.kind==='death')unitDies(e);
  else if(e.kind==='crash')crashFeel(e);
  else if(e.kind==='announce')banner={label:`${e.label} ×${e.count}`,side:e.side,life:2.4};
  else if(e.kind==='strike'){banner={label:'ARTILLERY STRIKE CALLED · MOVE!',side:0,life:2};}
  else burst(e.x,e.y,'#f6dba1',3);
 }}
}
// First fissure waits for the roar's crash-down so the waves come out of the slam.
// Kaiban's Stampede bellows on the same impact frame, then charges (tickStampede) instead of sending fissures.
function useUltimate(){if(!activateUltimate(combat))return;attack=null;tremor=null;debris=null;jet=null;jet=null;jetFuel=1;jetLocked=false;ultimateTimer=animImpact(activeKaiju,'ultRoar',combat.stage);player.pose=.5;action=ultimateLabel();actionTime=2.4;shake=8;
 stampede=activeKaiju==='Kaiban'?{dir:player.face,hits:new Set(),turned:false,bellowed:false,charging:false,start:player.x,reach:B.stampedeReach*scale(combat)}:null;
 eruptLandings=[];eruption=activeKaiju==='Tlézcatl'?{blasted:false,spat:0,flash:0,boom:0}:null;
 if(eruption)ultimateTimer+=B.eruptCharge;
 delugeLandings=[];deluge=isBelial()?{spout:false,spoutT:0,spoutLen:0,queue:[],spawned:0,mx:0,my:0}:null;
 if(deluge)ultimateTimer+=B.delugeCharge;}
// Acid Deluge: planted. He heaves for delugeCharge seconds while the gland swells, rears up (the roar strip) and on its impact frame
// retches a geyser of acid straight up out of the jaws (mouth point from the strip). It spouts until the settle strip starts. Every
// drop of the rain is scheduled the moment it goes up: spread evenly over the spout's length, delayed by delugeDelay (the acid going
// up and coming back), landing anywhere out to delugeRange either side, alternating sides so both get soaked. Drops start falling at
// the top of the view. The rain outlives the Ultimate until the last drop has fallen.
function tickDeluge(dt:number,w:number,h:number){const d=deluge!,g=Math.sqrt(scale(combat)),cx=player.x+w/2;
 if(combat.ultimateTime>0){const [anim,t]=currentAnim(),m=holdPoint(activeKaiju,anim,t,combat.stage,'mouth');
  if(m){const s=scale(combat);d.mx=player.x+w/2+player.face*m[0]*s;d.my=player.y+h+C.spriteDrop+m[1]*s;}}
 if(!d.spout){
  if(combat.ultimateTime<=0){deluge=null;return;}
  ultimateTimer-=dt;
  // The heave: a rising shudder and acid dribbling from the jaws.
  const p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.delugeCharge);shake=Math.max(shake,1+p*3);
  if(particles.length<C.particleCap&&Math.random()<dt*(8+20*p))particles.push({x:cx+player.face*w*.45+(Math.random()-.5)*8*g,y:player.y+h*.75,vx:(Math.random()-.5)*20,vy:20+Math.random()*40,life:.3+Math.random()*.3,color:Math.random()<.5?'#c8f03a':'#9ccc2a',size:2});
  if(ultimateTimer>0)return;
  const settle=animDuration(activeKaiju,'ultSettle',combat.stage)||.5,R=B.delugeRange*g;
  d.spout=true;d.spoutT=0;d.spoutLen=Math.max(.3,combat.ultimateTime-settle);shake=Math.max(shake,12);
  for(let i=0;i<B.delugeDrops;i++){const side=i%2?1:-1,x=Math.max(4,Math.min(worldWidth-4,cx+side*Math.random()*R));
   d.queue.push({t:B.delugeDelay+(i+Math.random())/B.delugeDrops*d.spoutLen,x,size:B.delugeDropSize*g*(.75+Math.random()*.5)});}
  d.queue.sort((a,b)=>a.t-b.t);}
 d.spoutT+=dt;
 const top=C.ground-C.ground/zoom-cameraY-20,dm=damageMultiplier(combat);
 while(d.spawned<d.queue.length&&d.queue[d.spawned].t<=d.spoutT){const q=d.queue[d.spawned++];rain.push({x:q.x,y:top-Math.random()*40,vy:B.delugeFall*g,size:q.size,damage:B.delugeDamage*dm});}
 // Spray boiling off the geyser's base at the jaws.
 if(d.spoutT<d.spoutLen){shake=Math.max(shake,3);for(let n=0;n<3&&particles.length<C.particleCap;n++)particles.push({x:d.mx+(Math.random()-.5)*10*g,y:d.my,vx:(Math.random()-.5)*160*g,vy:-(80+Math.random()*220)*g,life:.25+Math.random()*.35,color:['#c8f03a','#9ccc2a','#e6ff8a','#5f7f16'][n%4],size:2+Math.floor(Math.random()*3)});}
 if(d.spawned>=d.queue.length&&combat.ultimateTime<=0)deluge=null;}
// A falling drop: swept down from where it was last frame, it hits the topmost thing under it (aircraft, troops, vehicles, growths,
// the stronghold crystal, the rival), else the roof of the building it is over, else the street. Rockets and bombs in its way are
// eaten. Every hit soaks its target with delugeSoak corrosion stacks before the damage lands, so the extra damage counts at once.
function tickRain(dt:number){const g=Math.sqrt(scale(combat)),cx=player.x+bodyWidth()/2;
 for(const r of rain){const oy=r.y;r.vy+=B.delugeGravity*g*dt;r.y+=r.vy*dt;
  let stop=groundAt(r.x)-2,roof:typeof buildings[number]|null=null;
  for(const b of buildings)if(solid(b)&&b.hpNow>0&&r.x>=b.x&&r.x<=b.x+b.w&&b.base-b.h<stop){stop=b.base-b.h;roof=b;}
  const end=Math.min(r.y,stop),box={x:r.x-r.size,y:oy-r.size*2,w:r.size*2,h:end-oy+r.size*2},dir=Math.sign(r.x-cx)||1;
  for(const p of military.projectiles)if(!p.dead&&WEAPONS[p.weapon].interceptable&&overlaps(box,{x:p.x-8,y:p.y-8,w:16,h:16}))intercept(military,p);
  let best:{y:number,f:()=>void}|null=null;const see=(t:{x:number,y:number,w:number,h:number},f:()=>void)=>{if(overlaps(box,t)&&(!best||t.y<best.y))best={y:t.y,f};};
  for(const u of military.units)if(u.hp>0)see(u,()=>{soak(u,B.delugeSoak);hitUnit(military,u,r.damage,'player',40,dir,true,'ultimate');});
  if(rival&&!rival.dead)see(rival,()=>{soak(rival!,B.delugeSoak);strikeRival(r.damage,40,dir,true);});
  for(const v of vehicles)if(loose(v))see(vehicleBox(v),()=>puntVehicle(v,r.damage*.3,dir,true));
  for(const gr of growths)if(gr.hp>0)see({x:gr.x-20,y:groundAt(gr.x)-55,w:40,h:55},()=>hitGrowth(gr,r.damage));
  if(objective&&!objective.shattered)see({x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100},()=>hitObjective(r.damage));
  const hitAt=best as {y:number,f:()=>void}|null;
  if(hitAt){r.y=-1e9;hitAt.f();splatter(r.x,Math.max(oy,hitAt.y),g,4);delugeLandings.push(r.x);continue;}
  if(r.y<stop)continue;
  r.y=-1e9;delugeLandings.push(r.x);splatter(r.x,stop,g,roof?5:4);
  if(roof){const b=roof;soak(b,B.delugeSoak);hit(b,r.damage,true,dir,{x:r.x,y:stop+4},true);continue;}
  const rr=B.delugeSplash*g,zone={x:r.x-rr,y:groundAt(r.x-rr)-rr,w:rr*2,h:rr+2};
  for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(zone,u)){soak(u,B.delugeSoak);hitUnit(military,u,r.damage*.5,'player',20,dir,true,'ultimate');}
  for(const b of buildings)if(b.kind==='tiny'&&b.hpNow>0&&overlaps(zone,{x:b.x,y:b.base-b.h,w:b.w,h:b.h})){soak(b,B.delugeSoak);hit(b,r.damage,true,dir,undefined,true);}
  if(rival&&!rival.dead&&overlaps(zone,rival)){soak(rival,B.delugeSoak);strikeRival(r.damage*.5,20,dir,true);}
  acidPuddle(r.x,true);}
 rain=rain.filter(r=>r.y>-1e8&&r.x>0&&r.x<worldWidth);}
function splatter(x:number,y:number,g:number,n:number){for(let k=0;k<n&&particles.length<C.particleCap;k++)particles.push({x:x+(Math.random()-.5)*6*g,y:y-2,vx:(Math.random()-.5)*110,vy:-(40+Math.random()*110)*g,life:.2+Math.random()*.3,color:['#c8f03a','#9ccc2a','#e6ff8a','#5f7f16'][k%4],size:2+Math.floor(Math.random()*2)});}
// Eruption: planted. He balls up for eruptCharge seconds while the pressure builds, rears up (the roar strip), and on its impact
// frame explodes: one hit on everything inside a true circle of eruptBlastRange round his middle. The blast is the Ultimate; the
// magma is its fallout, hurled out of the fireball in one burst. The globs are not aimed: each picks a random landing spot out to
// eruptRange either side and its throw is solved to fly eruptFlight seconds, so the fallout covers the area evenly and keeps landing
// for a while after the blast. Everything is Ultimate damage.
function eruptionCore(w:number,h:number){return {x:player.x+w/2,y:player.y+h*.5,g:Math.sqrt(scale(combat))};}
// Circle-vs-rectangle: the nearest point of the rectangle lies within r of the centre.
function inCircle(cx:number,cy:number,r:number,b:{x:number,y:number,w:number,h:number}){const dx=cx-Math.max(b.x,Math.min(cx,b.x+b.w)),dy=cy-Math.max(b.y,Math.min(cy,b.y+b.h));return dx*dx+dy*dy<=r*r;}
function tickEruption(dt:number,w:number,h:number){
 const e=eruption!,el=B.ultimateDuration-combat.ultimateTime,dm=damageMultiplier(combat),{x:cx,y:cy,g}=eruptionCore(w,h);
 e.flash=Math.max(0,e.flash-dt);ultimateTimer-=dt;
 if(!e.blasted){
  // Pressure building: embers drawn in toward him, a rising rumble.
  const p=Math.min(1,el/B.eruptCharge);shake=Math.max(shake,1+p*4);
  for(let n=0;n<2&&particles.length<C.particleCap;n++)if(Math.random()<dt*(10+40*p)){const a=Math.random()*Math.PI*2,r=(50+Math.random()*60)*g,life=.35;
   particles.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.7,vx:-Math.cos(a)*r/life,vy:-Math.sin(a)*r*.7/life,life,color:Math.random()<.5?'#ffd34d':'#ff8a1f',size:2+Math.floor(Math.random()*2)});}
  if(ultimateTimer>0)return;
  e.blasted=true;e.boom=0;e.flash=.4;shake=Math.max(shake,18);freeze(.12);
  const R=B.eruptBlastRange*g,dmg=B.eruptBlastDamage*dm,kb=B.eruptBlastKnockback,side=(x:number)=>Math.sign(x-cx)||player.face,hits=(r:{x:number,y:number,w:number,h:number})=>inCircle(cx,cy,R,r);
  for(const b of buildings)if(b.hpNow>0&&hits({x:b.x,y:b.base-b.h,w:b.w,h:b.h})){const d=side(b.x+b.w/2),near=d>0?b.x:b.x+b.w;hit(b,dmg,true,d,{x:near+d*6,y:Math.max(b.base-b.h+6,Math.min(b.base-6,cy))});}
  for(const gr of growths)if(gr.hp>0&&hits({x:gr.x-20,y:groundAt(gr.x)-55,w:40,h:55}))hitGrowth(gr,dmg);
  if(objective&&!objective.shattered&&hits({x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100}))hitObjective(dmg);
  if(rival&&!rival.dead&&hits(rival))strikeRival(dmg,kb,side(rival.x+rival.w/2),true);
  for(const u of military.units)if(u.hp>0&&hits(u))hitUnit(military,u,dmg,'player',kb,side(u.x+u.w/2),true,'ultimate');
  for(const p of military.projectiles)if(!p.dead&&hits({x:p.x-6,y:p.y-6,w:12,h:12}))intercept(military,p);
  for(const v of vehicles)if(loose(v)&&hits(vehicleBox(v)))puntVehicle(v,dmg*.5,side(v.x+v.w/2),true,1.8);
  for(let k=0;k<60&&particles.length<C.particleCap;k++){const a=Math.random()*Math.PI*2,sp=(250+Math.random()*400)*g;particles.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.8,life:.3+Math.random()*.5,color:['#fff2c0','#ffd34d','#ff8a1f','#e8401a','#5a1d12'][k%5],size:2+Math.floor(Math.random()*5)});}
  // The fallout: every glob thrown out of the fireball at once, from the point on its edge facing where it will land.
  const reach=B.eruptRange*g,[t0,t1]=B.eruptFlight;
  for(let i=0;i<B.eruptGlobs;i++){const dir=i%2?1:-1,land=Math.max(4,Math.min(worldWidth-4,cx+dir*(R*.6+Math.random()*(reach-R*.6)))),T=t0+Math.random()*(t1-t0),a=-Math.PI/2+dir*(.25+Math.random()*.9);
   const x0=cx+Math.cos(a)*R*.35,y0=Math.min(groundAt(x0)-10,cy+Math.sin(a)*R*.35);
   globs.push({x:x0,y:y0,vx:(land-x0)/T,vy:(groundAt(land)-2-y0-.5*B.eruptGravity*T*T)/T,grav:B.eruptGravity,life:T+1,damage:B.eruptGlobDamage*dm,size:B.eruptGlobSize*g*(.8+Math.random()*.4),ult:true});}
  e.spat=B.eruptGlobs;}
 e.boom+=dt;}
// Stampede: the bellow knocks back whatever is close, then once the roar strip ends he charges stampedeReach x stage scale (fixed at
// activation) out and back, so a bigger form charges further and faster in the same time (no building
// collision while charging), turning early at the world edge. Every building he touches is destroyed outright (trainWreck); everything
// else takes Ultimate damage once per pass.
// A building in the Stampede's path: destroyed whatever its HP (tall ones topple the way he is charging, via impactFeel), its facade
// blown out ahead of him at three heights, with a short crunch of hitstop and heavy shake.
function trainWreck(b:typeof buildings[number],dir:number,y:number){
 hit(b,b.hpNow,true,dir,{x:dir>0?b.x+4:b.x+b.w-4,y});
 const face=dir>0?b.x+4:b.x+b.w-4;
 for(let k=0;k<3;k++){const hy=b.base-Math.min(b.h-4,18+k*b.h/3);spawnDebris(face,hy,dir,6,1.8);burst(face,hy,'#e8d8ab',8);}
 freeze(B.stampedeCrunch);shake=Math.max(shake,12);}
function tickStampede(dt:number,w:number,h:number){
 const s=stampede!,el=B.ultimateDuration-combat.ultimateTime,roar=animDuration(activeKaiju,'ultRoar',combat.stage)||.6,dmg=B.stampedeDamage*damageMultiplier(combat);
 ultimateTimer-=dt;
 if(!s.bellowed&&ultimateTimer<=0){s.bellowed=true;shake=Math.max(shake,10);burst(player.x+w/2+s.dir*w*.4,player.y+h*.3,'#f1e2c4',18);
  const life=B.bellowRange/B.ultimateSpeed;for(const direction of [-1,1])waves.push({x:player.x+w/2,vx:direction*B.ultimateSpeed,life,max:life,damage:B.bellowDamage*damageMultiplier(combat),hits:new Set(),ult:true,size:1.1,knockback:B.stampedeKnockback});}
 if(el<roar)return;
 s.charging=true;
 const atEdge=s.dir<0?player.x<=0:player.x>=worldWidth-w,speed=2*s.reach/Math.max(.2,B.ultimateDuration-roar);
 if(!s.turned&&(Math.abs(player.x-s.start)>=s.reach||atEdge)){s.turned=true;s.dir=-s.dir;s.hits=new Set();}
 // Home again: stop at the start line (he finishes where he began) and let the gallop play out the last instants.
 const home=s.turned&&(s.dir>0?player.x>=s.start:player.x<=s.start);
 player.face=s.dir;if(!home)player.x=Math.max(0,Math.min(worldWidth-w,player.x+s.dir*speed*dt));
 const box={x:player.x-(s.dir<0?w*.35:0),y:player.y-4,w:w*1.35,h:h+8},first=(o:object)=>!s.hits.has(o)&&!!s.hits.add(o);
 for(const b of buildings)if(b.hpNow>0&&overlaps(box,{x:b.x,y:b.base-b.h,w:b.w,h:b.h})&&first(b))trainWreck(b,s.dir,player.y+h*.5);
 for(const g of growths)if(g.hp>0&&overlaps(box,{x:g.x-20,y:groundAt(g.x)-55,w:40,h:55})&&first(g))hitGrowth(g,dmg);
 if(objective&&!objective.shattered&&overlaps(box,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100})&&first(objective))hitObjective(dmg);
 if(rival&&!rival.dead&&overlaps(box,rival)&&first(rival))strikeRival(dmg,B.stampedeKnockback,s.dir,true);
 for(const u of military.units)if(u.hp>0&&overlaps(box,u)&&first(u))hitUnit(military,u,dmg,'player',B.stampedeKnockback,s.dir,true,'ultimate');
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-6,y:p.y-6,w:12,h:12}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v))&&first(v))puntVehicle(v,dmg*.5,s.dir,true,1.6);
 shake=Math.max(shake,3);
 // Dust kicked up behind the hooves.
 for(let n=0;n<2&&particles.length<C.particleCap;n++)if(Math.random()<dt*30)particles.push({x:player.x+w/2-s.dir*w*.45,y:player.y+h-3,vx:-s.dir*(60+Math.random()*120),vy:-(40+Math.random()*110),life:.35+Math.random()*.3,color:Math.random()<.5?'#c9a77c':'#a8957a',size:2+Math.floor(Math.random()*4)});}
function useSuper(){if(activateSuper(combat)){action='SUPER FORM';actionTime=2;burst(player.x+bodyWidth()/2,player.y,'#f7a2d3',35);}}
function solidBodies(){return [...buildings.filter(solid).map(b=>({x:b.x,y:b.base-b.h,w:b.w,h:b.h})),...(rival&&!rival.dead?[rival]:[])];}
function syncBody(){
 const w=bodyWidth(),h=bodyHeight();if(w!==oldWidth||h!==oldHeight){player.x-=(w-oldWidth)/2;player.y-=h-oldHeight;
 player.x=separateHorizontal({x:player.x,y:player.y,w,h},solidBodies(),worldWidth);oldWidth=w;oldHeight=h;}
}
window.addEventListener('keydown',e=>{
 if(mode==='intro'){e.preventDefault();if(!e.repeat)finishIntro();return;}
 if(['INPUT','SELECT'].includes((e.target as HTMLElement)?.tagName))return;
 const k=e.code;if(['Space','KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyU','KeyI','KeyH','Escape','ShiftLeft','ShiftRight'].includes(k))e.preventDefault();
 if(k==='Escape'&&!e.repeat){if(mode==='playing')pause();else if(mode==='paused')resume();return;}
 if(mode!=='playing')return;keys.add(k);if(e.repeat)return;
 // Double-tap A/D: start running (with a dash burst); the run stays latched until both are released.
 if((k==='KeyA'||k==='KeyD')&&player.grounded&&!clingTo){if(lastTap.code===k&&time-lastTap.t<MV.doubleTap){runLatch=true;dashT=MV.dashSeconds;burst(player.x+bodyWidth()/2,player.y+bodyHeight()-4,'#c9a77c',8);}lastTap={code:k,t:time};}
 // Off a wall, Space hops straight up; holding the direction away from the wall turns it into a leap away at run speed.
 if(k==='Space'&&clingTo&&canAct(combat)&&!combat.charging){const away=player.face>0?keys.has('KeyA'):keys.has('KeyD');clingTo=null;grabLock=true;grabWait=MV.grabCooldown;player.vy=-jumpVelocity();player.grounded=false;
  if(away){airRun=true;player.face=-player.face;player.vy*=MV.runJumpLift;}}
 else if(k==='Space'&&player.grounded&&!jet&&!keys.has('KeyS')&&canAct(combat)&&!combat.charging){if(roll){roll=null;running=true;}airRun=running;player.vy=-jumpVelocity()*(running?MV.runJumpLift:1);player.grounded=false;}
 // S in the air: slam dive.
 if(k==='KeyS'&&!player.grounded&&!clingTo&&startDive())return;
 if((k==='KeyA'||k==='KeyD')&&dive)dive.dir=k==='KeyD'?1:-1;
 if(k==='KeyS'&&running&&player.grounded&&startRoll())return;
 // No attacks or grabs from inside the ball.
 if(roll&&['KeyJ','KeyK','KeyL','KeyH','KeyU'].includes(k))return;
 // Breathing fire: nothing but steering and the Ultimate (which snuffs it).
 if(jet&&['KeyJ','KeyK','KeyL','KeyH'].includes(k))return;
 // While carrying a vehicle H/J/K throw it (L is ignored); otherwise H grabs.
 if(held){if(k==='KeyH'||k==='KeyJ'||k==='KeyK')throwHeld();if(k==='KeyU'){dropHeld();useUltimate();}return;}
 if(k==='KeyH'){tryGrab();return;}
 if(k==='KeyJ')performStrike(light(combat));if(k==='KeyK')beginHeavy(combat);if(k==='KeyL')performStrike(ranged(combat));if(k==='KeyU')useUltimate();if(k==='KeyI')useSuper();
});window.addEventListener('keyup',e=>{keys.delete(e.code);if(!keys.has('KeyA')&&!keys.has('KeyD'))runLatch=false;if(e.code==='KeyK'&&mode==='playing')performStrike(releaseHeavy(combat));});window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.querySelector('#fullscreen')!.addEventListener('click',toggleFullscreen);
function update(dt:number){
 time+=dt;if(mode==='intro'){introElapsed+=dt;if(introElapsed>=INTRO_DURATION)finishIntro();else if(introScene(introElapsed)!==introIndex)introPanel();return;}if(mode!=='playing')return;
 tickMilitaryFeel(dt);
 echo=false;if(hitstop>0){hitstop=Math.max(0,hitstop-dt);return;}
 performStrike(tickCombat(combat,dt));
 if(endIfDead())return;
 actionTime=Math.max(0,actionTime-dt);shake=Math.max(0,shake-dt*14);player.pose=Math.max(0,player.pose-dt);
 if(attack){attack.t+=dt;if(attack.t>=animDuration(activeKaiju,attack.anim,combat.stage))attack=null;}
 if(tremor){tremor.t-=dt;if(tremor.t<=0)launchTremor();}
 if(debris){debris.t-=dt;if(debris.t<=0)launchDebris();}
 if(jet)tickJet(dt);
 if(!jet||jet.phase!=='on'){const bel=isBelial();jetFuel=Math.min(1,jetFuel+(bel?B.vomitRegen:B.jetRegen)*dt);if(jetLocked&&jetFuel>=(bel?B.vomitRelight:B.jetRelight))jetLocked=false;}
 heavyT=combat.charging?heavyT+dt:0;
 {const next=isClimbing?'climb':!player.grounded?'jumpAir':player.crouched?'crouch':walking?(held&&hasAnim(activeKaiju,'carryWalk',combat.stage)?'carryWalk':running&&!held&&hasAnim(activeKaiju,'run',combat.stage)?'run':'walk'):held&&hasAnim(activeKaiju,'carry',combat.stage)?'carry':'idle';
  if(attack||combat.charging||combat.ultimateTime>0||jet){loopAnim=next;loopT=0;loopIntro=null;}
  else if(next!==loopAnim){loopIntro=next==='climb'?'climbGrab':loopAnim==='climb'?(mantled?'climbMantle':null):next==='jumpAir'?(player.vy<0?'jumpRise':null):loopAnim==='jumpAir'?'jumpLand':next==='crouch'?'crouchDown':loopAnim==='crouch'?'crouchUp':null;loopAnim=next;loopT=0;}
  else loopT+=next==='climb'&&climbDir===0?0:next==='walk'&&running?dt*MV.runSpeed*.8:next==='run'&&dashT>0?dt*1.3:dt;}
 // Duck or charge, not both: crouch is ignored while a heavy is charging (starting one while ducked stands you up).
 const crouch=keys.has('KeyS')&&player.grounded&&!combat.charging&&!roll&&!jet;
 if(canAct(combat))player.crouched=crouch;
 syncBody();const w=bodyWidth(),h=bodyHeight();
 if(dive&&(!canAct(combat)||clingTo))dive=null;
 {const st=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);if(dive&&st)dive.dir=st;}
 if(roll){roll.t-=dt;if(!canAct(combat))roll=null;else if(roll.t<=0)endRoll(false);}
 const steer=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);dashT=Math.max(0,dashT-dt);bargeT=Math.max(0,bargeT-dt);grabWait=Math.max(0,grabWait-dt);
 // Holding against the roll bursts out early.
 if(roll&&player.grounded&&steer===-roll.dir)endRoll(false);
 running=!roll&&!jet&&!!steer&&canAct(combat)&&!player.crouched&&!clingTo&&!combat.charging&&!dive&&(player.grounded?keys.has('ShiftLeft')||keys.has('ShiftRight')||runLatch:airRun);
 const gait=dive?MV.diveSteer:running?(dashT>0&&player.grounded?MV.dashSpeed:MV.runSpeed):1;
 let dx=roll?roll.dir*C.moveSpeed*MV.rollSpeed*Math.sqrt(scale(combat))*dt:!canAct(combat)||player.crouched||clingTo?0:steer*C.moveSpeed*gait*(combat.superTime>0?B.superSpeed:1)*(combat.charging?B.chargeSlow:1)*(held?VC.holdSlow:1)*(jet?(isBelial()?B.vomitSlow:B.jetSlow):1)*(submerged(player.x+bodyWidth()/2)?R.wadeSlow:1)*dt;
 if(dx)player.face=dx>0?1:-1;
 const inputDx=dx;
 const kb=combat.transform>0||combat.ultimateTime>0?0:combat.knockback*dt;
 dx+=kb;let nx=Math.max(0,Math.min(worldWidth-w,player.x+dx)),wall:typeof clingTo=null;
 for(const b of buildings)if(solid(b)&&overlaps({x:nx,y:player.y,w,h},{x:b.x,y:b.base-b.h,w:b.w,h:b.h})){if(inputDx&&Math.sign(b.x+b.w/2-player.x-w/2)===Math.sign(inputDx))wall=b;nx=dx>0?Math.min(nx,b.x-w):dx<0?Math.max(nx,b.x+b.w):player.x;if(Math.abs(combat.knockback)>M.collisionImpactMin)receiveHit(combat,Math.abs(combat.knockback)*M.collisionPlayerDamage,'environment');combat.knockback=0;}
 if(rival&&!rival.dead&&overlaps({x:nx,y:player.y,w,h},rival))nx=dx>0?rival.x-w:dx<0?rival.x+rival.w:player.x;
 if(running&&player.grounded&&steer===runDir)runUp+=Math.abs(nx-player.x);else runUp=0;runDir=running?steer:0;
 walking=inputDx!==0&&player.grounded&&Math.abs(nx-player.x)>.01&&!roll;player.x=nx;
 // The ball smacks a wall: big hit, then ricochet back with a hop the first time, burst out the second.
 if(roll&&wall){hit(wall,MV.rollWallDamage*damageMultiplier(combat)*roll.power,false,roll.dir,{x:roll.dir>0?wall.x+4:wall.x+wall.w-4,y:player.y+h*.5});shake=Math.max(shake,7);
  if(roll.bounced)endRoll(true);else{roll.bounced=true;roll.dir=-roll.dir;player.face=roll.dir;roll.t=Math.min(roll.t,MV.rollAfterBounce);roll.hits.clear();player.vy=-jumpVelocity()*MV.rollHop;player.grounded=false;action='RICOCHET';actionTime=.8;}}
 if(roll)tickRoll(w,h);
 // Shoulder barge: running into a wall hits it (on a short cooldown); running through troops bowls them over.
 const gore=activeKaiju==='Kaiban';
 if(running&&player.grounded&&wall&&bargeT<=0&&runUp>=MV.bargeRunUp*scale(combat)){bargeT=MV.bargeCooldown;runUp=0;barges++;hit(wall,MV.bargeDamage*damageMultiplier(combat)*(dashT>0?1.5:1)*(gore?MV.goreMult:1),false,player.face,{x:player.face>0?wall.x+4:wall.x+wall.w-4,y:player.y+h*.5});shake=Math.max(shake,gore?7:4);action=gore?'GORE':'SHOULDER BARGE';actionTime=.6;}
 if(running&&player.grounded){for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps({x:player.x,y:player.y,w,h},u)&&(bargeHits.get(u)??-9)<time-.6){bargeHits.set(u,time);hitUnit(military,u,MV.bargeUnitDamage*damageMultiplier(combat)*(gore?MV.goreUnitMult:1),'player',MV.bargeKnockback*(gore?MV.goreUnitMult:1),player.face,false,'melee');}
  // Gore Charge: cars in the way get flipped up over the tusks instead of stamped flat.
  if(gore)for(const v of vehicles)if(loose(v)&&!bargeHits.has(v)&&overlaps({x:player.x+w*.3,y:player.y,w:w*.7,h},vehicleBox(v))){bargeHits.set(v,time);puntVehicle(v,MV.bargeDamage*damageMultiplier(combat),player.face,false,MV.goreLift);}
  if(particles.length<C.particleCap&&Math.random()<dt*24)particles.push({x:player.x+w/2-player.face*w*.4,y:player.y+h-3,vx:-player.face*(40+Math.random()*90),vy:-(30+Math.random()*80),life:.3+Math.random()*.25,color:'#c9a77c',size:2+Math.floor(Math.random()*3)});}
 if(Math.abs(kb)>0&&Math.abs(combat.knockback)>M.collisionImpactMin){
 for(const b of buildings)if(b.hpNow>0&&overlaps({x:player.x,y:player.y,w,h},{x:b.x,y:b.base-b.h,w:b.w,h:b.h})){
 if(b.kind!=='large'){damageBuilding(b,Math.abs(combat.knockback)*M.collisionBuildingDamage,'impact');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);}
 receiveHit(combat,Math.abs(combat.knockback)*M.collisionPlayerDamage,'environment');combat.knockback=0;break;
 }}
 let prevBottom=player.y+h,climbing=false;const wasGrounded=player.grounded;
 // The Stampede keeps gravity on (so charging off a roof drops him); every other Ultimate holds the kaiju in place.
 if(combat.transform<=0&&(combat.ultimateTime<=0||stampede)){
 player.grounded=false;
 if(!keys.has('KeyW'))grabLock=false;
 const onWall=(b:NonNullable<typeof clingTo>)=>solid(b)&&player.x+w>=b.x-4&&player.x<=b.x+b.w+4&&player.y+h>b.base-b.h+2;
 if(clingTo&&(!onWall(clingTo)||!canAct(combat)||combat.charging))clingTo=null;
 if(!clingTo&&!grabLock&&!held&&!dive&&!roll&&keys.has('KeyW')&&canAct(combat)&&!combat.charging){clingTo=buildings.find(onWall)||null;if(clingTo)mantled=false;}
 // Leap-grab: airborne and steering into a wall catches it; feet near the roof pull straight up onto it (ledge grab).
 if(!clingTo&&wall&&!wasGrounded&&grabWait<=0&&!held&&!dive&&!roll&&canAct(combat)&&!combat.charging&&onWall(wall)){
  if(player.y+h<=wall.base-wall.h+h*MV.ledgeGrab){mantle(wall,w,h);prevBottom=wall.base-wall.h-.01;}else{clingTo=wall;mantled=false;airRun=false;}}
 if(clingTo){
 const b=clingTo,roof=b.base-b.h;
 player.face=player.x+w/2<b.x+b.w/2?1:-1;
 // Pushing into the wall climbs just like W.
 const into=player.face>0?keys.has('KeyD'):keys.has('KeyA');
 climbDir=(keys.has('KeyS')?1:0)-(keys.has('KeyW')||into&&!keys.has('KeyS')?1:0);climbing=true;player.vy=climbDir*C.climbSpeed;player.y+=player.vy*dt;
 if(climbDir<0&&player.y+h<=roof+8){mantle(b,w,h);climbing=false;prevBottom=roof-.01;}
 }
 if(!climbing){player.vy+=C.gravity*dt;player.y+=player.vy*dt;}
 isClimbing=climbing;
 }
 if(!climbing&&player.vy>=0)for(const b of buildings){if(!solid(b))continue;const roof=b.base-b.h;
 if(player.x+w>b.x&&player.x<b.x+b.w&&prevBottom<=roof+1&&player.y+h>=roof){player.y=roof-h-.01;player.vy=0;player.grounded=true;}}
 {const g=groundAt(player.x+w/2);if(player.y+h>=g||wasGrounded&&!climbing&&player.vy>=0&&player.y+h>=g-Math.max(10,Math.abs(dx)*1.6+4)&&!buildings.some(b=>solid(b)&&player.x+w>b.x&&player.x<b.x+b.w&&Math.abs(b.base-b.h-player.y-h)<2)){player.y=g-h;player.vy=0;player.grounded=true;}}
 if(player.grounded){clingTo=null;isClimbing=false;airRun=false;if(dive){if(slamLand())player.vy=MV.diveSpeed*Math.sqrt(scale(combat));else dive=null;}}
 // Dive trail: dust streaming up off the plunging body.
 if(dive&&particles.length<C.particleCap)particles.push({x:player.x+Math.random()*w,y:player.y+Math.random()*h*.4,vx:(Math.random()-.5)*40,vy:-(160+Math.random()*120),life:.25,color:'#e8d8ab',size:2+Math.floor(Math.random()*3)});
 // A charging Stampede plows through buildings; anything still standing pushes him out once the charge ends.
 if(!stampede?.charging)player.x=separateHorizontal({x:player.x,y:player.y,w,h},solidBodies(),worldWidth);
 // Creaking towers shudder and shed slabs off the facade, then go over.
 for(const b of buildings)if(b.creak>0){b.creak=Math.max(0,b.creak-dt);if(rand()<dt*7)spawnSlabs(b.x+b.w*rand(),b.base-b.h*(.5+rand()*.45),b.tiltDir,b.color,1,b.toppleUlt,.6);
  if(rand()<dt*30&&particles.length<C.particleCap)particles.push({x:b.x+rand()*b.w,y:b.base-b.h*rand(),vx:(rand()-.5)*30,vy:20,life:.6,color:'#cfc6a8',size:2});
  if(b.creak===0){b.topple=1;b.tilt=0;b.tiltV=F.toppleKick;}}
 for(const b of buildings)if(b.topple===1){b.tiltV+=F.toppleAccel*Math.sin(b.tilt+.2)*dt;b.tilt+=b.tiltV*dt;if(b.tilt>=Math.PI/2){b.tilt=Math.PI/2;b.topple=2;landTopple(b);}}
 for(const b of buildings){if(b.hpNow<=0&&b.collapse>0&&b.collapse<=dt&&!b.topple&&!b.creak)heapRubble(b);b.sway=Math.max(0,b.sway-dt);b.collapse=Math.max(0,b.collapse-dt);b.jolt=Math.max(0,b.jolt-dt);if(b.kind==='tiny'&&!b.role&&b.hpNow>0&&overlaps({x:player.x,y:player.y,w,h},{x:b.x,y:b.base-b.h,w:b.w,h:b.h})){if(Math.abs(kb)>.01){damageBuilding(b,b.hpNow,'impact');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);}else hit(b,b.hpNow);}}
 for(const v of vehicles)if(loose(v)&&overlaps({x:player.x+w*.18,y:player.y,w:w*.64,h},vehicleBox(v)))flattenVehicle(v,Math.abs(kb)<.01);
 echo=true;tickVehicles(dt);echo=false;
 award(tickPopulation(population,dt,{x:player.x,y:player.y,w,h},worldWidth,Math.abs(kb)<.01));
 for(const s of shots){const old=s.x;s.x+=s.vx*dt;s.life-=dt;
 if(projectileStrike(old,s.y,s.x,s.y,s.damage,s.knockback,Math.sign(s.vx)||1,s.y))s.life=0;}
 // Debris Shotgun rocks fly ballistic, stop on the first thing they hit and crumble on the street.
 echo=true;
 for(const r of rocks){const ox=r.x,oy=r.y;r.vy+=B.debrisGravity*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;r.life-=dt;r.spin+=dt*14;
 if(projectileStrike(ox,oy,r.x,r.y,r.damage,r.knockback,Math.sign(r.vx)||1,r.y))r.life=0;
 if(r.life>0&&r.y>=groundAt(r.x)-2){r.life=0;burst(r.x,groundAt(r.x)-3,'#c9a77c',3);}}
 rocks=rocks.filter(r=>r.life>0&&r.x>0&&r.x<worldWidth);
 // Magma Dive globs: ballistic like the rocks; a glob that reaches the street splats into a small lava pool.
 for(const g of globs){const ox=g.x,oy=g.y;g.vy+=(g.grav??B.debrisGravity)*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.life-=dt;
 if((!g.ult||g.vy>0)&&projectileStrike(ox,oy,g.x,g.y,g.damage,g.ult?90:40,Math.sign(g.vx)||1,g.y,g.ult,g.ult?{x:g.x,y:g.y}:undefined)){g.life=0;burst(g.x,g.y,'#ff8a1f',g.ult?8:4);if(g.ult)eruptLandings.push(g.x);}
 if(g.life>0&&g.y>=groundAt(g.x)-2){g.life=0;const grow=Math.sqrt(scale(combat)),dm=damageMultiplier(combat);
  if(g.ult){eruptLandings.push(g.x);addPool(g.x,B.eruptPool*grow,B.eruptPoolDamage*dm,true,B.eruptPoolSeconds);burst(g.x,groundAt(g.x)-3,'#ffb13b',8);shake=Math.max(shake,3);}
  else{addPool(g.x,MV.lavaGlobPool*grow,MV.lavaPoolDamage*dm);burst(g.x,groundAt(g.x)-3,'#ff8a1f',4);}}}
 globs=globs.filter(g=>g.life>0&&g.x>0&&g.x<worldWidth);tickRain(dt);tickPools(dt);tickBurns(dt);tickCorrosion(dt);echo=false;

 shots=shots.filter(s=>s.life>0&&s.x>0&&s.x<worldWidth);
 if(combat.ultimateTime<=0){stampede=null;eruption=null;}
 if(deluge)tickDeluge(dt,w,h);
 if(combat.ultimateTime>0&&stampede)tickStampede(dt,w,h);
 else if(combat.ultimateTime>0&&eruption)tickEruption(dt,w,h);
 else if(combat.ultimateTime>0&&!deluge&&!isBelial()){ultimateTimer-=dt;if(ultimateTimer<=0){ultimateTimer+=B.ultimatePulse;
 for(const direction of [-1,1])waves.push({x:player.x+w/2,vx:direction*B.ultimateSpeed,life:B.ultimateRange/B.ultimateSpeed,max:B.ultimateRange/B.ultimateSpeed,damage:B.ultimateDamage*damageMultiplier(combat),hits:new Set(),ult:true,size:1,knockback:280});shake=Math.max(shake,4);}}
 echo=true;
 for(const wave of waves){const old=wave.x,z=wave.size;wave.x+=wave.vx*dt;wave.life-=dt;for(const b of buildings)if(b.hpNow>0&&!wave.hits.has(b)&&Math.max(old,wave.x)+22*z>=b.x&&Math.min(old,wave.x)-22*z<=b.x+b.w){wave.hits.add(b);hit(b,wave.damage,wave.ult,Math.sign(wave.vx)||1,{x:wave.x,y:groundAt(wave.x)-18*z});}for(const g of growths)if(g.hp>0&&!wave.hits.has(g)&&Math.abs(g.x-wave.x)<40*z){wave.hits.add(g);hitGrowth(g,wave.damage);}
  // Tremor waves kick up rock and dust as they roll.
  if(!wave.ult&&Math.random()<dt*28&&particles.length<C.particleCap)particles.push({x:wave.x+(Math.random()-.5)*24*z,y:groundAt(wave.x)-4,vx:Math.sign(wave.vx)*(40+Math.random()*90),vy:-(90+Math.random()*170)*z,life:.35+Math.random()*.35,color:Math.random()<.5?'#c9a77c':'#8d7a66',size:2+Math.floor(Math.random()*3*z)});}
 if(rival?.dead){echo=false;winCity();return;}
 for(const wave of waves){const z=wave.size,box={x:wave.x-30*z,y:groundAt(wave.x-30*z)-48*z,w:60*z,h:48*z};
 if(objective&&!objective.shattered&&!wave.hits.has(objective)&&overlaps(box,{x:objective.x-30,y:groundAt(objective.x)-100,w:60,h:100})){wave.hits.add(objective);hitObjective(wave.damage);}
 if(rival&&!rival.dead&&!wave.hits.has(rival)&&overlaps(box,rival)){wave.hits.add(rival);strikeRival(wave.damage,wave.knockback,Math.sign(wave.vx),wave.ult);}
 for(const u of military.units)if(u.hp>0&&!wave.hits.has(u)&&overlaps(box,u)){wave.hits.add(u);hitUnit(military,u,wave.damage,'player',wave.knockback,Math.sign(wave.vx),wave.ult,wave.ult?'ultimate':'ranged');}
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-6,y:p.y-6,w:12,h:12}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&!wave.hits.has(v)&&overlaps(box,vehicleBox(v))){wave.hits.add(v);puntVehicle(v,wave.damage*.5,Math.sign(wave.vx)||1,wave.ult,1.6);}
 }
 echo=false;if(rival?.dead){winCity();return;}
 if(rival){for(const hit of tickRival(rival,dt,{x:player.x,y:player.y,w,h},worldWidth,buildings))receiveHit(combat,hit.damage,'boss',hit.strength,hit.direction);for(const b of buildings)if(b.hpNow<b.hp)releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);if(endIfDead())return;}
 tickCity(dt,w);tickRiver(dt,w);tickFire(dt);
 tickMilitary(military,dt,camera,worldWidth,{x:player.x,y:player.y,w,h},destruction(buildings),rival||undefined,Math.abs(kb)<.01?'player':'military',viewW(),combat.stage);drainMilitary();syncBody();if(endIfDead())return;
 waves=waves.filter(w=>w.life>0&&w.x>0&&w.x<worldWidth);
 // Ambient crystals and growths appear ahead of the kaiju (the way it faces), so heading west still finds them.
 ambientTimer+=dt;growthTimer+=dt;
 if(ambientTimer>=B.ambientInterval){ambientTimer=0;dropShards(Math.max(80,Math.min(worldWidth-80,player.x+w/2+55*player.face)),B.ambientCount);}
 if(growthTimer>=B.growthInterval){growthTimer=0;if(growths.filter(g=>g.hp>0).length<B.growthCap)growths.push({x:Math.max(60,Math.min(worldWidth-100,player.x+w/2+140*player.face)),hp:B.growthHP});}
 growths=growths.filter(g=>g.hp>0);
 for(const shard of shards){shard.life-=dt;shard.vy+=380*dt;shard.x+=shard.vx*dt;shard.y+=shard.vy*dt;shard.vx*=Math.exp(-dt*4);
 shard.x=Math.max(8,Math.min(worldWidth-8,shard.x));
 if(shard.y>groundAt(shard.x)-10){shard.y=groundAt(shard.x)-10;shard.vy=0;}
 const px=player.x+w/2,py=player.y+h*.65,dist=Math.hypot(shard.x-px,shard.y-py);
 if(dist<B.shardMagnet){shard.x+=(px-shard.x)*Math.min(1,dt*6);shard.y+=(py-shard.y)*Math.min(1,dt*6);}
 if(overlaps({x:player.x-8,y:player.y-8,w:w+16,h:h+20},{x:shard.x-5,y:shard.y-8,w:10,h:16})){const before=combat.stage;collectCrystal(combat,B.shardValue);shard.life=0;if(before!==combat.stage){action=`EVOLUTION · STAGE ${combat.stage}`;actionTime=1.6;burst(px,py,'#f7a2d3',30);}}}
 shards=shards.filter(s=>s.life>0);syncBody();
 for(const c of chunks){c.life-=dt;c.vy+=F.chunkGravity*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y+c.s>=groundAt(c.x+c.s/2)){c.y=groundAt(c.x+c.s/2)-c.s;if(c.bounces<1&&c.vy>60){c.vy*=-.32;c.vx*=.5;c.bounces++;}else{c.vy=0;c.vx*=Math.exp(-dt*9);}}}chunks=chunks.filter(c=>c.life>0);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
 // Horizontal lead and vertical follow are worked out in screen space so they hold at any zoom.
 const vw=viewW();
 const target=Math.max(0,Math.min(worldWidth-vw,player.x+bodyWidth()/2-vw*(.42-.08*player.face)));camera+=(target-camera)*Math.min(1,dt*C.cameraSpeed);
 // Lift only as far as needed to keep the drawn sprite's head (sprites run ~1.4x their hitbox) below line 130, so the street stays in view.
 const head=player.y+bodyHeight()-1.4*bodyHeight(),targetY=Math.max(0,Math.min(C.maxCameraY,C.ground-head+(130-C.ground)/zoom));cameraY+=(targetY-cameraY)*Math.min(1,dt*C.cameraSpeed*1.4);
 if(objectiveOpen()&&(player.x>=worldWidth-bodyWidth()-3||(openLayout()&&player.x<=3)))results();
}
function rect(x:number,y:number,w:number,h:number,color:string){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function text(s:string,x:number,y:number,size=12,color='#e7edde',align:CanvasTextAlign='left'){ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.fillText(s,Math.round(x),Math.round(y));}
function poly(points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();}
function background(){
 // W covers the zoomed-out view; layers repeat across it and the street fill runs down past the old 540 floor.
 const W=viewW()+100,top=C.ground-(C.ground+cameraY)/zoom-20,th=CITIES[cityIndex],m=th.mood,night=m.lights>.6;
 // Sky: a gradient from the city's zenith colour down to its horizon light (flat fill where gradients are unavailable).
 const g=ctx.createLinearGradient?.(0,top,0,C.ground);if(g&&g.addColorStop){g.addColorStop(0,m.top);g.addColorStop(1,m.bottom);ctx.fillStyle=g;ctx.fillRect(0,top,W,540-top);}else rect(0,top,W,540-top,m.bottom);
 if(night)for(let k=0;k<60;k++){const sx=(k*137%997)/997*W,sy=top+((k*71%331)/331)*(260-top);if(sy<300)rect(sx,sy,k%7?1:2,k%7?1:2,(Math.sin(time*2+k)>.6)?'#ffffff':'#c9d4e8');}
 // Sun (or moon), low in the sky so it reads behind the skyline.
 {const sx=W*.72-camera*.02,sy=m.lights>.6?150:m.lights>.35?250:170,r=m.lights>.35&&m.lights<.6?46:m.lights>.6?18:30;ctx.globalAlpha=m.lights>.6?.9:.75;
  ctx.fillStyle=m.sun;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();if(!night){ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(sx,sy,r*1.8,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 farSkyline(th.style,W,m);
 // Two parallax layers of city in the mood's colours; windows light up as the light goes.
 for(let i=-1,n=W/79+1;i<n;i++){const x=i*79-(camera*.13)%79,h=50+((i+22)*47%115);rect(x,315-h,50,h,m.far);rect(x+18,305-h,10,10,m.far);
  if(night)for(let yy=322-h;yy<310;yy+=12)for(let xx=6;xx<44;xx+=11)if(((i*31+yy*7+xx)>>1)%4===0)rect(x+xx,yy,3,4,m.win+'99');}
 for(let i=-1,n=W/102+1;i<n;i++){const x=i*102-(camera*.26)%102,h=80+((i+17)*37%110);rect(x,370-h,65,h,m.mid);rect(x+4,374-h,56,4,m.far);
  for(let yy=390-h;yy<360;yy+=15)for(let xx=8;xx<59;xx+=15){const on=((i*13+yy*3+xx)>>2)%5<m.lights*4;rect(x+xx,yy,5,7,on?m.win:night?'#1d2536':m.far);}}
 if(m.smog){ctx.globalAlpha=.28;rect(0,250,W,C.ground-250,'#e8b778');ctx.globalAlpha=1;}
 // Dense near-layer towers crowd the street and close in the skyline. Open layouts skip them so plazas read as open ground.
 if(!openLayout())for(let i=-1,n=W/88+1;i<n;i++){const x=i*88-(camera*.5)%88,h=170+((i+31)*53%150);rect(x,C.ground-4-h,78,h,m.near);rect(x+78,C.ground-4-h,10,h,m.near);rect(x-2,C.ground-4-h,82,5,m.mid);for(let yy=C.ground-h+4;yy<C.ground-20;yy+=17)for(let xx=7;xx<72;xx+=16)rect(x+xx,yy,7,9,(i+yy)%5<1+m.lights*2?m.win:'#2a3540');}
 if(!hasTerrain()){rect(0,C.ground-4,W,10,'#c9c5ab');rect(0,C.ground+6,W,99,'#4c5755');rect(0,C.ground+8,W,3,'#202e31');
 for(let i=-1,n=W/85+1;i<n;i++)rect(i*85-camera%85,487,37,3,'#b4b294');rect(0,513,W,27+C.ground/zoom,'#34413f');}
 else{// Terrain: the curb, road and roadbed follow the ground profile; earth fills down to the bottom of the view.
  const bottom=540+C.ground/zoom,band=(off:number,th:number,col:string)=>{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-8,bedAt(camera-8)+off);
   for(let x=0;x<=W+8;x+=8)ctx.lineTo(x,bedAt(x+camera)+off);for(let x=W+8;x>=-8;x-=8)ctx.lineTo(x,bedAt(x+camera)+off+th);ctx.closePath();ctx.fill();};
  // Where the street dips below the normal street line (not into a pit or a river, drawn separately), the far side of the dip is a stone retaining wall (capstone and railing
  // at street level), so the sunken stretch reads as a plaza, not a gap onto the sky.
  const wt=C.ground-4;const dipAt=(x:number)=>pitAt(x+camera)?wt:bedAt(x+camera)-4;let dipped=false;for(let x=-8;x<=W+8;x+=8)if(dipAt(x)>wt+1){dipped=true;break;}
  if(dipped){ctx.fillStyle='#8c8775';ctx.beginPath();ctx.moveTo(-8,wt);for(let x=-8;x<=W+8;x+=8)ctx.lineTo(x,Math.max(wt,dipAt(x)));ctx.lineTo(W+8,wt);ctx.closePath();ctx.fill();
   for(let x=-((camera%26)+26);x<W+26;x+=26){const d=dipAt(x+13)-wt;if(d<3)continue;
    for(let r=0;r*12<d;r++){const yy=wt+r*12;rect(x+(r%2?13:0),yy,1,Math.min(12,d-r*12),'#6f6b5c');rect(x,yy+11,26,1,'#6f6b5c');}
    rect(x,wt-3,26,4,'#c9c5ab');rect(x+3,wt-15,2,12,'#56625e');rect(x+16,wt-15,2,12,'#56625e');rect(x,wt-15,26,2,'#56625e');}}
  band(-4,bottom,'#34413f');band(-4,10,'#c9c5ab');band(6,99,'#4c5755');band(8,3,'#202e31');
  for(let i=-1,n=W/85+1;i<n;i++){const x=i*85-camera%85;rect(x,bedAt(x+18+camera)+52,37,3,'#b4b294');}
  drawRiverBack();}
 // Street lamps are world props now (src/vehicles.ts createLamps), drawn with the vehicles.
}
function drawBuilding(b:typeof buildings[number]){
 if(b.topple===2||b.lifted)return;
 // Falling: draw the intact structure rotated about its base corner on the fall side.
 if(b.topple===1){const px=(b.tiltDir>0?b.x+b.w:b.x)-camera;if(px+b.h<-60||px-b.h>viewW()+60)return;ctx.save();ctx.translate(px,b.base);ctx.rotate(b.tiltDir*b.tilt);ctx.translate(-px,-b.base);drawStructure(b,b.x-camera,b.h);ctx.restore();return;}
 const x=b.x-camera+(b.jolt>0?b.joltDir*F.joltPixels*b.jolt/F.joltSeconds:0);if(x>viewW()+40||x+b.w<-40)return;
 // Creaking: shudder and start to lean the way it will fall.
 if(b.creak>0&&b.topple===0){const lean=.05*(1-Math.min(1,b.creak/Y.creakSeconds)),px=(b.tiltDir>0?b.x+b.w:b.x)-camera,sx=Math.sin(time*70)*2;
  ctx.save();ctx.translate(px,b.base);ctx.rotate(b.tiltDir*lean);ctx.translate(-px,-b.base);drawStructure(b,x+sx,b.h);ctx.restore();return;}
 if(b.hpNow<=0&&b.collapse<=0&&CITIES[cityIndex].material.frame&&b.kind!=='tiny'&&!b.role){// Steel-framed towers leave their skeleton standing.
  const fh=Math.min(b.h,320)*.45,cols=Math.max(2,Math.round(b.w/40));ctx.globalAlpha=.9;for(let k=0;k<=cols;k++){const fx=x+k*(b.w-6)/cols;rect(fx,b.base-fh*(k%2?.8:1),4,fh*(k%2?.8:1),'#5d6a7a');}
  for(let yy=b.base-fh*.8;yy<b.base;yy+=24)rect(x,yy,b.w-2,3,'#6c7480');ctx.globalAlpha=1;}
 if(b.hpNow<=0&&b.collapse<=0){rect(x,b.base-7,b.w,7,'#62625b');for(let j=0;j<b.w;j+=13)rect(x+j,b.base-8-(j%7),10,8+j%7,'#898879');return;}
 const squash=b.hpNow<=0?b.collapse/C.collapseDuration:1,sunk=b.sink>0,sw=b.sway>0?Math.sin(b.sway*18)*.012*b.sway:0;
 if(sunk||sw){ctx.save();if(sunk){ctx.beginPath();ctx.rect(x-20,-4000,b.w+40,4000+b.base-b.sink);ctx.clip();}if(sw){ctx.translate(x+b.w/2,b.base);ctx.rotate(sw);ctx.translate(-(x+b.w/2),-b.base);}}
 drawStructure(b,x,b.h*squash);if(sunk||sw)ctx.restore();if(b.hpNow>0)drawCorrosion(b,x,b.h);
 if(b.collapse>0){rect(x-5,b.base-14,b.w+10,14,'#b1ac91');}
}
function drawStructure(b:typeof buildings[number],x:number,h:number){
 const y=b.base-h;
 if(b.role){drawUtility(b,x,h);return;}
 const g=gridOfB.get(b)??-1,lit=g>=0&&power[g];
 if(b.landmark&&b.shape&&b.shape!=='tower')drawLandmarkShape(b,x,y,h);else facade(b,x,y,h,lit);
 if(b.label&&h>35&&!b.landmark){rect(x+4,y+h-47,b.w-16,17,'#263e46');text(b.label,x+(b.w-8)/2,y+h-35,9,'#eddfa8','center');}
 // Landmarks: stepped crown and blinking spire (seen when climbing), gold pilasters, and a street-level name banner.
 if(b.landmark&&(!b.shape||b.shape==='tower')){const cx=x+(b.w-7)/2;for(let px=x+8;px<x+b.w-14;px+=34)rect(px,y+7,3,h-7,'#e4cf8a');rect(x+12,y-14,b.w-31,14,b.color);rect(x+9,y-17,b.w-25,4,'#e4cf8a');rect(x+36,y-34,b.w-79,20,b.color);rect(x+33,y-37,b.w-73,4,'#e4cf8a');
  rect(cx-3,y-80,6,44,'#d9c894');rect(cx-1,y-94,2,14,'#f2e6b8');if(Math.sin(time*4)>0)rect(cx-2,y-97,4,4,'#f58f8f');}
 if(b.landmark&&h>70){const cx=x+(b.w-7)/2;rect(x+6,y+h-58,b.w-19,21,'#3a3524');rect(x+6,y+h-58,b.w-19,2,'#e4cf8a');text(b.label,cx,y+h-43,11,'#f1dc96','center');}
 // Caches look ordinary but one window flashes crystal pink now and then; damage exposes the vein.
 if(b.cache&&b.hpNow>0){if((time*1.3+b.x*.01)%3<.3)rect(x+Math.round(b.w*.45),y+Math.round(h*.45),10,13,'#f6a8d6');if(b.hpNow/b.hp<.68)poly([[x+b.w*.3,y+h*.3],[x+b.w*.45,y+h*.5],[x+b.w*.35,y+h*.7],[x+b.w*.55,y+h*.55],[x+b.w*.42,y+h*.32]],'#f39bd0');}
 if(b.hpNow/b.hp<.68){poly([[x+20,y+13],[x+25,y+38],[x+16,y+51],[x+31,y+41],[x+24,y+11]],'#293e44');rect(x+b.w-32,y+h*.4,19,22,'#3e4a4c');}
 if(b.hpNow/b.hp<.34){poly([[x+45,y+7],[x+36,y+63],[x+52,y+87],[x+44,y+61],[x+54,y+9]],'#283b3f');rect(x+10,y+h*.55,20,30,'#304347');for(let n=0;n<3;n++)rect(x+b.w*.6+Math.sin(time*2+n)*5,y+15-n*14-(time*8%14),14+n*5,12,'#69736c');}
 // Holes stay where each blow landed (scaled with any squash); jagged, darker core, pale broken rim.
 for(const o of b.holes as (typeof b.holes[number]&{shape?:number[]})[]){if(o.y>b.h)continue;const cx=x+o.x,cy=b.base-o.y*h/b.h;
  if(!o.shape){o.shape=[];for(let k=0;k<8;k++){const a=k/8*Math.PI*2,j=.62+.38*Math.abs(Math.sin(o.seed*12.9898+k*78.233));o.shape.push(Math.cos(a)*o.r*j,Math.sin(a)*o.r*j);}}
  const q=o.shape,ring=(ox:number,oy:number,kx:number,ky:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();for(let k=0;k<16;k+=2){const px=cx+ox+q[k]*kx,py=cy+oy+q[k+1]*ky;if(k)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();ctx.fill();};
  ring(1,-1,1,.85,'#cfc6a8');const lit=CITIES[cityIndex].mood.lights>.4||o.seed%3===0;ring(0,0,1,.85,lit?'#7a5a32':'#3a3530');ring(0,.25*o.r,.8,.35,lit?'#d9a84e':'#4a4036');rect(cx-o.r*.75,cy+o.r*.12,o.r*1.5,2,'#151515');ring(0,-.2*o.r,.35,.25,'#121c20');}
 // Floors worn past half show a crack across that storey (two at a quarter).
 if(b.floors?.length){const fh=h/b.floors.length;b.floors.forEach((v,i)=>{if(v>b.floorMax*.5)return;const yy=b.base-(i+1)*fh+fh*.15,deep=v<b.floorMax*.25;
  for(let xx=4;xx<b.w-12;xx+=10){const j=((xx*7+i*13)%9)-4;rect(x+xx,yy+j*.6,11,2,'#20302f');}if(deep)for(let k=0;k<3;k++){const kx=x+b.w*(.2+k*.27);poly([[kx,yy],[kx+4,yy+fh*.35],[kx-2,yy+fh*.6],[kx+1,yy+fh*.6],[kx+7,yy+fh*.33],[kx+3,yy]],'#20302f');}});}
 {const p=roofOf.get(b);if(p&&!p.dead)drawRoof(p,x,h);}
 drawBlaze(b,x,h);
 if(b.jolt>F.joltSeconds*.55){ctx.globalAlpha=.5;rect(x,y,b.w-7,h,'#fff4dc');ctx.globalAlpha=1;}
}
// Facades by city. Every style keeps the same footprint (and hitbox); only the drawing changes. Windows light up with the city's
// mood (night cities are mostly lit) and on a powered city-systems grid.
function facade(b:typeof buildings[number],x:number,y:number,h:number,gridLit:boolean){const th=CITIES[cityIndex],m=th.mood,bw=b.w-7,base=b.base,st=th.style;
 const seed=(n:number)=>((n*2654435761+b.x*97)>>>0)%1000/1000,win=(xx:number,yy:number,dark:string)=>(seed(xx*7+yy*13)<m.lights*.55+(gridLit?.2:0))?m.win:dark;
 rect(x+5,y+8,b.w,h-8,'#222b31');rect(x,y,bw,h,b.color);
 if(st==='nyc'){for(let yy=y+10;yy<base;yy+=6){ctx.globalAlpha=.12;rect(x,yy,bw,1,'#000000');ctx.globalAlpha=1;}
  rect(x-3,y,b.w+4,7,'#cbbfa4');rect(x-2,y+7,b.w+2,3,'#5d4a40');
  for(let yy=22;yy<h-30;yy+=22)for(let xx=10;xx<bw-10;xx+=19){rect(x+xx,y+yy,10,13,win(xx,yy,'#2c3a42'));rect(x+xx-1,y+yy-2,12,2,'#d8cdb4');}
  if(bw>70&&h>120){const fx=x+bw*.52,fw=bw*.42;ctx.strokeStyle='#262626';ctx.lineWidth=1;for(let yy=y+40;yy<base-40;yy+=44){rect(fx,yy+14,fw,2,'#262626');rect(fx,yy+8,fw,1,'#262626');
    ctx.beginPath();ctx.moveTo(fx+fw*.15,yy+16);ctx.lineTo(fx+fw*.85,yy+58);ctx.stroke();}}
  rect(x+14,base-26,16,26,'#2b2420');rect(x+12,base-29,20,3,'#d8cdb4');}
 else if(st==='mex'){rect(x-2,y-6,bw+4,8,'#f2ead8');if(seed(1)<.6)rect(x+bw*.62,y-18,14,12,'#1e1e1e');
  for(let yy=26;yy<h-44;yy+=24){rect(x,y+yy-4,bw,2,'#ffffff33');for(let xx=10;xx<bw-12;xx+=20){rect(x+xx,y+yy,10,14,win(xx,yy,'#3b2f2a'));if((yy/24|0)%2===0){rect(x+xx-3,y+yy+14,16,2,'#2b2b2b');rect(x+xx-3,y+yy+10,1,4,'#2b2b2b');rect(x+xx+12,y+yy+10,1,4,'#2b2b2b');}}}
  for(let ax=x+4;ax<x+bw-16;ax+=22){rect(ax,base-26,16,26,'#3a2a22');ctx.fillStyle='#3a2a22';ctx.beginPath();ctx.arc(ax+8,base-26,8,Math.PI,0);ctx.fill();}}
 else if(st==='par'){for(let yy=y+34;yy<base;yy+=11){ctx.globalAlpha=.1;rect(x,yy,bw,1,'#5a4a30');ctx.globalAlpha=1;}
  poly([[x-3,y+30],[x+6,y],[x+bw-6,y],[x+bw+3,y+30]],'#58626a');rect(x-4,y+30,bw+8,3,'#efe6d0');
  for(let dx=x+12;dx<x+bw-16;dx+=26){rect(dx,y+10,10,14,win(dx,1,'#2d3338'));poly([[dx-2,y+10],[dx+5,y+4],[dx+12,y+10]],'#58626a');}
  rect(x+bw*.2,y-10,8,10,'#b9ae96');rect(x+bw*.7,y-12,8,12,'#b9ae96');
  const rows=Math.floor((h-80)/28);for(let r=0;r<rows;r++){const yy=y+42+r*28;for(let xx=9;xx<bw-10;xx+=17)rect(x+xx,yy,8,18,win(xx,yy,'#39434a'));if(r===0||r===rows-1){rect(x+4,yy+18,bw-8,2,'#2b2b2b');for(let k=x+4;k<x+bw-4;k+=4)rect(k,yy+13,1,5,'#2b2b2b');}}
  for(let k=0;k*8<bw-8;k++)rect(x+4+k*8,base-36,8,9,k%2?'#b9473b':'#efe6d8');rect(x+14,base-24,14,24,'#2b2420');}
 else if(st==='hkg'){for(let yy=14;yy<h-24;yy+=13)for(let xx=6;xx<bw-8;xx+=13){rect(x+xx,y+yy,7,7,win(xx,yy,'#28303c'));if(seed(xx+yy)<.35)rect(x+xx+8,y+yy+4,4,3,'#d9d9d9');}
  for(let yy=40;yy<h-40;yy+=52){rect(x-9,y+yy,10,1,'#6a6a6a');for(let k=0;k<3;k++)rect(x-8+k*3,y+yy+1,2,5,['#d94f4f','#4fa3d9','#e8d26a'][k]);}
  if(h>160){const sx=x+bw,sy=y+h*.3,sl=Math.min(140,h*.35),on=Math.sin(time*7+b.x)>-.85;rect(sx,sy,13,sl,'#1b1b22');rect(sx+1,sy+1,11,sl-2,on?(seed(3)<.5?'#ff4fa3':'#4fd1ff'):'#4a2a40');for(let k=sy+6;k<sy+sl-8;k+=14)rect(sx+3,k,7,8,'#1b1b22');}
  rect(x+12,base-22,16,22,'#20262e');}
 else{ctx.globalAlpha=.09;for(let xx=x+12;xx<x+bw;xx+=12)rect(xx,y,1,h,'#ffffff');for(let yy=y+14;yy<base;yy+=14)rect(x,yy,bw,1,'#ffffff');ctx.globalAlpha=.08;poly([[x+bw*.2,y],[x+bw*.45,y],[x+bw*.1,base],[x-bw*.15,base]],'#ffffff');ctx.globalAlpha=1;
  for(let yy=y+14;yy<base-30;yy+=14)if(seed(yy)<m.lights*.6)rect(x+3,yy+3,bw-6,6,m.win+'99');
  if(h>140){const sx=x-13,sy=y+h*.22,sl=Math.min(150,h*.4),c=['#ff4fa3','#ffd84f','#4fd1ff'][Math.floor(seed(5)*3)];rect(sx,sy,12,sl,'#14141c');rect(sx+1,sy+1,10,sl-2,Math.sin(time*9+b.x*.3)>-.9?c:'#3a2a3a');for(let k=sy+5;k<sy+sl-8;k+=12)rect(sx+3,k,6,7,'#14141c');}
  if(seed(9)<.5&&bw>60){rect(x+6,y-26,bw-12,22,'#14141c');rect(x+8,y-24,bw-16,18,Math.sin(time*2+b.x)>0?'#e04a7a':'#4a7ae0');rect(x+12,y-18,bw-24,2,'#ffffff');rect(x+12,y-12,(bw-24)*.6,2,'#ffffff');}
  rect(x+12,base-24,20,24,'#9fe6ff55');}}
// Landmark silhouettes: the box is still the hitbox; the drawing is the monument.
function drawLandmarkShape(b:typeof buildings[number],x:number,y:number,h:number){const st=CITIES[cityIndex].style,bw=b.w-7,base=b.base,cx=x+bw/2,sh=b.shape;
 if(sh==='lattice'){const col=st==='tyo'?'#d9452f':'#6e5a48';ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,base);ctx.quadraticCurveTo(x+bw*.3,y+h*.45,cx-3,y+18);ctx.moveTo(x+bw,base);ctx.quadraticCurveTo(x+bw*.7,y+h*.45,cx+3,y+18);ctx.stroke();
  ctx.lineWidth=1;ctx.beginPath();for(let k=0;k<14;k++){const t=k/14,yy=base-t*(h-18),half=(bw/2)*(1-t)**1.6+3;ctx.moveTo(cx-half,yy);ctx.lineTo(cx+half*.6,yy-(h-18)/14);ctx.moveTo(cx+half,yy);ctx.lineTo(cx-half*.6,yy-(h-18)/14);}ctx.stroke();
  for(const t of [.28,.56]){const half=(bw/2)*(1-t)**1.6+3;rect(cx-half-4,base-t*(h-18),half*2+8,6,col);if(st==='tyo')rect(cx-half-4,base-t*(h-18)+6,half*2+8,3,'#eeeeee');}
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(cx,base,bw*.32,Math.PI,0);ctx.fillStyle=CITIES[cityIndex].mood.bottom;ctx.fill();rect(cx-1,y-30,2,48,col);if(Math.sin(time*4)>0)rect(cx-2,y-32,4,4,'#ff5a5a');return;}
 if(sh==='dome'){const gold=st==='mex',body=gold?'#ece4d2':'#ece6d6',dome=gold?'#d9a441':'#efe9da';rect(x,y+h*.38,bw,h*.62,body);for(let px=x+8;px<x+bw-8;px+=16)rect(px,y+h*.45,5,h*.5,'#d2c8b0');rect(x-4,y+h*.38,bw+8,8,'#c9bea2');
  ctx.fillStyle=dome;ctx.beginPath();ctx.ellipse(cx,y+h*.38,bw*.38,h*.26,0,Math.PI,0);ctx.fill();rect(cx-8,y+h*.06,16,18,body);ctx.beginPath();ctx.ellipse(cx,y+h*.06,9,10,0,Math.PI,0);ctx.fill();rect(cx-1,y-6,2,12,'#8a7a5a');
  rect(cx-14,base-40,28,40,'#3b3326');ctx.fillStyle='#3b3326';ctx.beginPath();ctx.arc(cx,base-40,14,Math.PI,0);ctx.fill();return;}
 if(sh==='twin'){const tall=st==='tyo',tw=bw*.36,col=b.color;rect(x,y,tw,h,col);rect(x+bw-tw,y,tw,h,col);rect(x+tw,y+h*.45,bw-tw*2,h*.55,col);
  if(tall){poly([[x,y],[x+tw/2,y-30],[x+tw,y]],col);poly([[x+bw-tw,y],[x+bw-tw/2,y-30],[x+bw,y]],col);}else{for(const tx of [x,x+bw-tw]){rect(tx-3,y,tw+6,6,'#9a8f78');for(let k=0;k<3;k++)rect(tx+6+k*(tw-12)/2,y+24,5,h*.3,'#3b3b3b');}
   ctx.fillStyle='#3b3b3b';ctx.beginPath();ctx.arc(cx,y+h*.6,Math.min(18,(bw-tw*2)*.35),0,Math.PI*2);ctx.fill();ctx.fillStyle='#c0405a';ctx.beginPath();ctx.arc(cx,y+h*.6,Math.min(12,(bw-tw*2)*.22),0,Math.PI*2);ctx.fill();}
  for(let yy=y+30;yy<base-40;yy+=18){rect(x+6,yy,tw-12,8,'#2c3a42');rect(x+bw-tw+6,yy,tw-12,8,'#2c3a42');}rect(cx-12,base-34,24,34,'#2b2420');return;}
 if(sh==='arch'){const col=st==='mex'?'#7a6f60':'#d8ccae';rect(x,y+(st==='mex'?h*.3:h*.25),bw,h*(st==='mex'?.7:.75),col);rect(x-3,y+(st==='mex'?h*.3:h*.25),bw+6,10,'#bfb293');
  const ah=h*.42,aw=bw*.42;rect(cx-aw/2,base-ah,aw,ah,'#1e2428');ctx.fillStyle='#1e2428';ctx.beginPath();ctx.arc(cx,base-ah,aw/2,Math.PI,0);ctx.fill();
  if(st==='mex'){ctx.fillStyle='#4f6a5c';ctx.beginPath();ctx.ellipse(cx,y+h*.3,bw*.3,h*.22,0,Math.PI,0);ctx.fill();rect(cx-3,y+h*.02,6,14,'#4f6a5c');}else{rect(x,y+h*.25,bw,h*.12,'#cfc3a5');for(let k=x+6;k<x+bw-6;k+=14)rect(k,y+h*.28,8,10,'#bfb293');}return;}
 if(sh==='needle'){const col=b.color;if(st==='tyo'){poly([[x+bw*.2,base],[cx-6,y+30],[cx+6,y+30],[x+bw*.8,base]],'#cfd6dc');rect(cx-18,y+h*.3,36,12,'#cfd6dc');rect(cx-14,y+h*.15,28,8,'#cfd6dc');rect(cx-2,y-40,4,72,'#cfd6dc');if(Math.sin(time*3)>0)rect(cx-3,y-44,6,5,'#ff5a5a');
   ctx.strokeStyle='#8c969e';ctx.beginPath();for(let k=0;k<12;k++){const yy=base-k*(h/12),half=(bw*.3)*(1-k/12)+6;ctx.moveTo(cx-half,yy);ctx.lineTo(cx+half,yy-h/12);}ctx.stroke();return;}
  poly([[x,base],[x,y+h*.3],[cx,y],[x+bw,y+h*.15],[x+bw,base]],col);ctx.strokeStyle='#dfe7ee';ctx.lineWidth=2;ctx.beginPath();for(let k=0;k<5;k++){const yy=base-k*(h*.85/5);ctx.moveTo(x,yy);ctx.lineTo(x+bw,yy-h*.17);ctx.moveTo(x+bw,yy);ctx.lineTo(x,yy-h*.17);}ctx.stroke();ctx.lineWidth=1;
  for(const k of [-1,1])rect(cx+k*bw*.3-1,y-28,2,32,'#dfe7ee');return;}
 if(sh==='pagoda'){const tiers=5;for(let t=0;t<tiers;t++){const tw=bw*(1-t*.13),th2=h*.8/tiers,tx=cx-tw/2,ty=base-(t+1)*th2;rect(tx+tw*.12,ty+6,tw*.76,th2-6,'#b8432f');poly([[tx-10,ty+10],[tx+6,ty],[tx+tw-6,ty],[tx+tw+10,ty+10]],'#3a2d2a');}
  rect(cx-2,base-h,4,h*.2,'#c9a441');for(let k=0;k<5;k++)rect(cx-5,base-h+6+k*8,10,3,'#c9a441');return;}
 facade(b,x,y,h,false);}
// Substation: a fenced yard with a gantry and two transformers on insulators. Fuel depot: two banded tanks with a hazard diamond.
function drawUtility(b:typeof buildings[number],x:number,h:number){const y=b.base-h,w=b.w,hurt=b.hpNow<b.hp*.55,live=b.hpNow>0&&powered(b.x+b.w/2);
 rect(x-2,b.base-7,w+4,7,'#5d6763');
 if(b.role==='armory'){drawArmory(b,x,h,y,w);}
 else if(b.role==='substation'){
  rect(x+w*.1,y+6,4,h-6,'#a3aca6');rect(x+w*.9-4,y+6,4,h-6,'#a3aca6');rect(x+w*.1,y+6,w*.8,4,'#a3aca6');rect(x+w*.1,y+16,w*.8,2,'#7f8984');
  for(let k=0;k<3;k++)rect(x+w*(.25+k*.25)-1,y+10,2,10,'#e8ead9');
  for(const k of [.16,.54]){const tx=x+w*k,tw=w*.3,ty=y+h*.42;rect(tx,ty,tw,b.base-7-ty,'#52605b');rect(tx+3,ty+4,tw-6,3,'#73837d');rect(tx+3,ty+12,tw-6,2,'#3f4b47');
   for(let i=0;i<3;i++){const ix=tx+5+i*(tw-10)/2;rect(ix-1,ty-12,3,12,'#d9dccd');rect(ix-2,ty-14,5,3,'#eef0e2');if(live&&Math.sin(time*7+i*2.1+b.x)>.93)rect(ix-4,ty-19,9,6,'#bfe8ff');}}
  for(let fx=x;fx<=x+w;fx+=9)rect(fx,b.base-h*.4,1,h*.4-7,'#7c8781');rect(x,b.base-h*.4,w,2,'#7c8781');rect(x,b.base-h*.25,w,1,'#7c8781');
  const sx=x+w*.44,sy=b.base-h*.33;rect(sx,sy,18,14,'#e6c23a');poly([[sx+10,sy+2],[sx+5,sy+8],[sx+9,sy+8],[sx+7,sy+13],[sx+13,sy+6],[sx+9,sy+6]],'#1d1d1d');
  if(hurt&&b.hpNow>0&&Math.sin(time*23+b.x)>.4)rect(x+w*(.2+.6*((time*3.1)%1)),y+h*.35,6,6,'#e8f6ff');
 }else{
  for(const k of [0,.5]){const tx=x+w*(.04+k*.92),tw=w*.42,ty=y+10;rect(tx,ty,tw,b.base-7-ty,'#d8d2ba');ctx.fillStyle='#d8d2ba';ctx.beginPath();ctx.ellipse(tx+tw/2,ty,tw/2,8,0,Math.PI,0);ctx.fill();
   rect(tx,ty+12,tw,3,'#8f8a76');rect(tx,b.base-22,tw,3,'#8f8a76');rect(tx+tw*.7,ty-2,3,b.base-ty-9,'#b4ae97');}
  rect(x+w*.4,b.base-26,w*.2,4,'#6c6a5e');const dx=x+w*.5,dy=y+h*.45;poly([[dx,dy-9],[dx+9,dy],[dx,dy+9],[dx-9,dy]],'#d8452f');rect(dx-1,dy-4,2,6,'#fff0c9');rect(dx-1,dy+3,2,2,'#fff0c9');
  if(hurt&&b.hpNow>0)for(let k=0;k<2;k++){const fx=x+w*(.25+k*.5),fh=8+5*Math.abs(Math.sin(time*13+k));poly([[fx-6,y+4],[fx,y+4-fh],[fx+6,y+4]],k?'#ffb13b':'#e8401a');}
 }
 if(b.jolt>F.joltSeconds*.55){ctx.globalAlpha=.5;rect(x,y,w,h,'#fff4dc');ctx.globalAlpha=1;}
}
// Armory: a red-brick drill hall with corner turrets, battlements, an arched gate and a flag. Cracks when hurt.
function drawArmory(b:typeof buildings[number],x:number,h:number,y:number,w:number){const base=b.base,hurt=b.hpNow<b.hp*.55;
 rect(x,y+h*.18,w,h*.82,'#8a5444');for(let yy=y+h*.18+6;yy<base-6;yy+=8)rect(x,yy,w,1,'#6f4033');
 for(const tx of [x-4,x+w-18]){rect(tx,y,22,h,'#7a4a3c');for(let k=0;k<3;k++)rect(tx+k*8,y-6,5,6,'#7a4a3c');rect(tx+8,y+h*.3,5,10,'#2c2422');}
 for(let k=0;k*12<w-36;k++)rect(x+18+k*12,y+h*.18-6,7,6,'#8a5444');
 const gx=x+w/2-14;rect(gx,base-h*.42,28,h*.42,'#2c2422');ctx.fillStyle='#2c2422';ctx.beginPath();ctx.arc(gx+14,base-h*.42,14,Math.PI,0);ctx.fill();
 for(let k=0;k<3;k++)rect(gx+4+k*8,base-h*.42,2,h*.42,'#5a4a3a');
 rect(x+w/2-30,y+h*.24,60,12,'#3a2622');text('ARMORY',x+w/2,y+h*.24+10,9,'#eddfa8','center');
 const fx=x+w-8;rect(fx,y-34,2,30,'#3c4547');rect(fx+2,y-34+Math.sin(time*5)*1,16,10,'#4e6b48');rect(fx+2,y-30,16,2,'#e4cf8a');
 if(hurt&&b.hpNow>0)for(let k=0;k<3;k++){const cx=x+w*(.25+k*.25);poly([[cx,y+h*.3],[cx+5,y+h*.5],[cx-2,y+h*.7],[cx+2,y+h*.7],[cx+8,y+h*.48],[cx+3,y+h*.3]],'#3a2420');}}
// Rooftop fixtures, drawn with their building (so they squash and lean with it). x is the building's screen x, h its drawn height.
function drawRoof(p:RoofProp,x:number,h:number){const r=roofBox(p,h),rx=r.x-p.b.x+x,ry=r.y,w=r.w,hh=r.h;
 if(p.kind==='tank'){const legs=hh*.34,body=hh-legs-8;for(const k of [.12,.4,.62,.86])rect(rx+w*k-1,ry+hh-legs,3,legs,'#3b3330');rect(rx+w*.08,ry+hh-legs*.55,w*.84,2,'#3b3330');
  rect(rx+w*.08,ry+8,w*.84,body,'#8a5a3a');for(const k of [.3,.62,.9])rect(rx+w*.08,ry+8+body*k,w*.84,2,'#4a3428');for(let k=1;k<5;k++)rect(rx+w*(.08+k*.168),ry+8,1,body,'#6e4730');
  poly([[rx+w*.04,ry+9],[rx+w*.5,ry-2],[rx+w*.96,ry+9]],'#5a4134');if(p.hp<p.max)rect(rx+w*.5,ry+8+body*.5,3,hh*.2,'#a8d8ee');return;}
 const live=p.grid<0||power[p.grid],cx=rx+w/2;rect(rx+w*.2,ry+hh-10,w*.6,10,'#56625f');rect(cx-2,ry+hh*.35,4,hh*.55,'#7d8d8a');
 // The dish sweeps while powered and swings to track the kaiju as the call builds.
 const track=p.call/Y.radarCall,face=player.x+bodyWidth()/2>p.b.x+p.b.w/2?1:-1,turn=live?(track>.3?face*.9:Math.sin(time*1.6+p.b.x)):.15;
 ctx.fillStyle=live?'#c9d3cd':'#7a837f';ctx.beginPath();ctx.ellipse(cx+turn*4,ry+hh*.3,Math.max(2,w*.45*Math.abs(turn)+3),hh*.24,0,0,Math.PI*2);ctx.fill();rect(cx+turn*4-1,ry+hh*.3-1,turn*w*.3,2,'#3d4a47');
 rect(cx-2,ry+2,4,4,!live?'#3a3434':track>.5?(Math.sin(time*(10+track*30))>0?'#ff3b2b':'#5a1a1a'):Math.sin(time*4)>0?'#ff6a5a':'#5a2a2a');
 if(p.hp<p.max&&Math.sin(time*19)>.3)rect(rx+w*.7,ry+hh*.5,4,4,'#fff0c9');}
// Power poles carry wires to the next standing pole on the same grid; a downed pole leaves its wires hanging to the street,
// arcing while they are live.
function drawPowerLines(){if(!poles.length)return;ctx.lineWidth=1.5;
 for(let i=0;i<poles.length;i++){const a=poles[i],b=poles[i+1],ax=poleXs[i],bx=poleXs[i+1],ta=groundAt(ax)-Y.poleH+8,tb=groundAt(bx)-Y.poleH+8;
  if(!b||a.pole!==b.pole)continue;const au=upright(a),bu=upright(b);if(!au&&!bu)continue;
  const wire=wires.find(l=>l.pole===i||l.pole===i+1);
  ctx.strokeStyle=wire&&Math.sin(time*40+i)>0?'#bfe8ff':'#263133';ctx.beginPath();
  if(au&&bu){for(const dy of [0,8]){ctx.moveTo(ax-camera,ta+dy);ctx.quadraticCurveTo((ax+bx)/2-camera,(ta+tb)/2+dy+22,bx-camera,tb+dy);}}
  else{const fx=au?ax:bx,tx=au?bx:ax;ctx.moveTo(fx-camera,au?ta:tb);ctx.quadraticCurveTo(fx+(tx-fx)*.3-camera,groundAt(fx+(tx-fx)*.5)-30,fx+(tx-fx)*.75-camera,groundAt(fx+(tx-fx)*.5)-2);}
  ctx.stroke();}
 for(const l of wires){const a=l.from-camera,z=l.to-camera;if(z<-20||a>viewW()+20)continue;ctx.strokeStyle=Math.sin(time*50)>0?'#e8f6ff':'#8fd4ff';ctx.lineWidth=2;ctx.beginPath();
  for(let x=a;x<=z;x+=14){const yy=groundAt(x+camera)-3-Math.abs(Math.sin(x*.31+time*37))*5;if(x===a)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();}
 ctx.lineWidth=1;}
// Water-tower splashes (a column falling from the roof, then a sheet racing along the street) and radar strike calls.
function drawCityFx(){
 for(const sp of splashes){const x=sp.x-camera,fall=Math.min(1,sp.t/.3),R=Y.splashRadius*Math.min(1,Math.max(0,(sp.t-.2)/.6));ctx.globalAlpha=Math.max(0,1-sp.t/1.4)*.8;
  rect(x-12,sp.top,24,(groundAt(sp.x)-sp.top)*fall,'#a8d8ee');if(R>0){rect(x-R,groundAt(sp.x)-10,R*2,10,'#8fc6e0');rect(x-R,groundAt(sp.x)-12,R*2,2,'#e2f4fb');}ctx.globalAlpha=1;}
 for(const p of roofs){if(p.dead||p.kind!=='radar'||p.call<Y.radarCall*.5)continue;const k=(p.call-Y.radarCall*.5)/(Y.radarCall*.5),r=roofBox(p),cx=player.x+bodyWidth()/2-camera,col=Math.sin(time*(8+k*20))>0?'#ff3b2b':'#ffb35c';
  ctx.globalAlpha=.5+.5*k;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,groundAt(player.x+bodyWidth()/2)-2,MF.strikeRadius*(1.4-k*.4),7,0,0,Math.PI*2);ctx.stroke();
  ctx.setLineDash?.([3,5]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r.x+r.w/2-camera,r.y);ctx.lineTo(cx,groundAt(player.x+bodyWidth()/2)-4);ctx.stroke();ctx.setLineDash?.([]);ctx.globalAlpha=1;
  if(k>.6)text('RADAR LOCK',r.x+r.w/2-camera,r.y-10,10,col,'center');}
}
// Far skyline: each city's signature silhouettes on the horizon, parallaxing slowly so they stay in view across the block.
function farSkyline(style:string,W:number,m:{far:string,mid:string,win:string,lights:number}){const base=320,c=m.far,night=m.lights>.6,px=(k:number,period=1500)=>((k*period-camera*.05)%(period*2)+period*2)%(period*2)-200;
 ctx.globalAlpha=.8;
 if(style==='nyc'){for(const k of [0,1]){const x=px(k);rect(x,base-150,26,150,c);rect(x+5,base-172,16,22,c);rect(x+9,base-190,8,18,c);rect(x+12,base-215,2,25,c);
   const y=px(k,1500)+620;rect(y,base-130,22,130,c);poly([[y,base-130],[y+11,base-175],[y+22,base-130]],c);rect(y+10,base-195,2,20,c);}}
 else if(style==='mex'){// Popocatépetl, smoking, with Iztaccíhuatl beside it, and the Torre Latinoamericana.
  const x=px(0,2000)+200;poly([[x-260,base],[x-40,base-190],[x+30,base-190],[x+250,base]],c);poly([[x-58,base-172],[x-40,base-190],[x+30,base-190],[x+48,base-172],[x+20,base-176],[x-10,base-168],[x-30,base-176]],'#efe6d8');
  for(let k=0;k<6;k++){const t=(time*.08+k/6)%1;ctx.globalAlpha=.35*(1-t);ctx.fillStyle='#d9cbbb';ctx.beginPath();ctx.arc(x-5+t*90,base-200-t*150,14+t*40,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=.8;
  poly([[x+190,base],[x+330,base-90],[x+420,base-96],[x+560,base]],c);const t2=px(1,2000);rect(t2,base-140,24,140,c);rect(t2+6,base-160,12,20,c);rect(t2+11,base-185,2,25,c);}
 else if(style==='par'){// The Eiffel Tower and, on its hill, Sacré-Cœur.
  const x=px(0,1800)+300;poly([[x-60,base],[x-6,base-150],[x-3,base-230],[x+3,base-230],[x+6,base-150],[x+60,base]],c);rect(x-40,base-70,80,6,c);rect(x-20,base-150,40,5,c);ctx.globalAlpha=.5;rect(x-30,base-60,60,60,m.mid);ctx.globalAlpha=.8;
  const y=px(1,1800);poly([[y-140,base],[y,base-60],[y+140,base]],c);rect(y-30,base-100,60,40,c);ctx.fillStyle=c;ctx.beginPath();ctx.arc(y,base-100,26,Math.PI,0);ctx.fill();rect(y-2,base-140,4,16,c);}
 else if(style==='hkg'){// Victoria Peak behind the harbour skyline, the Bank of China's triangles and IFC.
  poly([[-100,base],[W*.2,base-170],[W*.45,base-130],[W*.7,base-200],[W+100,base-120],[W+100,base]],'#151d33');
  const x=px(0,1400);poly([[x,base],[x,base-170],[x+14,base-210],[x+28,base-170],[x+28,base]],c);for(let k=0;k<4;k++){ctx.strokeStyle=m.mid;ctx.beginPath();ctx.moveTo(x,base-k*40);ctx.lineTo(x+28,base-k*40-40);ctx.stroke();}
  const y=px(1,1400);rect(y,base-190,30,190,c);rect(y+5,base-208,20,18,c);if(night)for(let yy=base-180;yy<base;yy+=10)rect(y+6,yy,18,2,m.win+'88');}
 else{// Mount Fuji faint on the horizon, Skytree with its lights, Tokyo Tower in red.
  const x=px(0,2200)+400;ctx.globalAlpha=.45;poly([[x-300,base],[x-50,base-150],[x+50,base-150],[x+300,base]],'#3a4258');poly([[x-62,base-138],[x-50,base-150],[x+50,base-150],[x+62,base-138],[x+20,base-132],[x-20,base-140]],'#c9d2e2');ctx.globalAlpha=.8;
  const y=px(1,2200);poly([[y-12,base],[y-4,base-250],[y+4,base-250],[y+12,base]],c);rect(y-8,base-190,16,8,c);rect(y-1,base-290,2,40,c);if(Math.sin(time*3)>0)rect(y-2,base-292,4,4,'#ff5a5a');
  const t2=y+520;poly([[t2-40,base],[t2-4,base-160],[t2+4,base-160],[t2+40,base]],'#a8463a');rect(t2-24,base-80,48,5,'#d8d8d8');rect(t2-12,base-130,24,4,'#d8d8d8');}
 ctx.globalAlpha=1;}
// Rain (Tokyo): streaks across the whole view, drawn in screen space over everything.
function drawRain2(){if(!CITIES[cityIndex].mood.rain)return;ctx.strokeStyle='#a9c4dd55';ctx.lineWidth=1;ctx.beginPath();
 for(let k=0;k<90;k++){const x=((k*97+time*260)%1000)-20,y=((k*53+time*900)%600)-40;ctx.moveTo(x,y);ctx.lineTo(x-4,y+14);}ctx.stroke();}
// River: deep water from the surface down to the riverbed (behind everything that wades in it), with a moving sheen.
function drawRiverBack(){for(const [a,z,y] of waterSpans()){const x0=Math.max(-8,a-camera),x1=Math.min(viewW()+108,z-camera);if(x1<x0)continue;
 const deep=540+C.ground/zoom;rect(x0,y,x1-x0,deep-y,'#2f5d70');for(let x=x0;x<x1;x+=30)rect(x,y+18+((x+camera)*3%23),14,2,'#2a5263');
 for(let x=x0;x<x1;x+=22){const k=(x+camera)*.07+time*2;rect(x,y+3+Math.sin(k)*2,10,2,'#5d93a8');}}}
// Front water: a translucent layer over everything standing in the river, so it reads as wading.
function drawRiverFront(){for(const [a,z,y] of waterSpans()){const x0=Math.max(-8,a-camera),x1=Math.min(viewW()+108,z-camera);if(x1<x0)continue;
 ctx.globalAlpha=.55;ctx.fillStyle='#3d7088';ctx.beginPath();ctx.moveTo(x0,y);for(let x=x0;x<=x1;x+=8)ctx.lineTo(x,Math.max(y,bedAt(x+camera)+6));ctx.lineTo(x1,y);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
 for(let x=x0;x<x1;x+=16){const k=(x+camera)*.05+time*3;rect(x,y-1+Math.sin(k)*1.5,9,2,'#a8d8ee');}}}
// Subway in cutaway: under the street along the line, a strip shows the tunnel (lights, rails) with the trains running through it.
function drawSubway(){const line=block.subway?.[0];if(!line)return;const a=Math.max(-8,line[0]-camera),z=Math.min(viewW()+8,line[1]-camera);if(z<a)return;
 // The street slab over the tunnel: road, then a concrete tunnel roof, then the tunnel itself.
 const top=C.ground+R.tunnelRoof,f=tunnelFloor();rect(a,top-6,z-a,6,'#7d8580');rect(a,top-6,z-a,1,'#a3aaa4');rect(a,top,z-a,f-top+3,'#1b2325');
 for(let yy=top+6;yy<f-8;yy+=11)rect(a,yy,z-a,1,'#253031');for(let x=a+((-camera)%60+60)%60;x<z;x+=60)rect(x,top+4,10,3,'#e3cb7c');
 rect(a,f-4,z-a,4,'#3a3a36');rect(a,f-7,z-a,2,'#8a8f88');rect(a,f+3,z-a,3,'#2a3536');
 drawTrains(a,z);}
// Trains: three silver cars with a red stripe and lit windows; a derailed one lies buckled and burning.
function drawTrains(a:number,z:number){const f=tunnelFloor(),car=R.trainLength/3;
 for(const t of trains){const x0=t.x-camera;if(x0+R.trainLength<a||x0>z)continue;
  for(let k=0;k<3;k++){const cx=x0+k*car,ca=Math.max(a,cx+2),cz=Math.min(z,cx+car-2);if(cz<=ca)continue;
   if(t.crashed){ctx.save();ctx.beginPath();ctx.rect(a,C.ground+R.tunnelRoof,z-a,f-C.ground-R.tunnelRoof+4);ctx.clip();ctx.translate(cx+car/2,f-22);ctx.rotate((k-1)*.12*t.dir);
    rect(-car/2+2,-18,car-4,32,'#5d6462');rect(-car/2+2,-12,car-4,3,'#5a2a26');for(let w=-car/2+10;w<car/2-14;w+=22)rect(w,-6,12,9,'#2a2e2d');
    if(Math.sin(time*13+k*2+t.x)>0)poly([[-10,-18],[-2,-30-Math.abs(Math.sin(time*9+k))*8],[6,-18]],'#ff8a1f');ctx.restore();continue;}
   rect(ca,f-44,cz-ca,37,t.flash>0?'#fff4dc':'#a9b2b0');rect(ca,f-40,cz-ca,4,'#7c2f2f');rect(ca,f-9,cz-ca,3,'#2c3332');
   for(let w=cx+10;w<cx+car-14;w+=22)if(w>ca&&w+12<cz)rect(w,f-33,12,10,'#f2e6a8');}
  const nose=t.dir>0?x0+R.trainLength:x0;if(!t.crashed&&nose>a&&nose<z)rect(nose-(t.dir>0?4:0),f-30,4,6,'#fff4c0');}}
// Subway cave-ins: a hole through the street onto the tunnel, rails at the bottom, a train when one is passing.
function drawPits(){const cata=style()==='par'&&!block.subway;for(const p of pitList()){const a=p.x0-camera,z=p.x1-camera;if(z<-20||a>viewW()+20)continue;const top=C.ground-4,f=p.floor;
 if(cata){// Catacombs: an ossuary wall of stacked bones and skulls.
  rect(a,top,z-a,f-top+4,'#1d1a16');for(let yy=top+8;yy<f-6;yy+=9)for(let x=a+((yy*3)%10);x<z-6;x+=10){rect(x,yy,7,5,'#cbbf9f');if(((x+yy)|0)%3===0){rect(x+1,yy+1,2,2,'#1d1a16');rect(x+4,yy+1,2,2,'#1d1a16');}}
  for(const [ex,d] of [[a,1],[z,-1]] as const)for(let k=0;k<4;k++)rect(ex+d*(k*7)-(d<0?7:0),top-4+((k*5+p.x0)%7),7,6+(k%3)*3,'#8a8170');continue;}
 rect(a,top,z-a,f-top+4,'#141b1d');for(let yy=top+8;yy<f-8;yy+=12)rect(a,yy,z-a,1,'#26302f');for(let x=a+((p.x0*3)%30);x<z;x+=30)rect(x,top+10,8,4,(Math.floor(time*2+x)%5)?'#3b4747':'#e3cb7c');
 rect(a,f-4,z-a,4,'#3a3a36');rect(a,f-7,z-a,2,'#8a8f88');

 for(const [ex,d] of [[a,1],[z,-1]] as const)for(let k=0;k<4;k++)rect(ex+d*(k*7)-(d<0?7:0),top-4+((k*5+p.x0)%7),7,6+(k%3)*3,'#5b625d');}}
// Bridge: Brooklyn-style stone towers at the span joints, main cables and suspenders over standing spans, and the steel deck.
// A broken span swings down into the river and sinks.
function drawBridge(){if(!spans.length)return;const y=spans[0].y,tH=Math.round(260*C.cityScale),joints=spans.slice(1).map(s=>s.x0),towerTop=y-tH;
 const supportTop=(x:number)=>joints.includes(x)?towerTop+20:y-Math.round(60*C.cityScale);
 for(const jx of joints){const x=jx-camera,tw=Math.round(44*C.cityScale);if(x<-tw-20||x>viewW()+tw+20)continue;const base=groundAt(jx+80)+30;
  rect(x-tw/2,towerTop,tw,base-towerTop,'#a39a86');rect(x-tw/2-4,towerTop-6,tw+8,8,'#8c8472');rect(x-tw/2,towerTop+40,tw,3,'#8c8472');
  for(const k of [-1,1]){const ax=x+k*tw*.22-tw*.12;rect(ax,towerTop+56,tw*.24,y-towerTop-70,'#3b4446');ctx.fillStyle='#3b4446';ctx.beginPath();ctx.arc(ax+tw*.12,towerTop+56,tw*.12,Math.PI,0);ctx.fill();}}
 ctx.lineWidth=2;ctx.strokeStyle='#2c3537';
 for(const s of spans){const a=s.x0-camera,z=s.x1-camera;if(z<-40||a>viewW()+40)continue;const ta=supportTop(s.x0),tz=supportTop(s.x1);
  const sag=(ta+tz)/2+(y-(ta+tz)/2)*.85-26;
  if(s.alive){ctx.beginPath();ctx.moveTo(a,ta);ctx.quadraticCurveTo((a+z)/2,sag,z,tz);ctx.stroke();
   ctx.lineWidth=1;for(let x=a+12;x<z-6;x+=16){const t=(x-a)/(z-a),cy=(1-t)*(1-t)*ta+2*(1-t)*t*sag+t*t*tz;ctx.beginPath();ctx.moveTo(x,cy);ctx.lineTo(x,y);ctx.stroke();}ctx.lineWidth=2;
   rect(a,y,z-a,R.deckThick,'#4d5a5c');rect(a,y,z-a,3,'#6b6f66');for(let x=a;x<z;x+=18){ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x+9,y+R.deckThick);ctx.lineTo(x+18,y+3);ctx.stroke();}
   rect(a,y-10,z-a,2,'#5b6668');for(let x=a;x<z;x+=12)rect(x,y-10,2,10,'#5b6668');
   if(s.hp<s.max*.5)for(let x=a+20;x<z-20;x+=40)poly([[x,y],[x+6,y+R.deckThick],[x+2,y+R.deckThick],[x-3,y+2]],'#1e2829');}
  else{// Cable ends hang loose; the deck swings down about its west end and goes under.
   ctx.beginPath();ctx.moveTo(a,ta);ctx.lineTo(a+18,ta+90);ctx.moveTo(z,tz);ctx.lineTo(z-18,tz+90);ctx.stroke();
   if(s.fall<1){const ang=Math.min(1,s.fall*1.6)*.9,drop=s.fall*120;ctx.save();ctx.translate(a,y+drop);ctx.rotate(ang);ctx.globalAlpha=1-Math.max(0,s.fall-.6)*2.5;rect(0,0,z-a,R.deckThick,'#4d5a5c');rect(0,0,z-a,3,'#6b6f66');ctx.restore();ctx.globalAlpha=1;}}}
 ctx.lineWidth=1;}
// A toppled building lies as a long rubble ridge across everything it landed on.
function drawFallen(b:typeof buildings[number]){
 const [from,to]=toppleSpan(b),a=Math.min(from,b.x)-camera,z=Math.max(to,b.x+b.w)-camera;if(z<-40||a>viewW()+40)return;
 rect(a,groundAt((a+z)/2+camera)-9,z-a,9,'#5c5f58');for(let x=a;x<z;x+=11){const hh=5+((x+b.x)*7%11);rect(x,groundAt((a+z)/2+camera)-9-hh,9,hh,(x|0)%3?'#898879':b.color);}
}
function monster(x:number,y:number,face:number,crouched:boolean,pose:number){
 if(activeKaiju!=='Mogurodon'||hasSprite('Mogurodon',combat.stage)){const [anim,t]=currentAnim();ctx.save();ctx.translate(x+bodyWidth()/2,y+bodyHeight()+C.spriteDrop);ctx.scale(face,player.crouched&&!hasAnim(activeKaiju,'crouch',combat.stage)?.6:1);
  // The dive's spike ball rolls forward about its centre once the curl is done.
  const sf=spinFrom(activeKaiju,anim,combat.stage),pv=sf!=null&&t>=sf?holdPoint(activeKaiju,anim,t,combat.stage,'pivot'):null;
  if(pv){const s=scale(combat);ctx.translate(pv[0]*s,pv[1]*s);ctx.rotate((t-sf!)*MV.diveSpin);ctx.translate(-pv[0]*s,-pv[1]*s);}
  drawSilhouette(ctx,activeKaiju,0,0,scale(combat),t,false,anim,combat.stage);ctx.restore();return;}

 const h=crouched?C.crouchHeight:C.playerHeight,step=(keys.has('KeyA')||keys.has('KeyD'))&&mode==='playing'?Math.sin(time*13)*4:0;
 ctx.save();ctx.translate(Math.round(x+bodyWidth()/2),Math.round(y+bodyHeight()+C.spriteDrop));ctx.scale(face*scale(combat),scale(combat));
 // Deliberately geometric temporary mole/quill silhouette, replace via asset hooks.
 poly([[-23,-27],[-41,-34],[-32,-14],[-18,-11]],'#65695b');
 poly([[-26,-28],[-34,-46],[-23,-43],[-25,-62],[-13,-54],[-9,-h-5],[2,-h+7],[13,-h-1],[21,-h+17],[26,-28]],'#929580');
 rect(-21,-h+19,42,h-25,'#555c51');rect(-18,-h+18,24,h-29,'#717866');rect(5,-h+25,28,22,'#8a8d76');rect(25,-h+32,13,12,'#606b5a');rect(20,-h+28,5,4,'#f5b1d1');rect(35,-h+36,5,5,'#303e3b');
 rect(-20,-12+step,18,12-step,'#3a4c45');rect(6,-12-step,18,12+step,'#3a4c45');rect(-24,-4+step,23,5,'#b8b49a');rect(7,-4-step,24,5,'#b8b49a');
 const arm=pose>0?22:0;rect(6+arm,-h+38,21,13,'#525e51');for(let n=0;n<3;n++)rect(23+arm+n*3,-h+35+n*5,10,3,'#e4d8b7');
 ctx.restore();
}
function hud(){const ink=CITIES[cityIndex].ink;
 rect(0,0,960,72,'#15262c');rect(0,71,960,2,'#aabe9b');rect(20,18,4,35,'#f08bbf');text(activeKaiju.toUpperCase(),35,31,15);text(`STAGE 0${combat.stage}${combat.superTime>0?' / SUPER':''}`,35,49,9,'#8fa39e');
 text('DISTRICT DESTRUCTION',330,23,9,'#a4b6a8');rect(330,34,290,11,'#334744');rect(330,34,290*destruction(buildings),11,'#c8ed82');rect(330+290*.75,31,2,17,'#f3a2c9');text('75%',330+290*.75,59,9,'#f3a2c9','center');text(`${Math.round(destruction(buildings)*100)}%`,635,45,17,'#c8ed82');
 text('SCORE',746,23,9,'#a4b6a8');text(hudScore(netScore()),746,47,21);text(`${CITIES[cityIndex].code} / 0${blockIndex+1}`,938,28,11,'#e4e7d1','right');text('ESC Ⅱ',938,49,10,'#9aaea2','right');
 rect(20,86,260,24,'#213a40');text(session!=='drill'?`0${blockIndex+1} ${block.name.toUpperCase()}`:`DRILL / RESPONSE TIER ${military.tier}`,30,102,9,'#e4e7d1');text(`HOSTILES ${military.units.length} / ${M.caps[military.tier-1]}`,30,124,9,ink);
 if(objective||rival){const value=objective?objective.hp/objective.maxHP:rival!.hp/rival!.maxHP;const label=objective?'STRONGHOLD CRYSTAL':`${bossName().toUpperCase()} / M4 RIVAL`;text(label,330,94,10,ink);rect(330,101,300,6,'#6b8c83');rect(330,101,300*value,6,'#e9a0c8');text(objective?.shattered?'CRYSTAL SHATTERED':`${Math.ceil(objective?.hp??rival!.hp)} HP`,650,107,10,ink);}
 if(block.kind==='boss'&&rival)text('ARENA LOCKED',935,126,11,ink,'right');
 {const cut=[['1','WEST'],['-1','EAST']].filter(([k])=>military.cutOff[k]>0).map(([k,n])=>`${n} CUT OFF ${Math.ceil(military.cutOff[k])}s`);if(cut.length)text(cut.join(' · '),150,124,9,ink);}
 // Rampage gauge: heat with the multiplier thresholds marked; the label pops when a new level is reached.
 if(block.kind!=='boss'){const lv=rampageLevel(rampage),col=['#8fa39e','#e0b04a','#ef8a3a','#f2552f','#ff3b5c'][lv],k=rampage.heat/100,pop=rampFlash>0?Math.sin(rampFlash*Math.PI/1.2):0;
  rect(20,132,260,24,'#213a40');if(pop>0){ctx.globalAlpha=pop*.5;rect(20,132,260,24,col);ctx.globalAlpha=1;}
  text(lv===4?'UNSTOPPABLE':'RAMPAGE',30,148,9,lv?col:'#8fa39e');text(`×${Y.rampageMult[lv]}`,128,149,12+Math.round(pop*4),lv?col:'#c5cabb','right');
  rect(138,141,132,6,'#334744');rect(138,141,132*k,6,col);for(const t of Y.rampageLevels.slice(1))rect(138+132*t/100,139,1,10,'#e4e7d1');}
 if(objectiveOpen()){text(openLayout()?'EXITS OPEN ← →':'EXIT OPEN →',935,103,13,ink,'right');if(camera<worldWidth-viewW()-30)text('EAST →',925,275,12,ink,'right');if(openLayout()&&camera>30)text('← WEST',35,275,12,ink);}
 else if(time<8&&mode==='playing')text('ESC: PAUSE  ·  MOVES & CONTROLS',480,416,11,'#f7f0cd','center');
 if(actionTime>0)text(action,480,153,12,ink,'center');
 drawBanner();
 meters();
 minimap();text('TEMP ART / M7',939,530,8,'#a0af99','right');
}
// Whole-block strip map: skyline (gold landmarks, exposed caches pink), hostiles, objective/rival, exits, view window, player.
function minimap(){const mx=X.minimapX,my=X.minimapY,mw=X.minimapW,mh=X.minimapH,k=mw/worldWidth,open=objectiveOpen();
 rect(mx-4,my-4,mw+8,mh+8,'#15262cd0');rect(mx,my+mh-2,mw,2,'#56685d');
 for(const b of buildings){if(b.kind==='tiny')continue;const bx=mx+b.x*k,bw=Math.max(1,b.w*k-.5);if(b.hpNow<=0){rect(bx,my+mh-3,bw,1,'#4a5650');continue;}
  const bh=Math.max(2,b.h/520*(mh-4));rect(bx,my+mh-2-bh,bw,bh,b.landmark?'#f1dc96':b.cache&&b.hpNow<b.hp*.68?'#f6a8d6':'#7f948f');}
 for(const u of military.units)if(u.hp>0)rect(mx+u.x*k,u.y<groundAt(u.x)-60?my+1:my+mh-5,2,2,'#e98a8a');
 if(objective&&!objective.shattered)rect(mx+objective.x*k-2,my+3,4,mh-5,'#f4a1d0');if(rival&&!rival.dead)rect(mx+rival.x*k,my+3,3,mh-5,'#d694bf');
 rect(mx+mw-2,my,2,mh,open?'#c8ed82':'#56685d');if(openLayout())rect(mx,my,2,mh,open?'#c8ed82':'#56685d');
 rect(mx+camera*k,my-2,Math.min(mw,viewW()*k),1,'#e4e7d1');rect(mx+camera*k,my+mh+1,Math.min(mw,viewW()*k),1,'#e4e7d1');rect(mx+(player.x+bodyWidth()/2)*k-2,my+mh-9,4,9,'#f08bbf');
 for(const [a,z] of waterSpans())rect(mx+a*k,my+mh-3,(z-a)*k,3,'#3d7088');for(const sp of spans)if(sp.alive)rect(mx+sp.x0*k,my+mh-6,(sp.x1-sp.x0)*k,2,'#c9c5ab');
 for(const p of pitList())rect(mx+p.x0*k,my+mh-2,Math.max(2,(p.x1-p.x0)*k),2,'#141b1d');
 for(const b of buildings)if(b.role&&b.hpNow>0)rect(mx+b.x*k,my+mh-6,Math.max(3,b.w*k),4,b.role==='substation'?'#8fd4ff':b.role==='armory'?'#c8705a':'#ff9a4a');
 for(const p of roofs)if(!p.dead&&p.b.hpNow>0)rect(mx+(p.b.x+p.b.w/2)*k-1,my+mh-4-Math.max(2,p.b.h/520*(mh-4))-3,3,3,p.kind==='radar'?'#ff5a4a':'#a8d8ee');
 const marks=buildings.filter(b=>b.landmark);if(marks.length)text(`LANDMARKS ${marks.filter(b=>b.hpNow<=0).length}/${marks.length}`,mx-12,my+15,9,'#f1dc96','right');
 if(subs.length){const names=subs.length===2?['W','E']:subs.map((_,i)=>`${i+1}`);text(`POWER ${names.map((n,i)=>`${n} ${power[i]?'ON':'OFF'}`).join(' · ')}`,mx-12,my+27,9,power.every(Boolean)?'#8fd4ff':'#d9b4a8','right');}}
function meters(){
 const bar=(x:number,width:number,value:number,max:number,label:string,color:string)=>{if(x!==24)rect(x,488,width,5,'#263b3c');rect(x,488,width*Math.max(0,Math.min(1,value/max)),5,color);text(label,x,481,9,color);};
 rect(24,488,205,5,'#263b3c');if(hpGhost>combat.hp)rect(24,488,205*Math.min(1,hpGhost/B.maxHP),5,'#fff0f6');if(hurtFlash>0&&hurtRed)rect(22,486,209,9,'#e8506a55');
 bar(24,205,combat.hp,B.maxHP,`CRYSTAL / HP  ${Math.ceil(combat.hp)} / ${B.maxHP}`,'#f4a1d0');
 for(const threshold of B.up)rect(24+205*threshold/B.maxHP,485,1,10,'#fff0df');
 bar(280,190,combat.ultimate,B.ultimateMax,`[U] ${ultimateLabel()}${combat.ultimate>=B.ultimateMax?' · READY':''}`,'#c9ef83');
 bar(520,190,combat.superTime>0?combat.superTime:combat.superCharge,combat.superTime>0?B.superDuration:B.superMax,combat.superTime>0?`SUPER · ${Math.ceil(combat.superTime)}s`:combat.superCharge>=B.superMax?'[I] SUPER · READY':'[I] SUPER · OVERFLOW CRYSTALS','#b4c8fb');
 text(`DAMAGE PENALTY  −${Math.round(combat.penalty)}`,934,481,9,'#c5cabb','right');
 if((activeKaiju==='Tlézcatl'||isBelial())&&(jet||jetFuel<1)&&!combat.charging){const bel=isBelial(),x=screenX(player.x+bodyWidth()/2),y=Math.max(84,screenY(player.y)-20);rect(x-28,y,56,5,'#293e3c');rect(x-28,y,56*jetFuel,5,jetLocked?(bel?'#5d6a3a':'#8a5a4a'):(bel?'#b8e63a':'#ff9a3c'));text(jetLocked?(bel?'GAGGING':'COOLING'):(bel?'ACID':'FLAME'),x,y-6,8,jetLocked?(bel?'#c3cc9c':'#d9b4a8'):(bel?'#ecffc0':'#ffe2bf'),'center');}
 if(combat.charging){const x=screenX(player.x+bodyWidth()/2),y=Math.max(84,screenY(player.y)-20);rect(x-28,y,56,5,'#293e3c');rect(x-28,y,56*combat.charge/B.maxCharge,5,'#f8a0cc');text(combat.charge>=B.maxCharge?'MAX':'CHARGING',x,y-6,8,'#ffe6f1','center');}
}
// Layer 0: grounded vehicles in the far lane (behind the kaiju's feet). Layer 1: near lane, airborne and carried vehicles.
function drawVehicles(layer:0|1){for(const v of vehicles){const front=v.state==='flying'||v.state==='held'||v.lane===1;if(front!==(layer===1))continue;drawVehicle(v);}}
function drawVehicle(v:Vehicle){
 const x=v.x-camera;if(x<-90||x>viewW()+90)return;const off=v.state==='held'||upright(v)?0:VC.laneOffset[v.lane],w=v.w,h=v.h;
 if(v.state==='flat'&&v.kind==='building'){rect(x,groundAt(v.x+v.w/2)-7,w,7,'#62625b');for(let j=0;j<w;j+=13)rect(x+j,groundAt(v.x+v.w/2)-8-(j%7),10,8+j%7,'#898879');rect(x+w*.3,groundAt(v.x+v.w/2)-12,w*.25,6,v.color);return;}
 if(v.state==='flat'){rect(x,groundAt(v.x+v.w/2)+off-5,w,5,'#485858');rect(x+3,groundAt(v.x+v.w/2)+off-7,w-8,3,v.color);return;}
 ctx.save();ctx.translate(Math.round(x+w/2),Math.round(v.y+h/2+off));ctx.rotate(v.angle);ctx.scale(v.state==='driving'?v.dir:1,v.state==='wreck'?.72:1);
 const L=-w/2,T=-h/2,glass='#b7d1c3',tire='#253839';
 if(v.kind==='lamp'&&v.pole!==undefined){const wood='#5b4a3a';if(upright(v)){rect(-3,T,6,h,wood);rect(-16,T+6,32,4,wood);rect(-12,T+14,24,3,wood);for(const k of [-13,0,11])rect(k,T+2,3,5,'#d9dccd');}
  else{rect(L,-3,w,6,wood);rect(L+w-10,-16,4,32,wood);}}
 else if(v.kind==='lamp'){const pole='#44575a',glow='#e9d6a2';if(upright(v)){rect(-2,T+1,4,h-1,pole);rect(-12,T,24,5,pole);rect(-9,T+5,18,5,glow);rect(-4,T+h-6,8,6,'#33454a');}
  else{rect(L,-2,w,4,pole);rect(L+w-5,-12,5,24,pole);rect(L+w-10,-9,5,18,glow);rect(L,-4,6,8,'#33454a');}}
 else if(v.kind==='train'){const car=w/3,wreck=v.label==='wreck'||v.state==='wreck';for(let k=0;k<3;k++){const cx=L+k*car;
  rect(cx+2,T,car-4,h,wreck?'#5d6462':v.color);rect(cx+2,T+4,car-4,4,wreck?'#5a2a26':'#7c2f2f');for(let wx=cx+10;wx<cx+car-14;wx+=22)rect(wx,T+11,12,10,wreck?'#2a2e2d':'#f2e6a8');rect(cx+2,T+h-3,car-4,3,'#2c3332');}
  if(wreck&&Math.sin(time*11+v.id)>0)poly([[L+w*.4,T],[L+w*.45,T-12],[L+w*.5,T]],'#ff8a1f');}
 else if(v.kind==='car'){if(v.label==='TAXI'){rect(L+w*.38,T-5,w*.24,5,'#f4ecd0');rect(L+w*.42,T-4,w*.16,2,'#2b2b2b');}rect(L,T+h*.38,w,h*.5,v.color);rect(L+w*.22,T,w*.55,h*.45,v.color);rect(L+w*.27,T+h*.12,w*.18,h*.3,glass);rect(L+w*.53,T+h*.12,w*.18,h*.3,glass);rect(L+w*.12,T+h*.72,w*.18,h*.3,tire);rect(L+w*.72,T+h*.72,w*.18,h*.3,tire);}
 else if(v.kind==='van'){rect(L,T,w*.76,h*.82,v.color);rect(L+w*.7,T+h*.3,w*.3,h*.52,v.color);rect(L+w*.78,T+h*.36,w*.16,h*.22,glass);rect(L+w*.06,T+h*.2,w*.6,h*.08,'#e8e2c8');rect(L+w*.1,T+h*.74,w*.16,h*.26,tire);rect(L+w*.7,T+h*.74,w*.16,h*.26,tire);}
 else if(v.kind==='patrol'||v.kind==='apc'||v.kind==='tank'||v.kind==='artillery'){ctx.translate(0,T);drawGroundUnit(v.kind,w,h);ctx.translate(0,-T);}
 else if(v.kind==='stand'){rect(L,T+h*.22,w,h*.78,v.color);rect(L-2,T+h*.1,w+4,h*.14,'#e8e2c8');for(let k=0;k<4;k++)rect(L-2+k*(w+4)/4,T+h*.1,(w+4)/8,h*.14,'#c4634f');rect(L+4,T+h*.34,w-8,h*.22,'#263e46');rect(L+6,T+h*.37,5,h*.16,'#e6c35c');rect(L+13,T+h*.37,5,h*.16,'#86b7c4');rect(L+20,T+h*.37,5,h*.16,'#e08a8a');}
 else if(v.kind==='building'){ctx.translate(0,h/2-C.ground);drawStructure({x:0,w,h,base:C.ground,color:v.color,label:v.label,landmark:false,cache:false,hpNow:1,hp:1,holes:[],floors:[],floorMax:0} as unknown as typeof buildings[number],L,h);ctx.translate(0,C.ground-h/2);}
 else if(v.kind==='barrier'){rect(L,T+h*.12,w,h*.88,'#8d8f86');rect(L-2,T,w+4,h*.14,'#a5a69c');for(let k=0;k<3;k++)rect(L+3+k*w/3,T+h*.4,w/6,h*.2,'#d9b45a');}
 else{rect(L,T,w,h*.84,v.color);rect(L,T+h*.56,w,h*.08,'#e8e2c8');for(let k=0;k<5;k++)rect(L+4+k*(w-8)/5,T+h*.14,(w-8)/5-3,h*.3,glass);rect(L+w*.1,T+h*.76,w*.12,h*.24,tire);rect(L+w*.76,T+h*.76,w*.12,h*.24,tire);}
 if(v.state==='wreck'){ctx.globalAlpha=.38;rect(L,T,w,h,'#1c2629');ctx.globalAlpha=1;rect(L+w*.35,T+h*.1,3,h*.6,'#2b3538');}
 ctx.restore();
 if(v.burn&&v.burn>0&&v.state!=='flat'&&v.state!=='held'){const f=Math.sin(time*19+v.id)>0,k=Math.min(1,v.burn/2),cy=v.state==='flying'?v.y+h*.3:v.y+(v.state==='wreck'?h*.3:0)+off;ctx.globalAlpha=k;poly([[x+w*.2,cy+h*.4],[x+w*.3,cy-8-(f?6:0)],[x+w*.45,cy],[x+w*.55,cy-14+(f?5:0)],[x+w*.7,cy-2],[x+w*.8,cy+h*.4]],f?'#ff8a1f':'#ff6a1a');poly([[x+w*.38,cy+h*.3],[x+w*.5,cy-6-(f?0:4)],[x+w*.62,cy+h*.3]],'#ffd34d');ctx.globalAlpha=1;for(let n=0;n<3;n++)rect(x+w*.5+Math.sin(time*3+n+v.id)*4,cy-14-n*11-(time*11+v.id)%11,5+n*3,6,n?'#6d7970':'#4f5552');}
 if(v.state==='wreck'&&v.rewarded&&v.kind!=='lamp')for(let n=0;n<2;n++)rect(x+w*.5+Math.sin(time*3+n+v.id)*3,v.y-6-n*9-(time*9+v.id)%9,4+n*2,5,'#6d7970');
}
// A civilian on the troops' 7x14 grid, scaled to civilianW x civilianH: hair, skin, shirt, trousers and legs vary by variant.
// Panicked ones run away from the kaiju with their arms up; calm ones idle with a slight bob.
const CIV_SKIN=['#e7b691','#a87562','#d2b28c'],CIV_SHIRT=['#d1cb9d','#9c7884','#71a7a9'],CIV_PANTS=['#4e5b6d','#5d4b3f','#3f4f4a'],CIV_HAIR=['#3a2b22','#1f2326','#8a6a3a'];
function drawCivilian(c:{x:number,variant:number,panicked:boolean},x:number){
 const v=c.variant,run=c.panicked,dir=run?(c.x<player.x+bodyWidth()/2?-1:1):1,step=run?Math.sin(time*18+c.x):0,bob=run?0:Math.sin(time*3+c.x)*.3;
 ctx.save();ctx.translate(Math.round(x+M.civilianW/2),Math.round(groundAt(c.x)-M.civilianH));ctx.scale(dir*M.civilianW/7,M.civilianH/14);ctx.translate(0,bob);
 rect(-2,0,4,4,CIV_SKIN[v]);rect(-2,-1,4,2,CIV_HAIR[v]);if(v===2)rect(-3,0,1,3,CIV_HAIR[v]);
 rect(-3,4,6,5,CIV_SHIRT[v]);rect(-3,9,6,2,CIV_PANTS[v]);
 if(run){rect(-4,1,1,4,CIV_SHIRT[v]);rect(3,1,1,4,CIV_SHIRT[v]);rect(-4,0,1,1,CIV_SKIN[v]);rect(3,0,1,1,CIV_SKIN[v]);}
 else{rect(-4,4,1,4,CIV_SHIRT[v]);rect(3,4,1,4,CIV_SHIRT[v]);}
 rect(-3+step,11,2,3,CIV_PANTS[v]);rect(1-step,11,2,3,CIV_PANTS[v]);rect(-3+step,13,2,1,'#2b3d40');rect(1-step,13,2,1,'#2b3d40');
 ctx.restore();}
function drawPopulation(){
 for(const c of population.civilians){if(c.escaped)continue;const x=c.x-camera;if(x<-20||x>viewW()+20)continue;
 if(c.squashed){const w=M.civilianW*1.3;rect(x-w*.15,groundAt(c.x)-2,w,2,'#7a2a2a');rect(x+w*.2,groundAt(c.x)-3,w*.35,1,'#646d5c');continue;}
 drawCivilian(c,x);}
}
// Ground unit body, drawn from its top-centre (shared by live units and carried/thrown props).
function drawGroundUnit(type:string,w:number,h:number){
 const color=type==='patrol'?'#557288':type==='apc'?'#7b8c61':'#65795b';
 rect(-w/2,h-8,w,8,'#2d403e');rect(-w/2+2,8,w-4,h-13,color);rect(-w*.25,2,w*.5,12,color);
 if(type==='patrol'){rect(-7,3,11,6,'#b0c6b1');rect(-3,-1,5,3,Math.sin(time*10)>0?'#e98a8a':'#a4c9ef');}
 else {rect(-3,0,17,6,'#80916d');rect(5,1,type==='artillery'?31:24,4,'#364f44');}
 if(type==='emplacement'){rect(-7,8,14,14,'#52644c');rect(-17,19,34,4,'#3a4e40');}
 for(let j=-w/2+4;j<w/2;j+=10)rect(j,h-6,6,4,'#5d6c58');
}
// Layer 0: far-lane vehicles, troops, aircraft and fire (behind the kaiju). Layer 1: near-lane vehicles, in front like traffic.
function circle(x:number,y:number,r:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,Math.PI*2);ctx.fill();}
function drawDecals(){for(const d of decals){const x=d.x-camera;if(x>viewW()+40||x+d.w<-40)continue;ctx.globalAlpha=Math.min(1,d.life/2)*(d.kind==='scorch'?.55:.8);
 if(d.kind==='scorch'){ctx.fillStyle='#1d1714';ctx.beginPath();ctx.ellipse(x+d.w/2,groundAt(d.x+d.w/2)+1,d.w/2,4,0,0,Math.PI*2);ctx.fill();}else{rect(x,groundAt(d.x+d.w/2)-1,d.w,2,'#7a2a2a');rect(x+d.w*.3,groundAt(d.x+d.w/2)-2,d.w*.3,1,'#9b3b3b');}ctx.globalAlpha=1;}}
// Fireballs: a white-hot core, an orange ball that swells and fades, then a grey smoke puff rising off it.
function drawFireballs(){for(const f of fireballs){const t=1-f.life/f.max,x=f.x-camera,r=f.r*(.45+.75*Math.sqrt(t));
 if(t>.35){ctx.globalAlpha=Math.max(0,.55*(1-t));circle(x,f.y-t*28,r*1.05,'#4f5552');}
 ctx.globalAlpha=Math.max(0,1-t*1.15);circle(x,f.y,r,f.big?'#ff6a1a':'#ff8a2a');
 for(let k=0;k<5;k++){const a=f.x*.37+k*1.26,rr=r*(.42+.12*(k%3));circle(x+Math.cos(a)*r*.62,f.y+Math.sin(a)*r*.5-t*10,rr,k%2?'#ff7a22':'#e8401a');}
 circle(x+r*.15,f.y-r*.15,r*.68,'#ffc35a');if(t<.3)circle(x,f.y,r*.42*(1-t/.3),'#fff6d8');
 if(t<.18){ctx.globalAlpha=(1-t/.18)*.7;ctx.strokeStyle='#fff0c9';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,f.y,r*1.6+t*240,0,Math.PI*2);ctx.stroke();}
 ctx.globalAlpha=1;}}
// Scorch marks and embers on the kaiju where explosions hit it.
function drawBodyMarks(){const cx=player.x+bodyWidth()/2-camera;for(const b of bodyMarks){const x=cx+b.dx*player.face,y=player.y+b.dy;ctx.globalAlpha=Math.min(1,b.life/1.5)*.7;rect(x-4,y-3,8,6,'#2a1c1a');rect(x-2,y-5,5,3,'#3a2622');if(b.life>2&&Math.sin(time*25+b.dx)>0)rect(x-1,y-1,2,2,'#ffb35c');ctx.globalAlpha=1;}}
// Telegraphs: the tank's aim line, the gunship's rocket lock, the jet's strafing strip, the spotter's call ring round the kaiju.
function drawTelegraphs(){
 // Each mark is stroked twice, dark under bright, so it reads over any building or the kaiju itself.
 const stroke=(w:number,col:string,draw:()=>void)=>{ctx.strokeStyle='#2a0d0d';ctx.lineWidth=w+2;ctx.beginPath();draw();ctx.stroke();ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();draw();ctx.stroke();};
 for(const u of military.units){if(u.hp<=0||u.windup<=0)continue;const p=1-u.windup/Math.max(.01,u.windTotal),locked=u.windup<=MF.lockAt,blink=locked&&Math.sin(time*50)>0,ax=u.aimX-camera,ay=u.aimY;
  const col=locked?(blink?'#fff0c9':'#ff3b2b'):'#ff8a5a';ctx.globalAlpha=.6+.4*p;
  if(u.pending==='shell'){const lane=roadLane(u),ox=u.x+u.w/2+u.face*u.w*.5-camera,oy=u.y+8+(lane===null?0:VC.laneOffset[lane]);ctx.setLineDash?.(locked?[]:[7,5]);stroke(locked?3:2,col,()=>{ctx.moveTo(ox,oy);ctx.lineTo(ax,ay);});ctx.setLineDash?.([]);
   stroke(2,col,()=>{ctx.arc(ax,ay,9,0,Math.PI*2);});rect(ax-12,ay-1,24,2,col);rect(ax-1,ay-12,2,24,col);}
  else if(u.pending==='rockets'){const r=10+40*(1-p);stroke(3,col,()=>{ctx.arc(ax,ay,r,0,Math.PI*2);});for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])rect(ax+dx*(r+3)-(dy?1.5:5),ay+dy*(r+3)-(dx?1.5:5),dy?3:10,dx?3:10,col);
   if(locked)text('LOCK',ax,ay-r-8,10,col,'center');ctx.setLineDash?.([4,6]);stroke(1,col,()=>{ctx.moveTo(u.x+u.w/2-camera,u.y+u.h);ctx.lineTo(ax,ay);});ctx.setLineDash?.([]);}
  else if(u.pending==='strafe'){for(let k=-5;k<=5;k++){rect(ax+k*12-4,groundAt(u.aimX)-5,8,5,'#2a0d0d');rect(ax+k*12-3,groundAt(u.aimX)-4,6,3,col);}text('!',ax,groundAt(u.aimX)-14,15,col,'center');}
  ctx.globalAlpha=1;}
 for(const u of military.units)if(u.hp>0&&u.spotter&&u.call>MF.spotterSeconds*.5){const p=(u.call-MF.spotterSeconds*.5)/(MF.spotterSeconds*.5),cx=player.x+bodyWidth()/2-camera,col=Math.sin(time*(8+p*20))>0?'#ff3b2b':'#ffb35c';
  ctx.globalAlpha=.5+.5*p;stroke(2,col,()=>{ctx.ellipse(cx,groundAt(player.x+bodyWidth()/2)-2,MF.strikeRadius*(1.4-p*.4),7,0,0,Math.PI*2);});
  ctx.setLineDash?.([3,5]);stroke(1,col,()=>{ctx.moveTo(u.x+u.w/2-camera,u.y-8);ctx.lineTo(cx,groundAt(player.x+bodyWidth()/2)-4);});ctx.setLineDash?.([]);ctx.globalAlpha=1;}
}
// Edge arrows for hostiles about to come into view (aircraft red, ground amber), so waves are seen before they arrive.
function drawIncoming(){const vw=viewW();for(const u of military.units){if(u.hp<=0)continue;const sx=u.x-camera,air=UNITS[u.type].air;
 const left=sx+u.w<0&&sx>-700,right=sx>vw&&sx<vw+700;if(!left&&!right)continue;const heading=air&&(u.type==='jet'||u.type==='bomber')?u.pass:u.face;if(left&&heading<0||right&&heading>0)continue;
 const ex=left?10:vw-10,d=left?-1:1,y=Math.max(150,Math.min(C.ground-10,u.y+u.h/2)),col=air?'#ff5a4a':'#f3c06a',pulse=Math.sin(time*10)>0?1:.6;ctx.globalAlpha=pulse;poly([[ex+d*8,y],[ex-d*4,y-8],[ex-d*4,y+8]],col);ctx.globalAlpha=1;}}
function drawBanner(){if(!banner)return;const a=Math.min(1,banner.life/.4,(2.4-banner.life)/.2+.2),slide=Math.max(0,(banner.life-2.1))*600*(banner.side||0);ctx.globalAlpha=Math.max(0,a);
 rect(0,172,960,26,'#15262cdd');rect(0,172,960,2,'#e8506a');rect(0,196,960,2,'#e8506a');const label=banner.side<0?`◀ ${banner.label}`:banner.side>0?`${banner.label} ▶`:banner.label;text(label,480+slide,190,14,'#ffd9c9','center');ctx.globalAlpha=1;}
function drawMilitary(layer:0|1){
 const front=(lane:0|1|null)=>lane===1;
 for(const wreck of military.wrecks){const x=wreck.x-camera;if(x<-100||x>viewW()+40||front(wreck.lane)!==(layer===1))continue;
  if(wreck.air){ctx.save();ctx.translate(x+wreck.w/2,wreck.y+wreck.h/2);ctx.rotate(wreck.angle);poly([[-wreck.w/2,0],[-wreck.w*.2,-wreck.h*.45],[wreck.w*.4,-wreck.h*.3],[wreck.w/2,wreck.h*.2],[-wreck.w*.3,wreck.h*.45]],'#2f3a37');rect(-wreck.w*.3,-3,wreck.w*.5,5,'#4c5a55');
   if(wreck.falling){const f=Math.sin(time*40)>0;poly([[-8,-4],[-wreck.w*.6,-10-(f?6:0)],[-wreck.w*.4,2],[-wreck.w*.7,10],[-6,6]],f?'#ff8a1f':'#ffcf73');}ctx.restore();
   const n=wreck.falling?4:3;for(let j=0;j<n;j++)rect(x+wreck.w*.5-(wreck.falling?j*wreck.vx*.04:0)+Math.sin(time*3+j)*4,wreck.y-8-j*12-(time*12%12),7+j*3,8,j===0&&wreck.falling?'#5e6460':'#718077');
   if(!wreck.falling){const f=Math.sin(time*17+wreck.x)>0;poly([[x+wreck.w*.3,groundAt(wreck.x+wreck.w/2)],[x+wreck.w*.4,groundAt(wreck.x+wreck.w/2)-12-(f?5:0)],[x+wreck.w*.55,groundAt(wreck.x+wreck.w/2)-6],[x+wreck.w*.65,groundAt(wreck.x+wreck.w/2)-15+(f?4:0)],[x+wreck.w*.75,groundAt(wreck.x+wreck.w/2)]],'#ff8a1f');}
   continue;}
  ctx.save();ctx.translate(0,wreck.lane===null?0:VC.laneOffset[wreck.lane]);rect(x,wreck.y+wreck.h*.65,wreck.w,wreck.h*.35,'#3c4945');rect(x+8,wreck.y+wreck.h*.5,wreck.w*.6,6,'#677165');for(let j=0;j<3;j++)rect(x+wreck.w*.5+Math.sin(time+j)*4,wreck.y-8-j*12-(time*12%12),7+j*3,8,'#718077');ctx.restore();}
 for(const u of military.units){const lane=roadLane(u);if(u.hp<=0||u.x+u.w<camera-100||u.x>camera+viewW()+100||front(lane)!==(layer===1))continue;const x=u.x-camera,y=u.y+(lane===null?0:VC.laneOffset[lane]),d=UNITS[u.type];
 ctx.save();ctx.translate(Math.round(x+u.w/2),Math.round(y));ctx.scale(u.face,1);if(u.flash>0)ctx.filter='brightness(0) invert(1)';
 if(u.type==='police'||u.type==='soldier'){ctx.scale(u.w/7,u.h/14);
 if(u.spotter){rect(-3,-7,1,7,'#2b3d40');rect(-4,-9,3,3,(u.call>MF.spotterSeconds*.5?Math.sin(time*30)>0:Math.sin(time*6)>0)?'#ff5a4a':'#5a2a2a');}
 rect(-2,0,5,4,'#d7b08c');rect(-3,4,6,6,u.type==='police'?'#445b76':'#647653');rect(-4,-1,7,2,u.type==='police'?'#36516d':'#667354');rect(2,5,7,2,'#263d3d');rect(-3,10,2,4,'#2b3d40');rect(1,10,2,4,'#2b3d40');
 }else if(u.type==='helicopter'){
 poly([[-23,6],[-9,1],[15,1],[25,10],[17,18],[-9,18],[-20,12]],'#596e60');rect(-32,7,20,3,'#566d60');rect(-34,0,4,12,'#627968');rect(-6,18,26,2,'#2d4141');rect(0,-5,3,7,'#394d49');rect(-32,-6,65,2,'#374b47');rect(13,4,10,7,'#b2c6a9');
 }else if(u.type==='jet'||u.type==='bomber'){
 poly([[-u.w/2,8],[-10,4],[u.w/2,8],[10,13],[-u.w/2+4,14]],u.type==='jet'?'#73877f':'#5d7160');poly([[-15,8],[-22,-5],[9,8],[-20,24]],'#4d6560');rect(15,5,8,3,'#c4d1b8');
 }else{
 drawGroundUnit(u.type,u.w,u.h);
 }
 ctx.restore();
 if(u.hp<u.maxHP*.6){for(let j=0;j<2;j++)rect(x+u.w/2+Math.sin(time*4+j)*3,y-j*11-6-(time*10%10),5+j*3,6,'#6d7970');}
 if(u.stun>0)for(let j=0;j<3;j++){const t=time*7+j*2.1;rect(x+u.w/2+Math.cos(t)*(u.w*.35+4)-2,y-8+Math.sin(t)*3-2,4,4,'#f7e27a');}
 }
 if(layer===1)return;
 for(const p of military.projectiles){if(p.dead)continue;const x=p.x-camera,y=p.y;
 if(p.weapon==='bomb'||p.weapon==='artillery'){
 const wx=p.targetX-camera,r=p.radius;ctx.strokeStyle='#cf685c';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(wx,groundAt(p.targetX)-2,r,6,0,0,Math.PI*2);ctx.stroke();rect(wx-7,groundAt(p.targetX)-3,14,2,'#e7886d');rect(wx-1,groundAt(p.targetX)-9,2,13,'#e7886d');text('!',wx,groundAt(p.targetX)-16,12,'#b84c48','center');
 }
 if(p.weapon==='bullet'){rect(x-3,y-1,7,2,'#fff6bb');}
 else if(p.weapon==='shell'){rect(x-5,y-3,10,6,'#e7af69');rect(x-1,y-2,5,4,'#fff0b4');}
 else if(p.weapon==='rocket'){rect(x-7,y-3,14,6,'#ded7af');rect(x-(p.vx>0?12:-9),y-2,7,4,'#e69d60');}
 else if(p.weapon==='bomb'){rect(x-4,y-6,8,13,'#354e46');rect(x-7,y-7,14,3,'#a99c68');rect(x-2,y+5,4,3,'#c7b17c');}
 else {rect(x-4,y-5,8,10,'#f4ca8c');rect(x-1,y-3,3,6,'#fff0c7');}
 }
 for(const e of military.effects){const x=e.x-camera,r=e.radius*(1-e.life/M.impactSeconds);ctx.strokeStyle=e.harmless?'#e6d9b0':'#e49b6e';ctx.lineWidth=e.harmless?3:5;ctx.beginPath();ctx.arc(x,e.y,Math.max(2,r),0,Math.PI*2);ctx.stroke();rect(x-4,e.y-4,8,8,e.harmless?'#fff0c9':'#f7be7d');}
}

function drawCampaignObjective(){
 if(objective&&!objective.shattered){const x=objective.x-camera;poly([[x-38,groundAt(objective.x)],[x-28,groundAt(objective.x)-64],[x-10,groundAt(objective.x)-40],[x+2,groundAt(objective.x)-110],[x+30,groundAt(objective.x)-74],[x+40,groundAt(objective.x)]],'#c96ea8');poly([[x-5,groundAt(objective.x)-8],[x+2,groundAt(objective.x)-98],[x+17,groundAt(objective.x)-56]],'#ffd0ed');text('CENTRAL CRYSTAL',x,groundAt(objective.x)-126,10,'#3b504a','center');}
 if(rival&&!rival.dead){const r=rival,x=r.x-camera;const tint=CITIES[cityIndex].colors[1];
 ctx.save();ctx.translate(Math.round(x+r.w/2),Math.round(r.y+r.h+C.spriteDrop));ctx.scale(r.face,1);
 poly([[-36,-16],[-46,-50],[-28,-42],[-32,-82],[-14,-74],[-7,-106],[12,-88],[28,-70],[38,-55],[35,-22]],tint);rect(-25,-75,50,62,'#4e5e59');rect(8,-74,35,27,tint);rect(27,-66,6,4,'#f1a8d4');rect(-26,-14,19,14,'#314b43');rect(10,-14,23,14,'#314b43');if(r.windup>0){rect(12,-48,35,12,'#f2b077');text('!',0,-123,20,'#f0a569','center');}ctx.restore();
 text(bossName().toUpperCase(),x+r.w/2,r.y-15,11,'#324c44','center');
 for(const shot of r.shots){const sx=shot.x-camera;poly([[sx-10,shot.y],[sx-3,shot.y-6],[sx+9,shot.y],[sx+2,shot.y+6]],'#d694bf');}
 }
}
// Afterburn: a cluster of flickering flame tongues licking up the wall where the jet hit, dying down over its last second.
function drawBurns(){for(const f of burns){const z=f.size,x=f.x-camera+f.side*5*z,y=f.b.base-f.y,k=Math.min(1,f.t);if(x<-40||x>viewW()+40)continue;
 for(let n=0;n<2;n++){const cx=x+f.side*n*7*z,hh=(12+9*Math.abs(Math.sin(time*9+n*1.7+f.y*.3)))*k*z,ww=(5+n*2)*z;
  poly([[cx-ww,y+6],[cx-ww*.3,y-hh*.5],[cx,y-hh],[cx+ww*.4,y-hh*.45],[cx+ww,y+6]],'#e8401a');
  poly([[cx-ww*.5,y+6],[cx,y-hh*.55],[cx+ww*.5,y+6]],'#ffb13b');}}}
// Flame Jet: flickering octagons marched along the cone, dark red outside to a white-hot core, ragged at the tip.
function drawJet(){const j=jet;if(!j||j.phase!=='on'||j.len<=0||isBelial())return;
 const g=Math.sqrt(scale(combat)),[w0,w1]=B.jetWidth,R=B.jetRange*g,nx=-j.dy,ny=j.dx;
 for(const [k,col] of [[1,'#a8281a'],[.78,'#ec5a17'],[.52,'#ffae2e'],[.26,'#fff2c0']] as [number,string][])
  for(let d=0;d<=j.len;d+=5){const f=Math.min(1,d/R),tip=Math.min(1,(j.len-d)/(14*g)+.35),wob=Math.sin(time*47+d*.37+k*9),full=(w0+(w1-w0)*f)*g,r=full*k*tip*(.82+.18*Math.sin(time*61+d*.23));
   if(r<1)continue;const [px,py]=jetPoint(j,d,full),bent=d>=j.bend,x=px+(bent?0:nx*wob*r*.3)-camera,y=py+(bent?-Math.abs(wob)*r*.25:ny*wob*r*.3),q=r*.41;
   poly([[x-q,y-r],[x+q,y-r],[x+r,y-q],[x+r,y+q],[x+q,y+r],[x-q,y+r],[x-r,y+q],[x-r,y-q]],col);}}
// Acid Vomit: a ropey stream of round blobs along the arc, dark rim to a pale core, thicker the higher the pressure, wobbling, with
// a few stray drops peeling off it.
function drawSpew(){const j=jet,pts=spewState.pts;if(!j||j.phase!=='on'||!isBelial()||pts.length<2)return;
 const g=Math.sqrt(scale(combat)),full=(2.6+2.6*jetFuel)*g;
 for(const [k,col] of [[1,'#3f5a12'],[.72,'#8fbf22'],[.42,'#c8f03a'],[.18,'#efffb0']] as [number,string][])
  for(let i=0;i<pts.length;i++){const [px,py]=pts[i],f=i/(pts.length-1),wob=Math.sin(time*38+i*.9+k*4),r=full*k*(.85+.25*wob)*(i<3?.7+i*.1:1)*(1-.25*f);
   if(r<.8)continue;disc(px-camera,py,r,col,8);}
 for(let i=4;i<pts.length;i+=9){const [px,py]=pts[i],o=(time*90+i*13)%14;disc(px-camera+Math.sin(i)*3*g,py+o*g,1.4*g,'#9ccc2a',6);}}
// Corroded buildings: green streaks running down from the top and pitting on the facade, more of both with more stacks, fizzing.
function drawCorrosion(b:typeof buildings[number],x:number,h:number){const c=corr.get(b);if(!c||h<10)return;const y=b.base-h,n=c.stacks*3,fade=Math.min(1,c.t/1.5);
 for(let i=0;i<n;i++){const sx=x+6+((i*37+Math.round(b.x))%Math.max(8,b.w-18)),len=(h*(.18+.12*c.stacks))*(.6+.4*Math.abs(Math.sin(i*2.7)))*fade,wid=2+(i%3);
  rect(sx,y+4,wid,len,'#7fa61e');rect(sx,y+4,Math.max(1,wid-1),len*.7,'#b8e63a');rect(sx-1,y+4+len,wid+2,3,'#c8f03a');}
 for(let i=0;i<c.stacks*4;i++){const px=x+8+((i*53+Math.round(b.x)*3)%Math.max(8,b.w-20)),py=y+12+((i*71)%Math.max(8,h-30));rect(px,py,4,3,'#5f7f16');rect(px+1,py,2,1,'#c8f03a');}}
// Eruption: while charging, a pulsing glow round him that swells and flickers faster as the pressure builds; then the explosion, a
// fireball filling the blast circle (layered polygons, white core to dark rim) with a shock ring racing just ahead of it, then fading.
function disc(x:number,y:number,r:number,col:string,n=20){const pts:number[][]=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}poly(pts,col);}
// The charge shudders him in place, harder as the pressure builds.
function eruptionShudder(){if(deluge&&!deluge.spout&&combat.ultimateTime>0){const p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.delugeCharge);return Math.round(Math.sin(time*55)*p*1.6);}
 const e=eruption;if(!e||e.blasted)return 0;const p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.eruptCharge);return Math.round(Math.sin(time*70)*p*2.2);}
// Acid Deluge geyser: a thick wobbling column of acid blobs from the jaws straight up past the top of the view, dark rim to pale core
// like the Acid Vomit stream, swelling in over its first instant and thinning out as it stops.
function drawGeyser(){const d=deluge;if(!d?.spout||d.spoutT>d.spoutLen+.12)return;
 const g=Math.sqrt(scale(combat)),top=C.ground-C.ground/zoom-cameraY-30,grow=Math.min(1,d.spoutT/.1),fade=d.spoutT>d.spoutLen?1-(d.spoutT-d.spoutLen)/.12:1,full=9*g*grow*fade,x0=d.mx-camera;
 if(full<.8)return;
 for(const [k,col] of [[1,'#3f5a12'],[.72,'#8fbf22'],[.42,'#c8f03a'],[.18,'#efffb0']] as [number,string][])
  for(let y=d.my,i=0;y>top;y-=6,i++){const up=(d.my-y)/Math.max(1,d.my-top),wob=Math.sin(time*36+i*.8+k*3),r=full*k*(.85+.2*wob)*(1+up*.6);
   disc(x0+Math.sin(time*9+i*.35)*2*g*up,y,r,col,8);}
 // Gobs bursting off the column.
 for(let i=0;i<10;i++){const ph=(time*1.7+i*.137)%1,y=d.my-(d.my-top)*ph,x=x0+Math.sin(i*2.3+time*4)*full*(1.4+ph);disc(x,y,1.8*g,'#9ccc2a',6);}}
// Deluge rain: elongated drops, a dark trailing streak behind a bright head.
function drawRain(){for(const r of rain){const x=r.x-camera;if(x<-10||x>viewW()+10)continue;const z=r.size,len=z*Math.min(6,2+r.vy/250);
 rect(x-z*.5,r.y-len,z,len,'#7fa61e99');rect(x-z*.6,r.y-z*1.4,z*1.2,z*1.6,'#c8f03a');rect(x-z*.25,r.y-z*1.1,z*.5,z*.6,'#efffb0');}}
function drawEruptionGlow(){const e=eruption;if(!e||e.blasted)return;const w=bodyWidth(),h=bodyHeight(),{x,y,g}=eruptionCore(w,h),p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.eruptCharge),pulse=.5+.5*Math.sin(time*(8+30*p));
 const r=(36+64*p+10*pulse)*g,sx=x-camera,sy=Math.min(groundAt(x)-r*.2,y+h*.2);
 disc(sx,sy,r*1.3,`rgba(232,64,26,${(.1+.18*p*pulse).toFixed(3)})`);disc(sx,sy,r,`rgba(255,138,31,${(.12+.22*p*pulse).toFixed(3)})`);disc(sx,sy,r*.55,`rgba(255,226,140,${(.1+.25*p*pulse).toFixed(3)})`);}
// Over the body: the hide itself glows hotter as the pressure builds.
function drawEruptionHeat(){const e=eruption;if(!e||e.blasted)return;const w=bodyWidth(),h=bodyHeight(),{x,y,g}=eruptionCore(w,h),p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.eruptCharge),pulse=.5+.5*Math.sin(time*(8+30*p));
 disc(x-camera,Math.min(groundAt(x)-8,y+h*.25),(26+14*p)*g,`rgba(255,200,90,${(.04+.14*p*pulse).toFixed(3)})`);}
function drawEruption(){const e=eruption;if(!e?.blasted)return;const w=bodyWidth(),h=bodyHeight(),{x,y,g}=eruptionCore(w,h),R=B.eruptBlastRange*g,t=e.boom,grow=Math.min(1,t/.18),fade=Math.max(0,1-Math.max(0,t-.25)/.5),sx=x-camera;
 if(fade<=0)return;const r=R*(.3+.7*Math.sqrt(grow)),a=(v:number)=>(v*fade).toFixed(3);
 for(const [k,col] of [[1,`rgba(168,40,26,${a(.55)})`],[.82,`rgba(236,90,23,${a(.7)})`],[.6,`rgba(255,174,46,${a(.8)})`],[.35,`rgba(255,242,192,${a(.9)})`]] as [number,string][]){
  const pts:number[][]=[];for(let i=0;i<28;i++){const an=i/28*Math.PI*2,j=1+.07*Math.sin(time*40+i*2.3+k*5);pts.push([sx+Math.cos(an)*r*k*j,y+Math.sin(an)*r*k*j]);}poly(pts,col);}
 const ring=R*(.4+.75*Math.min(1,t/.3));if(t<.45)for(let i=0;i<36;i++){const an=i/36*Math.PI*2,z=(9-12*t)*g;rect(sx+Math.cos(an)*ring-z/2,y+Math.sin(an)*ring-z/2,z,z,i%2?'#ffd34d':'#fff2c0');}}
function render(){
 fitCanvas();
 if(mode==='intro'){drawIntro(ctx,introElapsed);return;}
 if(mode==='ending'){drawEnding(ctx,endingName);return;}
 if(['title','setup','selection','freeplay-select','gallery','settings','scores','confirm','progress','conquered'].includes(mode)){drawMenuBackdrop(ctx,time);if(mode==='selection')paintPreviews();return;}
 ctx.clearRect(0,0,960,540);rect(0,0,960,540,CITIES[cityIndex].sky);ctx.save();if(display.shake&&(shake>0||Math.abs(kickX)+Math.abs(kickY)>.3))ctx.translate(Math.round(Math.sin(time*63)*shake+kickX),Math.round(Math.cos(time*77)*shake*.5+kickY));
 rect(0,0,960,540,CITIES[cityIndex].sky);ctx.save();ctx.translate(0,C.ground);ctx.scale(zoom,zoom);ctx.translate(0,-C.ground+cameraY);background();drawSubway();drawPits();if(block.subway)drawTrains(Math.max(-8,block.subway[0][0]-camera),Math.min(viewW()+8,block.subway[0][1]-camera));drawBridge();for(const b of buildings)if(b.topple===2)drawFallen(b);for(const b of buildings)if(b.topple!==1)drawBuilding(b);for(const b of buildings)if(b.topple===1)drawBuilding(b);drawMounds();drawBurns();drawDecals();drawPowerLines();for(const c of chunks){const cx=c.x-camera;if(cx<-20||cx>viewW()+20)continue;ctx.globalAlpha=Math.min(1,c.life/.5);rect(cx,c.y,c.s,c.s,c.color);rect(cx,c.y+c.s-1,c.s,1,'#26343a');ctx.globalAlpha=1;}drawVehicles(0);drawPopulation();drawMilitary(0);drawCampaignObjective();
 const exitX=worldWidth-65-camera;
 rect(exitX,groundAt(worldWidth-65)-90,5,90,objectiveOpen()?'#c7ee83':'#6a7d75');
 if(objectiveOpen()){poly([[exitX-20,358],[exitX+6,358],[exitX+6,348],[exitX+27,365],[exitX+6,382],[exitX+6,372],[exitX-20,372]],'#c7ee83');text('EXIT',exitX,342,10,'#213d35','center');}
 if(openLayout()){const wx=60-camera;rect(wx,groundAt(60)-90,5,90,objectiveOpen()?'#c7ee83':'#6a7d75');if(objectiveOpen()){poly([[wx+25,358],[wx-1,358],[wx-1,348],[wx-22,365],[wx-1,382],[wx-1,372],[wx+25,372]],'#c7ee83');text('EXIT',wx+3,342,10,'#213d35','center');}}
 for(const g of growths){const x=g.x-camera;poly([[x-22,groundAt(g.x)],[x-16,groundAt(g.x)-40],[x-5,groundAt(g.x)-24],[x+3,groundAt(g.x)-62],[x+16,groundAt(g.x)-40],[x+22,groundAt(g.x)]],'#cf77b4');poly([[x-4,groundAt(g.x)-5],[x+3,groundAt(g.x)-55],[x+10,groundAt(g.x)-34]],'#ffbedf');text('CRYSTAL',x,groundAt(g.x)-72,8,'#334b43','center');}
 for(const shard of shards){const x=shard.x-camera,y=shard.y+Math.sin(time*3+shard.x)*2;poly([[x,y-8],[x+5,y],[x,y+6],[x-5,y]],'#ffc1e3');rect(x-1,y-5,2,6,'#fff1f6');}
 // Lava pools: a glowing puddle on the street, flickering and shrinking toward the middle as it cools.
 // Flame Jet fires: ragged tongues of flame along the street that shrink and redden as they die down.
 for(const p of pools){if(!p.fire)continue;const f=Math.min(1,p.life/p.max*1.6),x=p.x-camera,z=p.size??1;if(x>viewW()+40||x+p.w<-40)continue;
  rect(x,groundAt(p.x+p.w/2)-2,p.w,3,'#3a1a14');
  for(let k=0;k<3;k++){const cx=x+p.w*(k+.5)/3,hh=(10+8*Math.abs(Math.sin(time*11+p.x*.37+k*2.1)))*f*z,ww=p.w/6;
   poly([[cx-ww,groundAt(p.x+p.w/2)],[cx-ww*.4,groundAt(p.x+p.w/2)-hh*.6],[cx,groundAt(p.x+p.w/2)-hh],[cx+ww*.5,groundAt(p.x+p.w/2)-hh*.55],[cx+ww,groundAt(p.x+p.w/2)]],f>.5?'#e8401a':'#a8341c');
   if(f>.3)poly([[cx-ww*.5,groundAt(p.x+p.w/2)],[cx,groundAt(p.x+p.w/2)-hh*.6],[cx+ww*.5,groundAt(p.x+p.w/2)]],'#ffb13b');}}
 // Acid puddles: a flat green slick that bubbles, shrinking toward the middle and darkening as it dries.
 for(const p of pools){if(!p.acid)continue;const f=Math.min(1,p.life/p.max*2),w=p.w*(.55+.45*f),x=p.x+(p.w-w)/2-camera;if(x>viewW()+40||x+w<-40)continue;
  rect(x-2,groundAt(p.x+p.w/2)-2,w+4,4,'#33410f');rect(x,groundAt(p.x+p.w/2)-3,w,3,f>.5?'#8fbf22':'#6b8c1a');rect(x+w*.2,groundAt(p.x+p.w/2)-3,w*.5,1,'#c8f03a');
  for(let k=0;k<2;k++){const bx=x+w*((k*.47+time*.13+p.x*.01)%1),ph=(time*3+k*1.7+p.x*.05)%1;if(f>.25&&ph<.6)rect(bx,groundAt(p.x+p.w/2)-4-ph*4,2,2,'#e6ff8a');}}
 for(const p of pools){if(p.fire||p.acid)continue;const f=Math.min(1,p.life/p.max*2.2),w=p.w*(.6+.4*f),x=p.x+(p.w-w)/2-camera,fl=Math.sin(time*18+p.x)>0;
  rect(x-3,groundAt(p.x+p.w/2)-3,w+6,5,'#3a1a14');rect(x,groundAt(p.x+p.w/2)-4,w,4,f>.5?'#e8401a':'#a8341c');rect(x+w*.15,groundAt(p.x+p.w/2)-4,w*.7,2,fl?'#ffb13b':'#ff8a1f');
  if(f>.4)rect(x+w*.35,groundAt(p.x+p.w/2)-5,w*.3,2,'#ffe08a');}
 for(const wave of waves){const x=wave.x-camera;
  if(wave.ult){poly([[x-26,groundAt(wave.x)],[x-17,groundAt(wave.x)-10],[x-6,groundAt(wave.x)-6],[x+2,groundAt(wave.x)-42],[x+10,groundAt(wave.x)-9],[x+23,groundAt(wave.x)]],'#ed9bc9');rect(x-16,groundAt(wave.x),38,3,'#ffe2f1');continue;}
  // Tremor: a jagged earth crest leaning the way it rolls with rock slabs jutting from it, a glowing fissure under it and a
  // cracked trail behind, shrinking as it dies out.
  const d=Math.sign(wave.vx)||1,z=wave.size*(.55+.45*Math.min(1,wave.life/wave.max*1.6)),j=Math.sin(time*40+wave.x)*3*z;
  rect(Math.min(x-d*90*z,x-d*10*z),groundAt(wave.x),80*z,2,'#4a3a2e');rect(Math.min(x-d*40*z,x+d*40*z),groundAt(wave.x)-1,80*z,3,'#ffb35c');
  poly([[x-d*36*z,groundAt(wave.x)],[x-d*24*z,groundAt(wave.x)-18*z],[x-d*12*z,groundAt(wave.x)-12*z],[x+d*2*z,groundAt(wave.x)-(52*z+j)],[x+d*14*z,groundAt(wave.x)-20*z],[x+d*22*z,groundAt(wave.x)-30*z+j],[x+d*34*z,groundAt(wave.x)]],'#7d6250');
  poly([[x-d*16*z,groundAt(wave.x)],[x-d*6*z,groundAt(wave.x)-16*z],[x+d*3*z,groundAt(wave.x)-(40*z+j)],[x+d*12*z,groundAt(wave.x)-16*z],[x+d*20*z,groundAt(wave.x)]],'#c9a77c');
  poly([[x-d*26*z,groundAt(wave.x)-2],[x-d*20*z,groundAt(wave.x)-(30*z-j)],[x-d*14*z,groundAt(wave.x)-4]],'#a88866');
  rect(x+d*6*z-3*z,groundAt(wave.x)-(62*z+j*2),6*z,6*z,'#c9a77c');rect(x-d*8*z-2*z,groundAt(wave.x)-(48*z-j*2),4*z,4*z,'#8d7a66');
  rect(Math.min(x,x+d*40*z),groundAt(wave.x),40*z,3,'#ffe0a8');}
 if(combat.superTime>0){const x=player.x-camera;rect(x-7,player.y-7,bodyWidth()+14,bodyHeight()+10,Math.sin(time*10)>0?'#c47cab':'#8d799e');}
 drawEruptionGlow();if(hurtFlash>0)ctx.filter=hurtRed&&hurtFlash<MF.hurtFlash*.55?'sepia(1) saturate(8) hue-rotate(-40deg) brightness(1.1)':'brightness(0) invert(1)';monster(player.x-camera+eruptionShudder()+hurtJolt,player.y,player.face,player.crouched,player.pose);ctx.filter='none';drawBodyMarks();drawEruptionHeat();drawJet();drawSpew();drawGeyser();drawEruption();drawVehicles(1);drawMilitary(1);drawRiverFront();drawTelegraphs();drawCityFx();
 if(combat.transform>0){const x=player.x-camera+bodyWidth()/2,y=player.y+bodyHeight()/2;const radius=bodyHeight()*.75;poly([[x,y-radius],[x+radius*.6,y],[x,y+radius],[x-radius*.6,y]],'#f4b0d8');poly([[x,y-radius*.85],[x+radius*.35,y],[x,y+radius*.8],[x-radius*.35,y]],'#ffe0f1');}
 if(combat.ultimateTime>0)text(ultimateLabel(),player.x-camera+bodyWidth()/2,player.y-24,10,'#fff1d8','center');
 // Launched tail quill: bone-white spike pointing along its flight, dark base, faint motion streak.
 // Debris Shotgun rocks: tumbling slabs of street with a dark rim.
 for(const r of rocks){rect(r.x-camera-Math.sign(r.vx)*r.size*2.2-r.size*.6,r.y-r.size*.3-r.vy*.012,r.size*1.2,r.size*.6,'#c9a77c66');const sx=r.x-camera,z=r.size,c=Math.cos(r.spin),n=Math.sin(r.spin),pts=[[-1,-.6],[.7,-1],[1,.4],[-.3,.85]],at=(k:number)=>pts.map(([px,py])=>[sx+(px*c-py*n)*z*k,r.y+(px*n+py*c)*z*k]);poly(at(1.3),'#3b2f28');poly(at(1),'#9a8670');}
 // Magma Dive globs: a dark crust round a molten core with a short trailing streak.
 for(const g of globs){const sx=g.x-camera,z=g.size;rect(sx-g.vx*.03-z*.5,g.y-g.vy*.03-z*.5,z,z,'#ff8a1f66');rect(sx-z,g.y-z,z*2,z*2,'#5a1d12');rect(sx-z*.7,g.y-z*.7,z*1.4,z*1.4,'#ff6a1a');rect(sx-z*.35,g.y-z*.45,z*.7,z*.6,'#ffd34d');}
 for(const s of shots){const sx=s.x-camera,d=Math.sign(s.vx)||1;rect(Math.min(sx-26*d,sx-14*d),s.y-1,12,2,'#efe2ba55');poly([[sx+16*d,s.y],[sx-4*d,s.y-3],[sx-14*d,s.y-2],[sx-14*d,s.y+2],[sx-4*d,s.y+3]],'#efe2ba');poly([[sx-14*d,s.y-2],[sx-9*d,s.y-2.5],[sx-9*d,s.y+2.5],[sx-14*d,s.y+2]],'#6a2f45');}
 for(const p of particles)rect(p.x-camera,p.y,p.size,p.size,p.color);
 drawRain();drawFireballs();drawIncoming();
 ctx.restore();ctx.restore();if(eruption?.blasted){rect(0,0,960,540,`rgba(255,80,20,${(.16+.04*Math.sin(time*9)).toFixed(3)})`);if(eruption.flash>0)rect(0,0,960,540,`rgba(255,236,190,${(eruption.flash*1.1).toFixed(3)})`);}
 // The downpour greens the whole sky while it lasts.
 if(rain.length)rect(0,0,960,540,`rgba(150,210,40,${Math.min(.14,rain.length*.004+.04*Math.sin(time*7)**2).toFixed(3)})`);drawRain2();hud();
}
// The clock starts on the first animation frame (dt 0), not at script load: load time otherwise leaked into the first step,
// making runs nondeterministic. The clamp still guards against a timestamp going backwards.
let last=-1;function frame(now:number){if(last<0)last=now;const dt=Math.max(0,Math.min((now-last)/1000,C.maxDelta));last=now;update(dt);render();requestAnimationFrame(frame);}title();requestAnimationFrame(frame);
// Read-only inspection hook for smoke tests; no gameplay mutations.
loadPresentationArt();window.addEventListener('resize',applyDisplay);applyDisplay();
Object.defineProperty(window,'kaijuDebug',{get:()=>({ground:(x:number)=>groundAt(x),street:(x:number)=>bedAt(x),blazeList:[...blazes.keys()].map(b=>buildings.indexOf(b as typeof buildings[number])),blazes:blazes.size,mounds:moundList().length,sunk:buildings.filter(b=>b.sink>0).length,swaying:buildings.filter(b=>b.sway>0).length,damageTaken:combat.damageTaken,spans:spans.map(s=>({x0:s.x0,x1:s.x1,hp:s.hp,alive:s.alive})),pits:pitList().map(p=>({...p})),trains:trains.filter(t=>!t.crashed).length,trainsWrecked:wrecked,trainWrecks:trains.filter(t=>t.crashed).length,trainList:trains.map(t=>({x:t.x,dir:t.dir,hp:t.hp,crashed:t.crashed})),cutOff:{...military.cutOff},inWater:submerged(player.x+bodyWidth()/2),rampage:{heat:rampage.heat,mult:rampageMult(rampage),level:rampageLevel(rampage)},power:[...power],roofs:roofs.map(p=>({kind:p.kind,hp:p.hp,dead:p.dead,call:p.call,x:roofBox(p).x,y:roofBox(p).y})),wires:wires.length,poles:poles.map(v=>({x:v.x,upright:upright(v),snapped:!!v.snapped})),creaking:buildings.filter(b=>b.creak>0).length,roles:buildings.filter(b=>b.role).map(b=>({role:b.role,x:b.x,hp:b.hpNow})),barges,cameraY,zoom,camera,mode,clinging:!!clingTo,running,diving:!!dive,rolling:!!roll,anim:currentAnim()[0],face:player.face,grounded:player.grounded,vy:player.vy,cooldown:combat.cooldown,rangedCooldown:combat.rangedCooldown,canAct:canAct(combat),blockKind:block.kind,cityScore:Math.round(cityScore()),banked:run?.banked??0,buildings:buildings.map(b=>({floors:b.floors.length,base:b.base,x:b.x,y:b.base-b.h,w:b.w,h:b.h,hp:b.hpNow,kind:b.kind,landmark:!!b.landmark,cache:!!b.cache,topple:b.topple,tiltDir:b.tiltDir,holes:b.holes.length,lifted:b.lifted})),hitstop,chunks:chunks.length,held:held?held.kind:null,vehicles:vehicles.map(v=>({id:v.id,kind:v.kind,state:v.state,x:v.x,y:v.y,w:v.w,h:v.h,angle:v.angle,traffic:v.traffic,dir:v.dir,panic:v.panic,burn:v.burn??0,thrown:!!v.thrown})),rival:rival?{x:rival.x,y:rival.y,w:rival.w,h:rival.h,hp:rival.hp,windup:rival.windup,attack:rival.attack}:null,militaryUnits:military.units.map(u=>({type:u.type,x:u.x,y:u.y,hp:u.hp,windup:u.windup,pending:u.pending,stun:u.stun,spotter:u.spotter})),fireballs:fireballs.length,banner:banner?.label??null,hurtFlash,entityCounts:{units:military.units.length,enemyShots:military.projectiles.length,effects:military.effects.length,wrecks:military.wrecks.length,waves:waves.length,tremorWaves:waves.filter(w=>!w.ult).length,shards:shards.length,particles:particles.length,civilians:population.civilians.length,growths:growths.length,playerShots:shots.length,rocks:rocks.length,lavaGlobs:globs.length,lavaPools:pools.filter(p=>!p.fire&&!p.acid).length,acidPools:pools.filter(p=>p.acid).length,jetFires:pools.filter(p=>p.fire).length,burning:burns.length},stampeding:!!stampede?.charging,erupting:!!eruption?.blasted,delugeSpout:!!deluge?.spout&&deluge.spoutT<deluge.spoutLen,delugeActive:!!deluge,rainDrops:rain.length,delugeSpawned:deluge?.spawned??0,delugeLandings:[...delugeLandings],delugePools:pools.filter(p=>p.acid&&p.ult).length,eruptGlobs:globs.filter(g=>g.ult).length,eruptPools:pools.filter(p=>p.ult).length,eruptPoolX:pools.filter(p=>p.ult).map(p=>p.x+p.w/2),eruptSpat:eruption?.spat??0,eruptLandings:[...eruptLandings],jet:jet?jet.phase:null,jetFuel,jetLocked,jetAngle:jet?.angle??0,jetLen:jet?.len??0,spewLand:spewState.land,spewLandOn:spewState.landOn,spewPts:spewState.pts.length,corrosion:buildings.map(b=>corr.get(b)?.stacks??0),unitCorrosion:military.units.map(u=>corr.get(u)?.stacks??0),jetOrigin:jet?[jet.ox,jet.oy]:null,activeKaiju,selectedKaiju,introCount,introElapsed,gallery:[...permanent.gallery],freeChoice:{...freeChoice},score:netScore(),destruction:destruction(buildings),exitOpen:objectiveOpen(),x:player.x,y:player.y,crouched:player.crouched,buildingHP:buildings.map(b=>b.hpNow),particleCount:particles.length,shotCount:shots.length,shotY:shots.map(s=>s.y),stage:combat.stage,hp:combat.hp,ultimate:combat.ultimate,ultimateTime:combat.ultimateTime,superCharge:combat.superCharge,superTime:combat.superTime,transform:combat.transform,width:bodyWidth(),height:bodyHeight(),charging:combat.charging,charge:combat.charge,combo:combat.combo,shards:shards.length,growths:growths.length,session,cityIndex,blockIndex,worldWidth,objectiveHP:objective?.hp??null,bossHP:rival?.hp??null,checkpoint:checkpoint?{...checkpoint}:null,highScores:permanent.scores.map(r=>({...r})),military:military.units.map(u=>({type:u.type,x:u.x,y:u.y,w:u.w,h:u.h,hp:u.hp})),enemyShots:military.projectiles.length,damageTaken:combat.damageTaken,civilians:population.civilians.filter(c=>!c.squashed&&!c.escaped).length,cars:vehicles.filter(v=>v.state!=='flat').length})});
