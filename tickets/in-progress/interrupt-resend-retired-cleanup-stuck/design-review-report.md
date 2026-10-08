# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/requirements-doc.md` (SR-001, Approved 2026-10-08, DEC-001 = A)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/design-spec.md` (SR-002, status Ready)
- Supplemental Task Artifacts Reviewed: `evidence/user-screenshot-stuck-run.png`, `evidence/server-log-excerpt.txt`, `evidence/registry-repro-probe.test.ts.txt` (all evidence-only)
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` from `/software_engineering_team/solution_designer` (SR-002)
- Prior Review Round Reviewed: N/A (first review)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Independent read of the worktree at `ace86bf1f` (`codex/interrupt-resend-retired-cleanup-stuck`): `agent-run-activation-registry.ts` (claim L84–119, getActiveRun L181–191, removeIfCurrent L201–236, snapshotForStop L251–282), `agent-run-manager.ts` (beginActivation L121–155, stopAllAgentRuns L266–291, releaseExactRun L318–334), `standalone-agent-run-lifecycle-service.ts` (resolveCommandReadyAgentRun, activateHost, resolveInsideTransition L121–141, withTransition, restoreStarted), `standalone-host-agent-handle.ts`, `errors.ts`, `configured-agent-execution-handle.ts` (ensureReady/initializeReady L260–327, cleanupError), `configured-agent-activation-planner.ts` (isRetrySafe), `agent-run.ts` (forceReleaseRuntime, claimNextInput, drain), `agent-run-termination.ts` (forceTerminate, finishCommittedTermination), `agent-run-interrupt-state.ts`, `agent-run-input-admission-state.ts` (admit), `agy-agent-run-backend.ts` (interrupt/terminate/handleClose), `agy-stream-process.ts` (stop/stopExact), `agent-run-command-coordinator.ts` (post/failCommand), web `agentRunStore.ts` (no send-ack timeout). Repository `DESIGN.md`, `TESTING.md`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: Five production files in existing owners; no API, persistence, or web change. Risk is High because the change reorders activation against termination for a run that may be mid-interrupt, and reclassifies an error that both the standalone quarantine map and the team planner's retry-safety rule read. Both confirmed in code (`isAgentRunActivationQuarantineError` is read by `resolveInsideTransition` and `ConfiguredAgentActivationPlanner.isRetrySafe`).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Minor text inconsistency only: the design spec's size rationale says "Four production files" but lists five (the handoff says five). Non-blocking.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. A standalone run whose runtime went offline must restart in-process on the next send. If the previous runtime is still stopping, the send waits up to 30 s and then delivers; otherwise it returns a retryable plain-language error. Nothing is cached permanently. The replacement starts only after the old runtime is confirmed stopped, with one restart for concurrent sends. Team members must never stick after one failed cleanup.
- Relevant existing behavior and evidence confirmed: Yes. In the registry, `removeIfCurrent` always moves the run to `retired` and clears it only on `explicit_termination`. `claim` refuses while the id is retired, using `AGENT_RUN_ACTIVATION_CLEANUP_FAILED`, which `resolveInsideTransition` then caches in `quarantines`. On the standalone path, nothing calls `releaseExactRun`. The team handle calls it outside its `try` (L280–284), so a throw there never reaches `markRetrySafe` (R-001 confirmed). AGY `interrupt()` sets `active=false` synchronously before awaiting `process.stop()`.
- Scope guardrail confirmed: Yes. In scope: UC-001..UC-005. Out of scope: AGY interrupt semantics, registry redesign, other `CLEANUP_FAILED` sources, and visual changes. Preserved: BEH-001, BEH-004, per-run serialization, and "one live runtime per run". Review authority is as stated.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes (no blocking findings).
- Remaining material ambiguity, if any: None blocking. See P-001 (Unclear; non-blocking validation note).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (AGY `interrupt()` stops the process; other backends cancel the turn) | Pass (no backend change) | Confirmed | — |
| BEH-002 | User | Pass | Pass (registry claim refusal plus quarantine cache, verified) | Pass. DS-001 is ensureReady → lane → `releaseRetiredRun` → claim → restore. `releaseExactRun` accepts a retired run (`ownsPublishedOrRetired`) and clears `retired` on success. | Confirmed | — |
| BEH-003 | User | Pass | Pass (transition lane, host activation join) | Pass. The release is awaited before `beginActivation`. On timeout, the registry guard still refuses a claim until the background release clears `retired`. The pipeline `releaseRun(runId)` runs inside `forceTerminate` before `removeIfCurrent`, so it always precedes any new claim. | Confirmed | — |
| BEH-004 | System | Pass | Pass (AF-008 verified at handle L280–284) | Pass. C-5 marks the attempt retry-safe and keeps `this.agentRun`. The next `ensureReady` re-enters `initializeReady` and re-calls `releaseExactRun`, whose authority still holds via `retired`/`released`. | Confirmed | — |
| BEH-005 | Operational | Pass | Pass (in-memory maps; `stopAllAgentRuns` includes retired runs) | Pass. `releaseRetiredRun` is a no-op when nothing is retired, so a restart restores as today. In a running fixed build, nothing is cached for the new code. | Confirmed | — |
| BEH-006 | User | Pass | Pass (coordinator `failCommand` uses `toMessage(error)`; web shows it verbatim) | Pass (plain message on the new code; overlay cleared on the next successful `onActiveRunReady`) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/user-screenshot-stuck-run.png` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| `evidence/server-log-excerpt.txt` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| `evidence/registry-repro-probe.test.ts.txt` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug fix; current design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` with a narrow `Boundary Or Ownership Issue`. Verified: the registry enforces "no reclaim while release is owed", but the standalone owner never completes the release, and the refusal is misclassified as a quarantine. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `No`. These are bounded additions to existing owners. | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | C-1..C-5 land in existing owners. The new manager method owns real policy: it finds the owed run, proves the stop, and classifies failure. | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary E2E (standalone send to an offline run) | Pass | Pass | Pass (host handle and coordinator are thin; lifecycle governs) | Pass | Pass | Pass (wait bound owned by the lifecycle; error contract in `errors.ts`) | Pass |
| DS-002 | Bounded local (exact release of the retired run) | Pass | Pass | N/A | Pass | Pass (manager) | Pass | Pass |
| DS-003 | Primary E2E (team/delegated member re-activation) | Pass | Pass | Pass | Pass | Pass (configured handle owns retry safety) | Pass | Pass |

DS-001 also covers `resolveCommandReadyAgentRun` (helpers and application-owned runs), because that path also goes through `activateHost` and the same lane. Verified.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunManager.releaseRetiredRun` | Pass | Pass (`registry.getRetiredRun`, `releaseExactRun`, termination) | Pass (lifecycle → registry and lifecycle → `forceReleaseRuntime` are explicitly forbidden) | Pass | Matches the existing manager → registry direction |
| `AgentRunActivationRegistry` | Pass | Pass (`getRetiredRun` read-only, manager-only) | Pass | Pass | The claim guard stays as the last line of defence |
| `StandaloneAgentRunLifecycleService` | Pass | Pass (wait bound and quarantine policy local) | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Lifecycle service | Pass | Pass | Pass | Pass | lifecycle → manager only |
| Run manager | Pass | Pass | Pass | Pass | manager → registry / AgentRun |
| Configured handle | Pass | Pass | Pass | Pass | Unchanged: handle → manager |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunManager.releaseRetiredRun(runId)` | Pass | Pass | Pass (normalized run id; never touches a published run; never materializes one) | Low | Pass |
| `AgentRunActivationRegistry.getRetiredRun(runId)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunActivationErrorCode` adds `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` | Pass | Pass (one meaning: retryable, owed previous-runtime release) | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Prove the old runtime stopped | Pass | Pass (`releaseExactRun` → `forceReleaseRuntime` → `forceTerminate`; failure is not memoized, so it can be retried) | N/A | Pass | — |
| Serialize activation per run | Pass | Pass (transition lane + host join) | N/A | Pass | — |
| User-visible error | Pass | Pass (coordinator ack + web verbatim) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/runtime` | Pass | Pass | Pass | Pass | — |
| `agent-execution/services` | Pass | Pass | Pass | Pass | — |
| `agent-collaboration/execution/backends` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| "Release the previous exact run before re-activation" | Pass | N/A | Pass | Pass | Team handle holds the exact run; standalone uses the manager's id-keyed method. Both use `releaseExactRun`; no duplicated policy. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunActivationErrorCode` | Pass | Pass | Pass (`CLEANUP_FAILED` keeps only quarantined-candidate meaning) | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `errors.ts` | Pass | Pass | N/A | Pass | — |
| `agent-run-activation-registry.ts` | Pass | Pass | N/A | Pass | — |
| `agent-run-manager.ts` | Pass | Pass | N/A | Pass | — |
| `standalone-agent-run-lifecycle-service.ts` | Pass | Pass | N/A | Pass | — |
| `configured-agent-execution-handle.ts` | Pass | Pass | N/A | Pass | — |
| `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` (new) | Pass | Pass | N/A | Pass | See recommendation REC-001 on send sequencing |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing folders only; one new E2E file beside the AGY transport suites | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Retired-claim refusal under `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` "still owns retired cleanup" | Pass | Pass | Pass | Pass | Existing test `agent-run-manager.test.ts:215` asserts the quarantined-candidate refusal, which stays unchanged. No current test asserts the retired text. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Error code reclassification | No | Pass | Pass | The special-case alternative was rejected and logged |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `run_metadata.json`, provider conversation state | Not Affected | Pass (only in-memory `retired`/`quarantines` change; restore reads metadata unchanged) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| C-1..C-5 plus tests | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Lifecycle ordering | Yes | Pass | Pass | Pass | — |
| Boundary | Yes | Pass | Pass | Pass | — |
| Retry safety (C-5) | Yes | Pass | Pass | Pass | — |
| User text | Yes | Pass | Pass | Pass | Wording differs slightly from the requirements' proposal; REQ-005 allows that |

