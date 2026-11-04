# H40 Laundry Day implementation and review

The builder remains unshipped until H41 supplies the real Roomba Titan and arena.

## Approved Boiler corrections

| Authored item | Literal recipe | Tested proposal | Evidence |
| --- | --- | --- | --- |
| Rest before the final relay | Arrow at `(0,11,438.2)` | Plain permanent Lunchbox at the same coordinate; retain the arrow at `(0,12.6,441)` | The preceding held bounce and following held jump land on the actual solids. This splits the long timing sequence within tier 4's eight-action limit. |
| Final FallBox warning | 0.35 seconds at `(-0.6,12.6,447.8)` | 0.40 seconds | Meets tier 4's minimum warning without changing movement tuning. |
| Boiler pity checkpoint | `(0,0,409)`, unsupported | `(0,0,407.5)`, on the existing floor | Actual `PitySnacks.arm()` and `hit()` store this checkpoint; its collision body settles safely on respawn. It remains before the water trigger at408 and3m before Arrow1. No new platform is added. |

The literal Boiler route fails four timing/rest checks, and the literal pity checkpoint has no support. The explicit fourth argument `{corrections:true}` instantiates the tested changes. The owner approved all three corrections; they are now the default. Actual built geometry and track heights pass the corrected tier 4 reach, landing margin, moving-window, warning, rest and checkpoint-support checks.

## Cereal timing requirement

The literal Cereal gap can be crossed using already-owned Double Jump and Glide. A bounded8m/s flight at lateral3, from345.5 to366, with the second jump at0.45s, crosses in actual `World/moveBody` without a head contact or intermediate landing. This contradicts the recipe's “no other route” wording. It does not bypass countable backpacks: there are none in this pattern.

The owner requires timing boxes and explicitly authorized the necessary local geometry. A sealed cabinet now retains all five authored box placements, while a cutaway roof, filled cross-baffles, side panels, an upper end closure and raised exit threshold block the complete flight shortcut. An ordinary roof alone is insufficient because the nearby green-bone shelf at343.5 is6m high; the upper end closure also blocks that roof approach. No player moves are disabled.

## Specification reconciliation and local fixes

The dedicated box spec's Golden Bone rule9 prohibits economic Ticket lines over timing pits. Those Cereal/Boiler guide lines and arcs now use non-paying `guideArc` markers. The two bounce-chain backpacks still pay one raw Ticket each. The final downward zipline's five Tickets remain after the timing boxes.

The literal left alcove permits walking around its Dust Wall at lateral-6.65. The root approved a local Hidden Bone collection lock tied to that specific wall's broken state. While locked, the bone is grey/translucent and visibly caged. All collection methods reject until Dust Dash contact opens that wall. This changes no global Hidden Bone or Dust Wall contract. Actual collision checks show the existing right Bark Rock blocks all sampled player-width approaches, so its authored position remains unchanged.

The first assisted browser run exposed foreground occlusion at the Laundry exit shelf and left Dust alcove. Scoped track-camera zones address those views, preserving the input scheme and restoring the original camera outside each area. Exact final camera values and bounded visual recheck evidence are recorded below once verified.

## Actual tally and scope

The imported, Git-verified `new-levels-spec.md` section3.12 contains the corrected tally. Built entities contain60 countables: main48, Top Shelf5 and Pantry7. There are seven stable dog IDs: `4:corgi-a`, `4:pug-a`, `4:dalmatian-a`, `4:shiba-a`, `4:corgi-b`, `4:dalmatian-b`, `4:shiba-b`. Built track length is492.772m. The explicitly permitted132.5m checkpoint gap is preserved.

Actual payer maxima after guide conversion: field121 raw, packs192, Zipped14, Good Boy15, Bark15, three Mystery slots at9 raw each, zero Trampoline. Reserving7 arena raw gives391 raw, or130 whole; the existing separate Coconut allowance adds15 whole, for a maximum145 whole against the independently fixed approved cap184. Adding121 raw to the actual entity list produces185 whole and fails the guard. The literal recipe before guide conversion measured152 whole. No cap grows automatically.

Iron, SteamFan, Dust Bunny splitting and ambush add no Ticket payers. Oranges remain actual CoconutRoller instances. Cookie Jar entry/exit remain TreatTray instances, and ordinary bonus-round payers are measured. All new visuals are procedural placeholders; no new media or vendor changes were made.

H41 supplies `src/levels/boss4Arena.js`, exporting `buildBoss4Arena`, with at most7 raw arena pickups. Registry activation waits for the real boss and arena. The root supplied the actual Level4 theme, tutorials, green Bone palette and an eight-bar synthesized score at112bpm.

## Verification

On source commit `d2188be`:

