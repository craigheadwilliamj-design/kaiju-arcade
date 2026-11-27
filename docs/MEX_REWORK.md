# Mexico City rework plan (campaign redesign, city 3)

**Status: draft for discussion.** Nothing is built yet. The "Open questions" section lists what needs a designer call before the cards are cut.

Mexico City gets the treatment San Francisco and New York got: nine route levels plus one secret level in three acts, its own playable kaiju and boss, per-level growth, and one new opt-in mechanic per level (a `BlockDef` field or config block). Everything SF and NYC built is reusable: `cityLevel`, exits, `capLift`, water bands, elevated, subways, fire, the `finale` machinery, the rival framework, the climbing finale, rolling bodies, heavy props.

## Fixed decisions (proposed)

- **Playable kaiju: Tlézcatl.** Beating him at the Empire State unlocks him. Mexico City sets `kaiju:'Tlézcatl'` in `CITIES`, so a campaign plays him there whatever the run picked (`kaijuFor` in `src/campaign.ts`).
- **Boss: Belial.** The redesign rule makes each city's final boss the next city's kaiju, and next is Paris. Mexico City sets `boss:'Belial'`. Beating him unlocks Belial and Paris through `conquerCity`.
  - Belial has **no boss kit** today. Kaiban (`KAIBAN_BOSS`) and Tlézcatl (`TLEZCATL_BOSS`) do. A `BELIAL_BOSS` kit is its own card (card 4), the counterpart of NYC card 4.
  - Paris keeps `boss:'Belial'` until Paris is reworked (then it becomes Myrmex). For the time being two cities share a boss. This is the same state Mexico City is in today (NYC and MEX both end on Tlézcatl), so it is precedent, not a new problem.
- **Nine route levels plus one secret level**, in three acts, on SF's and NYC's growth curve:
  - **Act 1:** Stage 1, cap 1. The last level's crystal lifts the cap to 2.
  - **Act 2:** Stage 2, cap 2. The branch level's crystal lifts the cap to 3.
  - **Act 3:** Stage 3, cap 3, soft floor Stage 2.
- **Difficulty stays at 1** in `CITIES` until playtest.
- **The old five Mexico City districts become a test fixture**, `mex-classic`, off the route, the same way NYC's became `nyc-classic`. Nine test files boot them today (`campaign`, `city`, `exploration`, `freeplay-ui`, `phase5`, `tlezcatl-boss`, and the NYC act tests that compare against them). See the scaffold card.
- **The sinking-ground twist stays** and becomes the city's through-line (see "Story thread"). It's gated on `style()==='mex'` today, so it already applies to every reworked level. Levels that want it off or stronger get an opt-in field.
- **Saves don't change.** Checkpoints store a position on `CAMPAIGN`, and the route order doesn't move, so no `SAVE_VERSION` bump. Counts do move: per-city levels become `[9,9,9,5,5,5,5]`, 43 route levels become 47.

## Story thread

Mexico City has two threads that build towards each other, one for each kaiju. **Below: the acid**, which is Belial coming up through the drains. **Above: the volcano**, which is Tlézcatl waking Popocatépetl. NYC's city foreshadowed its boss; this one foreshadows both kaiju, and the final fight is fire coming down against acid coming up.

1. **Arrival.** Tlézcatl dove off the Empire State mast into the magma, heading south. He erupts out of the Templo Mayor excavation in the Centro Histórico. The Aztec temple is the right door for a fire god's namesake. On the skyline, Popocatépetl puffs once in answer.
2. **The acid (Belial).** Something is eating the city from underneath. Green acid seeps up through storm drains in Act 1 (La Merced): puddles that corrode cars and burn troops. It gets worse through Act 2. By Act 3 the drains burst on their own. That's Belial, living in the Drenaje Profundo, the city's giant deep-drainage tunnels.
3. **The volcano (Tlézcatl).** Popocatépetl, the real active volcano about 70 km south-east of the city, stands in the far skyline of every level. It wakes up as Tlézcatl crosses the city, on a **fixed schedule** (scripted, not driven by how much the player burns): a wisp in Act 1, a growing plume and tremors in Act 2, ash fall in Act 3. When the Calzada de Tlalpan stronghold falls, it erupts. Each use of Tlézcatl's Ultimate (Eruption) makes it flare on the skyline, so the player feels responsible, but the timing never depends on it.
4. **The sinking.** The city is already sinking into the old lake bed (the existing twist). Belial's acid speeds it up: the ground gives way more, and buildings tilt.
5. **The fight.** At Estadio Azteca, under the eruption's red-black sky, Belial bursts up through the pitch from the drainage below.
6. **Retreat.** At 0 health Belial isn't KO'd. Driven off by the fire coming down, he dives into the stadium's storm drain, into the Drenaje Profundo, and away towards the sewers of Paris. (Paris's catacombs twist is a good landing for that.)

