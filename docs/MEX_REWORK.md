# Mexico City rework plan (campaign redesign, city 3)

**Status: cards 1 (scaffold), 2 (Popocatépetl) and 3 (Act 1) done.** Eight work cards are at the end of this file; cards 4, 5 and 8 can go next, in parallel (card 4 needs card 3, now in). The city entry, the nine placeholder route levels plus Xochimilco, the `mex-classic` fixture city, the opt-in `sinking` field, the retargeted tests, `tests/mex-scaffold.test.ts`, the QA playthrough (47 levels) and the README are in. All the open questions are settled.

Mexico City gets the treatment San Francisco and New York got: nine route levels plus one secret level in three acts, its own playable kaiju and boss, per-level growth, and one new opt-in mechanic per level (a `BlockDef` field or config block). Everything SF and NYC built is reusable: `cityLevel`, exits, `capLift`, water bands, elevated, subways, fire, the `finale` machinery, the rival framework, the climbing finale, rolling bodies, heavy props.

## Fixed decisions

- **Playable kaiju: Tlézcatl.** Beating him at the Empire State unlocks him. Mexico City sets `kaiju:'Tlézcatl'` in `CITIES`, so a campaign plays him there whatever the run picked (`kaijuFor` in `src/campaign.ts`).
- **Boss: Belial.** The redesign rule makes each city's final boss the next city's kaiju, and next is Paris. Mexico City sets `boss:'Belial'`. Beating him unlocks Belial and Paris through `conquerCity`.
  - Belial has **no boss kit** today. Kaiban (`KAIBAN_BOSS`) and Tlézcatl (`TLEZCATL_BOSS`) do. A `BELIAL_BOSS` kit is its own card (card 5), the counterpart of NYC card 4.
  - Paris keeps `boss:'Belial'` only until the Paris rework, which makes Belial Paris's playable kaiju and moves its boss to Myrmex. That's the Paris rework's job, not this one's. Until then a campaign meets Belial in both cities, the same interim state Mexico City is in today with Tlézcatl.
- **Nine route levels plus one secret level**, in three acts, on SF's and NYC's growth curve:
  - **Act 1:** Stage 1, cap 1. The last level's crystal lifts the cap to 2.
  - **Act 2:** Stage 2, cap 2. The branch level's crystal lifts the cap to 3.
  - **Act 3:** Stage 3, cap 3, soft floor Stage 2.
- **Difficulty stays at 1** in `CITIES` until playtest.
- **The old five Mexico City districts become a test fixture**, `mex-classic`, off the route, the same way NYC's became `nyc-classic`. Nine test files boot them today (`campaign`, `city`, `exploration`, `freeplay-ui`, `phase5`, `tlezcatl-boss`, and the NYC act tests that compare against them). See the scaffold card.
- **The sinking-ground twist is in one level only: Templo Mayor.** Sinking everywhere stops being special and is miserable to play. Today `sinkAround` is gated on `style()==='mex'`, so it would hit all ten levels. The scaffold changes the gate to an opt-in `BlockDef` field, `sinking:true`. Templo Mayor sets it, and so do the five `mex-classic` blocks, so the fixture and every test that relies on it stay byte-identical. No other reworked level sets it.
- **Saves don't change.** Checkpoints store a position on `CAMPAIGN`, and the route order doesn't move, so no `SAVE_VERSION` bump. Counts do move: per-city levels become `[9,9,9,5,5,5,5]`, 43 route levels become 47.

## Story thread

Mexico City has two threads that build towards each other, one for each kaiju. **Below: the acid**, which is Belial coming up through the drains. **Above: the volcano**, which is Tlézcatl waking Popocatépetl. NYC's city foreshadowed its boss; this one foreshadows both kaiju, and the final fight is fire coming down against acid coming up.

1. **Arrival.** Tlézcatl dove off the Empire State mast into the magma, heading south. He erupts out of the Templo Mayor excavation in the Centro Histórico. The Aztec temple is the right door for a fire god's namesake. On the skyline, Popocatépetl puffs once in answer.
2. **The acid (Belial).** Something is eating the city from underneath. Green acid seeps up through storm drains in Act 1 (La Merced): puddles that corrode cars and burn troops. It gets worse through Act 2. By Act 3 the drains burst on their own. That's Belial, living in the Drenaje Profundo, the city's giant deep-drainage tunnels.
3. **The volcano (Tlézcatl).** Popocatépetl, the real active volcano about 70 km south-east of the city, stands in the far skyline of every level. It wakes up as Tlézcatl crosses the city, on a **fixed schedule** (scripted, not driven by how much the player burns): a wisp in Act 1, a growing plume and tremors in Act 2, ash fall in Act 3. When the Calzada de Tlalpan stronghold falls, it erupts. Each use of Tlézcatl's Ultimate (Eruption) makes it flare on the skyline, so the player feels responsible, but the timing never depends on it.
4. **The sinking.** The city stands on the bed of the old lake. At Templo Mayor, the heart of the old island city, the ground gives way under every heavy landing and buildings tilt (the twist, in that level only). Elsewhere it shows as history, not a system: the Metropolitan Cathedral already leaning in the Zócalo, Bellas Artes' sunken dome.
5. **The fight.** At Estadio Azteca, under the eruption's red-black sky, Belial bursts up through the pitch from the drainage below.
6. **Retreat.** At 0 health Belial isn't KO'd. Driven off by the fire coming down, he dives into the stadium's storm drain, into the Drenaje Profundo, and away towards the sewers of Paris. (Paris's catacombs twist is a good landing for that.)

## Tlézcatl's kit vs Mexico City

Tlézcatl's ratings are 4/3/3/3. His moves are the **Flame Jet** (a held fire cone that washes along the street when aimed down), the **Magma Dive** (a slam that throws lava globs and leaves lava pools), **Eruption** (Ultimate) and the shared single shot in the air or on a wall. Fire is his whole game, so the city is built to burn:
- **Dense low-rise fuel** (markets, colonial blocks, wooden stalls and tarps) lets one long jet start a fire that runs down the block.
- **Wide boulevards** (Reforma, Insurgentes, Calzada de Tlalpan) carry convoys that a downward jet washes along.
- **Soft lake-bed ground** at Templo Mayor turns Magma Dives into sinkholes and tips buildings over. It's the one level with the sinking twist.
- **Volcanic rock** (the Pedregal in Act 3) is where his lava pools last longest.
- **Eruption answers the volcano.** After Popocatépetl erupts (the end of level 8), his Ultimate also calls volcanic bombs down from the sky. It's his signature move made bigger for the city's climax.

## Popocatépetl (the volcano schedule)

One opt-in level field, `volcano:0|1|2|3|4`, sets the volcano's state for that level. Other cities never set it, so nothing else changes.

| State | Levels | Skyline | In play |
|---|---|---|---|
| 0 | default (no `volcano` field) | today's skyline: Popocatépetl is already drawn, smoking, beside Iztaccíhuatl. `mex-classic` keeps it unchanged | nothing |
| 1 `wisp` | Act 1 (1–3) | a thin smoke wisp | Templo Mayor's arrival triggers one puff |
| 2 `plume` | Act 2 (4–6) | the plume grows level by level | Eruption (Ultimate) makes it flare, with a light tremor. Grey ash starts drifting late in Chapultepec |
| 3 `ash` | 7, 8 until the target falls, Xochimilco | a heavy column | steady ash fall: the `smog` mood with grey flakes and a dimmer sun |
| 4 `erupting` | 8 after the target falls, 9 | an eruption column, the sky red and black | Eruption calls volcanic bombs. Ash fall continues |

