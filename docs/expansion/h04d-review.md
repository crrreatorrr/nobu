# H04d candidate corrections and pending integration

The owner approved the tested corrections on **2026-11-04** with “Use the tested corrections.”
`PATTERNS` and `TEACH_PATTERNS` are now the canonical shipping exports. `AUTHORED_PATTERNS` preserves
unsafe source literals only as regression fixtures. The PROPOSED aliases remain for review history.
The shared clock, kit installer, tutorials and dedicated dev strip are integrated.

## Concrete design decisions

| Pattern | Source | Candidate | Numeric reason |
| --- | --- | --- | --- |
| P2 tier 1 | Packs at 3, 6.4, 9.8, 13.2; exit16.5 | Packs3,6.2,9.4,12.6; exit15.9 | Tap bounce4.2667×.75=3.20; preserve3.3 exit gap |
| P3 tier 3 | Long steps5.2; centres3,6.4,11.6,15,20.2; exit23.5 | Long steps4.8; centres3,6.4,11.2,14.6,19.4; exit22.7 | Held bounce5.6×.86=4.816 |
| P5 tier 2 | Four blinks with five timed actions including entry/exit | Add permanent lunchbox at x0,y1.5,dd8.25; preserve all four blinks | Three timed actions each half; owner additionally approved “Add the permanent rest” on2026-11-04 |
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
| P10 | Gentler values unspecified | Two launchers dd3,7.8; exit12,y2; three timed actions including entry and exit |
| P11 | Gentler values unspecified | Two launchers dd3,y0 and7.2,y1.5; exit11.2,y3.5; three timed actions |
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

## Integration

- Player imports and re-exports the unchanged TUNING object from config/movement.js.
- The kit installs all five helpers and visual guide arcs through installBoxHelpers.
- Stage.update advances shared clocks once, immediately after world.beginFrame and before any entity
  updates. Offscreen boxes stay synchronized; respawn resets clocks through entity hooks.
- Script contains all four box tutorials and the corrected slide-jump tip.
- `await T.boxes()` builds all16 approved patterns from the canonical data with the same placePattern
  builder; `await T.boxes({teach:true})` builds the teaching versions. `T.boxAt('P6')` selects an entry
  and sets the normal session checkpoint. `T.die()` exercises normal death/rollback.
- `await T.gauntletCheck()` validates stage.timedPatterns, with no offset placement copy.
- G1–G3 stages, registry, Polaroids and medals remain H46. No new media was generated.

## Verification state

Tests cover numeric movement, real Stage.update ordering and culling, normal Session.respawn phase
reset, no crushing (including a box sleeping through an entire off phase), countability, DDA context
exclusions, all16 approved patterns and16 teach variants, source failures and strict negative cases.
The separate spawn metadata regression proves controllers see the checkpoint's track position on their
first frame, and arenas clear stale track metadata; no movement constants changed.

Chromium/SwiftShader built the normal strip before the additional P5 rest (134entities,40timed boxes,10clocks), visited all16
entry pads, returned no gauntlet validation problems, and passed programmatic runtime checks for one
clock advance per stage frame, checkpoint phase/slider reset, and blink/fall occupied returns.
No JavaScript exceptions occurred. Two resource404s were observed alongside otherwise working assets.
The browser initially missed short key taps while skipping L1 dialogue; the dev strip now advances
its startup dialogue directly so it does not depend on render speed.

No human controller clear of all16 patterns, first-time-player difficulty study, or full camera/readability
review was performed. A moving-target window samples actual takeoff/landing positions; this authoring
check does not replace playtesting or guarantee a particular controller strategy.
The current audio API has no per-call clang volume setting; reversal uses the existing normal-level clang.
Blink/fall use the existing implemented blip/roll placeholder cues, as explicitly permitted by the spec.

## Additional action-boundary correction approved

The owner additionally approved “Add the permanent rest” on **2026-11-04**. The canonical P5 now
includes the permanent lunchbox at x0,y1.5,dd8.25, preserving all four original blink boxes and phases.
Counting the initial timed landing and the exit produces three actions per half, within the tier2
limit of four. P5_ACTION_REST_PROPOSAL aliases this canonical approved object; it is no longer pending.
No validator threshold was relaxed, and a dedicated entry/exit boundary regression prevents omission.
Teaching relay variants use two launchers because three launchers plus entry/exit require four actions;
the source specified no exact teaching coordinates, so these are documented implementation choices.

## Independent review follow-up

The final review added regression coverage for guide arcs beyond the stage's culling radius,
curved-track arrow orientation, raw helper-chain reach warnings, floor/blink entry and exit windows,
and initial blink respawn phase. Raw chains register partial proofs (only the supplied chain points;
callers must still author their entry, exit and rests). Canonical patterns retain their complete route
checks. P12's route now explicitly models four held hops over its unchanged Rug placements, with
player-sized swept hazard checks; running through the same runway is a failing regression.
