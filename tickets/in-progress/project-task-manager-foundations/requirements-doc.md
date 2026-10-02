# Requirements Document — Project Task Manager Foundations

## Document Status
- Package: `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`.
- Status: **Draft**. Current solution revision: `SR-003`. Date: 2026-10-02. Owner: Solution Designer.
- Complete requirements approval: **not received**. No architecture or production implementation authorization.
- Approved subset: Product-owned Projects/Tasks manual-authoring, board and detail UI. UF-017: “the ui is good now. now i confirm the ui is good. continue”, 2026-10-02, recorded in `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-brainstorm-record.md`. This releases UF-004's Product-first handoff gate; it does not approve Manager/orchestration policies or all REQ/ACs.
- Exact approved UI basis: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and its ticket-scoped VIS-001–020 references, runnable UI revision `84ed47bac6877e2cdc6350cca789b0c30ffb55a3`; final integrated artifact receipt `f66efa9c5c1d9976137f6c134120529466b34e48`. Product owns that specification; this document links it without establishing a competing visual specification.
- Evidence: investigation-notes.md E-001–022 and Product handoff-notes.md PFI-001–007. Earlier UF-001 non-overlay preference is now concretely resolved for the represented primary forms; Manager entry, dependencies, attempts, completion and real voice/files/folder contracts remain open.

## Problem And Desired Outcome
Projects can store tasks, but agents cannot yet create/read/progress them through first-party task tools or connect them to delegated execution. The available collaboration foundation can discover and spawn capable teams; it does not manage durable project work.

Desired outcome: a Project Task Manager helps turn a project goal into appropriately sized tasks, respects dependencies, discovers capable agents/teams, delegates independent work in parallel, and keeps project progress understandable. Projects remains experimental and default-off. The user requested Product brainstorming and has approved the represented manual Projects/Tasks UI; the Manager/orchestration experience and underlying production policies still require decisions.

Observable success (proposed): in an explicitly enabled experimental environment, a manager creates tasks A and B that can run independently, plus C dependent on their outcomes; it discovers Software Engineering Team if installed/eligible, delegates A and B to separate executions, lets the user inspect their progress/results, and progresses C only when prerequisites are accepted. A spawned/idle/stopped agent alone is not proof a task is Done.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Evidence-backed current behavior | Intended behavior / approval boundary | Preserved boundary | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | ENABLE_PROJECTS defaults false; gates shell, not server CRUD | Keep flag/default-off; decide policy for new tools while disabled | Do not enable user's installation or discard data | E-005 |
| BEH-002 | User/System | SCN-002,006,009 | User creates/reads/edits/deletes description-only Tasks; create→TODO; no status operation | Manager reads/creates durable tasks and progresses them (draft); manual New/Edit/Detail pages and create-to-board return approved via external UI supplement | Existing task IDs/content, required description, manual authoring and node scoping | E-003,004,010,018 |
| BEH-003 | System | SCN-003 | Opt-in list_available_agents lists eligible shared agents/teams | Manager uses returned eligible addresses to choose collaborators | Discovery read-only; no hardcoded invented addresses; Org not a delegation target via this catalog | E-006,008 |
| BEH-004 | System | SCN-003,004 | delegate_task spawns fresh copy; exact run ID returned; parallel calls supported | Associate durable work with actual execution attempt(s); respect prerequisites | General spawn/messaging semantics; Project Task ≠ execution | E-009 |
| BEH-005 | User/System | SCN-005,006,008,009 | Board and execution tree exist separately; no agent-write refresh; primary authoring uses overlays | Approved manual board-only/page-based authoring and detail per external supplement; managed waiting/execution/result visibility remains draft | Simple full-width Project experience, three read-only business status groups and authoring semantics; no unrelated shell redesign | E-010,013,018–021 |
| BEH-006 | System | SCN-002–005 | No current supported Project-scoped manager/run lifecycle | Proposed goal→plan→task creation→discovery→parallel dispatch→result assessment→Done | Software Engineering Team retains its approval/review/delivery gates | User, E-002–004,009 |
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
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Preserve experimental flag and data | SCN-001,006 |
| UC-002 | Manager reads project/task context, creates tasks, changes business status | SCN-002,005 |
| UC-003 | Discover a capable installed Agent/Team and delegate durable work | SCN-003 |
| UC-004 | Dependency-aware decomposition and parallel independent execution | SCN-004 |
| UC-005 | Understand manager activity, tasks, execution and results in UI | SCN-005 |
| UC-006 | Define a public Project Task Manager package | SCN-002,003 |
| UC-007 | Keep project/workspace/task authoring usable and accurate, with the approved manual UI supplement | SCN-006,008,009 |

