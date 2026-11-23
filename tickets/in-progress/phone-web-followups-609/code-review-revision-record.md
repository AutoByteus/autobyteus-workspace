# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001, F-1 / MSP-102) | Pass | Fail — Design Impact | F-1 |

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
