# Kaiju Arcade — Phase 7 QA report

8 November 2026 · Build 0.7.0

**Current shared-combat build: QA passed. Full release certification: blocked by the omitted Phase 5 combat and missing final content.**

## Checks actually run

- `npm test`: 81 automated tests passed. Includes six selectable shared-combat identities, input repeats, crouch/jump rules, frame-gap clamping, focus-loss charge cancellation, display resizing, saves/score isolation, combat/military rules and collision regressions.
- `npm run check`: emitted JavaScript syntax checks passed. No TypeScript typechecker or lint tool is configured.
- `npm run qa`: all 25 actual gameplay blocks completed by a deterministic keyboard bot through the real game loop, with ordinary HP/crystal/attack/resource rules. No world/HP/score mutations, invulnerability toggle, level skips or test-only gameplay controls. Canvas calls use a Node mock, so this is **simulation playtesting**, not a manual/browser/GPU playthrough.
- `git diff --check`: passed.

## Defects found and fixed

1. **Landing inside a short solid barricade.** A new keyboard probe reproduced a player/building overlap during the first stronghold jump. The player is now separated sideways after vertical movement; no climbable platform is introduced. The same rule resolves evolution in a gap too narrow for the enlarged body and includes physical rival blocking. Regression tests plus the live-loop probe now pass.
2. **Transient stagger guard carried into the next block.** Block loading now clears the guard along with transient stagger/knockback/charge state. HP, Ultimate and Super still carry as required.

Two QA harness errors were also corrected: comparing unrounded saved score with rounded HUD score, and stopping the bot inside a 7px movement dead zone before reaching the 3px exit trigger. These were test-driver defects, not game scoring or exit failures.

## Actual 25-block simulation results

Fixed bot seed: 0.75 (reinforcements from the right); 832 seconds of simulated active play (~13.9 minutes). Separate stress/unit tests exercise mixed arrival sides. The bot observes read-only positions and uses real keyboard events for movement, heavy attacks, Ultimate/Super and the landing probe. It clears each layout with the currently shared combat, not the missing per-kaiju movesets.

| City | Blocks completed | Simulated seconds | Lowest block-end HP | City damage taken, including healed | Cumulative displayed score |
| --- | ---: | ---: | ---: | ---: | ---: |
| New York | 5/5 | 160 | 98 | 71 | 129,523 |
| Mexico City | 5/5 | 162 | 98 | 97 | 245,913 |
| Paris | 5/5 | 162 | 100 | 91 | 362,087 |
| Hong Kong | 5/5 | 171 | 85 | 110 | 481,586 |
| Tokyo | 5/5 | 177 | 88 | 186 | 601,152 |

The run verified all five central crystal objectives, all five conventional-HP preview rivals, city score banking, Stage-1 resets between cities, active checkpoint cleanup on completion, six permanent character unlock records, one completed leaderboard record and the Mogurodon ending/gallery unlock. Canceling the results quit confirmation twice did not repeat the Perfect bonus. Raw evidence is in `qa/playthrough.json`.

## Sustained entity limits

The stress test runs 72 simulated seconds for each of 25 city/tier combinations: **1,800 aggregate seconds / 45,000 updates**. It uses deterministic mixed-side random schedules, a moving camera, a target rectangle and repeated valid unit damage, draining events each update. This tests reinforcement cleanup and bounds, not an immortal-player balance mode. Raw evidence is in `qa/stress.json`.

| Entity | Peak in full campaign | Peak in stress test | Defined limit |
| --- | ---: | ---: | --- |
| units | 5 | 5 | 5 / 7 / 9 / 12 / 3 by block tier |
| enemyShots | 11 | 10 | 100 |
| wrecks | 3 | 5 | 24 |
| effects | 3 | 5 | short-lived cosmetic effects; no independent hard cap |
| shards | 51 | Not tracked in military-only stress | 120 |
| particles | 87 | Not tracked in military-only stress | 180 |
| civilians | 77 | Not tracked in military-only stress | 180 |
| growths | 1 | Not tracked in military-only stress | 3 |
| waves | 18 | Not tracked in military-only stress | bounded by Ultimate duration/range |

