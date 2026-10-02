# Requirements Document — Project Task Manager Foundations

## Document Status
- Package: `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`.
- Status: **Draft**. Current solution revision: `SR-002`. Date: 2026-10-02.
- Owner: Solution Designer.
- Approval: **Complete baseline approval not received**. Original user request authorizes analysis/Product brainstorming. User direction UF-001 explicitly rejects overlays for the primary New/Edit Project forms; this constrained preference is recorded, not treated as final layout or full requirements/UI-UX approval.
- Exact approved baseline / behavior-defining supplement versions: N/A — none for this extension.
- Evidence: investigation-notes.md; Product UF-001 at `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/ui-brainstorm-record.md`, evidence revision `c289b74b833cba02744dd926e992892bc6fd6407`. Dedicated pages, inline editing, Task detail and Manager presentation are still alternatives, not approved designs. No implementation authorization.

## Problem And Desired Outcome
Projects can store tasks, but agents cannot yet create/read/progress them through first-party task tools or connect them to delegated execution. The available collaboration foundation can discover and spawn capable teams; it does not manage durable project work.

Desired outcome: a Project Task Manager helps turn a project goal into appropriately sized tasks, respects dependencies, discovers capable agents/teams, delegates independent work in parallel, and keeps project progress understandable. Projects remains experimental and default-off. The user explicitly wants to discuss the UI with Product Prototyper before settling that experience.

Observable success (proposed): in an explicitly enabled experimental environment, a manager creates tasks A and B that can run independently, plus C dependent on their outcomes; it discovers Software Engineering Team if installed/eligible, delegates A and B to separate executions, lets the user inspect their progress/results, and progresses C only when prerequisites are accepted. A spawned/idle/stopped agent alone is not proof a task is Done.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Evidence-backed current behavior | Desired behavior (pending approval) | Preserved boundary | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | ENABLE_PROJECTS defaults false; gates shell, not server CRUD | Keep flag/default-off; decide policy for new tools while disabled | Do not enable user's installation or discard data | E-005 |
| BEH-002 | User/System | SCN-002,006 | User creates/reads/edits/deletes description-only Tasks; create→TODO; no status operation | Manager can read/create durable tasks and progress them | Existing task IDs/content, manual authoring and node scoping | E-003,004,010 |
| BEH-003 | System | SCN-003 | Opt-in list_available_agents lists eligible shared agents/teams | Manager uses returned eligible addresses to choose collaborators | Discovery read-only; no hardcoded invented addresses; Org not a delegation target via this catalog | E-006,008 |
| BEH-004 | System | SCN-003,004 | delegate_task spawns fresh copy; exact run ID returned; parallel calls supported | Associate durable work with actual execution attempt(s); respect prerequisites | General spawn/messaging semantics; Project Task ≠ execution | E-009 |
| BEH-005 | User/System | SCN-005,006 | Board and execution tree exist separately; no agent-write refresh; primary New/Edit Project forms currently use overlays | User understands managed progress, waiting work, responsible execution and results; primary New/Edit Project forms avoid modal/overlay presentation per UF-001 | Simple full-width Project experience and authoring semantics; primary form presentation intentionally changes, not an unrelated shell redesign | E-010,013,015,016 |
| BEH-006 | System | SCN-002–005 | No current supported Project-scoped manager/run lifecycle | Proposed goal→plan→task creation→discovery→parallel dispatch→result assessment→Done | Software Engineering Team retains its approval/review/delivery gates | User, E-002–004,009 |

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
| UC-007 | Keep project/workspace/task authoring usable and accurate; change primary New/Edit Project form presentation to non-overlay | SCN-006 |

This turn authorizes **investigation and Product request only**. Above is the proposed future implementation boundary; DEC decisions and explicit approval must precede design.

### Out Of Scope
- Turning Projects on in the user's installation; removing feature flag; release/deployment in this phase.
- Application-wide removal of modals/overlays or delivery of phone support: UF-001 authorizes neither. Future phone use is motivation only.
- Reintroducing retired execution task-plan/submission/review tools or treating business Task status as runtime Agent status.
- Replacing collaborator discovery, fresh delegation, existing team review/approval gates, or run-history UI wholesale.
- Speculative project management specialists/member topology before the user decides the optional team scope.
- Cross-node distribution, enterprise roles/ACL policy, notifications, due dates/priorities/labels, timelines, automatic scheduling or budget controls unless separately approved.

