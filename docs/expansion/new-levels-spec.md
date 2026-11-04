# New levels spec: kit helpers, Level 4 (Laundry Day) and Level 5 (Pump & Dump Pipeline)

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

## 0. Summary

### 0.1 What this file owns

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

### 0.2 Changes from the plan (scope change from the owner, 2026-11-04)

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

### 0.3 Lengths at a glance

| Level | Main path to the gate | Detour A | Detour B | Authored route in total | Boss gate | `END` |
| --- | --- | --- | --- | --- | --- | --- |
| L4 Laundry Day | 476 m | Top Shelf loop, ~80 m | The Pantry lane, ~56 m | ~612 m | d 476 | 486 |
| L5 Pump & Dump | 456 m | The Order Book loop, ~76 m | The Cold Wallet lane, ~62 m | ~594 m | d 456 | 466 |

**Trial route** = the main path only. Detours are never needed for a trial, and in a trial run they hold
Freeze Packs only where a backpack there gets replaced (`Session._setupTrial` replaces every 4th plain
backpack, detours included).

---

## 1. Kit helper API

### 1.0 Conventions for every helper

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

### 1.1 `k.section(d0, d1, name)`

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

### 1.2 `k.chase(d0, d1, { model, scale = 1, count = 1, speed, catchUp = 1.0, lanes })`

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

### 1.3 `k.pitySnacks(x, y, d)`

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

### 1.4 `k.mystery(x, y, d, { slot })`

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

### 1.5 `k.dustWall(x, y, d, { w = 3, h = 2.6 })`

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

### 1.6 `k.moonLedge(x, y, d, { w = 2.4, dd = 2.4 })`

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

### 1.7 `k.smogVent(x, y, d, { lift = 6 })`

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

### 1.8 `k.zoomieGate(x, y, d, { plateD, open = 2.5 })`

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

### 1.9 `k.spinDrum(d, { x = 0, y = 0, r = 3.2, n = 4, period = 6, w = 2.2, dd = 2.2 })`

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

### 1.10 `k.zipline(x0, y0, d0, x1, y1, d1, { speed = 9 })`

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

### 1.11 `k.toaster(x, y, d, { power = 15, period = 2.4, phase = 0 })`

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

### 1.12 `k.market(x, y, d, { amp = 2.2, w = 2.4, dd = 2.4, group = 'a', invert = false })` and `MarketClock`

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

### 1.13 `k.rugPull(d0, d1, { x = 0, w = 3, tile = 2.4, speed = 7 })`

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

### 1.14 `k.rising(d0, d1, { y0, y1, rate, trigger = 'enter' })`

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

### 1.15 `k.dark(d0, d1, { radius = 4 })`

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

### 1.16 `k.detour(entryD, exitD, { y, entry = 'pipe', build })`

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

### 1.17 Camera modes `'side'` and `'rise'`

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

### 1.18 Extra helpers and options these levels need

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

## 2. Authoring and physics rules (read before placing anything)

### 2.1 Spans versus Solids

- `track.groundAt(s, u)` returns the **highest** span at a point (`track.js`). Two spans that overlap
  laterally at different heights means the lower one **can't be stood on**: the body walks into the
  higher one as a ledge (`physics.js`, `resolveTrack`, the `rise > 0.3` branch).
- **Rule:** anything above or below a main-path span at the same `(s, u)` must be built from **Solids**
  (`k.platform`, `k.mover`, `k.lunch`, market platforms, drums), never spans. This is how the Treat Tray
  round already works: platforms at `h: 12` over a normal floor.
