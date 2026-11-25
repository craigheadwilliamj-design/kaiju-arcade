// M4 conventional-HP rival: shared temporary moveset so the campaign is playable.
// M5 replaces this with individual kaiju attacks, stages and Ultimate behavior.
import {groundAt} from './terrain.ts';
import {CAMPAIGN as P,CONFIG as C,KAIBAN_BOSS as KB} from './config.ts';
import {partHit} from './hitbox.ts';
import {overlaps,solid,damageBuilding} from './rules.ts';import type {Building} from './rules.ts';
import {segmentHits} from './military.ts';import type {Rect} from './military.ts';
export type Rival=Rect&{hp:number,maxHP:number,dead:boolean,face:number,turn:number,cooldown:number,windup:number,attack:'melee'|'ranged'|'shotgun'|'stampede',stagger:number,kb:number,shots:{x:number,y:number,vx:number,life:number}[],
 // The Golden Gate finale (src/game.ts): `dormant` = waiting in the fog, untouchable; `hidden` = vanished into the fog (untargetable);
 // `retreats` = at 0 health it retreats instead of falling (`retreating`, then `retreated` once gone, which also sets `dead`); `alpha` = how visible it is.
 dormant?:boolean,hidden?:boolean,retreats?:boolean,retreating?:boolean,retreated?:boolean,alpha?:number,
 // Kaiban's boss moves (KAIBAN_BOSS): `kaiban` switches them on; `rocks` = Debris Shotgun chunks in flight; `charge` = a Stampede under way
 // (`dir`, px run `ran`, `hit` once it has struck the kaiju); `combo` counts attacks for the pattern, `streak` the barges in a row.
 kaiban?:boolean,rocks?:Rock[],charge?:{dir:number,ran:number,hit:boolean}|null,combo?:number,streak?:number};
export type Rock={x:number,y:number,vx:number,vy:number,life:number};
export function createRival(worldWidth:number,city:number,boss=''):Rival{const hp=P.bossHP*(1+city*.1);return {x:worldWidth-250,y:groundAt(worldWidth-250+P.bossWidth/2)-P.bossHeight,w:P.bossWidth,h:P.bossHeight,hp,maxHP:hp,dead:false,face:-1,turn:0,cooldown:1.5,windup:0,attack:'melee',stagger:0,kb:0,shots:[],...(boss==='Kaiban'?{kaiban:true,rocks:[],charge:null,combo:0,streak:0}:{})};}
function clearKaiban(r:Rival){if(!r.kaiban)return;r.rocks=[];r.charge=null;}
export function hitRival(r:Rival,damage:number,source='player',strength=0,direction=1){if(r.dead||r.retreating||r.dormant||r.hidden||source!=='player'||damage<=0)return 0;const actual=Math.min(r.hp,damage);r.hp-=actual;if(r.hp<=0&&r.retreats){r.hp=0;r.retreating=true;r.windup=0;r.shots=[];r.kb=0;clearKaiban(r);}else if(r.hp<=0){r.dead=true;r.windup=0;r.shots=[];r.kb=0;clearKaiban(r);}else if(strength>=150&&!r.charge){r.stagger=Math.max(r.stagger,.3);r.windup=0;r.kb=direction*strength*.4;}return actual;}
export function tickRival(r:Rival,dt:number,player:Rect,worldWidth:number,buildings:Building[]){
 const hits:{damage:number,strength:number,direction:number}[]=[];if(r.dead)return hits;
 const desired=player.x+player.w/2>=r.x+r.w/2?1:-1;
 // Kaiban locks his facing for a Stampede (the bellow shows the lane, the charge runs down it).
 if(r.charge||(r.attack==='stampede'&&r.windup>0)){r.turn=0;}
 else if(desired!==r.face){r.turn+=dt;if(r.turn>=P.bossTurnDelay){r.face=desired;r.turn=0;}}else r.turn=0;
 r.cooldown=Math.max(0,r.cooldown-dt);r.stagger=Math.max(0,r.stagger-dt);
 if(r.stagger<=0){
 if(r.windup>0){r.windup=Math.max(0,r.windup-dt);if(r.windup===0){
 if(r.attack==='melee'){const box={x:r.face===1?r.x+r.w:r.x-P.bossRange,y:r.y,w:P.bossRange,h:r.h};if(overlaps(box,player))hits.push({damage:P.bossMeleeDamage,strength:P.bossKnockback,direction:r.face});}
 else if(r.attack==='shotgun')fanRocks(r);
 else if(r.attack==='stampede')r.charge={dir:r.face,ran:0,hit:false};
 else if(r.shots.length<P.bossShotCap)r.shots.push({x:r.x+r.w/2,y:r.y+r.h*.6,vx:r.face*P.bossShotSpeed,life:P.bossShotLife});
 r.cooldown=r.attack==='melee'?P.bossMeleeCooldown:r.attack==='shotgun'?KB.shotgunCooldown:r.attack==='stampede'?0:P.bossRangedCooldown;
 }}else if(r.charge){stampede(r,dt,player,worldWidth,buildings,hits);}
 else{
 const distance=Math.abs(player.x+player.w/2-r.x-r.w/2);
 let nx=r.x+(distance>P.bossRange+r.w*.5?r.face*(r.kaiban?KB.speed:P.bossSpeed)*dt:0)+r.kb*dt;
 for(const b of buildings){const p=solid(b)?partHit(b,{x:nx,y:r.y,w:r.w,h:r.h},true):null;if(!p)continue;
 nx=r.face>0?p.x-r.w:p.x+p.w;if(r.cooldown===0){damageBuilding(b,95,'impact');r.cooldown=1;}break;
 }
 if(overlaps({x:nx,y:r.y,w:r.w,h:r.h},player))nx=r.face>0?player.x-r.w:player.x+player.w;
 r.x=Math.max(0,Math.min(worldWidth-r.w,nx));r.y=groundAt(r.x+r.w/2)-r.h;
 if(r.cooldown===0){
  if(r.kaiban){const n=r.combo=(r.combo??0)+1,close=distance<P.bossRange+r.w;
   const move:'melee'|'shotgun'|'stampede'=close?((r.streak??0)>=KB.meleeStreak?'stampede':'melee'):distance>=KB.far?'stampede':n%3===0?'stampede':'shotgun';
   r.streak=move==='melee'?(r.streak??0)+1:0;r.attack=move;r.windup=move==='melee'?P.bossTelegraph:move==='shotgun'?KB.shotgunTelegraph:KB.stampedeTelegraph;}
  else{r.attack=distance<P.bossRange+r.w?'melee':'ranged';r.windup=P.bossTelegraph;}}
 }}
 r.kb*=Math.exp(-8*dt);
 for(const p of r.shots){const old=p.x;p.x+=p.vx*dt;p.life-=dt;if(segmentHits(old,p.y,p.x,p.y,player,3)){hits.push({damage:P.bossShotDamage,strength:0,direction:Math.sign(p.vx)});p.life=0;}}
 r.shots=r.shots.filter(p=>p.life>0&&p.x>=0&&p.x<worldWidth);
 if(r.rocks?.length)tickRocks(r,dt,player,worldWidth,buildings,hits);return hits;
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
