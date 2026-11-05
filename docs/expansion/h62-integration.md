# H62 integration and evidence

H62 is rebased onto H50 main `e311f5f54b6c4ee684799788b0b87b500a63c672`. All six shipped main levels now have actual normal/Remix builder pairing. The union retains H46 Gauntlet claims and music, H51 early ride/Sofa returns, H63 Rush and map input, H45 loading/dialogue/rain ownership, and H50 Queen lifecycle, camera/backstop, trial Freeze consumption and Pipeline route fixes. CPU evidence and browser/manual limits are distinguished below; no deployment or public-board activation is included.

## Coordinates and difficulty

Physical Track `toWorld`, `project`, `right`, `groundAt` and body.u stay physical. Remix reflects the quantized original centerline about its initial x. `authorU`, `authorToWorld`, `authorRight`, `authorYawOffset` and `authorWallAt` convert authored values once. Kit.W, asymmetric banks, movers, forces, detour helpers and authored consumers use those adapters. Already-world positions and physical projections/clamps never convert twice. Normal authoring stays unchanged.

Ordinary enemies use authored movement speed multiplied by `TIER.enemySpeed[min(5, baseTier + 1)]`, interpolating fractional indices. This is one absolute lookup: base5 targets5 and applies1.32. Ordinary non-Remix and boss multipliers remain1. Player movement, Chaser/calibrated hazards, telegraphs and box/market clocks retain their authored tuning. Dust Bunny half-flee displacement uses the same multiplier while its clocks and physical clamps stay unchanged.

## Modes and rewards

- Session validates mutually exclusive modes and Queen unlock before starting an attempt; `remix` is stored before Stage/Kit creation. Theme/filter settings are cloned per stage, leaving ordinary themes unchanged.
- Remix retains local countable backpacks/dogs, required detours, standard checkpoint rollback, lives and canonical field Ticket banking/caps. It has no Buddy, DDA, Freeze Packs, Mystery rewards, replayed level intro or ability tutorial. Plain replacement backpacks preserve the source's actual countability.
- Boss gates snapshot the Golden candidate before missed-backpack rain. Boss fights remain; L6 retains its goal. Only completed boss/goal settlement can award the separate `remix[id].golden`. Boss deaths do not change the field snapshot. The bone itself grants no extra currency.
- Session owns the single save/bank; Game only presents the result. Remix never writes original dog census, bones/boards, bests, unlocks, colored/Hidden rewards, Perfect, boss medals, trials, Cone relic, rescue/ending/story or secret-ending progress. Warps and colored pickup writes are rejected.
- R / RT toggles the map after Queen for shipped numeric main levels. Remix shows its single bone and suppresses trial/Gauntlet entries. B/back, RT slide in play and G/RB Gauntlet priority remain. Restart preserves mode; quit/game-over never award. Visible copy is centralized in story/script.js.

Retained boss fights follow boss-system1.6. Canonical economy/lives remain because the owning specification does not remove them. Sticky God use voids Remix Golden under the explicit mastery exclusion in box-gauntlets4.6; ordinary God Golden/Hidden/Snack rules stay unchanged.

New Game clears Remix bones. Rewards-spec1.5 explicitly retains trials, trialsClassic, bossMedals, perfect, rush and trial Platinum, then says “Everything else is cleared.” That narrower enumeration controls over the general mastery wording. Normal reload/tab merging still unions earned Remix bones until New Game.

## Lifecycle union

Named `ownsAsyncLifecycle` and `isPipelineSession`, lifecycle epoch and Queen timer/intro/evolution/dialogue waiter cancellation are retained. Their owned-transition machinery includes Remix additively, preserving ordinary Bird/Cat restart-at-stage1 and other legacy behavior. Defeat/goal records the completing stage/epoch; retired direct or delayed settlement cannot bank, award or change UI. A valid committed bank settles once even if the user leaves afterward.

Actual Player death regressions cover abandonment before the card, after its delay and during the fade, stale stage/entry, direct respawn and live checkpoint economy. A registered G1 builder/Player death followed by actual Game.toMap verifies that the old retry cannot change a replacement wallet, lives, player or UI. Owned Remix loading cancellation cannot hide a successor overlay.

Independent review closed two integration gaps: result presentation now clears its preceding black fade, verified with actual UI DOM in boss and goal paths; interrupted phase transitions now clear Remix retry busy/cinematic state, verified with actual retained bosses1–5. The selected Bird/Cat retry-at-stage1 policy is asserted. The focused lifecycle/mode batch passes73 tests across four files. Old fixtures now provide the real Session.boss identity instead of bypassing the new guard with an unrelated dummy boss.

## Actual geometry and consumer evidence

L1–4 pair every countable, dog, static Ticket and World solid. L6 pairs48 countables, seven stable dog IDs, retained Tickets, World AABBs and support queries. Its optional Moon well and10 optional Tickets are omitted by source design; tests exclude only exact ordinary Moon actor/solid references, never Golden content.

L5's new16-case file pairs44 countables, seven stable dog IDs, all retained Tickets, non-Moon World AABBs and support queries. Normal Moon housing/ledge/Hidden omissions use exact references. Both countable detours, timing enclosures, shutters and all required route actors remain. Additional cases verify actual PumpStone landing/rise/carry/dump/recovery and Order Book base+10 once; MarketClock phases/deltas; all three any-tile Rug triggers/collapse; actual World→Player shutter contacts, checkpoint state and retirement; Order Book fall/respawn/reentry/descending-line docks; actual side-camera/input basis and physical backstop framing.

The positive authored-bank decor cutaway remains D376–460. The callback receives authored x, while CamZone reflects camera side; no second sign flip is applied. Forty finalized actual camera-to-body rays pass for normal and mirrored views at D391/400/428.49/435/444 across four decor branches. Seeded helper anchors and candle meshes pair. Internal pipe-elbow/cone art chirality and symmetric vat-leg ordering are not claimed to reflect point-for-point; these cosmetic differences introduce no blocker in the tested sightlines or collisions.

River adapters pair Whirlpool centers/swirl, Outflow banks/forces, Slick bands, DriftLog trajectory/AABB/carry, boat spawns, seeded barrel lanes and off-center loop panels/returns. Actual Player/World raft force probes use a curved nonzero-x fixture. Physical checkpoint projection/clamping stays unchanged. The river batch passes34 tests across five files, including nine added paired cases and legacy regressions.

Independent mirror review additionally ran20 actual-six/river/enemy/filter checks and approved the L5 test oracles. These are separate reviewer results, not a second authored full-suite run.

## Final validation and remaining limits

The rebased scoped core/legacy batch passes123 tests across13 files; the integrated L5 file passes16/16. On code/test commit `ec4a6bc`, `npm test -- --maxWorkers=1` passes all137 files/1377 tests in383.22s, and `npm run build` passes with208 modules. `git diff --check` passes. Independent lifecycle review separately passes104 scoped checks, including actual boss retries, DOM result fades, retired transitions and Sofa returns; mirror review separately passes20 scoped checks and approves the L5 test oracles.

Browser evidence remains pending on this source freeze. CPU collision and sightline checks do not imply browser rendering, human readability, all starting phases or an unaided continuous whole-level Golden run. Required browser/manual observations and any unrun items must be reported in the PR. Root owns final PR/merge and exact-head CI verification; H70 public variants still require the separate owner Hub deployment.
