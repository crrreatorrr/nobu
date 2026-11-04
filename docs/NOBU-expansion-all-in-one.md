# NOBU expansion: everything in one file

Generated from the files in `docs/` on branch `claude/clever-goodall-8221xu`. Each part below is one source file, with its headings pushed down one level.

## Contents

1. Plan (`docs/gameplay-expansion-plan.md`)
2. Golden Bone audit (`docs/expansion/golden-bone-audit.md`)
3. Rewards spec (`docs/expansion/rewards-spec.md`)
4. Bosses spec (`docs/expansion/bosses-spec.md`)
5. New levels spec (kit API, L4, L5) (`docs/expansion/new-levels-spec.md`)
6. Level 6 spec (`docs/expansion/level6-spec.md`)
7. Extended levels spec (draft, still being written) (`docs/expansion/extended-levels-spec.md`)
8. Box Gauntlets spec (`docs/expansion/box-gauntlets-spec.md`)
9. Codex handoff index (`docs/expansion/handoff/README.md`)
10. H00-level-registry (`docs/expansion/handoff/H00-level-registry.md`)
11. H01-save-v3 (`docs/expansion/handoff/H01-save-v3.md`)
12. H02-difficulty-config (`docs/expansion/handoff/H02-difficulty-config.md`)
13. H03-placeholder-assets (`docs/expansion/handoff/H03-placeholder-assets.md`)
14. H04a-kit-gameplay-props (`docs/expansion/handoff/H04a-kit-gameplay-props.md`)
15. H04b-kit-gated-objects (`docs/expansion/handoff/H04b-kit-gated-objects.md`)
16. H04c-kit-chase-detour-camera (`docs/expansion/handoff/H04c-kit-chase-detour-camera.md`)
17. H04d-kit-box-helpers (`docs/expansion/handoff/H04d-kit-box-helpers.md`)
18. H05-dev-heatmap (`docs/expansion/handoff/H05-dev-heatmap.md`)
19. H06-golden-bone-fixes (`docs/expansion/handoff/H06-golden-bone-fixes.md`)
20. H10-chomp-chain-tally (`docs/expansion/handoff/H10-chomp-chain-tally.md`)
21. H11-bone-board (`docs/expansion/handoff/H11-bone-board.md`)
22. H12-mystery-backpack (`docs/expansion/handoff/H12-mystery-backpack.md`)
23. H20-boss-system (`docs/expansion/handoff/H20-boss-system.md`)
24. H21-boss-bird-powers (`docs/expansion/handoff/H21-boss-bird-powers.md`)
25. H22-boss-cat-powers (`docs/expansion/handoff/H22-boss-cat-powers.md`)
26. H23-boss-cone-powers (`docs/expansion/handoff/H23-boss-cone-powers.md`)
27. H40-level4-laundry (`docs/expansion/handoff/H40-level4-laundry.md`)
28. H41-boss-roomba-titan (`docs/expansion/handoff/H41-boss-roomba-titan.md`)
29. H45-level6-rapids (`docs/expansion/handoff/H45-level6-rapids.md`)
30. H46-box-gauntlets (`docs/expansion/handoff/H46-box-gauntlets.md`)
31. H50-level5-pump (`docs/expansion/handoff/H50-level5-pump.md`)
32. H51-boss-pump-queen (`docs/expansion/handoff/H51-boss-pump-queen.md`)
33. H60-kennel (`docs/expansion/handoff/H60-kennel.md`)
34. H61-mastery-ui (`docs/expansion/handoff/H61-mastery-ui.md`)

---

# Part 1: Plan

Source: `docs/gameplay-expansion-plan.md`

## NOBU gameplay expansion plan: levels, bosses, difficulty and reward loops

Status: **plan only.** No game code has changed. Written 2026-11-04 against `main` at `bfb4a33`.

Every new model, texture, portrait and story image uses an **existing asset as a placeholder** (section 9).
New asset ids are registered with a fallback, so a finished GLB or image can replace it later without code
changes.

---

### 0. Summary

NOBU already has a strong Crash-style base: Backpacks as the crates, the Sproto Mask as the guardian mask,
Cat as TNT, Rug as Nitro, checkpoint rollback, a death route (the Good Boy Route), colored-bone paths, time
trials with Freeze Packs, bosses that each grant a move, and the missed-backpack rain. What's missing is
**breadth** (3 levels, 3 bosses) and a **reward structure that keeps pulling players back**. Today the only
per-level goal after a clear is the Golden Bone, and the ending says "Golden Bones still waiting."

The plan, in priority order:

1. **Reward loops first (section 3).** Give each level a six-bone board, like Crash 4's six gems. Add a
   Chomp Chain combo, Mystery Backpacks, a rescued-dog Kennel with milestone unlocks, a "next goal" hint
   after each level, and move-gated secrets in old levels so every new boss move sends players back.
2. **Three new levels and two new bosses (sections 6 and 7).** Chapter 2, "The Smog Returns," unlocks
   after the Evil Cone. In play order:
   - **Level 4, Laundry Day:** the Owner's House at dog scale, ending in the boss **Roomba Titan**.
   - **Level 6, Smog Rapids:** a river level with raft rides and on-foot landings, from the house drains
     down to the pipeline. It has no boss and ends at a goal.
   - **Level 5, Pump & Dump Pipeline:** a trading-floor factory, ending in the true final boss,
     **the Pump Queen**.
   - Both bosses are harder than the Evil Cone.
   - Ids follow the order the levels were added, not the play order. Level 6 is played before Level 5.
3. **More powers for every boss (section 7).** The three existing bosses each get one new power per
   stage, a stage hazard in the arena and a stronger ultimate at each stage. The bosses are placed on a
   difficulty ladder: each stage is harder than the last, and each boss is harder than the one before.
   `tests/difficulty.test.js` checks that both orders hold.
4. **Longer existing levels (section 6.3).**
   - Levels 1–3 grow by about 70% and the bonus stages by about 50%, with 3–4 new sections each.
   - Each main level gets two detour routes and +4 dogs; each bonus stage gets one detour and +2 dogs.
   - The new levels are planned at the same scale: L4 about 480 m, L6 about 450 m and L5 about 460 m.
   - Extended levels go on new trial boards (`1v2`, `2v2`, `3v2`); the old boards are kept as "Classic."
5. **Difficulty as data (section 4).** Move the difficulty numbers into a `src/config/difficulty.js` tier
   table. Formalise the Crash-style hidden DDA ladder, which already starts with the pity mask. Add opt-in
   mastery layers: Platinum Tags, no-hit boss medals and Smog Remixes.
6. **Box Gauntlets (section 6.5).**
   - Timing-only stretches where the only way across is jumping on boxes at the right moment: blinking
     boxes, bounce chains, falling boxes, sliding boxes, arrow relays.
   - Every new level has at least two, and the last section before its gate is one.
   - Three standalone Box Gauntlet stages (G1–G3), like Crash 4's Flashback Tapes, open with a Polaroid
     that only a no-death run can pick up.
7. **Fix the levels that can't be 100%'d (`docs/expansion/golden-bone-audit.md`).**
   - Scratchpost Canyon's last checkpoint segment and four spots in Roomba Rush are impossible today.
   - The fixes are checked by simulation, and new tests stop it happening again.
8. **Later (section 8):** a roadmap of further levels, a mini-boss and a boss rush, all built from the
   same kit.

---

### 1. Where NOBU stands (audit)

| Area | Now | Notes |
| --- | --- | --- |
| Main levels | 3 (Bark Jungle 322 m, Scratchpost Canyon 316 m chase, Cone Factory 252 m) | Each runs on a spline track with forks and alcoves. |
| Bonus stages | 2 (Roomba Rush ride, Glowworm Grotto dark level) | Unlocked by bosses; they have no boss. |
| Bosses | Mecha Bird (6 HP, 2 per stage), Big Cat (6, 2), Evil Cone (9, 3) | Each has 3 evolving stages, an ultimate that recharges faster each stage and per-stage speed multipliers (1.0 / 1.2 / 1.4). |
| Boss rewards | Tail Glide, Zoomies, Mega Bark | Replaying old levels with these moves opens Bark Rocks. This is the only backtracking loop so far. |
| Per-level goals | Golden Bone (all backpacks + all dogs), Good Boy Route (L1, L3), colored bones (red, blue), trial dog tags | No hidden-collectible goal and no goal for low deaths. |
| Difficulty aids | 4 lives; pity mask after 3 deaths at a checkpoint; 100 Tickets = 1UP; God Mode | Difficulty numbers are hard-coded in each entity or boss file. |
| Juice | Missed-backpack rain, boss evolve cinematics, banners | No count-up tally at the end of a level and no combo feedback. |
| Meta | Wardrobe (hub Relics), hub trial board, Tickets | **Tickets are the hub's economy.** Ticket sources are scaled (×1/3), capped and server-limited (`src/config/tickets.js`, `level_end` max 20 per call). |

**Main gaps from a gameplay view:**

- After the credits there is little to chase: 3 bones, 3 trial tags and 2 colored bones.
- Level archetypes are thin: there is one chase, one ride and one dark level.
- Bosses follow fixed plans. Each stage adds attacks but never a new arena state, so the late stages feel
  like "the same, faster."
- There is no mastery tier above trial gold.
- Difficulty can't be checked in tests, because the numbers are spread across about 15 files.

**Hard constraints for every change below:**

- The Ticket economy can't be inflated. Every new pickup source goes through `config/tickets.js` and the
  earn and level-end tests.
- Hub trial boards only accept levels 1–3. The `NOBU_FLOOR_MS` check in
  `metaverse-hub/server/modules/src/leaderboard.ts` rejects variants `"4"` and `"5"`.
- Existing level ids (1, 2, 3) never change. Old saves and public trial boards are keyed on them.
- An open PR (crrreatorrr/nobu#18) is changing `src/gear/catalog.js` and `vendor/`. Don't touch those
  files until it merges.

---

### 2. Design pillars

1. **Always a next goal.** Every screen that ends a run (results, the map panel, the pause menu) names one
   concrete thing left to get, and roughly where it is. This follows Astro Bot's level-hover list and
   Crash's box counter.
2. **Completion and mastery are separate tracks.** Completion means bones, dogs and secrets; it is
   generous and has no time pressure. Mastery means Platinum Tags, no-hit medals and remixes; it is
   strict and opt-in. Neither track gates the story.
3. **Teach, test, twist, combine.** Each level introduces one new mechanic safely, tests it, twists it
   once, then combines it with an earlier one. Each boss stage adds **one** new thing.
4. **Help weaker players without changing the game for better ones.** This is Naughty Dog's DDA rule.
   Hidden help, never a difficulty menu, and it is always off in trials, remixes and medal runs.
5. **Rewards change how you play.** Prefer a move, a path or a mask over a number. Cosmetics are the
   reward for completionists, never stat boosts.
6. **Placeholders are first-class.** Every new asset id resolves to a working stand-in from day one
   (section 9).

---

### 3. Reward loops (the core of this plan)

#### 3.1 The loop stack

Nested loops follow Griesemer's "3 seconds inside 30 seconds inside 3 minutes," with the context varied
at each level.

| Loop | Length | Player action | Reward now | Reward added |
| --- | --- | --- | --- | --- |
| **Micro** | 1–5 s | jump, bite, break, stomp | crack and pop, Ticket | **Chomp Chain** counter and pitch-rising audio; a Blue Sphere at a chain of 8 (3.2) |
| **Cluster** | 15–45 s | clear a backpack cluster, a set piece or a secret | tickets, 1UPs | **Mystery Backpacks** (variable reward, 3.3); a "cluster clear" sting when every breakable in an authored group is broken |
| **Section** | 1–2 min, between checkpoints | survive a mechanic | Snacks checkpoint | Checkpoint banner shows `backpacks x/y` for the section just finished (from Crash 2's box counter) |
| **Level** | 4–8 min | finish | Golden Bone, dog count, missed-backpack rain | **Bone Board** of 6 bones (3.4), a **count-up tally** (3.7) and a **next-goal hint** (3.8) |
| **Chapter** | 30–60 min | beat a boss | a new move, a story beat, a bonus stage | Each move opens **move-gated secrets** in older levels (3.6); Chapter 2 opens (section 6) |
| **Meta** | hours | 100% | credits line | **Kennel** dog milestones (3.5), **Good Boy %** up to 200%, a secret ending, Platinum Tags, boss medals, Smog Remixes (4.5) |

#### 3.2 Chomp Chain (micro loop, skill reward)

- Breaking a breakable or defeating an enemy within **1.1 s** of the previous one adds 1 to the chain.
  Touching the ground for more than 1.1 s without breaking anything ends it. Bouncing up a stack keeps
  it going, as in Crash.
- Feedback: a small `x5` near the Tickets HUD, and the break sound rises a semitone per step (capped at
  +12). Small screen punches at 5 and 10.
- **Reward:** the first chain of 8 in each checkpoint section drops a Blue Sphere, the 3-masks mechanic
  players already know. A chain of 15 or more scores a hidden "Chain" line in the tally (3.7) and counts
  toward a cosmetic Kennel milestone.
- **No Ticket multiplier, on purpose.** Tickets are the hub economy; multiplying them would break the
  per-clear budget.
- **Code:**
  - `session.js`: a `chain` object, reset on death and on rollback.
  - The hook is wherever breakables and enemies already report breaks (`Breakable.break`, `Enemy.kill`).
  - The HUD element goes in `ui/ui.js`.
  - Turned off in trials so leaderboard times stay comparable. In a trial the counter shows, but no
    sphere drops.

#### 3.3 Mystery Backpack (variable-ratio reward, used sparingly)

- A Zipped Backpack variant with a "?" print (placeholder: the backpack texture with a procedural "?"
  decal). One bite opens it and rolls from a seeded table:

  | Result | Weight | Notes |
  | --- | --- | --- |
  | 3 Tickets | 40 | Counts inside the level's existing Ticket budget (see below). |
  | Blue Sphere | 25 | |
  | Cat (TNT) | 15 | Surprise: 3-2-1 hiss, run. Breaking it still counts. |
  | Trampoline | 10 | Springs up to a ledge authored above it, if the level has one. |
  | 1UP | 10 | |

- **Seeded per level and slot**, so a reroll can't be farmed by dying. Rollback restores the same result.
- **2–3 per level at most**, placed on side paths. The surprise should stay a treat.
- **Ticket budget:** `tests/level-budget.test.js` (new) sums the maximum possible Tickets per level and
  checks it against a per-level cap in `config/tickets.js`.
- Not placed in trials or remixes.

#### 3.4 Bone Board: six bones per level (level loop)

Based on Crash 4's six gems, which reviewers found the most motivating structure in the series. The board
**adds to** the existing Golden Bone; the save keeps `bones[]` as it is.

| Slot | Name | Condition | Track |
| --- | --- | --- | --- |
| 1 | **Golden Bone** | break every backpack and free every dog (exists) | completion |
| 2 | **Good Boy Bone** | clear the level (to the boss gate) with **≤ 3 deaths** | mastery-lite |
| 3 | **Hidden Bone** | find it: behind a secret, often gated by a move (3.6) | exploration |
| 4–6 | **Snack Bones** (bronze, silver, gold) | collect 40 / 60 / 80% of the level's Tickets in one run | completion |

- Separate from the board, and unchanged: colored bones, trial tags (plus the new **Platinum Tag**, 4.5)
  and Remix bones (4.5).
- Bones show **live in the pause menu**, with silhouettes for missing ones.
- Each slot is worth 1 Good Boy % point. The full formula is in 3.9.
- Bonus stages get a three-slot board: Golden, Good Boy and Hidden.
- **Code:**
  - `save.js` gets `boneBoard: { [levelId]: { golden, goodBoy, hidden, snack: 0|1|2|3 } }` in save `v: 3`.
  - Migration copies `bones[i]` into `boneBoard[i+1].golden`, and `tests/save-migrate.test.js` covers it.
  - The rules are pure functions in a new `src/game/bones.js`, unit-tested.

#### 3.5 The Kennel: rescued dogs as the meta loop

The game is about rescuing dogs, so the meta reward should show the dogs.

- A **Kennel** node on the map (placeholder: `level_map` with a fenced yard drawn in CSS).
- Every dog freed across all levels appears there using the existing `dog_*_free` GLBs and their dance
  clips. Players can see their progress.
- **Pack milestones** use the total number of dogs freed. All rewards are cosmetic or convenience, and
  all are off in trials and on boards:

  | Dogs | Unlock |
  | --- | --- |
  | 5 | Kennel jukebox: replay any music track from `audio/songs.js` |
  | 10 | **Buddy:** one freed dog follows Nobu through levels (cosmetic; reuses the dog GLB and walk clip) |
  | 15 | Fur tints for Nobu (a material tint on the GLB and the Classic primitives) |
  | 20 | Concept-art gallery (`concept_keyart`, `concept_environments`, story images; these already exist) |
  | 25 | **Sniffer:** a bark on the map lists the room or section of each missing Hidden Bone and dog (the anti-grind hint, after Astro Bot's radar bird) |
  | all | Golden Kennel cutscene and a Nobu dance on the title screen |

- With the extensions and the three new levels there are **54 dogs**:
  - L1 9, L2 7, L3 9.
  - Roomba Rush 4, Glowworm Grotto 4.
  - L4 7, L6 7, L5 7.
- The milestone thresholds above were drafted for a smaller game. The rewards spec spreads them over
  the 54, with the last one at all 54.

#### 3.6 Move-gated secrets (chapter loop and backtracking)

Crash 3 and Metroid-lite: every boss move unlocks something in levels you have already cleared. The
Bark Rocks already do this; extend it to every move.

| Move | From | Opens |
| --- | --- | --- |
| Tail Glide | Mecha Bird | Long glide gaps to floating alcoves (L2 and L3 get one each, holding a Hidden Bone) |
| Zoomies | Big Cat | **Zoomie Gates:** shutters that close a few seconds after a floor plate is hit; only sprint speed gets through (L1, L4) |
| Mega Bark | Evil Cone | Bark Rocks (exist), plus **Smog Vents** that the bark clears, revealing a lift (L4, L5) |
| **Dust Dash** (new) | Roomba Titan | **Dust Walls:** a short ground dash that breaks dust walls. Dust Walls are in L1, L2, L3 and L4; you see them before you can open them |
| **Moon Jump** (new) | Pump Queen | Hold jump 0.6 s for a charged jump of about 2.2× height. Opens Moon Ledges in every level, the last Hidden Bones and the secret-ending route |

- **Rule (from the Snow Biz mistake):** a level's **Golden Bone never needs a later move.** Only Hidden
  Bones and remix extras can be gated.
- **Signposting:** a gated object always looks gated. Dust Walls use a grey fuzz texture, Moon Ledges a
  lunar glow. The Sniffer hint names the move, so players know to come back.

#### 3.7 End-of-level tally (juice)

- Replace the static results panel with a sequenced count-up. Each line ticks with rising pitch:
  backpacks, then dogs, then Tickets, then Best Chain.
- Then the Bone Board slots stamp in one at a time, with a sound and screen shake for each new bone.
- Order: the missed-backpack rain, then the tally, then the board.
- New records flash ("NEW BEST CHAIN").
- Skippable with any button after the first time.
- **Code:** `game.js` in `updateComplete`, plus a tween helper. It reuses the stats the session already
  builds (`broken`, `dogsTotal` and others in `session.js` around line 396).

#### 3.8 Next-goal hint (closes the loop)

- After the tally, show **one** line: the closest missing goal.
- Each missing breakable records its `d`. The level declares named sections, `k.section(d0, d1, 'Lily
  Pond')`, so the hint can say "3 backpacks missed near **Lily Pond**." If only the Good Boy Bone is
  missing, the hint is "Good Boy Bone: 5 deaths, need ≤ 3."
- The map panel for the level shows the same hint and the bone silhouettes.

#### 3.9 Good Boy % (completion counter)

The counter is a percent with explicit weights, so 100% is reachable without mastery content.

- **The base 100% is the completion track:**
  - Story clears: 6 main levels × 4 = 24.
  - Bone Boards: 6 main levels × 6 slots = 36.
  - Bonus-stage boards: 2 × 3 = 6.
  - Colored bones: 5 (red, blue, green, yellow, purple).
  - Dogs: 1 point per 3 dogs, 54 / 3 = 18.
  - Kennel milestones: 6.
  - Total: 95 points, scaled to 100%. The rewards spec has the exact table.
- **Above 100% is the mastery track**, up to 200%: Platinum Tags, no-hit boss medals, Remix bones and the
  boss rush.
- Mastery points are **never needed for the story or the secret ending.** The secret ending needs 80%.

#### 3.10 Tickets: guardrails for every new source

- Every new Ticket pickup goes through `tickets.add` and `NOBU_TICKET_SCALE`.
- Per level, the max Tickets per clear is capped near the existing levels' max (measure L1 first and log
  it in this doc).
- New repeatable sources, such as coconut-like rollers in L4, reuse `COCONUT_CAP_PER_CLEAR`-style caps.
- No new Ticket sources in boss arenas beyond what the arenas already place.
- No Ticket rewards for bones or milestones. Those stay non-economic.

---

### 4. Difficulty

#### 4.1 Difficulty as data: `src/config/difficulty.js`

There is one tier table, plus multipliers for boss stages and bosses. Every entity reads its numbers from
here instead of literals. The numbers below are first passes, to be tuned in playtests (4.6).

```js
// Level tiers: 1 = Bark Jungle ... 5 = Pump & Dump. Bonus stages use the tier of the level before them.
export const LEVEL_TIER = { 1: 1, ride: 1.5, 2: 2, cave: 2.5, 3: 3, 4: 4, 6: 4.5, 5: 5 }; // 4.5 = halfway between rows
export const TIER = {
  enemySpeed:   [1.00, 1.08, 1.16, 1.24, 1.32],   // multiplier on each enemy's authored speed
  hazardPeriod: [1.00, 0.95, 0.90, 0.85, 0.80],   // hammers, crushers, flip planks (lower = faster)
  crumbleDelay: [0.60, 0.55, 0.50, 0.45, 0.40],   // seconds before a crumble platform drops
  snacksGap:    [70,   80,   90,   95,   100],    // target metres between checkpoints
};
// Boss ladder: each boss row is strictly harder than the row above; each stage harder than the stage before.
export const BOSS = {
  bird:  { hp: 6,  perStage: 2, speed: [1.00, 1.20, 1.40], window: [2.7, 2.4, 2.2], tele: [1.00, 0.88, 0.78], chain: [1, 1, 2] },
  cat:   { hp: 6,  perStage: 2, speed: [1.00, 1.20, 1.45], window: [2.8, 2.4, 2.0], tele: [0.95, 0.84, 0.74], chain: [1, 2, 2] },
  cone:  { hp: 9,  perStage: 3, speed: [1.00, 1.25, 1.50], window: [1.8, 1.4, 1.1], tele: [0.90, 0.80, 0.70], chain: [1, 2, 3] },
  titan: { hp: 9,  perStage: 3, speed: [1.15, 1.35, 1.55], window: [1.7, 1.35, 1.05], tele: [0.85, 0.76, 0.68], chain: [2, 2, 3] },
  queen: { hp: 12, perStage: 3, speed: [1.20, 1.40, 1.60, 1.70], window: [1.6, 1.3, 1.05, 0.95], tele: [0.82, 0.74, 0.66, 0.62], chain: [2, 3, 3, 4] },
};
export const FLOOR = { teleSec: 0.40, windowSec: 0.90 }; // fairness floor: never below these
```

- `window` is the punish window in seconds: the time the boss is dizzy, tired or overheated.
- `tele` scales the wind-up time.
- `chain` is how many attacks the boss strings together without a pause.
- For the bird, cat and cone, `hp`, `speed` and `window` are the numbers already in the code
  (`mechaBird.js:325`, `bigCat.js:469` and `:569`, `evilCone.js:163` and `:604`). Moving them to the
  table in M0 changes nothing.
- `tele` and `chain` are new. In M0 they are 1 for the three existing bosses. M2 switches on the values
  shown above, together with the new powers.
- **`tests/difficulty.test.js`** checks:
  - Speed and chain never go down from one stage to the next.
  - Window and tele never go up from one stage to the next.
  - Each boss's stage 1 is at least as hard as the previous boss's stage 1, by every one of those
    measures.
  - Nothing is below `FLOOR`.

  This makes the request to get harder with each stage and with each new boss a test that can fail, not
  just a goal.

#### 4.2 Fairness rules for bosses

- Every attack has an animation tell of at least `FLOOR.teleSec`. Keep the house rule: **no on-screen
  timers.**
- Each stage adds **one** new power and **one** arena change. Never two new things at once.
- There is always a reachable safe spot during any attack, including the ultimate. An arena test helper
  samples the floor while the ultimate runs (dev-only).
- After damage, Nobu gets i-frames before the boss chains another attack: a chain never continues within
  0.5 s of a hit.
- Phase checkpoints already exist (`Boss` restarts the current phase on death); keep them for the new
  bosses.

#### 4.3 Hidden DDA ladder (extends the pity mask)

This follows Jason Rubin's account of Crash: help players who die a lot without changing the game for
those who don't. Counters are per checkpoint (`session.deathsAtCp`); the boss counter is per boss stage.

| Deaths here | Help (silent) |
| --- | --- |
| 3 | Pity mask on respawn (**exists**) |
| 5 | Hazards in this section run 8% slower (chasers, rollers, crusher periods), applied through `TIER` |
| 7 | A **pity checkpoint** activates: an authored `k.pitySnacks(d)` spot halfway through the section turns into a Snacks |
| 9 | Pity mask becomes 2 masks |
| Boss, 3 deaths in one stage | Telegraphs +15%, punish window +0.3 s, start with 1 mask |

- **Off in:** time trials, Smog Remixes, boss medal runs and the boss rush, plus any run that posts to a
  board.
- DDA never touches bones. The Good Boy Bone already rewards low deaths.
- `tests/dda.test.js` covers the ladder as a pure function, `ddaFor(deathsAtCp, context)`.

#### 4.4 Difficulty curve across the game

Target median **first-play deaths** (the main level only, without the boss). These are tuning targets
for 4.6.

| Level | Tier | New mechanics introduced | Target deaths |
| --- | --- | --- | --- |
| 1 Bark Jungle | 1 | everything basic | 2–4 |
| 2 Scratchpost Canyon | 2 | the chase | 4–6 |
| 3 Cone Factory | 3 | conveyors, crushers, hammers, fan | 6–10 |
| 4 Laundry Day | 4 | spin drums, ziplines, toaster launchers, mid-level stampede, 2+ Box Gauntlets | 10–14 |
| 6 Smog Rapids | 4.5 | raft rides, whirlpools, rapids drops, on-foot landings, 2+ Box Gauntlets | 11–15 |
| 5 Pump & Dump | 5 | market platforms, Pump Pill stepping stones, rug-pull collapse, 2+ Box Gauntlets | 12–18 |

The new levels are deliberately harder than the jump in tier alone would make them:
- Tighter timing windows.
- Combined hazards in the second half.
- A Box Gauntlet as the final exam.
The hidden DDA still catches players who are stuck.

The extended L1–L3 keep their tier. Their target death counts rise about 30% with length, and the
last new section of each level is the hardest one.

#### 4.5 Mastery layers (opt-in, never gating)

- **Platinum Tag:** a fourth trial tier at about the dev-best time + 5%. It sits locally above gold;
  hub boards stay time-based. Add `TRIAL_TARGETS[level][3]` and a medal string `'platinum'`. Check
  `save.js` `sanitizeTrial` and the hub meta; the hub stores times, not medals.
- **Boss medals:** for each boss, `Clear` (exists), `No-Hit` (finish without taking damage, masks
  included) and `Speed` (under the target time). They are shown in a boss list on the map.
- **Smog Remixes** (Crash 4's N.Verted). Unlock after beating the Pump Queen. Each main level gets a remix
  version:
  - **Mirrored**, which is cheap because levels are authored in track coordinates: negate `x` and the
    turn of each `turtle` move.
  - A smog fog filter, enemies one tier higher and Freeze-Pack-style "smog clocks" removed.
  - Its own Golden Bone.
  - Build a `mirror` option in `makeTrack`/`makeKit` that flips `x` in `W()` and the turtle turns.
- **Perfect Run relic** (Crash 4's N.Sanely Perfect): every backpack and every dog with 0 deaths in one
  run. One per level; shown as a paw stamp on the map.

#### 4.6 Tuning tools (dev only)

- `dev.js` **death heatmap:** record `(level, d, x, cause)` for each death to `localStorage`, and add a
  `?heatmap` overlay that draws red dots on the track in dev builds.
- Section timer: log time per `k.section`, to see whether the 30-second and 3-minute rhythm holds.
- Playtest script: 3 first-time players per level, then compare median deaths with 4.4 and adjust `TIER`.

---

### 5. Dynamism: making levels feel alive

New building blocks, each made from existing kit pieces and assets. All of them are used in section 6.

| Block | What it does | Built from |
| --- | --- | --- |
| **Chase segment** (`k.chase(d0, d1, {model, speed})`) | A pursuer runs toward the camera for part of a level, not a whole level. | Generalise `ChaseCat` into `Chaser` with a model parameter. Camera `trackFront` already exists. |
| **Spin drum** | A ring of platforms orbiting the track axis, like a washing-machine drum | `MovingPlatform` with a circular path option |
| **Zipline** | Bite a line to hang, slide down, jump off | `RopeBridge` rope mesh; new `Zipline` entity |
| **Timed launcher** | Pops on a rhythm (toaster): ride it at the top of its cycle | `BouncePad` with `period` and `phase` |
| **Market platforms** | Many platforms share one global "chart" signal: green means rising, red means sinking, with an audio tell 1 beat ahead | `MovingPlatform` (axis `y`) driven by a shared clock |
| **Rug-pull collapse** | A run of crumble platforms triggered all at once from behind, so you must keep running | `CrumblePlatform` with a trigger chain |
| **Rising hazard** | Water, smog or suds rise behind or below for a vertical escape | `k.water()` with animated `y`; a death plane follows |
| **Dark section** | A short Lumi-lit stretch inside a normal level | `Glowworm` and `bonusCave` lighting, scoped to a `d` range |
| **Ambush** | Enemies drop in when you cross a line (a cluster with a cue) | Spawn on a trigger; existing enemies |
| **Living set piece** | Background events: the Titan's silhouette passes a window, the stock ticker scrolls | Decor and `stage` emitters |

Camera variety: add a **side-on** rail (`camera.setMode('side')`) for short 2.5D runs, and a
**rising** framing for climbs. Both are small additions next to the existing `track` and `trackFront`
modes.

---

### 6. New and extended levels

Sections 6.0–6.2 cover the two new levels (Chapter 2: "The Smog Returns"). Section 6.3 extends the
existing levels and bonus stages.

#### 6.0 Story and unlocks

- After the Evil Cone's credits, the smog creeps back over the island. The Sproto Mask traces it to the
  **Owner's House**, where the **Roomba Titan** is vacuuming up the freed dogs' collars and cones.
- Behind it is the **Pump Queen**, who pumped the Evil Cone up in the first place. Same $Bitcoin meme
  lore: pump.fun minions already exist.
- **Unlocks:**
  - Level 4 opens when the Evil Cone is beaten (`beaten[2]`).
  - Level 6 opens when the Titan is beaten.
  - Level 5 opens when Level 6 is cleared.
  - The secret ending needs the Pump Queen beaten **and** Good Boy % ≥ 80.
- **Ids:** the new levels are `4`, `5` and `6`. Level 6 is played between 4 and 5. Never renumber 1–3.
- **Map:** the map node list grows to `[1, 'ride', 2, 'cave', 3, 4, 6, 5, 'kennel']`. Placeholder: the same
  `level_map` image with three new pins on the right edge; the map scrolls or pages if needed.
- **Mega Bark is guaranteed** by then, so both levels can need it. The Wizard Hat's "bosses are skipped"
  rule applies to the new bosses too.
- **Trials:** L4, L6 and L5 trials run **locally** until metaverse-hub adds variants `"4"`, `"5"` and `"6"` to
  `NOBU_FLOOR_MS` and to `TRIAL_FLOOR_MS` in `config/trials.js` (section 10).

#### 6.1 Level 4: Laundry Day (Owner's House, about 480 m, tier 4)

The table below is the core route, about 300 m. `docs/expansion/new-levels-spec.md` adds one more
main-path section and two detours to reach about 480 m, and gives every placement.

- **Theme:** dog-scale giant house: rugs, furniture legs, cables, toy piles, a laundry room, a kitchen
  counter and basement stairs.
- **Signature mechanics:** spin drums, ziplines (clotheslines), toaster launchers, and a mid-level
  **Roomba Stampede** chase.
- **Art:** reuses the `house` theme from Roomba Rush, so the art direction is already set.

| Section (d, m) | Beat | Mechanics and placement | Rewards |
| --- | --- | --- | --- |
| **Hallway** 0–40 | Gentle start; teaches the Chomp Chain | A straight row of 8 backpacks with a mouse at the end, so a chain of 8 is easy and drops the first Blue Sphere. Rugs (Nitro), mice. | First Mystery Backpack on a side table (lunchbox steps). Dog 1 (corgi). |
| **Laundry room** 40–95 | **Teach and test the spin drum** | Drum 1: a slow ring of 4 platforms over a pit of suds (water). Drum 2: faster, with a crumble platform on the ring. Then **clothesline ziplines**: two short, one long over the drum. | A backpack cluster on the drum. Dog 2 (pug) at the top of the drum. Snacks at 92. |
| **Ironing board** 95–135 | **Twist** | A narrow board (2.6 m wide). The iron (`Crusher` turned horizontal) sweeps lengthwise; steam vents (`UpdraftFan` with a steam emitter) lift you over it. Lid Knights (pot lids). | **Good Boy Route:** golden paws under the board to a Hidden alcove. 1UP. |
| **Kitchen counter** 135–185 | Combine: launchers plus hazards | **Toaster launchers** on a rhythm up to the spice shelf; rolling oranges (`CoconutRoller`, tinted orange) down the counter; Shellbacks. A Cat (TNT) next to a backpack wall: a risk/reward chain. | The **Cookie Jar** bonus round: a `TreatTray` variant on the fridge top. Dog 3 (dalmatian). Snacks at 182. |
| **Roomba Stampede** 185–245 | **Set piece:** run toward the camera | `k.chase(185, 245, { model: 'model_mini_roomba', count: 3 })`. Three mini Roombas chase. Gaps, cables to jump and a toy-pile slalom. Foreshadows the boss. | Ticket line on the safe lane; a Zoomies shortcut through a **Zoomie Gate**. |
| **Basement stairs** 245–290 | Dark descent | A climb downward (negative `turtle` climb) into a **dark section** with Lumi. Crumble steps, a squirrel ambush. **A Dust Wall is visible** but can't be opened yet. It holds the Hidden Bone after the Titan. | Dog 4 (shiba) by Lumi's nest. Dog 5 (corgi) behind a Bark Rock. **Green colored bone** on a Smog Vent ledge (Mega Bark). |
| **Boss gate** 290–300 | | Snacks, the gate, a Titan cutscene. | |

- **Counts:**
  - About 45 breakables, including 2 Mystery Backpacks and 1 Zipped Backpack.
  - 5 dogs, 3 Snacks plus 2 pity spots.
  - Enemy mix: mice, Lid Knights, Shellbacks, squirrels, mini Roombas.
- **Trial targets (first pass):** gold 62 s, silver 78 s, bronze 100 s, platinum 56 s.
- **Green bone** opens a **green path** in L5 (and a short one in L1), extending the colored-bone loop.

#### 6.2 Level 5: Pump & Dump Pipeline (factory trading floor, about 460 m, tier 5)

The table below is the core route, about 280 m. `docs/expansion/new-levels-spec.md` adds one more
main-path section and two detours to reach about 460 m.

- **Theme:** the Cone Factory's back office, re-tinted magenta and green, with candle-chart neon,
  tickers, vats and pipes.
- **Signature mechanics:**
  - **Market platforms:** a shared green/red signal with an audio tell.
  - **Pump Pill stepping stones:** hop on a `PumpPill` to inflate it; it floats up as a temporary
    platform for 3 s, then dumps (pops). The enemy becomes a tool.
  - **Rug-pull collapse:** the floor falls away behind you.

| Section (d, m) | Beat | Mechanics and placement | Rewards |
| --- | --- | --- | --- |
| **Opening bell** 0–35 | Teach market platforms | Three market platforms over a shallow, **safe** pit (you land on a walkway); ticker signs show ▲/▼ one beat early. | Mystery Backpack. Dog 1. |
| **Pump field** 35–90 | **Teach Pump Pills** | Pills drift over a vat pit; hop pill to pill. Each hop pumps the pill up a step. Wait too long and it dumps under you. | Backpacks on the high route (pump a pill twice to reach). Snacks at 88. Dog 2. |
| **Smog Wave** 90–150 | **Set piece:** a chase toward the camera | A wall of cone-smog rolls after Nobu (`k.chase` with a fog-volume model). Market platforms on the run: green ones are safe to cross. | Zoomie Gate shortcut. Dog 3 on a Moon Ledge (post-game only; does not block the Golden Bone, because that dog is counted in the remix). |
| **Trading floor** 150–205 | **Combine** | Conveyors (from L3) carrying you under crushers **while** the market platforms move. Broccoli troopers and cone drones. A risk/reward Cat-and-Rug Nitro wall that a Vacuum Dock clears. | **Good Boy Route** (golden steps) to a 1UP and a ticket jackpot. Snacks at 202. Dog 4. |
| **Green Candle chimney** 205–245 | Vertical | Climb a candle shaft with fans and Tail Glide (rising framing); market platforms are the steps. **A Moon Ledge** at the top (post-game). | Hidden Bone (Moon Jump). **Yellow colored bone** (opens a yellow path in L2). |
| **The Rug Pull** 245–275 | **Final exam** | The floor collapses behind you (rug-pull chain) across Pump Pills and market platforms, ending in a Cat chain you must outrun. | Dog 5 at the end. |
| **Boss gate** 275–280 | | Snacks, the gate, the Queen's cutscene. | |

- **Counts:** about 50 breakables, 5 dogs and 3 Snacks plus 3 pity spots.
- **Trial targets (first pass):** gold 58 s, silver 72 s, bronze 95 s, platinum 52 s. The hub floor
  proposal is 13 000 ms.
- **The Golden Bone never needs Moon Jump.** Dog 3 must be on the main path in normal mode. Move the
  Moon Ledge dog to the remix if needed (rule from 3.6).

---

#### 6.3 Extending Levels 1–3 and both bonus stages

Levels 1–3 get about 70% longer and the bonus stages about 50%. Each stage gains **new sections on the
main path**, plus detours that leave the path and rejoin it: **two per main level** and **one per bonus
stage**. All of it is built from the same kit and the
placeholder assets.

| Stage | Length to the boss gate or goal, now → extended | New sections | Detour | New dogs | New breakables (approx.) |
| --- | --- | --- | --- | --- | --- |
| L1 Bark Jungle | 313 m → ~540 m | Canopy Walk, Coconut Run, + one more | The Burrow, + a second | +4 (5 → 9) | +30 |
| L2 Scratchpost Canyon | ~302 m → ~520 m | Switchbacks, Yarn Avalanche, Cardboard Fort breather, + one more | Cat Flap Alley, + a second | +4 (3 → 7) | +28 |
| L3 Cone Factory | 243 m → ~420 m | Packaging Line (2.5D), Vat Overflow, + one more | Maintenance Ducts, + a second | +4 (5 → 9) | +26 |
| Roomba Rush | 312 m → ~470 m | Kitchen Tile Slide, Dog-Door Leap, + one more | Living Room / Kitchen split | +2 (2 → 4) | +16 |
| Glowworm Grotto | 252 m → ~380 m | Crystal Echo, Underground River, + one more | one detour | +2 (2 → 4) | +16 |

- The tables below describe the sections chosen first.
- `docs/expansion/extended-levels-spec.md` designs the extra section and the second detour for each
  stage, and gives every placement and the final numbers.
- The new levels are planned at the same scale: L4 about 480 m, L6 about 450 m and L5 about 460 m. Later
  levels stay harder because of their tier, not because they are longer.

##### How a level is extended (the technique)

- **Main-path sections use splice points.** Each level gets one or two `SPLICE` distances. Everything
  authored after a splice moves later by `EXT` metres through an offset helper. Level 2 already authors
  this way with `D(d) = d + O`, so its change is the smallest.
  - **L1:** splice before the final fork at d 287, and once more after the coconut hill at d 240.
  - **L3:** splice after the hammer hall at d 136, and once more before the final stretch at d 206.
  - The new sections go into the gaps. More `turtle` moves extend the spline.
  - Appending control points can move the last ~20 m of the old spline slightly. Re-check the fork and
    gate area after the change.
- **Detours** use the same idea as the Treat Tray: content in the same stage at a different height. A
  pipe, burrow or flap moves Nobu to a short route built above or below the track, and a mushroom or
  lift returns him at a later `d`.
  - The Burrow grows out of the existing belly-flop pocket at L1 d 226, `y = -4.5`.
  - The others use new `k.detour(entryD, exitD, { y, build })` helpers.
  - Detours never sit on the trial route, so they can be as long as they need to be.
- **Rules for every extension:**
  - Teach, test, twist, combine (pillar 3). The **last new section before the gate is the hardest**: the
    level's final exam.
  - A Snacks checkpoint at least every `TIER.snacksGap` metres, plus a pity-checkpoint spot in each new
    section (4.3).
  - The Golden Bone never needs a later move (3.6). Move-gated objects only guard Hidden Bones.
  - **Bones already earned are never taken away.** A player whose Golden Bone came from the old layout
    keeps it. New breakables count toward the Golden Bone only for players who haven't earned it yet.
  - Every new Ticket source counts toward the per-level Ticket cap (3.10). The cap rises with length, and
    the owner signs off on it.

##### L1 Bark Jungle: two new sections and a detour (tier 1, so they stay gentle)

| Where | Section | Beats | Rewards |
| --- | --- | --- | --- |
| After coconut hill (new d 240–300) | **Canopy Walk** | **Teaches ziplines** before Level 4 tests them: vines between treetop platforms, first over low ground where a fall costs nothing, then over a pit. A squirrel **ambush** drops from the leaves. A Zoomie Gate on a branch (post-Cat). | Mystery Backpack on a branch. Dog 6 (pug) at a vine end. Snacks. A Moon Ledge above the canopy (post-game Hidden Bone). |
| Before the fork (new d 345–395) | **Coconut Run** | A **35–40 m giant-coconut chase** toward the camera (`k.chase` with `CoconutRoller` at 5× scale). It is a gentle first chase, the Crash 1 "Boulders" moment, and it sets up the Level 2 chase. Two lanes, one log and a backpack wall to bite through. | Ticket line on the safe lane. DDA slows the coconut after deaths (4.3), exactly as Crash did with the boulder. |
| Detour from d 226 | **The Burrow** | The belly-flop pocket becomes a 30 m tunnel under the coconut hill: dark (`k.dark`), Shellbacks and lunchbox steps. A Dust Wall at the end (post-Titan). | Dog 7 (dalmatian). The **Hidden Bone** behind the Dust Wall. |

##### L2 Scratchpost Canyon: chase extensions (tier 2)

| Where | Section | Beats | Rewards |
| --- | --- | --- | --- |
| After the crumbling bridge (new D 170–215) | **Switchbacks** | The canyon climbs in two tiers. The Big Cat **cuts the corner** by leaping between tiers, so it gains on you at every turn. Taking the inside line is the skill. Rug (Nitro) gaps in the backpack walls. | Dog 4 (corgi) on the inside line. Snacks at the top. |
| Before the last stretch (new D 290–335) | **Yarn Avalanche** | Giant yarn balls roll **toward** Nobu while the cat is still behind him: threats from both sides. Lanes are shown by the balls' shadows. Last section, so it's the hardest. | A Zipped Backpack in the safe lane. |
| Mid-chase | **Cardboard Fort** (a breather) | A 12 m cardboard box Nobu runs into. The cat's paw swipes through the flaps but can't reach. It pauses the chase without stopping it, and holds a Snacks. | Snacks, tickets and a Mystery Backpack. |
| Detour | **Cat Flap Alley** | A flap in the canyon wall leads to a narrow side alley **above** the chase, with small cats (Cat TNT) asleep along it: walk past or bite fast. It rejoins 40 m later, ahead of the Big Cat. | Dog 5 (shiba). The **Hidden Bone** (Tail Glide gap). |

The chase speed in `bigCat.js` (`ChaseCat`) has to be retuned for the longer run, and checked with the
DDA slow-down.

##### L3 Cone Factory: hard extensions (tier 3)

| Where | Section | Beats | Rewards |
| --- | --- | --- | --- |
| After the hammer hall (new d 136–185) | **Packaging Line** | A **2.5D side-on run** (`camera.setMode('side')`): conveyors, cone-stamping presses (`Crusher`), and boxes riding the belt as moving steps. It previews the side-on idea from the roadmap. | Dog 6 (pug) in a box on the belt. Snacks. |
| Before the final stretch (new d 255–305) | **Vat Overflow** | Hitting the Bone Switch **raises the vat liquid** (`k.rising`). Climb crane-hook platforms (`MovingPlatform`, axis `y`) faster than it rises. Drones harass you on the way up. The level's final exam. | 1UP at the top. Pity checkpoint halfway up. |
| Detour | **Maintenance Ducts** | Low pipes you must **slide** under to enter (an early move, so no gating). It is a short crawl with a fan lift, Pill Bots and a lint roller puzzle. | Dog 7 (corgi). The **Hidden Bone** behind a Smog Vent (Mega Bark). |

##### Bonus stages

- **Roomba Rush:**
  - **Kitchen Tile Slide:** a `slippery` floor, which the physics already supports, where steering
    carries momentum.
  - **Dog-Door Leap:** a ramp jump through the dog door to the goal.
  - **Split:** left through the living room (more backpacks, more cables) or right through the kitchen
    (faster, more cats). The two routes rejoin before the slide.
- **Glowworm Grotto:**
  - **Crystal Echo:** bite crystals to light them for 5 s. They act as stepping stones you can only see
    while lit. Bark isn't guaranteed this early, so it stays bite.
  - **Underground River:** moving rafts on a current.
  - +1 dog each.

##### What lengthening does to time trials and the hub boards

A longer level is slower to run. **Old public trial times become impossible to beat**, and medal targets
and hub floors become wrong. The plan:

- **Version the boards.** Extended levels post to new variants `"1v2"`, `"2v2"` and `"3v2"`.
  - The hub already keys the trial floor by the variant string (`variantFor` and `NOBU_FLOOR_MS` in
    `metaverse-hub/server/modules/src/leaderboard.ts`), so this is a data change there plus a
    re-vendor here.
  - The old variants stay as **"Classic" all-time boards**, read-only.
- **Save:**
  - `trials[level]` gains `layout: 2`.
  - Bests from layout 1 move to `trialsClassic[level]` and are shown on the map as "Classic best."
  - The score queue drops any layout-1 rows it hasn't sent yet. Unsent rows can't be posted to the
    new board.
  - `trials-bounds.test.js` and `score-queue.test.js` get layout cases.
- **New targets (first pass, set from dev-best runs before release):**

  | Level | Gold / Silver / Bronze (s) | Platinum (s) | Proposed hub floor (ms) |
  | --- | --- | --- | --- |
  | L1 | 94 / 119 / 155 | 86 | 25000 |
  | L2 | 89 / 114 / 154 | 82 | 25000 |
  | L3 | 77 / 98 / 132 | 70 | 20000 |

  These are the old targets scaled by the length ratio. The extended-levels spec replaces them with
  numbers measured from dev-best runs.

- **Order:**
  1. The hub PR adds the `v2` variants.
  2. Then NOBU ships the extended levels.
  3. Until the hub is live, extended trials stay local (like L4 and L5).
- **Alternative (not recommended):** keep the trial route the same length and put all new content in
  detours. Old boards stay valid, but the main path doesn't actually get longer, which is not what was
  asked.

#### 6.4 Level 6: Smog Rapids (river, about 450 m, tier 4.5)

The full authoring spec is `docs/expansion/level6-spec.md`.

- **Where it sits:** played between Level 4 and Level 5. It unlocks when the Roomba Titan is beaten;
  clearing it unlocks Level 5.
- **Story:** the smog pours out of the Owner's House drains into the river that runs down to the Pump &
  Dump Pipeline. Nobu rides it downstream.
- **Archetype:** a mixed river level, like Crash's jet-ski levels:
  - **Raft rides:** auto-forward on the current; steer and hop. A new `k.raft(d0, d1, {...})` helper
    built from the Roomba Rush ride controller. The placeholder raft is an existing asset; the level6
    spec picks which.
  - **On-foot landings** between the rides, for platforming, dogs and backpacks.
- **Water hazards:**
  - Whirlpools (the vortex code from the Evil Cone).
  - Rapids drops, floating logs, smog slicks.
  - Drain-pipe outflows that push the raft sideways.
  - Rolling barrels (`CoconutRoller`).
- **No boss:** the level ends at a goal, like the bonus stages. It is still a full main level, with a
  six-bone Bone Board, 7 dogs, two detours, a Good Boy Route, a Hidden Bone and 2–3 Mystery Backpacks.
- **Colored bone:** the **purple bone** is found here and opens a purple path in an earlier level (the
  level6 spec says which).
- **Trial:** local only until the hub adds variant `"6"`.

#### 6.5 Box Gauntlets

The full spec is `docs/expansion/box-gauntlets-spec.md`.

- **What they are:** stretches where the only way through is timing jumps on boxes correctly. There is
  no side route.
- **Box types:**
  - The existing ones: Backpack bounce, Trampoline, arrow Lunchbox, plain Lunchbox, crumble and flip
    platforms, a Rug (Nitro) on a stack, and the Cat (TNT) fuse.
  - New ones: `k.blinkBox` (phases in and out on a beat, with a tick 0.3 s before it vanishes),
    `k.bounceChain`, `k.fallBox`, `k.slideBox` and `k.arrowChain`.
- **Where they go:**
  - At least two in each of L4, L6 and L5.
  - The last new section of each extended L1–L3 is one.
  - L1 keeps long windows and a safe floor below.
- **Fairness:**
  - Each pattern is taught once over safe ground first.
  - The tightest timing window allowed per tier is listed in a table.
  - A pity checkpoint sits at each gauntlet start.
  - At 5 deaths, the hidden DDA stretches blink windows by 10%.
  - Every gauntlet backpack counts toward the Golden Bone, and the spec proves each can be broken in one
    clean pass.
- **Standalone Box Gauntlet stages G1–G3** (Crash 4 Flashback Tape style):
  - Each is a 120–180 m stage of pure box timing with no enemies.
  - Each opens with a **Polaroid** you can only pick up if you reach it without dying since the start of
    its level. G1 is in L1, G2 in L3 and G3 in L4.
  - Medals: clear, all boxes, no deaths.
  - Rewards: Kennel cosmetics and mastery points.

---

### 7. Bosses: more powers per stage, harder with each boss

#### 7.1 The ladder

| Order | Boss | HP / per stage | Stages | Punish window (s) | Signature lesson | Reward move |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Mecha Bird | 6 / 2 | 3 | 2.7 → 2.2 | watch the sky, punish dives | Tail Glide |
| 2 | Big Cat | 6 / 2 | 3 | 2.8 → 2.0 | read crouches, punish misses | Zoomies |
| 3 | Evil Cone | 9 / 3 | 3 | 1.8 → 1.1 | survive patterns, punish overheat | Mega Bark |
| 4 | **Roomba Titan** (new) | 9 / 3 | 3 | 1.7 → 1.05 | use the arena against it | **Dust Dash** |
| 5 | **Pump Queen** (new, true final) | 12 / 3 | **4** | 1.6 → 0.95 | everything at once | **Moon Jump** |

**Within each fight**, every stage adds:

- **1 new power.**
- **1 arena change**, a new hazard state.
- An **ultimate upgrade**: the gauge already refills faster each stage (26 / 20 / 15 s); now the
  ultimate also gains a part each stage.
- More chaining: from stage 2 the boss strings attacks together (`chain` in 4.1).

#### 7.2 Mecha Bird (tier 1): new powers

The existing attack plans are in `mechaBird.js:217-219`. New states are added to those plans.

| Stage | Existing | **New power** | **Arena change** | Ultimate (Sky Fall) |
| --- | --- | --- | --- | --- |
| 1 | dive (beak sticks: vulnerable), wing gust | **Perch Peck:** it lands on a palm and pecks coconuts loose; they roll across the arena in lanes (`CoconutRoller` in arena mode). Teaches lane reading. | Two palms at the arena edge become perches. | 3 waves of cone drops (exists) |
| 2 Overclocked | feather volley, visor laser, tired (vulnerable) | **Cage Drop:** it drops its swinging cage on Nobu's shadow (marker tell, 0.9 s × tele). If caught, Nobu is trapped 1.2 s: mash bite to break out, or slide to escape early. The cage then stays as cover from lasers. | **Wind lanes:** two gust strips cross the arena and push Nobu (UpdraftFan particles, laid flat). | Adds a laser sweep between waves |
| 3 Hyper Mecha | homing rockets, egg bombs, cone drops | **Drone Escort:** two `cone_drone`s orbit the bird and shoot when it dives. Bite a drone and it drops a Blue Sphere (a reward for aggression). **Chain:** the laser goes straight into a volley with no gap. | Egg-bomb craters stay as small pits for 6 s. | 4 waves; homing rockets follow the last wave |

#### 7.3 Big Cat (tier 2): new powers

The attack pool is in `bigCat.js:766-768`.

| Stage | Existing | **New power** | **Arena change** | Ultimate (Nine Lives Frenzy) |
| --- | --- | --- | --- | --- |
| 1 | pounce (miss: dizzy), swipes, hairballs, yarn | **Laser Pointer:** a red dot zigzags across the floor and the cat pounces on it twice, a moving tell. If the dot leads it into the arena wall, it gets **dizzy for longer** (+0.6 s). Smart positioning is rewarded. | none (stage 1 stays readable) | 4 pounces (exists) |
| 2 Feral | claw slash, tail spin | **Knock It Off the Table:** it leaps onto a ledge at the arena edge and bats objects off it (backpacks, which are free to break, and the occasional Cat (TNT)); their shadows show where they land. **Scratch marks:** claw slashes leave damaging scratch lines on the floor for 3 s. | Two raised ledges rise at the arena edge (`StaticPlatform`). | Each landing leaves a scratch star |
| 3 Nine Lives | zoomies (collapses, dizzy) | **Ghost Lives:** each hit in stage 3 releases a translucent ghost cat (the `small_cat` model, tinted) that repeats the cat's **last pounce** 1.5 s later. Reading its own replay is the skill. **Catnip** (risk/reward): a catnip bush spawns; if Nobu bites it, the cat goes wild for 8 s, 25% faster but with a 2× dizzy window. | The floor edges crumble (a ring of crumble tiles), so the arena shrinks. | 5 pounces; ghost lives copy the final pounce |

#### 7.4 Evil Cone (tier 3): new powers

The attack plans are in `evilCone.js:237-241`.

| Stage | Existing | **New power** | **Arena change** | Ultimate (Shame Supernova) |
| --- | --- | --- | --- | --- |
| 1 | barrage, shock, spiral, drops, overheat (vulnerable), pump.fun minions | **Cone of Shame:** a slow homing cone that, if it hits, **cones Nobu**. He can't bite for 3 s and his camera narrows (vignette) until he belly-flops or double-jumps to shake it off. It is dodgeable, readable and on-theme. | none | spokes plus cone rain (exists) |
| 2 Cracked | sweep, lasers, grab, vortex | **Rug Pull:** floor tiles shimmer (the rug texture) and then flip away in patterns; they come back 2 s later. This connects to the Rug Nitro players already know. | A tile grid is laid over the arena floor. | Spokes rotate both ways |
| 3 Supernova | ghost clones, everything | **Smog Tide:** smog floods the floor for 4 s; only raised pedestals are safe, and the Cone fires lasers while you're on them. **Chain of 3:** vortex → grab → spiral without a pause. | 4 pedestals rise for the tide. | Supernova plus Smog Tide together, with 2 safe pedestals |

#### 7.5 Roomba Titan (tier 4, new boss)

- **Placeholder:** `model_vacuum` at 4.5× scale, dark grey tint, with a procedural LED ring and a glowing
  "bumper button" on top. The 2D `vacuum` image is its portrait.
- **Arena:** the living room at dog scale. Furniture legs at the corners, a rug in the middle, a wall
  socket.
- **The core idea:** it can't be hurt directly. You make it crash, then **belly-flop its top button**.
  That is the punish window.
- **Code:** `src/bosses/roombaTitan.js` extends `Boss`. Reuse `Projectiles`, `Beam`, `evolve()`, the
  vortex logic from `evilCone.js`, the dash-to-target logic from the Big Cat's zoomies, and `autorig` (it
  has few joints: brushes and bumper).

| Stage | Name | **Powers** | **Arena change** | Punish |
| --- | --- | --- | --- | --- |
| 1 | **Auto Mode** | **Grid Clean:** straight-line charges along cleaning lanes, shown as a pale floor projection (the tell). If it hits a wall it is stunned and **the button is exposed** (window 1.7 s). **Side Brushes:** a spinning hitbox; get too close and you're swept. **Cable Whip:** it drags a power cable across the arena (a `FloorCable` sweep); jump it. | Furniture legs act as pillars it can hit. | Belly-flop the button |
| 2 | **Deep Clean** | **Mini-Roomba swarm:** 3 `Vacuum` enemies herd Nobu toward the Titan. **Suction:** a vortex pulls Nobu in (the Shame Vortex code); **Mega Bark** pushes him free and stuns the Titan for 0.8 s (the move check). **Chain of 2:** charge, then turn and charge again. | The central rug becomes a **conveyor** that rotates direction every 6 s. | Belly-flop, now 1.35 s |
| 3 | **Overheat Protocol** | **Lights Out:** the dust cloud blacks out the arena; only the Titan's LEDs and Lumi's glow show (the Grotto callback, reusing its lighting). **Leg Stomp:** furniture legs fall from above, with shadow tells (`FurnitureLeg` as a falling crusher). **No wall stop:** charges bounce off walls, so you lure it into one of 3 **Cat (TNT)** placed around the arena to stun it. | Cat (TNT) respawn points; darkness | Belly-flop, now 1.05 s |
| Ult | **Total Vacuum** | The walls close in about 25%, and it spins at the centre throwing debris in spirals. Survive 6 s; the walls then reset. Each stage adds a debris ring. | | |

**Reward: Dust Dash.** Slide, then press bite during the slide for a short burst dash that breaks Dust
Walls and knocks over armoured enemies (Lid Knights).

#### 7.6 The Pump Queen (tier 5, new true final boss)

- **Placeholder:** `model_pill_bot` at 5× scale, magenta tint, wearing **`model_nobu_champions_crown`**
  at 4× as her crown. Portrait: the 2D `pill_bot` image tinted.
- **Arena:** a ring of **candle pillars**: market platforms around a pit. The floor is the chart.
- **The core idea:** her weak point is only reachable at the top of a "pump." You climb the market and her
  own minions to reach her. **Every reward move is tested:** glide, zoomies, bark and Dust Dash.
- **Code:**
  - `src/bosses/pumpQueen.js` extends `Boss`.
  - She needs **4 stages**, so the stage parts and `evolve()` must support `n = 4`. Generalise
    `chargeTimes` and `stageNames` in `common.js`.

| Stage | Name | **Powers** | **Arena change** | How to hit her |
| --- | --- | --- | --- | --- |
| 1 | **Launch** | **Mint:** she spawns pump.fun minions in sets of 3. **Pump:** she inflates and floats up; candles rise in a wave. Bounce off pumped minions to reach her. | Pillars rise and fall slowly (green/red tell). | Bite the crown at the top of a pump (window 1.6 s) |
| 2 | **Hype** | **FOMO Beam:** a tractor beam pulls Nobu toward the pit edge; **Tail Glide** or **Zoomies** gets you out. **Airdrop:** crates parachute in; the tell shows which are Blue Spheres and which are Cats (TNT). Chain of 3. | Pillars move faster; 2 pillars are always red, which means they sink. | Same, 1.3 s |
| 3 | **Bubble** | **Bubble Shield:** after each pump she sits inside a bubble. **Mega Bark** pops it, then you bite. **Candle Crash:** a lane of pillars drops all at once (a red ripple tell). | The pit edge crumbles; the arena is only pillars now. | Bark, then bite, 1.05 s |
| 4 | **Rug Pull** (desperation) | **Liquidation:** pillars fall one after another in a spiral. Only the "last green" pillar is safe, shown in a different colour. **Dust Dash** across her **dump wake** (a moving shockwave line) to reach her. All earlier powers return, chain of 4. | Total collapse cycles every 10 s. | Dust Dash into her, then bite, 0.95 s |
| Ult | **Market Crash** | Every pillar goes red and plunges; one rises green. Reach it. Each stage adds a decoy green that sinks late. | | |

**Rewards:**

- **Moon Jump**, which opens Moon Ledges in every level (3.6).
- The **true ending** at Good Boy % ≥ 80.
- **Smog Remixes** and the **Boss Rush** (8).

#### 7.7 Shared boss-system work (`common.js`)

- Read `BOSS[key]` from `config/difficulty.js` for HP, per-stage hits, speed, window, tele and chain.
  Replace the literals that are there now. The bird, cat and cone values must match today's play exactly
  before any tuning.
- Add a `chain` runner: run N attacks back to back, respecting the 0.5 s after-hit grace.
- Allow 4 stages for evolution: `makeStageParts()` with `{2, 3, 4}`.
- **Medal tracking:** take no damage for No-Hit, and time the fight for Speed. Results go to save
  `bossMedals`.
- Boss DDA hook (4.3).

---

### 8. Longer roadmap (after the two levels)

These are archetype levels built from the same kit. Order them by cost and how much they add.

| Idea | Archetype (Crash parallel) | Reuse |
| --- | --- | --- |
| **Coconut Run** | Boulder chase (Boulders) | `Chaser` with a giant coconut; the L1 theme |
| **Lily Rapids** | Water ride (Hang Eight) | Water, lily pads, the Roomba ride controller on a raft |
| **Yarn Peaks** | Vertical climb (Road to Ruin) | Turtle climb, fans, yarn balls rolling down |
| **Assembly Line** | 2.5D side-on section (Flashback tapes) | The side camera, conveyors and crushers; a crate-puzzle level |
| **Bath Time Flood** | Rising water (Tomb Wader) | The rising-hazard block |
| **Squirrel Bros** mini-boss | Two coordinated bosses (Komodo Bros) | The `squirrel` model ×2.5, two of them |
| **Boss Rush: Cone Gauntlet** | Refights (N. Sane boss portal) | All 5 bosses back to back, no DDA, medals |
| **Smog Remixes** | N.Verted | The mirror option plus a filter (4.5) |
| **Walkies Challenge** | Rayman-style daily challenge | A seeded daily rule on an existing level, ranked by percentile; needs a hub board, so it is a cross-repo item |

---

### 9. Placeholders: reuse now, replace later

#### 9.1 How it works

- Add `src/art/placeholders.js`, a map from each **new** asset id to `{ from: existingId, scale, tint,
  rot, extra }`.
- `Assets` tries the new id first. If the manifest has no entry or the file is missing, it loads `from`
  and applies the transform.
- This copies how wardrobe items already work: the GLB is used if present, the procedural mesh
  otherwise.
- **To replace an asset later:**
  1. Generate it with the Higgsfield workflow (`docs/higgsfield-workflow-guide.md`, the rigged 3D
     character workflow for this repo).
  2. Add the manifest entry under the new id.
  3. Delete the placeholder line. No game code changes.

#### 9.2 Placeholder table

| New id | Used for | Placeholder from | Transform |
| --- | --- | --- | --- |
| `model_roomba_titan` | Boss 4 | `model_vacuum` | ×4.5, tint #3a3d44, procedural LED ring + bumper button |
| `model_mini_roomba` | L4 chase, Titan adds | `model_vacuum` | ×1.4 |
| `model_pump_queen` | Boss 5 | `model_pill_bot` | ×5, tint #d23cff, crown = `model_nobu_champions_crown` ×4 |
| `model_candle_bot` | L5 enemy variant | `model_pill_bot` | tint green / red |
| `model_ghost_cat` | Big Cat stage 3 | `model_small_cat` | ×1.6, translucent cyan |
| `model_dust_bunny` | L4 enemy (patrols, splits in two when bitten) | `model_mouse` | ×1.3, grey, fuzz particles |
| `portrait_titan` / `portrait_queen` | Boss UI | `vacuum` / `pill_bot` 2D images | CSS tint |
| `bg_level4` / `bg_boss4` | Sky and backdrop | the house theme backgrounds (procedural) | |
| `bg_level5` / `bg_boss5` | | `bg_level3` / `bg_boss3` | hue shift to magenta |
| `tex_l4_*` | Floors and walls | `art/procedural.js` house textures | |
| `tex_l5_*` | | `tex_l3_*` | hue shift |
| `story_ch2_*` | Chapter 2 cutscenes | `story_rescue_*`, `story_ending` | |
| Mystery Backpack print | Breakable | `backpack` texture | procedural "?" decal |
| Dust Wall, Moon Ledge, Smog Vent, Zipline, Spin Drum, Toaster | Props | procedural (`toon` materials) | |
| Music `level4`, `level5`, `boss4`, `boss5` | Songs | `audio/songs.js` (synth) | new patterns, no assets |

---

### 10. Technical plan

#### 10.1 Phase 0 groundwork

These refactors come first. None of them changes behaviour.

1. **Level registry** (`src/levels/registry.js`): move `LEVELS` out of `session.js` and `MAP_NODES`,
   `MAP_ORDER` and `BONUS_AFTER` out of `game.js`. Each entry holds `{ id, name, build, arena, Boss,
   tier, unlock(save), mapPos, trial }`.
2. **Save v3** (`core/save.js`):
   - `beaten`, `bones` and `bestDogs` become keyed by level id, so they no longer assume exactly 3
     levels. `bools3` is replaced.
   - New fields: `boneBoard`, `bossMedals`, `dogsFreed` (a set of `level:dogIndex`), `kennel`,
     `remix`, `moves` (derived, not stored).
   - Migrating v2 → v3 is lossless. The `.corrupt` backup stays.
   - Tests: `save-migrate.test.js` and an update to `multitab.test.js`.
3. **`config/difficulty.js`** plus `difficulty.test.js` (4.1). Port the existing literals over and check
   that play is unchanged (same numbers).
4. **`art/placeholders.js`** plus the fallback in `art/assets.js` (9.1).
5. **Kit additions:** `k.section`, `k.chase`, `k.pitySnacks`, `k.mystery`, `k.dustWall`, `k.moonLedge`,
   `k.smogVent`, `k.zipline`, `k.spinDrum`, `k.toaster`, `k.market`, `k.rugPull`, `k.rising`,
   `k.dark(d0, d1)`, and a `mirror` option in `makeTrack`.
6. **Dev tools:** the death heatmap and section timers (4.6).

#### 10.2 Cross-repo dependencies (metaverse-hub)

- **Trial boards for levels 4, 5 and 6:**
  - Add `"4"`, `"5"` and `"6"` to `NOBU_FLOOR_MS` in `server/modules/src/leaderboard.ts`.
  - The floors scale with the longer levels; the level specs give the numbers.
  - Add them to the board variant list, then re-vendor `hub-sdk` here.
  - Until then, `TRIAL_LEVELS` stays `[1, 2, 3]`, so L4, L5 and L6 trials are local only and never queued
    for upload.
- **Versioned boards for the extended L1–L3 (6.3):**
  - Add `"1v2"`, `"2v2"` and `"3v2"` to `NOBU_FLOOR_MS`.
  - `variantFor` already accepts any string key that is in that table.
  - NOBU sends `meta.level` as `"1v2"` and so on for layout-2 runs.
  - The old variants stay readable as "Classic."
- **Ticket earn:** `level_end` carries `meta.level` as a string. Confirm that the hub's `level_end` rule
  doesn't allow-list level ids before L4/L5 earns go live. Nothing seen in `leaderboard.ts` suggests it
  does, but check `schema.ts` rules.
- These are owner-run deploys. Follow the deploy order in `handoff.md`: hub first.

#### 10.3 Tests to add

These run under `npm test` (Vitest, pure logic only).

| Test | Checks |
| --- | --- |
| `difficulty.test.js` | Stage and boss order of difficulty, plus the fairness floors |
| `bones.test.js` | Each Bone Board rule, Snack thresholds and the Good Boy death limit |
| `good-boy-percent.test.js` | Weights add to 100 for the base track and 200 with mastery; the secret ending's 80% check |
| `dda.test.js` | The ladder at 0, 3, 5, 7 and 9 deaths; off in trial, remix and medal contexts |
| `mystery.test.js` | Seeded rolls are the same across rollback; the weights |
| `level-budget.test.js` | Max Tickets per level stays at or under the cap (with Mystery Backpacks counted) |
| `save-migrate.test.js` | v2 to v3 keeps everything; trial bests untouched |
| `trial-layout.test.js` | Layout-1 bests move to `trialsClassic`; unsent layout-1 queue rows are dropped; layout-2 runs post to the `v2` variants with the new floors |
| `bone-keep.test.js` | A Golden Bone earned on layout 1 survives the extension; new breakables only count for players who haven't earned it yet |
| `registry.test.js` | Unlock chain 1 → … → 5; ids 1–3 unchanged; bonus unlocks unchanged |

Also run the existing `npm test` and `npm run build`. In-browser checks need manual playtests: there is
no headless WebGL harness in this repo.

---

### 11. Milestones

Each milestone is one PR from a `claude/<slug>` branch, reviewed by a different agent per `AGENTS.md`.

| # | Milestone | Contents | Done when |
| --- | --- | --- | --- |
| M0 | **Groundwork** | 10.1 items 1–6 | All existing tests pass, the new tests pass, play is unchanged in a manual run of L1–L3 and both bonus stages |
| M1 | **Reward loops** | Chomp Chain, Bone Board, tally, next-goal hint, Mystery Backpacks (2 in L1–L3), Good Boy % | The board shows for L1–L3; the tally plays; the budget test passes |
| M2 | **Boss powers** | 7.2–7.4 new powers and arena changes for the Bird, Cat and Cone; `chain` runner; medals; boss DDA | The difficulty test passes; each new power is playtested once per stage |
| M2b | **Extended L1–L3 + bonus stages** | 6.3 splice points, new sections, detours, +dogs, retuned chase speed, layout-2 trial targets | Each stage playtested start to finish; old Golden Bones kept; extended trials stay local until the hub `v2` variants are live |
| M2c | **Golden Bone fixes + Box Gauntlets** | the audit fixes for L2 and Roomba Rush with their tests; the box helpers; G1–G3 | `chase-budget` and `ride-reach` tests pass; L2 and Roomba Rush 100%-able in a playtest |
| M3 | **Level 4 + Roomba Titan** | 6.1, 7.5, Dust Dash, Dust Walls in L1–L4, green path | Story unlock works; median deaths on first play are near 4.4 |
| M3b | **Level 6 Smog Rapids** | 6.4, `k.raft`, purple bone and path | Unlock chain Titan → L6 → L5 works; the raft is playtested |
| M4 | **Level 5 + Pump Queen** | 6.2, 7.6, Moon Jump, Moon Ledges in every level, yellow path, true ending | Full playthrough in play order (1, 2, 3, 4, 6, 5); secret ending at 80% |
| M5 | **Kennel + mastery** | Kennel, milestones, Platinum Tags, Perfect Run, Smog Remixes, Boss Rush | The 200% track is complete |
| M6 | **Hub follow-up** | L4/L5/L6 trial boards and the `v2` variants for L1–L3 (needs the hub PR first) | Scores post for every level on the right board |

M1, M2 and M2b can run in parallel after M0, because they touch different files (session/UI, bosses
and level files). M3 needs all three, because L1's Canopy Walk teaches the ziplines that L4 tests.

---

### 12. Risks and open questions for the owner

1. **Chapter 2 placement.** This plan puts L4 and L5 **after** the Evil Cone, so the new bosses are
   harder, as asked, and the credits become a mid-point. The other option is to insert them between
   L2 and L3. That keeps the Cone as the finale, but it would mean making the Titan easier than the
   Cone. **Recommendation: after.**
2. **Bone Board versus the current Golden Bone wording.** The existing text ("break everything + free
   every dog") stays correct. The ending line that says "Golden Bones still waiting" should change to
   point at the board.
3. **Good Boy Bone at ≤ 3 deaths.** This copies Crash 4. If it feels harsh for L5, allow ≤ 5 on tier
   5, but write that into the bones config so it shows on screen.
4. **Remixes double the count of things to collect.** Crash 4's 106% drew grind complaints. Remixes are
   mastery-only and outside the base 100%, so they don't add grind for completionists.
5. **Ticket budget.** The new levels add Ticket sources to the hub economy. The caps in 3.10 need the
   owner's sign-off on per-level maximums.
6. **Trial board reset for L1–L3.** Extending the levels means new boards (`v2`); the current public
   times become "Classic." Public scores launched recently, so tell players before it ships.
   **Recommendation:** version the boards, and show Classic bests on the map so nobody's record
   disappears.
7. **Pump Queen tone.** She is a satirical pump.fun caricature in keeping with the existing minions. Keep
   her fictional, with no real token names or people.

---

### Appendix: design references

From a research pass. Inspirations only; nothing is copied.

- **Crash Bandicoot DDA** (Jason Rubin, "Making Crash Bandicoot, part 6"):
  - After many deaths, an Aku Aku at the start of the section.
  - Chasers slowed a little after each death.
  - A fruit crate turned into a continue point after too many deaths.
  - "Help weaker players without changing the game for the better players."
  - https://all-things-andy-gavin.com/2011/02/07/making-crash-bandicoot-part-6/
- **Crash 4 gems:** 6 per level (Wumpa 40/60/80%, all crates, ≤ 3 deaths, hidden). Also N.Verted remixes,
  Flashback Tapes (reach them without dying), the N.Sanely Perfect relic, and the purple relic for beating
  the dev time. https://en.wikipedia.org/wiki/Crash_Bandicoot_4:_It%27s_About_Time ,
  https://support.activision.com/uk/en/crash-bandicoot-4/articles/crash-bandicoot-4-its-about-time-collectibles
- **Crash 2 and 3:** colored gems turn on paths in other levels. Death routes need a no-death run. Time
  relics come in Sapphire, Gold and Platinum, with Time Crates. Boss moves reopen old levels. The Snow
  Biz gem needs the late Red Gem; avoid that mistake.
  https://en.wikipedia.org/wiki/Crash_Bandicoot:_Warped , https://crashbandicoot.fandom.com/wiki/Death_Route
- **Classic Crash bosses:** 3 hits through one window (Papu Papu, Ripper Roo, Koala Kong). Hit the boss
  with something from the arena. Each cycle adds one hazard.
  https://www.crashmania.net/downloads/crash-bandicoot/crash-bandicoot-boss-guide.pdf
- **Boss pacing:** hit 1 teaches, hit 2 confirms, enrage, hit 3 tests mastery.
  https://www.gamedeveloper.com/design/building-better-bosses
- **Loops:** Griesemer's 3 s / 30 s / 3 min with varied context.
  https://www.engadget.com/2011-07-14-half-minute-halo-an-interview-with-jaime-griesemer.html
- **Reward schedules:** variable ratio for surprises only. https://www.gamedeveloper.com/design/behavioral-game-design
- **Juice:** https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-
- **Flow and player choice:** https://www.jenovachen.com/flowingames/p31-chen.pdf
- **Anti-grind and visible goals:**
  - Astro Bot's radar bird and level-hover list:
    https://www.powerpyx.com/astro-bot-100-walkthrough-all-bots-puzzle-pieces-secret-levels/
  - DKC puzzle pieces that persist between runs.
  - Celeste's optional strawberries and Assist Mode: https://www.vice.com/en/article/celeste-difficulty-assist-mode/
- **Remixed content:** Rayman Legends' Invasion levels and daily challenges ranked by percentile
  (https://www.raymanpc.com/wiki/en/Level_of_Awesomeness); Mario 64 and Odyssey's mission density
  (https://www.gamedeveloper.com/design/mario-64-v-odyssey).

---

# Part 2: Golden Bone audit

Source: `docs/expansion/golden-bone-audit.md`

## Golden Bone audit: can every breakable be broken?

Date 2026-11-04, `main` at `bfb4a33`. Asked by the owner: "some levels like the scratchpost canyon are
impossible to get all the boxes."

**Result:** confirmed for **Scratchpost Canyon** (L2) and **Roomba Rush**. Bark Jungle, the Cone Factory
and Glowworm Grotto have no breakable that can't be reached. The fixes below were checked with the same
models.

The models are in `tools/audit/`:

```bash
node tools/audit/chase-budget.mjs
```

```bash
node tools/audit/ride-reach.mjs
```

H31 and H33 port them into Vitest (`tests/chase-budget.test.js`, `tests/ride-reach.test.js`), with each
level's breakables exported as data. A level that breaks the rules then fails CI.

### What counts

- The Golden Bone needs every **countable** `Breakable` broken and every dog freed (`session.js`,
  `_recordLevelStats`).
- Countable: backpacks, Zipped Backpacks, Blue Spheres, 1UPs, Trampolines, Snacks, Cats (TNT), Rugs (Nitro),
  Lint Rollers and Vacuum Docks.
- **Not** countable: Bark Rock prizes, Good Boy Route and colored-path rewards, and Freeze Packs
  (`secrets.js` sets `countable = false`).
- Rugs are broken from a distance by the Lint Roller or Vacuum Dock, so touching one is never needed.
- Checkpoints keep everything broken before them. So the question is per **checkpoint segment**: can
  that stretch be cleared in one go?

### L2 Scratchpost Canyon (chase): impossible in the last segment

#### How the chase limits you

- From `ChaseCat.update` in `src/bosses/bigCat.js`:
  - The cat's target speed rubber-bands with the gap: 6.7 m/s under 5 m, up to 10.5 m/s.
  - At a gap under 2.4 m it kills Nobu with `die('flat')`. Masks don't save him.
- Nobu runs at 8.0 m/s, so at full run he leads by about **8.3 m**. Any stop uses that lead up.
- After a respawn the cat starts 13 m behind the checkpoint and waits 1.6 s. Each segment therefore
  starts with a big lead that shrinks as you run.
- What breaking needs (from `player.js`): a bite lasts 0.34 s and hits **everything** in range (0.95 m
  sphere, 0.75 m ahead). A slide rips a Zipped Backpack open in one go. A wall of 5 backpacks 1.8 m
  apart needs about 3 bites and 6 m of sideways moves: **1.5–2.0 s** standing still.

#### Budget per segment (largest stop that survives)

| Segment | Breakables that need a stop | Budget | Needs | Verdict |
| --- | --- | --- | --- | --- |
| A, start → Snacks D(97) | 5-pack wall D(29) | 2.68 s | 1.5–2.0 s | OK |
| B, D(97) → Snacks D(173) | 4-pack wall D(114) | 2.73 s | 1.2–1.6 s | OK |
| C, D(173) → gate | 2-stack D(246) | 1.01 s | 0.45–0.7 s | OK alone |
| C | 5-pack wall D(250), after the stack | **0.58 s** | 1.5–2.0 s | **Impossible** |
| C | 5-pack wall D(250), stack skipped | **0.94 s** | 1.5–2.0 s | **Impossible** |
| C | Zipped Backpack D(270), after both | **0.00 s** | 0.1–0.2 s (slide) | **Impossible** |

- Segment C is 130 m long. By the stack, the cat has closed to its steady gap, and the stack, the wall
  and the Zipped Backpack come one after another with no room to recover.
- The Mega Bark (from the Evil Cone) could clear the wall in one blast. That would make L2's Golden Bone
  need a move from a later level, which the plan forbids (3.6).

#### Fix (checked, margin at least 1.3×)

All edits are in `src/levels/level2.js`:

1. Add `k.snacks(0, 0, D(238))`. This gives a fourth checkpoint, so the cat restarts 13 m back.
2. Move `k.stack(-3.6, 0, D(246), 2)` to `D(242)`.
3. Change `packWall(250)` to `packWall(250, true)`, which leaves 4 backpacks and a gap in the middle.
4. Replace `k.zipped(-3, 0, D(270))` with `k.pack(-3, 0, D(270))`. Or move the Zipped Backpack into the
   Cardboard Fort breather that the extension adds (extended-levels spec).

| Stop after the fix | Budget | Needs | Margin |
| --- | --- | --- | --- |
| Stack D(242) | 2.97 s | 0.7 s | 4.2× |
| Gapped wall D(250) | 2.02 s | 1.6 s | 1.3× |
| Pack D(270) | 0.60 s | 0.1 s | 6.0× |
| Packs D(284), D(288) | 0.65 s | 0.3 s | 2.2× |

**Rule for every chase from now on** (the L2 extensions, Coconut Run, the Roomba Stampede, the Smog Wave):

- In each checkpoint segment, every required stop must fit in **at most 75%** of the simulated budget,
  counting the stops before it in the same segment.
- After any stop longer than 1 s, leave at least 25 m of clear running.
- `tests/chase-budget.test.js` enforces both rules.

### Roomba Rush (ride): 5 of 11 breakables unreachable

#### How the ride limits you

- From `player.js`, the ride branch:
  - The vacuum drives itself at 10.5 m/s, and steering moves sideways at most **6.8 m/s**.
  - There is no bite while riding, so breaking means ramming. Nobu's box (±0.36 m) has to overlap the
    breakable's box (±0.475 m).
- So two breakables at the same `d` and more than **1.67 m** apart can never both be hit.

| d | Breakables | Reachable in one run |
| --- | --- | --- |
| 68 | backpacks at −2.6, 0, 2.6 | **1 of 3** |
| 160 | Zipped Backpack −2.4, backpack 2.4 | **1 of 2** |
| 222 | Cat (TNT) −2.6, backpack 2.6 | **1 of 2** |
| 270 | backpacks −2.6, 0 | **1 of 2** |

- Only **6 of 11** countables can be broken in a run. The rugs count, because the Vacuum Dock at d 286
  pops them all.
- Today this triggers the missed-backpack rain every time. Under the plan, bonus stages get a Golden
  slot, which would make that slot impossible to earn.

#### Fix

Edits are in `src/levels/bonusRide.js`. Stagger every pair by at least
`(|dx| − 1.67) / 6.8 × 10.5 + 1` metres. That is about 2.5 m for breakables 2.6 m apart, and 6.5 m for
5.2 m apart.

| Now | Change to |
| --- | --- |
| `k.packs([[-2.6, 68], [0, 68], [2.6, 68]])` | a diagonal: `[[-2.6, 64], [0, 67.5], [2.6, 71]]` |
| `k.zipped(-2.4, 0, 160); k.pack(2.4, 0, 160)` | `k.zipped(-2.4, 0, 157); k.pack(2.4, 0, 164)` |
| `k.cat(-2.6, 0, 222); k.pack(2.6, 0, 222)` | `k.cat(-2.6, 0, 219); k.pack(2.6, 0, 226)`. Ram the cat first; its 3 s fuse goes off behind you. |
| `k.packs([[-2.6, 270], [0, 270]])` | `k.packs([[-2.6, 267], [0, 270]])`. The leg at 2.7, 270 stays. |

- Check that the moved breakables don't overlap the hazards (cables, toy piles, legs) near those
  distances.
- `tests/ride-reach.test.js` checks the stagger rule for every ride and raft breakable, including L6's
  raft.

### L1 Bark Jungle, L3 Cone Factory and Glowworm Grotto

- These are on foot with no chase, so there is no time limit.
- Same-`d` groups (for example Grotto `[-2.4, 230], [0, 230], [2.4, 230]`) are fine: you can stop.
- Retryable or non-counting cases checked:
  - The Treat Tray round can be retried after a fall.
  - Good Boy Route, colored-path and Bark Rock prizes don't count.
  - The belly-flop pockets have a mushroom back up.
- One soft-lock to be aware of: in L1, if the trampoline at d 105 is bitten before it's used, the
  hidden ledge (dog, 1UP, backpack) can't be reached until a death rolls it back. Fix it in H30: make
  the ledge reachable a second way (a lunchbox step), or make the trampoline unbiteable until bounced
  once.

### Limits of this audit

- These are models, not playtests. The stop times use the bite, slide and movement numbers from
  `player.js`, not recorded inputs.
- The gapped-wall margin (1.3×) is the tightest one; confirm it in a playtest (H31).
- Places where Nobu can't see ahead (the L2 camera faces him) aren't modelled. Each backpack wall has
  about 12 m of warning before it reaches Nobu.

---

# Part 3: Rewards spec

Source: `docs/expansion/rewards-spec.md`

## Rewards, DDA and mastery: implementation spec

Status: **spec only.** It adds implementation detail to sections 3, 4.3, 4.5 and 4.6 of
`docs/gameplay-expansion-plan.md`. It doesn't change any decision there. Where the plan left something
open, the choice made here is listed in section 18.

Line numbers refer to `main` at `bfb4a33`, and they move. Search for the function name.

---

### 0. Conventions

- **Level ids** are strings in the save and numbers or strings in code: `'1' '2' '3' '4' '5' '6'
  'ride' 'cave'`. Compare with `String(id)`.
- **Play order** of the six main levels is **1, 2, 3, 4, 6, 5**. Level 6 is "Smog Rapids":
  - It sits between L4 and L5, opens when L4 is cleared, and has no boss.
  - It ends at a goal, like a bonus stage, but it is a **main level**: it has a full six-bone board, a
    story clear and a time trial.
  - **L5 opens when L6 is cleared.**
  - Its id stays `6`, even though it is fifth in play order, so ids never have to be renumbered.
- **Dogs per level, all content shipped:**

  | L1 | L2 | L3 | Roomba Rush | Glowworm Grotto | L4 | L6 | L5 | Total |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 9 | 7 | 9 | 4 | 4 | 7 | 7 | 7 | **54** |

- **Raw versus whole Tickets.** A *raw pickup* is one floating ticket. *Whole Tickets* are raw × 1/3,
  rounded down (`NOBU_TICKET_SCALE` in `src/config/tickets.js`). The HUD and the hub show whole
  Tickets. Every new rule says which unit it means.
- **"Run"** means one `Session` from `startLevel()` to the boss gate or goal. A game-over continue starts
  a new Session, and therefore a new run.
- **Contexts** that switch rewards off, checked by `rewardCtx(session)` in a new `src/game/rewards.js`:

  | Flag | Source | Effect |
  | --- | --- | --- |
  | `trial` | `session.trial` | No Chain sphere, no Mystery, no bones, no DDA, no Kennel unlocks, no Buddy |
  | `remix` | `session.remix` (new, M5) | No Mystery, no DDA; only Remix bones |
  | `god` | `save.data.godMode` | No Good Boy Bone, Perfect Run, boss medals or Platinum. Golden, Hidden and Snack bones still count, as the Golden Bone does today |
  | `rush` | `session.rush` (new, M5) | No DDA. Only rush medals |
  | `arena` | `session.phase === 'boss'` | No Chain, no Mystery |

- New pure modules hold no DOM or Three.js, so Vitest can import them:
  - `src/game/bones.js`
  - `src/game/rewards.js`
  - `src/game/progress.js` (Good Boy %)
  - `src/game/dda.js`
  - `src/game/rng.js`

---

### 1. Shared foundation

#### 1.1 New `Session` fields (`src/game/session.js`, constructor)

```js
this.runSeed = (Math.random() * 2 ** 32) >>> 0; // Mystery rolls; fixed for the whole run
this.chain = { n: 0, t: 0, best: 0, sphereGiven: false, lastBy: null };
this.snack = { raw: 0, potential: 0 };          // Snack Bones, in raw pickups
this.deathsAtGate = null;                       // set in reachBossGate() / reachGoal()
this.hiddenFound = false;                       // the Hidden Bone was picked up this run
this.sectionMiss = null;                        // { [sectionName]: count }, filled at the gate
this.bossRun = null;                            // boss medals, see 12.2
this.dda = { hazardMul: 1, level: 0 };          // see 11
this.bossStageDeaths = 0;                       // see 11.4
```

#### 1.2 Event hooks: where each reward listens

| Event | Existing code | Add |
| --- | --- | --- |
| A countable breakable breaks | `Breakable.markBroken()` → `session.onBreak(this)` (`entity.js`) | `onBreak(b)`: `this._chainHit(b)`, then `_pushHud()` (already there) |
| An enemy is defeated | `Enemy` calls `session.onEnemyDefeated(this)` (`enemies.js` ~180, ~189); the session method is empty today | `onEnemyDefeated(e)`: `this._chainHit(e)` |
| A dog is freed | `ConedDog.free()` → `session.rescueDog()` | Record `dog.dogId` in `this.freedIds` (a Set; rollback below) |
| A ticket is collected | `TicketSystem.update` → `session.addTickets(1)` for static tickets; flying tickets → `addTickets(1, f.source)` | Count into `snack.raw` unless the source is excluded (4.4) |
| A checkpoint is reached | `session.checkpoint(pos, snacks)` | Snapshot `snack.raw`; reset the chain sphere and DDA (11) |
| Death and respawn | `onPlayerDeath()`, `respawn()` | Reset the chain; restore `snack.raw` from `cp`; run DDA |
| The Treat Tray round is left | `_leaveBonusRound(kept)` | When it isn't kept, restore `snack.raw` from the round snapshot |
| Gate or goal | `reachBossGate()`, `reachGoal()`, `_recordLevelStats()` | Freeze `deathsAtGate`, compute `sectionMiss`, the Snack tier and the freed-dog list into `this.stats` |
| Level cleared | `game.levelCleared(session)` (`game.js` ~715) | `applyRunResults(save.data, levelId, stats)` from `bones.js`; Kennel update |
| L6 goal reached | `reachGoal()` → today always `game.bonusCleared()` | New `game.goalLevelCleared(session)` for registry entries with `goal: true, bonus: false` (L6). It does what `levelCleared` does: `beaten['6']`, the six-bone board, `bestDogs`, `dogsFreed`, `hub.bank`, then opens L5. It has no rescue cutscene unless the levels spec adds one. |
| Bonus cleared | `game.bonusCleared(session)` (~762) | Same, with a three-slot board |
| Boss damage | `Boss.damage(p)` (`common.js` ~585) | `session.bossRun.hits++` |
| Nobu takes damage | `Player.hurt()` (`player.js` ~607), `Player.die()` (~692) | `session.onPlayerHurt()`: `bossRun.noHit = false`; `perfect` is unaffected (only deaths count for it) |

**Rollback fields.** Add these to every `cp` snapshot (`_attachActors` and `checkpoint`) and to the
`bonusRound` snapshot (`enterBonusRound`): `snackRaw: this.snack.raw` and `freedIds: new
Set(this.freedIds)`. Restore them in `respawn()` and in `_leaveBonusRound(false)`, next to the existing
`levelTickets` and `fieldRaw` restores.

#### 1.3 Save v3 schema (`src/core/save.js`)

`fresh()` gains the fields below. Existing fields not listed keep their current shape.

```js
{
  v: 3,
  // was: unlocked: 1..3 (number). Now: the level ids the player may enter.
  unlocked: 1,                 // KEPT as a number for 1..3 for back-compat; see 1.5. New ids use `open`.
  open: { '1': true },         // every level/bonus/kennel id that is enterable
  beaten: { },                 // { [id]: true }   was [bool, bool, bool]
  bones: { },                  // { [id]: true }   Golden Bone, was [bool, bool, bool]
  bestDogs: { },               // { [id]: n }      was [n, n, n]
  boneBoard: { },              // { [id]: { golden, goodBoy, hidden, snack: 0|1|2|3 } }
  dogsFreed: { },              // { [dogId]: true }, dogId like '1:shiba-a' (5.2)
  bestChain: { },              // { [id]: n }
  chainBadges: { },            // { [id]: true } a chain of 15+ in that level (2.5)
  bossMedals: { },             // { [bossKey]: { clear, noHit, speed, bestMs } }
  perfect: { },                // { [id]: true } Perfect Run relic
  remix: { },                  // { [id]: { golden: bool } }  (M5)
  rush: { clear: false, noHit: false, bestMs: null },          // (M5)
  kennel: { seen: 0, buddy: null, tint: null },                // milestones seen; Buddy breed; fur tint id
  trialsClassic: { },          // layout-1 bests moved out when L1-L3 are extended (6.3 of the plan)
  gauntlets: { },              // { g1|g2|g3: { polaroid, clear, allBoxes, noDeath, firstPaid } } (box-gauntlets-spec 4)
  // unchanged: lives, tickets, seenIntro, finished, lastLevel, tutorials, nobuModel, pixelated,
  // godMode, loadout, bonus, trials, colorBones, musicVol, sfxVol
}
```

- `colorBones` gains `green`, `yellow` (plan 6.1 and 6.2) and `purple` (Level 6). Its shape doesn't change.
- **No derived values are stored.** Kennel milestones, Good Boy % and the move list are computed every
  time (`progress.js`, `abilities`). `kennel.seen` is only the highest milestone whose "NEW!" pop-up
  has been shown.

#### 1.4 Sanitizers

Add these next to `sanitizeTrials` and `sanitizeBonus`:

```js
const IDS = ['1', '2', '3', '4', '5', '6', 'ride', 'cave'];          // from the level registry (plan 10.1)
const boolMap = (v, ids = IDS) => Object.fromEntries(ids.filter((k) => isObj(v) && v[k] === true).map((k) => [k, true]));
const countMap = (v, ids = IDS) => Object.fromEntries(ids.map((k) => [k, count(isObj(v) ? v[k] : 0)]).filter(([, n]) => n > 0));
function sanitizeBoard(v) {
  const out = {};
  for (const k of IDS) {
    const e = isObj(v) ? v[k] : null;
    if (!isObj(e)) continue;
    out[k] = { golden: e.golden === true, goodBoy: e.goodBoy === true, hidden: e.hidden === true,
               snack: Math.min(3, Math.max(0, Math.floor(finite(e.snack, 0)))) };
  }
  return out;
}
const BOSS_KEYS = ['bird', 'cat', 'cone', 'titan', 'queen'];
function sanitizeMedals(v) {
  const out = {};
  for (const k of BOSS_KEYS) {
    const e = isObj(v) ? v[k] : null;
    if (!isObj(e)) continue;
    out[k] = { clear: e.clear === true, noHit: e.noHit === true, speed: e.speed === true,
               bestMs: Number.isInteger(e.bestMs) && e.bestMs > 0 ? e.bestMs : null };
  }
  return out;
}
const DOG_ID = /^(1|2|3|4|5|6|ride|cave):[a-z]+-[a-z0-9]+$/;
const sanitizeDogs = (v) => Object.fromEntries(Object.keys(isObj(v) ? v : {}).filter((k) => DOG_ID.test(k) && v[k] === true).map((k) => [k, true]));
```

`sanitize(d)` calls each of these. Drop the `bools3` uses for `beaten` and `bones` once the migration
below has run. Leave `trials` alone; `sanitizeTrials` already handles it.

#### 1.5 Migration v2 → v3, step by step (in `save.load()`)

The current code runs `data = sanitize({ ...fresh(), ...old })`, then the `v >= 2` fix. Insert a
`migrate(old)` step **before** `sanitize`:

1. If `old.v >= 3`, return it unchanged.
2. **`beaten`:** if it is an array, turn it into an object, `{ '1': !!a[0], '2': !!a[1], '3': !!a[2] }`,
   keeping only the true entries.
3. **`bones`:** the same conversion.
4. **`bestDogs`:** if it is an array, turn it into `{ '1': a[0], '2': a[1], '3': a[2] }`, keeping only
   values above 0.
5. **`boneBoard`:** for each id where the old `bones[i]` was true, set `boneBoard[id] = { golden: true,
   goodBoy: false, hidden: false, snack: 0 }`. No other slot is granted retroactively, because v2 never
   tracked deaths or Ticket %.
6. **`open`:**
   - Add `'1'..String(old.unlocked)`.
   - Add `ride` if `old.beaten[0]`, or `old.bonus.ride.found`, or `old.bonus.ride.beaten`.
   - Add `cave` the same way using `beaten[1]`. This copies `mapOpen()` in `game.js`.
   - Add `kennel` if any dog was ever freed (`bestDogs` sum > 0).
7. **`dogsFreed` (approximate):** for each level, mark the first `bestDogs[id]` entries of that level's
   dog-id list in the registry as freed. Example: `bestDogs['1'] = 3` marks `1:shiba-a`, `1:pug-a` and
   `1:dalmatian-a`. This can mark the wrong individual dogs; that is accepted, because v2 never stored
   which ones. Bonus stages had no `bestDogs`, so none are marked.
8. **`unlocked`:** keep it as a number capped at 3, so older code paths still work during M0. The
   registry's `unlock(save)` reads `open` from M0 on.
9. Set `v = 3`.

`multitab.test.js` covers the multi-tab case. A tab still on v2 code may write a v2 save while a v3 tab
is open. The v3 tab's `write()` merges the disk copy through `mergeScores`, so `migrate()` must also run
on the disk copy inside `mergeScores` (see 1.6).

#### 1.6 Multi-tab merge (`mergeScores(mine, disk)`)

Extend it so another tab's progress is never lost. Run `migrate()` on `disk` first. Merge rules:

| Field | Rule |
| --- | --- |
| `beaten`, `bones`, `open`, `dogsFreed`, `perfect`, `chainBadges`, `colorBones` | union (OR) |
| `boneBoard[id]` | OR each boolean; `snack = max` |
| `bestChain[id]`, `bestDogs[id]` | max |
| `bossMedals[k]` | OR each boolean; `bestMs = min` of the non-null values |
| `remix[id].golden`, `rush.clear`, `rush.noHit` | OR; `rush.bestMs = min` |
| `trialsClassic[id]` | lower `ms` wins (same as `trials`) |
| `kennel` | keep `mine` (cosmetic choices are per tab); `seen = max` |

`save.reset()` (New Game) keeps `trials` and `trialsClassic`, as today. It also keeps `bossMedals`,
`perfect`, `rush` and the trial-related Platinum medals, because they are mastery records in the same
spirit. Everything else is cleared. The copy for the New Game confirm dialog is in section 15.

---

### 2. Chomp Chain

#### 2.1 Rules

- **A hit** is a countable breakable breaking (`onBreak`) or an enemy defeated (`onEnemyDefeated`) in
  `phase === 'level'`. Arena breakables are `countable = false` and never reach `onBreak`.
- **Timer:** `CHAIN_WINDOW = 1.1` s. Each hit sets `chain.n += 1` and `chain.t = CHAIN_WINDOW`.
- **The timer only runs while Nobu is grounded.** In `session.update(dt)`:

  ```js
  const c = this.chain;
  if (c.n > 0 && !this.busy) {
    if (g.player.body.grounded || g.player.ride) c.t -= dt;   // airborne time is free: stack bounces, long jumps
    if (c.t <= 0) this._endChain();
  }
  ```

  This is the plan's rule ("touching the ground for more than 1.1 s without breaking anything ends it")
  as one timer. On the Roomba ride Nobu is always "grounded", so the timer runs all the time there.
- **Ends on:** the timer running out, death (`onPlayerDeath`), respawn, entering or leaving the Treat
  Tray round, `reachBossGate`, `reachGoal`.
- **Explosions count.** A Cat (TNT) chain reaction breaks several backpacks in one frame. Each one is a
  hit, so a chain of 6 from one explosion is fine and intended: it rewards setting up a blast.
- **Excluded:** Freeze Packs (trials only), Bark Rocks (they are not `Breakable`), freeing dogs.
- **Worked example:** stomp a stack of 3 (hits 1–3; airborne the whole time), land and bite a backpack
  0.6 s later (hit 4), slide into 2 more within 0.5 s (hits 5–6), squash a Broccoli 0.9 s later (hit 7),
  then a backpack 1.0 s later (hit 8). The **Blue Sphere drops**. Nobu stands still for 1.1 s and the
  chain ends at 8.

#### 2.2 Reward

- When `chain.n` reaches **8** and `!chain.sphereGiven` and `!ctx.trial`, spawn a non-countable
  `BlueSphere` 1.2 m ahead of Nobu on the track, at `player.facing`, and set `sphereGiven = true`.

  ```js
  const s = new BlueSphere(this.stage, x, y, z); s.countable = false; s.chainDrop = true; this.stage.add(s);
  ```

  Use the same constructor call as the phase spheres in `onBossPhase()`.
- `sphereGiven` resets to false in `checkpoint()` and in `respawn()`. That makes it **one sphere per
  checkpoint section per life**. Masks reset on death anyway, so the reset can't be farmed for extra
  masks.
- If the drop point is over a pit (`track.groundAt(d, x)` returns nothing), spawn it on Nobu instead.
- Chain-drop spheres are removed in `respawn()` (`e.chainDrop` → `stage` removal), so a rollback
  doesn't leave them lying around.

#### 2.3 Feedback

- **HUD:** a new slot `chain` in `ui/ui.js`, next to the tickets slot.
  - Text `x{n}` from n ≥ 2. Hidden below 2.
  - Uses `setHud('chain', 'x5', { bump: true })`.
  - Fades 0.6 s after the chain ends, showing the final number.
- **Pitch:** `audio.play('break', 2 ** (Math.min(n - 1, 12) / 12))`. Today the `'break'` case ignores
  `p`; multiply its oscillator frequencies by `p`. Apply the same change to `'squash'` for enemy hits.
- **Screen punch:** `camera.shake(0.12, 0.12)` at n = 5 and `camera.shake(0.2, 0.15)` at n = 10, plus
  a new `'chainUp'` sound (16).
- **Banner** at the sphere drop: `CHOMP CHAIN x8!`, subtitle `Sproto Mask!`, 1.2 s.

#### 2.4 Records

- `chain.best = max(chain.best, n)` when a chain ends. It goes into `stats.bestChain` at the gate.
- Saved at level clear: `bestChain[id] = max(old, stats.bestChain)`. "NEW BEST CHAIN" in the tally
  (7.2) when it beats the old value **and** the old value was above 0 (no "new best" on the first
  clear).

#### 2.5 Chain badges (the cosmetic Kennel tie-in)

- A chain of **15 or more** in a level sets `chainBadges[id] = true`. It is saved at clear, like
  `bestChain`.
- The Kennel sign shows one paw badge per level that has one. **5 badges** unlock the cosmetic fur tint
  `chompGold`, which is added to the fur-tint list (5.4).

#### 2.6 Edge cases

| Case | Behaviour |
| --- | --- |
| A trial run | The counter shows and the pitch rises, but no sphere drops, and `bestChain` and badges are not saved |
| God mode | Everything works; chains are cosmetic |
| A chain carries into the Treat Tray | It ends on entry. A new chain can build up there. The sphere can drop in the tray round. |
| Breaking a backpack, dying, respawning | The chain is reset to 0 on death. Restored backpacks can be chained again. |
| A Mystery result spawns a Cat that explodes 3 backpacks | 3 hits; the Mystery itself was hit 1 |
| Zipped Backpack, first 2 bites | Not breaks (no `markBroken`), so no hit. The final break is a hit. A bite does **refresh** the timer, because it is clearly purposeful play: add `session.chainRefresh()` to `ZippedBackpack.break` before its early return. |

---

### 3. Mystery Backpack

#### 3.1 Entity

- `class MysteryBackpack extends ZippedBackpack`, in `src/entities/breakables.js`:
  - `this.kind = 'mystery'`, `maxHits = hits = 1`. **One bite opens it**, as do any break, stomp, flop,
    slide or explosion.
  - Placeholder look: the navy zipped model with no pull tags and a procedural "?" decal (a canvas
    texture made with the `textTexture('?')` helper that `Cat` uses for its countdown digits), bobbing
    0.06 m.
  - `this.slot`: the authoring order of this Mystery in the level (0, 1, 2), set by `k.mystery`.
- **Kit:** `k.mystery(x, y, d)` assigns `slot` automatically. In a trial or remix session it places a
  plain `Backpack` with default tickets instead, so the breakable total still matches between modes.

#### 3.2 Seeded roll (`src/game/rng.js`)

```js
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hash32(...parts) { let h = 2166136261; for (const p of parts.join('|')) { h ^= p.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export const MYSTERY_TABLE = [
  { id: 'tickets', w: 40 }, { id: 'sphere', w: 25 }, { id: 'cat', w: 15 }, { id: 'tramp', w: 10 }, { id: 'oneUp', w: 10 },
];
export function rollMystery(runSeed, levelId, slot, table = MYSTERY_TABLE) {
  const r = mulberry32(hash32(runSeed, levelId, slot))();
  let acc = 0; const total = table.reduce((s, e) => s + e.w, 0);
  for (const e of table) { acc += e.w / total; if (r < acc) return e.id; }
  return table[table.length - 1].id;
}
```

- The **same run** (same `session.runSeed`) always gives the same result for a slot. Dying and coming
  back to it rerolls nothing.
- A **new run** (re-entering the level, or a continue after game over) rolls again. That keeps it a
  real variable reward, while one death never rerolls it.
- `tramp` falls back to `sphere` when the slot has no authored ledge (`k.mystery(..., { tramp: false })`).

#### 3.3 Results

| Result | What spawns at the backpack's position | Notes |
| --- | --- | --- |
| `tickets` | `tickets.spawnFlying(x, y + 1, z, 9, 'mystery')` | 9 raw = **3 whole Tickets**. The source tag lets Snack Bones exclude it (4.4) |
| `sphere` | non-countable `BlueSphere` | |
| `cat` | non-countable `Cat`, fuse already lit (`timer = 0`) | `'hiss'` plays at once, through Cat's own countdown at `n === 3`. Banner `SURPRISE!`, subtitle `RUN!` |
| `tramp` | non-countable `Trampoline` | The authored ledge sits above it |
| `oneUp` | `session.addLife(1)` with a `OneUp`-style burst and `'oneUp'` | Lives are not rolled back on death today (`addLife` writes `save.data.lives`). Same here. |

- Spawned entities are stored in `this.spawned`. `onRestore()` removes them from the stage
  (`stage.remove(e)`, or hide plus `dead = true` if there's no remove) and resets `hits`.
- **Order:** `markBroken()` first, so the Mystery is a counted breakable and a chain hit. Then the
  spawn.

#### 3.4 Placement rules (enforced in review, not in code)

- 2–3 per level, never on the critical path, never above a pit (a Cat result must leave room to run).
- At least 4 m from another Cat or Rug.
- Plan 6.1, 6.2 and 6.3 positions: L1 Canopy Walk branch, L1 tray-side table, L4 Hallway side table,
  L5 Opening bell, L2 Cardboard Fort.

---

### 4. Bone Board

#### 4.1 Pure rules (`src/game/bones.js`)

```js
export const SNACK_TIERS = [0.40, 0.60, 0.80];
export const GOOD_BOY_MAX_DEATHS = { default: 3 };   // tier-5 override allowed by plan risk 3, e.g. { 5: 5 }
export function snackTier(raw, potential) {
  if (!(potential > 0)) return 0;
  const f = raw / potential;
  return f >= SNACK_TIERS[2] ? 3 : f >= SNACK_TIERS[1] ? 2 : f >= SNACK_TIERS[0] ? 1 : 0;
}
export function runBones(stats, ctx) {           // stats from _recordLevelStats(); ctx from rewardCtx()
  if (ctx.trial || ctx.remix) return null;
  const golden = stats.breakables > 0 && stats.broken >= stats.breakables && stats.dogs >= stats.dogsTotal;
  const max = GOOD_BOY_MAX_DEATHS[stats.level] ?? GOOD_BOY_MAX_DEATHS.default;
  return {
    golden,
    goodBoy: !ctx.god && stats.deathsAtGate <= max,
    hidden: !!stats.hiddenFound,
    snack: snackTier(stats.snackRaw, stats.snackPotential),
  };
}
export function applyRunResults(save, id, run) {   // never removes a bone (plan 6.3)
  const b = save.boneBoard[id] ||= { golden: false, goodBoy: false, hidden: false, snack: 0 };
  const fresh = [];
  for (const k of ['golden', 'goodBoy', 'hidden']) if (run[k] && !b[k]) { b[k] = true; fresh.push(k); }
  if (run.snack > b.snack) { for (let t = b.snack + 1; t <= run.snack; t++) fresh.push('snack' + t); b.snack = run.snack; }
  if (b.golden) save.bones[id] = true;              // keeps the old Golden Bone map in step
  return fresh;                                       // for the tally's stamp order
}
```

`levelCleared()` replaces `if (bone) d.bones[n - 1] = true;` with
`const fresh = applyRunResults(d, String(n), runBones(st, rewardCtx(session)) || {})`, and passes
`fresh` to `_showComplete`.

#### 4.2 Golden Bone

- The current rule doesn't change (`levelCleared` in `game.js` ~719).
- **Never revoked.** When extensions add breakables, a bone earned earlier stays (`applyRunResults`
  only sets values to true).
- Bonus stages gain a Golden Bone (plan 3.4: a three-slot board). It is stored in `boneBoard.ride` and
  `boneBoard.cave`.

#### 4.3 Good Boy Bone

- `session.deaths` already counts every death in the run. `reachBossGate()` and `reachGoal()` set
  `this.deathsAtGate = this.deaths` before anything else. Boss deaths don't count.
- The bone is **banked only when the level is cleared** (`levelCleared` after the boss, or
  `bonusCleared`). Quitting or a game over loses it, as with the Golden Bone.
- Wizard Hat (bosses skipped): `levelCleared` still runs, so the bone is earned normally.
- God mode: never awarded, because pits bounce and deaths can't happen.
- Worked example: die twice at the lily pond and once on the coconut hill, then die 4 times to the
  Mecha Bird. `deathsAtGate = 3`, so the bone is **earned**.

#### 4.4 Snack Bones (the Ticket-percentage tiers)

- **Unit:** raw pickups, so the scaling remainder doesn't matter.
- **`snack.raw`:** in `addTickets(n, source)`, before the scale, add `n` when
  `!SNACK_EXCLUDED.has(source)`:

  ```js
  const SNACK_EXCLUDED = new Set(['coconut', 'mystery', 'jackpot', 'bark']);
  ```

  - Coconuts are endless, so they're excluded.
  - Mystery Tickets are random.
  - `jackpot` covers the Good Boy Route and colored paths, which aren't open to everyone.
  - `bark` covers Bark Rocks, which are move-gated.
  - These sources need the tag passed through `spawnFlying(..., source)`, which already takes one:
    - `GoodBoyRoute` jackpot → `'jackpot'`.
    - `BarkRock` ticket prize → `'bark'`.
    - Mystery → `'mystery'`.
  - Untagged sources (static tickets, backpacks, Zipped Backpacks) count.
- **`snack.potential`:** computed once, after `this.tickets.finalize()` in `startLevel()`:

  ```js
  potential = tickets.list.length                                   // every static ticket, tray tickets included
            + Σ (Backpack|ZippedBackpack, countable, not Mystery) b.tickets   // their rolled 1–5, or authored n
  ```

  - Backpacks roll `randInt(1, 5)` at build, so the potential differs from run to run; the percentage
    is always against this run's own numbers.
  - `ZippedBackpack.tickets` is the full 8 (two bite ticks of 1, then the break pays the rest).
- **Rollback:** `snack.raw` is saved in every `cp` and in the tray snapshot (1.2).
- Worked example: a run with 120 static tickets and 30 backpacks rolling a total of 92 has potential
  212.
  - Bronze needs 85 (40%), silver 128 (60%), gold 170 (80%).
  - Collect 140 raw and the tier is **2 (silver)**. The tally stamps bronze, then silver.

#### 4.5 Hidden Bone

- Entity `HiddenBone` in `src/entities/secrets.js`:
  - Uses the `golden_bone` sprite at 0.8 m, tinted cyan.
  - It is a pickup like `ColorBone`, not a `Breakable`.
- Authoring: `k.hiddenBone(x, y, d, { move: 'dust' | 'moon' | 'glide' | 'zoom' | 'bark' | null })`.
  The `move` value is only used by hints.
- **Picking it up saves at once**, like `collectBone` does for colored bones:
  `boneBoard[id].hidden = true; save.write()`. It doesn't wait for the level clear. Hidden secrets are
  the hardest to reach, and losing one to a later death would feel unfair.
  - Banner `HIDDEN BONE!`, subtitle `Shhh... it's a secret`, sound `'oneUp'` + `'chime'`.
  - Also sets `session.hiddenFound = true` for the tally.
- If it was already found, the bone shows as a translucent ghost and gives nothing.
- In a trial, the entity isn't built.

#### 4.6 Where the board is shown

- **Pause menu** (`_drawPause`, `game.js` ~585):
  - A row of 6 icons above the menu, live. Golden (filled when this run is on track to earn it, else
    a silhouette), Good Boy (shows `deaths/3`), Hidden, and the 3 Snack tiers filled up to the current
    run's tier.
  - Below the icons: `Breakables x/y · Dogs x/y · Snacks 63%`.
  - Saved bones show solid gold; bones this run would earn show white outlines.
- **Map panel** (`_drawMap`, around ~350–372): the 6 icons, saved state only, replacing the single
  `golden_bone` image. The status line becomes the next-goal hint (8).
- **Results** (7): stamped in.

---

### 5. The Kennel

#### 5.1 Map node

- `MAP_ORDER` (later the registry) gets `'kennel'` at the end, at `mapPos { x: 88, y: 72 }`.
  - It opens once any dog has ever been freed (`open.kennel`).
  - It has no Session. Selecting it sets `game.state = 'kennel'`.
- **Kennel scene** (`updateKennel`, `_drawKennel` in `game.js`):
  - Reuses the title-screen 3D background setup (`render()` already draws the scene in title and
    wardrobe states, `game.js` ~132).
  - A fenced yard is built from `decor.js` `fencePost`s around a 12 × 8 m patch of grass.
- Each entry in `dogsFreed` spawns its breed's `dog_*_free` GLB:
  - Up to 54 dogs, scattered on a 9 × 6 jittered grid.
  - Each plays its dance clip, offset by `index * 0.37` s.
  - On a low-end GPU (`renderer.capabilities.maxTextures < 16` or DPR clamp active), show 12 dogs plus
    a `+N` sign.
- **DOM panel:**
  - A list of milestones with `✓` or the dogs still needed.
  - Buttons for Jukebox, Buddy, Fur and Gallery when unlocked.
  - The chain badges row.

#### 5.2 Stable dog ids

- `k.dog(x, y, d, breed, { id })`. **Every** `k.dog` call gets an explicit `id`, and once released an
  id never changes.
  - Format: `<breed>-<letter>`. The save key is `<levelId>:<id>`, for example `1:shiba-a` and
    `1:shiba-b`.
  - The ids are added in M0 for existing dogs, in authoring order, so the 1.5 migration can map
    `bestDogs` to ids.
- `ConedDog` stores `this.dogId`. `session.freedIds` is updated in `rescueDog()`:
  `freedIds.add(dog.dogId)`. Rollback is covered in 1.2.
- At the gate, `stats.freedIds = [...freedIds]`. `levelCleared` and `bonusCleared` set
  `dogsFreed[`${id}:${dogId}`] = true` for each.
- `registry.test.js` checks that ids are unique within each level and match `DOG_ID`. This test reads a
  static `dogs` list from the registry; the kit can't be imported without Three.js.

#### 5.3 Milestones (pure, `progress.js`)

```js
export const KENNEL_MILESTONES = [
  { at: 8, id: 'jukebox' }, { at: 16, id: 'buddy' }, { at: 24, id: 'fur' },
  { at: 32, id: 'gallery' }, { at: 42, id: 'sniffer' }, { at: 'all', id: 'golden' },
];
export const dogsFreedCount = (save) => Object.keys(save.dogsFreed).length;
export function kennelUnlocks(save, totalDogs) {
  const n = dogsFreedCount(save);
  return KENNEL_MILESTONES.filter((m) => (m.at === 'all' ? n >= totalDogs : n >= m.at)).map((m) => m.id);
}
```

- `totalDogs` comes from the registry: **54** with all content shipped, and lower before that.
  `'all'` is always the current total.
- **Why these thresholds.** They are spread about every 8 dogs over 54, with the last one at all 54.
  - The Sniffer, the anti-grind hint, comes at 42, which leaves 12 dogs for it to help find.
  - 8 dogs is about the first two levels, so the Jukebox comes early.
  - The plan's old thresholds (5 / 10 / 15 / 20 / 25) assumed about 37 dogs. The unlock items and their
    order are the same.
- A milestone whose threshold is above the shipped total isn't shown, and doesn't count in Good Boy %
  (9.1), until enough dogs ship.
- **New milestone pop-up:** at level clear, if `kennelUnlocks(...).length > kennel.seen`, show a banner
  on the results screen after the board: `KENNEL: BUDDY UNLOCKED!`. Then set `kennel.seen`.

#### 5.4 Unlock behaviour

| Unlock | Behaviour |
| --- | --- |
| Jukebox | A list of every song key in `audio/songs.js`; ◀ ▶ picks, SPACE plays with `audio.playMusic(key)`; ESC stops |
| Buddy | Pick a breed you have freed (or `none`). `kennel.buddy = 'pug'`. In `phase === 'level'`, outside trials, remixes and rides, a `Buddy` entity (new, `src/entities/buddy.js`) follows Nobu (details below). |
| Fur | Tints: `none`, `cream #f3e3c3`, `shadow #5a5560`, `ginger #d08a4a`, `chompGold #f2c14e` (needs 5 chain badges). `kennel.tint`. Applied as `material.color.multiply` on the Nobu GLB body materials and the Classic primitive fur material. Off in trials. |
| Gallery | Full-screen viewer of `concept_keyart`, `concept_environments`, `story_intro_1..4`, `story_rescue_1..3`, `story_ending`; ◀ ▶ |
| Sniffer | See 5.5 |
| Golden | One-time cutscene: every dog dances and the Sproto Mask speaks a line (15). After it, the title screen's Nobu plays the dance pose. |

Buddy details:

- It follows 1.6 m behind and 0.8 m to the side, using damped follow.
- It teleports to Nobu if more than 8 m away or after a respawn.
- It has no collision and doesn't affect gameplay.
- It uses the `dog_<breed>_free` GLB's walk clip. These GLBs are Meshy-rigged and have walk and dance
  clips (README).

#### 5.5 Sniffer

- In the Kennel, pressing bark (`L` / `E` / pad Y) opens the Sniffer list. On the map it is shown in
  the panel for the selected level, once `sniffer` is unlocked.
- It lists every missing Hidden Bone and dog for every **open** level:
  `Bark Jungle: Hidden Bone near The Burrow (needs DUST DASH) · 1 dog near Canopy Walk`.
- **Data source:** static metadata in the registry, so no level has to be built:

  ```js
  { id: '1', sections: [[0, 26, 'Start'], [26, 58, 'High Road'], ...],
    dogs: { 'shiba-a': 'Start', 'pug-a': 'Treat Ledge', ... },
    hidden: { section: 'The Burrow', move: 'dust' } }
  ```

- A dev check in `dev.js`: after `startLevel`, compare each built `ConedDog.dogId` and the section
  containing its `d` with the registry, and `console.error` any mismatch. It can't be a Vitest test,
  because levels need Three.js.

---

### 6. Move-gated secrets: bookkeeping

#### 6.1 Moves come from the beaten map

`Player.abilities` (`player.js` ~162) becomes:

```js
get abilities() {
  const b = save.data.beaten || {};
  return { glide: !!b['1'], zoom: !!b['2'], bark: !!b['3'] || !!this.gear.spell_bark,
           dust: !!b['4'], moon: !!b['5'], airDash: !!this.gear.air_dash };
}
```

The only change is reading `'1'` instead of `[0]`, plus the two new moves. Nothing about moves is
stored.

L6 has no boss, so clearing it grants no move. Its gated secrets use moves the player already has by
then (glide, zoom, bark, dust). `moon` comes from `beaten['5']`, the Pump Queen.

#### 6.2 Gated objects

Each gated object builds in one of two states, chosen at build time from `game.player.abilities`:

| Object | Locked look (still visible: "a gated object always looks gated") | Unlocked |
| --- | --- | --- |
| Zoomie Gate | Shutter down; a floor plate glows orange; touching the plate without the move raises the shutter only 0.4 s | Plate opens it for `open` s (default 2.5) |
| Smog Vent | Purple fog column; a lift platform hidden inside | Mega Bark within 6 m clears the fog for 8 s and the lift runs |
| Dust Wall | Grey fuzz box (procedural noise texture); `solid` | Dust Dash breaks it (a `'dust'` puff); stays broken for the run; restored on rollback if broken after the checkpoint |
| Moon Ledge | Platform outlined in pale blue, glowing; **solid** (you can land on it from above) but placed out of jump reach | Same; only the Moon Jump reaches it |
| Glide gap | A floating alcove too far for a double jump | Tail Glide reaches it |

- **Signposting copy:** when Nobu is within 4 m of a locked object for the first time per level, show
  a tutorial-style pop-up (`ui.tutorial` with new ids, for example `gate_dust`): `A DUST WALL. Something
  in the Owner's House could break this...`. The text names the move only after the boss that gives it
  has been met (`beaten` of the boss before it). Until then it gives a hint, not the name.
- `HiddenBone.move` drives the Sniffer text (5.5) and the next-goal hint (8).

#### 6.3 Rule check (Golden Bone never gated)

- In `dev.js`, after build: walk every countable `Breakable` and `ConedDog`. If one lies inside a
  gated area (a bounding box declared by each gated object as `gatedBox`), `console.error('gated
  countable')`.
- Gated areas may only hold Hidden Bones, tickets, 1UPs, remix-only extras and **non-countable**
  breakables (`countable = false`).

---

### 7. End-of-level tally

#### 7.1 Data passed to the screen

`_showComplete(n, st, fresh, bonus)`. Here `st` is `session.stats`, extended with:

```js
{ tickets, broken, breakables, dogs, dogsTotal,        // existing
  bestChain, deathsAtGate, snackRaw, snackPotential, snackTier, hiddenFound,
  sectionMiss: { 'Lily Pond': 3, 'Canopy Walk': 1 }, missedDogs: { 'Canopy Walk': 1 } }
```

`fresh` is the list of new bone keys from `applyRunResults` (4.1), in stamp order.

#### 7.2 Sequence and timings

The screen opens after the existing rescue cutscene (`playCutscene(RESCUE[n], ...)`). Timings count
from when the screen first appears. Lines replace the current `stat-row` reveal (`game.js` ~790).

| t (s) | Step | Visual | Sound |
| --- | --- | --- | --- |
| 0.0 | Title `LEVEL n COMPLETE!` / `BONUS STAGE CLEAR!` | fade in | music `'complete'` (exists) |
| 0.5 | **Backpacks** counts 0 → broken over `min(1.2, 0.03 × broken)` s; then `/total` | number ticks | `'blip'` every tick, `p` rising from 1 to 2 across the count |
| +0.3 | **Dogs** 0 → freed, one tick per dog, 0.18 s each | dog icon pops per tick | `'ticket'` per dog |
| +0.3 | **Tickets** 0 → whole Tickets, over `min(1.0, 0.02 × n)` s | | `'blip'` |
| +0.3 | **Best Chain** `xN` (shown only if N ≥ 5) | `NEW BEST CHAIN` flashes if it is a record (2.4) | `'chainUp'` (new) |
| +0.5 | **Bone Board** row of 6 (3 on bonus stages) shown as silhouettes, with already-owned bones solid | | |
| +0.4 each | Each key in `fresh` **stamps** in: scale 2 → 1 over 0.18 s, then a 0.12 s shake | `camera`-free; a CSS shake on the screen element | `'stamp'` (new); the last stamp also plays `'oneUp'` |
| +0.6 | **Next-goal hint** line (8) | type-on, 40 chars/s | `'blip'` every 3 chars |
| +0.4 | Kennel milestone banner, if any (5.3) | | `'chime'` |
| end | `Press any key` | | |

- **Skippable:** any key after the screen has played once in this save (`save.data.tutorials.tallySeen`)
  jumps straight to the final state. On the very first tally, input is ignored until the end, as
  today's `completeT > 2.3` guard does. Raise that guard to the sequence length.
- The existing `updateComplete` continue logic (between-level text, ending, map) is unchanged.

#### 7.3 Missed-backpack rain

Unchanged. It plays before the boss or goal, earlier than the tally. The plan order is rain, then the
tally, then the board.

---

### 8. Next-goal hint

#### 8.1 Sections

- `k.section(d0, d1, name)` pushes onto `stage.sections`.
- Every level declares sections covering its whole length; the registry copy (5.5) must match.
- At the gate, `_recordLevelStats()` maps each uncounted breakable and each un-freed dog to a section
  name, using `track.project(e.pos.x, e.pos.z).s`:

  ```js
  const secAt = (s) => (this.stage.sections.find(([a, b]) => s >= a && s < b) || [0, 0, 'the path'])[2];
  ```

#### 8.2 Choosing the one hint (pure, `bones.js`)

`nextGoal(board, stats, ctx, abilities)` returns `{ text }`. Missing goals are tried in this priority
order, and the first match wins:

1. **Golden Bone missing, few left:** fewer than 6 breakables or dogs missing. Name the section with
   the most misses: `Golden Bone: 3 backpacks missed near Lily Pond.` If dogs are missing too:
   `Golden Bone: 1 dog and 2 backpacks missed near Canopy Walk.`
2. **Good Boy Bone missing and deaths ≤ 6:** `Good Boy Bone: 5 deaths, need 3 or fewer.`
3. **Snack Bone one tier away:** within 10 percentage points of the next tier. `Snack Bones: 72% of
   Tickets, 80% for gold.`
4. **Hidden Bone missing:**
   - If its move is owned: `Hidden Bone: somewhere near The Burrow.` (After the Sniffer is unlocked,
     the section is always named; before that, only if the move is owned.)
   - If its move is not owned: `Hidden Bone: you'll need a new move to reach it.`
5. **Golden Bone missing, many left:** `Golden Bone: 14 backpacks to go. Try the side paths.`
6. **Everything owned:** if the level has a trial, `Board complete! Try the time trial for a
   Platinum Tag.` Otherwise: `Board complete! Good boy.`

- The map panel calls `nextGoal` with **saved** data only, using the last run's stored `sectionMiss`.
  Store it as a small object `lastMiss[id] = { 'Lily Pond': 3 }` in the save. It is optional: if it is
  missing, hint 1 drops the section name.

  The schema addition is `lastMiss: {}`, a map of section name to count, at most 12 keys per level;
  the sanitizer clips longer names to 40 characters.

---

### 9. Good Boy %

#### 9.1 Formula (`progress.js`)

Base track (completion), **95 points**, displayed as `floor(points / 95 × 100)`:

| Item | Points | Arithmetic | Source |
| --- | --- | --- | --- |
| Story clear, 6 main levels (1, 2, 3, 4, 6, 5) | 24 | 6 × 4 | `beaten[id]` (L6: reaching its goal) |
| Bone Board, 6 main levels | 36 | 6 levels × 6 slots (golden, goodBoy, hidden, snack1, snack2, snack3) | `boneBoard` |
| Bonus boards (ride, cave) | 6 | 2 × 3 slots (golden, goodBoy, hidden) | `boneBoard` |
| Colored bones (red, blue, green, yellow, purple) | 5 | 5 × 1 | `colorBones` (purple is found in L6) |
| Dogs | 18 | `floor(freed / 3)`, max `floor(54 / 3)` | `dogsFreed` |
| Kennel milestones | 6 | 6 × 1 | `kennelUnlocks` |
| **Total** | **95** | 24 + 36 + 6 + 5 + 18 + 6 | |

- **When content isn't shipped yet**, the denominator only counts shipped items. The registry marks
  each level `shipped: true|false`.
- Milestones count only if their threshold is at or below the shipped dog total, plus `all`.
- Example, before M3, with only L1–L3 and both bonus stages in today's layout (17 dogs: 5 + 3 + 5 + 2
  + 2):
  - Story: 3 × 4 = 12.
  - Boards: 3 × 6 = 18.
  - Bonus boards: 6.
  - Colored bones: red and blue, 2.
  - Dogs: `floor(17 / 3)` = 5.
  - Milestones: jukebox (8), buddy (16) and all = 3.
  - Total: **46**.

  So 100% is always reachable with the content that exists.

Mastery track, **100 points**, added on top as points, so the total can reach 200%:

| Item | Points | Arithmetic |
| --- | --- | --- |
| Gold trial tag, 6 main levels | 12 | 6 × 2 |
| Platinum Tag, 6 main levels | 18 | 6 × 3 |
| Boss No-Hit medal, 5 bosses (L6 has none) | 15 | 5 × 3 |
| Boss Speed medal, 5 bosses | 10 | 5 × 2 |
| Remix Golden Bone, 6 main levels | 18 | 6 × 3 |
| Perfect Run relic, 6 main levels | 12 | 6 × 2 |
| Boss Rush clear / no-hit | 6 | 3 + 3 |
| Box Gauntlet medals, G1–G3 (clear, all boxes, no deaths) | 9 | 3 × 3 (box-gauntlets-spec 4.2) |
| **Total** | **100** | 12 + 18 + 15 + 10 + 18 + 12 + 6 + 9 |

Mastery items for content that isn't shipped count 0 and aren't listed. The mastery cap shrinks with
them.

```js
export function goodBoyPercent(save, reg) {
  const base = basePoints(save, reg), baseMax = basePointsMax(reg);
  const basePct = baseMax ? Math.floor((base / baseMax) * 100) : 0;   // floor: never shows 100% early
  const mastery = masteryPoints(save, reg);                           // 0..100
  return { base: basePct, mastery, total: basePct + mastery };
}
```

**Worked example** (everything shipped: 6 main levels, both bonus stages, 54 dogs):

- Base:
  - L1–L3 beaten: 3 × 4 = 12.
  - Bones: L1 golden + goodBoy + snack1 + snack2 = 4; L2 golden = 1; L3 none. That's 5.
  - Bonus: ride golden = 1.
  - Colored bones: red = 1.
  - Dogs: 17 freed, `floor(17 / 3)` = 5.
  - Milestones: jukebox (8) and buddy (16) = 2.
  - Total: 12 + 5 + 1 + 1 + 5 + 2 = 26 of 95, so `floor(27.37)` = **27%**.
- Mastery: 1 gold tag = 2.
- Total shown: **29%**.

#### 9.2 Where it shows

- On the map header: `GOOD BOY 34%`.
- In the Kennel.
- On the credits line, which replaces `Golden Bones: x/3` (`game.js` ~854) with `Good Boy %: 34%`.

#### 9.3 Secret ending

- **Condition:** `beaten['5'] && goodBoyPercent(save).total >= 80`. L5 is last in play order, because it
  opens after L6.
- Checked when the Pump Queen is beaten and again on entering the map. If it is met and the ending
  hasn't been seen (`save.data.secretSeen`), play it. Otherwise the map says: `GOOD BOY 72% · reach 80%
  for the true ending`.

---

### 10. Tickets: guardrails and the per-level budget

#### 10.1 Rules in code

- Every new pickup calls `tickets.add` for static tickets, or `tickets.spawnFlying(..., source)`.
  **Nothing writes `save.data.tickets` directly** except the existing `addTickets()` path.
- New repeatable sources (L4 rolling oranges) use `source: 'coconut'`, so they share the existing
  `COCONUT_CAP_PER_CLEAR`. Don't add a second cap.
- No Ticket payouts for bones, medals, milestones, chains or the Kennel.
- Boss arenas: the arena `k.tix` placements stay at today's counts (L1 arena: 7). New arenas (Titan,
  Queen) get at most 7.

#### 10.2 Measuring today's maximum (procedure)

Add `T.budget()` to `src/dev.js`. It runs on the current stage after `startLevel`:

```js
budget() {
  const s = game.session, E = s.stage.entities;
  const field = s.tickets.list.length;
  const packs = E.filter((e) => e instanceof Backpack && e.countable).reduce((n, b) => n + (b.kind === 'zipped' ? 8 : b.authoredTickets ?? 5), 0);
  const jackpots = E.filter((e) => e.jackpot).reduce((n, e) => n + e.jackpot, 0);
  const bark = E.filter((e) => e.prize === 'tickets').reduce((n, e) => n + e.tickets, 0);
  const mystery = E.filter((e) => e.kind === 'mystery').length * 9;
  const raw = field + packs + jackpots + bark + mystery;
  return { field, packs, jackpots, bark, mystery, raw, wholeMax: Math.floor(raw / 3) + COCONUT_CAP_PER_CLEAR };
}
```

- `Backpack` needs `this.authoredTickets = tickets ?? null` in its constructor. `null` means it rolls
  `randInt(1, 5)`; the budget uses the worst case of 5.
- Run it on L1, L2, L3, ride and cave, and write the numbers into the table below as the measured
  baseline. That is the "measure L1 first and log it" step from plan 3.10.

#### 10.3 Static first estimate (to be replaced by the measurement)

A rough count of the `k.tix`, `k.tixArc` and `k.tixRing` arguments and the backpack calls in
`src/levels/level1.js`:

| L1 source | Raw (max) |
| --- | --- |
| Static tickets (lines, arcs, rings, tray) | ~120 |
| ~30 backpacks × 5 (worst case; the mean is 3) | ~150 |
| 2 Zipped Backpacks × 8 | 16 |
| Good Boy jackpot 12 + red path jackpot 15 | 27 |
| **Raw total** | **~313** → ~104 whole |
| Coconut cap | +15 whole |
| **Whole max per clear** | **~119** |

A typical full clear (mean backpack rolls, no jackpots) is about `(120 + 90 + 16) / 3 ≈ 75` whole,
plus coconuts.

#### 10.4 Caps (proposal; owner signs off, plan risk 5)

- The baseline density is **L1 measured whole max per 100 m of main path**. With the estimate above:
  `(119 - 15) / 3.13 ≈ 33` whole per 100 m.
- Cap per level is `ceil(33 × mainPathMetres / 100) + COCONUT_CAP_PER_CLEAR`. The coconut allowance
  applies only where the level has rollers.
- Lengths are the planned lengths after all extensions (the levels spec is the source).
- Layout-1 caps apply only until the extensions ship.

  | Level | Main path (m) | Arithmetic | Cap (whole Tickets) |
  | --- | --- | --- | --- |
  | L1 Bark Jungle, extended | 540 | ceil(33 × 5.40 = 178.2) + 15 coconuts | **179 + 15 = 194** |
  | L2 Scratchpost Canyon, extended | 520 | ceil(33 × 5.20 = 171.6) | **172** |
  | L3 Cone Factory, extended | 420 | ceil(33 × 4.20 = 138.6) | **139** |
  | Roomba Rush, extended | 470 | ceil(33 × 4.70 = 155.1) | **156** |
  | Glowworm Grotto, extended | 380 | ceil(33 × 3.80 = 125.4) | **126** |
  | L4 Laundry Day | 480 | ceil(33 × 4.80 = 158.4) + 15 (rolling oranges) | **159 + 15 = 174** |
  | L6 Smog Rapids | 450 | ceil(33 × 4.50 = 148.5) | **149** |
  | L5 Pump & Dump | 460 | ceil(33 × 4.60 = 151.8) | **152** |
  | *Layout 1 (today):* L1 / L2 / L3 / ride / cave | 313 / 302 / 243 / 312 / 252 | ceil(33 × length / 100) | *104 + 15 / 100 / 81 / 103 / 84* |

- The 33-per-100 m density is the **static estimate** from 10.3. When `T.budget()` gives the measured
  L1 value, recompute the density as `(L1 whole max − 15) / 3.13` and redo this table with the same
  formula.
- If L6 has rollers (rapids debris), it gets the +15 allowance and they use `source: 'coconut'`.

- Add `export const LEVEL_TICKET_CAP = { ... }` to `src/config/tickets.js` with these numbers once
  they are measured. `level-budget.test.js` (17) checks each level's declared maximum against it.
- Hub side: `LEVEL_END_MAX_AMOUNT = 20` and chunking (`hubBridge.js` ~451) already handle bigger
  clears; a 159-Ticket clear is 8 chunks. `CARRY_MAX = 100` is unchanged.

#### 10.5 How the test gets each level's maximum without Three.js

Each level module exports a static `BUDGET` object next to its build function:

```js
export const BUDGET = { field: 120, packs: 30, packTickets: null, zipped: 2, jackpots: 27, bark: 0, mystery: 2 };
```

- `level-budget.test.js` imports only these objects. That is fine as long as the level modules keep
  their Three.js imports lazy; if they don't, move `BUDGET` into the registry.
- The `T.budget()` dev command checks that `BUDGET` matches the built level and logs any difference.

---

### 11. DDA ladder

#### 11.1 Pure function (`src/game/dda.js`)

```js
export const DDA = { mask1: 3, slow: 5, pityCp: 7, mask2: 9, hazardMul: 0.92, bossDeaths: 3, bossTele: 1.15, bossWindow: 0.3 };
export function ddaFor(deathsAtCp, ctx) {
  if (ctx.trial || ctx.remix || ctx.rush) return { masks: 0, hazardMul: 1, pityCp: false };
  return {
    masks: deathsAtCp >= DDA.mask2 ? 2 : deathsAtCp >= DDA.mask1 ? 1 : 0,
    hazardMul: deathsAtCp >= DDA.slow ? DDA.hazardMul : 1,
    pityCp: deathsAtCp >= DDA.pityCp,
  };
}
export function bossDda(stageDeaths, ctx) {
  if (ctx.trial || ctx.remix || ctx.rush || stageDeaths < DDA.bossDeaths) return { teleMul: 1, windowAdd: 0, masks: 0 };
  return { teleMul: DDA.bossTele, windowAdd: DDA.bossWindow, masks: 1 };
}
```

- God mode gets the same table (deaths can't happen, so it never triggers).
- **DDA never touches bones.** It isn't an input to `runBones`.

#### 11.2 Applying it in `respawn()`

`respawn()` already increments `deathsAtCp` and calls
`this.setMask(this.deathsAtCp >= 3 ? 1 : 0)`. Replace that line with:

```js
const h = ddaFor(this.deathsAtCp, rewardCtx(this));
this.setMask(h.masks);
this.dda.hazardMul = h.hazardMul;
if (h.pityCp) this._activatePity();
```

- **Hazard slow-down:** entities marked `this.hazard = true` (chase pursuers, `CoconutRoller`,
  `Crusher`, `SwingHammer`, `FlipPlank`, rising hazards, rug-pull chains) get scaled time.
  `Stage.update` (`stage.js` ~284) loops over the entities. Pass
  `e.hazard ? dt * session.dda.hazardMul : dt`.
  - The `ChaseCat` and `Chaser` speeds and the crumble delay scale through the same `dt` (a slower
    clock).
  - Enemies are **not** slowed, which keeps reading their patterns consistent.
- **Reset:** `checkpoint()` sets `deathsAtCp = 0` (it already does) and `dda.hazardMul = 1`.
- **Pity checkpoint:** `k.pitySnacks(x, y, d)` places a dormant `PitySpot` entity (invisible, no
  collision).
  - `_activatePity()` finds the first dormant `PitySpot` with `d > cp d` and `d <` the next real Snacks'
    `d`. It replaces it with a real `Snacks` (`stage.add(new Snacks(...))`) and a smoke puff.
  - It is silent: no banner.
  - Once used, it stays a Snacks for the run. A rollback to an earlier checkpoint doesn't remove it
    (it's help).

#### 11.3 Worked example

- Five deaths at the lily pond: the first two respawn with 0 masks, the 3rd and 4th with 1 mask, the
  5th with 1 mask and hazards at 92%.
- Seventh death: the pity Snacks appears halfway through the section.
- Reach the pity Snacks: it is a checkpoint, so `deathsAtCp` is reset and hazards are back to 100%.

#### 11.4 Bosses

- `session.bossStageDeaths` is incremented in `onPlayerDeath` when `phase === 'boss'`, and reset to 0
  in `onBossPhase()`.
- In `respawn()`'s boss branch: `const bh = bossDda(this.bossStageDeaths, ctx); this.boss.dda = bh;
  this.setMask(Math.max(h.masks, bh.masks));`.
- `Boss` reads `this.dda.teleMul` and `this.dda.windowAdd` where it reads the `BOSS` table's `tele` and
  `window` (bosses spec), defaulting to `{ teleMul: 1, windowAdd: 0 }`.
- If boss DDA is active, the Speed medal for this fight is void (12.2).

---

### 12. Mastery layers

#### 12.1 Platinum Tag

- `TRIAL_TARGETS` (`src/config/trials.js`) gets a fourth number: `[gold, silver, bronze, platinum]`.
- `trialMedal(level, t)` checks platinum first:
  `t <= g[3] ? 'platinum' : t <= g[0] ? 'gold' : ...`.
- First-pass platinum values (seconds). Each is about the dev-best time + 5%. Set them from recorded dev
  runs before release.

  | Level (play order) | Layout 1 (now) | Layout 2 (extended, about 6.3 m/s over the new length) |
  | --- | --- | --- |
  | 1 | 50 | 86 (540 m) |
  | 2 | 47 | 82 (520 m) |
  | 3 | 41 | 70 (420 m) |
  | 4 | – | 76 (480 m) |
  | 6 | – | 71 (450 m, start to goal) |
  | 5 | – | 73 (460 m) |

  The levels spec owns the final gold, silver, bronze and platinum numbers. These are first passes so
  the medal logic can be tested.

- Every platinum target must be above the hub floor (`TRIAL_FLOOR_MS`); the test checks this.
- **L6 trial:** the run ends at the L6 goal instead of a boss gate. `_finishTrial()` is called from
  `reachGoal()` when `this.trial`. The trial is local only until the hub adds a variant for level 6,
  as for L4 and L5.
- UI:
  - `MEDAL` in `game.js` gains `platinum: '💎'`.
  - `trialDone` names: `PLATINUM TAG!`.
  - The target hint line adds `💎 m:ss.cc` **only after gold is earned**, so new players aren't put
    off.
- The hub stores times, not medals, so nothing changes on the hub side. `sanitizeTrial` recomputes the
  medal from `best`, so a save that already holds a time under the platinum target shows platinum
  straight after the update. That is intended.

#### 12.2 Boss medals

- At `startBoss()`, after `boss.start()`: `this.bossRun = { t: 0, noHit: true, void: false }`.
- In `update(dt)`, when `phase === 'boss' && !this.busy && boss.active`: add `dt` to `bossRun.t`.
  Cinematics and dialogue set `busy`, so they don't count.
- `onPlayerHurt()` (called from `Player.hurt()` when it returns true, and from `Player.die()`) sets
  `bossRun.noHit = false`. A mask absorbing a hit **counts as a hit**.
- Boss DDA activating (11.4) sets `bossRun.void = true`.
- In `onBossDefeated(boss)`, unless god mode or Wizard Hat applies (the hat skips the fight entirely,
  so nothing is awarded):

  ```js
  const m = save.data.bossMedals[key] ||= { clear: false, noHit: false, speed: false, bestMs: null };
  const ms = Math.round(this.bossRun.t * 1000);
  m.clear = true;
  if (this.bossRun.noHit) m.noHit = true;
  if (!this.bossRun.void && ms <= BOSS_SPEED_MS[key]) m.speed = true;
  if (!this.bossRun.void && (m.bestMs == null || ms < m.bestMs)) m.bestMs = ms;
  ```

- `BOSS_SPEED_MS` (first pass, in `config/difficulty.js`):
  `{ bird: 75000, cat: 85000, cone: 120000, titan: 130000, queen: 170000 }`.
- Respawning in a boss fight **doesn't reset** `bossRun.t`. The time covers the whole fight, deaths
  included, so a death almost always costs the Speed medal.
- **Map UI:** a boss list in the map panel when a level is selected, after the level is beaten:
  `MECHA BIRD ✓ · No-Hit ✗ · Speed 1:12 / 1:15 ✓`.
- Banner on defeat for a new medal: `NO-HIT MEDAL!` / `SPEED MEDAL!`, sound `'stamp'`.

#### 12.3 Perfect Run relic

- **Condition:** in one run of a main level (L6 included), every countable breakable broken, every dog
  freed and `deathsAtGate === 0`. Not in god mode, a trial or a remix.
- Checked at the gate and banked at `levelCleared`: `perfect[id] = true`.
- Map: a paw stamp over the level node.
- Tally: shown as an extra stamp after the board, `PERFECT RUN!`, sound `'invincible'`.
- The missed-backpack rain already shows `PERFECT!` when nothing was missed. With 0 deaths and all
  dogs freed, change that banner's subtitle to `...and not a single death! PERFECT RUN`.

#### 12.4 Remix bones (M5)

- A remix Session (`session.remix = true`) records only `remix[id].golden`, using the same Golden rule.
- `runBones` returns null for remixes, so the normal board is untouched.
- The remix map node shows its own single bone.

---

### 13. Tuning tools (dev only, `src/dev.js`)

#### 13.1 Death heatmap

- In `Session.onPlayerDeath(type)`, when `import.meta.env.DEV`, push
  `{ level, d, x, cause: type, t: Date.now() }`:
  - `d` and `x` come from `track.project(player.pos.x, player.pos.z)`.
  - The list goes to `localStorage['nobu-dev-deaths']`, capped at 2000 entries with the oldest dropped.
- `?heatmap` in the URL, or `T.heatmap(true)`, draws a red sprite (0.4 m, opacity 0.5) at each stored
  death for the current level. Redrawn on `startLevel`.
- `T.deaths(level)` returns counts grouped by `k.section` name: `{ 'Lily Pond': 12, ... }`.
- `T.clearDeaths()`.

#### 13.2 Section timers

- In `update(dt)`, when DEV, find the current section from `player.body.s` and accumulate
  `secTime[name] += dt`.
- At the gate, `console.table` the times plus deaths per section, and append them to
  `localStorage['nobu-dev-sections']`.
- **Use:** compare against the 30-second section target and the death targets in plan 4.4. Adjust
  `TIER` numbers, not entity literals.

#### 13.3 Playtest protocol

- 3 first-time players per level, no instructions beyond the in-game tutorials.
- Record the median deaths per level and per section, and the time per section.
- If the median is above the plan 4.4 target band, lower that level's tier by 0.5 (interpolate the
  `TIER` rows), and re-test. Below the band, raise it.
- Write the results into a dated `docs/playtest-YYYY-MM-DD.md`.

---

### 14. Interaction matrix

| | Chain | Mystery | Bones | Dogs and Kennel | DDA | Medals |
| --- | --- | --- | --- | --- | --- | --- |
| **Checkpoint rollback** | Chain reset; chain-drop spheres removed | Restored; spawned items removed; the same roll comes back | `snack.raw` restored from `cp` | `freedIds` restored from `cp` | Counts from `deathsAtCp` | Boss time keeps running |
| **Death** | Reset | — | `deaths++` (Good Boy) | — | Ladder step | No-Hit lost |
| **Treat Tray lost** | Reset | n/a (none in trays) | `snack.raw` restored from the round snapshot | — | — | — |
| **Time trial** | Counter only, no sphere, not saved | Becomes a plain backpack | Not awarded | Not saved | Off | n/a |
| **God mode** | Normal | Normal | Golden, Hidden and Snack only | Saved | n/a | Not awarded |
| **Wizard Hat** (bosses skipped) | Normal | Normal | Normal (the level clears) | Saved | Normal | Not awarded (no fight) |
| **Multi-tab** | — | — | OR / max merge (1.6) | Union | — | OR / min merge |
| **Hub Ticket queue** | No Tickets | 3 whole Tickets go through `addTickets`, so they are banked by the normal `hub.bank` | No Tickets | No Tickets | — | No Tickets |
| **Game over → continue** | New run | New `runSeed` | New run | Not saved until a clear | Fresh | New fight |
| **Ride stage (Roomba)** | Timer always runs | Allowed | 3-slot board | Saved | Normal | n/a |

---

### 15. Copy strings

Gather these in `src/story/script.js`, in a new `REWARD_TEXT` export, so they are in one place.

| Key | Text |
| --- | --- |
| `chainSphere` | `CHOMP CHAIN x8!` / `Sproto Mask!` |
| `chainBest` | `NEW BEST CHAIN` |
| `mysteryCat` | `SURPRISE!` / `RUN!` |
| `mysteryTickets` | `MYSTERY!` / `+3 Tickets` |
| `hiddenBone` | `HIDDEN BONE!` / `Shhh... it's a secret` |
| `boneGolden` | `GOLDEN BONE` |
| `boneGoodBoy` | `GOOD BOY BONE` / `{n} deaths` |
| `boneHidden` | `HIDDEN BONE` |
| `boneSnack` | `SNACK BONE {I | II | III}` / `{pct}% of Tickets` |
| `perfect` | `PERFECT RUN!` / `Every backpack, every dog, no deaths` |
| `kennelNew` | `KENNEL: {UNLOCK} UNLOCKED!` |
| `kennelGolden` (Sproto Mask) | `Every. Single. Dog. Nobu, the island owes you a lifetime supply of belly rubs.` |
| `gatedHint.dust` (before the Titan is met) | `A DUST WALL. Something in the Owner's House could break this...` |
| `gatedHint.dust` (after) | `A DUST WALL. Slide, then BITE mid-slide to DUST DASH through it.` |
| `gatedHint.moon` (before / after) | `Way too high... for now.` / `A MOON LEDGE. Hold JUMP to charge a MOON JUMP.` |
| `gatedHint.zoom` | `A ZOOMIE GATE. Hit the plate and SPRINT.` |
| `gatedHint.smog` | `A SMOG VENT. Maybe a really loud bark...` |
| `noHit` / `speed` | `NO-HIT MEDAL!` / `SPEED MEDAL!` |
| `secretLocked` | `GOOD BOY {n}% · reach 80% for the true ending` |
| `newGameConfirm` | `Start over? Trial bests, Platinum Tags, boss medals and Perfect Runs are kept.` |
| Map status, board complete | `Board complete! Good boy.` |

The ending line in `ENDING` (`script.js` ~39), `(Golden Bones still waiting, if you're a completionist.)`,
becomes `(The Kennel's still got room, if you're a completionist.)`. That is plan risk 2.

---

### 16. New synth sounds (`src/audio/audio.js`, `play()` switch)

| Name | Recipe (same helpers as nearby cases) | Used by |
| --- | --- | --- |
| `chainUp` | `_osc('square', 660*p, 1320*p, 0.08, 0.1)` + `_osc('triangle', 1320*p, 1980*p, 0.1, 0.06, 0.04)` | Chain 5 and 10, tally Best Chain |
| `stamp` | `_osc('sine', 90, 40, 0.22, 0.6)` + `_noise(0.12, 0.35, 0, 'lowpass', 1200, 200)` | Each bone stamp, medals |
| `sniff` | `_noise(0.12, 0.2, 0, 'bandpass', 1800, 3200, 4)` ×2, 0.15 s apart | Sniffer open |
| `kennel` | the `'invincible'` arpeggio at half volume | Golden Kennel |

Also: `'break'` and `'squash'` take the `p` pitch argument (2.3), and `'blip'` uses `p` for the
rising tally ticks.

---

### 17. Test cases

Each test file is named in plan 10.3. All of them are Vitest, with pure modules only. They use the
`helpers.js` `resetWorld()` that existing tests use.

#### `tests/bones.test.js`

| Case | Input | Expect |
| --- | --- | --- |
| Golden needs everything | `stats { breakables: 40, broken: 39, dogs: 5, dogsTotal: 5 }` | `golden: false` |
| Golden earned | broken 40/40, dogs 5/5 | `golden: true` |
| Golden with no breakables | `breakables: 0` | `golden: false` (same as today) |
| Good Boy at the limit | `deathsAtGate: 3` | `goodBoy: true` |
| Good Boy over | `deathsAtGate: 4` | `false` |
| Good Boy in god mode | `ctx.god`, deaths 0 | `false` |
| Snack tiers | `snackTier(84, 212)` / `(85, 212)` / `(128, 212)` / `(170, 212)` | 0 / 1 / 2 / 3 |
| Snack with no potential | `snackTier(5, 0)` | 0 |
| Trial | `ctx.trial` | `runBones` returns `null` |
| Never revoke | board `{ golden: true, snack: 3 }`, run `{ golden: false, snack: 1 }` | board unchanged, `fresh: []` |
| Stamp order | board empty, run `{ golden, goodBoy, snack: 2 }` | `fresh: ['golden', 'goodBoy', 'snack1', 'snack2']` |
| Old map kept in step | golden earned for `'2'` | `save.bones['2'] === true` |
| `nextGoal` priority | 2 backpacks missed in `Lily Pond`, deaths 5 | text names `Lily Pond` (rule 1 beats rule 2) |
| `nextGoal` Hidden gated | hidden missing, `move: 'dust'`, no dust | `you'll need a new move` |

#### `tests/good-boy-percent.test.js`

| Case | Expect |
| --- | --- |
| Fresh save, all shipped | `{ base: 0, mastery: 0, total: 0 }` |
| Everything on the base list | `base: 100` |
| Base max weight sum | `basePointsMax(all shipped, 54 dogs) === 95` (24 + 36 + 6 + 5 + 18 + 6) |
| Mastery max | `masteryPoints(everything) === 100`, total 200 |
| Worked example (9.1) | 26 points → `base: 27, total: 29` |
| Only L1–L3 and the bonus stages shipped (17 dogs) | max 46; all shipped items reach 100 |
| Milestones over the shipped total | thresholds 24, 32 and 42 ignored when 17 dogs are shipped |
| L6 in the base | `beaten['6']` gives 4 points; its board gives up to 6 |
| Floor | 94/95 shows 98, never 100 |
| Secret ending | `beaten['5']` and total 80 → `true`; total 79 → `false`; `beaten['6']` without `'5'` → `false` |

#### `tests/dda.test.js`

| `deathsAtCp` | Expect |
| --- | --- |
| 0, 2 | `{ masks: 0, hazardMul: 1, pityCp: false }` |
| 3, 4 | masks 1 |
| 5, 6 | masks 1, `hazardMul: 0.92` |
| 7, 8 | plus `pityCp: true` |
| 9, 20 | masks 2 |
| Any, with `ctx.trial`, `remix` or `rush` | all off |
| `bossDda(2)` / `bossDda(3)` | off / `{ teleMul: 1.15, windowAdd: 0.3, masks: 1 }` |

#### `tests/mystery.test.js`

| Case | Expect |
| --- | --- |
| Same seed, level and slot | the same id on 100 calls |
| Different slot | ids can differ (fixed seed gives a known vector; snapshot it) |
| Distribution | 100 000 rolls over seeds: each id within ±1.5% of its weight share |
| `tramp: false` | `tramp` maps to `sphere` |
| Rollback | a pure helper `mysteryResult(session-like, slot)` gives the same result after a "respawn" (same `runSeed`) |

#### `tests/level-budget.test.js`

- For every level `BUDGET` (10.5): `Math.floor(raw / 3) + coconut <= LEVEL_TICKET_CAP[id]`, with
  Mystery counted as tickets in the worst case.
- `LEVEL_TICKET_CAP` has an entry for every registry id, including `'6'`, with the 10.4 numbers.
- Coconut sources are only declared in levels whose cap includes the coconut allowance.

#### `tests/save-migrate.test.js`

| Case | Input (v2 on disk) | Expect after `save.load()` |
| --- | --- | --- |
| Arrays to maps | `beaten: [true, true, false], bones: [true, false, false], bestDogs: [5, 2, 0]` | `beaten: { '1': true, '2': true }`, `bones: { '1': true }`, `bestDogs: { '1': 5, '2': 2 }` |
| Board from bones | the same | `boneBoard['1'] = { golden: true, goodBoy: false, hidden: false, snack: 0 }`; no entry for `'2'` |
| Open from unlocked | `unlocked: 3, beaten: [true, false, false]` | `open` has `'1' '2' '3' 'ride'`, not `cave` |
| Bonus found | `bonus: { cave: { found: true } }` | `open.cave` |
| Dogs approximate | `bestDogs: [3, 0, 0]` | the first 3 L1 dog ids in `dogsFreed` (L1 lists 9 ids in the registry; only the first 3 are marked) |
| Trials untouched | the v2 trials fixture from `save-scores.test.js` | identical `trials` |
| Idempotent | load, write, load | equal objects |
| Bad v3 values | `boneBoard: { '1': { snack: 9 } }`, `dogsFreed: { 'x:y': true }` | `snack: 3`, `dogsFreed: {}` |
| Corrupt | `'{not json'` | `.corrupt` copy is kept (existing behaviour) |

#### `tests/multitab.test.js` (additions)

- Disk has `boneBoard['1'].hidden`, mine has `.goodBoy`: after `write()`, both are true.
- Disk `bossMedals.cat.bestMs` 70000, mine 80000: the result is 70000.
- Disk is a **v2** save with `beaten: [true, true, false]` and mine is v3: after the merge,
  `beaten['2'] === true`.

#### `tests/registry.test.js` (dog-id parts)

- Every dog id matches `DOG_ID`, is unique within its level, and `dogs` counts match the level budget
  notes.
- `totalDogs` equals the sum of the shipped levels' dog counts, and **54** with every level shipped
  (9 + 7 + 9 + 4 + 4 + 7 + 7 + 7).
- Unlock chain in play order: L4 opens L6, L6 opens L5; L6 has no boss key and grants no move.

#### `tests/trials-bounds.test.js` (additions)

- Every `TRIAL_TARGETS[l][3]` (platinum) is above `TRIAL_FLOOR_MS[l] / 1000`, below gold, and positive.
- `trialMedal(1, 49.9) === 'platinum'`; `trialMedal(1, 50.1) === 'gold'` (layout-1 numbers).

---

### 18. Gaps in the plan, and how this spec resolves them

1. **"Seeded per level and slot" (plan 3.3)** would give the same result forever. The seed here is
   **per run**: death never rerolls, a new run does. That keeps the variable reward the plan wants.
2. **Hidden Bone timing.** The plan doesn't say when it is saved. It saves at pickup, like colored
   bones, not at clear.
3. **God mode and bones.** The plan doesn't say. Good Boy, Perfect, medals and Platinum are off in god
   mode; Golden, Hidden and Snack stay on, as the Golden Bone does today.
4. **Snack Bone denominator.** The plan says "% of the level's Tickets." It is defined here in raw
   pickups, excluding coconuts, Mystery, jackpots and Bark Rocks, so the percentage can't be inflated
   and gated content doesn't count.
5. **"Chain counts toward a cosmetic Kennel milestone" (plan 3.2)** became **chain badges**: 5 badges
   unlock the `chompGold` fur tint. The dog-count milestones stay as the plan lists them.
6. **"Off in trials" for the Chain (plan 3.2)** keeps the counter visible, as the plan says, but no
   sphere drops and nothing is saved.
7. **Boss medal versus DDA.** The plan doesn't say. Boss DDA voids the Speed medal for that fight; a
   death already costs No-Hit.
8. **`beaten` keyed by id (plan 10.1)** touches about 10 call sites in `game.js` (`mapOpen`, the map
   draw, the trial key, `levelCleared`, credits) and `player.js` `abilities`. `unlocked` stays a
   number during M0 so the change is incremental, and `open` takes over from M0 on.
9. **New Game** keeps mastery records (medals, Perfect, Platinum) as well as trial bests. The plan
   only names trial bests; this extends the same reasoning.
10. **The secret ending at 80%** uses `total` (base + mastery). The base track alone reaches 80%, so
    mastery is never needed.
11. **Level 6 (owner scope change)** is a main level with no boss.
    - It is cleared at a goal, through the new `goalLevelCleared()`.
    - It counts fully in the base track (story clear plus a six-bone board).
    - It has a trial, Platinum Tag, Perfect Run and Remix bone.
    - It gives no move and no boss medal.
    - Its id stays `6`, though it is fifth in play order.
12. **Kennel thresholds** moved from 5 / 10 / 15 / 20 / 25 / all to 8 / 16 / 24 / 32 / 42 / all, for
    54 dogs. The unlock items and their order are unchanged.

---

# Part 4: Bosses spec

Source: `docs/expansion/bosses-spec.md`

## NOBU boss spec: five bosses, stage by stage

Status: **implementation spec, no code changed.** It adds detail to plan sections 4.1, 4.2, 4.3, 7 and 9 of
`docs/gameplay-expansion-plan.md` and keeps every decision there. Where the code disagreed with the plan,
the fix is listed in section 9.

Code read for this spec, at `bfb4a33`: `src/bosses/common.js`, `mechaBird.js`, `bigCat.js`, `evilCone.js`,
`autorig.js`, the arena builders in `src/levels/level1-3.js`, the boss hooks in `src/game/session.js`
(`startBoss`, `onBossPhase`, `onBossDefeated`, respawn), `src/player/player.js`, `src/entities/props.js`,
`src/entities/ride.js`, `src/camera/camera.js`, `src/story/script.js` and `src/audio/audio.js`.

---

### 0. Conventions

- **Units:** metres and seconds. Arena centre is `(0, 0, 0)`. The camera sits on the `+z` side, so keep
  `z > 6` clear of tall props, as every current arena does.
- **Stage** and **phase** mean the same thing. The code calls it `this.phase` (1-based).
- **Difficulty values** come from `BOSS[key]` in `src/config/difficulty.js` (plan 4.1). In this spec:
  - `tele` is the wind-up multiplier for the current stage. A tell listed as `0.9 s × tele` lasts
    `0.9 × BOSS[key].tele[stage-1] × dda.tele` seconds.
  - `sp` is the speed multiplier (`BOSS[key].speed[stage-1]`). It replaces the `get sp()` literals.
  - `W` is the punish window (`BOSS[key].window[stage-1] + dda.window`).
  - `chain` is `BOSS[key].chain[stage-1]`.
  - Every computed tell is clamped to `FLOOR.teleSec` (0.40 s) and every window to `FLOOR.windowSec`
    (0.90 s).
- **Damage:** every boss hit costs one hit, just like today: a mask, then the Golden Collar, then a life.
  The `hurt(type)` argument only picks the death animation:
  - `'angel'`: burns, beams, swipes.
  - `'flat'`: anything that lands on Nobu.
  - `'cone'`: grabs and the cone.
  - `'puff'`: sucked in or blown up.
- **Hitbox notation:**
  - `disc r`: horizontal distance under `r`, and Nobu's height above the boss floor (`p.pos.y - ground`)
    under the given `h`.
  - `seg w`: within `w/2` of a line segment.
  - `ring r0–r1`: an annulus.
  - The existing projectiles keep their current colliders, listed as "existing" below.
- **Status effects** are new and need player state:
  - `trapped`: Bird Cage Drop.
  - `coned`: Cone of Shame.
  - `pulled`: any tractor or suction. This already exists as `p.pushX` / `p.pushZ`.

---

### 1. Shared boss system (`src/bosses/common.js` and friends)

#### 1.1 Reading difficulty

```js
// common.js (Boss)
import { BOSS, FLOOR } from '../config/difficulty.js';
constructor(stage, x, y, z, { name, portrait, key }) {
  const D = BOSS[key];
  super(...);
  this.key = key;
  this.maxHp = D.hp; this.hp = D.hp; this.phaseHp = D.perStage;
  this.stages = D.hp / D.perStage;          // 3, or 4 for the Queen
  this.dda = { tele: 1, window: 0 };         // set by the session (1.6)
}
get D() { return BOSS[this.key]; }
get sp() { return this.D.speed[this.phase - 1]; }
tele(base) { return Math.max(FLOOR.teleSec, base * this.D.tele[this.phase - 1] * this.dda.tele); }
get W() { return Math.max(FLOOR.windowSec, this.D.window[this.phase - 1] + this.dda.window); }
get chainLen() { return this.D.chain[this.phase - 1]; }
```

- **M0:** port only `hp`, `perStage`, `speed` and `window`. These are the values already in the code:
  - Bird: `stuck` 2.7 / 2.4 / 2.2 and `sp` 1 / 1.2 / 1.4.
  - Cat: `dizzy` 2.8 / 2.4 / 2.0 and `sp` 1 / 1.2 / 1.45.
  - Cone: `overheat` 1.8 / 1.4 / 1.1 and `sp` 1 / 1.25 / 1.5.

  In M0, `tele` and `chain` are 1 for these three bosses (plan 4.1). M2 switches on the table values.
- Each boss file replaces its local `get sp()` and its window literals with `this.sp` and `this.W`. The
  Bird's `const sp = this.phase === 3 ? 1.4 : ...` in `ai()` becomes `const sp = this.sp`.

#### 1.2 The `chain` runner

Today each attack ends by calling `nextAction()` (Bird), `toHover()` (Cone) or `toStalk()` (Cat). M2 routes
every ending through one method, so a chain can follow without the idle gap.

```js
// common.js (Boss)
// CHAINS: per-stage list of combos, each an array of attack state names, defined by each boss.
// A chain plays its attacks back to back, skipping each attack's idle tail (the "+0.4..0.8 s" after it).
pickChain() {
  const list = (this.CHAINS?.[this.phase] || []).filter((c) => c.length <= this.chainLen);
  return list.length ? pick(list) : null;
}
startChain(combo) { this.chainQ = combo.slice(1); this.chained = true; this.beginAttack(combo[0]); }
endAttack() {
  const graceOk = this.sinceHurt > 0.5;            // plan 4.2: never chain within 0.5 s of a hit on Nobu
  if (this.chainQ?.length && graceOk && !this.game.player.dead) {
    this.beginAttack(this.chainQ.shift());
    return;
  }
  this.chainQ = null; this.chained = false;
  this.afterAttack();                              // subclass: nextAction() / toHover() / toStalk()
}
onPlayerHurt() { this.sinceHurt = 0; this.tookHitThisFight = true; }   // also feeds the No-Hit medal
update(dt) { this.sinceHurt = (this.sinceHurt ?? 9) + dt; ... }
```

- **Where chains come from:** a plan entry can be the token `'chain'`. When `nextAction` / `chooseAttack`
  draws it, it calls `startChain(this.pickChain())`, and `beginAttack` falls back to the next plan item if
  there is no combo. Plans in this spec write chains inline as `'chain'`, and each boss's `CHAINS` table
  lists the combos.
- **A chained attack keeps its full tell.** Only the idle tail before the next attack is cut. Fairness
  comes from the tell, so it is never shortened.
- **A chain never starts or continues** while a punish state (stuck, tired, dizzy, overheat, stunned,
  pumped) is running, or while the ultimate is charging or running.
- **Hook:** `Player.hurt()` returns `true` when a hit landed. Right after that, call
  `this.game.session?.boss?.onPlayerHurt?.()`. Put it in the shared exit of `hurt`, so a mask loss, a
  collar save and a death all count.

#### 1.3 Generalising evolve to four stages

The Pump Queen has 4 stages, but `common.js` assumes 3 in four places:

| Line in `Boss` | Now | Change to |
| --- | --- | --- |
| `chargeTimes = [0, 26, 20, 15]` | indexed by `Math.min(3, this.phase)` in `update` | `[0, 26, 20, 15, 12]`, indexed by `Math.min(this.stages, this.phase)` |
| `stageScale = [1, 1, 1.12, 1.24]` | | `[1, 1, 1.12, 1.24, 1.32]` (the Queen overrides it) |
| `stageColors = [0, 0, c2, c3]` | | allow index 4 |
| `stageAura`: `rate = this.stageLook === 3 ? 16 : 6` and `if (this.stageLook === 3 ...)` flames | | `this.stageLook >= 3` for both |

- `makeStageParts()` may return `{ 2: [...], 3: [...], 4: [...] }`. `setStageLook` already loops over the
  keys, so no change is needed there.
- In `session.onBossPhase`, `this.info.spheres?.[phase - 1]` needs a 4th entry for the Queen's arena.
- `bossHp(hp/maxHp, phase)` in `ui.js` must draw 4 pips when `boss.stages === 4`. Check `ui.bossHp`.

#### 1.4 Phase checkpoints for every boss

- Respawn calls `this.boss.resetToPhase(phase)` with
  `phase = this.def.bossKey === 'cone' ? this.bossPhaseCp : 1`. **Today only the Evil Cone keeps phase
  checkpoints.** The Bird and the Cat restart at stage 1 after a death.
- The plan (4.2) assumes checkpoints exist for all bosses. Change the line to
  `const phase = this.boss.phaseCheckpoints === false ? 1 : this.bossPhaseCp;`, with the default
  `true`. The longer, harder fights in this spec depend on it.
- This makes the Bird and the Cat slightly easier than today. The new stage powers and the DDA ladder
  rebalance them; check it in the playtest (section 8). Raised as owner question 1 in section 9.
- Every new arena change must undo itself in `onResetPhase()`: tiles back, pedestals reset, ledges
  reset, lights on, walls back.

#### 1.5 New shared projectiles and arena pieces

These go in `Projectiles` (`common.js`) unless a file is named. Each one follows the existing pattern:
`_add({ mesh, update })`, cleaned up in `clear()`, and never allocating per frame.

| Name | Used by | Behaviour | Hitbox | Avoid |
| --- | --- | --- | --- | --- |
| `coconut(pos, dir, o)` | Bird Perch Peck | Alias of `roller` with `radius 0.7`, `color 0x7a4a22`, `life 4`, `bound 11.5`. Rolls in a straight lane. | existing roller | step out of the lane, or jump |
| `cage(x, z, o)` | Bird Cage Drop | Falls from the bird to a marked spot. On landing it traps Nobu if he's within `disc 1.1, h 1.2`, then stays 4 s as solid cover (an AABB `1.6 × 1.8 × 1.6`) that blocks beams and feathers. | trap: `disc 1.1` | leave the shadow marker |
| `scratch(a, b, life)` | Cat stage 2 | A lingering pink line on the floor. | `seg 0.35`, `h 0.4` | jump over, or wait the 3 s |
| `falling(x, z, o)` | Cat table objects, Titan legs, Queen airdrops | A generalised `dropCone`: a marker grows for `delay`, then a mesh falls. `o.kind` is `backpack`, `cat`, `leg` or `crate`. | `disc o.r`, `h 1.6` | leave the marker |
| `debris(pos, dir, speed)` | Titan ultimate | A reskinned `cone()`: a sock or crumb card mesh. | existing cone | weave |
| `cableArc(pivot, len, a0, a1, w)` | Titan Cable Whip | A line from the pivot sweeping from `a0` to `a1`. | `seg 0.5`, `h 0.6` | jump it |
| `slowHomer(pos, o)` | Cone of Shame | A `missile` with `speed 4.5`, `turn 1.2`, `life 5`. On hit it calls `p.cone(3)` instead of `hurt`. Bite to pop it (missiles already allow this). | `disc 0.7` | outrun it, or bite it |
| `wakeRing(x, z, o)` | Queen stage 4 | A static ring wall around the Queen, `r 3.4`, `h 2.2`. It hurts on contact, but Dust Dash passes through. | `ring 3.2–3.6`, `h 2.2` | Dust Dash through it |

New arena-only entities, in `src/bosses/arena.js` (new):

- `ArenaTiles(stage, { cols, rows, size, y })`: a grid of floor tiles that each take part in collision.
  - `flip(i, j, t)` shimmers a tile, drops it, then raises it again after `t`.
  - `crumbleRing()` turns the edge tiles into crumble tiles.
  - `reset()` restores everything.
  - The Cone's Rug Pull, the Cat's crumbling edge and the Queen's outer ring use it.
- `CandlePillar(stage, x, z, o)`: a `MovingPlatform`-style solid driven by the boss.
  - `.target` is its height. It is coloured green while rising and red while sinking.
  - The boss sets its height every frame; the pillar damps toward it. It carries Nobu the way moving
    platforms already do.
- `Pedestal(stage, x, z, { r, h })`: rises from the floor over 1 s. Used for the Cone's Smog Tide.
- `ConveyorZone(stage, rect, dir, speed)`: pushes Nobu while he stands inside its rectangle. It uses the
  existing ground `conveyor` handling, or sets `p.pushX`/`p.pushZ`. Used for the Titan's rug.

#### 1.6 Boss DDA (plan 4.3)

- `session.bossDeaths[phase]` counts deaths in each stage. On respawn:
  - If it is **3 or more**, set `boss.dda = { tele: 1.15, window: 0.3 }` and respawn with 1 mask.
    `setMask(1)` already happens for the level pity mask; reuse it.
  - Otherwise set `boss.dda = { tele: 1, window: 0 }`.
- **DDA is off** (it stays `{1, 0}`) in the boss rush, in Smog Remix boss fights and when God Mode is on
  (God Mode can't die anyway).
- **If DDA ever helped during an attempt, that attempt can't earn a medal.** Set
  `session.bossDdaUsed = true` and check it in 1.7. This is how the plan's "off in medal runs" works
  without a separate medal mode.

#### 1.7 Medals

- **Timing:** start `session.bossClock` at `boss.start()`. Pause it while `session.busy` is true (evolve
  cinematics and dialogue) and while the game is paused. Stop it in `onBossDefeated`.
- **No-Hit:** awarded if `boss.tookHitThisFight` stayed false (1.2). Losing a mask counts as a hit. Pit
  deaths count too: they call `die()`, so hook `die()` as well.
- **Speed:** awarded if `bossClock ≤ target` (table below).
- Results go to `save.bossMedals[key] = { clear: true, noHit, speed, bestMs }`. Medals only ever turn on,
  never off.
- Banner on the defeat cinematic: `NO-HIT!` and/or `SPEED MEDAL` under the victory text.

| Boss | Speed target (fight clock) | Notes |
| --- | --- | --- |
| Mecha Bird | 70 s | 6 hits; about 3 dives and 1–2 tired stops per stage |
| Big Cat | 80 s | the dizzy windows are long, but the attack pool is random |
| Evil Cone | 110 s | 9 hits; the overheats come at fixed plan slots |
| Roomba Titan | 120 s | 9 hits; luring it into the TNT in stage 3 is the slow part |
| Pump Queen | 170 s | 12 hits, 4 stages |

These are first passes. Set them from 3 dev clears at about the median of the best two, plus 10%.

#### 1.8 New player hooks the bosses need (`src/player/player.js`)

| Hook | Add | Used by |
| --- | --- | --- |
| `trap(sec)` | Sets `mode = 'trapped'` and `trapT = sec`, and freezes horizontal movement. Each `bite` press takes 0.25 s off `trapT`. Pressing `slide` escapes at once, but only in the first 0.3 s (a fast reaction). Gravity stays on. Not allowed while `invulnT > 0` or invincible. A mask does **not** prevent it: being trapped isn't damage. | Bird Cage Drop |
| `cone(sec)` | If `session.mask > 0`, lose a mask instead and return. Otherwise `conedT = sec`: bite is disabled, a cone mesh goes on Nobu's head (reuse `this.deathCone`), and the HUD vignette is on. A belly flop landing or a double jump clears it at once. | Cone of Shame |
| `onDash` contact | During Dust Dash, any entity overlapped gets `e.onDash?.(this)`, called from the same loop that calls `onSlide`. | Dust Walls, the Queen in stage 4 |
| `abilities.dustDash`, `abilities.moonJump` | `get abilities()` adds `dustDash: beaten('titan')` and `moonJump: beaten('queen')`. These read the save v3 keyed `beaten`. | 5.7, 6.7 |

---

### 2. Mecha Bird (tier 1, `src/bosses/mechaBird.js`)

#### 2.1 Numbers

| | Stage 1 | Stage 2 OVERCLOCKED | Stage 3 HYPER MECHA |
| --- | --- | --- | --- |
| HP left at start | 6 | 4 | 2 |
| `sp` | 1.00 | 1.20 | 1.40 |
| `tele` | 1.00 | 0.88 | 0.78 |
| `W` (stuck after a dive) | 2.7 | 2.4 | 2.2 |
| `tired` vulnerable time | (not in plan) | `W - 0.1` = 2.3 | (not in plan) |
| `chain` | 1 | 1 | 2 |
| Ultimate charge time | 26 s | 20 s | 15 s |

#### 2.2 Attack catalogue

"Existing" means the behaviour and numbers in the code today. Only the scaling changes (`sp`, `tele`, `W`).

| Attack (state) | Stages | Tell | Active | Hitbox | Avoid | Punish | Chain tags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `aim` → `dive` (existing) | 1–3 | Marker tracks Nobu, then locks at `lockAt - 0.3`. Bird rears back, wings high, `bossRoar`. `lockAt` = 1.1 s × tele in stage 1, 0.85 s × tele in stages 2–3 (now `0.85 × tele`, i.e. 0.75 / 0.66). | Dive at `24 × sp` m/s; shockwave on impact (`7, 5`). | Body `disc 1.8` around the bird during the dive. | Leave the marker after it locks. | **`stuck` for `W`**: bite or stomp. | end of any chain |
| `gust` (existing) | 1, 3 | Perches at the edge, wings raised 0.8 s × tele, `charge`. | 2.8 s of wind, pulses on each downstroke; force `(2.2 + beat × 3.4) × (1.15 in S3)`, fading near the edge. | Push only (no damage). | Hold against it and move sideways. | none | none |
| `volley` (existing) | 2, 3 | Wings cock back for `0.65 / sp` s, purple sparkles. | 5 feathers (7 in S3) in a fan at `10.5 × sp`. | existing feathers | Jump, or stand in a gap between feathers. | none | `laser>volley` |
| `laser` (existing) | 2, 3 | Perch, `charge`, thin dim beam for `0.75 / sp`. | Sweeps `1.7 / sp`. Two sweeps in S3, reversing. | Beam hot spot (`Beam.hits`) | Jump the line. | none | `laser>volley` |
| `tired` (existing) | 2 | Crash-lands for 0.6 s. | Vulnerable `W - 0.1`. | — | — | **bite or stomp** | never chained |
| `missiles` (existing) | 3 | Climbs, pods open. | 3 homing rockets, `0.45 / sp` apart. | existing missile | Outrun them, or bite to pop. | none | none |
| `eggs` (existing) | 3 | Strafe overhead; eggs swell and blink. | 4 eggs, fuse `2.3 / √sp`, r 2.2. | existing egg | Leave the warning ring. | none | `eggs` then **crater** (below) |
| `bomb` (existing) | 3 | Flies over Nobu. | 6 cones, leading his path, delay `0.95 / sp`. | existing dropCone | Keep changing direction. | none | none |
| **`perch` Perch Peck (new)** | 1–3 | Flies to the nearest perch palm (2.5). Lands, head bobs. Each peck is a 0.5 s × tele wind-up (head pulled back, `knock` on contact). | 3 / 4 / 5 coconuts, one per peck, each rolling down a lane at `6 × sp`. | `coconut` (1.5) | Read the lane from the perch's facing, then step aside or jump. | none (this is the teaching attack) | none |
| **`cage` Cage Drop (new)** | 2–3 | Hovers over Nobu's shadow at y 6. The cage swings hard; a marker `r 1.1` grows; `whirr` → `beep`. The marker locks after 0.9 s × tele. | The cage drops in 0.35 s. | `cage` (1.5): **trap** 1.2 s (1.8) | Leave the marker. If trapped, mash bite or tap slide early. | Not a punish for Nobu. The cage then stays 4 s as **cover from lasers**. | `cage>aim` (S3) |
| **`escort` Drone Escort (new)** | 3 | At the start of each stage-3 plan loop: the bird `bossRoar`s and 2 `ConeDrone`s blink in at its side. | The drones orbit at `r 2.5`, `y = bird.y - 0.5`. **During each `dive`** each drone fires one `feather` at Nobu (`speed 9`). | existing feather | Jump, or keep moving. | **Bite a drone** (it can be reached while the bird is stuck or tired, because the drones stay low): it drops a Blue Sphere (`countable = false`), **at most 1 per stage**. | none |
| `ultimate` Sky Fall (existing, upgraded) | 1–3 | Over the middle; powers up for 1.5 s. | **S1:** 3 waves of a feather ring plus a cone ring around Nobu. **S2:** a laser sweep between waves 1 and 2 (reuse `_aimLaser`). **S3:** 4 waves; after the last wave, 2 homing rockets, then the dive. | existing | Jump the feather rings; stay in the gaps between cones. | Ends with a guaranteed `aim` → `dive`, so the payoff is a `stuck`. | never chained |

**Egg craters (S3 arena change):** each egg explosion leaves a scorched decal (`r 1.3`) for 6 s. Standing on
it hurts (`'puff'`, only while `p.pos.y < 0.3`). The floor is one solid block, so the "pits" are damage zones
rather than real holes. That is a deliberate simplification of plan 7.2.

#### 2.3 Plans (`nextAction`)

```js
if (this.phase === 1) this.plan = ['circle', 'aim', 'circle', 'perch', 'aim', 'gust', 'aim'];
else if (this.phase === 2) this.plan = ['circle', 'volley', 'laser', 'circle', 'cage', 'aim', 'perch', 'volley', 'tired', 'aim'];
else this.plan = ['escort', 'circle', 'missiles', 'aim', 'eggs', 'chain', 'aim', 'gust', 'cage', 'perch', 'bomb', 'aim'];
// chain combos (only used when chainLen >= 2, i.e. stage 3)
this.CHAINS = { 3: [['laser', 'volley'], ['cage', 'aim']] };
```

- `escort` is skipped if both drones are still alive.
- Every loop still ends on an `aim` → `dive`, so every loop has a punish. In the S3 combo `cage>aim`, the
  cage traps first and the dive follows. Fairness: the dive tell is `0.85 × 0.78 ≈ 0.66 s` after the trap
  ends, and the trap is 1.2 s at most and escapable, so the dive can always be avoided once free. The
  0.5 s grace (1.2) does not apply here, because being trapped isn't damage.

#### 2.4 Arena changes (`buildBoss1Arena` in `src/levels/level1.js`)

| Stage | Change | Coordinates | Built when | Reset |
| --- | --- | --- | --- | --- |
| 1 | **2 perch palms** inside the arena edge, each with a solid trunk collider (`0.8 × 6 × 0.8`). Bird perch point at `y 6.2`. | `(-10.4, 0, -6)` and `(10.4, 0, -6)` (outside the camera side) | Built in the arena; there from the start | none |
| 2 | **Wind lanes:** two 3 m strips along z, at `x = -5` and `x = +5`. The left one pushes `+x`, the right one `-x`, at 3.0 m/s. **On 3 s / off 3 s.** Each turns on 0.6 s after a leaf-streak tell. | strips from `z -11` to `z 8` | `beginPhase()` at stage 2 | `onResetPhase` for stage 1 |
| 3 | **Egg craters** (2.2). The drones' orbit space. | — | — | Craters cleared by `projectiles.clear()` |

Plus the existing spheres: `info.spheres` = `[(-9,0,9), (9,0,9), (0,0,-9)]`. One spawns per stage
(`onBossPhase`).

#### 2.5 Evolve parts, copy and audio

- **Existing parts** (`makeStageParts`): S2 head crest, red visor eyes, wing jet flames. S3 wing blades,
  plasma afterburner, spinning halo. **New:** S3 drone docking clamps under the wings (2 small grey boxes);
  the drones launch from there.
- `stagePowers` (shown on the evolve banner):
  - 2: `'Feather volleys · laser eye · cage drop · wind lanes'`
  - 3: `'Homing missiles · egg bombs · drone escort · laser combos'`
- New sounds, as synth cases in `audio.js`:
  - `cageRattle`: a short metallic tremolo; 'clang' plus noise.
  - `peck`: a dry tick and a thunk; similar to `knock`.
- **BOSS_TALK.bird** additions:
  - After the existing `phase2` line: `['mask', 'It drops the CAGE where your shadow is. Keep moving! Stuck? Mash BITE!']`
  - After the existing `phase3` line: `['mask', 'Those drones fly low. Bite one for a Blue Sphere!']`

#### 2.6 Files and functions

- `mechaBird.js`:
  - `nextAction` (the plans above).
  - `ai` gets new cases `perch`, `cage` and `escort`; `aim` gets the tele and lockAt changes.
  - `ultimate`: the per-stage upgrades.
  - `onResetPhase`: kill the drones and remove the cage.
  - New `beginPhase()`: wind lanes on or off.
  - `onHit`: hide the cage marker.
- `common.js`: `coconut`, `cage`, craters (an `eggBomb` option `crater: true`).
- `level1.js` `buildBoss1Arena`: perches and the wind lane strips (as data passed to the boss in `info.perches` and `info.windLanes`).
- `player.js`: `trap()`.

#### 2.7 Playtest checklist

- [ ] On a first try, stage 1 is beaten in 3 deaths or fewer. Perch Peck lanes can be read from the
  perch's facing.
- [ ] The cage marker can always be left after it locks; trap escape by mashing averages about 0.6 s.
- [ ] Wind lanes never push Nobu into an active marker with no way out. Test cage over a lane.
- [ ] The drone sphere drops at most once per stage.
- [ ] Every S3 loop still contains at least 2 `stuck` openings.
- [ ] The phase checkpoint (1.4) respawns at the right stage, with lanes on or off correctly.
- [ ] No-Hit is possible; dev run time is logged against the 70 s Speed target.

---

### 3. Big Cat (tier 2, `src/bosses/bigCat.js`)

#### 3.1 Numbers

| | Stage 1 | Stage 2 FERAL | Stage 3 NINE LIVES |
| --- | --- | --- | --- |
| HP left at start | 6 | 4 | 2 |
| `sp` | 1.00 | 1.20 | 1.45 |
| `tele` | 0.95 | 0.84 | 0.74 |
| `W` (dizzy) | **2.7** (was 2.8; see conflict 2 in section 9) | 2.4 | 2.0 |
| `chain` | 1 | 2 | 2 |
| Pounces per countdown (`pouncesLeft = this.phase`) | 1 | 2 | 3 |

#### 3.2 Attack catalogue

| Attack (state) | Stages | Tell | Active | Hitbox | Avoid | Punish | Chain tags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `countdown` → `leap` (pounce, existing) | 1–3 | A crouch with a growing butt wiggle (`hiss` on the first beat). Beat = `0.95 × tele / sp` for the first pounce, `0.55 × tele / sp` for follow-ups. The marker tracks Nobu until beat 2, then locks. | Leap of `0.75 / sp` s, apex 5 m. Shockwave on landing from S2 (`7 + stage, 8`). | Landing `disc 2.4`, `h 1.6`. | Leave the marker after it locks. | A miss after the last pounce → **`dizzy` for `W`**: stomp the head or bite. | `claws>pounce` (S2), `dot>pounce` (S3) |
| `swipeUp` → `swipe` (existing) | 1–3 | Paw raised for `0.55 × tele / sp`. | 0.18 s. | A cone in front: `r 4.4`, `dot > 0.25`, `h 2.2`. | Back off or jump behind. | none (counts toward the `sinceVuln` pounce guarantee) | none |
| `cough` hairballs (existing) | 1–3 | Hunched cough for `0.75 / sp`, `meow`. | 3 / 4 / 5 hairballs in a fan, speed `6.5 + stage × 0.8`. | existing hairball | Weave, or jump. | none | `tailspin>cough` (S2) |
| `yarn` (existing) | 1–3 | Bat wind-up for `0.75 × tele / sp`. | 1 roller (2 in S3) at `6.5 + stage × 1.2`. | existing roller | Jump over, or bounce on it. | none | `yarn>claws` (S3) |
| `claws` (existing) | 2–3 | Rears up for `0.7 × tele / sp`, `hiss`. | Slams; 3 claw waves (4 in S3); 2 volleys in S3. **New: each wave leaves a `scratch` along its path for 3 s.** | existing clawWave, then `scratch` (`seg 0.35`) | Jump the waves; route around the scratches. | none | `claws>pounce`, `yarn>claws` |
| `tailspin` (existing) | 2–3 | Crouch plus a ring marker for `0.6 × tele / sp`. | 2 / 3 turns at `7.5` / `9` rad/s. | `ring 1.4–4.9`, `±0.4 rad` around the tail, `h 0.8`. | Jump the tail, or stand under 1.4 m (risky) or over 4.9 m. | none | `tailspin>cough` |
| `zoomies` (existing) | 3 | A lane telegraph for `0.5 × tele / sp` per dash. | 3 dashes at 19 m/s. | `disc 2.0`, `h 2.0`. | Step out of the lane. | The last dash → **`dizzy` for `W`**. | never chained |
| **`dot` Laser Pointer (new)** | 1–3 | A red dot (`glowPart(0xff2030, 0.6)` on the floor) appears 2 m in front of the cat; its ears snap forward (`pose('crouch')`); `beep`. The dot moves through 4 waypoints, 0.7 s / sp each. Each waypoint = Nobu's position at the time, offset sideways by ±3 m (alternating), clamped to ±11.5. **The last waypoint is Nobu's exact position** at that moment. | The cat pounces onto the dot twice: after waypoint 2 and waypoint 4. Each pounce has a 0.55 s × tele crouch, and the marker locks 0.3 s before the leap. Leap as `leap`. | as pounce | Keep moving off the dot's line; dodge sideways at the last lock. | A miss → `dizzy`. **If the final landing is within 1.5 m of a wall** (`|x|` or `|z| > 10.5`), it **slams into the wall: `dizzy` for `W + 0.6`**. Leading the dot to a wall is the skill. | `dot>pounce` (S3) |
| **`table` Knock It Off the Table (new)** | 2–3 | The cat leaps (as `leap`, 0.75 / sp) onto a ledge (3.4), sits, tail flicks. Each bat is a paw wind-up of 0.5 s × tele, and a shadow marker grows where the object will land. | 3 objects in S2, 4 in S3, 0.7 s apart. Each is a `falling` with delay 0.9 s × tele: mostly backpacks (`r 1.0`, hurt `'flat'`, and the backpack stays as a non-countable breakable, free to bite); **1 per volley is a Cat (TNT)** that lands, `hiss`es, and explodes after 3 s (`r 2.3`, the existing Cat TNT logic). | `disc 1.0` / TNT `r 2.3` | Leave the markers; run from the TNT. | none, but the cat jumps down to the centre afterwards with a 0.8 s landing lag (`landT`) and **no** vulnerability | none |
| **`ghost` Ghost Lives (new)** | 3 | Each hit in stage 3 spawns a translucent cyan cat (`model_ghost_cat` → `small_cat` ×1.6) at the `leapFrom` of the cat's **last pounce**, with a `yowl` echo (pitch 1.4). | 1.5 s later the ghost repeats that leap: same start, same target, same timing. At most 2 ghosts. Each disappears after its leap. | `disc 1.8`, `h 1.4` | Remember where the last pounce landed and keep off that spot. | none | runs alongside (not part of the chain) |
| **Catnip (new)** | 3 | At the start of stage 3, and again 20 s after the last one was used, a catnip bush (procedural: green toon cones and sparkles) grows at a `freeSpot` 6–9 m from the cat, with `chime`. | **Nobu bites it** → the cat goes **catnip-crazy for 8 s**: `sp × 1.25`, and its dizzy window becomes `W × 2`. | — | It's optional. | Riskier but faster: two long dizzy windows become possible. | — |
| `frenzy` Nine Lives Frenzy (existing, upgraded) | 1–3 | Walks to the centre and charges up for 1.3 s (pink). | 4 pounces (5 in S3), aim `0.5 × tele / sp`, leap `0.55 / sp`, each landing with a shockwave and a ring of 6 hairballs. **S2+:** every landing leaves a **scratch star** (4 `scratch` lines, 2.5 m long, 3 s). **S3:** the ghost lives copy the **final** pounce. | as pounce | Leave each marker; jump the shockwaves. | Ends in `dizzy` for `W + 1.2` (`longDizzy`, existing). | never chained |

#### 3.3 Pools (`chooseAttack`)

```js
const pool = ['pounce', 'pounce', 'cough', 'yarn', 'dot'];
if (this.phase >= 2) pool.push('claws', 'tailspin', 'pounce', 'table');
if (this.phase >= 3) pool.push('zoomies', 'claws', 'yarn', 'dot', 'chain');
this.CHAINS = { 2: [['claws', 'pounce'], ['tailspin', 'cough']], 3: [['yarn', 'claws'], ['dot', 'pounce'], ['claws', 'pounce']] };
```

- The existing guarantees stay:
  - `sinceVuln >= 2` forces a pounce, or zoomies in S3.
  - Swipes count toward that guarantee.
  - The same attack is never picked twice in a row, except pounce.
- **Add:** `dot`, `zoomies` and any chain ending in `pounce` count as "can open a punish." Every
  `sinceVuln` count of 2 must end in one of them.
- `table` is never picked twice within 3 attacks.

#### 3.4 Arena changes (`buildBoss2Arena` in `src/levels/level2.js`)

The current floor is a block from -12.5 to 12.5 on x and z, with 4 m walls on all sides.

| Stage | Change | Coordinates | Built when | Reset |
| --- | --- | --- | --- | --- |
| 2 | **Two ledges** (`StaticPlatform` `w 4, d 2.6, h 0.5`) rise out of the back corners over 1.0 s. The top is at `y 2.4`. Nobu can use them too; they're a vantage point. | `(-9.5, 2.4, -10)` and `(9.5, 2.4, -10)` | `beginPhase(2)`: animate `y` from -0.5 to 2.4 | Lowered (hidden) for stage 1 |
| 3 | **Crumbling edge:** the outer 2 m band of the floor is replaced by crumble tiles (`ArenaTiles.crumbleRing()`, tile 2.5 × 2.0). A tile crumbles 0.6 s after Nobu stands on it, and respawns after 4 s. Pit death plane at `y -6`. A crack-texture tell for 1 s at the start of the stage. | The main floor block shrinks to ±10.5; the edge tiles cover 10.5–12.5 | Build the arena from tiles from the start (solid in stages 1–2); `armed = true` at stage 3 | `armed = false`, all tiles restored |
| 3 | Catnip spawns (3.2). | `freeSpot(6, 9)` | `beginPhase(3)` | Removed |

Spheres stay `[(9,0,9), (-9,0,-9)]`. Add a third at `(0, 0, 9)` so stage 3 also gets one.

#### 3.5 Evolve parts, copy and audio

- **Existing parts:** S2 back spikes and claws. S3 horns, paw flames, burning tail tip. **New:** S3 a
  faint ghost silhouette that trails the cat (an additive copy of the rig, 30% opacity, lagging 0.15 s).
  This hints at Ghost Lives.
- `stagePowers`:
  - 2: `'Double pounce · claw scratches · tail-whip · knocks things off the table'`
  - 3: `'Triple pounce · zoomies · ghost lives · the edge crumbles'`
- New sound: `catnip`, a bright arpeggio. Reuse `meow` at pitch 1.4 for the ghost.
- **BOSS_TALK.cat** additions:
  - Intro, after the mask tip: `['mask', 'See that red dot? It CANNOT resist it. Lead it into a wall!']`
  - phase2: `['cat', 'Oops. Did I knock that off the shelf? I meant to.']`
  - phase3: `['mask', 'Catnip! Bite it and the cat goes wild: faster, but dizzier!']`

#### 3.6 Files and functions

- `bigCat.js`:
  - `chooseAttack` (the pool above).
  - New cases `dot`, `table` and `ghost` (the ghost list updates in `ai`).
  - `claws`: the scratch spawn.
  - `frenzy`: the per-stage upgrades.
  - `dizzy`: `dur = this.W * (this.catnipT > 0 ? 2 : 1) + (this.longDizzy ? 1.2 : 0) + (this.wallBonus ? 0.6 : 0)`.
  - `onHit`: spawn a ghost in S3.
  - `onResetPhase`: clear the ghosts, the catnip and the dot.
  - New `beginPhase()`.
- `common.js`: `scratch`, `falling`.
- `arena.js`: `ArenaTiles`.
- `level2.js` `buildBoss2Arena`: the tiled floor, plus `info.ledges` and `info.spheres` (3 entries).
- `bigCat.js` `ChaseCat`: **no change here**. Chase tuning belongs to the level extensions.

#### 3.7 Playtest checklist

- [ ] The dot is always readable. The final dot position always equals Nobu's, so a sidestep always
  dodges.
- [ ] The wall-slam bonus is easy to find by accident at least once per fight.
- [ ] A Cat (TNT) from the table never lands within 2.3 m of another active TNT.
- [ ] The crumble edge plus tailspin isn't a forced loss: tailspin's outer reach (4.9 m) must leave
  solid ground. Check with the cat at the edge.
- [ ] Ghosts never overlap the real cat's next pounce marker. If they would, delay the ghost by 0.5 s.
- [ ] The catnip window feels like a reward, not a trap.
- [ ] Dev run time is logged against the 80 s Speed target.

---

### 4. Evil Cone (tier 3, `src/bosses/evilCone.js`)

#### 4.1 Numbers

| | Stage 1 | Stage 2 CRACKED | Stage 3 SUPERNOVA |
| --- | --- | --- | --- |
| HP left at start | 9 | 6 | 3 |
| `sp` | 1.00 | 1.25 | 1.50 |
| `tele` | 0.90 | 0.80 | 0.70 |
| `W` (overheat) | 1.8 | 1.4 | 1.1 (+1.0 after the ultimate, `longHeat`) |
| `chain` | 1 | 2 | 3 |
| Grab-miss stuck | `1.3 / √sp` (existing) | same | same |

#### 4.2 Attack catalogue

| Attack (state) | Stages | Tell | Active | Hitbox | Avoid | Punish | Chain tags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `barrage` (existing) | 1–3 | Charge `0.6 / sp`, recoil. | 5 / 7 / 9 cones per wave, 2 waves in S3, `9.5 × sp`. | existing cone | Weave through the gaps. | none | `barrage>shame` |
| `spiral` (existing) | 1–3 | Wind 0.7 s × tele, `charge`. | 2.6 s; 3 / 4 / 5 arms; S3 reverses direction. | existing cone | Circle with the gaps. | none | end of `vortex>grab>spiral` |
| `shock` (existing) | 1–3 | Rises, then slams. 1 slam, 3 in S3; `cycle 1.0 / sp`. | Shockwave at `7.5 × sp`. | existing shockwave | Jump each ring. | none | `shock>rugpull` (S2) |
| `drops` (existing) | 1, 3 | Conducts; the marker grows. | 3 / 4 / 6 cones, delay `0.9 / sp`. | existing dropCone | Leave the markers. | none | none |
| `summon` (existing) | 1–3 | Arms up for 0.8 s, `laugh`. | `stage + 1` pump.fun pills, plus a broccoli from S2 (spiky in S3). | minions | Pop the pills early (they dump at max pump). | none | none |
| `sweep` (existing) | 2–3 | Descends; arms at ankle height, 0.9 s × tele. | 1.15 turns at `1.7` / `2.2 × 1.1` rad/s; 2 bars in S3. | bars `1.0–12.6 m`, half-width 0.5, `h 0.85` | Jump each bar. | none | `sweep>lasers` (S3) |
| `lasers` (existing) | 2–3 | Eyes lock 0.8 s × tele, `charge`. | 3.2 s; two spots chase Nobu at `3.8 + stage × 0.6` m/s. | `Beam.hits` | Keep moving, jump the spots. | none | `sweep>lasers` |
| `vortex` (existing) | 2–3 | Tips the mouth 0.6 s × tele, `suck`. | 2.8 s pull of `(2.6 + 0.5 × stage) × clamp(1.4 - d/14, 0.4, 1.2)`; death zone `r 2.2`; spits a 5-cone fan at the end. | `disc 2.2`, `h 3` | Run directly away; zoomies help. | none | start of `vortex>grab>spiral` |
| `grab` (existing) | 2–3 | Flips over and tracks for `1.25` (S2) / `1.0` (S3) × tele; marker; `laugh`; then locks for 0.35 s. | Slams at 34 m/s. | `disc 1.75` (as clones) | Leave the marker after it locks. | A miss → **stuck rim-down** for `1.3 / √sp`: bite. | middle of `vortex>grab>spiral` |
| `clones` (existing) | 3 | 2 ghost clones; all track for 1.1 s × tele. | Slams 0.3 s apart. | `disc 1.75`, `h 2.4` | Leave all three markers. | The real one's miss → stuck. | none |
| `overheat` (existing) | 1–3 | Drops, tips over, steams (0.45 s). | Vulnerable `W`, then a shockwave `9 × sp`. | — | — | **bite, stomp or slide** | never chained |
| **`shame` Cone of Shame (new)** | 1–3 | The Cone tilts its tip toward Nobu and **a small cone glows white** on the tip for 0.8 s × tele; `charge` at pitch 1.3. | Fires 1 `slowHomer` (2 in S3, 0.6 s apart): speed 4.5, turn 1.2 rad/s, life 5 s. | `disc 0.7`: **coned for 3 s** (1.8). With a mask: the mask is lost instead. | Outrun it (Nobu runs at 8 m/s), bite it to pop it, or let it time out. If coned: belly flop, or jump twice, to shake it off. | none | `barrage>shame` (S2+) |
| **`rugpull` Rug Pull (new)** | 2–3 | The tiles in the pattern **shimmer with the rug texture** (a flashing tint) for 0.9 s × tele; `zip`. | The tiles flip away (drop 6 m) for 2.0 s, then come back over 0.4 s. Patterns: `rows` (alternating rows), `checker`, `ring` (the outer ring), `cross` (the centre cross). **At most 50% of tiles are ever missing**, and the tile Nobu stands on at tell time is always one that **stays** for `ring` and `cross`. | Falling = pit death (`die('puff')`) | Read the shimmer; stand on a still tile. | none | `shock>rugpull` (S2) |
| **`tide` Smog Tide (new)** | 3 | Smog pours from the arena edges; a fog plane rises from `y -0.2` to `y 0.5` over 1.2 s × tele. The 4 pedestals (4.4) glow. `suck` (reversed, low pitch). | 4 s: the floor below `y 0.6` hurts (`'puff'`). During the tide **one beam aims at Nobu's pedestal** for 0.8 s × tele and then fires for 0.6 s, twice. | Floor zone; then `Beam.hits` on the pedestal | Stand on a pedestal; hop to the next one (5.9 m apart, needs a double jump) when your pedestal is aimed at. | none | none |
| `ultimate` Shame Supernova (existing, upgraded) | 1–3 | Powers up for 1.7 s. | 5 s (6 s in S3) of spinning laser spokes (3, or 4 from S2; `w` = 0.95 / 1.15 / 1.35) plus cone rain. **S2:** the spokes reverse direction halfway. **S3:** Smog Tide runs at the same time, and the spokes only cross the pedestals. **2 of the 4 pedestals are safe** (the other 2 sink 0.6 m into the tide); the safe pair is shown by a steady glow. | spokes: half-width 0.45, `h 0.95` | Jump the spokes; in S3 stand on a glowing pedestal. | → `overheat` with `longHeat` (+1.0 s). | never chained |

#### 4.3 Plans (`nextAction`)

```js
this.plan = this.phase === 1
  ? ['summon', 'barrage', 'shock', 'shame', 'spiral', 'overheat', 'drops', 'barrage', 'overheat']
  : this.phase === 2
    ? ['summon', 'sweep', 'lasers', 'overheat', 'rugpull', 'grab', 'chain', 'vortex', 'shame', 'spiral', 'shock', 'overheat']
    : ['summon', 'clones', 'tide', 'spiral', 'chain', 'overheat', 'lasers', 'grab', 'sweep', 'rugpull', 'overheat', 'drops', 'chain', 'barrage', 'grab', 'overheat'];
this.CHAINS = {
  2: [['barrage', 'shame'], ['shock', 'rugpull']],
  3: [['vortex', 'grab', 'spiral'], ['sweep', 'lasers'], ['barrage', 'shame']],
};
```

- In S3, `'chain'` with `chainLen 3` picks from all three combos. `vortex>grab>spiral` is the plan's
  "chain of 3."
- The Cone keeps its existing rule of 2–3 `overheat` slots per loop. These are the only planned opening;
  grab misses are the bonus.

#### 4.4 Arena changes (`buildBoss3Arena` in `src/levels/level3.js`)

The current floor is a block from -13 to 13 on x and z, with `ARENA_R = 12.5`.

| Stage | Change | Coordinates | Built when | Reset |
| --- | --- | --- | --- | --- |
| 2 | **Tile grid:** `ArenaTiles({ cols: 6, rows: 6, size: 4.2, y: 0 })` covers -12.6 to 12.6. It replaces the floor block, and is solid in stage 1. The rug texture shows only during the shimmer. | Tile `(i, j)` is centred at `(-10.5 + 4.2 i, 0, -10.5 + 4.2 j)` | Built in the arena; `rugpull` is only in the S2 and S3 plans | `reset()` |
| 3 | **4 pedestals** (`Pedestal r 1.6, h 1.2`) rise over 1 s at the start of S3. They are solid all the time and can be used as cover from the sweep bars, which run at ankle height: the pedestals are 1.2 m tall, so Nobu standing on one is above the 0.85 m bars. | `(4.2, 0, 0)`, `(-4.2, 0, 0)`, `(0, 0, 4.2)`, `(0, 0, -4.2)` | `beginPhase(3)` | Lowered |
| 3 | Smog Tide fog plane (a mesh; damage only during `tide` or the S3 ultimate). | the whole arena, `y` up to 0.5 | — | Hidden |

- **Pedestal placement:** neighbour distance is `4.2 × √2 = 5.94 m`. Nobu jumps about 7 m with run and
  double jump, so every hop is possible but needs commitment. The tile under each pedestal never flips;
  exclude those tiles from Rug Pull patterns in S3.
- **Conflict fixed:** plan 7.4 had 4 pedestals with no positions, and the obvious corner positions
  `(±6, ±6)` are 12 m apart, too far to hop. The compass layout keeps 4 pedestals at a hop's distance.

#### 4.5 Evolve parts, copy and audio

- **Existing parts:** S2 spike ring and glowing eyes. S3 flame crown and 3 orbiting mini cones.
  **New:** S2 rug-pattern stripes on the cape (a texture swap); S3 smog trails from the rim (`smokeCard`
  emitters at the rim, lingering).
- `stagePowers`:
  - 2: `'Floor sweeps · twin lasers · grab · vortex · RUG PULL'`
  - 3: `'Shadow clones · SMOG TIDE · combos of three · fastest'`
- **BOSS_TALK.cone** additions:
  - Intro, after the pills line: `['mask', 'If he cones you, you can\'t bite! BELLY FLOP or double jump to shake it off.']`
  - phase2: `['cone', 'Let\'s see how you like a RUG PULL. Mind the floor, mutt.']`
  - phase3: `['mask', 'Smog! Get up on the pedestals, and keep hopping!']`

#### 4.6 Files and functions

- `evilCone.js`:
  - `nextAction` (the plans above).
  - New cases `shame`, `rugpull` and `tide`.
  - `ultimate`: the per-stage upgrades.
  - New `beginPhase()`: tiles and pedestals.
  - `onResetPhase`: `tiles.reset()`, pedestals per stage, fog hidden.
- `common.js`: `slowHomer`.
- `arena.js`: `ArenaTiles`, `Pedestal`.
- `player.js`: `cone()`, plus a coned HUD flag in `ui.js` (vignette CSS class).
- `level3.js` `buildBoss3Arena`: the tiled floor, `info.pedestals`, `info.tiles`.

#### 4.7 Playtest checklist

- [ ] The Cone of Shame is dodgeable without the bite. A coned Nobu can still survive the next attack.
- [ ] Rug Pull patterns never strand Nobu (the 50% cap; the tile under Nobu is safe for `ring`/`cross`).
- [ ] No more than one floor-changing attack happens at once (`rugpull` never during `tide`).
- [ ] Smog Tide beams always leave a reachable pedestal; hops work with and without the Champion's
  Crown.
- [ ] The S3 ultimate's safe pedestals are visible from the camera at all four positions.
- [ ] Dev run time is logged against the 110 s Speed target. The phase checkpoint still behaves as
  today.

---

### 5. Roomba Titan (tier 4, new: `src/bosses/roombaTitan.js`)

#### 5.1 Placeholder build

- **Model:** `Assets` id `model_roomba_titan`. Its placeholder (`src/art/placeholders.js`) is
  `{ from: 'model_vacuum', scale: 4.5, tint: 0x3a3d44 }`.
  - Load it with `attachGlb(this.rig, 'model_roomba_titan', 1.8, 0, [this.fb])`, i.e. **1.8 m tall**.
  - The disc comes out about 6 m across. Read the real radius from the GLB's bounding box after loading
    (`this.R = box.max.x`, about 3.0) and use it for every hitbox below.
- **Primitive fallback**, shown if the GLB fails: a dark-grey cylinder `r 3.0, h 1.6` with a lighter top
  cylinder `r 2.4, h 0.2`. Same pattern as the Vacuum enemy (`part(cyl, ...)`).
- **Procedural parts.** No autoRig is needed: a disc has no limbs, so the parts are animated directly.

  | Part | Build | Animation |
  | --- | --- | --- |
  | `bumper` | A half torus at the front, `r 3.05`, tube 0.18, `toon(0x222222)` | Squashes 0.2 on wall hits |
  | `brushL` / `brushR` | 3 thin boxes in a star, `0.9 × 0.05 × 0.12`, at `(±2.2, 0.1, 2.0)` | Spin `rotation.y += 30 dt` while moving |
  | `button` | A cylinder `r 0.55, h 0.18` on top at `(0, 1.65, 0)`, emissive red | Glows bright and pulses while vulnerable (the tell) |
  | `ledRing` | A torus `r 2.5`, tube 0.06, at `y 1.62`, emissive cyan | Turns: cyan = patrol, amber = aiming, red = charging. It's the main read **in the dark** in stage 3 |
  | `dustBag` (stage 2+) | A bulging grey sphere, `r 0.9`, on the back | Inflates during suction |
  | `exhaust` (stage 3) | 2 `flamePart(0xff6a2a)` on the back | Flicker |

- `setBox(6.0, 1.8, 6.0)`, and `this.ground = 0`.
- **Stage look:**
  - `stageScale = [1, 1, 1.08, 1.16]`.
  - `stageColors = [0, 0, 0x40e0ff, 0xff3a2a]`.
  - `stageGlow = { 2: 0x001218, 3: 0x200404 }`.
  - `stageNames = { 2: 'DEEP CLEAN', 3: 'OVERHEAT PROTOCOL' }`. Stage 1 is "AUTO MODE" and is only named
    in the intro.
- `makeStageParts()`:
  - 2: `dustBag`, a second antenna, and 2 suction vents on the bumper (`glowPart(0x9ad8ff)`).
  - 3: `exhaust`, warning stripes (yellow and black boxes on the rim), and a cracked top (a decal).

#### 5.2 Numbers

| | Stage 1 AUTO MODE | Stage 2 DEEP CLEAN | Stage 3 OVERHEAT PROTOCOL |
| --- | --- | --- | --- |
| HP left at start | 9 | 6 | 3 |
| `sp` | 1.15 | 1.35 | 1.55 |
| `tele` | 0.85 | 0.76 | 0.68 |
| `W` (button exposed) | 1.70 | 1.35 | 1.05 |
| `chain` | 2 | 2 | 3 |
| Charge speed `16 × sp` | 18.4 m/s | 21.6 m/s | 24.8 m/s |
| Ultimate charge time | 26 s | 20 s | 15 s |

`BOSS.titan = { hp: 9, perStage: 3, ... }` as in plan 4.1.

#### 5.3 How it gets hurt

- The Titan is only vulnerable while **stunned**. A stun happens when:
  - a charge ends against a wall (stage 1–2) or a pillar (any stage), or against a fallen leg (stage 3);
  - it rams a Cat (TNT) (stage 3);
  - Mega Bark hits it during suction (stage 2+).
- **Stunned:** sparks, `bonk`, stars over the button, and the button glows. It lasts `W`; a bark-stun lasts
  0.8 s.
- **Damage:** a **belly flop** on the button: `onStomp(p)` with `p.mode === 'flop'`. A plain stomp only
  bounces (`p.bounce(STOMP_BOUNCE)`, with `clang`). The first time this happens, show the banner
  `'BELLY FLOP the button!'`. Bite and slide do nothing (`clang`).
  - The flop needs height: a jump plus `slide` in the air. On a successful flop Nobu bounces off at
    `STOMP_BOUNCE × 1.05`, which is the existing `damage()` behaviour.
- **Touching it when not stunned:** body `disc R + 0.2`, `h 1.8` → `'flat'` while moving fast (charge or
  spin), `'angel'` otherwise. Standing on top while it isn't stunned: it spins and flings Nobu off with
  `vel 8` outwards and **no damage**, so the top isn't a safe camping spot.

#### 5.4 Attack catalogue

| Attack (state) | Stages | Tell | Active | Hitbox | Avoid | Punish | Chain tags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `patrol` | 1–3 | none (it's the idle) | Drives a slow figure-eight (`4 × sp` m/s), turning toward Nobu, for `1.4 / sp` s. Brushes spin. | Brushes `ring R–R+0.8`, `h 0.5` → `'angel'`. Body as 5.3. | Jump the brushes; keep 2 m away. | none | — |
| `charge` Grid Clean | 1–3 | It stops and aligns to a **cleaning lane**: a pale stripe projected on the floor from the Titan to the far wall, through Nobu's position, `2·R` wide. LED ring goes amber, `whirr` rising. 1.0 s × tele. **The lane locks 0.3 s before the charge.** | Drives the lane at `16 × sp`. | Body `disc R + 0.2` → `'flat'` | Step out of the lane after it locks. | Hitting a wall or pillar → **stunned `W`**. **S1–2:** walls stun. **S3:** walls **don't** stun; it bounces up to 3 times (each bounce re-aims along the reflected lane, no new tell, the lane shown during the bounce), and only a Cat (TNT) or a fallen leg stuns. | `charge>charge` (S2), `cable>charge` (S1+) |
| `recharge` (chained second charge) | 2–3 | After a wall hit **without** stun: a 0.2 s bumper squash, then a fresh 0.6 s × tele lane re-aim. | As `charge`. | as `charge` | as `charge` | The second wall hit stuns. | second half of `charge>charge` |
| `cable` Cable Whip | 1–3 | It reverses to the back-wall socket `(0, 0, -12)` and plugs in. Sparks, `zip`; the cable glows yellow along its length for 0.9 s × tele. | The cable sweeps an arc from the socket: `cableArc(pivot, 14, a0, a1, 0.5)`, from `-60°` to `+60°` (and back in S3), at `1.6 × sp` rad/s. | `seg 0.5`, `h 0.6` | Jump it as it passes; it's low. | none | `cable>charge` |
| **`swarm`** Mini-Roomba swarm | 2–3 | It opens a hatch (the top lifts 0.2), `beep` ×3. | Spawns 3 `Vacuum` enemies (`alwaysActive`, `chase: true`, `speed 3.2`) at its sides. Max 3 alive. In S3 they move 1.2× faster. | existing Vacuum | Stomp or bite them (they die normally). | none | none |
| **`suction`** | 2–3 | It turns its bumper to Nobu; the vents glow and the dust bag deflates; `charge`, low. 0.7 s × tele. | 2.6 s of pull: `p.pushX/Z = toTitan × (2.8 + 0.5 × stage) × clamp(1.4 - d/14, 0.4, 1.2)`. That's the Cone's vortex formula, so **reuse the code**: lift the vortex body into a shared `pullToward(boss, f, dt)` in `common.js`. Death zone `disc R + 0.4`, `h 2` → `'puff'`. | as above | Run away; **Mega Bark** (any hit from the bark ring, `onBark`) cancels the pull and **bark-stuns** it for 0.8 s with the button exposed. | Bark-stun 0.8 s | none |
| **`stomp`** Leg Stomp | 3 | A shadow marker `r 1.2` grows under each falling leg for 1.0 s × tele; the ceiling creaks (`roll`, low). | 3 legs per volley, 0.4 s apart. Each `falling({ kind: 'leg', r: 1.2 })` lands and then **stays 2 s as a solid pillar** (`1.2 × 6 × 1.2`), then lifts away. | `disc 1.2`, `h 1.6` → `'flat'` | Leave the markers. | A fallen leg is a **stun target** for its charges: lure it. | `stomp>charge` (S3) |
| **`lightsout`** Lights Out | 3 | The LED ring flashes white 3 times, then dust billows (`smokeCard` from the Titan). | For 8 s, scene lights drop to `sunI 0.12` and `hemiI 0.3`, the cave values. Lumi's glow (`Glowworm` light, `r 4`) follows Nobu. The LED ring, the lane stripes, the TNT fuses and the leg markers stay emissive, so every tell still reads. | none (an arena state) | — | none | none (it runs alongside the next 2 attacks) |
| `ultimate` Total Vacuum | 1–3 | It drives to the centre, LEDs cycling rainbow, and powers up for 1.6 s (`powerUp`, cyan). | **The walls close in:** over 1.5 s the 4 wall blocks move inward, from ±13 to ±9.75. It spins at the centre (`disc R + 0.3` hurts) and fires `debris` spirals: 2 arms in S1, 3 arms plus 1 mini-Roomba in S2, 4 arms plus Lights Out in S3, at `7 × sp`, every 0.12 s. **Lasts 6 s.** The walls then move back over 1 s. | debris (existing cone collider) | Circle with the gaps. Since the walls are closer, use the corners. | Ends **stunned for `W + 1.0`**, like the Cone's `longHeat`. | never chained |

**Wall stun rule (S1–2):** a charge reaches a wall when `|x|` or `|z|` + `R` is at least `wallR` (13, or the
current ultimate wall). The Titan stops, bounces back 0.6 m, squashes its bumper, camera shake 0.5, and is
stunned for `W`.

#### 5.5 Plans and chains

```js
nextAction() {
  if (!this.plan.length) {
    this.plan = this.phase === 1
      ? ['patrol', 'charge', 'patrol', 'cable', 'charge', 'patrol', 'chain']
      : this.phase === 2
        ? ['patrol', 'swarm', 'charge', 'suction', 'chain', 'patrol', 'cable', 'charge', 'suction', 'chain']
        : ['lightsout', 'stomp', 'charge', 'patrol', 'swarm', 'chain', 'suction', 'lightsout', 'stomp', 'chain', 'cable', 'charge'];
  }
  if (this.ultReady) this.plan.unshift('ultimate');
  ...
}
this.CHAINS = {
  1: [['cable', 'charge']],
  2: [['charge', 'recharge'], ['cable', 'charge']],
  3: [['stomp', 'charge', 'recharge'], ['cable', 'charge', 'recharge'], ['charge', 'recharge']],
};
```

- **Guarantee:** every loop has at least 3 stun opportunities: wall charges in S1–2, or TNT and legs in S3.
- In S3 the **3 Cat (TNT)** respawn points (5.6) always hold a TNT when `charge` starts. A TNT that Nobu
  breaks himself, or that a ram uses up, respawns after 6 s.

#### 5.6 Arena: the living room (`buildBoss4Arena`, new, in `src/levels/level4.js`)

Theme `boss4` in `stage.js`: copy `house` with `fog 0xd8b890`, `sunI 1.3`, `hemiI 1.1`, and backdrop
`bg_boss4`, which falls back to the house sky.

| Piece | Build | Coordinates |
| --- | --- | --- |
| Floor | `stage.block(-13, -6, -13, 13, 0, 13, 'ground')`, house floorboard texture | — |
| Walls | 4 solid blocks, 4 m tall, **as separate entities**, so the ultimate can move them | `x ∈ [-14, -13]`, `x ∈ [13, 14]`, `z ∈ [-14, -13]`, `z ∈ [13, 14]` |
| Furniture-leg pillars | 4 `FurnitureLeg`-style solids, `1.2 × 6 × 1.2`, brown. Charges stun on them in every stage. | `(-8, 0, -8)`, `(8, 0, -8)`, `(-9.5, 0, 3)`, `(9.5, 0, 3)`. None are on the camera side (`z > 6`). |
| Rug / conveyor | A `ConveyorZone` 8 × 8 at the centre with a rug texture. Off in S1; **on in S2+**: pushes 3 m/s, turns 90° every 6 s, with an arrow-decal tell 1 s before. | `x, z ∈ [-4, 4]` |
| Wall socket | A small box on the back wall (the cable pivot) | `(0, 0.6, -12.8)` |
| Cat (TNT) spots (S3) | Breakable `Cat`, `countable = false`. Rammed by a charge → explodes (`r 2.3`), stuns the Titan, and the explosion can hurt Nobu. | `(-10, 0, -2)`, `(10, 0, -2)`, `(0, 0, -10)` |
| Decor | A sofa back (block, not solid) beyond the back wall; giant table legs at the outer corners; a lamp with a warm point light; plant pots. Use `decor.js` helpers and house `art/procedural.js` textures. | outside ±14 |
| Pick-ups | `k.sphere(-9, 0, -9)`, a ticket line `k.tix(-6, 0, -9, 6, 0, -9, 7)` (same as the other arenas, non-countable) | — |

```js
return {
  spawn: new THREE.Vector3(0, 0, 9), facing: Math.PI,
  camera: { mode: 'arena', center: new THREE.Vector3(0, 0, 0), offset: { x: 0, y: 12.5, z: 16.5 }, follow: 0.45 },
  spheres: [new THREE.Vector3(-9, 0, 9), new THREE.Vector3(9, 0, 9), new THREE.Vector3(0, 0, 10)],
  walls, pillars, conveyor, socket: new THREE.Vector3(0, 0, -12), tntSpots, // passed to the boss through _attachActors
};
```

`session.js` `LEVELS` (or the new registry): `4: { ..., arena: buildBoss4Arena, Boss: RoombaTitan, bossKey: 'titan', bossTheme: 'boss4' }`.

#### 5.7 Reward move: Dust Dash

| Property | Value |
| --- | --- |
| Unlock | `abilities.dustDash` (the Titan beaten) |
| Input | **Bite during a ground slide** (`mode === 'slide'`, `slideT < SLIDE_TIME`). One per slide. |
| Effect | `vel` = facing × **20 m/s** for **0.22 s** (4.4 m). `vel.y` held at 0. Then it returns to the slide, with the slide's remaining time reset to 0.15 s. |
| Invulnerability | `invulnT = max(invulnT, 0.22)` while dashing. This is how it passes through the Queen's wake ring. |
| Cooldown | 0.8 s, from the start of the dash |
| Breaks | Dust Walls (`onDash` → break, `puff`, a grey dust burst). Backpacks (counts as a break). |
| Knocks over | Lid Knights (armour off: `onDash` acts like a flop on them) and Shellbacks (flips them) |
| Does not break | steel Lunchboxes (`clang`), Bark Rocks (they still need the bark) |
| Bosses | Only `onDash` where this spec defines it (Queen stage 4) |
| Air | Not available in the air. The Clown-Nose Collar air dash stays separate. |
| Trials | Allowed (a boss move) |
| Feedback | `whoosh` at pitch 0.8 plus `slide`, a grey speed-line trail (`fx.smokeCard` streaks), FOV +4 for 0.2 s |
| Tutorial | `tut('dustDash')`: `'NEW MOVE: DUST DASH! While sliding, press BITE to burst forward. Smash those Dust Walls!'` |
| Code | `player.js`: a `_startDustDash()` branch inside the slide handling, plus `TUNING.DUST_DASH_SPEED = 20`, `DUST_DASH_TIME = 0.22`, `DUST_DASH_COOL = 0.8` |

#### 5.8 Cutscenes and dialogue

- **Intro beats:**
  1. The camera follows Nobu into the dark living room.
  2. The LED ring blinks on, cyan.
  3. The Titan rolls out from under the sofa (a 2 s drive from `(0, 0, -16)` to its home `(0, 0, -6)`).
  4. A red scan line sweeps over Nobu.
  5. `bossRoar` (low-pitched whirr).
  6. The lines below play.
- **Defeat beats:**
  1. It spins out of control.
  2. Dust explodes out of the bag (grey confetti burst).
  3. Its LEDs fade one by one.
  4. Collars and cones rain out (non-countable, cosmetic).
  5. `g.levelCleared` as usual.

```js
titan: {
  intro: [
    ['titan', 'BEEP. FOREIGN OBJECT DETECTED. CLASSIFICATION: DOG. CLASSIFICATION: DIRT.'],
    ['titan', 'The Pump Queen has scheduled a DEEP CLEAN. All collars will be... collected.'],
    ['mask', 'It\'s too tough to bite! Make it CRASH into a wall, then BELLY FLOP the red button!'],
  ],
  phase2: [['titan', 'SUCTION MODE ENGAGED. Resistance is... absorbed.'], ['mask', 'Mega BARK at it while it sucks! It hates that.']],
  phase3: [['titan', 'WARNING. WARNING. OVERHEAT PROTOCOL. LIGHTS: OFF.'], ['mask', 'It bounces off the walls now! Get it to ram a CAT. Or a fallen table leg!']],
  death: [['titan', 'Low... battery... please return me to my... dock...']],
},
```

`'titan'` needs a speaker portrait: `portrait_titan`, whose placeholder is the 2D `vacuum` image (plan 9.2).
Add it to the speaker map in `ui.js` (`say()`).

#### 5.9 Files and functions

- `src/bosses/roombaTitan.js` (new): `class RoombaTitan extends Boss` with `key: 'titan'`.
  - Methods: `makeStageParts`, `start`, `nextAction`, `ai`, `onHit`, `onTouch`, `onStomp` (flop only),
    `onBark`, `onResetPhase`, `beginPhase`, `defeatAnim`, `idleAnim`, `_laneThrough(p)`, `_wallHit()`.
- `common.js`: shared `pullToward()` (lifted from `evilCone.js` `vortex`), `cableArc`, `falling`,
  `debris`.
- `arena.js`: `ConveyorZone`; movable wall blocks (`MovableBlock`, a solid AABB whose box can be moved).
- `level4.js`: `buildBoss4Arena`.
- `stage.js`: `boss4` theme.
- `script.js`: `BOSS_TALK.titan`.
- `player.js`: Dust Dash.
- `session.js`: the registry entry. Reuse the existing `killMinions` for the swarm.

#### 5.10 Playtest checklist

- [ ] The first stun comes within 20 s on a first try.
- [ ] Players work out the belly flop from the banner without the mask's line.
- [ ] Lane stripes stay readable in Lights Out; TNT and leg markers glow.
- [ ] S3 bounce charges always end within 3 bounces. A TNT is always reachable as a lure.
- [ ] The ultimate's closed walls never crush Nobu: if Nobu is inside the closing wall's AABB, push him
  inward instead of hurting him.
- [ ] The bark-stun cancel feels responsive: the bark ring reaches 6.5 m and the Titan is about 3 m in
  radius, so a bark from 3.5 m away connects.
- [ ] Dev run time is logged against 120 s. The Titan's average punish window is shorter than the
  Cone's (the ladder holds).

---

### 6. The Pump Queen (tier 5, new true final boss: `src/bosses/pumpQueen.js`)

#### 6.1 Placeholder build

- **Model:** `model_pump_queen`, whose placeholder is `{ from: 'model_pill_bot', scale: 5, tint: 0xd23cff }`.
  - Loaded at **5.5 m tall**.
  - The crown is `model_nobu_champions_crown`, loaded at 1.1 m tall and attached at the top of the head
    bone, tilted 0.15 rad.
- **Rig:** use `autoRig` with these joints, in model units (4 tall, facing +z). Check them against the
  pill_bot GLB when building; the weights follow the pattern in `mechaBird.js` and `bigCat.js`.

  ```js
  joints: { root: [0, 0, 0], body: [0, 1.4, 0], top: [0, 2.8, 0], head: [0, 3.5, 0], armL: [-1.0, 2.2, 0], armR: [1.0, 2.2, 0] },
  parents: { body: 'root', top: 'body', head: 'top', armL: 'body', armR: 'body' },
  weigh: (x, y, z) => y > 3.2 ? { head: 1 } : y > 2.4 ? { top: 1 } : Math.abs(x) > 0.8 && y > 1.6 ? { [x < 0 ? 'armL' : 'armR']: 1 } : { body: 1 },
  ```

- **Pump animation:** the body and top bones scale `xz` to `1 + 0.35 k` and `y` to `1 + 0.2 k` as she
  inflates, where `k` goes from 0 to 1. On a dump, a fast squash: `y 0.7`, `xz 1.3`, then spring back.
- **Procedural parts** (`makeStageParts`):

  | Stage | Parts |
  | --- | --- |
  | 2 HYPE | 2 neon torus rings (green `0x4aff8a`, `r 3.2`) orbiting at the waist, and a ticker band (a canvas texture scrolling `▲ PUMP ▲`) round the body |
  | 3 BUBBLE | Gold chains (a torus chain on the neck); the **bubble** (a sphere `r 3.2`, `MeshBasicMaterial`, opacity 0.25, rim glow); it is only visible while shielded |
  | 4 RUG PULL | Cracks (emissive red decal lines), the crown tilted 0.5 rad, red smoke from the cracks, flickering eyes |

- **Stage look:**
  - `stageScale = [1, 1, 1.10, 1.20, 1.28]`.
  - `stageColors = [0, 0, 0x4aff8a, 0xffd23f, 0xff2a3a]`.
  - `stageNames = { 2: 'HYPE', 3: 'BUBBLE', 4: 'RUG PULL' }`.
- **Hitboxes:**
  - Body `disc 1.8` around her `x/z`, from her base to her top. Contact hurts unless she is vulnerable.
  - **Crown target:** a sphere `r 1.4` at her top (`pos.y + 5.2 × scale`).
  - **Damage:** bite while Nobu is within 1.6 m of the crown sphere, or a stomp on the crown. The other
    bosses' `onBite`/`onStomp` check `vulnerable`; here also check that Nobu is near the crown.

#### 6.2 Numbers

| | Stage 1 LAUNCH | Stage 2 HYPE | Stage 3 BUBBLE | Stage 4 RUG PULL |
| --- | --- | --- | --- | --- |
| HP left at start | 12 | 9 | 6 | 3 |
| `sp` | 1.20 | 1.40 | 1.60 | 1.70 |
| `tele` | 0.82 | 0.74 | 0.66 | 0.62 |
| `W` (crown open) | 1.60 | 1.30 | 1.05 | 0.95 |
| `chain` | 2 | 3 | 3 | 4 |
| Ultimate charge time | 26 s | 20 s | 15 s | 12 s |
| Candle wave period | 6.0 s | 4.5 s | 3.8 s | (Liquidation drives the pillars) |

#### 6.3 The arena: the candle chart (`buildBoss5Arena`, new, in `src/levels/level5.js`)

Theme `boss5`: copy `boss3`, hue-shifted to magenta and green, with `fog 0x1a0828` and backdrop `bg_boss5`
(placeholder `bg_boss3` with a hue shift).

| Piece | Build | Coordinates |
| --- | --- | --- |
| Outer ring floor (S1–2; it crumbles in S3) | 4 blocks forming a square ring, 2.5 m wide, from S3 swapped for `ArenaTiles` crumble tiles (0.5 s crumble, 5 s respawn) | `x ∈ [-13, 13], z ∈ [10.5, 13]`; `z ∈ [-13, -10.5]`; `x ∈ [-13, -10.5], z ∈ [-10.5, 10.5]`; `x ∈ [10.5, 13], z ∈ [-10.5, 10.5]` |
| Pit | No floor inside the ring. Death plane `y -7` → `die('puff')`. Kill fall below `y -4`. | inside ±10.5 |
| Outer pillars | 12 `CandlePillar`s, top 2.6 × 2.6, height range `y -1.5` to `+3.5` | circle `r 7.5`, at angles `k × 30°` |
| Inner pillars | 4 `CandlePillar`s, top 2.2 × 2.2 | circle `r 3.5`, at angles `45° + k × 90°` |
| Queen hover point | Over the pit centre; `y 3` low, `y 9` pumped | `(0, y, 0)` |
| Tickers | Decor: scrolling ▲▼ boards beyond the ring (canvas textures), `tick` / `blipLow` sound sources | `r 15` |

- **Pillar distances:** outer neighbours are `2 × 7.5 × sin 15° = 3.9 m` apart (an easy hop). Inner to
  outer is about 4.3 m at best.
- **Pillar heights:** the **candle wave** sets `target_i = 1.0 + 2.0 × sin(2π t / period + angle_i)`.
  This makes a ripple running around the ring.
  - A pillar is **green** while rising and **red** while sinking.
  - The colour changes 0.5 s **before** the direction does, with `tick` (up) and `blipLow` (down) from
    the nearest ticker. That is the "audio tell 1 beat ahead" from plan 5.
- **Return value:**
  - `spawn (0, 0, 11.7)`.
  - Camera `{ mode: 'arena', center: (0,0,0), offset: { x: 0, y: 15, z: 19 }, follow: 0.4 }`.
  - `spheres`: `(-11.7, 0, 11.7)`, `(11.7, 0, 11.7)`, `(0, 0, -11.7)`, and `(0, 4.2, -7.5)` (on a pillar,
    for stage 4).
  - Plus `pillars`, `ring`, `tickers`.

#### 6.4 How she gets hurt

- **Pump** (every stage): she inflates (a 1.4 s × tele swell, `charge` rising, rings pulsing) and rises to
  `y 9`. At the top she is **pumped** for `W`: crown glowing, vulnerable.
- **Getting up there:**
  - **S1–2:** bounce off a **pumped pump.fun pill**. A new `PumpPill` rule: a stomp on a pill at pump
    level `n` bounces Nobu at `11 + 2n` m/s, which is 17 at `n = 3`, for a 4 m apex above the pill. The
    tallest pillar is at 3.5, so pill on pillar plus bounce reaches about `y 8–9`. Then bite the crown.
  - **S3:** she is **shielded by the bubble** while pumped. **Mega Bark** pops it (`onBark` while within
    6.5 m: Nobu on a high pillar under her works because the bark's `y_tol` is 2.5 m, or right after a
    pill bounce) → `conePop`, then the crown is open for `W`.
  - **S4:** she **does not rise**. She dumps onto the inner pillars at `y 1.5` and sits inside a
    **wake ring** (`wakeRing r 3.4`). **Dust Dash** through the ring (invulnerable) and hit her body
    (`onDash`) → she reels for `W` with the crown lowered to bite height (`y 2.2`). Then bite.
- After each pumped window she **dumps**: she drops to `y 3` in 0.4 s and fires `proj.shockwave(0, y, 0,
  8 × sp, 12)` (a jumpable ring). In S4 it's a second ring 0.3 s later.

#### 6.5 Attack catalogue

| Attack (state) | Stages | Tell | Active | Hitbox | Avoid | Punish | Chain tags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mint` | 1–4 | She raises her arms; 3 purple sparkles appear where the pills will spawn. 0.8 s × tele. `laugh`. | Spawns 3 `PumpPill`s (`maxPump 4`, 3 in S4) on random pillars or the ring. At most 4 alive. | existing PumpPill | Hop them at the right time; let them dump away from you. | Pills are the **ladder** to the crown (S1–2). | `mint>pump` |
| `pump` | 1–3 | 1.4 s × tele swell (6.4) | Pumped for `W` at `y 9`, then the dump wave | Body contact | — | **Crown open for `W`** (S3: after the bark) | end of chains |
| `wave` Candle wave | 1–3 | the colour shift (6.3) | Always running (it's the arena) | Pillar tops; the pit | Ride the green pillars; leave red ones before the low point. | — | — |
| **`fomo`** FOMO Beam | 2–4 | A green spotlight cone narrows onto Nobu; a rising synth (`charge`, pitch 1.5). 0.9 s × tele. | 2.8 s of pull toward the pit centre at **3.4 m/s** (`pullToward` with a constant force). | Pull, and the pit | **Zoomies** (12.4 m/s) or a slide jump outruns it. In the air over the pit, **Tail Glide** drifts you to a pillar. | none | `fomo>pump`, `fomo>crash` |
| **`airdrop`** | 2–4 | 4 crates appear at `y 12` under parachutes, with shadows on the landing spots. **Blue chute = Blue Sphere, red chute = Cat (TNT).** | They fall at 3 m/s (about 3 s). 2 blue and 2 red (1 blue and 3 red in S4). TNT explodes 3 s after landing, `r 2.3`. | `falling` (`kind: 'crate'`, `r 1.0`) → `'flat'`; TNT `r 2.3` | Grab the blues; get away from the reds. | — | `airdrop>fomo` |
| **`crash`** Candle Crash | 3–4 | A **red ripple** runs along a lane of pillars through the centre (3–4 pillars in a line) for 1.0 s × tele; `blipLow` ×3. | The lane drops to `y -6` at 9 m/s, stays 3 s, then rises again. | the pit | Get off the rippling lane. | — | `fomo>crash` |
| **`liquidation`** | 4 | The outer pillars flash red one after another, clockwise from the one opposite Nobu. | The pillars drop one by one, every `0.45 / sp` s, and come back 2.5 s later. **The last-green pillar** (gold glow, steady `chime`) never drops this cycle. | the pit | Keep moving along the spiral, or wait on the last-green pillar. | — | `liquidation>wake` |
| **`wake`** Dump wake | 4 | She dumps to the inner pillars and the ring appears (1.0 s × tele fade-in). | Ring `r 3.4`, `h 2.2`, for `W + 2.5` s. Every 1.5 s it also fires an expanding shockwave (`8 × sp`). | `wakeRing`; shockwaves | Jump the waves; **Dust Dash** in. | Dash hit → crown open for `W`. | end of S4 chains |
| `ultimate` Market Crash | 1–4 | All pillars flash red together; a market-crash siren (a falling-pitch synth `crash`, new); `powerUp`, red, 1.5 s. | Over 2 s every pillar plunges in order to `y -6`. **One pillar rises green** (a steady gold glow and a held `chime`). **Decoys:** S2 1, S3 2, S4 3 other pillars also rise green, but **flicker**, and sink 0.8 s after the true green settles. **S1–2:** the outer ring turns red (it hurts, `'angel'`, for 4 s), so the ring isn't a safe spot. Lasts 5 s; then everything returns. | the pit; the red ring | Get to the steady green pillar. | Ends **pumped for `W + 1.0`** (on the green pillar's side, so a pill bounce or the bark works). | never chained |

#### 6.6 Plans and chains

```js
this.plan = [
  null,
  ['mint', 'wave', 'pump', 'mint', 'chain', 'pump'],                                     // 1 LAUNCH
  ['mint', 'airdrop', 'fomo', 'pump', 'chain', 'mint', 'pump'],                           // 2 HYPE
  ['mint', 'crash', 'fomo', 'pump', 'airdrop', 'chain', 'pump'],                          // 3 BUBBLE
  ['liquidation', 'wake', 'airdrop', 'chain', 'liquidation', 'wake'],                     // 4 RUG PULL
][this.phase].slice();
this.CHAINS = {
  1: [['mint', 'pump']],
  2: [['fomo', 'pump'], ['airdrop', 'fomo'], ['mint', 'airdrop', 'pump']],
  3: [['fomo', 'crash', 'pump'], ['airdrop', 'fomo', 'pump']],
  4: [['liquidation', 'fomo', 'crash', 'wake'], ['airdrop', 'fomo', 'liquidation', 'wake'], ['fomo', 'crash', 'wake']],
};
```

- **"All earlier powers return" in S4** (plan 7.6): the S4 plan and chains use `fomo`, `airdrop`,
  `crash` and Liquidation. `mint` is not used in S4, because pills aren't the way up any more.
- **Every loop has at least 2 openings:** pumps in S1–3, wakes in S4.

#### 6.7 Reward move: Moon Jump

| Property | Value |
| --- | --- |
| Unlock | `abilities.moonJump` (the Queen beaten) |
| Input | **Hold slide with the stick neutral** (input under 0.2) on the ground. Nobu crouches; after **0.6 s** he glows (`chime`, a gold sparkle ring) = charged. **Press jump** while still holding slide → Moon Jump. |
| Tap behaviour | A slide tap with a neutral stick still does the old standing slide (in the facing direction) if released **before 0.18 s**. The crouch only starts after 0.18 s of holding, and only if `moonJump` is unlocked. Without the move, nothing changes. |
| Height | Launch at `JUMP × √2.2 = 18.7 m/s`, an apex of about **4.85 m** (normal jump is about 2.2 m) |
| Air jumps | Kept. A double jump after the Moon Jump adds about 1.74 m, for about **6.6 m**. Glide works after the air jumps as usual. |
| Level rule | **Moon Ledges sit at 6.0–6.3 m** above the floor beneath them. That is out of reach of a normal jump plus double jump (about 3.9 m), the Crown's triple jump (about 5.7 m) and the Clown-Nose air dash (horizontal only). God Mode's four jumps (about 7.4 m) can reach them; it's a cheat mode, so that's allowed. Keep trampolines and bounce pads away from Moon Ledges. |
| Cancel | Moving the stick, or releasing slide, cancels the crouch. Getting hurt cancels it. |
| Trials | Allowed (a boss move) |
| Feedback | Crouch squash `0.8`, the charged glow, `boing` at pitch 0.7 plus `whoosh` on launch, a dust ring |
| Tutorial | `'NEW MOVE: MOON JUMP! Hold SLIDE without moving, then JUMP. To the moon!'` |
| Code | `player.js`: a `crouch` sub-state of `normal` (`crouchT`), `TUNING.MOON_JUMP = 18.7`, `MOON_CHARGE = 0.6`, `MOON_TAP = 0.18`. The `_startSlide` call moves to the slide release (or to 0.18 s) when `moonJump` is unlocked. |

**Conflict fixed:** plan 3.6 says "hold jump 0.6 s." Jump fires on press (the jump buffer), so holding jump
can't charge without breaking every standing jump. The crouch charge on slide keeps "hold for 0.6 s" and
leaves the jump button alone (section 9).

#### 6.8 Cutscenes and dialogue

- **Intro beats:**
  1. The pipeline opens onto the chart arena.
  2. The tickers all scroll ▲.
  3. The Queen rises out of the pit on a green candle, waving.
  4. Pump.fun pills chant ("PUMP! PUMP!" as `doubleJump` blips).
  5. The lines below play.
- **Stage 4 transition:** the tickers flip to ▼, an alarm sounds, and the crown tilts.
- **Defeat beats:**
  1. Every ticker reads `$0.00`.
  2. She deflates like a balloon, spinning around the arena (a squash-and-flight loop, 2 s).
  3. She pops (confetti burst, `conePop` plus `explosion`).
  4. The crown drops onto Nobu's head for a beat, then he shakes it off: a nod to the Champion's Crown.
  5. The true ending runs if Good Boy % ≥ 80; otherwise the normal chapter end and the Mask's hint about
     the 80% route.

```js
queen: {
  intro: [
    ['queen', 'Well well. The little Akita who keeps crashing my charts.'],
    ['queen', 'Who do you think pumped the Evil Cone? Me, darling. Every cone on this island is my bag.'],
    ['queen', 'Now be a good boy and buy the top.'],
    ['mask', 'She only opens up at the top of a PUMP. Hop the pills to reach her CROWN!'],
  ],
  phase2: [['queen', 'Don\'t you feel it, puppy? The FOMO? Come closer...'], ['mask', 'That beam pulls you in! ZOOMIES out, or GLIDE to a candle!']],
  phase3: [['queen', 'Bubbles never pop, sweetie. Number go up.'], ['mask', 'Pop her bubble with a MEGA BARK, then bite!']],
  phase4: [['queen', 'Fine! RUG PULL! Everybody out!'], ['mask', 'She\'s walled in! SLIDE, then BITE to DUST DASH through!']],
  death: [['queen', 'No no no... it\'s just a dip... buy the dip... somebody buy the dip...']],
},
```

- `'queen'` needs a speaker portrait: `portrait_queen`, whose placeholder is the 2D `pill_bot` image
  tinted magenta.
- Tone, from plan risk 7: she is a fictional, satirical pump.fun caricature, with no real token names,
  tickers or people.

#### 6.9 Files and functions

- `src/bosses/pumpQueen.js` (new): `class PumpQueen extends Boss` with `key: 'queen'`.
  - Methods: `makeStageParts`, `start`, `nextAction`, `ai`, `onHit`, `onTouch`, `onBite`/`onStomp` (crown
    range), `onBark` (bubble), `onDash` (S4), `onResetPhase` (pillars to the wave, ring restored, bubble
    and wake hidden), `beginPhase`, `defeatAnim`.
  - A pillar controller, `driveCandles(dt)`.
- `arena.js`: `CandlePillar`; ring crumble through `ArenaTiles`.
- `enemies.js` `PumpPill`: the bounce power `11 + 2 × pump`. This applies everywhere, including the Cone
  fight and Level 5. Check that it doesn't break the Cone fight: a higher bounce from a pill there is a
  harmless extra.
- `common.js`: `wakeRing`, `falling` (`crate`), the 4-stage support (1.3), a constant-force mode for
  `pullToward`.
- `level5.js`: `buildBoss5Arena`.
- `stage.js`: the `boss5` theme.
- `script.js`: `BOSS_TALK.queen`.
- `player.js`: Moon Jump.
- `ui.js`: 4-pip boss HP.
- `session.js`: the registry entry, 4 `spheres`, and the true-ending branch in `levelCleared` (in
  `game.js`).

#### 6.10 Playtest checklist

- [ ] On a first try, players reach the crown in S1 with no instructions beyond the Mask's line.
- [ ] The pill bounce height is always enough from pillars at `y ≥ 1`. Make sure no pillar layout leaves
  a pumped Queen out of reach for her whole window.
- [ ] The colour-change audio tell plays 0.5 s before every height reversal.
- [ ] FOMO beam: each escape (zoomies, slide jump, glide) works from every ring position.
- [ ] Airdrop colours are readable on the magenta backdrop. Test a colour-blind simulation; add a
  symbol on the chute (`+` for blue, `!` for red).
- [ ] The last-green pillar in Liquidation is always reachable within 2 hops.
- [ ] The Dust Dash through the wake ring works from the outer and inner pillars.
- [ ] The ultimate's true green can be told apart from the decoys by its steady glow, not just its
  colour.
- [ ] The phase checkpoint respawns at each of the 4 stages with the arena correct.
- [ ] Dev run time is logged against 170 s. The fight takes longer than the Titan's but stays under
  4 minutes for a median player.

---

### 7. The difficulty ladder, checked (`tests/difficulty.test.js`)

| Boss | `speed` | `tele` | `window` | `chain` | HP |
| --- | --- | --- | --- | --- | --- |
| bird | 1.00 / 1.20 / 1.40 | 1.00 / 0.88 / 0.78 | 2.7 / 2.4 / 2.2 | 1 / 1 / 2 | 6 |
| cat | 1.00 / 1.20 / 1.45 | 0.95 / 0.84 / 0.74 | **2.7** / 2.4 / 2.0 | 1 / 2 / 2 | 6 |
| cone | 1.00 / 1.25 / 1.50 | 0.90 / 0.80 / 0.70 | 1.8 / 1.4 / 1.1 | 1 / 2 / 3 | 9 |
| titan | 1.15 / 1.35 / 1.55 | 0.85 / 0.76 / 0.68 | 1.7 / 1.35 / 1.05 | 2 / 2 / 3 | 9 |
| queen | 1.20 / 1.40 / 1.60 / 1.70 | 0.82 / 0.74 / 0.66 / 0.62 | 1.6 / 1.3 / 1.05 / 0.95 | 2 / 3 / 3 / 4 | 12 |

Test cases:

1. **Within each boss:** `speed[i+1] ≥ speed[i]`, `chain[i+1] ≥ chain[i]`, `window[i+1] ≤ window[i]`
   and `tele[i+1] ≤ tele[i]`, for every `i`.
2. **Across bosses**, in the order bird, cat, cone, titan, queen: each boss's stage 1 is at least as hard
   as the previous boss's stage 1. That means `speed ≥`, `chain ≥`, `tele ≤` and `window ≤`. Also
   `hp ≥` the previous boss's.
3. **Fairness floor:** every `tele[i] × min base tell (0.5 s) ≥ FLOOR.teleSec` (0.40), and every
   `window[i] ≥ FLOOR.windowSec` (0.90). The Queen's S4 window of 0.95 passes.
4. **DDA:** `window + 0.3` and `tele × 1.15` never make a stage easier than the **previous stage without
   DDA** by more than one step. Case: cone S3 with DDA gives window 1.4, equal to S2's 1.4. That's
   allowed; S2 is 1.4.
5. `stages × perStage === hp` for every boss. The Queen has 4 stages.
6. **M0 guard:** with `M2_ON = false`, `tele` and `chain` read as 1 for bird, cat and cone, and the other
   values equal the literals (2.7/2.4/2.2, 2.8/2.4/2.0, 1.8/1.4/1.1). That proves M0 changes nothing.
   The cross-boss case 2 only runs when `M2_ON` is true: the cat's stage-1 window is 2.8 in M0, which is
   above the bird's 2.7.

---

### 8. Implementation order

These match the plan's milestones.

1. **M0:**
   - The difficulty table and the boss getters (1.1) for bird, cat and cone, with no behaviour change.
   - `difficulty.test.js` cases 1, 3, 5 and 6.
2. **M2:**
   - The shared runner and hooks (1.2, 1.4–1.8).
   - The new projectiles and arena pieces (1.5).
   - Then Bird (2), Cat (3) and Cone (4), in that order, each playtested before the next.
   - Turn on `M2_ON` (cat window 2.7) and difficulty test cases 2 and 4.
3. **M3:**
   - The 4-stage evolve support (1.3) can land here or in M2.
   - Roomba Titan (5), its arena, and Dust Dash.
4. **M4:**
   - Pump Queen (6), her arena, Moon Jump, the `PumpPill` bounce rule, and the true-ending branch.
5. After each boss, run `npm test` and `npm run build`, then a manual fight with:
   - God Mode off and a Golden Collar equipped (collar saves count as hits for No-Hit);
   - the Wizard Hat, which skips bosses (`skip_bosses`), to check that skipping still works for the
     Titan and the Queen;
   - the Classic Nobu model.

---

### 9. Conflicts with the plan, and how this spec settles them

1. **Phase checkpoints.** Plan 4.2 says they already exist for every boss. In the code, only the Evil Cone
   respawns at its stage (`session.js`, respawn: `bossKey === 'cone' ? this.bossPhaseCp : 1`). This spec
   turns them on for all five (1.4). That makes the Bird and the Cat a little easier than today.
   **Owner question:** keep full restarts for the Bird and the Cat (`phaseCheckpoints = false`) if you'd
   rather they stay harsh.
2. **Cat stage-1 window.** Plan 4.1 lists the cat's window as 2.8, but its own ladder rule (each boss's
   stage 1 at least as hard as the previous one) needs it at or under the bird's 2.7. This spec uses
   **2.7** from M2, and the M0 test keeps 2.8, so M0 doesn't change behaviour (7, case 6). Plan 7.1's
   "2.8 → 2.0" becomes "2.7 → 2.0."
3. **Moon Jump input.** Plan 3.6 and 7.6 say "hold jump 0.6 s." That can't work: jump fires on press. This
   spec uses a crouch charge on slide with a neutral stick, then jump (6.7). Same 0.6 s hold, same
   height, and no change to existing jumps.
4. **Smog Tide pedestals.** The plan has 4 pedestals with no layout. This spec puts them at the compass
   points `r 4.2`, so each hop is 5.9 m. Corner positions would be 12 m apart, too far to hop.
5. **Bird egg craters** are damage zones, not real pits, because the arena floor is one solid block (2.2).
6. **The Titan's punish is a belly flop only.** Bite and slide do nothing, so its 1.6 m top is a
   deliberate verb check, which the plan implies ("belly-flop its top button").
7. **The Pump Queen's pill ladder** needs a new `PumpPill` bounce rule (`11 + 2 × pump`). It also affects
   the Cone fight and Level 5. The effect there is small; check it in the M4 playtest.

---

# Part 5: New levels spec (kit API, L4, L5)

Source: `docs/expansion/new-levels-spec.md`

## New levels spec: kit helpers, Level 4 (Laundry Day) and Level 5 (Pump & Dump Pipeline)

Status: **spec only.** No game code has changed. This file adds implementation detail to
`docs/gameplay-expansion-plan.md` sections 5, 6.0–6.2, 9 and 10.1. Where this file and the plan differ, the
change is listed in section 0.2.

Related specs, in this folder:

- `rewards-spec.md` owns the Bone Board, Mystery rolls, the DDA ladder, Hidden Bones and the Chomp Chain
  rules. This file only places those objects.
- `bosses-spec.md` owns both boss fights and the arena internals. This file only links the boss gate to
  the arena.
- `box-gauntlets-spec.md` owns `k.blinkBox`, `k.bounceChain`, `k.fallBox`, `k.slideBox` and `k.arrowChain`. This file only places them.
- `level6-spec.md` owns Level 6, **Smog Rapids**, which sits between Level 4 and Level 5 on the map. It
  also owns `k.raft(...)`.
- The level-extension spec owns the Level 1–3 and bonus-stage extensions. It uses the helper API defined
  here.

---

### 0. Summary

#### 0.1 What this file owns

1. **The new kit helper API (section 1).** It covers 16 signatures that other specs rely on, plus the
   extra helpers and options these two levels need (1.18).
2. **The physics and authoring rules** every helper and level must follow (section 2).
3. **Level 4, Laundry Day (section 3):**
   - About **480 m to the boss gate**, in 7 main sections; the last one, the Boiler Room, is the hardest.
   - Two detours: **Top Shelf**, an 80 m loop above the laundry, and **The Pantry**, a 56 m side lane
     along the kitchen.
   - 7 dogs.
4. **Level 5, Pump & Dump Pipeline (section 4):**
   - About **460 m to the boss gate**, in 7 main sections; the last one, the side-on Liquidation Line,
     is the hardest.
   - Two detours: **The Order Book**, a 76 m loop above the trading floor, and **The Cold Wallet**, a
     62 m icy side vault.
   - 7 dogs.
5. **Wiring (section 5):** registry entries, themes, map nodes, unlocks with Level 6 between 4 and 5,
   Chapter 2 story text, tutorial copy and music notes.
6. **Playtest checklists (section 6).**

#### 0.2 Changes from the plan (scope change from the owner, 2026-11-04)

| Plan said | This spec | Why |
| --- | --- | --- |
| L4 about 300 m (380 m with a detour), 6 sections, 5 dogs | **About 480 m to the gate**, 7 sections (adds the **Boiler Room**), **2 detours**, **7 dogs** | The owner asked to "extend all the levels more" |
| L5 about 280 m (360 m with a detour), 6 sections, 5 dogs | **About 460 m to the gate**, 7 sections (adds the **Liquidation Line**), **2 detours**, **7 dogs** | Same |
| L5 unlocks when the Titan is beaten | **L6 Smog Rapids** unlocks when the Titan is beaten. **L5** unlocks when **L6 is cleared**. | "Add another level." L6 is specced in `level6-spec.md` |
| Map order `[1, 'ride', 2, 'cave', 3, 4, 5, 'kennel']` | `[1, 'ride', 2, 'cave', 3, 4, 6, 5, 'kennel']` | Same |
| L4 trial gold 62 s, platinum 56 s; L5 gold 58 s, platinum 52 s | **L4:** gold 98, silver 125, bronze 160, platinum 90 s. **L5:** gold 95, silver 118, bronze 156, platinum 85 s. | Scaled by length (×1.6 and ×1.64), rounded |
| Hub floor proposals: L4 15000 ms, L5 13000 ms | **L4 24000 ms, L5 21000 ms** | Scaled the same way. These still need a metaverse-hub PR (plan 10.2) |
| Target first-play deaths: L4 8–12, L5 10–15 | **L4 10–14, L5 12–18** (L6 sits between) | The owner: "the new levels should be harder too." Section 3.0a and 4.0a list the harder pass |
| No box gauntlets | **At least 2 Box Gauntlets per level.** The last section before each gate is one. | The owner: "levels where you can only pass by timing jumps correctly on boxes." The helpers are owned by `box-gauntlets-spec.md` |
| Detours exit anywhere | **Detour rule (1.16):** a downstream exit is allowed only if the skipped stretch can be walked back. Loops only on chase, ride, raft or auto-scroll stretches. `detour.loop` and `skipSpan` in each table | One-run Golden Bone feasibility |
| L5 "Dog 3 on a Moon Ledge (post-game)" | Dog 3 is on the **main path** in the Smog Wave. The L5 Moon Ledge holds only the **Hidden Bone**. | Plan rule 3.6: the Golden Bone never needs a later move. The plan already flagged this. |
| L4 Cookie Jar bonus round "on the fridge top," no height given | Cookie Jar at `h: 12` over the kitchen (d 226–244). It doesn't overlap a detour. | Detour A sits over the laundry and ironing board (d 120–158), so the heights never clash |

#### 0.3 Lengths at a glance

| Level | Main path to the gate | Detour A | Detour B | Authored route in total | Boss gate | `END` |
| --- | --- | --- | --- | --- | --- | --- |
| L4 Laundry Day | 476 m | Top Shelf loop, ~80 m | The Pantry lane, ~56 m | ~612 m | d 476 | 486 |
| L5 Pump & Dump | 456 m | The Order Book loop, ~76 m | The Cold Wallet lane, ~62 m | ~594 m | d 456 | 466 |

**Trial route** = the main path only. Detours are never needed for a trial, and in a trial run they hold
Freeze Packs only where a backpack there gets replaced (`Session._setupTrial` replaces every 4th plain
backpack, detours included).

---

### 1. Kit helper API

#### 1.0 Conventions for every helper

- **Coordinates.** All helpers take **track coordinates**: `x` is lateral (+ is right when facing forward),
  `y` is metres above the path height at that `d`, and `d` is the distance along the track. They convert
  with `k.W(x, y, d)`, which `makeKit` already provides.
  - Because everything goes through `W()`, the planned `mirror` option (plan 4.5) flips every helper for
    free. **No helper may compute a world lateral direction except through `W()`, `rightAt()` or
    `fwdAt()`.**
- **Return value.** Each helper returns the entity it adds (`stage.add(e)`), or the span for floor-like
  helpers, so levels can keep a reference.
- **File layout.**
  - New entity classes go in `src/entities/props2.js`, so they don't clash with the open PR or with other
    tasks editing `props.js`.
  - The exceptions: `Chaser` goes in `src/entities/chaser.js`, and `MysteryBackpack` and `PitySnacks` go in
    `src/entities/breakables.js` next to their parent classes.
  - Helpers are added to `makeKit` in `src/levels/kit.js`.
- **Rollback on death.** `Session.respawn()` already calls `e.onRespawn?.()` on every entity, plus
  `reset()` for `Enemy`, `CrumblePlatform`, `CrackedFloor` and `CoconutRoller` (`session.js`, `respawn()`).
  - **Every new entity puts its rollback in `onRespawn()`.** Never extend the `instanceof` list in
    `respawn()`.
  - Entities that must know where the checkpoint is read `this.session.cp.pos` and project it with
    `track.project()`.
- **Triggers.** `track.trigger(d, fn)` fires **once per attempt and never re-arms** (`session.js`, the
  update loop: `t.fired = true`).
  - Anything that must restart after a death (chases, rising hazards, rug pulls, ambushes) is an entity
    with its own `armed` flag, re-armed in `onRespawn()`. **Never use `k.trigger` for it.**
- **Player state.** Helpers read `p.body.s` and `p.body.u` (the player's track position), `p.pos`,
  `p.vel`, `p.dead`, `p.god`, `p.biteT`, `p.mode` and `p.abilities`. They only call existing player
  methods (`bounce`, `hurt`, `die`, `spawnAt`), plus the new `p.hang` API from 1.10.
- **Trial, god mode and remix flags.** Read them from `this.session.trial`, `p.god` and
  `this.session.remix` (set by the Remix work in plan 4.5; treat it as `false` until that exists).
- **Performance.**
  - Every new entity sets `alwaysActive = false` unless it says otherwise, so the stage's distance culling
    keeps working.
  - Geometry is built once per class and shared, as `CoconutRoller` does with `this.geo` and `this.mat`.
  - No per-frame allocation: reuse module-level `_v` vectors, following the "stop per-frame allocations"
    commit `a65687e`.

#### 1.1 `k.section(d0, d1, name)`

- **What it does:** records a named stretch of the level. It has no entity and no visuals.
- **Storage:** `track.sections.push({ d0, d1, name })` in a new `Track.sections` array, kept sorted by
  `d0`. Add `Track.sectionAt(s)`, which returns the last section with `d0 <= s < d1`, or `null`.
- **Who uses it:**
  - The next-goal hint ("3 backpacks missed near **Lily Pond**", `rewards-spec.md`).
  - The dev section timers and the death heatmap (plan 4.6).
  - The pause menu, which shows the current section name under the level name.
  - The DDA ladder, which scopes "this section" (`rewards-spec.md`).
- **Rules:**
  - Sections must cover the whole main path from the spawn to the gate, with no gaps.
  - Detours register their own sections through `kd.section`, flagged `{ detour: true }`.
  - Names are title case, 1–3 words, and shown as written.
- **Test:** `tests/sections.test.js` builds a `Track` from a straight `turtle` and checks `sectionAt` at
  each boundary.

#### 1.2 `k.chase(d0, d1, { model, scale = 1, count = 1, speed, catchUp = 1.0, lanes })`

This generalises `ChaseCat` (`src/bosses/bigCat.js`) into `Chaser` (`src/entities/chaser.js`), which
covers part of a level instead of the whole level.

- **Parameters:**

  | Param | Meaning |
  | --- | --- |
  | `model` | An asset id (`'model_mini_roomba'`, `'model_ghost_cat'`), or one of the procedural ids `'smog_wall'` and `'giant_coconut'`. The id resolves through `art/placeholders.js` (plan 9.1). |
  | `scale` | Model scale on top of the placeholder's own scale. |
  | `count` | Number of pursuers. They share one track position; each has its own lateral lane and stride offset. |
  | `speed` | Base speed in m/s, used while the gap is under 5 m. Default `7.0`, which is under `TUNING.RUN` 8.0 so a clean runner gains ground. |
  | `catchUp` | Multiplies the rubber band. `1.0` copies `ChaseCat`. |
  | `lanes` | Lateral offsets for each pursuer when `count > 1`, e.g. `[-2.2, 0, 2.2]`. Default `[0]`. With one pursuer, it steers toward Nobu's lane, as `ChaseCat` does. |

- **Rubber band:** copied from `ChaseCat.update` with the speeds scaled by `speed / 6.7`:

  ```js
  const k = this.speed0 / 6.7;
  const target = (gap < 5 ? 6.7 : gap < 9 ? 6.7 + (gap - 5) * 0.375 : Math.min(10.5, 8.2 + (gap - 9) * 0.575)) * k * dda;
  // gap is how far Nobu is ahead (p.body.s - this.s). catchUp multiplies the two slope terms only.
  ```

  `dda` is `1 - 0.08 × (DDA level ≥ 5 deaths ? 1 : 0)` (plan 4.3). It is always `1` in trials, remixes and
  medal runs.
- **States:** `'idle'` → `'wait'` → `'run'` → `'gloat'` (after killing Nobu) → `'done'`.
  - **Start:** when `p.body.s >= d0`, it moves from `'idle'` to `'wait'` (1.2 s), placed 13 m behind Nobu.
  - **Camera:** it switches to `trackFront` with `{ height: 6.6, dist: 12.5, behind: 0.5 }`, the level 2
    values. It shows the banner `RUN!`, `Hold ↓ / S toward the camera`, the first time in the attempt
    (as `Session._startChase` does).
  - **End:** when `p.body.s >= d1`, the pursuer crashes or stops (a per-model end animation: Roombas
    tip over, smog thins out) and the state becomes `'done'`. The camera eases back to the level's own
    camera options over 0.8 s, by calling `camera.setMode(info.camera.mode, info.camera)`.
- **Leaping:** pits and logs use the `ChaseCat` leap code unchanged (`_blocked`, `leap`).
  - `'smog_wall'` **never leaps**. It floats over pits at the path height.
  - `'giant_coconut'` rolls into pits and is respawned on the far side 0.6 s later, behind Nobu.
- **Kill rule:** when `gap < 2.4` and `!p.dead`, the pursuer kills Nobu. Death type is `'flat'` for
  Roombas and the coconut, `'cone'` for smog. In god mode it can only breathe down your neck: it holds
  `this.s = ps - 2.4`, as `ChaseCat` does.
- **Collision:** none. The pursuer is not a Solid. Only the gap check above kills.
- **Rollback (`onRespawn`):** project the checkpoint position.
  - Checkpoint inside `[d0, d1)`: re-arm at `'wait'` 13 m behind the checkpoint with a 1.6 s delay, as
    `session.respawn()` does for `info.chase`, and switch the camera to `trackFront` again.
  - Checkpoint before `d0`: back to `'idle'`, at the level's own camera.
  - Checkpoint after `d1`: stay `'done'`.
- **Session wiring:**
  - `session.chase` keeps its current meaning (a whole-level chase from `info.chase`).
  - Segment chasers are found with `stage.entities.filter((e) => e instanceof Chaser)`. They are ignored
    when the level reaches the boss gate. They are already `'done'` by then, because each chase ends
    before the gate.
  - The current `ChaseCat` stays as it is. Refactoring `ChaseCat` onto `Chaser` is optional. If it is
    done, L2 must play exactly the same: same numbers, tested by playing it.
- **Visuals:**
  - `'model_mini_roomba'` → `model_vacuum` ×1.4 (plan 9.2), wheels spinning, a brush-dust trail every
    0.08 s (`fx.dust`).
  - `'smog_wall'`: 14 large camera-facing smoke cards (`fx.smokeCard`-style, but owned by the entity)
    in a 9 m × 6 m wall, colour `0x6a5a7a`, plus two red "eyes" (`MeshBasicMaterial` spheres) that track
    Nobu.
  - `'giant_coconut'` → `CoconutRoller`'s sphere geometry ×5, `toon(0x6a4020)`.
- **Audio:**
  - Roombas: `'whirr'` on start, `'stomp'` on landings, `'bonk'` when they tip over at the end.
  - Smog: a looping low `'suck'` every 1.2 s while within 12 m.
  - All: `'laugh'` from the gloat state, as `ChaseCat` plays `'meow'`.
- **Performance:**
  - `alwaysActive = true` only while it is in `'wait'` or `'run'`.
  - Three Roombas share one cloned GLB scene; use `SkeletonUtils.clone` only if the GLB is rigged.

#### 1.3 `k.pitySnacks(x, y, d)`

- **Class:** `PitySnacks extends Snacks` (`breakables.js`).
- **What it does:** a hidden checkpoint spot that DDA can switch on.
- **Default state:**
  - Invisible.
  - `countable = false`, so it never counts toward the Golden Bone or the missed-backpack rain.
  - No Solid, no interaction.
- **`arm()`:** called by the DDA code (`rewards-spec.md`). It shows a puff (`fx.burst`, white and gold),
  then the normal Snacks model drops in from 2 m with `'chime'`. From then on it behaves like Snacks:
  - Breaking it calls `session.checkpoint(pos, this)`.
  - It stays `countable = false` even after it is armed.
- **Rollback:** an armed spot stays armed for the rest of the attempt. `onRespawn()` does nothing.
- **Trials, remixes and medal runs:** `arm()` is a no-op.
- **Placement rule:**
  - Exactly one per main-path section that is 40 m or longer, placed about halfway between that section's
    checkpoints.
  - Never on a moving or crumbling surface.
  - Never inside a chase's `[d0, d1]` unless the chase is 60 m or longer.

#### 1.4 `k.mystery(x, y, d, { slot })`

- **Class:** `MysteryBackpack extends Backpack` (`breakables.js`).
- **Look:** the backpack model with a procedural "?" decal on the front: a canvas texture, a white "?"
  on a purple circle, 128×128, cached once.
- **One bite opens it** (also a stomp, slide or flop). On break it calls
  `mysteryRoll(session.level, slot)` from `src/game/mystery.js` (`rewards-spec.md` owns the table and the
  seed), then spawns the result at its own position:

  | Roll | Spawn |
  | --- | --- |
  | `tickets` | `this.game.tickets.spawnFlying(...)` |
  | `sphere` | A Blue Sphere, using the existing `BlueSphere` |
  | `cat` | A lit Cat, using the existing `Cat`, with its fuse started |
  | `tramp` | A Trampoline, using the existing `Trampoline` |
  | `oneUp` | A 1UP |

- **Counting:** it counts as one breakable (`countable = true`). A spawned result is a separate entity
  that is **not** countable; set `countable = false` on it.
- **`slot`:** an integer, unique within the level, from 0. Slots are listed in each level's tally table.
  Maximum 3 per level (plan 3.3).
- **Rollback:** a normal Breakable `restore()`. The spawned result is removed in `onRestore`. Because the
  roll is seeded, it comes out the same next time.
- **Trials and remixes:** `Session._setupTrial()` turns it into a plain countable Backpack. Set a flag
  `this.plain = true`, which skips the roll and uses the backpack texture.

#### 1.5 `k.dustWall(x, y, d, { w = 3, h = 2.6 })`

- **Class:** `DustWall extends Entity` (`props2.js`).
- **Body:** a Solid box `w × h × 0.9`, facing along the track (`yaw = yawAt(d)`).
- **Look:**
  - A grey fuzz texture: procedural canvas noise, `0x8a8a90` with lighter flecks.
  - 6 slow-drifting dust motes around it (`fx.dust`, every 0.5 s while within 20 m).
  - It must **look gated**: a soft outline glow `0xb0b0c0` pulses every 2 s.
- **What breaks it:** only **Dust Dash** (the Roomba Titan's reward). The player exposes
  `p.dustDashing` (boolean) while the dash burst runs (`bosses-spec.md` owns the move). On contact while
  `p.dustDashing`:
  1. The solid turns off.
  2. A `fx.burst` of 24 grey puffs, a camera shake of 0.25, and `'explosion'` at volume 0.6.
  3. The wall stays broken for the attempt.
- **Other contact** (bite, stomp, slide, flop, bark): a small puff, `'bonk'`. The first time per save,
  `ui.tutorial('dustwall')` explains it. If Dust Dash isn't owned yet, the copy says "Come back with a
  faster move."
- **Rollback:** none. Broken stays broken for the attempt.
- **Counting:** it is **not** a Breakable and never counts toward anything.
- **Placement rule:** only in front of Hidden Bones, optional tickets, or a short cut.

#### 1.6 `k.moonLedge(x, y, d, { w = 2.4, dd = 2.4 })`

- **Class:** `MoonLedge extends StaticPlatform` (`props2.js`).
- **Body:** a normal solid platform, `h = 0.5`.
- **Look:** the platform tinted `0xdfe8ff`, plus a ring of 6 small `MeshBasicMaterial` "moon" dots
  (`0xfff6c8`, `fog: false`) orbiting slowly above it, so it can be spotted from the ground.
- **Height rule (tested):** `y` must be at least `MOON_LEDGE_MIN = 6.2` m above every surface you can
  stand on within 4 m horizontally.
  - Normal reach is about 3.9 m: a jump (`TUNING.JUMP` 12.6, about 2.2 m) plus a double jump
    (`DOUBLE_JUMP` 11.2, about 1.7 m).
  - The Champion's Crown adds a third jump, for about 5.7 m.
  - Moon Jump (2.2× the first jump, about 4.8 m) plus a double jump gives about 6.6 m.
  - 6.2 m sits between the two.
  - If `bosses-spec.md` changes the Moon Jump numbers, recompute `MOON_LEDGE_MIN` and re-run the test.
- **Dev check:** `tests/moon-ledge.test.js` scans each level's placement list (exported from the level
  file as `MOON_LEDGES`, with the surfaces near each) and checks the gap.
- **No gating logic.** It is always solid; only height gates it.

#### 1.7 `k.smogVent(x, y, d, { lift = 6 })`

- **Class:** `SmogVent extends Entity` (`props2.js`).
- **What it is:** a floor vent (the `vent` decor mesh at 1.4× scale) choked by a column of thick purple
  smog. While choked, it is a harmless visual and **blocks nothing**: you can stand in the smog, and
  nothing lifts you.
- **Look:** 10 stacked smoke cards, colour `0x7a4a9a`, alpha 0.7, slowly churning.
- **Clearing it:** a Mega Bark (`onBark()`, the same hook `BarkRock` uses) within range clears the smog
  in 0.6 s (the cards puff outward, `'whoosh'`). The vent then becomes an **updraft** with the same
  behaviour as `UpdraftFan`: `height = lift`, `power = 30`. Reuse the fan's update code; factor it out of
  `UpdraftFan` into an `updraft(p, dt)` function in `props.js`.
- **First touch** while choked: `ui.tutorial('smogvent')`.
- **Rollback:** none. It stays cleared for the attempt.
- **Placement:** there must be something worth reaching at `y + lift` within 1.5 m horizontally: a
  platform with a colored bone, a dog or tickets.

#### 1.8 `k.zoomieGate(x, y, d, { plateD, open = 2.5 })`

- **Class:** `ZoomieGate extends Entity` (`props2.js`).
- **Parts:**
  - A **floor plate** at `(x, y, plateD)`: a yellow 1.6 × 1.6 m pad with a paw icon.
  - A **shutter** at `(x, y, d)`: a Solid 2.2 m wide × 2.6 m tall × 0.3 m, striped yellow and black.
- **Behaviour:**
  1. When Nobu crosses the plate (`|u - x| < 1.0` and `s` crossing `plateD`, ground or air), the shutter
     opens: it slides up 2.6 m in 0.15 s (`'switch'`).
  2. It stays open for `open` seconds, ticking (`'tick'` every 0.5 s, faster in the last second).
  3. Then it slams down in 0.12 s (`'clank'` is not a sound in `audio.js`, so use `'clang'`).
- **The gate rule** (tested in `tests/zoomie-gate.test.js` as a pure function `gateReachable(dist, open,
  speed)`):
  - The distance from the plate to the gate, `d - plateD`, must be greater than `TUNING.RUN × open`
    (8.0 × 2.5 = 20 m) and less than `ZOOM_SPEED × open × 0.9`. Zoomies speed is
    `TUNING.RUN × 1.55 = 12.4` m/s (`player.js`, `speedMul`), so the limit is 27.9 m.
  - **Use `plateD = d - 22`** with the default `open`.
- **Rollback:** the shutter closes and the timer resets.
- **Behind the gate:** only optional content: tickets, short cuts, a Hidden Bone. Never a dog or a
  breakable that counts toward the Golden Bone.

#### 1.9 `k.spinDrum(d, { x = 0, y = 0, r = 3.2, n = 4, period = 6, w = 2.2, dd = 2.2 })`

- **Class:** `SpinDrum extends Entity` (`props2.js`).
- **What it is:** a ring of `n` platforms orbiting a hub at `(x, y, d)` with radius `r`. One revolution
  takes `period` seconds.
- **Platforms stay level,** like a Ferris wheel. That keeps them standable, because Solids are
  axis-aligned boxes.
- **Extra options** (additions to the fixed signature; defaults keep it valid):

  | Option | Default | Meaning |
  | --- | --- | --- |
  | `axis` | `'x'` | `'x'`: the wheel turns in the d–y plane, carrying Nobu forward and up and over. `'z'`: a washing-machine drum turning in the x–y plane, carrying Nobu sideways and up. |
  | `crumble` | `[]` | Indexes of ring platforms that act as `CrumblePlatform`: 0.55 s shake, then they fall and respawn in their slot 2.8 s later. |
  | `dir` | `1` | `1` turns so the top of the wheel moves forward (+d). `-1` reverses it. |
  | `phase` | `0` | Starting angle in radians. |

- **Position of platform `i` at time t:**
  `a = phase + dir × 2π × (t / period + i / n)`. With `axis 'x'` the platform sits at
  `W(x, y + r·sin a, d + r·cos a)`; with `axis 'z'` at `W(x + r·cos a, y + r·sin a, d)`.
  - Each platform is a `{ kind: 'moving' }` Solid updated with `solid.setCenter(...)`, exactly as
    `MovingPlatform.update` does, so the existing platform-carry code moves Nobu with it.
- **Speed check:** the tangential speed `2πr / period` must stay at or under **3.4 m/s**. Faster
  platforms throw Nobu off at the top of the arc. Dev builds warn in the console when this is exceeded.
- **Look:**
  - The hub is a chrome cylinder with a glass porthole ring (`toon(0xd8dde6)` and a transparent disc)
    and 4 thin spokes to each platform.
  - Platforms use `platformMesh` with the theme texture, plus yellow runners as on `MovingPlatform`.
- **Audio:** `'whirr'` every full turn, at volume 0.4.
- **Rollback:** none. It is deterministic in time, and the time keeps running. Crumble platforms reset
  through their own state machine, and their `onRespawn()` puts them back.
- **Performance:**
  - `alwaysActive = true`, because platforms must keep a consistent phase.
  - Use one shared `BoxGeometry` per `(w, dd)` size.
- **Tests:** `drumPos(i, t, opts)` is a pure, exported function. The test checks one full revolution
  comes back to the start and checks the speed rule.

#### 1.10 `k.zipline(x0, y0, d0, x1, y1, d1, { speed = 9 })`

- **Class:** `Zipline extends Entity` (`props2.js`).
- **What it is:** a line from `A = W(x0, y0, d0)` to `B = W(x1, y1, d1)`. `y0` and `y1` are the **line**
  heights; Nobu hangs `HANG = 1.25` m below the line.
- **Grab:** a bite (`p.biteT` in 0.05–0.3) with the hang point within **1.2 m** of the line at its first
  20%, or anywhere along it in mid-air when falling onto it, attaches Nobu.
- **New player API:** `p.hang = { line, t }` (in `player.js`).
  - While it is set, the normal physics step is skipped.
  - Nobu is placed at `lerp(A, B, t) - (0, HANG, 0)` and faces `B - A` (horizontal component).
  - `t` advances by `speed × dt / |B - A|`. **It moves from A to B whatever the slope**: uphill lines are
    pulley lines.
- **Release:**
  - **Jump** while hanging: `p.hang = null`, `p.vel` = the line velocity + a jump of `TUNING.JUMP × 0.85`,
    and air jumps are refilled (`p.canDouble = true`).
  - **At `t = 1`:** an automatic small hop (`vel.y = 6`) plus the line velocity × 0.6.
  - **Hurt while hanging:** released, then the normal hurt.
- **Look:**
  - The line is a thin tube (`TubeGeometry`, 0.035 m radius) with a slight sag: a quadratic bezier with a
    0.25 m drop at the middle, sampled in 12 segments.
  - Two end posts (`fencePost` mesh scaled ×1.6), and a pulley wheel that rides the line with Nobu.
  - L4 clotheslines get 3–5 hanging socks as decor, using the `toon` primitives.
- **Audio:** `'zip'` on grab, a looping `'roll'` at volume 0.3 every 0.25 s while sliding, `'jump'` on
  release.
- **Camera:** none needed. The track camera follows `p.pos`.
- **Rollback:** `onRespawn()` clears `p.hang` if it points at this line.
- **Trials:** unchanged.
- **Tickets on a line:** put them at `hang height + 0.4`. With `k.tix`, whose `y` already gets +0.9, use
  `y_line - 1.75`.

#### 1.11 `k.toaster(x, y, d, { power = 15, period = 2.4, phase = 0 })`

- **Class:** `Toaster extends Entity` (`props2.js`).
- **What it is:** a toaster body (a `toon(0xd8dde6)` rounded box, 1.6 × 1.0 × 1.2) whose top, two toast
  slices, is a standable Solid at `y + 1.0`.
- **Cycle** (`period` seconds, offset by `phase`):

  | Time in cycle | What happens |
  | --- | --- |
  | 0 → `period − 0.6` | Idle. Toast is down and standable. |
  | `period − 0.6` → `period` | **The tell:** the slot glows orange (emissive ramp), with `'tick'` at −0.6 and −0.3 s. |
  | `period` | **Pop.** If Nobu is grounded on it: `p.bounce(power, { allowCut: false })`, `'boing'`, toast slices fly up 2 m and fall back. |

- **Height reached:** a bounce of `power` reaches about `power² / 72` m above the toast top, about 3.1 m
  for 15. Holding jump adds some, as on mushrooms. L1's trampoline and mushrooms reach about 4.4 m with
  power 16–17.
  - **Rule:** a shelf above a toaster sits at `y + 1.0 + 3.2` with the default power. That is `4.2` for a
    toaster on the floor.
- **`skin`** (extra option): `'valve'` draws a brass steam valve instead (`toon(0xc8a040)`) and swaps the
  toast for a steam burst (`fx.smokeCard`, white). It is used in the Boiler Room.
- **Rollback:** none. Time-driven.

#### 1.12 `k.market(x, y, d, { amp = 2.2, w = 2.4, dd = 2.4, group = 'a', invert = false })` and `MarketClock`

**`MarketClock`** (`src/entities/market.js`): one per stage, created by the first `k.market` call and
stored as `stage.marketClock`.

- **Timing:**
  - `bpm` is the stage's music bpm. L5 is **128** (section 5.6); other themes default to 120.
  - `step = 2 × 60 / bpm` = **0.9375 s** at 128 bpm.
- **Patterns:** each `group` has a pattern of levels in `{-1, 0, +1}`, read one per step and looping:

  | Group | Pattern | Used for |
  | --- | --- | --- |
  | `'a'` | `[+1, +1, -1, +1, -1, -1, +1, -1]` | default |
  | `'b'` | `[+1, 0, -1, 0]` | gentle |
  | `'c'` | `[+1, +1, +1, -1]` | chase-safe: up most of the time |
  | `'d'` | `[+1, -1, +1, -1, 0, +1, -1, -1]` | detours: busy |
  | `'e'` | `[+1, 0, +1, 0, -1, 0]` | chimney: rising |
  | `'f'` | `[0, +1, 0, -1]` | rug pull |
  | `'g'` | `[+1, -1, -1, +1, +1, -1]` | final exam |

  - The patterns are data in `market.js` (`MARKET_PATTERNS`), so each one can be tuned.
- **Telling ahead:** `clock.level(group, k)` is the level at step `k`, and `clock.next(group)` is the
  level of the **next** step. Every tell reads `next`, so the player always knows one step ahead.
- **Audio tells:** on each step boundary, if any market platform of a group is within 18 m, play
  `'chime'` when the **next** level of that group is higher, `'beep'` when it is lower, and nothing when
  it is the same. Play at most one sound per step, choosing the nearest group.

**`MarketPlatform`** (`k.market`):

- **Position:** `y_now = y + amp × ease(L)`, where `L` moves from the previous level to the current one
  over the first **0.45 s** of each step (smoothstep), then holds. `invert` flips the sign of `L`.
- **Body:** a `{ kind: 'moving' }` Solid, as on `MovingPlatform`.
- **Look:**
  - `platformMesh` with a thin neon edge strip: a `MeshBasicMaterial` frame.
  - The edge is **green** (`0x4ade80`) when the platform's next move is up, **red** (`0xff4a5a`) when it
    is down, and white when it holds.
  - A small arrow sprite (▲ / ▼ / ■) floats 0.5 m above its front edge.
- **Fairness rule:** `amp ≤ 2.6`. In a pit, the lowest position (`y − amp`) must stay at least 0.6 m
  above any fall-out plane: `k.water` `y`, or the rising hazard's `y1`. That way a "red" platform
  lowers you but never drowns you.
- **Rollback:** none. Time-driven and global.
- **`k.ticker(x, y, d, { group })`** (extra helper, decor only): a 2 × 1 m sign showing the next three
  levels of a group as arrows, scrolling left on each step. It is used to teach the clock.

#### 1.13 `k.rugPull(d0, d1, { x = 0, w = 3, tile = 2.4, speed = 7 })`

- **Class:** `RugPull extends Entity` (`props2.js`).
- **What it is:** a strip of `Math.floor((d1 - d0) / tile)` rug tiles. Each is a Solid `w × 0.4 × (tile −
  0.1)` with the `rug` texture on top, laid end to end from `d0` to `d1` at path height, over a pit.
- **States:** `'idle'` → `'pulling'` → `'gone'`.
  - **Start:** the first time Nobu stands on tile 0, the **collapse front** starts at `d0` and moves
    forward at `speed` m/s. Tile `i` falls when the front passes its back edge.
  - **The tell** for a tile: it curls up at its back edge (rotate 15°) and plays a `'roll'` tick 0.25 s
    before it falls.
  - **Falling:** the tile tips over and drops with gravity 25, as `CrumblePlatform` does, and its solid
    turns off 0.2 s in.
  - **Speed rule:** `speed` must be under `TUNING.RUN` (8.0) and at least `RUN − 1.5`. If you keep
    running you win; if you stop, it catches you.
- **Cats on the strip:** any `Cat` entity standing on a tile is **lit** (`cat.light()`; its fuse starts)
  when the front passes it. That makes the "cat chain you must outrun." Add a `light()` method to `Cat`
  if one doesn't exist; it does what touching the cat does today.
- **Rollback (`onRespawn`):** every tile back in place, the front back to `'idle'`, and lit cats restored
  by their own Breakable rollback.
- **Look:** a dust puff and a `'whoosh'` per fallen tile. On the first pull, the camera shakes
  0.15 and a death-caption-style banner says **RUG PULL!** (once per attempt).
- **Death type:** falling through is the normal `'fall'` death. **Kill rule:** if the front passes the
  tile Nobu is standing on, Nobu falls with it. That is the normal fall, so there's no special death
  type.

#### 1.14 `k.rising(d0, d1, { y0, y1, rate, trigger = 'enter' })`

- **Class:** `RisingHazard extends Entity` (`props2.js`).
- **What it is:** a liquid surface over `[d0, d1]`, starting at `y0` (relative to the path) and rising
  at `rate` m/s up to `y1`.
- **Starting it (`trigger`):**
  - `'enter'`: starts when `p.body.s >= d0`.
  - `'switch'`: starts when a BoneSwitch or VacuumSwitch linked with `hazard.armWith(switchEntity)` is hit.
  - A number `dS`: starts when `p.body.s >= dS`.
- **Kill:** while active, if `d0 ≤ p.body.s ≤ d1` and Nobu's feet are below the surface, it is a
  `'fall'` death.
  - **God mode:** bounce him back onto the last solid ground, as god mode does for pits.
  - Outside `[d0, d1]` it can't hurt you, because the tank ends with a wall mesh at `d1`.
- **When Nobu passes `d1`:** it drains at `3 × rate` back to `y0` and stops (a visual reward).
- **Fairness rule** (tested): every standable surface in `[d0, d1]` that Nobu must use after time `T`
  has to be above `y0 + rate × T`.
  - Authors give each surface a **target arrival time**: a good pace of about 6 m/s along `d` plus the
    vertical climb time.
  - **Rule of thumb:** the surface at the moment Nobu arrives must be **at least 1.5 m below the
    surface he stands on**, at a good pace. Dev builds draw a debug line of the "pace" surface.
- **Look:**
  - It reuses the `k.water` shader material (`waterMaterial(color, w)`), on a mesh whose `position.y`
    animates.
  - Colours: L4 hot water `0xffb070` with steam cards rising from it; L5 smog-liquid `0x6a3aa0` with
    purple bubbles (`stage` bubble emitter).
- **Audio:** start: `'suck'` (reversed feel), plus a banner **"IT'S RISING!"**. While active within
  15 m: a soft `'roll'` every 0.6 s.
- **Rollback (`onRespawn`):** back to `y0`, state `'armed'`.
- **DDA:** at the 5-death step, `rate × 0.92` (plan 4.3). Off in trials.

#### 1.15 `k.dark(d0, d1, { radius = 4 })`

- **Class:** `DarkZone extends Entity` (`props2.js`), plus one `Glowworm` (`src/entities/glowworm.js`).
- **What it does:** while Nobu is inside `[d0 − 4, d1 + 4]`, it blends the stage lighting toward the
  `cave` theme values (`stage.js` `THEMES.cave`): fog colour, `fogNear`/`fogFar`, hemisphere and sun
  intensities, and rim.
  - The blend takes 1.2 s in and 1.2 s out.
  - It needs `Stage` to keep references to `hemi` and `rim` (`this.hemi = hemi; this.rim = rim` in the
    stage constructor). Today only `sun` is stored.
- **Lumi:** a `Glowworm` with nests at `[d0, d0 + (d1 − d0) / 2, d1 − 6]`, constructed but **dormant**
  until Nobu enters. When he leaves, she flies off upward and fades. Add `Glowworm.sleep()` and
  `wake()`.
- **`radius`** scales Lumi's light: `light.distance = radius × 1.6`, and the minimum glow radius when she
  is waiting at a nest. The default 4 matches today's waiting radius (`glowworm.js`, `get radius`).
- **Rollback:** if the checkpoint is inside the zone, Lumi respawns at the nearest nest behind it with
  full energy. Otherwise she sleeps.
- **First time per save:** `ui.tutorial('glowworm')`, the existing copy.
- **Performance:** one extra `PointLight` per zone. Only one `DarkZone` may be active at once, which is
  checked in dev.

#### 1.16 `k.detour(entryD, exitD, { y, entry = 'pipe', build })`

A detour leaves the main path and rejoins it. It holds optional content plus some Golden Bone content
(dogs and breakables), never content that needs a later move.

- **The two kinds:**

  | Kind | Condition | Geometry |
  | --- | --- | --- |
  | **Sky detour** | `y >= 8` | Built from **Solids only** (platforms, movers, lunchboxes, market platforms, ziplines), at `y` above the path. Spans can't be used: `track.groundAt` returns the **highest** span at `(s, u)`, so a span above the path would block the main floor (section 2.1). |
  | **Side lane** | `y === 0` | Built with **spans at a lateral offset** beyond the main floor (`x` past ±4.3), with the walls widened by `k.walls` keyframes. The lane is separated from the main floor by a pit gap of at least 1.8 m, except at the entry and exit bridges. |

- **Loops:** if `|exitD - entryD| <= 2`, the detour is a **loop** (`detour.loop = true`). It goes out,
  turns, and comes back (on a second layer for sky detours, or along the same lane for a dead-end side
  lane), then rejoins within 2 m of the entry. This is Crash 2's back-and-forth path. On a sky loop's
  return leg the camera switches to `trackFront` (see `kd.returnLeg`).
- **The detour rule (Golden Bone feasibility).** A detour that exits downstream skips the main-path
  stretch between entry and exit (`skipSpan = [entryD, exitD]`), so a one-run Golden Bone means walking
  back.
  - **On foot:** a downstream exit is allowed only if `skipSpan` can be walked back to from the exit:
    no one-way drops, no crumble-only or fall-box-only bridges, no rug pulls, no rising hazards, no
    Box Gauntlets inside it. Otherwise make it a loop, or put no countables on the skipped stretch.
  - **On a chase, ride, raft or auto-scroll stretch:** loops only.
  - **Height:** sky detours (above the track) are always safe from this rule's point of view. A detour
    below a `k.water` or `k.rising` surface is inside the death plane, so never build one.
  - The helper stores `detour.loop` and `detour.skipSpan` (`null` for loops). A dev check walks
    `skipSpan` and throws if it contains a `CrumblePlatform`-only, `FallBox`-only, `RugPull` or
    `RisingHazard` crossing, or any chase.
- **Entry types:**

  | Entry | Look | How it works |
  | --- | --- | --- |
  | `'pipe'` | A dryer vent or pneumatic tube: a cylinder 1.4 m wide with a dark opening at `(x, 0, entryD)` | Walking in: fade 0.25 s, move Nobu to the detour start (`build` returns `start`), fade in, `'whoosh'`. The same code path as `TreatTray`'s round start, minus the haul rules. |
  | `'flap'` | A pet-flap door in a box wall | No teleport: the side lane is reachable on foot. The helper places the door mesh and registers the section. |
  | `'burrow'` | A cracked floor you belly-flop through | Uses `k.cracked`. The detour floor is at a negative `y` and **must be laterally outside the main floor**, or under a part of the main path built from Solids. The helper checks this in dev and throws if a span would cover it. |

- **`build(kd)`:** an author callback. `kd` is the same kit with its `y` measured from the detour's base
  (`kd.platform(x, 0, d)` sits at `y` above the path for sky detours). It adds:

  | Helper | What it does |
  | --- | --- |
  | `kd.start(x, y, d)` | Where a `'pipe'` entry drops Nobu |
  | `kd.exit(x, y, d)` | Marks the exit; for a sky detour it is usually a zipline down to the main path |
  | `kd.returnLeg(dA, dB)` | Loop return leg: between `dA` and `dB` (`dA < dB`), while Nobu stands on a detour Solid there and is above path + `y − 1`, the camera uses `trackFront` |
  | `kd.section(name)` | Names the detour (registered as `{ detour: true }`) |

- **Falling off a sky detour** is a normal fall onto whatever is below: the main path, or a pit, which
  is a death. There is no special rule. Authors put the outbound leg above walkable floor where they can.
- **Rollback:** detour content uses the normal rules.
  - A checkpoint **inside** a detour is allowed (a Snacks on a detour platform).
  - Respawning at it puts Nobu on the detour, and the camera's return-leg state comes from the checkpoint
    position.
- **Trials:** the pipe entry is closed (a lid mesh, `'bonk'` on touch), so trial runs never enter a sky
  detour. Side lanes stay open, but they are never shorter than the main path.

#### 1.17 Camera modes `'side'` and `'rise'`

Both are added to `GameCamera._targets` (`src/camera/camera.js`), next to `track` and `trackFront`.
Levels use them through the extra helper `k.camZone(d0, d1, mode, opts)` (1.18).

- **`'side'`: a 2.5D side-on rail.**
  - `opts = { track, dist = 13, height = 4.5, side = 1, ahead = 2.5 }`.
  - Camera position: `tr.toWorld(sp + ahead, side × dist, 0)` with `y = ty + height`.
  - Look at: `tr.toWorld(sp + ahead, 0, 0)` with `y = ty + 1.0`.
  - Movement basis: because the camera looks across the track, `basis.forward` (screen up) points across
    the track and `basis.right` (screen right) points along +d.
  - Movement in a side zone is remapped so **left and right move along the track** and up and down move
    sideways at 0.5 speed. Add `GameCamera.sideAxis = true`, which `player.js` reads when building its
    move vector.
  - Wall height in side zones should be ≤ 1.2 m on the camera side, so the floor stays visible.
- **`'rise'`: framing for vertical climbs.**
  - `opts = { track, dist = 9.5, height = 2.2, lookUp = 3.0 }`.
  - Like `'track'`, but the camera sits lower, about level with Nobu (`out.pos.y = ty + height`), and
    looks `lookUp` metres above him (`out.look.y = ty + 1.15 + lookUp`), so the next step up is on screen.
  - `trackY` follows Nobu upward with no 2.4 m lag (`this.trackY = p.y - 0.5` while in `'rise'`).
- **Blending:** `k.camZone` switches modes when Nobu enters, and the existing damping (`damp(..., 7)`)
  smooths the position.
  - When leaving a zone it calls `camera.setMode(info.camera.mode, info.camera)`. `Stage` stores the
    level's default camera as `stage.defaultCamera`.
  - There is no hard cut: increase the damping constant to 4 for the first 0.6 s after a switch.

#### 1.18 Extra helpers and options these levels need

These are additions. They don't change the 16 fixed signatures.

| Helper or option | Spec |
| --- | --- |
| `k.camZone(d0, d1, mode, opts)` | A `CamZone` entity (no visuals). While `p.body.s` is in `[d0, d1]`, it applies `camera.setMode(mode, { track, ...opts })`; outside, it restores `stage.defaultCamera`. Rollback: it re-evaluates on respawn. |
| `k.pumpStone(x, y, d, { maxPump = 3, float = 3 })` | A `PumpStone` built on `PumpPill`'s look (`enemies.js`) but **not an Enemy**: no `Enemy.reset`, no damage. It hovers, bobbing ±0.1 m. Each hop (landing on it) adds 1 pump: scale +17%, and it rises **1.0 m** over 0.25 s (`'boing'`, pitch up per pump). From the first hop a timer runs; at `float` seconds, or on a hop past `maxPump`, it **dumps**: it pops (`fx.burst` green and white, `'conePop'`), its solid turns off and it respawns at its home after 4 s. The tell: the glow speeds up over the last 1 s. Rollback: back home, unpumped. Not countable. |
| `k.iron(d0, d1, { x = 0, y = 0, period = 5.6 })` | `Iron extends Entity`: a hot iron (`toon(0xd8dde6)` body, `toon(0xff6a3a)` emissive sole plate) 1.4 × 0.8 × 2.4 m sliding along d between `d0` and `d1` and back (ease in and out at the ends, 0.4 s pause). Touching it: `p.hurt('flat')`. Tell: steam puffs ahead of it every 0.2 s, and `'whoosh'` when it turns around. It isn't a Solid, so it can't be stood on. |
| `k.fan(x, y, d, { height, power, steam = false })` | Existing `UpdraftFan`, plus a `steam` option: white smoke cards and a brass base tint. No change to behaviour. |
| `k.coconuts(d, { ..., color })` | Existing `CoconutRoller`, plus `color` (used for oranges, `0xff8a1a`). It shares the coconut Ticket cap, unchanged. |
| `k.bonusRound({ ..., skin = 'tray' })` | Existing Treat Tray round. `skin: 'jar'` draws the entry and exit trays as cookie jars (`toon(0xd8a060)` cylinder with a lid). |
| `k.dustBunny(x, y, d, o)` | `DustBunny extends Mouse` (`enemies.js`), placeholder `model_dust_bunny` → `model_mouse` ×1.3, grey, with a fuzz-particle trail. Patrols like a mouse. Bite: it splits into two half-size bunnies (each dies to one more hit, and they flee for 2 s). Stomp or flop: it dies outright. Tutorial: `'dustbunny'`. |
| `k.hiddenBone(x, y, d)` | Owned by `rewards-spec.md`. This file only places it. |
| Enemy option `ambush: { at, drop = 5 }` | For any enemy helper. The enemy waits invisible `drop` metres above its spot until `p.body.s >= at`, then drops (gravity 25, `'whoosh'`, dust on landing) and starts its normal behaviour. Rollback: back above, re-armed. Implemented once in `Enemy` (`enemies.js`). |
| `BONE_COLORS.green`, `BONE_COLORS.yellow` | Added to `secrets.js`: green `{ base: '#5aff8a', paw: '#1a9a40', hex: 0x3ae070, name: 'GREEN' }`, yellow `{ base: '#ffe45a', paw: '#b89a10', hex: 0xffd23f, name: 'YELLOW' }`. |
| `Cat.light()` | Starts the fuse as if touched. Used by `k.rugPull`. |

---

### 2. Authoring and physics rules (read before placing anything)

#### 2.1 Spans versus Solids

- `track.groundAt(s, u)` returns the **highest** span at a point (`track.js`). Two spans that overlap
  laterally at different heights means the lower one **can't be stood on**: the body walks into the
  higher one as a ledge (`physics.js`, `resolveTrack`, the `rise > 0.3` branch).
- **Rule:** anything above or below a main-path span at the same `(s, u)` must be built from **Solids**
  (`k.platform`, `k.mover`, `k.lunch`, market platforms, drums), never spans. This is how the Treat Tray
  round already works: platforms at `h: 12` over a normal floor.
- **Raised catwalks with nothing below** (L5's chimney top) can be spans with `y: 15`, because no lower
  span shares their `(s, u)`.

#### 2.2 Jump reach (for every gap)

These come from `TUNING` (`player.js`): `JUMP` 12.6, `DOUBLE_JUMP` 11.2, `GRAVITY` 36 (×1.4 falling),
`RUN` 8.0, `SLIDE_JUMP_SPEED` 10.5.

| Move | Height | Flat gap at run speed |
| --- | --- | --- |
| Jump | ~2.2 m | ≤ 4.0 m |
| Jump + double jump | ~3.9 m | ≤ 7.0 m |
| Slide jump + double jump | ~3.9 m | ≤ 8.5 m |
| + Tail Glide | descent at glide speed | add ~4 m from 6 m up |

- **Every required gap in L4 and L5 stays at or under 4.0 m single and 6.5 m double, measured edge to
  edge.**
- Optional gaps (detours, Hidden Bones) can go up to the slide-jump limit.

#### 2.3 Checkpoints

- The tier 4 target is a Snacks at most **95 m** apart along the main path, and tier 5 at most **100 m**
  (plan 4.1, `TIER.snacksGap`).
- Every section of 40 m or more also has a `k.pitySnacks` (1.3).
- Detours of 50 m or more get one Snacks of their own.
- **Harder pass:** L4 and L5 each drop one Snacks (3.0a, 4.0a), leaving one gap over the guide per level.
  The pity spot left in its place keeps DDA working there.
- **Box Gauntlets:** a pity spot at each gauntlet start (`box-gauntlets-spec.md` rule).

#### 2.4 Things that count toward the Golden Bone

These are countable Breakables (`Breakable.countable === true`): Backpack, Zipped, Mystery, Blue Sphere,
1UP, Trampoline, Snacks, Cat, Rug, Lint Roller and Vacuum Dock, plus every `ConedDog`.

- `PitySnacks`, everything a Mystery spawns, Freeze Packs, Lunchboxes, Pump Stones and Dust Walls **don't
  count**.
- **Rule:** nothing countable may sit behind a Zoomie Gate, a Dust Wall, a Moon Ledge, or a colored path
  that needs a bone from a later level.
  - Smog Vents and Bark Rocks are allowed, because Mega Bark is guaranteed by L4. Exception: an
    equipped Wizard Hat grants bark early, which is harmless.

#### 2.5 Tickets

- Line tickets (`k.tix`, `k.tixArc`, `k.tixRing`) are counted below as **raw pickups**.
- Whole Tickets = `floor(raw / 3)` (`NOBU_TICKET_SCALE`).
- Backpacks add `randInt(1, 5)` raw each, about 3 on average; Zipped default 8; Good Boy and colored-path
  jackpots are as written.
- `rewards-spec.md` owns the per-level cap. These levels are sized to land close to Level 1's ratio:
  about 0.55 raw line tickets per metre (L1 is 104 over 313 m, about 0.33, plus pack and jackpot
  tickets).

---

### 3. Level 4: Laundry Day (`src/levels/level4.js`)

#### 3.0 Overview

| | |
| --- | --- |
| Theme | `4` (new, from `house`; section 5.2). Boss arena theme `boss4`. |
| Tier | 4 (`LEVEL_TIER[4]`) |
| Main path | d 0 → gate at d 476, `END = 486` |
| Sections | Hallway · Laundry Room · Ironing Board · Kitchen Counter · Roomba Stampede · Basement Stairs · **Boiler Room** (new, hardest) |
| Detours | **A: Top Shelf** (sky loop, y +9.5 out and +14 back, d 120–158; `loop: true`, `skipSpan: null`). **B: The Pantry** (side lane on the right, d 186–246; `loop: false`, `skipSpan: [187, 244]`, walk-back checked). |
| Box Gauntlets | G1 Cereal Box Steps (d 340–365), G2 Boiler Room (d 400–457, last before the gate) |
| Dogs | 7: corgi, pug, dalmatian, shiba, corgi (main), dalmatian (Detour A), shiba (Boiler Room) |
| Mystery slots | 0 Hallway, 1 Kitchen shelf, 2 Pantry |
| Secrets | Good Boy Route (ironing board), Cookie Jar round (kitchen), green colored bone (basement Smog Vent), Hidden Bone (basement Dust Wall, needs Dust Dash, so a replay), Zoomie Gate (stampede short cut) |
| Camera | `{ mode: 'track', track, height: 4.3, dist: 8.6, ahead: 5.5 }`. Stampede `trackFront` (via `k.chase`); Detour A return leg `trackFront`; Boiler Room `'rise'` for d 408–448. |
| Music | `level4` (section 5.6) |
| Trial | Gold 98 s · Silver 125 · Bronze 160 · Platinum 90. Local only until the hub adds variant `"4"` (floor 24000 ms). |

#### 3.0a Harder pass and Box Gauntlets (owner requests)

| Change | Before | After |
| --- | --- | --- |
| Drum 1 period | 9 s (2.2 m/s) | **8 s** (2.5 m/s) |
| Toaster period | 2.4 s | **2.0 s** |
| Iron period | 5.6 s | **4.8 s** |
| Boiler flood rate | 0.55 m/s | **0.6 m/s** |
| Checkpoint 2 (Snacks at d 113.5) | a Snacks | **removed**; a pity spot there instead. Checkpoints 1→3 are now 132.5 m apart, over the TIER 4 gap of 95 m. That is fair because Laundry Room drums and lines are taught over suds you can see, and the pity spot (DDA) still catches strugglers. |
| Second half | | Combined hazards: a cone drone over the Stampede gaps, Dust Bunny pairs on the stairs, a Box Gauntlet in the Basement and the Boiler Room |

**Box Gauntlets in L4** (helpers from `box-gauntlets-spec.md`):

| # | Where | Teach (safe floor below) | Real run | Pity spot |
| --- | --- | --- | --- | --- |
| G1 | **Cereal Box Steps**, Basement Stairs d 340–365 | 2 fall boxes over the floor at d 341.5–344 | fall, blink, fall, slide and blink boxes over a 19 m drop | d 345.5 |
| G2 | **Boiler Room** (last section before the gate), d 400–457 | 2 blink boxes over the floor at d 404.5–406.8 | arrow chain, blink, slide, fall, bounce chain, arrow chain, blink and fall boxes under the rising flood | d 409 (gauntlet start) |

- **DDA:** at 5 deaths, blink `on` is stretched by 10% (`box-gauntlets-spec.md` implements it). DDA
  otherwise stays as in plan 4.3.
- **Golden Bone:** gauntlet backpacks are `k.bounceChain` backpacks, and each breaks on the bounce that
  launches you, so a clean pass gets them all.

#### 3.1 Track and walls

```js
// Level 4: Laundry Day. The Owner's House at dog scale: hallway, laundry room, ironing board, kitchen counter,
// a Roomba stampede, the basement stairs and the boiler room flood.
export function buildLevel4(game, stage, tickets) {
  const track = makeTrack(stage, turtle([0, 0, 10], [
    [24, 0, 0], [26, -30, 0],                    //   0–50  Hallway (bends left into the laundry)
    [24, 0, 0], [26, 40, 0], [25, 0, 0],         //  50–125 Laundry Room
    [28, 0, 0.6], [27, -20, 0],                  // 125–180 Ironing Board (slight rise)
    [24, 30, 1.4], [22, 0, 0], [24, -25, 0],     // 180–250 Kitchen Counter (climbs 1.4 m)
    [28, -35, 0], [26, 20, 0], [26, 0, 0],       // 250–330 Roomba Stampede (wide, gentle curves for the front camera)
    [24, -20, -4], [24, 15, -3], [22, 0, -2],    // 330–400 Basement Stairs (down 9 m)
    [24, 25, 0], [24, -30, 0], [22, 0, 0],       // 400–470 Boiler Room
    [22, 0, 0],                                  // 470–492 Boss gate
  ]));
  const k = makeKit(game, stage, tickets, track);
  const END = 486;
  const F = (a, b, o = {}) => k.floor(a, b, { style: 'ground', ...o });

  // walls: [d, left, right, height]
  k.walls([
    [-8, 4.3, 4.3, 2.8], [52, 4.3, 4.3, 2.8], [56, 6.2, 6.2, 3.4],      // laundry widens for the drums
    [120, 6.2, 6.2, 3.4], [124, 4.3, 4.3, 2.8],
    [184, 4.3, 4.3, 2.8], [188, 4.3, 10.2, 2.8], [244, 4.3, 10.2, 2.8], // the Pantry lane on the right
    [248, 4.6, 4.6, 2.8], [330, 4.6, 4.6, 2.8],                          // stampede: 9.2 m wide
    [334, 3.6, 3.6, 3.2], [378, 3.6, 3.6, 3.2],                          // narrow basement stairs
    [380, 7.2, 6.1, 3.2], [392, 7.2, 6.1, 3.2],                          // two alcoves (Dust Wall left, Bark Rock right)
    [396, 4.3, 4.3, 3.6], [470, 4.3, 4.3, 3.6], [END + 2, 4.3, 4.3, 3.6],
  ]);
  k.backstop(-8);
  k.backstop(END);
```

- The turtle lengths add up to 492 m. Catmull-Rom path length is within about 1% of the sum; check
  `track.length >= END + 4` in a dev assert.
- `climb` values are metres of height per move (`track.js` `turtle`: `y += climb / n`).

#### 3.2 Section 1: Hallway (d −8 to 50)

This is a gentle start. It teaches the Chomp Chain and the Mystery Backpack.

```js
  k.section(-8, 50, 'Hallway');
  F(-8, 50);
  k.sign(-3.0, 0, 3, ['CHOMP', 'CHAIN!'], { rot: -0.3 });
  k.sign(3.0, 0, 3, ['BITE', 'FAST'], { rot: 0.3 });
  k.tut(4, 'chain');
  // 8 backpacks in a row, 2 m apart: 0.25 s apart at run speed, far inside the 1.1 s chain window
  k.packs([[0, 9], [0, 11], [0, 13], [0, 15], [0, 17], [0, 19], [0, 21], [0, 23]]);
  k.mouse(0, 0, 26.5, { range: 3.4, speed: 4.5 });                 // chain step 9: easy to keep going
  k.tix(-2.6, 0, 6, -2.6, 0, 22, 7);
  // side table: lunchbox steps up to the first Mystery Backpack
  k.lunch(-3.0, 0, 31.0); k.lunch(-3.0, 0, 32.4); k.lunch(-3.0, 1, 32.4);
  k.mystery(-3.0, 2, 32.4, { slot: 0 });
  k.tut(29.5, 'mystery');
  k.dog(3.2, 0, 35, 'corgi');                                      // dog 1
  k.rug(1.6, 0, 39); k.rug(-1.6, 0, 43, Math.PI / 2);
  k.dustBunny(0, 0, 44, { range: 2.2 });
  k.tut(42, 'dustbunny');
  k.tix(2.6, 0, 38, 2.6, 0, 47, 4);
  k.snacks(0, 0, 48.5);                                            // checkpoint 1
```

#### 3.3 Section 2: Laundry Room (d 50–125)

Teach and test the spin drum, then three clotheslines.

```js
  k.section(50, 125, 'Laundry Room');
  F(50, 60);
  k.tut(52, 'spindrum');
  k.water(60, 104.5, { w: 12.4, y: -1.4, color: 0xd8ecff });       // soap suds: a fall-out pit
  // Drum 1: slow (one turn per 8 s, 2.5 m/s at the rim). Board at the bottom, step off at the front.
  k.spinDrum(64, { y: 3.2, r: 3.2, n: 4, period: 8 });
  k.tixArc(0, 0.6, 60.5, 0, 67.5, 3.4, 5);
  k.platform(-3.6, 6.6, 67, 2.2, 2.2);                             // high shelf off Drum 1's top
  k.dog(-3.6, 6.6, 67, 'pug');                                     // dog 2
  k.platform(0, 3.2, 71.5, 3, 3);                                  // shelf 1
  k.packs([[-0.9, 71.5], [0.9, 71.5]], 3.2);
  k.pitySnacks(0, 3.2, 72.6);
  // Drum 2: faster (6.5 s, 3.3 m/s), one crumbling platform on the ring (index 2)
  k.spinDrum(79, { y: 3.2, r: 3.4, n: 4, period: 6.5, crumble: [2] });
  k.platform(0, 3.2, 86.5, 3, 3);                                  // shelf 2
  k.pack(-0.9, 3.2, 86.5); k.pack(0.9, 3.2, 86.5);
  // clotheslines: two short ones on the main route...
  k.tut(85, 'zipline');
  k.zipline(0, 5.6, 87.5, 0, 4.0, 93.0);
  k.platform(0, 2.6, 94.5, 3, 2.4);
  k.sphere(1.0, 2.6, 94.5);
  k.zipline(0, 5.4, 96.0, 0, 3.0, 102.0);
  k.platform(0, 1.8, 103.5, 3, 3);
  // ...and a long optional high line over Drum 2, grabbed from its top platform (top at y 6.6, line at 8.6)
  k.zipline(2.6, 8.6, 80, 0.8, 4.4, 102.4);
  k.tix(2.6, 6.85, 82, 0.9, 2.9, 100.5, 8);                        // tickets at the hang height
  F(104.5, 127);
  k.dustBunny(0, 0, 110, { range: 2.6 });
  k.shellback(1.6, 0, 116, { range: 1.2 });
  k.tix(0, 0, 106, 0, 0, 113, 4);
  k.pitySnacks(0, 0, 113.5);                                       // harder pass: no checkpoint here, a pity spot only
  // Detour A: the dryer vent on the right
  k.detour(120, 120, { y: 9.5, entry: 'pipe', build: buildTopShelf });   // pipe at (3.4, 0, 120); see 3.9
```

#### 3.4 Section 3: Ironing Board (d 125–180)

The twist: a 2.6 m wide board, a sweeping iron, and steam vents that lift you over it.

```js
  k.section(125, 180, 'Ironing Board');
  k.floor(127, 130, { w: 2.6, y: [0, 1.2], style: 'platform', depth: 0.6 });
  k.floor(130, 174, { w: 2.6, y: 1.2, style: 'platform', depth: 0.6 });
  k.floor(174, 177, { w: 2.6, y: [1.2, 0], style: 'platform', depth: 0.6 });
  k.tut(126.5, 'iron');
  k.iron(131, 172, { y: 1.2, period: 4.8 });                       // sweeps the whole board and back
  k.fan(0, 1.2, 140, { height: 4.6, power: 26, steam: true });     // steam vents: float while the iron passes under
  k.fan(0, 1.2, 152, { height: 4.6, power: 26, steam: true });
  k.fan(0, 1.2, 164, { height: 4.6, power: 26, steam: true });
  k.tixArc(0, 1.2, 138, 0, 142, 3.6, 4); k.tixArc(0, 1.2, 150, 0, 154, 3.6, 4); k.tixArc(0, 1.2, 162, 0, 166, 3.6, 4);
  k.knight(0, 1.2, 146, { range: 0.8 });                           // narrow board: SLIDE into it
  k.knight(0, 1.2, 158, { range: 0.8 });
  k.pack(-0.7, 1.2, 170); k.pack(0.7, 1.2, 170);
  // Good Boy Route: no deaths by d 128, and golden paws rise beside the board on the left
  k.goodBoy(128, [[-3.0, 0.4, 133, 1.4, 1.8], [-3.2, 1.4, 136.5, 1.4, 1.8], [-3.2, 2.4, 140, 1.8, 3.0]], { jackpot: 15 });
  k.pitySnacks(-2.4, 0, 179);
  F(177, 250);
```

The Good Boy Route pays its own 1UP and jackpot (`GoodBoyRoute`, `oneUp` defaults to true).

#### 3.5 Section 4: Kitchen Counter (d 180–250)

Combine launchers with hazards. This section also holds the Cookie Jar round and the Pantry entrance.

```js
  k.section(180, 250, 'Kitchen Counter');
  k.snacks(0, 0, 181);                                             // checkpoint 2 (132.5 m after checkpoint 1)
  k.tut(183, 'toaster');
  k.toaster(-2.4, 0, 187, { power: 15, period: 2.0 });
  k.platform(-2.4, 4.2, 192, 3, 4);                                // spice shelf A
  k.packs([[-3.2, 190.8], [-1.6, 190.8]], 4.2);
  k.mystery(-3.2, 4.2, 193.4, { slot: 1 });
  k.pack(-1.6, 4.2, 193.4);
  k.toaster(2.4, 0, 200, { power: 15, period: 2.0, phase: 1.0 });
  k.platform(2.4, 4.2, 205, 3, 3.4);                               // spice shelf B
  k.dog(2.4, 4.2, 205.6, 'dalmatian');                             // dog 3
  // oranges roll down the counter (it climbs 1.4 m over d 180–204)
  k.coconuts(244, { until: 208, every: 2.0, speed: 6.8, lanes: [-2.4, 0, 2.4], color: 0xff8a1a });
  k.shellback(0, 0, 214, { range: 1.4 });
  k.sphere(-2.8, 0, 222);
  k.shellback(1.6, 0, 232, { range: 1.2 });
  k.tix(0, 0, 184, 0, 0, 196, 5);
  k.tix(-2.6, 0, 210, -2.6, 0, 236, 9);
  // Cookie Jar bonus round on the fridge top (h 12, no detour overhead here)
  k.tut(224, 'treat');
  k.bonusRound({
    tray: [3.0, 226], h: 12, skin: 'jar',
    plats: [[2.6, 0, 229, 3, 3], [-0.4, 0.6, 232.6, 2.4, 2.4], [-3, 1.2, 236.2, 2.4, 2.4], [-0.6, 1.8, 239.8, 2.4, 2.4], [2.4, 2.4, 243.4, 3, 3]],
    packs: [[-0.4, 0.6, 232.6], [-3, 1.2, 236.2], [-0.6, 1.8, 239.8], [2.0, 2.4, 243.0], [2.8, 2.4, 243.8]],
    tix: [[2.6, 0.2, 229.6, -0.4, 0.8, 232, 3], [-0.8, 1.0, 233.6, -2.6, 1.4, 235.4, 2], [-2.6, 1.6, 237.2, -1, 2.0, 239, 2], [0, 2.2, 240.8, 2, 2.6, 242.6, 2]],
    back: [0, 247],
  });
  // risk and reward: a Cat in front of a backpack wall; one pounce breaks the lot
  k.cat(0, 0, 240);
  k.packs([[-2.4, 240.5], [2.4, 240.5], [-1.2, 241.6], [1.2, 241.6]]);
  k.pitySnacks(-2.4, 0, 218);
  k.snacks(-2.4, 0, 248);                                          // checkpoint 3 (67 m)
  // Detour B: the Pantry, a side lane through the pet flap on the right (see 3.10)
  k.detour(187, 244, { y: 0, entry: 'flap', build: buildPantry });
```

#### 3.6 Section 5: Roomba Stampede (d 250–330)

The set piece: an 74 m chase toward the camera.

```js
  k.section(250, 330, 'Roomba Stampede');
  const S = (a, b, o = {}) => F(a, b, { w: 9.2, ...o });
  S(250, 268); S(271.5, 306); S(309.5, 334);                       // gaps at 268–271.5 and 306–309.5 (3.5 m each)
  k.tut(251, 'stampede');
  k.chase(254, 328, { model: 'model_mini_roomba', scale: 1.4, count: 3, speed: 7.2, catchUp: 1.0, lanes: [-2.2, 0, 2.2] });
  k.cable(262); k.cable(290); k.cable(318);
  k.toys(-2.2, 0, 278, 2.6); k.toys(2.2, 0, 284, 2.6); k.toys(-1.0, 0, 296, 2.8);
  k.packs([[0, 275], [2.6, 292], [-2.6, 300]]);
  // Zoomie Gate short cut: plate at 282, shutter at 304 (22 m), a lane that bridges the second gap
  k.zoomieGate(3.6, 0, 304, { plateD: 282, open: 2.5 });
  k.floor(304, 311, { x: 3.6, w: 1.8 });
  k.tix(3.6, 0, 304.5, 3.6, 0, 310.5, 4);
  k.tix(0, 0, 252, 0, 0, 266, 6);
  k.tixArc(0, 0, 267, 0, 272.5, 2.2, 4);
  k.tixArc(0, 0, 305, 0, 310.5, 2.2, 4);
  k.pitySnacks(-3.4, 0, 288);                                      // chase is 74 m long, so a pity spot is allowed
  k.drone(0, 1.4, 270, { range: 2.4 }); k.drone(0, 1.4, 308, { range: 2.4 });   // harder pass: drones over both gaps
```

- At d 328 the three Roombas tip over at the basement door (`Chaser` end animation).
- `FloorCable` was written for the vacuum ride. On foot it must be jumped (it trips with a `'flat'`
  hurt). Check that its `update` hurts a walking Nobu. If it only reacts to `p.ride`, add the on-foot
  case to `ride.js` and list it in the PR.

#### 3.7 Section 6: Basement Stairs (d 330–400)

A dark descent, with the green bone and the two alcoves.

```js
  k.section(330, 400, 'Basement Stairs');
  k.snacks(0, 0, 333);                                             // checkpoint 4 (85 m; the chase sits between 3 and 4)
  F(330, 346, { w: 7.2 });
  k.dark(336, 398, { radius: 4 });                                 // Lumi nests at 336, 367, 392
  k.smogVent(-2.6, 0, 340, { lift: 6 });
  k.tut(338, 'smogvent');
  k.platform(-2.6, 6.0, 343.5, 2.4, 2.4);
  k.colorBone(-2.6, 6.0, 343.5, 'green');                          // opens the green path in L5 (and the short one in L1)
  // Box Gauntlet G1: Cereal Box Steps. Teach once over the floor, then the real run over a 19 m drop. No other route.
  k.fallBox(0.8, 0.8, 341.5); k.fallBox(-0.8, 1.6, 344.0);        // teach: a miss lands on F(330, 346)
  k.pitySnacks(0, 0, 345.5);                                       // gauntlet start
  k.fallBox(-1.2, 0, 348.2);
  k.blinkBox(1.0, 0.6, 351.6, { on: 1.2, off: 1.0, group: 'cereal' });
  k.fallBox(-0.6, 1.0, 355.0);
  k.slideBox(0, 1.0, 358.4, { axis: 'x', range: 1.6, speed: 1.5 });
  k.blinkBox(-1.0, 1.4, 361.8, { on: 1.0, off: 1.0, phase: 1.1, group: 'cereal' });
  for (const [x, y, d] of [[-1.2, 0, 348.2], [1.0, 0.6, 351.6], [-0.6, 1.0, 355.0], [0, 1.0, 358.4], [-1.0, 1.4, 361.8]]) k.tix(x, y + 0.6, d, x, y + 0.6, d, 1);
  F(365, 404);
  k.shellback(0, 0, 368, { range: 1.6 });
  k.dustBunny(-1.6, 0, 372, { range: 1.6 }); k.dustBunny(1.6, 0, 373, { range: 1.6 });   // harder pass: a pair
  k.dog(2.8, 0, 366.5, 'shiba');                                   // dog 4, by Lumi's middle nest
  k.packs([[-2.4, 370], [2.4, 372]]);
  k.squirrel(0, 0, 376, { range: 1.5, ambush: { at: 370, drop: 5 } });
  k.pitySnacks(2.4, 0, 374);
  // left alcove: Dust Wall (Dust Dash, so a replay after the Titan) guarding the Hidden Bone
  k.floor(380, 392, { x: -5.6, w: 3.2 });
  k.dustWall(-4.6, 0, 384, { w: 2.4, h: 2.6 });
  k.hiddenBone(-6.2, 0, 386);
  // right alcove: a Bark Rock blocks it, and dog 5 is behind it (Mega Bark is guaranteed by L4)
  k.floor(380, 392, { x: 5.0, w: 2.2 });
  k.barkRock(4.8, 0, 384, { prize: 'tickets', tickets: 15 });
  k.dog(5.4, 0, 387.5, 'corgi');                                   // dog 5
  k.sphere(0, 0, 394);
  k.tix(0, 0, 359, 0, 0, 369, 5);
  k.tix(0, 0, 378, 0, 0, 392, 5);
```

- The Cereal Box Steps replace the crumble steps the plan described. Box heights come from the `box-gauntlets-spec.md` launch and landing tables; re-check them there.
- **The right alcove is 2.2 m wide** (x 3.9–6.1, wall at 6.1). The Bark Rock covers x 3.75–5.85, which
  leaves 0.25 m, too narrow for Nobu (body width about 0.7 m). Check this in play. If he squeezes past,
  move the rock to x 5.0.

#### 3.8 Section 7 (new, hardest): Boiler Room (d 400–470), Box Gauntlet G2

This is the final exam and the last section before the gate, so it is a **Box Gauntlet**: a timing-only
climb with no other route, under a rising flood of hot water. It ends with a long line down to the gate.

```js
  k.section(400, 470, 'Boiler Room');
  k.snacks(-2.4, 0, 403);                                          // checkpoint 5 (70 m)
  k.tut(404, 'boiler');
  F(398, 408);
  // teach: two blink boxes over the dry floor, before the flood starts
  k.blinkBox(0, 0.8, 404.5, { on: 1.2, off: 1.0, group: 'boil' });
  k.blinkBox(0, 1.6, 406.8, { on: 1.2, off: 1.0, phase: 1.1, group: 'boil' });
  k.camZone(408, 448, 'rise', { dist: 9.5, height: 2.2, lookUp: 3.0 });
  // the flood: starts when you enter at 408, rises 0.6 m/s from -3 to +8, drains once you pass 457
  k.rising(408, 457, { y0: -3, y1: 8, rate: 0.6, trigger: 'enter' });
  k.pitySnacks(0, 0, 409);                                         // gauntlet start
  k.arrowChain([[0, 0, 410.5], [0, 4.2, 415.0], [0, 8.0, 419.5]], { power: 16 });   // up the boiler pipes
  k.platform(2.6, 4.6, 415.5, 1.8, 1.8); k.dog(2.6, 4.6, 415.5, 'shiba');      // dog 7: a side pipe off chain box 2
  k.blinkBox(0, 8.4, 423.0, { on: 1.0, off: 0.9, group: 'boil' });
  k.slideBox(0, 8.4, 426.5, { axis: 'x', range: 1.6, speed: 1.7 });
  k.fallBox(0, 8.8, 430.0, { delay: 0.4 });
  k.bounceChain([[0, 8.6, 432.8], [0, 10.4, 435.6]]);              // 2 backpacks: each bounce breaks one
  k.arrowChain([[0, 11.0, 438.2], [0, 12.6, 441.0]], { power: 16 });
  k.blinkBox(1.0, 12.6, 444.4, { on: 1.0, off: 0.9, phase: 1.0, group: 'boil' });
  k.fallBox(-0.6, 12.6, 447.8, { delay: 0.35 });
  k.zipline(0, 14.2, 449.5, 0, 1.4, 459.5);                        // the long line down to the gate floor
  F(457.5, 492);
  k.tixArc(0, 0.5, 410.5, 0, 415, 4.5, 4);
  k.tixArc(0, 4.2, 415, 0, 419.5, 4.5, 4);
  k.tix(0, 8.8, 423, 0, 9.2, 430, 4);
  k.tix(0, 12.45, 451, 0, -0.15, 458.5, 5);
  k.packs([[-2.4, 464], [2.4, 466]]);
  k.gate(476, 'ROOMBA TITAN', 0x3a3d44);
  k.trigger(478, () => game.session.reachBossGate());
```

The plan's drum, pulley line, Lid Knight and steam valve are dropped here in favour of boxes. The drum and
lines stay in the Laundry Room, so nothing is lost from the level.

**Check this with the fairness rule in 1.14** (rate 0.6 from −3). A good-pace run arrives at:

| Surface | y | Arrival | Water at arrival | Margin |
| --- | --- | --- | --- | --- |
| Arrow box 1 | 0 | 1.5 s | −2.1 | 2.1 |
| Arrow box 2 | 4.2 | 3.5 s | −0.9 | 5.1 |
| Arrow box 3 | 8.0 | 5.5 s | 0.3 | 7.7 |
| Blink, slide and fall boxes | 8.4–8.8 | 7–11 s | 1.2–3.6 | ≥ 4.8 |
| Bounce chain and top boxes | 8.6–12.6 | 12–17 s | 4.2–7.2 | ≥ 4.4 |

- The water tops out at `y1 = 8`. That is under every box from the blink box at d 423 on, except an
  arrow box 3 that you missed and fell back toward.
- **The squeeze:** stalling at the first arrow box. The floor at d 398–408 is under water 5 s after you
  enter.

#### 3.9 Detour A: Top Shelf (sky loop, d 120–158)

- **Entry:** a dryer vent pipe at `(3.4, 0, 120)`, on the laundry floor right after checkpoint 2.
- **Route:** the outbound leg runs at y +9.5 on the right, the return leg at y +14 on the left, then a
  line drops you back to the laundry floor at d 118.5, within 2 m of the entry.
- **`detour.loop = true`, `skipSpan = null`.**
- **Length:** about 38 m out plus about 38 m back, about 80 m with the turnaround.

```js
function buildTopShelf(kd) {
  kd.section('Top Shelf');
  kd.start(3.0, 0.1, 122);
  // outbound (y +9.5 above the path; the ironing board's right-hand pit is below, so a fall is a death)
  kd.platform(3.0, 0, 122, 3, 3);
  kd.platform(2.4, 0.6, 126, 2.4, 2.4);
  kd.mover(2.0, 0.6, 131, { axis: 'x', range: 1.4, speed: 1.4 });  // sliding spice rack
  kd.platform(2.8, 1.2, 136, 2.4, 2.4);
  kd.pack(2.2, 1.2, 136); kd.pack(3.4, 1.2, 136);
  kd.crumble(2.2, 1.2, 140, { w: 2.2, d: 2.2 });                    // jar lids
  kd.crumble(3.0, 1.2, 143.4, { w: 2.2, d: 2.2 });
  kd.platform(2.6, 1.8, 147.5, 3, 3);
  kd.dog(2.6, 1.8, 148, 'dalmatian');                               // dog 6
  kd.snacks(3.6, 1.8, 146.6);                                       // detour checkpoint
  kd.platform(2.6, 1.8, 152, 2.4, 2.4);
  kd.platform(2.6, 1.8, 156.5, 3, 3);
  // turnaround: a steam fan lifts you to the return leg at +4.5 (14 above the path)
  kd.fan(2.6, 1.8, 158.2, { height: 5.5, steam: true });
  kd.platform(-0.4, 4.5, 159, 3, 3);
  kd.returnLeg(124, 160);
  // return (heading back toward the camera)
  kd.platform(-2.6, 4.5, 157, 3, 3);
  kd.zipline(-2.6, 6.2, 155, -2.6, 5.4, 143);                       // lines work in any direction
  kd.platform(-2.6, 4.2, 141, 2.4, 2.4);
  kd.oneUp(-2.6, 4.2, 141);
  kd.mover(-2.6, 4.2, 136.5, { axis: 'x', range: 1.2, speed: 1.6 });
  kd.platform(-2.6, 4.2, 131, 3, 3);
  kd.zipped(-2.6, 4.2, 131, 8);
  kd.platform(-2.6, 4.2, 126, 3, 3);
  kd.tix(2.6, 0.6, 123, 2.6, 1.8, 156, 10);
  kd.tix(-2.6, 4.7, 155, -2.6, 4.2, 127, 8);
  // exit: a line from the return leg down to the laundry floor
  kd.exit(-2.6, 0, 118.5);                                          // within 2 m of the entry at 120: a loop
  // absolute coordinates: from 15.7 above the path at d 124.5 to 1.4 at d 117.6 (hang lands on F(104.5, 127))
  kd.zipline(-2.6, 15.7 - 9.5, 125.5, -2.6, 1.4 - 9.5, 118.6);
}
```

Inside `build`, `y` is relative to the detour base. In the last line, `15.7 - 9.5` is written out so the
absolute heights are obvious.

#### 3.10 Detour B: The Pantry (side lane on the right, d 186–246)

- **Entry and exit:** pet flaps at d 187 and d 244.
- **The lane:** a normal wooden floor at x 6.2–9.8, separated from the counter by a 1.9 m pit with a
  cereal-box wall decor. About 56 m long.
- **`detour.loop = false`, `skipSpan = [187, 244]`.** The kitchen stretch it skips can be walked back to
  from the exit at d 244: it has toasters, rolling oranges and Shellbacks, but no one-way drops, crumble
  bridges, rug pulls, rising hazards or gauntlets. The dev check in 1.16 enforces this. If any is ever
  added to d 187–244, turn the Pantry into a dead-end loop.

```js
function buildPantry(kd) {
  kd.section('The Pantry');
  kd.floor(186, 189, { x: 5.25, w: 2.1 });                          // entry bridge through the pet flap
  kd.floor(186, 246, { x: 8.0, w: 3.6 });
  kd.floor(243, 246, { x: 5.25, w: 2.1 });                          // exit bridge
  kd.mystery(8.0, 0, 198, { slot: 2 });
  kd.vacuum(8.0, 0, 206, { axis: 'z', range: 3, speed: 4 });
  kd.packs([[7.2, 214], [8.8, 214]]);
  kd.lunch(8.0, 0, 222); kd.lunch(8.0, 1, 222);
  kd.oneUp(8.0, 2, 222);
  kd.zipped(8.0, 0, 230, 6);
  kd.cat(8.8, 0, 236); kd.pack(7.2, 0, 236);
  kd.tix(8.0, 0, 190, 8.0, 0, 240, 12);
  // decor: cereal boxes along x 5.25 where there is no bridge (not solid; they sit over the pit gap)
}
```

#### 3.11 Decor, lighting and theme

**Banks** (furniture beyond the walls):

- Move the furniture builders from `bonusRide.js` (shelves, lamps, plant pots, book stacks) into
  `decor.js` as `houseProp(stage, kind, x, y, z, s)`. Use them in both stages.
- Recipe: `k.banks(-6, END, (x, y, d) => houseProp(stage, pick(['shelf', 'lamp', 'pot', 'books', 'chair']), ...k.W(x, y, d).toArray(), rand(0.9, 1.3)), { every: 5 })`.
- Laundry Room (d 50–125): the `pick` list is `['washer', 'basket', 'shelf']`. `washer` is a new
  `houseProp` kind: a white box with a porthole.
- Basement (d 330–470): `['pipe', 'vat', 'crate']`, using the existing `pipe` and `vat` decor tinted
  copper (`0xb06a3a`).

**Edges:**

- `k.edges(-4, 330, (x, y, d) => houseProp(stage, pick(['sock', 'block', 'crumb']), ...), { every: 3 })`.
- `sock`, `block` and `crumb` are new small `houseProp` kinds built from `toon` primitives.

**Other decor:**

- Background dogs: `for (let d = 14; d < 330; d += 30) k.bgDog(pick([-1, 1]) * rand(5.4, 6.4), 2.8, d, { height: 1.1 });`
  These are freed dogs sitting on furniture, from the `bgDog` helper.
- No grass in this level.

**Theme `4`** (section 5.2):

- House textures. Fog `0xf0d6ae`, near 45, far 125. Hemisphere `0xfff0d8` / `0x8a5a32` at 1.25; sun
  `0xffe0b0` at 1.45.
- `dust: 0xf2e6d0`, `music: 'level4'`.
- Laundry Room: the stage particle emitter adds soap bubbles (reuse the `stage` bubble emitter) over
  d 60–104.
- Basement: `k.dark` handles d 336–398. The Boiler Room is lit **orange**: add 3 point lights (`0xff8a3a`,
  intensity 3, distance 14) at d 412, 430 and 448, `y + 6`, because the cave blend has ended by d 402.

#### 3.12 Level 4 tally

| | Main path | Detour A | Detour B | Total |
| --- | --- | --- | --- | --- |
| Backpacks (plain) | 31 | 2 | 4 | 37 |
| Zipped / Mystery | 0 / 2 | 1 / 0 | 1 / 1 | 2 / 3 |
| Blue Sphere / 1UP / Snacks | 3 / 0 / 6 | 0 / 1 / 1 | 0 / 1 / 0 | 3 / 2 / 7 |
| Cat / Rug | 1 / 2 | 0 | 1 / 0 | 2 / 2 |
| **Countable breakables** | **45** | **5** | **8** | **58** |
| Dogs | 6 (1–5, 7) | 1 (dog 6) | 0 | **7** |
| Raw line tickets | 103 | 18 | 12 | **133** |
| Pack tickets (about 3 each; Zipped 8 / 6) | ~93 | ~14 | ~18 | ~125 |
| Jackpots | Good Boy 15, Bark Rock 15, colored path none | | | 30 |
| Checkpoints | 5 Snacks (48.5, 181, 248, 333, 403) + 8 pity spots | 1 | 0 | |

- Max checkpoint spacing on the main path is now 132.5 m (d 48.5 → 181), past the tier 4 guide of 95 m on
  purpose (harder pass, 3.0a). Every other gap is within 95 m.
- **The tally rows above are from before the harder pass and the gauntlets.** Main path changes: −3 crumble
  ticket lines become 5 box tickets (+2 raw); +2 backpacks from the Boiler bounce chain; −2 packs on the
  dropped valve platform; −1 Snacks. Countable main-path breakables stay at **45**. Re-count from the level
  file when it is written.
- The Cookie Jar round's 5 backpacks and 9 tickets are in the main-path column. Its Snacks-less
  platforms follow the Treat Tray rules.
- **For the rewards spec:** the maximum raw pickups in one clear is about 133 + 125 + 30 + the Cookie
  Jar's 9, about **297 raw**, about **99 whole Tickets** before the coconut cap. Oranges add up to 15
  whole (`COCONUT_CAP_PER_CLEAR`). `rewards-spec.md` sets the cap.

---

### 4. Level 5: Pump & Dump Pipeline (`src/levels/level5.js`)

#### 4.0 Overview

| | |
| --- | --- |
| Theme | `5` (new, from `3`; section 5.2). Boss arena theme `boss5`. |
| Tier | 5 |
| Main path | d 0 → gate at d 456, `END = 466` |
| Sections | Opening Bell · Pump Field · Smog Wave · Trading Floor · Green Candle Chimney · The Rug Pull · **Liquidation Line** (new, hardest, side-on) |
| Detours | **A: The Order Book** (sky loop, y +10 out and +15 back, d 232–272; `loop: true`, `skipSpan: null`). **B: The Cold Wallet** (icy dead-end side lane on the left, d 52–116; `loop: true`, `skipSpan: null`). |
| Box Gauntlets | G1 The Bid Wall (d 230–252), G2 Liquidation Line (d 388–446, last before the gate) |
| Dogs | 7: shiba, pug, corgi, dalmatian, shiba (main), corgi (Detour A), pug (Detour B) |
| Mystery slots | 0 Opening Bell, 1 Order Book |
| Secrets | Green colored path (Pump Field, needs the L4 green bone), Good Boy Route (Trading Floor), yellow colored bone (chimney glide ledge), Hidden Bone (chimney Moon Ledge, post-game), Zoomie Gate (Smog Wave short cut) |
| Camera | `track` with `height: 4.3, dist: 8.6, ahead: 5.5`. Smog Wave `trackFront` (via `k.chase`); chimney `'rise'` for d 288–330; Liquidation Line `'side'` for d 390–446; Order Book return leg `trackFront`. |
| Music | `level5`, **128 bpm**, which drives `MarketClock` |
| Trial | Gold 95 s · Silver 118 · Bronze 156 · Platinum 85. Local only until the hub adds variant `"5"` (floor 21000 ms). |

#### 4.0a Harder pass and Box Gauntlets (owner requests)

| Change | Before | After |
| --- | --- | --- |
| Pump Field stones | `float` 3 s | **`float: 2.4`** |
| Smog Wave speed | 7.6 | **7.8** |
| Rug Pull strips | 7.0 / 7.2 m/s | **7.4 / 7.6** (both stay at or under `RUN` 8.0 and at or over 6.5) |
| Checkpoint 5 (Snacks at d 338) | a Snacks | **removed**; a pity spot there instead. Checkpoints 4→6 are now 106 m apart, over the TIER 5 guide of 100 m. That is fair because the Rug Pull's "keep running" rule is taught at its first strip. |
| Second half | | Combined hazards: a cone drone over the Rug Pull, a Box Gauntlet on the Trading Floor, and the Liquidation Line rebuilt as a Box Gauntlet under the smog |

**Box Gauntlets in L5:**

| # | Where | Teach (safe floor below) | Real run | Pity spot |
| --- | --- | --- | --- | --- |
| G1 | **The Bid Wall**, Trading Floor d 230–252 | 2 blink boxes over F(230, 236) on the left | blink box, bounce chain of 2, slide box over the pit | d 233.5 (left) |
| G2 | **Liquidation Line** (last section before the gate), d 388–446 | 1 blink box over the dry floor at d 390.5 | blink boxes on the beat, arrow chain, fall box, bounce chain, under rising smog, plus the belt and crushers | d 393 (gauntlet start) |

- The blink boxes in L5 use `on: 0.94, off: 0.94` (one `MarketClock` step at 128 bpm) so they blink on
  the music.
- DDA: at 5 deaths, blink `on` is stretched by 10%.

#### 4.1 Track and walls

```js
// Level 5: Pump & Dump Pipeline. The Cone Factory's trading floor: market platforms that pump and dump on the beat,
// pump pills you hop to inflate, a smog wave, a candle chimney, the rug pull and the side-on Liquidation Line.
export function buildLevel5(game, stage, tickets) {
  const track = makeTrack(stage, turtle([0, 0, 10], [
    [24, 0, 0], [26, 35, 0],                     //   0–50  Opening Bell
    [24, 0, 0], [26, -40, 0], [25, 0, 0],        //  50–125 Pump Field
    [28, 30, 0], [26, 0, 0], [26, -25, 0],       // 125–205 Smog Wave
    [26, 0, 0], [24, 30, 0], [25, 0, 0],         // 205–280 Trading Floor
    [55, 0, 0],                                  // 280–335 Green Candle Chimney (straight, for the rise camera)
    [26, -35, 0], [24, 0, 0],                    // 335–385 The Rug Pull
    [36, 0, 0], [29, 20, 0],                     // 385–450 Liquidation Line (straight first, for the side camera)
    [22, 0, 0],                                  // 450–472 Boss gate
  ]));
  const k = makeKit(game, stage, tickets, track);
  const END = 466;
  const F = (a, b, o = {}) => k.floor(a, b, { style: 'metal', ...o });

  k.walls([
    [-8, 4.3, 4.3, 3.0], [48, 4.3, 4.3, 3.0], [52, 10.2, 4.3, 3.0],     // the Cold Wallet lane on the left (dead end)
    [114, 10.2, 4.3, 3.0], [118, 4.3, 4.3, 3.0],
    [123, 4.6, 4.6, 3.0], [205, 4.6, 4.6, 3.0],                          // Smog Wave: 9.2 m wide
    [209, 4.3, 4.3, 3.0], [280, 4.3, 4.3, 3.0],
    [284, 4.6, 4.6, 18], [332, 4.6, 4.6, 18],                            // chimney shaft: tall walls
    [336, 4.3, 4.3, 3.0], [386, 4.3, 4.3, 3.0],
    [390, 4.3, 4.3, 1.2], [446, 4.3, 4.3, 1.2],                          // side camera: low walls
    [450, 4.3, 4.3, 3.0], [END + 2, 4.3, 4.3, 3.0],
  ]);
  k.backstop(-8);
  k.backstop(END);
```

`style: 'metal'` maps to the platform texture (`track.js` `buildMeshes`: `'metal'` → `'platform'`). That
is intentional: the factory floor uses the platform tiles.

#### 4.2 Section 1: Opening Bell (d −8 to 50)

Teach the market platforms over a **safe** pit, with a walkway 1.8 m below that catches you.

```js
  k.section(-8, 50, 'Opening Bell');
  F(-8, 16);
  k.sign(-3.0, 0, 3, ['▲ PUMP', '▼ DUMP'], { rot: -0.3 });
  k.ticker(3.0, 1.6, 6, { group: 'a' });                           // shows the next 3 steps of group a
  k.tut(4, 'market');
  k.floor(16, 34, { y: -1.8, style: 'metal' });                    // safety walkway: a miss just drops you here
  k.market(-1.6, 0, 19.5, { amp: 1.2, group: 'a' });
  k.market(1.6, 0, 24.0, { amp: 1.2, group: 'a', invert: true });
  k.market(-1.0, 0, 28.5, { amp: 1.2, group: 'a' });
  for (const [x, d] of [[-1.6, 19.5], [1.6, 24.0], [-1.0, 28.5]]) k.tix(x, 0.6, d, x, 0.6, d, 1);
  k.tix(0, -1.8, 18, 0, -1.8, 32, 6);                              // consolation tickets on the walkway
  F(34, 58);
  k.mystery(2.8, 0, 38, { slot: 0 });
  k.dog(-3.2, 0, 42, 'shiba');                                     // dog 1
  k.trooper(0, 0, 45);
  k.tix(0, 0, 35, 0, 0, 44, 4);
  k.snacks(0, 0, 48);                                              // checkpoint 1
```

- The lowest market position is −1.2. That is 0.6 m above the walkway at −1.8, which passes the rule
  in 1.12.
- The climb back up from the walkway is 1.8 m, inside a single jump.

#### 4.3 Section 2: Pump Field (d 50–125)

Teach the Pump Stones over a toxic vat. A high route pays for pumping a stone twice. This section also
holds the green path and the Cold Wallet entrance.

```js
  k.section(50, 125, 'Pump Field');
  k.water(58, 115, { w: 8.6, y: -1.6, color: 0x5aff8a });          // toxic vat: a fall-out pit
  k.tut(55, 'pumpstone');
  const PS = { float: 2.4 };                                       // harder pass
  k.pumpStone(0, 0.4, 61.5, PS); k.pumpStone(-1.6, 0.4, 65.5, PS); k.pumpStone(1.4, 0.4, 69.5, PS); k.pumpStone(-0.6, 0.4, 73.5, PS);
  k.platform(0, 0, 77.5, 3, 3);                                    // island 1
  k.pack(-1.0, 0, 77.5);
  k.pitySnacks(1.0, 0, 77.5);
  k.pumpStone(1.6, 0.4, 81.5, PS); k.pumpStone(-1.2, 0.4, 85.5, PS); k.pumpStone(0.8, 0.4, 89.5, PS); k.pumpStone(-1.0, 0.4, 93.5, PS);
  // high route: pump the stone at 85.5 twice (it rises to y 2.4), then jump to 3.4
  k.platform(-3.0, 3.4, 87, 2.4, 2.4);
  k.pack(-3.4, 3.4, 87); k.pack(-2.6, 3.4, 87);
  k.tixArc(-3.0, 3.4, 88, -1.0, 92, 1.6, 3);
  k.platform(0, 0, 97.5, 3, 3);                                    // island 2
  k.dog(0.8, 0, 97.8, 'pug');                                      // dog 2
  k.market(-1.4, 0, 102, { amp: 1.6, group: 'b' });
  k.pumpStone(1.2, 0.4, 106.5);
  k.market(-0.8, 0, 111, { amp: 1.6, group: 'b', invert: true });
  F(115, 150, { w: 9.2 });
  // green path (the green bone is in Laundry Day's basement): a safe high route over the first half
  k.colorPath('green', [[2.8, 2.2, 62, 1.6, 1.8], [2.8, 2.6, 68, 1.6, 1.8], [2.8, 3.0, 74, 2.2, 3]], { jackpot: 15 });
  k.tix(0, 0.6, 61.5, 0, 0.6, 73.5, 4);
  k.tix(0, 0.6, 81.5, 0, 0.6, 93.5, 4);
  k.snacks(0, 0, 121);                                             // checkpoint 2 (73 m)
  // Detour B: the Cold Wallet, a side lane on the left (see 4.10)
  k.detour(114, 114, { y: 0, entry: 'flap', build: buildColdWallet });   // dead-end lane: a loop
```

- The market platform `b` at d 102 has `amp` 1.6. Its lowest position is −1.6, level with the vat
  surface (`y: -1.6`), which fails the 0.6 m rule in 1.12. **Use `amp: 1.0` for both `b` platforms**,
  so the lowest is −1.0.
- The tally below assumes `amp: 1.0`.

#### 4.4 Section 3: Smog Wave (d 125–205)

The set piece: a chase toward the camera. Market platforms on the run use the chase-safe pattern `c`.
Dog 3 is on the main path.

```js
  k.section(125, 205, 'Smog Wave');
  k.tut(126, 'smogwave');
  k.chase(128, 204, { model: 'smog_wall', scale: 1, count: 1, speed: 7.8, catchUp: 1.1, lanes: [0] });
  // F(115, 150) is above; gap at 150–153.5
  F(153.5, 176, { w: 9.2 });
  k.market(-2.2, 0, 178.5, { amp: 1.4, group: 'c' });
  k.market(2.2, 0, 182.5, { amp: 1.4, group: 'c', invert: true });
  k.market(0, 0, 186.5, { amp: 1.4, group: 'c' });
  F(189, 210, { w: 9.2 });
  k.log(140, { w: 9.2 }); k.log(196, { w: 9.2 });
  k.packs([[-2.8, 145], [2.8, 160], [0, 170]]);
  k.dog(3.4, 0, 165, 'corgi');                                     // dog 3 (main path, safe right lane)
  // Zoomie Gate short cut over the gap: plate at 126, shutter at 148 (22 m)
  k.zoomieGate(-3.6, 0, 148, { plateD: 126, open: 2.5 });
  k.floor(148, 155, { x: -3.6, w: 1.8 });
  k.tix(-3.6, 0, 148.5, -3.6, 0, 154.5, 4);
  k.tix(0, 0, 129, 0, 0, 148, 7);
  k.tixArc(0, 0, 149, 0, 154.5, 2.2, 4);
  k.tix(2.6, 0, 158, 2.6, 0, 174, 6);
  k.pitySnacks(-3.4, 0, 170);                                      // chase is 76 m long, so a pity spot is allowed
```

- **Smog over the market crossing:** pattern `c` is up three steps out of four, so a runner who keeps
  going almost always meets a raised platform.
- **The water rule doesn't apply here:** this pit has no `k.water`, so falling is the normal fall.
- **Logs:** `k.log` adds a 0.8 m ledge plus 2 tickets each, which are in the tally.

#### 4.5 Section 4: Trading Floor (d 205–280)

Combine conveyors and crushers with moving market platforms. This section has a Nitro wall, the Good
Boy Route, and the Order Book entrance.

```js
  k.section(205, 280, 'Trading Floor');
  k.snacks(0, 0, 207);                                             // checkpoint 3 (86 m)
  k.belt(212, 230, { x: 0, z: 3.0 });                              // pushes backward
  k.crusher(0, 0, 217, { w: 4, d: 2.4, phase: 0, period: 2.4 });
  k.crusher(0, 0, 224, { w: 4, d: 2.4, phase: 1.2, period: 2.4 });
  F(230, 236);
  // Box Gauntlet G1: the Bid Wall. Teach over F(230, 236) on the left, then the pit. No other route.
  k.blinkBox(-1.6, 0.8, 231.0, { on: 0.94, off: 0.94, group: 'bid' });
  k.blinkBox(-1.6, 1.6, 233.0, { on: 0.94, off: 0.94, phase: 0.94, group: 'bid' });
  k.pitySnacks(-2.6, 0, 233.5);                                    // gauntlet start
  k.blinkBox(-2.0, 0, 238.5, { on: 0.94, off: 0.94, group: 'bid' });
  k.bounceChain([[1.8, 0, 242.5], [-1.2, 0.6, 246.5]]);            // 2 backpacks, broken by the bounces
  k.slideBox(1.4, 0, 250.5, { axis: 'x', range: 1.6, speed: 1.7 });
  k.drone(0, 1.6, 244, { range: 2.6, hover: 2.4 });
  F(252, 280);
  k.trooper(-1.5, 0, 256); k.trooper(1.5, 0, 259);
  // Nitro wall: rugs + cats + backpacks. The Vacuum Dock on the right pops every rug.
  k.vacSwitch(3.2, 0, 262);
  k.rug(-2.4, 0, 265); k.rug(0, 0, 265); k.rug(2.4, 0, 265);
  k.cat(-1.2, 0, 266.5); k.cat(1.2, 0, 266.5);
  k.packs([[-2.4, 268], [0, 268], [2.4, 268]]);
  k.goodBoy(253, [[3.4, 1.2, 256, 1.4, 1.8], [3.4, 2.4, 259, 1.4, 1.8], [3.4, 3.6, 262, 1.4, 1.8], [3.2, 4.8, 266, 1.8, 3.4]], { jackpot: 15 });
  k.dog(-3.4, 0, 274, 'dalmatian');                                // dog 4
  k.tix(0, 0.4, 213, 0, 0.4, 229, 6);
  k.tix(-2.6, 0, 254, -2.6, 0, 262, 4);
  k.tix(0, 0, 270, 0, 0, 278, 4);
  // Detour A: the pneumatic tube on the right (see 4.9)
  k.detour(232, 232, { y: 10, entry: 'pipe', build: buildOrderBook });   // pipe at (3.4, 0, 232)
```

The pit at d 236–252 is a real fall-out: there is no floor span. The Bid Wall replaces the four market
platforms the plan described; market platforms stay in the Opening Bell, Pump Field, Smog Wave, chimney
and Order Book.

#### 4.6 Section 5: Green Candle Chimney (d 280–335)

A vertical climb: market candles as steps, a fan to the top catwalk, a glide gap (with the yellow bone
beside it), a Moon Ledge, then a 15 m drop to the floor.

```js
  k.section(280, 335, 'Green Candle Chimney');
  F(280, 290);
  k.snacks(0, 0, 282);                                             // checkpoint 4 (75 m)
  k.camZone(288, 330, 'rise', { dist: 9.5, height: 2.2, lookUp: 3.0 });
  k.tut(287, 'chimney');
  // candle steps up the shaft: each one 2.4 m higher and about 3 m further, moving ±1.2 on the rising pattern 'e'
  k.market(0, 1.6, 292.5, { amp: 1.2, group: 'e' });
  k.market(2.2, 4.0, 295.5, { amp: 1.2, group: 'e', invert: true });
  k.market(-2.0, 6.4, 298.5, { amp: 1.2, group: 'e' });
  k.market(1.6, 8.8, 301.5, { amp: 1.2, group: 'e', invert: true });
  k.platform(-1.8, 10.0, 304.5, 2.6, 2.6);
  k.fan(-1.8, 10.0, 304.5, { height: 6 });                         // up to the catwalk at 15
  k.floor(306, 316, { y: 15, w: 3.4 });
  k.floor(322, 330, { y: 15, w: 3.4 });                            // 6 m glide gap at 316–322
  k.tut(314, 'glide');                                             // existing tutorial id; first-time only
  k.platform(4.0, 14.2, 319, 1.8, 1.8);
  k.colorBone(4.0, 14.2, 319, 'yellow');                           // steer the glide right to grab it; opens the yellow path in L2
  k.moonLedge(0, 21.2, 327);                                       // 6.2 m above the catwalk (post-game)
  k.hiddenBone(0, 21.2, 327);
  k.pack(-1.0, 15, 310); k.pack(1.0, 15, 310); k.sphere(0, 15, 326);
  k.pitySnacks(0, 15, 308);
  k.tixArc(0, 1.6, 293, -2.0, 298.5, 2.0, 4);
  k.tix(0, 15, 307, 0, 15, 315, 4);
  k.tixArc(0, 15, 316, 0, 322, 1.4, 5);
  // the drop: step off the catwalk end and fall 15 m to the floor (no fall damage; player.js _onLand has none)
  F(332, 352);
```

- **The pit below the chimney (d 290–332, y 0)** has no floor and no water, so it is a normal fall-out.
- A player who falls from a low candle dies. Tune `amp` down to 0.8 if the first-play death target
  (section 6) is exceeded.
- **The fan:** it stands on the `k.platform` at d 304.5, `y 10`. `UpdraftFan` builds its own small Solid
  base, so set the fan's `y` to the platform top (10.0). The base sits 0.4 m proud of the platform,
  which is acceptable.

#### 4.7 Section 6: The Rug Pull (d 335–385)

Run. The floor goes behind you. A pump stone and a market platform sit in the middle, then a cat chain at
the end.

```js
  k.section(335, 385, 'The Rug Pull');
  k.pitySnacks(0, 0, 338);                                         // harder pass: no checkpoint here
  k.tut(343, 'rugpull');
  k.rugPull(348, 360, { x: 0, w: 3, tile: 2.4, speed: 7.4 });
  k.drone(0, 1.8, 356, { range: 2.0 });                            // harder pass
  k.pumpStone(0, 0.4, 362.5, { maxPump: 1, float: 1.2 });         // one hop, then it dumps
  k.market(0, 0, 366.5, { amp: 1.0, group: 'f' });
  k.rugPull(369, 380, { x: 0, w: 3, tile: 2.2, speed: 7.6 });
  k.cat(-1.0, 0, 377.4); k.cat(1.0, 0, 379.6);                     // lit by the collapse front: outrun the pounce
  F(380, 392);
  k.dog(2.6, 0, 384, 'shiba');                                     // dog 5
  k.tix(0, 0.3, 349, 0, 0.3, 359, 5);
  k.tix(0, 0.3, 370, 0, 0.3, 379, 4);
```

- Harder pass: the Snacks at d 338 is now a pity spot. The last real checkpoint before the strips is d 282.
- `F(332, 352)` from the chimney overlaps the start of the first strip (d 348–352). **End that floor at
  d 346** (`F(332, 346)`), so the strip starts over a pit. The tally assumes this.

#### 4.8 Section 7 (new, hardest): Liquidation Line (d 385–450), Box Gauntlet G2

The final exam, side-on, and the last section before the gate, so it is a **Box Gauntlet**. Liquid smog
rises from below while you cross a conveyor with a crusher, blink boxes on the beat, an arrow chain, a Lid
Knight on a small platform, a stamper over a ledge, a rug strip with a lit cat, a fall box and a bounce
chain. There is no other route.

```js
  k.section(385, 450, 'Liquidation Line');
  k.snacks(0, 0, 388);                                             // checkpoint 5 (106 m after checkpoint 4)
  k.tut(389, 'liquidation');
  k.camZone(390, 446, 'side', { dist: 13, height: 4.5, side: 1, ahead: 2.5 });
  k.blinkBox(0, 0.8, 390.5, { on: 0.94, off: 0.94, group: 'liq' });   // teach, over the dry floor F(380, 392)
  k.rising(392, 446, { y0: -4, y1: 0.2, rate: 0.35, trigger: 'enter' });
  k.pitySnacks(0, 0, 393);                                         // gauntlet start (on the belt's first metre)
  k.belt(392, 402, { x: 0, z: 2.6 }, { w: 3 });                    // pushes back, and floods first
  k.crusher(0, 0, 398, { w: 3, d: 2.2, period: 2.2, phase: 0 });
  k.blinkBox(0, 0.8, 405.0, { on: 0.94, off: 0.94, group: 'liq' });
  k.arrowChain([[0, 1.2, 409.5], [0, 4.2, 414.0]], { power: 16 });
  k.platform(0, 4.2, 418.5, 3, 3);
  k.knight(0, 4.2, 418.5, { range: 0.6 });
  k.pack(-1.1, 4.2, 418.5);
  k.platform(0, 4.2, 423, 2.6, 4);
  k.crusher(0, 4.2, 423, { w: 2.6, d: 2.2, period: 2.0, phase: 1.0 });
  k.rugPull(426, 436, { x: 0, w: 2.6, tile: 2.0, speed: 7.5 });
  k.cat(0, 0, 434.4);
  k.fallBox(0, 1.6, 439.5, { delay: 0.35 });
  k.bounceChain([[0, 2.0, 443.0]]);                                // 1 backpack
  F(446, 472);                                                     // dry: the tank wall ends the flood at 446
  k.tix(0, 0.4, 393, 0, 0.4, 401, 4);
  k.tixArc(0, 0.8, 405, 0, 414, 3.4, 5);
  k.tix(0, 4.2, 420, 0, 4.2, 424.5, 3);
  k.tix(0, 0.3, 427, 0, 0.3, 435, 4);
  k.packs([[-2.4, 450], [2.4, 452]]);
  k.gate(456, 'THE PUMP QUEEN', 0xd23cff);
  k.trigger(458, () => game.session.reachBossGate());
```

**Fairness check (1.14).** The hazard rises from −4 at 0.35 m/s to `y1 = 0.2`. A good pace here is about
5 m/s.

| Surface | y | Arrival | Smog at arrival | Margin |
| --- | --- | --- | --- | --- |
| Belt | 0 | 0–2 s | −4.0 to −3.3 | ≥ 3.3 |
| Blink box 405 | 0.8 | 3 s | −2.95 | 3.75 |
| Arrow chain | 1.2 / 4.2 | 4–5 s | −2.6 / −2.25 | ≥ 3.8 |
| Platforms 418.5 and 423 | 4.2 | 7–8 s | −1.55 to −1.2 | ≥ 5.4 |
| Rug strip | 0 | 9–10 s | −0.85 to −0.5 | ≥ 0.5 |
| Fall box and bounce chain | 1.6 / 2.0 | 11–12 s | −0.15 to 0.2 | ≥ 1.4 |

- **The rug strip is the designed squeeze.** The smog passes y 0 at 11.4 s, so a player more than about
  1.5 s behind pace there drowns. DDA (8% slower rate) gives about 1 s back.
- `y1 = 0.2` replaces the 3.0 the first draft considered. Every box after the strip sits at least 1.4 m
  above it.

#### 4.9 Detour A: The Order Book (sky loop, d 232–272)

- **Entry:** a pneumatic tube at `(3.4, 0, 232)`, on the island between the belt and the market pit.
- **Route:** out at y +10 on the right, up an elevator, back at y +15 on the left, then a line down to
  d 233.5, within 2 m of the entry. About 76 m.
- **`detour.loop = true`, `skipSpan = null`.**
- The Bid Wall teach boxes are at x −1.6; the tube is at x +3.4, so they don't overlap.

```js
function buildOrderBook(kd) {
  kd.section('The Order Book');
  kd.start(2.6, 0.1, 234);
  kd.platform(2.6, 0, 234, 3, 3);
  kd.market(2.6, 0, 238.5, { amp: 2.6, group: 'd' });              // bid/ask ladder: the busy pattern
  kd.market(2.6, 0, 243, { amp: 2.6, group: 'd', invert: true });
  kd.pumpStone(2.6, 0.4, 247.5);
  kd.platform(2.6, 0, 252, 3, 3);
  kd.dog(2.6, 0, 252.6, 'corgi');                                   // dog 6
  kd.snacks(3.6, 0, 251.4);                                         // detour checkpoint
  kd.market(2.6, 0, 256.5, { amp: 2.6, group: 'd' });
  kd.platform(2.6, 0, 261, 2.4, 2.4);
  kd.pack(2.0, 0, 261); kd.pack(3.2, 0, 261);
  kd.platform(2.6, 0, 266, 3, 3);
  kd.mover(0, 2.5, 270, { axis: 'y', range: 2.5, speed: 1.0 });    // elevator from +0 to +5
  kd.returnLeg(236, 272);
  kd.platform(-2.6, 5, 268, 3, 3);
  kd.zipline(-2.6, 6.8, 266, -2.6, 6.0, 254);
  kd.platform(-2.6, 4.8, 252, 2.4, 2.4);
  kd.mystery(-2.6, 4.8, 252, { slot: 1 });
  kd.crumble(-2.6, 4.8, 248.4, { w: 2.2, d: 2.2 });
  kd.crumble(-2.6, 4.8, 244.8, { w: 2.2, d: 2.2 });
  kd.platform(-2.6, 4.8, 241, 3, 3);
  kd.zipped(-2.6, 4.8, 241, 8);
  kd.tix(2.6, 0.6, 235, 2.6, 0.6, 265, 10);
  kd.tix(-2.6, 5.2, 266, -2.6, 4.8, 242, 8);
  kd.exit(-2.6, 0, 233.5);
  kd.zipline(-2.6, 16.2 - 10, 239, -2.6, 1.4 - 10, 233.6);         // absolute: 16.2 → 1.4 above the path
}
```

#### 4.10 Detour B: The Cold Wallet (icy dead-end side lane on the left, d 52–116)

- A frozen vault lane at x −6.4 to −10.0 with a **slippery** floor (`track.ground` already supports
  `slippery`; `physics.js` reads it).
- Lid Knights stand on the ice. A slide into them carries you a long way, which is the joke and the
  danger.
- **`detour.loop = true`, `skipSpan = null`.** The first draft exited downstream across the Pump Field.
  That skipped stretch (pump stones over the vat) can't be walked back reliably, so under the detour rule
  it is now a **dead-end lane**. You enter and leave by the same bridge at d 112–116, and the vault is at
  the far end (d 54).

```js
function buildColdWallet(kd) {
  kd.section('The Cold Wallet');
  kd.floor(112, 116, { x: -5.4, w: 2.4 });                          // the only bridge: entry and exit
  kd.floor(52, 116, { x: -8.2, w: 3.6, slippery: true, style: 'metal' });
  kd.pack(-8.2, 0, 104);
  kd.lunch(-8.2, 0, 100); kd.lunch(-8.2, 1, 100);
  kd.oneUp(-8.2, 2, 100);
  kd.knight(-8.2, 0, 94, { range: 1.0 });
  kd.packs([[-7.4, 86], [-9.0, 86]]);
  kd.snacks(-9.2, 0, 83);                                           // detour checkpoint (64 m lane)
  kd.dog(-8.8, 0, 80, 'pug');                                       // dog 7
  kd.zipped(-8.2, 0, 72, 8);
  kd.knight(-8.2, 0, 66, { range: 1.0 });
  kd.tix(-8.2, 0, 110, -8.2, 0, 56, 12);
  // the vault door at the far end (d 52): decor only, with the "COLD WALLET" sign and a frost glow
  // decor: frost decals on the walls (tex tinted 0xbfe8ff), ice crystals from bonusCave's crystal() in 0xbfe8ff
}
```

The detour call becomes `k.detour(114, 114, { y: 0, entry: 'flap', build: buildColdWallet })`.

**Lane separation:** the vat (`k.water`, `w 8.6`) covers x −4.3 to 4.3. Between −4.3 and −6.4 there is
no span, so it is a pit. The bridge at d 112–116 is the only link.

#### 4.11 Decor, lighting and theme

**Banks:**

- `k.banks(-6, END, (x, y, d) => { const r = Math.random(); if (r < 0.35) k.pipe(x, y, d, rand(4, 9), 0x7a5aa0); else if (r < 0.6) k.vat(x, y, d, rand(1.2, 1.8)); else if (r < 0.8) candleNeon(stage, k.W(x, y, d), rand(3, 7)); else k.cones(x, y, d, 3); }, { every: 5 })`.
- `candleNeon` is a new decor function: a `MeshBasicMaterial` box with a thin wick line, green
  (`0x4ade80`) or red (`0xff4a5a`) at random. **It is not linked to the clock**, so it doesn't send
  false tells.
- Ticker boards: put a `k.ticker` every 40 m on alternating sides at the bank height, each showing the
  group used in the next section.

**Edges:** `k.edges(-4, END, (x, y, d) => (Math.random() < 0.5 ? k.vent(x, y, d) : k.cones(x, y, d, 1)), { every: 4 })`.

**Theme `5`** (section 5.2):

- Placeholder `tex_l5_*` textures: `tex_l3_*` with a magenta hue shift (`art/placeholders.js`).
- Fog `0x160a24`, near 30, far 95. Hemisphere `0x8affc8` / `0x2a0830` at 1.2; sun `0xffd0f0` at 1.3;
  rim 0.5.
- `dust: 0xc8ffd8` (green embers), `music: 'level5'`.
- **Chimney:** fog far 60 inside d 284–332 through `k.camZone`'s optional `fog` override (add
  `opts.fogFar`), so the shaft feels enclosed.
- **Liquidation Line:** the stage background tints toward red (`0x2a0a10`) as the smog rises. This is
  driven by `RisingHazard` progress: lerp `scene.background` and fog colour. It is a visual only.

#### 4.12 Level 5 tally

Uses the final values in 4.3, 4.7 and 4.8.

| | Main path | Detour A | Detour B | Total |
| --- | --- | --- | --- | --- |
| Backpacks (plain) | 21 | 2 | 3 | 26 |
| Zipped / Mystery | 0 / 1 | 1 / 1 | 1 / 0 | 2 / 2 |
| Blue Sphere / 1UP / Snacks | 1 / 0 / 6 | 0 / 0 / 1 | 0 / 1 / 1 | 1 / 1 / 8 |
| Cat / Rug / Vacuum Dock | 5 / 3 / 1 | 0 | 0 | 5 / 3 / 1 |
| **Countable breakables** | **38** | **5** | **6** | **49** |
| Dogs | 5 (1–5) | 1 (dog 6) | 1 (dog 7) | **7** |
| Raw line tickets | 117 (including 4 from logs) | 18 | 12 | **147** |
| Pack tickets (about 3; Zipped 8) | ~66 | ~14 | ~17 | ~97 |
| Jackpots | Good Boy 15, green path 15 (needs the L4 bone) | | | 30 |
| Checkpoints | 5 Snacks (48, 121, 207, 282, 388) + 7 pity spots | 1 | 1 | |

- Max checkpoint spacing is now 106 m (d 282 → 388), past the tier 5 guide of 100 m on purpose (harder
  pass, 4.0a).
- **The tally rows above are from before the gauntlets.** Main path changes: the Bid Wall adds 2 backpacks
  (bounce chain), the Liquidation Line adds 1, and the Snacks at d 338 is removed. Countable main-path
  breakables come to **40**. Re-count from the level file when it is written.
- **Maximum raw in one clear:** about 147 + 97 + 30, about **274 raw**, about **91 whole Tickets**.
  There is no coconut source. `rewards-spec.md` sets the cap.
- L5 has fewer breakables than L4 on purpose. Tier 5 spends its density on hazards.

---

### 5. Wiring

#### 5.1 Registry entries (`src/levels/registry.js`, plan 10.1)

```js
import { buildLevel4, buildBoss4Arena } from './level4.js';
import { buildLevel5, buildBoss5Arena } from './level5.js';
import { RoombaTitan } from '../bosses/roombaTitan.js';
import { PumpQueen } from '../bosses/pumpQueen.js';

// excerpt: the full registry also holds 1-3, ride, cave, 6 and kennel
4: {
  id: 4, name: 'Laundry Day', build: buildLevel4, arena: buildBoss4Arena, Boss: RoombaTitan, bossKey: 'titan',
  theme: 4, bossTheme: 'boss4', tier: 4,
  unlock: (s) => isBeaten(s, 3),               // the Evil Cone
  mapPos: { x: 88, y: 52 },
  trial: { targets: [98, 125, 160, 90], floorMs: 24000, hub: false },   // hub: true once metaverse-hub has variant "4"
},
6: {
  // owned by docs/expansion/level6-spec.md: id 6, 'Smog Rapids', tier, build, k.raft ...
  unlock: (s) => isBeaten(s, 4),               // the Roomba Titan
  mapPos: { x: 93, y: 33 },
},
5: {
  id: 5, name: 'Pump & Dump Pipeline', build: buildLevel5, arena: buildBoss5Arena, Boss: PumpQueen, bossKey: 'queen',
  theme: 5, bossTheme: 'boss5', tier: 5,
  unlock: (s) => isCleared(s, 6),              // Smog Rapids cleared
  mapPos: { x: 84, y: 13 },
  trial: { targets: [95, 118, 156, 85], floorMs: 21000, hub: false },
},
```

- **`isBeaten(s, id)` and `isCleared(s, id)`** come from the save v3 keyed fields (`rewards-spec.md` owns
  the schema).
  - `isBeaten` means the level's boss is beaten.
  - `isCleared` means the level's goal was reached. L6's goal type is set by `level6-spec.md`; if L6 has
    a boss, "cleared" means its boss is beaten.
- **Map order:** `MAP_ORDER = [1, 'ride', 2, 'cave', 3, 4, 6, 5, 'kennel']`.
- **Map nodes** (percent of the `level_map` image): `4: { x: 88, y: 52 }`, `6: { x: 93, y: 33 }`,
  `5: { x: 84, y: 13 }`, `kennel: { x: 12, y: 40 }`. Existing nodes don't move.
  - On narrow screens the map panel already sits beside the nodes. Check that nodes at x 88–93% stay
    clear of it. If not, the map becomes a horizontal scroll (plan 6.0).
- **Map path drawing:** the dotted line between nodes follows `MAP_ORDER`. The segments 3→4, 4→6 and
  6→5 stay hidden until each target unlocks, then draw in over 0.8 s with `'chime'`.
- **The Wizard Hat** skips the Titan and the Queen as it does the existing bosses. Skipping a boss with
  the hat **doesn't** set `beaten` (`player.js` comment: "Never writes beaten"), so it doesn't unlock L6
  or the ending. That matches the current behaviour.

#### 5.2 Themes (`src/world/stage.js` `THEMES`)

```js
4: {
  name: 'Laundry Day', ground: 'tex_house_ground', wall: 'tex_house_wall', platform: 'tex_house_platform',
  sky: 'bg_level4', fog: 0xf0d6ae, fogNear: 45, fogFar: 125, hemiSky: 0xfff0d8, hemiGround: 0x8a5a32, sun: 0xffe0b0, sunI: 1.45, hemiI: 1.25,
  dust: 0xf2e6d0, music: 'level4', bpm: 112,
},
boss4: {
  name: 'The Living Room', ground: 'tex_house_ground', wall: 'tex_house_wall', platform: 'tex_house_platform',
  sky: 'bg_boss4', fog: 0xd8b88a, fogNear: 40, fogFar: 110, hemiSky: 0xffe0c0, hemiGround: 0x5a3a22, sun: 0xffd0a0, sunI: 1.35, hemiI: 1.15,
  dust: 0xe8d8c0, music: 'boss4',
},
5: {
  name: 'Pump & Dump Pipeline', ground: 'tex_l5_ground', wall: 'tex_l5_wall', platform: 'tex_l5_platform',
  sky: 'bg_level5', fog: 0x160a24, fogNear: 30, fogFar: 95, hemiSky: 0x8affc8, hemiGround: 0x2a0830, sun: 0xffd0f0, sunI: 1.3, hemiI: 1.2, rimI: 0.5,
  dust: 0xc8ffd8, music: 'level5', bpm: 128,
},
boss5: {
  name: 'The Candle Ring', ground: 'tex_l5_ground', wall: 'tex_l5_wall', platform: 'tex_l5_platform',
  sky: 'bg_boss5', fog: 0x200a2a, fogNear: 40, fogFar: 120, hemiSky: 0xffa0e0, hemiGround: 0x180818, sun: 0xffd0e0, sunI: 1.3, hemiI: 1.2,
  dust: 0xf0d0ff, music: 'boss5',
},
```

- The **`bpm`** key is new. `MarketClock` reads `stage.theme.bpm ?? 120`.
- **Placeholders** (plan 9.2, through `art/placeholders.js`):
  - `bg_level4` and `bg_boss4` → `bg_house` (procedural).
  - `bg_level5` and `bg_boss5` → `bg_level3` / `bg_boss3` with a magenta hue shift.
  - `tex_l5_*` → `tex_l3_*`, hue shifted.

#### 5.3 Story text (`src/story/script.js`)

**New speakers** (portraits are placeholders, plan 9.2):

```js
titan: { name: 'ROOMBA TITAN', portrait: 'portrait_titan', blip: 'blipLow' },
queen: { name: 'THE PUMP QUEEN', portrait: 'portrait_queen', blip: 'blip' },
```

**`CHAPTER2`.** A new export, played once on the first map visit after the Evil Cone's credits, when
`save.finished && !save.seenCh2`. It sets `seenCh2` (a save v3 field; tell `rewards-spec.md`). Images use
placeholders: `story_ch2_1` → `story_ending`, `story_ch2_2` → `story_rescue_3`.

```js
export const CHAPTER2 = [
  { img: 'story_ch2_1', speaker: '', text: 'Every dog is free. The island naps in the sun. Then one morning, the sky goes... grey again.' },
  { img: 'story_ch2_1', speaker: 'SPROTO MASK', text: 'Smog?! We popped the Evil Cone! Unless... somebody was PUMPING him the whole time.' },
  { img: 'story_ch2_2', speaker: '', text: 'Down the hill, the Owner\'s House hums. Something enormous is vacuuming up every popped cone on the island.' },
  { img: 'story_ch2_2', speaker: 'SPROTO MASK', text: 'Chapter 2, Nobu: The Smog Returns. Stretch those legs. We\'re going to the House.' },
];
```

**`LEVEL_INTRO` additions:**

```js
4: [
  ['mask', 'Laundry Day! Everything in here is HUGE. Or we\'re tiny. Let\'s not think about it.'],
  ['mask', 'Break stuff back to back for a CHOMP CHAIN. Keep it going and I\'ll pop out to help.'],
  ['mask', 'Clotheslines: BITE to grab on, JUMP to let go. Wheee.'],
],
// 6: owned by level6-spec.md (Smog Rapids)
5: [
  ['mask', 'The Pump & Dump Pipeline. Green means up, red means down. Just like my portfolio.'],
  ['mask', 'Watch the arrows: platforms move one beat after they light up. Hop pump pills to make them rise. Don\'t hang around. They DUMP.'],
  ['mask', 'Whoever pumped the Evil Cone is at the end of this pipe. Let\'s go say hi.'],
],
```

**`RESCUE` additions** (after each boss):

```js
4: [
  { img: 'story_rescue_1', speaker: '', text: 'The Roomba Titan sputters, beeps sadly and spits out a mountain of cones. And one soggy map.' },
  { img: 'story_rescue_1', speaker: 'SPROTO MASK', text: 'The map shows a river of smog running from the House to some kind of... Pipeline. First stop: the rapids.' },
],
// 6: owned by level6-spec.md. Its last line must hand off to Level 5, for example:
//    { speaker: 'SPROTO MASK', text: 'The rapids drain into a giant pipe stamped PUMP & DUMP. Of course they do.' }
5: [
  { img: 'story_rescue_3', speaker: '', text: 'The Pump Queen deflates with a long, sad squeak. Her crown rolls across the floor and spins to a stop.' },
  { img: 'story_rescue_3', speaker: 'THE PUMP QUEEN', text: 'It was supposed to go up... FOREVER...' },
  { img: 'story_rescue_3', speaker: 'SPROTO MASK', text: 'Nothing goes up forever. Except Nobu. Nobu goes up now.' },
],
```

**`BETWEEN` additions** (mask tips after each boss):

```js
4: [
  ['mask', 'NEW MOVE: DUST DASH! SLIDE, then BITE mid-slide to burst forward.'],
  ['mask', 'Grey fuzzy walls? Dash right through them. There were a few of those back in the old levels...'],
],
// 6: owned by level6-spec.md
5: [
  ['mask', 'NEW MOVE: MOON JUMP! HOLD jump for a moment, then let go. To the moon. For real this time.'],
  ['mask', 'See those glowing ledges way up high in every level? Moon Ledges. Go see what\'s up there.'],
],
```

**Map unlock banners** (`game.js`, shown when a node first unlocks):

| Unlock | Banner |
| --- | --- |
| L4 | `CHAPTER 2` / `LAUNDRY DAY IS OPEN` |
| L6 | `NEW STAGE` / `SMOG RAPIDS` (copy owned by `level6-spec.md`) |
| L5 | `NEW STAGE` / `PUMP & DUMP PIPELINE` |

`BOSS_TALK.titan` and `BOSS_TALK.queen` are owned by `bosses-spec.md`.

#### 5.4 Tutorials (`TUTORIALS` additions)

Each is shown once per save through `k.tut(d, id)` or the entity's first touch. Images are existing assets,
standing in until icons exist.

```js
chain:       { img: 'backpack_icon', title: 'CHOMP CHAIN', text: 'Break things back to back, fast! Keep the chain going and a Sproto Mask pops out.' },
mystery:     { img: 'backpack_icon', title: 'MYSTERY BACKPACK', text: 'What\'s inside? Tickets? A mask? A 1UP? ...a CAT? Only one way to find out.' },
dustbunny:   { img: 'mouse', title: 'DUST BUNNY', text: 'Bite it and it splits in two! Stomp or belly flop it to get rid of it for good.' },
spindrum:    { img: 'nobu_head', title: 'SPIN CYCLE', text: 'Ride the platforms around the drum. Hop off when you reach the top!' },
zipline:     { img: 'nobu_head', title: 'CLOTHESLINE', text: '<span class="key">J</span> BITE near a line to grab it. <span class="key">SPACE</span> to let go. Wheee!' },
iron:        { img: 'nobu_head', title: 'HOT IRON', text: 'It sweeps the whole board. Ride the steam vents up and let it pass underneath.' },
toaster:     { img: 'nobu_head', title: 'TOASTER', text: 'Stand on the toast. When it glows... POP! Hold <span class="key">SPACE</span> for extra height.' },
stampede:    { img: 'vacuum', title: 'STAMPEDE!', text: 'RUN toward the camera! Hold <span class="key">↓</span> / <span class="key">S</span> and jump the cables!' },
smogvent:    { img: 'nobu_head', title: 'SMOG VENT', text: 'Choked with smog. A really loud <span class="key">L</span> BARK might clear it...' },
dustwall:    { img: 'nobu_head', title: 'DUST WALL', text: 'Way too fluffy to bite. Come back with a faster move!' },
zoomiegate:  { img: 'nobu_head', title: 'ZOOMIE GATE', text: 'Step on the paw plate and the gate opens... for a moment. Only ZOOMIES are fast enough!' },
boiler:      { img: 'nobu_head', title: 'BOILER FLOOD', text: 'Hot water is rising! Keep climbing. Don\'t stop!' },
market:      { img: 'pill_bot', title: 'MARKET PLATFORMS', text: 'GREEN edge = going UP next beat. RED = going DOWN. Watch the arrows, then jump.' },
pumpstone:   { img: 'pill_bot', title: 'PUMP PILL', text: 'Every hop pumps it higher. Wait too long and it DUMPS. Keep moving!' },
smogwave:    { img: 'nobu_head', title: 'SMOG WAVE', text: 'A wall of smog! RUN toward the camera and don\'t look back!' },
chimney:     { img: 'nobu_head', title: 'GREEN CANDLE', text: 'Climb the candles to the top. Only the green ones go up!' },
rugpull:     { img: 'rug', title: 'RUG PULL', text: 'The floor is leaving. Step on it and RUN. Do NOT stop.' },
liquidation: { img: 'nobu_head', title: 'LIQUIDATION', text: 'The smog is rising and there\'s no going back. Keep moving, keep jumping!' },
moonledge:   { img: 'nobu_head', title: 'MOON LEDGE', text: 'Way too high for a normal jump. You\'ll need to go to the moon...' },
```

- The Mega Bark key in the `smogvent` text follows the existing `bark` tutorial (`L` or `E`). Show `L`
  only, to keep the box short.
- `moonledge` is shown the first time a Moon Ledge is within 8 m and Moon Jump isn't owned.

#### 5.5 Boss gates and arenas (level side only)

| | L4 | L5 |
| --- | --- | --- |
| Gate | `k.gate(476, 'ROOMBA TITAN', 0x3a3d44)` | `k.gate(456, 'THE PUMP QUEEN', 0xd23cff)` |
| Trigger | `k.trigger(478, () => game.session.reachBossGate())` | `k.trigger(458, ...)` |
| Arena builder | `export function buildBoss4Arena(game, stage, tickets)` in `level4.js` | `export function buildBoss5Arena(...)` in `level5.js` |
| Arena summary | The Living Room at dog scale: a 24 × 24 m floor (`stage.block(-12, -6, -12, 12, 0, 12, 'ground')`), furniture legs at the corners as pillars, a central rug, a wall socket. Spawn `(0, 0, 8)`, facing π. Camera `arena` with offset `(0, 12, 15.5)`. Spheres at `(±9, 0, -9)`. | The Candle Ring: candle pillars around a pit (market platforms on the boss's own clock). Spawn `(0, 0, 8)`. Camera `arena` with a higher offset `(0, 14, 17)`. |

Everything else about the arenas is in `bosses-spec.md`. The arena builders return the same shape as the
existing ones: `{ spawn, facing, camera, spheres }`.

#### 5.6 Music (`src/audio/songs.js`)

Same format as the existing songs: 16th-note tokens, `bpm`, `tracks[]` and `drums`. Each new song is 4
bars plus a 4-bar B section, looped. These are notes for whoever writes the patterns.

| Song | bpm | Key and mood | Tracks | Drums |
| --- | --- | --- | --- | --- |
| `level4` | 112 | B♭ major, domestic funk, "chores are fun" | `square` lead, staccato, gate 0.45, call-and-response 2-bar phrases; `triangle` bass, octave walk B♭1–B♭2 on 8ths with chromatic approach notes; `triangle` pluck chord stabs (B♭6, E♭maj7, Cm7, F7) on the "and" of 2 and 4 | kick `x...x...x...x...`, snare `....x.......x...`, hat `x.x.x.x.x.x.x.x.`, shaker every 16th from bar 5. B section for basement and boiler: drop to the bass alone plus a ticking hat, add a minor IV (E♭m) for unease. |
| `level5` | **128** (drives `MarketClock`; don't change it without retuning the patterns) | E minor, ticker trance | `triangle` arpeggio of 16ths (E3 G3 B3 E4 …); `square` lead entering on bar 5, long held notes at gate 0.9; `sine` sub bass on the root, whole notes; one `triangle` voice playing a rising 4-note "pump" motif every 2 beats, in time with market steps | kick four-on-the-floor `x...x...x...x...`, clap on 2 and 4, open-hat offbeats `..x...x...x...x.` |
| `boss4` | 140 | D minor, the robot vacuum | a busy `square` bass ostinato, `whirr`-like portamento lead | `bosses-spec.md` may override |
| `boss5` | 132 | E♭ minor, final boss | a big `triangle` choir chord pad, a `square` fanfare | `bosses-spec.md` may override |

**The market sync rule:** `MarketClock` derives `step = 2 × 60 / bpm` and **starts at the music's bar
start** (`audio.playMusic` returns a start time; add one if it doesn't). Each step boundary lines up with
an even beat. That way, the chime and beep tells fall on the beat.

---

### 6. Playtest checklists

Each row is one section. A tester plays the level start to finish **for the first time** at least three
times, with three different testers (plan 4.6). They record deaths per section from the dev death heatmap.
The target is the median of the three.

#### 6.1 Level 4

| Section | Target deaths (median, first play) | Check |
| --- | --- | --- |
| Hallway | 0 | The chain of 8 makes the first Blue Sphere drop for every tester without being told. The Mystery Backpack is found by at least 2 of 3. |
| Laundry Room | 1–2 | Drum 1 boards without help. Drum 2's crumble platform is noticed before it fails. The zipline tutorial is enough: nobody walks off a line platform without trying a bite. The optional high line is found by at least 1 of 3. |
| Ironing Board | 2 | Testers use the steam vents to let the iron pass, rather than outrunning it. Knights on the narrow board are slid into, not bitten (watch for "clang" frustration). Check the Good Boy Route reveal on a no-death run. |
| Kitchen Counter | 1 | Toaster timing is read from the glow, without a prompt. Oranges are dodgeable in all three lanes. The cat wall is tried at least once. The Pantry entrance is found by at least 1 of 3. |
| Roomba Stampede | 2 | Controls feel right when the camera flips (hold ↓). Both gaps are cleared at chase speed. The Zoomie Gate is understood when someone has Zoomies (check the 22 m plate distance by timing it). |
| Basement Stairs (G1) | 1–2 | Lumi's light is enough to read the Cereal Box outlines and blink tick. The Smog Vent tutorial makes people bark, and the green bone is found by at least 2 of 3. The Bark Rock alcove is opened (dog 5). Check that nobody squeezes past the rock without barking. |
| **Boiler Room (G2)** | **2–3** | **The hardest section.** Testers feel the pressure but say it's fair. Check the arrival-time table in 3.8 with a recorded run. The teach boxes are enough to read the blink tick. Deaths come from timing, not from not knowing where to go. |
| **Total** | **10–14** | |

#### 6.2 Level 5

| Section | Target deaths | Check |
| --- | --- | --- |
| Opening Bell | 0–1 | Testers watch the edge colour before jumping, from the third platform at the latest. A miss onto the walkway reads as safe. |
| Pump Field | 1–2 | Pump stones are understood after one dump. The high route (pump twice) is found by at least 1 of 3. Cold Wallet: Knights on ice are funny, not unfair. |
| Smog Wave | 1–2 | Pattern `c` market platforms are almost always up when you arrive at chase pace. If testers die there more than twice, lower `amp` to 1.0. |
| Trading Floor (G1) | 2–3 | Conveyor plus crushers keeps L3's readability. The Bid Wall is the main death source here; that's expected. The teach boxes over the floor are tried before the pit. The Nitro wall plus the Vacuum Dock is understood. |
| Green Candle Chimney | 2–3 | The rise camera shows the next candle. The glide gap is cleared by gliding, not by luck. The yellow bone is grabbed mid-glide by at least 1 of 3. |
| The Rug Pull | 1–2 | "Keep running" is understood after the first collapse. The pump stone (one hop) in the middle doesn't feel like a trick. The lit cats behind you read as a chase, not a trap. |
| **Liquidation Line (G2)** | **3–4** | **The hardest section.** The side camera's controls (left and right along the track) feel natural within 5 seconds. Blink boxes on the beat read with the music. Check the arrival times in 4.8. Deaths should cluster at the rug strip, the designed squeeze. |
| **Total** | **12–18** | |

#### 6.3 Checks for both levels

- [ ] Every main-path gap is within the reach in 2.2. Test it with god mode **off**.
- [ ] Nothing countable is behind a Zoomie Gate, Dust Wall or Moon Ledge.
- [ ] Every checkpoint gap is within the tier limit (2.3).
- [ ] Respawn at **every** Snacks and pity spot. Check that chasers, rising hazards, rug pulls,
      ambushes, ziplines, drums and pump stones all reset as specified in section 1.
- [ ] A full time trial on each level ends at the gate. Sky-detour pipes are closed in trials, and
      Mystery Backpacks are plain.
- [ ] A full run in god mode never soft-locks: chasers hold at 2.4 m, the rising hazard bounces you.
- [ ] The mirrored build (plan 4.5, once it exists) plays both levels with no helper placing anything on
      the wrong side.
- [ ] Frame time stays at or under 16.7 ms on the reference laptop in the Boiler Room (3 drums of
      platforms, water and point lights) and on the Liquidation Line.
- [ ] Every new asset id renders its placeholder (`art/placeholders.js`), and the console shows no
      missing-asset warnings.

---

#### 6.4 Golden Bone feasibility, per section

Rule: every countable breakable and dog can be collected in **one run with no later moves**, and nothing
countable sits side by side (two items that need different lanes at the same `d`) on a chase or
auto-scroll stretch.

**Level 4:**

| Section | Note |
| --- | --- |
| Hallway | All on foot. The Mystery is up two lunchbox steps. |
| Laundry Room | Dog 2 needs a jump from Drum 1's top (reachable every turn). Shelf packs are on the main route. The long high line holds tickets only. |
| Ironing Board | Packs on the board are on the route. The Good Boy Route pays a 1UP and jackpot, which aren't breakables. |
| Kitchen Counter | Shelf A and B are each reached by a toaster, and you can come back down and use the next one. The cat wall breaks in one pounce. The Cookie Jar packs need a clean pass of the round (Treat Tray rules). |
| Pantry (Detour B) | All on foot. `skipSpan [187, 244]` is walkable back from the exit (1.16). |
| Roomba Stampede (chase) | 3 packs at d 275 (lane 0), 292 (right) and 300 (left): one per `d`, at least 8 m apart, never side by side. The Zoomie lane holds tickets only. |
| Basement Stairs | G1 holds tickets only. The dog behind the Bark Rock needs Mega Bark, which is guaranteed by L4. The Dust Wall guards only the Hidden Bone. |
| Boiler Room (G2) | Dog 7 is on a side pipe off arrow box 2: step off, then rejoin by jumping back to box 2 (it is a lunchbox, so it stays). The bounce chain's 2 packs break on the clean route. |
| Top Shelf (Detour A) | A loop. Dog 6 and the packs are on the outbound leg; the 1UP and Zipped are on the return. |

**Level 5:**

| Section | Note |
| --- | --- |
| Opening Bell | All on foot. |
| Pump Field | The high-route packs need pumping a stone twice, a current move. The green-path jackpot needs the L4 bone, but it is a jackpot, not a breakable. |
| Cold Wallet (Detour B) | A dead-end loop, all on foot. |
| Smog Wave (chase) | Packs at d 145 (left), 160 (right) and 170 (centre); dog 3 at d 165 (right). The dog and the d 160 pack are on the same side, 5 m apart. Nothing is side by side. |
| Trading Floor (G1) | Both Bid Wall packs break on the clean route. The Nitro wall clears with one pounce or with the Vacuum Dock. |
| Order Book (Detour A) | A loop. |
| Chimney | The catwalk packs and sphere are on the route. The yellow bone isn't countable. The Moon Ledge holds only the Hidden Bone. |
| Rug Pull | No countables on the strips, except the two Cats: they are lit by the front and count when they pounce. |
| Liquidation Line (G2, auto-scroll pressure) | One pack beside the Knight, one in the bounce chain, two on the gate floor. All are on the single route. |

### 7. Tests this spec adds

All are Vitest, pure logic, under `npm test`.

| Test | Checks |
| --- | --- |
| `sections.test.js` | `Track.sectionAt` at the boundaries. L4 and L5 section lists cover d −8 to the gate with no gaps (the level files export a `SECTIONS` list for this). |
| `drum.test.js` | `drumPos` makes a full revolution; the rim speed rule (≤ 3.4 m/s) holds for every `k.spinDrum` in `level4.js`, checked against an exported `DRUMS` list. |
| `zoomie-gate.test.js` | `gateReachable(dist, open, speed)` is true at 12.4 m/s and false at 8.0 for every gate in L4 and L5. |
| `market.test.js` | `MarketClock` patterns loop; `next()` matches the level one step later; the `amp` and water rule holds for every `k.market` placement (exported `MARKETS` list with the nearest fall-out plane). |
| `moon-ledge.test.js` | Each Moon Ledge is at least `MOON_LEDGE_MIN` above the surfaces near it. |
| `rising.test.js` | For each `k.rising`, the arrival-time table exported by the level (`RISING_CHECKS`) keeps a margin of at least 0.5 m at a good pace. |
| `detour-rule.test.js` | For every `k.detour` in L4 and L5 (exported `DETOURS` list): `loop` is true, or `skipSpan` contains no crumble-only, fall-box-only, rug-pull, rising or chase crossing. |
| `registry.test.js` (extended) | L4 unlocks on the Cone; L6 on the Titan; L5 on L6 cleared; map order is `[1, 'ride', 2, 'cave', 3, 4, 6, 5, 'kennel']`; ids 1–3 unchanged. |

**Exported data:** the level files export small data arrays (`SECTIONS`, `DRUMS`, `MARKETS`,
`MOON_LEDGES`, `RISING_CHECKS`) that the build code also uses. That keeps the tests honest without
WebGL. The tests import only those arrays, and the arrays are defined at the top of each level file,
outside `buildLevelN`.

---

# Part 6: Level 6 spec

Source: `docs/expansion/level6-spec.md`

## Level 6: Smog Rapids (authoring spec)

Status: **spec only.** No game code has changed. Written 2026-11-04 against `main` at `bfb4a33`.

This is the full spec for plan section 6.4. It covers the level's concept, the raft mechanic (`k.raft`)
and its water hazards, every placement, the two detours, the secrets, the trial, the story and the
placeholders.

Shared kit helpers are specified in `docs/expansion/new-levels-spec.md`. This file only **uses** them:
`k.section`, `k.chase`, `k.pitySnacks`, `k.mystery`, `k.dustWall`, `k.moonLedge`, `k.smogVent`,
`k.zoomieGate`, `k.zipline`, `k.spinDrum`, `k.toaster`, `k.market`, `k.rugPull`, `k.rising`, `k.dark`,
`k.detour`, and the camera modes `'side'` and `'rise'`.

Box gauntlet helpers are specified in `docs/expansion/box-gauntlets-spec.md`. This file only **uses**
them: `k.blinkBox(x, y, d, { on, off, phase, group })`, `k.bounceChain(points, { y })`,
`k.fallBox(x, y, d, { delay })`, `k.slideBox(x, y, d, { axis, range, speed, phase })` and
`k.arrowChain(points, { power })`.

This file **owns** these helpers: `k.raft`, `k.whirlpool`, `k.outflow`, `k.slick`, `k.driftLog`,
`k.floatPack`, and the barrel option on `k.coconuts`.

---

### 1. Concept

- **Fiction:** the Roomba Titan's dust bag burst. Its smog poured down the Owner's House drains into the
  river behind the house, and that river runs straight to the Pump & Dump Pipeline. Nobu jumps into the
  Owner's laundry basket and rides the smog downstream. A dog is coned on every buoy and barge along the
  way.
- **Archetype:** a mixed river level, like Crash's jet-ski levels (Hang Eight, Makin' Waves). **Four raft
  rides** alternate with **three on-foot landings**, and there are two detours. The river never stops
  moving, so the level feels alive even when Nobu stands still.
- **Place in the game:** play order is 1, ride, 2, cave, 3, 4, **6**, 5. Tier 4.5. It is harder than
  Laundry Day and easier than Pump & Dump.
  - **Target first-play deaths: 11–15.** That sits between L4 (10–14) and L5 (12–18).
  - It previews Pump & Dump with a market-platform teaser in a detour.
- **Box gauntlets:** two of the on-foot landings are **timing-only box gauntlets** over open water. There
  is no other route: you pass only by timing jumps on the boxes.
  - Gauntlet 1 is **Crate Drift** in the Barge Yard.
  - Gauntlet 2 is **Floodgate Crates**, the last landing before the goal.
  - Every box pattern is taught once over safe ground first, and each gauntlet starts at a
    pity-checkpoint spot.
- **No boss.** It ends at a goal gate, like the bonus stages. It is still a **full main level**: a
  six-bone Bone Board, 7 dogs, a Good Boy Route, a colored bone, a Hidden Bone, 3 Mystery Backpacks and a
  time trial.

#### Design pillars for this level

1. **The current is the clock.** Raft rides auto-scroll, so there is pressure without a timer. Foot
   landings are where players breathe, explore and collect.
2. **Read the water.** Every water hazard has a visible tell on the surface:
   - foam rings for whirlpools
   - a gurgle sound and spray for outflows
   - a purple sheen for slicks
   - a foam line and a sign for falls
3. **Speed is a resource.** Ramming a log stalls the raft. A stall right before a waterfall means the raft
   won't make the jump. The player learns to protect their speed.
4. **One new water idea per ride:** Ride 1 teaches steering and hops. Ride 2 adds whirlpools and
   outflows. Ride 3 adds slicks and falls. Ride 4 is the final exam with all of them.
5. **Boxes test timing, rides test steering.** Foot landings either teach a box pattern over a safe floor,
   or run a gauntlet of patterns already taught over water.
6. **Every raft breakable can be reached** at full speed (5.2). The raft can't bite, only ram, and its
   steering is limited, so countable items are spaced to fit.

---

### 2. The raft (`k.raft`)

#### 2.1 What it reuses

Roomba Rush already has a ride controller in `src/player/player.js`:

- the ride branch in `update`, around lines 231–247: auto-forward along `stage.track.tangent`,
  left/right steering, and a hop on jump
- crash detection around lines 358–365 (a ride that rams something solid bumps up and slows to
  `speedK = 0.4`)
- `setRide(cfg)` around line 741
- "the ride counts as sliding" for interactions, around line 578

The raft is that controller with three changes:

1. **Mount and dismount mid-level.** Roomba Rush mounts once, from the level's `info.ride` at spawn
   (`session.js:164`).
2. **A different mesh, and per-ride tuning.**
3. **It floats on water:** an invisible floor at water level, with water death only through gaps.

#### 2.2 API

```js
// Raft ride from d0 to d1. Builds the water surface, an invisible floor at water level, and the
// mount/dismount bookkeeping. Returns the span record.
k.raft(d0, d1, {
  speed = 11,        // m/s at full speedK (Roomba Rush is 10.5)
  steer = 6.0,       // lateral m/s at full stick (Roomba Rush is 6.8; the raft is heavier)
  hop = 1.0,         // multiplier on T.JUMP for the raft hop
  airJumps = 0,      // air jumps allowed while riding (0: one hop, no double jump on the raft)
  y = -1.0,          // water surface height relative to the path
  w = 9.2,           // river width (matches the walls)
  color = 0x5a8a7a,  // smoggy river green
  boost = [],        // [[da, db, mult]] speed multipliers, e.g. chutes
  falls = [],        // [[da, db]] gaps in the floor: waterfalls you must clear on momentum
});
```

#### 2.3 How it is built

- **Water surface:** `k.water(da, db, { w, y, color })` for each stretch of `[d0, d1]` between falls.
  Water zones drive the pit death (`stage.killYAt` returns water y − 0.5), so **the gaps in `falls` get no
  water zone**. Below a fall, the pit death is the normal `heightAt − 12`.
- **Floor:** `track.ground(da, db, { u: 0, w, dy: y + 0.02, visible: false, style: 'platform' })` for
  each stretch between falls. The raft "floats" because it stands on this floor. The river is wall to
  wall, so the raft can't fall in sideways; the banks are the walls.
- **Span record:** `stage.raftSpans.push({ d0, d1, cfg, falls, boost })`. `stage.raftSpans` is created
  on the first call.
- **One `RaftController` per stage** (an always-active entity, created on the first `k.raft` call). Each
  frame it reads `s = player.body.s`:
  - If `s` is inside a span, the player isn't already riding that span, and the player is **grounded or
    falling onto the raft floor** (within 0.6 m above water y): call `player.setRide({ ...cfg, mesh:
    'raft' })`, play `splash`, and set `speedK = 0.5` (a moored raft pushes off quicker than a cold
    start).
  - If `s >= d1` (or below `d0`) while riding: dismount. Call `player.setRide(null)`, then `vel.y = 7.5`
    (a little hop onto the dock), play `splash`, and show a **beached raft mesh** at `d1 − 1.2` on the
    bank side.
  - **It polls, not triggers.** Track triggers fire once and never reset (`session.js:709`), so they
    can't mount a raft again after a checkpoint rollback.
- **Moored raft mesh:** a static basket at `d0 + 1.2` on the water, hidden while that span is being
  ridden, shown again when Nobu is off it.

#### 2.4 Changes to `player.js`

- `setRide(cfg)`:
  - Pick the mesh from `cfg.mesh`: `'vacuum'` (default, `rideVacuumMesh()`) or `'raft'`
    (`raftBasketMesh()`, new in `src/entities/ride.js`). Cache one mesh per kind.
  - Store `steer`, `hop`, `airJumps` and `boost` on `this.ride`.
- Ride branch:
  - `const lat = steer * (R.steer ?? 6.8)`.
  - Boost: `sp *= boostAt(s)`, which looks up the current span's `boost` entries.
  - While `R.slick > 0`, the `_approach` rate drops from `70 * dt` to `12 * dt`, so the raft drifts.
- Hop:
  - On a raft, the jump uses `T.JUMP * R.hop`.
  - Set `this.airJumps = R.airJumps` when the hop starts. With `airJumps = 0` there is no double jump on
    the raft.
  - The vacuum keeps its current behaviour (`airJumps` undefined means unchanged).
- Raft visuals:
  - No dust. Spawn **wake foam**: `fx.dust` with colour `0xe8f4ee`, `count: 1`, `size: 0.22`, behind the
    raft, at the same 0.18 chance as the vacuum's dust.
  - `whirr` is replaced with a soft `paddle` loop: a new synth sound, every 0.7 s while grounded.
  - The bank sway (`this.bank`) is doubled for the raft so it rolls on the water.
- Crash (the solid-ram branch at line 358): unchanged. Ramming a `k.log` bumps the raft up and drops it
  to `speedK = 0.4`. That is the "speed is a resource" lesson.
- God mode and masks: unchanged. A mask or god mode bulldozes hazards, as on the vacuum.
- Gear:
  - The Clown-Nose Collar's air dash is **off while riding**. The raft isn't the player body, and a dash
    would skip the falls.
  - Tail Glide is **off while riding**. It is already gated on `!this.ride` (line 311).

#### 2.5 Rollback and death

- `Session.respawn` already sets `speedK = 0` while riding (line 660). Change it so the mount state comes
  from the respawn point:
  - `const span = stage.raftSpans?.find((r) => cp.s >= r.d0 && cp.s < r.d1)`
  - `player.setRide(span ? { ...span.cfg, mesh: 'raft' } : null)`
  - `speedK = 0.35`: you respawn **drifting**, not stopped.
- **Snacks on the water** (floating checkpoints) store their `s`, so a respawn there puts Nobu back on a
  raft.
- Moored and beached raft meshes reset to match the mount state.
- New death types:
  - `'splash'`: fell into the river, or wrecked by a log or barrel while riding.
  - `'whirl'`: sucked into a whirlpool's centre.
  - Both use the `death_angel` card art until real art exists (`DEATH_ART` fallback in `ui.js`).
  - Captions go in `DEATH_CAPTIONS` in `src/story/script.js`:
    - `splash`: `'SPLASH!'`, `'That is NOT a doggy paddle'`, `'Swept away. Very wet. Very sad.'`
    - `whirl`: `'FLUSHED!'`, `'Round and round and... gone'`, `'The river said: down bad'`

#### 2.6 Camera

- Raft spans use the Roomba Rush framing: `{ mode: 'track', height: 4.9, dist: 9.6, ahead: 7.5 }` and
  `fov: 66`.
- Foot landings use the Bark Jungle framing: `{ height: 4.3, dist: 8.6, ahead: 5.5 }` and `fov: 60`.
- `RaftController` blends between the two over 0.6 s on mount and dismount. It calls
  `camera.setMode('track', {...})` with the new numbers; the camera's damping smooths the change.
- On a fall, the camera keeps its height for 0.3 s, then follows. The drop then reads as a drop, not a
  camera snap.

#### 2.7 DDA hooks (plan 4.3)

These are applied per span, with the counter at the span's last checkpoint.

| Deaths at this checkpoint | Raft help |
| --- | --- |
| 5 | Raft `speed` −8%. Whirlpool `pull` −15%. Outflow `push` −15%. |
| 7 | The pity checkpoint activates (`k.pitySnacks` placed in each ride). |
| 7, before a fall | A **pity lily pad** (`LilyPad`, `r = 1.6`) appears in the middle of the gap. A stalled raft lands on it and keeps going. |
| 9 | Two masks on respawn (plan 4.3). |

All of these are off in trials, remixes and any run that posts a score.

---

### 3. Water hazards and new entities

All new entities live in a new file, `src/entities/river.js`, except the barrel option, which is in
`props.js`.

#### 3.1 Whirlpool: `k.whirlpool(x, d, { r = 3.0, pull = 3.2, kill = 0.9 })`

- **Behaviour:**
  - Inside radius `r` (horizontal distance from the centre), add a pull toward the centre:
    `f = pull * clamp(1.4 - dist / r, 0.3, 1.2)`.
  - This uses the same `p.pushX` and `p.pushZ` channel as the Evil Cone's Shame Vortex
    (`evilCone.js:473-498`). The player code applies and clears it each frame.
  - Inside radius `kill`, while grounded on the water: `p.hurt('whirl')`.
  - It also works on foot (a whirlpool can sit beside a dock).
- **Tell:** a rotating foam disc (procedural canvas texture: a spiral of white dashes on transparent) at
  water y + 0.03, plus smoke cards drawn into the centre (the vortex debris code at 2 Hz), plus the `suck`
  sound when Nobu enters `r + 2`.
- **Rollback:** none needed; it has no state.

#### 3.2 Drain outflow: `k.outflow(d, { side = 'left', push = 3.5, period = 3.0, phase = 0, width = 6, len = 3 })`

- **Look:** a big drain pipe mouth in the bank wall (decor `pipe`, ×1.6, rotated to face the river).
- **Behaviour:**
  - It pulses on a cycle: **on** for 45% of `period`, off for the rest.
  - While on, everything in a strip `len` metres long (along `d`) and `width` metres out from the bank
    gets a sideways push away from that bank of `push` m/s, through `pushX`/`pushZ`.
  - It pushes the raft and Nobu on foot alike.
- **Tell:** 0.8 s before each pulse, a `gurgle` sound (new synth: low noise burst with a falling filter)
  and a dribble of foam at the mouth. While on, a jet of foam particles.
- **Rollback:** the phase comes from the stage clock; no reset needed.

#### 3.3 Smog slick: `k.slick(d0, d1, { x = 0, w = 4 })`

- **Look:** a purple-grey sheen on the water: `waterMaterial` with colour `0x4a3a5a` at alpha 0.75, 3 cm
  above the water.
- **Behaviour:**
  - While the raft is inside it, set `player.ride.slick = 0.25`, refreshed each frame and decaying after
    you leave. The raft drifts: steering takes about 4× longer to bite.
  - On foot it does nothing; slicks only sit on raft spans.
- **Tell:** a slow purple shimmer and a faint `sizzle` loop when within 8 m.

#### 3.4 Drift log: `k.driftLog(d, { x = 0, range = 3, speed = 1.4, w = 2.6, phase = 0 })`

- **Look:** `logMesh` from `props.js`, floating at water y, sweeping side to side across the river.
- **Behaviour:**
  - A `Hazard` subclass (`ride.js`): touching it while riding means `hurt('splash')`. A mask or god mode
    smashes it (the existing `Hazard.smash`).
  - On foot it is a moving platform: it gets a solid at its top, like `MovingPlatform`. Foot landings
    don't use it yet; Ride 4 doesn't need it.
  - Hop over it, or time the gap behind it.
- **Rollback:** `Hazard.onRespawn` already restores it.

#### 3.5 Static log on the water: the existing `k.log(d, { h, w, x })`

- It is a ground bump. On a raft, ramming it is the **stall**: the bump-up and `speedK = 0.4`. It isn't a
  death.
- It adds its own ticket line (2 raw).

#### 3.6 Barrels: `k.coconuts(d, { ..., mesh: 'barrel', reward: false })`

- **New options on `CoconutRoller`:**
  - `mesh: 'barrel'`: a procedural barrel (toon `0x7a4a24` cylinder, r 0.5, h 0.9, with two dark bands)
    that rolls on its side.
  - `reward: false`:
    - Barrels **give no Tickets.**
    - They **skip the `coconutSpawned` cap**. Otherwise they would stop spawning once the per-clear
      coconut cap was used up (`props.js:650`).
    - Touching one is `hurt('splash')` while riding and `hurt('flat')` on foot. No pickup.
- **Lanes, speed and `every`** work as they do now. Barrels roll toward Nobu (against the current).

#### 3.7 Float pack: `k.floatPack(x, d, n)`

- `k.pack(x, y, d, n)` at water y, plus a `LilyPad`-texture disc (r 0.9) under it that bobs ±4 cm. The
  disc is cosmetic; the pack stands on the raft floor.
- Ramming it on the raft breaks it, because the ride counts as a slide.
- The disc hides when the pack breaks and comes back on restore.

#### 3.8 Enemies used

| Enemy | Where | Note |
| --- | --- | --- |
| Broccoli (plain, trooper) | docks | trooper `range: 0` guards the far Lock dock |
| Squirrel | barge A | jumps between barges |
| Cone Drone (`hover`) | the mill wheel, Ride 3 | `hover: 2.6` puts it above the raft's head; it is a dodge, not a ram |
| Lid Knight | lock dock | needs a slide or a flop, as everywhere |
| Shellback | Ride 2, Detour 1 | Riding into it flips it (the ride counts as a slide; check `Shellback.onSlide`, `enemies.js:877`). Flipped, it is a springboard: hop onto it for a ticket ring. |
| Pill Bot | Detour 2 | a market-platform teaser |

---

### 4. Track, walls and theme

#### 4.1 Turtle

The start is `[0, 0, 10]`, the same convention as `level1.js`: content starts at `d = -8`. Each move is
`[len, turnDeg, climb]`. The river keeps going downhill; chutes and falls are the steep moves.

```js
const track = makeTrack(stage, turtle([0, 0, 10], [
  [30, 0, 0],        //   0– 30  Drain Mouth dock
  [30, 12, -0.4],    //  30– 60  Ride 1
  [30, -16, -0.4],   //  60– 90
  [25, 10, 0],       //  90–115  end of Ride 1, Lock dock
  [25, -8, 0.6],     // 115–140  the lock (climbs: the lock lifts you)
  [25, 18, 0],       // 140–165
  [30, -22, -0.5],   // 165–195  Ride 2: Whirlpool Bend
  [25, 26, 0],       // 195–220
  [8, 0, -3.2],      // 220–228  rapids chute 1
  [20, -10, 0],      // 228–248
  [25, 14, 0],       // 248–273  Barge Yard
  [25, -12, 0],      // 273–298
  [30, 16, -0.6],    // 298–328  Ride 3: Slick Rapids
  [6, 0, -3.5],      // 328–334  falls 1
  [24, -18, 0],      // 334–358
  [6, 0, -3.5],      // 358–364  falls 2
  [20, 12, 0],       // 364–384
  [25, -6, 0.4],     // 384–409  Floodgate Crates (box gauntlet 2)
  [20, 20, -1.0],    // 409–429  tower, zipline
  [8, 0, -2.6],      // 429–437  rapids chute 2
  [25, -14, 0],      // 437–462  Intake Channel, goal at 452
  [20, 0, 0],        // 462–482  runoff
]));
const END = 470;     // backstop; goal gate at 452, reachGoal trigger at 455
```

#### 4.2 Walls

Keyframes are `[d, left, right, h]`, all 3.0 m tall.

```js
k.walls([
  [-8, 4.6, 4.6, 3.0],
  [216, 4.6, 4.6, 3.0], [219, 3.2, 3.2, 3.0], [230, 3.2, 3.2, 3.0], [234, 4.6, 4.6, 3.0],   // chute 1 narrows
  [248, 5.2, 5.2, 3.0], [300, 5.2, 5.2, 3.0],                                              // wider Barge Yard (Crate Drift: open water)
  [304, 4.6, 4.6, 3.0],
  [426, 4.6, 4.6, 3.0], [430, 3.2, 3.2, 3.0], [455, 3.2, 3.2, 3.0],                        // narrow intake
  [END + 2, 3.2, 3.2, 3.0],
]);
k.backstop(-8);
k.backstop(END);
```

#### 4.3 Theme `'river'` (new entry in `THEMES`, `src/world/stage.js`)

```js
river: {
  sky: 'bg_level6',                         // placeholder → bg_level1 (see section 11)
  fog: 0x8fa89a, fogNear: 38, fogFar: 110,  // smoggy green-grey
  hemiSky: 0xd0e4d8, hemiGround: 0x4a5a3a,
  sun: 0xf0e8c8, sunI: 1.35, hemiI: 1.15,
  ground: 'tex_l1_ground', wall: 'tex_l1_wall', platform: 'tex_l3_platform',  // muddy banks, factory docks
  tint: { ground: 0x9a9a7a },               // mud tint on the jungle texture
},
```

- **Ambient particles:** `stage.js` picks particles by `themeKey` (line ~300). Add `'river'`: slow
  grey-purple smog motes (the dust-mote code, colour `0x9a8aa8`, size ×1.4, drifting downstream at
  0.4 m/s).
- **Water colour:** `0x5a8a7a` everywhere, through `k.raft` and `k.water`.

#### 4.4 Difficulty tier

- `LEVEL_TIER[6] = 4.5`. The `TIER` rows have no 4.5 entry, so `difficulty.js` gets a helper:

  ```js
  export function tierValue(key, tier) {          // tier 1..5, fractional allowed
    const row = TIER[key], i = Math.min(row.length - 1, Math.max(0, tier - 1));
    const a = Math.floor(i), b = Math.min(row.length - 1, a + 1), t = i - a;
    return row[a] + (row[b] - row[a]) * t;
  }
  ```

  For tier 4.5 this gives `enemySpeed 1.28`, `hazardPeriod 0.825`, `crumbleDelay 0.425`,
  `snacksGap 97.5`.
- `difficulty.test.js` adds a case: every row value for tier 4.5 lies strictly between the tier-4 and
  tier-5 values.

---

### 5. The level, section by section

- **Coordinates:** `(x, y, d)`. `x` is lateral, + is right. `y` is relative to the path. On raft spans the
  water is at `y = -1.0`, so things on the water use `y = -1`.
- **Ticket lines:** `tix(...)` counts are raw pickups. Whole Tickets are about raw ÷ 3
  (`NOBU_TICKET_SCALE`).
- **Section names:** each section starts with `k.section(d0, d1, name)`, for the next-goal hint.

#### S0: Drain Mouth (foot, −8 → 26) — "you're on a dock, here's a basket"

```js
k.section(-8, 26, 'Drain Mouth');
k.floor(-8, 26, { style: 'ground' });
k.sign(-3.0, 0, 3, ['RAFT', '◀ ▶ STEER'], { rot: -0.3 });
k.sign(3.0, 0, 3, ['HOP', 'SPACE'], { rot: 0.3 });
k.tix(0, 0, 2, 0, 0, 8, 4);
k.pack(-2.6, 0, 6); k.pack(2.6, 0, 6);
k.stack(0, 0, 10, 2);
k.dog(-3.3, 0, 14, 'shiba');                  // dog 1
k.broc(0, 0, 17, { range: 2 });
// teach two box patterns over the dock (a miss lands on the floor: safe)
k.blinkBox(2.6, 0, 20.5, { on: 1.2, off: 1.0 });
k.blinkBox(2.6, 1.0, 22.8, { on: 1.2, off: 1.0, phase: 1.1 });
k.tixRing(2.6, 2.6, 24.2, 0.8, 6);                 // the ring rewards timing both blinks
k.bounceChain([[-2.4, 0, 20], [-2.4, 1.2, 22.4]]);
k.tix(-2.4, 3.4, 21, -2.4, 3.6, 23.5, 3);          // the bounce arc collects these
k.tut(18, 'raft');
k.tut(19.5, 'blinkbox');
// the drain pipe the smog pours out of: decor pipe ×2.2 in the left bank at d 0, smog emitter
```

- **Beat:** a safe start. One enemy and one dog. Two box patterns (blink and bounce) are taught with
  tickets as the only reward; a miss lands on the dock. The moored basket sits at d 27.2, below the dock
  edge.
- **Tutorial `raft`** (copy in 10.3). It fires at the dock edge.

#### S1: Ride 1, Gutter Run (raft, 26 → 108) — teach steer and hop

```js
k.section(26, 108, 'Gutter Run');
k.floor(24, 26, { y: [0, -1] });              // short ramp down to the water
k.raft(26, 108, { speed: 10.5, steer: 6.0, hop: 1.0 });
k.tix(0, -1, 30, 0, -1, 40, 5);
k.floatPack(-2.4, 44); k.floatPack(2.4, 51);  // ram them (spaced: see 5.2)
k.log(56, { h: 0.6, w: 4.4, x: -2.3 });       // half-river log: steer right (ramming it = stall)
k.tixArc(2.4, -1, 54, 2.4, 60, 1.6, 4);
k.floatPack(0, 66, 3);                        // 3-ticket pack on a float
k.driftLog(74, { range: 3.0, speed: 1.2, w: 2.6 });   // first moving hazard: hop it or pass behind
k.tixArc(0, -1, 72, 0, 77, 2.0, 4);           // rewards the hop
k.dog(3.2, -1, 82, 'pug');                    // dog 2 on a buoy: ram to free
k.sphere(-2.6, -1, 91);
k.snacks(0, -1, 95);                          // floating checkpoint
k.pitySnacks(0, -1, 60);
k.outflow(96, { side: 'left', push: 3.0, period: 3.2 });  // gentle first outflow
k.tix(2.6, -1, 94, 2.6, -1, 102, 4);          // tickets in the lane the outflow pushes you into
k.floatPack(-2.4, 103); k.floatPack(0, 106.5);
k.floor(108, 110, { y: [-1, 0] });            // beach ramp up to the Lock dock
```

- **Beat:**
  - Teach: an open river.
  - Test: a half log you steer around, and floating packs you ram.
  - Twist: a moving drift log.
  - The first outflow only pushes toward tickets. It teaches that pushes happen, with no penalty.
- **Tutorials:** `outflow` at d 90.
- **Target deaths:** 0–1.

#### S2: The Lock (foot, 108 → 160) — teach `k.rising` safely

```js
k.section(108, 160, 'The Lock');
k.floor(110, 118, { style: 'platform', depth: 1.2 });          // dock
k.knight(0, 0, 114, { range: 1.2 });
k.tut(117, 'lock');
// lock basin: floor 3 m down; the water rises when you drop in
k.floor(118, 146, { y: -3, w: 9.2, style: 'platform' });
k.rising(118, 146, { y0: -3.4, y1: 0.2, rate: 0.35, trigger: 'enter' });
k.packs([[0, 120], [1.6, 121.5], [-1.6, 121.5]], -3);       // grab them before the water does
k.tix(0, -3, 123, 0, -3, 127, 3);
k.lunch(-2.8, -3, 124);                                      // stair: -3 → -2 → -1 → rim (0)
k.lunch(-1.4, -2, 126.5);
k.lunch(0, -1, 129);
k.floor(130, 146, { x: 3.2, w: 2.4, y: 0, style: 'platform' });  // right rim ledge
k.mystery(3.2, 0, 133, { slot: 1 });
k.dog(3.2, 0, 140, 'dalmatian');                             // dog 3
k.boneSwitch(3.2, 0, 144, [[0, 0, 147, 3, 2.4], [0, 0, 149.4, 3, 2.4]]);  // bridge over the gate gap
k.floor(151, 160, { style: 'platform', depth: 1.2 });        // far dock
k.snacks(0, 0, 152);
k.zipped(-2.6, 0, 155, 3);
k.slideBox(1.6, 0.8, 154.5, { axis: 'x', range: 1.2, speed: 1.4 });   // teach the slide box over the dock
k.tix(1.6, 2.2, 153.5, 1.6, 2.2, 155.5, 2);
k.trooper(1.2, 0, 157.5);
k.floor(158, 160, { y: [0, -1] });                           // ramp down to Ride 2
```

- **Beat:**
  - Teach: the water rises slowly (3.6 m over about 10 s).
  - Test: grab three packs from the floor while it rises.
  - Twist: climb out by floating lunchbox steps.
  - The bridge is optional: a double jump from the rim also crosses the 5 m gap.
- **Rollback:** `k.rising` resets to `y0` on a respawn before 118 (new-levels-spec behaviour).
- **Box teach:** the slide box on the far dock. A miss lands on the dock.
- **Rising rate:** 0.35 m/s. It is the level's teach for rising water, so it stays slow.
- **Target deaths:** 1.

#### S3: Ride 2, Whirlpool Bend (raft, 160 → 246) — whirlpools, outflows, chute 1

```js
k.section(160, 246, 'Whirlpool Bend');
k.raft(160, 246, { speed: 11, steer: 6.0, hop: 1.0, boost: [[220, 228, 1.3]] });
k.tut(163, 'whirlpool');
k.whirlpool(-2.0, 170, { r: 3.0, pull: 3.2 });     // teach: left half only
k.tix(2.6, -1, 166, 2.6, -1, 174, 4);
k.driftLog(178, { range: 2.6, speed: 1.4, w: 2.4 });
k.floatPack(2.6, 182); k.floatPack(2.6, 184.5);
k.pitySnacks(0, -1, 186);
// twist: an outflow on the right pushes you LEFT, into whirlpool 2
k.outflow(190, { side: 'right', push: 4.0, period: 2.6 });
k.whirlpool(-2.2, 194, { r: 3.2, pull: 3.6 });
k.tixArc(2.4, -1, 188, 2.4, 196, 1.2, 4);
k.dog(2.8, -1, 200, 'corgi');                      // dog 4
k.snacks(0, -1, 204);
k.shellback(0, -1, 210, { range: 2.4 });           // ride into it: it flips
k.tixRing(0, 2.6, 211, 1.0, 8);                    // hop off the flipped shell to reach it
// chute 1 (turtle move 9: 3.2 m down over 8 m), boost 1.3 → ~14 m/s, walls narrow to 3.2
k.tix(0, -1, 220, 0, -1, 228, 5);
k.whirlpool(0, 236, { r: 2.6, pull: 4.0 });        // dead centre after the chute: commit to a side
k.floatPack(-3.0, 236); k.floatPack(2.8, 245);     // left pack beside the whirlpool, right pack after it (5.2)
k.floor(246, 248, { y: [-1, 0] });
```

- **Beat:**
  - Teach: one whirlpool, half-river, with a safe side.
  - Test: a log and packs.
  - Twist: an outflow shoves you toward a whirlpool. Time it, or steer hard right while it is off.
  - Combine: the chute's speed boost, then a centred whirlpool straight after it.
- **Target deaths:** 1–2.

#### S4: Barge Yard (foot, 248 → 304) — teach the fall box, then Gauntlet 1: Crate Drift

```js
k.section(248, 304, 'Barge Yard');
k.floor(248, 252, { style: 'platform', depth: 1.2 });       // dock
k.snacks(0, 0, 250);
// Detour 1 entry: a downpipe in the left bank at d 249 (section 6.1)
k.water(252, 300, { w: 10.4, y: -1.2, color: 0x5a8a7a });   // falling in here = splash
k.platform(0, 0, 255, 7, 6);                                // barge A (static, safe)
k.packs([[-2.6, 253], [0, 257]]);
k.dog(2.8, 0, 256, 'shiba');                                // dog 5
// teach the fall box over barge A's deck (it drops onto the deck: safe)
k.fallBox(-2.4, 1.0, 255.5, { delay: 0.45 });
k.tix(-2.4, 2.4, 254.8, -2.4, 2.4, 256.2, 2);
k.tut(254, 'fallbox');

// ---- GAUNTLET 1: CRATE DRIFT (258 → 271). Open water; no barge, no other route. ----
k.section(258, 271, 'Crate Drift');
k.pitySnacks(0, 0, 257.6);                                   // pity spot at the gauntlet start
k.fallBox(0, 0, 260.0, { delay: 0.45 });                     // keep moving: three falling crates
k.fallBox(-1.2, 0.4, 262.3, { delay: 0.45 });
k.fallBox(0, 0.8, 264.6, { delay: 0.45 });
k.slideBox(0, 0.8, 266.9, { axis: 'x', range: 1.6, speed: 1.5 });              // wait for it
k.slideBox(0, 0.8, 269.2, { axis: 'x', range: 1.6, speed: 1.5, phase: Math.PI }); // opposite phase
k.tix(0, 1.6, 260, 0, 2.4, 268, 5);
// mill wheel: paddles rotate across the river; ride a paddle up to the crane deck
k.spinDrum(273, { x: 0, y: 0.5, r: 3.0, n: 4, period: 7, w: 2.6, dd: 2.0 });
k.drone(0, 0, 272, { range: 2.4, hover: 2.6 });
k.platform(0, 3.6, 280, 3.2, 4);                            // crane deck
k.mystery(1.0, 3.6, 281, { slot: 2 });
k.pack(-1.0, 3.6, 281);
k.zipline(0, 5.0, 282, 0, 1.6, 293, { speed: 9 });          // crane down to the gangway
k.floor(290, 300, { w: 3.6, y: 1.2, style: 'platform', depth: 1.2 });   // gangway on the last barge
k.coconuts(300, { until: 290, every: 2.0, speed: 5.5, lanes: [-1.0, 1.0], mesh: 'barrel', reward: false });
k.pack(-1.4, 1.2, 297); k.pack(1.4, 1.2, 297);
k.floor(300, 304, { y: [1.2, -1] });                        // slide down onto Ride 3
```

- **Beat:**
  - Barge A is safe ground: two packs, a dog and the fall-box teach.
  - **Crate Drift:**
    - Three fall boxes, each dropping 0.45 s after you land on it, so you must keep hopping.
    - Then two slide boxes in opposite phase that you must wait for.
    - Then the mill wheel paddle (timing again) up to the crane deck.
    - Barge B from the earlier draft is **removed**, so there is no other route.
  - The crane zipline, and a barrel gangway to finish.
- **Box sizes and gaps:** box sizes come from box-gauntlets-spec. With 1 m boxes, the gaps between
  centres are 2.3 m (1.3 m air) and rise 0.4 m per step. Every gap is a single jump; double jump is a
  recovery, never required.
- **Target deaths:** 2–3.

#### S5: Ride 3, Slick Rapids (raft, 304 → 382) — slicks, two falls, the Good Boy Route

```js
k.section(304, 382, 'Slick Rapids');
k.raft(304, 382, { speed: 11.5, steer: 6.0, hop: 1.0, falls: [[329, 333], [359, 363]] });
k.tut(306, 'slick');
k.slick(308, 318, { x: -1.6, w: 4.4 });             // teach: left half
k.tix(2.6, -1, 308, 2.6, -1, 318, 5);
// Good Boy Route: no deaths so far, and golden paw steps rise on the right into a raised aqueduct
k.goodBoy(300, [[3.0, -0.4, 309, 2.4, 2.4], [3.0, 0.4, 311.4, 2.4, 2.4], [3.0, 1.2, 313.8, 2.4, 2.4], [3.0, 2.0, 320, 2.4, 10]]);
k.oneUp(3.0, 2.0, 322);
k.tix(3.0, 2.0, 316, 3.0, 2.0, 325, 6);
k.pack(3.0, 2.0, 318.5, 5);                         // jackpot pack (Good Boy items: see 7.2)
k.pitySnacks(-2.0, -1, 322);
k.sign(-3.4, -1, 312, ['FALLS', 'AHEAD!'], { rot: 0.2 });
k.tut(315, 'falls');
// falls 1: no floor 329–333; the river drops ~2.3 m across the gap. Keep your speed!
k.tixArc(0, -1, 327, 0, 335, 2.2, 5);
k.snacks(0, -1, 338);
k.coconuts(356, { until: 340, every: 1.8, speed: 5, lanes: [-2.4, 0, 2.4], mesh: 'barrel', reward: false });
k.floatPack(0, 346);                                // centre lane, between barrel lanes' gaps (barrels roll past; it is static)
k.tixArc(0, -1, 347, 0, 351, 1.8, 4);
k.drone(-2.0, -1, 352, { range: 2.0, hover: 2.6 });
k.slick(350, 356, { x: 2.3, w: 4.6 });              // twist: a slick right before falls 2 (right half)
// falls 2: no floor 359–363; a whirlpool waits on the landing
k.whirlpool(1.8, 368, { r: 2.6, pull: 3.6 });
k.floatPack(-2.8, 371); k.sphere(0, -1, 376); k.floatPack(2.8, 380);   // left → centre → right (5.2)
k.floor(382, 384, { y: [-1, 0] });
```

- **Beat:**
  - Teach: a slick on one half, with tickets in the clean lane.
  - Test: falls 1, cleared on momentum.
  - Twist: barrels against the current.
  - Combine: a slick into falls 2 into a whirlpool. Hit the slick and you drift into the whirlpool on
    the landing. Stay left.
  - **Harder than the first draft:** falls 2 sits only 5 m after the slick (350–356 → lip at 359).
- **Falls physics check:**
  - At full speed (11.5 m/s) the 4 m gap takes 0.35 s, and the raft drops ~2.2 m under gravity 36. It
    lands on the lower floor.
  - Stalled (`speedK` 0.4, ~4.6 m/s), the gap takes 0.87 s and the raft drops ~13.6 m: it falls short
    into the gap (pit death).
  - That is the intended punishment for ramming the log or barrel just before a fall. The barrels in this
    ride end at d 340, well clear of falls 2's lip.
- **Target deaths:** 2–3.

#### S6: Floodgate Crates and Ride 4 (foot + raft, 384 → 455) — the final exam

```js
k.section(384, 426, 'Floodgate Crates');
k.floor(384, 392, { style: 'platform', depth: 1.2 });
k.snacks(0, 0, 386);
// Detour 2 entry: the pump-house door in the right bank at d 388 (section 6.2)
// teach the arrow chain over the dock (a miss lands on the dock: safe)
k.arrowChain([[-2.4, 0, 388.5], [-2.4, 2.2, 390.6]], { power: 16 });   // left side: the pump-house door is on the right
k.tixRing(-2.4, 4.8, 391.2, 0.8, 6);
k.tut(387.5, 'arrowchain');

// ---- GAUNTLET 2: FLOODGATE CRATES (392 → 416). Open water to the tower; the last landing before the goal. ----
k.pitySnacks(0, 0, 391.6);                                   // pity spot at the gauntlet start
k.water(392, 416, { w: 9.2, y: -1.2 });
// 1) blink boxes in two alternating groups: jump on the beat
k.blinkBox(-1.2, 0, 393.5, { on: 1.2, off: 1.0, group: 'a' });
k.blinkBox(1.2, 0, 395.8, { on: 1.2, off: 1.0, phase: 1.1, group: 'b' });
k.blinkBox(-1.2, 0, 398.1, { on: 1.2, off: 1.0, group: 'a' });
k.blinkBox(1.2, 0, 400.4, { on: 1.2, off: 1.0, phase: 1.1, group: 'b' });
// 2) fall boxes climbing: don't stop
k.fallBox(0, 0.4, 402.7, { delay: 0.45 });
k.fallBox(0, 0.8, 405.0, { delay: 0.45 });
k.fallBox(0, 1.2, 407.3, { delay: 0.45 });
k.drone(0, 1.2, 405.5, { range: 1.8, hover: 3.0 });         // a timing check in the air
// 3) a fast slide box, then 4) the arrow chain up to the tower
k.slideBox(0, 1.2, 409.6, { axis: 'x', range: 1.8, speed: 1.8 });
k.arrowChain([[0, 1.2, 411.9], [0, 2.4, 414.0]], { power: 16 });
k.tix(0, 1.4, 393, 0, 2.2, 411, 7);
k.platform(0, 2, 416.5, 3, 3);                                // tower top (solid)
k.pack(-1.0, 2, 416.5); k.pack(1.0, 2, 416.5);
k.zipline(0, 4.8, 417, 0, 0.2, 427, { speed: 10 });           // drop straight onto the last raft

k.section(426, 455, 'Intake Channel');
k.raft(426, 455, { speed: 12, steer: 6.0, hop: 1.0, boost: [[429, 437, 1.3]] });
k.tix(0, -1, 429, 0, -1, 437, 5);                             // chute 2
k.outflow(441, { side: 'left', push: 4.2, period: 2.2 });
k.driftLog(444, { range: 2.0, speed: 1.8, w: 2.2 });
k.outflow(447, { side: 'right', push: 4.2, period: 2.2, phase: 1.1 });
k.tix(-1.6, -1, 440, 1.6, -1, 450, 5);
k.whirlpool(-1.2, 451, { r: 2.0, pull: 3.4 });
k.gate(452, 'PIPELINE', 0xd23cff);
k.trigger(455, () => game.session.reachGoal());
```

- **Beat:**
  - Foot: **Floodgate Crates**, the last landing before the goal, is a pure timing gauntlet over open
    water:
    - blink groups on an alternating beat
    - a climbing fall-box run with a drone overhead
    - a fast slide box
    - an arrow chain up to the tower
  - The four patterns were all taught earlier over safe ground: blink and bounce at the Drain Mouth, the
    slide box at the Lock, the fall box on barge A, and the arrow chain on the Floodgate dock.
  - **There is no route around:** water from 392 to 416, wall to wall. The earlier draft's rug-pull
    pontoons and outflows are removed; the gauntlet is timing only.
  - Then a zipline drops Nobu onto the moving raft. The `RaftController` mounts
    him on landing, because the zipline ends 1.2 m above the raft floor inside the span.
  - Ride 4 runs down a chute into a 6.4 m-wide channel. Alternating outflows, a log and a final
    whirlpool sit right at the gate.
- **This is the hardest section.** The gauntlet combines all four box patterns at once. Ride 4 reuses
  every water hazard inside a narrow channel at the highest speed.
- **Ride 4 has no countable breakables.** Its tickets are the only pickups, so Golden Bone players don't
  steer and dodge at the same time at 12–15.6 m/s.
- **Target deaths:** 3–4 (gauntlet 2–3, Ride 4 1).

#### 5.1 Checkpoint spacing

Snacks at **95, 152, 204, 250, 338, 386** (plus the start). The gaps are 95, 57, 52, 46, 88, 48, and 69 to
the goal: all within `snacksGap` 97.5 for tier 4.5.

Pity spots: 60, 186, **257.6 (Crate Drift start)**, 322, **391.6 (Floodgate Crates start)**. Pity
Snacks are **not countable** (rewards spec).

#### 5.2 Raft breakable feasibility

**Why:** on a raft Nobu can't bite; he can only **ram**. The hit overlap is ±0.83 m, so two items at the
same `d` more than 1.67 m apart can't both be hit. Steering is at most `steer` m/s sideways while the raft
moves at `speed` m/s forward.

**Rule** (between consecutive countable items, sorted by `d`; dogs count too, because the Golden Bone
needs them):

```
minGap(dx) = max(0, |dx| − 1.67) / steer × speed + 1     (metres along d)
```

- Use the **highest** speed in the stretch between the two items: a chute boost if it overlaps.
- **No countable item inside a slick**, and none in the 6 m after a slick, because steering is reduced
  there.
- When an outflow pushes **away** from the next item, add `push × (len / speed)` to its |dx|.

`steer` is 6.0 everywhere. Speeds are Ride 1 10.5, Ride 2 11 (14.3 in the chute), Ride 3 11.5. Ride 4
has no countable items.

| Ride | From → to (x, d) | dx | Speed | minGap | Actual gap | OK |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | entry (any x) → floatPack (−2.4, 44) | — | 10.5 | — | 18 from mount | ✓ |
| 1 | floatPack (−2.4, 44) → floatPack (2.4, 51) | 4.8 | 10.5 | 6.48 | 7.0 | ✓ |
| 1 | floatPack (2.4, 51) → floatPack (0, 66) | 2.4 | 10.5 | 2.28 | 15.0 | ✓ (the half log at 56 is on the left; you are already right) |
| 1 | floatPack (0, 66) → dog (3.2, 82) | 3.2 | 10.5 | 3.68 | 16.0 | ✓ |
| 1 | dog (3.2, 82) → sphere (−2.6, 91) | 5.8 | 10.5 | 8.23 | 9.0 | ✓ |
| 1 | sphere (−2.6, 91) → Snacks (0, 95) | 2.6 | 10.5 | 2.63 | 4.0 | ✓ |
| 1 | Snacks (0, 95) → floatPack (−2.4, 103) | 2.4 (+1.0 outflow at 96 pushes right) = 3.4 | 10.5 | 4.03 | 8.0 | ✓ |
| 1 | floatPack (−2.4, 103) → floatPack (0, 106.5) | 2.4 | 10.5 | 2.28 | 3.5 | ✓ |
| 2 | entry → floatPack (2.6, 182) | — | 11 | — | 22 from mount | ✓ |
| 2 | floatPack (2.6, 182) → floatPack (2.6, 184.5) | 0 | 11 | 1.00 | 2.5 | ✓ |
| 2 | floatPack (2.6, 184.5) → dog (2.8, 200) | 0.2 | 11 | 1.00 | 15.5 | ✓ (the outflow at 190 pushes left; you steer back right after it) |
| 2 | dog (2.8, 200) → Snacks (0, 204) | 2.8 | 11 | 3.07 | 4.0 | ✓ |
| 2 | Snacks (0, 204) → floatPack (−3.0, 236) | 3.0 | 14.3 (chute) | 4.17 | 32.0 | ✓ |
| 2 | floatPack (−3.0, 236) → floatPack (2.8, 245) | 5.8 | 11 | 8.57 | 9.0 | ✓ (pass behind the whirlpool: its pull ends by d 238.6) |
| 3 | entry → Snacks (0, 338) | — | 11.5 | — | after falls 1 | ✓ (no items in the slick at 308–318) |
| 3 | Snacks (0, 338) → floatPack (0, 346) | 0 | 11.5 | 1.00 | 8.0 | ✓ (barrel lanes at ±2.4 and 0: the pack is static; dodge, then ram) |
| 3 | floatPack (0, 346) → floatPack (−2.8, 371) | 2.8 | 11.5 | 3.17 | 25.0 | ✓ (falls 2 at 359–363 is between; the slick at 350–356 is on the right half; stay left) |
| 3 | floatPack (−2.8, 371) → sphere (0, 376) | 2.8 | 11.5 | 3.17 | 5.0 | ✓ (the whirlpool at (1.8, 368) is behind you by 370.6) |
| 3 | sphere (0, 376) → floatPack (2.8, 380) | 2.8 | 11.5 | 3.17 | 4.0 | ✓ |

- The Good Boy aqueduct pack at (3.0, 2.0, 318.5) is **not countable** (7.2), so it is not in the table.
- **Every item is also within the river's reach.** The raft's centre can get to |x| ≤ 4.6 − 0.8 = 3.8,
  and the widest item is at |x| = 3.2.
- **`tests/raft.test.js`** gets a `feasibility(items, spans)` case built from this table. Every row must
  pass, and moving any item by the audit's worst case (dx +0.5 m) must still pass, or the test names the
  pair.

---

### 6. Detours

Each detour is a **side loop** that returns Nobu next to its own entry (`exitD = entryD + 2`).

**Why:** the river only goes one way. A detour that rejoined further downstream would skip main-path
backpacks, and the Golden Bone needs every backpack **in one run**. A loop keeps both routes collectable.

Both detours are built **above** the river (`y: +10`), not below it. Content under a water zone would be
inside the water death plane (`killYAt`).

**Possible conflict, flagged for the new-levels-spec owner:** if `k.detour` in that spec assumes
downstream exits, the "one run" Golden Bone rule needs the same loop treatment there.

#### 6.1 Detour 1: The Rain Gutter (entry d 249, exit d 251, y +10)

```js
k.detour(249, 251, { y: 10, entry: 'pipe', build: (kd) => {
  // a covered warehouse gutter running alongside the Barge Yard, d 249–289 at y +10
  kd.section(249, 289, 'Rain Gutter');
  kd.floor(249, 289, { x: -1.5, w: 3.0, y: 0, style: 'platform', depth: 0.6 });
  kd.dark(249, 289, { radius: 4 });
  kd.shellback(-1.5, 0, 256, { range: 1.0 });
  kd.packs([[-1.5, 253], [-1.5, 260]]);
  kd.tix(-1.5, 0, 251, -1.5, 0, 259, 4);
  // gaps in the gutter: fall through and you drop back into the Barge Yard (a soft fail, not a death,
  // unless you land in the river)
  kd.crumble(-1.5, 0, 264, { w: 2.4, d: 2.2 });
  kd.crumble(-1.5, 0, 267.5, { w: 2.4, d: 2.2 });
  kd.stack(-1.5, 0, 272, 2);
  kd.dog(-1.0, 0, 276, 'pug');                       // dog 6
  kd.shellback(-1.5, 0, 280, { range: 0 });          // flip it, bounce up to the ledge
  kd.platform(-1.5, 3.0, 284, 2.4, 2.4);
  kd.colorBone(-1.5, 3.0, 284.5, 'purple');          // the purple bone
  kd.pack(-0.4, 3.0, 284, 5);
  // end: a drain hopper at d 288 drops Nobu down the downpipe → exit d 251 on the dock
}});
```

- The entry downpipe is a decor `pipe` ×1.4, standing, with a glowing ring at its base. Walk into it.
- The return puts Nobu on the dock at d 251, facing downstream.
- **Contents:** 5 backpacks (one holds 5 Tickets), dog 6, the purple bone, 4 raw Tickets.

#### 6.2 Detour 2: The Pump House (entry d 388, exit d 390, y +10)

```js
k.detour(388, 390, { y: 10, entry: 'pipe', build: (kd) => {
  // the pipeline's first pump house: a market-platform teaser
  kd.section(388, 420, 'Pump House');
  kd.floor(388, 396, { y: 0, style: 'platform' });
  kd.mystery(-2.0, 0, 392, { slot: 3 });
  kd.tut(394, 'market');                              // reuses the L5 tutorial id (same copy)
  kd.market(-1.2, 0, 399, { amp: 1.6, group: 'a' });
  kd.market(1.2, 0, 402, { amp: 1.6, group: 'a', invert: true });
  kd.market(-1.2, 0, 405, { amp: 1.6, group: 'a' });
  kd.floor(407, 420, { y: 0, style: 'platform' });
  kd.pill(0, 0, 410, { range: 1.6 });
  kd.packs([[-2.4, 409], [2.4, 409], [0, 413]]);
  kd.dog(2.4, 0, 415, 'dalmatian');                   // dog 7
  kd.dustWall(0, 0, 417.5, { w: 3, h: 2.6 });         // Dust Dash (from the Roomba Titan: earned before L6)
  kd.hiddenBone(0, 0, 419);                           // the Hidden Bone (rewards-spec helper; placeholder: golden_bone sprite)
  kd.tixArc(-1.2, 0, 398, 1.2, 406, 1.8, 6);
  // end: a lift at d 420 takes Nobu back down → exit d 390
}});
```

- The entry is a pump-house door in the right bank (a decor `vat` with a dark doorway). Walk into it.
- **Contents:** 1 Mystery Backpack, 3 backpacks, dog 7, the Hidden Bone (behind the Dust Wall), 6 raw
  Tickets.
- The market platforms use a **slow** clock (period ×1.4 of the L5 default), because this is the teaser.

---

### 7. Secrets and the Bone Board

#### 7.1 The six bones

| Bone | Condition here |
| --- | --- |
| Golden | All countable breakables (about 49, section 8) and all 7 dogs, in one run. Needs no move later than Dust Dash. Every raft item passes the 5.2 feasibility check. |
| Good Boy | Reach the goal with 3 deaths or fewer |
| Hidden | Behind the Dust Wall in the Pump House |
| Snack bronze / silver / gold | 40 / 60 / 80% of the level's raw Ticket pickups in one run |

#### 7.2 Other secrets

- **Good Boy Route** (S5, trigger d 300, zero deaths so far): the golden aqueduct, with a 1UP, 6 raw
  Tickets and a 5-Ticket pack.
  - Good Boy Route items are **not countable** for the Golden Bone. They can't be reached after a death.
  - Match how L1 and L3 already treat Good Boy items. Check `GoodBoyRoute` in `secrets.js`; if its items
    count today, mark these with `countable = false` at build.
- **Purple bone** (Detour 1): opens a **purple path in Level 3, the Cone Factory**.
  - The path is three ghost steps above the vat pit, beside the Bone Switch bridge, at **original L3
    coordinates**:

    ```js
    k.colorPath('purple', [[-3.4, 1.6, 190.5, 1.6, 1.8], [-3.4, 3.2, 194, 1.6, 1.8], [-3.0, 4.8, 198, 2.4, 3.2]], { jackpot: 15 });
    ```

  - It leads to a high catwalk over the vats with a 15-Ticket jackpot (same jackpot size as the red and
    blue paths).
  - In layout-2 coordinates, add the offset that `extended-levels-spec.md` applies to the L3 block
    between its two splices. The vat pit sits between them.
  - The `colorBones` save field already takes any colour key.
- **Moon Ledge** (post-game, Moon Jump): `k.moonLedge(-3.6, 4.6, 255, { w: 2.4, dd: 2.4 })` above barge A.
  It holds a 10-raw-Ticket ring, inside the cap. It holds no bone: the Hidden Bone is already Dust-Dash
  gated.
- **Zoomie Gate:** `k.zoomieGate(-3.4, 0, 14.5, { plateD: 11, open: 2.5 })` at the Drain Mouth. It opens a
  shortcut ramp onto the river at d 30 and skips 4 m of dock. It is a trial line, not a reward.
- **Smog Vent** (Mega Bark): `k.smogVent(3.6, 0, 386.5, { lift: 6 })` at the Floodgate dock. It lifts to a
  ledge with a 1UP. The 1UP is not countable.

---

### 8. Tally

| | Main path | Detour 1 | Detour 2 | Total |
| --- | --- | --- | --- | --- |
| Countable breakables (packs, float packs, zipped, sphere, Snacks, mystery) | ~40 | 5 | 4 | **~49** |
| Dogs | 5 (shiba, pug, dalmatian, corgi, shiba) | 1 (pug) | 1 (dalmatian) | **7** |
| Raw Ticket pickups (lines, arcs, rings, `k.log` lines, pack contents) | ~150 | ~9 | ~6 | **~165 raw ≈ 55 whole** |
| Checkpoints | 6 Snacks + 5 pity spots (2 at gauntlet starts) | — | — | |
| Box gauntlets | Crate Drift (258–271), Floodgate Crates (392–416) | — | — | **2** |
| Length to the goal | 455 m | +40 m | +32 m | |

- **Ticket cap:** measure the real max with the method in `rewards-spec.md` once the level is built. The
  first-pass cap is **60 whole Tickets per clear**, excluding the Good Boy jackpot, which is counted
  separately as in L1 and L3. The owner signs off on it (plan 3.10).
- **Barrels give nothing** (`reward: false`), so they never touch `COCONUT_CAP_PER_CLEAR`.

---

### 9. Time trial

- **Route:** the start to the goal trigger (d 455). Freeze Packs replace every plain Backpack
  automatically (`session.js:182`).
- **Speed limits:**
  - Raft spans are auto-scrolled at their set speed: about 275 m at 10.5–12 m/s, ~14 m/s in chutes.
    That is roughly 24 s however good the player is.
  - Foot spans: about 180 m at sprint speed (Zoomies ~12.4 m/s), about 15 s at best.
  - A dev-best estimate is about 54 s.
- **Targets (first pass):**

  | Platinum | Gold | Silver | Bronze |
  | --- | --- | --- | --- |
  | 56 s | 62 s | 78 s | 102 s |

  Add to `TRIAL_TARGETS` as `6: [62, 78, 102, 56]` (platinum is index 3, plan 4.5).
- **Proposed hub floor:** `"6": 30000` ms. The raft spans alone take over 22 s, so 30 s is a safe
  implausibility floor.
- **Local only until the hub change:**
  - `TRIAL_LEVELS` stays without `6`, so scores are never queued.
  - The hub PR adds `"6"` to `NOBU_FLOOR_MS` next to `"4"` and `"5"`.
- **Gear:** trials are gear-free as always. The air dash is already off on the raft (2.4).

---

### 10. Registry, story and copy

#### 10.1 Registry entry (plan 10.1, `src/levels/registry.js`)

```js
6: {
  id: 6, name: 'Smog Rapids', build: buildLevel6, theme: 'river', tier: 4.5,
  goal: true,                       // ends at a goal gate (reachGoal) but is a MAIN level, not bonus
  unlock: (s) => isBeaten(s, 4),    // the Roomba Titan
  mapPos: { x: 86, y: 38 },         // between the L4 and L5 pins; match new-levels-spec's map layout
  trial: { targets: [62, 78, 102, 56], board: false },   // board: true once the hub has variant "6"
  music: 'level6',
},
// and in the Level 5 entry:  unlock: (s) => isBeaten(s, 6)
```

- **Session change:**
  - `reachGoal()` currently ends in `g.bonusCleared(this)` (`session.js:334`).
  - For `def.goal && !def.bonus`, call a new `g.goalLevelCleared(this)` instead.
  - It records `beaten[6]`, the Bone Board, the dog bests and the trial result, like a boss clear without
    the boss. Then it runs the tally (rewards spec) and returns to the map.
  - The missed-backpack rain runs first, as it does now.
- **Trial end:** for goal levels the trial ends at `reachGoal`, not `reachBossGate`.

#### 10.2 Story (`src/story/script.js`)

```js
// LEVEL_INTRO
6: [
  ['mask', 'The Titan\'s dust bag burst and ALL that smog went down the drain. Straight into the river.'],
  ['mask', 'And the river runs right down to the Pump & Dump Pipeline. Convenient. Suspiciously convenient.'],
  ['mask', 'Hop in the Owner\'s laundry basket. Steer with LEFT / RIGHT, hop with SPACE. Mind the whirlpools!'],
],
// BETWEEN, after the Titan (shown on the map when L6 unlocks)
['mask', 'The smog\'s heading downstream, Nobu. We follow the river. Smog Rapids is open!'],
// After clearing L6 (goal cutscene, two lines, then the map opens L5)
['mask', 'That pipe at the end... it\'s PUMPING the smog in. Someone is buying it up by the barrel.'],
['mask', 'The Pump & Dump Pipeline is open. Whoever runs that place is about to get rugged.'],
```

#### 10.3 Tutorials (`TUTORIALS`, with placeholder icons from `art/procedural.js`)

| id | Icon (placeholder) | Title | Text |
| --- | --- | --- | --- |
| `raft` | `icon_ride` | LAUNDRY RAFT | `◀ ▶` steer, `SPACE` hops. The river carries you. Ram floating backpacks and buoy dogs! |
| `outflow` | `icon_ride` | DRAIN PIPES | Pipes gurgle, then BLAST. They shove you sideways. Listen for the gurgle. |
| `lock` | `icon_boneswitch` | THE LOCK | The lock fills up when you drop in! Grab the backpacks, then climb before the water does. |
| `whirlpool` | `icon_ride` | WHIRLPOOLS | Foam rings pull you in. Steer away hard, or hop across the edge. Don't touch the middle! |
| `slick` | `icon_ride` | SMOG SLICK | Purple water is slippery. The raft drifts and won't steer. Line up BEFORE you hit it. |
| `falls` | `icon_ride` | WATERFALL! | Keep your speed! Bonk a log right before the falls and you won't make the jump. |
| `blinkbox` | box-gauntlets-spec icon | BLINK BOXES | Boxes that blink in and out. Jump when they're solid. Watch the rhythm first! |
| `fallbox` | box-gauntlets-spec icon | FALLING CRATES | They drop a moment after you land. Don't stop! |
| `arrowchain` | `icon_arrowbox` | ARROW CHAIN | Land on an arrow box and it launches you to the next one. Steer the landing! |

The `blinkbox`, `fallbox` and `arrowchain` ids (and the slide and bounce teaches, which have no popup
here) must match box-gauntlets-spec. If that spec defines the tutorial ids, use its ids and copy
instead.

New procedural icons (`icon_raft`, `icon_whirl`) can replace `icon_ride` later; they are cheap to draw in
`procedural.js`.

#### 10.4 Music (`src/audio/songs.js`): `level6`

- **`bpm: 136`, D minor, a surf-rock / sea-shanty bounce.**
  - Lead: a twangy square lead with slide-ups.
  - Bass: a walking bass on the off-beat.
  - Drums: tom fills every 8 bars.
- **Two layers:** while riding, the full drum kit (kick on 1 and 3, snare on 2 and 4, 8th hats). On foot,
  the drums drop to kick and shaker. `RaftController` toggles the layer with the existing music
  rate/volume calls, or a 2-pattern song if `songs.js` supports sections; otherwise use one pattern and
  skip the layer.
- In the Rain Gutter and Pump House (dark and inside), the lead is muffled: a lowpass on the music bus,
  if available, otherwise unchanged.

---

### 11. Placeholders

New ids go in `src/art/placeholders.js` (plan 9.1). The real asset can replace each later without code
changes.

| New id | Used for | Placeholder | Transform / notes |
| --- | --- | --- | --- |
| `model_raft_basket` | the raft | procedural `raftBasketMesh()` in `ride.js` | toon `0x5aa0e0` open box 1.6 × 0.5 × 1.4 m with a rim and slats; two sock tufts (spheres) for fun. Alternative: `LilyPad` mesh ×1.3 if the basket reads badly |
| `model_barrel` | barrels | procedural cylinder | toon `0x7a4a24`, two dark bands, r 0.5, h 0.9 |
| `bg_level6` | sky | `bg_level1` | the fog tint does the smog |
| `tex_l6_ground` / `tex_l6_wall` | banks | `tex_l1_ground` / `tex_l1_wall` | mud tint `0x9a9a7a` |
| `tex_l6_platform` | docks, barges, crates' fallback | `tex_l3_platform` | |
| whirlpool foam, outflow pipe, smog slick, drift log, float disc, mill wheel, crane | props | procedural / `logMesh` / decor `pipe` / `LilyPad` texture / spinDrum visuals tinted wood `0x8a5a32` | |
| `story_ch2_river` | intro card | `story_rescue_2` | |
| death cards `death_splash`, `death_whirl` | death screen | `death_angel` | via the `DEATH_ART` fallback |
| `hidden_bone` sprite | Hidden Bone | `golden_bone` | tinted blue (rewards spec) |

**Decor recipe:**

```js
k.banks(-6, END, (x, y, d) => {
  const r = Math.random();
  if (r < 0.30) k.tuft(x, y, d, rand(1.2, 1.8));                  // reeds
  else if (r < 0.50) k.rock(x, y, d, rand(0.6, 1.2), 0x6a6a5a, { moss: true });
  else if (r < 0.65) k.bush(x, y, d, rand(0.9, 1.3));
  else if (r < 0.78) k.fencePost(x, y, d);                         // pier posts
  else if (r < 0.88) k.pipe(x, y, d);                              // drain pipes in the bank
  else k.coneStack(x, y, d);                                       // washed-up cones (smog litter)
}, { every: 4.2 });
k.edges(-4, END, (x, y, d) => k.tuft(x, y, d, rand(0.8, 1.1)), { every: 2.6 });
for (let d = 20; d < END; d += 40) k.bgDog(pick([-1, 1]) * rand(5.8, 6.6), 2.6, d + rand(-4, 4), { height: 1.1 });
```

- Check that these decor helpers are on the kit (`decor.js` exports `tuft`, `rock`, `fencePost`, `pipe`,
  `coneStack`). Add any that aren't.
- The Barge Yard gets extra decor: moored barge hulls (`stage.block`, non-solid, tinted), crates, and a
  crane silhouette.

---

### 12. Implementation file list

| File | Change |
| --- | --- |
| `src/levels/level6.js` (new) | `buildLevel6(game, stage, tickets)`: everything in sections 4–7. It returns `{ spawn: k.W(0, 0, 1), facing: track.yaw(1), camera: { mode: 'track', track, height: 4.3, dist: 8.6, ahead: 5.5 }, fov: 60 }` and no `ride`: the RaftController mounts. |
| `src/levels/kit.js` | `k.raft`, `k.whirlpool`, `k.outflow`, `k.slick`, `k.driftLog`, `k.floatPack`; `mesh` / `reward` passthrough on `k.coconuts` |
| `src/entities/river.js` (new) | `RaftController`, `Whirlpool`, `Outflow`, `Slick` |
| `src/entities/ride.js` | `raftBasketMesh()`; `DriftLog extends Hazard` |
| `src/entities/props.js` | `CoconutRoller` options `mesh: 'barrel'`, `reward: false` (skip the cap, no pickups, a death on touch) |
| `src/player/player.js` | `setRide` mesh choice and per-ride `steer`, `hop`, `airJumps`, `boost`, `slick`; raft wake, sway and `paddle` sound; air dash off while riding |
| `src/game/session.js` | Respawn mount state from `stage.raftSpans`; `reachGoal` routes main goal levels to `goalLevelCleared`; trial end at the goal for goal levels; DDA raft hooks |
| `src/game/game.js` | `goalLevelCleared(session)`; L6 on the map (through the registry) |
| `src/levels/registry.js` | The L6 entry; the L5 unlock changes to `isBeaten(s, 6)` |
| `src/world/stage.js` | `THEMES.river`; river smog motes |
| `src/config/difficulty.js` | `LEVEL_TIER[6] = 4.5`; `tierValue()` |
| `src/config/trials.js` | `TRIAL_TARGETS[6]`; **not** in `TRIAL_LEVELS` until the hub is ready |
| `src/story/script.js` | `LEVEL_INTRO[6]`, BETWEEN lines, goal lines, tutorials, death captions `splash` and `whirl` |
| `src/audio/audio.js`, `songs.js` | Sounds `splash`, `gurgle`, `paddle`, `sizzle`; song `level6` |
| `src/art/placeholders.js` | The section 11 ids |
| `src/levels/level3.js` | The purple path (section 7.2), applied in layout-2 coordinates |
| (dependency) box-gauntlets-spec helpers | `k.blinkBox`, `k.bounceChain`, `k.fallBox`, `k.slideBox`, `k.arrowChain` must be merged before L6 |
| `tests/raft.test.js` (new) | Pure helpers: `raftSpanAt(spans, s)`, `boostAt(span, s)`, mount decisions for respawn `s` values (inside, at `d0`, at `d1`, in a falls gap), the stalled-versus-full-speed falls clearance maths, and the 5.2 `feasibility` table |
| `tests/difficulty.test.js` | The tier 4.5 interpolation case |
| `tests/registry.test.js` | The unlock chain 3 → 4 → 6 → 5; L6 `goal: true`, `bonus: false` |
| `tests/level-budget.test.js` | L6 max Tickets ≤ cap; barrels count 0 |

---

### 13. Playtest checklist

Run `npm run dev`, use the dev unlock in `dev.js` to open L6, and play each section 3 times as a fresh
player.

| Section | Check | Target first-play deaths |
| --- | --- | --- |
| S0 Drain Mouth | The basket is visible from the start; stepping off the dock mounts it (no double-mount, no snap); the tutorial fires once; the blink and bounce teaches read on first sight and a miss is harmless | 0 |
| S1 Gutter Run | Steering feels heavier than the vacuum but responsive; ramming the half log stalls without killing; the drift log's hop arc lands; the first outflow pushes visibly but harmlessly | 0–1 |
| S2 The Lock | Water starts rising only after dropping in; all three packs are reachable before it covers the floor; the stairs are readable; a respawn resets the water; the slide-box teach is reachable | 1 |
| S3 Whirlpool Bend | Foam rings read at speed; the pull is escapable at full steer; the outflow → whirlpool combo is fair if you time the gurgle; the chute boost feels exciting, not blind; the centre whirlpool after the chute has a clear side | 1–2 |
| S4 Barge Yard + Crate Drift | The fall-box teach on barge A is safe; **Crate Drift has no way around** (try to swim, glide or air dash past: all fail); each gap is one jump; fall-box timing allows one hesitation, not two; the slide boxes' wait is readable; the mill wheel paddle carries Nobu to the crane deck; the pity spot sits at the gauntlet start; the zipline lands on the gangway; barrels can be hopped; Detour 1's entry and exit work, and a fall from the gutter lands in the yard | 2–3 |
| S5 Slick Rapids | Slicks drift but the clean lane is obvious; falls 1 clears at full speed and fails when stalled (test both); barrels stop before falls 2; the slick → falls 2 → whirlpool combo is avoidable by staying left; the Good Boy aqueduct reveals only with 0 deaths and returns to the river cleanly | 2–3 |
| S6 Floodgate Crates + Intake | The arrow-chain teach on the dock is safe; **the gauntlet has no way around**; the blink groups alternate cleanly; the drone over the fall boxes is dodgeable mid-jump; the slide box and arrow chain land on the tower; the pity spot sits at the gauntlet start; the zipline mounts the raft on landing; the intake channel is hard but readable; the goal triggers while riding (rain, then tally) | 3–4 |
| Raft feasibility | Ram every raft item in 5.2 in one run at full speed, without stalling; repeat with Nobu riding the far side before each pair | — |
| Detour 2 Pump House | Market platforms readable at the slow clock; the Dust Wall needs Dust Dash and nothing else; the Hidden Bone records; the exit returns to d 390 | 0–1 |
| Whole level | Total first-play deaths **11–15** (between L4's 10–14 and L5's 12–18); DDA steps fire at 5, 7 and 9 deaths per checkpoint; the trial ends at the goal; time within targets for a dev run | 11–15 |

---

# Part 7: Extended levels spec (draft, still being written)

Source: `docs/expansion/extended-levels-spec.md`

## Extended levels spec: Levels 1–3, Roomba Rush and Glowworm Grotto

Status: **spec, ready for implementation.** No game code has changed. Written 2026-11-04 against
`main` at `bfb4a33`.

- Parent plan: [`../gameplay-expansion-plan.md`](../gameplay-expansion-plan.md), section 6.3 (with 3.6,
  4.3, 4.4 and 10.2).
- The kit helpers used here (`k.section`, `k.chase`, `k.zipline`, `k.detour`, and the rest) are
  specified in [`new-levels-spec.md`](new-levels-spec.md). This file only calls them.
- Reward rules (Bone Board, Mystery Backpacks, Ticket caps, DDA) are in
  [`rewards-spec.md`](rewards-spec.md).
- The box-gauntlet helpers (`k.blinkBox`, `k.bounceChain`, `k.fallBox`, `k.slideBox`, `k.arrowChain`)
  are specified in [`box-gauntlets-spec.md`](box-gauntlets-spec.md). This file only calls them.
- **Section 7A, the Golden Bone feasibility audit,** fixes existing content that can't be 100%'d
  today (L2 and Roomba Rush) and checks every new section and detour.

**The owner raised the targets after plan 6.3 was written** ("extend all the levels more"). This spec
uses the new targets, which replace the plan's numbers:

- Every stage keeps the sections already named in plan 6.3 and gains **one more main-path section**.
- Each main level gets a **second detour**. Each bonus stage gets one detour, Glowworm Grotto included.
- Dogs: L1 5 → 9, L2 3 → 7, L3 5 → 9, and each bonus stage 2 → 4.
- Trial targets and proposed hub floors are scaled by length (section 0).
- **The last new section of each extended main level ends in a box gauntlet:** timing only, with no
  alternative route. L1's stays gentle (tier 1).

All numbers are first passes, to be tuned in playtests (plan 4.6). Every track number in sections 1–6
was checked by building the old and new splines with the real `turtle()` and `Track` from
`src/world/track.js` in Node (section 1.1).

---

### 0. Final numbers

"Path" is the distance from the spawn to the boss-gate or goal trigger, the stretch a time trial covers.

| Stage | Path now → extended | END now → extended | Added | Main-path sections added | Detours | Dogs | Countable breakables (approx.) | Snacks + pity spots |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 Bark Jungle | 314 → **539 m** | 322 → 547 | +225 | Canopy Walk 75, Coconut Run 55, **Sunken Temple 95** | The Burrow, **Waterfall Hollow** | 5 → **9** | 48 → ~86 | 2 → 6 + 4 pity |
| L2 Scratchpost Canyon | 300 → **519 m** | D(316)=346 → 565 | +219 | Switchbacks 60, Cardboard Fort 14, **Scratchpost Forest 90**, Yarn Avalanche 55 | Cat Flap Alley, **Dry Riverbed** | 3 → **7** | 27 → ~62 | 2 → 12 + 3 pity (chase checkpoints, 7A) |
| L3 Cone Factory | 244 → **419 m** | 252 → 427 | +175 | **Sorting Belts 70**, Packaging Line 55, Vat Overflow 50 | Maintenance Ducts, **Overhead Rails** | 5 → **9** | 23 → ~55 | 3 → 6 + 3 pity |
| Roomba Rush | 301 → **459 m** | 312 → 470 | +158 | Living Room / Kitchen Split 50, **Toy Box Ramps 40**, Kitchen Tile Slide 40, Dog-Door Leap 28 | **Sofa Summit** | 2 → **4** | 17 → ~36 | 1 → 2 + 1 pity |
| Glowworm Grotto | 241 → **370 m** | 252 → 380 | +128 | Underground River 45, **Mushroom Bounce Cavern 43**, Crystal Echo 40 | **Lumi's Nest Hollow** | 2 → **4** | 17 → ~34 | 1 → 3 + 1 pity |

Section names in **bold** are new in this spec. The others come from plan 6.3.

**Trial numbers.** Only L1–L3 have time trials. Each target is the current target × the path ratio,
rounded.

| Level | Path ratio | Gold / Silver / Bronze (s), layout 2 | Platinum (s) | Hub floor (ms), layout 2 |
| --- | --- | --- | --- | --- |
| L1 | 539 / 314 = 1.717 | 94 / 120 / 158 | 86 | 25 700 |
| L2 | 519 / 300 = 1.730 | 90 / 114 / 156 | 82 | 26 000 |
| L3 | 419 / 244 = 1.717 | 77 / 100 / 134 | 70 | 20 600 |

- Platinum = gold × 0.91, the same ratio as the plan's first pass.
- Floor = the current floor × the ratio, rounded to 100 ms.
- Every floor is well under the fastest possible run (path ÷ `TUNING.SLIDE_SPEED` 12.5 m/s): L1 43.1 s,
  L2 41.5 s, L3 33.5 s.
- These numbers replace the plan 6.3 targets (76 / 72 / 64 s gold).

---

### 1. How a level is extended

#### 1.1 What the spline does when moves are added (measured)

- `turtle(start, moves)` (`src/world/track.js:11`) turns each move `[len, turnDeg, climb]` into
  `n = max(1, round(len / 6))` equal sub-steps. Each sub-step adds one control point.
- `Track` fits a **centripetal Catmull-Rom** curve through those points (`track.js:28`). It samples the
  curve at equal arc length every 0.5 m (`getSpacedPoints`).
- **Appending moves at the end:** a Catmull-Rom segment depends on the points on either side of it.
  Appending changes only the old **last segment**, which is the final sub-step (≤ 6 m) before the old
  end. Everything earlier keeps its shape.
  - Arc length is re-sampled over the whole curve. Three.js uses 200 arc-length divisions by default,
    so earlier `d` values can drift by a few centimetres. That is too little to matter.
- **Inserting moves in the middle** (what this spec does):
  - Geometry before the insertion point is unchanged.
  - Geometry after it keeps its exact shape relative to the track, but moves `X` metres further along
    `d` and is turned by the inserted moves' net turn.
  - Content is authored in track coordinates, so it follows automatically **once its `d` is shifted
    by `X`**.
- **Splitting a move** to insert in the middle of it: split proportionally, keeping turn and climb per
  metre. Example: `[30, 26, 0]` split at 12.5 m becomes `[12.5, 10.83, 0]` and `[17.5, 15.17, 0]`. The
  sub-step count changes, which moves that move's control points by a few centimetres. Re-check content
  placed on a split curved move. Splits of straight moves are exact.
- **Inserted moves have net turn 0 and net climb 0** wherever possible, so the rest of the level keeps
  its compass heading and the background lines up.
- **Measured results** (`scratchpad` script, to become `tests/track-layout.test.js`, section 10):

  | Stage | Old spline length | New length | Arc added | Turtle length added | Closest pass between parts of the track ≥ 60 m apart |
  | --- | --- | --- | --- | --- | --- |
  | L1 | 328.49 | 553.77 | 225.28 | 225 | 55.3 m (unchanged) |
  | L2 | 344.07 | 563.28 | 219.21 | 219 | 57.9 m |
  | L3 | 292.23 | 467.23 | 175.00 | 175 | 55.6 m (unchanged) |
  | Roomba Rush | 340.02 | 498.03 | 158.01 | 158 | 59.6 m (unchanged) |
  | Glowworm Grotto | 270.08 | 398.15 | 128.07 | 128 | 59.5 m |

  - The arc added differs from the turtle length by at most 0.28 m. Shifting content by the turtle
    length is accurate enough.
  - No extended track comes closer than 55 m to another part of itself, so `Track.project` (40-sample
    hint search, then a full scan past 20 m) can't snap to the wrong part of the level.

#### 1.2 The shift helper: `src/levels/layouts.js` (new, pure, no imports)

```js
// Layout data for every stage that has been extended. Pure data and pure functions only, so tests can
// import it without Three.js or the DOM.
export const LAYOUT_VERSION = 2;

// splices: [[oldD, X], ...] in increasing oldD. Content authored at an old d >= oldD moves X metres later.
export const SPLICES = {
  1:    [[249, 75], [287, 55], [308, 95]],
  2:    [[169.5, 74], [230, 90], [267, 55]],      // L2 numbers are in authored D-space (before O = 30)
  3:    [[98, 70], [136, 55], [206, 50]],
  ride: [[130, 50], [205, 40], [289, 68]],
  cave: [[135, 45], [182, 43], [231, 40]],
};

export function shifter(splices) {
  return (d) => { let out = d; for (const [at, x] of splices) if (d >= at) out += x; return out; };
}
export const totalAdded = (id) => SPLICES[id].reduce((a, [, x]) => a + x, 0);
```

**How the level files use it:**

- **L1, L3, Roomba Rush and Glowworm Grotto** add `const S = shifter(SPLICES[1]);` (with that stage's
  id) and wrap the `d` argument of **every existing call whose d is at or past the first splice** in
  `S()`.
  - Example: `k.pack(2.2, 0, 252)` becomes `k.pack(2.2, 0, S(252))`.
  - Calls before the first splice are untouched, which keeps the diff small.
- **L2** changes its existing `D` instead, so **no L2 content line changes** except the straddlers in
  1.3:

  ```js
  const O = 30;
  const SH = shifter(SPLICES[2]);
  const D = (d) => SH(d) + O;
  ```

- **New sections are authored in final coordinates** from a named base constant: `const CW = 249;`,
  then `k.pack(0, 0, CW + 12)`. Never wrap new content in `S()`.
- **Decor loops** (`k.banks`, `k.edges`, `k.grass`, the `bgDog` loops) already iterate over final track
  distance and receive final `d`. **Never wrap decor in `S()`.** Only make sure their range ends at the
  new `END`.
- **`END`** becomes `END_OLD + totalAdded(id)`, written out as a number with a comment, for example
  `const END = 547; // 322 + 225 (layout 2)`. `k.walls([... [END + 2, ...]])`, `k.backstop(END)` and the
  decor ranges follow automatically.
- **Wall keyframes** past a splice are wrapped too: `[S(171), 4.3, 4.3, H]`. Keys are sorted by
  `track.wall()` (`track.js:131`), so order in the array doesn't matter.

#### 1.3 Straddlers: the only lines that need hand edits

A **straddler** is a call with two distances on opposite sides of a splice. Examples: a floor, a ticket
line or arc, a coconut lane, a Bone Switch platform list, a Good Boy list or a wall pair. Wrapping both
ends would stretch it across the new section. Each straddler is split or rewritten by hand, and is
listed per stage below (sections 2.2, 3.2, 4.2, 5.2, 6.2). The test in section 10 greps for `S(` in
two-distance calls and fails on any straddler that isn't on these lists.

#### 1.4 Turtle edits

Each stage's move list is moved into `layouts.js` as `MOVES[id]` (the old list) and `MOVES_V2[id]`, so
the track test can build both. The level file calls `turtle(START[id], MOVES_V2[id])`. Old lists stay
for the test and for Classic replays (section 8.6).

#### 1.5 Detours

- Called with `k.detour(entryD, exitD, { y, entry, build })` (owner: `new-levels-spec.md`). `build(kd)`
  receives a kit for the detour's own frame. Every `d` passed in is final.
- **Placement rules** (they come from how the camera and the kill plane work):
  - **Raised detours** (`y` ≥ 8) are like the Treat Tray: the camera can see them and nothing hides
    them. This is the preferred kind.
  - **Sunken detours** must be **open to the sky**, in a trench beside the main path. The `track`
    camera sits 4.3–4.9 m above Nobu and would end up inside ground geometry under a roofed tunnel.
  - Over a sunken detour, any main-path floor uses `depth: 1.5` or is moved sideways. Floors default to
    `depth: 7` (`kit.js` `floor`), which would fill the trench.
  - The kill plane is `heightAt(s) - 12` (`stage.js:82`), or `water y - 0.5` where a water zone exists.
    A sunken detour floor at −4.5 to −6 is safe. Mud or water zones in a trench must be **below −5**,
    so they never kill on the main path (`waterAt` applies across the whole track width at that `s`).
- **Falling out of a raised detour** works like falling out of the Treat Tray round
  (`session._leaveBonusRound(false)`): Nobu goes back to the entry and things taken in the detour
  are rolled back. No life is lost.
- **Chases** (the L2 chase; Coconut Run has no detour): detours are **loops**:
  - an entry Snacks
  - a route whose exit returns within 2 m of the entry
  - a **chase-reset Snacks** at the exit (3.3)

  The cat is never held. It keeps running, and the reset puts it behind Nobu again (7A.4).
- **Downstream exits** (the detour comes back further along the main path) are allowed **on foot
  only**, if the skipped main-path stretch can be walked back to from the exit: no one-way drops,
  crumble-only bridges or rising hazards in between. Otherwise use a loop, or put no countables on the
  skipped stretch. Roomba Rush detours are loops (the ride can't go back). Section 7A.4 has a row per
  detour.
- **Every dog and every countable breakable must be reachable without a later move**, because they count
  toward the Golden Bone (plan 3.6). A detour's entrance is always open with the moves a player has on
  their first visit.

#### 1.6 Move-gated objects

- Behind a Dust Wall, Moon Ledge, Zoomie Gate or Smog Vent there is only:
  - the **Hidden Bone** (one per stage), or
  - **non-countable** extras: a 1UP or tickets with `countable = false`.

  This is how `BarkRock` already spawns its prizes (`secrets.js:65`, `u.countable = false`).
- **Never a dog, a backpack or a Mystery Backpack.**
- Ticket extras behind gates count toward the level's maximum in the Ticket budget (rewards-spec), even
  though most players won't get them on the first run.

#### 1.7 Checkpoints, pity spots and ticket density

- **Snacks** at least every `TIER.snacksGap` metres: 70 for tier 1, 80 for tier 2, 90 for tier 3 (plan
  4.1). A Snacks is always on solid ground, away from the hazard.
- **Pity spots:** `k.pitySnacks(x, y, d)` (plan 4.3: active after 7 deaths at one checkpoint). There
  is one in each new section longer than 45 m, at its hardest beat.
- **Ticket density:** new sections keep each stage's current density of field ticket pickups. These
  counts were made from the level files (`k.tix`, `tixArc` and `tixRing` counts; backpack payloads,
  zipped and jackpots not included):

  | Stage | Field pickups now | Per metre of END | New-section target |
  | --- | --- | --- | --- |
  | L1 | ~97 | 0.30 | 0.30 / m |
  | L2 | ~80 (+10 from logs) | 0.26 | 0.26 / m |
  | L3 | ~49 | 0.19 | 0.19 / m |
  | Roomba Rush | ~55 | 0.18 | 0.18 / m |
  | Glowworm Grotto | ~39 | 0.15 | 0.15 / m |

- **The per-level Ticket cap (method).** The rewards-spec owns the budget test. For extended levels:
  1. Measure the layout-1 maximum: whole Tickets for a perfect clear, after `NOBU_TICKET_SCALE`, with
     `COCONUT_CAP_PER_CLEAR` and the Bark Rock, jackpot and zipped payloads included.
  2. **Layout-2 cap = layout-1 max × the path ratio in section 0, rounded up to the next 5.**
  3. Add 3 for each Mystery Backpack slot at its maximum Ticket roll.
  4. The level-budget test must show that the layout-2 level fits this cap.
  5. **The hub owner signs off on the per-level caps** (plan 3.10 and 12.5). Longer clears mean more
     `level_end` chunks per clear (`LEVEL_END_MAX_AMOUNT` 20 per call). Check the hub-side limits
     before release.

---

### 2. Level 1: Bark Jungle (tier 1, path 314 → 539 m)

#### 2.1 Turtle and shift

- **Old moves** (`level1.js:9-12`): 14 moves. Turtle boundaries measured at d 19.98, 44, 66.08, 92.09,
  112.12, 137.15, 157.14, 182.18, 204.24, 229.46, **249.46**, 274.48, 304.49, 328.49.
- **Splices:**
  - **A at 249**, the end of move 11 (`[20, -18, -0.5]`, boundary 249.46). **X = 75**, Canopy Walk.
  - **B at 287**, 12.5 m into move 13 (`[30, 26, 0]`). Split it into `[12.5, 10.83, 0]` and
    `[17.5, 15.17, 0]`. **X = 55**, Coconut Run.
  - **C at 308**, 3.5 m into move 14 (`[24, 0, 0]`, straight). Split it into `[3.5, 0, 0]` and
    `[20.5, 0, 0]`. **X = 95**, Sunken Temple.
- **New move list** (`MOVES_V2[1]`):

  ```js
  [20,0,0],[24,32,0],[22,-8,0.8],[26,-52,0],[20,8,-1.2],[25,42,0],[20,0,0],[25,-28,1.5],[22,22,0],[25,35,3.2],[20,-18,-0.5],
  [25,14,1.0],[25,-8,0.6],[25,-6,-1.6],          // A: Canopy Walk, 75 m, a slow S over a ravine
  [25,-34,0.4],[12.5,10.83,0],
  [27.5,-8,-2.0],[27.5,8,-1.5],                  // B: Coconut Run, 55 m, downhill 3.5 m
  [17.5,15.17,0],[3.5,0,0],
  [20,10,1.2],[25,-16,0.6],[25,18,0],[25,-12,-1.8], // C: Sunken Temple, 95 m
  [20.5,0,0],
  ```

  Measured new boundaries: Canopy Walk 249.42–324.51, Coconut Run 362.01–417.16, Sunken Temple
  438.17–533.31. Spline length 553.77.
- **Shift:** `S(d) = d + (d ≥ 249 ? 75 : 0) + (d ≥ 287 ? 55 : 0) + (d ≥ 308 ? 95 : 0)`.
- **Key positions:**

  | Thing | Line | Old d | New d |
  | --- | --- | --- | --- |
  | `END` | 14 | 322 | **547** |
  | Fork start | 175-179 | 287 | 417 |
  | Gate `k.gate(313, 'MECHA BIRD')` | 186 | 313 | **538** |
  | Gate trigger `k.trigger(315, …)` | 187 | 315 | **540** |
  | Spawn `k.W(0, 0, 1)` | 202 | 1 | 1 (unchanged) |

- **Wall keys** (`level1.js:17-18`): all keys before 249 stay the same. `[END + 2, …]` follows `END`.
  The new sections add their own keys (below).

#### 2.2 Straddlers (hand edits)

| Line | Old | New |
| --- | --- | --- |
| 159 | `k.floor(246, 287);` | `k.floor(246, 252);` (Canopy launch pad) and `k.floor(324, 362);` (the old 249–287, moved 75) |
| 179 | `k.floor(307, END);` | `k.floor(437, 442);` (temple steps landing; old 307 → 437) and `k.floor(533, END);` (old 308–322, moved 225) |
| — | the old floor 246–287's left lane between 249 and 258 | becomes the Burrow trench's ceiling gap (2.6); the Canopy floors there keep `x ≥ -0.5` |

Every other line from 158 to 187 (d 249 to 315) gets a plain `S()` wrap:

- packs 252–255
- arrowBox 249.5 and its tixRing
- lunchboxes 256.5–257.5, zipped 257.5, the corgi dog 257.5
- tut 259.5, lint 263, pill 268, mushroom 274 and its ring, the tix line 266–282
- every fork line from 287 to 305
- gate 313, trigger 315

**Rug note:** the Lint Roller (old 263, new 338) rolls up every rug in the level
(`breakables.js` `LintRoller`). Any rug placed after it would already be gone for a player who broke
it. **New sections after d 338 use Cats (TNT) for risk, not rugs.**

#### 2.3 Section A: Canopy Walk (final d 249–324, 75 m)

- **Beat:** teach ziplines (`k.zipline`). Level 4 tests them later.
  - **Teach:** one low line over solid ground.
  - **Test:** two lines over the ravine.
  - **Twist:** a line that ends over crumbling branches.
  - **Combine:** a zipline drop into a squirrel ambush, then the landing.
- **Target deaths on first play:** 1–2.
- **Tickets:** 22 field pickups (0.30 / m).

```js
// --- Canopy Walk (layout 2, final d 249-324): ziplines over a ravine ---
const CW = 249;
k.section(CW, CW + 75, 'Canopy Walk');
// launch pad: k.floor(246, 252) from the straddler edit
k.tut(CW + 1, 'zipline');                              // new tutorial id, see 11.1
// teach: the first line runs over solid ground, so a fall here costs nothing
k.floor(CW + 3, CW + 17, { x: 1.9, w: 4.8 });          // right lane only: the left lane is the Burrow trench (2.6)
k.platform(1.2, 1.6, CW + 5, 3, 3);                    // tree stump, one jump up
k.zipline(1.2, 3.8, CW + 5.5, 1.2, 2.8, CW + 15, { speed: 7 });
k.tix(1.2, 2.2, CW + 7, 1.2, 1.4, CW + 14, 5);
k.pack(3.2, 0, CW + 9); k.pack(3.2, 0, CW + 11);
k.dog(3.3, 0, CW + 13, 'pug');                         // new dog 6
k.platform(1.2, 1.4, CW + 17.5, 3, 3);                 // edge of the ravine (no floor CW+18 ... CW+58)
// test: two lines over the ravine
k.zipline(1.2, 3.6, CW + 18, -1.0, 3.0, CW + 28, { speed: 8 });
k.tix(1.0, 2.4, CW + 20, -0.8, 2.0, CW + 27, 4);
k.platform(-1.0, 1.8, CW + 30, 3, 3);
k.pack(-2.0, 1.8, CW + 30.5); k.pack(0, 1.8, CW + 30.5);
k.zipline(-1.0, 4.0, CW + 31, 1.0, 3.2, CW + 41, { speed: 8.5 });
k.tixArc(-0.8, 2.6, CW + 32, 0.8, CW + 40, 0.8, 5);
// twist: the third line ends over crumbling branches
k.crumble(1.0, 1.8, CW + 43, { w: 2.6, d: 2.6 });
k.crumble(-0.6, 1.8, CW + 46, { w: 2.4, d: 2.4 });
k.platform(-0.6, 2.2, CW + 49.5, 3, 3);                 // safe branch
k.pitySnacks(-0.6, 2.2, CW + 49.5);                     // the hardest beat
k.mystery(-2.4, 2.2, CW + 50.5, { slot: 'l1-canopy' });
k.zoomieGate(2.6, 0, CW + 62, { plateD: CW + 59, open: 2.2 }); // ground-floor shortcut after the drop (Zoomies, from the Big Cat)
k.moonLedge(2.6, 9.0, CW + 52, { w: 2.4, dd: 2.4 });   // post-game: non-countable 1UP + 10 Tickets (1.6)
// combine: the last line drops to the jungle floor into a squirrel ambush
k.zipline(-0.6, 4.4, CW + 50, 0, 1.6, CW + 58, { speed: 9 });
k.floor(CW + 58, CW + 75);
k.squirrel(0.6, 0, CW + 63);                            // dropped from the leaves (ambush trigger at CW + 59)
k.snacks(-2.6, 0, CW + 60);
k.tix(-2.4, 0, CW + 64, -2.4, 0, CW + 73, 5);
k.packs([[2.4, CW + 68], [-2.4, CW + 70], [0, CW + 72]]);
k.tix(2.6, 0.2, CW + 61, 2.6, 0.2, CW + 64, 3);         // the gate lane's tickets (count toward the gate extra)
// walls: a little wider over the ravine so the lines can swing
k.walls([[CW + 17, 4.3, 4.3, 2.6], [CW + 19, 5.2, 5.2, 2.6], [CW + 57, 5.2, 5.2, 2.6], [CW + 59, 4.3, 4.3, 2.6]]);
// decor: palms on the ravine rims, vines hanging from the lines (procedural decor, no new art)
```

Count: 9 countable breakables (8 backpacks, 1 Mystery) plus 1 Snacks, 1 dog, 2 platforms and 4
ziplines.

#### 2.4 Section B: Coconut Run (final d 362–417, 55 m)

- **Beat:** the first chase toward the camera, gentle (Crash 1 "Boulders"). It sets up the Level 2
  chase.
  - **Teach:** run (the camera turns around).
  - **Test:** a log.
  - **Twist:** a backpack wall you have to bite through.
  - **Combine:** a short gap with the coconut close behind.
- **Target deaths:** 1–3.
- **Tickets:** 16.

```js
// --- Coconut Run (layout 2, final d 362-417): giant coconut chase toward the camera, downhill ---
const CR = 362;
k.section(CR, CR + 55, 'Coconut Run');
k.snacks(-2.6, 0, CR - 2);                    // checkpoint on the old lint stretch, just before the run
k.tut(CR - 1, 'chase');                      // new tutorial id: "RUN! The camera turns around. Hold DOWN."
k.floor(CR, CR + 37);
k.floor(CR + 40.5, CR + 55);                 // 3.5 m gap at CR + 37 ... CR + 40.5: a single jump
k.chase(CR + 1, CR + 52, { model: 'coconut', scale: 5, count: 1, speed: 6.4, catchUp: 9.0, lanes: [-1.6, 1.6] });
k.tix(0, 0, CR + 4, 0, 0, CR + 12, 4);
k.log(CR + 14);                              // a log adds 2 tickets itself (kit.js log)
k.tix(1.6, 0, CR + 17, 1.6, 0, CR + 24, 4);
for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) k.pack(x, 0, CR + 27);   // backpack wall: bite through
k.pitySnacks(2.8, 0, CR + 31);
k.tixArc(0, 0, CR + 36, 0, CR + 42, 2.2, 4);
k.pack(2.8, 0, CR + 47); k.pack(2.8, 1, CR + 47);
// end: the coconut smashes on a rock arch at CR + 52; the camera swings back to 'track' at CR + 54
```

Coconut Run has **no dog** on purpose. The level's 9 dogs are listed in 2.8. The chase budget for its
countables is in 7A.1.

**Chase numbers** (for `k.chase`; semantics from `new-levels-spec.md`, modelled on `ChaseCat`):

| Parameter | Coconut Run | Big Cat (L2, today) | Why |
| --- | --- | --- | --- |
| Speed when close (gap < 5 m) | **6.4 m/s** | 6.7 | Nobu runs at 8.0 (`TUNING.RUN`), so a player who keeps running always escapes |
| Catch-up cap when far | **9.0 m/s** | 10.5 | Gentler rubber band for tier 1 |
| Catch distance | 2.0 m | 2.4 (`gap < 2.4`) | The coconut is round, so a smaller reach |
| Head start | 1.6 s wait, 13 m behind the checkpoint | the same (`session.js:666-668`) | Same respawn rule |
| DDA (plan 4.3) | × 0.92 at 5 deaths in this section | × 0.92 | Applied to both speeds |

- **Camera:** at `CR - 1`, `k.chase` blends the camera to `trackFront` over 1.2 s, while a rumble and
  falling leaves telegraph the coconut. It blends back to `track` at `CR + 54`, on flat ground.
- **Controls:** controls are camera-relative (`camera.js`), so they flip with the camera, as in L2. The
  `chase` tutorial says so.
- The coconut is the `CoconutRoller` mesh at 5× scale (placeholder: plan 9).

#### 2.5 Section C: Sunken Temple (final d 438–533, 95 m), the new main-path section

- **Beat:** the level's **final exam**, still tier 1. It recombines what L1 taught:
  - **Test:** stairs guarded by spiky broccoli.
  - **Twist:** a flooded causeway where flip planks meet lily pads.
  - **Combine:** a zipline over the moat onto crumbling stones, then a Bone Switch altar with a
    Cat (TNT).
  - **Exam:** swinging vine logs plus a coconut lane.
- **Target deaths:** 2–4.
- **Tickets:** 28.

```js
// --- Sunken Temple (layout 2, final d 438-533): old ruins before the Mecha Bird's gate ---
const ST = 438;
k.section(ST, ST + 95, 'Sunken Temple');
// landing: k.floor(437, 442) from the straddler edit
// stairs: test, with spiky guards on the steps
k.floor(ST + 4, ST + 8, { y: [0, 0.8], style: 'platform' });
k.floor(ST + 8, ST + 12, { y: [0.8, 1.6], style: 'platform' });
k.floor(ST + 12, ST + 20, { y: 1.6, style: 'platform' });
k.spiky(-1.2, 0.8, ST + 9, { range: 1.0 });
k.spiky(1.4, 1.6, ST + 14, { range: 1.4 });
k.stack(-2.8, 1.6, ST + 16, 2); k.pack(2.8, 1.6, ST + 17);
k.tix(0, 0, ST + 3, 0, 1.6, ST + 12, 5);
k.snacks(0, 1.6, ST + 19);
// flooded causeway: twist (flip planks on the main line, lily pads on the left to the waterfall)
k.water(ST + 20, ST + 40, { y: -1.0 });
k.floor(ST + 20, ST + 21, { y: 1.6, style: 'platform', depth: 0.6 });
k.flip(0.6, 0.6, ST + 23, { w: 2.8, d: 2.2, period: 3.2 });
k.flip(0.6, 0.6, ST + 26.5, { w: 2.8, d: 2.2, period: 3.2, phase: 1.6 });
k.flip(0.6, 0.6, ST + 30, { w: 2.8, d: 2.2, period: 3.0 });
k.lily(-2.4, 0, ST + 25); k.lily(-3.0, 0, ST + 28.5);   // to the Waterfall Hollow entrance (2.7)
k.flip(0.6, 0.6, ST + 33.5, { w: 2.8, d: 2.2, period: 3.0, phase: 1.5 });
k.floor(ST + 35.5, ST + 40, { w: 3.4, x: 0.6, style: 'platform', depth: 0.6 });
k.tix(0.6, 1.0, ST + 22, 0.6, 1.0, ST + 34, 6);
// roof zipline over the moat onto crumbling stones: combine
k.platform(0.6, 2.4, ST + 40.5, 3, 2.4);
k.zipline(0.6, 4.6, ST + 41, -0.8, 3.2, ST + 50, { speed: 8.5 });
k.water(ST + 41, ST + 55, { y: -1.0 });
k.crumble(-0.8, 1.2, ST + 52, { w: 2.6, d: 2.6 });
k.crumble(0.8, 1.2, ST + 54.5, { w: 2.6, d: 2.6 });
k.tixArc(0.4, 2.8, ST + 42, -0.6, ST + 49, 0.6, 4);
k.pitySnacks(0, 0, ST + 57);
// Bone Switch altar with a Cat (TNT) and backpack stack: risk / reward
k.floor(ST + 56, ST + 76);
k.boneSwitch(-2.8, 0, ST + 59, [[-1.6, 1.4, ST + 62, 2.2, 2.2], [0.6, 2.8, ST + 64.5, 2.2, 2.2], [2.6, 4.2, ST + 67, 2.6, 3]]);
k.dog(2.6, 4.2, ST + 67.5, 'corgi');                     // new dog 8 on the altar
k.zipped(2.0, 4.2, ST + 66.4);
k.cat(1.2, 0, ST + 62);
k.stack(2.6, 0, ST + 62, 2); k.pack(0.2, 0, ST + 63.5);
k.snacks(-2.6, 0, ST + 71);
k.tix(-2.4, 0, ST + 66, -2.4, 0, ST + 75, 4);
// BOX GAUNTLET (the level's last beat; helpers from box-gauntlets-spec.md). Timing only, one route, tier 1 gentle.
// Part 1 over SAFE floor (a miss costs nothing), part 2 over the moat. Long windows: on 1.8 s / off 0.8 s.
k.floor(ST + 76, ST + 82);
k.floor(ST + 82, ST + 86, { y: -1.2, depth: 2 });                  // part 1: a shallow dip under the boxes
k.blinkBox(-1.0, 0, ST + 82.5, { on: 1.8, off: 0.8, phase: 0, group: 'st-a' });
k.blinkBox(1.0, 0, ST + 85, { on: 1.8, off: 0.8, phase: 0.9, group: 'st-a' });
k.water(ST + 86, ST + 92, { y: -1.0 });                          // part 2: the moat (no floor 86 ... 92)
k.blinkBox(0, 0, ST + 87.5, { on: 1.8, off: 0.8, phase: 0, group: 'st-b' });
k.bounceChain([[0, ST + 89.5], [1.2, ST + 91.5]], { y: 0 });     // two bounce boxes to the far bank
k.floor(ST + 92, ST + 95);
k.tixArc(-1, 0.4, ST + 82, 1, ST + 86, 1.2, 3); k.tixArc(0, 0.4, ST + 87, 1.2, ST + 92, 1.8, 3);
k.walls([[ST + 19, 4.3, 4.3, 2.6], [ST + 20, 4.6, 4.6, 3.2], [ST + 55, 4.6, 4.6, 3.2], [ST + 56, 4.3, 4.3, 2.6]]);
```

- `k.hammer` gets a `tint` option for the wooden log look. That is the placeholder; the swing logic is
  shared.
- Count: 13 countable (9 backpacks, 1 zipped, 1 Cat, 2 Snacks) plus 1 dog. Box-gauntlet boxes
  count or not as `box-gauntlets-spec.md` defines.
- The gauntlet replaces the earlier "swinging logs plus coconut lane" draft. It is timing only, with
  no way around.
- **Gentleness:** with tier-1 windows (1.8 s on), part 1 over a 1.2 m dip, and a Snacks 5 m before
  (ST + 71), the target stays at 2–4 deaths.

#### 2.6 Detour 1: The Burrow (from the existing pocket at d 226)

- **Entry:** belly-flop the existing cracked floor at `(-2.5, 0, 226)` (`level1.js:141`). Unchanged.
- **Route:** an **open trench** in the left lane, `x` −4.3 to −0.7, at `y = -4.5`, running from 228
  to 258.
  - Final d: 228–249 are unshifted; 249–258 are new (inside Canopy Walk's ground stretch).
  - It is not a `k.detour` teleport, just track floors.
- **Main path above it:**
  - Old `k.floor(228, 240)` (line 140) becomes `k.floor(228, 240, { x: 1.9, w: 4.8 })`. The coconut
    lanes `[-0.2, 1.3, 2.8]` all stay on it.
  - The canopy floor `CW + 3 … CW + 17` is already right-lane only (2.3).
- **Move one existing line:** `k.cat(-2.6, 0, 236)` (line 152) sits over the new trench. Move it to
  `k.cat(0.4, 0, 236)`. The Rug at 2.5 and the broccoli at 1.6 are unchanged.
- **Falling** from the main path's left edge (or into the left part of the last gap, 239–246) **lands in
  the trench, not death.** That is intended: falling means taking the detour. It doesn't affect the
  Good Boy route.

```js
// --- The Burrow (layout 2): open trench under the coconut hill ---
k.floor(228, 258, { x: -2.5, w: 3.6, y: -4.5, depth: 2 });           // joins the existing pocket floor 224-228
for (let d = 228; d < 258; d += 6) { k.platform(-4.6, -4.5, d + 3, 0.6, 6, 4.5); k.platform(-0.45, -4.5, d + 3, 0.5, 6, 4.5); } // trench walls
k.dark(228, 258, { radius: 5 });                                     // dim, with root decor overhead (decor only, not solid)
k.water(232, 236, { y: -5.8, w: 3.6 });                              // mud pit (below -5, so the main path is safe)
k.lunch(-2.5, -5.0, 233); k.lunch(-2.5, -5.0, 235);                   // steel steps over the mud
k.shellback(-2.5, -4.5, 239, { range: 1.2 });
k.dog(-2.6, -4.5, 244, 'dalmatian');                                 // new dog 7
k.pack(-3.4, -4.5, 246); k.pack(-1.6, -4.5, 246);
k.tix(-2.5, -4.3, 229, -2.5, -4.3, 250, 7);
k.mushroom(-2.5, -4.5, 251, { power: 17 });                          // exit: up to the canopy ground (right lane)
k.dustWall(-2.5, -4.5, 253, { w: 3.6, h: 3 });                       // post-Titan (Dust Dash)
// behind the Dust Wall: the Hidden Bone (Bone Board slot 3, rewards-spec) at (-2.5, -4.5, 255.5)
```

- **Caution:** the trench crosses splice A (249). Its floor and wall loop are **written in final d on
  purpose and not wrapped.** List them as straddler exceptions in the test.
- **Hidden Bone:** behind the Dust Wall, opened after the Roomba Titan.

#### 2.7 Detour 2: Waterfall Hollow (raised, in Sunken Temple)

- **Entry:** `k.detour(ST + 29, ST + 66, { y: 9, entry: 'pipe', build })`. The pipe is a hollow log on
  the last lily pad, at `(-3.0, 0, ST + 28.5)`, behind a waterfall curtain (decor).
- **Exit:** a drop chute onto the altar floor at `ST + 66`, beside the Bone Switch stairs.
- **Beat:** a calm reward room. Its only challenge is two flip planks.

```js
build: (kd) => {
  kd.floor(ST + 29, ST + 66, { x: -1.0, w: 3.2, y: 0, style: 'platform', depth: 0.8 });
  kd.flip(-1.0, 0, ST + 38, { w: 3.0, d: 2.2, period: 3.4 });
  kd.flip(-1.0, 0, ST + 41, { w: 3.0, d: 2.2, period: 3.4, phase: 1.7 });
  kd.dog(-1.6, 0, ST + 47, 'shiba');               // new dog 9
  kd.mystery(-0.2, 0, ST + 50, { slot: 'l1-hollow' });
  kd.oneUp(-1.0, 0, ST + 56);
  kd.tix(-1.0, 0, ST + 31, -1.0, 0, ST + 63, 8);
  kd.smogVent(-1.0, 0, ST + 60, { lift: 6 });      // post-Cone (Mega Bark): lift to a non-countable 15-Ticket jackpot
}
```

#### 2.8 L1 dogs, secrets and tally

| # | Breed | Where | Layout |
| --- | --- | --- | --- |
| 1–5 | shiba, pug, dalmatian, shiba, corgi | existing (d 17, 109, 175.5, 225.2; the corgi moves 257.5 → 332.5) | 1 |
| 6 | pug | Canopy Walk, CW + 13 | 2 |
| 7 | dalmatian | The Burrow, 244 | 2 |
| 8 | corgi | Sunken Temple altar, ST + 67.5 | 2 |
| 9 | shiba | Waterfall Hollow, ST + 47 | 2 |

- **Hidden Bone:** in the Burrow, behind the Dust Wall.
- **Non-countable extras:** the Moon Ledge in Canopy Walk, the Zoomie Gate tickets, and the Smog Vent
  jackpot in Waterfall Hollow.
- **This resolves a conflict in plan 6.3,** which named both a Moon Ledge "post-game Hidden Bone" and
  the Burrow Hidden Bone for L1. There is only one Hidden Bone per level, so the Moon Ledge holds an
  extra.

---

### 3. Level 2: Scratchpost Canyon (tier 2, path 300 → 519 m)

#### 3.1 Turtle and shift

- **Old moves** (`level2.js:9-11`): 11 moves. Track boundaries at 50, 80, 110.03, 140.03, 170.04,
  **200.05**, 230.06, **260.07**, 290.07, 320.07, 344.07. Authored `D = d + 30`.
- **Splices** (authored D-space):
  - **S1 at 169.5** (track 199.5 ≈ the move 6/7 boundary at 200.05). **X = 74:** Switchbacks 60 plus
    Cardboard Fort 14.
  - **S2 at 230** (track 260 = the move 8/9 boundary). **X = 90:** Scratchpost Forest.
  - **S3 at 267** (track 297, 7 m into move 10 `[30, 0, 0]`, straight). Split it into `[7, 0, 0]` and
    `[23, 0, 0]`. **X = 55:** Yarn Avalanche.
- S1 sits 0.55 m before the boundary. Content between them lands on the last 0.55 m of the inserted
  bend. Measured, that is under 2 cm off.
- **New move list:**

  ```js
  [50,0,0],[30,18,0],[30,-22,-1],[30,14,0],[30,-18,0.8],[30,22,0],
  [20,24,1.5],[20,-30,1.5],[20,18,0],[14,-12,0],   // S1: Switchbacks (60) + Cardboard Fort (14); climbs 3 m
  [30,-14,-0.8],[30,10,0],
  [30,16,0],[30,-26,0],[30,10,0],                   // S2: Scratchpost Forest (90)
  [30,-18,0],[7,0,0],
  [27.5,8,1.2],[27.5,-8,1.3],                       // S3: Yarn Avalanche (55); Nobu runs uphill, the yarn rolls down
  [23,0,0],[24,0,0],
  ```

  Measured: Switchbacks and Fort at track 200.06–274.12, Forest 334.21–424.22, Avalanche 461.12–516.29.
  Spline length 563.28.
- **Shift:** `D = (d) => d + 30 + (d ≥ 169.5 ? 74 : 0) + (d ≥ 230 ? 90 : 0) + (d ≥ 267 ? 55 : 0)`.
- **Key positions:**

  | Thing | Line | Old track d | New track d |
  | --- | --- | --- | --- |
  | `END = D(316)` | 16 | 346 | **565** |
  | Gate trigger `k.trigger(D(302), …)` | 91 | 332 | **551** |
  | Spawn `k.W(0, 0, D(2))` | 109 | 32 | 32 |
  | Cat start `new ChaseCat(stage, track, D(-13))` | 104 | 17 | 17 |

- **New-section bases**, in final track d:
  - Switchbacks `SB = 199.5` (authored 169.5 + 30)
  - Fort `CF = SB + 60 = 259.5`
  - Forest `SF = D_old(230) + 74 = 334`
  - Avalanche `YA = 297 + 164 = 461`

  Write these as numbers. They are track d, so new content calls `k.*` directly with them, not `D()`.

#### 3.2 Straddlers

| Line | Old | New |
| --- | --- | --- |
| 81 | `F(228, 262);` | `F(228, 230);` (mushroom landing) and `F(230, 262);`. The second needs no edit: `D()` already moves both ends by the same 74 + 90 |
| 84 | `k.tixArc(0, 0, D(261), 0, D(268), 2.6, 6);` | `k.tixArc(0, 0, D(261), 0, D(261) + 7, 2.6, 6);` (the arc over the old 262–267 gap must not stretch across the Avalanche) |
| 85 | `F(267, 316);` | no change (it starts at the splice) |

Nothing else in L2 spans a splice. The crumble bridge (161.6–167.6) is before S1, and the warp
(222.5–227.5) and the arc 221–229 are before S2.

#### 3.3 Chase retune (the Big Cat over 519 m)

The current `ChaseCat` rubber band (`bigCat.js` update):

- target speed 6.7 at a gap under 5 m
- rising linearly to 8.2 at 9 m
- then 8.2 + (gap − 9) × 0.575, capped at 10.5
- it catches at a gap under 2.4 m

Changes:

1. **Keep the band for the old stretches.** The run is longer, not faster.
2. **Vertical check.** A catch needs `gap < 2.4` **and** `Math.abs(p.pos.y - this.y) < 2.5`.
   - Today the cat checks distance along the track only, so it would catch Nobu inside Cat Flap Alley
     (raised) or the Dry Riverbed (sunken).
   - A one-line change in `ChaseCat.update`, where `gap < 2.4 && !p.dead` is checked.
3. **Corner cuts** (Switchbacks): new `cuts: [[sFrom, sTo], …]` on `ChaseCat`. When the cat reaches
   `sFrom` it leaps to `sTo` with the existing `leap` arc (`this.leap = { s0, s1, y0, h }`).
   - **It only cuts if the gap after landing is still ≥ 3.5 m.** Otherwise it runs the long way. A cut
     never causes a catch that couldn't be avoided.
   - Cuts: `[[SB + 8, SB + 13], [SB + 28, SB + 34], [SB + 48, SB + 53]]`, each saving 5–6 m.
   - **And the cat must be behind:** a catch needs `-1 < gap < 2.4`. If the cat has run past Nobu
     while he was up in a detour loop, landing in front of it doesn't kill him.
   - **Chase-reset Snacks:** a new option `k.snacks(x, y, d, { resetChase: true })`. When it breaks
     it calls `chase.begin(cp.s - 13, 1.6)`, the respawn rule without a death. Each chase detour
     loop's main-path exit has one (3.8, 3.9). The cat restarts behind Nobu, and the chase budget
     from the exit is an ordinary checkpoint segment (7A).
4. **Fort hold.** At `CF + 1`, `chase.hold()`: the cat stops at the box mouth (pose `swipe` loop, paws
   through the flaps). At `CF + 13`, `chase.begin(CF - 1, 1.0)`.
   - Nobu leaves with a gap of about 14 m, which pulls the cat's target up to about 11 m/s for 3–4 s.
     That is the "it's coming back" moment.
5. **Detours in a chase:** no hold (the cat keeps running honestly). Each is a loop with an entry
   Snacks and an exit chase-reset Snacks (rule 1.5, as revised in 7A.4).
6. **DDA:** `ChaseCat.speedMul` (new, default 1) multiplies both the band target and the 10.5 cap.
   `session` sets it on respawn from `ddaFor(deathsAtCp)`: 0.92 at 5 or more deaths at this checkpoint
   (plan 4.3). Never in trials.
7. **Respawn rule** (unchanged): `chase.begin(pr.s - 13, 1.6)` (`session.js:668`).

#### 3.4 Section S1a: Switchbacks (track d 199.5–259.5, 60 m)

- **Beat:**
  - **Teach:** at bends the cat cuts the corner, so take the inside line.
  - **Test:** two terraced climbs with rug (Nitro) gaps in backpack walls. Before L2's Vacuum Dock
    (old 293), these rugs are live.
  - **Twist:** a cut where the inside line has a Cat (TNT).
- **Target deaths:** 2–3.
- **Tickets:** 16.

```js
// --- Switchbacks (layout 2, track d 199.5-259.5): climbing bends, the cat cuts corners ---
const SB = 199.5;
k.section(SB, SB + 60, 'Switchbacks');
k.floor(SB, SB + 60, { w: 9.2 });
k.floor(SB + 16, SB + 20, { w: 9.2, y: [0, 1.5] });       // terrace 1 ramp (the track also climbs 1.5)
k.floor(SB + 36, SB + 40, { w: 9.2, y: [0, 1.5] });       // terrace 2 ramp
k.snacks(0, 0, SB + 2);                                   // chase checkpoint (7A: a 0 s budget without it)
k.tut(SB + 1, 'cutcorner');                               // new tutorial id: "It cuts corners! Hug the inside of the bend."
k.tix(-2.6, 0, SB + 4, -2.6, 0, SB + 12, 4);              // inside line of bend 1 (left)
const wall = (d, gapX) => { for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) if (x !== gapX) k.pack(x, 0, d); };
wall(SB + 22, 1.8); k.rug(1.8, 0, SB + 22);               // the gap in the wall is a rug: go through elsewhere
k.dog(-3.6, 0, SB + 26, 'corgi');                         // new dog 4, inside line
k.tix(2.6, 0, SB + 28, 2.6, 0, SB + 34, 3);               // inside line of bend 2 (right)
k.mouse(0, 0, SB + 29, { range: 3.4, speed: 5 });
k.snacks(-2.6, 0, SB + 33);                               // chase checkpoint: one wall per checkpoint segment (7A)
wall(SB + 42, -1.8); k.rug(-1.8, 0, SB + 42);
k.cat(-2.8, 0, SB + 50);                                  // twist: the inside line of bend 3 has a Cat
k.tix(2.6, 0, SB + 47, 2.6, 0, SB + 56, 5);
// no Snacks at SB + 58 any more: the Fort's Snacks at CF + 4 is 6 m later
// decor: scratch posts on the inside of each bend (k.post), so the cat's leaps read clearly
```

#### 3.5 Section S1b: Cardboard Fort (track d 259.5–273.5, 14 m)

- **Beat:** a **breather** in the middle of the chase.
- **Target deaths:** 0.

```js
// --- Cardboard Fort (layout 2): a box Nobu runs through; the cat's paw swipes through the flaps but can't reach ---
const CF = 259.5;
k.section(CF, CF + 14, 'Cardboard Fort');
k.floor(CF, CF + 14, { w: 9.2 });
k.walls([[CF, 4.6, 4.6, 3.2], [CF + 0.5, 3.0, 3.0, 3.6], [CF + 13.5, 3.0, 3.0, 3.6], [CF + 14, 4.6, 4.6, 3.2]]);
k.snacks(0, 0, CF + 4);
k.mystery(-1.8, 0, CF + 8, { slot: 'l2-fort' });
k.tixRing(1.4, 0.4, CF + 8, 1.0, 6);
k.trigger(CF + 1, () => game.session.chase?.hold());
k.trigger(CF + 13, () => game.session.chase?.begin(CF - 1, 1.0));
// visuals: a cardboard box shell over the path (procedural, open roof so the trackFront camera can see in)
```

#### 3.6 Section S2: Scratchpost Forest (track d 334–424, 90 m), the new main-path section

- **Beat:** run through a forest of giant scratching posts while the cat **bats posts over**. A falling
  post is a crusher-style hazard lying across the path, with a shadow tell.
  - **Teach:** one post falls well ahead.
  - **Test:** posts falling in pairs.
  - **Twist:** a fallen post becomes a ramp to a high line of tickets.
  - **Combine:** posts plus yarn balls rolling across.
- **Target deaths:** 3–4.
- **Tickets:** 23.

```js
// --- Scratchpost Forest (layout 2, track d 334-424): posts topple across the path ---
const SF = 334;
k.section(SF, SF + 90, 'Scratchpost Forest');
k.floor(SF, SF + 90, { w: 9.2 });
// toppling posts: Crusher mechanics laid sideways (k.crusher gets { topple: true }; the shadow is the tell)
k.crusher(0, 0, SF + 12, { w: 8.6, d: 1.6, topple: true, period: 4.0, phase: 0 });      // teach: alone, early
k.tix(0, 0, SF + 4, 0, 0, SF + 10, 3);
k.crusher(-2.2, 0, SF + 26, { w: 4.2, d: 1.6, topple: true, period: 3.4, phase: 0 });   // test: a pair, one lane each
k.crusher(2.2, 0, SF + 29, { w: 4.2, d: 1.6, topple: true, period: 3.4, phase: 1.7 });
k.packs([[-3.4, SF + 20], [3.4, SF + 22]]);
k.snacks(-2.8, 0, SF + 30);                                                            // moved from SF + 38 (7A: dog budget was 0.42 s)
k.dog(3.6, 0, SF + 34, 'dalmatian');                                                   // new dog 6
// twist: a post that has already fallen is a ramp up to a ticket line
k.floor(SF + 44, SF + 50, { x: 2.6, w: 2.0, y: [0, 2.4], style: 'platform' });
k.tix(2.6, 2.8, SF + 50, 2.6, 2.8, SF + 57, 4);
k.stack(2.6, 0, SF + 58, 2);
k.pitySnacks(-2.6, 0, SF + 62);
// combine: falling posts with yarn rolling across them
k.crusher(0, 0, SF + 68, { w: 8.6, d: 1.6, topple: true, period: 3.0, phase: 0.6 });
k.yarn(-2.4, 0, SF + 72, { range: 3.2, speed: 5.2 });
k.crusher(-2.2, 0, SF + 78, { w: 4.2, d: 1.6, topple: true, period: 3.0, phase: 1.5 });
k.yarn(2.4, 0, SF + 82, { range: 3.2, speed: 5.6 });
k.packs([[0, SF + 75], [-3.4, SF + 85], [3.4, SF + 87.5]]);   // the right pack staggered 2.5 m (7A)
k.snacks(0, 0, SF + 51);                                        // the Dry Riverbed's entry Snacks (3.9)
// no zipped backpack in a chase: three bites is 1.1-1.4 s standing still (7A)
k.tix(-2.6, 0, SF + 64, -2.6, 0, SF + 70, 4); k.tix(0, 0, SF + 80, 0, 0, SF + 89, 5);
k.dustWall(-4.0, 0, SF + 46, { w: 1.8, h: 2.6 });   // post-Titan: a wall alcove with a non-countable 10-Ticket jackpot
```

- **Topple:** the `Crusher` entity (`props.js`) gets a `topple` option. It rotates down around its
  base edge instead of dropping vertically; the timing logic is the same. The art is a scratch-post
  model (`k.post` decor at scale) parented to the crusher's moving part.

#### 3.7 Section S3: Yarn Avalanche (track d 461–516, 55 m)

- **Beat:** the **hardest section in L2.** Threats come from both sides: giant yarn balls roll
  **toward** Nobu while the cat chases behind.
  - **Test:** one lane of yarn.
  - **Twist:** alternating lanes.
  - **Exam:** a three-lane volley with one gap shown by the shadows.
- **Target deaths:** 3–5.
- **Tickets:** 14.

```js
// --- Yarn Avalanche (layout 2, track d 461-516): rollers from the front, the cat from behind ---
const YA = 461;
k.section(YA, YA + 55, 'Yarn Avalanche');
k.floor(YA, YA + 48, { w: 9.2 });              // pit YA + 48 ... YA + 54 for the gauntlet tail
// CoconutRoller rolls from `start` down to `until` (decreasing d): toward Nobu. model: 'yarn' = YarnBall look, 2x size
k.coconuts(YA + 24, { until: YA + 2, every: 2.4, speed: 6.0, lanes: [-2.4], model: 'yarn', scale: 2 });
k.coconuts(YA + 40, { until: YA + 22, every: 2.0, speed: 6.6, lanes: [-2.4, 2.4], model: 'yarn', scale: 2 });
k.coconuts(YA + 54, { until: YA + 38, every: 1.7, speed: 7.2, lanes: [-2.8, 0, 2.8], model: 'yarn', scale: 2, skip: 'shadow' });
k.snacks(0, 0, YA - 1);                        // chase checkpoint before the hardest section (7A)
k.pack(0, 0, YA + 30);                         // in the safe lane of the twist (plain, not zipped: 7A)
k.packs([[2.6, YA + 12], [-2.6, YA + 33], [2.6, YA + 46]]);
k.pitySnacks(0, 0, YA + 36);
k.tix(2.4, 0, YA + 4, 2.4, 0, YA + 20, 6); k.tix(0, 0, YA + 42, 0, 0, YA + 47, 3); k.tixArc(0, 0, YA + 24, 0, YA + 30, 1.8, 4);
// BOX GAUNTLET tail (box-gauntlets-spec.md): no waiting allowed in a chase, so only forward launches. One route.
k.arrowChain([[0, YA + 48.5], [0, YA + 51]], { power: 16 });  // pit YA + 48 ... YA + 54
k.bounceChain([[1.2, YA + 53]], { y: 0 });
k.floor(YA + 54, YA + 55, { w: 9.2 });
```

- **Chase timing of the gauntlet:** the chain must carry Nobu at **≥ 8 m/s horizontally** on
  average, the speed of a run. Then it costs no stop time and the 7A budget holds. The
  `chase-budget` test models it as a stop of `max(0, chainTime − length / 8)` seconds.
- `box-gauntlets-spec.md` must give `arrowChain` a forward component. Ask, if it is vertical only.

- `CoconutRoller` gains `model`, `scale` and `skip` options.
  - `skip: 'shadow'` leaves one lane empty in each volley, chosen per volley from a seeded sequence.
    It is drawn as a darker shadow strip 1.5 s ahead.
  - The other options are tuning only.
- **Rollers never respawn behind Nobu:** they start at `start` and roll toward `until`, as now
  (`level1.js:147`).

#### 3.8 Detour 1: Cat Flap Alley (raised, from plan 6.3)

- **Entry:** `k.detour(D(118), D(117), { y: 8, entry: 'flap', build })`, a loop. The cat flap is in the right
  canyon wall at `(4.4, 0, D(116))`, right after the old backpack wall at 114.
- **Exit (loop, 7A.4):** a slide down a scratch post at the route's end lands at `D(117)`, next to
  the flap. Write it as `k.detour(D(118), D(117), …)` with `exitD` before `entryD`.
  - The main-path Snacks at `D(116)` is the entry Snacks.
  - `k.snacks(-2.6, 0, D(117.5), { resetChase: true })` is the exit.
  - Nothing on the main path is skipped.
- **Beat:**
  - **Teach:** walk past sleeping small cats.
  - **Test:** two cats close together.
  - **Twist:** a Tail Glide gap (glide comes from the Mecha Bird, which every player has by L2).

```js
build: (kd) => {
  kd.floor(D(118), D(134), { x: 0, w: 3.0, y: 0, style: 'platform', depth: 0.8 });
  kd.cat(-0.8, 0, D(123)); kd.cat(0.8, 0, D(129));        // asleep: they only wake on touch or bite (a Cat is TNT)
  kd.dog(0.4, 0, D(132), 'shiba');                        // new dog 5
  kd.floor(D(144), D(158), { x: 0, w: 3.0, y: 0, style: 'platform', depth: 0.8 });  // 10 m gap: double jump plus Tail Glide
  kd.tixArc(0, 0, D(134), 0, D(144), 2.0, 6);
  kd.pack(-0.8, 0, D(150)); kd.pack(0.8, 0, D(150));
  // Hidden Bone (Bone Board slot 3) at (0, 0, D(155))
}
```

- **The 10 m gap needs Tail Glide.** Double jump alone covers about 7 m at `RUN` (8 m/s) and about 9 m
  at slide-jump speed (`SLIDE_JUMP_SPEED` 10.5). Tail Glide adds about 4 m.
- The Hidden Bone sits **after** the gap, so the dog (5) and the backpacks are reachable without glide:
  - backpacks at `D(150)` are past the gap; **move them to `D(140)` on a ledge before the gap**
    (`kd.floor(D(136), D(141), { x: 1.4, w: 1.6 })`), so the Golden Bone never needs glide.
  - Every player owns glide in L2 anyway, but the rule is kept for remixes.

#### 3.9 Detour 2: Dry Riverbed (sunken, beyond the left wall, a loop)

- **Entry:** a crumbling floor plate at `(−3.4, 0, SF + 52)`, beside the left wall, drops Nobu through
  a gap in the wall onto a dry riverbed **outside** the canyon. The route runs at `x = −7.5`,
  `y = −5` from `SF + 52` to `SF + 70`.
  - It is open to the sky, and the `trackFront` camera sees it over the 3.2 m wall.
  - It is above the kill plane (−12), with no water, so it is safe under rule 1.5.
- **The main path stays full width.** The earlier draft's floor offset is dropped.
- **Exit (loop):** a pipe at the far end puts Nobu back on the main path at `SF + 52.5`.
  - The entry Snacks is at `SF + 51` (3.6).
  - The exit is `k.snacks(-2.6, 0, SF + 53, { resetChase: true })`.
  - Nothing on the main path is skipped.

```js
k.crumble(-3.4, 0, SF + 52, { w: 1.6, d: 2.4 });
k.detour(SF + 52, SF + 52.5, { y: -5, entry: 'crumble', build: (kd) => {
  kd.floor(SF + 52, SF + 70, { x: -7.5, w: 3.0, y: 0, depth: 2 });
  kd.shellback(-7.5, 0, SF + 58, { range: 1.0 });
  kd.dog(-7.8, 0, SF + 62, 'pug');                         // new dog 7
  kd.mystery(-7.2, 0, SF + 66, { slot: 'l2-riverbed' });
  kd.tix(-7.5, 0.2, SF + 53, -7.5, 0.2, SF + 68, 5);
  // the exit pipe at SF + 69.5 returns to (0, 0, SF + 52.5) on the main path
}});
k.snacks(-2.6, 0, SF + 53, { resetChase: true });
```

#### 3.10 L2 dogs and tally

| # | Breed | Where |
| --- | --- | --- |
| 1–3 | corgi, pug, shiba | existing (track 90.5, 176, and 452.5 after the 7A move) |
| 4 | corgi | Switchbacks, SB + 26 |
| 5 | shiba | Cat Flap Alley, D(132) |
| 6 | dalmatian | Scratchpost Forest, SF + 34 |
| 7 | pug | Dry Riverbed, SF + 62 |

Track d, worked out: dog 1 stays at 90.5 and dog 2 at 176 (both before S1). Dog 3 **moves from
authored D 236 to D 258.5** (the audit fix, 7A.1), which is track 452.5.

---

### 4. Level 3: Cone Factory (tier 3, path 244 → 419 m)

#### 4.1 Turtle and shift

- **Old moves** (`level3.js:8-11`): 13 moves. Boundaries at 22, 44.04, 68.03, 90.06, 112.11,
  **136.12**, 156.12, 178.18, 200.18, 222.22, 244.24, 268.23, 292.23.
- **Splices:**
  - **A at 98**, 7.94 m into move 5 (`[22, 0, 1.2]`, straight with climb). Split it into
    `[7.94, 0, 0.433]` and `[14.06, 0, 0.767]`. **X = 70:** Sorting Belts.
  - **B at 136**, the move 6/7 boundary. **X = 55:** Packaging Line.
  - **C at 206**, 5.82 m into move 10 (`[22, 34, 1]`). Split it into `[5.82, 9.0, 0.265]` and
    `[16.18, 25.0, 0.735]`. **X = 50:** Vat Overflow.
- **New move list:**

  ```js
  [22,0,0],[22,38,0],[24,0,0],[22,-48,0],[7.94,0,0.433],
  [22,-14,0],[24,22,0],[24,-8,0],          // A: Sorting Belts (70)
  [14.06,0,0.767],[24,40,0],
  [55,0,0],                                // B: Packaging Line (55), dead straight for the side camera
  [20,0,0],[22,-42,-1.2],[22,0,0],[5.82,9,0.265],
  [25,12,0],[25,-12,0],                    // C: Vat Overflow (50)
  [16.18,25,0.735],[22,0,0],[24,-30,0],[24,0,0],
  ```

  Measured: Sorting Belts 97.99–168.07, Packaging 206.12–261.15, Vat Overflow 331.02–381.01. Spline
  length 467.23.
- **Shift:** `S(d) = d + (d ≥ 98 ? 70 : 0) + (d ≥ 136 ? 55 : 0) + (d ≥ 206 ? 50 : 0)`.
- **Key positions:**

  | Thing | Line | Old d | New d |
  | --- | --- | --- | --- |
  | `END` | 13 | 252 | **427** |
  | Gate `k.gate(243, 'THE EVIL CONE', …)` | 133 | 243 | **418** |
  | Trigger `k.trigger(245, …)` | 134 | 245 | **420** |
  | Fan catwalk and blue bone (`colorBone(-1.7, 5.4, 156.6)`) | 87-92 | 150–157 | 275–282 |

- **Wall keys** (`level3.js:15-16`):
  - The crusher-alley keys (47–67) are unchanged.
  - The keys at 171, 172.5, 181.5 and 183 become `S(…)`: 296, 297.5, 306.5, 308.
  - `END + 2` follows `END`.

#### 4.2 Straddlers

- **Floors:** none straddle.
  - Splice A falls exactly where `F(70, 98)` ends (line 50), before the crumbling catwalk at 100.5.
  - B falls where `F(118, 136)` ends (line 73) and `belt(136, 146)` starts.
  - C falls where the vat pit ends (203) and `F(206, 218)` starts (line 116).
  - The floors starting at a splice are wrapped normally.
- **One straddler, the Good Boy route** (line 124):
  `k.goodBoy(204, [[3.3, 1.2, 207.5, …], [3.3, 2.4, 210.3, …], [3.3, 3.6, 214.5, …]])`.
  - The trigger at 204 maps to 329, before Vat Overflow. Its platforms at 207.5–214.5 map to
    382.5–389.5, after it.
  - Write the trigger as **379** (old 204 plus the 175 total shift), so it fires just before its
    platforms. Wrap the platforms in `S()`.
  - This also keeps the route's "no deaths so far" check covering Vat Overflow.
- **The purple path from Level 6** (owner: the L6 spec) is authored in L3 at old d 190–198, over the
  vat pit. In layout 2 that is **final d 315–323** (+125: splices A and B, not C). Wrap its
  platforms in `S()`. The vat pit moves to 317–328, so the path still sits over it.

#### 4.3 Section A: Sorting Belts (final d 98–168, 70 m), the new main-path section

- **Beat:** the conveyor **test** after the intake lesson (d 22). Three parallel belts at different
  speeds and directions carry backpacks; lane-switching is the skill.
  - **Teach:** two lanes, opposite directions.
  - **Test:** three lanes with a crusher over the middle one.
  - **Twist:** a belt reverses on a 4 s cycle (a siren cue 1 s ahead).
  - **Combine:** troopers riding the belts.
- **Target deaths:** 3–5.
- **Tickets:** 13.

```js
// --- Sorting Belts (layout 2, final d 98-168): parallel conveyors ---
const SBL = 98;
k.section(SBL, SBL + 70, 'Sorting Belts');
k.floor(SBL, SBL + 4);
k.tut(SBL + 1, 'sorting');                          // new tutorial id: "Belts go different ways. Switch lanes!"
k.belt(SBL + 4, SBL + 22, { x: 0, z: 3.0 }, { x: -2.15, w: 4.3 });     // left lane pushes back
k.belt(SBL + 4, SBL + 22, { x: 0, z: -3.5 }, { x: 2.15, w: 4.3 });     // right lane pushes forward
k.packs([[-2.2, SBL + 10], [2.2, SBL + 14], [-2.2, SBL + 18]]);
k.dog(-3.4, 0, SBL + 20, 'shiba');                  // new dog 6, on the slow lane
k.floor(SBL + 22, SBL + 26);
k.snacks(0, 0, SBL + 24);
// three lanes, a stamper over the middle one
k.belt(SBL + 26, SBL + 46, { x: 0, z: 3.4 }, { x: -2.9, w: 2.8 });
k.belt(SBL + 26, SBL + 46, { x: 0, z: -5.0 }, { x: 0, w: 2.8 });
k.belt(SBL + 26, SBL + 46, { x: 0, z: 2.0 }, { x: 2.9, w: 2.8 });
k.crusher(0, 0, SBL + 36, { w: 2.8, d: 2.4, phase: 0.4, period: 2.4 });
k.stack(2.9, 0, SBL + 32, 2); k.pack(-2.9, 0, SBL + 41);
k.pitySnacks(0, 0, SBL + 47);
// twist: a reversing belt (conveyor push flips sign every 4 s; siren and a light 1 s before)
k.floor(SBL + 46, SBL + 50);
k.belt(SBL + 50, SBL + 62, { x: 0, z: 4.0 }, { reverse: 4.0 });
k.trooper(-1.5, 0, SBL + 54); k.trooper(1.6, 0, SBL + 59);
k.packs([[-3.0, SBL + 56], [3.0, SBL + 60]]);
k.floor(SBL + 62, SBL + 70);
k.mystery(2.8, 0, SBL + 65, { slot: 'l3-belts' });
k.dustWall(-3.6, 0, SBL + 67, { w: 1.4, h: 3.4 });   // post-Titan: non-countable 1UP behind it
k.tix(-2.2, 0, SBL + 5, -2.2, 0, SBL + 20, 4); k.tix(0, 0, SBL + 27, 0, 0, SBL + 45, 5); k.tix(0, 0, SBL + 63, 0, 0, SBL + 69, 4);
```

- `k.belt` gains a `reverse: seconds` option. The span's `conveyor` vector is negated on a timer, and
  `conveyorStrip` scrolls the other way.

#### 4.4 Section B: Packaging Line (final d 206–261, 55 m), 2.5D

- **Beat:** the **twist** of the level: the same factory seen side-on.
  - **Teach:** a belt with cone stampers.
  - **Test:** boxes riding the belt as moving steps.
  - **Twist:** a gap you cross by riding a box.
- **Target deaths:** 3–4.
- **Tickets:** 10.
- **Camera:** `k.section(PL, PL + 55, 'Packaging Line', { camera: 'side' })`, using `side` mode from
  `new-levels-spec.md`:
  - the camera sits on the **left** at `dist 11`, `height 2.2`
  - movement maps right to +d and left to −d; up/down is ignored
- The walls narrow to a half-width of 1.6, so it plays as 2D. **Keep all content at `x` −1.2 to 1.2.**

```js
// --- Packaging Line (layout 2, final d 206-261): side-on run ---
const PL = 206;
k.section(PL, PL + 55, 'Packaging Line', { camera: 'side' });
k.walls([[PL, 4.3, 4.3, H], [PL + 1, 1.6, 1.6, H], [PL + 54, 1.6, 1.6, H], [PL + 55, 4.3, 4.3, H]]);
k.belt(PL + 1, PL + 20, { x: 0, z: -2.5 }, { w: 3.2 });                // carries Nobu forward
k.crusher(0, 0, PL + 8, { w: 3.2, d: 2.0, period: 2.4 });
k.crusher(0, 0, PL + 14, { w: 3.2, d: 2.0, period: 2.4, phase: 1.2 });
k.pack(0, 0, PL + 11); k.pack(0, 0, PL + 17);
k.floor(PL + 20, PL + 24, { w: 3.2 });
k.snacks(0, 0, PL + 22);
k.dog(0.8, 0, PL + 23.5, 'pug');                                       // new dog 7
// boxes riding the belt as moving steps (MovingPlatform, axis z, one-way loop)
k.belt(PL + 24, PL + 40, { x: 0, z: -2.0 }, { w: 3.2 });
k.mover(0, 1.2, PL + 28, { axis: 'z', range: 4, speed: 1.2, w: 1.6, d: 1.6 });
k.mover(0, 2.4, PL + 34, { axis: 'z', range: 4, speed: 1.2, w: 1.6, d: 1.6, phase: Math.PI });
k.pack(0, 3.6, PL + 34);                                               // on top of the high box
k.crusher(0, 0, PL + 37, { w: 3.2, d: 2.0, period: 2.0 });
// twist: a 6 m gap; ride the last box across
k.mover(0, 0, PL + 44, { axis: 'z', range: 3.5, speed: 1.5, w: 2.0, d: 2.0 });
k.pitySnacks(0, 0, PL + 49);
k.floor(PL + 48, PL + 55, { w: 3.2 });
k.stack(0, 0, PL + 52, 2);
k.tix(0, 0.4, PL + 2, 0, 0.4, PL + 19, 5); k.tixArc(0, 1.2, PL + 41, 0, PL + 48, 2.0, 5);
```

#### 4.5 Section C: Vat Overflow (final d 331–381, 50 m)

- **Beat:** the **final exam** (plan 6.3). Hitting a valve Bone Switch opens the exit high above and
  **starts the vat rising.** Climb the crane hooks faster than it rises. Drones harass the climb.
- **Target deaths:** 4–6.
- **Tickets:** 10.

```js
// --- Vat Overflow (layout 2, final d 331-381): climb before the vat fills ---
const VO = 331;
k.section(VO, VO + 50, 'Vat Overflow', { camera: 'rise' });
k.floor(VO, VO + 6);
k.snacks(-2.4, 0, VO + 3);                                              // a checkpoint before the switch
k.boneSwitch(1.8, 0, VO + 5, [[0, 9.0, VO + 47, 3.2, 3.2]]);           // the exit ledge up high
k.rising(VO + 6, VO + 50, { y0: -1.2, y1: 7.2, rate: 0.42, trigger: 'switch' }); // about 20 s from bottom to top
// BOX GAUNTLET climb (box-gauntlets-spec.md): timing only, one route, with the vat rising underneath
k.bounceChain([[-1.8, VO + 9], [1.4, VO + 12]], { y: 0.8 });                 // up to y ~2.6
k.blinkBox(1.4, 2.6, VO + 15, { on: 1.2, off: 1.0, phase: 0, group: 'vo-a' });
k.blinkBox(-0.4, 3.4, VO + 18, { on: 1.2, off: 1.0, phase: 0.6, group: 'vo-a' });
k.slideBox(-0.4, 4.2, VO + 21.5, { axis: 'x', range: 1.6, speed: 1.5 });
k.drone(0, 5.6, VO + 24, { range: 2.8, hover: 1.4 });
k.platform(1.8, 4.6, VO + 28, 2.6, 2.6);
k.pitySnacks(1.8, 4.6, VO + 28);                                        // the pity checkpoint drains the vat back to y0
k.fallBox(0.6, 5.4, VO + 31.5, { delay: 0.45 });
k.fallBox(-0.8, 6.0, VO + 34.5, { delay: 0.45 });
k.arrowChain([[-0.8, VO + 37.5], [0.6, VO + 41]], { power: 16 });        // launches up to the exit ledge
k.drone(0, 8.0, VO + 39, { range: 3.0, hover: 1.2 });
k.oneUp(0, 9.0, VO + 47.5);
k.pack(-1.2, 9.0, VO + 46.5); k.pack(1.2, 9.0, VO + 46.5);
k.tix(-1.8, 1.6, VO + 9, 1.4, 3.2, VO + 15, 3); k.tix(-0.4, 4.0, VO + 18, 1.8, 5.2, VO + 28, 3); k.tix(0.6, 6.2, VO + 31.5, 0.6, 8.4, VO + 41, 4);
k.floor(VO + 48, VO + 50, { y: 9.0, style: 'platform' });              // then a ramp back down to the old final stretch
```

- **The climb is the level's box gauntlet:** bounce, blink, slide, fall and arrow boxes, with no
  alternative route. The earlier crane-mover draft is replaced. Tier 3 windows: 1.2 s on, 1.0 s off.
- **Timing check:** an average climber reaches the exit ledge in about 15 s. The vat takes
  (7.2 − (−1.2)) / 0.42 = 20 s to fill, so there is about a 5 s margin. Playtest it (11.4).
- **Rising level:** the liquid ends at `y1 = 7.2`, below the exit ledge at 9.0, so the top is always
  safe.
- **Reset on death:** rising state resets to `y0` on death or rollback (rollback rules are in
  `rewards-spec.md`).
- **Moving the old stretch:** the old final stretch (`F(206, 218)` → 381) is at track height. The
  section must come back down: use `k.floor(VO + 49, VO + 50, { y: [9, 0] })` as a steep chute. Or
  better, **lift the old stretch**: add the last inserted move's climb `+9` and put `-9` on the next
  move. **Spec choice: the chute** (simpler; the old content keeps its height).

#### 4.6 Detour 1: Maintenance Ducts (from plan 6.3)

- **Entry:** low pipes at `(3.0, 0, S(118))` = **188** (the old hammer hall start; `F(118, 136)`
  maps to 188–206, shifted by splice A only). You **slide** under them.
- **The route:** a raised duct, `k.detour(188, 201, { y: 8, entry: 'duct', build })`, exiting through a
  grate drop at 201.
- **Feasibility (7A.4):** this exit is downstream. The skipped stretch, 188–201, holds the old Snacks at
  190.5 and the hammers. Hammers swing both ways, so walking back is possible.
- **Beat:** a short crawl with a fan lift, Pill Bots and a lint-roller puzzle (2 rugs, with a lint
  roller at the entry that only affects the duct's rugs: `scope: 'detour'`).

```js
build: (kd) => {
  kd.floor(188, 201, { x: 0, w: 2.6, style: 'platform', depth: 0.8 });
  kd.pill(0, 0, 191, { range: 1.0 });
  kd.lint(0, 0, 189.5, { scope: 'detour' });
  kd.rug(-0.6, 0, 194); kd.rug(0.6, 0, 196);
  kd.dog(0, 0, 198, 'corgi');                        // new dog 8
  kd.fan(0, 0, 199, { height: 4 });
  kd.smogVent(0, 4, 200, { lift: 3 });               // post-Cone: the Hidden Bone (plan 6.3)
  kd.tix(0, 0, 189, 0, 0, 197, 4);
}
```

#### 4.7 Detour 2: Overhead Rails (raised, new)

- **Entry:** an arrow lunchbox at `(−2.8, 0, S(150))` (275, beside the fan catwalk) launches Nobu onto
  a rail gantry at `y +7`.
- **The route:** two ziplines (taught in L1) and a short catwalk; it exits by zipline down at 312.
- **Feasibility (7A.4):** the exit is downstream (276 → 311). The skipped stretch holds the fan
  catwalk (a 1UP, a backpack, dog 3), dog 4, and the lint roller at 310.5. All of it can be walked
  back to from 311: the crusher pair at 300/304 cycles both ways, and the fan lifts from the floor. No
  one-way drops. The Sniffer hint (rewards-spec) points there if the player skips it.
- **Holds:** dog 9, plus a Tail Glide gap. That gap leads only to a non-countable jackpot. Plan 3.6
  wanted a glide gap in L3; this is it, and L3's Hidden Bone stays in the Ducts.

```js
k.arrowBox(-2.8, 0, 275, 17);
k.detour(276, 312, { y: 7, entry: 'launch', build: (kd) => {
  kd.platform(-2.8, 0, 277, 3, 3);
  kd.zipline(-2.8, 2.2, 278, 0, 1.6, 288, { speed: 9 });
  kd.floor(289, 298, { x: 0, w: 2.4, style: 'platform', depth: 0.6 });
  kd.dog(0.6, 0, 294, 'dalmatian');                  // new dog 9
  kd.mystery(-0.6, 0, 296, { slot: 'l3-rails' });
  kd.tix(0, 0, 290, 0, 0, 297, 4);
  kd.platform(4.0, 0, 304, 2.0, 2.0);                // 6 m gap from the catwalk: glide only, a non-countable 12-Ticket jackpot
  kd.zipline(0, 2.4, 298.5, 0, -4.4, 311, { speed: 10 });   // the drop back to the main path
}});
```

#### 4.8 L3 dogs and tally

| # | Breed | Where |
| --- | --- | --- |
| 1–5 | pug, dalmatian, corgi, shiba, dalmatian | existing (d 68, 96.5 unshifted; 154.2 → 279.2, 169.5 → 294.5, 212 → 387) |
| 6 | shiba | Sorting Belts, SBL + 20 |
| 7 | pug | Packaging Line, PL + 23.5 |
| 8 | corgi | Maintenance Ducts, 198 |
| 9 | dalmatian | Overhead Rails, 294 |

- **Hidden Bone:** the Ducts, behind the Smog Vent.
- **Non-countable extras:** the Sorting Belts Dust Wall 1UP and the Rails glide jackpot.
- **This resolves a conflict between plan 3.6 and 6.3** over where L3's Hidden Bone is. 6.3 is more
  specific, so the bone is in the Ducts and the glide gap holds an extra.

---

### 5. Roomba Rush (bonus, tier 1.5, path 301 → 459 m)

#### 5.1 Turtle and shift

- **Old moves** (`bonusRide.js:11-13`): 11 moves. Boundaries at 40.01, 70, 100.01, **130.01**, 160.01,
  190.02, 220.02, 250.02, 280.02, 310.02, 340.02.
- **Splices:**
  - **A at 130** (the move 4/5 boundary). **X = 50:** Living Room / Kitchen Split.
  - **B at 205**, 15 m into move 7 (`[30, -10, 0]`). Split it into `[15, -5, 0]` and `[15, -5, 0]`.
    **X = 40:** Toy Box Ramps.
  - **C at 289**, 9 m into move 10 (`[30, 0, 0]`, straight). Split it into `[9, 0, 0]` and
    `[21, 0, 0]`. **X = 68:** Kitchen Tile Slide 40, then Dog-Door Leap 28.
- **New move list:**

  ```js
  [40,0,0],[30,14,0],[30,-20,0],[30,12,0],
  [25,0,0],[25,0,0],                 // A: Split (50), straight so the two rooms sit side by side
  [30,-14,0],[30,18,0],[15,-5,0],
  [20,12,0],[20,-12,0],              // B: Toy Box Ramps (40)
  [15,-5,0],[30,0,0],[30,6,0],[9,0,0],
  [20,-14,0],[20,14,0],[28,0,0],     // C: Tile Slide (40) + Dog-Door Leap (28)
  [21,0,0],[30,0,0],
  ```

  Measured: Split 130.02–179.99, Ramps 255.12–294.92, Slide and Leap 379.16–447.00. Length 498.03.
- **Shift:** `S(d) = d + (d ≥ 130 ? 50 : 0) + (d ≥ 205 ? 40 : 0) + (d ≥ 289 ? 68 : 0)`.
- **Key positions:** `END` 312 → **470**; gate `k.gate(302, 'EXIT')` → **460**; trigger 304 → **462**;
  spawn d 3 (unchanged).

#### 5.2 Straddlers

| Line | Old | New |
| --- | --- | --- |
| 35 | `F(99, 196);` | `F(99, 130);` and `F(S(130), S(196));` (180–246) |
| 53 | `F(201, END + 1);` | `F(S(201), 205 + 50);` (251–255) and `F(S(205), END + 1);` (295–471) |
| 64 | `k.tix(0, 0, 290, 0, 0, 300, 6);` | no change in shape: both ends ≥ 289, so `S()` on both |

#### 5.3 Section A: Living Room / Kitchen Split (final d 130–180, 50 m)

- **Golden Bone note:** a run can take only one side. So every countable is on the living-room side,
  and the kitchen side pays in tickets. This replaces plan 6.3's "more cats" kitchen.
- **Beat:**
  - **Teach:** pick a side. A kitchen island splits the track down the middle for 40 m.
    - Left, living room: more backpacks, more cables.
    - Right, kitchen: faster, with more Cats.
  - **Test:** a hop over a cable.
  - The two sides rejoin at the end.
- The vacuum steers itself into whichever side the player chooses (it keeps its lateral position).
- **Target deaths:** 1–2.
- **Tickets:** 9.

```js
const SP = 130;
k.section(SP, SP + 50, 'Living Room / Kitchen');
F(SP, SP + 50);
// the kitchen island: a solid divider (StaticPlatform, 0.8 wide, 1.2 tall) from SP + 5 to SP + 45
for (let d = SP + 5; d < SP + 45; d += 4) k.platform(0, 0, d + 2, 0.8, 4, 1.2);
// living room (left): EVERY countable of the split is on this side (7A.2: the divider makes the sides exclusive)
k.packs([[-2.6, SP + 10], [-2.6, SP + 18], [-2.6, SP + 30]]);
k.dog(-3.2, 0, SP + 24, 'pug');              // new dog 3
k.cable(SP + 22, { w: 4.0, x: -2.4 });
k.zipped(-2.6, 0, SP + 38);                  // only if one ram opens a zipped backpack on the ride (7A.2), else k.pack
k.tix(-2.6, 0, SP + 12, -2.6, 0, SP + 28, 5);
// kitchen (right): faster, tickets only; the hazards are not countable (table legs, toy piles, cables)
k.leg(2.4, 0, SP + 14, { h: 3.0 }); k.leg(3.4, 0, SP + 26, { h: 3.0 });
k.tix(2.6, 0, SP + 8, 2.6, 0, SP + 42, 10);  // a richer ticket line is the kitchen's reward
k.toys(2.4, 0, SP + 20, 1.6);                // the ramp up to Sofa Summit sits on the left at SP + 44 (5.6)
```

#### 5.4 Section B: Toy Box Ramps (final d 255–295, 40 m), the new main-path section

- **Beat:**
  - **Teach:** ramps launch the vacuum. A `floor` with `y: [0, 1.6]` and a lip, then a gap.
  - **Test:** a ramp with a toy pile on the far side, so steer in the air.
  - **Twist:** a double ramp with a backpack row to bash mid-air.
- **Target deaths:** 1–3.
- **Tickets:** 7.

```js
const TB = 255;
k.section(TB, TB + 40, 'Toy Box Ramps');
F(TB, TB + 8);
F(TB + 8, TB + 12, { y: [0, 1.6] });          // ramp 1
F(TB + 16, TB + 26);                          // landing past a 4 m gap
k.toys(-2.2, 0, TB + 19, 2.6);                // steer right after landing
F(TB + 26, TB + 30, { y: [0, 1.8] });         // ramp 2
F(TB + 35, TB + 40);
k.pack(-1.2, 2.2, TB + 31); k.pack(1.2, 2.2, TB + 33.5);   // bashed in mid-air, staggered 2.5 m (7A.2)
k.pitySnacks(0, 0, TB + 22);
k.tixArc(0, 1.6, TB + 12, 0, TB + 16, 1.6, 3); k.tixArc(0, 1.8, TB + 30, 0, TB + 35, 2.0, 4);
```

The mid-air packs sit on invisible posts (`k.pack(x, 2.2, d)` on a non-solid stand).

#### 5.5 Section C: Kitchen Tile Slide and Dog-Door Leap (final d 379–447, 68 m)

- **Beat:** the **hardest part of Roomba Rush.**
  - **Twist:** slippery tiles, where steering carries momentum (`floor({ slippery: true })`, already
    in the physics, `physics.js:17`). Cats line the edges.
  - **Exam:** a long ramp jump through the dog door, with a 1-lane opening.
- **Target deaths:** 2–4.
- **Tickets:** 12.

```js
const TS = 379;
k.section(TS, TS + 40, 'Kitchen Tile Slide');
F(TS, TS + 40, { slippery: true, style: 'platform' });
// order and spacing checked by ride-reach (7A.2), with a 1.3x stagger on slippery tiles
k.cat(-3.4, 0, TS + 6); k.pack(2.6, 0, TS + 16); k.cat(3.4, 0, TS + 20); k.pack(-2.6, 0, TS + 30);
k.cable(TS + 24);
k.toys(0, 0, TS + 34, 2.4);
k.snacks(0, 0, TS + 38);
const DD = TS + 40;
k.section(DD, DD + 28, 'Dog-Door Leap');
F(DD, DD + 10);
F(DD + 10, DD + 15, { y: [0, 2.2] });          // the long ramp
// the dog door: a wall across the track with a 2.4 m opening at x 0 (two StaticPlatforms), landing past a 7 m gap
k.platform(-3.0, 0, DD + 19, 3.6, 0.4, 4.0); k.platform(3.0, 0, DD + 19, 3.6, 0.4, 4.0);
F(DD + 22, DD + 28);
k.pitySnacks(0, 0, DD + 4);
k.tix(0, 0, DD + 2, 0, 0, DD + 9, 4); k.tixArc(0, 2.2, DD + 15, 0, DD + 22, 2.6, 5);
```

#### 5.6 Detour: Sofa Summit (raised)

- **Entry (loop, 7A.4):** a toy ramp at `(−2.6, 0, SP + 44)` on the living-room side launches the
  vacuum onto the sofa: `k.detour(SP + 45, SP + 46, { y: 2.6, entry: 'ramp', build })`.
  - The route runs along d from `SP + 45` to `SP + 75` on the cushions.
  - The armrest hop puts the vacuum back on the main path at `SP + 46`, so nothing on the main path is
    skipped.
  - The ride can't turn around, so a downstream exit would skip the old 180–205 stretch. That stretch
    holds only non-countable hazards today, but the loop keeps the rule simple.
  - `y 2.6` is cushion height. It is low enough for the `track` camera to stay outside.
  - `entry: 'ramp'` is a ride-only entry. Ask the kit owner to support it. **Fallback without it:**
    build the sofa as raised lane floors, `k.floor(SP + 45, SP + 75, { x: -2.6, w: 3.2, y: 2.6 })`,
    reached by the ramp. That works with today's kit.
- **Holds:** bouncy cushions (`BouncePad` with `power` 9), dog 4, the Hidden Bone, and a hop down
  over the armrest at the end.

```js
build: (kd) => {
  kd.floor(SP + 45, SP + 75, { x: -2.6, w: 3.2, y: 0, style: 'platform', depth: 1.2 });
  kd.mushroom(-2.6, 0, SP + 52, { power: 9 }); kd.mushroom(-2.6, 0, SP + 60, { power: 9 });   // cushion bounces (tinted)
  kd.dog(-2.8, 0, SP + 64, 'dalmatian');       // new dog 4
  kd.pack(-2.6, 0, SP + 56); kd.pack(-2.6, 0, SP + 68);
  kd.tix(-2.6, 0.4, SP + 46, -2.6, 0.4, SP + 72, 6);
  // Hidden Bone (bonus-stage board, plan 3.4) at (-2.6, 1.6, SP + 70), on top of the armrest
}
```

#### 5.7 Roomba Rush dogs

| # | Breed | Where |
| --- | --- | --- |
| 1–2 | shiba, corgi | existing (d 112 unshifted; 250 → 340) |
| 3 | pug | Split, kitchen side, SP + 34 |
| 4 | dalmatian | Sofa Summit, SP + 64 |

---

### 6. Glowworm Grotto (bonus, tier 2.5, path 241 → 370 m)

#### 6.1 Turtle and shift

- **Old moves** (`bonusCave.js:10-12`): 9 moves. Boundaries at 36, 66.02, 96.03, 126.05, 156.05,
  186.07, 216.07, 246.08, 270.08.
- **Splices:**
  - **A at 135**, 8.95 m into move 5 (`[30, 16, 0]`). Split it into `[8.95, 4.77, 0]` and
    `[21.05, 11.23, 0]`. **X = 45:** Underground River.
  - **B at 182**, 25.95 m into move 6 (`[30, -20, 1]`). Split it into `[25.95, -17.3, 0.865]` and
    `[4.05, -2.7, 0.135]`. **X = 43:** Mushroom Bounce Cavern.
  - **C at 231**, 14.93 m into move 8 (`[30, 0, -0.6]`, straight). Split it into `[14.93, 0, -0.3]` and
    `[15.07, 0, -0.3]`. **X = 40:** Crystal Echo.
- **New move list:**

  ```js
  [36,0,0],[30,-16,-1],[30,20,0.6],[30,-12,-0.8],[8.95,4.77,0],
  [22.5,-10,-0.8],[22.5,10,-0.6],         // A: Underground River (45), the current flows downhill
  [21.05,11.23,0],[25.95,-17.3,0.865],
  [21.5,14,1.0],[21.5,-14,-1.0],          // B: Mushroom Bounce Cavern (43)
  [4.05,-2.7,0.135],[30,12,0],[14.93,0,-0.3],
  [20,0,0],[20,0,0],                      // C: Crystal Echo (40)
  [15.07,0,-0.3],[24,0,0],
  ```

  Measured: River 134.83–180.00, Cavern 226.99–270.04, Crystal Echo 319.06–359.05. Length 398.15.
  River's net climb is −1.4 m, which lowers the rest of the cave by 1.4 m. That is fine, because
  heights are track-relative.
- **Shift:** `S(d) = d + (d ≥ 135 ? 45 : 0) + (d ≥ 182 ? 43 : 0) + (d ≥ 231 ? 40 : 0)`.
- **Key positions:** `END` 252 → **380**; gate `k.gate(243, 'EXIT')` → **371**; trigger 245 →
  **373**; spawn unchanged.
- **Lumi's nests** (`bonusCave.js:97`): `new Glowworm(stage, track, [2, 60, 118, 176, 226])` becomes
  `[2, 60, 118, 158, 221, 248, 266, 316, 338]`:
  - 2, 60, 118 are unchanged.
  - 176 → 221 and 226 → 314, both through `S`.
  - 158 (River), 248 (Cavern), 271 (Lumi's Nest Hollow, 6.6) and 338 (Crystal Echo) are new, so the
    longest dark stretch stays under 60 m, as in layout 1.
  - Final: `[2, 60, 118, 158, 221, 248, 271, 314, 338]`.
  - Old content in layout 2, for reference:
    - lunchbox steps 185–192.6 → 273–280.6, over the old pit, now 270–283
    - Shellback 204 → 292
    - cat and pack 214 → 302
    - drone 222 → 310
    - packs 230 → 318
    - tix 232–240 → 360–368

#### 6.2 Straddlers

| Line | Old | New |
| --- | --- | --- |
| 52 | `F(135, 182);` | starts at A: `F(S(135), S(181.99))` = `F(180, 226.99)`. Write `F(180, 227);` |
| 62 | `F(195, END + 1);` | `S(195)` = 283. **C (231) falls inside it:** split into `F(283, 319)` (old 195–231) and `F(359, END + 1)` (old 231 onward) |
| 73 | `k.tix(0, 0, 232, 0, 0, 240, 5);` | both ≥ 231: `S()` on both (360–368) |

#### 6.3 Section A: Underground River (final d 135–180, 45 m)

- **Beat:**
  - **Teach:** rafts drifting with a current. `MovingPlatform` on axis `z` in one-way loops, the same
    as Packaging Line.
  - **Test:** two rafts, out of phase.
  - **Twist:** a raft that sinks after 2 s standing on it (a `LilyPad`-type sink).
- **Target deaths:** 2–3.
- **Tickets:** 7.

```js
const UR = 135;
k.section(UR, UR + 45, 'Underground River');
k.water(UR, UR + 40, { y: -1.0, color: 0x2a6ab8 });
F(UR - 1, UR + 2);
k.mover(0, 0, UR + 6, { axis: 'z', range: 3.5, speed: 1.4, w: 2.6, d: 2.6 });
k.mover(-1.4, 0, UR + 14, { axis: 'z', range: 3.0, speed: 1.6, w: 2.4, d: 2.4 });
k.mover(1.4, 0, UR + 20, { axis: 'z', range: 3.0, speed: 1.6, w: 2.4, d: 2.4, phase: Math.PI });
F(UR + 23, UR + 26, { x: 0, w: 4 });                    // a rock islet
k.dog(1.2, 0, UR + 24.5, 'corgi');                      // new dog 3
k.lily(-1.0, 0, UR + 29); k.lily(1.0, 0, UR + 32.5);    // sinking rafts
k.mover(0, 0, UR + 36, { axis: 'z', range: 2.5, speed: 1.8, w: 2.4, d: 2.4 });
F(UR + 40, UR + 45);
k.snacks(-2.4, 0, UR + 42);
k.tix(0, 0.5, UR + 4, 0, 0.5, UR + 20, 4); k.tix(0, 0.5, UR + 28, 0, 0.5, UR + 38, 3);
```

#### 6.4 Section B: Mushroom Bounce Cavern (final d 227–270, 43 m), the new main-path section

- **Beat:** vertical play in the dark.
  - **Teach:** a glowing bounce mushroom up to a ledge.
  - **Test:** a chain of three mushrooms, each lighting the next for 2 s.
  - **Twist:** a Shellback you flip into a springboard in the dark. This calls back the existing
    204-d trick, which moves to 287.
- **Target deaths:** 2–4.
- **Tickets:** 6.
- Glide and Zoomies are both owned by this point; bark is not.

```js
const MB = 227;
k.section(MB, MB + 43, 'Mushroom Bounce Cavern');
F(MB, MB + 8);
k.mushroom(0, 0, MB + 6, { power: 15 });
k.platform(0, 4.2, MB + 11, 3, 3);
k.pack(0.8, 4.2, MB + 11.5);
// pit MB + 12 ... MB + 30, a chain of three mushrooms on small rock pillars
k.platform(-1.6, -1.0, MB + 15, 1.8, 1.8); k.mushroom(-1.6, -1.0, MB + 15, { power: 16 });
k.platform(1.6, -0.6, MB + 21, 1.8, 1.8); k.mushroom(1.6, -0.6, MB + 21, { power: 16 });
k.platform(-1.0, -0.2, MB + 27, 1.8, 1.8); k.mushroom(-1.0, -0.2, MB + 27, { power: 15 });
k.pitySnacks(0, 4.2, MB + 11);
F(MB + 30, MB + 43);
k.shellback(0, 0, MB + 34, { range: 1.4 });               // flip it, then bounce up to a nest ledge
k.platform(2.6, 3.8, MB + 38, 2.6, 2.6);
k.pack(2.6, 3.8, MB + 38.5);
k.cracked(-2.4, 0, MB + 40, { w: 3.0, d: 3.0 });          // belly-flop entrance to Lumi's Nest Hollow (6.6)
k.tixArc(-1.6, 1, MB + 15, 1.6, MB + 21, 3.0, 3); k.tix(0, 0, MB + 31, 0, 0, MB + 37, 3);
```

#### 6.5 Section C: Crystal Echo (final d 319–359, 40 m)

- **Beat:** the **hardest part of the Grotto.** Crystals light up for 5 s when bitten. While lit they
  show where the hidden stepping stones are, which are invisible platforms (`visible: false` until
  lit).
  - **Test:** 3 stones.
  - **Twist:** stones that light one at a time.
  - **Exam:** a moving crystal on a drone path.
- **Target deaths:** 3–4.
- **Tickets:** 6.

```js
const CE = 319;
k.section(CE, CE + 40, 'Crystal Echo');
F(CE - 3, CE + 2);
// k.crystal(x, y, d, { lights: [platformRefs], time: 5 }): bite to light. It is a small entity the
// kit owner adds alongside the others. Stones are platforms with visible: false until lit, solid always.
const stones = [k.platform(-1.2, 0, CE + 5, 2.2, 2.2), k.platform(1.2, 0.4, CE + 9, 2.2, 2.2), k.platform(-0.6, 0.8, CE + 13, 2.2, 2.2)];
k.crystal(0, 0, CE + 2, { lights: stones, time: 5 });
k.platform(0.6, 1.2, CE + 17, 3, 3); k.snacks(0.6, 1.2, CE + 17.5);
k.crystal(0.6, 1.2, CE + 18, { lights: [k.platform(-1.4, 1.6, CE + 21, 2, 2)], time: 3 });
k.crystal(-1.4, 1.6, CE + 21.5, { lights: [k.platform(1.4, 2.0, CE + 25, 2, 2)], time: 3 });
k.pack(1.4, 2.0, CE + 25.5);
k.drone(0, 2.4, CE + 29, { range: 2.4, hover: 1.2 });     // the "moving crystal": a drone carrying a lit shard (placeholder)
k.platform(0, 2.0, CE + 31, 2.2, 2.2); k.platform(-1.2, 1.4, CE + 35, 2.2, 2.2);
k.pitySnacks(0.6, 1.2, CE + 17);
F(CE + 37, CE + 40);
k.tix(0, 0.6, CE + 5, 0, 1.2, CE + 17, 4); k.tix(0, 2.2, CE + 26, 0, 2.2, CE + 30, 2);
```

#### 6.6 Detour: Lumi's Nest Hollow (sunken, open trench)

- **Entry:** belly-flop the cracked floor at `MB + 40` into a glowing hollow at `y = -4.5`, running
  from `MB + 40` to `MB + 58` (267–285).
  - It lies **under the old lunchbox pit** (270–283), so it is open to the sky by design.
  - A fall from the lunchbox steps lands in the hollow, not death.
- **Exit:** a mushroom at `MB + 56` (283) pops Nobu up through the end of the pit onto `F(283, 319)`.
- **Feasibility (7A.4):** the skipped stretch, 267–283, has no countables (the lunchboxes are
  unbreakable). The exit is downstream, which is fine.
- **Holds:** dog 4, the Hidden Bone (a bonus-stage board slot), and a nest, so it is never dark.

```js
k.floor(MB + 40, MB + 58, { x: -2.4, w: 3.4, y: -4.5, depth: 2 });
k.dog(-2.6, -4.5, MB + 46, 'dalmatian');     // new dog 4
k.mystery(-2.2, -4.5, MB + 50, { slot: 'cave-hollow' });
k.tixRing(-2.4, -4.5, MB + 52, 1.0, 6);
k.mushroom(-2.4, -4.5, MB + 56, { power: 17 });
// Hidden Bone at (-2.4, -4.5, MB + 57.5); Lumi's nest at d 271 (MB + 44) is in the Glowworm list (6.1)
```

Only the Cavern floor's last 3 m (267–270) lies over the hollow. Split it into `F(MB + 30, MB + 40)`
and `F(MB + 40, MB + 43, { x: 1.6, w: 5.4 })`. The hollow at 270–283 is under the open pit, and
`F(283, 319)` begins after it.

#### 6.7 Glowworm Grotto dogs

| # | Breed | Where |
| --- | --- | --- |
| 1–2 | pug, shiba | existing (d 58 unshifted; 164 → 209) |
| 3 | corgi | Underground River, UR + 24.5 |
| 4 | dalmatian | Lumi's Nest Hollow, MB + 46 |

---

### 7. Before and after

Approximate counts. The method: regex over the level files for `k.pack`, `packs`, `stack`, `sphere`,
`oneUp`, `tramp`, `snacks`, `cat`, `rug`, `lint`, `zipped` and `vacSwitch` (all are countable
`Breakable`s, `entity.js:51`), plus L2's `packWall` and L1's Treat Tray backpacks. Count again from
the finished files.

| Stage | Path | Countable breakables | Dogs | Snacks | Pity spots | Field ticket pickups | Hidden Bone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 now | 314 | 48 | 5 | 2 | 0 | ~97 | — |
| **L1 layout 2** | **539** | **~86** (+9 Canopy, +8 Coconut, +15 Temple, +3 Burrow, +2 Hollow, +1 old corgi section unchanged) | **9** | **6** | **4** | ~166 | Burrow |
| L2 now | 300 | 27 | 3 | 2 | 0 | ~90 | — |
| **L2 layout 2** | **519** | **~62** | **7** | **12** | **3** | ~150 | Cat Flap Alley |
| L3 now | 244 | 23 | 5 | 3 | 0 | ~49 | — |
| **L3 layout 2** | **419** | **~55** | **9** | **6** | **3** | ~85 | Maintenance Ducts |
| Roomba Rush now | 301 | 17 | 2 | 1 | 0 | ~55 | — |
| **Roomba Rush layout 2** | **459** | **~36** | **4** | **2** | **1** | ~84 | Sofa Summit |
| Glowworm Grotto now | 241 | 17 | 2 | 1 | 0 | ~39 | — |
| **Glowworm Grotto layout 2** | **370** | **~34** | **4** | **3** | **1** | ~61 | Lumi's Nest Hollow |

- **Max Tickets** per clear for layout 2 = layout-1 max × the path ratio, rounded up to 5, plus the
  Mystery slots (method 1.7). The rewards-spec's level-budget test checks it.
- **Kennel total with these numbers:** 9 + 7 + 9 + 4 + 4 = 33 in the extended stages, plus L4's 5 and
  L5's 5, for **43**. The parent plan's 3.5 milestones (5, 10, 15, 20, 25, all) and 3.9 dog points
  (1 per 3 dogs, about 14) need updating to that total. That is noted for the parent.

---

### 7A. Golden Bone feasibility audit and fixes

**The rule:** a perfect run, every countable breakable and every dog in **one** run with first-visit
moves, must be possible on every stage. The owner reported that some levels can't be 100%'d. The audit
below confirms it for Scratchpost Canyon and Roomba Rush, fixes both in layout 1, and checks every
layout-2 section and detour.

- **On-foot stages** (L1, L3, Glowworm Grotto): no time pressure was found in layout 1. Bark Rock
  prizes, Good Boy Route and colorPath contents are non-countable, and the Treat Tray can be retried.
- **The two fixes in 7A.1 and 7A.2 can ship before the extension**, as a small bug-fix PR in layout-1
  coordinates, so players can earn those Golden Bones now.

#### 7A.1 Scratchpost Canyon (the chase)

**Model.** This is `ChaseCat.update` (`bigCat.js`, run state), ported from the coordinator's
`audit/chase.mjs`:

- target speed 6.7 at a gap under 5 m, then +0.375 per metre to 8.2 at 9 m, then +0.575 per metre,
  capped at 10.5
- damped with k = 2
- a 7.5 m/s floor while leaping pits and logs
- a catch at a gap under 2.4 m
- Nobu runs at 8 m/s (`TUNING.RUN`) and stands still for `need` seconds at each countable
- on respawn the cat starts 13 m behind the checkpoint with a 1.6 s wait (1.8 s at level start)
- the steady lead at a full run is about 8.3 m

A catch kills through `die()`, so **masks don't help**. Mega Bark would clear the walls, but it is a
later move.

**Needs**, in seconds standing still:

| Countable | Need |
| --- | --- |
| 5-pack wall | 1.5–2.0 |
| 4-pack (gapped) wall | 1.2–1.6 |
| 2-high stack | 0.45–0.7 |
| zipped, by bites | 1.1–1.4 |
| zipped, by a slide | 0.1–0.2 |
| one backpack off the lane | 0.3 |
| one countable on the lane (a slide breaks it) | 0.1 |
| a dog off the lane | 0.4 |

**Budget** is the longest stop at that point that still survives, with every earlier stop in the
same checkpoint segment taken at its need. A countable is **OK** when the budget is ≥ 1.3 × need.

**Layout 1, as shipped:**

| Segment (from) | Countable | Budget | Need | Verdict |
| --- | --- | --- | --- | --- |
| spawn (D 2) | wall D 29 (5) | 2.68 s | 1.5–2.0 | OK |
| Snacks D 97 | wall D 114 (4) | 2.73 s | 1.2–1.6 | OK |
| Snacks D 173 | stack D 246 (2), on its own | 1.01 s | 0.45–0.7 | OK |
| Snacks D 173 | wall D 250 (5), after the stack | **0.58 s** | 1.5–2.0 | **IMPOSSIBLE** |
| Snacks D 173 | zipped D 270, after both | **0 s** | 0.1–0.2 | **IMPOSSIBLE** |

**Fix, as exact edits to `level2.js`** (layout 1; in layout 2 the same lines go through the new
`D()`):

```js
// line 80 area: a new chase checkpoint after the dog
k.snacks(0, 0, D(238));
// line 82: the stack moves 4 m earlier
k.stack(-3.6, 0, D(242), 2);          // was D(246)
// line 83: the last wall gets a gap (4 packs)
packWall(250, true);                  // was packWall(250)
// line 89: no zipped backpack in the chase
k.pack(-3, 0, D(270));                // was k.zipped(-3, 0, D(270)); or move the zipped into the Cardboard Fort in layout 2
// new: a checkpoint after the last gap (this spec's addition; it lifts the D 288 / Vacuum Dock margins)
k.snacks(0, 0, D(268));
// packs at D(284) and D(288) stay where they are
```

**Layout 1 with the fix** (re-run with this spec's port):

| Segment (from) | Countable | Budget | Need | Verdict |
| --- | --- | --- | --- | --- |
| Snacks D 238 | stack D 242 | 2.97 s | 0.7 | OK |
| Snacks D 238 | wall D 250, gapped | 2.02 s | 1.6 | OK (1.26×; it holds at the realistic 1.2–1.6 range) |
| Snacks D 268 | pack D 270 / D 284 / D 288 / Vacuum Dock D 293 | 3.10 / 2.59 / 2.17 / 1.72 s | 0.3 / 0.3 / 0.3 / 0.1 | OK |

- **Without the D 268 Snacks**, D 288 is 0.33 s (TIGHT) and the Vacuum Dock is 0.15 s.
- The dog at D 236 has 1.21 s in layout 1 (need 0.4, OK).

**Layout 2, every L2 checkpoint segment** (final track d, with the corner cuts, the Fort and the
gauntlet tail modelled):

| Segment (from) | Countables, in order: budget / need | Result |
| --- | --- | --- |
| spawn 32 | wall 59: 2.75 / 2.0 · dog 90.5: 0.77 / 0.4 | OK |
| Snacks D 97 (127) | cat 138: 2.84 / 0.2 · wall 144: 2.46 / 1.6 | OK |
| Snacks D 116 (146, new: Cat Flap Alley entry) | sphere 160: 2.54 / 0.1 · dog 176: 2.19 / 0.4 | OK |
| **Snacks SB + 2 (new)** | wall SB + 22: 2.51 / 1.6 · dog SB + 26: 0.94 / 0.4 | OK |
| **Snacks SB + 33 (new)** | wall SB + 42: 3.08 / 1.6 · cat SB + 50: 1.55 / 0.2 | OK |
| (with no Snacks inside the Switchbacks) | wall SB + 22 and later: **0 s** | **IMPOSSIBLE**: why the two Switchbacks Snacks exist |
| Snacks CF + 4 (Fort) | Mystery CF + 8 (cat held) | OK |
| Snacks D 173 (277) | pack SF + 20: 0.97 / 0.4 · pack SF + 22: 0.58 / 0.4 | OK (SF + 22 is 1.45×) |
| **Snacks SF + 30 (moved from + 38)** | dog SF + 34: 3.06 / 0.4 | OK (at + 38 it was 0.42, TIGHT) |
| Snacks SF + 51 (Riverbed entry) | stack SF + 58: 2.96 / 0.7 · pack SF + 75: 1.75 / 0.3 · pack SF + 85: 1.15 / 0.4 · **pack SF + 87.5 (staggered from + 85)**: 0.74 / 0.4 | OK |
| Snacks D 238 (432) | **dog D 258.5 (moved from D 236)**: 0.56 / 0.4 · stack D 242: 3.06 / 0.7 · wall D 250 gapped: 2.10 / 1.6 | OK. With the dog left at D 236 it was 0.48 in the previous segment (TIGHT) |
| **Snacks YA − 1 (new)** | Avalanche packs YA + 12 / + 30 / + 33 / + 46: 2.32 / 2.02 / 1.92 / 1.62 (needs 0.3 / 0.1 / 0.3 / 0.3) | OK |
| Snacks D 268 (517) | packs D 270 / 284 / 288, Vacuum Dock: 3.02 / 2.59 / 2.17 / 1.72 | OK |

- **The cat's corner cuts cost budget.** With cuts and no Switchbacks Snacks the segment is
  impossible. The cut rule (gap after ≥ 3.5 m) stops a cut from **killing** outright, but not from
  using up a player's stop time. Hence a Snacks for each wall.
- **The Avalanche gauntlet tail** needs the chain's average forward speed ≥ 8 m/s (3.7), or its extra
  time is added as a stop in this segment.

**L1 Coconut Run** (coconut: 6.4 m/s close, a 9.0 m/s cap, a catch at 2.0 m, 13 m behind with a 1.6 s
wait):

| Segment | Countables: budget / need | Result |
| --- | --- | --- |
| Snacks CR − 2 | wall CR + 27 (5): 2.91 / 2.0 · stack CR + 47: 0.94 / 0.7 | OK. The stack is 1.34×; with the wall gapped (4) it is 2.91 / 1.6 and 1.0 / 0.7 |

Keep the Coconut Run wall at 5 packs; it is tier 1, but the margins hold. If playtests show players
dying there, gap it.

#### 7A.2 Roomba Rush (the ride)

**Model** (from `audit/ride.mjs`):

- Riding, Nobu **can't bite**, only ram. The player box is ±0.36 m; targets are a backpack or zipped
  ±0.475, a Cat ±0.5, a sphere ±0.45.
- The ride drives at 10.5 m/s, and steering is at most 6.8 m/s sideways.
- Two countables `dx` apart sideways need at least this much d between them:
  `(|dx| − 1.67) / 6.8 × 10.5 + 1 m`.
  - 2.6 m apart → **≥ 2.5 m**; 4.8 m → 5.8 m; 5.2 m → **≥ 6.5 m**; 6.0 m → 7.7 m.
  - Use 1.3× that on slippery floors.

**Layout 1, as shipped:** only 6 of 11 countables can be reached in one run.

| d | Group | Problem |
| --- | --- | --- |
| 68 | packs at −2.6, 0, 2.6 | 1 of 3 per run |
| 160 | zipped −2.4, pack 2.4 | 1 of 2 |
| 222 | cat −2.6, pack 2.6 | 1 of 2 |
| 270 | packs −2.6, 0 | 1 of 2 |

**Fix, as exact edits to `bonusRide.js`** (layout 1 lines; in layout 2 wrap d ≥ 130 in `S()`):

```js
// line 29: a diagonal row instead of a wall
k.packs([[-2.6, 64], [0, 68], [2.6, 72]]);                   // was all at 68
// lines 43-44: stagger by 6.5 m (4.8 m apart needs 5.8 m)
k.zipped(-2.4, 0, 160); k.pack(2.4, 0, 166.5);               // was both at 160
// line 55: 5.2 m apart needs 6.5 m
k.cat(-2.6, 0, 222); k.pack(2.6, 0, 229);                    // was both at 222
// line 61: 2.6 m apart needs 2.5 m
k.pack(-2.6, 0, 270); k.pack(0, 0, 273); k.leg(2.7, 0, 270, { h: 3.4 });   // was packs both at 270
```

- **Zipped backpacks on a ride:** a Zipped Backpack takes three bites or bounces
  (`breakables.js` `ZippedBackpack`). Check whether **one ram** opens it fully on a ride. If not,
  replace the two zipped backpacks in Roomba Rush (d 160, and the new one in the Split) with plain
  backpacks.
- **Layout 2 check:** every layout-2 Roomba Rush countable, sorted by d, passes the stagger rule
  (`ride-reach` port, 0 failures). That covers the old rows after the fix, the Split's living-room
  side, the staggered Toy Box packs (TB + 31 / + 33.5), and the slippery Tile Slide order (cat −3.4,
  pack 2.6, cat 3.4, pack −2.6, Snacks 0, at TS + 6 / 16 / 20 / 30 / 38).
- **The Split** puts every countable on one side (5.3). A run can only take one side of a solid
  divider.

#### 7A.3 New on-foot sections (L1, L3, Glowworm Grotto)

No chase, so there is no stop budget. The checks are reachability with first-visit moves, and no
countable left behind a one-way step.

| Section | Countables reachable going forward? | One-way steps | Result |
| --- | --- | --- | --- |
| L1 Canopy Walk | yes: the ground packs CW + 9 / + 11 come before the first line; the platform packs CW + 30.5 are on the route; the Mystery is on the safe branch | the ziplines are one-way, but nothing countable is passed under them | OK |
| L1 Sunken Temple | yes: the stairs, then the causeway (only tickets on the planks), then the altar, all in order | zipline ST + 41 and crumbles + 52 / + 54.5 (nothing countable behind them) | OK |
| L1 box gauntlet | the boxes themselves, per `box-gauntlets-spec.md` | one route | OK, if the box spec counts its boxes |
| L3 Sorting Belts | yes; the Dust Wall extra is non-countable | none | OK |
| L3 Packaging Line | yes; the pack on the high box (PL + 34) can be reached on every box cycle | none (2.5D, so you can walk back) | OK |
| L3 Vat Overflow | yes: the exit-ledge packs; the climb boxes per the box spec | rising vat (timing) | OK. A death resets the vat (4.5) |
| Glowworm River / Cavern / Crystal Echo | yes | mushroom chain (re-climbable from the Cavern floor) | OK |

#### 7A.4 Detours: one row each

| Detour | Kind | Exit | Skipped main-path stretch | Countables on it | Can you walk back? | Result |
| --- | --- | --- | --- | --- | --- | --- |
| L1 The Burrow | sunken open trench | downstream (mushroom at 251) | 226–251: the coconut hill end and the last gap | sphere 230, cat 236 (moved to x 0.4), rug 237.5 | yes: back over the 239–246 gap (double jump either way), uphill against the rolling coconuts | OK. Falling in from the hill means walking back |
| L1 Waterfall Hollow | raised | downstream (ST + 66, on the altar) | ST + 29 … + 66 | cat ST + 62, stack + 62, pack + 63.5 (all on the altar floor) | yes: 4 m on the same floor; the one-way zipline and crumbles have no countables | OK |
| L2 Cat Flap Alley | raised, **loop** | `D(117)`, by the flap | none | — | — | OK. Entry Snacks D 116, exit chase-reset Snacks D 117.5 |
| L2 Dry Riverbed | beyond the wall, **loop** | SF + 52.5 | none | — | — | OK. Entry Snacks SF + 51, exit reset Snacks SF + 53 |
| L3 Maintenance Ducts | raised | downstream (201) | 188–201, the hammer hall | the old Snacks at 190.5 | yes: the hammers swing both ways | OK |
| L3 Overhead Rails | raised | downstream (311) | 276–311 | the fan catwalk's 1UP and pack, dogs at 279.2 and 294.5, the lint roller at 310.5 | yes: the crushers cycle both ways; the fan lifts from the floor | OK. Long (35 m), so the Sniffer points back |
| Roomba Sofa Summit | raised, **loop** | SP + 46 | none | — | — | OK |
| Glowworm Lumi's Nest Hollow | sunken, under the open pit | downstream (283) | 267–283 | none (unbreakable lunchboxes) | not needed | OK |

**No detour is under water or smog.** The sunken ones are above the kill plane, −12 or the water
level −0.5. The Burrow's mud is at −5.8 under a floor at −4.5, which kills only if Nobu falls into it.

#### 7A.5 Tests (pure, `npm test`)

- **Data export.** Breakables and dogs are exported as data so the tests don't parse JS.
  `src/levels/layouts.js` gains:

  ```js
  // Chase countables per stage, final d: [kind, x, d]; plus Snacks and blocked spans (pits, logs).
  export const CHASE_DATA = { 2: { snacks: [...], blocked: [...], cuts: [...], hold: [[CF + 1, CF + 13, CF - 1]], items: [...] }, '1cr': {...} };
  export const RIDE_DATA = { ride: { items: [['pack', -2.6, 64], ...], slippery: [[TS, TS + 40]] } };
  ```

- **Wiring.** `level2.js` and `bonusRide.js` place their countables **from this data** with one loop
  (`for (const [kind, x, d] of RIDE_DATA.ride.items) k[kind](x, 0, d)`), so the test and the level
  can't drift apart. Other content stays hand-authored.

| File | What it checks |
| --- | --- |
| `tests/chase-budget.test.js` (new) | Port `audit/chase.mjs` as `simulateChase({ start, catStart, delay, stops, until, blocked, cuts, band, catchAt, mul })` in `src/levels/chaseModel.js` (pure, with the same constants as `ChaseCat`). **(1)** Layout 1 as shipped: the D 250 wall budget is < 1.5 s (documents the bug; delete after the fix ships). **(2)** For every segment in `CHASE_DATA[2]` and `CHASE_DATA['1cr']`, every countable's budget ≥ 1.3 × its need (needs by kind from the 7A.1 table). **(3)** The DDA multiplier 0.92 only increases budgets. **(4)** Steady lead at a full run, ≥ 8 m. **(5)** The constants match `ChaseCat`: 6.7, 10.5, 2.4, 0.375, 0.575, by importing them from a shared `CHASE_TUNING` export that `bigCat.js` uses too |
| `tests/ride-reach.test.js` (new) | Port `audit/ride.mjs`. **(1)** Layout 1 as shipped: 5 failing pairs (documents the bug; delete after the fix). **(2)** `RIDE_DATA.ride.items`, sorted by d: every consecutive pair meets `(|dx| − 1.67) / 6.8 × 10.5 + 1` (× 1.3 on slippery spans). **(3)** No two countables share a d unless `|dx| ≤ 1.67`. **(4)** Every countable is on the reachable side of any divider (the Split) |

---

### 8. Trial layout versioning

#### 8.1 Why

- Every extended main level is about 1.7× longer. Layout-1 times can't be matched, layout-1 medal
  targets are wrong, and the hub floor for layout 1 is too low for layout 2.
- Plan 6.3 and 12.6 decided to **version the boards** and keep the old ones as read-only "Classic."

#### 8.2 NOBU: `src/config/trials.js`

```js
export const TRIAL_LAYOUT = 2;                                   // the layout the game ships
export const TRIAL_LEVELS = Object.freeze([1, 2, 3]);
/** Board variant for (level, layout): "1" for layout 1 (Classic), "1v2" for layout 2. */
export const trialVariant = (level, layout = TRIAL_LAYOUT) => (layout === 1 ? String(level) : `${level}v${layout}`);
export const TRIAL_FLOOR_MS = Object.freeze({
  1: 15000, 2: 15000, 3: 12000,                                  // Classic: never changes
  '1v2': 25700, '2v2': 26000, '3v2': 20600,
});
export const TRIAL_TARGETS = Object.freeze({
  1: [55, 70, 92], 2: [52, 66, 90], 3: [45, 58, 78],             // Classic [gold, silver, bronze]
  '1v2': [94, 120, 158, 86], '2v2': [90, 114, 156, 82], '3v2': [77, 100, 134, 70],  // + platinum
});
export function trialMedal(variant, t) {
  const g = TRIAL_TARGETS[variant]; if (!g) return null;
  return g[3] != null && t <= g[3] ? 'platinum' : t <= g[0] ? 'gold' : t <= g[1] ? 'silver' : t <= g[2] ? 'bronze' : null;
}
export function trialMsInBounds(variant, ms) {
  const floor = TRIAL_FLOOR_MS[String(variant)];
  return floor != null && Number.isInteger(ms) && ms >= floor && ms <= TRIAL_CEIL_MS;
}
```

- **Callers.** Every caller that passed a level now passes `trialVariant(level)`:
  - `session.js` (the trial finish, around line 282–297)
  - `scoreQueue.enqueue`
  - `save.sanitizeTrial`
  - the map panel in `game.js`
  - `hubBridge.trialTop`
- The Platinum Tag comes from plan 4.5. `rewards-spec.md` owns its UI; this file only adds the fourth
  target.

#### 8.3 Save (`src/core/save.js`)

The v3 schema is owned by `rewards-spec.md`. This spec adds two fields:

```js
trials: {},          // layout-2 bests: { 1: { best, ms, medal, at, deaths, freezeMs, pid, layout: 2 } }
trialsClassic: {},   // layout-1 bests moved out of `trials`: same shape, layout: 1, read-only
```

- **Migration** (inside the v2 → v3 step, `save.load`):
  1. For each `level` in `old.trials`: run `sanitizeTrial(level, e)` with the **Classic** variant. If
     it is valid, set `trialsClassic[level] = { ...e, layout: 1 }`.
  2. Set `trials = {}`. **No layout-1 time is ever kept as a layout-2 best.**
  3. Idempotent: a save that already has `trialsClassic` is not migrated again. Entries in `trials`
     with `layout !== 2` are moved, never dropped.
- **`sanitizeTrials(raw, layout)`:**
  - checks `e.ms >= TRIAL_FLOOR_MS[trialVariant(level, layout)]`
  - sets `medal` from `trialMedal(variant, best)`
  - stores `layout`
- **`sanitize`:** adds `d.trialsClassic = sanitizeTrials(d.trialsClassic, 1)`.
- **`mergeScores`** (multi-tab): merges `trials` and `trialsClassic` separately. Faster wins within the
  same layout only.
- **`reset()` (New Game):** keeps both maps (bests are public and permanent, `save.js` reset comment).
- **`totalTrialMs()`:** sums layout-2 bests only.

#### 8.4 Score queue (`src/hub/scoreQueue.js`)

- **Row key** becomes the variant: `nobu_trial_time:1v2`.
  - `rowKey(level)` becomes `rowKey(variant)`.
  - `pendingRows` parses the key with `key.slice(TRIAL_BOARD.length + 1)` **as a string**. Today it
    uses `Number(...)` (line 88), which would turn `"1v2"` into NaN.
  - Each row carries `{ variant, level, ms, meta }`.
- **`enqueue(playerId, level, ms, meta)`** becomes `enqueue(playerId, variant, ms, meta)`:
  - bounds via `trialMsInBounds(variant, ms)`
  - `meta.level = variant` (a string)
  - `posted[playerId][variant]`
- **Layout-1 rows still queued at upgrade time are dropped** on the first `readQueue()` after the
  update.
  - They would still be accepted by the hub (variant "1" stays valid). But a layout-1 time can't be
    set any more, and posting one late would put a stale run on the Classic board.
  - The drop rule: rows whose key has no `v` suffix are deleted from `rows`. `posted` entries for
    variants "1"–"3" are kept for `knownBest`.
  - **Alternative, not chosen:** flush them to the Classic board. The owner can switch this with one
    flag, `FLUSH_CLASSIC_ON_UPGRADE`, default `false`.
- **Version** the stored queue: `v: 2`. A `v: 1` queue on read gets the drop rule, then is written
  back as `v: 2`.
- `SCORE_QUEUE_KEY` stays `nobu-hub-scores-v1`. Renaming it would lose rows on rollback.

#### 8.5 Hub bridge (`src/hub/hubBridge.js`)

- `submitScore(ms, level, meta)` (line 976) sends `meta: { ...meta, level: trialVariant(level), layout: 2, build, v: 2 }`.
- `trialTop(level)` (line 1033) reads `{ variant: trialVariant(level) }`. It adds
  `trialTopClassic(level)`, which reads variant `String(level)`.
- The map panel shows:

  ```
  WORLD top 1:31.20 · you #4
  Classic best 0:58.33 · Classic WR 0:51.90
  ```

  The second line only appears when a Classic best or WR exists.

#### 8.6 Classic replays

- Layout 1 is **not playable** after the update. The old `MOVES[id]` list stays only for tests.
- This keeps the code simple. Classic boards are an archive, not a mode.
- If the owner wants Classic replays later, `layouts.js` already holds both move lists. A
  `layout: 1` build path would need the old content lines too, so that needs a separate decision.

#### 8.7 metaverse-hub PR (cross-repo; owner deploys)

| File | Change |
| --- | --- |
| `server/modules/src/leaderboard.ts:31` | `NOBU_FLOOR_MS = { "1": 15000, "2": 15000, "3": 12000, "1v2": 25700, "2v2": 26000, "3v2": 20600 }`. `variantFor` (line 192) already accepts any string key that is in this table, so it needs no change |
| `server/modules/src/schema.ts` | none: `ranked_score.variant` is `text` (line 1835) and the primary key includes it |
| `server/test/unit/leaderboard.test.ts` | cases for `1v2`, `2v2`, `3v2`: accepted at the floor, `implausible_score` 1 ms below it, and `bad_variant` for `4v2` |
| `apps/hub/src/m3/types.ts:37-58` | add `'nobu_trial_time:1v2'`, `'nobu_trial_time:2v2'` and `'nobu_trial_time:3v2'` to `HUB_BOARD_IDS` and `BOARD_META` (titles `NOBU · LEVEL 1`, …). Rename the old titles `NOBU · LEVEL 1 CLASSIC`, …. The plaza wall cycles the new ones first |
| `apps/hub/src/m3/stub.ts:61-66` | stub values for the new ids (× 1.72) |
| `apps/hub/test/net.test.ts`, `packages/hub-sdk/test/sdk.test.ts` | update the board-id lists |
| `packages/hub-sdk` | no API change (`variant` is already a string, `live.ts:442` checks the board id only). **Re-vendor anyway** so the vendored types and tests match |
| Docs (`docs/m3-server-prep.md`, Contract C13) | "variant is the NOBU level ('1'..'3'), or '<level>v<layout>' for later layouts" |

**Deploy order** (plan 10.2 and `handoff.md`):

1. Merge and deploy the hub server change (the floors). Run it on production Nakama.
2. Deploy the hub app (plaza boards).
3. Merge the NOBU layout-2 PR, re-vendor the SDK, and redeploy NOBU.
4. If NOBU goes first: layout-2 runs queue rows that the old server rejects with `bad_variant`.
   **`bad_variant` must be classified `keep`, not `drop`,** in `scoreQueue.classify` for layout-2
   variants, so nothing is lost. Today `classify` drops on the final codes; check that `bad_variant`
   is among them (`score-queue.test.js:62`) and add an exception for `/v\d+$/` variants.
5. Tell players before step 3. Public scores launched recently (plan 12.6).

#### 8.8 Keep earned bones

- `game.js:719-723` sets `d.bones[n - 1] = true` and never sets it false. That already implements
  "never revoked." The v3 Bone Board keeps that rule (owner: rewards-spec):
  - `boneBoard[level].golden = old || new`, never recomputed to false.
- **New in layout 2:** the results screen and pause board compute "Golden Bone still possible" from
  the **current** layout's breakable and dog totals. A player who earned the Golden Bone on layout 1
  sees it earned and also sees the layout-2 counters, for example `Backpacks 41/86 (Golden Bone
  already earned)`.
  - So the new content is still a goal, the "Completion %" (plan 3.9) gives no double credit, and
    nothing is taken away.
- **`bestDogs[level]`:** keep the max as now. The map shows `Dogs best 5/9` after the update.

---

### 9. Implementation order (inside milestone M2b)

1. `layouts.js` (moves, splices, shifter) and `tests/track-layout.test.js`. No gameplay change; the
   level files still build layout 1.
2. Kit additions this spec relies on:
   - from `new-levels-spec.md`: `section`, `chase`, `zipline`, `detour`, `dark`, `rising`,
     `pitySnacks`, `mystery`, `dustWall`, `moonLedge`, `smogVent`, `zoomieGate`, and the `side` and
     `rise` cameras
   - option additions listed here: `Crusher.topple`, `belt({ reverse })`,
     `CoconutRoller({ model, scale, skip })`, `hammer({ tint })`, `lint({ scope })`, `k.crystal`,
     platforms with `visible: false`
3. Glowworm Grotto first: it is the smallest, has no chase, and tests the trench and nests.
4. Roomba Rush: ride-only entry.
5. L3, L1, then L2 last (the chase retune is the riskiest).
6. Trial versioning (8.2–8.5) in the same PR as the last level, so a mixed state never ships.
7. The hub PR (8.7) in parallel, deployed first.

---

### 10. Tests

| File | Cases |
| --- | --- |
| `tests/track-layout.test.js` (new) | For each stage: build `Track(turtle(START, MOVES))` and `MOVES_V2` (`three` math only, safe in Vitest). (a) `abs(newLen - oldLen - totalAdded) < 0.6`. (b) For each splice, a turtle boundary within 1.0 m of `S(at) - X`, the insertion point. (c) Clearance: for sample points 2 m apart and ≥ 60 m apart in d, world distance ≥ 40 m. (d) `S` is monotonic and `S(at - 0.001) + X ≈ S(at)` |
| `tests/level-splices.test.js` (new) | Reads each level's source. Every two-distance kit call (`floor`, `tix`, `tixArc`, `coconuts`, `belt`, `ropeBridge`, `water`) whose ends map across a splice must be on the straddler list in 2.2 / 3.2 / 4.2 / 5.2 / 6.2 or the exception list (the Burrow trench) |
| `tests/trials-bounds.test.js` (update) | `TRIAL_FLOOR_MS` matches the hub table for all six variants. `gateDistance(level)` evaluates `S(...)` and the new `D` by importing `SPLICES` from `layouts.js` (its regex `trackD` learns `S(n)`). It asserts **path ≥ 400** for layout 2 and `fastestMs > floor` for `'1v2'`, `'2v2'` and `'3v2'`. `trialMsInBounds('1v2', 25700) === true`, `trialMsInBounds('1v2', 25699) === false`, `trialMsInBounds('1', 15000) === true` |
| `tests/trial-layout.test.js` (new) | (1) A v2 save with `trials: { 1: { ms: 52000 } }` migrates to `trialsClassic[1].ms === 52000`, `layout === 1`, and `trials` is empty. (2) Migrating twice is a no-op. (3) `mergeScores` keeps the faster time per layout and never mixes layouts. (4) `trialMedal('1v2', 85)` is `'platinum'`, `trialMedal('1v2', 94)` is `'gold'`, `trialMedal('1', 55)` is `'gold'`. (5) `reset()` keeps both maps |
| `tests/score-queue.test.js` (update) | (1) A v1 queue holding `nobu_trial_time:2` is dropped on read, and `posted` is kept. (2) `enqueue(pid, '2v2', 26000)` queues with `meta.level === '2v2'`. (3) `pendingRows` returns string variants. (4) `bad_variant` on a `v2` row is `keep`. (5) Rows for `'1v2'` below 25 700 are never queued |
| `tests/bone-keep.test.js` (new) | (1) `bones[0] === true` from layout 1 stays true after a layout-2 clear with 41/86 broken. (2) The results data for that clear shows `goldenEarned: true` and the counters 41/86. (3) `bestDogs[0]` stays 5 after a run that freed 4 |
| `tests/chase-budget.test.js`, `tests/ride-reach.test.js` (new) | Section 7A.5 |
| `tests/chase.test.js` (new, pure) | Extract the rubber-band target function from `ChaseCat` into `chaseTarget(gap, mul)`. (1) `chaseTarget(4, 1) === 6.7`. (2) `chaseTarget(30, 1) === 10.5`. (3) `chaseTarget(30, 0.92) ≈ 9.66`. (4) The corner-cut rule: a cut is skipped when `gapAfter < 3.5`. (5) The vertical check: no catch when `abs(dy) >= 2.5` |

Run with `npm test`. Browser behaviour needs the playtests in section 11.

---

### 11. Playtest checklists

#### 11.1 Shared (every stage)

- [ ] Spawn, every Snacks and every pity spot respawn on solid ground, facing forward.
- [ ] Old content past each splice sits where it did relative to the ground and walls. Check: no
      floating backpacks, no enemies inside walls. Compare screenshots of the old and new builds at the
      same section.
- [ ] Each straddler on the list looks right. Floors are continuous where they should be.
- [ ] Dogs: the HUD counter reaches the new total (9 / 7 / 9 / 4 / 4). "ALL DOGS FREE!" appears.
- [ ] A Golden Bone run is possible with first-visit moves only. No dog or countable breakable is behind
      a gate.
- [ ] Gated objects show as gated (fuzz, glow or vent). The Sniffer hint names the move (rewards-spec).
- [ ] The missed-backpack rain at the end counts the new breakables.
- [ ] Time trial: the clock ends at the new gate trigger. A run posts to the `v2` variant (dev hub)
      and the map shows the Classic line.
- [ ] God mode: pits in new sections bounce Nobu back. Nothing posts.
- [ ] Frame time is stable on the longest stage (L1, 547 m of decor). If merged decor is too heavy,
      lower the `banks` density past d 320.
- [ ] New tutorial ids show once: `zipline`, `chase`, `cutcorner`, `sorting` (text in
      `story/script.js` `TUTORIALS`).

#### 11.2 L1

- [ ] Canopy: a fall from the first zipline lands on ground, not in the ravine.
- [ ] Falling from the left edge of the coconut hill lands in the Burrow, not death. You can come back
      out by the mushroom at 251.
- [ ] Coconut Run: the camera turns smoothly, and Down runs away. A player who doesn't stop is never
      caught. The coconut respawns 13 m behind the Snacks.
- [ ] The Lint Roller at 338 doesn't leave dangerous rugs later (there are none past 338).
- [ ] Sunken Temple: flip-plank timing is readable from the camera. The altar dog is reachable from the
      Bone Switch stairs. Hammer and coconut timing has a gap in every cycle.
- [ ] Waterfall Hollow: falling returns Nobu to the lily pad with nothing lost. The exit lands next to
      the altar.
- [ ] Median first-play deaths across 3 players: about 6–10 for the whole level, tier 1 scaled for
      length (plan 4.4 said 2–4 for 314 m).

#### 11.3 L2

- [ ] Switchbacks: on each bend the cat cuts only when the gap allows. Never a catch that couldn't be
      avoided.
- [ ] Cardboard Fort: the cat waits at the mouth. It comes back strong but can be beaten.
- [ ] Scratchpost Forest: every toppling post's shadow shows ≥ 0.8 s before it lands.
- [ ] Cat Flap Alley and the Dry Riverbed: no catch while inside. On exit the cat is behind.
- [ ] Yarn Avalanche: each volley has a free lane, shown by the shadow.
- [ ] The Vacuum Dock (old 293, new 512) still pops every rug; new rugs (Switchbacks) are before it.
- [ ] Median deaths: about 8–12.

#### 11.4 L3

- [ ] Sorting Belts: the reversing belt's siren comes a full second before it flips.
- [ ] Packaging Line: the side camera keeps Nobu centred. Left and right map to backward and forward,
      and switch back cleanly at the end.
- [ ] Vat Overflow: from the switch, an average climb reaches the top with ≥ 3 s left. The pity
      checkpoint drains the vat.
- [ ] The blue bone (moved to about 281) is still on the fan catwalk and still opens L2's blue path.
- [ ] Median deaths: about 10–16.

#### 11.5 Roomba Rush

- [ ] The split's divider is solid. Both sides are fair at full speed (10.5 m/s).
- [ ] Ramps: every landing is reachable without steering. Toy piles can be dodged after landing.
- [ ] Tile slide: momentum is noticeable but the vacuum can be controlled.
- [ ] Dog door: the opening is visible from the ramp top.
- [ ] Sofa Summit: works with the fallback raised floors if `entry: 'ramp'` isn't built.

#### 11.6 Glowworm Grotto

- [ ] Lumi's nests never leave more than about 60 m of dark.
- [ ] River rafts loop without crushing Nobu against the islet.
- [ ] Mushroom chain: each bounce lands on the next pillar from a straight approach.
- [ ] Crystal Echo: stones are solid even when unlit (no unfair falls through). The light time is
      enough to see the next 2 stones.
- [ ] Lumi's Nest Hollow is lit. The exit lands on the right-lane floor.

---

### 12. Open items for the parent

1. **The plan needs updating to the new targets.** In section 6.3 that means the lengths, sections,
   detours and trial targets (this spec replaces them). The Kennel milestones (3.5) and dog points
   (3.9) need the new dog total, about 43 with L4 and L5.
2. **The kit owner should confirm** the detour entry kinds used here: `pipe`, `flap`, `duct`,
   `launch` and `ramp`. Also the `k.section(..., { camera })` option, the `Crusher.topple`,
   `belt({ reverse })` and `k.crystal` additions, and the `chase.hold()` / `begin()` API on the
   generalised chaser.
3. **Ticket caps** for layout 2 need the owner's sign-off (1.7 method). Longer clears mean more
   `level_end` chunks.
4. **Audit fixes 7A.1 and 7A.2 can ship now,** in layout-1 coordinates, ahead of the extension. They
   change existing gameplay slightly: an extra Snacks, a gapped wall, a plain backpack instead of the
   zipped one, and staggered ride rows.
5. **Box-gauntlet questions** for `box-gauntlets-spec.md`: whether boxes are countable, and whether
   `arrowChain` gives a forward push of ≥ 8 m/s (needed in the L2 chase, 3.7).
6. **The zipped-backpack ram** on rides needs checking (7A.2).
7. **Plan conflicts resolved here:**
   - L1 Moon Ledge vs the Burrow Hidden Bone: the Burrow keeps the bone (2.8).
   - The L3 glide gap vs the Ducts Hidden Bone: the Ducts keep the bone (4.8).
   - Classic layout replay: not supported (8.6).

---

# Part 8: Box Gauntlets spec

Source: `docs/expansion/box-gauntlets-spec.md`

## Box gauntlets spec: timing helpers, patterns and the three Polaroid stages

Status: **spec only.** No game code has changed. Written 2026-11-04 against `main` at `bfb4a33`.

This spec covers what the owner asked for: "the new levels should be harder too. Some levels where you can
only pass by timing jumps correctly on boxes."

It does three things:

1. It **owns five new kit helpers** for timed boxes: `k.blinkBox`, `k.bounceChain`, `k.fallBox`,
   `k.slideBox` and `k.arrowChain`. The other specs use these exact signatures.
2. It gives the **jump maths** and a **fairness table** for each tier, so a gauntlet can be checked on
   paper and in a test before anyone plays it.
3. It defines **16 reusable gauntlet patterns** and **three standalone Box Gauntlet stages** (G1, G2, G3).
   Each stage unlocks through a **Polaroid**, which works like Crash 4's Flashback Tapes.

Read first: `docs/gameplay-expansion-plan.md` (sections 4.1 tiers, 4.3 DDA, 3.4 bones, 9 placeholders) and
`docs/expansion/new-levels-spec.md` (kit API conventions).

---

### 0. Conventions

- **Coordinates** are track coordinates, as in the level files:
  - `x`: lateral offset, positive to the right.
  - `y`: height above the path.
  - `d`: distance along the path.
- Patterns use **relative** distance `dd`, measured from the pattern's start `d0`.
- **Box tops:**
  - A steel lunchbox at `y` has its top at `y + 0.98` (`Lunchbox` solid, `breakables.js:783`).
  - A backpack at `y` has its top at `y + 1.0` (`Backpack` solid, `breakables.js:75`).
  - "Top to top" means the change in height between the surfaces Nobu stands on.
- **Distances** are centre to centre, measured along the path.
- **Frames** are at 60 fps: 1 frame = 16.7 ms.
- **Landing overlap:** Nobu's body is 0.72 m wide (`pbox` ±0.36), and a box is about 0.95–1.0 m. Nobu
  stands on a box while his centre is within **±0.83 m** of the box centre. Patterns aim for the centre;
  the margin left over is the "landing margin".
- **Tiers** follow `LEVEL_TIER` in plan 4.1. Gauntlet stages use half tiers: G1 = 1.5, G2 = 3.5,
  G3 = 4.5.
- **Placeholders only.** Every new piece is a re-tinted steel `Lunchbox` mesh (`lunchMats()` in
  `breakables.js`), the existing `Backpack` model, or `toon()` materials. No new asset files.

---

### 1. Jump maths

#### 1.1 Movement numbers (from `src/player/player.js`)

| Constant | Value | Where it matters |
| --- | --- | --- |
| `RUN` | 8.0 m/s | Horizontal speed in the air too (`AIR_ACCEL` 42 reaches it in 0.19 s) |
| `JUMP` | 12.6 m/s | Ground jump |
| `DOUBLE_JUMP` | 11.2 m/s | Air jump; refilled by every bounce (`bounce()` sets `canDouble = true`) |
| `GRAVITY` | 36 m/s² | Rising |
| `FALL_MULT` | 1.4 | Falling gravity is 50.4 m/s² |
| `MAX_FALL` | 28 m/s | Terminal fall speed |
| Apex hang | gravity × 0.55 while jump is held and \|vy\| < 2.2, unless the jump was cut | Held jumps float at the top |
| Jump cut | releasing jump while rising multiplies vy by 0.55, once | A tap gives a short hop |
| `COYOTE` | 0.11 s (6 frames) | Jump after leaving an edge, or after a box vanishes |
| `BUFFER` | 0.13 s (7 frames) | A press just before landing still jumps |
| `STOMP_BOUNCE` | 10.5 m/s | Landing on a backpack, enemy or armed Cat |
| Bounce while holding jump | `v × 1.15`, no cut, apex hang allowed | `bounce(v)` |
| Arrow lunchbox | `bounce(power, { allowCut: false })`: `v = power × 1.15` if jump is held, else `power`; always counted as cut, so **no apex hang** | `Lunchbox.onLand` |
| Tail Glide | fall speed capped at 2.4 m/s while jump is held, out of air jumps | after the Mecha Bird |
| Zoomies | run speed × 1.55 = 12.4 m/s | after the Big Cat |
| Slide jump | starts at 10.5 m/s horizontal, but air control pulls it back to 8 within 0.06 s | **adds only about 0.1 m.** The tip in `story/script.js` (`BETWEEN[1]`) oversells it; Zoomies is the real long jump. |

#### 1.2 Reach table

Numbers below come from integrating at a fixed 1/60 s in the same order the game uses (velocity, then
position). The test in section 6 uses the same integrator. Distances assume full run speed for the whole
jump; a player can always land shorter by easing off the stick.

**Same height (top to top, dy = 0):**

| Move | Apex (m) | Airtime (s) | Max distance (m) |
| --- | --- | --- | --- |
| Tap jump (released at once) | 0.61 | 0.35 | 2.80 |
| Held jump | 2.14 | 0.72 | 5.73 |
| Double jump, timed for height (second press at 0.38 s) | 3.82 | 1.15 | 9.20 |
| Double jump, timed for distance (second press at 0.63 s) | 2.68 | 1.35 | 10.80 |
| Zoomies held jump (12.4 m/s) | 2.14 | 0.72 | 8.89 |
| Zoomies double jump | 2.68 | 1.35 | 16.74 |
| Bounce, jump not held (10.5) | 1.45 | 0.53 | 4.27 |
| Bounce, jump held (12.075, with hang) | 1.97 | 0.70 | 5.60 |
| Bounce held + double | 2.15 | — | 10.67 |
| Arrow 13, tap / held | 2.24 / 2.98 | — | 5.33 / 6.13 |
| Arrow 14, tap / held | 2.61 / 3.47 | — | 5.73 / 6.53 |
| Arrow 16, tap / held | 3.42 / 4.55 | 0.82 / 0.93 | 6.53 / 7.47 |
| Arrow 18, tap / held | 4.35 / 5.78 | — | 7.33 / 8.40 |
| Arrow 16 held + double | 4.55 | — | 12.67 |
| Double + Tail Glide, back to the same height | — | 2.37 | 18.93 |

**Landing higher or lower (max distance in m at full run speed):**

| dy (top to top) | Held jump | Bounce, tap | Bounce, held | Arrow 16, tap | Arrow 16, held |
| --- | --- | --- | --- | --- | --- |
| −2 | 6.67 | 5.33 | 6.53 | 7.33 | 8.13 |
| −1 | 6.27 | 4.80 | 6.13 | 6.93 | 7.87 |
| 0 | 5.73 | 4.27 | 5.60 | 6.53 | 7.47 |
| +1 | 5.20 | 3.47 | 4.93 | 6.00 | 7.07 |
| +2 | 4.00 | — | — | 5.47 | 6.67 |

- **A tap jump can't climb a box.** Its apex is 0.61 m and a box top is 0.98 m. Climbing needs a held jump,
  or a hop from a higher surface.
- **Tail Glide** covers 3.33 m forward for every metre dropped (8 / 2.4).
- **Airtime to land at dy** (s), used for timing windows:

  | dy | Held jump | Tap jump | Bounce tap | Bounce held | Arrow 16 tap | Arrow 16 held |
  | --- | --- | --- | --- | --- | --- | --- |
  | −2 | 0.83 | 0.52 | 0.67 | 0.82 | 0.92 | 1.02 |
  | −1 | 0.78 | 0.45 | 0.60 | 0.77 | 0.87 | 0.98 |
  | 0 | 0.72 | 0.35 | 0.53 | 0.70 | 0.82 | 0.93 |
  | +1 | 0.65 | — | 0.43 | 0.62 | 0.75 | 0.88 |
  | +2 | 0.50 | — | — | — | 0.68 | 0.83 |

- **The arrow arc in closed form** (no hang, so it's exact apart from the per-frame error):
  - `v = power` (tap) or `1.15 × power` (held)
  - `apex = v² / 72`
  - `t_up = v / 36`
  - `t_down = sqrt(2 × (apex − dy) / 50.4)`
  - `dist = 8 × (t_up + t_down)`
  - Example, power 16 tap: apex 3.56, t_up 0.444, t_down 0.376, dist 6.56 m. The per-frame sim gives 6.53.
  - `gauntletMath.arrowReach()` uses this form. Tests allow 3%.

#### 1.3 Double-jump timing windows

These are the frames in which the second press still makes the landing.

| Target | Window |
| --- | --- |
| +3.0 m at 4.0 m | press between 0.15 and 0.62 s after take-off: **29 frames** |
| +3.4 m at 4.0 m | 0.17–0.57 s: **25 frames** |
| +2.5 m at 6.0 m | 0.18–0.67 s: **30 frames** |
| +2.0 m at 8.0 m | 0.35–0.70 s: **22 frames** |

#### 1.4 Fairness table per tier

Each timed element must meet every column for its tier.

| Tier | Min input window | Max required distance (% of reach) | Min landing margin | Max timed actions before a rest spot | Min tell before a state change |
| --- | --- | --- | --- | --- | --- |
| 1 | 30 f (0.50 s) | 75% | 0.60 m | 3 | 0.60 s |
| 2 | 24 f (0.40 s) | 80% | 0.50 m | 4 | 0.50 s |
| 3 | 18 f (0.30 s) | 86% | 0.40 m | 6 | 0.45 s |
| 4 | 12 f (0.20 s) | 92% | 0.30 m | 8 | 0.40 s |
| 5 | 9 f (0.15 s) | 96% | 0.25 m | 10 | 0.35 s |

- **Half tiers** (1.5, 3.5, 4.5) use the mean of the two rows, rounded toward the easier one:
  - G1, tier 1.5: 27 f window, 77% of reach, 0.55 m margin, 3 actions, 0.55 s tell.
  - G2, tier 3.5: 15 f, 89%, 0.35 m, 7 actions, 0.43 s.
  - G3, tier 4.5: 11 f, 94%, 0.28 m, 9 actions, 0.38 s.
- **Absolute floor:** no window is ever under **8 frames**. The jump buffer is 7.8 frames, so a buffered
  press always fits.
- **"Input window"** means:
  - For a blink pair: the take-off times that land on the next box while it's solid (see 2.1).
  - For a fall box: its delay plus coyote time.
  - For a slider: the time per cycle in which the jump fits.
  - For a double jump: the frames in 1.3.
- **"Rest spot":** a surface that stays solid forever, such as floor, a plain lunchbox or a stopped
  slider end. Nobu can stand there and watch the next rhythm for as long as he likes.
- **Tell rule:** every state change (box vanishing, box falling, slider reversing) is shown at least
  `max(0.3 s, tier tell)` ahead, with **both** a visual and an audio cue. Never audio alone, for
  accessibility. Never on-screen numbers, by house rule. Beat ticks land on the beat, so players can
  feel the rhythm.
- **Reading rule:** every pattern can be watched from the rest spot before it. Every moving or blinking
  piece must be in view of the gameplay camera from that spot: in the `track` camera, within about 14 m
  ahead.

---

### 2. Kit helpers (owned here)

All five go in `src/levels/kit.js`. The new entity classes go in a new `src/entities/boxes.js`, so that
`breakables.js` (817 lines) doesn't grow further.

#### 2.1 `k.blinkBox(x, y, d, { on = 1.2, off = 1.0, phase = 0, group = null })`

A steel box that phases in and out on a beat.

- **Class:** `BlinkBox extends Entity` (not `Breakable`: unbreakable, **not countable**).
- **Collision:**
  - A `Solid` like the lunchbox (`{ x ± 0.49, y .. y + 0.98, z ± 0.49 }`), `kind: 'static'`. It is
    switched on and off through `solid.enabled`; physics already skips disabled solids
    (`physics.js:70,76`).
  - The box is never moved, so the static spatial hash stays valid.
- **Clock:**
  - `cycle = on + off`.
  - Local time is `τ = (clock.t × rate + phase) mod cycle`. The box is solid while `τ < on`.
  - `group` is a string. Boxes with the same group share one `BeatClock` in `stage.beatClocks[group]`,
    so a row stays in sync. Ungrouped boxes get a private clock.
  - A pattern makes boxes take turns by giving each one a different `phase` on the same group clock.
- **`BeatClock`** (new, in `boxes.js`):
  - Fields: `{ t: 0, rate: 1 }`.
  - Advanced once per frame by the stage, before the entities update.
  - `rate` is set by DDA (2.6).
- **Tell:**
  - From `τ = on − tell`, where `tell = max(0.3, tier tell)` (1.4), the box body flashes. Its emissive
    pulses at 10 Hz, cyan to white.
  - It plays `blinkTick` once at the start of the tell and once at the vanish.
  - `blinkTick` is a new short square-wave blip in `audio.js`. The placeholder uses the existing `blip`.
- **While off:**
  - The mesh is hidden. A wireframe outline stays visible: `EdgesGeometry` of the box,
    `LineBasicMaterial` cyan at 0.35 opacity. Built once per class and shared.
  - 0.25 s before it turns back on, the outline brightens to 0.8 and plays `blinkOn`, a soft rising blip.
    The placeholder is `blip` at a higher pitch through the existing rate parameter, if `audio.play`
    supports it; otherwise the plain `blip`.
- **No crushing:**
  - If Nobu's box overlaps the blink box when it should turn on, it **stays off** until he is clear. The
    clock keeps running, so the next cycle is unchanged.
  - Nobu standing on it when it vanishes simply falls; coyote time (6 frames) applies.
- **Looks:**
  - The `Lunchbox` mesh with the band material swapped for `toon(0x3ad0ff)` (cyan).
  - The handle is replaced by a small cyan diamond (`OctahedronGeometry(0.12)`), so blink boxes read as a
    different kind from a distance.
- **Rollback:**
  - On checkpoint respawn, **every `BeatClock` in the stage resets to `t = 0`.** The pattern then starts
    from the same, known phase every time.
  - This goes in `onRespawn()`, which `session.js` already calls on every entity during respawn
    (`e.onRespawn?.()`).
  - In a pattern, the first box after a rest spot must be on at `t = 0`, or turn on within its tier
    window.
- **DDA:** `clock.rate = 1 / 1.08` at the "8% slower" step (plan 4.3: 5 deaths at this checkpoint).
  `on` and `off` keep their ratio.
- **Trials:** runs normally (DDA is off in trials). In a trial the clocks reset at the start of the run,
  so every runner gets the same phase. No per-run random phases.
- **Perf:**
  - Toggling `solid.enabled` and `mesh.visible` costs nothing.
  - The outline geometry is shared.
  - A cap of 40 blink boxes per stage keeps the update list short. `alwaysActive = false` is fine
    because the clock lives in `BeatClock`, not in the entity, so off-screen boxes stay in phase.
- **Returns** the entity. `kit` also registers it in `stage.timedBoxes` for the validator (6.2).

#### 2.2 `k.bounceChain(points, { y = 0 })`

Backpacks over a pit. Each bounce breaks one and launches Nobu to the next.

- **`points`:** `[[x, d], ...]` or `[[x, yOff, d], ...]`. `y` is the base height for all of them, and
  `yOff` adds to it per point.
- **Places** ordinary `Backpack`s through `k.pack(x, y, d, tickets)`:
  - **Countable** (they count toward the Golden Bone, All Boxes and the backpack rain).
  - `tickets` is **0 in gauntlet stages** and **1 raw** in main levels. Chains are about timing, not
    loot, and this keeps Ticket budgets flat.
- **Behaviour:**
  - Unchanged from today: `Backpack.onLand` breaks the pack and calls
    `p.bounce(TUNING.STOMP_BOUNCE)`.
  - A bounce refills the double jump, so a player who misjudges can save it with a double jump. This is
    the designed forgiveness at tiers 1–3.
- **Tell:** a yellow bounce ring on each pack top (`RingGeometry(0.28, 0.36, 20)`, `toon(0xffd23f)`, added
  to the pack's model group). It shows the pack is meant to be bounced, not bitten.
- **Rollback:** normal breakable rollback. Packs broken after the last checkpoint are restored on death
  (`session.js` respawn loop).
- **Spacing:** build-time asserts in dev (`import.meta.env.DEV`) warn when a step goes past the tier
  limit. The spacing table, centre to centre at full run speed:

  | dy (pack top → next top) | Tap (jump not held) | Held | Safe "tap" spacing, tier 1 / 3 / 5 | Forces "held" (above tap + 0.83, below held) |
  | --- | --- | --- | --- | --- |
  | −1.0 | 4.80 | 6.13 | 3.6 / 4.1 / 4.6 | 5.7–6.1 |
  | −0.5 | 4.53 | 5.87 | 3.4 / 3.9 / 4.3 | 5.4–5.8 |
  | 0 | 4.27 | 5.60 | 3.2 / 3.7 / 4.1 | 5.1–5.5 |
  | +0.5 | 3.87 | 5.20 | 2.9 / 3.3 / 3.7 | 4.7–5.1 |
  | +1.0 | 3.47 | 4.93 | 2.6 / 3.0 / 3.3 | 4.3–4.8 |

  - "Safe tap" is the tap reach × the tier's max %.
  - The last column gives spacings a tap bounce can't reach but a held bounce can. That is the
    **"hold to go long" skill**, used in pattern P3.
  - First pack from the floor: a held jump to dy +1 (pack top 1.0 above the floor) reaches 5.20 m.
    Patterns put the first pack 2.6–3.0 m from the floor edge.
  - Last pack to the exit floor (dy −1): tap reach 4.80 m. Patterns put the floor edge 3.0–3.5 m after
    the last pack.
- **Rule:** packs in a chain sit in single file. Never two at the same `d`, because a chain can't come
  back.

#### 2.3 `k.fallBox(x, y, d, { delay = 0.45 })`

A lunchbox that drops after Nobu lands on it.

- **Class:** `FallBox extends CrumblePlatform` (`props.js:90`). The respawn path in `session.js`
  (`e instanceof CrumblePlatform … e.reset()`) then already covers it.
  - It overrides the constructor to use the lunchbox mesh (1.0 × 0.98 × 1.0) and an orange band
    (`toon(0xff8a3a)`) with three dark crack lines (thin `BoxGeometry` decals).
  - It overrides `update()` to use `delay` instead of the hard-coded 0.55.
  - **Not countable.**
- **Timing:**
  - On first ground contact by Nobu (`p.body.ground === this.solid`), state goes to `shake` for `delay`
    seconds, plus 8% if DDA applies.
  - Then `fall`: `solid.enabled = false` **at once**. That differs from `CrumblePlatform`, which keeps
    the solid for 0.2 s; here the timing must be exact. The box drops (`vy -= 25 dt`) and spins slowly.
  - Coyote time then gives 0.11 s more.
  - **Input window = delay + 0.11 s:**

    | delay (s) | Window | Tiers that may use it |
    | --- | --- | --- |
    | 0.60 | 0.71 s = 43 f | teach |
    | 0.45 | 0.56 s = 34 f | 1–2 |
    | 0.38 | 0.49 s = 29 f | 3 |
    | 0.32 | 0.43 s = 26 f | 4 |
    | 0.30 | 0.41 s = 25 f | 5 |

- **Running across:** at 8 m/s Nobu spends 0.125 s on each 1 m box, so a contiguous row can be run across
  without jumping. The challenge is the **gaps** in the row (pattern P7) and never stopping.
- **Tell:** a 60 Hz wobble of ±0.06 m (as `CrumblePlatform`), plus the existing `roll` sound on contact.
  At `delay − 0.15` s there is a second sound, `creak`: a new low noise burst, with `roll` as the
  placeholder.
- **Respawn:**
  - 2.8 s after falling, the box resets to its home position (as `CrumblePlatform`).
  - It also resets on checkpoint respawn (existing path).
  - If Nobu is in its volume when it returns, it waits until he is clear (same rule as 2.1).
- **Trials:** normal.
- **Perf:** same as `CrumblePlatform`. `kind: 'moving'` solids are checked every frame (`physics.js:75`),
  so cap fall boxes at **48 per stage** and keep rows under 16 long.

#### 2.4 `k.slideBox(x, y, d, { axis = 'x', range = 1.6, speed = 1.5, phase = 0 })`

A moving lunchbox that carries Nobu.

- **Class:** `SlideBox extends MovingPlatform` (`props.js:57`), with the lunchbox mesh and a teal band
  (`toon(0x2ad1a0)`), 1.0 × 0.98 × 1.0. **Not countable.**
- **Motion:**
  - The same as `MovingPlatform`: `offset = sin(t × speed + phase) × range` along `dir`.
  - `axis` is `'x'` (lateral, `rightAt(d)`), `'z'` (along the path, `fwdAt(d)`) or `'y'` (vertical).
  - The kit maps `axis` exactly as `k.mover` does today.
  - Period = `2π / speed`; peak speed = `range × speed`.
- **Carry:** `kind: 'moving'` solid, so `rideGround()` (`physics.js:100`) moves Nobu with it.
- **Clock:** its own `t`. **`onRespawn()` sets `t = 0`**, so the pattern restarts in phase. `MovingPlatform`
  doesn't reset today; `SlideBox` adds this.
- **Tell:** sliders don't vanish, so the tell is the motion itself. Two short white tick marks on the
  floor or pit edge show each end of the travel. They are thin planes placed at build time. At each
  reversal it plays `clang` at 0.3 volume.
- **Timing windows** (from `windows.mjs`, kept in the test as fixtures):

  | Layout | Range | Speed | Period | Window |
  | --- | --- | --- | --- | --- |
  | Lateral pair, opposite phase, lined up within 0.8 m | 1.6 | 1.5 | 4.19 s | 0.34 s = 20 f, twice per cycle |
  | Lateral pair | 1.2 | 1.2 | 5.24 s | 0.57 s = 34 f |
  | Lateral pair | 2.0 | 2.4 | 2.62 s | 0.17 s = 10 f |

  - Air control (8 m/s, 42 m/s²) lets Nobu correct sideways by about 2–4 m during a held jump, so the
    real windows for lateral pairs are much wider. **Use lateral pairs only as a teach.**
  - **Along-path pairs** (`axis: 'z'`, opposite phase, spacing `S`) are the real test. The gap is
    `S − 2 × range × sin(speed × t)`; jump when it's short enough:

    | S | Range | Speed | Gap range | Window per cycle where gap ≤ 4.9 m (86% of held reach) |
    | --- | --- | --- | --- | --- |
    | 6 | 1.2 | 1.2 | 3.6–8.4 | 1.82 s |
    | 6 | 1.6 | 1.5 | 2.8–9.2 | 1.63 s |

- **DDA:** `speed / 1.08` at the 8% step.
- **Perf:** a moving solid each. Cap at 24 per stage.

#### 2.5 `k.arrowChain(points, { power = 16 })`

Arrow lunchboxes that launch Nobu from one to the next.

- **`points`:** `[[x, d], ...]` or `[[x, yOff, d], ...]`. Places `Lunchbox` with `{ arrow: true, power }`,
  as `k.arrowBox` does.
- **Not countable.**
- **Visual:** the arrow decal on top (`P.arrowTop`) is rotated to point at the next box in the list, for
  this chain only. The last box points along the path.
- **Launch:** unchanged (`Lunchbox.onLand`):
  - `bounce(power, { allowCut: false })`: velocity `power`, or `power × 1.15` if jump is held.
  - **No apex hang**, and the double jump is refilled.
  - Arc maths and reach are in 1.2. The safe spacing is reach × tier %:

    | Power | dy | Tap reach | Held reach | Tier 1 / 3 / 5 tap spacing |
    | --- | --- | --- | --- | --- |
    | 13 | 0 | 5.33 | 6.13 | 4.0 / 4.6 / 5.1 |
    | 14 | 0 | 5.73 | 6.53 | 4.3 / 4.9 / 5.5 |
    | 16 | 0 | 6.53 | 7.47 | 4.9 / 5.6 / 6.3 |
    | 16 | +1 | 6.00 | 7.07 | 4.5 / 5.2 / 5.8 |
    | 16 | +2 | 5.47 | 6.67 | 4.1 / 4.7 / 5.3 |
    | 18 | 0 | 7.33 | 8.40 | 5.5 / 6.3 / 7.0 |

- **Forgiveness:** the refilled double jump saves almost any missed relay. That is fine at tiers 1–3. At
  tiers 4–5 the pattern adds a **ceiling** so a double jump can't skip it: a plain lunchbox or decor slab
  2.2 m above the arc's peak, which stops a held double from going over the top.
- **Rollback, trials, DDA:** static, so nothing to roll back and nothing for DDA to slow.

#### 2.6 Shared rules for all five helpers

- **DDA** (plan 4.3) is applied through one function, `ddaTiming(stage)`. It returns `{ rate, delayK }`,
  read by `BeatClock`, `FallBox` and `SlideBox`:
  - 5+ deaths at this checkpoint: `rate = 1 / 1.08`, `delayK = 1.08`.
  - 7+: pity Snacks (`k.pitySnacks`, new-levels spec).
  - 9+: two pity masks. These don't help in pits, but they do against Cats and Rugs.
  - Off in trials and remixes, and off for the **Flawless** medal by definition, since Flawless needs no
    deaths.
- **None of the timed boxes are countable.** Only backpacks, Cats, Rugs, Zipped Backpacks, spheres,
  1UPs and switches count, as today.
- **Validator hook:** in dev builds, each helper pushes `{ kind, x, y, d, params }` to
  `stage.timedBoxes`. `dev.js` gets `T.gauntletCheck()`, which runs `validatePattern` (6.2) over the live
  layout and prints problems.

---

### 3. Pattern library

Each pattern is a block of placements relative to `d0`.

- **Floor:** `pit` means no ground between the entry and exit floors (a gap in `k.floor`); `floor` means
  ground stays under the pattern, which is used for teach variants.
- **Route:** the moves that make it, checked by the validator.
- **Teach variant:** the same pattern over floor with gentler numbers. **Every pattern appears as a
  teach before its first pit version in the game.**

#### P1. Box Stairs (tier 1; tests held-jump climbing)

| dd | Placement |
| --- | --- |
| 0 | entry floor ends (pit version) |
| 2.5 | `lunch(0, 0)` |
| 6.0 | `lunch(0, 0)`, `lunch(0, 1)` |
| 9.5 | `lunch(0, 0)`, `lunch(0, 1)`, `lunch(0, 2)` |
| 12.0 | exit floor at `y = 3` |

- **Route:** held jump to +1 at 2.5 m (48%), then 3.5 m (67%) and 3.5 m (67%), then 2.5 m to the exit at
  the same height.
- **Teach:** floor below and no exit ledge; Nobu hops down.
- **Tier 3 variant:** step spacing 4.4 m (85%).

#### P2. Bounce Bridge (tier 1–2; tests the bounce rhythm)

| dd | Placement |
| --- | --- |
| 0 | entry floor ends |
| 3.0 / 6.4 / 9.8 / 13.2 | `bounceChain([[0, 3.0], [0, 6.4], [0, 9.8], [0, 13.2]])` (relative d) |
| 16.5 | exit floor |

- **Route:** held jump to +1 at 3.0 m (58%), three tap bounces at 3.4 m (80%), then a tap bounce to dy −1
  with 3.3 m to the floor edge (69%).
- **Teach:** over floor, spacing 3.0.
- **Tier 2:** 3.6 spacing. **Tier 3:** 3.9 spacing, with 5 packs.

#### P3. Long-Short Bounce (tier 3–4; tests holding jump for long gaps)

| dd | Placement |
| --- | --- |
| 3.0 | pack |
| 6.4 | pack (3.4: tap or ease off) |
| 11.6 | pack (5.2: **held only**; tap reach 4.27 + 0.83 = 5.10 < 5.2) |
| 15.0 | pack (3.4: ease off after the long bounce) |
| 20.2 | pack (5.2: held only) |
| 23.5 | exit floor (dy −1, 3.3 m) |

- **Route:** bounce tap, held, tap, held, then the exit.
- **Teach:** over floor, with a 3.4 / 4.8 / 3.4 rhythm. At 4.8 m a tap bounce only just reaches the near
  edge (4.27 + 0.83 overlap); a held bounce lands it cleanly. That teaches what "hold" feels like.
- **Tier 4:** the last pack is raised to +0.5 (5.0 m out, held). Keep it at 4.8 m or less at tier 4.5
  (see 4.5).

#### P4. Stack Bounce Stairs (tier 2; tests bouncing upward, floor below)

| dd | Placement |
| --- | --- |
| 3.0 | `stack(0, 0, 1)` (top 1.0) |
| 5.8 | `stack(0, 0, 2)` (top 2.0) |
| 8.6 | `stack(0, 0, 3)` (top 3.0) |
| 11.0 | exit ledge at `y = 3` |

- **Route:** held jump +1 at 3.0, held bounce +1 at 2.8 (57%), held bounce +1 at 2.8, then a hop to the
  ledge at the same height.
- **Floor is required.** Bouncing breaks only the top pack of each stack. Nobu comes back down to bite
  the rest for All Boxes. **This pattern is never built over a pit.**

#### P5. Blink Stairs (tier 2–4; tests climbing on a beat)

| dd | Placement (group `bs`) |
| --- | --- |
| 3.0 | `blinkBox(0, 0, { phase: 0 })` (A) |
| 6.5 | `blinkBox(0, 1, { phase: −1.0 })` (B: on from τ = 1.0) |
| 10.0 | `blinkBox(0, 2, { phase: 0 })` (A) |
| 13.5 | `blinkBox(0, 3, { phase: −1.0 })` (B) |
| 16.0 | exit ledge at `y = 4` |

- `phase: −1.0` makes B turn on 1.0 s after A, and stay on for its own `on` time.
- **Tier 2:** `on 1.4, off 1.0`. **Tier 4:** `on 1.0, off 0.8`, with B delayed 0.8.
- **Route:** held jump +1 at 3.5 m (67%) each step.
- **Window:** with airtime 0.65 s, take off from A between τ = 0.35 and 1.4: **63 f** at tier 2 and
  **51 f** at tier 4.
- **Teach:** over floor, `on 1.6, off 0.8`.

#### P6. Blink Tightrope (tier 3–5; tests riding a wave)

| dd | Placement (group `bt`) |
| --- | --- |
| 2.4 × i, i = 1…8 | `blinkBox(0, 0, { phase: −step × (i − 1) })` |
| 2.4 × 9 + 1.0 | exit floor |

- **Tier 3:** `on 1.2, off 1.2`, `step 0.8`. **Tier 5:** `on 0.9, off 0.9`, `step 0.6`. **Teach:**
  `on 1.6, off 0.8`, `step 1.0`.
- **Route:** tap or held hops at 2.4 m (86% of tap reach, 42% of held).
- **Windows:** tap hop at tier 3: **45 f**; tier 5: **39 f**; teach: **57 f**. A held hop at tier 3
  gives 67 f.
- Eight in a row is under the tier-3 limit (6) only because Nobu can stand on any box for up to `on`
  seconds. Count it as 4 timed actions: each box is reached, then left.

#### P7. Falling Floor Sprint (tier 2–5; tests never stopping)

| dd | Placement |
| --- | --- |
| 1…8 | `fallBox(0, 0, dd)` × 8 (contiguous, 1.0 m apart) |
| 9…11 | gap |
| 12…17 | `fallBox` × 6 |
| 18…20 | gap |
| 21…25 | `fallBox(0, 1, dd)` × 5 (one step up) |
| 26.5 | exit floor at `y = 1` |

- **Delay:** tier 2 = 0.45, tier 3 = 0.38, tier 4 = 0.32, tier 5 = 0.30.
- **Route:** run, held jump 4.0 m (70%), run, held jump +1 at 4.0 m (77%), run, then a hop to the exit.
- **Window** at each gap: delay + coyote (2.3 table): 34 / 29 / 26 / 25 f.
- **Teach:** over floor with delay 0.6 and a single gap.

#### P8. Slider Gap (tier 3; tests jumping when the gap is short)

| dd | Placement |
| --- | --- |
| 3.0 | `slideBox(0, 0, { axis: 'z', range: 1.6, speed: 1.5, phase: 0 })` (A) |
| 9.0 | `slideBox(0, 0, { axis: 'z', range: 1.6, speed: 1.5, phase: Math.PI })` (B) |
| 14.0 | exit floor |

- **Route:**
  - Floor to A when A is near (A ranges over 1.4–4.6 m from the edge).
  - A to B when the gap is ≤ 4.9 m: window **1.63 s per cycle**. The test is hard because the landing
    moves at up to 2.4 m/s.
  - B to the floor when B is near (3.4–6.6 m).
- **Teach:** `range 1.2, speed 1.2`, floor below.

#### P9. Slider Swap (tier 1–2 teach; tests lining up)

| dd | Placement |
| --- | --- |
| 3.5 | `slideBox(0, 0, { axis: 'x', range: 1.2, speed: 1.2, phase: 0 })` |
| 7.5 | `slideBox(0, 0, { axis: 'x', range: 1.2, speed: 1.2, phase: Math.PI })` |
| 11.0 | exit floor |

- **Route:** jumps of 3.5, 4.0 and 3.5 m (61–70%).
- **Window:** 34 f when lined up; wider with air control.

#### P10. Arrow Relay (tier 2–4; tests landing on launchers)

| dd | Placement |
| --- | --- |
| 3.0 / 8.0 / 13.0 | `arrowChain([[0, 3], [0, 8], [0, 13]], { power: 16 })` |
| 17.0 | exit ledge at `y = 2` (dy +1 from the arrow top) |

- **Route:** held jump +1 at 3.0, then arrow tap at 5.0 m (77%), 5.0 m, and arrow tap at dy +1 with 4.0 m
  to the ledge edge (67%).
- **Tier 3:** spacing 5.6 (86%). **Tier 4:** spacing 6.8, 91% of held reach. A tap lands only on the
  near edge (6.53 + 0.83 overlap), so hold for a clean landing. Add a ceiling slab
  at `y = 7.0` over the gaps, so a double jump can't skip it.

#### P11. Arrow Climb (tier 3; tests launching upward)

| dd | Placement |
| --- | --- |
| 3.0 | arrow `(0, 0)` |
| 8.0 | arrow `(0, 1.5)` |
| 13.0 | arrow `(0, 3)` |
| 17.0 | exit ledge at `y = 5` |

- **Route:** arrow tap at dy +1.5 over 5.0 m. Reach is about 5.7 at that height, so 88%, just inside the
  tier-3.5 limit; use 4.8 m at tier 3. The last arrow goes to dy +1 with 4.0 m to the edge.

#### P12. Nitro Tightrope (tier 3–4; tests hopping Rugs on a narrow walk)

| dd | Placement |
| --- | --- |
| 0…19 | `lunch(0, 0, dd)` × 20, single file (a 1 m wide walkway over the pit) |
| 3.5, 7.0, 11.5, 15.0 | `rug(0, 0.98, dd)` on the walkway |
| 21.0 | exit floor with `vacSwitch(0, 0, 23)` |

- **Route:** run, then a held hop over each Rug (the Rug is 0.9 m deep along the path and 0.5 m high; a
  tap jump's 0.61 m apex is too close for comfort), then run.
- Rugs are countable. The Vacuum Dock at the exit pops all four, so All Boxes is possible without
  touching them.
- **Tier 4:** Rug gaps of 2.5 / 3.0 / 4.0 m, plus a blink box replacing walkway box 10.

#### P13. TNT Fuse Escape (tier 3; tests timing a retreat on blink boxes)

| dd | Placement |
| --- | --- |
| 0 | entry floor ends |
| 3.0 | `blinkBox(0, 0, { on: 1.2, off: 1.0, phase: 0, group: 'tf' })` (A) |
| 6.5 | `blinkBox(0, 0, { on: 1.2, off: 1.0, phase: −1.0, group: 'tf' })` (B) |
| 9.0…14.0 | island `floor(d0 + 9, d0 + 14, { w: 3 })` |
| 11.0 | `cat(0, 0, 11)` (TNT) |
| 12.6 | backpack wall: `pack(−0.95, 0)`, `pack(0, 0)`, `pack(0.95, 0)`, plus the same three at `y = 1` |
| 14.0…17.0 | pit |
| 17.0 | exit floor |

- **Route:**
  1. A, B, then onto the island.
  2. Stomp the Cat. That bounces Nobu and arms its 3 s fuse.
  3. Within 3 s, get at least 2.9 m away (`explode()` hurts within r + 0.2 = 2.9 m). The way out is back
     onto B (4.5 m from the Cat) while it's on, then A or B on the beat.
  4. The blast (r 2.7) breaks all six wall packs (1.6–1.9 m away).
  5. Go back to the island and jump the 3 m pit to the exit.
- **Teach:** the same, with floor in place of the blink boxes.

#### P14. Double Ladder (tier 3–4; tests double-jump timing)

| dd | Placement |
| --- | --- |
| 3.0 | `lunch(0, 0)` |
| 7.0 | `lunch(0, 3)` (floating, top 3.98) |
| 11.0 | `lunch(0, 6)` |
| 14.0 | exit ledge at `y = 7` |

- **Route:** held jump +1, then double jump to +3 at 4.0 m (window 29 f), double +3 at 4.0 m, then a hop
  at the same height.
- **Tier 4:** steps of +3.4 m (window 25 f).

#### P15. Glide Drop (tier 4; needs Tail Glide, so only in content after the Mecha Bird)

| dd | Placement |
| --- | --- |
| 0 | entry ledge at `y = 6` ends |
| 14.0 | `lunch(0, 0)` (top 0.98: a drop of 5 m) |
| 18.0 | `slideBox(0, 0, { axis: 'x', range: 2.0, speed: 2.4 })` (fast, 10 f lined up) |
| 22.0 | exit floor |

- **Route:** double + glide, 14 m. A double + glide back to the same height already reaches 18.9 m, and
  the 5 m drop adds about 16.7 m more, so reach is not the test. The test is **letting go** of the glide
  over a 1 m box. Then a held jump 4.0 m onto a fast slider, then 4.0 m off it.
- **Golden rule:** never place this pattern anywhere a player can be before beating the Mecha Bird.

#### P16. Last Beat (tier 4–5; the finale combining every helper)

| dd | Placement |
| --- | --- |
| 3.0 | `blinkBox(0, 0, { on: 1.0, off: 0.8 })` |
| 6.5 | `fallBox(0, 0, { delay: 0.32 })` |
| 9.5 | arrow `(0, 0)` (power 16) |
| 16.0 | `slideBox(0, 0, { axis: 'z', range: 1.2, speed: 1.5 })` |
| 20.5 | pack (a bounce) |
| 24.5 | exit ledge at `y = 2` |

- **Route:**
  1. Held jump to the blink box (3.0 m).
  2. Jump to the fall box (3.5 m) and leave it within 26 f.
  3. Jump to the arrow (3.0 m).
  4. Arrow tap to the slider (5.3–7.7 m away; go when it's ≤ 7.3).
  5. Held jump to the pack (3.3–5.7 m).
  6. Held bounce to dy +1 with 4.0 m to the edge (81%).
- **Tier 5:** blink `on 0.9, off 0.8`, fall delay 0.30, arrow power 18, slider `range 1.6, speed 2.0`
  (exit gap 2.7–9.1 m; go when ≤ 8.1).

#### Pattern summary

| # | Name | Tier | Floor or pit | Countable pieces | Main skill |
| --- | --- | --- | --- | --- | --- |
| P1 | Box Stairs | 1 | either | 0 | held-jump climb |
| P2 | Bounce Bridge | 1–2 | pit | 4 | bounce rhythm |
| P3 | Long-Short Bounce | 3–4 | pit | 5 | hold to go long |
| P4 | Stack Bounce Stairs | 2 | floor only | 6 | bounce upward |
| P5 | Blink Stairs | 2–4 | pit | 0 | climb on a beat |
| P6 | Blink Tightrope | 3–5 | pit | 0 | ride a wave |
| P7 | Falling Floor Sprint | 2–5 | pit | 0 | never stop |
| P8 | Slider Gap | 3 | pit | 0 | jump when the gap is short |
| P9 | Slider Swap | 1–2 | either | 0 | line up |
| P10 | Arrow Relay | 2–4 | pit | 0 | land on launchers |
| P11 | Arrow Climb | 3 | pit | 0 | launch upward |
| P12 | Nitro Tightrope | 3–4 | pit | 4 Rugs + 1 switch | hop hazards on a narrow path |
| P13 | TNT Fuse Escape | 3 | pit | 1 Cat + 6 packs | timed retreat |
| P14 | Double Ladder | 3–4 | pit | 0 | double-jump timing |
| P15 | Glide Drop | 4 | pit | 0 | glide control (post-Bird) |
| P16 | Last Beat | 4–5 | pit | 1 | everything |

---

### 4. The three Box Gauntlet stages

#### 4.1 What they are

- Short (150–190 m) stages made **only** of timed boxes: no enemies and no tickets lying around. They are
  like Crash 4's Flashback Tapes.
- **Unlock:** a **Polaroid** in the host level. It can only be picked up if Nobu reaches it **without
  dying since the level started**.
  - After a death, the Polaroid shows grey (ghost material, opacity 0.35) and can't be collected until
    the level is restarted from the map. That is the Flashback-tape rule.
  - A banner the first time it's seen grey: "Reach it without a scratch."
- **Placement rule:** like the tapes, the Polaroid sits **early** in early levels and **later** in later
  levels, and always somewhere a careful first-time player can reach.

| Id | Name | Host | Tier | Theme | Length to goal | Polaroid |
| --- | --- | --- | --- | --- | --- | --- |
| `g1` | Jungle Crates | L1 Bark Jungle | 1.5 | `1` (jungle) | 158 m | L1 Bone Switch treasure platform: `(1.4, 4.5, 175.4)` in today's L1 coordinates (before the d 240 splice in the extended-levels spec, so it doesn't move) |
| `g2` | Assembly Rush | L3 Cone Factory | 3.5 | `3` (factory) | 180 m | L3, on top of the lunchbox after crusher alley: `(−2.8, 1.0, 65.5)` (before the d 136 splice, so it doesn't move) |
| `g3` | Hamper Hop | L4 Laundry Day | 4.5 | `house` | 186 m | L4 kitchen counter, the spice shelf reached by the toaster launchers (plan 6.1, core route about d 160, x +3, y +4). **The new-levels spec confirms the exact spot.** |

- **Moves:**
  - G1 can be unlocked before the Mecha Bird, so **it needs no boss move.**
  - G2 is reached after the Bird and Cat, so glide and Zoomies are allowed, but **G2 doesn't need them**
    (none of P15).
  - G3 is reached after the Cone (Mega Bark) and before the Titan, so P15 (glide) is allowed and **no
    Dust Dash is needed.**

#### 4.2 Shared stage rules

- **Registry entries** (in the level registry from plan 10.1). `g2` and `g3` use the same shape:

  ```js
  g1: { id: 'g1', name: 'Jungle Crates', build: buildGauntlet1, theme: 1, gauntlet: true, host: 1, tier: 1.5,
        unlock: (d) => !!d.gauntlets?.g1?.found, trial: false, bones: false }
  ```

- **Files:**
  - `src/levels/gauntlets.js` with `buildGauntlet1`, `buildGauntlet2` and `buildGauntlet3`.
  - The `Polaroid` entity goes in `src/entities/secrets.js`, next to `ColorBone`.
- **Session:**
  - A gauntlet behaves like a bonus stage (`bonus: true` path): no boss, ends at
    `k.trigger(goalD, () => game.session.reachGoal())`.
  - Plus `def.gauntlet` checks for medals and rewards.
  - No Bone Board, no Snack Bones, no time trial board. A local best time is shown on the map only.
- **Lives:** deaths cost lives as usual. Pits are the only danger, so a gauntlet can eat lives. Checkpoints
  are few on purpose:
  - G1: 2 Snacks. G2: 2. G3: 2.
  - DDA pity Snacks spots: one per pattern after the first checkpoint.
- **Camera:** `track` mode (behind), with `ahead: 6.5` instead of 5.5 so more of the next pattern shows
  (reading rule, 1.4). No facing-camera sections.
- **Music:** the host level's theme at +8% tempo, through the existing synth (`songs.js` tempo parameter),
  plus a metronome click on blink beats (the `blinkTick` sound). No new song needed.
- **Tickets:**
  - Gauntlet packs have **0 tickets**, and no `k.tix` lines are placed.
  - The first Clear pays a capped **5 whole Tickets**, once ever per gauntlet
    (`GAUNTLET_FIRST_CLEAR_TICKETS = 5` in `config/tickets.js`), through the normal `level_end` earn.
  - Guide arcs in teach sections use a **non-economic** sparkle trail (`fx.sparkle` dots along the jump
    arc, via `k.guideArc(points)`), never Tickets.
- **Medals** (saved in `save.data.gauntlets[id]`):

  | Medal | Condition | Reward |
  | --- | --- | --- |
  | Clear | reach the goal | 1 Good Boy % mastery point; the Polaroid appears on the Kennel photo wall; first clear pays 5 Tickets |
  | All Boxes | every countable breakable broken in one run (checkpoints keep progress, as in normal levels) | 1 mastery point; a cosmetic (below) |
  | Flawless | All Boxes **and** 0 deaths in one run | 1 mastery point; a gold Polaroid frame on the Kennel wall; a cosmetic (below) |

  - All Boxes cosmetics: G1 green collar tint, G2 steel-grey fur sheen, G3 white "fresh laundry" sparkle
    trail.
  - Flawless cosmetics: G1 crate-print bandana (procedural, `accessories.js` style), G2 cyan blink-box
    collar, G3 rainbow sparkle trail.
  - All cosmetics are procedural (tints, `toon` meshes and `fx` trails), so they need no assets, and they
    are off in trials and on boards, like every Kennel item.
- **Save field** (to add to the v3 schema in `rewards-spec.md` 1.3):

  ```js
  gauntlets: { g1: { found: false, clear: false, allBoxes: false, flawless: false, bestMs: null }, g2: {...}, g3: {...} }
  ```

  - The sanitizer accepts only booleans, and `bestMs` as an integer ≥ 1000 or null.
  - The multi-tab merge ORs the booleans and keeps the smaller `bestMs`.
  - **New Game keeps** `gauntlets`, like the other mastery records.
- **Good Boy %:** 3 gauntlets × 3 medals = **9 mastery-track points.** The rewards spec rebalanced the
  mastery track to exactly 100, so these 9 must come out of it there (see "Notes for the parent").
- **Map:**
  - A found gauntlet shows as a small Polaroid icon pinned to its host level's node. It is not part of
    `MAP_ORDER`, so walking the map is unchanged.
  - The host level's panel gets a line, `📷 JUNGLE CRATES · press G (pad RB)`, plus medal pips
    (○ ○ ○, filled when earned) and the local best time.
  - `G` and pad RB are free on the map today. `T` / pad Y are the trial, `I` / LB the wardrobe. Confirm in
    `core/input.js` when building.
- **Target deaths for a first Clear:**

  | Gauntlet | Clear | All Boxes | Flawless |
  | --- | --- | --- | --- |
  | G1 | 3–6 | +2 | expert |
  | G2 | 6–10 | +3 | expert |
  | G3 | 10–16 | +4 | expert |

#### 4.3 G1: Jungle Crates (tier 1.5, about 158 m)

- **Track:**

  ```js
  makeTrack(stage, turtle([0, 0, 10], [[22, 0, 0], [24, 14, 0], [24, -14, 0], [24, 10, 0.6], [24, -10, 0], [24, 0, 1.4], [24, 0, 0]]))
  ```

  - Gentle curves, so each pattern is read straight on.
  - The total climb of 2 m adds to the authored `y` values. `y` is relative to the path height.
- **Walls:** `k.walls([[-8, 4.3, 4.3, 2.6], [160, 4.3, 4.3, 2.6]])`, plus `backstop(-8)` and
  `backstop(158)`.
- **Decor:** the L1 recipe (palms, bushes, ferns, grass) on `banks` and `edges`. Over pits, decor sits
  only on the banks at |x| > 5.
- **Water** at `y = -6` under every pit, so falls read as water (`k.water`). Pits still kill through
  `killYAt`.

| d | Section | Placements |
| --- | --- | --- |
| −8…20 | Start + **P1 Box Stairs, teach** | `floor(-8, 20)`. `sign(-2.8, 0, 2, ['BOX', 'GAUNTLET'])`. `lunch(0,0,8.5)`; `lunch(0,0,12)`, `lunch(0,1,12)`; `lunch(0,0,15.5)`, `lunch(0,1,15.5)`, `lunch(0,2,15.5)`; `pack(0, 3, 15.5, 0)` on top. `guideArc` over the stairs. |
| 20…36.5 | **P2 Bounce Bridge** (tier 1) | pit. `bounceChain([[0,23.0],[0,26.4],[0,29.8],[0,33.2]])`. |
| 36.5…50 | Rest pad, **checkpoint 1** | `floor(36.5, 50)`. `snacks(0, 0, 44)`. `pack(-2, 0, 47, 0)`, `pack(2, 0, 47, 0)`. `pitySnacks(0, 0, 39)`. |
| 50…61 | **P9 Slider Swap** | pit. `slideBox(0,0,53.5,{axis:'x',range:1.2,speed:1.2,phase:0})`, `slideBox(0,0,57.5,{axis:'x',range:1.2,speed:1.2,phase:Math.PI})`. |
| 61…70 | Rest | `floor(61, 70)`. `pack(0, 0, 66, 0)`. |
| 70…86.5 | **P7 Falling Floor, gentle** (delay 0.45) | pit. `fallBox(0,0,d)` for d = 71…79 (9 boxes), gap 80–82, `fallBox` d = 83, 84, 85. |
| 86.5…96 | Rest, **checkpoint 2** | `floor(86.5, 96)`. `snacks(0, 0, 92)`. `pitySnacks(0, 0, 88)`. |
| 96…113 | **P10 Arrow Relay** (tier 1.5, spacing 5.0) | pit. `arrowChain([[0,99],[0,104],[0,109]], { power: 16 })`. |
| 113…124 | High ledge | `floor(113, 124, { y: 2 })`. `stack(0, 2, 118, 2)` (tickets 0). |
| 124…130 | Ramp down | `floor(124, 130, { y: [2, 0] })`. `pitySnacks(0, 0, 128)`. |
| 130…147 | **P5 Blink Stairs** (`on 1.6, off 0.8`, B delayed 1.0) | pit. Group `g1bs`: `blinkBox(0,0,133,{on:1.6,off:0.8,phase:0,group:'g1bs'})`, `blinkBox(0,1,136.5,{…,phase:-1.0})`, `blinkBox(0,2,140,{…,phase:0})`, `blinkBox(0,3,143.5,{…,phase:-1.0})`. |
| 147…158 | Goal pad | `floor(147, 158, { y: 4 })`. `pack(-2, 4, 151, 0)`, `pack(2, 4, 151, 0)`. `trigger(154, () => game.session.reachGoal())`. |

- **Countable:** 1 + 4 + 2 + 1 + 2 + 2 = **12 backpacks.**
- **Checks:**
  - The longest required jump is P10 at 77% of tap reach, at the tier-1.5 limit.
  - The tightest window is Blink Stairs at about 75 f (`on 1.6`, B delayed 1.0, airtime 0.65), against a
    27 f minimum. The fall-box gap (34 f) is the tightest timed jump in G1.
  - At most 3 timed actions come before each rest pad.

#### 4.4 G2: Assembly Rush (tier 3.5, about 180 m)

- **Track:**

  ```js
  makeTrack(stage, turtle([0, 0, 10], [[22, 0, 0], [24, 20, 0], [24, -20, 0], [26, 0, 0], [24, 16, 0], [24, -16, 0], [26, 0, 0], [20, 0, 0]]))
  ```

- **Walls:** height 3.4 (factory). **Decor:** the L3 recipe (pipes, vats, vents). Under pits, a vat glow
  at `y = -7`, with a death plane as usual.

| d | Section | Placements |
| --- | --- | --- |
| −8…8 | Start | `floor(-8, 8)`. `pack(-2.5, 0, 4, 0)`, `pack(2.5, 0, 4, 0)`. |
| 8…28.5 | **P7 Falling Floor Sprint** (delay 0.38) | pit. `fallBox` d = 9…16 (8), gap 17–19, `fallBox` d = 20…27 (8). |
| 28.5…36 | Rest | `floor(28.5, 36)`. `pack(0, 0, 31, 0)`. |
| 36…53 | **P11 Arrow Climb** (spacing 4.8) | pit. `arrowChain([[0,0,39],[0,1.5,43.8],[0,3,48.6]], { power: 16 })`. |
| 53…64 | High ledge, **checkpoint 1** | `floor(53, 64, { y: 5 })`. `snacks(0, 5, 58)`. `stack(2.5, 5, 61, 2)`. |
| 64…84 | **P12 Nitro Tightrope** (on the high ledge line) | pit. `lunch(0, 5, d)` for d = 64…83 (20). `rug(0, 5.98, 67.5)`, `rug(0, 5.98, 71)`, `rug(0, 5.98, 75.5)`, `rug(0, 5.98, 79)`. |
| 84…92 | Ledge | `floor(84, 92, { y: 5 })`. `vacSwitch(0, 5, 90)` (pops all four Rugs). `pitySnacks(0, 5, 86)`. |
| 92…100 | Ramp down | `floor(92, 100, { y: [5, 0] })`. |
| 100…114 | **P8 Slider Gap** | pit. `slideBox(0,0,103,{axis:'z',range:1.6,speed:1.5,phase:0})`, `slideBox(0,0,109,{axis:'z',range:1.6,speed:1.5,phase:Math.PI})`. |
| 114…124 | Rest, **checkpoint 2** | `floor(114, 124)`. `snacks(0, 0, 120)`. |
| 124…141 | **P13 TNT Fuse Escape** | pit. Group `g2tf`: `blinkBox(0,0,127,{on:1.2,off:1.0,phase:0,group:'g2tf'})`, `blinkBox(0,0,130.5,{…,phase:-1.0})`. Island `floor(133, 138, { w: 3 })`. `cat(0, 0, 135)`. Wall at d 136.6: `pack(-0.95,0,136.6,0)`, `pack(0,0,136.6,0)`, `pack(0.95,0,136.6,0)`, and the same at `y = 1`. Pit 138–141. |
| 141…145 | Rest | `floor(141, 145)`. `pitySnacks(0, 0, 143)`. |
| 145…169.5 | **P16 Last Beat** (tier 4) | pit. `blinkBox(0,0,148,{on:1.0,off:0.8})`, `fallBox(0,0,151.5,{delay:0.32})`, `arrowBox(0,0,154.5,16)`, `slideBox(0,0,161,{axis:'z',range:1.2,speed:1.5})`, `pack(0,0,165.5,0)`. |
| 169.5…180 | Goal pad | `floor(169.5, 180, { y: 2 })`. `pack(-2, 2, 173, 0)`, `pack(2, 2, 173, 0)`. `trigger(176, …reachGoal)`. |

- **Countable:** 2 + 1 + 2 + 4 Rugs + 1 switch + 1 Cat + 6 + 1 + 2 = **20.**
- **Checks:**
  - Falling-floor window 29 f, against 15 f.
  - Arrow Climb at 84% of reach.
  - TNT escape: B is on for 1.2 s of every 2.2 s, and the fuse is 3 s, so Nobu needs one hop out and one
    hop back.
  - Last Beat is tier 4, harder than G2's 3.5, as its finale. That is allowed because it is the last
    pattern, right after a rest pad.

#### 4.5 G3: Hamper Hop (tier 4.5, about 186 m)

- **Track:**

  ```js
  makeTrack(stage, turtle([0, 0, 10], [[22, 0, 0], [24, -16, 0], [24, 16, 0], [24, 0, 1], [24, -18, 0], [24, 18, 0], [26, 0, 1], [22, 0, 0]]))
  ```

- **Theme:** `house`, using the textures from `art/procedural.js` and a dog-scale laundry room: giant
  socks, a laundry basket and a washing-machine porthole as decor. **Walls:** 3.4.

| d | Section | Placements |
| --- | --- | --- |
| −8…6 | Start | `floor(-8, 6)`. |
| 6…29.5 | **P3 Long-Short Bounce** (tier 4 variant: five packs, the last one raised) | pit. `bounceChain([[0,9],[0,12.4],[0,17.6],[0,21.0],[0,0.5,26.0]])`. The last pack is at +0.5, 5.0 m out (held). Exit floor at 29.5 at `y = 0` (dy −1.5 from the pack top, 3.5 m to the edge). |
| 29.5…36 | Rest | `floor(29.5, 36)`. `pack(0, 0, 33, 0)`. |
| 36…57.6 | **P6 Blink Tightrope** (tier 5 numbers) | pit. Group `g3bt`: `blinkBox(0, 0, 36 + 2.4 × i, { on: 0.9, off: 0.9, phase: -0.6 × (i - 1), group: 'g3bt' })` for i = 1…8. |
| 57.6…66 | Rest, **checkpoint 1** | `floor(57.6, 66)`. `snacks(0, 0, 62)`. `stack(-2.5, 0, 64, 2)`. |
| 66…80 | **P14 Double Ladder** | pit. `lunch(0,0,69)`, `lunch(0,3,73)`, `lunch(0,6,77)`. `pack(0, 7, 77, 0)` on the top box. |
| 80…88 | High ledge | `floor(80, 88, { y: 7 })`. `pitySnacks(0, 7, 84)`. |
| 88…110 | **P15 Glide Drop** | pit. `lunch(0, 0, 102)`. `slideBox(0, 0, 106, { axis: 'x', range: 2.0, speed: 2.4 })`. |
| 110…118 | Rest, **checkpoint 2** | `floor(110, 118)`. `snacks(0, 0, 114)`. |
| 118…144.5 | **P7 Falling Floor Sprint** (delay 0.30) | pit. `fallBox` d = 119…126 (8), gap 127–129, `fallBox` d = 130…135 (6), gap 136–138, `fallBox(0, 1, d)` d = 139…143 (5). |
| 144.5…150 | Rest | `floor(144.5, 150, { y: 1 })`. `pitySnacks(0, 1, 147)`. |
| 150…175.5 | **P16 Last Beat** (tier 5, base `y = 1`) | pit. `blinkBox(0,1,153,{on:0.9,off:0.8})`, `fallBox(0,1,156.5,{delay:0.30})`, `arrowBox(0,1,159.5,18)`, `slideBox(0,1,167,{axis:'z',range:1.6,speed:2.0})`, `pack(0,1,171.5,0)`. A ceiling slab (`k.platform(0, 9.5, 163, 3, 6)`, invisible-top decor) over the arrow gap, so a double jump can't skip the slider. |
| 175.5…186 | Goal pad | `floor(175.5, 186, { y: 3 })`. `pack(-2, 3, 179, 0)`, `pack(2, 3, 179, 0)`. `trigger(182, …reachGoal)`. |

- **Countable:** 5 + 1 + 2 + 1 + 1 + 2 = **12.**
- **Checks:**
  - Blink Tightrope window 39 f, against 11 f.
  - Fall window 25 f.
  - Double Ladder 29 f.
  - Glide Drop at 72%.
  - P3's last pack at 5.0 m and +0.5: the held reach is 5.20, so 96%. **That is above the tier-4.5 limit
    of 94%.** Move it to 4.8 m (d 25.8) when building. The validator catches this.

#### 4.6 The `Polaroid` entity

- **Class:** `Polaroid extends Entity` in `secrets.js`.
  - A square photo frame: a white `PlaneGeometry(0.7, 0.85)` with an inner image using the host level's
    `bg_level*` texture. It spins slowly and bobs.
  - `interactive`, collected on touch, like `ColorBone`.
- **State:**
  - `available = session.deaths === 0`, checked every frame.
  - When it isn't available, it uses the ghost material, can't be collected, and plays a quiet `fade`
    sound the first time it is seen that way.
  - Hidden in trials, remixes and while god mode is on. God mode never unlocks mastery content, matching
    the rewards spec rule.
- **On collect:**
  1. `save.data.gauntlets[id].found = true` and `save.write()` **at once**, like colored bones.
  2. A banner: "POLAROID! A Box Gauntlet is on the map."
  3. `audio.play('oneUp')`.
  4. Collecting it doesn't end the level.
- **Rollback:** none. It's saved at once. After collection it doesn't appear again in that level.
- **Kit:** `k.polaroid(x, y, d, id)`.

---

### 5. Placement checklist for main levels

Before a timing pattern goes into a main level (L1–L6), the designer checks:

1. **It's in the tier table.** Every jump is within the tier's max % of reach (1.4), every window is at
   least the tier minimum, and `T.gauntletCheck()` prints nothing.
2. **It was taught.** The same pattern, or its teach variant, appears earlier over floor (in this level or
   an earlier one).
3. **One clean pass breaks every backpack.** Every countable piece in a timing pattern can be broken
   during a normal successful crossing, with no backtracking over a pit.
   - Bounce chains count, because they break as you cross.
   - A stack over a pit doesn't count, because only its top breaks. Use P4 only over floor.
4. **No later move is needed** for any countable piece (plan 3.6): no glide before the Bird, no bark before
   the Cone, no Dust Dash before the Titan, no Moon Jump before the Queen. A pattern that needs a move may
   guard only a Hidden Bone or a detour.
5. **No side-by-side breakables on chases or auto-scroll** (the L2 chase, the Roomba ride, the L6 raft,
   any `k.chase` section). The golden-bone audit showed this is how backpacks become impossible.
   - Breakables in those sections sit in single file, staggered along `d` by at least the ride's
     stagger rule: `(|Δx| − 1.66) / lateral speed × forward speed`. That is 1.5 m for 2.6 m apart on the
     Roomba ride.
   - On a chase, the stops needed between checkpoints stay inside the chase budget (golden-bone audit
     sim).
6. **There's a rest spot** before the pattern and after at most the tier's max timed actions.
7. **The phase is known at respawn:** the checkpoint before a pattern resets its clocks (2.1, 2.4), and the
   first timed box is solid within the tier window of respawning.
8. **It's readable from the rest spot** in the level's camera mode (1.4). In the L2 `trackFront` camera,
   Nobu runs toward the camera, so **no blink or slider patterns go in chase sections.**
9. **Tickets:** at most 1 raw ticket per pattern backpack, and no `k.tix` lines over timing pits. Guide
   arcs use `k.guideArc`.
10. **It passes the trial check.** The pattern plays the same in a trial: clocks reset at the start, and
    there's no DDA.

---

### 6. Tests

#### 6.1 `src/levels/gauntletMath.js` (new, pure, no Three or DOM)

- **Exports:**
  - `MOVE`: a copy of the movement constants from 1.1.
  - `simJump(opts)`: per-frame integrator.
  - `reach(move, dy)` → `{ dist, apex, air }`, where `move` is `'tap' | 'held' | 'double' | 'bounceTap'
    | 'bounceHeld' | 'arrowTap' | 'arrowHeld' | 'glide'`, plus `power` for arrows.
  - `arrowReach(power, dy, held)`, in the closed form from 1.2.
  - `blinkWindow(on, off, delayB, airtime)`.
  - `fallWindow(delay)`.
  - `sliderGapWindow(S, range, speed, maxGap)`.
  - `doubleWindow(dyTarget, S)`.
  - `FAIR`: the tier table.
  - `fair(tier)`, with the half-tier rule.
- **`TUNING` stays the source of truth.** Move `TUNING` from `src/player/player.js` to a new
  `src/config/movement.js` and have `player.js` re-export it, so the pure module can import it without
  loading the player. That is a behaviour-neutral refactor in the same PR.

#### 6.2 `validatePattern(pattern, tier)`

- **Input format:**

  ```js
  { id: 'P2', tier: 1, floor: 'pit',
    pieces: [{ kind: 'floorEnd', dd: 0 }, { kind: 'pack', x: 0, y: 0, dd: 3.0 }, ..., { kind: 'floorStart', dd: 16.5 }],
    route: [{ from: 0, to: 1, move: 'held' }, { from: 1, to: 2, move: 'bounceTap' }, ...] }
  ```

- **For each route step:**
  - The horizontal centre distance, and `dy` between standing surfaces (from the box top rules in 0).
  - Check `dist ≤ reach(move, dy).dist × fair(tier).maxPct`.
  - For steps from or to timed pieces:
    - blink → `blinkWindow`
    - fall → `fallWindow`
    - slider → `sliderGapWindow`
    - double → `doubleWindow`
  - Check each window ≥ `fair(tier).minFrames`, and never under 8 frames.
  - Count timed actions between rest pieces.
  - Check no two countable pieces share a `d` within 0.5 m when `pattern.autoScroll` is true.
- **Returns** `[{ step, problem }]`.

#### 6.3 `tests/gauntlet-math.test.js` (concrete cases)

Tolerances: ±3% on distances and airtimes, ±1 frame on windows.

| Case | Expect |
| --- | --- |
| `reach('held', 0)` | dist 5.73, apex 2.14, air 0.72 |
| `reach('tap', 0)` | dist 2.80, apex 0.61 |
| `reach('tap', 1)` | null (can't climb a box) |
| `reach('held', 1).dist` | 5.20 |
| `reach('double', 0)` (best distance) | dist 10.80 |
| `simJump({ double at height })` apex | 3.82 |
| `reach('bounceTap', 0)` | 4.27, air 0.53 |
| `reach('bounceHeld', 0)` | 5.60, air 0.70 |
| `reach('bounceTap', 1)` | 3.47 |
| `arrowReach(16, 0, false)` | 6.56 (closed form); the per-frame result is 6.53 |
| `arrowReach(16, 0, true)` | 7.47 |
| `arrowReach(18, 0, false)` | 7.33 |
| `blinkWindow(1.4, 1.0, 1.0, 0.65)` | 1.05 s (63 f) |
| `blinkWindow(0.9, 0.9, 0.6, 0.35)` | 0.65 s (39 f) |
| `fallWindow(0.30)` | 0.41 s (25 f) |
| `sliderGapWindow(6, 1.6, 1.5, 4.9)` | 1.63 s |
| `doubleWindow(3.0, 4.0)` | 29 f |
| `fair(1.5)` | `{ minFrames: 27, maxPct: 0.775, margin: 0.55, maxActions: 3, tell: 0.55 }` |
| `fair(4.5).minFrames` | 11 |

#### 6.4 `tests/gauntlet-patterns.test.js`

- Imports the 16 patterns as data from `src/levels/gauntletPatterns.js`. The level builders place them
  from the same data, so the test checks what ships.
- Asserts `validatePattern(p, p.tier)` is empty for each.
- Asserts each teach variant validates at tier 1.
- **Negative cases**, which must report a problem:
  - P3 with its last pack at 5.0 m and +0.5 m validated at tier 4.5 (the issue flagged in 4.5).
  - P2 with spacing 4.4 at tier 1.
  - A blink pair with `on 0.5, off 1.0, delayB 0.5` and airtime 0.72 (window 0).
  - Two packs at the same `d` with `autoScroll: true`.
- **The three gauntlet stages** are also exported as pattern sequences with absolute `d`, and each is
  validated end to end at its tier, with rest pads counted between them.

---

### 7. Implementation files

| File | Change |
| --- | --- |
| `src/config/movement.js` (new) | `TUNING` moved here; `player.js` re-exports it |
| `src/entities/boxes.js` (new) | `BeatClock`, `BlinkBox`, `FallBox`, `SlideBox`, `ddaTiming()` |
| `src/levels/kit.js` | `blinkBox`, `bounceChain`, `fallBox`, `slideBox`, `arrowChain`, `guideArc`, `polaroid`; dev registration in `stage.timedBoxes` |
| `src/world/stage.js` | `beatClocks` map, advanced once per frame before entity updates; reset on respawn |
| `src/entities/secrets.js` | `Polaroid` |
| `src/levels/gauntletPatterns.js` (new) | the 16 patterns as data |
| `src/levels/gauntlets.js` (new) | `buildGauntlet1/2/3` |
| `src/levels/gauntletMath.js` (new) | the pure maths and validator |
| `src/levels/registry.js` | `g1`, `g2`, `g3` entries (after H00) |
| `src/game/session.js` | gauntlet medals on `reachGoal`; the Polaroid uses `deaths` |
| `src/game/game.js` | map panel line, G / RB entry, medal pips |
| `src/core/save.js` | the `gauntlets` field (with the rewards spec's v3 schema) |
| `src/config/tickets.js` | `GAUNTLET_FIRST_CLEAR_TICKETS = 5` |
| `src/audio/audio.js` | `blinkTick`, `blinkOn`, `creak` synth sounds |
| `src/story/script.js` | tutorial ids `blinkbox`, `fallbox`, `slidebox`, `bouncechain`, `polaroid` (copy below), the gauntlet banners |
| `src/levels/level1.js`, `level3.js`, L4 | `k.polaroid(...)` at the spots in 4.1 |
| `src/dev.js` | `T.gauntletCheck()` |
| `tests/gauntlet-math.test.js`, `tests/gauntlet-patterns.test.js` (new) | section 6 |

**Tutorial copy** (house voice, from the Sproto Mask):

- `blinkbox`: "Blue boxes blink on a beat. Listen for the tick, then jump. Don't stand there when it
  ticks twice!"
- `fallbox`: "Cracked boxes drop the moment you land. Keep those paws moving."
- `slidebox`: "Moving boxes give you a ride. Jump when the gap is short."
- `bouncechain`: "Bounce, bounce, bounce! Hold jump to go long."
- `polaroid`: "A Polaroid! Only good boys who haven't been bonked get to keep it. Grab it before you trip."

---

### 8. Playtest checklist

| Stage | Check | Target |
| --- | --- | --- |
| G1 | First-time Clear | 3–6 deaths; nobody stuck on one pattern more than 5 times |
| G1 | Box Stairs teach | understood with no deaths |
| G1 | Arrow Relay | most players land every arrow with a tap; if they overshoot, consider power 14 |
| G2 | Falling Floor | the gap jump is made by about 3rd try |
| G2 | Nitro Tightrope | rugs read clearly; no "unfair" deaths from the 2.2 m pull radius (hop clears it) |
| G2 | TNT Fuse Escape | players find the retreat by about 2nd try; the explosion breaks all 6 packs every time |
| G2 | First-time Clear | 6–10 deaths |
| G3 | Blink Tightrope at tier 5 | rhythm is learnable by ear (try with the sound off too: the visual flash must be enough) |
| G3 | Glide Drop | no one lands short by surprise; the arc guide shows in the teach variant earlier in L4 |
| G3 | Last Beat | the ceiling slab blocks the double-jump skip; the slider timing is readable |
| G3 | First-time Clear | 10–16 deaths |
| All | Respawn | after each death, the next pattern starts from the same phase (clocks reset) |
| All | DDA | after 5 deaths at one checkpoint, blinks and slides run 8% slower; Flawless is not possible that run |
| All | Polaroid | greys out after a death; restarting the level from the map makes it collectable again |

---

### Notes for the parent

- **Save schema:** `gauntlets` must be added to the v3 schema in `rewards-spec.md` (1.3), with its
  sanitizer, merge and New Game rules from 4.2.
- **Good Boy %:** the 9 gauntlet medal points have to fit into the mastery track. The rewards spec
  rebalanced it to exactly 100.
- **L4 Polaroid:** the spot is pending the new-levels spec.
- **Refactor:** moving `TUNING` to `src/config/movement.js` is a small, behaviour-neutral change in
  `player.js`.
- **Story copy:** the slide-jump tip in `BETWEEN[1]` claims a much longer jump than the code gives
  (about 0.1 m extra). Either reword it or make the slide jump keep its 10.5 m/s for its airtime.

---

# Part 9: Codex handoff index

Source: `docs/expansion/handoff/README.md`

## Codex handoff: NOBU expansion

This folder breaks the expansion plan into tasks that Codex (or any agent) can pick up one at a time.
Each `Hxx-*.md` file is self-contained: goal, the specs to read, the files to change, the steps, the tests,
what "done" means and the PR text.

### Read these first

1. `AGENTS.md` (repo rules: branches, checks, reviews).
2. `docs/gameplay-expansion-plan.md`: the decisions. **Don't re-decide them in a task.** If a task seems
   to need a different decision, stop and ask the owner in the PR.
3. The spec for the task's area:

| Spec | Covers |
| --- | --- |
| `docs/expansion/rewards-spec.md` | Chomp Chain, Mystery Backpack, Bone Board, Kennel, tally, hints, Good Boy %, DDA, mastery, save v3, Ticket budget |
| `docs/expansion/bosses-spec.md` | All 5 bosses per stage, the `chain` runner, 4-stage evolve, medals, Dust Dash, Moon Jump |
| `docs/expansion/new-levels-spec.md` | The kit helper API (new props, camera modes), Level 4 and Level 5 authoring specs, Chapter 2 story |
| `docs/expansion/box-gauntlets-spec.md` | Box helpers (blink, bounce chain, fall, slide, arrow chain), the pattern library, G1–G3 stages, jump maths |
| `docs/expansion/golden-bone-audit.md` | Which breakables can't be reached today, the checked fixes, the chase and ride rules |
| `docs/expansion/level6-spec.md` | Level 6 Smog Rapids: the raft helper and the full authoring spec |
| `docs/expansion/extended-levels-spec.md` | L1–L3 and bonus-stage extensions, splice points, trial layout versioning, the hub change |

### Rules for every task

- **Branch:** `codex/<slug>` from the latest `main`; the slug is in each task file. Never push to `main`;
  open a pull request.
- **One task per branch.** Don't start a task until the tasks it depends on are merged.
- **Checks before the PR:**

  ```bash
  npm ci
  npm test
  npm run build
  ```

  Baseline on `main` at `bfb4a33` (2026-11-04): 17 test files, 144 tests, all passing; the build passes.
  Report the new numbers in the PR. If you could not run a check, say so.
- **No behaviour change unless the task says so.** Refactor tasks (H00–H05) must leave L1–L3, the bonus
  stages, the bosses and trials playing exactly as before.
- **Never change level ids 1, 2, 3** or the meaning of the existing save fields. Old saves must load.
- **Tickets are the hub's economy.** Every new Ticket source goes through `src/config/tickets.js` and
  stays inside the per-level cap (rewards spec). No Ticket rewards for bones, chains or milestones.
- **Placeholders only.** Don't add new GLBs, images or audio files. New assets are ids in
  `src/art/placeholders.js` that fall back to existing assets (H03). The owner replaces them later
  through `docs/higgsfield-workflow-guide.md`.
- **Don't touch files another open PR is changing.** At the time of writing,
  crrreatorrr/nobu#18 changes `src/gear/catalog.js` and `vendor/`. Check the open PRs before you start.
- **Don't edit `vendor/hub-sdk` by hand.** Follow `vendor/hub-sdk/VENDOR.md`.
- **Keep the house style:** no on-screen attack timers for bosses, telegraphs by animation and sound,
  and every new string in `src/story/script.js`.
- **Review:** a different agent reviews each PR (`agent-task review <path>` on the owner's machine, or a
  Claude Code review). Put "Reviewer: please check …" notes in the PR for anything risky.
- **Manual playtest.** There is no headless WebGL test. Each task lists what to play through with
  `npm run dev`. Say in the PR which of those you did, and what you could not do.

### Cross-spec notes (read before you start)

The specs were written in parallel, so these items settle where they overlap:

- **Naming:** new-levels spec calls the last sections of L4 and L5 "Box Gauntlet G2". That is a
  section label. The standalone stages are `g1`, `g2` and `g3` (box-gauntlets spec 4). Keep both names
  separate in code.
- **Save:** `gauntlets` and `purple` (in `colorBones`) are in the save v3 schema (rewards spec 1.3).
- **Mastery points:** the Box Gauntlet medals (9 points) are inside the 100-point mastery track.
  No-Hit is now 5 × 3 and Boss Rush 3 + 3 (rewards spec 9.1).
- **Movement numbers:** the box-gauntlets spec moves `TUNING` to `src/config/movement.js` so the tests
  can import it. Do this in H04d, and re-export it from `player.js` so nothing else changes.
- **Detours:** a detour on a chase, ride or raft must be a loop (it exits within 2 m of its entry). On
  foot, it may exit further down only if Nobu can walk back across the stretch it skipped.
- **Copy bug:** the slide-jump tip in `src/story/script.js` (`BETWEEN[1]`) promises extra distance the
  code doesn't give (about 0.1 m). Fix the text in H04d.
- **Phase checkpoints for the Bird and Cat** are an owner decision (H20).

### Task order

`→` means "must be merged first". Tasks on the same line can run in parallel.

```
Phase 0  fixes        H06 Golden Bone fixes for L2 + Roomba Rush, with tests   (no dependencies: do it first)
Phase 0  groundwork   H00 registry → H01 save v3
                      H02 difficulty config   H03 placeholders   H05 dev tools      (parallel, after H00)
                      H04a gameplay props   H04b gated objects   H04c chase/detour/dark/rising + cameras   H04d box helpers  (after H00)
Phase 1  rewards      H10 chomp chain + tally + next-goal hint   (after H01)
                      H11 bone board + Good Boy %                (after H01)
                      H12 mystery backpack + Ticket budget test  (after H01, H04b)
Phase 2  bosses       H20 boss system (chain runner, 4-stage evolve, medals, boss DDA)  (after H02)
                      H21 Mecha Bird   H22 Big Cat   H23 Evil Cone   (parallel, after H20)
Phase 2b extensions   H34 trial layout versioning (NOBU side)   H35 hub PR (metaverse-hub)   (parallel, after H01)
                      H30 L1   H31 L2   H32 L3   H33 bonus stages   (parallel, after H04a-c and H34)
Phase 2c gauntlets    H46 Box Gauntlet stages G1–G3 (after H04d, H01)
Phase 3  Chapter 2a   H40 Level 4 Laundry Day (after H04a-c, H11)   H41 Roomba Titan + Dust Dash (after H20)
Phase 3b Chapter 2b   H45 Level 6 Smog Rapids (after H40)
Phase 4  Chapter 2c   H50 Level 5 Pump & Dump (after H45)   H51 Pump Queen + Moon Jump + true ending (after H41)
Phase 5  meta         H60 Kennel   H61 mastery UI (Platinum, Perfect Run, medals list)
                      H62 Smog Remixes (after H50)   H63 Boss Rush (after H51)
Phase 6  hub          H70 L4/L5/L6 trial boards (after H35 is deployed by the owner)
```

### Task list

| ID | Task | Slug | Size |
| --- | --- | --- | --- |
| H06 | Golden Bone fixes (L2, Roomba Rush) + chase/ride tests | `golden-bone-fixes` | S |
| H00 | Level registry | `level-registry` | M |
| H01 | Save v3 | `save-v3` | M |
| H02 | Difficulty config | `difficulty-config` | M |
| H03 | Placeholder assets | `placeholder-assets` | S |
| H04a | Gameplay props (zipline, spin drum, toaster, market, rug pull) | `kit-gameplay-props` | L |
| H04b | Gated objects and pickups (dust wall, moon ledge, smog vent, zoomie gate, mystery, pity snacks, section) | `kit-gated-objects` | M |
| H04c | Chase, detour, dark, rising, side and rise cameras | `kit-chase-detour-camera` | L |
| H04d | Box helpers (blink, bounce chain, fall, slide, arrow chain) | `kit-box-helpers` | M |
| H05 | Dev tools (death heatmap, section timers) | `dev-heatmap` | S |
| H10 | Chomp Chain, tally, next-goal hint | `chomp-chain-tally` | M |
| H11 | Bone Board, Good Boy % | `bone-board` | M |
| H12 | Mystery Backpack, Ticket budget test | `mystery-backpack` | M |
| H20 | Boss system | `boss-system` | M |
| H21 | Mecha Bird powers | `boss-bird-powers` | M |
| H22 | Big Cat powers | `boss-cat-powers` | M |
| H23 | Evil Cone powers | `boss-cone-powers` | M |
| H30 | Extend L1 | `extend-l1` | L |
| H31 | Extend L2 | `extend-l2` | L |
| H32 | Extend L3 | `extend-l3` | L |
| H33 | Extend the bonus stages | `extend-bonus` | M |
| H34 | Trial layout versioning | `trial-layout-v2` | M |
| H35 | Hub: v2 trial variants (metaverse-hub repo) | `nobu-trial-v2` | S |
| H40 | Level 4 Laundry Day | `level4-laundry` | XL |
| H41 | Roomba Titan, Dust Dash | `boss-roomba-titan` | XL |
| H45 | Level 6 Smog Rapids (raft) | `level6-rapids` | XL |
| H46 | Box Gauntlet stages G1–G3 + Polaroids | `box-gauntlets` | L |
| H50 | Level 5 Pump & Dump Pipeline | `level5-pump` | XL |
| H51 | Pump Queen, Moon Jump, true ending | `boss-pump-queen` | XL |
| H60 | Kennel and milestones | `kennel` | L |
| H61 | Mastery UI | `mastery-ui` | M |
| H62 | Smog Remixes | `smog-remix` | L |
| H63 | Boss Rush | `boss-rush` | M |
| H70 | L4/L5/L6 trial boards | `trial-l4-l6` | S |

Sizes: S ≈ under 300 changed lines, M ≈ 300–800, L ≈ 800–1500, XL ≈ larger, so split it into reviewable
commits.

### Owner actions these tasks can't do

- Merge PRs and deploy. The hub goes first for any board change (H35, H70); see `handoff.md` for the
  deploy order.
- Sign off on the per-level Ticket caps (rewards spec) before H12, H30–H33, H40, H45 and H50 merge.
- Tell players about the trial board reset (H34, H35) before it ships.
- Replace placeholders with real art when ready.

---

# Part 10: H00-level-registry

Source: `docs/expansion/handoff/H00-level-registry.md`

## H00: Level registry

| | |
| --- | --- |
| Branch | `codex/level-registry` from the latest `main` |
| Size | M |
| Needs merged first | nothing |
| Can run alongside | any task that touches other files |
| Unblocks | H01 and every later task |

### Goal

Move the level table out of `session.js` and the map tables out of `game.js` into one registry, so new levels (4, 5, 6, bonus stages, G1–G3) are added in one place. No behaviour change.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 10.1 item 1
- `docs/expansion/rewards-spec.md` 0 (level id conventions, play order 1, 2, 3, 4, 6, 5)
- `src/game/session.js` (`LEVELS`, `LEVEL_NAMES`) and `src/game/game.js` (`MAP_NODES`, `MAP_ORDER`, `BONUS_AFTER`, `mapOpen`)

### Files

**Change or create:**

- new `src/levels/registry.js`: entries `{ id, name, build, arena, Boss, bossKey, theme, bossTheme, bonus, tier, unlock(saveData), mapPos, trial, shipped }`, plus `MAP_ORDER` and helpers `levelDef(id)`, `isOpen(id, data)`, `playOrder()`
- `src/game/session.js`: import from the registry
- `src/game/game.js`: map reads `MAP_ORDER`, node positions and `isOpen` from the registry
- new `tests/registry.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Create the registry with today's five entries (1, ride, 2, cave, 3) and today's unlock rules exactly (`mapOpen` logic, `BONUS_AFTER`).
2. Keep `LEVEL_NAMES` exported from `session.js` (re-export) so nothing else breaks.
3. Add `tier` from plan 4.1 (`LEVEL_TIER`) and `shipped: true` for the five; nothing reads them yet.
4. Replace the tables in `game.js` and `session.js` with registry calls.
5. Leave ids as they are: numbers 1–3 and strings `'ride'`, `'cave'`.

### Tests

- `tests/registry.test.js`: ids 1–3 unchanged; unlock chain on fresh, after beating L1, after L2, after L3 matches the old `mapOpen`; bonus unlock by `beaten` or `found`; `MAP_ORDER` equals today's

### Done when

- No behaviour change: same map, same unlocks, same names
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Title → map: walk the nodes; locked and open states match `main`
- Play L1 to the boss gate and the Ride bonus stage once

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Move levels and map nodes into one registry`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 11: H01-save-v3

Source: `docs/expansion/handoff/H01-save-v3.md`

## H01: Save v3

| | |
| --- | --- |
| Branch | `codex/save-v3` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | any task that touches other files |
| Unblocks | H10, H11, H12, H34, H60, H61 |

### Goal

Move the save to v3: per-level data keyed by level id (so it no longer assumes 3 levels) plus the new fields, with a lossless v2 → v3 migration.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 1.3 (schema), 1.4 (sanitizers), 1.5 (migration step by step), 1.6 (multi-tab merge), 17 `tests/save-migrate.test.js` and `tests/multitab.test.js` additions
- `src/core/save.js` (all of it) and `tests/multitab.test.js`, `tests/save-scores.test.js`

### Files

**Change or create:**

- `src/core/save.js`
- new `tests/save-migrate.test.js`
- `tests/multitab.test.js` (additions)
- every reader of `beaten[i]`, `bones[i]`, `bestDogs[i]` (grep for them; switch to the keyed helpers)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Add the v3 fields with defaults exactly as rewards spec 1.3.
2. Write the sanitizers in 1.4.
3. Write the migration in 1.5; keep the `.corrupt` backup behaviour.
4. Add keyed helpers (`beatenOf(id)`, `setBeaten(id)`, …) and switch the readers.
5. Update the multi-tab merge as in 1.6.
6. Keep `trials` untouched here (layout versioning is H34).

### Tests

- `tests/save-migrate.test.js`: every case listed in rewards spec 17
- `tests/multitab.test.js`: the additions in rewards spec 17
- existing save tests still pass unchanged

### Done when

- A v2 save from `main` loads with nothing lost; a fresh save is v3
- New Game keeps trial bests (and the extra kept fields in rewards spec 18 item 7)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Load a save made on `main` (copy the localStorage key) and check map, bones, lives, Tickets, trials, wardrobe
- Two tabs: set a trial best in one; the other keeps it

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Move the save to v3 with keyed level data`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- migration is lossless and idempotent
- no field is read by index 0..2 any more

---

# Part 12: H02-difficulty-config

Source: `docs/expansion/handoff/H02-difficulty-config.md`

## H02: Difficulty config

| | |
| --- | --- |
| Branch | `codex/difficulty-config` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | H03, H04*, H05 |
| Unblocks | H20 |

### Goal

Move the difficulty numbers into `src/config/difficulty.js` (level tiers, boss ladder, fairness floor) and read them everywhere, with no change to how anything plays.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 4.1 and 4.2
- `docs/expansion/bosses-spec.md` 1.1 (getters), 7 (ladder test cases 1, 3, 5, 6 are M0), 8 item 1
- `src/bosses/mechaBird.js`, `bigCat.js`, `evilCone.js`, `common.js` (the literals for hp, per-stage hits, speed, punish windows, ult charge)

### Files

**Change or create:**

- new `src/config/difficulty.js` (`LEVEL_TIER`, `TIER`, `BOSS`, `FLOOR`, `M2_ON = false`)
- the three boss files and `common.js`: read hp, perStage, speed, window from `BOSS` through the getters
- new `tests/difficulty.test.js` (the M0 cases)

**Don't touch:**

- any boss attack logic beyond swapping literals for getters
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Create the file with the tables from plan 4.1 (with `tele = 1` and `chain = 1` for bird, cat, cone until M2 turns them on, as bosses spec 1.1 says).
2. Swap each literal for the getter. Keep a comment with the old literal next to each.
3. Add `TIER` reads only where the plan names them (enemy speed, hazard periods, crumble delay); at tier 1–3 the multipliers must equal today's values, so check each one is 1.0 for today's levels or leave TIER unread until H04/H30.

### Tests

- `tests/difficulty.test.js` M0 cases (bosses spec 7): table monotonic, fairness floor, and 'M0 values equal the old literals'

### Done when

- Every boss number that moved has a test proving it equals the old literal
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Fight all three bosses once; nothing feels different

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Move difficulty numbers into config/difficulty.js`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 13: H03-placeholder-assets

Source: `docs/expansion/handoff/H03-placeholder-assets.md`

## H03: Placeholder assets

| | |
| --- | --- |
| Branch | `codex/placeholder-assets` from the latest `main` |
| Size | S |
| Needs merged first | H00 |
| Can run alongside | H02, H04*, H05 |
| Unblocks | H40, H41, H45, H50, H51 |

### Goal

Let code ask for new asset ids (Roomba Titan, Pump Queen, new textures…) that fall back to existing assets with a transform until real art is added.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/gameplay-expansion-plan.md` 9.1 and 9.2
- `docs/expansion/bosses-spec.md` 5.1 and 6.1 (placeholder builds)
- `src/art/assets.js`, `src/art/fallbacks.js`, `public/assets/manifest.json`

### Files

**Change or create:**

- new `src/art/placeholders.js`: `{ newId: { from, scale, tint, rot, opacity } }` for every row in plan 9.2
- `src/art/assets.js`: when an id has no manifest entry or fails to load, use the placeholder
- new `tests/placeholders.test.js`

**Don't touch:**

- `public/assets/` (no new files)
- `tools/build_asset_list.py`
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Write the map from plan 9.2.
2. In `Assets.model` / `Assets.url` / textures: look up the new id first; fall back to `from` and apply scale, tint (material colour multiply on a clone), rotation, opacity.
3. Never mutate the shared source material: clone.
4. Log once per id in dev when a placeholder is used.

### Tests

- `tests/placeholders.test.js`: every `from` id exists in `manifest.json`; no placeholder id collides with a manifest id; transforms are numbers

### Done when

- Asking for `model_roomba_titan` returns a tinted, scaled vacuum; real GLB under that id wins when added
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Dev console: spawn `model_roomba_titan` and `model_pump_queen` in the L1 arena (dev helper) and look at them

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add placeholder asset ids that fall back to existing art`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 14: H04a-kit-gameplay-props

Source: `docs/expansion/handoff/H04a-kit-gameplay-props.md`

## H04a: Kit: gameplay props (spin drum, zipline, toaster, market platforms, rug pull)

| | |
| --- | --- |
| Branch | `codex/kit-gameplay-props` from the latest `main` |
| Size | L |
| Needs merged first | H00 |
| Can run alongside | H04b, H04c, H04d, H02, H03, H05 |
| Unblocks | H30–H33, H40, H50 |

### Goal

Add the moving and timed props the new and extended levels need, each with rollback on death.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 1.0 (conventions), 1.9–1.13, 1.18 (extra options), 2 (spans versus Solids, jump reach)
- `src/entities/props.js`, `src/world/physics.js`, `src/levels/kit.js`

### Files

**Change or create:**

- `src/entities/props.js` (or new `src/entities/props2.js` if `props.js` grows past ~1000 lines)
- `src/levels/kit.js` (`k.spinDrum`, `k.zipline`, `k.toaster`, `k.market` + `MarketClock`, `k.rugPull`)
- a dev-only test strip level in `src/dev.js` that places one of each

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. One prop per commit, each with the exact defaults and behaviour in its spec section.
2. Every prop resets in `onRespawn` as new-levels spec 1.0 says.
3. No per-frame allocations (reuse vectors, as the boss code does since `a65687e`).

### Tests

- pure tests for the timing maths: `MarketClock` phase and the toaster cycle (new `tests/props-timing.test.js`)

### Done when

- Each prop works on the dev test strip, including death and respawn mid-cycle
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Dev test strip: ride the drum, zipline, toaster, market platforms and rug pull; die on each and respawn

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add spin drum, zipline, toaster, market platform and rug pull props`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 15: H04b-kit-gated-objects

Source: `docs/expansion/handoff/H04b-kit-gated-objects.md`

## H04b: Kit: gated objects and pickups (section, pity snacks, mystery, dust wall, moon ledge, smog vent, zoomie gate)

| | |
| --- | --- |
| Branch | `codex/kit-gated-objects` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | H04a, H04c, H04d |
| Unblocks | H10 (sections), H12 (mystery), H30–H33, H40, H41, H51 |

### Goal

The helpers that mark sections, add pity checkpoints and gate secrets behind boss moves.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 1.1, 1.3–1.8
- `docs/expansion/rewards-spec.md` 6 (move-gated bookkeeping), 3 (mystery), 11 (pity checkpoints come from the DDA)

### Files

**Change or create:**

- `src/levels/kit.js`
- `src/entities/secrets.js` (DustWall, MoonLedge, SmogVent, ZoomieGate, PitySnacks)
- `src/entities/breakables.js` (only if H12 hasn't added `MysteryBackpack`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Gated objects read the player's moves from the beaten map (rewards spec 6.1); they always look gated (plan 3.6).
2. Pity snacks stay dormant until the DDA turns them on (H05/H12 own the DDA call; add the hook only).
3. `k.section` only records names and ranges here.

### Tests

- gate rule test: a Golden Bone never sits behind a gate (`tests/gates.test.js`, reads level data exports where they exist)

### Done when

- Each object works on the dev test strip with and without its move
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Dev test strip with a fresh save, then with a save that has every boss beaten

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add section markers, pity checkpoints and move-gated objects`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 16: H04c-kit-chase-detour-camera

Source: `docs/expansion/handoff/H04c-kit-chase-detour-camera.md`

## H04c: Kit: chase, detour, dark, rising, and the side and rise cameras

| | |
| --- | --- |
| Branch | `codex/kit-chase-detour-camera` from the latest `main` |
| Size | L |
| Needs merged first | H00 |
| Can run alongside | H04a, H04b, H04d |
| Unblocks | H30–H33, H40, H45, H50 |

### Goal

Generalise the L2 chase into a reusable `Chaser`, and add detours, dark stretches, rising hazards and two camera modes.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 1.2, 1.14–1.17
- `docs/expansion/golden-bone-audit.md` (chase rule: stops ≤ 75% of budget; detours on chases are loops only)
- `src/bosses/bigCat.js` `ChaseCat`, `src/camera/camera.js`, `src/levels/bonusCave.js` (darkness)

### Files

**Change or create:**

- new `src/entities/chaser.js` (from `ChaseCat`; `ChaseCat` becomes a thin subclass so L2 behaves exactly the same)
- `src/levels/kit.js` (`k.chase`, `k.detour`, `k.dark`, `k.rising`)
- `src/camera/camera.js` (`'side'`, `'rise'`)
- `tests/chase-budget.test.js` (make the model accept any chase's data)

**Don't touch:**

- L2 placements (H06, H31)
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Extract `Chaser` with no change to L2's numbers; check with the chase-budget test and a playtest.
2. Detours as new-levels spec 1.16 with the loop rule.
3. Dark and rising (1.14, 1.15), cameras (1.17).

### Tests

- chase-budget test still passes for L2; a second fixture with a model/scale option
- `tests/detour.test.js`: loop rule (exit within 2 m) for chase/ride stretches

### Done when

- L2 plays the same; a dev strip shows a coconut chase, a detour, a dark stretch, rising water and both cameras
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- L2 start to gate; the dev strip

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add a reusable chaser, detours, dark and rising stretches, and side and rise cameras`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 17: H04d-kit-box-helpers

Source: `docs/expansion/handoff/H04d-kit-box-helpers.md`

## H04d: Kit: box helpers (blink, bounce chain, fall, slide, arrow chain)

| | |
| --- | --- |
| Branch | `codex/kit-box-helpers` from the latest `main` |
| Size | M |
| Needs merged first | H00 |
| Can run alongside | H04a, H04b, H04c |
| Unblocks | H30–H32 final sections, H40, H45, H46, H50 |

### Goal

The timed box helpers every Box Gauntlet uses, the shared beat clock, and the jump maths as a pure module with tests.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/box-gauntlets-spec.md` 0, 1 (jump maths and fairness table), 2 (all five helpers and the shared rules), 6 (tests), 7
- `src/entities/breakables.js` (`Lunchbox`, arrow boxes), `src/player/player.js` (`TUNING`)

### Files

**Change or create:**

- new `src/config/movement.js` (`TUNING` moved here and re-exported from `player.js`)
- new `src/levels/gauntletMath.js` (pure)
- `src/entities/` new box entities and `BeatClock`
- `src/levels/kit.js` (the five helpers, `k.guideArc`)
- `src/story/script.js` (fix the slide-jump tip in `BETWEEN[1]`)
- new `tests/gauntlet-math.test.js`, `tests/gauntlet-patterns.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Move `TUNING` with no behaviour change.
2. Pure maths and the pattern validator with tests first.
3. Helpers one per commit, each resetting its group clock on respawn.
4. Build each of the 16 patterns once on a dev strip.

### Tests

- box-gauntlets spec 6.3 and 6.4 cases, including the negative ones

### Done when

- All 16 patterns pass the validator at their tier and play on the dev strip
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Dev strip: every pattern; die mid-pattern and check it restarts from the same phase

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add blink, bounce chain, falling, sliding and arrow-chain boxes`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 18: H05-dev-heatmap

Source: `docs/expansion/handoff/H05-dev-heatmap.md`

## H05: Dev tools: death heatmap and section timers

| | |
| --- | --- |
| Branch | `codex/dev-heatmap` from the latest `main` |
| Size | S |
| Needs merged first | H00 |
| Can run alongside | H02, H03, H04* |
| Unblocks | tuning in every level task |

### Goal

Record where and how players die and how long each section takes, in dev builds only, to tune difficulty.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 13 (heatmap, section timers, playtest protocol)
- `src/dev.js`, `src/main.js`

### Files

**Change or create:**

- `src/dev.js`
- `src/game/session.js` (one dev-only hook in the death path and one per section change, guarded by `import.meta.env.DEV`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Follow rewards spec 13.1 and 13.2 exactly.
2. Overlay with `?heatmap` in the URL.
3. Make sure the production build tree-shakes it (check `dist/` for the strings).

### Tests

- a small pure test for the record/merge helpers if you add any

### Done when

- `npm run build` output contains no heatmap code
- Overlay shows dots after a few deaths in L1
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Die a few times in L1 with `?heatmap`; reload; dots persist

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add a dev-only death heatmap and section timers`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 19: H06-golden-bone-fixes

Source: `docs/expansion/handoff/H06-golden-bone-fixes.md`

## H06: Golden Bone fixes for Scratchpost Canyon and Roomba Rush

| | |
| --- | --- |
| Branch | `codex/golden-bone-fixes` from the latest `main` |
| Size | S |
| Needs merged first | nothing (do this first) |
| Can run alongside | any task that touches other files |
| Unblocks | H31, H33 (they extend the same files) |

### Goal

Make every countable breakable in Scratchpost Canyon (L2) and Roomba Rush breakable in one run, and add tests so no chase or ride can become impossible again. Today L2's last checkpoint segment can't be cleared and Roomba Rush has four places where only one of two or three side-by-side breakables can be hit.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/golden-bone-audit.md` (the whole file: findings, numbers, exact fixes)
- `tools/audit/chase-budget.mjs` and `tools/audit/ride-reach.mjs` (the models to port)
- `src/bosses/bigCat.js` `ChaseCat.update` (rubber band) and `src/player/player.js` (ride branch, bite and slide)

### Files

**Change or create:**

- `src/levels/level2.js`: the 4 edits in the audit's L2 fix (Snacks at D(238), stack to D(242), `packWall(250, true)`, plain pack at D(270))
- `src/levels/bonusRide.js`: the 4 stagger edits in the audit's Roomba Rush table
- new `src/levels/data/l2-chase.js` and `src/levels/data/ride-breakables.js`: the breakable and checkpoint lists as plain data, imported by the level files so the tests read the real placements
- new `tests/chase-budget.test.js` and `tests/ride-reach.test.js` (port the models)

**Don't touch:**

- other level files
- `ChaseCat` tuning (the speed stays as it is; only placements change)
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Move the L2 breakable and Snacks placements that the chase test needs into `src/levels/data/l2-chase.js` (array of `{ kind, x, y, d }` in authoring `d`, before the `D()` offset) and have `level2.js` loop over it. Keep every other placement as it is.
2. Apply the four L2 edits from the audit.
3. Port `chase-budget.mjs` into a pure helper `tools/audit/chaseModel.js` (export `run`, `budget`) and use it from `tests/chase-budget.test.js`. Derive each stop's needed time from the data (pack wall = 3 bites + lateral moves, stack = 2 bites, zipped = slide 0.2 s, single pack = 0.1 s) with the constants in the audit.
4. Do the same for Roomba Rush: data file, the four stagger edits, `tests/ride-reach.test.js` with the stagger rule `(|dx| − 1.67) / 6.8 × 10.5 + 1`.
5. Check the moved Roomba Rush breakables don't overlap cables, toy piles or legs (look at the surrounding lines in `bonusRide.js`).
6. In L1, fix the trampoline soft-lock from the audit: add a lunchbox step so the d 110 ledge is reachable without the trampoline.

### Tests

- `tests/chase-budget.test.js`: for each L2 checkpoint segment, every stop fits in at most 75% of the simulated budget given the stops before it; and the pre-fix layout (inline fixture) fails, so the test can catch the bug
- `tests/ride-reach.test.js`: every pair of Roomba Rush countables satisfies the stagger rule; the pre-fix layout fails

### Done when

- Both new tests pass and fail on the pre-fix fixtures
- L2 now has 3 Snacks checkpoints and the gate is unchanged
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- L2 from the D(173) checkpoint to the gate: break every backpack (stack, gapped wall, D(270) pack, D(284)/D(288) packs) with the cat chasing; no Mega Bark
- Roomba Rush: ram every backpack, the Zipped Backpack, the Cat and the Vacuum Dock in one run; finish without the missed-backpack rain
- L1: bite the trampoline first, then reach the ledge by the new step

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Fix unreachable breakables in Scratchpost Canyon and Roomba Rush`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- the gapped-wall margin is the tightest (1.3×): play it
- the data files are the single source the level reads (no duplicated numbers)

---

# Part 20: H10-chomp-chain-tally

Source: `docs/expansion/handoff/H10-chomp-chain-tally.md`

## H10: Chomp Chain, end-of-level tally and next-goal hint

| | |
| --- | --- |
| Branch | `codex/chomp-chain-tally` from the latest `main` |
| Size | M |
| Needs merged first | H01 |
| Can run alongside | H11, H12, H20–H23 |
| Unblocks | H61 |

### Goal

Add the Chomp Chain combo (with its Blue Sphere reward), replace the results panel with a count-up tally, and show one next-goal hint after each level and on the map.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 0 (contexts), 1.1–1.2 (session fields, hooks), 2 (Chomp Chain), 7 (tally), 8 (next-goal hint), 14 (interaction matrix), 15 (copy), 16 (new sounds)
- `docs/gameplay-expansion-plan.md` 3.2, 3.7, 3.8

### Files

**Change or create:**

- new `src/game/rewards.js` (`rewardCtx`, chain logic as pure functions)
- `src/game/session.js` (chain state, reset on death and rollback, `k.section` data for hints)
- `src/game/game.js` (`updateComplete`: the tally sequence)
- `src/ui/ui.js` (chain HUD)
- `src/audio/audio.js` (the new sounds in rewards spec 16)
- `src/levels/kit.js` (`k.section` if H04b has not added it yet; coordinate)
- `src/levels/level1.js`, `level2.js`, `level3.js`: `k.section` names for the hint

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Pure chain rules first (`rewards.js`), with tests.
2. Hook breaks and enemy defeats (rewards spec 1.2 table).
3. HUD and the rising-pitch break sound.
4. Tally sequence with the timings in rewards spec 7.2; skippable after the first time.
5. Next-goal hint (rewards spec 8.2) on the results screen and the map panel.
6. Respect every context in rewards spec 0 (trial: counter shows, no sphere).

### Tests

- `tests/rewards.test.js` (new): chain timing (1.1 s window), reset on ground time, sphere once per checkpoint section, trial context
- the hint cases in rewards spec 17 (`bones.test.js` part for `nextGoal`), if H11 has not landed write them here and move later

### Done when

- Chain of 8 in L1's first section drops one sphere; never in a trial
- Tally plays in the order and timings of the spec
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- L1: chain 8 backpacks, watch the sphere; die and check the chain resets; finish and watch the tally; check the hint names a real section
- Run a trial: counter shows, no sphere

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the Chomp Chain, the count-up tally and the next-goal hint`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 21: H11-bone-board

Source: `docs/expansion/handoff/H11-bone-board.md`

## H11: Bone Board and Good Boy %

| | |
| --- | --- |
| Branch | `codex/bone-board` from the latest `main` |
| Size | M |
| Needs merged first | H01 |
| Can run alongside | H10, H12, H20–H23 |
| Unblocks | H40, H45, H50, H60 |

### Goal

Six bones per main level (Golden, Good Boy, Hidden, three Snack tiers), three per bonus stage, shown in the pause menu, results and map, plus the Good Boy % completion counter.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 4 (Bone Board), 9 (Good Boy %), 6.3 (Golden Bone never gated), 14, 15, 17 (`bones.test.js`, `good-boy-percent.test.js`)
- `docs/gameplay-expansion-plan.md` 3.4, 3.9

### Files

**Change or create:**

- new `src/game/bones.js` and `src/game/progress.js` (pure)
- `src/game/session.js` (death count for Good Boy, raw ticket count for Snack bones, Hidden Bone pickup saves at once)
- `src/game/game.js` (map panel, results, pause board)
- `src/ui/ui.js`
- `src/entities/secrets.js` (a `HiddenBone` pickup entity, placeholder = `golden_bone` tinted)
- `src/levels/level1.js`–`level3.js`: place one Hidden Bone each (spots in the extended-levels spec; until then a temporary spot noted in a TODO)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Pure rules and tests first.
2. Wire the counters into the session.
3. UI: pause board with silhouettes, results stamp-in (after H10's tally if merged), map panel.
4. Good Boy % on the title/map with the shipped-only denominator (rewards spec 9.1).
5. Golden Bones already earned stay earned (never revoke).

### Tests

- `tests/bones.test.js` and `tests/good-boy-percent.test.js`: all cases in rewards spec 17 (95-point base, floor rule, shipped-only denominator, secret ending)

### Done when

- The board shows for L1–L3 and both bonus stages; existing Golden Bones show as earned
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- L1 with ≤3 deaths: Good Boy Bone; with 4: none
- Collect 40% / 60% / 80% of tickets: snack tiers stamp
- Pick up a Hidden Bone, quit without finishing: it stays

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the Bone Board and Good Boy %`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 22: H12-mystery-backpack

Source: `docs/expansion/handoff/H12-mystery-backpack.md`

## H12: Mystery Backpack and the per-level Ticket budget test

| | |
| --- | --- |
| Branch | `codex/mystery-backpack` from the latest `main` |
| Size | M |
| Needs merged first | H01 (and H04b for `k.mystery` if it lands first; otherwise add the helper here) |
| Can run alongside | H10, H11 |
| Unblocks | H30–H33, H40, H45, H50 |

### Goal

Add the seeded Mystery Backpack and a test that every level's maximum Tickets stays under its cap.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 3 (Mystery Backpack, seeded per run), 10 (Ticket guardrails, measuring procedure, caps, how the test gets each level's maximum), 17 (`mystery.test.js`, `level-budget.test.js`)
- `src/config/tickets.js`, `src/entities/tickets.js`, `tests/earn.test.js`, `tests/level-end-chunks.test.js`

### Files

**Change or create:**

- new `src/game/rng.js`
- `src/entities/breakables.js` (`MysteryBackpack`)
- `src/levels/kit.js` (`k.mystery`)
- `src/config/tickets.js` (`LEVEL_TICKET_CAP` per level)
- each level file: a `BUDGET` export as the rewards spec 10.5 describes
- `src/dev.js` (`T.budget()` measuring command)
- two Mystery Backpacks each in L1–L3 at side-path spots

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Measure today's per-level max with `T.budget()` and write the numbers into the PR and into rewards spec 10.3 (replace the static estimate).
2. Set the caps from 10.4 scaled by the measurement; flag them for owner sign-off in the PR.
3. Build the seeded roll and the entity (rollback restores the same result).
4. Budget test reads each level's `BUDGET` export.

### Tests

- `tests/mystery.test.js` and `tests/level-budget.test.js`: the cases in rewards spec 17

### Done when

- The measured numbers replace the estimates in the spec
- Budget test fails if a level's max goes over its cap
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Open each Mystery Backpack in L1; die and reopen: same result; restart the level: may differ

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the Mystery Backpack and a per-level Ticket budget test`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

### Owner decisions this task needs

- Sign off on the per-level Ticket caps (plan 12 risk 5) before merge

---

# Part 23: H20-boss-system

Source: `docs/expansion/handoff/H20-boss-system.md`

## H20: Boss system: chain runner, 4-stage evolve, checkpoints, medals, boss DDA

| | |
| --- | --- |
| Branch | `codex/boss-system` from the latest `main` |
| Size | M |
| Needs merged first | H02 |
| Can run alongside | H10–H12 |
| Unblocks | H21, H22, H23, H41, H51 |

### Goal

Shared boss features every boss task needs.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 0, 1.1–1.8, 7, 8, 9 (conflicts, especially item 1)
- `docs/expansion/rewards-spec.md` 11.4 (boss DDA), 12.2 (medals)
- `src/bosses/common.js`, `src/game/session.js` boss hooks

### Files

**Change or create:**

- `src/bosses/common.js` (chain runner with 0.5 s grace after a hit; evolve for n = 4; generalised `chargeTimes`, `stageNames`)
- new `src/bosses/arena.js` (shared projectiles and arena pieces from bosses spec 1.5)
- `src/player/player.js` (hooks in bosses spec 1.8: cage trap, coned state, `onDash`)
- `src/game/session.js` (phase checkpoints for every boss, boss DDA, medal tracking)
- `src/core/save.js` (`bossMedals`, if H01 did not add it)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Chain runner and tests.
2. 4-stage evolve with no visible change to today's 3-stage bosses.
3. Phase checkpoints: see the owner decision below before turning them on for the Bird and Cat.
4. Boss DDA (3 deaths in a stage: tele +15%, window +0.3 s, start with 1 mask); any DDA-helped attempt can't earn medals.
5. Medals: No-Hit (masks and collar saves count as hits) and Speed.

### Tests

- `tests/difficulty.test.js` stays green
- new `tests/boss-chain.test.js` (pure runner: order, grace after hit, never below `FLOOR`)
- new `tests/boss-medals.test.js`

### Done when

- Today's three fights play the same (with `M2_ON = false`)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Each boss once; die in stage 2 and check where you respawn

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the shared boss chain runner, 4-stage evolve, medals and boss DDA`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

### Owner decisions this task needs

- Phase checkpoints for the Bird and Cat (they restart from stage 1 today). The bosses spec turns them on for all bosses, which makes the first two fights a little easier. Ask the owner in the PR; default to on.

---

# Part 24: H21-boss-bird-powers

Source: `docs/expansion/handoff/H21-boss-bird-powers.md`

## H21: Mecha Bird: new powers per stage

| | |
| --- | --- |
| Branch | `codex/boss-bird-powers` from the latest `main` |
| Size | M |
| Needs merged first | H20 |
| Can run alongside | H22, H23 |
| Unblocks | — |

### Goal

Add the Mecha Bird's new power, arena change and ultimate upgrade for each stage.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 2 (all of it)
- `docs/gameplay-expansion-plan.md` 7.2

### Files

**Change or create:**

- `src/bosses/mechaBird.js`
- `src/levels/level1.js` (`buildBoss1Arena`: perches, wind lanes)
- `src/bosses/arena.js` (pieces it needs)
- `src/story/script.js` (copy)
- `src/audio/audio.js` (sounds)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Perch Peck (stage 1), Cage Drop + wind lanes (stage 2), Drone Escort + laser→volley chain + craters (stage 3) as bosses spec 2.2–2.4.
2. Plans as the arrays in bosses spec 2.3.
3. Turn on the bird's M2 values in `difficulty.js`.

### Tests

- `tests/difficulty.test.js` M2 cases for the bird

### Done when

- Every checklist item in bosses spec 2.7 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- bosses spec 2.7 checklist; plus once with the Wizard Hat (boss skipped) and once with Classic Nobu

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Give the Mecha Bird a new power, arena change and ultimate upgrade per stage`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 25: H22-boss-cat-powers

Source: `docs/expansion/handoff/H22-boss-cat-powers.md`

## H22: Big Cat: new powers per stage

| | |
| --- | --- |
| Branch | `codex/boss-cat-powers` from the latest `main` |
| Size | M |
| Needs merged first | H20 |
| Can run alongside | H21, H23 |
| Unblocks | — |

### Goal

Add the Big Cat's new power, arena change and ultimate upgrade for each stage.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 3 (all of it) and 9 item 2 (cat window 2.7 s from M2)
- `docs/gameplay-expansion-plan.md` 7.3

### Files

**Change or create:**

- `src/bosses/bigCat.js` (boss only; don't change `ChaseCat`)
- `src/levels/level2.js` (`buildBoss2Arena`: ledges, crumble ring, catnip)
- `src/bosses/arena.js`
- `src/story/script.js`
- `src/audio/audio.js`

**Don't touch:**

- `ChaseCat` and the L2 chase placements (H06, H31)
- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Laser Pointer (stage 1), Knock It Off the Table + scratch marks (stage 2), Ghost Lives + Catnip + crumble ring (stage 3).
2. Pools as bosses spec 3.3.
3. Turn on the cat's M2 values (window 2.7).

### Tests

- `tests/difficulty.test.js` M2 cases for the cat

### Done when

- Every checklist item in bosses spec 3.7 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- bosses spec 3.7 checklist

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Give the Big Cat a new power, arena change and ultimate upgrade per stage`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 26: H23-boss-cone-powers

Source: `docs/expansion/handoff/H23-boss-cone-powers.md`

## H23: Evil Cone: new powers per stage

| | |
| --- | --- |
| Branch | `codex/boss-cone-powers` from the latest `main` |
| Size | M |
| Needs merged first | H20 |
| Can run alongside | H21, H22 |
| Unblocks | H41 (shares the vortex and coned-state code) |

### Goal

Add the Evil Cone's new power, arena change and ultimate upgrade for each stage.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 4 (all of it) and 9 item 4 (pedestal positions)
- `docs/gameplay-expansion-plan.md` 7.4

### Files

**Change or create:**

- `src/bosses/evilCone.js`
- `src/levels/level3.js` (`buildBoss3Arena`: tile grid, pedestals)
- `src/bosses/arena.js`
- `src/player/player.js` (coned state from H20)
- `src/story/script.js`
- `src/audio/audio.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Cone of Shame (stage 1), Rug Pull tiles (stage 2), Smog Tide + chain of 3 (stage 3).
2. Plans as bosses spec 4.3.
3. Turn on the cone's M2 values.

### Tests

- `tests/difficulty.test.js` M2 cases for the cone

### Done when

- Every checklist item in bosses spec 4.7 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- bosses spec 4.7 checklist

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Give the Evil Cone a new power, arena change and ultimate upgrade per stage`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 27: H40-level4-laundry

Source: `docs/expansion/handoff/H40-level4-laundry.md`

## H40: Level 4 Laundry Day

| | |
| --- | --- |
| Branch | `codex/level4-laundry` from the latest `main` |
| Size | XL (split into commits: track and theme, sections 1–7, detours, decor, story) |
| Needs merged first | H04a–d, H11, H12, H03 |
| Can run alongside | H41 (the boss) |
| Unblocks | H45, H46 (G3 Polaroid lives here) |

### Goal

Build Level 4 (about 476 m to the gate, tier 4, target 10–14 first-play deaths) exactly as specified, with two Box Gauntlets, two detours and 7 dogs.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 0, 2, 3 (all of it), 5, 6.1
- `docs/expansion/box-gauntlets-spec.md` (the helpers used in the Cereal Box Steps and the Boiler Room; the Polaroid for G3)
- `docs/expansion/golden-bone-audit.md` (rules for the Roomba Stampede chase)

### Files

**Change or create:**

- new `src/levels/level4.js` (the boss arena builder belongs to H41; agree the export name)
- `src/levels/registry.js` (entry in new-levels spec 5.1)
- `src/world/stage.js` (theme 5.2)
- `src/story/script.js` (5.3, 5.4)
- `src/audio/songs.js` (5.6)
- `src/art/placeholders.js` (any ids this level adds)
- `tests/chase-budget.test.js` (Roomba Stampede fixture)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Track and walls (3.1), then sections in order, playtesting each.
2. Keep every placement as written; if a jump fails the reach table (2.2), fix it and note it in the PR.
3. Detours (3.9, 3.10) with the loop rule.
4. Re-count the tally from the real file and update new-levels spec 3.12 in the same PR.

### Tests

- `tests/registry.test.js`: Evil Cone beaten opens 4
- `tests/level-budget.test.js`: L4 under its cap
- `tests/chase-budget.test.js`: the stampede passes

### Done when

- Every item in new-levels spec 6.1 played
- A one-run Golden Bone is possible (play it once)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- new-levels spec 6.1 checklist
- Golden Bone in one run

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add Level 4 Laundry Day`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- the section 7 Box Gauntlet is labelled 'G2' in the spec as a pattern name; don't confuse it with the standalone stage id `g2` (H46)

---

# Part 28: H41-boss-roomba-titan

Source: `docs/expansion/handoff/H41-boss-roomba-titan.md`

## H41: Roomba Titan and Dust Dash

| | |
| --- | --- |
| Branch | `codex/boss-roomba-titan` from the latest `main` |
| Size | XL (split into commits: model, arena, stage 1, stage 2, stage 3, ultimate, Dust Dash, cutscenes) |
| Needs merged first | H20, H03 (and H23 for the shared vortex) |
| Can run alongside | H40 (level side) |
| Unblocks | H45, H30–H32 Dust Walls |

### Goal

The new boss at the end of Level 4, harder than the Evil Cone, and its reward move Dust Dash.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 5 (all of it), 1.3, 7
- `docs/gameplay-expansion-plan.md` 7.5, 3.6 (Dust Walls)

### Files

**Change or create:**

- new `src/bosses/roombaTitan.js`
- new `buildBoss4Arena` in `src/levels/level4.js` (coordinate with H40, which creates the file)
- `src/player/player.js` (Dust Dash: bite during a slide)
- `src/game/session.js` / registry (bossKey `titan`)
- `src/story/script.js` (`BOSS_TALK`, intro, defeat, move tutorial)
- `src/audio/songs.js` (`boss4`)
- `src/config/difficulty.js` (`BOSS.titan`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Placeholder model (bosses spec 5.1) via H03.
2. Arena (5.6).
3. Stages in order with the chains in 5.5; playtest each before the next.
4. Dust Dash (5.7) and the Dust Wall interaction (`k.dustWall` from H04b).
5. Cutscenes and copy (5.8).

### Tests

- `tests/difficulty.test.js`: titan row harder than cone at every stage
- Dust Dash numbers test (speed, duration, cooldown) if pure

### Done when

- Every checklist item in bosses spec 5.10 played
- Wizard Hat still skips it
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- bosses spec 5.10 checklist

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the Roomba Titan boss and the Dust Dash move`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 29: H45-level6-rapids

Source: `docs/expansion/handoff/H45-level6-rapids.md`

## H45: Level 6 Smog Rapids

| | |
| --- | --- |
| Branch | `codex/level6-rapids` from the latest `main` |
| Size | XL (split into commits: raft, hazards, theme, sections S0–S6, detours, secrets, story) |
| Needs merged first | H40 (Level 4 exists), H04a–d, H11, H12, H03 |
| Can run alongside | H51 |
| Unblocks | H50 (Level 5 opens when Level 6 is cleared) |

### Goal

Build the river level between Level 4 and Level 5: raft rides alternating with on-foot landings, two Box Gauntlets, two loop detours, 7 dogs and a full Bone Board.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/level6-spec.md` (all of it; it is the authoring spec)
- `docs/expansion/golden-bone-audit.md` (ride stagger rule; the raft follows it)
- `docs/expansion/box-gauntlets-spec.md` (the box helpers used in S4 and S6)
- `docs/gameplay-expansion-plan.md` 6.4

### Files

**Change or create:**

- new `src/levels/level6.js`
- new raft code as level6 spec 2 (`k.raft`, `RaftController`, the changes to `src/player/player.js` in 2.4)
- new hazards in level6 spec 3 (`k.whirlpool`, `k.outflow`, `k.slick`, `k.driftLog`, `k.floatPack`, the barrel option on `k.coconuts`)
- `src/world/stage.js` (`river` theme)
- `src/levels/registry.js` (entry in level6 spec 10.1)
- `src/story/script.js`, `src/audio/songs.js` (`level6`)
- `src/art/placeholders.js` (level6 spec 11)
- `tests/ride-reach.test.js` (add the raft breakables) and a new `tests/raft.test.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Raft first, on a test strip, until mount, steer, hop, waterfall gaps, rollback and respawn all work (level6 spec 2.5).
2. Hazards one by one (3.1–3.7).
3. Theme and track (4).
4. Sections S0–S6 in order, playtesting each; keep every placement as written.
5. Detours (6) as loops at y +10.
6. Secrets and the Bone Board (7), tally check (8), trial targets local only (9).
7. Registry, story, tutorials, music (10).

### Tests

- `tests/raft.test.js`: the feasibility table in level6 spec 5.2
- `tests/ride-reach.test.js`: raft breakables obey the stagger rule
- `tests/registry.test.js`: Titan beaten opens 6; 6 cleared opens 5
- `tests/level-budget.test.js`: L6 under its cap

### Done when

- Every item in level6 spec 13 played
- A one-run Golden Bone is possible (play it once)
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- level6 spec 13 checklist
- Golden Bone in one run, both detours included

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add Level 6 Smog Rapids`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

Reviewer, please check:

- raft rollback after a death on a ride
- no countable breakable is placed side by side on a raft stretch

---

# Part 30: H46-box-gauntlets

Source: `docs/expansion/handoff/H46-box-gauntlets.md`

## H46: Box Gauntlet stages G1–G3 and Polaroids

| | |
| --- | --- |
| Branch | `codex/box-gauntlets` from the latest `main` |
| Size | L |
| Needs merged first | H04d, H01, H11 (and H40 for the G3 Polaroid spot) |
| Can run alongside | H40–H51 |
| Unblocks | — |

### Goal

Three short timing-only stages, opened by a Polaroid that only a no-death run can collect, with medals and cosmetic rewards.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/box-gauntlets-spec.md` 4 (all of it), 5, 8
- `docs/expansion/rewards-spec.md` 1.3 (`gauntlets`), 9.1 (9 mastery points)

### Files

**Change or create:**

- new `src/levels/gauntlet1.js`, `gauntlet2.js`, `gauntlet3.js`
- `src/entities/secrets.js` (`Polaroid`)
- `src/levels/registry.js` (`g1`, `g2`, `g3`)
- `src/levels/level1.js`, `level3.js`, `level4.js` (one Polaroid each)
- `src/game/game.js` (map presentation)
- `src/story/script.js`

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Polaroid entity: greys out after any death since the level start (box-gauntlets spec 4.6).
2. Stages in order G1, G2, G3, each with 2 checkpoints and the medals.
3. Move Hamper Hop's last bounce to 4.8 m (the spec notes it is over the tier limit at 5.0 m).
4. First clear pays 5 Tickets once (counted in the Ticket budget); packs hold none.

### Tests

- each stage's patterns pass `tests/gauntlet-patterns.test.js` at its tier
- Polaroid rule test (death since level start)

### Done when

- Every item in box-gauntlets spec 8 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- box-gauntlets spec 8 checklist; collect a Polaroid, then die before it on another run and check it is grey

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the three Box Gauntlet stages and their Polaroids`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 31: H50-level5-pump

Source: `docs/expansion/handoff/H50-level5-pump.md`

## H50: Level 5 Pump & Dump Pipeline

| | |
| --- | --- |
| Branch | `codex/level5-pump` from the latest `main` |
| Size | XL (split into commits) |
| Needs merged first | H45, H04a–d, H11, H12, H03 |
| Can run alongside | H51 (the boss) |
| Unblocks | H62 |

### Goal

Build Level 5 (about 456 m to the gate, tier 5, target 12–18 first-play deaths) exactly as specified, ending with the side-on Liquidation Line gauntlet.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/new-levels-spec.md` 0, 2, 4 (all of it), 5, 6.2
- `docs/expansion/box-gauntlets-spec.md`
- `docs/expansion/golden-bone-audit.md` (Smog Wave chase rule)

### Files

**Change or create:**

- new `src/levels/level5.js` (the boss arena builder belongs to H51)
- `src/levels/registry.js` (L5 opens when L6 is cleared)
- `src/world/stage.js`, `src/story/script.js`, `src/audio/songs.js` (128 bpm; the market clock syncs to it)
- `src/art/placeholders.js`
- `tests/chase-budget.test.js` (Smog Wave fixture)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Same order as H40.
2. The yellow colored bone and the green path (from L4) per the spec.
3. Re-count the tally and update new-levels spec 4.12.

### Tests

- `tests/registry.test.js`: 6 cleared opens 5
- `tests/level-budget.test.js`
- `tests/chase-budget.test.js`: the Smog Wave passes

### Done when

- Every item in new-levels spec 6.2 played
- A one-run Golden Bone is possible
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- new-levels spec 6.2 checklist

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add Level 5 Pump & Dump Pipeline`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 32: H51-boss-pump-queen

Source: `docs/expansion/handoff/H51-boss-pump-queen.md`

## H51: Pump Queen, Moon Jump and the true ending

| | |
| --- | --- |
| Branch | `codex/boss-pump-queen` from the latest `main` |
| Size | XL (split into commits) |
| Needs merged first | H41, H03 |
| Can run alongside | H50 (level side) |
| Unblocks | H62, H63, Moon Ledges in every level |

### Goal

The four-stage true final boss at the end of Level 5, the Moon Jump move and the secret ending.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/bosses-spec.md` 6 (all of it), 1.3 (4 stages), 9 items 3 and 5 (Moon Jump input, PumpPill bounce rule)
- `docs/expansion/rewards-spec.md` 9.3 (secret ending)
- `docs/gameplay-expansion-plan.md` 7.6

### Files

**Change or create:**

- new `src/bosses/pumpQueen.js`
- new `buildBoss5Arena` in `src/levels/level5.js` (coordinate with H50)
- `src/entities/enemies.js` (`PumpPill` bounce rule `11 + 2 × pump`; check the Evil Cone fight still works)
- `src/player/player.js` (Moon Jump: hold slide with the stick neutral 0.6 s, then jump)
- `src/game/game.js` (true-ending branch)
- `src/story/script.js`, `src/audio/songs.js` (`boss5`), `src/config/difficulty.js` (`BOSS.queen`)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Placeholder build (6.1), arena (6.3).
2. Stages 1–4 in order with the chains in 6.6.
3. Moon Jump (6.7) and Moon Ledges (`k.moonLedge` from H04b).
4. Cutscenes, true ending (6.8, rewards spec 9.3).

### Tests

- `tests/difficulty.test.js`: queen harder than titan at every stage, 4 stages
- PumpPill bounce test
- secret ending cases in `good-boy-percent.test.js`

### Done when

- Every checklist item in bosses spec 6.10 played
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- bosses spec 6.10 checklist; the Evil Cone fight once more (PumpPill change)

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the Pump Queen, Moon Jump and the true ending`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 33: H60-kennel

Source: `docs/expansion/handoff/H60-kennel.md`

## H60: Kennel, Pack milestones, Buddy and Sniffer

| | |
| --- | --- |
| Branch | `codex/kennel` from the latest `main` |
| Size | L |
| Needs merged first | H11 |
| Can run alongside | H61 |
| Unblocks | — |

### Goal

The Kennel map node where every freed dog appears, with milestone unlocks (jukebox, Buddy dog, fur tints, gallery, Sniffer hints, Golden Kennel).

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 5 (all of it; thresholds 8 / 16 / 24 / 32 / 42 / all), 2.5 (chain badges), 14, 15
- `docs/gameplay-expansion-plan.md` 3.5

### Files

**Change or create:**

- `src/levels/registry.js` (kennel node)
- `src/game/game.js` (Kennel screen)
- new `src/game/kennel.js` (pure milestone logic in `progress.js` per the spec)
- `src/entities/dogs.js` (stable dog ids, Buddy follower)
- `src/player/` (fur tint)
- `src/audio/` (jukebox)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Stable dog ids (rewards spec 5.2) first, with a migration from today's freed counts if needed.
2. Kennel screen with dancing freed dogs (existing GLBs and clips).
3. Milestones and unlock behaviour (5.3, 5.4); all off in trials and boards.
4. Sniffer (5.5).

### Tests

- milestone and shipped-only threshold cases in rewards spec 17
- dog id stability test

### Done when

- Freeing a dog in any level shows it in the Kennel
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Free 8 dogs: jukebox; 16: Buddy follows in L1 but not in a trial

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add the Kennel with Pack milestones, Buddy and Sniffer`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.

---

# Part 34: H61-mastery-ui

Source: `docs/expansion/handoff/H61-mastery-ui.md`

## H61: Mastery: Platinum Tags, Perfect Run, boss medal list

| | |
| --- | --- |
| Branch | `codex/mastery-ui` from the latest `main` |
| Size | M |
| Needs merged first | H10, H20 |
| Can run alongside | H60 |
| Unblocks | — |

### Goal

Platinum trial tier, the Perfect Run relic and a boss medal list on the map.

### Read first

- `AGENTS.md` and `docs/expansion/handoff/README.md` (rules for every task)
- `docs/expansion/rewards-spec.md` 12.1–12.3, 9 (mastery points)
- `src/config/trials.js`, `src/core/save.js` (`sanitizeTrial`)

### Files

**Change or create:**

- `src/config/trials.js` (fourth target)
- `src/core/save.js` (`'platinum'` medal)
- `src/game/game.js` (map: boss list, paw stamps)
- `src/game/session.js` (Perfect Run check)

**Don't touch:**

- `src/gear/catalog.js` and `vendor/` while crrreatorrr/nobu#18 is open
- anything another open PR is changing (check before you start)

### Steps

1. Platinum as rewards spec 12.1; hub boards stay time-only (no meta change).
2. Perfect Run as 12.3.
3. Boss list with medals (12.2).

### Tests

- `tests/trials-bounds.test.js` additions for platinum
- Perfect Run rule test

### Done when

- A platinum time shows a platinum tag locally and posts the same ms to the hub as before
- `npm test` and `npm run build` pass; the PR states the new test count (baseline on `bfb4a33`: 17 files, 144 tests)

### Manual playtest (`npm run dev`)

- Beat L1's trial under the platinum time (god mode off)

Say in the PR which of these you played and which you could not.

### Checks

```bash
npm ci
npm test
npm run build
```

### PR

Title: `Add Platinum Tags, the Perfect Run relic and the boss medal list`

Body sections: **What changed**, **Why** (link the spec sections above), **Tests** (new files and counts), **Playtest** (what you played, what you could not), **Risks / reviewer notes**.
