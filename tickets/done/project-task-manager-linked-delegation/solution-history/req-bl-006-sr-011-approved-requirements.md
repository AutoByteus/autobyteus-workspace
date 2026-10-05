# Requirements — Project Task Manager and Linked Delegation

## Document Status
- Package: `project-task-manager-linked-delegation`
- Status: **Approved — first-version scope**
- Current solution revision: `SR-011`; approved requirements baseline `REQ-BL-006` (2026-10-03)
- Owner: Solution Designer
- Approval reference / exact approved baseline: **SD-AP-001 (2026-10-03), REQ-BL-006 including DEC-001–006**. After the direct approval question, user said “Yeah, I guess so. Yeah, exactly. Let's use task ID”, conditional on system-wide uniqueness, with project_id+task_id only if IDs are not unique. E-020 verifies normal Task creation uses project_task_<UUID>, not Project-local IDs. Task-ID-only lookup must prove a unique node-local match and reject ambiguity. This satisfies the user's condition without silently selecting a Project. Earlier SD-CF-001–005 remain clarification references, not historical full approvals.
- Behavior-defining supplements: N/A. The supplied screenshot establishes current UI, not an approved redesign.
- Core confirmations SD-CF-001–005 and full approval SD-AP-001 authorize the first-version requirements below. The condition is resolved by normal UUID-based global Task identity plus explicit unique-match validation; if investigation demonstrates an actual supported Project-local Task-ID scheme, return a requirement recovery instead of silently introducing a composite input.
- Approval presentation: existing @/Chat Manager, Task-ID-only dispatch with saved text/files, exact fresh run linkage, full owned-runtime DONE cleanup with data/outside-run preservation, closed completed lifetime, unchanged no-ID delegation and deletion semantics. No behavior-defining supplements apply. Architecture design is now authorized; implementation requires the completed design and configured routing.


## Problem And Desired Outcome
Existing node-local Project Tasks have descriptions, saved context and TODO/IN_PROGRESS/DONE status, but no supplied Project Task Manager and no relationship to delegated Agent/Team executions. The user wants a manager to create or reuse a Task, delegate it to a worker Agent or Team, track it, and mark it DONE as the explicit resource-release boundary. The approved first version uses existing Chat/@, without Project-page chat.

Success means the exact business Task can be traced to the actual spawned execution, and completion releases that Task's owned execution resources without stopping its manager, enclosing organization or unrelated work. `DONE` is an intentional business decision, not inferred from an idle runtime or a worker's optimistic message.

## Relevant Current And Desired Behavior
Evidence IDs are defined in investigation-notes.md.

