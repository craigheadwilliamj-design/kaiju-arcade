# Sargathoth — kit design

Status: **design only.** Nothing here is implemented, and there is no art yet. This doc exists so the moveset is settled
before animation starts. All numbers are provisional starting points in `src/config.ts` style; tune in play.

## Identity

- **What he is:** a colossal mass of algae and seaweed (kelp fronds, gas bladders, holdfast) grown through maritime
  debris — barnacled hull plating, anchor chain, old fishing nets, tyre fenders, buoys.
- **Roster card:** colour `#79ad91`; ratings Damage 4 / Speed 1 / Resistance 5 / Range 4 (`ROSTER` in
  `src/presentation.ts`); ending *The World Reclaimed*.
- **Campaign:** Tokyo final boss (`tyo`, *Sargathoth Arena*). Tokyo has `rain:true`, which matters for his regen.
- **Play pattern:** he's the slowest kaiju and the hardest to move, and he can't chase anything. So he **makes things come
  to him**: he lays traps, pins targets, reels them in and punishes whatever ends up at his feet.
- **Debris as armour:** the debris explains Resistance 5. Hits knock off flecks of debris and barnacle rather than splashing goo.

## Status and hazard

The others each have one status and one ground hazard (Tlézcatl: burning + fire patches; Belial: corrosion + acid puddles;
Myrmex: poison + venom pools). Sargathoth follows the same pattern, and everything in his kit feeds back into **Tangled**.

| | Status | Ground hazard |
|---|---|---|
| Tlézcatl | Burning | Fire patches |
| Belial | Corroded | Acid puddles |
| Myrmex | Poisoned | Venom pools |
| **Sargathoth** | **Tangled** | **Kelp Snares** |

### Tangled
Wrapped in kelp and net.
- **Troops, vehicles, the rival:** pinned for `tangleSeconds`. Troops' wind-ups slow while held, and they take
  `tangleMeleeVuln` more damage from his melee.
- **Buildings:** kelp-wrapped for `tangleBuildingSeconds`, taking `tangleBuildingVuln` more damage from everything.
- **Every Tangled target can be reeled** (see Kelp Line).

### Kelp Snares
A heap of kelp and old net lying on the street.
- **Catching:** the first troop, vehicle or rival to step or drive into it is Tangled, and the snare is spent. One catch per snare.
- **Lifetime:** `snareSeconds` if nothing touches it. That's longer than fire or acid, because a trap has to wait for its prey.
- **Cap:** at most `snareCap` at once, oldest removed first, so he can't carpet the block.
- **Traffic:** a car that drives in stops dead, and the traffic behind it piles up into a jam of stationary targets.
- **Against the player** (boss fight): the player can be caught too. They're held briefly and mash or jump to break free.
- **Art:** an effect sprite with three states (resting / triggered-wrapping / spent). It's not a body strip.

## Passive — Holdfast

Kelp anchors with a holdfast, so this is his stance.
- **Entering it:** hold crouch for `holdfastDelay` and he anchors (`holdfast-down` → `holdfast-idle` loop → `holdfast-up`).
- **While anchored:**
  - He can't be knocked back or staggered.
  - He takes `holdfastResistance` less damage.
  - Kelp Line reach is multiplied by `holdfastRange`.
  - He can light, heavy and ranged attack, but can't walk.
- **Water regen:** he heals `holdfastRegen` HP/s, but **only** while anchored in water (wading, a flooded street, the
  water Verdant Eruption leaves) or in rain. In dry cities Holdfast is armour only; Tokyo's rain lets the boss heal on home
  turf. (Regen from squashing civilians was considered and dropped: it would make crowd-hunting the best play, where water
  makes positioning and weather the skill.)
- **Gas bladders:** he has the worst ground jump on the roster (`sargJump`), but falls a little slower than normal
  - **Implemented (Stage 1):** `SARG.jump` (.85 launch speed, so about .72x the height) and `SARG.fallGravity` (.85, falling only, not in a dive or roll); strips `jump-rise` / `jump-air` / `jump-land` from `tools/sargathoth_s1_jump.py`. Sinking slowly in water is not done.
  (`sargFallGravity`) and sinks slowly in water. Keep it subtle: Myrmex is the floaty one, and Sargathoth gets no extra jumps.
