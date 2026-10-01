# API/E2E Revision Record — project-testing-guideline

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` are authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` CRR-001 Pass / API/E2E round 1 | SR-007; ARCH-REV-004; IR-001; CRR-001 | N/A | Pass / 95.0% |

## Revision Entries

### API-REV-001 — Initial baseline: agent-answered page dialogs, PAGE_BLOCKED, TESTING.md

- Triggering role, report path, and round: `code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/code-review-report.md`, CRR-001 round 1 (Pass)
- Triggering finding or scenario IDs: reviewer coverage focus 1–6; design escalation triggers (Electron dialog delivery, healthy connect > 8 s, recorder coexistence)
- Related revision IDs: SR-007, ARCH-REV-004, IR-001, CRR-001
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: added `browser-automation/tests/integration/test_mcp_transports_real.py::test_stdio_mcp_page_dialogs_follow_the_agent_decision_and_are_reported` (mcps)
- Scenarios added, changed, removed, or rechecked: R-01..R-04, E-01..E-09, D-01..D-04, L-99 (all new)
- Commands, environment, fixture, or broader-validation delta: baseline — isolated installed AutoByteus (control port 9336) driven by the branch CLI and MCP stdio; own headless Chrome; base worktree `6b39562` for comparisons; fresh agent run with imported keys; host overloaded by a foreign VM

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, execution report, ledger (all), evidence under `api-e2e-evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.0%
- New or remaining failure IDs: none (one host-overload test-harness timeout re-proven 3/3; not a regression)
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: OBS-A (`dialogs: null` doc wording), OBS-B (Electron has no `prompt()`), OBS-C/D pre-existing; `PAGE_BLOCKED` heuristic; connect-window residual; other-tab dialog inside Electron not exercisable
