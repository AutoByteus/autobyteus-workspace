# API/E2E Test Review Report — integration-credential-proxy (autobyteus-311, step 1)

## Review Meta

- Review Round: `1`
- Trigger: API/E2E pass, API-REV-001 (tests `e5afcd8004`, reports `ad305c452e`; code under validation `2529eaaec1`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001…012, AC-001…008, DEC-001…011)
- Investigation Notes Reviewed As Context: through the design only
- Solution Revision Record Reviewed As Context: SR-005
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-005 added by API/E2E)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95.6%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: root `TESTING.md`, as the coverage investigation records it. No conflicts. The suite follows its rules: signed-in CLIs with the real HOME, a throwaway `CODEX_HOME`, the test token sent once to a server with its own vault, and gated live runs.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-002, SCN-003, SCN-004; AC-002, AC-006, AC-007; DEC-011)

## Changed Durable Test Scope

`git diff --name-only 2529eaaec1..HEAD` outside `tickets/` lists exactly the three files below. The worktree is clean apart from untracked `dist/`.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | Added (421 lines) | AC-002, AC-006, AC-007, DEC-011; team members (DEC-002) | One surface: a run's own shell, per runtime, using GitHub through the proxy, then the access lifecycle | Gated per runtime; the header documents gates, prerequisites and the command |
| `autobyteus-server-ts/tests/fixtures/github-proxy-shell-probe.sh` | Added (executable) | AC-002, AC-007; REQ-012 example calls | What an integration script does: records env/ps, curls issue #1 at the variable, runs `git ls-remote` with the unchanged URL, writes `result.json` last | Calls GitHub only when the variable is set, so git can't fall back to the user's own credential helper |
| `autobyteus-server-ts/tests/fixtures/agy-shell-env-probe-cli.mjs` | Added (executable) | AC-002 (AGY, no model) | Scripted AGY CLI: runs the probe as a child with the AGY process's environment, then is `agy-failure-cli.mjs` | Identical to the existing fixture when its two variables are absent |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each cell is named `<runtime>: the agent's own shell reaches GitHub through the proxy; untick, re-tick, stop`; the AGY not-ticked and team cells are named for what they prove |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions cover: the contract variables (`expectVariables`: API address shape, insteadOf pair, `GIT_TERMINAL_PROMPT=0`); GitHub's real answers (issue #1, ls-remote HEAD); refusal codes; activity records; no approval request (`chatTurn` ends only on `TURN_COMPLETED`); and no token on the wire, in shell outputs, the data dir or a temp `CODEX_HOME` (booleans or paths only) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared `connect`, `createAgent`, `startRun`, `chatTurn`, `readProbe`, `expectVariables`, `lifecycle`, `tokenScan`. Existing helpers are reused: `startStudioE2eRuntimeServer`, `sendE2eSendMessageCommand`, `createFakeGrokCommand`, `readLiveTestSecret`. The activity-records assertion repeats three times; it is small enough to leave |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Own temp data dir and vault; env restored and runs, teams and the connection cleaned up in `afterAll`. Live cells are gated, and prompt the agent with one exact command. Deadlines are explicit. The team cell's first-message start reflects real product behavior (the fixed test defect) |
| Large files remain coherent and navigable | Pass | 421 lines, one surface, helpers first, then cells |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Skips are gate-driven only (`skipIf(!enabled)`, a whole-suite skip when no gate is on); the header states "a skip is not a pass" |
| Added coverage agrees with the coverage investigation and execution evidence | Pass | The cells match API-01…API-08 in the execution report, with summaries in `evidence/API-01-08-runtime-shells/` |
| Test callers and fixtures exercise an independently established supported scenario | Pass | SCN-002/003 (an allowed run's script uses the API and git), SCN-004 (an unticked agent or an ended pass), DEC-002 (team member), DEC-011 (Codex `workspace-write`) |
| Each test enters through its scenario's real trigger and follows the real actor's steps | Pass | Live cells go through the chat: `createAgentRun` → the agent's own shell tool → the probe. Ticks go through the card's GraphQL. Stop goes through `terminateAgentRun` / `terminateAgentTeamRun`. The two scripted cells (AGY, Grok) stand in for the CLI's shell tool by starting the probe as a child of the real CLI process with that process's environment, the same environment the shell tool inherits. They are stated as no-model cells, and every runtime also has a live cell |

## Findings

None.

Notes, not findings:
- In the Codex `workspace-write` cell, `ps` cannot run inside the sandbox (exit 126; `psStatus` is not asserted). The token scan still covers the probe's `env` and the cell's other outputs. A sandboxed agent can't list processes there either, so nothing goes unchecked.
- Test files are not typechecked repository-wide (FU-002, pre-existing). The suite ran green in every enabled cell.

## Follow-ups

- Follow-ups this review added: None. API/E2E added FU-005 (the `scoped-org-history-graphql` e2e expectation drifted after base commit `47f44c3df6`). I agree it is outside this ticket.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the three above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer` (`/software_engineering_team/delivery_engineer`)
- Notes: residual risks from API/E2E carry to delivery:
  - live push to GitHub (read-only token; push proven locally, IMP-03);
  - echo redaction proven only against a fake upstream;
  - R-5 (a restart ends the passes) not exercised;
  - FU-002.
