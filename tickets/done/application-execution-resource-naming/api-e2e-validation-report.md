# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/design-spec.md`
- No-Migration Rework Summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/solution-design-rework-no-migration.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/review-report.md`
- Current Validation Round: 4
- Trigger: code-review Round 7 pass after the API/E2E Round 3 live frontend blocker fix; rerun the live Brief Studio browser flow and update validation sign-off.
- Prior Round Reviewed: Round 3 blocker report and code-review Round 7 pass.
- Latest Authoritative Round: 4

Round rules:

- Scenario IDs from earlier rounds were reused where they still apply.
- Round 4 is the current authoritative API/E2E result and supersedes the Round 3 blocked result.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial post-code-review API/E2E validation | N/A | Superseded after user clarified no migrations at all | Superseded / invalid as current sign-off | No | Round 1 treated private store migration as acceptable based on then-current design; user later clarified no public or private migrations. |
| 2 | Code-review Round 6 pass after no-migration rework | Round 1 migration-era assumption; CR-003/CR-004 context | None | Pass | No | Focused API/runtime/web unit/integration/static validation passed. No durable validation code was added or updated by API/E2E. |
| 3 | Live server/frontend Brief Studio validation with Codex GPT-5.5 | Round 2 selected scenarios for app package, REST config, hosted backend launch | VAL-011 live frontend app detail/setup route crashed when opening Brief Studio | Blocked / Local Fix required | No | Backend REST/configuration and hosted backend launch path worked, but the requested live frontend proof was blocked by a Vue prop-binding crash. |
| 4 | Code-review Round 7 pass after VAL-011 local fix | VAL-011 live frontend setup-route crash | None | Pass | Yes | Live Brief Studio route opens, setup gate renders, iframe app loads, and hosted backend run with Codex GPT-5.5 produced projected research/final artifacts. |

## Validation Basis

Validated against:

- Corrected no-migration requirements/design and the no-migration rework summary.
- Code review Round 7 pass, which verified the implementation fix for VAL-011:
  - parent component now passes `:available-resources="availableResources"`;
  - child component declares `availableResources`;
  - focused web coverage mounts the real slot editor and verifies bundled/shared resource choices render;
  - prior CR-001 through CR-004 remain resolved.
- User-requested live validation path: build Brief Studio, build/start the server, start the Nuxt frontend, configure Brief Studio to use Codex runtime/model `codex_app_server` / `gpt-5.5`, open Brief Studio in the browser, enter the application, and verify the app/backend run path.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Evidence from the corrected focused validation remains valid for no-migration behavior:

- Configured execution-resource stale JSON rows with old top-level `owner` / `resourceRef` are deleted rather than converted.
- Run-binding summaries with old `resourceRef` or `executionResourceRef.owner` are dropped rather than hydrated, rewritten, or exposed.
- Valid new refs whose identity values equal `owner` or `resourceRef` are preserved.
- Old public manifest keys remain only as manifest-boundary rejection guards in source and negative/rejection tests.
- Round 4 did not observe or introduce compatibility wrappers, dual-path reads/writes, schema-upgrade shims, or legacy fallback behavior.

## Validation Surfaces / Modes

- Focused web regression test rerun for the implementation-fixed setup panel.
- Build validation for the Brief Studio importable package.
- Build validation for the server executable.
- Live server startup with a fresh temp data directory and imported Brief Studio package.
- Live Nuxt frontend startup against the local server.
- Live REST validation for execution-resource list/config/save endpoints.
- Live GraphQL validation for app discovery and Codex model catalog.
- Live Browser validation for the application list, Brief Studio detail/setup route, setup gate, and app iframe load.
- Live Brief Studio hosted-backend GraphQL validation for brief creation, Codex GPT-5.5 team-run launch, artifact generation, and app-owned projection.

## Platform / Runtime Targets

- Local macOS host.
- Node.js `v22.21.1`; pnpm `10.28.2`.
- Server runtime: `node autobyteus-server-ts/dist/app.js`.
- Frontend runtime: `pnpm -C autobyteus-web dev --host 127.0.0.1 --port 3000`.
- Codex CLI observed earlier in live validation context: `codex-cli 0.128.0`.
- Round 4 live temp root: `/tmp/autobyteus-live-brief-studio-r4-R9JtPB`.
- Server: `http://127.0.0.1:8123`.
- Frontend: `http://127.0.0.1:3000`.