Current authorization covers requirements refinement and the approved UI subset, **not production engineering**. The remaining implementation boundary above is proposed; material DEC decisions and explicit complete requirements/supplement approval must precede design.

### Out Of Scope
- Turning Projects on in the user's installation; removing feature flag; release/deployment in this phase.
- Application-wide removal of modals/overlays or delivery of phone support: UF-001 authorizes neither. Future phone use is motivation only.
- Reintroducing retired execution task-plan/submission/review tools or treating business Task status as runtime Agent status.
- Replacing collaborator discovery, fresh delegation, existing team review/approval gates, or run-history UI wholesale.
- Speculative project management specialists/member topology before the user decides the optional team scope.
- Cross-node distribution, enterprise roles/ACL policy, notifications, due dates/priorities/labels, timelines, automatic scheduling or budget controls unless separately approved.

### Non-Goals
- A mathematically optimal scheduler, unlimited safe concurrency, or automatic proof that tasks are independent.
- Building the public agent/team package during requirements refinement.
- Selecting Product Prototyper's mode, repository or ticket procedure.

### Preserved Behavior Boundary
BEH-001–005 and REQ-001,004,009 protect default-off, node-local data, existing task authoring/workspace links and collaboration identities. Previously strict Projects↔execution import separation may change only as approved integration requires; separation of durable task identity from execution identity remains essential. Preserve authoring/data semantics, not the superseded primary Project/Task overlays, separated-card/List variants or metadata disclosure that the approved Product slice rejects. Existing destructive-action confirmation safeguards remain; DEC-009 active-work policy stays open.

### Review Authority
Blocking corrections must cite the eventual approved REQ/AC or preserved behavior. New policy, scope, migration obligation or completion semantics are Requirement Gaps requiring explicit user approval; downstream comments do not amend this draft or an approved baseline.

## Requirements
Source categories distinguish explicit request, inherited preserved context and proposed completeness requirements. Priority is not approval.

