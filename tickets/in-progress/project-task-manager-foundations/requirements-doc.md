# Requirements Document — Project Task Manager Foundations

## Document Status
- Package: `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`.
- Status: **Ready for Approval — proposed bounded tools/UI baseline**. Current solution revision: `SR-004`. Date: 2026-10-02. Owner: Solution Designer.
- Complete requirements approval: **not received**. No architecture or production implementation authorization.
- Approved subset: Product-owned Projects/Tasks manual-authoring, board and detail UI. UF-017: “the ui is good now. now i confirm the ui is good. continue”, 2026-10-02, recorded in `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-brainstorm-record.md`. This releases UF-004's Product-first handoff gate; it does not approve Manager/orchestration policies or all REQ/ACs.
- Exact approved UI basis: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and its ticket-scoped VIS-001–020 references, runnable UI revision `84ed47bac6877e2cdc6350cca789b0c30ffb55a3`; final integrated artifact receipt `f66efa9c5c1d9976137f6c134120529466b34e48`. Product owns that specification; this document links it without establishing a competing visual specification.
- Current scope authority: user clarifications SD-CF-001–004 (2026-10-02), recorded in investigation-notes.md E-023–025. User creates the Manager/team in the agents repository, outside this ticket. Deliver task tools plus previously approved Projects/Tasks UI updates; reuse existing delegation. Left-side workspace/run-history redesign and new resource-stopping behavior are deferred. Earlier proposed Manager/dispatch/scheduler deliverables are not active requirements. Complete refined baseline approval remains pending; do not infer it from a scope clarification alone.

## Problem And Desired Outcome
Projects already persist manually authored Tasks, but agents lack first-party tools to discover/read/create them and explicitly move their business status to In Progress or Done.

This ticket provides those tools, usable by a Project Task Manager **created by the user separately**, plus the previously approved small Projects/Tasks UI updates. Existing `list_available_agents`, `delegate_task` and `send_message_to` are reused unchanged; no new Manager/team package, launch experience or delegation system is delivered here. Projects remains experimental/default-off, with the user's installation untouched.

Observable target: a configured agent finds an existing Project and its Tasks, creates a durable description-only TODO Task, explicitly changes its state to IN_PROGRESS/DONE, and reads the saved state. The approved manual Projects/Tasks UI remains usable and presents current fetched task data. A business Done write does not implicitly stop runtime resources, delete history or certify delegated results. The caller's Manager workflow is external to this ticket.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Evidence-backed current behavior | Intended behavior / approval boundary | Preserved boundary | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | ENABLE_PROJECTS defaults false and gates visibility, not existing server CRUD | Proposed continuity: retain that visibility-only contract; selected task tools do not toggle the flag and remain explicit opt-in | Installation/default untouched; no hidden auto-enable or new existing-API gate | E-005,024 |
| BEH-002 | User/System | SCN-002,006,009 | User creates/reads/edits/deletes description-only Tasks; create→TODO; no status operation | Manager reads/creates durable tasks and progresses them (draft); manual New/Edit/Detail pages and create-to-board return approved via external UI supplement | Existing task IDs/content, required description, manual authoring and node scoping | E-003,004,010,018 |
| BEH-003 | System | SCN-003 | Opt-in list_available_agents lists eligible shared agents/teams | Manager uses returned eligible addresses to choose collaborators | Discovery read-only; no hardcoded invented addresses; Org not a delegation target via this catalog | E-006,008 |
| BEH-004 | System | SCN-003,004 | delegate_task starts fresh execution, returns exact run identity and supports independent copies | Preserve existing delegation; no new Project Task dispatch/attempt integration in this slice | Task identity remains separate; no new stop/link/scheduler promises | E-009,025 |
| BEH-005 | User/System | SCN-005,006,008,009 | Board and execution tree exist separately; no agent-write refresh; primary authoring uses overlays | Approved manual board-only/page-based authoring and detail per external supplement; managed waiting/execution/result visibility remains draft | Simple full-width Project experience, three read-only business status groups and authoring semantics; no unrelated shell redesign | E-010,013,018–021 |
| BEH-006 | System | SCN-002,005 | No agent-facing Project Task read/create/status tools | Tools usable by any appropriately configured agent; user authors Manager/team externally | No hardcoded Manager role, package, launch or completion assessor | User SD-CF-001/004; E-024 |
| BEH-007 | User | SCN-008 | Existing Project workspace links are authored separately from initial Project creation | Optional multiple workspace links/descriptions in the same simple New/Edit form (approved UI); real New folder action undecided | Optional links; unlink/removing a draft does not imply deletion of files | E-010,018 |
| BEH-008 | User | SCN-009 | Existing Task authoring is text-only | Approved editable voice-to-text and saved-context presentation; production capture, durable files/access/retention still draft | Required description; failure leaves typed text intact; no raw-audio/file-only scope inferred | E-018,020,021 |

