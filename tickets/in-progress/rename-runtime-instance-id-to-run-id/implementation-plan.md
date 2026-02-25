# Implementation Plan

## Scope Classification

- Classification: `Large`
- Reasoning:
  - Cross-layer runtime naming contract rename across server managers/GraphQL/domain/persistence/external-channel and web stores/components/GraphQL docs/types.
- Workflow Depth: `Large`

## Upstream Artifacts (Required)

- Investigation notes: `tickets/in-progress/rename-runtime-instance-id-to-run-id/investigation-notes.md`
- Requirements: `tickets/in-progress/rename-runtime-instance-id-to-run-id/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/rename-runtime-instance-id-to-run-id/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/rename-runtime-instance-id-to-run-id/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/rename-runtime-instance-id-to-run-id/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Review gate is `Go Confirmed` with two clean deep-review rounds.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready`: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Write-Back | Write-Back Completed | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | N/A | Candidate Go | 1 |
| 2 | Pass | No | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line: `Implementation can start: Yes`

## Principles

- Bottom-up: rename core manager/domain contracts before boundary consumers.
- Test-driven: run targeted unit/integration/typecheck after each boundary batch.
- No backward compatibility shims.
- One boundary batch at a time to avoid mixed runtime identity vocabulary.
- Progress tracker updates after each file/test status change.

## Dependency And Sequencing Map

| Order | File/Module Group | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | Server manager and GraphQL runtime module renames (`C-001`..`C-005`) | None | unlocks canonical runtime naming root |
| 2 | Server memory/artifact/token contracts (`C-006`..`C-008`) | 1 | aligns runtime IDs in API + persistence boundary |
| 3 | Server external-channel contract rename (`C-009`) | 1,2 | uses normalized run manager and run identity vocabulary |
| 4 | Frontend GraphQL docs + store/runtime event rename (`C-010`..`C-012`) | 1..3 | consumes final server naming |
| 5 | Frontend generated GraphQL sync (`C-013`) | 4 | typed contracts must match updated docs |
| 6 | Cleanup/docs sync (`C-014`,`C-015`) | 1..5 | remove stale names and align docs |

## Requirement And Design Traceability

| Requirement | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 5 Verification (Unit/Integration) | Stage 6 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- |
| R-001,R-002,R-003,R-009 | Change Inventory C-001..C-005 | UC-001..UC-004, UC-007 | T-001,T-002 | server unit + typecheck + targeted e2e GraphQL tests | SV-001,SV-002 |
| R-007 | Change Inventory C-006 | UC-006 | T-003 | memory resolver/store tests | SV-003 |
| R-012,R-013 | Change Inventory C-007,C-008 | UC-010 | T-004 | artifact/token usage repo/service tests | SV-004 |
| R-015,R-008 | Change Inventory C-009 | UC-011 | T-005 | external-channel unit/integration tests | SV-005 |
| R-004,R-010,R-011,R-014 | Change Inventory C-010..C-013 | UC-005,UC-008,UC-009 | T-006,T-007 | web unit/integration + typecheck | SV-006 |
| R-006 | Change Inventory C-014,C-015 | UC-007,UC-010,UC-011 | T-008 | docs/reference scans | SV-007 |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001..C-005 | Rename/Move + Modify | T-001,T-002 | Yes | server typecheck + runtime resolver tests |
| C-006..C-008 | Modify | T-003,T-004 | Partial | server tests + Prisma typecheck |
| C-009 | Modify | T-005 | No | external-channel tests |
| C-010..C-013 | Modify | T-006,T-007 | No | web tests + GraphQL codegen/typecheck |
| C-014,C-015 | Modify/Remove | T-008 | Yes | docs scan + stale reference search |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-001 | `agent-instance*` runtime manager modules | Rename/Move | rename files/classes/methods, update imports | wide import fanout |
| T-002 | runtime GraphQL instance modules/converters | Rename/Move | rename files/symbols and schema registration | API naming ripple |
| T-008 | stale instance-named runtime imports/docs/tests | Remove | global search, cleanup, targeted test updates | avoid removing non-runtime application scope |

## Step-By-Step Plan

1. Execute server runtime manager + resolver/converter module rename and import rewires.
2. Rename run-history/memory/artifact/token runtime contract fields to run naming with ORM mapping preserved.
3. Rename external-channel runtime target/receipt/callback contracts to `agentRunId`/`teamRunId`.
4. Update frontend GraphQL docs + runtime stores/components/events to run naming and sync generated types.
5. Run targeted server/web test suites and typechecks; fix regressions boundary-by-boundary.
6. Run aggregated system validation scenarios and document outcomes.
7. Sync impacted docs and record final no-legacy cleanup checks.

## Per-File Definition Of Done

| File/Group | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| Server run manager + GraphQL runtime files | No `instance` runtime names in symbols/paths | related resolver/manager unit tests pass | GraphQL runtime integration tests pass | no wrapper aliases |
| Server memory/artifact/token files | run-oriented names used end-to-end | related unit tests pass | query/mutation integration checks pass | `@map` compatibility retained |
| External-channel runtime files | runtime target contracts use agentRunId/teamRunId | provider/service unit tests pass | ingress/callback integration tests pass | behavior unchanged |
| Web runtime stores/components/docs | run-oriented selection/events/graphql fields | store/component tests pass | workspace integration tests pass | generated types updated |

## Test Strategy

- Unit tests:
  - `autobyteus-server-ts/tests/unit/api/graphql/types/*.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/*.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/**/*.test.ts`
  - `autobyteus-web/stores/__tests__/*.spec.ts`
  - `autobyteus-web/components/**/__tests__/*.spec.ts`
- Integration tests:
  - `autobyteus-server-ts/tests/integration/run-history/*.test.ts`
  - `autobyteus-server-ts/tests/integration/distributed/*.test.ts` (targeted)
  - `autobyteus-web/tests/integration/*.test.ts` (runtime selection/history flows)
- Stage 5 boundary: file/module/service-level verification only.
- Stage 6 handoff critical flows:
  - runtime run creation/send/terminate,
  - run history continuation,
  - memory view/index by runId,
  - external-channel dispatch + callback route.

