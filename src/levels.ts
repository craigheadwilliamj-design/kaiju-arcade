import type {Part} from './hitbox.ts';
// `landmark`: a named, high-value tower drawn with its own crown and always-visible name banner.
// `cache`: an ordinary-looking building hiding a crystal vein; it glints faintly and pays out when destroyed.
// `role`: a structure with a job in the city (src/city.ts). `roof`: a rooftop fixture on an ordinary building.
export type BuildingSpec={x:number,w:number,h:number,hp:number,value:number,kind:'tiny'|'medium'|'large',upperDeck?:boolean,label:string,color:string,landmark?:boolean,cache?:boolean,role?:'substation'|'depot'|'armory'|'hydrant'|'powerhouse',roof?:'radar'|'tank'|'sign'|'crab'|'helipad',shape?:string,prop?:string,parts?:Part[],deco?:string,explosive?:boolean,slab?:boolean};
// `parts`: the hitbox silhouette (src/hitbox.ts); omitted means one box, the whole footprint.
// `prop`: street junk (a walk-through breakable: hot dog cart, trash can, taco stand, advertising column, café table, market stall,
// vending machine), drawn per kind.
// `shape`: a landmark's silhouette ('tower' default, 'lattice', 'dome', 'twin', 'arch', 'bow', 'needle', 'pagoda'); its hitbox parts follow the drawing (shapeParts).
// Fixed New York Block 1: four screen widths, authored positions, never generated.
const NEW_YORK_BLOCK_ONE_AUTHORED:BuildingSpec[]=[
 {x:295,w:64,h:82,hp:60,value:70,kind:'medium',label:'DELI',color:'#577b84'},
 {x:405,w:92,h:118,hp:90,value:100,kind:'medium',label:'MARKET',color:'#b36d57'},
 {x:570,w:126,h:220,hp:150,value:180,kind:'large',label:'',color:'#62708b'},
 {x:760,w:32,h:42,hp:20,value:20,kind:'tiny',label:'NEWS',color:'#ca9a50'},
 {x:855,w:102,h:146,hp:100,value:120,kind:'medium',label:'ARCADE',color:'#846a89'},
 {x:1090,w:82,h:106,hp:90,value:100,kind:'medium',label:'DINER',color:'#b67660'},
 {x:1270,w:136,h:254,hp:180,value:210,kind:'large',label:'',color:'#657d8b'},
 {x:1470,w:80,h:130,hp:90,value:100,kind:'medium',label:'RECORDS',color:'#a28166'},
 {x:1635,w:32,h:46,hp:20,value:20,kind:'tiny',label:'',color:'#81a47e'},
 {x:1760,w:110,h:180,hp:120,value:140,kind:'medium',label:'HOTEL',color:'#8b7688'},
 {x:1980,w:130,h:236,hp:165,value:190,kind:'large',label:'',color:'#687788'},
 {x:2200,w:90,h:120,hp:90,value:100,kind:'medium',label:'BODEGA',color:'#b77b5c'},
 {x:2410,w:104,h:166,hp:110,value:130,kind:'medium',label:'CINEMA',color:'#708b8c'},
 {x:2620,w:142,h:266,hp:180,value:210,kind:'large',label:'',color:'#687389'},
 {x:2870,w:34,h:44,hp:20,value:20,kind:'tiny',label:'NEWS',color:'#c79855'},
 {x:2980,w:96,h:140,hp:100,value:120,kind:'medium',label:'CAFE',color:'#9c7965'},
 {x:3210,w:122,h:210,hp:150,value:180,kind:'large',label:'',color:'#6b8392'},
 {x:3460,w:100,h:122,hp:90,value:100,kind:'medium',label:'SHOP',color:'#b2826f'},
];

import {CONFIG,BUILDING_PRESETS,MAINS,SF,GAS,BRIDGE,GATE,EMPIRE,CONEY} from './config.ts';
import {shapeParts} from './hitbox.ts';
import {VEHICLE_SPECS} from './vehicles.ts';
import {profileFrom,profileY} from './terrain.ts';
// Each city's look (phase 4): `mood` is its sky and light (lights 0 = broad day .. 1 = night: lit windows, neon), `style` picks the
// facade drawing, `material` how its buildings break, `taxi`/`cars` its street colours, `ink` the HUD text colour over its sky.
export type Mood={top:string,bottom:string,far:string,mid:string,near:string,win:string,lights:number,sun:string,rain?:boolean,smog?:boolean};
export type CityStyle='nyc'|'mex'|'par'|'hkg'|'tyo';
// A city is a place; a kaiju is optional. `kaiju`: the playable kaiju a campaign plays there (absent = the run's chosen kaiju carries
// on, today's rule for the five original cities). `boss`: the final boss of its last level. `difficulty`: the military/rival scaling
// step (src/military.ts, src/rival.ts), kept per city so adding a city never shifts another city's tuning.
export type City={id:string,name:string,code:string,kaiju?:string,boss:string,difficulty:number,sky:string,haze:string,colors:string[],signs:string[],mood:Mood,style:CityStyle,
 material:{debris:string[],slab:number,glass?:boolean,frame?:boolean},taxi:string,cars:string[],ink:string};
export const CITIES:City[]=[
 // San Francisco (redesign phase 1): placeholder levels drawn with the existing NYC facades under a fog-grey sky.
 {id:'sfo',name:'San Francisco',code:'SFO',kaiju:'Mogurodon',boss:'Kaiban',difficulty:0,sky:'#a9b7bd',haze:'#d9dcd2',colors:['#c9a9a6','#9fb8ad','#e3d3a8','#a7b4c9','#d8b48f'],signs:['CAFE','HOTEL','MARKET','DINER'],
  mood:{top:'#9fb1ba',bottom:'#e4e2d6',far:'#aab4b8',mid:'#8e9a9f',near:'#66757b',win:'#f0d79a',lights:.2,sun:'#fff2d0'},style:'nyc',
  material:{debris:['#c9a9a6','#9c7f74','#d8d0bc'],slab:1},taxi:'#e0b43a',cars:['#3c4a5c','#9aa3aa','#8a3a32','#2f4a5a','#c8c2b0'],ink:'#2f4047'},
 // New York (NYC rework): Kaiban plays here, the final boss is Tlézcatl (the next city's kaiju).
 {id:'nyc',name:'New York',code:'NYC',kaiju:'Kaiban',boss:'Tlézcatl',difficulty:0,sky:'#95b0b2',haze:'#c8cbb5',colors:['#8a4e3e','#b36d57','#62708b','#7a5546','#a0634c'],signs:['DELI','MARKET','ARCADE','BODEGA'],
  mood:{top:'#86aac2',bottom:'#e8d5a9',far:'#9aa9ab',mid:'#7b8d8f',near:'#566a6e',win:'#e9cf86',lights:.15,sun:'#ffe4a6'},style:'nyc',
  material:{debris:['#8a4e3e','#6f3a2e','#b9a58c'],slab:1},taxi:'#f2c230',cars:['#3c4a5c','#8e9aa3','#7d2f2f','#2e3d36','#b7b2a6'],ink:'#2f4740'},
 {id:'mex',name:'Mexico City',code:'MEX',boss:'Tlézcatl',difficulty:1,sky:'#d3a476',haze:'#f0c98a',colors:['#d9846a','#e7c07a','#8fb39a','#c9879c','#e2d6b8'],signs:['MERCADO','CAFE','HOTEL','TIENDA'],
  mood:{top:'#b7845e',bottom:'#f4c886',far:'#b48d78',mid:'#94735f',near:'#6f5a4d',win:'#ffd89a',lights:.45,sun:'#ffb35c',smog:true},style:'mex',
  material:{debris:['#e2d6b8','#d9846a','#c9b79c'],slab:.9},taxi:'#e8789f',cars:['#c25b3c','#6d8f5f','#d8c27a','#4f6f8f','#e4dccb'],ink:'#4a2f22'},
 {id:'par',name:'Paris',code:'PAR',boss:'Belial',difficulty:2,sky:'#a5bbca',haze:'#d7d6c0',colors:['#d8ccae','#cfc2a3','#e0d6bd','#c8bc9e'],signs:['CAFE','CINEMA','HOTEL','LIBRAIRIE'],
  mood:{top:'#9fb0bd',bottom:'#dcdbcf',far:'#a3acb2',mid:'#8b969c',near:'#6e7a80',win:'#efd9a0',lights:.25,sun:'#f4efe0'},style:'par',
  material:{debris:['#d8ccae','#bfb293','#e6dcc4'],slab:1.45},taxi:'#2b2f33',cars:['#7a8c99','#b9473b','#d6cdb5','#4b5d4f','#9aa0a6'],ink:'#33404a'},
 {id:'hkg',name:'Hong Kong',code:'HKG',boss:'Myrmex',difficulty:3,sky:'#1c2740',haze:'#3b3f63',colors:['#c9c3b4','#a9b8b9','#d3b8a8','#9fb3a8'],signs:['MARKET','HOTEL','ARCADE','CAFE'],
  mood:{top:'#0e1628',bottom:'#3a3460',far:'#1f2a44',mid:'#18223a',near:'#141c30',win:'#ffd36e',lights:1,sun:'#f2ecd6'},style:'hkg',
  material:{debris:['#bfe3f0','#c9c3b4','#8fb6c6'],slab:.8,glass:true},taxi:'#c2312b',cars:['#d8d8d8','#2b3440','#6b7f99','#a0332e','#e2c46a'],ink:'#dfe7f2'},
 {id:'tyo',name:'Tokyo',code:'TYO',boss:'Sargathoth',difficulty:4,sky:'#1c212d',haze:'#3a3550',colors:['#4d5a6e','#5d6a7a','#3f4b5c','#6c7480'],signs:['ARCADE','CAFE','HOTEL','MARKET'],
  mood:{top:'#141924',bottom:'#3b3451',far:'#232a39',mid:'#1c2230',near:'#151a26',win:'#9fe6ff',lights:1,sun:'#e8eef6',rain:true},style:'tyo',
  material:{debris:['#9aa3ad','#5d6a7a','#bfe3f0'],slab:1,frame:true},taxi:'#2c3e6b',cars:['#e8e8e6','#b8bcc0','#33373d','#5f7f9c','#c9b28a'],ink:'#dfe7f2'},
 // The old New York blocks, off the route: a test fixture city (tests boot it through kaijuTest.gotoCity). Not in CAMPAIGN, so it
 // never reaches Free Play, the campaign map, records or progress.
 {id:'nyc-classic',name:'New York (classic)',code:'NYC',boss:'Kaiban',difficulty:0,sky:'#95b0b2',haze:'#c8cbb5',colors:['#8a4e3e','#b36d57','#62708b','#7a5546','#a0634c'],signs:['DELI','MARKET','ARCADE','BODEGA'],
  mood:{top:'#86aac2',bottom:'#e8d5a9',far:'#9aa9ab',mid:'#7b8d8f',near:'#566a6e',win:'#e9cf86',lights:.15,sun:'#ffe4a6'},style:'nyc',
  material:{debris:['#8a4e3e','#6f3a2e','#b9a58c'],slab:1},taxi:'#f2c230',cars:['#3c4a5c','#8e9aa3','#7d2f2f','#2e3d36','#b7b2a6'],ink:'#2f4740'},
];
// `start`: open layouts set a mid-map spawn x; the player can roam both ways and leave by either end once the quota is met.
// Blocks without it keep the classic west spawn and single eastern exit.
// `grids`: power grids as [from,to] x ranges; each is fed by the substation standing inside it. `poles`: power-pole x positions
// (street lamps standing on the same spot are left out). Both optional; blocks without them have no city systems.
// Growth (redesign): `startStage` is the stage a campaign enters the level at, `cap` the highest it can grow to there and `capLift`
// the cap after a mid-level lift (liftCap in src/combat.ts; a crystal will trigger it). Absent = today's rule: the stage carries
// over from the last block, Stage 1 to 3. `tier`: the military response tier (absent = the block's position, 1-5).
// `secret`: in the city's level list but off the campaign route (reached later by a secret exit).
// New York Act 1 (NYC rework card 2), opt-in: `vents` x of steam-vent manholes (src/config.ts STEAM): they puff now and then, and a slam or pound
// near one bursts it into a steam jet that scalds troops, launches cars and blinds helicopters (it never sets a building alight, unlike SF's gas
// mains). `bull` x of the Charging Bull, a heavy bronze prop (src/config.ts BULL: grabbable by a strong kaiju, thrown short and hard, immune to
// street damage). Target art `fort` is Castle Clinton, `exchange` the NYSE command post. `spawn` x the kaiju starts at (like `start` but
// without making the level a there-and-back with a west exit): The Battery starts in the harbour, over a `bands` water span with a seabed `ground` profile.
export type BlockDef={name:string,screens:number,kind:'district'|'stronghold'|'boss',startStage?:1|2|3,cap?:1|2|3,capLift?:2|3,tier?:number,secret?:boolean,buildings:BuildingSpec[],street:number[],cars:number[],start?:number,grids?:[number,number][],poles?:number[],ground?:[number,number][],water?:[number,number,number][],bridge?:{x0:number,x1:number,spans:number,rise?:number,more?:[number,number,number][]},subway?:[number,number][],elevated?:[number,number],bands?:boolean,tunnel?:'deep',boats?:number[],
 target?:{x:number,label:string,art:'clock'|'command'|'pyramid'|'cutter'|'fort'|'exchange'|'arena',scale?:number,launch?:boolean},pocket?:{x0:number,x1:number,hp:number},garage?:[number,number][],police?:boolean,air?:number[],swat?:number[],
 guard?:boolean,lanterns?:[number,number,number][],crystal?:number,streetcars?:number[],cablecars?:number[],trolleys?:number[],firetrucks?:number[],pier?:{x0:number,x1:number},
 // Phase 4 (SF Act 2), all opt-in. See the notes below.
 units?:[('police'|'patrol'|'soldier'|'helicopter'|'apc'|'tank'|'emplacement'|'artillery'),number,number?][],garrison?:[('police'|'patrol'|'soldier'|'helicopter'|'apc'|'tank'|'emplacement'|'artillery'),number][],cableLines?:[number,number][],tumble?:[number,number],
 exits?:{west?:string,east?:string},after?:string,fog?:{from:number,to:number,max:number},sealions?:number[],kaiban?:{x:number,wade:[number,number]},
 buses?:number[],elevatedLook?:'park'|'freeway',ramps?:[number,number][],coastguard?:number[],
 // Phase 5 (SF Act 3), all opt-in. See the notes below.
 cracks?:number[],gas?:boolean,fireCap?:number,elevatedDecks?:2,approach?:number,deckApproach?:number,
 finale?:{x:number,wake:number,breaks:number[],perches?:{x0:number,x1:number,h:number}[],tower?:number,crack?:number},warships?:['gunboat'|'destroyer',number][],deckUnits?:[('tank'|'soldier'|'apc'|'artillery'|'emplacement'),number][],
 // Phase 6 (Alcatraz), all opt-in. `exitAt`: the destruction a district needs before its exits open (default CONFIG.exitThreshold).
 // `secretId`: clearing this secret level in the campaign unlocks it in Free Play and adds its gallery entry (src/campaign.ts).
 // `lore`: one results-screen line. `hazmat`: this level's soldiers are drawn in hazmat suits (a reskin, nothing else changes).
 exitAt?:number,secretId?:string,lore?:string,hazmat?:boolean,
 // New York Act 1 (NYC rework card 2), all opt-in. See the notes below.
 vents?:number[],bull?:number,spawn?:number,
 // New York Act 3 (NYC rework card 5), all opt-in. See the notes below.
 ventsAuto?:boolean,yard?:{x0:number,x1:number,spans:number},balloons?:[number,number][],
 // New York secret level (NYC rework card 7), all opt-in. See the notes below.
 wheel?:number,coaster?:[number,number]};
