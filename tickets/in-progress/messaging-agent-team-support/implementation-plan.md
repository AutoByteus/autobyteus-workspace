# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The change spans web messaging setup UX, external-channel GraphQL setup contracts, binding persistence, runtime lazy-start orchestration, and verification/tests.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review -> implementation plan -> implementation progress tracking -> API/E2E testing -> code review gate -> docs sync -> final handoff

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/messaging-agent-team-support/workflow-state.md`
- Investigation notes: `tickets/in-progress/messaging-agent-team-support/investigation-notes.md`
- Requirements: `tickets/in-progress/messaging-agent-team-support/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/messaging-agent-team-support/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/messaging-agent-team-support/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes:
  - Stage 5 review gate is `Go Confirmed` for design `v5`.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready`: `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

## Solution Sketch

- Use Cases In Scope: `UC-001` through `UC-008`
- Requirement Coverage Guarantee: `Yes`
- Design-Risk Use Cases: `None`
- Target Architecture Shape:
  - External-channel setup GraphQL exposes team-definition options and a definition-bound team-binding contract.
  - Binding persistence stores `teamDefinitionId`, `teamLaunchPreset`, and cached `teamRunId`.
  - Reusable `TeamRunLaunchService` handles team lazy-create from definition + preset.
  - `ChannelBindingRuntimeLauncher` resolves or starts both agent and team runs.
  - Web setup uses target-type-specific subforms and validates team launch preset readiness.
  - Persisted history loading becomes read-only and no longer performs active-run recovery.
  - A dedicated frontend active-runtime sync path queries backend active agents and teams, then owns liveness reconciliation and websocket subscription reconciliation.
- New Layers/Modules/Boundary Interfaces To Introduce:
  - `ChannelBindingTeamDefinitionOptionsService`
  - `TeamRunLaunchService`
  - `ActiveRuntimeSyncStore`
- API/Behavior Delta:
  - replace `externalChannelTeamTargetOptions` with `externalChannelTeamDefinitionOptions`
  - replace `targetTeamRunId` setup input with `targetTeamDefinitionId`
  - add `teamLaunchPreset`
  - runtime caches `teamRunId` internally after first launch
  - TEAM cached-run reuse now mirrors AGENT semantics: reuse only when the binding's cached run is active
  - websocket reconnect attempts continue across repeated failed reconnect closes during backend restart
  - left-tree selection of an already subscribed live team context changes focus only and does not reopen persisted history
  - history polling no longer reconnects active runs or teams
  - backend `agentRuns` and `agentTeamRuns` become the explicit live-runtime source for frontend active-state management
- Key Assumptions:
  - a shared/global team launch preset is sufficient for this round
  - coordinator/entry-node-only reply behavior remains unchanged
- Known Risks:
  - nested team definitions require recursive leaf-agent expansion
  - Prisma schema/codegen regeneration may be needed for new binding fields

## Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | None | Go Confirmed | 2 |
| 3 | Fail | Yes | Yes | Yes | Requirement Gap | `2 -> 3 -> 4 -> 5` | No-Go | 0 |
| 4 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 5 | Pass | No | No | Yes | N/A | None | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `5`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Bottom-up: implement reusable launch and persistence primitives before dependents.
- Test-driven: add unit and integration coverage alongside implementation.
- Mandatory modernization rule: remove the branch-local run-bound TEAM setup path instead of keeping both setup contracts.
- Mandatory decoupling rule: external-channel runtime must not depend on GraphQL mutation services.
- Mandatory module/file placement rule: keep setup-facing contracts under `external-channel`; keep reusable team launch logic under team execution services.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `src/external-channel/domain/models.ts`, `src/external-channel/providers/*`, `prisma/schema.prisma` | N/A | binding model and storage contract first |
| 2 | `src/external-channel/services/channel-binding-team-definition-options-service.ts` | team definition service | setup query and validation basis |
| 3 | `src/agent-team-execution/services/team-run-launch-service.ts` | team definition/runtime/history services | reusable lazy-create foundation |
| 4 | `src/api/graphql/services/team-run-mutation-service.ts` | team run launch service | remove duplication before runtime reuse |
| 5 | `src/external-channel/runtime/channel-binding-runtime-launcher.ts` | binding contract + team launch service | team lazy-start path |
| 6 | `src/external-channel/runtime/default-channel-runtime-facade.ts` | runtime launcher + continuation service | ingress dispatch path |
| 7 | `src/api/graphql/types/external-channel-setup/*` | binding contract + definition options service | setup API contract |
| 8 | `autobyteus-web/types/messaging.ts`, GraphQL docs, setup store/composables/component | GraphQL contract | UI integration |
| 9 | `autobyteus-web/stores/messagingVerificationStore.ts`, docs, generated outputs, tests | updated binding model | verification and sync |

