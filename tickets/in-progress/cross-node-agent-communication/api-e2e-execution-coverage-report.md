# API/E2E Execution Coverage Report — autobyteus-191 (Slice 1: Remote Delegation, Text Only)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`. Evidence files are in `…/evidence/api-e2e/`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `…/api-e2e-coverage-investigation.md` (round 3)
- API/E2E revision record and current revision ID: `…/api-e2e-revision-record.md`, `API-REV-004`
- Test progress log: `…/api-e2e-test-progress.md`
- Round 4 (current), from delivery DR-001:
  - on the integrated state (HEAD `303eb6ca1d`: this branch merged with `origin/personal` at `4f03cce09d`, plus delivery docs), under machine load, delivery's DEL-06 run failed RC-10 once (19/20), on a race in the test;
  - DEL-07 passed 20/20.
  - Round 4 fixes the race, applies CRR-007's three notes, reruns the E2E twice on the integrated state, and replaces the duplicate API-23 screenshot.
- Round 3, from CRR-006 (Pass) of IR-004: code `7a5a9af077`, documents `284769f392`. The F-002 fix is in `validateTeamRunStatePackage` and `validateAgentOrgStatePackage` (SR-017, ARCH-REV-007).
- Prior rounds reviewed:
  - round 1 (API-REV-001): settings and gateway only; F-001;
  - round 2 (API-REV-002): the full run on IR-003; F-002.
- Rerun by impact (TESTING):
  - every case of the two-server E2E, because every case starts both servers and the validators run at every package scan;
  - API-21 and API-22, because those suites go through the same validators;
  - API-23 is reused: the fix does not touch the receiving node's standalone run, its history or its view.
- Deviations from the investigation's plan, and why:
  - RC-13 gained the reviewer's checks: after alpha restarts and another root is created, the owner opens the Team and Org runs, and the woken delegators follow up to their remote runs.
  - The RC-20 heuristic was tightened after a false positive in r3-2 (see Durable Coverage).
  - API-24, a test-owned Docker node, was tried and not run (see the AC-113 row).
- **Round-4 race (RC-10), confirmed as a test defect.**
  - RC-10 found the remote run by scanning beta's run folders for its `delegatedFrom`. That file exists as soon as beta has *prepared* the run, before the work packet starts it.
  - A prepared run is not yet an admitted run package: `getRunProjection` → `assertAdmitted("agent", …)` answers "Run package 'agent:…' is unavailable." (`root-run-package-readiness-index.ts:38`). That is existing behavior for any prepared run.
  - The test's `until()` does not retry a predicate that throws.
  - Fix: RC-10 now takes the remote run ID from the task agent's own `delegate_task` result. That result returns only after `RemoteTaskActivation.acceptSeed` delivered the work packet, which is also how RC-05 … RC-07 get theirs. All assertions are kept, and `delegatedFrom` is still checked exactly.
