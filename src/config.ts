// City scale: every building and every authored x position (buildings, street crowds, parked cars, spawns) is multiplied by
// this at load, so buildings sit at the same proportion to the troop-sized civilians and patrol-car-sized traffic, and blocks get
// this much longer. Size-based rules below (lift, topple) are scaled with it so they still pick out the same buildings.
export const CITY_SCALE=1.4;
// Provisional M1 values. Future balance changes belong here.
export const CONFIG = {
 cityScale:CITY_SCALE,
 width:960,height:540,ground:435,screenCount:4,moveSpeed:205,crouchHeight:38,
 playerWidth:48,playerHeight:69,gravity:1250,jumpVelocity:530,climbSpeed:230,maxCameraY:560,
 lightDamage:30,heavyDamage:68,rangedDamage:23,attackCooldown:.28,
 heavyCooldown:.62,rangedCooldown:.48,projectileSpeed:540,
 meleeReach:76,exitThreshold:.75,perfectBonus:1500,
 cameraSpeed:5,maxDelta:.04,collapseDuration:.7,particleCap:180,
 // Kaiju sprites are drawn this far below the physics floor so their feet sit on the road, not the curb line.
 spriteDrop:8,
 // Fixed world zoom (1 = native 960px view), anchored on the street line. Held constant at every stage so growth reads
 // as the kaiju getting bigger against the city, and wide enough that a Stage 3 climb up the tallest tower stays in frame.
 zoom:.5,
};