| ID | Requirement / approval boundary | Behavior | Priority | Rationale / authority |
| --- | --- | --- | --- | --- |
| REQ-001 | Retain ENABLE_PROJECTS, default disabled; this work must not enable the user's installation. New tool availability when disabled must be explicitly decided before approval. | BEH-001 | Must | Explicit user; DEC-001 |
| REQ-002 | Give the manager project/task read access and durable task creation with stable IDs; preserve required description and initial TODO. It can recover existing task context rather than relying solely on conversation. | BEH-002,006 | Must | User create-tool request; read access recommended for usable management |
| REQ-003 | Provide agent-facing progression to IN_PROGRESS and DONE with explicit status ownership/transition policy; do not infer Done from spawn success or runtime idle/shutdown. | BEH-002,006 | Must | User progress/done request; ownership and Done evidence proposed, DEC-002,005 |
| REQ-004 | Manager explicitly selects list_available_agents, uses eligible returned Agent/Team addresses, and retains existing delegate_task versus send_message_to semantics. | BEH-003,004 | Must | User discovery/delegation vision, existing contracts |
| REQ-005 | Task dispatch remains associated with the exact started execution and its outcome; unsuccessful launch is not represented as successfully assigned/started work. Exact attempt/retry linkage policy is to be decided. | BEH-004,006 | Proposed Must | Needed for truthful UI/coordination; DEC-004 |
| REQ-006 | Manager decomposes work using stated prerequisites and delegates independent ready work to separate executions in parallel; dependent work must not begin before its required outcomes are available. Dependency representation/enforcement remains open. | BEH-004,006 | Must | Explicit user goal; DEC-003,008 |
| REQ-007 | Follow the approved external UI/UX specification and VIS-001–020 for manual Projects/Tasks authoring, board and detail. Manager entry/conversation, waiting/running/done interpretation beyond basic columns, execution inspection/results and agent-write refresh remain draft and need explicit decisions; do not add unapproved Manager widgets to the accepted simple board. | BEH-005,006 | Must | UF-017/PFI-001–007 approved UI subset; DEC-006,007,014 govern remaining managed experience |
| REQ-008 | Define a reusable public Project Task Manager agent with explicitly selected discovery/task tools. A project management team is optional, not presumed part of the first delivery. | BEH-003,006 | Proposed | User public-agent vision; tentative team, DEC-010 |
| REQ-009 | Preserve existing Projects, workspace links, Task identities/content/status and unrelated run history; keep manual CRUD usable through the approved page-based UI. Preserve destructive confirmation safeguards; Project deletion copy must describe all Tasks deleted, not just open Tasks. Active-work deletion/cancellation/retention remains undecided. | BEH-001,002,005 | Must | Data/authoring continuity and UF-017 UI; known count gap E-010/018 is not approved behavior; DEC-009 |
| REQ-010 | Selected first-party Project Task tools must expose consistent behavior on native and Agent Tools MCP runtimes, without enabling tools on unrelated agents automatically. | BEH-002,006 | Proposed Must | User MCP comparison; existing opt-in foundation; native/MCP scope to confirm |
| REQ-011 | Allow optional multiple workspace links with individual optional descriptions during Project creation and later editing through the same direct form, with Existing workspace/New folder choices and approved return/cancel behavior. New folder filesystem meaning/permission validation must be decided separately. | BEH-005,007 | Must, UI subset approved | UF-017/PFI-002; external UXJ-001/002; DEC-013 |
| REQ-012 | Preserve required trimmed multiline Task description, stable identity and status while using approved New/Edit/Detail pages, create-to-full-board return, search/Cancel behavior, simple continuous three-column board and non-actionable success feedback. Detailed visual/interaction requirements are externally owned. | BEH-002,005 | Must, UI approved | UF-017/PFI-003–006; external UXJ-003/004; no status mutation/dispatch inferred from authoring |
| REQ-013 | Offer the approved voice-to-editable-text interaction for Task description, with user review before save and preservation of text on failure. Real consent/capture/privacy/availability/transcription behavior requires DEC-011; raw audio retention is not approved. | BEH-008 | UI approved; production contract draft | UF-017/PFI-007; external UXJ-003 and mocked boundary |
| REQ-014 | Offer approved Task context-file authoring/list/removal and optional inline image preview; saved context remains available in Task read/edit. Real persistence, security, limits, access and retention require DEC-012. A required description remains mandatory; no file-only Task inferred. | BEH-008,002 | UI approved; production contract draft | UF-017/PFI-007; synthetic object URLs are not a persistence contract |

## Acceptance Criteria
Full production acceptance is **not approved or passed**. Manual UI obligations below inherit UF-017 only within the external supplement. Decision-dependent rows require refinement before complete approval. Product FV/PI/test results validate the synthetic prototype, not production AC completion.

