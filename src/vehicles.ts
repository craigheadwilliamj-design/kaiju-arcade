import {groundAt,streetAt,waterAt} from './terrain.ts';
import {CONFIG as C,VEHICLES as V,UNIT_CONFIG as U,BUILDING_PRESETS as BP,FEEL as F,BULL,PARADE,CONEY,NYC2,FLAG,STONE,XOCHI} from './config.ts';

// Civilian vehicles: parked cars, passing traffic, and anything the kaiju punts, carries or throws.
// Positions are world space with y as the top edge (resting on the street means y = ground - h). Lanes only change
// where a grounded vehicle is drawn (lane 0 behind the kaiju's feet, lane 1 in front); gameplay collision is x/y only.
// Civilian traffic kinds, plus props the kaiju can lift: captured military vehicles and small structures.
export type VehicleKind='car'|'van'|'bus'|'patrol'|'apc'|'tank'|'artillery'|'stand'|'barrier'|'lamp'|'building'|'train'|'boat'|'tram'|'cablecar'|'firetruck'|'gunboat'|'destroyer'|'bull'|'ball'|'carriage'|'tether'|'wheel'|'coaster'|'pole'|'stone'|'trajinera';
export type VehicleState='parked'|'driving'|'held'|'flying'|'wreck'|'flat'|'rolling'|'cable';
export type Vehicle={id:number,kind:VehicleKind,x:number,y:number,w:number,h:number,vx:number,vy:number,angle:number,spin:number,
 state:VehicleState,color:string,lane:0|1,dir:number,speed:number,cruise:number,panic:0|1|2,rewarded:boolean,traffic:boolean,
 damage:number,hits:Set<object>,label:string,mass?:number,burn?:number,thrown?:boolean,shield?:number,calm?:number,pole?:number,snapped?:boolean,line?:[number,number],plows?:number,glide?:number,runaway?:boolean,tossed?:boolean,hp?:number,freed?:boolean,chunk?:{shape:string,H:number,cut:number},blaze?:number,expo?:number,moored?:boolean,riders?:number,variant?:'plain'|'food'|'mariachi',float?:number,charred?:boolean};