## Lifecycle / Upgrade / Restart / Migration Checks

- No-migration stale-state behavior was not re-run in live mode in Round 4; it remains covered by Round 2 focused stale-state validation and code-review Round 7 reconfirmation of CR-003/CR-004.
- Round 4 exercised live application package loading, setup persistence, setup-gated frontend entry, hosted backend brief creation, Codex team-run binding creation, artifact publication, and projection back into the Brief Studio app-owned data model.
- Full Electron installer/update/restart flows are out of scope for this naming refactor and were not run.

## Coverage Matrix

| Scenario ID | Requirement / Risk | Validation Mode | Evidence | Result |
| --- | --- | --- | --- | --- |
| VAL-001 | Manifest imports accept `executionResourceSlots` / `defaultExecutionResourceRef.source`; old public manifest keys reject | Round 2 bundle-provider unit tests plus static first-party manifest checks | `file-application-bundle-provider.test.ts`; manifest static search | Pass in Round 2; not rerun in Round 4 |
| VAL-002 | REST API exposes execution-resource list/configuration/save endpoints using new payload names | Round 4 live REST probes plus Round 2 REST route tests | Live `GET available-execution-resources`, `GET execution-resource-configurations`, `PUT execution-resource-configurations/draftingTeam` | Pass |
| VAL-003 | Configuration service validates defaults, saves, invalid saved config, stale default, and launch profiles under new names | Round 4 live config save plus Round 2 service tests | Live config persisted `executionResourceRef.source: "bundle"` and launch profile `codex_app_server` / `gpt-5.5` | Pass |
| VAL-004 | Resolver lists bundle/shared AGENT/AGENT_TEAM resources with `source` discriminator | Round 4 live REST probe plus Round 2 resolver unit test | Live available-resource response included bundle and shared resources with `source` | Pass |
| VAL-005 | Runtime-control/backend `getConfiguredExecutionResource` and `startRun({ executionResourceRef })` preserve launch behavior | Round 4 live hosted backend launch plus Round 2 host/engine/integration tests | `launchDraftRun` returned `status: "ATTACHED"`; metadata recorded team members on `codex_app_server` / `gpt-5.5` | Pass |
| VAL-006 | No-migration stale state: old configured-resource keys reset/delete; old run-binding keys drop/delete; no false-positive deletion for valid new values | Round 2 stale-state unit tests plus static predicate/helper searches | `application-execution-resource-stale-state.test.ts`; static searches | Pass in Round 2; not rerun in Round 4 |
| VAL-007 | Web setup loads/saves execution-resource setup and handles setup state | Round 4 focused web regression plus live browser setup route | `ApplicationLaunchSetupPanel.spec.ts` passed; live setup route rendered without crash | Pass |
| VAL-008 | First-party package/vendor outputs contain `execution-resources` artifacts and no stale `runtime-resources` artifacts | Round 4 Brief Studio build/package load plus Round 2 static package checks | `pnpm -C applications/brief-studio build` passed; server loaded importable package | Pass |
| VAL-009 | SDK/backend SDK/app backend contracts compile against new execution-resource terminology | Round 2 SDK/build/typechecks; Round 4 server build | SDK contracts test, backend SDK build, server TS build check, app backend TS checks | Pass in Round 2; server build rerun in Round 4 passed |
| VAL-010 | No active old runtime-resource names, aliases, or migration helpers remain | Round 2 static searches; Round 7 code-review grep for old web prop binding | no active old runtime-resource hits; no old web `:available-execution-resources` binding remains | Pass |
| VAL-011 | Live Brief Studio frontend app route should open after server/frontend startup | Round 4 live Browser test | `/applications` rendered Brief Studio; detail/setup route rendered `Launch setup`, `Brief Studio`, saved `gpt-5.5` config, and `Enter application`; no Nuxt 500 | Pass |
| VAL-012 | Live Brief Studio hosted backend can create a draft and attach a Codex GPT-5.5 team run | Round 4 live hosted-backend GraphQL mutation | `createBrief` succeeded; `launchDraftRun` returned attached binding/run; run metadata recorded `gpt-5.5` | Pass |
| VAL-013 | Live Brief Studio app-owned artifact projection works for the Codex GPT-5.5 run | Round 4 live workspace/file check plus hosted-backend detail query | `research.md` and `final-brief.md` were created; `brief` detail showed `status: "in_review"` and projected researcher/writer artifacts | Pass |

