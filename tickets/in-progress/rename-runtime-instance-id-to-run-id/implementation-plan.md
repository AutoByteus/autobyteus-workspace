# Implementation Plan

## Scope Classification

- Classification: `Large`
- Reasoning:
  - Cross-cutting rename across backend runtime managers/services, GraphQL schema/resolvers, frontend runtime documents/stores/components, tests, and docs.
- Workflow Depth:
  - `Large` -> proposed design doc -> future-state runtime call stack -> runtime call stack review (`Go Confirmed`) -> implementation plan -> progress tracking

## Upstream Artifacts (Required)

- Investigation notes: `tickets/in-progress/rename-runtime-instance-id-to-run-id/investigation-notes.md`
- Requirements: `tickets/in-progress/rename-runtime-instance-id-to-run-id/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/rename-runtime-instance-id-to-run-id/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/rename-runtime-instance-id-to-run-id/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/rename-runtime-instance-id-to-run-id/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes:
  - Review gate revalidated after frontend runtime internal naming refinement and reached `Go Confirmed` with two clean deep-review rounds (`rounds 10-11`).

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready`: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Not primary design basis for `Large`; see `proposed-design.md`.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Write-Back | Write-Back Completed | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | N/A | Candidate Go | 1 |
| 2 | Pass | No | N/A | Go Confirmed | 2 |
| 3 | Pass (after write-back) | Yes | Yes | Reset | 0 |
| 4 | Pass | No | N/A | Candidate Go | 1 |
| 5 | Pass | No | N/A | Go Confirmed | 2 |
| 6 | Pass (after write-back) | Yes | Yes | Reset | 0 |
| 7 | Pass | No | N/A | Candidate Go | 1 |
| 8 | Pass | No | N/A | Go Confirmed | 2 |
| 9 | Pass (after write-back) | Yes | Yes | Reset | 0 |
| 10 | Pass | No | N/A | Candidate Go | 1 |
| 11 | Pass | No | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `11`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Bottom-up and test-driven for rename safety.
- No backward-compatibility aliases for runtime `*Instance*` naming.
- Include targeted runtime module/file `Rename/Move` so runtime naming is aligned at both symbol and import-path levels.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | Rename/move backend runtime manager modules to run paths | None | Sets canonical import targets for all downstream files |
| 2 | Rename/move backend GraphQL runtime type/converter modules + schema imports | 1 | Keeps resolver/converter layer aligned with run module paths |
| 3 | Update run-history/continuation/external-channel imports to renamed modules | 1,2 | Runtime orchestration must compile with new import graph |
| 4 | Rename/move frontend runtime GraphQL document modules and update store imports | 2 | Frontend runtime source paths should mirror run semantics |
| 5 | Backend memory domain/services + memory GraphQL types/converters | 1..4 | Preserve already-completed `runId` memory contract alignment |
| 6 | Frontend memory GraphQL docs + stores/components/types | 5 | Keep memory UI aligned with backend memory contract |
| 7 | Tests + docs sync | All code updates | Validate behavior and ensure canonical docs are accurate |

## Requirement And Design Traceability