// blaze: seconds a BURNS kind has left alight (src/config.ts XOCHI.burn; it stays alight while it drifts, flies or is carried); expo: exposure towards catching (1 = alight); moored: tied up at the dock until disturbed;
// riders: the crowd aboard; variant: art only (a food boat, a mariachi boat); float: seconds a wreck or debris floats on a current before it sinks; charred: burnt out.
// hp, freed: the Charging Bull's hit points, and whether a kaiju has pried it off its plinth (then slams and pounds hurt it).
// chunk: a sheared-off top of a shaped landmark: the shape it was cut from, that shape's full height and how far up it was cut.
// pole: a power pole (lamp-kind prop) on that grid index; snapped once it has been knocked out of upright.
export const VEHICLE_SPECS={
 // Sized to sit with the military's road vehicles (patrol car 48x23, APC 52x26, tank 59x31).
 car:{w:48,h:23,mass:1,points:80},
 van:{w:62,h:29,mass:1.6,points:120},
 bus:{w:94,h:35,mass:2.6,points:200},
 // San Francisco Act 1: an F-line streetcar, a cable car and a fire truck. Grabbable and throwable on the bus's rules.
 tram:{w:128,h:38,mass:3.2,points:260},
 cablecar:{w:78,h:36,mass:2.2,points:220},
 firetruck:{w:88,h:37,mass:3,points:240},
 // Props pay out when lifted (kill points / building value), so points here are 0.
 patrol:{w:U.patrol.w,h:U.patrol.h,mass:U.patrol.mass,points:0},
 apc:{w:U.apc.w,h:U.apc.h,mass:U.apc.mass,points:0},
 tank:{w:U.tank.w,h:U.tank.h,mass:U.tank.mass,points:0},
 artillery:{w:U.artillery.w,h:U.artillery.h,mass:U.artillery.mass,points:0},
 boat:{w:U.boat.w,h:U.boat.h,mass:U.boat.mass,points:0},
 gunboat:{w:U.gunboat.w,h:U.gunboat.h,mass:U.gunboat.mass,points:0},
 destroyer:{w:U.destroyer.w,h:U.destroyer.h,mass:U.destroyer.mass,points:0},
 // Lifted newsstands and barriers keep the size of the (city-scaled) structure they were.
 stand:{w:Math.round(BP.t.w*C.cityScale),h:Math.round(BP.t.h*C.cityScale),mass:1.4,points:0},
 barrier:{w:Math.round(BP.b.w*C.cityScale),h:Math.round(BP.b.h*C.cityScale),mass:3,points:0},
 // Standing lamppost (8x88); once uprooted it is laid flat (88x8) and flies point-first.
 lamp:{w:8,h:88,mass:.8,points:15},
 // A whole small building lifted by Stage 3: size and mass are set per prop (liftedBuilding), these are placeholders.
 building:{w:80,h:100,mass:4,points:0},
 // A whole subway train pulled out of a pit by Stage 3 (three carriages, the length of RIVER.trainLength). Paid when snatched.
 train:{w:Math.round(240*C.cityScale),h:37,mass:6,points:0},
 // New York Act 1: the Charging Bull, a bronze prop (src/config.ts BULL). Not a loose object: see loose().
 bull:{w:BULL.w,h:BULL.h,mass:BULL.mass,points:BULL.points},
 // New York Act 2: One Times Square's ball (a heavy rolling sphere) and a Central Park carriage (a horse-drawn cab that bolts). `glide` is how fast a rolling one sheds speed (src/rolling.ts).
 ball:{w:NYC2.ballSize,h:NYC2.ballSize,mass:NYC2.ballMass,points:0},
 carriage:{w:NYC2.carriageW,h:NYC2.carriageH,mass:NYC2.carriageMass,points:NYC2.carriagePoints},
 // New York Act 3: a parade balloon's tether (the rope's end the handler crew hold). Grabbable, and not a loose street object: see loose().
 tether:{w:PARADE.tether.w,h:PARADE.tether.h,mass:PARADE.tether.mass,points:0},
 // New York secret level (Coney Island): the Ferris wheel (a huge round body) and the roller coaster's train. See src/config.ts CONEY.
 wheel:{w:CONEY.wheel.d,h:CONEY.wheel.d,mass:CONEY.wheel.mass,points:CONEY.wheel.points},
 coaster:{w:CONEY.coaster.trainW,h:CONEY.coaster.trainH,mass:CONEY.coaster.mass,points:CONEY.coaster.points},
 // Mexico City Act 1: the Zócalo's flagpole (src/config.ts FLAG). Stands upright (thick x len) on its plinth; once lifted it is laid flat like a lamppost. Not loose: see loose().
 pole:{w:FLAG.thick,h:FLAG.len,mass:FLAG.mass,points:0},
 // Mexico City Act 2: Chapultepec's Sun Stone (src/config.ts STONE), a heavy round disc only a Stage 3 kaiju lifts. Not loose: see loose().
 stone:{w:STONE.d,h:STONE.d,mass:STONE.mass,points:0},
 // Mexico City secret level: a trajinera (src/config.ts XOCHI.boat), a flat painted boat. Floats, drifts with a canal's current, carries a crowd, grabbed, thrown and smashed like a bus; it is the only kind that burns on (BURNS).
 trajinera:{w:XOCHI.boat.w,h:XOCHI.boat.h,mass:XOCHI.boat.mass,points:XOCHI.boat.points},
} as const;
// Impact damage weight; defaults to mass. Lampposts hit harder than their weight because they spear.
// Road vehicles: what explodes when thrown and wrecks with a bang.
export const EXPLOSIVE=new Set<VehicleKind>(['car','van','bus','patrol','apc','tank','artillery','train','boat','gunboat','destroyer','tram','cablecar','firetruck','coaster']);
export const CIVILIAN=new Set<VehicleKind>(['car','van','bus','tram','cablecar','firetruck','carriage']);
// The kinds that can stay alight (opt-in: a wreck's `burn` is a visual countdown, this is a real, lasting state; see tickXochi in src/game.ts).
export const BURNS=new Set<VehicleKind>(['trajinera']);
const IMPACT:Partial<Record<VehicleKind,number>>={lamp:1.6};
export function impact(v:Vehicle){return IMPACT[v.kind]??mass(v);}
let COLORS=['#b16d5b','#70958e','#a09b65','#7d84a6','#c1a06a'],TAXI='';
// Each city's car colours and taxi livery (phase 4). Taxis are cars painted in the livery with a roof sign (label 'TAXI').
export function setVehicleLook(colors:string[],taxi:string){COLORS=colors.length?colors:COLORS;TAXI=taxi;}
function taxi(v:Vehicle){if(TAXI&&v.kind==='car'){v.color=TAXI;v.label='TAXI';}return v;}