| ID | REQs | Behavior/scenario | Trigger | Observable expected outcome | Alternate/error | Verification intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001,009 | BEH-001 / SCN-001,006 | Fresh test-owned node; feature disabled | Default remains false; Project UI stays inaccessible; data retained; new-tool policy matches DEC-001 | No implicit enable on package import or manager launch | Capability/API/tool-exposure/browser checks |
| AC-002 | 002 | BEH-002,006 / SCN-002 | Manager lists context, creates a task | Stable project/task identity; required trimmed description; TODO; readable again after manager conversation reload | Empty description/unknown Project fails without task creation | Service + native/MCP API journey |
| AC-003 | 003 | BEH-002,006 / SCN-005 | Authorized manager progresses task per decided policy | Persisted correct state and updated visible status; Done requires decided evidence | Missing task/invalid decided transition does not change another task | Service/native/MCP + UI; finalize DEC-002,005 |
| AC-004 | 004 | BEH-003 / SCN-003 | Software Engineering Team is installed shared/eligible | list_available_agents includes its name/kind/address; manager uses returned address | Missing/unrunnable team is surfaced, not invented | Discovery/delegation API integration |
| AC-005 | 005 | BEH-004,006 / SCN-003 | Task dispatched successfully | Exact child ingress/execution association is inspectable; task/attempt distinguishes definition from run | null+reason means no successful launch; behavior on repeated uncertain dispatch follows DEC-004 | Tool→task/run journey; finalize linkage/retry policy |
| AC-006 | 004,006 | BEH-004,006 / SCN-004 | Two independent ready tasks assigned to same Team definition | Separate delegated child instances can overlap; original configured/collaborator instance unaffected | Run-readiness failure for one does not fabricate success | Deterministic integration + selected real-product validation |
| AC-007 | 006 | BEH-006 / SCN-004 | C requires accepted A+B outcomes | A/B can run in parallel; C waits for both prerequisites then can start | Unresolved prerequisite or failed result remains visible/not silently complete | Approved dependency policy checks; finalize DEC-003,005 |
| AC-008 | 007 | BEH-005 / SCN-005 | Agent creates/moves/completes a Task while Project is visible | User sees changed board/count and can inspect associated execution/results through an explicitly approved managed experience | Waiting/failure is not Done; node rebinding never shows wrong-node tasks; exact presentation/freshness policy unresolved | Future managed Product journeys + browser/isolated-app checks; DEC-006,007,014; manual UI approval does not satisfy this AC |
| AC-009 | 009 | BEH-002,005 / SCN-006 | Delete Project containing TODO and DONE Tasks | Confirmation counts/describes all deleted tasks, not just open ones; cancel preserves all; workspaces/files/history remain intact | Active attempt policy follows DEC-009, not an invented cancellation contract | API + UI regression; finalize active-delete policy |
| AC-010 | 010 | BEH-002,006 / SCN-002,005 | Same approved input on selected native/MCP tools | Equivalent task result/error semantics; unselected tools absent from unrelated agent exposure | Legacy task-plan filtering/name collisions do not hide new approved tools | Registry/session/exposure contract checks |
| AC-011 | 008 | BEH-003,006 / SCN-002,003 | Public package delivered/imported in isolated node (if included) | Agent explicitly selects supported discovery/task tools; installed shared team discovery works | Optional management Team not implied; missing tools/version reported | Package checks/import/runtime probe; finalize DEC-010 |
| AC-012 | 009,002,011,014 | BEH-001,002,007,008 / SCN-006,008,009 | Feature disabled/re-enabled or node restarted after successful saves | Existing Projects/tasks/workspace links and all subsequently approved durable Task/manager/context data remain readable | No implicit reset; active execution recovery and file retention only as DEC-007,009,012 approve | Released-data fixtures + restart checks; synthetic session-only saves do not satisfy continuity |
| AC-013 | 007,009 | BEH-005 / SCN-006,008 | Open New/Edit Project in enabled test-owned experience | Dedicated non-overlay content pages follow external UXJ-001/002 and VIS-003–005/011/018, including shell/Back/Cancel, validation and focus | Cancel discards unsaved drafts without added leave-confirmation; destructive confirmations remain; no global modal ban/phone delivery | Rendered journey fidelity to approved external supplement; implementation not yet validated |
| AC-014 | 007,009,011 | BEH-005,007 / SCN-008 | Create Project with zero/multiple links; later add/edit/remove a draft link | Same direct form supports optional per-link descriptions and visible Existing/New choices; create zero links→Tasks, links→Workspaces; edit preserves origin tab | Source switch preserves mode drafts; duplicates excluded; required-field errors focused; Cancel saves nothing; draft removal does not delete folders | External UXJ-001/002 fidelity + production workspace contract checks after DEC-013 |
| AC-015 | 002,007,009,012 | BEH-002,005 / SCN-009 | Create, read, edit or Cancel Task | Required trimmed description; create TODO→same Project full board with prior search cleared; read/edit pages; edit preserves identity/status/context and returns to detail | Empty text creates nothing; Cancel/Back retains existing board search or saved detail; missing Project/Task has approved recovery | External UXJ-003/004 + service/browser continuity; no separate title/dispatch |
| AC-016 | 007,009,012 | BEH-005 / SCN-005,006,009 | Browse board or open/delete a Task | Board only with three continuous status containers/divided contiguous rows; detail shows description once, read-only status, saved context when present, adjacent Edit then Delete; no Task ID/date/info disclosure | No List toggle/extra filters/widgets; inline explicit delete warning, Cancel-first/Escape/focus restoration; active deletion depends on DEC-009 | Normative VIS-001–020/external responsive states + deletion checks; no production active-work policy inferred |
| AC-017 | 007,011,012 | BEH-005,007 / SCN-008,009 | Creation/save success, error, keyboard navigation or narrow browser | Non-actionable inline success clears at 3000ms without focus steal; notice marker removed without changing tab/other query; external labels/focus/keyboard/wrapping honored | Errors/action-required feedback not auto-dismissed; pending save/capture/file-add blocks submission | External spec/matrix browser + controlled timer tests; browser-width fidelity, not phone certification |
| AC-018 | 007,013 | BEH-008 / SCN-009 | User starts/stops/cancels voice input or capture/transcription fails | Approved capture→editable-text interaction; user reviews/edits before Task save; pending operation blocks save; cancellation/failure preserves description | No-speech/error has truthful recovery; typed input remains available; real permissions/privacy/availability require DEC-011 | Browser interaction + eventual real service/permission checks; prototype sample is not mic validation |
| AC-019 | 002,007,009,014 | BEH-002,008 / SCN-009 | Add/remove/clear/paste/drag context files, save/reopen/edit Task | Approved list/type/size/optional inline image preview and saved-context presence; required description still enforced; Cancel does not change saved context | Real rejection limits/access/security/retention require DEC-012; browser-local object URLs are not durable saved files | External UI fidelity + eventual durable file/API/security/continuity checks after contract decision |

