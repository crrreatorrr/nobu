# Codex handoff: NOBU expansion

This folder breaks the expansion plan into tasks that Codex (or any agent) can pick up one at a time.
Each `Hxx-*.md` file is self-contained: goal, the specs to read, the files to change, the steps, the tests,
what "done" means and the PR text.

## Read these first

1. `AGENTS.md` (repo rules: branches, checks, reviews).
2. `docs/gameplay-expansion-plan.md`: the decisions. **Don't re-decide them in a task.** If a task seems
   to need a different decision, stop and ask the owner in the PR.
3. The spec for the task's area:

| Spec | Covers |
| --- | --- |
| `docs/expansion/rewards-spec.md` | Chomp Chain, Mystery Backpack, Bone Board, Kennel, tally, hints, Good Boy %, DDA, mastery, save v3, Ticket budget |
| `docs/expansion/bosses-spec.md` | All 5 bosses per stage, the `chain` runner, 4-stage evolve, medals, Dust Dash, Moon Jump |
| `docs/expansion/new-levels-spec.md` | The kit helper API (new props, camera modes), Level 4 and Level 5 authoring specs, Chapter 2 story |
| `docs/expansion/level6-spec.md` | Level 6 Smog Rapids: the raft helper and the full authoring spec |
| `docs/expansion/extended-levels-spec.md` | L1–L3 and bonus-stage extensions, splice points, trial layout versioning, the hub change |

## Rules for every task

- **Branch:** `codex/<slug>` from the latest `main`; the slug is in each task file. Never push to `main`;
  open a pull request.
- **One task per branch.** Don't start a task until the tasks it depends on are merged.
- **Checks before the PR:**

  ```bash
  npm ci
  npm test
  npm run build
  ```

  Baseline on `main` at `bfb4a33` (2026-11-04): 17 test files, 144 tests, all passing; the build passes.
  Report the new numbers in the PR. If you could not run a check, say so.
- **No behaviour change unless the task says so.** Refactor tasks (H00–H05) must leave L1–L3, the bonus
  stages, the bosses and trials playing exactly as before.
- **Never change level ids 1, 2, 3** or the meaning of the existing save fields. Old saves must load.
- **Tickets are the hub's economy.** Every new Ticket source goes through `src/config/tickets.js` and
  stays inside the per-level cap (rewards spec). No Ticket rewards for bones, chains or milestones.
- **Placeholders only.** Don't add new GLBs, images or audio files. New assets are ids in
  `src/art/placeholders.js` that fall back to existing assets (H03). The owner replaces them later
  through `docs/higgsfield-workflow-guide.md`.
- **Don't touch files another open PR is changing.** At the time of writing,
  crrreatorrr/nobu#18 changes `src/gear/catalog.js` and `vendor/`. Check the open PRs before you start.
- **Don't edit `vendor/hub-sdk` by hand.** Follow `vendor/hub-sdk/VENDOR.md`.
- **Keep the house style:** no on-screen attack timers for bosses, telegraphs by animation and sound,
  and every new string in `src/story/script.js`.
- **Review:** a different agent reviews each PR (`agent-task review <path>` on the owner's machine, or a
  Claude Code review). Put "Reviewer: please check …" notes in the PR for anything risky.
- **Manual playtest.** There is no headless WebGL test. Each task lists what to play through with
  `npm run dev`. Say in the PR which of those you did, and what you could not do.

## Task order

`→` means "must be merged first". Tasks on the same line can run in parallel.

