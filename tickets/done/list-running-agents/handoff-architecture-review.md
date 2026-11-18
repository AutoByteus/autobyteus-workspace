# Handoff — Architecture Design Complete: list-running-agents (autobyteus-492)

- Result: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High` → independent architecture review.
- Package: `list-running-agents`; Project Task `autobyteus-492` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the founder.
- Current revision: `SR-007`, for ARCH-REV-003 (ARCH-REV-001 reviewed SR-005: Fail; ARCH-REV-002 reviewed SR-006: Fail, AR-007, fixed in SR-007). Responses to AR-001 … AR-006 and the founder's entry fields: `solution-revision-record.md` § SR-006.
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`, `codex/list-running-agents`; base `origin/personal` at `bd2053ee51`; finalization target `origin/personal`. Release only on the founder's word.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/`

## Original request (short)

The founder wants a tool "list running agents", the pair of `list_available_agents`, so an agent (chiefly a Project Task Manager) can find and message agents that already run, on its node or another node, without a person giving it a run ID. Delegating to a running agent is explicitly not wanted.

## Approved basis (the founder's words, 2026-11-18, in the Solution Designer's conversation)

1. "As long as you know the target's agent run ID you should be able to send a message to it … doesn't matter if you're a task agent, a member in a task agent team, or from a remote node." (DEC-001, DEC-002)
2. "send_message_to also adds this node ID, then the target agent run ID … the same for delegate_task." (DEC-007)
3. "… list_running_agents should only return the standalone ones [started by the user]." (REQ-001)
6. Entry fields: "if it's a standalone agent you return the agent run ID … with its workspace … for agent team you return the team run ID and also the coordinator agent run ID … similar to delegate task"; "the workspace information for agent team of course should return" (DEC-013, SR-006)
5. "At least for now we don't have to return that information [user-started organizations] … I don't see much usage for messaging an organization." (DEC-004, SR-005: Org runs are not listed)
4. Asked whether a team run ID should reach the coordinator: "I think it's better to message the coordinator directly instead of messaging the team." (DEC-012, SR-004: today's rule kept; the list gives the coordinator's run ID)

Decided by the Solution Designer within that direction (founder informed): a stopped run is not woken by a sender no Task relates to (DEC-003); a closed Task's run stays closed (DEC-011); entry shapes and fields (DEC-004/005/008/009/010).

## What the design does (see `design-spec.md`)

- **Message rule ("the run ID is the address"):** `send_message_to(run ID)` reaches any running agent of another local run (DS-003, replacing `TASK_AGENT_RESOURCE_CONFLICT`); with the new `node` field, any running agent of a paired node (DS-004: an `unlinked_run` endpoint + new peer request `POST /rest/remote/run-messages`); a teammate of a delegator reaches the linked remote run too (DS-006). A team is messaged through its coordinator's run ID, as today; a peer gives the same `TARGET_IS_TEAM_RUN` guidance (DEC-012, SR-004). Task-related wake/reopen, the closed-Task refusal and links are unchanged.
- **List:** opt-in tool `list_running_agents({node?, address?, state?})`: the running Agent and Team runs a person started (no Org runs, SR-005), with the ID names of `delegate_task` (Agent `agent_run_id`; Team `team_run_id` and `team_coordinator_agent_run_id`), `workspace`, name, address, state, start time and Project (SR-006); from a peer through new `POST /rest/remote/running-agents`. No content.
- **One owner of "running":** `RunningAgents` (live root directory + per-kind live statuses), used by local delivery, the peer receiver and the listing.

## Evidence

- PRB-002 (live app): a message to another, unrelated Project Task Manager on this node is refused `TASK_AGENT_RESOURCE_CONFLICT` (Reproduced).
- PRB-001 (live app): an unknown run ID → `TARGET_AGENT_RUN_NOT_ACTIVE` (Reproduced).
- PRB-003: router and remote messaging unit tests, 28/28 on base (Measured, with fakes).
- Cross-node: stated from code and tests (no second node in this investigation); the build's two-server E2E verifies (UNK-001).

## Please review especially

- ARCH-REV-001 responses (SR-006): AR-001 `closedPeerRunRefusal` on the `node` path (DS-004, row 13); AR-005 outcome (REQ-011, DEC-011, row 14); AR-006 `teamCoordinatorOf`; AR-004 `ownershipChain` removal; AR-003 texts.
- The entry-form table (design § Concrete Examples): every sender/target kind, local and remote.
- `RunningAgents` as the one definition of "running" (idle-shut-down hosts are not running).
- Splitting `run-messages` from linked `messages` (different subject: no `targetRoot`, never restores).
- The removal plan (CONFLICT branch, R-9, outbound pair refusal) and the test fixtures that encode the old rule.

## Open risks

- Inbound messages from any agent of a paired node (accepted by the founder; peer signing and pairing gate it; no wake; no attachments across nodes).
- At-most-once delivery between nodes (existing FU-002 of autobyteus-191).

## Documents

- `handoff-architecture-review.md` (this file), `requirements-doc.md` (Approved, SR-003), `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (Ready), `follow-ups.md` (none).

## Route record

- `get_handoff_rules` 2026-11-18: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`.
- ARCH-REV-003, 2026-11-18: Pass for SR-007 (bd52ef4e15); no findings open. The reviewer handed off to `/implementation_engineer` (informational; recorded, no further routing by the Solution Designer).
- SR-008, 2026-11-18: the Solution Designer's walkthrough found G-1 (unrelated messages in run views) and G-2 (`resolveActive`); fixed in the design; sent for ARCH-REV-004. Implementation had started on SR-007.
- ARCH-REV-004, 2026-11-18: Pass for SR-008 (111ebbc096); AR-008 (Low) corrected in SR-009 (wording). The reviewer handed the SR-008 delta to `/implementation_engineer`.
