# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/requirements-doc.md` (`RER-002`, Approved).
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/investigation-notes.md`.
- Requirements Revision Record: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/requirements-revision-record.md`.
- Design Spec: `N/A — not applicable` for the direct route.
- Supplemental Task Artifacts: the two approved current-state PNGs listed in the requirements package.
- Architecture Design Revision Record: `N/A — not applicable` for the direct route.
- Design Review Report: `N/A — not applicable` for the direct route.
- Architecture Review Revision Record: `N/A — not applicable` for the direct route.
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/implementation-handoff.md` (`IR-001`).
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/implementation-revision-record.md`.
- Code Review Report: `N/A — not applicable` for the direct low-risk route.
- Code Review Revision Record: `N/A — not applicable`.
- Delivery Revision Record: `N/A — initial validation ingress`.
- Relevant Delivery Revision IDs: `N/A`.
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/api-e2e-revision-record.md`.
- Current API/E2E Revision ID: `API-REV-001`.
- API/E2E Test-Case Ledger: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/api-e2e-test-case-ledger.md`.
- Current Investigation Round: 1.
- Trigger: Implementation Engineer direct API/E2E handoff for commit `0fe66d05bf1b2448030ad46ec215f1716a5d54a4`.
- Prior Investigation Reviewed: `N/A — no prior API/E2E result exists`.
- Latest Authoritative Investigation: this file.

## Routing Classification

- Task size: `Small`.
- Architectural risk: `Low`.
- Input route: `Direct Low-Risk`.
- Successful-output route: `Delivery`.
- Proportional test-code review decision: `Not Required — direct low-risk route`.

## Current Requirement And Design Basis

The approved behavior is limited to standalone Agent runs. A current or manager-owned run may report health `Error` while lifecycle activity remains true. Such a row must retain its red Error presentation and the existing localized native Stop button; Error alone must not make it inactive. A confirmed-inactive persisted row that retains past Error evidence must remain non-stoppable. Stop must continue to dispatch once for the exact run, isolate the row-selection click, disable only the exact action while pending, retain history and expose inactive actions after confirmed success, and remain visibly errored/retryable with the existing toast after `success: false`, GraphQL error, or thrown/transport failure. Team behavior, backend contracts, persistence, authentication, and Electron-shell behavior do not change.

