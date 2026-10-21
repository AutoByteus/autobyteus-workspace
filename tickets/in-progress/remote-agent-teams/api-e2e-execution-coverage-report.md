# API/E2E Execution Coverage Report — autobyteus-247 (Remote Agent Teams)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams`; evidence in `…/evidence/api-e2e/`.

## Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 1)
- Progress log: `…/api-e2e-test-progress.md`
- Revision record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Trigger: CRR-001 pass of IR-001. Code `9ec78440e2` + `13131733b9`, documents `824562b6a2`, branch `codex/remote-agent-teams`. Size Large, risk High.
- Round: 1
- **Result: Fail.** There is one implementation failure, F-001: the `delegate_task` result for a remote Team does not name the node (REQ-304, AC-301). Everything else passes.
- Durable coverage changed: Yes. The two-server E2E is updated; the change is uncommitted source, and this report commits it with my documents.

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
| F-001 | Medium (contract; the agent cannot tell from the result which node runs its Team, though messaging by run ID works) | REQ-304, AC-301 | The remote Team `delegate_task` result has `delegated, target_kind "team", target_team_run_id, target_team_coordinator_agent_run_id, task_id` and no `node` | `{…, node: "beta-node"}`, as for a remote Agent | `F-001-remote-team-result-without-node.log`; runs 2 and 3 (`:962`); API-26 setup | Preliminary: **Local Fix (Implementation Engineer)**. `remote-delegation.ts:69` sets `node` on every remote outcome, but `task-delegation-tool-serialization.ts:36-40` copies it only in the `agent` branch. One line in the Team branch, plus a unit test of the serializer for a remote Team outcome. RC-21 already asserts it (`expect.soft`, kept so the rest of the case reports) |

## Acceptance Criteria Coverage

| AC | Covered by | Status |
| --- | --- | --- |
| AC-301 | API-21, API-26 | **Failed (F-001)**; every other part is proven |
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
- RSK-301 and the deferred "busy member holds the idle shutdown" case (investigation, Not Tested) are not exercised end to end.
- The wording residuals FU-002 (`AGENT_CANNOT_RUN` says "The Agent <Team>") and FU-003 (the `node` tool text says "agent") are asserted as implemented. They are not defects of this round.
- AC-113-style real cross-machine and Docker networking is unchanged from 191: only the user can check it.

## Decision

Fail. Hand off to the code reviewer for failure-origin review of F-001 (preliminary: Local Fix, Implementation Engineer). After the fix: rebuild, then rerun RC-21 (the whole E2E once, since it is one shared sequence) and the serializer unit test. The rest of this round's evidence stays valid, because the fix changes only how the result is serialized.