| Requirement | Design Section | Use Case / Call Stack | Planned Task ID(s) | Verification |
| --- | --- | --- | --- | --- |
| R-001 | `proposed-design.md` C-001,C-003,C-005 | UC-001, UC-003, UC-004 | T-001,T-003,T-005 | grep + server tests |
| R-002 | `proposed-design.md` C-002,C-004,C-005 | UC-002, UC-003, UC-004 | T-002,T-004,T-005 | grep + server tests |
| R-003 | `proposed-design.md` C-003,C-004 | UC-003 | T-003,T-004 | GraphQL operation checks + tests |
| R-004 | `proposed-design.md` C-006 | UC-005 | T-006 | frontend targeted tests |
| R-005 | `proposed-design.md` C-001,C-002,C-005 | UC-001, UC-002, UC-004 | T-001,T-002,T-005 | code review + targeted scan |
| R-006 | `proposed-design.md` C-008 | UC-005 | T-008 | docs diff/manual verification |
| R-007 | `proposed-design.md` C-009,C-010 | UC-006 | T-009,T-010 | memory unit/component/store tests + scans |
| R-008 | `proposed-design.md` C-009,C-010 | UC-006 | T-009,T-010 | scoped semantic scan (non-runtime `agentId` unaffected) |
| R-009 | `proposed-design.md` C-011,C-012,C-013,C-014,C-015 | UC-007 | T-011,T-012,T-013,T-014,T-015 | import/path scan + targeted runtime tests |
| R-010 | `proposed-design.md` C-016,C-017,C-018,C-019,C-020 | UC-008 | T-016,T-017,T-018,T-019,T-020 | frontend runtime store/component/history tests + scoped scans + docs check |
| R-013 | `proposed-design.md` C-025 | UC-007 | T-021 | prisma generate + token-usage/artifact targeted backend tests + scans |
| R-014 | `proposed-design.md` C-026 | UC-008 | T-022 | frontend conversation/event-monitor component tests + scoped scans |
| R-015 | `proposed-design.md` C-027 | UC-011 | T-023 | external-channel targeted backend tests + scoped scans |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Modify | T-001 | Yes | server compile/tests |
| C-002 | Modify | T-002 | Yes | server compile/tests |
| C-003 | Modify | T-003 | Yes | gql resolver tests/scans |
| C-004 | Modify | T-004 | Yes | gql resolver tests/scans |
| C-005 | Modify | T-005 | Yes | run-history tests/scans |
| C-006 | Modify | T-006 | Yes | frontend store/component tests |
| C-007 | Modify | T-007 | N/A | targeted test commands |
| C-008 | Modify | T-008 | Yes | docs accuracy scan |
| C-009 | Modify | T-009 | Yes | server memory unit/graphql tests |
| C-010 | Modify | T-010 | Yes | frontend memory store/component/page tests |
| C-011 | Rename/Move | T-011 | Yes | server compile/tests + import scans |
| C-012 | Rename/Move | T-012 | Yes | server compile/tests + import scans |
| C-013 | Rename/Move | T-013 | Yes | schema import checks + graphql tests |
| C-014 | Rename/Move | T-014 | Yes | frontend store/component tests + import scans |
| C-015 | Modify | T-015 | Yes | frontend runtime component tests + lint-like scan |
| C-016 | Modify | T-016 | Yes | frontend selection store tests + runtime scans |
| C-017 | Modify | T-017 | Yes | frontend context store tests + runtime scans |
| C-018 | Rename/Move | T-018 | Yes | runtime row component tests + import scans |
| C-019 | Modify | T-019 | Yes | runtime panel/history tests + event-contract scans |
| C-020 | Modify | T-020 | Yes | docs/tests updates + scoped residual-name scans |
| C-025 | Modify | T-021 | Yes | prisma generate + token-usage/artifact targeted backend tests |
| C-026 | Modify | T-022 | Yes | frontend conversation/event-monitor targeted tests + scans |
| C-027 | Modify | T-023 | Yes | external-channel targeted backend tests + scoped scans |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-001 | Agent runtime manager symbols | Rename | replace `Instance` manager/method symbols with `Run`; update callsites | medium compile ripple |
| T-002 | Team runtime manager symbols | Rename | same for team manager/method symbols | medium compile ripple |
| T-003 | Agent GraphQL runtime APIs | Rename | update type/resolver/query/mutation names to run semantics | public breaking change |
| T-004 | Team GraphQL runtime APIs | Rename | update team type/resolver/mutations to run semantics | public breaking change |
| T-005 | Continuation/history integrations | Rename | update manager references and run/team lifecycle hooks | restore-path regressions |
| T-006 | Frontend runtime operations | Rename | update runtime GraphQL docs, stores, component typings | schema/codegen sync risk |
| T-007 | Test updates | Modify | update fixtures/assertions/operation names | false negatives if partial updates |
| T-008 | Docs sync | Modify | correct terminology and path references | stale docs risk if skipped |
| T-009 | Backend memory runtime APIs | Rename | rename memory runtime identifiers/args/fields from `agentId` to `runId`; rename memory GraphQL operations to run naming | public breaking change for memory queries |
| T-010 | Frontend memory runtime usage | Rename | rename memory query docs/variables/store state/component bindings/tests to `runId`; refresh generated graphql typings | schema/codegen coupling risk |
| T-011 | Server manager module path rename | Rename/Move | move `agent-instance-manager.ts` -> `agent-run-manager.ts`; update imports/tests/docs | medium compile ripple |
| T-012 | Server team manager module path rename | Rename/Move | move `agent-team-instance-manager.ts` -> `agent-team-run-manager.ts`; update imports/tests/docs | medium compile ripple |
| T-013 | Server GraphQL runtime module path rename | Rename/Move | move `agent-run.ts` / `agent-team-run.ts` and converters to `*run*`; update schema/imports/tests/docs | internal import breakage risk |
| T-014 | Frontend runtime GraphQL module path rename | Rename/Move | move `agentRunQueries.ts` -> `agentRunQueries.ts`, `agentTeamRunMutations.ts` -> `agentTeamRunMutations.ts`; update imports/docs/tests | frontend import breakage risk |
| T-015 | Frontend runtime method/event naming cleanup | Rename | replace residual runtime `*Instance` handlers/calls in active run flows (e.g., `terminateTeamInstance` callsites) | UI integration regressions if partial |
| T-016 | Frontend runtime selection state/API rename | Rename | replace `selectedInstanceId`/`selectInstance` semantics with run naming in selection store and call sites | state contract ripple |
| T-017 | Frontend runtime context state/API rename | Rename | replace context store runtime `instance` symbols (`createInstanceFromTemplate`, `removeInstance`, `activeInstance`, `instancesByDefinition`) with run terms | store/component coupling risk |
| T-018 | Frontend runtime row component rename | Rename/Move | move `RunningInstanceRow.vue` (+ tests) to `RunningRunRow.vue` and update imports | component import breakage risk |
| T-019 | Frontend runtime event contract rename | Rename | rename `instance-*` events to `run-*` and payload `instanceId` to `runId` in runtime/history flows | event propagation regression risk |
| T-020 | Frontend runtime docs/tests/scans alignment | Modify | update docs/examples/tests for run naming and rerun scoped residual-name scans | stale reference risk |
| T-021 | Backend no-FK ORM runtime field normalization | Modify | rename Prisma model runtime fields to `runId` with `@map("agent_id")`; propagate through token-usage/artifact contracts/tests | type/regression ripple if partial |
| T-022 | Frontend conversation/event-monitor runtime naming cleanup | Modify | rename local conversation/workspace rendering props/variables/comments from `agentId` to `runId`; update component tests | component prop contract ripple |
| T-023 | External-channel runtime contract normalization | Modify | rename external-channel runtime contracts from `agentId`/`teamId` to `agentRunId`/`teamRunId` across domain/services/providers/runtime/GraphQL setup/tests; preserve DB columns via Prisma `@map` | backend contract ripple if partial |

