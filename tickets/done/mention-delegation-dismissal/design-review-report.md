# Design Review Report — mention-delegation-dismissal

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/requirements-doc.md` (SR-003, Approved 2026-10-06)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/investigation-notes.md` (E-01..E-36)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: None exist (handoff `handoff-architecture-design-complete.md` read as routing context)
- Relevant Solution Revision IDs: SR-003 (requirements), SR-004 (design), SR-005 (design revision for ARCH-REV-001)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Revised architecture package SR-005 (response to ARCH-REV-001 `Fail — Design Impact`), Large / High
- Prior Review Round Reviewed: Round 1 (ARCH-REV-001, `Fail`, AR-001; non-blocking R-1, R-2)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Round 2 rechecked the SR-005 design-spec changes (DS-001, DS-002, DS-006, ownership map, interface mapping, file mapping, note example). Requirements unchanged since approval (requirements-doc.md not modified after SR-003). Round 1 code evidence still applies: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal` at `3c8e49ad5` (no source changes). Read: `root-task-execution-lifecycle.ts`, `root-task-dispatch.ts`, `task-agent-resource-port.ts`, `root-task-agent-resource-scope.ts`, `project-task-service.ts`, `task-agent-resource-service.ts`, `task-agent-resource-store.ts`, `projects-layout.ts`, `project-store.ts` (findTask / migration gate), `project-task-agent-resource-composition.ts`, `collaborator-admission.ts`, `standalone-root-message-delivery.ts`, `agent-run-command-coordinator.ts`, `runtime-agent-tool-exposure.ts`, `autobyteus-collaboration-tool-exposure.ts`, `project-task-tool-contract.ts`, `project-task-tool-manifest.ts`, `project-task-native-tools.ts`, `task-delegation-result-contract.ts`, `agent-team-collaboration-llm-contract.ts`, the three delete owners, `root-execution-identity.ts`; web `docs/chat.md` §`@` In A Live Run; repo `DESIGN.md`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: six server subsystems plus presentation contracts and docs; two public tool contracts change (one breaking); new persisted root; widened Task port; new dependency direction (run-history → projects); automatic tool exposure on every runtime. Confirmed against code.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. `@` resolves without admission and steers to `delegate_task`; unowned described delegation creates a text-only Project-less Task and returns `task_id`; `create_or_update_task` update is `task_id`-only and works for both Task kinds; DONE semantics identical; automatic tool exposure; cleanup on permanent run delete; Projects migration gate not inherited.
- Relevant existing behavior and evidence confirmed: Yes. E-21 (unowned described branch sets no `join`, `root-task-execution-lifecycle.ts:102-109`), E-33 (`linkAgentRun` returns `{taskId}`, discarded at `root-task-dispatch.ts:41-44`), E-24 (DONE = `closeTask` → status write → `release`, `project-task-service.ts:112-122`), E-25 (`findTask` → `listProjects` gated), E-28/E-29 (all `@` admission callers; additionally the standalone command-coordinator path reaches `postToHost` → `admitMentions`, which the file mapping covers), E-30 (AutoByteus, Claude and Codex/MCP all derive from `buildRuntimeAgentToolExposure`).
- Scope guardrail confirmed: In-Scope UC-001..004; Out of Scope list; Preserved Behavior Boundary (BEH preserved columns, REQ-010/011/012, AC-011..014, and the cross-cutting invariant "linked `delegate_task(task_id)` and Project Task DONE behave exactly as today"); Review Authority.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no open blocking findings; AR-001 resolved).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (E-01, E-28, E-29) | Pass (DS-001) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass (E-04) | Pass (DS-001; note guidance now conditional on a returned `task_id`, R-1 adopted) | Confirmed | — |
| BEH-003 | Contract | Pass (linked mode unchanged per AC-014; `task_id` only for the created ad-hoc Task) | Pass (E-11, E-13, E-21, E-33) | Pass (DS-002) | Confirmed | — |
| BEH-004 | Contract | Pass | Pass (E-14, E-17, E-18, E-31) | Pass (DS-003) | Confirmed | — |
| BEH-005 | System | Pass | Pass (E-05, E-07, E-24) | Pass (DS-003, DS-005) | Confirmed | — |
| BEH-006 | Operational | Pass | Pass (E-30; AutoByteus via `requestedToolNames`, Claude/Codex via `enabledProjectTaskToolNames`) | Pass (DS-004) | Confirmed | — |
| BEH-007 | System | Pass | Pass (E-07, E-21) | Pass (DS-002 branch) | Confirmed | — |
| BEH-008 | Operational | Pass | Pass (E-19, E-34) | Pass (DS-006; single-host-root invariant stated and holds by construction) | Confirmed | — |
| BEH-009 | Compatibility | Pass | Pass (E-02) | Pass (unchanged path) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change, design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` — the unowned described branch has no closable owner (verified at `root-task-execution-lifecycle.ts:102-109`); `@` entries have no lifecycle end (E-03) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Yes (bounded)"; deferral of agent-initiated bring-in named | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Update boundary split (`updateTaskById`), shared DONE closure extraction, location type widening, mention resolution replacement all appear in the file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | `@` send | Pass | Pass (both entries named: stream handlers and standalone `AgentRunCommandCoordinator.post → postUserMessage → postToHost`, R-2 adopted) | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Described delegation | Pass | Pass | Pass (runtime → neutral port → `ProjectTaskService`) | Pass | Pass | Pass | Pass |
| DS-003 | DONE by ID | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Tool exposure | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Closure publication | Pass | Pass (unchanged) | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Retention | Pass | Pass | Pass | Pass | Pass (single-host-root invariant explicit) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectTaskService` (Task subject + port) | Pass | Pass (`AdHocTaskStore`, `TaskAgentResourceService` behind it) | Pass | Pass | Tools, runtime port and delete owners all enter here |
| `TaskAgentResourcePort` | Pass | Pass (runtime passes `adHocTask` content, gets opaque `taskId`) | Pass | Pass | Port remains neutral |
| Roots (`resolveCollaboratorMentions`) | Pass | Pass | Pass | Pass | Stream handlers / coordinator keep calling roots only |
| `CollaboratorAdmission` | Pass | Pass | Pass | Pass | `resolveMentions` reuses `plan()`; `ensure` stays for bring-in |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| run-history / org delete owners → `ProjectTaskService` | Pass | Pass (no stores/layouts; `projects/` never imports run-history) | Pass | Pass | Best-effort, after commit |
| `agent-collaboration` → port | Pass | Pass | Pass | Pass | — |
| Tool manifest → `ProjectTaskService` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `CollaboratorAdmission.resolveMentions` | Pass | Pass | Pass | Low | Pass |
| `TaskAgentResourceLinkInput` assigned `{taskId} \| {adHocTask}` | Pass | Pass | Pass | Low | Pass |
| `DelegateTaskResult` with optional `task_id` | Pass | Pass (`task_id` only when the delegation created an ad-hoc Task; linked result unchanged) | Pass | Low | Pass |
| `TaskAgentResourcePort.resolveAssignment(taskId)` | Pass (unchanged, Project Tasks only; ad-hoc ID → `TASK_NOT_FOUND`) | Pass | Pass | Low | Pass |
| `ProjectTaskService.updateTaskById` vs `updateTask` | Pass (split by identity shape) | Pass | Pass | Low | Pass |
| `ProjectTaskService.deleteAdHocTasksHostedBy(hostRoot)` | Pass | Pass | Pass | Low | Pass |
| `create_or_update_task` two strict modes | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Closure / fencing / hiding | Pass | Pass (one DONE authority) | N/A | Pass | Rejects a second `closedAt` mechanism |
| Ad-hoc persistence | Pass | Pass | Pass (`AdHocTaskStore`, `AdHocTasksLayout`) | Pass | Kept outside the Projects root and gate |
| Mention address resolution | Pass | Pass (reuses `plan()`) | N/A | Pass | — |
| Tool exposure | Pass | Pass (`automaticCollaborationToolNames`) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects/` | Pass | Pass | Pass | Pass | `ProjectTaskService` now also owns Project-less Tasks; name drift accepted (Residual risk) |
| `agent-collaboration/` | Pass | Pass | Pass | Pass | — |
| roots / stream handlers | Pass | Pass | Pass | Pass | — |
| run-history / org delete | Pass | Pass | Pass | Pass | — |
| agent-tools / agent-execution shared | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskLocation` | Pass | Pass | Pass | Pass | Replaces `TaskAgentResourceLocation` in place |
| Path segment helpers | Pass | Pass | Pass | Pass | Exported from `projects-layout.ts` |
| Shared DONE closure | Pass | Pass | Pass | Pass | One bounded local spine for both Task kinds |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AdHocTask` record | Pass | Pass (no projectId, contextFiles, hostRoot) | Pass | Pass (no shared base with `ProjectTask`) | Pass | — |
| `TaskLocation.projectId: string \| null` | Pass (`null` = Project-less) | Pass | Pass | N/A | Pass | — |
| Task ack `{projectId \| null, taskId, status}` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ad-hoc-task.ts`, `ad-hoc-tasks-layout.ts`, `ad-hoc-task-store.ts` | Pass | Pass | N/A | Pass | — |
| `task-agent-resource-store.ts` / `-service.ts` | Pass | Pass | Pass | Pass | — |
| `project-task-service.ts` | Pass | Pass | Pass | Pass | `resolveAssignment` and linked `uniqueTask` stay Project-only |
| `root-task-dispatch.ts` | Pass | Pass | N/A | Pass | `task_id` added only for the `adHocTask` join variant |
| `agent-team-collaboration-llm-contract.ts` | Pass | Pass | N/A | Pass | "A description-only delegation that creates a Task returns its `task_id`"; `DELEGATE_TASK_ID_DESCRIPTION` unchanged |
| Others in the mapping | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New `projects/{domain,stores}/ad-hoc-*` | Pass | Pass | Low | Pass | Flat beside Project counterparts, justified |
| `<appData>/ad-hoc-tasks/` | Pass | Pass (outside `ProjectsLayout` root, E-26) | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `admitCollaboratorMentions` / `admitMentions` (3 roots) | Pass | Pass | Pass | Pass | — |
| `project_id` in update mode | Pass | Pass | Pass | Pass | — |
| Tests / web probes asserting `@` admission | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `create_or_update_task` update mode | No | Pass | Pass | No "ignore project_id" fallback |
| `@` admission | No | Pass | Pass | No flag |
| Mention note parser (older guidance lines) | No (display of saved messages, approved by BEH-002 preserved column) | Pass | Pass | — |
| Ad-hoc-then-Projects lookup in `updateTaskById` | No (two subjects, not two versions) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<appData>/ad-hoc-tasks/` (new) | Not Affected (additive) | Pass | Pass | N/A | Pass | Data Migration Guideline §2 answered |
| `agent_run_resources.json` format | Directly usable (unchanged) | Pass | Pass | N/A | Pass | Only the in-code location type widens |
| Project Tasks, run trees, collaborator entries | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Projects → runtime → tools → `@` → delete hooks → docs | Pass | Pass (none needed) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Note text, delegation call/result, `task.json`, DONE ack | Yes | Pass | Pass (second closure mechanism rejected) | Pass | Note example now conditional (R-1) |

