import {CONFIG as C,MILITARY as M,UNIT_CONFIG,WEAPON_CONFIG} from './config.ts';
import {overlaps} from './rules.ts';
export type Rect={x:number,y:number,w:number,h:number};
export type UnitType='police'|'patrol'|'soldier'|'apc'|'tank'|'helicopter'|'artillery'|'emplacement'|'jet'|'bomber';
export type Weapon='bullet'|'shell'|'rocket'|'bomb'|'artillery';
export const UNITS=UNIT_CONFIG;
export const ROSTERS:UnitType[][]=[['police','patrol'],['police','patrol','soldier','apc'],['police','soldier','patrol','apc','tank','helicopter','artillery','emplacement'],['police','soldier','apc','tank','helicopter','artillery','emplacement','jet','bomber'],['soldier','tank','helicopter']];
export const WEAPONS=WEAPON_CONFIG;
export type Unit=Rect&{id:number,type:UnitType,hp:number,maxHP:number,face:number,pass:number,cooldown:number,burst:number,gap:number,shots:number,kb:number};
export type Projectile={id:number,weapon:Weapon,x:number,y:number,vx:number,vy:number,life:number,owner:number,damage:number,radius:number,strength:number,dead:boolean,age:number,startX:number,startY:number,targetX:number,flight:number};
export type Effect={x:number,y:number,radius:number,life:number,harmless:boolean};
export type MilitaryEvent={kind:'reward',x:number,damage:number,points:number,shards:number,ultimate:boolean}|{kind:'playerHit',damage:number,strength:number,direction:number}|{kind:'cosmetic',x:number,y:number};
export type MilitaryState={tier:number,city:number,units:Unit[],projectiles:Projectile[],wrecks:(Rect&{life:number,air:boolean,lane:0|1|null})[],effects:Effect[],events:MilitaryEvent[],spawnTimer:number,sequence:number,nextID:number,rng:()=>number};
export function createMilitary(tier=1,city=0,rng=Math.random):MilitaryState{return {tier:Math.max(1,Math.min(5,tier)),city,units:[],projectiles:[],wrecks:[],effects:[],events:[],spawnTimer:M.firstSpawn,sequence:0,nextID:1,rng};}
export function onScreen(r:Rect,camera:number){return r.x+r.w>camera&&r.x<camera+C.width;}
export function spawnUnit(s:MilitaryState,type:UnitType,x:number,side=1):Unit{
 const d=UNITS[type],y=d.air?(type==='helicopter'?285:type==='jet'?267:246):C.ground-d.h;
 const hp=d.hp*(1+s.city*M.cityHP);
 const u:Unit={id:s.nextID++,type,x,y,w:d.w,h:d.h,hp,maxHP:hp,face:side,pass:side,cooldown:1.1,burst:0,gap:0,shots:0,kb:0};s.units.push(u);return u;
}
export function hitUnit(s:MilitaryState,u:Unit,damage:number,source:'player'|'military'|'boss'='player',knockback=0,direction=1,ultimate=false){
 if(u.hp<=0||damage<=0)return 0;
 const actual=Math.min(u.hp,damage);u.hp=Math.max(0,u.hp-actual);
 if(knockback)u.kb=direction*knockback/UNITS[u.type].mass;
 if(source==='player')s.events.push({kind:'reward',x:u.x+u.w/2,damage:actual,points:u.hp===0?UNITS[u.type].points:0,shards:u.hp===0?M.unitShards:0,ultimate});
 if(u.hp===0){
 s.effects.push({x:u.x+u.w/2,y:u.y+u.h/2,radius:20,life:M.impactSeconds,harmless:true});
 if(s.wrecks.length>=M.wreckCap)s.wrecks.shift();
 if(u.type!=='police'&&u.type!=='soldier')s.wrecks.push({x:u.x,y:u.y,w:u.w,h:u.h,life:M.wreckSeconds,air:UNITS[u.type].air,lane:roadLane(u)});
 }
 return actual;
}
// Military vehicles drive in the traffic lanes like civilian cars (alternating by id); foot troops, emplacements and aircraft
// have no lane. Like civilian traffic, the lane only changes where the unit is drawn; gameplay stays x/y.
export const ROAD_UNITS=new Set<UnitType>(['patrol','apc','tank','artillery']);
export function roadLane(u:{id:number,type:UnitType}):0|1|null{return ROAD_UNITS.has(u.type)?(u.id%2) as 0|1:null;}
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
 if(withinBlast(p.x,p.y,p.radius,player))s.events.push({kind:'playerHit',damage:p.damage,strength:p.strength,direction:player.x+player.w/2<p.x?-1:1});
 // Military explosions hit military, with full radius damage, never buildings.
 for(const u of s.units)if(u.hp>0&&withinBlast(p.x,p.y,p.radius,u))hitUnit(s,u,p.damage,'military',p.strength,u.x+u.w/2<p.x?-1:1);
 if(boss&&withinBlast(p.x,p.y,p.radius,boss))s.events.push({kind:'cosmetic',x:boss.x+boss.w/2,y:boss.y+boss.h/2});
}
export function launch(s:MilitaryState,u:Unit,weapon:Weapon,target:Rect){
 if(s.projectiles.filter(p=>!p.dead).length>=M.projectileCap)return null;
 const d=WEAPONS[weapon],x=u.x+u.w/2,y=u.y+u.h/2;
 const tx=target.x+target.w/2,ty=target.y+target.h*.65,angle=Math.atan2(ty-y,tx-x);
 const p:Projectile={id:s.nextID++,weapon,x,y,vx:Math.cos(angle)*d.speed,vy:Math.sin(angle)*d.speed,life:weapon==='artillery'?2.1:M.bulletLife,owner:u.id,damage:d.damage*(1+s.city*M.cityDamage),radius:d.radius,strength:d.strength,dead:false,age:0,startX:x,startY:y,targetX:weapon==='bomb'?x:tx,flight:1.65};
 if(weapon==='bomb'){p.vx=0;p.vy=80;}s.projectiles.push(p);return p;
}
function startBurst(s:MilitaryState,u:Unit,target:Rect){
 const type=u.type;
 if(type==='tank'){launch(s,u,'shell',target);return;}
 if(type==='artillery'){launch(s,u,'artillery',target);return;}
 u.burst=type==='police'||type==='patrol'?1:type==='soldier'?3:type==='bomber'?3:type==='helicopter'?6:6;u.gap=0;
}
export function tickMilitary(s:MilitaryState,dt:number,camera:number,worldWidth:number,player:Rect,threat:number,boss?:Rect,contactSource:'player'|'military'='player'){
 s.spawnTimer-=dt;
 const cap=M.caps[s.tier-1];
 if(s.spawnTimer<=0&&s.units.filter(u=>u.hp>0).length<cap){
 const roster=ROSTERS[s.tier-1],type=roster[s.sequence++%roster.length],side=s.rng()<.5?1:-1;
 const def=UNITS[type];
 spawnUnit(s,type,side===1?camera-M.spawnMargin-def.w:camera+C.width+M.spawnMargin,side);
 // Stationary guns arrive just outside the leading viewport and remain fixed.
 s.spawnTimer=M.spawnSeconds[s.tier-1]*(1+(s.rng()-.5)*2*M.spawnVariance)/(1+Math.max(0,Math.min(1,threat))*M.threatPressure+s.city*M.cityPressure);
 }
 for(const u of s.units){if(u.hp<=0)continue;const d=UNITS[u.type];
 const target=boss&&Math.abs(boss.x-u.x)<Math.abs(player.x-u.x)?boss:player;
 u.face=target.x+target.w/2>=u.x+u.w/2?1:-1;
 u.x+=u.kb*dt;u.kb*=Math.exp(-M.knockbackFriction*dt);
 if(u.type==='jet'||u.type==='bomber')u.x+=u.pass*d.speed*dt;
 else if(d.speed>0&&Math.abs(target.x+target.w/2-u.x-u.w/2)>d.range*.7)u.x+=u.face*d.speed*dt;
 u.cooldown=Math.max(0,u.cooldown-dt);
 // Even scheduled burst rounds may only be launched while the shooter is visible.
 if(!onScreen(u,camera)){u.burst=0;continue;}
 if(u.cooldown===0&&u.burst===0){startBurst(s,u,target);u.cooldown=d.cooldown;}
 if(u.burst>0){u.gap-=dt;if(u.gap<=0){
 const weapon:Weapon=u.type==='bomber'?'bomb':u.type==='helicopter'&&u.burst<=2?'rocket':'bullet';
 launch(s,u,weapon,target);u.burst--;u.shots++;u.gap=weapon==='rocket'?M.rocketGap:M.burstGap;
 }}
 if((u.type==='police'||u.type==='soldier')&&overlaps(u,player))hitUnit(s,u,u.hp,contactSource);
 }
 for(const p of s.projectiles){if(p.dead)continue;const ox=p.x,oy=p.y;p.age+=dt;p.life-=dt;
 if(p.weapon==='artillery'){const t=Math.min(1,p.age/p.flight);p.x=p.startX+(p.targetX-p.startX)*t;p.y=p.startY+(C.ground-p.startY)*t-Math.sin(t*Math.PI)*170;}
 else {if(p.weapon==='bomb')p.vy+=210*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
 const hitsPlayer=segmentHits(ox,oy,p.x,p.y,player,2),hitsBoss=boss&&segmentHits(ox,oy,p.x,p.y,boss,2);
 if(p.weapon==='artillery'||p.weapon==='bomb'){
 if(p.y>=C.ground||p.weapon==='artillery'&&p.age>=p.flight){p.y=C.ground;detonate(s,p,player,boss);}
 }else if(hitsPlayer||hitsBoss||p.y>=C.ground){
 if(p.radius>0)detonate(s,p,player,boss);
 else {p.dead=true;if(hitsPlayer)s.events.push({kind:'playerHit',damage:p.damage,strength:0,direction:Math.sign(p.vx)||1});else if(hitsBoss)s.events.push({kind:'cosmetic',x:p.x,y:p.y});}
 }
 }
 s.projectiles=s.projectiles.filter(p=>!p.dead&&p.life>0&&p.x>camera-M.despawnDistance&&p.x<camera+C.width+M.despawnDistance);
 s.units=s.units.filter(u=>u.hp>0&&u.x>camera-M.despawnDistance&&u.x<camera+C.width+M.despawnDistance&&(!(u.type==='jet'||u.type==='bomber')||u.x>camera-250&&u.x<camera+C.width+250));
 for(const w of s.wrecks){w.life-=dt;if(w.air)w.y=Math.min(C.ground-w.h,w.y+150*dt);}
 s.wrecks=s.wrecks.filter(w=>w.life>0);
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
 // Effects are cosmetic; they never resolve damage a second time.
}
