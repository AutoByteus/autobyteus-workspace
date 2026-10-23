# Implementation Revision Record — Remote Agent Teams (autobyteus-247)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A (non-blocking notes N-301 … N-304 implemented) | `Initial Baseline` | SR-006, ARCH-REV-002 | Implemented; CRR-001 Pass |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-002 (failure origin of API/E2E F-001, API-REV-001) | F-001 | `Local Fix` | CRR-001, CRR-002, API-REV-001 | Fixed; to code review |

## Revision Entries

### IR-001 — Remote Agent Teams, initial implementation

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/remote-agent-teams/design-review-report.md`, round 2 (ARCH-REV-002 Pass on design commit `173d336a2a`; N-304 addendum `e03f96871a`).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented in `9ec78440e2` (step 1: data model) and `13131733b9` (steps 2 … 6); implementation-scoped checks IMP-01 … IMP-06.
- Related solution revision IDs: SR-001 … SR-006
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-301 … BEH-305; REQ-301 … REQ-309; G-1 … G-9; N-301 … N-304.
- Implementation delta:
  - Step 1: kinded in-memory remote links and the stored Team link with validation; `delegatedFrom` on the Team tree; `agentRunIdsOfTree` covers Team link members and the tree's back-link delegator (standalone back-link passed as a parameter).
  - Contract: `targetRoot` on every message and work packet (`coordinatingRun` removed from messages); the delegated-runs answer union, parsed strictly by `PeerClient`.
  - Endpoints: `pairedAgentRunIds` as the one pair rule; `delegated_team` endpoints; back-link pairs; `teamLinkFor`, `admitsWorkPacket`, `admitsInbound`, `storedRemoteLinkCheck`.
  - A: Team planning and link in `RemoteDelegation`; `RemoteTaskActivation` takes the link union and the ingress; G-3 (`isRemoteTeam`), G-4 (Team closure fence), G-6 (`teamCoordinatorOf` from `teamLinkFor`); the three roots' inbound receiver is the message's target.
  - B: `RemoteTeamRunStarter`; `createTeamRun` with `delegatedFrom`; `TeamLayoutMismatchError`; the Team root's back-link (`team-run-remote-links.ts`), work packet (`TeamRunMessageDelivery.acceptRemoteWorkPacket`), `RemoteTeamIdleShutdown` and `RootTeamRun.shutDownIfQuiet()` / `terminate(quiet)`; lease-release hook.
  - `RemoteMessageReceiver` by `targetRoot` kind with `RemoteRootDirectory.storedLinkCheck` (root managers) before a restore.
  - `REMOTE_TEAMS_NOT_SUPPORTED` removed; `NO_DEFAULT_RUNTIME` worded from B's reason; docs; Nodes tab note (en, zh-CN).
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: IMP-01 typecheck, IMP-02 remote and store tests, IMP-03 affected areas, IMP-04 full server unit suite, IMP-05 web card and localization specs, IMP-06 rendered Nodes tab (see the handoff's Checks Run for results and evidence).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: FU-002 (Team wording of `AGENT_CANNOT_RUN` / `AGENT_NOT_FOUND`), FU-003 (approved `node` tool text); the stale two-server E2E assertion for `REMOTE_TEAMS_NOT_SUPPORTED` (API/E2E); two-server E2E for AC-301 … AC-306 not run (API/E2E).

### IR-002 — `node` in a remote Team's `delegate_task` result (F-001)

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/remote-agent-teams/code-review-report.md` § Current Result — API/E2E Failure-Origin Review (CRR-002), from API/E2E `api-e2e-execution-coverage-report.md` (API-REV-001, commit `d69676f1d4`, RC-21).
- Triggering finding IDs: F-001
- Classification: `Local Fix` (classification stays Large / High)
- Prior authoritative result: IR-001 (`13131733b9`): a remote Team's tool result had no `node` (`evidence/api-e2e/F-001-remote-team-result-without-node.log`).
- Current authoritative result: `351b4dd93f`: the tool result is `{delegated: true, target_kind: "team", target_team_run_id, target_team_coordinator_agent_run_id, node, task_id}` for a remote Team; a local Team has no `node`.
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: `RemoteDelegation.delegate` set `node` on the internal outcome, but `toDelegateTaskResult` copied it only for an Agent, and the Team variant of the strict result schema did not allow it.
- Approved behavior or requirement IDs affected: REQ-304, AC-301, BEH-301.
- Implementation delta:
  - `task-delegation-result-contract.ts`: `node` (optional, non-blank) on the Team variant of `DelegateTaskResultSchema`; the MCP output schema follows.
  - `task-delegation-tool-serialization.ts`: `node` moved into the shared extras, so both kinds carry it.
  - `team-run-remote-links.ts`: the comment no longer mentions nested sub-team members (CRR-001 C-7; comment only).
  - Tests: `collaboration-result-contracts.test.ts` (remote Team with `node` and local Team without, through the serializer and the schema; the MCP output schema accepts a Team result with `node`); `task-delegation-runtime-descriptions.test.ts` (the Team branch's properties include optional `node`).
- Changed files or areas: the two source files above and the comment; the two test files.
- Local validation and result: IMP-07 (typecheck; agent-tools, the launch-source projection and remote-collaboration tests), IMP-08 (full server unit suite).
- Next recipient or routing: Code Reviewer (targeted source review), then API/E2E reruns the two-server E2E on a rebuilt dist.
- Remaining limitations or risks: CRR-001 C-1 (optional: `RemoteDelegation.startedTeams` keeps an entry when dispatch fails between planning and activation) is not changed in this Local Fix; FU-002, FU-003 unchanged.