## Material Premise Validation (Only When Needed)

### `P-001` — SEND_MESSAGE reaches the old run before the AGY backend's `interrupt()` marks it inactive

- Related approved requirement or established contract: REQ-001/REQ-003, AC-001, AC-005 (verification intent)
- Relevant behavior ID(s): BEH-002, BEH-003
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: Chat Interrupt button, then Send (SCN-001).
- Support evidence: The chat input exposes Interrupt and Send. The user's report shows a send right after an interrupt.
- Forward current or approved target production caller/event path: INTERRUPT_GENERATION → `AgentRunInterruptState.interrupt` enqueues a reservation on the run's dispatch queue → `execute()` → `backend.interrupt()` sets `active=false` synchronously. A SEND processed before that dispatch-queue hop completes sees a live run, so `getActiveRun` returns it. `admit()` accepts (`runtimeAvailable=true`), and the input is queued on the run that is about to stop. It is then settled at that run's release, not delivered.
- Lifecycle preconditions and material consequence at the claimed point: The window is one dispatch-queue hop, which grows only while the queue is busy (for example, during event publishing). The user's observed failure ("still owns retired cleanup") shows the human send arrived after the flip, which is the path this design fixes.
- Reachability: `Unclear` for the human UI path (human click-to-send latency normally exceeds the hop; no evidence of a slower queue). It is mechanically likely for a test that writes both frames back to back.
- Review consequence / proportionate response: No design change and no new machinery. This sequencing exists today, independent of this fix, and is not required by the approved scope. It affects validation accuracy only. See REC-001: the E2E for AC-001/AC-005 should send after the interrupt has taken the run offline, so that it exercises DS-001/DS-002 instead of racing the dispatch queue. If validation shows a human-reachable occurrence, route it to Solution Designer as a new requirement question.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None (no blocking findings).

