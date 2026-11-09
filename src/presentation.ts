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
type Strip={src:string,frames:number,fps:number,once?:boolean};
export const SPRITES:Record<string,{width:number,anims:Record<string,Strip>}>={
 Mogurodon:{width:120,anims:{idle:{src:'assets/mogurodon-idle.png',frames:8,fps:8},walk:{src:'assets/mogurodon-walk.png',frames:8,fps:10},
  swipeLeft:{src:'assets/mogurodon-swipe-left.png',frames:10,fps:26,once:true},swipeRight:{src:'assets/mogurodon-swipe-right.png',frames:8,fps:24,once:true},bite:{src:'assets/mogurodon-bite.png',frames:8,fps:20,once:true},
  // Heavy strips are 256x192 (extra headroom for rearing); feet share the same baseline as the 256x144 strips.
  heavyRear:{src:'assets/mogurodon-heavy-rear.png',frames:5,fps:20,once:true},heavyHold:{src:'assets/mogurodon-heavy-hold.png',frames:4,fps:10},heavySlam:{src:'assets/mogurodon-heavy-slam.png',frames:9,fps:18,once:true},
  rangedStand:{src:'assets/mogurodon-ranged-stand.png',frames:9,fps:20,once:true},rangedCrouch:{src:'assets/mogurodon-ranged-crouch.png',frames:8,fps:20,once:true},
  // Crouch art is drawn at full size (~60% of standing height); crouchUp is crouchDown reversed.
  crouch:{src:'assets/mogurodon-crouch.png',frames:4,fps:6},crouchDown:{src:'assets/mogurodon-crouch-down.png',frames:5,fps:22,once:true},crouchUp:{src:'assets/mogurodon-crouch-up.png',frames:5,fps:22,once:true},
  // Jump strips are 256x192, bottom-aligned: physics moves him, the art only changes pose.
  jumpRise:{src:'assets/mogurodon-jump-rise.png',frames:9,fps:24,once:true},jumpAir:{src:'assets/mogurodon-jump-air.png',frames:4,fps:8},jumpLand:{src:'assets/mogurodon-jump-land.png',frames:5,fps:20,once:true}}},
};
function preload(src:string){if(typeof Image==='undefined'||images.has(src))return;const img=new Image();img.src=src;images.set(src,img);}
function ready(src?:string){const img=src?images.get(src):null;return !!img?.complete&&!!img.naturalWidth;}
export function loadPresentationArt(){for(const src of [ART_SLOTS.menu,...ART_SLOTS.intro,...Object.values(ART_SLOTS.endings),...Object.values(SPRITES).flatMap(s=>Object.values(s.anims).map(a=>a.src))])if(src)preload(src);}
export function hasAnim(name:string,anim:string){return ready(SPRITES[name]?.anims[anim]?.src);}
export function hasSprite(name:string){return ready(SPRITES[name]?.anims.idle?.src);}
function strip(name:string,anim:string){const a=SPRITES[name]?.anims;return a?.[anim]&&ready(a[anim].src)?a[anim]:a?.idle;}
export function spriteFrame(name:string,t:number,anim='idle'){const a=strip(name,anim);if(!a)return 0;const f=Math.floor(Math.max(0,t)*a.fps);return a.once?Math.min(f,a.frames-1):f%a.frames;}
// Seconds a one-shot animation runs; 0 if this kaiju has no such strip (callers then skip it).
export function animDuration(name:string,anim:string){const a=SPRITES[name]?.anims[anim];return a?a.frames/a.fps:0;}
// Draws at the current origin (feet) in the caller's scaled space; flipping and Stage scale come from the caller's transform.
export function drawSprite(ctx:CanvasRenderingContext2D,name:string,t=0,anim='idle'){if(!hasSprite(name))return false;const s=SPRITES[name],a=strip(name,anim)!,img=images.get(a.src)!,fw=img.naturalWidth/a.frames,h=s.width*img.naturalHeight/fw;const smooth=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,spriteFrame(name,t,anim)*fw,0,fw,img.naturalHeight,-s.width/2,-h,s.width,h);ctx.imageSmoothingEnabled=smooth;return true;}
function art(ctx:CanvasRenderingContext2D,src:string|null){const img=src?images.get(src):null;if(!img?.complete||!img.naturalWidth)return false;ctx.drawImage(img,0,0,960,540);return true;}
function box(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function polygon(ctx:CanvasRenderingContext2D,points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
// Deliberately simple replaceable geometric stand-ins, not final sprite designs.
export function drawSilhouette(ctx:CanvasRenderingContext2D,name:string,x:number,y:number,size:number,t:number,locked=false,anim='idle'){
 const index=Math.max(0,KAIJU.indexOf(name)),color=locked?'#172022':ROSTER[index].color;
 if(!locked&&hasSprite(name)){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size,size);drawSprite(ctx,name,t,anim);ctx.restore();return;}
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
