# NOBU gameplay improvement plan: fairness, readability and friction

## 1. Status

**Plan only. No game code has changed.** Written 2026-11-09 against `main` at `ea093ce`.

**Implementation status (2026-11-11, branch `claude/trusting-ramanujan-63h582`).** The sections below
are the plan as written; this table records what was built and where it differs.

| Item | Status | Notes |
| --- | --- | --- |
| A1 | Done | |
| A2 | Done | Measured 1.77 s (fall), 1.19 s (skipped), 2.07 s (other). Two recorded clocks ran through the old flow, so they now stop while Nobu is dead and are charged its old cost (3.05 s fall, 3.55 s other, `DEATH_CLOCK_SEC`): a Box Gauntlet's time and a boss fight's Speed-medal time. Old and new records compare like for like, and skipping gains nothing. After a skipped card, Jump and Bite are swallowed for 0.3 s. Boss Rush keeps its own flow. |
| A3 | Done | Also lists gear moves (Air Dash, Triple Jump) while worn. |
| A4 | Done, changed | Queue cap 6, not 3: Lid Knight's tutorial fires at d 76.5, so Level 1 queues six cards. A card shows 6 s alone, 4 s with one waiting, 3 s with two or more. The queue is cleared on death, level end and leaving the level, not on every `clearScreen()`. On death the track triggers of cards that were queued but not shown are re-armed, so they fire again in the same run. Cards wait, hidden and with their timers stopped, while the pause menu or another screen is up. |
| A5 | Done, changed | The dodging card sits at `bottom: 20px`; at 96 px a two-line banner still reached it. |
| B1, B2 | Done | The falling-object rim is at full radius from the first frame while the shadow still grows. |
| B3 | Done, changed after QA | The proposed closer cameras hid 3 to 5 m of near floor with Nobu at the centre. Final values use a longer lens from further back: Bird FOV 56, offset 13/20; Cat FOV 52, 13/20; Cone FOV 56, 13/19.5; Titan FOV 50, 13.5/20.5; `follow` 0.15 for all. Measured at 960x540 and 1024x768: at most 0.45 m of near floor hidden with Nobu at the centre, none at the near edge, 2.6 to 3.4 m at the far edge (the original cameras hid more in every case). Nobu's model is 7.1 to 7.9% of the viewport height, against about 6.5% for the Bird before, so most of the proposed size gain was given up for the floor. The boss bar is smaller and goes see-through while the boss is drawn behind it. Queen unchanged. |
| B4, B5 | Done | |
| B6 | Not done | Conditional on an owner choice; the plan recommends B5 alone. |
| C1 | Done, gated | Option 1 with `decay` 4 (not 3): 6.56 m against a 5.73 m running jump by the harness's measure (ratio 1.15, the plan's 6.3 / 5.47). Off in time trials, Box Gauntlets, Boss Rush and every boss fight, so the boards, `TRIAL_TARGETS`, Rush and Speed-medal times and the box patterns are untouched. |
| C2, C3, C4 | Done | Hitstop is off in time trials, Boss Rush and Box Gauntlets; a story boss fight keeps it and its medal clock runs through the stop. `session.ranked` is never set in this codebase, so nothing gates on it. Values are in `src/config/feedback.js`. |
| D1 | Done | `tools/playtest.mjs`. It uses the dev hooks; the Test Lab API does not exist yet. |
| D2, D3, D4 | Not done | D2 needs people; D3 applies only if B4 is declined; D4 is not planned. |

**Readability follow-up (2026-11-12, branch `claude/trusting-ramanujan-63h582`, after PR #73).** B3 gave
back most of its size gain to keep the floor in frame, so F1 to F3 were only partly fixed: the gold rim
was about 1 px on the Bird arena at 540p and Nobu was no larger. This pass makes the threats themselves
readable at the current camera distance. It is presentation only: no hit radius, tell, damage, attack
order, medal, trial clock or Ticket report changed. Code: `src/bosses/readability.js` (pixel-sized
rings, outlines, shadows, lanes), `src/bosses/threats.js` (what must be in frame), `src/camera/camera.js`
("Arena fit"), `src/levels/arenaCameras.js` (the five arena cameras in one place).

| What | Change |
| --- | --- |
| Landing markers, all five bosses | The ring's band is sized in screen pixels each time it is drawn: 4.5 px at 540p, growing with the viewport, never under 3 px, with a dark line inside and a hairline outside so it reads on sand, wood and lavender as well as grass. Its outer edge is still exactly the hit radius. The fill inside beats faster as the impact nears (no number, no bar). It is unlit and unfogged, so it shows in Lights Out. Ring opacity now starts at 0.75, not 0.35. |
| Projectiles | Feathers are 0.24 m wide, not 0.16 (still inside the hit radius). Feathers, cone shots, hairballs, rockets, egg bombs, yarn balls, coconuts, debris and shockwave rings have an outline. Rockets are drawn 1.4x and cone shots 1.25x larger. Everything that flies above the floor (feather, cone shot, hairball, rocket, egg) has a ring on the floor under it the size of its hit radius. Claw slashes have a dark line on the floor under them; scratch trails have a dark edge. The Titan's cable is unlit and outlined. |
| Lasers | The aiming line is 7 to 22 cm wide, not 3 to 8 (it was about 1 px). The burning spot has a pixel-sized ring at its 0.75 m hit radius. The Bird's laser shows the whole line it will sweep from the first frame of its aim. |
| Lanes and sweeps | The Cat's dash lane and the Titan's charge lane have solid edges. The Cone's sweep arms have a strip on the floor showing the width that hits. |
| Countdown fill on boss-owned markers | Bird dive, Cat tail spin, Cone grab and clones drive the ring's fill from their own tell; the Cat's pounce marker keeps a steady beat. |
| Nobu | A cyan ring on the floor under him while a boss is fighting. It stays on the floor when he jumps, so it also shows where he lands. Cyan, because gold means danger. |
| Boss bar | Smaller again (bottom edge 138 px → 118 px at 540p). It now goes see-through when any part of the boss from feet to head, or a wing, is behind it; before, only a point 1.5 m above the boss's origin was tested, so the Queen's head and crown sat behind an opaque bar for most of her fight. In the Queen's arena the bar is at the top left, because she stands at the top centre of the frame all fight. |
| Dynamic camera | **Tightening toward the action was built, measured and not kept.** At up to 1.2x it made Nobu 52 to 57 px tall instead of 44 to 48, but with Nobu at the arena centre it hid 1.15 to 1.8 m of near floor at 960x540 and 2.95 to 3.35 m at 1024x768 (the authored cameras hide 0 to 0.45 m), which is what QA rejected in PR #73. **What is kept is widen-only:** the lens is never tighter than authored, and it widens at once (to 0.82x at most), then eases back, when Nobu, the boss or an active marker or projectile would be out of frame. The Bird's rear-up, whose top was cut off 5 px from the top of the frame, is now whole (top at 52 px). Only the field of view changes; position, aim and the movement basis are the authored ones. The Queen's camera is untouched. |

Measured with `node tools/playtest.mjs attacks` at 960x540, which forces every attack of every boss with
Nobu 4 m in front of the arena centre and takes a frame at the first moment of the tell, at mid-tell and
just after the attack goes live (117 frames looked at across the five bosses). "Before" is `main` at
`ce0a305` with the same harness.

| Boss | Thinnest marker ring, px | Smallest projectile side, px | Nobu's height, px (share of viewport) |
| --- | --- | --- | --- |
| Mecha Bird | 1.1 → 4.5 | feather 8.8 → 16.2; rocket 13.9 → 21.7; egg 21.4 → 24.1 | 44 → 44 (8.1%), plus the ring |
| Big Cat | 1.2 → 4.5 | hairball 20.1 → 24.1; claw slash 19.6 → 20.0 with its floor line; scratch 4.9 → 7.5 | 47 → 47 (8.8%), plus the ring |
| Evil Cone | 1.6 → 4.5 | cone shot 13.4 → 21.2; slow homer 8.0 → 11.4 | 44 → 44 (8.2%), plus the ring |
| Roomba Titan | 1.5 → 4.5 (also in Lights Out) | falling leg 34 → 34; cable and lane restyled, not resized | 48 → 48 (8.9%), plus the ring |
| Pump Queen | 0.8 → 4.5 (airdrop markers) | none in flight; pillar warnings unchanged | 46 → 46 (8.5%), plus the ring |

At 1280x720 the ring is 6.0 px and at 1024x768 it is 6.4 px. Nobu's own size did not change: the only
way found to enlarge him hides floor. With Nobu at the arena centre the model is still 7.1 to 7.9% of
the viewport height and the hidden near floor is as PR #73 left it (0 to 0.45 m at the centre, none at
the near edge, 2.6 to 3.4 m at the far edge).

