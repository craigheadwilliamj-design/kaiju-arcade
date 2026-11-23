// `landmark`: a named, high-value tower drawn with its own crown and always-visible name banner.
// `cache`: an ordinary-looking building hiding a crystal vein; it glints faintly and pays out when destroyed.
// `role`: a structure with a job in the city (src/city.ts). `roof`: a rooftop fixture on an ordinary building.
export type BuildingSpec={x:number,w:number,h:number,hp:number,value:number,kind:'tiny'|'medium'|'large',label:string,color:string,landmark?:boolean,cache?:boolean,role?:'substation'|'depot'|'armory'|'hydrant',roof?:'radar'|'tank',shape?:string,prop?:string};
// `prop`: street junk (a walk-through breakable: hot dog cart, trash can, taco stand, advertising column, café table, market stall,
// vending machine), drawn per kind.
// `shape`: a landmark's silhouette ('tower' default, 'lattice', 'dome', 'twin', 'arch', 'needle', 'pagoda'); the hitbox is always its box.
// Fixed New York Block 1: four screen widths, authored positions, never generated.
const NEW_YORK_BLOCK_ONE_AUTHORED:BuildingSpec[]=[
 {x:295,w:64,h:82,hp:60,value:70,kind:'medium',label:'DELI',color:'#577b84'},
 {x:405,w:92,h:118,hp:90,value:100,kind:'medium',label:'MARKET',color:'#b36d57'},
 {x:570,w:126,h:220,hp:150,value:180,kind:'large',label:'',color:'#62708b'},
 {x:760,w:32,h:42,hp:20,value:20,kind:'tiny',label:'NEWS',color:'#ca9a50'},
 {x:855,w:102,h:146,hp:100,value:120,kind:'medium',label:'ARCADE',color:'#846a89'},
 {x:1090,w:82,h:106,hp:90,value:100,kind:'medium',label:'DINER',color:'#b67660'},
 {x:1270,w:136,h:254,hp:180,value:210,kind:'large',label:'',color:'#657d8b'},
 {x:1470,w:80,h:130,hp:90,value:100,kind:'medium',label:'RECORDS',color:'#a28166'},
 {x:1635,w:32,h:46,hp:20,value:20,kind:'tiny',label:'',color:'#81a47e'},
 {x:1760,w:110,h:180,hp:120,value:140,kind:'medium',label:'HOTEL',color:'#8b7688'},
 {x:1980,w:130,h:236,hp:165,value:190,kind:'large',label:'',color:'#687788'},
 {x:2200,w:90,h:120,hp:90,value:100,kind:'medium',label:'BODEGA',color:'#b77b5c'},
 {x:2410,w:104,h:166,hp:110,value:130,kind:'medium',label:'CINEMA',color:'#708b8c'},
 {x:2620,w:142,h:266,hp:180,value:210,kind:'large',label:'',color:'#687389'},
 {x:2870,w:34,h:44,hp:20,value:20,kind:'tiny',label:'NEWS',color:'#c79855'},
 {x:2980,w:96,h:140,hp:100,value:120,kind:'medium',label:'CAFE',color:'#9c7965'},
 {x:3210,w:122,h:210,hp:150,value:180,kind:'large',label:'',color:'#6b8392'},
 {x:3460,w:100,h:122,hp:90,value:100,kind:'medium',label:'SHOP',color:'#b2826f'},
];

import {CONFIG,BUILDING_PRESETS,MAINS} from './config.ts';
import {profileFrom,profileY} from './terrain.ts';
// Each city's look (phase 4): `mood` is its sky and light (lights 0 = broad day .. 1 = night: lit windows, neon), `style` picks the
// facade drawing, `material` how its buildings break, `taxi`/`cars` its street colours, `ink` the HUD text colour over its sky.
export type Mood={top:string,bottom:string,far:string,mid:string,near:string,win:string,lights:number,sun:string,rain?:boolean,smog?:boolean};
export type CityStyle='nyc'|'mex'|'par'|'hkg'|'tyo';
export type City={name:string,code:string,boss:string,sky:string,haze:string,colors:string[],signs:string[],mood:Mood,style:CityStyle,
 material:{debris:string[],slab:number,glass?:boolean,frame?:boolean},taxi:string,cars:string[],ink:string};
