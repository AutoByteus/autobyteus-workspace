# Code Review Revision Record — restart-resume (autobyteus-285)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-API-001; O-1) | Pass | Fail: `Design Impact` → Solution Designer | F-API-001; CR-C2 and CR-C6 reclassified |

## Revision Entries

### CRR-001 — Initial source review of IR-001 (record busy runs at shutdown; resume them after an update restart)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001; code `ab4ba6e7dc`, `b4d770d364`, `b50e2354ab`)
- Relevant solution revision IDs: SR-002, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, 9.4/10, no findings
- What changed in the review result and why:
  - The initial baseline. D1 to D5 match SR-004.
  - Verified by reading:
    - the recorder runs before any interrupt, writes only with entries, merges and never deletes;
    - the record is deleted before any resume; the update test is per entry; eligibility is checked right before each post;
    - a waiting host holds no post slot;
    - the host is woken through its root manager and other runs through their roots;
    - the shared resolver leaves remote behavior unchanged (the receiver maps a throw and `null` alike);
    - resolving a standalone root does not activate its host.
  - The implementer's two points were accepted: the wave order (CR-C1) and member memory as a residual (CR-C2, FU-004).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None; FU-004 added (follow-up)
- Material score or classification changes: N/A (baseline); Large / High confirmed
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: design step 7 is validation-owned (AC-002 across two stamped builds on the real app and Docker; N-2; AC-003 to AC-005 live; the member reload view). D3.4's wave text should be aligned by the Solution Designer.

### CRR-002 — Failure-origin review of F-API-001 (the eligibility race) and O-1 (member notice unseen)

- Canonical review report updated: `code-review-report.md` (§ Round 2; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-API-001 (AC-003 / AR-002 / BEH-003), O-1 (API-05T); evidence API-04, API-04B, API-04C, API-05T
- Relevant solution revision IDs: SR-002, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`, `Design Impact`, owned by the Solution Designer
- What changed in the review result and why:
  - The eligibility check runs before a 0.3–0.5 s restore and post, and no owner refuses the post afterwards. So an archive done in that window is resumed (a paid turn on an archived run), and a user message whose activation is still in progress is preceded by the notice turn (REQ-003).
  - Two design premises are false: "live means received input" and "the check sits immediately before the post".
  - O-1 shows that a resumed member's notice is never seen in the realistic flow, so BEH-004 is unmet for members. CR-C2 is reclassified, and FU-004 should be absorbed.
  - Round 1 review gaps: CR-C6 (I rejected this exact race) and CR-C2 (I relied on live display).
- Supported product scenario / material-premise basis changes: the archive and message races are Supported Explicit Edge Scenarios (AR-002). A user Stop of an offline run is not a product action, so it is not a finding.

#### Prior Finding Resolution

None (CRR-001 had no findings). Candidates CR-C2 and CR-C6 from round 1 are reclassified; see the report.

- New or remaining finding IDs: F-API-001 (Design Impact); CR-C2 / O-1 (Design Impact)
- Material score or classification changes: category 8 goes from 9.3 to 8.6; Large / High unchanged
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: whether a post to an archived run's root is refused anywhere today (Read only); the choice among (i) a conditional post at the owner, (ii) narrowing the window, and (iii) accepting the residual with the user's approval.
