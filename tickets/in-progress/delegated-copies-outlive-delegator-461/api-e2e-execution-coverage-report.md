# API/E2E Execution Coverage Report

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-007 at `bc223a8ae0` (`/software_engineering_team/code_reviewer`)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: the round stops at a `Fail` with five product or contract findings (three in code, F-1 … F-3), before the planned rewrite of the remaining baseline-failing E2E files (API-E01), the web probe rewrite (API-B03), integration (API-I01), the real-runtime case (API-L01) and the fresh-start build (API-F01). The fixes change the code those cases exercise, so running them now would be repeated after the fix round. Each is `Not Tested` below with this reason. The shared harnesses, the restore path and the composition stand-ins they need are already done.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `bc223a8ae0` (code `a54e78ccb7`); server `dist/` built from it | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server `dist/app.js` per test-owned data root; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`) | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`; every data root a fresh temp folder, removed after; no provider keys; never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | ENV-1 server + Nuxt dev frontend + headless Chrome 157.0.8103.51 (probe-owned) | Desktop viewport (probe default); private data root, free ports, process groups and browser owned and removed by the probe |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all (unit parts) | Server unit, migrations, architecture | Reused: IMP-26 (`pnpm test:unit`, server) at `a54e78ccb7` | — | Pass (reused) | IMP-26 row | `Tests  7890 passed \| 9 skipped (7899)` | Ran on the code under test; nothing changed since |
| API-R02 | — | Type gates, contracts, generated web types | Reused: IMP-23 … IMP-26 | — | Pass (reused) | IMP rows | `[typecheck] PASS` | Same |
| API-E02 | AC-001 … AC-006, AC-011, AC-015 (contract data); design Validation (DS-10 item 9: the stories, one check per §5 case) | Built servers (two nodes for §5.1, paired), real GraphQL/WebSocket/scoped MCP; every file on disk compared with the contract model after every step | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 CONTRACT_STORIES_CONTINUE=1 CONTRACT_STORIES_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch` (run 9) | ENV-1 | **Fail** | `API-E02-run9-summary.txt`, `API-E02-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt` | 5.2 `U2` `"result[0].message: expected \"Delivered message to implementation_engineer_…\", got \"Message delivered.\""`; 5.3 `O5` `"Study Group cannot be delegated to: Its definition could not be resolved: Team-local endpoint '/Teacher' was not found."`; 5.1 `S17` `"A saved Task (task_id) can't be given to an agent on another node yet"` | Clean states: 5.1 14/25, 5.2 8/9, 5.3 5/9. F-1 (O5), F-4 (U2), F-5 (S17) below. S18–S24 and O6–O8 follow from S17 and O5 (their runs never started). S10, S11 and S14 failed only on the `update_task` result shape; the test was fixed after run 9 (it now compares the Task identity and status; the shape is listed under K-10) and is not rerun yet. Every difference the test treats as known has its reason in the file (`knownDifferences`, K-1 … K-11 below) |
| API-E03 | AC-014; REQ-011; QR-003 | Built server, faithful upgrade: a first start records every migration, this migration's row removed (it is the only one this release adds), the released shapes written (`released-delegation-shape-fixtures.ts`, hand-built) | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs DRO_E2E_EVIDENCE_DIR=<dir> pnpm exec vitest run tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts --no-watch` (run 8) | ENV-1 | Pass | `API-E03-delegated-runs-own-runs-startup.txt` | `"summary": "Scanned 14; migrated 14; skipped 0; failed 0."`; `"changed": []` (second start); runList `agentRuns` without `image_maker_33f0`, `teamRuns` `["marketing_team_5a00"]` | The converted runs open with no restore (M, I, LEGACY, PEER_STARTED projections; E, P, MARKETING resume configs; the org config). The manager's view lists E only (one hop); E's lists P. P is active after start because the fixture's busy-run record names its designer (restart resume under its own root); every other run stays stopped. Runs 1–7 corrected the test (the listing rule BEH-007) and filled two gaps of the shared fixture that every real package has (each team/org package's message log; the org's mounted-team fields) |
| API-B01 | AC-007, REQ-002, REQ-004 (SCN-005), SR-045, SR-046, SR-048 | Browser: a stopped delegator's open view (agent, team, org); messaging the delegated worker; the delegator stays stopped; it starts on its own input | `pnpm -C autobyteus-web test:e2e:stopped-delegator-views --output-dir <dir>` (run 3: all cases; run 4: `--cases SDV-03`) | ENV-2 | **Fail** | `API-B01-SDV-run3-evidence.txt`, `API-B01-SDV-02-backend-excerpt.txt`, `API-B01-SDV-03-run4-evidence.txt`, `API-B01-SDV-03-backend-excerpt.txt`, `API-B01-sdv-01-worker-answered.png`, `API-B01-sdv-01-manager-started.png` | SDV-01 `"result": "Pass"`, `"rootStayedStopped": true`, `"managerStarted": true`. SDV-02 `"sentMessages": [{… "socket": "/ws/agent-team/team_sdvteam_150c_…", "target": "manager_sdvteam_150c_…"}]`, `"markerInWorkerRun": false`. SDV-03 `"AgentOrg AgentRun 'worker_sdvorg_4a11_…' has no status record."` | SDV-01 passes (agent-run view). SDV-02 is F-2; SDV-03 is F-3. Runs 1–2 found that the probe read the agent kind's activity from `agentRunCollaborationStatuses.isActive`, which is whether the root object is loaded, not the agent; the probe now reads the run's own status (observation O-1). The helper's further delegation in SDV-01 was not observed within 90 s (`"helperRunId": null`, not asserted); left for the next round |
| API-B02 | C3-06 | Browser: the agent-run view after the server closes its stream (1000) at Stop | SDV-01 in the API-B01 run 3 | ENV-2 | Pass | `API-B01-SDV-run3-evidence.txt`, `API-B02-sdv-01-after-stop.png` | `"streams": [{"closed": true, "frames": 6}, {"closed": false, "frames": 5}]` (the first stream closed at the Stop, a second one opened by the page and serving the view) | The reconnected view kept the worker row (`"workerRowKept": true`) and carried the worker's live answer |
| API-E01 | AC-001 … AC-013 (regressions) | Whole server E2E | Baseline: `cd autobyteus-server-ts && env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm exec vitest run tests/e2e --no-watch`. Then the six in-process files after their update | ENV-1 | Not Tested (rewrite in progress) | `API-E01-baseline-summary.txt`, `API-E01-inprocess-r1.txt`, `API-E01-inprocess-r2.txt`, `API-E01-project-task-boundaries-cause.txt` | Baseline `Test Files  54 failed \| 129 passed \| 71 skipped (254)`; in-process `Test Files  3 passed (3)` + the r1 lines `✓ …projects-graphql…`, `✓ …token-usage-ledger…`, `✓ …token-usage-unit-prices…` | Base `827f1e68dc` (469 merged) ran these suites green except EXC-E2E-007, so all 54 failures are under this change. Triage by cause in "API-E01 Triage" below; six files updated and passing; the others are classified and wait for the fix round |
| API-I01 | AC-005, AC-009, AC-012 | Server integration | `test:integration:prepare`, `test:integration` | — | Not Tested | — | — | Deferred to after the fix round (round notes) |
| API-B03 | AC-005, AC-012 | Existing web probes naming the removed events | per probe | — | Not Tested | — | — | Deferred to after the fix round |
| API-L01 | AC-001 (real runtime) | Real runtime, test vault | — | — | Not Tested | — | — | Deferred to after the fix round |
| API-F01 | build inputs | Fresh clone, release job's install and build | TESTING.md "Fresh-start build" | — | Not Tested | — | — | Deferred to after the fix round |

