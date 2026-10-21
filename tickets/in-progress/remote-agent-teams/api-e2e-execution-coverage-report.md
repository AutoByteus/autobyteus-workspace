# API/E2E Execution Coverage Report — autobyteus-247 (Remote Agent Teams)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams`; evidence in `…/evidence/api-e2e/`.

## Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 1)
- Progress log: `…/api-e2e-test-progress.md`
- Revision record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Round 3 trigger: delivery DR-001. The mandatory Validation Confidence Scorecard was missing. Scoring it honestly put round 2 at about 94%, below the 95% target, so I closed the gaps with targeted durable cases instead of only recording them (see Round 3).
- **Result (round 3): Pass, final confidence 95%.** The two-server E2E passes 25/25 twice at HEAD `a74677df99`.
- Round 2 trigger: CRR-003 pass of IR-002, the F-001 fix `351b4dd93f` (documents `8df22369d9`). Size Large, risk High.
- Round 1 trigger: CRR-001 pass of IR-001. Code `9ec78440e2` + `13131733b9`, documents `824562b6a2`, branch `codex/remote-agent-teams`.
- **Result (round 2): Pass.** F-001 is resolved. The two-server E2E passes 24/24 twice on a rebuilt dist, and the fix's unit tests pass.
- Round 1 result: Fail, on F-001 only (the remote Team `delegate_task` result did not name the node, REQ-304/AC-301).
- Durable coverage changed: Yes. Round 1 updated the two-server E2E (`d69676f1d4`). Round 2 turns RC-21's soft `node` check into a hard check of the exact result keys.

## Round 3 (API-REV-003)

HEAD is `a74677df99`, the delivery merge of `origin/personal` (release records only). The validated server code is that of `351b4dd93f`. Nothing in `src` changed, so the round-2 dist was used.

| Case | Gap it closes | What runs | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- |
| API-25b, i.e. RC-25 (new) | RSK-301 / DEC-304 (C-29): an unused Team run on beta after a failure on alpha | The proxy drops alpha's work packet to a just-started remote Team. It forwards `delegated-runs` and breaks the `work_packet` connection | Pass (runs 7, 8) | `API-run7/8` receipts `RC-25`: `sent` = `forwarded`, `dropped by the test`. Alpha: `delegate_task` → `{"delegated":false}` "Node \"beta-node\" could not be reached (fetch failed).", and its Task record says `start: "failed"`, `TASK_DISPATCH_FAILED`. Beta: one new Team run, and no member launched. RC-12 later: that run is in history with `isActive: false` and no messages (the idle schedule stopped it) |
| RC-12 (extended) | "a busy member holds the idle shutdown" (was Not Tested) | The lead sends the checker a 90 s background task (`BACKGROUND_STEP`) | Pass (runs 7, 8) | `heldAfterGrace {coordinator: true, checker: true, atMs: 75198 / 75218}`: the idle coordinator is held too, so the Team is held all or nothing. `teamShutDownAfterMs` 150529 / 150433: not before the task ends (≥ 90 s), and one grace period after it |
| RC-13 (extended) | CRR-004 note: a cold wake by a Team link was unit-proven only | A second alpha restart. The Studio coordinator's reply is the first inbound message; the test waits for the relaunch before opening anything on alpha | Pass (runs 7, 8) | `coldWake`: "Delivered message to delegator_… on node \"alpha-node\"."; exactly 1 relaunch of the lead with `--conversation` (cwd `agent_teams/remote_squad_…/delegator_…`). The message is in alpha's Team log and the lead reads it |
| RC-23 (extended) | `fenced_remote` was proven by unit tests only | Alpha now runs at `LOG_LEVEL=INFO`, so the closure's `console.info` record is written | Pass (runs 7, 8) | `fenceLine`: `TASK_AGENT_RESOURCE_FENCED_REMOTE { taskId: '<the Task>', … execution: { teamRunId: 'studio_team_…' }, message: '/studio_team runs on node "beta-node". This Task sends it no more messages; it stops there when it goes idle.' }` |
| Full E2E run 6 | — | exploratory, with the new cases | 24/25 | `API-run6.log`: the fence check timed out because it matched single lines, but `console.info` prints the record over several lines. Fixed to match the record block. The busy member, cold wake and RC-25 all passed |
| Full E2E runs 7, 8 | — | whole two-server E2E, final file | **Pass, 25/25 each**, 250.7 s / 251.3 s | `API-run7.log`, `API-run8.log`, `API-run7/`, `API-run8/`. RC-21 `node: "beta-node"`. RC-20: 69 requests, `{"status":2,"/rest/remote/delegated-runs":22,"work_packet":9,"toAlpha":16,"toBeta":20}`, same header names. No temp roots and no processes left |

