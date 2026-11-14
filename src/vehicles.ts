import {CONFIG as C,VEHICLES as V,UNIT_CONFIG as U,BUILDING_PRESETS as BP,FEEL as F} from './config.ts';

// Civilian vehicles: parked cars, passing traffic, and anything the kaiju punts, carries or throws.
// Positions are world space with y as the top edge (resting on the street means y = ground - h). Lanes only change
// where a grounded vehicle is drawn (lane 0 behind the kaiju's feet, lane 1 in front); gameplay collision is x/y only.
// Civilian traffic kinds, plus props the kaiju can lift: captured military vehicles and small structures.
export type VehicleKind='car'|'van'|'bus'|'patrol'|'apc'|'tank'|'artillery'|'stand'|'barrier'|'lamp'|'building';
export type VehicleState='parked'|'driving'|'held'|'flying'|'wreck'|'flat';
export type Vehicle={id:number,kind:VehicleKind,x:number,y:number,w:number,h:number,vx:number,vy:number,angle:number,spin:number,
 state:VehicleState,color:string,lane:0|1,dir:number,speed:number,cruise:number,panic:0|1|2,rewarded:boolean,traffic:boolean,
 damage:number,hits:Set<object>,label:string,mass?:number,burn?:number,thrown?:boolean};
export const VEHICLE_SPECS={
 // Sized to sit with the military's road vehicles (patrol car 48x23, APC 52x26, tank 59x31).
 car:{w:48,h:23,mass:1,points:80},
 van:{w:62,h:29,mass:1.6,points:120},
 bus:{w:94,h:35,mass:2.6,points:200},
 // Props pay out when lifted (kill points / building value), so points here are 0.
 patrol:{w:U.patrol.w,h:U.patrol.h,mass:U.patrol.mass,points:0},
 apc:{w:U.apc.w,h:U.apc.h,mass:U.apc.mass,points:0},
 tank:{w:U.tank.w,h:U.tank.h,mass:U.tank.mass,points:0},
 artillery:{w:U.artillery.w,h:U.artillery.h,mass:U.artillery.mass,points:0},
 // Lifted newsstands and barriers keep the size of the (city-scaled) structure they were.
 stand:{w:Math.round(BP.t.w*C.cityScale),h:Math.round(BP.t.h*C.cityScale),mass:1.4,points:0},
 barrier:{w:Math.round(BP.b.w*C.cityScale),h:Math.round(BP.b.h*C.cityScale),mass:3,points:0},
 // Standing lamppost (8x88); once uprooted it is laid flat (88x8) and flies point-first.
 lamp:{w:8,h:88,mass:.8,points:15},
 // A whole small building lifted by Stage 3: size and mass are set per prop (liftedBuilding), these are placeholders.
 building:{w:80,h:100,mass:4,points:0},
} as const;
// Impact damage weight; defaults to mass. Lampposts hit harder than their weight because they spear.
// Road vehicles: what explodes when thrown and wrecks with a bang.
export const EXPLOSIVE=new Set<VehicleKind>(['car','van','bus','patrol','apc','tank','artillery']);
export const CIVILIAN=new Set<VehicleKind>(['car','van','bus']);
const IMPACT:Partial<Record<VehicleKind,number>>={lamp:1.6};
export function impact(v:Vehicle){return IMPACT[v.kind]??mass(v);}
const COLORS=['#b16d5b','#70958e','#a09b65','#7d84a6','#c1a06a'];

export function vehicleBox(v:Vehicle){return {x:v.x,y:v.y,w:v.w,h:v.h};}
export function mass(v:Vehicle){return v.mass??VEHICLE_SPECS[v.kind].mass;}
export function grounded(v:Vehicle){return v.state==='parked'||v.state==='driving'||v.state==='wreck'||v.state==='flat';}
// Can be stomped, punted or picked up.
export function loose(v:Vehicle){return v.state==='parked'||v.state==='driving'||v.state==='wreck';}

function make(id:number,kind:VehicleKind,x:number,lane:0|1,color:string):Vehicle{
 const s=VEHICLE_SPECS[kind];
 return {id,kind,x,y:C.ground-s.h,w:s.w,h:s.h,vx:0,vy:0,angle:0,spin:0,state:'parked',color,lane,dir:1,speed:0,cruise:0,panic:0,rewarded:false,traffic:false,damage:0,hits:new Set(),label:''};
}
// A lifted prop starts in the kaiju's grip; its reward was already paid when it was lifted.
export function makeProp(id:number,kind:VehicleKind,x:number,color:string,label=''):Vehicle{const v=make(id,kind,x,1,color);v.state='held';v.rewarded=true;v.label=label;return v;}
// A lifted building keeps its footprint; heavier the bigger it is.
export function liftedBuilding(id:number,b:{x:number,w:number,h:number,color:string,label:string}):Vehicle{
 const v=makeProp(id,'building',b.x,b.color,b.label);v.w=b.w;v.h=b.h;v.y=C.ground-b.h;
 const [lo,hi]=F.liftMassRange;v.mass=Math.max(lo,Math.min(hi,b.w*b.h/F.liftMassArea));return v;}