Node update timings in the JSON are environment-specific; no browser FPS, GPU, memory-leak or low-end-device performance certification is claimed.

## Coverage and blocked checks

| Requirement | Result |
| --- | --- |
| Five cities / 25 authored blocks / 4-6-8-8-4 widths | Passed geometry rules and full keyboard simulation |
| Crystal shatter drops shards; does not directly fill HP | Passed |
| Boss death priority, only player hurts boss | Passed for current conventional-HP preview |
| Six identity selection, shared controls, stage scaling and gallery mapping | Passed |
| Six distinct kaiju movesets and character-specific balancing | **Blocked: Phase 5 not implemented** |
| Boss stages, transform invulnerability, charged combo AI, boss Ultimates | **Blocked: Phase 5 not implemented** |
| Player Ultimate invulnerability and no self-recharge | Passed |
| Boss Ultimate is damageable but uninterruptible; death cancels it | **Blocked: there is no boss Ultimate yet** |
| Restart entire city, quit/Continue, death ends run, failed/completed Top 10 | Passed in rules and actual UI simulation |
| Free Play checkpoint/leaderboard isolation and retry | Passed |
| Intro every New Campaign, Continue/Free Play skip, locked UI guards | Passed |
| Keyboard repeat, crouch/jump restrictions, focus loss, frame gap | Passed for all six shared-combat identities |
| Actual browser integer scale, Continue, no observed application console errors | Passed smoke checks |
| Small viewport resize handler | Passed simulated 400px/1280px viewport checks; visual device QA pending |
| Native fullscreen | Unavailable in this preview browser; graceful status verified |
| Final illustrations, original epilogues, sprite animation quality | **Blocked: missing final content** |

## Browser observations

Build 07 loaded. Integer scaling produced an actual 960×540 frame. Turning it off restored browser-fit layout. Fullscreen request displayed “Fullscreen is not available here. Browser-fit display remains active.” Continue reached the saved route without replaying the intro. Application-origin error logs were empty during this smoke check. Extension metadata errors were excluded as unrelated. Full human keyboard play, exhaustive device resizing and native fullscreen on a supported real browser remain unverified.

## Balance assessment and provisional values

The shared build is completable. The scripted heavy/Ultimate strategy often finishes blocks near full HP, so current healing and generic rival difficulty are forgiving. This is **not** final balance approval: individual speed/resistance/range, signature patterns, three-stage bosses and boss Ultimates would change the results materially. No speculative damage/HP retuning was made while Phase 5 remains absent.

All tuning stays in `src/config.ts`: start HP 24/100; evolution up 35/75 and down 25/65; player damage 30 light / 68 heavy / 23 ranged before multipliers; 1.5s max charge; 2.4s Ultimate / 20s Super; 6s ambient shard interval; 700 stronghold HP; 750 base preview boss HP; city military HP/damage +10% per city; 75% district exit; 1,500 Perfect bonus; actual HP lost ×10 score penalty. These remain implementation defaults, not locked design values.

## Exact missing content / release blockers

- Phase 5: distinct stats/attacks for six kaiju, Sargathoth’s Verdant Eruption/Abyssal Overgrowth, boss evolution and shared moveset AI, boss Ultimate immunity distinction and defeat/collapse/intro presentation.
- Final individual sprite sheets/stages/Super visuals, military/civilian/building sprites, intro/menu illustrations and six single ending illustrations. Current art is labeled code geometry. No final art was replaced or generated.
- Six original serious ending epilogues. Confirmed titles remain unchanged; text slots remain explicitly empty.
- Human balance/playability review and real-device browser performance/fullscreen/resize QA after Phase 5.
