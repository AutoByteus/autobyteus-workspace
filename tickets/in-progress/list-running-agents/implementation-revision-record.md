# Implementation Revision Record — list-running-agents (autobyteus-492)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-003 Pass on SR-007 and ARCH-REV-004 Pass on SR-008 (SR-009 wording) | N/A | `Initial Baseline` | SR-007, SR-008, SR-009, ARCH-REV-003, ARCH-REV-004 | Implemented at `deacacf948`; ready for code review |

## Revision Entries

### IR-001 — The run ID is the address; `list_running_agents`

- Triggering role, report path, and round: architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-review-report.md`; rounds 3 and 4.
- Triggering finding IDs: N/A (AR-008 asked to list `collaboration-root-resolver.ts`; done in the handoff).
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete at `deacacf948`; `task_size=Large`, `architectural_risk=High` confirmed.
- Related solution revision IDs: SR-007, SR-008, SR-009
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed package.
- Approved behavior or requirement IDs affected: BEH-002 … BEH-007; REQ-001 … REQ-012; AC-001 … AC-009; DEC-014 (G-1).
- Implementation delta: `RunningAgents` and `RunningAgentsListing` (new owners), `CrossRunMessageDelivery` unrelated admission and `closedPeerRunRefusal`, router `node` path and R-9 removal, `unlinked_run` endpoint and endpoint choice, the three roots' `deliverToPeerRun` / `acceptPeerRunMessage`, `run-messages` and `running-agents` peer routes, the tool on every runtime, `publishToViews` (G-1), `CollaborationRootResolver.resolveActive` (G-2), docs (CM-13), result catalogue, contract fixture regenerated from the updated 461 model. Deviations from the spec's wording are listed with reasons in the handoff.
- Changed files or areas: see the handoff § Key Files Or Areas (91 files in the commit, 56 of them source).
- Local validation and result: IMP-01 … IMP-07 in the handoff (both typechecks pass; unit suite passes except three out-of-scope timing failures recorded as FU-001 … FU-003).
- Next recipient or routing: code reviewer (Large/High).
- Remaining limitations or risks: two-node behavior over HTTP unverified (UNK-001); stale E2E assertions listed for API/E2E.
