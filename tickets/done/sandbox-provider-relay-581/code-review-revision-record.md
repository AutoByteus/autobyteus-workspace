# Code Review Revision Record: autobyteus-581

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, IR-001 | N/A | Fail (Local Fix) | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review (Targeted Delta), IR-002 | Fail | Fail (Local Fix) | CR-001 ✓, CR-002 ✓, CR-003 new |
| CRR-003 | `code-review-report.md` | Implementation Review (Targeted Delta), IR-003 | Fail | Pass | CR-003 ✓ |
| CRR-004 | `code-review-report.md` | API/E2E Failure-Origin Review, API-REV-001 | Pass | Local Fix (implementation) | F-1, F-2 |
| CRR-005 | `code-review-report.md` | Implementation Review (Targeted Delta), IR-004 | Local Fix | Pass | F-1 ✓, F-2 ✓ |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code review, API-REV-002 Pass | N/A (first test review) | Pass | — |

## Revision Entries

### CRR-001 — Initial full review of IR-001

- Canonical review report updated: `tickets/in-progress/sandbox-provider-relay-581/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` of the committed code `1bc0f90811` (excluding the uncommitted SR-008 edits in the worktree)
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-001; U-1, U-2)
- Relevant solution revision IDs: SR-007 (reviewed basis); SR-008 (in progress)
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail. Implementation-owned Local Fixes CR-001 (dormant `owner` sandbox caller) and CR-002 (IR-001's Codex login-token launch fails AC-005; SR-008 is being implemented in the same worktree, uncommitted).
- What changed in the review result and why: initial result. The eight recorded deviations hold. Candidates C-03 to C-07 are rejected with reasons in the report.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: initial scorecard 9.2 average; API/E2E Readiness 8.5, Runtime Correctness 8.6, Cleanup 9.0.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: U-2 and the Claude login-token live check (user inputs); fixed login-token path lists; REQ-015 relies on the reader rule (AC-011 in API/E2E).

### CRR-002 — Targeted delta review of IR-002 (CR-001, CR-002 / DEC-115)

- Canonical review report updated: `tickets/in-progress/sandbox-provider-relay-581/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` of `git diff 1bc0f90811 b2e7e0d3bd` (clean worktree). The delta stays on the prior findings' paths and only removes code.
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-002; CR-001, CR-002; evidence IMP-11, IMP-12, IMP-13)
- Relevant solution revision IDs: SR-007, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Fail. Local Fix CR-003.
- What changed in the review result and why: CR-001 and CR-002 are resolved. DEC-115 was tried and failed live (HTTPS-origin refusal, IMP-12), and its decided fallback was applied as a clean removal. The removal left the caller-header drop list with no value anywhere (CR-003).
- Supported product scenario / material-premise basis changes: SCN-002 now covers Claude and Grok only (DEC-115 fallback).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open | Resolved | IR-002, `32d6a7ae16` | `SandboxCaller` is `{ kind: "run"; runId }` only; the owner branches and the owner test case are gone; handoff deviation 10 |
| CR-002 | Open | Resolved | SR-008, IR-002, `a72ab72b1a`, `b2e7e0d3bd` | IMP-12 live failure, then the fallback: `codex_app_server` is not a login-token runtime (C1 naming it stops startup, with a test), no OpenAI login-token route, no `codexLogin`, `accountId` or ChatGPT-mode launch; grep finds no leftovers in `src` or the docs |

- New or remaining finding IDs: CR-003
- Material score or classification changes: average 9.2 → 9.4; API/E2E Readiness 8.5 → 9.3; Runtime Correctness 8.6 → 9.3; Shared-Structure 9.4 → 9.2; Cleanup stays at 9.0 (CR-003).
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: the requirements and design still describe Codex login tokens (the Solution Designer has been told); the Grok and Claude login-token live checks wait on the user; REQ-015 relies on the reader rule (AC-011).

### CRR-003 — Targeted delta review of IR-003 (CR-003)

- Canonical review report updated: `tickets/in-progress/sandbox-provider-relay-581/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` of `git diff 00318250e3 d624f09ce6 -- autobyteus-server-ts/src` (six files, removals plus one type guard; clean worktree; the commits in between change ticket docs only)
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-003; CR-003; IMP-14)
- Relevant solution revision IDs: SR-009 (DEC-116, DEC-117)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why: CR-003 resolved. The optional C-09 guard was applied as the single login-token check.
- Supported product scenario / material-premise basis changes: none beyond SR-009 (DEC-116, DEC-117), which matches the code.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open | Resolved | IR-003, `d624f09ce6` | `dropFromCaller`, `dropHeaders` and the request-side `drop` are gone; `git grep` at HEAD finds none; the response-side `drop` stays for `x-autobyteus-relay-reply`; IMP-14 typecheck and 154 tests pass |

