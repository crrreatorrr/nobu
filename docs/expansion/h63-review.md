# H63 Boss Rush implementation review

Source: H63, bosses1.6–1.7, rewards0/9.1 and the coordinator-approved preparation in
`/workspace/nobu-spec/h63-preparation.md`. Base main is H51 merge `c4d6c547`.

## Architecture and integration contract

`RushSession` extends Session but owns arena setup, boss phase/defeat transitions, death/retry and
completion. `RUSH_ARENAS` reuses the five released builders/Boss classes in Bird→Cat→Cone→Titan→Queen
order; the Queen arena is independently exported and does not activate unfinished Level5.

The normal on-foot start, Hub attempt/carry/bank/score/relic, checkpoint rollback, story life loss,
ordinary level completion and individual boss-medal paths are not called. The inert arena Ticket
adapter creates no static or flying Tickets; normal arena Blue Spheres and phase spheres remain.
Only Rush clear, No-Hit and minimum total fight time are recorded. There is no Rush Speed medal.

Game integration must use `rushAvailable(save.data)`, create a RushSession and assign `game.session`
before awaiting `startLevel()`. Its own startup also enforces Queen completion. Game supplies
`rushCompleted(session, {record,eligible,ms,noHit})`; that hook presents results only. The existing
`ui.trialTime` displays fight time and the current boss count. The map/pause/result
copy and entry use `session.rush`, because `session.def` is the current boss descriptor. The
`rush` registry descriptor must not import RushSession: the base Session imports the registry, so
keeping the constructor import in Game avoids a class-initialization cycle. Game preserves the ordinary
`lastLevel` bookmark and disposes Rush on quit/map/title/Hub transitions. A launch epoch retires
a pending fade before it can start a stale session. Rush-owned dialogue is canceled through the
identity-scoped `UI.cancelSay(expectedDialog)`; it cannot close a newer mode's dialogue.

## Approved implementation choices

Retries rebuild the current actual arena/Boss at stage1, including Queen after stage4. They are
unlimited and mode-local, cost no story lives and start with zero masks. Ordinary gear is retained;
normal retry spawning refills a collar as usual. Won-fight transitions preserve masks, the remaining
mask invincibility duration and depleted Golden Collar charges, so there is no free inter-boss heal.
Wizard Hat remains the existing Spell Bark boss-target exclusion; no encounter skip is invented.
Earned Queen Mega Bark remains available through H51's separately bounded callback.

The aggregate clock advances only while the current boss remains active, outside pause/busy/dialogue.
As with H20, an ordinary active-fight death delay counts; time and No-Hit/God invalidation survive
retries. God use is sticky across intermissions. Mode-local epoch guards cover deferred loading,
dialogue, evolution, fade, retry and completion. Disposing also resolves retired intro/evolution
promises so detached arenas do not leave blocked continuations.

`save.write({progressOnly:true})` is an additive option reserved for non-economic progress writes.
It merges current durable achievements and refreshes the latest durable Ticket wallet before writing
the new Rush record. Default Save.write behavior is unchanged. Current lives/checkpoints and the rest
of the save are not restored from a snapshot. This prevents Rush's final record from overwriting a
second tab's completed spend or gain; retry never restores the old wallet at all. Storage failure
retains the existing local Save semantics; Rush has no external economic settlement.

## Verification and limits

Focused tests use the real five arena builders, Boss classes, Player, World, Game death forwarding,
phase spheres and GameCamera; rendering assets, FX and audio are substituted in CPU tests. Defeats
are assisted by setting the current actor's last HP before its actual damage callback. Tests cover
mask/collar carry, five stage1 retries, fourth-stage Queen sphere/evolution, No-Hit hit paths, God,
pause, currency/lives isolation, Wizard Hat non-skip, pending cancellation and record persistence.
Two independent Save instances sharing storage exercise durable wallet spending/gaining and monotone
record merges. Exact counts and final integrated checks are reported after the shared Game wiring.

Initial component snapshot: `npm ci` passed (75 packages); 3 files / 23 focused tests passed;
`npm run build` and `git diff --check` passed. The 166-module production build still has no public
Rush entry, so the new module graph is exercised by the actual Session tests until Game wiring lands.

No browser or human full Rush has been run in this component pass. A bounded five-arena browser run,
actual map/result/quit integration, final independent review, full tests/build and exact CI/merge
remain required. This is not an unassisted five-fight or No-Hit clear.

Integrated activation snapshot: the meta map entry is Queen-gated, shows saved clear/No-Hit/best,
and routes to a dedicated result card without story completion or trial boards. Real UI cancellation,
Game launch/result and launch-fade retirement add five regressions (20 Session tests; 28 Rush tests
across three files). The focused Session/registry/migration pass is 3 files / 52 tests. Production
build passes with 174 modules; the usual bundle-size warning remains. Migration/registry expected
map fixtures now exclude meta entries where they mean story/bonus content. Full suite and bounded
browser remain pending coordinator review/window; an unaided full Rush remains unrun.

Additional real Game pause-quit regression passes: it disposes the Rush before the deferred map
return, makes no Save write and no Hub call. The 20-test Session file passes after that addition.

## H46 integration rebase

Rebased onto fetched main `c7c05b135f8dbd95ba31ae254edef7e158735c78` without fetching.
The union retains H46 Gauntlet text, map pins/entry and RB handling, host return, ordinary bookmark
rules, result presenter and `Save.withGauntletEnd`/origin-lock transaction unchanged. The Rush
`progressOnly` option remains additive; UI cancellation adds only the identity-scoped method.
Focused Rush + Gauntlet atomic/runtime + registry/migration: 7 files / 85 tests passed. Independent
pre-rebase review is `/workspace/nobu-spec/h63-independent-review.md` (approved 28 authored tests +
3 external all-HP-phase/Game/map/wallet probes). Source-only full-suite and build results follow.

The first integrated full run exposed exactly two ordinary Hub-exit fixture failures: newly broadened
cleanup tried to dispose a deliberately partial ordinary stage. The reviewed correction scopes new
retirement to Rush/existing Gauntlet, retains ordinary Hub behavior, validates locked Gauntlets before
retirement, and avoids a duplicate disposal of already retired sessions. Latest-launch epoch guards
remain. Affected balance/Rush/Gauntlet runtime: 3 files / 55 tests passed.

Final source verification after that correction: **102 files / 1,023 tests passed** (`npm test --
--maxWorkers=2`), production build passed with **183 modules**, and `git diff --check` passed. The
existing bundle-size warning and jsdom navigation warnings remain. Session.js and H46's atomic claim
implementation have no H63 diff. GPU/browser is still pending its coordinator-assigned exclusive slot;
unaided five-fight gameplay, human No-Hit, audio and readability acceptance remain unrun.
