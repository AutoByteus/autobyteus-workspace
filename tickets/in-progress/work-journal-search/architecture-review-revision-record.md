# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer "Architecture Design Complete" at SR-002 (2026-10-26) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / Solution Designer re-review request for SR-003 (2026-10-26) | SR-003 | Fail | Pass | AR-001…AR-003 (resolved) |
| ARCH-REV-003 | Round 3 / targeted re-review of SR-005 (F-001 / CRR-003, 2026-10-26) | SR-004, SR-005 | Pass | Pass | None new (R-5 resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of memory search over Work Journals

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/design-review-report.md`
- Review round and trigger: round 1. The SR-001 handoff was held at the user's request before any result. The complete SR-002 package arrived with the approved Memory page UI/UX spec.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-002); N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- What baseline was established:
  - Classification `Large`/`High` confirmed.
  - Behavior basis confirmed against the code at `ddd6fdcdf6`.
  - Passing: boundaries, dependency rules, run kinds and both entry forms, persisted-data decisions, the glossary.
  - Gaps: the meaning-index sync and `nearest` across restarts and live updates; the pointer of a meaning match; one localization removal.

#### Prior Finding Resolution

None

- New or remaining finding IDs:
  - AR-001 (Medium): meaning-index sync set, the DS-006 sequence, and `nearest` with no job or no model.
  - AR-002 (Medium): a meaning match's `lines`, `day` and `snippet`.
  - AR-003 (Low): `memory.generated.ts` keys of the removed tabs.
- Material classification changes: none
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: R-1…R-4; carried-forward RSKs.

### ARCH-REV-002 — Re-review of SR-003: AR-001…AR-003 resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's re-review request for SR-003 (requirements unchanged)
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § Meaning Step Rules, § Primary Execution Spines, § Tool Contract, § Removal Plan, § Review Corrections; AR-001…AR-003
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - DS-003, DS-006 and the post-restart DS-002 were redrawn in call order.
  - All three findings were verified in the current design spec.
  - New non-blocking notes: R-5 (an explicit "no job" result from `nearest`), R-6 (record the Work Journal empty-state copy as a requirements decision), R-7 (the pointer rule and newest-first ordering).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Design Impact, Medium) | Resolved | SR-003 | § Meaning Step Rules 1–5; DS-003 and DS-006 in call order; the `nearest` cases (no job, files missing, loading, ready); no load at server start; no download outside a user click |
| AR-002 | Open (Design Impact, Medium) | Resolved | SR-003 | § Tool Contract "Pointer of a meaning match" (text chunk → card part → first request); card parts with line ranges stored; the evaluation's step-2 check |
| AR-003 | Open (Design Impact, Low) | Resolved | SR-003 | § Removal Plan row and the web mapping: `memory.generated.ts` keys removed in en and zh-CN; parity tests kept |

- New or remaining finding IDs: none
- Material classification changes: none (Large / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: R-3, R-5…R-7; carried-forward RSKs.

### ARCH-REV-003 — Targeted re-review of SR-005 (meaning strength)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/design-review-report.md`
- Review round and trigger: round 3. The Solution Designer requested a targeted re-review of SR-005, from API/E2E F-001 → code review CRR-003 (`Design Impact`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` § Meaning Strength (SR-005); `evidence/api-e2e/F-001-02-meaning-scores.txt`; F-001 / CRR-003
- Relevant solution revision IDs: SR-004, SR-005
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The round-2 acceptance of the layer's three-value `relevance` as the meaning strength is superseded by production evidence. Strength is now the lift over the query's own rank-*k* baseline, owned by `MemorySearchService`.
  - `nearest` returns scores plus `collection: synced | notSynced`, which resolves R-5.
  - New notes: R-8 (two stale `relevance` references, L307 and L340), R-9 (calibration infeasible → Design Impact), R-10 (the baseline under partial coverage), R-11 (the asking run and the baseline order).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-003 | Resolved (ARCH-REV-002) | Resolved (unaffected) | SR-003…SR-005 | SR-005 changes only the meaning strength and the `nearest` result shape |
| R-5 (note) | Open (non-blocking) | Resolved | SR-005 | The `nearest` row (L374): `collection` `synced` / `notSynced` |

- New or remaining finding IDs: none
- Material classification changes: none (Large / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: R-3, R-6…R-11; RSKs.
