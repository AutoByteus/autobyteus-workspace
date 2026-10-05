# Design Review Report — agent-run-termination-extraction

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/requirements-doc.md` (Approved, SR-003; basis SR-002, DEC-003 as recommended)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/investigation-notes.md` (E-A1–E-A11, E-X1–E-X3)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/solution-revision-record.md` (SR-001–SR-004)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed:
  - `evidence/baseline-server-failures.txt` (the AC-009 baseline);
  - the predecessor SR-006 § 11 contract (F-1–F-4), read-only. It is reflected in `agent-run-root-shutdown-fence.ts` and `docs/modules/agent_execution.md`.
- Relevant Solution Revision IDs: SR-003 (approval), SR-004 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: SR-004 `Architecture Design Complete` (Medium/High) from `/solution_designer`.
- Prior Review Round Reviewed: N/A (first review for this package)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/agent-run-termination-extraction` @ `774b51d8c` (docs only), base `03d5db06b`. Code read:
  - `src/agent-execution/domain/agent-run.ts`, all 540 lines. That is 498 effective lines, as confirmed by an `awk 'NF'` count.
    - The fields are at 66 and 69–74 and the constructor at 76–110.
    - The termination/fence clusters are at 213–285 and 398–493.
    - The four evaluation triggers are at 95, 300, 339 and 385.
  - `prepared-agent-run-termination.ts`. `commit()` is idempotent: it returns the same `committed`, and `finish` is the `finishCommitted` closure.
  - `agent-run-root-shutdown-fence.ts`, the per-attempt F-1–F-4 class (header and constructor shape).
  - `agent-run-interrupt-state.ts`, the E-A7 precedent, which uses an `options` port.
  - `tests/unit/agent-execution/agent-run.test.ts`:
    - 676–716: terminate retry;
    - 1000–1035: F-1, F-2 and F-3, with the `console.warn` spies installed before the harness is constructed.
  - Architecture guards: `agent-provider-composition-boundaries.test.ts` and `application-framework-boundaries.test.ts`. Neither inventories `agent-execution/domain` internals or `getDefaultAgentRunEventPipeline` call sites, so a new domain file trips no guard.
  - Name check: there is no existing `AgentRunTermination` symbol. The nearby names are `PreparedAgentRunTermination` (domain) and `createManagedAgentRunTermination` (services); they do not collide.

## Routing Classification Review

- Task size: `Medium`. Agreed: one new file, one modified file, one additive test and docs, with no caller, contract or persistence change.
- Architectural risk: `High`. Agreed:
  - The moved code is the shared Stop/delete/archive/shutdown path for every root and runtime.
  - Its correctness depends on lane order, microtask timing and promise identity. F-02 showed real sensitivity there.
  - A behavior-neutral move can still regress these, and line count does not capture that risk.
- Independent Architecture Review required: `Yes`. The selected gate is consistent with the routing rules.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved intent: a pure ownership move (REQ-001), the size target (REQ-002), and exact preservation of F-1–F-4 plus the cancel/reopen and finish-retry rules (REQ-003). Behavior changes are a Requirement Gap by the review authority.
- Scope guardrail:
  - Part B is out of scope, as are the other AgentRun concerns.
  - The stale-local-turn residual (predecessor ARCH-REV-004 N-1) is explicitly a non-goal.

