import {CONFIG as C,MILITARY as M,MILITARY_FEEL as MF,UNIT_CONFIG,WEAPON_CONFIG} from './config.ts';
import {overlaps} from './rules.ts';
export type Rect={x:number,y:number,w:number,h:number};
export type UnitType='police'|'patrol'|'soldier'|'apc'|'tank'|'helicopter'|'artillery'|'emplacement'|'jet'|'bomber';
export type Weapon='bullet'|'shell'|'rocket'|'bomb'|'artillery';
// What landed the blow, so the game can scale the death: thrown and ranged kills get the biggest explosion.
export type Cause='melee'|'ranged'|'thrown'|'crush'|'ultimate'|'blast';
export const UNITS=UNIT_CONFIG;
export const ROSTERS:UnitType[][]=[['police','patrol'],['police','patrol','soldier','apc'],['police','soldier','patrol','apc','tank','helicopter','artillery','emplacement'],['police','soldier','apc','tank','helicopter','artillery','emplacement','jet','bomber'],['soldier','tank','helicopter']];
export const WEAPONS=WEAPON_CONFIG;
// windup: seconds until the telegraphed shot (`pending`) fires at aimX/aimY; stun: interrupted, cannot move or fire.
// spotter: carries a radio and calls in a strike after `call` reaches MF.spotterSeconds. vy/flash are presentation physics.
export type Pending='shell'|'rockets'|'strafe'|null;
export type Unit=Rect&{id:number,type:UnitType,hp:number,maxHP:number,face:number,pass:number,cooldown:number,burst:number,gap:number,shots:number,kb:number,
 windup:number,windTotal:number,aimX:number,aimY:number,pending:Pending,stun:number,spotter:boolean,call:number,vy:number,flash:number};
export type Projectile={id:number,weapon:Weapon,x:number,y:number,vx:number,vy:number,life:number,owner:number,damage:number,radius:number,strength:number,dead:boolean,age:number,startX:number,startY:number,targetX:number,flight:number};
export type Effect={x:number,y:number,radius:number,life:number,harmless:boolean};
// Aircraft wrecks fall (vx/vy/spin) and crash once on the street; `credit` is who downed it (their crash blast is credited the same).
export type Wreck=Rect&{life:number,air:boolean,lane:0|1|null,type:UnitType,vx:number,vy:number,angle:number,spin:number,falling:boolean,credit:'player'|'military'|'boss',ultimate:boolean};
export type MilitaryEvent={kind:'reward',x:number,damage:number,points:number,shards:number,ultimate:boolean,interrupt?:boolean}
 |{kind:'playerHit',damage:number,strength:number,direction:number,x:number,y:number,weapon:Weapon}
 |{kind:'cosmetic',x:number,y:number}
 |{kind:'unitHit',id:number,type:UnitType,x:number,y:number,damage:number,killed:boolean,interrupted:boolean,cause:Cause,dir:number,source:'player'|'military'|'boss'}
 |{kind:'death',id:number,type:UnitType,x:number,y:number,w:number,h:number,lane:0|1|null,dir:number,knockback:number,cause:Cause,source:'player'|'military'|'boss',air:boolean}
 |{kind:'crash',type:UnitType,x:number,y:number,radius:number}
 |{kind:'announce',label:string,side:number,count:number}
 |{kind:'strike',x:number,spotter:number};
