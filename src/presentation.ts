import {KAIJU} from './campaign.ts';import type {Permanent} from './campaign.ts';
export const INTRO_DURATION=12;
export const INTRO_SCENES=['AN ASTEROID APPROACHES EARTH','IMPACT','PINK CRYSTALS EMERGE','MONSTROUS EVOLUTION'];
export const ROSTER=[
 {name:'Mogurodon',color:'#a9ab8c',ratings:[3,3,3,3],ending:'The Earth Belongs to Him'},
 {name:'Tlézcatl',color:'#d28e64',ratings:[4,3,3,3],ending:'The World in Flames'},
 {name:'Belial',color:'#a6b783',ratings:[4,5,1,4],ending:'The Great Dissolution'},
 {name:'Kaiban',color:'#b7a08b',ratings:[5,1,5,2],ending:'King of the Ruins'},
 {name:'Myrmex',color:'#ad9fbf',ratings:[3,4,2,5],ending:'The Swarm Ascendant'},
 {name:'Sargathoth',color:'#79ad91',ratings:[4,1,5,4],ending:'The World Reclaimed'},
];
// Original epilogues/illustrations have not been supplied. Do not invent final lore.
export const ENDINGS=ROSTER.map(r=>({name:r.name,title:r.ending,epilogue:null as string|null}));
export const ART_SLOTS:{menu:string|null,intro:(string|null)[],endings:Record<string,string|null>}={menu:null,intro:[null,null,null,null],endings:Object.fromEntries(KAIJU.map(k=>[k,null]))};
// HUD score: sign first, then zero-padded magnitude (-12 -> '-00012'). Scores may go negative.
export function hudScore(n:number,width=6){const v=Math.round(n);const d=String(Math.abs(v));return v<0?'-'+d.padStart(width-1,'0'):d.padStart(width,'0');}
export function introScene(elapsed:number){return Math.max(0,Math.min(3,Math.floor(elapsed/3)));}
export function selectable(p:Permanent,name:string){return KAIJU.includes(name)&&p.unlocked.includes(name);}
export type FreePlayChoice={kaiju:string,city:number,boss:string};
export function validFreePlay(p:Permanent,c:FreePlayChoice){return selectable(p,c.kaiju)&&selectable(p,c.boss)&&Number.isInteger(c.city)&&c.city>=0&&c.city<5&&p.conquered.includes(c.city);}
export function unlockEnding(p:Permanent,name:string){if(!KAIJU.includes(name)||p.gallery.includes(name))return false;p.gallery.push(name);return true;}
export function canViewEnding(p:Permanent,name:string){return KAIJU.includes(name)&&p.gallery.includes(name);}
export function endingFor(name:string){return ENDINGS.find(e=>e.name===name)||ENDINGS[0];}
const images=new Map<string,HTMLImageElement>();
// Final kaiju sprites. Bottom-center anchored, drawn nearest-neighbor. `width` is world units at Stage 1 (hitbox is unchanged).
// Each animation is a horizontal strip of equal-width frames looped at `fps` (generated with PixelLab, see tools/pixellab_animate.py).
// `idle` is required; any other animation falls back to idle until it exists and has loaded.
// `once` strips (attacks) play a single time from t=0 and hold their last frame; the caller ends them via animDuration.
// `impact` marks the frame where a hit lands, for syncing gameplay effects to the art.
// `scale`/`anchor` are for padded strips generated from a shrunken base (room for lunges): `scale` is the art's size relative to a
// full-frame 256px-wide strip (default 1) and `anchor` the frame x that lines up with the kaiju's origin (default: frame centre).
// `hold` (grab/carry strips): frame px where a carried prop's bottom-centre sits, one [x,y] per frame or a single pair for every frame.
// `mouth` (Flame Jet strips): frame px of the jaws, where the flame starts, one [x,y] per frame or a single pair.
// `angles` (an aim strip): the degrees above level each frame's head points; the game shows the frame nearest the aim instead of playing it.
type Strip={src:string,frames:number,fps:number,once?:boolean,impact?:number,scale?:number,anchor?:number,hold?:number[]|number[][],pivot?:number[],spinFrom?:number,mouth?:number[]|number[][],angles?:number[]};
// Each kaiju has a base form (`width`/`anims`) plus optional per-stage overrides in `stages`. A stage without an entry uses the base form.
// Mogurodon: the base art is its Stage 2 form; `stages[1]` (animated incrementally) and `stages[3]` (every strip) override Stages 1 and 3.
// Within a stage form a missing animation falls back to that form's own `idle`, so a new form can ship with only a few strips. With
// `borrow` set it plays the base form's strip for that move instead (mixed art while a new form is being filled in, but every move animates).
type Form={width:number,anims:Record<string,Strip>,borrow?:boolean};
// Stage 1 strips: the mogurodon-s1 base still, a 151px-wide sprite at x=52 keyed from the transparent render.
const S1_NATIVE={scale:151/256,anchor:52+128*151/256};
// Stage 3 strips generated from the native-resolution base (the mogurodon-s3 base still: the 173px-wide sprite at x=41, one art pixel per
// pixel, keyed from the transparent render with tools/key_render.py) instead of a stretched full-frame one.
const S3_NATIVE={scale:173/256,anchor:41+128*173/256};
// Stage 2 (base form) strips: the mogurodon-s2 base still, a 194px-wide sprite at x=31 keyed the same way.
const S2_NATIVE={scale:194/256,anchor:31+128*194/256};
// Tlézcatl Stage 1 strips: the tlezcatl-s1 base still, a 128x59 sprite at x=64 in a 256x192 frame, keyed with tools/key_render.py.
const TZ1_NATIVE={scale:128/256,anchor:64+128*128/256};
// Tlézcatl Stage 1 attack strips: generated from the same base shifted 40px left (sprite at x=24) so lunges and the tail whip stay in the frame.
const TZ1_LEFT={scale:128/256,anchor:24+128*128/256};
// Tlézcatl Stage 2 strips: the tlezcatl-s2 base still, a 157x125 semi-upright sprite at x=49 in a 256x192 frame, keyed with tools/key_render.py.
const TZ2_NATIVE={scale:157/256,anchor:49+128*157/256};
// Tlézcatl Stage 2 attack strips: generated from the same base shifted 40px left (sprite at x=9) so the reaching rakes and the lunge stay in the frame.
const TZ2_LEFT={scale:157/256,anchor:9+128*157/256};
// Tlézcatl Stage 2 form (in progress): idle, walk and the light combo so far. `borrow`: every move not drawn yet plays the Stage 1 strip.
const TLEZCATL_S2:Form={width:120,borrow:true,anims:{idle:{src:'assets/tlezcatl-s2-idle.png',frames:8,fps:8,...TZ2_NATIVE},walk:{src:'assets/tlezcatl-s2-walk.png',frames:8,fps:10,...TZ2_NATIVE},
 // Light combo: overhead claw rake (the near claw cocks up by the crest and rakes down in front of the snout, streak on frame 4), reaching
 // hook rake (the arm shoots out past the snout and hooks down, crescent on frame 3), lunging bite (head and shoulders drive forward low,
 // jaws gaping, the crest flares yellow-white on the snap at frame 3). Same frame counts and fps as the other forms' combos; each strip
 // ends on the left-shifted base pose.
 light1:{src:'assets/tlezcatl-s2-light1.png',frames:8,fps:24,once:true,...TZ2_LEFT},light2:{src:'assets/tlezcatl-s2-light2.png',frames:8,fps:21,once:true,...TZ2_LEFT},
 light3:{src:'assets/tlezcatl-s2-light3.png',frames:8,fps:20,once:true,...TZ2_LEFT}}};
