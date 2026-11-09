export const KAIJU=['Mogurodon','Tlézcatl','Belial','Kaiban','Myrmex','Sargathoth'];
export const PERMANENT_KEY='kaiju-arcade:permanent:v1',CHECKPOINT_KEY='kaiju-arcade:campaign:v1';
export type Checkpoint={version:1,id:string,initials:string,kaiju:string,city:number,banked:number};
export type RecordScore={id:string,initials:string,kaiju:string,score:number,cities:number,completed:boolean};
export type Permanent={version:1,unlocked:string[],conquered:number[],gallery:string[],scores:RecordScore[]};
export type Run=Checkpoint&{block:number,phase:'boundary'|'playing'|'results'|'conquered'|'over',blockStart:number};
export type StorageLike={getItem:(key:string)=>string|null,setItem:(key:string,value:string)=>void,removeItem:(key:string)=>void};
export function emptyPermanent():Permanent{return {version:1,unlocked:['Mogurodon'],conquered:[],gallery:[],scores:[]};}
export function initialsValid(value:string){return /^[A-Z]{3}$/.test(value);}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e12;
function validCheckpoint(c:any):c is Checkpoint{return c?.version===1&&typeof c.id==='string'&&c.id.length<100&&initialsValid(c.initials)&&KAIJU.includes(c.kaiju)&&Number.isInteger(c.city)&&c.city>=0&&c.city<5&&finite(c.banked);}
export function readSaves(storage:StorageLike|undefined){
 let permanent=emptyPermanent(),checkpoint:Checkpoint|null=null,available=true;
 try{const p=JSON.parse(storage?.getItem(PERMANENT_KEY)||'null');if(p?.version===1){
 permanent.unlocked=[...new Set(['Mogurodon',...(Array.isArray(p.unlocked)?p.unlocked.filter((k:unknown)=>KAIJU.includes(k as string)):[])])] as string[];
 permanent.conquered=Array.isArray(p.conquered)?[...new Set(p.conquered.filter((c:unknown)=>Number.isInteger(c)&&Number(c)>=0&&Number(c)<5))] as number[]:[];
 permanent.gallery=Array.isArray(p.gallery)?p.gallery.filter((k:unknown)=>KAIJU.includes(k as string)):[];
 permanent.scores=Array.isArray(p.scores)?p.scores.filter((r:any)=>typeof r?.id==='string'&&r.id.length<100&&initialsValid(r.initials)&&KAIJU.includes(r.kaiju)&&finite(r.score)&&Number.isInteger(r.cities)&&r.cities>=0&&r.cities<=5&&typeof r.completed==='boolean').sort((a:RecordScore,b:RecordScore)=>b.score-a.score).slice(0,10):[];
 for(const r of permanent.scores)if(r.completed&&!permanent.gallery.includes(r.kaiju))permanent.gallery.push(r.kaiju);
 }}catch{available=false;}
 try{const c=JSON.parse(storage?.getItem(CHECKPOINT_KEY)||'null');if(validCheckpoint(c))checkpoint=c;}catch{available=false;}
 if(!storage)available=false;return {permanent,checkpoint,available};
}
export function savePermanent(storage:StorageLike|undefined,p:Permanent){try{if(!storage)return false;storage.setItem(PERMANENT_KEY,JSON.stringify(p));return true;}catch{return false;}}
export function saveCheckpoint(storage:StorageLike|undefined,c:Checkpoint|null){try{if(!storage)return false;if(c)storage.setItem(CHECKPOINT_KEY,JSON.stringify(c));else storage.removeItem(CHECKPOINT_KEY);return true;}catch{return false;}}
export function newRun(initials:string,kaiju='Mogurodon',id=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`):Run{
 if(!initialsValid(initials)||!KAIJU.includes(kaiju))throw Error('Three uppercase letters and a known kaiju are required.');
 return {version:1,id,initials,kaiju,city:0,banked:0,block:0,blockStart:0,phase:'boundary'};
}
export function checkpointOf(run:Run):Checkpoint{if(run.phase!=='boundary')throw Error('Checkpoint writes are restricted to city boundaries.');return {version:1,id:run.id,initials:run.initials,kaiju:run.kaiju,city:run.city,banked:run.banked};}
export function resumeRun(c:Checkpoint):Run{if(!validCheckpoint(c))throw Error('Invalid checkpoint');return {...c,block:0,blockStart:0,phase:'boundary'};}
export function restartCity(run:Run){if(run.phase==='over')return false;run.block=0;run.blockStart=0;run.phase='playing';return true;}
export function latchBlock(run:Run){if(run.phase!=='playing'||run.block===4)return false;run.phase='results';return true;}
export function nextBlock(run:Run,cityScore:number){if(run.phase!=='results'||run.block>=4)return false;run.block++;run.blockStart=cityScore;run.phase='playing';return true;}
export function addRecord(p:Permanent,run:Run,score:number,completed:boolean){if(p.scores.some(r=>r.id===run.id))return;p.scores.push({id:run.id,initials:run.initials,kaiju:run.kaiju,score:Math.round(score),cities:completed?5:run.city,completed});p.scores.sort((a,b)=>b.score-a.score);p.scores=p.scores.slice(0,10);}
export function conquerCity(p:Permanent,run:Run,cityScore:number,boss:string){
 if(run.phase!=='playing'||run.block!==4)return false;
 run.phase='conquered';run.banked+=cityScore;
 if(!p.conquered.includes(run.city))p.conquered.push(run.city);
 if(!p.unlocked.includes(boss))p.unlocked.push(boss);
 if(run.city===4){if(!p.gallery.includes(run.kaiju))p.gallery.push(run.kaiju);addRecord(p,run,run.banked,true);run.phase='over';}
 return true;
}
export function advanceCity(run:Run){if(run.phase!=='conquered'||run.city>=4)return false;run.city++;run.block=0;run.blockStart=0;run.phase='boundary';return true;}
export function loseRun(p:Permanent,run:Run,cityScore:number){if(run.phase==='over'||run.phase==='conquered')return false;addRecord(p,run,run.banked+cityScore,false);run.phase='over';return true;}
