# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail — Local Fix (implementation) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, CR-001 fix) | Fail | Pass | CR-001 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E Pass (API-REV-001) | Pass (CRR-002, source) | Pass | None |

## Revision Entries

### CRR-001 — Initial source review of IR-001: one Local Fix (never-reached second-clock fallbacks)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-001…SR-006
- Relevant architecture-review revision IDs: ARCH-REV-001…ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail (Local Fix)
- What changed in the review result and why: first result.
  - D-1, D-2, D-3 and SR-006 are confirmed in code. Order comes from its owner, time from the run's one stamp point, and every boundary formats it and fails loudly when it is missing.
  - CR-001: three never-reached fallbacks to a second clock remain in code this change wrote or touched: the recorder's `extractEventTime`, the provider boundary recorder, and the web hydration's `toDate` (viewer clock).
  - D-2's comment still names the old forwarding time.
  - The implementer's three points are accepted.
  - FU-004 (run list navigation time) and FU-005 (activity hydration `toDate`) were recorded.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: Cleanup 9.0; Naming 9.2; `Local Fix` owned by implementation
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: real runtimes left to API/E2E; same-version deploy; FU-002, FU-004, FU-005

### CRR-002 — Targeted delta review of IR-002: CR-001 resolved, Pass

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. Source changes are only in CR-001's places, plus test fixtures and documents.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002), CR-001
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001, Local Fix CR-001)
- Current authoritative result: Pass
- What changed in the review result and why:
  - `serverTimeMsOf` is the one rule for the streams and the recorder, and an unstamped event fails on every path.
  - The fallbacks to the payload and provider clocks are removed, together with `extractTimestamp` and its normalizer (no caller left).
  - The web hydrates a row without `ts` as `null`.
  - D-2's comment is corrected.
  - New cases are red before the fix; fixtures stamp their events; `native-skill-notice-history` follows REQ-002.
  - The integration suite, not run in IR-001, now passes (IMP-17).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002 (`eaebb94304`, `8fbffd707f`) | `agent-run-event.ts` `serverTimeMsOf`; `runtime-memory-event-payload.ts` `extractEventTime`; `provider-compaction-boundary-recorder.ts:47`; web `runProjectionConversation.ts` `toServerTime`; D-2 comment; `grep extractTimestamp` empty; IMP-16 (new cases red before, green after), IMP-17 (integration 92 files / 523 tests, clean e2e, MSP-105) |

- New or remaining finding IDs: None
- Material score or classification changes: Cleanup 9.0 → 9.4; Naming 9.2 → 9.4; Runtime Correctness 9.3 → 9.4; no classification
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: real runtimes left to API/E2E; same-version deploy; FU-002, FU-004, FU-005

### CRR-003 — Proportional test-code review after API/E2E round 1: Pass

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); MSP-106, MSP-107
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002, source review)
- Current authoritative result: Pass
- What changed in the review result and why: reviewed the gated live cases (`mobile-conversation-order-live-cases.mjs`) and their registration.
  - They use real runtimes (Claude, native) with test-owned credentials, from the vault only.
  - Each round runs with the phone clock verified 2 s off and checks the drawn order (live and reopened), the node's entry order, and the app state's times against the node's stored times (500 ms bound).
  - The evidence matches the report. No findings; three non-blocking notes.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (no prior test-review findings).

- New or remaining finding IDs: None
- Material score or classification changes: None
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: N-5 and Codex not run live; no physical phone; FU-002, FU-004, FU-005; 609 FU-006 and FU-007 on the base
