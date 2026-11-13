import {test} from 'node:test';import assert from 'node:assert/strict';
import {CONFIG as C,MILITARY as M,MILITARY_FEEL as MF} from '../src/config.ts';
import {createMilitary,spawnUnit,tickMilitary,hitUnit,smallArmsScale,squadTypes,UNITS,ROSTERS} from '../src/military.ts';
const player={x:400,y:C.ground-69,w:48,h:69};
const fresh=(tier=1)=>createMilitary(tier,0,()=>.75);
const run=(s:ReturnType<typeof fresh>,seconds:number,p=player,stage=1)=>{const out:any[]=[];for(let t=0;t<seconds;t+=.02){tickMilitary(s,.02,0,3840,p,.5,undefined,'player',C.width,stage);out.push(...s.events);s.events=[];}return out;};

test('tank winds up, tracks, locks, then fires at the locked point so moving dodges',()=>{
 const s=fresh(3);s.spawnTimer=999;const u=spawnUnit(s,'tank',700);u.cooldown=0;
 run(s,.1);assert.equal(u.pending,'shell');assert.equal(s.projectiles.length,0);
 const moved={...player,x:player.x};run(s,MF.tankWindup-MF.lockAt-.1,moved);
 moved.x=200;run(s,.05,moved);const lockX=u.aimX;assert.ok(Math.abs(lockX-(200+24))<1,'aim tracks before the lock');
 moved.x=600;run(s,MF.lockAt+.05,moved);assert.equal(u.aimX,lockX,'aim is frozen once locked');
 const shell=s.projectiles.find(p=>p.weapon==='shell')!;assert.ok(shell);assert.ok(shell.vx<0,'fired at the locked point, not the moved target');
});

test('hitting a unit mid wind-up interrupts it: no shot, a stun and bonus points',()=>{
 const s=fresh(3);s.spawnTimer=999;const u=spawnUnit(s,'tank',700);u.cooldown=0;run(s,.1);assert.equal(u.pending,'shell');
 hitUnit(s,u,10,'player',0,1,false,'melee');
 const reward=s.events.find(e=>e.kind==='reward') as any;assert.equal(reward.interrupt,true);assert.equal(reward.points,MF.interruptPoints);
 assert.equal(u.pending,null);assert.equal(u.stun,MF.stunSeconds);s.events=[];
 const x=u.x;run(s,MF.stunSeconds-.1);assert.equal(s.projectiles.length,0);assert.equal(u.x,x,'stunned units hold still');
 // Military friendly fire never interrupts for a reward.
 const t=spawnUnit(s,'tank',800);t.windup=.5;t.pending='shell';hitUnit(s,t,5,'military');assert.ok(!s.events.some(e=>e.kind==='reward'));
});

test('small arms fade with stage: half at Stage 1, nothing at Stage 3; explosives unaffected',()=>{
 assert.equal(smallArmsScale('bullet',1),MF.bulletStage[0]);assert.equal(smallArmsScale('bullet',3),0);
 for(const w of ['shell','rocket','bomb','artillery'] as const)assert.equal(smallArmsScale(w,3),1);
});

test('reinforcements arrive as a whole squad from one side with one announcement and one radio',()=>{
 const s=fresh(3);s.spawnTimer=0;tickMilitary(s,.01,0,3840,player,0);
 const t=MF.squads[2][0],expected=squadTypes(t);assert.equal(s.units.length,expected.length);
 const announces=s.events.filter(e=>e.kind==='announce') as any[];assert.equal(announces.length,1);assert.equal(announces[0].label,t.label);assert.equal(announces[0].count,expected.length);
 assert.equal(new Set(s.units.map(u=>u.pass)).size,1);assert.equal(s.units.filter(u=>u.spotter).length,1);
 assert.deepEqual(s.units.map(u=>u.type),expected);
 // Destruction adds escorts.
 const b=fresh(1);b.spawnTimer=0;tickMilitary(b,.01,0,3840,player,1);assert.equal(b.units.length,squadTypes(MF.squads[0][0],MF.squadEscalate).length);
});

test('the next squad waits until this one is mostly wrecked (plus a breather) or the long timer runs out',()=>{
 const s=fresh(1);s.spawnTimer=0;tickMilitary(s,.01,0,3840,player,0);s.events=[];
 for(const u of s.units)u.cooldown=99;
 const quiet=run(s,MF.squadBreather+1);assert.ok(!quiet.some(e=>e.kind==='announce'),'no new squad while the first is alive');
 const n=s.units.length;for(const u of s.units.slice(0,Math.ceil(n*(1-MF.squadClear))))hitUnit(s,u,999,'player');s.events=[];
 const next=run(s,MF.squadBreather+.2);assert.equal(next.filter(e=>e.kind==='announce').length,1,'clearing the squad brings the next after a breather');
 // Ignored squads still escalate on the long timer.
 const t=fresh(1);t.spawnTimer=0;tickMilitary(t,.01,0,3840,player,0);t.events=[];
 const far={...player,x:3000};const later=run(t,MF.squadMax[0]*1.25,far);assert.ok(later.filter(e=>e.kind==='announce').length>=1);
});

