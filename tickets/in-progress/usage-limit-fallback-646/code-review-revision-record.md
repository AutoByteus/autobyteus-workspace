# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | [code-review-report.md](code-review-report.md) | Implementation Review, IR-001 from `/implementation_engineer` | N/A | Fail (9.2/10; three categories below 9.2) | CR-646-01, CR-646-02, CR-646-03 |
| CRR-002 | [code-review-report.md](code-review-report.md) | Implementation Review round 2, IR-002 (SR-011) from `/implementation_engineer` | Fail | Pass (9.4/10) | CR-646-01, CR-646-02, CR-646-03 resolved |
| CRR-003 | [api-e2e-test-review-report.md](api-e2e-test-review-report.md) | Post-API/E2E test-code review, API-REV-001 from `/api_e2e_engineer` | Pass | Pass | None |

## Revision Entries

### CRR-001 — Initial source review: runtime fallback on a usage limit (IR-001)

- Canonical review report updated: [code-review-report.md](code-review-report.md)
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, [implementation-handoff.md](implementation-handoff.md); `bc4351cad7..4a4b2d7c32`
- Relevant solution revision IDs: SR-004…SR-010
- Relevant architecture-review revision IDs: ARCH-REV-001…ARCH-REV-005
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, routed to `/solution_designer`
- What changed in the review result and why: initial result. The implementation follows SR-010 closely. Reviewer re-ran the new owners' unit tests (423 passed). Three upstream items block:
  - CR-646-01: the C-5 no-fallback text is false when runtimes are usable outside the agent's history (UL-05 asserts it).
  - CR-646-02: Requirement Gap. With Model Routing off, an agent without another runtime in its history is never switched, against the problem statement and DEC-002.
  - CR-646-03: automatic switches record the launch origin `settings`, "the user's own Settings edit".
- Supported product scenario / material-premise basis changes: R-1's "no input interleaves" reclassified for the Agent root (the gate is a counting barrier). The outcome is safe.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-646-01 (Design Impact), CR-646-02 (Requirement Gap), CR-646-03 (Design Impact, low)
- Material score or classification changes: N/A
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - R-6 must land before release;
  - DEC-008 still "Needs user";
  - the not-quiet retry is unexercised;
  - two files at 498/499 lines.

### CRR-002 — Recheck of the SR-011 rework (IR-002)

- Canonical review report updated: [code-review-report.md](code-review-report.md)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` of `4a4b2d7c32..1bc523124e` (25 source files), with a re-audit of each file it touches and of round 1's code it calls
- Triggering role, report path, and finding or scenario IDs: `/implementation_engineer`, [implementation-handoff.md](implementation-handoff.md); CR-646-01…03; design-spec § R-17…R-19 (`230bcc534b`)
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why: all three findings are resolved as SR-011 decided. The reviewer re-ran the unit tests of the changed owners, run-history included (796 passed), and read the E2E evidence IMP-14 (UL-01…UL-09, 9/9).
- Supported product scenario / material-premise basis changes: S-02 now continues by the node fallback (UL-09); "nothing usable" is UL-05.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-646-01 | Open (Design Impact) | Resolved | SR-011 R-18; IR-002 | `noFallbackText` names every exhausted runtime ("until …" or "for about an hour"), then "No other runtime can run now. Choose one in the run's Settings to continue."; shown only when nothing is usable (R-17); UL-05 sets up nothing usable; no old text left (`git grep`) |
| CR-646-02 | Open (Requirement Gap) | Resolved | SR-011 R-17, REQ-004/REQ-007; IR-002 | `nodeFallbackPick` after `historyPick` (node's most-used usable launch, else the report's first usable runtime and model); delegation `fallbackLaunch(id, withNodeFallback = !inheritedCanRun)`; UL-09 |
| CR-646-03 | Open (Design Impact) | Resolved | SR-011 R-19; IR-002 | Both commit primitives take `launchSource` (default `settings` for a Save); automatic paths pass `automaticSwitchLaunchSource(cause)`; `node_fallback` added everywhere `agent_history` was (server, cause parser, decision source, contracts, web en and zh-CN); UL-01/ULP-01/UL-09 assert the stored source |

- New or remaining finding IDs: none
- Material score or classification changes: 9.2 → 9.4; every category ≥ 9.2
- Recommended recipient: `/api_e2e_engineer`; informational notice to `/implementation_engineer`
- Remaining risks or uncertainty:
  - R-6 holds the release (the founder);
  - DEC-008;
  - the not-quiet retry and the delegation's node fallback are unit-tested only;
  - router-chosen switches record `taskKind` "runtime switch" (noted);
  - two files at 498/499 lines.

### CRR-003 — Post-API/E2E test-code review (API-REV-001)

- Canonical review report updated: [api-e2e-test-review-report.md](api-e2e-test-review-report.md)
- Review entry point and round: post-API/E2E durable test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/api_e2e_engineer`, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md); UL-10, UL-11, UL-12, ULP-02; tests `b5e56fcc50`, evidence `1a7dd13a23`
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why: the four changed test files cover the items CRR-002 left open:
  - the not-quiet retry, through its real trigger: a person's next message running while the switch is pending;
  - the delegation's node fallback, with an inherited launch that can't run (UL-11) and with no inherited launch (ULP-02);
  - a Team member switched by the node fallback (UL-12).

  Assertions are requirement-level, and the two fixture options are recorded. No `src/` change.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None

- New or remaining finding IDs: none. Non-blocking notes:
  - UL-12 doesn't assert the member's tree `launchSource` (its evidence shows `node_fallback`);
  - UL-11/UL-12 and ULP-02 depend on earlier cases' state, which the files state.
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - live limits Not Tested;
  - R-6 and DEC-008 with the founder;
  - FU-646-04, FU-646-05.