- Evidence folder: `…/evidence/api-e2e/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (requested with this Pass)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 1: source `744641b35c` | macOS 26.5.2, Node v22.23.1 | dist (round 1) | API-REV-001 |
| ENV-2 | round 2: `31d46978ad` | as above | dist (round 2) | API-REV-002 |
| ENV-4 | round 2: `31d46978ad`; web unchanged since `8491e0d916` | as above; agent browser tool (Chromium) | two dist servers (`API-23-setup-two-nodes.mjs`) + `nuxt dev` against beta | temp roots; one Nuxt dev server |
| ENV-5 | code `7a5a9af077` (HEAD `284769f392` changes only `tickets/`) | macOS 26.5.2 (Darwin 25.5), Node v22.23.1 | `autobyteus-server-ts/dist` rebuilt at API-00 round 3 | Two server processes `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>/<node>/data`. Clean environment (`env -i PATH HOME=<temp> TMPDIR`); each node has its own temp HOME, data root and port. Each node's peer URL is a capturing proxy. Scripted AGY CLI (`linked_skills`); canary provider keys on both nodes; idle grace 60 s. |
| ENV-6 | `7a5a9af077` | as ENV-5 | in-process E2E servers (vitest) | `RUN_AGY_FAILURE_E2E=1`, clean environment, switch off (API-21) or `ENABLE_REMOTE_COLLABORATION=true` (API-22) |
| ENV-8 | HEAD `303eb6ca1d` (integrated; source as `4f03cce09d`) | as ENV-5 | `autobyteus-server-ts/dist` rebuilt at API-00 round 4 | as ENV-5; load average 100–157 during the runs (other agents' work on the machine) |
| ENV-9 | `4f03cce09d` (integrated) | as ENV-5 | two isolated desktop instances of this worktree (`pnpm --silent isolated-app start --build` / `--from-worktree`), with `AUTOBYTEUS_TEST_VAULT`; AutoByteus runtime, `deepseek-v4-flash` | instances `iso-56211-d507` (A) and `iso-56346-3c73` (B); driven through each window's control port with the browser-automation skill, watched by the user |
| ENV-7 | base `5de6a698b9` | as ENV-5 | temporary detached worktree `/tmp/api-bisect-base` (`pnpm install --offline`, prebuild), in-process E2E | used only to bisect FU-004; removed afterwards |

## Cases

`RC-NN` is the E2E case of the same number in `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`. Command for API-01 … API-20 (from `autobyteus-server-ts`): `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR=<dir> ./node_modules/.bin/vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch`.

Round-4 runs on ENV-8, with the final test file (RC-10 fix and CRR-007 notes): **r4-1 20/20, r4-2 20/20** (`API-r4-run1.log`, `API-r4-run2.log` and the receipts `API-r4-run1/…`, `API-r4-run2/remote-two-server-receipt.json`). These are the authoritative runs. The machine's load average was 100–157 during them. Delivery's DEL-06 (19/20, RC-10) and DEL-07 (20/20) ran on the same state with the previous file.

Round-3 runs on ENV-5:
- r3-1: 20/20 with the RC-13 additions.
- r3-2: 19/20. RC-20 had a false positive, a test defect.
- r3-3 and r3-4: 20/20 each, with the round-3 file: `API-r3-run3.log`, `API-r3-run4.log`, and the receipts `API-r3-run3/…`, `API-r3-run4/remote-two-server-receipt.json` (`cases.RC-NN`).

The default reporter lists only cases slower than 300 ms; the fast RC-01 and RC-20 are covered by `Tests  20 passed (20)` and their receipt records.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | all | build | `pnpm -C autobyteus-server-ts build` | ENV-8 | Pass | `API-00-server-build-round4.log` | `exit=0` | round 3: `API-00-server-build-round3.log` |
| API-R1 | AC-112 (unit, switch off), all | unit | Reused: IMP-17 | — | Pass | IMP-17 | `Tests  6279 passed` | full unit suite at `7a5a9af077` |
| API-R2 | BEH-101 … BEH-106 in process; F-002 guard | unit | Reused: IMP-13 (`31d46978ad`), IMP-15, IMP-16 (`7a5a9af077`) | — | Pass | IMP-13, IMP-15, IMP-16 | — | IMP-15 runs the real admission scan and the Team/Org loaders with a stored delegator ↔ remote message, and fails before the fix |
| API-R3 | REQ-115 | web | Reused: IMP-04, IMP-05, IMP-08 | — | Pass | — | — | `autobyteus-web` unchanged since `8491e0d916` |
| API-R4 | REQ-114 (N-3) | route policy | Reused: IMP-07 | — | Pass | IMP-07 | `403` | `api/security/` and `api/rest/remote.ts` unchanged since `4c07f5b268` |
| API-01 | AC-101, AC-111 | settings, gateway | RC-01 | ENV-5 | Pass | `API-r3-run3.log`, `API-r3-run4.log`; receipts `RC-01` | `"code": "REMOTE_COLLABORATION_OFF"` for both kinds | — |
| API-02 | AC-101 | delegation with the switch off | RC-02 | ENV-5 | Pass | receipts `RC-02` | "Remote collaboration is turned off on this node, so nothing was sent to another node." | nothing captured |
| API-03 | AC-101, AC-102, AC-103, AC-111, REQ-114 | settings, client, gateway | RC-03 | ENV-5 | Pass | receipts `RC-03` | `"… is not an AutoByteus node."` ×2; `PEER_IDENTITY_MISMATCH` ×2; `PEER_NOT_REGISTERED`; 400 with `REMOTE_REQUEST_INVALID` | F-001 stays resolved |
| API-04 | AC-103, REQ-109 | delegation | RC-04 | ENV-5 | Pass | receipts `RC-04` | "Node \"beta-node\" has no published Agent at that address."; "The published Agent on node \"beta-node\" cannot run there: …" | nothing left on either node |
| API-05 | AC-104, AC-105, AC-111 | standalone delegator | RC-05 | ENV-5 | Pass | receipts `RC-05` | tree `link` with `nodeId` (exact keys); `metadata.delegatedFrom`; one `messageId` in both nodes' logs; `taskResource` `start: started` | the standalone view emits no sequenced frames, so its sequence check proves nothing (RC-06/RC-07 carry that proof) |
| API-06 | AC-104, AC-105, AC-107 | Team delegator, Team view open | RC-06 | ENV-5 | Pass | receipts `RC-06` | `"sequenced": 99, "gaps": [], "errorFrames": []`; `notPermitted` "That run is on another node and is not linked with you: …" | CR-001 expectation 1 |
| API-07 | AC-104, AC-105 | Org delegator, Org view open | RC-07 | ENV-5 | Pass | receipts `RC-07` | `"sequenced": 83, "gaps": []` | — |
| API-08 | AC-107 | messages | RC-08 | ENV-5 | Pass | receipts `RC-08` | "No running agent has the run id '…', so the message was not sent. …"; forged inbound ×3 `REMOTE_TARGET_NOT_PERMITTED` | CR-001 expectation 2 |
| API-09 | AC-108 | delegation, messages | RC-09 | ENV-5 | Pass | receipts `RC-09` | "Files (reference_files) can't be sent …" ×2; "A saved Task (task_id) can't be given …" ×2 | nothing sent or started |
| API-10 | AC-109 | Project Task, closure | RC-10 | ENV-8 | Pass (r4-1, r4-2) | receipts `RC-10` | `taskResource` `projects/<p>/tasks/<t>/agent_run_resources.json` `"role": "delegated"`; refusal `TASK_AGENT_RESOURCE_CLOSED` | DONE says nothing about stopping (AR-007). Round 4: the remote run is taken from the task agent's `delegate_task` result (the race fix above); DEL-06's failure was this test race |
| API-11 | AC-109 | ad hoc Task, closure | RC-11 | ENV-5 | Pass | receipts `RC-11` | delegator's message refused with no request captured; remote reply refused | — |
| API-12 | AC-106, DS-006 | idle shutdown and restore | RC-12 | ENV-5 | Pass | receipts `RC-12` | `relaunch.argv` starts `["--conversation", …]` | — |
| API-13 | AC-106, REQ-107, REQ-108 | restarts of both nodes, every root kind | RC-13 | ENV-5 | Pass | receipts `RC-13` (r3-1, r3-3, r3-4) | `observed.team` and `observed.org`: `accepted: true`, `inAlphaLog: true`, `relaunched: true`, `conversation: "readable"`; `reopened.teamRunId`, `orgMembers: 2` | F-002 resolved. Replies after alpha's restart: "Delivered message to delegator_… on node \"alpha-node\"." for standalone, Team and Org. A root created after the restart leaves the Team/Org runs openable, and their delegators follow up, with one ID in both logs. Links and `delegatedFrom` unchanged on disk |
| API-14 | AC-106 (alternate) | history deleted | RC-14 | ENV-5 | Pass | receipts `RC-14` | "That run no longer exists on node \"beta-node\"." | — |
| API-15 | QR-102, AC-104 | partition, stopped peer | RC-15 | ENV-5 | Pass | receipts `RC-15` | partition `elapsedMs` 20134/20216 (r3-3) and 20175/20192 (r3-4); stopped 208/213 ms | RSK-106 wording accepted (FU-002) |
| API-16 | AC-102 | identity mismatch | RC-16 | ENV-5 | Pass | receipts `RC-16` | "… is not the node that was registered (identity mismatch), so nothing was sent." ×2 | — |
| API-17 | AC-103 | unpublish | RC-17 | ENV-5 | Pass | receipts `RC-17` | "Node \"beta-node\" has no published Agent at that address." | the running remote run still exchanges both ways |
| API-18 | AC-101, SCN-107 | switch off on each node | RC-18 | ENV-5 | Pass | receipts `RC-18` | four "turned off" texts | — |
| API-19 | AC-102, SCN-107 | peer removal | RC-19 | ENV-5 | Pass | receipts `RC-19` | "… does not have this node registered as a peer, …"; "… is no longer a registered peer of this node, …"; "No peer node named …" | history readable on both nodes |
| API-20 | AC-111, REQ-113, REQ-114 | captured requests | RC-20 | ENV-5 | Pass | receipts `RC-20`, `captured` | `"total": 44, "counts": {"status": 2, "/rest/remote/delegated-runs": 11, "work_packet": 6, "toAlpha": 11, "toBeta": 14}`; header names only `accept`, `accept-encoding`, `accept-language`, `connection`, `content-length`, `content-type`, `host`, `sec-fetch-mode`, `user-agent` | no canary key, no credential header or key shape, exact body keys per kind |
| API-21 | AC-112, QR-105 | same-node E2E suites, switch off | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs tests/e2e/agent-org-runs --no-watch` | ENV-6 | Pass (FU-003, FU-004 outside scope) | `API-21-same-node-e2e-switch-off-round3.log`; `API-21-race-repeat-and-base-bisect.log` | `Test Files  2 failed \| 35 passed (37)`. The failures: `delegated-launch-config-defaults` (FU-003) and one race timeout in `task-reactivation-root-visibility` › "QR-001: a DONE from another root racing …". The race case, run alone: 9/10 pass on this branch; on the base `5de6a698b9` also 9/10, with the identical "Timed out waiting for tool result of / for CALL_TOOL:{\"name\":\"send_message_to\"…" | Both failures reproduce independently of this change: FU-003 with the switch off and on (round 2); FU-004 on the base at the same rate, without any remote-collaboration code (ENV-7) |
| API-22 | AC-112, QR-105 | same-node E2E suites, switch on | the same with `ENABLE_REMOTE_COLLABORATION=true` | ENV-6 | Pass (FU-003 outside scope) | `API-22-same-node-e2e-switch-on-round3.log` | `Test Files  1 failed \| 36 passed (37)`; the one failure is `delegated-launch-config-defaults` (FU-003) | round 2 gave the same result (`API-22-same-node-e2e-switch-on.log`) |
| API-23 | AC-110, REQ-112 | browser on the receiving node | round 2 journey (ENV-4) | ENV-4 | Pass (reused) | `API-23-browser-journey.log`, `API-23-beta-run-history-and-packet.png`, `API-23-beta-composer-message.png` | "workspace … Publisher (1)"; packet "… on node \"alpha-node\". … Marker BROWSER-PACKET."; composer "… OWNER-COMPOSER-MSG" then "OK"; after Stop `"status":["Offline"]` | Still valid: `git diff 31d46978ad 7a5a9af077` touches only the Team and Org package validators, which beta's standalone remote run, history and view do not use. The same server behavior (composer and stop on beta) also runs in every E2E run (RC-05, RC-14) |
| API-23b | AC-110, REQ-112 | the receiving node in the real desktop app | ENV-9 journey: setup in Nodes → Remote Collaboration on both windows, publish on B, Daily Assistant on A delegates by `delegate_task` (node "beta"), reply and follow-up both ways; on B, open the run from history and send an owner composer message | ENV-9 | Pass | `API-23b-isolated-app-journey.log`, `API-23b-isolated-beta-composer-message.png` | screenshot: run row under node-b-workspace → Text Reviewer (1); the reviewer's `send_message_to`; the owner message "… Marker OWNER-COMPOSER-MSG." and the answer "Confirmed: my review … is finished …"; status Idle | Real model and real app on the integrated build. It replaces the round-2 composer screenshot, which was a byte-identical copy of the history screenshot (delivery's note) and has been removed; the round-2 DOM and server records in `API-23-browser-journey.log` stand |
| API-24 | AC-113 (Docker networking part) | Docker node | Compared the dist of `autobyteus/autobyteus-server:latest` with this worktree's dist (TESTING § Docker server nodes) | — | Not Tested | `API-24-docker-node-attempt.log` | "31 differing files are NOT changed by this branch" | TESTING allows mounting this dist only when the image's dist differs just in this branch's files. No container was started, and the user's containers were not touched |