The implementation separates health from lifecycle in the two existing frontend projection boundaries and reuses the existing mutation owner. Its compatibility check is clean and its persisted-data decision is `Not Affected`; no legacy path, migration, or fallback is approved or present.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`; `REQ-001`, `REQ-002`, `REQ-006`, `REQ-007` | Changed | Approved requirements plus `IR-001` | Prove active Error remains red and stoppable, while inactive Error remains non-stoppable, across server projection, frontend read model, DOM, and accessibility output. |
| `BEH-002`; `REQ-003`–`REQ-005` | Preserved and extended to Error | Approved requirements plus existing termination owner | Prove exact-run dispatch, pending isolation, success/inactive transition, history retention, false/GraphQL/transport failure truthfulness, toast, and retryability. |
| Agent Team behavior | Preserved / out of scope | Scope guardrail and `AC-006` | Retain existing regression assertions; do not add a Team termination path. |
| Backend status and termination contracts | Preserved | Requirements external-contract evidence | Add a deterministic executable contract journey proving an actual manager-owned Error runtime is listed active and the actual GraphQL termination result makes it inactive. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Backend contract is consumed, not changed | Status-projection, manager, termination-service, and GraphQL tests | Current tests do not join Error projection and termination into one executable journey | Deterministic live GraphQL/API lifecycle test |
| API / transport / contract | No contract change; behavior relied upon | Existing history query and `terminateAgentRun` mutation | Frontend store tests and backend GraphQL/runtime suites | Existing evidence does not prove the Error-active response and post-termination response in one case | Live in-process GraphQL execution using real manager/services |
| Frontend component / state | Yes | `runHistoryReadModel`, `runTreeLiveStatusMerge`, row action accessibility | 73 focused implementation tests | Unit DOM does not prove browser keyboard/event/network timing | Durable Chromium probe |
| Browser integration / user journey | Yes | Web-equivalent workspace history row | Temporary implementation inspection only | No durable independent browser evidence | Durable self-starting Chromium probe |
| Authentication / session / permissions | No | None | N/A | None for this public local lifecycle contract | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer reused by Electron | Same Vue component and prior browser inspection | Shell is irrelevant, but responsive and native-button behavior require browser evidence | Browser |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or native boundary changed | Repository structure and handoff | None | None |
| Process / lifecycle | Yes, existing contract | Manager-owned active Error -> accepted/rejected termination -> active/inactive projection | Separate manager/service tests | Missing joined lifecycle case | GraphQL/API lifecycle and browser pending/recovery journeys |
| Persisted-data transition | No | Existing row fields consumed unchanged | Requirements and implementation checks | No migration risk | None |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | No provider behavior change | N/A | Provider-specific errors are illustrative only | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace`, branch `req/agent-error-state-stop-control`.
- Project type and runtime stack: pnpm workspace; Nuxt 3/Vue/Pinia/Apollo frontend with Vitest; Fastify/TypeGraphQL server with Vitest; Playwright Core/system Chromium for browser probes.
- Conflicting, missing, or unclear project instructions: none. The earlier implementation note that `pnpm` was unavailable is no longer current; `/usr/bin/pnpm` resolves to 10.28.2. Checked-in binaries remain the narrow reproducible path.
- Required environment variables or secrets available: `N/A`; deterministic API and browser fixtures require no provider credentials.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Frontend contributor/testing authority | Colocated tests; use one-shot Vitest; never use broad `git add`; Nuxt tests are primary for frontend. |
| `autobyteus-web/README.md`, Testing and Packaged Electron E2E sections | Development and browser/desktop execution | Prefer `pnpm dev`/Nuxt browser path for web-equivalent behavior; real Electron only for shell-specific evidence; self-starting Chromium probe pattern is established. |
| `autobyteus-web/package.json`, `vitest.config.mts`, `nuxt.config.ts` | Executable frontend configuration | Focused Vitest through checked-in binary; browser probe may start an owned Nuxt dev process on a free loopback port. |
| `autobyteus-server-ts/AGENTS.md` | Server test authority | Use `vitest run ... --no-watch`; single-file execution is supported. |
| `autobyteus-server-ts/package.json` | Server runtime/test configuration | Server tests use Vitest 4; no external provider is required for a scripted-backend manager lifecycle. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Frontend focused suites | `autobyteus-web` | `./node_modules/.bin/vitest run <paths>` | Existing node_modules; no service | Process exit | Automatic |
| Server deterministic GraphQL lifecycle | `autobyteus-server-ts` | `./node_modules/.bin/vitest run tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts --no-watch` | Temporary data root, in-process schema, real manager/services, scripted runtime backend | Assertions on initial and settled GraphQL results | Test closes configured services and removes temp root |
| Browser journey | `autobyteus-web` | `node tests/e2e/standalone-agent-error-stop-probe.mjs --output-dir ...` | Owned Nuxt dev process, loopback deterministic mutation server, system Chromium, temporary installed page | HTTP route ready plus semantic DOM hook | Probe closes browser/server/process and removes temporary page |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Manager-owned Error run | Existing `AgentRunManager` with project test infrastructure and a scripted `AgentRunBackend` | In-memory runtime plus ticket-scoped temp storage; no user data | Removed in test teardown |
| Active Error, inactive Error, and healthy sibling rows | Production read-model builder fed deterministic fixture payloads | No persistent application state | Browser process teardown; durable source fixture retained |
| Termination outcomes | Deterministic loopback GraphQL fixture modes: delayed success, `success:false`, GraphQL error, dropped transport | Free loopback port only; request log retained as evidence | Server closed after probe |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- References: requirements `Data Continuity And Acceptable Loss`; implementation handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: one active persisted history row with Error live evidence and one inactive persisted row with retained Error evidence; existing fields must be read directly without migration.
- Evidence planned: API lifecycle test uses the current catalog/metadata shapes; frontend read-model and browser fixture consume the current history shape directly.
- Migration-specific scenarios: `N/A`.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/runTreeLiveStatusMerge.spec.ts` | Active Error preserves row activity; inactive Error is not reactivated; Offline becomes inactive | `AC-001`, `AC-006` | Still Valid | Reviewed implementation diff | Re-run |
| `autobyteus-web/stores/__tests__/runHistoryReadModel.spec.ts` | Local Error is active; persisted inactive Error stays inactive | `AC-001`, `AC-006` | Still Valid | Reviewed new test | Re-run |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Error DOM/action matrix, exact dispatch, pending, success, false/throw failure, accessibility | `AC-001`–`AC-007` | Still Valid | Reviewed added scenarios | Re-run |
| `autobyteus-web/stores/__tests__/agentRunStore.spec.ts` | Existing actual client mutation success/error/result handling and history transition | `AC-004`, `AC-005` | Still Valid | Reviewed focused lifecycle cases | Re-run |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-status-projection-service.test.ts` | Active runtime is active/reconnectable; currently uses Idle example | `REQ-002`, `AC-006` | Needs Update | Missing explicit Error assertion | Add explicit Error contract case or cover more directly in new API lifecycle test |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts` | Accepted termination removes active run; rejected termination retains it | `AC-004`, `AC-005` | Still Valid | Existing real manager/scripted backend tests | Re-run targeted file as supporting lifecycle evidence |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts` | Service success, missing and rejection semantics | `AC-004`, `AC-005` | Still Valid | Existing service coverage | Re-run targeted file |
| `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` | GraphQL serialization, but service result is mocked | `AC-001`, `AC-006` | Still Valid but insufficient alone | Mock gap identified | Keep; add joined real-service API lifecycle coverage |
| Existing Team UI tests | Team actions/status remain stable | `AC-006`, `QR-003` | Still Valid / out of changed path | Focused suite includes Team cases | Re-run affected component file; no Team test changes |