## Material Premise Validation (Only When Needed)

### `MP-001` — An ad-hoc Task can host copies in more than one host root

- Related approved requirement or established contract: REQ-006 (closed forever), REQ-009 (delete with hosting run)
- Relevant behavior ID(s): BEH-005, BEH-008
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: none established. Under the approved basis, only described `delegate_task` creates an ad-hoc Task, and its assigned copy plus the copy's `delegated`/`broughtIn` sub-work all link with `hostRoot = target.root` of the delegator's root (`root-task-dispatch.ts:41`). A second root can link to the same ad-hoc Task only through the design's ad-hoc-aware `resolveAssignment` (linked `delegate_task({task_id: ad_hoc_…})`), i.e. the mechanism under review.
- Support evidence: no approved requirement or scenario for linked delegation of a Project-less Task; a user pasting an ad-hoc ID into another run has no approved goal.
- Forward path: N/A without the mechanism.
- Lifecycle preconditions and consequence: if it occurred, `deleteAdHocTasksHostedBy(rootA)` would delete the whole folder including root B's closed entries, unfencing root B's DONE copies after restart.
- Reachability: `Not Reachable` under the approved basis (circular witness otherwise).
- Review consequence: does not drive a finding. SR-005 keeps `resolveAssignment` Project-only and states the DS-006 single-host-root invariant, so the premise remains unreachable by construction.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the behavior basis is confirmed, AR-001 is resolved, R-1 and R-2 are adopted, and no in-scope machinery depends on an unsupported premise. Ready for implementation.