### Earlier findings

- F-001 (round 1): resolved by CR-002; rechecked in API-03.
- F-002 (round 2): resolved by SR-017/IR-004; rechecked in API-13 (three runs) and covered by API-21/22. The round-2 evidence (`API-13-F002-*.log`, `API-r2-run3*`) stays as the record of the failure.

### Observations (no finding)

- O-1: Activated remote runs keep `preparedAt`/`preparedExpiresAt` next to `startedAt`. The existing activation path does the same for every prepared run, and the cleanup and history treat a run with `startedAt` as started. The design's "clears the prepared fields" is a wording point only.
- O-2: The closed-Task refusal reads "Your Task is DONE or CANCELLED, so you can't start new work." This is the existing Task check's text, which REQ-109/111 reuse.
- O-3: A run of the E2E takes about 130 s on this machine, mostly the 60 s idle grace (RC-12) and the 20 s partition bounds (RC-15).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-101 | Yes | API-01, API-02, API-03, API-18 | Proven | — |
| AC-102 | Yes | API-03, API-16, API-19 | Proven | — |
| AC-103 | Yes | API-03, API-04, API-17 | Proven | — |
| AC-104 | Yes | API-05, API-06, API-07; refusals API-04, API-15, API-19, gateway API-01/03 | Proven | — |
| AC-105 | Yes | API-05, API-06, API-07 | Proven | — |
| AC-106 | Yes | API-12, API-13, API-14 | Proven | — |
| AC-107 | Yes | API-06, API-08 | Proven | — |
| AC-108 | Yes | API-09 | Proven | — |
| AC-109 | Yes | API-10, API-11 | Proven | — |
| AC-110 | Yes | API-23, API-23b | Proven | — |
| AC-111 | Yes | API-20, API-01, API-03, API-R4 | Proven | — |
| AC-112 | Yes | API-R1, API-21, API-22 | Proven (every same-node failure reproduces without this change: FU-003, FU-004) | — |
| AC-113 | Yes | — | Only The User Can Check | **Tried:** everything a server can show runs between two real server processes on one machine, with real HTTP between them, restarts of both, and browser views on the receiving node. In round 3 I also tried a test-owned Docker node from the user's image (API-24); TESTING does not allow it, because the image's dist differs in 31 files outside this branch. **Shown to the user:** the user watched API-23b: two real app instances on this Mac, set up in the Nodes tab, delegating and messaging both ways with a real model. **Still needs the user:** the desktop app's embedded server and a Docker node reaching each other (`host.docker.internal:29695` and the published Backend URL), set up in the Nodes tab, in both directions, with real signed-in runtimes and inference. These need the user's desktop, nodes and accounts. |

