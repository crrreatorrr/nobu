# Handoff: public trial scores (owner actions only)

Everything else on this branch is done and tested. These steps need you.

## 1. Deploy order

NOBU now sends trial times as integer ms with `meta.level`. Only the new hub server stores them per level, so
the hub goes first.

1. Merge the metaverse-hub PR (SDK 0.5.0, `0011_ranked_scores`, `HubBoards` wiring, `leaderboard.top`,
   live plaza boards). Merge and deploy hub migrations in id order (hub `0011`-`0012`, then People's Bitcoin
   `0013`-`0019`, then Sproto `0020`-`0024`), or all together.
2. Deploy the hub server module and run its migration on production Nakama, then deploy the hub app.
3. Merge this NOBU PR, then redeploy NOBU.

Until step 2 is live, NOBU keeps scores queued in each player's browser and sends them once the server
accepts them. Nothing is lost by deploying NOBU first, but no score shows publicly until the hub is live.

## 2. Check the production server key

Confirm the production NOBU build has `VITE_NAKAMA_SERVER_KEY` set to the production Nakama **server key**
(the client key, not the runtime HTTP key). Without it every ticket redeem fails, NOBU runs with no hub
session, and no score is posted (`src/hub/hubBridge.js`, the `NAKAMA_SERVER_KEY` constant).

How to check, after deploying:

1. Open the hub, enter NOBU through the Kennel portal.
2. In the browser devtools, Application > Session Storage, the key `hub:nobu:session` must exist with a
   `token` and `playerId`. If it is missing and the console shows `[hub] unreachable`, the key is wrong or
   unset: set it in the NOBU build environment and rebuild.

Optional: set `VITE_BUILD_ID` (for example the git sha) in the NOBU build so each score's meta records the
build. Without it the meta says `production`.

## 3. Smoke test once both are live

1. From the hub, enter NOBU, beat a level if needed, and run its time trial (`T` on the map).
2. Back on the map, the panel shows `WORLD top m:ss.cc · you #N`.
3. In the hub plaza Bar, the NOBU board page for that level lists the time.
