# API/E2E Execution Coverage Report — list-running-agents (autobyteus-492)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/list-running-agents/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/list-running-agents/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `tickets/in-progress/list-running-agents/api-e2e-test-progress.md`
- Round and trigger: round 1; code reviewer's CRR-002 Pass on IR-002 (code `deacacf948` + `5f89ecbdf5`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - The contract-stories fixture and suite needed two test-side fixes found by running them (API-08): U9's message ID and a missing O9 driver (see the API-08 rows).
  - The MCP route integration test needed the new `node` field (API-04), found by the whole integration run.
  - API-06 RC-47 and API-08 §5.2/§5.3 were rerun alone after their fixes (TESTING.md: rerun the failed test, not the whole suite), with the cases they depend on.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/evidence/` (the handoff names the commit that holds it)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | code `deacacf948` + `5f89ecbdf5` (no `src` change after); tests as committed in `9fc0df5db3`, `ec66ee7d01` (each run's row names its tests' state) | macOS 26 (Darwin 25.5.0), arm64 | Node 22.23.1; `autobyteus-server-ts/dist` built from this worktree (`pnpm -C autobyteus-server-ts build`, exit 0); Brief Studio importable package (`test:integration:prepare`) | Scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`, `RUN_AGY_FAILURE_E2E=1`), no provider keys; `env -i PATH HOME=<fresh temp> TMPDIR` for E2E; test-owned data roots, ports and HOMEs; the machine was shared with other worktrees' runs (load average 48 … 170, `fseventsd` 110–184 % CPU) |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | all (unit level: AC-001…AC-008, G-1, rows 3/8/9/13) | server unit suites | Reused: IMP-03, IMP-04, IMP-06, IMP-09 | — | Pass (reused) | implementation handoff § Checks Run | — | `git diff --name-only deacacf948 5f89ecbdf5 -- autobyteus-server-ts/src` = two comment-only lines, which IMP-09 reran; no `src` change since. My changes are E2E/integration test files and the contract fixture, which no unit test reads. IMP-03's 6 failures are FU-001 … FU-003 (outside the change). |
