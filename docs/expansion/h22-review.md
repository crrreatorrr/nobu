# H22 Big Cat powers review

Source: H22, bosses-spec §§0/1/3/9.2, expansion plan §7.3. Based on main09e0e2a (H20). Owner choice remains full restart at stage1. ChaseCat and the level2 chase builder are unchanged.

## Owner decision before merge

The stage2 attack catalogue and CHAINS table specify claws→pounce and tailspin→cough, with chainLen2. The literal pool in §3.3 adds the chain token only at stage3. Those instructions conflict.

`CAT_STAGE2_CHAINS=false` in catPowers.js currently follows the literal pool. Stage2 draws pounce/cough/yarn/dot/claws/tailspin/table as specified; its defined combos are not randomly selected. The tested alternative sets the flag true, adding one stage2 chain token and enabling the two stated combos. Each attack retains its full tell, and only its recovery pause is skipped; the shared H20 half-second damage grace and punish/ultimate exclusions still apply. Every constituent attack counts toward the existing pounce-opening guarantee. Stage2 tables, scratches, ledges, double pounces and all stage3 behavior are unchanged by this choice.

Recommendation: enable the specified stage2 combos, matching both its chainLen2 tuning and attack catalogue. The owner must choose before this flag changes or H22 merges.

## Resulting behavior

- Laser Pointer traverses four waypoints, alternating3m sideways, with the final target at Nobu's exact position even in the outer edge band (the explicit §3.7 rule takes precedence over the generic side-waypoint11.5m clamp). Two pounces each keep a complete clamped tell and lock for the last.3s. A missed final landing becomes dizzy; a wall landing beyond10.5 gains.6s.
- Table leaps use the two back ledges. Three/four falling objects include exactly one lit TNT. Other objects become non-countable zero-Ticket backpacks. TNT uses the specified2.3m explosion; new TNT targets stay at least4.6m from active TNT. The landing return has.8s lag and no vulnerability.
- Claw waves leave3s segment scratches along their actual paths. Stage2+ frenzy landings leave four2.5m scratch rays; stage3's final pounce creates a ghost replay.
- Stage3 hits replay the last pounce after1.5s, capped at two cyan ghosts. Targets conflicting with the real pounce marker delay by.5s. A faint additive silhouette follows the cat with.15s positional lag.
- Optional catnip grows6–9m from the cat on permanent floor. A bite gives8s of1.25× speed and2× dizzy duration; the next bush waits20s from use. Catnip, ghosts, dot, table objects and arena state clear on retry.
- Arena geometry has a permanent21×21m centre and exact2m edge coverage, with no hidden outer slab. Rectangular ring tiles warn for1s at stage3 entry, then drop.6s after occupancy and return4s later. Two4×2.6m ledges rise to2.4m over1s and remain raised in stage3. Pit plane is-6. Three phase sphere positions and seven raw field Tickets are explicit.
- All actual tells use Boss.tele, including stage tuning, DDA15% and the.4s floor. Cat-only M2 values and Story/audio were integrated serially by the parent; Bird/Cone tuning remains separately owned.

## Verification

Focused tests cover exact ring area/coverage and absence of overlapping outer ground, safe permanent floor beyond tailspin reach for a grid of edge boss positions, moving ledge/ring reset, actual arena construction, dot locks and wall bonus, all tell callsites, table payloads/TNT spacing, ghost snapshots/conflict delays/caps, catnip timing, exact punish bonuses, and both stage2 pool alternatives. All new content uses existing assets/procedural placeholders; no GLBs/images/audio media or vendor changes.

npm ci passed. An intermediate full run passed47 files /508 tests with maxWorkers2 and production build passed. The final focused17 Cat tests pass after added ghost-flight safety, exact edge targeting and actual frenzy/defeat coverage. Final full-suite/build and independent review are pending. ChaseCat and buildLevel2 bodies were compared byte-for-byte with09e0e2a and are identical. Human fight playthroughs are unrun: visual readability, discovering the wall bonus by accident, catnip feel and an80-second Speed-target run are not claimed by unit tests. The automated geometry checks do not replace those manual checklist items.
