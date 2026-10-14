# API/E2E exact command index
Working directory throughout: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`.
`$T` below abbreviates `$PWD/tickets/in-progress/settings-saved-model-refresh`; expand when copying.

```bash
T="$PWD/tickets/in-progress/settings-saved-model-refresh"
pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/ExistingRunConfigEditor.savedSnapshot.spec.ts stores/__tests__/existingRunConfigStore.spec.ts stores/__tests__/delegatedLaunchDraftStore.spec.ts --run
pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__ stores/__tests__/existingRunConfigStore.spec.ts stores/__tests__/delegatedLaunchDraftStore.spec.ts components/run-settings/__tests__ utils/runSettings/__tests__ services/agentCollaboration/__tests__ stores/__tests__/agentRunCollaboration --run
pnpm -C autobyteus-server-ts build
env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch
```
The gated API file creates private HOME before executing its runtime (vi.hoisted); no user CLI configuration used. Test outputs `api-narrow.log`, `api-web-regression.log`, `api-server-build.log`, `api-server-e2e.log`.

First desktop attempt (fresh production app build via isolated-app CLI):
```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= pnpm -C autobyteus-web test:e2e:settings-saved-model-refresh --output-dir "$T/evidence/desktop-01" --ledger-file "$T/api-e2e-test-case-ledger.md"
```
At this time script listed SSR-001..003 and DCP-001..005. `desktop-01/desktop-start.log` contains complete build output. No signing identity or notarization credential copied. Internal lifecycle command is `node autobyteus-web/scripts/isolated-app/cli.mjs start --build`; each later attempt uses `start --from-worktree`, cleanup `stop <exact instanceId>`.

Reruns with unchanged asar (current source verified by receipts):
```bash
pnpm -C autobyteus-web test:e2e:settings-saved-model-refresh --skip-build --output-dir "$T/evidence/desktop-02" --ledger-file "$T/api-e2e-test-case-ledger.md"
node autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs --desktop --skip-build --cases DCP-002,DCP-005,SSR-004 --output-dir "$T/evidence/desktop-03" --ledger-file "$T/api-e2e-test-case-ledger.md"
node autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs --desktop --skip-build --cases DCP-005,SSR-004 --output-dir "$T/evidence/desktop-04" --ledger-file "$T/api-e2e-test-case-ledger.md"
```
Browser (real backend, fresh sandboxed Chrome, Nuxt dev):
```bash
pnpm -C autobyteus-web exec nuxt prepare
node autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs --cases SSR-001,SSR-002,SSR-003,SSR-004,DCP-002,DCP-005 --output-dir "$T/evidence/browser-01" --ledger-file "$T/api-e2e-test-case-ledger.md"
```
Final committed-harness desktop suite (nine cases; SSR-004 now included):
```bash
pnpm -C autobyteus-web test:e2e:settings-saved-model-refresh --skip-build --output-dir "$T/evidence/desktop-final" --ledger-file "$T/api-e2e-test-case-ledger.md"
```
Each driver output is in adjacent `<attempt>-driver.log`; each directory contains `delegated-launch-defaults-evidence.json`, screenshots, backend log and (desktop) build/instance/hash/start/stop receipts. Fresh output directories required; never rerun into an old path.

Captured test/build logs have trailing whitespace and excess EOF blank lines normalized for repository hygiene; all diagnostic messages/results remain.