export function vehicleBox(v:Vehicle){return {x:v.x,y:v.y,w:v.w,h:v.h};}
export function mass(v:Vehicle){return v.mass??VEHICLE_SPECS[v.kind].mass;}
export function grounded(v:Vehicle){return v.state==='parked'||v.state==='driving'||v.state==='wreck'||v.state==='flat'||v.state==='rolling'||v.state==='cable';}
// Can be stomped, punted or picked up.
// The Charging Bull, the Zócalo's flagpole, a balloon's tether, the Ferris wheel and Times Square's ball are never loose, and neither is a coaster train on its track: nothing on the street stomps, punts or wrecks it; only a kaiju strong enough carries it (tryGrab).
export function loose(v:Vehicle){return v.kind!=='bull'&&v.kind!=='pole'&&v.kind!=='stone'&&v.kind!=='ball'&&v.kind!=='tether'&&v.kind!=='wheel'&&!(v.kind==='coaster'&&v.state==='cable')&&(v.state==='parked'||v.state==='driving'||v.state==='wreck'||v.state==='rolling'||v.state==='cable');}

function make(id:number,kind:VehicleKind,x:number,lane:0|1,color:string):Vehicle{
 const s=VEHICLE_SPECS[kind];
 return {id,kind,x,y:groundAt(x+s.w/2)-s.h,w:s.w,h:s.h,vx:0,vy:0,angle:0,spin:0,state:'parked',color,lane,dir:1,speed:0,cruise:0,panic:0,rewarded:false,traffic:false,damage:0,hits:new Set(),label:''};
}
// A lifted prop starts in the kaiju's grip; its reward was already paid when it was lifted.
export function makeProp(id:number,kind:VehicleKind,x:number,color:string,label=''):Vehicle{const v=make(id,kind,x,1,color);v.state='held';v.rewarded=true;v.label=label;return v;}
// A lifted building keeps its footprint; heavier the bigger it is.
export function liftedBuilding(id:number,b:{x:number,w:number,h:number,color:string,label:string}):Vehicle{
 const v=makeProp(id,'building',b.x,b.color,b.label);v.w=b.w;v.h=b.h;v.y=groundAt(b.x+b.w/2)-b.h;
 const [lo,hi]=F.liftMassRange;v.mass=Math.max(lo,Math.min(hi,b.w*b.h/F.liftMassArea));return v;}
// The authored spots keep ids 1..n and their kinds; each then grows a row of up to V.parkedRow more vehicles eastward,
// stopping short of the next authored spot so rows never run into each other.
export function createParked(xs:number[]):Vehicle[]{
 const out=xs.map((x,i)=>{const v=make(i+1,i%4===3?'van':'car',x,0,COLORS[i%COLORS.length]);return i%3===0?taxi(v):v;});let id=xs.length+1;
 xs.forEach((x,i)=>{let end=x+VEHICLE_SPECS[out[i].kind].w;const limit=Math.min(...xs.filter(o=>o>x),Infinity)-V.parkedGap;
  for(let k=1;k<=V.parkedRow;k++){const r=(i*3+k)%7,kind:VehicleKind=r===0?'bus':r===3||r===5?'van':'car',start=end+V.parkedGap;
   if(start+VEHICLE_SPECS[kind].w>limit)break;const v=make(id++,kind,start,(k%2) as 0|1,COLORS[(i+k*2)%COLORS.length]);out.push(v);end=v.x+v.w;}});
 // Nothing is left parked out on a pier or in the water.
 return out.filter(v=>!onWater(v.x)&&!onWater(v.x+v.w));}
// Street lamps keep the old backdrop spacing (every lampSpacing px from the west edge), now as real props.
export function createLamps(worldWidth:number,firstId:number):Vehicle[]{const out:Vehicle[]=[];for(let x=V.lampSpacing,i=0;x<worldWidth-40;x+=V.lampSpacing,i++)out.push(make(firstId+i,'lamp',x-2,0,'#44575a'));return out;}
// Power poles: taller lamp-kind props on a grid, strung with wires between neighbours.
export function createPoles(xs:number[],grids:number[],height:number,firstId:number):Vehicle[]{return xs.map((x,i)=>{const v=make(firstId+i,'lamp',x-4,0,'#5b4a3a');v.w=8;v.h=height;v.y=groundAt(x)-height;v.pole=grids[i];return v;});}
export function upright(v:Vehicle){return (v.kind==='lamp'||v.kind==='pole')&&v.w<v.h;}
// Pull a lamppost out of the sidewalk: lay it flat about its centre so it can be carried and thrown lengthwise.
export function uproot(v:Vehicle){if(!upright(v))return;const cx=v.x+v.w/2,cy=v.y+v.h/2;[v.w,v.h]=[v.h,v.w];v.x=cx-v.w/2;v.y=Math.min(groundAt(v.x+v.w/2)-v.h,cy-v.h/2);}

