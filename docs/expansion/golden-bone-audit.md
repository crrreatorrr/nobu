# Golden Bone audit: can every breakable be broken?

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

## What counts

- The Golden Bone needs every **countable** `Breakable` broken and every dog freed (`session.js`,
  `_recordLevelStats`).
- Countable: backpacks, Zipped Backpacks, Blue Spheres, 1UPs, Trampolines, Snacks, Cats (TNT), Rugs (Nitro),
  Lint Rollers and Vacuum Docks.
- **Not** countable: Bark Rock prizes, Good Boy Route and colored-path rewards, and Freeze Packs
  (`secrets.js` sets `countable = false`).
- Rugs are broken from a distance by the Lint Roller or Vacuum Dock, so touching one is never needed.
- Checkpoints keep everything broken before them. So the question is per **checkpoint segment**: can
  that stretch be cleared in one go?

## L2 Scratchpost Canyon (chase): impossible in the last segment

### How the chase limits you

- From `ChaseCat.update` in `src/bosses/bigCat.js`:
  - The cat's target speed rubber-bands with the gap: 6.7 m/s under 5 m, up to 10.5 m/s.
  - At a gap under 2.4 m it kills Nobu with `die('flat')`. Masks don't save him.
- Nobu runs at 8.0 m/s, so at full run he leads by about **8.3 m**. Any stop uses that lead up.
- After a respawn the cat starts 13 m behind the checkpoint and waits 1.6 s. Each segment therefore
  starts with a big lead that shrinks as you run.
- What breaking needs (from `player.js`): a bite lasts 0.34 s and hits **everything** in range (0.95 m
  sphere, 0.75 m ahead). A slide rips a Zipped Backpack open in one go. A wall of 5 backpacks 1.8 m
  apart needs about 3 bites and 6 m of sideways moves: **1.5–2.0 s** standing still.

### Budget per segment (largest stop that survives)

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

### Fix (checked, margin at least 1.3×)

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

## Roomba Rush (ride): 5 of 11 breakables unreachable

### How the ride limits you

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

### Fix

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

## L1 Bark Jungle, L3 Cone Factory and Glowworm Grotto

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

## Limits of this audit

- These are models, not playtests. The stop times use the bite, slide and movement numbers from
  `player.js`, not recorded inputs.
- The gapped-wall margin (1.3×) is the tightest one; confirm it in a playtest (H31).
- Places where Nobu can't see ahead (the L2 camera faces him) aren't modelled. Each backpack wall has
  about 12 m of warning before it reaches Nobu.
