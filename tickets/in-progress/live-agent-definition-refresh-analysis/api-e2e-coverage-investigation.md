# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md`
- Solution Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/solution-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-review-report.md`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/implementation-revision-record.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-report.md`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-revision-record.md`
- Delivery Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001` — historical latest-base integration blocker resolved through `IR-004`; its integrated-state concern exposed the owner topology ultimately corrected by SR-005/IR-005.
- Delivery Rework Artifacts: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/latest-base-integration-conflict-report.md`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/docs-sync-report.md`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/release-deployment-report.md`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/evidence/delivery/dr-001-integration-refresh.log`
- Prior API/E2E Test Review: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-test-review-report.md` (`CRR-005`, historical SR-004 Pass)
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`.
- Current Investigation Round: 2
- Trigger: `CRR-007` Pass of `IR-005` at implementation commit `370f1f5fa` and artifact HEAD `66c696473c572175f565df6d89e00feeb631a150` against `SR-005` / `ARCH-REV-004`.
- Prior Investigation Reviewed: Yes. API-REV-001 was Pass at 96.4% under SR-004. Its General API, external-channel, sequential browser, persistence, and provider evidence remains useful; its Application-same-General-owner statement is historical and non-authoritative.
- Latest Authoritative Investigation: This SR-005 round-2 investigation, initially replaced before any current-round execution or durable coverage change and updated with the completed evidence below.

## Current Requirement And Design Basis

The user-visible contract remains the revision-free sequential flow proven in API-REV-001: owning Stop/termination completes; the user opens Settings; Settings performs a network-fresh canonical read; only current-schema `llmConfig` controls may unlock; Save completes while the run remains stopped; and only a later General/browser message restores the same persisted identity and provider binding. Runtime/model identity, workspace, definitions/topology, auto approval, skill mode, IDs, provider binding, history, messages, tasks, and every non-`llmConfig` value remain fixed. Team editing remains root-gated, configured-scope-only, bounded by draft-start value equality/direct edits, and exposes no stopped-run Reset.

SR-005 corrects ownership behind exactly two resume reads and two stopped updates. General Process and Application Engine intentionally use distinct manager/service instances and transition lanes. General/browser/external-channel resolution remains ordered with Save in the unchanged General per-Agent/root lane. Application input never enters those lanes. Instead, a nonterminal Application binding (`ATTACHED`, `TERMINATING`, or `FAILED`) is a durable ownership lease: owner-aware Studio reads project the existing active lock; direct updates return canonical `RUN_ACTIVE` without General validation or persistence. A verified `TERMINATED`/`ORPHANED` binding, or a proven-unowned identity with no lookup or canonical Application provenance, releases the guard and delegates to the unchanged General owner, whose lane performs the final activity check.

Ownership resolution awaits `ApplicationOrchestrationStartupGate`, cross-checks the exact global lookup against canonical Agent `applicationExecutionContext` or Team `applicationBinding`, verifies binding identity and run/root/member containment, and fails closed on disagreement, missing referenced binding, unreadable state, or startup failure. Terminal status is durably persisted before lookup removal, and normal Application input rejects terminal bindings. During supported post-start `reloadAndReenter`, lookup absence is not release when canonical provenance still points to a verified nonterminal binding. This is a sequential ownership-state contract, not a simultaneous-call protocol.