// Eastbound traffic uses lane 0 and enters from the left of the view; westbound uses lane 1 from the right.
export function spawnTraffic(id:number,camera:number,dir:1|-1,rng:()=>number,viewW=C.width):Vehicle{
 const roll=rng(),kind:VehicleKind=roll<V.busChance?'bus':roll<V.busChance+V.vanChance?'van':'car',s=VEHICLE_SPECS[kind];
 const v=make(id,kind,dir>0?camera-s.w-V.spawnMargin:camera+viewW+V.spawnMargin,dir>0?0:1,COLORS[Math.floor(rng()*COLORS.length)%COLORS.length]);
 if(rng()<.4)taxi(v);v.state='driving';v.traffic=true;v.dir=dir;v.cruise=V.trafficSpeed[0]+rng()*(V.trafficSpeed[1]-V.trafficSpeed[0]);v.speed=v.cruise;return v;
}

// Drivers cruise until the kaiju is ahead, brake hard, then U-turn and flee faster.
// Traffic keeps to the road: nothing drives out over water, which takes in the piers and docks standing in it.
export function onWater(x:number){return waterAt(x)!==null;}
export function tickDriving(v:Vehicle,dt:number,kaijuX:number){
 if(v.state!=='driving')return;
 // At the water's edge the driver turns round (a car already over water heads for the nearest shore).
 const mid=v.x+v.w/2;
 if(onWater(mid)){let d=0;for(let k=20;k<4000;k+=20)if(!onWater(mid-k)){d=-1;break;}else if(!onWater(mid+k)){d=1;break;}if(d)v.dir=d;}
 else if(onWater(mid+v.dir*(v.w/2+36))){v.dir=-v.dir;v.speed=Math.min(v.speed,v.cruise*.6);}
 const ahead=(kaijuX-(v.x+v.w/2))*v.dir;
 if(v.panic===0&&ahead>0&&ahead<V.panicRange)v.panic=1;
 if(v.panic===1){v.speed=Math.max(0,v.speed-V.panicDecel*dt);if(v.speed===0){v.dir=-v.dir;v.panic=2;}}
 else if(v.panic===2)v.speed=Math.min(v.cruise*V.panicSpeed,v.speed+V.panicDecel*.6*dt);
 v.x+=v.dir*v.speed*dt;v.y=streetAt(v.x+v.w/2)-v.h;
}

export function launch(v:Vehicle,vx:number,vy:number,damage:number){
 v.state='flying';v.vx=vx;v.vy=vy;v.spin=(Math.sign(vx)||1)*(5+Math.abs(vx)/60);v.damage=damage;v.hits=new Set();v.speed=0;v.panic=0;
}

// Ballistic flight with bounces off the street and the world edges; comes to rest as a wreck. Returns true on settling.
export function tickFlying(v:Vehicle,dt:number,worldWidth:number){
 if(v.state!=='flying')return false;
 v.vy+=V.gravity*dt;v.x+=v.vx*dt;v.y+=v.vy*dt;if((v.kind==='lamp'||v.kind==='pole')&&v.damage>1)v.angle=Math.atan2(v.vy,v.vx);else v.angle+=v.spin*dt;
 if(v.x<0||v.x+v.w>worldWidth){v.x=Math.max(0,Math.min(worldWidth-v.w,v.x));v.vx=-v.vx*V.restitution;}
 const floor=groundAt(v.x+v.w/2)-v.h;
 if(v.y>=floor){v.y=floor;
  if(v.vy>V.bounceMin){v.vy=-v.vy*V.restitution;v.vx*=V.friction;v.spin*=V.friction;v.damage*=.5;}
  else{v.vy=0;v.vx=0;v.spin=0;v.damage=0;v.state='wreck';
   // Settle on its wheels or its roof, whichever it was closer to.
   const a=((v.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);v.angle=a>Math.PI/2&&a<Math.PI*1.5?Math.PI:0;return true;}}
 return false;
}

// Authored vehicles stationed at x positions (streetcars, cable cars, fire trucks, trolleybuses, cars on a garage floor). `firstId` must
// not collide with the parked cars (1..), lamps (500..) or poles (800..): levels use 2000 and up.
export function createFleet(kind:VehicleKind,xs:number[],firstId:number,color:string,label=''):Vehicle[]{
 return xs.map((x,i)=>{const v=make(firstId+i,kind,x,0,color);v.label=label;if(kind==='bull')v.hp=BULL.hp;return v;});}
// Parked cars standing on whatever floor is under them (a garage pit): a mix of cars and vans in the city's colours.
export function createGarageCars(x0:number,x1:number,n:number,firstId:number):Vehicle[]{
 const out:Vehicle[]=[],step=(x1-x0)/n;for(let i=0;i<n;i++){const kind:VehicleKind=i%4===3?'van':'car',w=VEHICLE_SPECS[kind].w,x=Math.round(x0+i*step+Math.max(4,(step-w)/2));
  if(x+w>x1)break;out.push(make(firstId+i,kind,x,(i%2) as 0|1,COLORS[i%COLORS.length]));}
 return out;}
