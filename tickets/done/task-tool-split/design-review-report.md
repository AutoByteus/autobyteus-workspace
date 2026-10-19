# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/requirements-doc.md` (SR-003, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed: `temp-task-tool-split-proposal.md` (direction, agreed with the user)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: re-review of SR-003, which addresses ARCH-F-001..ARCH-F-004 of ARCH-REV-001 (Solution Designer message, 2026-10-15)
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split` at base `35eacddb25`; files read: `runtime-agent-tool-exposure.ts`, `project-task-tool-contract.ts`, `autobyteus-collaboration-tool-exposure.ts`, `autobyteus-agent-tool-resolver.ts`, `agent-tool-mcp-catalog.ts`, `collaborator-mention-note.ts`, `agent-team-collaboration-llm-contract.ts` (old-name lines), `task-delegation/*`; round 2 re-verified all importers of `autobyteus-collaboration-tool-exposure.ts` (only the resolver and two unit tests) and the parse rule in `collaborator-mention-note.ts`; searches for old/new tool names across `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, presentation contracts, local app data and `autobyteus-agents`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: the public agent tool contract changes (one name removed, two added) and the default exposure changes; no runtime-owner, persistence or concurrency change.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Agree with Medium / High.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 2: BEH-004/BEH-005, AC-004/AC-005 reconciled by DEC-005 at SR-003; AC-008 added)
- Approved requirements / intended behavior understood: Yes. Two single-meaning tools, no automatic task tool, texts never tell an agent without `update_task` to close anything, temp Tasks unchanged, configurations out of scope (DEC-004).
- Relevant existing behavior and evidence confirmed: Yes. `automaticCollaborationToolNames` adds `create_or_update_task`; one strict two-mode parser; static texts in the llm contract, mention note and three error builders; tool descriptions are static per tool.
- Scope guardrail confirmed: Yes (UC-001..UC-004; out of scope: Task semantics, project tools, 259ddae7 model changes, configurations).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, AC or preserved-behavior ID: `Yes`
- Remaining material ambiguity: None. Editorial leftover: the SCN-004 row in the requirements still lists the expected outcome as "names `update_task`". AC-004 and BEH-004 (tool-neutral) are authoritative; fix it when convenient.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | DS-001 now runs through the per-runtime step; the AutoByteus filter is removed and a resolver test added (ARCH-F-001 resolved) |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | Neutral delegation text plus guidance in `update_task`'s description satisfies REQ-005 |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | Parser split matches today's modes and error codes; `create_task` survives on all runtimes |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | AC-004 tool-neutral, consistent with REQ-005 (ARCH-F-002 resolved) |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | DEC-005: no closing sentence for any agent (AC-005); saved notes parse in every combination (AC-008) (ARCH-F-003, ARCH-F-004 resolved) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `temp-task-tool-split-proposal.md` | Pass | Pass | Pass | Pass | Pass | Round 2: SR-003 clarification maps item 4 to tool-neutral shared texts (DEC-005). DEC-004 supersedes the config-migration constraint. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change; design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | One interface for two subjects; guidance on the wrong tool; parser evidence | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes; FU-2 deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Contract, exposure, text changes mapped to files | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | exposure | Pass | Pass | N/A | Pass | Pass | Pass | Pass — extended through the per-runtime step (AutoByteus resolver / Agent Tools MCP session) |
| DS-002 | texts | Pass | Pass | N/A | Pass | Pass | Pass | Pass (outcome questions are ARCH-F-002/003) |
| DS-003 | tool call | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | errors | Pass | Pass | N/A | Pass | Pass | Pass | Pass (outcome question is ARCH-F-002) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| project-task tool contract | Pass | Pass | Pass | Pass | Native classes and MCP manifest stay thin; two parser entry points share private validators |
| runtime tool exposure | Pass | Pass | Pass | Pass | Round 2: the second AutoByteus filter is removed; the shared exposure is the only name policy |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| tools → `ProjectTaskService` | Pass | Pass | Pass | Pass | Unchanged |
| presentation contracts | Pass | Pass | Pass | Pass | Prose-only tool names |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `create_task` | Pass | Pass | Pass | Low | Pass — `status` → `TASK_CREATE_STATUS_UNSUPPORTED`, `task_id` → `PROJECT_TOOL_ARGUMENT_INVALID`, matching today's create mode |
| `update_task` | Pass | Pass | Pass | Low | Pass — `project_id` rejected, empty patch `TASK_PATCH_REQUIRED`, as today |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| create/patch semantics | Pass | Pass | N/A | Pass | `ProjectTaskService` unchanged |
| parsing | Pass | Pass | N/A | Pass | one module, two entry points |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/project-tasks`, `agent-execution/shared`, `agent-collaboration/domain`, presentation contracts, `projects` | Pass | Pass | Pass | Pass | — |
| `agent-execution/backends/autobyteus` | Pass | Pass | Pass | Pass | Filter file removed; resolver iterates requested names directly |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| description/status/context_files validation | Pass | Pass | Pass | Pass | private helpers in the contract |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectTaskToolName` union / two schemas | Pass | Pass | Pass | Pass | Pass | separate schemas remove the mode-dependent fields |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Files in Final File Responsibility Mapping | Pass | Pass | N/A | Pass | — |
| `autobyteus-collaboration-tool-exposure.ts` (Remove) / `autobyteus-agent-tool-resolver.ts` (Modify) | Pass | Pass | N/A | Pass | ARCH-F-001 resolved |
| `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | Pass | Pass | N/A | Pass | `guidanceFor(entries, delegateSentence)`; parse accepts current, frozen previous-release sentence, or saved lines (ARCH-F-004 resolved) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new files or folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `create_or_update_task` (contract, class, manifest, constant, automatic entry, texts) | Pass | Pass | Pass | Pass | — |
| `LEGACY_LOCAL_TASK_PLAN_TOOL_NAMES` / `REMOVED_TASK_DELEGATION_RESULT_TOOL_NAMES` / TASK_MANAGEMENT fallback (whole file) and its tests | Pass | Pass | Pass | Pass | Removed, with evidence that none of the names is registered; tests replaced by an AutoByteus resolver test |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Old tool name | No | Pass | Pass | No alias (DEC-002) |
| Saved `@` note parsing | No | Pass | Pass | Recognizing notes saved by earlier releases is history display, not runtime compatibility (existing `SAVED_NOTE_GUIDANCES` pattern); exact rule is ARCH-F-004 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent configurations' `toolNames` | Not Affected (out of scope, DEC-004) | Pass | Pass | N/A | Pass | Unknown names skipped by every runtime (MCP catalog, AutoByteus resolver) |
| Saved messages containing `@` notes | Directly usable (read-only parse) | Pass | Pass | N/A | Pass | AC-008 parse tests cover every combination |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Contract → exposure (incl. AutoByteus filter removal) → texts → tests/docs → release notes | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| delegation text, `update_task` description, reactivation error | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `P-001` — Messages with `@` notes composed by the current release are saved and re-parsed after upgrade

- Related approved requirement or established contract: BEH-005 preserved column ("note otherwise unchanged"); existing `SAVED_NOTE_GUIDANCES` contract ("still recognized so saved history reads unchanged").
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: the user types `@X` in a live run's composer and sends it (exposed composer surface, supported mention action).
- Support evidence: `collaboratorMentionsDtoSchema` on every live SEND_MESSAGE; server compose; web parse (`collaboratorMentionNote.parse`).
- Forward path: send → server `composeCollaboratorMentionNote` with today's `NOTE_GUIDANCE` (+ `IN_RUN_GUIDANCE` and/or run-agent sentences) → message saved → after upgrade the web reopens the run and calls `parseCollaboratorMentionNote`, which accepts only `guidanceFor(entries)` or an exact `SAVED_NOTE_GUIDANCES` line.
- Lifecycle preconditions and material consequence: if only the bare old `NOTE_GUIDANCE` is added to the saved list, saved notes whose guidance combined it with the in-run or run-agent sentences no longer parse and show as raw text.
- Reachability: `Reachable`
- Review consequence: ARCH-F-004 (round 1). Resolved in round 2 by the parameterized `guidanceFor` and AC-008.

### `P-002` — A user-configured MCP server exposes a tool named `create_task` or `update_task`

- Related approved requirement or established contract: Preserved Behavior Boundary ("first-party names stay protected against MCP collisions").
- Relevant behavior ID(s): BEH-001
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: the user configures an MCP server and selects its tool for an agent (MCP configuration surface).
- Support evidence: `agent-tool-mcp-catalog.ts`: a protected first-party adapter wins over a same-named configured MCP tool and a `configured_mcp_tool_collision` warning is logged.
- Forward path: configured tool name `create_task` → requested names → registered first-party adapter now exists → first-party route chosen.
- Lifecycle preconditions and material consequence: the agent gets the Project Task tool instead of its MCP tool. No local configuration uses either name (search of `mcps.json`, agent/team/package folders, `autobyteus-agents`).
- Reachability: `Reachable` in principle; no evidence of use.
- Review consequence: not a finding. The approved protection rule decides the outcome. Round 2: the release notes line is now in the design.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None open | — | — | Resolved (round 2) |

## Review Decision

`Pass` (round 2)

## Findings

None open in round 2. Round 1 findings ARCH-F-001..ARCH-F-004 are resolved; see `ARCH-REV-002` in the revision record.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational).

## Residual Risks

- FU-1 must ship with this release, or the Project Task Manager loses its task tools (DEC-004; release coordination).
- A third-party MCP tool named `create_task` / `update_task` is replaced by the first-party tool, with a warning in the log; the release notes now cover this.
- Same llm-contract file as Task 259ddae7; rebase order.
- Editorial: the requirements' SCN-004 expected outcome still says "names `update_task`", and the investigation notes' status line says SR-002. AC-004 / BEH-004 are authoritative; this doesn't affect implementation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Round 2 confirms the SR-003 fixes against current code and the reconciled requirements. The design is ready for implementation.
