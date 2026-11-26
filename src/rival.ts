// M4 conventional-HP rival: shared temporary moveset so the campaign is playable.
// M5 replaces this with individual kaiju attacks, stages and Ultimate behavior.
import {groundAt} from './terrain.ts';
import {CAMPAIGN as P,CONFIG as C,KAIBAN_BOSS as KB,TLEZCATL_BOSS as TB,EMPIRE as EM} from './config.ts';
import {partHit,solidParts} from './hitbox.ts';
import {overlaps,solid,damageBuilding} from './rules.ts';import type {Building} from './rules.ts';
import {segmentHits} from './military.ts';import type {Rect} from './military.ts';
export type Rival=Rect&{hp:number,maxHP:number,dead:boolean,face:number,turn:number,cooldown:number,windup:number,attack:'melee'|'ranged'|'shotgun'|'stampede'|'jet'|'lob'|'dive'|'erupt',stagger:number,kb:number,shots:{x:number,y:number,vx:number,life:number}[],
 // The Golden Gate finale (src/game.ts): `dormant` = waiting in the fog, untouchable; `hidden` = vanished into the fog (untargetable);
 // `retreats` = at 0 health it retreats instead of falling (`retreating`, then `retreated` once gone, which also sets `dead`); `alpha` = how visible it is.
 dormant?:boolean,hidden?:boolean,retreats?:boolean,retreating?:boolean,retreated?:boolean,alpha?:number,
 // Kaiban's boss moves (KAIBAN_BOSS): `kaiban` switches them on; `rocks` = Debris Shotgun chunks in flight; `charge` = a Stampede under way
 // (`dir`, px run `ran`, `hit` once it has struck the kaiju); `combo` counts attacks for the pattern, `streak` the barges in a row.
 kaiban?:boolean,rocks?:Rock[],charge?:{dir:number,ran:number,hit:boolean}|null,combo?:number,streak?:number,
 // Tlézcatl's boss moves (TLEZCATL_BOSS): `tlez` switches them on; `flame` = a Flame Jet cone sweeping (origin `mx,my`, `angle` degrees above level, `len` after
 // the first building or the street cut it short, `street` the x where it met the street); `globs` = lava in flight; `pools` = lava pools and fire patches on the
 // street (`y` the surface, `fire` for jet patches); `dive` = a Magma Dive leap under way; `mark` = the x a dive will land on (locked in the crouch); `ring` = the
 // slam's lava ring for drawing; `erupted` = the one Eruption is spent. `combo` counts his attacks for the Dive's rhythm.
 tlez?:boolean,flame?:Flame|null,globs?:Glob[],pools?:Pool[],dive?:{t:number,x0:number,x1:number,y0:number,y1:number}|null,mark?:number,ring?:{x:number,y:number,t:number}|null,erupted?:boolean,burn?:number,
 // The Empire State finale (src/game.ts tickClimbFinale): `perch` = the ledge he stands on (`y` the surface, `x0`..`x1` where he may stand); while set he owns his height (no snapping
 // to the street), never Magma Dives, flames steeply down the wall and his lava lands on the setback below the kaiju.
 perch?:{x0:number,x1:number,y:number}|null};