- **Raised catwalks with nothing below** (L5's chimney top) can be spans with `y: 15`, because no lower
  span shares their `(s, u)`.

### 2.2 Jump reach (for every gap)

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

### 2.3 Checkpoints

- The tier 4 target is a Snacks at most **95 m** apart along the main path, and tier 5 at most **100 m**
  (plan 4.1, `TIER.snacksGap`).
- Every section of 40 m or more also has a `k.pitySnacks` (1.3).
- Detours of 50 m or more get one Snacks of their own.
- **Harder pass:** L4 and L5 each drop one Snacks (3.0a, 4.0a), leaving one gap over the guide per level.
  The pity spot left in its place keeps DDA working there.
- **Box Gauntlets:** a pity spot at each gauntlet start (`box-gauntlets-spec.md` rule).

### 2.4 Things that count toward the Golden Bone

These are countable Breakables (`Breakable.countable === true`): Backpack, Zipped, Mystery, Blue Sphere,
1UP, Trampoline, Snacks, Cat, Rug, Lint Roller and Vacuum Dock, plus every `ConedDog`.

- `PitySnacks`, everything a Mystery spawns, Freeze Packs, Lunchboxes, Pump Stones and Dust Walls **don't
  count**.
- **Rule:** nothing countable may sit behind a Zoomie Gate, a Dust Wall, a Moon Ledge, or a colored path
  that needs a bone from a later level.
  - Smog Vents and Bark Rocks are allowed, because Mega Bark is guaranteed by L4. Exception: an
    equipped Wizard Hat grants bark early, which is harmless.

### 2.5 Tickets

- Line tickets (`k.tix`, `k.tixArc`, `k.tixRing`) are counted below as **raw pickups**.
- Whole Tickets = `floor(raw / 3)` (`NOBU_TICKET_SCALE`).
- Backpacks add `randInt(1, 5)` raw each, about 3 on average; Zipped default 8; Good Boy and colored-path
  jackpots are as written.
- `rewards-spec.md` owns the per-level cap. These levels are sized to land close to Level 1's ratio:
  about 0.55 raw line tickets per metre (L1 is 104 over 313 m, about 0.33, plus pack and jackpot
  tickets).

---

## 3. Level 4: Laundry Day (`src/levels/level4.js`)

### 3.0 Overview

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

### 3.0a Harder pass and Box Gauntlets (owner requests)

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

### 3.1 Track and walls

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

### 3.2 Section 1: Hallway (d −8 to 50)

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

### 3.3 Section 2: Laundry Room (d 50–125)

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

### 3.4 Section 3: Ironing Board (d 125–180)

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

### 3.5 Section 4: Kitchen Counter (d 180–250)

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

### 3.6 Section 5: Roomba Stampede (d 250–330)

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

### 3.7 Section 6: Basement Stairs (d 330–400)

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

### 3.8 Section 7 (new, hardest): Boiler Room (d 400–470), Box Gauntlet G2

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

### 3.9 Detour A: Top Shelf (sky loop, d 120–158)

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

### 3.10 Detour B: The Pantry (side lane on the right, d 186–246)

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

### 3.11 Decor, lighting and theme

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

### 3.12 Level 4 tally

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

## 4. Level 5: Pump & Dump Pipeline (`src/levels/level5.js`)

### 4.0 Overview

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

### 4.0a Harder pass and Box Gauntlets (owner requests)

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

### 4.1 Track and walls

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

### 4.2 Section 1: Opening Bell (d −8 to 50)

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

### 4.3 Section 2: Pump Field (d 50–125)

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

### 4.4 Section 3: Smog Wave (d 125–205)

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

### 4.5 Section 4: Trading Floor (d 205–280)

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

### 4.6 Section 5: Green Candle Chimney (d 280–335)

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

### 4.7 Section 6: The Rug Pull (d 335–385)

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

### 4.8 Section 7 (new, hardest): Liquidation Line (d 385–450), Box Gauntlet G2

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

### 4.9 Detour A: The Order Book (sky loop, d 232–272)

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

### 4.10 Detour B: The Cold Wallet (icy dead-end side lane on the left, d 52–116)

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

### 4.11 Decor, lighting and theme

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

### 4.12 Level 5 tally

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

## 5. Wiring

### 5.1 Registry entries (`src/levels/registry.js`, plan 10.1)

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

### 5.2 Themes (`src/world/stage.js` `THEMES`)

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

### 5.3 Story text (`src/story/script.js`)

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

### 5.4 Tutorials (`TUTORIALS` additions)

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

### 5.5 Boss gates and arenas (level side only)

| | L4 | L5 |
| --- | --- | --- |
| Gate | `k.gate(476, 'ROOMBA TITAN', 0x3a3d44)` | `k.gate(456, 'THE PUMP QUEEN', 0xd23cff)` |
| Trigger | `k.trigger(478, () => game.session.reachBossGate())` | `k.trigger(458, ...)` |
| Arena builder | `export function buildBoss4Arena(game, stage, tickets)` in `level4.js` | `export function buildBoss5Arena(...)` in `level5.js` |
| Arena summary | The Living Room at dog scale: a 24 × 24 m floor (`stage.block(-12, -6, -12, 12, 0, 12, 'ground')`), furniture legs at the corners as pillars, a central rug, a wall socket. Spawn `(0, 0, 8)`, facing π. Camera `arena` with offset `(0, 12, 15.5)`. Spheres at `(±9, 0, -9)`. | The Candle Ring: candle pillars around a pit (market platforms on the boss's own clock). Spawn `(0, 0, 8)`. Camera `arena` with a higher offset `(0, 14, 17)`. |

Everything else about the arenas is in `bosses-spec.md`. The arena builders return the same shape as the
existing ones: `{ spawn, facing, camera, spheres }`.

### 5.6 Music (`src/audio/songs.js`)

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

## 6. Playtest checklists

Each row is one section. A tester plays the level start to finish **for the first time** at least three
times, with three different testers (plan 4.6). They record deaths per section from the dev death heatmap.
The target is the median of the three.

### 6.1 Level 4

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

### 6.2 Level 5

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

### 6.3 Checks for both levels

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

### 6.4 Golden Bone feasibility, per section

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

## 7. Tests this spec adds

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
