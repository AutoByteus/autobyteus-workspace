# Architecture Review Revision Record — token-meter-accuracy

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High) | SR-001, SR-002, SR-003 | N/A | Fail | ARCH-F-001, ARCH-F-002 |
| ARCH-REV-002 | Round 2 / SR-004 revision | SR-004 | Fail | Fail | ARCH-F-001 (resolved), ARCH-F-002 (resolved), ARCH-F-003 (new) |
| ARCH-REV-003 | Round 3 / SR-005 revision | SR-005 | Fail | Pass | ARCH-F-003 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial baseline: design sound overall; live freshness and per-call ordering need correction

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 1; Solution Designer `Architecture Design Complete` handoff (`solution-handoff.md`)
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md`; N/A
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- Baseline established: behavior basis confirmed against code and probes. The classification (Large / High) is justified. Persisted-data decisions pass. Two blocking design gaps were found: the web store's `usageReportCount` freshness guard drops non-call observations (ARCH-F-001), and the emission order between Claude per-call and result observations is not specified (ARCH-F-002).

#### Prior Finding Resolution

None

- New or remaining finding IDs: ARCH-F-001 (High), ARCH-F-002 (Medium)
- Material classification changes: N/A
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: RR-1 (per-call pricing vs the first-party provider guard, premise Unclear), RR-2 (AGY `step_index` across resume), RR-3 (Claude report-count meaning), RR-4 (per-call vs canonical model identity), RR-5 (ASM-001)

### ARCH-REV-002 — Round 1 findings resolved; strict shared contract schemas unmapped

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 2; Solution Designer SR-004 (D-9, D-10)
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md`, `solution-revision-record.md` SR-004; ARCH-F-001, ARCH-F-002
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed: D-9 and D-10 verified against code. While tracing the D-9 `revision` field to the store, I found that the run-summary and live-token-event wire schemas live in shared contract packages and are `.strict()`. The design maps neither package, which also affected the SR-003 threshold field; round 1 missed it.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Open (High) | Resolved | SR-004 D-9; design-spec DS-004, file mapping (store l.288/304/389, l.207), example, tests | `applyTokenUsageContribution` increments `revision` on every admitted save; no delete path in `token-usage/repositories/`; roll-up sum is monotonic |
| ARCH-F-002 | Open (Medium) | Resolved | SR-004 D-10; off-spine table; risks | `claude-session-process.ts` awaits `onFrame`; `AgentRunEventDispatchQueue.enqueue` per-run tail; `serializeRun`; P4 delayed-read test specified |

- New or remaining finding IDs: ARCH-F-003 (Medium, new)
- Material classification changes: MP-03 reclassified as unsupported on the SR-004 product position (RR-1 accepted)
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: RR-2 (AGY resume step index, validation item), RR-3 (docs), RR-4, RR-5

### ARCH-REV-003 — Shared contract schemas mapped; design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 3; Solution Designer SR-005
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md`, `solution-revision-record.md` SR-005; ARCH-F-003
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed: the contract schema files, their tests and the step-2 `dist` rebuild are mapped. Checked against the packages: strict schemas, `dist/index.js` exports, existing test files, and the collaboration adapter's parse site.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-003 | Open (Medium) | Resolved | SR-005; design-spec allocation, file mapping (contract rows, mapper row), sequence step 2 | Both contract packages export `./dist/index.js`; the test files exist; `collaboration-agent-presentation-adapter.ts:170` parses with `agentTokenUsageRunSummarySchema` (covered) |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: RR-1 (accepted position), RR-2 (AGY resume step index, validation item), RR-3 (docs note), RR-4 (identity tradeoff), RR-5 (ASM-001)
