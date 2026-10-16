# Complete Views: What Each Agent Receives

Generated from `collaboration-prompt-wording-proposal.md` (same folder) by
`build-complete-views.py`; do not edit by hand. Purpose: read everything one agent receives
about collaboration in one place, and check what is repeated (§8).

What an agent receives about collaboration (verified on base `3712cd9bf0`):

| Part | Source | Who gets it |
| --- | --- | --- |
| System prompt: `## Agent Identity`, then the collaboration sections | `carpenter-prompt-composer.ts` | every agent |
| `## Team Instruction` | the team or organization definition | team and organization agents, when it has one |
| The task message (first message) | `task-execution-input.ts` | task agents; for a task agent team, its coordinator |
| The header of every received message | the three message builders (design spec) | every agent that receives a message |
| `send_message_to`, `delegate_task` | `runtime-agent-tool-exposure.ts` | every agent |
| `get_handoff_rules` | same | team and organization agents |
| `list_available_agents`, `create_task`, `update_task`, `list_project_tasks` | the agent definition's tool list | only when configured |
| The `@` note at the end of a user message | proposal §8 | when the user mentions agents |

Tool descriptions are identical for every agent, so they are written out once (§7). Names and
IDs are placeholders.

## 1. A standalone agent (the user starts one agent)

System prompt:

```markdown
## Agent Identity

- Name: Research Assistant
- Description: <the agent definition's description>

### Responsibilities and Boundaries

<the agent definition's own instructions>

## Working With Other Agents

You can delegate tasks to other agents and agent teams.

- To delegate a task, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its run ID. Your task description becomes the task agent's first message, together with your run ID so it can reply; don't send it again with `send_message_to`.
- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.
- To talk with a task agent, use `send_message_to` with its run ID. It talks back to you the same way. For a task agent team you get two run IDs: talk with the team through its coordinator's run ID (`target_team_coordinator_agent_run_id`).
- Every message you receive, including a new task, gives its sender run ID. To answer it, or to report your task result, use `send_message_to` with `target_agent_run_id` set to that sender run ID.
- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.
- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.

On receiving a request, follow your own instructions and skills. Use `send_message_to` for a purpose: to follow up with a task agent, or to answer one. Don't send acknowledgements, status chatter or promises to work.
```

First message: the user's message (plus the `@` note when the user mentions agents).

Tools: `send_message_to`, `delegate_task`; `list_available_agents` and the Task tools only when
configured.

## 2. A task agent (an agent delegated a task to an agent)

System prompt (with §5.3 Handoffs appended only if it has handoff rules):

```markdown
## Agent Identity

- Name: Web Researcher
- Description: <the agent definition's description>

### Responsibilities and Boundaries

<the agent definition's own instructions>

## Working With Other Agents

You are a task agent: another agent delegated a task to you. The task message tells you how to reach that agent; when you finish, or need something you can't get yourself, tell it using `send_message_to`.

You can also delegate tasks to other agents and agent teams.

- To delegate a task, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its run ID. Your task description becomes the task agent's first message, together with your run ID so it can reply; don't send it again with `send_message_to`.
- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.
- To talk with a task agent, use `send_message_to` with its run ID. It talks back to you the same way. For a task agent team you get two run IDs: talk with the team through its coordinator's run ID (`target_team_coordinator_agent_run_id`).
- Every message you receive, including a new task, gives its sender run ID. To answer it, or to report your task result, use `send_message_to` with `target_agent_run_id` set to that sender run ID.
- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.
- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.

On receiving a request, follow your own instructions and skills. Use `send_message_to` for a purpose: to report your result, to ask for input you need, or to follow up with or answer one of your task agents. Don't send acknowledgements, status chatter or promises to work.
```

First message (the task message):

```text
You have a new task from the agent with sender run ID "project_task_manager_3c9e".
When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run ID.

Description:
<the task description>

Reference files:
- /abs/path/to/file.md
```

Tools: as §1, plus `get_handoff_rules` when it was created inside a team or organization.

### 2a. A task agent created inside a team the user started, or inside an organization

Same system prompt and task message as §2 (it is not a member of a team). It can also reach the
configured agents and teams of that team or organization by address, e.g. when the user
mentions them (§11), and it has `get_handoff_rules`; without handoff rules that returns
`{"handoffs": []}` and its prompt has no Handoffs section.

### 2b. A task agent that has handoff rules

A task agent created from a configured agent's own definition at that agent's address keeps that
place's handoff rules (design T-1). Its prompt is §2 with the Handoffs section added:

```markdown
## Agent Identity

- Name: code reviewer
- Description: <the agent definition's description>

### Responsibilities and Boundaries

<the agent definition's own instructions>

## Working With Other Agents

You are a task agent: another agent delegated a task to you. The task message tells you how to reach that agent; when you finish, or need something you can't get yourself, tell it using `send_message_to`.

You can also delegate tasks to other agents and agent teams.

- To delegate a task, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its run ID. Your task description becomes the task agent's first message, together with your run ID so it can reply; don't send it again with `send_message_to`.
- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.
- To talk with a task agent, use `send_message_to` with its run ID. It talks back to you the same way. For a task agent team you get two run IDs: talk with the team through its coordinator's run ID (`target_team_coordinator_agent_run_id`).
- Every message you receive, including a new task, gives its sender run ID. To answer it, or to report your task result, use `send_message_to` with `target_agent_run_id` set to that sender run ID.
- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.
- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.

On receiving a request, follow your own instructions and skills. Use `send_message_to` for a purpose: to report your result, to ask for input you need, or to follow up with or answer one of your task agents. Don't send acknowledgements, status chatter or promises to work.

### Handoffs

When you finish your work or get stuck, call `get_handoff_rules`. Select the single rule whose `when` condition most specifically matches your outcome, and message only its `recipient_address` with `send_message_to`. Don't notify anyone else about the same outcome. If no rule fits and another agent gave you the task, tell that agent using its run ID; otherwise finish normally.
```

## 3. A member of an agent team (the user starts a team)

System prompt (for example the code reviewer; this member has handoff rules):

