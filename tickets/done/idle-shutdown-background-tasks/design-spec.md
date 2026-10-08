# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (replaces the SR-002 removal design; that version is in git at commit `28afa0884` and indexed in `solution-revision-record.md`)
- Approved requirements baseline: `requirements-doc.md` at SR-003, approved by the user 2026-10-08 ("i think hybrid is better", "lets use hybrid approach")
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` in this folder (HF-01..HF-08; AF-01..AF-18 as idle-shutdown code map)
- Authorities read (2026-10-08, this conversation): `references/architecture-design.md`, `design-principles.md`, repo-root `DESIGN.md`. No closer `DESIGN*.md`. No persisted data changes, so the migration guideline does not apply.
- Project design-principle conflicts: none.

## Current-State Read

Base behavior (`3a2496c95`): `RootTaskExecutionLifecycle` arms a grace timer per delegated copy when an agent in it reports `idle/offline/error`. On fire it queues a `shutdown` command that calls `adapter.tryShutDownIfQuiet`, which descends to `AgentRun.tryPrepareTerminationIfQuiescent` → `AgentRunTermination.tryPrepareIfQuiescent`. "Quiet" = no input dispatch, interrupt reservation, active turn, pending command or queued input. Runtime background tasks are not considered (root cause). A non-quiet fire does nothing; only a later status change or lease release re-arms (HF-07).

Runtime background state already exists: `ClaudeBackgroundTaskRegistry` (owned by `ClaudeSession`) and `AgyBackgroundTaskMonitor` (owned by `AgyAgentRunBackend`) track running tasks and emit `BACKGROUND_TASK_UPDATED` (HF-01, HF-02). All three root kinds receive that event but forward only `AGENT_STATUS` to the lifecycle (HF-04).

Branch state: the SR-002 removal is committed on `codex/idle-shutdown-background-tasks` (`28afa0884`, `bf5889d03`) and must be undone (HF-08, REQ-006).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: undo of two commits outside `tickets/` (mechanical), then a focused addition: one backend-contract method with five implementations, two runtime accessors, one quiet-check term, one lifecycle hook, three root event forwards, one LLM-contract sentence, docs and tests.
- Architectural risk: `High`
- Risk rationale: changes the shared `AgentRunBackend` contract and the idle quiet predicate used by every runtime and all three root kinds (lifecycle/concurrency surface); changes LLM-facing text; plus a large revert on an already-reviewed branch.
- Escalation trigger: if the background signal is needed anywhere other than idle shutdown (e.g. root stop or DONE), or a runtime cannot answer synchronously, return a Design Impact.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision |
| --- | --- | --- | --- |
| Code | HF-01, HF-02 | Claude/AGY know running tasks synchronously | Backend accessor reads them |
| Code | HF-03 | Five backends implement `AgentRunBackend` | Required method; non-reporting runtimes return `false` |
| Code | HF-05 | Only idle shutdown uses `tryPrepareIfQuiescent` | Put the term there only |
| Code | HF-06 | Team quiet = all members quiet | Teams covered without team code |
| Code | HF-04, HF-07 | Non-quiet fire doesn't re-arm; roots see background updates | Forward terminal updates to a lifecycle re-arm hook |
| Measurement | Investigation "Server Cost" | Idle Claude CLI ≈ 260–480 MB | Reason for keeping idle shutdown |

## Intended Change

1. Undo the SR-002 removal outside `tickets/`.
2. A delegated copy is not quiet while any of its agents' runtimes reports a running background task, so the existing fire-time check skips shutdown.
3. When a background task ends, the copy's grace timer is re-armed, so it is shut down one grace period later if quiet.
4. Agent-facing text and docs state the rule.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Req / AC | Trigger | Existing | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001, AC-003 | Claude copy idle with running `run_in_background` task; grace fires | Shut down, task killed | Quiet check fails on running task → no shutdown | DS-001 |
| BEH-002 | System | REQ-001; AC-002 | AGY copy idle with running step | Same | Same | DS-001 |
| BEH-003 | System | REQ-002; AC-004, AC-005 | Last task ends | No re-arm (AGY) | Terminal update re-arms grace; Claude also re-arms via its CLI turn's idle | DS-002 |
| BEH-004/006/007 | System/Operational | REQ-003; AC-006 | Quiet copy, any runtime | Shut down after grace | Unchanged (accessor returns false when nothing runs or runtime doesn't report) | DS-001 |
| BEH-008 | System | REQ-004; AC-007 | DONE / root stop / server stop | Stop | Unchanged — those paths never call `tryPrepareIfQuiescent` | — |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related | Relationship | Status |
| --- | --- | --- | --- | --- |
| `problem-report.md` | Evidence | BEH-001 | Reproduction basis | Evidence only |
| `evidence/baseline-before*` | Base run: copy shut down at 60 s grace, task stopped | AC-001 | Valid "before" receipt | Historical evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers: Missing-invariant (the quiet predicate omits runtime-owned work). Ruled out: Authoritative-boundary bypass (the lifecycle reaches runtime state only through `AgentRun` → backend), Repeated-coordination (one quiet predicate shared by all paths), Shared-structure looseness (a dedicated method instead of an optional field on `AgentRuntimeLifecycleSnapshot`, which is the turn/phase status snapshot used for status projection).
- Root cause classification: `Missing Invariant` — the right owner (`AgentRunTermination` quiet check) exists but does not include runtime background work.
- Refactor needed now: `No` (beyond undoing SR-002)
- Evidence: HF-01..HF-07
- Design response: add the invariant at its owner, expose the signal through the backend contract, add a re-arm trigger at the lifecycle.
- Residual risk: a task whose end the runtime never reports keeps the copy live until DONE/root/server stop (QR-002, accepted).

## Terminology

- *Running background task*: a task the runtime currently shows as `running` in its Background Tasks view (Claude registry, AGY monitor).
- *Copy*: a delegated Agent or Team (task execution).

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.` The SR-002 removal is undone completely (no partial keep of renames such as `withLiveChain`, no setting removal). No flag selects "old" vs "hybrid".

