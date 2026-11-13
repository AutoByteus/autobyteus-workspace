# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-004`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 4.
  - Started on CRR-018 (code `49f3db1047`). Paused while the Implementation Engineer tested (the user).
  - Continued on CRR-020 (code `262afbd6bb`, docs `9e0df63de6`), which adds SR-070 / DS-15.
  - Every finding found on `49f3db1047` was rechecked on `262afbd6bb` before it was counted.
- Prior round reviewed: API-REV-003 (round 3, at `da80596b0a`, `Fail`: F-11 … F-15).
- Order of work (the reviewer's list): stale tests first, CPW, API-E02, API-B01, the peer cases, C14-01, the deferred cases; then DS-15 and C15-03 (CRR-020).
- Deviations from the plan, and why:
  - **The stale rewrites found product failures** (F-16 … F-20, in the suites rule 2 made stale). Under the skill, the rewrites not yet done wait for the fix and come first in the next round. The investigation lists each file.
  - **Prior failures were rechecked before routing.** CPW (F-11 … F-13), API-E02, the desktop probe (F-14, F-15).
  - **C14-01 and DS-15 were run.** Both were asked for this round, and each is independent of the findings.
  - **Next Round:**
    - the phone cases (MSP-50 … 52, after a rebuild of the phone bundle);
    - the two-node peer cases and rule 3's peer capture (new probe and suite work);
    - API-E01 in full, API-I01, API-B03, API-L01, API-F01;
    - restart resume of a closed run (DS-15; needs a built-server restart);
    - C15-03's rendered check.
  - **The web folder was restored to base by commit `12ea5a05d6`.** That deleted this ticket's two probes. They were restored from `7442bd3bc2` and moved to rules 1 and 2. The Solution Designer's commit `2211bec711` swept in five of the staged files: the two probes and the base versions of `team-task-event-current-contract`, `agy-` and `claude-delegated-background-task`. The content is this round's; the attribution is mixed.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 4 files carry `r4`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `262afbd6bb` (server `dist/` rebuilt, `/tmp/api461/r4b-build.log`); earlier steps on `49f3db1047` (`/tmp/api461/r4-build.log`), each marked | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server per test-owned data root, or the in-process Studio server; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`) | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. No provider keys. Never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | ENV-1 server, Nuxt dev from the worktree (the web is base `3228eff74b` plus rule 2), headless Chrome, all owned by the probe | Desktop viewport |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 / R02 | unit parts, type gates | Server unit, contracts, web specs | Reused: the implementation's checks through IMP-62 (IR-015, IR-016) | — | Pass (reused) | IMP rows | as recorded there | Ran on the code under test |
| CPW | REQ-009 non-goal (texts); contract §2.3, §2.5; wording §3, §8; SR-058 … SR-060 | In-process Studio server, real roots, scoped MCP | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts --no-watch` (on `49f3db1047`) | ENV-1 | Pass | `API-E01-r4-CPW.txt` | `Tests 13 passed (13)` | F-11, F-12 and F-13 are resolved. Not rerun on `262afbd6bb`: DS-15 touches no prompt, header or mention code |
| API-E02 | AC-001 … AC-006, AC-011, AC-015 data; rule 1 peer rows; C8-09 | Built servers (two paired nodes for §5.1); files compared with the contract model after every step | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 CONTRACT_STORIES_CONTINUE=1 CONTRACT_STORIES_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch`; §5.3 again with `-t "5.3"` on `262afbd6bb` | ENV-1 | **Fail** | `API-E02-r4-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt`, `API-E02-r4-O8-org-stream-unavailable.txt` | §5.1 26/26 and §5.2 9/9 clean. §5.3 O8: `"the stream answered: ["ERROR {"code":"AGENT_ORG_STREAM_UNAVAILABLE" … has no status record`" | F-21. S17 now checks the peer row in base's shapes: M's view `remote_task_executions` with node B, and no peer status in M's `agentRunCollaborationStatuses` |
| API-E03 | AC-014; SR-058 rows at every depth on migrated data | Built server on hand-built data | `… DRO_E2E_EVIDENCE_DIR=<dir> pnpm exec vitest run tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts --no-watch` (on `49f3db1047`) | ENV-1 | Pass | `API-E03-r4-delegated-runs-own-runs-startup.txt` | `1 passed`; M's view: P nested under E, I nested under P | Its one-hop assertion was rewritten to the every-depth placement (SR-058) |
| DS-15 | SR-070 / DS-15; REQ-005; C15-03 (server half) | In-process Studio server, real roots, scoped MCP, own streams | `… pnpm exec vitest run tests/e2e/projects/closed-task-input-fence.e2e.test.ts --no-watch` (new suite, on `262afbd6bb`) | ENV-1 | Pass | `API-DS15-r4-closed-task-input-fence.txt` | `Tests 3 passed (3)` | FENCE-1 (agent) and FENCE-2 (team member): refused with `TASK_AGENT_RESOURCE_CLOSED` and base's text; not restored; no status frame in the delegator's view; delivered after the assigner continues it. FENCE-3: a deleted Task's run takes input. Restart resume and C15-03's rendered check: Next Round |
| API-C01 (C14-01) | DESIGN.md rule 3 (measure first) | In-process Studio server over HTTP; the web's own list queries | `… RUN_AGY_FAILURE_E2E=1 RUN_HISTORY_LIST_TIMING=1 HISTORY_LIST_TIMING_OUT=<file> … pnpm exec vitest run tests/e2e/run-history/history-list-read-timing.e2e.test.ts --no-watch` (new gated suite, on `262afbd6bb`) | ENV-1 | Pass (measured) | `API-C01-r4-history-list-read-timing.txt` | `ListWorkspaceRunHistory` p50 5 → 21 ms (p95 8 → 48); `ListCollaborationRootHistory` p50 7 → 41 ms (p95 9 → 113); `rowsListed` 36 + 36 | 72 delegated runs (10 agent + 2 team each) under 3 listed Teams and 3 listed Orgs. The cost is linear, about 0.4–1 ms per delegated child per read. Against the 5 s quiet poll this is not slow at this size; by extrapolation about 1 s per read at ~1,000 children under listed Orgs |
| API-B01 | AC-007, REQ-002 (every depth), SR-048, rule 2; O-1; F-9, F-14, F-15 | Browser, desktop: a stopped delegator's view (agent, team, org) | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/stopped-delegator-views-probe.mjs --output-dir <dir>` (on `262afbd6bb`; an earlier run on `49f3db1047` found only probe defects, since fixed) | ENV-2 | **Fail** | `API-B01-r4-SDV-evidence.txt`, `API-B01-r4-SDV-01-worker-listed-twice.png`, `API-B01-r4-SDV-02-helper-row-missing.png` | SDV-01 `"Pass"`, `"helperRowLive": true`, `"workerMessageSockets": ["/ws/agent/<worker>"]`. SDV-02 `"helperRunId"` set, `"rowsShown": ["worker_…"]`. SDV-03 samples `[null]` | **Agent view:** F-14 resolved, rule 2 binding works, O-1 holds. **Team view:** F-15 resolved (the second message to the team's delegated worker is delivered), but the helper's row is missing under the worker (F-14 persists). **Org:** not concluded (see F-21). **Both screenshots:** the delegated worker is listed at the top level too (F-22) |
| API-E01 (rewrites) | AC-001 … AC-013 regressions | In-process and built servers | `pnpm exec vitest run <files> --no-watch --no-file-parallelism` (clean env); batch A on `49f3db1047` and the recheck batch on `262afbd6bb` | ENV-1 | Partly Pass | `API-E01-r4-findings-F16-F20.txt`; logs `/tmp/api461/r4-batchA.log`, `/tmp/api461/r4b-recheck.log` | 5 of 13 batch-A suites pass on own-run reads; memory 8/8; API-E03 1/1; `team-task-event-current-contract` (base's file) 2/2 | Their failures include F-16 … F-20. Per file in the investigation |
| API-E01 (discovery) | — | Whole server E2E | `pnpm exec vitest run tests/e2e --no-watch` (on `49f3db1047`) | ENV-1 | Input only | `/tmp/api461/r4-E01-discovery.log` | `Test Files 47 failed \| 137 passed \| 71 skipped (255)` | The plan's input, not a result |
| API-B01 (phone) | AC-007, REQ-002 | Phone shell | MSP-50 … MSP-52 | — | Next Round | — | — | Needs the phone bundle rebuilt from this code |
| API-P01 … P04 | AC-016, AC-008 (peer), REQ-002 (peer rows), rule 3 | Two paired built-server nodes; browser with a peer | — | — | Next Round | — | — | New suite and probe work; S17 covers the peer row's server shape |
| API-E01 (full), API-I01, API-B03, API-L01, API-F01 | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

Round 3's findings, rechecked:
- F-11, F-12, F-13: resolved (CPW 13/13).
- F-14: resolved in the agent-run view; still missing in the team view.
- F-15: resolved (the team view's second message to its worker is delivered).

| ID | Case | Expected (authority) | Observed (`262afbd6bb`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-14 (still open for the team view) | API-B01 SDV-02 | REQ-002, SR-058: a run delegated by a delegated run is shown under it, at every depth, in the team's view too | The worker's `delegate_task` returns `"delegated":true` with the helper's run ID, but the stopped team's view shows only the worker (`rowsShown`). The agent-run view shows the helper (SDV-01) | `Local Fix` (web or server; the team view's rows) |
| F-16 | `delegated-launch-config-defaults` (agent, team and org roots) | REQ-009: `delegate_task` to an address keeps working from a delegated run, "with the same results and texts". At base a hosted copy's member delegated to a catalog agent and got its launch note | A delegated team's lead calling `delegate_task(recipient_address: "/dlc_badsettings_…")` gets `{"delegated":false,"message":"'/dlc_badsettings_…' is not the address of an available agent or agent team. …"}`. The root's own Manager, delegating to the same address in the same run, gets `"delegated":true` with base's note (diagnostic on `49f3db1047`) | `Local Fix` (server: the delegated team run's catalog for `delegate_task`) |
| F-17 | `task-reactivation-root-visibility` (agent, team, org; DONE and CANCELLED) | Rule 1 / rule 3, and the design's item table: `ChildRowsFeed` "emits base's started, closed and reopened events". Base's test: exactly one `task_executions_reopened` naming the worker after the assigner's reactivating message | The reactivation is accepted ("… continues with its conversation"), but the delegator's open view gets `TASK_EXECUTION_STARTED` for the worker's row, not `TASK_EXECUTIONS_REOPENED` / `task_executions_reopened` (frames recorded) | `Local Fix` (server) |
| F-18 | `task-reactivation-root-visibility` (non-assigner copy) | Contract R-8: "Anyone → a run whose Task is closed: Refused (`TASK_AGENT_RESOURCE_CLOSED`), except R-6". Base answered `CLOSED` with "Only the agent that assigned the Task can continue it" | `TASK_AGENT_RESOURCE_CONFLICT` (R-7's "it works on a different Task"). The contract does not order R-7 and R-8 | `Unclear` (the contract's order; base answered R-8) |
| F-19 | `task-existing-copy-assignment` EXC-E2E-005 and the earlier steps | REQ-009 (same texts). Base: a team run ID from another root answered `TARGET_IS_TEAM_RUN` with the coordinator's run ID | `TARGET_AGENT_RUN_NOT_ACTIVE` "No running agent has the run id …". The delegate refusal texts also differ from base in the earlier steps: "is a member of task agent team …" where base said "is not one of your task agents …" | `Unclear` (contract R-9 refuses these; REQ-009 asks for base's texts) |
| F-20 | `task-existing-copy-assignment` EXC-E2E-007 (AC-009) | Base: a follow-up Task to a copy whose saved conversation is gone is refused before any change: "… cannot be restored: it has no saved conversation to continue. Start a new delegation …" | The Task is given, then: "Task … was given to the task agent, but the message with its work was not delivered (ENOENT: no such file or directory, open '…/memory/agents/<run>/…')". A raw error with an internal path | `Local Fix` (server) |
| F-21 | API-E02 §5.3 O8 (DL-4) | Contract §5.3 O8: the dev lead delegates Task T5 and gets the result | The user's message to the org's agent on the org's stream is answered `ERROR AGENT_ORG_STREAM_UNAVAILABLE` "AgentOrg AgentRun '<dev_lead>' has no status record" (and `qa`): the org's view can't be built in that state, and the message never arrives. Same on `49f3db1047` and `262afbd6bb`. The org cases of `teammate-delivery` time out opening the org stream, and SDV-03's org row vanishes, which is probably the same cause | `Local Fix` (server: the org view's statuses) |
| F-22 | API-B01 SDV-01, SDV-02 (screenshots) | REQ-002: a delegated run "is shown under the run that delegated it, once"; DS-11 (API-E03 asserts it is not a top-level run) | A delegated worker that delegated further is listed at the top level of its workspace ("Worker Sdv… (1)") besides its row under its delegator | `Local Fix` (server list or web; owner per failure-origin review) |

Observations (not findings):
- The agent-run view shows the helper beside the worker under the Manager, not indented under the worker. Whether base's web nested a copy's copy needs base's capture (rule 3).
- `delegated-team-lazy-member-activation`: a never-started member's first status is now `offline` before `initializing`. That is DS-8's projection; it is to be compared with base's frames next round.
- `task-reactivation` QR-001: an outcome the classifier does not list (the message refused while the run was stopping), whose text exists at base. It needs analysis next round.

Contract-model notes: K-1 … K-12 as before.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-E02 §5.1, §5.2; API-R01 | Not Proven: the real runtime is API-L01 (Next Round) | — |
| AC-002 … AC-006 | Yes | API-E02 (§5.1 26/26, §5.2 9/9, §5.3 to O7) | Not Proven (F-21 at O8) | — |
| AC-007 | Yes | API-B01 SDV-01 (Pass), SDV-02 (F-14 team view), SDV-03 (F-21); phone (Next Round) | Not Proven | — |
| AC-008 | — | — | Not Proven (peer guard, Next Round) | — |
| AC-009 … AC-013 | mixed | API-R01; API-E01 (partly; F-16 … F-20) | Not Proven | — |
| AC-014 | Yes | API-E03 | Proven | — |
| AC-015 | — | API-E02 | Not Proven (F-21) | — |
| AC-016 | Yes | API-P01 (Next Round); S17 covers the peer row's shape only | Not Proven | — |
| DS-15 (SR-070) | — | DS-15 suite | Proven for the user's message (agent, team), reopen, deleted Task; restart resume Next Round | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 65% | 65% | CPW, API-E02 §5.1/5.2, API-E03, DS-15, SDV-01 | F-14, F-16 … F-22; peer cases | The fix round, API-P01 … P04 |
| Changed-boundary execution directness | 80% | 80% | Built servers, two nodes, own streams, browser | Peer handles not run | The two-node suite |
| Cross-boundary integration realism and mock gap | 70% | 70% | Real HTTP/WS/MCP; scripted AGY only | Real runtime | API-L01 |
| Environment, configuration, identity, and fixture fidelity | 85% | 85% | Clean env, fresh roots, rebuilt server | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 65% | 65% | DS-15, stopped-delegator journeys, closure races | Restart resume, stale suites | API-E01, the restart case |
| User-surface, browser, and desktop-shell confidence | 60% | 60% | SDV-01 | F-14 (team), F-22, phone | The fix round, MSP |
| Durable regression coverage quality and relevance | 65% | 65% | Every-depth API-E03, DS-15 suite, C14 measurement, strict probe, own-run helpers | Remaining stale suites | The rewrite (per file in the plan) |

- Overall post-repository confidence: 70%
- Overall final confidence: 70%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`
- Any final applicable category below `90%`: `Yes`: all seven
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-14, F-16 … F-22; the peer cases; the stale suites (Next Round)

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`
- The confidence gap it addresses, and the expected gain: the rendered stopped-delegator journeys and the stories on two nodes. Ran this round and found F-14 (team view), F-21 and F-22; the phone and the peer cases are next.
- Browser validation needed, and why or why not: yes; nesting, listing and the row binding are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack, desktop (ENV-2). No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`. Runs were paused while the Implementation Engineer tested; processes this run did not start were left untouched.
- Behavior not directly proven: the team view's nesting (F-14), the org view (F-21), the phone layout (Next Round).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome: API-E03 (on `49f3db1047`; the migration and the readers it uses are unchanged in IR-015/016), API-R01
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: the earlier migrations' startup suites (Next Round rewrite)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (the investigation's round-4 plan lists each file).
  - **Added:**
    - `projects/closed-task-input-fence` (DS-15);
    - `run-history/history-list-read-timing` (C14-01, gated `RUN_HISTORY_LIST_TIMING=1`).
  - **Shared helpers:**
    - `helpers/collaboration-root-harness.ts`: rows from base's view reads; non-own agents messaged on their own run;
    - `helpers/own-run-reads.ts`: removed-poll helpers dropped; `delegatedConversation`, `ownRunSender`.
  - **Updated suites (rule 2 reads and sends, base's names):** ad-hoc, several-tasks, parts-live, comments-live, context-files, existing-copy, reactivation, model-contract, teammate-delivery (spy on the cross-run owner), launch-defaults, lazy activation, idle lifetime, model change, worker scope, member-contact-host, closure visibility, change feed (`delegatingRun`), memory (own members only), API-E03 (every depth), the stories (S17 in base's shapes; a missing result reports the stream's answer), CPW (own-run sends), live-refresh, personal tools, skill-notice, and four runtime-switch suites (own save and Stop).
  - **Restored to base (rule 1):** `team-task-event-current-contract`, `agy-` and `claude-delegated-background-task`. The latter two still need rule 2 (API-L01).
  - **Web:**
    - `stopped-delegator-views-probe.mjs` restored, on base's reads, with the rule-2 binding check, settle time and row retry;
    - `mobile-stopped-delegator-cases.mjs` restored;
    - the `test:e2e:stopped-delegator-views` script restored.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent runtime's model | Scripted AGY CLI | Deterministic, no provider keys (TESTING.md) | A real model's turn (API-L01) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built and in-process servers, data roots, probe stacks | Yes | Each suite's `afterAll`, the probes' `finally` | Removed |
| Temporary diagnostics in `delegated-launch-config-defaults` and `task-reactivation-root-visibility` | Yes | Files restored from their backups | Removed (the output is kept as evidence) |
| `/tmp/api461/` logs, homes and probe output | Yes | Kept; excerpts committed | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix` (server): F-16, F-17, F-20, F-21.
- `Local Fix` (web or server): F-14 (team view), F-22.
- `Unclear`: F-18, F-19 (the contract's rule order and texts against REQ-009's base texts).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-001 … AC-013 and AC-015 … AC-016, except as noted in the proof table; AC-014 is proven.
- Preliminary classification and recommended owner: Implementation Engineer (Local Fix), Solution Designer (F-18, F-19), confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes:
  - Next round, first: the remaining stale rewrites (the investigation).
  - Then the phone cases, the two-node peer cases and rule 3's peer capture, restart resume (DS-15), C15-03's rendered check, and API-E01 full, API-I01, API-B03, API-L01, API-F01.
