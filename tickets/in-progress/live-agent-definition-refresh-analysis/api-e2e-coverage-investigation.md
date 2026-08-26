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
- Current API/E2E Revision ID: `API-REV-003` — completed user-directed real-stack result: `Fail / 78.3%`.
- Current Investigation Round: 3
- Trigger: Direct user correction on 2026-08-26: start the real frontend and backend, import `/home/autobyteus/workspace/autobyteus-agents` through the UI, and use the real Classroom Simulation Team instead of relying only on split/intercepted browser evidence.
- Prior Investigation Reviewed: Yes. API-REV-002 was Pass at 97.1% under SR-005. Its lifecycle, built API, General lane, provider, and real-renderer evidence remains valid. The prior renderer probe used real Nuxt/Chromium but intercepted GraphQL, so it is insufficient for the newly requested composed import journey.
- Latest Authoritative Investigation: This round-3 real-stack addendum plus the retained SR-005 coverage decisions below. The initial addendum was written before execution and is now updated with the discovered live-browser defect and repository-suite coverage gaps.

## Round-3 User-Directed Real-Stack Addendum

The user correctly distinguished API-REV-002's complementary evidence from a fully composed manual-style browser journey. API-REV-002 started a real Nuxt server and system Chromium, but its browser GraphQL operations were deterministically intercepted; the built backend and Application lifecycle ran separately. Therefore API-REV-002 did **not** prove that the current frontend could import the actual local package repository through the current backend and render/use the imported Classroom Simulation Team in the same running stack.

### New Changed Boundary And Scenario

| Scenario ID | Required Journey | Real Boundaries | Planned Evidence | Durable Decision |
| --- | --- | --- | --- | --- |
| API-E2E-009 | Run the documented full-stack build/start path; open real `/settings?section=agent-packages`; import `/home/autobyteus/workspace/autobyteus-agents` through the UI; render and launch `Classroom Simulation Team`; Stop; perform the network-fresh Settings edit/Save journey; later restore through a browser message and obtain a real provider response | Freshly built backend on isolated `127.0.0.1:38123`, Nuxt on isolated `127.0.0.1:33123`, real GraphQL/WebSockets/SQLite/package readers, actual repository files, system Chromium, real Codex App Server / GPT-5.4 | Browser screenshots/JSON, frontend/backend logs, GraphQL/SQLite/raw-trace observations, cleanup record | Temporary composed-system validation retained as ticket evidence. Result: partial journey pass, critical Save failure `API-E2E-F-001`. Exact Codex schema regression coverage now `Needs Update`. |

### Executed Setup, Coverage Decision, And Finding

