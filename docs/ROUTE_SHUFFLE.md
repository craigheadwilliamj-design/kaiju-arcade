# Sydney, Atomotitan and the route shuffle (work cards)

Five updates, turned into four work cards:

- **Add Sydney, Australia:** card 2.
- **Move Myrmex to Sydney:** card 3.
- **Move Sargathoth to Hong Kong:** card 3.
- **Add Atomotitan:** card 1 (roster slot). His kit and art are card 4, which is parked.
- **Move Atomotitan to Tokyo:** card 3.

Each card stands alone: start a session with the card's text. Read this whole file first.

**Order.**
- Cards 1 and 2 can run in parallel.
- Card 3 needs both of them.
- Card 4 is **parked** (low priority, no kit planned yet). Atomotitan ships as a placeholder alongside Sargathoth until the designer is ready.

The three moves are one card on purpose. Done one at a time, they leave the route in broken in-between states: two cities with the same boss, a boss that isn't in `KAIJU` yet, and three save-format bumps instead of one.

## Fixed decisions

- **Route:** San Francisco → New York → Mexico City → Paris → **Sydney** → Hong Kong → Tokyo. That's seven cities.
- **City ↔ kaiju after the shuffle:**

  | City | Kaiju |
  |---|---|
  | Sydney | Myrmex |
  | Hong Kong | Sargathoth |
  | Tokyo | Atomotitan |

  Atomotitan is the final city and the final kaiju unlock.
- **Sydney gets placeholder parity**, not a full rework. Mexico City, Paris, Hong Kong and Tokyo are still the original five districts per city (4/6/8/8/4 screens). Sydney gets the same: five districts, its own style, skyline, landmarks, street junk and one city twist. A NYC_REWORK-style rework of Sydney (nine levels plus a secret level, three acts) is a later, separate plan.
- **Sargathoth's move is just the move.** He keeps the shared M4 rival moveset and his geometric stand-in. His kit and art are a later card.
- **Atomotitan is a placeholder, like Sargathoth.** He gets the shared M4 rival moveset, a geometric stand-in, provisional ratings and a `'TBD'` ending. His concept comes from the designer later (card 4, parked). Don't invent lore, an epilogue or a look beyond what that card states (`src/presentation.ts`: "Original epilogues/illustrations have not been supplied. Do not invent final lore.").

## How cities and kaiju are wired today (read before any card)

**City data.**
- `CITIES` in `src/levels.ts`: per city, `kaiju?` is who the campaign forces you to play there, and `boss` is the final boss of its last level. `difficulty` is the rival-HP step: `createRival` in `src/rival.ts` uses HP × (1 + difficulty × 0.1).
- `difficulty` is continuous and kept per city "so adding a city never shifts another city's tuning".
- **Two models are in use.**
  - The redesigned cities (SF and NYC) set `kaiju` and make `boss` the *next* city's kaiju.
  - The original four (mex/par/hkg/tyo) have no `kaiju`, and `boss` is the city's *own* kaiju. Hong Kong/Myrmex means HK's boss is Myrmex, and beating him unlocks him.
  - The new cities follow the original model: Sydney's boss is Myrmex, HK's is Sargathoth, Tokyo's is Atomotitan.
  - When those cities are reworked later, the redesign rule moves each boss one city earlier: Paris's boss becomes Myrmex, Sydney's Sargathoth, HK's Atomotitan. Out of scope here.

**Levels and the route.**
- `LEVELS` in `src/levels.ts` is parallel to `CITIES`, by index. `nyc-classic` is the last entry today. It's an off-route test fixture reached with `kaijuTest.gotoCity`.
- `CAMPAIGN` in `src/campaign.ts` is the route, as city ids. Everything route-facing goes through it and `cityIndexOf`: Free Play's city list, `conquerCity`, `advanceCity`, records and the QA playthrough.
- **Checkpoints store `city` as a position on `CAMPAIGN`**, not an id. Inserting a city before Hong Kong shifts the meaning of every saved position from 4 up.

