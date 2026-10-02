# API/E2E Revision Record — agent-initiated-collaborators

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-005, ARCH-REV-003, IR-001, CRR-001 | N/A | Fail / 84% |
| API-REV-002 | Code Reviewer, CRR-004 (Pass), round 2 | SR-006, ARCH-REV-004, IR-002, CRR-004 | Fail / 84% | Fail / 93% (DI-01) |
| API-REV-003 | Code Reviewer, CRR-006 (Pass), round 3 | SR-007, ARCH-REV-005, IR-003, CRR-006 | Fail / 93% | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: live on three runtimes and three roots, desktop with the public package; catalog copies lack their handoff rules

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001, Pass), API/E2E round 1.
- Triggering IDs: the reviewer's focus list (AC-001 per runtime incl. AGY/ACP, AC-002/003, AC-004 incl. concurrency, AC-005/007, Org AC-007, AC-006/008/009/010/011, AC-012).
- Related revision IDs: SR-005, ARCH-REV-003, IR-001, CRR-001.
- Why recorded: first completed API/E2E result.
- Coverage decisions / durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (LE-A1, LE-A2, LE-T1, LE-O1; gated per runtime).
  - Updated `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (first-turn `delegate_task` to an unknown address; REQ-005 made the old "bring one in with @" step stale).
- Cases: RC-01–04, LE-A1, LE-A2, LE-T1, LE-O1, LE-P1, DK D0/DA/DT/DO/restart, probes.
- Environment: in-process live servers with temp data; isolated desktop instance `iso-59571-7ba1` (stopped); base worktree `/tmp/aic-base` (removed).

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, this record.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 84%
- New or remaining failure IDs: F-01 (High), F-02 (Medium)
- Recommended owner: implementation engineer (`Local Fix`, preliminary), routed through Code Reviewer failure-origin review.
- Remaining risks / untested scope: Grok (quota), AutoByteus/LM Studio (LM Studio unavailable), SC-004 live, BR-P1 browser probe, live forced concurrency, LE-T1 AC-006 steps and LE-A2 server-side restore (blocked behind F-01; desktop restart already proves restore from `source`).

### API-REV-002 — F-01 and F-02 resolved; all cases pass live; Org copy placement is a design issue (DI-01)

- Triggering role, report path, and round: Code Reviewer, CRR-004 (Pass), API/E2E round 2.
- Related revision IDs: SR-006, ARCH-REV-004, IR-002, CRR-004.
- Coverage changes: `agent-initiated-collaborators.e2e.test.ts` extended (own scope and instruction, mate-before-report, restored scope, catalog Agent copies get no scope, Team/Org configured/mounted/cross-placement handoffs incl. Stop → reopen, forced race, SC-004 LE-F1, Claude-only instruction checks). Predecessor test unchanged.
- Executed: Claude (all), Codex (A1, A2, T1, O1), AGY (A1, A2), predecessor suite and browser probe (incl. AGY L01/L02), desktop D0/DA/DT/Org/restart.

#### Prior Failure Resolution

| Prior | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-01 | Local Fix → Design Impact (CR-001, SR-006) | Resolved | `r2/le-claude*.log`, `r2/le-codex.log`, `r2/le-agy-a2.log` |
| F-02 | Local Fix (CR-002) | Resolved | `desktop/DT-02-team-copy-names.png` |

- Canonical artifacts updated: execution report (round 2 section), ledger (round 2), coverage investigation (round 2 note), this record.
- Prior result and confidence: Fail, 84%
- Current result and confidence: `Fail`, 93%
- New or remaining failure IDs: DI-01 (Design Impact, user-agreed)
- Recommended owner: Solution Designer via Code Reviewer failure-origin review.
- Remaining risks: Grok and AutoByteus/LM Studio blocked by environment; instruction checks only observable on Claude.

### API-REV-003 — DI-01 resolved (REQ-012 / AC-013); Pass on four runtime paths

- Triggering role, report path, and round: Code Reviewer, CRR-006 (Pass), API/E2E round 3.
- Related revision IDs: SR-007, ARCH-REV-005, IR-003, CRR-006.
- Coverage changes: `agent-initiated-collaborators.e2e.test.ts` — copy-path helpers, LE-A3 (standalone placement), placement assertions in LE-T1/LE-O1 incl. after reopen, sequential delegations in LE-A3, AutoByteus-over-DeepSeek case with test-vault credentials. Predecessor test unchanged.
- Temporary methods: `probes/old-placement-reopen.mjs` (round-2 server → round-3 server on one data root), `desktop/desktop-placement.mjs`.

#### Prior Failure Resolution

| Prior | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| DI-01 Org copy placement | Design Impact (user-agreed) → SR-007 REQ-012/AC-013 | Resolved | `r3/desktop-placement-stored-paths.txt`, `r3/le-*.log`, `probes/old-placement-reopen/report.json` |

- Canonical artifacts updated: execution report (round 3 section), ledger (round 3), coverage investigation (round 3 note), this record.
- Prior result and confidence: Fail, 93%
- Current result and confidence: `Pass`, 96%
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (proportional test-code review)
- Remaining risks: Grok/ACP live blocked by quota (shared MCP exposure verified on three runtimes); team-instruction checks observable only on Claude.