export type Flame={t:number,tick:number,mx:number,my:number,angle:number,len:number,street:number|null,hit:boolean};
export type Glob={x:number,y:number,vx:number,vy:number,grav:number,floor:number,damage:number,size:number,pool:number,poolSeconds:number,life:number};
export type Pool={x:number,w:number,y:number,life:number,max:number,damage:number,fire?:boolean};
export type Rock={x:number,y:number,vx:number,vy:number,life:number};
export function createRival(worldWidth:number,city:number,boss=''):Rival{const hp=P.bossHP*(1+city*.1);return {x:worldWidth-250,y:groundAt(worldWidth-250+P.bossWidth/2)-P.bossHeight,w:P.bossWidth,h:P.bossHeight,hp,maxHP:hp,dead:false,face:-1,turn:0,cooldown:1.5,windup:0,attack:'melee',stagger:0,kb:0,shots:[],...(boss==='Kaiban'?{kaiban:true,rocks:[],charge:null,combo:0,streak:0}:{}),...(boss==='Tlézcatl'?{tlez:true,flame:null,globs:[],pools:[],dive:null,ring:null,combo:0,erupted:false}:{})};}
function clearKaiban(r:Rival){if(r.kaiban){r.rocks=[];r.charge=null;}if(r.tlez){r.flame=null;r.globs=[];r.pools=[];r.dive=null;r.ring=null;}}
const erupting=(r:Rival)=>!!r.tlez&&r.attack==='erupt'&&r.windup>0;
export function hitRival(r:Rival,damage:number,source='player',strength=0,direction=1){if(r.dead||r.retreating||r.dormant||r.hidden||source!=='player'||damage<=0)return 0;const actual=Math.min(r.hp,damage);r.hp-=actual;if(r.hp<=0&&r.retreats){r.hp=0;r.retreating=true;r.windup=0;r.shots=[];r.kb=0;clearKaiban(r);}else if(r.hp<=0){r.dead=true;r.windup=0;r.shots=[];r.kb=0;clearKaiban(r);}else if(erupting(r)){if(strength>=TB.eruptBreak){r.windup=0;r.stagger=Math.max(r.stagger,TB.eruptStagger);r.cooldown=TB.eruptStagger+TB.eruptCooldown;r.kb=direction*strength*.4;}}
 else if(strength>=150&&!r.charge&&!r.flame&&!r.dive){r.stagger=Math.max(r.stagger,.3);r.windup=0;r.kb=direction*strength*.4;}return actual;}