**Kaiju.**
- `KAIJU` in `src/campaign.ts` is the roster, and validation keys off it: saves, records, Free Play and endings.
- `ROSTER` in `src/presentation.ts` holds the colour, the 1–5 ratings and the ending title. `ENDINGS` and `ART_SLOTS` derive from it.

**City styles.**
- `CityStyle` in `src/levels.ts` is `'nyc'|'mex'|'par'|'hkg'|'tyo'`.
- About 22 `style()==='…'` switches in `src/game.ts`, plus some in `src/hitbox.ts`, pick facades, roof tanks, lamp posts, twists and skylines.
- **Gotcha:** some switches end in a bare `else` that is really Tokyo. The far skyline in `src/game.ts` (Mount Fuji, Skytree, Tokyo Tower) is one. A new style falls into it silently.
- City twists live in `TWISTS` in `src/config.ts`. Each one is gated on a style in `src/game.ts`:
  - Mexico City: sinking ground (`sinkAround`).
  - Paris: catacombs.
  - Hong Kong: domino topples.
  - Tokyo: quake sway.
- Street junk comes from `JUNK`/`DIMS` in `district()` in `src/levels.ts`, two kinds per style.

## Shared notes (every card)

- **Tests.** `npm test` builds and runs everything.
  - A full run rewrites `qa/stress.json` timings. Revert that file unless the change is intended.
  - The river test `pulls a whole train out of a pit` is flaky under full-suite load. Re-run it alone if it fails.
  - Run `npm run qa` when a card changes the route or level contents.
- **Opt-in rule.** New behaviour is gated on the new style or an opt-in `BlockDef`/config field, and tests prove no other city picks it up. SF, NYC and `nyc-classic` must stay byte-identical. Mexico City, Paris, HK and Tokyo must not change, except for what card 3 names.
- **Append, don't insert.** New `CITIES`/`LEVELS` entries go at the end (after `nyc-classic`), so no existing city index moves. Route order is `CAMPAIGN`'s job.
- **Seeing it in the browser.**
  1. `npm run build`, then serve `dist/`.
  2. In a Playwright init script, set `window.__kaijuTest=true`. This exposes `kaijuTest` and `kaijuDebug`.
  3. Seed the save keys from `src/campaign.ts`. These are the v2 keys until card 3 lands and the v3 keys after it. Card 3 updates `docs/NYC_FIXES.md` to match.
  4. Continue, then Begin City, then `kaijuTest.goto(block, x)`.
  5. For an off-route city, use `kaijuTest.gotoCity(id, block)`.
- **Screenshots.** Save before/after shots to `docs/screenshots/` (`route-<card>-*.png`).

---

## Card 1: Add Atomotitan to the roster (data only)

**Goal.** Atomotitan exists as a seventh kaiju in data, the way Sargathoth does today: locked, with a geometric stand-in and provisional ratings. No route change and no moveset. This unblocks card 3, which needs a valid boss name, and card 4.

**Do.**
- **Roster data.**
  - `src/campaign.ts`: append `'Atomotitan'` to `KAIJU`.
  - `src/presentation.ts`: add a `ROSTER` entry with placeholder values: a neutral colour distinct from the other six, ratings `[3,3,3,3]` and ending `'TBD'`. Comment it as a placeholder until card 4.
  - `ENDINGS`/`ART_SLOTS` pick it up automatically. Check that they do.
- **Stand-in.** Rivals and roster previews for a kaiju without art fall back to the stand-ins near `// Deliberately simple replaceable geometric stand-ins` in `src/presentation.ts`. Confirm Atomotitan draws there, in the roster preview and as a Free Play boss, the same way Sargathoth does.
- **Labels.** `ultimateLabel()` and the dive label in `src/game.ts` fall through to the generic text for him, as they do for Sargathoth. Leave them.
- **Roster screen.** The choose-your-kaiju grid (`roster-grid` in `public/style.css`) has had six cards until now. Check that seven lay out cleanly at desktop width and at phone width (390px), and fix the grid if the seventh card orphans badly.
- **Saves.** Adding a name to `KAIJU` is backwards compatible: v2 saves stay valid. Don't bump `SAVE_VERSION` here.
- **Tests.**
  - Loops over `KAIJU` (`tests/presentation.test.ts`, `tests/qa-controls.test.ts`) now cover seven kaiju. Fix anything that assumed six.
  - Nothing can unlock Atomotitan until card 3, so `tests/qa-playthrough.ts` still expects `unlocked.length` 6. Leave it.
  - Add a test that Atomotitan is in `KAIJU`/`ROSTER` and is selectable once unlocked.