Non-blocking recommendations:

- **REC-001 (validation sequencing, AC-001/AC-005):** The design's E2E guidance says to send `INTERRUPT_GENERATION` and then `SEND_MESSAGE` "without awaiting its ack". Writing both frames back to back can land in the P-001 window, where the send is queued on the old run. The test would then be nondeterministic and could be misread as an implementation failure. Instead, send the message after observing that the interrupt has taken effect (for example, the turn-interrupted or status event on the stream) and before the interrupt ack or process exit. Making the fake AGY CLI delay its exit on SIGTERM keeps the "old runtime still stopping" window open deterministically, so AC-005 actually verifies release-before-claim and a single replacement process.
- **REC-002 (C-4 timer hygiene):** When the bounded wait wins, clear the timer. When the timeout wins, attach the `.catch` to the in-flight release, as the design states. The unit timeout test should assert that a later `activateHost` joins or finds the completed release and that `beginActivation` is not called while `retired` is still set.
- **REC-003 (doc nit):** The design-spec size rationale says "Four production files", but it lists five. Correct it in the next routine revision; no rework needed.

## Classification

N/A (Pass).

## Recommended Recipient

Per handoff rules: implementation engineer (primary), with an informational notification to the solution designer.

## Residual Risks

- P-001 (Unclear): a send processed before AGY `interrupt()` flips the run inactive is queued on the stopping run and settled at release, so it is not delivered. This behavior already exists and is outside the approved scope; monitor it in validation.
- Cosmetic: the old run's terminal status may reach the stream session briefly before the restored run rebinds (already in the design's Risks).
- ASM-001 (AGY restore after an interrupt-stop) and AC-007 (user desktop verification) remain validation and delivery obligations.
- Non-AGY stop proof relies on each backend's `terminate()`. The design names the escalation trigger.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 is `Unclear` and drives no finding or machinery; it is a validation note only)
- Notes: Design is actionable in the current codebase. The ordering claim (release proven before claim; pipeline release before retired clear; registry guard holds across a timed-out release) was verified independently in code.