### Non-Goals
- A mathematically optimal scheduler, unlimited safe concurrency, or automatic proof that tasks are independent.
- Building the public agent/team package during this analysis handoff.
- Selecting Product Prototyper's mode, repository or ticket procedure.

### Preserved Behavior Boundary
BEH-001–005 and REQ-001,004,009 protect default-off, node-local data, existing task authoring/workspace links and collaboration identities. Previously strict Projects↔execution import separation may change only as approved integration requires; separation of durable task identity from execution identity remains essential. Preserve authoring/data semantics, not the current primary New/Edit Project overlays that UF-001 intentionally rejects. Existing destructive-action confirmation safeguards remain; DEC-009 active-work policy stays open.

### Review Authority
Blocking corrections must cite the eventual approved REQ/AC or preserved behavior. New policy, scope, migration obligation or completion semantics are Requirement Gaps requiring explicit user approval; downstream comments do not amend this draft or an approved baseline.

## Requirements
Source categories distinguish explicit request, inherited preserved context and proposed completeness requirements. Priority is not approval.

| ID | Proposed requirement | Behavior | Priority | Rationale / authority |
| --- | --- | --- | --- | --- |
| REQ-001 | Retain ENABLE_PROJECTS, default disabled; this work must not enable the user's installation. New tool availability when disabled must be explicitly decided before approval. | BEH-001 | Must | Explicit user; DEC-001 |
| REQ-002 | Give the manager project/task read access and durable task creation with stable IDs; preserve required description and initial TODO. It can recover existing task context rather than relying solely on conversation. | BEH-002,006 | Must | User create-tool request; read access recommended for usable management |
| REQ-003 | Provide agent-facing progression to IN_PROGRESS and DONE with explicit status ownership/transition policy; do not infer Done from spawn success or runtime idle/shutdown. | BEH-002,006 | Must | User progress/done request; ownership and Done evidence proposed, DEC-002,005 |
| REQ-004 | Manager explicitly selects list_available_agents, uses eligible returned Agent/Team addresses, and retains existing delegate_task versus send_message_to semantics. | BEH-003,004 | Must | User discovery/delegation vision, existing contracts |
| REQ-005 | Task dispatch remains associated with the exact started execution and its outcome; unsuccessful launch is not represented as successfully assigned/started work. Exact attempt/retry linkage policy is to be decided. | BEH-004,006 | Proposed Must | Needed for truthful UI/coordination; DEC-004 |
| REQ-006 | Manager decomposes work using stated prerequisites and delegates independent ready work to separate executions in parallel; dependent work must not begin before its required outcomes are available. Dependency representation/enforcement remains open. | BEH-004,006 | Must | Explicit user goal; DEC-003,008 |
| REQ-007 | Provide a user-approved experience for manager entry/conversation, tasks, waiting/running/done interpretation, execution inspection, returned results and updates after agent writes. Primary New project and Edit project forms must use non-overlay/non-modal presentation per UF-001. Exact replacement layout, routes, Task detail and Manager presentation remain open. | BEH-005,006 | Must | Explicit Product brainstorming request and user direction UF-001; E-015,016; DEC-006,007 |
| REQ-008 | Define a reusable public Project Task Manager agent with explicitly selected discovery/task tools. A project management team is optional, not presumed part of the first delivery. | BEH-003,006 | Proposed | User public-agent vision; tentative team, DEC-010 |
| REQ-009 | Preserve existing Projects, workspace links, Task identities/content/status and unrelated run history; keep manual Project/Task CRUD usable while intentionally replacing primary New/Edit Project overlay presentation per UF-001. Preserve explicit destructive-action confirmation safeguards; Project-delete confirmation must describe all Tasks it deletes once Done exists. Active-work deletion policy remains open. | BEH-001,002,005 | Must | Inherited data/authoring boundaries; UF-001 presentation delta E-015,016; count issue E-010; DEC-009 |
| REQ-010 | Selected first-party Project Task tools must expose consistent behavior on native and Agent Tools MCP runtimes, without enabling tools on unrelated agents automatically. | BEH-002,006 | Proposed Must | User MCP comparison; existing opt-in foundation; native/MCP scope to confirm |

