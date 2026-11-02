# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: main
- sha: f88b442
- package: packages/hub-sdk @ 0.4.0-redeem.1
- built with: `npm ci && npm run build` in packages/hub-sdk

Layout matches the previous vendor tree (`package.json`, `README.md`, `dist/*.js`, `dist/*.d.ts`). No source maps are included, and `sourceMappingURL` lines are stripped.

Ticket redeem is `authenticateCustom` (`t:` + ticket, create=false) with the Nakama server key as Basic auth, then `profile.get`. Later calls send only the session token.

The previous vendor tracked hub #25 at 947ed4c, which redeemed without the server key and then called a `session.claim` RPC. The merged hub server registers no such RPC, so every redeem failed and NOBU ran with no hub session: Tickets were not banked and the Cone relic was never sent.

Re-sync this tree whenever hub main changes packages/hub-sdk.
