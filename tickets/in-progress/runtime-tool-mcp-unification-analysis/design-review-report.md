# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/design-spec.md`
- Current Review Round: 10
- Trigger: Fresh full re-review after Round 14 worker-row semantics clarification: task-delegation-only logical assignees such as `worker` must not remain visible as `worker • Offline` or equivalent active execution rows/cards/headers after the final concrete task-agent instance settles. Logical member/template identity remains valid for team definition, future delegation, roster/config, and separate direct-message conversations.
- Prior Review Round Reviewed: Round 9 plus the updated requirements/design/supplemental package, API/E2E Round 14 worker-row semantics reroute, prior frontend task-agent UX reroute, Round 12 frontend failure artifact, latest API/E2E validation report, and referenced screenshots/source files.
- Latest Authoritative Round: 10
- Current-State Evidence Basis: Fresh reload of the architecture-reviewer workflow, canonical design principles, review template, current requirements, investigation notes, design spec, supplemental migration analysis, prior design-review report, implementation/code-review/API-E2E artifacts, API/E2E Round 14 worker-row semantics reroute, screenshots `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_2898ee285924__image.png`, `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_22a2dda5b43a__image.png`, `/Users/normy/.autobyteus/browser-artifacts/9f245f-1780143902937.png`, `/Users/normy/.autobyteus/browser-artifacts/9f245f-1780143952825.png`, and source spot-checks of `TeamWorkspaceView.vue`, `TeamTaskAgentActivityBar.vue`, `teamTaskAgentContextProjection.ts`, `teamStreamIdentityTypes.ts`, `TeamMemberMonitorTile.vue`, plus grid/spotlight/member-focus code paths that render `memberTree`. This is a fresh review, not a delta-only pass. Source spot-check is architecture-actionability evidence only; full implementation correctness remains owned by implementation/code/API-E2E review.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of user-approved delegation design package | N/A | None | Pass | No | Design was ready with residual risks around identity, safe delayed settlement, and direct boundary bypasses. |
| 2 | Mandatory final-worker settlement clarification after API/E2E requirement-gap discovery | No unresolved architecture findings from Round 1 | None | Pass | No | Design made settlement mandatory for supported delegation paths and required native pure-team gate-or-implement. |
| 3 | Task-agent instance model refinement for parallel same-logical-member delegated work | No unresolved architecture findings from Round 2 | None | Pass | No | Design split logical member identity from concrete task-agent instance identity and introduced task-agent lifecycle APIs. |
| 4 | Rich `delegate_tasks` schema/work-packet clarification | No unresolved architecture findings from Round 3 | None | Pass | No | Design rejected name-only task records and treated `delegate_tasks` input as the work-packet source. |
| 5 | Simplified minimal `delegate_tasks` model-facing schema after user feedback | No unresolved architecture findings from Round 4 | 3 | Fail | No | The minimal schema direction was sound, but the package still contained dependency/name-update/stale-field contradictions. |
| 6 | Re-review after Round 5 blocker cleanup | AR-R5-REQ-001, AR-R5-REQ-002, AR-R5-DES-001 | None | Pass | No | Blockers were resolved for the then-current `assignee_name`/exact-task-id schema. |
| 7 | Final schema naming and selector simplification: `member_name`, no `task_name`, selector-free status update | No unresolved architecture findings from Round 6 | None | Pass | No | Design made `member_name` the model-facing target field and kept status updates selector-free. |
| 8 | Ready-to-run dependency clarification and fresh full package review | No unresolved architecture findings from Round 7 | None | Pass | No | Design made no-dependency, ready-to-run sequencing explicit. |
| 9 | Frontend task-agent lifecycle UX clarification | No unresolved architecture findings from Round 8 | None | Pass | No | Frontend active task-agent projection was the correct boundary for making task agents appear/disappear. |
| 10 | Round 14 worker-row semantics clarification | No unresolved architecture findings from Round 9 | None | Pass | Yes | Latest package correctly forbids task-delegation-only logical worker rows such as `worker • Offline` in active execution UI after final settlement while preserving separate roster/template and direct-message semantics. |

## Reviewed Design Spec

The latest design package is internally coherent and follows the shared design principles. The core task-delegation surface remains intentionally minimal and unchanged by the Round 14 frontend clarification:

