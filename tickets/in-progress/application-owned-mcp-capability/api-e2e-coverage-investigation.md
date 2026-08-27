# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/application-owned-mcp-intended-behavior.md`
- Solution Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/solution-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/architecture-review-revision-record.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-revision-record.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` `CRR-002` renewed source-review pass after `IR-002`; mandatory coverage investigation and the real provider/worker/Team/catalog-transition/concurrency/shutdown matrix were requested.
- Prior Investigation Reviewed: `N/A`; no prior coverage investigation or completed API/E2E result exists.
- Latest Authoritative Investigation: `Round 1 — completed coverage decisions, repository execution, and broader-validation gate`

## Current Requirement And Design Basis

The current approved behavior is one application-owned agent-tool declaration/handler contract, selected explicitly by application Agent/Team definitions and projected with the same meaning across AutoByteus native and Claude/Codex Agent Tools MCP. The route is immutable and exact-application/binding/producer scoped; the host must validate raw JSON arguments, ownership, the current declaration fingerprint, payload bounds, worker state, and the bounded MCP-safe result before returning. General sessions and other applications must not receive the route. Every registered Agent Tools MCP static-adapter name is forbidden to applications, while a non-static application tool wins over a configured MCP tool only in the owning application session; the existing configured-MCP/static protected/preferred branch remains unchanged.

Lifecycle proof is critical: real worker load requires exact handler-name equality; reload/removal closes admission and drains admitted calls before worker stop and target-slice mutation; immutable old routes survive only code-only/unchanged-declaration reentry and fail after removal or declaration change; crash does not trigger invocation retry; session revocation prevents later calls; platform shutdown drains the tool lane before stopping workers. The strict current contract is manifest v5/backend-definition v7. Prior v4/v6 generated package artifacts are rebuildable and must not be accepted through compatibility readers. Durable databases, bindings, journals, Agent/Team definitions, and configured MCP state remain directly usable without migration. Brief Studio `get_brief_context` is the maintained read-only proof derived from immutable caller `bindingId` and application-owned durable state.

Critical direct-proof set: AC-005, AC-008, AC-010, AC-012–AC-015, AC-019–AC-027, AC-030, and AC-031. These require more than the current focused mocked unit coverage.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / v5 declarations and v7 exact handlers | Added / Changed | REQ-001, REQ-002, REQ-004, REQ-016; AC-001–AC-004, AC-028 | Update all v4/v6 fixtures; add exact handler-map and import-safe declaration coverage. |
| BEH-002 / exact-app selection and full static namespace | Added / Changed | REQ-003, REQ-004, REQ-009; AC-005–AC-009, AC-013 | Retain IR-002 collision tests and add current-contract readiness/selection/isolation coverage. |
| BEH-003 / AutoByteus plus Claude/Codex projection | Added | REQ-005, REQ-006, REQ-012; AC-010–AC-014 | Execute native bound-tool and real MCP session/HTTP list+call paths, not provider-name-only mocks. |
| BEH-004 / authorized child-worker invocation | Added | REQ-007–REQ-011; AC-015–AC-020, AC-031 | Add real child-worker invocation, Team identity, raw-invalid parity, result/error/bound coverage. |
| BEH-005 / transition, concurrency, crash, revocation, shutdown | Added / Changed / Removed | REQ-013–REQ-015; AC-021–AC-027 | Remove obsolete refresh-coordinator coverage; replace old reentry tests with transition/participant tests; run overlapping call/transition and shutdown probes. |
| BEH-006 / clean v5/v7 cut and durable-state direct use | Changed / Preserved | REQ-016, REQ-017; AC-028–AC-031 | Update stale fixtures; assert v4/v6 rejection rather than preserve them as valid; rebuild maintained outputs and exercise existing app/platform data without migration. |
| BEH-007 / native foundation, Team trio, compactor exclusion | Preserved | REQ-003, REQ-012; AC-001, AC-005, AC-008 | Retain existing exposure tests and rerun affected native factory/integration coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Declaration catalog, route fingerprints, validation gateway, worker result contract | Focused IR-002 catalog/host/readiness unit tests; implementation build | Most new gateway/catalog/result behavior has no durable tests | Vitest unit + integration |
| API / transport / contract | Yes | Manifest v5, backend v7, MCP tools/list and tools/call application routes, worker JSON-RPC | Existing generic MCP route integration and application worker integrations | No durable application-tool MCP route or worker call crosses the real HTTP/child-process boundaries | Live API / worker integration |
| Frontend component / state | No | No renderer source changed | N/A | None | None |
| Browser integration / user journey | No | Settings/GraphQL package command is a backend lifecycle trigger; no renderer behavior changed | Package command/GraphQL backend paths exist | DOM proof would not materially improve the changed backend boundary | Browser not required; direct GraphQL/service lifecycle is preferred |
| Authentication / session / permissions | Yes | Bearer session route issuance/revocation plus exact binding/producer authorization | Existing generic session authority tests | No application route general/App A/App B visibility and no post-revocation real call | MCP HTTP + ownership integration |
| Desktop renderer / web-equivalent UI | No | None | N/A | None | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes | Child worker load/crash/stop, catalog reentry, session close, platform shutdown | Existing generic worker/lifecycle suites; implementation narrow probes were temporary | Call drain ordering, crash/no-retry, target-only transition, shutdown ordering lack durable cross-boundary proof | Lifecycle / child worker |
| Persisted-data transition | Yes | Rebuild v4/v6 packages; directly use existing durable DB/binding state | Maintained package build/validate evidence | Repository fixtures still assert v4/v6 as valid; direct-use representative application data not yet coupled to tool call | CLI build/validate + integration data fixture |
| Worker / queue / distributed coordination | Yes | Host-child JSON-RPC, per-app admission counters, transition mutex | Generic worker completion integration | No real application agent-tool call, concurrent call/transition, or serialized transition matrix | Worker/process + concurrency |
| External integration | Yes, bounded | Runtime-provider projection for AutoByteus/Claude/Codex | Provider factory and generic MCP tests | Actual external LLM credentials are not needed to prove server-owned route projection, but real provider adapters/sessions must be exercised | Real provider construction plus real shared MCP route; external model call only if configured and useful |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability`
- Project type and runtime stack: Git/pnpm TypeScript monorepo; Node `22.x`; pnpm `10.28.2`; Vitest fork pool with serial files; Prisma SQLite test runtime; application backends run in child workers; Fastify/GraphQL/shared MCP HTTP routes.
- Conflicting, missing, or unclear project instructions: No direct conflict. The root/server docs distinguish deterministic repository E2E from optional real-provider E2E. `RUN_CODEX_E2E=1` enables live Codex suites, but unavailable external capabilities must be reported rather than represented as passed. No browser or Electron validation is justified because no frontend/shell boundary changed.
- Required environment variables or secrets available: deterministic test runtime `Yes`; external-provider secrets `Unclear` until preflight and not required for server-owned route proof. Secret values will not be recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/README.md` | Workspace setup and E2E authority | `corepack pnpm install`; `pnpm test:e2e`; optional `pnpm test:e2e:real:preflight` / `pnpm test:e2e:real`; unavailable capabilities must remain explicit. |
| `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/AGENTS.md` | Closest test instruction | Use `vitest run ... --no-watch`; integration directory command is authoritative. |
| `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/README.md` | Server development/test/environment guide | Test state is isolated under `tests/.tmp`; `.env.test` is the tracked credential-free template; optional provider gates include `RUN_CODEX_E2E`. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts`, `.env.test` | Exact runner/build setup | `pretest` rebuilds shared packages; Vitest includes `tests/**/*.test.ts`, runs serial files in forks, uses Prisma global setup. |
| application package `README.md` and `package.json` files | Maintained package build/validate | `corepack pnpm --filter <app> build`; `validate`; Brief Studio owns durable brief state and current Team package. |
| `autobyteus-application-devkit/README.md` and package scripts | Package lifecycle | Import remains prebuilt-only; build/validate/start use real package/standalone owners; generated output is reproducible. |
| `test-support/live-e2e/*` and root real-E2E scripts | Optional external-provider execution | Builds server, starts an isolated loopback test server, scans evidence, reports missing/unavailable capabilities, and cleans owned temp state. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | worktree root | `corepack pnpm install --frozen-lockfile` if relink is needed | Existing `node_modules` is present from implementation | command exit 0 | No process |
| Prisma/Vitest runtime | `autobyteus-server-ts` | Vitest command; global setup owns DB | Uses test-owned SQLite under `tests/.tmp` | test setup success | Vitest/global teardown; remove only run-owned temp roots |
| Maintained application output | app package root | `corepack pnpm build && corepack pnpm validate` via filters | Creates reproducible `dist/` | validation output | Remove generated untracked `dist/` after evidence unless needed by a test |
| Child application worker | test harness | Existing `ApplicationEngineController`/launcher or `application-engine-test-runtime` | Must use unique temp app/data roots | worker ready status / successful load | controller/launcher stop in `finally` |
| Shared Agent Tools MCP host | in-process test/server harness | `createAgentToolsMcpHost` and Fastify route registration | Loopback/in-memory server; bearer session is test-owned | MCP initialize/list response | revoke/close host and app scope in `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| v5/v7 application package | Existing fixture builders/devkit package output | Temp roots only; no production package mutation | Delete temp/generated output after run |
| App A/App B same-name catalogs | In-memory bundle snapshots or temp packages | Deterministic compound application IDs | Test-local |
| Binding and Team identity | Existing application binding store/ownership service fixtures and server-minted Team member identities | No caller-supplied identity used as authority | Test DB/temp stores cleaned by suite |
| Brief durable business state | Existing Brief repositories/correlation and application SQLite temp copy | Must derive by caller `bindingId` | Temp app data removed after run |
| Concurrency gates | Deferred promise/barrier inside test handler | No timeout used as production behavior; test-only safety deadline permitted by runner | Test-local |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild` for generated/importable v4/v6 package artifacts; `Directly Usable — No Migration` for application/platform databases, bindings, journals, launch overrides, Agent/Team definition files, and global MCP configuration.
- Design-spec and implementation-handoff references: `design-spec.md` Persisted Data / State Transition Decision and strict transition sections; `implementation-handoff.md` Legacy / Compatibility Removal Check and Persisted Data Transition Check.
- Representative existing-data setup and required behavior: rebuild Brief Studio and Socratic packages on v5/v7; run the current reader and maintained Brief tool against separately existing application business state/binding data without any migration or rewrite; assert strict rejection of retired v4/v6 package/definition artifacts.
- Evidence planned: updated durable current-version fixture tests, explicit old-version rejection, maintained build/validate, real Brief binding-derived worker call, and git/source checks for absence of compatibility readers.
- Migration-specific completion/recovery scenarios: `N/A`; migration is not approved.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` IR-002 scenarios | Registered/preferred/protected/inactive static rejection, non-static app-over-configured, no-app configured browser precedence | REQ-009; AC-013, AC-014 | Still Valid | CRR-002 passed 3 files/16 tests; assertions match SR-005 | Retain and rerun. |
| `tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts` immutable all-provider snapshot | Host publishes frozen complete names-only snapshot | REQ-004, REQ-009; AC-013 | Still Valid | Current implementation/readiness boundary | Retain and rerun. |
| `tests/unit/application-platform/application-definition-runtime-readiness.test.ts` | Unselected `open_tab` declaration still fails readiness | REQ-004, REQ-009; AC-007, AC-013 | Still Valid | New source-review-passed durable test | Retain and expand only if broader readiness cases are not covered elsewhere. |
| `tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | Application/general composition and assembly isolation | REQ-005, REQ-012; AC-010, AC-011 | Still Valid, but incomplete | Composition-only; does not invoke routes | Rerun and supplement with real MCP/native execution. |
| Existing native exposure/resolver/factory unit and integration tests | Foundation baseline, Team trio, configured additivity/deduplication, compactor empty set | BEH-007; AC-001, AC-005, AC-008 | Still Valid | Approved preserved behavior | Rerun affected focused set. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Generic bearer initialize/list/call/auth/revocation | REQ-005, REQ-006, REQ-012; AC-010, AC-011, AC-025 | Still Valid, but missing application routes | Exercises real HTTP MCP boundary only for existing static routes | Extend or add adjacent application MCP integration coverage. |
| `tests/integration/application-backend/application-engine-test-runtime.ts` and worker integration suites | Real child-worker protocol and application context behavior | REQ-002, REQ-007, REQ-010; AC-002, AC-015–AC-020 | Still Valid as harness; fixtures need current contract | No application agent-tool invocation case | Reuse for v7 handler and real worker call coverage. |
| `autobyteus-application-devkit/tests/application-devkit.test.mjs` manifest version assertion | Generated starter/package contract | REQ-016, REQ-017; AC-028 | Needs Update | Still asserts manifest v4 | Change to v5 and assert current application-tool field behavior. |
| `tests/unit/application-bundles/file-application-bundle-provider.test.ts` v4 fixtures and v6 generated definition string | Static manifest/bundle parsing, diagnostics, import safety | REQ-001, REQ-004, REQ-016; AC-001–AC-004, AC-028 | Needs Update | Three v4 manifests and one v6 definition remain | Convert valid fixtures to v5/v7; add retired-v4 rejection and declarations. |
| `tests/unit/application-engine/application-backend-definition-loader.test.ts` | Definition version/route validation | REQ-002, REQ-004, REQ-016; AC-002, AC-003, AC-028 | Needs Update | Valid fixtures and expected diagnostic still use v6 | Convert to v7, retain explicit stale-version rejection, add exact handler-map cases. |
| Four `tests/integration/application-backend/*` files with v6 fixture modules | Real mount/REST/WS/context child-worker coverage | REQ-016; AC-028 | Needs Update | Current production strictly requires v7, so suite setup is stale | Convert fixtures to v7; their non-tool assertions remain valid. |
| `tests/unit/application-packages/application-catalog-refresh-coordinator.test.ts` | Old destructive refresh coordinator order | Removed DS-006/DS-011 path; REQ-013–REQ-015 | Stale / Remove | Production module is deleted and forwarding wrapper is forbidden | Remove and replace with `ApplicationCatalogTransitionService` durable tests. |
| `tests/unit/application-packages/application-package-command-service.test.ts` | Commands call `refreshCoordinator`, then rollback/finalize | REQ-013–REQ-015; AC-021–AC-024 | Replace | Assertions protect the removed owner and wrong mutation boundary | Rewrite against `runPackageTransition`, preserving registry/source/finalizer ownership assertions. |
| `tests/unit/application-orchestration/application-availability-service.test.ts` first four scenarios | Availability snapshot and persisted-known quarantine | REQ-015, REQ-017 | Still Valid | Independent of removed reentry API | Retain. |
| Same file's `ApplicationReentryService.reloadAndReenter` scenarios | Reentry directly reloads bundle and owns catalog mutation | Removed DS-006 path; AC-021–AC-024 | Replace | Production reentry is participant-only; exact reentry now belongs to transition service | Replace with participant preparation/recovery/quarantine and transition-service cases. |
| Existing application platform lifecycle/shutdown tests | General owner order/idempotent cleanup | REQ-015; AC-026 | Needs Update | No direct assertion that tool drain precedes worker stop | Add application-tool drain order and admitted-call overlap. |
| Existing ownership-service tests | General binding/run ownership reconciliation | REQ-007, REQ-011; AC-015, AC-016 | Needs Update | No application tool standalone/configured/descendant/forged identity matrix | Add exact `requireLiveApplicationToolProducer` scenarios. |
| Architecture boundary tests | Dependency directions, removed path restrictions | Design guidance / no-legacy rule | Needs Update | Current fixture references still mention removed coordinator as an allowed reconciliation seam | Replace old coordinator allowance with transition owner and add application-tool boundary prohibitions. |
| Root `pnpm test:e2e` and optional real-provider harness | Broad deterministic/API and configured external capability execution | AC-030 | Still Valid as execution infrastructure, not sufficient alone | No feature-specific application-tool journey exists | Run broad deterministic affected suites; use provider preflight only to classify optional external access. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/application-packages/application-catalog-refresh-coordinator.test.ts` | `refresh()` destructively refreshes bundle then reconciles/caches | The coordinator and direct bundle refresh path are intentionally removed; retaining the test would protect forbidden legacy behavior | SR-003; ARCH-DI-002 resolution; design removal plan; implementation handoff | New transition-service target-slice, drain, rollback, serialization, and quarantine coverage | N/A |
| Reentry portion of `application-availability-service.test.ts` | `ApplicationReentryService.reloadAndReenter()` stops worker, calls `bundleService.reloadApplication`, then resumes | Catalog mutation is now exclusively owned by `ApplicationCatalogTransitionService`; reentry owns participant lifecycle only | DS-006/DS-011; implementation source | Participant prepare/recover/quarantine tests plus exact-app transition test | N/A |
| `application-package-command-service.test.ts` refresh-coordinator expectations | Package commands invoke refresh directly and repeat refresh during rollback | Package commands now pass command-owned apply/rollback operations to one transition owner | DS-006; AC-021–AC-024 | Rewritten command/transition contract tests | N/A |
| v4/v6 values when used as valid fixture state | Retired generated contracts are accepted as current | Strict clean-cut v5/v7 is approved; no compatibility reader is allowed | REQ-016, REQ-017; AC-028, AC-029; implementation legacy check | Current valid fixtures use v5/v7; focused tests keep old values only as expected rejection inputs | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-MCP-001 | App A/App B/general/unselected isolation and same local name through real MCP HTTP session | REQ-005, REQ-006, REQ-009; AC-006, AC-010–AC-012, AC-014 | `tests/integration/agent-tools/mcp/application-agent-tools-mcp-routes.integration.test.ts` | Unit route-table assertions do not prove bearer/session/HTTP tools/list+call behavior. |
| API-RUN-001 | AutoByteus native composition and raw-invalid parity versus MCP; unchanged automatic baselines | REQ-003, REQ-005, REQ-010, REQ-012; AC-001, AC-005, AC-019 | New native application-tool unit/integration file plus MCP integration | This is the provider-invariant contract and prior design defect area. |
| API-WRK-001 | v7 exact handler load and real child-worker invocation with caller context/result/error | REQ-002, REQ-007–REQ-011; AC-002, AC-003, AC-015–AC-020 | `tests/integration/application-backend/application-agent-tools-worker.integration.test.ts` | Temporary Node checks are not durable and mocked gateways bypass the process boundary. |
| API-TEAM-001 | Configured Team member and task-created descendant authorization; forged/wrong/terminal cases rejected | REQ-006, REQ-007, REQ-011; AC-008, AC-015, AC-016 | Ownership/service durable tests and provider-route integration | Team descendant identity is a high-risk server-minted boundary. |
| API-CAT-001 | Transition import/reload/remove/exact-app, target-only lane/commit, rollback recovery/quarantine, mutex serialization | REQ-013–REQ-015; AC-021–AC-024, AC-027 | `tests/unit/application-orchestration/application-catalog-transition-service.test.ts` | The governing replacement owner currently has no durable test. |
| API-CON-001 | Admitted call overlaps reload/removal; new call rejected; worker stop occurs after drain; no timeout/retry | REQ-013–REQ-015; AC-021, AC-024, AC-027 | Transition/gateway integration and temporary realistic worker probe if needed | Direct concurrency evidence is mandatory. |
| API-LIFE-001 | Worker crash fail-closed, session revocation, shutdown drain/idempotency/order | REQ-015; AC-020, AC-025–AC-027 | Lifecycle/MCP integration and worker harness | Source/build evidence cannot prove process settlement/order. |
| API-PKG-001 | Current v5/v7 package rebuild, explicit old-version rejection, no migration | REQ-016, REQ-017; AC-028, AC-029 | Updated fixture tests plus build/validate commands | Stale fixtures presently contradict current production and would make broad results meaningless. |
| API-BRF-001 | Real Brief Studio `get_brief_context` reads durable state by caller binding | REQ-002, REQ-007, REQ-011; AC-017, AC-030, AC-031 | `tests/integration/application-backend/brief-studio-agent-tool-mcp.integration.test.ts` plus handler unit coverage | The shipped package, actual MCP HTTP route, exact Team binding, child worker, migrations, and durable Brief data must be one executable path. |
| API-SHD-001 | Studio and standalone lifecycle parity for catalog/tool lane/worker shutdown | REQ-005, REQ-012, REQ-015; AC-010, AC-026, AC-030 | Standalone runtime integration plus Studio composition/lifecycle test | Both composition roots changed. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-PKG-001 | Devkit, bundle provider, loader, and four worker integration fixture files listed above | Change current valid fixtures to v5/v7; retain explicit retired-version negative cases | REQ-016, REQ-017; AC-028, AC-029 | No compatibility expectation is retained. |
| API-CAT-002 | `application-package-command-service.test.ts` | Assert delegation to `ApplicationCatalogTransitionService.runPackageTransition`, command-owned apply/rollback/finalize and managed-install finalizer | REQ-013–REQ-015; AC-021–AC-024 | Replace refresh wording/helpers entirely. |
| API-CAT-003 | `application-availability-service.test.ts` | Keep availability assertions; replace direct-reload scenarios with participant lifecycle tests or move them to a focused reentry file | REQ-013–REQ-015 | Avoid protecting removed bundle mutation. |
| API-LIFE-002 | platform lifecycle tests | Add `quiesceAndDrainAll` before engine/worker stop and `closeAll` idempotency evidence | REQ-015; AC-026 | Exact order is material. |
| API-TEAM-001 | ownership service tests | Add application-tool producer identity variants | REQ-006, REQ-007, REQ-011; AC-008, AC-015 | Use server-owned route identity, not argument IDs. |
| API-ARCH-001 | application framework boundary tests | Remove old coordinator allowance and encode transition/gateway/native/MCP dependency prohibitions | Reviewed design guidance | Architecture suite otherwise retains an obsolete exception. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/application-packages/application-catalog-refresh-coordinator.test.ts` | Tests a deleted/forbidden legacy owner | REQ-013–REQ-015; DS-006/DS-011 removal plan | Replace with `application-catalog-transition-service.test.ts`. |
| Direct-reload scenarios in `application-availability-service.test.ts` | Tests removed `ApplicationReentryService.reloadAndReenter` and direct bundle mutation | AC-021–AC-024; catalog-transition ownership | Replace with participant/transition coverage; retain independent availability cases. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | CRR-002 focused 3-file/16-test command | `autobyteus-server-ts`; normal test env | Source-review collision baseline | Pass (upstream) | `code-review-report.md` |
| 2 | Initial focused feature matrix during fixture conversion | Worktree root, server Vitest | Identified one stale REST status expectation after v7 fixture conversion | Expected stale-coverage failure: 1 failed, 176 passed, 18 skipped | `/tmp/application-owned-mcp-focused-matrix.log` |
| 3 | Curated 33-file feature matrix including architecture, MCP, provider, native, worker, ownership/Team, transition/concurrency, lifecycle/shutdown, strict contracts, and shipped Brief MCP | `corepack pnpm --filter autobyteus-server-ts test --run <33 listed files> --no-watch` | API-MCP-001, API-RUN-001, API-WRK-001, API-TEAM-001, API-CAT-001/002/003, API-CON-001, API-LIFE-001/002, API-PKG-001, API-BRF-001, API-SHD-001 | Pass: 33 files / 234 tests | `/tmp/application-owned-mcp-final-matrix-with-brief.log` |
| 4 | Devkit test; frontend/devkit build; Brief and Socratic backend typecheck/build/validate | Worktree/app package roots | Strict v5/v7 regeneration and maintained package correctness | Pass; devkit 21/21, both packages valid | `/tmp/application-owned-mcp-package-matrix-final.log` and focused Brief build/validate preceding API-BRF-001 |
| 5 | `corepack pnpm --filter autobyteus-server-ts build` | Worktree root | Server/shared compile, Prisma generation, sanitized built-module bootstrap | Pass | `/tmp/application-owned-mcp-server-build-final.log` |
| 6 | `corepack pnpm test:e2e` | Worktree root | Broad deterministic repository E2E regression screen | Partial: 49 files passed, 14 skipped, 7 failed; 174 tests passed, 51 skipped, 27 failed | `/tmp/application-owned-mcp-root-e2e.log` |
| 7 | Individual reruns of all broad failures plus the corrected current Codex MCP issuer fixture | Worktree root | Failure classification and flake separation | Current Codex fixture 4/4 pass; token analytics 3/3 pass; 25 failures reproduced in five workspace/run-history files outside the ticket changed surface | `/tmp/application-owned-mcp-broad-failure-rechecks.log` |
| 8 | `corepack pnpm test:e2e:real:preflight` | Worktree root; isolated loopback runtime | Project-supported external capability/environment classification | Pass: 18/18 value-safe preflights; external secrets absent, LM Studio unavailable | `/tmp/application-owned-mcp-real-provider-preflight.log` |
| 9 | `corepack pnpm --filter autobyteus-server-ts typecheck` | Worktree root | Supplemental compile check | Blocked by repository `tsconfig.json` configuration: `rootDir=src` while tests are included, producing TS6059; authoritative server build passes | `/tmp/application-owned-mcp-server-typecheck.log` |
| 10 | `git diff --check`; retired-version/removed-owner scans | Worktree root | Patch integrity and clean strict-version/legacy cut | Pass; retired v4/v6 occur only in explicit rejection tests, deleted coordinator symbols absent | Command output observed in round 1 |

