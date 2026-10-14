# Implementation-local evidence — IR-001

2026-10-13; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`, branch `codex/settings-saved-model-refresh`, base `1a2379c57088e8976aeb0f43e1e607e1acc103c6`. All commands below run there unless stated otherwise. Final implementation commit is the branch development commit accompanying this artifact. These are implementation checks, not independent API/E2E results.

## Setup
- `pnpm install --frozen-lockfile` — passed (pnpm 10.28.2). No lockfile change. Install log `/tmp/settings-refresh-install.log` was task-local; no secrets imported.
- `pnpm -C autobyteus-web exec nuxt prepare` — passed.
- `pnpm -C autobyteus-application-sdk-contracts build` — passed; required untracked SDK dist for production web build (`evidence/sdk-build.log`). Other tracked contract outputs unchanged.

## Red before production edits
Command:
```
pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/ExistingRunConfigEditor.savedSnapshot.spec.ts --run
```
`evidence/pre-fix-component.log`: one mounted component test **failed**, after Save expected row `new:null`, received `old:null`. Before the failing assertion, mock transport's stored accepted choice was asserted `new` and untouched live context `old`. Editor, Settings/Save bar, row calculation and both draft stores were real; transport and unrelated stores/leaf rendering were controlled. This is a durable reproduction of the frontend source defect, **not proof of backend write correctness**. It was run before production changes. Real backend evidence is mandatory downstream.

## Final local regression selection
```
pnpm -C autobyteus-web test:nuxt \
  components/workspace/config/__tests__ \
  stores/__tests__/existingRunConfigStore.spec.ts \
  stores/__tests__/delegatedLaunchDraftStore.spec.ts \
  components/run-settings/__tests__ utils/runSettings/__tests__ \
  services/agentCollaboration/__tests__ stores/__tests__/agentRunCollaboration --run
```
`evidence/final-tests.log`: **25 files, 170 tests passed**, source-current final production changes. Covers canonical snapshot staging/copying/active skip/stopped transition/null/failure, complete retry, rendered same-view saved values, real member summary + Fast label/card config, second-edit baseline/reopen, mounted disclosure preservation, Team follower/own default/member choice/neighbor, Cancel/refusal and readback failure, ownership across navigation/node binding, root-only sync/results, active collaboration/store/stream/closure and adjacent editor/root-kind regressions.

Earlier runs retained: `focused-tests.log` 33/33, `expanded-tests.log` 123/123, `snapshot-tests.log` 35/35. `test-fixture-correction.log` shows an intermediate new Team test failure (167 passed, 1 failed): the newly written transport fixture used Agent `userLaunchSelection` instead of Team `userTeamLaunchSelection`. Corrected the fixture to the existing contract; no production policy change was needed. Final run above supersedes these runs.

## Build / static guards
```
pnpm -C autobyteus-web build
pnpm -C autobyteus-web guard:web-boundary
pnpm -C autobyteus-web guard:localization-boundary
pnpm -C autobyteus-web audit:localization-literals
git diff --check
```
Final `evidence/web-build.log`: **passed**, 20 routes prerendered. `evidence/guards.log`: all three passed, literal audit zero unresolved findings. `git diff --check`: passed.

Initial build failed because `@autobyteus/application-sdk-contracts` dist had not been built in this fresh worktree; corrected with the SDK build above, not a source defect. Initial diagnostic kept in `evidence/web-build-missing-dependency.log`. Subsequent final build passed. Tooling warnings (Browserslist data age, chunk/build warnings) remain visible in logs; not hidden.

Attempted `pnpm -C autobyteus-web exec vue-tsc --noEmit`: **not executed**, executable absent (`evidence/typecheck.log`). Web package has no standalone vue-tsc check provided; no standalone TypeScript pass claimed. Production web build passed. No server changes/checks in this implementation scope; downstream owns server runtime setup.

## Rendered feedback loop
Normal Nuxt preview, same real editor and component controls, not an isolated desktop instance. Temporary route source retained at `evidence/preview-fixture.vue.txt` (not active production route). It intercepts Apollo in the fixture only and seeds owned fixture definitions/selection; does not access real runs. Runtime catalogs are controlled to prevent provider discovery/inference.

Launch command:
```
env -i HOME=/tmp/settings-refresh-preview-home PATH="$PATH" TMPDIR="$TMPDIR" \
  BACKEND_NODE_BASE_URL=http://127.0.0.1:48318 \
  pnpm -C autobyteus-web dev --host 127.0.0.1 --port 48317
```
URL `http://127.0.0.1:48317/implementation-settings-preview`. Port 48318 intentionally has no backend; health refusal in `evidence/preview-dev.log` is expected for this presentation fixture. No browser probe suite, server, desktop instance or inference was launched by implementation. The fixture originally used wrong envelope discriminator `root_kind`; correcting it to the existing `root_subject_kind` enabled the public query parser. It was a fixture issue, not a production fallback.

Browser tool (task-owned Chrome tab; in-app browser unavailable) directly inspected:
1. Stopped parent, collapsed collaborator/Team summaries, root controls and fixed runtime/approval.
2. Expanded collaborator `computer_use_agent`, opened actual model menu and selected `saved-model`.
3. Visible dirty summary/editor and Save/Cancel bar.
4. Clicked Save, without navigation: expanded row remained open, summary and model control remained `saved-model`, root and neighboring Team stayed `root-model`, Saved feedback appeared after readback. Screenshot/AX state directly inspected in tool transcript.

Existing visual language retained: no re-layout; cards, labels, hierarchy, padding, alignment and Save bar consistent. The implementation intentionally retains same-root/node draft while reading (locked) to preserve disclosures rather than unmount/remount the editor. Independent test asserts same mounted Settings element and expanded detail after Save.

Limitations: no durable screenshot file was persisted in this stage. Manual readback-error exercise was interrupted by repeated browser-control deadline failures after a fixture HMR; no manual error-state pass claimed. Automated error/retry assertions pass. No mobile viewport, native desktop, real mutation/readback, live inference or final user verification claimed. API/E2E must capture durable screenshots and complete AC-006 with real owned backend.

## Cleanup / scope receipt
- Task-created preview browser tab closed successfully through browser tool.
- Owned Nuxt process stopped via its exec session; subsequent `lsof -nP -iTCP:48317 -sTCP:LISTEN` returned no listener.
- Temporary `autobyteus-web/pages/implementation-settings-preview.vue` removed; only text evidence retained.
- No user's process, run, persisted data, credentials, runtime settings or model quota touched.
- Dependency/build outputs kept for downstream reuse and excluded from staging; notably untracked `autobyteus-application-sdk-contracts/dist/`. Delivery owns final worktree/output cleanup. No release, push or finalization performed.
- No new outside-scope product finding confirmed. No full API/E2E sign-off inferred from these local checks.