// Kaiban Stage 1 strips: the kaiban-s1 base still, a 139px-wide sprite at x=58 keyed from the transparent render with tools/key_render.py.
const KB1_NATIVE={scale:139/256,anchor:58+128*139/256};
// Kaiban Stage 1 lunging strips: generated from the same base shifted 40px left (sprite at x=18) so lunges stay inside the frame.
const KB1_LEFT={scale:139/256,anchor:18+128*139/256};
// Kaiban Stage 2 strips: the kaiban-s2 base still, a 200px-wide sprite at x=28 (idle, walk).
const KB2_NATIVE={scale:200/256,anchor:28+128*200/256};
// Kaiban Stage 2 forward-slam strips: generated from the same base shifted 24px left (sprite at x=4) so the punches stay in the frame.
const KB2_LEFT={scale:200/256,anchor:4+128*200/256};
// Kaiban Stage 3 strips: the kaiban-s3 base still, a 167x224 upright sprite at x=44 in a 256x256 frame (tall, so raised fists fit).
const KB3_NATIVE={scale:167/256,anchor:44+128*167/256};
// Kaiban Stage 3 punching strips: generated from the same base shifted 30px left (sprite at x=14) so forward punches stay in the frame.
const KB3_LEFT={scale:167/256,anchor:14+128*167/256};
// Kaiban Stage 3 heavy strips: the base shifted 20px left (sprite at x=24), room for the fists to land in front without clipping the tail.
const KB3_HEAVY={scale:167/256,anchor:24+128*167/256};
// Kaiban Stage 3 climb strips: 352x256 frames (the 256-wide PixelLab frames padded on the right) because he clings with the fists far
// out in front: the cling pose's fist tips sit at frame x=254, the wall line (the hitbox edge 24 world units out, 50px at this scale),
// so the anchor is 204 and the base pose is pasted 76px right to line up with the idle.
const KB3_CLIMB={scale:167/256,anchor:204};
// Kaiban Stage 3 lift strips (grab, carry, throw): generated from the base shrunk to 80% (134x179 at x=61, feet on the bottom row) so
// the overhead building press fits the 256px frame height.
const KB3_LIFT={scale:134/256,anchor:128};
// Kaiban Stage 3 form (upright crystal-maned juggernaut with shackled, crystal-studded fists): every move animated. Idle (breathing, fists
// and broken chains swaying, tail flicks) and walk (a swagger posed with PixelLab's skeleton animation: both fists swing through the full
// arc, alternating, opposite the legs; 11 frames at 14 fps, about the 0.8s cycle of the other walks). Frame counts, fps and impact
// frames match the Stage 1 timing the form used to borrow, so combat plays the same. 80 units wide keeps the 167x224 art about 300px
// tall at the 2.8x Stage 3 scale, a little taller than Mogurodon's Stage 3 since he stands upright.
const KAIBAN_S3:Form={width:80,anims:{idle:{src:'assets/kaiban-s3-idle.png',frames:8,fps:8,...KB3_NATIVE},walk:{src:'assets/kaiban-s3-walk.png',frames:11,fps:14,...KB3_NATIVE},
 // Light combo, skeleton-posed (tools/kaiban_s3_light_poses.py): front-fist jab with a lean, rear-fist hook swung across the body,
 // then a double-fist overhead hammer slammed down in front with the knees bending. Frame counts and fps match the other forms' combos.
 light1:{src:'assets/kaiban-s3-light1.png',frames:8,fps:24,once:true,...KB3_LEFT},light2:{src:'assets/kaiban-s3-light2.png',frames:8,fps:21,once:true,...KB3_LEFT},
 light3:{src:'assets/kaiban-s3-light3.png',frames:8,fps:20,once:true,...KB3_LEFT},
 // Heavy, skeleton-posed: both fists raised up and back overhead with the body arching (rear), a 1px power shudder of rear's last frame
 // while K is held (hold, tools/shudder_hold.py), then both fists swung over the top and crashed into the street in a deep crouch with a
 // dust burst, recovering to the base pose (slam). Rear and slam are cut from one 13-frame generation; counts and fps match the other heavies.
 heavyRear:{src:'assets/kaiban-s3-heavy-rear.png',frames:5,fps:20,once:true,...KB3_HEAVY},heavyHold:{src:'assets/kaiban-s3-heavy-hold.png',frames:4,fps:10,...KB3_HEAVY},
 heavySlam:{src:'assets/kaiban-s3-heavy-slam.png',frames:8,fps:16,once:true,...KB3_HEAVY},
 // Ranged (debris shotgun), skeleton-posed: leans and crouches deep, drives both fists into the street (rubble in the fists), hauls them
 // up and forward underhand and lets go at head height on impact frame 5 (Stage 1/2 timing), settling back. Detached rocks erased: the
 // game draws the projectiles. No crouched version until Stage 3 has a crouch.
 rangedStand:{src:'assets/kaiban-s3-ranged-stand.png',frames:8,fps:18,once:true,impact:5,...KB3_LEFT},
 // Crouched ranged: from the crouch pose shifted 30px left, stays low, rakes both fists into the ground and flicks the forearms forward
 // along the ground (impact frame 4). Generated empty-handed; the few loose rocks PixelLab drew were detached and erased.
 rangedCrouch:{src:'assets/kaiban-s3-ranged-crouch.png',frames:8,fps:20,once:true,impact:4,...KB3_LEFT},
 // Crouch: drops onto all fours with the fists on the street (224px tall to 180px), a breathing loop closed on that pose; crouchUp is
 // crouchDown reversed.
 crouch:{src:'assets/kaiban-s3-crouch.png',frames:4,fps:6,...KB3_NATIVE},crouchDown:{src:'assets/kaiban-s3-crouch-down.png',frames:5,fps:22,once:true,...KB3_NATIVE},
 crouchUp:{src:'assets/kaiban-s3-crouch-up.png',frames:5,fps:22,once:true,...KB3_NATIVE},
 // Jump: squats and springs off both feet into a tuck (rise), a tucked airborne loop from the rise's last frame, and a hard knees-bent
 // squash landing closed on the base. Bottom-aligned: physics moves him, the art only changes pose.
 jumpRise:{src:'assets/kaiban-s3-jump-rise.png',frames:9,fps:24,once:true,...KB3_NATIVE},jumpAir:{src:'assets/kaiban-s3-jump-air.png',frames:4,fps:8,...KB3_NATIVE},
 jumpLand:{src:'assets/kaiban-s3-jump-land.png',frames:5,fps:20,once:true,...KB3_NATIVE},
 // Climb (KB3_CLIMB, 352x256): the grab leaps onto the wall and eases from the base position onto the wall line; the climb alternates
 // fists and steps up the wall in place; the mantle hauls him over the edge onto the roof and closes on the base, starting 30px back
 // (the game slides him 0.3 body widths onto the roof) and easing onto the base position; the punch winds the near fist back and drives
 // it into the wall with a smear on impact frame 5. PixelLab's thin wall line and roof ledge were erased.
 climbGrab:{src:'assets/kaiban-s3-climb-grab.png',frames:5,fps:20,once:true,...KB3_CLIMB},climb:{src:'assets/kaiban-s3-climb.png',frames:8,fps:12,...KB3_CLIMB},
 climbMantle:{src:'assets/kaiban-s3-climb-mantle.png',frames:9,fps:20,once:true,...KB3_CLIMB},climbPunch:{src:'assets/kaiban-s3-climb-punch.png',frames:8,fps:24,once:true,impact:5,...KB3_CLIMB},
 // Grab/carry/throw (KB3_LIFT): the grab crouches and slides both fists under the prop at the street (hold on the street in front of the
 // near fist, frames 0-4), rises with it at chest height (5) and presses it straight up overhead (6-8). Carry strains under the overhead
 // lift; carry-walk lumbers upright with the arms locked up. Throw starts at the release: both arms whip forward and down with swing
 // arcs on frame 1 (the prop launches on the key press) and he settles on the base. `hold` points sit on top of the fists.
 grab:{src:'assets/kaiban-s3-grab.png',frames:9,fps:22,once:true,...KB3_LIFT,hold:[[204,255],[204,255],[236,255],[249,255],[236,255],[225,115],[174,11],[106,0],[107,2]]},
 carry:{src:'assets/kaiban-s3-carry.png',frames:4,fps:6,...KB3_LIFT,hold:[[107,2],[108,2],[109,2],[108,2]]},
 carryWalk:{src:'assets/kaiban-s3-carry-walk.png',frames:8,fps:10,...KB3_LIFT,hold:[[107,2],[107,0],[107,0],[107,0],[106,0],[107,0],[107,0],[107,0]]},
 throw:{src:'assets/kaiban-s3-throw.png',frames:6,fps:14,once:true,...KB3_LIFT},
 // Ultimate (Stampede). Roar, skeleton-posed (tools/kaiban_s3_charge_poses.py) and kept in strict profile: from the base he pounds the
 // near fist on his chest, throws his head back and bellows with both fists raised overhead (impact frame 5, held on 6), leans in
 // (frame 7, from a second seed) and lands on the run's first frame (8), so the charge loop picks up seamlessly. Pound: the charge loop
 // is the Gore Charge run.
 ultRoar:{src:'assets/kaiban-s3-ult-roar.png',frames:9,fps:14,once:true,impact:5,...KB3_NATIVE},ultPound:{src:'assets/kaiban-s3-run.png',frames:8,fps:16,...KB3_HEAVY},
 // Gore Charge run, skeleton-posed (tools/kaiban_s3_charge_poses.py, base shifted 20px left): he stays upright like the walk, so
 // walk/run swap without a silhouette pop. Torso pitched forward, head down so the tusks lead, long strides, fists pumping opposite
 // the legs. Bottom-aligned: the feet never leave the street line. Pound (S+J) = light3's double-fist overhead hammer. Meteor Drop:
 // dive rears up with both fists overhead and tips into a fists-first plunge (frames 0,2,4,8 of a 9-frame generation, bottom-aligned,
 // held on the last); slamLand (frames 1-8 of a generation from that pose on the ground) crashes in with a burst, squashes flat and
 // pushes back up into the stance.
 run:{src:'assets/kaiban-s3-run.png',frames:8,fps:16,...KB3_HEAVY},pound:{src:'assets/kaiban-s3-light3.png',frames:8,fps:20,once:true,...KB3_LEFT},
 dive:{src:'assets/kaiban-s3-dive.png',frames:4,fps:24,once:true,...KB3_NATIVE},slamLand:{src:'assets/kaiban-s3-slam-land.png',frames:8,fps:16,once:true,...KB3_NATIVE}}};