```markdown
## Agent Identity

- Name: code reviewer
- Description: <the agent definition's description>

### Responsibilities and Boundaries

<the agent definition's own instructions>

## Team Instruction

<the team definition's instruction, when it has one>

## AgentTeam Addressing

Agents and agent teams use filesystem-like logical addresses. Think of the top level as a directory, an Agent as a file, and an AgentTeam as a subdirectory that contains Agents. This analogy describes the structure and addressing model only; the addresses are not real filesystem paths.

The top level is represented by `/`. Its display or metadata name is not included in any address. An AgentTeam contains Agents only; a team is never inside another team. So an address has one level, such as `/A`, or two, such as `/C/D`.

The following example illustrates the address structure:

/
├── /A              (Agent)
├── /B              (Agent)
└── /C              (AgentTeam)
    ├── /C/D         (Agent)
    └── /C/E         (Agent)

In this example:

- `/A` and `/B` are Agents at the top level.
- `/C` is an AgentTeam at the top level.
- `/C/D` and `/C/E` are Agents inside AgentTeam `/C`.
- Each `/` separates one parent-to-child level.

The letters in this example are placeholders only. They do not identify available recipients. Use only an exact address you were given, for example in your handoff rules, your team instruction, the result of `list_available_agents` or the note about agents the user mentioned.

Every Agent and AgentTeam you can reach by address has one canonical absolute address beginning with `/`. Use that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and `/` itself are not valid recipients. A task agent or task agent team that you create by delegating can't be reached by address: talk with it using its run ID.

Sending a message to an AgentTeam address delivers it through that AgentTeam's configured coordinator.

## Working With Other Agents

On receiving a request, follow your own instructions and skills.

- To talk with a teammate, use `send_message_to` with their address.
- To get a task done outside your team, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its run ID. Your task description becomes the task agent's first message, together with your run ID so it can reply; don't send it again with `send_message_to`.
- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.
- To talk with a task agent, use `send_message_to` with its run ID. It talks back to you the same way. For a task agent team you get two run IDs: talk with the team through its coordinator's run ID (`target_team_coordinator_agent_run_id`).
- Every message you receive, including a new task, gives its sender run ID. To answer it, or to report your task result, use `send_message_to` with `target_agent_run_id` set to that sender run ID.
- Don't delegate to yourself, your teammates or your own team; talk with them instead.
- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.
- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.

Use `send_message_to` for a purpose: to hand off your work, to ask for input you need, to follow up with or answer one of your task agents, or to reply to the agent that gave you a task (by its run ID). Don't send acknowledgements, status chatter or promises to work.

### Handoffs

When you finish your work or get stuck, call `get_handoff_rules`. Select the single rule whose `when` condition most specifically matches your outcome, and message only its `recipient_address` with `send_message_to`. Don't notify anyone else about the same outcome. If no rule fits and another agent gave you the task, tell that agent using its run ID; otherwise finish normally.
```

A message it receives from a teammate:

```text
You received a message from the agent with sender run ID "code_reviewer_91c2".
message:
<content>
```

Tools: `get_handoff_rules`, `send_message_to`, `delegate_task`; `list_available_agents` and the
Task tools only when configured.

## 4. A member of a task agent team

System prompt: as §3 (with the organization sentence of §6 when the team was created inside an
organization). Its coordinator's first message is the task message (§2); the other members
receive messages from their teammates.

## 5. A direct agent of an organization (for example the Project Task Manager)

System prompt (this agent has handoff rules):

```markdown
## Agent Identity

- Name: project task manager
- Description: <the agent definition's description>

### Responsibilities and Boundaries

<the agent definition's own instructions>

## Team Instruction

<the organization definition's instruction, when it has one>

## AgentTeam Addressing

Agents and agent teams use filesystem-like logical addresses. Think of the top level as a directory, an Agent as a file, and an AgentTeam as a subdirectory that contains Agents. This analogy describes the structure and addressing model only; the addresses are not real filesystem paths.

The top level is represented by `/`. Its display or metadata name is not included in any address. An AgentTeam contains Agents only; a team is never inside another team. So an address has one level, such as `/A`, or two, such as `/C/D`.

The following example illustrates the address structure:

/
├── /A              (Agent)
├── /B              (Agent)
└── /C              (AgentTeam)
    ├── /C/D         (Agent)
    └── /C/E         (Agent)

In this example:

- `/A` and `/B` are Agents at the top level.
- `/C` is an AgentTeam at the top level.
- `/C/D` and `/C/E` are Agents inside AgentTeam `/C`.
- Each `/` separates one parent-to-child level.

The letters in this example are placeholders only. They do not identify available recipients. Use only an exact address you were given, for example in your handoff rules, your team instruction, the result of `list_available_agents` or the note about agents the user mentioned.

Every Agent and AgentTeam you can reach by address has one canonical absolute address beginning with `/`. Use that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and `/` itself are not valid recipients. A task agent or task agent team that you create by delegating can't be reached by address: talk with it using its run ID.

Sending a message to an AgentTeam address delivers it through that AgentTeam's configured coordinator.

## Working With Other Agents

On receiving a request, follow your own instructions and skills.

- To talk with an agent or agent team of your organization, use `send_message_to` with its address.
- To have a task done by a new agent, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its run ID. Even when an agent of your organization has that address, delegating creates a new task agent; it doesn't give the task to that agent. Your task description becomes the task agent's first message, together with your run ID so it can reply; don't send it again with `send_message_to`.
- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.
- To talk with a task agent, use `send_message_to` with its run ID. It talks back to you the same way. For a task agent team you get two run IDs: talk with the team through its coordinator's run ID (`target_team_coordinator_agent_run_id`).
- Every message you receive, including a new task, gives its sender run ID. To answer it, or to report your task result, use `send_message_to` with `target_agent_run_id` set to that sender run ID.
- Don't delegate to yourself.
- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.
- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.

Use `send_message_to` for a purpose: to hand off your work, to ask for input you need, to follow up with or answer one of your task agents, or to reply to the agent that gave you a task (by its run ID). Don't send acknowledgements, status chatter or promises to work.

### Handoffs

When you finish your work or get stuck, call `get_handoff_rules`. Select the single rule whose `when` condition most specifically matches your outcome, and message only its `recipient_address` with `send_message_to`. Don't notify anyone else about the same outcome. If no rule fits and another agent gave you the task, tell that agent using its run ID; otherwise finish normally.
```

Tools: as §3.

## 6. A member of an organization's team

System prompt: as §3, with this first bullet:

```markdown
- To talk with a teammate, use `send_message_to` with their address. You can also talk with the organization's other agents and agent teams at their addresses.
```

## 7. Tool descriptions (identical for every agent)

### `send_message_to`

```text
Send a self-contained request, result, question or blocker to an agent or agent team that already exists. Use exactly one selector, never both:
- recipient_address: an exact address beginning with '/'. A team's address reaches its coordinator. An address inside your own team reaches the member of your own team.
- target_agent_run_id: an agent's run ID. For a task agent team, use its coordinator's run ID; a team's own run ID is refused.
send_message_to never creates an agent; to have work done by a new agent, use delegate_task. It returns the run ID of the agent that received the message as target_agent_run_id, or null with the reason when the message can't be delivered.
```