## Relevant Scenarios And Journeys
| ID | Kind / actor | Goal and supported trigger | Starting condition and sequence | Outcome / alternate | Validity and independent evidence | IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational / operator | Keep experiment hidden by default; normal startup/setting | Unset/false flag → hidden navigation/route; optionally enabled on test-owned node | Retained data, unchanged default; new tools policy unresolved | Supported Normal Scenario for current capability; extension pending DEC-001; user/E-005 | REQ-001,009 / AC-001 |
| SCN-002 | User→manager | Turn project goal into durable work; proposed Project/manager entry | Existing Project/context (can be authored via approved manual pages) → manager reads → creates fine-grained Tasks | Readable TODO work; invalid empty task rejected; Manager entry/context still open | Supported Normal Scenario as explicit target pending full approval; no current manager path; approved manual UI preparation UF-017/E-018 | REQ-002,007,008,010 / AC-002,010,011 |
| SCN-003 | System / manager | Engage a capable team; approved plan has ready task | Discover → choose eligible Team → delegate packet → keep execution identity | Fresh execution linked to work; missing target/null launch surfaced | Supported Normal Scenario for discovery/spawn; Project linkage proposed pending approval; user/E-006,009 | REQ-004,005,008 / AC-004,005,011 |
| SCN-004 | System / manager | Parallelize independent work without violating prerequisites | A+B ready, C depends on both → separate A/B dispatch → wait → assess results → C | Independent overlap and prerequisite-respecting order | Supported Normal Scenario as explicit target, pending approval of dependency semantics; user/E-009 | REQ-004,006 / AC-006,007 |
| SCN-005 | User/System | Understand actual project progress/results | Manager works → agent-side task updates → user inspects task/run/result → manager determines Done | Approved basic board/detail presentation; waiting/failure/results/linked execution and freshness not yet settled | Supported Normal Scenario as requested target; manual UI subset approved UF-017, orchestration policies draft; E-010,013,018 | REQ-003,007,010,012 / AC-003,008,010,016 |
| SCN-006 | User/Operational | Continue existing Projects/Tasks after extension and intentional deletion | Browse/create/edit via approved pages/board → restart/flag toggle; explicit confirmed deletion | Authoring/data retained except approved deletion; all-task warning accurate; active-work policy open | Supported Normal Scenario; inherited E-002–005,010, approved manual UI UF-017/E-018; prototype does not validate restart | REQ-002,007,009,011,012,014 / AC-009,012,013,016 |
| SCN-007 | User/Operational | Delete/edit work while execution active; recover ambiguous dispatch | Active or uncertain attempt → user action/retry | Policy not settled; no automatic cancellation/retry claim | Unclear — investigate/ask, not promoted to approved supported edge | DEC-004,007,009 only |
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
- Any behavior-defining Product supplement revision must use Product's workflow; complete requirements approval must include the exact unchanged approved supplement or newly approved version.

