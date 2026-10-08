# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/requirements-doc.md` (Approved, SR-003)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/investigation-notes.md` (HF-01..HF-08; AF-01..AF-18 as code map)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: `problem-report.md`, `evidence/baseline-before*` (evidence only); `handoff-architecture-design-complete.md` (SR-003)
- Relevant Solution Revision IDs: `SR-003` (supersedes `SR-002`); `SR-001` history
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Revised Architecture Design Complete (SR-003, hybrid) from `/software_engineering_team/solution_designer`, 2026-10-08, after the user reversed the SR-002 removal
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Pass on SR-002 — superseded basis)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: base `3a2496c95` read via `git show`: `claude-background-task-registry.ts`, `agy-background-task-monitor.ts`, `agy-agent-run-backend.ts`, `task-execution-idle-shutdown-schedule.ts` (arm replaces any pending timer), `team-task-execution-service.ts` `onRootEvent`, `root-team-run.ts` (publisher subscription), `agent-org-run.ts` / `standalone-agent-run-root.ts` `onAgentExecutionEvent`, `root-agent-execution-registry.ts`, `task-agent-execution-registry.ts`, `root-team-execution-directory.ts`, `flat-team-execution-manager.ts`; `git grep` at base for every `tryPrepare*IfQuiescent` implementation/caller, `AgentRunBackend`/`TeamRunBackend` implementers, and `BACKGROUND_TASK_UPDATED` routing; `git show --stat` of `ba0437e00`, `28afa0884`, `62e4edf52`, `bf5889d03`. Round-1 reads of `root-task-execution-lifecycle.ts`, `agent-run-termination.ts` still apply (base unchanged).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: a mechanical two-commit undo plus a focused addition (one required backend method ×5, two runtime queries, one quiet term, one lifecycle hook, three root forwards, one LLM sentence) → Medium. Changes the shared `AgentRunBackend` contract and the idle quiet predicate for every runtime and root kind, LLM-facing text, and a large revert on a reviewed branch → High.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Hybrid (user, 2026-10-08): no idle shutdown while any agent of a delegated copy has a running background task (Claude, AGY), no time limit (DEC-005); otherwise the 10-minute idle shutdown and grace setting stay; re-arm when the last task ends; non-reporting runtimes count as none (DEC-006); DONE/root stop/server stop unchanged; SR-002 removal fully undone outside `tickets/` (REQ-006).
- Relevant existing behavior and evidence confirmed: Yes. At base, the grace fire runs `shutdownAtHead → adapter.tryShutDownIfQuiet`; every quiet path (root agent registry, task agent registry, root team directory, task team registry → `FlatTeamExecutionManager` → member handles) reaches `AgentRunTermination.tryPrepareIfQuiescent`, which has no background term. A non-quiet fire does not re-arm (HF-07). Claude registry `view` and AGY monitor `running` map hold running tasks synchronously.
- Scope guardrail confirmed: Yes. Out of scope: the kill notice (DEC-003), Codex/native/ACP reporting, a time limit, task survival, changes to the grace setting/DONE/reactivation/root stop/restore.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none raised).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass — Claude `run_in_background` → registry `view` entry `running`; grace fire → quiet check | Pass — DS-001: `hasRunningBackgroundTasks()` true → `tryPrepareIfQuiescent` returns `null` → skip | Confirmed | None |
| BEH-002 | System | Pass | Pass — AGY `track(steps)` at turn end → `running` map | Pass — DS-001 | Confirmed | None |
| BEH-003 | System | Pass | Pass — terminal `BACKGROUND_TASK_UPDATED` already reaches all three root handlers (Team `TeamRunEvent` via `root-team-run.ts` subscription; Org/Standalone `agent_run` events); only `AGENT_STATUS` is forwarded today | Pass — DS-002: hook → `armLive(chain)`; `schedule.arm` replaces any pending timer with now + grace, so AC-004 "one grace period after the end" holds; Claude also re-arms via idle after its completion turn | Confirmed | None |
| BEH-004/006/007 | System/Operational | Pass | Pass — Codex/AutoByteus/ACP return `false`; grace setting untouched after undo | Pass | Confirmed | None |
| BEH-008 | System | Pass | Pass — root stop uses `fenceForRootShutdown`/`isRootShutdownQuiescent`; DONE uses `forceTerminate`/`prepare`; neither calls `tryPrepareIfQuiescent` | Pass — design forbids the term in those paths | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `problem-report.md` | Pass | Pass | Pass | Pass | Pass (evidence only) | None |
| `evidence/baseline-before*` | Pass | Pass (AC-001, design) | Pass | Pass (base run killed at 60 s grace; base idle code equals the restored code) | Pass (historical evidence) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug Fix | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant`: the quiet owner exists and is shared by all idle paths, but omits runtime-owned work (verified) | None |
| Refactor decision is explicit | Pass | No refactor beyond the undo | None |
| Refactor decision is supported by concrete design sections | Pass | Term at the existing owner, required backend query, reuse of `armLive`; alternatives (snapshot field, per-task timer, term in root-shutdown check) rejected with reasons | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Grace fire → skip/shutdown | Pass | Pass | Pass | Pass | Pass (`AgentRunTermination` decides quiet) | Pass | Pass |
| DS-002 | Task end → re-arm | Pass | Pass | Pass (`TeamTaskExecutionService.onRootEvent` thin) | Pass | Pass (lifecycle owns scheduling) | Pass | Pass |
| DS-003 | Runtime task state | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunBackend.hasRunningBackgroundTasks()` | Pass | Pass (registry/monitor stay behind the backend) | Pass (lifecycle/adapters forbidden from reading runtime state) | Pass | — |
| `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded` | Pass | Pass (schedule stays internal) | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunTermination` → backend `Pick` | Pass | Pass (no term in `isRootShutdownQuiescent`, `prepare`, root fence) | Pass | Pass | — |
| Roots → lifecycle hook | Pass | Pass (roots never touch the schedule) | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunBackend.hasRunningBackgroundTasks(): boolean` (required) | Pass | Pass | Pass (backend instance) | Low | Pass |
| `ClaudeBackgroundTaskRegistry.hasRunningTasks()` / `AgyBackgroundTaskMonitor.hasRunningTasks()` | Pass | Pass | Pass | Low | Pass |
| `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded(agentRunId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Running-task knowledge | Pass | Pass (extend registry/monitor) | N/A | Pass | — |
| Quiet decision | Pass | Pass (extend single quiet owner) | N/A | Pass | — |
| Re-arm | Pass | Pass (reuse `armLive`, which checks `isLive`) | N/A | Pass | — |
| Event intake | Pass | Pass (extend existing root handlers) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/*` | Pass | Pass | Pass | Pass | — |
| `agent-execution/domain/agent-run-termination.ts` | Pass | Pass | Pass | Pass | — |
| `agent-collaboration/execution/task` lifecycle | Pass | Pass | Pass | Pass | — |
| Team/Org/Standalone root handlers | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