| API-02 | — | web typecheck | Reused: IMP-02 | — | Pass (reused) | `IMP-02-web-typecheck.log` | — | Same `src`; the web typecheck does not compile server E2E/integration test files. |
| API-03 | — | server typecheck (`src` + every test file, incl. my changed tests) | `pnpm -C autobyteus-server-ts typecheck` at `ec66ee7d01` | ENV-1 | Pass | `API-03-server-typecheck.log` | `production errors: 0; test-file errors: 1009 in 315 files (baseline 1009 in 315 files)`, `[typecheck] PASS` | — |
| API-04 | tool exposure (TESTING.md), REQ-009 schema | whole server integration suite | `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass for the change (after a stale-test fix); 16 environment failures | `API-04-excerpt.log`, `API-04-server-integration.log`, `API-04-fsevents-latency-probe.mjs` | `Tests  17 failed \| 489 passed \| 69 skipped (575)`; rerun of the fixed file `Tests  14 passed (14)`; FSEvents `{"eventMs":4801,…},{"eventMs":null,…},{"eventMs":null,"closeMs":1781}` | 1 failure was this ticket's: `agent-tools-mcp-routes.integration.test.ts` listed `send_message_to`'s fields without the new `node` (`expected [ 'content', 'message_type', …(4) ] to deeply equal [ …(3) ]`) → updated to the REQ-009 contract (asserts `node` and its description), rerun 14/14. The other 16 are `package-auto-refresh` (12), `file-system-watcher` (4) and `studio-server-http-contract`'s `afterAll` (`fastify.close()` 10 s hook timeout): all wait on macOS FSEvents. Cause measured right after (TESTING.md § File watching): `fseventsd` 184 % CPU, first event after 4.8 s, the next two never within 20 s, `close()` blocking 1.8 s. None of these files reaches the changed code. See API-04b. |
| API-04b | — | the three FSEvents-dependent integration files alone | not run: FSEvents measured right before (`fsevents-latency-probe`, 13:31 UTC): no event within 20 s in 3 of 3 tries, `close()` 3.2 s, `fseventsd` 93 % CPU, load 78 | ENV-1 | Not Tested | `API-05-excerpt.log` (FSEvents line) | `{"eventMs":null,"closeMs":3198},{"eventMs":null,…},{"eventMs":null,…}` | A rerun cannot pass while macOS delivers no file events, whatever the code. None of the three files reaches code this ticket changed; the cause is recorded (TESTING.md § File watching) and the test-side bounds are FU-005. |
| API-05 | tool exposure (TESTING.md), all | whole ungated server E2E suite (gated suites skip) | `env -i PATH="$PATH" HOME=<fresh temp> TMPDIR="$TMPDIR" pnpm test:e2e`; reruns of the failed files: API-05b (11 files, interrupted by the app restart after 3), API-05d (the other 8), E-008 alone and with a temporary diagnostic (API-05c) | ENV-1 (`ec66ee7d01`) | Pass for the change; environment failures outside it remain | `API-05-excerpt.log`, `API-05-server-e2e.log.gz`, `API-05c-e008-cause.log`, `API-05-node-stop-timing-probe.mjs`, `API-05-diag-fixture-node.mjs.txt` | Whole run `Tests  10 failed \| 554 passed \| 708 skipped (1272)`; after reruns 4 files still failing, each on a 5 s test timeout, a 10 s close hook, or an FSEvents wait (`Timed out waiting for FILE_SYSTEM_CHANGE`); E-008 diagnostic `DIAG-FASTIFY-CLOSE 6233ms` … `1244ms`, `✓ E-008 …` | No failure is in a suite that reaches the changed code, and none names this change's behaviour or routes. Causes, per file: `Test timed out in 5000ms` / `Hook timed out in 10000ms` at load average 120–170 (`node-access-model`, `request-origin-and-phone-routes`, `integrations-graphql`, `provider-secret-lifecycle-graphql`: all four passed in API-05d; `package-personal-settings` passed in API-05b; `request-origin`'s 20-vs-14 refusal-line count followed its timed-out AC-002 in the same file and passed in API-05d; `test-vault-selection` runs the secret suites as a child and failed when that child hit a 5 s timeout); FSEvents waits (`file-explorer-websocket-lifecycle`, `agent-package-definitions-live-refresh`, `agent-semantic-memory` SM-01, whose definition reads wait for the watcher settle); `grok-build-runtime-replay` (first a version probe timeout, then its `afterAll` close hook); E-008, where the fixture node's in-process `fastify.close()` took 1.2–6.2 s per stop against its 10 s SIGKILL bound and exited 0 every time (a fresh node stops in 1.5–3.7 s), and the change adds nothing to the close path (`git diff … | grep onClose\|close(\|watch…` empty). Follow-up FU-005. |
| API-06 | AC-001 … AC-008, AC-009 (tool texts), REQ-012, QR-001, QR-002, QR-003, DS-006, rows 3, 4, 7, 8, 9, 11, 13, 14, G-1 (DEC-014), RU-1 … RU-5 | two built servers (alpha, beta) through capturing proxies, plus gamma/delta/epsilon (RC-27) and zeta (RC-49); scripted AGY agents calling the real tools over Agent Tools MCP; GraphQL, run-view WebSockets, the signed peer routes | Run 1 (whole suite): `env -i PATH="$PATH" HOME=<fresh temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs REMOTE_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch`. RC-47 rerun after its test fix: the same plus `-t 'RC-(0[1-9]\|1[01]\|47) '` | ENV-1 (tests as in `9fc0df5db3`) | Pass | `API-06-run1/API-06-run1-vitest.log`, `API-06-run1/API-06-receipt.json`, `API-06-run1/remote-two-server-{beta,zeta}-server.log`, `API-06-run1/remote-two-server-alpha-server.log.gz`; `API-06-rc47/API-06-rc47-vitest.log`, `API-06-rc47/API-06-rc47-receipt.json` | Run 1: `Tests  1 failed \| 48 passed (49)` (the failure is RC-47's unknown-address assertion, see Notes); rerun: `✓ RC-47 492 AC-001/002/003/005/007/008 …`, `Tests  12 passed \| 37 skipped (49)`. Receipts: `cases["RC-48"].wire.answer.agents` (3 entries, no `node`), `cases["RC-48"].gate` (per route `unsigned` 401 `NODE_CREDENTIAL_REQUIRED`, `ownerBearer` 403 `NODE_ROUTE_NOT_PERMITTED`, `wrongSecret` and `notPaired` 401 `NODE_CREDENTIAL_INVALID`, `wrongTo` 200 `PEER_IDENTITY_MISMATCH`), `cases["RC-49"].closed` (6 senders, each "This task agent's Task is closed. …"), `cases["RC-49"].fromZeta.message` `Delivered message to publisher_… on node "beta-node".`, `cases["RC-47"].g1` (`live`/`stored`: unrelated `false`, related `true`), `cases["RC-20"].counts` (`"/rest/remote/run-messages": 10`, `"/rest/remote/running-agents": 3`, `"runningAgentsEntries": 6`); `cleanup` `{"rootRemoved": true, "serversStopped": true, "leftoverAgy": [], "errors": []}` | All 48 other cases passed in run 1, including the rewritten RC-06, RC-08, RC-22 and the extended RC-20, RC-27, RC-28, RC-48, RC-49, and every pre-existing case after them (RC-12, RC-13 restarts, RC-35, RC-26 with the new beta definition). RC-47 failed on my assertion that an unknown address returns `agents: []`: the platform tool-result rule (`autobyteus-ts/src/tools/tool-result-json.ts`: "`[]` … left out … An absent field means 'none'", autobyteus-260) gives the agent `{}`. The test was wrong, not the product; fixed to assert `{}` and rerun with the cases that create its runs. Everything RC-47 asserted before that line had already passed in run 1. |
| API-07 | REQ-008, REQ-010, REQ-012, AC-008 (local, task agent of another Task) | in-process Studio server over real HTTP/WS/GraphQL, Agent Tools MCP scoped to each run, scripted AGY | `env -i PATH HOME=<fresh temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts --no-watch` | ENV-1 (tests as in `9fc0df5db3`) | Pass | `API-07-cpw-e2e.log` | `✓ CPW-R2 Agent root: a task agent messaging a running agent of a different Task is delivered (492 AC-008)`, `Tests  14 passed (14)` | CPW-R1 and CPW-R3 M-11 now assert the new not-running text; CPW-R2 asserts `accepted: true` and that the other Task's task agent receives the message. |
| API-08 | REQ-008, REQ-010, REQ-011 (CM-13: U9 delivered, S27 not-running text), AC-008 | built servers, contract model's stories, every file compared after every step | Run 1: `env -i PATH HOME=<fresh temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… CONTRACT_STORIES_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch`; run b `-t '§5\.[23] '`; run c `-t '§5\.3 '` | ENV-1 (run 1: fixture of `deacacf948`; runs b, c: `ec66ee7d01`'s fixture; run c also its O9 driver) | Pass | `API-08-run1/API-08-run1-vitest.log`, `API-08-run1/contract-stories-5.1.json`, `API-08-run1/contract-stories-5.2.json`; `API-08-reruns/API-08-reruns-vitest.log`, `API-08-reruns/API-08b-contract-stories-5.2.json`, `API-08-reruns/API-08c-contract-stories-5.3.json` | Run 1 `✓ §5.1 S0 … S27`; run b `✓ §5.2 U0 … U11`; run c `✓ §5.3 O0 … O9` | U9 timing (handoff risk): this suite's idle grace is 1 h, and U9 is delivered to `image_maker_44a1` (§5.2 passes). Two test-side defects found and fixed (`ec66ee7d01`): (1) run 1 §5.2 U9: `"Collect onboarding examples …" does not match "Collect onboarding ecollabmsg_qgULtmT…amples …"`. The model gave U9's now-delivered message the refused-step placeholder ID `"x"`, and the suite binds model IDs to server IDs inside strings. Renamed to `collabmsg_U9` in the 461 model's `stories.py`; the fixture was regenerated (`--check`: "matches the model"); only U9…U11's carried log lines change. (2) run b §5.3: `no driver for O9`. The base fixture already differed from the base model (`--check` on `origin/personal` → MISMATCH): 461's `7163160ece` added O9 to the model without regenerating the fixture. This ticket's regeneration brought O9 in, so the suite got its O9 driver. Run 1's §5.3 failure (`Antigravity model discovery timed out`, the 15 s `MODELS_TIMEOUT_MS`, at O0 before any collaboration step, load average ~48–61) did not recur in runs b and c. §5.1's states are unchanged by the U9 rename (only §5.2 states differ). |
| API-09 | tool exposure | gated suites' exact tool lists | `grep -rln "toolInstances\|enabledTools\|requestedToolNames\|tools/list\|list_available_agents"` over `autobyteus-server-ts/tests/{e2e,integration}`, `autobyteus-web/tests`, `test-support`; read each hit | — | Pass | — (search, recorded here) | No gated test asserts an exact tool list that the opt-in `list_running_agents` would change; `send_message_to`'s exact field list was asserted only in `agent-tools-mcp-routes.integration.test.ts` (fixed, API-04) | `codex-standalone-send-message-global-routing.e2e.test.ts` (gated on Codex) still holds by reading: it asserts delivery between two standalone runs and `stringContaining("No running agent has the run id '<id>'")`, a prefix the new text keeps. |
| API-10 | — | tracked imports | `python3 scripts/check_repository_artifact_hygiene.py --only tracked-imports` | ENV-1 (`ec66ee7d01`) | Pass | `API-10-tracked-imports.log` | `Tracked-import check passed. Tracked files scanned: 98546` | — |
| API-12 | build (fresh start) | fresh clone, the desktop job's install and TypeScript steps | `git clone --no-local <worktree> /tmp/api492/fresh`, `git checkout ec66ee7d01`, `pnpm install --frozen-lockfile`, `cd autobyteus-web && pnpm typecheck && pnpm prepare-server` | ENV-1 | Pass | `API-12-fresh-start.log`, `API-12-fresh-start-full.log.gz` | `[typecheck] production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`, `[typecheck] PASS`, `Server files prepared successfully!` | Only `autobyteus-server-ts/typecheck-baseline.json` matches TESTING.md's build-input list, and no release workflow reads it; the web typecheck is the desktop job's step that compiles server source. Guards, `generate:electron`, packaging, signing and the other operating systems were not run: they read no file this ticket changed. The clone was removed. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-06 RC-47 (exact set of alpha's running roots a person started: 4 Agent, 2 Team; caller, Org, task agents, stopped root, members left out; `Delegator` without the tool has none), RC-48 (beta: exactly Bystander, PM, Studio Team; delegated runs and the stopped root left out); API-01 | Proven | — |
| AC-002 | Yes | API-06 RC-47, RC-48 (each entry `toEqual` exactly the REQ-002 fields: `agent_run_id`/`workspace`, Team `team_coordinator_agent_run_id` = coordinator, `workspace` = coordinator's folder, `project` only under a Project, no title/content); RC-20 (every captured running-agents answer has only those fields) | Proven | — |
| AC-003 | No | API-06 RC-47 (`address: /remote_squad` → the two Teams; `state: idle` → exactly the idle entries; unknown address → none, `{}`), RC-48 (`address` with `node`); API-01 | Proven | — |
| AC-004 | Yes | API-06 RC-48 (alpha lists beta's PM with `node: "beta-node"`, one signed request `{fromNodeId,toNodeId}`), RC-27 (stopped, switched-off, unpaired peer: the same texts as `list_available_agents`; black-holed beta: "could not be reached (it did not answer in time)" in 20.2 s), RC-28 (alpha's switch off, unknown node, blank node) | Proven | — |
| AC-005 | Yes | API-06 RC-47 (two user-started roots on one built node: both directions delivered, headers name the sender's run ID, one line in each run's log under one message ID); API-01 (IMP-06, BEH-007 reservation) | Proven | — |
| AC-006 | Yes | API-06 RC-48 (PM picked by name and Project, `send_message_to(node)` → `Delivered message to … on node "beta-node".`, header `… on node "alpha-node".`, answer with `node: "alpha-node"` delivered, `assertBothLogs` on both nodes, two `run-messages` requests, no linked `messages`); unknown run ID / unknown node refusals | Proven | — |
| AC-007 | Yes | API-06 RC-47 (stopped root and never-started member: refused with the not-running text; no process, no new launch, nothing received), RC-48 (the same on beta with `node`, `REMOTE_TARGET_NOT_RUNNING`) | Proven | — |
| AC-008 | Yes | API-06 RC-47 (task agent and Org agent → running roots outside their runs: delivered), RC-48 (Org agent → beta with `node`), RC-49 (row 13: 6 senders of alpha in 5 roots, with and without `node` → `TASK_AGENT_RESOURCE_CLOSED`, nothing sent; row 14: beta's bystander and zeta's agent delivered while the fenced run runs), RC-10/RC-11/RC-23 (closed Task, unchanged), RC-06/RC-22 (DS-006); API-07 CPW-R2; API-08 U9 | Proven | — |
| AC-009 | No | API-06 RC-47 (the agent's `list_running_agents` and `send_message_to` texts over Agent Tools MCP equal the wording authority and contain REQ-012's phrases); code review read the collaboration model | Proven | — |
| QR-001 | No | API-06 RC-27 (`heldRunning.elapsedMs` 20217) | Proven | — |
| QR-002 | No | API-06 RC-20 (strict answer fields, request fields of both routes); API-01 (strict reader unit test) | Proven | — |
| QR-003 | Yes | API-06 RC-48 gate block (both routes, five ways), RC-20 (every captured request signed for its receiver, no credential header) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | API-06 (every AC and QR-003 on built servers, through the agents' own tool calls), API-07, API-08, API-01 | AC-009's collaboration-model text is proven by review, the tool texts by API-06 | — |
| Changed-boundary execution directness | 95% | 96% | API-06 drives both new peer routes over real HTTP between separate processes, the router, CrossRun, RunningAgents and the listing in built servers; the signed gate is hit directly (RC-48) | BEH-007 (waiting for the receiver's turn) is proven in process only (IMP-06) | A busy-receiver case on built servers (the scripted runtime answers at once) |
| Cross-boundary integration realism and mock gap | 95% | 95% | Two (and up to five) real server processes, capturing proxies, scripted AGY processes over Agent Tools MCP; only inference is scripted | Real paired user nodes (the user's Docker node) not used, by TESTING.md rule | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | Built `dist` of this worktree, Node 22, clean env, test-owned data roots, real pairing by invite, owner credential and peer signatures; fresh-start check (API-12) | The machine was heavily loaded by other worktrees (load 48–170, FSEvents stalled). That made suites that do not reach the change fail by time (FU-005); every case that reaches the change ran on the real built setup and passed. Post-repository 92% was before API-12 and the cause analysis of the API-04/API-05 failures (API-05c) | Rerun API-04b and the four API-05 files on a quiet machine (not evidence about this change) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Not-running refusals without waking (local and peer, stopped root, unstarted member, unknown ID), team run ID from a peer, switch off / unknown / unreachable / black-holed (20.2 s), fenced run rows 13/14 incl. a third node, gate refusals, RC-12/RC-13 idle shutdown and restarts still green with the new traffic | MP-003 race (contrived, not tested) | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | G-1 through the run-view WebSockets (live) and the Team tab's GraphQL read (after reload) the window uses (RC-47) | The rendered app was not opened; the UI is out of scope and unchanged | — |
| Durable regression coverage quality and relevance | 95% | 95% | RC-47 … RC-49 and the RC-06/08/20/22/27/28 updates, CPW-R1/R2/R3, contract fixture U9/O9, MCP schema test; all assert the approved behaviour exactly (no loosening) | Gated suites run only with `RUN_AGY_FAILURE_E2E=1` | — |

- Overall post-repository confidence: 94.6% (before API-12 and the failure-cause analysis)
- Overall final confidence: 95.3%
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (95.3%; no category below 95%)
- Confidence-limiting residual risks: environment-sensitive suites outside the change could not be shown green on this loaded machine (FU-005); BEH-007 on built servers.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond what ran
- Execution mode: `Worker or Distributed` (two-to-five built server processes) already ran as API-06 and API-08; `None` further
- Confidence gap or residual risk it addresses, and the expected gain: UNK-001 (two-node behaviour over real HTTP) was the material gap; API-06 closes it.
- Browser validation needed, and why or why not: No. The change is server-side agent tools and messaging; the only user-visible effect (G-1, messages kept out of run views) is proven on the exact server surfaces the window reads (view sockets live, the Team tab's GraphQL read after reload). No renderer code changed.
- If `Not Required`: the cases that already exercise the real changed boundary: API-06 RC-47, RC-48, RC-49, RC-06, RC-22, RC-20, RC-27, RC-28; API-07; API-08.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the old "not linked" and "different Task" refusals are gone in every E2E path; the linked `/messages` gateway still refuses unlinked senders, as designed: RC-08 forged requests `REMOTE_TARGET_NOT_PERMITTED`)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: the runs and logs each suite creates; every new message is stored in the existing log line shape (`assertBothLogs` / `assertLocalLogs` check the exact keys)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` RC-47, RC-48, RC-49 (and helpers `warm`, `assertLocalLogs`, `viewMessagesWith`, `teamTab`, `rawPost`, entry checks) | Added | API-06 | — |
| same file: RC-06 and RC-22 (DS-006 unlinked delivery), RC-08 and RC-22 (not-running text), RC-20 (both routes audited), RC-27/RC-28 (`list_running_agents` refusals and bound), RC-26 (beta's new definition in the exact offer), `sentRequests` counts `run-messages`, header | Updated | API-06 | The "not linked with you" assertions are replaced by delivery assertions (design row 6, removal plan) |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` CPW-R1, CPW-R2, CPW-R3 M-11 | Updated | API-07 | CPW-R2's "it works on a different Task" refusal no longer exists (DEC-001, `OTHER_TASK_REFUSAL` removed); it now asserts delivery |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-contract-stories.e2e.test.ts` O9 driver, story ranges | Updated | API-08 | — |
| `autobyteus-server-ts/tests/fixtures/collaboration-contract/contract-states.json` and `tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/stories.py` (U9 message ID `collabmsg_U9`) | Updated | API-08 | — |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` (`send_message_to`'s fields include `node`) | Updated | API-04 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Commits: `9fc0df5db3` (two-server suite, CPW, MCP route test), `ec66ee7d01` (contract fixture, model story, O9 driver)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model inference | Scripted AGY CLI (`agy-failure-cli.mjs`): a message `CALL_TOOL:{…}` makes the agent call the real tool | TESTING.md: runtimes without a model prove the transport; no provider credits | Agents' own judgement (choosing the PM from the list) is scripted by the test, not by a model |
| A user's real second node | Test-owned built servers alpha, beta (+ gamma, delta, epsilon, zeta) paired by invite | TESTING.md forbids the user's nodes | None for the protocol |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Two-server suite servers, proxies, temp roots, AGY processes | Yes | suite `afterAll` | receipts: `rootRemoved: true`, `serversStopped: true`, `leftoverAgy: []`, `errors: []` (both runs) |
| zeta node and its pairing with beta (RC-49) | Yes | `removePeerNode` on beta, `zeta.stop()` | RC-49 asserts beta's peers are only alpha afterwards |
| Contract-stories nodes | Yes | suite cleanup | passed |
| Temporary diagnostic fixture and test copy (`diag-492-*`) for E-008 | Yes | deleted after the run; the fixture copy kept as evidence text | `git status` clean of them |
| FSEvents probe, node-stop probe (`/tmp/api492/probe`) | Yes | kept as evidence copies | — |
| Fresh clone `/tmp/api492/fresh` | Yes | `rm -rf` | removed |
| Untracked `autobyteus-application-*/dist/` | No (implementation's build output) | left alone | — |
| Architecture reviewer's uncommitted edits to `design-review-report.md`, `architecture-review-revision-record.md` | No | left alone, not staged | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: the code reviewer (proportional test-code review on the reviewed route)
- Notes: The change's behaviour is proven on built servers over real HTTP (UNK-001 closed). Three test-side defects the runs exposed were fixed and rerun: the MCP route test's field list (`node`), the contract fixture's U9 message ID, and the missing O9 driver; and my own RC-47 assertion for an empty list. Environment failures in suites that do not reach the change are recorded with their measured causes and FU-005.
