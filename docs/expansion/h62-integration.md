# H62 integration contract

Core snapshot is based on main c4d6c547. Shared Game/Session ownership remains with H46 until explicitly released. This document records the exact remaining integration; it does not claim complete H62 acceptance.

## Coordinate contract

Track's physical `toWorld`, `project`, `right`, `groundAt` and body.u stay physical. The optional mirror reflects the original quantized centerline about its initial x. `authorU`, `authorToWorld`, `authorRight`, `authorYawOffset`, and `authorWallAt` convert authored values exactly once. Kit.W and other authored consumers use those adapters. Already-world positions, zipline endpoints and physical clamp results never convert twice. All source builders remain unchanged.

## Shared integration to implement after release

- Session constructor: normalize mutually exclusive modes through `sessionModes(opts)` and validate remix with `remixAvailable(save.data, this.def)` before starting any attempt. Store `remix` before constructing Stage/Kit; this enables their opt-in adapters/filter. Retain ordinary Hub attempt/carry, canonical field pickup caps and lives.
- Session start: retain local dogs/countables and standard checkpoint rollback. Do not run trial setup, replay LEVEL_INTRO or ability tutorials, or add Buddy. Use a centralized story string for the remix banner. Explicitly reject Freeze collection/construction for remix as future builders land.
- Boss gate/main goal: capture `remixGateResult(stats,{remix,trial,rush,god:save.data.godMode,godUsed})` after `_recordLevelStats`, before missed-backpack rain. Keep boss fights. Do not recompute the field result from the boss arena or subtract boss deaths from it.
- Defeat/goal: branch to dedicated `Game.remixCleared(session)` before any ordinary clear logic. Use `applyRemixResult` with completed=true and sticky God use; bank canonical earned Tickets once, write once, and show a single-bone remix completion panel. Never call original rescue/Queen ending/story, setBeaten/setBestDogs, dog census, unlocks, normal bone board, Perfect, boss medals, trial submission or Cone relic report.
- Interactions: reject `Game.collectBone` and `Session.secretWarp` while remix; preserve local dogs/countables. Normal Hidden/Mystery/Buddy exclusions already use reward context. Mystery replacement must preserve authored countability: default true stays true; explicit false stays false.
- Map: opt-in normal/remix toggle only after Queen and only for actual shipped numeric main definitions. Remix nodes show their single saved bone; no trial launch from remix view. UI and restart/continue preserve current mode; quit/game-over never award.
- Every visible string belongs in story/script.js. Reset the map mode when unavailable or a bonus/meta node is selected. Stage clones theme/filter settings, so leaving a remix restores normal rendering without global renderer mutation.

## Policy decisions

Root resolved retained boss fights from boss-system1.6, and ordinary Ticket/life banking from the absence of any economy removal in the owning spec. No currency is awarded for a Remix bone. Root resolved the cross-context God ambiguity using the explicit mastery exclusion in box-gauntlets4.6: sticky God use voids Remix Golden while ordinary God Golden/Hidden/Snack rules stay unchanged. Gate death count does not disqualify the same Golden countable/dog rule.

## Remaining acceptance

Actual L1–4 builders are paired at every countable, dog, static Ticket and World solid. H45/H50 actual L6/L5 builders are not yet integrated, so the all-six-main claim remains blocked. River force/mount/slick/DriftLog reflection requires H45 file release. Actual Session/Game completion/retry/quit/save integration tests, full suite/build, independent review, and the specified assisted L1/L2 chase + full Golden browser evidence remain required. No GPU/manual play evidence is implied by CPU geometry tests.
