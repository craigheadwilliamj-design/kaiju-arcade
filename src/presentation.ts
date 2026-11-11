import {KAIJU} from './campaign.ts';import type {Permanent} from './campaign.ts';
export const INTRO_DURATION=12;
export const INTRO_SCENES=['AN ASTEROID APPROACHES EARTH','IMPACT','PINK CRYSTALS EMERGE','MONSTROUS EVOLUTION'];
export const ROSTER=[
 {name:'Mogurodon',color:'#a9ab8c',ratings:[3,3,3,3],ending:'The Earth Belongs to Him'},
 {name:'Tlézcatl',color:'#d28e64',ratings:[4,3,3,3],ending:'The World in Flames'},
 {name:'Belial',color:'#a6b783',ratings:[4,5,1,4],ending:'The Great Dissolution'},
 {name:'Kaiban',color:'#b7a08b',ratings:[5,1,5,2],ending:'King of the Ruins'},
 {name:'Myrmex',color:'#ad9fbf',ratings:[3,4,2,5],ending:'The Swarm Ascendant'},
 {name:'Sargathoth',color:'#79ad91',ratings:[4,1,5,4],ending:'The World Reclaimed'},
];
// Original epilogues/illustrations have not been supplied. Do not invent final lore.
export const ENDINGS=ROSTER.map(r=>({name:r.name,title:r.ending,epilogue:null as string|null}));
export const ART_SLOTS:{menu:string|null,intro:(string|null)[],endings:Record<string,string|null>}={menu:null,intro:[null,null,null,null],endings:Object.fromEntries(KAIJU.map(k=>[k,null]))};
// HUD score: sign first, then zero-padded magnitude (-12 -> '-00012'). Scores may go negative.
export function hudScore(n:number,width=6){const v=Math.round(n);const d=String(Math.abs(v));return v<0?'-'+d.padStart(width-1,'0'):d.padStart(width,'0');}
export function introScene(elapsed:number){return Math.max(0,Math.min(3,Math.floor(elapsed/3)));}
export function selectable(p:Permanent,name:string){return KAIJU.includes(name)&&p.unlocked.includes(name);}
export type FreePlayChoice={kaiju:string,city:number,boss:string};
export function validFreePlay(p:Permanent,c:FreePlayChoice){return selectable(p,c.kaiju)&&selectable(p,c.boss)&&Number.isInteger(c.city)&&c.city>=0&&c.city<5&&p.conquered.includes(c.city);}
export function unlockEnding(p:Permanent,name:string){if(!KAIJU.includes(name)||p.gallery.includes(name))return false;p.gallery.push(name);return true;}
export function canViewEnding(p:Permanent,name:string){return KAIJU.includes(name)&&p.gallery.includes(name);}
export function endingFor(name:string){return ENDINGS.find(e=>e.name===name)||ENDINGS[0];}
const images=new Map<string,HTMLImageElement>();
// Final kaiju sprites. Bottom-center anchored, drawn nearest-neighbor. `width` is world units at Stage 1 (hitbox is unchanged).
// Each animation is a horizontal strip of equal-width frames looped at `fps` (generated with PixelLab, see tools/pixellab_animate.py).
// `idle` is required; any other animation falls back to idle until it exists and has loaded.
// `once` strips (attacks) play a single time from t=0 and hold their last frame; the caller ends them via animDuration.
// `impact` marks the frame where a hit lands, for syncing gameplay effects to the art.
// `scale`/`anchor` are for padded strips generated from a shrunken base (room for lunges): `scale` is the art's size relative to a
// full-frame 256px-wide strip (default 1) and `anchor` the frame x that lines up with the kaiju's origin (default: frame centre).
// `hold` (grab/carry strips): frame px where a carried prop's bottom-centre sits, one [x,y] per frame or a single pair for every frame.
type Strip={src:string,frames:number,fps:number,once?:boolean,impact?:number,scale?:number,anchor?:number,hold?:number[]|number[][]};
// Each kaiju has a base form (`width`/`anims`) plus optional per-stage overrides in `stages`. A stage without an entry uses the base form.
// Mogurodon: the base art is its Stage 2 form; `stages[1]` (animated incrementally) and `stages[3]` (every strip) override Stages 1 and 3.
// Within a stage form a missing animation falls back to that form's own `idle`, so a new form can ship with only a few strips.
type Form={width:number,anims:Record<string,Strip>};
// Stage 1 strips: the mogurodon-s1 base still, a 151px-wide sprite at x=52 keyed from the transparent render.
const S1_NATIVE={scale:151/256,anchor:52+128*151/256};
// Stage 3 strips generated from the native-resolution base (the mogurodon-s3 base still: the 173px-wide sprite at x=41, one art pixel per
// pixel, keyed from the transparent render with tools/key_render.py) instead of a stretched full-frame one.
const S3_NATIVE={scale:173/256,anchor:41+128*173/256};
// Stage 2 (base form) strips: the mogurodon-s2 base still, a 194px-wide sprite at x=31 keyed the same way.
const S2_NATIVE={scale:194/256,anchor:31+128*194/256};
export const SPRITES:Record<string,Form&{stages?:Record<number,Form>}>={
 Mogurodon:{width:120,anims:{idle:{src:'assets/mogurodon-idle.png',frames:8,fps:8,...S2_NATIVE},walk:{src:'assets/mogurodon-walk.png',frames:8,fps:10,...S2_NATIVE},
  // Stage 2 (the base form): every strip generated from the native-resolution base (S2_NATIVE), 256x192 except the 256x256 climb.
  // Frame counts and fps are the timing the other forms fall back to, so they match the previous art.
  // Light combo by hit order (each form picks its own moves): Stage 2 = near-claw overhead swipe, far-claw swipe, bite.
  light1:{src:'assets/mogurodon-swipe-right.png',frames:8,fps:24,once:true,...S2_NATIVE},light2:{src:'assets/mogurodon-swipe-left.png',frames:10,fps:26,once:true,...S2_NATIVE},light3:{src:'assets/mogurodon-bite.png',frames:8,fps:20,once:true,...S2_NATIVE},
  heavyRear:{src:'assets/mogurodon-heavy-rear.png',frames:5,fps:20,once:true,...S2_NATIVE},heavyHold:{src:'assets/mogurodon-heavy-hold.png',frames:4,fps:10,...S2_NATIVE},heavySlam:{src:'assets/mogurodon-heavy-slam.png',frames:9,fps:18,once:true,...S2_NATIVE},
  rangedStand:{src:'assets/mogurodon-ranged-stand.png',frames:9,fps:20,once:true,...S2_NATIVE},rangedCrouch:{src:'assets/mogurodon-ranged-crouch.png',frames:8,fps:20,once:true,...S2_NATIVE},
  // Crouch art is drawn at full size; crouchUp is crouchDown reversed.
  crouch:{src:'assets/mogurodon-crouch.png',frames:4,fps:6,...S2_NATIVE},crouchDown:{src:'assets/mogurodon-crouch-down.png',frames:5,fps:22,once:true,...S2_NATIVE},crouchUp:{src:'assets/mogurodon-crouch-up.png',frames:5,fps:22,once:true,...S2_NATIVE},
  // Jump strips are bottom-aligned: physics moves him, the art only changes pose.
  jumpRise:{src:'assets/mogurodon-jump-rise.png',frames:9,fps:24,once:true,...S2_NATIVE},jumpAir:{src:'assets/mogurodon-jump-air.png',frames:4,fps:8,...S2_NATIVE},jumpLand:{src:'assets/mogurodon-jump-land.png',frames:5,fps:20,once:true,...S2_NATIVE},
  // Seismic Rupture (U): roar (crash on impact frame 5) then ground-pounding loop for the rest of the 2.4s Ultimate.
  ultRoar:{src:'assets/mogurodon-ult-roar.png',frames:8,fps:14,once:true,impact:5,...S2_NATIVE},ultPound:{src:'assets/mogurodon-ult-pound.png',frames:8,fps:16,...S2_NATIVE},
  // Climb (W): 256x256 strips, body vertical with the gripping claws on the wall line (frame x=167, the hitbox edge).
  climbGrab:{src:'assets/mogurodon-climb-grab.png',frames:5,fps:20,once:true,...S2_NATIVE},climb:{src:'assets/mogurodon-climb.png',frames:8,fps:12,...S2_NATIVE},climbMantle:{src:'assets/mogurodon-climb-mantle.png',frames:9,fps:20,once:true,...S2_NATIVE},
  // Light attack while clinging: the near arm lets go, winds back across the chest and punches into the wall (impact = fist out).
  climbPunch:{src:'assets/mogurodon-climb-punch.png',frames:8,fps:24,once:true,impact:4,...S2_NATIVE},
  // Grab/throw (H): grab dips to scoop the prop off the street and rears up with it overhead; carry/carryWalk hold it there on the
  // hind legs; throw starts at the release (the prop launches on the key press) and drops back onto all fours.
  grab:{src:'assets/mogurodon-grab.png',frames:9,fps:22,once:true,...S2_NATIVE,hold:[[201,191],[213,191],[230,191],[230,191],[230,191],[226,191],[219,152],[221,90],[144,21]]},
  carry:{src:'assets/mogurodon-carry.png',frames:4,fps:6,...S2_NATIVE,hold:[[144,21],[148,24],[152,25],[148,23]]},
  carryWalk:{src:'assets/mogurodon-carry-walk.png',frames:8,fps:10,...S2_NATIVE,hold:[[144,21],[146,20],[150,20],[151,21],[152,23],[150,23],[148,22],[146,22]]},
  throw:{src:'assets/mogurodon-throw.png',frames:8,fps:18,once:true,...S2_NATIVE}},
  stages:{1:{width:120,anims:{
   // Stage 1 form: every strip generated from the native-resolution base (S1_NATIVE), 256x192 except the 256x256 climb. Frame counts,
   // fps and impact frames match the previous art, so combat timing is unchanged.
   idle:{src:'assets/mogurodon-s1-idle.png',frames:8,fps:8,...S1_NATIVE},walk:{src:'assets/mogurodon-s1-walk.png',frames:8,fps:10,...S1_NATIVE},
   jumpRise:{src:'assets/mogurodon-s1-jump-rise.png',frames:9,fps:24,once:true,...S1_NATIVE},jumpAir:{src:'assets/mogurodon-s1-jump-air.png',frames:4,fps:8,...S1_NATIVE},jumpLand:{src:'assets/mogurodon-s1-jump-land.png',frames:5,fps:20,once:true,...S1_NATIVE},
   // Light combo: near (left) paw swipe, far (right) paw swipe, lunging bite. fps chosen so each hit lasts as long as Stage 2's.
   light1:{src:'assets/mogurodon-s1-light1.png',frames:8,fps:24,once:true,...S1_NATIVE},light2:{src:'assets/mogurodon-s1-light2.png',frames:8,fps:21,once:true,...S1_NATIVE},light3:{src:'assets/mogurodon-s1-light3.png',frames:8,fps:20,once:true,...S1_NATIVE},
   // Heavy: rear onto the hind legs, hold (straining loop) while charging, slam both paws down on release. Rear and slam are cut
   // from one generated strip, so the slam starts at the crash.
   heavyRear:{src:'assets/mogurodon-s1-heavy-rear.png',frames:5,fps:20,once:true,...S1_NATIVE},heavyHold:{src:'assets/mogurodon-s1-heavy-hold.png',frames:4,fps:10,...S1_NATIVE},
   heavySlam:{src:'assets/mogurodon-s1-heavy-slam.png',frames:8,fps:16,once:true,...S1_NATIVE},
   // Ranged: no tail at Stage 1. Head down, back arched like a hissing cat, quills bristling; the projectile spawn is unchanged.
   rangedStand:{src:'assets/mogurodon-s1-ranged-stand.png',frames:8,fps:18,once:true,...S1_NATIVE},rangedCrouch:{src:'assets/mogurodon-s1-ranged-crouch.png',frames:8,fps:20,once:true,...S1_NATIVE},
   // Crouch: flat stalking crouch; crouchUp is crouchDown reversed.
   crouch:{src:'assets/mogurodon-s1-crouch.png',frames:4,fps:6,...S1_NATIVE},crouchDown:{src:'assets/mogurodon-s1-crouch-down.png',frames:5,fps:22,once:true,...S1_NATIVE},crouchUp:{src:'assets/mogurodon-s1-crouch-up.png',frames:5,fps:22,once:true,...S1_NATIVE},
   // Climb: 256x256 strips, body upright with the gripping paws on the wall line (frame x=158, the hitbox edge). The mantle starts
   // 18px further back, easing to 0, to cancel the game sliding the hitbox onto the roof.
   climbGrab:{src:'assets/mogurodon-s1-climb-grab.png',frames:5,fps:20,once:true,...S1_NATIVE},climb:{src:'assets/mogurodon-s1-climb.png',frames:8,fps:12,...S1_NATIVE},
   climbMantle:{src:'assets/mogurodon-s1-climb-mantle.png',frames:9,fps:20,once:true,...S1_NATIVE},climbPunch:{src:'assets/mogurodon-s1-climb-punch.png',frames:8,fps:24,once:true,impact:4,...S1_NATIVE},
   // Seismic Rupture: rear up and howl, crash down in a shockwave (impact frame 5 = 0.357s, same first-fissure timing as Stage 2),
   // then a two-paw ground-pounding loop for the rest of the 2.4s Ultimate.
   ultRoar:{src:'assets/mogurodon-s1-ult-roar.png',frames:9,fps:14,once:true,impact:5,...S1_NATIVE},ultPound:{src:'assets/mogurodon-s1-ult-pound.png',frames:8,fps:16,...S1_NATIVE},
   grab:{src:'assets/mogurodon-s1-grab.png',frames:9,fps:22,once:true,...S1_NATIVE,hold:[[171,191],[177,191],[205,191],[205,191],[205,191],[201,184],[180,128],[183,92],[128,39]]},
   carry:{src:'assets/mogurodon-s1-carry.png',frames:4,fps:6,...S1_NATIVE,hold:[[128,39],[128,41],[129,43],[128,41]]},
   carryWalk:{src:'assets/mogurodon-s1-carry-walk.png',frames:8,fps:10,...S1_NATIVE,hold:[[128,39],[131,35],[134,35],[137,38],[134,39],[133,35],[129,35],[127,37]]},
   throw:{src:'assets/mogurodon-s1-throw.png',frames:8,fps:18,once:true,...S1_NATIVE}}},
  // Stage 3 form: every strip generated from the native-resolution base (S3_NATIVE); frame counts, fps and impact frames match the
  // previous art so combat timing is unchanged. Climb strips are 256x256 with the gripping claws on the wall line (frame x=162).
  // Light combo: leading-arm strike, chest-arm swipe (the other arm), lunge-bite.
  3:{width:120,anims:{idle:{src:'assets/mogurodon-s3-idle.png',frames:8,fps:8,...S3_NATIVE},walk:{src:'assets/mogurodon-s3-walk.png',frames:8,fps:10,...S3_NATIVE},
   light1:{src:'assets/mogurodon-s3-light1.png',frames:8,fps:24,once:true,...S3_NATIVE},light2:{src:'assets/mogurodon-s3-light2.png',frames:8,fps:21,once:true,...S3_NATIVE},light3:{src:'assets/mogurodon-s3-light3.png',frames:8,fps:20,once:true,...S3_NATIVE},
   heavyRear:{src:'assets/mogurodon-s3-heavy-rear.png',frames:5,fps:20,once:true,...S3_NATIVE},heavyHold:{src:'assets/mogurodon-s3-heavy-hold.png',frames:4,fps:10,...S3_NATIVE},
   heavySlam:{src:'assets/mogurodon-s3-heavy-slam.png',frames:8,fps:16,once:true,...S3_NATIVE},
   jumpRise:{src:'assets/mogurodon-s3-jump-rise.png',frames:9,fps:24,once:true,...S3_NATIVE},jumpAir:{src:'assets/mogurodon-s3-jump-air.png',frames:4,fps:8,...S3_NATIVE},jumpLand:{src:'assets/mogurodon-s3-jump-land.png',frames:5,fps:20,once:true,...S3_NATIVE},
   rangedStand:{src:'assets/mogurodon-s3-ranged-stand.png',frames:8,fps:18,once:true,...S3_NATIVE},rangedCrouch:{src:'assets/mogurodon-s3-ranged-crouch.png',frames:8,fps:18,once:true,...S3_NATIVE},
   crouch:{src:'assets/mogurodon-s3-crouch.png',frames:4,fps:6,...S3_NATIVE},crouchDown:{src:'assets/mogurodon-s3-crouch-down.png',frames:5,fps:22,once:true,...S3_NATIVE},crouchUp:{src:'assets/mogurodon-s3-crouch-up.png',frames:5,fps:22,once:true,...S3_NATIVE},
   climbGrab:{src:'assets/mogurodon-s3-climb-grab.png',frames:5,fps:20,once:true,...S3_NATIVE},climb:{src:'assets/mogurodon-s3-climb.png',frames:8,fps:12,...S3_NATIVE},
   climbMantle:{src:'assets/mogurodon-s3-climb-mantle.png',frames:9,fps:20,once:true,...S3_NATIVE},climbPunch:{src:'assets/mogurodon-s3-climb-punch.png',frames:8,fps:24,once:true,impact:5,...S3_NATIVE},
   ultRoar:{src:'assets/mogurodon-s3-ult-roar.png',frames:8,fps:14,once:true,impact:5,...S3_NATIVE},ultPound:{src:'assets/mogurodon-s3-ult-pound.png',frames:16,fps:30,...S3_NATIVE},
   grab:{src:'assets/mogurodon-s3-grab.png',frames:9,fps:22,once:true,...S3_NATIVE,hold:[[195,191],[206,191],[219,191],[217,191],[215,191],[211,191],[202,150],[196,100],[134,25]]},
   carry:{src:'assets/mogurodon-s3-carry.png',frames:4,fps:6,...S3_NATIVE,hold:[[134,25],[134,24],[134,23],[134,24]]},
   carryWalk:{src:'assets/mogurodon-s3-carry-walk.png',frames:8,fps:10,...S3_NATIVE,hold:[[134,25],[140,24],[149,24],[158,24],[162,24],[157,24],[150,24],[140,24]]},
   throw:{src:'assets/mogurodon-s3-throw.png',frames:8,fps:18,once:true,...S3_NATIVE}}}}},
};
// Resolves the form drawn for a kaiju at a stage (stage omitted = base form).
function form(name:string,stage?:number):Form|undefined{const s=SPRITES[name];return s&&((stage&&s.stages?.[stage])||s);}
function preload(src:string){if(typeof Image==='undefined'||images.has(src))return;const img=new Image();img.src=src;images.set(src,img);}
function ready(src?:string){const img=src?images.get(src):null;return !!img?.complete&&!!img.naturalWidth;}
export function loadPresentationArt(){for(const src of [ART_SLOTS.menu,...ART_SLOTS.intro,...Object.values(ART_SLOTS.endings),...Object.values(SPRITES).flatMap(s=>[s,...Object.values(s.stages??{})].flatMap(f=>Object.values(f.anims).map(a=>a.src)))])if(src)preload(src);}
export function hasAnim(name:string,anim:string,stage?:number){return ready(form(name,stage)?.anims[anim]?.src);}
export function hasSprite(name:string,stage?:number){return ready(form(name,stage)?.anims.idle?.src);}
function strip(name:string,anim:string,stage?:number){const a=form(name,stage)?.anims;return a?.[anim]&&ready(a[anim].src)?a[anim]:a?.idle;}
export function spriteFrame(name:string,t:number,anim='idle',stage?:number){const a=strip(name,anim,stage);if(!a)return 0;const f=Math.floor(Math.max(0,t)*a.fps);return a.once?Math.min(f,a.frames-1):f%a.frames;}
// Gameplay timing (attack length, intros, impact frame) is data only so headless runs match the browser. A stage form that has not
// animated a strip yet borrows the base form's timing, so combat plays identically while the art catches up.
function timing(name:string,anim:string,stage?:number){return form(name,stage)?.anims[anim]??SPRITES[name]?.anims[anim];}
// Seconds from the start of a strip to its impact frame; 0 if none.
export function animImpact(name:string,anim:string,stage?:number){const a=timing(name,anim,stage);return a?.impact?a.impact/a.fps:0;}
// Seconds a one-shot animation runs; 0 if this kaiju has no such strip (callers then skip it).
export function animDuration(name:string,anim:string,stage?:number){const a=timing(name,anim,stage);return a?a.frames/a.fps:0;}
// Where a carried prop's bottom-centre sits in this frame, relative to the feet origin in unflipped, unscaled sprite units (the caller
// applies facing and Stage scale). Null when the strip has no hold points or its art is not loaded (the caller keeps its fallback).
export function holdPoint(name:string,anim:string,t:number,stage?:number):[number,number]|null{
 const s=form(name,stage),a=s?.anims[anim];if(!s||!a?.hold||!ready(a.src))return null;
 const img=images.get(a.src)!,fw=img.naturalWidth/a.frames,k=s.width/(256*(a.scale??1)),f=spriteFrame(name,t,anim,stage);
 const p=(typeof a.hold[0]==='number'?a.hold:(a.hold as number[][])[f]) as number[];
 return [(p[0]-(a.anchor??fw/2))*k,-(img.naturalHeight-1-p[1])*k];}
