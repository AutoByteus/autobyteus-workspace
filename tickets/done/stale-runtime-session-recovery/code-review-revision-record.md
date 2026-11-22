# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | `Fail`: `Design Impact` | CR-001, CR-002 (new) |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, SR-003, ARCH-REV-003) | `Fail` (CRR-001) | `Pass` | CR-001, CR-002 resolved |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review (API-REV-001 `Pass`) | `Pass` (CRR-002, source) | `Pass` | None |

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

### CRR-002 — Round 2: every composition gives a renewal both parts; unread fields removed

- Canonical review report updated: `code-review-report.md` (§ Latest Round CRR-002, scorecard rows 1, 5, 7, 8 and 10, structural and legacy checks, Classification, Recipient, Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. A shared domain type, a provider error shape and two composition roots changed. Unchanged code is carried forward from CRR-001.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001, CR-002
- Relevant solution revision IDs: SR-003 (DEC-007 (a), AC-008)
- Relevant architecture-review revision IDs: ARCH-REV-003 (N-5)
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The application execution scope wires `RuntimeHandoverNoticeService` as its run manager's input preface and as the lifecycle observer of both managers, as the general supervisor does, and keeps its switch memory.
  - The application host's supervisor gets the switch recorder and the notice first in its platform notices, as in the studio.
  - AC-008 is proven per composition with real wiring, with negative controls on each wire and on the order.
  - `RuntimeSwitch.cause` and `CodexAppServerRpcError.rpcCode` are removed.
  - Deviations 6 and 7 hold.
- Supported product scenario / material-premise basis changes: SCN-APP is now served in every composition.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (rule 11) | Resolved | SR-003, ARCH-REV-003, IR-002 (`a2db91def8`) | `runtime-switch.ts` without `cause`; `codex-app-server-client.ts` without `rpcCode`; glossary updated; IMP-10, IMP-11 |
| CR-002 | Open (`Design Impact`) | Resolved | SR-003 DEC-007 (a), AC-008; IR-002 (`f79773703d`, `132471ccd9`) | `application-execution-scope-kernel-builder.ts`, `start-standalone-application-host.ts`; IMP-12 (10 negative controls), IMP-13 (built-server notice check with a negative control) |

- New or remaining finding IDs: none
- Material score or classification changes: Data-Flow Spine 8.6 → 9.4; Shared-Structure 8.8 → 9.4; API/E2E Readiness 8.6 → 9.3; Runtime Correctness 8.7 → 9.4; Cleanup 9.0 → 9.5. `Fail` → `Pass`.
- Recommended recipient: API/E2E; informational notice to implementation
- Remaining risks or uncertainty:
  - RSK-001…003 (Claude opens its process at restore; restart-resume to verify);
  - live AC-007;
  - no Claude built-server E2E;
  - no built-host E2E (the host serves no run API).

### CRR-003 — Proportional test-code review after API/E2E round 1

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). `lost-session-renewal-live.e2e.test.ts` (new), `claude-live-agent-harness.ts`, `claude-agent-streaming-session-lifecycle.e2e.test.ts`.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-001; LC-01…LC-03, API-06/06nc
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002, source review)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The live tests prove AC-007, AC-002, AC-003, AC-006, REQ-004, REQ-007 and RSK-003 on the built server with real CLIs and test-owned homes. The notice is read at the real CLI boundary by pass-through recorders.
  - The lifecycle test's stale lazy-open assertion is replaced, and the harness now follows the factory's restore check (with a negative control).
  - The Codex auth symlink follows TESTING.md.
  - The deviation (AC-001 with the real Claude CLI) is accepted.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (first test review). CR-001 and CR-002 were resolved in CRR-002.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty:
  - Grok and DeepSeek not run live;
  - no built-host E2E;
  - FU-001, FU-002.