export const CITIES:City[]=[
 {name:'New York',code:'NYC',boss:'Kaiban',sky:'#95b0b2',haze:'#c8cbb5',colors:['#8a4e3e','#b36d57','#62708b','#7a5546','#a0634c'],signs:['DELI','MARKET','ARCADE','BODEGA'],
  mood:{top:'#86aac2',bottom:'#e8d5a9',far:'#9aa9ab',mid:'#7b8d8f',near:'#566a6e',win:'#e9cf86',lights:.15,sun:'#ffe4a6'},style:'nyc',
  material:{debris:['#8a4e3e','#6f3a2e','#b9a58c'],slab:1},taxi:'#f2c230',cars:['#3c4a5c','#8e9aa3','#7d2f2f','#2e3d36','#b7b2a6'],ink:'#2f4740'},
 {name:'Mexico City',code:'MEX',boss:'Tlézcatl',sky:'#d3a476',haze:'#f0c98a',colors:['#d9846a','#e7c07a','#8fb39a','#c9879c','#e2d6b8'],signs:['MERCADO','CAFE','HOTEL','TIENDA'],
  mood:{top:'#b7845e',bottom:'#f4c886',far:'#b48d78',mid:'#94735f',near:'#6f5a4d',win:'#ffd89a',lights:.45,sun:'#ffb35c',smog:true},style:'mex',
  material:{debris:['#e2d6b8','#d9846a','#c9b79c'],slab:.9},taxi:'#e8789f',cars:['#c25b3c','#6d8f5f','#d8c27a','#4f6f8f','#e4dccb'],ink:'#4a2f22'},
 {name:'Paris',code:'PAR',boss:'Belial',sky:'#a5bbca',haze:'#d7d6c0',colors:['#d8ccae','#cfc2a3','#e0d6bd','#c8bc9e'],signs:['CAFE','CINEMA','HOTEL','LIBRAIRIE'],
  mood:{top:'#9fb0bd',bottom:'#dcdbcf',far:'#a3acb2',mid:'#8b969c',near:'#6e7a80',win:'#efd9a0',lights:.25,sun:'#f4efe0'},style:'par',
  material:{debris:['#d8ccae','#bfb293','#e6dcc4'],slab:1.45},taxi:'#2b2f33',cars:['#7a8c99','#b9473b','#d6cdb5','#4b5d4f','#9aa0a6'],ink:'#33404a'},
 {name:'Hong Kong',code:'HKG',boss:'Myrmex',sky:'#1c2740',haze:'#3b3f63',colors:['#c9c3b4','#a9b8b9','#d3b8a8','#9fb3a8'],signs:['MARKET','HOTEL','ARCADE','CAFE'],
  mood:{top:'#0e1628',bottom:'#3a3460',far:'#1f2a44',mid:'#18223a',near:'#141c30',win:'#ffd36e',lights:1,sun:'#f2ecd6'},style:'hkg',
  material:{debris:['#bfe3f0','#c9c3b4','#8fb6c6'],slab:.8,glass:true},taxi:'#c2312b',cars:['#d8d8d8','#2b3440','#6b7f99','#a0332e','#e2c46a'],ink:'#dfe7f2'},
 {name:'Tokyo',code:'TYO',boss:'Sargathoth',sky:'#1c212d',haze:'#3a3550',colors:['#4d5a6e','#5d6a7a','#3f4b5c','#6c7480'],signs:['ARCADE','CAFE','HOTEL','MARKET'],
  mood:{top:'#141924',bottom:'#3b3451',far:'#232a39',mid:'#1c2230',near:'#151a26',win:'#9fe6ff',lights:1,sun:'#e8eef6',rain:true},style:'tyo',
  material:{debris:['#9aa3ad','#5d6a7a','#bfe3f0'],slab:1,frame:true},taxi:'#2c3e6b',cars:['#e8e8e6','#b8bcc0','#33373d','#5f7f9c','#c9b28a'],ink:'#dfe7f2'},
];
// `start`: open layouts set a mid-map spawn x; the player can roam both ways and leave by either end once the quota is met.
// Blocks without it keep the classic west spawn and single eastern exit.
// `grids`: power grids as [from,to] x ranges; each is fed by the substation standing inside it. `poles`: power-pole x positions
// (street lamps standing on the same spot are left out). Both optional; blocks without them have no city systems.
export type BlockDef={name:string,screens:number,kind:'district'|'stronghold'|'boss',buildings:BuildingSpec[],street:number[],cars:number[],start?:number,grids?:[number,number][],poles?:number[],ground?:[number,number][],water?:[number,number,number][],bridge?:{x0:number,x1:number,spans:number},subway?:[number,number][],elevated?:[number,number]};
// `elevated`: an elevated railway over [x0, x1] (Tokyo); world units.
// `water`: river spans [from, to, surfaceY]; `bridge`: a deck at street level over [x0, x1] in `spans` breakable spans; `subway`: x ranges
// with a subway line under the street (slams cave it in). All world units.
// `ground`: the street profile as world [x, y] points (src/terrain.ts); absent = flat.
// Third entry element: a landmark's name (key 'L'), 'cache', or a rooftop fixture ('radar' / 'tank').
type Entry=[number,keyof typeof BUILDING_PRESETS]|[number,keyof typeof BUILDING_PRESETS,string];
const LANDMARK_COLORS=['#c3b48d','#b7a37c','#a9a9a0'];
// Every coordinate below is authored data at the original scale. Runtime expands the presets and multiplies positions and sizes
// by CONFIG.cityScale. A building's width is scaled through its right edge, so wall-to-wall rows stay flush after rounding.
const sc=(n:number)=>Math.round(n*CONFIG.cityScale);
function scaled<T extends {x:number,w:number,h:number}>(b:T):T{return {...b,x:sc(b.x),w:sc(b.x+b.w)-sc(b.x),h:sc(b.h)};}
export const NEW_YORK_BLOCK_ONE:BuildingSpec[]=NEW_YORK_BLOCK_ONE_AUTHORED.map(scaled);
function district(city:number,name:string,screens:number,entries:Entry[],street:number[],cars:number[],kind:BlockDef['kind']='district',start?:number):BlockDef{
 const theme=CITIES[city];let landmarks=0;const built=entries.map(([x,key,tag],i)=>{
  if(key==='L'){const [label,shape]=(tag??'').split('|');return scaled({...BUILDING_PRESETS[key],x,label,color:LANDMARK_COLORS[landmarks++%LANDMARK_COLORS.length],landmark:true,...(shape?{shape}:{})});}
  if(key==='S'||key==='F'||key==='K')return scaled({...BUILDING_PRESETS[key],x,label:key==='K'?'ARMORY':'',color:key==='S'?'#7f8c88':key==='F'?'#c4bea6':'#8a5444',role:key==='S'?'substation':key==='F'?'depot':'armory'});
  return scaled({...BUILDING_PRESETS[key],x,label:key==='b'?'BARRIER':key==='t'?'NEWS':key==='l'||key==='x'||key==='n'?'':theme.signs[i%theme.signs.length],color:theme.colors[i%theme.colors.length],...(tag==='cache'?{cache:true}:tag==='radar'||tag==='tank'?{roof:tag}:{})});
 });
 // Water mains: a fire hydrant on the pavement beside every MAINS.every-th street spot (never inside a building), in district and
 // stronghold blocks. Appended after the authored buildings so their order is untouched.
 const solids=built.filter(b=>b.kind!=='tiny'),w=Math.round(10*CONFIG.cityScale),h=Math.round(16*CONFIG.cityScale);
 const hydrants:BuildingSpec[]=kind==='boss'?[]:street.filter((_,k)=>k%MAINS.every===1).map(x=>sc(x+40)).filter(x=>!solids.some(b=>x+w>b.x-6&&x<b.x+b.w+6)).map(x=>({x,w,h,hp:1,value:5,kind:'tiny',label:'',color:'#c0392b',role:'hydrant'}));
 // Street junk: each city's own clutter beside the other street spots (the first kind of the pair where k%3 is 0, the second at 2).
 const JUNK:Record<string,[string,string]>={nyc:['hotdog','trash'],mex:['taco','trash'],par:['morris','cafe'],hkg:['stall','trash'],tyo:['vending','trash']};
 const DIMS:Record<string,[number,number,number]>={hotdog:[26,28,40],trash:[12,18,10],taco:[30,30,40],morris:[16,46,40],cafe:[24,20,20],stall:[34,32,40],vending:[16,36,30]};
 // Placed in the real gaps between solid buildings: up to three per gap, spaced along it, alternating the city's two kinds.
 const junk:BuildingSpec[]=[];if(kind!=='boss'&&name!=='Combat Drills'){
  const edges=[...solids].sort((p,q)=>p.x-q.x),lo=200,hi=sc(screens*960)-70,keep=[...built.filter(b=>b.kind==='tiny'),...hydrants];let n=0;
  const gaps:[number,number][]=[];let from=lo;for(const b of edges){if(b.x>from)gaps.push([from,b.x]);from=Math.max(from,b.x+b.w);}if(hi>from)gaps.push([from,hi]);
  for(const [g0,g1] of gaps){const room=g1-g0-24;if(room<40)continue;const slots=Math.min(3,Math.max(1,Math.floor(room/110)));
   for(let k=0;k<slots;k++){const prop=JUNK[theme.style][n%2],[dw,dh,value]=DIMS[prop];const w=Math.round(dw*1.3*CONFIG.cityScale),h=Math.round(dh*1.3*CONFIG.cityScale);
    const px=Math.round(g0+12+(room-w)*(slots===1?.5:k/(slots-1)));
    if(px<lo||px+w>hi||px+w>g1-8||start!==undefined&&Math.abs(px+w/2-sc(start))<sc(200)||keep.some(b=>px+w>b.x-24&&px<b.x+b.w+24)||junk.some(b=>px<b.x+b.w+12&&px+w>b.x-12))continue;
    junk.push({x:px,w,h,hp:10,value,kind:'tiny',label:'',color:'#888',prop});n++;}}}
 return {name,screens,kind,street:street.map(sc),cars:cars.map(sc),...(start===undefined?{}:{start:sc(start)}),buildings:[...built,...hydrants,...junk]};
}
// Terrain from authored [x, rise] pairs (rise above the default street, negative dips). Keep slopes in gaps: buildings need flat ground.
function terrain(b:BlockDef,rises:[number,number][]):BlockDef{const ground=profileFrom(rises,CONFIG.cityScale);
 // Hydrants only stand on flat pavement; street junk tolerates a gentle slope (it stands on the high side).
 return {...b,ground,buildings:b.buildings.filter(x=>(x.role!=='hydrant'&&!x.prop)||Math.abs(profileY(ground,x.x)-profileY(ground,x.x+x.w))<=(x.prop?6:0))};}
