// Provisional M1 values. Future balance changes belong here.
export const CONFIG = {
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
 civilianMax:180,carHP:1,
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
 liftHeight:50,
 // Stage 3 can rip up whole buildings (no landmarks) up to this height/width, i.e. every 's'/'m' preset (the 112x240 mid-rise) but not
 // the 'h' 130x330 tower or taller; thrown with mass = area/liftMassArea clamped.
 liftHeightStage3:240,liftWidthStage3:115,liftMassArea:2500,liftMassRange:[3,6] as [number,number],
 toppleMinHeight:200,toppleKick:.35,toppleAccel:5.5,toppleUnitFactor:.6,
 // Crush damage: height × toppleDamage for the first building hit; each further building in the path takes toppleFalloff of the last,
 // and a building toppled by another falls at toppleChain^generation strength, so chains die out. Kaiju stage does not scale it.
 toppleDamage:.5,toppleFalloff:.35,toppleChain:.35,
};

// Traffic, vehicle physics and grab/throw. Mass (VEHICLE_SPECS) slows throws/punts and scales impact damage.
export const VEHICLES = {
 gravity:900,restitution:.35,friction:.6,bounceMin:220,
 kickSpeed:230,kickLift:210,kickDamage:.6,shotPush:.4,
 throwSpeed:780,throwLift:230,throwMassExp:.25,upSpeed:150,upLift:660,throwDamage:42,holdSlow:.85,grabReach:46,
 impactKeep:.45,unitKeep:.7,chainPush:.6,
 trafficInterval:2.1,trafficCap:6,trafficPerScreen:5,trafficSpeed:[90,150],trafficPoints:.5,spawnMargin:60,despawn:1500,
 busChance:.12,vanChance:.22,panicRange:270,panicDecel:520,panicSpeed:1.7,
 laneOffset:[5,17],vehicleCap:70,
 // Lampposts stand every lampSpacing px; uprooted they become a light javelin that pierces troops and vehicles.
 lampSpacing:450,lampLift:110,lampPierce:.95,
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
 lavaGlobs:8,lavaSpeed:[220,420],lavaAngle:[30,70],lavaDamage:10,lavaPoolSeconds:2.2,lavaPoolTick:.25,lavaPoolDamage:6,lavaPoolWidth:1.3,lavaGlobPool:46,
 // His grounded heavy splashes heavyLavaGlobs (+2 near full charge) from the impact point, at drop power heavyLavaPower[0..1] by
 // charge, and on the street leaves a pool heavyLavaPoolWidth x body width there.
 heavyLavaGlobs:4,heavyLavaPower:[.6,1.2],heavyLavaPoolWidth:.5,
 poundMult:1.25,poundCooldown:.34,poundKnockback:120,
};
