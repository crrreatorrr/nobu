# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: main
- sha: 6d7176f
- package: packages/hub-sdk @ 0.4.0-redeem.1
- built with: `npm ci && npm run build -w @metaverse/hub-sdk`

Layout matches the previous vendor tree (`package.json`, `README.md`, `dist/*.js`, `dist/*.d.ts`). No source maps are included, and `sourceMappingURL` lines are stripped.

Ticket redeem is `authenticateCustom` (`t:` + ticket, create=false) with the Nakama server key as Basic auth, then `profile.get`. Later calls send only the session token.

The previous vendor tracked hub #25 at 947ed4c, which redeemed without the server key and then called a `session.claim` RPC. The merged hub server registers no such RPC, so every redeem failed and NOBU ran with no hub session: Tickets were not banked and the Cone relic was never sent.

9ce6ade also keeps a queued write on a closed session from failing every later `init`. The same player's next session for the same game re-sends it; a row no live session can carry stays queued instead of rejecting init.

Re-sync this tree to hub main whenever packages/hub-sdk changes. Hub main includes the 9ce6ade outbox fix and `tidebreaker_belt` in `RELIC_IDS` (b065668), so the earlier local patch is gone.