// Tokyo's open blocks carry an elevated railway along most of their length.
function railway(b:BlockDef,from:number,to:number):BlockDef{return {...b,elevated:[sc(from),sc(to)]};}
function riverworks(b:BlockDef,o:{ground:[number,number][],water:[number,number,number],bridge:[number,number,number],subway:[number,number]}):BlockDef{
 const [wa,wz,wr]=o.water,[ba,bz,n]=o.bridge;
 return {...terrain(b,o.ground),water:[[sc(wa),sc(wz),Math.round(CONFIG.ground-wr*CONFIG.cityScale)]],bridge:{x0:sc(ba),x1:sc(bz),spans:n},subway:[[sc(o.subway[0]),sc(o.subway[1])]]};}
function powered(b:BlockDef,grids:[number,number][],poles:number[]):BlockDef{return {...b,grids:grids.map(([a,z])=>[sc(a),sc(z)] as [number,number]),poles:poles.map(sc)};}
// The original packed wall-to-wall Lower Manhattan stays as the Combat Drills map.
// Drills also carry a short subway line at the far east end, to practise cave-ins, trains and (at Stage 3) snatching a train.
export const DRILL_BLOCK:BlockDef={...district(0,'Combat Drills',4,[[400,'s'],[483,'l'],[637,'s'],[724,'s'],[807,'h'],[944,'x'],[1059,'n'],[1128,'m'],[1248,'n'],[1316,'h'],[1454,'l'],[1608,'m'],[1727,'s'],[1810,'m'],[1926,'h'],[2061,'l'],[2219,'m'],[2335,'x'],[2446,'m'],[2562,'h'],[2699,'h'],[2835,'n'],[2907,'l'],[3061,'s'],[3149,'m'],[3268,'h'],[3405,'l'],[3560,'m'],[3675,'s']],[175,375,520,805,1005,1185,1425,1605,1715,1920,2160,2330,2570,2815,3130,3390,3630],[230,710,1005,1195,1580,1910,2160,2370,2550,2830,3120,3380,3650]),subway:[[sc(2600),sc(3840)]]};
export const LEVELS:BlockDef[][]=[
 [
 // Lower Manhattan is the city-systems pilot: a west and an east power grid (substation 'S' each), fuel depots 'F', rooftop radars and
// water towers, and a line of power poles down each half.
 powered(district(0,'Lower Manhattan',4,[[240,'s','tank'],[320,'m'],[432,'h','cache'],[562,'l','radar'],[740,'S'],[880,'m','tank'],[992,'L','WOOLWORTH'],[1182,'n'],[1246,'h','tank'],[1380,'F'],[1470,'t'],[1600,'s'],[2120,'h'],[2250,'x','radar'],[2358,'m','cache'],[2470,'s','tank'],[2560,'S'],[2720,'n'],[2784,'L','STOCK EXCHANGE'],[2974,'m'],[3086,'l'],[3250,'F'],[3420,'t'],[3500,'s','tank'],[3580,'m']],[150,760,1380,1520,1760,2060,2600,3360,3740],[200,770,1400,1850,2000,2640,3380,3760],'district',1920),
  [[0,1920],[1920,3840]],[220,500,780,1060,1340,1530,1720,2060,2300,2560,2820,3080,3340,3620]),
// Hong Kong's open blocks climb a hillside toward the Peak: each cluster stands on its own terrace, with ramps in the streets.
// Midtown is the terrain pilot: the start plaza is sunken (Rockefeller-style) with ramps up either side, and the cluster east of
 // 3770 stands on a raised terrace reached by ramps.
 terrain(district(0,'Midtown Corridor',6,[[220,'m','tank'],[332,'h'],[462,'s','tank'],[700,'l'],[850,'L','RADIO CITY'],[1040,'x'],[1148,'m'],[1274,'S'],[1450,'t'],[1560,'s'],[1640,'h'],[1770,'n','cache'],[1834,'m'],[1946,'s'],[2040,'F'],[2270,'m'],[2382,'l'],[2630,'t'],[3150,'h'],[3280,'x'],[3388,'n'],[3452,'L','EMPIRE STATE'],[3642,'m','tank'],[3768,'F'],[3940,'s','tank'],[4020,'l'],[4170,'h','cache'],[4314,'S'],[4500,'t'],[4620,'m'],[4732,'x','radar'],[4840,'L','CHRYSLER'],[5030,'h'],[5160,'s'],[5340,'m']],[160,640,1300,1500,2180,2700,2900,3080,3880,4440,4570,5250,5650],[180,660,1320,1480,2200,2760,2980,3090,4460,4560,5260,5640],'district',2880),
  [[0,0],[2560,0],[2630,-24],[3050,-24],[3120,0],[3770,0],[3900,40],[4320,40],[4450,0],[5760,0]]),
 district(0,'Central Stronghold',8,[[400,'l'],[555,'m'],[675,'h'],[810,'m'],[929,'s'],[1012,'x'],[1125,'l'],[1280,'x'],[1393,'l'],[1551,'s'],[1637,'h'],[1775,'h'],[1913,'h'],[2046,'l'],[2199,'h'],[2333,'x'],[2445,'s'],[2530,'l'],[2685,'h'],[3070,'b'],[3400,'b'],[3650,'b'],[4020,'b'],[4300,'b'],[4430,'m'],[4548,'h'],[4685,'l'],[4842,'h'],[4979,'m'],[5099,'s'],[5183,'h'],[5317,'m'],[5433,'x'],[5546,'m'],[5665,'n'],[5734,'l'],[5891,'h'],[6024,'l'],[6177,'x'],[6293,'l'],[6447,'m'],[6562,'l'],[6715,'s'],[6800,'n'],[6869,'m'],[6984,'x'],[7096,'m'],[7212,'m'],[7328,'n'],[7399,'s'],[7483,'n']],[550,1300,2140,2930,4600,5350,6190,7060],[500,1250,2150,2870,4510,5300,6120,7030],'stronghold'),
// East River is the phase 3 showcase: the river crosses the east end under a three-span suspension bridge (the only way across for
 // ground troops), a subway line runs under the west half (slams cave the street in), and an armory stands at each end.
 riverworks(district(0,'East River Offensive',8,[[220,'h'],[350,'m'],[462,'s'],[548,'K'],[700,'x'],[808,'L','UN HQ'],[998,'l'],[1260,'t'],[1380,'m'],[1492,'s'],[1572,'h'],[1702,'m','cache'],[2000,'n'],[2064,'l'],[2214,'m'],[2440,'t'],[2560,'h'],[2690,'L','CITICORP'],[2880,'x'],[2988,'s'],[3260,'m'],[3372,'h'],[4140,'s'],[4220,'m'],[4332,'n'],[4396,'h','cache'],[4720,'t'],[4840,'l'],[4990,'x'],[5098,'L','MET LIFE'],[5288,'m'],[6060,'n'],[6290,'t'],[6400,'m'],[6512,'h'],[6642,'L','SEAPORT'],[6832,'s'],[6930,'K'],[7110,'m'],[7222,'h']],[150,640,1230,1330,1940,2380,2500,3200,3560,3720,4000,4080,4700,4780,5500,5700,6250,6360,7040,7520],[170,650,1240,1340,1960,2400,2510,3540,3700,4010,4740,4790,5520,5720,6270,6370,7060,7540],'district',3840),{ground:[[0,0],[5410,0],[5470,-40],[5990,-40],[6050,0],[7680,0]],water:[5420,6040,-10],bridge:[5400,6060,3],subway:[400,3700]}),
 district(0,'Kaiban Arena',4,[[500,'m'],[890,'l'],[1300,'s'],[1720,'t'],[2130,'h'],[2550,'l'],[2980,'m'],[3370,'s']],[340,780,1210,1650,2400,3190],[350,1150,1580,2350,3200],'boss'),
 ],
 [
 district(1,'Centro Histórico',4,[[400,'l'],[557,'m','tank'],[672,'L','CATEDRAL|twin'],[876,'S'],[1151,'h','cache'],[1287,'m','tank'],[1403,'l'],[1556,'x'],[2128,'L','BELLAS ARTES|dome'],[2350,'x','radar'],[2466,'h','cache'],[2610,'S'],[2850,'h'],[2985,'h'],[3118,'s','tank'],[3206,'L','TORRE LATINO|tower'],[3410,'F'],[3562,'h'],[3697,'n']],[190,640,1260,1780,2320,2940,3500],[380,1220,1740,2300,2930,3490],'district',1920),
 district(1,'Reforma Avenue',6,[[400,'x'],[512,'h'],[650,'x'],[765,'L','EL ÁNGEL|needle'],[969,'F'],[1166,'x'],[1278,'n'],[1348,'m','cache'],[1464,'x'],[1586,'S'],[1746,'l'],[1899,'l'],[2052,'s','tank'],[2135,'h'],[2564,'l'],[3059,'m','tank'],[3179,'L','TORRE MAYOR|tower'],[3636,'m','cache'],[3751,'x'],[3864,'h'],[4000,'x','radar'],[4122,'S'],[4311,'h'],[4449,'n'],[4518,'m','tank'],[4636,'n'],[4714,'F'],[4891,'L','MONUMENTO A LA REVOLUCIÓN|arch'],[5130,'n'],[5201,'h'],[5557,'n']],[220,870,1470,2010,2670,3270,3930,4580,5400],[520,1190,1660,2330,3010,3550,4240,4770,5440],'district',2880),
 district(1,'Crystal Bastion',8,[[400,'x'],[516,'l'],[672,'l'],[829,'h'],[965,'x'],[1081,'s'],[1169,'m'],[1287,'x'],[1399,'h'],[1534,'n'],[1606,'h'],[1743,'l'],[1896,'m'],[2016,'h'],[2151,'m'],[2266,'h'],[2399,'h'],[2532,'m'],[2649,'h'],[2782,'m'],[2898,'h'],[3260,'b'],[3550,'b'],[3720,'b'],[4020,'b'],[4260,'b'],[4390,'h'],[4526,'x'],[4639,'x'],[4750,'h'],[4884,'s'],[4971,'s'],[5057,'l'],[5211,'h'],[5344,'m'],[5461,'n'],[5531,'m'],[5646,'m'],[5762,'l'],[5920,'l'],[6078,'h'],[6214,'h'],[6351,'x'],[6466,'l'],[6623,'m'],[6739,'n'],[6807,'x'],[6920,'l'],[7078,'x'],[7194,'m'],[7311,'s'],[7399,'h'],[7535,'n']],[500,1410,2300,3090,4510,5390,6200,7060],[560,1440,2250,3110,4480,5350,6160,7050],'stronghold'),
 district(1,'Chapultepec Assault',8,[[400,'x'],[514,'h'],[647,'h'],[784,'s','tank'],[1075,'L','CASTILLO DE CHAPULTEPEC|twin'],[1300,'s','tank'],[1386,'m','cache'],[1512,'S'],[1793,'x'],[1909,'h'],[2047,'x'],[2163,'l'],[2327,'F'],[2589,'m'],[2707,'m','cache'],[2827,'L','MUSEO SOUMAYA|dome'],[3254,'n'],[3326,'h'],[3464,'x'],[3577,'m'],[3930,'x','radar'],[4042,'h'],[4175,'m','tank'],[4292,'m','tank'],[4661,'h'],[4794,'L','TORRE REFORMA|tower'],[5043,'h'],[5187,'F'],[5454,'m'],[5574,'m'],[5689,'h'],[5823,'s'],[5917,'S'],[6164,'l'],[6320,'m'],[6440,'l'],[6598,'L','ESTELA DE LUZ|needle'],[6897,'s'],[6982,'n'],[7054,'m'],[7169,'h']],[220,950,1650,2360,3120,4040,4730,5500,6230,6950],[590,1320,2030,2770,3650,4390,5100,5840,6580,7300],'district',3840),
 district(1,'Tlézcatl Arena',4,[[510,'h'],[940,'m'],[1360,'l'],[1800,'s'],[2220,'t'],[2600,'m'],[3040,'h'],[3450,'s']],[370,820,1670,2480,3330],[390,1240,2080,2930],'boss'),
 ],
 [
 district(2,'Left Bank',4,[[400,'n'],[468,'l'],[625,'L','NOTRE-DAME|twin'],[829,'S'],[1208,'h','cache'],[1344,'m','tank'],[1462,'l'],[1618,'h','cache'],[2085,'s','tank'],[2171,'L','PANTHÉON|dome'],[2423,'l'],[2587,'S'],[2825,'l','radar'],[2980,'m','tank'],[3097,'h'],[3231,'L','TOUR MONTPARNASSE|tower'],[3435,'F'],[3573,'l']],[200,810,1370,2010,2730,3360],[460,1020,1640,2180,3060,3590],'district',1920),
 district(2,'Grand Boulevards',6,[[400,'n'],[471,'m','tank'],[588,'n'],[655,'s','tank'],[749,'F'],[939,'L','ARC DE TRIOMPHE|arch'],[1248,'s'],[1336,'m','cache'],[1462,'S'],[1723,'h'],[1861,'l'],[2019,'m','cache'],[2136,'m'],[2525,'h'],[3102,'L','OPÉRA GARNIER|dome'],[3353,'m','tank'],[3695,'m','tank'],[3812,'n'],[3879,'s'],[3965,'h'],[4109,'S'],[4349,'l'],[4502,'h'],[4640,'m'],[4757,'L','GALERIES LAFAYETTE|tower'],[4961,'F'],[5151,'m'],[5269,'s'],[5353,'h'],[5491,'x','radar']],[210,840,1510,2110,2810,3670,4270,4960,5590],[500,1180,1800,2470,3090,3910,4580,5270],'district',2880),
 district(2,'Crystal Citadel',8,[[400,'s'],[485,'m'],[604,'l'],[762,'m'],[877,'h'],[1010,'x'],[1125,'s'],[1211,'l'],[1367,'s'],[1455,'s'],[1541,'m'],[1656,'x'],[1772,'m'],[1889,'n'],[1960,'x'],[2073,'x'],[2185,'l'],[2338,'l'],[2491,'l'],[2649,'l'],[2803,'m'],[2922,'n'],[2991,'h'],[3310,'b'],[3580,'b'],[3760,'b'],[4020,'b'],[4350,'b'],[4480,'m'],[4595,'m'],[4710,'h'],[4846,'x'],[4961,'s'],[5049,'s'],[5135,'m'],[5252,'m'],[5367,'h'],[5503,'m'],[5619,'m'],[5734,'h'],[5870,'m'],[5987,'x'],[6098,'s'],[6182,'m'],[6297,'x'],[6411,'n'],[6479,'h'],[6615,'n'],[6682,'s'],[6768,'x'],[6882,'l'],[7040,'s'],[7128,'n'],[7195,'s'],[7281,'h'],[7418,'m'],[7537,'n']],[200,1110,1950,2790,4550,5400,6280,7130],[650,1500,2360,3170,4540,5390,6250,7100],'stronghold'),
 district(2,'Seine Offensive',8,[[400,'s','tank'],[483,'l'],[638,'s','tank'],[725,'s'],[1054,'L','TOUR EIFFEL|lattice'],[1276,'h'],[1412,'s'],[1506,'S'],[1792,'h'],[1930,'s'],[2015,'m','cache'],[2131,'h'],[2275,'F'],[2464,'x'],[2577,'x'],[2693,'x'],[2804,'L','SACRÉ-CŒUR|dome'],[3147,'s'],[3230,'h'],[3366,'m'],[3484,'h','cache'],[3977,'n'],[4045,'m','tank'],[4165,'m','tank'],[4282,'l'],[4675,'h'],[4808,'L','LES INVALIDES|dome'],[5100,'l'],[5264,'F'],[5530,'l'],[5687,'m'],[5805,'m'],[5922,'s'],[6016,'S'],[6248,'s'],[6335,'x','radar'],[6447,'l'],[6600,'L','GRANDE ARCHE|arch'],[7006,'s'],[7091,'n'],[7162,'n'],[7234,'x']],[210,870,1540,2150,2860,3470,4140,4840,5750,6470,7140],[530,1180,1810,2470,3170,3760,4510,5400,6100,6780,7430],'district',3840),
 district(2,'Belial Arena',4,[[480,'s'],[870,'h'],[1300,'m'],[1720,'l'],[2150,'t'],[2540,'h'],[2980,'s'],[3380,'m']],[340,760,1180,2010,2850,3260],[360,1150,1980,2810,3590],'boss'),
 ],
 [
 terrain(district(3,'Kowloon Streets',4,[[400,'s','tank'],[486,'n'],[553,'m','tank'],[668,'L','CHUNGKING MANSIONS|tower'],[1026,'h'],[1160,'s'],[1243,'x'],[1358,'m'],[2091,'h','radar'],[2224,'L','TIN HAU TEMPLE|pagoda'],[2425,'m','tank'],[2776,'m','tank'],[2895,'m','cache'],[3010,'m'],[3126,'L','LADIES MARKET|tower'],[3461,'n'],[3533,'s'],[3618,'s']],[210,830,1500,2000,2680,3300],[530,1130,1710,2310,2990,3620],'district',1920),[[0,0],[380,0],[872,0],[1012,22],[1484,22],[2077,44],[2551,44],[2762,66],[3330,66],[3447,88],[3840,88]]),
 terrain(district(3,'Nathan Road',6,[[400,'m','cache'],[516,'m','tank'],[633,'l'],[789,'L','PENINSULA HOTEL|twin'],[1180,'s','tank'],[1263,'m'],[1381,'n'],[1451,'m'],[1859,'m'],[1979,'h','cache'],[2116,'h'],[2250,'h'],[3046,'m','tank'],[3165,'L','CLOCK TOWER|tower'],[3454,'m','tank'],[3885,'m'],[4001,'h'],[4135,'x','radar'],[4248,'s'],[4624,'m'],[4740,'L','ICC TOWER|needle'],[4995,'m'],[5350,'l'],[5503,'x'],[5614,'n']],[210,930,1570,2250,2930,3600,4340,5050,5660],[540,1240,1930,2560,3280,3990,4660,5360],'district',2880),[[0,0],[380,0],[993,0],[1166,22],[1577,22],[1845,44],[2394,44],[3032,66],[3580,66],[3871,88],[4342,88],[4610,88],[5121,88],[5336,88],[5760,88]]),
 district(3,'Harbour Stronghold',8,[[400,'m'],[520,'l'],[677,'s'],[765,'n'],[836,'l'],[992,'h'],[1130,'h'],[1264,'l'],[1419,'s'],[1504,'h'],[1641,'l'],[1797,'m'],[1915,'l'],[2071,'h'],[2206,'m'],[2325,'x'],[2436,'h'],[2569,'s'],[2654,'m'],[2774,'l'],[2928,'m'],[3043,'s'],[3330,'b'],[3590,'b'],[3760,'b'],[4020,'b'],[4310,'b'],[4440,'h'],[4574,'s'],[4660,'l'],[4816,'n'],[4883,'x'],[4998,'m'],[5118,'l'],[5274,'h'],[5407,'h'],[5544,'x'],[5656,'s'],[5741,'s'],[5826,'m'],[5942,'x'],[6057,'s'],[6143,'h'],[6277,'m'],[6397,'s'],[6483,'m'],[6602,'h'],[6736,'x'],[6847,'m'],[6967,'l'],[7122,'l'],[7276,'m'],[7392,'m'],[7510,'n']],[200,1080,1950,2780,4550,5400,6270,7150],[640,1500,2380,3180,4530,5380,6240,7100],'stronghold'),
 terrain(district(3,'Victoria Assault',8,[[400,'m','cache'],[517,'m','tank'],[636,'l'],[790,'s','tank'],[1100,'L','BANK OF CHINA|needle'],[1403,'m'],[1766,'h','cache'],[1903,'l'],[2058,'x'],[2174,'h'],[2568,'h'],[2706,'n'],[2778,'s'],[2862,'L','IFC TWO|tower'],[3133,'m'],[3251,'m'],[3367,'x'],[3483,'m'],[3968,'h'],[4105,'l'],[4262,'h'],[4397,'h'],[4825,'L','HSBC BUILDING|tower'],[5065,'s','tank'],[5150,'x'],[5465,'m','tank'],[5582,'h'],[5716,'x','radar'],[5830,'l'],[6259,'s'],[6342,'l'],[6497,'l'],[6651,'L','CENTRAL PLAZA|needle'],[6997,'x'],[7111,'l'],[7264,'m'],[7384,'h']],[220,980,1690,2380,3070,3810,4500,5240,6010,6680,7440],[590,1300,2010,2730,3420,4130,4900,5600,6300,7080],'district',3840),[[0,0],[380,0],[884,0],[1086,22],[1529,22],[1752,44],[2318,44],[2554,66],[3609,66],[3954,88],[4541,88],[4811,88],[5272,88],[5451,88],[5994,88],[6245,88],[6855,88],[6983,88],[7680,88]]),
 district(3,'Myrmex Arena',4,[[520,'l'],[980,'m'],[1400,'h'],[1840,'t'],[2220,'s'],[2620,'l'],[3080,'m'],[3490,'s']],[350,850,1280,2100,2950,3370],[380,1260,2070,2940],'boss'),
 ],
 [
 railway(district(4,'Shinjuku District',4,[[400,'m','cache'],[515,'h'],[650,'L','METROPOLITAN GOVT|twin'],[854,'S'],[1161,'x'],[1274,'n'],[1345,'x'],[1456,'m','cache'],[2024,'x'],[2137,'L','KABUKICHO TOWER|tower'],[2410,'x','radar'],[2532,'S'],[2774,'l'],[2927,'m','tank'],[3047,'m','tank'],[3166,'L','HANAZONO SHRINE|pagoda'],[3474,'m'],[3592,'m']],[190,840,1490,2130,2830,3470],[470,1180,1860,2460,3150],'district',1920),300,3500),
 railway(district(4,'Chuo Corridor',6,[[400,'m','cache'],[519,'x'],[634,'m','tank'],[751,'s','tank'],[845,'F'],[1106,'L','TOKYO STATION|dome'],[1307,'l'],[1460,'m','cache'],[1586,'S'],[1833,'l'],[1989,'n'],[2058,'h'],[2192,'x'],[2575,'l'],[3003,'m','tank'],[3121,'L','GINZA WAKO|tower'],[3549,'m','tank'],[3669,'l'],[3823,'n'],[3891,'x','radar'],[4013,'S'],[4256,'n'],[4326,'m'],[4444,'l'],[4602,'l'],[4766,'F'],[4986,'L','KABUKI-ZA|pagoda'],[5228,'m'],[5348,'s']],[220,960,1690,2370,3070,3790,4510,5250],[620,1300,2010,2760,3390,4150,4880,5570],'district',2880),300,5400),
 district(4,'Crystal Heart',8,[[400,'h'],[534,'s'],[619,'h'],[753,'m'],[869,'h'],[1006,'l'],[1159,'m'],[1274,'l'],[1431,'m'],[1551,'m'],[1670,'s'],[1756,'l'],[1910,'x'],[2026,'l'],[2182,'l'],[2335,'x'],[2450,'l'],[2607,'m'],[2723,'h'],[2861,'l'],[3015,'s'],[3102,'x'],[3360,'b'],[3600,'b'],[3760,'b'],[4020,'b'],[4290,'b'],[4420,'h'],[4553,'l'],[4708,'h'],[4842,'s'],[4928,'n'],[4999,'l'],[5157,'l'],[5313,'m'],[5433,'l'],[5589,'m'],[5709,'x'],[5823,'n'],[5893,'h'],[6027,'n'],[6095,'h'],[6232,'m'],[6349,'s'],[6434,'l'],[6590,'h'],[6727,'s'],[6815,'h'],[6950,'n'],[7021,'s'],[7107,'n'],[7175,'m'],[7294,'s'],[7382,'m'],[7499,'n']],[200,1100,1960,2850,4540,5440,6350,7210],[650,1530,2390,3210,4510,5410,6290,7160],'stronghold'),
 railway(district(4,'Tokyo Final Offensive',8,[[400,'h','cache'],[538,'l'],[693,'n'],[761,'m','cache'],[1103,'L','TOKYO TOWER|lattice'],[1306,'s','tank'],[1389,'l'],[1553,'S'],[1817,'m','tank'],[1935,'h'],[2072,'h'],[2209,'x'],[2331,'F'],[2538,'m'],[2656,'l'],[2811,'m'],[2929,'L','SKYTREE|needle'],[3357,'m'],[3474,'h'],[3970,'l'],[4127,'l'],[4535,'n'],[4602,'x'],[4717,'l'],[4870,'L','SENSŌ-JI|pagoda'],[5074,'F'],[5283,'x','radar'],[5395,'l'],[5551,'m','tank'],[5667,'l'],[5831,'S'],[6048,'h'],[6186,'l'],[6341,'s','tank'],[6427,'h'],[6791,'L','SHIBUYA 109|tower'],[7038,'l'],[7192,'x'],[7493,'m']],[200,960,1690,2410,3170,3910,4620,5390,6150,6900],[580,1300,2040,2780,3520,4270,5020,5760,6510,7290],'district',3840),300,7300),
 district(4,'Sargathoth Arena',4,[[530,'h'],[980,'l'],[1440,'m'],[1850,'s'],[2250,'t'],[2630,'h'],[3070,'l'],[3510,'s']],[360,860,1320,2130,2940,3390],[390,1280,2090,2920],'boss'),
 ],
];
// City systems for every city's open blocks (and Midtown): a west and an east grid and, outside Paris (cables run underground there),
// a line of power poles down the street. Their substations, fuel stations, radars and rooftop tanks are in the entries above.
for(const [n,grids,poles] of [
 ['Midtown Corridor',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Centro Histórico',[[0, 1920], [1920, 3840]],[220, 500, 780, 1060, 1340, 1620, 2180, 2460, 2740, 3020, 3300, 3580]],
 ['Reforma Avenue',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Chapultepec Assault',[[0, 3840], [3840, 7680]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 4140, 4420, 4700, 4980, 5260, 5540, 5820, 6100, 6380, 6660, 6940, 7220]],
 ['Left Bank',[[0, 1920], [1920, 3840]],[]],
 ['Grand Boulevards',[[0, 2880], [2880, 5760]],[]],
 ['Seine Offensive',[[0, 3840], [3840, 7680]],[]],
 ['Kowloon Streets',[[0, 1920], [1920, 3840]],[220, 500, 780, 1060, 1340, 1620, 2180, 2460, 2740, 3020, 3300, 3580]],
 ['Nathan Road',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Victoria Assault',[[0, 3840], [3840, 7680]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 4140, 4420, 4700, 4980, 5260, 5540, 5820, 6100, 6380, 6660, 6940, 7220]],
 ['Shinjuku District',[[0, 1920], [1920, 3840]],[220, 500, 780, 1060, 1340, 1620, 2180, 2460, 2740, 3020, 3300, 3580]],
 ['Chuo Corridor',[[0, 2880], [2880, 5760]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 3860, 4140, 4420, 4700, 4980, 5260, 5540]],
 ['Tokyo Final Offensive',[[0, 3840], [3840, 7680]],[220, 500, 780, 1060, 1340, 1620, 1900, 2180, 2460, 2740, 3020, 3300, 3580, 4140, 4420, 4700, 4980, 5260, 5540, 5820, 6100, 6380, 6660, 6940, 7220]]] as [string,[number,number][],number[]][])for(const city of LEVELS){const i=city.findIndex(b=>b.name===n);if(i>=0)city[i]=powered(city[i],grids,poles);}
export function levelWidth(block:BlockDef){return sc(block.screens*CONFIG.width);}
