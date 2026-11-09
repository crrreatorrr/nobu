# Box gauntlets spec: timing helpers, patterns and the three Polaroid stages

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

## 0. Conventions

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

## 1. Jump maths

### 1.1 Movement numbers (from `src/player/player.js`)

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

### 1.2 Reach table

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

### 1.3 Double-jump timing windows

These are the frames in which the second press still makes the landing.

| Target | Window |
| --- | --- |
| +3.0 m at 4.0 m | press between 0.15 and 0.62 s after take-off: **29 frames** |
| +3.4 m at 4.0 m | 0.17–0.57 s: **25 frames** |
| +2.5 m at 6.0 m | 0.18–0.67 s: **30 frames** |
| +2.0 m at 8.0 m | 0.35–0.70 s: **22 frames** |

### 1.4 Fairness table per tier

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

## 2. Kit helpers (owned here)

All five go in `src/levels/kit.js`. The new entity classes go in a new `src/entities/boxes.js`, so that
`breakables.js` (817 lines) doesn't grow further.

### 2.1 `k.blinkBox(x, y, d, { on = 1.2, off = 1.0, phase = 0, group = null })`

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

### 2.2 `k.bounceChain(points, { y = 0 })`

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

### 2.3 `k.fallBox(x, y, d, { delay = 0.45 })`

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

### 2.4 `k.slideBox(x, y, d, { axis = 'x', range = 1.6, speed = 1.5, phase = 0 })`

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

### 2.5 `k.arrowChain(points, { power = 16 })`

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

### 2.6 Shared rules for all five helpers

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

## 3. Pattern library

Each pattern is a block of placements relative to `d0`.

- **Floor:** `pit` means no ground between the entry and exit floors (a gap in `k.floor`); `floor` means
  ground stays under the pattern, which is used for teach variants.
- **Route:** the moves that make it, checked by the validator.
- **Teach variant:** the same pattern over floor with gentler numbers. **Every pattern appears as a
  teach before its first pit version in the game.**

### P1. Box Stairs (tier 1; tests held-jump climbing)

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

### P2. Bounce Bridge (tier 1–2; tests the bounce rhythm)

| dd | Placement |
| --- | --- |
| 0 | entry floor ends |
| 3.0 / 6.4 / 9.8 / 13.2 | `bounceChain([[0, 3.0], [0, 6.4], [0, 9.8], [0, 13.2]])` (relative d) |
| 16.5 | exit floor |

- **Route:** held jump to +1 at 3.0 m (58%), three tap bounces at 3.4 m (80%), then a tap bounce to dy −1
  with 3.3 m to the floor edge (69%).
- **Teach:** over floor, spacing 3.0.
- **Tier 2:** 3.6 spacing. **Tier 3:** 3.9 spacing, with 5 packs.

### P3. Long-Short Bounce (tier 3–4; tests holding jump for long gaps)

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

### P4. Stack Bounce Stairs (tier 2; tests bouncing upward, floor below)

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

### P5. Blink Stairs (tier 2–4; tests climbing on a beat)

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

### P6. Blink Tightrope (tier 3–5; tests riding a wave)

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

### P7. Falling Floor Sprint (tier 2–5; tests never stopping)

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

### P8. Slider Gap (tier 3; tests jumping when the gap is short)

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

### P9. Slider Swap (tier 1–2 teach; tests lining up)

| dd | Placement |
| --- | --- |
| 3.5 | `slideBox(0, 0, { axis: 'x', range: 1.2, speed: 1.2, phase: 0 })` |
| 7.5 | `slideBox(0, 0, { axis: 'x', range: 1.2, speed: 1.2, phase: Math.PI })` |
| 11.0 | exit floor |

- **Route:** jumps of 3.5, 4.0 and 3.5 m (61–70%).
- **Window:** 34 f when lined up; wider with air control.

### P10. Arrow Relay (tier 2–4; tests landing on launchers)