export function tickRival(r:Rival,dt:number,player:Rect,worldWidth:number,buildings:Building[]){
 const hits:{damage:number,strength:number,direction:number}[]=[];if(r.dead||r.retreating)return hits;
 const desired=player.x+player.w/2>=r.x+r.w/2?1:-1;
 // Kaiban locks his facing for a Stampede (the bellow shows the lane, the charge runs down it).
 if(r.charge||r.flame||r.dive||(r.attack==='stampede'&&r.windup>0)||(r.tlez&&r.attack!=='melee'&&r.windup>0)){r.turn=0;}
 else if(desired!==r.face){r.turn+=dt;if(r.turn>=P.bossTurnDelay){r.face=desired;r.turn=0;}}else r.turn=0;
 r.cooldown=Math.max(0,r.cooldown-dt);r.stagger=Math.max(0,r.stagger-dt);
 if(r.stagger<=0){
 if(r.windup>0){r.windup=Math.max(0,r.windup-dt);if(r.windup===0){
 if(r.attack==='melee'){const box={x:r.face===1?r.x+r.w:r.x-P.bossRange,y:r.y,w:P.bossRange,h:r.h};if(overlaps(box,player))hits.push({damage:P.bossMeleeDamage,strength:P.bossKnockback,direction:r.face});}
 else if(r.attack==='shotgun')fanRocks(r);
 else if(r.attack==='stampede')r.charge={dir:r.face,ran:0,hit:false};
 else if(r.attack==='jet')r.flame={t:0,tick:0,mx:0,my:0,angle:TB.jetUp,len:0,street:null,hit:false};
 else if(r.attack==='lob')lobGlobs(r,player,worldWidth,buildings);
 else if(r.attack==='dive')r.dive={t:0,x0:r.x,x1:diveLanding(r,worldWidth),y0:r.y,y1:diveFloor(r,diveLanding(r,worldWidth))};
 else if(r.attack==='erupt')eruptBurst(r,worldWidth,buildings);
 else if(r.shots.length<P.bossShotCap)r.shots.push({x:r.x+r.w/2,y:r.y+r.h*.6,vx:r.face*P.bossShotSpeed,life:P.bossShotLife});
 r.cooldown=r.attack==='melee'?P.bossMeleeCooldown:r.attack==='shotgun'?KB.shotgunCooldown:r.attack==='stampede'?0:r.attack==='lob'?TB.lobCooldown:r.attack==='jet'||r.attack==='dive'?0:r.attack==='erupt'?TB.eruptRecover+TB.eruptCooldown:P.bossRangedCooldown;
 if(r.attack==='erupt')r.stagger=TB.eruptRecover;
 }}else if(r.charge){stampede(r,dt,player,worldWidth,buildings,hits);}
 else if(r.flame){tickFlame(r,dt,player,worldWidth,buildings,hits);}
 else if(r.dive){tickDive(r,dt,player,hits);}
 else{
 const distance=Math.abs(player.x+player.w/2-r.x-r.w/2);
 let nx=r.x+(distance>P.bossRange+r.w*.5?r.face*(r.kaiban?KB.speed:r.tlez?TB.speed:P.bossSpeed)*dt:0)+r.kb*dt;
 if(!r.perch)for(const b of buildings){const p=solid(b)?partHit(b,{x:nx,y:r.y,w:r.w,h:r.h},true):null;if(!p)continue;
 nx=r.face>0?p.x-r.w:p.x+p.w;if(r.cooldown===0){damageBuilding(b,95,'impact');r.cooldown=1;}break;
 }
 if(overlaps({x:nx,y:r.y,w:r.w,h:r.h},player))nx=r.face>0?player.x-r.w:player.x+player.w;
 if(r.perch){r.x=Math.max(r.perch.x0,Math.min(r.perch.x1-r.w,nx));r.y=r.perch.y-r.h;}else{r.x=Math.max(0,Math.min(worldWidth-r.w,nx));r.y=groundAt(r.x+r.w/2)-r.h;}
 if(r.cooldown===0){
  if(r.tlez){const n=r.combo=(r.combo??0)+1,close=distance<P.bossRange+r.w,frac=r.hp/r.maxHP;
   // On a ledge the gap to the kaiju matters: well below him is a flame down the wall (close in) or a lob onto the setback it stands on.
   const gap=r.perch?player.y+player.h-feet(r):0,below=gap>140,above=gap<-140;
   const move:Rival['attack']=!r.erupted&&frac<TB.eruptBelow?'erupt':!r.perch&&frac<TB.diveBelow&&n%TB.diveEvery===0?'dive':below?(gap<=260&&distance<=200?'jet':'lob'):above?'lob':close?'melee':distance>=TB.far?'lob':'jet';
   if(move==='erupt')r.erupted=true;if(move==='dive')r.mark=Math.max(0,Math.min(worldWidth,player.x+player.w/2));
   r.attack=move;r.windup=move==='melee'?P.bossTelegraph:move==='jet'?TB.jetTelegraph:move==='lob'?TB.lobTelegraph:move==='dive'?TB.diveTelegraph:TB.eruptCharge;}
  else if(r.kaiban){const n=r.combo=(r.combo??0)+1,close=distance<P.bossRange+r.w;
   const move:'melee'|'shotgun'|'stampede'=close?((r.streak??0)>=KB.meleeStreak?'stampede':'melee'):distance>=KB.far?'stampede':n%3===0?'stampede':'shotgun';
   r.streak=move==='melee'?(r.streak??0)+1:0;r.attack=move;r.windup=move==='melee'?P.bossTelegraph:move==='shotgun'?KB.shotgunTelegraph:KB.stampedeTelegraph;}
  else{r.attack=distance<P.bossRange+r.w?'melee':'ranged';r.windup=P.bossTelegraph;}}
 }}
 r.kb*=Math.exp(-8*dt);
 for(const p of r.shots){const old=p.x;p.x+=p.vx*dt;p.life-=dt;if(segmentHits(old,p.y,p.x,p.y,player,3)){hits.push({damage:P.bossShotDamage,strength:0,direction:Math.sign(p.vx)});p.life=0;}}
 r.shots=r.shots.filter(p=>p.life>0&&p.x>=0&&p.x<worldWidth);
 if(r.rocks?.length)tickRocks(r,dt,player,worldWidth,buildings,hits);
 if(r.tlez)tickLava(r,dt,player,worldWidth,buildings,hits);return hits;
}
// Debris Shotgun: a fan of chunks off the tusks, flat ones fast, high ones lobbed (the player's version, thrown the other way).
function fanRocks(r:Rival){const n=KB.rocks,[a0,a1]=KB.rockAngle,[v0,v1]=KB.rockSpeed;r.rocks??=[];if(r.rocks.length+n>KB.rockCap)return;
 for(let i=0;i<n;i++){const t=n>1?i/(n-1):0,a=(a0+(a1-a0)*t)*Math.PI/180,v=v1+(v0-v1)*t;
  r.rocks.push({x:r.x+r.w/2+r.face*r.w*.45,y:r.y+r.h*.6,vx:r.face*Math.cos(a)*v,vy:-Math.sin(a)*v,life:KB.rockLife});}}
