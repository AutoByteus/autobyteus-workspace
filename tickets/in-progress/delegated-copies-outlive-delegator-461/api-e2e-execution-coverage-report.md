# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-010`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 10, on CRR-038. Code under test `15c41ad242` (IR-027, IR-028). I rebuilt the server myself (`/tmp/api461/r10-build.log`, exit 0).
- Prior round reviewed: API-REV-009 (round 9, `Fail`: F-53).
- Order of work, following the reviewer's list:
  1. F-53;
  2. a late 20261020;
  3. a late team index v2;
  4. C27-02;
  5. the rendered connect answer;
  6. the waiting list.
- Waiting-list progress before the new product failure stopped the round's rewrites:
  - API-E01 in full (264 files);
  - E-007;
  - DS-15 restart resume (DRO-3);
  - API-B03 batch 1 (three probes updated and run, and SDV-05 added for C15-03).
- Deviations from the plan, and why:
  - **A product failure (F-54) was found in API-B03, so under the agreed rule these wait for the fix:**
    - API-B03 batch 2: `runtime-switch-members`, `delegated-launch-defaults` (DCP), `existing-run-model-config`, `delegated-copies-large-hub`, `owner-scoped-file-reads`, the phone MSP-44 … 46 and MSP-50 … 52. Each is already updated in the codebase for rule 2 and not yet run.
    - the remaining batch-1 failures that are not F-54 (listed below);
    - the SSR settings cases (stale under SR-064 / SR-075: they assert the removed server-composed delegated save and team followers);
    - API-P03, API-P04;
    - API-F01: this branch touches build inputs (the contract packages, `typecheck-baseline.json`), so the fresh-start build is required. It goes on the fixed code.
    - the live `agent-initiated-collaborators` (DeepSeek gate).
  - **Not tested under the safety rules:** the delegated background-task live suites (`claude-delegated-background-task`, `agy-delegated-background-task`). They need the Claude CLI login or the real Antigravity CLI login, which the rules forbid, and the test vault provides neither.
- My own setup errors, corrected and rerun:
  - SDV-05's first form sent from a page whose selection had fallen back to the Manager; it then needed the Projects tab;
  - the late-index suite's Manager tools;
  - a home folder under `/tmp` (resolves to `/private/tmp`) failed the terminal case in the full run.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 10 files carry `r10`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `15c41ad242` (server `dist/` rebuilt by this round) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server per test-owned data root, or the in-process Studio server; scripted AGY CLI | Clean env `env -i PATH HOME=<resolved temp> TMPDIR USER`. Fresh temp data roots, removed after. Never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | Probe-owned stack: built server, Nuxt dev, headless Chrome | Desktop viewport |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 / R02 | type gates | Server typecheck | `cd autobyteus-server-ts && pnpm -s typecheck` (no job running) | ENV-1 | Pass | `/tmp/api461/r10-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline …)`, `PASS` | After this round's edits |