| ID | Kind | Scenarios | Current behavior | Approved desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Shared Agents can be invoked through existing Chat/@; supplied Project page has Tasks/Workspaces only. No shipped manager is registered. | Provide a reusable Project Task Manager; use ordinary Chat/@ first; no Project-page chat in this slice. | Existing Chat, Agent/Team/Org composition and Project routes. | E-001, E-007, E-009 |
| BEH-002 | Contract | SCN-001, SCN-002 | Three selected tools discover Projects, list Tasks, create or patch one Task. Creation returns Task identity. | Manager resolves an explicit Project, reuses an applicable Task or creates one, then uses its returned identity. Ask when Project/task selection is ambiguous. | Same-node scope, no implicit Project creation, existing context authoring. | E-002, E-003 |
| BEH-003 | Contract | SCN-002, SCN-004 | delegate_task accepts recipient_address, required description and optional absolute reference_files; strict parser rejects task_id. Each successful call spawns a fresh copy. | Permit a Project Task identity on delegation. Use task_id alone for linked dispatch; resolve its unique owning Project internally on the current node. Bind the specific new copy, not merely a reusable definition/address. No caller project_id is needed on delegate_task. | Unlinked delegation retains its existing contract and behavior. | E-004, E-005 |
| BEH-004 | System | SCN-002, SCN-003 | Saved context references include localPath when bytes are available; delegation accepts normalized absolute local files, not REST locators. | Linked dispatch by ID internally reads the saved Task description and attachment reference files, as confirmed in SD-CF-001; the worker still receives ordinary described work/files. No silent loss of required saved context. | Existing text/files, containment and source-file ownership. | E-003, E-005 |
| BEH-005 | Contract | SCN-002, SCN-004 | Spawn returns ingress target_agent_run_id; Team copy has its own TeamRun and coordinator AgentRun. No Project linkage is persisted. | Durable, queryable association between Project/Task and root + exact AgentRun or TeamRun, including the Team ingress identity. Failed dispatch must not appear as a successful assignment. | Fresh-copy semantics, exact run-ID follow-up, root boundaries. | E-004, E-006 |
| BEH-006 | System | SCN-002, SCN-005 | Status patches do not dispatch, assess, link or stop executions. | Manager explicitly sets IN_PROGRESS after dispatch succeeds and DONE after checking the requested outcome. DONE initiates scoped runtime cleanup for linked work. | Unlinked Tasks remain business metadata; no automatic completion assessment. | E-002, E-003, E-008 |
| BEH-007 | Operational | SCN-005, SCN-006 | Root lifecycle already shuts down quiet task executions after a grace period and can restore them on run-ID delivery. | Completion-driven release covers the assigned Agent/Team, Team members, collaborators brought in by any member, their recursively brought-in helpers and further task-owned delegations. Confirmed in SD-CF-002. It must not be mistaken for enclosing-root termination or history deletion. Completed execution lifetimes remain closed; explicit business Task reopening starts no runtime automatically (approved DEC-004). | Existing idle shutdown for unrelated/unlinked work and persisted conversation history. | E-006, E-008, E-010 |
| BEH-008 | User | SCN-007 | Task/Project deletion removes metadata and owned context, not runtime executions; status UI is read-only. | Preserve existing metadata/context deletion behavior and no automatic runtime cancellation; deletion is not the new completion mechanism. Retain already-recorded runtime association/history even if business metadata is explicitly deleted; no new deletion guard/workflow in this slice. | Existing deletion behavior for unlinked entities. | E-003, E-009 |
| BEH-009 | System/Contract | SCN-008–009 | New collaborators are admitted at enclosing Agent/Team/Org root scope, deduplicated by definition and reused run-wide. addedViaAgentRunId records first bring-in, not every later task user. | All runtime helpers created for a linked Task belong to its lifecycle cascade, even when hosted outside its physical Team subtree; new helper runtimes belong to the creating Task lifetime and must not become a shared runtime across independent Task lifetimes; existing outside runs are borrowed, not adopted into Task cleanup (approved DEC-006). | Existing no-linked-task root-wide collaboration remains; no stopping another active Task or existing unrelated run. | E-015–017 |

## Stakeholders, Actors, And Outcomes
| Actor | Responsibility / outcome | Constraint |
| --- | --- | --- |
| User | Select Project and ask for planning/execution; decide completion expectations and approve this basis. | No unapproved special UI or destructive cleanup. |
| Project Task Manager | Discover/create/reuse Tasks, delegate, follow exact worker run, assess outcome and explicitly update status. | Manager is not the worker copy and must remain available after Task completion. |
| Delegated Agent / Team | Execute the given work and report durable results. | Reusable definition/address is not the Task's assignment identity. |
| System | Preserve linkage, enforce scoped lifecycle and report actual dispatch/cleanup outcomes. | Business completion does not imply engineering acceptance, deletion, or provider-independent cleanup certainty. |

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenario IDs |
| --- | --- | --- |
| UC-001 | Invoke and converse with a Project Task Manager using the approved entry surface. | SCN-001 |
| UC-002 | Create/reuse a Project Task, dispatch linked work and trace its exact assignment. | SCN-002–004 |
| UC-003 | Explicit completion and safe release of linked execution work, including recursively brought-in helper Agents/Teams. | SCN-005–006, SCN-008–010 |
| UC-004 | Resolve lifecycle interaction with existing Task editing, deletion and reopening. | SCN-003, SCN-007 |

