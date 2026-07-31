# API/E2E Execution Coverage Report

- Task: Universal Application Dual-Host Architecture
- API/E2E revision: `API-REV-012`
- Reviewed source revision: `IR-018`
- Source-review gate: `CRR-033` Pass
- Reviewed HEAD: `4266ec7ebd60fbf06981159d6e1f7b0c9e6f6ca5`
- Outcome: `Pass`
- Final confidence: `97%` (`96.6%` unrounded)

## Execution Round Meta

- Triggering role/report: `code_reviewer`, `code-review-report.md`, `CRR-033`.
- Prior result: `API-REV-011`, Pass / 99%.
- Current round: 12.
- Primary scenarios: `APIE2E-REPO-012`, `APIE2E-WORKER-012`, `APIE2E-STANDALONE-012`, `APIE2E-STUDIO-012`, `APIE2E-ROUTES-012`, `APIE2E-PARITY-012`, `APIE2E-CLEANUP-012`.
- Acceptance basis: `REQ-010`, `AC-019`–`AC-023`, plus the preserved dual-host acceptance set.
- Historical `APIE2E-REPO-005`: unchanged, separate, and not attributed to this revision.

## Investigation And Execution Basis

The complete cumulative package, SR-013 supplemental architecture, IR-018 handoff, CRR-033 report, current source/tests, package scripts, development launchers, prior API/E2E reports, and delivery-owned retained evidence were read before execution. Coverage investigation is authoritative at:

`/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`

The round followed narrow-to-broad order: IR-018 gate, stale-fixture validity, durable migrations, affected matrix, builds, real standalone worker/restart flow, real Studio publication/remount, route separation, parity, cleanup.

## Compatibility / Legacy Scope Check

- Current `src` and `tests` contain no `ApplicationEngineHostService` reference.
- The five requested broad-host integration fixtures and six additionally stale affected fixtures were migrated to current narrow contracts.
- No alias, wrapper, compatibility path, broad host, fallback, duplicate runtime, old route, or weakened assertion was introduced.
- No migration was required. Current data readers were exercised across a same-root standalone restart.
- `git diff --check`: Pass.

## Changed Boundary And Evidence Matrix

| Boundary / Scenario | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- |
| `APIE2E-REPO-012` IR-018 continuation | Attempt every exact retained run/cleanup, aggregate at end | 5/22 focused and 31/116 affected tests pass, including later removals/failures and stale replacement | Pass | `api-rev-012-ir018-first-gate.log`, `api-rev-012-affected-server-matrix-pass.log` |
| Stale broad-host fixtures | Preserve assertions through controller/launcher/gateway/narrow projections | 1 helper added; 11 tests updated; broad-host scan clean | Pass | migrated fixture and final matrix logs |
| `APIE2E-WORKER-012` | Worker exit during active provider run is followed by ensure/restart and successful artifact delivery | Old worker PID 34533 exited while binding was attached; replacement worker PID 39934 appeared; actual tools published researcher/writer files; UI reached `in_review` with 2 outputs/1 final | Pass | worker-exit/restart log, browser JSON/PNG, actual-tools and projection JSON |
| Artifact delivery ordering | Accepted commands drain before engine stop; ensure precedes handler invoke | Direct delivery/lifecycle tests pass in affected matrix; live post-exit publication reaches projection | Pass | affected matrix and worker recovery evidence |
| Actual Agent Tools | Real authenticated `publish_artifacts` and recipient-name `send_message_to` | Researcher and writer publication results succeeded; researcher message was delivered to `writer`; revisions projected | Pass | standalone/studio actual-tools JSON and projection JSON |
| Active multi-run stop | Graceful close stops worker/run children and listener without skipping later runs | Three attached team bindings recorded, including two newly launched runs; after SIGINT port and all owned host/worker/Codex PIDs were gone | Pass | active-multirun before/after logs |
| Standalone restart/recovery | Same data root restores current records/runs, invalidates old session, and remains functional | Three mixed teams restored; prior records visible; fresh post-restart run completed in 109s with 2 artifacts; old session returned `404 session_unavailable` | Pass | restart log, postrestart browser JSON/PNG, old-session log |
| Studio setup/business run | Exact package resource/defaults enter one iframe and complete | Brief Studio Team plus researcher/writer Codex/Luna defaults; actual two-member run, handoff, 2 artifacts, `in_review` | Pass | Studio run JSON, actual-tools and projection JSON |
| Studio explicit remount | Fresh launch ID, exactly one iframe, persisted projection remains | `iframe-launch-1` changed to `iframe-launch-2`; iframe count stayed 1; completed Brief remained visible | Pass | `api-rev-012-studio-remount.json` and PNG |
| Internal/external MCP separation | Internal route exists in both; external gateway Studio-only | Both internal unauthenticated probes returned 401; standalone `/mcp/gateway` 404; Studio gateway initialized 200 | Pass | route-separation log |
| Package integrity | Both hosts leave exact maintained package/authoring bytes unchanged | 73/73 SHA-256 rows identical before/after; no staging/previous/temp pack residue | Pass | pre/post hashes and package-integrity log |
| Cleanup | No owned listener/process/data/probe leak | 43126/8010/3010 clear; all owned roots/probes absent; unrelated 8000 and Codex processes retained | Pass | cleanup log |

