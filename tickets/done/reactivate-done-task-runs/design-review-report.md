# Design Review Report — `reactivate-done-task-runs`

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/requirements-doc.md` (SR-002, Approved 2026-10-07)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: None (the package declares none)
- Relevant Solution Revision IDs: `SR-002` (supersedes `SR-001`)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: `Architecture Design Complete` for SR-002 from `/solution_designer` (2026-10-07), after the user's behavior change
- Prior Review Round Reviewed: Round 1 / `ARCH-REV-001` (SR-001, `Fail`). It completed before SR-001 was withdrawn.
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: The same worktree at `origin/personal@cfeda548` (no code changes since round 1). The round-1 code reads remain valid:
  - Task side: `task-agent-resources.ts`, `task-agent-resource-service.ts`, `project-task-service.ts`, `task-agent-resource-release.ts`;
  - runtime: lifecycle, queue, adapter, resource scope; backends `root-agent-execution-registry.ts`, `configured-agent-execution-handle.ts`, `root-team-execution-directory.ts`, `team-run.ts`, `task-agent-execution-registry.ts`; router; facades; delivery;
  - web closure consumers; `autobyteus-ts` `tool-phase.ts`.
  - Re-read in round 2: `project-task-service.ts` status writers (only DONE goes through `serialize`); `standalone-root-task-execution-adapter.ts` `planActivation` (copies are placed by address with fresh run IDs, so a reactivated worker can bring in a new helper at an address a closed helper still occupies).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: Yes. SR-002 removes the status write and the send-result field. The change still spans the Task side, the lifecycle, three root adapters and their backends, three event types and projectors, two stream-contract packages, the `delegate_task` contract and the web. It still reverses "closed is forever", changes a persisted transition and the ownership fence, and involves concurrency with DONE and release.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The agent alone changes Task status. After the agent moves a DONE Task back to TODO/IN_PROGRESS, the assigner's run-ID message reactivates exactly that `assigned` entry (agent, or team via its coordinator). The worker is restored with its conversation and its rows reappear. While the Task is DONE, the message is refused with a reopen-first hint and nothing changes. Helpers stay closed. Only the assigner may reactivate. `delegate_task` gains `target_kind`, and the `send_message_to` schema is unchanged.
- Relevant existing behavior and evidence confirmed: Yes.
  - Setting TODO/IN_PROGRESS goes through `updateTask`/`updateTaskById` without `serialize`, closes nothing and starts nothing.
  - DONE closes the entries and writes the status inside `serialize` (`closeTask(afterClose)`), then fires an async release.
  - A late release re-checks `isClosed` (`releaseTaskAgentResources`).
  - The fence asks `ownerOf`/`isOpen`.
  - A run-ID send enters `senderRoot.deliverExactAgentMessage` and goes `withLiveLease(sender)` → `deliverToRunId` → `withLiveLease(target)` → restore.
  - A released root-agent handle stays in `active` and is reused by `restoreTask`. `TeamRun` short-circuits on its released/direct key sets.
  - The web replaces its closed set from snapshots and merges it from live events.
- Scope guardrail confirmed: Yes. Out of scope: any automatic status change, UI reactivation, helper reopen, reactivation on a status change, team run ID, `project-manager-ux`, changing DONE. Invariants: only agents change status; no input while the entry is closed; reactivation deletes nothing.
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking findings remain)
- Remaining material ambiguity, if any: None

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — (AR-002 non-blocking) |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Contract | Pass | Pass | Pass | Confirmed | — (AR-003 non-blocking) |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Behavior Change` | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`. The latent discard gap is verified in the registries and `TeamRun` | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `No` | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Existing owners are extended along their seams. A single lifecycle owner avoids repeated coordination | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Agent reopens the Task, then the assigner's message → delivered result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Reopened event → client closed set | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Snapshot/history `closed_task_executions` | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | `delegate_task` `target_kind` | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-L1 | Reactivation sequence in the lifecycle | Pass | Pass (AR-002 note) | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskAgentResourcePort` (`ProjectTaskService`) | Pass | Pass | Pass | Pass | Owns the not-DONE precondition; never writes status here |
| `RootTaskExecutionLifecycle` | Pass | Pass | Pass | Pass | Facades stay thin |
| `RootTaskExecutionAdapter` | Pass | Pass | Pass | Pass | Backend discard sits behind the adapter |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime ↔ Task side | Pass | Pass | Pass | Pass | Port only; no `projects/*` import |
| Lifecycle → backends | Pass | Pass | Pass | Pass | Adapter only |
| Web | Pass | Pass | Pass | Pass | Event or snapshot only |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `assertReopenable` / `reopenAssignment` | Pass | Pass | Pass | Low | Pass. `reopenAssignment` re-reads status under `serialize`, so a racing DONE is entirely before or after |
| `deliverToExactTarget` | Pass | Pass | Pass | Low | Pass |
| `taskExecutionWithIngress` | Pass | Pass | Pass | Low | Pass. May reuse the adapter's existing index lookup and `ingressAgentRunId` (the helpers behind `taskExecutionAt`) |
| `discardReleasedExecution` | Pass | Pass | Pass | Low | Pass (AR-002) |
| `publishTaskExecutionsReopened` | Pass | Pass | Pass | Low | Pass |
| `send_message_to` result (message note only); `delegate_task` `target_kind` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Status change | Pass | Pass | N/A | Pass | The existing `create_or_update_task`, unchanged |
| Restore with conversation | Pass | Pass | N/A | Pass | Existing `acquireAtHead` restore |
| Per-Task ordering with DONE | Pass | Pass | N/A | Pass | `serialize(taskId)` |
| Runtime serialization | Pass | Pass | Pass | Pass | Queue command `reopen` |
| Live visibility | Pass | Pass | Pass | Pass | Symmetric event |
| Discard of released authority | Pass | Pass | Pass | Pass | No current operation exists |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projects` | Pass | Pass | Pass | Pass | The allocation row still says "status and entry writes" (AR-004 wording) |
| `agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | — |
| Root subsystems + backends | Pass | Pass | Pass | Pass | Escalation trigger retained |
| Projectors + contract packages | Pass | Pass | Pass | Pass | — |
| `autobyteus-web` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Reopened-event reference payload | Pass | Pass | Pass | Pass | Reuses the closed-event DTOs |
| Web closure set operations | Pass | Pass | Pass | Pass | `removeReopenedTaskExecutions` sits beside `mergeClosedTaskExecutions` |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskAgentResource.closedAt` | Pass | Pass | Pass | N/A | Pass | — |
| `target_kind` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Task-side domain/service/port | Pass | Pass | N/A | Pass | — |
| Lifecycle (+ optional `root-task-reactivation.ts`) | Pass | Pass | N/A | Pass | — |
| Adapters ×3, backends | Pass | Pass | N/A | Pass | — |
| Events, projectors, contracts, web | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All changes in existing files and folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| "Closed is forever" comment and docs | Pass | Pass | Pass | Pass | — |
| Agent-facing "for good" / "unless its Task is DONE" | Pass | Pass | Pass (one docs mirror missing, AR-003) | Pass | `docs/modules/prompt_engineering.md:251` |
| Monotonic-only client closure | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Reactivation for old and new entries | No | Pass | Pass | One rule for all entries |
| DONE and status paths | No | Pass | Pass | Unchanged byte-for-byte (AC-014) |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agent_run_resources.json` (`closedAt` → `null` on one entry) | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Strict reader accepts `null \| string`. One atomic `store.update` under `serialize`; the view swap updates the fence and snapshots |
| `task.json` | Not affected by this feature | Pass | Pass | N/A | Pass | Status is written only by the agent's tool calls |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass | Pass | Pass | Pass. Step 7 should also name AC-015 (AR-004) |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Facade, result note, too-early refusal, non-assigner refusal | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `P-001` — Restore fails after the reactivation commit (rechecked under SR-002)

