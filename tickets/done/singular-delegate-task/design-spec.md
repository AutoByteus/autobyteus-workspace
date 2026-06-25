# Design Spec

## Current-State Read

The current model-facing task-delegation entrypoint is plural: `delegate_tasks({ tasks: [...] })`. That shape is owned by `autobyteus-server-ts/src/agent-tools/task-delegation` through the canonical manifest, parser, parameter schema, native AutoByteus wrapper, and Agent Tools MCP adapter projection.

The actual task lifecycle is already singular below that public schema:

- `TaskDelegationTaskInput` represents one delegated task.
- The ledger creates one `TaskDelegationRecord` per task.
- `TaskDelegationActivationCoordinator` starts one task-agent instance per record and renders a one-record work packet in normal operation.
- `submit_task_result` is bound to one task-agent context.
- `review_task_result` reviews one task id.

The plural public schema is therefore a batch convenience wrapper over singular lifecycle ownership. It also has noisy schema guidance: the `tasks` parameter description tells the model not to pass fields such as `delegator`, `task_name`, `dependencies`, `completion_criteria`, `expected_deliverables`, and `status`. Those fields are not part of the positive contract, and mentioning them creates irrelevant negative guidance / negative instruction noise.

The current activation coordinator exposes one more design concern: `activateRunnableTasks()` activates every `not_started` record in the ledger. That behavior fit a batch-oriented public call, but a singular `delegate_task` should activate only the record created by that call so repeated calls do not unexpectedly re-activate stale not-started tasks from earlier failed activations.

## Intended Change

Replace the public/model-facing delegation API with singular `delegate_task`:

```json
{
  "member_name": "worker",
  "description": "Complete this ready-to-run task...",
  "reference_files": ["/optional/artifact.md"]
}
```

The tool returns one direct task result, for example:

```json
{
  "member_name": "worker",
  "task_id": "task_0001",
  "target_agent_run_id": "worker_...",
  "status": "active",
  "activation_accepted": true,
  "message": null
}
```

Multiple independent delegations are represented by multiple `delegate_task` calls. `submit_task_result` and `review_task_result` remain semantically unchanged.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / API Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness and Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `DelegateTasksInput` wraps `TaskDelegationTaskInput[]`, while downstream lifecycle methods, result submission, review, task-agent identity, and normal work-packet rendering are singular. Current descriptions also preserve historical negative guidance for fields outside the schema.
- Design response: Make the public delegation boundary singular, direct, and positive-only; remove plural public tool names, batch parser/schema/result arrays, and one-item-array instructions; scope activation to the created task id.
- Refactor rationale: Adding `delegate_task` while keeping `delegate_tasks` would create dual authoritative public APIs for the same lifecycle. Keeping batch-shaped internals at the service boundary would preserve the mismatch that caused this cleanup.
- Intentional deferrals and residual risk, if any: Existing task-delegation event payloads may still contain `taskIds`/`tasks` arrays because they are team-run event projections, not the model-facing delegation tool contract. This change must ensure those arrays contain one task for each singular activation. Tightening the websocket event schema itself is outside this ticket unless implementation discovers it is required for correctness.

## Terminology

- `Public model-facing tool boundary`: the canonical tool name, manifest description, parameter schema, parser, and runtime adapter projection seen by agents.
- `Delegated task lifecycle`: one ledger record, one task-agent instance, result submissions, reviews, and eventual settlement for one task.
- `Positive-only delegation guidance`: descriptions that state the fields to provide and the lifecycle that follows, without listing unrelated fields the model should avoid.

## Design Reading Order

1. Public tool spine and lifecycle owner.
2. Singular DTO/service/activation boundaries.
3. Exposure/docs/tests updates.
4. Real E2E validation requirement.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `delegate_tasks` as a public/model-facing tool name and remove the `tasks` array input contract.
- The design must not retain `delegate_tasks` as an alias, wrapper, hidden compatibility path, or second manifest entry.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent tool call `delegate_task` | Active task-agent work packet | `TaskDelegationService` | Main behavior being changed from plural public API to singular lifecycle. |
| DS-002 | Return-Event | Task-agent `submit_task_result` | Delegator `review_task_result` and settlement | `TaskDelegationService` | Proves existing singular lifecycle remains compatible after creation changes. |
| DS-003 | Primary End-to-End | Repeated `delegate_task` calls | Independent task-agent lifecycles | `TaskDelegationService` | Replaces batch fan-out with repeated singular calls. |
| DS-004 | Primary End-to-End / Validation | Product-facing team runtime E2E | Observed runtime task lifecycle events | API/E2E coverage path | Ensures validation proves the real runtime/tool-exposure path. |

