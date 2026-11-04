# NOBU gameplay expansion plan: levels, bosses, difficulty and reward loops

Status: **plan only.** No game code has changed. Written 2026-11-04 against `main` at `bfb4a33`.

Every new model, texture, portrait and story image uses an **existing asset as a placeholder** (section 9).
New asset ids are registered with a fallback, so a finished GLB or image can replace it later without code
changes.

---

## 0. Summary

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

## 1. Where NOBU stands (audit)

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

## 2. Design pillars

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

## 3. Reward loops (the core of this plan)

### 3.1 The loop stack

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

### 3.2 Chomp Chain (micro loop, skill reward)

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

### 3.3 Mystery Backpack (variable-ratio reward, used sparingly)

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

### 3.4 Bone Board: six bones per level (level loop)

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

### 3.5 The Kennel: rescued dogs as the meta loop

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

### 3.6 Move-gated secrets (chapter loop and backtracking)

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

### 3.7 End-of-level tally (juice)

- Replace the static results panel with a sequenced count-up. Each line ticks with rising pitch:
  backpacks, then dogs, then Tickets, then Best Chain.
- Then the Bone Board slots stamp in one at a time, with a sound and screen shake for each new bone.
- Order: the missed-backpack rain, then the tally, then the board.
- New records flash ("NEW BEST CHAIN").
- Skippable with any button after the first time.
- **Code:** `game.js` in `updateComplete`, plus a tween helper. It reuses the stats the session already
  builds (`broken`, `dogsTotal` and others in `session.js` around line 396).

### 3.8 Next-goal hint (closes the loop)

- After the tally, show **one** line: the closest missing goal.
- Each missing breakable records its `d`. The level declares named sections, `k.section(d0, d1, 'Lily
  Pond')`, so the hint can say "3 backpacks missed near **Lily Pond**." If only the Good Boy Bone is
  missing, the hint is "Good Boy Bone: 5 deaths, need ≤ 3."
- The map panel for the level shows the same hint and the bone silhouettes.

### 3.9 Good Boy % (completion counter)

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

### 3.10 Tickets: guardrails for every new source

- Every new Ticket pickup goes through `tickets.add` and `NOBU_TICKET_SCALE`.
- Per level, the max Tickets per clear is capped near the existing levels' max (measure L1 first and log
  it in this doc).
- New repeatable sources, such as coconut-like rollers in L4, reuse `COCONUT_CAP_PER_CLEAR`-style caps.
- No new Ticket sources in boss arenas beyond what the arenas already place.
- No Ticket rewards for bones or milestones. Those stay non-economic.

---

## 4. Difficulty

### 4.1 Difficulty as data: `src/config/difficulty.js`

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

### 4.2 Fairness rules for bosses

- Every attack has an animation tell of at least `FLOOR.teleSec`. Keep the house rule: **no on-screen
  timers.**
- Each stage adds **one** new power and **one** arena change. Never two new things at once.
- There is always a reachable safe spot during any attack, including the ultimate. An arena test helper
  samples the floor while the ultimate runs (dev-only).
- After damage, Nobu gets i-frames before the boss chains another attack: a chain never continues within
  0.5 s of a hit.
- Phase checkpoints already exist (`Boss` restarts the current phase on death); keep them for the new
  bosses.

### 4.3 Hidden DDA ladder (extends the pity mask)

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

### 4.4 Difficulty curve across the game

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

### 4.5 Mastery layers (opt-in, never gating)

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

### 4.6 Tuning tools (dev only)

- `dev.js` **death heatmap:** record `(level, d, x, cause)` for each death to `localStorage`, and add a
  `?heatmap` overlay that draws red dots on the track in dev builds.
- Section timer: log time per `k.section`, to see whether the 30-second and 3-minute rhythm holds.
- Playtest script: 3 first-time players per level, then compare median deaths with 4.4 and adjust `TIER`.

---

## 5. Dynamism: making levels feel alive

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

## 6. New and extended levels

Sections 6.0–6.2 cover the two new levels (Chapter 2: "The Smog Returns"). Section 6.3 extends the
existing levels and bonus stages.

### 6.0 Story and unlocks

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

### 6.1 Level 4: Laundry Day (Owner's House, about 480 m, tier 4)

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

### 6.2 Level 5: Pump & Dump Pipeline (factory trading floor, about 460 m, tier 5)

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

### 6.3 Extending Levels 1–3 and both bonus stages

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

#### How a level is extended (the technique)

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

#### L1 Bark Jungle: two new sections and a detour (tier 1, so they stay gentle)

