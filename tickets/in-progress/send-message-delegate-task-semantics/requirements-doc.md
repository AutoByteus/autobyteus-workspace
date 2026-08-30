# Send Message vs Delegate Task Semantics — Requirements Document

## Document Status

- Status: `Ready for Approval`
- Current requirements revision ID: `RER-012`
- Request / ticket: Clarify and enforce the distinct orchestration semantics of `send_message_to` and `delegate_task`
- Requirements owner: Requirements Engineering
- Date: 2026-08-30
- Approval state and reference: User requested a dedicated collaboration contract with the exact proposed prompt and then asked that both tool schemas and descriptions be aligned with the clarified semantics on 2026-08-30. Contract `ATC-001` now contains exact prompt and tool-description copy and is ready for review; it encodes the recommended DEC-001 Option A. Explicit approval of the contract and complete intended behavior remains pending. Requirements visualizer `SMDS-RV-001` / `VIS-R04` remains available at `http://127.0.0.1:4179`.

## Problem And Desired Outcome

- Problem: Every Team-bound Agent is intrinsically exposed to both `send_message_to` and `delegate_task`. Current provider-shared guidance describes each tool in a separate sentence, but it does not explicitly state that `delegate_task` already delivers the work packet, that a subsequent logical-address message reaches the normal configured ingress rather than the new task execution, or that the same work must not be dispatched through both tools. Agents—especially planners/coordinators—can therefore create a dedicated task and then redundantly message the logical recipient as if the two calls were interchangeable halves of one assignment.
- Affected actors or systems: AgentTeam planners/coordinators, ordinary mounted Agent and AgentTeam recipients, fresh task Agent and task AgentTeam executions, provider-shared collaboration instructions, public tool descriptions, and task/message documentation and verification.
- Desired outcome: Give every Team-bound Agent one unambiguous intent-first decision rule: use `send_message_to` for ordinary communication with an already existing execution; use `delegate_task` once to create and fully instruct a fresh tracked task execution. Do not dispatch the same work through both. Preserve exact-run ordinary follow-up for genuinely additional clarification unless the user explicitly rejects that existing capability.
- Observable definition of success: Given representative ordinary-message, bounded-task, post-delegation clarification, failure, result-submission, and review scenarios, an Agent selects the correct operation and selector; one intended task assignment creates exactly one task execution; no redundant logical-address work message is sent; formal task state changes occur only through task lifecycle tools; and AutoByteus, Codex, and Claude receive the same semantics.

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Every Team-bound Agent receives `get_handoff_rules`, `send_message_to`, and `delegate_task` automatically. The provider-shared collaboration block gives one sentence to messaging and one to delegation. | Keep both capabilities available but add an explicit intent-first choice, non-interchangeability rule, and same-work duplicate-dispatch prohibition. | Standalone Agents remain outside intrinsic Team collaboration exposure. Provider-native tool manifests remain out-of-band capability contracts. | SRC-004, SRC-010–SRC-012 in `investigation-notes.md` |
| BEH-002 | System / Contract | `send_message_to(recipient_address)` resolves the canonical logical placement to its live configured Agent ingress; an AgentTeam address resolves through its configured coordinator. It delivers one ordinary message and creates no task record or task execution. | Describe this as communication with an existing mounted destination. State explicitly that it is not task creation, assignment tracking, result submission, review, or a fallback for failed delegation. | Exact active-run messaging through `target_agent_run_id`, ordinary message projection, and current success/failure envelopes remain unchanged. | SRC-005, SRC-006, SRC-012 |
| BEH-003 | System / Contract | `delegate_task(recipient_address, description, reference_files?)` creates one root-scoped task record and prepares one fresh task Agent or task AgentTeam execution. The complete work packet is delivered during activation. A successful result includes `task_id`, `status:"active"`, and the fresh ingress `target_agent_run_id`. | State explicitly that the delegation call itself assigns and delivers the work; the caller must not resend the same work packet through `send_message_to`. | One call creates one fresh execution; repeated independent or sequential tasks require separate delegation calls; activation failure remains `not_started`. | SRC-007–SRC-009 |
| BEH-004 | Contract | The current prompt does not explain that `recipient_address` after delegation still selects the configured logical ingress rather than the fresh task execution. The approved interaction contract permits genuine follow-up through the returned exact run ID. | For genuinely additional clarification after successful delegation, use `send_message_to(target_agent_run_id=returned ID)`. Never treat the original logical address as an alias for the fresh task execution, and never repeat the original packet. | Exact-run follow-up remains ordinary communication with no lifecycle effect; settled/inactive run IDs remain invalid. | SRC-003, SRC-005, SRC-006, SRC-008, SRC-009 |
| BEH-005 | Contract | `submit_task_result` and `review_task_result` exclusively own formal result/review transitions. A message whose content says “finished,” “accepted,” or “revise” has no task-lifecycle effect. | Keep this separation visible in the same decision guidance so messaging cannot be mistaken for task completion, revision, acceptance, or finalization. | Existing submission, review, notification, and settlement semantics remain unchanged. | SRC-002, SRC-003, SRC-013 |
| BEH-006 | Operational | The same collaboration instruction is composed centrally into AutoByteus, Codex, and Claude Team-member prompts, and shared tool descriptions flow through native/MCP adapters. Current parity tests pin the exact wording. | All Agent-facing provider projections must carry one semantically identical decision boundary and must not reintroduce provider-specific or definition-specific ambiguity. | One Addressing section and one Collaboration section, canonical absolute addresses, tool exposure, and provider parity remain. | SRC-004, SRC-010–SRC-012 |
| BEH-007 | Contract | Some repository docs still describe pre-current targeting restrictions or do not express the duplicate-dispatch distinction consistently. | Current authoritative docs, prompt guidance, tool descriptions, and verification must agree on the current runtime contract and the approved choice semantics. | No new tool alias, selector, lifecycle state, or compatibility path is introduced. | SRC-014 |
| BEH-008 | Contract | Successful Team message delivery internally resolves and returns the receiving configured AgentRun identity, but the public `send_message_to` result mapper currently discards it and exposes `result:null`. Successful `delegate_task` directly exposes `task_id`, `status:"active"`, and the fresh task ingress `target_agent_run_id`. | Public `send_message_to` output shall remove the uninformative `result` field and expose the exact accepting AgentRun as a flat top-level `target_agent_run_id`, so message and delegation feedback use the same direct identity field without dot notation. | A task Agent delegation returns its fresh AgentRun ID; a task AgentTeam delegation returns its fresh coordinator AgentRun ID, not the task TeamRun ID. A rejected message has no successful receiver identity and exposes `target_agent_run_id:null`. | SRC-023–SRC-027; DEC-002 Option A refined in RER-009 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Team planner / coordinator | Choose how to involve another Agent or AgentTeam | Can distinguish ordinary communication from creation of independently tracked work before calling either tool | Must not dispatch one work packet twice |
| Mounted Agent or AgentTeam coordinator | Receive ordinary communication in its existing execution | Receives only intended messages; is not mistaken for a newly created task execution | Logical-address delivery remains current configured-ingress delivery |
| Fresh task Agent or task AgentTeam coordinator | Own one delegated work packet and lifecycle | Receives complete task instructions exactly through delegation and can receive genuine additional clarification by exact run ID | Formal result/review uses task lifecycle tools |
| Runtime/provider integration owners | Project consistent Agent-facing contracts | AutoByteus, Codex, and Claude see identical decision semantics | No provider-specific forced tool policy is introduced |
| Product reviewer / user | Prevent orchestration confusion without losing useful capability unintentionally | Approves whether exact-run post-delegation clarification remains allowed | A blanket ban would reverse the existing approved interaction contract |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Send a fact, question, status update, or handoff to an already existing mounted Agent or AgentTeam without creating a tracked task.
- UC-002: Assign one bounded work packet to one fresh task Agent or task AgentTeam execution through exactly one `delegate_task` call.
- UC-003: Avoid an immediate or later `send_message_to(recipient_address)` call that repeats work already delivered by a successful delegation.
- UC-004: Send genuinely additional clarification to the exact live task execution by using the successful delegation result's `target_agent_run_id`.
- UC-005: Submit, accept, or request revision through the existing formal task lifecycle rather than message wording.
- UC-006: Handle `delegate_task` activation failure without silently converting tracked task intent into an ordinary message.
- UC-007: Apply the same semantic guidance to Agent and AgentTeam logical targets and across AutoByteus, Codex, and Claude Team-member runtimes.
- UC-008: Align authoritative tool descriptions, Team collaboration instruction, docs, and durable verification with the approved distinction.
- UC-009: On successful `send_message_to`, expose the exact existing receiving AgentRun ID as a flat top-level `target_agent_run_id` replacing the always-null public `result` field; on successful delegation, continue exposing the newly spawned task ingress AgentRun ID.