## Stale Or Obsolete Coverage Decisions

None. The implementation already replaced the obsolete Error-to-inactive expectations in place; no remaining durable test was found that protects the removed behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-E2E-003` | A real manager-owned Error runtime is exposed by current history service/GraphQL as active/reconnectable; accepted mutation terminates exact run and subsequent history is inactive/offline; repeat/missing and rejected termination return false without losing history | `REQ-001`, `REQ-002`, `REQ-004`; `AC-001`, `AC-004`, `AC-006` | `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | Added and passed. Joins the current backend status and termination contracts through GraphQL without provider credentials or service-result stubs. |
| `API-E2E-004` | Browser-visible active/inactive Error matrix, native localized control, click/keyboard exact dispatch, pending isolation, success transition/history retention, false/GraphQL/HTTP failure and retryability, narrow layout | `REQ-001`–`REQ-007`; `AC-001`–`AC-007` | `autobyteus-web/tests/e2e/fixtures/standalone-agent-error-stop.page.vue`; `autobyteus-web/tests/e2e/standalone-agent-error-stop-probe.mjs` | Added and passed in the development execution; a final post-repository rerun is selected as the broader-validation evidence. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-E2E-003` | `autobyteus-server-ts/tests/unit/agent-execution/agent-run-status-projection-service.test.ts` active-runtime status case | No update made: the added lifecycle E2E now directly asserts Error active/reconnectable through the actual manager, history services, and schema | `REQ-002`, `AC-006` | Existing unit test remains valid; joined coverage is stronger than duplicating the same assertion there. |
| `API-E2E-004` | `autobyteus-web/package.json` E2E scripts | Added `test:e2e:standalone-agent-error-stop` | Execution discoverability | Completed; no production runtime behavior. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `./node_modules/.bin/vitest run utils/__tests__/runTreeLiveStatusMerge.spec.ts stores/__tests__/runHistoryReadModel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts --reporter=verbose` | `autobyteus-web` | Projection, read model, component acceptance matrix | Pass — 3 files / 73 tests | `evidence/api-e2e-001-focused-frontend.log` |
| 2 | `./node_modules/.bin/vitest run stores/__tests__/agentRunStore.spec.ts --reporter=verbose` | `autobyteus-web` | Existing mutation outcome and lifecycle owner | Pass — 1 file / 17 tests | `evidence/api-e2e-002-agent-run-store.log` |
| 3 | `./node_modules/.bin/vitest run tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts --no-watch --reporter=verbose` | `autobyteus-server-ts`; after documented `pnpm prepare:shared` | Real manager/status/catalog/history/GraphQL termination boundary | Pass — 1 file / 2 tests | `evidence/api-e2e-003-server-lifecycle.log` |
| 4 | `./node_modules/.bin/vitest run tests/unit/agent-execution/agent-run-status-projection-service.test.ts tests/integration/agent-execution/agent-run-manager.integration.test.ts tests/unit/agent-execution/agent-run-termination-service.test.ts --no-watch --reporter=verbose` | `autobyteus-server-ts` | Broader lifecycle regression | Pass — 3 files / 22 tests | `evidence/api-e2e-005-server-regression.log` |
| 5 | `./node_modules/.bin/vitest run components/workspace/history/__tests__ stores/__tests__/runHistory*.spec.ts utils/__tests__/runTree*.spec.ts utils/__tests__/workspaceStatusDotPresentation.spec.ts --reporter=dot`; both boundary guards; probe syntax; `git diff --check` | `autobyteus-web` | Affected-area integration/regression | Pass — 17 files / 184 tests plus all checks | `evidence/api-e2e-006-frontend-regression.log` |
| 6 | `node tests/e2e/standalone-agent-error-stop-probe.mjs --output-dir tickets/standalone-agent-error-state-stop-control/evidence/browser` | `autobyteus-web`; system Chromium; owned Nuxt/API fixture | Web-equivalent renderer journey | Pass in development execution; final broader rerun selected | `evidence/browser/evidence.json`; `evidence/api-e2e-004-browser.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — six independently meaningful cases cross two repositories and include process/browser work.
- Canonical ledger path: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web/tickets/standalone-agent-error-state-stop-control/api-e2e-test-case-ledger.md`.
- Ledger initialized before execution: `Yes`.
- Case granularity: repository projection/UI suite, client mutation suite, backend GraphQL lifecycle, backend regression, frontend regression/guards, browser journey.

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Entry Point | Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| `API-E2E-001` | Focused frontend state/action matrix | `AC-001`–`AC-007` | Vue/read model/unit DOM | Focused Vitest | 1 | Passing counts/log |
| `API-E2E-002` | Existing client termination mutation owner | `AC-002`–`AC-005` | Pinia/Apollo contract | Store Vitest | 2 | Passing counts/log |
| `API-E2E-003` | Backend Error-active through termination lifecycle | `AC-001`, `AC-004`, `AC-006` | Manager/services/GraphQL | New server E2E | 3 | Initial and settled GraphQL assertions/log |
| `API-E2E-005` | Server lifecycle regression | `AC-004`, `AC-005`, `AC-006` | Server unit/integration | Targeted Vitest files | 4 | Passing counts/log |
| `API-E2E-006` | Frontend affected-area regression and guards | `QR-003` | Frontend repository | Targeted broader Vitest and guards | 5 | Passing counts/log |
| `API-E2E-004` | Browser success, failures, keyboard, pending, responsive | `AC-001`–`AC-007` | Chromium/Nuxt/loopback API fixture | Durable probe | 6 | JSON, logs, screenshots |

## Post-Repository Confidence Scorecard

This scorecard uses the repository-only evidence set after the focused, API-lifecycle, supporting server, and affected frontend suites. The first browser execution occurred while developing/validating the new durable probe; its evidence is deliberately excluded from these post-repository scores and will be incorporated only after the selected final broader-validation rerun.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 73 direct frontend tests, 17 mutation-owner tests, and 2 joined backend lifecycle tests cover every AC | Independent final browser journey not yet counted | Rerun durable browser probe after repository checks |
| Changed-boundary execution directness | 98% | Exact changed read-model/live-overlay/component paths executed; real server manager and service owners executed | Browser timing not yet counted | Browser probe |
| Cross-boundary integration realism and mock gap | 92% | Real AgentRun/Manager/status/catalog/history/workspace composite and schema are joined; client Apollo owner is independently covered | Browser journey uses a deterministic loopback API fixture rather than the same server harness | Browser probe closes renderer/network behavior; the bounded remaining seam is acceptable if both sides agree |
| Environment, configuration, identity, and fixture fidelity | 95% | Current history/metadata shapes, exact run IDs, real server test persistence, current Chromium/Nuxt setup | Provider-generated error is intentionally not used | Browser probe with deterministic canonical Error fixture |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Accepted/rejected/missing server termination; client false/GraphQL/throw behavior; pending and retry unit coverage | Final browser failure/retry timing not yet counted | Browser false/GraphQL/HTTP/retry journey |
| User-surface, browser, and desktop-shell confidence | 90% | Direct DOM component tests and implementation-owned prior visual inspection; shell is inapplicable | Independent browser result not yet counted | Required Chromium rerun |
| Durable regression coverage quality and relevance | 100% | Narrow requirement-linked server lifecycle test and durable browser probe added; existing state/action suites remain valid; no stale coverage | None material | N/A |

- Overall post-repository confidence: `95%` (95.4%, rounded).
- Calculation method: simple mean of seven applicable categories.
- Every critical acceptance criterion directly proven: `Yes` at repository level, with browser confirmation still selected for material UI realism.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes`.
- Material residual risks: independent final browser timing/accessibility/responsive evidence remained to be incorporated; the browser and real server lifecycle are separate deterministic harnesses rather than one provider-backed full stack.