## Test Scope

Round 4 specifically rechecked the Round 3 live frontend blocker and the end-to-end Brief Studio app path requested by the user. It did not replace the full focused automated validation from Round 2; it layered live process/browser/app-run validation on top of the Round 7 reviewed fix.

## Validation Setup / Environment

Round 4 commands and setup:

```bash
pnpm -C autobyteus-web exec vitest run \
  components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts \
  --reporter dot

pnpm -C applications/brief-studio build
pnpm -C autobyteus-server-ts build

LIVE_ROOT=/tmp/autobyteus-live-brief-studio-r4-R9JtPB
DATA_DIR=$LIVE_ROOT/server-data
WORKSPACE_DIR=$LIVE_ROOT/codex-workspace

cat > "$DATA_DIR/.env" <<'ENV'
APP_ENV=production
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8123
DB_TYPE=sqlite
LOG_LEVEL=INFO
PRISMA_LOG_QUERIES=0
DISABLE_HTTP_REQUEST_LOGS=true
ENABLE_APPLICATIONS=true
AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/applications/brief-studio/dist/importable-package
CODEX_APP_SERVER_SANDBOX=danger-full-access
CODEX_APP_SERVER_MODEL=gpt-5.5
CODEX_APP_SERVER_REQUEST_TIMEOUT_MS=300000
ENV

unset DATABASE_URL AUTOBYTEUS_SERVER_HOST APP_ENV DB_TYPE LOG_LEVEL PRISMA_LOG_QUERIES DISABLE_HTTP_REQUEST_LOGS ENABLE_APPLICATIONS AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS CODEX_APP_SERVER_SANDBOX CODEX_APP_SERVER_MODEL CODEX_APP_SERVER_REQUEST_TIMEOUT_MS
set -a; . "$DATA_DIR/.env"; set +a
node autobyteus-server-ts/dist/app.js --data-dir "$DATA_DIR" --host 127.0.0.1 --port 8123

BACKEND_NODE_BASE_URL=http://127.0.0.1:8123 \
  pnpm -C autobyteus-web dev --host 127.0.0.1 --port 3000
```

Live setup/configuration evidence:

- `applicationsCapability.enabled: true`, `source: SERVER_SETTING`.
- `listApplications` returned `Brief Studio` with one required `draftingTeam` slot and bundled `brief-studio-team` resource.
- Codex model catalog for `codex_app_server` returned `gpt-5.5` among six models.
- `GET /rest/applications/:applicationId/available-execution-resources` returned bundle and shared resources with `source`.
- `GET /rest/applications/:applicationId/execution-resource-configurations` returned `draftingTeam`, `allowedExecutionResourceSources`, and `defaultExecutionResourceRef.source`.
- `PUT /rest/applications/:applicationId/execution-resource-configurations/draftingTeam` returned `status: "READY"` with:
  - `executionResourceRef: { source: "bundle", kind: "AGENT_TEAM", localId: "brief-studio-team" }`
  - `defaults.runtimeKind: "codex_app_server"`
  - `defaults.llmModelIdentifier: "gpt-5.5"`
  - `defaults.workspaceRootPath: "/tmp/autobyteus-live-brief-studio-r4-R9JtPB/codex-workspace"`

## Tests Implemented Or Updated

API/E2E did not add or update repository-resident durable validation in Round 4.

Implementation-owned durable validation was updated before code-review Round 7 and reviewed there:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts`

Round 4 reran the focused regression test:

- `pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts --reporter dot` — Pass: 1 file, 2 tests.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round by API/E2E: `No`
- Paths added or updated by API/E2E: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-validation code review artifact: code-review Round 7 already reviewed the implementation-owned regression test and prop-binding fix before this API/E2E rerun.

## Other Validation Artifacts

- This updated authoritative validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/api-e2e-validation-report.md`
- Round 4 browser screenshot evidence: `/Users/normy/.autobyteus/browser-artifacts/47d9ab-1778256087602.png`