### Out Of Scope (Approved First Slice)
- Project-page embedded chat/panel, new assignment visualization or sidebar redesign; existing @/Chat is the first-slice entry.
- Scheduling, cron, unattended backlog polling/auto-dispatch, dependency graphs, batch tools, external issue trackers, new status vocabulary or automatic acceptance judgments.
- Project creation tools, attachment mutation agent tools, mobile Projects support, changing ENABLE_PROJECTS/default installation semantics.
- Deleting physical workspaces/git worktrees, output artifacts, conversations, run history or uploaded source files; any destructive expansion requires separate renewed user approval.
- New active-deletion blocking or delete-as-cancellation workflows; deletion keeps existing metadata/context semantics.
- Global rewriting of existing unlinked collaboration addressing/routing, or treating ordinary @ admission as fresh task-copy spawning. The approved Task-owned helper lifetime may require a bounded linked-Task admission/routing change; this is not a blanket collaboration redesign.

### Non-Goals
- Zero-latency cleanup across all providers; initiation is immediate, actual shutdown may take time and may fail.
- Proving arbitrary external processes/resources not owned by the execution framework were reclaimed.

### Preserved Boundary
BEH-001–009 preserve node/Project scoping, Task descriptions/context, exact run follow-up, unlinked execution behavior, default-off Projects UI, manager/root/sibling liveness and historical data. Existing manual Refresh remains read-only; no automatic board synchronization is proposed.

### Review Authority
Blocking technical corrections must protect the approved REQ/AC/BEH basis once approved. A new policy, migration obligation, compatibility guarantee, UI or destructive cleanup behavior is a Requirement Gap requiring user approval. Reviewer suggestions do not amend this proposed approval basis.

## Approved Requirements
| ID | Requirement | Behavior | Priority | Rationale / source |
| --- | --- | --- | --- | --- |
| REQ-001 | Ship a reusable Project Task Manager with Project discovery, Task tools, delegation/discovery and exact-run follow-up capability, invoked through existing @/Chat. No special Project-page chat in this slice. | BEH-001–002 | Must | User intake; E-007, E-009 |
| REQ-002 | Manager must establish the target Project explicitly, inspect existing Tasks, reuse when appropriate or create a new described TODO Task, and use the resulting identity rather than inventing IDs. | BEH-002 | Must | User intake; E-002–003 |
| REQ-003 | delegate_task supports two input modes without changing legacy no-ID delegation: (1) no task_id: caller supplies description and optional reference_files as before; (2) task_id present: caller supplies Task ID and recipient, system resolves the unique owning Project on the current node and loads saved Task payload; project_id is not an input required for linkage. Invalid/blank/unknown or ambiguously duplicated Task ID fails without fallback spawn. Linked mode rejects caller description/reference_files overrides rather than introducing a second payload authority. | BEH-003 | Must | User intake; E-004 |
| REQ-004 | Linked dispatch by Task ID must internally retrieve the saved description and attachment references and deliver them as the worker's work payload; the caller does not duplicate these fields. This source-of-work decision is confirmed in SD-CF-001/DEC-002. Proposed preservation/error details remain: use a dispatch-time snapshot, fail clearly on missing required bytes without a successful assignment, and do not silently mutate delivered work on later Task edits. | BEH-004 | Must | User clarification SD-CF-001; E-003, E-005, E-012 |
| REQ-005 | A successful linked delegation must durably identify the Task, collaboration root and exact worker AgentRun or TeamRun/coordinator ingress, and make the association inspectable through the existing Task reading tools. Address alone is insufficient. Failed dispatch reports failure and is not presented as an active successful assignment. | BEH-005 | Must | User wants connection; E-004, E-006 |
| REQ-006 | Manager must mark IN_PROGRESS only after successful delegation, follow up by returned ingress run ID, and set DONE only after checking the requested outcome. No implicit DONE on idle, error, shutdown or worker self-report. This is manager behavior, not a new role-based tool permission model. | BEH-006 | Must | User manager/status workflow; E-002, E-008 |
| REQ-007 | A committed explicit DONE update for a linked Task must immediately initiate cascading runtime shutdown/release: the directly assigned Agent or Team, all Team members, collaborators those workers bring in, recursively introduced helper Agents/Teams and task-owned further delegations. It must not stop the manager, enclosing collaboration root, unrelated/pre-existing non-task-owned runs or another active Task. Reusable definitions are retained even when their Task-owned runtime instances stop. Physical containment alone cannot narrow this requested cascade. The same Task service semantics must apply to supported status-writing surfaces. Unlinked DONE does not affect runtimes. | BEH-006–007, BEH-009 | Must | User completion cleanup goal and explicit cascade SD-CF-002; E-008, E-015–017 |
| REQ-008 | DONE cleanup releases Task-owned runtime resources only and preserves Task content/context, outputs, execution-tree records, conversations/history, physical workspaces and git worktrees. Intentional existing user deletion remains a separate operation with its current metadata/context consequences; DONE itself never deletes this durable data. | BEH-007 | Must | Proposed safe interpretation of “resources”; E-006, E-009 |
| REQ-009 | Repeated DONE and interrupted/failed cleanup must not falsely report successful release or stop unrelated work. The caller can distinguish recorded business completion from unfinished/failed resource cleanup and safely retry. | BEH-007 | Must | Needed observable outcome for requested cleanup, not an extra scheduler. |
| REQ-010 | Preserve delegate_task fresh-copy semantics: each successful linked call records its distinct execution, including multiple calls for the same open Task; do not overwrite earlier associations or impose a new one-assignment restriction. DONE closes the completed Task execution lifetime, prevents new owned work/late-message wake within it and releases all its owned executions. A DONE Task cannot be newly dispatched until explicitly reopened through its existing status update. Reopening starts/restores no runtime automatically; new delegation creates fresh runs in a new lifetime, retaining prior closed execution history. Completed prior lifetimes are not revived by run-ID messages. | BEH-005, BEH-007 | Must | Current delegation always spawns, including repeated calls; E-004, E-008 |
| REQ-011 | Preserve existing explicit Task/Project deletion semantics: remove metadata and owned context, not a hidden runtime shutdown; add no active-deletion block or cancellation workflow. Already-recorded assignment/execution history remains in durable runtime records. Users/Manager must mark DONE before deletion if they want Task completion cleanup; existing root Stop and idle resource lifecycle still apply independently. No deleted Task can be implicitly recreated by an unknown-ID status/link call. | BEH-008 | Must | Supported existing delete routes; E-003, E-009 |
| REQ-012 | The system associates every new runtime helper created for linked Task work with that Task lifetime, transitively and without Manager registration of individual helpers, including fresh delegated copies and new normal collaborator bring-ins. AgentRun/TeamRun identities—not definitions or timestamps—govern cleanup. Existing delegate_task copies are already independent (SD-CF-003); add no new isolation mechanism for those copies. Newly created Task-owned helpers must not become one live runtime shared across independent Task lifetimes. A pre-existing non-task-owned outside run may be consulted but is not adopted into the Task cleanup cascade merely because it was messaged. Preserve ordinary root-wide collaborator reuse for unlinked work. Runtime-instance lookup/placement realizing these approved lifetime constraints is an architecture decision, not a global collaboration rewrite. | BEH-009 | Must | SD-CF-002 cascade requirement; current root-wide reuse E-016–017 |