Tests: `tests/boss-readability.test.js` (pixel minimums with the real arena cameras: ring at least 3 px
all the way round for every marker radius anywhere on each floor, projectile sizes, laser line, Nobu's
ring), `tests/arena-framing.test.js` (the framing guarantee at 960x540, 1280x720 and 1024x768: never
tighter than authored, every threat framed with a margin on the frame it appears while the lens has
range, pose and movement basis untouched), `tests/markers.test.js`.

Known limits. The lens stops widening at 0.82x, so with Nobu at the far edge a threat at the near wall
can still be out of frame, as it could before. The 1.4 s "FIGHT!" banner still covers the boss at the
start of a fight. Nothing here was judged by a person at full frame rate: the frames were rendered one
at a time in software.

How this relates to `docs/gameplay-expansion-plan.md` (2026-11-04):

- The expansion plan **adds content**: Levels 4–6, two bosses, longer Levels 1–3, bone boards, the Kennel,
  Box Gauntlets, Remix and Boss Rush. Most of it has shipped.
- This plan **adds no content**. It fixes fairness, readability and friction in what exists.
- Where they overlap:

| Topic | Expansion plan | This plan |
| --- | --- | --- |
| Boss fairness rules | 4.2: tells of at least `FLOOR.teleSec`, no on-screen timers, phase checkpoints "keep them" | F1–F5, B1–B6. Nothing here adds a timer. |
| Hidden DDA ladder | 4.3: help after 3 deaths per boss stage | F5 and B5 change **what is counted** for the two bosses that restart at stage 1. |
| Tuning tools | 4.6: death heatmap, section timer, playtests | Section 9 uses the heatmap (`src/dev/tuning.js`) to verify. |
| Test Lab | `docs/test-lab-plan.md`: force any boss attack | D1 and section 9 want the same hook for telegraph checks. |
| Boss spec | `docs/expansion/bosses-spec.md` 1.4 and its owner question | Decisions 8.1 and 8.2 revisit two owner choices. |

Labels used below: **stage** is a boss phase (1–3, or 1–4 for the Queen). **Tell** is the wind-up before
an attack. **Lethal** means the hit calls `Player.hurt()` or `Player.die()`; with no Sproto Mask and no
Golden Collar charge that is a death.

## 2. How this was audited and how far to trust it

What was run:

- `npm ci`, the Vite dev server, and headless Chromium driven by Playwright at 960×540.
- `npm test`: 148 files, 1,494 tests, all passing, about 330 s.

Limits, stated plainly:

- Headless software rendering gave **about 2 frames per second**. The main loop clamps `dt` to 0.05 s
  (`src/game/game.js:155`), so the game ran at a tenth of real speed.
- To measure anything, rendering was switched off and the simulation was stepped at 60 Hz in real time.
  One frame was rendered only when a screenshot was needed.
- **No level was played start to finish by hand.** Audio was **not heard**. Frame rate was not judged.
- Bosses 2–5 were read in code only. The Mecha Bird was run, but against an idle player.

The scripts are not committed. To repeat the method:

1. Start `npx vite --port <port> --strictPort`; the game is at `/play/nobu/`. Dev builds expose
   `window.__nobu` (the `Game`) and `window.T` (`src/dev.js`).
2. Replace `game.render` with a no-op and keep the original. Replace `game.loop` so that calls from
   `requestAnimationFrame` are ignored. From `setInterval`, call the original `loop(t, true)` with `t`
   advancing 16.667 ms per step, in step with the wall clock so that `setTimeout`-based flows stay in sync.
3. Wrap `game.update` to record, each frame, the player's position, `vel.y`, `body.grounded` and
   horizontal speed.
4. Send real key events through Playwright. `T.go(level)` starts a level and skips its dialogue.
   `T.at(d)` warps to track distance `d`. `T.boss()` runs the gate.
5. Physics: hold a key for a fixed time, then read rise, air time and air distance from the samples.
6. Boss attacks: once `session.boss.active` is true, call `boss.setState('<attack>')`, wait, render one
   frame and take a screenshot. This skips the normal plan order, so an attack can be seen in a stage
   where it does not normally occur.
7. Level tours: set `save.data.godMode = true` first, or the warp kills Nobu.

How each claim was established is marked **measured**, **observed** (seen in a screenshot or DOM text)
or **read** (code only).

## 3. What already works and should be kept

