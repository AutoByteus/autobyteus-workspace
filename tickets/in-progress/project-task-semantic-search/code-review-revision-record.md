# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result. This record keeps the concise history of every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001 handoff) | N/A | Fail — Local Fix | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, targeted delta (IR-002 local fix) | Fail — Local Fix | Pass | CR-001, CR-002 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001, F-001) | Pass | Fail — Design Impact | FO-001 (from C-08) |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4, targeted delta (IR-003, SR-007 rework) | Fail — Design Impact | Pass | FO-001 (resolved) |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review, round 1 (API-REV-002 pass) | Pass (CRR-004) | Pass | none |
| CRR-006 | `code-review-report.md` | Implementation Review, round 5, targeted delta (IR-004, DR-001 latest-base merge) | Pass (CRR-004/CRR-005) | Pass | none |
| CRR-007 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review, round 2 (API-REV-003 pass) | Pass (CRR-005 test review; CRR-006 source) | Not Applicable | none |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `tickets/in-progress/project-task-semantic-search/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-004, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Local Fix` → implementation engineer
- What changed in the review result and why: initial baseline. The behavior basis is confirmed (BEH-001…BEH-005) and the structure matches SR-006. Two bounded defects were found:
  - CR-001: the preparing-phase poll keeps the board search unsettled, so the "Show Task in Projects" locator expires during first use or a model switch (REQ-004/AC-005, REQ-010);
  - CR-002: the dead export `isSettledReadiness`.
- Supported product scenario / material-premise basis changes: added SCN-CR-1 (Supported Explicit Edge: the existing locate action during the preparing state that REQ-009 supports). MP-001 and MP-002 are confirmed in the code. Rejected: C-05, C-06 (artificial timing) and C-07 (infrastructure failure). Held for API/E2E measurement: C-08 (calibration) and C-09 (`listTasks` cost).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002 (follow-up FU-CR-1 sent to the Task manager; non-blocking notes C-03, C-04)
- Material score or classification changes: initial scorecard 9.2/10. Below 9.0: API/E2E Readiness 8.5, Runtime Correctness 8.5, Cleanup 8.8.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: RSK-004 calibration on realistic backlogs, RSK-008, RSK-002, RSK-005/RSK-009, Windows/Docker packaging smoke.

### CRR-002 — Targeted delta review of the IR-002 local fix

- Canonical review report updated: `tickets/in-progress/project-task-semantic-search/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `b27dd7b284..722b9b3918` has 4 files, all within the prior findings' files and behavior; no spine, shared interface or data shape changed.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002); CR-001, CR-002, C-03
- Relevant solution revision IDs: SR-004, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail`, `Local Fix` (CRR-001)
- Current authoritative result: `Pass`, sent to API/E2E
- What changed in the review result and why: both findings are fixed and verified in the code and by rerun tests. The score rose from 9.2 to 9.4; every category is ≥ 9.0.
- Supported product scenario / material-premise basis changes: none. SCN-CR-1 is now satisfied.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `722b9b3918` | `useProjectTaskSearch.ts`: `schedule(delay, refresh)` and `run(refresh)` no longer set `pending` for a readiness poll. A new query, Project or Task list, the first request, Retry and reload still set it. Superseded refreshes are still dropped by `seq`/`latest`. New spec "locates while meaning search is preparing…" in `ProjectsPanelTaskLocate.spec.ts`. Reviewer rerun: web `components/projects/panel` 12/12 |
| CR-002 | Open (Local Fix) | Resolved | IR-002, `722b9b3918` | `isSettledReadiness` removed from `embedding-readiness.ts`; server typecheck clean; `tests/unit/embeddings` 27/27 |
| C-03 (note) | Optional | Applied | IR-002 | The worker uses `import type { EmbeddingModelOutput }`, which is erased; the runtime imports are unchanged |