- **Super armour while charging a heavy.**
- **Walk** at `sargMoveSpeed` of normal.
  - **Implemented (Stage 1):** `SARG.moveSpeed` (.8) scales both walking and running (shift or double-tap dash), so his run is a lumbering surge, not a sprint; the run strip is `tools/sargathoth_s1_run.py`. No water speed-up yet (open question 1).

## Moves

### Light — Frond Lash
1. Swipe, normal reach.
2. Frond backhand, ×1.2 reach.
3. Kelp-blade whip, ×1.6 reach. It wraps small units and **pulls them in** instead of knocking them back.

**Crouch light (pound):** a holdfast stomp that **places one Kelp Snare** just in front of him.

### Heavy — Undertow
**Implemented so far (Stage 1):** a breaking-wave strip set (`tools/sargathoth_s1_heavy.py`); the hit lands on the slam's crash frame, reaches `SARG.undertowReach` x the normal heavy reach and rolls a surge wave ahead (`SARG.surge*`); charging is super armor (`chargeArmor` in `src/combat.ts`). The snare throw below waits on Kelp Snares.

Hold → rear → slam (`heavy-hold` / `heavy-rear` / `heavy-slam`), the arm swelling as fronds bunch up on it. At
`undertowSnareCharge` or more of a full charge, the slam throws `undertowSnares` Kelp Snares out across the street ahead.

### Ranged (grounded) — Kelp Line ← signature
- **Firing it:** hold L and a long kelp strand, trailing fronds and old net, lashes out low along the street, out to
  `lineRange` × √stage scale (× `holdfastRange` while anchored).
- **Latching:** it latches onto the first troop, vehicle or building it reaches and Tangles it.
- **Reel:** tap L again within `reelWindow` of a hit to yank the target in.
  - Troops and cars land at his feet, ready to grab.
  - The rival gets a short pull (`reelRivalPull`) plus a stagger.
  - On a Tangled building, he tears off a chunk of façade, which is flung down at his feet as debris.
- **Strips:** `line-start`, `line-hold` (loop), `line-reel`.

### Ranged (airborne / clinging) — Bladder Bomb
Replaces the shared single shot, as Mogurodon keeps his quill. He lobs a gas bladder that pops into a cloud of toxic bloom.
The cloud hits aircraft and slows their wind-up while they're in it. This is his anti-air. Strip: `bladder-throw`.

### Dive — Anchor Drop
A ship's anchor on a chain, tangled in his kelp. Mid-air he swings it under himself and lands on it: a clank of chain, a
wet slap. Ground units within the landing radius (scaled by drop power, like the other dives) are Tangled, and the chain
lays `anchorSnares` Kelp Snares to either side. Off a big drop, buildings touching the landing are Tangled. Uses the
shared `dive` / `slam-land` strips.

### Ultimate — Verdant Eruption
Planted. It goes out, then **comes back**.

1. **Charge (`ult-charge`, `vErupCharge` s).** He sets his Holdfast (with its armour). Manhole covers rattle loose,
   storm drains gush green seawater and the street starts to flood. It's the longest wind-up on the roster: a big tell
   for the boss, and a real commitment for the player.
2. **Eruption (`ult-roar` impact frame).** A kelp forest bursts up through the street and races outward both ways at
   `vErupSpeed`, out to `vErupRange` × √stage scale. It travels; it doesn't hit everything at once.
   - Stipes grow skyline-tall, and fronds snatch aircraft out of the sky. It covers the full screen height.
   - Troops, vehicles and the rival it reaches are Tangled and hoisted into the kelp (`vErupDamage`).
   - Every building it touches is Tangled and takes `vErupBuildingDamage`. Weakened ones slough apart over
     `vErupCrumble` s rather than collapsing instantly.
   - Maritime debris erupts with it and rains down as scatter impacts (`vErupDebris` pieces, `vErupDebrisDamage` each).
     Debris scales with stage: crates and buoys at S1, shipping containers and a trawler hull at S3.
3. **Undertow (`ult-settle`).** The forest collapses and the floodwater recedes toward him, **dragging everything still
   Tangled to his feet**: troops, cars and the rival. He ends the Ultimate with a pile of prey in grab and Frond Lash
   range. It's the only Ultimate that repositions enemies.
4. **Aftermath.**
   - The swept street is left ankle-deep in water for `vErupFloodSeconds`; anchoring in it triggers Holdfast regen.
   - `vErupSnares` Kelp Snares are scattered through the flood zone (within `snareCap`).