## Tlézcatl's kit vs Mexico City

Tlézcatl's ratings are 4/3/3/3. His moves are the **Flame Jet** (a held fire cone that washes along the street when aimed down), the **Magma Dive** (a slam that throws lava globs and leaves lava pools), **Eruption** (Ultimate) and the shared single shot in the air or on a wall. Fire is his whole game, so the city is built to burn:
- **Dense low-rise fuel** (markets, colonial blocks, wooden stalls and tarps) lets one long jet start a fire that runs down the block.
- **Wide boulevards** (Reforma, Insurgentes, Calzada de Tlalpan) carry convoys that a downward jet washes along.
- **Soft lake-bed ground** turns Magma Dives into sinkholes. The dive is the sinking twist's best trigger.
- **Volcanic rock** (the Pedregal in Act 3) is where his lava pools last longest.
- **Eruption answers the volcano.** After Popocatépetl erupts (the end of level 8), his Ultimate also calls volcanic bombs down from the sky. It's his signature move made bigger for the city's climax.

## Popocatépetl (the volcano schedule)

One opt-in level field, `volcano:0|1|2|3|4`, sets the volcano's state for that level. Other cities never set it, so nothing else changes.

| State | Levels | Skyline | In play |
|---|---|---|---|
| 0 | none (default) | no volcano drawn | nothing |
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
- **Reuses:** climbing, `police`, `air`, the sinking twist, a `spawn` start.
- **New:** **start in a pit.** The kaiju spawns below street level in an excavation (the Union Square garage / concourse pit drawn as stone ruins). Plus **leaning colonial buildings**: an opt-in per-building `lean` that draws the building tilted. Sinking adds lean, and a building past a lean threshold topples the way it leans.

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
- **Route:** the Alameda Central's trees and fountains, the Palacio de Bellas Artes (a `|dome` that has sunk metres into the lake bed), and the Torre Latinoamericana (climbable). The Día de Muertos procession is out: marigolds, candles, papel picado strung across the street. It's dusk going to night, using the mood ramp from NYC fix 4.
- **Acid:** a few seeps along the procession route, glowing green against the marigold orange. One sits by Bellas Artes: burst it and the dome drops another step into the ground and tilts, the acid and the sinking hitting one landmark together. The Alameda's fountains run green (art only).
- **Volcano:** state 2. From the top of the Torre Latino the plume is clearly bigger than in Act 1.
- **Reuses:** `night` / the mood ramp, park trees from Central Park, climbing, the sinking twist, `ACID`/`seeps`.
- **New:** **papel picado lines.** Strings of paper banners across the street, burnable at a touch, that carry fire across the gap from building to building. It's the one level where fire jumps the street.

**5. Paseo de la Reforma** (8 / stronghold / 2-2 / tier 3)
- **Route:** the long straight boulevard of glass towers (Torre Mayor, Torre Reforma) with the glorietas. El Ángel de la Independencia stands on its column in the middle. The army holds the avenue with tanks, and the target is the Monumento a la Revolución at the far end: the domed arch, with the field HQ dug in under it.
- **Acid:** more seeps, placed in the glorietas where the armour stands. Bursting one under a tank eats it.
- **Reuses:** stronghold, tanks, flank toppling, the elevated system where it fits, the existing `|needle` / `|arch` landmark shapes, `ACID`/`seeps`.
- **New:** **El Ángel falls.** Break the column's base and it topples along the avenue, a long falling body that crushes everything in its lane, convoys included. Plus target art for the monument (`art:'monument'`).

**6. Chapultepec** (8 / open, two exits / 2-2(3) / tier 3)
- **Route:** there-and-back like Central Park. Start mid-map on Reforma at the park gates. Landmarks along the way: the Chapultepec lake (water band), the zoo (animals flee, reusing the sea-lion list), the Museo Nacional de Antropología, and Chapultepec Castle on its hill (terrain; the crystal is in the castle, cap lift to 3). The Guardia is dug in on the hill.
- **Water:** the lake is over a Stage 2 kaiju's head and wading depth at Stage 3, so the crystal opens it. It's the Wharf/Reservoir rule.
- **Exits:** west exit → Ciudad Universitaria (the main route, by Periférico south). South exit, past the lake → the Tren Ligero to Xochimilco (secret).
- **Acid and volcano:** the lake goes green by the storm drains (art). Grey ash starts drifting late in the level, the first sign the volcano is close to going.
- **Reuses:** `exits`, `capLift`, water bands, terrain, the zoo, park ground from Central Park.
- **New:** **the Sun Stone.** The museum's huge carved stone disc is a heavy prop (grab, throw), and on landing it rolls (`src/rolling.ts`). It's a thrown boulder that keeps going. Tlézcatl grabs it at Stage 3 only.