## Stakeholders, Actors, And Outcomes
| Actor | Responsibility/outcome | Constraint |
| --- | --- | --- |
| User / project owner | Gives goals, sees task/execution outcomes, decides UI and intended behavior | Feature remains experimental; explicit approval required |
| Project Task Manager | Task decomposition, collaborator choice, dependency-aware coordination and progress | Not a second software-engineering authority; no fabricated completion |
| Delegated Agent/Team | Performs scoped work and returns results | Existing specialist gates and exact execution identity preserved |
| Operator | Enables experimental behavior intentionally | Off by default; flag behavior for tools must be explicit |

## Scope Guardrail (Mandatory)
### Use-case scope and dispositions
| ID | Use case / disposition | Scenarios |
| --- | --- | --- |
| UC-001 | Preserve experimental default-off and durable data | SCN-001,006 |
| UC-002 | Selected agents discover/read Project Task context, create Tasks and explicitly change business status | SCN-002,005 |
| UC-003 | Preserve and reuse existing discovery/delegation contracts, without extending them | SCN-003 |
| UC-004 | External/deferred dependency orchestration; no new scheduler | SCN-004 |
| UC-005 | New managed sidebar/execution presentation deferred; manual UI retained under UC-007 | SCN-005 |
| UC-006 | Excluded public Manager/team creation, user-owned in agents repository | SCN-002,003 |
| UC-007 | Deliver the previously approved Projects/Tasks manual authoring/board/detail UI updates | SCN-006,008,009 |
UC-004 (dependency orchestration) is external Manager behavior, not a new scheduler here. UC-005's new workspace/run-history/execution presentation is deferred; manual Task presentation is governed by UC-007. UC-006 (public Manager/team creation) is **excluded by the user**, who owns it in the agents repository. Stable IDs remain for history, not new deliverables.

### Out of scope / explicit deferrals
- Creating/configuring/publishing the Project Task Manager or management Team; changes in the public agents repository.
- Manager launch/tab/chat/context/reuse design; new dependency scheduler, automatic assignment, dispatch/retry machinery or durable task-to-execution/attempt history.
- Left-side workspace/run-history redesign: user explicitly deferred this new Product brainstorming request. No new Product handoff is needed now.
- New automatic resource stopping/cleanup on Task Done. Existing runtime idle/Stop/restore/history behavior remains unchanged; business status is not execution liveness.
- Enabling the user's Projects feature, removing the flag, global modal removal, phone delivery, release/deployment in this phase.
- Reintroducing retired execution task-plan tools; replacing collaboration/Team gates; automatic scheduling, notifications, due dates, labels or enterprise ACL policy.

### Preserved behavior and approval
Preserve valid Projects/tasks/workspace links, node scoping, task identities and unrelated run history. Manual UI uses the exact externally owned UF-017-approved supplement; deferring the **left-side** redesign does not revoke this approval or defer the explicitly retained Projects/Tasks updates. No task deletion, artifact deletion, directory deletion or runtime termination is inferred from Done.

Explicit scope and manual UI approval are recorded. Detailed tool/error/exposure and real authoring contracts must be complete and explicitly approved before architecture. New policy/migration/behavior proposals need user approval; no downstream reviewer may expand this boundary.

## Requirements
Source categories distinguish explicit request, inherited preserved context and proposed completeness requirements. Priority is not approval.