### Out Of Scope

- Changing `send_message_to` or `delegate_task` inputs, target resolution, persistence, routing, execution creation, task state, result/review, notification, or settlement behavior. The only approved output change is the narrow `send_message_to` replacement of always-null `result` with flat `target_agent_run_id` in REQ-014.
- Removing `send_message_to` or `delegate_task` from Team-bound Agents.
- A runtime heuristic that inspects message text and blocks calls merely because a task was recently delegated.
- A new combined “message or task” tool, automatic conversion between tools, provider-specific forced tool selection, or hidden fallback behavior.
- UI redesign, task-tree presentation changes, new task statuses, new data migration, or changes to AgentTeam topology/addressing.
- Global/cross-root communication or delegation policy.

### Non-Goals

- Preventing all ordinary messages before, during, or after a delegated task.
- Treating tool invocation timing as the governing distinction. “Synchronous” is not used as the canonical term because both operations are asynchronous at implementation boundaries and the product distinction is execution/lifecycle effect.
- Replacing authored Agent or Team instructions; the shared contract supplies a safe baseline that authored instructions must not contradict.
- Guaranteeing perfect model compliance solely through prose; deterministic contract verification and representative orchestration evidence remain required.

### Preserved Behavior Boundary

- Preserve BEH-001–BEH-006 current tool availability, selector shapes, logical and exact-run routing, fresh-execution creation, formal task lifecycle, and provider parity except for the clarified Agent-facing selection semantics.
- Preserve the existing rule that a Team address used for ordinary messaging enters through its configured coordinator, while the same Team address used for delegation creates a fresh task Team.
- Preserve the rule that a successful delegation returns the exact active task ingress run ID and that exact-run messaging has no task-lifecycle effect, subject to DEC-001 approval.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Requirements Engineer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Agent-facing collaboration guidance shall define `send_message_to` as ordinary delivery to an already existing Agent execution or AgentTeam coordinator ingress and shall state that it creates no task or task lifecycle. | BEH-001, BEH-002, BEH-006 | Must | Establishes the real-life “talk to the existing person” model without making an unsupported transport-timing claim. | User request; SRC-004–SRC-006 |
| REQ-002 | Agent-facing guidance shall define `delegate_task` as the single operation that spawns one fresh, independently tracked task Agent or task AgentTeam instance and delivers the complete task description and reference packet to that new execution. | BEH-001, BEH-003, BEH-006 | Must | Prevents the model from treating delegation as only task registration followed by a separate message and makes the separate execution identity intuitive. | User request; SRC-007–SRC-009, SRC-021–SRC-022 |
| REQ-003 | Guidance shall give an explicit primary-intent choice: use one ordinary message when the intent is communication; use one delegation when the intent is new bounded independently owned work. The same work packet shall not be dispatched through both tools. | BEH-001–BEH-004 | Must | Directly addresses the observed planner confusion. | User request; decision table |
| REQ-004 | After successful delegation, the original logical `recipient_address` shall not be described or used as an alias for the fresh task execution. Genuine additional clarification, when allowed by DEC-001, shall target the returned exact active `target_agent_run_id` and shall not repeat the original task packet. | BEH-002–BEH-004 | Must | Protects execution identity and avoids duplicate work reaching the mounted recipient. | Existing approved interaction contract; SRC-003, SRC-005, SRC-008, SRC-009 |
| REQ-005 | `send_message_to` shall not be presented as a task-result, revision, acceptance, finalization, or task-creation fallback. Formal task lifecycle outcomes shall continue through `submit_task_result` and `review_task_result`. | BEH-005 | Must | Free-form messages do not mutate task state. | SRC-002, SRC-003, SRC-013 |
| REQ-006 | If delegation returns `not_started`, Agent guidance shall not instruct or imply that sending the same packet through `send_message_to` is an equivalent success path. If the intent remains tracked work, the caller may correct the cause and make a new delegation attempt or report the failure. | BEH-002, BEH-003 | Must | Prevents silent semantic degradation from tracked work to untracked chat. | User intent; current failure contract |
| REQ-007 | The distinction shall cover both Agent and AgentTeam targets: logical-address messaging uses the mounted configured ingress, while delegation creates a fresh task execution whose ingress receives the task packet. | BEH-002–BEH-004 | Must | The confusion is especially material when a visible AgentTeam and its coordinator are both involved. | SRC-005, SRC-006, SRC-013 |
| REQ-008 | The approved distinction shall be semantically identical across AutoByteus, Codex, and Claude provider projections and across the shared collaboration block and public tool descriptions. | BEH-001, BEH-006 | Must | A coordinator must not learn different rules from provider or tool surface. | SRC-004, SRC-010–SRC-012 |
| REQ-009 | Authoritative documentation and verification shall not contradict the current absolute-address, universal same-root, exact-run, fresh-execution, and task-lifecycle contracts. | BEH-006, BEH-007 | Should | Stale adjacent wording can reintroduce the same confusion for maintainers and prompt authors. | SRC-014 |
| REQ-010 | The canonical distinction shall be expressed as existing-execution communication versus fresh task-execution creation/lifecycle, not as synchronous versus asynchronous transport timing. | BEH-002, BEH-003 | Must | The user's “synchronous” phrasing describes organizational intent; it is not established as an API timing contract. | User request; technical evidence |
| REQ-011 | No provider-specific forced-tool selection, hidden fallback, combined orchestration tool, message-text classifier, or automatic duplicate call shall be introduced to compensate for ambiguous guidance. | BEH-001, BEH-006 | Must | Keeps intended behavior explicit and avoids adding an unapproved orchestration policy. | Scope decision |
| REQ-012 | The collaboration block shall teach one intuitive two-mode mental model before selector or lifecycle detail: talk to an existing Agent/Team with `send_message_to`, or create a fresh task worker with `delegate_task`. It shall use plain, direct, parallel wording; keep each consequence and prohibition adjacent to the relevant tool; avoid internal requirement IDs, unresolved placeholders, and unexplained implementation jargon; and remain concise enough that the primary choice is immediately salient. | BEH-001–BEH-006 | Must | The system prompt is an LLM decision interface. Correct facts are insufficient if the model must infer the choice boundary from scattered or overly technical prose. | User clarification on 2026-08-30; SRC-020 |
| REQ-013 | Instance-creation wording shall use `spawned`, `fresh instance`, or an equally clear creation term. It shall not call delegation a `fork` unless the runtime actually copies the live recipient execution's conversation/history/state. The current contract shall instead explain that a new execution with new run identity is instantiated from the mounted Agent or AgentTeam definition. | BEH-002–BEH-004 | Must | `Spawned` reinforces separate identity without falsely implying inherited live execution state, which the current fresh-activation path does not provide. | User terminology question; SRC-021–SRC-022 |
| REQ-014 | Public `send_message_to` output shall replace the always-null top-level `result` field with a flat top-level `target_agent_run_id`. On success, the value shall be the exact receiving AgentRun ID: the resolved mounted Agent execution or mounted AgentTeam coordinator ingress for `recipient_address`, or the confirmed exact target for `target_agent_run_id`. On rejection, the value shall be `null`. Native and MCP projections shall be identical. | BEH-002, BEH-006, BEH-008 | Must | A direct identity field is simpler for an LLM and matches the field name returned by `delegate_task`; nesting it under `result` would add unnecessary dot notation while the current result envelope has no other payload users. | User clarification on 2026-08-30; DEC-002 Option A refined in RER-009; SRC-023–SRC-027 |
| REQ-015 | The collaboration block shall make all four `recipient_address` outcomes explicit in one concise contrast or an equally clear structure: message to Agent -> existing mounted Agent receives it; message to AgentTeam -> existing mounted Team coordinator receives it; delegate to Agent -> fresh task Agent instance is spawned and receives the packet; delegate to AgentTeam -> a fresh task AgentTeam instance/subtree is spawned and its fresh configured coordinator receives the packet. | BEH-002–BEH-004, BEH-008 | Must | Both tools accept the same logical selector, so the prompt must teach that the operation—not the address alone—determines whether the target is an existing configured ingress or a newly spawned task execution. | User clarification on 2026-08-30; SRC-026 |
| REQ-016 | The approved `send_message_to` and `delegate_task` result contracts shall be represented in authoritative machine-readable public types/schema validation and projected identically through native JSON, MCP text, and MCP structured content. Agent-facing tool descriptions shall state their returned identity semantics. Input schemas shall remain operation-specific rather than being made artificially identical. | BEH-001, BEH-003, BEH-006, BEH-008 | Must | Updating prompt prose without updating result schemas and tool metadata would leave the LLM with contradictory or unverifiable contracts. Current adapters expose input schemas but no declared output-schema field, so downstream architecture must establish the correct shared output-schema seam. | User schema question on 2026-08-30; SRC-029; ATC-001 |
| REQ-017 | The canonical `send_message_to` and `delegate_task` tool descriptions and relevant input-field descriptions shall explicitly repeat the existing-instance versus spawned-instance distinction, Agent versus AgentTeam coordinator behavior, complete-packet delivery rule, duplicate-dispatch prohibition, and returned identity semantics defined in `ATC-001`. Native and MCP tool catalogs shall project the same descriptions. | BEH-001–BEH-004, BEH-006, BEH-008 | Must | The LLM consumes tool descriptions at the moment of tool choice; leaving current terse descriptions unchanged would undermine the clarified system prompt and schema. | User clarification on 2026-08-30; SRC-030; ATC-001 exact tool descriptions |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001–REQ-003, REQ-010 | A Team-bound Agent receives the collaboration contract | The contract presents an explicit intent-first comparison: existing-execution communication -> `send_message_to`; fresh tracked work -> `delegate_task`; one work packet is not dispatched through both | The wording must not rely on “synchronous”/“asynchronous” as the distinction | Exact prompt/tool-contract assertion |
| AC-002 | REQ-001, REQ-003 | Scenario asks the Agent to tell a mounted reviewer that an artifact is ready, with no independent task/result lifecycle requested | The Agent uses one `send_message_to` call and creates no delegated task | Failure to deliver is reported as message failure, not converted into delegation automatically | Representative orchestration verification |
| AC-003 | REQ-002, REQ-003, REQ-007 | Scenario assigns a bounded review requiring independent ownership and reviewable output | The Agent uses exactly one `delegate_task` call with a complete description/reference packet and does not send the same packet through `send_message_to` | A second independent work item requires a separate delegation call | Representative orchestration verification plus task-event count |
| AC-004 | REQ-004, REQ-007 | Successful Agent or AgentTeam delegation returns an active exact ingress run ID, and later genuinely new clarification is needed | One `send_message_to(target_agent_run_id=returned ID)` reaches that exact task Agent or task Team coordinator and creates no new task | `send_message_to(recipient_address=original address)` is not treated as an alias for that task execution; inactive run ID is rejected without fallback | Contract/integration verification; subject to DEC-001 |
| AC-005 | REQ-002–REQ-004 | A delegation succeeds and no new clarification exists | The task work begins from the delegation packet alone; no immediate duplicate send is performed | None | Representative planner/coordinator verification |
| AC-006 | REQ-005 | An assignee has completed work or a delegator wants to accept/request revision | `submit_task_result` or `review_task_result` performs the lifecycle transition | A free-form message with equivalent words leaves task status unchanged | Existing lifecycle integration verification plus clarified prompt assertion |
| AC-007 | REQ-006 | Delegation returns `status:"not_started"` | No message call is represented as equivalent task activation; a corrected retry, explicit failure report, or normal stop occurs | No active task execution/run selector is assumed | Failure-path orchestration verification |
| AC-008 | REQ-007 | Same canonical AgentTeam address is used once for ordinary communication and once for delegation in separate scenarios | Message scenario reaches the mounted Team's configured ingress without new Team creation; delegation scenario creates one fresh task Team whose coordinator receives the packet | The two ingress executions are not conflated | Backend integration verification |
| AC-009 | REQ-008 | Equivalent Team-member contexts are composed for AutoByteus, Codex, and Claude | Each receives one semantically identical Addressing/Collaboration contract and matching tool descriptions | No provider supplies a contradictory legacy instruction or alternate decision rule | Provider parity tests |
| AC-010 | REQ-009 | Authoritative docs and tests are scanned after the change | Active docs and exact prompt/tool assertions agree with the approved semantic distinction and current selector/runtime behavior | Historical ticket evidence may remain historical when clearly marked; active contradictory guidance fails review | Documentation audit and targeted test review |
| AC-011 | REQ-011 | Approved guidance is implemented | Existing tool names, inputs, outputs, routing, task states, and exposure remain unchanged; no auto-classifier/combined tool/forced provider policy appears | Any proposed runtime prohibition or schema change returns as a requirement gap | Diff/contract review |
| AC-012 | REQ-001–REQ-005, REQ-012 | A Team-bound LLM receives only the collaboration block and representative ordinary-message, bounded-task, duplicate-dispatch, and task-lifecycle scenarios | From the block alone, the LLM can state the two modes, choose the correct tool, explain the execution/lifecycle consequence, and reject sending the same assignment through both; the visible prompt contains no internal decision IDs or unresolved placeholders | A prompt that is technically correct but requires inference across scattered paragraphs, leads to mixed-tool dispatch, or exposes requirements-process notation fails review | Exact-copy readability review plus representative configured-runtime evaluation |
| AC-013 | REQ-002, REQ-007, REQ-013 | The collaboration block describes delegation to an Agent and to an AgentTeam | The wording makes clear that each successful delegation spawns a separate fresh task instance with new concrete run identity from the selected definition, while the mounted existing instance remains distinct | The wording must not imply that the current mounted run's conversation, memory, or live state is cloned into the task instance | Exact prompt review plus task Agent/Team identity verification |
| AC-014 | REQ-001, REQ-007, REQ-008, REQ-014 | Logical Agent message, logical AgentTeam message, exact-run message, and rejected-message calls are executed through native and MCP projections | Each success output contains the exact accepting existing AgentRun in flat top-level `target_agent_run_id`; AgentTeam logical delivery identifies its configured coordinator ingress; native and MCP envelopes agree; no `result` field remains | Rejected delivery retains a typed failure and `target_agent_run_id:null`; no new task ID or task execution is implied | Contract/unit/integration tests plus provider-parity assertions |
| AC-015 | REQ-001–REQ-003, REQ-007, REQ-015 | A Team-bound LLM is asked to choose an operation for the same Agent address and the same AgentTeam address under message intent and independent-task intent | It predicts the correct four outcomes and identifies the exact packet receiver: mounted Agent, mounted Team coordinator, fresh task Agent, or fresh task Team coordinator respectively | It must not claim that messaging spawns a Team, that Team delegation spawns only a standalone Agent, or that the logical address becomes an alias for the new task execution | Exact-copy comprehension review and representative configured-runtime evaluation |
| AC-016 | REQ-008, REQ-014, REQ-016 | Public tool catalogs/types, native execution, MCP execution, docs, and tests are inspected after the change | One authoritative result contract describes flat message `target_agent_run_id` and existing delegate result unions; all projections match it and tool descriptions state the returned identity | A prose-only promise, native/MCP shape mismatch, retained message `result` field, or artificially unified input schema fails review | Schema/type inspection, serialization tests, MCP structured-content assertions, and documentation audit |
| AC-017 | REQ-008, REQ-012, REQ-015–REQ-017 | AutoByteus, Codex, and Claude receive the shared tool catalogs in equivalent Team-bound contexts | Each `send_message_to` and `delegate_task` description and relevant field description carries the ATC-001 semantics without contradiction or provider-specific omission | Terse legacy wording, missing Team coordinator behavior, missing return identity, or wording that permits duplicate dispatch fails review | Exact description parity assertions plus representative configured-runtime tool-choice evaluation |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Starting Condition | Steps Or Event Sequence | Expected Outcome | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Planner/coordinator | Existing mounted reviewer is available | Planner needs to announce a ready artifact -> sends one ordinary message | Existing reviewer receives message; no task is created | REQ-001, REQ-003; AC-002 |
| SCN-002 | Contract | Planner/coordinator | Mounted reviewer definition is task-capable | Planner needs an independent bounded review -> delegates one complete packet | One fresh task execution owns work; no duplicate logical-address send | REQ-002, REQ-003, REQ-007; AC-003, AC-005 |
| SCN-003 | Contract | Delegator | Task is active and returned exact run ID is known | New non-duplicative clarification arises -> delegator sends exact-run message | Exact task ingress receives clarification; task status remains active | REQ-004; AC-004 |
| SCN-004 | System | Task assignee and delegator | Task work has produced a result | Assignee submits result -> delegator accepts or requests revision | Formal lifecycle changes and notifications occur; free-form message is not a substitute | REQ-005; AC-006 |
| SCN-005 | Contract | Delegator | Task activation fails | Delegator observes `not_started` -> corrects/retries or reports failure | No ordinary message is misrepresented as a tracked assignment | REQ-006; AC-007 |
| SCN-006 | Contract | Planner/coordinator | Target is a mounted AgentTeam | Compare message intent with task intent | Message uses mounted coordinator ingress; delegation creates fresh task Team ingress | REQ-007; AC-008 |
| SCN-007 | Operational | Runtime/provider integrations | Equivalent Team-member context | Compose/expose contract for each provider | Same semantics and no duplicates/legacy alternatives across providers | REQ-008, REQ-009; AC-009, AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `No target product UI; Yes — interactive Requirements Visualization requested to clarify backend orchestration semantics`
- Linked UI/UX or interaction supplement: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/orchestration-decision-table.md`; `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-brief.md`
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: Requirements visualizer at `http://127.0.0.1:4179`; repository/root `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype`; source `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/visualizers/send-message-delegate-task-semantics`; review record `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-review.md`; final product prototype and final UI/UX specification are `N/A — not requested`
- Product prototype ticket record and folder (externally owned): `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/prototype-ticket.md`; `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics`
- Prototype revision or commit: Requirements visualizer `VIS-R04`; implementation revision `18099708a7bd1c1a4e390a8b62aea64a6af5ec39`; delivery revision `6ccdee22ebead86bc6727296aa211861eb162416`
- UI/UX user-confirmation reference: Requirements clarification decision pending; no final UI/UX approval applies
- Approved visual-reference baseline: `N/A — exploratory requirements visualization; references are evidence, not a normative final UI baseline`
- Normative visual and interaction details, including the approved final references: `N/A — not applicable`
- Explicitly illustrative fixture content or permitted implementation variation: Visualizer actors, addresses, IDs, packets, timing, motion, and in-browser state are deterministic illustrative fixtures; their intent/tool/selector relationships are proposed semantics pending approval.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: `N/A — the visualizer is explanatory evidence, not a production UI requirement`
- Explicitly unresolved product decisions: DEC-001