- Related approved requirement or established contract: REQ-006 (SR-002). Its refusal cases are a deleted Task, a never-started assignment, or a saved conversation that is unavailable. The existing coded wake failure is `TASK_EXECUTION_RESTORE_FAILED`.
- Relevant behavior ID(s): BEH-001
- Initiating basis kind: `Contract` / `System`
- Trigger and forward path: The agent reopens the Task, then the assigner sends the message. DS-L1 steps 1–3 pass, including the conversation check. Step 4 commits the entry open. Step 6 `restoreChain` throws, giving `TASK_EXECUTION_RESTORE_FAILED`.
- Lifecycle preconditions and material consequence: The entry is open and the worker is offline. The Task status is whatever the agent set (the software no longer writes it). The result message says what happened. This matches the existing state of an open worker whose idle wake failed, and no longer contradicts REQ-006, whose pre-check cases are all detected before the commit.
- Reachability: `Reachable`
- Review consequence: None. AR-001 is resolved by the approved SR-002 REQ-006.

### `P-002` — Two concurrent reactivating messages from the assigner to the same closed entry (carried forward)

- Related approved requirement or established contract: REQ-001/REQ-002; the design's DS-L1 claim that `reopen` "never races wake"
- Initiating basis kind: `User` (agent as actor)
- Independent trigger: The assigner issues two `send_message_to` calls to the same run ID in one turn.
- Support evidence: The native `autobyteus-ts` tool phase is sequential (`tool-phase.ts:28-32`). The `claude`/`codex` runtime backends may issue tool calls concurrently; there is no evidence either way.
- Forward path: Message 2's `reopen` command runs after message 1's target wake has restored a fresh handle. Message 2's `discardReleasedExecution` then invokes the exact release on that fresh handle.
- Reachability: `Unclear` (timing and runtime dependent)
- Review consequence: Non-blocking AR-002 (a cheap guard inside the owner, no new state).