## Acceptance Criteria
These are draft verification intents, not a passed or approved contract. Decision-dependent rows must be completed once the user settles the linked DEC entries.

| ID | REQs | Behavior/scenario | Trigger | Observable expected outcome | Alternate/error | Verification intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001,009 | BEH-001 / SCN-001,006 | Fresh test-owned node; feature disabled | Default remains false; Project UI stays inaccessible; data retained; new-tool policy matches DEC-001 | No implicit enable on package import or manager launch | Capability/API/tool-exposure/browser checks |
| AC-002 | 002 | BEH-002,006 / SCN-002 | Manager lists context, creates a task | Stable project/task identity; required trimmed description; TODO; readable again after manager conversation reload | Empty description/unknown Project fails without task creation | Service + native/MCP API journey |
| AC-003 | 003 | BEH-002,006 / SCN-005 | Authorized manager progresses task per decided policy | Persisted correct state and updated visible status; Done requires decided evidence | Missing task/invalid decided transition does not change another task | Service/native/MCP + UI; finalize DEC-002,005 |
| AC-004 | 004 | BEH-003 / SCN-003 | Software Engineering Team is installed shared/eligible | list_available_agents includes its name/kind/address; manager uses returned address | Missing/unrunnable team is surfaced, not invented | Discovery/delegation API integration |
| AC-005 | 005 | BEH-004,006 / SCN-003 | Task dispatched successfully | Exact child ingress/execution association is inspectable; task/attempt distinguishes definition from run | null+reason means no successful launch; behavior on repeated uncertain dispatch follows DEC-004 | Tool→task/run journey; finalize linkage/retry policy |
| AC-006 | 004,006 | BEH-004,006 / SCN-004 | Two independent ready tasks assigned to same Team definition | Separate delegated child instances can overlap; original configured/collaborator instance unaffected | Run-readiness failure for one does not fabricate success | Deterministic integration + selected real-product validation |
| AC-007 | 006 | BEH-006 / SCN-004 | C requires accepted A+B outcomes | A/B can run in parallel; C waits for both prerequisites then can start | Unresolved prerequisite or failed result remains visible/not silently complete | Approved dependency policy checks; finalize DEC-003,005 |
| AC-008 | 007 | BEH-005 / SCN-005 | Agent creates/moves/completes a Task while Project is visible | User sees changed board/count and can inspect associated execution/results via approved UX | Failure/waiting differs from Done; node rebinding never shows wrong-node tasks | Approved Product journeys + browser/isolated-app checks; freshness bound TBD |
| AC-009 | 009 | BEH-002,005 / SCN-006 | Delete Project containing TODO and DONE Tasks | Confirmation counts/describes all deleted tasks, not just open ones; cancel preserves all; workspaces/files/history remain intact | Active attempt policy follows DEC-009, not an invented cancellation contract | API + UI regression; finalize active-delete policy |
| AC-010 | 010 | BEH-002,006 / SCN-002,005 | Same approved input on selected native/MCP tools | Equivalent task result/error semantics; unselected tools absent from unrelated agent exposure | Legacy task-plan filtering/name collisions do not hide new approved tools | Registry/session/exposure contract checks |
| AC-011 | 008 | BEH-003,006 / SCN-002,003 | Public package delivered/imported in isolated node (if included) | Agent explicitly selects supported discovery/task tools; installed shared team discovery works | Optional management Team not implied; missing tools/version reported | Package checks/import/runtime probe; finalize DEC-010 |
| AC-012 | 009,002 | BEH-001,002 / SCN-006 | Experimental feature disabled/re-enabled or node restarted | Existing Projects/tasks/workspace links and approved manager task data preserved | No implicit reset; active execution recovery only as DEC-007 approves | Released-data fixtures + restart checks |
| AC-013 | 007,009 | BEH-005 / SCN-006 | User opens New project or Edit project in enabled test-owned experience | Both primary forms are presented without a modal/overlay or dimmed-backdrop form; approved creation/editing and validation behavior remains usable | No implied removal of confirmation safeguards, all app dialogs or Task detail dialogs; replacement navigation/cancel/unsaved-change behavior requires further Product review | Rendered form journeys against final approved Product outcome; no phone-delivery assertion |

