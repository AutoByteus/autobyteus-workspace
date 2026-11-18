# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | `Pass` | None (CF-11 non-blocking note) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001, API-09 = EC-06) | `Pass` (CRR-001) | `Fail`: `Design Impact` | CR-001 (new) |
| CRR-003 | `code-review-report.md` | Implementation Review round 2 (IR-002, SR-003) | `Fail` (CRR-002) | `Pass` | CR-001 resolved; CF-11 resolved; CF-14 non-blocking note |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review (API-REV-002 `Pass`) | `Pass` (CRR-003, source) | `Fail`: `Local Fix` (implementation) | TR-001 (new) |
| CRR-005 | `code-review-report.md` | Implementation Review round 3 (IR-003, TR-001 Local Fix) | `Fail` (CRR-004) | `Pass` | TR-001 resolved |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review round 2 (API-REV-003 `Pass`) | `Fail` (CRR-004, test review) | `Pass` | TR-001 resolved (verified in the rerun) |

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

### CRR-003 — Round 2: unreadable records and manifests are explicit outcomes

- Canonical review report updated: `code-review-report.md` (§ Latest Round CRR-003, scorecard row 8, size audit, Findings, Classification, Recipient, Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. The delta changes a shared data shape (`DiscoveredRun.attribution`, also read by memory search), a shared interface's result (`readJournalSpans`), and the spine owner (`buildEntries`). Structural results for untouched files are carried forward from CRR-001, because their code is unchanged.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001, API-09/EC-06, API-15, CF-11
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-005 (N-6, N-7)
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail`, `Design Impact` (CRR-002)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Discovery reports `attributed` / `unattributed` / `unreadable` for team trees (including the whole-scan `*` case), org trees and standalone metadata. It reads the diagnostics after the sources and logs `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` once per (root, record, reason) per instance.
  - The catalog switches exhaustively on the outcome.
  - An unreadable manifest is left out with `EPISODIC_CATALOG_RUN_LEFT_OUT`, once per run and reason. The manifest write is atomic, so there are no false positives.
  - Memory search's `MemoryRun` is pinned unchanged.
  - Docs, glossary and the CF-11 comment order are fixed.
- Supported product scenario / material-premise basis changes: none. EC-06 remains a Supported Explicit Edge Scenario (REQ-012/AC-009).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (`Design Impact`) | Resolved | SR-003, ARCH-REV-005, IR-002 | `run-folder-discovery.ts` `unreadableRoots`, `logUnreadable`, `agentRuns` (`readMetadataState`); `episodic-catalog.ts` `buildEntries` switch; tests `run-folder-discovery.test.ts:172-247`, `episodic-catalog.test.ts:237-271`; IMP-10 (924 passed); IMP-14 (6 warning lines on real data). EC-06 rerun pending at API/E2E |
| CF-11 (non-blocking note) | Open (note) | Resolved | IR-002 | `tests/helpers/no-delegations.ts` comment order fixed |

- New or remaining finding IDs: none open. CF-14 (record label for package-level diagnostics) is a non-blocking note.
- Material score or classification changes: Runtime Correctness 8.6 → 9.4; `Fail` → `Pass`
- Recommended recipient: API/E2E; informational notice to implementation
- Remaining risks or uncertainty:
  - CF-15: the AC-010 timing was measured at a load average of about 119. Rerun it on a quieter host if it is measured again.
  - TESTING.md's real-data rule versus a server start on a clone, as before.
  - FU-004 remains outside the ticket.

### CRR-004 — Proportional test-code review of the episodic catalog E2E test

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). `tests/e2e/memory/episodic-catalog.e2e.test.ts` was reviewed in full: it was added in round 1, EC-06 was updated in round 2, and it had never been test-reviewed.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-002 (`Pass`); EC-01…EC-07
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-003, source review)
- Current authoritative result: `Fail`, an implementation-owned `Local Fix` (TR-001)
- What changed in the review result and why:
  - The test code passes every proportional check.
  - EC-06 shows that discovery's row fallback for a standalone run's definition can never be reached: rows are offered only for admitted runs, and admission requires metadata that names the definition.
  - IR-002 made the fallback an explicit, documented and unit-tested behavior that real use never produces. The docs tell readers the opposite of the real outcome.
  - This is dead code and false claims in touched files (Principle 7). CRR-003 missed it.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None. This is the first test-review result. The source findings are tracked in CRR-001…CRR-003.

- New or remaining finding IDs: TR-001 (open)
- Material score or classification changes: N/A (a test review has no scorecard). In CRR-003, the reviewer should have caught the unreachable branch in `run-folder-discovery.ts:255` and in its unit case. The CRR-003 `Pass` for source stands otherwise.
- Recommended recipient: implementation engineer. The fix returns through a source review (targeted delta), API/E2E (discovery unit tests and EC-06), and this test review.
- Remaining risks or uncertainty:
  - Non-blocking: EC-06's title and the comment at line 649 are stale.
  - AC-010 timing on a quieter host (CF-15).
  - FU-003 and FU-004 stay outside the ticket.

### CRR-005 — Round 3: an agent run's definition comes from its metadata alone

- Canonical review report updated: `code-review-report.md` (§ Latest Round CRR-005, Classification, Recipient, Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. Three files, all within TR-001's scope: `run-folder-discovery.ts` `agentRuns`, its unit test, and `agent_episodic_catalog.md`. No shared shape, interface or spine change.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003); TR-001 (`api-e2e-test-review-report.md`)
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-004, test review, implementation `Local Fix`)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The unreachable row fallback, its comment, the synthetic `row_only` unit case and the false doc claim are removed.
  - The real shape is tested: a row only for the admitted run, which supplies its name.
  - `MemoryRun` is unchanged in practice.
  - The departure from SR-003 decision 1's wording is recorded with its reason (Core Principle 7).
- Supported product scenario / material-premise basis changes: none. CF-17 (a blank id in present metadata) was rejected as contrived.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-001 | Open (`Local Fix`, implementation) | Resolved | IR-003 | `git diff 63fa073eb8 1324c3e8f4`; IMP-16 (407 passed); IMP-17; IMP-18 |

- New or remaining finding IDs: none
- Material score or classification changes: none (CRR-003 scorecard carried)
- Recommended recipient: API/E2E (discovery unit tests and EC-06), then the proportional test review again; informational notice to implementation
- Remaining risks or uncertainty:
  - Non-blocking: EC-06's title and the comment at line 649 are stale.
  - AC-010 timing on a quieter host (CF-15).
  - FU-003 and FU-004 stay outside the ticket.

### CRR-006 — Test review round 2: episodic catalog E2E after the TR-001 fix

- Canonical review report updated: `api-e2e-test-review-report.md` (§ Latest Round, Latest Authoritative Result)
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review). The delta is EC-06's `it` title and its comment (`git diff 63fa073eb8 393cf79297`). No assertion changed.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-003 (`Pass`, 95%); EC-01…EC-07, API-17
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-004)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - TR-001 is fixed in source (CRR-005), and the E2E rerun on `1324c3e8f4` confirms the real outcome for damaged standalone metadata.
  - The stale EC-06 title and comment are corrected.
  - The rerun-by-impact plan is sound for a change of attribution alone.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-001 | Open (`Local Fix`, implementation) | Resolved | IR-003, CRR-005, API-REV-003 | `evidence/API-04-10-r3-excerpt.md` (A left out with `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE`, `run_metadata.json`); `evidence/API-04-10-episodic-catalog-e2e.log` (7/7, exit 0); `evidence/API-17-discovery-units.log` (34/34) |

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty:
  - AC-010 on real data is the founder's check (TESTING.md; delivery gates: his approval and a backup).
  - The cost of Task-title lookups on real data is not measured.
  - CF-14 (record label) and CF-15 (timing under load) are non-blocking.
  - FU-003 and FU-004 are follow-ups.