## Approved Acceptance Criteria
| ID | REQ | BEH / SCN | Trigger | Observable outcome / relevant alternate | Verification intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | 001–002 | 001–002 / 001 | Invoke manager in existing Chat/@ and name a Project. | Manager is discoverable, resolves correct node-local Project and reads Tasks; ambiguous Project prompts clarification rather than choosing arbitrarily. No new Project-page chat UI in this slice. | Definition/template and realistic Chat invocation; existing Projects preservation. |
| AC-002 | 002–003, 005–006 | 002–003, 005–006 / 002 | Ask manager to execute a new or existing Task. | Create/reuse Task → delegate exact ID → observe worker run/link → explicit IN_PROGRESS; description is not replaced by an ID. | Real tools/persistence/Agent and Team roots. |
| AC-003 | 004 | 004 / 002–003 | Linked Task with text and saved attachment. | Worker gets approved payload and readable intended files; later edits do not alter the delivered packet. Missing required bytes yield explicit failure, not a successful assignment. | Saved context bytes and real delegation admission. |
| AC-004 | 003, 005 | 003, 005 / 004 | Invalid/blank/unknown/ambiguous Task ID on the current node, a mixed saved-Task payload override request, or dispatch error. | No successful linked worker assignment, no implicit fallback spawn and no false IN_PROGRESS assertion. | Tool schema/native/MCP parity and failure checks. |
| AC-005 | 003 | 003 / 004 | Legacy no-ID description/reference_files delegation. | Existing fresh-copy, validation and result semantics unchanged. | Existing delegation suites plus preservation probes. |
| AC-006 | 005 | 005 / 002 | Read Task assignment after dispatch/restart. | Root and exact Agent/Team execution association remains inspectable; Team ingress and TeamRun are distinguished; existing unlinked data remains usable. | Public Task read tools and persisted reread/restart. |
| AC-007 | 006–008 | 006–007 / 005 | Manager verifies outcome and explicitly marks linked Task DONE. | Scoped runtime release begins without the idle grace delay; assigned workers/task-owned descendants stop; manager/root/other Task remain usable; content/context/outputs/history/workspaces remain. DONE alone is not proof that shutdown succeeded. | Real nested Agent/Team delegation and sibling activity, preservation checks. |
| AC-008 | 009 | 007 / 006 | DONE repeated, resources already idle/offline or cleanup fails. | No extra worker starts or unrelated stop; business status and actual cleanup outcome are reported truthfully; retry is safe. | Lifecycle failure/retry and actual state checks. |
| AC-009 | 010 | 005, 007 / 006 | Concurrent/repeated linked dispatch or follow-up after completion/reopen. | Each successful call for an open Task is a separate recorded copy; DONE releases all owned runs. New delegation for DONE is rejected; late messages cannot revive closed runs. Explicit reopen starts nothing automatically; subsequent delegation is fresh and retains previous history. | Concurrency, late input and root restart checks against the approved proposed outcome. |
| AC-010 | 011 | 008 / 007 | Delete a Task/Project with assignment. | Existing metadata/owned-context deletion is unchanged; no new runtime stop/guard is hidden in Delete. Durable runtime history/link records persist; unknown/deleted IDs fail rather than recreating business metadata. DONE-before-delete remains the requested completion path. | Existing deletion UI/API preservation plus durable run-history reread. |
| AC-011 | 007, 012 | 007, 009 / 008 | Task assigned to an Agent or Team; any member brings helper C; C brings helper D or a helper Team, which delegates further work; Manager sets DONE. | Every Task-owned member/helper/helper-Team member/further task execution is included in shutdown, even if hosted alongside the assigned run; no new helper can escape during shutdown. Manager/enclosing root/unrelated work remain usable. | Real agent-initiated send_message_to admission and multi-level delegation in Agent/Team/Org roots; check stop scope, no leaks and negative boundaries. |
| AC-012 | 007, 012 | 009 / 009 | Two independent Tasks use normal send_message_to(address) bring-in/reuse for the same root-wide collaborator, or contact an existing outside collaborator; not two delegate_task copies. | New helpers created for A and B have independent Task lifetimes even when definitions match; DONE A stops A-owned helpers, not B-owned runs or a pre-existing borrowed non-task-owned outside runtime. Unlinked ordinary collaborator reuse is unchanged. | Task-owned and borrowed collaborator bring-in/message paths, concurrent independent Tasks and unlinked preservation through public tools. |
| AC-013 | 003, 005, 007, 012 | 003, 005, 007 / 010 | Task A and Task B independently delegate to the same Agent/Team definition. | Each successful call creates its own fresh runtime AgentRun/TeamRun, with separate Task assignment; DONE for A stops A's owned cascade without stopping B's independent runs or deleting the definition. No new isolation policy is needed to achieve the existing fresh-copy distinction. | Existing fresh-copy contract plus future Task binding/scoped cleanup preservation. |

