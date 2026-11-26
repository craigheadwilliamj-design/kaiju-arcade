# New York playtest fixes (work cards)

Playtest feedback on the reworked New York, turned into work cards. Each card stands alone: start a session with the card's text. Read `docs/NYC_REWORK.md` first, since every card builds on the systems it documents.

**Order:** card 0 is done (PR #138, so the default branch `claude/laughing-brown-mq2oup` has the full route). Base every card on the default branch. Cards 1–4 can then run in any order. They all touch `src/game.ts`, so expect small merges if they run in parallel. Card 5 (density) goes last, because it moves buildings that cards 1, 2 and 4 position things against.

## Shared notes (every card)

- **Tests.** `npm test` builds and runs everything. A full run rewrites `qa/stress.json` timings, so revert that file unless the change is intended. The river test `pulls a whole train out of a pit` is flaky under full-suite load, so re-run it alone if it fails. If a card changes route counts or level contents the QA playthrough checks, run `npm run qa`.
- **Opt-in rule.** Every new behaviour is an opt-in `BlockDef` field or config block, documented where the `BlockDef` type lives in `src/levels.ts`, with tests that no other level picks it up. SF must stay byte-identical (`cityLevel` is shared with `sfLevel`).
- **Seeing it in the browser.** `npm run build`, then serve `dist/`. In a Playwright init script set `window.__kaijuTest=true` (this exposes `window.kaijuTest` and `window.kaijuDebug`). Write the localStorage keys `kaiju-arcade:permanent:v2` (`emptyPermanent()` with every `KAIJU` unlocked) and `kaiju-arcade:campaign:v2` = `{version:2,id:'s',initials:'TST',kaiju:'Kaiban',city:CAMPAIGN.indexOf('nyc'),banked:0}`; all of these are importable from `/campaign.js`. Reload, click `#continue` then `#begin-city`, then call `kaijuTest.goto(blockIndex, x)` / `kaijuTest.teleport(x)`. NYC block indices: 0 Battery, 1 Wall Street, 2 SoHo, 3 Times Square, 4 Grand Central, 5 Central Park, 6 Hudson Yards, 7 Herald Square, 8 Empire State, 9 Coney Island. Check `LEVELS` after card 0 lands.
- **Screenshots.** Save before/after shots for each card in `docs/screenshots/` (`nyc-fix-<card>-*.png`).

---

## Card 0: Merge NYC Act 2 into the default branch — **done** (PR #138)

**Problem.** Times Square, Grand Central and Central Park only exist on `main`. The default branch has Act 3, Empire State and Coney Island but not Act 2, and no branch has both.
- `origin/main` (`c06c359`, PR #133) has NYC Act 2 (`393e3d9`): `nycTimesSquare`/`nycGrandCentral`/`nycCentralPark`, `NYC2` in `src/config.ts`, `moodNow()` in `src/game.ts`, and `tests/nyc-act2.test.ts`. It lacks the Tlézcatl kit (PR #134), Act 3 (PR #135), Empire State (PR #136) and Coney Island (PR #137).
- The default branch `claude/laughing-brown-mq2oup` (`cd3bb59`) has PRs #134–#137, but Times Square, Grand Central and Central Park there are still scaffold placeholders (`{...cityLevel('nyc','Times Square',...)}`).
- A trial merge conflicts in `README.md`, `docs/NYC_REWORK.md`, `src/config.ts`, `src/game.ts`, `src/levels.ts`, `src/rolling.ts`, `src/vehicles.ts`, `tests/hitbox.test.ts`, `tests/nyc-scaffold.test.ts`, `tests/terrain.test.ts` and `tests/water.test.ts`.

**Do.** From the default branch, merge (don't rebase) `origin/main`. Resolve every conflict by keeping both sides. The features are additive and opt-in.
- `src/levels.ts`:
  - The NYC `LEVELS` array calls all of `nycTimesSquare()`, `nycGrandCentral()`, `nycCentralPark()`, `nycHudson()`, `nycHerald()`, `nycEmpire()` and `nycConey()`.
  - `BlockDef` keeps every field from both sides: `night`, `board`, the `billboard`/`ball` roof fixtures, `concourse`, `zoo`, `carriages` … `yard`, `balloons`, `ventsAuto`, `wheel`, `coaster`, `finale.perches` …
- `src/vehicles.ts`: `VehicleKind` and the `loose()` exclusions include `ball`, `carriage`, `tether`, `wheel` and `coaster`. Keep both `glide` and `runaway`.
- `src/rolling.ts`: keep Act 2's glide/ball handling and Coney's `tickTrain`/`derail`/`startRunaway`.
- `src/game.ts`: keep both sides' setup, tick and debug hooks: `setupNyc2`/`nycDebug`, `act3Debug`, `setupConey`/`tickConey`, and the climbing finale. `kaijuDebug` spreads all of them.
- The "which levels opt in" tests list both sides' levels.
- `docs/NYC_REWORK.md` marks cards 1–7 done, with both sides' notes. `README.md` keeps both entries.

**Done when** one branch has the full route plus Coney Island, tests are green, a browser check shows Times Square at night with lit boards, and Hudson Yards, Empire State and Coney Island load. Open a PR into the default branch.

---

## Card 1: Clean up the Wall Street subway visuals

**Feedback.** "The subway is a mess and a half on Wall Street. Visually anyway. It seems to function as intended."

**Where.** `nycWallStreet()` in `src/levels.ts` sets `subway:[[sc(1800),sc(3350)]]`, which is roughly world x 2520–4690 at the current `cityScale`. It runs straight under the supertall canyon: the `tall()` mapper lifts every preset of `h ≥ 450` to 740–760 (scaled). The Federal Reserve `vault`, Trinity Church (`|twin`) and the flank towers round the NYSE target at 4300 are also in that stretch. Drawing is `drawSubway()` in `src/game.ts` (it starts with `function drawSubway(){const line=block.subway?.[0]`). Pits are `drawPits()`, trains `drawTrains()`, and the train box is `trainBox()`. The render order in the main draw (search `drawKaiban();drawSubway();drawPits();`) puts the subway and pits **before** buildings.

**What I saw (`main` @ `c06c359`, Kaiban Stage 1).** Even before anything caves in, the subway stretch draws as a darker, lowered road slab: a step down from the street, with its own lane dashes, which spills into the HUD strip at the bottom of the view. It starts and stops mid-block, at x 2520 and x 4690, not at a building edge or a cross street. I didn't get a cave-in screenshot, so reproduce one: pound or slam the street over the line until `kaijuDebug.pits` is non-empty, and screenshot with tall towers either side, a train in the tunnel and a cave-in under a tower base.

**Likely causes to check (confirm with screenshots first):**
1. The line's ends land mid-building, so the slab and tunnel mouth cut through tower bases. Snap the ends into street gaps, or under the `_` gaps in the pattern.
2. The tunnel and pit art assumes low SF/NYC-classic buildings. With 740–1060px towers, tower bases sit over open pits, and fallen or toppled towers (`drawFallen`) overlap the trench. Check how `sink`, collapse and rubble draw over a pit.
3. The SWAT, police, `vents` and junk props drawn on the street over the slab.
4. Traffic and parked cars spawning over the slab or pit (`cars` positions from `cityLevel`).
5. The slab's vertical offset versus `C.ground` under the `cameraY`/`zoom` the tall level uses: the camera has no ceiling, so it rises with roof-hopping and the slab may drift relative to the HUD.

**Fix direction.** Make the subway read cleanly in a tall canyon:
- The street over the line should look like normal street (manhole and grate details are fine) until it actually caves.
- Line ends should be tidy tunnel portals in a gap.
- Pits under towers should be framed (the towers' bases show a broken foundation, not floating over a hole).
- If the slab is a generic `drawSubway` artefact, it should look right on the Battery (`subway` deep line), Grand Central (Metro-North), the Herald/Hudson yards and the `nyc-classic` fixtures too. Do a before/after screenshot of each level that has `subway`.

Keep behaviour identical: the existing train, pit and cave-in tests stay green. Add a small test only if a layout value moves (for example, the line ends sit in street gaps on Wall Street).

---

## Card 2: Make the Charging Bull fully interactive (pick up, throw, destroy)

**Feedback.** "The Bull on Wall Street isn't interactive. It'd be cool to be able to pick it up and destroy it."

**Current code (`main` @ `c06c359`):**
- Config: `BULL` in `src/config.ts` is `{w:70,h:40,mass:5,points:600,minStrength:4,throwSpeed:420,throwLift:260,throwDamage:150}`. It is placed by `bull:sc(560)` in `nycWallStreet()` and spawned as a `createFleet('bull', …)` vehicle in `loadBlock`. Debug reports it at x ≈ 784.
- Grab: `tryGrab()` in `src/game.ts` lets a kaiju with `ROSTER` `ratings[0] ≥ 4` (`bullCarrier()`; Kaiban is 5) lift it. Anyone else gets "TOO HEAVY". The throw is in `throwHeld()`, and on landing (in `tickVehicles`) it does `heavyLanding` and becomes `parked` again.
- It can **never** be destroyed: `flattenVehicle()` returns early for `bull`, `loose()` excludes it, and nothing gives it HP.
- `tests/nyc-act1.test.ts` (~lines 160–175) passes grab and throw in the node harness.

**Why it feels non-interactive. Verify each in the browser before fixing:**
1. **It may be hidden.** In a Wall Street screenshot with Kaiban at x 300, I couldn't pick out the Bull on screen. Parked traffic (a bus and cars from `cityLevel`'s `cars` list) and the hot-dog cart sit around x 700–800. Check whether a vehicle is drawn on top of it, whether its draw (`else if(v.kind==='bull')` in the vehicle draw) runs at all, and whether 70×40 bronze on a dark street is just unreadable at Stage 1 scale. Keep cars and street junk off Bowling Green (a clear zone round `block.bull`), and give it a plinth plus a little fenced plaza so it reads as a landmark prop.
2. **No feedback.** Walking into it does nothing visible, and nothing hints that it can be grabbed. Add a bump (it doesn't budge: a small shake and a clang) and a one-time hint banner the first time the kaiju is in grab reach ("GRAB · THE BULL").
3. **Grab priority.** `options.sort` by distance can pick a nearby car first. Prefer the Bull when it's in reach.

**New: destructible.** Give the Bull HP: add `BULL.hp` (e.g. 400) and `BULL.breakPoints`.
- It still ignores street damage, as designed: stomps, waves, blasts, steam and rubble do nothing.
- It takes damage from deliberate force:
  - landing from its own throw (`throwDamage` back onto it, scaled by fall speed)
  - being slammed or pounded while lying loose
  - Meteor Drop rocks
  - being hit by another thrown heavy object
  - hitting a building or target hard
- At 0 HP it breaks into bronze chunks (`spawnChunks` in bronze `#5b4a3a`/`#8a6a42`), with a big clang (shake, hit-stop), a banner (`THE BULL IS DOWN`) and `breakPoints`. Leave a pair of horns or a severed head as a small grabbable `lamp`-style prop for a payoff throw.
- Show damage states as it takes hits: a dent, cracks, then a horn missing.

**Tests** (extend `tests/nyc-act1.test.ts`):
- street damage still doesn't hurt it
- three or four hard throws break it
- the score is awarded once
- chunks and a prop spawn
- the "too heavy" path is unchanged for weak kaiju
- no other level has `bull`

Take a screenshot of it visible at Bowling Green, held, and broken.

---

## Card 3: Pick up and throw the Times Square ball after it drops

**Feedback.** "I love the New Year's ball drop being there. I would love to be able to pick it up and throw it after I knock it over."

**Current code (`main` @ `c06c359`, after card 0 on the default branch):**
- `NYC2` in `src/config.ts`: `ballSize:Math.round(46*CITY_SCALE)`, `ballMass:6`, `ballSpeed:330`, `ballGlide:14`, `ballFall:.9`, `ballPoints:1500`, `crowdPoints:10`.
- In `src/game.ts`, `setupNyc2`/`tickNyc2` and `ballFall` handle the drop. After the drop the ball becomes a vehicle of kind `ball` (`makeProp(..., 'ball', ...)`), and `startRolling` sends it down Broadway with `plows=8`.
- `rollImpacts` squashes civilians for `ball` and stops it dead (`state='parked'`) when it hits a building.
- `loose()` in `src/vehicles.ts` excludes `ball`, so `tryGrab()` never offers it, and `flattenVehicle()` returns early for it. Once it stops, it's dead scenery.

**Do:**
1. **Grabbable** once it's on the street (parked, or rolling below some speed, e.g. `NYC2.ballGrabSpeed`). Add a `ball` branch in `tryGrab()` like the Bull's. Decide on a strength gate. Recommendation: any kaiju at Stage 2+, since Times Square is Stage 2; it's glass, not bronze. Hold it overhead (the `holdPoint` path). Keep its spin angle while held. It should glow and sparkle in the hand (the existing `drawBallSphere`).
2. **Throwable.**
   - **Forward throw:** a bowling-ball arc that, on landing, **rolls again** (`startRolling` in the throw direction with the remaining speed) instead of settling. It plows crowds, cars and troops via the existing `rollImpacts`, and the crowd-squash credit still counts.
   - **W+throw lob:** anti-air, using the normal up-throw. It smacks helicopters.
   - **Impact damage:** heavy (a `NYC2.ballThrowDamage`), dealt through `vehicleImpacts`, and it can hurt the target and buildings.
3. **Re-usable, with a finish.**
   - The ball takes chip damage per hard impact (`NYC2.ballHp`), showing cracked panels, then shattered segments.
   - At 0 HP it **shatters** into a big glittering burst: the crystal and LED panels as chunks and sparkles, plus confetti in NYE colours, with a `HAPPY NEW YEAR` banner and bonus points.
   - That way you get a few great throws and then a payoff, not an infinite weapon.
4. **Rolling stop.** If it rolls into a building, keep the current stop. If it's slow, just let it settle as parked (grabbable).
5. Score: `ballPoints` only once (the drop). Throws earn the normal impact and crowd points.

**Tests** (extend `tests/nyc-act2.test.ts`):
- grab after the drop
- a thrown ball re-rolls on landing and squashes civilians
- a lob hits air units
- N impacts shatter it once
- `loose()` and the opt-in checks stay correct (the ball is still only on Times Square)

Take screenshots: the ball held overhead, mid-throw, and the shatter.

---

## Card 4 (done): Day → dusk → night → dawn → day transition around Times Square

**Feedback.** "Times Square is the best map so far. But the fact that it's night and the blocks around it are day is jarring. Have a transition from day to dusk to night to dawn to day as you approach and leave Times Square."

**Current code (after card 0):**
- `moodNow()` in `src/game.ts` returns `block.night?NYC2.night:CITIES[cityIndex].mood`. This is a hard switch per level.
- Moods: NYC day is `{top:'#86aac2',bottom:'#e8d5a9',far:'#9aa9ab',mid:'#7b8d8f',near:'#566a6e',win:'#e9cf86',lights:.15,sun:'#ffe4a6'}` in `CITIES` in `src/levels.ts`. Night is `NYC2.night` in `src/config.ts`.
- Readers of the mood:
  - sky and stars, sun and moon, far and mid skyline windows (the `background()` code, `farSkyline()`)
  - `facade()` lit windows
  - `drawDeco`
  - fire glow (`tickFire`/flames: `lights>.6`)
  - the stone and dome window lighting (`lights>.4`)
  - rain
  - the grid-blackout dark facade logic, which keys off `block.night` directly (search `dark=!!block.night`)
  - `boardLit`/billboards
- Several of these are thresholds (`night=m.lights>.6`), so a smooth blend will pop unless they become continuous.
- Route order: Battery, Wall Street, **SoHo → Times Square → Grand Central**, Central Park, …

**Design.**
- **SoHo and Canal Street:** day for most of the level. From about two-thirds of the way in, golden hour (warm orange sun, long low light), reaching **dusk** at the east exit: purple-orange sky, windows starting to come on (`lights` ≈ .5).
- **Times Square:**
  - It opens at late dusk at the west edge and goes to full night within the first screen or so.
  - It stays full night through the middle, where the square and the ball tower are.
  - Toward the east exit it reaches pre-dawn: deep blue lifting to a pale horizon.
- **Grand Central:** it opens at **dawn** (pink-gold horizon, windows switching off, a low sun) and reaches full NYC day by about a third of the way in.
- Don't touch other levels or cities.

**Implementation sketch.**
- Add an opt-in `BlockDef` field, `moodRamp?:[x:number, mood:Mood|'day'|'night'|'dusk'|'dawn'][]`: mood stops by world x, with named keys resolved from a new `NYC2.dusk` / `NYC2.dawn` / `NYC2.goldenHour` (plus the city day mood and `NYC2.night`). Keep `night:true` working (Times Square can keep it for blackout semantics and add a ramp).
- `moodNow()` returns the blend at the **camera centre** (`camera + viewW()/2`): lerp the hex colours and `lights`, and use the nearer stop for booleans like `rain`/`smog`. Cache it once per frame, since it's read many times per frame.
- Make the threshold readers continuous:
  - stars' alpha from `lights`
  - the sun/moon position, size and colour sliding from sun to moon (the sun sets toward the horizon in SoHo; at dawn it rises in Grand Central)
  - window-lit probability already uses `m.lights*4`, which is fine
  - fire glow alpha ∝ `lights`
- Billboard and neon brightness: the boards stay lit day and night, but their glow halo scales with `lights`.
- The grid-blackout darkness should apply whenever `lights` is high, not only on `block.night`, or stay keyed to `night` but fade with `lights`.
- Make sure the HUD minimap and the level intro card don't snap.

**Tests:**
- `moodNow()` at given camera x on SoHo, Times Square and Grand Central returns the expected blend (lights rising and falling monotonically along each ramp)
- no other level has `moodRamp`
- SF and other cities are untouched
- Times Square blackout tests still pass

**Screenshots:** a strip along SoHo (day, golden, dusk), Times Square (west, centre, east) and Grand Central (dawn, day). Walk the boundary in the browser to check it reads as continuous across the level change.

---

## Card 5: Make Manhattan feel dense

**Feedback.** "Overall, Manhattan doesn't feel dense enough. Really my only complaint."

**What's thin now:**
- **Street gaps.**
  - `cityLevel()` in `src/levels.ts` turns `_` into a 240px gap and `=` into a 420px gap (before `cityScale`), and buildings are packed `x+=w+4`.
  - NYC patterns use a lot of gaps: `NYC_ROW='s,m,h,_,l,s,m,_,h,r,_,n,s,m,_'` has 4 gaps per 15 tokens, and Times Square, Grand Central and the placeholders reuse it.
  - The `>N` jumps (e.g. Wall Street's `>1500`, `>5050`; Times Square's `>1600`) leave long empty runs.
  - Stronghold levels also clear `[mid-900, mid+560]` around the target.
- **Short buildings.** Most presets are mid-rise (`s` 150, `m` 240, `h` 330 before scale). The playable street-front reads as a row of separate mid-rises with lots of sky between them.
- **The backdrop is low and sparse.** On Wall Street at Stage 1 the background (`farSkyline()` and the mid layer in `background()`) is a uniform band of ~8–12-storey grey blocks with daylight sky above. Manhattan should be a wall of towers behind the playable row.
- In the Wall Street screenshots, only the supertall canyon (x ≈ 2500–4700) feels like Manhattan. The Bowling Green end and everything past the target feel suburban.

**Do** (NYC only; SF output must stay byte-identical):
1. **Tighter street-front.**
   - Add a `cityLevel` option, e.g. `opts.dense` or a per-city gap table, so NYC gaps are narrower: `_` ≈ 140, `=` ≈ 260 (tune by play).
   - Thin the gap tokens out of the NYC patterns. Keep real cross streets only where gameplay needs them: cars, steam `vents`, the subway line ends, troop lanes and stronghold rings.
   - Fill the `>N` dead runs with buildings unless they're intentional (water at the Battery, plazas, Central Park lawns).
2. **Taller street-front.** Add NYC presets or a height jitter (e.g. `s`/`m` → 4–8-storey walk-ups next to 20–40-storey `h`/`x`/`n` towers), so roofs step irregularly but stay within a jump of each other. Respect each level's growth: Act 1 at Stage 1 must still be able to climb and hop.
3. **A second rank of buildings.** A non-interactive layer drawn just behind the playable buildings: darker, slightly smaller, parallaxing slowly, so gaps show more buildings, not sky. This can be a new background layer in `background()`, styled per `CITIES[...].style==='nyc'` and keyed to the level's district (downtown canyon, SoHo lofts with water towers, Midtown towers, the park with the Fifth and Central Park West skylines).
4. **A denser far skyline for NYC.** A much taller, busier `farSkyline()` for `nyc` with recognisable pieces placed per level:
   - One WTC from downtown
   - the Empire State/Chrysler from Midtown (Herald already draws the Empire State)
   - more mid-layer towers and water towers
   - lit windows that obey `moodNow()` (and card 4's ramp)
5. **Street clutter.** More parked cars, cabs, scaffolding sheds, hot-dog carts, newsstands, subway entrances and hydrants, scaled to stay under the vehicle cap (`VC.vehicleCap`) and perf budget.

**Guard rails:**
- Run `npm run perf` before and after: dense levels can't drop the frame rate in the stress test.
- Keep exits, spawn, targets, stronghold rings, `vents`, `bull`, balloons, the deck spans, the subway lines and the Empire State tower unobstructed.
- The NYC act tests that assert positions (e.g. "the Bull is on open street", the vent and span positions) must stay true. Update their numbers only where the layout intentionally moved.
- Don't touch `nyc-classic` or SF.

**Done when** before/after screenshots of every NYC level show a continuous wall of buildings with towers behind, perf holds, and tests are green.