| ID | Requirement / approval boundary | Behavior | Priority | Rationale / authority |
| --- | --- | --- | --- | --- |
| REQ-001 | Keep ENABLE_PROJECTS default false, installation untouched and existing visibility-only flag semantics. Opted-in tools do not enable Projects or change existing CRUD reachability; no new backend flag gate is proposed. | BEH-001 | Must, proposed contract | Preserve current behavior E-005/024; exact extension policy included in approval request |
| REQ-002 | Provide agent-facing Project/Task lookup and reads, plus durable Task creation in an identified Project, with stable IDs, required trimmed description and initial TODO. Reads let an externally authored Manager discover relevant Tasks without relying only on conversation. | BEH-002 | Must | Explicit tool foundation; read/find clarified by user SD-CF-002 |
| REQ-003 | Selected agents can explicitly set a scoped Task to TODO, IN_PROGRESS or DONE, without enforcing a Manager-specific workflow. Reapplying the current status succeeds without changing content/identity; invalid status/unknown Project or Task fails without unrelated writes. Done never stops resources or deletes task/history/context. | BEH-002,006 | Must, proposed contract | User requested progress/done; generic existing-state setter permits explicit reset/reopen, not automatic scheduling; SD-CF-004 |
| REQ-004 | Preserve existing list_available_agents, delegate_task and send_message_to contracts/exposure; callers reuse them for collaboration. No new delegation tool or Manager configuration delivered here. | BEH-003,004 | Preserved | User SD-CF-001; E-006–009 |
| REQ-005 | Deferred: task-to-execution/attempt association and dispatch/retry integration are not first-slice deliverables. Project Task and execution identity remain distinct. | BEH-004 | Deferred | Earlier proposal preserved by ID; SD-CF-003/004 tools-first scope |
| REQ-006 | External Manager responsibility, not this ticket: decomposition/dependency planning/parallel delegation. Existing delegate_task remains capable of fresh parallel copies; no new scheduler or dependency-enforcement schema is implied. | BEH-004,006 | Out of scope | SD-CF-001–004 clarify tool foundation vs user-authored Manager |
| REQ-007 | Implement the approved manual Projects/Tasks UI supplement and VIS-001–020. New left-side workspace/run-history/task-execution presentation, Manager entry and automatic runtime cleanup are deferred; no new widgets or columns inferred. | BEH-005 | Must, approved UI subset | UF-017 and SD-CF-004 explicitly retain previous small UI updates |
| REQ-008 | Excluded: Project Task Manager/team creation, configuration and publication belong to the user in the agents repository, not this ticket. | BEH-006 | Out of scope | Explicit SD-CF-001; do not ask standalone-vs-Team again |
| REQ-009 | Preserve existing Projects, workspace links, Task identities/content/status and unrelated run history; keep manual CRUD usable through the approved page-based UI. Preserve destructive confirmation safeguards; Project deletion copy must describe all Tasks deleted, not just open Tasks. Active-work deletion/cancellation/retention remains undecided. | BEH-001,002,005 | Must | Data/authoring continuity and UF-017 UI; known count gap E-010/018 is not approved behavior; DEC-009 |
| REQ-010 | Provide consistent selected first-party Project/Task read/create/status capabilities in native and Agent Tools MCP runtimes, available through normal tool selection rather than forced on unrelated agents. Do not introduce a Manager-only permission role or bypass existing runtime/node boundaries. | BEH-002,006 | Must, proposed contract | User MCP comparison; existing native/MCP selectable discovery pattern E-007/008/024 |
| REQ-011 | Preserve approved optional multiple workspace links/descriptions during Project create/edit in the same Existing workspace/New folder direct form. New folder inherits current workspace registration/path normalization, not actual directory creation or a new filesystem permission policy. Successful Project save contains intended links/descriptions; errors remain truthful. | BEH-005,007 | Must, approved UI + proposed continuity | UF-017/PFI-002; existing registration semantics E-026 |
| REQ-012 | Preserve required trimmed multiline Task description, stable identity and status while using approved New/Edit/Detail pages, create-to-full-board return, search/Cancel behavior, simple continuous three-column board and non-actionable success feedback. Detailed visual/interaction requirements are externally owned. | BEH-002,005 | Must, UI approved | UF-017/PFI-003–006; external UXJ-003/004; no status mutation/dispatch inferred from authoring |
| REQ-013 | Task voice input uses existing optional desktop Voice Input availability/settings/permission/local transcription behavior, returning editable description text with no auto-save/send/install or retained raw audio. Unavailable/denied/failed/no-speech capture leaves typed text usable and unchanged; pending capture/transcription blocks save. No cloud/browser speech provider is added. | BEH-008 | Must, approved interaction + proposed continuity | UF-017/PFI-007; current extension/capture behavior E-026; no new runtime lifecycle feature |
| REQ-014 | Saved Task context files are durable on the selected node, scoped to the Project/Task rather than a fabricated AgentRun, readable from saved Task read/edit/tool context and optionally previewed inline. Inherit current context-upload MIME restrictions, 25 MiB per-file limit, validation and draft/final separation. Cancel preserves saved context; explicit Remove/Delete may remove Task-owned copies/references, never original workspace files or unrelated histories. Done retains context. Required description remains; no file-only Task or raw voice recording retention. | BEH-008,002 | Must, approved interaction + proposed durable behavior | UF-017/PFI-007; existing upload constraints E-026; task ownership mechanism is design, not an invented runtime |

## Acceptance Criteria
Full production acceptance is **not approved or passed**. Manual UI obligations below inherit UF-017 only within the external supplement. Decision-dependent rows require refinement before complete approval. Product FV/PI/test results validate the synthetic prototype, not production AC completion.