## Relevant Scenarios And Journeys
These are proposed product scenarios grounded in the request and existing supported surfaces. Their validity is not user approval.

| ID | Kind / actor | Goal, trigger and starting condition | Product-level sequence / outcome | Alternate / error | Validity / evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Manage tasks from Chat with an existing Project on the current node. | @ Manager → ask for planning/status → discover Project → inspect/create/update Tasks. | Ambiguous Project clarified; empty list is truthful. | Supported Normal Scenario, approved; intake + E-002, E-007, E-009. | 001–002 / 001 |
| SCN-002 | User/System | Start work on created/reused Task using delegation. | Manager obtains Task ID → selects Agent/Team → delegates linked work → exact worker begins → manager records IN_PROGRESS. | Failed dispatch does not claim work started. | Supported Normal Scenario, approved; intake + E-002, E-004–006. | 002–006 / 002–006 |
| SCN-003 | User/System | Execute saved Task context or edit an assigned Task through existing authoring paths. | Dispatch saved description/files automatically as confirmed in DEC-002; subsequent edit affects stored Task, not silently delivered instructions. | Missing required bytes reported, never dropped silently. | Supported Normal Scenario, approved; intake + E-003, E-009. | 004 / 003 |
| SCN-004 | Contract | Invoke delegate_task with or without linkage on an existing supported tool surface. | Validate scoped identity then dispatch linked work; no-ID calls still create fresh copies. | Unknown/ambiguous/invalid Task ID or mixed payload fails, not fallback; current node is the lookup boundary. | Supported Normal Scenario/explicit validation alternate, approved; E-004–005. | 003, 005 / 004–005 |
| SCN-005 | System/Manager | Requested work has reported results; manager decides Task is done. | Check outcome → update DONE → release assignment and task-owned descendants → retain durable records and unrelated work. | Active work can be cancelled by explicit completion; release failure is not success. | Supported Normal Scenario, approved; intake + E-006, E-008. | 006–008 / 007 |
| SCN-006 | Operational/Contract | Retry DONE, late worker message or reopen/restart after completion. | Apply REQ-009/010 completion/assignment/recovery rules; report actual cleanup state. | Unfinished cleanup retry; multiple calls stay fresh; new completed-lifetime admission fails; shutdown failures are reported for retry. | Supported Normal Scenario / explicit lifecycle alternate, approved REQ-009/010; existing idle/wake/restart behavior E-008 is supported, new completion semantics approved SD-AP-001. | 009–010 / 008–009 |
| SCN-007 | User | Existing delete Task/Project action after linkage exists. | Preserve ordinary metadata/context deletion, keeping runtime stop independent. | Delete is not completion; existing Stop/idle lifecycle remains independent. | Supported Normal Scenario, approved preserved existing delete contract E-003/E-009; no cancellation/guard scope added. | 011 / 010 |
| SCN-008 | System/Contract | User explicitly wants all cascaded helpers of Task execution stopped on completion; assigned Agent or Team members bring collaborators while working. | Worker/member brings C → C brings D/helper Team → helper delegates further work → Manager DONE stops complete Task-owned cascade. | Helpers may be hosted at enclosing root, not nested structurally; no escape during stop. Borrowed non-task-owned outside-instance protection is SCN-009. | Supported Normal Scenario, explicitly requested SD-CF-002; bring-in path E-016–017 supports current trigger, new cleanup outcome approved SD-AP-001. | 007, 012 / 011 |
| SCN-009 | System/Contract | Normal send_message_to(address) targets one root-wide collaborator runtime from multiple Tasks, or an existing outside run; distinct delegate_task copies are excluded from this sharing question. | Create Task-owned helper lifetime or consult outside runtime without adopting its ownership; completing a Task preserves unrelated active work. | First-bring-in provenance cannot be mistaken for all current ownership. | Supported Normal Scenario, approved Task ownership boundary from explicit cascade/independent-run intent plus current public admission/reuse E-016–017; detailed new ownership behavior approved in REQ-BL-006 / SD-AP-001. | 007, 012 / 012 |
| SCN-010 | System/Contract | Task A and Task B delegate to the same definition with separate delegate_task calls; user SD-CF-003 emphasizes resources are AgentRuns. | Each call creates a different runtime copy/ID; link each Task to its own copy; completion stops only its own cascade. | No sharing inferred from common definition/address. | Supported Normal Scenario, existing fresh-copy contract E-004 and user SD-CF-003; Task linkage/cleanup new, not implemented. | 003, 005, 007, 012 / 013 |