| Where | Section | Beats | Rewards |
| --- | --- | --- | --- |
| After coconut hill (new d 240–300) | **Canopy Walk** | **Teaches ziplines** before Level 4 tests them: vines between treetop platforms, first over low ground where a fall costs nothing, then over a pit. A squirrel **ambush** drops from the leaves. A Zoomie Gate on a branch (post-Cat). | Mystery Backpack on a branch. Dog 6 (pug) at a vine end. Snacks. A Moon Ledge above the canopy (post-game Hidden Bone). |
| Before the fork (new d 345–395) | **Coconut Run** | A **35–40 m giant-coconut chase** toward the camera (`k.chase` with `CoconutRoller` at 5× scale). It is a gentle first chase, the Crash 1 "Boulders" moment, and it sets up the Level 2 chase. Two lanes, one log and a backpack wall to bite through. | Ticket line on the safe lane. DDA slows the coconut after deaths (4.3), exactly as Crash did with the boulder. |
| Detour from d 226 | **The Burrow** | The belly-flop pocket becomes a 30 m tunnel under the coconut hill: dark (`k.dark`), Shellbacks and lunchbox steps. A Dust Wall at the end (post-Titan). | Dog 7 (dalmatian). The **Hidden Bone** behind the Dust Wall. |

#### L2 Scratchpost Canyon: chase extensions (tier 2)

| Where | Section | Beats | Rewards |
| --- | --- | --- | --- |
| After the crumbling bridge (new D 170–215) | **Switchbacks** | The canyon climbs in two tiers. The Big Cat **cuts the corner** by leaping between tiers, so it gains on you at every turn. Taking the inside line is the skill. Rug (Nitro) gaps in the backpack walls. | Dog 4 (corgi) on the inside line. Snacks at the top. |
| Before the last stretch (new D 290–335) | **Yarn Avalanche** | Giant yarn balls roll **toward** Nobu while the cat is still behind him: threats from both sides. Lanes are shown by the balls' shadows. Last section, so it's the hardest. | A Zipped Backpack in the safe lane. |
| Mid-chase | **Cardboard Fort** (a breather) | A 12 m cardboard box Nobu runs into. The cat's paw swipes through the flaps but can't reach. It pauses the chase without stopping it, and holds a Snacks. | Snacks, tickets and a Mystery Backpack. |
| Detour | **Cat Flap Alley** | A flap in the canyon wall leads to a narrow side alley **above** the chase, with small cats (Cat TNT) asleep along it: walk past or bite fast. It rejoins 40 m later, ahead of the Big Cat. | Dog 5 (shiba). The **Hidden Bone** (Tail Glide gap). |

The chase speed in `bigCat.js` (`ChaseCat`) has to be retuned for the longer run, and checked with the
DDA slow-down.

#### L3 Cone Factory: hard extensions (tier 3)

| Where | Section | Beats | Rewards |
| --- | --- | --- | --- |
| After the hammer hall (new d 136–185) | **Packaging Line** | A **2.5D side-on run** (`camera.setMode('side')`): conveyors, cone-stamping presses (`Crusher`), and boxes riding the belt as moving steps. It previews the side-on idea from the roadmap. | Dog 6 (pug) in a box on the belt. Snacks. |
| Before the final stretch (new d 255–305) | **Vat Overflow** | Hitting the Bone Switch **raises the vat liquid** (`k.rising`). Climb crane-hook platforms (`MovingPlatform`, axis `y`) faster than it rises. Drones harass you on the way up. The level's final exam. | 1UP at the top. Pity checkpoint halfway up. |
| Detour | **Maintenance Ducts** | Low pipes you must **slide** under to enter (an early move, so no gating). It is a short crawl with a fan lift, Pill Bots and a lint roller puzzle. | Dog 7 (corgi). The **Hidden Bone** behind a Smog Vent (Mega Bark). |

#### Bonus stages

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

#### What lengthening does to time trials and the hub boards

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

### 6.4 Level 6: Smog Rapids (river, about 450 m, tier 4.5)

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

### 6.5 Box Gauntlets

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

## 7. Bosses: more powers per stage, harder with each boss

### 7.1 The ladder

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

### 7.2 Mecha Bird (tier 1): new powers

The existing attack plans are in `mechaBird.js:217-219`. New states are added to those plans.