## Relevant Scenarios And Journeys
| ID | Kind / actor | Goal and supported trigger | Starting condition and sequence | Outcome / alternate | Validity and independent evidence | IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational / operator | Keep experiment hidden by default; normal startup/setting | Unset/false flag → hidden navigation/route; optionally enabled on test-owned node | Retained data, unchanged default; new tools policy unresolved | Supported Normal Scenario for current capability; extension pending DEC-001; user/E-005 | REQ-001,009 / AC-001 |
| SCN-002 | User→manager | Turn project goal into durable work; proposed Project/manager entry | Existing Project/context (may be prepared using primary non-overlay New/Edit Project forms per UF-001) → manager reads → creates fine-grained Tasks | Readable TODO work; invalid empty task rejected; manager entry and Task authoring layout still open | Supported Normal Scenario as explicitly requested target, pending approval; user, no current manager path; UF-001 context E-015 | REQ-002,007,008,010 / AC-002,010,011 |
| SCN-003 | System / manager | Engage a capable team; approved plan has ready task | Discover → choose eligible Team → delegate packet → keep execution identity | Fresh execution linked to work; missing target/null launch surfaced | Supported Normal Scenario for discovery/spawn; Project linkage proposed pending approval; user/E-006,009 | REQ-004,005,008 / AC-004,005,011 |
| SCN-004 | System / manager | Parallelize independent work without violating prerequisites | A+B ready, C depends on both → separate A/B dispatch → wait → assess results → C | Independent overlap and prerequisite-respecting order | Supported Normal Scenario as explicit target, pending approval of dependency semantics; user/E-009 | REQ-004,006 / AC-006,007 |
| SCN-005 | User/System | Understand actual project progress/results | Manager works → agent-side task updates → user inspects task/run/result → manager determines Done | Truthful business state; waiting/failure not Done; UF-001 does not settle Task detail or Manager presentation | Supported Normal Scenario as requested target; UI/status policies open; user/E-010,013 | REQ-003,007,010 / AC-003,008,010 |
| SCN-006 | User/Operational | Continue existing Projects/Tasks after extension and intentional deletion | New/Edit Project opened without an overlay per UF-001; existing records → browse/edit/restart/flag toggle; confirmed Project deletion | Authoring/data behavior retained except explicit deletion; confirmation accurate; exact form/navigation alternatives still open | Supported Normal Scenario; inherited released package/E-002–005,010 and user direction UF-001/E-015,016 | REQ-002,007,009 / AC-009,012,013 |
| SCN-007 | User/Operational | Delete/edit work while execution active; recover ambiguous dispatch | Active or uncertain attempt → user action/retry | Policy not settled; no automatic cancellation/retry claim | Unclear — investigate/ask, not promoted to approved supported edge | DEC-004,007,009 only |

## UI, Interaction, And Experience Requirements
- Applicable: Yes; explicitly requested Product brainstorming.
- Interim Product evidence: `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirement-impact.md`, `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/ui-brainstorm-record.md`, `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/prototype-ticket.md`; evidence revision `c289b74b833cba02744dd926e992892bc6fd6407`. Externally owned, not an approved UI/UX specification.
- Canonical prototype root `/Users/normy/autobyteus_org/autobyteus-web-prototype`; active Product worktree `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations`, branch `prototype/project-task-manager-foundations`, ticket `project-task-manager-foundations`.
- Accepted cumulative Product base `df2f5cdaf9b168298dcae79ac47c11f31dd82d7c`; existing prototype source pin `e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71` differs from investigated source `e04cfef23550c3b78286a53befc6bd5d71fb1061`. No newer Projects parity acceptance claimed.
- Existing synthetic prototype review URL reported by Product: `http://127.0.0.1:3286/projects/project-prototype-launch`; runtime retained by Product for user inspection, not a finalized future-state prototype.
- Final UI/UX specification, accepted future-state revision, normative final screenshots and explicit final user confirmation: **N/A — not produced/received**.
- UF-001 confirmed direction: avoid overlays/modals for primary New/Edit Project forms shown in user screenshots. Dedicated create/edit/detail pages, inline small-field editing and Manager tab/page are Product alternatives, not approved layouts.
- Phone-use concern is motivation only; no shipped phone scope, global modal ban, new Task detail treatment or settled deletion/active-work policy inferred.
- Existing context: card grid → full-width Project; Tasks/Workspaces tabs; To Do/In Progress/Done board; description-only cards and dialog; linked workspaces; separate run/conversation trees.
- Prior user feedback rejected a squeezed two-pane Project experience; simple full-width board is inherited context, not a ban on exploring approved alternatives.
- Required experiences/states to clarify: goal input/manager conversation, task creation, ready/waiting dependency state, active attempt(s), team identification, execution navigation, result/completion, rejected/failed launch, reload and node rebinding.
- Normative new visual/interaction baseline: none. Fixture content, responsive layout, refresh timing and accessibility details must come from the approved Product outcome.
- Detailed open decisions: DEC-006,007,009; Product can surface others through the critical journey.