// Kaiban Stage 2 form, in progress: idle, walk, the heavy, the gorilla overhead-punch light combo (near-fist hammer, far-fist hammer while
// the near fist stays planted, reared double-fist smash; frame counts and fps match the Stage 1 combo), ranged scoop, grab/carry/throw, the climb set and the Stampede. `borrow`: every move not drawn yet plays the
// Stage 1 strip.
const KAIBAN_S2:Form={width:120,borrow:true,anims:{idle:{src:'assets/kaiban-s2-idle.png',frames:8,fps:8,...KB2_NATIVE},walk:{src:'assets/kaiban-s2-walk.png',frames:8,fps:10,...KB2_NATIVE},
 light1:{src:'assets/kaiban-s2-light1.png',frames:8,fps:24,once:true,...KB2_LEFT},light2:{src:'assets/kaiban-s2-light2.png',frames:8,fps:21,once:true,...KB2_LEFT},
 light3:{src:'assets/kaiban-s2-light3.png',frames:8,fps:20,once:true,...KB2_LEFT},
 // Heavy: hunches low with both fists cocked back (rear), shudders with breath puffs while K is held (hold, generated from rear's last
 // frame), then a lunging tusk uppercut with a slash arc that settles back to the base pose (slam). Rear and slam are cut from one 16-frame
 // generation off the left-shifted base (rear 0-4, slam 9-15 plus the base); frame counts and fps match the Stage 1 heavy.
 heavyRear:{src:'assets/kaiban-s2-heavy-rear.png',frames:5,fps:20,once:true,...KB2_LEFT},heavyHold:{src:'assets/kaiban-s2-heavy-hold.png',frames:4,fps:10,...KB2_LEFT},
 heavySlam:{src:'assets/kaiban-s2-heavy-slam.png',frames:8,fps:16,once:true,...KB2_LEFT},
 // Ranged (debris shotgun), gorilla-style: leans in, rises and digs both fists into the street (frame 4, rubble in the fists), heaves them
 // up and forward underhand to fling it (impact frame 5, Stage 1's timing), follows through and drops back to all fours. Loose rocks erased:
 // the game draws the projectiles.
 rangedStand:{src:'assets/kaiban-s2-ranged-stand.png',frames:8,fps:18,once:true,impact:5,...KB2_LEFT},
 // Crouched scoop from the crouch pose shifted 24px left, staying low (never taller than the standing pose): rakes both fists into the
 // street (frames 2-3), whips the forearms forward along the ground in a short underhand flick (impact frame 4, Stage 1's timing) and drops
 // back onto the knuckles, closing on the crouch. Seed 21; loose rocks erased.
 rangedCrouch:{src:'assets/kaiban-s2-ranged-crouch.png',frames:8,fps:20,once:true,impact:4,...KB2_LEFT},
 // Climb: 256x256 strips, clinging upright with the fists gripping the wall line (frame x=168, the hitbox edge 24 world units out at this
 // scale), feet braced on the wall, snout and tusks up. PixelLab braced him 37px up the wall, so the climb frames sit 21px lower (as far as
 // the lowest step allows); the grab eases into that and the 53px shift onto the wall line from the base pose. The mantle starts a further
 // 24px back (the game slides him 0.3 body widths onto the roof) and eases to 0 by its standing last frame. The punch draws the near fist
 // back off the wall and drives it in with a smear on impact frame 5. Frame counts and fps match Stage 1.
 climbGrab:{src:'assets/kaiban-s2-climb-grab.png',frames:5,fps:20,once:true,...KB2_NATIVE},climb:{src:'assets/kaiban-s2-climb.png',frames:8,fps:12,...KB2_NATIVE},
 climbMantle:{src:'assets/kaiban-s2-climb-mantle.png',frames:9,fps:20,once:true,...KB2_NATIVE},climbPunch:{src:'assets/kaiban-s2-climb-punch.png',frames:8,fps:24,once:true,impact:5,...KB2_NATIVE},
 // Grab/carry/throw, gorilla-style, 256x256 strips (the base padded to 256 tall, feet on the bottom row, so KB2_NATIVE still lines up)
 // because the overhead lift reaches the top of the frame. Grab: dips with the fists at the street (prop stays on the street in front
 // of the near fist, frames 0-3), rises onto the hind legs and presses both fists straight up overhead. Carry stands upright with the
 // fists up; carry-walk lumbers upright on the hind legs. Throw whips both arms forward and down from overhead (swing arcs on frame 1:
 // the prop launches on the key press) and drops back onto all fours, ending on the base pose. `hold` points sit on top of the fists.
 grab:{src:'assets/kaiban-s2-grab.png',frames:9,fps:22,once:true,...KB2_NATIVE,hold:[[222,255],[222,255],[222,255],[219,255],[197,151],[192,91],[120,30],[107,3],[107,3]]},
 carry:{src:'assets/kaiban-s2-carry.png',frames:4,fps:6,...KB2_NATIVE,hold:[[107,3],[107,3],[107,3],[107,3]]},
 carryWalk:{src:'assets/kaiban-s2-carry-walk.png',frames:8,fps:10,...KB2_NATIVE,hold:[[107,3],[109,3],[111,3],[112,3],[111,3],[111,3],[109,3],[108,3]]},
 throw:{src:'assets/kaiban-s2-throw.png',frames:8,fps:18,once:true,...KB2_NATIVE},
 // Ultimate (Stampede), gorilla-style. Roar: 256x256 (the base padded to 256 tall like the grab, so KB2_NATIVE lines up) because he
 // stands to full height. Rises onto the hind legs, fists to the chest, throws the head back and bellows (impact frame 5 = the bellow
 // blast, Stage 1's timing), then drops onto all four knuckles in a low head-down charge stance. 9 of a 16-frame generation (frames
 // 0-3,5,7,9-11). Pound: the charge loop, a goring gorilla gallop: head dropped to tusk level with the tusks thrust forward while both
 // arms plant on the knuckles, the body vaults over them and the hind legs swing through, lifting only for the gather (frames 2-8 of a
 // 12-frame generation that repeats with an exact 7-frame period), 7 frames at 20 fps: a quick 0.35s stride to keep pace with the
 // charge, which runs stampedeReach x stage scale.
 ultRoar:{src:'assets/kaiban-s2-ult-roar.png',frames:9,fps:14,once:true,impact:5,...KB2_NATIVE},ultPound:{src:'assets/kaiban-s2-ult-pound.png',frames:7,fps:20,...KB2_NATIVE},
 // Gore Charge: running reuses the Stampede knuckle gallop. Pound (S+J) reuses light1's overhead fist hammer.
 // Meteor Drop: dive = rear up and plunge fists-first (frames 0,1,4,8 of a 9-frame generation, bottom-aligned, held on the last);
 // slamLand = frames 1-8 of a generation from that pose on the ground to the base: fists hit, burst, push up into the stance.
 run:{src:'assets/kaiban-s2-ult-pound.png',frames:7,fps:20,...KB2_NATIVE},pound:{src:'assets/kaiban-s2-light1.png',frames:8,fps:24,once:true,...KB2_LEFT},
 dive:{src:'assets/kaiban-s2-dive.png',frames:4,fps:24,once:true,...KB2_NATIVE},slamLand:{src:'assets/kaiban-s2-slam-land.png',frames:8,fps:16,once:true,...KB2_NATIVE},
 // Jump: crouches on the knuckles and springs off all fours (rise), a tucked airborne loop from the rise's last frame (frames 1-4 of its
 // generation), and a heavy fists-first squash landing closed on the base pose. Bottom-aligned; frame counts and fps match Stage 1's jump.
 jumpRise:{src:'assets/kaiban-s2-jump-rise.png',frames:9,fps:24,once:true,...KB2_NATIVE},jumpAir:{src:'assets/kaiban-s2-jump-air.png',frames:4,fps:8,...KB2_NATIVE},
 jumpLand:{src:'assets/kaiban-s2-jump-land.png',frames:5,fps:20,once:true,...KB2_NATIVE},
 // Crouch: bends the elbows and knees and drops the chest low on all four knuckles (135px tall to 110px, seed 7), a breathing loop from
 // the last frame closed on it; crouchUp is crouchDown reversed. Frame counts and fps match Stage 1.
 crouch:{src:'assets/kaiban-s2-crouch.png',frames:4,fps:6,...KB2_NATIVE},crouchDown:{src:'assets/kaiban-s2-crouch-down.png',frames:5,fps:22,once:true,...KB2_NATIVE},
 crouchUp:{src:'assets/kaiban-s2-crouch-up.png',frames:5,fps:22,once:true,...KB2_NATIVE}}};
