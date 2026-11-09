# H33 bonus extension candidate review

Source: `docs/expansion/handoff/H33-extend-bonus.md`, extended-levels-spec §§5, 6, 7A.2, 7A.4, 11.5–11.6 from specification branch `claude/clever-goodall-8221xu` (`fb95a0a8072ebd02202e4b3d045e4e609b335829`).

## Candidate boundary

The existing `buildBonusRide` and `buildBonusCave` preserve layout 1 for regression. The parent integrated registry aliases selecting `buildBonusRideCandidate` and `buildBonusCaveCandidate` for layout 2, with matching dog/section/Hidden metadata and canonical budget rows. Shared Story copy and Session round lifecycle hooks were supplied separately by the parent. All new art is primitive geometry and existing textures.

Distances: Ride END470, gate460, trigger462, spawn3, path459; Cave END380, gate371, trigger373, spawn3, path370. Original content shifts only at the specified splices. Every original floor crossing an insertion splits, including Ride's final floor crossing BOTH205 and289. The stale §5.2 example only splits205; retaining its unsplit second half would fill the new Dog-Door pit. Existing H06 staggering remains unchanged within each shifted stretch.

Existing dogs retain their IDs; new IDs are `ride:pug-a`, `ride:dalmatian-a`, `cave:corgi-a`, `cave:dalmatian-a`, for four dogs per bonus. The split's pug is at living-room D154, following the corrected Golden audit. Kitchen hazards are noncountable. Sofa entry175/exit176 is a loop; the successful round returns to176 with its haul, loss returns to170 for retry. Permanent entry stairs use unchanged step-up physics; raised floor slabs are Solids so the ground underneath remains available. A local fall detector catches landing on the lower main floor, which the generic round's floorY−4 rule alone would miss. Death allows re-entry when the haul has rolled back.

Crystal stones keep their collision enabled when unlit. Lighting uses persistent entity visibility, including actual Stage.update resets, and real Player bites. Mushroom relays light the next mushroom for two seconds. The final corrected nine Lumi nest distances are used; the63m longest interval follows that explicit list and the checklist's 'about60m' wording. The Hollow nest is physically below the path at−4.5. Hidden placements follow §§5.6/6.6; no Golden content requires a later move.

## Measured economy

| Candidate | Field raw | Plain packs raw | Zipped raw | Bark raw | Mystery max | Total raw | Whole max | Approved cap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Ride |92|80|16|0|0|188|62|110|
| Cave |64|70|16|15|9|174|58|89|

Measurements run real builders and real payer classes with mocked rendering assets only, at both low and high random rolls. Negative tests inject extra authored payers and require fixed-cap rejection. Sofa loop payers are included in the total. No cap grows automatically. `BUDGET_V2` exports match `BONUS_BUDGETS_V2`; parent activation selects those declarations with the candidate builders.

## Placement reconciliation and owner decision

StaticPlatform's y argument is its TOP. The source's island and door snippets use y0 while describing walls1.2m/4m tall; the candidate uses tops1.2/4 and depths1.2/4 to implement those stated heights. These are collision API corrections, not altered dimensions. Mystery slot is numeric0, preserving the current unique-integer slot API rather than the stale string example.

The literal Hollow floor is only3.4m wide at u−2.4 (u−4.1..−0.7). It misses a fall from the existing right lunchbox at u+1.5/D277, contradicting §6.6's safety claim that falls from those steps land in the Hollow. The owner approved “Use the tested wider floor.” The default candidate now changes ONLY the lower floor under the open lunchbox pit270..283 to width8.6 centered0 at y−4.5/depth2. The267..270 and283..285 ends retain the literal3.4m left floor. Real World drops from all three steps compare the failing literal layout with the corrected proposal. Both keep upper track groundAt empty there and have identical Ticket maxima. The literal narrower regression remains selectable with `{ wideHollow: false }`.

The literal mushroom at283 starts below the return floor. Actual World physics proves its unchanged17-power launch clears that surface without an air jump; actual base bite from282.5 reaches the lower Hidden at284.5 before the launch. No roof-opening departure is required.

## Verification and limits

Meaningful checks include: original builder budgets and IDs; all insertion span splits; low/high candidate measurements and negative cap guards; audit steering margin on main-lap and separate Sofa countables; actual Player collision opening the new Zipped in one ram; actual Player.update single cut-hop collecting both midair Toy Box packs; actual base hop clearing the Dog-Door gap beyond442; actual drive up the permanent Sofa ramp; a whole Sofa lap with keyboard±1 steering collecting both packs, freeing its dog and hopping to its Hidden; actual Session keep/loss rollback of the dog, pack, raw haul and return leg while preserving ride/seed; crystal actual bite/Stage visibility/expiry/respawn and expiry while far away; Hollow Hidden/base launch and three-step drop comparison; complete Mushroom Cavern collision landings with authored mushroom powers, near-edge contact points and one metre movement reserve; dynamic River receiver landings across12 shared phase times (including all three mover speeds’ extrema), eight legs each, with a metre of movement reserve. River probes advance actual moving/lily solids during flight, reject head collisions and water deaths, allow bounded waits on permanent/moving supports, and require immediate departure from sinking lilies. They use only base jump or one ordinary air jump, with left/right landing choices within each receiver.

These are scripted deterministic code/physics probes. Human full-stage play, continuous River phase coverage beyond the bounded samples, Crystal Echo readability in darkness, and subjective pace/death counts remain unrun. Different-agent review closed the Sofa pending-fade reentrancy finding and verified the section/dog/payer integration. Final PR CI must verify the exact rebased commit.

## Final runtime and integration review

A pending Sofa loss now starts exactly one asynchronous return, even while the fade is unresolved; an actual Session regression and an independent external reproduction verify this. Canonical metadata exposes21 shipped dogs and48 base progress points. Explicit legacy17-dog milestone fixtures remain; the full-campaign fixture remains54.

Real WebGL smoke on ed041d4 passed actual crystal bite/visibility/expiry/collision, Lumi lighting and actual Sofa keep/loss/respawn with ride and seed preserved. A follow-up found foreground Lunchbox occlusion in the Hollow. A local camera profile (height11/dist8.4/ahead2.5) is enabled only inside267..285 below the main path by2m, preserving upper-path controls/framing and restoring the default on emergence/respawn. Six intact/open-entry views at273/277/281 passed conservative feet/torso/head occlusion rays and viewport checks and were visually inspected. No browser errors, Hub calls or external writes occurred; owned Chrome/Vite processes were closed. Evidence: /tmp/nobu-h33-smoke-results.json and /tmp/nobu-h33-hollow-camera-results.json.

The pre-camera current-main full suite passed69 files/694 tests and production build. The camera's focused checks and browser review passed; a final rebase onto H41 main793c4fe preserves Titan, Dust Dash, mastery, vendor and Story exports. Final integrated verification passed71 files/727 tests, production build and diff check on H41 main793c4fe. Human full-stage and natural Golden clears remain unrun.
