# Code Review Revision Record — update-restart-reliability (autobyteus-339)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-API-001) | Pass | Fail: `Design Impact` (with a Requirement Gap part) → Solution Designer | F-API-001 (P-001 reclassified) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-002; D1 Full Re-Audit) | Fail | Pass | F-API-001 (resolved by design) |

## Revision Entries

### CRR-001 — Initial source review of IR-001 (server close options; install after an incomplete stop)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001; code `ddb03d0d0b`)
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-001
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, 9.5/10, every category ≥ 9.2, no findings
- What changed in the review result and why: the initial baseline.
  - D1's constant is spread into all four Fastify constructions. The verified Fastify 5.12.7 close order is cut after `preClose`, then `server.close()` in the same tick, then `onClose`.
  - D2's guarded `prepared` transition and the `isServerProcessGone()` fact match DS-002 and REQ-002 / DEC-005.
  - Deterministic tests fail on base.
- Supported product scenario / material-premise basis changes: None. P-001 and P-002 are confirmed; candidates CR-C1 to CR-C6 are all rejected as findings.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (baseline); Medium / High confirmed
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: AC-002 (with AR-002's mutation) and AC-003 (≥ 40 desktop busy quits) are validation-owned; N-1 to N-4; FU-001.

### CRR-002 — Failure-origin review of F-API-001 (cut createAgentRun leaves partial runs)

- Canonical review report updated: `code-review-report.md` (§ Round 2; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-API-001; SCN-002b; evidence API-02, API-02B, API-03
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-001 (P-001 / AR-002)
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`, `Design Impact`, owned by the Solution Designer
- What changed in the review result and why:
  - `createAgentRun` persists a prepared run before activation and does not roll it back.
  - With D1's cut, the handler overlaps the cleanup, so activation is refused and a prepared-only run remains. Alternatively, the run completes but the client never learns its ID.
  - On the base build the same creates completed with responses (API-03). That contradicts the design and architecture-review premise that admission closure guards the overlap and leaves no partial run.
  - The code matches the design. My CR-C1 in round 1 accepted the premise without tracing a state-changing handler; that is a review gap.
- Supported product scenario / material-premise basis changes: P-001 is reclassified as contradicted. SCN-002b (create during an update restart) is confirmed as a supported normal scenario.

#### Prior Finding Resolution

None (CRR-001 had no findings). CR-C1 (the round 1 rejected candidate) is superseded by F-API-001.

- New or remaining finding IDs: F-API-001 (Design Impact); FU-003 (follow-up: `cleanupStalePreparedRuns` has no production caller)
- Material score or classification changes: category 8 goes from 9.3 to 8.8; Medium / High unchanged
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the lost-response part needs a DEC-002 side-effect decision; whether non-shutdown activation failures leave the same leftovers is Read only.

### CRR-003 — Implementation review of IR-002 (grace-drain client-connection close)

- Canonical review report updated: `code-review-report.md` (§ Round 3; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit` of D1; its mechanism and interface were replaced. D2 is carried forward unchanged: the desktop diff since IR-001 is empty.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002; code `591bf52551`, docs `e0dc8fdf76`), F-API-001
- Relevant solution revision IDs: SR-004, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-002)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - `installClientConnectionClose` is installed as each server's last `preClose` hook. It destroys never-used connections and late arrivals, drains requests in progress within 2 s, and then calls `closeAllConnections()`.
  - That keeps the base build's guarantee for requests in progress without the FU-008 stall. I verified the hook against Fastify's close order and the edge cases.
  - Long-lived HTTP streams were checked: Agent Tools MCP streams are closed by their host, and the MCP gateway GET ends immediately.
  - The old constant is removed cleanly. The tests include mutation checks and the studio order test.
- Supported product scenario / material-premise basis changes: round 2's contradicted P-001 is replaced by the grace rule (SR-004 DEC-002).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-API-001 | Open (`Design Impact`) | Resolved by design and code; runtime proof pending in AC-002 | SR-004, SR-005, ARCH-REV-003, IR-002 | `client-connection-close.ts`; IMP-08 (7 passed; the mutations fail 5 and 4); IMP-09 (order) |

- New or remaining finding IDs: None
- Material score or classification changes: category 8 goes from 8.8 back to 9.3; overall 9.5; Medium / High
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: handlers longer than 2 s are cut (FU-004); N-5 to N-7; there is no general guard that future servers install the hook last (CR-C7, a note).
