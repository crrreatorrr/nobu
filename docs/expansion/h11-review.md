# H11: Bone Board and Good Boy %

Implements rewards spec §§4, 5.2–5.3, 9, 14 and the H11 ticket. The shipped registry remains the five existing levels. Their 17 dogs give a 46-point completion denominator; synthetic full-content fixtures prove the eventual 95-point completion and 100-point mastery tracks (200% total).

- Raw Snack potential follows the dedicated §4.4 definition: current static tickets plus the rolled countable Backpack/Zipped Backpack amounts, excluding Mystery. Coconut, Mystery, jackpot and Bark Rock pickups do not enter the numerator. Ticket payouts and scaling are unchanged.
- Gate stats freeze actual breakable/dog counts, raw pickups and deaths before the boss arena. Boss deaths cannot remove a Good Boy result. Checkpoint and Treat Tray rollback restore raw pickups and stable rescued IDs together.
- All 17 existing dog placements have explicit permanent IDs matching H00 metadata. Newly inserted dogs cannot renumber them. Dogs are banked at clear; Hidden Bones are banked immediately, including God Mode. Trials, remixes and rushes cannot change the normal board or dog collection.
- Golden results OR with the permanent legacy Golden map. Bonus boards have three slots and never grant Snack slots. God Mode excludes Good Boy; using God Mode during a run is sticky for eligibility.
- Cyan Hidden Bones use the existing Golden Bone image. Found ones are translucent ghosts. All five current builders have a temporary secret near a reachable existing dog alcove, with TODOs for H30–H33's authored extension placements. The separate idempotent kit helper installer avoids concurrent kit ownership.
- Pause displays saved gold and prospective white icons; map displays saved state. Results stamp new slots in order. H10 owns the later full count-up tally and next-goal hint integration. H51 owns playing the future secret ending; H11 supplies the pure L5+80%-total condition.
- Kennel milestones use 8/16/24/32/42/all and hide thresholds above shipped dog counts. No economic rewards are added. H60 supplies the Kennel scene and cosmetic unlock behaviors.

Verification: npm ci, full Vitest suite and production build. Runtime tests exercise real gate, checkpoint, death rollback, Treat Tray rollback, main-goal/trial-goal routing and hidden pickup persistence/reload. UI tests verify six versus three slots, saved versus prospective rendering, ghost tint and excluded-context building.

Manual verification remains outstanding: complete L1 runs at ≤3/4 deaths and 40/60/80% pickups, human movement/controller playthrough, and collection/quit without completing through gameplay. Initial isolated Chromium WebGL attempt stalled while another software renderer was active; no successful browser result is claimed from that attempt. Browser retry is serialized after the other agent's GPU check.
