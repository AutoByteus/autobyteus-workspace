# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer "Architecture Design Complete" (2026-10-19) | SR-002, SR-003 | N/A | Fail (Design Impact + Requirement Gap) | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / Solution Designer re-review request for SR-004 (2026-10-19) | SR-004 | Fail | Pass | AR-001…AR-004 (resolved) |
| ARCH-REV-003 | Round 3 / Solution Designer narrow re-review request for SR-005 (code review CRR-001, 2026-10-19) | SR-005 | Pass | Pass | None new |
| ARCH-REV-004 | Round 4 / Solution Designer narrow re-review request for SR-006 (FO-001, 2026-10-19) | SR-006 | Pass | Fail (Design Impact) | AR-005 |
| ARCH-REV-005 | Round 5 / Solution Designer re-review request for SR-007 (2026-10-19) | SR-007 | Fail | Pass | AR-005 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of the Embedding settings design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/design-review-report.md`
- Review round and trigger: round 1; `architecture-design-handoff.md` from `/software_engineering_team/solution_designer`
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-003); N/A
- Relevant solution revision IDs: SR-002 (requirements), SR-003 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What baseline was established:
  - Classification `Medium`/`High` confirmed.
  - Behavior basis confirmed against the code at `8d40ba3b6c`.
  - Passing: boundaries, persisted-data decision, removal plan and most spines.
  - Gaps: the active model's resting and recovery states (MP-001…MP-003) and the ownership of the combined status query.

#### Prior Finding Resolution

None

- New or remaining finding IDs:
  - AR-001 (Design Impact, Medium): status mapping for an `idle` active model; with its files present it must show Active · Ready.
  - AR-002 (Requirement Gap, Medium): no approved presentation for an active model that is not downloaded and not preparing.
  - AR-003 (Design Impact, Medium): Settings Retry must restart preparation (TR-019).
  - AR-004 (Design Impact, Low): `embeddingSettingsStatus` needs one resolver owner per subject.
- Material classification changes: none
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: R-1…R-7 (non-blocking); RSK-002, RSK-003, ASM-001.

### ARCH-REV-002 — Re-review of SR-004: AR-001…AR-004 resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's re-review request for SR-004 (`architecture-design-handoff.md`)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § "Architecture Review Resolution (ARCH-REV-001 → SR-004)"; AR-001…AR-004
- Relevant solution revision IDs: SR-004 (DEC-009 and DEC-010, approved by the Solution Designer within the direction with the user informed; design revision)
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The basis moves to SR-004.
  - All four findings were verified in the current design spec and requirements.
  - Recommendations R-1…R-7 were applied.
  - New non-blocking implementation notes: R-8 (align the `modelsStatus` interface row with `activeDisplay`) and R-9 (derive "running" from the flight owner too).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Design Impact, Medium) | Resolved | SR-004 | Terminology § "Active model display state" (`idle` with all files → Ready; Preparing only while a download or load runs); AC-013; G3 |
| AR-002 | Open (Requirement Gap, Medium) | Resolved | SR-004, DEC-009 | REQ-001/REQ-005 text, DEC-009 (options and reasoning; Solution Designer within the direction; user informed), AC-011; DS-003; interface `downloadModel(activeId)` → `prepareActiveModel()` |
| AR-003 | Open (Design Impact, Medium) | Resolved | SR-004 | DS-006 spine and narrative; mutation row (`retryModel()` then `prepareActiveModel()`); AC-012 |
| AR-004 | Open (Design Impact, Low) | Resolved | SR-004 | Interface row: `embeddingModelsStatus` (`embeddings.ts`) and `projectTaskIndexes` (`project-task-search.ts`), one document; Dependency Rules; file mapping |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: R-8, R-9; RSK-001…RSK-003; ASM-001.

### ARCH-REV-003 — Narrow re-review of SR-005 (code review CRR-001)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/design-review-report.md`
- Review round and trigger: round 3. The Solution Designer requested re-review of SR-005, which answers code review CRR-001: CR-001 `Local Fix` (dead code) and CR-002 `Requirement Gap` (the action error line).
- Triggering role, report path, and finding IDs: Solution Designer; `code-review-report.md` (CRR-001: CR-001, CR-002); `requirements-doc.md` REQ-010 / DEC-011 / AC-014; `design-spec.md` G7
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The basis moves to SR-005. DEC-011 was decided by the Solution Designer within the direction, with the user informed, like DEC-009.
  - G7's dead-code evidence was verified at `e48806b035`.
  - No structural change.
  - New implementation notes: R-10 (update `docs/modules/embeddings.md` L43, which references the removed `modelStatus()`) and R-11 (one shared alert line, as decided).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-004 | Resolved (ARCH-REV-002) | Resolved (unaffected) | SR-004, SR-005 | SR-005 changes only REQ-010 / DEC-011 / AC-014 and G7 |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: R-10, R-11; RSK-001 (QR-001 margin, code review C-07), RSK-002, RSK-003, ASM-001.