Parameters:

- `recipient_address`: "An exact address beginning with '/'. Relative addresses, bare names and '/' alone are not valid."
- `target_agent_run_id`: "An agent's run ID. Unknown run IDs are rejected."
- `content`: "Self-contained work request, result, or specific blocker. State the requested work or outcome and relevant context; include important absolute paths here and put files the recipient should inspect in reference_files. Example: 'Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below.'" (unchanged)
- `message_type`: "Optional message type label." (unchanged)
- `reference_files`: "Optional attachment/reference list of absolute local file paths the recipient may need to inspect. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ['/Users/me/project/implementation-handoff.md', '/Users/me/project/test.log']." (unchanged)

### `delegate_task`

```text
Delegate a task to an agent or agent team. Use exactly one mode:
(1) recipient_address and description, with optional reference_files: creates a new task agent (or task agent team) that works on the task you describe;
(2) recipient_address and task_id: creates a new task agent (or task agent team) for that saved Task (its description and files);
(3) exactly one of target_agent_run_id or target_team_run_id, with task_id: gives the saved Task to one of your task agents (or task agent teams), which continues with its conversation; use it for follow-up work that builds on what that task agent already did. This works only when you made its most recent assignment and its current Task is DONE or CANCELLED; that earlier Task stays closed.
Never supply project_id. Delegating to yourself, a teammate or your own team is refused.
The task description and reference files become the task agent's first message (for a task agent team, its coordinator receives them), together with your run ID.
If you are a task agent yourself (another agent delegated your task to you or to your team), task_id is refused, and a delegation with a description returns no task_id: the new task agent's work is part of your Task. Otherwise, a delegation with a description also creates a Task with no Project and returns its task_id.
On success, delegated is true, target_kind is agent or team, and the result names the task agent: target_agent_run_id for a task agent; for a task agent team, target_team_run_id (the team; use it to give the team a later Task) and target_team_coordinator_agent_run_id (its coordinator; talk with the team through this run ID). launch_notes, when present, says which agent runs on a different runtime or model than configured. If delegated is false, nothing was created and message says why; correct the problem and delegate again, or report the failure.
```

Parameters:

- `recipient_address`: "Only for a new task agent: the exact address of an available agent or agent team, beginning with '/'. Every call with an address creates another task agent or task agent team. Omit it when you give a Task to one of your task agents with target_agent_run_id or target_team_run_id."
- `description`: "Only with recipient_address and without task_id. A complete, ready-to-work task description: objective, context, scope, constraints, what done looks like, expected output and reference guidance."
- `reference_files`: "Optional, only with recipient_address and description; not allowed with task_id, not even as an empty list. Absolute local file paths the task agent should read. Relative paths and URLs are rejected."
- `task_id`: "A saved Task's ID on this node; its saved text and files are used. With recipient_address: a new task agent works on the Task. With target_agent_run_id or target_team_run_id: that task agent takes on the Task. Blank, unknown, ambiguous, DONE or CANCELLED Tasks fail."
- `target_agent_run_id`: "One of your task agents, by the target_agent_run_id an earlier delegation returned. Supply only it and task_id. A task agent team's coordinator's run ID is refused: use target_team_run_id for a task agent team."
- `target_team_run_id`: "One of your task agent teams, by the target_team_run_id an earlier delegation returned (the team's run ID, not its coordinator's). Supply only it and task_id."

### `get_handoff_rules` (team and organization agents)

```text
Return your handoff rules, in order: each rule's when condition and the recipient_address to message. This read-only tool takes no arguments.
```

### `list_available_agents` (only when configured)

```text
List the agents and agent teams you can work with, each with its name, kind (agent or agent_team), address and description. This read-only tool takes no arguments.
```

### `update_task` (only when configured)

```text
Update a Task by its task_id: a Project Task, or the Task a description-only delegate_task created (it has no Project; delegate_task returned its task_id). Supply description and/or status (TODO, IN_PROGRESS, DONE, CANCELLED) and/or context_files; never project_id.
DONE means the work is finished; CANCELLED means the Task was dropped as not needed (not finished). Both stop the task agents whose current Task this is (never a task agent that has since been given another Task); their history is kept. Close a Task you delegated when its work is done.
To continue a closed Task with the same task agent, first set the Task to TODO or IN_PROGRESS; then, if you assigned the Task, message the task agent's run ID (for a task agent team, its coordinator's run ID): it continues with its conversation. A status change alone starts nothing. To give a task agent whose Task is DONE or CANCELLED a different Task, use delegate_task with its target_agent_run_id or target_team_run_id.
Optional context_files: absolute local file paths copied into a Project Task as context files; appended, never removed. Same file types and 25 MiB limit as the app; not for a Task with no Project. Any invalid file fails the whole call with no change. Unknown IDs fail; omitted fields and saved context are kept. Returns the recorded Task identity (projectId is null for a Task with no Project) and status, plus attachedContextFiles when the call attached files.
```

### `list_project_tasks` (only when configured)

```text
List all Tasks in the explicit project_id, optionally filtered by exact TODO, IN_PROGRESS, DONE or CANCELLED status (CANCELLED = dropped as not needed). Returns descriptions, saved context-file references, each Task's open assignments (assignments) and its closed ones (closedAssignments, one per earlier assignment period, so you can find the task agent that did a DONE Task). Each assignment names the task agent: {kind: agent, agentRunId} for a task agent, or {kind: team, teamRunId, teamCoordinatorAgentRunId} for a task agent team; plus who assigned it (assignedBy) and whether the work was accepted (outcome); accepted work is not necessarily finished. Give a follow-up Task to a task agent with delegate_task and its target_agent_run_id (agentRunId) or target_team_run_id (teamRunId); talk with it using send_message_to and its run ID (agentRunId, or teamCoordinatorAgentRunId for a task agent team). A Task whose assignments can't be read is marked assignments unavailable.
```

`create_task`: unchanged (no collaboration wording).

## 8. What Is Repeated

Counted in the fullest view, a team member (§3 + §7). "P" = system prompt, "T" = tool
description, "Pa" = parameter description. The limit is §1 principle 5 of the proposal: a
second place only when an agent lacking the first needs it.