Transport remains unchanged: no ownership field, revision, stale outcome, rebase, multi-client, multi-tab, hand-speed, cross-owner mutex, or cross-owner simultaneous-call scenario is authorized. Existing Agent metadata, Team V2 trees, Application binding tables, global lookup, and provenance are current-schema data used directly without migration.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 definition versus existing-run editing | Preserved | REQ-001/015; AC-015 | Retain launch/definition regressions; ownership must not widen those routes. |
| BEH-002 later General restore consumes saved `llmConfig` | Preserved | REQ-004/006/007; AC-001/002/007/014/016; DS-002/004/008 | Re-run built GraphQL/files/restart and provider coverage after integration. |
| BEH-003 active immutability across two owner families | Changed | REQ-002/003/006/009; AC-003/004/008; CR-F-003 | Prove General active rejection and Application lease lock/rejection independently. |
| BEH-004/005 sequential Agent/Team Settings | Preserved | REQ-001–015; AC-001–015; UXJ-001–004 | Retain network-fresh one-browser Agent/full-Team coverage; no ownership UI. |
| BEH-006 owner-aware four-operation Studio boundary | Changed | REQ-002/003/009/012–014; AC-003/004/008/010; DS-001/003/005/009 | Cross normal Application launch, canonical read, lease, locked/no-write update, terminal release, and General delegation. |
| BEH-007 catalog and AutoByteus/Codex/Claude | Preserved | REQ-004/010/011; AC-009/011/012/016 | Re-run affected catalog/provider tests; paid provider remains conditional. |
| BEH-008 General resolver versus Application lease | Changed | REQ-002/003/006/009/012; AC-003/004/008/014; MP-SR4-003/004/006; MP-SR5-001–003 | Keep exact General external-channel lane tests. Replace historical Application same-lane interpretation with lease/release/startup/reentry evidence. |
| SR-003 revision/concurrent-browser/archive coordination | Removed / prohibited | SR-004/SR-005; CRR-007 | Audit obsolete seams; add no replacement concurrency policy. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Startup-ready Application lease classification and Studio guard | New owner/Studio unit suites | Normal host launch + real binding/lookup stores + terminal transition are separated by mocks | Lifecycle integration |
| API / transport / contract | Yes, routing only | Same GraphQL shapes route through Studio service | Four resolver-routing tests | Built HTTP GraphQL after integrated composition; Application-owned composed result | Built API + lifecycle |
| Frontend component / state | No new IR-005 code; integrated state relevant | Existing locked/`RUN_ACTIVE`/error presentation | API-REV-001 web/browser coverage | Prior browser evidence predates latest-base conflict resolution | Browser regression |
| Browser integration / user journey | Preserved | Sequential Settings only | Durable Chromium probe | Current integrated renderer recheck | Browser |
| Authentication / session / permissions | No | Studio owner access/Application host scope unchanged | Existing tests | None introduced | None |
| Desktop renderer / web-equivalent UI | Preserved | Nuxt renderer | Durable browser probe | Current integrated render | Browser, not shell |
| Desktop shell / Electron-specific integration | No | No shell code changed | Boundary tests | None | None |
| Process / lifecycle | Yes | Startup gate, host launch, terminal-before-release, terminal input rejection, reentry lookup rebuild | Unit launch/recovery/terminal/host tests | One assembled ownership lifecycle crossing Studio | Lifecycle integration |
| Persisted-data transition | No shape change | Current bindings/lookups and Agent/Team provenance are read directly | Real SQLite store/recovery tests; API-REV-001 package restart | Cross current records through ownership/release | Temp SQLite integration |
| Worker / queue / distributed coordination | No distributed change | Application worker/host is single process; startup/reentry are supported lifecycle | Existing application-context integration | Studio ownership absent there | Run worker integration + focused ownership integration |
| External integration | Preserved | Claude SDK and Application backend worker | Direct provider/application integration tests | Paid Claude account previously unavailable | Conditional preflight |

## Project Execution Discovery