- New or remaining finding IDs: none
- Material score or classification changes: average 9.4 → 9.5; Shared-Structure 9.2 → 9.5; Cleanup 9.0 → 9.4.
- Recommended recipient: `/api_e2e_engineer` (then the informational notice to `/implementation_engineer`)
- Remaining risks or uncertainty: the Grok and Claude login-token live checks wait on the user; REQ-015 relies on the reader rule (AC-011); design spec C3/C1 doc lines are stale.

### CRR-004 — Failure-origin review of API-REV-001 (F-1, F-2)

- Canonical review report updated: `tickets/in-progress/sandbox-provider-relay-581/code-review-report.md` (section "Round 4")
- Review entry point and round: API/E2E Failure-Origin Review, round 4
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001; F-1: API-L01, API-L07; F-2: API-L02 / SBX-03)
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-003 (code `d624f09ce6`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, source review)
- Current authoritative result: Local Fix, implementation (F-1, F-2)
- What changed in the review result and why: F-1 confirmed from `sandbox-pairing.ts:57-66` (a single setup-exchange fetch) and API-E01 (the port answers 66 to 220 ms after the code); it is runtime-only. F-2 confirmed from `app-config.ts:333-335` (memory always at `<dataDir>/memory`; the server never reads `AUTOBYTEUS_MEMORY_DIR`) and API-E02. F-2 is a review gap in CRR-001: the C8 variable's reader was not checked.
- Supported product scenario / material-premise basis changes: none (SCN-003).

#### Prior Finding Resolution

None (the source-review findings CR-001 to CR-003 stay resolved).

- New or remaining finding IDs: F-1, F-2 (API/E2E IDs)
- Material score or classification changes: none to the round-3 scorecard, apart from noting that Runtime Correctness would have been lower had F-2 been caught.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: the bind mount inside the anonymous data volume must be proven live (API-L02). AC-016 and the REQ-015 planted link wait on F-2.

### CRR-005 — Targeted delta review of IR-004 (F-1, F-2)

- Canonical review report updated: `code-review-report.md` (section "Round 5" and Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` of `git diff 0edd500997 7296a698d6`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, `implementation-handoff.md` (IR-004; F-1, F-2; IMP-15, IMP-16)
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Local Fix (CRR-004)
- Current authoritative result: Pass
- What changed in the review result and why: the health wait before the single setup exchange fixes F-1 (unit cases, 5 of 5 live). The memory folder is now bound at the node's real memory folder and the ineffective variable is removed, which fixes F-2 (5 of 5 live, `AppConfig` unchanged, no credential store in the folder).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-1 | Open | Resolved | IR-004, `7296a698d6` | `sandbox-pairing.ts` `untilAnswering`; `sandbox-pairing.test.ts`; IMP-16 5 of 5 connected |
| F-2 | Open | Resolved | IR-004, `7296a698d6` | Mount at `/home/autobyteus/data/memory`; no `AUTOBYTEUS_MEMORY_DIR` or `RUN_MEMORY_IN_SANDBOX` in sandbox code; IMP-16 `run_metadata.json` on the host under `agents/<runId>` |

- New or remaining finding IDs: none
- Material score or classification changes: none (9.5 average)
- Recommended recipient: `/api_e2e_engineer` (then the informational notice to `/implementation_engineer`)
- Remaining risks or uncertainty: API-L10 (AC-016 and the REQ-015 planted link) is not yet run; the design spec C8 doc line is stale; AC-005 live waits on the user.

### CRR-006 — Proportional test-code review after API-REV-002 Pass

- Canonical review report updated: `tickets/in-progress/sandbox-provider-relay-581/api-e2e-test-review-report.md`
- Review entry point and round: successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review): `tests/e2e/sandboxes/sandbox-live.e2e.test.ts` (added), `tests/integration/credential-proxy/provider-relay-peer.integration.test.ts` (QR-004 case)
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002; SBX-01 to SBX-08, QR-004)
- Relevant solution revision IDs: SR-009
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review (source review CRR-005 Pass)
- Current authoritative result: Pass
- What changed in the review result and why: both durable test changes are coherent, gated and isolated per TESTING.md, enter through the real tools and routes, and assert the approved contracts. No findings; one stale comment (line 171) is noted as optional.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: AC-005 live waits on the user (DEC-118); the doc lines listed for delivery.
