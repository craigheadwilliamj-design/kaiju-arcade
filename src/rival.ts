// M4 conventional-HP rival: shared temporary moveset so the campaign is playable.
// M5 replaces this with individual kaiju attacks, stages and Ultimate behavior.
import {CAMPAIGN as P,CONFIG as C} from './config.ts';
import {overlaps,solid,damageBuilding} from './rules.ts';import type {Building} from './rules.ts';
import {segmentHits} from './military.ts';import type {Rect} from './military.ts';
export type Rival=Rect&{hp:number,maxHP:number,dead:boolean,face:number,turn:number,cooldown:number,windup:number,attack:'melee'|'ranged',stagger:number,kb:number,shots:{x:number,y:number,vx:number,life:number}[]};
export function createRival(worldWidth:number,city:number):Rival{const hp=P.bossHP*(1+city*.1);return {x:worldWidth-250,y:C.ground-P.bossHeight,w:P.bossWidth,h:P.bossHeight,hp,maxHP:hp,dead:false,face:-1,turn:0,cooldown:1.5,windup:0,attack:'melee',stagger:0,kb:0,shots:[]};}
export function hitRival(r:Rival,damage:number,source='player',strength=0,direction=1){if(r.dead||source!=='player'||damage<=0)return 0;const actual=Math.min(r.hp,damage);r.hp-=actual;if(r.hp<=0){r.dead=true;r.windup=0;r.shots=[];r.kb=0;}else if(strength>=150){r.stagger=.3;r.windup=0;r.kb=direction*strength*.4;}return actual;}
export function tickRival(r:Rival,dt:number,player:Rect,worldWidth:number,buildings:Building[]){
 const hits:{damage:number,strength:number,direction:number}[]=[];if(r.dead)return hits;
 const desired=player.x+player.w/2>=r.x+r.w/2?1:-1;
 if(desired!==r.face){r.turn+=dt;if(r.turn>=P.bossTurnDelay){r.face=desired;r.turn=0;}}else r.turn=0;
 r.cooldown=Math.max(0,r.cooldown-dt);r.stagger=Math.max(0,r.stagger-dt);
 if(r.stagger<=0){
 if(r.windup>0){r.windup=Math.max(0,r.windup-dt);if(r.windup===0){
 if(r.attack==='melee'){const box={x:r.face===1?r.x+r.w:r.x-P.bossRange,y:r.y,w:P.bossRange,h:r.h};if(overlaps(box,player))hits.push({damage:P.bossMeleeDamage,strength:P.bossKnockback,direction:r.face});}
 else if(r.shots.length<P.bossShotCap)r.shots.push({x:r.x+r.w/2,y:r.y+r.h*.6,vx:r.face*P.bossShotSpeed,life:P.bossShotLife});
 r.cooldown=r.attack==='melee'?P.bossMeleeCooldown:P.bossRangedCooldown;
 }}else{
 const distance=Math.abs(player.x+player.w/2-r.x-r.w/2);
 let nx=r.x+(distance>P.bossRange+r.w*.5?r.face*P.bossSpeed*dt:0)+r.kb*dt;
 for(const b of buildings)if(solid(b)&&overlaps({x:nx,y:r.y,w:r.w,h:r.h},{x:b.x,y:C.ground-b.h,w:b.w,h:b.h})){
 nx=r.face>0?b.x-r.w:b.x+b.w;if(r.cooldown===0){damageBuilding(b,95,'impact');r.cooldown=1;}break;
 }
 if(overlaps({x:nx,y:r.y,w:r.w,h:r.h},player))nx=r.face>0?player.x-r.w:player.x+player.w;
 r.x=Math.max(0,Math.min(worldWidth-r.w,nx));
 if(r.cooldown===0){r.attack=distance<P.bossRange+r.w?'melee':'ranged';r.windup=P.bossTelegraph;}
 }}
 r.kb*=Math.exp(-8*dt);
 for(const p of r.shots){const old=p.x;p.x+=p.vx*dt;p.life-=dt;if(segmentHits(old,p.y,p.x,p.y,player,3)){hits.push({damage:P.bossShotDamage,strength:0,direction:Math.sign(p.vx)});p.life=0;}}
 r.shots=r.shots.filter(p=>p.life>0&&p.x>=0&&p.x<worldWidth);return hits;
}
