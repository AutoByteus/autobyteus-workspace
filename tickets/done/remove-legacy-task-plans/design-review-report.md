# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans/tickets/done/remove-legacy-task-plans/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans/tickets/done/remove-legacy-task-plans/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans/tickets/done/remove-legacy-task-plans/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review of the clean-cut legacy task-plan removal design.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements/investigation/design artifacts plus spot-checks of `autobyteus-ts` bootstrap/config/runtime state/streaming/task-management/CLI paths, `autobyteus-server-ts` team-run event and WebSocket mapper paths, and `autobyteus-web` protocol/stream handler/context/desktop/mobile UI paths.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design package from `solution_designer` | N/A | None | Pass | Yes | Design is deletion-heavy but spine-led, owner-led, and explicit about the breaking protocol rename. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans/tickets/done/remove-legacy-task-plans/design-spec.md` against the shared design principles, especially data-flow spine sufficiency, authoritative boundary encapsulation, clean-cut legacy removal, interface-boundary clarity, and removal/decommission completeness.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the change as Cleanup / Refactor / Behavior Change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design names Legacy Or Compatibility Pressure, Boundary Or Ownership Issue, and Shared Structure Looseness, backed by active native `TaskPlan`, server `TASK_PLAN_EVENT`, and frontend task-plan UI/state evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor is needed now and rejects local UI hiding or compatibility aliasing. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal/decommission plan, dependency rules, file mappings, and migration sequence all reflect the clean-cut refactor. Future dedicated-task ledger UI is explicitly deferred with residual-risk framing. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Native AutoByteus team startup and stream after removal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Server-owned dedicated task delegation end-to-end | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Dedicated task domain event to WebSocket transport return path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Frontend stream dispatch to desktop/mobile surfaces | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Personal ToDo preservation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` native agent-team runtime | Pass | Pass | Pass | Pass | Correctly simplified to lifecycle/routing/native event aggregation only. |
| `autobyteus-ts` personal ToDo/task-management subset | Pass | Pass | Pass | Pass | Keeping ToDo in place avoids over-deleting a separate active feature. |
| Server task delegation | Pass | Pass | Pass | Pass | Existing `TaskDelegationService` remains the authoritative task owner. |
| Server agent streaming/WebSocket mapper | Pass | Pass | Pass | Pass | Transport rename is assigned to the mapper/protocol owner. |
| Frontend team streaming/projection | Pass | Pass | Pass | Pass | Dispatch/project task-agent identity only; no frontend task ledger. |
| Frontend team/mobile UI | Pass | Pass | Pass | Pass | Task-plan panels/cards removed; existing messages/activity surfaces remain. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Dedicated task-agent stream identity | Pass | Pass | Pass | Pass | Reuse of existing frontend projection helpers is appropriate. |
| Server task-delegation event payloads | Pass | Pass | Pass | Pass | Domain payloads stay server-owned and are only serialized by transport mapper. |
| Personal ToDo schemas/tools | Pass | Pass | Pass | Pass | Preserved as distinct local-agent ToDo structures. |
| Legacy task-plan DTO/report/event shapes | Pass | N/A | N/A | Pass | Correct decision is removal, not extraction or re-sharing. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskDelegationRecord` / event payloads | Pass | Pass | Pass | Pass | Remains a dedicated-task structure, not a generic task plan. |
| Frontend `TaskDelegationEventPayload` | Pass | Pass | Pass | Pass | Design constrains it to dedicated event fields and task-agent identity. |
| `AgentTeamContext` after removal | Pass | Pass | Pass | N/A | Removing `taskPlan`/`taskStatuses` tightens the context. |
| `autobyteus-ts/src/task-management` public surface | Pass | Pass | Pass | Pass | Folder name remains imperfect but exports narrow to ToDo-only within stated scope. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` native task-plan model/schemas/events/converters/deliverables | Pass | Pass | Pass | Pass | Explicitly removed; server `TaskDelegationService` is the team-task owner. |
| `autobyteus-ts` task-plan bootstrap/notifier/config/runtime state | Pass | Pass | Pass | Pass | Removes hidden task-plan lifecycle. |
| `autobyteus-ts` native team-stream `TASK_PLAN` source and notifier API | Pass | N/A | Pass | Pass | Cleanly removes native task-plan streaming. |
| `autobyteus-ts` CLI task-plan store/UI | Pass | Pass | Pass | Pass | Existing team/history surfaces remain; task-plan panel is deleted. |
| Server native `TASK_PLAN` domain source/bridge | Pass | Pass | Pass | Pass | Dedicated `TASK_DELEGATION` source remains. |
| Server/frontend `TASK_PLAN_EVENT` transport name | Pass | Pass | Pass | Pass | Replaced by `TASK_DELEGATION_EVENT`; no dual emission. |
| Frontend task-plan protocol/state/handler/desktop/mobile UI/localization | Pass | Pass | Pass | Pass | Desktop screenshot and mobile equivalent are both covered. |
| Personal ToDo | Pass | Pass | Pass | Pass | Explicitly preserved, not decommissioned. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/bootstrap-steps/agent-team-bootstrapper.ts` | Pass | Pass | N/A | Pass | Default startup ordering without task-plan steps. |
| `autobyteus-ts/src/agent-team/context/agent-team-config.ts` | Pass | Pass | N/A | Pass | Remove task-notification mode/env handling. |
| `autobyteus-ts/src/agent-team/context/agent-team-runtime-state.ts` | Pass | Pass | N/A | Pass | Remove task-plan/task-notifier fields. |
| `autobyteus-ts/src/agent-team/streaming/*` | Pass | Pass | Pass | Pass | Team/agent/sub-team stream only. |
| `autobyteus-ts/src/task-management/index.ts` and child barrels | Pass | Pass | Pass | Pass | Narrow to ToDo-only exports. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | Pass | Pass | Pass | Pass | Dedicated event union remains; native task plan removed. |
| `autobyteus-server-ts/src/services/agent-streaming/models.ts` | Pass | Pass | N/A | Pass | Message enum owns transport names. |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Pass | Pass | Pass | Pass | Mapper owns dedicated event serialization and identity flattening. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Pass | Pass | Pass | Pass | Context no longer stores task-plan data. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Pass | Pass | Pass | Pass | Protocol has `TASK_DELEGATION_EVENT`, no task-plan payload. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Pass | Pass | Pass | Pass | Dispatch/projection only; no task-plan handler. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Pass | Pass | N/A | Pass | Team tab composition without task-plan section. |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Pass | Pass | N/A | Pass | Mobile digest without tasks/task-plan filter. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskDelegationService` | Pass | Pass | Pass | Pass | Must not depend on native `TaskPlan`; correct. |
| Server WebSocket mapper | Pass | Pass | Pass | Pass | Maps domain events to transport; no legacy alias. |
| Frontend `TeamStreamingService` | Pass | Pass | Pass | Pass | May project task-agent identity; must not call `handleTaskPlanEvent`. |
| `autobyteus-ts` native runtime | Pass | Pass | Pass | Pass | No dependency on removed task-management task-plan files. |
| Personal ToDo | Pass | Pass | Pass | Pass | Remains local/personal and separate from team delegation. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskDelegationService` | Pass | Pass | Pass | Pass | Dedicated ledger/lifecycle/settlement stay behind server service/tool boundaries. |
| `team-run-event-websocket-message-mapper` | Pass | Pass | Pass | Pass | Owns transport rename and payload shape. |
| `TeamStreamingService` | Pass | Pass | Pass | Pass | No task ledger reconstruction. |
| `AgentTeamRuntime` / `AgentTeamBootstrapper` | Pass | Pass | Pass | Pass | Native runtime stops owning team-task state. |
| `ToDoList` / ToDo tools | Pass | Pass | Pass | Pass | Personal ToDo remains encapsulated and separate. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `delegate_tasks` | Pass | Pass | Pass | Low | Pass |
| `mark_task_completed` / `mark_task_failed` | Pass | Pass | Pass | Low | Pass |
| `accept_task` | Pass | Pass | Pass | Low | Pass |
| `TeamRunEventSourceType.TASK_DELEGATION` | Pass | Pass | Pass | Low | Pass |
| `ServerMessageType.TASK_DELEGATION_EVENT` | Pass | Pass | Pass | Low | Pass |
| `AgentTeamStreamEventSourceType` after removal | Pass | Pass | Pass | Low | Pass |
| `TODO_LIST_UPDATE` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/task-management/` | Pass | Pass | Medium | Pass | ToDo-only retention is acceptable; folder rename deferred and explicitly noted. |
| `autobyteus-ts/src/agent-team/task-notification/` | Pass | Pass | Low | Pass | Folder is removed, not repurposed. |
| `autobyteus-ts/src/agent-team/streaming/` | Pass | Pass | Low | Pass | Task-plan stream concern removed. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Pass | Pass | Low | Pass | Existing domain owner retained. |
| `autobyteus-server-ts/src/services/agent-streaming/` | Pass | Pass | Low | Pass | Transport owner for renamed message. |
| `autobyteus-web/services/agentStreaming/` | Pass | Pass | Low | Pass | Dispatch/projection without task-plan store. |
| `autobyteus-web/components/workspace/team/` | Pass | Pass | Low | Pass | UI simplification matches component owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Authoritative team task workflow | Pass | Pass | N/A | Pass | Reuse server task delegation. |
| Dedicated task tool manifests | Pass | Pass | N/A | Pass | Existing first-party task-delegation tools remain. |
| Task-agent frontend projection | Pass | Pass | N/A | Pass | Reuse/extend existing projection helpers. |
| Team messages UI | Pass | Pass | N/A | Pass | Existing Team tab content remains. |
| Personal ToDo | Pass | Pass | N/A | Pass | Preserved under existing area. |
| New task-plan replacement UI | Pass | Pass | N/A | Pass | Do not create in this change; future UI would need separate server-led design. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts` task-plan exports/source | No | Pass | Pass | Delete, do not alias. |
| Server native `TASK_PLAN` bridge | No | Pass | Pass | Remove import/branch. |
| WebSocket `TASK_PLAN_EVENT` | No | Pass | Pass | Replace with `TASK_DELEGATION_EVENT`; no dual emission. |
| Frontend task-plan handler/state/UI | No | Pass | Pass | Delete rather than hide. |
| Legacy model-facing task tool names | No | Pass | Pass | Negative guidance may remain where it prevents reintroduction; no compatibility tools. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| `autobyteus-ts` model/runtime removal | Pass | Pass | Pass | Pass |
| Server bridge/protocol cleanup | Pass | Pass | Pass | Pass |
| Frontend protocol/state/UI cleanup | Pass | Pass | Pass | Pass |
| Docs and validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Dedicated task event mapping | Yes | Pass | Pass | Pass | Good and bad mapping examples clarify the protocol rename. |
| Frontend dedicated task handling | Yes | Pass | Pass | Pass | Explicitly rejects routing through `handleTaskPlanEvent`. |
| Desktop Team tab | Yes | Pass | Pass | Pass | Resolves screenshot-visible stale panel. |
| Native team startup | Yes | Pass | Pass | Pass | Makes deletion from bootstrap sequence concrete. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| External consumers of removed APIs / `TASK_PLAN_EVENT` | This is an intentional breaking change under the no-compatibility policy. | Delivery should decide release-note/public-doc treatment after implementation. | Residual risk, not design blocker. |
| Dedicated worktree lacks installed dependencies | Validation commands will fail until dependencies are installed or workspace setup is completed. | Implementation/API-E2E should install/setup dependencies before executable validation. | Residual setup note, not design blocker. |
| Future dedicated-task ledger UI | Users may eventually want a ledger-style replacement for the removed table. | Out of scope; design future UI from server `TaskDelegationService`, not native task-plan state. | Explicitly deferred. |
| Active docs not named one-by-one | Some active docs may contain only allowed negative guidance; others may need stale reference cleanup. | Treat design's documentation list as a minimum and use repo-wide active-doc searches during implementation/delivery. | Residual implementation/delivery attention item. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A. No blocking design-review findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The `TASK_PLAN_EVENT` to `TASK_DELEGATION_EVENT` rename is intentionally breaking. No aliasing or dual emission should be added during implementation.
- Documentation cleanup should be search-driven, not limited only to the examples listed in the design spec; keep explicit negative guidance only where it prevents reintroducing legacy model-facing task tools.
- Preserve generic agent `SYSTEM_TASK_NOTIFICATION` handling where it is still used by dedicated task-delegation notifications; remove only the native task-plan notifier/config subsystem.
- Dependency installation/setup is required in the dedicated worktree before type/build/test validation.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Clean-cut removal and transport rename are architecturally sound and aligned with the no-backward-compatibility policy. Implementation may proceed from the reviewed design package.