- `delegate_tasks.tasks[]` exposes only `member_name`, required rich `description`, and optional `reference_files`.
- `member_name` names an exact logical team member/template from the current team roster; the server resolves it to internal logical-member identity and rejects missing or ambiguous names.
- Each `delegate_tasks` item is ready-to-run work. The model-facing schema does not accept `dependencies`, and dependent follow-up work is intentionally sequenced by the coordinator: delegate task A, wait for framework terminal notification, then call `delegate_tasks` again for task B.
- `update_task_status` exposes only `status`, optional `message`, and optional `reference_files`; it has no task selector and resolves the bound task from caller task-agent instance/run context.

The Round 14 worker-row semantics refinement is architecturally sound:

- It preserves the internal domain truth: a logical member/template remains valid for team definition, future delegation, configuration, and available-member surfaces.
- It tightens the frontend active execution projection: a task-delegation-only worker is not an active execution subject after its final concrete task-agent instance has reached terminal status and settlement/offline cleanup.
- It makes the visible-subject model explicit: active execution contains coordinator/root run, explicitly activated normal member conversations, and concrete task-agent entities; roster/topology contains logical member templates.
- It resolves the prior ambiguity in a user-aligned way: a lingering `worker • Offline` row/card/header in active execution looks like the sub-agent failed to exit, so it is now forbidden.
- It assigns ownership correctly to the frontend team-run projection boundary, not to `TaskDelegationService` or backend lifecycle managers. Backend/service boundaries continue to own delegation state and runtime settlement; frontend projection owns visual/session state, stream routing, focus behavior, and active row/card cleanup.
- It keeps completed work visible through task/activity/history/notification or a completed task-agent history entity, not by embedding the task-agent packet/tool/status stream into the logical member's normal conversation.
- It preserves separate normal-conversation semantics: if a logical member is activated via `send_message_to`/direct messaging, that member can appear as a normal conversation participant, but that is a distinct surface/history from task-agent execution.

The core architecture remains sound:

- `TaskDelegationService` is the authoritative business boundary for delegation creation, status mutation, validation, internal ledger correlation, event emission, completion notification, and settlement decisions.
- Runtime projections stay thin and delegate to `TaskDelegationToolService`/canonical parsers; they must not fork tool semantics.
- `TeamRun`/backend managers own concrete task-agent lifecycle through explicit task-agent start/settle APIs.
- Logical member identity and concrete task-agent instance identity remain separate subjects across backend, events/status, and frontend projection.
- One runnable task -> one task-agent instance remains the default activation unit, so selector-free status updates are valid as long as the invariant “one active delegated task per task-agent instance” is enforced.
- Terminal task-agent settlement remains mandatory for supported delegation paths and delayed until terminal status, tool result/event/notification delivery, idle, and no-bound-work gates pass.

