import {CONFIG as C,VEHICLES as V} from './config.ts';

// Civilian vehicles: parked cars, passing traffic, and anything the kaiju punts, carries or throws.
// Positions are world space with y as the top edge (resting on the street means y = ground - h). Lanes only change
// where a grounded vehicle is drawn (lane 0 behind the kaiju's feet, lane 1 in front); gameplay collision is x/y only.
export type VehicleKind='car'|'van'|'bus';
export type VehicleState='parked'|'driving'|'held'|'flying'|'wreck'|'flat';
export type Vehicle={id:number,kind:VehicleKind,x:number,y:number,w:number,h:number,vx:number,vy:number,angle:number,spin:number,
 state:VehicleState,color:string,lane:0|1,dir:number,speed:number,cruise:number,panic:0|1|2,rewarded:boolean,traffic:boolean,
 damage:number,hits:Set<object>};
export const VEHICLE_SPECS={
 car:{w:33,h:16,mass:1,points:80},
 van:{w:44,h:21,mass:1.6,points:120},
 bus:{w:66,h:25,mass:2.6,points:200},
} as const;
const COLORS=['#b16d5b','#70958e','#a09b65','#7d84a6','#c1a06a'];

export function vehicleBox(v:Vehicle){return {x:v.x,y:v.y,w:v.w,h:v.h};}
export function mass(v:Vehicle){return VEHICLE_SPECS[v.kind].mass;}
export function grounded(v:Vehicle){return v.state==='parked'||v.state==='driving'||v.state==='wreck'||v.state==='flat';}
// Can be stomped, punted or picked up.
export function loose(v:Vehicle){return v.state==='parked'||v.state==='driving'||v.state==='wreck';}

function make(id:number,kind:VehicleKind,x:number,lane:0|1,color:string):Vehicle{
 const s=VEHICLE_SPECS[kind];
 return {id,kind,x,y:C.ground-s.h,w:s.w,h:s.h,vx:0,vy:0,angle:0,spin:0,state:'parked',color,lane,dir:1,speed:0,cruise:0,panic:0,rewarded:false,traffic:false,damage:0,hits:new Set()};
}
export function createParked(xs:number[]):Vehicle[]{return xs.map((x,i)=>make(i+1,i%4===3?'van':'car',x,0,COLORS[i%COLORS.length]));}

// Eastbound traffic uses lane 0 and enters from the left of the view; westbound uses lane 1 from the right.
export function spawnTraffic(id:number,camera:number,dir:1|-1,rng:()=>number):Vehicle{
 const roll=rng(),kind:VehicleKind=roll<V.busChance?'bus':roll<V.busChance+V.vanChance?'van':'car',s=VEHICLE_SPECS[kind];
 const v=make(id,kind,dir>0?camera-s.w-V.spawnMargin:camera+C.width+V.spawnMargin,dir>0?0:1,COLORS[Math.floor(rng()*COLORS.length)%COLORS.length]);
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
 v.vy+=V.gravity*dt;v.x+=v.vx*dt;v.y+=v.vy*dt;v.angle+=v.spin*dt;
 if(v.x<0||v.x+v.w>worldWidth){v.x=Math.max(0,Math.min(worldWidth-v.w,v.x));v.vx=-v.vx*V.restitution;}
 const floor=C.ground-v.h;
 if(v.y>=floor){v.y=floor;
  if(v.vy>V.bounceMin){v.vy=-v.vy*V.restitution;v.vx*=V.friction;v.spin*=V.friction;v.damage*=.5;}
  else{v.vy=0;v.vx=0;v.spin=0;v.damage=0;v.state='wreck';
   // Settle on its wheels or its roof, whichever it was closer to.
   const a=((v.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);v.angle=a>Math.PI/2&&a<Math.PI*1.5?Math.PI:0;return true;}}
 return false;
}