## Step-By-Step Plan

1. Rename/move backend runtime manager modules to run-named paths and update imports.
2. Rename/move backend runtime GraphQL type/converter modules and update schema imports.
3. Update run-history, streaming, external-channel, and tests to renamed server modules.
4. Rename/move frontend runtime GraphQL query/mutation modules and update runtime store imports.
5. Clean residual frontend runtime `*Instance` method/event naming in active run flows.
6. Rename frontend runtime selection/context internals to run semantics and propagate through runtime panels/history.
7. Rename frontend runtime row component `RunningInstanceRow` to `RunningRunRow` and update imports/tests.
8. Rename runtime event contracts (`instance-*` -> `run-*`, `instanceId` -> `runId`) in runtime/history UI flows.
9. Revalidate memory rename scope (C-009/C-010) remains intact after frontend runtime internal cleanup.
10. Execute targeted tests and scoped grep-based legacy identifier scans.
11. Synchronize impacted docs with implemented symbols and real paths.

## Refinement Iteration (`2026-02-23`) - Runtime ID Symbol Normalization

12. Frontend runtime state normalization:
- Rename `AgentRunState.agentId` to `runId` and propagate through active run stores/services/components/tests.

13. Frontend team runtime context normalization:
- Rename team runtime identity symbols from `teamId` to `teamRunId` in runtime context/store/orchestration paths where the value is execution ID.

14. Backend runtime local symbol cleanup:
- Normalize local run-oriented variables/params in stream handlers and converters from `agentId`/`teamId` to run semantics where safe and non-breaking.

15. Verification:
- Run targeted frontend runtime tests, then full backend and full frontend suites.
- Run scoped residual-name scans to ensure ambiguous runtime-ID symbols are reduced in active paths.

