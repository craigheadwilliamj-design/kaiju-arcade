import {CONFIG as C,COMBAT as B,MILITARY as M,CAMPAIGN as P} from './config.ts';
import {NEW_YORK_BLOCK_ONE,CITIES,LEVELS,levelWidth} from './levels.ts';
import {createBuildings,damageBuilding,destruction,exitUnlocked,perfectBonus,solid,overlaps,canExitBlock,damageObjective,separateHorizontal} from './rules.ts';
import {createCombat,canAct,scale,damageMultiplier,collectCrystal,creditDamage,tickCombat,light,beginHeavy,releaseHeavy,ranged,activateUltimate,activateSuper,cancelCharge,receiveHit} from './combat.ts';
import type {Strike} from './combat.ts';
import {createMilitary,tickMilitary,spawnUnit,hitUnit,intercept,segmentHits,UNITS,WEAPONS} from './military.ts';
import type {Rect,Unit} from './military.ts';
import {createPopulation,releaseOccupants,tickPopulation,crushCar,carBox} from './population.ts';
import {readSaves,savePermanent,saveCheckpoint,newRun,resumeRun,checkpointOf,restartCity,latchBlock,nextBlock,conquerCity,advanceCity,loseRun,initialsValid,KAIJU} from './campaign.ts';
import type {Run,Checkpoint,StorageLike} from './campaign.ts';
import {createRival,hitRival,tickRival} from './rival.ts';
import type {Rival} from './rival.ts';
import {ROSTER,ENDINGS,INTRO_DURATION,INTRO_SCENES,introScene,selectable,validFreePlay,canViewEnding,endingFor,loadPresentationArt,hasSprite,hasAnim,animDuration,animImpact,drawSilhouette,drawMenuBackdrop,drawIntro,drawEnding} from './presentation.ts';
import type {FreePlayChoice} from './presentation.ts';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
const overlay=document.querySelector<HTMLDivElement>('#overlay')!;
type Mode='title'|'playing'|'paused'|'confirm'|'results'|'gameover'|'setup'|'progress'|'scores'|'conquered'|'intro'|'selection'|'freeplay-select'|'gallery'|'ending'|'settings';
let mode:Mode='title',buildings=createBuildings(NEW_YORK_BLOCK_ONE),score=0,camera=0,cameraY=0,time=0,shake=0,cleared=false,action='',actionTime=0;
const keys=new Set<string>();
let storage:StorageLike|undefined;try{storage=window.localStorage;}catch{}
let {permanent,checkpoint,available:storageOK}=readSaves(storage);
let run:Run|null=null,session:'campaign'|'drill'|'freeplay'='drill',citySettled=false;
let activeKaiju='Mogurodon',selectedKaiju='Mogurodon',pendingInitials='AAA',freeBlockStart=0;
let freeChoice:FreePlayChoice={kaiju:'Mogurodon',city:0,boss:'Mogurodon'};
let introElapsed=0,introCount=0,introIndex=-1,endingName='Mogurodon',endingSource:'gallery'|'completion'='gallery';
function bossName(){return session==='freeplay'?freeChoice.boss:CITIES[cityIndex].boss;}
function ultimateLabel(){return activeKaiju==='Mogurodon'?'SEISMIC RUPTURE':'ULTIMATE PREVIEW';}
const DISPLAY_KEY='kaiju-arcade:display:v1';let display={integer:false,shake:true};
try{const saved=JSON.parse(storage?.getItem(DISPLAY_KEY)||'null');if(saved?.version===1)display={integer:!!saved.integer,shake:saved.shake!==false};}catch{}
function applyDisplay(){const frame=document.querySelector<HTMLElement>('#frame')!;if(display.integer){const space=Math.max(0,Math.min(1160,(window.innerWidth||960)-40)),factor=Math.floor(space/960);frame.style.width=factor>=1?`${960*factor}px`:'';}else frame.style.width='';}
function saveDisplay(){try{storage?.setItem(DISPLAY_KEY,JSON.stringify({version:1,...display}));}catch{}applyDisplay();}
let cityIndex=0,blockIndex=0,block=LEVELS[0][0],worldWidth=levelWidth(block);
let objective:{x:number,hp:number,maxHP:number,shattered:boolean}|null=null,rival:Rival|null=null;
function cityScore(){return score-combat.penalty;}
function objectiveOpen(){return canExitBlock(block.kind,buildings,objective);}
function persist(){storageOK=savePermanent(storage,permanent)&&storageOK;}
function writeCheckpoint(c:Checkpoint|null){checkpoint=c;storageOK=saveCheckpoint(storage,c)&&storageOK;}

