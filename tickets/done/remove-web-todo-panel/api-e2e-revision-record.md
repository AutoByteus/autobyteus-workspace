# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative. This record keeps the concise round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` pass, `code-review-report.md`, CRR-001 round 1 | SR-005, SR-006, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial validation baseline: live Claude, team, AGY and rendered UI for Background Tasks

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/code-review-report.md`, round 1 (CRR-001, 9.4/10).
- Triggering finding or scenario IDs: code-review residual risks RR-001, RR-003 + CAND-001, RR-004 + CAND-007; Downstream Coverage Hints (AC-002, AC-007..011, AC-013).
- Related revision IDs: SR-005, SR-006, ARCH-REV-001, IR-001, CRR-001.
- Why this baseline was recorded: first completed API/E2E result for this package.
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-task.e2e.test.ts` (gated `RUN_CLAUDE_E2E=1`).
  - Added `autobyteus-server-ts/tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts` (gated `RUN_CLAUDE_E2E=1`).
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` (gated `RUN_AGY_BACKGROUND_E2E=1`).
  - Planned live subagent cases were withdrawn as unreachable in AutoByteus (OBS-002) and replaced by a foreground-Bash no-entry case.
- Scenarios added, changed, removed, or rechecked: R-01..R-08, P-01, L-CL-01/02/03/05/06, L-TM-01, L-AGY-01..05, UI-01..06 (UI-04 N/A; L-CL-04 withdrawn).
- Commands, environment, fixture, or broader-validation delta:
  - Baseline repository suites.
  - Temporary raw-frame probe with the SDK.
  - Live gated suites against PATH Claude 2.1.283 and SDK-bundled 2.1.280, AGY 1.2.13 and Codex 0.159.0.
  - `pnpm dev` stack with browser DOM assertions.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all sections), execution coverage report (all sections), test-case ledger (events 1–31).
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none.
- Recommended recipient: `/code_reviewer` for proportional test-code review of the three durable test files.
- Remaining risks, blocked evidence, or untested scope:
  - OBS-002: only background shell commands are reachable for Claude in AutoByteus. Two web docs overstate the listed Claude kinds (docs sync).
  - The > 64 KiB exit-message fail-safe is unit-only (AGY 1.2.13 truncates output).
  - Windows AGY paths are untested (RR-004).
  - The running-agents panel is not mounted in the app.
  - The branch still needs integration with `origin/personal` (delivery).
