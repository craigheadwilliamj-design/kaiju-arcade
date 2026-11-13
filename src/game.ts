import {CONFIG as C,COMBAT as B,MILITARY as M,CAMPAIGN as P,EXPLORE as X,FEEL as F,VEHICLES as VC,MOVE as MV} from './config.ts';
import {createParked,createLamps,uproot,upright,impact,makeProp,spawnTraffic,tickDriving,tickFlying,launch,vehicleBox,mass,loose,grounded,liftedBuilding,VEHICLE_SPECS} from './vehicles.ts';
import type {Vehicle} from './vehicles.ts';
import {NEW_YORK_BLOCK_ONE,DRILL_BLOCK,CITIES,LEVELS,levelWidth} from './levels.ts';
import {createBuildings,damageBuilding,destruction,exitUnlocked,perfectBonus,solid,overlaps,canExitBlock,damageObjective,separateHorizontal,canTopple,toppleSpan,crushDamage,liftable} from './rules.ts';
import {createCombat,canAct,scale,damageMultiplier,collectCrystal,creditDamage,tickCombat,light,beginHeavy,releaseHeavy,ranged,activateUltimate,activateSuper,cancelCharge,receiveHit} from './combat.ts';
import type {Strike} from './combat.ts';
import {createMilitary,tickMilitary,spawnUnit,hitUnit,intercept,segmentHits,captureUnit,GRABBABLE_UNITS,UNITS,WEAPONS,roadLane} from './military.ts';
import type {Rect,Unit} from './military.ts';
import {createPopulation,releaseOccupants,tickPopulation} from './population.ts';
import {readSaves,savePermanent,saveCheckpoint,newRun,resumeRun,checkpointOf,restartCity,latchBlock,nextBlock,conquerCity,advanceCity,loseRun,initialsValid,KAIJU} from './campaign.ts';
import type {Run,Checkpoint,StorageLike} from './campaign.ts';
import {createRival,hitRival,tickRival} from './rival.ts';
import type {Rival} from './rival.ts';
import {moveList,hudScore,ROSTER,ENDINGS,INTRO_DURATION,INTRO_SCENES,introScene,selectable,validFreePlay,canViewEnding,endingFor,loadPresentationArt,hasSprite,hasAnim,holdPoint,aimTime,spinFrom,animDuration,animImpact,drawSilhouette,drawMenuBackdrop,drawIntro,drawEnding} from './presentation.ts';
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
function ultimateLabel(){return activeKaiju==='Mogurodon'?'SEISMIC RUPTURE':activeKaiju==='Kaiban'?'STAMPEDE':activeKaiju==='Tlézcatl'?'ERUPTION':'ULTIMATE PREVIEW';}
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
type Pool={x:number,w:number,life:number,max:number,damage:number,hits:Map<object,number>,ult?:boolean};
let globs:Glob[]=[],pools:Pool[]=[];
// Tlézcatl's Flame Jet: `start` plays the wind-up strip, `on` breathes (the aim strip's frame follows `angle`, degrees above level,
// negative = down), `end` plays the wind-down. `on` is time spent breathing; `hits` is the last tick time per target. The cone's
// current origin, direction and length are kept for drawing. Fuel (0-1) drains while breathing; running dry locks it until jetRelight.
// `bend` is the distance where the flame meets the street and washes along it (Infinity if it never does).
type Jet={phase:'start'|'on'|'end',t:number,on:number,angle:number,hits:Map<object,number>,ox:number,oy:number,dx:number,dy:number,len:number,stop:boolean,bend:number,bx:number,face:number};
let jet:Jet|null=null,jetFuel=1,jetLocked=false;
// Kaiban's Stampede: bellow (blast on the roar's impact frame), then the charge. `hits` resets when he turns, so each pass hits once.
// Tlézcatl's Eruption: `blasted` once the explosion has gone off, `boom` seconds since, `spat` globs thrown, `flash` the white-out left.
// Where each Eruption glob came down (roof, wall, unit or street), for the debug view; cleared when the next Eruption starts.
let eruptLandings:number[]=[];
let eruption:{blasted:boolean,spat:number,flash:number,boom:number}|null=null;
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
 if(combat.ultimateTime>0&&hasAnim(activeKaiju,'ultRoar',combat.stage)){const pre=eruption?B.eruptCharge:0,el=B.ultimateDuration-combat.ultimateTime-pre;if(el<0)return ['ultCharge',el+pre];const roar=animDuration(activeKaiju,'ultRoar',combat.stage);return el<roar?['ultRoar',el]:['ultPound',el-roar];}
// Diving: the form's dive strip (time since the dive began) when it has one, else the jumpAir loop.
 if(dive&&hasAnim(activeKaiju,'dive',combat.stage))return ['dive',time-dive.t0];
 if(roll&&hasAnim(activeKaiju,'dive',combat.stage))return ['dive',time-roll.t0];
 if(combat.charging){const rear=animDuration(activeKaiju,'heavyRear',combat.stage);return heavyT<rear?['heavyRear',heavyT]:['heavyHold',heavyT-rear];}
 if(jet)return jetPose(jet);
 const intro=loopIntro?animDuration(activeKaiju,loopIntro,combat.stage):0;
 return loopIntro&&loopT<intro?[loopIntro,loopT]:[loopAnim,loopT-intro];
}
let player={x:110,y:C.ground-C.playerHeight,vy:0,face:1,grounded:true,crouched:false,cooldown:0,pose:0};
type Particle={x:number,y:number,vx:number,vy:number,life:number,color:string,size:number};
// Chunks are separate from particles (own cap): building debris that flies, bounces once and settles.
type Chunk={x:number,y:number,vx:number,vy:number,s:number,color:string,life:number,bounces:number};
let chunks:Chunk[]=[],hitstop=0,crushGen=-1;
// Vehicles replace the old static parked cars: traffic, punts, grabs and throws. `held` is carried overhead.
let vehicles:Vehicle[]=[],held:Vehicle|null=null,trafficTimer=0,trafficBudget=0,nextVehicle=1000;
let particles:Particle[]=[],shots:{x:number,y:number,vx:number,life:number,damage:number,knockback:number}[]=[];

function panel(content:string,wide=false){overlay.innerHTML=`<div class="panel ${wide?'panel-wide':''}">${content}</div>`;}
function focus(){canvas.focus();}
function beginIntro(){mode='intro';keys.clear();introElapsed=0;introIndex=-1;introCount++;introPanel();focus();}
function introPanel(){introIndex=introScene(introElapsed);panel(`<div class="intro-copy"><div class="eyebrow">${String(introIndex+1).padStart(2,'0')} / 04 · FIRST IMPACT</div><h2>${INTRO_SCENES[introIndex]}</h2><p class="asset-notice">TEMPORARY SCENE ART</p><button id="skip-intro">SKIP INTRO →</button></div>`);document.querySelector('#skip-intro')!.addEventListener('click',finishIntro);}
function finishIntro(){if(mode!=='intro')return;setup();}
function selectionScreen(){mode='selection';if(!selectable(permanent,selectedKaiju))selectedKaiju='Mogurodon';
 const info=ROSTER.find(r=>r.name===selectedKaiju)!;
 panel(`<div class="eyebrow">CAMPAIGN / ${pendingInitials}</div><h1>CHOOSE YOUR <span>KAIJU.</span></h1><div class="roster-grid">${ROSTER.map((r,i)=>{const unlocked=selectable(permanent,r.name);return `<button id="kaiju-${i}" class="roster-card ${r.name===selectedKaiju?'selected':''}" ${unlocked?'':'disabled'} aria-label="${unlocked?r.name:`Locked kaiju slot ${i+1}`}"><span class="char-shadow ${unlocked?'known':'locked'}" style="--char-color:${unlocked?r.color:'#0e191b'}">${unlocked?'◆':'?'}</span><span>${unlocked?r.name:'???'}</span></button>`;}).join('')}</div><div class="stage-grid">${[1,2,3].map(stage=>`<div><canvas id="preview-stage-${stage}" width="240" height="120" aria-label="${selectedKaiju} stage ${stage} temporary idle preview"></canvas><span>STAGE 0${stage}</span></div>`).join('')}</div><div class="rating-grid">${['Damage','Speed','Resistance','Range'].map((label,i)=>`<div><span>${label.toUpperCase()}</span><b>${'●'.repeat(info.ratings[i])}${'○'.repeat(5-info.ratings[i])}</b></div>`).join('')}</div><p class="asset-notice">Temporary sprites / provisional ratings. Shared combat until Phase 5.</p><button id="confirm-kaiju" class="primary">PLAY AS ${selectedKaiju.toUpperCase()} →</button><button id="back">BACK</button>`,true);
 ROSTER.forEach((r,i)=>document.querySelector(`#kaiju-${i}`)!.addEventListener('click',()=>{if(!selectable(permanent,r.name))return;selectedKaiju=r.name;selectionScreen();}));
 document.querySelector('#confirm-kaiju')!.addEventListener('click',()=>{if(!selectable(permanent,selectedKaiju)||!initialsValid(pendingInitials))return;session='campaign';activeKaiju=selectedKaiju;run=newRun(pendingInitials,activeKaiju);score=0;combat=createCombat();cityIndex=0;blockIndex=0;citySettled=false;writeCheckpoint(checkpointOf(run));progressScreen();});document.querySelector('#back')!.addEventListener('click',setup);
}
function paintPreviews(){for(const stage of [1,2,3]){const preview=document.querySelector<HTMLCanvasElement>(`#preview-stage-${stage}`);if(!preview)return;const c=preview.getContext('2d')!;c.imageSmoothingEnabled=false;c.clearRect(0,0,240,120);c.fillStyle='#1d3031';c.fillRect(0,0,240,120);c.fillStyle='#46604f';c.fillRect(15,106,210,1);drawSilhouette(c,selectedKaiju,120,105,[.85,1.1,1.4][stage-1],time,false,'idle',stage);}}
function freePlayScreen(){mode='freeplay-select';if(!selectable(permanent,freeChoice.kaiju))freeChoice.kaiju='Mogurodon';if(!selectable(permanent,freeChoice.boss))freeChoice.boss='Mogurodon';if(!permanent.conquered.includes(freeChoice.city))freeChoice.city=permanent.conquered[0]??0;
 const unlocked=KAIJU.filter(k=>selectable(permanent,k));
 panel(`<div class="eyebrow">ONE CITY / NO CAMPAIGN SCORE</div><h1>FREE <span>PLAY.</span></h1>${permanent.conquered.length?'':'<p>Conquer a campaign city to unlock it here.</p>'}<div class="freeplay-fields"><label for="free-kaiju">PLAYABLE KAIJU</label><select id="free-kaiju">${unlocked.map(k=>`<option ${k===freeChoice.kaiju?'selected':''}>${k}</option>`).join('')}</select><label for="free-city">CONQUERED CITY</label><select id="free-city">${permanent.conquered.length?permanent.conquered.slice().sort().map(i=>`<option value="${i}" ${i===freeChoice.city?'selected':''}>${CITIES[i].name}</option>`).join(''):'<option value="">NO CITIES UNLOCKED</option>'}</select><label for="free-boss">UNLOCKED RIVAL</label><select id="free-boss">${unlocked.map(k=>`<option ${k===freeChoice.boss?'selected':''}>${k}</option>`).join('')}</select></div><p>Five blocks · Stage 1 start · City difficulty unchanged<br>Mirror matches permitted. Campaign checkpoint stays untouched.</p><p class="asset-notice">All selected kaiju currently use shared combat pending Phase 5.</p><button id="free-start" class="primary" ${validFreePlay(permanent,freeChoice)?'':'disabled'}>ENTER CITY →</button><button id="back">MAIN MENU</button>`);
 const update=()=>{freeChoice={kaiju:document.querySelector<HTMLSelectElement>('#free-kaiju')!.value,city:Number(document.querySelector<HTMLSelectElement>('#free-city')!.value),boss:document.querySelector<HTMLSelectElement>('#free-boss')!.value};document.querySelector<HTMLButtonElement>('#free-start')!.disabled=!validFreePlay(permanent,freeChoice);};
 for(const id of ['free-kaiju','free-city','free-boss'])document.querySelector(`#${id}`)!.addEventListener('change',update);
 document.querySelector('#free-start')!.addEventListener('click',()=>{update();startFreePlay();});document.querySelector('#back')!.addEventListener('click',title);
}
function startFreePlay(){if(!validFreePlay(permanent,freeChoice))return;session='freeplay';run=null;activeKaiju=freeChoice.kaiju;cityIndex=freeChoice.city;blockIndex=0;freeBlockStart=0;citySettled=false;score=0;combat=createCombat();loadBlock();}
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
function progressScreen(){mode='progress';if(!run)return;cityIndex=run.city;panel(`<div class="eyebrow">CAMPAIGN / ${run.initials} / ${run.kaiju.toUpperCase()}</div><h1>${CITIES[cityIndex].name.toUpperCase()}</h1><p>CITY ${cityIndex+1} / 5 · BANKED SCORE ${Math.round(run.banked).toLocaleString()}<br>5 BLOCKS · RIVAL ${bossName().toUpperCase()}</p><div class="city-route">${CITIES.map((c,i)=>`<span class="${i===cityIndex?'current':''}">${i<cityIndex?'✓':String(i+1).padStart(2,'0')} ${c.name}</span>`).join('')}</div><button id="begin-city" class="primary">BEGIN CITY →</button><button id="back">MAIN MENU</button><p class="note">Checkpoint: ${CITIES[cityIndex].name}, Block 1.<br>Energy, Ultimate and Super reset for each city.</p>`);
 document.querySelector('#begin-city')!.addEventListener('click',()=>{if(!run)return;restartCity(run);score=0;citySettled=false;combat=createCombat();cityIndex=run.city;blockIndex=0;loadBlock(false);});document.querySelector('#back')!.addEventListener('click',title);
}
function scoresScreen(){mode='scores';panel(`<div class="eyebrow">LOCAL CAMPAIGN RECORDS</div><h1>TOP <span>10.</span></h1><div class="score-list">${permanent.scores.length?permanent.scores.map((r,i)=>`<div><span>${String(i+1).padStart(2,'0')} ${r.initials}</span><span>${r.kaiju}</span><b>${r.score.toLocaleString()}</b><span>${r.cities}/5 ${r.completed?'CLEAR':'FALLEN'}</span></div>`).join(''):'<p>No campaign records yet.<br>Failed and completed runs are both eligible.</p>'}</div><button id="back" class="primary">MAIN MENU</button><p class="note">Drill scores are excluded. Stored on this browser only.</p>`);document.querySelector('#back')!.addEventListener('click',title);}
function drills(){mode='setup';panel(`<div class="eyebrow">PRACTICE / NO CAMPAIGN SCORE</div><h1>COMBAT<br><span>DRILLS.</span></h1><label class="drill-label" for="tier">REINFORCEMENTS</label><select id="tier"><option value="1">Block 1 — Police patrol</option><option value="2">Drill — National Guard</option><option value="3">Drill — Stronghold forces</option><option value="4">Drill — Full military assault</option><option value="5">Drill — Limited arena support</option></select><button class="primary" id="start">ENTER DRILL →</button><button id="back">MAIN MENU</button><p class="note">Uses the original New York Block 1 map.<br>No checkpoint, unlock or Top 10 changes.</p>`);const select=document.querySelector<HTMLSelectElement>('#tier')!;select.value=String(selectedTier);select.addEventListener('change',()=>selectedTier=Number(select.value));document.querySelector('#start')!.addEventListener('click',start);document.querySelector('#back')!.addEventListener('click',title);}
function start(){session='drill';run=null;activeKaiju='Mogurodon';cityIndex=0;blockIndex=0;citySettled=false;score=0;combat=createCombat();loadBlock(true);}
function loadBlock(drill=false){
 block=drill?DRILL_BLOCK:LEVELS[cityIndex][blockIndex];worldWidth=levelWidth(block);time=0;actionTime=0;military=createMilitary(drill?selectedTier:blockIndex+1,cityIndex);population=createPopulation(Math.random,block.street,block.cars);buildings=createBuildings(block.buildings);camera=0;cameraY=0;cleared=false;particles=[];chunks=[];hitstop=0;vehicles=[...createParked(block.cars),...createLamps(worldWidth,500)];held=null;trafficTimer=0;trafficBudget=!drill&&block.kind!=='boss'?block.screens*VC.trafficPerScreen:0;shots=[];keys.clear();shards=[];growths=[];waves=[];tremor=null;debris=null;jet=null;jetFuel=1;jetLocked=false;rocks=[];globs=[];pools=[];stampede=null;eruption=null;ambientTimer=0;growthTimer=0;ultimateTimer=0;
 cancelCharge(combat);combat.cooldown=0;combat.rangedCooldown=0;combat.combo=0;combat.comboWindow=0;attack=null;combat.stagger=0;combat.staggerGuard=0;combat.knockback=0;
 clingTo=null;grabLock=false;isClimbing=false;climbDir=0;runLatch=false;dashT=0;airRun=false;running=false;bargeT=0;grabWait=0;dive=null;roll=null;runUp=0;runDir=0;bargeHits.clear();oldWidth=bodyWidth();oldHeight=C.playerHeight*scale(combat);player={x:block.start===undefined?110:block.start-oldWidth/2,y:C.ground-oldHeight,vy:0,face:1,grounded:true,crouched:false,cooldown:0,pose:0};
 camera=Math.max(0,Math.min(worldWidth-viewW(),player.x+oldWidth/2-viewW()*.34));
 objective=!drill&&block.kind==='stronghold'?{x:worldWidth/2,hp:P.strongholdHP,maxHP:P.strongholdHP,shattered:false}:null;
 rival=!drill&&block.kind==='boss'?createRival(worldWidth,cityIndex):null;
 if(objective){for(const [type,offset] of [['tank',-390],['emplacement',-180],['emplacement',210],['artillery',510],['helicopter',-650]] as const)spawnUnit(military,type,objective.x+offset);}
 if(openLayout()&&!drill){action=`${block.buildings.filter(b=>b.landmark).length} LANDMARKS · EXITS EAST AND WEST`;actionTime=3.5;}
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
 for(let n=0;n<count&&shards.length<B.shardCap;n++)shards.push({x:x+(n%5-2)*8,y:C.ground-30,vx:(n%5-2)*28,vy:-120-(n%3)*25,life:B.shardLifetime});
}
// dir: direction of the blow (away from the attacker); at: world point struck, for the hole and debris.
// `quiet`: a rapid damage tick (the Flame Jet), so no hole, hitstop or shake per tick unless it brings the building down.
function hit(b:typeof buildings[number],damage:number,fromUltimate=false,dir=player.face,at?:{x:number,y:number},quiet=false){const r=damageBuilding(b,damage);if(!r.damage)return;releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);score+=r.points;creditDamage(combat,r.damage,'player',fromUltimate);if(r.destroyed)dropShards(b.x+b.w/2,B.buildingShards);if(!quiet||r.destroyed)burst(b.x+b.w/2,C.ground-Math.min(b.h,60),'#e8d8ab',r.destroyed?23:7);if(!quiet||r.destroyed)shake=r.destroyed?5:2;action=r.destroyed?'STRUCTURE COLLAPSED':quiet?'FLAME JET':`IMPACT −${Math.round(r.damage)}`;actionTime=1.2;
 if(quiet&&!r.destroyed){b.jolt=F.joltSeconds*.5;b.joltDir=dir;return;}
 impactFeel(b,r.damage,r.destroyed,fromUltimate,dir,at);
 if(r.destroyed)exploreReward(b,fromUltimate);}