// Each chunk stops on the first thing it meets: the kaiju, a building, or the street.
function tickRocks(r:Rival,dt:number,player:Rect,worldWidth:number,buildings:Building[],hits:{damage:number,strength:number,direction:number}[]){
 const s=KB.rockSize;
 for(const k of r.rocks!){k.vy+=KB.rockGravity*dt;k.x+=k.vx*dt;k.y+=k.vy*dt;k.life-=dt;const box={x:k.x-s/2,y:k.y-s/2,w:s,h:s};
  if(overlaps(box,player)){hits.push({damage:KB.rockDamage,strength:KB.rockKnock,direction:Math.sign(k.vx)||1});k.life=0;continue;}
  for(const b of buildings)if(solid(b)&&partHit(b,box,true)){damageBuilding(b,KB.rockDamage*3,'impact');k.life=0;break;}
  if(k.y>=groundAt(k.x))k.life=0;}
 r.rocks=r.rocks!.filter(k=>k.life>0&&k.x>=0&&k.x<worldWidth);}
// Stampede: head down down the locked lane. One hit on the kaiju, every ordinary building in the way is flattened; towers and landmarks
// stop him. It cannot be staggered (see hitRival); afterwards he stands winded for stampedeRecover seconds.
function stampede(r:Rival,dt:number,player:Rect,worldWidth:number,buildings:Building[],hits:{damage:number,strength:number,direction:number}[]){
 const c=r.charge!,step=KB.stampedeSpeed*dt;let nx=Math.max(0,Math.min(worldWidth-r.w,r.x+c.dir*step)),stopped=nx===r.x;
 for(const b of buildings){if(!solid(b)||!partHit(b,{x:nx,y:r.y,w:r.w,h:r.h},true))continue;
  if(b.landmark||b.deco==='btower'){const p=partHit(b,{x:nx,y:r.y,w:r.w,h:r.h},true)!;nx=c.dir>0?p.x-r.w:p.x+p.w;stopped=true;break;}
  damageBuilding(b,b.hpNow,'impact');}
 c.ran+=Math.abs(nx-r.x);r.x=nx;r.y=groundAt(r.x+r.w/2)-r.h;
 if(!c.hit&&overlaps({x:r.x,y:r.y,w:r.w,h:r.h},player)){c.hit=true;hits.push({damage:KB.stampedeDamage,strength:KB.stampedeKnock,direction:c.dir});}
 if(stopped||c.ran>=KB.stampedeReach){r.charge=null;r.stagger=KB.stampedeRecover;r.cooldown=KB.stampedeRecover+.8;r.face=desiredFace(r,player);}
}
const desiredFace=(r:Rival,player:Rect)=>player.x+player.w/2>=r.x+r.w/2?1:-1;

