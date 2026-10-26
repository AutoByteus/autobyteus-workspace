# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result. This record keeps the concise history of every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001 handoff) | N/A | Fail — Requirement Gap (+ Local Fix) | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, Full Re-Audit (IR-002, SR-004/SR-004b) | Fail — Requirement Gap (+ Local Fix) | Pass | CR-001, CR-002, CR-003 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001, F-001) | Pass | Fail — Design Impact | F-001 |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `tickets/in-progress/work-journal-search/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Requirement Gap` → Solution Designer, with a `Local Fix` for the same rework
- What changed in the review result and why: initial baseline. The behavior basis is confirmed and the structure matches SR-003. Three findings:
  - CR-001: live journal changes are dropped for the runs of a running full, rebuild or catch-up pass and during the whole first build (`onJournalChanged`'s `inPass` and `isBuilt` guards);
  - CR-002: every pass, including one-run live updates and `meaningSync`, reports the index as `building` with its own progress, so the page and the tool show false coverage notes;
  - CR-003: the Work Journal empty-state copy (ARCH-REV-002 R-6) is not recorded as a requirement decision, as the solution revision record planned.
- Supported product scenario / material-premise basis changes:
  - SCN-E (live turn during a pass) and SCN-F (search during a live pass) added.
  - MP-003 reclassified: rule 5 also drops agents' changes.
  - Rejected:
    - C-04: Teams list cost, **Measured** 247–537 ms on 101 task teams;
    - C-05: pre-existing `getRunDir`;
    - C-06: mask before cut, a note;
    - C-07: not reachable;
    - C-08: calibration;
    - C-09: decisions sound.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: initial scorecard 9.2/10. Below 9.2: API/E2E Readiness 8.7, Runtime Correctness 8.6.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - gate 2 latency under load;
  - AC-012/AC-013 real agents;
  - the Electron page;
  - AC-009 in the running app;
  - `listJournalFiles` cost on multi-MB runs.

### CRR-002 — Full re-audit of IR-002 (CR-001/CR-002 fixes; SR-004 UD-018/UD-019; SR-004b evaluation kinds)

- Canonical review report updated: `code-review-report.md` (§ Round 2, meta, classification, latest result)
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit` of `src/memory-search/**`. The delta changes status semantics and adds a requirement change (UD-019) with a store addition. The web is unchanged.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002); CR-001, CR-002, CR-003, C-06
- Relevant solution revision IDs: SR-004, SR-004b
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass`, sent to API/E2E
- What changed in the review result and why:
  - CR-001: only the Journals step's own notifications are dropped.
  - CR-002: only shown passes report building; quiet passes keep the settled status; no `meaningSync` in `modelChanged`.
  - CR-003: resolved by UD-018.
  - UD-019: IDF-weighted strength is correct and owned by the search service.
  - C-06: applied.
  - The recorded IMP-16/IMP-17 cover the code: gates pass, off-topic 3/3, no false only-weak note.
- Supported product scenario / material-premise basis changes: none new; MP-003 honored.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002 `0ca22eaa1c` | `ownJournalCalls`; queue during passes and the first build; tests fail on the previous code |
| CR-002 | Open (Local Fix) | Resolved | IR-002 `0ca22eaa1c` | `SHOWN` kinds, `passSteps`, `canSyncMeaning`, `buildEmbedding`; tests |
| CR-003 | Open (Requirement Gap) | Resolved | SR-004 UD-018 | Requirements doc records the copy as built |
| C-06 (note) | Optional | Applied | IR-002 `8529960b80` | Mask, then cut; test |

- New or remaining finding IDs: none
- Material score or classification changes: API/E2E Readiness 8.7 → 9.3; Runtime Correctness 8.6 → 9.3; Shared-Structure 9.3 → 9.4; overall 9.4/10
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational notice to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - gate-2 latency on an idle machine;
  - AC-012/AC-013 with real agents;
  - AC-009 in the running app;
  - the Electron page;
  - `listJournalFiles` cost on multi-MB runs.

### CRR-003 — Failure-origin review of API-REV-001 F-001 (AC-007 off-topic cues get Meaning/Strong)

- Canonical review report updated: `code-review-report.md` (§ API/E2E Failure-Origin Review, meta, classification, latest result)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (F-001; AC-007, R-009)
- Relevant solution revision IDs: SR-003, SR-004b
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002 (`41501c5a41`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Fail`, `Design Impact` → Solution Designer
- What changed in the review result and why:
  - The scenario is approved: absent-work cues with key words verified absent, through the real page search and real agents.
  - The cause: the meaning strength maps `nearest`'s relevance, which uses the catalog's Project-Task calibration (floor plus near-best margin), onto journal cards without card calibration. Off-topic cues score at the floor, so near-best membership makes dozens of Strong matches. The same happens with LEAF-IR.
  - The code matches the design (§ Tool Contract; § Interface Boundary Mapping), so the origin is design.
  - The count is corrected to 8 of 10 gated cues (T2 is partial).
  - Not reasonably detectable in source review; round 1's C-08 raised off-topic strength in general, and UD-019 fixed only the text tier.
- Supported product scenario / material-premise basis changes: new failure scenario F-001 (absent-work cues), within AC-007 as refined.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved; confirmed at runtime | API-REV-001 | A turn during a Rebuild was found 1.6 s after the pass |
| CR-002 | Resolved (CRR-002) | Resolved; confirmed at runtime | API-REV-001 | 173 samples during a live pass were all READY, with 0 coverage notes |
| CR-003 | Resolved | Resolved; confirmed at runtime | API-REV-001 | UD-018 empty state shown before the build |

- New or remaining finding IDs: F-001 (`Design Impact`)
- Material score or classification changes: no new scorecard; classification `Design Impact`
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - O-1 (phrasing) and O-3 (self-references);
  - O-2 (store 610 MB against a 100–300 MB estimate);
  - AC-008 on the user's own memory needs the user's approval and a backup;
  - untested Windows, Linux and macOS x64 builds;
  - API-D01 awaits test review.