**Done when** the tests are green and a browser check shows the seventh roster slot: locked as `???`, and unlocked (through `?dev` or `access()`) with a stand-in preview. Atomotitan is also selectable as a Free Play boss once unlocked.

---

## Card 2: Add Sydney as a city (off-route)

**Goal.** Sydney is a complete city at the same depth as Hong Kong or Tokyo: five districts, its own look and one twist. It isn't on the route yet. Card 3 puts it there. Until then it is reachable only through `kaijuTest.gotoCity('syd', block)`, like `nyc-classic`.

**City entry.** Append to `CITIES` in `src/levels.ts`:
- **Basics:** `id:'syd'`, `name:'Sydney'`, `code:'SYD'`, `boss:'Myrmex'`, `difficulty:2.5`, `style:'syd'`. The difficulty sits between Paris (2) and Hong Kong (3), so neither of them moves. Add `'syd'` to `CityStyle`.
- **Mood:** bright harbour daylight with a high, hard sun. It should read as midday-to-afternoon and contrast with HK's and Tokyo's night. Pick `top`/`bottom`/`far`/`mid`/`near`/`win`/`sun` to suit, with `lights` low (around 0.15).
- **Palette:** sandstone and pale-glass `colors` and `material`. Use `slab` around 1 and `glass:true` for the CBD towers.
- **Signs:** for example `['CAFE','PUB','SURF','BOTTLE-O']`.
- **Vehicles:** `taxi` and `cars` to suit.
- **Ink:** dark, for a light sky.
- Write a one-line comment on the entry saying it's off-route until card 3.

**Levels.** Append a `SYDNEY` array to `LEVELS`, at the same index as the new `CITIES` entry.
- **Mirror Hong Kong's five districts one for one:** the same screen counts (4/6/8/8/4), the same `kind` per slot and the same wrappers where they fit. HK uses `terrain(…)` on blocks 1, 2 and 4. Sydney's CBD can use gentle terrain, or none. Add `grids`/`poles` entries in the city-systems table at the bottom of `src/levels.ts`, as the other cities have.
- **Suggested districts.** Rename freely, but keep one landmark tower (`L` preset) per open block:
  1. **The Rocks** (4): sandstone terraces by Circular Quay. Landmark: `SYDNEY OPERA HOUSE`. It needs a new `|sails` shape, or use an existing shape to start.
  2. **George Street** (6): the CBD spine. Landmarks: `SYDNEY TOWER|needle` and `QUEEN VICTORIA BUILDING|dome`.
  3. **Barangaroo Bastion** (8): the crystal stronghold slot. It mirrors `Harbour Stronghold`'s rules.
  4. **Harbour Bridge Assault** (8): Milsons Point side, `TOWN HALL` or similar. The bridge itself is skyline art, not a level piece.
  5. **Myrmex Arena** (4, `'boss'`): the same shape as HK's arena.
- **Style audit.** In `src/game.ts` and `src/hitbox.ts`, check every `style()==='…'` switch and give `'syd'` an explicit branch wherever a bare `else` would fall into another city's art:
  - **Skyline:** Harbour Bridge arch, Sydney Tower, the Opera House sails if they aren't a landmark.
  - **Facades:** sandstone low-rise and glass CBD towers.
  - **Roof tanks.**
  - **Lamp posts.**
