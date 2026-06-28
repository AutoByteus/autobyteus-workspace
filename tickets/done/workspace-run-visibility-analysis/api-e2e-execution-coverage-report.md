# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Code-review pass to API/E2E, plus user request for real backend/frontend startup and browser validation.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Formal API/E2E execution after code-review pass; user requested real browser E2E startup proof | N/A | No | Pass | Yes | Targeted durable API/frontend checks passed, server build passed, and real Chrome browser smoke passed against an isolated fresh backend data directory. |

## Execution Basis

Executed the coverage decisions in the canonical investigation artifact. The validation emphasized the first-install/new-user path the user asked about: starting a fresh backend with an isolated data directory, starting the Nuxt frontend against it, then driving the actual UI in a real browser engine through temp-workspace and New-workspace agent launch flows.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `No`
- Reroute required from investigation: `No`
- Notes: No repository-resident durable coverage was added, updated, or removed during this API/E2E round.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| Backend workspace GraphQL E2E tests | Still Valid | Executed targeted backend E2E suite | 2 files / 14 tests passed. |
| Frontend projection/read-model/history/config tests | Still Valid | Executed targeted frontend Vitest suite | 7 files / 149 tests passed. |
| Server build typecheck | Still Valid | Executed `tsc -p tsconfig.build.json --noEmit --pretty false` | Passed. |
| Real browser temp/New workspace launch smoke | Temporary executable validation planned | Executed with Google Chrome via Playwright-core after in-app browser backend was unavailable | Passed; screenshots copied under `e2e-evidence/`. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Execution Surfaces / Modes

- Backend GraphQL E2E tests under Vitest.
- Frontend unit/component/projection tests under Vitest + Nuxt/Vue test environment.
- Server build typecheck and full server build for runtime startup.
- Real browser smoke using `playwright-core` with installed `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` in headless mode. The in-app Browser tool was attempted first, but `agent.browsers.list()` returned `[]`; I recorded that and used local Chrome as the practical real-browser fallback.
- Direct GraphQL probes against the running backend.

## Platform / Runtime Targets

- Host: macOS Darwin ARM64 worktree environment.
- Backend: `autobyteus-server-ts` built from the authoritative worktree and run with isolated app data at `/tmp/autobyteus-workspace-run-visibility-e2e/server-data`.
- Backend bind: `127.0.0.1:18080`.
- Frontend: Nuxt dev server from `autobyteus-web`, proxied to the backend with `BACKEND_NODE_BASE_URL=http://127.0.0.1:18080`.
- Frontend URL: `http://127.0.0.1:3000`.
- Browser: Google Chrome controlled by Playwright-core.

## Lifecycle / Upgrade / Restart / Migration Checks

- Fresh isolated backend data directory started with no pre-existing SQLite database.
- Server startup ran all Prisma migrations into `/tmp/autobyteus-workspace-run-visibility-e2e/server-data/db/production.db`.
- Startup created `temp_ws_default` under `/tmp/autobyteus-workspace-run-visibility-e2e/server-data/temp_workspace`.
- No upgrade/restart-specific behavior was in scope beyond fresh-start smoke.

## Coverage Matrix

