// Node simulation harness: real game module/input/update, no browser or gameplay mutations.
export async function bootGame(seed=.75,saved=new Map<string,string>()){
 const callbacks=new Map<string,Function>(),events=new Map<string,Function>(),nodes=new Map<string,any>();let raf:Function=()=>{},now=performance.now(),frames=0;
 const ctx=new Proxy({},{get:()=>()=>{}});
 const node=(selector:string)=>{if(!nodes.has(selector))nodes.set(selector,{style:{},value:'',innerHTML:'',focus:()=>{},getContext:()=>ctx,addEventListener:(e:string,f:Function)=>callbacks.set(selector+':'+e,f)});return nodes.get(selector);};
 const priorRandom=Math.random;Math.random=()=>seed;
 const win:any={innerWidth:1280,localStorage:{getItem:(k:string)=>saved.get(k)||null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},addEventListener:(e:string,f:Function)=>events.set(e,f)};
 Object.assign(globalThis,{window:win,document:{querySelector:node,addEventListener:(e:string,f:Function)=>events.set('document:'+e,f)},requestAnimationFrame:(f:Function)=>{raf=f;}});
 await import(`../../dist/game.js?qa=${Date.now()}-${Math.random()}`);
 const held=new Set<string>();
 const emit=(code:string,type:string,repeat=false)=>events.get(type)!({code,repeat,preventDefault:()=>{}});
 const down=(code:string)=>{emit(code,'keydown',held.has(code));held.add(code);};
 const up=(code:string)=>{emit(code,'keyup');held.delete(code);};
 const tap=(code:string)=>{down(code);up(code);};
 const step=(count=1,delta=1000/60)=>{for(let i=0;i<count;i++){now+=delta;raf(now);frames++;}};
 const click=(selector:string)=>{const fn=callbacks.get(selector+':click');if(!fn)throw Error(`Missing control ${selector}`);return fn();};
 return {state:()=>win.kaijuDebug,node,events,callbacks,down,up,tap,step,click,saved,frames:()=>frames,release:()=>{for(const k of [...held])up(k);},cleanup:()=>{Math.random=priorRandom;}};
}