## Quality And Non-Functional Requirements

| Quality ID | Area (`Performance`/`Reliability`/`Security`/`Privacy`/`Accessibility`/`Compliance`/`Operability`/`Compatibility`/`Other`) | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Compatibility | Existing public tool names, inputs, selectors, routing, and task/message lifecycle effects remain unchanged. Output remains unchanged except for the approved `send_message_to` replacement of `result` with flat `target_agent_run_id` in REQ-014. | All three runtimes and Team-bound contexts | Contract/diff tests |
| QR-002 | Reliability | One bounded assignment scenario results in exactly one task activation and no redundant logical-address work delivery. | Representative planner/coordinator behavior | Task and message event evidence |
| QR-003 | Other | Provider-shared wording is semantically identical and appears exactly once per Team-member system prompt. | AutoByteus, Codex, Claude | Exact parity assertions |
| QR-004 | Operability | Active documentation contains no contradictory current guidance on relative/direct-child targeting or message-as-task behavior. | Current docs, excluding clearly historical ticket records | Documentation scan/review |
| QR-005 | Other | The collaboration block exposes the core two-mode choice before edge cases and is independently sufficient for the representative tool-choice scenarios in AC-012. | All Team-bound LLM prompts | Prompt readability review and configured-runtime evaluation |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: Existing TeamRun/task/message records, execution identities, run histories, and current lifecycle semantics.
- Loss, reset, rebuild, or regeneration that is acceptable: No persisted-data loss or reset is authorized. Prompt/tool-description test snapshots may be regenerated only to reflect the approved wording.
- Retention, privacy, compliance, volume, downtime, or operational constraints: N/A for this requirements change.
- Unknowns requiring downstream investigation: None material; architecture should verify whether any active generated documentation surface also consumes the shared descriptions.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Provider-shared Team collaboration instruction | One Addressing section and one Collaboration section with approved choice semantics | Current renderer/composer and parity tests | Exact future wording belongs to design/implementation, but semantic content is fixed by requirements |
| `send_message_to` public contract | Existing logical/exact-run selectors and ordinary-message-only effect remain | Shared tool contract/dispatcher and current runtime | Standalone exact-run messaging is adjacent and must not be accidentally narrowed |
| Task delegation public contract | One fresh execution, complete work packet, returned task ID/status/exact ingress ID, formal result/review | Shared manifest/service/record and approved interaction contract | Blanket prohibition of all later exact-run messages would conflict with this contract |
| Canonical absolute AgentTeam addressing | Both logical operations accept current valid same-root mounted addresses according to their own eligibility | Current resolver and approved universal delegation package | Some active docs appear stale and require alignment review |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/orchestration-decision-table.md` | Concise normative intent/tool/selector decision aid with positive and negative examples | REQ-001–REQ-007, REQ-010; AC-001–AC-008 | Proposed | Behavior-defining; included in user approval basis |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/agent-team-collaboration-contract.md` | Consolidate the normative four-case identity matrix, flat tool-result contracts, schemas, exact tool descriptions, invariants, and exact proposed provider-shared prompt | REQ-001–REQ-017; AC-001–AC-017; DEC-001–DEC-002 | Proposed — Ready for User Approval | Behavior-defining; primary exact-copy approval supplement |
| `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-brief.md` | Focus the exploratory visualizer on the existing-execution versus fresh-task-execution model and DEC-001 | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Delivered to Product Design & Prototyping | Requirements-owned request brief; not a final UI/UX specification |
| `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/requirements-visualization-review.md` | Record the Product-owned `VIS-R04` review package, covered scenarios, motion behavior, evidence limits, and open decision | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Ready for user review | Exploratory evidence only; it does not itself approve DEC-001 or define final UI/UX |
| `/home/autobyteus/workspace/send-message-delegate-task-semantics-prototype/tickets/in-progress/send-message-delegate-task-semantics/visual-references` | Provide durable screenshots of the explanatory states | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Available | Supporting visualization evidence; non-normative for implementation UI |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The observed bad sequence is delegation followed by a redundant same-work message to the logical recipient, not a request to abolish all genuine exact-run clarification. | This interpretation reconciles the user analogy with the existing explicit interaction contract. | User decides DEC-001 | Pending |
| ASM-002 | The word “synchronous” in the request describes talking to an existing organizational participant, not a required blocking API timing guarantee. | Current implementations are asynchronous and no transport timing change was requested. | User approval of REQ-010 | Pending |
| ASM-003 | Clarifying shared guidance/tool descriptions is the authorized product change; runtime lifecycle and schemas remain correct. | Static evidence shows current backend behavior already distinguishes the operations. | Downstream architecture/code investigation; user approval | Supported / awaiting approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | After a successful delegation, should genuinely additional ordinary clarification to that exact fresh task execution remain allowed through the returned `target_agent_run_id`? | The existing approved interaction contract explicitly supports it. A blanket “never send after delegate” rule would remove useful bidirectional communication and materially change scope; the observed problem appears to be duplicate dispatch to the logical recipient. | **Option A (recommended):** preserve exact-run clarification, forbid repeating the packet or messaging the logical address as task alias. **Option B:** prohibit delegator-to-assignee ordinary follow-up entirely and rely only on task packet/result-review lifecycle, requiring a broader behavior revision. | User | Open |
| DEC-002 | Should public `send_message_to` output expose the exact existing receiving AgentRun as `target_agent_run_id`, aligning its feedback with the fresh task ingress ID returned by `delegate_task`? | The backend already resolves and carries the receiving AgentRun ID for Team delivery, while the current public `result` field is always null and is used only by this message tool envelope. | **Selected Option A, refined:** replace `result` with flat top-level `target_agent_run_id`; for an AgentTeam logical address this is its configured coordinator ingress. A rejection returns `target_agent_run_id:null`. Rejected alternatives were preserving `result:null` or nesting the ID under `result`. | User | Decided 2026-08-30 — flat field confirmed in RER-009; captured in REQ-014 and AC-014 |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001, BEH-002, BEH-006 | AC-001, AC-002 | SCN-001, SCN-007 | Decision table; VIS-R04 message scene |
| REQ-002 | BEH-001, BEH-003, BEH-006 | AC-001, AC-003, AC-005 | SCN-002 | Decision table; VIS-R04 delegation scene |
| REQ-003 | BEH-001–BEH-004 | AC-001–AC-003, AC-005 | SCN-001, SCN-002 | Decision table; VIS-R04 duplicate-dispatch scene |
| REQ-004 | BEH-002–BEH-004 | AC-004, AC-005 | SCN-002, SCN-003 | Decision table; approved interaction contract; VIS-R04 Option A/B comparison |
| REQ-005 | BEH-005 | AC-006 | SCN-004 | Decision table; current lifecycle docs |
| REQ-006 | BEH-002, BEH-003 | AC-007 | SCN-005 | Decision table |
| REQ-007 | BEH-002–BEH-004 | AC-003, AC-004, AC-008 | SCN-002, SCN-006 | Decision table |
| REQ-008 | BEH-001, BEH-006 | AC-009 | SCN-007 | Current parity test evidence |
| REQ-009 | BEH-006, BEH-007 | AC-010 | SCN-007 | Investigation notes |
| REQ-010 | BEH-002, BEH-003 | AC-001 | SCN-001–SCN-003 | Decision table terminology guardrail |
| REQ-011 | BEH-001, BEH-006 | AC-011 | SCN-007 | Scope guardrail |
| REQ-012 | BEH-001–BEH-006 | AC-001–AC-006, AC-012 | SCN-001–SCN-007 | User clarity direction; decision table; VIS-R04 cognition-first actor story |
| REQ-013 | BEH-002–BEH-004 | AC-003, AC-005, AC-008, AC-013 | SCN-002, SCN-006 | Fresh Agent activation and fresh Team-subtree materialization evidence |
| REQ-014 | BEH-002, BEH-006, BEH-008 | AC-002, AC-008, AC-009, AC-014 | SCN-001, SCN-006, SCN-007 | Public/internal send-result trace; DEC-002 Option A |
| REQ-015 | BEH-002–BEH-004, BEH-008 | AC-002, AC-003, AC-008, AC-015 | SCN-001, SCN-002, SCN-006 | Task Agent/Team preparation and configured-ingress delivery trace |
| REQ-016 | BEH-001, BEH-003, BEH-006, BEH-008 | AC-009, AC-010, AC-014, AC-016 | SCN-001–SCN-007 | ATC-001 schema projection requirements; current adapter/type inventory |
| REQ-017 | BEH-001–BEH-004, BEH-006, BEH-008 | AC-001, AC-009, AC-012, AC-015–AC-017 | SCN-001–SCN-007 | ATC-001 exact tool descriptions and field-description semantics |

