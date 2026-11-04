# Extended levels spec: Levels 1–3, Roomba Rush and Glowworm Grotto

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

## 0. Final numbers

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

## 1. How a level is extended

### 1.1 What the spline does when moves are added (measured)

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

### 1.2 The shift helper: `src/levels/layouts.js` (new, pure, no imports)

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

### 1.3 Straddlers: the only lines that need hand edits

A **straddler** is a call with two distances on opposite sides of a splice. Examples: a floor, a ticket
line or arc, a coconut lane, a Bone Switch platform list, a Good Boy list or a wall pair. Wrapping both
ends would stretch it across the new section. Each straddler is split or rewritten by hand, and is
listed per stage below (sections 2.2, 3.2, 4.2, 5.2, 6.2). The test in section 10 greps for `S(` in
two-distance calls and fails on any straddler that isn't on these lists.

### 1.4 Turtle edits

Each stage's move list is moved into `layouts.js` as `MOVES[id]` (the old list) and `MOVES_V2[id]`, so
the track test can build both. The level file calls `turtle(START[id], MOVES_V2[id])`. Old lists stay
for the test and for Classic replays (section 8.6).

### 1.5 Detours

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

### 1.6 Move-gated objects

- Behind a Dust Wall, Moon Ledge, Zoomie Gate or Smog Vent there is only:
  - the **Hidden Bone** (one per stage), or
  - **non-countable** extras: a 1UP or tickets with `countable = false`.

  This is how `BarkRock` already spawns its prizes (`secrets.js:65`, `u.countable = false`).
- **Never a dog, a backpack or a Mystery Backpack.**
- Ticket extras behind gates count toward the level's maximum in the Ticket budget (rewards-spec), even
  though most players won't get them on the first run.

### 1.7 Checkpoints, pity spots and ticket density

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

## 2. Level 1: Bark Jungle (tier 1, path 314 → 539 m)

### 2.1 Turtle and shift

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

### 2.2 Straddlers (hand edits)

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

### 2.3 Section A: Canopy Walk (final d 249–324, 75 m)

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

### 2.4 Section B: Coconut Run (final d 362–417, 55 m)

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

### 2.5 Section C: Sunken Temple (final d 438–533, 95 m), the new main-path section

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

### 2.6 Detour 1: The Burrow (from the existing pocket at d 226)

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

### 2.7 Detour 2: Waterfall Hollow (raised, in Sunken Temple)

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

### 2.8 L1 dogs, secrets and tally

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

## 3. Level 2: Scratchpost Canyon (tier 2, path 300 → 519 m)

### 3.1 Turtle and shift

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

### 3.2 Straddlers

| Line | Old | New |
| --- | --- | --- |
| 81 | `F(228, 262);` | `F(228, 230);` (mushroom landing) and `F(230, 262);`. The second needs no edit: `D()` already moves both ends by the same 74 + 90 |
| 84 | `k.tixArc(0, 0, D(261), 0, D(268), 2.6, 6);` | `k.tixArc(0, 0, D(261), 0, D(261) + 7, 2.6, 6);` (the arc over the old 262–267 gap must not stretch across the Avalanche) |
| 85 | `F(267, 316);` | no change (it starts at the splice) |

Nothing else in L2 spans a splice. The crumble bridge (161.6–167.6) is before S1, and the warp
(222.5–227.5) and the arc 221–229 are before S2.

### 3.3 Chase retune (the Big Cat over 519 m)

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

### 3.4 Section S1a: Switchbacks (track d 199.5–259.5, 60 m)

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

### 3.5 Section S1b: Cardboard Fort (track d 259.5–273.5, 14 m)

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

### 3.6 Section S2: Scratchpost Forest (track d 334–424, 90 m), the new main-path section

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

### 3.7 Section S3: Yarn Avalanche (track d 461–516, 55 m)

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

### 3.8 Detour 1: Cat Flap Alley (raised, from plan 6.3)

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

### 3.9 Detour 2: Dry Riverbed (sunken, beyond the left wall, a loop)

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

### 3.10 L2 dogs and tally

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

## 4. Level 3: Cone Factory (tier 3, path 244 → 419 m)