## Additional Repository Coverage Execution

| Check | Result | Evidence |
| --- | --- | --- |
| IR-018 manager/registry/resource/shutdown/lifecycle | 5 files / 22 tests Pass | `api-rev-012-ir018-first-gate.log` |
| Requested migrated integrations plus WS session unit | 6 files / 15 tests Pass | `api-rev-012-migrated-fixtures-pass.log` |
| Availability and relay units | 2 files / 10 tests Pass | `api-rev-012-stale-narrow-unit-rerun.log` |
| Final affected server selection | 31 files / 116 tests Pass | `api-rev-012-affected-server-matrix-pass.log` |
| Server build-config TypeScript no-emit | Pass | `api-rev-012-server-tsc.log` |
| Devkit build/test | 20/20 Pass | `api-rev-012-build-maintained-app-matrix.log` |
| Server full build | Pass | same build matrix log |
| Frontend SDK build | Pass | same build matrix log |
| Brief build / validate / backend typecheck | Pass | same build matrix log |
| Socratic build / validate / backend typecheck | Pass | same build matrix log |
| Retired symbol scan / diff check | Pass | final repository audit |

The initial baseline failures were caused by test-owned stale constructors/options and were corrected without production source changes. They are retained as validity evidence, not counted as product failures.

## Validation Confidence Scorecard (Mandatory)

| Category | Score | Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 96% | AC-019–023 mapped to direct repository and live results | No material unresolved criterion |
| Changed-boundary execution directness | 98% | Exact manager/registry/queue/controller/launcher plus real worker exit and session rejection | Only internal timing is inferred from correlated PID/tool/projection evidence where no public hook exists |
| Cross-boundary integration realism and mock gap | 98% | Real CLI, HTTP, WS/MCP, workers, provider, SQLite, browser, iframe, handoff, projection | No production deployment/multi-node exercise, outside scope |
| Environment/configuration/identity/fixture fidelity | 96% | Current worktree, exact package-owned IDs/defaults, isolated data, system Chrome | Studio used alternate isolated ports because user-owned 8000 remained protected |
| Failure/edge/lifecycle/recovery evidence | 97% | Stop-all failure continuation, worker exit, multi-run stop, old-session rejection, same-root recovery, cleanup | Live queue drain is correlated with direct durable ordering tests rather than externally instrumented |
| User-surface/browser/desktop-shell confidence | 96% | Real standalone and Studio browser journeys plus iframe remount | Electron shell not run because no shell-specific surface changed |
| Durable regression quality and relevance | 95% | Current narrow contracts, reusable helper, preserved behavior assertions, no obsolete host | Proportional test-code review pending |

- Calculation: `(96+98+98+96+97+96+95)/7 = 96.57%`, rounded to `97%`.
- Every critical acceptance criterion directly proven: Yes.
- Any applicable category below 90%: No.
- Clean confidence target met: Yes.

## Broader Validation Decision And Execution

- Decision: `Required — executed and passed`.
- Why: repository tests alone could not prove the real provider, process exit, authenticated tool dispatch, iframe remount, same-data restart, or exact package immutability.
- Execution modes: CLI, live API, system Chrome/Playwright Core, read-only SQLite correlation, PID/listener lifecycle, SHA-256 parity.
- Result: Pass.
- Confidence gain: 94% repository-only to 97% final.

## Desktop Application Validation (When Applicable)

The relevant desktop renderer behavior is web-equivalent and was exercised in the real Nuxt browser host. No Electron preload/IPC/window/packaging change exists in IR-018. Electron execution was therefore not required and no shell claim is made.

## Platform / Runtime Targets

- macOS arm64
- Node 22
- pnpm workspace
- Chrome 150 via Playwright Core
- standalone host: 127.0.0.1:43126
- isolated Studio backend/frontend: 127.0.0.1:8010 and 127.0.0.1:3010
- runtime/model: package-owned `codex_app_server` / `gpt-5.6-luna`
- exact current Brief package and maintained Socratic build/validate boundary

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

1. Killed the exact application worker while the real Brief researcher run and binding were active.
2. Observed a replacement application worker before the recovered publication path completed.
3. Started two additional real team runs, stopped the standalone host while all three bindings were attached, and verified no owned listener/child remained.
4. Restarted the host on the same data root, observed recorded team recovery, retained app records, and a successful fresh post-restart run.
5. Probed a pre-restart internal Agent Tools session ID after restart and observed `404 session_unavailable`.
6. Remounted Studio from iframe launch 1 to launch 2 and observed one iframe with the same completed app projection.
7. Verified exact 73-path bytes were unchanged and removed all owned runtime data/probes.

## Tests Implemented Or Updated

Added:

- `autobyteus-server-ts/tests/integration/application-backend/application-engine-test-runtime.ts`

Updated:

- `autobyteus-server-ts/tests/integration/application-backend/application-backend-custom-websocket.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/application-backend-rest-ws.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- `autobyteus-server-ts/tests/unit/application-backend-api-gateway/application-backend-websocket-session-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-availability-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-published-artifact-relay-service.test.ts`
- `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/standalone-application-server.integration.test.ts`

Reconciled and executed from IR-018 without API-owned modification:

- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts`

## Tests Removed As Stale Or Obsolete

None. Obsolete fixture setup was replaced; behavior assertions remain.

## Durable Coverage Changed In The Codebase

- 1 reusable integration helper added.
- 11 durable test files updated.
- 0 production source files changed.
- 0 tests skipped, disabled, weakened, or removed.
- The API/E2E durable delta remains unstaged for proportional review, matching the established team workflow.

## Other Execution Artifacts

Primary evidence directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e`

Key artifacts:

- `api-rev-012-affected-server-matrix-pass.log`
- `api-rev-012-build-maintained-app-matrix.log`
- `api-rev-012-standalone-worker-exit-restart.log`
- `api-rev-012-standalone-worker-recovery-browser.json`
- `api-rev-012-standalone-actual-tools.json`
- `api-rev-012-standalone-publication-projection.json`
- `api-rev-012-active-multirun-before-stop.log`
- `api-rev-012-active-multirun-after-stop.log`
- `api-rev-012-standalone-postrestart-run.json`
- `api-rev-012-old-session-after-restart.log`
- `api-rev-012-studio-real-run-remount.json` (business run passed; its final reload locator was a temporary harness miss superseded by the dedicated passing remount artifact)
- `api-rev-012-studio-remount.json`
- `api-rev-012-studio-actual-tools.json`
- `api-rev-012-studio-publication-projection.json`
- `api-rev-012-route-separation-postrestart.log`
- `api-rev-012-package-integrity.log`
- `api-rev-012-cleanup.log`

## Temporary Execution Methods / Scaffolding

Temporary Playwright and process-monitor harnesses were created under `autobyteus-application-devkit/.tmp-api-rev012`, used only for live evidence, and removed. The first combined Studio business/remount harness correctly completed the real business run but looked for `Reload application` before opening the host-controls panel; a focused corrected harness opened `Open host controls` and passed launch-ID/state remount assertions. This was an API/E2E harness correction, not a production failure.

A first Studio backend setup attempt inherited the user's process-level data variables. It was stopped before package import/business execution. The authoritative run explicitly overrode every data/database/server/log/memory/workspace value and used `/tmp/api-rev012-studio-data2`.

## Dependencies Mocked Or Emulated

- Repository unit/integration tests use their existing focused fakes where appropriate.
- Broader validation used no fake provider, no direct application/SQLite write, no direct artifact injection, and no manual binding creation.
- Read-only SQLite queries were used only to correlate public UI/tool/process results.
- Real package-owned Codex/Luna runs executed `publish_artifacts` and `send_message_to`.

## Result Summary

`Pass`.

IR-018 continuation and the SR-013 acyclic framework preserve the real dual-host behavior. Current narrow fixtures pass, live worker exit recovers before successful publication, actual Agent Tools publication/handoff/projected artifacts succeed in both hosts, active runs stop and recover, old sessions cannot dispatch, Studio remounts one iframe with preserved state, internal/external MCP boundaries remain distinct, all 73 maintained bytes remain identical, and cleanup is leak-free.

## Cleanup Performed

- Stopped owned standalone, Studio package watcher, Nuxt, and Studio backend processes.
- Closed all controlled Chrome instances.
- Verified ports 43126, 8010, and 3010 had no listener.
- Verified all owned host/worker/Codex child PIDs exited.
- Removed `/tmp/api-rev012-standalone-data`, `/tmp/api-rev012-studio-data`, `/tmp/api-rev012-studio-data2`, and `.tmp-api-rev012`.
- Verified no Brief staging/previous/temp pack residue.
- Preserved user-owned port 8000 and unrelated Codex processes.
- Preserved other roles' dirty artifacts and untracked devkit outputs exactly as received.

## Preliminary Classification

- Result classification: `Pass`.
- Implementation defect: none observed.
- Requirement/design gap: none observed.
- API/E2E local fixes: stale durable fixtures and one temporary remount locator corrected within this stage.
- Historical `APIE2E-REPO-005`: remains `Unclear`, separate, and not reclassified.

## Recommended Recipient

`code_reviewer` for the separate proportional durable-test review. Delivery must not resume until that review passes or records the appropriate result.

## Evidence / Notes

The Nuxt dev process emitted transient `#app-manifest` pre-transform messages during validation-controlled restart/shutdown activity after an earlier discarded frontend invocation. The real Studio route, iframe, business run, and corrected remount all passed, and the maintained build matrix passed; no requirement-linked failure was observed or attributed to IR-018.

## Latest Authoritative Result

- API/E2E outcome: `Pass`
- Confidence: `97%`
- Broader validation: `Required — executed and passed`
- Durable changes awaiting proportional review: 1 added helper + 11 updated tests
- Open API/E2E blocker: none
- Next stage: `code_reviewer` proportional test-code review