export const SPRITES:Record<string,Form&{stages?:Record<number,Form>}>={
 Mogurodon:{width:120,anims:{idle:{src:'assets/mogurodon-idle.png',frames:8,fps:8,...S2_NATIVE},walk:{src:'assets/mogurodon-walk.png',frames:8,fps:10,...S2_NATIVE},
  // Stage 2 (the base form): every strip generated from the native-resolution base (S2_NATIVE), 256x192 except the 256x256 climb.
  // Frame counts and fps are the timing the other forms fall back to, so they match the previous art.
  // Light combo by hit order (each form picks its own moves): Stage 2 = near-claw overhead swipe, far-claw swipe, bite.
  light1:{src:'assets/mogurodon-swipe-right.png',frames:8,fps:24,once:true,...S2_NATIVE},light2:{src:'assets/mogurodon-swipe-left.png',frames:10,fps:26,once:true,...S2_NATIVE},light3:{src:'assets/mogurodon-bite.png',frames:8,fps:20,once:true,...S2_NATIVE},
  heavyRear:{src:'assets/mogurodon-heavy-rear.png',frames:5,fps:20,once:true,...S2_NATIVE},heavyHold:{src:'assets/mogurodon-heavy-hold.png',frames:4,fps:10,...S2_NATIVE},heavySlam:{src:'assets/mogurodon-heavy-slam.png',frames:9,fps:18,once:true,...S2_NATIVE},
  // Tremor Slam (L, grounded): the heavy-slam strip at a snappier tempo; the forward shockwave launches on impact frame 2.
  rangedSlam:{src:'assets/mogurodon-heavy-slam.png',frames:9,fps:24,once:true,impact:2,...S2_NATIVE},
  rangedStand:{src:'assets/mogurodon-ranged-stand.png',frames:9,fps:20,once:true,...S2_NATIVE},rangedCrouch:{src:'assets/mogurodon-ranged-crouch.png',frames:8,fps:20,once:true,...S2_NATIVE},
  // Crouch art is drawn at full size; crouchUp is crouchDown reversed.
  crouch:{src:'assets/mogurodon-crouch.png',frames:4,fps:6,...S2_NATIVE},crouchDown:{src:'assets/mogurodon-crouch-down.png',frames:5,fps:22,once:true,...S2_NATIVE},crouchUp:{src:'assets/mogurodon-crouch-up.png',frames:5,fps:22,once:true,...S2_NATIVE},
  // Jump strips are bottom-aligned: physics moves him, the art only changes pose.
  jumpRise:{src:'assets/mogurodon-jump-rise.png',frames:9,fps:24,once:true,...S2_NATIVE},jumpAir:{src:'assets/mogurodon-jump-air.png',frames:4,fps:8,...S2_NATIVE},jumpLand:{src:'assets/mogurodon-jump-land.png',frames:5,fps:20,once:true,...S2_NATIVE},
  // Seismic Rupture (U): roar (crash on impact frame 5) then ground-pounding loop for the rest of the 2.4s Ultimate.
  ultRoar:{src:'assets/mogurodon-ult-roar.png',frames:8,fps:14,once:true,impact:5,...S2_NATIVE},ultPound:{src:'assets/mogurodon-ult-pound.png',frames:8,fps:16,...S2_NATIVE},
  // Climb (W): 256x256 strips, body vertical with the gripping claws on the wall line (frame x=167, the hitbox edge).
  climbGrab:{src:'assets/mogurodon-climb-grab.png',frames:5,fps:20,once:true,...S2_NATIVE},climb:{src:'assets/mogurodon-climb.png',frames:8,fps:12,...S2_NATIVE},climbMantle:{src:'assets/mogurodon-climb-mantle.png',frames:9,fps:20,once:true,...S2_NATIVE},
  // Light attack while clinging: the near arm lets go, winds back across the chest and punches into the wall (impact = fist out).
  climbPunch:{src:'assets/mogurodon-climb-punch.png',frames:8,fps:24,once:true,impact:4,...S2_NATIVE},
  // Grab/throw (H): grab dips to scoop the prop off the street and rears up with it overhead; carry/carryWalk hold it there on the
  // hind legs; throw starts at the release (the prop launches on the key press) and drops back onto all fours.
  grab:{src:'assets/mogurodon-grab.png',frames:9,fps:22,once:true,...S2_NATIVE,hold:[[201,191],[213,191],[230,191],[230,191],[230,191],[226,191],[219,152],[221,90],[144,21]]},
  carry:{src:'assets/mogurodon-carry.png',frames:4,fps:6,...S2_NATIVE,hold:[[144,21],[148,24],[152,25],[148,23]]},
  carryWalk:{src:'assets/mogurodon-carry-walk.png',frames:8,fps:10,...S2_NATIVE,hold:[[144,21],[146,20],[150,20],[151,21],[152,23],[150,23],[148,22],[146,22]]},
  throw:{src:'assets/mogurodon-throw.png',frames:8,fps:18,once:true,...S2_NATIVE},
  // Slam cannonball (see stages[1] for how dive/slamLand are cut and played).
  run:{src:'assets/mogurodon-run.png',frames:8,fps:15,...S2_NATIVE},
  dive:{src:'assets/mogurodon-dive.png',frames:3,fps:28,once:true,...S2_NATIVE,pivot:[134.6,113.7],spinFrom:2},
  slamLand:{src:'assets/mogurodon-slam-land.png',frames:8,fps:16,once:true,...S2_NATIVE}},
  stages:{1:{width:120,anims:{
   // Stage 1 form: every strip generated from the native-resolution base (S1_NATIVE), 256x192 except the 256x256 climb. Frame counts,
   // fps and impact frames match the previous art, so combat timing is unchanged.
   idle:{src:'assets/mogurodon-s1-idle.png',frames:8,fps:8,...S1_NATIVE},walk:{src:'assets/mogurodon-s1-walk.png',frames:8,fps:10,...S1_NATIVE},
   jumpRise:{src:'assets/mogurodon-s1-jump-rise.png',frames:9,fps:24,once:true,...S1_NATIVE},jumpAir:{src:'assets/mogurodon-s1-jump-air.png',frames:4,fps:8,...S1_NATIVE},jumpLand:{src:'assets/mogurodon-s1-jump-land.png',frames:5,fps:20,once:true,...S1_NATIVE},
   // Light combo: near (left) paw swipe, far (right) paw swipe, lunging bite. fps chosen so each hit lasts as long as Stage 2's.
   light1:{src:'assets/mogurodon-s1-light1.png',frames:8,fps:24,once:true,...S1_NATIVE},light2:{src:'assets/mogurodon-s1-light2.png',frames:8,fps:21,once:true,...S1_NATIVE},light3:{src:'assets/mogurodon-s1-light3.png',frames:8,fps:20,once:true,...S1_NATIVE},
   // Heavy: rear onto the hind legs, hold (straining loop) while charging, slam both paws down on release. Rear and slam are cut
   // from one generated strip, so the slam starts at the crash.
   heavyRear:{src:'assets/mogurodon-s1-heavy-rear.png',frames:5,fps:20,once:true,...S1_NATIVE},heavyHold:{src:'assets/mogurodon-s1-heavy-hold.png',frames:4,fps:10,...S1_NATIVE},
   heavySlam:{src:'assets/mogurodon-s1-heavy-slam.png',frames:8,fps:16,once:true,...S1_NATIVE},
   // Ranged: no tail at Stage 1. Head down, back arched like a hissing cat, quills bristling; the projectile spawn is unchanged.
   rangedSlam:{src:'assets/mogurodon-s1-heavy-slam.png',frames:8,fps:22,once:true,impact:1,...S1_NATIVE},
   rangedStand:{src:'assets/mogurodon-s1-ranged-stand.png',frames:8,fps:18,once:true,...S1_NATIVE},rangedCrouch:{src:'assets/mogurodon-s1-ranged-crouch.png',frames:8,fps:20,once:true,...S1_NATIVE},
   // Crouch: flat stalking crouch; crouchUp is crouchDown reversed.
   crouch:{src:'assets/mogurodon-s1-crouch.png',frames:4,fps:6,...S1_NATIVE},crouchDown:{src:'assets/mogurodon-s1-crouch-down.png',frames:5,fps:22,once:true,...S1_NATIVE},crouchUp:{src:'assets/mogurodon-s1-crouch-up.png',frames:5,fps:22,once:true,...S1_NATIVE},
   // Climb: 256x256 strips, body upright with the gripping paws on the wall line (frame x=158, the hitbox edge). The mantle starts
   // 18px further back, easing to 0, to cancel the game sliding the hitbox onto the roof.
   climbGrab:{src:'assets/mogurodon-s1-climb-grab.png',frames:5,fps:20,once:true,...S1_NATIVE},climb:{src:'assets/mogurodon-s1-climb.png',frames:8,fps:12,...S1_NATIVE},
   climbMantle:{src:'assets/mogurodon-s1-climb-mantle.png',frames:9,fps:20,once:true,...S1_NATIVE},climbPunch:{src:'assets/mogurodon-s1-climb-punch.png',frames:8,fps:24,once:true,impact:4,...S1_NATIVE},
   // Seismic Rupture: rear up and howl, crash down in a shockwave (impact frame 5 = 0.357s, same first-fissure timing as Stage 2),
   // then a two-paw ground-pounding loop for the rest of the 2.4s Ultimate.
   ultRoar:{src:'assets/mogurodon-s1-ult-roar.png',frames:9,fps:14,once:true,impact:5,...S1_NATIVE},ultPound:{src:'assets/mogurodon-s1-ult-pound.png',frames:8,fps:16,...S1_NATIVE},
   grab:{src:'assets/mogurodon-s1-grab.png',frames:9,fps:22,once:true,...S1_NATIVE,hold:[[171,191],[177,191],[205,191],[205,191],[205,191],[201,184],[180,128],[183,92],[128,39]]},
   carry:{src:'assets/mogurodon-s1-carry.png',frames:4,fps:6,...S1_NATIVE,hold:[[128,39],[128,41],[129,43],[128,41]]},
   carryWalk:{src:'assets/mogurodon-s1-carry-walk.png',frames:8,fps:10,...S1_NATIVE,hold:[[128,39],[131,35],[134,35],[137,38],[134,39],[133,35],[129,35],[127,37]]},
   throw:{src:'assets/mogurodon-s1-throw.png',frames:8,fps:18,once:true,...S1_NATIVE},
   // Slam: the dive tucks from the airborne gallop into a quills-out spike ball (frames 0-2, bottom-aligned) and holds it; the game
   // rolls the ball forward about `pivot` (its centre) from `spinFrom`. slamLand starts at impact: squash flat in a dust ring,
   // rebound, burst out of the ball and settle on the base pose (frames 1-8 of a 9-frame generation ending on the base).
   // Run (Shift / double-tap): a bounding gallop loop from the base pose back to it; the two airborne frames are left lifted so it bounces.
   run:{src:'assets/mogurodon-s1-run.png',frames:8,fps:15,...S1_NATIVE},
   dive:{src:'assets/mogurodon-s1-dive.png',frames:3,fps:28,once:true,...S1_NATIVE,pivot:[128.5,109],spinFrom:2},
   slamLand:{src:'assets/mogurodon-s1-slam-land.png',frames:8,fps:16,once:true,...S1_NATIVE}}},
  // Stage 3 form: every strip generated from the native-resolution base (S3_NATIVE); frame counts, fps and impact frames match the
  // previous art so combat timing is unchanged. Climb strips are 256x256 with the gripping claws on the wall line (frame x=162).
  // Light combo: leading-arm strike, chest-arm swipe (the other arm), lunge-bite.
  3:{width:120,anims:{idle:{src:'assets/mogurodon-s3-idle.png',frames:8,fps:8,...S3_NATIVE},walk:{src:'assets/mogurodon-s3-walk.png',frames:8,fps:10,...S3_NATIVE},
   light1:{src:'assets/mogurodon-s3-light1.png',frames:8,fps:24,once:true,...S3_NATIVE},light2:{src:'assets/mogurodon-s3-light2.png',frames:8,fps:21,once:true,...S3_NATIVE},light3:{src:'assets/mogurodon-s3-light3.png',frames:8,fps:20,once:true,...S3_NATIVE},
   heavyRear:{src:'assets/mogurodon-s3-heavy-rear.png',frames:5,fps:20,once:true,...S3_NATIVE},heavyHold:{src:'assets/mogurodon-s3-heavy-hold.png',frames:4,fps:10,...S3_NATIVE},
   heavySlam:{src:'assets/mogurodon-s3-heavy-slam.png',frames:8,fps:16,once:true,...S3_NATIVE},
   jumpRise:{src:'assets/mogurodon-s3-jump-rise.png',frames:9,fps:24,once:true,...S3_NATIVE},jumpAir:{src:'assets/mogurodon-s3-jump-air.png',frames:4,fps:8,...S3_NATIVE},jumpLand:{src:'assets/mogurodon-s3-jump-land.png',frames:5,fps:20,once:true,...S3_NATIVE},
   rangedSlam:{src:'assets/mogurodon-s3-heavy-slam.png',frames:8,fps:22,once:true,impact:1,...S3_NATIVE},
   rangedStand:{src:'assets/mogurodon-s3-ranged-stand.png',frames:8,fps:18,once:true,...S3_NATIVE},rangedCrouch:{src:'assets/mogurodon-s3-ranged-crouch.png',frames:8,fps:18,once:true,...S3_NATIVE},
   crouch:{src:'assets/mogurodon-s3-crouch.png',frames:4,fps:6,...S3_NATIVE},crouchDown:{src:'assets/mogurodon-s3-crouch-down.png',frames:5,fps:22,once:true,...S3_NATIVE},crouchUp:{src:'assets/mogurodon-s3-crouch-up.png',frames:5,fps:22,once:true,...S3_NATIVE},
   climbGrab:{src:'assets/mogurodon-s3-climb-grab.png',frames:5,fps:20,once:true,...S3_NATIVE},climb:{src:'assets/mogurodon-s3-climb.png',frames:8,fps:12,...S3_NATIVE},
   climbMantle:{src:'assets/mogurodon-s3-climb-mantle.png',frames:9,fps:20,once:true,...S3_NATIVE},climbPunch:{src:'assets/mogurodon-s3-climb-punch.png',frames:8,fps:24,once:true,impact:5,...S3_NATIVE},
   ultRoar:{src:'assets/mogurodon-s3-ult-roar.png',frames:8,fps:14,once:true,impact:5,...S3_NATIVE},ultPound:{src:'assets/mogurodon-s3-ult-pound.png',frames:16,fps:30,...S3_NATIVE},
   grab:{src:'assets/mogurodon-s3-grab.png',frames:9,fps:22,once:true,...S3_NATIVE,hold:[[195,191],[206,191],[219,191],[217,191],[215,191],[211,191],[202,150],[196,100],[134,25]]},
   carry:{src:'assets/mogurodon-s3-carry.png',frames:4,fps:6,...S3_NATIVE,hold:[[134,25],[134,24],[134,23],[134,24]]},
   carryWalk:{src:'assets/mogurodon-s3-carry-walk.png',frames:8,fps:10,...S3_NATIVE,hold:[[134,25],[140,24],[149,24],[158,24],[162,24],[157,24],[150,24],[140,24]]},
   throw:{src:'assets/mogurodon-s3-throw.png',frames:8,fps:18,once:true,...S3_NATIVE},
   // Slam cannonball: a crystal-studded spike ball.
   run:{src:'assets/mogurodon-s3-run.png',frames:8,fps:15,...S3_NATIVE},
   dive:{src:'assets/mogurodon-s3-dive.png',frames:3,fps:28,once:true,...S3_NATIVE,pivot:[126.8,104.9],spinFrom:2},
   slamLand:{src:'assets/mogurodon-s3-slam-land.png',frames:8,fps:16,once:true,...S3_NATIVE}}}}},
 // Kaiban (woolly boar juggernaut): every Stage 1 strip is done; only the Stage 1 form exists, so it is the base form and every stage draws it until Stage 2/3 are
 // generated. Same 120-unit width as Mogurodon Stage 1, so the hitbox is unchanged. The walk is a 12-frame boar gallop at 15 fps
 // (same 0.8s cycle as the other walks); the eye on its pitched stretch frames 6-9 was placed by hand from the tusk root.
 Kaiban:{width:120,anims:{idle:{src:'assets/kaiban-s1-idle.png',frames:8,fps:8,...KB1_NATIVE},walk:{src:'assets/kaiban-s1-walk.png',frames:12,fps:15,...KB1_NATIVE},
  // Light combo: tusk hook (dip, then whip the tusks up), headbutt (lurching forward), low lunging gore with a head toss at the end
  // (stays on all fours so it reads apart from the heavy). Generated from the left-shifted base; eye placed from the snout position.
  light1:{src:'assets/kaiban-s1-light1.png',frames:8,fps:24,once:true,...KB1_LEFT},light2:{src:'assets/kaiban-s1-light2.png',frames:8,fps:21,once:true,...KB1_LEFT},
  light3:{src:'assets/kaiban-s1-light3.png',frames:8,fps:20,once:true,...KB1_LEFT},
  // Heavy: head lowers and braces (rear), shudders with power while K is held (hold, generated from rear's last frame), then gores up
  // and forward with the tusks (slam, starting on the jab with its slash arc). Rear and slam are cut from one 16-frame generation
  // (rear 0-4, slam 6-9,11,13-15); timing matches Mogurodon's heavy. The reared-back strike frames tip the head up, so they have no eye.
  heavyRear:{src:'assets/kaiban-s1-heavy-rear.png',frames:5,fps:20,once:true,...KB1_NATIVE},heavyHold:{src:'assets/kaiban-s1-heavy-hold.png',frames:4,fps:10,...KB1_NATIVE},
  heavySlam:{src:'assets/kaiban-s1-heavy-slam.png',frames:8,fps:16,once:true,...KB1_NATIVE},
  // Jump: crouch-and-spring rise (pushes off the hind legs), a paddling airborne loop from its last frame, and a heavy squash landing
  // into the base pose. Bottom-aligned: physics moves him, the art only changes pose. Frame counts and fps match Mogurodon's jump.
  jumpRise:{src:'assets/kaiban-s1-jump-rise.png',frames:9,fps:24,once:true,...KB1_NATIVE},jumpAir:{src:'assets/kaiban-s1-jump-air.png',frames:4,fps:8,...KB1_NATIVE},
  jumpLand:{src:'assets/kaiban-s1-jump-land.png',frames:5,fps:20,once:true,...KB1_NATIVE},
  // Climb: 256x256 strips, reared upright with the front hooves on the wall line (frame x=155, the hitbox edge 24 world units out).
  // PixelLab's wall post on the grab was erased by matching its per-column colour; the grab eases 41px back onto the wall line over
  // its first frames. The mantle starts 17px further back (the game slides him 0.3 body widths onto the roof) and eases to 0 by its
  // standing last frame. The punch's hoof drives into the wall on impact frame 5. Upright frames tip the snout up, so they have no eye.
  climbGrab:{src:'assets/kaiban-s1-climb-grab.png',frames:5,fps:20,once:true,...KB1_NATIVE},climb:{src:'assets/kaiban-s1-climb.png',frames:8,fps:12,...KB1_NATIVE},
  climbMantle:{src:'assets/kaiban-s1-climb-mantle.png',frames:9,fps:20,once:true,...KB1_NATIVE},climbPunch:{src:'assets/kaiban-s1-climb-punch.png',frames:8,fps:24,once:true,impact:5,...KB1_NATIVE},
  // Grab/carry/throw: scoops with the tusks and heaves the prop up onto them, carries it there on all fours with the head held high,
  // and throws with a forward head-fling (slash arc on frame 1: the prop launches on the key press). `hold` points sit on the tusk tops;
  // during the scoop (grab 0-4) the prop stays on the street under the tusk tips. Head-high frames have no eye.
  grab:{src:'assets/kaiban-s1-grab.png',frames:9,fps:22,once:true,...KB1_NATIVE,hold:[[186,191],[188,191],[184,191],[180,191],[176,191],[174,178],[192,121],[180,78],[177,75]]},
  carry:{src:'assets/kaiban-s1-carry.png',frames:4,fps:6,...KB1_NATIVE,hold:[[177,75],[177,75],[177,75],[177,75]]},
  carryWalk:{src:'assets/kaiban-s1-carry-walk.png',frames:8,fps:10,...KB1_NATIVE,hold:[[177,75],[177,74],[177,73],[177,74],[177,74],[177,75],[177,74],[177,74]]},
  throw:{src:'assets/kaiban-s1-throw.png',frames:8,fps:18,once:true,...KB1_NATIVE},
  // Ultimate (Stampede art; the gameplay is still the shared Seismic Rupture until M5): a bellow with the head thrown back (9 of a
  // 16-frame generation, frames 0-5,11,13,15, so the bellow peaks on impact frame 5 = 0.357s, Mogurodon's timing) ending head-down in a
  // charge stance, then a head-down battering-ram gallop for the rest of the 2.4s Ultimate: one long flat bounding stride (frames 2-9 of
  // a 12-frame generation; the near-still ends were dropped so the loop doesn't stutter) with the head held low the whole way.
  ultRoar:{src:'assets/kaiban-s1-ult-roar.png',frames:9,fps:14,once:true,impact:5,...KB1_NATIVE},ultPound:{src:'assets/kaiban-s1-ult-pound.png',frames:8,fps:16,...KB1_NATIVE},
  // Gore Charge run = the Stampede head-down charge; Pound = the rear-and-stomp heavy slam. Meteor Drop: dive tips nose-down into
  // a tusks-first plunge (frames 0,2,4,8, bottom-aligned); slamLand rams the tusks in, cracks a crater and heaves back out.
  run:{src:'assets/kaiban-s1-ult-pound.png',frames:8,fps:16,...KB1_NATIVE},pound:{src:'assets/kaiban-s1-heavy-slam.png',frames:8,fps:16,once:true,...KB1_NATIVE},
  dive:{src:'assets/kaiban-s1-dive.png',frames:4,fps:24,once:true,...KB1_NATIVE},slamLand:{src:'assets/kaiban-s1-slam-land.png',frames:8,fps:16,once:true,...KB1_NATIVE},
  // Ranged (debris shotgun): plows both tusks down and forward into the street (frames 1-4, dirt clod at the tusks), then wrenches the
  // head up so the tusks fling the debris up and forward (impact frame 5, with the dirt crescent), and settles. Loose dirt erased: the
  // game draws the projectiles. The upswing frames tip the head up, so they have no eye.
  rangedStand:{src:'assets/kaiban-s1-ranged-stand.png',frames:8,fps:18,once:true,impact:5,...KB1_NATIVE},
  // Crouched scoop from the crouch pose: tusks into the ground, head wrenches up and forward (impact frame 4), back half stays still.
  rangedCrouch:{src:'assets/kaiban-s1-ranged-crouch.png',frames:8,fps:20,once:true,impact:4,...KB1_NATIVE},
  // Crouch: flattens low with the belly near the ground (95px tall to 75px), breathing loop from the last frame; crouchUp is crouchDown
  // reversed.
  crouch:{src:'assets/kaiban-s1-crouch.png',frames:4,fps:6,...KB1_NATIVE},crouchDown:{src:'assets/kaiban-s1-crouch-down.png',frames:5,fps:22,once:true,...KB1_NATIVE},
  crouchUp:{src:'assets/kaiban-s1-crouch-up.png',frames:5,fps:22,once:true,...KB1_NATIVE}},
  stages:{2:KAIBAN_S2,3:KAIBAN_S3}},
 // Tlézcatl (low-slung volcanic salamander, lava-striped hide and a flame-spine crest): only the Stage 1 form exists, so it is the base
 // form and every stage draws it. The render keys to a 128x59 sprite at x=64 (TZ1_NATIVE); same 120-unit width as the others.
 'Tlézcatl':{width:120,anims:{idle:{src:'assets/tlezcatl-s1-idle.png',frames:8,fps:8,...TZ1_NATIVE},walk:{src:'assets/tlezcatl-s1-walk.png',frames:8,fps:10,...TZ1_NATIVE},
  // Run (Shift / double-tap): a low bounding sprint loop closed on the base, body stretched long, lifting clear on frame 4, dust off the claws.
  run:{src:'assets/tlezcatl-s1-run.png',frames:8,fps:15,...TZ1_NATIVE},
  // Light combo: near-claw forward rake (slash arc in front of the snout), snapping lunge bite (head and shoulders shoot forward low),
  // scorpion tail whip (the tail curls up over the back and cracks down in front of the snout with a spark on frame 4). Frame counts
  // and fps match the other forms' combos, so combat timing is unchanged; each strip ends on the left-shifted base pose.
  light1:{src:'assets/tlezcatl-s1-light1.png',frames:8,fps:24,once:true,...TZ1_LEFT},light2:{src:'assets/tlezcatl-s1-light2.png',frames:8,fps:21,once:true,...TZ1_LEFT},
  light3:{src:'assets/tlezcatl-s1-light3.png',frames:8,fps:20,once:true,...TZ1_LEFT},
  // Heavy: rears up onto the hind legs and tail with the claws raised (rear), the flame crest glows and bursts into fire and back while
  // K is held (hold, generated from the peak pose and played 0,2,3,2 so it pulses), then crashes chest and claws into the street in a
  // lava burst and settles (slam, starting on the crash so it lands on release). Rear and slam are cut from one 16-frame generation
  // (rear 0-4, slam 8-15); timing matches the other forms' heavies.
  heavyRear:{src:'assets/tlezcatl-s1-heavy-rear.png',frames:5,fps:20,once:true,...TZ1_LEFT},heavyHold:{src:'assets/tlezcatl-s1-heavy-hold.png',frames:4,fps:10,...TZ1_LEFT},
  heavySlam:{src:'assets/tlezcatl-s1-heavy-slam.png',frames:8,fps:16,once:true,...TZ1_LEFT},
  // Eruption (U). Charge: `tlezcatl-s1-ult-charge`, 16 frames at 16 fps = the 1s eruptCharge, played once: he curls into a tight
  // ball, crest spines flaring out like a pinwheel, and molten light leaks through his stripes and spines, orange to yellow-white
  // (the game shudders him and adds a soft glow). Roar: `tlezcatl-s1-ult-roar`, 8 frames at 16 fps generated from the last charge
  // frame: the ball bursts in a starburst and fireball (drawn into the strip, under the game's own fireball) and he is revealed
  // reared up on his hind legs and tail, claws flung wide, jaws gaping, crest blazing. No impact frame, so the explosion goes off
  // on its first frame, the instant the ball bursts. Loop: `tlezcatl-s1-ult-pound`, the roar's last four frames (the pose holds
  // while the crest flame pulses orange to white-hot and back), while the fireball fades and the fallout lands.
  // Settle: `tlezcatl-s1-ult-settle`, 8 frames at 16 fps over the Ultimate's last 0.5s, ending on the base pose: he drops back
  // onto all fours, the flames left on his back dying into embers and the white-hot stripes cooling back to orange.
  ultCharge:{src:'assets/tlezcatl-s1-ult-charge.png',frames:16,fps:16,once:true,...TZ1_NATIVE},
  ultRoar:{src:'assets/tlezcatl-s1-ult-roar.png',frames:8,fps:16,once:true,...TZ1_NATIVE},ultPound:{src:'assets/tlezcatl-s1-ult-pound.png',frames:4,fps:10,...TZ1_NATIVE},
  ultSettle:{src:'assets/tlezcatl-s1-ult-settle.png',frames:8,fps:16,once:true,...TZ1_NATIVE},
  // Pound keeps the heavy slam it fell back to before ultPound existed.
  pound:{src:'assets/tlezcatl-s1-heavy-slam.png',frames:8,fps:16,once:true,...TZ1_LEFT},
  // Flame Jet (the game draws the fire from `mouth`): jetStart inhales, draws the head back and thrusts it forward with the jaws gaping;
  // jetAim holds that pose with the head aimed from -20 to 35 degrees (frame picked by the jet's angle, never played); jetEnd snaps
  // the jaws shut and settles onto the base pose.
  jetStart:{src:'assets/tlezcatl-s1-jet-start.png',frames:5,fps:22,once:true,...TZ1_LEFT,mouth:[155,172]},
  jetAim:{src:'assets/tlezcatl-s1-jet-aim.png',frames:5,fps:10,once:true,...TZ1_LEFT,angles:[-20,0,10,22,35],mouth:[[155,176],[155,172],[154,165],[151,157],[149,150]]},
  jetEnd:{src:'assets/tlezcatl-s1-jet-end.png',frames:4,fps:16,once:true,...TZ1_LEFT},
  // Crouch: splays the legs and presses belly and chin flat to the street with the crest laid back (59px tall to 37px, about the
  // crouch hitbox), a slow breathing loop lying flat, and crouchUp = crouchDown reversed. Timing matches the other forms.
  crouchDown:{src:'assets/tlezcatl-s1-crouch-down.png',frames:5,fps:22,once:true,...TZ1_NATIVE},crouch:{src:'assets/tlezcatl-s1-crouch.png',frames:4,fps:6,...TZ1_NATIVE},
  crouchUp:{src:'assets/tlezcatl-s1-crouch-up.png',frames:5,fps:22,once:true,...TZ1_NATIVE},
  // Jump: presses low and coils the tail, then springs off all four legs into a level, legs-tucked leap (rise); the air loop sways the
  // tail out and back from the rise's last pose (frames 0,1,2,1 of its generation); the landing reaches down with the tail flung up,
  // squashes flat on all fours and closes on the base. Bottom-aligned: physics moves him, the art only changes pose. Timing matches
  // the other forms' jumps.
  jumpRise:{src:'assets/tlezcatl-s1-jump-rise.png',frames:9,fps:24,once:true,...TZ1_NATIVE},jumpAir:{src:'assets/tlezcatl-s1-jump-air.png',frames:4,fps:8,...TZ1_NATIVE},
  jumpLand:{src:'assets/tlezcatl-s1-jump-land.png',frames:5,fps:20,once:true,...TZ1_NATIVE},
  // Climb: 256x256 strips, clinging to the wall like a gecko (body vertical, belly to the wall, head up, tail hanging) with the gripping
  // claws on the wall line at frame x=154 (the hitbox edge 24 world units out) and the tail tip on the bottom row. The grab leaps from
  // the base pose and eases 46px onto the wall line, every frame bottom-aligned; the climb loop is hand over hand; the punch draws the
  // upper claw back and slams it into the wall with a flash on impact frame 5; the mantle starts 15px further back (the game's roof
  // slide) and eases into the base pose. PixelLab drew no wall this time. Timing matches the other forms.
  climbGrab:{src:'assets/tlezcatl-s1-climb-grab.png',frames:5,fps:20,once:true,...TZ1_NATIVE},climb:{src:'assets/tlezcatl-s1-climb.png',frames:8,fps:12,...TZ1_NATIVE},
  climbMantle:{src:'assets/tlezcatl-s1-climb-mantle.png',frames:9,fps:20,once:true,...TZ1_NATIVE},climbPunch:{src:'assets/tlezcatl-s1-climb-punch.png',frames:8,fps:24,once:true,impact:5,...TZ1_NATIVE},
  // Magma Dive: dive tips nose-down off the base pose into a vertical head-first plunge, claws reaching down and tail straight up
  // (frames 0-3 of a 9-frame generation, bottom-aligned, held on the last); slamLand = frames 1-8 of a generation from that plunge on
  // the street to the base pose: the snout drives in with a lava burst both sides, he slams flat on his belly and pushes back up.
  dive:{src:'assets/tlezcatl-s1-dive.png',frames:4,fps:24,once:true,...TZ1_NATIVE},slamLand:{src:'assets/tlezcatl-s1-slam-land.png',frames:8,fps:16,once:true,...TZ1_NATIVE},
  // Grab/carry/throw (TZ1_NATIVE): the grab dips the snout and scoops both front claws under the prop at the street (hold on the street
  // in front of the claws, frames 0-3), then rears up onto the hind legs and tail with both claws pressed overhead; carry strains upright
  // with the claws locked up and carry-walk waddles upright the same way (head thrown back, so no eye). `hold` points sit on the claw
  // tips. Throw starts at the release: both claws whip forward and down with swing arcs on frame 1 (the prop launches on the key press),
  // and he drops back onto all fours, ending on the base pose.
  grab:{src:'assets/tlezcatl-s1-grab.png',frames:9,fps:22,once:true,...TZ1_NATIVE,hold:[[192,191],[194,191],[200,191],[190,191],[176,151],[150,112],[131,90],[125,84],[125,84]]},
  carry:{src:'assets/tlezcatl-s1-carry.png',frames:4,fps:6,...TZ1_NATIVE,hold:[[125,84],[126,86],[127,87],[126,86]]},
  carryWalk:{src:'assets/tlezcatl-s1-carry-walk.png',frames:8,fps:10,...TZ1_NATIVE,hold:[[125,84],[125,86],[125,87],[125,88],[125,87],[125,87],[125,86],[125,86]]},
  throw:{src:'assets/tlezcatl-s1-throw.png',frames:8,fps:18,once:true,...TZ1_NATIVE}},
  stages:{2:TLEZCATL_S2}},
};
// Resolves the form drawn for a kaiju at a stage (stage omitted = base form).
function form(name:string,stage?:number):Form|undefined{const s=SPRITES[name];return s&&((stage&&s.stages?.[stage])||s);}
function preload(src:string){if(typeof Image==='undefined'||images.has(src))return;const img=new Image();img.src=src;images.set(src,img);}
function ready(src?:string){const img=src?images.get(src):null;return !!img?.complete&&!!img.naturalWidth;}
// Art loads per kaiju, not all at once: every strip of every form is ~30MB of PNG (~300MB decoded) and a run draws one kaiju.
// Boot loads the slot art and each kaiju's base idle (intro, endings, previews before a kaiju is picked).
const slotArt=()=>[ART_SLOTS.menu,...ART_SLOTS.intro,...Object.values(ART_SLOTS.endings),...Object.values(SPRITES).map(s=>s.anims.idle?.src)].filter(Boolean) as string[];
const strips=(f?:Form)=>f?Object.values(f.anims).map(a=>a.src):[];
export function loadPresentationArt(){for(const src of slotArt())preload(src);}
// Loads one kaiju's strips and drops every other kaiju's (base idles stay). The `first` stage's form, and the base form a `borrow`
// form plays, load and decode before the other stages, so what is on screen is ready soonest; the rest follow so that a stage change
// in either direction never waits on the network. Calling it again for the same kaiju only reorders what is still to load.
let artFor='';
export function loadKaijuArt(name:string,first=1){const s=SPRITES[name];if(typeof Image==='undefined'||!s)return;
 const now=[...new Set([...strips(form(name,first)),...strips(s)])],all=[...new Set([...now,...Object.values(s.stages??{}).flatMap(strips)])];
 if(artFor!==name){artFor=name;const keep=new Set([...slotArt(),...all]);for(const src of [...images.keys()])if(!keep.has(src))images.delete(src);}
 for(const src of now)preload(src);
 const settled=(img:HTMLImageElement)=>img.decode?img.decode().catch(()=>{}):new Promise<void>(r=>{if(img.complete)r();else img.onload=img.onerror=()=>r();});
 Promise.all(now.map(src=>settled(images.get(src)!))).then(()=>{if(artFor===name)for(const src of all)preload(src);});}