// New York secret level (NYC rework card 7, Coney Island), opt-in: `wheel` x of the Ferris wheel's centre (src/config.ts CONEY): a huge round body standing on its
// base, a `deco:'wheelbase'` building; when the base is broken the wheel comes off and rolls (src/rolling.ts), speeding up on any slope, bowling through the buildings it
// flattens and wrecking against the first it cannot. `coaster` [x0, x1] the roller coaster's run: a raised wooden track of `deco:'track'` buildings (each a stack of
// hit parts: posts, a cross-brace, the deck you can climb) with a train shuttling along it like a cable car; a train with no deck under it (a section broken) derails and
// runs away. Building decos `wheelbase`, `track` and `lifeguard` are drawings of this level.
// New York Act 3 (NYC rework card 5), opt-in: `ventsAuto` makes the level's `vents` geysers (src/config.ts STEAM.geyser): they burst on their own,
// no slam needed, much bigger than the Act 1 vents. `yard` {x0, x1, spans}: Hudson Yards' rail-yard deck, world x, `spans` equal deck spans at street
// level over a live rail yard. The level builder also sets the matching `bridge` (the spans) and `subway` + `tunnel:'deep'` (the yard's line: trains run
// under the deck); breaking a span opens a pit down to the yard floor and whatever stands on it goes down too (src/config.ts NYC3). `balloons`
// [x, altitude] parade balloons (src/config.ts PARADE): x of the tether on the street, altitude the balloon's centre above the street, both world
// units. Target art `arena` is Madison Square Garden: a drum with the Army field HQ at its foot. Building deco `float` is a parade float.
// Phase 3 (SF Act 1), all opt-in, x in world units like `start`. `target`: a stronghold's objective at x as a clock tower or command post
// (default: the central crystal). `pocket`: a sealed tunnel pocket you start in; its roof box (hp) is a ceiling until broken. `garage`: x ranges
// over an underground garage: a slam caves it into a pit of parked cars. `police`: helicopters and soldiers here are drawn as police / SWAT.
// `air` / `swat`: police helicopters and SWAT teams stationed at these x. `guard`: National Guard roll in at the exit once it opens.
// `lanterns`: lantern strings [x0, x1] across the street (a fire fuse). `crystal`: x of the crystal formation (shatter = lift the cap).
// `streetcars` / `cablecars` / `trolleys` / `firetrucks`: grabbable vehicles stationed at these x (trolleys are buses under wires).
// `pier`: the pier deck's x range (it is the block's `bridge` over shallow water).
// `bands`: the water follows the depth bands (src/water.ts: shallows, wading, over your head, drowning); without it water is the old
// flat wade. `tunnel: 'deep'`: subway pits are RIVER.deepPitDepth deep (San Francisco). `boats`: police boats stationed on the water at
// these x positions. All opt-in, for the San Francisco campaign; no existing city sets them.
// Phase 4 (SF Act 2). `units`: extra stationed units at x, with an altitude (px above the street) for aircraft (join as the camera nears, like `air`/`swat`); `garrison`: replaces a stronghold's
// default garrison near its target (type, offset from the target). `cableLines`: street stretches [x0, x1] with a cable car shuttling on
// each (src/rolling.ts); the level's powerhouse (role 'powerhouse') sets them all loose when destroyed. `tumble`: x range where parked
// cars are let go downhill when the camera nears (Lombard Street). `ramps`: the ramp stretches of a terraced hill (for placing lines).
// `exits`: a there-and-back level's two exits, each naming the level (by name) it leads to; `after`: where a secret level rejoins the route.
// `fog`: fog overlay {from, to, max} (src/fog.ts).
// `sealions`: Pier 39 sea lions at x. `kaiban`: Kaiban's silhouette wading in the bay at x over a wade range. `buses`: bus terminal buses under
// an `elevatedLook: 'park'` roof (the elevated system drawn as a roof park, no trains). `coastguard`: Coast Guard boats on the water at x.
// `runaway`: x of cable cars (listed in `cablecars`) that come loose rolling when the camera nears (Jefferson Street).
// Phase 5 (SF Act 3). `cracks`: x of the fault cracks (src/config.ts CRACK): a slam, pound or Ultimate near one sets off a district quake;
// the last is the Big One. `gas`: the level's hydrants are gas mains (a burst is a fire geyser). `fireCap`: how many buildings may burn at
// once (default FIRE.cap). `elevatedDecks: 2` with `elevatedLook: 'freeway'`: the elevated line is a double-deck freeway that pancakes on the Big One.
// `bridge.rise`: how far above the street (and the water) the decks stand; `bridge.more`: further [x0, x1, spans] decks at the same height.
// `finale`: a boss level's Kaiban finale (src/config.ts GATE): `x` where it waits, `wake` the x that wakes it, `breaks` the health fractions at which the deck gives way.
// Opt-in climbing finale (NYC rework card 6, src/config.ts EMPIRE): `perches` the setback ledges up a tower, bottom first ([x0,x1] the standable x range, `h` the surface height
// above the street); `tower` the x of the tower building (its west edge) whose setbacks give way at each break; `crack` the x the street splits at on the wake.
// `warships`: gunboats and destroyers stationed on the water (under a deck too). `deckUnits`: ground units that stand on an upper deck
// (building spec `upperDeck`). A target `launch`: the carrier launches jets. See src/config.ts BRIDGE.
// `approach`: the length of the ramp at each end of an elevated deck (SF: the roof park and the freeway), climbing from the street to the deck
// and walkable; `deckApproach`: the same for an upper bridge deck, a ramp climbing to it from the west. World units.
// `elevated`: an elevated railway over [x0, x1] (Tokyo); world units.
// `water`: river spans [from, to, surfaceY]; `bridge`: a deck at street level over [x0, x1] in `spans` breakable spans; `subway`: x ranges
// with a subway line under the street (slams cave it in). All world units.
// `ground`: the street profile as world [x, y] points (src/terrain.ts); absent = flat.
// Third entry element: a landmark's name (key 'L'), 'cache', or a rooftop fixture ('radar' / 'tank').
// Façade decoration tags (the third entry element): drawn by drawDeco in src/game.ts.
const DECOS=new Set(['shed','brick','fireworks','store','hotel','post','carousel','factory','sub','freighter','crabshack','wall','tallship','powerhouse','vault','float']);
type Entry=[number,keyof typeof BUILDING_PRESETS]|[number,keyof typeof BUILDING_PRESETS,string];
const LANDMARK_COLORS=['#c3b48d','#b7a37c','#a9a9a0'];
// Named NYC landmarks: authored tier silhouettes on the 190-wide 'L' footprint, drawn tier by tier from these parts, authored scale, bottom tier first. Every tier is a roof you can stand on
// and a wall you can climb; a spire can be hit but not stood on. The highest part sets the landmark's height.
// Ledges narrower than about a third of the body are too small to stand on, so the climb carries on up the next tier.
const LANDMARK_SHAPES:Record<string,Part[]>={
 'WOOLWORTH':[{x:0,w:190,top:340},{x:40,w:110,top:480},{x:62,w:66,top:540},{x:92,w:6,top:590,spire:true}],
 'STOCK EXCHANGE':[{x:0,w:190,top:300},{x:12,w:166,top:330},{x:50,w:90,top:360}],
 'RADIO CITY':[{x:0,w:190,top:210},{x:70,w:110,top:500},{x:90,w:70,top:540}],
 'EMPIRE STATE':[{x:0,w:190,top:150},{x:20,w:150,top:400},{x:45,w:100,top:490},{x:70,w:50,top:530},{x:85,w:20,top:565},{x:93,w:4,top:620,spire:true}],
 'CHRYSLER':[{x:0,w:190,top:300},{x:30,w:130,top:430},{x:55,w:80,top:500},{x:70,w:50,top:530},{x:82,w:26,top:555},{x:93,w:4,top:610,spire:true}],
 'UN HQ':[{x:0,w:190,top:70},{x:55,w:80,top:540}],
 // Raised on a central column: Stages 1 and 2 can walk under the cantilevered body; Stage 3 is too tall.
 'CITICORP':[{x:80,w:30,top:120},{x:0,w:190,top:520,base:120},{x:95,w:95,top:570,base:520}],
 'MET LIFE':[{x:0,w:190,top:470},{x:10,w:170,top:500}],
 // Low market halls with a ship's mast at the pier end.
 'SEAPORT':[{x:0,w:190,top:200},{x:0,w:120,top:260},{x:20,w:70,top:300},{x:170,w:4,top:380,spire:true}],
};
export function landmarkShape(label:string):Part[]|undefined{return LANDMARK_SHAPES[label];}
// Every coordinate below is authored data at the original scale. Runtime expands the presets and multiplies positions and sizes
// by CONFIG.cityScale. A building's width is scaled through its right edge, so wall-to-wall rows stay flush after rounding.
const sc=(n:number)=>Math.round(n*CONFIG.cityScale);
// Parts scale the same way, through their own right edges, so tiers that line up in the authored data still line up.
function scaled<T extends {x:number,w:number,h:number,parts?:Part[]}>(b:T):T{const x=sc(b.x);
 return {...b,x,w:sc(b.x+b.w)-x,h:sc(b.h),...(b.parts?{parts:b.parts.map(p=>({...p,x:sc(b.x+p.x)-x,w:sc(b.x+p.x+p.w)-sc(b.x+p.x),top:sc(p.top),...(p.base?{base:sc(p.base)}:{})}))}:{})};}
export const NEW_YORK_BLOCK_ONE:BuildingSpec[]=NEW_YORK_BLOCK_ONE_AUTHORED.map(scaled);
function district(city:string,name:string,screens:number,entries:Entry[],street:number[],cars:number[],kind:BlockDef['kind']='district',start?:number):BlockDef{
 const theme=cityById(city);let landmarks=0;const built=entries.map(([x,key,tag],i)=>{
  // Landmarks: a named NYC tower uses its authored tiers; every other landmark gets parts matching its drawn shape.
  if(key==='L'){const [label,shape]=(tag??'').split('|'),color=LANDMARK_COLORS[landmarks++%LANDMARK_COLORS.length],tiers=shape?undefined:landmarkShape(label);
   if(tiers)return scaled({...BUILDING_PRESETS[key],x,h:Math.max(...tiers.map(p=>p.top)),parts:tiers,label,color,landmark:true});
   const b=scaled({...BUILDING_PRESETS[key],x,label,color,landmark:true,...(shape?{shape}:{})});return {...b,shape:shape||'tower',parts:shapeParts(shape||'tower',theme.style,b.w,b.h)};}
  if(key==='S'||key==='F'||key==='K')return scaled({...BUILDING_PRESETS[key],x,label:key==='K'?'ARMORY':'',color:key==='S'?'#7f8c88':key==='F'?'#c4bea6':'#8a5444',role:key==='S'?'substation':key==='F'?'depot':'armory'});
  if(key==='P')return scaled({...BUILDING_PRESETS[key],x,label:'CABLE CAR POWERHOUSE',color:'#8a5a44',role:'powerhouse',deco:'powerhouse'});
  return scaled({...BUILDING_PRESETS[key],x,label:key==='b'?'BARRIER':key==='t'?'NEWS':key==='l'||key==='x'||key==='n'?'':theme.signs[i%theme.signs.length],color:theme.colors[i%theme.colors.length],...(tag==='cache'?{cache:true}:tag==='vault'?{cache:true,deco:'vault',label:'VAULT'}:tag==='factory'?{deco:'factory',roof:'sign',label:'CHOCOLATE'}:tag==='radar'||tag==='tank'||tag==='sign'||tag==='crab'||tag==='helipad'?{roof:tag}:tag&&DECOS.has(tag)?{deco:tag,label:'',...(tag==='fireworks'?{explosive:true,label:'FIREWORKS'}:{})}:{})});
 });
 // Water mains: a fire hydrant on the pavement beside every MAINS.every-th street spot (never inside a building), in district and
 // stronghold blocks. Appended after the authored buildings so their order is untouched.
 const solids=built.filter(b=>b.kind!=='tiny'),w=Math.round(10*CONFIG.cityScale),h=Math.round(16*CONFIG.cityScale);
 const hydrants:BuildingSpec[]=kind==='boss'?[]:street.filter((_,k)=>k%MAINS.every===1).map(x=>sc(x+40)).filter(x=>!solids.some(b=>x+w>b.x-6&&x<b.x+b.w+6)).map(x=>({x,w,h,hp:1,value:5,kind:'tiny',label:'',color:'#c0392b',role:'hydrant'}));
 // Street junk: each city's own clutter beside the other street spots (the first kind of the pair where k%3 is 0, the second at 2).
 const JUNK:Record<string,[string,string]>={nyc:['hotdog','trash'],mex:['taco','trash'],par:['morris','cafe'],hkg:['stall','trash'],tyo:['vending','trash']};
 const DIMS:Record<string,[number,number,number]>={hotdog:[26,28,40],trash:[12,18,10],taco:[30,30,40],morris:[16,46,40],cafe:[24,20,20],stall:[34,32,40],vending:[16,36,30]};
 // Placed in the real gaps between solid buildings: up to three per gap, spaced along it, alternating the city's two kinds.
 const junk:BuildingSpec[]=[];if(kind!=='boss'&&name!=='Combat Drills'){
  const edges=[...solids].sort((p,q)=>p.x-q.x),lo=200,hi=sc(screens*960)-70,keep=[...built.filter(b=>b.kind==='tiny'),...hydrants];let n=0;
  const gaps:[number,number][]=[];let from=lo;for(const b of edges){if(b.x>from)gaps.push([from,b.x]);from=Math.max(from,b.x+b.w);}if(hi>from)gaps.push([from,hi]);
  for(const [g0,g1] of gaps){const room=g1-g0-24;if(room<40)continue;const slots=Math.min(3,Math.max(1,Math.floor(room/110)));
   for(let k=0;k<slots;k++){const prop=JUNK[theme.style][n%2],[dw,dh,value]=DIMS[prop];const w=Math.round(dw*1.3*CONFIG.cityScale),h=Math.round(dh*1.3*CONFIG.cityScale);
    const px=Math.round(g0+12+(room-w)*(slots===1?.5:k/(slots-1)));
    if(px<lo||px+w>hi||px+w>g1-8||start!==undefined&&Math.abs(px+w/2-sc(start))<sc(200)||keep.some(b=>px+w>b.x-24&&px<b.x+b.w+24)||junk.some(b=>px<b.x+b.w+12&&px+w>b.x-12))continue;
    junk.push({x:px,w,h,hp:10,value,kind:'tiny',label:'',color:'#888',prop});n++;}}}
 return {name,screens,kind,street:street.map(sc),cars:cars.map(sc),...(start===undefined?{}:{start:sc(start)}),buildings:[...built,...hydrants,...junk]};
}
// Terrain from authored [x, rise] pairs (rise above the default street, negative dips). Keep slopes in gaps: buildings need flat ground.
function terrain(b:BlockDef,rises:[number,number][]):BlockDef{const ground=profileFrom(rises,CONFIG.cityScale);
 // Hydrants only stand on flat pavement; street junk tolerates a gentle slope (it stands on the high side).
 return {...b,ground,buildings:b.buildings.filter(x=>(x.role!=='hydrant'&&!x.prop)||Math.abs(profileY(ground,x.x)-profileY(ground,x.x+x.w))<=(x.prop?6:0))};}
