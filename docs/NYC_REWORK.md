# New York rework plan (campaign redesign, city 2)

New York gets the same treatment San Francisco got: an authored route of nine levels plus one secret level, three acts, its own playable kaiju and boss, per-level growth, and one new mechanic per level built as an opt-in `BlockDef` field. Everything SF built is reusable.

Status: **scaffold done (card 1)**, **Act 1 done (card 2: The Battery, Wall Street, SoHo and Canal Street)**. The city entry, `cityLevel`, the nine route levels and Coney Island as placeholders (names, screens, kinds, growth, exits, landmarks), the `nyc-classic` fixture city with `kaijuTest.gotoCity`, the retargeted tests, `tests/nyc-scaffold.test.ts`, the QA playthrough and the README are in. Cards 3 to 7 are still to do. Work is queued as separate sessions (see "Work cards" at the end). Each card reads this file first.

## Fixed decisions

- **Playable kaiju: Kaiban.** Beating him at the Golden Gate unlocks him. NYC sets `kaiju:'Kaiban'` in `CITIES`, so a campaign plays him there whatever the run picked (`kaijuFor` in `src/campaign.ts`).
- **Boss: Tlézcatl.** This follows the redesign rule that each city's final boss is the next city's kaiju (next is Mexico City). NYC sets `boss:'Tlézcatl'`. Beating him unlocks Tlézcatl and Mexico City, through the existing `conquerCity`.
- **Nine route levels plus one secret level**, in three acts. The growth curve is SF's:
  - **Act 1:** Stage 1, cap 1. The last level's crystal lifts the cap to 2.
  - **Act 2:** Stage 2, cap 2. The branch level's crystal lifts the cap to 3.
  - **Act 3:** Stage 3, cap 3, soft floor Stage 2.
- **The camera follows the kaiju up with no ceiling.** `maxCameraY` is gone, so towers can be as tall as the level wants. No building is unclimbable. Climbing works on every wall, and that's the point of the tall levels.
- **The old five NYC blocks are kept as test fixtures**, off the route. These are Lower Manhattan, Midtown Corridor, Central Stronghold, East River Offensive and Kaiban Arena. They were the pilots for city systems, terrain and river/bridge/subway, and many tests boot them. See the scaffold card.
- **Built the SF way.** Levels are authored with the generalised `sfLevel` pattern builder (to become `cityLevel`), plus hand-built pieces (`hall`, `scaled`) and opt-in `BlockDef` fields documented in `src/levels.ts`. Runtime never generates layouts.

## Story thread

1. **Arrival.** Kaiban retreated into the fog at the Golden Gate. He surfaces in New York Harbor.
2. **Foreshadowing.** Something is heating Manhattan from below. Steam vents start in Act 1 (SoHo) as a street hazard. They get hotter and more violent through Act 3 (Hudson Yards geysers). Then the street splits on 34th Street and Tlézcatl erupts out of it.
3. **The fight.** The boss is a vertical fight up the Empire State Building.
4. **Retreat.** At 0 health Tlézcatl isn't KO'd. He dives off the mast back into the magma, south toward Mexico City.

## Kaiban's kit vs New York

Kaiban is slow and tough: ratings 5/1/5/2. His moves are Debris Shotgun (ranged), Stampede (Ultimate charge down a lane), Gore Charge (a stronger running barge) and Meteor Drop (rocks on a slam landing). Level design leans into that:
- **Long straight avenues** (Times Square, 34th Street, Park Avenue) are Stampede lanes.
- **Tall, tight canyons** (Wall Street, Hudson Yards) reward climbing and Meteor Drops off the roofs.
- **Gore Charge** is how you break barricade lines and parade floats.

## Levels

Columns: screens / kind / growth `startStage-cap(capLift)` / military `tier`. "Reuses" lists existing systems; "New" is the one thing the level adds (opt-in, documented, tested).

### Act 1: Downtown (Stage 1, NYPD then the first Guard)