## Findings

None open. AR-001 is resolved in SR-005 (see `architecture-review-revision-record.md`, ARCH-REV-002). R-1 and R-2 were adopted.

Implementation notes (non-blocking):
- In `dispatchTaskCopy`, decide whether to return `task_id` from the join variant (`adHocTask`), not from the presence of a returned `taskId`. Linked joins also return `{taskId}` from the port.
- Tests should cover `delegate_task({recipient_address, task_id: "<ad-hoc id>"})` → `TASK_NOT_FOUND`, and a linked result that stays exactly `{target_agent_run_id}` (AC-014).

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Breaking update-mode contract for the agent-repository Project Task Manager skill (separate repo); coordinated update required (already recorded by design).
- Delegated copies become Task-owned; cross-Task copy-to-copy messaging fails (approved consequence).
- Orphan ad-hoc `task.json` after a crash between create and link (interrupted execution; out of scope by default).
- `ProjectTaskService` / `projects/` now also own Project-less Tasks; the name no longer describes the full subject. Acceptable for this scope; consider a rename in a later cleanup.
- A described-delegation dispatch failure after the link leaves an ad-hoc Task with a failed assignment and no returned `task_id`. Same recorded-failure semantics as linked mode today; it is removed with the run.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 `Not Reachable`; the SR-005 invariant makes it unreachable by construction)
- Notes: Round 2 rechecked AR-001, R-1 and R-2 against SR-005. Unaffected verdicts from round 1 remain valid.
