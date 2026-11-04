# H41 implementation review

The Titan boss and its independent arena live in `src/bosses/roombaTitan.js`, `src/bosses/titanArena.js`, and `src/levels/boss4Arena.js`. H40 owns `level4.js`; root integrates registry, theme, dialogue and activation only when both candidates are ready. Dust Dash is authored separately under the same H41 integration.

## Specification reconciliations

- Dedicated bosses-spec 5.6 takes precedence over the shorter new-levels arena summary: floor 26×26, walls at ±13, spawn z9, camera (0,12.5,16.5).
- Furniture pillars stun charges in every phase, as explicitly required by both 5.3 and 5.6. Stage-three walls reflect; they do not stun. The shorter attack-table phrase describing TNT/fallen legs does not remove the explicit furniture-pillar rule.
- TNT respawns after the full six seconds. A stage-three charge waits for all three spots to restock, then starts its complete fresh tell. It never resets the cooldown or fires an untold charge.
- The existing vacuum GLB POSITION bounds are x±0.49956435, y±0.31384757, z±0.5. Uniform normalization to height1.8 would produce width2.865, contradicting the six-metre procedural disc and its bumper. Root approved fitting the returned consumer clone to 6×1.8×6, preserving its independently cloned/tinted material. Global Assets transforms remain unchanged. Radius is read back from its final bounding box.
- A radius-three Titan plugs its rear into socket z−12 by reversing its centre to z−9; the socket remains the cable pivot. Cable and ultimate approach their destinations at bounded driving speed before their full tells begin.
- Vacuum ignores an ordinary `chase` option in current main. The arena therefore uses a Vacuum subclass with actual World collision while pursuing; ordinary level Vacuums retain their original patrol behavior.

## Evidence so far

`tests/titan-powers.test.js`: 15 passing focused tests. They cover real arena pickup count, exact geometry, World collision while both side walls push around nearby furniture, rug turn warning, actual TNT damage/radius/cooldown, lighting rollback, consumer model fitting, DDA tells/lane locking, first wall stun, recharge chain, three-reflection bound, suction/bark state, landed leg Solids and ultimate cleanup. The real Player update route jumps and belly flops from 3.8m away at an existing running speed in all three phases, with no paid movement, inside each unextended punish window. This caught and fixed evolved-height collision mismatch and a stunned-top fling that otherwise prevented the punish.

Browser verification and final integrated checks remain pending. State-driven probes do not constitute an unaided fight clear, average completion time, or first-time-player discoverability evidence.

## Browser evidence (isolated real Session, existing art)

`/tmp/nobu-h41-browser-results.json` and `/tmp/nobu-h41-dark.png`: real fallback GLB loaded with final radius3; actual KeyUp/Space/KeyK routes punish each phase at82–83 frames, with mask1, No-Hit retained and no hurt calls. Closing walls move Nobu around the x9.5 furniture leg to (9.448,0,2.098), without hurt or mask loss. The back TNT lure stuns stage3 while preserving No-Hit. A separate unsafe TNT contact at2m, frozen=false/God=false, really consumes the mask and invalidates No-Hit. All three falling-leg Solids appear after their telegraphs. Lights Out sets sun.12/hemi.3, follows Nobu with Lumi radius4, and the lane/LED/fuses remain visible in the inspected screenshot. Phase reset restores lights, walls, stock and HP3. No runtime exceptions. The fixture creates Session directly, never invoking beginAttempt, clear, leaderboard, or reward reporting; it does not constitute a complete integrated Level4 clear.

Independent source review identified a wrong initial Cable Whip warning direction. The warning now matches the initial−60° cable pose, with a focused regression proving the full tell begins after the bounded reverse-to-socket approach. Charge hits furniture using disc-to-AABB distance rather than an expanded square.