- **The trigger is scripted.** Level 8 switches from state 3 to 4 when its stronghold target is destroyed: the column goes up, the sky changes, a big shake, a banner (`POPOCATÉPETL ERUPTS`). Level 9 starts at 4.
- **Volcanic bombs** (config block `VOLCANO`) come only from Tlézcatl's Eruption at state 4: a spread of molten rocks falls from off-screen above over the Ultimate's area. Each one hits like a lava glob and leaves a small lava pool where it lands (the Magma Dive's glob code). They hurt troops, aircraft, vehicles, buildings and the rival, never the player.
- **No random bombs.** Act 3 already has ash, auto-bursting acid drains and the full military. Ambient bombs would decide the boss fight at random, so they stay on the Ultimate only.
- **Realism.** The ash really does reach the city. Bombs landing in the south of the city is game licence.
- **Art cost.** The skyline states are drawing only (the far skyline for `style()==='mex'`). The ash mood reuses `smog`. The only new gameplay system is the bombs.

## Levels

Columns: screens / kind / growth `startStage-cap(capLift)` / military `tier`. "Reuses" lists existing systems; "New" is the one thing the level adds (opt-in, documented, tested).

### Act 1: Centro Histórico (Stage 1, city police, then the Guardia Nacional)

**1. Templo Mayor** (7 / district / 1-1 / tier 1)
- **Route:** start at the bottom of the Templo Mayor excavation: stone stairs, the twin shrines' footings, the serpent heads. Climb out (the first lesson is climbing). Then east along Calle Moneda and Seminario. Colonial blocks lean on their foundations. Police and patrol cars arrive, and the first helicopter.
- **Volcano:** state 1. When he climbs out of the pit, Popocatépetl puffs once on the skyline.
- **Reuses:** climbing, `police`, `air`, a `spawn` start, and the sinking twist (`sinking:true`; the only reworked level that has it).
- **New:** **start in a pit.** The kaiju spawns below street level in an excavation (the Union Square garage / concourse pit drawn as stone ruins). Plus **leaning colonial buildings**: an opt-in per-building `lean` that draws the building tilted. Sinking adds lean, and a building past a lean threshold topples the way it leans. Outside Templo Mayor, `lean` is only a starting tilt that sets which way a building falls (the Zócalo cathedral).

**2. Zócalo** (7 / stronghold / 1-1 / tier 2)
- **Route:** the giant open plaza. There's no cover, so troops have clear lines of fire. The Metropolitan Cathedral (`|twin`) is visibly tilted (it really is). The Bandera Monumental, the huge flag on its mast, stands in the middle. The target is the Palacio Nacional: a long, low facade, with the police command post in its courtyard.
- **Reuses:** stronghold, `garrison`, flank toppling (the cathedral leans onto the palace), `lean` from level 1.
- **New:** **the flagpole as a weapon.** The mast is a heavy grabbable prop (like the Charging Bull's kind of vehicle entry) that swings as a long-reach club and can be thrown like a spear. Plus palace target art (`art:'palace'`).

**3. La Merced and Tepito** (7 / district / 1-1(2) / tier 2)
- **Route:** the market district. Rows of stalls under linked tarps, crates, crowds. The Metro runs underneath (Line 1 / Line 4 at Candelaria). The crystal is under the market hall, and it lifts the cap to 2. The Guardia Nacional rolls in at the exit (`guard`).
- **Reuses:** fire, street junk (the `taco` stall), the population system, the subway, `crystal`, `guard`.
- **New:** **acid seeps**, the foreshadowing hazard.
  - Storm drains leak green acid puddles. A slam or pound near one bursts it into a spray.
  - Acid corrodes cars into wrecks, burns troops and eats the base of a building it pools against. It never burns: acid isn't fire, so it's distinct from Tlézcatl's lava.
  - Config block `ACID`; level field `seeps:number[]`. Built the way `STEAM`/`vents` were.
- **Also new (small):** **tarp runs.** Linked stall canopies carry fire along the row faster than building-to-building spread.

### Act 2: Reforma and Chapultepec (Stage 2, the Guardia Nacional, then the army's armour)

**4. Alameda and Bellas Artes** (7 / district / 2-2 / tier 2)
- **Route:** the Alameda Central's trees and fountains, the Palacio de Bellas Artes (a `|dome` that has sunk metres into the lake bed), and the Torre Latinoamericana (climbable). Daytime under the city's smog, like the rest of Mexico City (there's no night level). Papel picado is strung across the streets, as it is for any fiesta.
- **Acid:** a few seeps along the street, bright green against the pale stone. One sits by Bellas Artes: burst it and the dome drops another step into the ground and tilts, a one-off scripted drop on one landmark, not the sinking twist. The Alameda's fountains run green (art only).
- **Volcano:** state 2. From the top of the Torre Latino the plume is clearly bigger than in Act 1.
- **Reuses:** park trees from Central Park, climbing, `ACID`/`seeps`.
- **New:** **papel picado lines.** Strings of paper banners across the street, burnable at a touch, that carry fire across the gap from building to building. It's the one level where fire jumps the street.

**5. Paseo de la Reforma** (8 / stronghold / 2-2 / tier 3)
- **Route:** the long straight boulevard of glass towers (Torre Mayor, Torre Reforma) with the glorietas. El Ángel de la Independencia stands on its column in the middle. The **Día de Muertos parade** is on, in daylight, as the real one is (it runs down Reforma in the afternoon): giant catrinas and skeleton puppets, alebrije and marigold floats, crowds in catrina makeup fleeing. The army holds the avenue with tanks, using the floats as cover the way Herald Square's troops do, and the target is **Campo Marte** at the west end, where Reforma meets Chapultepec: the army's own parade ground, turned into its field HQ. The level runs west along Reforma, against the parade heading east to the Zócalo, and ends at the park's edge, which is where Chapultepec starts.
- **Acid:** more seeps, placed in the glorietas where the armour stands. Bursting one under a tank eats it.
- **Reuses:** stronghold, tanks, flank toppling, the elevated system where it fits, the existing `|needle` / `|arch` landmark shapes, `ACID`/`seeps`, Herald Square's parade floats as cover (reskinned: catrinas, skeletons, alebrijes, marigolds; floats burn). The parade is content and art, not a new system, so it doesn't repeat NYC's balloons as a mechanic.
- **New:** **El Ángel falls.** Break the column's base and it topples along the avenue, a long falling body that crushes everything in its lane, convoys included. Plus **Campo Marte target art** (`art:'campo'`): a long low grandstand facing the field, with the command post dug in under it, a helipad with helicopters on the ground (they lift off as the fight starts), and tents and parked armour on the field round it. It's a military camp rather than a building, so most of the target's strength is the `garrison` on the field, and the grandstand is what you bring down.

**6. Chapultepec** (8 / district, two exits / 2-2(3) / tier 3)
- **Route:** there-and-back like Central Park. Start mid-map on Reforma at the park gates. Landmarks along the way: the Chapultepec lake (water band), the zoo (animals flee, reusing the sea-lion list), the Museo Nacional de Antropología, and Chapultepec Castle on its hill (terrain; the crystal is in the castle, cap lift to 3). The Guardia is dug in on the hill.
- **Water:** the lake is over a Stage 2 kaiju's head and wading depth at Stage 3, so the crystal opens it. It's the Wharf/Reservoir rule.
- **Exits:** the engine's exits are west and east. West exit → Ciudad Universitaria (the main route, by the Periférico south). East exit, past the lake (the park's south gate in the story) → the Tren Ligero to Xochimilco (secret).
- **Acid and volcano:** the lake goes green by the storm drains (art). Grey ash starts drifting late in the level, the first sign the volcano is close to going.
- **Reuses:** `exits`, `capLift`, water bands, terrain, the zoo, park ground from Central Park.
- **New:** **the Sun Stone.** The museum's huge carved stone disc is a heavy prop (grab, throw), and on landing it rolls (`src/rolling.ts`). It's a thrown boulder that keeps going. Tlézcatl grabs it at Stage 3 only.

### Act 3: The south (Stage 3, the full military)

**7. Ciudad Universitaria** (8 / district / 3-3 / tier 4)
- **Route:** Insurgentes Sur with the Metrobús lane, the Periférico's double-deck freeway (the elevated system's `freeway` look), then UNAM: the Central Library's mosaic tower and the Estadio Olímpico. It's all built on the Pedregal, the lava field the volcano Xitle left.
- **Acid:** the seeps at full strength. Drains burst on their own, with no slam needed (`seepsAuto`, the counterpart of `ventsAuto`). Belial is close.
- **Volcano:** state 3, steady ash fall. Standing on old lava from Xitle under Popocatépetl's ash column, it's where the city's volcanic past and present meet.
- **Reuses:** elevated, buses, `ACID`, terrain.
- **New:** **volcanic ground.** An opt-in ground type where Tlézcatl's lava pools last `x` longer and spread a little, drawn as dark broken rock so it reads as different ground. On it, a Magma Dive leaves a lasting lava trap for troops.

**8. Calzada de Tlalpan** (8 / stronghold / 3-3 / tier 4)
- **Route:** south down the Calzada towards the stadium. The Tren Ligero runs on its own track beside the road. Then the stadium approach and its car parks, where the army has built its last line around the field HQ (the target). Estadio Azteca looms at the east end in the far skyline.
- **Military:** the full military. The Calzada is a long straight lane for a downward Flame Jet wash.
- **Volcano: he sets it off.** The level starts at state 3. When the field HQ goes down, Popocatépetl erupts (state 4): the column goes up, the sky turns red and black, the ground shakes. The walk to the exit is the first chance to use the volcanic-bomb Eruption.
- **Reuses:** trains (the Tren Ligero on a surface track), `garrison`, fire, flank toppling.
- **New:** **sinkholes.** The acid has hollowed the ground: marked stretches of street collapse under a heavy landing into a pit, with whatever was on them (convoys, emplacements, the target's walls). These are a few fixed, marked stretches, not the sinking twist (which is Templo Mayor's only). Level field `sinkholes:[x0,x1][]`.

**9. Estadio Azteca** (6 / boss / 3-3 / tier 5)
- **The approach:** two screens of the stadium concourse and the last military push.
- **Volcano:** state 4 throughout. Red-black sky, ash, and Eruption calls bombs. Fire comes down while acid comes up.
- **The arena:** the pitch inside the bowl. The stands rise on both sides as terrain tiers. The pitch splits and Belial comes up out of the drainage.
- **Breaks:** at each health break, acid floods the pitch higher (a rising acid pool), and the fight is pushed up into the stands. It's the inverse of the Empire State: there the fight went up a tower, here the floor comes up after you. Belial is fast and fragile (ratings 4/5/1/4), so the arena is wide and open for him to circle. With three breaks:
  1. The pitch.
  2. The pitch floods: the lower tiers.
  3. The lower tiers flood: the upper tiers.
  4. The last stretch on the rim.
- **The flood is a water band.** An acid band whose surface rises to the next tier at each break (eased over a couple of seconds, with a warning bubble-up first). It reuses the water code (depth, wading, drowning, troops and wrecks sinking) and adds `ACID` damage per second to anything standing in it. Belial is immune and moves through it freely.
- **Lava on acid makes rock.** Tlézcatl's lava landing in the flood (Magma Dive globs, the lava pool under a dive, `VOLCANO` bombs from his Eruption) cools into a **crust**: a temporary solid platform on the acid's surface, the width of the pool or glob that made it. It lasts `ACID.crustLife` seconds, cracks visibly near the end, then sinks. It rides the surface when the flood rises.
  - This is the city's two threads meeting as a mechanic: the volcano's fire builds footing over Belial's acid.
  - It gives the player something to do about the flood. Without it the rising acid only squeezes you into a shrinking space.
  - Belial can use it too (he pounces onto and off crusts), and his acid attacks dissolve a crust early.
  - Crust only forms on `finale.flood` acid, not on seeps or water anywhere else.
- **Fallback: the rim walkway.** In a side view the stands are two separate ledges at the ends of the bowl. If the crusts don't play well, the top tier is joined across the top by a walkway around the rim (the stadium's roof ring), so the two sides are never cut off. Build it either way, but only open it at the last break if the crusts work.
- **Finale:** at 0 health Belial, driven off by the fire, dives into the acid at centre field and down the storm drain, and is gone. `conquerCity` unlocks Belial and Paris.
- **Reuses:** the `finale` machinery (`wake`, `breaks`, `retreats`), the rival framework, terrain, `ACID` pools, `VOLCANO` bombs.
- **New:** **Belial's boss kit** (card 5), **a rising-hazard finale** (an opt-in `finale.flood` that raises an acid band at each break) and **lava crust** on that acid. Test that crust forms from each lava source, carries a kaiju, rides the rising surface, expires, and never forms outside `finale.flood`.

