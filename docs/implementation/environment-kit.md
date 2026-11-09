# Environment kit implementation notes

Source contract: expansion handoff H04c and new-levels-spec sections 1.2, 1.14–1.18, from source branch `claude/clever-goodall-8221xu` at `fb95a0a`.

- `ChaseCat` injects the original CatRig into `Chaser` with the original 6.7 base speed and whole-level lifecycle. The shared `CHASE_TUNING`/`chaseSpeed` export also drives the audit. The audit remains a feasibility approximation, not an input recording; coconut pit intervals are supplied separately as `pits` alongside `blocked` logs/pits.
- Segment chasers own their checkpoint reset and camera. Inactive later segments cannot override the active segment's camera during reset. Generic pursuers have no collision Solids.
- Raised `kd.floor` requests become short Solid slabs along the spline. They never create track spans above the main floor. Detour position helpers offset both endpoints of ziplines and nested switch-platform heights.
- `kd.returnLeg` marks the following return platforms during authoring, as in the Top Shelf and Order Book examples. Outbound platforms do not activate its camera. `kd.exit` records an exit; the authored zipline, chute, bridge or lift supplies the physical return.
- Downstream detours require a permanent walkback route; chase, ride and raft stretches require loops. Raft/auto-scroll authors register `{d0,d1}` bounds in `stage.raftStretches`/`stage.autoScrollStretches` before the first update.
- New-levels-spec 1.16 explicitly specifies ordinary falls from sky detours. L6's Rain Gutter also permits landing back on the barge or dying in the river. Extended-levels-spec 1.5 instead requests return-to-entry with collection rollback and no lost life. The shared helper follows its owning new-levels contract. H30–H33 must implement the extension-specific soft-fail return and snapshot rollback rather than treating this as a waiver.
- Sections retain canonical `{d0,d1,name,detour:true}` metadata. A distance-only section query cannot distinguish a sky detour from the overlapping main path; progress/hint consumers must also consider the player's physical branch.

`T.environment()` loads the dev strip. `T.at(18)`, `T.at(80)`, `T.at(120)`, `T.at(155)` and `T.at(184)` visit the coconut chase, detour pipe, darkness, side camera and rising climb. The detour checkpoint and return zipline exercise ordinary Session rollback and return framing.
