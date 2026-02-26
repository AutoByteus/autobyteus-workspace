# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Multiple frontend surfaces (`list`, `card`, `create/edit builder`, `detail`) plus backend team schema extension.
  - Includes Prisma migration and GraphQL contract updates for avatar persistence.
- Workflow Depth:
  - `Medium/Large` -> proposed design doc -> design-based runtime call stack -> runtime call stack review -> implementation plan -> progress tracking

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes: Runtime call stack gate passed; implementation can start.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| UC-1..UC-4 | `tickets/agent-teams-ui-redesign-implementation/design-based-runtime-call-stack.md` | `tickets/agent-teams-ui-redesign-implementation/runtime-call-stack-review.md` | Pass | Pass | F-001 tracked | Pass |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - N/A

## Principles

- Extend GraphQL/team definition contracts minimally (`avatarUrl` only).
- Keep run-team behavior and navigation contracts unchanged.
- Remove temporary local-only avatar persistence.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-server-ts/prisma/schema.prisma` + migration | none | backend persistence foundation |
| 2 | `autobyteus-server-ts/src/agent-team-definition/*` | prisma schema | domain + conversion path |
| 3 | `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | domain layer | API contract exposure |
| 4 | `autobyteus-web/stores/agentTeamDefinitionStore.ts` + query docs | backend GraphQL contract | frontend data model sync |
| 5 | `components/agentTeams/AgentTeamCard.vue` | store/query avatar field | card UI avatar render |
| 6 | `components/agentTeams/AgentTeamCreate.vue` / `AgentTeamEdit.vue` | form + store model | persist avatar through mutations |
| 7 | `components/agentTeams/AgentTeamDetail.vue` | store/query avatar field | detail avatar render |
| 8 | tests | all above | regression confidence |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001..C-012 | Modify/Add/Remove | T1..T10 | Yes (`agentTeamAvatarStore` removal) | unit/e2e/manual |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | legacy row-based member builder markup | Remove | replace with drag/drop canvas and inline member detail panel | medium UX regression risk, mitigate with validation parity |
| T-DEL-002 | `stores/agentTeamAvatarStore.ts` | Remove | switch consumers to `teamDef.avatarUrl` from GraphQL | low regression risk |

## Step-By-Step Plan

1. Add backend team avatar persistence (Prisma schema + migration).
2. Extend backend domain/converter/service and GraphQL types for `avatarUrl`.
3. Update frontend team query/store model to include `avatarUrl`.
4. Keep redesigned list/create/edit/detail UI and route avatar through backend payloads.
5. Remove temporary local avatar store and references.
6. Update/repair list test suite and run targeted frontend tests.
7. Run targeted backend unit/e2e tests for avatar persistence flow.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | `avatarUrl` exposed on output and create/update inputs | covered via e2e GraphQL team test | N/A | |
| `autobyteus-server-ts/src/agent-team-definition/converters/prisma-converter.ts` | reads/writes `avatar_url` including clear-to-null behavior | covered by team e2e and service/tool tests | N/A | |
| `components/agentTeams/AgentTeamCard.vue` | renders avatar/actions/metadata per design | optional shallow check via list tests | N/A | |
| `components/agentTeams/AgentTeamList.vue` | search filters by name and run action unchanged | list spec passes | N/A | |
| `components/agentTeams/AgentTeamDefinitionForm.vue` | drag/drop add, unique naming, coordinator, validation, submit payload | manual test matrix | N/A | |
| `components/agentTeams/AgentTeamCreate.vue` | submits avatarUrl in create payload | manual | N/A | |
| `components/agentTeams/AgentTeamEdit.vue` | preloads avatar from team + submits in update payload | manual | N/A | |
| `components/agentTeams/AgentTeamDetail.vue` | simplified detail and avatar rendering | manual | N/A | |
| `components/agentTeams/__tests__/AgentTeamList.spec.ts` | reflects new list behavior | `Passed` | N/A | |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | None | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Team avatar initially implemented UI-only | user feedback + backend review | proposed-design.md -> data model section | moved to backend-persisted `avatarUrl` field | Updated |

## Test Strategy

- Frontend unit tests: `components/agentTeams/__tests__/AgentTeamList.spec.ts`.
- Backend tests: targeted unit + e2e team definition tests including avatar assertions.
- Manual verification: list search/run, create drag-drop/coordinator/avatar, edit save, detail render.