// Provisional M2 combat/evolution tuning; these are implementation defaults.
export const COMBAT = {
 maxHP:100,startHP:34,up:[50,92],down:[36,74],stageScale:[1,1.4,2.8],
 stageDamage:[1,1.25,1.55],stageResistance:[1,.9,.8],transformSeconds:1,
 comboTimeout:.8,inputBuffer:.15,comboDamage:[1,1.1,1.7],comboKnockback:[70,95,200],
 maxCharge:1.5,chargeSlow:.3,chargeDamageBonus:1.6,heavyKnockback:220,
 ultimateMax:100,ultimateGain:.14,ultimateDuration:2.4,ultimatePulse:.24,
 ultimateDamage:58,ultimateSpeed:540,ultimateRange:1100,
 // Mogurodon's grounded ranged (Tremor Slam): one forward mini-rupture that pierces along the street. Size/range grow with sqrt(stage scale).
 tremorDamage:32,tremorSpeed:600,tremorRange:400,tremorCooldown:.7,tremorKnockback:150,tremorSize:.8,
 // Kaiban's grounded ranged (Debris Shotgun): on the scoop's impact frame his tusks fling a fan of rock chunks up and forward, the flat
 // ones fast and the high ones lobbed. Each chunk stops on the first thing it hits, so point-blank most land on one target and at range
 // they spread out or sail over it (short range, big damage up close). Speeds and lifetime grow with sqrt(stage scale).
 debrisCount:6,debrisDamage:10,debrisSpeed:[420,560],debrisAngle:[8,55],debrisGravity:1100,debrisLife:.75,debrisCooldown:.75,debrisKnockback:70,
 // Kaiban's Ultimate (Stampede): a bellow blast on the roar's impact frame, then a head-down charge out stampedeReach (times the stage scale, so Stage 2/3 charge further and faster) and back (speed is
 // set so the run fills the rest of the Ultimate; at Stage 1 shorter than Seismic Rupture's ultimateRange, but every building it touches is destroyed
 // outright like a train ran through it). Units, vehicles and the rival take stampedeDamage once per pass.
 stampedeReach:560,stampedeDamage:300,stampedeKnockback:320,stampedeCrunch:.05,bellowRange:260,bellowDamage:20,
 // Tlézcatl's Ultimate (Eruption): planted. He balls up for eruptCharge seconds while the pressure builds (glow, shudder, embers
 // drawn in), rears up, and on the roar's impact frame explodes: a true circle of eruptBlastRange radius (x sqrt(stage scale)) round
 // his middle that hits everything inside it once for eruptBlastDamage with eruptBlastKnockback, aircraft and shots included. That
 // blast is the Ultimate. As a side effect it hurls eruptGlobs molten globs out of the fireball in one burst; they are not aimed:
 // each picks a random landing spot out to eruptRange (x sqrt(scale)) either side, flies eruptFlight seconds under eruptGravity and
 // hits the first thing it falls onto (never on the way up) for eruptGlobDamage, leaving an eruptPool-wide lava pool on the street
 // that burns for eruptPoolSeconds. All of it is Ultimate damage, so it never refills the meter.
 eruptCharge:1,eruptBlastRange:270,eruptBlastDamage:320,eruptBlastKnockback:420,
 eruptGlobs:30,eruptRange:820,eruptFlight:[.9,1.5],eruptGravity:1900,eruptGlobDamage:30,eruptGlobSize:10,eruptPool:60,eruptPoolSeconds:3.5,eruptPoolDamage:8,
 // Tlézcatl's grounded ranged (Flame Jet): hold L to breathe a cone of fire from the jaws. A fuel bar drains over jetSeconds of
 // breathing and refills at jetRegen per second; running it dry locks the jet until it is back to jetRelight. A tap still breathes for
 // jetMinBurst. Everything inside the cone takes jetDamage every jetTick (pierces); the cone stops at the first building and at the
 // street. W/S tilt it up to jetUp / down to jetDown degrees at jetTurn deg/s. Length and width grow with sqrt(stage scale). He creeps
 // at jetSlow walking speed while breathing. Past the aim strip's top angle the head holds its last frame while the flame keeps tilting,
 // so he can torch a hovering helicopter; aircraft caught in the cone take jetAirMult damage (fire shreds rotors and wings).
 jetAirMult:1.6,
 jetSeconds:2,jetRegen:.5,jetRelight:.35,jetMinBurst:.25,jetMinStart:.08,jetTick:.12,jetDamage:7,jetKnockback:30,jetCarPush:.3,
 jetRange:260,jetWidth:[6,34],jetUp:58,jetDown:25,jetTurn:140,jetSlow:.25,jetCooldown:.2,
 // Lingering fire, kept on a short leash so it never burns the block down on its own. Where the flame washes along the street it
 // leaves fire patches (one per jetFireCell px, at most jetFireCap; patch width, flame height and burn zone grow with sqrt(stage scale)) that burn for jetFireSeconds after the flame leaves, jetFireDamage
 // every jetFireTick. Walls the flame touches catch the same way, in jetWallCell rows (x sqrt(stage scale)), so tilting across a wall
 // leaves a track of fire up it; each spot burns jetBurnSeconds. A burning building takes jetBurnDamage every jetBurnTick however many
 // spots it has, fire never spreads, at most jetWallCap spots on at most jetBurnCap buildings burn at once, and the afterburn alone
 // can't collapse a building: it smolders at 1 HP.
 jetFireSeconds:1.4,jetFireTick:.3,jetFireDamage:3,jetFireCell:36,jetFireCap:10,jetBurnSeconds:2.5,jetBurnTick:.3,jetBurnDamage:3,jetBurnCap:4,
 jetWallCell:18,jetWallCap:16,
 // Belial's grounded ranged (Acid Vomit): hold L to spew an arcing stream of acid from the jaws. The gland's pressure (0-1) drains over
 // vomitSeconds of spewing and refills at vomitRegen per second; running it dry gags him (the wind-down plays) and locks it until it is
 // back to vomitRelight. Pressure sets the launch speed, vomitSpeed[0] (empty) to [1] (full), so as the gland drains the arc sags and
 // where it lands walks back toward him; low pressure only loses range, it is still acid. The stream flies under vomitGravity, pierces
 // troops and aircraft it passes through and stops on the first building or the street (vomitDamage every vomitTick to whatever it
 // touches, plus a vomitSplash-radius splash where it lands). Untouched it lobs at vomitRest above level; W/S tilt it up to vomitUp or
 // down to vomitDown below level, at vomitTurn deg/s. Speeds, gravity and splash grow with sqrt(stage scale). He walks at vomitSlow while spewing.
 vomitSeconds:2.4,vomitRegen:.45,vomitRelight:.3,vomitMinBurst:.25,vomitMinStart:.08,vomitCooldown:.2,
 vomitSpeed:[170,520],vomitGravity:700,vomitRest:15,vomitUp:55,vomitDown:25,vomitTurn:140,vomitSlow:.5,
 vomitTick:.12,vomitDamage:4,vomitSplash:24,vomitAirMult:1,
 // Corrosion: a building, unit or the rival touched by the stream (or standing in a puddle) is corroded. Every corrodePerStack seconds
 // of contact adds a stack (the first contact gives one), up to corrodeMax; each new contact refreshes it to corrodeSeconds. A corroded
 // target takes corrodeDamage x stacks every corrodeTick and corrodeVuln x stacks more damage from everything; tanks and APCs also lose
 // armour (corrodeArmor more). At full stacks a building gives way once it is down to corrodeBreak of its HP.
 corrodePerStack:.4,corrodeMax:3,corrodeSeconds:6,corrodeTick:.3,corrodeDamage:1.5,corrodeVuln:.15,corrodeArmor:.25,corrodeBreak:.25,
 // Puddles: every patch of street the stream lands on becomes an acid puddle (one per vomitPuddleCell px, at most vomitPuddleCap) for
 // vomitPuddleSeconds that eats whatever stands in it for vomitPuddleDamage every vomitPuddleTick and corrodes it.
 vomitPuddleSeconds:4,vomitPuddleCell:30,vomitPuddleCap:14,vomitPuddleTick:.3,vomitPuddleDamage:3,
 // Belial's Ultimate (Acid Deluge): planted. He heaves for delugeCharge seconds while the gland swells, rears up, and on the roar's
 // impact frame retches a geyser of acid straight up out of sight. It spouts until the settle strip starts; delugeDelay after it
 // starts, the acid comes back down as rain: delugeDrops drops spread evenly over the spout's length, each landing at a random spot
 // out to delugeRange (x sqrt(stage scale)) either side of him and falling from the top of the view at delugeFall px/s under
 // delugeGravity. A drop hits the first thing it falls onto (aircraft, troops, vehicles, the rival, a roof, the street) for
 // delugeDamage and soaks it with delugeSoak corrosion stacks at once (up to corrodeMax), so a building caught in the downpour is
 // fully corroded within a few drops and gives way at corrodeBreak. On the street it splashes delugeSplash round the landing and
 // leaves an acid puddle (its own cap, delugePuddleCap). All of it, the corrosion it leaves behind included, is Ultimate damage, so
 // none of it refills the meter.
 // Myrmex's Ultimate (The Swarm): planted. He hunches for swarmCharge seconds while his abdomen swells and throbs, rears up, and on the
 // roar's impact frame his abdomen bursts open and releases swarmCount venomous drones from it (the roar strip's `mouth`). Each
 // drone lives swarmLife seconds, flying at swarmSpeed (x sqrt(stage scale)) after the nearest troop, aircraft or the rival within
 // swarmRange (else the nearest building), and stings for swarmDamage (Ultimate damage) plus poison at most every swarmSting
 // seconds, swarmBuilding on a building. The swarm outlives the Ultimate.
 swarmCharge:.65,swarmCount:40,swarmLife:6,swarmSpeed:280,swarmDamage:6,swarmSting:.45,swarmRange:700,swarmBuilding:5,
 delugeCharge:.65,delugeDelay:.3,delugeDrops:110,delugeRange:640,delugeFall:520,delugeGravity:1300,delugeDamage:16,delugeSoak:1,
 delugeSplash:18,delugeDropSize:3,delugePuddleCap:30,
 superMax:40,superDuration:20,superDamage:1.5,superSpeed:1.18,superResistance:.55,superKnockback:1.5,
 rangedMax:12,staggerSeconds:.32,staggerProtection:.9,knockbackFriction:9,
 scorePenaltyPerHP:10,ambientInterval:5,ambientCount:3,growthInterval:30,growthHP:240,
 shardValue:1,shardCap:120,shardLifetime:90,shardMagnet:90,shardPickup:28,
 buildingShards:1,growthShards:12,growthCap:3,burstRadius:50,
};

// M3 provisional military/civilian tuning. No military collision damage.
export const MILITARY = {
 caps:[12,16,20,24,8],firstSpawn:2,
 threatPressure:.4,spawnVariance:.18,spawnMargin:90,despawnDistance:1400,
 projectileCap:100,wreckCap:24,wreckSeconds:4,bulletLife:4,impactSeconds:.35,
 cityHP:.1,cityDamage:.1,cityPressure:.08,burstGap:.14,rocketGap:.28,
 knockbackFriction:7,collisionImpactMin:100,collisionBuildingDamage:.3,collisionPlayerDamage:.025,
 unitShards:1,civilianPoints:5,carPoints:80,carShards:0,civilianSpeed:62,
 civilianMax:420,carHP:1,
 // Crowds to match squad-sized military: every authored street spot holds crowdSize people crowdSpread px apart, and a
 // building's first damage lets out occupants[0]..occupants[1] people.
 crowdSize:4,crowdSpread:11,occupants:[3,6],
 // Civilians are drawn and collide at troop scale (police are 13x24): civilianW x civilianH, on the same 7x14 pixel grid.
 civilianW:12,civilianH:22,
};