The broad-suite failures do not intersect the feature matrix: they reproduce around an uninitialized process `AgentRunManager`/`AgentTeamRunManager` during workspace cleanup and run-history GraphQL setup. No file in those five suites, their workspace/process-manager implementation boundary, or the observed call stacks is changed by the application-owned-tool implementation. A clean base-worktree comparison was attempted but the base checkout has no installed dependencies (`tsc` unavailable), so this report does not claim an executed historical baseline. They remain explicit repository residual failures rather than being silently reclassified as passes.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | All critical ACs map to passing durable contract, provider, MCP, worker, Team, transition, lifecycle, package, and Brief cases | Paid models were not asked nondeterministically to choose the tool | Not material to the platform contract |
| Changed-boundary execution directness | 97% | Actual raw MCP JSON-RPC, native AutoByteus tool, exact gateway, worker protocol, and transition owners execute | Full Studio UI launch is intentionally bypassed | No higher-value backend validation remains |
| Cross-boundary integration realism and mock gap | 95% | Real Fastify bearer route, real built Brief package, real child worker, real SQLite migrations/data, and live AutoByteus backend run | Brief startup reconciliation uses a deterministic empty-list host seam; external inference is absent | Full external model call would add nondeterministic choice, not route semantics |
| Environment, configuration, identity, and fixture fidelity | 96% | Current v5/v7 generated packages, exact Team/binding/member identities, isolated storage, real provider materializers | Optional secrets/local model are unavailable | Configure optional providers if product-level inference is separately desired |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Invalid raw input, oversized payload/result, stale route, wrong identity, crash/no retry, revocation, drain, rollback/quarantine, mutex, and shutdown order all pass | Five unrelated broad E2E files remain red | Repair their process-owner setup independently |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend, renderer, preload, IPC, or shell boundary changed | N/A | N/A |
| Durable regression coverage quality and relevance | 96% | Stale owner removed, v4/v6 converted to negative cases, replacement owners and real production package path retained | Test review is still required after these repository edits | Proportional code review of changed durable tests |