- The authoritative root `pnpm dev` path completed the full backend/package/Prisma/TypeScript build, then correctly refused to reuse fixed port `8000`: it belonged to unrelated PID 63 and `/home/autobyteus/data`. That process and data were left untouched.
- The freshly built backend was therefore started with validation-owned data on `http://127.0.0.1:38123`, and the real Nuxt frontend on `http://127.0.0.1:33123` with all HTTP/WebSocket endpoints pointing to that backend. This was the smallest safe deviation from the documented launcher.
- System Chromium was driven through Playwright Core as a real tab. No GraphQL interception, fixture route, mocked model catalog, or synthetic package payload was used.
- The exact external repository remained read-only. The UI import persisted its local-path registry record and rendered `Shared Agents: 7 | Team-local Agents: 50 | Teams: 12 | Applications: 0`.
- `Classroom Simulation Team` rendered with coordinator `professor` and members `professor`/`student`; it launched through real `CreateAgentTeamRun` on `codex_app_server` / `gpt-5.4`, stopped, and produced a network-fresh stopped Settings read.
- **`API-E2E-F-001`**: changing actual Codex `reasoning_effort` from `medium` to `low` rendered `Enter a value of type enum.`, left Save disabled, and sent no `UpdateStoppedTeamRunModelConfigs` request. The critical Stop -> Settings -> edit -> Save acceptance path therefore fails.
- A follow-up real browser turn independently restored the same run, sent `Reply only with: CLASSROOM_E2E_OK` over the real Team WebSocket, received `CLASSROOM_E2E_OK` from GPT-5.4, then stopped the Team again. This proves launch/restore/provider application but does not cure the failed Save.
- Focused existing web tests passed 3 files / 25 tests but use JSON-schema-style `type: "string"` enum fixtures rather than the real Codex legacy parameter `type: "enum"`; that coverage is now `Needs Update`.
- The root-supported `pnpm test:e2e` also completed with `15 failed | 41 passed | 14 skipped` files and `41 failed | 154 passed | 57 skipped` tests. Twenty-nine failure occurrences report unconfigured Studio Application API services after `runModelConfigService` became an eagerly resolved schema dependency; other broad-suite failures are not all within this ticket and remain preliminary. This is `API-E2E-F-002`, a durable E2E composition/fixture regression requiring focused failure-origin review.
- No repository-resident durable test or production source was changed in round 3. Validation-owned processes, ports, generated shared-package outputs, and `.autobyteus/development` data were removed; the unrelated port-8000 process remained untouched.

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
| Frontend component / state | Yes, defect exposed | Real Codex legacy parameter schema reaches existing-run validation as `type: "enum"`; renderer displays the select but validator rejects every string choice | Existing schema/form tests and API-REV-001 mocked browser coverage | Existing fixtures use `type: "string"`, so they miss the production catalog shape | Focused reproduction + real composed browser |
| Browser integration / user journey | Yes, critical failure | Sequential Stop -> network-fresh Settings -> edit -> Save | Durable Chromium probe used intercepted JSON-schema-style payloads | Actual Codex model config Save remains disabled | Real composed browser, no interception |
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
| Web store/form/planner suites and prior intercepted browser probe | Sequential load/lock/Save/Team/no Reset/viewport/relock | Needs Update | State/lifecycle assertions remain useful, but schema fixtures use `type: "string"` enum fields and do not represent real Codex `parameters[].type: "enum"` | Add exact raw Codex schema normalization/validation and form Save-enablement regression after source fix. |
| `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts` | Normalization and client validation | Needs Update | 9 tests pass, but enum-bearing cases use JSON-schema `type: "string"`; focused executable reproduction shows actual Codex `type: "enum"` normalizes to an unsupported validator type | Add exact legacy parameter-list enum fixture and assert a selected allowed string is valid. |
| Root `pnpm test:e2e` / in-process GraphQL schema fixtures | Supported broad E2E suite | Needs Update | 15 files / 41 tests fail; 29 error occurrences are missing configured Studio Application API services after eager resolver dependency expansion | Centralize production-equivalent Studio service composition in the shared schema/E2E harness; separately triage non-Studio failures. |
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

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-009 / API-E2E-F-001 | `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts`; Agent/Team existing-run form coverage | Use the exact Codex `configSchema.parameters` payload with `type: "enum"`; after the source correction, assert normalization, allowed-value validation, dirty-state, Save enablement, and exact update mutation for at least Team and shared validation behavior | REQ-004/010/011; AC-001/006/009/011/016; real backend catalog in `browser-evidence.json` | Do not change tests until the source contract/fix is reviewed. |
| API-E2E-F-002 | Root in-process GraphQL E2E schema construction used by the 15 failing files | Configure the complete Studio Application API service set through a deterministic shared harness before schema/resolver construction; retain production fail-closed behavior | SR-005 Studio boundary; root `package.json` authoritative `test:e2e` command | Preliminary test/fixture classification; `code_reviewer` must confirm origin. Non-Studio failures require separate triage rather than blanket expectation changes. |

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
| 14 | `pnpm exec vitest run utils/__tests__/llmConfigSchema.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Web | Existing client schema/form regression after live failure | Pass — 3 files / 25 tests; inadequate real-Codex fixture confirmed by focused reproduction |
| 15 | `pnpm test:e2e` | Workspace root | Project-supported complete server E2E build | Fail — 15/70 files and 41/252 tests failed; 29 failure occurrences involve missing Studio service composition; full log retained |

## Post-Repository Confidence Scorecard

This scorecard reflects the round-3 focused reproduction and root E2E result. It supersedes the historical API-REV-002 post-repository score for current routing.

| Category | Score | Support | Remaining Uncertainty | Improvement |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Earlier API-E2E-001–008 remain valid and focused web tests pass | Exact production Codex schema was absent from durable coverage and Save had not yet been proven | Fix and rerun exact schema/browser journey. |
| Changed-boundary execution directness | 93% | The focused normalization probe directly exercises production utility code with the captured backend payload shape | It is not a durable test and does not submit the mutation | Add exact durable regression after fix. |
| Cross-boundary integration realism and mock gap | 90% | Previous API, worker, lifecycle, and intercepted renderer evidence remains | Root E2E composition is red; no prior single composed browser/backend run | Execute the user-requested real stack. |
| Environment/configuration/identity/fixture fidelity | 90% | Actual package and configured Codex runtime were available | Before the composed run, their integrated identity was not yet proven | Real import/team/provider journey. |
| Failure/edge/lifecycle/recovery evidence | 93% | SR-005 ownership/lifecycle suites remain strong | Broad E2E schema composition failures are unresolved | Focused failure-origin review and harness repair. |
| User-surface/browser/desktop confidence | 75% | Existing forms and intercepted browser probe pass | Real catalog schema is not represented; critical Save unproven | Real Chromium against real backend/catalog. |
| Durable regression quality/relevance | 60% | Focused test suites are deterministic | Root suite has 41 failures and exact Codex enum gap | Repair shared composition and add exact enum regression. |

- Overall post-repository confidence: `82.3%` (`576 / 7`).
- Calculation: simple average of seven applicable categories; critical-AC/weak-category gates checked independently.
- Every critical AC directly proven: `No` — exact real Codex stopped-config Save was unproven.
- Any applicable category below 90%: `Yes` — requirement proof, user-surface confidence, durable regression quality.
- Default 95% target met: `No`.
- Residuals: exact production enum schema handling, root E2E service composition, and several non-Studio broad-suite failures.

## Broader Validation Decision

- Decision: `Required — Completed, result Fail`.
- Selected mode: real composed `Browser` + `Live API` + real Codex provider, with actual external local package import.
- Evidence gain: Proved the exact frontend/backend/package/Team/GraphQL/WebSocket/provider path and exposed `API-E2E-F-001`, which the prior intercepted browser payload and focused unit fixtures missed.
- Final confidence: `78.3%`; acceptance confidence decreased because direct evidence contradicted the previously passing mocked/fixture path.
- Browser rationale: This was the exact user-requested manual-style journey. No multi-tab, revision, timing, rebase, or simultaneous-call scenario was introduced.

## Desktop Application Validation Decision

- Framework: Electron wrapping Nuxt.
- Web-equivalent behavior: Settings loading/lock/forms/Save/notices/layout.
- Shell behavior changed: None.
- Approach: Existing owned Chromium probe; actual Electron is unnecessary.
- Effect on running desktop: None.

## Live Environment And Fixture Plan

- Canonical `pnpm dev` built all server packages successfully but could not own fixed port 8000. The isolated real backend/frontend were started on ports 38123/33123 with validation-owned `.autobyteus/development` data.
- The exact `/home/autobyteus/workspace/autobyteus-agents` source, actual package registry, real Team definition, real run ID/member IDs, current Codex catalog, current SQLite/files, GraphQL, WebSockets, and GPT-5.4 response were exercised.
- Semantic JSON, full operation captures, screenshots, service/build logs, focused reproduction, root E2E log, final-state hashes, and cleanup proof are retained under `probes/api-e2e/full-stack-classroom-sr005`.
- Chromium, Nuxt, built backend, validation ports/data, and generated shared-package outputs were cleaned. External package source and unrelated PID 63/data on port 8000 were not modified.

## Temporary Executable Validation Plan

| Scenario | Method | Behavior | Why Temporary |
| --- | --- | --- | --- |
| API-E2E-006 | Sanitized provider preflight; paid Claude turn only if configured | External availability | Pass — harness 1 file / 18 tests; Anthropic credential absent, so no paid turn. |
| API-E2E-009 | Real Nuxt + freshly built backend + system Chromium + actual local package + real Codex App Server | Composed import/render/launch/Stop/Settings/Save/later message/provider path | External local repository and credentialed provider make this ticket evidence; exact schema regression must instead be added to durable web coverage after the fix. |

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
| Actual stopped-run Codex model-config persistence and later use | Blocked by `API-E2E-F-001`: UI validation disables Save before transport | Source fix plus exact durable schema/form regression, then rerun API-E2E-009. |
| Root E2E clean baseline | `API-E2E-F-002`: authoritative command has 41 failures | Focused failure-origin review; repair production-equivalent service composition and triage remaining failures. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| API-E2E-F-001 real Codex enum choice is rendered but always rejected by client validation, disabling Save | `Local Fix` — preliminary frontend implementation defect | `failure.png`, `browser-evidence.json`, `enum-schema-reproduction.log`, `autobyteus-web/utils/llmConfigSchema.ts` | `/code_reviewer` for focused origin confirmation, then likely `/implementation_engineer` |
| API-E2E-F-002 root E2E suite lacks required Studio API service composition in many in-process schemas; several other failures also exist | `Local Fix` — preliminary durable test/harness regression, with non-Studio failures still `Unclear` | `root-pnpm-test-e2e.log`: 15 files / 41 tests failed; 29 missing-service occurrences | `/code_reviewer` for origin split; likely `/api_e2e_engineer` after source rework for test fixture changes |

Any simultaneous-call/revision fix remains outside the contract.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — result Fail`.
- Repository-Resident Durable Coverage Added / Updated / Removed In Round 3: `No`. Temporary ticket probes/evidence only.
- Prior completed confidence: `97.1%` (`API-REV-002`); current final confidence: `78.3%` (`API-REV-003`).
- Broader validation decision: `Required — completed` through fully composed real frontend + backend + actual local package import + Classroom Simulation Team + real Codex turn.
- Reroute Required: `Yes` — `API-E2E-F-001` and `API-E2E-F-002` require focused failure-origin review.
- Recommended Recipient: `/code_reviewer`.
- Notes: Critical Save acceptance failed. No GraphQL interception or fixture route was used.
