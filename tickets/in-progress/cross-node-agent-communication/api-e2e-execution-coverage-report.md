# API/E2E Execution Coverage Report — autobyteus-191 (Slice 1: Remote Delegation, Text Only)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`. Evidence files are in `…/evidence/api-e2e/`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `…/api-e2e-coverage-investigation.md` (round 2)
- API/E2E revision record and current revision ID: `…/api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `…/api-e2e-test-progress.md`
- Round and trigger: round 2, from CRR-004 (Pass) of IR-003: code `31d46978ad`, documents `7383e89a0f` (SR-015/SR-016, CR-002 for F-001).
- Prior round reviewed: round 1 (API-REV-001): only the settings and gateway cases ran (steps 3–6 were held); F-001 failed.
- Deviations from the investigation's plan, and why:
  - API-21 (same-node suites with the switch off) moves to round 3. The F-002 fix changes the run-history package validators that these suites go through, so a run now would be invalidated. API-22 (switch on) ran now, to surface any same-node regression of IR-003 in this round.
  - The E2E file needed test fixes on its first full execution (listed under Durable Coverage). After those, RC-13 alone fails, on F-002.
  - The channel cases (RC-15 … RC-19) use the standalone delegator, so that F-002 does not hide their results. Team and Org messaging is covered by RC-06, RC-07 and RC-13.
- Evidence folder: `…/evidence/api-e2e/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` on Pass. This round ends `Fail` and asks for a failure-origin review of F-002.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 1: source `744641b35c` | macOS 26.5.2, Node v22.23.1 | dist built at API-00 (round 1) | see round 1 (API-REV-001) |
| ENV-2 | code `31d46978ad` (HEAD `7383e89a0f` changes only `tickets/`) | macOS 26.5.2 (Darwin 25.5), Node v22.23.1 | `autobyteus-server-ts/dist` rebuilt at API-00 round 2 | Two server processes `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>/<node>/data`. Clean environment (`env -i PATH HOME=<temp> TMPDIR`); each node has its own temp HOME, data root and port. Each node's peer URL is a capturing proxy. Scripted AGY CLI (`linked_skills`); canary provider keys on both nodes; idle grace 60 s. |
| ENV-3 | `31d46978ad` | as ENV-2 | in-process E2E servers (vitest) | `RUN_AGY_FAILURE_E2E=1`, `ENABLE_REMOTE_COLLABORATION=true`, clean environment; another agent's suite was also running on the machine |
| ENV-4 | `31d46978ad`, web unchanged since `8491e0d916` | as ENV-2; agent browser tool (Chromium) | two dist servers from `API-23-setup-two-nodes.mjs` + `nuxt dev` of `autobyteus-web` against node beta | temp roots; one Nuxt dev server |

## Cases

`RC-NN` is the E2E case of the same number in `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`. Command for API-01 … API-20 (from `autobyteus-server-ts`): `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR=<dir> ./node_modules/.bin/vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch`. The authoritative run is **r2-3**: `API-r2-run3.log` and the receipt `API-r2-run3/remote-two-server-receipt.json` (`cases.RC-NN`), in which 19 cases pass and RC-13 fails. Runs r2-1 and r2-2 are kept: they show the test fixes and F-002 first appearing.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | all | build | `pnpm -C autobyteus-server-ts build` | ENV-2 | Pass | `API-00-server-build-round2.log` | `exit=0` | round 1: `API-00-server-build.log` |
| API-R1 | AC-112 (unit, switch off), all | unit | Reused: IMP-14 | — | Pass | IMP-14 | — | full unit suite at `31d46978ad` |
| API-R2 | BEH-101 … BEH-106 in process, AR-003 … AR-008, CR-002 | unit | Reused: IMP-13 | — | Pass | IMP-13 | — | the in-process runs replace HTTP and the runtimes; this E2E covers them for real |
| API-R3 | REQ-115 | web | Reused: IMP-04, IMP-05, IMP-08 | — | Pass | — | — | `autobyteus-web` unchanged since `8491e0d916` |
| API-R4 | REQ-114 (N-3) | route policy | Reused: IMP-07 | — | Pass | IMP-07 | `403` | `api/security/` and `api/rest/remote.ts` unchanged since `4c07f5b268` |
| API-01 | AC-101, AC-111 | settings, gateway | RC-01 | ENV-2 | Pass | `API-r2-run3.log` | `✓ RC-01` | also passed in round 1 (`API-03-stable-run2`) |
| API-02 | AC-101 | delegation | RC-02 | ENV-2 | Pass | `API-r2-run3.log`; receipt `RC-02` | `"delegateOff": "Remote collaboration is turned off on this node, so nothing was sent to another node."` | nothing captured |
| API-03 | AC-101, AC-102, AC-103, AC-111, REQ-114 | settings, client, gateway | RC-03 | ENV-2 | Pass | receipt `RC-03` | `"message": "http://127.0.0.1:53584 is not an AutoByteus node."` and `"…/missing is not an AutoByteus node."` | F-001 resolved (CR-002) |
| API-04 | AC-103, REQ-109 | delegation | RC-04 | ENV-2 | Pass | receipt `RC-04` | `"notPublished": "Node \"beta-node\" has no published Agent at that address."`; `cannotRun` starts `The published Agent on node "beta-node" cannot run there:` | nothing on either node after the refusals |
| API-05 | AC-104, AC-105, AC-111 | delegation, messages (standalone delegator) | RC-05 | ENV-2 | Pass | receipt `RC-05` | `link` with exact keys and `nodeId`; `metadata.delegatedFrom` `{"nodeId": …, "coordinatingRun": {"kind": "agent", …}, "delegatorAgentRunId": …}`; `"followUp": … "Delivered message to publisher_… on node \"beta-node\"."`; `replyLogs` one `messageId` in `memory/agents/<remote>/collaboration/…` on beta and `memory/agents/<delegator>/collaboration/…` on alpha; `taskResource` `role: assigned`, `start: started` | All four request kinds captured. The standalone root view had no sequenced frames during the exchange (`"sequenced": 0`), so its sequence check proves nothing; RC-06/RC-07 carry that proof |
| API-06 | AC-104, AC-105, AC-107, RU-1/RU-2 | Team delegator, Team view open | RC-06 | ENV-2 | Pass | receipt `RC-06` | `"sequenced": 99, "lastSequence": 105, "gaps": [], "errorFrames": []`; `notPermitted` "That run is on another node and is not linked with you: …" | `coordinatingRun.kind` `agent_team`; the local message after the exchange appears on the view; the view stays open (CR-001 expectation 1) |
| API-07 | AC-104, AC-105, RU-1/RU-2 | Org delegator, Org view open | RC-07 | ENV-2 | Pass | receipt `RC-07` | `"sequenced": 83, "lastSequence": 88, "gaps": []` | `coordinatingRun.kind` `agent_org` |
| API-08 | AC-107 | messages | RC-08 | ENV-2 | Pass | receipt `RC-08` | `otherRoot` / `fromBystander`: "No running agent has the run id '…', so the message was not sent. …"; forged answers `REMOTE_TARGET_NOT_PERMITTED` ×3 | the other-root wording is today's live-only refusal (design § Ownership Boundaries); nothing written on the targets |
| API-09 | AC-108 | delegation, messages | RC-09 | ENV-2 | Pass | receipt `RC-09` | "Files (reference_files) can't be sent …" ×2; "A saved Task (task_id) can't be given …" ×2 | nothing sent or started; the saved Task stays TODO |
| API-10 | AC-109, RU-3 | Project Task, Task closure | RC-10 | ENV-2 | Pass | receipt `RC-10` | `taskResource.file` `projects/<project>/tasks/<task>/agent_run_resources.json` with `"role": "delegated"`; `refusalAnswer.code` `TASK_AGENT_RESOURCE_CLOSED` | the link is in the Manager's (topmost) tree; `update_task` DONE says nothing about stopping (AR-007). See Observation O-2 for the refusal wording |
| API-11 | AC-109 | Task closure | RC-11 | ENV-2 | Pass | receipt `RC-11` | `toRemote` "Your Task is DONE or CANCELLED, …" with no request captured; `fromRemote` refused | — |
| API-12 | AC-106, DS-006 | lifecycle (idle) | RC-12 | ENV-2 | Pass | receipt `RC-12` | `relaunch.argv` starts `["--conversation", …]` in the remote run's capsule | the CLI process was gone before the follow-up (idle grace 60 s) |
| API-13 | AC-106, REQ-107, REQ-108 | lifecycle (restarts) | RC-13 | ENV-2 | **Fail (F-002)** | `API-r2-run3.log`; receipt `RC-13`; `API-13-F002-package-validator-scan.log`; `API-13-F002-restart-reopen.log` | receipt `"team": "That run no longer exists on node \"alpha-node\"."`, the same for `"org"`, `inAlphaLog: false`, `delegatorRelaunched: false`; scan log `"reason": "AgentRun 'publisher_…' is not in root 'remote_squad_…'."`; restart log `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED` and `AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED` | Restart of beta, then of alpha, for the standalone delegator: passes (restored with `--conversation`, woken, follow-up after; links and `delegatedFrom` unchanged). Team and Org delegators after alpha's restart: fail. See F-002 |
| API-14 | AC-106 (alternate) | lifecycle | RC-14 | ENV-2 | Pass | receipt `RC-14` | "That run no longer exists on node \"beta-node\"." | the case deletes its own fresh remote run |
| API-15 | QR-102, AC-104 (unreachable) | channel | RC-15 | ENV-2 | Pass | receipt `RC-15` | partition: `"elapsedMs": 20167` / `20158` with "… (it did not answer in time)." / "… (it did not answer in time; the message may have been delivered)."; stopped: `"elapsedMs": 212` "(fetch failed)" | RSK-106 wording as accepted (FU-002); nothing left on alpha, nothing started on beta |
| API-16 | AC-102 (identity) | channel | RC-16 | ENV-2 | Pass | receipt `RC-16` | "The server at node \"beta-node\"'s address is not the node that was registered (identity mismatch), so nothing was sent." for delegation and message | — |
| API-17 | AC-103 (unpublish) | delegation | RC-17 | ENV-2 | Pass | receipt `RC-17` | "Node \"beta-node\" has no published Agent at that address." | the running remote run still exchanges both ways |
| API-18 | AC-101, SCN-107 | switch | RC-18 | ENV-2 | Pass | receipt `RC-18` | four "turned off" texts | while alpha was off, only beta's refused message was captured |
| API-19 | AC-102, SCN-107 | peer removal | RC-19 | ENV-2 | Pass | receipt `RC-19` | "Node \"beta-node\" does not have this node registered as a peer, …"; "The node of that run (srv_…) is no longer a registered peer of this node, …"; "No peer node named \"beta-node\" …" | links, run folders and both conversations still readable |
| API-20 | AC-111, REQ-113, REQ-114 | captured requests | RC-20 | ENV-2 | Pass | receipt `RC-20`, `captured` | `"total": 42, "counts": {"status": 2, "/rest/remote/delegated-runs": 11, "work_packet": 6, "toAlpha": 11, "toBeta": 12}`; header names only `accept … user-agent`, `content-type`, `content-length` | no canary key and no token-like text in any request; exact body keys per kind |
| API-22 | AC-112, QR-105 | same-node E2E suites, switch on | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… ENABLE_REMOTE_COLLABORATION=true vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs tests/e2e/agent-org-runs --no-watch` | ENV-3 | Pass (with FU-003 outside scope) | `API-22-same-node-e2e-switch-on.log`; `API-22-dlc-alone-switch-off.log`, `API-22-dlc-alone-switch-on.log` | `Test Files  1 failed \| 36 passed (37)`, `Tests  2 failed \| 148 passed \| 4 skipped (154)` | The one failing file, `delegated-launch-config-defaults.e2e.test.ts`, fails the same way alone with the switch **off**. Its expectation predates autobyteus-197, which is in the base, and this branch changes no launch-recording code: **FU-003**, outside this ticket. Rerun with API-21 in round 3 |
| API-21 | AC-112, QR-105 | same-node suites, switch off | — | — | Not Tested | — | — | round 3, after the F-002 fix (it changes run-history validators these suites use) |
| API-23 | AC-110, REQ-112 | browser on the receiving node | `API-23-setup-two-nodes.mjs` (temporary) + `nuxt dev` against beta; then in the browser: Workspaces → workspace → Publisher → open the run → composer message → Stop | ENV-4 | Pass | `API-23-browser-journey.log`; `API-23-beta-run-history-and-packet.png`; `API-23-beta-composer-message.png` | left panel "workspace … Publisher (1)"; main text "You have a new task from the agent with sender run id \"delegator_b913…\" on node \"alpha-node\". … Marker BROWSER-PACKET."; after the composer message "Owner of beta here: … OWNER-COMPOSER-MSG" then "OK"; after Stop `{"stopStillPresent":false,"status":["Offline"]}` and 0 live CLI processes for the run | DOM/state assertions; screenshots are supporting |