### Findings

| ID | Case / Contract Case | Expected (authority) | Observed | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-1 | API-E02 O5 (DL-3); O6 (B-5) and O7 (B-4) cannot run | Contract §3.2/§2.3 and TC-12: a delegated team whose handoff names an address outside it (`/Teacher`) is started; the `to` is kept as an external target and resolved when sent. Design-spec Change Scope (the `team-run-execution-tree-schema` row): "the handoff compiler (`collaboration-handoff-compiler.ts:73`) keeps a `to` outside a delegated team as an external target"; Validation: "a delegated team with a handoff outside the team … loads and plans" | `delegate_task(recipient_address: "/study_group", task_id: …)` by the org's CEO returns `{"delegated":false,"message":"Study Group cannot be delegated to: Its definition could not be resolved: Team-local endpoint '/Teacher' was not found."}`. `CollaborationHandoffCompiler.compileTeam` (`collaboration-handoff-compiler.ts:27`, `resolveTeamEndpoint` :97) resolves every `to` inside the team; `collaborator-entry-builder.ts:133` calls it when a delegation plans the team. Only the stored-file reader and the migration keep the external `to` | `Local Fix` (server implementation) |
| F-2 | API-B01 SDV-02 (AC-007, REQ-002, SR-048) | The user selects the delegated worker's row in a stopped team's view and messages it: only the worker gets the message; the team stays stopped | The page sends `SEND_MESSAGE` on `/ws/agent-team/<team>` with `agent_run_id` = the team's **Manager** (the coordinator); the marker is not in the worker's run; the stopped team is restored (its Manager's backend starts: `API-B01-SDV-02-backend-excerpt.txt` line 1466). Before it, the web reads the worker through the team's member projection and is refused: `AgentRun 'worker_sdvteam_150c_…' was not found in root TeamRun …` (line 1461). The child row's select goes through `onSelectTeamMember` → `runHistoryStore.selectTreeRun({ teamRunId, agentRunId })` (`composables/useWorkspaceHistorySelectionActions.ts:135`), the team-member path a delegated run no longer belongs to | `Local Fix` (web implementation) |
| F-3 | API-B01 SDV-03 (AC-007) | An org that delegated a Task can be inspected; its child rows show with their statuses | While the org has a delegated worker, `getAgentOrgRunInspection(orgRunId)` fails for the whole org: `"AgentOrg AgentRun 'worker_sdvorg_4a11_…' has no status record."` (the contract's correlation rule, `root-execution-view-dtos.ts:167`, requires a status for every identity in `taskExecutions`; the server's inspection lists the child rows without their agents' statuses). It failed for the whole 90 s window. The web reads the org through it (`services/agentOrgExecution/agentOrgRunInspection.ts`) | `Local Fix` (server implementation or the contract's rule) |
| F-4 | API-E02 U2 (IN-3) | Contract §2 (line 413): a delivered message returns `"Delivered message to <address or run ID>."` | A team member messaging a teammate by run ID gets `"Message delivered."` (the same-root exact delivery, `global-agent-run-message-router.ts:65`, returns no message; `send-message-to-tool-result-contract.ts:32` fills the default). The path is the same in base `827f1e68dc` | `Unclear`: the contract lists this step, so it is in this ticket's target behavior; but the code is unchanged from the base and the difference is one text. For the reviewer and the Solution Designer to decide fix or follow-up |
| F-5 | API-E02 S17 (DL-9, DL-10); S18 … S24 follow | Contract §5.1 S17: `delegate_task(recipient_address: "/research_team", node: "node-b", task_id: "demo-7")` is delegated | Refused: `"A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead."` (`remote-delegation.ts:43`, the same in base). REQ-009 asks for the same results and texts as today, and today this is refused. The contract's story and REQ-009 disagree; the product follows REQ-009 | `Design Impact` (the contract's story; Solution Designer) |

