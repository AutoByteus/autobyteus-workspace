# Architecture Review Revision Record — token-meter-accuracy

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High) | SR-001, SR-002, SR-003 | N/A | Fail | ARCH-F-001, ARCH-F-002 |
| ARCH-REV-002 | Round 2 / SR-004 revision | SR-004 | Fail | Fail | ARCH-F-001 (resolved), ARCH-F-002 (resolved), ARCH-F-003 (new) |
| ARCH-REV-003 | Round 3 / SR-005 revision | SR-005 | Fail | Pass | ARCH-F-003 (resolved) |
| ARCH-REV-004 | Round 4 / SR-008 (DR-002 native compaction conflict) | SR-006, SR-007, SR-008 | Pass | Pass | None |
| ARCH-REV-005 | Round 5 / SR-010 (D-11 withdrawn, D-12) | SR-009, SR-010 | Pass | Pass | None |
| ARCH-REV-006 | Round 6 / SR-011 (D-13 Compacted note, REQ-012/AC-012) | SR-011 | Pass | Pass | None |
| ARCH-REV-007 | Round 7 / SR-012 (D-13 clear rule corrected after CRR-006) | SR-012 | Pass | Fail | ARCH-F-004 (new) |
| ARCH-REV-008 | Round 8 / SR-013 (ARCH-F-004 wording) | SR-013 | Fail | Pass | ARCH-F-004 (resolved) |
| ARCH-REV-009 | Round 9 / SR-014 (D-13 boolean mark after CRR-007 CR-F-002) | SR-014 | Pass | Pass | None |

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

### ARCH-REV-004 — D-11 native compaction reading reset; design remains Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 4; Solution Designer SR-008 after delivery blocker DR-002 (re-integration merge 168900db7 conflicts with upstream compaction-prompt-cache-reuse cec24ca48)
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md` § SR-008 Changes, `release-deployment-report.md`; DR-002
- Relevant solution revision IDs: SR-006 (evidence), SR-007 (behavior-neutral, follow-up task), SR-008
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed: reviewed D-11, the BEH-005 clarification and AC-011 against the merged code. The summary port reports `autobyteus_compaction` with a null reading before compaction is applied. The current fold reading rule (D-4) would keep the stale reading. The explicit adapter-set `context_reading_reset` fact plus one fold rule is well owned, does not cross the strict contracts, does not affect persisted data, and comes with test adaptations.

#### Prior Finding Resolution

None (no open findings at ARCH-REV-003).

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: RR-1–RR-5 as before; RR-6 (BEH-005/AC-011 clarification under the user's delegation, being reported to the user; AC-011 user check outstanding)

### ARCH-REV-005 — D-11 withdrawn by the user; D-12 keeps the reading through native compaction

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 5; Solution Designer SR-010 (pause from SR-009 lifted; user intent 2026-10-12)
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md` § Status: RESUMED; N/A
- Relevant solution revision IDs: SR-009, SR-010
- Prior authoritative decision: `Pass` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed: D-11 is superseded. D-12 needs no new mechanism, because the D-4 null-reading rule keeps the previous reading. The revert scope is checked against `git show --stat 5b48c2b47` and `git grep`. The upstream compaction test must be adapted to "reading kept" rather than plainly reverted. RR-6 is narrowed to the after-final-answer detail.

#### Prior Finding Resolution

None (no open findings at ARCH-REV-004).

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: RR-1–RR-5 as before; RR-6 narrowed (after-final-answer detail under delegation; AC-011 user check outstanding)

### ARCH-REV-006 — D-13 frontend "Compacted" note; design remains Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 6; Solution Designer SR-011 (user-approved REQ-012 / AC-012)
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md` § SR-011 Changes; N/A
- Relevant solution revision IDs: SR-011
- Prior authoritative decision: `Pass` (ARCH-REV-005)
- Current authoritative decision: `Pass`
- What changed: verified the event order behind the clear-on-newer-revision rule:
  - native: `pending-compaction-executor.ts`, summary usage before `completed`;
  - Claude: `compact_boundary` before the next call;
  - all four stream kinds share `handleCompactionStatus`.

  Store ownership, runtime scope and the host-revision choice for the standalone roll-up are sound. Added RR-7 (rare early clear).

#### Prior Finding Resolution

None (no open findings at ARCH-REV-005).

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: RR-1–RR-6 as before; RR-7 (early clear on a reading-less Claude observation; non-blocking)

### ARCH-REV-007 — D-13 clear rule corrected; stale revision wording remains

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 7; Solution Designer SR-012 after code-review failure-origin review CRR-006 (`code-review-report.md` Round 5; API-REV-002 F-API-002-01, DESK-004d)
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md` § SR-012 Changes; F-API-002-01
- Relevant solution revision IDs: SR-012
- Prior authoritative decision: `Pass` (ARCH-REV-006)
- Current authoritative decision: `Fail` (`Design Impact`, consistency only)
- What changed:
  - The corrected rule (clear only when the exact-run model-call count advances) is verified for native, Claude auto-compaction and Claude manual `/compact`, and RR-7 is narrowed.
  - ARCH-REV-006 had treated the remainder-only path as rare; DESK-004d shows it is the supported manual `/compact` path. That was a reviewer miss.
  - New ARCH-F-004: stale revision-based wording in D-13's opening, the panel bullet, and the meter file and test rows.

#### Prior Finding Resolution

None open at ARCH-REV-006. (RR-7 revised, not a finding.)

- New or remaining finding IDs: ARCH-F-004 (Low, blocking)
- Material classification changes: the remainder-only Claude path is reclassified from rare (RR-7) to a Supported Normal Scenario (manual `/compact`)
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: RR-1–RR-6; RR-7 narrowed (Claude context-read timeout)

### ARCH-REV-008 — D-13 wording aligned; design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 8; Solution Designer SR-013
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md`, `solution-revision-record.md` SR-013; ARCH-F-004
- Relevant solution revision IDs: SR-013
- Prior authoritative decision: `Fail` (ARCH-REV-007)
- Current authoritative decision: `Pass`
- What changed: all four statements now match SR-012.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-004 | Open (Low) | Resolved | SR-013 | design-spec l.65, l.69, l.372 and l.373 state the exact-run `usageReportCount` mark, cleared only when it advances; grep finds no revision-based mark wording |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: RR-1–RR-6; RR-7 narrowed (Claude context-read timeout)

### ARCH-REV-009 — D-13 event-sourced boolean mark; design remains Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Review round and trigger: Round 9; Solution Designer SR-014 after code review CRR-007 CR-F-002 (`code-review-report.md`)
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md` § SR-014 Changes; CR-F-002
- Relevant solution revision IDs: SR-014
- Prior authoritative decision: `Pass` (ARCH-REV-008)
- Current authoritative decision: `Pass`
- What changed: verified the baseline-free boolean mark.
  - It clears only on live `reports_model_call: true` events for the same run.
  - Live entry-point completeness checked: standalone, collaboration, Org and team dispatch reach `applyTokenUsageUpdated`; the team stream also reaches `applyTeamTokenUsage`.
  - Event order checked on native and Claude (auto, manual `/compact`, resume).

  Reviewer note: rounds 6–8 did not consider the roll-up-only hydration of reopened standalone runs. CR-F-002 caught it.

#### Prior Finding Resolution

None open at ARCH-REV-008.

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: RR-1–RR-6; RR-7 (Claude context-read timeout clears the note)