## Persisted Data / State Transition Decision

`Not Affected` — background state is runtime-only and unpersisted; the grace setting is unchanged.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/002/004 | Grace timer fires | Shutdown or skip | `RootTaskExecutionLifecycle` → `AgentRunTermination` | The fixed decision |
| DS-002 | Return-Event | BEH-003 | Runtime reports task end | Grace re-armed | Root → `RootTaskExecutionLifecycle` | Release after work ends |
| DS-003 | Bounded Local | BEH-001 | CLI frame / exit file | Registry/monitor state | `ClaudeBackgroundTaskRegistry` / `AgyBackgroundTaskMonitor` | Source of truth |

## Primary Execution Spine(s)

- DS-001: `Grace timer -> RootTaskExecutionLifecycle.shutdownAtHead -> adapter.tryShutDownIfQuiet -> registry / team manager -> AgentRun.tryPrepareTerminationIfQuiescent -> AgentRunTermination.tryPrepareIfQuiescent [+ backend.hasRunningBackgroundTasks()] -> null (skip) | prepared termination (shut down)`
- DS-002: `Runtime registry/monitor -> BACKGROUND_TASK_UPDATED (status completed|failed|stopped) -> root event handler (Team: TeamTaskExecutionService.onRootEvent; Org: AgentOrgRun.onAgentExecutionEvent; Standalone: StandaloneAgentRunRoot.onAgentExecutionEvent) -> RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded(agentRunId) -> armLive(chain)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | When the grace timer fires, the existing quiet check also asks the backend whether it has a running background task. If yes the copy is not quiet: nothing is shut down and no timer is set. Teams are covered because each member is checked | Lifecycle, adapter, AgentRun, termination, backend | `AgentRunTermination` decides quiet | — |
| DS-002 | A terminal background-task update re-arms the grace timer of every live copy containing that agent. If the agent is busy or still has another running task, the fire-time check skips again and a later idle or terminal update re-arms. Claude also re-arms through its idle after the completion turn; AGY relies on this hook | Root, lifecycle | Lifecycle | — |

## Spine Actors / Main-Line Nodes

`RootTaskExecutionLifecycle`, subject adapters (unchanged), `AgentRun`/`AgentRunTermination`, `AgentRunBackend` implementations, `ClaudeSession`/`ClaudeBackgroundTaskRegistry`, `AgyBackgroundTaskMonitor`, the three root event handlers.

## Ownership Map

- `ClaudeBackgroundTaskRegistry` / `AgyBackgroundTaskMonitor`: own whether a task is running (new read-only query `hasRunningTasks()`).
- `AgentRunBackend` implementations: expose it as `hasRunningBackgroundTasks()`; Codex, AutoByteus, ACP return `false`.
- `AgentRunTermination.tryPrepareIfQuiescent`: owns the quiet decision, now including the background term.
- `RootTaskExecutionLifecycle`: owns grace scheduling; new hook `onAgentBackgroundTaskEnded`.
- Root event handlers: classify events and call the lifecycle (thin).

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `TeamTaskExecutionService.onRootEvent` | Lifecycle | Team root event entry | Scheduling decisions |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| All changes of commits `28afa0884` and `bf5889d03` outside `tickets/` (setting removal, lifecycle/lease removal and `withLiveChain` rename, adapter/registry/termination deletions, Org event retirement deletion, contract text, docs, test rewrites/deletions) | SR-002 behavior reversed | Base code + this design | In This Change |
| Keep: `ba0437e00` (unrelated baseline test fix) | Still valid | — | — |
| Keep and adapt: `tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts` (added in `28afa0884`) | AC-001 live test | Set grace to 60 s and assert the copy survives the grace with a running task | In This Change |
| Untracked API/E2E files from the stopped round (`tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts`, `tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts`, API/E2E ticket files) | Written for SR-002 | API/E2E Engineer decides reuse at its next round; implementer must not commit them | Follow-up (API/E2E) |

## Return Or Event Spine(s)

DS-002 above.

## Bounded Local / Internal Spines

DS-003: Claude: `CLI frame -> observeTaskFrame -> view upsert (running/terminal) -> publish`; AGY: `turn end -> track(steps) -> poll exit files -> finish`. Unchanged except the new read-only query.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Terminal-status classification | DS-002 | Root handlers | Recognize `completed/failed/stopped` | Only ends re-arm | Re-arming on `running` is harmless but noisy |

## Ownership Boundaries

The lifecycle never reads runtime registries; it learns about background work only through the quiet check (via `AgentRun`) and the event hook. Root handlers do not decide scheduling.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix |
| --- | --- | --- | --- | --- |
| `AgentRunBackend.hasRunningBackgroundTasks()` | Claude registry / AGY monitor | `AgentRunTermination` (via its `backend` option) | Lifecycle or adapters reading `ClaudeSession`/monitor directly | Extend backend contract |
| `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded` | Grace schedule | Root event handlers | Roots touching the schedule | — |

## Dependency Rules

- Allowed: `AgentRunTermination` → backend (existing `Pick<AgentRunBackend, ...>` option gains `hasRunningBackgroundTasks`).
- Forbidden: background term in `isRootShutdownQuiescent`, `prepare()` (DONE/terminate) or the root-shutdown fence (REQ-004).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunBackend.hasRunningBackgroundTasks(): boolean` | One run's runtime | True while any of its background tasks is `running` | the backend instance | Required on all five backends and test fakes |
| `ClaudeBackgroundTaskRegistry.hasRunningTasks(): boolean`; `AgyBackgroundTaskMonitor.hasRunningTasks(): boolean` | Runtime task view | Read-only | — | Claude: any `view` entry with `status === "running"`; AGY: `running.size > 0` |
| `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded(agentRunId)` | Copies containing the agent | `armLive(chain)` when accepting | `agentRunId` | No-op when the agent is in no copy |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| all three above | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Action |
| --- | --- | --- | --- |
| Backend query | `hasRunningBackgroundTasks` | Yes | — |
| Lifecycle hook | `onAgentBackgroundTaskEnded` | Yes | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Running-task knowledge | Claude registry, AGY monitor | Extend (read-only query) | Already authoritative for the UI |
| Shutdown decision | `tryPrepareIfQuiescent` | Extend | Single quiet authority |
| Re-arm | `armLive` | Reuse | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Concern | Decision |
| --- | --- | --- |
| `agent-execution/backends` (+ claude, antigravity, codex, autobyteus, acp) | Background query | Extend |
| `agent-execution/domain/agent-run-termination.ts` | Quiet term | Extend |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | Re-arm hook | Extend |
| Roots: `agent-team-execution/task-delegation/team-task-execution-service.ts`, `agent-org-execution/domain/agent-org-run.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | Event forward | Extend |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Text | Modify |

## Final File Responsibility Mapping

No new files. Edits (paths under `autobyteus-server-ts/src/`, after the undo):

| File | Change |
| --- | --- |
| `agent-execution/backends/agent-run-backend.ts` | Add `hasRunningBackgroundTasks(): boolean` (doc: "true while the runtime reports a running background task; runtimes without background reporting return false") |
| `backends/claude/session/claude-background-task-registry.ts` | `hasRunningTasks()` |
| `backends/claude/session/claude-session.ts` | Expose `hasRunningBackgroundTasks()` from `taskRegistry` |
| `backends/claude/backend/claude-agent-run-backend.ts` | Implement via session |
| `backends/antigravity/stream/agy-background-task-monitor.ts` | `hasRunningTasks()` |
| `backends/antigravity/backend/agy-agent-run-backend.ts` | Implement via monitor |
| `backends/codex/backend/codex-agent-run-backend.ts`, `backends/autobyteus/autobyteus-agent-run-backend.ts`, `backends/acp/backend/acp-agent-run-backend.ts` | Return `false` |
| `agent-execution/domain/agent-run-termination.ts` | `backend` option Pick adds `hasRunningBackgroundTasks`; `tryPrepareIfQuiescent` returns `null` when it is true (inside the dispatch-queue callback, next to the other terms) |
| `agent-execution/domain/agent-run.ts` | Pass the backend method into the termination options if the Pick wiring requires it |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | `onAgentBackgroundTaskEnded(agentRunId)`: if accepting and chain non-empty, `armLive(chain)`; update the `onAgentStatus` doc ("fire-time quiescence check, including running background tasks, is the only safety guard") |
| `agent-team-execution/task-delegation/team-task-execution-service.ts` `onRootEvent` | Also handle `payload.eventType === "BACKGROUND_TASK_UPDATED"` with `details.status !== "running"` → hook |
| `agent-org-execution/domain/agent-org-run.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts` `onAgentExecutionEvent` | `event.kind === "agent_run" && eventType === BACKGROUND_TASK_UPDATED` with terminal `payload.status` (parse with `parseBackgroundTaskUpdatedPayload`) → hook |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Sentence becomes: "A copy that stays quiet is shut down after a while, but not while it has a running background task; a message to its run ID restores it with its conversation." Update its golden test |
| Docs | `docs/modules/agent_team_execution.md` (Idle shutdown: quiet includes "no running background task"; re-arm on background-task end), `agent_execution.md` (Claude background section: running tasks keep a delegated copy alive), `antigravity_cli_runtime.md` (same), web `docs/agent_teams.md` l.182 |

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

Edits in place only; no new folders or files.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Quiet check | `if (... \|\| backend.hasRunningBackgroundTasks()) return null;` inside `tryPrepareIfQuiescent` | Adding the term to `isRootShutdownQuiescent` | Root stop must not wait for background tasks |
| Signal shape | Dedicated backend method | Optional `runningBackgroundTaskCount?` on `AgentRuntimeLifecycleSnapshot` | Keeps the status snapshot single-purpose and the contract required |
| Re-arm | Hook on terminal update | A per-task timer or polling | QR-001 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep parts of the SR-002 removal (e.g. `withLiveChain` rename) | Less churn | Rejected | Full undo |
| Optional backend method | Fewer edits | Rejected | Required method, explicit `false` |

## Change / Refactor Sequence

1. Undo `bf5889d03` and `28afa0884` for every path outside `tickets/` (e.g. `git revert --no-commit` then restore `tickets/` from HEAD, or equivalent). Keep `ba0437e00`. Keep `tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts`. Verify: `git diff 3a2496c95 -- . ':!tickets'` shows only `ba0437e00`'s test change and the kept E2E file. Run the base test suites touched by the revert to confirm green. Commit.
2. Backend contract and five implementations; Claude/AGY queries.
3. `AgentRunTermination` term.
4. Lifecycle hook and the three root forwards.
5. LLM contract sentence, docs.
6. Tests (below). Do not commit the untracked API/E2E files of the stopped round.

## Key Tradeoffs

- Memory bounded for copies with nothing running (keeps idle shutdown) vs. some complexity kept.
- No time limit: a never-ending AGY daemon or a missed terminal frame keeps one copy live until DONE/root/server stop (accepted, DEC-005).

## Risks

- R-1: Revert conflicts with files touched by both `ba0437e00` and `28afa0884` (`mixed-team-run-backend.integration.test.ts`). Resolve keeping `ba0437e00`.
- R-2: Test fakes implementing `AgentRunBackend` need the new method.
- R-3: Claude `clear()` on process close publishes `stopped` for a run being terminated: the hook arms only live copies (`armLive` checks `isLive`), so harmless.

## Guidance For Implementation

- AC-001: adapt `claude-delegated-background-task.e2e.test.ts` (gated `RUN_CLAUDE_E2E=1`): grace 60 s; delegated Claude agent runs `run_in_background` `sleep 90 && echo done > <marker>`; assert the copy is still live after 60 s + tolerance, marker exists, no `[killed]`, delegator receives the result. "Before" evidence already exists in `evidence/baseline-before*`.
- AC-002/003/004: unit tests with fake timers: (a) `AgentRunTermination.tryPrepareIfQuiescent` returns `null` when the backend reports running tasks; (b) lifecycle: fire with non-quiet → no shutdown; `onAgentBackgroundTaskEnded` → re-armed → shutdown after grace; (c) Team copy with one member reporting running tasks is not shut down; (d) AGY monitor/Claude registry `hasRunningTasks` transitions.
- AC-005: lifecycle test where idle after the completion turn re-arms (existing path).
- AC-006: restored base idle-shutdown tests stay green.
- AC-007: unit case: root stop / DONE release with `hasRunningBackgroundTasks() === true` still terminates.
- AC-008: LLM contract golden test; docs review; the revert diff check in step 1.