Observation O-1 (not a finding yet; for the reviewer): a command to a child row on a stopped agent-run view resolves the delegator's root (`agent-collaboration-stream-handler.ts:175`, `this.roots.getActive(…) ?? await this.readyRoot(…)`, which loads and registers it), so `agentRunCollaborationStatuses.isActive` (`roots.getActive(runId) !== null`) answers `true` for the stopped delegator although its agent did not start (no backend in the log; `getAgentRunResumeConfig.isActive` is `false`). The web's history poll reads that flag (`readAgentRunCollaborationStatuses`). Whether the run list then shows the stopped run as running was not checked in the rendered UI this round.

Known differences (the test lists each with its reason and matches it exactly, so none hides a new failure; for the Solution Designer as contract-model notes): K-1 the team file's `schemaVersion` (absent since before this ticket); K-2 `run_metadata.json`'s ordinary fields `preparedAt`, `preparedExpiresAt`, `applicationExecutionContext` (contract §3.2: "the ordinary files of its kind"); K-3 the ad-hoc `task.json` (REQ-005; the product keeps the base shape; `model.py:358` writes its own); K-4 a refused `delegate_task` returns `{delegated:false, message}` without a code (the message is compared in full); K-5 `llmConfig: null` (a launch keeps only the settings its model declares); K-6 the org file's ordinary member fields; K-7 the base text for a miss under a mounted team's prefix ("today's guidance", C-4); K-8 a delegated team file's `defaultLaunchSource` and members' `launchSource` (design-spec DS-10, E6 row); K-9 `"… continues with its conversation."` after a reopened Task's message (S11; base text kept); K-10 `update_task`'s result is `{task:{…}}` (its tool contract); K-11 S23/S24 rows: the model lets an agent of a stopped run make a call, a real agent acts only on input, so the test's input restores E.

