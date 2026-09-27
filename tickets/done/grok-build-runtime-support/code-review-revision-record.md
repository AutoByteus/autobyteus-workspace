# Code Review Revision Record — `grok-build-runtime-support`

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record keeps the concise chronological history.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `tickets/in-progress/grok-build-runtime-support/code-review-report.md` | Implementation Review, round 1 / IR-001 handoff (`2b31b046d`) | N/A | Pass | CR-001, CR-002, CR-003 (all Low, non-blocking) |
| CRR-002 | `tickets/in-progress/grok-build-runtime-support/code-review-report.md` | API/E2E Failure-Origin Review, round 2 / API-REV-001 Fail | Pass | Fail — Design Impact + Requirement Gap (+ implementation Local Fix) → `/solution_designer` | CR-004, CR-005, CR-006, CR-007 (new); CR-001..CR-003 unchanged |
| CRR-003 | `tickets/in-progress/grok-build-runtime-support/code-review-report.md` | Implementation Review, round 3 / IR-002 (`d7d4aa2ad`) after SR-011 + ARCH-REV-003 | Fail | Pass | CR-001, CR-002, CR-003, CR-004, CR-006, CR-007 resolved; CR-005 deferred by user |
| CRR-004 | `tickets/in-progress/grok-build-runtime-support/api-e2e-test-review-report.md` | Proportional API/E2E Test-Code Review / API-REV-002 Pass | N/A (first test review) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of the ACP layer + Grok Build runtime

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-001); scenarios SCN-001..SCN-011, CON-ACP
- Relevant solution revision IDs: SR-005, SR-006, SR-007, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass` (9.35/10; every category ≥ 9.0)
- What changed in the review result and why:
  - This is the initial baseline.
  - All BEH-001..BEH-013, REQ-014 and REQ-018 paths were traced in code and confirmed.
  - All eight handoff implementation decisions were accepted with evidence: AgentRun turn-terminal semantics, Claude/AGY precedents, file-change semantics, real foreign-response frames in the wire logs, and the need for the contract enums.
  - The reviewer independently verified:
    - the source typecheck is clean;
    - 13 server suites (87 tests), 2 `autobyteus-ts` suites (18 tests) and the web spec (3 tests) pass;
    - a temporary SDK exit probe (removed) shows pending requests reject in ≤ 330 ms.
- Supported product scenario / material-premise basis changes:
  - None. P-01..P-05 are confirmed.
  - Candidates CAND-01..CAND-06 and CAND-10..CAND-13 were rejected as unevidenced, design-mandated or contrived.
  - CAND-07..CAND-09 were promoted as Low non-blocking findings.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - CR-001: unused `AcpPermissionBridge.has()` / `AcpAgentProcess.stderrTail()`.
  - CR-002: design-spec text sync for implementation decisions 1/2/3/5, owned by the Solution Designer with AR-005.
  - CR-003: literal `protocolVersion: 1` vs the SDK `PROTOCOL_VERSION`.
  - All three are Low and non-blocking.
- Material score or classification changes: N/A (initial). task_size `Large` and architectural_risk `High` are preserved.
- Recommended recipient: `/api_e2e_engineer` (primary pass); `/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - Paid live flows are still to be run: AC-004, AC-005, AC-006 with Agent Tools, AC-008 and AC-015.
  - AC-012 is covered only for the JSON-RPC error path; the Grok exit-on-auth behavior is unobserved.
  - AC-013 `web_search` live use is not demonstrated.
  - `_x.ai` extension drift.

