# Design Review Report — standalone-agent-run-root

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/requirements-doc.md` (Approved, SR-002; unchanged in SR-006)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/investigation-notes.md` (E-01–E-22)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/solution-revision-record.md` (SR-001–SR-006)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-spec.md` (SR-006, § 11 "Root shutdown fence completion race")
- Triggering downstream evidence:
  - `code-review-report.md` § "API/E2E Failure-Origin Review (Round 5, F-02)" (CRR-005, Design Impact);
  - `api-e2e-evidence/r2-o01-diag-le-o1-codex-4.log`.
- Supplemental Task Artifacts Reviewed: predecessor UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`. Unchanged and not affected by SR-006.
- Relevant Solution Revision IDs:
  - SR-002: requirements basis.
  - SR-004/SR-005: design passed in ARCH-REV-002/ARCH-REV-003.
  - SR-006: the fence semantics in § 11.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4 (delta review of § 11)
- Trigger: SR-006 answers CRR-005 F-02 (Design Impact). A busy Org root on Codex cannot be stopped; this happens in 3 of 10 runs on the branch and 0 of 12 on the base.
- Prior Review Round Reviewed: Round 3 (`ARCH-REV-003`, Pass on SR-005)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: worktree head `f84497dd4` (docs only on top of `f2c32a2cc`), base `b37d7a934`. Code read:
  - `agent-execution/domain/agent-run-root-shutdown-fence.ts`, all 60 lines:
    - An accepted interrupt does not settle; the attempt waits for quiescence.
    - A rejected interrupt that is not yet quiescent calls `settle(result)` permanently.
  - `agent-execution/domain/agent-run.ts`:
    - `fenceInputAndInterruptForRootShutdown` at 257–270;
    - the fence construction at 69–75;
    - `onCanonicalEventsDispatched → scheduleRootShutdownFenceEvaluation` at 290 and 453–455;
    - `isRootShutdownQuiescent` at 429–435.
  - `agent-execution/domain/agent-run-interrupt-state.ts`, lines 30–110:
    - The reservation is released on a non-accepted result inside the dispatch queue before it resolves.
    - `hasActiveReservation` and `hasPendingProviderRequest` are both part of quiescence.
  - `events/processors/lifecycle-status/agent-turn-lifecycle-state.ts#reconcileRuntimeSnapshot`, lines 101–135. When the runtime reports no current turn, a local `IDENTIFIED` turn is **not** cleared; it stays "running".
  - Retry memo at every root layer. Each one clears on a non-accepted result:
    - `createFrozenRootTerminationScope` (`frozen-root-termination-scope.ts:18-31`);
    - the Team `createFrozenTerminationScope` (`flat-team-execution-manager.ts:431-470`);
    - `RootTeamRun.terminate`.
  - `ConfiguredAgentExecutionHandle.fenceForRootShutdown` (lines 147–155) does not memoize and re-calls the AgentRun on every attempt.
  - The only production callers of `fenceInputAndInterruptForRootShutdown` are the handle chains above, so none depends on a stable failed promise.
  - The diagnostic log shows the identical Codex `-32600 no active turn to interrupt` result returned 3 times for one Org (the latch).

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Unchanged and justified: § 11 changes Stop semantics in a concurrency-critical owner shared by every root on every runtime.
- Independent Architecture Review required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved basis:
  - AC-010: Stop is preserved for Team, Org and standalone roots.
  - AC-001: the predecessor suites pass unchanged, including LE-O1.
- Requirements are unchanged.
- Why fixing it here is correct:
  - The branch makes an approved Stop path fail. Fixing the shared owner restores approved behavior and adds none.
  - The alternative, an AC-001 exception, would change approved acceptance. Rejecting it is correct.
- Scenario: the user stops a busy Org while a turn is ending. This is a `Supported Normal Scenario` (SC-03/AC-010). Stopping during activity is Stop's purpose, and a turn ending within the interrupt round trip is ordinary provider timing.
- Forward path, verified against code:
  1. Stop → `AgentOrgRun.terminateOnce`;
  2. → frozen scope;
  3. → handle `fenceForRootShutdown`;
  4. → `AgentRun.fenceInputAndInterruptForRootShutdown`;
  5. → fence `evaluate` → `interrupt()`;
  6. → Codex rejects, because the provider turn has already ended;
  7. → the local turn-completion events are still in the dispatch queue, so the run is not quiescent;
  8. → `settle(result)` is latched;
  9. → every retry (a second Stop, `stopAll`) receives the same failure.
- Consequence: the Org is unstoppable for the rest of the process. The evidence is the diagnostic log (3 identical rejections) and the teardown `AggregateError`.

