# API-REV-003 execution commands
Cwd: /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh.
Candidate HEAD 76fab065ec30bff5be76dd2e013243abda3a6934. Serialized package builds/preparation/dev server. Existing dependencies reused; no install or source edits. All product fixtures private; no inherited credentials passed to probe backend/CLIs.

## Narrow then affected repository checks
```bash
pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/ExistingRunConfigEditor.savedSnapshot.spec.ts stores/__tests__/existingRunConfigStore.spec.ts stores/__tests__/delegatedLaunchDraftStore.spec.ts components/workspace/history/__tests__/DelegatedStopButton.spec.ts --run
for f in autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs autobyteus-web/tests/e2e/fixtures/settings-refresh-desktop.mjs; do node --check "$f"; done
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-002/check-runner.mjs
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-003/check-root-history.mjs
pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__ stores/__tests__/existingRunConfigStore.spec.ts stores/__tests__/delegatedLaunchDraftStore.spec.ts components/run-settings/__tests__ utils/runSettings/__tests__ services/agentCollaboration/__tests__ stores/__tests__/agentRunCollaboration components/workspace/history/__tests__/DelegatedStopButton.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts composables/__tests__/useWorkspaceHistoryMutations.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts components/workspace/usage/__tests__/TokenUsageThroughputCard.spec.ts composables/__tests__/useTokenUsageWorkspaceScope.spec.ts stores/__tests__/tokenUsageMeterStore.spec.ts stores/__tests__/tokenUsageThroughput.spec.ts --run
pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup/migrations-command.test.ts tests/unit/startup/migrations-prisma-engine-env.test.ts --no-watch
pnpm -C autobyteus-server-ts build
env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch
```
Narrow 77/4 and broad 330/33 web, 38/2 Prisma, 3 syntax, 5 runner and 6 helper synthetic variants, build and 6 API tests all exit 0. API suite explicitly creates private fixture HOME/data; shell HOME here is only package-launch baseline, not a product data store. Standard Prisma unit setup uses only ignored worktree tests/.tmp/autobyteus-server-test.db. Source-preservation.json records 50 independent byte comparisons; source-identity.json approved documents unchanged.

## Fresh desktop execution (first and only round-3 build; no --skip-build)
```bash
T="$PWD/tickets/in-progress/settings-saved-model-refresh"
E="$T/evidence/api-rev-003"
NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= pnpm -C autobyteus-web test:e2e:settings-saved-model-refresh --output-dir "$E/desktop" --ledger-file "$T/api-e2e-test-case-ledger.md"
python3 "$E/audit-live-ledger.py" desktop
```
Package script explicit order SSR-001,SSR-002,SSR-003,SSR-004,DCP-001,DCP-002,DCP-003,DCP-004,DCP-005. Observer is read-only except its own JSON; observes persisted result at Completed. Subcase Checkpoint events intentionally kept separately. App starts through isolated-app CLI --build, public Nodes UI registers/opens private real backend, model runtime uses scripted AGY/Grok. Log desktop.log plus desktop/desktop-start.log. No release signing credentials, sandbox disable or installed user app.

## Browser supplement / audit (completed)
```bash
pnpm -C autobyteus-web exec nuxt prepare
node autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs --cases SSR-001,SSR-002,SSR-003,SSR-004,DCP-001,DCP-002,DCP-003 --output-dir "$E/browser" --ledger-file "$T/api-e2e-test-case-ledger.md"
python3 "$E/audit-live-ledger.py" browser
python3 "$E/audit-results.py"
node autobyteus-web/scripts/isolated-app/cli.mjs list
```
Fresh sandboxed Chrome/owned Nuxt + private real backend after desktop/build has ended. Extra DCP-003 verifies HTTP Org history alongside hash desktop variant. Exact process/data/port cleanup from receipts, never kill/remove unowned resources. Auditors do not control product or weaken assertions.

## Completed execution / evidence audit
Fresh desktop exit 0, 9/9; browser preparation and supplement exit 0, 7/7. Both zero page errors.
Live ledger observers exit 0 (9 and 7 persisted completions).
```bash
python3 "$E/audit-boundary-proof.py" desktop
python3 "$E/audit-boundary-proof.py" browser
python3 "$E/audit-results.py"
```
All exit 0. Boundary receipts corroborate CSS/native requests/history/Settings values from real case JSON, not new mocked product tests. Three MJS syntax checks repeated after execution; hashes of server app/migrations and all three harness files still match runtime-source-identity.json. CLI list read-only; filtered owned-ID result in isolated-list-after.json.