### Act 3: The south (Stage 3, the full military)

**7. Ciudad Universitaria** (8 / district / 3-3 / tier 4)
- **Route:** Insurgentes Sur with the Metrobús lane, the Periférico's double-deck freeway (the elevated system's `freeway` look), then UNAM: the Central Library's mosaic tower and the Estadio Olímpico. It's all built on the Pedregal, the lava field the volcano Xitle left.
- **Acid:** the seeps at full strength. Drains burst on their own, with no slam needed (`seepsAuto`, the counterpart of `ventsAuto`). Belial is close.
- **Volcano:** state 3, steady ash fall. Standing on old lava from Xitle under Popocatépetl's ash column, it's where the city's volcanic past and present meet.
- **Reuses:** elevated, buses, `ACID`, terrain.
- **New:** **volcanic ground.** An opt-in ground type where Tlézcatl's lava pools last `x` longer and spread a little, and the sinking twist is off (rock doesn't sink). The level's ground is a mix, so the player feels where the lake bed ends and the lava field starts.

**8. Calzada de Tlalpan** (8 / stronghold / 3-3 / tier 4)
- **Route:** south down the Calzada towards the stadium. The Tren Ligero runs on its own track beside the road. Then the stadium approach and its car parks, where the army has built its last line around the field HQ (the target). Estadio Azteca looms at the east end in the far skyline.
- **Military:** the full military. The Calzada is a long straight lane for a downward Flame Jet wash.
- **Volcano: he sets it off.** The level starts at state 3. When the field HQ goes down, Popocatépetl erupts (state 4): the column goes up, the sky turns red and black, the ground shakes. The walk to the exit is the first chance to use the volcanic-bomb Eruption.
- **Reuses:** trains (the Tren Ligero on a surface track), `garrison`, fire, flank toppling.
- **New:** **sinkholes.** The acid has hollowed the ground: marked stretches of street collapse under a heavy landing into a pit, with whatever was on them (convoys, emplacements, the target's walls). Belial's acid and the lake bed meet here. Level field `sinkholes:[x0,x1][]`.

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

### Secret: Xochimilco (4 / district / 3-3 / tier 5, `secret:true`, `after:'Ciudad Universitaria'`)
- **Route:** reached from Chapultepec's south exit by the Tren Ligero. The canals (water bands), the chinampas (floating garden islands), the colourful trajinera boats and mariachi boats, and the island of hanging dolls (named generically). It rejoins the route at Ciudad Universitaria.
- **Volcano:** state 3 (ash fall, no bombs). It's taken from Act 2 and rejoins at level 7, so it happens before the eruption.
- **New:** **drifting fire boats.** Trajineras float on a canal current. Set one alight and it drifts down the canal, setting the chinampas and other boats alight as it goes. Plus **chinampa ground**: soft islands the kaiju sinks into ankle-deep and wades across slowly.

## Engineering notes for the scaffold

- **`cityLevel` already takes a city id** (NYC card 1). Mexico City levels use `cityLevel('mex', …)`. SF and NYC must stay byte-identical.
- **`mex-classic` fixture.** Keep the five current districts verbatim as a `CITIES`/`LEVELS` entry `mex-classic`, **appended** at the end (after `syd`), so no city index moves: `style:'mex'`, no `kaiju`, `boss:'Tlézcatl'`, not in `CAMPAIGN`, never in Free Play or the campaign map. Reach it with `kaijuTest.gotoCity('mex-classic', block)`.
  - Retarget the tests that boot Mexico City's old blocks to `mex-classic`. The `ORIGINAL` placeholder lists in `tests/campaign.test.ts`, `tests/city.test.ts`, `tests/exploration.test.ts` and `tests/phase5.test.ts` lose `'mex'` (it is no longer a placeholder city) and gain `'mex-classic'` where the check is about layout invariants.
  - `tests/tlezcatl-boss.test.ts` fights him in Mexico City's arena. Move it to `mex-classic`'s arena, which still has Tlézcatl as boss.
- **Kaiju forcing.** Once `mex` sets `kaiju:'Tlézcatl'`, any test that plays another kaiju in Mexico City breaks. That's the same fix NYC needed: point those tests at `mex-classic`.
- **Combat Drills** use `cityIndexOf('nyc')` for the mood, so they don't move.
- **Free Play.** Check that Free Play's Mexico City entry lists the new nine levels, and that the boss picker still lets you fight Tlézcatl somewhere (NYC's Empire State and `mex-classic` are both off the Free Play city list, so decide whether Free Play should offer him at Mexico City's arena; see open questions).
- **Counts.** `tests/campaign.test.ts` (`[9,9,9,5,5,5,5]`, banked, route levels), the QA playthrough (`tests/qa-playthrough.ts`, `qa/playthrough.json`: run `npm run qa`), the README (43 → 47 route levels, the order line's "Mexico City/Tlézcatl" becomes the city's kaiju, its boss becomes Belial) and `QA_REPORT.md`.
- **Test runs.** A full `npm test` rewrites `qa/stress.json` timing; revert it unless intended. The river test `pulls a whole train out of a pit` is flaky under full-suite load and passes alone.

## Work cards (in order, proposed)

1. **Scaffold.** City entry (`kaiju:'Tlézcatl'`, `boss:'Belial'`), nine plus one placeholder levels with growth, exits and `after`, the `mex-classic` fixture and test retargeting, counts, QA and README. *Blocks everything else.*
2. **Popocatépetl:** the `volcano` level field and its skyline states for `style()==='mex'`, the ash mood, the level 8 trigger hook (switch to state 4 when the stronghold target falls), the Eruption flare and tremor, and `VOLCANO` bombs on Tlézcatl's Ultimate at state 4. Tests that no other city draws or fires any of it. Can run in parallel with the act cards; each act card sets its levels' `volcano` value.
3. **Act 1:** Templo Mayor, Zócalo, La Merced (pit start, `lean`, the flagpole, palace art, `ACID`/`seeps`, tarp runs).
4. **Act 2:** Alameda, Reforma, Chapultepec (papel picado, El Ángel falls, monument art, the Sun Stone, the lake and both exits, seeps at Alameda and Reforma, the Bellas Artes sink).
5. **Belial boss kit:** `BELIAL_BOSS` in `src/config.ts` and a `belial` branch in `src/rival.ts`, his player moves (Acid Vomit, Acid Pounce, Acid Deluge) turned on the kaiju and picked by range, the way `TLEZCATL_BOSS` did it. Tests in `tests/belial-boss.test.ts`. Can run in parallel with cards 2 to 4.
6. **Act 3 levels 7–8:** Ciudad Universitaria and Calzada de Tlalpan (`seepsAuto`, volcanic ground, `sinkholes`, the eruption at the end of level 8). Needs card 2 (the volcano) and card 3 (`ACID`).
7. **Estadio Azteca boss level:** the bowl arena, the approach, `finale.flood` as a rising acid water band, lava crust platforms, the rim walkway fallback, Belial's retreat down the drain, bombs in the boss fight. Needs cards 5 and 6.
8. **Xochimilco secret level:** canals with current, trajineras, fire boats, chinampa ground.

## Open questions

1. **Boss arena.** Estadio Azteca with a rising acid flood is the proposal. Alternatives: the Pyramid of the Sun at Teotihuacan (another vertical fight, too close to the Empire State), or the Drenaje Profundo itself (an underground fight in the tunnels, Belial's home turf, but dark and cramped for a fast kaiju).
2. **Night level.** NYC had one night level (Times Square) and a mood ramp. Proposal: Alameda at Día de Muertos, dusk into night. Or keep Mexico City all smog-and-sun.
3. **Act 2 target.** The Monumento a la Revolución at the end of Reforma, or something more military (Campo Marte, the army's parade ground beside Chapultepec)?
4. **Free Play and Tlézcatl as a boss.** After the rework nothing on the Free Play city list ends on Tlézcatl unless Free Play keeps letting you pick any boss for any arena. Check how Free Play picks bosses before card 1 and decide whether anything needs to change.
5. **Belial's boss kit depth.** A full kit like Tlézcatl's (every move turned on the player), or a lighter one leaning on his speed (pounce, retreat, vomit from range)?
6. **Sinking strength.** The twist applies to every reworked level. Is that too much over nine levels? Option: an opt-in `sink:number` multiplier per level (0 for the Pedregal, stronger at Templo Mayor and Tlalpan).