function rand(){return Math.random();}
function spawnChunks(x:number,y:number,dir:number,color:string,count:number,spread=1){
 for(let n=0;n<count&&chunks.length<F.chunkCap;n++)chunks.push({x:x+(rand()-.5)*14*spread,y:y+(rand()-.5)*10*spread,vx:dir*(50+rand()*170)*spread+(rand()-.5)*60,vy:-(110+rand()*230),s:3+Math.floor(rand()*7),color:n%3===0?'#3b4a4c':color,life:F.chunkLife,bounces:0});
}
// Per-hit feedback: jolt + flash, a hole where it landed, chunks, hitstop; on destruction tall buildings topple, short ones squash.
function impactFeel(b:typeof buildings[number],damage:number,destroyed:boolean,fromUltimate:boolean,dir:number,at?:{x:number,y:number}){
 if(!damage)return;
 b.jolt=F.joltSeconds;b.joltDir=dir;
 // Holes sit a little into the wall from the struck face (jittered so repeats don't stack) and stay inside the facade.
 const r=Math.min(F.holeMax,F.holeMin+damage/F.holeDamage,b.w*.3,b.h*.3),inset=F.holeInset+(b.holes.length*11)%18;
 const raw=at?(at.x-b.x<b.w/2?at.x-b.x+inset:at.x-b.x-inset):b.w/2,hx=Math.max(r+2,Math.min(b.w-9-r,raw)),hy=Math.max(r+4,Math.min(b.h-r-6,at?C.ground-at.y+((b.holes.length*7)%13-6):b.h*.4));
 if(b.kind!=='tiny'&&!destroyed){if(b.holes.length>=F.holeCap)b.holes.shift();b.holes.push({x:hx,y:hy,r,seed:b.holes.length*13+Math.round(hx*3+hy)});}
 spawnChunks(b.x+hx,C.ground-hy,dir,b.color,destroyed?4:Math.min(7,2+Math.round(damage/35)));
 if(!fromUltimate)hitstop=Math.max(hitstop,Math.min(F.hitstopMax,F.hitstopBase+damage*F.hitstopPerDamage));
 if(!destroyed)return;
 if(!fromUltimate)hitstop=Math.max(hitstop,F.hitstopCollapse);
 if(canTopple(b)){b.topple=1;b.tilt=0;b.tiltV=F.toppleKick;b.tiltDir=dir;b.collapse=0;b.toppleUlt=fromUltimate;b.toppleGen=crushGen+1;}
 else spawnChunks(b.x+b.w/2,C.ground-b.h*.6,dir,b.color,10,1.4);
}
// A falling building lands: crush every structure, ground unit and car under its span; chains if that topples them too.
function landTopple(b:typeof buildings[number]){
 const [from,to]=toppleSpan(b),damage=crushDamage(b.h,0,b.toppleGen),ult=b.toppleUlt,pivot=b.tiltDir>0?b.x+b.w:b.x;let crushed=0;
 // Nearest building takes the brunt; energy falls off along the path. crushGen tags anything this knocks over as the next generation.
 const victims=buildings.filter(t=>t!==b&&t.hpNow>0&&t.x<to&&t.x+t.w>from).sort((p,q)=>Math.abs(p.x+p.w/2-pivot)-Math.abs(q.x+q.w/2-pivot));
 crushGen=b.toppleGen;victims.forEach((t,i)=>{hit(t,crushDamage(b.h,i,b.toppleGen),ult,b.tiltDir,{x:b.tiltDir>0?t.x+8:t.x+t.w-8,y:C.ground-Math.min(t.h-10,b.w*.7)});crushed++;});crushGen=-1;
 for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&u.x<to&&u.x+u.w>from)hitUnit(military,u,damage*F.toppleUnitFactor,'player',260,b.tiltDir,ult);
 for(const v of vehicles)if(grounded(v)&&v.state!=='flat'&&v.x<to&&v.x+v.w>from)flattenVehicle(v,true,ult);
 for(let x=from;x<to;x+=26)spawnChunks(x,C.ground-12,b.tiltDir,b.color,2,.6);
 for(let x=from;x<to;x+=40)burst(x,C.ground-10,'#c9c1a3',3);
 shake=Math.max(shake,12);if(!ult)hitstop=Math.max(hitstop,F.hitstopTopple);
 action=crushed?`TOPPLED · CRUSHED ${crushed}`:'TOPPLED';actionTime=1.6;
}
// Landmarks and hidden caches pay score and Ultimate charge, never crystals, so exploring does not speed evolution.
function exploreReward(b:typeof buildings[number],fromUltimate:boolean){if(!b.landmark&&!b.cache)return;
 const charge=fromUltimate||combat.ultimateTime>0?0:b.landmark?X.landmarkUltimate:X.cacheUltimate;combat.ultimate=Math.min(B.ultimateMax,combat.ultimate+charge);
 if(b.cache){score+=X.cachePoints;burst(b.x+b.w/2,C.ground-40,'#f6a8d6',26);action=`CRYSTAL CACHE +${X.cachePoints}`;}
 else{burst(b.x+b.w/2,C.ground-80,'#f1dc96',34);shake=9;action=`LANDMARK TOPPLED · ${b.label}`;}actionTime=2;}
function hitGrowth(g:typeof growths[number],damage:number){if(g.hp<=0)return;g.hp=Math.max(0,g.hp-damage);burst(g.x,C.ground-30,'#f291ca',8);if(g.hp===0){dropShards(g.x,B.growthShards);action='CRYSTAL GROWTH SHATTERED';actionTime=1.5;}}
function hitObjective(damage:number){if(!objective||objective.shattered)return;const shards=damageObjective(objective,damage,P.strongholdShards);burst(objective.x,C.ground-60,'#f4a1d0',8);if(shards){dropShards(objective.x,shards);shake=9;action='STRONGHOLD CRYSTAL SHATTERED';actionTime=2;}}
function strikeRival(damage:number,strength=0,direction=1,ultimate=false){if(!rival||combat.dead)return;const actual=hitRival(rival,damage,'player',strength,direction);if(actual){score+=actual*P.bossDamagePoints;creditDamage(combat,actual,'player',ultimate);burst(rival.x+rival.w/2,rival.y+40,'#f3a9d0',8);} }
function startJet(){if(jet||jetLocked||jetFuel<B.jetMinStart)return;running=false;player.crouched=false;
 jet={phase:'start',t:0,on:0,angle:keys.has('KeyW')?B.jetUp*.4:keys.has('KeyS')?-B.jetDown*.4:0,hits:new Map(),ox:0,oy:0,dx:1,dy:0,len:0,stop:false,bend:Infinity,bx:0,face:1};}
function jetDuration(anim:string){return animDuration(activeKaiju,anim,combat.stage)||.15;}
function jetPose(j:Jet):[string,number]{if(j.phase==='start')return ['jetStart',j.t];if(j.phase==='end')return ['jetEnd',j.t];
 return hasAnim(activeKaiju,'jetAim',combat.stage)?['jetAim',aimTime(activeKaiju,'jetAim',j.angle,combat.stage)]:['jetStart',99];}
function circleRect(cx:number,cy:number,r:number,b:{x:number,y:number,w:number,h:number}){const nx=Math.max(b.x,Math.min(cx,b.x+b.w)),ny=Math.max(b.y,Math.min(cy,b.y+b.h));return (cx-nx)**2+(cy-ny)**2<=r*r;}
// Wind-up, then breathe while L is held (at least jetMinBurst) and fuel lasts, then the wind-down. Being hit, leaving the ground, grabbing
// or the Ultimate snuffs it.
function tickJet(dt:number){const j=jet!;
 if(!canAct(combat)||!player.grounded||clingTo||held||combat.ultimateTime>0){jet=null;return;}
 j.t+=dt;
 if(j.phase==='start'){if(j.t>=jetDuration('jetStart')){j.phase='on';j.t=0;}return;}
 if(j.phase==='end'){if(j.t>=jetDuration('jetEnd'))jet=null;return;}
 j.on+=dt;jetFuel=Math.max(0,jetFuel-dt/B.jetSeconds);
 const target=keys.has('KeyW')?B.jetUp:keys.has('KeyS')?-B.jetDown:0,turn=B.jetTurn*dt;j.angle+=Math.max(-turn,Math.min(turn,target-j.angle));
 breathe(j);
 if(jetFuel<=0)jetLocked=true;
 if(jetFuel<=0||(!keys.has('KeyL')&&j.on>=B.jetMinBurst)){j.phase='end';j.t=0;j.len=0;combat.rangedCooldown=Math.max(combat.rangedCooldown,B.jetCooldown);}}
// A point `d` along the flame: straight out of the jaws until it meets the street, then washing along the street, hugging it.
function jetPoint(j:Jet,d:number,r:number):[number,number]{return d<j.bend?[j.ox+j.dx*d,j.oy+j.dy*d]:[j.bx+j.face*(d-j.bend),C.ground-r*.45];}
const JET_WASH=.6;
// The cone: circles marched out from the jaws (mouth point from the strip), widening with distance. Where it meets the street it washes
// along it (the rest of its reach cut to JET_WASH), so aiming down sweeps fire across the road. It stops at the first building it
// touches (that building burns); everything else inside it takes a damage tick every jetTick.
function breathe(j:Jet){const s=scale(combat),g=Math.sqrt(s),w=bodyWidth(),h=bodyHeight(),[anim,t]=currentAnim();
 const m=holdPoint(activeKaiju,anim,t,combat.stage,'mouth')??[58,-26],a=j.angle*Math.PI/180,[w0,w1]=B.jetWidth,R=B.jetRange*g;
 j.ox=player.x+w/2+player.face*m[0]*s;j.oy=player.y+h+C.spriteDrop+m[1]*s;j.dx=player.face*Math.cos(a);j.dy=-Math.sin(a);j.face=player.face;
 j.bend=j.dy>0?Math.max(0,(C.ground-4-j.oy)/j.dy):Infinity;j.bx=j.ox+j.dx*j.bend;
 let max=R*Math.min(1,j.on/.15);if(max>j.bend)max=j.bend+(max-j.bend)*JET_WASH;
 const circles:number[][]=[];let len=max,wall:typeof buildings[number]|null=null;j.stop=false;
 for(let d=0;d<=max;d+=8){const r=(w0+(w1-w0)*Math.min(1,d/R))*g,[x,y]=jetPoint(j,d,r);
  circles.push([x,y,r]);wall=buildings.find(b=>solid(b)&&b.hpNow>0&&circleRect(x,y,r*.5,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h}))??null;
  if(wall){len=d;j.stop=true;break;}}
 // Point-blank against a wall the flame still shows as a short splash on it.
 j.len=j.stop?Math.max(len,12*g):len;
 const dmg=B.jetDamage*damageMultiplier(combat),kb=B.jetKnockback*(combat.superTime>0?B.superKnockback:1),dir=player.face;
 const inCone=(r:{x:number,y:number,w:number,h:number})=>circles.some(([x,y,rr])=>circleRect(x,y,rr,r));
 const tick=(o:object,f:()=>void)=>{if(time-(j.hits.get(o)??-9)<B.jetTick)return;j.hits.set(o,time);f();};
 if(wall){const b=wall,end=circles[circles.length-1];tick(b,()=>hit(b,dmg,false,dir,{x:end[0],y:end[1]},true));}
 if(objective&&!objective.shattered&&inCone({x:objective.x-30,y:C.ground-100,w:60,h:100}))tick(objective,()=>hitObjective(dmg));
 if(rival&&!rival.dead&&inCone(rival))tick(rival,()=>strikeRival(dmg,kb,dir));
 for(const gr of growths)if(gr.hp>0&&inCone({x:gr.x-20,y:C.ground-55,w:40,h:55}))tick(gr,()=>hitGrowth(gr,dmg));
 for(const u of military.units)if(u.hp>0&&inCone(u))tick(u,()=>hitUnit(military,u,dmg,'player',kb,dir));
 for(const p of military.projectiles)if(!p.dead&&WEAPONS[p.weapon].interceptable&&inCone({x:p.x-8,y:p.y-8,w:16,h:16}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&inCone(vehicleBox(v)))tick(v,()=>puntVehicle(v,dmg*B.jetCarPush,dir));
 // Embers off the flame and a splash where it hits a wall or the street.
 const [tx,ty]=jetPoint(j,j.len,w1*g);
 for(let n=0;n<(j.stop||j.bend<j.len?3:1)&&particles.length<C.particleCap;n++)particles.push({x:tx+(Math.random()-.5)*12*g,y:ty+(Math.random()-.5)*10*g,vx:-j.dx*(30+Math.random()*90)+(Math.random()-.5)*80,vy:-(40+Math.random()*120)*g,life:.25+Math.random()*.35,color:['#ffd34d','#ff8a1f','#e8401a','#4a3a3a'][Math.floor(Math.random()*4)],size:2+Math.floor(Math.random()*3)});}
