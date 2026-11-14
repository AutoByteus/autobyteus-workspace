# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-009`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 9, on CRR-035. Code under test `f92881dd13` (IR-025, IR-026). I rebuilt the server myself (`/tmp/api461/r9-build.log`) and the phone bundle (`/tmp/api461/r9-mobile-build.log`), both exit 0.
- Prior round reviewed: API-REV-008 (round 8, `Fail`: F-49 … F-52).
- Order of work, following the reviewer's list:
  1. F-50, F-52, team-run-v1 ×2, TAU-2;
  2. O-8b;
  3. the reruns from the waiting list: the phone, desktop, peer suite and API-L01.
- Deviations from the plan, and why:
  - **A new product failure (F-53), so under the agreed rule these wait for the fix:**
    - E-007 and the live `agent-initiated-collaborators` and delegated background-task suites;
    - API-P03, API-P04;
    - DS-15 restart resume, C15-03 rendered;
    - API-B03;
    - API-E01 in full, API-F01.
  - **The rendered check of the blocked roots' text is deferred:**
    - the not-cataloged root's scenario has an unreadable run-history index by design, so the web's run list fails closed and the user cannot reach that root;
    - the token-blocked root is reachable, but rendering it needs a new probe on that released-shape scenario's data.
    The server's answer is proven (below).
  - **O-8b is answered at the server** (parity with a user-started run). The rendered panel is the same own-view code path for both runs and is not separately probed.
