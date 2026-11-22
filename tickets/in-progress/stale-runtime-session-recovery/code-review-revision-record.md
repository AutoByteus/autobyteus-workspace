# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | `Fail`: `Design Impact` | CR-001, CR-002 (new) |

## Revision Entries

### CRR-001 — Initial implementation review: stale runtime session recovery

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-001, SR-002
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Design Impact` (CR-002, with CR-001)
- What changed in the review result and why: first result.
  - The studio path is sound: exact recognition on all five runtimes, the release confirmed before a renewal, retry by key, all five binding consumers.
  - CR-002: the application execution scope's run manager and the standalone application host's supervisor do not wire `RuntimeHandoverNoticeService`, and the host's supervisor has no switch port. So application-scope renewals (N-4) continue without the hand-over notice (REQ-003), and the host's delegated copies cannot renew (REQ-006). The design's Change Scope omits these compositions.
  - CR-001: `RuntimeSwitch.cause` (design-prescribed) and `CodexAppServerRpcError.rpcCode` are read by no production code (`DESIGN.md` rule 11).
- Supported product scenario / material-premise basis changes: SCN-APP recorded (Supported Normal Scenario; reachable)

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002 (open)
- Material score or classification changes: N/A (initial). Data-Flow Spine 8.6, Shared-Structure 8.8, API/E2E Readiness 8.6, Runtime Correctness 8.7, Cleanup 9.0.
- Recommended recipient: Solution Designer. Then implementation, a source review, and API/E2E.
- Remaining risks or uncertainty:
  - RSK-001…003;
  - live AC-007 and live Codex, Grok and DeepSeek renewals (API/E2E);
  - no Claude built-server E2E.