export type MilitaryState={tier:number,city:number,units:Unit[],projectiles:Projectile[],wrecks:Wreck[],effects:Effect[],events:MilitaryEvent[],spawnTimer:number,sequence:number,nextID:number,rng:()=>number,soldiers:number};
export function createMilitary(tier=1,city=0,rng=Math.random):MilitaryState{return {tier:Math.max(1,Math.min(5,tier)),city,units:[],projectiles:[],wrecks:[],effects:[],events:[],spawnTimer:M.firstSpawn,sequence:0,nextID:1,rng,soldiers:0};}
export function onScreen(r:Rect,camera:number,viewW=C.width){return r.x+r.w>camera&&r.x<camera+viewW;}
export function spawnUnit(s:MilitaryState,type:UnitType,x:number,side=1):Unit{
 const d=UNITS[type],y=d.air?(type==='helicopter'?285:type==='jet'?267:246):C.ground-d.h;
 const hp=d.hp*(1+s.city*M.cityHP);
 const spotter=type==='soldier'&&s.soldiers++%MF.spotterEvery===MF.spotterEvery-1;
 const u:Unit={id:s.nextID++,type,x,y,w:d.w,h:d.h,hp,maxHP:hp,face:side,pass:side,cooldown:1.1,burst:0,gap:0,shots:0,kb:0,
  windup:0,windTotal:0,aimX:0,aimY:0,pending:null,stun:0,spotter,call:0,vy:0,flash:0};s.units.push(u);return u;
}
// Military vehicles drive in the traffic lanes like civilian cars (alternating by id); foot troops, emplacements and aircraft
// have no lane. Like civilian traffic, the lane only changes where the unit is drawn; gameplay stays x/y.
export const ROAD_UNITS=new Set<UnitType>(['patrol','apc','tank','artillery']);
export function roadLane(u:{id:number,type:UnitType}):0|1|null{return ROAD_UNITS.has(u.type)?(u.id%2) as 0|1:null;}
// Small arms barely scratch a grown kaiju: bullet damage scales down by stage (0 at Stage 3). Explosives are unaffected.
export function smallArmsScale(weapon:Weapon,stage:number){return weapon==='bullet'?MF.bulletStage[Math.max(0,Math.min(2,stage-1))]:1;}
export function hitUnit(s:MilitaryState,u:Unit,damage:number,source:'player'|'military'|'boss'='player',knockback=0,direction=1,ultimate=false,cause:Cause='melee'){
 if(u.hp<=0||damage<=0)return 0;
 const actual=Math.min(u.hp,damage),d=UNITS[u.type];u.hp=Math.max(0,u.hp-actual);u.flash=.08;
 if(knockback){u.kb=direction*knockback/d.mass;if(!d.air&&u.hp>0)u.vy=-Math.min(MF.hopMax,knockback*MF.hopLift)/Math.sqrt(d.mass);}
 // A blow during a telegraphed wind-up cancels the shot and stuns the crew.
 const interrupted=source==='player'&&u.hp>0&&u.windup>0;
 if(interrupted){u.windup=0;u.pending=null;u.burst=0;u.stun=MF.stunSeconds;}
 const cx=u.x+u.w/2,cy=u.y+u.h/2;
 s.events.push({kind:'unitHit',id:u.id,type:u.type,x:cx,y:cy,damage:actual,killed:u.hp===0,interrupted,cause,dir:direction,source});
 if(source==='player')s.events.push({kind:'reward',x:cx,damage:actual,points:(u.hp===0?d.points:0)+(interrupted?MF.interruptPoints:0),shards:u.hp===0?M.unitShards:0,ultimate,interrupt:interrupted||undefined});
 if(u.hp===0){
  s.effects.push({x:cx,y:cy,radius:20,life:M.impactSeconds,harmless:true});
  s.events.push({kind:'death',id:u.id,type:u.type,x:cx,y:cy,w:u.w,h:u.h,lane:roadLane(u),dir:direction,knockback,cause,source,air:d.air});
  // Road vehicles become physical burning wrecks in the game (the death event); everything else leaves a wreck here.
  if(u.type!=='police'&&u.type!=='soldier'&&!ROAD_UNITS.has(u.type)){
   if(s.wrecks.length>=M.wreckCap)s.wrecks.shift();
   s.wrecks.push({x:u.x,y:u.y,w:u.w,h:u.h,life:M.wreckSeconds,air:d.air,lane:roadLane(u),type:u.type,
    vx:d.air?(u.type==='helicopter'?direction*40:u.pass*d.speed*.45):0,vy:d.air?-40:0,angle:0,spin:d.air?(u.type==='helicopter'?7:1.2)*(u.type==='helicopter'?1:u.pass):0,falling:d.air,credit:source,ultimate});
  }
  // Heavies go up in a secondary blast that catches other military (credited to whoever made the kill).
  if(d.mass>=MF.blastMass&&!d.air)blast(s,cx,cy,MF.blastRadius+d.mass*MF.blastPerMass,MF.blastDamage*d.mass,source,ultimate,u);
 }
 return actual;
}
// Explosion from a destroyed unit or a crash: hits other military only (never buildings, the player or the rival).
export function blast(s:MilitaryState,x:number,y:number,radius:number,damage:number,source:'player'|'military'|'boss',ultimate=false,skip?:Unit){
 for(const o of s.units)if(o!==skip&&o.hp>0&&withinBlast(x,y,radius,o))hitUnit(s,o,damage,source,200,o.x+o.w/2<x?-1:1,ultimate,'blast');
}
// The kaiju picks a ground vehicle up: it is out of the fight at once. Pays the kill points (no crystals, no wreck: it becomes a held prop).
export const GRABBABLE_UNITS=new Set(['patrol','apc','tank','artillery']);
export function captureUnit(s:MilitaryState,u:Unit){
 if(u.hp<=0||!GRABBABLE_UNITS.has(u.type))return false;u.hp=0;
 s.events.push({kind:'reward',x:u.x+u.w/2,damage:0,points:UNITS[u.type].points,shards:0,ultimate:false});return true;
}
// Swept collision prevents fast bullets/spines tunneling through tiny targets.
export function segmentHits(x1:number,y1:number,x2:number,y2:number,r:Rect,pad=0){
 let lo=0,hi=1;for(const [a,b,min,max] of [[x1,x2,r.x-pad,r.x+r.w+pad],[y1,y2,r.y-pad,r.y+r.h+pad]]){const delta=b-a;if(Math.abs(delta)<1e-8){if(a<min||a>max)return false;}else{const p=(min-a)/delta,q=(max-a)/delta;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)return false;}}return true;
}
export function withinBlast(x:number,y:number,radius:number,r:Rect){const dx=x-Math.max(r.x,Math.min(x,r.x+r.w)),dy=y-Math.max(r.y,Math.min(y,r.y+r.h));return dx*dx+dy*dy<=radius*radius;}
export function intercept(s:MilitaryState,p:Projectile){if(p.dead||!WEAPONS[p.weapon].interceptable)return false;p.dead=true;s.effects.push({x:p.x,y:p.y,radius:19,life:M.impactSeconds,harmless:true});return true;}
export function detonate(s:MilitaryState,p:Projectile,player:Rect,boss?:Rect){
 if(p.dead)return;p.dead=true;s.effects.push({x:p.x,y:p.y,radius:p.radius,life:M.impactSeconds,harmless:false});
 if(withinBlast(p.x,p.y,p.radius,player)){const px=Math.max(player.x,Math.min(p.x,player.x+player.w)),py=Math.max(player.y,Math.min(p.y,player.y+player.h));
  s.events.push({kind:'playerHit',damage:p.damage,strength:p.strength,direction:player.x+player.w/2<p.x?-1:1,x:px,y:py,weapon:p.weapon});}
 // Military explosions hit military, with full radius damage, never buildings.
 for(const u of s.units)if(u.hp>0&&withinBlast(p.x,p.y,p.radius,u))hitUnit(s,u,p.damage,'military',p.strength,u.x+u.w/2<p.x?-1:1,false,'blast');
 if(boss&&withinBlast(p.x,p.y,p.radius,boss))s.events.push({kind:'cosmetic',x:boss.x+boss.w/2,y:boss.y+boss.h/2});
}
// Fire at a world point (a locked aim). `launch` aims at the target's body.
export function launchAt(s:MilitaryState,u:Unit,weapon:Weapon,tx:number,ty:number){
 if(s.projectiles.filter(p=>!p.dead).length>=M.projectileCap)return null;
 const d=WEAPONS[weapon],x=u.x+u.w/2,y=u.y+u.h/2,angle=Math.atan2(ty-y,tx-x);
 const p:Projectile={id:s.nextID++,weapon,x,y,vx:Math.cos(angle)*d.speed,vy:Math.sin(angle)*d.speed,life:weapon==='artillery'?2.1:M.bulletLife,owner:u.id,damage:d.damage*(1+s.city*M.cityDamage),radius:d.radius,strength:d.strength,dead:false,age:0,startX:x,startY:y,targetX:weapon==='bomb'?x:tx,flight:1.65};
 if(weapon==='bomb'){p.vx=0;p.vy=80;}s.projectiles.push(p);return p;
}
export function launch(s:MilitaryState,u:Unit,weapon:Weapon,target:Rect){return launchAt(s,u,weapon,target.x+target.w/2,target.y+target.h*.65);}
// A spotter's strike: a heavy shell lobbed in from off the top of the screen onto the marked point.
export function callStrike(s:MilitaryState,u:Unit,tx:number){
 if(s.projectiles.filter(p=>!p.dead).length>=M.projectileCap)return null;
 const sx=tx-u.face*520,p:Projectile={id:s.nextID++,weapon:'artillery',x:sx,y:-40,vx:0,vy:0,life:MF.strikeFlight+.5,owner:u.id,damage:MF.strikeDamage*(1+s.city*M.cityDamage),radius:MF.strikeRadius,strength:MF.strikeStrength,dead:false,age:0,startX:sx,startY:-40,targetX:tx,flight:MF.strikeFlight};
 s.projectiles.push(p);s.events.push({kind:'strike',x:tx,spotter:u.id});return p;
}
// Heavies telegraph: the tank tracks then locks its turret, the helicopter rakes with its gun then locks rockets, the jet
// paints a strafing run. Light guns fire straight away.
function startBurst(s:MilitaryState,u:Unit,target:Rect){
 const type=u.type,aim=()=>{u.aimX=target.x+target.w/2;u.aimY=target.y+target.h*.65;};
 if(type==='tank'){u.pending='shell';u.windup=u.windTotal=MF.tankWindup;aim();return;}
 if(type==='jet'){u.pending='strafe';u.windup=u.windTotal=MF.jetWindup;aim();return;}
 if(type==='artillery'){launch(s,u,'artillery',target);return;}
 u.burst=type==='police'||type==='patrol'?1:type==='soldier'?3:type==='bomber'?3:type==='helicopter'?MF.heliGunBurst:6;u.gap=0;
}
function fire(s:MilitaryState,u:Unit){
 const p=u.pending;u.pending=null;
 if(p==='shell')launchAt(s,u,'shell',u.aimX,u.aimY);
 // Rockets and the strafe go in as a burst at the locked point.
 else if(p==='rockets'){u.burst=2;u.gap=0;}
 else if(p==='strafe'){u.burst=6;u.gap=0;}
}
// Which wave is coming, for the announcement banner.
export function waveLabel(types:UnitType[]){
 if(types.some(t=>UNITS[t].air))return types.some(t=>t==='bomber'||t==='jet')?'AIR STRIKE':'GUNSHIPS';
 if(types.some(t=>t==='tank'||t==='apc'||t==='artillery'||t==='emplacement'))return 'ARMOR INBOUND';
 return types.some(t=>t==='soldier')?'TROOPS INBOUND':'POLICE RESPONSE';
}
export function tickMilitary(s:MilitaryState,dt:number,camera:number,worldWidth:number,player:Rect,threat:number,boss?:Rect,contactSource:'player'|'military'='player',viewW=C.width,stage=1){
 s.spawnTimer-=dt;
 const cap=M.caps[s.tier-1],alive=s.units.filter(u=>u.hp>0).length;
 if(s.spawnTimer<=0&&alive<cap){
  // A wave: a group from one side, staggered outward so it rolls in together.
  const roster=ROSTERS[s.tier-1],side=s.rng()<.5?1:-1,size=Math.min(cap-alive,MF.waveSize[s.tier-1]),types:UnitType[]=[];
  for(let k=0;k<size;k++){const type=roster[s.sequence++%roster.length],def=UNITS[type],off=k*MF.waveSpacing;types.push(type);
   // Stationary guns arrive just outside the leading viewport and remain fixed.
   spawnUnit(s,type,side===1?camera-M.spawnMargin-def.w-off:camera+viewW+M.spawnMargin+off,side);}
  s.events.push({kind:'announce',label:waveLabel(types),side:-side,count:size});
  s.spawnTimer=M.spawnSeconds[s.tier-1]*(size>1?size*MF.waveLull:1)*(1+(s.rng()-.5)*2*M.spawnVariance)/(1+Math.max(0,Math.min(1,threat))*M.threatPressure+s.city*M.cityPressure);
 }
 const engage=Math.max(camera,Math.min(camera+viewW-C.width,player.x+player.w/2-C.width/2));
 for(const u of s.units){if(u.hp<=0)continue;const d=UNITS[u.type];
  const target=boss&&Math.abs(boss.x-u.x)<Math.abs(player.x-u.x)?boss:player;
  u.flash=Math.max(0,u.flash-dt);
  u.x+=u.kb*dt;u.kb*=Math.exp(-M.knockbackFriction*dt);
  if(!d.air){const floor=C.ground-u.h;if(u.vy!==0||u.y<floor){u.vy+=MF.unitGravity*dt;u.y+=u.vy*dt;if(u.y>=floor){u.y=floor;u.vy=0;}}}
  if(u.type==='jet'||u.type==='bomber')u.x+=u.pass*d.speed*dt;
  if(overlaps(u,player)){
   if(u.type==='police'||u.type==='soldier')hitUnit(s,u,u.hp,contactSource,0,u.face,false,'crush');
   // A grown kaiju flattens the armour it walks into.
   else if(stage>=MF.crushStage&&ROAD_UNITS.has(u.type))hitUnit(s,u,u.hp,contactSource,120,u.x+u.w/2<player.x+player.w/2?-1:1,false,'crush');
  }
  if(u.hp<=0)continue;
  if(u.stun>0){u.stun=Math.max(0,u.stun-dt);continue;}
  u.face=target.x+target.w/2>=u.x+u.w/2?1:-1;
  if(u.type!=='jet'&&u.type!=='bomber'&&d.speed>0&&u.windup<=0&&Math.abs(target.x+target.w/2-u.x-u.w/2)>d.range*.7)u.x+=u.face*d.speed*dt;
  u.cooldown=Math.max(0,u.cooldown-dt);
  // Rounds may only be launched inside the engagement window: the native 960 width around the player, kept inside the
  // (possibly zoomed-out) view. Units still spawn beyond the visible edge, but a wider camera does not put more guns in range.
  if(!onScreen(u,engage)){u.burst=0;u.windup=0;u.pending=null;continue;}
  if(u.spotter&&target===player){u.call+=dt;if(u.call>=MF.spotterSeconds){u.call=0;callStrike(s,u,player.x+player.w/2);}}
  if(u.windup>0){
   // Track until the lock, then hold the aim; fire when the wind-up ends.
   if(u.windup>MF.lockAt){u.aimX=target.x+target.w/2;u.aimY=target.y+target.h*.65;if(u.pending==='strafe')u.aimY=C.ground-4;}
   u.windup=Math.max(0,u.windup-dt);if(u.windup===0)fire(s,u);
  }
  else if(u.cooldown===0&&u.burst===0&&!u.pending){startBurst(s,u,target);u.cooldown=d.cooldown;}
  if(u.burst>0){u.gap-=dt;if(u.gap<=0){
   const weapon:Weapon=u.type==='bomber'?'bomb':u.type==='helicopter'&&u.shots>=MF.heliGunBurst?'rocket':'bullet';
   const locked=u.type==='jet'||weapon==='rocket';
   if(locked)launchAt(s,u,weapon,u.aimX,u.aimY);else launch(s,u,weapon,target);
   u.burst--;u.shots++;u.gap=weapon==='rocket'?M.rocketGap:M.burstGap;
   // The helicopter's gun burst ends in a rocket lock.
   if(u.type==='helicopter'&&u.burst===0&&u.shots===MF.heliGunBurst){u.pending='rockets';u.windup=u.windTotal=MF.heliWindup;u.aimX=target.x+target.w/2;u.aimY=target.y+target.h*.65;}
   if(u.type==='helicopter'&&u.burst===0&&u.shots>MF.heliGunBurst)u.shots=0;
  }}
 }
 for(const p of s.projectiles){if(p.dead)continue;const ox=p.x,oy=p.y;p.age+=dt;p.life-=dt;
  if(p.weapon==='artillery'){const t=Math.min(1,p.age/p.flight);p.x=p.startX+(p.targetX-p.startX)*t;p.y=p.startY+(C.ground-p.startY)*t-Math.sin(t*Math.PI)*170;}
  else {if(p.weapon==='bomb')p.vy+=210*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  const hitsPlayer=segmentHits(ox,oy,p.x,p.y,player,2),hitsBoss=boss&&segmentHits(ox,oy,p.x,p.y,boss,2);
  if(p.weapon==='artillery'||p.weapon==='bomb'){
   if(p.y>=C.ground||p.weapon==='artillery'&&p.age>=p.flight){p.y=C.ground;detonate(s,p,player,boss);}
  }else if(hitsPlayer||hitsBoss||p.y>=C.ground){
   if(p.radius>0)detonate(s,p,player,boss);
   else {p.dead=true;if(hitsPlayer){const hy=Math.max(player.y,Math.min(p.y,player.y+player.h));s.events.push({kind:'playerHit',damage:p.damage,strength:0,direction:Math.sign(p.vx)||1,x:Math.max(player.x,Math.min(p.x,player.x+player.w)),y:hy,weapon:p.weapon});}else if(hitsBoss)s.events.push({kind:'cosmetic',x:p.x,y:p.y});}
  }
 }
 s.projectiles=s.projectiles.filter(p=>!p.dead&&p.life>0&&p.x>camera-M.despawnDistance&&p.x<camera+viewW+M.despawnDistance);
 s.units=s.units.filter(u=>u.hp>0&&u.x>camera-M.despawnDistance&&u.x<camera+viewW+M.despawnDistance&&(!(u.type==='jet'||u.type==='bomber')||u.x>camera-250&&u.x<camera+viewW+250));
 // Downed aircraft fall, spinning, and crash once on the street (a blast that catches other military).
 for(const w of s.wrecks){w.life-=dt;if(!w.falling)continue;w.life=Math.max(w.life,.5);
  w.vy+=MF.airGravity*dt;w.x+=w.vx*dt;w.y+=w.vy*dt;w.angle+=w.spin*dt;
  if(w.y>=C.ground-w.h){w.y=C.ground-w.h;w.falling=false;w.vx=0;w.vy=0;w.life=M.wreckSeconds;
   const cx=w.x+w.w/2;s.effects.push({x:cx,y:C.ground-10,radius:MF.crashRadius,life:M.impactSeconds,harmless:true});
   s.events.push({kind:'crash',type:w.type,x:cx,y:C.ground-8,radius:MF.crashRadius});
   blast(s,cx,C.ground-10,MF.crashRadius,MF.crashDamage,w.credit,w.ultimate);}}
 s.wrecks=s.wrecks.filter(w=>w.life>0);
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
 // Effects are cosmetic; they never resolve damage a second time.
}