## Module/File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Team definition options policy | N/A | `autobyteus-server-ts/src/external-channel/services/channel-binding-team-definition-options-service.ts` | Server setup/service | Keep | unit tests + GraphQL e2e |
| Team launch orchestration | embedded in `team-run-mutation-service.ts` | `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts` | Server team execution/runtime | Split | unit tests + runtime/API coverage |
| Team dispatch lazy-start | `src/external-channel/runtime/channel-binding-runtime-launcher.ts` | same | Server external ingress runtime | Keep | runtime launcher tests |
| Messaging setup state | existing messaging setup store/component files | same | Web settings UX | Keep | store/component tests |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-003 | `Target State`, `Change Inventory` | UC-001, UC-002 | T-001, T-004, T-006 | Unit/Integration | AV-001 |
| R-002 | AC-003, AC-004, AC-006 | `Target State`, `Error Handling And Edge Cases` | UC-004, UC-005 | T-002, T-003, T-005 | Unit/Integration | AV-001, AV-002 |
| R-003 | AC-004 | `Summary`, `Target State` | UC-004, UC-005 | T-005 | Unit/Integration | AV-002 |
| R-004 | AC-003 | `Architecture Direction Decision` | UC-002 | T-004, T-006 | Unit/Integration | AV-001 |
| R-005 | AC-003, AC-004 | `Data Models`, `Error Handling And Edge Cases` | UC-002, UC-005 | T-001, T-002, T-006 | Unit/Integration | AV-001, AV-002 |
| R-006 | AC-004, AC-005, AC-006 | `Target State`, `Error Handling And Edge Cases` | UC-004, UC-005, UC-006 | T-001, T-003, T-005 | Unit/Integration | AV-002 |
| R-007 | AC-004, AC-007, AC-008 | `Summary`, `Target State` | UC-003, UC-004, UC-005 | T-005, T-006 | Unit/Integration | AV-002, AV-003 |
| R-008 | AC-009 | `Target State` | UC-007 | T-008 | Unit | AV-003 |
| R-009 | AC-010 | `Target State` | UC-008 | T-009 | Web unit/integration | AV-004 |

## Acceptance Criteria To Stage 7 Mapping

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Setup exposes AGENT and TEAM targets | AV-001, AV-003 | API/E2E | Planned |
| AC-002 | R-001 | AGENT binding behavior remains valid | AV-001 | API | Planned |
| AC-003 | R-004 | TEAM binding saves with `targetTeamDefinitionId` and `teamLaunchPreset` | AV-001 | API | Planned |
| AC-004 | R-002 | TEAM dispatch lazy-creates or reuses a run and remains single-stream | AV-002 | API | Planned |
| AC-005 | R-006 | TEAM binding reuses cached `teamRunId` only when that cached run is active; inactive cached runs are replaced on inbound dispatch | AV-002 | API | Planned |
| AC-006 | R-006 | TEAM binding reset semantics clear incompatible cached `teamRunId` | AV-002 | API | Planned |
| AC-007 | R-007 | TEAM dispatch stays single-stream and works across runtimes | AV-002 | API | Planned |
| AC-008 | R-007 | Verification and binding UI show correct team readiness and reply semantics | AV-003 | E2E | Planned |
| AC-009 | R-008 | Shared websocket reconnect continues across repeated failed reconnect closes during backend restart | AV-003 | E2E/Integration | Planned |
| AC-010 | R-009 | Left-tree member selection preserves subscribed live team contexts and only changes focus | AV-004 | Web Integration | Planned |

## Design Delta Traceability

| Change ID | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-004 | No | Unit + AV-001 |
| C-002 | Add | T-002 | Yes | Unit + AV-002 |
| C-003 | Modify | T-001 | No | Unit |
| C-004 | Modify | T-001 | No | Provider tests + AV-001 |
| C-005 | Modify | T-004 | Yes | AV-001 |
| C-006 | Modify | T-004 | No | AV-001 |
| C-007 | Modify | T-004, T-006 | No | AV-001 + AV-003 |
| C-008 | Modify | T-003 | No | Unit + AV-002 |
| C-009 | Modify | T-005 | No | Unit + AV-002 |
| C-010 | Modify | T-002 | Yes | Unit |
| C-011 | Modify | T-006 | Yes | Web unit + AV-003 |
| C-012 | Modify | T-007 | No | Web unit + AV-003 |
| C-013 | Modify | T-008 | No | Web unit |
| C-014 | Modify | T-009 | No | Web unit/integration |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | TEAM run selector and `targetTeamRunId` setup contract | Remove | delete TEAM run query/store state/validation/UI copy and replace with team-definition setup flow | Medium |
| T-DEL-002 | GraphQL-owned team lazy-create orchestration | Split | extract reusable launch service and remove duplicated launch code from mutation service | Medium |

## Step-By-Step Plan