### F-002 — Team and Org runs that messaged a remote run are dropped from history (AC-106; REQ-107/108; preserved run history)

- **What happens.**
  - The current root-package validator requires both endpoints of every logged message to be agents of the root's tree (`validateTeamRunStatePackage`, `run-history/services/team-run-state-package-validator.ts:23-26`; `validateAgentOrgStatePackage`, `agent-org-execution/services/agent-org-state-package-validator.ts:20-22`; called from `root-run-package-current-validator.ts:163/195`).
  - A message to or from the remote run has the remote run as one endpoint, so after the first remote message the Team or Org package fails validation.
  - The readiness index re-scans every package whenever any root is created (`admitCurrent` → `rebuild`) and at every startup, and drops a package that fails (`root-run-package-readiness-index.ts`).
- **Effect while alpha runs.**
  - Once any other root is created, the Team's and Org's member views fail: "AgentRun '…' was not found in root TeamRun '…'" (r2-1, r2-2).
  - Location lookups skip a live root that is not admitted (`team-run-execution-tree-location-service.ts` `findInActive`).
- **Effect after alpha restarts.**
  - The remote run's reply to a Team or Org delegator is refused: "That run no longer exists on node "alpha-node"". Nothing is delivered and the delegator is not woken (r2-3).
  - The owner can no longer reopen the Team or Org run: `restoreAgentTeamRun` → `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED`, and `getAgentOrgRunConfig` → "AgentOrg package is not admitted." (`API-13-F002-restart-reopen.log`).
