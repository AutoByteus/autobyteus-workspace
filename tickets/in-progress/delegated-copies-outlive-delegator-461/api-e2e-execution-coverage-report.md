# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-006`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 6, on CRR-026 (code `958cb22462`, docs `a2e2d00c1b`; head `fcd7e9d541`, docs only after the code).
- Prior round reviewed: API-REV-005 (round 5, `Fail`: F-19b, F-23 … F-36, K-13).
- Order of work, following the reviewer's list:
  1. the rechecks of round 5;
  2. the Team tab;
  3. the decision-only expectation changes;
  4. the Next Round list.
- Deviations from the plan, and why:
  - **The rechecks and the stale rewrites found product failures again** (F-37, F-38, F-42, F-44, F-46; candidates F-43, F-45; Unclear F-39, F-40, F-41). Under the agreed rule, the rewrites not yet done wait for the fix. They are listed per file in the investigation, each with its cause.
  - **Not run this round (Next Round, after the fix):**
    - API-E01 in full;
    - API-F01 (fresh-start build);
    - API-B03 (web probes);
    - API-P03 (peer rows rendered), API-P04 (rule 3's peer capture);
    - DS-15 restart resume, as an extension of API-E03's restart-resume data;
    - C15-03 rendered.
  - **Five suites failed again when run alone after a loaded batch** (DCF-02, MR-02, EX-03, lazy Org idle, idle-lifetime): not load. Their causes are listed. One (launch-config-defaults) passed alone: it was load.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 6 files carry `r6`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `958cb22462` (server `dist/` rebuilt, `/tmp/api461/r6-build.log`) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server per test-owned data root, or the in-process Studio server; scripted AGY CLI | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. Never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | Probe-owned stack: built server, Nuxt dev, headless Chrome | Desktop viewport |
| ENV-3 | as ENV-1; phone bundle rebuilt from it (`/tmp/api461/r6-mobile-build.log`) | as ENV-1 | Probe nodes, production phone bundle at `/mobile`, headless Chrome 390×844 | Owned by the probe |
| ENV-4 | as ENV-1 | as ENV-1 | Two to five built-server nodes through capturing proxies | Owned by the suite |
| ENV-5 | as ENV-1 | as ENV-1 | In-process server; the delegator on the scripted AGY CLI; the delegated runs on the AutoByteus runtime over DeepSeek (`deepseek-v4-flash`) | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (read-only; key values never printed); `RUN_DEEPSEEK_E2E=1` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 / R02 | unit parts, type gates | Server unit, contracts, web specs | Reused: IR-019/020 checks IMP-68 … IMP-73 | — | Pass (reused) | IMP rows | as recorded there | Ran on the code under test. The server typecheck after this round's test edits: PASS at baseline (1012) |
| Team tab (TT-1, TT-2) | SR-072, SR-074 (F-26) | In-process server, real roots, scoped MCP, view streams | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/team-tab-subtree-messages.e2e.test.ts --no-watch` (new suite; batch R6-A) | ENV-1 | Pass | `API-E01-r6-team-tab-TT.txt` | `✓ … TT-1 / TT-2`; `mLive: 1`; `wLiveOutside: 0`; `mTab` has both markers, `wTab` lacks `OUTSIDE-W` | TT-1: W → H (two hops below M) in M's Team tab live and after a reload, once. TT-2: H ↔ M (W's own delegator) in W's tab neither live nor after a reload; in M's it shows |
| Rechecks F-19b, F-25, F-27, F-29, F-31 | SR-071, CR-461-048, SR-072, CR-461-051 | In-process and built servers | batch R6-A (`/tmp/api461/r6-batchA.log`) | ENV-1 | Pass | `/tmp/api461/r6-batchA.log` | EXC-005 `✓`; SID-2 `✓`; RS-03 `✓`; SCP-E2E-006 `✓`; SRE-01..03 `✓` | F-25: the copy is kept and its file converted (SID-2 now leaves that one converted file out of the byte-identical set). F-31: one-hop inheritance (SRE). F-27: the copy's own runtime switch (RS-03) |
| API-B01 phone | AC-007, REQ-002 (once) | Phone shell | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/mobile-shell-probe.mjs --output-dir=<dir> --cases=MSP-50,MSP-51,MSP-52` | ENV-3 | **Fail** | `API-B01-r6-phone-MSP-50-52-evidence.txt`, `API-B01-r6-phone-MSP-51-run-screen-not-open.png`, `API-B01-r6-phone-MSP-52-worker-answered.png` | MSP-50, MSP-52 `Pass`, `workerTopLevelRows: []` before and after; MSP-51 `rowKey team:…/agent:worker_…`, `screenState: null` | F-32 (per SR-073: open the team first), F-33, F-34 resolved. F-44 new |
| API-B01 desktop | AC-007; regression after CR-461-053's list owner | Browser, desktop | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/stopped-delegator-views-probe.mjs --output-dir <dir>`; then `--cases SDV-01` three times | ENV-2 | **Fail** (SDV-01) | `API-B01-r6-SDV-evidence.txt`, `API-B01-r6-SDV-01-message-lost.png`, `API-B01-r6-SDV-04-row-back.png` | SDV-02/03/04 `Pass`; SDV-01 `sentMessages: []`, `markerInWorkerRun: false`; alone 3 of 3 fail | F-46 |
| API-E02 | AC-001 … AC-006, AC-011, AC-015; SR-072 (K-13, S10, U11); T-5 (F-30) | Built servers, two nodes for §5.1 | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 CONTRACT_STORIES_CONTINUE=1 CONTRACT_STORIES_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | **Fail** (K-14, F-45) | `API-E02-r6-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt` | §5.2 `12 of 12`; §5.3 `9 of 9`; §5.1 `26 of 28`, differ `S26` (driver), `S27` | K-13 resolved (S23/S24 before S16). S10's refused assigner message matches. U11 matches (F-24 as base). S26: refused (F-30 resolved); the driver expected the run ID, the server names the address (T-5 "names them"): driver updated. S27: K-14 and F-45 |
| API-P01, API-P02 | AC-016, AC-008 (peer), F-35, F-36 | Two to five built-server nodes | as round 5 | ENV-4 | Pass | `API-P01-P02-r6-peer-suite.txt` | `Tests 44 passed (44)` | F-35, F-36 resolved |
| API-L01 | AC-001 (real runtime) | In-process server; real inference for the delegated runs | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_DEEPSEEK_E2E=1 RUN_AGY_FAILURE_E2E=1 OUTLIVE_LIVE_EVIDENCE=<file> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/delegated-run-outlives-delegator-live.e2e.test.ts --no-watch` (new gated suite) | ENV-5 | Pass | `API-L01-r6-live-deepseek.txt` | `Tests 2 passed (2)`; `finishedAfterMs` 26313 (agent), 15100 (team); statuses only `running`; codeword at the end of the real answer | AC-001's real-runtime part, proven on a real model for an Agent child and a Team child |
| API-I01 | AC-005, AC-009, AC-012 (integration) | Server integration | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER pnpm test:integration:prepare && pnpm test:integration --reporter=verbose` | ENV-1 | Pass (in scope) | `API-I01-r6-integration.txt` | `Tests 3 failed \| 480 passed \| 69 skipped`; the 3 in `file-system-watcher` | The 3 are FU-021 (known flaky watcher timing, not this ticket): out of scope |
| API-E01 (rewrites and rechecks) | AC-001 … AC-013 regressions | In-process and built servers | batches R6-A, R6-A2, R6-B (34 files), R6-C (`--no-file-parallelism --reporter=verbose`) | ENV-1 | **Fail** | `API-E01-r6-F37-*.txt`, `-F38-*`, `-F39-*`, `-F40-*`, `-F41-F43-*`, `-F42-*`, `-project-task-boundaries-cause.txt`; logs `/tmp/api461/r6-batch{A,A2,B,C}.log` | per finding | Pass now: closure visibility 3/3, change feed 7/7, CPW 14/14, DS-15 3/3, API-E03, model contract, DCM-004/007/009/010, runtime-switch members, live refresh, package edit, context files, node locality, launch-config-defaults (alone) |
| API-E01 full, API-F01, API-B03, API-P03, API-P04, DS-15 restart, C15-03 rendered | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

Round 5's findings, rechecked on `958cb22462`:
- **Resolved:**
  - F-19b, F-24 (U11, TKD's deleted-Task step), F-25, F-27, F-28;
  - F-29, F-30 (S26), F-31, F-32 (per SR-073), F-33, F-34, F-35, F-36;
  - K-13.
- **F-23** follows SR-072 (refused while DONE; continues after IN_PROGRESS): the reactivation step 11 passes.
- **F-26** is covered by the Team tab TT-1 / TT-2 (pass). The closure-race TDR-001 refused message is not shown.

| ID | Case | Expected (authority) | Observed (`958cb22462`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-37 | `task-reactivation-root-visibility` step 12, agent, team and org (`API-E01-r6-F37-deleted-task-message.txt`) | REQ-009 and SR-071's rule (refusals keep base's texts); contract R-9 names no text. Base: the assigner's message to a deleted Task's run → `TASK_NOT_FOUND`, "The Task was deleted, so its task agent cannot continue." | `TARGET_AGENT_RUN_NOT_ACTIVE`, "No running agent has the run id '…', so the message was not sent. …" (SR-072 found this text false for a run that exists) | `Local Fix` (server text) |
| F-38 | TKD-AGY-001 (`API-E01-r6-F38-unknown-task-shape.txt`) | REQ-009, base: `delegate_task` with an unknown Task key → `{error:{code:"TASK_DELEGATION_ERROR", message:"Task '…' must identify exactly one current node-local Task (found 0)."}}` | `{delegated:false, message:"<the same text>"}` | `Local Fix` (server result shape) |
| F-39 | DCM-002, 005, 006, 008 (soft); EX-03 (`API-E01-r6-F39-team-level-choice.txt`) | Base: a team-level choice on a stopped delegated team reaches the members that follow the team (DCM-002 "a Team-level choice reaches its members that follow the Team"); the design: "a member with its own launch keeps it after the team Settings save" | The lead and a never-started follower resume on the old model. The team save changes the team default only (`team-run-selection-mutator.ts`, base's rule for a user-started team); base's `followsTeam` path for delegated teams is removed | `Unclear` (whether a delegated team's followers take its team-level choice) |
| F-40 | `delegated-copy-member-contact-host` (soft) (`API-E01-r6-F40-own-name-list.txt`) | REQ-009 non-goal "no change to what an agent reads": base's `list_available_agents` of a hosted copy listed its own catalog name (a solo copy's `/dcm_solo…`, the team's `/dcm_squad…`) | Left out (CM-1 refuses delegating to it, CR-461-050, as base did) | `Unclear` (list the run's own name, as base, or not) |
| F-41 | `delegated-team-lazy-member-activation` DTL-003, Org (soft) (`API-E01-r6-F41-F43-org-copy.txt`) | The delegator's view in the agent and team roots carries a delegated member's conversation error card (its failed start) | The Org view carries its `error` status (with its message) but no error card | `Unclear` (all views, or none under rule 2) |
| F-42 | `teammate-delivery-task-closure-race` TDR-002, agent, team, org (`API-E01-r6-F42-commit-conflict.txt`) | DEC-005 (agent-input-delivery REQ-012, AC-012): a message waiting for the receiver's log lock when the receiver's Task closes gets the same readable refusal as a closure found before the save, `TASK_AGENT_RESOURCE_CLOSED` | `TEAM_MESSAGE_COMMIT_CONFLICT`, "Message append conflicts with current root state." | `Local Fix` (server) |
| F-43 | `delegated-team-lazy-member-activation` DTL-005, Org path (`API-E01-r6-F41-F43-org-copy.txt`) | REQ-002: a quiet delegated run is shut down after the idle grace; base's test expected it after a member's failed start | After the writer's failed start (`error`), the Org's delegated team is never shut down after the grace (twice, also alone) | `Local Fix` candidate (server idle shutdown with a member in error) |
| F-44 | API-B01 phone MSP-51 | AC-007, REQ-002 (phone): the user opens the stopped team, then its delegated worker's row, and messages it | After opening the team its worker row shows (SR-073), but tapping it opens no run screen (`screenState: null`, no alert). The Org's row opens (CR-461-053) | `Local Fix` (web, phone opening of a team's delegated row) |
| F-45 | API-E02 §5.1 S27 | Contract model: a run's Stop records `terminatedAt` on its history row | The research agent's own Stop leaves its row's `terminatedAt` null (`run_history_index.json`) | `Local Fix` candidate (or a model gap; failure-origin review) |
| F-46 | API-B01 desktop SDV-01 (4 of 4 on this code; round 5 passed) (`API-B01-r6-SDV-evidence.txt`) | AC-007, C3-06: after the delegator's Stop with its agent-run view open, the view reconnects and the user's message to the worker (and then to the Manager) is sent and answered live | The message is not sent: no outgoing frame (`sentMessages: []`), the composer clears, the marker never reaches the worker (runs 1, 3, full run); in run 2 the worker answered, then the Manager did not start on its own message | `Local Fix` (web, desktop agent-run view after the reconnect) |
| K-14 | API-E02 §5.1 S27 | Model: after deleting M, the ad-hoc Task T7 (no Project, delegated by M in S17) stays | It is removed with M, as task-keys AC-021 removes a deleted chat's Temp tasks (base) | Contract model (Solution Designer) |

Observations (not findings):
- **TDR-001 (closure during the write).** The refused message is written to the receiving team's own log, because the write was in progress when the Task closed; it is not shown in the Team tab.
- **Repeatable, cause not yet classified (Next Round):**
  - MR-02: routed members of a delegated team never start on Grok;
  - DCF-02: a checker's capsule.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01 (real runtime, Agent and Team child); API-E02 §5.1, §5.2 | Proven | — |
| AC-002 … AC-006 | Yes | API-E02 (§5.2 12/12, §5.3 9/9, §5.1 26/28); Team tab; API-E01 | Not Proven (F-37, F-42; K-14, F-45 at S27) | — |
| AC-007 | Yes | Desktop SDV-02/03/04 (Pass), SDV-01 (Fail); phone MSP-50, MSP-52 (Pass), MSP-51 (Fail) | Not Proven (F-44, F-46) | — |
| AC-008 | — | RC-44 (peer); S26 (local) | Proven | — |
| AC-009 … AC-013 | mixed | API-E01; CPW; EXC; DCM; I01 | Not Proven (F-38, F-39, F-40, F-43) | — |
| AC-014 | Yes | API-E03; SID-2 (F-25 resolved) | Proven for the 461 migration's own data; the earlier migrations' startup suites are stale tests (Next Round) | — |
| AC-015 | — | API-E02 | Not Proven (§5.1 S27) | — |
| AC-016 | Yes | RC-43 | Proven (scripted runtime) | — |
| DS-15 (SR-070) | — | DS-15 suite 3/3 | Proven for the user's message; restart resume Next Round | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 78% | 78% | AC-001 real runtime, AC-008, AC-016 proven; stories 47/49; Team tab; peer 44/44 | F-37 … F-45, K-14 | The fix round; the Unclear decisions |
| Changed-boundary execution directness | 88% | 88% | Built servers, peers, own streams, browser desktop and phone, real inference | Peer rows not rendered | API-P03 |
| Cross-boundary integration realism and mock gap | 82% | 82% | A real model's turn across the delegator's Stop; real HTTP/WS/MCP | One provider, one runtime live | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 85% | Clean env, fresh roots, rebuilt server and phone bundle, the test vault | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 72% | 72% | Closure races, peer offline, idle and Stop journeys | F-42, F-43; DS-15 restart | The fix; the restart case |
| User-surface, browser, and desktop-shell confidence | 65% | 65% | Phone MSP-50/52, desktop SDV-02/03/04 | F-44, F-46 | The fix, MSP-51, SDV-01 |
| Durable regression coverage quality and relevance | 76% | 76% | New Team tab and AC-001 live suites; the decided expectations encoded; the phone "once" check | Remaining stale suites (listed with causes) | The rewrite |

- Overall post-repository confidence: 78%
- Overall final confidence: 78%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`
- Any final applicable category below `90%`: `Yes`: all seven
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-37 … F-46, K-14; the stale suites; the Next Round cases

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`, `Live provider`
- The confidence gap it addresses, and the expected gain:
  - the real runtime for AC-001 (done: proven);
  - the phone journeys (F-44);
  - the peer cases (done).
- Browser validation needed, and why or why not: yes. The phone's opening of a delegated row is visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack, desktop (ENV-2) and phone (ENV-3). No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`. Processes this run did not start were left untouched.
- Behavior not directly proven:
  - the phone's team row opening (F-44);
  - the desktop agent-run view's send after the reconnect (F-46);
  - peer rows rendered (API-P03).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome:
  - API-E03 (pass, with restart resume of P);
  - SID-2 (the 461 migration registered last keeps the improver's copy and converts its file, F-25 resolved).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk:
  - the earlier migrations' startup suites assert pre-461 end states. They are stale tests (Next Round, listed with causes: `collaboration/` log path, `taskExecutions`, the host tree);
  - DS-15 restart resume.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Added:**
    - `projects/team-tab-subtree-messages` (SR-074 TT-1 / TT-2);
    - `projects/delegated-run-outlives-delegator-live` (AC-001, gated `RUN_DEEPSEEK_E2E`, test vault).
  - **Decision-only expectation changes:**
    - SID-2: the converted copy's file, F-25;
    - reactivation step 11: F-23;
    - RS-03: F-27;
    - SRE-01/02: F-31, with the host's next input on its own stream;
    - peer RC-25 and RC-33 as hard checks: F-35, F-36;
    - EXC-005 hard: F-19b;
    - TDR-001: never shown;
    - MSP-51 opens the team first: SR-073;
    - the stories: regenerated fixture, S10, S23/S24, U11, S26's naming.
  - **Stale, rewritten:**
    - DCM: each run's own file; DCM-003 as each run's own save, SR-064; the nested copy keeps running, REQ-001; F-39 soft;
    - member-contact-host: TC-12's own-team listing; F-40 soft;
    - closure visibility: the agent root's own file;
    - QR-001: the `COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES` ordering;
    - lazy DTL-007: the copy's own Stop; F-41 soft and diagnostics;
    - TDR-002: the receiver's own log lock;
    - TDR-003: the Team tab rule;
    - change feed: stop before delete, SR-072 F-30;
    - reactivation step 12: soft F-37 with the answer recorded;
    - the phone cases: the node's own reads on failure, "once" after opening.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The delegator's model | Scripted AGY CLI | Deterministic tool calls (TESTING.md) | — |
| The delegated runs' model (API-L01) | Real: DeepSeek through the AutoByteus runtime, key from the test vault | — | One provider |
| Every other runtime model | Scripted AGY CLI | Deterministic, no keys | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built and in-process servers, data roots, probe stacks, peer nodes | Yes | Each suite's `afterAll`, the probes' `finally` | Removed |
| A temporary `console.error` of the cause in `project-task-tool-manifest.ts` (the `project-task-boundaries` diagnosis) | Yes | Restored from its backup | Removed; `git status` clean |
| `/tmp/api461/` logs, homes and probe output | Yes | Kept; excerpts committed. Peer receipts and node logs (peer signatures) stay in `/tmp` | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix`:
  - server: F-37, F-38, F-42, F-43 (candidate), F-45 (candidate);
  - web: F-44 (phone), F-46 (desktop agent-run view).
- `Unclear`: F-39, F-40, F-41.
- Contract model (Solution Designer): K-14.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: as the proof table. AC-001 (with the real runtime), AC-008 and AC-016 are proven; AC-014 for the 461 migration.
- Preliminary classification and recommended owner:
  - Implementation Engineer: the Local Fix findings;
  - Solution Designer: F-39, F-40, F-41 and K-14;
  - each confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round:
  - First: the remaining stale rewrites (the investigation lists each file with its cause).
  - Then:
    - the Next Round cases;
    - API-E01 in full and API-F01 on the fixed code.