## UI, Interaction, And Experience Requirements
- Applicable: Existing invocation and failure/status feedback only through existing @/Chat; no approved new visual UI.
- Runnable Product prototype, repository, UI/UX spec, ticket, confirmed revision/final visual reference: **N/A — no Product Design request**.
- Supplied screenshot is current-state evidence at the absolute path in investigation-notes.md; not a target visual supplement.
- Use existing Chat and catalog discovery for Manager, existing Task board/manual Refresh for business status, existing tool reads for assignment details. Do not infer live board updates or a new assignment panel.
- Project-page embedded chat is explicitly deferred. Existing Chat/@ supplies the first-slice Manager entry.

## Quality And Non-Functional Requirements
| ID | REQ / AC | Area | Approved condition / verification |
| --- | --- | --- | --- |
| QR-001 | 003, 005, 007 / 004, 006–007 | Reliability / scoping | Project, root, run and task-owned cleanup boundaries remain exact; test independent sibling work. |
| QR-002 | 003–005 / 003–006 | Compatibility | Same observable linked/unlinked behavior through native and existing MCP projections; no new runtime/client introduced. |
| QR-003 | 008–009 / 007–008 | Data / operability | Preserve durable Task/result/history data; distinguish cleanup pending/failed from success; no zero-duration promise. |