| dd | Placement |
| --- | --- |
| 3.0 / 8.0 / 13.0 | `arrowChain([[0, 3], [0, 8], [0, 13]], { power: 16 })` |
| 17.0 | exit ledge at `y = 2` (dy +1 from the arrow top) |

- **Route:** held jump +1 at 3.0, then arrow tap at 5.0 m (77%), 5.0 m, and arrow tap at dy +1 with 4.0 m
  to the ledge edge (67%).
- **Tier 3:** spacing 5.6 (86%). **Tier 4:** spacing 6.8, 91% of held reach. A tap lands only on the
  near edge (6.53 + 0.83 overlap), so hold for a clean landing. Add a ceiling slab
  at `y = 7.0` over the gaps, so a double jump can't skip it.

### P11. Arrow Climb (tier 3; tests launching upward)

| dd | Placement |
| --- | --- |
| 3.0 | arrow `(0, 0)` |
| 8.0 | arrow `(0, 1.5)` |
| 13.0 | arrow `(0, 3)` |
| 17.0 | exit ledge at `y = 5` |

- **Route:** arrow tap at dy +1.5 over 5.0 m. Reach is about 5.7 at that height, so 88%, just inside the
  tier-3.5 limit; use 4.8 m at tier 3. The last arrow goes to dy +1 with 4.0 m to the edge.

### P12. Nitro Tightrope (tier 3–4; tests hopping Rugs on a narrow walk)

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

### P13. TNT Fuse Escape (tier 3; tests timing a retreat on blink boxes)

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

### P14. Double Ladder (tier 3–4; tests double-jump timing)

| dd | Placement |
| --- | --- |
| 3.0 | `lunch(0, 0)` |
| 7.0 | `lunch(0, 3)` (floating, top 3.98) |
| 11.0 | `lunch(0, 6)` |
| 14.0 | exit ledge at `y = 7` |

- **Route:** held jump +1, then double jump to +3 at 4.0 m (window 29 f), double +3 at 4.0 m, then a hop
  at the same height.
- **Tier 4:** steps of +3.4 m (window 25 f).

### P15. Glide Drop (tier 4; needs Tail Glide, so only in content after the Mecha Bird)

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

### P16. Last Beat (tier 4–5; the finale combining every helper)

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

### Pattern summary

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

## 4. The three Box Gauntlet stages

### 4.1 What they are

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

### 4.2 Shared stage rules

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

### 4.3 G1: Jungle Crates (tier 1.5, about 158 m)

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

### 4.4 G2: Assembly Rush (tier 3.5, about 180 m)

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

### 4.5 G3: Hamper Hop (tier 4.5, about 186 m)

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

### 4.6 The `Polaroid` entity

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

## 5. Placement checklist for main levels

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

## 6. Tests

### 6.1 `src/levels/gauntletMath.js` (new, pure, no Three or DOM)

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

### 6.2 `validatePattern(pattern, tier)`

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

### 6.3 `tests/gauntlet-math.test.js` (concrete cases)

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

### 6.4 `tests/gauntlet-patterns.test.js`

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

## 7. Implementation files

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

## 8. Playtest checklist

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

## Notes for the parent

- **Save schema:** `gauntlets` must be added to the v3 schema in `rewards-spec.md` (1.3), with its
  sanitizer, merge and New Game rules from 4.2.
- **Good Boy %:** the 9 gauntlet medal points have to fit into the mastery track. The rewards spec
  rebalanced it to exactly 100.
- **L4 Polaroid:** the spot is pending the new-levels spec.
- **Refactor:** moving `TUNING` to `src/config/movement.js` is a small, behaviour-neutral change in
  `player.js`.
- **Story copy:** the slide-jump tip in `BETWEEN[1]` claims a much longer jump than the code gives
  (about 0.1 m extra). Either reword it or make the slide jump keep its 10.5 m/s for its airtime.