## Quality And Non-Functional Requirements
| ID | Canonical REQ/AC | Area | Draft measurable outcome / condition | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-009 / AC-009,012 | Reliability | No loss of existing valid Project/Task data or unrelated history from extension/flag toggle | Fixtures, restart, delete boundaries |
| QR-002 | REQ-005 / AC-005 | Operability | Every successful dispatch surfaced as started work identifies an actual child; rejected launch does not | Failure injection/integration after policy settled |
| QR-003 | REQ-010 / AC-010 | Compatibility | Equivalent approved operation semantics on selected native/MCP surfaces; no automatic exposure to unrelated agents | Contract/exposure checks |
Manual UI accessibility/keyboard/feedback obligations are defined by the external approved supplement (AC-017), not a comprehensive WCAG certification. Agent-write visibility latency and parallel resource capacity remain undecided (DEC-014,008); no synthetic delay/performance promise is invented.

## Data Continuity And Acceptable Loss
- Affected persisted data: Yes, durable Projects/Tasks/workspace descriptions and potentially task/execution associations, dependencies and saved Task context files after their contracts are approved.
- Preserve existing valid Projects, links, Task IDs/descriptions/status/timestamps and unrelated run history. Successfully saved new workspace descriptions and approved durable Task context must survive reload/restart; prototype memory-only behavior is not acceptable as a production continuity mechanism. Attachment access/storage/retention is not yet settled (DEC-012).
- Acceptable loss: existing explicit Task/Project deletion only; no reset inferred because feature is experimental/off.
- Active-attempt deletion, retention and execution restore semantics: undecided DEC-007,009.
- Volume/operational constraints: unknown; no production user-data inspection. Architecture must investigate continuity conventions; no migration mechanism prescribed.

## External Contracts And Dependencies
| Dependency | Constraint | Evidence/risk |
| --- | --- | --- |
| Installed shared catalog | Discovery can only offer eligible installed/runnable agents/teams | E-006,014; public GitHub presence alone insufficient |
| delegate_task / send_message_to | Fresh spawn vs existing-instance follow-up; exact run IDs; no duplicate packet resend | E-009; general contract not redefined |
| Software Engineering Team | Team retains requirements approval/review/validation/user-verification gates | E-002,014; manager acceptance is not bypass authorization |
| Project APIs/workspaces | Preserve node scoping, authoring, links and unrelated history | E-003–005,010 |

