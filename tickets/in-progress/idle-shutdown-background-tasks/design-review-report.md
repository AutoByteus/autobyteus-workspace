# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-spec.md` (Ready, SR-002)
- Supplemental Task Artifacts Reviewed: `problem-report.md` (evidence only); `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete (SR-002) from `/software_engineering_team/solution_designer`, 2026-10-08
- Prior Review Round Reviewed: N/A (first review)
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `codex/idle-shutdown-background-tasks` @ `3a2496c95` (base `origin/personal`). Read: `root-task-execution-lifecycle.ts`, `root-task-execution-command-queue.ts`, `root-task-execution-adapter.ts`, `agent-run-termination.ts`, `agent-run-input-admission-state.ts` (`tryQuiesceIfAlreadyQuiescent`), `flat-team-execution-manager.ts` (quiet path, `quiescing`), `team-task-execution-adapter.ts`, `agent-org-task-execution-adapter.ts`, `agent-org-task-event-retirement.ts`, `server-settings-service.ts`, `task-execution-idle-shutdown-setting.ts`, `agent-team-collaboration-llm-contract.ts`; whole-worktree grep for `IDLE_SHUTDOWN|IdleShutdown|idleShutdown|IfQuiescent|IfQuiet|LiveLease|EventRetirement|TeardownIndeterminate|unregisterTerminated|stays quiet|tryQuiesceIfAlreadyQuiescent` plus usage greps for `shuttingDown`, `publishAgentOffline`, `enterLifecycleFailStop`, `cancelDeferredPreparation`, `isLive`. Root `DESIGN.md` read.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: removal-dominated (~25 src files, ~15 tests, ~8 docs), no new owner/API/persistence → Medium is accurate. It removes a lifecycle/concurrency authority (idle timer, quiet-termination chain, lease counting, Org teardown-event suppression) across Team, Org and standalone roots and changes LLM-facing contract text → High is accurate.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. DEC-004 (user, 2026-10-08): remove idle shutdown of delegated copies entirely; copies stay live until Task DONE, root stop/fail-stop or server stop; grace setting removed; restore-on-message after restart/reactivation unchanged.
- Relevant existing behavior and evidence confirmed: Yes. `onAgentStatus` arms grace timers on `idle/offline/error`; `onGraceElapsed → queue "shutdown" → shutdownAtHead → adapter.tryShutDownIfQuiet → … → AgentRunTermination.tryPrepareIfQuiescent`, whose predicate has no background-task term (verified, `agent-run-termination.ts`). Root cause confirmed.
- Scope guardrail confirmed: Yes — In-scope UC-001..003; out of scope: kill notice (DEC-003), background-task survival, changes to DONE/reactivation/root stop/restore, replacement timeouts, legacy unowned copies, standalone/root members; preserved boundary BEH-008, delivery/lease semantics, idle status reporting, root termination/fail-stop.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (no blocking findings).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass — Claude `run_in_background` + turn end → idle → grace timer → quiet termination closes CLI process (verified path) | Pass — DS-001: no timer exists; `onAgentStatus` forwards status only; CLI completion starts a turn | Confirmed | None |
| BEH-002 | System | Pass | Pass — same timer path; AGY `terminate` stops background groups (investigation) | Pass — DS-001 | Confirmed | None |
| BEH-004 | System | Pass | Pass — `withLiveLease` → queue `wake` → `acquireAtHead` → `restoreChain` | Pass — DS-002: `withLiveChain`; adapter restore skips live executions (`if (this.isLive(...)) continue` in all three adapters) so delivery to a live copy performs no restore | Confirmed | None |
| BEH-007 | Operational | Pass | Pass — predefined registration in `server-settings-service.ts`; non-predefined keys fall to `CUSTOM_SETTING_DESCRIPTION` | Pass — DS-004 | Confirmed | None |
| BEH-008 | System | Pass | Pass — DONE release (`releaseTaskAgentResources`), reactivation (`reactivateClosedTarget` → `reopen`), root stop (`closeExternalAdmission`), fail-stop do not read `leases`, the schedule or the quiet chain | Pass — DS-002/DS-003 unchanged except `schedule.dispose()` removal | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `problem-report.md` | Pass | Pass (requirements, investigation inventory, design) | Pass | Pass | Pass (evidence only) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change with removal-driven cleanup | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Legacy Or Compatibility Pressure`: idle shutdown was introduced 2026-09-29 to prevent leaked children; Task DONE release (and since 2026-10-06 Task ownership of every new copy) superseded it; quiet predicate verified to ignore background work | None |
| Refactor decision is explicit | Pass | Refactor (removal) needed now | None |
| Refactor decision is supported by concrete design sections | Pass | Removal Plan, file mapping, sequence, rejection log; patch-the-predicate alternative explicitly rejected with rationale | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Background wait → report to delegator | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Delivery with restore-if-non-live | Pass | Pass | Pass (`TeamTaskExecutionService` facade → lifecycle) | Pass | Pass | Pass | Pass |
| DS-003 | DONE / root stop release | Pass | Pass (unchanged) | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Settings list/update | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Bounded queue (activate/wake/reopen) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle` | Pass (`withLiveChain`, `deliverToExactTarget`, `releaseTaskAgentResources`, `onAgentStatus`) | Pass | Pass — `acquireLiveLease` (externally exposed via `TeamTaskExecutionService`, no production caller) is removed, leaving one entry | Pass | — |
| `AgentRun` / `AgentRunTermination` | Pass (`prepare`/`terminate`/`forceTerminate`/root-shutdown fence) | Pass | Pass | Pass | Removing `tryingQuiescent` simplifies `prepare()` without changing other paths |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Roots/delivery → lifecycle → adapter → registries/handles → AgentRun | Pass | Pass (no timer/status-driven termination; no reference to removed setting) | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle.withLiveChain(agentRunId, operation)` | Pass | Pass | Pass | Low | Pass |
| `RootTaskExecutionLifecycle.onAgentStatus(agentRunId, status)` | Pass | Pass (status forwarding only) | Pass | Low | Pass |
| `RootTaskExecutionAdapter` (minus `tryShutDownIfQuiet`) | Pass | Pass | Pass | Low | Pass (see AR-N-002 for an orphaned member) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Release of copies | Pass | Pass (Task DONE, root stop) | N/A | Pass | — |
| Restore of non-live copies | Pass | Pass (`assertRestorableChain`/`restoreChain`/wake) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | — |
| Team / Org / Standalone root execution | Pass | Pass | Pass | Pass | — |
| `agent-execution` termination | Pass | Pass | Pass | Pass | — |
| `config` + settings service | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

