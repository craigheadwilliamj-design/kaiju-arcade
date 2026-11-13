// Browser benchmark: node tools/perf.mjs [--scale 2] [--throttle 4]   (run `npm run build` first)
// Serves dist/ (or PERF_DIR), plays a drill in headless Chromium and reports what was fetched and how frames behaved around street dives.
// Headless Chromium rasterises in software, so compare runs against each other; these are not real-device frame rates.
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {extname,join,normalize} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const arg=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i>0?Number(process.argv[i+1]):fallback;};
const scale=arg('scale',1),throttle=arg('throttle',1),dives=arg('dives',4);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const path=normalize(decodeURIComponent(new URL(req.url,'http://x').pathname)).replace(/^(\.\.[/\\])+/,'');
 const file=/[/\\]$/.test(path)?path+'index.html':path,body=await readFile(join(process.env.PERF_DIR||'dist',file));res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:scale});
const fetched=[],errors=[];page.on('response',async r=>{if(r.url().endsWith('.png')&&r.ok())fetched.push((await r.body().catch(()=>Buffer.alloc(0))).length);});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_|Failed to load resource/.test(m.text()))errors.push(m.text());});
if(throttle>1){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});}
const art=()=>({files:fetched.length,mb:+(fetched.reduce((a,b)=>a+b,0)/1e6).toFixed(2)});
await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForLoadState('networkidle');const boot=art();
await page.click('#drills');await page.click('#start');await page.waitForLoadState('networkidle');await page.waitForTimeout(500);const play=art();
const heap=async()=>+(await page.evaluate(()=>performance.memory?.usedJSHeapSize??0)/1e6).toFixed(1);
// Record every frame's length and whether the game was frozen by hitstop during it.
await page.evaluate(()=>{window.__f=[];let last=performance.now();const tick=now=>{window.__f.push([now-last,window.kaijuDebug.hitstop>0?1:0,window.kaijuDebug.entityCounts.particles+window.kaijuDebug.chunks]);last=now;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
const key=page.keyboard,hold=async(k,ms)=>{await key.down(k);await page.waitForTimeout(ms);await key.up(k);};
await page.focus('#game');
for(let d=0;d<dives;d++){await hold('KeyD',900);await page.waitForTimeout(250);await key.press('Space');await page.waitForTimeout(260);await key.press('KeyS');await page.waitForTimeout(1600);}
const frames=await page.evaluate(()=>window.__f.slice(5)),times=frames.map(f=>f[0]).sort((a,b)=>a-b),q=p=>+times[Math.min(times.length-1,Math.floor(times.length*p))].toFixed(1);
let freezes=0;frames.forEach((f,i)=>{if(f[1]&&!(frames[i-1]?.[1]))freezes++;});
console.log(JSON.stringify({scale,throttle,canvas:await page.evaluate(()=>{const c=document.querySelector('#game');return c.width+'x'+c.height;}),
 spritesAtBoot:boot,spritesInPlay:play,heapMB:await heap(),frames:frames.length,frameMs:{p50:q(.5),p95:q(.95),p99:q(.99),max:q(1)},over20ms:times.filter(t=>t>20).length,
 dives,freezes,frozenMs:Math.round(frames.filter(f=>f[1]).reduce((a,f)=>a+f[0],0)),peakDebris:Math.max(...frames.map(f=>f[2])),errors},null,1));
await page.screenshot({path:process.env.PERF_SHOT||'dist/perf.png'});
await browser.close();server.close();
