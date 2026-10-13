# API-REV-002 commands
All commands run in `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`, bash, source HEAD 4dd213be087bda11d3f4e0bc87f9d44af1278e85. No source/test edits in this round. Logs under this folder; no release/push.

```bash
T="$PWD/tickets/in-progress/settings-saved-model-refresh"
E="$T/evidence/api-rev-002"
pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/ExistingRunConfigEditor.savedSnapshot.spec.ts stores/__tests__/existingRunConfigStore.spec.ts stores/__tests__/delegatedLaunchDraftStore.spec.ts components/workspace/history/__tests__/DelegatedStopButton.spec.ts --run > "$E/narrow.log" 2>&1
node --check autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
node --check autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs
node --check autobyteus-web/tests/e2e/fixtures/settings-refresh-desktop.mjs
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-002/check-runner.mjs > "$E/runner-check.json"
pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__ stores/__tests__/existingRunConfigStore.spec.ts stores/__tests__/delegatedLaunchDraftStore.spec.ts components/run-settings/__tests__ utils/runSettings/__tests__ services/agentCollaboration/__tests__ stores/__tests__/agentRunCollaboration components/workspace/history/__tests__/DelegatedStopButton.spec.ts --run > "$E/web-regression.log" 2>&1
pnpm -C autobyteus-server-ts build > "$E/server-build.log" 2>&1
env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch > "$E/server-e2e.log" 2>&1
```
Source-preservation.json compares each original Settings source/test plus SSR/adapter/package to prior candidate using git show, incoming Stop component/test and imported helper/DCP-001 body to integrated target. 20 independent byte checks. Source identity records SHA256 and unmerged-index/status.

After repository scorecard (81.4%, broader Required):
```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= pnpm -C autobyteus-web test:e2e:settings-saved-model-refresh --output-dir "$E/desktop" --ledger-file "$T/api-e2e-test-case-ledger.md" > "$E/desktop.log" 2>&1
python3 "$E/audit-live-ledger.py" desktop
```
Desktop command invokes the adapter's `node autobyteus-web/scripts/isolated-app/cli.mjs start --build`, then production Nodes UI registration/open of private backend. No --skip-build. The read-only ledger observer started while building, records persisted case JSON at each observed Completed checkpoint, and exits on probe completedAt. Source synthetic runner additionally proves strict write/append sequencing.

Combined initial desktop finished exit 1 (8 Pass / DCP-002 wrong-row selector Fail). Read-only Playwright/CDP diagnostic inspected current row text/data-root/kind/address/Stop count without interaction (selector-diagnostic.json). Fresh product build remains valid; API-only selector repair committed e00d34ffdd. Supplemental live-ledger observer's physical-line parser missed multiline failed event; initial 8-observation artifact preserved; corrected to event blocks before final rerun.
```bash
node --check autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-002/check-runner.mjs > "$E/runner-check-after-fix.json"
git add autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
git diff --cached --check
git commit -m 'test(e2e): baseline fix for root-scoped Team Stop selectors'
pnpm -C autobyteus-web test:e2e:settings-saved-model-refresh --skip-build --output-dir "$E/desktop-final" --ledger-file "$T/api-e2e-test-case-ledger.md" > "$E/desktop-final.log" 2>&1
python3 "$E/audit-live-ledger.py" desktop-final
```
Final rerun reuses only the freshly built integrated asar (15ff98c7...), not pre-integration 55749a61 artifact. The 4dd213be → e00d34ffdd diff is one test file only. Runtime assertion bodies/native keyboard/real Stop request forwarding unchanged.

Browser supplement, after desktop stopped (no build/dev-server overlap):
```bash
pnpm -C autobyteus-web exec nuxt prepare > "$E/browser-prepare.log" 2>&1
node autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs --cases SSR-001,SSR-002,SSR-003,SSR-004,DCP-001,DCP-002 --output-dir "$E/browser" --ledger-file "$T/api-e2e-test-case-ledger.md" > "$E/browser.log" 2>&1
python3 "$E/audit-live-ledger.py" browser
```
Chrome headless is sandboxed; fixture backend HOME/data/SQLite/ports owned; public API definitions and UI-created runs; scripted external CLIs only. Nuxt cold dependency warm-up remains in harness. Browser exercises the exact combined SSR → DCP selector interaction, not an empty sidebar special case.

Final audit:
```bash
python3 "$E/audit-results.py"
node autobyteus-web/scripts/isolated-app/cli.mjs list
```
The list JSON is filtered to exact owned instance IDs with unrelated entry count only; no unrelated process/root altered. The audit validates all case outcomes/order/checkpoint counts, final live-completion evidence, asar/source identity, cleanup receipts, missing owned roots/PIDs and free ports. Initial failed run retained as 8/1; not reclassified a Pass. API log path spellings normalized with Path.resolve before asserting owned fixture removal.

Artifact custody/hygiene: six DR-001 files independently compared byte-for-byte against 24562de063 (`delivery-custody.json`). Only four newly generated logs needed trailing whitespace/excess blank EOF cleanup (`log-normalization.json`, before/after SHA256); no prior evidence touched. New exact selector patch uses zero-context git diff. SHA256 manifest covers the new evidence folder, excluding itself.
