# Code Review Revision Record — node-vocabulary (autobyteus-290)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, IR-001 | N/A | Fail, Design Impact (and one Local Fix) | F-001, F-002 |
| CRR-002 | `code-review-report.md` | Implementation Review round 2 (Targeted Delta), IR-002 / SR-008 | Fail (CRR-001) | Pass | F-001, F-002 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review, API-REV-001 | Pass (CRR-002) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of the node vocabulary

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`, `c78ffb15a2..bfd8beda9e`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md`, SCN-V1 … V4
- Relevant solution revision IDs: SR-006, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, Design Impact (8.9/10)
- What changed in the review result and why: this is the initial baseline.
  - The migrations SM-1 … SM-10 and the `node_identity` / `memory_sync` hold-backs are correct.
  - All 10 handoff assumptions are accepted.
  - F-001: Memory Sync's new `sourceId` collides with three existing `sourceId`s (skills, update notifications, packages), and the glossary's "Source ID" is false against the code (Principle 15, Case 6). This is a design-level name choice.
  - F-002: `RemotePeerStartedRunViews` remains a word-list hit.
- Supported product scenario / material-premise basis changes: V-1 ("source ID names one thing") is contradicted.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-001 (Medium, Design Impact), F-002 (Low, Local Fix)
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - API/E2E from pre-change data;
  - AC-904 is the user's check.

### CRR-002 — Targeted delta review of F-001 and F-002

- Canonical review report updated: `code-review-report.md` (Round 2 section)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`, `1fee50708e..260df99337` (code `127fc4806e`). Only the Step 5b files and `remote-run-view-provider.ts`.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002), F-001, F-002
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass (9.4/10)
- What changed in the review result and why: Memory Sync's identity is now `memorySyncSourceId` across code, stored targets, wire, UI and the glossary, distinct from the other `sourceId`s, which are untouched. `PeerStartedRunViews` replaces `RemotePeerStartedRunViews`.
- Supported product scenario / material-premise basis changes: V-1 is resolved (one name, one meaning).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open (Medium, Design Impact) | Resolved | SR-008, IR-002, `127fc4806e` | My search finds no Memory Sync `sourceId` / `boundSourceId` / `source.json`; the other `sourceId` folders are unchanged; `GLOSSARY.md`; IMP-18 |
| F-002 | Open (Low, Local Fix) | Resolved | IR-002, `127fc4806e` | `git grep RemotePeer` is empty |

- New or remaining finding IDs: None. Two design-text slips (the SM-5 row typo, ARCH-REV-006's interim name) are noted for the Solution Designer.
- Material score or classification changes: 8.9 → 9.4
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - API/E2E from pre-change data;
  - AC-904 is the user's check;
  - N-912 is a manual reset for interim dev data only.

### CRR-003 — Proportional test-code review after API-REV-001

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: proportional API/E2E test-code review, round 1
- Review scope: `N/A` (test review). The new upgrade E2E and probe, RC-26's addition, and three baseline probe fixes.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, AC-903, AC-905, REQ-906, REQ-911, REQ-913
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why: the tests prove the upgrade (the same IDs and values, backups, peers both ways, Memory Sync continuing, an idempotent third start) and both hold-backs with exact answers. Released data is built from a real pairing and sync, and the real released-build upgrade (API-04) corroborates it. There are three non-blocking notes on broad error filters and one loose regex. RC-12 is judged to stay follow-up FU-007: it is not attributable to this change and fails no in-scope AC.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - FU-002 … FU-007;
  - AC-904 is the user's check.