// The form and strip drawn for a move: the stage form's own strip, else (a `borrow` form) the base form's, else the stage form's idle.
function pick(name:string,anim:string,stage?:number):{f:Form,a:Strip}|null{const f=form(name,stage);if(!f)return null;
 if(f.anims[anim]&&ready(f.anims[anim].src))return {f,a:f.anims[anim]};
 const b=SPRITES[name];if(f.borrow&&b.anims[anim]&&ready(b.anims[anim].src))return {f:b,a:b.anims[anim]};
 return f.anims.idle?{f,a:f.anims.idle}:null;}
export function hasAnim(name:string,anim:string,stage?:number){const f=form(name,stage);return ready(f?.anims[anim]?.src)||(!!f?.borrow&&ready(SPRITES[name].anims[anim]?.src));}
export function hasSprite(name:string,stage?:number){return ready(form(name,stage)?.anims.idle?.src);}
function strip(name:string,anim:string,stage?:number){return pick(name,anim,stage)?.a;}
export function spriteFrame(name:string,t:number,anim='idle',stage?:number){const a=strip(name,anim,stage);if(!a)return 0;const f=Math.floor(Math.max(0,t)*a.fps);return a.once?Math.min(f,a.frames-1):f%a.frames;}
// Gameplay timing (attack length, intros, impact frame) is data only so headless runs match the browser. A stage form that has not
// animated a strip yet borrows the base form's timing, so combat plays identically while the art catches up.
function timing(name:string,anim:string,stage?:number){return form(name,stage)?.anims[anim]??SPRITES[name]?.anims[anim];}
// Seconds from the start of a strip to its impact frame; 0 if none.
export function animImpact(name:string,anim:string,stage?:number){const a=timing(name,anim,stage);return a?.impact?a.impact/a.fps:0;}
// Seconds a one-shot animation runs; 0 if this kaiju has no such strip (callers then skip it).
// Frame index from which a strip spins about its pivot (the dive's spike ball); null when it does not spin.
export function spinFrom(name:string,anim:string,stage?:number){const a=timing(name,anim,stage);return a?.spinFrom!=null?a.spinFrom/a.fps:null;}
export function animDuration(name:string,anim:string,stage?:number){const a=timing(name,anim,stage);return a?a.frames/a.fps:0;}
// Where a carried prop's bottom-centre sits in this frame, relative to the feet origin in unflipped, unscaled sprite units (the caller
// applies facing and Stage scale). Null when the strip has no hold points or its art is not loaded (the caller keeps its fallback).
// Time into an aim strip that shows the frame whose head angle is nearest `angle` (degrees above level); 0 when it has no angles.
export function aimTime(name:string,anim:string,angle:number,stage?:number){const a=pick(name,anim,stage)?.a;if(!a?.angles)return 0;
 let best=0;a.angles.forEach((v,i)=>{if(Math.abs(v-angle)<Math.abs(a.angles![best]-angle))best=i;});return (best+.5)/a.fps;}
