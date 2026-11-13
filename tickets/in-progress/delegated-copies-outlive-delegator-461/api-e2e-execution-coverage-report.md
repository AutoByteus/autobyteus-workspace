# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-008`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 8, on CRR-032. Code under test `fdf5ad8380`; head `392a1b447d` (docs only after the code). The server `dist/` was newer than every source file before the built-server batches.
- Prior round reviewed: API-REV-007 (round 7, `Fail`: F-43, F-47, K-15, Q-1).
- Order of work, following the reviewer's list:
  1. CR-461-067 (the delegator's open view across a local child's Stop and restore);
  2. C23-02;
  3. round 23's changes (DTL-005, F-47 on both run-ID forms, S26/S27 and TAU-2 per SR-077);
  4. the Next Round list, stale suites first.
- Deviations from the plan, and why:
  - **Product failures remain (F-49 … F-52), so under the agreed rule these wait for the fix:**
    - API-P03, API-P04;
    - DS-15 restart resume, C15-03 rendered;
    - API-B03;
    - API-E01 in full, API-F01;
    - the last stale items: `project-task-boundaries` E-007 (needs a restart rewrite), and the live `agent-initiated-collaborators` and delegated background-task suites;
    - reruns of the phone, desktop, peer suite and API-L01 on this code (all passed on the merged state in round 7; round 8's code changes are server-side lifecycle and migration).
  - **Stale suites rewritten this round (13), all passing except where a product finding is named:** `closed-run-attachments`, `unclean-shutdown-delegated-team-restore` (USR-1/2/3/5; USR-4 is F-50), `task-agent-own-run-startup` (TAU-1, TAU-3; TAU-2 is F-49), `collaborators-to-delegated-runs-startup`, `team-run-v1-production-upgrade` (supported cohort and overlap; two cases are F-51), `open-task-tree-upgrade-startup` (OT-1/2/3), `standalone-unreadable-tree-containment` (replaced; UC-2 passes, UC-1 is F-52), `task-copy-idle-lifetime`, `delegated-copy-project-folder` (8/8), `model-routing-delegation` (9/9), `task-existing-copy-assignment` (TKD both run-ID forms), the stories harness and fixture (SR-077), and the restore helper's diagnostics.
  - **One suite added:** `delegator-view-follows-child` (CR-461-067), with FOLLOW-S and FOLLOW-E for the design's own-stream rule (SR-064).
- My own interference, recorded: a concurrent typecheck rebuilt the shared packages under a built-server batch (R8-B, rerun), and a scripted edit corrupted the TAU suite file once (restored byte-exact before any run).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 8 files carry `r8`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `fdf5ad8380` (server `dist/` newer than all sources) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server per test-owned data root, or the in-process Studio server; scripted AGY CLI (`agy-failure-cli.mjs`) | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. Never the user's app or `~/.autobyteus` |
| ENV-4 | as ENV-1 | as ENV-1 | The stories' two built-server nodes (§5.1) | Owned by the suite |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 / R02 | type gates | Server typecheck | `cd autobyteus-server-ts && pnpm -s typecheck` (no job running) | ENV-1 | Pass | `/tmp/api461/r8-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `PASS` | After every edit of this round |
| R8-A rechecks | F-43 (DTL-005 every root), F-47 (both run-ID forms), Team tab, reactivation, closure race | In-process server | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run <files> --no-watch --no-file-parallelism --reporter=verbose` | ENV-1 | Pass (rechecks) | `API-E01-r8-batches.txt` (R8-A) | DTL-005 `✓` agent/team/org; EXC-001 … 003 and TKD `✓` | F-43 and F-47 resolved; the recipient path unchanged |
| CR-461-067 FOLLOW | REQ-002, REQ-003, AC-007; design SR-064 | In-process server, the delegator's view and the child's own stream | as R8-A, `tests/e2e/projects/delegator-view-follows-child.e2e.test.ts` | ENV-1 | Pass | `API-E01-r8-CR-461-067-follow.json`, `API-E01-r8-batches.txt` (R8-I) | `Tests 3 passed (3)`; `afterStop: offline`; `ownStreamAfterRestore` holds `TURN_STARTED … TURN_COMPLETED` | Agent, team and Org delegators: FOLLOW-A (agent child), FOLLOW-T (team child with an `error` member), FOLLOW-S (own stream across Stop and restore), FOLLOW-E (own stream opened at once after `delegate_task`) |
| C23-02 | DS-7 | — | Review of the RC suites | — | No change needed | — | — | No RC case put a peer-started team's member in `error`; DS-7's single idle rule is exercised by DTL-005's Org path (pass) |
| API-E02 | AC-001 … AC-006, AC-008, AC-011, AC-015; SR-077 | Built servers, two nodes for §5.1 | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 CONTRACT_STORIES_CONTINUE=1 CONTRACT_STORIES_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch --reporter=verbose` | ENV-4 | Pass | `API-E02-r8-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt` | §5.1 `28 of 28`; §5.2 `12 of 12`; §5.3 `9 of 9` | S26 (M stopped first, the mutation's `{success, message}`) and S27 match: K-15 resolved |
| Stale group (migration startup) | AC-014; REQ-007; E6/E6t/E8/E9; TC-9; SR-077 | Built server on hand-built released data | as R8-A, the files below | ENV-1 | **Fail** (F-49, F-51) | `API-E01-r8-batches.txt` (R8-D … R8-H), `API-E01-r8-F49-preserved-copy.txt`, `API-E01-r8-F51-unconverted-team-view.txt` | TAU-1/3 `✓`; collaborators `✓`; team-run-v1 2 of 4 `✓`; OT-1/2/3 `✓` | TAU-2 is F-49; team-run-v1's two blocked-root cases are F-51 |
| Stale group (projects, routing) | REQ-001, REQ-002, AC-013; earlier tickets' acceptance | In-process and built servers | as R8-A | ENV-1 | **Fail** (F-50, F-52) | `API-E01-r8-batches.txt`, `API-E01-r8-F50-usr4-refusal.txt`, `API-E01-r8-F52-unreadable-own-file.txt` | idle-lifetime `✓` (R8-K); DCF 8/8 `✓`; MR 9/9 `✓`; closed-run-attachments `✓`; USR-1/2/3/5 `✓`; UC-2 `✓` | USR-4 is F-50; UC-1 is F-52 |
| API-E01 full, API-F01, API-B03, API-P03, API-P04, DS-15 restart, C15-03 rendered, E-007, live suites; phone, desktop, peer, API-L01 reruns | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

Round 7's findings, rechecked on `fdf5ad8380`:
- **Resolved:** F-43 (DTL-005 in every root), F-47 (both run-ID forms), K-15 (S26 by SR-077: the stories match 28 of 28).
- **Q-1** is decided by SR-077 and tested: see F-49.
- **F-48 (candidate) withdrawn:** the idle-lifetime suite followed each run's own stream after `delegate_task` answered, when the turn and its step's `running` frame were over. Base's client reads the current tasks with `agentBackgroundTaskView`; the suite does too now and passes. FOLLOW-S and FOLLOW-E prove the own stream follows its run.

| ID | Case | Expected (authority) | Observed (`fdf5ad8380`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-49 | `task-agent-own-run-startup` TAU-2 (`API-E01-r8-F49-preserved-copy.txt`) | design-spec.md line 568 (SR-077): a copy preserved by an unfinished predecessor answers `NOT_FOUND` to its own save; "when the predecessor's retry finishes the item, the copy is read as an ordinary run and its own Settings save works" | (a) First start: `{success:false, outcome:"INTERNAL_ERROR", message:"Run ownership could not be verified; saved settings were not changed."}`: the public mutation's base path (`studio-run-model-config-service.ts:109-118`, unchanged since `3d738de6e6`) answers so for any run without its own metadata. (b) After the predecessor's retry succeeded, the moved copy's save answers `NOT_FOUND` "Run 'c1-reviewer' was not found."; 461's migration stays `SUCCEEDED_WITH_WARNINGS`, attempts 1 ("Scanned 26; migrated 23; skipped 3"), so the preserved copy never gets its history row (DS-11: the save refuses a run without one). Same in R8-E, R8-F, R8-G | (b) `Local Fix` (server, migration); (a) `Unclear` (the design's stated outcome against the mutation's base answer) |
| F-50 | `unclean-shutdown-delegated-team-restore` USR-4 (`API-E01-r8-F50-usr4-refusal.txt`) | The earlier ticket's AC-006, at base: the user's message to a delegated team whose coordinator's log has a damaged line before the last record is refused with `TEAM_SEND_MESSAGE_REJECTED` / `TASK_EXECUTION_CONTEXT_UNAVAILABLE`, "The delegated Team at '…' cannot be restored …", naming the Team, the coordinator, the line and the next step; nothing delivered; the file unchanged | On the team's own stream (rule 2): `COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE`, "The local conversation state cannot be inspected safely: line 3 of raw_traces_active.jsonl is damaged." The line is named, nothing is delivered and the file is unchanged (hard checks pass); the Team, the coordinator and the next step are gone | `Local Fix` (server) |
| F-51 | `team-run-v1-production-upgrade` ×2 (`API-E01-r8-F51-unconverted-team-view.txt`) | The released-shape upgrade's acceptance, at base: a user's message to a root its migration could not convert is refused with `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED`, or `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED` when the token migration blocks it | The team's view fails at connect: `TEAM_STREAM_UNAVAILABLE` "rootTeam.members[1] is missing required field(s): agentDefinitionId, agentRunId, platformAgentRunId, launchConfiguration." At base `connect` restored the team first, so the restore's refusal reached the user; since SR-046 the view serves the stored file before any admission check, and the released-shape file fails to parse | `Unclear` (SR-046's order against the earlier tickets' refusals; a Local Fix if the admission check may come first) |
| F-52 | `standalone-unreadable-tree-containment` UC-1, replaced suite (`API-E01-r8-F52-unreadable-own-file.txt`) | DESIGN.md rule 7: one run's unreadable data leaves every other run working; only that run is left out or reports the error | Running server, after a delegated run's own `run_metadata.json` is truncated: its delegator's view fails with "Agent root status identity mismatch."; the other delegators open. After a restart (UC-2) it is contained: every delegator opens, the bad run is refused ("Run package … is unavailable."), and warnings name it. R8-F and R8-G | `Local Fix` (server) |

Observations (not failures):
- **O-8a:** the former hub route `/rest/agent-collaborations/<hub>/agent-runs/<run>/context-files/<name>` still serves a delegated run's file (200). The design names the web's path (the run's own route, which serves it) and does not say the older route must refuse. Recorded in TAU-1.
- **O-8b:** when Task DONE stops a delegated copy whose background step runs, no `BACKGROUND_TASK_UPDATED` "stopped" frame reaches the delegator's view (it relays statuses only, by design) or the copy's own stream. The copy's process ends at once (AC-007's outcome, asserted). Base's suite measured the stop by that frame on the hosting root's view.
- **O-8c:** OT-2's Team tab still reads the closed run's own file (one unreadable read reported while it was blocked). This is 469's D-5 read, unchanged; the load reads none.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-E02; idle-lifetime (a copy outlives its delegator's Stop, every root); API-L01 (round 7, merged state) | Proven | — |
| AC-002 … AC-006 | Yes | API-E02 (§5.1 28/28, §5.2 12/12, §5.3 9/9); FOLLOW; reactivation | Proven | — |
| AC-007 | Yes | CR-461-067 FOLLOW (server, every delegator); desktop and phone (round 7) | Proven | — |
| AC-008 | — | API-E02 S26/S27; RC-44 (round 7) | Proven | — |
| AC-009 … AC-012 | mixed | R8-A (F-43, F-47 resolved), DCF, MR, EXC, idle-lifetime | Proven | — |
| AC-013 | — | idle-lifetime (background copies kept past the grace, released after their step, every root) | Proven | — |
| AC-014 | Yes | API-E03 (round 6); the earlier migrations' startup suites | Not Proven (F-49; F-51 for blocked roots) | — |
| AC-015 | — | API-E02 | Proven | — |
| AC-016 | Yes | RC-43 (round 7, merged state) | Proven (scripted runtime) | — |
| DS-15 (SR-070) | — | DS-15 suite (round 6) | Proven for the user's message; restart resume Next Round | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 88% | Every criterion but AC-014 proven; the stories match in full | F-49, F-51 | The fix round |
| Changed-boundary execution directness | 90% | 90% | Built servers, own streams, two nodes, the views of every delegator kind | Peer rows not rendered | API-P03 |
| Cross-boundary integration realism and mock gap | 82% | 82% | Real servers and restarts; real inference in round 7 | One provider live | — |
| Environment, configuration, identity, and fixture fidelity | 88% | 88% | Hand-built released layouts, clean env, built outputs current | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 80% | Idle shutdown with background steps, Stop and restore, unreadable data, damaged logs | F-50, F-52; DS-15 restart | The fix; the restart case |
| User-surface, browser, and desktop-shell confidence | 88% | 88% | Desktop and phone journeys pass (round 7) | Not rerun on round-8 code; peer rows rendered | API-P03; the reruns |
| Durable regression coverage quality and relevance | 86% | 86% | 13 stale suites rewritten to 461's shapes; one replaced; one added with the own-stream rule | E-007 and the live suites | The rewrite |

- Overall post-repository confidence: 86%
- Overall final confidence: 86%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-014)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-49 … F-52; the Next Round cases

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Lifecycle`, `Worker or Distributed`
- The confidence gap it addresses, and the expected gain: restarts, idle shutdown and the migration starts on real servers (done this round); the browser and peer reruns follow the fix.
- Browser validation needed, and why or why not: not this round. Round 8's code changes are server-side; the rendered journeys passed on the merged state (round 7) and are rerun after the fix.

## Desktop Application Validation

- Approach executed: none this round (see above).
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the rendered journeys on round-8 code; peer rows rendered (API-P03).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome:
  - API-E03 and SID-2 (round 6);
  - the earlier migrations' startup suites, now asserting the end state after 461's migration: TAU-1/3, collaborators-to-delegated (E6, TC-9), team-run-v1 supported cohort (E6), open-task-tree.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: F-49 (a preserved copy is never converted after its predecessor's retry); F-51.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (O-8a is recorded, not classified)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Added:** `tests/e2e/projects/delegator-view-follows-child.e2e.test.ts` (CR-461-067: FOLLOW-A, FOLLOW-T, FOLLOW-S, FOLLOW-E).
  - **Replaced:** `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts`. Its premise (a standalone collaboration tree file) and trigger (the hub-tree scan) are removed by 461; it now checks rule 7 on a delegated run's unreadable own file.
  - **Updated to 461's shapes and rules:**
    - `app-data-migrations/task-agent-own-run-startup` (own files `delegatedFrom`; reads by the run's own path; DS-11 top-level rows; SR-077 on the preserved copy);
    - `app-data-migrations/collaborators-to-delegated-runs-startup` (own files; the stamp as the copy's own definition and launch; TC-9 listing; the index backup);
    - `app-data-migrations/team-run-v1-production-upgrade` (E6 own file);
    - `run-history/open-task-tree-upgrade-startup` (no hand-built 469 entries: converted by 461's migration, API-E03);
    - `projects/unclean-shutdown-delegated-team-restore` (the team's own stream; base's text checked softly beside the hard AC-006 checks);
    - `projects/closed-run-attachments` (the run's own context-file route);
    - `projects/task-copy-idle-lifetime` (the own streams with the polled background read; REQ-001: the copy outlives its delegator's Stop; the quiet copy's own stream across idle shutdown);
    - `projects/delegated-copy-project-folder` DCF-02 and `model-routing/model-routing-delegation` MR-02 (a member on its own team's stream, at `/member`);
    - `projects/task-existing-copy-assignment` (TKD by run ID);
    - `projects/collaboration-contract-stories` and its fixture (SR-077);
    - `helpers/restore-by-member-message` (the stream's own refusal first).
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Every run's model | Scripted AGY CLI | Deterministic tool calls (TESTING.md) | No live inference this round (round 7's API-L01 stands) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built and in-process servers, data roots, homes | Yes | Each suite's `afterAll`; a stopped run's temp home removed by hand (only this run's) | Removed |
| `/tmp/api461/` logs and story output | Yes | Kept; extracts committed (home paths shortened, secret scan clean) | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix` (server): F-49 (b), F-50, F-52.
- `Unclear`: F-49 (a), F-51.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-014 (F-49; F-51 for blocked roots). Every other criterion is proven.
- Preliminary classification and recommended owner:
  - Implementation Engineer: F-49 (b), F-50, F-52;
  - Solution Designer: F-49 (a), F-51;
  - each confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round:
  - First: recheck F-49 … F-52 (TAU-2, USR-4, team-run-v1, UC-1).
  - Then: E-007 and the live suites; API-P03, API-P04, DS-15 restart resume, C15-03 rendered, API-B03, API-E01 in full and API-F01; the phone, desktop, peer and API-L01 reruns.