// Shared M3 unit and weapon definitions; all combat balance lives here.
export const UNIT_CONFIG = {
 police:{hp:14,w:13,h:24,speed:58,range:180,cooldown:2.8,points:80,air:false,mass:1},
 patrol:{hp:42,w:48,h:23,speed:92,range:200,cooldown:2.9,points:130,air:false,mass:1.3},
 soldier:{hp:20,w:14,h:26,speed:55,range:220,cooldown:3.2,points:100,air:false,mass:1},
 apc:{hp:95,w:52,h:26,speed:60,range:255,cooldown:3.7,points:260,air:false,mass:3},
 tank:{hp:155,w:59,h:31,speed:41,range:320,cooldown:5.2,points:400,air:false,mass:4},
 helicopter:{hp:95,w:49,h:22,speed:98,range:220,cooldown:4.2,points:350,air:true,mass:2},
 artillery:{hp:105,w:47,h:25,speed:0,range:900,cooldown:6.5,points:300,air:false,mass:4},
 emplacement:{hp:85,w:29,h:25,speed:0,range:420,cooldown:3.9,points:200,air:false,mass:5},
 jet:{hp:90,w:61,h:15,speed:330,range:900,cooldown:1.5,points:400,air:true,mass:3},
 bomber:{hp:135,w:75,h:20,speed:185,range:800,cooldown:3.6,points:500,air:true,mass:4},
 // Police boat: a naval unit (stays on the water, floats at the surface). Plays like the patrol car: weak, fast, one shot a burst.
 boat:{hp:30,w:50,h:20,speed:125,range:210,cooldown:2.7,points:150,air:false,mass:1.2},
 // Warships (Bay Bridge): naval units on the water. The gunboat plays like the tank (a telegraphed shell), the destroyer like the artillery (long-range lobbed shells).
 gunboat:{hp:120,w:92,h:30,speed:46,range:380,cooldown:4.6,points:380,air:false,mass:5},
 destroyer:{hp:300,w:210,h:50,speed:20,range:1000,cooldown:6.2,points:1000,air:false,mass:14},
};

export const WEAPON_CONFIG = {
 bullet:{speed:285,damage:1.2,radius:0,strength:0,interceptable:false},
 shell:{speed:290,damage:12,radius:57,strength:230,interceptable:false},
 rocket:{speed:210,damage:9,radius:51,strength:190,interceptable:true},
 bomb:{speed:0,damage:14,radius:75,strength:290,interceptable:true},
 artillery:{speed:0,damage:15,radius:80,strength:320,interceptable:false},
};

// Military rework: readable heavy threats, waves instead of a trickle, and destruction with weight.
export const MILITARY_FEEL = {
 // Small arms are flavour, not attrition: bullet damage x this per kaiju stage (Stage 3 shrugs them off and only sparks).
 bulletStage:[.5,.2,0],
 // Wind-ups: the heavy hitters aim (tracking until lockAt seconds are left), lock, then fire at the locked point, so moving dodges.
 tankWindup:.75,heliWindup:.7,jetWindup:.6,lockAt:.28,heliGunBurst:4,
 // Hitting a unit mid wind-up cancels the shot and stuns it; pays bonus points and Ultimate charge.
 stunSeconds:1.3,interruptPoints:150,interruptUltimate:6,
 // Squads: reinforcements arrive as a whole squad (core + escorts) from one side, staggered waveSpacing px apart offscreen,
 // announced once. A tier picks its templates in rotation. The next squad comes once at most squadClear of the current one is
 // left (after squadBreather seconds), or after squadMax[tier] seconds regardless (threat and city pressure shorten that).
 // Destruction (threat) adds up to squadEscalate extra escorts. Squads are trimmed to the tier's cap, but wait (rechecking every
 // squadRetry seconds) until at least squadMinFit of the squad fits, so no straggler squads.
 waveSpacing:70,squadClear:.3,squadBreather:5,squadMinFit:.6,squadRetry:2,squadMax:[24,22,20,18,26],squadEscalate:2,
 squads:[
  [{label:'POLICE RESPONSE',core:['patrol',6],escort:['police',4]},{label:'RIOT POLICE',core:['patrol',3],escort:['police',8]}],
  [{label:'NATIONAL GUARD',core:['apc',2],escort:['soldier',6]},{label:'POLICE BACKUP',core:['patrol',4],escort:['police',6]},{label:'CONVOY',core:['apc',3],escort:['patrol',2]}],
  [{label:'ARMOR COLUMN',core:['tank',2],escort:['soldier',6]},{label:'GUNSHIPS',core:['helicopter',2],escort:['soldier',4]},{label:'MECHANIZED',core:['apc',3],escort:['soldier',4]},
   {label:'ARTILLERY BATTERY',core:['artillery',2],escort:['emplacement',1],extra:['soldier',4]},{label:'POLICE CORDON',core:['patrol',4],escort:['police',6]}],
  [{label:'AIR STRIKE',core:['jet',3]},{label:'BOMBING RUN',core:['bomber',2],escort:['jet',1]},{label:'HEAVY ARMOR',core:['tank',3],escort:['apc',2]},
   {label:'GUNSHIPS',core:['helicopter',3],escort:['tank',2]},{label:'INFANTRY ASSAULT',core:['soldier',8],escort:['police',4]},{label:'ARTILLERY BATTERY',core:['artillery',2],escort:['emplacement',2]}],
  [{label:'SUPPORT',core:['tank',1],escort:['soldier',4]},{label:'AIR SUPPORT',core:['helicopter',1],escort:['soldier',3]}],
 ] as {label:string,core:[string,number],escort?:[string,number],extra?:[string,number]}[][],
 // Spotters: one soldier per squad carries a radio. Alive and onscreen for spotterSeconds, it calls an artillery
 // strike on the kaiju (a big marked shell after strikeFlight seconds). Killing it first cancels the call.
 spotterSeconds:6,strikeFlight:2.4,strikeDamage:18,strikeRadius:105,strikeStrength:360,
 // Destroyed heavies (mass >= blastMass) explode: radius blastRadius + mass x blastPerMass, damage blastDamage x mass to other
 // military, credited to whoever made the kill. Downed aircraft fall and crash with crashRadius/crashDamage.
 blastMass:3,blastRadius:40,blastPerMass:12,blastDamage:9,crashRadius:90,crashDamage:40,airGravity:520,
 // Knocked-back ground units hop (troops fly in an arc); Stage 2+ crushes ground vehicles it walks into.
 hopLift:.8,hopMax:320,unitGravity:900,crushStage:2,
 // Presentation (game.ts): kaiju hurt flash/jolt, hit-stop on heavy hits, wreck launch and burn.
 hurtFlash:.09,sparkFlash:.05,hurtJolt:9,hurtHitstop:.035,hurtHitstopPerDamage:.004,hurtHitstopMax:.09,
 deathHitstop:.04,deathHitstopPerMass:.014,deathHitstopBig:.04,deathHitstopMax:.14,
 wreckLaunch:[260,460],wreckThrowDamage:18,wreckBurn:7,ghostDelay:.45,ghostDrain:28,
};

