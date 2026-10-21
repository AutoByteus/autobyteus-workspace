# Handoff Summary — remote-agent-teams (autobyteus-247)

Status: **verified; finalized into `personal`** (DR-001). No release.

## Ticket

- Package: `remote-agent-teams`, Project Task `autobyteus-247`, part of autobyteus-25 (remote collaboration). An agent can delegate a text task to a **shared Agent Team** on a peer node. On that node the Team runs as an ordinary top-level Team run; only its coordinator starts, and every member is reachable by run ID in both directions.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed:
  - architecture review ARCH-REV-002, Pass;
  - code review CRR-001 Pass; CRR-002 found F-001; CRR-003 Pass;
  - API/E2E API-REV-001 Fail (F-001), API-REV-002 Pass, API-REV-003 Pass, 95%;
  - test-code review CRR-004 and CRR-005, Pass.
- Revisions: SR-001 … SR-006, ARCH-REV-001 … 002, IR-001 … IR-002, CRR-001 … CRR-005, API-REV-001 … 003, DR-001.
- Archived ticket folder: `tickets/done/remote-agent-teams/` on `personal`.

## What Changed

- **Node B, the receiving node:**
  - `RemoteTeamRunStarter` creates a peer-started Team run through `TeamRunService.createTeamRun`, with each member's resolved launch (own default, else the Team default; temp workspace; auto-approve) and `delegatedFrom` on the Team tree.
  - The Team root pairs the delegator with every member and has a quiet idle shutdown (`RemoteTeamIdleShutdown`).
  - `RemoteMessageReceiver` resolves `targetRoot` through `RemoteRootDirectory`, with a check against the root's stored links before any restore.
- **Node A, the delegating node:**
  - The remote Team link (`teamRunId`, `nodeId`, `coordinatorAddress`, `members`) is stored in the topmost tree.
  - The endpoint kind `delegated_team` serves each member, coordinator included.
  - The `delegate_task` result has the local Team shape plus `node` (the F-001 fix).
  - Saved Tasks and closure fencing (`fenced_remote`) cover remote Teams.
- **Contract between nodes:** a kinded start answer for Agents and Teams; `targetRoot` on every message and work packet, replacing `coordinatingRun`. `REMOTE_TEAMS_NOT_SUPPORTED` is removed.
- **Web:** the Nodes tab note covers Agent Teams (en, zh-CN).
- **Tests:** the two-server E2E grows to 25 cases (RC-21 … RC-25 are new; RC-04/12/13/20/23 are extended), plus unit tests.
- **Docs:** the implementation updated CM-10 … CM-12, `remote_collaboration.md`, `agent_team_execution.md`, `agent_communication.md` and `agent_tools.md`. Delivery verified them and updated `autobyteus-web/docs/settings.md` (`docs-sync-report.md`).

## Integration

- `origin/personal` advanced from `4a05909457` to `a22394f0ce`, the beta.5 release records under `tickets/done/` only.
- A checkpoint commit `80e62924d8` added the reviewer's CRR-003/004 documents. The merge `a74677df99` was clean, and no file outside `tickets/done/` changed.
- No delivery rerun was needed: no code, test or long-lived doc came in from the base. API/E2E round 3 ran on this exact HEAD: runs 7 and 8 at `a74677df99` with the final test file `340bfa99b7`.
- `origin/personal` was still `a22394f0ce` at verification.

## Verification

- **Judged from the evidence: sufficient.** AC-301 … AC-306 and REQ-307 are directly proven.
- **Confidence:** final 95% (post-repository 93%), with no category below 90%.
  - At delivery's request (DR-001), API/E2E added the mandatory scorecard that round 2 lacked.
  - Scored honestly, round 2 came out at about 94%, below the target.
  - API/E2E closed the gaps with durable cases (round 3), and CRR-005 passed them.
- **Evidence opened by delivery:**
  - the receipts of runs 4/5 (24/24) and 7/8 (25/25), all with clean cleanup;
  - RC-21: the exact result keys including `node`, the Team link, member launches (`alt-model` for the checker), `delegatedFrom`;
  - RC-22: four messages, once in each log, view `gaps: []`;
  - RC-04: the two Team refusals;
  - RC-12: a busy member holds the Team; it stops at about 150 s;
  - RC-13: a cold wake by the Team's reply;
  - RC-23: the saved-Task refusals and the `fenced_remote` record;
  - RC-24: Stop, then restore;
  - RC-25: a dropped work packet leaves one unused Team run, later stopped;
  - API-R2 13/13; API-25 (the two failures are 191's FU-003);
  - both API-26 screenshots (distinct, matching the log).
- **User check:** not needed. No criterion of this ticket is user-only. The scorecard's "real-network check" concerns the transport between nodes, which is unchanged from autobyteus-191, whose desktop + Docker check the user confirmed.

## Release

- `No release`. None was requested; `RELEASE.md` defaults to finalize only. The change ships with the next release, and a beta `1.5.8-beta.6` can be cut on request.

## Residual Risks And Follow-ups

- **RSK-201:** every member of a peer-started Team auto-approves (accepted, observed).
- **RSK-301:** the dropped-packet trigger is tested (RC-25). The commit-failure trigger leaves the same state on B and is stopped by the same idle schedule.
  - A keeps the committed Team link after a refused work packet, as slice 1 decided for Agents (SR-014 b).
- **Follow-ups in `follow-ups.md`,** sent by the Solution Designer:
  - FU-001, `send_message_to` by run ID to unlinked runs on another node;
  - FU-002, Team wording in the `AGENT_CANNOT_RUN` / `AGENT_NOT_FOUND` texts;
  - FU-003, the `node` parameter text says "agent".
- **Not applied (optional):**
  - C-1 (`RemoteDelegation.startedTeams` as a `WeakMap`);
  - the CRR-004/005 test notes: RC-12's lower bound; RC-23's matcher format; RC-04 pinning the FU-002 wording.
