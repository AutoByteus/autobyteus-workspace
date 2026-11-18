# Handoff — Architecture Design Complete: list-running-agents (autobyteus-492)

- Result: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High` → independent architecture review.
- Package: `list-running-agents`; Project Task `autobyteus-492` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the founder.
- Current revision: `SR-003`.
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`, `codex/list-running-agents`; base `origin/personal` at `bd2053ee51`; finalization target `origin/personal`. Release only on the founder's word.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/`

## Original request (short)

The founder wants a tool "list running agents", the pair of `list_available_agents`, so an agent (chiefly a Project Task Manager) can find and message agents that already run, on its node or another node, without a person giving it a run ID. Delegating to a running agent is explicitly not wanted.

## Approved basis (the founder's words, 2026-11-18, in the Solution Designer's conversation)

1. "As long as you know the target's agent run ID you should be able to send a message to it … doesn't matter if you're a task agent, a member in a task agent team, or from a remote node." (DEC-001, DEC-002)
2. "send_message_to also adds this node ID, then the target agent run ID … the same for delegate_task." (DEC-007)
3. "If you know the agent run ID or the agent team run ID, then you should be able to use send_message_to … list_running_agents should only return the standalone ones [started by the user]." (DEC-012, REQ-001)

Decided by the Solution Designer within that direction (founder informed): a stopped run is not woken by a sender no Task relates to (DEC-003); a closed Task's run stays closed (DEC-011); entry shapes and fields (DEC-004/005/008/009/010).

## What the design does (see `design-spec.md`)

- **Message rule ("the run ID is the address"):** `send_message_to(run ID)` reaches any running agent of another local run (DS-003, replacing `TASK_AGENT_RESOURCE_CONFLICT`); with the new `node` field, any running agent of a paired node (DS-004: an `unlinked_run` endpoint + new peer request `POST /rest/remote/run-messages`); a teammate of a delegator reaches the linked remote run too (DS-006). A team run ID reaches its coordinator (DEC-012). Task-related wake/reopen, the closed-Task refusal and links are unchanged.
- **List:** opt-in tool `list_running_agents({node?, address?, state?})`: running runs a person started (Agent, Team, Org with its units), with run ID, name, address, state, start time, Project; from a peer through new `POST /rest/remote/running-agents`. No content.
- **One owner of "running":** `RunningAgents` (live root directory + per-kind live statuses), used by local delivery, the peer receiver and the listing.

## Evidence

- PRB-002 (live app): a message to another, unrelated Project Task Manager on this node is refused `TASK_AGENT_RESOURCE_CONFLICT` (Reproduced).
- PRB-001 (live app): an unknown run ID → `TARGET_AGENT_RUN_NOT_ACTIVE` (Reproduced).
- PRB-003: router and remote messaging unit tests, 28/28 on base (Measured, with fakes).
- Cross-node: stated from code and tests (no second node in this investigation); the build's two-server E2E verifies (UNK-001).

## Please review especially

- The entry-form table (design § Concrete Examples): every sender/target kind, local and remote.
- `RunningAgents` as the one definition of "running" (idle-shut-down hosts are not running).
- Splitting `run-messages` from linked `messages` (different subject: no `targetRoot`, never restores).
- The removal plan (CONFLICT branch, R-9, outbound pair refusal, `TARGET_IS_TEAM_RUN`) and the test fixtures that encode the old rule.

## Open risks

- Inbound messages from any agent of a paired node (accepted by the founder; peer signing and pairing gate it; no wake; no attachments across nodes).
- At-most-once delivery between nodes (existing FU-002 of autobyteus-191).

## Documents

- `handoff-architecture-review.md` (this file), `requirements-doc.md` (Approved, SR-003), `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (Ready), `follow-ups.md` (none).

## Route record

- `get_handoff_rules` 2026-11-18: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`.