let selectedTier=1,military=createMilitary(),population=createPopulation();
let combat=createCombat(),ambientTimer=0,growthTimer=0,ultimateTimer=0;
let shards:{x:number,y:number,vx:number,vy:number,life:number}[]=[],growths:{x:number,hp:number}[]=[],waves:{x:number,vx:number,life:number,damage:number,hits:Set<object>}[]=[];
function bodyWidth(){return C.playerWidth*scale(combat);}
function bodyHeight(){return (player.crouched?C.crouchHeight:C.playerHeight)*scale(combat);}
let oldWidth=C.playerWidth,oldHeight=C.playerHeight;
function netScore(){return Math.round((run?.banked||0)+(citySettled?0:cityScore()));}
let walking=false;
// Light combo hits 1/2/3 each play a one-shot strip; heavy/ranged cancel it.
const LIGHT_ANIMS=['swipeRight','swipeLeft','bite'];let attack:{anim:string,t:number}|null=null;
// Idle/walk loops restart at frame 0 whenever they begin (attacks start and end on idle frame 0).
let loopAnim='idle',loopT=0;
// Holding heavy: rear back once, then loop the hold pose until release triggers heavySlam.
let heavyT=0;
// Crouch: entering plays crouchDown, leaving plays crouchUp, before the next loop starts. Crouch-native art is not squashed.
const CROUCH_ANIMS=['crouch','crouchDown','rangedCrouch'];let loopIntro:string|null=null;
// Airborne: jumpRise (only when launched upward) into the jumpAir loop; touching down plays jumpLand.
// Climbing: W grabs a wall, then W/S move up/down and the player hangs in place when neither is held. Space jumps off.
// climbGrab into the climb loop, climbMantle on reaching the roof; reaching the street on S just returns to idle.
// `grabLock` stops W+Space from instantly re-grabbing the wall you just jumped off (cleared when W is released).
let isClimbing=false,clingTo:ReturnType<typeof createBuildings>[number]|null=null,grabLock=false,climbDir=0,mantled=false;
function currentAnim():[string,number]{
 if(attack)return [attack.anim,attack.t];
 if(combat.ultimateTime>0&&hasAnim(activeKaiju,'ultRoar',combat.stage)){const el=B.ultimateDuration-combat.ultimateTime,roar=animDuration(activeKaiju,'ultRoar',combat.stage);return el<roar?['ultRoar',el]:['ultPound',el-roar];}
 if(combat.charging){const rear=animDuration(activeKaiju,'heavyRear',combat.stage);return heavyT<rear?['heavyRear',heavyT]:['heavyHold',heavyT-rear];}
 const intro=loopIntro?animDuration(activeKaiju,loopIntro,combat.stage):0;
 return loopIntro&&loopT<intro?[loopIntro,loopT]:[loopAnim,loopT-intro];
}
let player={x:110,y:C.ground-C.playerHeight,vy:0,face:1,grounded:true,crouched:false,cooldown:0,pose:0};
type Particle={x:number,y:number,vx:number,vy:number,life:number,color:string,size:number};
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
 block=LEVELS[cityIndex][blockIndex];worldWidth=levelWidth(block);time=0;actionTime=0;military=createMilitary(drill?selectedTier:blockIndex+1,cityIndex);population=createPopulation(Math.random,block.street,block.cars);buildings=createBuildings(block.buildings);camera=0;cameraY=0;cleared=false;particles=[];shots=[];keys.clear();shards=[];growths=[];waves=[];ambientTimer=0;growthTimer=0;ultimateTimer=0;
 cancelCharge(combat);combat.cooldown=0;combat.rangedCooldown=0;combat.combo=0;combat.comboWindow=0;attack=null;combat.stagger=0;combat.staggerGuard=0;combat.knockback=0;
 clingTo=null;grabLock=false;isClimbing=false;climbDir=0;oldWidth=bodyWidth();oldHeight=C.playerHeight*scale(combat);player={x:110,y:C.ground-oldHeight,vy:0,face:1,grounded:true,crouched:false,cooldown:0,pose:0};
 objective=!drill&&block.kind==='stronghold'?{x:worldWidth/2,hp:P.strongholdHP,maxHP:P.strongholdHP,shattered:false}:null;
 rival=!drill&&block.kind==='boss'?createRival(worldWidth,cityIndex):null;
 if(objective){for(const [type,offset] of [['tank',-390],['emplacement',-180],['emplacement',210],['artillery',510],['helicopter',-650]] as const)spawnUnit(military,type,objective.x+offset);}
 mode='playing';overlay.innerHTML='';focus();
}
function pause(){if(mode!=='playing')return;mode='paused';keys.clear();cancelCharge(combat);panel(`<div class="eyebrow">${session==='campaign'?'CAMPAIGN':session==='freeplay'?'FREE PLAY':'DRILL'} PAUSED</div><h1>PAUSED</h1><p>${session==='campaign'?`${CITIES[cityIndex].name} · Block ${blockIndex+1}<br>Restart resets the entire city and its score.`:session==='freeplay'?`${CITIES[cityIndex].name} · Block ${blockIndex+1}<br>Free Play has no campaign score or save.`:'Your drill progress is paused.'}</p><button class="primary" id="resume">RESUME</button><button id="restart">${session==='drill'?'RESTART DRILL':'RESTART CITY'}</button><button id="menu">QUIT TO MENU</button>`);
 document.querySelector('#resume')!.addEventListener('click',resume);document.querySelector('#restart')!.addEventListener('click',()=>confirmAction(session!=='drill'?'Restart this city at Block 1? Current city score and meters will reset.':'Restart the drill? Its score and progress will reset.',()=>{if(session==='campaign'&&run){restartCity(run);blockIndex=0;score=0;combat=createCombat();citySettled=false;loadBlock();}else if(session==='freeplay')startFreePlay();else start();},pauseAgain));
 document.querySelector('#menu')!.addEventListener('click',()=>confirmAction(session==='campaign'?`Quit? All progress in ${CITIES[cityIndex].name} will be lost. Continue resumes at Block 1. Earlier city scores remain saved.`:session==='freeplay'?'Leave Free Play? This city session is not saved. Campaign progress is unaffected.':'Leave the drill? Its score and progress will be lost.',title,pauseAgain));
}
function pauseAgain(){mode='playing';pause();}
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
function hit(b:typeof buildings[number],damage:number,fromUltimate=false){const r=damageBuilding(b,damage);if(!r.damage)return;releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);score+=r.points;creditDamage(combat,r.damage,'player',fromUltimate);if(r.destroyed)dropShards(b.x+b.w/2,B.buildingShards);burst(b.x+b.w/2,C.ground-Math.min(b.h,60),'#e8d8ab',r.destroyed?23:7);shake=r.destroyed?5:2;action=r.destroyed?'STRUCTURE COLLAPSED':`IMPACT −${Math.round(r.damage)}`;actionTime=1.2;}
function hitGrowth(g:typeof growths[number],damage:number){if(g.hp<=0)return;g.hp=Math.max(0,g.hp-damage);burst(g.x,C.ground-30,'#f291ca',8);if(g.hp===0){dropShards(g.x,B.growthShards);action='CRYSTAL GROWTH SHATTERED';actionTime=1.5;}}
function hitObjective(damage:number){if(!objective||objective.shattered)return;const shards=damageObjective(objective,damage,P.strongholdShards);burst(objective.x,C.ground-60,'#f4a1d0',8);if(shards){dropShards(objective.x,shards);shake=9;action='STRONGHOLD CRYSTAL SHATTERED';actionTime=2;}}
function strikeRival(damage:number,strength=0,direction=1,ultimate=false){if(!rival||combat.dead)return;const actual=hitRival(rival,damage,'player',strength,direction);if(actual){score+=actual*P.bossDamagePoints;creditDamage(combat,actual,'player',ultimate);burst(rival.x+rival.w/2,rival.y+40,'#f3a9d0',8);} }
function performStrike(strike:Strike|null){
 if(!strike||mode!=='playing')return;
 const {kind,damage}=strike;player.pose=kind==='heavy'?.3:.18;
 attack=kind==='light'?{anim:LIGHT_ANIMS[strike.combo-1],t:0}:kind==='heavy'?{anim:'heavySlam',t:0}:{anim:player.crouched?'rangedCrouch':'rangedStand',t:0};
 const w=bodyWidth(),h=bodyHeight(),y=player.y+h*.45;
 if(kind==='ranged'){if(shots.length<B.rangedMax)shots.push({x:player.x+w/2+player.face*w*.52,y,vx:player.face*C.projectileSpeed,life:1.8,damage,knockback:strike.knockback});return;}
 const reach=(C.meleeReach+(kind==='heavy'?20:0))*scale(combat);
 const box={x:player.face===1?player.x+w-10:player.x-reach+10,y:player.y-8,w:reach,h:h+16};
 if(objective&&!objective.shattered&&overlaps(box,{x:objective.x-30,y:C.ground-100,w:60,h:100}))hitObjective(damage);
 if(rival&&!rival.dead&&overlaps(box,rival)){strikeRival(damage,strike.knockback,player.face);if(rival.dead)return;}
 for(const u of military.units)if(u.hp>0&&overlaps(box,u))hitUnit(military,u,damage,'player',strike.knockback,player.face);
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-7,y:p.y-7,w:14,h:14}))intercept(military,p);
 for(const car of population.cars)if(!car.crushed&&overlaps(box,carBox(car)))destroyCar(car);
 for(const b of buildings)if(b.hpNow>0&&overlaps(box,{x:b.x,y:C.ground-b.h,w:b.w,h:b.h}))hit(b,damage);
 for(const g of growths)if(g.hp>0&&overlaps(box,{x:g.x-20,y:C.ground-55,w:40,h:55}))hitGrowth(g,damage);
 burst(player.x+w/2+player.face*reach*.8,y,kind==='heavy'?'#f2a8cb':'#d7f396',strike.combo===3?12:5);
 if(kind==='light'){action=`LIGHT COMBO ${strike.combo} / 3`;actionTime=.5;}
 if(kind==='heavy'){shake=strike.charge>B.maxCharge*.8?7:3;action=strike.charge>B.maxCharge*.8?'CHARGED HEAVY': 'HEAVY IMPACT';actionTime=.7;}
}
function destroyCar(car:typeof population.cars[number],fromUltimate=false,playerCaused=true){const reward=crushCar(car);if(!reward)return;if(!playerCaused){burst(car.x+16,C.ground-8,'#b5aa8e',5);return;}score+=reward;creditDamage(combat,M.carHP,'player',fromUltimate);dropShards(car.x+16,M.carShards);burst(car.x+16,C.ground-8,'#e6b983',8);}
function drainMilitary(){for(const e of military.events){if(e.kind==='reward'){score+=e.points;creditDamage(combat,e.damage,'player',e.ultimate);if(e.shards)dropShards(e.x,e.shards);}else if(e.kind==='playerHit'){const actual=receiveHit(combat,e.damage,'military',e.strength,e.direction);if(actual>0){shake=Math.max(shake,e.strength>0?6:1);burst(player.x+bodyWidth()/2,player.y+bodyHeight()/2,'#f197b8',4);}}else burst(e.x,e.y,'#f6dba1',3);}military.events=[];}
// First fissure waits for the roar's crash-down so the waves come out of the slam.
function useUltimate(){if(!activateUltimate(combat))return;attack=null;ultimateTimer=animImpact(activeKaiju,'ultRoar',combat.stage);player.pose=.5;action=ultimateLabel();actionTime=2.4;shake=8;}
function useSuper(){if(activateSuper(combat)){action='SUPER FORM';actionTime=2;burst(player.x+bodyWidth()/2,player.y,'#f7a2d3',35);}}
function solidBodies(){return [...buildings.filter(solid).map(b=>({x:b.x,y:C.ground-b.h,w:b.w,h:b.h})),...(rival&&!rival.dead?[rival]:[])];}
function syncBody(){
 const w=bodyWidth(),h=bodyHeight();if(w!==oldWidth||h!==oldHeight){player.x-=(w-oldWidth)/2;player.y-=h-oldHeight;
 player.x=separateHorizontal({x:player.x,y:player.y,w,h},solidBodies(),worldWidth);oldWidth=w;oldHeight=h;}
}
window.addEventListener('keydown',e=>{
 if(mode==='intro'){e.preventDefault();if(!e.repeat)finishIntro();return;}
 if(['INPUT','SELECT'].includes((e.target as HTMLElement)?.tagName))return;
 const k=e.code;if(['Space','KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyU','KeyI','Escape'].includes(k))e.preventDefault();
 if(k==='Escape'&&!e.repeat){if(mode==='playing')pause();else if(mode==='paused')resume();return;}
 if(mode!=='playing')return;keys.add(k);if(e.repeat)return;
 if(k==='Space'&&clingTo&&canAct(combat)&&!combat.charging){clingTo=null;grabLock=true;player.vy=-C.jumpVelocity;player.grounded=false;}
 else if(k==='Space'&&player.grounded&&!keys.has('KeyS')&&canAct(combat)&&!combat.charging){player.vy=-C.jumpVelocity;player.grounded=false;}
 if(k==='KeyJ')performStrike(light(combat));if(k==='KeyK')beginHeavy(combat);if(k==='KeyL')performStrike(ranged(combat));if(k==='KeyU')useUltimate();if(k==='KeyI')useSuper();
});window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyK'&&mode==='playing')performStrike(releaseHeavy(combat));});window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.querySelector('#fullscreen')!.addEventListener('click',toggleFullscreen);
function update(dt:number){
 time+=dt;if(mode==='intro'){introElapsed+=dt;if(introElapsed>=INTRO_DURATION)finishIntro();else if(introScene(introElapsed)!==introIndex)introPanel();return;}if(mode!=='playing')return;
 performStrike(tickCombat(combat,dt));
 if(endIfDead())return;
 actionTime=Math.max(0,actionTime-dt);shake=Math.max(0,shake-dt*14);player.pose=Math.max(0,player.pose-dt);
 if(attack){attack.t+=dt;if(attack.t>=animDuration(activeKaiju,attack.anim,combat.stage))attack=null;}
 heavyT=combat.charging?heavyT+dt:0;
 {const next=isClimbing?'climb':!player.grounded?'jumpAir':player.crouched?'crouch':walking?'walk':'idle';
  if(attack||combat.charging||combat.ultimateTime>0){loopAnim=next;loopT=0;loopIntro=null;}
  else if(next!==loopAnim){loopIntro=next==='climb'?'climbGrab':loopAnim==='climb'?(mantled?'climbMantle':null):next==='jumpAir'?(player.vy<0?'jumpRise':null):loopAnim==='jumpAir'?'jumpLand':next==='crouch'?'crouchDown':loopAnim==='crouch'?'crouchUp':null;loopAnim=next;loopT=0;}
  else loopT+=next==='climb'&&climbDir===0?0:dt;}
 const crouch=keys.has('KeyS')&&player.grounded;
 if(canAct(combat))player.crouched=crouch;
 syncBody();const w=bodyWidth(),h=bodyHeight();
 let dx=!canAct(combat)||player.crouched||clingTo?0:((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0))*C.moveSpeed*(combat.superTime>0?B.superSpeed:1)*(combat.charging?B.chargeSlow:1)*dt;
 if(dx)player.face=dx>0?1:-1;
 const inputDx=dx;
 const kb=combat.transform>0||combat.ultimateTime>0?0:combat.knockback*dt;
 dx+=kb;let nx=Math.max(0,Math.min(worldWidth-w,player.x+dx));
 for(const b of buildings)if(solid(b)&&overlaps({x:nx,y:player.y,w,h},{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){nx=dx>0?Math.min(nx,b.x-w):dx<0?Math.max(nx,b.x+b.w):player.x;if(Math.abs(combat.knockback)>M.collisionImpactMin)receiveHit(combat,Math.abs(combat.knockback)*M.collisionPlayerDamage,'environment');combat.knockback=0;}
 if(rival&&!rival.dead&&overlaps({x:nx,y:player.y,w,h},rival))nx=dx>0?rival.x-w:dx<0?rival.x+rival.w:player.x;
 walking=inputDx!==0&&player.grounded&&Math.abs(nx-player.x)>.01;player.x=nx;
 if(Math.abs(kb)>0&&Math.abs(combat.knockback)>M.collisionImpactMin){
 for(const b of buildings)if(b.hpNow>0&&overlaps({x:player.x,y:player.y,w,h},{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){
 if(b.kind!=='large'){damageBuilding(b,Math.abs(combat.knockback)*M.collisionBuildingDamage,'impact');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);}
 receiveHit(combat,Math.abs(combat.knockback)*M.collisionPlayerDamage,'environment');combat.knockback=0;break;
 }}
 let prevBottom=player.y+h,climbing=false;
 if(combat.transform<=0&&combat.ultimateTime<=0){
 player.grounded=false;
 if(!keys.has('KeyW'))grabLock=false;
 const onWall=(b:NonNullable<typeof clingTo>)=>solid(b)&&player.x+w>=b.x-4&&player.x<=b.x+b.w+4&&player.y+h>C.ground-b.h+2;
 if(clingTo&&(!onWall(clingTo)||!canAct(combat)||combat.charging))clingTo=null;
 if(!clingTo&&!grabLock&&keys.has('KeyW')&&canAct(combat)&&!combat.charging){clingTo=buildings.find(onWall)||null;if(clingTo)mantled=false;}
 if(clingTo){
 const b=clingTo,roof=C.ground-b.h;
 climbDir=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);climbing=true;player.face=player.x+w/2<b.x+b.w/2?1:-1;player.vy=climbDir*C.climbSpeed;player.y+=player.vy*dt;
 if(climbDir<0&&player.y+h<=roof+8){player.y=roof-h-.01;player.x=Math.max(b.x-w*.4,Math.min(b.x+b.w-w*.6,player.x+(player.x+w/2<b.x+b.w/2?w*.3:-w*.3)));player.vy=0;climbing=false;clingTo=null;mantled=true;prevBottom=roof-.01;}
 }
 if(!climbing){player.vy+=C.gravity*dt;player.y+=player.vy*dt;}
 isClimbing=climbing;
 }
 if(!climbing&&player.vy>=0)for(const b of buildings){if(!solid(b))continue;const roof=C.ground-b.h;
 if(player.x+w>b.x&&player.x<b.x+b.w&&prevBottom<=roof+1&&player.y+h>=roof){player.y=roof-h-.01;player.vy=0;player.grounded=true;}}
 if(player.y+h>=C.ground){player.y=C.ground-h;player.vy=0;player.grounded=true;}
 if(player.grounded){clingTo=null;isClimbing=false;}
 player.x=separateHorizontal({x:player.x,y:player.y,w,h},solidBodies(),worldWidth);
 for(const b of buildings){b.collapse=Math.max(0,b.collapse-dt);if(b.kind==='tiny'&&b.hpNow>0&&overlaps({x:player.x,y:player.y,w,h},{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){if(Math.abs(kb)>.01){damageBuilding(b,b.hpNow,'impact');releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);}else hit(b,b.hpNow);}}
 for(const car of population.cars)if(!car.crushed&&overlaps({x:player.x,y:player.y,w,h},carBox(car)))destroyCar(car,false,Math.abs(kb)<.01);
 score+=tickPopulation(population,dt,{x:player.x,y:player.y,w,h},worldWidth,Math.abs(kb)<.01);
 for(const s of shots){const old=s.x;s.x+=s.vx*dt;s.life-=dt;
 const targets=[...(objective&&!objective.shattered?[{rect:{x:objective.x-30,y:C.ground-100,w:60,h:100},hit:()=>hitObjective(s.damage)}]:[]),...(rival&&!rival.dead?[{rect:rival,hit:()=>strikeRival(s.damage,s.knockback,Math.sign(s.vx))}]:[]),...buildings.filter(b=>b.hpNow>0).map(b=>({rect:{x:b.x,y:C.ground-b.h,w:b.w,h:b.h},hit:()=>hit(b,s.damage)})),
 ...growths.filter(g=>g.hp>0).map(g=>({rect:{x:g.x-20,y:C.ground-55,w:40,h:55},hit:()=>hitGrowth(g,s.damage)})),
 ...military.units.filter(u=>u.hp>0).map(u=>({rect:u,hit:()=>hitUnit(military,u,s.damage,'player',s.knockback,Math.sign(s.vx))})),
 ...military.projectiles.filter(p=>!p.dead&&WEAPONS[p.weapon].interceptable).map(p=>({rect:{x:p.x-8,y:p.y-8,w:16,h:16},hit:()=>intercept(military,p)})),
 ...population.cars.filter(c=>!c.crushed).map(c=>({rect:carBox(c),hit:()=>destroyCar(c)}))];
 targets.sort((a,b)=>s.vx>0?a.rect.x-b.rect.x:b.rect.x-a.rect.x);
 for(const target of targets)if(segmentHits(old,s.y,s.x,s.y,target.rect)){target.hit();s.life=0;break;}}

 shots=shots.filter(s=>s.life>0&&s.x>0&&s.x<worldWidth);
 if(combat.ultimateTime>0){ultimateTimer-=dt;if(ultimateTimer<=0){ultimateTimer+=B.ultimatePulse;
 for(const direction of [-1,1])waves.push({x:player.x+w/2,vx:direction*B.ultimateSpeed,life:B.ultimateRange/B.ultimateSpeed,damage:B.ultimateDamage*damageMultiplier(combat),hits:new Set()});shake=Math.max(shake,4);}}
 for(const wave of waves){const old=wave.x;wave.x+=wave.vx*dt;wave.life-=dt;for(const b of buildings)if(b.hpNow>0&&!wave.hits.has(b)&&Math.max(old,wave.x)+22>=b.x&&Math.min(old,wave.x)-22<=b.x+b.w){wave.hits.add(b);hit(b,wave.damage,true);}for(const g of growths)if(g.hp>0&&!wave.hits.has(g)&&Math.abs(g.x-wave.x)<40){wave.hits.add(g);hitGrowth(g,wave.damage);}}
 if(rival?.dead){winCity();return;}
 for(const wave of waves){const box={x:wave.x-30,y:C.ground-48,w:60,h:48};
 if(objective&&!objective.shattered&&!wave.hits.has(objective)&&overlaps(box,{x:objective.x-30,y:C.ground-100,w:60,h:100})){wave.hits.add(objective);hitObjective(wave.damage);}
 if(rival&&!rival.dead&&!wave.hits.has(rival)&&overlaps(box,rival)){wave.hits.add(rival);strikeRival(wave.damage,280,Math.sign(wave.vx),true);}
 for(const u of military.units)if(u.hp>0&&!wave.hits.has(u)&&overlaps(box,u)){wave.hits.add(u);hitUnit(military,u,wave.damage,'player',280,Math.sign(wave.vx),true);}
 for(const p of military.projectiles)if(!p.dead&&overlaps(box,{x:p.x-6,y:p.y-6,w:12,h:12}))intercept(military,p);
 for(const car of population.cars)if(!car.crushed&&overlaps(box,carBox(car)))destroyCar(car,true);
 }
 if(rival?.dead){winCity();return;}
 if(rival){for(const hit of tickRival(rival,dt,{x:player.x,y:player.y,w,h},worldWidth,buildings))receiveHit(combat,hit.damage,'boss',hit.strength,hit.direction);for(const b of buildings)if(b.hpNow<b.hp)releaseOccupants(population,buildings.indexOf(b),b.x+b.w/2);if(endIfDead())return;}
 tickMilitary(military,dt,camera,worldWidth,{x:player.x,y:player.y,w,h},destruction(buildings),rival||undefined,Math.abs(kb)<.01?'player':'military');drainMilitary();syncBody();if(endIfDead())return;
 waves=waves.filter(w=>w.life>0&&w.x>0&&w.x<worldWidth);
 ambientTimer+=dt;growthTimer+=dt;
 if(ambientTimer>=B.ambientInterval){ambientTimer=0;dropShards(Math.min(worldWidth-80,player.x+w/2+55),B.ambientCount);}
 if(growthTimer>=B.growthInterval){growthTimer=0;if(growths.filter(g=>g.hp>0).length<B.growthCap)growths.push({x:Math.max(60,Math.min(worldWidth-100,player.x+w/2+140)),hp:B.growthHP});}
 growths=growths.filter(g=>g.hp>0);
 for(const shard of shards){shard.life-=dt;shard.vy+=380*dt;shard.x+=shard.vx*dt;shard.y+=shard.vy*dt;shard.vx*=Math.exp(-dt*4);
 shard.x=Math.max(8,Math.min(worldWidth-8,shard.x));
 if(shard.y>C.ground-10){shard.y=C.ground-10;shard.vy=0;}
 const px=player.x+w/2,py=player.y+h*.65,dist=Math.hypot(shard.x-px,shard.y-py);
 if(dist<B.shardMagnet){shard.x+=(px-shard.x)*Math.min(1,dt*6);shard.y+=(py-shard.y)*Math.min(1,dt*6);}
 if(overlaps({x:player.x-8,y:player.y-8,w:w+16,h:h+20},{x:shard.x-5,y:shard.y-8,w:10,h:16})){const before=combat.stage;collectCrystal(combat,B.shardValue);shard.life=0;if(before!==combat.stage){action=`EVOLUTION · STAGE ${combat.stage}`;actionTime=1.6;burst(px,py,'#f7a2d3',30);}}}
 shards=shards.filter(s=>s.life>0);syncBody();
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
 const target=Math.max(0,Math.min(worldWidth-C.width,player.x-C.width*.38+player.face*75));camera+=(target-camera)*Math.min(1,dt*C.cameraSpeed);const targetY=Math.max(0,Math.min(C.maxCameraY,Math.max(C.cameraFollowY,130+bodyHeight())-(player.y+bodyHeight())));cameraY+=(targetY-cameraY)*Math.min(1,dt*C.cameraSpeed*1.4);
 if(objectiveOpen()&&player.x>=worldWidth-bodyWidth()-3)results();
}
function rect(x:number,y:number,w:number,h:number,color:string){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function text(s:string,x:number,y:number,size=12,color='#e7edde',align:CanvasTextAlign='left'){ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.fillText(s,Math.round(x),Math.round(y));}
function poly(points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();}
function background(){
 rect(0,0,960,540,CITIES[cityIndex].sky);rect(0,130,960,190,'#b5c5be');rect(0,260,960,180,CITIES[cityIndex].haze);
 // Decorative parallax silhouettes, deterministic and noninteractive.
 for(let i=-1;i<21;i++){const x=i*79-(camera*.13)%79,h=50+((i+22)*47%115);rect(x,315-h,50,h,'#80999c');rect(x+18,305-h,10,10,'#80999c');}
 for(let i=-1;i<16;i++){const x=i*102-(camera*.26)%102,h=80+((i+17)*37%110);rect(x,370-h,65,h,'#6b8588');rect(x+4,374-h,56,4,'#8ba2a1');for(let yy=390-h;yy<360;yy+=15)for(let xx=8;xx<59;xx+=15)rect(x+xx,yy,5,7,'#a6b4a7');}
 // Dense near-layer towers crowd the street and close in the skyline.
 for(let i=-1;i<12;i++){const x=i*88-(camera*.5)%88,h=170+((i+31)*53%150);rect(x,C.ground-4-h,78,h,'#4f6469');rect(x+78,C.ground-4-h,10,h,'#435659');rect(x-2,C.ground-4-h,82,5,'#6d8185');for(let yy=C.ground-h+4;yy<C.ground-20;yy+=17)for(let xx=7;xx<72;xx+=16)rect(x+xx,yy,7,9,(i+yy)%5===0?'#c9b77a':'#38494d');}
 rect(0,0,960,70,'#1a2a2e22');rect(0,0,960,34,'#1a2a2e33');
 rect(0,C.ground-4,960,10,'#c9c5ab');rect(0,C.ground+6,960,99,'#4c5755');rect(0,C.ground+8,960,3,'#202e31');
 for(let i=-1;i<18;i++)rect(i*85-camera%85,487,37,3,'#b4b294');rect(0,513,960,27,'#34413f');
 // Railings and lamps belong to background decoration.
 for(let i=0;i<10;i++){let x=i*450-camera;rect(x,348,4,84,'#44575a');rect(x-10,347,24,5,'#44575a');rect(x-7,352,18,5,'#e9d6a2');}
}
function drawBuilding(b:typeof buildings[number]){
 const x=b.x-camera;if(x>1000||x+b.w<-40)return;
 if(b.hpNow<=0&&b.collapse<=0){rect(x,C.ground-7,b.w,7,'#62625b');for(let j=0;j<b.w;j+=13)rect(x+j,C.ground-8-(j%7),10,8+j%7,'#898879');return;}
 const squash=b.hpNow<=0?b.collapse/C.collapseDuration:1;const h=b.h*squash,y=C.ground-h;
 rect(x+5,y+8,b.w,h-8,'#394d55');rect(x,y,b.w-7,h,b.color);rect(x-3,y,b.w+4,7,'#d0cab0');rect(x+2,y+7,b.w-10,3,'#424f55');
 for(let yy=22;yy<h-24;yy+=22)for(let xx=12;xx<b.w-14;xx+=19){rect(x+xx,y+yy,10,13,'#324953');rect(x+xx,y+yy,10,3,'#91a7a2');rect(x+xx+4,y+yy,2,13,b.color);}
 rect(x+14,C.ground-26,16,26,'#293f47');rect(x+17,C.ground-23,10,18,'#8fa99e');
 if(b.label&&h>35){rect(x+4,y+h-47,b.w-16,17,'#263e46');text(b.label,x+(b.w-8)/2,y+h-35,9,'#eddfa8','center');}
 if(b.hpNow/b.hp<.68){poly([[x+20,y+13],[x+25,y+38],[x+16,y+51],[x+31,y+41],[x+24,y+11]],'#293e44');rect(x+b.w-32,y+h*.4,19,22,'#3e4a4c');}
 if(b.hpNow/b.hp<.34){poly([[x+45,y+7],[x+36,y+63],[x+52,y+87],[x+44,y+61],[x+54,y+9]],'#283b3f');rect(x+10,y+h*.55,20,30,'#304347');for(let n=0;n<3;n++)rect(x+b.w*.6+Math.sin(time*2+n)*5,y+15-n*14-(time*8%14),14+n*5,12,'#69736c');}
 if(b.collapse>0){rect(x-5,C.ground-14,b.w+10,14,'#b1ac91');}
}
function monster(x:number,y:number,face:number,crouched:boolean,pose:number){
 if(activeKaiju!=='Mogurodon'||hasSprite('Mogurodon',combat.stage)){const [anim,t]=currentAnim();ctx.save();ctx.translate(x+bodyWidth()/2,y+bodyHeight());ctx.scale(face,player.crouched&&!(CROUCH_ANIMS.includes(anim)&&hasAnim(activeKaiju,anim,combat.stage))?.6:1);drawSilhouette(ctx,activeKaiju,0,0,scale(combat),t,false,anim,combat.stage);ctx.restore();return;}

 const h=crouched?C.crouchHeight:C.playerHeight,step=(keys.has('KeyA')||keys.has('KeyD'))&&mode==='playing'?Math.sin(time*13)*4:0;
 ctx.save();ctx.translate(Math.round(x+bodyWidth()/2),Math.round(y+bodyHeight()));ctx.scale(face*scale(combat),scale(combat));
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
 text('SCORE',746,23,9,'#a4b6a8');text(String(netScore()).padStart(6,'0'),746,47,21);text(`${CITIES[cityIndex].code} / 0${blockIndex+1}`,938,28,11,'#e4e7d1','right');text('ESC Ⅱ',938,49,10,'#9aaea2','right');
 rect(20,86,260,24,'#213a40');text(session!=='drill'?`0${blockIndex+1} ${block.name.toUpperCase()}`:`DRILL / RESPONSE TIER ${military.tier}`,30,102,9,'#e4e7d1');text(`HOSTILES ${military.units.length} / ${M.caps[military.tier-1]}`,30,124,9,'#344f49');
 if(objective||rival){const value=objective?objective.hp/objective.maxHP:rival!.hp/rival!.maxHP;const label=objective?'STRONGHOLD CRYSTAL':`${bossName().toUpperCase()} / M4 RIVAL`;text(label,330,94,10,'#344f49');rect(330,101,300,6,'#6b8c83');rect(330,101,300*value,6,'#e9a0c8');text(objective?.shattered?'CRYSTAL SHATTERED':`${Math.ceil(objective?.hp??rival!.hp)} HP`,650,107,10,'#344f49');}
 if(block.kind==='boss'&&rival)text('ARENA LOCKED',935,126,11,'#344f49','right');
 if(objectiveOpen()){text('EXIT OPEN →',935,103,13,'#203c35','right');if(camera<worldWidth-C.width-30)text('EAST →',925,275,12,'#243e35','right');}
 else if(time<15&&mode==='playing')text('J: COMBO   K: HOLD HEAVY   L: SPINE   U: ULTIMATE   I: SUPER',480,409,11,'#f7f0cd','center');
 if(actionTime>0)text(action,480,153,12,'#243f37','center');
 meters();
 rect(20,519,100,3,'#56685d');rect(20,519,100*(player.x/(worldWidth-C.playerWidth)),3,'#c8ed82');text('TEMP ART / M7',939,530,8,'#a0af99','right');
}
function meters(){
 const bar=(x:number,width:number,value:number,max:number,label:string,color:string)=>{rect(x,466,width,5,'#263b3c');rect(x,466,width*Math.max(0,Math.min(1,value/max)),5,color);text(label,x,459,9,color);};
 bar(24,205,combat.hp,B.maxHP,`CRYSTAL / HP  ${Math.ceil(combat.hp)} / ${B.maxHP}`,'#f4a1d0');
 for(const threshold of B.up)rect(24+205*threshold/B.maxHP,463,1,10,'#fff0df');
 bar(280,190,combat.ultimate,B.ultimateMax,`[U] ${ultimateLabel()}${combat.ultimate>=B.ultimateMax?' · READY':''}`,'#c9ef83');
 bar(520,190,combat.superTime>0?combat.superTime:combat.superCharge,combat.superTime>0?B.superDuration:B.superMax,combat.superTime>0?`SUPER · ${Math.ceil(combat.superTime)}s`:combat.superCharge>=B.superMax?'[I] SUPER · READY':'[I] SUPER · OVERFLOW CRYSTALS','#b4c8fb');
 text(`DAMAGE PENALTY  −${Math.round(combat.penalty)}`,934,459,9,'#c5cabb','right');
 if(combat.charging){const x=player.x-camera+bodyWidth()/2;rect(x-28,player.y-20,56,5,'#293e3c');rect(x-28,player.y-20,56*combat.charge/B.maxCharge,5,'#f8a0cc');text(combat.charge>=B.maxCharge?'MAX':'CHARGING',x,player.y-26,8,'#ffe6f1','center');}
}
function drawPopulation(){
 for(const car of population.cars){const x=car.x-camera;if(x<-60||x>990)continue;
 if(car.crushed){rect(x,C.ground-5,33,5,'#485858');rect(x+3,C.ground-7,25,3,car.color);continue;}
 rect(x,C.ground-11,33,9,car.color);rect(x+7,C.ground-18,18,9,car.color);rect(x+9,C.ground-16,6,6,'#b7d1c3');rect(x+18,C.ground-16,6,6,'#b7d1c3');rect(x+4,C.ground-5,6,5,'#253839');rect(x+25,C.ground-5,6,5,'#253839');}
 for(const c of population.civilians){if(c.escaped)continue;const x=c.x-camera;if(x<-20||x>980)continue;
 if(c.squashed){rect(x,C.ground-1,5,1,'#646d5c');continue;}
 const sway=Math.sin(time*16+c.x)*1;rect(x,C.ground-9,3,3,['#e7b691','#a87562','#d2b28c'][c.variant]);rect(x,C.ground-6,3,4,['#d1cb9d','#9c7884','#71a7a9'][c.variant]);rect(x-1+sway,C.ground-2,2,2,'#3b4e4c');rect(x+2-sway,C.ground-2,2,2,'#3b4e4c');}
}
function drawMilitary(){
 for(const wreck of military.wrecks){const x=wreck.x-camera;if(x<-100||x>1000)continue;rect(x,wreck.y+wreck.h*.65,wreck.w,wreck.h*.35,'#3c4945');rect(x+8,wreck.y+wreck.h*.5,wreck.w*.6,6,'#677165');for(let j=0;j<3;j++)rect(x+wreck.w*.5+Math.sin(time+j)*4,wreck.y-8-j*12-(time*12%12),7+j*3,8,'#718077');}
 for(const u of military.units){if(u.hp<=0||u.x+u.w<camera-100||u.x>camera+1060)continue;const x=u.x-camera,y=u.y,d=UNITS[u.type];
 ctx.save();ctx.translate(Math.round(x+u.w/2),Math.round(y));ctx.scale(u.face,1);
 if(u.type==='police'||u.type==='soldier'){
 rect(-2,0,5,4,'#d7b08c');rect(-3,4,6,6,u.type==='police'?'#445b76':'#647653');rect(-4,-1,7,2,u.type==='police'?'#36516d':'#667354');rect(2,5,7,2,'#263d3d');rect(-3,10,2,4,'#2b3d40');rect(1,10,2,4,'#2b3d40');
 }else if(u.type==='helicopter'){
 poly([[-23,6],[-9,1],[15,1],[25,10],[17,18],[-9,18],[-20,12]],'#596e60');rect(-32,7,20,3,'#566d60');rect(-34,0,4,12,'#627968');rect(-6,18,26,2,'#2d4141');rect(0,-5,3,7,'#394d49');rect(-32,-6,65,2,'#374b47');rect(13,4,10,7,'#b2c6a9');
 }else if(u.type==='jet'||u.type==='bomber'){
 poly([[-u.w/2,8],[-10,4],[u.w/2,8],[10,13],[-u.w/2+4,14]],u.type==='jet'?'#73877f':'#5d7160');poly([[-15,8],[-22,-5],[9,8],[-20,24]],'#4d6560');rect(15,5,8,3,'#c4d1b8');
 }else{
 const color=u.type==='patrol'?'#557288':u.type==='apc'?'#7b8c61':'#65795b';
 rect(-u.w/2,u.h-8,u.w,8,'#2d403e');rect(-u.w/2+2,8,u.w-4,u.h-13,color);rect(-u.w*.25,2,u.w*.5,12,color);
 if(u.type==='patrol'){rect(-7,3,11,6,'#b0c6b1');rect(-3,-1,5,3,Math.sin(time*10)>0?'#e98a8a':'#a4c9ef');}
 else {rect(-3,0,17,6,'#80916d');rect(5,1,u.type==='artillery'?31:24,4,'#364f44');}
 if(u.type==='emplacement'){rect(-7,8,14,14,'#52644c');rect(-17,19,34,4,'#3a4e40');}
 for(let j=-u.w/2+4;j<u.w/2;j+=10)rect(j,u.h-6,6,4,'#5d6c58');
 }
 ctx.restore();
 if(u.hp<u.maxHP*.6){for(let j=0;j<2;j++)rect(x+u.w/2+Math.sin(time*4+j)*3,y-j*11-6-(time*10%10),5+j*3,6,'#6d7970');}
 }
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
 ctx.save();ctx.translate(Math.round(x+r.w/2),Math.round(r.y+r.h));ctx.scale(r.face,1);
 poly([[-36,-16],[-46,-50],[-28,-42],[-32,-82],[-14,-74],[-7,-106],[12,-88],[28,-70],[38,-55],[35,-22]],tint);rect(-25,-75,50,62,'#4e5e59');rect(8,-74,35,27,tint);rect(27,-66,6,4,'#f1a8d4');rect(-26,-14,19,14,'#314b43');rect(10,-14,23,14,'#314b43');if(r.windup>0){rect(12,-48,35,12,'#f2b077');text('!',0,-123,20,'#f0a569','center');}ctx.restore();
 text(bossName().toUpperCase(),x+r.w/2,r.y-15,11,'#324c44','center');
 for(const shot of r.shots){const sx=shot.x-camera;poly([[sx-10,shot.y],[sx-3,shot.y-6],[sx+9,shot.y],[sx+2,shot.y+6]],'#d694bf');}
 }
}
function render(){
 if(mode==='intro'){drawIntro(ctx,introElapsed);return;}
 if(mode==='ending'){drawEnding(ctx,endingName);return;}
 if(['title','setup','selection','freeplay-select','gallery','settings','scores','confirm','progress','conquered'].includes(mode)){drawMenuBackdrop(ctx,time);if(mode==='selection')paintPreviews();return;}
 ctx.clearRect(0,0,960,540);ctx.save();if(display.shake&&shake>0)ctx.translate(Math.round(Math.sin(time*63)*shake),Math.round(Math.cos(time*77)*shake*.5));
 rect(0,0,960,540,CITIES[cityIndex].sky);ctx.save();ctx.translate(0,Math.round(cameraY));background();for(const b of buildings)drawBuilding(b);drawPopulation();drawMilitary();drawCampaignObjective();
 const exitX=worldWidth-65-camera;
 rect(exitX,C.ground-90,5,90,objectiveOpen()?'#c7ee83':'#6a7d75');
 if(objectiveOpen()){poly([[exitX-20,358],[exitX+6,358],[exitX+6,348],[exitX+27,365],[exitX+6,382],[exitX+6,372],[exitX-20,372]],'#c7ee83');text('EXIT',exitX,342,10,'#213d35','center');}
 for(const g of growths){const x=g.x-camera;poly([[x-22,C.ground],[x-16,C.ground-40],[x-5,C.ground-24],[x+3,C.ground-62],[x+16,C.ground-40],[x+22,C.ground]],'#cf77b4');poly([[x-4,C.ground-5],[x+3,C.ground-55],[x+10,C.ground-34]],'#ffbedf');text('CRYSTAL',x,C.ground-72,8,'#334b43','center');}
 for(const shard of shards){const x=shard.x-camera,y=shard.y+Math.sin(time*3+shard.x)*2;poly([[x,y-8],[x+5,y],[x,y+6],[x-5,y]],'#ffc1e3');rect(x-1,y-5,2,6,'#fff1f6');}
 for(const wave of waves){const x=wave.x-camera;poly([[x-26,C.ground],[x-17,C.ground-10],[x-6,C.ground-6],[x+2,C.ground-42],[x+10,C.ground-9],[x+23,C.ground]],'#ed9bc9');rect(x-16,C.ground,38,3,'#ffe2f1');}
 if(combat.superTime>0){const x=player.x-camera;rect(x-7,player.y-7,bodyWidth()+14,bodyHeight()+10,Math.sin(time*10)>0?'#c47cab':'#8d799e');}
 monster(player.x-camera,player.y,player.face,player.crouched,player.pose);
 if(combat.transform>0){const x=player.x-camera+bodyWidth()/2,y=player.y+bodyHeight()/2;const radius=bodyHeight()*.75;poly([[x,y-radius],[x+radius*.6,y],[x,y+radius],[x-radius*.6,y]],'#f4b0d8');poly([[x,y-radius*.85],[x+radius*.35,y],[x,y+radius*.8],[x-radius*.35,y]],'#ffe0f1');}
 if(combat.ultimateTime>0)text(ultimateLabel(),player.x-camera+bodyWidth()/2,player.y-24,10,'#fff1d8','center');
 // Launched tail quill: bone-white spike pointing along its flight, dark base, faint motion streak.
 for(const s of shots){const sx=s.x-camera,d=Math.sign(s.vx)||1;rect(Math.min(sx-26*d,sx-14*d),s.y-1,12,2,'#efe2ba55');poly([[sx+16*d,s.y],[sx-4*d,s.y-3],[sx-14*d,s.y-2],[sx-14*d,s.y+2],[sx-4*d,s.y+3]],'#efe2ba');poly([[sx-14*d,s.y-2],[sx-9*d,s.y-2.5],[sx-9*d,s.y+2.5],[sx-14*d,s.y+2]],'#6a2f45');}
 for(const p of particles)rect(p.x-camera,p.y,p.size,p.size,p.color);
 ctx.restore();ctx.restore();hud();
}
let last=performance.now();function frame(now:number){const dt=Math.min((now-last)/1000,C.maxDelta);last=now;update(dt);render();requestAnimationFrame(frame);}title();requestAnimationFrame(frame);
// Read-only inspection hook for smoke tests; no gameplay mutations.
loadPresentationArt();window.addEventListener('resize',applyDisplay);applyDisplay();
Object.defineProperty(window,'kaijuDebug',{get:()=>({cameraY,mode,clinging:!!clingTo,face:player.face,grounded:player.grounded,vy:player.vy,cooldown:combat.cooldown,rangedCooldown:combat.rangedCooldown,canAct:canAct(combat),blockKind:block.kind,cityScore:Math.round(cityScore()),banked:run?.banked??0,buildings:buildings.map(b=>({x:b.x,y:C.ground-b.h,w:b.w,h:b.h,hp:b.hpNow,kind:b.kind})),rival:rival?{x:rival.x,y:rival.y,w:rival.w,h:rival.h,hp:rival.hp,windup:rival.windup,attack:rival.attack}:null,entityCounts:{units:military.units.length,enemyShots:military.projectiles.length,effects:military.effects.length,wrecks:military.wrecks.length,waves:waves.length,shards:shards.length,particles:particles.length,civilians:population.civilians.length,growths:growths.length,playerShots:shots.length},activeKaiju,selectedKaiju,introCount,introElapsed,gallery:[...permanent.gallery],freeChoice:{...freeChoice},score:netScore(),destruction:destruction(buildings),exitOpen:objectiveOpen(),x:player.x,y:player.y,crouched:player.crouched,buildingHP:buildings.map(b=>b.hpNow),particleCount:particles.length,shotCount:shots.length,shotY:shots.map(s=>s.y),stage:combat.stage,hp:combat.hp,ultimate:combat.ultimate,ultimateTime:combat.ultimateTime,superCharge:combat.superCharge,superTime:combat.superTime,transform:combat.transform,width:bodyWidth(),height:bodyHeight(),charging:combat.charging,charge:combat.charge,combo:combat.combo,shards:shards.length,growths:growths.length,session,cityIndex,blockIndex,worldWidth,objectiveHP:objective?.hp??null,bossHP:rival?.hp??null,checkpoint:checkpoint?{...checkpoint}:null,highScores:permanent.scores.map(r=>({...r})),military:military.units.map(u=>({type:u.type,x:u.x,y:u.y,w:u.w,h:u.h,hp:u.hp})),enemyShots:military.projectiles.length,damageTaken:combat.damageTaken,civilians:population.civilians.filter(c=>!c.squashed&&!c.escaped).length,cars:population.cars.filter(c=>!c.crushed).length})});