## Refinement Iteration (`2026-02-23`) - Artifact Runtime ID Alignment

16. Backend artifact contract cleanup:
- normalize artifact repository/service/provider active contracts to `runId` terminology and update artifact GraphQL e2e/integration/unit tests to run naming (`agentArtifacts(runId)`, `getByRunId`, `getArtifactsByRunId`).

17. Frontend artifact contract cleanup:
- update artifact GraphQL query/store/component/handler contracts from `agentId` to `runId` (`getArtifactsForRun`, `getActiveStreamingArtifactForRun`, `fetchArtifactsForRun`) and keep protocol `agent_id` mapping only at streaming handler boundary.

18. Verification:
- rerun targeted backend artifact suites and frontend artifact store/handler/component tests; run scoped scans for stale artifact runtime `agentId` contracts in active frontend/server paths.

## Refinement Iteration (`2026-02-23`) - ORM Runtime Field Naming Cleanup (No-FK Paths)

19. Prisma runtime field normalization:
- rename runtime ORM fields from `agentId` to `runId` for `TokenUsageRecord` and `AgentArtifact` while preserving `@map("agent_id")` DB mapping.

20. Backend contract propagation:
- align token-usage domain/repository/provider/processor contracts and tests to `runId` semantics.
- simplify artifact SQL repository to consume Prisma `runId` directly (remove internal `agentId` bridging usage).

21. Verification:
- run `prisma generate`;
- run targeted backend token-usage + artifact unit/integration/e2e suites;
- run scoped scans to confirm no residual runtime `agentId` naming in token-usage/artifact active paths except core-context boundary (`context.agentId`).

## Refinement Iteration (`2026-02-23`) - Frontend Conversation Runtime Naming Cleanup

22. Frontend runtime component cleanup:
- normalize remaining local runtime labels from `agentId` to `runId` in active conversation rendering and event-monitor components/types/comments.

23. Verification:
- run targeted frontend component tests for conversation + agent event monitor;
- run scoped scans confirming no residual runtime `agentId`/`teamId` labels in frontend runtime paths (`components/workspace`, `components/conversation`, `stores`, `services`, `graphql`, `types`).

## Refinement Iteration (`2026-02-23`) - External-Channel Runtime Contract Cleanup

24. Backend external-channel runtime contract cleanup:
- normalize `agentId`/`teamId` runtime target symbols to `agentRunId`/`teamRunId` across external-channel domain models, services, providers, runtime facade, and GraphQL setup mapping paths.
- rename related provider/service methods (`getLatestSourceByAgentRunId`, `getSourceByAgentRunTurn`, `upsertBindingAgentRunId`) and propagate callsites.

25. Persistence compatibility alignment:
- rename Prisma external-channel model fields to `agentRunId`/`teamRunId` while preserving DB column names via `@map("agent_id")` / `@map("team_id")`.

26. Boundary safety cleanup:
- keep core-library boundary reads (`context.agentId`) isolated in processors, normalize immediately into local `agentRunId` variables.

27. Verification:
- run `prisma generate`;
- run targeted backend suites for unit/integration/e2e external-channel + REST ingress + external-channel processors;
- run scoped scans confirming no residual external-channel runtime `agentId`/`teamId` symbols in active server paths.

## Refinement Iteration (`2026-02-23`) - Residual Runtime Filename Drift Cleanup

28. Backend runtime utility filename cleanup:
- rename `src/run-history/utils/team-member-agent-id.ts` -> `src/run-history/utils/team-member-run-id.ts`;
- update all active backend imports to the run-named utility path.

