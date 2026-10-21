# Implementation Revision Record — Remote Agent Teams (autobyteus-247)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A (non-blocking notes N-301 … N-304 implemented) | `Initial Baseline` | SR-006, ARCH-REV-002 | Implemented; to code review |

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