**1. The Battery** (8 / stronghold / 1-1 / tier 1) — **done (card 2)**
- **Route:** start waist-deep in the harbour west of the Battery, with the Statue of Liberty in the far skyline. Wade ashore past police boats and the moored Staten Island Ferry, then climb the seawall (Kaiban is too slow to jump it cleanly). Battery Park has trees and the SeaGlass carousel. The South Ferry subway loop caves in under it. Push north-east to Castle Clinton, the target: a round sandstone fort with NYPD Harbor Unit dug in round it.
- **Reuses:** water bands, police boats, a deep subway, `police`, `air`, a `hall` building for the ferry terminal.
- **New:** start in the water (spawn in a water band, no tunnel pocket), and the fort target art (`art:'fort'`, a low round wall).

**2. Wall Street** (7 / stronghold / 1-1 / tier 2) — **done (card 2)**
- **Route:** Broadway at Bowling Green (the Charging Bull), into the Wall Street canyon. The towers are tall and packed tight, so the street is a gauntlet of barricades and SWAT with helicopters overhead. The roofs are the fast, safe route: hop tower to tower. Trinity Church is the landmark (`|twin` or a spire). The target is the NYSE command post: the columned NYSE facade with the NYPD command post in front. Hit it from a roof with a Meteor Drop for the drop-height bonus. Flanking towers topple onto it (the SF Financial District flank rule already damages a target).
- **Reuses:** police, SWAT, air, a subway (the 4/5 line), flank toppling, the vault cache (the Federal Reserve: `m:vault`, gold).
- **New:** **the Charging Bull**, a bronze prop. It is heavy: grabbable only by a carry-capable kaiju, thrown short and hard, and it can't be destroyed by street damage. Plus NYSE target art (`art:'exchange'`).

**3. SoHo and Canal Street** (7 / district / 1-1(2) / tier 2) — **done (card 2)**
- **Route:** cast-iron loft rows with fire escapes and rooftop water towers (the `tank` roof fixture). Canal Street has vendor stalls and the Holland Tunnel approach jammed with traffic. The crystal under Canal Street lifts the cap to 2 (grow to Stage 2). The Guard rolls in at the exit (`guard`).
- **Reuses:** roof tanks, street junk (hot dog cart, trash), the `crystal`, `guard`, parked cars as a traffic jam (the gridlock pattern from the Bay Bridge).
- **New:** **steam vents**, the foreshadowing hazard.
  - Manholes in the street vent periodically, and a slam or pound near one bursts it.
  - A burst vent is a steam jet: it scalds troops, launches cars, and briefly blinds helicopters flying through it.
  - It never sets buildings alight. Steam isn't fire, so it is distinct from SF's gas mains.
  - Define it as a `STEAM` config block. The level field is `vents:number[]`.

### Act 2: Midtown (Stage 2, the Guard, then tanks)

**4. Times Square** (7 / district / 2-2 / tier 2)
- **Route:** night, the only night level, with lit windows and neon. Billboards cover the buildings (the `sign` roof fixture plus facade billboards). Crowds flee. The power grid feeds the screens: destroy the substation and that grid's billboards and windows go dark (an existing city system, now visible). One Times Square (the ball-drop tower) is the landmark: knock the ball loose and it rolls down Broadway (`src/rolling.ts`). Long straight avenues make good Stampede lanes.
- **Reuses:** substations and grids, roof signs, rolling physics, the population system.
- **New:** **a per-level night mood** (`night:true` or `moodOverride` on `BlockDef`, read where `CITIES[cityIndex].mood` is read), and **billboards that black out with their grid**.

**5. Grand Central** (7 / stronghold / 2-2 / tier 3)
- **Route:** Park Avenue South climbs onto the Park Avenue Viaduct, which wraps round the terminal (the elevated system, `elevatedLook:'freeway'`, single deck). The Chrysler Building is the climbable landmark to the east. The MetLife tower stands right behind the terminal and topples onto it. Metro-North trains run in the tunnel under Park Avenue and burst out when the street caves in. The target is the Grand Central Terminal facade (`art:'terminal'`: the clock, the arched windows, the Mercury statue group), with the Guard and tanks on the viaduct.
- **Reuses:** elevated, the subway (trains), flank toppling, `deckUnits`-style troops on the viaduct, `garrison`.
- **New:** the terminal target art, and **the concourse cave-in**. Break the terminal's roof from above and fall into the Main Concourse, a pit like the Union Square garage, full of commuters and police.