29. Verification:
- run scoped file-name scans for runtime `instance`/`agent-id`/`team-id` drift in production paths;
- run targeted backend run-history/team-run tests to validate import graph integrity after rename.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | E2E Criteria | Notes |
| --- | --- | --- | --- | --- | --- |
| backend runtime manager files | `Run` symbols/methods exported and called consistently from run-named module paths | agent stream unit tests pass | runtime facade integration tests pass | N/A | includes `Rename/Move` verification |
| backend GraphQL runtime files | run-named types/queries/mutations/resolvers in place from run-named module paths | resolver-adjacent unit tests pass | run-history/graphql integration passes where feasible | N/A | includes type/converter module move |
| backend memory files (`agent-memory-view/**`, `api/graphql/types/memory-*.ts`) | memory runtime selectors and payload identity fields use `runId`; operations renamed to `listRunMemorySnapshots` / `getRunMemoryView` | memory model/converter/type unit tests pass | memory GraphQL resolver tests pass where present | N/A | breaking API rename for memory |
| frontend runtime stores/graphql docs | run-named operations and response fields consumed correctly from run-named query/mutation modules | store specs pass | N/A | N/A | includes module-path rename checks |
| frontend runtime selection/context/history components | runtime selection/context/event contracts use run naming (`selectedRunId`, `selectRun`, `run-selected`, payload `runId`) | running/history panel specs pass | N/A | N/A | excludes application-domain `instance` naming |
| frontend memory stores/components/graphql docs | memory selection/query identity fields use `runId`; no runtime `agentId` in memory flow | memory store/component/page specs pass | N/A | N/A | generated graphql typings must match schema |
| docs files | terminology/path references accurate | N/A | N/A | N/A | manual verification |

## Test Strategy

- Unit tests:
  - server: agent stream handler and external-channel runtime related tests.
  - server: memory domain/service/converter/graphql type tests.
  - web: `agentRunStore` and `agentTeamRunStore` specs.
  - web: runtime selection/context/history specs (`RunningAgentsPanel`, `WorkspaceAgentRunsTreePanel`, runtime row component tests).
  - web: memory store/component/page specs.
- Integration tests:
  - server runtime facade/channel binding + run-history-targeted checks.
- E2E feasibility: `Feasible` (for representative in-scope GraphQL/runtime flows).
- If full-suite E2E is not feasible, concrete reason and current constraints:
  - unrelated baseline failures outside this ticket scope still exist in broader suite runs.
- Best-available non-E2E verification evidence in addition to scoped E2E:
  - targeted unit/integration tests + grep-based rename checks + manual source validation.
- Residual risk notes:
  - external consumers with stale GraphQL schema/client generation may break until synchronized.

## Test Feedback Escalation Policy (Execution Guardrail)

- For any failing integration/E2E test during this ticket:
  - classify as `Local Fix`, `Design Impact`, or `Requirement Gap`.
  - if cross-cutting/unclear root cause -> update investigation notes before design/requirement write-back.
  - for `Design Impact`/`Requirement Gap`, re-enter design/call-stack/review gate before resuming.

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| frontend graphql docs | backend schema endpoint | shared contract generation | keep operation names aligned manually in ticket | schema endpoint updated to renamed operations | Needed | Ticket owner |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| path naming drift (`*instance*` runtime filenames) | manager/resolver/frontend runtime document file paths still include `instance` | `Naming Drift Check`, `Change Inventory` | include `Rename/Move` work as `C-011..C-015` in current ticket | Closed |
| memory runtime naming drift (`agentId` used for run identity) | `agent-memory-view/**`, `memory-index.ts`, `memory-view.ts`, memory frontend stores/components | `Requirements And Use Cases`, `Naming Decisions`, `Change Inventory` | included as `C-009`, `C-010` and `UC-006` in v2 | Closed |
| frontend runtime internal naming drift (`selectedInstanceId`, `instance-*`, `RunningInstanceRow`) | `agentSelectionStore.ts`, `agentContextsStore.ts`, `agentTeamContextsStore.ts`, runtime/history components | `Naming Drift Check`, `Change Inventory`, `Use Case Coverage Matrix` | included as `C-016..C-020` and `UC-008` in v4 | Closed |

## Refinement Iteration (`2026-02-23`) - Final Runtime Boundary Audit And Residual Cleanup

30. Final production-path runtime naming audit:
- rerun scoped scans across frontend/backend runtime paths for residual `*Instance*`, `instanceId`, and runtime-local `agentId/teamId` drift.
- classify any residual matches as either active-path defects or core-boundary bridge reads.

31. Residual active-path cleanup:
- normalize any remaining ambiguous runtime wording in active non-core modules (no behavior changes), including log/comment/local variable naming where values are run identifiers.

32. Verification:
- run affected backend unit tests and touched frontend runtime/application tests.
- record final residual inventory and explicit boundary exceptions in `investigation-notes.md` and `implementation-progress.md`.