export const CAMPAIGN = {
 strongholdHP:700,strongholdShards:24,bossHP:750,bossSpeed:110,bossMeleeDamage:7,
 bossShotDamage:5,bossTelegraph:.8,bossMeleeCooldown:2.4,bossRangedCooldown:3.8,
 bossShotSpeed:220,bossDamagePoints:2,bossKnockback:190,bossTurnDelay:.25,
 bossWidth:78,bossHeight:106,bossRange:90,bossShotLife:5,bossShotCap:12,
};
export const BUILDING_PRESETS={
 s:{w:80,h:150,hp:190,value:140,kind:'medium'},
 m:{w:112,h:240,hp:300,value:220,kind:'medium'},
 h:{w:130,h:330,hp:420,value:290,kind:'medium'},
 l:{w:150,h:420,hp:620,value:400,kind:'large'},
 t:{w:32,h:43,hp:20,value:20,kind:'tiny'},
 b:{w:42,h:48,hp:230,value:80,kind:'large'},
 x:{w:108,h:520,hp:780,value:520,kind:'medium'},
 n:{w:64,h:460,hp:540,value:340,kind:'medium'},
 L:{w:190,h:500,hp:1200,value:1000,kind:'large'},
 // City systems (src/city.ts): a fenced power substation and a fuel depot. Low yards you walk past like a newsstand (tiny kind,
 // so they never wall off a street) but they do not break on contact; you have to attack them. Not liftable.
 S:{w:96,h:64,hp:240,value:200,kind:'tiny'},
 F:{w:92,h:70,hp:160,value:150,kind:'tiny'},
 // Armory (city systems): a solid castle-style drill hall; destroying it cuts off reinforcements from its side for a while.
 K:{w:124,h:100,hp:380,value:260,kind:'medium'},
 // San Francisco Act 1: w = a low arched pier shed, r = a low-rise brick row house, d = a department store.
 w:{w:190,h:96,hp:200,value:150,kind:'medium'},
 r:{w:96,h:128,hp:170,value:130,kind:'medium'},
 d:{w:170,h:250,hp:520,value:380,kind:'medium'},
 // San Francisco Act 2: P = the cable car powerhouse (a solid brick barn; destroying it sets every cable car on the hill loose).
 P:{w:150,h:110,hp:300,value:300,kind:'medium'},
} as const;

// Open-district exploration rewards. Neither drops crystals, so they never speed up evolution.
export const EXPLORE = {
 landmarkUltimate:25,cacheUltimate:30,cachePoints:2500,
 minimapX:300,minimapY:502,minimapW:360,minimapH:22,
};

// Hit feel: hitstop freezes the simulation briefly; buildings jolt/flash, keep holes where struck and shed chunks.
// Tall buildings topple away from the blow as a rigid rotation and crush whatever they land on (chain reactions).
export const FEEL = {
 hitstopBase:.02,hitstopPerDamage:.0004,hitstopMax:.1,hitstopCollapse:.07,hitstopTopple:.11,
 // Follow-up hits (shockwaves, debris, lava, punted cars) may freeze the game at most once per this many seconds.
 hitstopEcho:.9,
 joltSeconds:.14,joltPixels:5,holeCap:14,holeMin:9,holeMax:24,holeDamage:7,holeInset:14,
 chunkCap:160,chunkLife:2.6,chunkGravity:900,
 liftHeight:50*CITY_SCALE,
 // Stage 3 can rip up whole buildings (no landmarks) up to this height/width, i.e. every 's'/'m' preset (the 112x240 mid-rise) but not
 // the 'h' 130x330 tower or taller; thrown with mass = area/liftMassArea clamped.
 liftHeightStage3:240*CITY_SCALE,liftWidthStage3:115*CITY_SCALE,liftMassArea:2500*CITY_SCALE**2,liftMassRange:[3,6] as [number,number],
 toppleMinHeight:200*CITY_SCALE,toppleKick:.35,toppleAccel:5.5,toppleUnitFactor:.6,
 // Crush damage: height × toppleDamage for the first building hit; each further building in the path takes toppleFalloff of the last,
 // and a building toppled by another falls at toppleChain^generation strength, so chains die out. Kaiju stage does not scale it.
 toppleDamage:.5/CITY_SCALE,toppleFalloff:.35,toppleChain:.35,
};

// Traffic, vehicle physics and grab/throw. Mass (VEHICLE_SPECS) slows throws/punts and scales impact damage.
export const VEHICLES = {
 gravity:900,restitution:.35,friction:.6,bounceMin:220,
 kickSpeed:230,kickLift:210,kickDamage:.6,shotPush:.4,
 // After any punt a vehicle shrugs off further ranged pushes (shots, waves) for this long, so a stream of fire can't juggle it.
 puntShield:.6,
 // Sustained sources (acid splash, flame cone, pools) nudge a vehicle once, then leave it alone for this long (it still corrodes/burns).
 sustainedCalm:3,
 throwSpeed:780,throwLift:230,throwMassExp:.25,upSpeed:150,upLift:660,throwDamage:42,holdSlow:.85,grabReach:46,
 impactKeep:.45,unitKeep:.7,chainPush:.6,
 trafficInterval:1.1,trafficCap:12,trafficPerScreen:10,trafficSpeed:[90,150],trafficPoints:.5,spawnMargin:60,despawn:1500,
 busChance:.12,vanChance:.22,panicRange:270,panicDecel:520,panicSpeed:1.7,
 laneOffset:[5,17],vehicleCap:160,
 // Each authored parked spot is a row: the original car plus parkedRow more, bumper to bumper (parkedGap px) eastward,
 // alternating lanes, with a van or bus mixed in.
 parkedRow:2,parkedGap:10,
 // Lampposts stand every lampSpacing px; uprooted they become a light javelin that pierces troops and vehicles.
 lampSpacing:Math.round(450*CITY_SCALE),lampLift:110,lampPierce:.95,
 // Thrown road vehicles detonate on their first impact (anything solid, or the street): a blast of radius
 // blastRadius + mass x blastPerMass dealing blastDamage x impact weight x stage multiplier, then they tumble on as burning wrecks.
 blastRadius:55,blastPerMass:18,blastDamage:26,blastBounce:240,blastKeep:.35,
 // Civilian wrecks get the military kill treatment: hit-stop, shake, a fireball scaled by mass; punted ones burn as they tumble.
 wreckFireball:12,wreckPerMass:8,crushHitstop:.025,
};