// ---- Tlézcatl's kit (TLEZCATL_BOSS). Everything is measured from his own feet (`r.y+r.h`), so it works on the street or any roof he stands on.
type Hit={damage:number,strength:number,direction:number};
const feet=(r:Rival)=>r.y+r.h,mouth=(r:Rival)=>({x:r.x+r.w/2+r.face*r.w*.45,y:r.y+r.h*.32}),lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
// Flame Jet: the cone's centre line is walked out from the jaws until a building or the street stops it.
function tickFlame(r:Rival,dt:number,player:Rect,worldWidth:number,buildings:Building[],hits:Hit[]){
 const f=r.flame!;f.t+=dt;const k=Math.min(1,f.t/(TB.jetSweep*.7)),m=mouth(r);f.mx=m.x;f.my=m.y;f.angle=lerp(r.perch?EM.jetUp:TB.jetUp,r.perch?EM.jetDown:TB.jetDown,k);
 const a=f.angle*Math.PI/180,dx=r.face*Math.cos(a),dy=-Math.sin(a);let len=TB.jetRange,hitB:Building|null=null,hitP:{x:number,y:number}|null=null,roof:number|null=null;f.street=null;
 for(let d=0;d<=TB.jetRange;d+=6){const x=f.mx+dx*d,y=f.my+dy*d;
  if(x<0||x>worldWidth){len=d;break;}
  if(y>=groundAt(x)){len=d;f.street=x;break;}
  const b=buildings.find(b=>solid(b)&&partHit(b,{x:x-2,y:y-2,w:4,h:4},true));if(b){len=d;hitB=b;hitP={x,y};const q=partHit(b,{x:x-2,y:y-2,w:4,h:4},true)!;if(r.perch&&y-q.y<=14)roof=q.y;break;}}
 f.len=len;f.tick-=dt;
 while(f.tick<=0&&f.t<TB.jetSweep+TB.jetTick){f.tick+=TB.jetTick;
  if(coneHits(f,r.face,player)){hits.push({damage:TB.jetDamage,strength:f.hit?0:TB.jetKnock,direction:r.face});f.hit=true;}
  if(hitB)damageBuilding(hitB,TB.jetBuilding,'impact');
  // Flame washing a ledge leaves fire patches on it, as it does on the street.
  if(roof!==null&&hitP){const half=lerp(TB.jetWidth[0],TB.jetWidth[1],len/TB.jetRange);for(let x=Math.floor((hitP.x-half)/TB.fireCell)*TB.fireCell;x<=hitP.x+half;x+=TB.fireCell)firePatch(r,x,roof);}
  if(f.street!==null){const half=lerp(TB.jetWidth[0],TB.jetWidth[1],len/TB.jetRange);
   for(let x=Math.floor((f.street-half)/TB.fireCell)*TB.fireCell;x<=f.street+half;x+=TB.fireCell)firePatch(r,x,groundAt(x+TB.fireCell/2));}}
 if(f.t>=TB.jetSweep){r.flame=null;r.stagger=TB.jetRecover;r.cooldown=TB.jetRecover+TB.jetCooldown;r.face=player.x+player.w/2>=r.x+r.w/2?1:-1;}
}
// The cone widens from jetWidth[0] at the jaws to jetWidth[1] at its tip; checked as boxes marched along its centre line.
function coneHits(f:Flame,face:number,box:Rect){const a=f.angle*Math.PI/180,dx=face*Math.cos(a),dy=-Math.sin(a);
 for(let d=0;d<=f.len;d+=8){const w=lerp(TB.jetWidth[0],TB.jetWidth[1],d/TB.jetRange);if(overlaps({x:f.mx+dx*d-w,y:f.my+dy*d-w,w:w*2,h:w*2},box))return true;}return false;}
// Cones of the flame that is live, for the drawing and the tests: the same boxes the hit check uses.
export function flameBoxes(r:Rival):Rect[]{const f=r.flame;if(!f)return [];const a=f.angle*Math.PI/180,dx=r.face*Math.cos(a),dy=-Math.sin(a),out:Rect[]=[];
 for(let d=0;d<=f.len;d+=8){const w=lerp(TB.jetWidth[0],TB.jetWidth[1],d/TB.jetRange);out.push({x:f.mx+dx*d-w,y:f.my+dy*d-w,w:w*2,h:w*2});}return out;}
function addPool(r:Rival,p:Pool){const ps=r.pools!;ps.push(p);if(ps.length>TB.poolCap)ps.splice(ps.indexOf(ps.reduce((m,q)=>q.life<m.life?q:m)),1);}
// Fire patches: one per cell, topped back up while the flame keeps washing it; at most fireCap of them.
function firePatch(r:Rival,x:number,y:number){const old=r.pools!.find(p=>p.fire&&p.x===x);if(old){old.life=old.max;return;}
 const fires=r.pools!.filter(p=>p.fire);if(fires.length>=TB.fireCap)r.pools!.splice(r.pools!.indexOf(fires.reduce((m,q)=>q.life<m.life?q:m)),1);
 r.pools!.push({x,w:TB.fireCell,y,life:TB.fireSeconds,max:TB.fireSeconds,damage:TB.fireDamage,fire:true});}