- Overall post-repository confidence: `96.3%` (simple average of six applicable categories)
- Calculation method: simple average; user-surface category is genuinely inapplicable.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: optional external model inference is unconfigured; five unrelated broad E2E files have process-owner/setup failures; supplemental server `typecheck` is unusable under the repository's current rootDir/include configuration. None removes direct proof for this ticket's critical acceptance criteria.

## Broader Validation Decision

- Decision: `Required` — completed
- Selected execution mode: `Live API + Lifecycle + Worker or Distributed + CLI`
- Specific confidence gap or residual risk addressed: repository unit evidence alone cannot prove shared MCP bearer/session routing, child-worker invocation, exact Team/binding ownership, concurrent target-only transition/drain, crash/no-retry, revocation, or shutdown order.
- Why the selected mode can materially improve confidence: it exercises the actual process/session/catalog boundaries that mocks bypass and is the explicit upstream request.
- Expected confidence after the selected validation: met; final confidence is `97.2%` with no applicable category below `90%`.
- Browser-specific decision and rationale: `Not selected`. No frontend, web-equivalent renderer, routing, browser API, or desktop-shell behavior changed; a browser would add indirect UI evidence while bypassing none of the critical worker/session/concurrency risks. Direct GraphQL/service invocation is the higher-value supported surface for the Settings-triggered package transition.
- If Not Required: `N/A`
- If Blocked: `N/A`
- Execution outcome: the real shipped Brief Studio package was built and validated, then its `get_brief_context` declaration/handler was listed and called through an authenticated Agent Tools MCP HTTP session, exact Team/binding authorization, the production gateway, a real child worker, and application SQLite state. Claude- and Codex-kind sessions returned different binding-owned Brief rows; a general session remained empty and a revoked bearer failed.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists in the broader product, but the changed capability is server/package/worker-owned.
- Relevant README or development instructions: root README packaged Electron section and local full-stack section were read.
- Web-equivalent behavior: no changed renderer journey.
- Shell-specific or lifecycle behavior: no preload/IPC/window/native packaging change.
- Chosen validation approach and why it fits the project: no browser/Electron run; execute real server API, provider adapter/session, worker, and lifecycle surfaces instead.
- Server/frontend setup when browser validation is used: `N/A`
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: no desktop behavior is claimed.

