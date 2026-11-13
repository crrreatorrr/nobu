# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: claude/account-progress
- sha: dbbf398
- package: packages/hub-sdk @ 0.8.0
- built with: `node scripts/vendor-sdk.mjs`
- iife: dist/hub-sdk.iife.js (global HubSDK; classic script, not a CDN import)
- iife sha256: c0ea77abad144abfd8f01d8f21c29b5e1d869bfcb4462db318ea3982f591aab4
- source src/createHubSdk.ts: 4ae184ef8b4a6e97192769a4118ea855fcd4463176ee7bac295a884e449ebcdf
- source src/env.ts: c3a8eb38ea73539fa4d971da705e004355bed8258079a73a2ecbda912c35ef46
- source src/errors.ts: 4eaba836a4dfad994b3926d90b66a158c4384ce6f100bf8a0791877c0646b541
- source src/events.ts: 584d264acb48d7e63746bc63b56767577dd4370a0b5fbdf4ddd73fc0fd2b9f64
- source src/feedback.ts: 3ee200cafc7d07ca4b0c995a56a0d3ef5a6046e262fc62c7aef0bb903e83cf67
- source src/index.ts: b7db97e20962db7bdfc123f539af28a47e109062cf5ed74a374e09ef4b3cd457
- source src/live.ts: 9272fe0acd8c0b8171028f163df42f7e9545408d28194da7de19e037f0417527
- source src/nakama.ts: 67a701b47178244f1a63b433f8d715aea824b1599a49f140b35b401950ee266a
- source src/pageShot.ts: 8e562aa07991d5b716d9f83aa2f659dbd43782b5b6e063d411895f52dfc84af9
- source src/pbShop.ts: 3bbeff5bcf3b6e2c724409eadce9907432e1e52b02988938ff5e6f2ebdfe0faf
- source src/progress.ts: f091cbd4d2dc7326e1da99a3198a681fe6fac7a6015f4b65d6919ee1a31f4b95
- source src/realtime/chatRules.ts: 26913facb5c4c28c0a3529a4ecb6a3a50fadfe067736c74fb571184a9aa81b0e
- source src/realtime/client.ts: 09b799cc261ae06eb36a3141722e7752b603c58eac66fdb2b2a4f88f4ae08b79
- source src/realtime/friends.ts: d2b309fca509ab6e46def7d4be20e470d7d932f6eacef63287ce7697225f86ef
- source src/realtime/mock.ts: e476f22d8c78c0b1e0dc5cb0e7fc553bfd3534dd22d45920aeb903c8dfa049a7
- source src/realtime/protocol.ts: 9f25c52103c82110eb518043395fed92a71f5c713f70c6e7369072ce988ea14e
- source src/realtime/types.ts: dc8a6a5f62c5e0f2874819a79dd473b5b41b3cbdb29aad8bfd2a0fc4687734cf
- source src/save.ts: 098fb0a6834e43bdad620c2729b0abf28a9551b8c4ab8cc7cb3428ebba8aea98
- source src/storage.ts: 7a1f52e2f432026590ed99e85c318ea21ef10c6fe83b9e0c1ebe8c173ced5344
- source src/third_party/modern-screenshot.d.ts: 22372ef230b98655ee2597c8c741d75e397405f22dbb5c2f45521e6fe9950056
- source src/third_party/modern-screenshot.js: c1d44ba7cf8a296754c7013a12c79266235550b0564d17487a76e006f8472721
- source src/ticket.ts: b01e1635c7031dd0e6855ecb22b99af1654395c41f0296863b627a31ded41033
- source src/types.ts: 90b551a3fe2b4e85f81b82bc7c9c1909654715f2a45a85cb7d683f6f05d309ab

Layout matches the previous vendor tree (`package.json`, `README.md`, `dist/**/*.js`, `dist/**/*.d.ts`, now with the `dist/realtime/` folder). No source maps are included, and `sourceMappingURL` lines are stripped.

Ticket redeem is `authenticateCustom` (`t:` + ticket, create=false) with the Nakama server key as Basic auth, then `profile.get`. Later calls send only the session token.

The previous vendor tracked hub #25 at 947ed4c, which redeemed without the server key and then called a `session.claim` RPC. The merged hub server registers no such RPC, so every redeem failed and NOBU ran with no hub session: Tickets were not banked and the Cone relic was never sent.

9ce6ade also keeps a queued write on a closed session from failing every later `init`. The same player's next session for the same game re-sends it; a row no live session can carry stays queued instead of rejecting init.

Re-sync this tree to hub main whenever packages/hub-sdk changes. Hub main includes the 9ce6ade outbox fix and `tidebreaker_belt` in `RELIC_IDS` (b065668), so the earlier local patch is gone.

0.5.0 adds what the trial board needs: `submitScore` no longer drops unranked submits (the server decides) and resolves a `ScoreResult`, and the optional `getLeaderboard` reads `leaderboard.top`. NOBU's score queue (`src/hub/scoreQueue.js`) keeps a row when `submitScore` resolves nothing, so an older tree degrades to "queued", and the map hides the world record when `getLeaderboard` is missing.

0.6.0 adds the `sproto-arcade` game id, the `breakwater_coin` relic id (it unlocks NOBU's Wizard Hat II; older trees dropped it from `profile.relics`), and the optional `loadSave` / `writeSave` cloud-save calls, which NOBU does not use yet.

0.7.0 adds the in-game feedback window (`installFeedback`, `feedbackTransportFromSdk`, and the `feedbackAccess` / `submitFeedback` calls). NOBU's adapter is `src/hub/feedback.js`.

0.7.1 adds the optional `tickets` field to `EventResult` (Tickets the server credited for an event). NOBU does not read it yet.

0.7.2 fixes the feedback screenshot, which used to copy only the game canvas, so reports showed the 3D scene without the menus, HUD or pause panel. The window now draws the page's HTML over the canvases (`dist/pageShot.js`, using modern-screenshot 4.7.0, MIT, vendored as `dist/third_party/modern-screenshot.js` and loaded on demand). NOBU's adapter keeps `canvases: () => [game.canvas]` and passes no `overlay`, so the HTML is drawn. From the canvas copy until the window opens, the game draws no new frame (`game.still`): in a software renderer a frame took about a second and starved the HTML's font and image fetches, which the SDK limits to 1 s each. `index.html` loads the Google Fonts stylesheet with `crossorigin="anonymous"`, or the screenshot's text falls back to a system font. This tree was vendored from hub main `c6627e5` (`c6627e51585a7c0e8006122af54e0e413ca91876`) after metaverse-hub#183 merged as `bb0017c`. Hub #185 is on that main and does not change `packages/hub-sdk`, so the built files match the earlier 5099cb5 pin apart from this header.

0.8.0 adds `createProgressStore` and `hubVisitStarting` (progress per hub account, synced through the cloud save) and raises the cloud save limit to 16384 bytes. NOBU keeps its progress in one store (`src/core/save.js`). This tree comes from hub branch `claude/account-progress` at `dbbf398`, before that branch merged: re-vendor from hub main once it merges, and update the pins in `tests/sdk-vendor.test.js`.