// Lava globs: ballistic, stop on the first thing they fall onto (never on the way up). `floor` is the surface they were aimed at.
function launch(r:Rival,x0:number,y0:number,land:number,floor:number,T:number,g:number,damage:number,pool:number,seconds:number){
 // From a ledge the arc rises EM.lobApex above the jaws first (and takes as long as that needs), so it clears the lip of his own ledge on the way to the setback below.
 if(r.perch){const vy=-Math.sqrt(2*g*EM.lobApex),t=(-vy+Math.sqrt(vy*vy+2*g*Math.max(0,floor-2-y0)))/g;r.globs!.push({x:x0,y:y0,vx:(land-x0)/t,vy,grav:g,floor,damage,size:TB.lobSize,pool,poolSeconds:seconds,life:t+1});return;}
 r.globs!.push({x:x0,y:y0,vx:(land-x0)/T,vy:(floor-2-y0-.5*g*T*T)/T,grav:g,floor,damage,size:TB.lobSize,pool,poolSeconds:seconds,life:T+1});}
// From a ledge the globs fall onto the highest roof under the landing spot that is below the jaws (a lower setback), else the street.
export function surfaceBelow(buildings:Building[],x:number,y:number){let s=groundAt(x);for(const b of buildings)if(solid(b))for(const p of solidParts(b))if(x>=p.x&&x<=p.x+p.w&&p.y>=y&&p.y<s)s=p.y;return s;}
const landFloor=(r:Rival,buildings:Building[],x:number,y:number)=>r.perch?surfaceBelow(buildings,x,y):groundAt(x);
// A magma pool put down by the finale (the wake's split street): burns like any pool of his.
export function lavaPool(r:Rival,x:number,w:number,y:number,seconds:number,damage=TB.lobPoolDamage){r.pools??=[];addPool(r,{x,w,y,life:seconds,max:seconds,damage});}
function lobGlobs(r:Rival,player:Rect,worldWidth:number,buildings:Building[]){const m=mouth(r),n=TB.lobs,cx=player.x+player.w/2;
 for(let i=0;i<n;i++){const land=Math.max(0,Math.min(worldWidth,cx+(i-(n-1)/2)*TB.lobSpread)),T=lerp(TB.lobFlight[0],TB.lobFlight[1],n>1?i/(n-1):0);
  launch(r,m.x,m.y,land,landFloor(r,buildings,land,m.y),T,TB.lobGravity,TB.lobDamage,TB.lobPool,TB.lobPoolSeconds);}}
// Eruption: a burst of globs out of his middle onto random spots either side, each leaving a pool.
function eruptBurst(r:Rival,worldWidth:number,buildings:Building[]){const cx=r.x+r.w/2,cy=r.y+r.h*.4;
 for(let i=0;i<TB.eruptGlobs;i++){const land=Math.max(0,Math.min(worldWidth,cx+(Math.random()*2-1)*TB.eruptRange)),T=lerp(TB.eruptFlight[0],TB.eruptFlight[1],Math.random());
  launch(r,cx,cy,land,landFloor(r,buildings,land,cy),T,TB.eruptGravity,TB.eruptGlobDamage,TB.eruptPool,TB.eruptPoolSeconds);}}