```
Phase 0  groundwork   H00 registry → H01 save v3
                      H02 difficulty config   H03 placeholders   H05 dev tools      (parallel, after H00)
                      H04a gameplay props   H04b gated objects   H04c chase/detour/dark/rising + cameras  (after H00)
Phase 1  rewards      H10 chomp chain + tally + next-goal hint   (after H01)
                      H11 bone board + Good Boy %                (after H01)
                      H12 mystery backpack + Ticket budget test  (after H01, H04b)
Phase 2  bosses       H20 boss system (chain runner, 4-stage evolve, medals, boss DDA)  (after H02)
                      H21 Mecha Bird   H22 Big Cat   H23 Evil Cone   (parallel, after H20)
Phase 2b extensions   H34 trial layout versioning (NOBU side)   H35 hub PR (metaverse-hub)   (parallel, after H01)
                      H30 L1   H31 L2   H32 L3   H33 bonus stages   (parallel, after H04a-c and H34)
Phase 3  Chapter 2a   H40 Level 4 Laundry Day (after H04a-c, H11)   H41 Roomba Titan + Dust Dash (after H20)
Phase 3b Chapter 2b   H45 Level 6 Smog Rapids (after H40)
Phase 4  Chapter 2c   H50 Level 5 Pump & Dump (after H45)   H51 Pump Queen + Moon Jump + true ending (after H41)
Phase 5  meta         H60 Kennel   H61 mastery UI (Platinum, Perfect Run, medals list)
                      H62 Smog Remixes (after H50)   H63 Boss Rush (after H51)
Phase 6  hub          H70 L4/L5/L6 trial boards (after H35 is deployed by the owner)
```

## Task list

| ID | Task | Slug | Size |
| --- | --- | --- | --- |
| H00 | Level registry | `level-registry` | M |
| H01 | Save v3 | `save-v3` | M |
| H02 | Difficulty config | `difficulty-config` | M |
| H03 | Placeholder assets | `placeholder-assets` | S |
| H04a | Gameplay props (zipline, spin drum, toaster, market, rug pull) | `kit-gameplay-props` | L |
| H04b | Gated objects and pickups (dust wall, moon ledge, smog vent, zoomie gate, mystery, pity snacks, section) | `kit-gated-objects` | M |
| H04c | Chase, detour, dark, rising, side and rise cameras | `kit-chase-detour-camera` | L |
| H05 | Dev tools (death heatmap, section timers) | `dev-heatmap` | S |
| H10 | Chomp Chain, tally, next-goal hint | `chomp-chain-tally` | M |
| H11 | Bone Board, Good Boy % | `bone-board` | M |
| H12 | Mystery Backpack, Ticket budget test | `mystery-backpack` | M |
| H20 | Boss system | `boss-system` | M |
| H21 | Mecha Bird powers | `boss-bird-powers` | M |
| H22 | Big Cat powers | `boss-cat-powers` | M |
| H23 | Evil Cone powers | `boss-cone-powers` | M |
| H30 | Extend L1 | `extend-l1` | L |
| H31 | Extend L2 | `extend-l2` | L |
| H32 | Extend L3 | `extend-l3` | L |
| H33 | Extend the bonus stages | `extend-bonus` | M |
| H34 | Trial layout versioning | `trial-layout-v2` | M |
| H35 | Hub: v2 trial variants (metaverse-hub repo) | `nobu-trial-v2` | S |
| H40 | Level 4 Laundry Day | `level4-laundry` | XL |
| H41 | Roomba Titan, Dust Dash | `boss-roomba-titan` | XL |
| H45 | Level 6 Smog Rapids (raft) | `level6-rapids` | XL |
| H50 | Level 5 Pump & Dump Pipeline | `level5-pump` | XL |
| H51 | Pump Queen, Moon Jump, true ending | `boss-pump-queen` | XL |
| H60 | Kennel and milestones | `kennel` | L |
| H61 | Mastery UI | `mastery-ui` | M |
| H62 | Smog Remixes | `smog-remix` | L |
| H63 | Boss Rush | `boss-rush` | M |
| H70 | L4/L5/L6 trial boards | `trial-l4-l6` | S |

Sizes: S ≈ under 300 changed lines, M ≈ 300–800, L ≈ 800–1500, XL ≈ larger, so split it into reviewable
commits.

## Owner actions these tasks can't do

- Merge PRs and deploy. The hub goes first for any board change (H35, H70); see `handoff.md` for the
  deploy order.
- Sign off on the per-level Ticket caps (rewards spec) before H12, H30–H33, H40, H45 and H50 merge.
- Tell players about the trial board reset (H34, H35) before it ships.
- Replace placeholders with real art when ready.