function launchTremor(){if(!tremor)return;const dir=tremor.dir;tremor=null;if(combat.dead)return;
 const w=bodyWidth(),grow=Math.sqrt(scale(combat)),x=player.x+w/2+dir*w*.42,life=B.tremorRange*grow/B.tremorSpeed;
 waves.push({x,vx:dir*B.tremorSpeed,life,max:life,damage:B.tremorDamage*damageMultiplier(combat),hits:new Set(),ult:false,size:B.tremorSize*grow,knockback:B.tremorKnockback*(combat.superTime>0?B.superKnockback:1)});
 shake=Math.max(shake,3+grow);burst(x,C.ground-6,'#c9a77c',10);spawnChunks(x,C.ground-10,dir,'#8d7a66',3);}
// Debris Shotgun: a fan from flat-and-fast to high-and-lobbed, flung from the tusks low in front of the body.
function launchDebris(){if(!debris)return;const dir=debris.dir;debris=null;if(combat.dead)return;
 const w=bodyWidth(),h=bodyHeight(),grow=Math.sqrt(scale(combat)),x=player.x+w/2+dir*w*.55,y=player.y+h*.6,[a0,a1]=B.debrisAngle,[s0,s1]=B.debrisSpeed,n=B.debrisCount;
 for(let i=0;i<n;i++){const t=n>1?i/(n-1):.5,a=(a0+(a1-a0)*t+(Math.random()-.5)*6)*Math.PI/180,speed=(s1-(s1-s0)*t)*grow*(.92+Math.random()*.16);
  rocks.push({x,y,vx:dir*Math.cos(a)*speed,vy:-Math.sin(a)*speed,life:B.debrisLife*grow,damage:B.debrisDamage*damageMultiplier(combat),knockback:B.debrisKnockback*(combat.superTime>0?B.superKnockback:1),spin:Math.random()*6,size:(6+Math.random()*4)*grow});}
 shake=Math.max(shake,3+grow);burst(x,C.ground-6,'#c9a77c',12);spawnChunks(x,C.ground-10,dir,'#8d7a66',4);}
// Everything a player projectile can strike, nearest first along its travel direction. `y` is the impact height on buildings.
function projectileTargets(damage:number,knockback:number,dir:number,y:number,ult=false,at?:{x:number,y:number}){
 const targets=[...(objective&&!objective.shattered?[{rect:{x:objective.x-30,y:C.ground-100,w:60,h:100},hit:()=>hitObjective(damage)}]:[]),...(rival&&!rival.dead?[{rect:rival,hit:()=>strikeRival(damage,knockback,dir,ult)}]:[]),...buildings.filter(b=>b.hpNow>0).map(b=>({rect:{x:b.x,y:C.ground-b.h,w:b.w,h:b.h},hit:()=>hit(b,damage,ult,dir,at??{x:dir>0?b.x+6:b.x+b.w-6,y})})),
 ...growths.filter(g=>g.hp>0).map(g=>({rect:{x:g.x-20,y:C.ground-55,w:40,h:55},hit:()=>hitGrowth(g,damage)})),
 ...military.units.filter(u=>u.hp>0).map(u=>({rect:u,hit:()=>hitUnit(military,u,damage,'player',knockback,dir,ult)})),
 ...military.projectiles.filter(p=>!p.dead&&WEAPONS[p.weapon].interceptable).map(p=>({rect:{x:p.x-8,y:p.y-8,w:16,h:16},hit:()=>intercept(military,p)})),
 ...vehicles.filter(v=>loose(v)).map(v=>({rect:vehicleBox(v),hit:()=>puntVehicle(v,damage*VC.shotPush,dir,ult)}))];
 return targets.sort((a,b)=>dir>0?a.rect.x-b.rect.x:b.rect.x-a.rect.x);}
// Pound (S+J): both fists down on whatever is under the feet. Standing on a roof it hits that building (and a neighbour you straddle);
// on the street it stomps troops, cars and newsstands at your feet. Combo multipliers still apply, so the third pound is the big one.
function pound(strike:Strike){
 const w=bodyWidth(),h=bodyHeight(),s=scale(combat),feet=player.y+h,cx=player.x+w/2,damage=strike.damage*MV.poundMult;
 attack={anim:hasAnim(activeKaiju,'pound',combat.stage)?'pound':hasAnim(activeKaiju,'ultPound',combat.stage)?'ultPound':'heavySlam',t:0};player.pose=.25;combat.cooldown=Math.max(combat.cooldown,MV.poundCooldown);
 const box={x:player.x-w*.15,y:feet-14*s,w:w*1.3,h:30*s},wide={x:box.x-18*s,y:feet-40*s,w:box.w+36*s,h:46*s};let struck=false;
 for(const b of buildings){if(b.hpNow<=0)continue;const r={x:b.x,y:C.ground-b.h,w:b.w,h:b.h};if(!overlaps(box,r))continue;
  // Under the feet: the hole lands near the roof; a wall you are stood beside at street level takes it at the base.
  const onRoof=Math.abs(C.ground-b.h-feet)<6,hx=Math.max(b.x+8,Math.min(b.x+b.w-8,cx));
  hit(b,damage*(onRoof?1:.6),false,player.face,{x:hx,y:onRoof?C.ground-b.h+10:feet-8});struck=true;
  if(onRoof)spawnChunks(hx,C.ground-b.h,0,b.color,3,1.2);}
 for(const u of military.units)if(u.hp>0&&overlaps(wide,u)){hitUnit(military,u,damage,'player',MV.poundKnockback,Math.sign(u.x+u.w/2-cx)||player.face);struck=true;}
 for(const v of vehicles)if(loose(v)&&overlaps(wide,vehicleBox(v)))flattenVehicle(v,true);
 for(const g of growths)if(g.hp>0&&overlaps(wide,{x:g.x-20,y:C.ground-55,w:40,h:55}))hitGrowth(g,damage);
 if(objective&&!objective.shattered&&overlaps(wide,{x:objective.x-30,y:C.ground-100,w:60,h:100}))hitObjective(damage);
 if(rival&&!rival.dead&&overlaps(wide,rival))strikeRival(damage,MV.poundKnockback,player.face);
 burst(cx,feet-2,'#c9a77c',strike.combo===3?14:7);shake=Math.max(shake,strike.combo===3?6:3);
 if(struck)hitstop=Math.max(hitstop,Math.min(F.hitstopMax,F.hitstopBase+damage*F.hitstopPerDamage));
 action=`POUND ${strike.combo} / 3`;actionTime=.5;}
// Slam landing: the roof (or street) under the body takes the hit plus a radius around the feet, scaled by the drop.
// Returns true when the roof gave way, so the dive keeps falling into whatever is below.
function slamLand(){
 if(!dive)return false;const w=bodyWidth(),h=bodyHeight(),s=scale(combat),feet=player.y+h,cx=player.x+w/2,fall=Math.max(0,feet-dive.startY);
 const power=1+Math.min(MV.diveFallMax,fall/MV.diveFallBonus),damage=MV.diveDamage*damageMultiplier(combat)*power,radius=MV.diveRadius*s*(1+(power-1)*.4);
 const street=feet>=C.ground-1,kb=MV.diveKnockback*(combat.superTime>0?B.superKnockback:1);let broke=false;
 for(const b of buildings){if(b.hpNow<=0)continue;
  const under=b.x<player.x+w&&b.x+b.w>player.x&&Math.abs(C.ground-b.h-feet)<6,near=street&&b.x<cx+radius&&b.x+b.w>cx-radius;
  if(!under&&!near&&!(b.kind==='tiny'&&b.x<cx+radius&&b.x+b.w>cx-radius))continue;
  hit(b,damage*(under?MV.diveRoofMult:.5),false,Math.sign(b.x+b.w/2-cx)||player.face,{x:Math.max(b.x+8,Math.min(b.x+b.w-8,cx)),y:under?C.ground-b.h+10:C.ground-20});
  if(under){spawnChunks(cx,C.ground-b.h,0,b.color,6,1.6);if(b.hpNow<=0)broke=true;}}
 const zone={x:cx-radius,y:feet-radius,w:radius*2,h:radius+8};
 for(const u of military.units)if(u.hp>0&&overlaps(zone,u))hitUnit(military,u,damage,'player',kb,Math.sign(u.x+u.w/2-cx)||player.face);
 for(const v of vehicles)if(loose(v)&&overlaps(zone,vehicleBox(v))){if(Math.abs(v.x+v.w/2-cx)<w*.4)flattenVehicle(v,true);else puntVehicle(v,damage*.5,Math.sign(v.x+v.w/2-cx)||player.face,false,1.8);}
 for(const g of growths)if(g.hp>0&&overlaps(zone,{x:g.x-20,y:C.ground-55,w:40,h:55}))hitGrowth(g,damage);
 if(objective&&!objective.shattered&&overlaps(zone,{x:objective.x-30,y:C.ground-100,w:60,h:100}))hitObjective(damage);
 if(rival&&!rival.dead&&overlaps(zone,rival))strikeRival(damage,kb,Math.sign(rival.x+rival.w/2-cx)||player.face);
 // On the street the impact rolls out as a short shockwave both ways.
 if(street){const grow=Math.sqrt(s),life=MV.diveWaveRange*grow*power/B.tremorSpeed;
  for(const dir of [-1,1])waves.push({x:cx+dir*w*.3,vx:dir*B.tremorSpeed,life,max:life,damage:damage*MV.diveWaveDamage,hits:new Set(),ult:false,size:MV.diveWaveSize*grow,knockback:B.tremorKnockback});}
 // Kaiban's Meteor Drop: the landing hurls a ring of rock chunks out both ways (Debris Shotgun rocks).
 if(activeKaiju==='Kaiban'){const n=MV.meteorRocks,grow=Math.sqrt(s),[a0,a1]=MV.meteorAngle,[v0,v1]=MV.meteorSpeed;
  for(let i=0;i<n;i++){const dir=i%2?1:-1,t=Math.floor(i/2)/Math.max(1,Math.floor(n/2)-1),a=(a0+(a1-a0)*t+(Math.random()-.5)*8)*Math.PI/180,sp=(v1-(v1-v0)*t)*grow*Math.min(1.6,power)*(.9+Math.random()*.2);
   rocks.push({x:cx+dir*w*.25,y:feet-6*s,vx:dir*Math.cos(a)*sp,vy:-Math.sin(a)*sp,life:B.debrisLife*grow*1.3,damage:MV.meteorDamage*damageMultiplier(combat)*power,knockback:B.debrisKnockback,spin:Math.random()*6,size:(6+Math.random()*5)*grow});}}
 // Tlézcatl's Magma Dive: the crash splashes molten globs both ways and, on the street, leaves a lava pool under him.
 if(activeKaiju==='Tlézcatl'){const n=MV.lavaGlobs,grow=Math.sqrt(s),[a0,a1]=MV.lavaAngle,[v0,v1]=MV.lavaSpeed,dm=damageMultiplier(combat);
  for(let i=0;i<n;i++){const dir=i%2?1:-1,t=Math.floor(i/2)/Math.max(1,Math.floor(n/2)-1),a=(a0+(a1-a0)*t+(Math.random()-.5)*10)*Math.PI/180,sp=(v1-(v1-v0)*t)*grow*Math.min(1.6,power)*(.85+Math.random()*.3);
   globs.push({x:cx+dir*w*.3,y:feet-8*s,vx:dir*Math.cos(a)*sp,vy:-Math.sin(a)*sp,life:2,damage:MV.lavaDamage*dm*power,size:(4+Math.random()*3)*grow});}
  if(street)addPool(cx,w*MV.lavaPoolWidth,MV.lavaPoolDamage*dm*power);
  for(let k=0;k<14&&particles.length<C.particleCap;k++)particles.push({x:cx+(Math.random()-.5)*w*.6,y:feet-4,vx:(Math.random()-.5)*260,vy:-(80+Math.random()*220)*grow,life:.3+Math.random()*.4,color:['#ffd34d','#ff8a1f','#e8401a'][k%3],size:2+Math.floor(Math.random()*4)});}
 burst(cx,feet-3,'#c9a77c',18+Math.round(power*6));spawnChunks(cx,feet-6,1,'#8d7a66',3);spawnChunks(cx,feet-6,-1,'#8d7a66',3);
 shake=Math.max(shake,6+power*4);hitstop=Math.max(hitstop,.05+power*.02);
 // A form's own slamLand starts at impact; otherwise borrow heavySlam from its crash frames.
 attack=hasAnim(activeKaiju,'slamLand',combat.stage)?{anim:'slamLand',t:0}:{anim:hasAnim(activeKaiju,'heavySlam',combat.stage)?'heavySlam':'jumpLand',t:hasAnim(activeKaiju,'heavySlam',combat.stage)?animDuration(activeKaiju,'heavySlam',combat.stage)*.35:0};
 combat.cooldown=Math.max(combat.cooldown,MV.diveCooldown);action=broke?'SLAM · CRASHED THROUGH':(activeKaiju==='Kaiban'?'METEOR DROP':activeKaiju==='Tlézcatl'?'MAGMA DIVE':power>1.8?'MEGA SLAM':'SLAM');actionTime=.9;
 // A cannonball form keeps rolling if a direction was touched at any point in the dive (street or rooftop).
 const steer=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)||dive.dir;
 if(!broke&&steer&&canRoll()){roll={dir:steer,t:MV.rollSeconds,t0:dive.t0,power,bounced:false,hits:new Set()};player.face=steer;attack=null;action='CANNONBALL';actionTime=1;}
 return broke;}
// At most 12 Magma Dive pools at once; the Eruption's rain keeps its own 24 (oldest cool first).
function addPool(cx:number,w:number,damage:number,ult=false,life=MV.lavaPoolSeconds){pools.push({x:cx-w/2,w,life,max:life,damage,hits:new Map(),ult});
 const mine=pools.filter(p=>!!p.ult===ult);if(mine.length>(ult?24:12))pools.splice(pools.indexOf(mine[0]),1);}