## Data Continuity And Acceptable Loss
- Affected persisted data: Yes — new linkage/completion facts, alongside existing Projects, Task context and execution packages.
- Preserve: released Project/Task descriptions/status/files/IDs, existing run records/conversations, worker outputs, physical workspace/worktree files and other Task assignments.
- No prior Task-to-execution link is known; do not guess or retroactively bind an old Task by matching descriptions/addresses.
- Acceptable loss: only task-owned ephemeral runtime resources after explicit completion. No existing business/work data loss proposed.
- Volume, retention/privacy and downtime obligations: no new user constraints supplied; no capacity certification proposed. Production volume has not been inspected.
- Unknown: finalized persisted shape/transition and startup semantics. Architecture must investigate repository migration conventions after approval; no migration is prescribed by this proposed approval basis.

## External Contracts And Dependencies
| Contract | Preservation / proposed extension | Evidence / risk |
| --- | --- | --- |
| Native/MCP delegate_task | Keep no-ID calls; add optional scoped identity only once selected. | E-004–005; schema/results/LLM instructions must stay consistent. |
| Three Project tools | Keep explicit Project, create/patch distinction and read semantics; propose readable assignments and linked DONE effects. | E-002–003; current DONE explicitly has no runtime effect. |
| Chat @ collaborator admission | Use existing normal Agent entry, not a new execution UI. | E-007, E-009; no live Manager invocation has been performed. |
| Provider/root runtime lifecycle | Existing quiet shutdown/wake remains for unlinked work; linked completion must be distinct. | E-008; universal OS resource ownership is not established. |

## Supplemental Artifacts / Assumptions
No behavior-defining supplement. investigation-notes.md and source screenshot are evidence only. Earlier ASM-001 is now an explicit approved DEC-001 scope choice, not a hidden assumption. No behavior-defining assumptions remain outside the approval basis.

## Approved Final Scope Decisions
REQ-BL-006 including DEC-001–006 is approved by SD-AP-001; earlier limited clarification references do not imply prior approval.

| ID | Disposition | Authority / approval state |
| --- | --- | --- |
| DEC-001 | Ship normal reusable Manager through existing @/Chat; defer Project-page UI. | User initially suggested @; first-slice scope approved SD-AP-001. |
| DEC-002 | Linked mode uses **task_id alone**, plus recipient_address. System resolves exactly one owning Project on the current node, reads saved Task description/files and keeps resolved Project identity internally. No-task_id mode retains existing description/reference_files behavior. Reject invalid/unknown/ambiguous ID or mixed payload override; no silent fallback. Existing Project management tools still require explicit project_id; they are not changed by this delegate input simplification. | Saved source confirmed SD-CF-001; Task-ID-only feasibility/request SD-CF-005. Exact amended contract presented for approval; full basis approved SD-AP-001. |
| DEC-003 | Runtime-only cascading cleanup, no deletion of persistent work/history/context/workspaces. | SD-CF-002/003 discuss runtime resources; exact preservation approved SD-AP-001. |
| DEC-004 | No new one-assignment restriction: each linked call creates/records a fresh copy; close completed execution lifetime, prevent late wake, explicit Task reopen launches nothing, subsequent dispatch is fresh. | Preserve existing fresh-copy contract; exact completed-lifetime rule approved SD-AP-001. |
| DEC-005 | Preserve existing metadata/context Delete semantics; no active-deletion blocking or hidden delete-as-stop. Keep runtime history/associations; DONE-before-delete is the completion path. | Earlier invented guard proposal removed; scoped preservation approved SD-AP-001. |
| DEC-006 | Runtime helpers newly created for Task inherit its lifecycle; do not share one Task-owned runtime across independent lifetimes. Existing non-task-owned outside runs are borrowed, not owned; preserve unlinked run-wide reuse. No additional delegate_task copy isolation is needed. | Explicit user cascade/run-identity intent; complete ownership boundary included for approval; target mechanism deferred to architecture. |

