# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-005`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 5, on CRR-023 (code `56e4ce773b`, docs `bc96cddb14`).
- Prior round reviewed: API-REV-004 (round 4, `Fail`: F-14, F-16 … F-22).
- Order of work (the reviewer's list):
  1. round 4's Next Round;
  2. the rechecks (F-14, F-16 … F-22, SDV-01 … 03);
  3. the new checks (C17-02, CR-461-042, SR-071's refusals end to end).
- Deviations from the plan, and why:
  - **The stale rewrites found product failures again** (F-23 … F-31 in batches R5-A … R5-C). Under the agreed rule, the rewrites not yet done wait for the fix. The investigation lists each one under Next Round.
  - **All product failures are reported together** at the end of the round (the user's process agreement).
  - **Every candidate was confirmed in a targeted run.** The whole-E2E discovery run was loaded (AGY model discovery timeouts), so a failure there only counted after a targeted run confirmed it.
  - **The phone cases had never run in this ticket's round 4 or 5 builds.** The web restore to base (`12ea5a05d6`) had removed both the import and the call of `runStoppedDelegatorCases` from `mobile-shell-probe.mjs`, so `--cases=MSP-50,…` selected nothing. Both are put back.
  - **Not done this round, in the Next Round list:**
    - API-P03, the peer rows rendered;
    - API-P04, rule 3's two-node peer capture at base;
    - DS-15 restart resume, and C15-03's rendered two-view check;
    - API-E01 in full, API-I01, API-B03, API-L01, API-F01.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 5 files carry `r5`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `56e4ce773b` (server `dist/` rebuilt, `/tmp/api461/r5-build.log`) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server per test-owned data root, or the in-process Studio server; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. No provider keys. Never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | ENV-1 server, Nuxt dev from the worktree, headless Chrome, all owned by the probe | Desktop viewport |
| ENV-3 | as ENV-1; phone bundle rebuilt from it (`/tmp/api461/r5-mobile-build.log`) | as ENV-1 | The probe's nodes (alpha, beta, eta), the production phone bundle at `/mobile`, headless Chrome 390×844 paired through Phone Access | Owned by the probe |
| ENV-4 | as ENV-1 | as ENV-1 | Two to five built-server nodes (alpha, beta, gamma, delta, epsilon) paired through capturing proxies | Owned by the suite |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 / R02 | unit parts, type gates | Server unit, contracts, web specs | Reused: the implementation's checks through IR-018 (IMP-67) | — | Pass (reused) | IMP rows | as recorded there | Ran on the code under test. The server typecheck was rerun after this round's test edits: `production errors: 0; test-file errors: 1012 (baseline 1012)`, PASS |
| API-B01 desktop | AC-007, REQ-002 (every depth, once), SR-048, rule 2, O-1; F-14 (team), F-22; CR-461-042 | Browser, desktop: a stopped delegator's views (agent, team, org) | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/stopped-delegator-views-probe.mjs --output-dir <dir>` | ENV-2 | **Pass** | `API-B01-r5-SDV-evidence.txt`, `API-B01-r5-SDV-02-team-worker-answered.png`, `API-B01-r5-SDV-04-after-done.png`, `-row-back.png` | each case `"result": "Pass"`; `"helperRowLive": true`; `"workerMessageSockets": ["/ws/agent/<worker>"]`; `"rootStayedStopped": true`; SDV-04 `"leftAfterDone": true`, `"backAfterReopen": true` | F-14 (team view) and F-22 (desktop) resolved. SDV-01's earlier flake did not recur. New SDV-04: CR-461-042's reopened row |
| API-B01 phone | AC-007, REQ-002 (phone layout, once); O-1 | Phone shell | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/mobile-shell-probe.mjs --output-dir=<dir> --cases=MSP-50,MSP-51,MSP-52` | ENV-3 | **Fail** | `API-B01-r5-phone-MSP-50-52-evidence.txt`, `API-B01-r5-phone-MSP-51-worker-row-missing.png`, `API-B01-r5-phone-MSP-52-run-screen-not-open.png`, `API-B01-r5-phone-MSP-50-worker-answered.png` | MSP-50 `Pass`; MSP-51 `details.node.rootRows` has the worker in `task_executions` while `details.rows` has none under the team; depth-0 `Worker agent …` rows; MSP-52 `rowKey` `…/task-agent:worker_…`, `screenState: null` | F-32, F-33, F-34 |
| API-P01, API-P02 | AC-016 / REQ-013 / SR-066; AC-008 / REQ-007 / SR-067 G-1 (peer); the peer suite's earlier cases under rules 1 and 2 | Two to five built-server nodes | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 REMOTE_E2E_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch --reporter=verbose` (three runs; test updates between them) | ENV-4 | **Fail** (F-35, F-36 only) | `API-P01-P02-r5-peer-suite.txt` | run 3: `Tests 2 failed \| 42 passed (44)`; RC-43, RC-44 `✓`; RC-25 `startError.code`; RC-33 `coordinator_address` | New RC-43 (AC-016 with stopped solo, team and org delegators; a peer Agent and a peer Team: live status, message, interrupt, stored conversation, Stop; the delegator stays stopped): Pass. New RC-44 (archive and delete refused naming the working peer run; with beta stopped the delete goes ahead and names the run it could not ask): Pass |
| API-E02 | AC-001 … AC-006, AC-011, AC-015 data; SR-071 (R-8 before R-7, R-12); C8-09 | Built servers (two paired nodes for §5.1); files compared with the regenerated model after every step | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 CONTRACT_STORIES_CONTINUE=1 CONTRACT_STORIES_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch --reporter=verbose` (§5.2 first run; §5.3 rerun; §5.1 rerun with `-t "5.1"`) | ENV-1 | **Fail** | `API-E02-r5-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt` | §5.2 `11 of 11`; §5.3 `9 of 9`; §5.1 `24 of 28`, differ `S23, S24, S26, S27` | §5.3 O8 passes (F-21 resolved). U9 (R-7), U10 (R-12 live) and S20 (R-8) match. S23/S24: contract-model note K-13. S26: F-30. S27 follows from S26 |
| CPW | REQ-009 (texts); C17-02 | In-process Studio server, real roots, scoped MCP | `… pnpm exec vitest run tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `/tmp/api461/r5-batchC.log` | `14 passed` | New CPW-M7 (C17-02): org Manager → squad lead → outsider A; A delegates to `/sibling`, an address only the org's catalog offers: `"delegated":true`, `"target_kind":"agent"`, as at base |
| SR-071 end to end | R-8 before R-7, R-12 live and stopped, a member's ID in `delegate_task` | In-process server and the stories | EXC-E2E-001 … 005 (`-t "EXC-E2E-005"` for the stopped-team step); stories S20, U9, U10 | ENV-1 | Pass (R-7, R-8, R-12); F-19b open | `API-E01-r5-EXC-005-R12-stopped.txt`, `API-E02-r5-contract-stories-5.2.txt` | EXC-005: the only failure is the soft cross-root delegate text at line 824; the stopped-team step passes | The stopped-team step was stale (it asserted the old "not `TARGET_IS_TEAM_RUN`"); updated to SR-071. A member's ID in `delegate_task`: EXC-001 … 003 `memberAsAgent` pass with base's "… is not one of your task agents …" |
| API-E01 (rewrites and rechecks) | AC-001 … AC-013 regressions; F-16 … F-20 | In-process and built servers | `pnpm exec vitest run <files> --no-watch --no-file-parallelism --reporter=verbose` (clean env), batches R5-A, R5-B, R5-C | ENV-1 | **Fail** | `API-E01-r5-F23-reactivation.txt`, `-F19b-F24-existing-copy.txt`, `-F25-migration-order.txt`, `-F26-two-hop-message-missing.txt`, `-F27-F29-F31-batchB-C.txt`, `-F28-self-target.txt`; logs `/tmp/api461/r5-batch{A,B,C}.log` | change feed 7/7, model contract 3/3, launch defaults alone Pass, CANCELLED reactivation journeys Pass, EXC-007 Pass | F-16, F-17, F-20 resolved. New F-23 … F-29, F-31 |
| API-E01 (discovery) | — | Whole server E2E | `pnpm exec vitest run tests/e2e --no-watch` | ENV-1 | Input only | `/tmp/api461/r5-E01-discovery.log` | `48 failed, 137 passed, 72 skipped` | Loaded machine; the plan's input, not a result |
| API-P03, API-P04, DS-15 restart, C15-03 rendered, API-E01 full, API-I01, API-B03, API-L01, API-F01 | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

Round 4's findings, rechecked on `56e4ce773b`:
- **Resolved:**
  - F-14 in the team view (SDV-02);
  - F-16 (launch defaults pass alone);
  - F-17 (the CANCELLED reopen journeys pass);
  - F-18 (SR-071; S20 and U9 match);
  - F-20 (EXC-007);
  - F-21 (§5.3 9/9);
  - F-22 on the desktop.
- **F-19:** the `TARGET_IS_TEAM_RUN` part is resolved (U10, EXC-005, live and stopped). The cross-root delegate text stays open as F-19b.

| ID | Case | Expected (authority) | Observed (`56e4ce773b`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-19b | EXC-E2E-005 (`API-E01-r5-EXC-005-R12-stopped.txt`) | SR-071: `delegate_task` refusals keep base's texts. Base: "`<team>` is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address." | "Only the agent that gave this task agent its most recent Task can give it a new one. Delegate Task … to a new task agent with recipient_address instead." | `Local Fix` (server text) |
| F-23 | `task-reactivation-root-visibility` DONE journeys, agent, team, org (`API-E01-r5-F23-reactivation.txt`) | autobyteus-469 DEC-006, as at base: the assigner's message to a member of a Team copy whose Task is DONE is refused (`TARGET_AGENT_RUN_NOT_ACTIVE`, "No running agent has the run id …") | `accepted: true`, `code: DELIVERED`. REQ-003 (a message wakes a stopped receiver) may make this intended | `Unclear` (DEC-006 against REQ-003 for a team copy's member) |
| F-24 | TKD-AGY-001 (`API-E01-r5-F19b-F24-existing-copy.txt`) | Base (the suite cites task-keys AC-019, 022, 023, 027): after the Task is deleted, `delegate_task(target_agent_run_id: <its copy>, task_id: <new Task>)` by the same Manager is accepted (`delegated: true`) | Refused: "… is not one of your task agents …" | `Unclear` (REQ-009 base behavior against contract R-9 / TC-9 for a deleted Task's runs) |
| F-25 | `remove-skill-improvement-data-startup` (`API-E01-r5-F25-migration-order.txt`) | REQ-011, data guideline: a released migration's partial states are preserved; the 461 migration runs after the released migrations. The improver's delegated copy is kept | `20261111_delegated_runs_own_runs_v1` ran at `…36-768Z` and converted `improver_task_copy_6666` to an own run; `20261020_remove_skill_improvement_data` then ran at `…36-788Z` and "Removed the helper run folder": the copy is gone | `Local Fix` (server: migration order); **data loss** |
| F-26 | `task-closure-root-visibility`, `teammate-delivery-task-closure-race` (`API-E01-r5-F26-two-hop-message-missing.txt`) | Rule 1 / REQ-002: the delegator's Team tab shows the messages between its runs at every depth, as at base | A delivered two-hop message (the worker to its helper) is missing from the Manager's Team tab; so is the refused one-hop message of `teammate-delivery` | `Local Fix` (server or web) |
| F-27 | `runtime-switch-native-built-server` RS-03 (`API-E01-r5-F27-F29-F31-batchB-C.txt`) | Base refused a delegated copy's runtime switch from its host's Save | Accepted (`UPDATED`, "Agent runtime and model saved …") on the copy's own save. REQ-002 says "configured while stopped … like any run" | `Unclear` |
| F-28 | `delegated-team-lazy-member-activation` (`API-E01-r5-F28-self-target.txt`) | Base: a delegated team member calling `delegate_task` with its own team's name is refused with `COLLABORATION_SELF_TARGET_REJECTED` (self words) | "'/dtl_squad_…' is not the address of an available agent or agent team …" | `Local Fix` (server) |
| F-29 | `get-project-task-worker-scope` SCP-E2E-006 (`API-E01-r5-F27-F29-F31-batchB-C.txt`) | autobyteus-469 DEC-010 / MP-003: a copy whose Task record cannot be read at start fails closed: no model request | Two model requests recorded (`lastText` `NATIVE_CALL:{"name":"get_project_task",…}`) | `Local Fix` (server) |
| F-30 | API-E02 §5.1 S26 (`API-E01-r5-F30-S26.txt`, `API-E02-r5-contract-stories-5.1.txt`) | Contract T-5 / model S26: deleting M is refused while a run it delegated to works; the model reads "works" as "has an open Task" | M is deleted while the research agent has an open Task but is idle. DS-13 / SR-067 read "works" as live status | `Unclear` (model against DS-13) |
| F-31 | `stopped-run-edit-root-built-server` SRE-01 … 03 (`API-E01-r5-F27-F29-F31-batchB-C.txt`) | Base: a copy two hops down carries the top run's saved launch edit (`sre-alt-model`) | It carries its immediate delegator's launch (`gemini-3.8-flash-low`) | `Unclear` (launch inheritance two hops down under the own-run model) |
| F-32 | API-B01 phone MSP-51 | AC-007, REQ-002 (desktop and phone): the stopped team's delegated worker is shown under it | No worker row under the team on the phone. The node's `getTeamRunResumeConfig.executionTree.task_executions` has it; the desktop shows it (SDV-02) | `Local Fix` (web, phone run tree) |
| F-33 | API-B01 phone MSP-50 … 52 (rows listing) | REQ-002: a delegated run is shown under the run that delegated it, **once** | Opening a delegated worker's row on the phone adds it as a live top-level run (agent root's worker after MSP-50; the org's worker on tap in MSP-52). The node's `listWorkspaceRunHistory` does not list it | `Local Fix` (web, phone run list) |
| F-34 | API-B01 phone MSP-52 | AC-007: the user opens the stopped org's worker row and messages it | Tapping the org's `task-agent:` row opens no run screen (`screenState: null`, no alert, no failed request) | `Local Fix` (web, phone opening of a delegated row; rule 2) |
| F-35 | API-P01 RC-25 | REQ-005 (the Task rules unchanged), base: a dispatch that fails stores `startError.code: TASK_DISPATCH_FAILED` | `PEER_UNREACHABLE` (the same message) | `Local Fix` (server) |
| F-36 | API-P01 RC-33 | Rule 1 (views in base's shapes): a peer Team row's `coordinator_address` was `/studio_team/lead` | `/lead` (the own-team address of contract §3.1's `members`) | `Unclear` (rule 1's value against §3.1's own-team addresses) |

Contract-model note K-13 (for the Solution Designer):
- §5.1 stops E at S16 (T1 deleted, T6 closed).
- S23 and S24 then have E's member `solution_designer_65a9` call tools.
- The server keeps no MCP session for a stopped run, and DS-15 refuses user input to it. So no real path makes that agent act ("Agent tool MCP session is unavailable").
- DL-11 and A-5/A-6 need a run that works: place S23 and S24 before S16, or give them such a run.

Observations (not findings):
- **Wording.** The design's SR-066 paragraph says "the peer protocol (no wire change)". The requirements' External Contracts row allows "a renamed wire field is a clean cut", and the start request's `coordinatingRun` is now `delegatingRun`. The tests follow the requirements; the wording could be aligned.
- **RC-36.** A newly opened view first gets `PeerChildObservation`'s cached summary of a peer run (`idle` after the run shut down), then the fresh `offline` read within the bound. AC-805 holds.
- **Agent-run view nesting.** The agent-run view shows the helper beside the worker under the Manager. Whether base's web nested a copy's copy is rule 3's peer and nesting capture (API-P04, Next Round).

Contract-model notes K-1 … K-12 as before.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-E02 §5.1, §5.2; API-R01 | Not Proven: the real runtime is API-L01 (Next Round) | — |
| AC-002 … AC-006 | Yes | API-E02 §5.2 11/11, §5.3 9/9, §5.1 24/28; API-E01 | Not Proven (F-23, F-26; K-13 for S23/S24) | — |
| AC-007 | Yes | API-B01 desktop SDV-01 … 04 (Pass); phone MSP-50 (Pass), MSP-51/52 (Fail) | Not Proven (F-32, F-33, F-34: phone) | — |
| AC-008 | — | API-P02 RC-44 (peer, Pass); API-E02 S26 | Not Proven (F-30, local) | — |
| AC-009 … AC-013 | mixed | API-R01; API-E01; EXC; CPW | Not Proven (F-19b, F-24, F-27, F-28, F-29, F-31) | — |
| AC-014 | Yes | API-E03 (round 4); the migration-startup group | Not Proven (F-25: a converted delegated copy deleted by a released migration that runs after) | — |
| AC-015 | — | API-E02 | Not Proven (§5.1 S26/S27) | — |
| AC-016 | Yes | API-P01 RC-43 | Proven (scripted runtime) | — |
| DS-15 (SR-070) | — | DS-15 suite (round 4) | Proven for the user's message, reopen, deleted Task; restart resume Next Round | — |
| SR-071 | — | S20, U9, U10, EXC-001 … 005 | Proven for the order, R-12 live and stopped, a member's ID; F-19b (the cross-root text) open | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 72% | 72% | AC-016 and the peer AC-008 proven; stories 44/48; desktop journeys; SR-071 | F-19b, F-23 … F-36 | The fix round; the Unclear decisions |
| Changed-boundary execution directness | 85% | 85% | Built servers, five-node peer suite, own streams, browser desktop and phone | Peer rows not rendered | API-P03 |
| Cross-boundary integration realism and mock gap | 70% | 70% | Real HTTP/WS/MCP between real nodes; scripted AGY only | Real runtime | API-L01 |
| Environment, configuration, identity, and fixture fidelity | 85% | 85% | Clean env, fresh roots, rebuilt server and phone bundle | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 70% | Peer offline and restart cases, closure races, R-12 stopped, the archive/delete guard | DS-15 restart resume; F-25 | The restart case; the migration group after F-25 |
| User-surface, browser, and desktop-shell confidence | 65% | 65% | Desktop SDV-01 … 04 all pass | The phone (F-32 … F-34) | The fix round, MSP-50 … 52 |
| Durable regression coverage quality and relevance | 75% | 75% | The phone cases now run and check "once"; peer suite on the contract; R-12 stopped; CPW-M7; SDV-04 | Remaining stale suites | The rewrite (per file in the plan) |

- Overall post-repository confidence: 75%
- Overall final confidence: 75%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`
- Any final applicable category below `90%`: `Yes`: all seven
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-19b, F-23 … F-36; K-13; the Next Round list

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`
- The confidence gap it addresses, and the expected gain:
  - the rendered journeys on the desktop and the phone;
  - the peer cases on real nodes;
  - the stories.
  - This round they proved AC-016 and the peer guard, and found the phone failures F-32 … F-34.
- Browser validation needed, and why or why not: yes. The phone's rows and opening are visible only in the rendered app; the server reads are correct there.

## Desktop Application Validation

- Approach executed: probe-owned real stack, desktop (ENV-2) and phone (ENV-3). No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`. Processes this run did not start were left untouched.
- Behavior not directly proven: the phone layout's delegated rows (F-32 … F-34); peer rows rendered (API-P03).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome: API-E03 (round 4), API-R01; the migration-startup group (`remove-skill-improvement-data-startup` found F-25)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk:
  - **F-25:** the order of the 461 migration against the released `20261020_remove_skill_improvement_data` deletes a converted delegated copy;
  - the rest of the migration-startup group (Next Round).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No` (the peer wire rename is a clean cut per the requirements; see the observation on the design's wording)
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Web probes:**
    - `mobile-shell-probe.mjs`: the import and the call of `runStoppedDelegatorCases` put back (lost in the web restore to base).
    - `mobile-stopped-delegator-cases.mjs`:
      - REQ-002 "once" checked before and after the worker is opened;
      - on failure, the node's own list reads and a screenshot of a run screen that did not open.
    - `stopped-delegator-views-probe.mjs`: new SDV-04 (CR-461-042, the reopened row).
  - **Peer suite** (`remote-collaboration/remote-delegation-two-server`):
    - new RC-43 (AC-016) and RC-44 (AC-008 peer guard);
    - links read from alpha's Task entries (`delegatedFrom`, `recipientAddress`, `nodeId`, `members`);
    - `delegatingRun` on the wire (start requests, request fields);
    - no `launches` on alpha's side; the launches on the peer's summary (SR-038);
    - the agent run's log in its own folder (TC-13);
    - RC-36 waits for the fresh read;
    - RC-25 and RC-33 checked softly (F-35, F-36) so the later cases run;
    - T-5 "names them" by address or run ID.
  - **Stories** (`collaboration-contract-stories`):
    - drivers for S26, S27, U9, U10;
    - `callDirect` (the agent's own MCP endpoint);
    - titles S0 … S27, U0 … U10;
    - the fixture `contract-states.json` regenerated (`--check` matches).
  - **CPW** (`collaboration-prompt-wording`): new CPW-M7 (C17-02).
  - **Existing-copy** (`task-existing-copy-assignment`):
    - `delegatedFrom` in stored entries;
    - EXC-005's stopped-team step moved to SR-071's R-12;
    - its cross-root text check is soft (F-19b).
  - **Own-run rewrites (rule 2):**
    - `teammate-delivery` (the Manager in the snapshot);
    - `delegated-copy-member-contact-host` (sends by the own run);
    - `stopped-run-edit-root` (the copy's own stream);
    - `task-copy-idle-lifetime` (own-run streams);
    - `delegated-team-lazy-member-activation` (a leading `offline`);
    - `get-project-task-worker-scope` (the fail-closed invariant only);
    - `collaboration-model-contract`;
    - `project-change-feed` (SR-054 refusal shape);
    - `delegated-copy-model-change` (helpers to own saves, Stop and options; the rest Next Round);
    - `helpers/collaboration-participant-messages.ts` (delegated rows read by their own identity).
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent runtime's model | Scripted AGY CLI | Deterministic, no provider keys (TESTING.md) | A real model's turn (API-L01) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built and in-process servers, data roots, probe stacks, peer nodes | Yes | Each suite's `afterAll`, the probes' `finally` (`serversLeft: 0`, `rootRemoved: true`) | Removed |
| `/tmp/api461/` logs, homes and probe output | Yes | Kept; excerpts committed. The peer receipt and node logs hold peer signatures: kept in `/tmp` only, records extracted with signature fields redacted | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix`:
  - server: F-19b, F-25 (data loss), F-28, F-29, F-35;
  - server or web: F-26;
  - web, phone: F-32, F-33, F-34.
- `Unclear`: F-23, F-24, F-27, F-30, F-31, F-36.
- Contract model (Solution Designer): K-13.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: as the proof table; AC-016 is proven.
- Preliminary classification and recommended owner:
  - Implementation Engineer: the Local Fix findings;
  - Solution Designer: the Unclear ones and K-13;
  - each confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes, for the next round:
  - First: the remaining stale rewrites (the investigation's Next Round).
  - Then:
    - API-P03, API-P04;
    - DS-15 restart resume, C15-03 rendered;
    - API-E01 in full, API-I01, API-B03, API-L01, API-F01.
