# H04d candidate corrections and pending integration

The owner approved the tested corrections on **2026-11-04** with “Use the tested corrections.”
`PATTERNS` and `TEACH_PATTERNS` are now the canonical shipping exports. `AUTHORED_PATTERNS` preserves
unsafe source literals only as regression fixtures. The PROPOSED aliases remain for review history.
Shared wiring and dev-strip verification are being completed below.

## Concrete design decisions

| Pattern | Source | Candidate | Numeric reason |
| --- | --- | --- | --- |
| P2 tier 1 | Packs at 3, 6.4, 9.8, 13.2; exit16.5 | Packs3,6.2,9.4,12.6; exit15.9 | Tap bounce4.2667×.75=3.20; preserve3.3 exit gap |
| P3 tier 3 | Long steps5.2; centres3,6.4,11.6,15,20.2; exit23.5 | Long steps4.8; centres3,6.4,11.2,14.6,19.4; exit22.7 | Held bounce5.6×.86=4.816 |
| P6 tier 3 | Eight blinking boxes; prose calls them four actions | Fourth box (dd9.6) is a permanent lunchbox | Eight temporary landings cannot satisfy six actions between permanent rests |
| P7 tier 2 | Fall delay.45 | Authored delay.50 | Universal tier2 tell.50 starts on contact; configured delay remains exact |
| P16 tier 4 | Arrow16 tap, prose accepts gaps≤7.3; fall delay.32 | Explicit held arrow route; actual moving landing tested, delay.40 | Tap reach6.533×.92=6.011; held7.467×.92=6.869; tier4 tell.40 |

FallBox's default.45 and the player movement constants are unchanged. Only the approved pattern options
raise delays. A source-configured .30/.32/.38 delay still disables collision at that exact time; such an
authored pattern fails its tell check where it conflicts with the tier. No global delay correction hides it.

The same approval covers teaching variants where the source's gentler values were insufficient:

| Teach | Source | Candidate |
| --- | --- | --- |
| P1 | No exit ledge | Exit on safe floor at y0 (reflects the written teach rule) |
| P2 | Spacing3.0 | Spacing3.0 unchanged (reflects written teach rule) |
| P3 | 3.4/4.8/3.4 rhythm | Short3.4 unchanged, long4.1; held route on all bounces; safe floor |
| P5 | Four blinks, on1.6/off.8 | Second blink becomes permanent lunchbox, splitting the sequence |
| P6 | Eight blinks, on1.6/off.8 | Permanent lunchboxes at dd7.2 and14.4 (dd9.6 is a blink again) |
| P7 | Single gap over safe floor | One gap, two rows (dd1–8 and12–17), exit18.5, all y0 (reflects the written single-gap teach rule) |
| P10 | Gentler values unspecified | Relay spacing4.8; exit16.4 |
| P11 | Gentler values unspecified | Climb spacing4.2; exit14.8 |
| P14 | Gentler values unspecified | Rise2.5 per double; final exit y6 |
| P16 | Gentler values unspecified | Fall replaced by permanent lunchbox (fall is taught in P7); final exit24.1; safe floor |

All approved placements are actual builder inputs. `placePattern` consumes exactly the tested data,
including lower stair supports, all six stack backpacks, Rugs and TNT wall pieces. Stacks explicitly
use `k.pack(..., rawTickets)` so the old k.stack default cannot leak random Tickets into gauntlets.

## Factual fixture corrections

- Exact unchanged 60Hz integration yields a **27 frame** double-jump window for +3m/4m
  (second press frames9 through35), not the source's29. Height double at.38s still reaches3.8158m,
  distance double10.8m. No movement tuning changed.
- `blinkWindow(.5,1,.5,.72)` is **.28s**, not zero. A takeoff at0..28 lands inside the destination's
  .5..1.0 solid interval. It still correctly fails tier1's30 frames. A separate actual zero-window case
  uses on.1/off1/delay.5/flight.72.
- Half tiers preserve exact maxPct.775 for G1.5; frame/action rounding and hundredth margins/tells
  round toward the easier requirement.

## Pending wiring (owned by other active agents)

1. player.js: replace the literal TUNING block with `import { TUNING } from '../config/movement.js';`
   and `export { TUNING } from '../config/movement.js';`. The new object is byte-for-byte the old values.
2. kit.js: import `installBoxHelpers` from './boxKit.js'; after constructing k, before returning it,
   call `installBoxHelpers(k, game, stage)`.
3. stage.js: import `advanceBeatClocks` from '../entities/boxes.js'; call
   `advanceBeatClocks(this, dt)` once immediately after `this.world.beginFrame()` and before any entity
   update. This also advances culled/offscreen clocks. Each box's onRespawn resets its clock.
4. script.js: correct BETWEEN[1] slide-jump tip (only about.1m extra), and add the spec's four tutorial
   entries. Near-player hooks are present in the new entities and bounce-chain packs; their copy awaits the shared script edit.
5. dev.js: install a dedicated strip using approved pattern data and `placePattern`, with entry/exit
   pads and per-pattern clocks. `T.gauntletCheck()` should validate `stage.timedPatterns`; do not pretend
   isolated `stage.timedBoxes` can reconstruct routes, rests or timing windows.
6. G1–G3 stages, registry, Polaroids and medals remain H46. No raw gauntlet stage sequencing is included
   in H04d and no new media was generated.

## Verification state

Focused tests cover numeric movement, lifetime/reset, no crushing, countability, DDA context exclusions,
all16 candidate patterns and their16 teach variants, source failures and strict negative cases.
No manual dev-strip, camera/readability or first-time-player verification has been performed yet.
The current audio API has no per-call volume setting for clang; reversal uses the existing clang at its normal level.
A moving-target window samples actual takeoff/landing positions; its conservative numeric sampling is
an authoring check and does not replace playtesting or guarantee a specific controller strategy.