N/A — no structure added or extracted.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Root option types (`idleShutdown`/`taskExecutionIdleShutdown`), adapter option types | Pass | Pass, with AR-N-002 (`enterLifecycleFailStop` option in three adapter option types becomes unused) | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `root-task-execution-lifecycle.ts` | Pass | Pass | N/A | Pass | Class doc comment ("idle-shutdown scheduling and live leases") and `deliverToExactTarget` doc ("under the sender's live lease") need updating with the code |
| `agent-team-collaboration-llm-contract.ts` | Pass | Pass | N/A | Pass | Replacement sentence is accurate and keeps the true "shut-down delegated agent" phrases (l.29/42/103) |
| `server-settings-service.ts` | Pass | Pass | N/A | Pass | — |
| Remaining edited files | Pass | Pass | N/A | Pass | Pure deletions |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new files; three source files deleted | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Idle schedule, `shutdown` command kind, leases, `onGraceElapsed`/`shutdownAtHead`/`armLive` | Pass | Pass | Pass | Pass | Verified: `leases` read only by `shutdownAtHead` |
| Quiet-termination chain (adapters → registries → team manager → handles → AgentRunManager → AgentRun → `AgentRunTermination` → admission state) | Pass | N/A | Pass | Pass | Verified every listed member is reached only from the idle path; `quiescing` state correctly retained for `prepareTerminationOnce` |
| `TaskExecutionTeardownIndeterminateError` | Pass | N/A | Pass | Pass | Thrown only by the four quiet paths, caught only by the three adapter quiet paths |
| Org event retirement | Pass | N/A | Pass | Pass | `begin` only from the Org quiet path |
| `unregisterTerminated`, `shuttingDown` sets | Pass | Pass (`retireTerminated` for reactivation) | Pass | Pass | — |
| Setting file + registration | Pass | N/A | Pass | Pass | — |
| Adapter-interface `isLive`, adapter option `enterLifecycleFailStop` | Fail (not named) | N/A | Partially (covered only by the "when no other use remains" rule) | Pass with note | AR-N-002 |
| Tests and docs inventory (AF-17/AF-18) | Partially | N/A | Pass via step-8 grep for most items | Pass with note | AR-N-001 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Idle shutdown | No | Pass (no flag, no infinite grace, no dormant method, no `withLiveLease` alias) | Pass | — |
| Stale settings key | No (generic custom-setting reader is not compatibility code) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Server settings key `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` | `Directly Usable — No Migration` | Pass — verified `getSettingDescription` falls back to an editable/deletable custom description; no reader remains | Pass | N/A | Pass | AC-004 test covers it |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 (baseline repro → lifecycle → adapters → chain → settings/options → contract → tests/docs → grep) | Pass | Pass (none needed) | Pass | Pass |
| Concurrency after lease removal | Pass — delivery still runs the restore inside the serialized queue and re-runs `assertInputAllowed` before the operation; the only reader of leases (idle shutdown) is gone, and DONE release/root stop never consulted leases, so no ordering changes (QR-001) | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fix shape (delete vs patch predicate) | Yes | Pass | Pass | Pass | — |
| Delivery without lease | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