| F-53 recheck | Contract §6 E9; SR-079 | Built server on released data | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-E01-r10-batches.txt` (R10-A) | 4 of 4 `✓` | The restart-retry case ends with no stored list |
| Late 20261020 | SR-079 (reader) | Built server, two starts | as above, `remove-skill-improvement-data-startup.e2e.test.ts` (SID-3 extended) | ENV-1 | Pass | `API-E01-r10-batches.txt` | SID-1/2/3 `✓` | While 20261020 is FAILED: the improver's copy keeps `taskAgent`, and the follow-up waits. Once it has run: converted (`delegatedFrom`), listed, opens |
| Late team index v2 | SR-079 (writer) | Built server, a real restart with v2 re-armed | as above, `late-team-history-index-v2-startup.e2e.test.ts` (new LTI-1) | ENV-1 | Pass | `API-E01-r10-batches.txt` (LTI-1 line) | LTI-1 `✓` | The follow-up restores the delegated team's row and its Settings save works. v2 drops the user-started team's row (base, FU-029: recorded `false`) |
| C27-02 | SR-079 (scans) | Built server on TAU's corpus | TAU-1 records the first start after the upgrade | ENV-1 | Recorded | `API-E01-r10-batches.txt` (C27-02 line) | 2746 ms (a fresh install's start 1831 ms) | 461 scanned 30; each of the nine follow-ups scanned 0 |
| Rendered connect answer | CR-461-069, CR-461-073 | The token-blocked root, kept from team-run-v1; new probe `blocked-team-root-reason-probe.mjs` | `TEAM_RUN_V1_KEEP_BLOCKED=<dir> … -t "keeps the server healthy"`, then `node autobyteus-web/tests/e2e/blocked-team-root-reason-probe.mjs --kept <dir> --output-dir <dir>` | ENV-2 | Unclear (O-10a) | `API-B02-r10-blocked-root-reason.json` | connect `ERROR` `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`, close 4004; `rowOffered: false` | The server's answer is base's ("… Settings → Migrations shows its status and log."). The web's run list does not offer the root, so the reason is not rendered |
| API-E01 in full | AC-001 … AC-013 | Every server E2E file (264) | part 1: every file outside `runtime/`; part 2: `runtime/`; `--no-file-parallelism` | ENV-1 | Pass (after the stale fixes) | `API-E01-r10-batches.txt` | part 1 `694 passed / 7 failed` → all pass after the fixes and the lone reruns; part 2 `169 passed`, 63 files skipped (live gates) | Stale: E-007 and ad-hoc delegation. Environment: terminal, file watcher, provider secrets (pass alone) |
| DS-15 restart resume | DS-15 (SR-070) | Built server on API-E03's released world | `delegated-runs-own-runs-startup.e2e.test.ts` (new DRO-3) | ENV-1 | Pass | `API-E01-r10-batches.txt` (DRO) | DRO-1/2/3 `✓` | A busy delegated team whose Task entry is closed is not resumed; with its entry open it is (DRO-1) |
| API-B03 batch 1 | AC-005, AC-012; rule 2 | Real browser, built server, Nuxt | `node tests/e2e/<probe>-probe.mjs --output-dir <dir>` | ENV-2 | **Fail** (F-54; others under triage) | `API-B03-r10-probes-batch1.txt`, `API-B03-r10-F54-*.png` | task-closure-tree 9/16, projects-left-navigation 6/11, project-manager-ux 16/25 | See Findings and the triage list |
| C15-03 rendered (SDV-05, new) | DS-15 | Real browser, two pages | `stopped-delegator-views-probe.mjs --cases SDV-05` | ENV-2 | Not Applicable (rendered layer); SDV-05 Pass | `API-B03-r10-SDV05-base-return.json`, `API-B03-r10-SDV05-*.png` | the view returns to the delegator; the closed run's row stays gone; the delegator's row keeps its status; the run is not restored | CRR-039: a closed run's line on its Task's card is not openable (base: `presentTaskRoot`, AR-002, REQ-009), and a selected child that leaves the listing returns the view to the run's own agent (base: `returnToHostWhenUnlisted`, `af690af334`, the same at `827f1e68dc` and `3d738de6e6`). The web has no view of a closed run to send from; C15-03 stays proven at the server (the DS-15 suite, DRO-3) |
| API-B03 batch 2, API-P03, API-P04, API-F01, live `agent-initiated-collaborators`, SSR cases | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

- **Round 9's F-53:** resolved.

| ID | Case | Expected (authority) | Observed (`15c41ad242`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-54 | `project-manager-ux` PMU-003, PMU-018 (`API-B03-r10-F54-PMU-003-team-opened-empty.png`, `API-B03-r10-F54-PMU-018-no-active-team-runs.png`) | Rule 2 and DS-11: a delegated run is opened by its own path from its Task's card, as at base for an agent worker. A delegated Team with an open Task is not a top-level row, so the open must not depend on one | Opening a delegated **Team** run from its Task's card does not show it. PMU-003: the coordinator's row is selected in the run list, but the center pane says "Select an agent or start a new one." PMU-018 (collapsed strip): the center opens a team profile saying "No Active Team Runs — This team profile has no running runs", while the card shows the Team Idle. Agent workers open (PMU-018's agent part, SDV-04). Likely the same: PLN-05 "member conversation open", PMU-019 (not yet confirmed) | `Local Fix` (web) |
| F-55 (closed: test construction, CRR-039) | SDV-05 | — | Base's rules: the closed line is not openable, and the open view returns to the delegator. SDV-05 rebuilt to check base's behavior: Pass | — |

Observations:
- **O-10a:** a root its admission refuses is not offered by the web's run list (`listWorkspaceRunHistory` lists no team for the token-blocked root, and the not-cataloged scenario's list fails closed by design). The connect's answer is base's code and text, but no rendered surface carries it. Base's listing of such roots is not established here.

**Batch-1 failures still in triage** (each probe is base's; the 461 rewrite is under way):
- `task-closure-tree`:
  - BR-001 read the removed agent tree file (fixed, not rerun);
  - BR-005, BR-015, BR-016 depend on others;
  - BR-011 … BR-014 time out after a real backend restart (Task A DONE again; the continued coordinator conversation). Likely F-54, or the restore order.
- `projects-left-navigation`:
  - PLN-04 times out on a model option in the composer's model list;
  - PLN-05 opens a delegated team's member (likely F-54);
  - PLN-06, PLN-07, PLN-09 depend on others;
  - PLN-08 waits for a task-team member row.
- `project-manager-ux`:
  - PMU-004 is stale against REQ-001: it expects the hosted team Offline after its host's Stop; under 461 the delegated team keeps running, and deleting the host is refused while it works;
  - PMU-007 depends on PMU-003;
  - PMU-009, PMU-021, PMU-023 (Temp task cards), PMU-019 and PMU-024 are not yet classified.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01 (round 9); API-E01 in full; idle-lifetime | Proven | — |
| AC-002 … AC-006 | Yes | API-E02 (round 8); API-E01 in full | Proven | — |
| AC-007 | Yes | Desktop SDV-01 … 04 and phone (round 9) | Proven for the delegator's views; opening a delegated Team from its Task's card fails (F-54) | — |
| AC-008 … AC-013 | mixed | API-E01 in full; ad-hoc delegation (REQ-007 refusal) | Proven | — |
| AC-014 | Yes | TAU, collaborators, team-run-v1, open-task-tree, SID-3, LTI-1, DRO | Proven | — |
| AC-015, AC-016 | — / Yes | API-E02; peer suite (round 9) | Proven | — |
| DS-15 | — | DS-15 suite (round 6); DRO-3 | Proven at the server; rendered check blocked (F-55) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 92% | Every server criterion proven; API-E01 in full | F-54 on AC-007's Task-card path | The fix |
| Changed-boundary execution directness | 92% | 92% | All 264 server E2E files, built servers, real browser | Batch 2 probes not run | The rerun |
| Cross-boundary integration realism and mock gap | 85% | 85% | Real model (round 9), scripted elsewhere | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Released layouts, kept blocked root, clean env | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 90% | Late predecessors, restart resume, refusals | — | — |
| User-surface, browser, and desktop-shell confidence | 78% | 78% | The stopped-delegator journeys (round 9) | F-54, F-55, O-10a; batch-1 triage | The fix and the probe rewrites |
| Durable regression coverage quality and relevance | 86% | 86% | E-007, ad-hoc delegation, SID-3, LTI-1, DRO-3, 10 probes updated | SSR cases, batch-2 runs | The rewrite |

- Overall post-repository confidence: 88%
- Overall final confidence: 88%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-007's Task-card path, F-54)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-54, F-55, O-10a; the probe triage; API-F01

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`
- The confidence gap it addresses, and the expected gain: the web's rule-2 paths from the Task card and the run list (in progress: F-54 found).
- Browser validation needed, and why or why not: yes. The Task card's open path is visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack (ENV-2).
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the batch-2 probes, the SSR cases and the phone cases MSP-44 … 46 and MSP-50 … 52 on this code.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome: TAU (nine follow-ups), SID-3 (the late reader), LTI-1 (the late team index), team-run-v1 (F-53), DRO-1/2/3, collaborators, open-task-tree.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none found this round.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Added:**
    - `app-data-migrations/late-team-history-index-v2-startup` (LTI-1);
    - `autobyteus-web/tests/e2e/blocked-team-root-reason-probe.mjs`;
    - SDV-05 in `stopped-delegator-views-probe.mjs`;
    - DRO-3 in `delegated-runs-own-runs-startup`.
  - **Updated:**
    - `remove-skill-improvement-data-startup` SID-3 (SR-079);
    - `task-agent-own-run-startup` (nine follow-ups, C27-02);
    - `team-run-v1-production-upgrade` (optional kept root for the probe);
    - `project-task-boundaries` (E-007 reads as a restart reads, run last);
    - `ad-hoc-task-delegation` (REQ-007 refusal asserted, then the copy's own Stop).
  - **Web probes updated for rule 2 (API-B03):**
    - `task-closure-tree` (member-message restore; no agent tree file);
    - `projects-left-navigation` (member-message restore; a delegated team's member through its own team);
    - `project-manager-ux` (`delegatingRun`);
    - `runtime-switch-members` and `delegated-launch-defaults` (the copy's own Stop);
    - `delegated-copies-large-hub`, `owner-scoped-file-reads`, `cross-scope-agent-mentions-live`, `mobile-code-wrap-cases`, `mobile-heading-links-cases` (own reads).
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every run's model | Scripted AGY CLI (and the LM Studio stand-in in its probe) | Deterministic tool calls (TESTING.md) | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built and in-process servers, data roots, probe stacks, homes | Yes | Each suite's `afterAll`, the probes' `finally` | Removed |
| The kept blocked root (`/tmp/api461/r10-kept`, synthesized data) | Yes | Kept for the next round's rendered recheck; the probe works on a private copy | Kept |
| `/tmp/api461/` logs and probe output | Yes | Kept; extracts committed (home paths shortened, secret scan clean) | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix` (web): F-54.
- O-10a rejected (CRR-039: the team history catalog lists only admitted packages, as at base). F-55 closed as test construction (CRR-039).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-007's Task-card path (F-54). Every server criterion is proven, and API-E01 in full passes.
- Preliminary classification and recommended owner:
  - Implementation Engineer: F-54;
  - each confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round:
  - First: recheck F-54 (PMU-003, PMU-018, PLN-05, PMU-019), F-55 / C15-03, O-10a.
  - Then: the batch-1 triage list; API-B03 batch 2; the SSR rewrite; API-P03, API-P04; API-F01 on the fixed code; the live `agent-initiated-collaborators`.
