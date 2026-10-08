# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; REQ-001..007, AC-001..007, DEC-001 = A; unchanged since SR-001/SR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AINV-009..013; AINV-013 corrects AINV-010)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003, SR-004)
- Design Spec Reviewed As Context: `design-spec.md`, sections "SR-003 Design Revision" (DS-005) and "SR-004 Correction" (authoritative over SR-003), plus the corrected DS-002 trace
- Supplemental Task Artifacts Reviewed As Context: `handoff-sr-004-design-correction.md`; `implementation-design-impact-ir-003.md` (DI-001, history only)
- Relevant Solution Revision IDs: SR-003, SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; AR-NB-001..003; PREM-001)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-003 (`b3b28d47b`), which supersedes IR-002 (`d30c11204`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 3
- Review Scope: `Full Review` of the IR-003 source delta. This is the first implementation-source review of this package. CRR-001/002 were failure-origin rounds with no scorecard.
- Review Scope Evidence (round >1):
  - Delta `git diff d30c11204 b3b28d47b`: 4 source files and 2 test files.
  - The change stays inside one owner (`ConfiguredAgentExecutionHandle`) plus the event type and the input-contract doc comment.
  - The data-flow spine and the callers above the handle are unchanged.
- Trigger: Implementation Engineer, "Implementation Complete" for IR-003 (SR-003 + SR-004, `task_size=Small`, `architectural_risk=High`).
- Prior Review Round Reviewed: CRR-002 (failure-origin, Design Impact → solution_designer)
- Latest Authoritative Round: 3
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record (failure-origin only): N/A this round
- Delivery Revision Record: N/A
- Failing Scenario IDs (prior round): DTL-003, now expected to pass; the API/E2E rerun confirms it.
- Exact Commands Run By Reviewer:
  - `pnpm exec vitest run tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts tests/unit/agent-collaboration/configured-root-first-work.test.ts tests/unit/agent-collaboration/delegated-team-lazy-member-activation.test.ts tests/unit/agent-team-execution/flat-team-member-release-independence.test.ts --no-watch` → 4 files, 107/107 passed
  - `pnpm exec tsc -p tsconfig.build.json --noEmit` → no errors

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High` (raised in SR-003)
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes` (High risk)
- Classification evidence or correction required: None. The delta matches the Small/High rationale: one shared owner, and every Team/Org member's first input is in scope.

## Review Scope

- Changed implementation and behavior reviewed:
  - `ConfiguredAgentExecutionHandle`:
    - the new private `startForInput()` (DS-005), used by `reserveInput` and `postMessage`;
    - the closed-input branch (AR-NB-002);
    - `describeActivationFailure()`, which replaces `readinessFailureCode()` (AR-NB-001);
    - card suppression on closed input in `initializeReady` (SR-004 item 3);
    - `publishCommandStatus` now returns a boolean.
  - `CollaborationAgentPresentationEventAdapter`: explicit `readiness_failure` branch plus an exhaustive `never` check.
  - Doc comments in `collaboration-agent-execution-event.ts` and `agent-run-input-contract.ts`.
- Files / areas reviewed: the four source files above, `configured-agent-status-overlay.ts` (set/clear semantics), `root-communication-engine.ts:54-57` (reservation mapping), and the two changed unit test files.
- Explicit exclusions:
  - the SR-002 package source (`203eb29e1`): API/E2E exercised it, and it is outside this delta;
  - the API/E2E engineer's uncommitted edits to `delegated-team-lazy-member-activation.e2e.test.ts` (API/E2E-owned);
  - the deferred cleanup items (`followup-cleanup-ticket-brief.md`).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-005 / AC-004 says a member start failure, at first work, gives the sender a failure that names the cause, shows member `error`, and leaves the others unaffected. REQ-007 / BEH-002 keep existing behavior, including the member's conversation error card (AINV-013). AC-005 says no errors come from never-started members during lifecycle events (Task DONE).
- Design-spec behavior map verified against the implementation:
  - DS-002 (corrected trace): `send_message_to → RootCommunicationEngine.deliver → reserveRecipientInput → <root>.delivery.reserveAgentInput → … → ConfiguredAgentExecutionHandle.reserveInput → startForInput → ensureReady`. This matches the code, and the engine maps `{reserved:false, code, message}` to a not-accepted delivery (`root-communication-engine.ts:55-56`).
  - DS-001 (seed → `postMessage` → `startForInput`): matches.
  - DS-005 pseudo-code: matches line for line (`configured-agent-execution-handle.ts`, `startForInput`).
- Design review report and round confirmed: ARCH-REV-002 Pass. AR-NB-001..003 are applied (see the checks below).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-005 / REQ-005 member branch (DS-002) | Confirmed | `reserveInput` → `startForInput`. On failure: `error` overlay plus `{reserved:false, code:"AGENT_RUN_ACTIVATION_FAILED", message:"<code>: <message>"}`. One card comes from `initializeReady`. Unit: `configured-agent-execution-handle.test.ts` "start failure … exactly one conversation card" (both entry points) | — |
| BEH-001 coordinator branch (DS-001) | Confirmed | Seed → `postMessage` → `startForInput` → `{accepted:false, code, message}` → dispatch failure. Unit: `delegated-team-lazy-member-activation.test.ts` coordinator case passes | — |
| BEH-004 / AC-005 Task DONE race (PREM-001) | Confirmed | `startForInput` re-evaluates `assertInputAllowed()` after the active-run check. Closed input gives `AGENT_RUN_NOT_ACCEPTING_INPUT`, clears only our own `initializing`, and sets no `error`. `initializeReady` suppresses the card under the same predicate. Unit: "input closed during the start …", "never withdraws an existing error" | — |
| BEH-002 / REQ-007 conversation card | Confirmed | The card is still emitted once per failed start. The adapter maps it through an explicit branch to the same `ERROR` presentation (`errorScope: runtime`, `errorEffect: terminal`). Unit: adapter regression case | — |
| AR-NB-003 `postMessage` after a successful start | Confirmed | Post-start code is unchanged: `assertInputAllowed`, `postUserMessage`, `member_input` on accept, `error` overlay on `accepted:false` | See CAND-3-01 for one narrowed edge |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002-F (= FO-SCN-001) | REQ-005, AC-004 | System | Team member | Hand work to a teammate whose runtime cannot start | `send_message_to` / handoff | Normal (approved alternate) | DS-002 → `startForInput` | Typed failure with cause; member `error`; one card | requirements-doc SCN-002; DTL-003 evidence | Supported Normal Scenario | Use |
| SCN-001-F | REQ-005 coordinator clause | System | Delegating agent | Delegate to a Team whose coordinator cannot start | `delegate_task` | Normal (approved alternate) | DS-001 → seed `postMessage` → `startForInput` | `delegate_task` fails, naming the cause | requirements-doc SCN-001; DTL-008 | Supported Normal Scenario | Use |
| PREM-001 | AC-005, REQ-003 | Operational | Task owner | Task marked DONE while a not-started member is starting for a teammate message | Task DONE operation | Explicit Edge | Fence closes during `prepareActivation` → `startForInput` closed branch | Not accepting; no `error`, no card | design-review-report PREM-001 (Reachable); `root-task-agent-resource-scope.ts:59-61` | Supported Explicit Edge Scenario | Use |
| SCN-005-F | REQ-007, BEH-002 | System | Member of a UI-started Team/Org | Same start failure on a configured member | `send_message_to` | Normal | Same handle | Card kept; typed failure replaces `-32603` (CAND-005, accepted) | AINV-013; ARCH-REV-002 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-3-01 | `postMessage`: a throw from `assertInputAllowed()` or `postUserMessage()` *after* a successful start now always propagates. Before, the single catch returned `accepted:false` if the run had become inactive in between | AR-NB-003 | The run must die between `ensureReady` resolving and `postUserMessage` (same tick chain) | Only reachable by artificial timing. With a live run the old behavior also rethrew | `configured-agent-execution-handle.ts` (`postMessage`); old catch at d30c11204 L136-146 | Reject | Technically possible but contrived timing. AR-NB-003 explicitly asked for no new post-start semantics. No finding |
| CAND-3-02 | The closed branch clears our own `initializing` overlay locally only (`overlay.clear()` does not publish). A client that saw `initializing` gets no explicit withdrawal | PREM-001 | Task DONE during a member start | Live view may show amber until the next status event. A fresh snapshot shows `offline`. The DONE copy is being stopped anyway | `configured-agent-status-overlay.ts` `clear()`; design SR-003 DS-005 "clear the initializing overlay"; IE residual 3 | Reject as finding; recorded as residual | The design specified it and architecture review accepted it. The consequence is cosmetic, in a supported edge scenario that is already tearing down. Publishing a withdrawal would be new machinery for no material consequence |
| CAND-3-03 | The "input closed now" predicate is evaluated twice (`initializeReady` catch and `startForInput` catch). A race can give a card plus `NOT_ACCEPTING` | PREM-001 | Same race, landing between two awaits | Cosmetic disagreement, once | design-review-report Residual Risks round 2 | Reject as finding; accepted residual | Accepted as designed by SR-004 / ARCH-REV-002 |
| CAND-3-04 | The adapter's `never` branch throws at runtime for an unknown kind | Engineering contract: exhaustive handling | Only if the type is bypassed | Not reachable through typed producers | `collaboration-agent-presentation-event-adapter.ts` | Reject | Not reachable. The compile-time check is the point |
| CAND-3-05 | CRR-001 CAND-002 ("`readiness_failure` has no consumer") was factually wrong. The adapter's implicit fall-through consumed it | Review-method correctness | — | It led SR-003 to plan a removal that would have changed REQ-007 behavior. SR-004 / DI-001 caught and corrected it | AINV-013; old adapter L86-97 at d30c11204 | Record as reviewer error, not as an implementation finding | I verified consumers by string grep instead of by type. Corrected in CRR-003; method note: check event consumers by type and exhaustiveness |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | SR-003 records `Duplicated Policy Or Coordination` + `Shared Structure Looseness`. The implementation removes the duplicated per-entry-point readiness catch, so only one remains (`startForInput`) | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No supplements. SR-004 owner-per-audience table implemented: sender result and overlay come from `startForInput`; the card comes from `initializeReady` | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/DS-002 unchanged above the handle. DS-005 bounded local spine is implemented as specified | None |
| Ownership boundary preservation and clarity | Pass | The handle remains the single owner of member readiness and failure classification. No per-root try/catch was added in delivery services | None |
| Off-spine concern clarity | Pass | `describeActivationFailure` is a module-private formatter serving the handle. The overlay stays the status off-spine concern | None |
| Existing capability/subsystem reuse | Pass | Reuses `AgentRunInputReservationResult`, the existing `AGENT_RUN_NOT_ACCEPTING_INPUT`, the overlay, and the presentation adapter | None |
| Reusable owned structures | Pass | One cause helper serves both the sender message and the indeterminate wrapper (AR-NB-001) | None |
| Shared-structure / data-model tightness | Pass | One activation-failure code on both result shapes. `readinessFailureCode` removed. The `started` union is local and tight | None |
| Repeated coordination ownership | Pass | The readiness failure policy exists once | None |
| Empty indirection | Pass | `startForInput` owns classification; it is not a pass-through | None |
| Separation of concerns / file responsibility | Pass | Changes stay in the handle's existing responsibility (member readiness for input) | None |
| Ownership-driven dependency check | Pass | No new imports beyond the type `AgentRunInputRejectionCode` from the input contract the handle already depends on | None |
| Authoritative Boundary Rule | Pass | Callers still use only `reserveInput` / `postMessage`. No caller reaches into readiness internals | None |
| File placement | Pass | Unchanged | None |
| Flat-vs-over-split layout | Pass | The helper stays module-private in the owning file. Splitting it out would be artificial | None |
| Interface / API / command boundary clarity | Pass | `reserveInput` / `postMessage` signatures are unchanged. Failure codes are documented in the contract | None |
| Naming quality | Pass | `startForInput`, `inputClosedReason`, `describeActivationFailure` say what they own | None |
| No unjustified duplication in changed scope | Pass | IR-002's duplicate catch is gone, not extended | None |
| Patch-on-patch complexity control | Pass | IR-003 replaces IR-002 in one commit, with no intermediate duplicate (SR-003 change sequence step 1) | None |
| Dead/obsolete code cleanup | Pass | `readinessFailureCode` removed. The SR-004 decision keeps `readiness_failure` intentionally | None |
| Test scenarios and assertions are clear and requirement-aligned | Pass | 10 new handle cases cover both entry points through `it.each`: failure plus card count plus retry, closed race, error not withdrawn, live-run rethrow, indeterminate cause, adapter regression. First-work assertions updated to the single code with the cause in the message | None |
| Test fixtures reusable and coherent | Pass | `build(...)` extended with an optional `assertInputAllowed`. Small `closable()` / `entryPoints` helpers | None |
| No stale/duplicated/compat-only tests | Pass | Existing `readiness_failure` assertions kept per SR-004. Nothing disabled | None |
| API/E2E readiness | Pass | The durable DTL-003 assertions (not-accepted result containing `AGY_MODEL_UNAVAILABLE`, writer `error`) match the new result: `AGENT_RUN_ACTIVATION_FAILED` with message `AGY_MODEL_UNAVAILABLE: …`, plus the overlay | API/E2E rerun |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `configured-agent-execution-handle.ts` | 470 | Pass | Pass (IR-003 delta ≈ +66 / −50) | Pass | Pass | Pass. Approaching the limit; the lifecycle-state audit is deferred to the cleanup ticket | None now |
| `collaboration-agent-presentation-event-adapter.ts` | 98 | Pass | Pass | Pass | Pass | Pass | None |
| `collaboration-agent-execution-event.ts`, `agent-run-input-contract.ts` | doc comments only | Pass | Pass | Pass | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Clean switch of the operator-visible code to `AGENT_RUN_ACTIVATION_FAILED`. No consumer branches on the old codes (ARCH-REV-002) |
| No legacy old-behavior retention | Pass | — |
| Dead/obsolete cleanup completeness | Pass | — |
| Persisted-data transition followed | Pass | `Not Affected` |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (carried, not new). `docs/modules/agent_team_execution.md:247-248` still names the removed `prepareConfiguredAgents` option, as already noted for Delivery. Optionally, document the activation-failure contract (`AGENT_RUN_ACTIVATION_FAILED`, with the cause in the message) in the team-execution/collaboration docs.
- Files: `docs/modules/agent_team_execution.md`.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| PREM-001 | Confirmed | Implemented as designed. The closed branch and card suppression share `inputClosedReason()` |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (94 / 100). This is a simple average, for trend only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-002 trace corrected and matching the code. DS-005 local spine is explicit | Nothing material | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner for readiness failure per audience. No bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | One activation-failure code across both result shapes. Contract documented | There are still two result shapes (`accepted` / `reserved`), which is deferred to the cleanup ticket | Unify the outcome vocabulary in the cleanup ticket |
| 4 | Separation of Concerns and File Placement | 9.0 | Change stays in the right owner | The handle is at 470 lines with heavy lifecycle state (P6 in the cleanup brief) | Lifecycle-state audit in the cleanup ticket |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One cause helper; local `started` union is tight | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear names and comments explaining each branch | `startForInput`'s catch has three branches packed tightly, but it stays readable | — |
| 7 | API/E2E Readiness | 9.5 | Durable DTL-003 assertions match the new outputs. Focused suites pass | Needs the gated E2E rerun | API/E2E rerun |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | All approved scenarios trace correctly. Retry semantics unchanged | Accepted cosmetic residuals in the PREM-001 race (CAND-3-02/03) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean code switch | — | — |
| 10 | Cleanup Completeness | 9.5 | IR-002 duplicate and `readinessFailureCode` removed | — | — |

## Findings

No blocking or non-blocking implementation findings in this round.

Prior findings:
- CR-FO-001: resolved by `startForInput`. Teammate delivery returns the typed failure plus `error`.
- CR-FO-002: resolved; DS-002 is corrected in the design spec.
- CR-FO-003: resolved as revised by SR-004. The duplicated readiness handling is removed and there is one failure code. The `readiness_failure` removal item was withdrawn because CRR-001's CAND-002 premise was wrong (CAND-3-05).

## Classification

N/A — `Pass`.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary). The implementation engineer gets an informational notice.

## Residual Risks

- CAND-3-02: in the PREM-001 race, the `initializing` withdrawal is local only. A live view may show amber until the next status event. This is cosmetic, and the copy is closing.
- CAND-3-03: the predicate is evaluated twice in the PREM-001 race, so a card and `NOT_ACCEPTING` may disagree once. Accepted by design.
- Pre-existing (ARCH-REV-002): a throw in `FlatTeamAgentExecutionHandle.getHandle()` / `createHandle()`, before the configured handle exists, can still escape `reserveInput`.
- Pre-existing: a failed start's `dispose()` clears the overlay locally without publishing.
- CAND-005 (accepted): UI-started Team/Org members now get the typed failure instead of `-32603`.
- Deferred cleanup ticket items: `followup-cleanup-ticket-brief.md`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10. Every category is ≥ 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - API/E2E should rerun the gated durable suite (DTL-001..008) and the AC-006 regressions on `b3b28d47b`.
  - Reviewer correction: CRR-001's claim that `readiness_failure` had no consumer was wrong (CAND-3-05).