| Item | Value | Source | How |
| --- | --- | --- | --- |
| Run speed | 8.0 m/s; full speed in 68 ms, stop in 102 ms | `src/config/movement.js` (`RUN`, `ACCEL` 95, `DECEL` 75) | measured |
| Jump | tap 1.35 m, full 2.14 m, double 3.55 m; running jump 5.47 m | `JUMP` 12.6, `DOUBLE_JUMP` 11.2, `GRAVITY` 36, `FALL_MULT` 1.4 | measured |
| Coyote time, jump buffer | 0.11 s, 0.13 s | `COYOTE`, `BUFFER` | read |
| Variable height, apex hang | release cuts `vel.y` to 55%; gravity ×0.55 near the apex while held | `src/player/player.js:363-372` | read |
| Physics substeps | 120 Hz, so thin platforms stay solid | `player.js:393` | read |
| Checkpoints | 8 Snacks in Level 1's 547 m; 12 or more in Level 2 | level files | read |
| Pity ladder | 3 deaths at a checkpoint: 1 mask; 5: hazards ×0.92; 7: pity checkpoint; 9: 2 masks | `src/game/dda.js:2` | read |
| Rollback on death | pickups and rescues since the checkpoint are restored | `session.js` `respawn()` | observed |
| Tutorials do not block | pop-up for 6 s, play continues | `src/ui/ui.js:250-261` | observed |
| Stability | no console errors in any run | — | observed |

Do not retune any of these. `tests/gauntlet-math.test.js:7` pins the whole `TUNING` object, and the Box
Gauntlets and trial targets were authored against it.

## 4. Findings

### F1. Landing markers are hard to see, and the lethal radius has no edge — High

- Since commit `5c2f062` a marker is a black, unlit, soft blob (`makeMarker`, `src/bosses/common.js:52-58`).
  Before, it was a red ring with a white crosshair, pulsing between 0.2 and 0.8 opacity.
- `MARKER_OPACITY` is 0.38 (`common.js:51`). The texture is nine stacked discs of 0.16 alpha
  (`common.js:44-48`), so the centre is about 79% of that and the outermost band is 16% of it. Peak
  darkness is roughly 0.30 at the centre and **0.06 at the rim**, where the hit radius actually ends.
- A falling object's marker ramps from 35% to 100% of that over its delay (`common.js:290`). An egg bomb's
  ramps from 50% to 100% (`common.js:350`). Boss-owned markers (Bird dive, Cat pounce, Cone grab) stay at
  0.38 and only pulse in scale.
- **Observed:** with three Bird cone drops active on the grass arena, no marker could be picked out in a
  960×540 frame. The attack was forced in stage 1; in normal play it is a stage-3 attack with a shorter
  delay (0.53 s against 0.74 s).
- Player experience: a death from a cone the player never saw coming.

### F2. Titan "Lights Out" hides the leg-stomp markers — High, read only

- Stage 3 opens with `lightsout` then `stomp` (`TITAN_PLANS[3]`, `src/bosses/roombaTitan.js:15-17`).
- `darken()` drops the sun to 0.12 and the hemisphere light to 0.3 for 8 s (`src/bosses/titanArena.js:191-199`).
- Leg stomps use `proj.falling({ kind: 'leg', r: 1.2 })` (`roombaTitan.js:535-545`), which calls `dropCone`
  and so `makeMarker`: a black blob at up to 0.38 opacity on a darkened floor.
- `docs/expansion/bosses-spec.md` (Titan catalogue and checklist) says leg markers "stay emissive" and
  "TNT and leg markers glow". The shadow change removed that. Not seen in play.

### F3. Arena framing makes Nobu and projectiles small, and hides the Bird's wind-up — Medium-High

| Arena | Camera offset (y, z) | `follow` | Source |
| --- | --- | --- | --- |
| Mecha Bird | 11.5, 16 | 0.45 | `src/levels/level1.js:267` |
| Big Cat | 12, 15.5 | 0.45 | `src/levels/level2.js:146` |
| Evil Cone | 12.5, 16.5 | 0.45 | `src/levels/level3.js:205` |
| Roomba Titan | 12.5, 16.5 | 0.45 | `src/levels/boss4Arena.js:28` |
| Pump Queen | 15, 19 | 0.4 | `src/levels/boss5Arena.js:13` |

- With a 58° field of view (`src/camera/camera.js:33`), the Bird camera is about 19 m from its look point.
  Nobu (1.3 m) is about 6% of the screen height. **Observed:** about 35 px tall at 540p.
- Feathers are a cone 0.16 m wide and 1.0 m long, purple on green (`common.js:68`, `:73`). They read as slivers.
- The Bird rears up at y 8.5 during `aim` (`src/bosses/mechaBird.js:319`). **Observed:** it sits at the top
  edge of the frame behind the boss bar (`#bossbar`, `top: 74px`, 84 px portrait, `src/ui/style.css:84-98`).
  The camera already leans 20% toward the boss (`session.js:694-695`).

### F4. The boss fail loop is harsh — High, read; timing measured

- One hit kills unless a mask is held. Each stage places one Blue Sphere (`session.js:737-738`).
- Bird and Cat deaths restart at stage 1 (`BOSS_PHASE_CHECKPOINTS`, `src/config/difficulty.js:4-6`).
- Boss deaths cost a life (`session.js:959`). `START_LIVES` is 4 (`src/core/save.js:13`).
- Game Over → CONTINUE calls `startLevel(lvl)` (`game.js:1156`): a new session at the start of the level.
  Level 1 is 547 m. Rescues, backpacks and Tickets from the lost attempt are gone.
- Boss Rush already retries without spending lives (README), so the game has two rules for the same fight.

### F5. Boss help counts deaths per stage, so stage-1 restarts starve it — Medium-High, read

- `bossDda` turns on at 3 deaths: tells ×1.15, punish window +0.3 s, 1 mask (`src/bosses/medals.js:7-10`).
- The counter is `bossDeaths[phase]` (`session.js:938-941`, `:786-790`).
- For Bird and Cat every retry starts at stage 1. A player who dies twice in each of the three stages has
  six deaths and no help. Help in stage 3 needs three deaths **in stage 3**, each after clearing stages 1–2.
