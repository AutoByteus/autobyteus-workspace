# Requirements Visualization Brief — Send Message vs Delegate Task

## Request Classification

- Mode: `Requirements Visualization`
- Outcome requested from Product Design & Prototyping: Exploratory interactive clarification, not a final product prototype
- Requirements revision: `RER-002`
- User-review objective: Let the user directly see how the same logical Agent/AgentTeam address produces different execution and lifecycle outcomes under `send_message_to` versus `delegate_task`, then choose DEC-001 confidently.
- Target product UI: None. This visualizer explains backend orchestration semantics and does not define a production screen or final UI/UX specification.

## Focused Decision

### DEC-001

After a successful delegation, should genuinely additional ordinary clarification to that exact fresh task execution remain allowed through the returned `target_agent_run_id`?

- **Option A — recommended:** Preserve exact-run clarification. Forbid repeating the delegated packet, using the original logical address as a task alias, or using messages for formal lifecycle transitions.
- **Option B:** Prohibit all delegator-to-assignee ordinary follow-up after delegation. The task packet and formal result/review lifecycle become the only delegator/assignee exchange.

The visualizer must not treat either option as approved. It should make the consequences understandable and capture/return the user's preference and reasoning.

## Concepts The User Must Be Able To Distinguish

1. **Mounted/configured execution:** The existing Agent execution or AgentTeam coordinator ingress selected by logical `recipient_address` messaging.
2. **Fresh task execution:** The new task Agent or task AgentTeam created by one successful `delegate_task` call.
3. **Logical address:** Selects a configured Agent/AgentTeam placement; it does not identify a particular task execution.
4. **Exact AgentRun ID:** Selects one currently active concrete execution, including a returned task Agent or task Team coordinator.
5. **Task ID:** Selects the formal task lifecycle for review; it is not a message recipient.
6. **Ordinary message:** Delivers content but creates no task and changes no task status.
7. **Delegation:** Creates one tracked task and fresh execution and already delivers the complete work packet.
8. **Formal lifecycle:** `submit_task_result` and `review_task_result`, not free-form “finished,” “accept,” or “revise” messages.

## Critical Runnable Scenarios

| Visualization Scenario | Starting State | Action | Required Visible Outcome | Requirement IDs |
| --- | --- | --- | --- | --- |
| Ordinary Agent message | Planner and mounted `/reviewer` exist | `send_message_to(recipient_address="/reviewer")` | Existing reviewer execution receives one message; no task or fresh execution appears | REQ-001, REQ-003, AC-002 |
| Agent task delegation | Same mounted topology | `delegate_task(recipient_address="/reviewer")` | A separate fresh task Agent execution appears, receives the complete packet, and returns task ID plus exact task run ID | REQ-002, REQ-003, AC-003 |
| Ordinary AgentTeam message | Mounted `/review_team` exists with configured coordinator | `send_message_to(recipient_address="/review_team")` | Existing configured coordinator ingress receives the message; no new Team execution appears | REQ-001, REQ-007, AC-008 |
| AgentTeam task delegation | Same mounted topology | `delegate_task(recipient_address="/review_team")` | A separate fresh task Team execution appears; its configured coordinator receives the complete packet | REQ-002, REQ-007, AC-008 |
| Incorrect duplicate sequence | A fresh delegated execution is active | Caller sends the same work through the original logical address | Visualizer shows that the packet was already delivered and that the logical message targets the mounted/configured ingress, not the fresh task execution; sequence is marked semantically wrong | REQ-003, REQ-004, AC-005 |
| Option A clarification | A fresh delegated execution is active and its returned run ID is visible | Caller sends genuinely new clarification to `target_agent_run_id` | Exact fresh task ingress receives only the additional clarification; no new task/status change occurs | REQ-004, AC-004, DEC-001 |
| Option B comparison | Same active task | User selects prohibition policy | Visualizer shows no ordinary delegator-to-assignee follow-up path and explains the lost clarification capability | DEC-001 |
| Result and review | Active delegated task | Assignee submits result; delegator accepts or requests revision | Task state changes only through task tools; equivalent message wording has no lifecycle effect | REQ-005, AC-006 |
| Delegation failure | Activation cannot start | `delegate_task` returns `not_started` | No fresh contactable execution or run ID appears; ordinary messaging is not presented as equivalent task activation | REQ-006, AC-007 |

## Review Interaction Objective

The user should be able to:

- step through message-only and task-only paths from the same mounted topology;
- visually keep the mounted/configured execution separate from each fresh task execution;
- compare Agent and AgentTeam targets;
- inspect the meaning of `recipient_address`, returned `target_agent_run_id`, and `task_id` at each step;
- see the incorrect duplicate sequence and why it can reach the wrong concrete execution;
- compare DEC-001 Option A and Option B consequences;
- provide a clear preference and comments that Product Prototyper returns to Requirements Engineering.

Product Design & Prototyping owns the visual design and implementation. The visualizer may choose any clear representation as long as the semantic outcomes above remain accurate.

## Constraints And Non-Goals

- Do not represent this as a proposed production AutoByteus UI.
- Do not produce or claim a final `ui-ux-spec.md`; this is exploratory requirements clarification.
- Do not change the requirements, tool schemas, runtime behavior, architecture, or task lifecycle inside the visualizer.
- Use deterministic illustrative fixture names/IDs and label them illustrative.
- Do not imply that `send_message_to` is synchronous or that `delegate_task` is asynchronous as the product distinction. The distinction is existing-execution communication versus fresh task-execution creation/lifecycle.
- Do not imply that the original logical address becomes an alias for a fresh delegated execution.
- Do not infer user approval from viewing or interacting; return the review URL and any captured preference to Requirements Engineering.

## Source Locator And Canonical Requirements

- Requirements task workspace: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics`
- Source repository revision investigated: `9d0fd7c570d58da1af2c7a40279327c8a20a8093`
- Target frontend locator: `N/A — no existing product frontend is selected; this is a standalone exploratory requirements visualizer for backend semantics`
- Canonical requirements: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-doc.md`
- Investigation evidence: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/investigation-notes.md`
- Requirements revision record: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-revision-record.md`
- Orchestration decision table: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/orchestration-decision-table.md`
- Existing separate prototype repository/root: `N/A — Product Design & Prototyping to establish or select its own externally owned visualizer workspace`

## Expected Return Package

Return a `Requirements Visualization Ready` outcome containing:

- stable Product-owned ticket/package identifier;
- separate Product-owned repository/root and accepted visualizer revision;
- runnable review URL;
- durable visualizer source/support artifact paths;
- scenarios implemented and any mocked/illustrative details;
- any requirement-impact or not-recommended finding;
- captured user decision only if the user actually confirms it during Product review; otherwise state that user confirmation remains pending.
