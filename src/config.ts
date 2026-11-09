// Provisional M1 values. Future balance changes belong here.
export const CONFIG = {
 width:960,height:540,ground:435,screenCount:4,moveSpeed:205,crouchHeight:38,
 playerWidth:48,playerHeight:69,gravity:1250,jumpVelocity:530,
 lightDamage:30,heavyDamage:68,rangedDamage:23,attackCooldown:.28,
 heavyCooldown:.62,rangedCooldown:.48,projectileSpeed:540,
 meleeReach:76,exitThreshold:.75,perfectBonus:1500,
 cameraSpeed:5,maxDelta:.04,collapseDuration:.7,particleCap:180,
};

// Provisional M2 combat/evolution tuning; these are implementation defaults.
export const COMBAT = {
 maxHP:100,startHP:24,up:[35,75],down:[25,65],stageScale:[1,1.3,1.65],
 stageDamage:[1,1.25,1.55],stageResistance:[1,.9,.8],transformSeconds:1,
 comboTimeout:.8,inputBuffer:.15,comboDamage:[1,1.1,1.7],comboKnockback:[70,95,200],
 maxCharge:1.5,chargeSlow:.3,chargeDamageBonus:1.6,heavyKnockback:220,
 ultimateMax:100,ultimateGain:.14,ultimateDuration:2.4,ultimatePulse:.24,
 ultimateDamage:58,ultimateSpeed:540,ultimateRange:1100,
 superMax:40,superDuration:20,superDamage:1.5,superSpeed:1.18,superResistance:.55,superKnockback:1.5,
 rangedMax:12,staggerSeconds:.32,staggerProtection:.9,knockbackFriction:9,
 scorePenaltyPerHP:10,ambientInterval:6,ambientCount:3,growthInterval:14,growthHP:120,
 shardValue:3,shardCap:120,shardLifetime:90,shardMagnet:90,shardPickup:28,
 buildingShards:3,growthShards:15,growthCap:3,burstRadius:50,
};

// M3 provisional military/civilian tuning. No military collision damage.
export const MILITARY = {
 caps:[5,7,9,12,3],spawnSeconds:[5.5,4.5,3.8,3.2,10],firstSpawn:2,
 threatPressure:.4,spawnVariance:.18,spawnMargin:90,despawnDistance:1400,
 projectileCap:100,wreckCap:24,wreckSeconds:4,bulletLife:4,impactSeconds:.35,
 cityHP:.1,cityDamage:.1,cityPressure:.08,burstGap:.14,rocketGap:.28,
 knockbackFriction:7,collisionImpactMin:100,collisionBuildingDamage:.3,collisionPlayerDamage:.025,
 unitShards:2,civilianPoints:5,carPoints:80,carShards:1,civilianSpeed:62,
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
 strongholdHP:700,strongholdShards:35,bossHP:750,bossSpeed:110,bossMeleeDamage:7,
 bossShotDamage:5,bossTelegraph:.8,bossMeleeCooldown:2.4,bossRangedCooldown:3.8,
 bossShotSpeed:220,bossDamagePoints:2,bossKnockback:190,bossTurnDelay:.25,
 bossWidth:78,bossHeight:106,bossRange:90,bossShotLife:5,bossShotCap:12,
};
export const BUILDING_PRESETS={
 s:{w:70,h:92,hp:65,value:75,kind:'medium'},
 m:{w:102,h:145,hp:100,value:120,kind:'medium'},
 h:{w:118,h:185,hp:125,value:150,kind:'medium'},
 l:{w:130,h:240,hp:175,value:210,kind:'large'},
 t:{w:32,h:43,hp:20,value:20,kind:'tiny'},
 b:{w:42,h:48,hp:95,value:50,kind:'large'},
 x:{w:96,h:285,hp:190,value:230,kind:'medium'},
 n:{w:58,h:232,hp:110,value:140,kind:'medium'},
} as const;