| Scenario ID | Requirement / AC Coverage | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| DUR-BE-001 | REQ-010, AC-010 | Backend Vitest E2E | Pass | `workspace-run-history-graphql.e2e.test.ts` passed, including temp workspace scoped history. |
| DUR-BE-002 | REQ-008, AC-008, REQ-009, AC-009 | Backend Vitest E2E | Pass | `workspaces-graphql.e2e.test.ts` passed, including temp removal rejection and filesystem removal behavior. |
| DUR-FE-001 | REQ-001 through REQ-014 | Frontend targeted Vitest | Pass | Projection/read-model/history component tests passed. |
| DUR-FE-002 | REQ-014 through REQ-021 | Frontend targeted Vitest | Pass | Selector/config run-panel tests passed. |
| TMP-API-001 | REQ-002, REQ-010, AC-010 | Running backend GraphQL | Pass | Fresh `workspaces` returned only `temp_ws_default`; `workspaceRunHistory(temp_ws_default)` returned a temp root group. |
| TMP-BROWSER-001 | Fresh-user startup | Backend + frontend + browser | Pass | Real app loaded `/agents` and sidebar showed `Workspaces -> Temp Workspace`. Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/e2e-evidence/initial-page.png`. |
| TMP-BROWSER-002 | AC-001, AC-002, AC-008 | Real browser | Pass | Run config opened with Temp Workspace selected; after model select + Run Agent, sidebar showed `Temp Workspace -> Memory Compactor (1) -> New - Memory Compactor` expanded/selected. Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/e2e-evidence/temp-run-launched.png`. |
| TMP-BROWSER-003 | AC-016, AC-018, AC-020, AC-021, AC-022 | Real browser + backend GraphQL | Pass | New mode showed pending helper for `/tmp/autobyteus-workspace-run-visibility-e2e/workspace-new`; `Load` button count was 0; `Run Agent` was enabled; backend registered `workspace-new`; sidebar showed `workspace-new -> Memory Compactor (1) -> New - Memory Compactor`. Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/e2e-evidence/new-workspace-run-launched3.png`. |

## Test Scope

In scope:

- Temp workspace visibility and non-removability at API, projection, component, and browser-smoke levels.
- Temp workspace scoped history resolution at backend E2E and running-backend GraphQL levels.
- Descriptor-only row creation, removed-root suppression, same-root dedupe, local permanent row continuity, and row-source dedupe at durable frontend levels.
- New workspace mode Load removal, pending helper, run-triggered registration, success/failure durable coverage, and real browser success path.
- Fresh data startup and real frontend/backend connectivity.

Out of scope / not fully browser-exercised:

- Browser Team Run flow, because the isolated minimal backend environment loaded 0 team definitions; durable tests cover team run config sequencing and team projection boundaries.
- Real failed path browser flow and rapid duplicate-click browser race; durable config tests cover failure blocking and run enablement/guard behavior.
- Sending a real LLM prompt after draft creation; requirements concern draft/sidebar visibility before prompt send and history polling.

## Execution Setup / Environment

Temporary dependency setup was required because the dedicated worktree intentionally lacks local `node_modules`. I created temporary symlinks to the sibling checkout dependency directories for execution and removed them afterward.

Backend startup commands proven during the real browser run:

```bash
pnpm -C autobyteus-server-ts build
rm -rf /tmp/autobyteus-workspace-run-visibility-e2e
mkdir -p /tmp/autobyteus-workspace-run-visibility-e2e/server-data \
         /tmp/autobyteus-workspace-run-visibility-e2e/workspace-new
cat > /tmp/autobyteus-workspace-run-visibility-e2e/server-data/.env <<'ENV'
APP_ENV=production
LOG_LEVEL=INFO
PRISMA_LOG_QUERIES=0
DB_TYPE=sqlite
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:18080
LMSTUDIO_TARGET_TEXT_MODEL=qwen/qwen3.5-35b-a3b
CODEX_SEND_MESSAGE_RELAY_DEBUG=0
ENV

env -i PATH="$PATH" HOME="$HOME" USER="$USER" TMPDIR="${TMPDIR:-/tmp}" \
  node autobyteus-server-ts/dist/app.js \
  --data-dir /tmp/autobyteus-workspace-run-visibility-e2e/server-data \
  --host 127.0.0.1 \
  --port 18080
```

Frontend startup command proven during the real browser run:

```bash
cd autobyteus-web
BACKEND_NODE_BASE_URL=http://127.0.0.1:18080 pnpm dev
# Open http://127.0.0.1:3000/agents
```

Important setup note: the first backend startup attempt failed because a fresh custom `--data-dir` requires a `.env`; the second attempt intentionally used `env -i` so existing host `DATABASE_URL` / `AUTOBYTEUS_SERVER_HOST` variables could not pollute the fresh-install smoke. The first frontend startup attempt passed a port argument incorrectly and served a Nuxt welcome page from an accidental `--port` directory; I stopped it, removed that directory, and restarted with the correct command above.

## Tests Implemented Or Updated

No tests were implemented or updated during this API/E2E round. Existing durable coverage added before the prior code-review pass was executed and remained valid.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated: N/A
- Paths removed: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-API/E2E coverage code review artifact: N/A

## Other Execution Artifacts

Screenshots copied as durable execution evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/e2e-evidence/initial-page.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/e2e-evidence/run-config2.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/e2e-evidence/temp-run-launched.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/e2e-evidence/new-workspace-run-launched3.png`

## Temporary Execution Methods / Scaffolding

- Temporary dependency symlinks created for local execution only, then removed:
  - `node_modules`
  - `autobyteus-server-ts/node_modules`
  - `autobyteus-web/node_modules`
  - `autobyteus-ts/node_modules`
  - `autobyteus-application-sdk-contracts/node_modules`
  - `autobyteus-application-backend-sdk/node_modules`
  - `autobyteus-application-frontend-sdk/node_modules`
- Temporary backend/frontend runtime data and browser scripts under `/tmp/autobyteus-workspace-run-visibility-e2e` were removed after screenshots were copied.
- Temporary Nuxt generated `.nuxt` directory was removed.
- Temporary backend/frontend processes were stopped cleanly.

## Dependencies Mocked Or Emulated

