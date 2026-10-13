# IR-003 Latest-Base Integration — Local Evidence

2026-10-13, implementation-scoped checks only. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`.
Evidence directory below: `tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-003/`.

## Intake / Source
- Candidate `5d95381a6637b7fa7eb5a703e8c161064bb05d69`, including API-REV-002 exact-target repair `e00d34ffdd7ed2421522ddde7182b3ed48a3f223`.
- `git fetch origin personal` confirms **7170fd755d0dd5e806371dd4594eb4a9bf3e2682**. Root/package AGENTS, DESIGN.md, TESTING.md, RELEASE.md unchanged from previously read target; server AGENTS and test setup read for added local checks. Incoming red-default approved requirements read; old gray default explicitly superseded.
- Preserved four modified Delivery reports and three new raw files unchanged in **bd0fb189e6c6d19f99b11ee1216177acd2767aa4**. Original DR-001 files/history not rewritten.
- Reproduced merge conflict with `git merge --no-edit origin/personal`; resolved DCP-002 exact Team row plus named parent Stop, then inspected whole combined harness.
- Source merge **21bab56a2785f32e137dc54cbb62af43cbd157dc**, parent bd0fb189e6 + 7170fd755d. No unresolved index.
- No requirements/product changes authored. Original Settings implementation/tests unchanged. Target Stop/TPS/Prisma source/tests/docs imported intact; web package scripts union preserves both focused Settings and new TPS entrypoints.

## Semantic Review / Local Correction
Compared merged probe against both parents. Preserved exact-root/kind/address Team copy row, uniqueness wait, `sidebarTarget` receipt and child Stop reuse. Incoming exact `Terminate team` parent control replaces generic first aria-labelled button. Retained preceding SSR fixtures/explicit order, Team disclosure, root manager selection, exact Grok sibling settings, same-view case module, desktop setup/hash routing/cleanup and one-start/one-completion ledger ordering.

Incoming Stop behavior is now enabled red/hover darker red/disabled gray (including disabled hover). All new DCP-001..003 parent/copy/root helpers and assertions remain, including real request forwarding, native activation/focus, duplicate/dialog checks, Task-open/parent survival, copy resume and root stop/history. A semantic incompatibility was found outside the textual conflict: `keyboardStopRoot` read only `new URL(page.url()).searchParams`, which cannot see Electron's `#/workspace?mode=history` query. Changed only that URL extraction to the same hash-aware expression already used by this dual-surface probe. Kept exact history assertion, including rejection of active URLs.

Incoming `Checkpoint` events from held root/copy Stop are intentionally preserved. They are not duplicate per-case Started/Completed events; downstream observer/audit must distinguish event type.

Static `preservation-check.json`: **61 checks Pass**. Complete incoming helper block identical except hash expression; DCP-001 exact incoming; DCP-003 exact incoming with established launch hash parser; prior exact-selector and Settings/desktop/runner sections identical; all original Settings files plus incoming changed web/server files identical to their source parent (probe/package are the intentional unions). Includes one Started/Completed and no old gray-enabled reference/no conflict markers. Static checks are not rendered proof.

## Actual-Helper Failing/Passing Local Regression
```bash
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-003/check-root-history.mjs --source-ref origin/personal
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-003/check-root-history.mjs
```
At the recorded target, first command exit **1**: desktop Org-history fails, other five variants pass (`root-history-before.json`). After correction exit **0**, all **6** pass (`root-history-after.json`). This script extracts/evaluates actual `keyboardStopRoot`, with synthetic history/held-request/locator dependencies only. Browser/desktop history acceptance, browser/desktop active rejection, Agent/Team exact operation/variables and Org archive/history retained. No browser/backend/app instantiated by the check; no actual Stop proof claimed.