**6. Central Park** (8 / open, two exits / 2-2(3) / tier 3)
- **Route:** there-and-back like Fisherman's Wharf. The kaiju starts mid-map, entering from Central Park South. Landmarks along the way: Gapstow Bridge, the Pond, Wollman Rink, the zoo (animals flee like the Pier 39 sea lions), Bethesda Terrace, the Great Lawn (Guard dug in with APCs), Belvedere Castle (the crystal, cap lift to 3) and the Reservoir.
- **Water:** the Reservoir is over a Stage 2 kaiju's head and wading depth at Stage 3, so the crystal opens it (the same rule as the Wharf bay).
- **Exits:** west exit → Hudson Yards (the main route). East exit, past the Reservoir → a subway entrance, the Q train to Coney Island (secret).
- **Reuses:** `exits`, `capLift`, water bands, the sea lion flee logic (reskinned as zoo animals), terrain.
- **New:** park ground: trees as dense breakables, rock outcrops as terrain bumps, and carriage horses that bolt. Mostly a content and art pass, with no big system.

### Act 3: The West Side and the top (Stage 3, the full military)

**7. Hudson Yards** (8 / district / 3-3 / tier 4)
- **Route:** the High Line (`elevatedLook:'park'`, the roof-park drawing over nothing; no buses here), the Vessel (a landmark, `|lattice` or a new shape), and the towers of Hudson Yards. The yards are built on a deck over a live rail yard. Steam geysers break out all over (the vents at full strength: Tlézcatl is close) and trigger on their own, with no slam needed.
- **Reuses:** elevated park, steam vents, the subway/train system for the yard trains, terrain.
- **New:** **the rail-yard deck.** The plaza and towers stand on a deck over the tracks, using the `bridge` spans logic with the yard below. Break the deck spans and the towers on them sink and tilt into the yard (reuse `sink` / topple). Trains in the yard are grabbable (the Stage 3 train pull already exists).

**8. Herald Square / 34th Street** (8 / stronghold / 3-3 / tier 4)
- **Route:** the Thanksgiving parade route. Macy's flagship, Penn Station, then Madison Square Garden (the target, `art:'arena'`, a drum with the Army's NYC field HQ inside).
- **Military:** the full military with parade floats as cover. Long 34th Street is a Stampede lane. The Empire State looms at the east end (the far skyline, then the next level).
- **Reuses:** trains under Penn Station, `garrison`, fire, flank toppling.
- **New:** **parade balloons.** Giant helium balloons float at roof height, tethered by handler crews.
  - Grab a tether to drag a balloon. Throw it and it floats off.
  - Pop one with any hit or the Flame Jet. A popped balloon deflates and drapes over whatever is below it, blinding troops.
  - The military shelters helicopters behind them.
  - Each balloon is a floating, non-solid entity with HP. Config block `PARADE`, level field `balloons:[x,altitude][]`.
  - Generic shapes only (dog, turkey, astronaut, kaiju), no licensed characters.

**9. Empire State** (6 / boss / 3-3 / tier 5)
- **The street:** two screens of 34th Street and Fifth Avenue. The last military push. The street splits and Tlézcatl erupts out of it: magma pools, the steam payoff.
- **The tower:** the Empire State is the arena, using its existing authored setback tiers (`LANDMARK_SHAPES['EMPIRE STATE']`) scaled up to supertall. Tlézcatl climbs. The fight goes up the setbacks with the camera following (no ceiling).
- **Breaks:** at each health break a setback gives way under both kaiju, dropping them a tier, as the Golden Gate deck gives way.
- **Finale:** at the mast. At 0 health he retreats by diving off into the magma on the street. `conquerCity` unlocks Tlézcatl and Mexico City.
- **Reuses:** the `finale` machinery (`wake`, `breaks`, `retreats`), rival framework, landmark tiers, Tlézcatl's lava globs and pools (player-side code to borrow).
- **New:** **Tlézcatl's boss kit** (`TLEZCATL_BOSS`, the counterpart of `KAIBAN_BOSS`) and **a climbing rival**: the rival can perch on building parts (a list of perch points up the tower) and move between them.