None. The review raised no premise outside the established behavior basis. (Resource growth from open Tasks, R-3/QR-002, is an accepted user decision, not a review premise.)

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

No blocking findings. Three non-blocking implementation notes (no change to approved behavior, `Within Approved Scope`, no upstream rework required; the implementer applies them):

### AR-N-001 — Test and doc inventory incomplete; one stale phrase escapes the final grep (Low)

- Protects: REQ-004/AC-005, REQ-005/AC-006.
- Evidence: whole-worktree grep finds files not listed in AF-17/AF-18:
  - Tests: `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts`, `tests/unit/agent-collaboration/task-agent-resource-tree-scope.test.ts` (`unregisterTerminated`), `tests/unit/agent-org-execution/helpers/task-publication-handles.ts`, `tests/unit/agent-team-execution/flat-team-execution-manager-routing.test.ts`, `tests/unit/agent-execution/agent-run.test.ts`, `tests/unit/agent-execution/agent-run-manager.test.ts`, `tests/unit/agent-team-execution/member-collaboration-instruction-provider-parity.test.ts` (asserts "A copy that stays quiet is shut\ndown after a while").
  - Docs: `autobyteus-server-ts/docs/modules/prompt_engineering.md` l.250 (mirrors the LLM contract text), `autobyteus-server-ts/docs/modules/agent_execution.md` l.238 (`tryPrepareTerminationIfQuiescent`).
  - The step-8 grep pattern catches all of these except the "stays quiet" text in `prompt_engineering.md` and the parity test.
- Required update (implementation): include these files; add `stays quiet|grace period` (case-insensitive) to the step-8 grep over `docs` and `tests`; update the parity assertion to the new contract sentence.
- Proportionate: mechanical inventory completion; prevents a stale LLM-contract doc.

### AR-N-002 — Interface/option members orphaned by the removal (Low)

- Protects: REQ-004/AC-005 (no idle-only dead path).
- Evidence: `RootTaskExecutionAdapter.isLive` is called through the interface only by `armLive` and `shutdownAtHead` (both removed); adapters use their own `isLive` internally (status, restore skip). `enterLifecycleFailStop` in the Team/Org/Standalone adapter option types is used by the adapters only in the quiet-shutdown catch (the root classes' own `enterLifecycleFailStop` methods remain used by materializers/binding committer).
- Required update (implementation): drop `isLive` from the `RootTaskExecutionAdapter` interface (keep it as an adapter-internal method) and drop `enterLifecycleFailStop` from the three adapter option types and their wiring, per the design's "when no other use remains" rule. Confirm by grep/typecheck.
- Proportionate: keeps the adapter contract truthful; no behavior effect.

### AR-N-003 — Stale upstream text (Low, documentation only)

- Evidence: investigation notes "Investigation Meta" still says current revision `SR-001`; "Requirement Implications" and "Notes For Architecture Design" describe the superseded SR-001 approach ("add the background-task condition there"); RSK-002/UNK-001/UNK-002 still `Open` though moot under DEC-004. Requirements doc approval line cites "AC-001..008" while the table has AC-001..006.
- Required update: Solution Designer may mark those sections superseded at the next revision. Not blocking: the design spec and the approved requirements tables are internally consistent and authoritative.

## Classification

N/A — Pass.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules); informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- R-1: tests that produced non-live copies via idle shutdown must create non-live state through supported paths (restart/reopen, DONE + reactivation) or existing release APIs.
- R-3 / QR-002 (accepted by user): an open Task's copy holds its runtime process until DONE, root stop or server stop; pre-2026-10-06 unowned copies until root/server stop.
- The gated live Claude E2E (AC-001 b) needs a ≥90 s background task and a pre-change baseline run (step 1); environment limits must be recorded per TESTING.md if it cannot run.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Design is a clean-cut removal consistent with DEC-004 and DESIGN.md rules 4–5. Every removal target verified idle-only in current code. Implementation should apply AR-N-001 and AR-N-002.
