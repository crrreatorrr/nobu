# Level 6: Smog Rapids (authoring spec)

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

## 1. Concept

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

### Design pillars for this level

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

## 2. The raft (`k.raft`)

### 2.1 What it reuses

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

### 2.2 API

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

### 2.3 How it is built

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

### 2.4 Changes to `player.js`

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

### 2.5 Rollback and death

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

### 2.6 Camera

- Raft spans use the Roomba Rush framing: `{ mode: 'track', height: 4.9, dist: 9.6, ahead: 7.5 }` and
  `fov: 66`.
- Foot landings use the Bark Jungle framing: `{ height: 4.3, dist: 8.6, ahead: 5.5 }` and `fov: 60`.
- `RaftController` blends between the two over 0.6 s on mount and dismount. It calls
  `camera.setMode('track', {...})` with the new numbers; the camera's damping smooths the change.
- On a fall, the camera keeps its height for 0.3 s, then follows. The drop then reads as a drop, not a
  camera snap.

### 2.7 DDA hooks (plan 4.3)

These are applied per span, with the counter at the span's last checkpoint.

| Deaths at this checkpoint | Raft help |
| --- | --- |
| 5 | Raft `speed` −8%. Whirlpool `pull` −15%. Outflow `push` −15%. |
| 7 | The pity checkpoint activates (`k.pitySnacks` placed in each ride). |
| 7, before a fall | A **pity lily pad** (`LilyPad`, `r = 1.6`) appears in the middle of the gap. A stalled raft lands on it and keeps going. |
| 9 | Two masks on respawn (plan 4.3). |

All of these are off in trials, remixes and any run that posts a score.

---

## 3. Water hazards and new entities

All new entities live in a new file, `src/entities/river.js`, except the barrel option, which is in
`props.js`.

### 3.1 Whirlpool: `k.whirlpool(x, d, { r = 3.0, pull = 3.2, kill = 0.9 })`

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

### 3.2 Drain outflow: `k.outflow(d, { side = 'left', push = 3.5, period = 3.0, phase = 0, width = 6, len = 3 })`

- **Look:** a big drain pipe mouth in the bank wall (decor `pipe`, ×1.6, rotated to face the river).
- **Behaviour:**
  - It pulses on a cycle: **on** for 45% of `period`, off for the rest.
  - While on, everything in a strip `len` metres long (along `d`) and `width` metres out from the bank
    gets a sideways push away from that bank of `push` m/s, through `pushX`/`pushZ`.
  - It pushes the raft and Nobu on foot alike.
- **Tell:** 0.8 s before each pulse, a `gurgle` sound (new synth: low noise burst with a falling filter)
  and a dribble of foam at the mouth. While on, a jet of foam particles.
- **Rollback:** the phase comes from the stage clock; no reset needed.

### 3.3 Smog slick: `k.slick(d0, d1, { x = 0, w = 4 })`

- **Look:** a purple-grey sheen on the water: `waterMaterial` with colour `0x4a3a5a` at alpha 0.75, 3 cm
  above the water.
- **Behaviour:**
  - While the raft is inside it, set `player.ride.slick = 0.25`, refreshed each frame and decaying after
    you leave. The raft drifts: steering takes about 4× longer to bite.
  - On foot it does nothing; slicks only sit on raft spans.
- **Tell:** a slow purple shimmer and a faint `sizzle` loop when within 8 m.

### 3.4 Drift log: `k.driftLog(d, { x = 0, range = 3, speed = 1.4, w = 2.6, phase = 0 })`

- **Look:** `logMesh` from `props.js`, floating at water y, sweeping side to side across the river.
- **Behaviour:**
  - A `Hazard` subclass (`ride.js`): touching it while riding means `hurt('splash')`. A mask or god mode
    smashes it (the existing `Hazard.smash`).
  - On foot it is a moving platform: it gets a solid at its top, like `MovingPlatform`. Foot landings
    don't use it yet; Ride 4 doesn't need it.
  - Hop over it, or time the gap behind it.
- **Rollback:** `Hazard.onRespawn` already restores it.

### 3.5 Static log on the water: the existing `k.log(d, { h, w, x })`

- It is a ground bump. On a raft, ramming it is the **stall**: the bump-up and `speedK = 0.4`. It isn't a
  death.
- It adds its own ticket line (2 raw).

### 3.6 Barrels: `k.coconuts(d, { ..., mesh: 'barrel', reward: false })`

- **New options on `CoconutRoller`:**
  - `mesh: 'barrel'`: a procedural barrel (toon `0x7a4a24` cylinder, r 0.5, h 0.9, with two dark bands)
    that rolls on its side.
  - `reward: false`:
    - Barrels **give no Tickets.**
    - They **skip the `coconutSpawned` cap**. Otherwise they would stop spawning once the per-clear
      coconut cap was used up (`props.js:650`).
    - Touching one is `hurt('splash')` while riding and `hurt('flat')` on foot. No pickup.