- Worktree: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis`
- Branch/reviewed state: `codex/live-agent-definition-refresh-analysis`; implementation `370f1f5fa`; artifact HEAD `66c696473c572175f565df6d89e00feeb631a150` before uncommitted CRR-007 artifact updates.
- Stack: pnpm monorepo; TypeScript Node/Fastify/GraphQL; Application Engine host/worker and SQLite platform stores; Nuxt/Vue/Pinia/Apollo Electron renderer; Vitest; built-server harness; Playwright-core browser probe.
- Conflicting/missing instructions: None material. Server `AGENTS.md` requires `vitest run ... --no-watch`; test state must be isolated from development/user data.
- Secrets: N/A for deterministic ownership/API/browser coverage. A live Claude credential was absent in API-REV-001 and will only be rechecked through sanitized preflight.

| Instruction / Configuration Path | Authority / Purpose | Commands / Constraints Learned |
| --- | --- | --- |
| Workspace `README.md` and root `package.json` | Development/E2E | Package builds; `test:e2e`; `test:e2e:real:preflight`; isolated owned resources. |
| `autobyteus-server-ts/AGENTS.md` and `vitest.config.ts` | Server tests | Exact files first via `pnpm exec vitest run ... --no-watch`; serial deterministic execution. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Built server | Isolated HOME/runtime/SQLite/free port/readiness/cleanup. |
| `application-context-capabilities.integration.test.ts` | Application worker/host fixture | Real worker/SDK/host and binding SQLite; deterministic run facades. |
| `application-orchestration-recovery-service.test.ts` | Recovery fixture | Real binding/lookup stores and terminal transition over temporary data. |
| `autobyteus-web/README.md` and `existing-run-model-config-probe.mjs` | Renderer validation | Owned Nuxt/free port/Chromium, semantic evidence, cleanup. |

| Component | Setup / Working Directory | Resources / Readiness | Cleanup |
| --- | --- | --- | --- |
| Focused ownership integration | Vitest in server | Real startup gate, host launch, SQLite binding/lookup, ownership reader, Studio service, terminal transition; deterministic General/runtime edges | Reset app config; remove temp root |
| Built backend E2E | Existing stopped-run E2E in server | Child server, isolated DB/HOME/free port; health + GraphQL | Harness stop/remove |
| Application worker/host integration | Existing context-capabilities integration | Test bundle, worker, host, SQLite | Engine stop/gateway dispose/temp removal |
| Browser renderer | Existing durable probe in web | Free Nuxt port, one Chromium context, DOM readiness | Browser/process/temp page cleanup |
| Provider preflight | Root script | Sanitized capability report | No retained process |

## Persisted Data Transition Coverage Basis

- Approved SR-005 decision: `Not Affected`; the broader stopped-config feature remains `Directly Usable — No Migration`.
- References: design `Persisted Data / State Transition Decision`; IR-005 handoff `Persisted Data Transition Check`.
- Representative data: normal-launch current Application binding rows/global lookup; Agent `applicationExecutionContext`; Team `applicationBinding`; current metadata/Team V2 `llmConfig` packages.
- Required behavior: nonterminal binding stays locked even without lookup when provenance exists; terminal status releases the lease; General stopped updates remain the only writer after release.
- Evidence planned: real temp SQLite binding/lookup, exact provenance/containment, terminal persisted state and lookup removal, current API package restart, no migration/fallback.
- Migration scenarios: N/A. Upstream ambiguity: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Intent | Validity Decision | Evidence / Gap | Action |
| --- | --- | --- | --- | --- |
| `application-run-ownership-service.test.ts` | Startup wait/failure, statuses, provenance without lookup, mismatch/missing failure | Still Valid | Direct classifier; stores mocked | Retain/run; compose separately. |
| `studio-run-model-config-service.test.ts` | Locked reads, canonical `RUN_ACTIVE`/zero General write, release delegation, fail closed | Still Valid | Direct policy; all dependencies mocked | Retain/run; add assembled integration. |
| Resolver/configured-service tests | Exactly two reads/two updates route through Studio | Still Valid | Direct transport routing | Retain/run. |
| `application-run-binding-launch-service.test.ts` | Agent/Team creation persists binding/publishes lookup inputs | Still Valid | Persistence mocked | Retain; use real stores/host in integration. |
| `application-context-capabilities.integration.test.ts` | Real worker/SDK/host starts/terminates Agent+Team and persists bindings | Still Valid | Real worker/host/SQLite; no Studio config | Execute as broader regression. |
| Terminal transition tests | Terminal persists before lookup release; failed persistence keeps lease | Still Valid | Direct owner | Retain/run. |
| Recovery/platform/reentry tests | Startup rebuild/orphan/readiness and reload/reentry orchestration | Still Valid | No Studio composition | Retain relevant cases; compose reentry state. |
| Architecture/runtime-isolation tests | Application internals private; General/Application instances distinct | Still Valid | Structural | Retain/run. |
| `stopped-run-model-config-graphql.e2e.test.ts` | Built GraphQL Agent/Team no-write/update/restart/same-ID restore | Still Valid, revised interpretation | Now proves proven-unowned -> General delegation; not Application same-lane ordering | Retain/rerun. |
| Standalone lifecycle exact coordinator cases | General external Agent Save-first/restore-first | Still Valid | Exact General path | Retain/rerun as General only. |
| Team manager exact launcher cases | General external Team Save-first/restore-first | Still Valid | Exact General path | Retain/rerun as General only. |
| Catalog/validator/mutator/physical-writer suites | Narrow/no-op/validation/failure | Still Valid | Direct owners | Retain/run proportionately. |
| Web store/form/planner suites and browser probe | Sequential load/lock/Save/Team/no Reset/viewport/relock | Still Valid | UI vocabulary unchanged; evidence predates integrated state | Rerun; add no ownership UI. |
| Claude/Codex/runtime catalog suites | Saved config reaches runtime; three runtimes cataloged | Still Valid | Direct boundary | Retain/run; conditional preflight. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why Obsolete | Replacement / Decision |
| --- | --- | --- | --- |
| API-REV-001 artifact prose about Application | Application input and Studio Save share General lanes | Integrated managers/lanes are distinct; SR-005/CR-F-003/IR-005 replace this model | API-E2E-007/008 lease/release/startup/reentry; historical artifacts remain chronology. |
| Proposed Application Save-first/restore-first simultaneous ordering | Cross-owner calls need one lane/mutex | Nonterminal lease excludes Studio Save; release disables normal Application input | Sequential lease -> terminal release -> later General delegation only. |
| Revision/stale/multi-tab/hand-speed/rebase tests | Browser concurrency policy | Explicitly out of scope | No replacement. |

No API-REV-001 repository test actually asserts Application same-owner ordering: its exact coordinator/launcher tests are General external-channel paths and remain valid. No stale durable test removal is planned.

## Durable Coverage Added

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Durable Path | Why Durable |
| --- | --- | --- | --- | --- |
| API-E2E-007 | Normal Application Agent+Team host launch -> locked canonical read -> direct canonical `RUN_ACTIVE`/zero General write -> host terminal transition -> terminal input rejection -> later General eligibility | REQ-002/003/006/009/012–014; AC-003/004/008/014; DS-009; MP-SR5-001 | `autobyteus-server-ts/tests/integration/run-history/application-owned-studio-run-model-config.integration.test.ts` | Existing tests separate launch/storage, Studio, and terminal owners. |
| API-E2E-008 | Real startup gate blocks classification; startup failure fails closed; sequential reentry lookup-clear remains locked from canonical provenance | REQ-009/012/013; AC-003/008/010; DS-009; MP-SR5-002/003 | Same focused integration file | Proves current gate/store/provenance composition without timing/concurrency policy. |

## Durable Coverage To Update

None planned. API-E2E-003 tests already name the exact General external-channel resolvers; only report interpretation changes.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

The first focused import attempt ran before the local workspace contract package had been built and therefore collected zero tests with a package-entry resolution error. `pnpm -C autobyteus-application-sdk-contracts build` restored the documented workspace prerequisite. The focused integration then passed twice (the second run after strengthening canonical assertions); this was an environment-setup correction, not a product or test failure.

| Order | Command / Scope | Working Directory | Boundary | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-application-sdk-contracts build` | Workspace | Missing local shared-package output required for test import | Pass |
| 2 | `pnpm exec vitest run tests/integration/run-history/application-owned-studio-run-model-config.integration.test.ts --no-watch` | Server | API-E2E-007/008 | Pass — 1 file / 3 tests, final run |
| 3 | 14 focused architecture, resolver, owner, startup, launch, recovery, terminal, Studio, and composition files | Server | IR-005 owner/routing/fail-closed contracts | Pass — 14 files / 82 tests |
| 4 | `pnpm exec vitest run tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts --no-watch` | Server | API-E2E-001/002 General GraphQL/files/restart | Pass — 1 file / 2 tests |
| 5 | General Agent/Team lifecycle lanes and exact external-channel callers | Server | API-E2E-003 | Pass — 4 files / 39 tests |
| 6 | Validator, mutator, catalogs, metadata, and physical Team writer | Server | API-E2E-005/current persisted packages | Pass — 8 files / 33 tests |
| 7 | Application context-capabilities worker/host integration and standalone host lifecycle | Server | Normal Application worker/host breadth | Pass — 2 files / 13 tests |
| 8 | Runtime capability, Claude session/client, and Codex bootstrapper | Server | API-E2E-006 | Pass — 4 files / 45 tests |
| 9 | Existing-run store/draft and Agent/Team forms | Web | Sequential UI contract | Pass — 4 files / 26 tests |
| 10 | Broader config panels/stores/planners/history utilities | Web | UI regression breadth | Pass — 12 files / 166 tests |
| 11 | `pnpm -C autobyteus-server-ts build` | Server | Shared packages, Prisma, production TypeScript, assets, bootstrap smoke | Pass |
| 12 | Web boundary/localization guards, localization audit, and `pnpm build` | Web | Current renderer/build contract | Pass |
| 13 | Obsolete-seam audit and `git diff --check` | Workspace | No revision/rebase/concurrency policy; patch hygiene | Pass — only unrelated docs “multi-tab” and intentional negative `configurationRevision` schema assertion matched |

