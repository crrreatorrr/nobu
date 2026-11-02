# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: cursor/ticket-redeem-custom-auth-c054
- sha: 947ed4c
- package: packages/hub-sdk @ 0.4.0
- hub PR: https://github.com/crrreatorrr/metaverse-hub/pull/25

Layout matches the previous vendor tree (`package.json`, `README.md`, `dist/*.js`, `dist/*.d.ts`). No source maps are included.

This tree tracks hub #25 at 947ed4c. Ticket redeem is custom auth. Later calls send only the session token.

Merge the game PR only after hub #25 merges. If that sha moves, re-sync this vendor to hub main.
