import {WATER as W} from './config.ts';
import {depthAt,submerged,deckAt,groundAt,waterAt} from './terrain.ts';
import type {CombatState} from './combat.ts';
import {drownPenalty} from './combat.ts';

// Depth bands (blocks that set `bands`): the water's depth against the kaiju's standing height, so the same river is a wade at
// Stage 1 and a puddle at Stage 3.
export type Band='dry'|'shallows'|'wading'|'deep';
export function waterBand(depth:number,height:number):Band{
 if(depth<=0)return 'dry';const r=depth/height;return r<W.shallow?'shallows':r<=W.deep?'wading':'deep';}
export function bandAt(x:number,height:number):Band{return waterBand(depthAt(x),height);}
// How the band changes the kaiju on its feet: speed multiplier, whether it may run, jump multiplier.
export function bandSpeed(b:Band){return b==='shallows'?W.shallowSlow:b==='wading'||b==='deep'?W.wadeSlow:1;}
export function bandRuns(b:Band){return b==='dry'||b==='shallows';}
export function bandJump(b:Band){return b==='wading'||b==='deep'?W.wadeJump:1;}
// The shore as a drop-off: a grounded step from water you can stand in (or land) into water over your head is refused.
export function blockedStep(fromX:number,toX:number,height:number){return bandAt(toX,height)==='deep'&&bandAt(fromX,height)!=='deep';}
// Feet far enough under the surface of over-your-head water: drowning.
export function drowning(x:number,feet:number,height:number){const s=waterAt(x);return s!==null&&bandAt(x,height)==='deep'&&feet>s+W.dip;}
// Safe ground to come back to: standing on the street itself (not a bridge deck, which can fall), with no water under any of the body.
export function safeGround(x:number,w:number,feet:number){
 const cx=x+w/2;return !submerged(x)&&!submerged(cx)&&!submerged(x+w)&&!deckAt(cx)&&Math.abs(feet-groundAt(cx))<2;}
// The nearest x (body left edge) to `x` with dry ground under the whole body, searching outward; `x` itself when it is dry.
export function nearestDry(x:number,w:number,worldWidth:number){
 const dry=(p:number)=>p>=0&&p+w<=worldWidth&&!submerged(p)&&!submerged(p+w/2)&&!submerged(p+w);
 if(dry(x))return x;for(let d=8;d<worldWidth;d+=8){if(dry(x-d))return x-d;if(dry(x+d))return x+d;}return x;}

// Drowning, step by step: sink (where you went under), slide (the camera carries you back to safe ground), respawn there, then the
// penalty a beat later. tickDrown reports what happened this tick, in order; the game moves the body and the camera.
export type Drown={phase:'sink'|'slide'|'mercy'|'done',t:number,fromX:number,toX:number,penalized:boolean};
export type DrownEvent='slide'|'respawn'|'penalty'|'done';
export function startDrown(fromX:number,toX:number):Drown{return {phase:'sink',t:0,fromX,toX,penalized:false};}
// Where the body is (left edge x) during the slide: eased from where it went under to the safe spot.
export function slideX(d:Drown){if(d.phase==='sink')return d.fromX;if(d.phase!=='slide')return d.toX;const k=Math.min(1,d.t/W.slideSeconds),e=k*k*(3-2*k);return d.fromX+(d.toX-d.fromX)*e;}
export function tickDrown(d:Drown,dt:number,combat:CombatState):DrownEvent[]{
 const out:DrownEvent[]=[];if(d.phase==='done')return out;d.t+=dt;
 if(d.phase==='sink'&&d.t>=W.sinkSeconds){d.phase='slide';d.t-=W.sinkSeconds;out.push('slide');}
 if(d.phase==='slide'&&d.t>=W.slideSeconds){d.phase='mercy';d.t-=W.slideSeconds;combat.mercy=W.mercy;out.push('respawn');}
 if(d.phase==='mercy'&&!d.penalized&&d.t>=W.penaltyDelay){d.penalized=true;drownPenalty(combat,W.penalty);d.phase='done';out.push('penalty','done');}
 return out;}