## Validation Confidence Scorecard (Mandatory)

Scored over what can be proven without the user. AC-113 is listed for delivery, not scored.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | API-01 … API-23, AC table | none outside AC-113 | — |
| Changed-boundary execution directness | 95% | 95% | two real server processes, real HTTP, roots, stores, scripted runtime processes | inference is scripted | AC-113 |
| Cross-boundary integration realism and mock gap | 95% | 95% | API-05 … API-20 | loopback proxies instead of LAN/Docker | AC-113 |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean environments, separate HOMEs/data/ports, real pinned IDs, canary keys | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | API-12 … API-19, API-13 in three runs | RSK-106 (accepted, FU-002) | — |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | API-23, API-R3 (Nodes tab), API-13 (Team/Org views after restart, through the server) | the browser journey is on round-2 code, still valid by diff; the desktop shell is unchanged | — |
| Durable regression coverage quality and relevance | 95% | 95% | 20-case E2E: four runs this round, the last two clean with the final file | the standalone view-sequence check is vacuous; RC-13 runs ~15 s and RC-15 depends on the 20 s bound | — |

- Overall post-repository confidence: 95%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AC-113 (the user's check); RSK-106 (accepted, FU-002)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Worker or Distributed` (two server processes, restarts, partition), `Browser` (API-23)
- Confidence gap or residual risk it addresses: the whole cross-node contract, lifecycle and recovery, and the receiving node's views.
- Browser validation needed, and why: yes, for AC-110 (API-23). The Nodes tab is reused from IMP-08 (web unchanged).
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected` (new files and optional fields; tolerant read)
- Representative existing data used: files written by the real servers: `peers.json`, `published-agents.json`, tree links of all three kinds, `delegatedFrom`, `agent_run_resources.json`, message logs (with remote-endpoint lines)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome:
  - API-05 … API-07 (exact keys);
  - API-13 (all three root kinds load, restore and reopen after a restart and a re-scan; links and back-links unchanged);
  - API-21/22 (same-node packages unchanged);
  - IMP-15/16 (admission scan and the migration consumers of the validators).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none known

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
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Added (round 1, `2f60c233a8`), updated (round 2, `a3fe225343`; round 3, `78820ad2a0`; round 4, this commit) | API-01 … API-20 | — |

The round-4 changes:
- RC-10 race fix (above).
- CRR-007 notes:
  - the header says "About 2–3 minutes";
  - definition IDs live in their own `defs` record, and `ids` holds run IDs only (`ids.team`, `ids.org`, `ids.manager` and `ids.bystander` are no longer reused);
  - RC-06/RC-07 assert `sequenced > 0`;
  - RC-05 says why its view check carries no sequence.

The round-3 changes:
- RC-13 checks that, after alpha restarts and another root is created, the Team and Org runs can be opened (`getTeamRunResumeConfig`, `getAgentOrgRunConfig`), and that the woken delegators follow up, with both logs checked.
- RC-20 key shapes (`sk-`, `mra_`, `mhub_`) are matched case-sensitively and only at the start of a value. A random message ID containing `Sk-` had matched (r3-2). The canary and credential-header checks were unchanged and passed in r3-2.

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs | scripted AGY CLI (`linked_skills`) | TESTING: a scripted runtime proves the transport; no provider spend | real inference is AC-113 |
| The network between the nodes | capturing HTTP proxies on loopback | capture (AC-111), partition, stop, retarget | LAN/VPN/Docker networking is AC-113 |
| A non-AutoByteus server | test-owned HTTP server (HTML page, 404) | — | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| E2E server processes, proxies, temp roots (r3-1 … r3-4) | Yes | `afterAll` | receipts `"rootRemoved": true, "serversStopped": true, "leftoverAgy": [], "errors": []` |
| In-process suite servers (API-21/22, race repeats) | Yes | the suites' own cleanup; temp HOMEs removed | — |
| Base worktree `/tmp/api-bisect-base` | Yes | `git worktree remove --force`, `git worktree prune` | removed; not listed |
| Docker image dist listing (API-24) | Yes | `docker run --rm`; temp lists removed | no container left; the user's containers untouched |
| Round-2 items (API-23 setup, Nuxt, kept data, probes) | Yes | API-REV-002 | removed |
| Isolated app instances `iso-56211-d507`, `iso-56346-3c73` (ENV-9) and `/tmp/ab-demo` | Yes | left running at the user's request for their own testing; stop with `pnpm --silent isolated-app stop <id>` (removes their auto-created data roots) | running |

## Preliminary Classification (On `Fail`)

N/A (Pass).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-113 (only the user can check: desktop + Docker, both directions, real runtimes)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review; Large / High)
- Notes:
  - Round 4 changed only test code and evidence; this ticket's product source is unchanged since round 3.
  - The `origin/personal` merge (`4f03cce09d`) brought other work. On that integrated state this round reran the two-server E2E (r4-1, r4-2) and the app journey (API-23b). The same-node suites are covered by delivery's DEL-03/DEL-04 (unit and web; DEL-03's one failure is FU-006, which also fails on the base). API-21/22 are the round-3 results on `7a5a9af077`.
  - FU-003 (stale suite from autobyteus-197) and FU-004 (a Task race timeout that reproduces on the base) are recorded in `follow-ups.md` for the Solution Designer to send on.
