"""Generate collaboration-prompt-complete-views.md from collaboration-prompt-wording-proposal.md.

Usage: python3 -I build-complete-views.py <proposal.md> <output.md>
Every agent-facing block is copied from the proposal, so the two files cannot differ.
"""
import sys

src, out = sys.argv[1], sys.argv[2]
s = open(src).read()


def block(heading):
    i = s.index(heading)
    j = s.index("```", i)
    j = s.index("\n", j) + 1
    k = s.index("\n```", j)
    return s[j:k]


def params(heading):
    i = s.index(heading)
    i = s.index("Parameter descriptions", i)
    i = s.index("\n", i) + 1
    lines = []
    for line in s[i:].split("\n"):
        if not line.startswith("- `"):
            break
        if "unchanged" not in line:
            lines.append(line)
    return lines


S41 = block("### 4.1 A standalone agent")
S42 = block("### 4.2 A task agent")
S50 = block("### 5.0 AgentTeam Addressing")
S51 = block("### 5.1 A member")
S52 = block("### 5.2 A direct agent")
S53 = block("### 5.3 Handoffs")
DT, DTP = block("### `delegate_task`"), params("### `delegate_task`")
SM, SMP = block("### `send_message_to`"), params("### `send_message_to`")
LA = block("### `list_available_agents`")
GH = block("### `get_handoff_rules`")
UT = block("### `update_task`")
PT = block("### `list_project_tasks`")
TASKMSG = block("### 7.1 The task message")
HEADER = block("### 7.2 The header")
ORGLINE = " You can also talk with the organization's other agents and agent teams at their addresses."
SM_FIXED = [
    "- `content`: \"Self-contained work request, result, or specific blocker. State the requested work or outcome and relevant context; include important absolute paths here and put files the recipient should inspect in reference_files. Example: 'Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below.'\" (unchanged)",
    "- `message_type`: \"Optional message type label.\" (unchanged)",
    "- `reference_files`: \"Optional attachment/reference list of absolute local file paths the recipient may need to inspect. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ['/Users/me/project/implementation-handoff.md', '/Users/me/project/test.log'].\" (unchanged)",
]


def ident(name):
    return (f"## Agent Identity\n\n- Name: {name}\n- Description: <the agent definition's description>\n\n"
            "### Responsibilities and Boundaries\n\n<the agent definition's own instructions>")


def team_instruction(owner):
    return f"## Team Instruction\n\n<the {owner} definition's instruction, when it has one>"


def fence(text, lang="markdown"):
    return f"```{lang}\n{text}\n```"


def with_handoffs(section):
    return section + "\n\n" + S53


o = []
w = o.append
w("""# Complete Views: What Each Agent Receives

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

""")
w(fence(ident("Research Assistant") + "\n\n" + S41))
w("""

First message: the user's message (plus the `@` note when the user mentions agents).

Tools: `send_message_to`, `delegate_task`; `list_available_agents` and the Task tools only when
configured.

## 2. A task agent (an agent delegated a task to an agent)

System prompt (with §5.3 Handoffs appended only if it has handoff rules):

""")
w(fence(ident("Web Researcher") + "\n\n" + S42))
w("\n\nFirst message (the task message):\n\n")
w(fence(TASKMSG, "text"))
w("""

Tools: as §1, plus `get_handoff_rules` when it was created inside a team or organization.

## 3. A member of an agent team (the user starts a team)

System prompt (for example the code reviewer; this member has handoff rules):

""")
w(fence(ident("code reviewer") + "\n\n" + team_instruction("team") + "\n\n" + S50 + "\n\n"
        + with_handoffs(S51.replace("{{organization_line}}", ""))))
w("\n\nA message it receives from a teammate:\n\n")
w(fence(HEADER, "text"))
w("""

Tools: `get_handoff_rules`, `send_message_to`, `delegate_task`; `list_available_agents` and the
Task tools only when configured.

## 4. A member of a task agent team

System prompt: as §3 (with the organization sentence of §6 when the team was created inside an
organization). Its coordinator's first message is the task message (§2); the other members
receive messages from their teammates.

## 5. A direct agent of an organization (for example the Project Task Manager)

System prompt (this agent has handoff rules):

""")
w(fence(ident("project task manager") + "\n\n" + team_instruction("organization") + "\n\n" + S50
        + "\n\n" + with_handoffs(S52)))
w("""

Tools: as §3.

## 6. A member of an organization's team

System prompt: as §3, with this first bullet:

""")
w(fence("- To talk with a teammate, use `send_message_to` with their address." + ORGLINE))
w("\n\n## 7. Tool descriptions (identical for every agent)\n\n### `send_message_to`\n\n")
w(fence(SM, "text"))
w("\n\nParameters:\n\n" + "\n".join(SMP + SM_FIXED))
w("\n\n### `delegate_task`\n\n")
w(fence(DT, "text"))
w("\n\nParameters:\n\n" + "\n".join(DTP))
w("\n\n### `get_handoff_rules` (team and organization agents)\n\n")
w(fence(GH, "text"))
w("\n\n### `list_available_agents` (only when configured)\n\n")
w(fence(LA, "text"))
w("\n\n### `update_task` (only when configured)\n\n")
w(fence(UT, "text"))
w("\n\n### `list_project_tasks` (only when configured)\n\n")
w(fence(PT, "text"))
w("""

`create_task`: unchanged (no collaboration wording).

## 8. What Is Repeated

Counted in the fullest view, a team member (§3 + §7). "P" = system prompt, "T" = tool
description, "Pa" = parameter description. The limit is §1 principle 5 of the proposal: a
second place only when an agent lacking the first needs it.

| # | Statement | Where it appears | Times |
| --- | --- | --- | --- |
| R1 | A team's address reaches its coordinator | P addressing; T `send_message_to` (standalone agents have no addressing section) | 2 |
| R2 | For a task agent team, talk through the coordinator's ID | P bullet 4 (what to do); T `delegate_task` result (which field is which); T `send_message_to` (a team's own ID is refused) | 3 |
| R3 | Don't delegate to yourself, a teammate or your own team | P bullet 5; T `delegate_task` (refused) | 2 |
| R4 | The task description becomes the first message | P bullet 2; T `delegate_task` | 2 |
| R4a | Don't send the task description again | P bullet 2 | 1 |
| R5 | Every delegation to an address creates another task agent | P bullet 3; Pa `recipient_address` | 2 |
| R6 | Delegating creates a task agent and returns its ID | P bullet 2; T `delegate_task` modes and result | 2 |
| R7 | Exactly one selector, never both | T `send_message_to` | 1 |
| R8 | Giving a saved Task to an existing task agent: conditions | T `delegate_task` mode (3) | 1 |
| R9 | Exact address; invalid forms | P addressing; Pa `send_message_to.recipient_address` (standalone agents have no addressing section) | 2 |
| R10 | Task agents are reached by ID, not by address | P addressing; P bullet 4 | 2 |
| R11 | Your ID goes with the task | P bullet 2; T `delegate_task` | 2 |
| R12 | The agent's own address | nowhere | 0 |
""")
open(out, "w").write("".join(o))
print("written")
