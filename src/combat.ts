import {COMBAT as B,CONFIG as C} from './config.ts';
export type Source='player'|'boss'|'military'|'environment';
export type CombatState={hp:number,stage:number,transform:number,ultimate:number,ultimateTime:number,
 superCharge:number,superTime:number,damageTaken:number,penalty:number,dead:boolean,
 cooldown:number,rangedCooldown:number,combo:number,comboWindow:number,buffer:number,
 charging:boolean,charge:number,stagger:number,staggerGuard:number,knockback:number};
export type Strike={kind:'light'|'heavy'|'ranged',damage:number,knockback:number,combo:number,charge:number};
export function createCombat():CombatState{return {hp:B.startHP,stage:1,transform:0,ultimate:0,ultimateTime:0,superCharge:0,superTime:0,damageTaken:0,penalty:0,dead:false,cooldown:0,rangedCooldown:0,combo:0,comboWindow:0,buffer:0,charging:false,charge:0,stagger:0,staggerGuard:0,knockback:0};}
export function canAct(s:CombatState){return !s.dead&&s.transform<=0&&s.stagger<=0&&s.ultimateTime<=0;}
export function invulnerable(s:CombatState){return s.transform>0||s.ultimateTime>0;}
export function scale(s:CombatState){return B.stageScale[s.stage-1];}
export function damageMultiplier(s:CombatState){return B.stageDamage[s.stage-1]*(s.superTime>0?B.superDamage:1);}
export function cancelCharge(s:CombatState){s.charging=false;s.charge=0;s.buffer=0;}
export function reconcileStage(s:CombatState){
 if(s.dead)return;
 let stage=s.stage;
 while(stage<3&&s.hp>=B.up[stage-1])stage++;
 while(stage>1&&s.hp<B.down[stage-2])stage--;
 if(s.superTime>0&&s.hp<B.down[1]){s.superTime=0;s.superCharge=0;}
 if(stage!==s.stage){s.stage=stage;s.transform=B.transformSeconds;cancelCharge(s);s.knockback=0;}
}
export function collectCrystal(s:CombatState,value:number){
 if(s.dead||value<=0)return;
 const overflow=Math.max(0,s.hp+value-B.maxHP),wasFull=s.hp===B.maxHP&&s.stage===3;
 s.hp=Math.min(B.maxHP,s.hp+value);reconcileStage(s);
 // Only surplus energy beyond full HP charges Super; never during an active Super.
 if(s.superTime<=0&&s.stage===3&&(wasFull||overflow>0))s.superCharge=Math.min(B.superMax,s.superCharge+overflow);
}
export function creditDamage(s:CombatState,actual:number,source:Source='player',fromUltimate=false){
 if(source==='player'&&!fromUltimate&&s.ultimateTime<=0&&actual>0)s.ultimate=Math.min(B.ultimateMax,s.ultimate+actual*B.ultimateGain);
}
export function receiveHit(s:CombatState,raw:number,source:Source,strength=0,direction=1){
 if(s.dead||raw<=0||source==='player'||invulnerable(s))return 0;
 const actual=Math.min(s.hp,raw*B.stageResistance[s.stage-1]*(s.superTime>0?B.superResistance:1));
 s.hp=Math.max(0,s.hp-actual);s.damageTaken+=actual;s.penalty+=actual*B.scorePenaltyPerHP;
 if(s.hp===0){s.dead=true;s.superTime=0;s.ultimateTime=0;cancelCharge(s);return actual;}
 if(strength>0&&s.staggerGuard<=0){s.stagger=B.staggerSeconds;s.staggerGuard=B.staggerProtection;s.knockback=strength*direction;cancelCharge(s);}
 reconcileStage(s);return actual;
}
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
 for(const k of ['transform','ultimateTime','superTime','cooldown','rangedCooldown','comboWindow','buffer','stagger','staggerGuard'] as const)s[k]=Math.max(0,s[k]-dt);
 if(superBefore>0&&s.superTime===0){s.superCharge=0;s.transform=B.transformSeconds;cancelCharge(s);}
 if(s.charging)s.charge=Math.min(B.maxCharge,s.charge+dt);
 s.knockback*=Math.exp(-B.knockbackFriction*dt);
 if(s.buffer>0&&s.cooldown<=0)return light(s);
 return null;
}