### 4.1 Turtle and shift

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

### 4.2 Straddlers

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

### 4.3 Section A: Sorting Belts (final d 98–168, 70 m), the new main-path section

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

### 4.4 Section B: Packaging Line (final d 206–261, 55 m), 2.5D

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

### 4.5 Section C: Vat Overflow (final d 331–381, 50 m)

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

### 4.6 Detour 1: Maintenance Ducts (from plan 6.3)

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

### 4.7 Detour 2: Overhead Rails (raised, new)

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

### 4.8 L3 dogs and tally

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

## 5. Roomba Rush (bonus, tier 1.5, path 301 → 459 m)

### 5.1 Turtle and shift

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

### 5.2 Straddlers

| Line | Old | New |
| --- | --- | --- |
| 35 | `F(99, 196);` | `F(99, 130);` and `F(S(130), S(196));` (180–246) |
| 53 | `F(201, END + 1);` | `F(S(201), 205 + 50);` (251–255) and `F(S(205), END + 1);` (295–471) |
| 64 | `k.tix(0, 0, 290, 0, 0, 300, 6);` | no change in shape: both ends ≥ 289, so `S()` on both |

### 5.3 Section A: Living Room / Kitchen Split (final d 130–180, 50 m)

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

### 5.4 Section B: Toy Box Ramps (final d 255–295, 40 m), the new main-path section

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

### 5.5 Section C: Kitchen Tile Slide and Dog-Door Leap (final d 379–447, 68 m)

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

### 5.6 Detour: Sofa Summit (raised)

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

### 5.7 Roomba Rush dogs

| # | Breed | Where |
| --- | --- | --- |
| 1–2 | shiba, corgi | existing (d 112 unshifted; 250 → 340) |
| 3 | pug | Split, kitchen side, SP + 34 |
| 4 | dalmatian | Sofa Summit, SP + 64 |

---

## 6. Glowworm Grotto (bonus, tier 2.5, path 241 → 370 m)

### 6.1 Turtle and shift

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

### 6.2 Straddlers

| Line | Old | New |
| --- | --- | --- |
| 52 | `F(135, 182);` | starts at A: `F(S(135), S(181.99))` = `F(180, 226.99)`. Write `F(180, 227);` |
| 62 | `F(195, END + 1);` | `S(195)` = 283. **C (231) falls inside it:** split into `F(283, 319)` (old 195–231) and `F(359, END + 1)` (old 231 onward) |
| 73 | `k.tix(0, 0, 232, 0, 0, 240, 5);` | both ≥ 231: `S()` on both (360–368) |

### 6.3 Section A: Underground River (final d 135–180, 45 m)

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

### 6.4 Section B: Mushroom Bounce Cavern (final d 227–270, 43 m), the new main-path section

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

### 6.5 Section C: Crystal Echo (final d 319–359, 40 m)

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

### 6.6 Detour: Lumi's Nest Hollow (sunken, open trench)

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

### 6.7 Glowworm Grotto dogs

| # | Breed | Where |
| --- | --- | --- |
| 1–2 | pug, shiba | existing (d 58 unshifted; 164 → 209) |
| 3 | corgi | Underground River, UR + 24.5 |
| 4 | dalmatian | Lumi's Nest Hollow, MB + 46 |

---

## 7. Before and after

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

## 7A. Golden Bone feasibility audit and fixes

**The rule:** a perfect run, every countable breakable and every dog in **one** run with first-visit
moves, must be possible on every stage. The owner reported that some levels can't be 100%'d. The audit
below confirms it for Scratchpost Canyon and Roomba Rush, fixes both in layout 1, and checks every
layout-2 section and detour.

- **On-foot stages** (L1, L3, Glowworm Grotto): no time pressure was found in layout 1. Bark Rock
  prizes, Good Boy Route and colorPath contents are non-countable, and the Treat Tray can be retried.
- **The two fixes in 7A.1 and 7A.2 can ship before the extension**, as a small bug-fix PR in layout-1
  coordinates, so players can earn those Golden Bones now.

### 7A.1 Scratchpost Canyon (the chase)

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

### 7A.2 Roomba Rush (the ride)

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

