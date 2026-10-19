# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer "Architecture Design Complete" (2026-10-19) | SR-002, SR-003 | N/A | Fail (Design Impact + Requirement Gap) | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / Solution Designer re-review request for SR-004 (2026-10-19) | SR-004 | Fail | Pass | AR-001…AR-004 (resolved) |

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
