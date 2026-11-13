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
 // Tlézcatl's Ultimate (Eruption): planted. On the roar's impact frame the energy detonates out of him, a blast eruptBlastRange
 // (x sqrt(stage scale)) each side of his middle that hits everything in it once for eruptBlastDamage. Then his crest vents a fire
 // column (eruptColumn tall, eruptColumnWidth wide, x sqrt(scale)) that burns aircraft and shots above him every eruptColumnTick, and
 // spits eruptGlobs molten globs evenly through the rest of the Ultimate. They are not aimed: each picks a random landing spot out to
 // eruptRange (x sqrt(scale)) either side, is thrown high (eruptGravity, flying eruptFlight seconds, so it comes down steeply from
 // above the skyline) and hits the first thing it falls onto (never on the way up) for
 // eruptGlobDamage, leaving an eruptPool-wide lava pool on the street. All of it is Ultimate damage, so it never refills the meter,
 // and the pools outlast the Ultimate.
 eruptBlastRange:150,eruptBlastDamage:70,eruptBlastKnockback:320,eruptColumn:300,eruptColumnWidth:56,eruptColumnTick:.15,eruptColumnDamage:16,
 eruptGlobs:36,eruptRange:800,eruptFlight:[1.2,1.6],eruptGravity:1900,eruptGlobDamage:50,eruptGlobSize:10,eruptPool:60,eruptPoolSeconds:3.5,eruptPoolDamage:8,
 // Tlézcatl's grounded ranged (Flame Jet): hold L to breathe a cone of fire from the jaws. A fuel bar drains over jetSeconds of
 // breathing and refills at jetRegen per second; running it dry locks the jet until it is back to jetRelight. A tap still breathes for
 // jetMinBurst. Everything inside the cone takes jetDamage every jetTick (pierces); the cone stops at the first building and at the
 // street. W/S tilt it up to jetUp / down to jetDown degrees at jetTurn deg/s. Length and width grow with sqrt(stage scale). He creeps
 // at jetSlow walking speed while breathing.
 jetSeconds:2,jetRegen:.5,jetRelight:.35,jetMinBurst:.25,jetMinStart:.08,jetTick:.12,jetDamage:7,jetKnockback:30,jetCarPush:.3,
 jetRange:260,jetWidth:[6,34],jetUp:35,jetDown:25,jetTurn:140,jetSlow:.25,jetCooldown:.2,
 superMax:40,superDuration:20,superDamage:1.5,superSpeed:1.18,superResistance:.55,superKnockback:1.5,
 rangedMax:12,staggerSeconds:.32,staggerProtection:.9,knockbackFriction:9,
 scorePenaltyPerHP:10,ambientInterval:5,ambientCount:3,growthInterval:30,growthHP:240,
 shardValue:1,shardCap:120,shardLifetime:90,shardMagnet:90,shardPickup:28,
 buildingShards:1,growthShards:12,growthCap:3,burstRadius:50,
};

// M3 provisional military/civilian tuning. No military collision damage.
export const MILITARY = {
 caps:[5,7,9,12,3],spawnSeconds:[5.5,4.5,3.8,3.2,10],firstSpawn:2,
 threatPressure:.4,spawnVariance:.18,spawnMargin:90,despawnDistance:1400,
 projectileCap:100,wreckCap:24,wreckSeconds:4,bulletLife:4,impactSeconds:.35,
 cityHP:.1,cityDamage:.1,cityPressure:.08,burstGap:.14,rocketGap:.28,
 knockbackFriction:7,collisionImpactMin:100,collisionBuildingDamage:.3,collisionPlayerDamage:.025,
 unitShards:1,civilianPoints:5,carPoints:80,carShards:0,civilianSpeed:62,
 civilianMax:180,carHP:1,
};

// Shared M3 unit and weapon definitions; all combat balance lives here.
export const UNIT_CONFIG = {
 police:{hp:14,w:7,h:13,speed:58,range:180,cooldown:2.8,points:80,air:false,mass:1},
 patrol:{hp:42,w:39,h:19,speed:92,range:200,cooldown:2.9,points:130,air:false,mass:1.3},
 soldier:{hp:20,w:8,h:14,speed:55,range:220,cooldown:3.2,points:100,air:false,mass:1},
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
 shell:{speed:290,damage:9,radius:57,strength:230,interceptable:false},
 rocket:{speed:210,damage:7,radius:51,strength:190,interceptable:true},
 bomb:{speed:0,damage:12,radius:75,strength:290,interceptable:true},
 artillery:{speed:0,damage:13,radius:80,strength:320,interceptable:false},
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
 throwSpeed:580,throwLift:190,upSpeed:150,upLift:660,throwDamage:42,holdSlow:.85,grabReach:46,
 impactKeep:.45,unitKeep:.7,chainPush:.6,
 trafficInterval:2.1,trafficCap:6,trafficPerScreen:5,trafficSpeed:[90,150],trafficPoints:.5,spawnMargin:60,despawn:1500,
 busChance:.12,vanChance:.22,panicRange:270,panicDecel:520,panicSpeed:1.7,
 laneOffset:[5,17],vehicleCap:70,
 // Lampposts stand every lampSpacing px; uprooted they become a light javelin that pierces troops and vehicles.
 lampSpacing:450,lampLift:110,lampPierce:.95,
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
 poundMult:1.25,poundCooldown:.34,poundKnockback:120,
};
