# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001, F-1 / MSP-102) | Pass | Fail — Design Impact | F-1 |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-002: D-D2, SR-005) | Fail — Design Impact | Pass | F-1 (resolved) |

## Revision Entries

### CRR-001 — Initial source review of IR-001: Pass

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: first result. D-A…D-J were confirmed in code against REQ-A…REQ-J. Implementer points:
  - The H run-folder fallback deviation is accepted. `resolveWorkspaceMetadataForTarget` is null without a target root; the fallback is the folder the absolute flow already reads.
  - N-2 declined → FU-003, accepted.
  - MSP-99's in-page frame drop is accepted.
  - MSP-44 follows DEC-009, accepted.
- Supported product scenario / material-premise basis changes: None; candidate gate CG-01…CG-07 recorded.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (initial)
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - C: Windows success proven by the release run only.
  - I and J: design risks.
  - FU-003, FU-005, FU-006.
  - Two architecture-review documents untracked in the worktree (CG-07).

### CRR-002 — Failure origin of MSP-102: no stored `interrupted`, Design Impact (and a round-1 review gap)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-1 / MSP-102; AC-D, REQ-D
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail. The origin is `Design Impact`.
- What changed in the review result and why:
  - The node stores an interrupted call distinctly. The sequencer writes `content`/`sourceEvent`; native stores its reason as the error.
  - The run projection's replay maps every stored error to `error`, so no read-back surface ever gets `interrupted`.
  - The design's D-D named only consumers of the status, not its producer for stored runs. The fix needs a design choice: one owner for the interruption rule, which the work journal already has as `interruptedFromError`, plus the stored signals for each runtime. Read-side is recommended, keeping `Not Affected`.
  - Round 1 took the type union as proof of reachability: a review gap, owned here.
  - SE-1's migration failures are pre-existing (FU-007).
- Supported product scenario / material-premise basis changes: BEH-D reclassified from Confirmed to Contradicted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| (none open in CRR-001) | — | — | — | BEH-D's round-1 "reachable" note corrected (review gap) |

- New or remaining finding IDs: F-1
- Material score or classification changes: Runtime Correctness corrected from 9.4 to 8.6; `Design Impact`
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: Codex's stored interrupted calls not traced; FU-003, FU-005, FU-006, FU-007

### CRR-003 — Round 3 of IR-002 (D-D2, SR-005): F-1 resolved, Pass

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit`. The conversation entry's shape changed and source files were removed; round-1 evidence is carried forward for the items IR-002 does not touch.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002), F-1
- Relevant solution revision IDs: SR-004, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Design Impact (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The shared rule `isInterruptedToolResult` is read by the replay (after the denial check, only with a result trace) and by the journal.
  - Conversation entries carry the replay's `toolStatus`. The replay is their only producer, and the dedupe keeps the whole winning entry.
  - The web shows the node's status; `inferToolStatus` is removed.
  - The team reconciliation conflict is gone.
  - The SR-005 removals leave no code reference.
  - The read-back test drives every runtime's real writer and fails on the old replay (IMP-11); MSP-102 passes (IMP-13).
  - FU-010 records the interruption text shown as a red Error, live and read back, which is outside AC-D.
- Supported product scenario / material-premise basis changes: BEH-D back to Confirmed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-1 | Open (Design Impact) | Resolved | SR-004, SR-005, ARCH-REV-003, IR-002 (`70f3d8d410`, `e78a539dfe`) | `tool-result-interruption.ts`; `raw-trace-to-historical-replay-events.ts:92-94`; `historical-replay-events-to-conversation.ts` `toolStatus`; web `runProjectionConversation.ts` `toolStatusOf`; IMP-11 (5 cases fail before and pass after), IMP-13 (MSP-102 Pass) |

- New or remaining finding IDs: None
- Material score or classification changes: Runtime Correctness 8.6 → 9.4; Cleanup 9.4 → 9.5; no classification
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: FU-003, FU-005…FU-007, FU-009, FU-010; docs naming the removed Codex files (docs sync)