// Lava pools burn everything standing in them on the street (troops, cars, newsstands, growths, the rival, the objective).
function tickPools(dt:number){for(const p of pools){p.life-=dt;const zone={x:p.x,y:C.ground-16,w:p.w,h:18},kb=20;
  const tick=(o:object,f:()=>void)=>{if(time-(p.hits.get(o)??-9)<MV.lavaPoolTick)return;p.hits.set(o,time);f();};
  for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(zone,u))tick(u,()=>hitUnit(military,u,p.damage,'player',kb,Math.sign(u.x+u.w/2-(p.x+p.w/2))||1,p.ult));
  for(const v of vehicles)if(loose(v)&&overlaps(zone,vehicleBox(v)))tick(v,()=>puntVehicle(v,p.damage*.3,Math.sign(v.x+v.w/2-(p.x+p.w/2))||1,p.ult));
  for(const b of buildings)if(b.kind==='tiny'&&b.hpNow>0&&overlaps(zone,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h}))tick(b,()=>hit(b,p.damage,p.ult));
  for(const g of growths)if(g.hp>0&&overlaps(zone,{x:g.x-20,y:C.ground-55,w:40,h:55}))tick(g,()=>hitGrowth(g,p.damage));
  if(objective&&!objective.shattered&&overlaps(zone,{x:objective.x-30,y:C.ground-100,w:60,h:100}))tick(objective,()=>hitObjective(p.damage));
  if(rival&&!rival.dead&&overlaps(zone,rival))tick(rival,()=>strikeRival(p.damage,kb,Math.sign(rival!.x+rival!.w/2-(p.x+p.w/2))||1,p.ult));
  if(particles.length<C.particleCap&&Math.random()<.5*p.life/p.max)particles.push({x:p.x+Math.random()*p.w,y:C.ground-3,vx:(Math.random()-.5)*30,vy:-(30+Math.random()*70),life:.25+Math.random()*.3,color:Math.random()<.5?'#ffb13b':'#e8401a',size:2+Math.floor(Math.random()*2)});}
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
 for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps(box,u)&&first(u))hitUnit(military,u,dmg,'player',kb,r.dir);
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v))&&first(v))puntVehicle(v,dmg,r.dir,false,1.5);
 for(const b of buildings)if(b.kind==='tiny'&&b.hpNow>0&&overlaps(box,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})&&first(b))hit(b,b.hpNow,false,r.dir);
 for(const g of growths)if(g.hp>0&&overlaps(box,{x:g.x-20,y:C.ground-55,w:40,h:55})&&first(g))hitGrowth(g,dmg);
 if(objective&&!objective.shattered&&overlaps(box,{x:objective.x-30,y:C.ground-100,w:60,h:100})&&first(objective))hitObjective(dmg);
 if(rival&&!rival.dead&&overlaps(box,rival)&&first(rival))strikeRival(dmg,kb,r.dir);
 if(player.grounded&&particles.length<C.particleCap&&Math.random()<.7)particles.push({x:player.x+w/2-r.dir*w*.35,y:player.y+h-3,vx:-r.dir*(60+Math.random()*120),vy:-(40+Math.random()*100),life:.3+Math.random()*.25,color:Math.random()<.5?'#c9a77c':'#a8957a',size:2+Math.floor(Math.random()*4)});}
function startDive(){if(dive||player.grounded||clingTo||held||!canAct(combat)||combat.charging)return false;
 // A dive out of a running leap already rolls the way you were going; touching A/D during the dive (re)latches it.
 dive={startY:player.y+bodyHeight(),t0:time,dir:airRun?player.face:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)};player.vy=Math.max(player.vy,MV.diveSpeed*Math.sqrt(scale(combat)));airRun=false;attack=null;action='DIVE';actionTime=.5;return true;}
// Mantle: up onto the roof of `b` from the wall, nudged a little inboard of the edge.
function mantle(b:NonNullable<typeof clingTo>,w:number,h:number){const roof=C.ground-b.h;player.y=roof-h-.01;player.x=Math.max(b.x-w*.4,Math.min(b.x+b.w-w*.6,player.x+(player.x+w/2<b.x+b.w/2?w*.3:-w*.3)));player.vy=0;clingTo=null;mantled=true;}
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
 // Kaiban on the ground: Debris Shotgun. The rocks leave on the scoop's impact frame (the tusks wrenching up out of the street).
 // Airborne or clinging there is no street to scoop, so he fires the shared single shot like everyone else.
 if(kind==='ranged'&&activeKaiju==='Kaiban'&&player.grounded&&!clingTo){combat.rangedCooldown=B.debrisCooldown;
  debris={t:animImpact(activeKaiju,player.crouched?'rangedCrouch':'rangedStand',combat.stage),dir:player.face};if(debris.t<=0)launchDebris();return;}
 if(kind==='ranged'){if(shots.length<B.rangedMax)shots.push({x:player.x+w/2+player.face*w*.52,y,vx:player.face*C.projectileSpeed,life:1.8,damage,knockback:strike.knockback});return;}
 const reach=(C.meleeReach+(kind==='heavy'?20:0))*scale(combat);
 const box={x:player.face===1?player.x+w-10:player.x-reach+10,y:player.y-8,w:reach,h:h+16};
 if(objective&&!objective.shattered&&overlaps(box,{x:objective.x-30,y:C.ground-100,w:60,h:100}))hitObjective(damage);
 if(rival&&!rival.dead&&overlaps(box,rival)){strikeRival(damage,strike.knockback,player.face);if(rival.dead)return;}
 let struck=rival&&!rival.dead&&overlaps(box,rival);
 for(const u of military.units)if(u.hp>0&&overlaps(box,u)){hitUnit(military,u,damage,'player',strike.knockback,player.face);struck=true;}
 if(struck)hitstop=Math.max(hitstop,Math.min(F.hitstopMax,F.hitstopBase+damage*F.hitstopPerDamage));
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-7,y:p.y-7,w:14,h:14}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v)))puntVehicle(v,damage,player.face);
 for(const b of buildings)if(b.hpNow>0&&overlaps(box,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h}))hit(b,damage,false,player.face,{x:player.face===1?Math.max(b.x,box.x)+10:Math.min(b.x+b.w,box.x+box.w)-10,y:y});
 for(const g of growths)if(g.hp>0&&overlaps(box,{x:g.x-20,y:C.ground-55,w:40,h:55}))hitGrowth(g,damage);
 burst(player.x+w/2+player.face*reach*.8,y,kind==='heavy'?'#f2a8cb':'#d7f396',strike.combo===3?12:5);
 if(kind==='light'){action=`LIGHT COMBO ${strike.combo} / 3`;actionTime=.5;}
 if(kind==='heavy'){shake=strike.charge>B.maxCharge*.8?7:3;action=strike.charge>B.maxCharge*.8?'CHARGED HEAVY': 'HEAVY IMPACT';actionTime=.7;}
}
// First player-caused wreck of a vehicle pays out once (traffic pays less, so passing cars can't be farmed). No crystals.
function rewardVehicle(v:Vehicle,fromUltimate=false){if(v.rewarded)return;v.rewarded=true;score+=Math.round(VEHICLE_SPECS[v.kind].points*(v.traffic?VC.trafficPoints:1));creditDamage(combat,M.carHP,'player',fromUltimate);}
function flattenVehicle(v:Vehicle,playerCaused=true,fromUltimate=false){if(v===held)held=null;
 if(v.kind==='lamp'){if(upright(v)){uproot(v);v.state='wreck';v.angle=player.face>0?0:Math.PI;v.y=C.ground-v.h;spawnChunks(v.x+v.w/2,C.ground-8,player.face,'#e9d6a2',3);if(playerCaused)rewardVehicle(v,fromUltimate);}return;}v.state='flat';v.angle=0;v.vx=v.vy=0;v.y=C.ground-v.h;
 burst(v.x+v.w/2,C.ground-6,playerCaused?'#e6b983':'#b5aa8e',playerCaused?8:4);if(playerCaused)rewardVehicle(v,fromUltimate);}
// Punt: a hit sends the vehicle tumbling as a projectile that damages whatever it crashes into.
function puntVehicle(v:Vehicle,damage:number,dir:number,fromUltimate=false,lift=1){
uproot(v);const m=Math.sqrt(mass(v));launch(v,dir*(VC.kickSpeed+damage*1.4)/m,-(VC.kickLift+damage*.8)*lift/m,fromUltimate?0:damage*VC.kickDamage*mass(v));
 spawnChunks(v.x+v.w/2,v.y+v.h/2,dir,v.color,3);rewardVehicle(v,fromUltimate);}
function grabBox(){const w=bodyWidth(),reach=VC.grabReach*scale(combat);return {x:player.face>0?player.x+w*.5:player.x-reach,y:C.ground-46,w:w*.5+reach,h:46};}
// Lifting a small structure destroys it for score/quota on the spot and leaves no rubble.
function liftBuilding(b:typeof buildings[number]){const r=damageBuilding(b,b.hpNow);score+=r.points;creditDamage(combat,r.damage,'player');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);b.collapse=0;b.lifted=true;exploreReward(b,false);}
const UNIT_COLORS:Record<string,string>={patrol:'#557288',apc:'#7b8c61',tank:'#65795b',artillery:'#65795b'};
// H grabs the nearest thing in reach: loose vehicles/wrecks, enemy ground vehicles, or small structures.
function tryGrab(){if(held||!canAct(combat)||combat.charging||clingTo||combat.ultimateTime>0)return false;
 // Ranked by gap from the body's leading edge, so what is directly in front beats props under a wide Stage 3 body.
 const box=grabBox(),front=player.face>0?player.x+bodyWidth():player.x,dist=(r:{x:number,w:number})=>Math.abs(player.face>0?r.x-front:front-(r.x+r.w)),options:{d:number,take:()=>Vehicle}[]=[];
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v)))options.push({d:dist(v),take:()=>v});
 for(const u of military.units)if(u.hp>0&&GRABBABLE_UNITS.has(u.type)&&overlaps(box,u))options.push({d:dist(u),take:()=>{captureUnit(military,u);drainMilitary();const p=makeProp(nextVehicle++,u.type as Vehicle['kind'],u.x,UNIT_COLORS[u.type]);vehicles.push(p);return p;}});
 for(const b of buildings)if(liftable(b,combat.stage)&&overlaps(box,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h}))options.push({d:dist(b),take:()=>{liftBuilding(b);const p=b.h>F.liftHeight?liftedBuilding(nextVehicle++,b):makeProp(nextVehicle++,b.kind==='tiny'?'stand':'barrier',b.x,b.color,b.label);vehicles.push(p);return p;}});
 options.sort((a,b)=>a.d-b.d);if(!options.length)return false;
 const pick=options[0].take();uproot(pick);held=pick;pick.state='held';pick.angle=0;pick.vx=pick.vy=0;pick.panic=0;pick.lane=1;attack=animDuration(activeKaiju,'grab',combat.stage)?{anim:'grab',t:0}:null;action=`GRAB · ${pick.kind.toUpperCase()}`;actionTime=.9;return true;}
// Throw forward, or with W held lob it high (anti-air). Damage scales with the vehicle's mass and the kaiju's stage.
function throwHeld(){if(!held||!canAct(combat))return;const v=held,m=mass(v),up=keys.has('KeyW');held=null;
 launch(v,player.face*(up?VC.upSpeed:VC.throwSpeed/Math.sqrt(m)),-(up?VC.upLift:v.kind==='lamp'?VC.lampLift:VC.throwLift)/(up?Math.sqrt(m):1),VC.throwDamage*impact(v)*damageMultiplier(combat));
 v.lane=1;rewardVehicle(v);attack={anim:animDuration(activeKaiju,'throw',combat.stage)?'throw':'heavySlam',t:0};player.pose=.3;shake=Math.max(shake,3);action=up?'THROW · UP':'THROW';actionTime=.7;}
function dropHeld(){if(!held)return;const v=held;held=null;launch(v,0,0,0);if(attack?.anim==='grab')attack=null;}
// Thrown/punted vehicles crash into buildings, troops, the rival, objectives and other vehicles (which get knocked flying too).
function vehicleImpacts(v:Vehicle){
 if(v.state!=='flying'||v.damage<=1)return;const box=vehicleBox(v),dir=Math.sign(v.vx)||1,cx=v.x+v.w/2,cy=v.y+v.h/2;
 for(const b of buildings)if(solid(b)&&!v.hits.has(b)&&overlaps(box,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){v.hits.add(b);hit(b,v.damage,false,dir,{x:cx,y:cy});v.vx=-v.vx*VC.restitution;v.x=dir>0?b.x-v.w-1:b.x+b.w+1;v.damage*=VC.impactKeep;spawnChunks(cx,cy,-dir,v.color,4);return;}
 for(const u of military.units)if(u.hp>0&&!v.hits.has(u)&&overlaps(box,u)){v.hits.add(u);hitUnit(military,u,v.damage,'player',180*mass(v),dir);v.damage*=v.kind==='lamp'?VC.lampPierce:VC.unitKeep;hitstop=Math.max(hitstop,.04);}
 if(rival&&!rival.dead&&!v.hits.has(rival)&&overlaps(box,rival)){v.hits.add(rival);strikeRival(v.damage,160*mass(v),dir);v.vx=-v.vx*VC.restitution;v.damage*=VC.impactKeep;}
 if(objective&&!objective.shattered&&!v.hits.has(objective)&&overlaps(box,{x:objective.x-30,y:C.ground-100,w:60,h:100})){v.hits.add(objective);hitObjective(v.damage);v.vx=-v.vx*VC.restitution;v.damage*=VC.impactKeep;}
 for(const g of growths)if(g.hp>0&&!v.hits.has(g)&&overlaps(box,{x:g.x-20,y:C.ground-55,w:40,h:55})){v.hits.add(g);hitGrowth(g,v.damage);}
 for(const o of vehicles)if(o!==v&&loose(o)&&!v.hits.has(o)&&overlaps(box,vehicleBox(o))){v.hits.add(o);o.hits.add(v);uproot(o);launch(o,v.vx*VC.chainPush,-170/Math.sqrt(mass(o)),v.damage*.5);rewardVehicle(o);v.vx*=1-VC.chainPush*.6;spawnChunks(o.x+o.w/2,o.y,dir,o.color,3);}
}
function tickVehicles(dt:number){
 if(held&&!canAct(combat))dropHeld();
 const cx=player.x+bodyWidth()/2;
 if(trafficBudget>0){trafficTimer+=dt;if(trafficTimer>=VC.trafficInterval&&vehicles.filter(v=>v.state==='driving').length<VC.trafficCap){trafficTimer=0;trafficBudget--;
  vehicles.push(spawnTraffic(nextVehicle++,camera,Math.random()<.5?1:-1,Math.random,viewW()));}}
 for(const v of vehicles){
  if(v===held){const [anim,at]=currentAnim(),hp=holdPoint(activeKaiju,anim,at,combat.stage);
   if(hp){const k=scale(combat);v.x=cx+player.face*hp[0]*k-v.w/2;v.y=player.y+bodyHeight()+C.spriteDrop+hp[1]*k-v.h;}else{v.x=cx-v.w/2;v.y=player.y-v.h+C.spriteDrop*.5;}if(v.kind==='lamp')v.angle=player.face>0?0:Math.PI;continue;}
  tickDriving(v,dt,cx);
  const wasFlying=v.state==='flying',settled=tickFlying(v,dt,worldWidth);if(wasFlying)vehicleImpacts(v);
  // A thrown building breaks apart where it lands instead of lying around as a wreck.
  if(settled&&v.kind==='building'){v.state='flat';spawnChunks(v.x+v.w/2,C.ground-v.h*.4,Math.sign(v.vx)||player.face,v.color,8,1.6);burst(v.x+v.w/2,C.ground-8,'#b1ac91',14);shake=Math.max(shake,4);}
 }
 // Traffic that drives away is gone; old flattened wrecks are culled first once the cap is reached.
 vehicles=vehicles.filter(v=>!(v.state==='driving'&&(v.x<-VC.despawn*.2||v.x>worldWidth+VC.despawn*.2||(v.x<camera-VC.despawn||v.x>camera+viewW()+VC.despawn-C.width))));
 while(vehicles.length>VC.vehicleCap){const k=vehicles.findIndex(v=>v.state==='flat');if(k<0)break;vehicles.splice(k,1);}
}
function drainMilitary(){for(const e of military.events){if(e.kind==='reward'){score+=e.points;creditDamage(combat,e.damage,'player',e.ultimate);if(e.shards)dropShards(e.x,e.shards);}else if(e.kind==='playerHit'){const actual=receiveHit(combat,e.damage,'military',e.strength,e.direction);if(actual>0){shake=Math.max(shake,e.strength>0?6:1);burst(player.x+bodyWidth()/2,player.y+bodyHeight()/2,'#f197b8',4);}}else burst(e.x,e.y,'#f6dba1',3);}military.events=[];}
// First fissure waits for the roar's crash-down so the waves come out of the slam.
// Kaiban's Stampede bellows on the same impact frame, then charges (tickStampede) instead of sending fissures.
function useUltimate(){if(!activateUltimate(combat))return;attack=null;tremor=null;debris=null;jet=null;jet=null;jetFuel=1;jetLocked=false;ultimateTimer=animImpact(activeKaiju,'ultRoar',combat.stage);player.pose=.5;action=ultimateLabel();actionTime=2.4;shake=8;
 stampede=activeKaiju==='Kaiban'?{dir:player.face,hits:new Set(),turned:false,bellowed:false,charging:false,start:player.x,reach:B.stampedeReach*scale(combat)}:null;
 eruptLandings=[];eruption=activeKaiju==='Tlézcatl'?{blasted:false,spat:0,flash:0,boom:0}:null;
 if(eruption)ultimateTimer+=B.eruptCharge;}
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
  e.blasted=true;e.boom=0;e.flash=.4;shake=Math.max(shake,18);hitstop=Math.max(hitstop,.12);
  const R=B.eruptBlastRange*g,dmg=B.eruptBlastDamage*dm,kb=B.eruptBlastKnockback,side=(x:number)=>Math.sign(x-cx)||player.face,hits=(r:{x:number,y:number,w:number,h:number})=>inCircle(cx,cy,R,r);
  for(const b of buildings)if(b.hpNow>0&&hits({x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){const d=side(b.x+b.w/2),near=d>0?b.x:b.x+b.w;hit(b,dmg,true,d,{x:near+d*6,y:Math.max(C.ground-b.h+6,Math.min(C.ground-6,cy))});}
  for(const gr of growths)if(gr.hp>0&&hits({x:gr.x-20,y:C.ground-55,w:40,h:55}))hitGrowth(gr,dmg);
  if(objective&&!objective.shattered&&hits({x:objective.x-30,y:C.ground-100,w:60,h:100}))hitObjective(dmg);
  if(rival&&!rival.dead&&hits(rival))strikeRival(dmg,kb,side(rival.x+rival.w/2),true);
  for(const u of military.units)if(u.hp>0&&hits(u))hitUnit(military,u,dmg,'player',kb,side(u.x+u.w/2),true);
  for(const p of military.projectiles)if(!p.dead&&hits({x:p.x-6,y:p.y-6,w:12,h:12}))intercept(military,p);
  for(const v of vehicles)if(loose(v)&&hits(vehicleBox(v)))puntVehicle(v,dmg*.5,side(v.x+v.w/2),true,1.8);
  for(let k=0;k<60&&particles.length<C.particleCap;k++){const a=Math.random()*Math.PI*2,sp=(250+Math.random()*400)*g;particles.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.8,life:.3+Math.random()*.5,color:['#fff2c0','#ffd34d','#ff8a1f','#e8401a','#5a1d12'][k%5],size:2+Math.floor(Math.random()*5)});}
  // The fallout: every glob thrown out of the fireball at once, from the point on its edge facing where it will land.
  const reach=B.eruptRange*g,[t0,t1]=B.eruptFlight;
  for(let i=0;i<B.eruptGlobs;i++){const dir=i%2?1:-1,land=Math.max(4,Math.min(worldWidth-4,cx+dir*(R*.6+Math.random()*(reach-R*.6)))),T=t0+Math.random()*(t1-t0),a=-Math.PI/2+dir*(.25+Math.random()*.9);
   const x0=cx+Math.cos(a)*R*.35,y0=Math.min(C.ground-10,cy+Math.sin(a)*R*.35);
   globs.push({x:x0,y:y0,vx:(land-x0)/T,vy:(C.ground-2-y0-.5*B.eruptGravity*T*T)/T,grav:B.eruptGravity,life:T+1,damage:B.eruptGlobDamage*dm,size:B.eruptGlobSize*g*(.8+Math.random()*.4),ult:true});}
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
 for(let k=0;k<3;k++){const hy=C.ground-Math.min(b.h-4,18+k*b.h/3);spawnChunks(face,hy,dir,b.color,6,1.8);burst(face,hy,'#e8d8ab',8);}
 hitstop=Math.max(hitstop,B.stampedeCrunch);shake=Math.max(shake,12);}
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
 for(const b of buildings)if(b.hpNow>0&&overlaps(box,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})&&first(b))trainWreck(b,s.dir,player.y+h*.5);
 for(const g of growths)if(g.hp>0&&overlaps(box,{x:g.x-20,y:C.ground-55,w:40,h:55})&&first(g))hitGrowth(g,dmg);
 if(objective&&!objective.shattered&&overlaps(box,{x:objective.x-30,y:C.ground-100,w:60,h:100})&&first(objective))hitObjective(dmg);
 if(rival&&!rival.dead&&overlaps(box,rival)&&first(rival))strikeRival(dmg,B.stampedeKnockback,s.dir,true);
 for(const u of military.units)if(u.hp>0&&overlaps(box,u)&&first(u))hitUnit(military,u,dmg,'player',B.stampedeKnockback,s.dir,true);
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-6,y:p.y-6,w:12,h:12}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v))&&first(v))puntVehicle(v,dmg*.5,s.dir,true,1.6);
 shake=Math.max(shake,3);
 // Dust kicked up behind the hooves.
 for(let n=0;n<2&&particles.length<C.particleCap;n++)if(Math.random()<dt*30)particles.push({x:player.x+w/2-s.dir*w*.45,y:player.y+h-3,vx:-s.dir*(60+Math.random()*120),vy:-(40+Math.random()*110),life:.35+Math.random()*.3,color:Math.random()<.5?'#c9a77c':'#a8957a',size:2+Math.floor(Math.random()*4)});}
