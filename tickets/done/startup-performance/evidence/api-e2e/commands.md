# Repository execution commands
CWD `/Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance`.

```sh
pnpm -C autobyteus-server-ts exec vitest run \
 tests/unit/app-data-migrations/team-context-file-execution-locators-v1.test.ts \
 tests/unit/app-data-migrations/agent-org-context-file-locator-transition.test.ts \
 tests/unit/app-data-migrations/app-data-migration-runner.test.ts \
 tests/unit/run-history/services/root-run-package-readiness-index.test.ts \
 tests/unit/agent-org-execution/agent-org-execution-tree-location-service.test.ts \
 tests/unit/context-files \
 tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts \
 tests/unit/server-runtime-app-data-migration-gate.test.ts \
 tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts \
 tests/unit/run-history/atomic-run-package-file-commit-writer.test.ts \
 tests/integration/api/rest/context-files.integration.test.ts \
 tests/integration/api/rest/agent-org-context-files.integration.test.ts \
 tests/integration/agent-memory/user-attachment-history.integration.test.ts --no-watch
pnpm -C autobyteus-server-ts build
RUN_CONTEXT_FILE_PROCESS_E2E=1 CONTEXT_FILE_E2E_EVIDENCE_DIR="$PWD/tickets/in-progress/startup-performance/evidence/api-e2e/process-final-children" \
pnpm -C autobyteus-server-ts exec vitest run \
 tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts \
 tests/e2e/runtime/context-file-startup-recovery.e2e.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run \
 tests/integration/app-data-migrations/team-context-file-golden-files.integration.test.ts --no-watch
env -u APPLE_ID -u APPLE_APP_SPECIFIC_PASSWORD -u APPLE_TEAM_ID -u APPLE_SIGNING_IDENTITY \
 CSC_IDENTITY_AUTO_DISCOVERY=false pnpm -C autobyteus-web build:electron:mac
git diff --check
```
Large representative/desktop probes and paths are in the report and sibling scripts.
Do not blindly replay them against installed data; fixtures were explicitly owned.
