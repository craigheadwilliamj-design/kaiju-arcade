import {SF2} from './config.ts';

// A floating stronghold (SF Act 2): the Coast Guard cutter. It is an objective like the clock tower (same HP rules, see game.ts
// hitObjective); this module owns what is special about it: the hull rides the waterline, and once destroyed it sinks, listing as it
// goes. `scale` builds a bigger or smaller hull of the same design (Level 8's aircraft carrier scales it up).
export type Ship={x:number,w:number,h:number,deck:number,scale:number,sinking:boolean,sink:number,list:number};
export function createShip(x:number,scale=1):Ship{return {x,w:Math.round(SF2.cutterW*scale),h:Math.round(SF2.cutterH*scale),deck:Math.round(SF2.cutterDeck*scale),scale,sinking:false,sink:0,list:0};}
export function sinkShip(s:Ship){s.sinking=true;}
// How far down the hull is (0 afloat .. 1 gone under), and how far it lists (radians, bow-down).
export function tickShip(s:Ship,dt:number){if(!s.sinking||s.sink>=1)return;s.sink=Math.min(1,s.sink+dt/(SF2.sinkSeconds*Math.sqrt(s.scale)));s.list=SF2.listMax*Math.min(1,s.sink*2.5);}
export function shipSunk(s:Ship){return s.sink>=1;}
// The deck's height above the waterline (it sinks with the hull). A kaiju walking the deck stands on this.
export function deckY(s:Ship,waterline:number){return waterline-s.deck+s.sink*(s.h+s.deck)*SF2.sinkDepth;}
// The hull box in world coordinates: hit box while it floats; nothing once it is under.
export function hullBox(s:Ship,waterline:number){const y=waterline-s.deck+s.sink*(s.h+s.deck)*SF2.sinkDepth;return {x:s.x-s.w/2,y,w:s.w,h:s.h+s.deck};}