| # | Statement | Where it appears | Times |
| --- | --- | --- | --- |
| R1 | A team's address reaches its coordinator | P addressing; T `send_message_to` (standalone agents have no addressing section) | 2 |
| R2 | For a task agent team, talk through the coordinator's run ID | P bullet 4 (what to do); T `delegate_task` result (which field is which); T `send_message_to` (a team's own run ID is refused) | 3 |
| R3 | Don't delegate to yourself, a teammate or your own team | P bullet 5; T `delegate_task` (refused) | 2 |
| R4 | The task description becomes the first message | P bullet 2; T `delegate_task` | 2 |
| R4a | Don't send the task description again | P bullet 2 | 1 |
| R5 | Every delegation to an address creates another task agent | P bullet 3; Pa `recipient_address` | 2 |
| R6 | Delegating creates a task agent and returns its run ID | P bullet 2; T `delegate_task` modes and result | 2 |
| R7 | Exactly one selector, never both | T `send_message_to` | 1 |
| R8 | Giving a saved Task to an existing task agent: conditions | T `delegate_task` mode (3) | 1 |
| R9 | Exact address; invalid forms | P addressing; Pa `send_message_to.recipient_address` (standalone agents have no addressing section) | 2 |
| R10 | Task agents are reached by ID, not by address | P addressing; P bullet 4 | 2 |
| R11 | Your ID goes with the task | P bullet 2; T `delegate_task` | 2 |
| R12 | The agent's own address | nowhere | 0 |
| R13 | Answer or report with `target_agent_run_id` set to the sender run ID | P answering bullet (every agent); task message reply line (task agents and coordinators, who may have no message yet); refusals' next step (after a mistake) | 3 |

## 9. Situations: what the recipient sees, and whether the sender's address would reach the sender

Every sender → recipient case. "Sees" is the text the recipient gets (task message or header,
§7 of the wording file). "Address reaches?" says whether replying to the sender's address would
reach the sender in that case (lookup: the recipient's own team first, then the agents and teams
configured in the run; `resolveMessageRecipient`). A task agent is never configured, so its address
reaches it only from inside its own team.

| # | Situation (sender → recipient) | Recipient sees | Sender's address | Address reaches? |
| --- | --- | --- | --- | --- |
| S1 | teammate → teammate, team the user started | header: `You received a message from the agent with sender run ID "code_reviewer_91c2".` | `/code_reviewer` | yes |
| S2 | member of a task agent team → its teammate | header (same shape) | `/software_engineering_team/code_reviewer` | yes (same team) |
| S3 | standalone agent (e.g. the Project Task Manager) delegates → its task agent or task agent team's coordinator | task message: `You have a new task from the agent with sender run ID "project_task_manager_3c9e".` | `/project_task_manager` | yes |
| S4 | standalone agent → its task agent, later message | header | `/project_task_manager` | yes |
| S5 | member of a task agent team → the standalone agent that delegated to it | header: `… from the agent with sender run ID "code_reviewer_e211…".` | `/software_engineering_team/code_reviewer` | **no** — not found (nobody configured there) |
| S6 | same as S5 inside an organization that has its own regular `/software_engineering_team` | header | `/software_engineering_team/code_reviewer` | **no — reaches the regular team's code reviewer, a different agent, without an error** |
| S7 | task agent → the agent that delegated to it (report back) | header | e.g. `/web_researcher` | **no** — not found, or a configured `/web_researcher` (different agent) |
| S8 | task agent delegates → its own task agent (nested) | task message: `… from the agent with sender run ID "web_researcher_5a1c".` | `/web_researcher` | **no** (as S7) |
| S9 | organization agent → organization agent | header | `/project_task_manager` | yes |
| S10 | member of an organization's regular team → organization agent | header | `/software_engineering_team/code_reviewer` | yes (configured) |
| S11 | organization agent → coordinator of its task agent team | task message / header | `/project_task_manager` | yes |
| S12 | agent in another run → this agent (by run ID) | header | its address in its own run | **no** (different run) |
| S13 | task agent created inside a team the user started → a configured member of that team | header | e.g. `/web_researcher` | **no** (the task agent is not configured; the member answers by sender run ID) |
| S14 | configured member of a team the user started → a task agent created inside that team | header | `/code_reviewer` | yes (configured) |
| S15 | the user → any agent | the user's message as typed (plus the `@` note, §11) | — | — |

With the current wording (SR-006) every row gives the same single handle, `target_agent_run_id`
(the sender run ID), which reaches the sender in all twelve rows. Giving the sender's address would
be right in S1–S4 and S9–S11 and wrong in S5–S8 and S12, where the reply fails or, in S6–S7,
silently reaches a different agent.


## 10. Worked journeys

Each journey shows, in order, every collaboration text an agent produces or reads: tool calls
(arguments), tool results (the fields the tool descriptions name), the task message and the
header of each received message. Names and IDs are examples. Situation numbers refer to §9.

### J1 — A standalone agent delegates; its task agent reports back (S3, S7)

1. **User → Research Assistant (standalone)** — user message:

   ```text
   Find three recent sources on solid-state batteries and summarize them.
   ```

2. **Research Assistant** — tool call:

   ```text
   delegate_task {"recipient_address": "/web_researcher", "description": "Find three sources on solid-state batteries published in the last year; return title, link and a two-line summary for each."}
   ```

3. **Research Assistant** — tool result:

   ```text
   {"delegated": true, "target_kind": "agent", "target_agent_run_id": "web_researcher_5a1c", "task_id": "task_8e2f"}
   ```

4. **Web Researcher (task agent)** — first message (task message):

   ```text
   You have a new task from the agent with sender run ID "research_assistant_7f3a".
   When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run ID.
   
   Description:
   Find three sources on solid-state batteries published in the last year; return title, link and a two-line summary for each.
   ```

5. **Web Researcher** — tool call (report back):

   ```text
   send_message_to {"target_agent_run_id": "research_assistant_7f3a", "content": "Done. 1) … 2) … 3) …"}
   ```

6. **Web Researcher** — tool result:

   ```text
   {"accepted": true, "target_agent_run_id": "research_assistant_7f3a"}
   ```

7. **Research Assistant** — received message:

   ```text
   You received a message from the agent with sender run ID "web_researcher_5a1c".
   message:
   Done. 1) … 2) … 3) …
   ```

8. **Research Assistant** — tool call (follow-up, by the sender run ID):

   ```text
   send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "Please add the publication date for source 2."}
   ```

If the Research Assistant has `update_task`, it can close `task_8e2f` with status DONE when the
work is finished; that stops the task agent. Without `update_task` nothing has to be closed.

### J2 — A team the user started hands off by its rules (S1)

1. **Code reviewer (member, address `/code_reviewer`)** — tool call:

   ```text
   get_handoff_rules {}
   ```

2. **Code reviewer** — tool result:

   ```text
   {"handoffs": [{"when": "When the review passes", "recipient_address": "/api_e2e_engineer"}, {"when": "When the review fails because of the implementation", "recipient_address": "/implementation_engineer"}]}
   ```