```bash
node --check autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
node --check autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs
node --check autobyteus-web/tests/e2e/fixtures/settings-refresh-desktop.mjs
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-002/check-runner.mjs
```
All exit **0**. `syntax-check.json`, `runner-check.json`: three syntax and five actual-source synthetic runner variants pass. Reused prior local checker unchanged; temporary files removed. Completion after persisted evidence/next-case order, relative/absolute/absent ledger, platform labels, failures/browser errors and unknown-case rejection intact. Does not execute incoming real subcase Checkpoint paths; those require downstream probe.

## Unit / Compilation Commands
From worktree root:
```bash
pnpm -C autobyteus-web test:nuxt \
  components/workspace/config/__tests__ \
  stores/__tests__/existingRunConfigStore.spec.ts \
  stores/__tests__/delegatedLaunchDraftStore.spec.ts \
  components/run-settings/__tests__ utils/runSettings/__tests__ \
  services/agentCollaboration/__tests__ stores/__tests__/agentRunCollaboration \
  components/workspace/history/__tests__/DelegatedStopButton.spec.ts \
  components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts \
  composables/__tests__/useWorkspaceHistoryMutations.spec.ts \
  components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts \
  components/workspace/usage/__tests__/TokenUsageThroughputCard.spec.ts \
  composables/__tests__/useTokenUsageWorkspaceScope.spec.ts \
  stores/__tests__/tokenUsageMeterStore.spec.ts \
  stores/__tests__/tokenUsageThroughput.spec.ts --run
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/startup/migrations-command.test.ts \
  tests/unit/startup/migrations-prisma-engine-env.test.ts --no-watch
pnpm -C autobyteus-server-ts typecheck
```
**330 tests / 33 web files**, **38 tests / 2 server files**, and **server typecheck Pass**, each exit 0. Logs `unit-web.log`, `unit-prisma.log`, `server-typecheck.log`.
The server unit global setup runs Prisma only against worktree `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`; this ignored test DB is retained, not user data. Test fixture roots are cleaned by afterEach. Server typecheck's automatic `prepare:shared` rebuilds core + application SDK packages, then runs `tsc --noEmit`; it does not make `dist/app.js` current.

```bash
pnpm -C autobyteus-web guard:web-boundary
pnpm -C autobyteus-web guard:localization-boundary
pnpm -C autobyteus-web audit:localization-literals
pnpm -C autobyteus-web build
```
All exit **0**, `build-guards-final.log`. Initial same command also passed (`build-guards.log`) but overlapped shared-package preparation from server typecheck. Corrected the validation sequencing: **repeated the entire web chain after typecheck/preparation ended**, final serialized result is authoritative. No later shared package build during final web build. Both attempts retained; no false claim of original serialization. Existing module-type/Browserslist/chunk-size warnings remain; no dependency change made to silence them. `isElectronBuild false` proves only web compilation; no current packaged desktop/server runtime claim.

## Commit / Artifact Hygiene
```bash
git add autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
git diff --cached --check
git diff --name-only --diff-filter=U
git commit -m 'merge: preserve exact Settings targets with current sidebar Stop coverage'
```
Staged merge whitespace passes (`merge-whitespace.log` empty), no unresolved path, merge commit recorded above. Final newly generated text logs have trailing whitespace/excess EOF blank lines normalized only; before/after hashes recorded in `integration-receipt.json`. No assertion/output text removed. Historical Delivery patches (conflict markers and any whitespace) remain byte-for-byte and are not unresolved index/source.

## Boundaries / Handoff
TESTING.md broader executable requirements remain API/E2E-owned per implementation skill, not waived by local checks. Prior API-REV-002 proves the earlier target only. API/E2E must rebuild backend and desktop and validate full SSR/DCP sequence with newly red Stop/root-history assertions, exact targets, real API readback and no-navigation Save; append API-REV-003, then Delivery verifies/docs/finalizes in DR-003. No old `15ff98c7…` asar reuse as new-source proof.

No product app/server started, user runs/data/credentials touched, paid inference, push/archive/finalization/release or main-checkout changes. Generated SDK dist excluded from staging; dependencies/build outputs/ignored local test DB retained. Local helper tests and standard unit setup are not a downstream API/E2E pass or a user acceptance claim.