### Secret: Coney Island (4 / district / 3-3 / tier 5, `secret:true`, `after:'Hudson Yards'`)
- **Route:** reached from Central Park's east exit by the Q train. The boardwalk, the beach and the Atlantic (water bands), the Parachute Jump (`|lattice`), Nathan's, the Wonder Wheel and the Cyclone. Rejoins the route at Hudson Yards.
- **New:** **the Wonder Wheel rolls loose** when its base is broken (a huge rolling body via `src/rolling.ts`). **The Cyclone's cars run away** down the coaster track (a `cableLines`-style shuttle on a raised track that derails). Rename the rides generically if they read as trademarks; the places themselves are fine.

## Engineering notes for the scaffold

- **Generalise the layout helper.** `sfLevel()` hardcodes `'sfo'` in `src/levels.ts`. Make it `cityLevel(city, …)`, keep `sfLevel` as a thin wrapper (or migrate call sites), and keep SF's output byte-identical: SF tests must not move.
- **Fix how tests boot.** `bootCampaign` in `tests/helpers/game-harness.ts` defaults to `city:'nyc'`, and about 23 calls rely on that to play their own kaiju (Belial, Myrmex, Tlézcatl tests) on the old NYC blocks. Once NYC forces Kaiban, those break. The fix is to keep the old five blocks as an off-route fixture city and give tests a way in:
  - Keep them verbatim as a `CITIES` entry `nyc-classic`: `style:'nyc'`, no `kaiju`, not in `CAMPAIGN`, and never shown in Free Play or the campaign map.
  - Add a harness path into it, for example a `kaijuTest.gotoCity(id, block)` hook, or `bootCampaign` loading by city id.
  - Repoint the default. Every existing test then keeps its exact layout with a one-line change.
- **Combat Drills** set `cityIndex=cityIndexOf('nyc')` for the mood. They can stay on the reworked NYC or move to `nyc-classic`. Either way, check drills still look right.
- **Tuning.** `CITIES` nyc `difficulty` is 0, the same as SF. Leave it until playtest, then consider 0.5–1.
- **Update the counts.** The QA playthrough (`tests/qa-playthrough.ts`, `qa/playthrough.json`) and the README count route levels (currently 34). Update them.
- **Test runs.** A full `npm test` rewrites `qa/stress.json` timing. Revert that file before committing unless the change is intended. One river test (`pulls a whole train out of a pit`) is flaky under full-suite load and passes alone.

## Work cards (in order)

1. **Scaffold (done).** City entry, `cityLevel`, nine plus one placeholder levels with growth, exits and `after`, the `nyc-classic` fixture city and harness, test retargeting, QA and README. *Blocks everything else.*
2. **Act 1 (done):** the Battery, Wall Street, SoHo (fort and exchange target art, Charging Bull, steam vents). `nycBattery`/`nycWallStreet`/`nycSoho` in `src/levels.ts`, `NYC1`/`BULL`/`STEAM` in `src/config.ts`, `tests/nyc-act1.test.ts`. Notes for later cards: a level that starts somewhere other than the west edge but keeps one exit uses `spawn` (`start` also makes it a there-and-back with a west exit); the Bull is a `vehicles` entry of kind `bull` that `loose()` never reports as loose; `STEAM` is the base for card 5's geysers (add a `auto:true` mode that bursts without a slam).
3. **Act 2:** Times Square, Grand Central, Central Park (night mood, grid blackout, terminal art, concourse cave-in, two exits).
4. **Tlézcatl boss kit (done):** `TLEZCATL_BOSS` in `src/config.ts` and the `tlez` branch of `src/rival.ts`, tests in `tests/tlezcatl-boss.test.ts`. Notes for card 6: the kit measures everything from his feet (`r.y+r.h`), so a perch only has to move him; `tickRival` still snaps his `y` to the street whenever he walks, so the climbing rival needs to own his `y` while perched. `retreats` is not set by default (the finale code sets it), and a retreating rival ticks nothing.
5. **Act 3 levels 7–8:** Hudson Yards and Herald Square (rail-yard deck, geysers, parade balloons, arena target art).
6. **Empire State boss level:** the climbing rival, the setback breaks, the eruption intro and the retreat. Needs card 4.
7. **Coney Island secret level:** the Wonder Wheel and the Cyclone.