// Draws at the current origin (feet) in the caller's scaled space; flipping and Stage scale come from the caller's transform.
export function drawSprite(ctx:CanvasRenderingContext2D,name:string,t=0,anim='idle',stage?:number){if(!hasSprite(name,stage))return false;
 const s=form(name,stage)!,a=strip(name,anim,stage)!,img=images.get(a.src)!,fw=img.naturalWidth/a.frames,k=s.width/(256*(a.scale??1)),w=fw*k,h=img.naturalHeight*k;
 const smooth=ctx.imageSmoothingEnabled,sx=spriteFrame(name,t,anim,stage)*fw,fh=img.naturalHeight,dx=-(a.anchor??fw/2)*k;
 // Enlarged sprites (Stage 3, title art): nearest-neighbour at a non-integer zoom doubles some source pixels and not others, so
 // lines change thickness and crawl as the sprite moves. Scale up by a whole number first, then smooth down to the target size.
 const m=ctx.getTransform?.(),zoom=m?Math.hypot(m.a,m.b)*k:0,even=zoom>1.01?evenPixels(img,sx,fw,fh,Math.ceil(zoom)):null;
 if(even){ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(even,0,0,even.width,even.height,dx,-h,w,h);}
 else{ctx.imageSmoothingEnabled=false;ctx.drawImage(img,sx,0,fw,fh,dx,-h,w,h);}
 ctx.imageSmoothingEnabled=smooth;return true;}