- This is intended and tested (`tests/boss-runtime.test.js`, "restores later-stage DDA after %s restarts at
  stage 1"). The finding is about its effect, not a bug.

### F6. Death downtime is long and cannot be skipped — Medium, measured

- Flow (`session.js:950-972`): wait 1,000 ms after a fall or 1,500 ms otherwise; death card for 1,700 ms;
  fade out 350 ms; respawn; fade in 350 ms.
- **Measured:** 3.0 s from a fall death to regained control, then the fade-in. Other deaths are about 3.6 s by code.
- The pity ladder expects up to nine deaths at one checkpoint. That is about half a minute of cards.
- The trial clock stops while Nobu is dead (`session.js:1065`), so this does not affect trial times.

### F7. Level 1 fires tutorials faster than they can be read — Medium

- Level 1 has 19 `k.tut` triggers; 11 are in the first 101 m:

| d (m) | 5 | 13 | 19 | 31 | 53.5 | 68 | 80 | 84.5 | 88.5 | 91.5 | 101 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | bite | dog | broccoli | sphere | doubleJump | spiky | slide | snacks | treat | cat | trampoline |

- Snacks, Treat Tray and Cat are 7 m apart: under one second at run speed (`src/levels/level1.js:80-95`).
- There is one pop-up element. A new tutorial replaces the current one and is marked seen for the whole
  save at once (`ui.js:253-256`). Pop-ups were **observed**; the overwrite is **read**.
- Player experience: the checkpoint explanation is replaced before it is read and never returns.

### F8. No moves reference anywhere in the game — Medium, read

- The pause menu has RESUME, WARDROBE, model, pixels, music, SFX, EXIT TO HUB, QUIT TO MAP (`game.js:775-786`).
- Zoomies (slide, keep holding Slide), Dust Dash (slide, then Bite) and Moon Jump (stand still, hold Slide
  0.6 s, then Jump) are each taught by one six-second pop-up.

### F9. The slide-jump gives no extra distance — Medium, measured

- A jump out of a slide sets horizontal speed to `SLIDE_JUMP_SPEED` 10.5 (`player.js:351`).
- In the air the normal branch pulls speed back to `RUN` 8.0 at `AIR_ACCEL` 42 m/s², in about 0.06 s
  (`player.js:283-297`).
- **Measured twice:** slide-jump 5.52 m, running jump 5.47 m.
- Zoomies is not affected: `speedMul` 1.55 applies in the air too (`player.js:279-283`).

### F10. Banners run underneath tutorial cards — Low-Medium, observed

- The banner is centred at `top: 28%`, 76 px type (`style.css:304`). The pop-up is at `top: 110px; right: 24px`,
  `min(380px, 40vw)` wide (`style.css:281-285`).
- At 960×540 "RUN! HOLD ↓ / S TOWARD THE CAMERA" ran under the Stampede card (Level 4, d≈265) and
  "IT'S RISING!" under the Boiler Flood card (d≈425). Both were reached by warp.

### F11. Hit feedback is thin — Low, read

- No hitstop exists. There is no gamepad rumble. `camera.shake` is called twice in
  `src/entities/breakables.js` and once in `src/entities/enemies.js`. A bite kill is a sparkle and a sound.

### F12. Continue puts the map cursor on Level 3 or lower — Low, read

- `toMap(Math.min(save.data.unlocked, 3))` (`game.js:353`). `unlocked` is a legacy field capped at 3
  (`save.js:200`). `save.data.lastLevel` exists and is kept current (`game.js:698`).

### F13. Title menu overlaps the logo on short viewports — Low, observed

- At 960×540 the menu covers the ribbon and Nobu. At 1280×720 the logo ends at y 375 and the menu starts
  at y 422. `.title-logo` is `min(560px, 60vw)` wide; `.title-menu` is `bottom: 8vh` (`style.css:160-164`).

### F14. Gate to fight takes several seconds — Low, measured with a caveat

- **Measured:** 12.4 s from the gate to the first boss action, skipping dialogue at once.
- That run had skipped the level and missed 83 backpacks. The missed-backpack rain drops one every
  `clamp(3 / missed, 0.07, 0.3)` s (`session.js:536`), so 5.8 s of it was rain. A normal run has at most
  about 3 s of rain. The true figure for a typical player was not measured.
- This matters only with F4, where Game Over replays the gate.

### F15. Masks do not help against pits, and the Queen's arena is pits — Low-Medium, unverified

- `Player.die()` skips masks. The Queen's catalogue lists "the pit" as the hitbox for wave, crash,
  liquidation and the ultimate. The DDA mask is therefore weak help there. Not seen in play.

### Boss attack reference

Tell seconds are `base × tele[stage]`, floored at 0.40 s (`common.js:550`, `FLOOR`). Stage multipliers are in
`src/config/difficulty.js:27-39`. "S1" means stage 1. Values are computed from the code, not timed in play.

**Mecha Bird** — tele 0.90 / 0.88 / 0.78; speed 1.15 / 1.2 / 1.4 (`mechaBird.js:247-249` for stages)

| Attack | Stages | Tell | Seconds | Marker | Lethal |
| --- | --- | --- | --- | --- | --- |
| `aim` → `dive` | 1–3 | Bird rears at y 8.5; marker tracks, locks 0.3 s early | 0.99 / 0.75 / 0.66 | r 1.7, fixed 0.38 | Yes, body within 1.8 m; landing shockwave is jumpable |
| `volley` | 1–2 | Charge pose only | 0.51 / 0.48 | none | Yes; feathers 12.1 m/s in S1 |
| `gust` | 1, 3 | Wind-up | 0.72 / 0.62 | none | No; pushes for 2.8 s |
| `perch` | 1–3 | Peck wind-up | 0.45 / 0.44 / 0.40 | none | Rolling coconut; not checked |
| `laser` | 2 | Aim, then 1.42 s sweep | 0.55 | beam | Yes |
| `cage` | 2–3 | Marker, cage swings | 1.14 / 1.05 including the 0.35 s drop | r 1.1, 0.13→0.38 | No; traps 1.2 s |
| `missiles` | 3 | Launch pose | 0.47 | none | Yes; 8.7 m/s homing, faster than Nobu runs |
| `eggs` | 3 | Drop; 1.94 s fuse | 0.40 | r 2.2, 0.19→0.38 | Yes |
| `bomb` | 3 | Six cones, 0.39 s apart, led by 0.45 s of Nobu's velocity | 0.47, then 0.53 per cone | r 1.4, 0.13→0.38 | Yes |
| `ultimate` | 1–3 | Charge; ring of 7 cones | 1.35 charge; cones 0.86 in S1 | r 1.3 | Yes |

**Big Cat** — tele 0.86 / 0.84 / 0.74; speed 1.15 / 1.2 / 1.45. Stage columns follow the boss spec; the
`dot` and `table` powers in `catPowers.js` were not re-read.

| Attack | Stages | Tell | Seconds (S1 unless noted) | Marker | Lethal |
| --- | --- | --- | --- | --- | --- |
| `swipe` | 1–3 | Paw raise | 0.41 | none | Yes; 4.4 m frontal arc |
| `cough` | 1–3 | Retch | 0.56 | none | Yes; hairballs can be bitten |
| `countdown` → `leap` | 1–3 | Crouch beats; marker tracks, then locks | 0.71 per beat first pounce, 0.41 after | r 2.4, fixed 0.38 | Yes, within 2.4 m; shockwave from S2 |
| `yarn` | 1–3 | Wind-up | 0.56 | none | Yes; ball r 1.0 |
| `claws` | 1–3 | Rear up | 0.52 | none | Yes; waves 9.8 m/s |
| `tailspin` | 2–3 | Crouch and ring marker | 0.42 (S2) | r 2.4 | Yes, 1.4–4.9 m; jumpable |
| `zoomies` | 3 | Lane stripe per dash | 0.40 (floor) | lane | Yes |
| `frenzy` (ultimate) | 1–3 | Charge, then pounces | 1.12 charge; 0.40 per pounce | r 2.4 | Yes |
| Body contact | — | none | — | — | Yes, in nine states (`bigCat.js:673`) |

**Evil Cone** — tele 0.82 / 0.80 / 0.70; speed 1.18 / 1.25 / 1.5 (`CONE_PLANS`, `evilCone.js:20-24`)

| Attack | Stages | Seconds | Marker | Lethal |
| --- | --- | --- | --- | --- |
| `barrage` | 1–3 | 0.42 | none | Yes; cones 11.2 m/s |
| `spiral` | 1–3 | 0.57, then 2.6 s | none | Yes |
| `shock` | 1–2 | 0.40 (floor) | ring | Yes; jumpable |
| `drops` | 1, 3 | 0.63 per cone | r 1.4, 0.13→0.38 | Yes |
| `shame` | 1–3 | 0.66 | none | No; cones Nobu for 3 s, or removes a mask |
| `sweep` | 2–3 | 0.72 | beam | Yes; jumpable under 0.85 m |
| `lasers` | 2–3 | 0.64, then 3.2 s | beams | Yes |
| `vortex` | 2–3 | 0.48, then 2.8 s pull | none | Yes, within 2.2 m |
| `grab` | 2–3 | 1.00 (S2), 0.70 (S3), plus 0.35 lock | r 1.9, fixed 0.38 | Yes, within 1.75 m |
| `clones` | 3 | 0.77 | three of r 1.9 | Yes |
| `rugpull`, `tide` | 2–3, 3 | 0.72, 0.84 | arena | Not checked |
| `ultimate` | 1–3 | 1.39 charge; cones 0.82 in S1 | r 1.3 | Yes |

**Roomba Titan** — tele 0.78 / 0.76 / 0.68; speed 1.28 / 1.35 / 1.55. Tell seconds from
`roombaTitan.js:282-292`; tell descriptions from the boss spec.

| Attack | Stages | Tell | Seconds | Lethal |
| --- | --- | --- | --- | --- |
| `charge` | 1–3 | Pale lane stripe (`0xffedc6`) | 0.78 / 0.76 / 0.68 | Yes; 20.5 m/s in S1 |
| `recharge` | 2–3 | Re-aimed lane | 0.66 (S2) | Yes |
| `cable` | 1–3 | Cable glows | 0.70 | Yes; low, jumpable |
| `suction` | 2–3 | Vents glow | 0.53 | Yes, at the body |
| `stomp` | 3 | Shadow marker r 1.2 | 0.68 | Yes. See F2. |
| Brushes | always | none | — | Yes below 0.5 m; jumpable (`roombaTitan.js:465`) |

**Pump Queen** — tele 0.76 / 0.74 / 0.66 / 0.62 (`pumpQueen.js:331-345`)

| Attack | Stages | Seconds | Threat |
| --- | --- | --- | --- |
| `mint` | 1–3 | 0.61 | Pump Pills |
| `pump` | 1–3 | 1.06 | Body contact, then the dump wave |
| `fomo` | 2–3 | 0.67 | 2.8 s pull toward the pit |
| `airdrop` | 2–4 | about 3 s fall (spec) | Crates; marker r 1 whose opacity rises as the crate descends (`queenHelpers.js:156-170`). The always-on-top "!" and "+" sprites were removed in `5c2f062`. |
| `crash` | 3 | 0.66 | A lane of pillars drops |
| `wake` | 4 | 0.62 | Ring and shockwaves |
| `ultimate` | 1–4 | 1.5, fixed | Pillars plunge |

Many tells sit at 0.40–0.55 s in **stage 1** after `5c2f062` made stage 1 faster. They are legal under
`FLOOR.teleSec`, but they leave no slack for a marker the player cannot see.

## 5. The plan

Effort: **S** under a day, **M** a few days, **L** a week or more.

### Phase A — friction and quick wins

**A1. Continue lands on the level last played** (fixes F12)

- Change: `game.js:353` `this.toMap(Math.min(save.data.unlocked, 3))` → `this.toMap(save.data.lastLevel ?? 1)`.
  `toMap` already falls back when the level is not open (`game.js:455`).
- Tests: add a case to `tests/main-progression-game.test.js` with `lastLevel` 4, 6 and 5.
- Acceptance: with Level 6 last played, Continue highlights Level 6.
- Effort S. No dependencies. Risk: none found.

**A2. Faster, skippable respawn** (fixes F6)

| Step | Now | Proposed |
| --- | --- | --- |
| Wait before the card, fall | 1,000 ms | 600 ms |
| Wait before the card, other deaths | 1,500 ms | 900 ms |
| Death card | 1,700 ms, fixed | 900 ms; Jump, Bite or Confirm skips it after 250 ms |
| Fade out / fade in | 350 / 350 ms | 200 / 200 ms |

- Steps:
  1. In `Session.onPlayerDeath` (`session.js:950-972`) move the four numbers into a frozen
     `DEATH_FLOW` constant in `src/config/difficulty.js`.
  2. Add `_deathCardDelay(ms, skipAfterMs)` beside `_pipelineDelay` (`session.js:109`). It resolves on the
     timer, or when `Session.update` sees `input.pressed('jump' | 'bite' | 'confirm')` after `skipAfterMs`.
     Register it in `_lifecycleWaiters` exactly as `_pipelineDelay` does, so disposal still releases it.
  3. Keep every `if (!current()) return;` guard after each `await`.
  4. Call `input.clear()` before `respawn()` so the skip press does not also jump.
- Tests: extend `tests/boss-runtime.test.js` and `tests/pipeline-lifecycle.test.js` (both drive
  `onPlayerDeath` with fake timers). Add a skip case and an "abandoned session never respawns" case.
- Acceptance: fall death to control ≤ 1.8 s unskipped and ≤ 1.2 s skipped, measured as in section 2. The
  caption is still readable for 900 ms.
- Effort S. Risk: the async death-flow guards; Remix, Pipeline and Gauntlet sessions share this path. The
  trial clock is unaffected (`session.js:1065`).

**A3. MOVES page in the pause menu** (fixes F8)

- Change: add `{ id: 'moves', label: 'MOVES' }` after RESUME in `_pauseItems()` (`game.js:775`). Add
  `_drawMoves()`: base moves always; earned moves only when `player.abilities` has them; gear moves when
  equipped. Reuse the `TUTORIALS` text (`src/story/script.js:196`) through `input.prompt()` so pad players
  see buttons. Esc, Backspace or pad B returns.
- Tests: `tests/pad-screens.test.js` and `tests/pause-exit-confirm.test.js` patterns; assert Moon Jump is
  absent before the Queen is beaten.
- Acceptance: every row of the README's "Earned move" table is reachable in two inputs from pause.
- Effort S. Risk: none found.

**A4. Queue tutorials instead of overwriting them** (fixes F7)

- Change in `UI.tutorial(id)` (`ui.js:250-263`):
  - If a pop-up has been visible for less than 2.5 s, push `id` onto `popupQueue` (cap 3) and return.
  - Mark `save.data.tutorials[id]` **when shown**, not when queued.
  - In `UI.update` (`ui.js:296`), when the pop-up expires show the next one. Display time: 6 s with an
    empty queue, 4 s otherwise.
  - Clear the queue on death, level end and `clearScreen()`, without marking the entries seen.
- No Level 1 geometry or trigger moves are needed.
- Tests: new `tests/tutorial-queue.test.js`: three calls within 1 s are all shown in order; a queued entry
  cleared by death shows again next time.
- Acceptance: running Level 1 from d 80 to d 101 without stopping shows slide, snacks, treat, cat and
  trampoline in turn, each for at least 2.5 s.
- Effort S. Risk: `tests/l1-layout2.test.js` and others stub `tutorial(`; keep the signature.

**A5. Layout: banner against pop-up, and the short title screen** (fixes F10, F13)

- Banner: in `UI.banner()` (`ui.js:265`) add class `dodge` to the pop-up while `bannerT > 0`; CSS
  `.popup.dodge { top: auto; bottom: 96px; }`.
- Title: add `@media (max-height: 620px)` with `.title-logo { width: min(380px, 44vw); top: 2vh; }`,
  `.title-menu .menu-item { font-size: 28px; }` and `.title-menu .menu { gap: 4px; margin-top: 10px; }`.
- Acceptance: at 960×540 no bounding boxes intersect in either case; 1280×720 is unchanged.
- Effort S. Risk: none found.

### Phase B — fairness and readability

**B1. A readable edge on every landing marker** (fixes F1; needs decision 8.1)

- Goal: keep the soft shadow, and show where the lethal radius ends.
- Change in `makeMarker` (`common.js:52-58`):
  - Add a child ring mesh: inner radius 0.92 × r, outer 1.0 × r, `MeshBasicMaterial`, colour `0xffd23f`
    (the gold already used for stage effects), `depthWrite: false`, `fog: false`.
  - Ring opacity ramps 0.35 → 0.90 over the delay. Fixed markers (dive, pounce, grab) hold 0.75.
  - `MARKER_OPACITY` 0.38 → 0.50, and the falling-object start factor 0.35 → 0.50 (`common.js:290`).
- Steps: store the ring as `marker.userData.rim`; set its opacity next to every existing
  `marker.material.opacity` write (`common.js:290`, `:350`, `queenHelpers.js:158`, `:170`); dispose the
  ring material wherever marker materials are disposed.
- Tests: `tests/boss-arena.test.js` or a new `tests/markers.test.js`: every `dropCone`, `falling`, `cage`
  and `eggBomb` marker has a rim; rim opacity is at least 0.35 from the first frame.
- Acceptance: in a 960×540 screenshot of `bomb` on each arena floor, the rim is visible at the first frame
  of each marker. A human can count the active markers.
- Effort S–M. Risk: reverses part of an owner choice. No difficulty numbers change, so
  `tests/difficulty.test.js` is untouched.

**B2. Markers that read in the dark** (fixes F2)

- The B1 rim is unlit, so it already shows under Lights Out. If B1 is declined, do this alone: for
  `kind === 'leg'` set the marker colour to `0xffedc6` (the lane-stripe colour) at 0.6 opacity.
- Tests: `tests/titan-powers.test.js`: during `darkT > 0` a leg marker's visible colour is not black.
- Acceptance: stage-3 `stomp` forced during Lights Out shows three markers in a screenshot.
- Effort S. Depends on B1's decision. Risk: none found.

**B3. Arena framing** (fixes F3)

- Starting values, scaling each offset by about 0.82 and raising `follow` so Nobu stays framed:

| Arena | Offset now | Proposed | `follow` |
| --- | --- | --- | --- |
| Bird | 11.5, 16 | 9.5, 13.1 | 0.45 → 0.55 |
| Cat | 12, 15.5 | 9.8, 12.7 | 0.45 → 0.55 |
| Cone, Titan | 12.5, 16.5 | 10.3, 13.5 | 0.45 → 0.55 |
| Queen | 15, 19 | unchanged until seen in play | — |

- Bird only: `focusWeight` 0.2 → 0.3 (`session.js:695`) so the rear-up is in frame.
- Boss bar: portrait 84 → 56 px, name 26 → 20 px, width `min(640px, 80vw)` → `min(520px, 70vw)`.
- Feathers: `mesh.scale.setScalar(1.6)` in `Projectiles.feather` (`common.js:109`). The hit radius
  (`r: 0.45`) stays.
- Steps: change one arena at a time; for each, force every attack and take screenshots at 16:9 and 4:3.
- Tests: `tests/boss-arena.test.js` if it pins camera info; `tests/rush-session.test.js` (Rush reuses
  these arenas through `src/game/rushArenas.js`).
- Acceptance: Nobu is at least 7.5% of the viewport height at the arena centre; the far edge and both far
  corners are in frame when Nobu stands at the near edge; the Bird's rear-up is fully below the boss bar.
- Effort M. Risk: these are estimates from geometry, not tested values. Expect iteration.

**B4. Boss deaths do not cost lives** (fixes F4; needs decision 8.3)

- Change: `session.js:959` `if (!this.trial) save.data.lives -= 1;` →
  `if (!this.trial && this.phase !== 'boss') save.data.lives -= 1;`.
- Effect: Game Over cannot happen inside a boss fight, so the full-level replay and second gate sequence
  (F14) disappear. The Good Boy Bone is unaffected: it reads `deathsAtGate` (`session.js:428`).
- Tests: `tests/boss-runtime.test.js`: four boss deaths leave `save.data.lives` unchanged; a field death
  still decrements.
- Acceptance: with 0 lives at the gate, dying to the Bird respawns in the arena.
- Effort S. Risk: none to medals, which do not read lives.

**B5. Boss help counts the whole fight for bosses that restart at stage 1** (fixes F5; decision 8.2)

- Change in `_applyBossDda` (`session.js:786`): when `this.boss.phaseCheckpoints === false`, use the sum of
  `this.bossDeaths` instead of `this.bossDeaths[phase]`. The threshold stays 3 (`medals.js:8`).
- Effect: from the fourth attempt at Bird or Cat the player has one mask, tells ×1.15 and +0.3 s windows
  in every stage. Medals are already voided by any help (`session.js:791-794`).
- Tests: rewrite the "restores later-stage DDA after %s restarts at stage 1" case in
  `tests/boss-runtime.test.js`. `tests/boss-medals.test.js:37-42` stays as is.
- Acceptance: three Bird deaths in any stages give a mask on the next respawn; Cone, Titan and Queen
  behave as now.
- Effort S. Risk: medal eligibility. Keep `bossRun.void = true` whenever help applies.

**B6. Optional: stage checkpoints for Bird and Cat after repeated deaths** (decision 8.2)

- Change: `session.js:1024` → respawn at `this.bossPhaseCp` when `phaseCheckpoints === false` **and** the
  fight has 5 or more deaths. `bossPhaseCp` is already tracked for every boss (`session.js:706`).
- Tests: `tests/boss-runtime.test.js`: `toMatchObject({ bird: false, cat: false })` still holds; a fifth
  death in stage 2 respawns at stage 2 with `bossRun.void` true.
- Effort S. Do only if the owner picks it.

### Phase C — feel and skill moves

**C1. Make the slide-jump a long jump, or remove the dead constant** (fixes F9; decision 8.4)

- Option 1, carry the speed:
  - Add `export const SLIDE_JUMP = Object.freeze({ decay: 3 })` in `player.js`, **outside** `TUNING`.
  - In the jump block (`player.js:349-352`) set `this.airCarry = T.SLIDE_JUMP_SPEED`.
  - In the normal branch (`player.js:283`) use `Math.max(T.RUN * this.speedMul, this.airCarry || 0)` as
    the target speed while airborne with the stick held within 60° of facing. Each frame
    `airCarry = Math.max(T.RUN, airCarry - SLIDE_JUMP.decay * dt)`. Clear it in `_onLand`, `hurt`,
    `_startFlop`, `_startAirDash` and `reset`.
  - Expected: about 6.3 m against 5.5 m. This is an estimate; measure it.
- Option 2: delete `SLIDE_JUMP_SPEED` and `player.js:349-352`. That also needs the `TUNING` pin in
  `tests/gauntlet-math.test.js:7` updated.
- Tests: new `tests/slide-jump.test.js` beside `tests/dust-dash.test.js`; re-run
  `tests/gauntlet-math.test.js`, `tests/gauntlet-patterns.test.js`, `tests/trials-bounds.test.js`.
- Acceptance (option 1): slide-jump air distance is 6.0–6.6 m; a running jump is still 5.47 m.
- Effort S for code, M with trial re-checks. Risk: trial times and medal targets; see section 7.

**C2. Hitstop** (F11)

- Add `Game.hitstop(ms)`; in `Game.update` pass `dt = 0` to `session.update` while it runs, and keep UI,
  camera shake and audio going.
- Values: enemy kill by bite, stomp or flop 40 ms; boss damage 80 ms; mask lost 60 ms.
- Off when `session.trial` or `session.ranked`. Advance `bossRun.t` (`session.js:1045`) with the real `dt`
  so Speed medals are not made easier.
- Tests: new `tests/hitstop.test.js`; `tests/ui-trial-clock.test.js` for the trial exclusion.
- Effort S–M. Risk: the trial clock and boss medal timer.

**C3. Gamepad rumble** (F11)

- Add `PadReader.rumble(ms, strong, weak)` in `src/core/gamepad.js` using
  `vibrationActuator?.playEffect('dual-rumble', …)`, a no-op when absent. Add `save.data.rumble`
  (default on) and a pause item.
- Values: mask lost 150 ms at 0.8 / 0.4; death 250 ms at 1.0 / 0.6; flop landing 90 ms at 0.6 / 0.2; boss
  hit 120 ms at 0.7 / 0.5.
- Tests: `tests/gamepad.test.js`; `tests/save-migrate.test.js` for the new field.
- Effort S. Risk: none found.

**C4. Kill feedback** (F11)

- In `Enemy.knock` and `Enemy.squash` (`src/entities/enemies.js:184-195`) add `camera.shake(0.12, 0.12)`.
- Effort S. Do with C2.

### Phase D — larger

**D1. A committed headless playtest harness.** Put the section 2 method in `tools/` as a script that
prints the physics table, respawn timings and a boss-attack screenshot set. It should use the Test Lab's
`window.testLab` API once that exists (`docs/test-lab-plan.md`) rather than a second hook. Effort M.

**D2. First-play death data.** Run the three-players-per-level playtest from expansion plan 4.6 with
`?heatmap`, and compare with the targets in its 4.4. Effort M, mostly people's time.

**D3. Resume at the gate after Game Over.** Only if B4 is declined. Needs the session to carry field
results across a restart. Effort L.

**D4. Touch input.** Not planned. See section 10.

## 6. Suggested order and PR batching

Each PR is its own branch from the latest `main`, named `<agent>/<slug>`, and runs `npm run lint`,
`npm test` and `npm run build`.

| PR | Items | Why together |
| --- | --- | --- |
| 1 | A1, A5 | UI only, no session logic |
| 2 | A2 | Touches the death flow; review alone |
| 3 | A3, A4 | Onboarding |
| 4 | B4, B5 (and B6 if chosen) | Boss rules in `session.js`; after decisions 8.2 and 8.3 |
| 5 | B1, B2 | Markers; after decision 8.1 |
| 6 | B3 | Camera and boss bar; needs screenshots per arena |
| 7 | C2, C3, C4 | Feedback |
| 8 | C1 | Last; after decision 8.4 |

D1 can land at any time and makes PRs 2, 5, 6 and 8 easier to verify. PRs 2 and 4 both edit
`session.js`; do not run them as parallel tasks.

## 7. Hub integration

Facts from this repo:

- Tickets come from collected items, scaled by `NOBU_TICKET_SCALE` 1/3, and are sent at level end in
  chunks of at most `LEVEL_END_MAX_AMOUNT` 20 (`src/config/tickets.js`). Per-level ceilings are in
  `LEVEL_TICKET_CAP` (Level 1: 205; Level 2: 17).
- Trial times go to board `nobu_trial_time` with nine variants: `1`, `2`, `3`, `1v2`, `2v2`, `3v2`, `4`,
  `6`, `5` (`src/config/trials.js`). Floors are in `TRIAL_FLOOR_MS` and must never be looser than the hub's.
- Beating the Evil Cone reports the Cone's Tip Relic (`hub.reportCone`, `session.js:754`).
- The map's Ticket exchange uses `TICKETS_PER_VERSE` and `VERSE_DAILY_CAP` from the SDK (`src/hub/hubBridge.js:4`).

Facts supplied by the hub audit, **not verifiable from this repo**: earns are client-reported with server
time floors and a rate limit; the nine boards work and fill 9 of the plaza Bar's 17 leaderboard pages; the
Relic is live; caps are 200 Tickets per session, 1,000 per game per day, 10 Tickets = 1 Verse, 50 Verse per
game per day; Verse currently buys nothing.

What this plan means for the hub:

| Item | Effect | Action |
| --- | --- | --- |
| A2 respawn | None. The trial clock stops while dead. | None |
| B4, B5, B6 | Local lives, masks and medals only. | None |
| C2 hitstop | Would shorten trial times if left on. | Keep it off in trials and ranked play |
| C1 slide-jump | Faster ground travel before Zoomies; mostly Level 1 trials. | See below |

C1 in detail:

- **Floors stay valid.** The Level 1 floor of 25.7 s over 547 m implies 21 m/s, far above anything C1
  allows. No hub change is needed for floors.
- **Existing board times become easier to beat.** Either accept that (no hub work), or add new variants.
  New variants need hub server work, a re-vendored SDK through `metaverse-hub`'s `scripts/vendor-sdk.mjs`
  (never edit `vendor/hub-sdk` in place), and a change to `trialVariantInfo`, whose pattern accepts only
  `v2` (`trials.js`). Six more boards would take the Bar from 9 to 15 of 17 pages.
- `TRIAL_TARGETS` medal times would need re-measuring either way.

One question for the hub owner: Level 1's ceiling of 205 Tickets is above the stated 200-per-session cap.
Whether a full Level 1 clear loses 5 Tickets, and what a second level in the same session earns, could not
be checked here.

This plan adds no Ticket source. Since Verse buys nothing yet, rewards in this plan are feel and clarity.

## 8. Decisions for the owner

**8.1 Landing shadows** (commit `5c2f062` chose the subtle shadow on purpose)

| Option | Cost | Result |
| --- | --- | --- |
| Keep | none | F1 and F2 stand |
| Middle: keep the shadow, add the thin gold rim (B1) | S–M | The edge is visible; no red target, no timer |
| Rim only as help: show it when boss DDA is active or in Lights Out | M, more states to test | Default look unchanged |
| Revert to the red crosshair | S | Clear, but the look the owner rejected |

Recommendation: the middle option. If not, do B2 alone so Lights Out is fair.

**8.2 Stage-1 retries for Bird and Cat** (`src/config/difficulty.js:4-6`: "The owner chose stage-1 retries
for Bird/Cat in H20"; the boss spec had recommended checkpoints for all five)

| Option | Cost | Result |
| --- | --- | --- |
| Keep as is | none | F5 stands |
| Middle: keep stage-1 retries, count help across the fight (B5) | S | Help on the fourth attempt; clean runs unchanged |
| Middle plus checkpoints after 5 deaths (B5 and B6) | S | A floor under the worst case |
| Checkpoints for all bosses | S | Bird and Cat get easier for everyone |

Recommendation: B5. Players who do not die three times never see it, and medals stay strict.

**8.3 Lives at bosses**

| Option | Cost | Result |
| --- | --- | --- |
| Keep | none | Game Over at a boss replays the level |
| Boss deaths are free (B4) | S | Matches Boss Rush |
| Game Over resumes at the gate (D3) | L | Keeps lives meaningful at bosses |

Recommendation: B4.

**8.4 Slide-jump**

| Option | Cost | Result |
| --- | --- | --- |
| Leave | none | A constant that does nothing |
| Carry the speed (C1 option 1) | S–M, plus trial targets | A skill move; board times shift |
| Remove the constant (option 2) | S | Honest code, no new move |

Recommendation: decide after asking whether the boards hold times anyone cares about. If they do, option 2.

**8.5 Is phone play a target?** Nothing here assumes it. A yes makes D4 a project of its own.

## 9. How to verify the changes improved play

Re-run the section 2 method (or D1) and compare:

| Measure | Now | Target |
| --- | --- | --- |
| Fall death to control | 3.0 s | ≤ 1.8 s, ≤ 1.2 s skipped |
| Other death to control | about 3.6 s (by code) | ≤ 2.1 s |
| Tutorials shown, Level 1 d 80–101, no stops | not measured; overwrite read in code | all 5, each ≥ 2.5 s |
| Marker rim opacity at first frame | no rim | ≥ 0.35 |
| Nobu's height, Bird arena centre | about 6% | ≥ 7.5% |
| Lives lost per boss death | 1 | 0 |
| Bird help after 3 deaths spread over stages | none | 1 mask, tells ×1.15 |
| Slide-jump distance | 5.52 m | 6.0–6.6 m, or constant removed |
| Running jump distance | 5.47 m | 5.47 m |
| `npm test` | 1,494 passing | all passing |

Human playtest checklist (a first-time player, sound on, real GPU):

1. Play Level 1 without help. Can they say what a Snacks box and a Treat Tray do?
2. At the Mecha Bird, ask after each death: "what hit you, and did you see it coming?"
3. Count attempts to beat the Bird and the Cat, and whether they quit.
4. After beating the Queen, ask them to perform Zoomies, Dust Dash and Moon Jump from memory, then with
   the MOVES page.
5. In Titan stage 3, can they point at each leg marker during Lights Out?
6. Does the shorter death card still feel like a beat, or does it feel abrupt?
7. With a gamepad: is rumble too strong on death?

Record deaths per section with `?heatmap` and compare with expansion plan 4.4.

## 10. Not audited, out of scope

- **Touch input.** `src/core/input.js` handles keyboard and gamepad only.
- **Audio by ear.** The README says attacks rely on sound tells. None were heard, so F1–F3 may overstate
  the problem for a player with sound on.
- **Frame rate and load time.** Software rendering only.
- **Bosses 2–5 in play.** Their tables are from code and the boss spec. Big Cat's `dot` and `table`
  powers, the Cone's `rugpull` and `tide`, and the Queen's pit attacks need a real run.
- **Levels played end to end.** Difficulty spikes, dead stretches and camera problems inside levels were
  not assessed beyond warped screenshots. The front-facing chases (Level 2, the coconut run, the stampede)
  deserve a played pass: the camera sits 12.5 m ahead of Nobu (`src/levels/level2.js:118`) while the cat
  runs 6.7–10.5 m/s (`CHASE_TUNING`).
- **Remix, Boss Rush, Box Gauntlets, the Kennel and the Wardrobe.**
- **Balance of Ticket payouts and the hub server.**