// Magma Dive: lands where the kaiju stood when the crouch began, at most diveRange away; on a roof he stays at his own height.
const diveLanding=(r:Rival,worldWidth:number)=>{const c=Math.max(r.x+r.w/2-TB.diveRange,Math.min(r.x+r.w/2+TB.diveRange,r.mark??r.x+r.w/2));return Math.max(0,Math.min(worldWidth-r.w,c-r.w/2));};
const diveFloor=(r:Rival,x:number)=>feet(r)<groundAt(r.x+r.w/2)-2?r.y:groundAt(x+r.w/2)-r.h;
function tickDive(r:Rival,dt:number,player:Rect,hits:Hit[]){
 const d=r.dive!;d.t+=dt;const k=Math.min(1,d.t/TB.diveFlight);r.x=lerp(d.x0,d.x1,k);r.y=lerp(d.y0,d.y1,k)-4*TB.diveHeight*k*(1-k);if(k<1)return;
 r.dive=null;r.y=d.y1;r.face=player.x+player.w/2>=r.x+r.w/2?1:-1;r.stagger=TB.diveRecover;r.cooldown=TB.diveRecover+TB.diveCooldown;
 const cx=r.x+r.w/2,fy=feet(r),pcx=player.x+player.w/2;r.ring={x:cx,y:fy,t:0};
 // The slam hurts anyone close to the street; a kaiju that jumped it clears it.
 if(Math.abs(pcx-cx)<=TB.diveRadius+player.w/2&&player.y+player.h>fy-60)hits.push({damage:TB.diveDamage,strength:TB.diveKnock,direction:pcx>=cx?1:-1});
 addPool(r,{x:cx-TB.divePool/2,w:TB.divePool,y:fy,life:TB.lobPoolSeconds,max:TB.lobPoolSeconds,damage:TB.lobPoolDamage});
 // The ring: diveGlobs globs both ways, flat and fast to high and slow, each splashing a small pool where it reaches the surface.
 const n=Math.max(1,Math.floor(TB.diveGlobs/2)),[a0,a1]=TB.diveGlobAngle,[v0,v1]=TB.diveGlobSpeed;
 for(const dir of [-1,1])for(let i=0;i<n;i++){const t=n>1?i/(n-1):0,a=lerp(a0,a1,t)*Math.PI/180,v=lerp(v1,v0,t);
  r.globs!.push({x:cx,y:fy-10,vx:dir*Math.cos(a)*v,vy:-Math.sin(a)*v,grav:1100,floor:fy,damage:TB.diveGlobDamage,size:TB.lobSize-2,pool:TB.lobPool*.6,poolSeconds:TB.lobPoolSeconds,life:3});}
}
// Globs in flight and pools underfoot, every tick whatever he is doing.
function tickLava(r:Rival,dt:number,player:Rect,worldWidth:number,buildings:Building[],hits:Hit[]){
 if(r.ring){r.ring.t+=dt;if(r.ring.t>.6)r.ring=null;}
 for(const g of r.globs!){g.vy+=g.grav*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.life-=dt;if(g.vy<=0)continue;const box={x:g.x-g.size/2,y:g.y-g.size/2,w:g.size,h:g.size};
  if(overlaps(box,player)){hits.push({damage:g.damage,strength:TB.lobKnock,direction:Math.sign(g.vx)||1});g.life=0;continue;}
  // A glob that meets the roof it was aimed at (a lower setback) splashes there; anything else it meets is a wall.
  const wall=buildings.find(b=>solid(b)&&partHit(b,box,true));
  if(wall){const q=partHit(wall,box,true)!;g.life=0;if(Math.abs(q.y-g.floor)<=8)addPool(r,{x:g.x-g.pool/2,w:g.pool,y:g.floor,life:g.poolSeconds,max:g.poolSeconds,damage:TB.lobPoolDamage});else damageBuilding(wall,g.damage*2,'impact');continue;}
  if(g.y>=g.floor-2){g.life=0;addPool(r,{x:g.x-g.pool/2,w:g.pool,y:g.floor,life:g.poolSeconds,max:g.poolSeconds,damage:TB.lobPoolDamage});}}
 r.globs=r.globs!.filter(g=>g.life>0&&g.x>=0&&g.x<worldWidth);
 // However many pools and patches the kaiju stands across, it burns once per fireTick (for the worst of them), not once each.
 r.burn=Math.max(0,(r.burn??0)-dt);let worst=0;
 for(const p of r.pools!){p.life-=dt;const h=p.fire?TB.fireHeight:16;if(overlaps({x:p.x,y:p.y-h,w:p.w,h:h+2},player))worst=Math.max(worst,p.damage);}
 if(worst>0&&r.burn===0){r.burn=TB.fireTick;hits.push({damage:worst,strength:0,direction:1});}
 r.pools=r.pools!.filter(p=>p.life>0);
}
