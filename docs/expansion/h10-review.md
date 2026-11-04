# H10: Chomp Chain, tally and one next goal

Integrated against H11 merge 7c1697d. Session, HUD, map/pause hints and the Game results controller preserve the actual H11 Bone Board banking and ordered fresh-array APIs.

The combo uses a 1.1-second grounded clock (Roomba riding also advances it). Airborne time and transitions pause the clock. Countable breaks and defeated enemies increment independently, including same-frame explosions; partial Zipped Backpack bites only refresh. The reward is one noncountable Blue Sphere per checkpoint/life, without any Ticket multiplier. Death/respawn and round/gate transitions end the combo. Drop sequence IDs allow lost-tray rollback to remove only its spawned spheres, while respawn removes all chain drops. Best chains and chain-15 badges bank only on eligible clears.

The tally is one deterministic game-time timeline, with no delayed reveal callbacks: backpacks, dogs, Tickets, Best Chain, saved board silhouettes, new stamps, typed hint, Kennel notices, continue prompt. Its rendering and sounds can be advanced silently to the final frame after the first complete viewing. H11's fresh stamp array and banking contract are retained.

Session initializes Mystery runSeed once per new run and never resets it during checkpoint/death/tray rollback. The optional onCheckpoint entity hook snapshots partial breakables; Mystery is excluded. A flop snapshots its targets so newly spawned rewards wait for the next action. H12 owns the matching partial-entity lifecycle implementation and cross-branch payout verification.

All current level builders share numeric section rows with registry metadata; labels live in story/script.js. Stable dog labels are verified against their real current distances. Hidden metadata describes H11's temporary current placements, all ungated; extensions must update both the placement and metadata. Main and overlapping detour sections are distinguished by entity context.

Map hints only use durable data: last recorded breakable misses plus permanently known missing dog IDs. The save does not retain deaths or raw Snack ratios, so map fallback copy states a missing goal without claiming an invented last-run performance. Names are bounded to 40 characters and 12 section keys. Normal run/pause/results hints can use actual live or frozen stats.

Tests cover grounded/airborne/ride clocks, same-frame hits, refresh and reset, drop limits and suppressed contexts, real BlueSphere placement and scene removal, max records/badges without Ticket mutation, original/default sound pitch and explicit combo pitch, section coverage and dog/hidden alignment, one-hint priority and conservative saved-only hints, and DOM count/stamp/skip rendering.

Independent review found and fixed the time-trial results route: trialDone uses a distinct completion mode, clears any old tally, and keeps the existing 2.3-second continue guard. Regressions exercise both trial-first and normal-tally-then-trial ordering. God Mode hints describe the missing eligibility requirement, including sticky God Mode use earlier in a run.

Browser-assisted Chromium/SwiftShader verification passed on the integrated runtime: eight actual authored L1 Backpack breaks produced HUD x8 and exactly one chain sphere; actual Session respawn reset the chain and removed the drop without changing the seed. First tally input was ignored until completion, a repeat tally skipped to the final frame, the main board had six slots, actual trialDone after a tally kept separate trial state, and eight breaks in an actual trial build displayed x8 with no sphere. No page errors were recorded. Evidence: /tmp/nobu-h10-browser-results.json and /tmp/nobu-h10-tally.png; screenshot visually checked. Browser and dev server closed afterward.

These were assisted entity/runtime probes. Natural keyboard/controller L1 chain-eight, death through gameplay, complete level/rescue/rain sequencing, and a human trial playthrough remain unrun. No human movement/controller playthrough or first-time playtest is claimed. No new media, vendor changes, deployment or permission changes.
