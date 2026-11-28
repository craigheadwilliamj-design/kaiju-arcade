import {COMBAT as B,CONFIG as C} from './config.ts';
export type Source='player'|'boss'|'military'|'environment';
export type CombatState={hp:number,stage:number,transform:number,ultimate:number,ultimateTime:number,
 superCharge:number,superTime:number,damageTaken:number,penalty:number,dead:boolean,
 cooldown:number,rangedCooldown:number,combo:number,comboWindow:number,buffer:number,
 charging:boolean,charge:number,stagger:number,staggerGuard:number,knockback:number,mercy:number,cap:number,floor:number};
// mercy: seconds of respawn invincibility (after drowning). cap: the highest stage this level allows. floor: the lowest stage the
// kaiju can be shrunk to (the soft floor, set per level by setGrowth; 1 = none): hits and drownPenalty both honour it. 3 and 1 = fully dynamic.
export type Strike={kind:'light'|'heavy'|'ranged',damage:number,knockback:number,combo:number,charge:number};
export function createCombat():CombatState{return {hp:B.startHP,stage:1,transform:0,ultimate:0,ultimateTime:0,superCharge:0,superTime:0,damageTaken:0,penalty:0,dead:false,cooldown:0,rangedCooldown:0,combo:0,comboWindow:0,buffer:0,charging:false,charge:0,stagger:0,staggerGuard:0,knockback:0,mercy:0,cap:3,floor:1};}
export function canAct(s:CombatState){return !s.dead&&s.transform<=0&&s.stagger<=0&&s.ultimateTime<=0;}
export function invulnerable(s:CombatState){return s.transform>0||s.ultimateTime>0||s.mercy>0;}
export function scale(s:CombatState){return B.stageScale[s.stage-1];}
export function damageMultiplier(s:CombatState){return B.stageDamage[s.stage-1]*(s.superTime>0?B.superDamage:1);}
export function cancelCharge(s:CombatState){s.charging=false;s.charge=0;s.buffer=0;}
// Highest HP the cap allows: just under the next stage's threshold (full HP at Stage 3).
export function capHP(cap:number){return cap>=3?B.maxHP:B.up[cap-1]-1;}
// HP a level hands you when it starts you at a stage: Stage 1's usual start, or the threshold that grows you into Stage 2 / 3.
export function stageEntryHP(stage:number){return stage<=1?B.startHP:B.up[stage-2];}
// Per-level growth: enter at `start`, never grow past `cap`, never shrink below one stage under the start (soft floor, never below 1).
// Already at the start stage, you keep your HP; otherwise you enter with that stage's entry HP. No transform: it happens between levels.
export function setGrowth(s:CombatState,start:number,cap:number){
 s.cap=Math.max(1,Math.min(3,cap));s.floor=Math.max(1,start-1);start=Math.max(s.floor,Math.min(s.cap,start));
 if(s.stage!==start)s.hp=stageEntryHP(start);s.hp=Math.min(s.hp,capHP(s.cap));s.stage=start;s.transform=0;
 if(s.superTime>0&&s.stage<3){s.superTime=0;s.superCharge=0;}
}
// Mid-level cap lift (a crystal will trigger it): raise the cap and grow straight into the next stage through the usual transform.
export function liftCap(s:CombatState,cap:number){
 if(s.dead||cap<=s.cap)return false;const from=s.cap;s.cap=Math.min(3,cap);
 s.hp=Math.max(s.hp,stageEntryHP(from+1));reconcileStage(s);return true;
}
export function reconcileStage(s:CombatState){
 if(s.dead)return;
 s.hp=Math.min(s.hp,capHP(s.cap));
 let stage=s.stage;
 while(stage<s.cap&&s.hp>=B.up[stage-1])stage++;
 while(stage>s.floor&&s.hp<B.down[stage-2])stage--;
 if(s.superTime>0&&s.hp<B.down[1]){s.superTime=0;s.superCharge=0;}
 if(stage!==s.stage){s.stage=stage;s.transform=B.transformSeconds;cancelCharge(s);s.knockback=0;}
}
export function collectCrystal(s:CombatState,value:number){
 if(s.dead||value<=0)return;
 const overflow=Math.max(0,s.hp+value-B.maxHP),wasFull=s.hp===B.maxHP&&s.stage===3;
 s.hp=Math.min(capHP(s.cap),s.hp+value);reconcileStage(s);
 // Only surplus energy beyond full HP charges Super; never during an active Super.
 if(s.superTime<=0&&s.stage===3&&(wasFull||overflow>0))s.superCharge=Math.min(B.superMax,s.superCharge+overflow);
}
export function creditDamage(s:CombatState,actual:number,source:Source='player',fromUltimate=false){
 if(source==='player'&&!fromUltimate&&s.ultimateTime<=0&&actual>0)s.ultimate=Math.min(B.ultimateMax,s.ultimate+actual*B.ultimateGain);
}
// Damage the kaiju takes from anything but itself is multiplied by `vulnerability.k`: 1 normally, Belial's corrosion on the kaiju raises it (src/rival.ts, BELIAL_BOSS.corrodeVuln).
export const vulnerability={k:1};
// Super armor while charging a heavy (Sargathoth): hits still hurt but cannot stagger or cancel the charge. Set per frame by the game.
export const chargeArmor={on:false};
// Sargathoth's Holdfast (docs/SARGATHOTH_KIT.md): while anchored, hits take `resist` less damage and never stagger or knock him back.
export const holdfast={on:false,resist:0};
// Healing that isn't a crystal: up to the HP cap, never charges Super.
export function regenHP(s:CombatState,value:number){if(s.dead||value<=0)return;s.hp=Math.min(capHP(s.cap),s.hp+value);reconcileStage(s);}
export function receiveHit(s:CombatState,raw:number,source:Source,strength=0,direction=1){
 if(s.dead||raw<=0||source==='player'||invulnerable(s))return 0;
 const actual=Math.min(s.hp,raw*vulnerability.k*B.stageResistance[s.stage-1]*(s.superTime>0?B.superResistance:1)*(holdfast.on?1-holdfast.resist:1));
 s.hp=Math.max(0,s.hp-actual);s.damageTaken+=actual;s.penalty+=actual*B.scorePenaltyPerHP;
 if(s.hp===0){s.dead=true;s.superTime=0;s.ultimateTime=0;cancelCharge(s);return actual;}
 if(strength>0&&s.staggerGuard<=0&&!holdfast.on&&!(chargeArmor.on&&s.charging)){s.stagger=B.staggerSeconds;s.staggerGuard=B.staggerProtection;s.knockback=strength*direction;cancelCharge(s);}
 reconcileStage(s);return actual;
}
// The HP lost for drowning: goes through whatever invincibility is up, never kills, and never shrinks the kaiju below its floor stage.
export function drownPenalty(s:CombatState,raw:number){
 if(s.dead||raw<=0)return 0;const min=s.floor>1?B.down[Math.min(3,s.floor)-2]:1,next=Math.min(s.hp,Math.max(min,s.hp-raw)),actual=s.hp-next;
 s.hp=next;s.damageTaken+=actual;s.penalty+=actual*B.scorePenaltyPerHP;reconcileStage(s);return actual;}