Current-state evidence supports the revised design’s actionability. The implementation evidence shows task-agent contexts can be created/removed by concrete `taskAgentRunId`, but focus fallback and grid/spotlight rendering over full logical `memberTree` can still surface the logical `worker` as an offline active participant after task-agent cleanup. The design now names that exact route-key/topology fallback as the thing to fix through active-execution vs roster/topology projection separation.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design classify the work as feature + behavior change + refactor, with evidence from runtime-local task tools, missing task-agent lifecycle boundary, route-key identity collapse, stale task-plan polling pressure, and frontend active-execution/topology projection collapse. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Package identifies boundary/ownership issue, missing lifecycle invariant, duplicated projection risk, shared identity looseness, legacy polling pressure, and frontend route-key/memberTree projection collapse. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor is required now for service boundary, task-agent lifecycle, instance identity, minimal schema cleanup, legacy surface removal, frontend task-agent active entity projection, and active execution vs roster/topology separation. General MCP, persistence, dependency authoring, and future batching semantics remain deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Data-flow spines, ownership maps, interface mappings, removal plan, migration sequence, frontend good/bad examples, and validation strategy support the refactor posture. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | N/A | Round 1 had no architecture findings. | N/A |
| 2 | N/A | N/A | N/A | Round 2 had no architecture findings. | N/A |
| 3 | N/A | N/A | N/A | Round 3 had no architecture findings. | N/A |
| 4 | N/A | N/A | N/A | Round 4 had no architecture findings. | The richer schema proposal is superseded. |
| 5 | AR-R5-REQ-001 | High | Resolved | Requirements/design state dependency authoring/dependent activation is out of scope, `delegate_tasks` items are ready-to-run, and dependent follow-up work is delegated later after completion notification. | Still resolved. |
| 5 | AR-R5-REQ-002 | High | Superseded/resolved | Earlier exact-task-id update requirement is replaced by stricter selector-free update. The package requires task resolution from bound task-agent instance context and rejects selector fields. | No new gap. |
| 5 | AR-R5-DES-001 | High | Resolved and extended | Removal plan and validation strategy name stale `DelegateTasksInput.task_name`, `assignee_name`, dependency/criteria/deliverable fields, and update selector fields for rejection/removal. | Still resolved. |
| 6 | N/A | N/A | N/A | Round 6 had no architecture findings. | Latest schema supersedes that pass result. |
| 7 | N/A | N/A | N/A | Round 7 had no architecture findings. | Round 8 rechecked the no-dependency clarification. |
| 8 | N/A | N/A | N/A | Round 8 had no architecture findings. | Round 9 rechecked the frontend lifecycle clarification. |
| 9 | N/A | N/A | N/A | Round 9 had no architecture findings. | Round 10 tightens the active-execution worker-row semantics; no prior blocking finding existed. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Coordinator delegates minimal rich ready-to-run work packet to a logical member/template. | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Task-agent selector-free terminal status to coordinator/delegator notification. | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Multiple independent ready-to-run task records activate by concurrency policy. | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Terminal status + task-agent idle event to concrete instance settlement. | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Runtime bootstrap/projection for task-delegation protocol/tools. | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Multiple same-logical-member runnable tasks to multiple task-agent instances. | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Frontend projection from task-agent stream/status identity to transient active UI entity, active-execution cleanup, roster/topology separation, and completion history retention. | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/task-delegation` | Pass | Pass | Pass | Pass | Correct owner for minimal model-facing schema, strict parser, canonical manifest, and runtime-neutral result serialization. |
| `agent-team-execution/task-delegation` | Pass | Pass | Pass | Pass | Correct owner for ledger, service, activation, task-agent identity, notification, settlement, and concurrency policy. |
| `TaskDelegationWorkPacketRenderer` | Pass | Pass | Pass | Pass | Correct prompt-content owner; renders rich `description`, references, lifecycle instructions, and optional derived display label without exposing task selectors or dependency fields. |
| `TeamRun` / backend task-agent lifecycle | Pass | Pass | Pass | Pass | Correct lifecycle owner for starting and settling concrete task-agent instances; does not own frontend row semantics. |
| Runtime projections | Pass | Pass | Pass | Pass | Adapter-only; must expose the latest minimal schema exactly and reject stale fields. |
| Frontend team-run projection | Pass | Pass | Pass | Pass | Correct owner for transient task-agent UI entities, stream routing, status hydration, active-execution cleanup, focus fallback, and roster/topology separation. Components should consume this projection rather than infer from logical route keys/full `memberTree`. |
| Native AutoByteus pure-team exposure gate | Pass | Pass | Pass | Pass | Correct gate-or-implement boundary for unsupported settlement. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `DelegateTasksInput` minimal task envelope | Pass | Pass | Pass | Pass | Tool contract/parser owns user-facing schema; service/ledger owns normalized internal shape. |
| `UpdateTaskStatusInput` selector-free envelope | Pass | Pass | Pass | Pass | Tool contract/parser owns status/message/reference fields; service resolves task from caller context. |
| Rich task body/details | Pass | Pass | Pass | Pass | `description` is the single work-body field and carries any context, constraints, success conditions, and expected output guidance. |
| `reference_files` | Pass | Pass | Pass | Pass | Optional structured references are coherent for delegated work and status updates. |
| Task-agent identity structures | Pass | Pass | Pass | Pass | Required for selector-free updates, same-member parallelism, backend settlement, frontend routing, and active row cleanup. |
| `TaskAgentFrontendEntity` / frontend task-agent projection type | Pass | Pass | Pass | Pass | Correct shared frontend structure for streaming, hydration, team views, running tree, activity links, and active/removal semantics. |
| Active execution vs roster/topology projection split | Pass | Pass | Pass | Pass | Needed so logical member templates do not appear as lingering offline execution rows after task-agent settlement. |
| Completed task/task-agent history entity or projection | Pass | N/A | Pass | Pass | The design requires retained completion visibility outside the logical member's normal conversation. Exact storage/UI shape can remain implementation detail if validation proves it. |
| Completion notification payload | Pass | Pass | Pass | Pass | One payload can serve events and coordinator/delegator messages. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `member_name` | Pass | Pass | Pass | N/A | Pass | Exact team-roster logical member/template name; not arbitrary assignee text or route-key alias. |
| `description` | Pass | Pass | Pass | N/A | Pass | Required rich ready-to-run work-packet body with objective, context, constraints, done conditions, and expected output guidance. |
| `reference_files` | Pass | Pass | Pass | N/A | Pass | Optional structured file/artifact references. |
| Removed `assignee_name` field | Pass | Pass | Pass | N/A | Pass | Superseded by clearer `member_name` model-facing name. Internal assignee/member identities may still exist behind the service. |
| Removed `task_name` field | Pass | Pass | Pass | N/A | Pass | Server-generated internal task identity and optional derived display label replace it. |
| Removed `dependencies` field | Pass | Pass | Pass | N/A | Pass | Dependency authoring/dependent activation deferred; dependent work is delegated in a later call after notification. |
| `UpdateTaskStatusInput` | Pass | Pass | Pass | N/A | Pass | `status`, optional `message`, optional `reference_files`; no task selector. |
| `TaskAgentInstanceIdentity` | Pass | Pass | Pass | N/A | Pass | Caller context identity is the status-update selector and frontend active entity identity source. |
| `TaskAgentFrontendEntity` | Pass | Pass | Pass | Pass | Pass | Concrete run/instance identity, logical member reference, scoped conversation/activity, and active status remain distinct from logical member topology. |
| Active execution projection | Pass | Pass | Pass | Pass | Pass | Holds currently active task-agent entities and explicit normal member conversations; task-only worker leaves this projection after final task-agent settlement. |
| Roster/topology projection | Pass | Pass | Pass | Pass | Pass | Holds logical member templates for team definition, future delegation, config, and available-member UI; it must be labeled non-execution and must not own task-agent conversations. |
| `TaskDelegationRecord` | Pass | Pass | Pass | Pass | Pass | Internal record may keep generated task ID/display label and member identities without leaking stale model-facing fields. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Legacy model-facing task tools | Pass | Pass | Pass | Pass | `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, and `assign_task_to` are correctly removed/deferred. |
| Model-facing `assignee_name` | Pass | Pass | Pass | Pass | Replaced by `member_name` in model-facing schema. |
| Model-facing `task_name` | Pass | Pass | Pass | Pass | Removed from delegation and status surfaces; server generates identity/display label internally. |
| Model-facing `dependencies` | Pass | Pass | Pass | Pass | Removed/deferred; stale calls rejected; dependent sequencing belongs to coordinator follow-up calls after completion notification. |
| Model-facing `completion_criteria` | Pass | Pass | Pass | Pass | Removed; guidance belongs in `description`. |
| Model-facing `expected_deliverables` / deliverables object | Pass | Pass | Pass | Pass | Removed; use optional status `message` and `reference_files`. |
| `update_task_status` selector fields | Pass | Pass | Pass | Pass | `task_id`, `task_name`, title/selector fields must be rejected. |
| Name-only task records | Pass | Pass | Pass | Pass | `member_name` without rich `description` is invalid. |
| Assignee-grouped batch packet | Pass | Pass | Pass | Pass | Replaced by one task-agent instance per selected task unless a later explicit batching policy is designed. |
| Route-key-only backend task-agent lifecycle maps | Pass | Pass | Pass | Pass | Replaced by backend task-agent registries keyed by concrete task-agent run ID. |
| Route-key-only frontend task-agent projection | Pass | Pass | Pass | Pass | Replaced by active task-agent frontend entity map keyed by concrete task-agent identity. |
| Lingering task-only logical worker active execution row (`worker • Offline`) | Pass | Pass | Pass | Pass | Replaced by active execution vs roster/topology separation. Logical member rows may remain only as clearly labeled roster/config/available-member context or separate direct-message conversation participants. |
| Task-agent activity stored as logical member normal conversation | Pass | Pass | Pass | Pass | Replaced by task-agent scoped active entity and completed task/task-agent history/notification. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-tool-contract.ts` / parameter schema | Pass | Pass | Pass | Pass | Must advertise `member_name`/`description`/`reference_files` and selector-free status input only. |
| `task-delegation-tool-input-parsers.ts` | Pass | Pass | Pass | Pass | Correct owner for strict stale-field rejection and required-description validation. |
| `task-delegation-tool-service.ts` | Pass | Pass | Pass | Pass | Thin canonical tool adapter; calls `TaskDelegationService`. |
| `task-delegation-record.ts` | Pass | Pass | Pass | Pass | Correct normalized internal record owner. |
| `task-agent-instance-identity.ts` / team-run domain type | Pass | Pass | Pass | Pass | Correct identity owner. |
| `task-delegation-ledger.ts` | Pass | Pass | Pass | Pass | Correct state owner. |
| `task-delegation-activation-coordinator.ts` | Pass | Pass | Pass | Pass | Correct activation/concurrency sequencing owner. |
| `task-delegation-work-packet-renderer.ts` | Pass | Pass | Pass | Pass | Correct prompt/content owner; should avoid instructing workers to pass selectors. |
| `task-delegation-completion-notifier.ts` | Pass | Pass | Pass | Pass | Correct notification owner for message/reference payload. |
| `task-delegation-settlement-coordinator.ts` | Pass | Pass | Pass | Pass | Correct delayed safe-settlement owner. |
| Backend task-agent instance registries | Pass | Pass | Pass | Pass | Correct runtime lifecycle placement. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Pass | Pass | Pass | Pass | Correct state-model owner for task-agent active entity map/equivalent while keeping logical member topology separate. |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` or equivalent projection module | Pass | Pass | Pass | Pass | Correct place for task-agent identity extraction, active entity creation/removal, and focus fallback behavior; must not fall back from a settled task-agent to a task-only logical worker as active execution. |
| `autobyteus-web/services/agentStreaming/protocol/teamStreamIdentityTypes.ts` | Pass | Pass | Pass | Pass | Correct typed payload owner for task-agent identity fields. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Pass | Pass | Pass | Pass | Correct stream-routing owner for task-agent-identified payloads. |
| `teamRunStatusHydration.ts` or equivalent status hydration path | Pass | Pass | Pass | Pass | Correct hydration/status merge owner for active task-agent creation/update/removal. |
| `TeamTaskAgentActivityBar.vue` | Pass | Pass | N/A | Pass | Correct display of active task-agent cards/approval affordances from projection state; not the owner of lifecycle decisions. |
| `TeamWorkspaceView.vue`, `TeamMemberMonitorTile.vue`, grid/spotlight/running views | Pass | Pass | N/A | Pass | Correct renderers of projection state; must render active execution separately from roster/topology and avoid showing task-only logical worker as offline active execution after settlement. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime projections | Pass | Pass | Pass | Pass | Use canonical parser/schema; do not expose stale fields or own delegation semantics. |
| `TaskDelegationToolService` | Pass | Pass | Pass | Pass | Correct adapter to service. |
| `TaskDelegationService` / ledger | Pass | Pass | Pass | Pass | Owns business authority and task resolution from caller context. |
| Activation/settlement coordinators | Pass | Pass | Pass | Pass | Use public `TeamRun` task-agent APIs, not backend maps. |
| Renderer | Pass | Pass | Pass | Pass | Depends on domain record and service-provided identity; not runtime-specific schema code. |
| Backend task-agent lifecycle | Pass | Pass | Pass | Pass | Owns concrete runtime instances and cleanup. |
| Frontend projection | Pass | Pass | Pass | Pass | Views consume projection state; streaming/hydration creates/removes task-agent entities from backend identity; components must not route by logical member alone or full topology/memberTree when rendering active execution. |
| Roster/topology UI | Pass | Pass | Pass | Pass | May read team definition/logical members, but must label itself as non-execution and must not receive task-agent stream history as normal conversation state. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `delegate_tasks` model-facing contract | Pass | Pass | Pass | Pass | Minimal schema, `member_name` semantics, ready-to-run scope, and no-dependencies rule are explicit. |
| `update_task_status` model-facing contract | Pass | Pass | Pass | Pass | Selector-free contract is sound because service owns task resolution from task-agent context. |
| `TaskDelegationService` | Pass | Pass | Pass | Pass | Authoritative business boundary. |
| `TaskDelegationWorkPacketRenderer` | Pass | Pass | Pass | Pass | Correct activation-content boundary. |
| `TeamRun.startTaskAgentInstance` / `settleTaskAgentInstance` | Pass | Pass | Pass | Pass | Correct lifecycle entrypoints. |
| Backend task-agent instance registry | Pass | Pass | Pass | Pass | Concrete run handles stay inside backend manager boundary. |
| Frontend task-agent projection | Pass | Pass | Pass | Pass | Authoritative UI/session boundary for active task-agent entities, stream routing, cleanup, and history routing. Route-key-only component inference is explicitly forbidden. |
| Active execution projection vs team roster/topology projection | Pass | Pass | Pass | Pass | Correct split: active execution removes task-only workers after settlement; topology/roster can keep logical templates only as labeled non-execution context. |
| Normal member conversation surface | Pass | Pass | Pass | Pass | Separate from task-agent execution; may exist for `send_message_to`/direct messaging and must not inherit task-agent packets/history. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `delegateTasks(context, input)` | Pass | Pass | Pass | Low | Pass |
| `parseDelegateTasksInput(raw)` | Pass | Pass | Pass | Low | Pass |
| `renderWorkPacket(record)` | Pass | Pass | Pass | Low | Pass |
| `startTaskAgentInstance(request)` | Pass | Pass | Pass | Low | Pass |
| `updateTaskStatus(context, input)` | Pass | Pass | Pass | Low | Pass |
| `settleTaskAgentInstance(...)` | Pass | Pass | Pass | Low | Pass |
| `notifyTerminalStatus(payload)` | Pass | Pass | Pass | Low | Pass |
| Frontend `projectTaskAgentStatus/message(payload)` shape | Pass | Pass | Pass | Low | Pass |
| Frontend active-execution query/projection | Pass | Pass | Pass | Low | Pass |
| Frontend roster/topology query/projection | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/task-delegation/` | Pass | Pass | Low | Pass | Correct tool schema/parser/service owner. |
| `agent-team-execution/task-delegation/` | Pass | Pass | Medium | Pass | Correct domain record/service/activation/notification/settlement owner. |
| Runtime projection folders | Pass | Pass | Low | Pass | Adapter-only. |
| Backend task-agent registries | Pass | Pass | Medium | Pass | Necessary for multiple concrete instances under one logical member. |
| Existing `autobyteus-ts/task-management` | Pass | Pass | Medium | Pass | Can be reused only behind the service boundary; model-facing legacy tools are decommissioned. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` and frontend streaming/hydration/services | Pass | Pass | Medium | Pass | Correct frontend state/projection placement; no need to push UI lifecycle semantics into backend business service. |
| `autobyteus-web/components/workspace/team/*` and `components/workspace/running/*` | Pass | Pass | Low | Pass | Correct display placement for active execution, task-agent cards, direct-message member conversations, and separately labeled roster/template surfaces. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server-owned tool manifest/parser pattern | Pass | Pass | Pass | Pass | Browser pattern remains the right precedent. |
| Existing task status/event primitives | Pass | Pass | N/A | Pass | May be reused behind `TaskDelegationService`; dependency authoring/activation is deferred. |
| Work-packet renderer | Pass | Pass | Pass | Pass | Correct reusable owner. |
| Task-agent instance model | Pass | Pass | Pass | Pass | Required for selector-free updates, same-member parallelism, safe settlement, frontend routing, and active row cleanup. |
| Team backend lifecycle support | Pass | Pass | Pass | Pass | Extend/gate by backend capability. |
| Frontend team-run context, streaming, hydration, and team/running views | Pass | Pass | N/A | Pass | Correctly extended rather than replaced wholesale; identity split must be added to existing projection and active execution must not be a raw full-topology render. |
| Existing activity/event history surfaces | Pass | Pass | N/A | Pass | Acceptable destination for completion visibility if task-agent history remains scoped to completed task/task-agent identity rather than logical normal conversation. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Legacy task-plan tools | No intended retention | Pass | Pass | Correct. |
| Previous `assignee_name` field | No intended retention | Pass | Pass | Replaced by `member_name`. |
| Name-only/task-name creation | No intended retention | Pass | Pass | Correct. |
| Dependency authoring/dependent activation in first ticket | No intended retention | Pass | Pass | Explicitly deferred; dependent work uses later delegation call after notification. |
| Superseded rich schema fields | No intended retention | Pass | Pass | Must be removed/rejected in implementation. |
| Status selector fields | No intended retention | Pass | Pass | `task_id`, `task_name`, title selectors rejected at model-facing boundary. |
| Internal TaskPlan storage reuse | Yes, internal seam | Pass | Pass | Acceptable only behind `TaskDelegationService`. |
| Route-key-only frontend active task-agent UX | No intended retention | Pass | Pass | Must be replaced by transient task-agent entity projection. |
| Task-only logical worker as offline active execution row after settlement | No intended retention | Pass | Pass | Explicitly forbidden by Round 14 clarification; roster/template display is allowed only as labeled non-execution context. |
| Task-agent history embedded into logical member normal conversation | No intended retention | Pass | Pass | Completion/activity must stay task-agent/completed-task scoped. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Add latest minimal `delegate_tasks` schema | Pass | Pass | Pass | Pass |
| Rename model-facing target field from `assignee_name` to `member_name` | Pass | Pass | Pass | Pass |
| Remove obsolete `task_name`/dependency/criteria/deliverable fields | Pass | Pass | Pass | Pass |
| Add ready-to-run sequencing guidance and reject dependency fields | Pass | Pass | Pass | Pass |
| Add selector-free `update_task_status` schema and context task resolution | Pass | Pass | Pass | Pass |
| Preserve rich `description` and `reference_files` in ledger/work packet | Pass | Pass | Pass | Pass |
| Reject stale fields in parser/tool service | Pass | Pass | Pass | Pass |
| Add task-agent identity/lifecycle changes | Pass | Pass | Pass | Pass |
| Add frontend task-agent active entity state/routing/hydration | Pass | Pass | Pass | Pass |
| Split frontend active execution projection from roster/topology projection | Pass | Pass | Pass | Pass |
| Update focus fallback/full-member-tree rendering so task-only logical workers are not shown as `Offline` execution rows after settlement | Pass | Pass | Pass | Pass |
| Preserve completion history/notification under task-agent/completed-task identity after active entity removal | Pass | Pass | Pass | Pass |
| Update team/running views to render task-agent entities distinctly from logical roster/template rows | Pass | Pass | Pass | Pass |
| Gate unsupported native AutoByteus pure-team exposure | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical `delegate_tasks` input with `member_name` | Yes | Pass | N/A | Pass | Shows only `member_name`, `description`, and `reference_files`. |
| Ready-to-run dependency sequencing | Yes | Pass | Pass | Pass | Design states dependent B is delegated later after A's completion notification, not encoded as `dependencies`. |
| Invalid `delegate_tasks` input | Yes | Pass | Pass | Pass | Shows `member_name` without `description` as invalid. |
| Selector-free `update_task_status` input | Yes | Pass | Pass | Pass | Shows status/message/reference files and says not to pass task selectors. |
| Work packet output | Yes | Pass | Pass | Pass | Shows description, references, and selector-free update instructions. |
| Parallel same-member task agents | Yes | Pass | Pass | Pass | Demonstrates independent internal task-agent run IDs and independent settlement. |
| Frontend task-agent lifecycle | Yes | Pass | Pass | Pass | Good shape shows roster/template rows separate from active task-agent rows and task/activity history; bad shape explicitly rejects `worker Offline` containing the task-agent packet. |
| Round 14 worker-row semantics | Yes | Pass | Pass | Pass | Design explicitly says `worker`, `worker • Offline`, or equivalent worker execution row/card/header must not remain in active run UI after final task-agent settlement. |
| Separate direct-message/member conversation semantics | Yes | Pass | N/A | Pass | Design explains logical member can still appear as normal conversation participant when activated through direct messaging, but that is a separate surface/history. |
| Terminal completion notification | Yes | Pass | N/A | Pass | Clear message/reference-file payload shape. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Dependency authoring/dependent activation | Avoids reopening stale model-facing fields accidentally. | Deferred to a later intentionally designed feature; do not implement dependency fields in this ticket. Coordinator sequences dependent follow-up by waiting for completion notification and delegating the next ready-to-run task later. | Resolved for this ticket. |
| Future batching / multiple active tasks in one task-agent instance | Selector-free `update_task_status` only works when a task-agent instance is bound to exactly one active delegated task. | Preserve one-task-per-instance for this ticket. If future batching is introduced, status identity, frontend entity ownership, and settlement semantics need a separate design. | Acceptable residual risk. |
| Initial same-member concurrency limit | Determines default parallelism. | Implementation may choose conservative production default, but must preserve instance identity and test-configurable parallelism. | Acceptable implementation decision. |
| Native AutoByteus pure-team support | Unsupported per-member settlement would violate mandatory sub-agent lifecycle. | Gate task-delegation exposure off or implement per-instance/per-member settlement before claiming support. | Accepted boundary decision. |
| Ledger physical rename/move | Could improve naming but increases migration risk. | Wrap existing TaskPlan-like storage behind `TaskDelegationService` first; physical rename can happen later if needed. | Acceptable residual risk. |
| Exact visual treatment for task-agent row/card and roster/template access | Product/UI details may vary by focus/grid/spotlight/running tree. | Implementation can choose UI shape, but must preserve structural distinction, task-agent scoped conversation/activity, active-entity disappearance, and no task-only `worker • Offline` active execution row after settlement. | Acceptable implementation decision. |
| Completed task-agent history storage shape | Users need evidence after transient entity removal. | Use task/activity/history/notification or an explicit completed task-agent history entity, but keep it scoped to task-agent/completed-task identity and out of logical member normal conversation. | Acceptable implementation decision with required validation. |
| Logical member with both direct-message conversation and delegated task agents | Prevents confusion between a persistent direct conversation and transient task-agent execution. | Keep direct-message/member conversation labeled and history-scoped separately from task-agent execution/history. | Covered by REQ-027/AC-027; validate when implemented. |