## Supplemental Artifacts
The complete absolute-path inventory with purpose, owner, scope and applicability is in investigation-notes.md. Local artifacts resolve under `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations`.
| Artifact | Purpose | IDs | Status / approval applicability |
| --- | --- | --- | --- |
| investigation-notes.md | Evidence and canonical supplement inventory | All | SR-003; evidence, not full intent approval |
| solution-revision-record.md | Cumulative history | All | SR-001/002 preserved; SR-003 appended |
| product-design-handoff.md / product-design-handoff-sr-002.md | Historical original and continued Product requests | Original IDs / REQ-007,009 | Historical; neither is a visual specification; historical in-progress paths retain provenance only |
| requirements-refinement-sr-003.md | Current result, approval boundary, unresolved decisions and next action | All | Requirements conversation; no forward-ready engineering handoff |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and `visual-references/VIS-001–020` (exact names in spec) | Approved external UI contract | REQ-007,009,011–014 / AC-013–019 | UF-017 approved represented UI at 84ed47b; real voice/file/folder and Manager policies not approved |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/handoff-notes.md`, `ui-brainstorm-record.md`, `prototype-ticket.md` | Findings/approval/receipt and constraints | PFI-001–007 / affected REQ/AC/SCN | Product-owned f66efa9 receipt; UI-only approval |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-behavior-test-matrix.md`, final/integration validation JSON, build output, runbook, change log | Synthetic validation, limits and reproducibility | Manual authoring ACs | Prototype evidence only; no production acceptance |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/requirement-impact.md`, review-round-1/3/4/5/6.md and review-evidence/ | Prior rounds/user screenshots/rejected alternatives and DATA-001 | UI/scenarios/source provenance | Historical, non-normative unless final spec expressly incorporates; retained in final done package |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype-bootstrap-report.md` | Accepted source authority/parity context | BEH-005 / REQ-007,009 | e9aa4a7 accepted source; not newer e04cfef parity |
| design-spec.md / independent reviews | Future technical design/review | All | N/A — not created, phase not reached |

## Assumptions
| ID | Proposed assumption | Validation / status |
| --- | --- | --- |
| ASM-001 | First usable slice can start with one manager agent; optional Team follows only if needed | User DEC-010; not approved |
| ASM-002 | Three business-status columns remain; other waiting/failure/review meaning may be orthogonal | Three read-only column presentation approved by UF-017; orthogonal policy/display not approved, DEC-006 |
| ASM-003 | Task status is changed by agents, not manually dragged in board/detail | Read-only/no-drag UI approved; which agent and transitions remain DEC-002 |