- **New landmark shapes** need matching `hitbox.ts` parts, the way `lattice`/`needle`/`twin` do.
- **Street junk.** Add a `syd` entry to `JUNK` (for example a bus shelter and a bin) with `DIMS` sizes.
- **City twist.** Add one, gated on `style()==='syd'`, with its numbers in `TWISTS` in `src/config.ts`. Proposed: **a southerly buster**. A wind with a fixed direction per level pushes fire spread downwind: the `FIRE` spread chance is multiplied going one way and damped going the other. Smoke drifts the same way. Embers can jump one gap downwind. Swap it for another twist if the designer prefers, but keep it to one cheap, opt-in system like the other four.

**Tests.** Add `tests/sydney.test.ts`. It checks:
- Sydney isn't in `CAMPAIGN`, Free Play or records yet.
- Its five levels have the expected screens, kinds and landmarks.
- The twist fires in Sydney and in no other city.
- HK's and Tokyo's outputs are unchanged.

Also add `'syd'` to the `ORIGINAL` city lists in `tests/campaign.test.ts`, `tests/city.test.ts`, `tests/exploration.test.ts` and `tests/phase5.test.ts`. Those lists check placeholder-district invariants, and Sydney is a placeholder-style city.

**Done when** the tests are green and a browser check through `gotoCity('syd', …)` shows each of the five districts. The skyline is Sydney's and not Tokyo's. The twist is visible in a fire. The arena loads Myrmex as the rival. Take screenshots of all five.

---

## Card 3: Shuffle the route (Myrmex → Sydney, Sargathoth → Hong Kong, Atomotitan → Tokyo)

**Needs cards 1 and 2.**

**Goal.** One atomic change: Sydney joins the route after Paris, and the three bosses move. Old saves carry over.

**Do.**
- **Route.** `src/campaign.ts`: `CAMPAIGN=['sfo','nyc','mex','par','syd','hkg','tyo']`.
- **Bosses.** `src/levels.ts` `CITIES`:

  | City | New `boss` | Old `boss` |
  |---|---|---|
  | `syd` | `'Myrmex'` | — (already set by card 2) |
  | `hkg` | `'Sargathoth'` | `'Myrmex'` |
  | `tyo` | `'Atomotitan'` | `'Sargathoth'` |

  Leave the difficulties as they are: syd 2.5, hkg 3, tyo 4. Remove card 2's off-route comment.
- **Arenas.** Rename the boss levels, `Myrmex Arena` → `Sargathoth Arena` in HK and `Sargathoth Arena` → `Atomotitan Arena` in Tokyo.
  - Search for the old names everywhere before renaming: `exits`, `after`, tests, the QA bot, the README. Level names are looked up by string.
  - Don't touch the layouts.
- **Saves: v3 with migration.** Today, v1 saves are dropped rather than migrated. Do better this time, because shifting positions is mechanical.
  - Set `SAVE_VERSION=3`. The keys become `kaiju-arcade:permanent:v3` and `kaiju-arcade:campaign:v3`.
  - On boot, before `readSaves`, a v2 checkpoint becomes v3 with `city` mapped by id: old position p → `CAMPAIGN.indexOf(OLD_V2_ROUTE[p])`. Keep the v2 route as a constant for this. Positions 4 and 5 (hkg, tyo) become 5 and 6.
  - A v2 permanent save copies across as is. `conquered` is ids, and unlocks are names.
  - Then remove the v2 keys and move them onto `LEGACY_KEYS`.
  - A player who had conquered HK keeps Myrmex unlocked. That's fine, and needs no special case.
  - Records: `cities` counts stay valid, and `completed` stays true for old full runs.
