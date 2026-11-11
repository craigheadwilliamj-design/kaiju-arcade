// Builds a single self-contained page for publishing as a claude.ai Artifact: dist-artifact/index.html.
// The Artifact viewer is happiest with one file and no outside requests, so this inlines the stylesheet,
// bundles every module into one classic script and embeds the sprites as data URIs. No dependencies:
// each module runs in its own function scope (no name collisions) and returns the names other modules import.
// The page body has no <html>/<head>/<body>: the Artifact tool adds that skeleton when it publishes.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
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
const sprites=[...new Set(js.match(/assets\/[\w.-]+\.png/g)??[])];
// The Artifact limit is 16MB for the whole page and base64 adds a third, so if the sprites are too big the largest are re-saved as
// 256-colour PNGs (tools/shrink_sprites.py; public/assets is never modified). If Python/Pillow is missing the originals are embedded.
const SPRITE_BUDGET=11e6,shrinkDir='dist-artifact/sprites';let shrunk=new Set();
await mkdir('dist-artifact',{recursive:true});
try{shrunk=new Set(JSON.parse(execFileSync('python3',['tools/shrink_sprites.py','--out',shrinkDir,'--budget',String(SPRITE_BUDGET),...sprites.map(p=>`public/${p}`)],{encoding:'utf8'})));}
catch(e){console.warn(`Could not shrink sprites (${e.message.split('\n')[0]}); embedding the originals.`);}
for(const path of sprites){
 const file=shrunk.has(path.split('/').pop())?`${shrinkDir}/${path.split('/').pop()}`:`public/${path}`;
 const uri=`data:image/png;base64,${(await readFile(file)).toString('base64')}`;
 js=js.replaceAll(`'${path}'`,`'${uri}'`).replaceAll(`"${path}"`,`"${uri}"`);
}
if(/assets\/[\w.-]+\.png/.test(js))throw Error('A sprite path was not embedded');
js=js.replaceAll('</script','<\\/script');

const html=await readFile('public/index.html','utf8'),css=await readFile('public/style.css','utf8');
const title=html.match(/<title>([^<—]*)/)?.[1].trim()||'Kaiju Arcade';
const body=html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[^>]*src=[^>]*><\/script>/g,'').trim();
if(css.includes('</style'))throw Error('style.css cannot contain </style');
// Errors only: a red bar with the message, so a blank page in the viewer still says what went wrong.
const errorBar=`<div id="boot-error" hidden style="position:fixed;left:0;right:0;bottom:0;z-index:99;font:12px monospace;color:#ff8a8a;background:#000d;padding:6px 10px;white-space:pre-wrap"></div>
<script>window.addEventListener('error',function(e){var b=document.getElementById('boot-error');if(b){b.hidden=false;b.textContent+=(b.textContent?'\\n':'')+'ERROR: '+e.message+(e.lineno?' (line '+e.lineno+')':'');}});</script>`;
const page=`<title>${title}</title>\n<style>\n${css}\n</style>\n${errorBar}\n${body}\n<script>\n${js}\n</script>\n`;

await mkdir('dist-artifact',{recursive:true});
await writeFile('dist-artifact/index.html',page);
console.log(`Built dist-artifact/index.html (${order.length} modules, ${sprites.length} sprites${shrunk.size?`, ${shrunk.size} shrunk to 256 colours`:''}, ${(page.length/1e6).toFixed(2)} MB)`);
if(page.length>16e6)throw Error('Page is over the 16MB Artifact limit');