// The authored spots keep ids 1..n and their kinds; each then grows a row of up to V.parkedRow more vehicles eastward,
// stopping short of the next authored spot so rows never run into each other.
export function createParked(xs:number[]):Vehicle[]{
 const out=xs.map((x,i)=>make(i+1,i%4===3?'van':'car',x,0,COLORS[i%COLORS.length]));let id=xs.length+1;
 xs.forEach((x,i)=>{let end=x+VEHICLE_SPECS[out[i].kind].w;const limit=Math.min(...xs.filter(o=>o>x),Infinity)-V.parkedGap;
  for(let k=1;k<=V.parkedRow;k++){const r=(i*3+k)%7,kind:VehicleKind=r===0?'bus':r===3||r===5?'van':'car',start=end+V.parkedGap;
   if(start+VEHICLE_SPECS[kind].w>limit)break;const v=make(id++,kind,start,(k%2) as 0|1,COLORS[(i+k*2)%COLORS.length]);out.push(v);end=v.x+v.w;}});
 return out;}
// Street lamps keep the old backdrop spacing (every lampSpacing px from the west edge), now as real props.
export function createLamps(worldWidth:number,firstId:number):Vehicle[]{const out:Vehicle[]=[];for(let x=V.lampSpacing,i=0;x<worldWidth-40;x+=V.lampSpacing,i++)out.push(make(firstId+i,'lamp',x-2,0,'#44575a'));return out;}
export function upright(v:Vehicle){return v.kind==='lamp'&&v.w<v.h;}
// Pull a lamppost out of the sidewalk: lay it flat about its centre so it can be carried and thrown lengthwise.
export function uproot(v:Vehicle){if(!upright(v))return;const cx=v.x+v.w/2,cy=v.y+v.h/2;[v.w,v.h]=[v.h,v.w];v.x=cx-v.w/2;v.y=Math.min(C.ground-v.h,cy-v.h/2);}

// Eastbound traffic uses lane 0 and enters from the left of the view; westbound uses lane 1 from the right.
export function spawnTraffic(id:number,camera:number,dir:1|-1,rng:()=>number,viewW=C.width):Vehicle{
 const roll=rng(),kind:VehicleKind=roll<V.busChance?'bus':roll<V.busChance+V.vanChance?'van':'car',s=VEHICLE_SPECS[kind];
 const v=make(id,kind,dir>0?camera-s.w-V.spawnMargin:camera+viewW+V.spawnMargin,dir>0?0:1,COLORS[Math.floor(rng()*COLORS.length)%COLORS.length]);
 v.state='driving';v.traffic=true;v.dir=dir;v.cruise=V.trafficSpeed[0]+rng()*(V.trafficSpeed[1]-V.trafficSpeed[0]);v.speed=v.cruise;return v;
}

// Drivers cruise until the kaiju is ahead, brake hard, then U-turn and flee faster.
export function tickDriving(v:Vehicle,dt:number,kaijuX:number){
 if(v.state!=='driving')return;
 const ahead=(kaijuX-(v.x+v.w/2))*v.dir;
 if(v.panic===0&&ahead>0&&ahead<V.panicRange)v.panic=1;
 if(v.panic===1){v.speed=Math.max(0,v.speed-V.panicDecel*dt);if(v.speed===0){v.dir=-v.dir;v.panic=2;}}
 else if(v.panic===2)v.speed=Math.min(v.cruise*V.panicSpeed,v.speed+V.panicDecel*.6*dt);
 v.x+=v.dir*v.speed*dt;
}

export function launch(v:Vehicle,vx:number,vy:number,damage:number){
 v.state='flying';v.vx=vx;v.vy=vy;v.spin=(Math.sign(vx)||1)*(5+Math.abs(vx)/60);v.damage=damage;v.hits=new Set();v.speed=0;v.panic=0;
}

// Ballistic flight with bounces off the street and the world edges; comes to rest as a wreck. Returns true on settling.
export function tickFlying(v:Vehicle,dt:number,worldWidth:number){
 if(v.state!=='flying')return false;
 v.vy+=V.gravity*dt;v.x+=v.vx*dt;v.y+=v.vy*dt;if(v.kind==='lamp'&&v.damage>1)v.angle=Math.atan2(v.vy,v.vx);else v.angle+=v.spin*dt;
 if(v.x<0||v.x+v.w>worldWidth){v.x=Math.max(0,Math.min(worldWidth-v.w,v.x));v.vx=-v.vx*V.restitution;}
 const floor=C.ground-v.h;
 if(v.y>=floor){v.y=floor;
  if(v.vy>V.bounceMin){v.vy=-v.vy*V.restitution;v.vx*=V.friction;v.spin*=V.friction;v.damage*=.5;}
  else{v.vy=0;v.vx=0;v.spin=0;v.damage=0;v.state='wreck';
   // Settle on its wheels or its roof, whichever it was closer to.
   const a=((v.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);v.angle=a>Math.PI/2&&a<Math.PI*1.5?Math.PI:0;return true;}}
 return false;
}