N/A — no structure added or extracted.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRuntimeLifecycleSnapshot` (deliberately not extended) | Pass | Pass | Pass | N/A | Pass | Dedicated method keeps the status snapshot single-purpose |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend files (5), registry, monitor, session | Pass | Pass | N/A | Pass | — |
| `agent-run-termination.ts` | Pass | Pass | N/A | Pass | Term inside the dispatch-queue callback next to the other terms |
| `root-task-execution-lifecycle.ts` | Pass | Pass | N/A | Pass | — |
| Root handlers (3) | Pass | Pass | N/A | Pass | — |
| `agent-team-collaboration-llm-contract.ts` + docs | Pass | Pass | N/A | Pass with note | AR-N-001: `prompt_engineering.md` mirror not listed |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Edits in place; no new files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-002 removal (`28afa0884`, `bf5889d03`) outside `tickets/` | Pass | Pass (base code + hybrid) | Pass — revert, restore `tickets/`, keep `ba0437e00` and the Claude E2E file, verify with `git diff 3a2496c95 -- . ':!tickets'` | Pass | `28afa0884` also touched `autobyteus-web` (`task-agent-monitor-visibility.page.vue`, `agentOrgContextHydration.spec.ts`, web docs) and renamed `task-agent-resource-quiet-generation.test.ts`; the full revert covers them and the diff check proves it. `62e4edf52` is tickets-only |
| Untracked stopped-round API/E2E files | Pass | N/A | Pass (not committed by implementation) | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| SR-002 residue | No (full undo; no kept `withLiveChain` rename, no flag) | Pass | Pass | — |
| Backend method | No (required, explicit `false`) | Pass | Pass | — |

## Persisted-Data Transition Verdict

N/A — `Not Affected`: background state is runtime-only; the grace setting is restored unchanged.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Undo first, verify base-green, then hybrid steps 2–6 | Pass | Pass (none) | Pass | Pass |
| Concurrency | Pass — the term is read synchronously inside the run's dispatch queue with the other quiet terms; a background task starts only within a turn (already non-quiet); `arm` replaces pending timers; the hook arms only live copies and is a no-op once admission closes (root stop), so Claude `clear()` → `stopped` during DONE/root stop is harmless (R-3); idle shutdown itself proceeds only with no running task, so its own `clear()` publishes nothing | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Quiet term placement | Yes | Pass | Pass | Pass | — |
| Signal shape | Yes | Pass | Pass | Pass | — |
| Re-arm | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

None. Missed terminal frames and never-ending AGY daemons are accepted residual behavior under QR-002/DEC-005, not review premises, and the design adds no machinery for them.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

No blocking findings.

### AR-N-001 — LLM-contract mirror doc and golden tests (Low; carried over, re-scoped to SR-003)

- Protects: REQ-005 / AC-008.
- Evidence: `git grep "stays quiet" 3a2496c95` finds the rule in two server docs that are not in the SR-003 doc list: `autobyteus-server-ts/docs/modules/prompt_engineering.md` l.250, which mirrors the contract sentence exactly, and `autobyteus-server-ts/docs/modules/agent_tools.md` l.313–314 ("A child that stays quiet is shut down after the grace period …"). The test that pins the text is `tests/unit/agent-team-execution/member-collaboration-instruction-provider-parity.test.ts`, which asserts "A copy that stays quiet is shut\ndown after a while". The new sentence's line wrap may break that assertion.
- Required update (implementation): mirror the new sentence in `prompt_engineering.md` and add the background-task exception to `agent_tools.md`. Update the parity assertion, and any contract golden test, to the new wording.
- Proportionate: keeps the agent-facing contract and its documentation identical.

AR-N-002 — Obsolete (SR-002 removal reverted). AR-N-003 — Resolved (investigation Meta at SR-003, SR-002 sections marked history, requirements cite AC-001..008 which now exist).

## Classification

N/A — Pass.

## Recommended Recipient

`/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- A runtime that never reports a task's end, or a never-ending AGY daemon, keeps the copy and its process live until DONE, root stop or server stop (QR-002, DEC-005, accepted).
- Large revert on a reviewed branch: the `git diff 3a2496c95 -- . ':!tickets'` check plus restored base tests are the safety net; the downstream code review should check the diff against base, not against HEAD.
- AC-001 live Claude E2E needs a ≥ 90 s background task with grace at 60 s; record environment limits per TESTING.md if it cannot run.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: The hybrid adds the missing invariant at the single quiet owner that every idle path already passes through; explicit stops are untouched. Apply AR-N-001 during implementation.