| ID | REQs | Behavior/scenario | Trigger | Observable expected outcome | Alternate/error | Verification intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001,009 | BEH-001 / SCN-001,006 | Fresh test-owned node; feature disabled | Default remains false; Project UI stays inaccessible; data retained; new-tool policy matches DEC-001 | No implicit enable on package import or manager launch | Capability/API/tool-exposure/browser checks |
| AC-002 | 002 | BEH-002,006 / SCN-002 | Manager lists context, creates a task | Stable project/task identity; required trimmed description; TODO; readable again after manager conversation reload | Empty description/unknown Project fails without task creation | Service + native/MCP API journey |
| AC-003 | 003 | BEH-002,006 / SCN-005 | Selected agent sets one identified Task status | Valid existing status is persisted/readable; ID/description/createdAt unchanged, updatedAt changes only for meaningful change; same-state retry succeeds | Invalid status/mismatched Project/Task changes nothing; no stop/spawn/delete side effects; explicit reset/reopen allowed, no enforced workflow | Service/native/MCP/read + data-preservation and no-runtime-effects checks |
| AC-004 | 004 | BEH-003 / SCN-003 | Software Engineering Team is installed shared/eligible | list_available_agents includes its name/kind/address; manager uses returned address | Missing/unrunnable team is surfaced, not invented | Discovery/delegation API integration |
| AC-005 | 005 | BEH-004 / SCN-003 | Historical task/attempt linkage proposal | Deferred; not a tool-first acceptance gate | No successful Task create/status write claims delegation success | No new dispatch/linkage test requirement in this slice |
| AC-006 | 004,006 | BEH-004 / SCN-004 | Historical Manager parallelization proposal | Existing general parallel-copy semantics preserved, not newly implemented here | No scheduler/resource-capacity guarantee | Existing collaboration regression only if affected, not public-Manager validation |
| AC-007 | 006 | BEH-006 / SCN-004 | Historical dependency enforcement proposal | External/deferred, not active acceptance gate | No automatic dependency schema introduced | N/A for first slice |
| AC-008 | 007 | BEH-005 / SCN-005 | Read task data after agent create/status update | Saved state is readable through tools/current Project Task reads; manual UI presents current fetched states correctly | New execution/result/sidebar navigation and automatic refresh timing deferred | Service/tool/read + existing board checks; no new left-panel Product journey |
| AC-009 | 009 | BEH-002,005 / SCN-006 | Confirm deletion of Project containing TODO and DONE Tasks | Warning counts/describes all deleted Tasks; Cancel preserves all; original workspace files and unrelated histories remain intact | Task-owned context follows explicit removal/deletion contract; no new runtime cancellation | API/UI regressions including mixed-status Project and real context bytes |
| AC-010 | 010 | BEH-002,006 / SCN-002,005 | Same approved input on selected native/MCP tools | Equivalent task result/error semantics; unselected tools absent from unrelated agent exposure | Legacy task-plan filtering/name collisions do not hide new approved tools | Registry/session/exposure contract checks |
| AC-011 | 008 | BEH-006 / SCN-002 | Historical public package delivery proposal | Excluded by user; no Manager/team package import or publication deliverable | No public agents repository writes | N/A |
| AC-012 | 009,002,011,014 | BEH-001,002,007,008 / SCN-006,008,009 | Feature toggle or node restart after successful save | Valid Projects/tasks/links and subsequently approved durable authoring context remain readable | No implicit reset; new Manager execution recovery/attempt history not included | Existing-data fixtures + restart checks, not synthetic session-only proof |
| AC-013 | 007,009 | BEH-005 / SCN-006,008 | Open New/Edit Project in enabled test-owned experience | Dedicated non-overlay content pages follow external UXJ-001/002 and VIS-003–005/011/018, including shell/Back/Cancel, validation and focus | Cancel discards unsaved drafts without added leave-confirmation; destructive confirmations remain; no global modal ban/phone delivery | Rendered journey fidelity to approved external supplement; implementation not yet validated |
| AC-014 | 007,009,011 | BEH-005,007 / SCN-008 | Create Project with zero/multiple links; later add/edit/remove a draft link | Same direct form supports optional per-link descriptions and visible Existing/New choices; create zero links→Tasks, links→Workspaces; edit preserves origin tab | Source switch preserves mode drafts; duplicates excluded; required-field errors focused; Cancel saves nothing; draft removal does not delete folders | External UXJ-001/002 fidelity + production workspace contract checks after DEC-013 |
| AC-015 | 002,007,009,012 | BEH-002,005 / SCN-009 | Create, read, edit or Cancel Task | Required trimmed description; create TODO→same Project full board with prior search cleared; read/edit pages; edit preserves identity/status/context and returns to detail | Empty text creates nothing; Cancel/Back retains existing board search or saved detail; missing Project/Task has approved recovery | External UXJ-003/004 + service/browser continuity; no separate title/dispatch |
| AC-016 | 007,009,012 | BEH-005 / SCN-005,006,009 | Browse board or open/delete a Task | Board only with three continuous status containers/divided contiguous rows; detail shows description once, read-only status, saved context when present, adjacent Edit then Delete; no Task ID/date/info disclosure | No List toggle/extra filters/widgets; inline explicit delete warning, Cancel-first/Escape/focus restoration; active deletion depends on DEC-009 | Normative VIS-001–020/external responsive states + deletion checks; no production active-work policy inferred |
| AC-017 | 007,011,012 | BEH-005,007 / SCN-008,009 | Creation/save success, error, keyboard navigation or narrow browser | Non-actionable inline success clears at 3000ms without focus steal; notice marker removed without changing tab/other query; external labels/focus/keyboard/wrapping honored | Errors/action-required feedback not auto-dismissed; pending save/capture/file-add blocks submission | External spec/matrix browser + controlled timer tests; browser-width fidelity, not phone certification |
| AC-018 | 007,013 | BEH-008 / SCN-009 | User records/transcribes/cancels or voice is unavailable/fails | Existing optional installed/enabled desktop voice capability produces editable text; user reviews before save, pending blocks save; cancellation/error preserves text | Typed input usable without voice; no auto-install/cloud fallback/raw-audio retention | Approved interaction + existing extension permission/service checks; prototype sample not mic validation |
| AC-019 | 002,007,009,014 | BEH-002,008 / SCN-009 | Attach/save/reopen/edit/remove context or reject upload | Durable same-node Task context after restart, readable in detail/edit/tool results; list/inline preview as approved; Cancel leaves saved files intact | Existing MIME/25 MiB limit and path/owner validation; rejection writes no partial attachment; no execution/file-only Task introduced; Done retains files | UI/API/real-byte/read/restart/cross-identity negative checks; fake object URL alone cannot pass |