### ARCH-REV-004 — Narrow re-review of SR-006 (FO-001 status cache)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/design-review-report.md`
- Review round and trigger: round 4. The Solution Designer requested re-review of SR-006, which answers failure origin FO-001 (code review CRR-003; API/E2E API-L02: 1.8 s status on Docker at 20,039 Tasks).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § "Failure-Origin Resolution (FO-001 → SR-006)", G8; `requirements-doc.md` DEC-012, DEC-013; `code-review-report.md` (CRR-003, FO-001)
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Fail` (Design Impact)
- What changed in the review result:
  - Accepted: DEC-012 and DEC-013 (within the direction), FU-1 as a follow-up, O-1, O-2, O-4, and the cache's placement and invalidation through the existing post-commit marks (all Task writers verified to emit marks).
  - New AR-005: the invalidation rule is incomplete. Jobs persist after completion; `collectionJobStatus` has no current items; `search` doesn't invalidate. Three reachable divergences: MP-005 (Needs update → Ready, Index all skips the Project), MP-006 (stuck Indexing under the "pending job" reading), MP-007 (stale Needs update after a board search).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-004 | Resolved (ARCH-REV-002) | Resolved (unaffected) | SR-004…SR-006 | SR-006 changes only the status computation, DEC-012/013 and G8 |

- New or remaining finding IDs: AR-005 (Design Impact, Medium)
- Material classification changes: none (Medium / High)
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: R-12, R-13; R-10, R-11; RSK-002, RSK-003, ASM-001; FU-1.

### ARCH-REV-005 — Re-review of SR-007: AR-005 resolved; REQ-011 mapped

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/design-review-report.md`
- Review round and trigger: round 5. The Solution Designer requested re-review of SR-007, which answers AR-005 and adds the user-approved REQ-011 / DEC-014 / AC-015.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § "Revision SR-007"; AR-005
- Relevant solution revision IDs: SR-007
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - AR-005 is resolved: inputs-only cache (opaque `ItemFingerprints`), fresh status every poll, `collectionJobStatus` removed, and tests for MP-005…MP-007.
  - REQ-011 is mapped onto the existing change-mark listener: 3 s debounced `indexProject`, gated by `activeModelOnDisk()`, never waiting or throwing.
  - New MP-008 (a model change during the debounce) leads to R-14. Also new: R-15 (background run hygiene), R-16 (the Out Of Scope line and the L13 baseline in `requirements-doc.md` contradict REQ-011 / SR-007) and R-17 (background model load).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-005 | Open (Design Impact, Medium) | Resolved | SR-007 | "Revision SR-007": the rule, input cache, invalidation, fresh status from a job with pending work or a fingerprint comparison, interface changes (`fingerprintItems`, `collectionStatus(collection, fingerprints)`, `collectionJobStatus` removed); G8 tests for MP-005, MP-006 and MP-007 plus the warm poll |
| AR-001…AR-004 | Resolved (ARCH-REV-002) | Resolved (unaffected) | SR-004…SR-007 | — |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: R-14…R-17; R-12, R-13, R-10, R-11; RSK-002, RSK-003, ASM-001; FU-1.