| Stage | Existing | **New power** | **Arena change** | Ultimate (Sky Fall) |
| --- | --- | --- | --- | --- |
| 1 | dive (beak sticks: vulnerable), wing gust | **Perch Peck:** it lands on a palm and pecks coconuts loose; they roll across the arena in lanes (`CoconutRoller` in arena mode). Teaches lane reading. | Two palms at the arena edge become perches. | 3 waves of cone drops (exists) |
| 2 Overclocked | feather volley, visor laser, tired (vulnerable) | **Cage Drop:** it drops its swinging cage on Nobu's shadow (marker tell, 0.9 s × tele). If caught, Nobu is trapped 1.2 s: mash bite to break out, or slide to escape early. The cage then stays as cover from lasers. | **Wind lanes:** two gust strips cross the arena and push Nobu (UpdraftFan particles, laid flat). | Adds a laser sweep between waves |
| 3 Hyper Mecha | homing rockets, egg bombs, cone drops | **Drone Escort:** two `cone_drone`s orbit the bird and shoot when it dives. Bite a drone and it drops a Blue Sphere (a reward for aggression). **Chain:** the laser goes straight into a volley with no gap. | Egg-bomb craters stay as small pits for 6 s. | 4 waves; homing rockets follow the last wave |

### 7.3 Big Cat (tier 2): new powers

The attack pool is in `bigCat.js:766-768`.

| Stage | Existing | **New power** | **Arena change** | Ultimate (Nine Lives Frenzy) |
| --- | --- | --- | --- | --- |
| 1 | pounce (miss: dizzy), swipes, hairballs, yarn | **Laser Pointer:** a red dot zigzags across the floor and the cat pounces on it twice, a moving tell. If the dot leads it into the arena wall, it gets **dizzy for longer** (+0.6 s). Smart positioning is rewarded. | none (stage 1 stays readable) | 4 pounces (exists) |
| 2 Feral | claw slash, tail spin | **Knock It Off the Table:** it leaps onto a ledge at the arena edge and bats objects off it (backpacks, which are free to break, and the occasional Cat (TNT)); their shadows show where they land. **Scratch marks:** claw slashes leave damaging scratch lines on the floor for 3 s. | Two raised ledges rise at the arena edge (`StaticPlatform`). | Each landing leaves a scratch star |
| 3 Nine Lives | zoomies (collapses, dizzy) | **Ghost Lives:** each hit in stage 3 releases a translucent ghost cat (the `small_cat` model, tinted) that repeats the cat's **last pounce** 1.5 s later. Reading its own replay is the skill. **Catnip** (risk/reward): a catnip bush spawns; if Nobu bites it, the cat goes wild for 8 s, 25% faster but with a 2× dizzy window. | The floor edges crumble (a ring of crumble tiles), so the arena shrinks. | 5 pounces; ghost lives copy the final pounce |

### 7.4 Evil Cone (tier 3): new powers

The attack plans are in `evilCone.js:237-241`.

| Stage | Existing | **New power** | **Arena change** | Ultimate (Shame Supernova) |
| --- | --- | --- | --- | --- |
| 1 | barrage, shock, spiral, drops, overheat (vulnerable), pump.fun minions | **Cone of Shame:** a slow homing cone that, if it hits, **cones Nobu**. He can't bite for 3 s and his camera narrows (vignette) until he belly-flops or double-jumps to shake it off. It is dodgeable, readable and on-theme. | none | spokes plus cone rain (exists) |
| 2 Cracked | sweep, lasers, grab, vortex | **Rug Pull:** floor tiles shimmer (the rug texture) and then flip away in patterns; they come back 2 s later. This connects to the Rug Nitro players already know. | A tile grid is laid over the arena floor. | Spokes rotate both ways |
| 3 Supernova | ghost clones, everything | **Smog Tide:** smog floods the floor for 4 s; only raised pedestals are safe, and the Cone fires lasers while you're on them. **Chain of 3:** vortex → grab → spiral without a pause. | 4 pedestals rise for the tide. | Supernova plus Smog Tide together, with 2 safe pedestals |

### 7.5 Roomba Titan (tier 4, new boss)

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

### 7.6 The Pump Queen (tier 5, new true final boss)

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

### 7.7 Shared boss-system work (`common.js`)

- Read `BOSS[key]` from `config/difficulty.js` for HP, per-stage hits, speed, window, tele and chain.
  Replace the literals that are there now. The bird, cat and cone values must match today's play exactly
  before any tuning.
- Add a `chain` runner: run N attacks back to back, respecting the 0.5 s after-hit grace.
- Allow 4 stages for evolution: `makeStageParts()` with `{2, 3, 4}`.
- **Medal tracking:** take no damage for No-Hit, and time the fight for Speed. Results go to save
  `bossMedals`.
- Boss DDA hook (4.3).

---

## 8. Longer roadmap (after the two levels)

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

## 9. Placeholders: reuse now, replace later

### 9.1 How it works

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

### 9.2 Placeholder table

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

## 10. Technical plan

### 10.1 Phase 0 groundwork

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

### 10.2 Cross-repo dependencies (metaverse-hub)

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

### 10.3 Tests to add

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

## 11. Milestones

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

## 12. Risks and open questions for the owner

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

## Appendix: design references

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