## Live Environment And Fixture Plan

- Startup order and commands: build shared/server packages; build/validate maintained v5/v7 apps; run focused deterministic Vitest; start only test-owned in-process/Fastify/worker runtimes needed by integration; optionally run root real-provider preflight after deterministic proof.
- Environment choices that materially affect the run: tracked `.env.test`; unique temporary application roots, databases, ports, and MCP bearer sessions; no development or production data.
- Health / readiness checks: worker controller state `ready`, MCP initialize response, application readiness state, loopback server readiness, and explicit test barrier observations.
- Seed data / fixtures: v5/v7 temp App A/App B packages; exact handler maps; Brief correlation/business row keyed by binding; configured global MCP fake source only where precedence is the subject.
- Test identities, authentication, permissions, or session state: general session, App A and App B Agent sessions, configured Team member, task descendant with server-minted root/member identity, wrong/forged/terminal variants, and revoked bearer.
- Requirement-linked journeys or scenarios: API-MCP-001 through API-SHD-001 above.
- Evidence to capture: exact Vitest commands/output; process order arrays and call counts; MCP JSON responses; worker start/stop state; package build/validate output; source/diff checks.
- Owned processes and temporary state to clean up: Fastify/MCP listeners, child workers, temp package/app data/database roots, generated application `dist/`, and optional real-E2E temp evidence directories.