| BEH | Alignment | Evidence | Target Path | Status | Action |
| --- | --- | --- | --- | --- | --- |
| BEH-003 Stop/delete/archive/shutdown (all roots) | Pass | Pass (E-22, diagnostic log, code) | Pass. F-1–F-3 in the shared fence; no root-specific code | Confirmed | — |
| BEH-010 Preserved (AC-001 live gate) | Pass | Pass | Pass. LE-O1 on Codex ≥10 consecutive passes, plus the AC-001 suites on Claude and Codex | Confirmed | — |
| BEH-001, BEH-002, BEH-004–BEH-009 | Pass | — | Not affected by SR-006 | Confirmed (ARCH-REV-003) | — |

## Supplemental Artifact Coherence Verdict

N/A for SR-006. There is no UI surface change. The predecessor UI/UX spec is unchanged (Pass, ARCH-REV-003).

## Task Design Health Assessment Verdict

Pass.
- Classification: `Missing Invariant` in the correct owner. The invariant is "a non-accepted fence attempt is not terminal".
- The fence is the right owner. The root layers above already encode retry-on-non-accept, and only this latch contradicts them.
- Placing the fix at the AgentRun fence, not per root or per runtime, is correct: one shared owner, no duplicated policy.

## Spine Inventory Verdict

| Spine | Verdict | Notes |
| --- | --- | --- |
| DS-003 Stop (all roots) | Pass | The span runs from the user's Stop to the root, frozen scope, handle, AgentRun fence and runtime interrupt, and ends with the root terminated or not accepted. It is stretched far enough to show the retry contract at every layer. |
| Bounded: fence attempt (new) | Pass | The states are begin, evaluate, interrupt once, open-awaiting-quiescence (rejected), and settle. Settle is either accepted, which is latched, or original-result/failed, which ends that attempt only. Evaluation is triggered by the existing post-dispatch microtask, plus one evaluation at timer expiry. |

## Boundary / Dependency / Interface Verdicts

Pass.
- `AgentRunRootShutdownFence` keeps its narrow callbacks (`snapshot`, `interruptActiveTurn`), plus an injectable bound.
- `AgentRun` changes are limited to selecting the attempt and the diagnostics.
- No change to `isRootShutdownQuiescent`, input admission, runtimes or root classes. Needing one is an escalation trigger.
- No runtime error-text parsing. This is correct:
  - the texts differ by runtime (Codex `-32600`, Claude `has no active turn`), and both map to `RUNTIME_COMMAND_FAILED`;
  - local turn-completion dispatch is the authoritative signal.

## Review-Focus Verdicts

### F-3 retryability versus the original "irreversible latch" intent: sound

- **Irreversibility as implemented.** The current latch gives three properties:
  - one interrupt per attempt;
  - shared results for concurrent callers;
  - accepted stays accepted.
- **F-3 keeps all three.** Only the *failure* stops being permanent.
- **Failure permanence was never relied on:**
  - Every layer above the fence clears its memo on non-accept: the Org/Agent frozen scope, the Team frozen scope and `RootTeamRun.terminate`.
  - The handle re-calls the AgentRun on every attempt.
  - No test asserts that a failed fence stays latched (E-22).
  - So the permanent failure contradicted the established contract of the termination chain rather than expressing one.
- **Input stays fenced across attempts.** No reopening is introduced, so root shutdown remains one-way for input.

### The 5000 ms bound: proportionate

- **Normal path.** The turn-completion dispatch after a "no active turn" rejection normally lands within milliseconds. The bound is therefore not on the success path; it only caps a genuine non-quiescent failure.
- **What the bound costs.** On that failure path:
  - Stop reports failure up to 5 s later than today, instead of immediately;
  - Stop then becomes retryable, where today it is permanently failed.
- **No conflicting caller.** I found no caller-side timeout shorter than 5 s in the root termination chain.
- **Required properties are specified:**
  - a named constant that tests can inject;
  - timer cleanup on every settle path;
  - `unref`;
  - one final evaluation at expiry.

### Quiescence as the only success signal: sufficient on every runtime

- **It is the existing success signal.** An *accepted* interrupt already settles only on `isRootShutdownQuiescent()`. F-1 applies the same runtime-agnostic signal to the rejected case.
- **The signal is local and covers each in-flight item:**
  - the active turn;
  - a pending command;
  - an interrupt reservation;
  - a pending provider request;
  - input dispatch;
  - input admission.
- **No runtime classification is needed:**
  - A runtime that rejects because the turn already ended reaches quiescence when its completion is dispatched.
  - A runtime that rejects for another reason while its turn is still running either quiesces naturally within the bound, which is a correct Stop because nothing is in flight, or settles the original result as today.