let scratch:HTMLCanvasElement|null=null;
// One frame of a strip, enlarged n times with hard pixel edges, on a reused scratch canvas. Null where there is no DOM (headless tests).
function evenPixels(img:HTMLImageElement,sx:number,fw:number,fh:number,n:number){
 if(typeof document==='undefined')return null;
 scratch??=document.createElement('canvas');const W=Math.round(fw*n),H=fh*n;
 if(scratch.width!==W||scratch.height!==H){scratch.width=W;scratch.height=H;}
 const c=scratch.getContext('2d');if(!c)return null;
 c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);c.drawImage(img,sx,0,fw,fh,0,0,W,H);return scratch;}
function art(ctx:CanvasRenderingContext2D,src:string|null){const img=src?images.get(src):null;if(!img?.complete||!img.naturalWidth)return false;ctx.drawImage(img,0,0,960,540);return true;}
function box(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function polygon(ctx:CanvasRenderingContext2D,points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
// Deliberately simple replaceable geometric stand-ins, not final sprite designs.
export function drawSilhouette(ctx:CanvasRenderingContext2D,name:string,x:number,y:number,size:number,t:number,locked=false,anim='idle',stage?:number){
 const index=Math.max(0,KAIJU.indexOf(name)),color=locked?'#172022':ROSTER[index].color;
 if(!locked&&hasSprite(name,stage)){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size,size);drawSprite(ctx,name,t,anim,stage);ctx.restore();return;}
 ctx.save();ctx.translate(Math.round(x),Math.round(y+(locked?0:Math.sin(t*2)*1.5)));ctx.scale(size,size);
 if(index===0){polygon(ctx,[[-27,-12],[-38,-24],[-29,-25],[-34,-42],[-23,-38],[-22,-59],[-10,-48],[0,-65],[12,-48],[25,-38],[37,-25],[26,-12]],color);box(ctx,16,-35,29,13,color);box(ctx,36,-32,10,9,color);}
 if(index===1){polygon(ctx,[[-44,-8],[-23,-30],[-17,-57],[2,-67],[13,-50],[14,-33],[39,-43],[43,-27],[23,-16],[18,-3]],color);polygon(ctx,[[-17,-44],[-32,-65],[-7,-51]],color);box(ctx,9,-60,27,13,color);polygon(ctx,[[21,-60],[24,-74],[29,-60]],color);}
 if(index===2){polygon(ctx,[[-47,-11],[-25,-23],[-28,-36],[-15,-30],[-8,-47],[1,-33],[15,-44],[23,-28],[40,-27],[47,-17],[26,-9]],color);box(ctx,-25,-22,54,16,color);}
 if(index===3){box(ctx,-31,-43,54,35,color);box(ctx,12,-33,28,23,color);box(ctx,32,-26,14,13,color);polygon(ctx,[[29,-16],[41,-35],[41,-16]],locked?color:'#e1d5b9');polygon(ctx,[[-30,-40],[-25,-56],[-17,-40]],color);}
 if(index===4){polygon(ctx,[[-7,-40],[-42,-66],[-43,-36],[-7,-19]],color);polygon(ctx,[[6,-40],[37,-66],[40,-36],[6,-19]],color);box(ctx,-10,-52,20,45,color);box(ctx,-8,-65,17,16,color);box(ctx,-14,-77,3,18,color);box(ctx,11,-77,3,18,color);}
 if(index===5){polygon(ctx,[[-26,-6],[-25,-48],[-13,-64],[-5,-47],[5,-71],[17,-57],[24,-31],[34,-6]],color);for(let n=0;n<6;n++){const px=-39+n*15;polygon(ctx,[[px,-1],[px-7,-28-n%2*15],[px+2,-20],[px+8,-2]],color);}}
 if(index!==5){box(ctx,-25,-11,13,12,color);box(ctx,10,-11,15,12,color);}
 if(!locked){box(ctx,index===3?29:index===2?35:18,index===4?-59:index===5?-45:index===1?-55:index===2?-23:-31,4,3,index===5?'#c9fbb1':'#f0b3d0');}
 ctx.restore();
}
function ruins(ctx:CanvasRenderingContext2D,color:string,ground=420){
 for(let n=0;n<17;n++){const x=n*63-12,h=55+(n*43%155);polygon(ctx,[[x,ground],[x,ground-h],[x+16,ground-h+14],[x+29,ground-h-5],[x+47,ground-h+8],[x+49,ground]],color);}
}
export function drawMenuBackdrop(ctx:CanvasRenderingContext2D,t:number){if(art(ctx,ART_SLOTS.menu))return;
 box(ctx,0,0,960,540,'#152125');box(ctx,0,220,960,220,'#343b35');ruins(ctx,'#27302f',414);
 for(let n=0;n<13;n++){const x=40+n*75,y=360-(n*31%100);polygon(ctx,[[x-16,y+30],[x-7,y-18],[x+2,y+5],[x+11,y-31],[x+20,y+30]],'#996d50');polygon(ctx,[[x-7,y+30],[x+1,y-4],[x+10,y+30]],'#c18f63');}
 box(ctx,0,416,960,124,'#182725');
 for(const [x,h] of [[40,123],[135,65],[790,88],[900,143]]){polygon(ctx,[[x-29,540],[x-24,540-h*.5],[x,540-h],[x+26,540-h*.6],[x+39,540]],'#a85f88');polygon(ctx,[[x-8,540],[x,540-h+9],[x+13,540-h*.6]],'#eb9ec8');}
 box(ctx,0,0,960,540,'#0c171544');
}
export function drawIntro(ctx:CanvasRenderingContext2D,elapsed:number){const scene=introScene(elapsed);if(art(ctx,ART_SLOTS.intro[scene]))return;
 box(ctx,0,0,960,540,scene<2?'#101f2d':'#263936');
 if(scene===0){for(let i=0;i<44;i++)box(ctx,(i*173+29)%960,(i*97+13)%390,2,2,'#c1d2cb');polygon(ctx,[[120,65],[590,250],[553,283]],'#a88883');polygon(ctx,[[476,240],[585,266],[556,298],[513,286]],'#e5b4a5');ctx.fillStyle='#607f80';ctx.beginPath();ctx.arc(780,535,260,Math.PI,Math.PI*2);ctx.fill();}
 if(scene===1){box(ctx,0,315,960,225,'#6c7c6e');polygon(ctx,[[80,540],[280,300],[450,410],[600,280],[890,540]],'#3d5b52');polygon(ctx,[[460,360],[490,160],[523,348],[680,278],[584,405],[790,460],[550,455],[460,523],[410,445],[250,425],[404,389],[297,270]],'#d8a18a');}
 if(scene===2){box(ctx,0,370,960,170,'#59675a');polygon(ctx,[[230,465],[350,367],[622,367],[750,465]],'#2a443d');for(const [x,h] of [[380,105],[480,220],[575,135]]){polygon(ctx,[[x-30,450],[x-26,450-h*.6],[x,450-h],[x+32,450-h*.6],[x+38,450]],'#b8749b');polygon(ctx,[[x-5,447],[x,450-h+10],[x+14,450-h*.55]],'#ffd0e5');}}
 if(scene===3){box(ctx,0,220,960,280,'#7b9284');ruins(ctx,'#3e5853',442);drawSilhouette(ctx,'Mogurodon',480,466,3.4,0);}
 const within=elapsed%3,fade=Math.max(0,.35-within)/.35;box(ctx,0,0,960,540,`rgba(9,17,23,${fade})`);
}
export function drawEnding(ctx:CanvasRenderingContext2D,name:string){if(art(ctx,ART_SLOTS.endings[name]))return;
 const index=Math.max(0,KAIJU.indexOf(name));box(ctx,0,0,960,540,['#475952','#624c41','#4b5d4c','#63574a','#514d62','#37574c'][index]);box(ctx,0,150,960,320,'#718276');ruins(ctx,'#344e46',440);drawSilhouette(ctx,name,720,455,4,0);box(ctx,0,435,960,105,'#253d34');box(ctx,0,0,960,540,'#0b171755');
}