// Tokyo's open blocks carry an elevated railway along most of their length.
function railway(b:BlockDef,from:number,to:number):BlockDef{return {...b,elevated:[sc(from),sc(to)]};}
function riverworks(b:BlockDef,o:{ground:[number,number][],water:[number,number,number],bridge:[number,number,number],subway:[number,number]}):BlockDef{
 const [wa,wz,wr]=o.water,[ba,bz,n]=o.bridge;
 return {...terrain(b,o.ground),water:[[sc(wa),sc(wz),Math.round(CONFIG.ground-wr*CONFIG.cityScale)]],bridge:{x0:sc(ba),x1:sc(bz),spans:n},subway:[[sc(o.subway[0]),sc(o.subway[1])]]};}
function powered(b:BlockDef,grids:[number,number][],poles:number[]):BlockDef{return {...b,grids:grids.map(([a,z])=>[sc(a),sc(z)] as [number,number]),poles:poles.map(sc)};}
// The original packed wall-to-wall Lower Manhattan stays as the Combat Drills map.
// Drills also carry a short subway line at the far east end, to practise cave-ins, trains and (at Stage 3) snatching a train.
export const DRILL_BLOCK:BlockDef={...district('nyc','Combat Drills',4,[[400,'s'],[483,'l'],[637,'s'],[724,'s'],[807,'h'],[944,'x'],[1059,'n'],[1128,'m'],[1248,'n'],[1316,'h'],[1454,'l'],[1608,'m'],[1727,'s'],[1810,'m'],[1926,'h'],[2061,'l'],[2219,'m'],[2335,'x'],[2446,'m'],[2562,'h'],[2699,'h'],[2835,'n'],[2907,'l'],[3061,'s'],[3149,'m'],[3268,'h'],[3405,'l'],[3560,'m'],[3675,'s']],[175,375,520,805,1005,1185,1425,1605,1715,1920,2160,2330,2570,2815,3130,3390,3630],[230,710,1005,1195,1580,1910,2160,2370,2550,2830,3120,3380,3650]),subway:[[sc(2600),sc(3840)]]};
// Water drills: a stepped lake (12, 34, 56, 90 and 150px deep) east of an open street with a deep subway line, so every depth band
// shows up at every stage, plus two police boats. World units; the lake runs from WATER_LAKE[0] to WATER_LAKE[1], surface 6px below
// the street. Steps: Stage 1 is shallow / wading / over its head at 12 / 34 / 56; Stage 2 at 12 / 34-56 / 90; Stage 3 at 12-34 / 56-90 / 150.
export const WATER_LAKE:[number,number,number]=[1900,4240,CONFIG.ground+6];
export const WATER_STEPS:[number,number,number][]=[[1930,2300,12],[2330,2700,34],[2730,3100,56],[3140,3500,90],[3560,3900,150],[3960,4200,34]];
export const WATER_DRILL:BlockDef=(()=>{const [la,lz,ly]=WATER_LAKE,b=district('nyc','Water Drills',4,[[3150,'m'],[3500,'s']],[3100,3450],[]);
 const ground:[number,number][]=[[0,CONFIG.ground],[la,CONFIG.ground]];for(const [a,z,d] of WATER_STEPS)ground.push([a,ly+d],[z,ly+d]);ground.push([lz,CONFIG.ground],[sc(4*960),CONFIG.ground]);
 // The street west of the lake is left open (nothing to climb or smash on the way to the subway and the water).
 return {...b,buildings:b.buildings.filter(x=>x.x>lz+20),ground,water:[[la,lz,ly]],subway:[[400,1750]],bands:true,tunnel:'deep',boats:[3200,3600]};})();
export function cityById(id:string):City{const c=CITIES.find(x=>x.id===id);if(!c)throw Error(`Unknown city ${id}`);return c;}
export function cityIndexOf(id:string){return CITIES.findIndex(c=>c.id===id);}
// San Francisco placeholder levels (redesign phase 1): laid out from the existing building presets so the campaign plays end to end
// before each level is authored. A pattern is comma-separated tokens: a preset key (optionally `key:tag`, tag as in Entry), `_` a
// street (240 wide, a street spot and a parked car in it) or `=` an open lot (420). Buildings stand 4 apart. Landmarks ('L') take the
// next name from `landmarks`. A stronghold keeps its middle clear for the crystal, ringed by barricades; a boss level is an arena.
type CityLevelRest=[name:string,screens:number,kind:BlockDef['kind'],pattern:string,landmarks:string[],growth:Growth,opts?:{target?:number,ring?:number[],from?:number}];
type Growth={startStage:1|2|3,cap:1|2|3,capLift?:2|3,tier:number,secret?:boolean};
// Extra pattern tokens (SF Act 2): `~N` a bare gap of N (a hillside ramp: no street spot, no car); `^R` a new terrace at rise R
// (authored, above the base street) starting at the current x: the ramp is the gap just before it (`~N` right before the `^R`).
// The block gets `terraces` (consumed by terraced()) listing [rampStart, start, rise].
type Terraces=[number,number,number][];
function cityLevel(city:string,name:string,screens:number,kind:BlockDef['kind'],pattern:string,landmarks:string[],growth:Growth,opts:{target?:number,ring?:number[],from?:number}={}):BlockDef&{terraces?:Terraces}{
 const W=screens*960,mid=opts.target??W/2,entries:Entry[]=[],street:number[]=[175],cars:number[]=[230],terraces:Terraces=[];let x=opts.from??400,l=0,lastGap=0;
 const clear=kind==='stronghold'?[mid-900,mid+560]:null;
 if(clear)for(const o of opts.ring??[-770,-440,-190,180,460])entries.push([mid+o,'b']);
 for(const token of pattern.split(',').map(t=>t.trim())){
  if(token[0]==='>'){x=Math.max(x,+token.slice(1));lastGap=0;continue;}
  if(token[0]==='~'){lastGap=+token.slice(1);x+=lastGap;continue;}
  if(token[0]==='^'){if(lastGap<=0)throw Error(`${name}: a terrace needs a ramp (~N) before it`);terraces.push([x-lastGap,x,+token.slice(1)]);continue;}
  if(token==='_'||token==='='){const gap=token==='_'?240:420;if(x+gap<W-130){street.push(x+gap/2-40);cars.push(x+20);}x+=gap;lastGap=gap;continue;}
  const [key,tag]=token.split(':') as [keyof typeof BUILDING_PRESETS,string|undefined],w=BUILDING_PRESETS[key].w;
  if(clear&&x+w>clear[0]&&x<clear[1]){street.push(clear[0]+60,mid-320,mid+320);cars.push(clear[0]+120);x=clear[1];}
  if(x+w>W-130)break;
  const label=key==='L'?landmarks[l++]:tag;entries.push(label===undefined?[x,key]:[x,key,label]);x+=w+4;lastGap=0;
 }
 entries.sort((a,b)=>a[0]-b[0]);
 return {...district(city,name,screens,entries,[...new Set(street)].filter(v=>v<W-60).sort((a,b)=>a-b),[...new Set(cars)].filter(v=>v<W-60).sort((a,b)=>a-b),kind),...growth,...(terraces.length?{terraces}:{})};
}
function sfLevel(...a:CityLevelRest):ReturnType<typeof cityLevel>{return cityLevel('sfo',...a);}
// Terraced hillside: buildings stand on flat terraces, the slopes are the ramp gaps (authored: each terrace rise, `^R` in the pattern).
// Returns the block with its ground profile and `ramps` (world x ranges), minus the `terraces` bookkeeping. `base` is the rise before the first terrace.
function terraced(b:BlockDef&{terraces?:Terraces},base=0,end?:number):BlockDef{
 const t=b.terraces??[],pts:[number,number][]=[[0,base]],ramps:[number,number][]=[];
 for(const [a,z,r] of t){pts.push([a,pts[pts.length-1][1]],[z,r]);ramps.push([sc(a),sc(z)]);}
 const W=levelWidth(b);pts.push([W/CONFIG.cityScale,end??pts[pts.length-1][1]]);
 const {terraces:_,...rest}=b;return {...terrain(rest,pts),ramps};}
const SF_ROW='s,m:tank,h,_,l,m,s:cache,_,x,n,m,_,h:radar,s,t,_,m,l,_,h,s:tank,m,_';

// ---- San Francisco Act 1 (redesign phase 3): Embarcadero, Union Square, Chinatown ----
// Authored at the original scale like every other block; fields that are world units on the block are scaled here with sc().
// A hand-built building (the Ferry Building's halls, pilings): a deco tag picks its drawing.
// `parts`: the hitbox when it is not the whole box (a ship: only the hull is solid, the masts and sails above it are scenery).
function hall(x:number,w:number,h:number,label:string,color:string,deco:string,hp=300,parts?:Part[]):BuildingSpec{return scaled({x,w,h,hp,value:Math.round(hp*.7),kind:'medium',label,color,deco,...(parts?{parts}:{})});}
// Drop the street clutter (hydrants, junk) standing in authored x ranges: open water, the tunnel pocket, a plaza.
function clearClutter(b:BlockDef,ranges:[number,number][],solids=false):BlockDef{return {...b,buildings:b.buildings.filter(x=>(x.kind!=='tiny'&&!solids)||x.landmark||!ranges.some(([a,z])=>x.x+x.w>sc(a)&&x.x<sc(z)))};}
// Vehicles stationed in the street (streetcars, cable cars, trolleys, fire trucks): each [x, width] moves to the nearest stretch of street
// with room (80) either side for the kaiju to stand and grab it, clear of solid buildings and of the other stations. The parked cars whose
// rows (src/vehicles.ts createParked grows a row eastward of each spot, about 400 wide) would run into a station are dropped.
function station(b:BlockDef,items:[number,number][]):{xs:number[],cars:number[]}{
 const solids=b.buildings.filter(x=>x.kind!=='tiny').map(x=>[x.x-6,x.x+x.w+6] as [number,number]),W=levelWidth(b),taken:[number,number][]=[];
 const free=(x:number,w:number)=>x>=200&&x+w<=W-200&&!solids.some(([a,z])=>x+w+80>a&&x-80<z)&&!taken.some(([o,ow])=>x<o+ow+160&&x+w+160>o);
 const xs=items.map(([x,w])=>{let at=x;for(let d=0;d<W&&!free(at,w);d+=10)at=free(x+d,w)?x+d:free(x-d,w)?x-d:at;taken.push([at,w]);return at;});
 return {xs,cars:b.cars.filter(c=>!xs.some((x,i)=>c+400>x-40&&c<x+items[i][1]+40))};}
// Level 1. Start sealed in a BART tunnel pocket, break out at Rincon Park, work north along the promenade (F-line streetcars, the
// first police cars), cross the first pier (a deck over shallow water: break it, wade, throw a police boat, climb the pilings), push
// through the pier sheds and the SFPD line, and smash the Ferry Building's clock tower.
function sfEmbarcadero():BlockDef{
 const T=6560,POCKET:[number,number]=[40,440],WATER:[number,number]=[3000,4440],DECK:[number,number]=[3140,4300],W=8*960;
 let b=sfLevel('Embarcadero',8,'stronghold',
  `=,L,_,t,s,m,s,_,t,h,m,_,s,m,s,t,_,m,h,>4520,w:shed,w:shed,s,w:shed,_,w:shed`,
  ["CUPID'S SPAN|bow"],{startStage:1,cap:1,tier:1},{target:T,ring:[-840,-680,-520]});
 b=terrain(b,[[0,0],[WATER[0]-50,0],[WATER[0],-28],[WATER[1],-28],[WATER[1]+50,0],[W,0]]);
 b=clearClutter(clearClutter(b,[WATER,[0,POCKET[1]+80]]),[[WATER[0]-60,WATER[1]+60]],true);
 // Pilings: stout posts in the water just beside the deck; the kaiju climbs one to get out of the water.
 const pilings=[3040,3090,4340,4390].map(x=>hall(x,16,70,'','#5b4a3a','piling',140));
 // The Ferry Building: a long hall on either side of the clock tower (the target).
 const halls=[hall(T-380,320,120,'FERRY BUILDING','#c9b99a','ferry',360),hall(T+60,320,120,'','#c9b99a','ferry',360)];
 // Palms along the promenade stand where the generic street junk would have put hot dog carts.
 const palms=b.buildings.map(x=>x.prop==='hotdog'?{...x,prop:'palm',w:Math.round(x.w*.8),h:Math.round(x.h*2.3),color:'#4f7d4a'}:x);
 const bs=[...palms,...pilings,...halls],st=station({...b,buildings:bs},[1500,2380].map(x=>[sc(x),VEHICLE_SPECS.tram.w] as [number,number]));
 return {...b,buildings:bs,streetcars:st.xs,cars:st.cars,
  water:[[sc(WATER[0]),sc(WATER[1]),CONFIG.ground+6]],bridge:{x0:sc(DECK[0]),x1:sc(DECK[1]),spans:7},bands:true,boats:[sc(3500),sc(3900),sc(4150)],
  // BART under the first stretch of promenade: a slam caves it in. The sealed pocket you start in lies west of the line.
  subway:[[sc(520),sc(2000)]],tunnel:'deep',pocket:{x0:sc(POCKET[0]),x1:sc(POCKET[1]),hp:SF.pocketHP},
  target:{x:sc(T),label:'FERRY BUILDING CLOCK TOWER',art:'clock'},police:true,pier:{x0:sc(DECK[0]),x1:sc(DECK[1])}};
}
// Level 2. Foot of Market (trolleybuses under live overhead wires, a police helicopter to throw things up at), the Powell & Market
// turntable (a cable car, the tourist queue), Stockton Street's subway cave-ins, then Union Square: the SFPD command post (the target)
// behind barricades, department stores, a hotel, the victory column, and a garage under the plaza that caves in on a slam.
function sfUnionSquare():BlockDef{
 const T=4900,GARAGE:[number,number]=[T-620,T+520];
 let b=sfLevel('Union Square',7,'stronghold',
  `s,S,m,_,l,s,_,h,m,_,t,s,r,_,m,s:tank,_,h,t,>2760,s,m,r,_,l,s,m,_,h,m,s,>5480,L,d:store,s,d:store,l:hotel,m,s`,
  ['VICTORY COLUMN|needle'],{startStage:1,cap:1,tier:1},{target:T,ring:[-860,-740,-620,500]});
 // The department stores and hotel round the square, outside the barricade ring, plus the column on the east side of the plaza.
 // The victory column stands on the east side of the plaza (art only: it is a landmark needle).
 const ring:BuildingSpec[]=[];
 b=clearClutter(b,[GARAGE,[2300,2700]]);
 // Powell & Market: the cable car turntable (a flat plate you can walk over) and the tourist queue waiting beside it.
 const turntable=scaled({x:2400,w:90,h:10,hp:10,value:10,kind:'tiny',label:'',color:'#6a5a48',prop:'turntable'});
 b={...b,buildings:[...b.buildings,turntable],street:[...b.street,sc(2330),sc(2360),sc(2530),sc(2560),sc(2590)].sort((p,q)=>p-q)};
 // The power grid for the trolleybus wires: a substation inside it, a line of poles down lower Market.
 const poles=[220,520,820,1120,1420,1720,2020];
 b=powered(b,[[0,2800]],poles);
 const st=station(b,[...[420,1260,1900].map(x=>[sc(x),VEHICLE_SPECS.bus.w] as [number,number]),[sc(2450),VEHICLE_SPECS.cablecar.w]]);
 return {...b,buildings:[...b.buildings.filter(x=>!(x.role==='substation'&&x.x>sc(2800))),...ring],
  subway:[[sc(2700),sc(3900)]],garage:[[sc(GARAGE[0]),sc(GARAGE[1])]],tunnel:'deep',
  target:{x:sc(T),label:'SFPD COMMAND POST',art:'command'},police:true,
  trolleys:st.xs.slice(0,3),cablecars:st.xs.slice(3),cars:st.cars,air:[sc(1500),sc(T-300)]};
}
// Level 3. Through the Dragon Gate, up Grant Avenue: wall-to-wall low-rise brick, fireworks shops that go off and start fires, lantern
// strings that carry fire like fuses, fire trucks that turn up at the blazes. Waverly Place has SWAT and the police helicopter. The
// crystal formation under Portsmouth Square lifts the cap and grows the kaiju to Stage 2; the National Guard roll in at the exit.
// Lantern strings span the side-street gaps (150-300 wide) between two standing buildings, hung from the lower roofline.
function lanternGaps(b:BlockDef):[number,number,number][]{
 const s=b.buildings.filter(x=>x.kind!=='tiny'&&!x.landmark).sort((p,q)=>p.x-q.x),out:[number,number,number][]=[];
 for(let i=1;i<s.length;i++){const a=s[i-1],c=s[i],gap=c.x-(a.x+a.w);if(gap>=sc(150)&&gap<=sc(320))out.push([a.x+a.w-6,c.x+6,Math.min(a.h,c.h)-12]);}
 return out;}