### Secret: Xochimilco (5 / district / 3-3 / tier 5, `secret:true`, `after:'Ciudad Universitaria'`)

**The idea: fire on water.** Every other level in the city is built to burn. This one is mostly canals, and fire doesn't spread across water, so Tlézcatl's main tool stops working the usual way until you find the trajineras. The boats are how fire gets around. Like Coney Island, it's a short playground level built round a set piece, not a military push.

- **Getting there:** grow to Stage 3 at Chapultepec Castle, wade the lake (wading depth only at Stage 3) to the east exit (the park's south gate), and take the Tren Ligero south. The real line starts at Tasqueña, not Chapultepec; that's game licence. The Tren Ligero brings you back north to rejoin at Ciudad Universitaria, so the main route skips nothing.
- **Route:**
  - **The embarcadero** (the dock), crowded with trajineras (the colourful flat boats with painted arches), food boats and mariachi boats. Crowds flee down the dock.
  - **The canals,** as water bands at Stage 3 wading depth. One long canal runs the length of the level so the fire-boat set piece has room to travel.
  - **The chinampas,** the narrow farmed "floating garden" islands between the canals, lined with tall thin ahuejote trees.
  - **The island of the dolls** (named generically): old dolls hanging from the trees. Pure atmosphere: quiet, the dolls swaying, no score and no target.
  - **Axolotls** scatter as you wade, reusing the fleeing-animal logic (the Pier 39 sea lions, the zoos). They're native to these canals.
- **Volcano:** state 3 (ash fall, no bombs). It's taken from Act 2 and rejoins at level 7, so it happens before the eruption. Grey ash floats on the canal water.
- **Acid:** none. The level is about fire and water, and it comes before Act 3, where the acid takes over.
- **Military:** tier 5 but light and spread out, as at Coney: the Guardia on boats (reusing police and coastguard boats), a few helicopters, an emplacement on the dock. It should feel like a break before the run to the stadium.
- **Reuses:** water bands, wading, police and coastguard boats, the flee logic, fire, the Tren Ligero trains.
- **New:**
  - **Canal current.** An opt-in current on a water band (`current:[band, speed]`, signed for direction). Anything floating on that band drifts with it: trajineras, and wrecks and debris thrown in, which float off instead of sinking at once. Police and coastguard boats still move under their own power.
  - **Trajineras and fire boats.** Trajineras are floating vehicles (a new vehicle kind) that you can grab, throw and smash, and they carry crowds. Set one alight and it keeps burning as it drifts, setting alight the chinampas it brushes and any boat it bumps. Line boats up, or push a burning one into the current upstream of a jam, and the fire travels down the canal by itself. It's the tarp-run and papel-picado idea taken one step further: fire needs a carrier to cross, and here the carrier moves. **Check the fire code first:** wrecks can catch fire, but a vehicle that stays alight while it moves and spreads fire on contact may be new, and that decides the card's size.
  - **Chinampa ground.** Soft wet farmland: the kaiju sinks in ankle-deep and moves at wading speed. The city's lake-bed theme at its softest, where the old lake still exists.
- **Tests:** current moves floating things on its band only; a burning trajinera keeps burning, drifts and spreads fire to chinampas and boats; chinampa ground slows the kaiju; none of it appears in any other level.

## Open questions

1. **Boss arena.** Settled: Estadio Azteca, with the rising acid flood, lava crust and the rim walkway fallback. (Was: Estadio Azteca with a rising acid flood as the proposal.) Alternatives: the Pyramid of the Sun at Teotihuacan (another vertical fight, too close to the Empire State), or the Drenaje Profundo itself (an underground fight in the tunnels, Belial's home turf, but dark and cramped for a fast kaiju).
2. **Night level.** Settled: none. Mexico City stays smog and sun; the eruption's red-black sky in Act 3 is its one dramatic change of light. Día de Muertos is the daytime parade on Reforma.
3. **Act 2 target.** Settled: Campo Marte, the army's parade ground at Reforma's west end beside Chapultepec.
4. **Free Play and Tlézcatl as a boss.** Settled, no change: Free Play already lets you pick any unlocked rival for any conquered city's arena (`bossName()` returns the pick), so Tlézcatl stays fightable anywhere. The one knock-on is in card 7: a non-Belial rival at Azteca is immune to the flood and keeps to the tiers.
5. **Belial's boss kit depth.** Settled: the full kit (card 5).
6. **Sinking strength.** Settled: the twist is in Templo Mayor only, through the opt-in `sinking:true` (also set on the `mex-classic` blocks).

## Shared notes (every card)

Each card stands alone: start a session with the card's text. Read this whole file first, and `docs/NYC_REWORK.md` for the systems it reuses.

- **Order.**
  - Card 1 (scaffold) blocks everything.
  - After it: cards 2 (Popocatépetl), 3 (Act 1), 5 (Belial boss kit) and 8 (Xochimilco) can run in parallel.
  - Card 4 (Act 2) needs card 3 (`ACID`, `lean`, heavy props).
  - Card 6 (Act 3 levels 7–8) needs cards 2 and 3.
  - Card 7 (Estadio Azteca) needs cards 2, 3 and 5.
  - They all touch `src/game.ts` and `src/levels.ts`, so expect small merges when cards run in parallel.
- **Tests.** `npm test` builds and runs everything.
  - A full run rewrites `qa/stress.json` timings. Revert that file unless the change is intended.
  - The river test `pulls a whole train out of a pit` is flaky under full-suite load. Re-run it alone if it fails.
  - Run `npm run qa` when a card changes the route or level contents the QA playthrough checks, and commit the new `qa/playthrough.json`.
- **Opt-in rule.** Every new behaviour is an opt-in `BlockDef` field or config block, documented where the `BlockDef` type lives in `src/levels.ts` (or beside the config block in `src/config.ts`), with a test that no other level picks it up. SF, NYC, `nyc-classic` and `mex-classic` must stay byte-identical, and Paris, Sydney, HK and Tokyo must not change. `tests/sydney.test.ts` pins every city's data hash; a card that changes Mexico City's levels re-pins `mex` only.
- **Seeing it in the browser.**
  1. `npm run build`, then serve `dist/`.
  2. In a Playwright init script, set `window.__kaijuTest=true`. This exposes `kaijuTest` and `kaijuDebug`.
  3. Seed `kaiju-arcade:permanent:v3` (`emptyPermanent()` with every `KAIJU` unlocked) and `kaiju-arcade:campaign:v3` = `{version:3,id:'s',initials:'TST',kaiju:'Tlézcatl',city:CAMPAIGN.indexOf('mex'),banked:0}`. All of these are importable from `/campaign.js`.
  4. Reload, click `#continue` then `#begin-city`, then `kaijuTest.goto(blockIndex, x)` / `kaijuTest.teleport(x)`.
  5. Mexico City block indices after card 1: 0 Templo Mayor, 1 Zócalo, 2 La Merced and Tepito, 3 Alameda and Bellas Artes, 4 Paseo de la Reforma, 5 Chapultepec, 6 Ciudad Universitaria, 7 Calzada de Tlalpan, 8 Estadio Azteca, 9 Xochimilco.
  6. The old districts: `kaijuTest.gotoCity('mex-classic', block)`.
- **Screenshots.** Save before/after shots to `docs/screenshots/` (`mex-<card>-*.png`).
- **Docs.** Each card marks itself done in this file's Status line and adds a "notes for later cards" line under "Done: notes for later cards" (create the section with card 1), and adds its README entry the way the NYC cards did.

---

## Card 1: Scaffold — the city entry, the route and the `mex-classic` fixture

**Goal.** Mexico City is laid out the redesign way: nine route levels and one secret level, as placeholders with the right names, sizes, kinds, growth, tiers, exits and rejoin. Tlézcatl is forced, Belial is the boss, and the old five districts survive as an off-route fixture city so every existing test keeps its layout. *Blocks every other card.*

**Do.**
- **City entry** (`CITIES` in `src/levels.ts`, `id:'mex'`):
  - Add `kaiju:'Tlézcatl'` and change `boss` to `'Belial'`. Leave `difficulty:1`, the mood, palette and style.
- **The `mex-classic` fixture.** Follow `nyc-classic` exactly (the `NYC_CLASSIC` array and its `CITIES` entry in `src/levels.ts`):
  - Move today's five `district('mex', …)` blocks verbatim into a `MEX_CLASSIC` array.
  - **Append** a `CITIES` entry `id:'mex-classic'`, `name:'Mexico City (classic)'`, `code:'MEX'`, `boss:'Tlézcatl'`, the same `difficulty`, colours, mood and `style:'mex'`, no `kaiju`. Append `MEX_CLASSIC` to `LEVELS` at the same index, after `syd`, so no city index moves.
  - Not in `CAMPAIGN`, never in Free Play or the campaign map. `bootCampaign` in `tests/helpers/game-harness.ts` already treats any id outside `CAMPAIGN` as a fixture and enters it through `kaijuTest.gotoCity`, so `bootCampaign(seed,{city:'mex-classic'})` works without harness changes. Check it.
- **The sinking gate.** `sinkAround` in `src/game.ts` returns early unless `style()==='mex'`. Change it to return unless the current block has a new opt-in field `sinking:true` (document it at the `BlockDef` type). Set `sinking:true` on all five `MEX_CLASSIC` blocks and on Templo Mayor. No other reworked level sets it.
- **The nine plus one placeholder levels**, the NYC scaffold way (`cityLevel('mex', name, screens, kind, pattern, landmarks, growth)` with a simple pattern; the act cards replace them):

  | # | Name | Screens | Kind | Growth (start-cap(lift)) | Tier | Notes |
  |---|---|---|---|---|---|---|
  | 1 | Templo Mayor | 7 | district | 1-1 | 1 | `sinking:true` |
  | 2 | Zócalo | 7 | stronghold | 1-1 | 2 | |
  | 3 | La Merced and Tepito | 7 | district | 1-1(2) | 2 | crystal |
  | 4 | Alameda and Bellas Artes | 7 | district | 2-2 | 2 | |
  | 5 | Paseo de la Reforma | 8 | stronghold | 2-2 | 3 | |
  | 6 | Chapultepec | 8 | district | 2-2(3) | 3 | there-and-back, two exits |
  | 7 | Ciudad Universitaria | 8 | district | 3-3 | 4 | |
  | 8 | Calzada de Tlalpan | 8 | stronghold | 3-3 | 4 | |
  | 9 | Estadio Azteca | 6 | boss | 3-3 | 5 | rival Belial (shared moveset until card 5) |
  | ★ | Xochimilco | 5 | district | 3-3 | 5 | `secret:true`, `after:'Ciudad Universitaria'` |

  - Act 3's soft floor is Stage 2, as in SF and NYC (copy how NYC's Act 3 placeholders set it).
  - **Chapultepec's exits.** The engine's exits are `west`/`east`. `exits:{west:'Ciudad Universitaria', east:'Xochimilco'}`, a mid-map start (`start`), like Central Park. In the story the east exit is the park's south gate past the lake.
- **Tests that move.**
  - `tests/tlezcatl-boss.test.ts` boots `{city:'mex'}` and fights in `Tlézcatl Arena`. Point it at `mex-classic` (`cityIndexOf('mex-classic')`, `{city:'mex-classic'}`).
  - `tests/phase5.test.ts`'s "Mexico City ground is soft" test: point it at `mex-classic`. Add a test that a slam in a non-sinking reworked level (Zócalo) sinks nothing, and one in Templo Mayor does.
  - The `ORIGINAL` placeholder lists in `tests/campaign.test.ts`, `tests/city.test.ts`, `tests/exploration.test.ts` and `tests/phase5.test.ts`: replace `'mex'` with `'mex-classic'`.
  - `tests/campaign.test.ts`: the bosses list (Mexico City → `'Belial'`), per-city counts `[9,9,9,5,5,5,5]`, `banked`, and anything else that counts route levels.
  - `tests/nyc-scaffold.test.ts:53` asserts "Mexico City keeps its own boss" (Tlézcatl). It becomes Belial.
  - `tests/sydney.test.ts` pins: re-pin `mex`, and add a `mex-classic` check that putting back `id:'mex'`, `name:'Mexico City'`, and stripping `sinking`, reproduces the old `mex` pin `faec75a8f7fe52bc` (the card-3 pattern for HK and Tokyo), so the fixture is provably the old city.
  - `tests/freeplay-ui.test.ts` picks Mexico City with Kaiban. Check it still passes against the new levels.
  - Search `tests/` for any other `'mex'`, `cityIndexOf('mex')`, `Tlézcatl Arena`, `Crystal Bastion`, `Centro Histórico`, `Reforma Avenue` or `Chapultepec Assault` and retarget.
- **New test file** `tests/mex-scaffold.test.ts`, modelled on `tests/nyc-scaffold.test.ts`:
  - The route is the nine levels in order and Xochimilco is the one secret, `after:'Ciudad Universitaria'`.
  - Each level's screens, kind, growth and tier match the table.
  - A campaign in Mexico City plays Tlézcatl whatever the run picked (`kaijuFor`).
  - Conquering Mexico City unlocks Belial and Paris.
  - Chapultepec's exits lead where the table says; Xochimilco rejoins at Ciudad Universitaria.
  - `mex-classic` is not in `CAMPAIGN`, Free Play or records, and keeps Tlézcatl as boss.
- **Counts and docs.**
  - `tests/qa-playthrough.ts` and `qa/playthrough.json` (`npm run qa`): route levels 43 → 47.
  - `README.md`: 43 → 47 route levels; the Campaign rules order line ("Mexico City/Tlézcatl" now means the city's kaiju, its boss is Belial); a "Mexico City rework, scaffold" entry like NYC's.
  - `QA_REPORT.md`: any counts.

**Done when** the tests and `npm run qa` are green, and a browser check shows a fresh campaign reaching Mexico City as Tlézcatl, all ten placeholders loading (block indices above), Belial as the rival at Estadio Azteca, and `gotoCity('mex-classic', 4)` loading Tlézcatl Arena with Tlézcatl.

---

## Card 2: Popocatépetl — the volcano schedule

**Done.** Notes for later cards are under "Done: notes for later cards".

**Needs card 1.** Can run in parallel with cards 3, 5 and 8.

**Goal.** The volcano in Mexico City's far skyline wakes on a fixed schedule set per level, erupts when the Calzada de Tlalpan stronghold falls, and from then on Tlézcatl's Eruption calls volcanic bombs.

**Read first.** Popocatépetl is **already drawn**: the `style==='mex'` branch of the far skyline in `src/game.ts` (comment "Popocatépetl, smoking, with Iztaccíhuatl beside it, and the Torre Latinoamericana") draws the cone, the snowcap, a six-puff smoke loop, Iztaccíhuatl and the Torre Latino. That drawing is state 0 and must stay pixel-identical: `mex-classic` uses it.

**Do.**
- **The level field.** `volcano?:1|2|3|4` on `BlockDef` (document it). Absent means today's skyline.
- **The states** (drawn by the existing branch, extended):
  - **1 `wisp`:** a thinner, slower plume than today's. A one-off puff hook (`volcanoPuff()`) that Templo Mayor's arrival calls (card 3 wires the trigger; this card provides and tests the hook).
  - **2 `plume`:** a bigger, darker plume. Each time Tlézcatl's Eruption fires, the volcano flares (a brighter burst at the crater) and the screen gets a light tremor (`shake`). Optional per-level `ashLate:x` starts drifting ash after the kaiju passes x (Chapultepec uses it).
  - **3 `ash`:** a heavy column, and steady ash fall: grey flakes drifting down over the whole view and a dimmer sun. Built on the city's `smog` mood (look at how `moodNow()` swaps a mood for NYC's `night`).
  - **4 `erupting`:** an eruption column with a glowing base, the sky shifted to red and black, ash continuing.
- **The trigger.** `volcanoOn?:'target'` on a level that starts at 3: when its stronghold target is destroyed, switch to 4 with a big shake and a `POPOCATÉPETL ERUPTS` banner (the `action`/`actionTime` text). Card 6 sets it on Calzada de Tlalpan.
- **Volcanic bombs** (`VOLCANO` in `src/config.ts`, every number commented): at state 4 only, Tlézcatl's Eruption also drops `bombs` molten rocks from above the view over the Ultimate's area (`bombRange`, `bombDelay`). Each hits like one of his lava globs and leaves a small lava pool (reuse the Magma Dive glob/pool code). They hit troops, aircraft, vehicles, buildings and the rival, never the player. No ambient bombs.
- **Debug hook.** `kaijuTest.setVolcano(state)` so later cards and tests can jump states.

**Tests** (`tests/mex-volcano.test.ts`):
- No other city (and `mex-classic`) draws differently or sets any volcano state: their pins in `tests/sydney.test.ts` don't move, and a level without `volcano` reads as state 0.
- The flare and tremor fire on Eruption at state 2 and not at state 0 or 1.
- Ash falls at state 3 and 4 only.
- A `volcanoOn:'target'` level switches to 4 when its target dies, once.
- Bombs fall only from Eruption at state 4, damage troops and the rival, never the player, and leave pools that expire.
- Other kaiju's Ultimates never drop bombs.

**Done when** the tests are green and screenshots show states 1–4 on the skyline (`mex-2-state1.png` … `state4.png`), the ash fall, and an Eruption with bombs at state 4.

---

## Card 3: Act 1 — Templo Mayor, Zócalo, La Merced and Tepito

**Done.** Notes for later cards are under "Done: notes for later cards".

**Needs card 1.** Stage 1, cap 1 (La Merced's crystal lifts it to 2). City police and SWAT, then the Guardia Nacional (`guard`). All three set `volcano:1`.

**Goal.** Replace the three Act 1 placeholders with the levels in "Levels → Act 1" above, and build the systems later acts reuse: `lean`, the pit start, heavy reach props and `ACID`.

**Do.**
- **1. Templo Mayor** (`mexTemplo` in `src/levels.ts`):
  - **Pit start.** The kaiju spawns at the bottom of the excavation, below street level. Reuse the pit from Grand Central's `concourse` / the Union Square garage, drawn as stone ruins (stairs, serpent heads, shrine footings). Use `spawn` (see NYC card 2's note: `spawn` keeps one exit; `start` makes a there-and-back). There must always be a way out: give the pit one rubble ramp as well as the climbable walls, so a player who can't climb isn't stuck.
  - **`lean`.** An opt-in per-building `lean` (degrees, signed) that draws the building tilted and sets the side it topples to. With `sinking:true`, `sinkAround` adds lean as well as sinking; past `LEAN.topple` degrees the building topples the way it leans. **Check the collapse code first** for how topple direction is picked today, and route `lean` through it rather than adding a second topple path. Start a few colonial blocks already leaning.
  - On climbing out, call card 2's `volcanoPuff()` (if card 2 hasn't landed, leave a guarded call or a TODO the card-2 session wires).
  - Police, patrol cars, one helicopter. Light.