### API-E01 Triage

All 54 files that failed in the baseline, by cause. "Updated, passes": changed this round and green. "Updated, not rerun": changed this round, run after the fix round. "Needs update": stale under 461, rewrite pending.

| Cause | Files | Decision | Status |
| --- | --- | --- | --- |
| In-process suites without the 461 composition (the Studio services' two delegation readers, the history services set by the composition, the Task-entries listener) | `token-usage/token-usage-ledger-graphql`, `token-usage/token-usage-unit-prices-graphql`, `projects/projects-graphql`, `run-history/recent-run-projection-graphql`, `run-history/run-projection-toolcalls-graphql`, `workspaces/archive-run-history-graphql` | `Needs Update` (test harness) | Updated, passes (`API-E01-inprocess-r1/r2.txt`) |
| Same cause, in-test "reader reconstruction" releases the composed Task service | `projects/project-task-boundaries` (`PROJECT_OPERATION_UNCONFIRMED` ← `TASK_ENTRIES_LISTENER_UNSET`, `API-E01-project-task-boundaries-cause.txt`), `agent/standalone-error-termination-lifecycle`, `memory/memory-collaboration-graphql` (also the hosted-member model) | `Needs Update` | Needs update |
| The removed Team/Org restore mutations (CR-461-008) | through the harnesses: `collaboration-root-harness.ts`, `built-studio-roots.ts` (now `restore-by-member-message.ts`); direct: `ad-hoc-task-delegation`, `delegated-copy-model-change`, `delegated-launch-config-defaults`, `delegated-team-lazy-member-activation`, `teammate-delivery-task-closure-race`, `tests/fixtures/codex-native-multi-agent-system.mjs`; still to change: `unclean-shutdown-delegated-team-restore`, `controlled-org-publication-http`, `scoped-org-history-graphql`, `team-run-config-graphql`, `append-only-message-logs-startup`, `task-agent-own-run-startup`, `team-run-v1-production-upgrade`, `stopped-run-model-config-graphql`, `agy-switch-back-built-server`, `autobyteus-anthropic-stored-config-resume`, `runtime-switch-members-built-server`, `runtime-switch-members-extended-built-server` and the gated live/runtime suites | `Needs Update` (the product's restore: a message to one of the run's own members on its view stream) | Harnesses and the first six updated, not rerun; the rest needs update |
| Hosting assumptions: delegated runs inside the delegator's tree, removed events (`task_execution_started`, `TASK_EXECUTIONS_CLOSED/REOPENED`), `collaboration_tree.json`, `TaskRoot.hostRoot` (now `delegatingRun`), `isTaskTeam`, the old prompt wording for task agents | `remote-collaboration/remote-delegation-two-server` (22), `projects/delegated-copy-model-change`, `task-existing-copy-assignment`, `task-reactivation-root-visibility`, `task-closure-root-visibility`, `collaboration-prompt-wording`, `project-change-feed`, `task-agent-several-tasks`, `delegation-forest-restore`, `collaboration-model-contract`, `agent-run-collaboration-member-file-changes`, `owner-scoped-member-file-changes`, `delegated-copy-member-contact-host`, `delegated-copy-project-folder`, `project-task-context-files-delegation`, `project-task-parts-live`, `task-copy-idle-lifetime`, `get-project-task-worker-scope`, `closed-run-attachments`, `run-history/open-task-tree-upgrade-startup`, `run-history/standalone-unreadable-tree-containment`, `runtime/team-task-event-current-contract`, `model-routing/model-routing-delegation`, `personal-settings/personal-tools-in-runs`, `runtime/runtime-switch-native-built-server`, `runtime/stopped-run-edit-root-built-server`, `agent-org-runs/stopped-org-workspace-graphql`, `app-data-migrations/collaborators-to-delegated-runs-startup`, `app-data-migrations/remove-skill-improvement-data-startup` | `Needs Update` / `Replace` per case (one-hop children from the Task entries, `CHILD_RUNS_CHANGED`, `delegatingRun`, a delegated run read as its own run) | Needs update. Each case's assertion is checked against the approved behavior when rewritten (TESTING.md Rule 9); none is classified as a product failure until then |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-E02 (5.1 S5–S9 delegated runs keep working; 5.2 U3–U5) for the scripted runtime; API-R01 | Not Proven (real runtime, API-L01, not run; API-E02 failing) | — |
| AC-002 … AC-006 | Yes | API-E02 (partly clean: see the per-state report), API-R01 | Not Proven (API-E02 Fail: F-1, F-4, F-5) | — |
| AC-007 | Yes | API-B01 SDV-01 (agent-run view: Pass), SDV-02 (team: F-2), SDV-03 (org: F-3); API-B02 | Not Proven | — |
| AC-008 … AC-013 | mixed | API-R01; API-E01 pending | Not Proven (API-E01 rewrite pending) | — |
| AC-014 | Yes | API-E03 | Proven (built-server start on hand-built data of the released shapes, second start unchanged); the migration's own tests (API-R01) cover every shape and the recovery cases | — |
| AC-015 | — | API-E02 (contract data) | Not Proven (API-E02 Fail) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 45% | 45% | API-E02 (27 of 43 states clean), API-E03, API-B01 SDV-01, API-B02 | Three code failures (F-1 … F-3); AC-001 real runtime; API-E01 | The fix round, then the deferred cases |
| Changed-boundary execution directness | 70% | 70% | Built servers, two nodes, real streams and browser | The rewrite of the baseline suites | API-E01 after the rewrite |
| Cross-boundary integration realism and mock gap | 70% | 70% | Real HTTP/WS/MCP, scripted AGY only | Real runtime | API-L01 |
| Environment, configuration, identity, and fixture fidelity | 80% | 80% | Clean env, faithful upgrade data root | Hand-built data cannot carry runtime state | — |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | 60% | API-E03 (restart resume, second start), API-B02 | Stop/idle/restart suites pending | API-E01 |
| User-surface, browser, and desktop-shell confidence | 40% | 40% | API-B01 SDV-01, API-B02 | F-2, F-3; phone layout not run | The fix round, then API-B01 in both layouts |
| Durable regression coverage quality and relevance | 60% | 60% | New: API-E02, API-E03, API-B01/B02 probes, helpers | 48 baseline files still stale | API-E01 rewrite |

- Overall post-repository confidence: 61%
- Overall final confidence: 61%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`
- Any final applicable category below `90%`: `Yes`: all seven
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1 … F-3 (product); F-4, F-5 (contract decisions); the deferred cases

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`
- Confidence gap or residual risk it addresses, and the expected gain: the rendered journeys of SCN-005 (AC-007), the C3-06 reconnect, the two-node stories and the migration start. Run this round: they found F-2 and F-3 and proved C3-06 and AC-014.
- Browser validation needed, and why or why not: yes; stream lifetime, stored/live modes and child selection are visible only in the rendered app.
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: probe-owned real stack (built server, Nuxt dev, headless Chrome), desktop layout. The phone layout (`/mobile`) was not run this round (deferred with API-B01's rerun after the fix).
- Cases proving web-equivalent behavior: API-B01, API-B02. Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None` (own ports, own data root, never `~/.autobyteus`).
- Behavior not directly proven and its confidence consequence: the phone layout; the team and org journeys past F-2 and F-3.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Representative existing data used: the hand-built released shapes of `tests/fixtures/app-data-migrations/released-delegation-shape-fixtures.ts` (contract §6 / §13; never user data), on an app-data folder where every earlier migration had completed; two gaps of the fixture that every real package has (each team/org package's message log; the org's mounted-team fields) filled in the E2E
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: API-E03 (completion through the real start, the converted runs read and listed, restart resume of the busy run, a second start byte-identical); API-R01 (the migration's tests: every shape, interruption, unreadable records, predecessors' unfinished items)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: a converted run messaged and delegated after the start (needs a usable stored runtime; the stories prove those paths on new runs)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` | Added | API-E02 | — |
| `autobyteus-server-ts/tests/fixtures/collaboration-contract/export_contract_states.py`, `contract-states.json` | Added | API-E02 | — |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` | Added | API-E03 | — |
| `autobyteus-web/tests/e2e/stopped-delegator-views-probe.mjs`, `autobyteus-web/package.json` (`test:e2e:stopped-delegator-views`) | Added | API-B01, API-B02 | — |
| `autobyteus-server-ts/tests/e2e/helpers/restore-by-member-message.ts` | Added | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/helpers/e2e-run-history-services.ts` | Added | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/helpers/studio-application-api-services.ts` | Updated | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/helpers/built-studio-roots.ts`, `collaboration-root-harness.ts` | Updated | API-E01 | — |
| `autobyteus-server-ts/tests/fixtures/codex-native-multi-agent-system.mjs` | Updated | API-E01 (gated) | — |
| `autobyteus-server-ts/tests/e2e/projects/{ad-hoc-task-delegation,delegated-copy-model-change,delegated-launch-config-defaults,delegated-team-lazy-member-activation,teammate-delivery-task-closure-race,projects-graphql}.e2e.test.ts` | Updated | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/{token-usage/token-usage-ledger-graphql,token-usage/token-usage-unit-prices-graphql,run-history/recent-run-projection-graphql,run-history/run-projection-toolcalls-graphql,workspaces/archive-run-history-graphql}.e2e.test.ts` | Updated | API-E01 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent runtime's model | Scripted AGY CLI (`agy-failure-cli.mjs`): `CALL_TOOL:{…}` calls the real tool, anything else answers `OK` | Deterministic, no provider keys (TESTING.md) | A real model's turn (AC-001 real runtime, API-L01) |
| In-process suites' delegation tree | `noDelegations()` and the readers over it | Those suites start no delegated run | None for their subjects |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built server processes and data roots (API-E02, API-E03, API-E01) | Yes | Stopped and removed in each suite's `afterAll` | Removed |
| Probe stack (server, Nuxt, Chrome, data root) | Yes | The probe's `finally` | `"dataRootRemoved": true`, processes terminated |
| `/tmp/api461/` logs and evidence copies | Yes | Kept (full logs too large to commit; excerpts committed) | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix` (implementation): F-1 (server: the handoff compiler for a delegated team), F-2 (web: selecting a team view's delegated child row), F-3 (server: the org inspection with delegated children).
- `Design Impact`: F-5 (the contract's S17 against REQ-009).
- `Unclear`: F-4 (a contract text on an unchanged path: fix or follow-up).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-001 … AC-013, AC-015 (see the proof table); AC-014 proven
- Preliminary classification and recommended owner: `Local Fix` → Implementation Engineer (F-1 … F-3); `Design Impact` → Solution Designer (F-5, and the K-1 … K-11 contract-model notes); `Unclear` (F-4)
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes: after the fix round, API/E2E reruns API-E02, API-B01 (desktop and phone), and completes API-E01, API-B03, API-I01, API-L01, API-F01