function sfChinatown():BlockDef{
 const CRYSTAL=3900;
 const row='r:brick,s:brick,r:fireworks,r:brick,s:brick,m:brick,r:brick,s:fireworks,r:brick,r:brick,_',rowB='r:brick,s:brick,r:brick,s:fireworks,m:brick,r:brick,s:brick,r:fireworks,r:brick';
 let b=sfLevel('Chinatown',7,'district',
  `L,${row},${rowB},_,r:brick,s:brick,r:brick,s:brick,m:brick,r:fireworks,>4200,${row},r:brick,s:brick,r:brick,L,s:brick,r:fireworks,s:brick,r:brick`,
  ['DRAGON GATE|arch','CHINATOWN PAGODA|pagoda'],{startStage:1,cap:1,capLift:2,tier:2});
 b=clearClutter(b,[[CRYSTAL-260,CRYSTAL+260]]);
 const st=station(b,[900,2600,5400].map(x=>[sc(x),VEHICLE_SPECS.firetruck.w] as [number,number]));
 return {...b,
  lanterns:lanternGaps(b),
  firetrucks:st.xs,cars:st.cars,swat:[sc(3050),sc(3200),sc(3350)],air:[sc(3000)],crystal:sc(CRYSTAL),guard:true,police:true};
}
// ---- San Francisco Act 2 (redesign phase 4): Nob Hill, the Financial District, Fisherman's Wharf ----
// The Victorian houses (96 wide) and their hillside terraces: a row stair-steps up or down, each house on its own flat with the street
// ramping between, so a runaway car going down it bowls into each next house.
// Level 4. Up from Chinatown, over the summit, down the Russian Hill side to the foot of Lombard Street. The one new thing: runaway cable
// cars (src/rolling.ts). Before the powerhouse (halfway up) is destroyed they shuttle on their lines and can be grabbed; once it is down
// every one is loose. The Guard make a stand with APCs at the summit park; Lombard is a steep terraced garden slope where parked cars tumble.
function sfNobHill():BlockDef{
 const climb=(r:number,tail:string)=>`~170,^${r},${tail}`;
 const pattern=['m,r,_',climb(30,'r,s,r'),climb(60,'r,s,r'),climb(90,'r,s,r'),climb(120,'P,r,s'),climb(150,'=,L,d:hotel,d:hotel,l:hotel'),
  climb(120,'r,s,r'),climb(90,'r,s,r'),climb(60,'h,r,r'),'~110,^38,w:wall','~110,^16,w:wall','~110,^0,r,s'].join(',');
 let b=terraced(sfLevel('Nob Hill',7,'district',pattern,['SUMMIT CATHEDRAL|twin'],{startStage:2,cap:2,tier:2}));
 // The summit park: trees on the open lot east of the hotels' approach.
 const park=[2990,3070,3150,3230].map(x=>scaled({x,w:27,h:84,hp:10,value:15,kind:'tiny' as const,label:'',color:'#4f7d4a',prop:'palm'}));
 b={...b,buildings:[...b.buildings.filter(x=>!(x.prop&&x.x>sc(2860)&&x.x<sc(3330))),...park]};
 // Cable lines: one cable car shuttling on each of four ramps (two on the climb, two on the Russian Hill side).
 const R=b.ramps!,lines:[number,number][]=[R[1],R[3],R[5],R[6]].map(([a,z])=>[a,z] as [number,number]);
 const cars=lines.map(([a,z])=>Math.round((a+z)/2-VEHICLE_SPECS.cablecar.w/2));
 // Lombard: parked cars at the head of each of the three switchback ramps, let go when the camera nears.
 const lombard=R.slice(-3),lot=lombard.map(([a])=>a+Math.round(sc(8))),tumble:[number,number]=[lombard[0][0],lombard[2][1]];
 const keep=b.cars.filter(c=>!lombard.some(([a,z])=>c+sc(400)>a&&c<z+sc(40))&&!lines.some(([a,z])=>c+sc(400)>a&&c<z));
 return {...b,cablecars:cars,cableLines:lines,cars:[...keep,...lot].sort((p,q)=>p-q),tumble,
  // The Guard's stand at the summit: APCs across the park, soldiers behind them.
  units:[['apc',sc(3000)],['apc',sc(3230)],['soldier',sc(2930)],['soldier',sc(3060)],['soldier',sc(3140)],['soldier',sc(3300)],['soldier',sc(3380)],['apc',sc(3560)]]};
}
// Level 5. Montgomery Street: a canyon of bank towers with the first tanks; the bank vault (a cache, tagged); the transit center (a long
// park on a bus terminal's roof: the elevated system, drawn as a park, over a row of buses: collapse it onto them); the tower climb to a
// helipad with military helicopters at height; and the pyramid tower, the target, ringed by tanks and the Guard.
function sfFinancial():BlockDef{
 const T=5300,DECK:[number,number]=[2400,3640],APPROACH=500;
 let b=sfLevel('Financial District',7,'stronghold',
  `x,n,x,n,_,n,x,n,x,L,_,m:vault,S,_,>4100,x:helipad,n,x,l,_,x,n,>5900,x,n,x,l`,
  ['CORPORATE TOWER|tower'],{startStage:2,cap:2,tier:3},{target:T,ring:[-840,-700,-560,480]});
 b=clearClutter(b,[[DECK[0]-APPROACH,DECK[1]+APPROACH]]);
 // Two tall towers flank the pyramid close enough that a toppled one lands on it (toppling damage reaches a target).
 const flank=[5040,5480].map((x,i)=>scaled({...BUILDING_PRESETS.x,x,label:'',color:cityById('sfo').colors[i+1]}));
 b={...b,buildings:[...b.buildings,...flank]};
 const buses=[2480,2840,3200].map(sc);
 return {...b,elevated:[sc(DECK[0]),sc(DECK[1])],elevatedLook:'park',approach:sc(APPROACH),buses,
  target:{x:sc(T),label:'PYRAMID TOWER',art:'pyramid'},
  // Montgomery Street's tanks, the Guard in front of the vault, helicopters at the helipad towers, the garrison round the pyramid.
  units:[['tank',sc(1000)],['tank',sc(1600)],['soldier',sc(900)],['soldier',sc(1300)],['soldier',sc(1900)],['apc',sc(2300)],['tank',sc(2500)],
   ['helicopter',sc(4150),560],['helicopter',sc(4500),620],['helicopter',sc(4900),500]],
  garrison:[['tank',-420],['tank',-250],['soldier',-130],['soldier',-70],['apc',220],['soldier',340],['tank',420]],};
}
// Level 6. Fisherman's Wharf: a there-and-back level (open layout, an exit at each end). West to east: the main exit (to The Fault), the
// chocolate factory, Hyde Street Pier, Jefferson Street (start), Pier 45, Pier 39 (with the crystal), the open bay with the Coast Guard
// cutter, deep water and the Alcatraz exit. Piers are street-level plateaus between water slips (wading at Stage 2); the bay is too deep
// at Stage 2 and wading depth at Stage 3, so the crystal on Pier 39 is what opens it.
function sfWharf():BlockDef{
 const START=2800,CUTTER=6250,CRYSTAL=5300,CAR=3330;
 let b=sfLevel('Fisherman\'s Wharf',8,'stronghold',
  `s,l:factory,_,L,>2210,s:crabshack,m:crab,s:crabshack,_,=,>3580,r`,['WHARF CLOCK TOWER|tower'],{startStage:2,cap:2,capLift:3,tier:3},{target:CUTTER,ring:[]});
 // Terrain (authored x; null = street level, a number > 0 = the water's depth over the seabed, a number < 0 = a hill that high): the hill
 // the runaway cable car starts on, then shore, slip, pier plateau, slip, ..., the bay, deep water.
 const D:[number,number|null][]=[[0,null],[1090,null],[1150,40],[1250,40],[1310,null],[2000,null],[2060,40],[2140,40],[2200,null],
  [3160,null],[3260,-45],[3480,-45],[3560,null],
  [3700,null],[3760,40],[3840,40],[3900,null],[4560,null],[4620,40],[4700,40],[4760,null],[5560,null],[5700,90],[6700,90],[6820,118],[8000,118]];
 const ground:[number,number][]=D.map(([x,d])=>[sc(x),d===null?CONFIG.ground:d>0?CONFIG.ground+6+d:CONFIG.ground+Math.round(d*CONFIG.cityScale)]);
 const waterLine=CONFIG.ground+6;
 // Piers: hand-built props. Old sailing ships on Hyde Street Pier, a WWII submarine and a cargo ship on Pier 45, a carousel on Pier 39.
 // The sailing ships' masts and sails are only drawn: the hull is the hitbox, and you walk past on the deck.
 const hull=(w:number,h:number):Part[]=>[{x:0,w,top:Math.round(h*.34)}];
 const props=[hall(1330,300,150,'','#6a4a34','tallship',260,hull(300,150)),hall(1680,260,130,'','#7a5a3a','tallship',240,hull(260,130)),
  hall(3930,330,70,'','#5d6a64','sub',280),hall(4290,250,140,'','#7a3a34','freighter',420),
  hall(4880,150,130,'','#c98a3c','carousel',300)];
 // Seafood stands in the Jefferson Street lot (tiny, walk-through).
 const stands=[3010,3070].map(x=>scaled({x,w:26,h:28,hp:10,value:40,kind:'tiny' as const,label:'',color:'#c2312b',prop:'stall'}));
 // Street junk and hydrants stay on the land west of Hyde Street Pier and on Jefferson Street's lot, never on a pier or in the water.
 const keep=(x:BuildingSpec)=>!((x.prop||x.role==='hydrant')&&x.x>sc(1040)&&!(x.x>sc(2260)&&x.x<sc(3100)));
 const buildings=[...b.buildings.filter(keep),...props,...stands];
 return {...b,buildings,ground,start:sc(START),
  water:[[sc(1090),sc(2200),waterLine],[sc(3700),sc(4760),waterLine],[sc(5560),sc(8000),waterLine]],bands:true,
  boats:[1190,1280,3800,4660].map(sc),coastguard:[1200,5900,6600,7100].map(sc),
  target:{x:sc(CUTTER),label:'COAST GUARD CUTTER',art:'cutter'},garrison:[],
  crystal:sc(CRYSTAL),cablecars:[sc(CAR)],runaway:[sc(CAR)],cars:b.cars.filter(c=>c<sc(2400)),
  // Jefferson Street: the Guard and the first tank squad; the runaway cable car starts on the hill at the east end and careens in.
  units:[['soldier',sc(2950)],['soldier',sc(3050)],['apc',sc(3100)],['tank',sc(3620)],['soldier',sc(3640)],['tank',sc(1800)]],
  sealions:[5020,5110,5440,5500].map(sc),kaiban:{x:sc(3640),wade:[sc(3500),sc(6900)]},
  fog:{from:sc(2200),to:sc(7000),max:.72},
  exits:{west:'The Fault',east:'Alcatraz'}};
}
// Level 7. The Fault (the 1906 level), west to east: Van Ness (start), Civic Center (the dome, the first crack), Mid-Market (the old
// mint, the second crack, fire trucks that cannot keep up), SoMa (warehouses, the double-deck freeway, the third crack: the Big One)
// and the on-ramp at the east end, a climb onto the road that is the exit. The new thing: the fault cracks and the gas mains.
function sfFault():BlockDef{
 const CRACKS=[2300,4000,6300],FREEWAY:[number,number]=[5000,6500],APPROACH=560,RAMP:[number,number]=[7260,7640];
 let b=sfLevel('The Fault',8,'district',
  `s,m,r,_,h,s,m,_,l,r,>1900,L,=,>2540,h,m,r,_,m:vault,h,s,_,>3500,r,h,_,s,m,_,>4180,w:brick,r,w:shed,_,w:brick,r,s,_,w:brick,r,_`,
  ['CITY HALL|dome'],{startStage:3,cap:3,tier:4});
 b=clearClutter(b,[[FREEWAY[0]-APPROACH,FREEWAY[1]+APPROACH]],true);
 // The old mint is a granite vault.
 b={...b,buildings:b.buildings.map(x=>x.deco==='vault'?{...x,label:'OLD MINT',color:'#9a9c97'}:x)};
 // Gas mains: the generic hydrants, plus a pair either side of every crack (and under the freeway) where the quake will find them.
 const solids=b.buildings.filter(x=>x.kind!=='tiny'),mw=Math.round(10*CONFIG.cityScale),mh=Math.round(16*CONFIG.cityScale);
 const mains=CRACKS.flatMap(c=>[-420,-220,220,420].map(o=>c+o)).map(x=>sc(x)).filter(x=>x>sc(240)&&x<sc(RAMP[0])-60&&!solids.some(o=>x+mw>o.x-6&&x<o.x+o.w+6)&&!b.buildings.some(o=>o.role==='hydrant'&&Math.abs(o.x-x)<mw*3))
  .map(x=>({x,w:mw,h:mh,hp:1,value:5,kind:'tiny' as const,label:'',color:'#c0392b',role:'hydrant' as const}));
 b={...b,buildings:[...b.buildings,...mains]};
 b=terrain(b,[[0,0],[RAMP[0],0],[RAMP[1],130],[8000,130]]);
 const trucks=station(b,[3000,3380,3760].map(x=>[sc(x),VEHICLE_SPECS.firetruck.w] as [number,number]));
 return {...b,cracks:CRACKS.map(sc),gas:true,fireCap:GAS.fireCap,elevated:[sc(FREEWAY[0]),sc(FREEWAY[1])],elevatedLook:'freeway',elevatedDecks:2,approach:sc(APPROACH),
  firetrucks:trucks.xs,cars:trucks.cars,
  // Full military from the start: tanks and artillery down Van Ness and Mid-Market, jets overhead, soldiers at the on-ramp.
  units:[['soldier',sc(900)],['tank',sc(1300)],['tank',sc(1750)],['artillery',sc(2900)],['soldier',sc(3200)],['tank',sc(3560)],['jet',sc(4300)],
   ['tank',sc(4700)],['artillery',sc(5100)],['apc',sc(5300)],['soldier',sc(5700)],['tank',sc(6500)],['soldier',sc(6900)],['helicopter',sc(6100),560]]};
}
// Level 8. Bay Bridge: the west span (a double-deck bridge: the lower deck is the road, the upper deck a long slab on two climbable towers,
// gridlock, a roadblock, tanks on both decks, warships on the water below), the open bay (chest-deep at Stage 3: gunboat and destroyer),
// Treasure Island (hangars and an armory: the breather) and the east span, where the aircraft carrier lies below the deck between two
// towers, launching jets. The decks stand BRIDGE.deckRise above the water. The one new thing: the carrier.
function sfBayBridge():BlockDef{
 const RAMP=[800,1400],WEST=[1400,3600],BAY=[4700,4900],ISLAND_END=5900,RAMP_E=[5900,6400],EAST=[6400,7680],CARRIER=6900,DR=150,BED=-62;
 let b=sfLevel('Bay Bridge',8,'stronghold',`>4960,L,K,w:shed,w:shed`,['NAVY COMMAND|tower'],{startStage:3,cap:3,tier:4},{target:CARRIER,ring:[]});
 b=terrain(b,[[0,0],[RAMP[0],0],[RAMP[1],DR],[RAMP[1]+6,BED],[BAY[0],BED],[BAY[1],0],[ISLAND_END,0],[RAMP_E[1],DR],[RAMP_E[1]+6,BED],[8000,BED]]);
 // No street clutter on the ramps, the decks or in the bay; the island's sheds are the Navy base's hangars.
 b=clearClutter(b,[[RAMP[0],BAY[1]],[ISLAND_END,8000]]);
 b={...b,buildings:b.buildings.map(x=>x.deco==='shed'?{...x,label:'HANGAR',color:'#7e8a82'}:x)};
 // The upper deck: a slab the full length of the west span with a tower at each end (climbable); it ends where the bridge does.
 const U0=WEST[0],U1=WEST[1],bd=BRIDGE,T=bd.clear+bd.slab,TW=2*bd.leg+bd.gap,UW=sc(U1)-sc(U0);
 const legs=(x:number,top=T)=>[{x,w:bd.leg,top},{x:x+bd.leg+bd.gap,w:bd.leg,top}];
 const upper:BuildingSpec={x:sc(U0),w:UW,h:T,hp:bd.upperHP,value:900,kind:'large',label:'UPPER DECK',color:'#7d8588',upperDeck:true,deco:'updeck',
  parts:[...legs(0),...legs(UW-TW),{x:0,w:UW,top:T,base:bd.clear}]};
 // The east span's two towers, either side of the carrier; the climb to the top of the deck road is the way up.
 const TT=bd.clear+bd.slab+Math.round(150*CONFIG.cityScale),tower=(x:number):BuildingSpec=>({x:sc(x),w:TW,h:TT,hp:bd.towerHP,value:700,kind:'large',label:'',color:'#8a8f8e',deco:'btower',
  parts:[...legs(0,TT),{x:0,w:TW,top:TT,base:TT-bd.slab*2}]});
 const roadblock=[1700,1740,1780].map(x=>scaled({...BUILDING_PRESETS.b,x,label:'BARRIER',color:'#8d8f86'}));
 b={...b,buildings:[...b.buildings,upper,tower(6400),tower(7200),...roadblock]};
 // Gridlock on the lower deck: parked rows end to end.
 const cars=[1620,1960,2300,2640,2980,3320].map(sc);
 return {...b,cars,deckApproach:sc(1070),bridge:{x0:sc(WEST[0]),x1:sc(WEST[1]),spans:8,rise:bd.deckRise,more:[[sc(EAST[0]),sc(EAST[1]),4]]},
  water:[[sc(RAMP[1]),sc(BAY[1]),CONFIG.ground+6],[sc(RAMP_E[1]),sc(8000),CONFIG.ground+6]],bands:true,
  target:{x:sc(CARRIER),label:'AIRCRAFT CARRIER',art:'cutter',scale:bd.carrierScale,launch:true},garrison:[],
  // Tanks and soldiers on the lower deck, tanks and artillery on the upper deck, warships on the water below it and in the bay.
  units:[['soldier',sc(1000)],['tank',sc(1900)],['tank',sc(2500)],['soldier',sc(2700)],['apc',sc(3100)],['tank',sc(3400)],['soldier',sc(5100)],['soldier',sc(5600)],['tank',sc(5800)],['helicopter',sc(5300),560],['jet',sc(5900)]],
  deckUnits:[['tank',sc(1900)],['artillery',sc(2400)],['tank',sc(2900)],['soldier',sc(2200)]],
  warships:[['gunboat',sc(2000)],['destroyer',sc(2800)],['gunboat',sc(4000)],['destroyer',sc(4400)],['gunboat',sc(4250)]]};
}
// Level 9. Golden Gate: two screens of approach (Presidio trees and old gun batteries, the toll plaza, the last military push, fog thickening ahead
// of the towers) then four of bridge (south tower, main span, north tower) with Kaiban on the span. The deck stands BRIDGE.deckRise above the bay.
// The fight is on the deck; the deck gives way (both kaiju end up chest-deep at the tower feet) and Kaiban retreats as the main span comes down.
function sfGoldenGate():BlockDef{
 const RAMP=[1400,1900],DECK=[1900,5760],DR=150,BED=-62,SPANS=12;
 let b=sfLevel('Golden Gate',6,'boss',`r,s,>1180,b,b,b`,[],{startStage:3,cap:3,tier:5});
 b=terrain(b,[[0,0],[RAMP[0],0],[RAMP[1],DR],[RAMP[1]+6,BED],[8000,BED]]);
 // Presidio trees (tall, green) along the approach, and the old gun batteries: low concrete bunkers with emplacements on top.
 const trees=[160,250,340,620,880,925,1130].map((x,i)=>scaled({x,w:22,h:88+(i%3)*14,hp:14,value:30,kind:'tiny' as const,label:'',color:'#4f7d4a',prop:'palm'}));
 const batteries=[hall(700,150,70,'BATTERY','#7d8278','wall',260),hall(960,150,70,'BATTERY','#7d8278','wall',260)];
 // The toll plaza: booths in a row under a low canopy, across the approach road.
 const booths=[1118,1148].map(x=>scaled({x,w:20,h:34,hp:20,value:40,kind:'tiny' as const,label:'TOLL',color:'#c2552b',prop:'stall'}));
 b={...b,buildings:[...b.buildings.filter(x=>!x.prop),...trees,...batteries,...booths]};
 b=clearClutter(b,[[RAMP[0],8000]]);
 // The bridge: spans from the foot of the ramp to the north end; the towers stand at the joints, the main span between them.
 const x0=sc(DECK[0]),x1=sc(DECK[1]),w=(x1-x0)/SPANS,joint=(k:number)=>Math.round(x0+k*w),TW=2*BRIDGE.leg+BRIDGE.gap,TT=BRIDGE.clear+BRIDGE.slab+GATE.tower;
 const tower=(x:number):BuildingSpec=>({x,w:TW,h:TT,hp:BRIDGE.towerHP*2,value:900,kind:'large',label:'',color:'#c0301f',deco:'btower',
  parts:[{x:0,w:BRIDGE.leg,top:TT},{x:BRIDGE.leg+BRIDGE.gap,w:BRIDGE.leg,top:TT},{x:0,w:TW,top:TT,base:TT-BRIDGE.slab*2},{x:0,w:TW,top:Math.round(TT*.6),base:Math.round(TT*.6)-BRIDGE.slab}]});
 b={...b,buildings:[...b.buildings,tower(joint(2)),tower(joint(10))]};
 const mid=Math.round((joint(2)+joint(10))/2);
 return {...b,bridge:{x0,x1,spans:SPANS,rise:BRIDGE.deckRise},water:[[sc(RAMP[1]),sc(8000),CONFIG.ground+6]],bands:true,
  fog:{from:sc(900),to:sc(3000),max:.6},finale:{x:mid,wake:joint(1),breaks:[.66,.33]},
  // The last push on the approach: armour, artillery, infantry and air cover; the batteries' guns; nothing on the bridge but Kaiban.
  units:[['soldier',sc(500)],['apc',sc(800)],['tank',sc(900)],['soldier',sc(950)],['tank',sc(1100)],['artillery',sc(1250)],['emplacement',sc(780)],['emplacement',sc(1040)],
   ['soldier',sc(1300)],['tank',sc(1350)],['jet',sc(1200)],['helicopter',sc(1000),560],['helicopter',sc(1500),600],['bomber',sc(1700),560]]};
}
// Level 10. Alcatraz (secret): a rock rising from the bay, 4 screens, west to east. A land spit (west exit), the cove (the dock approach: a
// ford every stage can wade, Coast Guard boats circling), the dock apron, the switchback road up three terraces (guard tower; the old water
// tower), the cellhouse on the summit (a secret crystal containment site: workbenches, a crystal cluster, soldiers in hazmat gear,
// helicopters overhead, a fuel cell schematic and a surveillance photo of Kaiban pinned on its wall) and the lighthouse at the far end.
// Both exits stand on land at the island's edges, so a kaiju shrunk to Stage 2 is never stranded by water. Existing systems only.
export const ALCATRAZ={cove:[170,1060] as [number,number],depth:40,ramps:[[1500,1690],[2080,2270],[2600,2790],[3400,3590]] as [number,number][],rises:[0,70,140,210,140] as number[],
 spit:[0,170] as [number,number],start:110,exitAt:.9,crystal:3345,lore:'PROJECT MK: FUEL SOURCE CONFIRMED.'};