- **Lanes, speed and `every`** work as they do now. Barrels roll toward Nobu (against the current).

### 3.7 Float pack: `k.floatPack(x, d, n)`

- `k.pack(x, y, d, n)` at water y, plus a `LilyPad`-texture disc (r 0.9) under it that bobs ±4 cm. The
  disc is cosmetic; the pack stands on the raft floor.
- Ramming it on the raft breaks it, because the ride counts as a slide.
- The disc hides when the pack breaks and comes back on restore.

### 3.8 Enemies used

| Enemy | Where | Note |
| --- | --- | --- |
| Broccoli (plain, trooper) | docks | trooper `range: 0` guards the far Lock dock |
| Squirrel | barge A | jumps between barges |
| Cone Drone (`hover`) | the mill wheel, Ride 3 | `hover: 2.6` puts it above the raft's head; it is a dodge, not a ram |
| Lid Knight | lock dock | needs a slide or a flop, as everywhere |
| Shellback | Ride 2, Detour 1 | Riding into it flips it (the ride counts as a slide; check `Shellback.onSlide`, `enemies.js:877`). Flipped, it is a springboard: hop onto it for a ticket ring. |
| Pill Bot | Detour 2 | a market-platform teaser |

---

## 4. Track, walls and theme

### 4.1 Turtle

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

### 4.2 Walls

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

### 4.3 Theme `'river'` (new entry in `THEMES`, `src/world/stage.js`)

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

### 4.4 Difficulty tier

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

## 5. The level, section by section

- **Coordinates:** `(x, y, d)`. `x` is lateral, + is right. `y` is relative to the path. On raft spans the
  water is at `y = -1.0`, so things on the water use `y = -1`.
- **Ticket lines:** `tix(...)` counts are raw pickups. Whole Tickets are about raw ÷ 3
  (`NOBU_TICKET_SCALE`).
- **Section names:** each section starts with `k.section(d0, d1, name)`, for the next-goal hint.

### S0: Drain Mouth (foot, −8 → 26) — "you're on a dock, here's a basket"

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

### S1: Ride 1, Gutter Run (raft, 26 → 108) — teach steer and hop

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

### S2: The Lock (foot, 108 → 160) — teach `k.rising` safely

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

### S3: Ride 2, Whirlpool Bend (raft, 160 → 246) — whirlpools, outflows, chute 1

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

### S4: Barge Yard (foot, 248 → 304) — teach the fall box, then Gauntlet 1: Crate Drift

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

### S5: Ride 3, Slick Rapids (raft, 304 → 382) — slicks, two falls, the Good Boy Route

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

### S6: Floodgate Crates and Ride 4 (foot + raft, 384 → 455) — the final exam

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

### 5.1 Checkpoint spacing

Snacks at **95, 152, 204, 250, 338, 386** (plus the start). The gaps are 95, 57, 52, 46, 88, 48, and 69 to
the goal: all within `snacksGap` 97.5 for tier 4.5.

Pity spots: 60, 186, **257.6 (Crate Drift start)**, 322, **391.6 (Floodgate Crates start)**. Pity
Snacks are **not countable** (rewards spec).

### 5.2 Raft breakable feasibility

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

## 6. Detours

Each detour is a **side loop** that returns Nobu next to its own entry (`exitD = entryD + 2`).

**Why:** the river only goes one way. A detour that rejoined further downstream would skip main-path
backpacks, and the Golden Bone needs every backpack **in one run**. A loop keeps both routes collectable.

Both detours are built **above** the river (`y: +10`), not below it. Content under a water zone would be
inside the water death plane (`killYAt`).

**Possible conflict, flagged for the new-levels-spec owner:** if `k.detour` in that spec assumes
downstream exits, the "one run" Golden Bone rule needs the same loop treatment there.

### 6.1 Detour 1: The Rain Gutter (entry d 249, exit d 251, y +10)

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

### 6.2 Detour 2: The Pump House (entry d 388, exit d 390, y +10)

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

## 7. Secrets and the Bone Board

### 7.1 The six bones

| Bone | Condition here |
| --- | --- |
| Golden | All countable breakables (about 49, section 8) and all 7 dogs, in one run. Needs no move later than Dust Dash. Every raft item passes the 5.2 feasibility check. |
| Good Boy | Reach the goal with 3 deaths or fewer |
| Hidden | Behind the Dust Wall in the Pump House |
| Snack bronze / silver / gold | 40 / 60 / 80% of the level's raw Ticket pickups in one run |

### 7.2 Other secrets

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

## 8. Tally

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

## 9. Time trial

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

## 10. Registry, story and copy

### 10.1 Registry entry (plan 10.1, `src/levels/registry.js`)

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

### 10.2 Story (`src/story/script.js`)

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

### 10.3 Tutorials (`TUTORIALS`, with placeholder icons from `art/procedural.js`)

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

### 10.4 Music (`src/audio/songs.js`): `level6`

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

## 11. Placeholders

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

## 12. Implementation file list

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

## 13. Playtest checklist

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