// Movement and aerial attacks. Run: hold Shift or double-tap A/D (the double-tap opens with a short dash burst). Running
// shoulder-barges buildings and troops it hits, and a running jump carries run speed through the air (a leap).
// Airborne, steering into a wall grabs it (leap-grab); feet near the roof pull straight up onto it (ledge grab).
// Pushing into the wall while clinging climbs like W. Slam: S in the air dives straight down; the landing hits what is under
// you (the roof you land on takes diveRoofMult) plus a radius, scaled by how far you fell; crashing through a roof keeps the dive going.
// Pound: S+J (crouched light) beats down on whatever you stand on, so on a rooftop it pounds the building under your feet.
export const MOVE = {
 runSpeed:1.8,dashSpeed:2.7,dashSeconds:.2,doubleTap:.28,runJumpLift:1.08,jumpStageExp:.25,
 // A barge/gore only lands after a run-up: bargeRunUp px (x stage scale) covered running the same way; each hit resets it.
 bargeDamage:26,bargeCooldown:.45,bargeRunUp:90,bargeUnitDamage:18,bargeKnockback:260,
 ledgeGrab:.45,wallLeap:1.6,grabCooldown:.22,
 diveSpeed:900,diveSteer:.35,diveDamage:48,diveRoofMult:1.7,diveRadius:80,diveFallBonus:300,diveFallMax:1.5,
 diveKnockback:300,diveWaveRange:200,diveWaveSize:.6,diveWaveDamage:.45,diveCooldown:.35,
 diveSpin:16,
 // Street roll: a street Slam with a direction held keeps the spike ball rolling (forms whose dive strip spins, i.e. Mogurodon).
 // It plows troops/cars/growths once each, ricochets off the first wall with a hop, and bursts out at the second wall or on time.
 rollSpeed:2.6,rollSeconds:.9,rollDamage:30,rollWallDamage:70,rollKnockback:320,rollHop:.45,rollAfterBounce:.45,
 // Kaiban: Gore Charge multiplies the running barge and launches cars high; Meteor Drop flings a ring of rocks on landing
 // (half each way, angles from meteorAngle, speeds meteorSpeed x sqrt(stage scale) x drop power, meteorDamage each).
 goreMult:2.2,goreUnitMult:1.6,goreLift:2.4,meteorRocks:10,meteorSpeed:[260,480],meteorAngle:[25,72],meteorDamage:12,
 // Tlézcatl: Magma Dive splashes lavaGlobs molten globs out both ways on landing (angles lavaAngle, speeds lavaSpeed x sqrt(stage
 // scale) x drop power, lavaDamage each on the first thing hit). A street landing leaves a lava pool under him, and every glob that
 // reaches the street leaves a small one: pools burn whatever stands in them for lavaPoolDamage every lavaPoolTick until they cool.
 // Belial: Acid Pounce corrodes everything the landing strikes to pounceStacks (one more from a pounceFullPower drop) and, on the
 // street, lays acid puddles across pouncePoolWidth x his body width (x power, capped at 1.5) under the impact.
 pounceStacks:2,pounceFullPower:1.8,pouncePoolWidth:1.4,
 lavaGlobs:8,lavaSpeed:[220,420],lavaAngle:[30,70],lavaDamage:10,lavaPoolSeconds:2.2,lavaPoolTick:.25,lavaPoolDamage:6,lavaPoolWidth:1.3,lavaGlobPool:46,
 // His grounded heavy splashes heavyLavaGlobs (+2 near full charge) from the impact point, at drop power heavyLavaPower[0..1] by
 // charge, and on the street leaves a pool heavyLavaPoolWidth x body width there.
 heavyLavaGlobs:4,heavyLavaPower:[.6,1.2],heavyLavaPoolWidth:.5,
 poundMult:1.25,poundCooldown:.34,poundKnockback:120,
 // Myrmex's wings: he can't fly, but jumps myrmexJump x higher, gets myrmexAirJumps more wing-beat jumps in the air (each
 // myrmexAirJump of a ground jump's launch; they refill on landing or grabbing a wall), and floats: gravity is x myrmexRiseGravity
 // going up and x myrmexFallGravity coming down, and he falls no faster than myrmexFallMax (myrmexGlideMax while Space is held),
 // both x sqrt(stage scale). A slam dive ignores all of it.
 // Myrmex's Venom Bomb (L, ground, air or wall): hold to brew a venom bomb on the stinger (charge 0-1 over cloudCharge seconds;
 // he walks at cloudSlow while brewing), release to throw it: it leaves the stinger (the throw strip's `mouth`) on the throw's impact
 // frame at bombSpeed (x .6 empty to x1 full charge, x sqrt(stage scale)), bombAngle above level (bombLob more with W held), falling
 // at bombGravity. It hits the first thing in its path for bombDamage (x .5 to x1 by charge) and bursts into a poison cloud of radius
 // cloudRadius[0..1] by charge (x sqrt(stage scale)) that hangs for cloudSeconds, drifting cloudDrift the way he threw it and
 // swelling by cloudGrow, poisoning every troop (aircraft too) and the rival inside it: poisonDamage every poisonTick for
 // poisonSeconds after they leave (a fresh dose resets the timer). At most cloudMax clouds at once. A burst on or near the street
 // also leaves a venom puddle spitPool wide for spitPoolSeconds.
 cloudCharge:1.2,cloudSlow:.5,spitCooldown:.7,bombSpeed:620,bombAngle:20,bombLob:20,bombGravity:900,bombDamage:30,bombSize:[5,12],
 cloudRadius:[70,150],cloudSeconds:5,cloudDrift:18,cloudGrow:.3,cloudMax:4,
 poisonSeconds:3,poisonTick:.5,poisonDamage:5,spitPool:60,spitPoolSeconds:3,spitPoolDamage:2,
 myrmexJump:1.12,myrmexAirJumps:2,myrmexAirJump:.78,myrmexRiseGravity:.8,myrmexFallGravity:.45,myrmexFallMax:260,myrmexGlideMax:120,
};

// City systems: the rampage multiplier and structures with jobs (src/city.ts; wired up in src/game.ts).
export const CITY = {
 // Rampage: heat 0-100 climbs with every point earned (gainPerRootPoint x sqrt(points), at most gainMax per award) and with damage
 // dealt to buildings (gainPerDamage). After `grace` seconds without any it drains at `decay`/s. Thresholds pick the score multiplier.
 rampageLevels:[0,15,38,62,85],rampageMult:[1,1.5,2,3,4],rampageGrace:2.4,rampageDecay:12,
 gainPerRootPoint:.3,gainMax:18,gainPerDamage:.06,
 // Extra heat for set pieces.
 toppleHeat:6,explodeHeat:14,blackoutHeat:12,splashHeat:5,radarHeat:10,wireHeat:4,
 // Substation down: its grid goes dark. Rooftop radars there go offline, spotter radios there lose signal, live wires go dead.
 blackoutPoints:2500,
 // Fuel depot: blows up when destroyed. Damage hits military, buildings (x buildingFactor) and vehicles in `radius`;
 // other depots inside the radius go up too. Leaves burning fuel on the street.
 depotRadius:Math.round(170*CITY_SCALE),depotDamage:130,depotBuildingFactor:1.1,depotFire:Math.round(150*CITY_SCALE),depotFireSeconds:7,depotFireDamage:7,
 // Rooftop air-defence radar: while its grid is powered and its building is in view within radarRange of the kaiju it builds a call;
 // at radarCall seconds it brings down a marked artillery strike. Climb up (or shoot it) and break it.
 radarHP:70,radarCall:11,radarRange:Math.round(650*CITY_SCALE),radarPoints:3000,radarUltimate:15,
 // Water tower: break it and the tank dumps onto the street, washing troops and cars away from the spot and dousing fires.
 tankHP:30,tankPoints:400,splashRadius:Math.round(190*CITY_SCALE),splashDamage:10,splashKnockback:420,splashStun:1.2,
 // Power poles (lamp-kind props): one knocked down on a powered grid drops a live wire across the street between its neighbours
 // for wireSeconds, shocking (and stunning) ground units every wireTick.
 poleH:Math.round(110*CITY_SCALE),wireSeconds:9,wireTick:.35,wireDamage:9,wireStun:.9,
 // Delayed collapse: a destroyed tower creaks this long (direct hit / chain) before it starts to fall.
 creakSeconds:.6,creakChain:.3,
 // Debris that hits: slabs from collapses deal this to ground units they land on (cars get punted).
 slabDamage:22,slabCount:5,
};