- No unresolved behavior choice remains inside this approved first-version basis. Changes to intended behavior require renewed approval.
- Technical ownership lookup, storage placement/transition, root/provider stop coordination, admission fences and observable error/status representation remain architecture work; they cannot silently change these outcomes.

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| 001 | 001 | 001–002 | 001 | 001 |
| 002 | 001–002 | 002 | 001–002 | 001–002 |
| 003 | 002 | 003 | 002, 004–005 | 002, 004 |
| 004 | 002, 004 | 004 | 003 | 002–003 |
| 005 | 002 | 005 | 002, 004, 006 | 002, 004 |
| 006 | 002–003 | 006 | 002, 007 | 002, 005 |
| 007–008 | 003 | 006–007 | 007 | 005 |
| 009 | 003 | 007 | 008 | 006 |
| 010 | 002–003 | 005, 007 | 009 | 006 |
| 011 | 004 | 008 | 010 | 007 |
| 012 | 003 | 003, 009 | 011–013 | 008–010 |

## Architecture Phase Input
- After approval map SCN-001–010 to real Chat, Project tool, delegation and root lifecycle paths, keeping current factual evidence separate from target decisions.
- Verify node-wide Task-ID lookup uniquely resolves a current Project/Task; Project Task IDs are UUID-generated but current store has no global uniqueness validation. Do not invent cross-node lookup or silently choose the first duplicate.
- Verify root-scoped collaborator bring-in/reuse E-016–017 and actual helper ownership; Task cleanup is a lifecycle ownership cascade, not only a Team-subtree traversal. Do not use addedViaAgentRunId or creation time as proof of exclusive ongoing ownership.
- Verify linkage durability before first worker input, status-write/dispatch ordering, concurrency with DONE/delete/reopen, task-Agent-created follow-on delegation, Task Team nested work and root reopen/late message admission.
- Current feasibility evidence E-013 shows recursive Team termination; E-014 shows provider-specific termination/resource cleanup. Verify provider cleanup guarantees; distinguish TeamRun identity from coordinator ingress; do not assume the current containment chain is the full task-work ownership graph.
- Investigate persisted-data conventions before deciding migration, success/restore semantics or startup gating. Existing readers normalize recognized fields and may drop arbitrary linkage fields.
- Design-only DI-001 recovery is complete in design-spec.md SR-009 (Large/High), without changing this approved baseline. ARCH-REV-001 Pass covers SR-008 only; revised independent review is required before dependent implementation. Source implementation, API/E2E and delivery remain incomplete.

## Readiness Check
- Current behavior evidence-backed: Yes, source/docs/image; no new runtime validation claimed.
- Desired/preserved behavior and scope/non-goals: Yes; exact first-version basis approved SD-AP-001, prior clarifications retained distinctly.
- REQ/AC/scenario traceability: Yes. Earlier placeholder outcomes for AC-009/010/012 are replaced by observable proposed outcomes; original IDs/history preserved.
- Product/visual supplements: N/A; existing @/Chat, no Product request or new visual UI.
- Data continuity: Explicit; runtime cleanup preserves data, intentional existing user deletion remains distinct.
- Assumptions/remaining decisions: No material behavioral assumption hidden; technical mechanism deferred, all proposed policy boundaries included in approval basis.
- Content ready and approved: **Yes — REQ-BL-006 / SD-AP-001, SR-007**.
- Full user approval / exact approved basis ready for design: **Yes — SD-AP-001, conditional identity choice resolved by E-020**.
- Next action: Architecture complete in design-spec.md SR-009, classified Large/High. Route for independent re-review; unchanged REQ-BL-006 / SD-AP-001 needs no renewed approval for this technical recovery. Prior Pass does not cover revised private-preparation ownership; no implementation/validation completion claimed.