### `P-003` — A racing DONE publishes "closed" before "reopened"

- Reachability: `Not Reachable` in normal execution. Step 5 runs synchronously after the commit. DONE's queued operation needs file I/O and an async release before the root publishes "closed". Snapshots replace the client set in any case.
- Review consequence: None.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

### AR-002 — The `reopen` command at queue head should not release a copy that is already reactivated (non-blocking; carried forward)

- Type: `Design Impact` (non-blocking recommendation)
- Severity: Low
- Protected requirement: REQ-002 (supports it)
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Evidence: `discardReleasedExecution` first awaits the exact release. Registry `releaseTask` cancels and releases whatever handle is in `active` (`root-agent-execution-registry.ts` `cancelTask`/`releaseTask`; `task-agent-execution-registry.ts` `cancel`/`release`).
- Material premise: P-002 (Unclear)
- Recommended update (implementation guidance): At the `reopen` queue head, re-check the Task-side `isOpen(reference)` and skip the discard if the entry is already open. This is sufficient because commit and the target wake are both ordered after the `reopen` command. Alternatively, limit the discard to authority that is already fenced or terminated. Add a unit test.
- Recommended recipient: `/implementation_engineer` (guidance); `/solution_designer` informational

### AR-003 — Docs mirror of the LLM-contract text is missing from the removal list (non-blocking; carried forward)

- Type: `Design Impact` (non-blocking)
- Severity: Low
- Protected requirement: REQ-011 / AC-013; BEH-008
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Evidence: `autobyteus-server-ts/docs/modules/prompt_engineering.md:251` repeats "follow-ups remain possible unless its Task is DONE".
- Recommended update: Update that file together with the other docs listed for REQ-011.
- Recommended recipient: `/implementation_engineer` (guidance)

### AR-004 — Stale SR-001 wording in the design and records (non-blocking, new)

- Type: `Design Impact` (non-blocking documentation accuracy)
- Severity: Low
- Protected requirement: REQ-003 (no status write); AC-015
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Evidence:
  - The design-spec Subsystem Allocation row for `projects` says "Eligibility, status and entry writes".
  - The design-spec size rationale says "two tool result contracts".
  - Persisted-data checklist item 7 says "one or two file writes".
  - Change sequence step 7 lists AC-001..014 but omits AC-015.
  - The solution revision record says the SR-001 review "stopped before completion", and the handoff says "Prior review artifacts: N/A — first review". In fact ARCH-REV-001 completed with `Fail` before the stop (see the architecture review revision record).
- Recommended update: Implementation must follow REQ-003: never write status. API/E2E coverage must include AC-015. The wording can be corrected at the next solution revision; no rework is needed now.
- Recommended recipient: `/implementation_engineer` (guidance); `/solution_designer` informational

## Classification

- N/A (Pass). The remaining findings are non-blocking.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Backend released state for team-hosted and nested task Teams is verified during implementation, under the design's escalation trigger. Code facts for the implementer:
  - `RootAgentExecutionRegistry.active` keeps the disposed handle after a release. `taskPreparations` is cleared only on an accepted release with a handle.
  - `TeamRun.releaseDirectTaskExecution` short-circuits on `releasedTaskExecutions`.
  - `inheritReleasedTaskExecutionProof` copies both key sets into a new host generation, so the discard must clear the reference's keys in the current host generation.
- A late DONE release is safe after a reactivation commit, because `releaseTaskAgentResources` re-checks `isClosed`. If a later change removes that re-check, this safety is lost.
- A restore failure after the commit leaves an open, offline worker (accepted by the design; consistent with REQ-006 under SR-002).
- Follow-up outside this repository: the agent repository's `project-task-management` skill text.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001 is Reachable and consistent with SR-002. P-002 is Unclear and is only non-blocking guidance. P-003 is Not Reachable.
- Notes: SR-002's behavior basis is confirmed. The design is ready for implementation, with AR-002..004 as implementation guidance.