// Floor stacks (src/rules.ts floor helpers, effects in src/game.ts). Every ordinary building is a stack of floors about floorHeight
// tall. Each hit also wears down the floor it lands on; a floor's integrity is integrity x its share of the building's HP, so a
// floor only gives out if blows keep landing on it. A failed floor below others pancakes (everything above drops one floor, crushing
// what is at the foot of the building); a failed top floor is knocked off. HP and destruction are unchanged: the building still
// goes down (and towers still topple) when its HP runs out, just shorter if floors have already failed.
export const FLOORS = {
 floorHeight:Math.round(40*CITY_SCALE),integrity:2.4,minFloors:2,
 pancakeDamage:24,pancakeKnockback:180,pancakePoints:150,pancakeHeat:6,topPoints:100,topHeat:4,
 // Shearing: a single blow of at least shearDamage landing on a middle floor (not the bottom one or the top two) of a building with
 // shearMinFloors or more breaks it there. That floor is crushed and everything above comes off as one flying chunk (a building prop)
 // thrown the way the blow went, spinning, that smashes what it hits and breaks up where it lands. The stump keeps the floors below.
 shearDamage:140,shearMinFloors:4,shearSpeed:150,shearLift:140,shearSpin:1.4,shearImpact:16,shearPoints:.5,shearHeat:12,
};

// Depth bands (blocks with `bands`, src/water.ts): the water's depth at x (surface to bed) against the kaiju's standing height.
// Under shallow is the shallows (shallowSlow, splashes); up to deep is wading (wadeSlow, no running, jumps at wadeJump, lower body hidden
// under the front water); over deep is over your head: the shore is a drop-off you won't walk off, and ending up in it drowns you.
// Drowning: sink for sinkSeconds, the camera slides back to the last safe ground over slideSeconds, you respawn there with mercy
// seconds of flashing invincibility, then penaltyDelay later lose penalty HP (never lethal; a stage drop shrinks you, the soft floor
// holds). Feet more than dip below the surface in over-your-head water start it.
export const WATER = {
 shallow:.25,deep:.65,shallowSlow:.85,wadeSlow:.55,wadeJump:.72,frontAlpha:.82,
 dip:10,sinkSeconds:.45,slideSeconds:.8,mercy:2,penaltyDelay:.3,penalty:8,
 // Boats need boatMinDepth of water under them and float boatFloat x their height under the surface; within boatSight they chase,
 // else patrol. A wreck that goes into the water sinks out of sight over wreckSink seconds.
 boatMinDepth:16,boatFloat:.35,boatSight:620,wreckSink:1.1,
};

// Rivers, bridges, subways and armories (phase 3; wired up in src/game.ts, ground handling in src/terrain.ts).
export const RIVER = {
 // Wading: the kaiju moves at wadeSlow in water. Ground troops and vehicles in open water drown/sink (troops never walk in on their
 // own: they stop at the bank, so the bridge is the only way across).
 wadeSlow:.55,
 // Bridge spans: the deck is the street across them while they stand. Break one (pound or slam it from on top, hit it from below,
 // blast it, drop a tower or a sheared top on it) and it falls into the river with everything on it.
 spanHP:420,deckThick:Math.round(12*CITY_SCALE),spanPoints:4000,spanHeat:16,toppleMult:1.4,chunkDamage:45,
 // Subway: a slam on the street over the line, or a tower landing across it, caves the street in: a pit pitDepth deep (at least
 // pitMin wide) that troops fall into (fallDamage) and cannot climb out of. While any pit is open a train runs through every
 // trainEvery seconds, hitting what is down there.
 pitDepth:Math.round(58*CITY_SCALE),tunnelRoof:Math.round(22*CITY_SCALE),
 // A block with `tunnel: 'deep'` (San Francisco) digs deeper: deepPitDepth below the street under a deepTunnelRoof roof, about 80px
 // of tunnel, room for a Stage 1 kaiju standing. Every other block keeps pitDepth/tunnelRoof.
 deepPitDepth:110,deepTunnelRoof:30,
pitMin:Math.round(100*CITY_SCALE),pitPoints:600,pitHeat:8,fallDamage:40,
 // Trains run the line every trainEvery seconds whether or not the street is open, seen in cutaway under the street. Through a pit
 // they can be attacked (trainHP); one that hits the kaiju standing in a pit derails (the kaiju takes trainHitDamage and a shove).
 // A derailed train stays in the tunnel and the next one piles into it. After trainWrecks derailments the line is closed: no more
 // trains run. The tunnel roof (tunnelRoof below the street) leaves a solid band of street over the line; pits cut through it.
 trainEvery:5,trainSpeed:950,trainLength:Math.round(240*CITY_SCALE),trainDamage:90,trainHP:200,trainPoints:3000,trainHeat:15,
 trainHitDamage:5,trainKnock:320,trainWrecks:3,
 // A car driving into a pit careens off the edge and goes up when it lands.
 careenSpeed:1.15,careenLift:90,careenDamage:30,
 // Armory: destroying one stops squads arriving from its side of the block for armorySeconds.
 armorySeconds:40,armoryPoints:3000,armoryHeat:12,
};