## Temporary Validation Methods / Scaffolding

- Live temp data/workspace root: `/tmp/autobyteus-live-brief-studio-r4-R9JtPB`
- Live SQLite DB was created under the temp data dir.
- Live Codex workspace artifacts were created under `/tmp/autobyteus-live-brief-studio-r4-R9JtPB/codex-workspace`.
- No repository-resident temporary source files were intentionally created.
- One temporary hosted-backend GraphQL probe used the wrong REST envelope and returned a 500 response (`Cannot read properties of undefined (reading 'variables')`). The probe was corrected to the expected `{ request: { query, variables } }` envelope and the application operations passed. This was a validation-script error, not a product failure.

## Dependencies Mocked Or Emulated

- Round 4 did not mock the server/frontend/application package boundary.
- Round 4 used the local Codex app-server runtime configuration and model `gpt-5.5`.
- Full external model-quality evaluation was not in scope; the validation checked live run creation, member runtime/model metadata, artifact generation, and app-owned projection.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Migration-era API/E2E sign-off treated private persisted-data migration as acceptable | Requirement Gap / Design Impact after user clarification | Resolved by upstream no-migration rework, implementation rework, code review Round 6 pass, and Round 2 validation | `solution-design-rework-no-migration.md`; `design-review-report.md`; `review-report.md`; stale-state tests passed | Round 1 remains historical blocker context only. |
| 1 | VAL-006 previously validated `owner` -> `source` and `resourceRef` -> `executionResourceRef` migration success | Invalid under corrected requirement | Replaced by no-migration reset/drop validation | `application-execution-resource-stale-state.test.ts` passed in Round 2; forbidden migration helper/test-success search returned no hits | Current VAL-006 is reset/drop, not migration. |
| 2 | Round 2 stated live browser/manual click-through was not run | Residual untested live frontend path | Tested in Round 3 and initially failed; retested in Round 4 and passed after implementation fix | Round 4 Browser validation opened `/applications`, setup route, and app iframe | Supersedes Round 3 blocker. |
| 3 | VAL-011 live frontend app detail/setup route crashed with `Cannot read properties of undefined (reading 'filter')` | Local Fix to `implementation_engineer` | Resolved | Code-review Round 7 pass; parent binding now `:available-resources`; focused test passed; live route rendered setup gate and entered app without Nuxt 500 | No new frontend failures observed. |

## Scenarios Checked

### VAL-002 / VAL-003 / VAL-004 — Live REST execution-resource setup API

- `GET /rest/applications/:applicationId/available-execution-resources` returned bundle and shared resources using the new `source` discriminator.
- `GET /rest/applications/:applicationId/execution-resource-configurations` returned the `draftingTeam` slot, `allowedExecutionResourceSources`, and `defaultExecutionResourceRef.source`.
- `PUT /rest/applications/:applicationId/execution-resource-configurations/draftingTeam` persisted:
  - `executionResourceRef: { source: "bundle", kind: "AGENT_TEAM", localId: "brief-studio-team" }`
  - launch profile defaults `runtimeKind: "codex_app_server"`, `llmModelIdentifier: "gpt-5.5"`, `workspaceRootPath: "/tmp/autobyteus-live-brief-studio-r4-R9JtPB/codex-workspace"`
  - member profiles for `researcher` and `writer`.
- Save response returned `status: "READY"`.

### VAL-011 — Live frontend Brief Studio route

- Browser opened `http://127.0.0.1:3000/applications`.
- The application list rendered the `Brief Studio` card and `Open app →` action.
- Clicking the Brief Studio card navigated to the app detail route.
- The detail/setup route rendered without the Round 3 Nuxt 500 crash.
- The page showed `Launch setup`, `Brief Studio`, the `draftingTeam` setup area, saved workspace path, and `Enter application`.
- Clicking `Enter application` loaded the Brief Studio iframe app. Screenshot evidence showed the app UI with `Brief Workflow`, `Brief Studio`, `Create`, and the host controls button.