- **Ending flow.** Completing the final city (now Tokyo, whose boss is Atomotitan) unlocks the gallery ending for the *run's* kaiju, as before. Check that the ending and gallery screens handle seven entries.
- **Counts and docs.**
  - `tests/campaign.test.ts`:
    - The route assertion becomes seven cities.
    - Per-city level counts: `[9,9,5,5,5,5,5]`.
    - `banked`: 7000.
    - `cities`: 7.
    - The "city past the route is rejected" check uses the new length.
  - `tests/qa-playthrough.ts`: `unlocked.length` becomes 7 (Mogurodon plus six unique bosses). Then re-run `npm run qa` and commit the new `qa/playthrough.json`.
  - `README.md`:
    - "six-city" → "seven-city".
    - The route list.
    - The 38 route levels become 43.
    - The *Campaign rules* order line becomes "New York/Kaiban, Mexico City/Tlézcatl, Paris/Belial, Sydney/Myrmex, Hong Kong/Sargathoth, Tokyo/Atomotitan".
    - The storage keys.
  - `QA_REPORT.md`: any counts.
  - `docs/NYC_FIXES.md`: the localStorage keys in its browser-check notes.
- **Tests.** Add migration tests:
  - A v2 checkpoint at each old position resumes in the same city.
  - A v2 permanent save survives.
  - The v2 keys are removed.
  - A v3 save round-trips.
  - A garbage v2 save is ignored, not thrown on.

  Also test that beating each boss unlocks the right kaiju: Sydney → Myrmex, HK → Sargathoth, Tokyo → Atomotitan.

**Done when:**
- The tests and `npm run qa` are green.
- In a browser, a fresh campaign reaches Sydney after Paris, and Free Play lists Sydney once conquered.
- A seeded v2 checkpoint that was in Hong Kong resumes in Hong Kong, with Sargathoth as the boss.
- Tokyo's arena spawns Atomotitan (the stand-in until card 4 ships).

---

## Card 4: Atomotitan's kit and art — **parked**

**Status: parked.** No kit is planned yet and it's low priority. Atomotitan plays as a placeholder alongside Sargathoth until then. Don't start this card until the concept block below is filled in. It needs card 1 and can run before or after card 3.

**Concept (designer to fill in; the card can't start until this is filled in).**
- **Look:** the silhouette and palette at Stage 1, Stage 2 and Stage 3.
- **ROSTER colour:**
- **Ratings** (Damage / Speed / Resistance / Range, 1–5):
- **Ranged (L):** name, and what it does on the ground, in the air and on a wall.
- **Ultimate (U):** name and behaviour.
- **Slam dive:** name and what it adds on impact.
- **Movement quirk, if any:** for example, Myrmex's wings give him extra jumps and a glide.
- **Ending title:**
- **Boss behaviour at Tokyo:** the shared M4 rival moveset for now, or a boss kit like Kaiban's or Tlézcatl's. A boss kit is its own follow-up card.

**Engineering pattern.** Follow Myrmex and Belial, the most recent full kits.
- **Moves:** an `isAtomotitan()` helper in `src/game.ts`, with the ranged, Ultimate and dive branches beside Myrmex's (`brew`/`spit`, `swarm`, the Sting Dive). Name the moves in `ultimateLabel()` and in the dive label.
- **Tuning:** an `ATOMOTITAN` block in `src/config.ts` (or `MOVE`/`COMBAT` fields, the way Myrmex's live in `MOVE`), each number commented.
- **Art:**
  - Three forms in `src/presentation.ts`, with a strip per move per stage at `public/assets/atomotitan-s{1,2,3}-<move>.png`.
  - Keep the same strip names as the other kaiju (idle, walk, run, the light hits, the heavy moves, jump, climb, crouch, grab/carry/throw, dive, slam-land, the Ultimate set and his ranged set). Use `borrow` while any are missing.
  - Pose tooling goes in `tools/` like `tools/*_poses.py`.
  - `build-artifact.mjs` packs a sheet per form. Check that the artifact build still fits.
- **Tests:** `tests/atomotitan-*.test.ts`, one file per move, the way `myrmex-jump`/`myrmex-spit`/`myrmex-swarm` are split. They check that the moves are gated to him and that no other kaiju's behaviour moves.
- **README:** add the kit to the controls line (`U` … `Atomotitan: <Ultimate>`) and add a section like the other kaiju's.

**Done when** Atomotitan plays all three stages with his own strips and moves, the tests are green, and screenshots of each stage and each signature move are in `docs/screenshots/`.