1. Extend binding domain and persistence to store `teamDefinitionId`, `teamLaunchPreset`, and cached `teamRunId` reset semantics.
2. Extract reusable `TeamRunLaunchService` from existing team-run mutation logic and cover it with unit tests.
3. Extend external runtime launcher and facade to resolve or start team runs definition-first, then continue the inbound message.
4. Replace setup GraphQL TEAM run options with TEAM definition options and update binding mapper/resolver contracts.
5. Update server tests for binding setup, lazy-create/reuse behavior, and runtime dispatch semantics.
6. Replace web TEAM run selector flow with TEAM definition selector plus launch preset fields and update verification logic.
7. Align TEAM cached-run reuse semantics with AGENT semantics so inactive cached runs after restart create a fresh team run for inbound messaging.
8. Fix shared websocket reconnect scheduling so restart-time failed reconnect closes continue retrying until the configured budget is exhausted.
9. Regenerate GraphQL types, run targeted test suites, and sync docs.
10. Make the backend active-runtime snapshot runtime-aware by filtering team-member runs out of the standalone active-agent query and by including member-runtime teams in the active-team query before the frontend sync loop consumes that snapshot.
10. Restore live-team left-tree selection parity so subscribed team contexts are focused in place while non-live team contexts still reopen from persisted projection.
11. Restore distinct reasoning-burst segment identity within one turn so post-tool thinking is rendered as a new think segment instead of being appended into the first burst.
12. Formalize frontend streaming segment identity into a typed helper so composite segment matching does not rely on duplicated hidden-field writes across handlers.
13. Propagate TEAM external callback context selectively across `send_message_to` hops by carrying sender turn identity through the inter-agent relay, preserving recipient turn ids from runtime injection, and rebinding only those recipient turns whose sender turn is already externally bound.
14. Remove history-driven recovery from `runHistoryLoadActions.ts` and introduce a dedicated active-runtime sync loop that separately queries active agents/teams, reconciles persisted liveness, and connects/disconnects streams.

## Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `src/external-channel/domain/models.ts` | TEAM binding carries definition + launch preset + cached run id | provider/service tests | covered indirectly by API e2e | contract root |
| `src/agent-team-execution/services/team-run-launch-service.ts` | definition + preset expand into launched native/member-runtime team run | dedicated unit tests | covered indirectly by API/runtime tests | new reusable service |
| `src/external-channel/runtime/channel-binding-runtime-launcher.ts` | resolves or starts team run and persists cached `teamRunId` | unit tests | covered by runtime/API tests | no GraphQL dependency |
| `src/api/graphql/types/external-channel-setup/resolver.ts` | accepts AGENT and definition-bound TEAM bindings correctly | resolver e2e | GraphQL e2e | AGENT path unchanged |
| `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue` | renders target selector plus team definition/preset subform | component tests | N/A | reply hint retained |
| `autobyteus-web/stores/messagingVerificationStore.ts` | validates binding readiness by target type | store tests | N/A | team preset aware |
| `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts` | restart-time reconnect scheduling keeps retrying across repeated failed reconnect closes | transport unit tests | covered indirectly by live/manual restart smoke | shared by agent and team |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/messaging-agent-team-support/code-review.md`
- Scope (source + tests):
  - server binding model/providers/setup/runtime/team launch service
  - web messaging setup files
  - targeted tests
- `>500` effective-line hard-limit policy:
  - if any changed source file exceeds `500`, classify as `Design Impact` and re-enter
- `>220` changed-line delta gate focus:
  - `messagingChannelBindingSetupStore.ts`
  - `ChannelBindingSetupCard.vue`
  - `external-channel-setup/resolver.ts`
  - `team-run-mutation-service.ts`
- Placement review focus:
  - confirm team launch logic was actually extracted out of GraphQL service
  - confirm setup-only mapping stays under `external-channel`

## Test Strategy

- Unit tests:
  - team-definition options service
  - team run launch service
  - runtime launcher TEAM lazy-start
  - runtime facade TEAM dispatch
  - websocket reconnect transport retry behavior
  - web setup store and verification logic
- Integration tests:
  - GraphQL setup e2e for AGENT and definition-bound TEAM bindings
  - runtime/API tests for lazy-create/reuse behavior
- Stage 7 critical flows:
  - save/list/delete definition-bound TEAM binding
  - first inbound message creates team run from definition + preset
  - subsequent inbound message reuses cached team run only when it is still active
  - inbound message after restart creates a fresh team run when cached run is inactive
  - single visible responder behavior remains intact
  - verification UI renders correct TEAM readiness
  - subscribed live team member selection does not regress the team into a projection-reopened historical view
  - student-to-coordinator replies inside a bot-origin TEAM conversation still publish the later coordinator response back to Telegram without echoing unrelated UI-only turns

## API/E2E Testing Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-002, AC-003 | R-001, R-004, R-005 | UC-001, UC-002 | API | GraphQL saves/lists/deletes AGENT and definition-bound TEAM bindings correctly |
| AV-002 | Requirement | AC-004, AC-005, AC-006, AC-007 | R-002, R-003, R-006, R-007 | UC-004, UC-005, UC-006 | API | TEAM dispatch creates/reuses runs correctly, replaces inactive cached runs, and remains single-stream |
| AV-004 | Requirement | AC-010 | R-009 | UC-008 | Web Integration | Selecting a member row for an already subscribed live team changes focus without reopening the team from persisted projection; non-live contexts still reopen |
| AV-003 | Requirement | AC-001, AC-008, AC-009 | R-000, R-001, R-007, R-008 | UC-003, UC-007 | E2E | Settings UI and verification render definition-bound TEAM binding readiness correctly, and streaming reconnect does not stop after the first failed restart-time retry |