## Primary Execution Spine(s)

- DS-001: `Agent Tools MCP / Native Tool Wrapper -> TaskDelegationToolManifest -> TaskDelegationToolService -> TaskDelegationService.delegateTask -> TaskDelegationLedger -> TaskDelegationActivationCoordinator.activateTask -> TeamRun.startTaskAgentInstance -> Task-Agent Work Packet`
- DS-003: `delegate_task call A -> Task A lifecycle` and `delegate_task call B -> Task B lifecycle`, with no shared `tasks[]` batch envelope.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A model calls one tool with one target member and one work-packet description. The tool boundary parses direct fields, resolves the team run, creates one ledger record, activates that one record, and returns one direct result. | Tool boundary, tool service, task delegation service, ledger record, activation coordinator, team run | `TaskDelegationService` | Parameter schema, parser, member resolver, JSON serialization, tool adapters |
| DS-002 | The activated task-agent submits a result using existing context-bound submission; the original delegator reviews the pending submission and settlement proceeds as before. | Task-agent context, task delegation service, notification dispatcher, settlement coordinator | `TaskDelegationService` | Notification delivery, event publishing, idle settlement |
| DS-003 | Independent fan-out is explicit repeated calls. Each call owns exactly one generated `task_id` and one activation result. | Tool call, ledger record, task-agent instance | `TaskDelegationService` | Runtime ability to issue multiple tool calls, E2E proof |
| DS-004 | E2E creates a real team run, exposes configured tools, executes `delegate_task`, observes activation and result/review events through runtime/websocket paths. | Product API, team runtime, runtime tool exposure, task lifecycle events | API/E2E engineer | Environment setup, live runtime flags, evidence capture |

## Spine Actors / Main-Line Nodes

- `Agent Tools MCP / Native Tool Wrapper`: thin transport/runtime entry wrapper for configured tools.
- `TaskDelegationToolManifest`: authoritative public model-facing tool definition.
- `TaskDelegationToolService`: thin team-run resolver and bridge to lifecycle owner.
- `TaskDelegationService`: governing owner of task lifecycle creation, validation, submission, review, and settlement coordination.
- `TaskDelegationLedger`: owns durable in-run task records and status transitions.
- `TaskDelegationActivationCoordinator`: owns task-agent identity allocation and start sequencing for a specific task.
- `TeamRun.startTaskAgentInstance`: starts the concrete task-agent run.

## Ownership Map

| Node | Ownership |
| --- | --- |
| `TaskDelegationToolManifest` | Public tool name, public description, parameter schema, parse/execute binding. |
| `TaskDelegationToolService` | Bound team-run lookup and service dispatch only; no lifecycle policy. |
| `TaskDelegationService` | Lifecycle authority, context validation orchestration, task record creation, result shape assembly, submit/review transitions. |
| `TaskDelegationInputResolver` | Input normalization, member-name resolution, delegator identity cloning. |
| `TaskDelegationLedger` | Record identity, status state, submissions/reviews history. |
| `TaskDelegationActivationCoordinator` | Scoped activation of one created record, task-agent identity allocation, work packet start, rollback on failed start. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `DelegateTaskTool` native AutoByteus wrapper | `TaskDelegationToolManifest` + `TaskDelegationService` | Exposes the same server-owned task tool to mixed AutoByteus members. | Public schema divergence, lifecycle policy, compatibility aliasing. |
| Agent Tools MCP task-delegation adapter provider | `TaskDelegationToolManifest` + `TaskDelegationService` | Projects configured backend tools through MCP. | Alternate tool names, batch compatibility behavior. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Public tool name `delegate_tasks` | Public lifecycle action is singular. | `delegate_task` in `task-delegation-tool-contract.ts`. | In This Change | No alias. |
| Top-level `tasks` array parameter | One tool call delegates one task. | Direct `member_name`, `description`, `reference_files`. | In This Change | Multiple tasks use multiple calls. |
| `DelegateTasksInput` / `DelegateTasksResult` public DTO names and batch result arrays | Preserve plural mismatch. | `DelegateTaskInput` / `DelegateTaskResult`. | In This Change | `TaskDelegationTaskInput` can be reused as direct input base. |
| `parseDelegateTasksInput` / `buildDelegateTasksParameterSchema` | Old public schema/parser. | `parseDelegateTaskInput` / `buildDelegateTaskParameterSchema`. | In This Change | Keep strict validation. |
| `TaskDelegationService.delegateTasks` public service method | Batch method at governing lifecycle boundary. | `TaskDelegationService.delegateTask`. | In This Change | Private helper extraction is allowed only if not public/batch-shaped. |
| `TaskDelegationActivationCoordinator.activateRunnableTasks` as public batch activation entry | Activates unrelated not-started tasks under singular API. | Scoped `activateTask(teamRun, taskId)`. | In This Change | May keep private `activateRecord` helper. |
| Negative field-list guidance in delegation schema/runtime docs | Irrelevant negative guidance. | Positive field descriptions. | In This Change | Validation errors may still mention unknown supplied keys. |

