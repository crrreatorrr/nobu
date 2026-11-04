# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: claude/kind-bardeen-h2fhj8
- sha: ee187cf
- package: packages/hub-sdk @ 0.6.0
- built with: `node scripts/vendor-sdk.mjs`

Layout matches the previous vendor tree (`package.json`, `README.md`, `dist/**/*.js`, `dist/**/*.d.ts`, now with the `dist/realtime/` folder). No source maps are included, and `sourceMappingURL` lines are stripped.

Ticket redeem is `authenticateCustom` (`t:` + ticket, create=false) with the Nakama server key as Basic auth, then `profile.get`. Later calls send only the session token.

The previous vendor tracked hub #25 at 947ed4c, which redeemed without the server key and then called a `session.claim` RPC. The merged hub server registers no such RPC, so every redeem failed and NOBU ran with no hub session: Tickets were not banked and the Cone relic was never sent.

9ce6ade also keeps a queued write on a closed session from failing every later `init`. The same player's next session for the same game re-sends it; a row no live session can carry stays queued instead of rejecting init.

Re-sync this tree to hub main whenever packages/hub-sdk changes. Hub main includes the 9ce6ade outbox fix and `tidebreaker_belt` in `RELIC_IDS` (b065668), so the earlier local patch is gone.

0.5.0 adds what the trial board needs: `submitScore` no longer drops unranked submits (the server decides) and resolves a `ScoreResult`, and the optional `getLeaderboard` reads `leaderboard.top`. NOBU's score queue (`src/hub/scoreQueue.js`) keeps a row when `submitScore` resolves nothing, so an older tree degrades to "queued", and the map hides the world record when `getLeaderboard` is missing.

0.6.0 adds the `sproto-arcade` game id, the `breakwater_coin` relic id (it unlocks NOBU's Wizard Hat II; older trees dropped it from `profile.relics`), and the optional `loadSave` / `writeSave` cloud-save calls, which NOBU does not use yet.

After the hub PR merges, re-vendor from hub main. Only this header changes if packages/hub-sdk did not.