## Quality And Non-Functional Requirements
| ID | Canonical REQ/AC | Area | Draft measurable outcome / condition | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-009 / AC-009,012 | Reliability | No loss of existing valid Project/Task data or unrelated history from extension/flag toggle | Fixtures, restart, delete boundaries |
| QR-002 | REQ-005 / AC-005 | Operability | Every successful dispatch surfaced as started work identifies an actual child; rejected launch does not | Failure injection/integration after policy settled |
| QR-003 | REQ-010 / AC-010 | Compatibility | Equivalent approved operation semantics on selected native/MCP surfaces; no automatic exposure to unrelated agents | Contract/exposure checks |
Live-update latency, concurrency capacity and accessibility metrics: not invented; settle applicable constraints before approval/design.

## Data Continuity And Acceptable Loss
- Affected persisted data: Yes, durable Project Tasks and potentially task/execution associations/dependencies.
- Preserve existing valid Projects, links, Task IDs/descriptions/status/timestamps and unrelated run history.
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
All local paths resolve in the canonical ticket directory given in investigation-notes.md and the handoff. requirements-doc.md is the intent authority, not a supplement.
| Artifact | Purpose | IDs | Status / approval applicability |
| --- | --- | --- | --- |
| investigation-notes.md | Source evidence and feasibility | All | Current SR-002; evidence, not full intent approval |
| solution-revision-record.md | Cumulative history | All | SR-001 preserved; SR-002 appended |
| product-design-handoff.md | Historical original Product request | All | Preserved SR-001; not a UI specification |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirement-impact.md`, `ui-brainstorm-record.md`, `prototype-ticket.md` | Interim UF-001 feedback/provenance | REQ-007,009 / AC-013 | Received, Product-owned, not final UI/UX approval; full absolute inventory in investigation |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/review-evidence/user-edit-project-overlay.png`, `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/review-evidence/user-new-project-overlay.png` | User-supplied current overlay evidence | REQ-007,009 / AC-013 | Viewed read-only; not normative future references |
| product-design-handoff-sr-002.md | Revised context for continuing Product review | REQ-007,009 / AC-013 | SR-002 continuation, not a final UI specification |
| Final Product UI/UX artifacts | Future approved specification/visual baseline | REQ-007 | N/A — not produced; include exact versions in future approval basis |
| design-spec.md / review artifacts | Later technical design/independent review | All | N/A — phase not reached |

## Assumptions
| ID | Proposed assumption | Validation / status |
| --- | --- | --- |
| ASM-001 | First usable slice can start with one manager agent; optional Team follows only if needed | User DEC-010; not approved |
| ASM-002 | Existing three business states remain; blocked/failure/review info can be orthogonal rather than new columns | User/Product DEC-006; not approved |
| ASM-003 | Task status stays agent-owned, not manually draggable | Inherited previous scope; reconfirm DEC-002 if changed |

