# Implementation Revision Record — list-running-agents (autobyteus-492)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-003 Pass on SR-007 and ARCH-REV-004 Pass on SR-008 (SR-009 wording) | N/A | `Initial Baseline` | SR-007, SR-008, SR-009, ARCH-REV-003, ARCH-REV-004 | Implemented at `deacacf948`; ready for code review |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (Fail) | CR-001, CR-002 | `Local Fix` | SR-009, ARCH-REV-004, CRR-001 | Fixed at `5f89ecbdf5`; ready for the delta review |

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

### IR-002 — Contract model refuses row 13 for every sender; stale comments (CRR-001)

- Triggering role, report path, and round: code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/code-review-report.md`; CRR-001 (review of `deacacf948`).
- Triggering finding IDs: CR-001, CR-002.
- Classification: `Local Fix`
- Prior authoritative result: IR-001 at `deacacf948`, CRR-001 Fail.
- Current authoritative result: both fixed at `5f89ecbdf5`; `task_size=Large`, `architectural_risk=High` unchanged.
- Related solution revision IDs: SR-009
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why recorded: CR-001: my CM-13 edit of the 461 contract model returned `unrelated` for any sender other than the delegator before the closed-entry check, so the model delivered to a fenced peer run (row 13), against REQ-011, DEC-011 and the server's `closedPeerRunRefusal`. CR-002: two comments still named the removed different-Task refusal.
- Approved behavior or requirement IDs affected: REQ-011, AC-008 (rows 13, 14), DEC-011. Production behavior unchanged (the server code already refused row 13).
- Implementation delta: `model.py` cross-node branch: on the node that holds the Task (`a[0] == local[0]`), a sender other than the delegator is refused `TASK_AGENT_RESOURCE_CLOSED` when that node's entries for the peer run exist and are all closed; otherwise `unrelated` (an open entry, or a sender on the run's own node). The delegator's path is unchanged. Comments: `root-communication-engine.ts:127`, `root-message-append.ts:14` now say a closed Task only.
- Changed files or areas: `tickets/done/delegated-copies-outlive-delegator-461/evidence/collaboration-model/model.py`; the two comments.
- Local validation and result: IMP-05 rerun (`--check`: the fixture matches the fixed model, unchanged); IMP-08 probe of row 13 at S18 (entry open: the delegator and three other runs of A are delivered) and S19 (closed: all four refused `TASK_AGENT_RESOURCE_CLOSED`); `tests/unit/agent-collaboration/execution/communication` 23/23. Row 14 (a sender in another run on B) has no run to send from in the §5.1 story; the reviewer did not require a new step, and the server's row 14 is covered by design (no Task entries on B).
- Next recipient or routing: code reviewer (targeted delta review).
- Remaining limitations or risks: as IR-001; FU-004 (the model's placement) recorded by the code reviewer.