### CRR-002 — Failure-origin review of API-REV-001 (AC-012, AC-004 deny, REQ-005, AC-015)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/code-review-report.md` (section "API/E2E Failure-Origin Review (Round 2, CRR-002)", Findings, Classification, Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001). Findings F-1..F-4; scenarios GE2E-P1, GE2E-L2, GE2E-P3, GE2E-B1/B2.
- Relevant solution revision IDs: SR-005..SR-008
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`. Multi-origin; routed to `/solution_designer`.
- What changed in the review result and why:
  - Real Grok evidence:
    - an unauthenticated `session/new` returns JSON-RPC `-32000` and Grok stays up;
    - `reject_once` ends the turn as `cancelled`;
    - Grok auto-allows `echo`/`touch`.
  - Source tracing: the ACP factory rethrows the raw `RequestError`, and `AgentRunManager` replaces it with a generic `AgentCreationError`.
  - Source tracing: `GROK_BUILD → unsupported` → `configured:false` → blocking preflight issue.
  - Two findings were detectable in round 1 (CR-004, CR-005). Those review gaps are acknowledged, and the affected score rationale is lowered.
- Supported product scenario / material-premise basis changes:
  - CAND-06's exit premise is reclassified `Not Reachable` for missing auth; the start-time `RequestError` path is promoted (CR-004).
  - The four failing scenarios are supported normal scenarios.
  - The user de-scoped AC-015 testing, but REQ-017 remains in the approved basis.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Low, non-blocking) | Open (unchanged) | IR-001 | No code change since CRR-001 |
| CR-002 | Open (Low, non-blocking; Solution Designer) | Open (unchanged) | SR-008, AR-005 | Design text unchanged |
| CR-003 | Open (Low, non-blocking) | Open (unchanged) | IR-001 | No code change since CRR-001 |

- New or remaining finding IDs:
  - CR-004 (High, implementation Local Fix);
  - CR-005 (High, Design Impact);
  - CR-006 (Requirement Gap);
  - CR-007 (Requirement Gap / Unclear);
  - CR-001..CR-003 (Low, non-blocking).
- Material score or classification changes:
  - The round-1 Pass is superseded.
  - Runtime Correctness rationale drops to 7.5 and API/E2E Readiness to 8.5.
  - task_size `Large` and architectural_risk `High` are preserved.
- Recommended recipient: `/solution_designer`. The Solution Designer carries CR-004 into the revised implementation package; then implementation, code review and API/E2E follow again.
- Remaining risks or uncertainty:
  - The Grok auto-allow cause is unclear: the built-in safe-command list or remembered grants do not explain `touch`.
  - `web_search` is not present as a tool on this host/plan.
  - F-4(a) (pre-existing QUARANTINED apps) is a separate-ticket candidate.

### CRR-003 — Re-review of IR-002 (CR-004/CR-006 fixes, CR-001/CR-003 cleanup)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/code-review-report.md` (section "Implementation Re-Review (Round 3, CRR-003)", findings status, Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` ("IR-002 Delta"). Findings CR-001..CR-007; scenarios SCN-004, SCN-010.
- Relevant solution revision IDs: SR-009, SR-010, SR-011
- Relevant architecture-review revision IDs: ARCH-REV-003 (AR-006 open, Low, wording)
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-002)
- Current authoritative result: `Pass` (9.41/10; every category ≥ 9.0)
- What changed in the review result and why:
  - Delta `2b31b046d..d7d4aa2ad` (9 files) verified against the approved SR-011 basis:
    - the session classifies `cancelled` by state, checking interrupt first, with a per-turn user-rejection flag;
    - the bridge reports the answer outcome;
    - the neutral `acp-error-message.ts` plus factory rollback surface agent `RequestError`s and safe ACP errors as `AgentCreationError`;
    - `PROTOCOL_VERSION` is used; unused accessors are removed and stderr is drained only.
  - Reviewer re-ran:
    - the typecheck (clean);
    - the ACP/Grok unit suites (12 files, 68/68);
    - the zero-cost capability and replay e2e (8/8);
    - the neutrality grep (clean).
- Supported product scenario / material-premise basis changes:
  - AC-004 amended (SR-011), REQ-005 rationale clarified (SR-010), REQ-017/AC-015 deferred (SR-009).
  - New candidates CAND-14..CAND-16 were rejected: contrived, approved behavior, or accepted AR-006 interpretation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Low) | Resolved | IR-002 | `has()`, `stderrTail()` and the stderr buffer removed; `child.stderr.resume()` drains |
| CR-002 | Open (Low, Solution Designer) | Resolved | SR-009, SR-011 | Stale design phrases no longer present in `design-spec.md` (grep) |
| CR-003 | Open (Low) | Resolved | IR-002 | `initialize` uses `PROTOCOL_VERSION` |
| CR-004 | Open (High) | Resolved | SR-011 DS-001; IR-002 | `describeAcpActivationError` + factory rollback → `AgentCreationError`; manager passes it through (lines 369-387); unit test `session/new -32000` → `"Fake Agent: Authentication required: no auth method id provided"`; restore wrapped per AR-006 |
| CR-005 | Open (High, Design Impact) | Deferred by user (accepted, out of scope) | SR-009 (STC-002), SR-010 | AC-015 and the BEH-013 row record the known `unsupported` gap; no code change expected in this ticket |
| CR-006 | Open (Requirement Gap) | Resolved | SR-011 (AC-004 amended, user-approved); IR-002 | `endTurnFor` + `userDeniedInTurn`; four new session tests |
| CR-007 | Open (Requirement Gap / Unclear) | Resolved (requirements clarification) | SR-010 (REQ-005 rationale) | No code change required; the bridge still answers every raised request one-shot only |

- New or remaining finding IDs: none open.
- Material score or classification changes:
  - Runtime Correctness goes from the round-2 rationale of 7.5 to 9.2; Cleanup goes from 9.0 to 9.5.
  - task_size `Large` and architectural_risk `High` are preserved.
- Recommended recipient: `/api_e2e_engineer` (primary); `/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - A live re-run of the amended AC-004 and of AC-012 through `createAgentRun` is still owed.
  - The application launch gap (CR-005) is deferred to a future ticket.
  - AR-006 wording.
  - Grok's own permission policy decides which calls prompt (REQ-005 as clarified).

### CRR-004 — Proportional review of the durable Grok Build API/E2E tests

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/api-e2e-test-review-report.md` (new; `code-review-report.md` unchanged, latest implementation result CRR-003 Pass)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass, confidence 95%)
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review. The implementation review is at CRR-003, Pass.
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - 4 durable test paths reviewed: capability e2e updated; fake-CLI helper, zero-cost replay e2e and gated live e2e added.
  - Coherent scope, requirement-level assertions (including amended AC-004 and AC-012), shared helpers, restored env overrides, gated paid runs.
  - Derived fixtures reproduce live-observed Grok behavior.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none. Two non-blocking observations: the replay default-effort assertion and a stale comment on live line 194.
- Material score or classification changes: N/A. task_size `Large` and architectural_risk `High` are preserved.
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - The test changes are uncommitted; delivery must include them.
  - `web_search` is not demonstrable.
  - Grok's permission policy may drift.
  - Application launch is deferred (CR-005).
