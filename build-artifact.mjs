// Builds the page for publishing as a claude.ai Artifact: dist-artifact/index.html (+ dist-artifact/assets/ and files.json).
// The Artifact viewer is happiest with no outside requests, so this inlines the stylesheet and bundles every module into one
// classic script; sprites ship as sheets beside it (default) or embedded as data URIs (--inline). No dependencies:
// each module runs in its own function scope (no name collisions) and returns the names other modules import.
// The page body has no <html>/<head>/<body>: the Artifact tool adds that skeleton when it publishes.
import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';

const IMPORT=/import\s*\{([^}]*)\}\s*from\s*['"]\.\/(\w+)\.(?:ts|js)['"]\s*;?/g;
const modules=new Map(),wanted=new Map(),order=[];

async function load(name){
 if(modules.has(name))return;
 const js=stripTypeScriptTypes(await readFile(`src/${name}.ts`,'utf8'),{mode:'strip'});
 const deps=[];
 for(const [,list,from] of js.matchAll(IMPORT)){
  deps.push(from);
  const names=wanted.get(from)??new Set();
  for(const spec of list.split(',').map(s=>s.trim()).filter(Boolean))names.add(spec.split(/\s+as\s+/)[0].trim());
  wanted.set(from,names);
 }
 modules.set(name,js);
 for(const dep of deps)await load(dep);
 order.push(name); // dependencies first
}
await load('game');

const scoped=order.map(name=>{
 let body=modules.get(name)
  .replace(IMPORT,(_,list,from)=>`const {${list.split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/\s+as\s+/,':')).join(',')}}=__${from};`)
  .replace(/(^|[;{}\n])(\s*)export\s+(?=(?:const|let|var|function|class|async)\b)/g,'$1$2');
 if(/\bexport\b\s*[{*d]/.test(body))throw Error(`${name}.ts uses an export form build-artifact.mjs does not handle`);
 const names=[...(wanted.get(name)??[])];
 return name==='game'?`(()=>{${body}\n})();`:`const __${name}=(()=>{${body}\nreturn {${names.join(',')}};})();`;
}).join('\n');

let js=scoped;
const strips=[...new Set(js.match(/assets\/[\w.-]+\.png/g)??[])];
// Default: sprites stay separate files beside the page (dist-artifact/assets/, listed in dist-artifact/files.json for the publisher's
// supporting-files option), so the page is a few hundred KB whatever the art weighs and the game only downloads the kaiju being played.
// Each kaiju form's strips are packed into one sheet (tools/pack_sprites.py, lossless WebP; `--png` for 256-colour PNG sheets instead)
// and src/presentation.ts finds them through the atlas injected at /*__ATLAS__*/. Strips that must load before a kaiju is picked
// (every kaiju's base idle, the title/ending art slots) stay loose. public/assets is never modified.
// `--inline`: one self-contained page with every sheet embedded as base64, only while it fits the 16MB Artifact page limit.
// Publisher limits: 255 files per publish, 511 per Artifact version, 15MB per file.
const inline=process.argv.includes('--inline'),format=process.argv.includes('--png')?'png':'webp';
const outDir='dist-artifact',sheetDir=`${outDir}/assets/sheets`;
await rm(`${outDir}/assets`,{recursive:true,force:true});await mkdir(sheetDir,{recursive:true});

// The structure of SPRITES (which strips make a form) comes from the real module, not from scanning source text.
async function sheetGroups(){
 const tmp=`${outDir}/.modules`;await mkdir(tmp,{recursive:true});
 for(const name of order)await writeFile(`${tmp}/${name}.js`,modules.get(name).replaceAll('.ts"','.js"').replaceAll(".ts'",".js'"));
 try{
  const {SPRITES,ART_SLOTS}=await import(pathToFileURL(`${process.cwd()}/${tmp}/presentation.js`).href);
  const loose=new Set([ART_SLOTS.menu,...ART_SLOTS.intro,...Object.values(ART_SLOTS.endings),...Object.values(SPRITES).map(k=>k.anims.idle?.src)].filter(Boolean));
  const groups={},taken=new Set(loose);
  const add=(name,form)=>{for(const {src} of Object.values(form.anims))if(strips.includes(src)&&!taken.has(src)){taken.add(src);(groups[name]??=[]).push(src);}};
  for(const [kaiju,s] of Object.entries(SPRITES)){const slug=kaiju.normalize('NFD').replace(/[^\w]/g,'').toLowerCase(); // ASCII file names (Tlézcatl)
   add(slug,s);for(const [stage,f] of Object.entries(s.stages??{}))add(`${slug}-stage${stage}`,f);}
  return groups;
 }finally{await rm(tmp,{recursive:true,force:true});}
}
let atlas={};
try{
 const groups=await sheetGroups(),manifest=`${outDir}/.manifest.json`;
 await writeFile(manifest,JSON.stringify(groups));
 atlas=JSON.parse(execFileSync('python3',['tools/pack_sprites.py','--out',sheetDir,'--format',format,manifest],{encoding:'utf8',maxBuffer:1e8}));
 await rm(manifest,{force:true});
 for(const sheet of Object.values(atlas))sheet[0]=`assets/sheets/${sheet[0]}`;
}catch(e){console.warn(`Could not pack sprites into sheets (${e.message.split('\n')[0]}); using one file per strip.`);atlas={};}
const sheets=[...new Set(Object.values(atlas).map(c=>c[0]))],loose=strips.filter(src=>!atlas[src]);
const bytesOf=async list=>{let n=0;for(const f of list)n+=(await readFile(f)).length;return n;};
let assetBytes;
if(inline){
 const uri=async(file,type)=>`data:${type};base64,${(await readFile(file)).toString('base64')}`;
 js=js.replace('/*__ATLAS__*/{}',JSON.stringify(atlas));
 for(const sheet of sheets)js=js.replaceAll(`"${sheet}"`,`"${await uri(`${outDir}/${sheet}`,`image/${format}`)}"`);
 for(const path of loose){const u=await uri(`public/${path}`,'image/png');js=js.replaceAll(`'${path}'`,`'${u}'`).replaceAll(`"${path}"`,`"${u}"`);}
 assetBytes=await bytesOf(sheets.map(f=>`${outDir}/${f}`).concat(loose.map(f=>`public/${f}`)));
 await rm(`${outDir}/assets`,{recursive:true,force:true});await rm(`${outDir}/files.json`,{force:true});
}else{
 js=js.replace('/*__ATLAS__*/{}',JSON.stringify(atlas));
 const files={};
 for(const f of sheets)files[f]=`${outDir}/${f}`;
 for(const path of loose){await copyFile(`public/${path}`,`${outDir}/${path}`);files[path]=`${outDir}/${path}`;}
 for(const [path,file] of Object.entries(files))if((await readFile(file)).length>15e6)throw Error(`${path} is over the 15MB per-file limit`);
 await writeFile(`${outDir}/files.json`,JSON.stringify(files,null,1));
 assetBytes=await bytesOf(Object.values(files));
 console.log(`Wrote ${Object.keys(files).length} files (${sheets.length} sheets + ${loose.length} loose strips, ${(assetBytes/1e6).toFixed(1)} MB) to ${outDir}/assets/ and their list to ${outDir}/files.json`);
 if(Object.keys(files).length>250)console.warn(`warning: ${Object.keys(files).length} files is close to the 255 one publish can send`);
}
js=js.replaceAll('</script','<\\/script');

const html=await readFile('public/index.html','utf8'),css=await readFile('public/style.css','utf8');
const title=html.match(/<title>([^<—]*)/)?.[1].trim()||'Kaiju-Geddon!';
const body=html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[^>]*src=[^>]*><\/script>/g,'').trim();
if(css.includes('</style'))throw Error('style.css cannot contain </style');
// Errors only: a red bar with the message, so a blank page in the viewer still says what went wrong.
const errorBar=`<div id="boot-error" hidden style="position:fixed;left:0;right:0;bottom:0;z-index:99;font:12px monospace;color:#ff8a8a;background:#000d;padding:6px 10px;white-space:pre-wrap"></div>
<script>window.addEventListener('error',function(e){var b=document.getElementById('boot-error');if(b){b.hidden=false;b.textContent+=(b.textContent?'\\n':'')+'ERROR: '+e.message+(e.lineno?' (line '+e.lineno+')':'');}});</script>`;
const page=`<title>${title}</title>\n<style>\n${css}\n</style>\n${errorBar}\n${body}\n<script>\n${js}\n</script>\n`;

await mkdir('dist-artifact',{recursive:true});
await writeFile('dist-artifact/index.html',page);
console.log(`Built dist-artifact/index.html (${order.length} modules, ${strips.length} strips in ${sheets.length} ${format} sheets + ${loose.length} loose, ${inline?'embedded':'separate files'}, page ${(page.length/1e6).toFixed(2)} MB)`);
if(page.length>16e6)throw Error('Page is over the 16MB Artifact limit');