## Post-Repository Confidence Scorecard

| Category | Score | Support | Remaining Uncertainty | Improvement |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | API-E2E-001–003/005–008 passed; Agent and Team normal Application lease/release are direct | Current browser rerun not yet included at this checkpoint | Execute retained probe. |
| Changed-boundary execution directness | 98% | Normal host launch -> real binding/lookup SQLite -> real startup-ready ownership -> Studio -> terminal -> General delegation | Runtime and canonical history edges are deterministic facades in the new integration | Existing worker and built API runs complement it. |
| Cross-boundary integration realism and mock gap | 96% | Real stores/gate/host/launch/terminal are composed; built HTTP and worker/host suites pass separately | No single browser + live backend + Application worker process spans all boundaries | Complementary executions are proportionate. |
| Environment/configuration/identity/fixture fidelity | 96% | Isolated app data/SQLite/exact provenance/run/team/member IDs/current packages | External Claude credential not configured | Sanitized preflight. |
| Failure/edge/lifecycle/recovery evidence | 98% | Startup wait/failure, lookup-clear provenance, nonterminal status classes, terminal release/input rejection, indeterminate write all pass | Distributed ownership is out of scope | None in scope. |
| User-surface/browser/desktop confidence | 90% | 4 focused + 12 broader web files pass; IR-005 has no UI shape change | Current integrated Chromium evidence not yet counted | Execute browser probe. |
| Durable regression quality/relevance | 97% | One focused integration adds exact SR-005 composition without prohibited concurrency; existing durable paths remain valid | Proportional test-code review remains the next workflow gate | Route through code review. |