function sfAlcatraz():BlockDef{
 const A=ALCATRAZ,base=district('sfo','Alcatraz',4,[],[],[]),land=(r:number)=>CONFIG.ground-sc(r),bed=(d:number)=>CONFIG.ground+6+d;
 // Authored [x, y] points: land is a rise above the dock, the cove's bed is world units below the surface (like the Wharf's bay).
 const pts:[number,number][]=[[0,land(0)],[A.cove[0],land(0)],[300,bed(24)],[420,bed(A.depth)],[800,bed(A.depth)],[940,bed(24)],[A.cove[1],land(0)]];
 pts.splice(0,pts.length,...pts.map(([x,y])=>[sc(x),y] as [number,number]));
 const [t0,t1,t2,t3,t4]=A.rises;pts.push([sc(A.ramps[0][0]),land(t0)],[sc(A.ramps[0][1]),land(t1)],[sc(A.ramps[1][0]),land(t1)],[sc(A.ramps[1][1]),land(t2)],[sc(A.ramps[2][0]),land(t2)],[sc(A.ramps[2][1]),land(t3)],
  [sc(A.ramps[3][0]),land(t3)],[sc(A.ramps[3][1]),land(t4)],[sc(3840),land(t4)]);
 const pre=(key:keyof typeof BUILDING_PRESETS,x:number,color:string,extra:Partial<BuildingSpec>={}):BuildingSpec=>scaled({...BUILDING_PRESETS[key],x,label:'',color,...extra});
 const bench=(x:number)=>scaled({x,w:24,h:22,hp:14,value:30,kind:'tiny' as const,label:'',color:'#7a6a4a',prop:'workbench'});
 const buildings:BuildingSpec[]=[
  // The dock: a boathouse and a Coast Guard shed on the apron.
  hall(1090,190,96,'','#6b5a48','boathouse',200),pre('s',1340,'#8a8f8c'),
  // Terrace 1: the guard tower and the barracks.
  hall(1730,56,210,'','#8d8f86','guardtower',220),pre('r',1860,'#9a8f7a'),
  // Terrace 2: the old water tower (its tank floods the slope when broken) and a storehouse.
  pre('s',2310,'#8a7f70',{roof:'tank',label:'WATER TOWER'}),pre('m',2450,'#85806f'),
  // The summit: workbenches, the cellhouse, and the crystal beside it.
  bench(2790),bench(2818),hall(2850,420,260,'','#9a9a90','cellhouse',900),
  // The far end: the lighthouse and the keeper's house.
  hall(3610,64,340,'','#e6e2d6','lighthouse',330),pre('s',3680,'#a89a82'),
 ];
 return {...base,buildings,ground:pts,water:[[sc(A.cove[0]),sc(A.cove[1]),CONFIG.ground+6]],bands:true,ramps:A.ramps.map(([a,z])=>[sc(a),sc(z)] as [number,number]),
  startStage:3,cap:3,tier:5,secret:true,after:'The Fault',start:sc(A.start),exitAt:A.exitAt,secretId:'alcatraz',lore:A.lore,hazmat:true,crystal:sc(A.crystal),
  coastguard:[480,650,820].map(sc),
  // Hazmat soldiers round the cellhouse, helicopters over the summit; a Guard squad guards the dock.
  units:[['soldier',sc(1450)],['soldier',sc(1560)],['soldier',sc(2350)],['tank',sc(2520)],['soldier',sc(2740)],['soldier',sc(2900)],['soldier',sc(3010)],['soldier',sc(3150)],['soldier',sc(3250)],
   ['helicopter',sc(2500),520],['helicopter',sc(3000),620],['helicopter',sc(3550),560]]};
}
export const SAN_FRANCISCO:BlockDef[]=[
 sfEmbarcadero(),
 sfUnionSquare(),
 sfChinatown(),
 sfNobHill(),
 sfFinancial(),
 sfWharf(),
 sfFault(),
 sfBayBridge(),
 sfGoldenGate(),
 sfAlcatraz(),
];
// ---- New York (NYC rework scaffold, docs/NYC_REWORK.md) ----
// Nine route levels plus the secret Coney Island, as placeholders drawn with cityLevel() and the existing presets. Names, screens, kind,
// growth, exits and landmarks are final; the layouts and each level's one new mechanic come in the later cards. Kaiban plays here.
// A repeating block of rows and cross streets, long enough that a pattern always runs to the end of its level.
const NYC_ROW='s,m,h,_,l,s,m,_,h,r,_,n,s,m,_',NYC_TALL='x,n,l,x,h,_,n,x,l,n,_',NYC_LOW='r,s,r,m,_,r,s,m,s,_';
const nycRep=(unit:string,n:number)=>Array(n).fill(unit).join(',');
// ---- New York Act 1 (NYC rework card 2): The Battery, Wall Street, SoHo and Canal Street ----
// Level 1. Start waist-deep in the harbour (a `bands` water span with a seabed profile: Stage 1 wades), past NYPD Harbor Unit boats and the
// moored Staten Island Ferry (a hull you climb over), up the shallows to the seawall (too tall to jump: climb it), into Battery Park (trees, the
// SeaGlass carousel, the Whitehall terminal over the South Ferry subway loop, a deep tunnel that caves in) and north-east to Castle Clinton.
function nycBattery():BlockDef{
 const T=6000,START=520,SHORE=2000,W=8*960;
 let b=cityLevel('nyc','The Battery',8,'stronghold',`>3300,s,m,h,_,l,s,m,_,h,r,_,n,s,m,_,>6700,s,m,_,h,r,n`,[],{startStage:1,cap:1,tier:1},{target:T,ring:[-770,-440,-190,180,460]});
 // The harbour: seabed 38 under the start (wading at Stage 1), shoaling up to the shore.
 const D:[number,number|null][]=[[0,38],[1450,38],[1700,22],[1900,12],[2010,null],[W,null]];
 const ground:[number,number][]=D.map(([x,d])=>[sc(x),d===null?CONFIG.ground:CONFIG.ground+6+d]);
 b=clearClutter({...b,ground,cars:b.cars.filter(c=>c>sc(2100))},[[0,2100]]);
 // The ferry's hull stands on the seabed: its deck is about 70 above the water and its superstructure 150.
 const ferry=hall(760,340,140,'STATEN ISLAND FERRY','#d9822b','sifery',420,[{x:0,w:340,top:82},{x:40,w:240,top:140}]);
 const seawall=hall(2012,60,95,'','#8b867a','wall',600);
 const terminal=hall(2140,260,110,'WHITEHALL TERMINAL','#9a8f78','ferry',360),carousel=hall(2900,150,130,'SEAGLASS','#6fa8a0','carousel',300);
 // Battery Park: trees (uprooted like a lamppost) on the lawns.
 const trees=[2460,2560,2660,2780,3100,3200,3300].map(x=>scaled({x,w:27,h:84,hp:10,value:15,kind:'tiny' as const,label:'',color:'#4f7d4a',prop:'tree'}));
 return {...b,buildings:[...b.buildings,ferry,seawall,terminal,carousel,...trees],spawn:sc(START),
  water:[[0,sc(SHORE),CONFIG.ground+6]],bands:true,boats:[900,1300,1650].map(sc),
  subway:[[sc(2450),sc(3700)]],tunnel:'deep',
  target:{x:sc(T),label:'CASTLE CLINTON',art:'fort'},police:true,air:[sc(6900)],
  // The NYPD Harbor Unit dug in round the fort (the default garrison stands at the target; these are the approach).
  units:[['patrol',sc(4300)],['police',sc(4600)],['patrol',sc(4900)],['police',sc(7100)]]};
}
// Level 2. Broadway at Bowling Green (the Charging Bull, a heavy bronze prop), then the Wall Street canyon: supertall towers packed shoulder to
// shoulder, so the street is a gauntlet of barricades and SWAT with helicopters overhead and the rooftops are the fast way through. Trinity
// Church, the 4/5 subway, the Federal Reserve vault, and the NYSE command post, with two towers flanking it close enough to topple onto it.
function nycWallStreet():BlockDef{
 const T=4300,BULL_X=560;
 let b=cityLevel('nyc','Wall Street',7,'stronghold',
  `=,x,n,_,>1500,L,_,x,n,x,l,n,x,h:vault,n,x,_,x,n,l,x,n,>5050,n,x,n,_,x,n,x,l,n`,['TRINITY CHURCH|twin'],{startStage:1,cap:1,tier:2},{target:T,ring:[-840,-700,-560,440,500]});
 // Supertall: the canyon towers are half as tall again as the presets (all within a jump of each other) (the camera has no ceiling), the roofs kept within a step or two of each other.
 const tall=(x:BuildingSpec)=>x.kind==='tiny'||x.landmark||x.role||x.h<sc(450)?x:{...x,h:sc(x.h/CONFIG.cityScale>=500?760:740)};
 b={...b,buildings:b.buildings.map(x=>x.deco==='vault'?{...x,label:'FEDERAL RESERVE',color:'#9a9c97'}:tall(x))};
 // Two towers flank the command post close enough that a toppled one lands on it (toppling damage reaches a target), and two more close the canyon.
 const flank=[[4010,900],[4450,900],[3860,720],[4590,720]].map(([x,h],i)=>scaled({...BUILDING_PRESETS.x,x,h,label:'',color:cityById('nyc').colors[i+1]}));
 b={...b,buildings:[...b.buildings,...flank]};
 return {...b,subway:[[sc(1800),sc(3350)]],bull:sc(BULL_X),
  target:{x:sc(T),label:'NYSE COMMAND POST',art:'exchange'},police:true,swat:[sc(2600),sc(2900),sc(3300),sc(5300)].map(x=>x),air:[sc(3000),sc(5200)],
  units:[['police',sc(1100)],['soldier',sc(2300)],['soldier',sc(3000)]]};
}
// Level 3. Cast-iron loft rows with rooftop water tanks, then Canal Street: an open stretch of street with vendor stalls, the crystal and the Holland Tunnel approach jammed with traffic, and
// the steam vents: manholes that puff now and then and burst when you slam or pound near them. The crystal under Canal Street lifts the cap to
// Stage 2; the Guard rolls in at the exit.
// Cross-street gaps between standing buildings (>= minGap wide): the steam vents go in their middles.
function streetGaps(b:BlockDef,from:number,to:number,minGap:number):number[]{
 const s=b.buildings.filter(x=>x.kind!=='tiny'&&!x.landmark).sort((p,q)=>p.x-q.x),out:number[]=[];
 for(let i=1;i<s.length;i++){const a=s[i-1].x+s[i-1].w,c=s[i].x;if(c-a>=sc(minGap)&&a>=sc(from)&&c<=sc(to))out.push(Math.round((a+c)/2));}
 return out;}