## Relevant Scenarios And Journeys
| ID | Kind / actor | Goal and supported trigger | Starting condition and sequence | Outcome / alternate | Validity and independent evidence | IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational / operator | Keep experiment hidden by default; normal startup/setting | Unset/false flag → hidden navigation/route; optionally enabled on test-owned node | Retained data, unchanged default; new tools policy unresolved | Supported Normal Scenario for current capability; extension pending DEC-001; user/E-005 | REQ-001,009 / AC-001 |
| SCN-002 | System / externally created agent | Find/read/create a Task using selected tools | Known or discovered Project → read relevant Tasks → create required description | Durable TODO Task with stable ID; empty description/unknown Project rejected | Supported Normal Scenario, explicit user SD-CF-001/002; Manager creation outside ticket | REQ-002,010 / AC-002,010 |
| SCN-003 | System / external Manager | Reuse existing collaboration after reading a relevant Task | Tool reads Task → caller discovers eligible collaborator and passes work to existing delegate_task | Existing fresh execution result unchanged; no Project assignment/attempt record or cleanup promise | Supported existing collaboration path; external workflow, not new ticket orchestration | REQ-004 / AC-004 |
| SCN-004 | System / external Manager | Original dependency/parallelization vision | Caller may plan/delegate independent work using existing contracts | No new scheduler/dependency/attempt persistence/resource isolation delivered here | External/deferred target context; not active first-slice requirement | REQ-006 / historical AC-006/007 deferred |
| SCN-005 | System/User | Explicitly update and read Task business status | Selected agent identifies Project/Task → requests IN_PROGRESS/DONE → reads updated state; user views fetched manual board | Persisted correct Task status; no execution stop/history deletion; no new sidebar promise | Supported Normal Scenario, explicit SD-CF-001/004; transition policy draft | REQ-003,007,010 / AC-003,008,010 |
| SCN-006 | User/Operational | Continue existing Projects/Tasks after extension and intentional deletion | Browse/create/edit via approved pages/board → restart/flag toggle; explicit confirmed deletion | Authoring/data retained except approved deletion; all-task warning accurate; active-work policy open | Supported Normal Scenario; inherited E-002–005,010, approved manual UI UF-017/E-018; prototype does not validate restart | REQ-002,007,009,011,012,014 / AC-009,012,013,016 |
| SCN-007 | User/Operational | Original active-work/retry scenarios | Existing Task edit/delete and collaboration lifecycle operate separately | Preserve current boundaries; failed update of a deleted Task returns not-found, not automatic cancellation | New task-aware stop/retry coordination deferred; no unsupported edge promoted | REQ-004,009; DEC-004/009 |
| SCN-008 | User | Set up Project/workspace context now or later; New/Edit/Add workspace | Enter name/optional description → optionally add Existing/New rows and descriptions → save, or Cancel → later edit same form | Correct destination tab and optional links; cancel discards drafts; errors focused; no filesystem operation inferred from New folder | Supported Normal Scenario, approved UI target UF-017/PFI-001–003; real path semantics open DEC-013 | REQ-007,009,011 / AC-012–014,017 |
| SCN-009 | User | Manually describe a Task, optionally voice/context; browse/read/edit/delete | Open New Task → type or voice-to-editable-text, optionally attach → review → save→full board → detail→edit/Cancel or confirm deletion | Required text/TODO and stable saved identity; search/return/focus as approved; busy/failure safeguards; real file/capture/active-delete policy open | Supported Normal Scenario for approved manual UI UF-017/PFI-004–007; represented failure/cancel states explicitly supported by spec, production contracts draft | REQ-002,007,009,012–014 / AC-012,015–019 |