## Open Decisions And Questions
Recommendations here are discussion proposals, not target architecture.
| ID | Decision / why it matters | Options / provisional recommendation | Owner / status |
| --- | --- | --- | --- |
| DEC-001 | Does off hide UI only, or also prevent new manager/tool operations? | Preserve backend reachability with explicit opt-in vs gate new operations when off. Recommend new manager task tools honor explicit experimental enablement; do not silently alter existing CRUD contract | User; open |
| DEC-002 | Who changes status and which transitions exist? | Manager-only vs delegated workers; explicit start/done tools vs one status operation; reopen/reset policy. Recommend manager controls business outcome, workers return results | User; open |
| DEC-003 | How are dependencies stored/interpreted? | Structured durable task references with validation vs manager plan in prose. Structured references are worth discussing for inspectable/resumable coordination; hard scheduler not assumed | User/Product; open |
| DEC-004 | How is Task dispatch linked, and what about duplicate/failed/ambiguous retry? | Existing delegation plus explicit association vs Project-aware dispatch operation; single current attempt vs attempt history. Require truthful link; exact lifecycle awaits intent decision then design | User; open |
| DEC-005 | What qualifies as Done? | Worker report vs manager acceptance with result/evidence; Software Engineering Team receipt respects its own gates. Recommend manager confirms meaningful accepted output | User; open |
| DEC-006 | Waiting/blocked/failed/review/results meaning and visibility without complicating board? | Approved manual authoring/board/detail presentation is external UI supplement. Three continuous status columns and read-only detail are fixed for this slice; no extra widgets/columns. Waiting/failure/review/results remain to define | User/Product; presentation subset resolved UF-017; orchestration open |
| DEC-007 | Where Manager starts/lives; explicit Project/workspace context; reuse/restart/run navigation? | Project entry vs existing chat with explicit context; one manager vs multiple sessions; reuse/navigation/recovery unapproved. Manual page approval does not select any Manager entry | User/Product; open, not part of represented prototype |
| DEC-008 | What constitutes safe parallel work in same repository? | Manager chooses only independent work; isolated workspaces/worktrees where needed; concurrency limits not assumed. “Maximum parallelism” is goal, not unlimited resource guarantee | User; open |
| DEC-009 | Edit/delete Project/Task with active attempts? | Allow retaining history with clear semantics, block active deletion, or explicit coordinated stop; no default cancellation inferred. Also fix total delete count once Done exists | User/Product; open |
| DEC-010 | Public Manager, tentative management Team and selected native/MCP delivery scope? | Recommend one standalone public Manager with explicitly selected discovery/task tools first; optional Team only by explicit decision. Confirm native+MCP scope, not inferred from mock UI | User; open |
| DEC-011 | Real voice-to-text capability, consent/privacy/permissions/availability and failure contract? | UI transcription is editable before save; no raw-audio retention approved. Decide production capability scope and where capture/transcription can occur; do not ship a sample as real voice | User; open; provider/technical design follows approved behavior |
| DEC-012 | Durable context-file storage/security/limits, manager/worker access and removal/retention? | Approved attachment/list/preview UI, not upload or access policy. Decide supported types/size/count, availability after restart, explicit access boundary and task/project deletion handling. Required description remains | User; open; storage/transport design deferred |
| DEC-013 | Does New folder mean register an existing directory or create one, on which node and with what errors? | Visible Existing/New choices approved. Clarify existing path/create behavior and validation/permission/availability; no actual filesystem action in mock | User; open |
| DEC-014 | How promptly do agent writes appear, and what refresh/rebinding behavior is required? | Define observable freshness bound and recovery/manual-refresh expectation; preserve correct-node view. Transport selection is later design, not this policy | User; open; absent from prototype validation |

## Traceability
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
- Approved scenario portions: manual authoring/board/detail in SCN-002/005/006/008/009, under exact Product supplement/UF-017. **Complete requirements not approved; architecture must not start yet.**
- Preserve default-off, distinct Project Task/execution identity, node scoping, existing collaborator contracts, valid data and independent team's gates; realize exact approved UI once complete basis approved.
- Deferred technical decisions: shared service/tool projection, explicit Project context, linkage/lifecycle coordination, update transport, persistence transition, real voice/files/folder ownership, package delivery and file responsibilities.
- Reverify E-003–013 and source-version difference, concurrency/linkage/recovery/exposure/file/capture paths. Investigate governing repository migration conventions before data-transition design. Mock Pinia/snapshot hydrator/object URLs are not target architecture.
- Task size/risk/design/review route: N/A — classify completed design, not this draft's document volume.

## Readiness Check
- Current behavior evidence-backed: Yes, source inspection; production runtime not claimed.
- Product authority/receipt/explicit UI confirmation verified: Yes, E-018–022; approved spec and normative final references agree on package/UI/source basis; git diff after UI approval contains artifacts/README only.
- Approved manual UI reflected in requirements/scenarios/ACs: Yes, externally linked, no competing spec; PFI-001–007 integrated.
- Prototype test/build/browser results accurately bounded: Yes; PI-005 recovered cold-import errors retained; synthetic evidence is not production acceptance.
- Full problem/scope/desired/preserved detailed policies complete: **No**. DEC-001–005/008–010 and managed portions DEC-006/007 remain open, plus real voice/files/folder/freshness DEC-011–014.
- Draft traceability/scenario validity: recorded; SCN-007 remains Unclear. No hidden scope deferral/manager Team expansion.
- Complete baseline ready for final approval: **No** until material policies are settled and ACs refined; do not ask for blanket approval of undefined behavior.
- Complete requirements approval / architecture / implementation authorization: **No**.
- Next action: ask user to decide first delivery boundary (one standalone public Manager recommended vs optional management Team), then settle remaining policy/experience contracts and present exact refined requirements plus approved Product supplement for explicit complete approval.