export function light(s:CombatState):Strike|null{
 if(!canAct(s)||s.charging)return null;
 if(s.cooldown>0){if(s.cooldown<=B.inputBuffer)s.buffer=B.inputBuffer;return null;}
 s.combo=s.comboWindow>0?s.combo%3+1:1;s.comboWindow=B.comboTimeout;s.cooldown=C.attackCooldown;s.buffer=0;
 return {kind:'light',damage:C.lightDamage*B.comboDamage[s.combo-1]*damageMultiplier(s),knockback:B.comboKnockback[s.combo-1]*(s.superTime>0?B.superKnockback:1),combo:s.combo,charge:0};
}
export function beginHeavy(s:CombatState){if(!canAct(s)||s.cooldown>0||s.charging)return false;s.charging=true;s.charge=0;s.buffer=0;return true;}
export function releaseHeavy(s:CombatState):Strike|null{
 if(!s.charging)return null;
 const charge=s.charge;s.charging=false;s.charge=0;if(!canAct(s))return null;
 s.cooldown=C.heavyCooldown;s.comboWindow=0;
 return {kind:'heavy',damage:C.heavyDamage*(1+charge/B.maxCharge*B.chargeDamageBonus)*damageMultiplier(s),knockback:B.heavyKnockback*(1+charge/B.maxCharge)*(s.superTime>0?B.superKnockback:1),combo:0,charge};
}
export function ranged(s:CombatState):Strike|null{
 if(!canAct(s)||s.rangedCooldown>0||s.charging||s.cooldown>0)return null;
 s.rangedCooldown=C.rangedCooldown;s.cooldown=.15;
 return {kind:'ranged',damage:C.rangedDamage*damageMultiplier(s),knockback:45*(s.superTime>0?B.superKnockback:1),combo:0,charge:0};
}
export function activateUltimate(s:CombatState){if(!canAct(s)||s.ultimate<B.ultimateMax)return false;cancelCharge(s);s.ultimate=0;s.ultimateTime=B.ultimateDuration;s.cooldown=0;return true;}
export function activateSuper(s:CombatState){if(!canAct(s)||s.superTime>0||s.stage!==3||s.hp!==B.maxHP||s.superCharge<B.superMax)return false;cancelCharge(s);s.superCharge=0;s.superTime=B.superDuration;s.transform=B.transformSeconds;return true;}
export function tickCombat(s:CombatState,dt:number):Strike|null{
 const superBefore=s.superTime;
 for(const k of ['transform','ultimateTime','superTime','cooldown','rangedCooldown','comboWindow','buffer','stagger','staggerGuard','mercy'] as const)s[k]=Math.max(0,s[k]-dt);
 if(superBefore>0&&s.superTime===0){s.superCharge=0;s.transform=B.transformSeconds;cancelCharge(s);}
 if(s.charging)s.charge=Math.min(B.maxCharge,s.charge+dt);
 s.knockback*=Math.exp(-B.knockbackFriction*dt);
 if(s.buffer>0&&s.cooldown<=0)return light(s);
 return null;
}