### VAL-005 / VAL-012 / VAL-013 — Live hosted backend launch, Codex GPT-5.5 execution, and app-owned projection

- Server GraphQL `listApplications` discovered `Brief Studio` from the importable package.
- Runtime/model discovery for `codex_app_server` included `gpt-5.5`.
- Brief Studio hosted backend GraphQL `createBrief` returned:
  - `briefId: brief-6af4e38b-6f1f-4c4b-88e8-d4be8a1865bb`
  - title `Round 4 live Codex GPT-5.5 validation 2026-05-08T16:02:37.349Z`
  - initial `status: "not_started"`
- `launchDraftRun` returned:
  - `bindingId: 1886f30a-f7a4-43de-a250-0e01a8687f52`
  - `runId: team_bundle-team-6170706c69636174696f6e2d6c6f_95ffc542`
  - `status: "ATTACHED"`
- Team run metadata at `/tmp/autobyteus-live-brief-studio-r4-R9JtPB/server-data/memory/agent_teams/team_bundle-team-6170706c69636174696f6e2d6c6f_95ffc542/team_run_metadata.json` recorded both `researcher` and `writer` with:
  - `runtimeKind: "codex_app_server"`
  - `llmModelIdentifier: "gpt-5.5"`
  - `workspaceRootPath: "/tmp/autobyteus-live-brief-studio-r4-R9JtPB/codex-workspace"`
- Workspace artifacts were created:
  - `/tmp/autobyteus-live-brief-studio-r4-R9JtPB/codex-workspace/brief-studio/research.md`
  - `/tmp/autobyteus-live-brief-studio-r4-R9JtPB/codex-workspace/brief-studio/final-brief.md`
- A final hosted-backend `brief` detail query returned:
  - `status: "in_review"`
  - `latestBindingStatus: "ATTACHED"`
  - `lastErrorMessage: null`
  - projected researcher artifact with `publicationKind: "research"`
  - projected writer artifact with `publicationKind: "final"`

## Passed

- Focused setup-panel regression test: passed (`1` file, `2` tests).
- `pnpm -C applications/brief-studio build`: passed.
- `pnpm -C autobyteus-server-ts build`: passed.
- Live server started on `127.0.0.1:8123` with the Brief Studio importable package loaded.
- Live frontend started on `127.0.0.1:3000` with backend proxy pointed at the live server.
- Live REST execution-resource listing/configuration/save worked with `source` and `executionResourceRef` naming.
- Live Codex model catalog contained `gpt-5.5`.
- Live Brief Studio setup page rendered without the Round 3 crash.
- Live Brief Studio iframe app loaded.
- Live Brief Studio hosted backend `createBrief` and `launchDraftRun` worked through attached binding/run creation.
- Live Codex GPT-5.5 team run produced workspace artifacts and Brief Studio projected them into the app-owned brief detail.

## Failed

None.

## Not Tested / Out Of Scope

- Full Electron desktop packaging/install/restart/update flows were not in scope for this naming refactor and were not run.
- Full repository test suites were not run; validation used focused suites in Round 2 plus Round 4 live server/frontend/app-run validation.
- External SDK consumers were not tested; release-note impact remains a delivery/documentation concern.
- Model-quality evaluation of GPT-5.5 output is outside this refactor validation; Round 4 only proves the configured runtime/model path and Brief Studio run/projection workflow.

## Blocked

None.

## Cleanup Performed

- Closed the Browser tab used for Round 4 validation.
- Stopped the live server process on port `8123`.
- Stopped the live Nuxt frontend process on port `3000`.
- Verified no listeners remained on ports `8123` or `3000`.

## Classification

No validation failures remain. No failure classification applies.

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

- Round 4 supersedes the Round 3 blocked API/E2E result as the current sign-off.
- API/E2E did not add or update repository-resident durable validation in Round 4; the implementation-owned web regression test was already reviewed and passed in code-review Round 7. Therefore no additional code-review loop is required before delivery.
- Delivery should treat Round 1 and Round 3 as historical blocker context only; this report is the latest authoritative validation result.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Corrected no-migration implementation plus the Round 7 frontend local fix passed focused and live API/E2E validation. Route to `delivery_engineer`.