## Open Decisions And Questions
Recommendations here are discussion proposals, not target architecture.
| ID | Decision / why it matters | Options / provisional recommendation | Owner / status |
| --- | --- | --- | --- |
| DEC-001 | Does off hide UI only, or also prevent new manager/tool operations? | Preserve backend reachability with explicit opt-in vs gate new operations when off. Recommend new manager task tools honor explicit experimental enablement; do not silently alter existing CRUD contract | User; open |
| DEC-002 | Who changes status and which transitions exist? | Manager-only vs delegated workers; explicit start/done tools vs one status operation; reopen/reset policy. Recommend manager controls business outcome, workers return results | User; open |
| DEC-003 | How are dependencies stored/interpreted? | Structured durable task references with validation vs manager plan in prose. Structured references are worth discussing for inspectable/resumable coordination; hard scheduler not assumed | User/Product; open |
| DEC-004 | How is Task dispatch linked, and what about duplicate/failed/ambiguous retry? | Existing delegation plus explicit association vs Project-aware dispatch operation; single current attempt vs attempt history. Require truthful link; exact lifecycle awaits intent decision then design | User; open |
| DEC-005 | What qualifies as Done? | Worker report vs manager acceptance with result/evidence; Software Engineering Team receipt respects its own gates. Recommend manager confirms meaningful accepted output | User; open |
| DEC-006 | Waiting/blocked/failed/review information and primary form/detail presentation without complicating board? | Preserve 3 statuses with additional detail vs extend columns; dependency/result/assignee visibility open. UF-001 constrains primary New/Edit Project forms to non-overlay. Dedicated pages vs inline editing and Task detail presentation not approved | User/Product; partially constrained by UF-001, final design open |
| DEC-007 | Where does manager run start/live; how Project context/workspace chosen; reuse/restart? | Project entry or existing chat with explicit Project context; one persistent manager vs multiple sessions; run navigation/resume open. Non-overlay primary Project authoring supports this journey, but UF-001 approves no Manager tab/page or route | User/Product; open, UF-001 context recorded |
| DEC-008 | What constitutes safe parallel work in same repository? | Manager chooses only independent work; isolated workspaces/worktrees where needed; concurrency limits not assumed. “Maximum parallelism” is goal, not unlimited resource guarantee | User; open |
| DEC-009 | Edit/delete Project/Task with active attempts? | Allow retaining history with clear semantics, block active deletion, or explicit coordinated stop; no default cancellation inferred. Also fix total delete count once Done exists | User/Product; open |
| DEC-010 | Delivery scope for public manager and tentative project management Team? | Tools+one standalone public manager vs broader Team. Recommend manager first; exact team roles only after need/approval | User; open |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| 001 | 001 | 001 | 001 | 001,006 |
| 002 | 002 | 002,006 | 002,012 | 002,006 |
| 003 | 002 | 002,006 | 003 | 005 |
| 004 | 003,004 | 003,004 | 004,006 | 003,004 |
| 005 | 003 | 004,006 | 005 | 003 |
| 006 | 004 | 004,006 | 006,007 | 004 |
| 007 | 005,007 | 005,006 | 008,013 | 002,005,006 |
| 008 | 006 | 003,006 | 011 | 002,003 |
| 009 | 001,007 | 001,002,005 | 001,009,012,013 | 001,006 |
| 010 | 002 | 002,006 | 010 | 002,005 |
IDs in this table use their REQ-/UC-/BEH-/AC-/SCN- prefixes as defined above.

## Architecture Phase Input
- Approved scenarios: N/A — pending. Proposed SCN-001–006 need mapped technical paths after approval.
- Preserve default-off, distinct Project Task/execution identity, node scoping, existing collaborator contracts, valid data and independent team's gates.
- Deferred technical decisions: shared service/tool projection, explicit Project context, linkage/lifecycle coordination, update transport, persistence transition, folder placement, package delivery mechanics.
- Verify technical facts E-003–013 and unresolved concurrency/linkage/restore/exposure paths. Investigate repository migration conventions before any data transition design.
- Do not start authoritative design based on this draft.

## Readiness Check
- Current behavior evidence-backed: Yes (source inspection; live execution not claimed).
- Desired/preserved high-level outcomes and scope: Yes; detailed policies remain open.
- Draft REQ/AC traceable: Yes; decision-dependent ACs require refinement.
- Scenarios and validity: Yes; unsupported active/retry edge explicitly Unclear.
- Interim Product UF-001 evidence integrated: Yes, constrained direction only; final UI/UX approval: No. Product brainstorming continues.
- Material decisions visible: Yes (DEC-001–010).
- Content ready for final user approval: **No**, pending Product/user decisions.
- User approval received / exact approval basis recorded / ready for architecture: **No**.
- Next action: return SR-002 revised draft context to Product Prototyper for continued direct review of non-overlay alternatives and other open decisions; obtain final requirements/supplement approval before design.