The test file has no type errors apart from the config-wide TS6059 (`rootDir`). API-25, API-26, API-R2 and the round-1 cases are still valid: no source changed, and the extended cases ran in runs 7 and 8.

## Validation Confidence Scorecard (Mandatory)

These are scored over real-use scenarios, by what can be proven without the user. Real cross-machine and Docker networking (AC-113-style, carried over from autobyteus-191) is the user's check: it is listed for delivery and not scored.

- **Post-Repository Score:** after the repository and E2E evidence of rounds 1–2 (two-server E2E runs 4/5, API-25, API-R2), before the browser journey and before the round-3 closures.
- **Final Score:** after API-26 and the round-3 cases (runs 7/8).

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 95% | AC-301 API-21 (with `node`); AC-302 API-04; AC-303 API-22; AC-304 API-12/API-13 (warm and cold wake); AC-305 API-23 (with the `fenced_remote` record); AC-306 API-01 … API-20, API-25; REQ-307 API-24, API-26 | Post-repository: the cold wake by a Team link and the `fenced_remote` value were unit-only. Final: none that is material | — |
| Changed-boundary execution directness | 95% | 95% | two real server processes; real HTTP in both directions through capturing proxies; real roots, trees, Task records, message logs and CLI processes; the kinded contract audited in RC-20 | inference is scripted. The changed boundary is server-side (tool calls, packets, lifecycle), which the scripted CLI drives through the real agent tools | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | API-21 … API-25 between two processes, with partition (RC-15) and a dropped packet (RC-25) | loopback proxies instead of a LAN or Docker (the user's check) | the user's two-machine check |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean `env -i`, separate HOMEs, data roots and ports; pinned node IDs; Team definitions with defaults created through GraphQL; a second model offered by beta's CLI | alpha runs at INFO in this E2E (logging only) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 95% | idle with a busy member (RC-12), idle restore, beta restart, alpha restart warm and cold (RC-13), owner stop (RC-24), Task closure fence (RC-23), work-packet failure leaving an unused Team run (RC-25), partition and stopped peer (RC-15) | RSK-301's other trigger (alpha's link commit failing before the packet) is not run. It leaves beta in the same state as RC-25 (a created Team, nothing sent), so it reaches the same idle path | a fault injected into alpha's link commit (source-level; not reachable from outside) |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | API-26 (beta: history, the packet naming `alpha-node`, an owner message, Terminate); alpha's Team view stays contiguous while remote Team messages flow (RC-22); the Nodes tab note (IMP-05/06, reused) | the desktop shell is unchanged; the history row title follows the latest message (observation, not a finding) | — |
| Durable regression coverage quality and relevance | 93% | 95% | 25-case E2E, two clean runs of the final file; exact key checks; refusals assert that nothing is sent; every case enters through a real surface | RC-04 pins the FU-002 wording (intended coupling). RC-12 depends on the 60 s grace with a 15 s margin (the held check is at 75 s and the task ends at 90 s). The suite now takes about 4 minutes | — |

- Overall post-repository confidence: 93% (simple average 92.6%)
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`. Post-repository, the lifecycle category was at 88%; it is closed by RC-12, RC-13 and RC-25.
- Default final confidence target of `95%` met: `Yes` (after round 3). Round 2 was handed off without this scorecard. Scored honestly, round 2 would have been about 94% (lifecycle 90%, AC proof 93%) and below the target; round 3 closes that.
- Confidence-limiting residual risks:
  - RSK-201 (every member auto-approves; accepted, observed);
  - the commit-failure trigger of RSK-301 (same beta state as the tested packet failure);
  - the user's real-network check.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode:
  - `Worker or Distributed`: two server processes, restarts, partition, a dropped packet, idle schedules;
  - `Browser`: API-26 on beta.
- Gaps addressed:
  - the cross-node Team contract and lifecycle;
  - the receiving node's Team views;
  - the round-3 lifecycle gaps.
- Browser validation needed: yes. A peer-started Team run is a new kind of run in beta's history and views (REQ-307, BEH-305); API-26 covers it. Alpha's view is covered by the sequence check in RC-22.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected` (new optional fields only; no migration).
- Data written by the real servers was read back:
  - the Team link on alpha;
  - `delegatedFrom` on beta's Team tree;
  - Task records with `agentRun.kind: "team"`;
  - Team message logs.
- What proves it:
  - API-21 (exact keys);
  - API-13 (restarts of both nodes with links and back-links unchanged, and roots reopened);
  - API-25 (same-node packages unchanged).
- No compatibility branch or migration was observed.

## Round 2 (API-REV-002)

| Case | What runs | Result | Evidence |
| --- | --- | --- | --- |
| API-00 round 2 | `pnpm -C autobyteus-server-ts build` at `8df22369d9` | Pass | `API-00-server-build-round2.log` (exit 0, bootstrap smoke checks passed) |
| API-R2 | `tests/unit/agent-tools/team-communication/collaboration-result-contracts.test.ts`, `tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Pass, 13/13 | `API-R2-unit-f001.log` |
| API-01 … API-24, run 4 | whole two-server E2E | Pass, 24/24, 152.3 s | `API-run4.log`, `API-run4/`. RC-21 result: `{"delegated":true,"target_kind":"team","target_team_run_id":"studio_team_…","target_team_coordinator_agent_run_id":"publisher_…","node":"beta-node","task_id":"ad_hoc_task_…"}`, with exactly these keys |
| API-01 … API-24, run 5 | whole two-server E2E | Pass, 24/24, 152.1 s | `API-run5.log`, `API-run5/`. RC-20: 65 requests, same counts and header names as round 1. No temp roots or processes left |
| API-25, API-26 | — | Still valid (round 1) | The fix changes only how the delegation result is serialized (a schema field and the serializer) plus one comment. The same-node suites and the browser views on beta do not depend on it |

Round 1 follows.

## Environment

| ID | Code | Machine | Servers | Data |
| --- | --- | --- | --- | --- |
| ENV-1 | HEAD `824562b6a2` (dist API-00) | macOS 26.5.2, Node v22.23.1 | two `dist/app.js` processes, with capturing proxies between them; scripted AGY CLI (`linked_skills`); beta's CLI also offers `alt-model` | temp roots and HOMEs; clean `env -i`; removed after each run (0 temp roots and 0 processes left) |
| ENV-2 | as ENV-1 | as ENV-1 | in-process E2E servers (vitest), `ENABLE_REMOTE_COLLABORATION=true`, `RUN_AGY_FAILURE_E2E=1` | temp |
| ENV-3 | as ENV-1; web of this worktree | as ENV-1; agent browser tool (Chromium) | two dist servers (`API-26-setup-two-nodes.mjs`) + `nuxt dev` against beta | temp root, removed; ports freed |

Neither the user's AutoByteus, its data, Docker nodes nor provider keys were used.

## Results

`RC-NN` is the case in `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`. It is run from `autobyteus-server-ts` with:

```
env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR=<dir> ./node_modules/.bin/vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch
```

### Full runs

| Run | Result | Evidence |
| --- | --- | --- |
| 1 | 22/24 pass. RC-21 fails on F-001. RC-23 failed because of a test defect: it passed the ad-hoc Task ID where the refusal needs a saved Project Task ("…must identify exactly one current node-local Task (found 0)"). The defect is fixed; run 1 is kept as the record. | `API-run1.log`, `API-run1/` |
| 2 | 23/24 pass; the only failure is F-001; 150.9 s | `API-run2.log`, `API-run2/` (receipt and both server logs) |
| 3 | 23/24 pass; the only failure is F-001 (identical); 149.4 s | `API-run3.log`, `API-run3/` |

### Cases

| Case | Criteria | What runs | Env | Result | Evidence and key observations |
| --- | --- | --- | --- | --- | --- |
| API-00 | all | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log`, exit 0 |
| API-R1 | AC-306 (unit), all | IMP-01 … IMP-05 of the implementation handoff | — | Reused | The code reviewer reran these at CRR-001, and this round changes no source |
| API-01 … API-20 | AC-306 (slice 1, 245) | RC-01 … RC-20 | ENV-1 | Pass (runs 2, 3) | See RC-04 and RC-20 below |
| API-04 | AC-302, 245 AC-202 … AC-204 | RC-04 | ENV-1 | Pass | `/hollow_team`: "There is no default runtime configured for the target agent team Hollow Team on node \"beta-node\"." `/codex_team`: "The Agent Codex Team on node \"beta-node\" cannot run there: Codex App Server command '…/beta/missing/codex' is not available." (FU-002 wording, as implemented). No Team run directory appears on beta and nothing is left on alpha. The stale `/review_squad` → `REMOTE_TEAMS_NOT_SUPPORTED` row is gone |
| API-20 | AC-111, contract | RC-20 | ENV-1 | Pass | Run 2: `total 65`, `{"status":2,"/rest/remote/delegated-runs":21,"work_packet":8,"toAlpha":15,"toBeta":19}`. The header names are only the standard ones. Every message kind carries `targetRoot`, and no message carries `coordinatingRun` (exact key lists) |
| API-21 | AC-301, REQ-302/303/304/307, RU-1, RU-3 | RC-21 | ENV-1 | **Fail (F-001)**; every other check passes | The result is `{"delegated":true,"target_kind":"team","target_team_run_id":"studio_team_…","target_team_coordinator_agent_run_id":"publisher_…","task_id":"ad_hoc_task_…"}` with **no `node`**. Alpha's Team link has exactly the keys `address, coordinatorAddress, delegatorAgentRunId, members, nodeId, startedAt, teamRunId` (`/studio_team`, `/studio_team/lead`, members lead and checker), beside the remote Agent link R2 in the same tree. Task record: `role assigned`, `hostRoot {agent_team, remote_squad_…}`, `agentRun {team, teamRunId, coordinatorAgentRunId}`, `start started`. Beta's tree `delegatedFrom {nodeId: alpha, coordinatingRun {agent_team, remote_squad_…}, delegatorAgentRunId: lead}`. Only the coordinator launched, with `gemini-3.8-flash-low`. Member launch configurations: lead uses its own default, checker uses `alt-model` (the Team default); both use beta's temp workspace and `autoExecuteTools: true`. The packet reads "You have a new task from the agent with sender run id \"<lead>\" on node \"alpha-node\"." Beta's history lists the run (`isActive: true`, temp workspace) |
| API-22 | AC-303, REQ-305, RU-3 | RC-22 | ENV-1 | Pass | Coordinator ↔ lead in both directions. Lead → the never-started checker starts it once with `--model alt-model`; the checker replies. Each of the 4 messages appears once in alpha's Team log and once in beta's Team log, with one message ID. Team run ID → "studio_team_… is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: publisher_…." The other alpha member gets "That run is on another node and is not linked with you: …". Another alpha root gets the live-only refusal. No request is sent for any refusal. Alpha's Team view: `gaps []`, `errorFrames []`, 110 sequenced frames, socket open |
| API-23 | AC-305, REQ-308 | RC-23 | ENV-1 | Pass (runs 2, 3) | A saved Project Task is refused both to the running remote Team copy (`target_team_run_id`) and to a new remote Team, with "A saved Task (task_id) can't be given to an agent on another node yet, …". No Team run starts and the Task stays TODO. After `update_task` DONE (the result does not mention stopping), alpha → coordinator is refused with "Your Task is DONE or CANCELLED, so you can't start new work." and nothing is sent. Coordinator → alpha is refused with "Node \"alpha-node\" refused the request: Your Task is DONE or CANCELLED, …" and is never received. The fenced Team's coordinator is still live on beta. `fenced_remote` itself is logged only at info level and is covered by unit tests (investigation, Not Tested) |
| API-12 | AC-106, AC-304 (idle) | RC-12 | ENV-1 | Pass | The remote Agent run shuts down after the grace (29–34 s after the case starts). Both Studio members' CLI processes are gone after the grace. The lead's follow-up restores the coordinator once with `--conversation …`; the checker does not restart |
| API-13 | AC-106, REQ-108, AC-304 (restarts) | RC-13 | ENV-1 | Pass | After beta restarts, the lead's follow-up restores beta's Team (coordinator relaunched with `--conversation`). After alpha restarts, the coordinator's reply is accepted ("Delivered message to delegator_… on node \"alpha-node\".") and the lead reads it with its sender line. Beta's Team `delegatedFrom` is unchanged, and alpha's Team tree links (Agent + Team) are unchanged on disk |
| API-24 | REQ-307, RU-2 | RC-24 | ENV-1 | Pass | `terminateAgentTeamRun` → `{"success":true,"message":"Agent team run terminated successfully."}`. The processes are gone and history shows `isActive: false`. The lead's next message restores the coordinator with `--conversation` and it receives the message |
| API-25 | AC-306 | `tests/e2e/projects`, `run-history`, `agent-team-runs`, `agent-org-runs`, `app-data-migrations`, switch on | ENV-2 | Pass (FU-003 of autobyteus-191 is outside scope) | `API-25-same-node-e2e-switch-on.log`: `Test Files 1 failed \| 44 passed (45)`, `Tests 2 failed \| 168 passed \| 4 skipped (174)`. The only failures are `delegated-launch-config-defaults` at lines 521/639, the same stale suite as 191's FU-003 (`launch: null` vs `followsTeam`; `source.members` undefined). This change touches no launch-recording code. The local Team copy suites (`delegated-team-lazy-member-activation`, `task-existing-copy-assignment`, `unclean-shutdown-delegated-team-restore`, `delegated-copy-member-contact-host`, …) pass. The first attempt was stopped by my 10-minute tool limit and was rerun in full |
| API-26 | REQ-307, BEH-305 | browser journey on beta | ENV-3 | Pass | `API-26-browser-journey.log`, `API-26-beta-team-run-history-and-packet.png`, `API-26-beta-team-owner-message.png` (different MD5s). Beta's Temp Workspace → TEAMS → Studio Team (1) → the run shows lead (live) and checker (never started); opening it shows the coordinator's packet naming node "alpha-node". The owner's composer message is answered and recorded once on the server. "Terminate team" → Offline, history `isActive: false`, and no beta Team process remains. The setup's own delegation also lacks `node` (F-001) |

## Failures

| ID | Severity | Criteria | Observed | Expected | Evidence | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 (resolved in round 2 by `351b4dd93f`) | Medium (contract; the agent cannot tell from the result which node runs its Team, though messaging by run ID works) | REQ-304, AC-301 | The remote Team `delegate_task` result has `delegated, target_kind "team", target_team_run_id, target_team_coordinator_agent_run_id, task_id` and no `node` | `{…, node: "beta-node"}`, as for a remote Agent | `F-001-remote-team-result-without-node.log`; runs 2 and 3 (`:962`); API-26 setup | Preliminary: **Local Fix (Implementation Engineer)**. `remote-delegation.ts:69` sets `node` on every remote outcome, but `task-delegation-tool-serialization.ts:36-40` copies it only in the `agent` branch. One line in the Team branch, plus a unit test of the serializer for a remote Team outcome. RC-21 already asserts it (`expect.soft`, kept so the rest of the case reports) |

## Acceptance Criteria Coverage

| AC | Covered by | Status |
| --- | --- | --- |
| AC-301 | API-21, API-26 | Proven in round 2 (F-001 resolved; RC-21 asserts `node` and the exact result keys) |
| AC-302 | API-04 | Proven |
| AC-303 | API-22 | Proven |
| AC-304 | API-12, API-13 | Proven |
| AC-305 | API-23 | Proven (closure value `fenced_remote` by unit tests; its effects end to end) |
| AC-306 | API-01 … API-20, API-25, API-R1 | Proven (FU-003 of 191 is pre-existing and outside scope) |
| REQ-307 | API-21, API-24, API-26 | Proven |

## Durable Coverage Changes

`autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:

- **Contract.** Inbound and forged message bodies carry `targetRoot`. RC-20's key lists now require `targetRoot` and no `coordinatingRun` in messages.
- **Beta's set-up.** Adds Checker; Studio Team (Team default `alt-model`); Hollow Team; Codex Team. `AGY_FAKE_EXTRA_MODELS=alt-model`. Review Squad is removed.
- **RC-04.** The stale shared-Team refusal is replaced by the two AC-302 Team refusals and a "no Team run on beta" check.
- **New cases.** RC-21, RC-22, RC-23 and RC-24 are new.
- **RC-12.** The remote Team now also idles out and is restored. The "R1 is live" precondition is now only recorded, because the Team cases run before RC-12.
- **RC-13.** The remote Team is now also restored after the beta restart and replies after the alpha restart; its back-link is unchanged.
- **Helpers and header.** New helpers `betaTeamRunDirs`, `betaTeamTree`, `teamTaskResourcesWith`. The header describes the 247 cases.

## Residual Risks

- RSK-201: every member of a peer-started Team auto-approves. This is accepted in the requirements and was observed (`--dangerously-skip-permissions`, `autoExecuteTools: true`).
- RSK-301 is exercised in round 3 through its packet-failure trigger (RC-25). The busy-member case is exercised in round 3 (RC-12). The link-commit-failure trigger is not run; it leaves beta in the same state.
- Observation (round 3, RC-25): after the packet fails, alpha keeps the committed Team link to the unused Team run, and its Task record says `start: "failed"`. DEC-304 does not specify alpha's side. Nothing appears broken: the delegator was told the delegation failed. Delivery or the designer may decide whether this needs a follow-up.
- The wording residuals FU-002 (`AGENT_CANNOT_RUN` says "The Agent <Team>") and FU-003 (the `node` tool text says "agent") are asserted as implemented. They are not defects of this round.
- AC-113-style real cross-machine and Docker networking is unchanged from 191: only the user can check it.

## Decision

Round 3: **Pass, final confidence 95%.** Durable test code changed again (RC-25, RC-12, RC-13, RC-23, the proxy's `drop` hook, alpha at INFO), so it goes to the code reviewer for the proportional test-code review of the round-3 delta. Delivery (DR-001) is waiting on this.

Round 2: **Pass.** Next is the code reviewer, for the proportional test-code review of `d69676f1d4` and this round's RC-21 change (Large / High).

Round 1: Fail. Hand off to the code reviewer for failure-origin review of F-001 (preliminary: Local Fix, Implementation Engineer). After the fix: rebuild, then rerun RC-21 (the whole E2E once, since it is one shared sequence) and the serializer unit test. The rest of this round's evidence stays valid, because the fix changes only how the result is serialized.