## Downstream Architecture Input

- Product and system constraints architecture must preserve: Existing tool contracts and lifecycle except for the approved narrow message-output replacement of `result` with flat `target_agent_run_id`; one semantic contract across providers; logical-address messaging selects configured ingress; delegation creates a fresh execution and already delivers the packet; exact-run clarification is preserved if DEC-001 selects Option A; no hidden fallback or duplicate-dispatch automation.
- Decisions intentionally deferred to architecture design: The exact authoritative source(s) for wording, how to minimize duplication across prompt and tool descriptions, and the proportional verification/evaluation strategy.
- Technical facts architecture should verify: All active provider surfaces consume the shared composer/descriptions; no runtime-specific prompt augmentation contradicts them; current docs that mention relative/direct-child restrictions are current or stale; successful delegation result exposure consistently includes `target_agent_run_id`.
- Known feasibility or integration risks: Overlong prompt text can reduce salience; updating only the system prompt but not tool descriptions can leave conflicting cues; representative live-model compliance is probabilistic, so deterministic contract tests alone do not prove behavioral improvement.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes — VIS-R04 is linked as exploratory clarification evidence; it is not treated as a final UI/UX specification or approval`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `No`
- Architecture-ready: `No`
- Remaining blocker: Explicit user approval or revision feedback for contract `ATC-001`, including its recommended exact-run clarification rule, and the complete intended behavior package.
