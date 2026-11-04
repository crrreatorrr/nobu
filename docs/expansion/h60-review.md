# H60 Kennel implementation notes

Source: handoff H60 and rewards §§2.5,5,14,15,17 from source branch `claude/clever-goodall-8221xu` commit `fb95a0a8072ebd02202e4b3d045e4e609b335829`. H11 dependency merged at `7c1697d121afc5fb3f76c38bf43947f9b397b398` before this branch began.

- Thresholds remain 8 / 16 / 24 / 32 / 42 / current shipped total. Current 17-dog content shows only 8 / 16 / all17. Future thresholds remain hidden. Only known shipped dog identities and badges count.
- Existing 17 released dog identities and their migration order remain unchanged. ConedDog additionally accepts explicit local/full ids; authoring helper integration is coordinated separately from shared box-helper ownership.
- Dogs use existing free GLBs and named dance/walk clips, with existing sprite fallback. Yard uses existing title background/light rig, cloned free dogs, a 12x8 grass patch and existing fencePost helper. Low GPU or DPR clamp caps the crowd at12 with a +N panel sign. Full content caps at54. No new media.
- Buddy has no box, solid or interactive callbacks. It follows1.6m behind/.8m sideways, damps normally, teleports at>8m, defers a respawn snap until the player has actually spawned, and hides in arena/competitive/ride/tray contexts.
- Fur helper multiplies GLB body material colors and the Classic fur material. It restores original colors before every selection; accessories, emissive feedback and source templates stay untouched. Trial/board contexts resolve to no tint; remix/rush cosmetics remain available per the detailed Fur contract.
- Static Sniffer rows include only open shipped levels and only missing dogs/Hidden Bones, using registry section/move metadata. No stage build is needed.
- `kennel.goldenSeen` records the one-time Golden scene separately from true-ending `secretSeen`. It OR-merges across tabs. New Game resets it with Kennel progress.
- `kennel.seenMilestones` preserves milestone identities alongside legacy `seen`. This prevents a current-total Golden at17 from hiding the later Fur popup at24 when the shipped total expands. Count-only saves seed flags solely from current earned unlocks up to old seen; flags OR-merge. Thresholds and rewards are unchanged.

Shared wiring (Game/Session/UI/Story/audio/dev/registry) is deferred until H10 releases ownership, and must be completed before PR/merge. No deployment, bank source, balance or movement tuning change. Human 8/16-dog Kennel/Buddy playthrough and three-first-player tuning protocol remain unrun. Automated tests and browser evidence are reported after final integration.