## Review Decision

`Pass`: the design is ready for implementation/continued implementation.

The Round 14 worker-row semantics clarification is architecturally sound. It tightens the frontend projection boundary without changing the underlying task-delegation service/lifecycle architecture: logical members remain reusable templates, concrete task-agent instances remain the execution units, and active UI must project execution units rather than raw logical topology after settlement. No upstream redesign or scope split is required before routing downstream.

## Findings

None.

## Classification

N/A — no blocking architecture findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Full implementation correctness remains for implementation handoff, code review, and API/E2E validation; this review only confirms design readiness.
- Frontend stream and hydration paths must consistently preserve `task_agent_run_id`/`task_agent_instance_id`; any route-key fallback must not collapse task-agent packets/tool calls/status into the logical member conversation when task-agent identity is present.
- Focus fallback after `removeTaskAgentContext` and grid/spotlight/full-`memberTree` rendering must not resurrect a task-delegation-only logical worker as `worker • Offline` or equivalent active execution participant after final settlement.
- Active task-agent entity cleanup must remove only the settled concrete entity, not sibling task-agent entities, explicit normal member conversations, or the logical roster/template entry.
- UI must retain completion history/notification after active entity removal so disappearance does not erase evidence of completed work.
- Direct-message/member conversations must stay labeled and scoped separately from task-agent execution/completed-task history.
- Runtime projections must not weaken the canonical tool schema or accept stale aliases such as `assignee_name`, `task_name`, or `dependencies`.
- `update_task_status` must reject unbound contexts, contexts bound to zero tasks, and contexts ambiguously bound to multiple active tasks.
- Same-member parallelism requires backend registries and frontend entities keyed by concrete task-agent run/instance identity, not only logical route key.
- Supported delegation paths must prove mandatory final task-agent settlement after terminal status and idle; native pure-team delegation must stay gated unless settlement is implemented.
- Future dependency or batching semantics require a separate intentional design rather than restoring superseded fields/selectors or route-key-only UI projection.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Route to `implementation_engineer` with the updated reviewed package, API/E2E reroute evidence, screenshots, and relevant frontend source references; no return to `solution_designer` is required.