- **2. Zócalo** (`mexZocalo`):
  - The open plaza: few or no buildings across the middle. Break it up just enough for a Stage 1 kaiju to survive tier 2 troops: the flag's plinth, a stage or barricade line, parked buses. Playtest the no-cover feel.
  - The Metropolitan Cathedral (`|twin`) with a starting `lean` towards the palace, placed so flank toppling drops it onto the target.
  - **The flagpole.** A heavy grabbable prop: a `vehicles` entry of a new kind `pole`, never reported by `loose()` (the Charging Bull's pattern, NYC card 2). Held, it is a melee weapon with `FLAG.reach` extra reach and `FLAG.damage`; thrown, it flies flat and fast like a spear and stops on the first thing it hits. Stage 1 can lift it (it's the level's answer to the open plaza).
  - **Palace target art** (`art:'palace'`): a wide, low arcaded facade, the command post in its courtyard. Add hitbox parts if the shape needs them.
- **3. La Merced and Tepito** (`mexMerced`):
  - Market rows under linked tarps, crates, crowds; the Metro underneath (a subway line that can cave in); the crystal under the market hall (`capLift:2`); `guard` at the exit.
  - **Tarp runs.** Stalls joined by a canopy carry fire to the next stall in the row `TARP.spread` x faster than normal `FIRE` spread. Opt-in per building (`tarp:true`, or a `tarps:[x0,x1][]` level field; pick whichever fits `FIRE`'s spread code). Make sure the crystal hall and the exit side survive long enough to matter: tune or fireproof them.
  - **Acid seeps.** Config block `ACID` in `src/config.ts`, level field `seeps:number[]`. Build it the way `STEAM`/`vents` were built for SoHo (NYC card 2):
    - A seep is a storm drain with a small green puddle. A slam or pound within `ACID.trigger` bursts it into a spray.
    - Acid corrodes cars into wrecks, damages troops over time, and wears down the base of a building it pools against (damage only, no sinking: the sinking twist is Templo Mayor's only). It never sets anything alight.
    - Reuse Belial's player-side acid puddles where it fits (`acid` pools, `corr`), keeping the player's own corrosion behaviour unchanged.
    - Leave room for card 6's `seepsAuto` (bursting on a timer, no slam) and card 7's flood (`ACID` damage per second in an acid band).
- **Config.** `MEX1` for Act 1 tuning, plus `LEAN`, `FLAG`, `TARP`, `ACID` blocks, each number commented.

**Tests** (`tests/mex-act1.test.ts`):
- Each level's landmarks, target art and opt-in fields are where the plan puts them; the pit start spawns below street level and both ways out (climb, ramp) work.
- `lean` draws and topples the leaning way; sinking adds lean only with `sinking:true`.
- The flagpole can be grabbed at Stage 1, hits with extra reach, throws, and never counts as loose.
- Tarp runs spread fire faster along a linked row and not between unlinked buildings.
- Seeps burst on a slam, corrode cars, hurt troops, damage a building's base and never start a fire.
- None of `lean`, `pole`, `tarp`, `seeps` or `ACID` changes any other level.

**Done when** the tests are green and screenshots show the pit start, a leaning building toppling, the flagpole swung and thrown, the cathedral dropping onto the palace, a tarp row burning and a seep bursting (`mex-3-*.png`).

---

## Card 4: Act 2 — Alameda and Bellas Artes, Paseo de la Reforma, Chapultepec

**Needs card 3** (`ACID`/`seeps`, `lean`, the heavy-prop pattern). Can run in parallel with cards 5 and 6. Stage 2, cap 2 (Chapultepec's crystal lifts it to 3). The Guardia Nacional, then tanks. All three set `volcano:2`; Chapultepec also sets card 2's late ash (`ashLate`).

**Goal.** Replace the three Act 2 placeholders with the levels in "Levels → Act 2" above.

**Do.**
- **4. Alameda and Bellas Artes** (`mexAlameda`):
  - Daytime under the smog. The Alameda's trees (Central Park's park ground), Bellas Artes (`|dome`, drawn sunk into the ground), the Torre Latinoamericana as a tall climbable landmark.
  - **Papel picado lines.** A level field `banners:[x0,x1,height][]`: paper banner strings between two buildings across the street. Any fire touching a string burns it in `PICADO.burn` seconds and lights the building at its far end. Each string burns once and is gone. It's the only level where fire crosses the street.
  - **Seeps** along the street, and one scripted moment: the seep by Bellas Artes, when burst, drops the dome another step into the ground and tilts it (a one-off on that building, not the sinking twist). Fountains drawn green.
- **5. Paseo de la Reforma** (`mexReforma`):
  - Glass towers (Torre Mayor, Torre Reforma), glorietas as barricade checkpoints, tanks. The level runs west to Campo Marte.
  - **The Día de Muertos parade.** Reuse Herald Square's floats (the `deco:'float'` swap for `BARRIER` buildings in `nycHerald`): reskin them as catrinas, skeletons, alebrijes and marigold floats, give them their own colour set (don't touch Herald Square's), and make sure they can burn. Crowds in catrina makeup through the population system. No balloons.
  - **El Ángel falls.** El Ángel (`|needle`) on its column mid-avenue. Break the base and it falls along the avenue, towards the side it was hit from, crushing everything in a lane `ANGEL.length` long. **Check the collapse/topple code first:** route it through existing topple if a long hitbox works, otherwise add a small falling-body path. Place it far enough from the target that it can't reach it.
  - **Campo Marte target** (`art:'campo'`): a long low grandstand facing the field with the command post dug in under it, a helipad with helicopters on the ground that lift off when the fight starts, tents and parked armour round it. Most of its strength is the `garrison` on the field; the grandstand is what you bring down.
  - **Seeps** in the glorietas under the armour.
- **6. Chapultepec** (`mexChapultepec`):
  - There-and-back from a mid-map start at the park gates (card 1's `start` and `exits`). The zoo (the sea-lion flee list, as Central Park's zoo), the Museo Nacional de Antropología, the castle on its hill (terrain, the crystal inside, `capLift:3`), the Guardia dug in on the slopes.
  - **The lake** as a water band on the east side, over a Stage 2 kaiju's head and wading depth at Stage 3 (the Wharf/Reservoir rule), between the park and the east exit to Xochimilco. Drawn green near the storm drains.
  - **The Sun Stone.** A heavy prop (the pole/Bull pattern, a new vehicle kind `stone`) liftable only at Stage 3. Thrown, it lands and rolls (`src/rolling.ts`, like Times Square's ball). Place the museum where everyone passes it after the castle, on the way to either exit, so a player heading for the secret still gets to throw it.
- **Config.** `MEX2` plus `PICADO`, `ANGEL`, `STONE` blocks, each number commented.

**Tests** (`tests/mex-act2.test.ts`):
- Landmarks, targets and fields are where the plan puts them.
- A banner carries fire across the street once, then is gone.
- The Bellas Artes seep drops and tilts the dome once.
- The floats are reskinned, burn, and count as cover; Herald Square is unchanged.
- El Ángel falls the way it was hit and damages everything in its lane; it can't reach the target.
- Campo Marte's helicopters lift off when the fight starts.
- The lake blocks a Stage 2 kaiju and lets a Stage 3 one wade; the east exit leads to Xochimilco and the west to Ciudad Universitaria.
- The Sun Stone can't be lifted below Stage 3, throws, and rolls on landing.
- None of it changes any other level.

**Done when** the tests are green and screenshots show a banner fire crossing the street, the Bellas Artes drop, the parade, El Ángel falling on a convoy, Campo Marte, the lake crossing at Stage 3 and the Sun Stone rolling (`mex-4-*.png`).

---

## Card 5: Belial's boss kit

**Needs card 1** (so Estadio Azteca exists to test in). Can run in parallel with cards 2 to 4 and 8.

**Goal.** Belial fights as a boss with his own kit, the way Kaiban (`KAIBAN_BOSS`) and Tlézcatl (`TLEZCATL_BOSS`) do: his player moves turned on the kaiju, picked by range. See the kit section under "Levels → Estadio Azteca" and the summary below.

**Read first.** `TLEZCATL_BOSS` in `src/config.ts` and the `tlez` branch of `src/rival.ts` (and `tests/tlezcatl-boss.test.ts`), the closest model. Belial's player moves: Acid Vomit (`spew()`, `COMBAT.vomit*`, `tests/belial-vomit.test.ts`), the Acid Deluge (`tickDeluge`/`tickRain`, `COMBAT.deluge*`, `tests/belial-deluge.test.ts`), the Acid Pounce, and corrosion (`corr`, `corrode*`).

**Do.**
- `BELIAL_BOSS` in `src/config.ts`, every number commented like `TLEZCATL_BOSS`; a `belial` branch in `src/rival.ts`.
- **Character: a kiter.** He fights from mid range and leaves when you close. Fewer HP than Tlézcatl (playtest tuning).
- **Up close:** the shared claw/bite. If the kaiju stays within `close` for `pressSeconds` or lands a hit, he **back-pounces**: a quick leap away (`backLeap` px) that leaves an acid puddle where he stood. `backCooldown`, and only with room behind him; cornered, he fights.
- **Mid range (up to `far`): Acid Vomit.** Telegraph (`vomitTelegraph` s: the gland swells, facing locked, a landing marker on the street), then the stream arcs onto the kaiju and sags back towards him as his pressure drains (borrow `spew()`'s arc). Puddles where it splashes; corrosion on contact; `vomitRecover` s winded.
- **Long range: Acid Pounce.** Crouch (`pounceTelegraph`, a landing ring on the kaiju's spot), a leap of up to `pounceRange` that can't be staggered, a splash on landing (`pounceDamage` inside `pounceRadius`, puddles). More often below `pounceBelow` health.
- **Ultimate: Acid Deluge.** Once per fight below `delugeBelow`: planted charge (`delugeCharge`), then a geyser and acid drops across the arena on alternating sides (borrow the player Deluge's scheduling), each leaving a puddle. A hit of `delugeBreak` strength (a Heavy or an Ultimate) in the charge breaks it up; spent either way, `delugeRecover` winded.
- **Corrosion on the kaiju.** Vomit, puddles and drops add stacks (up to 3, as the player version); each stack raises damage the kaiju takes by `corrodeVuln`; stacks fade over `corrodeFade` s out of the acid; the HUD shows them. **Tlézcatl's fire burns it off:** while he breathes the Flame Jet or stands in his own lava pool, stacks fade `burnOff` x faster.
- **Flood behaviour, only when the level has `finale.flood`** (card 7 builds the flood; this card provides the hooks and tests them with a stub): immune to the flood; can submerge (untargetable for `diveUnder` s) and resurface at another spot, often under the kaiju; pounces onto and off crusts; vomit dissolves a crust early.
- **Art:** his Stage 3 form (complete).
- **Labels and HUD:** anything that names the rival's moves picks up Belial's.
- **Debug hooks** like Tlézcatl's (force a move, set health).

**Tests** (`tests/belial-boss.test.ts`):
- Each move is picked at its range, and each telegraph comes before its move.
- The back-pounce fires on pressure, respects its cooldown and needs room; cornered, he fights.
- The pounce can't be staggered. The Deluge breaks during its charge on a Heavy and happens once per fight.
- Corrosion stacks, raises damage taken, fades, and fades faster under Tlézcatl's fire.
- Flood behaviour only with `finale.flood`.
- A retreat or a KO clears every move, pool and stack.
- Kaiban's and Tlézcatl's kits and the shared moveset are unchanged.
- The kit runs wherever Belial is the rival: Estadio Azteca, Free Play, and Paris's arena until the Paris rework.

**Done when** the tests are green and screenshots show each move's telegraph and hit, the back-pounce and corrosion on the HUD (`mex-5-*.png`).

---

## Card 6: Act 3 levels 7–8 — Ciudad Universitaria and Calzada de Tlalpan

**Needs cards 2 and 3** (the volcano and `ACID`). Stage 3, cap 3, soft floor Stage 2. The full military.

**Goal.** Replace the two placeholders with the levels in "Levels → Act 3" above: the acid at full strength and the eruption.

**Do.**
- **7. Ciudad Universitaria** (`mexCU`), `volcano:3`:
  - Insurgentes Sur with the Metrobús (buses), the Periférico as a double-deck elevated freeway with `deckUnits` troops (check whether the elevated system supports two decks; if not, single deck), UNAM's Central Library (a climbable mosaic tower) and the Estadio Olímpico.
  - **`seepsAuto`.** `ACID` seeps that burst on their own every `ACID.auto` seconds (the `ventsAuto` pattern on `STEAM`). Place a run of them that go off one after another along the street, like something moving underneath.
  - **Volcanic ground.** A level field `rock:[x0,x1][]`: stretches drawn as dark broken lava rock where Tlézcatl's lava pools (Magma Dive, globs, card 2's bombs) last `ROCK.poolLife` x longer and spread `ROCK.spread`. Keep military light here (Act 3's busiest hazards are in this level).
- **8. Calzada de Tlalpan** (`mexTlalpan`), `volcano:3` with `volcanoOn:'target'` (card 2):
  - South down the Calzada; the Tren Ligero on a surface track beside the road (grabbable trains at Stage 3); the stadium car parks with the field HQ as the target; Estadio Azteca in the far skyline. The full military, heavier than level 7.
  - **Sinkholes.** A level field `sinkholes:[x0,x1][]`: marked stretches of street (cracked, drawn faintly) that cave into a pit under a heavy landing (Magma Dive, a thrown building, a toppling tower), taking whatever is on them. Reuse Hudson Yards' `dropSpan` (it opens a pit and sinks what stands on it). Place one under the target's walls. Decide (and test) what the kaiju does when one opens under him; suggestion: he drops in waist-deep and can walk or climb out, so it never traps him.
  - Leave a few troops between the target and the exit so the first bomb Eruption has something to hit.
- **Config.** `MEX3` plus `ROCK`, `SINKHOLE` blocks; `ACID.auto`.

**Tests** (extend or add `tests/mex-act3.test.ts`):
- Landmarks, targets and fields are where the plan puts them.
- Auto seeps burst without a slam, on their timer, only where `seepsAuto` is set.
- Lava pools last longer on `rock` and not elsewhere.
- A sinkhole opens under a heavy landing and takes troops, vehicles and buildings; the kaiju gets out.
- Destroying Tlalpan's target erupts the volcano (state 4) once, and Eruption then drops bombs.
- None of it changes any other level.

**Done when** the tests are green and screenshots show the auto seeps, lava on rock, a sinkhole swallowing a convoy, and the eruption over the Calzada (`mex-6-*.png`).

---

## Card 7: Estadio Azteca — the boss level

**Needs cards 2, 3 and 5.** Stage 3, tier 5, `volcano:4` throughout.

**Goal.** Replace the placeholder with the level in "Levels → Estadio Azteca" above: the concourse approach, the bowl, Belial coming up through the pitch, the rising acid flood, lava crust, and his retreat down the drain.

**Read first.** The `finale` machinery (`wake`, `breaks`, `retreats`) and how `nycEmpire` / `tickClimbFinale` in `src/game.ts` drive breaks; the water bands (depth, wading, drowning); `ACID` (card 3).

**Do.**
- **The approach:** two screens of concourse and the last military push.
- **The bowl:** the pitch in the middle, the stands as stepped terrain tiers at both ends, a rim walkway joining the top tiers across the stadium's roof ring.
- **The wake:** passing `finale.wake`, the pitch splits and Belial comes up out of the drainage (the Empire State's crack, drawn as a torn pitch and a drain).
- **`finale.flood`** (opt-in): an acid water band over the pitch whose surface rises to the next tier at each health break (`FLOOD.levels`), eased over `FLOOD.rise` s after `FLOOD.warn` s of bubbling. It reuses the water code and adds `ACID` damage per second to anything in it. Three breaks: pitch → lower tiers → upper tiers → rim.
- **Lava crust.** Tlézcatl's lava landing on the flood (Magma Dive globs, the pool under a dive, card 2's bombs) cools into a crust: a solid platform on the surface as wide as the lava that made it, lasting `FLOOD.crustLife` s, cracking near the end, then sinking. It rides the surface as the flood rises. Belial's vomit dissolves one early (card 5's hook). Crust forms only on `finale.flood` acid.
- **The rim walkway** is built either way; open it only at the last break if the crusts play well, otherwise from the first flood. Make it a single flag so playtest can flip it.
- **A non-Belial rival** (Free Play) is immune to the flood and keeps to the tiers; none of Belial's flood moves.
- **Finale:** at 0 health Belial dives into the acid at centre field and down the drain (`retreats`), gone. `conquerCity` unlocks Belial and Paris.
- **Config.** `AZTECA` / `FLOOD` blocks, each number commented.

**Tests** (`tests/mex-azteca.test.ts`):
- The level's shape: approach, bowl, tiers, rim walkway; Belial is the rival and uses card 5's kit.
- The flood rises one tier per break, after its warning, and damages the kaiju but not Belial.
- Crust forms from each lava source, carries the kaiju, rides the rising surface, expires, and is dissolved by Belial's vomit; never forms on seeps or ordinary water.
- The rim walkway flag opens it when set.
- A non-Belial rival is immune and stays on the tiers.
- The retreat happens at 0 health, and conquering unlocks Belial and Paris.
- `finale.flood` and crust change no other level; the Empire State is unchanged.

**Done when** the tests are green, a full fight is playable start to finish in the browser, and screenshots show the wake, each flood level, a crust platform in use, bombs over the flood and the retreat (`mex-7-*.png`).

---

## Card 8: Xochimilco — the secret level

**Needs card 1.** Can run in parallel with cards 2 to 7. 5 screens, Stage 3, tier 5 (light), `secret:true`, `after:'Ciudad Universitaria'`, `volcano:3` (card 2; leave the field set even if card 2 hasn't landed).

**Goal.** Replace the placeholder with the level in "Levels → Secret: Xochimilco" above: fire on water.

**Read first.** The water bands (`src/water.ts` or wherever bands live), police and coastguard boats, the fire code's spread and how wrecks catch fire (`wreckChance`), the flee logic (sea lions, zoos), and `nycConey` for how a secret level is put together.

**Do.**
- **Check the fire code first.** Find out whether a vehicle can stay alight while it moves and spread fire on contact. If it can't, that's the bulk of this card: add a burning state to vehicles (`burning` seconds, contact spread to buildings and other vehicles), opt-in by vehicle kind.
- **The level** (`mexXochimilco`): the embarcadero (dock) crowded with boats and fleeing crowds; one long canal running the length of the level plus short side canals; chinampas between them with ahuejote trees; the doll island (generic name, atmosphere only: no score, no target); axolotls that scatter (the flee list); grey ash on the water.
- **Canal current.** `current:[band, speed]` on a water band (signed for direction). Floating things on that band drift with it: trajineras, and wrecks and debris thrown in, which float off instead of sinking at once. Powered boats (police, coastguard) still drive themselves.
- **Trajineras.** A new vehicle kind `trajinera`: floats, drifts with the current, carries crowds, can be grabbed, thrown and smashed. Set one alight and it keeps burning as it drifts, lighting chinampas it brushes and boats it bumps. Food and mariachi boats are trajinera variants (art only).
- **Chinampa ground.** A level field `soft:[x0,x1][]`: the kaiju sinks in ankle-deep and moves at wading speed.
- **Military:** light. The Guardia on boats, a few helicopters, one emplacement on the dock.
- **Getting in and out:** reached from Chapultepec's east exit (card 1 wires the route); exits back to Ciudad Universitaria. The Tren Ligero as the arrival/departure art at each end.
- **Config.** `XOCHI` block (current, trajinera, burning, soft ground), each number commented.

**Tests** (`tests/mex-secret.test.ts`):
- The level is the secret, 5 screens, rejoins at Ciudad Universitaria, and is entered from Chapultepec's east exit.
- Current moves floating things on its band only; powered boats ignore it.
- A burning trajinera keeps burning, drifts, and sets chinampas and other boats alight; an unlit one doesn't.
- Chinampa ground slows the kaiju; outside it, speed is normal.
- None of it (current, burning vehicles, soft ground, trajineras) changes any other level; Coney Island is unchanged.

**Done when** the tests are green and screenshots show the dock, a fire boat travelling down the canal and lighting a jam, wading on a chinampa and the doll island (`mex-8-*.png`).

## Done: notes for later cards

- **Card 1 (scaffold).**
  - `MEXICO_CITY` and `MEX_CLASSIC` are in `src/levels.ts`, just above `LEVELS`. The placeholders are `cityLevel('mex', ...)` over the `MEX_ROW` / `MEX_TALL` / `MEX_LOW` repeat units. Replace each by its card's builder, the way `NEW_YORK` calls `nycBattery()` and the rest. `secretId:'xochimilco'` and a `lore` line are already set on Xochimilco.
  - `sinking:true` is the opt-in field (`BlockDef`, read by `sinkAround` through `block.sinking`). It is on Templo Mayor and the five `MEX_CLASSIC` blocks, and `tests/mex-scaffold.test.ts` pins that no other level has it.
  - `mex-classic` is appended after `syd`, so `CITIES[SYD]` is no longer the last entry. `tests/sydney.test.ts` now expects `mex-classic` after it. `bootCampaign(seed,{city:'mex-classic',kaiju:'Tlézcatl'})` boots it, and `tests/phase5.test.ts`'s `free()` helper boots both fixture cities that way.
  - The placeholder layouts must stay distinct from one another (`tests/campaign.test.ts` hashes every layout). A card that swaps a level in changes `mex`'s pin in `tests/sydney.test.ts`: re-pin it, and leave the `mex-classic` check alone.
  - Tests that scan "no other level has field X" (`tests/alcatraz.test.ts`, `sf-act1`, `sf-act2`) now exclude Mexico City's route levels or Xochimilco. A new Mexico City field that these scan for needs the same exclusion.
  - The placeholders carry `police`/`guard`/`air` like the NYC ones did. Act 3's soft floor needed no setting: NYC's placeholders set none either.
  - Screenshots: `docs/screenshots/mex-1-*.png` (Templo Mayor, Chapultepec, Estadio Azteca with Belial as the rival, and the classic Tlézcatl Arena).
- **Card 2 (Popocatépetl).**
  - `BlockDef` gains `volcano?:1|2|3|4`, `volcanoOn?:'target'` and `ashLate?:number`. No route level sets them yet: **cards 3, 4, 6, 7 and 8 set them from the plan's table** (1 for levels 1–3; 2 for 4–6 with `ashLate` on Chapultepec; 3 for Ciudad Universitaria and Xochimilco; 3 plus `volcanoOn:'target'` on Calzada de Tlalpan; 4 on Estadio Azteca). No other city or `mex-classic` may set them (`tests/mex-volcano.test.ts` pins it); the `mex` pin in `tests/sydney.test.ts` is unchanged because no level data moved.
  - `volcanoPuff()` is in `src/game.ts` and not exported. Card 3 calls it from Templo Mayor's arrival (for example from `loadBlock` or the level's start trigger). It does nothing at state 0.
  - `kaijuTest.setVolcano(state,{on,ashLate})` jumps to a state and arms the target trigger, so tests do not need a level that sets them. `kaijuDebug.volcano` reads `{state,ash,flare,flares,puffs,queued,bombs,dropped,blown,mood}`.
  - The trigger polls `objective.shattered` each frame (state 3 and `volcanoOn` only), so any way of killing the target counts. It fires once per level load.
  - `moodNow()` now wraps `baseMood()` (the old function). At states 3 and 4 it returns a tinted copy with `smog:true`; below 3 it returns the base mood object untouched. Anything that reads the mood sees the eruption sky (the lit-window thresholds read `lights`, which is not changed).
  - Bombs are globs with `ult:true,bomb:true`: they use the Eruption glob's hit rules (Ultimate damage, no meter, no hitstop, they collide only while falling) and a small `VOLCANO.poolWidth` pool. `debug.eruptGlobs` and `eruptPools` count them with the Eruption's own, so a test that wants only the Eruption's globs should stay at state 0. Troops spawned by the blast arrive about 14 s later and hurt the player; wait that out or shield the kaiju when measuring.
  - Ash is drawn in screen space by `drawAsh()` just before the HUD; the skyline states are `volcanoPlume()`, called from the `style==='mex'` branch only when `volcano` is non-zero. The far cone sits at the left edge near the start of a level and scrolls away with the far parallax, so it is visible only in the first screen or two.
  - Screenshots: `docs/screenshots/mex-2-state1.png` … `state4.png` (skyline, camera moved off the street with `setCamera`), `mex-2-ash.png` and `mex-2-bombs.png`.
- **Card 3 (Act 1).**
  - `mexTemplo`, `mexZocalo` and `mexMerced` are in `src/levels.ts` (above `MEXICO_CITY`); config is `MEX1`, `LEAN`, `FLAG`, `TARP` and `ACID` at the end of `src/config.ts`; tests are `tests/mex-act1.test.ts`. All three levels set `volcano:1`.
  - **The pit start is not a gate.** Terrain never blocks walking (the ground snaps feet up at any steepness: only buildings and the water-band shore stop you), and a building's piers stand in the walking line, so a "gateway" cannot be walked under. Templo Mayor is therefore an authored `ground` dip (a steep west wall, a flat floor, a gentle `MEX1.pit.exit` slope back to the street east of the rim) with a solid stone platform (`deco:'ruinwall'`, `BlockDef.pit` records its edges) standing on the floor from `slabX` to the east rim. The ramp is a rubble `addMound` (`setupMex1`) up to `MEX1.pit.short` px under the platform's roof, so the way out is: ramp and a hop, or W up the face from the ramp. The pit must stay shallower than a jump (112 px). `kaijuDebug.pitOut`/`pitPuffs` and the volcano puff fire when the feet first reach the platform's roof line.
  - **`lean`** is a `BuildingSpec` field (degrees, + east). It routes through the one topple path: `impactFeel` sets `tiltDir=leanDir(b)||dir` and starts the fall at `leanTilt(b)`, so a leaning block falls its own way whichever way it was struck. Drawn as a static rotation about the base corner on the lean side (`drawBuilding`, and added to the creak shudder). Only buildings that `canTopple` (height 280 px or more) can use it. `sinkAround` adds `LEAN.sinkStep` per sink step towards the slam (only on `sinking:true`, and not landmarks) and past `LEAN.topple` the block is destroyed and falls the way it leans. The Zócalo's cathedral carries `LEAN.landmarkTilt` east. Hit boxes stay upright (the tilt is drawing only).
  - **The flagpole** is vehicle kind `pole` (`vehicles.ts`; `loose()` is false for it, `flattenVehicle` ignores it, `upright`/`uproot` treat it like a lamppost so it is laid flat when lifted). `BlockDef.pole` is the mast's centre x; the plinth is cleared of buildings, cars, props and crowds (`FLAG.clear`). Held, J or K calls `swingPole()` (a synthetic light `performStrike` with `poleExtra` extra reach and `FLAG.damage` x), H throws it from chest height at `FLAG.throwSpeed`. A thrown pole stops on its first building, unit, rival or target (cars and lampposts in the way are knocked aside, not a stop) and settles `parked`, grabbable again where it lies. **Card 4's heavy props can reuse the pattern:** kind in `vehicles.ts`, an option in `tryGrab`, a branch in `throwHeld`, a `tickVehicles` settle branch, a draw branch in `drawVehicle`.
  - **`tarp`** is a `BuildingSpec` run id. `tarpSpread()` (called from `tickFire`'s spread step) exposes the neighbours in the same run within `TARP.gap` at `FIRE.spreadChance x heat x TARP.spread`. Stalls are ordinary `medium` buildings (`deco:'mstall'`, 67 px tall so a kaiju can lift them) set more than `FIRE.reach` apart so only the canopy carries the flame. `drawTarps()` draws the canopy sections while both ends stand.
  - **`ACID` / `seeps`** are built exactly like the vents: `Seep` has `auto`, `dk` and `rk` already (damage and radius multipliers), and `tickSeeps` runs the warn-then-burst cycle when `auto` is set. **Card 6's `seepsAuto`** only has to set `auto:true`, `dk:ACID.auto.damage` and `rk:ACID.auto.radius` and start `next` at `ACID.auto.first + i*stagger` in `setupSeeps` (add the `BlockDef` field). **Card 7's flood** can read `ACID.perSecond` for the band's damage. A burst runs `acidAround` every `ACID.tick` s: troops burn and corrode, loose cars wear to a flat wreck, a building within `baseReach` takes damage plus a corrosion mark (no sinking, no fire), then a puddle keeps doing the same for `puddleSeconds`. Acid never touches the player or the rival.
  - Target art `palace` (`drawObjectiveArt`, `MEX1.palaceW/H`) is a long red tezontle facade with the command post van beside it. New decos `ruinwall`, `mercado` and `mstall` are drawn in `drawDeco`. The market hall's pillars are `spire` parts (hittable, not solid) so nothing walls off the crystal; its roof is raised high enough for a Stage 2 body.
  - Tests that scan "no other level has field X" are unaffected (the new fields are all on these three levels, and `tests/mex-act1.test.ts` pins that). `kaijuTest.spawnVehicle(kind,x)` is new. The `mex` pin in `tests/sydney.test.ts` is re-pinned.
  - Screenshots: `docs/screenshots/mex-3-*.png` (`pit-start`, `pit-ramp`, `lean-standing`/`lean-topple`/`lean-fallen`, `flag-plinth`/`flag-held`/`flag-swing`/`flag-thrown`, `cathedral-leaning`/`cathedral-falling`/`cathedral-fallen`, `palace`, `tarp-row`/`tarp-burning`/`tarp-burning-2`, `market-hall`, `seep-idle`/`seep-burst`/`seep-aftermath`).