test('squads are trimmed to the cap, never exceed it, and every roster type appears in its tier templates',()=>{
 for(let tier=1;tier<=5;tier++){const types=new Set(MF.squads[tier-1].flatMap(t=>squadTypes(t)));
  for(const t of types)assert.ok(ROSTERS[tier-1].includes(t as any),`${t} in tier ${tier} roster`);
  for(const t of MF.squads[tier-1])assert.ok(squadTypes(t,MF.squadEscalate).length<=M.caps[tier-1]+4);}
 const s=fresh(5);for(let n=0;n<3000;n++){tickMilitary(s,.05,0,3840,player,1);s.events=[];assert.ok(s.units.length<=M.caps[4]);}
});

test('a spotter left alive calls an artillery strike on the kaiju; killing it first cancels the call',()=>{
 const s=fresh(2);s.spawnTimer=999;const spotter=spawnUnit(s,'soldier',650,1,true);spawnUnit(s,'soldier',660);
 assert.ok(spotter!.spotter);for(const u of s.units)if(u!==spotter)u.hp=0;s.units=[spotter!];spotter!.cooldown=99;
 const events=run(s,MF.spotterSeconds+.1);const strike=events.find(e=>e.kind==='strike');assert.ok(strike);assert.equal(strike.x,player.x+player.w/2);
 const shell=s.projectiles.find(p=>p.weapon==='artillery')!;assert.equal(shell.radius,MF.strikeRadius);assert.equal(shell.targetX,player.x+player.w/2);
 const b=fresh(2);b.spawnTimer=999;const sp=spawnUnit(b,'soldier',650,1,true);b.units=[sp!];sp!.cooldown=99;
 run(b,MF.spotterSeconds*.6);hitUnit(b,sp!,999,'player');b.events=[];assert.ok(!run(b,MF.spotterSeconds).some(e=>e.kind==='strike'));
});

test('destroyed heavies explode: the blast catches nearby military and is credited to the killer',()=>{
 const s=fresh(3);s.spawnTimer=999;const tank=spawnUnit(s,'tank',700),near=spawnUnit(s,'police',700+UNITS.tank.w+5),far=spawnUnit(s,'police',1400);
 hitUnit(s,tank,999,'player',300,1,false,'thrown');
 assert.equal(near.hp,0);assert.ok(far.hp>0);
 const death=s.events.find(e=>e.kind==='death'&&e.type==='tank') as any;assert.equal(death.cause,'thrown');
 const rewards=s.events.filter(e=>e.kind==='reward') as any[];assert.equal(rewards.length,2,'the chain kill is the player\'s');
 // A friendly-fire kill chains with no reward.
 const m=fresh(3);const a=spawnUnit(m,'tank',700),b=spawnUnit(m,'police',700+UNITS.tank.w+5);hitUnit(m,a,999,'military');assert.equal(b.hp,0);assert.ok(!m.events.some(e=>e.kind==='reward'));
});

test('downed aircraft fall, crash once on the street and blast nearby military',()=>{
 const s=fresh(4);s.spawnTimer=999;const heli=spawnUnit(s,'helicopter',700),below=spawnUnit(s,'police',730);below.stun=99;heli.cooldown=99;
 hitUnit(s,heli,999,'player',0,1,false,'ranged');s.events=[];
 const wreck=s.wrecks[0];assert.ok(wreck.falling);assert.equal(below.hp>0,true);
 const events=run(s,3);assert.equal(events.filter(e=>e.kind==='crash').length,1);assert.equal(wreck.falling,false);assert.equal(wreck.y,C.ground-wreck.h);
 assert.equal(below.hp,0);assert.ok(events.some(e=>e.kind==='reward'&&e.points===UNITS.police.points),'crash kill is credited to whoever downed it');
});

test('Stage 2+ crushes the ground vehicles it walks into; Stage 1 still passes through',()=>{
 for(const stage of [1,2]){const s=fresh(3);s.spawnTimer=999;const tank=spawnUnit(s,'tank',player.x);tank.cooldown=99;
  tickMilitary(s,.001,0,3840,player,0,undefined,'player',C.width,stage);
  if(stage===1)assert.ok(tank.hp>0);else{assert.equal(tank.hp,0);assert.ok(s.events.some(e=>e.kind==='death'&&(e as any).cause==='crush'));}}
});

test('knocked-back ground units hop and land back on the street',()=>{
 const s=fresh(2);s.spawnTimer=999;const u=spawnUnit(s,'apc',800);u.cooldown=99;hitUnit(s,u,5,'player',300,1);
 assert.ok(u.vy<0);let peak=u.y;for(let t=0;t<1.5;t+=.02){tickMilitary(s,.02,0,3840,player,0);s.events=[];peak=Math.min(peak,u.y);}
 assert.ok(peak<C.ground-u.h-5);assert.equal(u.y,C.ground-u.h);assert.equal(u.vy,0);
});
