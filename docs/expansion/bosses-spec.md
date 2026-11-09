# NOBU boss spec: five bosses, stage by stage

Status: **implementation spec, no code changed.** It adds detail to plan sections 4.1, 4.2, 4.3, 7 and 9 of
`docs/gameplay-expansion-plan.md` and keeps every decision there. Where the code disagreed with the plan,
the fix is listed in section 9.

Code read for this spec, at `bfb4a33`: `src/bosses/common.js`, `mechaBird.js`, `bigCat.js`, `evilCone.js`,
`autorig.js`, the arena builders in `src/levels/level1-3.js`, the boss hooks in `src/game/session.js`
(`startBoss`, `onBossPhase`, `onBossDefeated`, respawn), `src/player/player.js`, `src/entities/props.js`,
`src/entities/ride.js`, `src/camera/camera.js`, `src/story/script.js` and `src/audio/audio.js`.

---

## 0. Conventions

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

## 1. Shared boss system (`src/bosses/common.js` and friends)

### 1.1 Reading difficulty

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

### 1.2 The `chain` runner

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

### 1.3 Generalising evolve to four stages

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

### 1.4 Phase checkpoints for every boss

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

### 1.5 New shared projectiles and arena pieces

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

### 1.6 Boss DDA (plan 4.3)

- `session.bossDeaths[phase]` counts deaths in each stage. On respawn:
  - If it is **3 or more**, set `boss.dda = { tele: 1.15, window: 0.3 }` and respawn with 1 mask.
    `setMask(1)` already happens for the level pity mask; reuse it.
  - Otherwise set `boss.dda = { tele: 1, window: 0 }`.
