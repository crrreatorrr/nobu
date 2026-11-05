# H70 SDK sync receipt — public trial gates unchanged

Nobu vendors SDK **0.6.1** from actual merged metaverse-hub main commit
**`b8636ee7b222cc39f2a4e18b1ce944276299e52d`** (Hub PR #58). Its exact PR-head workflow
`41962568989` passed verification, full duplication tests, realtime tests and the economy audit.
The merged Hub-main workflow `41971256049` was still pending when this SDK sync began; its final
status must be verified separately. A merge or successful test is not a deployment confirmation.

This sync is the SDK/contract phase only. Nobu's public `TRIAL_LEVELS` remains `[1, 2, 3]` and
`HUB_LAYOUT` remains `{1: 1, 2: 1, 3: 1}`, with both source files unchanged. Levels 4, 6 and 5 still
keep local results without queuing or uploading public scores. L1–3 layout-2 uploads remain gated.
Any activation is a separate change requiring confirmation of the actual deployed Hub capability.
This receipt does not authorize or claim a deployment, board reset, or retroactive score upload.

## Supported generation and provenance

The coordinator supplied a clean, detached Hub worktree at the exact full merge SHA above and a
fresh Nobu worktree at `a1b0a04d1213ca789f03363e34a0da8187301db7`. The Hub SDK had no previous build
output. From that verified Hub worktree:

```sh
npm ci --ignore-scripts
node scripts/vendor-sdk.mjs /workspace/nobu-h70-sdk --branch main
```

The helper builds the SDK, replaces Nobu's vendor dist and copies its package/README. `--branch`
only labels the header; the actual clean source SHA was verified first. No generated vendor file
was edited by hand. The helper retained Nobu's existing VENDOR.md notes unchanged after the header.
The installed `@metaverse/hub-sdk` resolves to `../../vendor/hub-sdk`.

All **38** generated package/README/JS/declaration files were compared byte-for-byte to the exact
upstream build after the helper's prescribed source-map stripping. There are no source maps or
`sourceMappingURL` directives. The helper's provenance header records `main b8636ee`, version
`0.6.1`. The full SHA is recorded here because that header uses the short SHA.

The sorted content-manifest SHA-256, including VENDOR.md and using the existing vendor test's
normalization, is:

```text
98b625bac349f83e5afe75491c14d0fe70e8ac63206b8beaafba51d210b6a372
```

The historical SDK 0.6.0 manifest and older tarball references remain in `tests/sdk-vendor.test.js`.
`npm install --package-lock-only --ignore-scripts` changed only the lockfile's vendored SDK version
from 0.6.0 to 0.6.1, followed by a clean `npm ci`. Nobu's dependency path and application version
are unchanged. Upstream's published SDK version stays 0.6.1; no version bump was invented.

## Contract and coverage

The real generated SDK is imported by relative path in `tests/sdk-expanded-trials.test.js`,
bypassing Vitest's `@metaverse/hub-sdk` mock alias. All network responses are injected fixtures;
no authenticated Hub, production score, economy write or cloud save is used.

- All nine Classic/current/new variants retain their exact floors and inclusive 1,800,000ms
  ceiling. New floors are `4=24000`, `6=30000`, `5=21000`. Floor-minus-one, fractions and
  ceiling-plus-one reject in the real mock; fastest records remain independent by variant.
- The live SDK forwards canonical `nobu_trial_time` score and read payloads, numeric layout-1
  levels and string layout-2 levels, with the session bearer token. Authentication uses custom
  ticket redeem plus Basic server key; no obsolete `session.claim` is introduced.
- Unsupported `4v2`, `6v2`, `5v2`, out-of-range and prototype variants reject in the real mock.
  Score posting grants no Tickets, Verse, Relics or save writes. God submissions reject in the
  mock; live eligibility remains the server's decision. Standalone calls remain no-ops.
- SDK support alone cannot enqueue or flush levels 4/6/5 from Nobu, including a seeded queue row
  from another writer. Existing local trial, layout migration, score queue, save-score and
  once-only FreezePack suites remain covered.
- SDK 0.6.1's actual IndexedDB outbox drops terminal 2xx refusal rows without deleting another
  pending row or poisoning later init. Network/HTTP 503/rate-limit failures retain durable writes.
  Closed sessions rebind only to the same player and game while retaining body and key; another
  player or game cannot carry the row. Existing Cone grant and upstream Relic filtering remain.

The policy floors are server implausibility checks, not a certified global fastest-run bound.
This SDK sync preserves the once-only FreezePack fix and all older local trial records.

## Verification and remaining acceptance

- Direct vendor/golden contract targets: **42 tests passed across 2 files**.
- Broader trial/queue/save/freeze targets before the final two added ownership/retry cases:
  **89 tests passed across 9 files**.
- Full `npm test -- --maxWorkers=2`: **1415 tests passed across 138 files** (216.74 seconds).
- Production `npm run build`: **passed, 208 modules**; existing bundle-size advisory only.
- `git diff --check` and exact upstream-byte verification passed.

No browser/GPU session, deployment, live login or production write was performed. Real hub-launched
L4/L6/L5 trial submission and readback remain manual acceptance after owner-confirmed deployment
and the separate activation change. Neither assisted contracts nor these floor checks establish
unaided completion or performance. Nobu is the required game consumer for the new trial variants;
other games need no functional board resync for these additions.