## Return Or Event Spine(s) (If Applicable)

DS-002 return/review spine remains:

`Task-Agent -> submit_task_result -> TaskDelegationService.submitTaskResult -> Ledger awaiting_review -> NotificationDispatcher -> Delegator -> review_task_result -> TaskDelegationService.reviewTaskResult -> SettlementCoordinator`

No semantic change is intended here; references to creation should point to `delegate_task`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `TaskDelegationActivationCoordinator`

`Created task id -> resolve ledger record -> allocate task-agent run id -> register starting task -> bind record -> start task-agent -> mark active or rollback`

This scoped local spine replaces the current all-runnable activation loop for the public singular delegation path.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Parameter schema builder | DS-001 | Tool manifest | Define positive direct fields. | Runtime/tool catalog projection. | Public schema drift. |
| Parser | DS-001 | Tool manifest | Strict runtime input validation and defaults. | Keeps malformed calls out of service owner. | Lifecycle owner becomes schema-specific. |
| Member input resolver | DS-001 | `TaskDelegationService` | Normalize member and delegator identity. | Reused lifecycle validation concern. | Duplicated member resolution. |
| JSON serialization/error payload | DS-001 | Tool adapters | Stable tool result string mapping. | Runtime adapter compatibility. | Transport concerns leak into lifecycle owner. |
| Notification dispatcher | DS-002 | `TaskDelegationService` | Deliver result/revision system messages. | Existing return path. | Submission/review flow becomes hidden transport logic. |
| E2E harness | DS-004 | API/E2E validation | Prove real runtime/tool path. | User explicitly requires real E2E. | False confidence from mocks/service-only checks. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Public tool schema/name | `src/agent-tools/task-delegation` | Extend/Modify | This is already the authoritative public tool boundary. | N/A |
| Lifecycle creation | `src/agent-team-execution/task-delegation` | Extend/Modify | Existing service/ledger/activation owners are correct. | N/A |
| Runtime instructions | `member-run-instruction-composer.ts` | Modify | Existing centralized instruction owner. | N/A |
| Real E2E | `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Extend/Modify | Already drives GraphQL/websocket/runtime tool execution. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent tools / task delegation | Tool names, manifest, parser, schema, adapters | DS-001 | `TaskDelegationService` | Modify | Rename to singular and direct schema. |
| Agent-team execution / task delegation | Ledger, activation, submit/review lifecycle | DS-001, DS-002, DS-003 | `TaskDelegationService` | Modify | Change creation/activation boundary to singular. |
| Agent-team instruction composition | Runtime guidance | DS-001 | Tool users | Modify | Positive-only delegation input guidance. |
| Runtime E2E tests | Real product/runtime validation | DS-004 | Release confidence | Modify | Must not be replaced by unit/integration only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-tool-contract.ts` | Agent tools / task delegation | Public tool contract | Singular tool name/list/type map. | Existing contract file. | `DelegateTaskInput/Result` |
| `task-delegation-tool-parameter-schemas.ts` | Agent tools / task delegation | Public schema | Direct singular parameter schema. | Existing schema file. | `ParameterSchema` |
| `task-delegation-tool-input-parsers.ts` | Agent tools / task delegation | Public parser | Strict singular input parser. | Existing parser file. | `TaskInputSchema` |
| `task-delegation-tool-manifest.ts` | Agent tools / task delegation | Public manifest | `delegate_task` entry and execution binding. | Existing manifest file. | Contract/schema/parser |
| `delegate-task.ts` | Agent tools / task delegation | Native wrapper | Native AutoByteus singular wrapper. | Rename of wrapper. | Manifest |
| `task-delegation-record.ts` | Agent-team execution / task delegation | Shared DTO owner | Singular delegate input/result types. | Existing DTO file. | `TaskDelegationTaskInput` |
| `task-delegation-service.ts` | Agent-team execution / task delegation | Lifecycle owner | `delegateTask` creation and direct result assembly. | Existing lifecycle owner. | Resolver, ledger, activation coordinator |
| `task-delegation-activation-coordinator.ts` | Agent-team execution / task delegation | Activation owner | Scoped activation by task id. | Existing activation owner. | Work packet renderer |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Single task input fields | `TaskDelegationTaskInput` / `DelegateTaskInput` in `task-delegation-record.ts` | Agent-team execution / task delegation | Same fields used by parser, resolver, record creation. | Yes | Yes | A batch envelope or kitchen-sink task DTO. |
| Activation result mapping | `DelegateTaskResult` in `task-delegation-record.ts` | Agent-team execution / task delegation | Public result should be one singular shape. | Yes | Yes | Nested `createdTasks[]` / `activationResults[]` duplication. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `DelegateTaskInput` | Yes | Yes | Low | Directly represent one task work packet. |
| `DelegateTaskResult` | Yes | Yes | Low | Include one generated task id, member name, status, activation acceptance, target run id, optional message. |
| Existing activation event payload arrays | Mostly | No | Medium | Keep out of public tool scope; ensure singular event instances contain one task. Consider future event-shape cleanup if needed. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | Agent tools / task delegation | Public tool contract | `DELEGATE_TASK_TOOL_NAME = "delegate_task"`, canonical list, singular type maps. | Existing contract owner. | `DelegateTaskInput/Result` |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Agent tools / task delegation | Public manifest | Singular description, schema, parser, execute binding. | Existing manifest owner. | Contract/schema/parser |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Agent tools / task delegation | Public schema | `buildDelegateTaskParameterSchema()` with direct fields and positive descriptions. | Existing schema owner. | `ParameterDefinition` |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Agent tools / task delegation | Parser | `parseDelegateTaskInput()` strict direct input. | Existing parser owner. | Singular task schema |
| `autobyteus-server-ts/src/agent-tools/task-delegation/delegate-task.ts` | Agent tools / task delegation | Native wrapper | Native singular wrapper class/function. | Clear file name follows tool name. | Manifest |
| `autobyteus-server-ts/src/agent-tools/task-delegation/register-task-delegation-tools.ts` | Agent tools / task delegation | Registration | Register/unregister singular delegation tool plus existing result/review tools. | Existing registration owner. | Tool name list |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts` | Agent tools / task delegation | Thin bridge | `delegateTask` dispatch to lifecycle service. | Existing team-run resolver bridge. | Tool context |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Agent-team execution / task delegation | DTO owner | `DelegateTaskInput`, `DelegateTaskResult`; remove plural public DTOs. | Existing DTO owner. | `TaskDelegationTaskInput` |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Agent-team execution / task delegation | Resolver | `buildCreateInput(context, input)` for one task. | Existing resolver owner. | Clone/normalize helpers |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Agent-team execution / task delegation | Lifecycle owner | `delegateTask` singular lifecycle creation and result assembly. | Existing governing owner. | Resolver/ledger/activation |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Agent-team execution / task delegation | Activation owner | `activateTask(teamRun, taskId)` scoped activation. | Existing activation owner. | Work packet renderer |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Agent-team execution | Runtime instruction owner | Singular positive delegation guidance. | Existing runtime instruction owner. | Tool availability |
| `autobyteus-server-ts/docs/**`, `autobyteus-ts/docs/**` | Docs | Durable docs | Singular tool docs and real E2E expectation where relevant. | Existing docs. | N/A |
| Relevant tests | Tests | Durable coverage | Unit/integration/e2e update to singular and repeated-call fan-out. | Existing coverage owners. | N/A |

## Ownership Boundaries

The authoritative public boundary is `TaskDelegationToolManifest` plus its contract/schema/parser files. Runtime-specific wrappers must depend on that manifest and must not define alternate names or schemas.

The authoritative lifecycle boundary is `TaskDelegationService`. Tool adapters and runtime wrappers must not create ledger records, start task-agents, or assemble task lifecycle results directly.

`TaskDelegationActivationCoordinator` is internal to lifecycle execution and owns task-agent start mechanics only. It should accept a specific task id for this flow so public singular delegation cannot accidentally activate unrelated records.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationToolManifest` | Schema, parser, execute binding | MCP adapter provider, native wrapper | Adapter defining `delegate_tasks` or custom schema directly | Strengthen manifest/schema functions. |
| `TaskDelegationService.delegateTask` | Resolver, ledger, activation coordinator | Tool service and tests above lifecycle boundary | Tool service calling ledger/activation coordinator directly | Add needed result fields to service method. |
| `TaskDelegationActivationCoordinator.activateTask` | Identity allocation, directory registration, start/rollback | `TaskDelegationService` | Service looping all runnable records for a singular call | Add scoped activation method. |

## Dependency Rules

Allowed:

- Tool wrappers/adapters -> manifest entry -> `TaskDelegationToolService`.
- `TaskDelegationToolService` -> bound `TeamRun` -> `TaskDelegationService.delegateTask`.
- `TaskDelegationService` -> input resolver, ledger, activation coordinator, event publisher, notification dispatcher, settlement coordinator.
- Tests may use service-level APIs for unit/integration coverage, but API/E2E sign-off must also use a real runtime/tool path.

Forbidden:

- Exposing both `delegate_task` and `delegate_tasks` as public configured tools.
- Keeping a `tasks` array as the public delegation input.
- Runtime adapters defining an alternate plural schema outside the manifest.
- Singular `delegate_task` activating all not-started ledger records.
- Treating mocked service tests as sufficient for the user-required E2E evidence.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegate_task` tool | One delegated task | Public model-facing delegation command | `member_name` + `description` + optional `reference_files` | Singular direct schema. |
| `TaskDelegationService.delegateTask(context, input)` | One delegated task lifecycle | Create record, activate task, return direct result | Bound team/member context + singular input | Governing lifecycle method. |
| `TaskDelegationActivationCoordinator.activateTask(teamRun, taskId)` | One activation attempt | Start one task-agent for one ledger record | `teamRun` + generated `taskId` | Prevents batch side effects. |
| `submit_task_result` | Current bound task-agent task | Submit result | Context-bound task-agent; no explicit task selector | Existing semantics unchanged. |
| `review_task_result` | One delegated task review | Accept or request revision | `task_id` + decision | Existing semantics unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegate_task` | Yes | Yes | Low | Direct fields only. |
| Existing `delegate_tasks` | No | Partly | Medium | Remove. |
| `activateTask` | Yes | Yes | Low | Add/replace all-runnable activation for this path. |
| `submit_task_result` | Yes | Yes via context | Low | No change. |
| `review_task_result` | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Public delegation tool | `delegate_task` | Yes | Low | Replace `delegate_tasks`. |
| Service method | `delegateTask` | Yes | Low | Replace `delegateTasks`. |
| Input type | `DelegateTaskInput` | Yes | Low | Replace `DelegateTasksInput`. |
| Result type | `DelegateTaskResult` | Yes | Low | Replace `DelegateTasksResult`. |

## Applied Patterns (If Any)

- Thin facade: Native and MCP wrappers remain thin facades over the canonical manifest and lifecycle service.
- Scoped coordinator: Activation coordinator remains an internal coordinator for task-agent startup, but its public method becomes task-id-scoped.
- Strict parser: Public parser remains strict but descriptions become positive-only.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/` | Folder | Public task tool boundary | Tool contract, manifest, schema, parser, native wrappers | Existing public tool subsystem. | Lifecycle state transitions. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Task lifecycle owner | Ledger, service, activation, notification, settlement | Existing lifecycle subsystem. | Runtime-specific public schemas. |
| `autobyteus-server-ts/tests/e2e/runtime/` | Folder | Runtime E2E coverage | Real mixed-runtime task delegation E2E | Existing E2E location. | Service-only validation as substitute for E2E. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-tools/task-delegation` | Transport/Public Tool Boundary | Yes | Low | Keeps model-facing schemas separate from lifecycle state. |
| `src/agent-team-execution/task-delegation` | Main-Line Domain-Control | Yes | Low | Existing lifecycle owner remains correct. |
| `tests/e2e/runtime` | Validation | Yes | Low | Real runtime coverage belongs with runtime E2E tests. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tool input | `delegate_task({ member_name: "worker", description: "...", reference_files: [] })` | `delegate_tasks({ tasks: [{ member_name: "worker", description: "..." }] })` | Shows direct singular API. |
| Positive description | `Provide member_name, a complete task description, and optional reference_files.` | `Do not pass delegator, task_name, dependencies...` | Removes negative instruction noise. |
| Multi-task fan-out | Call `delegate_task` once for task A and once for task B. | One batch `tasks` array. | Matches independent task-agent result submission. |
| Activation scope | `activateTask(teamRun, created.taskId)` | `activateRunnableTasks(teamRun)` after each singular call | Prevents accidental activation of stale records. |
| E2E evidence | GraphQL/team websocket/runtime tool execution observing `delegate_task` and lifecycle events. | Parser/manifest/service unit tests only. | Enforces the user's real E2E requirement. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `delegate_tasks` alias | Would reduce test/docs churn. | Rejected | Replace public name with `delegate_task`; update all configured exposure/tests/docs. |
| Accept both direct fields and `tasks[]` | Would allow old calls. | Rejected | Parser accepts only direct singular fields. |
| Keep `delegateTasks` service method and adapt tool only | Would minimize lifecycle code changes. | Rejected | Rename lifecycle boundary to `delegateTask` so service matches domain. |
| Keep negative field-list guidance | Might warn against old/generated bad fields. | Rejected | Use positive-only field descriptions; strict parser handles actual invalid fields. |

## Derived Layering (If Useful)

- Tool boundary layer: public names/schemas/adapters.
- Lifecycle layer: service/ledger/activation/result-review/settlement.
- Validation/docs layer: tests and durable documentation.

The tool boundary depends on lifecycle; lifecycle does not depend on runtime-specific wrapper schemas.

## Migration / Refactor Sequence

1. Rename contract constants and public type maps from `DELEGATE_TASKS` / `delegate_tasks` to `DELEGATE_TASK` / `delegate_task`.
2. Replace `DelegateTasksInput` and `DelegateTasksResult` with singular `DelegateTaskInput` and `DelegateTaskResult` in `task-delegation-record.ts`.
3. Replace delegation parser/schema functions with direct singular versions.
4. Update the manifest entry description to positive-only singular wording and bind it to `service.delegateTask`.
5. Rename native wrapper file/class/function to singular and update registration.
6. Change `TaskDelegationToolService.delegateTasks` to `delegateTask`.
7. Change `TaskDelegationInputResolver.buildCreateInputs` to singular `buildCreateInput`.
8. Change `TaskDelegationService.delegateTasks` to `delegateTask`, creating one record and returning one direct result.
9. Replace activation coordinator all-runnable public entry with a scoped `activateTask(teamRun, taskId)` path; extract private shared helper if needed.
10. Update member runtime instructions, work-packet/docs references, and relevant docs to `delegate_task` and positive delegation input guidance.
11. Update unit/integration tests from batch calls to singular calls; add repeated-call coverage for independent multi-task delegation.
12. Update the real mixed runtime E2E to use `delegate_task` with direct JSON and prove activation/result/review lifecycle through actual runtime events.
13. Run focused unit/integration checks during implementation; downstream API/E2E must perform coverage investigation and real E2E execution evidence before delivery.

## Key Tradeoffs

- Removing batch makes the API cleaner and aligns with independent task-agent submission, but may require multiple tool calls for fan-out. This is accepted by requirement.
- Keeping websocket activation event arrays avoids broad client event schema churn, but leaves a small residual plural-shape artifact outside the tool contract.
- Scoped activation adds a small internal refactor but prevents singular calls from activating unrelated stale not-started records.

## Risks

- Broad exact string/test references to `delegate_tasks` may make the implementation larger than the core code change.
- Some model/runtime E2E environments require external flags/models (`RUN_MIXED_TASK_DELEGATION_E2E`, `RUN_CODEX_E2E`, LM Studio/Codex model availability). If unavailable, API/E2E cannot honestly satisfy FR-009 and must report a blocker rather than substituting mocks.
- If a runtime cannot issue repeated tool calls for fan-out in one turn, fan-out ergonomics may change. This is an accepted product/API tradeoff.

## Guidance For Implementation

- Keep `submit_task_result` and `review_task_result` behavior unchanged except doc/test references to creation.
- Use concise positive descriptions. Suggested tool description:
  - `Delegate one ready-to-run task to an exact logical team member. Provide member_name, a complete task description, and optional reference_files. The framework starts one task-agent for this task; the task-agent later submits its result with submit_task_result.`
- Suggested field descriptions:
  - `member_name`: `Exact logical team member/template name from the current team roster to receive this delegated task.`
  - `description`: `Complete ready-to-run work-packet body with objective, context, scope, constraints, done conditions, and expected output guidance.`
  - `reference_files`: `Optional file or artifact paths the task-agent should inspect.`
- Do not add a compatibility alias for `delegate_tasks`.
- Update docs and tests in the same change so no durable artifact teaches the old public contract.
- Downstream API/E2E validation must include the real runtime path, not only unit/integration tests.