export function holdPoint(name:string,anim:string,t:number,stage?:number,key:'hold'|'pivot'|'mouth'='hold'):[number,number]|null{
 const p0=pick(name,anim,stage),s=p0?.f,a=p0?.a;if(!s||!a?.[key]||a!==s.anims[anim])return null;
 const img=images.get(a.src)!,fw=img.naturalWidth/a.frames,k=s.width/(256*(a.scale??1)),f=spriteFrame(name,t,anim,stage);
 const p=(typeof a[key][0]==='number'?a[key]:(a[key] as number[][])[f]) as number[];
 return [(p[0]-(a.anchor??fw/2))*k,-(img.naturalHeight-1-p[1])*k];}
// Draws at the current origin (feet) in the caller's scaled space; flipping and Stage scale come from the caller's transform.
export function drawSprite(ctx:CanvasRenderingContext2D,name:string,t=0,anim='idle',stage?:number){if(!hasSprite(name,stage))return false;
 const {f:s,a}=pick(name,anim,stage)!,img=images.get(a.src)!,fw=img.naturalWidth/a.frames,k=s.width/(256*(a.scale??1)),w=fw*k,h=img.naturalHeight*k;
 const smooth=ctx.imageSmoothingEnabled,sx=spriteFrame(name,t,anim,stage)*fw,fh=img.naturalHeight,dx=-(a.anchor??fw/2)*k;
 // Enlarged sprites (Stage 3, title art): nearest-neighbour at a non-integer zoom doubles some source pixels and not others, so
 // lines change thickness and crawl as the sprite moves. Scale up by a whole number first, then smooth down to the target size.
 const m=ctx.getTransform?.(),zoom=m?Math.hypot(m.a,m.b)*k:0,even=zoom>1.01?evenPixels(img,sx,fw,fh,Math.ceil(zoom)):null;
 if(even){ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(even,0,0,even.width,even.height,dx,-h,w,h);}
 else{ctx.imageSmoothingEnabled=false;ctx.drawImage(img,sx,0,fw,fh,dx,-h,w,h);}
 ctx.imageSmoothingEnabled=smooth;return true;}
