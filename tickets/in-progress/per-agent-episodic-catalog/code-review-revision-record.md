# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | `Pass` | None (CF-11 non-blocking note) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001, API-09 = EC-06) | `Pass` (CRR-001) | `Fail`: `Design Impact` | CR-001 (new) |

## Revision Entries

### CRR-001 — Initial implementation review of the per-agent episodic catalog

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-001, SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-004
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`
- What changed in the review result and why: first result. Code at `0be36462ef` reviewed in full. The span-read fix is judged to be within the design's `readJournalSpans` contract (CF-01). The four recorded deviations hold (CF-02…CF-05). The candidate lifecycle and delete-path risks are not reachable (CF-06…CF-08).
- Supported product scenario / material-premise basis changes: SCN-005 recorded (older journal manifests on existing data, from IMP-07); MP-001 confirmed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none blocking; CF-11 is a non-blocking test-helper comment note
- Material score or classification changes: N/A (initial)
- Recommended recipient: API/E2E; informational notice to implementation
- Remaining risks or uncertainty: TESTING.md's real-data rule against AC-010's clone for a server start; Task-title lookup cost unmeasured on real data; header lines with no range in older journal files (see report § Residual Risks)

### CRR-002 — Failure-origin review of EC-06 (damaged team record left out without a warning)

- Canonical review report updated: `code-review-report.md` (§ Latest Round, CF-12, Runtime Correctness score, Findings, Classification, Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-001, API-09 = EC-06 (AC-009 / REQ-012)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-004
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`, classified `Design Impact`
- What changed in the review result and why:
  - EC-06 is valid, and it represents approved behavior (REQ-012, AC-009, DESIGN.md rule 7).
  - A damaged team or org tree is filtered out by the shared run-history admission index: the `isAdmitted` skip in `listAgents` keeps only an in-memory diagnostic. Discovery then treats the member as an unattributed folder, and the catalog skips it silently.
  - The design's containment model covered only journal and Task read failures and the discovery source guards. It had no explicit "records unreadable" outcome distinct from "unattributed" (DEC-007).
  - The CRR-001 review missed this, although the path was readable at CF-06.
- Supported product scenario / material-premise basis changes: EC-06 recorded as a Supported Explicit Edge Scenario under a governing contract. CF-12 promoted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CF-11 (non-blocking note) | Open (note) | Open (note) | IR-001 | `tests/helpers/no-delegations.ts` unchanged |

- New or remaining finding IDs: CR-001 (open)
- Material score or classification changes: Runtime Correctness 9.4 → 8.6; review `Pass` → `Fail` (`Design Impact`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - The fix can stay within the Change Scope (discovery or catalog reads the location services' package diagnostics). Choosing the admission index instead would make it a run-history prerequisite.
  - The same silent path applies to org trees, and to standalone metadata without a history row.
  - The docs wording on unreadable manifests (API-15) should be settled in the same revision.
  - Follow-up FU-004 added.
