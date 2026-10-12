# API/E2E Revision Record — `agent-package-auto-refresh`

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` / CRR-002 Pass (round 2) | SR-005, SR-007, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002 | N/A | Fail / 90% (APE-001) |
| API-REV-002 | Code Reviewer / `code-review-report.md` / CRR-004 Pass (round 4) | SR-008, DSN-004, ARCH-REV-003, IR-003, CRR-003 (CR-004), CRR-004 | Fail / 90% | Pass / 95% |
| API-REV-003 | Code Reviewer / `code-review-report.md` / CRR-007 Pass (round 6) | SR-009, DSN-005, ARCH-REV-004 (N-7), IR-004, CRR-006, CRR-007 | Pass / 95% | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: wire E2E, desktop SCN-012 journey with real models, nested-issue visibility gap

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md`, CRR-002 (round 2, Pass).
- Triggering finding or case IDs: N/A (initial validation); review residuals QR-006, SCN-012 desktop, AC-008/009/010/014.
- Related revision IDs: SR-005 (approval), SR-007 (design), ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002.
- Why this baseline was recorded: first API/E2E validation round.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts` (DCF-E2E-001…008) and a read-only `READ_AGENT_PROMPT` route in `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`. Commit `a28465175`.
  - Baseline fix (TESTING.md Rule 9) to `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`: the service's `githubClient` now uses the controlled upstream. Commit `6b3a10822`.
- Cases added, changed, removed, or rechecked: REPO-001…005, DCF-E2E-001…008, REG-001/002, MEAS-001, DESK-001…005.
- Commands, environment, fixture, or broader-validation delta:
  - Server and web baselines.
  - Gated scripted-AGY E2E (×3).
  - Isolated desktop instance `iso-53228-c43b` built from the worktree, using copies of the user's two real packages and real Codex (GPT-6.1-Sol) for the Project Task Manager and the Agent Package Creator.
  - macOS watch/idle probe.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections), `api-e2e-execution-coverage-report.md` (created), `api-e2e-test-case-ledger.md` (events 1–22), `api-e2e-evidence/**`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 90% (Requirement and AC proof 85%, User-surface 72%).
- New or remaining failure IDs: **APE-001**. A nested (team-local; by code also org-owned) definition that keeps its last good version after a broken edit shows no issue anywhere in the web UI, which falls short of REQ-009 under DSN-003. The backend (`catalogIssue`, `definitionDiagnostics` with `usingLastGood`) is correct.
- Recommended owner: Solution Designer (preliminary `Design Impact`), to be confirmed by code-review failure-origin review. It becomes a `Local Fix` for the implementation engineer if the surface is judged obvious.
- Remaining risks, blocked evidence, or untested scope:
  - GitHub Update was run against controlled HTTP only.
  - The second client was a GraphQL client, not a second window.
  - Linux evidence comes from the container probe only.
  - Pre-existing base failures were reported to their owners: `agent-team-definitions-graphql` ×5 (37d05c7f7) and `agent-package-private-skills` ×2 (028cca231, 54eaac53a).
  - Observations outside this ticket: `list_available_agents` lists a Team whose member is missing (same as base), and one stalled Codex turn.

### API-REV-002 — APE-001 resolved (SR-008 owning-card badges), E2E moved to `catalogIssues`, org-owned coverage

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-004 (round 4, Pass), after CR-004 → SR-008/DSN-004 → IR-003 (`bd4c63796`; branch at `214836c83`).
- Triggering finding or case IDs: APE-001 (round 1), i.e. CR-004. CRR-004 also noted the durable E2E was stale (DCF-E2E-002/006/007 queried the removed `catalogIssue` on Teams/Orgs).
- Related revision IDs: SR-008, ARCH-REV-003, IR-003, CRR-003, CRR-004.
- Why recorded: rework rerun after the failure.
- Coverage decisions or durable test paths changed: `autobyteus-server-ts/tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts` (commit `33d290187`):
  - Teams and Orgs are queried with `catalogIssues`; agents keep `catalogIssue`.
  - DCF-E2E-002 asserts the nested Team issue and its clearing.
  - New DCF-E2E-009 covers the org-owned agent, the org-owned Team and its local agent on the Org, in path order.
  - DCF-E2E-007: AC-016 is asserted on the first-written agent, and the Team must be listed within 5 s (AC-015).
- Cases added, changed, removed, or rechecked: rechecked first APE-001 (DESK-002 nested). Added DCF-E2E-009, DESK-006 (org-owned live) and DESK-007 (unusable nested member). Re-ran DCF-E2E-001…008, REPO-002…005, DESK-002 shared, DESK-001 live Team list.
- Commands, environment, fixture, or broader-validation delta: new isolated instance `iso-58692-7f20` built from `33d290187`; fresh copies of the user's packages (the Nested Classroom Test Org used for org-owned). The built-monitor detection-tail probe was added as evidence.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| APE-001 (DESK-002 nested: no web surface for a nested last-good issue) | `Design Impact` (preliminary), confirmed by CRR-003 as CR-004 | Resolved: SR-008/DSN-004 owning Team/Org card badge via `catalogIssues` (IR-003). Live: Team card (1) 1,344 ms → cleared 1,046 ms. Org card (2)/(3) in path order 983–1,302 ms → cleared 1,088 ms. API: DCF-E2E-002/009 | `api-e2e-evidence/round2/desktop/desktop-round2-receipt.json`, `r2-d01-*.png`, `r2-d02-*.png`, `round2/dcf-e2e-final-*.log` |

- Canonical artifacts and sections updated: coverage investigation (meta, round-2 coverage changes, round-2 scorecard, deferrals, reroute table, decision); execution coverage report (round-2 summary, scorecard, latest result, tables); ledger (R2-1…R2-9); `api-e2e-evidence/round2/**`.
- Prior result and confidence: Fail, 90%
- Current result and confidence: **Pass, 95%** (no category below 90%)
- New or remaining failure IDs: none
- Recommended owner: code reviewer, for proportional test-code review of `6b3a10822`, `a28465175`, `33d290187`
- Remaining risks, blocked evidence, or untested scope:
  - Linux evidence by probe only.
  - GitHub Update against controlled HTTP.
  - Rare slow folder detection under load (REQ-018 scope, QR-003 bound).
  - The real-model journey, reconnect, Settings row, second client and idle CPU were not rerun in round 2; IR-003 does not touch those paths.
  - Base failures reported to owners (unchanged).

### API-REV-003 — SR-009 renamed contracts: clean cut asserted, authoritative human-like desktop journey

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-007 (round 6, Pass). IR-004 `e89085f3e` at `8d89b8cdf`.
- Triggering finding or case IDs: none open. This is a contract change (SR-009/DSN-005) plus N-7.
- Related revision IDs: SR-009, ARCH-REV-004, IR-004, CRR-006, CRR-007.
- Why recorded: rerun of all evidence on the renamed contracts.
- Coverage decisions or durable test paths changed:
  - IR-004's renamed `agent-package-definitions-live-refresh.e2e.test.ts` was reviewed as a faithful rename (Still Valid).
  - Added DCF-E2E-010, clean cut (commit `705e699b1`).
  - The new unit `application-package-list-isolation.test.ts` (N-7) is Still Valid.
- Cases added, changed, removed, or rechecked:
  - DCF-E2E-001…010 ×3;
  - REPO-002…005, REG-001/002;
  - human-like desktop HUMAN-001…012 and N7-001 (instance `iso-53429-718d`).
  - A rehearsal on the pre-rename build (2026-10-12, `round3-rehearsal/`) is non-authoritative.
- Commands, environment, fixture, or broader-validation delta:
  - The worktree build was driven only by clicks and typing.
  - The real Codex agents were the APAR Package Breaker (test package) and the Project Task Manager → Agent Package Creator.
  - A phone-paired `/mobile` client ran in a separate test-owned Chrome.
  - N-7 used a modified Brief Studio importable package.
  - The run was recorded (`round3/desktop/round3-human-journey.mp4`).

#### Prior Failure Resolution

None (no failure open after API-REV-002).

- Canonical artifacts and sections updated: investigation (round-3 plan and scorecard); execution report (round-3 summary, latest result); ledger (R3-1…R3-4, plus the rehearsal entry); `api-e2e-evidence/round3/**`.
- Prior result and confidence: Pass, 95%
- Current result and confidence: **Pass, 96%** (no category below 90%)
- New or remaining failure IDs: none
- Recommended owner: code reviewer, for proportional test-code review (`705e699b1` plus IR-004's durable test changes)
- Remaining risks, blocked evidence, or untested scope:
  - Linux evidence by probe only.
  - GitHub Update against controlled HTTP only.
  - Rare slow folder detection under load (REQ-018 scope).
  - Base failures reported to owners: `agent-team-definitions-graphql` ×5, `agent-package-private-skills` ×2.
  - FU-001 (collaborator candidates not filtered by admission) is unchanged and out of scope.