- New or remaining finding IDs: none. C-04 is tracked as follow-up Task `autobyteus-147`.
- Material score or classification changes: API/E2E Readiness 8.5 → 9.3; Runtime Correctness 8.5 → 9.3; Cleanup 8.8 → 9.3; Shared-Structure 9.2 → 9.4.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`.
- Remaining risks or uncertainty: C-08 (calibration on a realistic backlog), C-09 (`listTasks` cost), RSK-002, RSK-005/RSK-009, Windows and Docker packaging smoke runs.

### CRR-003 — Failure-origin review of API-REV-001 (F-001, API-L04)

- Canonical review report updated: `code-review-report.md` (§ API/E2E Failure-Origin Review, meta, classification, latest result)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-L04, F-001; AC-004, AC-001)
- Relevant solution revision IDs: SR-004, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002 (source `722b9b3918`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, `Design Impact` → Solution Designer
- What changed in the review result and why:
  - The failing scenario represents approved behavior (SCN-001; REQ-003/AC-004/AC-001 at the QR-001/QR-003 1,000-Task scale) and ran through normal production execution.
  - The code implements the reviewed rule exactly. The probe uses the production `selectRelevant`, catalog and runner, and matches the in-app results.
  - The origin is the design's calibration basis (G2: fixture-based absolute floor), which does not transfer to 1,000 Tasks for LEAF-IR, where on-topic and unrelated best scores overlap.
  - Not an implementation defect, not a test, fixture or environment issue, and not an earlier source-review gap (held as C-08 for this measurement).
- Supported product scenario / material-premise basis changes: C-08 moved from Hold for Evidence to Promote as FO-001. API/E2E O-1 is rejected as cosmetic. The two R04 cadence failures were not reviewed (pre-existing; recorded out of scope by API/E2E).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved; confirmed at runtime | API-REV-001 | Packaged app: locate while preparing took 131 ms (execution report) |
| CR-002 | Resolved (CRR-002) | Resolved | — | — |
| C-08 | Hold for Evidence | Promoted → FO-001 (`Design Impact`) | API-REV-001 | `evidence/quality/API-L04-*` |

- New or remaining finding IDs: FO-001
- Material score or classification changes: no new scorecard; classification `Design Impact`
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - requirement question on the AC-001/AC-004 backlog scale;
  - a possible DEC-002 user decision;
  - untested Windows/Linux/macOS x64 packaging and Docker amd64.

### CRR-004 — Targeted delta review of the IR-003 SR-007 rework

- Canonical review report updated: `code-review-report.md` (§ Implementation Review Round 4, meta, classification, latest result)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review`. The delta `68441864d1..9f0df7eab3` covers catalog data, the O-1 readiness refinement, tests and docs inside the embedding layer; no spine, public boundary or shared shape changed.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-003); FO-001, O-1
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail`, `Design Impact` (CRR-003)
- Current authoritative result: `Pass`, sent to API/E2E
- What changed in the review result and why:
  - The user-approved SR-007 remedy is implemented as catalog data: Granite is the default and listed first, and LEAF-IR's floor is 0.30 with a large-Project warning.
  - The gated scale check makes DEC-011 reproducible, and its evidence matches the FO-001 numbers. The recorded checks were not rerun, since their code has not changed since.
  - The O-1 readiness refinement is correct and unit-tested.
- Supported product scenario / material-premise basis changes:
  - C-12 (Granite 92.1% at 1,000 real-text Tasks) and C-13 (re-based QR-003/QR-004) are held for API/E2E.
  - C-10 (the repository backlog drifts as tickets close) and C-11 (API-D01 one-line change) are recorded as notes.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| FO-001 | Open (`Design Impact`) | Resolved | SR-007, ARCH-REV-003, IR-003, `9f0df7eab3` | `embedding-model-catalog.ts` default = Granite; `IMP-03-quality-granite-scale.log`: fixture 0.968/0.958, generated 0.937/0.958, repository 0.921/0.958 |
| O-1 (API/E2E observation) | Rejected as cosmetic (optional) | Applied | IR-003 | `prepareModel` starts as `loading` when `hasAllFiles`; `embedding-index.test.ts` "reports downloading only when…"; `embedding-model-files.test.ts` |

- New or remaining finding IDs: none
- Material score or classification changes: none (9.4/10)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - C-12 / R-9: Granite has a small margin on the real-text backlog;
  - C-13: Granite's indexing time and memory;
  - RSK-002/005/008;
  - Windows, Linux and macOS x64 packaging and Docker amd64.

### CRR-005 — Proportional test-code review after API-REV-002

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002, Pass); durable test API-D01
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-004, implementation review)
- Current authoritative result: `Pass` (test review), sent to delivery
- What changed in the review result and why: reviewed the one durable test API/E2E added, `project-task-search-model-unavailable.e2e.test.ts`, including IR-003's one-line change. It is clear, isolated, enters through real GraphQL/MCP with only the network failure simulated, and proves AC-011/AC-012/REQ-010 behavior. Round 2 changed no durable test.
- Supported product scenario / material-premise basis changes: none (SCN-006, SCN-003, AC-012 confirmed)

#### Prior Finding Resolution

None (no prior test-review findings; C-11 from CRR-004 is closed by this review).

- New or remaining finding IDs: none. One non-blocking note: the trivially true `.part` assertion.
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - C-12 (thin AC-001 margin on the real-text backlog);
  - C-10 (the real-text backlog drifts);
  - untested platforms (Windows, Linux and macOS x64; Docker amd64);
  - RSK-002;
  - O-2, O-3/FU-5.

### CRR-006 — Targeted review of the DR-001 latest-base merge resolutions (IR-004)

- Canonical review report updated: `code-review-report.md` (§ Implementation Review Round 5, meta, classification, latest result)
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` of merge `600d079b9c` (`origin/personal` @ `2b04a9971d`). Outside the five declared resolution files, the ticket's patch against the new base is identical to its patch against the old base.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-004); delivery DR-001 (`delivery-revision-record.md`, `release-deployment-report.md`)
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-004; test review CRR-005)
- Current authoritative result: `Pass`, sent to API/E2E for the merged-state rerun
- What changed in the review result and why:
  - The tool contract, manifest and native registry are correctly rebased onto the base's six tools plus `search_project_tasks`.
  - The delete hooks coexist with the base's adoption reverts. The search cleanup stays synchronous and never throws, and the base's revert keeps its own awaited best-effort handling.
  - The base test was extended, not weakened.
  - The implementer's recorded checks IMP-08…IMP-12 cover the merged code, so they were not rerun.
- Supported product scenario / material-premise basis changes: none. C-14 (an intermittent failure in base compaction code) is noted; C-04 is carried as a note.

#### Prior Finding Resolution

None open. CR-001, CR-002 and FO-001 remain resolved; the merge touched none of their code.

- New or remaining finding IDs: none
- Material score or classification changes: none (9.4/10)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: unchanged from CRR-005, plus C-14 (base flake, not this ticket's).

### CRR-007 — Proportional test-code review after API-REV-003 (merged state)

- Canonical review report updated: `api-e2e-test-review-report.md` (round 2)
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-003, Pass, 95%)
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-005 test review); `Pass` (CRR-006 source review)
- Current authoritative result: `Not Applicable`, sent to delivery
- What changed in the review result and why: API/E2E round 3 changed no durable test (`600d079b9c..HEAD` outside `tickets/` is empty), and API-D01 is unchanged since its round-1 `Pass`. The merge's base-test change was reviewed in CRR-006.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: C-12, C-10, untested platforms, RSK-002, O-2, FU-5
