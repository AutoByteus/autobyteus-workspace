# Reproducible checks — API-REV-001
Working directory for all pnpm commands:
`/Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-exact-execution`.

```bash
pnpm -C autobyteus-server-ts build
pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/rest/context-files.integration.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/unit/context-files tests/unit/app-data-migrations/team-context-file-execution-locators-v1.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts tests/unit/agent-team-execution/services/team-member-input-event-builder.test.ts tests/integration/api/rest/agent-org-context-files.integration.test.ts --no-watch
pnpm -C autobyteus-web test:nuxt stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/teamRunConfigStore.spec.ts utils/contextFiles/__tests__ services/runHydration/__tests__/runProjectionConversation.spec.ts components/conversation/__tests__/UserMessageStoredUploadNames.spec.ts components/conversation/__tests__/UserMessageFirstSubmission.spec.ts components/conversation/__tests__/UserMessageHistoryFiles.spec.ts --run
pnpm -C autobyteus-web test:nuxt stores/__tests__/contextFileUploadStore.spec.ts --run
pnpm -C autobyteus-web test:nuxt components/agentInput/__tests__/ContextFilePathInputArea.spec.ts --run
CONTEXT_FILE_E2E_EVIDENCE_DIR="$PWD/tickets/team-attachment-exact-execution/api-e2e-evidence/child-processes" RUN_CONTEXT_FILE_PROCESS_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts --no-watch
git diff --check
```

Logs: build.log; rest-final.log (10); server.log (101); web.log (78); web-upload.log (2); web-draft-component.log (5); process-e2e-final.log (6). Initial/rerun failure logs are audit history only. Process tests bind ephemeral loopback ports, build required, external inference emulator started by helper, no credentials required. Same owned production.db for Studio and standalone; inherited test DB/memory cleared, provider and package roots explicitly isolated.

Browser startup (historical owned root has now been removed; create a new temp root for reproduction):
- Studio `env -u DATABASE_URL -u DATABASE_URL_TEST -u AUTOBYTEUS_MEMORY_DIR -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS node dist/app.js --data-dir <owned-root> --host 127.0.0.1 --port 3421` from server directory. Read persisted package roots; do not inherit unrelated override on restart.
- Frontend `BACKEND_NODE_BASE_URL=http://127.0.0.1:3421 pnpm -C autobyteus-web dev --host 127.0.0.1 --port 3423`.
- Earlier HTTP/WS emulator probe: `node tickets/team-attachment-exact-execution/api-e2e-evidence/model-emulator.mjs`; live browser used Codex instead.
- Browser fixture/interaction details: browser-journey.md. Never point these probes at production or delete user history.