## Broader Validation Decision

- Decision: `Required — completed Pass`.
- Selected execution mode: `Browser` plus deterministic `Live API`/lifecycle execution.
- Specific gap: current implementation tests are component/store-focused and the prior browser inspection used deterministic frontend state; neither joins the server's manager-owned Error projection with actual termination nor provides durable independent browser evidence.
- Final confidence after selected validation: 99% overall, with every applicable category at least 95%; the canonical rerun agreed with the development execution.
- Browser-specific rationale: the changed behavior includes native button keyboard activation, click isolation, per-row pending state, user-visible failure feedback, responsive layout, and rendered action mutual exclusion. These materially benefit from browser execution. Electron itself is unnecessary because no shell boundary changed.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Relevant instructions: `autobyteus-web/README.md`, Browser Development and Packaged Electron E2E sections.
- Web-equivalent behavior: all changed row rendering, action, accessibility, and HTTP mutation behavior.
- Shell-specific behavior: none.
- Chosen approach: isolated Nuxt browser probe; actual Electron execution is not justified.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: Electron packaging/IPC, intentionally inapplicable with no confidence penalty.

## Live Environment And Fixture Plan

- Startup order: deterministic loopback mutation server, owned Nuxt dev server on a free port, Chromium.
- Environment: loopback only, no credentials, telemetry disabled, backend base pointed at the isolated fixture.
- Readiness: mutation fixture listening and Nuxt route returns HTTP success.
- Seed data: current history-shaped active Error, inactive Error, and healthy active rows; in-process server catalog row and scripted active Error backend.
- Identity/permissions: no authentication boundary applies.
- Journeys: initial matrix; keyboard/pointer delayed success; `success:false`; GraphQL error; transport failure; retry; narrow viewport.
- Evidence: DOM/state assertions, exact request log, browser events, Nuxt log, server test log, screenshots, cleanup record.
- Cleanup: close Chromium/context, terminate only owned Nuxt process group, close loopback server, remove temporary page and temp data.

## Temporary Executable Validation Plan

None. The selected browser and server journeys are durable because the repository has established E2E locations/patterns and the regression risk is stateful and boundary-specific.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Real provider-generated Error | Provider-specific failure cause is out of scope and would make the test nondeterministic; the runtime backend's canonical Error snapshot is the authoritative input | Low after manager/service/GraphQL and browser coverage | None for this ticket |
| Electron shell | No shell boundary changed | None | None |

## Ambiguities Or Reroute Triggers

None identified before execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — added deterministic server GraphQL lifecycle and browser probe plus named script; removed none.
- Post-repository confidence: `95%`.
- Broader validation decision: `Required — completed Pass` via final durable Chromium rerun; see the canonical execution report.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: `N/A`.
- Notes: direct `Small`/`Low` classification is preserved.