- **DDA is off** (it stays `{1, 0}`) in the boss rush, in Smog Remix boss fights and when God Mode is on
  (God Mode can't die anyway).
- **If DDA ever helped during an attempt, that attempt can't earn a medal.** Set
  `session.bossDdaUsed = true` and check it in 1.7. This is how the plan's "off in medal runs" works
  without a separate medal mode.

### 1.7 Medals

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

### 1.8 New player hooks the bosses need (`src/player/player.js`)

| Hook | Add | Used by |
| --- | --- | --- |
| `trap(sec)` | Sets `mode = 'trapped'` and `trapT = sec`, and freezes horizontal movement. Each `bite` press takes 0.25 s off `trapT`. Pressing `slide` escapes at once, but only in the first 0.3 s (a fast reaction). Gravity stays on. Not allowed while `invulnT > 0` or invincible. A mask does **not** prevent it: being trapped isn't damage. | Bird Cage Drop |
| `cone(sec)` | If `session.mask > 0`, lose a mask instead and return. Otherwise `conedT = sec`: bite is disabled, a cone mesh goes on Nobu's head (reuse `this.deathCone`), and the HUD vignette is on. A belly flop landing or a double jump clears it at once. | Cone of Shame |
| `onDash` contact | During Dust Dash, any entity overlapped gets `e.onDash?.(this)`, called from the same loop that calls `onSlide`. | Dust Walls, the Queen in stage 4 |
| `abilities.dustDash`, `abilities.moonJump` | `get abilities()` adds `dustDash: beaten('titan')` and `moonJump: beaten('queen')`. These read the save v3 keyed `beaten`. | 5.7, 6.7 |

---

## 2. Mecha Bird (tier 1, `src/bosses/mechaBird.js`)

### 2.1 Numbers

| | Stage 1 | Stage 2 OVERCLOCKED | Stage 3 HYPER MECHA |
| --- | --- | --- | --- |
| HP left at start | 6 | 4 | 2 |
| `sp` | 1.00 | 1.20 | 1.40 |
| `tele` | 1.00 | 0.88 | 0.78 |
| `W` (stuck after a dive) | 2.7 | 2.4 | 2.2 |
| `tired` vulnerable time | (not in plan) | `W - 0.1` = 2.3 | (not in plan) |
| `chain` | 1 | 1 | 2 |
| Ultimate charge time | 26 s | 20 s | 15 s |

### 2.2 Attack catalogue

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

### 2.3 Plans (`nextAction`)

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

### 2.4 Arena changes (`buildBoss1Arena` in `src/levels/level1.js`)

| Stage | Change | Coordinates | Built when | Reset |
| --- | --- | --- | --- | --- |
| 1 | **2 perch palms** inside the arena edge, each with a solid trunk collider (`0.8 × 6 × 0.8`). Bird perch point at `y 6.2`. | `(-10.4, 0, -6)` and `(10.4, 0, -6)` (outside the camera side) | Built in the arena; there from the start | none |
| 2 | **Wind lanes:** two 3 m strips along z, at `x = -5` and `x = +5`. The left one pushes `+x`, the right one `-x`, at 3.0 m/s. **On 3 s / off 3 s.** Each turns on 0.6 s after a leaf-streak tell. | strips from `z -11` to `z 8` | `beginPhase()` at stage 2 | `onResetPhase` for stage 1 |
| 3 | **Egg craters** (2.2). The drones' orbit space. | — | — | Craters cleared by `projectiles.clear()` |

Plus the existing spheres: `info.spheres` = `[(-9,0,9), (9,0,9), (0,0,-9)]`. One spawns per stage
(`onBossPhase`).

### 2.5 Evolve parts, copy and audio

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

### 2.6 Files and functions

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

### 2.7 Playtest checklist

- [ ] On a first try, stage 1 is beaten in 3 deaths or fewer. Perch Peck lanes can be read from the
  perch's facing.
- [ ] The cage marker can always be left after it locks; trap escape by mashing averages about 0.6 s.
- [ ] Wind lanes never push Nobu into an active marker with no way out. Test cage over a lane.
- [ ] The drone sphere drops at most once per stage.
- [ ] Every S3 loop still contains at least 2 `stuck` openings.
- [ ] The phase checkpoint (1.4) respawns at the right stage, with lanes on or off correctly.
- [ ] No-Hit is possible; dev run time is logged against the 70 s Speed target.

---

## 3. Big Cat (tier 2, `src/bosses/bigCat.js`)

### 3.1 Numbers

| | Stage 1 | Stage 2 FERAL | Stage 3 NINE LIVES |
| --- | --- | --- | --- |
| HP left at start | 6 | 4 | 2 |
| `sp` | 1.00 | 1.20 | 1.45 |
| `tele` | 0.95 | 0.84 | 0.74 |
| `W` (dizzy) | **2.7** (was 2.8; see conflict 2 in section 9) | 2.4 | 2.0 |
| `chain` | 1 | 2 | 2 |
| Pounces per countdown (`pouncesLeft = this.phase`) | 1 | 2 | 3 |

### 3.2 Attack catalogue

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

### 3.3 Pools (`chooseAttack`)

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

### 3.4 Arena changes (`buildBoss2Arena` in `src/levels/level2.js`)

The current floor is a block from -12.5 to 12.5 on x and z, with 4 m walls on all sides.

| Stage | Change | Coordinates | Built when | Reset |
| --- | --- | --- | --- | --- |
| 2 | **Two ledges** (`StaticPlatform` `w 4, d 2.6, h 0.5`) rise out of the back corners over 1.0 s. The top is at `y 2.4`. Nobu can use them too; they're a vantage point. | `(-9.5, 2.4, -10)` and `(9.5, 2.4, -10)` | `beginPhase(2)`: animate `y` from -0.5 to 2.4 | Lowered (hidden) for stage 1 |
| 3 | **Crumbling edge:** the outer 2 m band of the floor is replaced by crumble tiles (`ArenaTiles.crumbleRing()`, tile 2.5 × 2.0). A tile crumbles 0.6 s after Nobu stands on it, and respawns after 4 s. Pit death plane at `y -6`. A crack-texture tell for 1 s at the start of the stage. | The main floor block shrinks to ±10.5; the edge tiles cover 10.5–12.5 | Build the arena from tiles from the start (solid in stages 1–2); `armed = true` at stage 3 | `armed = false`, all tiles restored |
| 3 | Catnip spawns (3.2). | `freeSpot(6, 9)` | `beginPhase(3)` | Removed |

Spheres stay `[(9,0,9), (-9,0,-9)]`. Add a third at `(0, 0, 9)` so stage 3 also gets one.

### 3.5 Evolve parts, copy and audio

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

### 3.6 Files and functions

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

### 3.7 Playtest checklist

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

## 4. Evil Cone (tier 3, `src/bosses/evilCone.js`)

### 4.1 Numbers

| | Stage 1 | Stage 2 CRACKED | Stage 3 SUPERNOVA |
| --- | --- | --- | --- |
| HP left at start | 9 | 6 | 3 |
| `sp` | 1.00 | 1.25 | 1.50 |
| `tele` | 0.90 | 0.80 | 0.70 |
| `W` (overheat) | 1.8 | 1.4 | 1.1 (+1.0 after the ultimate, `longHeat`) |
| `chain` | 1 | 2 | 3 |
| Grab-miss stuck | `1.3 / √sp` (existing) | same | same |

### 4.2 Attack catalogue

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

### 4.3 Plans (`nextAction`)

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

### 4.4 Arena changes (`buildBoss3Arena` in `src/levels/level3.js`)

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

### 4.5 Evolve parts, copy and audio

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

### 4.6 Files and functions

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

### 4.7 Playtest checklist

- [ ] The Cone of Shame is dodgeable without the bite. A coned Nobu can still survive the next attack.
- [ ] Rug Pull patterns never strand Nobu (the 50% cap; the tile under Nobu is safe for `ring`/`cross`).
- [ ] No more than one floor-changing attack happens at once (`rugpull` never during `tide`).
- [ ] Smog Tide beams always leave a reachable pedestal; hops work with and without the Champion's
  Crown.
- [ ] The S3 ultimate's safe pedestals are visible from the camera at all four positions.
- [ ] Dev run time is logged against the 110 s Speed target. The phase checkpoint still behaves as
  today.

---

## 5. Roomba Titan (tier 4, new: `src/bosses/roombaTitan.js`)

### 5.1 Placeholder build

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

### 5.2 Numbers

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

### 5.3 How it gets hurt

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

### 5.4 Attack catalogue

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

### 5.5 Plans and chains

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

### 5.6 Arena: the living room (`buildBoss4Arena`, new, in `src/levels/level4.js`)

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

### 5.7 Reward move: Dust Dash

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

### 5.8 Cutscenes and dialogue

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

### 5.9 Files and functions

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

### 5.10 Playtest checklist

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

## 6. The Pump Queen (tier 5, new true final boss: `src/bosses/pumpQueen.js`)

### 6.1 Placeholder build

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

### 6.2 Numbers

| | Stage 1 LAUNCH | Stage 2 HYPE | Stage 3 BUBBLE | Stage 4 RUG PULL |
| --- | --- | --- | --- | --- |
| HP left at start | 12 | 9 | 6 | 3 |
| `sp` | 1.20 | 1.40 | 1.60 | 1.70 |
| `tele` | 0.82 | 0.74 | 0.66 | 0.62 |
| `W` (crown open) | 1.60 | 1.30 | 1.05 | 0.95 |
| `chain` | 2 | 3 | 3 | 4 |
| Ultimate charge time | 26 s | 20 s | 15 s | 12 s |
| Candle wave period | 6.0 s | 4.5 s | 3.8 s | (Liquidation drives the pillars) |

### 6.3 The arena: the candle chart (`buildBoss5Arena`, new, in `src/levels/level5.js`)

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

### 6.4 How she gets hurt

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

### 6.5 Attack catalogue

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

### 6.6 Plans and chains

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

### 6.7 Reward move: Moon Jump

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

### 6.8 Cutscenes and dialogue

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

### 6.9 Files and functions

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

### 6.10 Playtest checklist

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

## 7. The difficulty ladder, checked (`tests/difficulty.test.js`)

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

## 8. Implementation order

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

## 9. Conflicts with the plan, and how this spec settles them

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
