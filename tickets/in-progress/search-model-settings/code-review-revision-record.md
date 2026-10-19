# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result. This record keeps the concise history of every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001 handoff) | N/A | Fail — Requirement Gap (+ Local Fix) | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, targeted delta (IR-002) | Fail — Requirement Gap (+ Local Fix) | Pass | CR-001, CR-002 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001, F-001) | Pass | Fail — Design Impact | FO-001 (from C-07) |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4, Full Re-Audit (IR-003, SR-007) | Fail — Design Impact | Fail — Local Fix | FO-001 (resolved), CR-003 (new) |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `tickets/in-progress/search-model-settings/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Requirement Gap` → Solution Designer, with a `Local Fix` for the same rework
- What changed in the review result and why: initial baseline. The behavior basis is confirmed (BEH-001…BEH-005) and the structure matches SR-004. Two findings:
  - CR-001: dead code in touched files (`EmbeddingIndex.modelStatus()` and its types; `EmbeddingModelDownloads.isRunning()`);
  - CR-002: the action-error alert line is a visible state the normative UI/UX spec does not define, so the Solution Designer decides it, as for DEC-009.
- Supported product scenario / material-premise basis changes:
  - SCN-CR-1 added: a failed or refused action request (Supported Explicit Edge).
  - Rejected: C-06 (abort-listener timing window; the no-partial-file guarantee holds) and C-08 (a delete during one status read).
  - Held: C-07 (QR-001 margin) for API/E2E.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: initial scorecard 9.1/10. Below 9.0: API/E2E Readiness 8.6, Cleanup 8.4.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: QR-001 margin on slower hardware; AC-008 Docker run; EmbeddingGemma 2 not exercised in the probe; proxies (`autobyteus-168`).

### CRR-002 — Targeted delta review of IR-002

- Canonical review report updated: `code-review-report.md` (§ Round 2, meta, follow-ups, classification, latest result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `e48806b035..d2bcb95d3a` touches 8 files within the prior findings.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (§ IR-002); CR-001, CR-002, C-06
- Relevant solution revision IDs: SR-005 (DEC-011, REQ-010, AC-014, G7)
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass`, sent to API/E2E
- What changed in the review result and why:
  - CR-001: the dead code is removed and the tests keep their meaning.
  - CR-002: resolved upstream as DEC-011; the unchanged code matches REQ-010, and AC-014 is covered by the web spec.
  - C-06: the early-cancel window is closed.
  - The recorded checks IMP-09…IMP-13 cover the changed code, so none was rerun.
  - The one unit-suite failure is a pre-existing flaky test in `agent-execution` that this change doesn't touch. It is recorded as follow-up FU-CR-1 and sent to the Project Task Manager.
- Supported product scenario / material-premise basis changes: SCN-CR-1 is now approved behavior (REQ-010).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `d2bcb95d3a` | Removals in `embedding-index.ts` and `embedding-model-downloads.ts`; grep finds no reference; tests assert through `modelsStatus()` / `progress()` |
| CR-002 | Open (Requirement Gap) | Resolved | SR-005 DEC-011, ARCH-REV-003, IR-002 | REQ-010 matches the unchanged code; the web spec asserts `role="alert"`, an unreachable node, and clearing by the next action (AC-014); `docs/settings.md` |
| C-06 (note) | Optional | Applied | IR-002 | `embedding-model-files.ts`: `if (signal?.aborted) cancel()` after `addEventListener` |

- New or remaining finding IDs: none. Follow-up FU-CR-1 (base flaky test).
- Material score or classification changes: Cleanup 8.4 → 9.4; API/E2E Readiness 8.6 → 9.3; Runtime Correctness 9.0 → 9.3; overall 9.4/10.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: C-07 (QR-001 margin), AC-008 Docker run, desktop run, EmbeddingGemma 2 not exercised in the probe, proxies (`autobyteus-168`).

### CRR-003 — Failure-origin review of API-REV-001 (F-001, API-L02, QR-001 on Docker)

- Canonical review report updated: `code-review-report.md` (§ API/E2E Failure-Origin Review, meta, classification, latest result)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-L02, F-001; QR-001, QR-004, AC-008)
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002 (`d2bcb95d3a`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, `Design Impact` → Solution Designer
- What changed in the review result and why:
  - The scenario is supported, and the test entered through the real status document on a valid test-owned Docker node.
  - The cost is the Project store's whole-backlog read, which the existing `projects` list pays equally (1,805 ms).
  - The code follows DS-001, so the origin is the design's status-read basis.
  - The remedy may live in this ticket (a status fingerprint cache) or be a prerequisite (Project store read cost). There is also a requirement question on the QR-001 scope on Docker.
  - The measurement ran under heavy host load (9.7 / 17.6 / 44.0), but even the minimums exceed 1.5 s. An unloaded re-measure is recommended before the decision.
- Supported product scenario / material-premise basis changes: C-07 moved from Hold to Promote as FO-001. API/E2E O-1 and O-3 rejected; O-2 and O-4 are notes for the rework.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved | — | — |
| CR-002 | Resolved (CRR-002) | Resolved; confirmed at runtime (AC-014 on Docker) | API-REV-001 | API/E2E report |
| C-07 | Hold for Evidence | Promoted → FO-001 | API-REV-001 | `evidence/api-e2e/API-L02-01…`, `API-L02-03…` |

- New or remaining finding IDs: FO-001
- Material score or classification changes: no new scorecard; classification `Design Impact`
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - the true margin on an unloaded node;
  - whether a Project store prerequisite is warranted;
  - the API-D01 test change, which awaits the next test review.

### CRR-004 — Full re-audit of IR-003 (SR-007: fingerprint-input status, index after Task writes)

- Canonical review report updated: `code-review-report.md` (§ Implementation Review Round 4, meta, classification, latest result)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit` (a new spine, a changed boundary interface and rewired change marks)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (§ IR-003); FO-001, REQ-011, O-1, O-2, O-4
- Relevant solution revision IDs: SR-006, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail`, `Design Impact` (CRR-003)
- Current authoritative result: `Fail`, `Local Fix` → implementation engineer
- What changed in the review result and why:
  - FO-001 is resolved as designed (the AR-005 inputs-not-results cache; QR-001 cold 773 ms, warm 25 ms).
  - REQ-011 is implemented with the gate, R-14 and R-15.
  - O-1, O-2 and O-4 are correct.
  - New CR-003: write-triggered `indexProject` → `sync` loads the model (and the collection's vectors) whenever the model is idle, even when no fingerprint changed. Status, dependency and execution-resource marks are normal during agent work, so after a restart they load 0.4–1.5 GB with nothing to embed, contrary to the design's "cost one `listTasks`".
- Supported product scenario / material-premise basis changes: C-09 promoted (CR-003); C-10 (R-12 over-invalidation, approved) and C-11 (publisher never throws) rejected.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| FO-001 | Open (`Design Impact`) | Resolved | SR-006/SR-007 (DEC-012), ARCH-REV-005, IR-003 | Input cache plus fresh `collectionStatus`; warm poll does no `listTasks` (unit test); IMP-14: cold 773 ms, warm median 25 ms |
| CR-001, CR-002 | Resolved | Resolved | — | Unchanged; CR-002's copy is refined by DEC-013 (O-4), verified in the web spec |

- New or remaining finding IDs: CR-003
- Material score or classification changes: full scorecard 9.2/10; Runtime Correctness 8.6, API/E2E Readiness 8.8
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: QR-001 on Docker (API/E2E re-measures with host load recorded, R-13); `project-task-service.ts` stays at 500 lines (autobyteus-147).
