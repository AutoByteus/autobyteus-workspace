# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result. This record keeps the concise history of every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001 handoff) | N/A | Fail — Requirement Gap (+ Local Fix) | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2, Full Re-Audit (IR-002, SR-004/SR-004b) | Fail — Requirement Gap (+ Local Fix) | Pass | CR-001, CR-002, CR-003 (resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-001, F-001) | Pass | Fail — Design Impact | F-001 |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4, Full Re-Audit (IR-003/IR-004, SR-006 Match Facts) | Fail — Design Impact | Fail — Local Fix | F-001 (resolved by SR-006), CR-004, CR-005 |
| CRR-005 | `code-review-report.md` | Implementation Review, round 5, Targeted Delta Review (IR-005) | Fail — Local Fix | Pass | CR-004, CR-005 (resolved) |
| CRR-006 | `api-e2e-test-review-report.md` | Successful API/E2E Test-Code Review, round 1 (API-REV-002 Pass; API-D01) | Pass (implementation review) | Pass | None |
| CRR-007 | `code-review-report.md` | Implementation Review, round 6, Targeted Delta Review (IR-006 latest-base merge, delivery DR-001) | Pass | Pass | None |
| CRR-008 | `api-e2e-test-review-report.md` | Successful API/E2E Test-Code Review, round 2 (API-REV-003 Pass on the merge; API-D01) | Pass | Pass | None |

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

### CRR-004 — Full re-audit of SR-006 Match Facts (IR-003 superseded parts; IR-004)

- Canonical review report updated: `code-review-report.md` (meta; § Round 4; Findings CR-004, CR-005; follow-ups, classification, recipient, risks, latest result)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit` of the net source delta `41501c5a41..716563012f`, which is wider than the requested `9fa2e072ba..716563012f` because IR-003's source was never reviewed. Shared shapes changed: the domain, tool, GraphQL and web types, the store schema, the normalizer, the search sequence and the page. The pipeline is unchanged since round 2.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-004); F-001; the three requested points
- Relevant solution revision IDs: SR-005 (superseded), SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004 (R-12…R-15)
- Relevant implementation revision IDs: IR-003, IR-004
- Relevant API/E2E revision IDs: API-REV-001 (F-001)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail`, `Design Impact` (CRR-003)
- Current authoritative result: `Fail`, `Local Fix` → implementation
- What changed in the review result and why:
  - F-001 is resolved by design. No grade exists, and AC-007 is now a fact check that IMP-27 measures (0 mismatches over 47 questions; N02 is the deliberate R-15 case).
  - The removal is complete (grep); ownership is clean; the Text-step gate, R-13 and R-15 are tested; the census is independent of FTS.
  - Requested points:
    1. "No matches": keep (design-quote drift);
    2. the tool omits empty fields: fine;
    3. amber/gray: equivalent to the server's rule on the page.
  - CR-004 (**Measured**): `matchedWords` uses a literal substring while text candidates match by `unicode61` tokens. For `memory_search`, 15 of 19 shown text matches carry no words ("Memory search", "memory-search"), so they read as meaning matches and contradict the tool description (R-12, R-14).
  - CR-005 (**Reproduced**): `...` or `--` become search terms with no tokens and are named "Not found in your memory".
- Supported product scenario / material-premise basis changes: none new. Candidates: C-10 promoted (CR-004), C-11 promoted (CR-005), C-12 link markup in the index rejected (pre-existing; 0 of 80 visible effects for common words), C-13 and C-14 rejected.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open (Design Impact) | Resolved by SR-006 | UD-020, IR-004 `e7a15930c3` | No strength anywhere (grep); IMP-27: `wordsNotFound` mismatches [], 11 of 12 off-topic named (N02 = R-15) |
| CR-001, CR-002, CR-003 | Resolved | Resolved (pipeline unchanged) | — | — |

- New or remaining finding IDs: CR-004, CR-005 (`Local Fix`)
- Material score or classification changes: overall 9.3/10; API / Interface Clarity 9.0 and Runtime Correctness 8.8 are below 9.2; classification `Local Fix`
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - gate-2 latency under load;
  - R-13 window (accepted);
  - C-12 link markup in the index;
  - AC-012/AC-013, AC-009 in the app, and the Electron page;
  - API-D01 awaits test review.

### CRR-005 — Targeted delta review of the CR-004 / CR-005 fix (IR-005)

