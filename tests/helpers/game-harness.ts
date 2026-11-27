// Node simulation harness: real game module/input/update, no browser or gameplay mutations.
export async function bootGame(seed=.75,saved=new Map<string,string>()){
 const callbacks=new Map<string,Function>(),events=new Map<string,Function>(),nodes=new Map<string,any>();let raf:Function=()=>{},now=performance.now(),frames=0;
 const ctx=new Proxy({},{get:()=>()=>{}});
 const node=(selector:string)=>{if(!nodes.has(selector))nodes.set(selector,{style:{},value:'',innerHTML:'',focus:()=>{},getContext:()=>ctx,addEventListener:(e:string,f:Function)=>callbacks.set(selector+':'+e,f)});return nodes.get(selector);};
 const priorRandom=Math.random;Math.random=()=>seed;
 const win:any={__kaijuTest:true,innerWidth:1280,localStorage:{getItem:(k:string)=>saved.get(k)||null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},addEventListener:(e:string,f:Function)=>events.set(e,f)};
 Object.assign(globalThis,{window:win,document:{querySelector:node,addEventListener:(e:string,f:Function)=>events.set('document:'+e,f)},requestAnimationFrame:(f:Function)=>{raf=f;}});
 await import(`../../dist/game.js?qa=${Date.now()}-${Math.random()}`);
 const held=new Set<string>();
 const emit=(code:string,type:string,repeat=false)=>events.get(type)!({code,repeat,preventDefault:()=>{}});
 const down=(code:string)=>{emit(code,'keydown',held.has(code));held.add(code);};
 const up=(code:string)=>{emit(code,'keyup');held.delete(code);};
 const tap=(code:string)=>{down(code);up(code);};
 const step=(count=1,delta=1000/60)=>{for(let i=0;i<count;i++){now+=delta;raf(now);frames++;}};
 const click=(selector:string)=>{const fn=callbacks.get(selector+':click');if(!fn)throw Error(`Missing control ${selector}`);return fn();};
 return {state:()=>win.kaijuDebug,test:()=>win.kaijuTest,node,events,callbacks,down,up,tap,step,click,saved,frames:()=>frames,release:()=>{for(const k of [...held])up(k);},cleanup:()=>{Math.random=priorRandom;}};
}
// Boot into a campaign city from a v3 checkpoint (Continue, then Begin City): `city` is a campaign city id, or the fixture city
// 'nyc-classic' (the default: the old five New York blocks, where the original single-kaiju tests play with the run's own kaiju;
// it is entered through kaijuTest.gotoCity from a New York checkpoint). `kaiju` the run's kaiju. The profile has every kaiju unlocked unless one is given.
export async function bootCampaign(seed=.75,o:{city?:string,kaiju?:string,permanent?:any,saved?:Map<string,string>}={}){
 const {CAMPAIGN,CHECKPOINT_KEY,PERMANENT_KEY,emptyPermanent,KAIJU}=await import('../../src/campaign.ts');
 const p=o.permanent??{...emptyPermanent(),unlocked:[...KAIJU]},saved=o.saved??new Map<string,string>();
 const id=o.city??'nyc-classic',fixture=!CAMPAIGN.includes(id),city=CAMPAIGN.indexOf(fixture?'nyc':id);if(city<0)throw Error(`Unknown campaign city ${o.city}`);
 saved.set(PERMANENT_KEY,JSON.stringify(p));saved.set(CHECKPOINT_KEY,JSON.stringify({version:3,id:'harness',initials:'TST',kaiju:o.kaiju??'Mogurodon',city,banked:0}));
 const h=await bootGame(seed,saved);h.click('#continue');h.click('#begin-city');if(fixture)h.test().gotoCity(id,0);return h;
}