// Phase 5: fire, rubble and the per-city twists (wired up in src/game.ts).
export const FIRE = {
 // A burning building takes dps x heat (heat climbs to 1 at grow/s); every spreadEvery seconds each neighbour within reach builds
 // exposure (spreadChance x heat) and catches when it reaches 1. Scorched walls and pools beside a wall build exposure at poolChance/s. At most cap buildings burn at once. Rain (Tokyo) halves growth and spread; a water tower douses.
 // Fire damage pays points but never charges the Ultimate. Sources: depot blasts, burning wrecks smashing into walls (wreckChance), fuel and flame
 // pools on the pavement within poolReach of a wall (poolChance per second).
 dps:7,grow:.12,spreadEvery:1.2,spreadChance:.35,reach:Math.round(36*CITY_SCALE),cap:6,poolChance:.35,start:.25,wreckChance:.35,poolReach:Math.round(24*CITY_SCALE),
};
export const RUBBLE = {
 // Destroyed buildings leave rubble mounds you can climb: a collapse heaps heightK x height (min..max) over its footprint, a toppled
 // tower leaves a ridge `ridge` high along where it fell. Mound sides slope over `side` of their width.
 heightK:.12,min:Math.round(8*CITY_SCALE),max:Math.round(30*CITY_SCALE),ridge:Math.round(16*CITY_SCALE),side:.3,
};
export const TWISTS = {
 // Mexico City: soft lake-bed ground. Slams, topple landings and blasts within sinkRadius sink nearby buildings sinkStep px (and
 // sinkDamage); a building sunk past sinkMax of its height gives way.
 sinkRadius:Math.round(170*CITY_SCALE),sinkStep:Math.round(9*CITY_SCALE),sinkDamage:30,sinkMax:.3,
 // Paris: catacombs under every street. Slams cave in anywhere (no trains), catacombDepth deep.
 catacombDepth:Math.round(46*CITY_SCALE),
 // Hong Kong: towers packed shoulder to shoulder go down like dominoes: crush falloff and chain strength are higher.
 dominoFalloff:.65,dominoChain:.7,
 // Tokyo: quake-proof towers (quakeHeight and taller) shrug off half of any blow under quakeBreak and sway instead.
 quakeHeight:Math.round(200*CITY_SCALE),quakeBreak:60,quakeKeep:.5,swaySeconds:.8,
};

// City response (phase 5b): the city escalates as the block's destruction climbs past each threshold. Evacuation: every civilian
// flees and roadblocks (barriers, `roadblocks` each side) go up ahead of the kaiju. Martial law: the military response steps up a tier
// and the buildings still standing are reinforced (`reinforce` x HP). Air strike: a bombing run walks marked strikes across the kaiju
// (`bombs` of them, `bombGap` px apart, `bombStep` s apart), again every `bombEvery` s.
export const RESPONSE = {
 thresholds:[.2,.45,.65],labels:['EVACUATION','MARTIAL LAW','AIR STRIKE'],roadblocks:2,roadblockOffset:Math.round(380*CITY_SCALE),
 // The air-strike stage only comes in a city's blocks from airStrikeFrom on (block 1 tops out at martial law).
 airStrikeFrom:1,reinforce:1.2,bombs:5,bombGap:Math.round(110*CITY_SCALE),bombStep:.4,bombEvery:20,
};
// Water mains (phase 5b): hydrants along district streets. Knock one over and the main bursts into a geyser for `seconds`: troops in
// `radius` are shoved away and stunned every `tick`, cars pushed, fires doused.
export const MAINS = {every:3,seconds:4,radius:Math.round(110*CITY_SCALE),tick:.5,damage:6,knockback:300,stun:.8,points:250,heat:6};
// Tunnelling (phase 5b): at Stage 3 a shoulder barge at street level bursts a walk-through tunnel in a building
// at least `minHeight` x the kaiju's height tall.
export const TUNNEL = {minHeight:1.25,points:800,heat:8};

// Elevated railway (phase 5b, Tokyo): a guideway `height` above the street on pillars every `pillar` px, in breakable spans
// (`spanHP`). The kaiju can stand on it. Trains run along it every `trainEvery` s; one that reaches the kaiju on (or level with) the
// track smashes into it and is thrown off, falling to the street to explode; one that reaches a broken span falls through.
export const ELEVATED = {height:Math.round(72*CITY_SCALE),pillar:Math.round(260*CITY_SCALE),thick:Math.round(13*CITY_SCALE),spanHP:300,
 trainEvery:6,trainSpeed:620,trainLength:Math.round(200*CITY_SCALE),points:2500,heat:14,trainPoints:3000,hitDamage:4,knock:280};

// San Francisco Act 1 (redesign phase 3): the Embarcadero, Union Square and Chinatown mechanics. All opt-in per level (src/levels.ts).
export const SF = {
 // Tunnel pocket: a breakable roof box over a sealed pit. Hit it from below (a jump into it, a heavy attack) until it gives.
 pocketHP:240,pocketWall:34,pocketThick:28,pocketPoints:600,pocketJump:60,
 // Targets (stronghold kind): a clock tower is tall and narrow, a command post wide and low. HP is CAMPAIGN.strongholdHP.
 clockW:84,clockH:170,commandW:150,commandH:78,
 // The crystal formation under Portsmouth Square: a big growth. Shattering it lifts the cap (liftCap) and grows the kaiju to Stage 2.
 formationW:132,formationH:150,formationHP:700,formationShards:40,
 // Garage cave-in: a slam over the garage opens a pit of parked cars (garageCars of them, pitDepth deep like a subway pit).
 garageCars:7,garagePoints:900,garageWidth:560,
 // Fireworks shop: destroyed, it goes off for fireworksSeconds: fireballs and a fire pool, and it lights neighbours within fireworksReach.
 fireworksSeconds:5,fireworksReach:150,fireworksDamage:5,fireworksBlast:70,fireworksPoints:700,
 // Lantern strings: a fuse of lanterns between two rooftops. Fire reaching either end runs along it at lanternSpeed px/s, lighting
 // a flame at each lantern (lanternSpacing apart) that burns lanternBurn s and sets the walls under it alight (FIRE system).
 lanternSpeed:140,lanternSpacing:46,lanternBurn:.9,lanternHeight:150,lanternPoints:60,
 // Fire trucks: drive to the nearest blaze, park, spray. Spraying douses fire pools in sprayReach and slows building fire spread a little.
 truckSpeed:70,truckSprayReach:170,truckSlow:.6,truckPark:40,
 // Police helicopter (a reskinned helicopter, spawned by a level's `air`), SWAT (reskinned soldiers: `swat`).
 // National Guard: when Chinatown's exit opens, guardSoldiers soldiers and an APC roll in from the east edge.
 guardSoldiers:4,guardApc:1,
};