3. **Code reviewer** — tool call (the one rule that matches):

   ```text
   send_message_to {"recipient_address": "/api_e2e_engineer", "content": "Review passed. The report is at /abs/review-report.md.", "reference_files": ["/abs/review-report.md"]}
   ```

4. **API/E2E engineer** — received message:

   ```text
   You received a message from the agent with sender run ID "code_reviewer_91c2".
   message:
   Review passed. The report is at /abs/review-report.md.
   ```

5. **API/E2E engineer** — tool call (question back, by the sender run ID):

   ```text
   send_message_to {"target_agent_run_id": "code_reviewer_91c2", "content": "Which build did you review?"}
   ```

Addresses come from the handoff rules (start a conversation); answers use the sender run ID.

### J3 — The Project Task Manager (standalone) gives a saved Task to the software engineering team, then a follow-up Task (S3, S5, S2)

1. **Project Task Manager** — tool call:

   ```text
   delegate_task {"recipient_address": "/software_engineering_team", "task_id": "task_259d"}
   ```

2. **Project Task Manager** — tool result:

   ```text
   {"delegated": true, "target_kind": "team", "target_team_run_id": "software_engineering_team_8f12", "target_team_coordinator_agent_run_id": "solution_designer_4b7d"}
   ```

3. **Solution designer (the team's coordinator)** — first message (task message):

   ```text
   You have a new task from the agent with sender run ID "project_task_manager_3c9e".
   When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run ID.
   
   Description:
   <the saved Task's description>
   
   Reference files:
   - /abs/task-context.md
   ```

4. **Solution designer → implementation engineer (inside the team)** — tool call (handoff rule):

   ```text
   send_message_to {"recipient_address": "/software_engineering_team/implementation_engineer", "content": "Design ready; handoff at /abs/handoff.md."}
   ```

5. **Solution designer** — tool call (report back):

   ```text
   send_message_to {"target_agent_run_id": "project_task_manager_3c9e", "content": "Task 259d delivered. Receipt at /abs/receipt.md."}
   ```

6. **Project Task Manager** — received message:

   ```text
   You received a message from the agent with sender run ID "solution_designer_4b7d".
   message:
   Task 259d delivered. Receipt at /abs/receipt.md.
   ```

7. **Project Task Manager** — tool call (talk with the team: the coordinator's run ID):

   ```text
   send_message_to {"target_agent_run_id": "solution_designer_4b7d", "content": "Thanks. One question about the receipt: …"}
   ```

8. **Project Task Manager** — tool call (after setting task_259d to DONE with update_task: a follow-up Task to the same team):

   ```text
   delegate_task {"target_team_run_id": "software_engineering_team_8f12", "task_id": "task_ee74"}
   ```

9. **Solution designer** — received message (mode 3):

   ```text
   You received a message from the agent with sender run ID "project_task_manager_3c9e".
   message:
   New Task assigned to you: task_ee74. Your previous Task is closed; this is the work to do now.
   
   Description:
   <the saved Task's description>
   ```

Inside the team the members use their teammates' addresses (S2). From outside, the team is
reached only by IDs: the Project Task Manager answers the coordinator by `solution_designer_4b7d`
(the sender run ID) and gives a later Task by `software_engineering_team_8f12`.

### J4 — A task agent delegates further (S8)

1. **Web Researcher (task agent)** — tool call:

   ```text
   delegate_task {"recipient_address": "/summarizer", "description": "Summarize these three sources in 150 words: …"}
   ```

2. **Web Researcher** — tool result (no task_id: this is part of its own Task):

   ```text
   {"delegated": true, "target_kind": "agent", "target_agent_run_id": "summarizer_77d0"}
   ```

3. **Summarizer (task agent of a task agent)** — first message (task message):

   ```text
   You have a new task from the agent with sender run ID "web_researcher_5a1c".
   When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run ID.
   
   Description:
   Summarize these three sources in 150 words: …
   ```

4. **Summarizer** — tool call (report back):

   ```text
   send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "Summary: …"}
   ```

The Web Researcher's address (`/web_researcher`) is never shown to the Summarizer: from where the
Summarizer sits it would reach a configured `/web_researcher` or nobody, never this task agent.

### J5 — Inside an organization (S9, S6, S11)

1. **Project Task Manager (direct agent of the organization)** — tool call (another organization agent, by address):

   ```text
   send_message_to {"recipient_address": "/concierge", "content": "Tell the user the release is ready."}
   ```

2. **Project Task Manager** — tool call (delegate to the organization's team: creates a task agent team, not the regular team):

   ```text
   delegate_task {"recipient_address": "/software_engineering_team", "task_id": "task_4c1a"}
   ```

3. **Project Task Manager** — tool result:

   ```text
   {"delegated": true, "target_kind": "team", "target_team_run_id": "software_engineering_team_19ab", "target_team_coordinator_agent_run_id": "solution_designer_c3e0"}
   ```

4. **Code reviewer of that task agent team → Project Task Manager** — received message:

   ```text
   You received a message from the agent with sender run ID "code_reviewer_e211".
   message:
   Question about the scope: …
   ```

5. **Project Task Manager** — tool call (answer by the sender run ID):

   ```text
   send_message_to {"target_agent_run_id": "code_reviewer_e211", "content": "Keep it out of scope."}
   ```

Answering `/software_engineering_team/code_reviewer` instead would reach the organization's
**regular** code reviewer, a different agent, without an error (§9 S6). That is why the header
gives only the sender run ID.


### J6 — A Task's life: close, message, reopen, continue (Project Task Manager with `update_task`)

1. **Project Task Manager** — tool call:

   ```text
   delegate_task {"recipient_address": "/web_researcher", "description": "Collect three benchmark results for model X."}
   ```

2. **Project Task Manager** — tool result (a Task with no Project was created):

   ```text
   {"delegated": true, "target_kind": "agent", "target_agent_run_id": "web_researcher_5a1c", "task_id": "task_8e2f"}
   ```

3. **Web Researcher** — tool call (report, by the sender run ID):

   ```text
   send_message_to {"target_agent_run_id": "project_task_manager_3c9e", "content": "Done: …"}
   ```

4. **Project Task Manager** — tool call (the work is finished):

   ```text
   update_task {"task_id": "task_8e2f", "status": "DONE"}
   ```

5. **Project Task Manager** — tool result:

   ```text
   {"projectId": null, "taskId": "task_8e2f", "status": "DONE"}
   ```

6. **Project Task Manager** — tool call (a later question, Task still DONE):

   ```text
   send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "Can you add one more result?"}
   ```

7. **Project Task Manager** — tool result (refused):

   ```text
   {"accepted": false, "target_agent_run_id": null, "message": "This Task is DONE. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run ID again."}
   ```

8. **Project Task Manager** — tool call (reopen):

   ```text
   update_task {"task_id": "task_8e2f", "status": "IN_PROGRESS"}
   ```

9. **Project Task Manager** — tool call (the same message again):

   ```text
   send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "Can you add one more result?"}
   ```

10. **Project Task Manager** — tool result:

   ```text
   {"accepted": true, "target_agent_run_id": "web_researcher_5a1c", "message": "web_researcher_5a1c continues with its conversation."}
   ```

Only the agent that assigned the Task can continue it; any other agent gets M-07 (§12). An agent
without `update_task` never closes anything: a quiet task agent is shut down after a while and
continues with its conversation when it is messaged again.

### J7 — A task agent asks a question mid-task (S7, S4)

1. **Web Researcher (task agent)** — tool call (question, by the sender run ID from the task message):

   ```text
   send_message_to {"target_agent_run_id": "research_assistant_7f3a", "content": "Only peer-reviewed sources, or blogs too?"}
   ```

2. **Research Assistant** — received message:

   ```text
   You received a message from the agent with sender run ID "web_researcher_5a1c".
   message:
   Only peer-reviewed sources, or blogs too?
   ```

3. **Research Assistant** — tool call (answer, by the sender run ID):

   ```text
   send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "Peer-reviewed only."}
   ```

4. **Web Researcher** — received message:

   ```text
   You received a message from the agent with sender run ID "research_assistant_7f3a".
   message:
   Peer-reviewed only.
   ```

5. **Web Researcher** — tool call (final report, by the sender run ID):

   ```text
   send_message_to {"target_agent_run_id": "research_assistant_7f3a", "content": "Done: …"}
   ```

### J8 — A member of a team the user started delegates outside its team (S13, S14)

1. **Implementation engineer (member, `/implementation_engineer`)** — tool call:

   ```text
   delegate_task {"recipient_address": "/web_researcher", "description": "Find the current API limits of service Y."}
   ```

2. **Implementation engineer** — tool result:

   ```text
   {"delegated": true, "target_kind": "agent", "target_agent_run_id": "web_researcher_2b9d", "task_id": "task_33aa"}
   ```

3. **Web Researcher (task agent inside the team's run, §2a)** — first message (task message):

   ```text
   You have a new task from the agent with sender run ID "implementation_engineer_6f01".
   When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run ID.
   
   Description:
   Find the current API limits of service Y.
   ```

4. **Web Researcher** — tool call (report, by the sender run ID):

   ```text
   send_message_to {"target_agent_run_id": "implementation_engineer_6f01", "content": "Limits: …"}
   ```

5. **Implementation engineer** — received message:

   ```text
   You received a message from the agent with sender run ID "web_researcher_2b9d".
   message:
   Limits: …
   ```

6. **Implementation engineer** — tool call (its own handoff rule, by address):

   ```text
   send_message_to {"recipient_address": "/code_reviewer", "content": "Implementation ready; handoff at /abs/handoff.md."}
   ```

Delegating to a teammate instead (`recipient_address: "/code_reviewer"` in `delegate_task`) is
refused with M-21 (§12).

### J9 — No handoff rule fits (§5.3)

1. **Solution designer (coordinator of a task agent team)** — tool call:

   ```text
   get_handoff_rules {}
   ```

2. **Solution designer** — tool result (no rule matches its outcome: blocked on a user decision):

   ```text
   {"handoffs": [{"when": "When the design is complete", "recipient_address": "/software_engineering_team/architecture_reviewer"}]}
   ```

3. **Solution designer** — tool call (another agent gave the task: tell it, by the sender run ID from the task message):

   ```text
   send_message_to {"target_agent_run_id": "project_task_manager_3c9e", "content": "Blocked: the user must choose between A and B."}
   ```

An agent that was not given its task by another agent finishes normally instead.

### J10 — The user stops a task agent

1. **Project Task Manager** — tool call (while the user is stopping the task agent):

   ```text
   send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}
   ```

2. **Project Task Manager** — tool result:

   ```text
   {"accepted": false, "target_agent_run_id": null, "message": "The user is stopping this task agent."}
   ```

3. **Project Task Manager** — tool call (after it stopped):

   ```text
   send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}
   ```

4. **Project Task Manager** — tool result:

   ```text
   {"accepted": false, "target_agent_run_id": null, "message": "The task agent 'web_researcher_5a1c' has stopped, so the message was not sent."}
   ```

5. **Project Task Manager** — tool call (start again with a new task agent):

   ```text
   delegate_task {"recipient_address": "/web_researcher", "description": "…"}
   ```

## 10a. Tool results, success and failure

Each result has the fields its tool description names; a refusal carries the catalogue text
(wording §7.3) as `message`, plus a `code`.

1. **delegate_task** — success, a task agent (a description-only delegation by an agent nobody delegated to also returns task_id):

   ```text
   {"delegated": true, "target_kind": "agent", "target_agent_run_id": "web_researcher_5a1c", "task_id": "task_8e2f"}
   ```

2. **delegate_task** — success, a task agent team:

   ```text
   {"delegated": true, "target_kind": "team", "target_team_run_id": "software_engineering_team_8f12", "target_team_coordinator_agent_run_id": "solution_designer_4b7d"}
   ```

3. **delegate_task** — success with launch_notes:

   ```text
   {"delegated": true, "target_kind": "agent", "target_agent_run_id": "web_researcher_5a1c", "task_id": "task_8e2f", "launch_notes": ["<which agent runs on a different runtime or model than configured, and on what>"]}
   ```

4. **delegate_task** — success when the caller is a task agent (no task_id: the new task agent's work is part of the caller's Task):

   ```text
   {"delegated": true, "target_kind": "agent", "target_agent_run_id": "summarizer_77d0"}
   ```

5. **delegate_task** — failure (nothing was created):

   ```text
   {"delegated": false, "message": "'/web_resercher' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use."}
   ```

6. **send_message_to** — delivered:

   ```text
   {"accepted": true, "target_agent_run_id": "research_assistant_7f3a"}
   ```

7. **send_message_to** — refused:

   ```text
   {"accepted": false, "target_agent_run_id": null, "message": "You can't send a message to yourself."}
   ```

8. **get_handoff_rules** — an agent with rules:

   ```text
   {"handoffs": [{"when": "When the review passes", "recipient_address": "/api_e2e_engineer"}]}
   ```

9. **get_handoff_rules** — an agent without rules:

   ```text
   {"handoffs": []}
   ```

10. **list_available_agents** — result:

   ```text
   {"agents": [{"name": "Web Researcher", "kind": "agent", "address": "/web_researcher", "description": "Finds and summarizes sources."}, {"name": "Software Engineering Team", "kind": "agent_team", "address": "/software_engineering_team", "description": "Designs, builds and delivers software changes."}]}
   ```

## 11. The `@` note, by example

The note is written for the agent the user is talking to (wording §8).

The user talks to the code reviewer of a team the user started and mentions itself, a teammate
and a catalog agent:

```text
Please check this with @api_e2e_engineer and @Web Researcher, and @code_reviewer you too.

[Mentioned agents]
- api_e2e_engineer (agent) at /api_e2e_engineer, in your team: talk with it using send_message_to; don't delegate to it.
- Web Researcher (agent) at /web_researcher: delegate the task to it with delegate_task; it returns a run ID to follow up with.
- code_reviewer (agent) at /code_reviewer: that is you.
```

The user talks to the solution designer of a task agent team (here created by a standalone
Project Task Manager) and mentions a teammate; the teammate's address is its address inside the
team, which the solution designer's own team resolves first:

```text
Ask @code_reviewer to check the design.

[Mentioned agents]
- code_reviewer (agent) at /software_engineering_team/code_reviewer, in your team: talk with it using send_message_to; don't delegate to it.
```

The user talks to the Project Task Manager inside an organization and mentions the
organization's team:

```text
Ask @Software Engineering Team to look at this.

[Mentioned agents]
- Software Engineering Team (agent team) at /software_engineering_team: talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its run ID to follow up with.
```

The user talks to a task agent in a standalone run and mentions the agent the user started:

```text
Report this to @Research Assistant.

[Mentioned agents]
- Research Assistant (agent) at /research_assistant: talk with it using send_message_to; you can't delegate to it.
```



## 12. Every refusal and result text, with a call that triggers it

Generated from the wording file's catalogue (§7.3); the generator stops if an entry has no row
here. Placeholders are filled with example values.

| ID | Situation | Call | The agent reads |
| --- | --- | --- | --- |
| M-01 | The Project Task Manager answers a task agent team member by its address (S5) | `send_message_to {"recipient_address": "/software_engineering_team/code_reviewer", "content": "…"}` | No agent or agent team you can talk with has the address /software_engineering_team/code_reviewer. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run ID. To have a task done by a new agent, use delegate_task. |
| M-02 | Both selectors at once | `send_message_to {"recipient_address": "/project_task_manager", "target_agent_run_id": "project_task_manager_3c9e", "content": "Done."}` | send_message_to takes exactly one of recipient_address or target_agent_run_id, not both. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run ID. |
| M-03 | No selector | `send_message_to {"content": "Done."}` | send_message_to needs one of recipient_address or target_agent_run_id. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run ID. |
| M-04 | A task agent answers with a bare name | `send_message_to {"recipient_address": "research_assistant", "content": "Done."}` | 'research_assistant' is not a valid address (it must begin with '/'). An address is exact and begins with '/', for example /team/agent. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run ID. |
| M-05 | Talking with a task agent team by the team's own run ID | `send_message_to {"target_agent_run_id": "software_engineering_team_8f12", "content": "…"}` | software_engineering_team_8f12 is a task agent team's run ID, and send_message_to talks with agents. To talk with the team, use its coordinator's run ID: solution_designer_4b7d. |
| M-06 | Messaging an agent that works on a different Task | `send_message_to {"target_agent_run_id": "web_researcher_0d4e", "content": "…"}` | You can't message this agent: it works on a different Task. |
| M-07 | An agent that did not assign the Task messages a task agent whose Task is closed | `send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}` | This task agent's Task is closed. Only the agent that assigned the Task can continue it: set the Task to TODO or IN_PROGRESS, then message the task agent's run ID (for a task agent team, its coordinator's run ID). |
| M-08 | The assigner messages its task agent while the Task is still DONE (J6) | `send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}` | This Task is DONE. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run ID again. |
| M-09 | The assigner reopened Task task_8e2f, but the task agent was since given Task task_ee74 | `send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}` | This task agent's current Task is task_ee74 (IN_PROGRESS); setting Task task_8e2f to TODO or IN_PROGRESS does not reach it. To have this task agent continue Task task_8e2f, call delegate_task with target_agent_run_id "web_researcher_5a1c" and task_id "task_8e2f". |
| M-10 | The assigner reopened a Task whose task agent never started | `send_message_to {"target_agent_run_id": "web_researcher_9c3e", "content": "…"}` | This task agent never started, so there is nothing to continue. Delegate the task again. |
| M-11 | Messaging a run ID that no running agent has | `send_message_to {"target_agent_run_id": "research_lead", "content": "Done."}` | No running agent has the run ID 'research_lead', so the message was not sent. Use an exact run ID you were given: a sender run ID (from a message or your new task), or a run ID delegate_task returned to you. |
| M-12 | The recipient refuses the message | `send_message_to {"target_agent_run_id": "concierge_5d21", "content": "…"}` | The agent 'concierge_5d21' did not accept the message: <the recipient's reason>. |
| M-13 | Messaging yourself | `send_message_to {"target_agent_run_id": "code_reviewer_91c2", "content": "…"}` | You can't send a message to yourself. |
| M-14 | Messaging a run ID of an agent that is no longer running here | `send_message_to {"target_agent_run_id": "web_researcher_1a2b", "content": "…"}` | The agent with that run ID is not running here, so the message was not sent. Use an exact run ID you were given. |
| M-15 | Messaging a configured agent that is not running | `send_message_to {"target_agent_run_id": "concierge_5d21", "content": "…"}` | The agent 'concierge_5d21' is not running, so the message was not sent. |
| M-16 | Messaging a task agent that has stopped (J10) | `send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}` | The task agent 'web_researcher_5a1c' has stopped, so the message was not sent. |
| M-17 | Messaging a task agent the user is stopping (J10) | `send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}` | The user is stopping this task agent. |
| M-18 | Result: the assigner reopened the Task and messaged the task agent (J6) | `send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}` | web_researcher_5a1c continues with its conversation. |
| M-19 | Result: as M-18, but the message itself was not delivered | `send_message_to {"target_agent_run_id": "web_researcher_5a1c", "content": "…"}` | web_researcher_5a1c continues with its conversation (its Task is open again) but did not receive this message; send it again. |
| M-20 | Messaging or delegating while the user stops the whole team or run | `send_message_to {"recipient_address": "/code_reviewer", "content": "…"}` | This work is stopping or has stopped, so the message or delegation was not sent. |
| M-21 | A team member delegates to a teammate | `delegate_task {"recipient_address": "/api_e2e_engineer", "description": "…"}` | /api_e2e_engineer is in your own team; you can't delegate to it. Talk with it using send_message_to. |
| M-22 | Delegating to an address nobody has (a typo) | `delegate_task {"recipient_address": "/web_resercher", "description": "…"}` | '/web_resercher' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use. |
| M-23 | Delegating to a bare name | `delegate_task {"recipient_address": "web researcher", "description": "…"}` | 'web researcher' is not a valid address (it must begin with '/'). An address is exact and begins with '/', for example /team/agent; if you have list_available_agents, it shows the addresses you can delegate to. |
| M-24 | Delegating with neither an address nor a run ID | `delegate_task {"description": "…"}` | delegate_task needs recipient_address (an address beginning with '/') to create a new task agent, or target_agent_run_id / target_team_run_id with task_id to give a saved Task to one of your task agents. |
| M-25 | Both target run IDs at once | `delegate_task {"target_agent_run_id": "web_researcher_5a1c", "target_team_run_id": "software_engineering_team_8f12", "task_id": "task_ee74"}` | Invalid delegate_task input: supply exactly one of target_team_run_id (a task agent team) or target_agent_run_id (a task agent). |
| M-26 | A target run ID together with a description | `delegate_task {"target_agent_run_id": "web_researcher_5a1c", "task_id": "task_ee74", "description": "…"}` | Invalid delegate_task input: with target_team_run_id or target_agent_run_id, supply only that run ID and task_id (not description). |
| M-27 | An empty description | `delegate_task {"recipient_address": "/web_researcher", "description": ""}` | Invalid delegate_task input: description is required. |
| M-28 | A task agent uses task_id | `delegate_task {"recipient_address": "/summarizer", "task_id": "task_91b0"}` | You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task. |
| M-29 | A task agent whose Task is closed delegates | `delegate_task {"recipient_address": "/summarizer", "description": "…"}` | Your Task is DONE or CANCELLED, so you can't start new work. |
| M-30 | Delegating where Tasks are not available | `delegate_task {"recipient_address": "/web_researcher", "description": "…"}` | Tasks are not available here, so this delegation can't be recorded. |
| M-31 | Delegating a saved Task that is DONE | `delegate_task {"recipient_address": "/software_engineering_team", "task_id": "task_259d"}` | The Task is DONE; set it to TODO or IN_PROGRESS before you delegate it. |
| M-32 | The Task is closed while the delegation is starting | `delegate_task {"recipient_address": "/software_engineering_team", "task_id": "task_4c1a"}` | The Task was marked DONE or CANCELLED; its new work was not started. |
| M-33 | Mode 3: the Task was given but its message did not arrive | `delegate_task {"target_team_run_id": "software_engineering_team_8f12", "task_id": "task_ee74"}` | Task task_ee74 was given to the task agent, but the message with its work was not delivered (<why>). Message the task agent's run ID solution_designer_4b7d, or set Task task_ee74 to CANCELLED, or delegate it to a new task agent. |
| M-34 | Mode 3 with a run ID that is not one of your task agents | `delegate_task {"target_agent_run_id": "code_reviewer_91c2", "task_id": "task_ee74"}` | code_reviewer_91c2 is not one of your task agents. Use a run ID that delegate_task returned to you, or delegate to a new task agent with recipient_address. |
| M-35 | Mode 3 with the coordinator's run ID instead of the team's | `delegate_task {"target_agent_run_id": "solution_designer_4b7d", "task_id": "task_ee74"}` | solution_designer_4b7d is the coordinator of task agent team software_engineering_team_8f12; use target_team_run_id "software_engineering_team_8f12". |
| M-36 | Mode 3 with a team's run ID as target_agent_run_id | `delegate_task {"target_agent_run_id": "software_engineering_team_8f12", "task_id": "task_ee74"}` | software_engineering_team_8f12 is a task agent team's run ID; use target_team_run_id "software_engineering_team_8f12". |
| M-37 | Mode 3 with a team member's run ID | `delegate_task {"target_agent_run_id": "code_reviewer_e211", "task_id": "task_ee74"}` | code_reviewer_e211 is a member of task agent team software_engineering_team_8f12; to give that team a Task, use target_team_run_id "software_engineering_team_8f12". |
| M-38 | Mode 3 with a task agent's run ID as target_team_run_id | `delegate_task {"target_team_run_id": "web_researcher_5a1c", "task_id": "task_ee74"}` | web_researcher_5a1c is a task agent's run ID; use target_agent_run_id "web_researcher_5a1c". |
| M-39 | Mode 3 with the Task it already works on | `delegate_task {"target_agent_run_id": "web_researcher_5a1c", "task_id": "task_8e2f"}` | This task agent already works on this Task. |
| M-40 | Mode 3 to a task agent that has no Task (created before Tasks existed) | `delegate_task {"target_agent_run_id": "web_researcher_old1", "task_id": "task_ee74"}` | This task agent has no Task; delegate Task task_ee74 with recipient_address instead. |
| M-41 | Mode 3 to a task agent working on part of another agent's Task | `delegate_task {"target_agent_run_id": "summarizer_77d0", "task_id": "task_ee74"}` | This task agent works on part of another agent's Task, so you can't give it a Task. Delegate Task task_ee74 to a new task agent with recipient_address. |
| M-42 | Mode 3 by an agent that did not give the task agent its last Task | `delegate_task {"target_agent_run_id": "web_researcher_5a1c", "task_id": "task_ee74"}` | Only the agent that gave this task agent its most recent Task can give it a new one. Delegate Task task_ee74 to a new task agent with recipient_address instead. |
| M-43 | Mode 3 while the task agent's Task is still open | `delegate_task {"target_agent_run_id": "web_researcher_5a1c", "task_id": "task_ee74"}` | This task agent still works on Task task_8e2f (IN_PROGRESS). Set it to DONE or CANCELLED first, or delegate Task task_ee74 to a new task agent with recipient_address. |
| M-44 | Mode 3 with the Task the task agent already has | `delegate_task {"target_agent_run_id": "web_researcher_5a1c", "task_id": "task_8e2f"}` | This task agent already has Task task_8e2f. To continue it, set Task task_8e2f to TODO or IN_PROGRESS, then message the task agent's run ID (for a task agent team, its coordinator's run ID). |
| M-45 | Mode 3 to a task agent that never started | `delegate_task {"target_agent_run_id": "web_researcher_9c3e", "task_id": "task_ee74"}` | This task agent never started, so it has no conversation to continue. Delegate Task task_ee74 to a new task agent with recipient_address instead. |

The silent case has no row because nothing is refused: in an organization with a regular team,
answering a task agent team member by its address would be delivered to the regular member
(§9 S6). The wording prevents it by never showing that address.