let scratch:HTMLCanvasElement|null=null;
// One frame of a strip, enlarged n times with hard pixel edges, on a reused scratch canvas. Null where there is no DOM (headless tests).
function evenPixels(img:HTMLImageElement,sx:number,fw:number,fh:number,n:number){
 if(typeof document==='undefined')return null;
 scratch??=document.createElement('canvas');const W=Math.round(fw*n),H=fh*n;
 if(scratch.width!==W||scratch.height!==H){scratch.width=W;scratch.height=H;}
 const c=scratch.getContext('2d');if(!c)return null;
 c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);c.drawImage(img,sx,0,fw,fh,0,0,W,H);return scratch;}
function art(ctx:CanvasRenderingContext2D,src:string|null){const img=src?images.get(src):null;if(!img?.complete||!img.naturalWidth)return false;ctx.drawImage(img,0,0,960,540);return true;}
function box(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function polygon(ctx:CanvasRenderingContext2D,points:number[][],color:string){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
// Deliberately simple replaceable geometric stand-ins, not final sprite designs.
export function drawSilhouette(ctx:CanvasRenderingContext2D,name:string,x:number,y:number,size:number,t:number,locked=false,anim='idle',stage?:number){
 const index=Math.max(0,KAIJU.indexOf(name)),color=locked?'#172022':ROSTER[index].color;
 if(!locked&&hasSprite(name,stage)){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size,size);drawSprite(ctx,name,t,anim,stage);ctx.restore();return;}
 ctx.save();ctx.translate(Math.round(x),Math.round(y+(locked?0:Math.sin(t*2)*1.5)));ctx.scale(size,size);
 if(index===0){polygon(ctx,[[-27,-12],[-38,-24],[-29,-25],[-34,-42],[-23,-38],[-22,-59],[-10,-48],[0,-65],[12,-48],[25,-38],[37,-25],[26,-12]],color);box(ctx,16,-35,29,13,color);box(ctx,36,-32,10,9,color);}
 if(index===1){polygon(ctx,[[-44,-8],[-23,-30],[-17,-57],[2,-67],[13,-50],[14,-33],[39,-43],[43,-27],[23,-16],[18,-3]],color);polygon(ctx,[[-17,-44],[-32,-65],[-7,-51]],color);box(ctx,9,-60,27,13,color);polygon(ctx,[[21,-60],[24,-74],[29,-60]],color);}
 if(index===2){polygon(ctx,[[-47,-11],[-25,-23],[-28,-36],[-15,-30],[-8,-47],[1,-33],[15,-44],[23,-28],[40,-27],[47,-17],[26,-9]],color);box(ctx,-25,-22,54,16,color);}
 if(index===3){box(ctx,-31,-43,54,35,color);box(ctx,12,-33,28,23,color);box(ctx,32,-26,14,13,color);polygon(ctx,[[29,-16],[41,-35],[41,-16]],locked?color:'#e1d5b9');polygon(ctx,[[-30,-40],[-25,-56],[-17,-40]],color);}
 if(index===4){polygon(ctx,[[-7,-40],[-42,-66],[-43,-36],[-7,-19]],color);polygon(ctx,[[6,-40],[37,-66],[40,-36],[6,-19]],color);box(ctx,-10,-52,20,45,color);box(ctx,-8,-65,17,16,color);box(ctx,-14,-77,3,18,color);box(ctx,11,-77,3,18,color);}
 if(index===5){polygon(ctx,[[-26,-6],[-25,-48],[-13,-64],[-5,-47],[5,-71],[17,-57],[24,-31],[34,-6]],color);for(let n=0;n<6;n++){const px=-39+n*15;polygon(ctx,[[px,-1],[px-7,-28-n%2*15],[px+2,-20],[px+8,-2]],color);}}
 if(index!==5){box(ctx,-25,-11,13,12,color);box(ctx,10,-11,15,12,color);}
 if(!locked){box(ctx,index===3?29:index===2?35:18,index===4?-59:index===5?-45:index===1?-55:index===2?-23:-31,4,3,index===5?'#c9fbb1':'#f0b3d0');}
 ctx.restore();
}
function ruins(ctx:CanvasRenderingContext2D,color:string,ground=420){
 for(let n=0;n<17;n++){const x=n*63-12,h=55+(n*43%155);polygon(ctx,[[x,ground],[x,ground-h],[x+16,ground-h+14],[x+29,ground-h-5],[x+47,ground-h+8],[x+49,ground]],color);}
}
export function drawMenuBackdrop(ctx:CanvasRenderingContext2D,t:number){if(art(ctx,ART_SLOTS.menu))return;
 box(ctx,0,0,960,540,'#152125');box(ctx,0,220,960,220,'#343b35');ruins(ctx,'#27302f',414);
 for(let n=0;n<13;n++){const x=40+n*75,y=360-(n*31%100);polygon(ctx,[[x-16,y+30],[x-7,y-18],[x+2,y+5],[x+11,y-31],[x+20,y+30]],'#996d50');polygon(ctx,[[x-7,y+30],[x+1,y-4],[x+10,y+30]],'#c18f63');}
 box(ctx,0,416,960,124,'#182725');
 for(const [x,h] of [[40,123],[135,65],[790,88],[900,143]]){polygon(ctx,[[x-29,540],[x-24,540-h*.5],[x,540-h],[x+26,540-h*.6],[x+39,540]],'#a85f88');polygon(ctx,[[x-8,540],[x,540-h+9],[x+13,540-h*.6]],'#eb9ec8');}
 box(ctx,0,0,960,540,'#0c171544');
}
export function drawIntro(ctx:CanvasRenderingContext2D,elapsed:number){const scene=introScene(elapsed);if(art(ctx,ART_SLOTS.intro[scene]))return;
 box(ctx,0,0,960,540,scene<2?'#101f2d':'#263936');
 if(scene===0){for(let i=0;i<44;i++)box(ctx,(i*173+29)%960,(i*97+13)%390,2,2,'#c1d2cb');polygon(ctx,[[120,65],[590,250],[553,283]],'#a88883');polygon(ctx,[[476,240],[585,266],[556,298],[513,286]],'#e5b4a5');ctx.fillStyle='#607f80';ctx.beginPath();ctx.arc(780,535,260,Math.PI,Math.PI*2);ctx.fill();}
 if(scene===1){box(ctx,0,315,960,225,'#6c7c6e');polygon(ctx,[[80,540],[280,300],[450,410],[600,280],[890,540]],'#3d5b52');polygon(ctx,[[460,360],[490,160],[523,348],[680,278],[584,405],[790,460],[550,455],[460,523],[410,445],[250,425],[404,389],[297,270]],'#d8a18a');}
 if(scene===2){box(ctx,0,370,960,170,'#59675a');polygon(ctx,[[230,465],[350,367],[622,367],[750,465]],'#2a443d');for(const [x,h] of [[380,105],[480,220],[575,135]]){polygon(ctx,[[x-30,450],[x-26,450-h*.6],[x,450-h],[x+32,450-h*.6],[x+38,450]],'#b8749b');polygon(ctx,[[x-5,447],[x,450-h+10],[x+14,450-h*.55]],'#ffd0e5');}}
 if(scene===3){box(ctx,0,220,960,280,'#7b9284');ruins(ctx,'#3e5853',442);drawSilhouette(ctx,'Mogurodon',480,466,3.4,0);}
 const within=elapsed%3,fade=Math.max(0,.35-within)/.35;box(ctx,0,0,960,540,`rgba(9,17,23,${fade})`);
}
export function drawEnding(ctx:CanvasRenderingContext2D,name:string){if(art(ctx,ART_SLOTS.endings[name]))return;
 const index=Math.max(0,KAIJU.indexOf(name));box(ctx,0,0,960,540,['#475952','#624c41','#4b5d4c','#63574a','#514d62','#37574c'][index]);box(ctx,0,150,960,320,'#718276');ruins(ctx,'#344e46',440);drawSilhouette(ctx,name,720,455,4,0);box(ctx,0,435,960,105,'#253d34');box(ctx,0,0,960,540,'#0b171755');
}

// Pause-menu move list. `keys` notation: '+' held together, '/' alternatives, '›' in sequence (rendered as key caps).
// Signature moves differ per kaiju; combat and controls are shared. Only Mogurodon's dive art spins, so only he rolls.
export type MoveEntry={keys:string,name:string,desc:string};
export type MoveSection={title:string,moves:MoveEntry[]};
export function moveList(kaiju:string):{moves:MoveSection[],controls:MoveSection[]}{
 const slam:MoveEntry={keys:'SPACE › S',name:'Slam',desc:'Dive straight down from the air. Hits the roof or street you land on plus everything nearby, harder the further you fell. A roof that gives way keeps you falling into whatever is below.'};
 const signature:MoveEntry[]=kaiju==='Mogurodon'?[
  {keys:'L',name:'Tremor Slam',desc:'On the ground: a forward rupture that tears along the street, piercing everything in its path.'},
  {keys:'U',name:'Seismic Rupture',desc:'Full meter. Howl, crash down and pound out shockwaves both ways. Invulnerable while it lasts.'},
  {keys:'SHIFT+A/D › S',name:'Cannonball',desc:'While running, curl into a spike ball and bowl forward through troops, cars and newsstands. Ricochets off the first wall, bursts out at the second. Keep tapping S to stay curled up and keep rolling.'},
  {keys:'SPACE › S › A/D',name:'Cannonball Slam',desc:'Dive as a spinning spike ball. Touch a direction any time in the fall (or dive out of a running jump) and you keep rolling when you land.'},
  {keys:'L',name:'Quill (air / wall)',desc:'Airborne or clinging: flick a single quill. His only anti-air ranged attack.'}]
 :kaiju==='Tlézcatl'?[
  {keys:'L',name:'Flame Jet',desc:'On the ground: hold to breathe a cone of fire that burns everything in it, troops, vehicles, aircraft and incoming rockets alike, until it hits a building or the street. A tap gives a short burst. Drains the flame bar; run it dry and it has to cool off.'},
  {keys:'L+W/S',name:'Aim the jet',desc:'While breathing, hold W to tilt the flame up at aircraft or S to sweep it down across the street. He can creep and turn while he breathes.'},
  {keys:'U',name:'Eruption',desc:'Full meter. He balls up as the pressure builds, then rears up and explodes, blasting everything in a huge circle around him. Molten rock thrown out by the blast rains down all around, leaving burning pools. Invulnerable while it lasts.'},
  {...slam,name:'Magma Dive',desc:'Dive head-first. The crash splashes molten globs out both ways and leaves burning lava pools on the street that scorch anything standing in them, on top of the slam itself.'},
  {keys:'L',name:'Single shot (air / wall)',desc:'Airborne or clinging: fire one shot.'}]
 :kaiju==='Kaiban'?[
  {keys:'L',name:'Debris Shotgun',desc:'On the ground: scoop the street and fling a fan of rock chunks. Devastating point-blank, spreads out at range.'},
  {keys:'U',name:'Stampede',desc:'Full meter. A bellow blasts back anything close, then a head-down charge out and back flattens every building it touches.'},
  {keys:'SHIFT+A/D',name:'Gore Charge',desc:'His run is a head-down tusk charge. Ramming a building with a running start hits far harder than a normal barge (back off and charge again for another hit), troops get thrown, and cars get flipped up over his tusks.'},
  {...slam,name:'Meteor Drop',desc:'Dive tusks- or fists-first. The landing cracks the ground and hurls a ring of rock chunks out both ways, on top of the slam itself.'},
  {keys:'L',name:'Single shot (air / wall)',desc:'Airborne or clinging there is no street to scoop: fire one shot.'}]
 :[
  {keys:'L',name:'Spine',desc:'A horizontal ranged spine.'},
  {keys:'U',name:'Seismic Rupture',desc:'Full meter. Shockwaves both ways while invulnerable (shared preview Ultimate).'},
  slam];
 return {
  moves:[{title:'Signature',moves:signature},{title:'Combat',moves:[
   {keys:'J › J › J',name:'Light combo',desc:'Three-hit string; the third hit is the big one.'},
   {keys:'K',name:'Heavy',desc:kaiju==='Tlézcatl'?'Hold to charge (up to 1.5s), release to smash. On the ground the slam splashes lava out both ways and leaves a burning pool on the street; charged heavies hit far harder and splash more.':'Hold to charge (up to 1.5s), release to smash. Charged heavies hit far harder.'},
   {keys:'S+J',name:'Pound',desc:'Beat down on whatever you stand on. On a rooftop it hammers the building under your feet; the third pound in a row is the biggest.'},
   {keys:'H',name:'Grab',desc:'Pick up a car, wreck, enemy vehicle, lamppost or barricade. At Stage 3, whole small buildings.'},
   {keys:'H/J/K',name:'Throw',desc:'Throw what you are carrying. Hold W to lob it upward at aircraft.'},
   {keys:'J',name:'Wall punch',desc:'While clinging to a building: punch into the wall without letting go.'},
   {keys:'SHIFT+A/D',name:'Shoulder barge',desc:'Run into a building with a running start to slam it (back off and charge again to repeat); troops in your path get bowled over.'},
   {keys:'I',name:'Super',desc:'Stage 3 at full HP with a full Super charge: ~20 seconds of extra damage, speed and toughness.'}]}],
  controls:[{title:'Movement',moves:[
   {keys:'A/D',name:'Move',desc:'Walk left and right.'},
   {keys:'SHIFT+A/D',name:'Run',desc:'Hold Shift, or double-tap A/D (the double-tap opens with a dash). A running jump carries the speed.'},
   {keys:'SPACE',name:'Jump',desc:'Jump. Jump height grows a little as you evolve.'},
   {keys:'S',name:'Crouch',desc:'Duck low. Crouched L fires low.'}]},
  {title:'Climbing',moves:[
   {keys:'W',name:'Climb',desc:'Grab the building beside you. W/S climb up and down; you hang in place when idle and mantle onto the roof at the top.'},
   {keys:'SPACE › A/D',name:'Leap-grab',desc:'Jump into a wall while holding toward it to catch it. Near the top you pull straight up onto the roof.'},
   {keys:'A/D',name:'Climb by pushing',desc:'While clinging, pushing into the wall climbs just like W.'},
   {keys:'SPACE',name:'Hop off',desc:'While clinging: hop off the wall. Hold the direction away from it to leap off at run speed.'}]},
  {title:'Game',moves:[{keys:'ESC',name:'Pause',desc:'Pause, restart or quit; this list lives here.'}]}]};
}
