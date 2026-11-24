# Blender tasks

Model, rig and animation work found by the gameplay QA pass of 2026-11-24 (static check of every
model the code asks for, plus screenshots of each boss fight). None of it blocks play: every item
below has a stand-in declared in `src/art/placeholders.js`, so the game runs and can be finished.
Nothing here was attempted in code.

The static check also found nothing else wrong: all 98 files in `public/assets/manifest.json`
exist, all 26 GLBs in `public/assets/models/` parse and have a mesh, the code picks animation
clips by index (`Assets.animate`), not by name, and every bone name `src/player/nobuGlb.js` builds
(`Left`/`Right` + `Arm`, `ForeArm`, `UpLeg`, `Leg`, `Foot`, plus `Head`, `Hips`, `Spine*`) is in
`nobu.glb`.

Each new model goes through the rigged 3D character workflow in `docs/higgsfield-workflow-guide.md`,
is compressed like the others (`tools/optimize_glbs.mjs`) and is added to
`public/assets/manifest.json` under the id given here. Once the id is in the manifest the
placeholder entry is no longer used and can be deleted.

## 1. Pump Queen boss model is missing

- Asset: `public/assets/models/pump_queen.glb` (does not exist), manifest id `model_pump_queen`.
- What is wrong: the final boss is a stand-in, `pill_bot.glb` scaled 5 times and tinted magenta
  (`PLACEHOLDERS.model_pump_queen`). `src/bosses/pumpQueen.js` (line 142 onward) loads it at 5.5 m
  and drives a crown anchor and `armR` bone on it.
- How to see it: dev build, console `await T.go(5)` then `await T.boss()`.
- Expected: her own model about 5.5 m tall, feet at y = 0, facing +Z, with a crown on top (the
  fight's only hit point is the crown) and a right arm that can swing. The pill bot's 24-joint
  skeleton is what the code rigs today; keep the same joint names or say which changed.
- Verify in game: the fight shows the new model in all four phases, the crown glow sits on the
  crown while she is pumped, and a bite at the crown still lands (`tests/queen-real-model.test.js`).

## 2. Roomba Titan boss model is missing

- Asset: `public/assets/models/roomba_titan.glb` (does not exist), manifest id `model_roomba_titan`.
- What is wrong: the level 4 boss is `vacuum.glb` scaled 4.5 times and tinted dark grey
  (`PLACEHOLDERS.model_roomba_titan`), loaded at 1.8 m by `src/bosses/roombaTitan.js` line 155.
- How to see it: `await T.go(4)` then `await T.boss()`.
- Expected: a static (unskinned) model like `vacuum.glb`, origin at the centre of its base, with a
  visible button on top: the player must Belly Flop that button while the boss is stunned.
- Verify in game: the boss reads as a different machine from the small vacuum enemies around it,
  and the flop target on top matches where the hit registers (within 0.55 m of the centre).

## 3. Mini Roomba model is missing

- Asset: `public/assets/models/mini_roomba.glb` (does not exist), manifest id `model_mini_roomba`.
- What is wrong: the Laundry Day stampede (`src/levels/level4.js` line 139, distance 254 to 328)
  uses `vacuum.glb` scaled 1.4 times.
- How to see it: `await T.go(4)` then `T.at(256)`.
- Expected: its own small static model, same origin and facing as `vacuum.glb`.
- Verify in game: three of them chase Nobu through the stampede stretch.

## 4. Ghost cat model is missing

- Asset: `public/assets/models/ghost_cat.glb` (does not exist), manifest id `model_ghost_cat`.
- What is wrong: the Big Cat's stage 3 ghost lives use `small_cat.glb` scaled 1.6 times with a
  cyan tint at 45% opacity (`src/bosses/catPowers.js` line 49).
- How to see it: `await T.go(2)`, `await T.boss()`, reach stage 3.
- Expected: a static model the size of `small_cat.glb`; the code applies the transparency.
- Verify in game: the ghosts appear in stage 3 and are told apart from the bomb cats.

## 5. Dust bunny model is missing

- Asset: `public/assets/models/dust_bunny.glb` (does not exist), manifest id `model_dust_bunny`.
- What is wrong: the Laundry Day dust bunny enemy uses `mouse.glb` scaled 1.3 times and tinted
  grey (`src/entities/laundry.js` line 58).
- How to see it: `await T.go(4)` and walk the first stretch.
- Expected: a static model about the size of `mouse.glb`, same origin and facing.
- Verify in game: the enemy no longer looks like a grey Bandit Mouse.

## Not a model problem, noted so nobody chases it in Blender

- The title and credits screens draw the 3D Nobu on a grass mound in front of the backdrop. On the
  credits the mound and Nobu cover the middle of the ending picture and the credits text runs over
  both. That is scene layout in `src/game/game.js` (`toCredits`), not the asset.