- **What is not affected.** Standalone packages are admitted (`agent:delegator_…` in the scan), so standalone delegators work.
- **Why the design did not catch it.** The design's AR-001 walker table has no row for this validator. The design names this exact case as its escalation trigger: "a walker … that must see remote links and is not in the AR-001 table".
- **Reproduction.**
  - E2E RC-13 (r2-3).
  - On kept data: `REMOTE_E2E_KEEP_DATA_DIR=<dir>` with `-t "RC-0[1-7] "`, then `node <probe> <dist> <dir>/alpha/memory`; the probe source is in `API-13-F002-package-validator-scan.log`.

### Observations (no finding)

- O-1: Activated remote runs keep `preparedAt`/`preparedExpiresAt` next to `startedAt` (beta `run_metadata.json`). The design (SR-015 N-10) says activation "clears the prepared fields, as for any prepared run", but the existing activation path never clears them, for any run. They are harmless: the 24-hour cleanup and history both treat a run with `startedAt` as started (`agent-run-provisioning-service.ts:139`, `agent-run-history-catalog-service.ts:97`). This is a design-doc wording point only.
- O-2: The closed-Task refusal reads "Your Task is DONE or CANCELLED, so you can't start new work." (RC-10/RC-11), also when the sender is not the task agent whose Task closed. It is the existing Task check's text (`root-task-execution-resource-scope.ts:156`), which REQ-109/REQ-111 reuse "as for a closed local copy". Not changed by this slice.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-101 | Yes | API-01, API-02, API-03, API-18 | Proven | — |
| AC-102 | Yes | API-03, API-16, API-19 | Proven | — |
| AC-103 | Yes | API-03, API-04, API-17 | Proven | — |
| AC-104 | Yes | API-05, API-06, API-07 (success); API-04, API-15, API-19 and the gateway checks of API-01/03 (refusals: nothing on B, no link on A) | Proven | — |
| AC-105 | Yes | API-05, API-06, API-07 | Proven | — |
| AC-106 | Yes | API-12, API-14; API-13 for the standalone delegator | **Not Proven: fails for Team and Org delegators after a restart of the delegating node (F-002)** | — |
| AC-107 | Yes | API-06, API-08 | Proven | — |
| AC-108 | Yes | API-09 | Proven | — |
| AC-109 | Yes | API-10, API-11 | Proven | — |
| AC-110 | Yes | API-23 | Proven | — |
| AC-111 | Yes | API-20, API-01, API-03, API-R4 | Proven | — |
| AC-112 | Yes | API-R1 (unit, switch off), API-22 (E2E, switch on; FU-003 is outside scope) | Not Proven (API-21, switch off, in round 3 after the F-002 fix) | — |
| AC-113 | Yes | — | Only The User Can Check | Everything a server can show is covered here between two real server processes on one machine: settings, delegation and messages both ways, restarts, and B's views in a browser. Still unproven: the user's desktop node and a Docker node reaching each other over `host.docker.internal` and the published port, in both directions, with real signed-in runtimes. That needs the user's nodes and accounts. |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 75% | API-01 … API-23 | AC-106 fails for Team/Org (F-002); AC-112 switch-off E2E pending | the F-002 fix, then API-13 and API-21/22 |
| Changed-boundary execution directness | 95% | 95% | two real server processes over real HTTP, real roots, stores and runtimes processes | the scripted runtime stands in for inference | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | API-05 … API-20, API-23 | loopback proxies instead of LAN/Docker networking | AC-113 |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | clean env, separate HOMEs/data/ports, real pinned IDs, canary keys | desktop + Docker networking | AC-113 |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | 60% | API-12 … API-19 | restart recovery fails for Team/Org delegators | F-002 fix |
| User-surface, browser, and desktop-shell confidence | 90% | 90% | API-23, API-R3 | delegating node's views of a Team/Org run broken by F-002; the desktop shell is not exercised (unchanged) | F-002 fix, then API-13 |
| Durable regression coverage quality and relevance | 90% | 90% | the 20-case E2E, all executed | the standalone view-sequence check is vacuous (no sequenced events on that view) | — |