- My own setup errors, corrected and rerun: USR-8's Manager lacked `update_task`, and its first form used DONE, which base refuses by eligibility before any reopen. TAU-2's save chose the copy's current model. BSV's setup also needed a fix.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 9 files carry `r9`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `f92881dd13` (server `dist/` rebuilt by this round) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server per test-owned data root, or the in-process Studio server; scripted AGY CLI (`agy-failure-cli.mjs`) | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. Never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | Probe-owned stack: built server, Nuxt dev, headless Chrome | Desktop viewport |
| ENV-3 | as ENV-1 (phone bundle rebuilt) | as ENV-1 | Probe nodes, production phone bundle at `/mobile`, headless Chrome 390×844 | Owned by the probe |
| ENV-4 | as ENV-1 | as ENV-1 | Two to five built-server nodes through capturing proxies | Owned by the suite |
| ENV-5 | as ENV-1 | as ENV-1 | Scripted delegator; delegated runs on the AutoByteus runtime over DeepSeek (`deepseek-v4-flash`) | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (read-only; key values never printed) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 / R02 | type gates | Server typecheck | `cd autobyteus-server-ts && pnpm -s typecheck` (no job running) | ENV-1 | Pass | `/tmp/api461/r9-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `PASS` | After every edit of this round |
| F-50 recheck | AC-006 (earlier ticket); CR-461-070, CR-461-072 | Built server: the team stream, the agent stream, the delegator's tool | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-E01-r9-F50-entry-points.json`, `API-E01-r9-batches.txt` (R9-C) | USR-4, USR-6, USR-7, USR-8 `✓` | USR-4: `TEAM_SEND_MESSAGE_REJECTED` / `TASK_EXECUTION_CONTEXT_UNAVAILABLE` with base's text. USR-6: the agent stream's ack, the Agent form. USR-7: the delegator's `send_message_to`. USR-8: the assigner's reactivating message (Task set back to IN_PROGRESS) is refused before the reopen; the row does not return. Nothing is delivered or restored; files unchanged |
| F-52 recheck | DESIGN.md rule 7; CR-461-071 | In-process server, then a built-server restart | as above, `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | ENV-1 | Pass | `API-E01-r9-F52-unreadable-own-file.json` | UC-1, UC-2 `✓` | Running server: the bad run's delegator opens without its row, a warning names the run |
| team-run-v1 ×2 | Released-shape upgrade acceptance; CR-461-069, CR-461-073 | Built server on released data | as above, `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | ENV-1 | Pass (both connects); **Fail** (F-53) in the retry case | `API-E01-r9-batches.txt`, `API-E01-r9-F53-team-run-retry-tree.txt` | `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED` with "TeamRun '…' is not an admitted current package."; `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`; no schema field named | The retry case now runs past the connect and meets F-53 |
| TAU-2 recheck | AC-014; SR-077, SR-078 | Built server on released data, three starts | as above, `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | ENV-1 | Pass | `API-E01-r9-batches.txt` (R9-B) | TAU-1/2/3 `✓` | First start: base's `INTERNAL_ERROR`, follow-ups waiting. Next start: converted, read by its own path, save `UPDATED`. A later start changes nothing |
| O-8b | REQ-002 (stop), AC-007 of the idle-shutdown ticket | In-process server, own streams, background task view | as above, `tests/e2e/projects/background-step-stop-own-view.e2e.test.ts` (new) | ENV-1 | Pass (parity) | `API-E01-r9-O8b-background-step-stop.json` | BSV `✓` | After a stop mid-step, neither the user-started run (Stop) nor the delegated copy (Task DONE) gets a background update on its own stream; both task views answer `Unavailable: inactive` |
| API-B01 phone | AC-007 | Phone shell | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/mobile-shell-probe.mjs --output-dir=<dir> --cases=MSP-53,MSP-54,MSP-55` | ENV-3 | Pass | `API-B01-r9-phone-MSP-53-55.txt` | each `Pass` | On round-9 code |
| API-B01 desktop | AC-007; C3-06 | Browser, desktop | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/stopped-delegator-views-probe.mjs --output-dir <dir>` | ENV-2 | Pass | `API-B01-r9-SDV.txt` | `Stopped delegator views probe: Pass` | On round-9 code |
| API-P01, API-P02 | AC-016, AC-008 (peer) | Two to five built-server nodes | as round 5 | ENV-4 | Pass | `API-P01-P02-r9-peer-suite.txt` | `Tests 44 passed (44)` | On round-9 code |
| API-L01 | AC-001 (real runtime) | Real inference for the delegated runs | as round 6 | ENV-5 | Pass | `API-L01-r9-live-deepseek.txt` | `Tests 2 passed (2)`; `finishedAfterMs` 14081 (agent), 18526 (team) | On round-9 code |
| API-E02 | AC-001 … AC-006, AC-008, AC-011, AC-015 | Built servers, two nodes | round 8 (`API-E02-r8-*`, 28/28, 12/12, 9/9) | ENV-4 | Pass (reused) | `API-E02-r8-contract-stories-5.1.txt` … | — | Round 9's changes do not touch the stories' paths beyond the refusals rechecked above |
| Rendered blocked-root text; E-007, live suites; API-P03, API-P04, DS-15 restart, C15-03 rendered, API-B03, API-E01 full, API-F01 | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

Round 8's findings, rechecked on `f92881dd13`:
- **Resolved:** F-49 (SR-078: base's `INTERNAL_ERROR` first, then the follow-up converts the copy), F-50 (every entry point), F-51 (the admission's own reason at connect), F-52 (rule 7 on a running server).
- **O-8b:** parity with base, at the server.
- **O-8a and O-8c:** unchanged; still observations.

| ID | Case | Expected (authority) | Observed (`f92881dd13`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-53 | `team-run-v1-production-upgrade`, "keeps the server healthy … imports disjoint legacy rows on restart retry" (`API-E01-r9-F53-team-run-retry-tree.txt`) | Contract §6, E9: no tree keeps a stored list of local delegated runs after the migrations. Design lines 550-556 name the four predecessors whose later retries 461 handles, and SR-078 c adds follow-ups for them | The released team-run consolidation fails on the first start and succeeds on a restart, after 461's migration has run. The org tree it then writes keeps `rootOrg.members[…].taskExecutions: [{address:"/research/reviewer", agentRunId:"team-v1-supported-root-task-reviewer-run", …}]`, and a member launch keeps the obsolete `skillAccessMode`. The task agent's own file *is* converted (`delegatedFrom`, `address`, `launchSource`). No predecessor's follow-up covers this consolidation | `Unclear` (the design's predecessor set: whether the team-run consolidation's retry is a fifth predecessor, and the follow-up it needs) |

Observations (not failures):
- **O-8b (answered):** see the case above. Whatever the panel shows after the stop, it shows the same for both kinds of run: the same frames and the same task-view answer.
- **O-9a:** the not-cataloged scenario's run list fails closed (an unreadable run-history index, by design), so the web never offers that root. The reason reaches the user only where the root is listed (the token-blocked case).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01 (round 9); API-E02 (round 8); idle-lifetime (round 8) | Proven | — |
| AC-002 … AC-006 | Yes | API-E02 (round 8); FOLLOW (round 8); F-50 recheck | Proven | — |
| AC-007 | Yes | Desktop SDV and phone MSP-53 … 55 (round 9); CR-461-067 (round 8) | Proven | — |
| AC-008 | — | API-E02 S26/S27; peer suite (round 9) | Proven | — |
| AC-009 … AC-013 | mixed | rounds 8 and 9 | Proven | — |
| AC-014 | Yes | API-E03 (round 6); the earlier migrations' startup suites (TAU, collaborators, open-task-tree, team-run-v1) | Not Proven (F-53: one retry path) | — |
| AC-015 | — | API-E02 | Proven | — |
| AC-016 | Yes | RC-43 (peer suite, round 9) | Proven (scripted runtime) | — |
| DS-15 (SR-070) | — | DS-15 suite (round 6) | Proven for the user's message; restart resume Next Round | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 92% | Every criterion but AC-014's retry path proven on round-9 code | F-53 | The fix round |
| Changed-boundary execution directness | 92% | 92% | Built servers, own streams, two to five nodes, desktop and phone, real inference | Peer rows not rendered | API-P03 |
| Cross-boundary integration realism and mock gap | 85% | 85% | Real model across the delegator's Stop on round-9 code | One provider live | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Rebuilt outputs, released layouts, clean env, the test vault | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 88% | Damaged logs on every entry, unreadable files, blocked roots, three-start migrations, stops mid-step | DS-15 restart | The restart case |
| User-surface, browser, and desktop-shell confidence | 88% | 88% | Desktop and phone pass on round-9 code | Blocked-root text and O-8b not rendered; peer rows | The probes |
| Durable regression coverage quality and relevance | 88% | 88% | F-50 on all entries, F-52 on a running server, SR-078's three starts, O-8b parity suite | E-007 and the live suites | The rewrite |

- Overall post-repository confidence: 89%
- Overall final confidence: 89%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-014's retry path)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-53; the Next Round cases

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`, `Live provider`
- The confidence gap it addresses, and the expected gain: the rendered journeys, peers and real inference on round-9 code. All were done and passed.
- Browser validation needed, and why or why not: yes, done for the stopped-delegator journeys. The blocked-root text is deferred (see Deviations).