### 7A.3 New on-foot sections (L1, L3, Glowworm Grotto)

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

### 7A.4 Detours: one row each

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

### 7A.5 Tests (pure, `npm test`)

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

## 8. Trial layout versioning

### 8.1 Why

- Every extended main level is about 1.7× longer. Layout-1 times can't be matched, layout-1 medal
  targets are wrong, and the hub floor for layout 1 is too low for layout 2.
- Plan 6.3 and 12.6 decided to **version the boards** and keep the old ones as read-only "Classic."

### 8.2 NOBU: `src/config/trials.js`

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

### 8.3 Save (`src/core/save.js`)

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

### 8.4 Score queue (`src/hub/scoreQueue.js`)

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

### 8.5 Hub bridge (`src/hub/hubBridge.js`)

- `submitScore(ms, level, meta)` (line 976) sends `meta: { ...meta, level: trialVariant(level), layout: 2, build, v: 2 }`.
- `trialTop(level)` (line 1033) reads `{ variant: trialVariant(level) }`. It adds
  `trialTopClassic(level)`, which reads variant `String(level)`.
- The map panel shows:

  ```
  WORLD top 1:31.20 · you #4
  Classic best 0:58.33 · Classic WR 0:51.90
  ```

  The second line only appears when a Classic best or WR exists.

### 8.6 Classic replays

- Layout 1 is **not playable** after the update. The old `MOVES[id]` list stays only for tests.
- This keeps the code simple. Classic boards are an archive, not a mode.
- If the owner wants Classic replays later, `layouts.js` already holds both move lists. A
  `layout: 1` build path would need the old content lines too, so that needs a separate decision.

### 8.7 metaverse-hub PR (cross-repo; owner deploys)

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

### 8.8 Keep earned bones

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

## 9. Implementation order (inside milestone M2b)

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

## 10. Tests

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

## 11. Playtest checklists

### 11.1 Shared (every stage)

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

### 11.2 L1

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

### 11.3 L2

- [ ] Switchbacks: on each bend the cat cuts only when the gap allows. Never a catch that couldn't be
      avoided.
- [ ] Cardboard Fort: the cat waits at the mouth. It comes back strong but can be beaten.
- [ ] Scratchpost Forest: every toppling post's shadow shows ≥ 0.8 s before it lands.
- [ ] Cat Flap Alley and the Dry Riverbed: no catch while inside. On exit the cat is behind.
- [ ] Yarn Avalanche: each volley has a free lane, shown by the shadow.
- [ ] The Vacuum Dock (old 293, new 512) still pops every rug; new rugs (Switchbacks) are before it.
- [ ] Median deaths: about 8–12.

### 11.4 L3

- [ ] Sorting Belts: the reversing belt's siren comes a full second before it flips.
- [ ] Packaging Line: the side camera keeps Nobu centred. Left and right map to backward and forward,
      and switch back cleanly at the end.
- [ ] Vat Overflow: from the switch, an average climb reaches the top with ≥ 3 s left. The pity
      checkpoint drains the vat.
- [ ] The blue bone (moved to about 281) is still on the fan catwalk and still opens L2's blue path.
- [ ] Median deaths: about 10–16.

### 11.5 Roomba Rush

- [ ] The split's divider is solid. Both sides are fair at full speed (10.5 m/s).
- [ ] Ramps: every landing is reachable without steering. Toy piles can be dodged after landing.
- [ ] Tile slide: momentum is noticeable but the vacuum can be controlled.
- [ ] Dog door: the opening is visible from the ramp top.
- [ ] Sofa Summit: works with the fallback raised floors if `entry: 'ramp'` isn't built.

### 11.6 Glowworm Grotto

- [ ] Lumi's nests never leave more than about 60 m of dark.
- [ ] River rafts loop without crushing Nobu against the islet.
- [ ] Mushroom chain: each bounce lands on the next pillar from a straight approach.
- [ ] Crystal Echo: stones are solid even when unlit (no unfair falls through). The light time is
      enough to see the next 2 stones.
- [ ] Lumi's Nest Hollow is lit. The exit lands on the right-lane floor.

---

## 12. Open items for the parent

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