## UI, Interaction, And Experience Requirements
- Applicable: Yes. Product brainstorming completed for the **represented manual Projects/Tasks authoring/board/detail slice**; no whole-Manager UI approval.
- Canonical externally owned specification: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md`; exact approved UI revision `84ed47bac6877e2cdc6350cca789b0c30ffb55a3`; final integrated package receipt `f66efa9c5c1d9976137f6c134120529466b34e48`. UF-017 confirmation is in `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-brainstorm-record.md`; PFI-001–007 and unresolved boundaries in `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/handoff-notes.md`.
- Normative visual references: all ticket-scoped VIS-001–020 files in `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/visual-references/`, individually enumerated by the external spec. Every visible detail is defining except the spec's explicit illustrative fixture content/permitted variations. Rejected earlier List, separated-card, Workspace Edit/Done, hidden New-path and Task-information presentations are historical evidence, not alternate permitted implementations.
- This supplement governs its approved page/column hierarchy, controls/copy, tokens/spacing, accessibility/focus/keyboard, navigation/cancel/search, feedback and responsive browser states. It does not prescribe backend stores, fake IDs/object URLs, sample transcription or scripted latency.
- Canonical runnable prototype root `/Users/normy/autobyteus_org/autobyteus-web-prototype`, branch `personal`; Product ticket branch `prototype/project-task-manager-foundations`, accepted base `df2f5cdaf9b168298dcae79ac47c11f31dd82d7c`. Retained Product authoring worktree is not canonical ownership. No post-approval UI changes; no remote push.
- Accepted source parity authority remains `e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71` and `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype-bootstrap-report.md`, distinct from solution investigation `e04cfef23550c3b78286a53befc6bd5d71fb1061`. No newer Projects parity certification is inferred.
- Normal prototype entry is `/` → Chat → Projects; review runtime at port 3286 is **stopped**, not an active review locator. `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/prototype-runbook.md` describes canonical restart. Solution Designer has not restarted/modified Product runtimes.
- Data/capability boundary: session-only synthetic saves; mock voice without microphone; browser-local file metadata/object URLs; New folder creates no filesystem folder or registration. No durability/API/MCP/agent-write/parallel-execution/security/actual-phone validation conveyed.
- Resolved presentation: primary Project and Task forms/detail pages, optional direct workspace authoring, continuous board-only three-column layout, single Task description/read-only status/adjacent actions/inline delete safeguard, 3-second feedback, editable voice/text and file-context UI. REQ-011–014 and AC-014–019 integrate product-level intent without duplicating the visual spec.
- Still unapproved: Manager entry/context/reuse/navigation; waiting/blocked/failed/review/results information; dependency/attempt presentation; status ownership/Done rules; real voice/files/folder semantics; active-work policy and accurate all-Task Project deletion copy. No widgets/extra columns/manual drag/global modal ban/phone delivery inferred.
- Any behavior-defining Product supplement revision must use Product's workflow; complete requirements approval must include the exact unchanged approved manual supplement or newly approved version. SD-CF-003/004 defer only the new workspace/run-history exploration and runtime stopping, not this accepted manual UI.

## Quality And Non-Functional Requirements
| ID | Canonical REQ/AC | Area | Observable outcome | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-009 / AC-009,012 | Reliability | No loss of valid Projects/tasks/links/unrelated history; saved Task context survives restart | Existing-data fixtures, real-byte persistence, scoped deletion |
| QR-002 | REQ-004 / AC-004 | Compatibility | Existing discovery/delegate/follow-up semantics remain unchanged | Proportionate affected-contract regressions, not new Manager delivery |
| QR-003 | REQ-010 / AC-010 | Runtime parity | Same scoped operation result/error semantics on selected native/MCP tools | Registry/session/runtime contract checks |
Concurrent tool writes must retain successfully committed independent changes under existing persistence guarantees; do not introduce an unbounded concurrency or scheduler promise. Approved manual UI's keyboard/focus/feedback/browser-width contract remains. New sidebar/live-refresh timing, actual phone certification and comprehensive WCAG audit are not added.

## Data Continuity And Acceptable Loss
- Preserve existing valid Projects, workspace registrations/links, Task IDs/descriptions/status/createdAt and unrelated execution history. Status writes change only the identified Task and its update metadata, not parent Project identity/content or other Tasks.
- Successfully saved workspace descriptions and Task attachment bytes/metadata remain readable after reload/restart on the same node. No conversation/runtime instance is required merely to read a durable Task.
- Acceptable loss: explicitly confirmed Task/Project deletion and explicit context removal may remove those Task-owned records/copies. Cancel and failed writes preserve saved records; original workspace files and unrelated run histories are not deleted. Done retains Task/context and causes no new runtime stopping.
- Existing draft-upload TTL/error cleanup remains draft-file housekeeping, not the deferred Agent/Team resource-stopping feature. No implicit reset because Projects is experimental/off.
- New task/execution association/dependency data are not introduced in this slice. Volume/user-data state not sampled. Repository migration conventions and transition mechanism are investigated during design; no migration/startup gate prescribed.

## External Contracts And Dependencies
| Dependency | Constraint | Evidence/risk |
| --- | --- | --- |
| Installed shared catalog | Discovery can only offer eligible installed/runnable agents/teams | E-006,014; public GitHub presence alone insufficient |
| delegate_task / send_message_to | Fresh spawn vs existing-instance follow-up; exact run IDs; no duplicate packet resend | E-009; general contract not redefined |
| Software Engineering Team | Team retains requirements approval/review/validation/user-verification gates | E-002,014; manager acceptance is not bypass authorization |
| Project APIs/workspaces | Preserve node scoping, authoring, links and unrelated history | E-003–005,010 |

## Supplemental Artifacts
The complete absolute-path inventory with purpose, owner, scope and applicability is in investigation-notes.md. Current requirements are SR-004 Ready for Approval; earlier SR-003 result is historical. Local artifacts resolve under `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations`.
| Artifact | Purpose | IDs | Status / approval applicability |
| --- | --- | --- | --- |
| investigation-notes.md | Evidence and canonical supplement inventory | All | SR-004; evidence, not full intent approval |
| solution-revision-record.md | Cumulative history | All | SR-001/002 preserved; SR-003 appended |
| product-design-handoff.md / product-design-handoff-sr-002.md | Historical original and continued Product requests | Original IDs / REQ-007,009 | Historical; neither is a visual specification; historical in-progress paths retain provenance only |
| requirements-refinement-sr-003.md | Historical pre-scope-correction result | All | Superseded scope, preserved history |
| requirements-refinement-sr-004.md | Current user-directed tools/UI scope and explicit deferrals | Active IDs | Ready for Approval; no Product sidebar/engineering handoff |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and `visual-references/VIS-001–020` (exact names in spec) | Approved external UI contract | REQ-007,009,011–014 / AC-013–019 | UF-017 approved represented UI at 84ed47b; real voice/file/folder and Manager policies not approved |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/handoff-notes.md`, `ui-brainstorm-record.md`, `prototype-ticket.md` | Findings/approval/receipt and constraints | PFI-001–007 / affected REQ/AC/SCN | Product-owned f66efa9 receipt; UI-only approval |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-behavior-test-matrix.md`, final/integration validation JSON, build output, runbook, change log | Synthetic validation, limits and reproducibility | Manual authoring ACs | Prototype evidence only; no production acceptance |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/requirement-impact.md`, review-round-1/3/4/5/6.md and review-evidence/ | Prior rounds/user screenshots/rejected alternatives and DATA-001 | UI/scenarios/source provenance | Historical, non-normative unless final spec expressly incorporates; retained in final done package |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype-bootstrap-report.md` | Accepted source authority/parity context | BEH-005 / REQ-007,009 | e9aa4a7 accepted source; not newer e04cfef parity |
| design-spec.md / independent reviews | Future technical design/review | All | N/A — not created, phase not reached |

## Assumptions
| ID | Proposed assumption | Validation / status |
| --- | --- | --- |
| ASM-001 | Earlier recommendation to deliver one Manager first | Superseded by SD-CF-001: user owns Manager/team creation outside ticket |
| ASM-002 | Three business-status columns remain; other waiting/failure/review meaning may be orthogonal | Three read-only column presentation approved by UF-017; orthogonal policy/display not approved, DEC-006 |
| ASM-003 | Task status is changed by agents, not manually dragged in board/detail | Read-only/no-drag UI approved; which agent and transitions remain DEC-002 |

## Open Decisions And Questions
Recommendations here are discussion proposals, not target architecture.
| ID | Decision / why it matters | Options / provisional recommendation | Owner / status |
| --- | --- | --- | --- |
| DEC-001 | Tool policy while feature flag is off | Proposed: preserve current visibility-only flag; explicit tool selection controls new exposure, no auto-enable | Included in SR-004 approval proposal; not previously approved extension policy |
| DEC-002 | Status ownership/transitions | Proposed generic existing-three-state setter for any eligible selected agent; same-status retry succeeds; reset/reopen explicit; no Manager-specific workflow/quality judge | Included in SR-004 approval proposal |
| DEC-003 | Dependency representation/enforcement | Deferred/external Manager concern; no new dependency schema required for this slice | Scope disposition resolved SD-CF-001–004 |
| DEC-004 | Task execution linkage/retry | Deferred with new cleanup/sidebar integration; preserve current delegate_task contract | Not a first-slice blocker |
| DEC-005 | Done and runtime resources | Caller explicitly writes business Done; new runtime stopping is deferred. Tool does not judge delegated quality or override team gates | Scope disposition resolved SD-CF-004; transition details DEC-002 |
| DEC-006 | New waiting/failure/review/results/sidebar presentation | Approved manual UI retained; new workspace/run-history view deferred | Scope disposition resolved SD-CF-003/004 |
| DEC-007 | Manager launch/context/reuse | Outside ticket; user creates/configures Manager externally. No new entrypoint required | Scope disposition resolved SD-CF-001 |
| DEC-008 | Parallel shared-repository work orchestration | External Manager/workflow concern; tools do not promise safe unlimited concurrency or workspace isolation | Not a first-slice blocker |
| DEC-009 | Deletion/count continuity | Preserve explicit CRUD safeguards and all-Task Project deletion count; no task-aware runtime cancellation. Task-owned context may be removed only through explicit editing/deletion; Done retains it | Proposed data contract, no automatic resource stopping |
| DEC-010 | Public package and tool runtime surfaces | Public Manager/team excluded by user; propose native + Agent Tools MCP consistent opt-in tools | Package scope resolved; surface proposal included for approval |
| DEC-011 | Real voice contract | Propose inheriting current optional local desktop extension/settings/permissions/errors; editable transcript only, no auto-install or cloud provider | Evidence E-026; proposed continuity included for approval |
| DEC-012 | Durable Task context | Propose node-local task-scoped copies, current MIME/25 MiB constraints; retain on Done/restart, explicit remove/delete only; current run-owner descriptors cannot represent Task ownership | Intended behavior proposal for approval; owner/storage shape is later design |
| DEC-013 | Meaning of New folder | Propose preserving current metadata registration of normalized root path, not creating a directory or adding a new path/permission policy | Evidence E-026; proposed continuity included for approval |
| DEC-014 | Agent-write refresh/rebinding | Current fetched data must be truthful/correct-node. New live/sidebar refresh UX deferred; do not invent automatic latency bound | Deferred beyond current fetch correctness |

## Traceability
REQ-005/006/008 and AC-005–007/011 are retained historical IDs with the explicit deferred/excluded dispositions above; their mappings do not activate those deliverables. New managed portions of SCN-003/004/007 are deferred.

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| 001 | 001 | 001 | 001 | 001,006 |
| 002 | 002,007 | 002,006 | 002,012,015,019 | 002,006,009 |
| 003 | 002 | 002,006 | 003 | 005 |
| 004 | 003,004 | 003,004 | 004,006 | 003,004 |
| 005 | 003 | 004,006 | 005 | 003 |
| 006 | 004 | 004,006 | 006,007 | 004 |
| 007 | 005,007 | 005,006,007,008 | 008,013–019 | 002,005,006,008,009 |
| 008 | 006 | 003,006 | 011 | 002,003 |
| 009 | 001,007 | 001,002,005,007,008 | 001,009,012,013–017,019 | 001,006,008,009 |
| 010 | 002 | 002,006 | 010 | 002,005 |
| 011 | 007 | 005,007 | 012–014,017 | 006,008 |
| 012 | 007 | 002,005 | 015–017 | 005,006,009 |
| 013 | 007 | 008 | 018 | 009 |
| 014 | 002,007 | 002,008 | 012,019 | 006,009 |
IDs use their REQ-/UC-/BEH-/AC-/SCN- prefixes. Original IDs are preserved; SR-003 adds BEH-007/008, REQ-011–014, AC-014–019, SCN-008/009 and DEC-011–014 without renumbering history.

## Architecture Phase Input
- Active basis: tools/read/create/status and preserved contracts, plus exact approved manual Projects/Tasks UI. Manager/team, scheduler, new dispatch linkage, workspace/run-history redesign and new runtime stopping are excluded/deferred.
- SR-004 is a complete proposed bounded tool/UI behavior basis, **Ready for Approval**, not Approved. Obtain explicit approval including proposed flag/status/voice/file/workspace continuity contracts and the unchanged approved Product supplement before authoritative architecture.
- Reverify tool registration/filtering/native-MCP projection, node/Project scoping, status-write persistence/read correctness and existing UI/voice/file/workspace contracts. Investigate repository migration conventions before any persisted-data transition design.
- Do not turn quiet shutdown, host Stop or Product synthetic stores into a new Done-cleanup implementation. Task size/risk route follows completed design, not this scope correction.

## Readiness Check
- Evidence and scope: E-001–026; user explicitly excludes Manager/team creation and defers sidebar plus new runtime stopping while retaining previous Projects/Tasks UI.
- Active intent: Project/Task lookup/read/create, explicit existing-state updates, selected native/MCP parity, exact approved manual UI and stated existing-contract continuity. Earlier scheduler/Manager/linkage questions are not active blockers.
- Detailed intended behavior, data-preservation and testable ACs: specified; no task-owner/storage/migration/tool schema/module architecture selected. Technical integration gaps (Task file owner, voice target) are recorded for post-approval design, not hidden by synthetic prototype evidence.
- Proposed continuity choices requiring baseline approval: visibility-only flag for tools, generic three-state updates/reset/reopen, optional local desktop voice and durable Task context under current upload constraints, current New-folder registration behavior.
- User decisions: scope and manual UI explicitly approved; complete SR-004 contract **not yet approved**.
- Readiness: **Ready for Approval** of the bounded baseline plus unchanged external manual UI supplement. No architecture/implementation route yet.
- Next action: request explicit SR-004 requirements approval; then investigate/design only this scope. No superseded sidebar Product handoff or agent/team delivery question.