- Canonical review report updated: `code-review-report.md` (meta; § Round 5; finding headings; classification, recipient, risks, latest result)
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` of `716563012f..5b16e1fe4a` (code `3204aa2455`). It touches only the normalizer, one `toMatch` call site, the evaluation counter, docs and tests, which are the files and behavior of CR-004/CR-005.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-005); CR-004, CR-005
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail`, `Local Fix` (CRR-004)
- Current authoritative result: `Pass`, sent to API/E2E
- What changed in the review result and why: one token-based matching rule in the normalizer, used at all three call sites and applied to the lines as indexed; punctuation-only words are no longer search terms. Recorded IMP-29…IMP-31: 0 of 698 and 0 of 35 text matches without words; mismatches []; gates identical; mutations M4/M5 each fail 2 tests. Latency (p90 737 ms, max 1,339 ms, under load) is within AC-002.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 | Open (Local Fix) | Resolved | IR-005 `3204aa2455` | Token rule in `containsTerm`; `matchedWords` on indexed lines; IMP-31 `textMatches.withoutWords` 0; M4 fails 2 tests |
| CR-005 | Open (Local Fix) | Resolved | IR-005 `3204aa2455` | `queryTerms` letter-or-digit rule; tests; M5 fails 2 tests |

- New or remaining finding IDs: none
- Material score or classification changes:
  - API / Interface Clarity 9.0 → 9.4;
  - Shared-Structure 9.3 → 9.4;
  - API/E2E Readiness 9.2 → 9.4;
  - Runtime Correctness 8.8 → 9.3;
  - overall 9.4/10.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - gate-2 latency to re-measure;
  - C-12 (link-only tokens named as found words);
  - R-13 window (accepted);
  - AC-012/AC-013, AC-009 in the app, and the Electron page;
  - API-D01 awaits test review.

### CRR-006 — Proportional test-code review after API/E2E pass (API-D01)

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Review scope: `N/A` (test-code review): the one durable test added during API/E2E, in `memory-run-discovery.test.ts` (`06fdc1306a`)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass, 94%); API-D01, AC-006
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-005, implementation review)
- Current authoritative result: `Pass`, sent to delivery
- What changed in the review result and why:
  - The test asserts AC-006's observable rule through the real `findRuns()` trigger with Memory Sync's real layout.
  - Control 2 (walk the whole folder without skipping `imports`) makes it fail.
  - Control 1 shows the `imports` entry in `SKIPPED_FOLDERS` is redundant today (the walk starts at the family roots). That is harmless and not a finding.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (no prior test-review findings).

- New or remaining finding IDs: none
- Material score or classification changes: none (no scorecard for test-code review)
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-008 needs user approval and a backup;
  - idle-machine latency;
  - the Windows, Linux and macOS x64 builds;
  - O-1, O-3, O-6;
  - C-12;
  - R-13 and R-3 (accepted).

### CRR-007 — Targeted delta review of the latest-base merge (IR-006, delivery DR-001)

- Canonical review report updated: `code-review-report.md` (meta; § Round 6; classification, recipient, latest result)
- Review entry point and round: Implementation Review, round 6
- Review scope: `Targeted Delta Review` of `3204aa2455..3d209177ec`. The memory-search source, the journal service and the web memory code are unchanged by the merge. Reviewed: the tool serialization (three files), the auto-merged wiring, the regenerated web types, the conflict in `docs/modules/README.md`, and two test updates.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-006); delivery DR-001
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-005; test review CRR-006 Pass)
- Current authoritative result: `Pass`, sent to API/E2E
- What changed in the review result and why:
  - `search_memory` uses the platform's one tool result rule (`toToolResultJson` / `toAgentToolsMcpStructuredJsonResult` on the object), and the local `present` is removed. The pruning is the same, except that an empty `results` is now left out as well (platform rule).
  - Wiring deltas against the base are only this ticket's.
  - The regenerated types also catch up on the base's model-routing lag, which is correct.
  - Loader and architecture tests updated soundly.
  - IMP-32 is green, except FU-010 and FU-011, which fail identically on the base.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Material score or classification changes: none (9.4/10)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; informational to `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - FU-010 and FU-011 (base);
  - AC-008 needs user approval and a backup;
  - idle-machine latency;
  - the Windows, Linux and macOS x64 builds;
  - C-12;
  - R-13 and R-3 (accepted).

### CRR-008 — Proportional test-code review after API/E2E round 3 on the merged state (API-D01)

- Canonical review report updated: `api-e2e-test-review-report.md` (meta; round 2 delta; latest result)
- Review entry point and round: Successful API/E2E Test-Code Review, round 2
- Review scope: `N/A` (test-code review): API-D01. It is unchanged since CRR-006, and round 3 changed no durable test code.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-003 Pass, 94%); API-D01, AC-006
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-006; implementation review CRR-007 Pass)
- Current authoritative result: `Pass`, sent to delivery
- What changed in the review result and why: nothing in the test. The merged code it exercises is unchanged (`src/memory-search` diff empty), and IMP-32's full `test:unit` ran it green on the merge.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (no prior test-review findings).

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-008 needs user approval and a backup;
  - no idle reference machine (top 3 at 80.6%, the bar, under load and self-reference);
  - the Windows, Linux and macOS x64 builds;
  - O-1, O-3, O-6;
  - C-12;
  - FU-010 and FU-011 (base).