// Runaway cable cars (SF Act 2, Nob Hill). A vehicle in the `rolling` state is driven by the street's slope alone: it picks up
// `gravity` px/s² per unit of slope (rise over run) toward downhill, loses `friction` px/s² to rolling resistance (so on flat
// ground it coasts to a stop below `stopSpeed`), and tops out at `maxSpeed`. Cable cars on their line (`cable` state) shuttle at
// `cableSpeed`; when the powerhouse goes down every one is shoved loose at `shove`. On a building it hits for
// impactDamage x mass x (speed / impactRef, clamped); a building it destroys is bowled through (the car keeps `plowKeep` of its
// speed and has `plows` of them in it), a building left standing wrecks it (it is launched on the careening-car rules, so it goes up
// when it lands). Troops and vehicles in its way take unitDamage and are shoved.
export const RUNAWAY = {
 gravity:1700,friction:90,maxSpeed:560,stopSpeed:14,shove:110,cableSpeed:46,
 plows:3,plowKeep:.78,impactDamage:200,impactRef:260,impactMin:.3,impactMax:1.6,crashLift:130,crashSpeed:.35,crashDamage:30,unitDamage:30,
 // Parked cars on a level's `tumble` slope (Lombard Street) are let go when the camera comes within tumbleRange; each is nudged by `shove`.
 tumbleRange:1000,tumbleStagger:.18,points:150,
};

// SF Act 2 (Financial District, Fisherman's Wharf). Targets: the pyramid tower is a very tall narrow stronghold target; the Coast Guard
// cutter is a floating one (src/ship.ts): it rides the water at the waterline, takes damage like any objective and sinks when it is
// destroyed (sinkSeconds to go under, listing as it goes). `scale` on a level's target grows or shrinks a ship (the aircraft carrier
// of a later level is the same hull at a bigger scale). The hull is hit from the water or from the deck.
export const SF2 = {
 pyramidW:150,pyramidH:640,
 cutterW:330,cutterH:96,cutterDeck:34,sinkSeconds:5,sinkDepth:1,listMax:.16,
 // The bank vault (a cache building tagged `vault`): cracked open it spills gold: goldPoints and goldBursts of gold-coloured bursts.
 goldPoints:1500,goldBursts:5,
 // Transit center: a bus terminal under a long roof park (the elevated system, drawn as a park). A span that falls onto a bus
 // wrecks it (busCrush damage, points per bus).
 busCrush:60,busPoints:250,
 // Sea lions on Pier 39: they flop away from the kaiju once it is within lionAlarm and dive into the water at the pier edge.
 lionAlarm:420,lionSpeed:90,lionHop:150,lionPoints:30,
 // Kaiban's silhouette wades across the bay behind the fog, roaring when the kaiju reaches its trigger.
 kaibanSpeed:14,kaibanRoar:3,
 // Roof fixtures of the Wharf and the Financial District: hit points and the score for smashing each.
 roofHP:{sign:40,crab:60,helipad:90} as Record<'sign'|'crab'|'helipad',number>,roofPoints:{sign:600,crab:800,helipad:900} as Record<'sign'|'crab'|'helipad',number>,
};
// Fog (Fisherman's Wharf; the Golden Gate reuses it): a level's `fog` is {from, to, max}: the overlay is clear before `from`,
// thickens linearly to `max` (0-1 opacity) at `to`, and holds. `tint` is the fog colour.
export const FOG = {tint:'#d9dee0',drift:6};

// SF Act 3 (redesign phase 5): The Fault (Level 7). Fault cracks are set off by a slam or a pound within `reach` of them (an Ultimate
// within `ultReach`); each sets off a district quake: everything within `radius` (`ultRadius` for an Ultimate) shakes (`sway` s),
// takes damage that falls off with distance, and a shockwave rolls out both ways from the crack. The quake bursts the gas mains
// within `mainRadius`. The last crack is the Big One: the whole level shakes for `bigSeconds`, every building is hit, and the
// freeway pancakes: each column's upper deck gives way (a `pancakeGap` s after the one before), the lower deck `pancakeDrop` s later,
// crushing what is under it for `crushDamage`.
export const CRACK = {
 reach:Math.round(260*CITY_SCALE),ultReach:Math.round(620*CITY_SCALE),radius:Math.round(700*CITY_SCALE),ultRadius:Math.round(1150*CITY_SCALE),
 damage:46,ultDamage:92,sway:2.2,shake:12,ultShake:20,waveDamage:30,mainRadius:Math.round(560*CITY_SCALE),points:1800,shards:14,
 deckGap:Math.round(80*CITY_SCALE),pancakePoints:700,bigSeconds:6,bigDamage:60,bigShake:16,pancakeGap:.28,pancakeDrop:.55,crushDamage:70,crushKnock:200,unitStun:1.2,unitDamage:20,
};
// Gas mains (The Fault): the hydrants of a level with `gas` are gas mains. A burst main is a fire geyser for `seconds`: it burns
// troops and cars within `radius` (`dps`, ticking every `tick`) and sets every building within `ignite` alight. `fireCap` on the
// level raises FIRE.cap (how many buildings may burn at once).
export const GAS = {seconds:7,radius:Math.round(120*CITY_SCALE),ignite:Math.round(150*CITY_SCALE),tick:.5,damage:9,knockback:260,points:400,heat:8,height:190,fireCap:16};

// SF Act 3: Bay Bridge (Level 8). The bridge decks stand `deckRise` above the water's level (a `bridge` with `rise`); the double-deck west span
// has an upper deck (a long building with stacked-tier hit parts: two climbable towers and a slab `clear` above the lower road, `slab` thick,
// with a `gap` between each tower's legs wide enough for a Stage 3 kaiju). The carrier is the cutter's hull at `scale`; it launches a jet
// every `launchEvery` s while the kaiju is within `range` and fewer than `maxJets` are up, each climbing to cruise over `climb` s.
export const BRIDGE = {deckRise:Math.round(150*CITY_SCALE),clear:Math.round(165*CITY_SCALE),slab:Math.round(22*CITY_SCALE),leg:Math.round(26*CITY_SCALE),gap:Math.round(120*CITY_SCALE),
 upperHP:900,upperPoints:2500,towerHP:700,carrierScale:2.3,launchEvery:7,maxJets:2,range:1500,climb:1.1,carrierPoints:6000};

// SF Act 3: Golden Gate (Level 9). Kaiban waits (a silhouette in the fog) on the span until the kaiju passes `wake`. The fight uses the shared
// rival moves (src/rival.ts) and adds the fog charge: every `chargeEvery` s Kaiban vanishes into the fog (`vanish`), a roar and a growing
// silhouette at the edge of the view telegraph it (`telegraph`), then it charges out at `chargeSpeed` (a hit of `chargeDamage` on contact).
// As its health falls past each break the deck gives way under both kaiju (they end chest-deep at the tower feet). At 0 health it is not
// KO'd: it retreats into the fog (`retreatSpeed`, fading over `retreatFade` s) while the main span comes down (`collapseGap` s apart).
export const GATE = {chargeEvery:13,vanish:.9,telegraph:1.5,chargeSpeed:430,chargeDamage:12,chargeKnock:330,fogDistance:760,chargeOvershoot:380,
 retreatSpeed:140,retreatFade:3.2,collapseGap:.4,wakeShake:12,tower:Math.round(430*CITY_SCALE)};