function useSuper(){if(activateSuper(combat)){action='SUPER FORM';actionTime=2;burst(player.x+bodyWidth()/2,player.y,'#f7a2d3',35);}}
function solidBodies(){return [...buildings.filter(solid).map(b=>({x:b.x,y:C.ground-b.h,w:b.w,h:b.h})),...(rival&&!rival.dead?[rival]:[])];}
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
 if(hitstop>0){hitstop=Math.max(0,hitstop-dt);return;}
 performStrike(tickCombat(combat,dt));
 if(endIfDead())return;
 actionTime=Math.max(0,actionTime-dt);shake=Math.max(0,shake-dt*14);player.pose=Math.max(0,player.pose-dt);
 if(attack){attack.t+=dt;if(attack.t>=animDuration(activeKaiju,attack.anim,combat.stage))attack=null;}
 if(tremor){tremor.t-=dt;if(tremor.t<=0)launchTremor();}
 if(debris){debris.t-=dt;if(debris.t<=0)launchDebris();}
 if(jet)tickJet(dt);
 if(!jet||jet.phase!=='on'){jetFuel=Math.min(1,jetFuel+B.jetRegen*dt);if(jetLocked&&jetFuel>=B.jetRelight)jetLocked=false;}
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
 let dx=roll?roll.dir*C.moveSpeed*MV.rollSpeed*Math.sqrt(scale(combat))*dt:!canAct(combat)||player.crouched||clingTo?0:steer*C.moveSpeed*gait*(combat.superTime>0?B.superSpeed:1)*(combat.charging?B.chargeSlow:1)*(held?VC.holdSlow:1)*(jet?B.jetSlow:1)*dt;
 if(dx)player.face=dx>0?1:-1;
 const inputDx=dx;
 const kb=combat.transform>0||combat.ultimateTime>0?0:combat.knockback*dt;
 dx+=kb;let nx=Math.max(0,Math.min(worldWidth-w,player.x+dx)),wall:typeof clingTo=null;
 for(const b of buildings)if(solid(b)&&overlaps({x:nx,y:player.y,w,h},{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){if(inputDx&&Math.sign(b.x+b.w/2-player.x-w/2)===Math.sign(inputDx))wall=b;nx=dx>0?Math.min(nx,b.x-w):dx<0?Math.max(nx,b.x+b.w):player.x;if(Math.abs(combat.knockback)>M.collisionImpactMin)receiveHit(combat,Math.abs(combat.knockback)*M.collisionPlayerDamage,'environment');combat.knockback=0;}
 if(rival&&!rival.dead&&overlaps({x:nx,y:player.y,w,h},rival))nx=dx>0?rival.x-w:dx<0?rival.x+rival.w:player.x;
 if(running&&player.grounded&&steer===runDir)runUp+=Math.abs(nx-player.x);else runUp=0;runDir=running?steer:0;
 walking=inputDx!==0&&player.grounded&&Math.abs(nx-player.x)>.01&&!roll;player.x=nx;
 // The ball smacks a wall: big hit, then ricochet back with a hop the first time, burst out the second.
 if(roll&&wall){hit(wall,MV.rollWallDamage*damageMultiplier(combat)*roll.power,false,roll.dir,{x:roll.dir>0?wall.x+4:wall.x+wall.w-4,y:player.y+h*.5});shake=Math.max(shake,7);
  if(roll.bounced)endRoll(true);else{roll.bounced=true;roll.dir=-roll.dir;player.face=roll.dir;roll.t=Math.min(roll.t,MV.rollAfterBounce);roll.hits.clear();player.vy=-jumpVelocity()*MV.rollHop;player.grounded=false;action='RICOCHET';actionTime=.8;}}
 if(roll)tickRoll(w,h);
 // Shoulder barge: running into a wall hits it (on a short cooldown); running through troops bowls them over.
 const gore=activeKaiju==='Kaiban';
 if(running&&player.grounded&&wall&&bargeT<=0&&runUp>=MV.bargeRunUp*scale(combat)){bargeT=MV.bargeCooldown;runUp=0;hit(wall,MV.bargeDamage*damageMultiplier(combat)*(dashT>0?1.5:1)*(gore?MV.goreMult:1),false,player.face,{x:player.face>0?wall.x+4:wall.x+wall.w-4,y:player.y+h*.5});shake=Math.max(shake,gore?7:4);action=gore?'GORE':'SHOULDER BARGE';actionTime=.6;}
 if(running&&player.grounded){for(const u of military.units)if(u.hp>0&&!UNITS[u.type].air&&overlaps({x:player.x,y:player.y,w,h},u)&&(bargeHits.get(u)??-9)<time-.6){bargeHits.set(u,time);hitUnit(military,u,MV.bargeUnitDamage*damageMultiplier(combat)*(gore?MV.goreUnitMult:1),'player',MV.bargeKnockback*(gore?MV.goreUnitMult:1),player.face);}
  // Gore Charge: cars in the way get flipped up over the tusks instead of stamped flat.
  if(gore)for(const v of vehicles)if(loose(v)&&!bargeHits.has(v)&&overlaps({x:player.x+w*.3,y:player.y,w:w*.7,h},vehicleBox(v))){bargeHits.set(v,time);puntVehicle(v,MV.bargeDamage*damageMultiplier(combat),player.face,false,MV.goreLift);}
  if(particles.length<C.particleCap&&Math.random()<dt*24)particles.push({x:player.x+w/2-player.face*w*.4,y:player.y+h-3,vx:-player.face*(40+Math.random()*90),vy:-(30+Math.random()*80),life:.3+Math.random()*.25,color:'#c9a77c',size:2+Math.floor(Math.random()*3)});}
 if(Math.abs(kb)>0&&Math.abs(combat.knockback)>M.collisionImpactMin){
 for(const b of buildings)if(b.hpNow>0&&overlaps({x:player.x,y:player.y,w,h},{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){
 if(b.kind!=='large'){damageBuilding(b,Math.abs(combat.knockback)*M.collisionBuildingDamage,'impact');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);}
 receiveHit(combat,Math.abs(combat.knockback)*M.collisionPlayerDamage,'environment');combat.knockback=0;break;
 }}
 let prevBottom=player.y+h,climbing=false;const wasGrounded=player.grounded;
 // The Stampede keeps gravity on (so charging off a roof drops him); every other Ultimate holds the kaiju in place.
 if(combat.transform<=0&&(combat.ultimateTime<=0||stampede)){
 player.grounded=false;
 if(!keys.has('KeyW'))grabLock=false;
 const onWall=(b:NonNullable<typeof clingTo>)=>solid(b)&&player.x+w>=b.x-4&&player.x<=b.x+b.w+4&&player.y+h>C.ground-b.h+2;
 if(clingTo&&(!onWall(clingTo)||!canAct(combat)||combat.charging))clingTo=null;
 if(!clingTo&&!grabLock&&!held&&!dive&&!roll&&keys.has('KeyW')&&canAct(combat)&&!combat.charging){clingTo=buildings.find(onWall)||null;if(clingTo)mantled=false;}
 // Leap-grab: airborne and steering into a wall catches it; feet near the roof pull straight up onto it (ledge grab).
 if(!clingTo&&wall&&!wasGrounded&&grabWait<=0&&!held&&!dive&&!roll&&canAct(combat)&&!combat.charging&&onWall(wall)){
  if(player.y+h<=C.ground-wall.h+h*MV.ledgeGrab){mantle(wall,w,h);prevBottom=C.ground-wall.h-.01;}else{clingTo=wall;mantled=false;airRun=false;}}
 if(clingTo){
 const b=clingTo,roof=C.ground-b.h;
 player.face=player.x+w/2<b.x+b.w/2?1:-1;
 // Pushing into the wall climbs just like W.
 const into=player.face>0?keys.has('KeyD'):keys.has('KeyA');
 climbDir=(keys.has('KeyS')?1:0)-(keys.has('KeyW')||into&&!keys.has('KeyS')?1:0);climbing=true;player.vy=climbDir*C.climbSpeed;player.y+=player.vy*dt;
 if(climbDir<0&&player.y+h<=roof+8){mantle(b,w,h);climbing=false;prevBottom=roof-.01;}
 }
 if(!climbing){player.vy+=C.gravity*dt;player.y+=player.vy*dt;}
 isClimbing=climbing;
 }
 if(!climbing&&player.vy>=0)for(const b of buildings){if(!solid(b))continue;const roof=C.ground-b.h;
 if(player.x+w>b.x&&player.x<b.x+b.w&&prevBottom<=roof+1&&player.y+h>=roof){player.y=roof-h-.01;player.vy=0;player.grounded=true;}}
 if(player.y+h>=C.ground){player.y=C.ground-h;player.vy=0;player.grounded=true;}
 if(player.grounded){clingTo=null;isClimbing=false;airRun=false;if(dive){if(slamLand())player.vy=MV.diveSpeed*Math.sqrt(scale(combat));else dive=null;}}
 // Dive trail: dust streaming up off the plunging body.
 if(dive&&particles.length<C.particleCap)particles.push({x:player.x+Math.random()*w,y:player.y+Math.random()*h*.4,vx:(Math.random()-.5)*40,vy:-(160+Math.random()*120),life:.25,color:'#e8d8ab',size:2+Math.floor(Math.random()*3)});
 // A charging Stampede plows through buildings; anything still standing pushes him out once the charge ends.
 if(!stampede?.charging)player.x=separateHorizontal({x:player.x,y:player.y,w,h},solidBodies(),worldWidth);
 for(const b of buildings)if(b.topple===1){b.tiltV+=F.toppleAccel*Math.sin(b.tilt+.2)*dt;b.tilt+=b.tiltV*dt;if(b.tilt>=Math.PI/2){b.tilt=Math.PI/2;b.topple=2;landTopple(b);}}
 for(const b of buildings){b.collapse=Math.max(0,b.collapse-dt);b.jolt=Math.max(0,b.jolt-dt);if(b.kind==='tiny'&&b.hpNow>0&&overlaps({x:player.x,y:player.y,w,h},{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){if(Math.abs(kb)>.01){damageBuilding(b,b.hpNow,'impact');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);}else hit(b,b.hpNow);}}
 for(const v of vehicles)if(loose(v)&&overlaps({x:player.x+w*.18,y:player.y,w:w*.64,h},vehicleBox(v)))flattenVehicle(v,Math.abs(kb)<.01);
 tickVehicles(dt);
 score+=tickPopulation(population,dt,{x:player.x,y:player.y,w,h},worldWidth,Math.abs(kb)<.01);
 for(const s of shots){const old=s.x;s.x+=s.vx*dt;s.life-=dt;
 for(const target of projectileTargets(s.damage,s.knockback,Math.sign(s.vx)||1,s.y))if(segmentHits(old,s.y,s.x,s.y,target.rect)){target.hit();s.life=0;break;}}
 // Debris Shotgun rocks fly ballistic, stop on the first thing they hit and crumble on the street.
 for(const r of rocks){const ox=r.x,oy=r.y;r.vy+=B.debrisGravity*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;r.life-=dt;r.spin+=dt*14;
 for(const target of projectileTargets(r.damage,r.knockback,Math.sign(r.vx)||1,r.y))if(segmentHits(ox,oy,r.x,r.y,target.rect)){target.hit();r.life=0;break;}
 if(r.life>0&&r.y>=C.ground-2){r.life=0;burst(r.x,C.ground-3,'#c9a77c',3);}}
 rocks=rocks.filter(r=>r.life>0&&r.x>0&&r.x<worldWidth);
 // Magma Dive globs: ballistic like the rocks; a glob that reaches the street splats into a small lava pool.
 for(const g of globs){const ox=g.x,oy=g.y;g.vy+=(g.grav??B.debrisGravity)*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.life-=dt;
 if(!g.ult||g.vy>0)for(const target of projectileTargets(g.damage,g.ult?90:40,Math.sign(g.vx)||1,g.y,g.ult,g.ult?{x:g.x,y:g.y}:undefined))if(segmentHits(ox,oy,g.x,g.y,target.rect)){target.hit();g.life=0;burst(g.x,g.y,'#ff8a1f',g.ult?8:4);if(g.ult)eruptLandings.push(g.x);break;}
 if(g.life>0&&g.y>=C.ground-2){g.life=0;const grow=Math.sqrt(scale(combat)),dm=damageMultiplier(combat);
  if(g.ult){eruptLandings.push(g.x);addPool(g.x,B.eruptPool*grow,B.eruptPoolDamage*dm,true,B.eruptPoolSeconds);burst(g.x,C.ground-3,'#ffb13b',8);shake=Math.max(shake,3);}
  else{addPool(g.x,MV.lavaGlobPool*grow,MV.lavaPoolDamage*dm);burst(g.x,C.ground-3,'#ff8a1f',4);}}}
 globs=globs.filter(g=>g.life>0&&g.x>0&&g.x<worldWidth);tickPools(dt);

 shots=shots.filter(s=>s.life>0&&s.x>0&&s.x<worldWidth);
 if(combat.ultimateTime<=0){stampede=null;eruption=null;}
 if(combat.ultimateTime>0&&stampede)tickStampede(dt,w,h);
 else if(combat.ultimateTime>0&&eruption)tickEruption(dt,w,h);
 else if(combat.ultimateTime>0){ultimateTimer-=dt;if(ultimateTimer<=0){ultimateTimer+=B.ultimatePulse;
 for(const direction of [-1,1])waves.push({x:player.x+w/2,vx:direction*B.ultimateSpeed,life:B.ultimateRange/B.ultimateSpeed,max:B.ultimateRange/B.ultimateSpeed,damage:B.ultimateDamage*damageMultiplier(combat),hits:new Set(),ult:true,size:1,knockback:280});shake=Math.max(shake,4);}}
 for(const wave of waves){const old=wave.x,z=wave.size;wave.x+=wave.vx*dt;wave.life-=dt;for(const b of buildings)if(b.hpNow>0&&!wave.hits.has(b)&&Math.max(old,wave.x)+22*z>=b.x&&Math.min(old,wave.x)-22*z<=b.x+b.w){wave.hits.add(b);hit(b,wave.damage,wave.ult,Math.sign(wave.vx)||1,{x:wave.x,y:C.ground-18*z});}for(const g of growths)if(g.hp>0&&!wave.hits.has(g)&&Math.abs(g.x-wave.x)<40*z){wave.hits.add(g);hitGrowth(g,wave.damage);}
  // Tremor waves kick up rock and dust as they roll.
  if(!wave.ult&&Math.random()<dt*28&&particles.length<C.particleCap)particles.push({x:wave.x+(Math.random()-.5)*24*z,y:C.ground-4,vx:Math.sign(wave.vx)*(40+Math.random()*90),vy:-(90+Math.random()*170)*z,life:.35+Math.random()*.35,color:Math.random()<.5?'#c9a77c':'#8d7a66',size:2+Math.floor(Math.random()*3*z)});}
 if(rival?.dead){winCity();return;}
 for(const wave of waves){const z=wave.size,box={x:wave.x-30*z,y:C.ground-48*z,w:60*z,h:48*z};
 if(objective&&!objective.shattered&&!wave.hits.has(objective)&&overlaps(box,{x:objective.x-30,y:C.ground-100,w:60,h:100})){wave.hits.add(objective);hitObjective(wave.damage);}
 if(rival&&!rival.dead&&!wave.hits.has(rival)&&overlaps(box,rival)){wave.hits.add(rival);strikeRival(wave.damage,wave.knockback,Math.sign(wave.vx),wave.ult);}
 for(const u of military.units)if(u.hp>0&&!wave.hits.has(u)&&overlaps(box,u)){wave.hits.add(u);hitUnit(military,u,wave.damage,'player',wave.knockback,Math.sign(wave.vx),wave.ult);}
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-6,y:p.y-6,w:12,h:12}))intercept(military,p);
 for(const v of vehicles)if(loose(v)&&overlaps(box,vehicleBox(v)))puntVehicle(v,wave.damage*.5,Math.sign(wave.vx)||1,wave.ult,1.6);
 }
 if(rival?.dead){winCity();return;}
 if(rival){for(const hit of tickRival(rival,dt,{x:player.x,y:player.y,w,h},worldWidth,buildings))receiveHit(combat,hit.damage,'boss',hit.strength,hit.direction);for(const b of buildings)if(b.hpNow<b.hp)releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);if(endIfDead())return;}
 tickMilitary(military,dt,camera,worldWidth,{x:player.x,y:player.y,w,h},destruction(buildings),rival||undefined,Math.abs(kb)<.01?'player':'military',viewW());drainMilitary();syncBody();if(endIfDead())return;
 waves=waves.filter(w=>w.life>0&&w.x>0&&w.x<worldWidth);
 // Ambient crystals and growths appear ahead of the kaiju (the way it faces), so heading west still finds them.
 ambientTimer+=dt;growthTimer+=dt;
 if(ambientTimer>=B.ambientInterval){ambientTimer=0;dropShards(Math.max(80,Math.min(worldWidth-80,player.x+w/2+55*player.face)),B.ambientCount);}
 if(growthTimer>=B.growthInterval){growthTimer=0;if(growths.filter(g=>g.hp>0).length<B.growthCap)growths.push({x:Math.max(60,Math.min(worldWidth-100,player.x+w/2+140*player.face)),hp:B.growthHP});}
 growths=growths.filter(g=>g.hp>0);
 for(const shard of shards){shard.life-=dt;shard.vy+=380*dt;shard.x+=shard.vx*dt;shard.y+=shard.vy*dt;shard.vx*=Math.exp(-dt*4);
 shard.x=Math.max(8,Math.min(worldWidth-8,shard.x));
 if(shard.y>C.ground-10){shard.y=C.ground-10;shard.vy=0;}
 const px=player.x+w/2,py=player.y+h*.65,dist=Math.hypot(shard.x-px,shard.y-py);
 if(dist<B.shardMagnet){shard.x+=(px-shard.x)*Math.min(1,dt*6);shard.y+=(py-shard.y)*Math.min(1,dt*6);}
 if(overlaps({x:player.x-8,y:player.y-8,w:w+16,h:h+20},{x:shard.x-5,y:shard.y-8,w:10,h:16})){const before=combat.stage;collectCrystal(combat,B.shardValue);shard.life=0;if(before!==combat.stage){action=`EVOLUTION · STAGE ${combat.stage}`;actionTime=1.6;burst(px,py,'#f7a2d3',30);}}}
 shards=shards.filter(s=>s.life>0);syncBody();
 for(const c of chunks){c.life-=dt;c.vy+=F.chunkGravity*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y+c.s>=C.ground){c.y=C.ground-c.s;if(c.bounces<1&&c.vy>60){c.vy*=-.32;c.vx*=.5;c.bounces++;}else{c.vy=0;c.vx*=Math.exp(-dt*9);}}}chunks=chunks.filter(c=>c.life>0);
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
 const W=viewW()+100,top=C.ground-(C.ground+cameraY)/zoom-20;
 rect(0,top,W,540-top,CITIES[cityIndex].sky);rect(0,130,W,190,'#b5c5be');rect(0,260,W,180,CITIES[cityIndex].haze);
 // Decorative parallax silhouettes, deterministic and noninteractive.
 for(let i=-1,n=W/79+1;i<n;i++){const x=i*79-(camera*.13)%79,h=50+((i+22)*47%115);rect(x,315-h,50,h,'#80999c');rect(x+18,305-h,10,10,'#80999c');}
 for(let i=-1,n=W/102+1;i<n;i++){const x=i*102-(camera*.26)%102,h=80+((i+17)*37%110);rect(x,370-h,65,h,'#6b8588');rect(x+4,374-h,56,4,'#8ba2a1');for(let yy=390-h;yy<360;yy+=15)for(let xx=8;xx<59;xx+=15)rect(x+xx,yy,5,7,'#a6b4a7');}
 // Dense near-layer towers crowd the street and close in the skyline. Open layouts skip them so plazas read as open ground.
 if(!openLayout())for(let i=-1,n=W/88+1;i<n;i++){const x=i*88-(camera*.5)%88,h=170+((i+31)*53%150);rect(x,C.ground-4-h,78,h,'#4f6469');rect(x+78,C.ground-4-h,10,h,'#435659');rect(x-2,C.ground-4-h,82,5,'#6d8185');for(let yy=C.ground-h+4;yy<C.ground-20;yy+=17)for(let xx=7;xx<72;xx+=16)rect(x+xx,yy,7,9,(i+yy)%5===0?'#c9b77a':'#38494d');}
 rect(0,0,W,70,'#1a2a2e22');rect(0,0,W,34,'#1a2a2e33');
 rect(0,C.ground-4,W,10,'#c9c5ab');rect(0,C.ground+6,W,99,'#4c5755');rect(0,C.ground+8,W,3,'#202e31');
 for(let i=-1,n=W/85+1;i<n;i++)rect(i*85-camera%85,487,37,3,'#b4b294');rect(0,513,W,27+C.ground/zoom,'#34413f');
 // Street lamps are world props now (src/vehicles.ts createLamps), drawn with the vehicles.
}
function drawBuilding(b:typeof buildings[number]){
 if(b.topple===2||b.lifted)return;
 // Falling: draw the intact structure rotated about its base corner on the fall side.
 if(b.topple===1){const px=(b.tiltDir>0?b.x+b.w:b.x)-camera;if(px+b.h<-60||px-b.h>viewW()+60)return;ctx.save();ctx.translate(px,C.ground);ctx.rotate(b.tiltDir*b.tilt);ctx.translate(-px,-C.ground);drawStructure(b,b.x-camera,b.h);ctx.restore();return;}
 const x=b.x-camera+(b.jolt>0?b.joltDir*F.joltPixels*b.jolt/F.joltSeconds:0);if(x>viewW()+40||x+b.w<-40)return;
 if(b.hpNow<=0&&b.collapse<=0){rect(x,C.ground-7,b.w,7,'#62625b');for(let j=0;j<b.w;j+=13)rect(x+j,C.ground-8-(j%7),10,8+j%7,'#898879');return;}
 const squash=b.hpNow<=0?b.collapse/C.collapseDuration:1;drawStructure(b,x,b.h*squash);
 if(b.collapse>0){rect(x-5,C.ground-14,b.w+10,14,'#b1ac91');}
}
function drawStructure(b:typeof buildings[number],x:number,h:number){
 const y=C.ground-h;
 rect(x+5,y+8,b.w,h-8,'#394d55');rect(x,y,b.w-7,h,b.color);rect(x-3,y,b.w+4,7,'#d0cab0');rect(x+2,y+7,b.w-10,3,'#424f55');
 for(let yy=22;yy<h-24;yy+=22)for(let xx=12;xx<b.w-14;xx+=19){rect(x+xx,y+yy,10,13,'#324953');rect(x+xx,y+yy,10,3,'#91a7a2');rect(x+xx+4,y+yy,2,13,b.color);}
 rect(x+14,C.ground-26,16,26,'#293f47');rect(x+17,C.ground-23,10,18,'#8fa99e');
 if(b.label&&h>35&&!b.landmark){rect(x+4,y+h-47,b.w-16,17,'#263e46');text(b.label,x+(b.w-8)/2,y+h-35,9,'#eddfa8','center');}
 // Landmarks: stepped crown and blinking spire (seen when climbing), gold pilasters, and a street-level name banner.
 if(b.landmark){const cx=x+(b.w-7)/2;for(let px=x+8;px<x+b.w-14;px+=34)rect(px,y+7,3,h-7,'#e4cf8a');rect(x+12,y-14,b.w-31,14,b.color);rect(x+9,y-17,b.w-25,4,'#e4cf8a');rect(x+36,y-34,b.w-79,20,b.color);rect(x+33,y-37,b.w-73,4,'#e4cf8a');
  rect(cx-3,y-80,6,44,'#d9c894');rect(cx-1,y-94,2,14,'#f2e6b8');if(Math.sin(time*4)>0)rect(cx-2,y-97,4,4,'#f58f8f');if(h>70){rect(x+6,y+h-58,b.w-19,21,'#3a3524');rect(x+6,y+h-58,b.w-19,2,'#e4cf8a');text(b.label,cx,y+h-43,11,'#f1dc96','center');}}
 // Caches look ordinary but one window flashes crystal pink now and then; damage exposes the vein.
 if(b.cache&&b.hpNow>0){if((time*1.3+b.x*.01)%3<.3)rect(x+Math.round(b.w*.45),y+Math.round(h*.45),10,13,'#f6a8d6');if(b.hpNow/b.hp<.68)poly([[x+b.w*.3,y+h*.3],[x+b.w*.45,y+h*.5],[x+b.w*.35,y+h*.7],[x+b.w*.55,y+h*.55],[x+b.w*.42,y+h*.32]],'#f39bd0');}
 if(b.hpNow/b.hp<.68){poly([[x+20,y+13],[x+25,y+38],[x+16,y+51],[x+31,y+41],[x+24,y+11]],'#293e44');rect(x+b.w-32,y+h*.4,19,22,'#3e4a4c');}
 if(b.hpNow/b.hp<.34){poly([[x+45,y+7],[x+36,y+63],[x+52,y+87],[x+44,y+61],[x+54,y+9]],'#283b3f');rect(x+10,y+h*.55,20,30,'#304347');for(let n=0;n<3;n++)rect(x+b.w*.6+Math.sin(time*2+n)*5,y+15-n*14-(time*8%14),14+n*5,12,'#69736c');}
 // Holes stay where each blow landed (scaled with any squash); jagged, darker core, pale broken rim.
 for(const o of b.holes){if(o.y>b.h)continue;const cx=x+o.x,cy=C.ground-o.y*h/b.h,pts:number[][]=[],core:number[][]=[];
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2,j=.62+.38*Math.abs(Math.sin(o.seed*12.9898+k*78.233));pts.push([cx+Math.cos(a)*o.r*j,cy+Math.sin(a)*o.r*j*.85]);core.push([cx+Math.cos(a)*o.r*j*.55,cy+Math.sin(a)*o.r*j*.45]);}
  poly(pts.map(([px,py])=>[px+1,py-1]),'#cfc6a8');poly(pts,'#22313a');poly(core,'#121c20');}
 if(b.jolt>F.joltSeconds*.55){ctx.globalAlpha=.5;rect(x,y,b.w-7,h,'#fff4dc');ctx.globalAlpha=1;}
}
// A toppled building lies as a long rubble ridge across everything it landed on.
function drawFallen(b:typeof buildings[number]){
 const [from,to]=toppleSpan(b),a=Math.min(from,b.x)-camera,z=Math.max(to,b.x+b.w)-camera;if(z<-40||a>viewW()+40)return;
 rect(a,C.ground-9,z-a,9,'#5c5f58');for(let x=a;x<z;x+=11){const hh=5+((x+b.x)*7%11);rect(x,C.ground-9-hh,9,hh,(x|0)%3?'#898879':b.color);}
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
function hud(){
 rect(0,0,960,72,'#15262c');rect(0,71,960,2,'#aabe9b');rect(20,18,4,35,'#f08bbf');text(activeKaiju.toUpperCase(),35,31,15);text(`STAGE 0${combat.stage}${combat.superTime>0?' / SUPER':''}`,35,49,9,'#8fa39e');
 text('DISTRICT DESTRUCTION',330,23,9,'#a4b6a8');rect(330,34,290,11,'#334744');rect(330,34,290*destruction(buildings),11,'#c8ed82');rect(330+290*.75,31,2,17,'#f3a2c9');text('75%',330+290*.75,59,9,'#f3a2c9','center');text(`${Math.round(destruction(buildings)*100)}%`,635,45,17,'#c8ed82');
 text('SCORE',746,23,9,'#a4b6a8');text(hudScore(netScore()),746,47,21);text(`${CITIES[cityIndex].code} / 0${blockIndex+1}`,938,28,11,'#e4e7d1','right');text('ESC Ⅱ',938,49,10,'#9aaea2','right');
 rect(20,86,260,24,'#213a40');text(session!=='drill'?`0${blockIndex+1} ${block.name.toUpperCase()}`:`DRILL / RESPONSE TIER ${military.tier}`,30,102,9,'#e4e7d1');text(`HOSTILES ${military.units.length} / ${M.caps[military.tier-1]}`,30,124,9,'#344f49');
 if(objective||rival){const value=objective?objective.hp/objective.maxHP:rival!.hp/rival!.maxHP;const label=objective?'STRONGHOLD CRYSTAL':`${bossName().toUpperCase()} / M4 RIVAL`;text(label,330,94,10,'#344f49');rect(330,101,300,6,'#6b8c83');rect(330,101,300*value,6,'#e9a0c8');text(objective?.shattered?'CRYSTAL SHATTERED':`${Math.ceil(objective?.hp??rival!.hp)} HP`,650,107,10,'#344f49');}
 if(block.kind==='boss'&&rival)text('ARENA LOCKED',935,126,11,'#344f49','right');
 if(objectiveOpen()){text(openLayout()?'EXITS OPEN ← →':'EXIT OPEN →',935,103,13,'#203c35','right');if(camera<worldWidth-viewW()-30)text('EAST →',925,275,12,'#243e35','right');if(openLayout()&&camera>30)text('← WEST',35,275,12,'#243e35');}
 else if(time<8&&mode==='playing')text('ESC: PAUSE  ·  MOVES & CONTROLS',480,416,11,'#f7f0cd','center');
 if(actionTime>0)text(action,480,153,12,'#243f37','center');
 meters();
 minimap();text('TEMP ART / M7',939,530,8,'#a0af99','right');
}
// Whole-block strip map: skyline (gold landmarks, exposed caches pink), hostiles, objective/rival, exits, view window, player.
function minimap(){const mx=X.minimapX,my=X.minimapY,mw=X.minimapW,mh=X.minimapH,k=mw/worldWidth,open=objectiveOpen();
 rect(mx-4,my-4,mw+8,mh+8,'#15262cd0');rect(mx,my+mh-2,mw,2,'#56685d');
 for(const b of buildings){if(b.kind==='tiny')continue;const bx=mx+b.x*k,bw=Math.max(1,b.w*k-.5);if(b.hpNow<=0){rect(bx,my+mh-3,bw,1,'#4a5650');continue;}
  const bh=Math.max(2,b.h/520*(mh-4));rect(bx,my+mh-2-bh,bw,bh,b.landmark?'#f1dc96':b.cache&&b.hpNow<b.hp*.68?'#f6a8d6':'#7f948f');}
 for(const u of military.units)if(u.hp>0)rect(mx+u.x*k,u.y<C.ground-60?my+1:my+mh-5,2,2,'#e98a8a');
 if(objective&&!objective.shattered)rect(mx+objective.x*k-2,my+3,4,mh-5,'#f4a1d0');if(rival&&!rival.dead)rect(mx+rival.x*k,my+3,3,mh-5,'#d694bf');
 rect(mx+mw-2,my,2,mh,open?'#c8ed82':'#56685d');if(openLayout())rect(mx,my,2,mh,open?'#c8ed82':'#56685d');
 rect(mx+camera*k,my-2,Math.min(mw,viewW()*k),1,'#e4e7d1');rect(mx+camera*k,my+mh+1,Math.min(mw,viewW()*k),1,'#e4e7d1');rect(mx+(player.x+bodyWidth()/2)*k-2,my+mh-9,4,9,'#f08bbf');
 const marks=buildings.filter(b=>b.landmark);if(marks.length)text(`LANDMARKS ${marks.filter(b=>b.hpNow<=0).length}/${marks.length}`,mx-12,my+15,9,'#f1dc96','right');}
function meters(){
 const bar=(x:number,width:number,value:number,max:number,label:string,color:string)=>{rect(x,466,width,5,'#263b3c');rect(x,466,width*Math.max(0,Math.min(1,value/max)),5,color);text(label,x,459,9,color);};
 bar(24,205,combat.hp,B.maxHP,`CRYSTAL / HP  ${Math.ceil(combat.hp)} / ${B.maxHP}`,'#f4a1d0');
 for(const threshold of B.up)rect(24+205*threshold/B.maxHP,463,1,10,'#fff0df');
 bar(280,190,combat.ultimate,B.ultimateMax,`[U] ${ultimateLabel()}${combat.ultimate>=B.ultimateMax?' · READY':''}`,'#c9ef83');
 bar(520,190,combat.superTime>0?combat.superTime:combat.superCharge,combat.superTime>0?B.superDuration:B.superMax,combat.superTime>0?`SUPER · ${Math.ceil(combat.superTime)}s`:combat.superCharge>=B.superMax?'[I] SUPER · READY':'[I] SUPER · OVERFLOW CRYSTALS','#b4c8fb');
 text(`DAMAGE PENALTY  −${Math.round(combat.penalty)}`,934,459,9,'#c5cabb','right');
 if(activeKaiju==='Tlézcatl'&&(jet||jetFuel<1)&&!combat.charging){const x=screenX(player.x+bodyWidth()/2),y=Math.max(84,screenY(player.y)-20);rect(x-28,y,56,5,'#293e3c');rect(x-28,y,56*jetFuel,5,jetLocked?'#8a5a4a':'#ff9a3c');text(jetLocked?'COOLING':'FLAME',x,y-6,8,jetLocked?'#d9b4a8':'#ffe2bf','center');}
 if(combat.charging){const x=screenX(player.x+bodyWidth()/2),y=Math.max(84,screenY(player.y)-20);rect(x-28,y,56,5,'#293e3c');rect(x-28,y,56*combat.charge/B.maxCharge,5,'#f8a0cc');text(combat.charge>=B.maxCharge?'MAX':'CHARGING',x,y-6,8,'#ffe6f1','center');}
}
// Layer 0: grounded vehicles in the far lane (behind the kaiju's feet). Layer 1: near lane, airborne and carried vehicles.
function drawVehicles(layer:0|1){for(const v of vehicles){const front=v.state==='flying'||v.state==='held'||v.lane===1;if(front!==(layer===1))continue;drawVehicle(v);}}
function drawVehicle(v:Vehicle){
 const x=v.x-camera;if(x<-90||x>viewW()+90)return;const off=v.state==='held'||upright(v)?0:VC.laneOffset[v.lane],w=v.w,h=v.h;
 if(v.state==='flat'&&v.kind==='building'){rect(x,C.ground-7,w,7,'#62625b');for(let j=0;j<w;j+=13)rect(x+j,C.ground-8-(j%7),10,8+j%7,'#898879');rect(x+w*.3,C.ground-12,w*.25,6,v.color);return;}
 if(v.state==='flat'){rect(x,C.ground+off-5,w,5,'#485858');rect(x+3,C.ground+off-7,w-8,3,v.color);return;}
 ctx.save();ctx.translate(Math.round(x+w/2),Math.round(v.y+h/2+off));ctx.rotate(v.angle);ctx.scale(v.state==='driving'?v.dir:1,v.state==='wreck'?.72:1);
 const L=-w/2,T=-h/2,glass='#b7d1c3',tire='#253839';
 if(v.kind==='lamp'){const pole='#44575a',glow='#e9d6a2';if(upright(v)){rect(-2,T+1,4,h-1,pole);rect(-12,T,24,5,pole);rect(-9,T+5,18,5,glow);rect(-4,T+h-6,8,6,'#33454a');}
  else{rect(L,-2,w,4,pole);rect(L+w-5,-12,5,24,pole);rect(L+w-10,-9,5,18,glow);rect(L,-4,6,8,'#33454a');}}
 else if(v.kind==='car'){rect(L,T+h*.38,w,h*.5,v.color);rect(L+w*.22,T,w*.55,h*.45,v.color);rect(L+w*.27,T+h*.12,w*.18,h*.3,glass);rect(L+w*.53,T+h*.12,w*.18,h*.3,glass);rect(L+w*.12,T+h*.72,w*.18,h*.3,tire);rect(L+w*.72,T+h*.72,w*.18,h*.3,tire);}
 else if(v.kind==='van'){rect(L,T,w*.76,h*.82,v.color);rect(L+w*.7,T+h*.3,w*.3,h*.52,v.color);rect(L+w*.78,T+h*.36,w*.16,h*.22,glass);rect(L+w*.06,T+h*.2,w*.6,h*.08,'#e8e2c8');rect(L+w*.1,T+h*.74,w*.16,h*.26,tire);rect(L+w*.7,T+h*.74,w*.16,h*.26,tire);}
 else if(v.kind==='patrol'||v.kind==='apc'||v.kind==='tank'||v.kind==='artillery'){ctx.translate(0,T);drawGroundUnit(v.kind,w,h);ctx.translate(0,-T);}
 else if(v.kind==='stand'){rect(L,T+h*.22,w,h*.78,v.color);rect(L-2,T+h*.1,w+4,h*.14,'#e8e2c8');for(let k=0;k<4;k++)rect(L-2+k*(w+4)/4,T+h*.1,(w+4)/8,h*.14,'#c4634f');rect(L+4,T+h*.34,w-8,h*.22,'#263e46');rect(L+6,T+h*.37,5,h*.16,'#e6c35c');rect(L+13,T+h*.37,5,h*.16,'#86b7c4');rect(L+20,T+h*.37,5,h*.16,'#e08a8a');}
 else if(v.kind==='building'){ctx.translate(0,h/2-C.ground);drawStructure({x:0,w,h,color:v.color,label:v.label,landmark:false,cache:false,hpNow:1,hp:1,holes:[]} as typeof buildings[number],L,h);ctx.translate(0,C.ground-h/2);}
 else if(v.kind==='barrier'){rect(L,T+h*.12,w,h*.88,'#8d8f86');rect(L-2,T,w+4,h*.14,'#a5a69c');for(let k=0;k<3;k++)rect(L+3+k*w/3,T+h*.4,w/6,h*.2,'#d9b45a');}
 else{rect(L,T,w,h*.84,v.color);rect(L,T+h*.56,w,h*.08,'#e8e2c8');for(let k=0;k<5;k++)rect(L+4+k*(w-8)/5,T+h*.14,(w-8)/5-3,h*.3,glass);rect(L+w*.1,T+h*.76,w*.12,h*.24,tire);rect(L+w*.76,T+h*.76,w*.12,h*.24,tire);}
 if(v.state==='wreck'){ctx.globalAlpha=.38;rect(L,T,w,h,'#1c2629');ctx.globalAlpha=1;rect(L+w*.35,T+h*.1,3,h*.6,'#2b3538');}
 ctx.restore();
 if(v.state==='wreck'&&v.rewarded&&v.kind!=='lamp')for(let n=0;n<2;n++)rect(x+w*.5+Math.sin(time*3+n+v.id)*3,v.y-6-n*9-(time*9+v.id)%9,4+n*2,5,'#6d7970');
}
function drawPopulation(){
 for(const c of population.civilians){if(c.escaped)continue;const x=c.x-camera;if(x<-20||x>viewW()+20)continue;
 if(c.squashed){rect(x,C.ground-1,5,1,'#646d5c');continue;}
 const sway=Math.sin(time*16+c.x)*1;rect(x,C.ground-9,3,3,['#e7b691','#a87562','#d2b28c'][c.variant]);rect(x,C.ground-6,3,4,['#d1cb9d','#9c7884','#71a7a9'][c.variant]);rect(x-1+sway,C.ground-2,2,2,'#3b4e4c');rect(x+2-sway,C.ground-2,2,2,'#3b4e4c');}
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
function drawMilitary(layer:0|1){
 const front=(lane:0|1|null)=>lane===1;
 for(const wreck of military.wrecks){const x=wreck.x-camera;if(x<-100||x>viewW()+40||front(wreck.lane)!==(layer===1))continue;ctx.save();ctx.translate(0,wreck.lane===null||wreck.air?0:VC.laneOffset[wreck.lane]);rect(x,wreck.y+wreck.h*.65,wreck.w,wreck.h*.35,'#3c4945');rect(x+8,wreck.y+wreck.h*.5,wreck.w*.6,6,'#677165');for(let j=0;j<3;j++)rect(x+wreck.w*.5+Math.sin(time+j)*4,wreck.y-8-j*12-(time*12%12),7+j*3,8,'#718077');ctx.restore();}
 for(const u of military.units){const lane=roadLane(u);if(u.hp<=0||u.x+u.w<camera-100||u.x>camera+viewW()+100||front(lane)!==(layer===1))continue;const x=u.x-camera,y=u.y+(lane===null?0:VC.laneOffset[lane]),d=UNITS[u.type];
 ctx.save();ctx.translate(Math.round(x+u.w/2),Math.round(y));ctx.scale(u.face,1);
 if(u.type==='police'||u.type==='soldier'){
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
 }
 if(layer===1)return;
 for(const p of military.projectiles){if(p.dead)continue;const x=p.x-camera,y=p.y;
 if(p.weapon==='bomb'||p.weapon==='artillery'){
 const wx=p.targetX-camera,r=p.radius;ctx.strokeStyle='#cf685c';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(wx,C.ground-2,r,6,0,0,Math.PI*2);ctx.stroke();rect(wx-7,C.ground-3,14,2,'#e7886d');rect(wx-1,C.ground-9,2,13,'#e7886d');text('!',wx,C.ground-16,12,'#b84c48','center');
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
 if(objective&&!objective.shattered){const x=objective.x-camera;poly([[x-38,C.ground],[x-28,C.ground-64],[x-10,C.ground-40],[x+2,C.ground-110],[x+30,C.ground-74],[x+40,C.ground]],'#c96ea8');poly([[x-5,C.ground-8],[x+2,C.ground-98],[x+17,C.ground-56]],'#ffd0ed');text('CENTRAL CRYSTAL',x,C.ground-126,10,'#3b504a','center');}
 if(rival&&!rival.dead){const r=rival,x=r.x-camera;const tint=CITIES[cityIndex].colors[1];
 ctx.save();ctx.translate(Math.round(x+r.w/2),Math.round(r.y+r.h+C.spriteDrop));ctx.scale(r.face,1);
 poly([[-36,-16],[-46,-50],[-28,-42],[-32,-82],[-14,-74],[-7,-106],[12,-88],[28,-70],[38,-55],[35,-22]],tint);rect(-25,-75,50,62,'#4e5e59');rect(8,-74,35,27,tint);rect(27,-66,6,4,'#f1a8d4');rect(-26,-14,19,14,'#314b43');rect(10,-14,23,14,'#314b43');if(r.windup>0){rect(12,-48,35,12,'#f2b077');text('!',0,-123,20,'#f0a569','center');}ctx.restore();
 text(bossName().toUpperCase(),x+r.w/2,r.y-15,11,'#324c44','center');
 for(const shot of r.shots){const sx=shot.x-camera;poly([[sx-10,shot.y],[sx-3,shot.y-6],[sx+9,shot.y],[sx+2,shot.y+6]],'#d694bf');}
 }
}
// Flame Jet: flickering octagons marched along the cone, dark red outside to a white-hot core, ragged at the tip.
function drawJet(){const j=jet;if(!j||j.phase!=='on'||j.len<=0)return;
 const g=Math.sqrt(scale(combat)),[w0,w1]=B.jetWidth,R=B.jetRange*g,nx=-j.dy,ny=j.dx;
 for(const [k,col] of [[1,'#a8281a'],[.78,'#ec5a17'],[.52,'#ffae2e'],[.26,'#fff2c0']] as [number,string][])
  for(let d=0;d<=j.len;d+=5){const f=Math.min(1,d/R),tip=Math.min(1,(j.len-d)/(14*g)+.35),wob=Math.sin(time*47+d*.37+k*9),full=(w0+(w1-w0)*f)*g,r=full*k*tip*(.82+.18*Math.sin(time*61+d*.23));
   if(r<1)continue;const [px,py]=jetPoint(j,d,full),bent=d>=j.bend,x=px+(bent?0:nx*wob*r*.3)-camera,y=py+(bent?-Math.abs(wob)*r*.25:ny*wob*r*.3),q=r*.41;
   poly([[x-q,y-r],[x+q,y-r],[x+r,y-q],[x+r,y+q],[x+q,y+r],[x-q,y+r],[x-r,y+q],[x-r,y-q]],col);}}
// Eruption: while charging, a pulsing glow round him that swells and flickers faster as the pressure builds; then the explosion, a
// fireball filling the blast circle (layered polygons, white core to dark rim) with a shock ring racing just ahead of it, then fading.
function disc(x:number,y:number,r:number,col:string,n=20){const pts:number[][]=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}poly(pts,col);}
// The charge shudders him in place, harder as the pressure builds.
function eruptionShudder(){const e=eruption;if(!e||e.blasted)return 0;const p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.eruptCharge);return Math.round(Math.sin(time*70)*p*2.2);}
function drawEruptionGlow(){const e=eruption;if(!e||e.blasted)return;const w=bodyWidth(),h=bodyHeight(),{x,y,g}=eruptionCore(w,h),p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.eruptCharge),pulse=.5+.5*Math.sin(time*(8+30*p));
 const r=(36+64*p+10*pulse)*g,sx=x-camera,sy=Math.min(C.ground-r*.2,y+h*.2);
 disc(sx,sy,r*1.3,`rgba(232,64,26,${(.18+.25*p*pulse).toFixed(3)})`);disc(sx,sy,r,`rgba(255,138,31,${(.22+.35*p*pulse).toFixed(3)})`);disc(sx,sy,r*.55,`rgba(255,226,140,${(.2+.5*p*pulse).toFixed(3)})`);}
// Over the body: the hide itself glows hotter as the pressure builds.
function drawEruptionHeat(){const e=eruption;if(!e||e.blasted)return;const w=bodyWidth(),h=bodyHeight(),{x,y,g}=eruptionCore(w,h),p=Math.min(1,(B.ultimateDuration-combat.ultimateTime)/B.eruptCharge),pulse=.5+.5*Math.sin(time*(8+30*p));
 disc(x-camera,Math.min(C.ground-8,y+h*.25),(26+14*p)*g,`rgba(255,200,90,${(.12+.3*p*pulse).toFixed(3)})`);}
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
 ctx.clearRect(0,0,960,540);ctx.save();if(display.shake&&shake>0)ctx.translate(Math.round(Math.sin(time*63)*shake),Math.round(Math.cos(time*77)*shake*.5));
 rect(0,0,960,540,CITIES[cityIndex].sky);ctx.save();ctx.translate(0,C.ground);ctx.scale(zoom,zoom);ctx.translate(0,-C.ground+cameraY);background();for(const b of buildings)if(b.topple===2)drawFallen(b);for(const b of buildings)if(b.topple!==1)drawBuilding(b);for(const b of buildings)if(b.topple===1)drawBuilding(b);for(const c of chunks){const cx=c.x-camera;if(cx<-20||cx>viewW()+20)continue;ctx.globalAlpha=Math.min(1,c.life/.5);rect(cx,c.y,c.s,c.s,c.color);rect(cx,c.y+c.s-1,c.s,1,'#26343a');ctx.globalAlpha=1;}drawVehicles(0);drawPopulation();drawMilitary(0);drawCampaignObjective();
 const exitX=worldWidth-65-camera;
 rect(exitX,C.ground-90,5,90,objectiveOpen()?'#c7ee83':'#6a7d75');
 if(objectiveOpen()){poly([[exitX-20,358],[exitX+6,358],[exitX+6,348],[exitX+27,365],[exitX+6,382],[exitX+6,372],[exitX-20,372]],'#c7ee83');text('EXIT',exitX,342,10,'#213d35','center');}
 if(openLayout()){const wx=60-camera;rect(wx,C.ground-90,5,90,objectiveOpen()?'#c7ee83':'#6a7d75');if(objectiveOpen()){poly([[wx+25,358],[wx-1,358],[wx-1,348],[wx-22,365],[wx-1,382],[wx-1,372],[wx+25,372]],'#c7ee83');text('EXIT',wx+3,342,10,'#213d35','center');}}
 for(const g of growths){const x=g.x-camera;poly([[x-22,C.ground],[x-16,C.ground-40],[x-5,C.ground-24],[x+3,C.ground-62],[x+16,C.ground-40],[x+22,C.ground]],'#cf77b4');poly([[x-4,C.ground-5],[x+3,C.ground-55],[x+10,C.ground-34]],'#ffbedf');text('CRYSTAL',x,C.ground-72,8,'#334b43','center');}
 for(const shard of shards){const x=shard.x-camera,y=shard.y+Math.sin(time*3+shard.x)*2;poly([[x,y-8],[x+5,y],[x,y+6],[x-5,y]],'#ffc1e3');rect(x-1,y-5,2,6,'#fff1f6');}
 // Lava pools: a glowing puddle on the street, flickering and shrinking toward the middle as it cools.
 for(const p of pools){const f=Math.min(1,p.life/p.max*2.2),w=p.w*(.6+.4*f),x=p.x+(p.w-w)/2-camera,fl=Math.sin(time*18+p.x)>0;
  rect(x-3,C.ground-3,w+6,5,'#3a1a14');rect(x,C.ground-4,w,4,f>.5?'#e8401a':'#a8341c');rect(x+w*.15,C.ground-4,w*.7,2,fl?'#ffb13b':'#ff8a1f');
  if(f>.4)rect(x+w*.35,C.ground-5,w*.3,2,'#ffe08a');}
 for(const wave of waves){const x=wave.x-camera;
  if(wave.ult){poly([[x-26,C.ground],[x-17,C.ground-10],[x-6,C.ground-6],[x+2,C.ground-42],[x+10,C.ground-9],[x+23,C.ground]],'#ed9bc9');rect(x-16,C.ground,38,3,'#ffe2f1');continue;}
  // Tremor: a jagged earth crest leaning the way it rolls with rock slabs jutting from it, a glowing fissure under it and a
  // cracked trail behind, shrinking as it dies out.
  const d=Math.sign(wave.vx)||1,z=wave.size*(.55+.45*Math.min(1,wave.life/wave.max*1.6)),j=Math.sin(time*40+wave.x)*3*z;
  rect(Math.min(x-d*90*z,x-d*10*z),C.ground,80*z,2,'#4a3a2e');rect(Math.min(x-d*40*z,x+d*40*z),C.ground-1,80*z,3,'#ffb35c');
  poly([[x-d*36*z,C.ground],[x-d*24*z,C.ground-18*z],[x-d*12*z,C.ground-12*z],[x+d*2*z,C.ground-(52*z+j)],[x+d*14*z,C.ground-20*z],[x+d*22*z,C.ground-30*z+j],[x+d*34*z,C.ground]],'#7d6250');
  poly([[x-d*16*z,C.ground],[x-d*6*z,C.ground-16*z],[x+d*3*z,C.ground-(40*z+j)],[x+d*12*z,C.ground-16*z],[x+d*20*z,C.ground]],'#c9a77c');
  poly([[x-d*26*z,C.ground-2],[x-d*20*z,C.ground-(30*z-j)],[x-d*14*z,C.ground-4]],'#a88866');
  rect(x+d*6*z-3*z,C.ground-(62*z+j*2),6*z,6*z,'#c9a77c');rect(x-d*8*z-2*z,C.ground-(48*z-j*2),4*z,4*z,'#8d7a66');
  rect(Math.min(x,x+d*40*z),C.ground,40*z,3,'#ffe0a8');}
 if(combat.superTime>0){const x=player.x-camera;rect(x-7,player.y-7,bodyWidth()+14,bodyHeight()+10,Math.sin(time*10)>0?'#c47cab':'#8d799e');}
 drawEruptionGlow();monster(player.x-camera+eruptionShudder(),player.y,player.face,player.crouched,player.pose);drawEruptionHeat();drawJet();drawEruption();drawVehicles(1);drawMilitary(1);
 if(combat.transform>0){const x=player.x-camera+bodyWidth()/2,y=player.y+bodyHeight()/2;const radius=bodyHeight()*.75;poly([[x,y-radius],[x+radius*.6,y],[x,y+radius],[x-radius*.6,y]],'#f4b0d8');poly([[x,y-radius*.85],[x+radius*.35,y],[x,y+radius*.8],[x-radius*.35,y]],'#ffe0f1');}
 if(combat.ultimateTime>0)text(ultimateLabel(),player.x-camera+bodyWidth()/2,player.y-24,10,'#fff1d8','center');
 // Launched tail quill: bone-white spike pointing along its flight, dark base, faint motion streak.
 // Debris Shotgun rocks: tumbling slabs of street with a dark rim.
 for(const r of rocks){rect(r.x-camera-Math.sign(r.vx)*r.size*2.2-r.size*.6,r.y-r.size*.3-r.vy*.012,r.size*1.2,r.size*.6,'#c9a77c66');const sx=r.x-camera,z=r.size,c=Math.cos(r.spin),n=Math.sin(r.spin),pts=[[-1,-.6],[.7,-1],[1,.4],[-.3,.85]],at=(k:number)=>pts.map(([px,py])=>[sx+(px*c-py*n)*z*k,r.y+(px*n+py*c)*z*k]);poly(at(1.3),'#3b2f28');poly(at(1),'#9a8670');}
 // Magma Dive globs: a dark crust round a molten core with a short trailing streak.
 for(const g of globs){const sx=g.x-camera,z=g.size;rect(sx-g.vx*.03-z*.5,g.y-g.vy*.03-z*.5,z,z,'#ff8a1f66');rect(sx-z,g.y-z,z*2,z*2,'#5a1d12');rect(sx-z*.7,g.y-z*.7,z*1.4,z*1.4,'#ff6a1a');rect(sx-z*.35,g.y-z*.45,z*.7,z*.6,'#ffd34d');}
 for(const s of shots){const sx=s.x-camera,d=Math.sign(s.vx)||1;rect(Math.min(sx-26*d,sx-14*d),s.y-1,12,2,'#efe2ba55');poly([[sx+16*d,s.y],[sx-4*d,s.y-3],[sx-14*d,s.y-2],[sx-14*d,s.y+2],[sx-4*d,s.y+3]],'#efe2ba');poly([[sx-14*d,s.y-2],[sx-9*d,s.y-2.5],[sx-9*d,s.y+2.5],[sx-14*d,s.y+2]],'#6a2f45');}
 for(const p of particles)rect(p.x-camera,p.y,p.size,p.size,p.color);
 ctx.restore();ctx.restore();if(eruption?.blasted){rect(0,0,960,540,`rgba(255,80,20,${(.16+.04*Math.sin(time*9)).toFixed(3)})`);if(eruption.flash>0)rect(0,0,960,540,`rgba(255,236,190,${(eruption.flash*1.1).toFixed(3)})`);}hud();
}
// The clock starts on the first animation frame (dt 0), not at script load: load time otherwise leaked into the first step,
// making runs nondeterministic. The clamp still guards against a timestamp going backwards.
let last=-1;function frame(now:number){if(last<0)last=now;const dt=Math.max(0,Math.min((now-last)/1000,C.maxDelta));last=now;update(dt);render();requestAnimationFrame(frame);}title();requestAnimationFrame(frame);
// Read-only inspection hook for smoke tests; no gameplay mutations.
loadPresentationArt();window.addEventListener('resize',applyDisplay);applyDisplay();
Object.defineProperty(window,'kaijuDebug',{get:()=>({cameraY,zoom,camera,mode,clinging:!!clingTo,running,diving:!!dive,rolling:!!roll,anim:currentAnim()[0],face:player.face,grounded:player.grounded,vy:player.vy,cooldown:combat.cooldown,rangedCooldown:combat.rangedCooldown,canAct:canAct(combat),blockKind:block.kind,cityScore:Math.round(cityScore()),banked:run?.banked??0,buildings:buildings.map(b=>({x:b.x,y:C.ground-b.h,w:b.w,h:b.h,hp:b.hpNow,kind:b.kind,landmark:!!b.landmark,cache:!!b.cache,topple:b.topple,tiltDir:b.tiltDir,holes:b.holes.length,lifted:b.lifted})),hitstop,chunks:chunks.length,held:held?held.kind:null,vehicles:vehicles.map(v=>({id:v.id,kind:v.kind,state:v.state,x:v.x,y:v.y,w:v.w,h:v.h,angle:v.angle,traffic:v.traffic,dir:v.dir,panic:v.panic})),rival:rival?{x:rival.x,y:rival.y,w:rival.w,h:rival.h,hp:rival.hp,windup:rival.windup,attack:rival.attack}:null,entityCounts:{units:military.units.length,enemyShots:military.projectiles.length,effects:military.effects.length,wrecks:military.wrecks.length,waves:waves.length,tremorWaves:waves.filter(w=>!w.ult).length,shards:shards.length,particles:particles.length,civilians:population.civilians.length,growths:growths.length,playerShots:shots.length,rocks:rocks.length,lavaGlobs:globs.length,lavaPools:pools.length},stampeding:!!stampede?.charging,erupting:!!eruption?.blasted,eruptGlobs:globs.filter(g=>g.ult).length,eruptPools:pools.filter(p=>p.ult).length,eruptPoolX:pools.filter(p=>p.ult).map(p=>p.x+p.w/2),eruptSpat:eruption?.spat??0,eruptLandings:[...eruptLandings],jet:jet?jet.phase:null,jetFuel,jetLocked,jetAngle:jet?.angle??0,jetLen:jet?.len??0,activeKaiju,selectedKaiju,introCount,introElapsed,gallery:[...permanent.gallery],freeChoice:{...freeChoice},score:netScore(),destruction:destruction(buildings),exitOpen:objectiveOpen(),x:player.x,y:player.y,crouched:player.crouched,buildingHP:buildings.map(b=>b.hpNow),particleCount:particles.length,shotCount:shots.length,shotY:shots.map(s=>s.y),stage:combat.stage,hp:combat.hp,ultimate:combat.ultimate,ultimateTime:combat.ultimateTime,superCharge:combat.superCharge,superTime:combat.superTime,transform:combat.transform,width:bodyWidth(),height:bodyHeight(),charging:combat.charging,charge:combat.charge,combo:combat.combo,shards:shards.length,growths:growths.length,session,cityIndex,blockIndex,worldWidth,objectiveHP:objective?.hp??null,bossHP:rival?.hp??null,checkpoint:checkpoint?{...checkpoint}:null,highScores:permanent.scores.map(r=>({...r})),military:military.units.map(u=>({type:u.type,x:u.x,y:u.y,w:u.w,h:u.h,hp:u.hp})),enemyShots:military.projectiles.length,damageTaken:combat.damageTaken,civilians:population.civilians.filter(c=>!c.squashed&&!c.escaped).length,cars:vehicles.filter(v=>v.state!=='flat').length})});