- `npm_config_cache=/tmp/nobu-npm-cache npm ci`: passed.
- `npm test -- --maxWorkers=2`:58 files,583 tests passed, including16 new Laundry tests.
- `npm run build`: passed,120 modules, with the existing bundle-size warning.
- `git diff --cached --check`: passed.

The level remains unshipped, so production intentionally does not import its builder. Vitest imports and executes the actual builder and all local helpers. Physics checks cover moving drum boarding/riding, both drum exits and the high rescue shelf, Top Shelf's outbound jumps, both toaster launches, candidate Cereal/Boiler receiver geometry, timing windows, checkpoint support, rising-water margins/reset, payer caps, Dust locking and chase stop budgets. These are feasibility proofs, not full input recordings.

The first bounded assisted browser run used a clean profile and actual Stage4 plus the builder, with no registry activation or fake boss. Runtime drum carrying, zipline grab/progression and locked Dust rejection passed. Page errors, console errors, banking calls and attempted external writes were all empty. Chrome and Vite were closed immediately afterward. Evidence: `/tmp/nobu-h40-browser-results.json` and `/tmp/nobu-h40-{drum,clothesline,ironing,cereal,dust,boiler}.png`.

First-time human playtests, a complete controller route and a one-run Golden Bone clear remain unrun. Assisted freeze/teleport screenshots do not establish those acceptance criteria.

## Review fixes and final assisted browser recheck

Independent review identified the unsupported literal pity checkpoint at409. The explicit corrections candidate now relocates it to407.5 on existing permanent ground. The actual browser path `arm → hit → Session.respawn → 30 ticks` produced checkpoint407.49986, a grounded normal player and zero vertical drop. The owner subsequently approved this correction, and it is now the default.

The final framing is track mode with unchanged camera-relative controls: Laundry58–105 uses height6.5, distance6 and ahead4.2; alcoves379–393 use height14, distance3.5 and ahead2.5. The Dust Wall requires a steep view because the ordinary camera's lateral follow looks through it. Actual finalized-geometry raycasts find no opaque obstruction to the player's pose, its head/feet stay within viewport bounds, and both zones restore the original default options on exit.

The final bounded browser recheck visually confirms Nobu and the route at86.5, and Nobu plus the locked cage at385. Positions106 and394 restore the default height4.3/distance8.6. Drum carrying, zipline progression and locked Dust rejection also passed again. Page errors, console errors, banking calls and attempted external writes remained empty. Chrome and Vite were closed; the root was explicitly notified that the GPU was released.

Evidence: `/tmp/nobu-h40-browser-recheck-results.json`, `/tmp/nobu-h40-clothesline-fixed.png`, `/tmp/nobu-h40-dust-fixed.png`, `/tmp/nobu-h40-laundry-exit.png`, `/tmp/nobu-h40-alcove-exit.png`. The recheck uses the explicit candidate flag and assisted positioning, and does not activate the registry or pretend a boss exists.


## Sealed Cereal lane: tested contract

The owner required timing boxes and approved necessary local geometry. All five timed boxes keep their coordinates, timing and behavior. The cabinet is built in `src/levels/cerealLane.js` from real built box heights. Small lateral collision tiles follow the curved track; a single wide rotated AABB would falsely extend the cross-baffles along the path.

The roof is a visible cutaway surface, with full side/end closure protecting the approach from the green-bone shelf. Baffles hang to each original landing corridor. The final exit threshold is2.8m above the final BlinkBox's standing surface, reached with the existing Double Jump; its roof clearance is1.5m. The existing floor and dog behind the exit retain their positions. A Story-owned DOUBLE/JUMP sign marks this launch. The case has no ability overrides, hidden progress lock, economic payer or new media.

A complete real Player route lands all five live boxes and the exit using actual shared clocks, falling-box timers and the moving landing, without intermediate teleportation or freezing. Thirteen consecutive starting offsets spaced1/60s apart pass, exceeding the tier4 twelve-frame requirement, and the same route passes with trial timing. Separate geometry checks isolate lit receiver shapes. The original unsealed recipe is retained as a negative comparison.

With every timing box physically disabled, an adversarial World sweep tests27 earned-move Glide/Zoomies cases and1,260 late-jump/Crown/air-dash combinations. None cross the sealed lane. A high approach from8m with Moon-strength launch and extra air jumps also fails; removing the upper end closure makes that roof shortcut succeed, proving the closure is the relevant protection. Walking back from the roof reaches the existing entry floor safely.

Evidence: `/tmp/h40-cereal-bypass-search.json`, `/tmp/h40-cereal-live-route.json`, `/tmp/h40-cereal-input-window.json`, and `/tmp/h40-cereal-player-route.json`. These are simulations; the final sealed-cabinet browser check and independent review remain pending.