All of it counts as Ultimate damage, so none of it refills the meter.

**Tuning risk:** the Undertow pull + snares + water regen together could snowball. If he feels too safe after his
Ultimate, cut regen in the Ultimate's own water first. Keep the pull: that's the fun part.

## As the Tokyo boss — Abyssal Overgrowth

- **Holdfast as the tell:** he anchors in the rain to heal. The player has to deal `bossHoldfastBreak` damage while he's
  anchored to tear the holdfast loose, which staggers him for `bossHoldfastStagger` s (same pattern as Tlézcatl's
  `eruptStagger`).
- **Reel into Undertow:** he Kelp Lines the player into Undertow range, then lays snares around them. Jumping the line is the counter.
- **Snares are the core skill:** watching where you step is what the final fight tests.
- **Stage 3 phase, Abyssal Overgrowth:** a red tide / algal bloom.
  - The arena progressively floods green, and bloom patches spread and choke the street.
  - Tangled buildings become kelp pillars he can reel *himself* toward. It's the closest thing he has to mobility.
  - Exact phase triggers and hazard spread rate are TBD.

## Provisional numbers

Starting points only, named in `src/config.ts` style. Distances are Stage 1 and scale with √stage scale like the other
kaiju unless noted.

```ts
// Sargathoth — movement and Holdfast
sargMoveSpeed:.8,sargJump:.85,sargFallGravity:.85,
holdfastDelay:.6,holdfastResistance:.35,holdfastRange:1.3,holdfastRegen:1.5,
// Tangled
tangleSeconds:2.5,tangleMeleeVuln:.25,tangleBuildingSeconds:6,tangleBuildingVuln:.2,
// Kelp Snares
snareSeconds:8,snareCap:7,
// Undertow (heavy) / Anchor Drop (dive)
undertowSnareCharge:.8,undertowSnares:3,anchorSnares:2,
// Kelp Line (grounded ranged)
lineRange:520,lineSpeed:900,lineCooldown:.7,lineDamage:14,reelWindow:1,reelRivalPull:140,
// Bladder Bomb (air / wall ranged)
bladderSpeed:480,bladderCloud:60,bladderCloudSeconds:2.5,bladderDamage:4,bladderTick:.3,bladderSlow:.5,
// Verdant Eruption (Ultimate)
vErupCharge:.9,vErupSpeed:700,vErupRange:1100,vErupDamage:60,vErupBuildingDamage:260,vErupCrumble:2,
vErupDebris:14,vErupDebrisDamage:20,vErupFloodSeconds:6,vErupSnares:4,
// Boss
bossHoldfastBreak:120,bossHoldfastStagger:1.5,
```

## Animation list

Per stage, ×3 (S1 / S2 / S3).

**Shared set (same as the other kaiju):** `idle`, `walk`, `run`, `jump-rise`, `jump-air`, `jump-land`, `crouch-down`,
`crouch`, `crouch-up`, `light1`, `light2`, `light3`, `heavy-hold`, `heavy-rear`, `heavy-slam`, `dive`, `slam-land`,
`climb`, `climb-grab`, `climb-punch`, `climb-mantle`, `grab`, `throw`, `carry`, `carry-walk`, `ult-charge`, `ult-roar`,
`ult-settle`.

**Unique:**
- `line-start`, `line-hold` (loop), `line-reel` — Kelp Line.
- `bladder-throw` — Bladder Bomb.
- `holdfast-down`, `holdfast-idle` (loop), `holdfast-up` — stance. The crouch strips can likely be reused for these, with
  the holdfast itself drawn as an effect.

The dive uses the shared `dive` / `slam-land` strips, with the anchor and chain drawn on them. The name "anchor" belongs
to the dive only, which is why the stance strips are `holdfast-*`.

**Effects and props (not body strips):** Kelp Snare (3 states), Kelp Line strand, bladder + bloom cloud, kelp forest
stipes, debris pieces (per-stage set), floodwater and draining drains.

## Open questions

1. **Run:** does he run at all, or only lumber? Option: slow on land, faster in water.
2. **Body:** mostly kelp (big fronds and bladders that animate on the body), or a slimy mass that sheds kelp (body
   simpler, more done with effects)? This sets how much of the animation load is body versus effects.
3. **Abyssal Overgrowth:** phase triggers and how fast the bloom spreads.