- Overall post-repository confidence: `96.0%` (`672 / 7`).
- Calculation: simple average of seven applicable categories; critical-AC/weak-category gates checked independently.
- Every critical AC directly proven: `Yes`, with user-surface evidence pending only the planned regression rerun at this checkpoint.
- Any applicable category below 90%: `No`.
- Default 95% target met: `Yes`, but planned broader validation remained required because the retained current browser and provider-environment checks had not yet run.
- Residuals: UI/backend/Application evidence is complementary rather than one process; runtime edges in the new ownership integration are deterministic; paid Claude availability is environment-dependent.

## Broader Validation Decision

- Decision: `Required — Completed`.
- Selected mode: `Lifecycle` + `Live API` + `Browser`; lifecycle and built API ran as repository-resident durable tests, then the current integrated Chromium probe and provider capability preflight completed the broader phase.
- Evidence gain: The browser re-established all four sequential Agent/full-Team/narrow/`RUN_ACTIVE` journeys on the integrated base. Preflight confirmed the provider harness is healthy and truthfully reported the Anthropic credential missing.
- Final confidence: `97.1%`; every category is at least 96%.
- Browser rationale: Regression recheck only. No Application ownership UI, multi-tab, revision, or timing scenario was added.

## Desktop Application Validation Decision