| BEH | Alignment | Evidence | Target Path | Status | Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 Termination and fence (SCN-001 root Stop; SCN-002 single-run Stop/delete/archive/`stopAll`) | Pass | Pass (code read matches E-A2/E-A8/E-A9) | Pass. DS-001/DS-002 run through unchanged public `AgentRun` methods to `AgentRunTermination`; lane and microtask order preserved by the shape rules | Confirmed | — |
| BEH-002 Size | Pass | Pass (498 confirmed) | Pass. About 341 before wiring, plus about 25 of wiring, which is about 365 (≤ 400). The owner is about 190 | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/baseline-server-failures.txt` | Pass | Pass (AC-009, E-X1) | Pass | Pass | Evidence | Compare by test name and message |
| Predecessor § 11 (F-1–F-4) | Pass | Pass | Pass | Pass. The fence file is unchanged, so the contract stays where it is | Finalized, read-only | — |

## Task Design Health Assessment Verdict

Pass.
- Classification: `File Placement Or Responsibility Drift`, backed by E-A1, E-A2 and E-A8.
- `AgentRun` holds five lifecycle concerns. Termination and fence-attempt selection form a coherent state machine with its own fields: `recoveryShutdownFenced`, the current attempt and four coalescing slots.
- That makes it a real owner, not a forwarding layer.
- Leaving the other concerns in place matches the approved scope and DESIGN.md's "smallest coherent owner".

## Spine Inventory Verdict

| Spine | Verdict | Notes |
| --- | --- | --- |
| DS-001 Root Stop | Pass | Runs from the web/API Stop through the root, frozen scope, handle, `AgentRun` and `AgentRunTermination` to the attempt, then finish. It is stretched to the real entry surface. |
| DS-002 Single-run end | Pass | Runs from the manager through `AgentRun.prepareTermination` to prepare, then commit and finish, then `backend.terminate`, then release on the lane, then detach. |
| DS-003 Bounded evaluation | Pass | The four triggers lead to `queueMicrotask(() => this.attempt?.evaluate())`. The current attempt is read at run time. |
| DS-004 Return/event | Pass | The order of the release-on-lane steps (lines 482–489), then detach, is preserved verbatim. |

## Boundary / Dependency / Interface Verdicts

| Item | Verdict | Notes |
| --- | --- | --- |
| `AgentRun` stays the authoritative boundary; the four public methods become thin delegations | Pass | The 26 `src` importers are unchanged. Re-exporting the owner is rejected. |
| `AgentRunTermination` reaches state only through options; no `AgentRun` import | Pass | This follows the E-A7 precedent and introduces no cycle. |
| Forbidden: `options.interruptState.interrupt()` | Pass | `AgentRun.interrupt` (213–217) contains the recoverable-block branch that `prepareTerminationOnce` and the gate-without-turn path rely on. |
| Only `agent-run.ts` imports `agent-run-termination.ts` | Pass | Verifiable by grep, including `test-support/` (E-X2). |

### Review focus 1: is the options port minimal and correct?

Yes. I mapped every free reference in the moved set (E-A8) to a port member:

| Moved-code reference | Port member | Check |
| --- | --- | --- |
| `this.runId` | `runId` | ✓ |
| `backend.getLifecycleSnapshot()`, `backend.terminate()` | `backend: Pick<…>` | ✓. Nothing else on the backend is used. |
| `dispatchQueue.enqueue` | `dispatchQueue` | ✓ |
| `lifecycleState.*` (reconcile, activeTurn, hasPendingCommand, recoverableBlock, terminate) | `lifecycleState` | ✓ |
| `inputAdmissionState.*` (fenceForRootShutdown, quiesce, reopen, tryQuiesceIfAlreadyQuiescent, waitForQuiescence, isQuiescentNow, settle*) | `inputAdmissionState` | ✓ |
| `interruptState.hasActiveReservation`/`hasPendingProviderRequest`/`clear` | `interruptState` | ✓. The read-only state and `clear` are used; `interrupt` is not. |
| `segmentLifecycleState.releaseRun` | `segmentLifecycleState` | ✓ |
| `activeInputDispatch` (truthiness; awaited in `waitForActiveInputDispatch`) | `inputDispatch.active()` | ✓. It must be re-read on every loop iteration: `while (active()) await active()`. |
| `uncertainInputDispatch` (truthiness at lines 413 and 439; `.claim` and `= null` at 482–483) | `uncertainClaim()`, `clearUncertain()` | ✓. Truthiness is equivalent because `ClaimedInputDispatch.claim` is non-optional. The owner never needs `commandToken` or `recovery`. |
| `this.interrupt()` | `interrupt` | ✓ |
| `reconcileRecovery`, `publishInputState`, `drainInputAfterLifecycleChange`, `dispatchCanonicalStatus`, `unsubscribeFromBackendSource` | same-named options | ✓. Detach is lazy, because it is assigned at the end of the constructor. |
| `logger.warn` (fence sink) | `warn` | ✓. See N-2. |
| `getDefaultAgentRunEventPipeline()` | direct import in the new file | ✓. No guard inventories it. |

There are no superfluous members. `reconcileUncertainDispatch` stays in `AgentRun`. That is correct: it is input-owned and called at lines 298 and 361.

### Review focus 2: do the shape rules protect lane, microtask and promise-identity ordering?

Yes, with one test-strength gap (N-1).

- **Promise identity:**
  - `prepareTermination` and `tryPrepareTerminationIfQuiescent` today return the *shared* in-flight promise (lines 221, 236).
  - A non-async wrapper that returns the owner's promise preserves that identity.
  - An `async` wrapper would create a new promise per call.
  - The rule is correct.
- **Tick count:**
  - `terminate` and `fenceInputAndInterruptForRootShutdown` are `async` today. Each call returns a fresh promise that adopts the inner one.
  - A non-async wrapper around an `async` owner method produces exactly that shape. A second `async` layer would add adoption ticks.
  - The rule is correct.
- **Microtask:**
  - `queueMicrotask(() => this.attempt?.evaluate())` reads the attempt at run time, as today (line 463).
  - The anti-example of capturing the attempt at scheduling time is the real hazard.
  - F-3 replaces attempts, so a stale capture would evaluate a settled attempt and skip the new one.
- **Lane order:**
  - Bodies are copied verbatim, so every `dispatchQueue.enqueue` stays in the same place.
  - The options are synchronous closures, so they add no awaits.
  - The microtask re-drain on cancel (line 430) stays inside `cancelPrepared`.
- **Construction order:**
  - The owner is constructed after `interruptState` and before `subscribeToSourceEventBatches`. That subscription is the first point that can dispatch events and trigger evaluation.
  - `onReservationReleased` reaches `this.termination` lazily.
  - This is correct.

### Review focus 3: is the classification right?

Yes. See Routing Classification Review. `Medium/High` correctly separates change size from blast radius and concurrency risk.

## Existing Capability Reuse / Allocation / Structures / File Mapping / Placement

Pass.
- The fence and prepared-capability files are reused unchanged.
- The new owner is placed beside its siblings in `agent-execution/domain`, which follows the existing internal-collaborator pattern.
- The owner name `AgentRunTermination` is natural, follows the sibling convention and collides with no existing symbol.

## Removal / Legacy Verdict

Pass. The moved fields and methods are deleted, and the imports are removed if unused. There are no forwarding aliases; only the four public API methods delegate.

## Persisted-Data Transition Verdict

Pass: `Not Affected`. The move is in-memory only.

## Change / Refactor Safety Verdict

Pass. The sequence is:
1. add the owner verbatim;
2. rewire;
3. delete;
4. add the test;
5. run the Part A suites with zero assertion edits;
6. run the AC-009 baseline comparison by test name and message;
7. update the docs;
8. run the live gate: LE-O1 on Codex ×10, plus the two live suites on Claude and Codex.

The escalation triggers are concrete: an assertion change, a state change or extra lane hop, missing the 400-line target, or an LE-O1 failure.

## Example Adequacy Verdict

Pass. The four good/avoided pairs (delegation, current attempt, interrupt route, lazy detach) target exactly the regressions that matter.

## Material Premise Validation

No material premise beyond the established basis. The design adds no new state, recovery or defensive machinery. Both scenarios (SCN-001/SCN-002) are `Supported Normal` with production paths verified in code. The stale-turn residual is an approved non-goal and drives nothing.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None blocking.

Non-blocking implementation notes:

- **N-1: pin promise identity in the new test, not only resolved values.**
  - The planned check, "concurrent `prepareTermination()` calls resolve to the same prepared object", would also pass with a forbidden `async` wrapper. Both promises would resolve to the same object.
  - Add `expect(run.prepareTermination()).toBe(run.prepareTermination())` (concurrent, plain case). Add the same for `tryPrepareTerminationIfQuiescent()` while a try is in flight.
  - Both hold today: lines 221 and 236 return the stored promise.
  - Keep the planned single-`backend.terminate` check for `terminate()`. It holds today because `commit()` returns the same `committed` and `finishCommittedTermination` coalesces.
- **N-2: lazy closures for every callback option.**
  - Pass `warn: (message) => logger.warn(message)`, not an eagerly captured `console.warn`, to match today's lazy sink at line 278.
  - Likewise, pass arrow closures for `reconcileRecovery`, `publishInputState`, `drainInput` and `dispatchCanonicalStatus`, the same way as the lazy detach rule.
- **N-3: equivalence details to keep in the verbatim copy.**
  - `waitForActiveInputDispatch` must call `inputDispatch.active()` on every loop iteration.
  - `uncertainClaim()` truthiness stands in for `uncertainInputDispatch` truthiness. If `ClaimedInputDispatch.claim` ever becomes optional, revisit this mapping.

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- **Subtle timing drift** that the suites cannot see. Mitigated by the shape rules, N-1 and the LE-O1 ×10 Codex gate.
- **Base failures near this code.** `agent-run-manager` has 16. Compare by test name and message (AC-009).
- **The stale-local-turn residual** (predecessor N-1) is carried unchanged by approval.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (no additional premises)
- Notes: the SR-004 package is ready for implementation on `codex/agent-run-termination-extraction` @ `774b51d8c`.