- Overall post-repository confidence: 85%
- Overall final confidence: 85%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-106, AC-112)
- Any final applicable category below `90%`: `Yes`: requirement proof 75%, lifecycle/recovery 60%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-002

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed in this round)
- Execution mode: `Worker or Distributed` (two server processes, restarts), `Browser` (API-23)
- Confidence gap or residual risk it addresses: the whole cross-node contract, lifecycle and B's views. It found F-002.
- Browser validation needed: yes, for AC-110 (done, API-23). The Nodes tab is reused from IMP-08 (web unchanged).
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected` (new files and optional fields; tolerant read)
- Representative existing data used: real files written by the servers: `peers.json`, `published-agents.json`, tree links (all three kinds), `delegatedFrom`, `agent_run_resources.json`, message logs
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome:
  - API-05 … API-07 (exact keys);
  - API-13 (links and back-links unchanged across restarts).
- **The new data makes existing package readers reject Team and Org packages (F-002):** remote-endpoint message lines fail the current package validator. This contradicts "tolerant read; absence means none". It is the cause of F-002, not a migration question.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: F-002

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated after its first full execution | API-01 … API-20 | — |

The fixes were all expectation or sequencing errors in my test, found on its first full run; none changes what is asserted about the product:
- RC-06: the Team `coordinatingRun.kind` is `agent_team`.
- RC-08: asserts the exact live-only refusal text.
- RC-10/RC-11: `update_task` returns `{task: {…}}`, keyed by the Task key.
- RC-18: counts requests by sequence over all captures.
- RC-19: turns both switches on first.
- RC-14: deletes its own fresh remote run.
- RC-15 … RC-19: run through the standalone delegator.
- RC-13: records the Team/Org observations before asserting.
- RC-15/RC-16/RC-18: restore the link in `try/finally`.
- `REMOTE_E2E_KEEP_DATA_DIR`: keeps a copy of both data roots for diagnosis.

- Added or updated paths attached for proportional test-code review: `No` (Fail; attached as context)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs | scripted AGY CLI (`linked_skills`) | TESTING: a scripted runtime proves the transport; no provider spend | real inference is AC-113 |
| The network between the nodes | capturing HTTP proxies on loopback | capture (AC-111), partition, stop, retarget | LAN/VPN/Docker networking is AC-113 |
| A non-AutoByteus server | test-owned HTTP server (HTML page, 404) | — | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| E2E server processes, proxies, temp roots | Yes | `afterAll` | receipts: `"rootRemoved": true, "serversStopped": true, "leftoverAgy": []` |
| Kept data copy `/tmp/api-r2-keep`, probe copy `/tmp/api-probe/alpha-copy`, probe scripts `/tmp/api-probe/*` | Yes | removed after the evidence was saved | removed (probe sources copied into the evidence logs) |
| Probe server on a copy of kept data (port 63555) | Yes | killed by the probe script | stopped |
| API-23 setup (two servers, temp root) | Yes | SIGTERM | "stopped; removed … exists: false"; ports 54156/54178 free |
| Nuxt dev (port 54292), browser tab | Yes | stopped; tab closed | port free |
| Scripted CLI processes in another suite's temp root (`delegated-launch-defaults-*`) | No | left alone | — |

## Preliminary Classification (On `Fail`)

- **F-002: `Design Impact` (preliminary).** The AR-001 walker table misses the root-package validator, and the design names "a walker … that must see remote links and is not in the AR-001 table" as its escalation trigger. The fix itself looks bounded: let the Team and Org package validators accept the tree's remote-link run IDs as message endpoints, the same rule the stored message view already uses. Recommended owner: Solution Designer for the table and rule, then the Implementation Engineer. The code reviewer's failure-origin review confirms.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): AC-106 (F-002, Team/Org delegators after a restart); AC-112 (switch-off E2E in round 3); user-only AC-113
- Preliminary classification and recommended owner: F-002 `Design Impact`, Solution Designer → Implementation Engineer
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review of F-002)
- Notes:
  - Round 3 reruns API-13 and every case whose code the fix touches (the whole E2E file, since every case starts both servers).
  - Round 3 then runs API-21 and API-22.
  - FU-003 records the unrelated stale suite.