- Framework: Electron wrapping Nuxt.
- Web-equivalent behavior: Settings loading/lock/forms/Save/notices/layout.
- Shell behavior changed: None.
- Approach: Existing owned Chromium probe; actual Electron is unnecessary.
- Effect on running desktop: None.

## Live Environment And Fixture Plan

- Executed with test-owned app data, real SQLite binding/lookup stores, a real startup gate, normal Application host Agent/Team launch, Studio reads/updates, normal host termination, and later General eligibility.
- Built API and Application worker/host suites used their isolated current fixtures; Chromium used one owned Nuxt process/context and deterministic current GraphQL payloads.
- Exact application/binding/launch/run/team/member IDs and launch-derived canonical provenance were asserted. Browser semantic JSON, screenshots, and the owned Nuxt log are retained under `probes/api-e2e/browser-sr005`.
- Temp roots, AppConfig, API processes/data, browser/context/Nuxt process group, and temporary page were cleaned. Only concise ticket evidence remains.

## Temporary Executable Validation Plan

| Scenario | Method | Behavior | Why Temporary |
| --- | --- | --- | --- |
| API-E2E-006 | Sanitized provider preflight; paid Claude turn only if configured | External availability | Pass — harness 1 file / 18 tests; Anthropic credential absent, so no paid turn. |

No temporary ownership probe was used; ownership composition is retained in durable integration coverage.

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Multi-tab/user, concurrent Save, hand-speed, revision/rebase | Explicitly excluded | None; do not test/reintroduce. |
| Cross-owner simultaneous input versus Save | Lease excludes Save; release rejects Application input | Prove sequential states only. |
| Studio Stop/message/archive/delete routing for Application IDs | Explicitly outside SR-005 | Separate ticket if needed. |
| Multi-node ownership | No distributed contract | Out of scope. |
| Electron shell | No shell change | Browser sufficient. |
| Paid Claude turn if credential absent | Cannot invent credentials | Record preflight/direct adapter; run in credentialed release environment if required. |

## Ambiguities Or Reroute Triggers

None. Any failing test that assumes Application and General share a manager/lane will be classified against SR-005 before an implementation-defect conclusion. Any simultaneous-call/revision fix is outside the contract.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — Pass`.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — added one focused Application ownership lifecycle integration file; no existing durable path was updated or removed.
- Post-repository confidence: `96.0%`; final confidence after broader validation: `97.1%`.
- Broader validation decision: `Required — Completed` — Lifecycle + Live API + Browser, plus provider preflight.
- Reroute Required Before Validation Execution: `No`.
- Notes: Refreshed against SR-005 before current-round execution or durable coverage change. API-E2E-007/008 and every retained scenario passed. Because one durable file was added, the cumulative package must return through `/code_reviewer` for proportional test-code review.