## Temporary Executable Validation Plan

No ticket-local temporary probe was required. Deterministic promise barriers in durable transition/lifecycle tests proved admission, drain, serialization, rollback, and shutdown ordering, while the retained Brief and synthetic-worker integrations exercised the real MCP/child-process boundaries. All generated package output and test-owned runtime state was cleaned after evidence capture.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual paid/external model inference by all three providers | Server-owned tool routing can be proven with real provider adapter/session construction and MCP/native calls without nondeterministic model choice; credentials may be absent | Low after adapter/session and gateway proof; model deciding whether to call a tool is not the changed platform contract | Run optional real-provider preflight and report capability status; do not claim unconfigured providers passed |
| Browser/Electron renderer | No changed surface | None for this ticket | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at initial investigation | N/A | Approved requirements/design and CRR-002 decide fixture and behavior validity | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Post-repository confidence: `96.3%`; final confidence after broader validation: `97.2%`.
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The mandatory pre-edit investigation was completed before coverage edits. Existing v4/v6 valid fixtures were updated and now remain only as negative rejection inputs. The stale refresh-coordinator test was removed and replaced by transition-owner coverage. The durable matrix passes, including the production-reachable Brief Studio MCP/worker path requested during execution. Because repository coverage changed, this passed package returns through `/code_reviewer` for proportional test-code review before delivery.
