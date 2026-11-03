# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: claude/quirky-bohr-73hc39 (hub main f88b442 plus the outbox fix 9ce6ade)
- sha: 9ce6ade
- package: packages/hub-sdk @ 0.4.0-redeem.1
- built with: `npm ci && npm run build` in packages/hub-sdk

Layout matches the previous vendor tree (`package.json`, `README.md`, `dist/*.js`, `dist/*.d.ts`). No source maps are included, and `sourceMappingURL` lines are stripped.

Ticket redeem is `authenticateCustom` (`t:` + ticket, create=false) with the Nakama server key as Basic auth, then `profile.get`. Later calls send only the session token.

The previous vendor tracked hub #25 at 947ed4c, which redeemed without the server key and then called a `session.claim` RPC. The merged hub server registers no such RPC, so every redeem failed and NOBU ran with no hub session: Tickets were not banked and the Cone relic was never sent.

9ce6ade also keeps a queued write on a closed session from failing every later `init`. The same player's next session for the same game re-sends it; a row no live session can carry stays queued instead of rejecting init.

Merge the hub branch before this one, then re-sync this tree to hub main whenever packages/hub-sdk changes.

## Local patch: `tidebreaker_belt` in `RELIC_IDS`

Hub main (b065668, "Add Sproto Fighter as the fifth hub game with the Tidebreaker Belt Relic") added `tidebreaker_belt` to `RELIC_IDS`. This vendor tree predates that, and the SDK filters relics against the list: `live.js` `asRelics()` drops any id `isRelicId()` rejects from `profile.get`, and the mock `createHubSdk.js` does the same. Without the patch, a player who owns the Belt would show no Champion's Crown in NOBU.

The fix is one array entry, in `dist/types.js` and `dist/types.d.ts`:

```
RELIC_IDS = ['hpos10i_core', 'genesis_shard', 'cones_tip', 'tinubu_crown', 'tidebreaker_belt']
```

Nothing else changed. `GAME_IDS`, `RELIC_BY_GAME` and the `fighter.story_level_complete` event were left alone because NOBU never reports as Sproto Fighter. The whole tree was not re-vendored: newer SDK builds need the Nakama server key passed in, and that would break redeem here. When this tree is next re-synced to hub main, the patch is already upstream and this section can go. `tests/sdk-vendor.test.js` pins the patched content manifest.