- **AutoByteus native.** A local `NO_ACTIVE_TURN` rejection cannot occur through the fence, because the fence interrupts only when `hasActiveTurn`.

## Existing Capability Reuse / Allocation / File Mapping

Pass. The change is confined to the two existing owner files, plus a new unit test file (`agent-run-root-shutdown-fence.test.ts`), `agent-run.test.ts` and `agent-org-run-termination.test.ts`. No new subsystem.

## Removal / Legacy Verdict

Pass. The permanent-failure latch is replaced cleanly. There is no dual path and no flag.

## Persisted-Data Transition Verdict

Pass: `Not Affected`. The change is runtime-only.

## Change / Refactor Safety Verdict

Pass.
- The listed deterministic tests cover F-1, F-2, F-3, the throwing interrupt, concurrent callers and an Org retry.
- The existing accepted-fence, compaction-race, frozen-scope, handle and Team/Org termination suites must pass unchanged.
- Live gate: LE-O1 on Codex ≥10 consecutive passes.

## Example Adequacy Verdict

Pass. The non-binding shape guidance (per-attempt latch; `AgentRun` holds the current attempt) is concrete enough.

## Material Premise Validation

### `P-004`: the "no active turn" rejection arrives while the local turn-completion events are still being dispatched (completion race)

- Requirement: AC-010, AC-001 (LE-O1).
- Initiating basis: `User`. On the Org run surface, the user clicks Stop while an agent's turn is ending.
- Forward path: as traced in the basis section above.
- Consequence: the Org cannot be stopped for the rest of the process.
- Reachability: `Reachable`. The evidence is the diagnostic log, the 3/10 frequency on the branch and the code path. It drives § 11, which is proportionate to the consequence.

### `P-005`: the local turn state is stale (the completion event never arrives)

- Basis: E-22 lists race versus stale as unknown. There is no witness of a lost completion event.
- Code fact: `reconcileRuntimeSnapshot` keeps a local `IDENTIFIED` turn when the runtime reports none. Under stale state, every F-3 retry would interrupt again, be rejected and fail after the bound, so Stop would still never succeed.
- Classification: `Unclear`. It drives no new machinery, which is correct.
- Note: the design's risk sentence "F-1 and F-3 handle both" overstates this. Stale state is *detected* (F-4) and *bounded*; it is not *handled*. See note N-1.

### `P-006`: a second, different turn starts during an open attempt

- Scenario: a command forwarded before the fence starts a new turn after the rejected one.
- Effect: F-1 forbids a second interrupt within the attempt. The attempt would therefore fail at the bound, and the next Stop would interrupt the new turn.
- Classification: `Unclear`. There is no evidence that a pending command can coexist with an active turn on these runtimes. Even if it can, the outcome is bounded and retryable, which is no worse than the base. It drives no machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking. The root-cause variant (race versus stale) is resolved by the live gate and the F-4 diagnostics, not by design speculation.

## Review Decision

`Pass`

## Findings

No blocking findings. AR-001 to AR-003 remain Resolved.

Non-blocking implementation notes:

- **N-1 (stale state: escalate, do not tune).**
  - **Escalation rule.** Treat an F-4 *expiry* warning seen in LE-O1 or the AC-001 live runs as evidence of stale state (P-005), or of a new turn (P-006), when it shows a local `IDENTIFIED` turn. Do not raise the bound or add error-text recognition. Return it as a Design Impact.
  - **Wording correction.** In design-spec § Risks, "F-1 and F-3 handle both" should read "F-1 handles the race; stale state is bounded and diagnosed (F-2/F-4), and escalates if observed". The Solution Designer can make this edit at the next revision.
- **N-2 (test addition).** Add an F-2 case where quiescence is reached *without* a canonical event dispatch, for example when a pending command is cleared. The expiry-time evaluation must then settle `{ accepted: true }`. F-4 should log the turn ID at both rejection and expiry, so that a turn change (P-006) is visible.

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- **Race versus stale is unproven.** Mitigated by the LE-O1 ≥10 gate, the F-4 diagnostics and escalation rule N-1.
- **Failure-path Stop latency.** A genuinely failed Stop now reports up to 5 s later, and is retryable. Acceptable: it happens on the failure path only.
- **Unchanged from ARCH-REV-003:**
  - base-failure comparison by test identity;
  - the General Agent blast radius;
  - host activation under the root gate;
  - header parser tolerance.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-004 is `Reachable` and drives § 11. P-005 and P-006 are `Unclear` and correctly drive no machinery.
- Notes:
  - SR-006 § 11 is ready for implementation.
  - Next steps: implementation, then code review, then API/E2E (LE-O1 on Codex ≥10; AC-001 on Claude and Codex).