function nycSoho():BlockDef{
 const CRYSTAL=3900,loft='r:brick,m:tank,r:brick,_,s:brick,m:brick,r:brick,_,m:tank,s:brick,r:brick';
 let b=cityLevel('nyc','SoHo and Canal Street',7,'district',
  `${loft},_,r:brick,m:tank,r:brick,_,s:brick,m:brick,r:brick,>5950,r:brick,m:tank,s:brick`,[],
  {startStage:1,cap:1,capLift:2,tier:2});
 b=clearClutter(b,[[CRYSTAL-260,CRYSTAL+260]]);
 // Canal Street: vendor stalls in the open stretch either side of the crystal; the Holland Tunnel's portal at the east end.
 const stalls=[3420,3500,3580,4200,4260].map(x=>scaled({x,w:34,h:32,hp:10,value:40,kind:'tiny' as const,label:'',color:'#c2312b',prop:'stall'}));
 const portal=hall(6300,260,150,'HOLLAND TUNNEL','#8a8478','portal',500);
 b={...b,buildings:[...b.buildings,...stalls,portal]};
 // The jam: parked rows end to end from Canal Street to the tunnel mouth.
 const jam=[4420,4620,4820,5020,5220,5420,5620,5820].map(sc);
 const gaps=streetGaps(b,300,5950,200).filter(x=>Math.abs(x-sc(CRYSTAL))>sc(420));
 // Manholes in the Canal Street gaps, and two in the middle of the tunnel jam (steam among the stopped cars).
 const vents=[...gaps.slice(0,6),sc(5000),sc(5600)].sort((p,q)=>p-q);
 return {...b,cars:[...b.cars.filter(c=>c<sc(4300)),...jam],crystal:sc(CRYSTAL),guard:true,police:true,vents,
  swat:[sc(3050),sc(3200),sc(3350)],air:[sc(3000)]};
}
// ---- New York Act 3 (NYC rework card 5): Hudson Yards and Herald Square ----
// Level 7. Hudson Boulevard's towers, the High Line (a roof park on an elevated deck: no buses under it), the Vessel, then the Hudson Yards
// platform: a plaza and its towers standing on a deck over a live rail yard. Six deck spans, one tower (or two) on each: break a span and the
// towers on it sink into the yard and come down. Steam geysers (`ventsAuto`) go off all over the level on their own: Tlézcatl is close.
function nycHudson():BlockDef{
 const HL:[number,number]=[1900,3200],APPROACH=400,YARD:[number,number]=[4300,6700],N=6,SPAN=(YARD[1]-YARD[0])/N;
 let b=cityLevel('nyc','Hudson Yards',8,'district',
  `n,x,l,_,x,n,h,_,>3700,L,_,>6800,x,n,l,_,x,h,n,_,m,s`,['THE VESSEL|lattice'],{startStage:3,cap:3,tier:4});
 b=clearClutter(b,[[HL[0]-APPROACH,HL[1]+APPROACH],YARD]);
 // The platform's towers, one or two to a span, each wholly inside its span (so a span going takes exactly the towers standing on it). Supertall.
 const colors=cityById('nyc').colors,on=(k:number,key:'x'|'l'|'n'|'m',h:number,off?:number)=>{const w=BUILDING_PRESETS[key].w;return scaled({...BUILDING_PRESETS[key],x:YARD[0]+k*SPAN+(off??Math.round((SPAN-w)/2)),h,label:'',color:colors[(k+1)%colors.length]});};
 const deck:BuildingSpec[]=[on(1,'x',760),on(2,'l',680),on(3,'x',720),on(4,'l',640),on(5,'n',700,40),on(5,'m',420,190)];
 b={...b,buildings:[...b.buildings,...deck]};
 // Geysers: in the cross-street gaps either side of the platform and in the gaps between its towers.
 // The open stretches (under the High Line, round the Vessel, the plaza's west end) have no neighbours to find gaps between: those are authored.
 const vents=[...streetGaps(b,300,1500,200),...[2150,2500,2850,3350,3550,3950,4150,4480,4620,6760].map(sc),...streetGaps(b,YARD[0]-20,YARD[1]+20,150),...streetGaps(b,6700,7500,200)].sort((p,q)=>p-q);
 return {...b,vents,ventsAuto:true,guard:true,police:true,
  elevated:[sc(HL[0]),sc(HL[1])],elevatedLook:'park',approach:sc(APPROACH),
  yard:{x0:sc(YARD[0]),x1:sc(YARD[1]),spans:N},bridge:{x0:sc(YARD[0]),x1:sc(YARD[1]),spans:N},subway:[[sc(YARD[0]),sc(YARD[1])]],tunnel:'deep',
  air:[sc(2400),sc(4900),sc(7000)],units:[['soldier',sc(1000)],['soldier',sc(3900)],['apc',sc(4100)],['tank',sc(6900)],['soldier',sc(7200)],['helicopter',sc(5800),620]]};
}
// Level 8. The Thanksgiving parade route down 34th Street: Macy's, Penn Station (the line below it), then Madison Square Garden (the target, a drum
// with the Army's field HQ) behind a ring of parade floats used as barricades, under the full military. Parade balloons drift at roof height,
// each held by a handler crew, with helicopters sheltering behind them. The Empire State rises over the far skyline at the east end.
function nycHerald():BlockDef{
 const T=5600,PENN:[number,number]=[1750,3550],BALLOONS:[number,number][]=[[857,560],[1307,640],[1821,600],[2857,560],[3357,620],[3986,700],[5100,600]];
 let b=cityLevel('nyc','Herald Square',8,'stronghold',
  `s,m,h,_,l,_,>1500,L,_,>2420,m,s,h,_,l,m,_,s,n,m,_,>4200,h,m,s,_,>6160,x,n,l,_,x,h,n,_,m,s`,
  ["MACY'S|tower"],{startStage:3,cap:3,tier:4},{target:T,ring:[-840,-640,-440,-190,180,460]});
 // Parade floats stand where the barricades would: low flatbeds with a painted figure on top (a Gore Charge breaks them).
 const fcol=['#d9822b','#3a6ea5','#b9402f','#4f9a62','#8a5fa0','#d4b13a'];let f=0;
 b={...b,buildings:b.buildings.map(x=>x.label==='BARRIER'?{...x,label:'PARADE FLOAT',deco:'float',color:fcol[f++%fcol.length],w:Math.round(x.w*2),h:Math.round(x.h*1.5)}:x)};
 // Penn Station's head house over the line, Macy's at the west end.
 b=clearClutter(b,[[PENN[0]+180,PENN[0]+620]]);
 b={...b,buildings:[...b.buildings,hall(PENN[0]+210,380,120,'PENN STATION','#9a8f78','ferry',420)]};
 return {...b,subway:[[sc(PENN[0]),sc(PENN[1])]],balloons:BALLOONS.map(([x,a])=>[sc(x),a] as [number,number]),
  target:{x:sc(T),label:'MADISON SQUARE GARDEN',art:'arena'},guard:true,police:true,
  // The full military: Guard soldiers and armour along the avenue, artillery and an emplacement behind the floats, and a helicopter sheltering
  // behind each of the four balloons nearest the stronghold (they hold position behind them).
  units:[['soldier',sc(1200)],['tank',sc(2400)],['soldier',sc(2700)],['apc',sc(3100)],['tank',sc(3500)],['soldier',sc(3900)],['tank',sc(4300)],['artillery',sc(4900)],['emplacement',sc(5000)],['soldier',sc(6300)],['tank',sc(6600)],
   ['helicopter',sc(2857)+170,560],['helicopter',sc(3357)+170,620],['helicopter',sc(3986)+170,700],['helicopter',sc(5100)+170,600]],
  garrison:[['tank',-420],['tank',-260],['soldier',-140],['soldier',-80],['artillery',330],['soldier',260],['tank',440]],air:[sc(2600)]};
}
// Level 9. Empire State: two screens of 34th Street and Fifth Avenue (the last military push), then the tower itself. Passing `wake` splits the street
// and Tlézcatl erupts out of it. The tower is the Empire State's authored setbacks (LANDMARK_SHAPES) re-proportioned into a supertall staircase: five tiers,
// each setback a ledge EMPIRE.ledge wide on the west face (room for both kaiju), rising to the summit and the mast. He climbs ahead of the kaiju and fights
// from the ledges (`finale.perches`); at each health break the ledge under the kaiju is cut away and both drop a tier.
function nycEmpire():BlockDef{
 const X0=3700,src=landmarkShape('EMPIRE STATE')!.filter(p=>!p.spire),E=EMPIRE;
 let b=cityLevel('nyc','Empire State',6,'boss',`r,s,m,h,_,s,m,l,>3830,m,s,h`,[],{startStage:3,cap:3,tier:5});
 b=clearClutter({...b,buildings:b.buildings.filter(x=>x.kind==='tiny'||x.x+x.w<=X0-80||x.x>=X0+E.tw+80)},[[X0-200,X0+E.tw+200]]);
 // One tier per authored tier, ledges stepping in from the west; the mast is a spire (a hit-only part) on the summit.
 const parts:Part[]=src.map((_,i)=>({x:i*E.ledge,w:E.east[i]-i*E.ledge,top:E.tops[i]})),summit=E.tops[src.length-1],mx=parts[src.length-1].x+Math.round(parts[src.length-1].w/2)-8;
 parts.push({x:mx,w:16,top:summit+E.mast,base:summit,spire:true});
 const tower:BuildingSpec={x:X0,w:E.tw,h:summit,hp:1e7,value:1,kind:'large',label:'EMPIRE STATE',color:'#b7a37c',landmark:true,parts};
 b={...b,buildings:[...b.buildings,tower]};
 const perches=src.map((_,i)=>({x0:X0+i*E.ledge,x1:i<src.length-1?X0+(i+1)*E.ledge:X0+E.east[i],h:E.tops[i]}));
 return {...b,finale:{x:X0-260,wake:X0-1500,breaks:[.66,.33],perches,tower:X0,crack:X0-E.crack},police:true,guard:true,
  // The last military push on the street, ahead of the wake: armour, artillery, infantry, air cover.
  units:[['soldier',sc(500)],['apc',sc(800)],['tank',sc(1000)],['soldier',sc(1200)],['tank',sc(1500)],['artillery',sc(1700)],['emplacement',sc(1600)],['soldier',sc(1900)],['helicopter',sc(1400),520]],air:[sc(1300)]};
}
// Secret. Coney Island (4 screens, Stage 3, tier 5): the subway terminal at the west end, the amusement area (arcades, a hot dog stand), a roller coaster on a raised
// wooden track, a Ferris wheel over the top of the boardwalk's ramp, then the boardwalk, the Parachute Jump, the beach and the Atlantic (a wade at Stage 3 and Stage 2) with
// a jetty at the far end for the exit. The ride names are generic. The wheel's base breaks and the wheel rolls east down the boardwalk; the coaster's train runs away off a
// broken section of track.
function nycConey():BlockDef{
 const C=CONEY,SAND=-30,SURF=CONFIG.ground-sc(SAND)+8,BED=SURF+60,TRACK:[number,number]=[1050,1650],WHEEL=1900,land=(r:number)=>CONFIG.ground-sc(r);
 let b=cityLevel('nyc','Coney Island',4,'district',`>490,s,m,r,s,m,_,>3200,L`,['PARACHUTE JUMP|lattice'],{startStage:3,cap:3,tier:5,secret:true});
 b=clearClutter(b,[[1030,2080],[2500,3440]],true);
 // The boardwalk drops 30 down a ramp just east of the wheel's base (a gentle slope: it is enough, the wheel is round), then runs flat to the beach; the sea shelves 60 deep (a wade at
 // Stage 3, and still one at Stage 2) and a jetty rises out of it at the east end.
 const ground:[number,number][]=[[0,land(0)],[sc(1960),land(0)],[sc(2400),land(SAND)],[sc(3420),land(SAND)],[sc(3480),BED],[sc(3640),BED],[sc(3700),land(SAND)],[sc(3840),land(SAND)]];
 // The track: six sections, each a stack of parts (posts to the street, a cross-brace, the deck); the middle two are the hill.
 const w=Math.round(C.coaster.sectionW/CONFIG.cityScale),track=Array.from({length:6},(_,k)=>{const H=Math.round(C.coaster.deckH/CONFIG.cityScale)+(k===2||k===3?50:0),pw=14;
  return hall(TRACK[0]+k*w,w,H,'','#8a5a3a','track',C.coaster.sectionHP,[{x:0,w:pw,top:H-8},{x:w-pw,w:pw,top:H-8},{x:w/2-pw/2,w:pw,top:H-8},{x:0,w,top:H*.72,base:H*.72-8},{x:0,w,top:H,base:H-8}]);});
 // The wheel's base: a machine house and the hub's A-frame under the wheel's centre.
 const bw=Math.round(C.wheel.baseW/CONFIG.cityScale),hubH=Math.round(C.wheel.d/CONFIG.cityScale/2),base=hall(WHEEL-bw/2,bw,hubH+10,'','#c9c3b0','wheelbase',C.wheel.baseHP,[{x:0,w:bw,top:hubH*.3},{x:bw/2-12,w:24,top:hubH+10,base:hubH*.3-4}]);
 const stands=[hall(2540,60,52,'FRANKS','#d4b13a','store',90),hall(2650,120,92,'ARCADE','#846a89','brick',170),hall(2830,38,110,'LIFEGUARD','#e8e2d2','lifeguard',150),
  hall(2960,200,160,'BOARDWALK PAVILION','#9a8f78','brick',4000),hall(420,60,52,'FRANKS','#d4b13a','store',90),
  hall(150,260,110,'STILLWELL TERMINAL','#9a8f78','ferry',420)];
 return {...b,ground,buildings:[...b.buildings,...track,base,...stands],water:[[sc(3480-60),sc(3700),SURF]],bands:true,wheel:sc(WHEEL),coaster:[sc(TRACK[0]),sc(TRACK[1])],
  after:'Hudson Yards',secretId:'coney-island',lore:'THE Q TRAIN RUNS PAST THE LAST STOP.',guard:true,police:true,
  units:[['soldier',sc(700)],['soldier',sc(1000)],['tank',sc(2300)],['apc',sc(2750)],['tank',sc(3300)],['soldier',sc(3750)],['helicopter',sc(1800),560],['helicopter',sc(3100),620]],air:[sc(1500),sc(3000)]};
}
const NEW_YORK:BlockDef[]=[
 // 1. Act 1 (Stage 1, cap 1): Castle Clinton, ringed by the NYPD Harbor Unit. 2. The Wall Street canyon. 3. SoHo and Canal Street.
 nycBattery(),
 nycWallStreet(),
 nycSoho(),
 // 4. Act 2 (Stage 2, cap 2). Times Square: long straight avenues.
 {...cityLevel('nyc','Times Square',7,'district',`${nycRep(NYC_ROW,1)},>1600,L,${nycRep(NYC_ROW,4)}`,['ONE TIMES SQUARE|tower'],{startStage:2,cap:2,tier:2}),
  guard:true,police:true,air:[sc(2400),sc(4800)]},
 // 5. Grand Central: the Chrysler Building to the east, MetLife right behind the terminal. The Guard and tanks on the viaduct.
 {...cityLevel('nyc','Grand Central',7,'stronghold',`${nycRep(NYC_ROW,1)},L,>4700,L,${nycRep(NYC_ROW,1)}`,['MET LIFE','CHRYSLER'],{startStage:2,cap:2,tier:3},{target:3400}),
  target:{x:sc(3400),label:'GRAND CENTRAL TERMINAL',art:'clock'},guard:true,police:true,air:[sc(2600)]},
 // 6. Central Park: there and back from mid-map. Belvedere Castle holds the crystal that lifts the cap to 3. West exit leads to Hudson
 // Yards (the main route); the east exit, past the Reservoir, leads to the secret Coney Island.
 {...cityLevel('nyc','Central Park',8,'district',`${nycRep(NYC_LOW,2)},>2400,=,=,>4200,L,=,>5400,${nycRep(NYC_LOW,3)}`,['BELVEDERE CASTLE|dome'],{startStage:2,cap:2,capLift:3,tier:3}),
  start:sc(3840),crystal:sc(4400),guard:true,exits:{west:'Hudson Yards',east:'Coney Island'}},
 // 7. Act 3 (Stage 3, cap 3): Hudson Yards, the High Line, the Vessel and the rail-yard deck. 8. Herald Square and 34th Street: Macy's, Penn Station,
 // the parade and Madison Square Garden (the target).
 nycHudson(),
 nycHerald(),
 // 9. Empire State (boss): the street, then the tower. The tower's authored setback tiers stand at the east end.
 nycEmpire(),
 // Secret. Coney Island, reached from Central Park's east exit; rejoins the route at Hudson Yards.
 nycConey(),
];
// The old five New York blocks, kept verbatim as the off-route fixture city 'nyc-classic' (not in CAMPAIGN, never shown in Free Play,
// the map or the records): the pilots for city systems, terrain and river/bridge/subway, which many tests boot.
const NYC_CLASSIC:BlockDef[]=[
 // Lower Manhattan is the city-systems pilot: a west and an east power grid (substation 'S' each), fuel depots 'F', rooftop radars and
// water towers, and a line of power poles down each half.
 powered(district('nyc','Lower Manhattan',4,[[240,'s','tank'],[320,'m'],[432,'h','cache'],[562,'l','radar'],[740,'S'],[880,'m','tank'],[992,'L','WOOLWORTH'],[1182,'n'],[1246,'h','tank'],[1380,'F'],[1470,'t'],[1600,'s'],[2120,'h'],[2250,'x','radar'],[2358,'m','cache'],[2470,'s','tank'],[2560,'S'],[2720,'n'],[2784,'L','STOCK EXCHANGE'],[2974,'m'],[3086,'l'],[3250,'F'],[3420,'t'],[3500,'s','tank'],[3580,'m']],[150,760,1380,1520,1760,2060,2600,3360,3740],[200,770,1400,1850,2000,2640,3380,3760],'district',1920),
  [[0,1920],[1920,3840]],[220,500,780,1060,1340,1530,1720,2060,2300,2560,2820,3080,3340,3620]),
// Hong Kong's open blocks climb a hillside toward the Peak: each cluster stands on its own terrace, with ramps in the streets.
// Midtown is the terrain pilot: the start plaza is sunken (Rockefeller-style) with ramps up either side, and the cluster east of
 // 3770 stands on a raised terrace reached by ramps.
 terrain(district('nyc','Midtown Corridor',6,[[220,'m','tank'],[332,'h'],[462,'s','tank'],[700,'l'],[850,'L','RADIO CITY'],[1040,'x'],[1148,'m'],[1274,'S'],[1450,'t'],[1560,'s'],[1640,'h'],[1770,'n','cache'],[1834,'m'],[1946,'s'],[2040,'F'],[2270,'m'],[2382,'l'],[2630,'t'],[3150,'h'],[3280,'x'],[3388,'n'],[3452,'L','EMPIRE STATE'],[3642,'m','tank'],[3768,'F'],[3940,'s','tank'],[4020,'l'],[4170,'h','cache'],[4314,'S'],[4500,'t'],[4620,'m'],[4732,'x','radar'],[4840,'L','CHRYSLER'],[5030,'h'],[5160,'s'],[5340,'m']],[160,640,1300,1500,2180,2700,2900,3080,3880,4440,4570,5250,5650],[180,660,1320,1480,2200,2760,2980,3090,4460,4560,5260,5640],'district',2880),
  [[0,0],[2560,0],[2630,-24],[3050,-24],[3120,0],[3770,0],[3900,40],[4320,40],[4450,0],[5760,0]]),
 district('nyc','Central Stronghold',8,[[400,'l'],[555,'m'],[675,'h'],[810,'m'],[929,'s'],[1012,'x'],[1125,'l'],[1280,'x'],[1393,'l'],[1551,'s'],[1637,'h'],[1775,'h'],[1913,'h'],[2046,'l'],[2199,'h'],[2333,'x'],[2445,'s'],[2530,'l'],[2685,'h'],[3070,'b'],[3400,'b'],[3650,'b'],[4020,'b'],[4300,'b'],[4430,'m'],[4548,'h'],[4685,'l'],[4842,'h'],[4979,'m'],[5099,'s'],[5183,'h'],[5317,'m'],[5433,'x'],[5546,'m'],[5665,'n'],[5734,'l'],[5891,'h'],[6024,'l'],[6177,'x'],[6293,'l'],[6447,'m'],[6562,'l'],[6715,'s'],[6800,'n'],[6869,'m'],[6984,'x'],[7096,'m'],[7212,'m'],[7328,'n'],[7399,'s'],[7483,'n']],[550,1300,2140,2930,4600,5350,6190,7060],[500,1250,2150,2870,4510,5300,6120,7030],'stronghold'),
// East River is the phase 3 showcase: the river crosses the east end under a three-span suspension bridge (the only way across for
 // ground troops), a subway line runs under the west half (slams cave the street in), and an armory stands at each end.
 riverworks(district('nyc','East River Offensive',8,[[220,'h'],[350,'m'],[462,'s'],[548,'K'],[700,'x'],[808,'L','UN HQ'],[998,'l'],[1260,'t'],[1380,'m'],[1492,'s'],[1572,'h'],[1702,'m','cache'],[2000,'n'],[2064,'l'],[2214,'m'],[2440,'t'],[2560,'h'],[2690,'L','CITICORP'],[2880,'x'],[2988,'s'],[3260,'m'],[3372,'h'],[4140,'s'],[4220,'m'],[4332,'n'],[4396,'h','cache'],[4720,'t'],[4840,'l'],[4990,'x'],[5098,'L','MET LIFE'],[5288,'m'],[6060,'n'],[6290,'t'],[6400,'m'],[6512,'h'],[6642,'L','SEAPORT'],[6832,'s'],[6930,'K'],[7110,'m'],[7222,'h']],[150,640,1230,1330,1940,2380,2500,3200,3560,3720,4000,4080,4700,4780,5500,5700,6250,6360,7040,7520],[170,650,1240,1340,1960,2400,2510,3540,3700,4010,4740,4790,5520,5720,6270,6370,7060,7540],'district',3840),{ground:[[0,0],[5410,0],[5470,-40],[5990,-40],[6050,0],[7680,0]],water:[5420,6040,-10],bridge:[5400,6060,3],subway:[400,3700]}),
 district('nyc','Kaiban Arena',4,[[500,'m'],[890,'l'],[1300,'s'],[1720,'t'],[2130,'h'],[2550,'l'],[2980,'m'],[3370,'s']],[340,780,1210,1650,2400,3190],[350,1150,1580,2350,3200],'boss'),
];
export const LEVELS:BlockDef[][]=[
 SAN_FRANCISCO,
 NEW_YORK,
 [
 district('mex','Centro Histórico',4,[[400,'l'],[557,'m','tank'],[672,'L','CATEDRAL|twin'],[876,'S'],[1151,'h','cache'],[1287,'m','tank'],[1403,'l'],[1556,'x'],[2128,'L','BELLAS ARTES|dome'],[2350,'x','radar'],[2466,'h','cache'],[2610,'S'],[2850,'h'],[2985,'h'],[3118,'s','tank'],[3206,'L','TORRE LATINO|tower'],[3410,'F'],[3562,'h'],[3697,'n']],[190,640,1260,1780,2320,2940,3500],[380,1220,1740,2300,2930,3490],'district',1920),
 district('mex','Reforma Avenue',6,[[400,'x'],[512,'h'],[650,'x'],[765,'L','EL ÁNGEL|needle'],[969,'F'],[1166,'x'],[1278,'n'],[1348,'m','cache'],[1464,'x'],[1586,'S'],[1746,'l'],[1899,'l'],[2052,'s','tank'],[2135,'h'],[2564,'l'],[3059,'m','tank'],[3179,'L','TORRE MAYOR|tower'],[3636,'m','cache'],[3751,'x'],[3864,'h'],[4000,'x','radar'],[4122,'S'],[4311,'h'],[4449,'n'],[4518,'m','tank'],[4636,'n'],[4714,'F'],[4891,'L','MONUMENTO A LA REVOLUCIÓN|arch'],[5130,'n'],[5201,'h'],[5557,'n']],[220,870,1470,2010,2670,3270,3930,4580,5400],[520,1190,1660,2330,3010,3550,4240,4770,5440],'district',2880),
 district('mex','Crystal Bastion',8,[[400,'x'],[516,'l'],[672,'l'],[829,'h'],[965,'x'],[1081,'s'],[1169,'m'],[1287,'x'],[1399,'h'],[1534,'n'],[1606,'h'],[1743,'l'],[1896,'m'],[2016,'h'],[2151,'m'],[2266,'h'],[2399,'h'],[2532,'m'],[2649,'h'],[2782,'m'],[2898,'h'],[3260,'b'],[3550,'b'],[3720,'b'],[4020,'b'],[4260,'b'],[4390,'h'],[4526,'x'],[4639,'x'],[4750,'h'],[4884,'s'],[4971,'s'],[5057,'l'],[5211,'h'],[5344,'m'],[5461,'n'],[5531,'m'],[5646,'m'],[5762,'l'],[5920,'l'],[6078,'h'],[6214,'h'],[6351,'x'],[6466,'l'],[6623,'m'],[6739,'n'],[6807,'x'],[6920,'l'],[7078,'x'],[7194,'m'],[7311,'s'],[7399,'h'],[7535,'n']],[500,1410,2300,3090,4510,5390,6200,7060],[560,1440,2250,3110,4480,5350,6160,7050],'stronghold'),
 district('mex','Chapultepec Assault',8,[[400,'x'],[514,'h'],[647,'h'],[784,'s','tank'],[1075,'L','CASTILLO DE CHAPULTEPEC|twin'],[1300,'s','tank'],[1386,'m','cache'],[1512,'S'],[1793,'x'],[1909,'h'],[2047,'x'],[2163,'l'],[2327,'F'],[2589,'m'],[2707,'m','cache'],[2827,'L','MUSEO SOUMAYA|dome'],[3254,'n'],[3326,'h'],[3464,'x'],[3577,'m'],[3930,'x','radar'],[4042,'h'],[4175,'m','tank'],[4292,'m','tank'],[4661,'h'],[4794,'L','TORRE REFORMA|tower'],[5043,'h'],[5187,'F'],[5454,'m'],[5574,'m'],[5689,'h'],[5823,'s'],[5917,'S'],[6164,'l'],[6320,'m'],[6440,'l'],[6598,'L','ESTELA DE LUZ|needle'],[6897,'s'],[6982,'n'],[7054,'m'],[7169,'h']],[220,950,1650,2360,3120,4040,4730,5500,6230,6950],[590,1320,2030,2770,3650,4390,5100,5840,6580,7300],'district',3840),
 district('mex','Tlézcatl Arena',4,[[510,'h'],[940,'m'],[1360,'l'],[1800,'s'],[2220,'t'],[2600,'m'],[3040,'h'],[3450,'s']],[370,820,1670,2480,3330],[390,1240,2080,2930],'boss'),
 ],
 [
 district('par','Left Bank',4,[[400,'n'],[468,'l'],[625,'L','NOTRE-DAME|twin'],[829,'S'],[1208,'h','cache'],[1344,'m','tank'],[1462,'l'],[1618,'h','cache'],[2085,'s','tank'],[2171,'L','PANTHÉON|dome'],[2423,'l'],[2587,'S'],[2825,'l','radar'],[2980,'m','tank'],[3097,'h'],[3231,'L','TOUR MONTPARNASSE|tower'],[3435,'F'],[3573,'l']],[200,810,1370,2010,2730,3360],[460,1020,1640,2180,3060,3590],'district',1920),
 district('par','Grand Boulevards',6,[[400,'n'],[471,'m','tank'],[588,'n'],[655,'s','tank'],[749,'F'],[939,'L','ARC DE TRIOMPHE|arch'],[1248,'s'],[1336,'m','cache'],[1462,'S'],[1723,'h'],[1861,'l'],[2019,'m','cache'],[2136,'m'],[2525,'h'],[3102,'L','OPÉRA GARNIER|dome'],[3353,'m','tank'],[3695,'m','tank'],[3812,'n'],[3879,'s'],[3965,'h'],[4109,'S'],[4349,'l'],[4502,'h'],[4640,'m'],[4757,'L','GALERIES LAFAYETTE|tower'],[4961,'F'],[5151,'m'],[5269,'s'],[5353,'h'],[5491,'x','radar']],[210,840,1510,2110,2810,3670,4270,4960,5590],[500,1180,1800,2470,3090,3910,4580,5270],'district',2880),
 district('par','Crystal Citadel',8,[[400,'s'],[485,'m'],[604,'l'],[762,'m'],[877,'h'],[1010,'x'],[1125,'s'],[1211,'l'],[1367,'s'],[1455,'s'],[1541,'m'],[1656,'x'],[1772,'m'],[1889,'n'],[1960,'x'],[2073,'x'],[2185,'l'],[2338,'l'],[2491,'l'],[2649,'l'],[2803,'m'],[2922,'n'],[2991,'h'],[3310,'b'],[3580,'b'],[3760,'b'],[4020,'b'],[4350,'b'],[4480,'m'],[4595,'m'],[4710,'h'],[4846,'x'],[4961,'s'],[5049,'s'],[5135,'m'],[5252,'m'],[5367,'h'],[5503,'m'],[5619,'m'],[5734,'h'],[5870,'m'],[5987,'x'],[6098,'s'],[6182,'m'],[6297,'x'],[6411,'n'],[6479,'h'],[6615,'n'],[6682,'s'],[6768,'x'],[6882,'l'],[7040,'s'],[7128,'n'],[7195,'s'],[7281,'h'],[7418,'m'],[7537,'n']],[200,1110,1950,2790,4550,5400,6280,7130],[650,1500,2360,3170,4540,5390,6250,7100],'stronghold'),
 district('par','Seine Offensive',8,[[400,'s','tank'],[483,'l'],[638,'s','tank'],[725,'s'],[1054,'L','TOUR EIFFEL|lattice'],[1276,'h'],[1412,'s'],[1506,'S'],[1792,'h'],[1930,'s'],[2015,'m','cache'],[2131,'h'],[2275,'F'],[2464,'x'],[2577,'x'],[2693,'x'],[2804,'L','SACRÉ-CŒUR|dome'],[3147,'s'],[3230,'h'],[3366,'m'],[3484,'h','cache'],[3977,'n'],[4045,'m','tank'],[4165,'m','tank'],[4282,'l'],[4675,'h'],[4808,'L','LES INVALIDES|dome'],[5100,'l'],[5264,'F'],[5530,'l'],[5687,'m'],[5805,'m'],[5922,'s'],[6016,'S'],[6248,'s'],[6335,'x','radar'],[6447,'l'],[6600,'L','GRANDE ARCHE|arch'],[7006,'s'],[7091,'n'],[7162,'n'],[7234,'x']],[210,870,1540,2150,2860,3470,4140,4840,5750,6470,7140],[530,1180,1810,2470,3170,3760,4510,5400,6100,6780,7430],'district',3840),
 district('par','Belial Arena',4,[[480,'s'],[870,'h'],[1300,'m'],[1720,'l'],[2150,'t'],[2540,'h'],[2980,'s'],[3380,'m']],[340,760,1180,2010,2850,3260],[360,1150,1980,2810,3590],'boss'),
 ],
 [
 terrain(district('hkg','Kowloon Streets',4,[[400,'s','tank'],[486,'n'],[553,'m','tank'],[668,'L','CHUNGKING MANSIONS|tower'],[1026,'h'],[1160,'s'],[1243,'x'],[1358,'m'],[2091,'h','radar'],[2224,'L','TIN HAU TEMPLE|pagoda'],[2425,'m','tank'],[2776,'m','tank'],[2895,'m','cache'],[3010,'m'],[3126,'L','LADIES MARKET|tower'],[3461,'n'],[3533,'s'],[3618,'s']],[210,830,1500,2000,2680,3300],[530,1130,1710,2310,2990,3620],'district',1920),[[0,0],[380,0],[872,0],[1012,22],[1484,22],[2077,44],[2551,44],[2762,66],[3330,66],[3447,88],[3840,88]]),
 terrain(district('hkg','Nathan Road',6,[[400,'m','cache'],[516,'m','tank'],[633,'l'],[789,'L','PENINSULA HOTEL|twin'],[1180,'s','tank'],[1263,'m'],[1381,'n'],[1451,'m'],[1859,'m'],[1979,'h','cache'],[2116,'h'],[2250,'h'],[3046,'m','tank'],[3165,'L','CLOCK TOWER|tower'],[3454,'m','tank'],[3885,'m'],[4001,'h'],[4135,'x','radar'],[4248,'s'],[4624,'m'],[4740,'L','ICC TOWER|needle'],[4995,'m'],[5350,'l'],[5503,'x'],[5614,'n']],[210,930,1570,2250,2930,3600,4340,5050,5660],[540,1240,1930,2560,3280,3990,4660,5360],'district',2880),[[0,0],[380,0],[993,0],[1166,22],[1577,22],[1845,44],[2394,44],[3032,66],[3580,66],[3871,88],[4342,88],[4610,88],[5121,88],[5336,88],[5760,88]]),
 district('hkg','Harbour Stronghold',8,[[400,'m'],[520,'l'],[677,'s'],[765,'n'],[836,'l'],[992,'h'],[1130,'h'],[1264,'l'],[1419,'s'],[1504,'h'],[1641,'l'],[1797,'m'],[1915,'l'],[2071,'h'],[2206,'m'],[2325,'x'],[2436,'h'],[2569,'s'],[2654,'m'],[2774,'l'],[2928,'m'],[3043,'s'],[3330,'b'],[3590,'b'],[3760,'b'],[4020,'b'],[4310,'b'],[4440,'h'],[4574,'s'],[4660,'l'],[4816,'n'],[4883,'x'],[4998,'m'],[5118,'l'],[5274,'h'],[5407,'h'],[5544,'x'],[5656,'s'],[5741,'s'],[5826,'m'],[5942,'x'],[6057,'s'],[6143,'h'],[6277,'m'],[6397,'s'],[6483,'m'],[6602,'h'],[6736,'x'],[6847,'m'],[6967,'l'],[7122,'l'],[7276,'m'],[7392,'m'],[7510,'n']],[200,1080,1950,2780,4550,5400,6270,7150],[640,1500,2380,3180,4530,5380,6240,7100],'stronghold'),
 terrain(district('hkg','Victoria Assault',8,[[400,'m','cache'],[517,'m','tank'],[636,'l'],[790,'s','tank'],[1100,'L','BANK OF CHINA|needle'],[1403,'m'],[1766,'h','cache'],[1903,'l'],[2058,'x'],[2174,'h'],[2568,'h'],[2706,'n'],[2778,'s'],[2862,'L','IFC TWO|tower'],[3133,'m'],[3251,'m'],[3367,'x'],[3483,'m'],[3968,'h'],[4105,'l'],[4262,'h'],[4397,'h'],[4825,'L','HSBC BUILDING|tower'],[5065,'s','tank'],[5150,'x'],[5465,'m','tank'],[5582,'h'],[5716,'x','radar'],[5830,'l'],[6259,'s'],[6342,'l'],[6497,'l'],[6651,'L','CENTRAL PLAZA|needle'],[6997,'x'],[7111,'l'],[7264,'m'],[7384,'h']],[220,980,1690,2380,3070,3810,4500,5240,6010,6680,7440],[590,1300,2010,2730,3420,4130,4900,5600,6300,7080],'district',3840),[[0,0],[380,0],[884,0],[1086,22],[1529,22],[1752,44],[2318,44],[2554,66],[3609,66],[3954,88],[4541,88],[4811,88],[5272,88],[5451,88],[5994,88],[6245,88],[6855,88],[6983,88],[7680,88]]),
 district('hkg','Myrmex Arena',4,[[520,'l'],[980,'m'],[1400,'h'],[1840,'t'],[2220,'s'],[2620,'l'],[3080,'m'],[3490,'s']],[350,850,1280,2100,2950,3370],[380,1260,2070,2940],'boss'),
 ],
 [
 railway(district('tyo','Shinjuku District',4,[[400,'m','cache'],[515,'h'],[650,'L','METROPOLITAN GOVT|twin'],[854,'S'],[1161,'x'],[1274,'n'],[1345,'x'],[1456,'m','cache'],[2024,'x'],[2137,'L','KABUKICHO TOWER|tower'],[2410,'x','radar'],[2532,'S'],[2774,'l'],[2927,'m','tank'],[3047,'m','tank'],[3166,'L','HANAZONO SHRINE|pagoda'],[3474,'m'],[3592,'m']],[190,840,1490,2130,2830,3470],[470,1180,1860,2460,3150],'district',1920),300,3500),
 railway(district('tyo','Chuo Corridor',6,[[400,'m','cache'],[519,'x'],[634,'m','tank'],[751,'s','tank'],[845,'F'],[1106,'L','TOKYO STATION|dome'],[1307,'l'],[1460,'m','cache'],[1586,'S'],[1833,'l'],[1989,'n'],[2058,'h'],[2192,'x'],[2575,'l'],[3003,'m','tank'],[3121,'L','GINZA WAKO|tower'],[3549,'m','tank'],[3669,'l'],[3823,'n'],[3891,'x','radar'],[4013,'S'],[4256,'n'],[4326,'m'],[4444,'l'],[4602,'l'],[4766,'F'],[4986,'L','KABUKI-ZA|pagoda'],[5228,'m'],[5348,'s']],[220,960,1690,2370,3070,3790,4510,5250],[620,1300,2010,2760,3390,4150,4880,5570],'district',2880),300,5400),
 district('tyo','Crystal Heart',8,[[400,'h'],[534,'s'],[619,'h'],[753,'m'],[869,'h'],[1006,'l'],[1159,'m'],[1274,'l'],[1431,'m'],[1551,'m'],[1670,'s'],[1756,'l'],[1910,'x'],[2026,'l'],[2182,'l'],[2335,'x'],[2450,'l'],[2607,'m'],[2723,'h'],[2861,'l'],[3015,'s'],[3102,'x'],[3360,'b'],[3600,'b'],[3760,'b'],[4020,'b'],[4290,'b'],[4420,'h'],[4553,'l'],[4708,'h'],[4842,'s'],[4928,'n'],[4999,'l'],[5157,'l'],[5313,'m'],[5433,'l'],[5589,'m'],[5709,'x'],[5823,'n'],[5893,'h'],[6027,'n'],[6095,'h'],[6232,'m'],[6349,'s'],[6434,'l'],[6590,'h'],[6727,'s'],[6815,'h'],[6950,'n'],[7021,'s'],[7107,'n'],[7175,'m'],[7294,'s'],[7382,'m'],[7499,'n']],[200,1100,1960,2850,4540,5440,6350,7210],[650,1530,2390,3210,4510,5410,6290,7160],'stronghold'),
 railway(district('tyo','Tokyo Final Offensive',8,[[400,'h','cache'],[538,'l'],[693,'n'],[761,'m','cache'],[1103,'L','TOKYO TOWER|lattice'],[1306,'s','tank'],[1389,'l'],[1553,'S'],[1817,'m','tank'],[1935,'h'],[2072,'h'],[2209,'x'],[2331,'F'],[2538,'m'],[2656,'l'],[2811,'m'],[2929,'L','SKYTREE|needle'],[3357,'m'],[3474,'h'],[3970,'l'],[4127,'l'],[4535,'n'],[4602,'x'],[4717,'l'],[4870,'L','SENSŌ-JI|pagoda'],[5074,'F'],[5283,'x','radar'],[5395,'l'],[5551,'m','tank'],[5667,'l'],[5831,'S'],[6048,'h'],[6186,'l'],[6341,'s','tank'],[6427,'h'],[6791,'L','SHIBUYA 109|tower'],[7038,'l'],[7192,'x'],[7493,'m']],[200,960,1690,2410,3170,3910,4620,5390,6150,6900],[580,1300,2040,2780,3520,4270,5020,5760,6510,7290],'district',3840),300,7300),
 district('tyo','Sargathoth Arena',4,[[530,'h'],[980,'l'],[1440,'m'],[1850,'s'],[2250,'t'],[2630,'h'],[3070,'l'],[3510,'s']],[360,860,1320,2130,2940,3390],[390,1280,2090,2920],'boss'),
 ],
 NYC_CLASSIC,
];
// City systems for every city's open blocks (and Midtown): a west and an east grid and, outside Paris (cables run underground there),
// a line of power poles down the street. Their substations, fuel stations, radars and rooftop tanks are in the entries above.
for(const [n,grids,poles] of [
 ['Midtown Corridor',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Centro Histórico',[[0, 1920], [1920, 3840]],[220, 500, 780, 1060, 1340, 1620, 2180, 2460, 2740, 3020, 3300, 3580]],
 ['Reforma Avenue',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Chapultepec Assault',[[0, 3840], [3840, 7680]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 4140, 4420, 4700, 4980, 5260, 5540, 5820, 6100, 6380, 6660, 6940, 7220]],
 ['Left Bank',[[0, 1920], [1920, 3840]],[]],
 ['Grand Boulevards',[[0, 2880], [2880, 5760]],[]],
 ['Seine Offensive',[[0, 3840], [3840, 7680]],[]],
 ['Kowloon Streets',[[0, 1920], [1920, 3840]],[220, 500, 780, 1060, 1340, 1620, 2180, 2460, 2740, 3020, 3300, 3580]],
 ['Nathan Road',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Victoria Assault',[[0, 3840], [3840, 7680]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 4140, 4420, 4700, 4980, 5260, 5540, 5820, 6100, 6380, 6660, 6940, 7220]],
 ['Shinjuku District',[[0, 1920], [1920, 3840]],[220, 500, 780, 1060, 1340, 1620, 2180, 2460, 2740, 3020, 3300, 3580]],
 ['Chuo Corridor',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Tokyo Final Offensive',[[0, 3840], [3840, 7680]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 4140, 4420, 4700, 4980, 5260, 5540, 5820, 6100, 6380, 6660, 6940, 7220]]] as [string,[number,number][],number[]][])for(const city of LEVELS){const i=city.findIndex(b=>b.name===n);if(i>=0)city[i]=powered(city[i],grids,poles);}
export function levelWidth(block:BlockDef){return sc(block.screens*CONFIG.width);}