## Desktop Application Validation

- Approach executed: probe-owned real stack, desktop (ENV-2) and phone (ENV-3).
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the blocked root's reason rendered; O-8b's panel rendered; peer rows rendered (API-P03).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome:
  - API-E03 and SID-2 (round 6);
  - TAU-1/2/3, three starts with SR-078's follow-ups (round 9);
  - collaborators, open-task-tree (round 8);
  - team-run-v1's supported cohort and blocked connects (round 9).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: F-53 (a released consolidation retried after 461's migration leaves a stored list).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Added:** `tests/e2e/projects/background-step-stop-own-view.e2e.test.ts` (O-8b: a run's own view after a stop mid-step, delegated copy against a user-started run).
  - **Updated:**
    - `projects/unclean-shutdown-delegated-team-restore`:
      - USR-4 with base's code and text hard;
      - USR-6, a delegated Agent run on its own agent stream;
      - USR-7, the delegator's `send_message_to`;
      - USR-8, the assigner's reactivating message after DONE → IN_PROGRESS.
    - `run-history/standalone-unreadable-tree-containment`: on a running server, the bad run's delegator opens without its row, with a warning.
    - `app-data-migrations/task-agent-own-run-startup`: TAU-2 per SR-078, over three starts; the follow-ups are in `LATER`.
    - `app-data-migrations/team-run-v1-production-upgrade`: base's text, no schema field named; the task agent's own file is recorded beside the stored-list check.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The delegator's and most runs' model | Scripted AGY CLI | Deterministic tool calls (TESTING.md) | — |
| The delegated runs' model (API-L01) | Real: DeepSeek via the test vault | — | One provider |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built and in-process servers, data roots, probe stacks, peer nodes, homes | Yes | Each suite's `afterAll`, the probes' `finally`. One `afterEach` timeout: its temp folder (this run's) was removed by hand, and no process was left | Removed |
| `/tmp/api461/` logs and probe output | Yes | Kept; extracts committed (home paths shortened, secret scan clean). Peer receipts and node logs stay in `/tmp` | Kept |

## Preliminary Classification (On `Fail`)

- `Unclear`: F-53 (the design's predecessor set).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-014's retry path (F-53). Every other criterion is proven on round-9 code.
- Preliminary classification and recommended owner: Solution Designer, F-53 (the predecessor set and its follow-up), confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round:
  - First: recheck F-53 (team-run-v1's retry case).
  - Then: the rendered blocked-root text (a probe on the token-blocked scenario's data); O-8b rendered if still wanted; E-007 and the live suites; API-P03, API-P04, DS-15 restart resume, C15-03 rendered, API-B03, API-E01 in full and API-F01.
