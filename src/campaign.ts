import {CITIES,LEVELS,cityIndexOf} from './levels.ts';
export const KAIJU=['Mogurodon','Tlézcatl','Belial','Kaiban','Myrmex','Sargathoth','Atomotitan'];
// The campaign route: city ids in order. Each city's final boss is (in the redesign) the next city's kaiju.
export const CAMPAIGN=['sfo','nyc','mex','par','hkg','tyo'];
// v2 (campaign redesign): cities are ids and San Francisco leads the route. v1 saves are not migrated; they are ignored and the
// first v2 write replaces them.
export const SAVE_VERSION=2;
export const PERMANENT_KEY='kaiju-arcade:permanent:v2',CHECKPOINT_KEY='kaiju-arcade:campaign:v2';
export const LEGACY_KEYS=['kaiju-arcade:permanent:v1','kaiju-arcade:campaign:v1'];
// city: the run's position on CAMPAIGN (0 = the first city).
export type Checkpoint={version:2,id:string,initials:string,kaiju:string,city:number,banked:number};
export type RecordScore={id:string,initials:string,kaiju:string,score:number,cities:number,completed:boolean};
// conquered: city ids.
// secrets: ids of secret levels cleared in the campaign (a level's `secretId`); each is offered in Free Play and has a gallery entry.
export type Permanent={version:2,unlocked:string[],conquered:string[],gallery:string[],secrets:string[],scores:RecordScore[]};
export type Run=Checkpoint&{block:number,phase:'boundary'|'playing'|'results'|'conquered'|'over',blockStart:number};
export type StorageLike={getItem:(key:string)=>string|null,setItem:(key:string,value:string)=>void,removeItem:(key:string)=>void};
// The city a campaign position stands for, its index in CITIES / LEVELS, and the levels on its route (secret levels are off it).
export function campaignCity(position:number){return CITIES[cityIndexOf(CAMPAIGN[position])];}
export function campaignCityIndex(position:number){return cityIndexOf(CAMPAIGN[position]);}
export function routeLevels(cityIndex:number){return (LEVELS[cityIndex]??[]).map((b,i)=>b.secret?-1:i).filter(i=>i>=0);}
// Secret levels: found by their `secretId`. Clearing one in the campaign unlocks it for Free Play and the gallery.
export function secretLevelOf(id:string):{city:number,block:number}|undefined{for(let city=0;city<LEVELS.length;city++){const block=LEVELS[city].findIndex(b=>b.secret&&b.secretId===id);if(block>=0)return {city,block};}return undefined;}
export function secretIds(){return LEVELS.flat().filter(b=>b.secret&&b.secretId).map(b=>b.secretId!);}
export function unlockSecret(p:Permanent,id:string){if(!secretLevelOf(id)||p.secrets.includes(id))return false;p.secrets.push(id);return true;}
// The levels Free Play offers in a city: its route, then each cleared secret (only once the city itself is conquered).
export function freePlayLevels(p:Permanent,cityIndex:number){return [...routeLevels(cityIndex),...(p.secrets??[]).map(secretLevelOf).filter(s=>s?.city===cityIndex).map(s=>s!.block)];}
// The kaiju a campaign plays in a city: the city's own, or the run's chosen kaiju where the city has none.
export function kaijuFor(run:{kaiju:string,city:number}){return campaignCity(run.city)?.kaiju??run.kaiju;}
const finalLevel=(run:Run)=>{const r=routeLevels(campaignCityIndex(run.city));return r[r.length-1];};
export function emptyPermanent():Permanent{return {version:2,unlocked:['Mogurodon'],conquered:[],gallery:[],secrets:[],scores:[]};}
export function initialsValid(value:string){return /^[A-Z]{3}$/.test(value);}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e12;
function validCheckpoint(c:any):c is Checkpoint{return c?.version===SAVE_VERSION&&typeof c.id==='string'&&c.id.length<100&&initialsValid(c.initials)&&KAIJU.includes(c.kaiju)&&Number.isInteger(c.city)&&c.city>=0&&c.city<CAMPAIGN.length&&finite(c.banked);}
export function readSaves(storage:StorageLike|undefined){
 let permanent=emptyPermanent(),checkpoint:Checkpoint|null=null,available=true;
 try{const p=JSON.parse(storage?.getItem(PERMANENT_KEY)||'null');if(p?.version===SAVE_VERSION){
 permanent.unlocked=[...new Set(['Mogurodon',...(Array.isArray(p.unlocked)?p.unlocked.filter((k:unknown)=>KAIJU.includes(k as string)):[])])] as string[];
 permanent.conquered=Array.isArray(p.conquered)?[...new Set(p.conquered.filter((c:unknown)=>typeof c==='string'&&CAMPAIGN.includes(c)))] as string[]:[];
 permanent.secrets=Array.isArray(p.secrets)?[...new Set(p.secrets.filter((k:unknown)=>typeof k==='string'&&!!secretLevelOf(k)))] as string[]:[];
 permanent.gallery=Array.isArray(p.gallery)?p.gallery.filter((k:unknown)=>KAIJU.includes(k as string)):[];
 permanent.scores=Array.isArray(p.scores)?p.scores.filter((r:any)=>typeof r?.id==='string'&&r.id.length<100&&initialsValid(r.initials)&&KAIJU.includes(r.kaiju)&&finite(r.score)&&Number.isInteger(r.cities)&&r.cities>=0&&r.cities<=CAMPAIGN.length&&typeof r.completed==='boolean').sort((a:RecordScore,b:RecordScore)=>b.score-a.score).slice(0,10):[];
 for(const r of permanent.scores)if(r.completed&&!permanent.gallery.includes(r.kaiju))permanent.gallery.push(r.kaiju);
 }}catch{available=false;}
 try{const c=JSON.parse(storage?.getItem(CHECKPOINT_KEY)||'null');if(validCheckpoint(c))checkpoint=c;}catch{available=false;}
 if(!storage)available=false;return {permanent,checkpoint,available};
}
// Old-version saves are discarded, not migrated (they would put a run in the wrong city). Called once at boot.
export function discardLegacySaves(storage:StorageLike|undefined){try{for(const k of LEGACY_KEYS)storage?.removeItem(k);}catch{}}
export function savePermanent(storage:StorageLike|undefined,p:Permanent){try{if(!storage)return false;storage.setItem(PERMANENT_KEY,JSON.stringify(p));return true;}catch{return false;}}
export function saveCheckpoint(storage:StorageLike|undefined,c:Checkpoint|null){try{if(!storage)return false;if(c)storage.setItem(CHECKPOINT_KEY,JSON.stringify(c));else storage.removeItem(CHECKPOINT_KEY);return true;}catch{return false;}}
export function newRun(initials:string,kaiju='Mogurodon',id=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`):Run{
 if(!initialsValid(initials)||!KAIJU.includes(kaiju))throw Error('Three uppercase letters and a known kaiju are required.');
 return {version:2,id,initials,kaiju,city:0,banked:0,block:0,blockStart:0,phase:'boundary'};
}
export function checkpointOf(run:Run):Checkpoint{if(run.phase!=='boundary')throw Error('Checkpoint writes are restricted to city boundaries.');return {version:2,id:run.id,initials:run.initials,kaiju:run.kaiju,city:run.city,banked:run.banked};}
export function resumeRun(c:Checkpoint):Run{if(!validCheckpoint(c))throw Error('Invalid checkpoint');return {...c,block:0,blockStart:0,phase:'boundary'};}
export function restartCity(run:Run){if(run.phase==='over')return false;run.block=routeLevels(campaignCityIndex(run.city))[0]??0;run.blockStart=0;run.phase='playing';return true;}
// A level's result latches once; the city's final (boss) level ends through conquerCity instead.
export function latchBlock(run:Run){if(run.phase!=='playing'||run.block===finalLevel(run))return false;run.phase='results';return true;}
// Where leaving a level leads. A there-and-back level (Fisherman's Wharf) has an `exits` entry per side naming the level (by name) that
// side goes to; a secret level's `after` names where it rejoins the route; everything else goes to the next level on the route
// (secret levels are skipped). `side` is the end of the level the kaiju walked out of; without it (tests, a plain advance) a level
// with two exits goes the main way.
export type ExitSide='west'|'east';
export function exitTarget(cityIndex:number,block:number,side?:ExitSide):number|undefined{
 const levels=LEVELS[cityIndex]??[],level=levels[block],named=(name?:string)=>{const i=name?levels.findIndex(b=>b.name===name):-1;return i>=0?i:undefined;};
 return (side?named(level?.exits?.[side]):undefined)??named(level?.after)??routeLevels(cityIndex).find(i=>i>block);}
// Advance to the level the exit used leads to.
// `cityIndex`: the city the level belongs to (the run's own, unless a test is inside a fixture city such as 'nyc-classic').
export function nextBlock(run:Run,cityScore:number,side?:ExitSide,cityIndex=campaignCityIndex(run.city)){if(run.phase!=='results')return false;const next=exitTarget(cityIndex,run.block,side);if(next===undefined)return false;run.block=next;run.blockStart=cityScore;run.phase='playing';return true;}
export function addRecord(p:Permanent,run:Run,score:number,completed:boolean){if(p.scores.some(r=>r.id===run.id))return;p.scores.push({id:run.id,initials:run.initials,kaiju:run.kaiju,score:Math.round(score),cities:completed?CAMPAIGN.length:run.city,completed});p.scores.sort((a,b)=>b.score-a.score);p.scores=p.scores.slice(0,10);}
export function conquerCity(p:Permanent,run:Run,cityScore:number,boss:string){
 if(run.phase!=='playing'||run.block!==finalLevel(run))return false;
 run.phase='conquered';run.banked+=cityScore;
 if(!p.conquered.includes(CAMPAIGN[run.city]))p.conquered.push(CAMPAIGN[run.city]);
 if(!p.unlocked.includes(boss))p.unlocked.push(boss);
 if(run.city===CAMPAIGN.length-1){if(!p.gallery.includes(run.kaiju))p.gallery.push(run.kaiju);addRecord(p,run,run.banked,true);run.phase='over';}
 return true;
}
export function advanceCity(run:Run){if(run.phase!=='conquered'||run.city>=CAMPAIGN.length-1)return false;run.city++;run.block=routeLevels(campaignCityIndex(run.city))[0]??0;run.blockStart=0;run.phase='boundary';return true;}
export function loseRun(p:Permanent,run:Run,cityScore:number){if(run.phase==='over'||run.phase==='conquered')return false;addRecord(p,run,run.banked+cityScore,false);run.phase='over';return true;}
