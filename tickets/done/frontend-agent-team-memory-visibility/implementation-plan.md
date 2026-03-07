# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: backend GraphQL additions + new frontend scope-aware stores/components across multiple layers.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/frontend-agent-team-memory-visibility/workflow-state.md`
- Investigation notes: `tickets/in-progress/frontend-agent-team-memory-visibility/investigation-notes.md`
- Requirements: `tickets/in-progress/frontend-agent-team-memory-visibility/requirements.md` (`Design-ready`)
- Runtime call stacks: `tickets/in-progress/frontend-agent-team-memory-visibility/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/frontend-agent-team-memory-visibility/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/frontend-agent-team-memory-visibility/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Stage 5 review reached `Go Confirmed` with two clean rounds.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-server-ts/src/agent-memory-view/services/team-memory-index-service.ts` | existing team manifest + memory store | backend index foundation |
| 2 | `autobyteus-server-ts/src/api/graphql/types/memory-index.ts` | step 1 | expose team index API |
| 3 | `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | existing memory view service + team layout | expose team member memory API |
| 4 | backend tests | steps 1-3 | verify API/service contracts |
| 5 | `autobyteus-web/graphql/queries/teamMemoryQueries.ts` + `types/memory.ts` | backend query shape | frontend contract layer |
| 6 | `autobyteus-web/stores/teamMemoryIndexStore.ts` + `teamMemoryViewStore.ts` + scope store | step 5 | frontend orchestration |
| 7 | `autobyteus-web/components/memory/MemoryIndexPanel.vue` + `MemoryInspector.vue` + `pages/memory.vue` | step 6 | UX integration |
| 8 | frontend tests | steps 5-7 | behavior regression safety |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001,R-002 | AC-001,AC-002 | Target State + C-009..C-011 | UC-001 | T-006,T-007 | frontend store/component tests | AV-001,AV-002 |
| R-003,R-007 | AC-003,AC-004 | C-001..C-006 | UC-002,UC-003 | T-001..T-006 | backend + frontend tests | AV-003,AV-004 |
| R-005,R-006 | AC-005,AC-006 | Error Handling + C-006..C-010 | UC-004 | T-006,T-007 | frontend tests | AV-005,AV-006 |
| R-008 | AC-007 | UC-005 | UC-005 | T-004,T-008 | backend regression tests | AV-007 |
| NFR-004 | AC-008 | C-012 | UC-001..UC-005 | T-004,T-008 | targeted test suites | AV-008 |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | scope toggle visible/default agent | AV-001 | E2E | Planned |
| AC-002 | R-002 | agent memory flow unchanged | AV-002 | E2E | Planned |
| AC-003 | R-003,R-005 | team/member selection + contextual header | AV-003 | E2E | Planned |
| AC-004 | R-004,R-007 | team member memory payload loads | AV-004 | API | Planned |
| AC-005 | R-006 | scope switch clears incompatible selection | AV-005 | E2E | Planned |
| AC-006 | R-006 | scoped error behavior with stale-guard | AV-006 | E2E | Planned |
| AC-007 | R-008 | existing agent memory APIs unchanged | AV-007 | API | Planned |
| AC-008 | NFR-004 | automated coverage added | AV-008 | API | Planned |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001,C-002,C-003 | Add/Modify | T-001,T-002,T-003,T-004 | No | backend unit/API tests |
| C-004,C-005,C-006,C-008 | Add/Modify | T-005,T-006 | No | frontend store tests |
| C-009,C-010,C-011 | Modify | T-007,T-008 | No | frontend component/page tests |
| C-012 | Add/Modify | T-004,T-008 | No | full targeted suites |

## Step-By-Step Plan

1. Implement backend team-memory index service and GraphQL index/view extensions.
2. Add/extend backend tests for new team-memory service/types and legacy query safety.
3. Add frontend team-memory query module/types and new team index/view stores.
4. Add shared scope state and wire Memory page to scope-aware fetch.
5. Update Memory index and inspector components for dual-scope rendering and contextual header.
6. Update/add frontend tests (stores/components/page).
7. Run targeted backend/frontend test commands and resolve failures.
8. Proceed to Stage 7 API/E2E scenario execution and gate logging.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `team-memory-index-service.ts` | returns paged team/member index with file-presence flags | service tests pass | N/A | async list/sort/filter |
| `memory-index.ts` | exposes `listTeamRunMemorySnapshots` | type tests pass | API scenario pass | additive query only |
| `memory-view.ts` | exposes `getTeamMemberRunMemoryView` | type tests pass | API scenario pass | additive query only |
| `teamMemoryIndexStore.ts` | fetch/search/pagination/expand works | store tests pass | N/A | request-id stale guard |
| `teamMemoryViewStore.ts` | selection + view fetch + raw trace toggle works | store tests pass | N/A | scope-safe errors |
| `MemoryIndexPanel.vue` | toggles scope and renders team/member list | component tests pass | E2E scenario pass | keep agent mode behavior |
| `MemoryInspector.vue` | scope-aware header/data source | component tests pass | E2E scenario pass | tabs unchanged |
| `pages/memory.vue` | default scope fetch + wiring works | page test pass | E2E scenario pass | no regression |

## Test Strategy

- Unit tests:
  - backend: team-memory index service + graphql type assignments.
  - frontend: team memory stores.
- Integration tests:
  - frontend component/page tests for scope switching and selection behavior.
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `8`
  - critical flows: team index listing, member memory view retrieval, scope-switch stale guard, agent query regression.

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | R-001 | UC-001 | E2E | toggle visible and default agent scope |
| AV-002 | Requirement | AC-002 | R-002 | UC-001 | E2E | agent run memory tabs still load |
| AV-003 | Requirement | AC-003 | R-003,R-005 | UC-002,UC-003 | E2E | team/member selection updates inspector context |
| AV-004 | Requirement | AC-004 | R-004,R-007 | UC-003 | API | team member memory query returns expected payload |
| AV-005 | Requirement | AC-005 | R-006 | UC-004 | E2E | scope switch clears incompatible selection |
| AV-006 | Requirement | AC-006 | R-006 | UC-004,UC-005 | E2E | scoped error + stale guard behavior |
| AV-007 | Requirement | AC-007 | R-008 | UC-005 | API | legacy agent memory queries still pass |
| AV-008 | Requirement | AC-008 | NFR-004 | UC-001..UC-005 | API | automated test suites include new coverage |