- Durable frontend tests mock stores/GraphQL as their existing unit/component design requires.
- Backend E2E tests use test SQLite setup and resolver/service mocks where already present in those test files.
- Real browser smoke did not mock the app boundary: it used running backend, running Nuxt frontend, GraphQL/REST proxy, and file-explorer websocket connections. It did not send a real LLM prompt.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First execution round. |

## Scenarios Checked

1. Targeted backend GraphQL E2E: workspace scoped history, temp history, temp remove rejection, filesystem remove/re-add behavior.
2. Targeted frontend durable tests: projection/read model, sidebar history component, selector/config run panel, local run source/dedupe.
3. Server build typecheck and full server build for runnable `dist/app.js`.
4. Fresh backend data startup and migrations.
5. Direct GraphQL probe before UI launch:
   - `workspaces` returned only `temp_ws_default`.
   - `workspaceRunHistory(temp_ws_default)` returned a group for the temp root.
6. Real browser first page:
   - `/agents` loaded against the backend.
   - Sidebar displayed `Workspaces -> Temp Workspace`.
   - No `Remove from Workspaces` action was present for the temp row in the inspected button set.
7. Real browser temp Run Agent:
   - Opened config from Memory Compactor agent card.
   - Selected model `qwen3.5-27b:lmstudio@localhost:1234`.
   - `Run Agent` created and revealed `New - Memory Compactor` under `Temp Workspace`.
8. Real browser New workspace Run Agent:
   - New mode had no Load button.
   - Helper said `Path will be loaded when you run: /tmp/autobyteus-workspace-run-visibility-e2e/workspace-new`.
   - `Run Agent` was enabled before explicit preload.
   - Backend created/registered `workspace-new`.
   - Sidebar revealed `workspace-new -> Memory Compactor (1) -> New - Memory Compactor`.
   - Follow-up GraphQL `workspaces` returned both the registered filesystem workspace and `temp_ws_default`.

## Passed

- Backend targeted Vitest: 2 files / 14 tests passed.
- Frontend targeted Vitest: 7 files / 149 tests passed.
- Server build typecheck passed.
- Server full build passed.
- Fresh running-backend GraphQL probes passed.
- Real browser temp workspace launch passed.
- Real browser New workspace launch passed.

## Failed

None.

## Not Tested / Out Of Scope

| Scenario | Reason | Risk / Mitigation |
| --- | --- | --- |
| Browser team run start | Fresh isolated minimal backend loaded 0 team definitions, so no team card was available in the real browser smoke. | Durable frontend config tests cover team New-path loading, and projection/read-model tests cover team attachment under visible workspaces. |
| Browser load-failure path | Real success path was prioritized for fresh-user proof. | Durable `RunConfigPanel` tests cover load failure blocking and no run creation. |
| Browser rapid duplicate-click race | Hard to make deterministic in this temporary smoke without adding a durable harness. | Durable config tests and code review cover in-flight launch guard; residual risk is non-blocking. |
| Prompt send / permanent ID promotion in real browser | External model/runtime execution is not needed to prove draft/sidebar reveal. | Permanent local row and history dedupe are covered by durable projection/read-model tests. |

## Blocked

None.

## Cleanup Performed

- Stopped Nuxt dev server.
- Stopped backend server with SIGINT and observed clean shutdown.
- Removed temporary dependency symlinks.
- Removed temporary `/tmp/autobyteus-workspace-run-visibility-e2e` data/scripts after copying screenshots.
- Removed accidental Nuxt `--port` directory from the first incorrect frontend attempt.
- Restored tracked SDK `dist/` files after cleanup caught that they were tracked.

## Classification

No failure classification applies.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

Commands executed:

- `./node_modules/.bin/vitest run tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` from `autobyteus-server-ts` — passed.
- `./node_modules/.bin/vitest run utils/__tests__/runTreeProjection.spec.ts utils/__tests__/runTreeLiveStatusMerge.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/config/__tests__/WorkspaceSelector.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts --config vitest.config.mts` from `autobyteus-web` — passed.
- `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit --pretty false` from `autobyteus-server-ts` — passed.
- `pnpm -C autobyteus-server-ts build` — passed.
- Direct GraphQL probes with `curl` — passed.
- Browser scripts with Playwright-core + Google Chrome — passed for the scenarios listed above.

Expected/non-blocking noise observed:

- KaTeX quirks-mode warnings in Vitest.
- Non-Electron server-store initialization logs in frontend tests.
- Existing intentional terminate-failure console error in history panel test.
- Nuxt/Vite dependency optimization reload during first browser attempt; retried after optimization completed.
- The in-app Browser tool was unavailable (`agent.browsers.list()` returned `[]`), so local Chrome via Playwright-core was used for real-browser execution.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: No implementation failure, requirement gap, or design impact was found. Since API/E2E did not add/update/remove repository-resident durable coverage after code review, the package can proceed to `delivery_engineer`.
