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
TASKMSG_B = None  # set after block_n is defined
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

### 2a. A task agent created inside a team the user started, or inside an organization

Same system prompt and task message as §2 (it is not a member of a team). It can also reach the
configured agents and teams of that team or organization by address, e.g. when the user
mentions them (§11), and it has `get_handoff_rules`; without handoff rules that returns
`{"handoffs": []}` and its prompt has no Handoffs section.

### 2b. A task agent that has handoff rules

A task agent created from a configured agent's own definition at that agent's address keeps that
place's handoff rules (design T-1). Its prompt is §2 with the Handoffs section added:

""")
w(fence(ident("code reviewer") + "\n\n" + with_handoffs(S42)))
w("""

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
| R2 | For a task agent team, talk through the coordinator's run id | P bullet 4 (what to do); T `delegate_task` result (which field is which); T `send_message_to` (a team's own run id is refused) | 3 |
| R3 | Don't delegate to yourself, a teammate or your own team | P bullet 5; T `delegate_task` (refused) | 2 |
| R4 | The task description becomes the first message | P bullet 2; T `delegate_task` | 2 |
| R4a | Don't send the task description again | P bullet 2 | 1 |
| R5 | Every delegation to an address creates another task agent | P bullet 3; Pa `recipient_address` | 2 |
| R6 | Delegating creates a task agent and returns its run id | P bullet 2; T `delegate_task` modes and result | 2 |
| R7 | Exactly one selector, never both | T `send_message_to` | 1 |
| R8 | Giving a saved Task to an existing task agent: conditions | T `delegate_task` mode (3) | 1 |
| R9 | Exact address; invalid forms | P addressing; Pa `send_message_to.recipient_address` (standalone agents have no addressing section) | 2 |
| R10 | Task agents are reached by ID, not by address | P addressing; P bullet 4 | 2 |
| R11 | Your ID goes with the task | P bullet 2; T `delegate_task` | 2 |
| R12 | The agent's own address | nowhere | 0 |
| R13 | Reply or report with the sender run id or the sender address (when shown); reply only when asked something | P answering bullet (every agent); task message reply line (task agents and coordinators, who may have no message yet); refusals' next step (after a mistake) | 3 |
""")
w("""
## 9. Situations: what the recipient sees, and whether the sender's address would reach the sender

Every sender → recipient case. "Sees" is the text the recipient gets (task message or header,
§7 of the wording file). "Address reaches?" says whether replying to the sender's address would
reach the sender in that case (lookup: the recipient's own team first, then the agents and teams
configured in the run; `resolveMessageRecipient`). A task agent is never configured, so its address
reaches it only from inside its own team.

| # | Situation (sender → recipient) | Recipient sees | Sender's address | Address reaches? |
| --- | --- | --- | --- | --- |
| S1 | teammate → teammate, team the user started | header: `… from the agent with sender address "/code_reviewer" and sender run id "code_reviewer_91c2".` | `/code_reviewer` | yes |
| S2 | member of a task agent team → its teammate | header (same shape) | `/software_engineering_team/code_reviewer` | yes (same team) |
| S3 | standalone agent (e.g. the Project Task Manager) delegates → its task agent or task agent team's coordinator | task message: `… from the agent with sender address "/project_task_manager" and sender run id "project_task_manager_3c9e".` | `/project_task_manager` | yes |
| S4 | standalone agent → its task agent, later message | header | `/project_task_manager` | yes |
| S5 | member of a task agent team → the standalone agent that delegated to it | header: `… from the agent with sender run id "code_reviewer_e211…".` | `/software_engineering_team/code_reviewer` | **no** — not found (nobody configured there) |
| S6 | same as S5 inside an organization that has its own regular `/software_engineering_team` | header | `/software_engineering_team/code_reviewer` | **no — reaches the regular team's code reviewer, a different agent, without an error** |
| S7 | task agent → the agent that delegated to it (report back) | header | e.g. `/web_researcher` | **no** — not found, or a configured `/web_researcher` (different agent) |
| S8 | task agent delegates → its own task agent (nested) | task message: `… from the agent with sender run id "web_researcher_5a1c".` | `/web_researcher` | **no** (as S7) |
| S9 | organization agent → organization agent | header | `/project_task_manager` | yes |
| S10 | member of an organization's regular team → organization agent | header | `/software_engineering_team/code_reviewer` | yes (configured) |
| S11 | organization agent → coordinator of its task agent team | task message / header | `/project_task_manager` | yes |
| S12 | agent in another run → this agent (by run id) | header | its address in its own run | **no** (different run) |
| S13 | task agent created inside a team the user started → a configured member of that team | header | e.g. `/web_researcher` | **no** (the task agent is not configured; the member answers by sender run id) |
| S14 | configured member of a team the user started → a task agent created inside that team | header | `/code_reviewer` | yes (configured) |
| S15 | the user → any agent | the user's message as typed (plus the `@` note, §11) | — | — |

Every row gives the sender run id, which reaches the sender in all of them. The sender address is
given exactly in the rows marked "yes" (SR-015, design T-5) and left out where it would fail or,
in S6–S7, silently reach a different agent.
""")


# ---------- worked journeys, @ note, mistakes (texts pulled from the wording file) ----------
def block_n(heading, n):
    i = s.index(heading)
    for _ in range(n):
        j = s.index("```", i); j = s.index("\n", j) + 1; k = s.index("\n```", j); i = k + 4
    return s[j:k]


TASKMSG_B = block_n("### 7.1 The task message", 2)
MODE3 = block_n("### 7.1 The task message", 3)
HEADER_B = block_n("### 7.2 The header", 2)


def task_msg(delegator_id, description, files=(), address=None):
    if address:
        t = TASKMSG.replace("/project_task_manager", address).replace("project_task_manager_3c9e", delegator_id)
    else:
        t = TASKMSG_B.replace("web_researcher_5a1c", delegator_id)
    t = t.replace("<the task description>", description)
    head, _, _ = t.partition("\n\nReference files:")
    return head + ("\n\nReference files:\n" + "\n".join("- " + f for f in files) if files else "")


def header(name, run_id, content, address=None):
    if address:
        return HEADER.replace("/code_reviewer", address).replace("code_reviewer_91c2", run_id).replace("<content>", content)
    return HEADER_B.replace("web_researcher_5a1c", run_id).replace("<content>", content)


def catalogue():
    sec = s[s.index("### 7.3 Tool results and refusals"):s.index("## 8. The `@` Note")]
    out = {}
    for line in sec.split("\n"):
        if line.startswith("| M-"):
            cells = [c.strip() for c in line.strip().strip("|").split(" | ")]
            text = cells[3]
            out[cells[0]] = (cells[1], cells[2], text[1:-1] if text.startswith('"') and text.endswith('"') else text)
    return out


CAT = catalogue()


def refusal(mid, **subs):
    text = CAT[mid][2]
    for k, v in subs.items():
        text = text.replace("<" + k + ">", v)
    return text


def call(tool, **args):
    import json
    return f"{tool} {json.dumps(args, ensure_ascii=False)}"


def result(**fields):
    import json
    return json.dumps(fields, ensure_ascii=False)


def step_list(steps):
    out = []
    for i, (who, kind, text) in enumerate(steps, 1):
        out.append(f"{i}. **{who}** — {kind}:\n\n" + "\n".join("   " + l for l in fence(text, "text").split("\n")))
    return "\n\n".join(out)


w("""

## 10. Worked journeys

Each journey shows, in order, every collaboration text an agent produces or reads: tool calls
(arguments), tool results (the fields the tool descriptions name), the task message and the
header of each received message. Names and IDs are examples. Situation numbers refer to §9.

### J1 — A standalone agent delegates; its task agent reports back (S3, S7)

""")
w(step_list([
    ("User → Research Assistant (standalone)", "user message", "Find three recent sources on solid-state batteries and summarize them."),
    ("Research Assistant", "tool call", call("delegate_task", recipient_address="/web_researcher", description="Find three sources on solid-state batteries published in the last year; return title, link and a two-line summary for each.")),
    ("Research Assistant", "tool result", result(delegated=True, target_kind="agent", target_agent_run_id="web_researcher_5a1c", task_id="task_8e2f")),
    ("Web Researcher (task agent)", "first message (task message)", task_msg("research_assistant_7f3a", "Find three sources on solid-state batteries published in the last year; return title, link and a two-line summary for each.", address="/research_assistant")),
    ("Web Researcher", "tool call (report back)", call("send_message_to", target_agent_run_id="research_assistant_7f3a", content="Done. 1) … 2) … 3) …")),
    ("Web Researcher", "tool result", result(accepted=True, target_agent_run_id="research_assistant_7f3a")),
    ("Research Assistant", "received message", header("web_researcher", "web_researcher_5a1c", "Done. 1) … 2) … 3) …")),
    ("Research Assistant", "tool call (follow-up, by the sender run id)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="Please add the publication date for source 2.")),
]))
w("""

If the Research Assistant has `update_task`, it can close `task_8e2f` with status DONE when the
work is finished; that stops the task agent. Without `update_task` nothing has to be closed.

### J2 — A team the user started hands off by its rules (S1)

""")
w(step_list([
    ("Code reviewer (member, address `/code_reviewer`)", "tool call", call("get_handoff_rules")),
    ("Code reviewer", "tool result", result(handoffs=[{"when": "When the review passes", "recipient_address": "/api_e2e_engineer"}, {"when": "When the review fails because of the implementation", "recipient_address": "/implementation_engineer"}])),
    ("Code reviewer", "tool call (the one rule that matches)", call("send_message_to", recipient_address="/api_e2e_engineer", content="Review passed. The report is at /abs/review-report.md.", reference_files=["/abs/review-report.md"])),
    ("API/E2E engineer", "received message", header("code_reviewer", "code_reviewer_91c2", "Review passed. The report is at /abs/review-report.md.", address="/code_reviewer")),
    ("API/E2E engineer", "tool call (question back, by the sender run id)", call("send_message_to", target_agent_run_id="code_reviewer_91c2", content="Which build did you review?")),
]))
w("""

Addresses come from the handoff rules (start a conversation); answers use the sender run id or the sender address shown with the message.

### J3 — The Project Task Manager (standalone) gives a saved Task to the software engineering team, then a follow-up Task (S3, S5, S2)

""")
w(step_list([
    ("Project Task Manager", "tool call", call("delegate_task", recipient_address="/software_engineering_team", task_id="task_259d")),
    ("Project Task Manager", "tool result", result(delegated=True, target_kind="team", target_team_run_id="software_engineering_team_8f12", target_team_coordinator_agent_run_id="solution_designer_4b7d")),
    ("Solution designer (the team's coordinator)", "first message (task message)", task_msg("project_task_manager_3c9e", "<the saved Task's description>", ["/abs/task-context.md"], address="/project_task_manager")),
    ("Solution designer → implementation engineer (inside the team)", "tool call (handoff rule)", call("send_message_to", recipient_address="/software_engineering_team/implementation_engineer", content="Design ready; handoff at /abs/handoff.md.")),
    ("Solution designer", "tool call (report back)", call("send_message_to", target_agent_run_id="project_task_manager_3c9e", content="Task 259d delivered. Receipt at /abs/receipt.md.")),
    ("Project Task Manager", "received message", header("solution_designer", "solution_designer_4b7d", "Task 259d delivered. Receipt at /abs/receipt.md.")),
    ("Project Task Manager", "tool call (talk with the team: the coordinator's run id)", call("send_message_to", target_agent_run_id="solution_designer_4b7d", content="Thanks. One question about the receipt: …")),
    ("Project Task Manager", "tool call (after setting task_259d to DONE with update_task: a follow-up Task to the same team)", call("delegate_task", target_team_run_id="software_engineering_team_8f12", task_id="task_ee74")),
    ("Solution designer", "received message (mode 3)", header("project_task_manager", "project_task_manager_3c9e", MODE3.replace("<task_id>", "task_ee74").replace("<the Task description>", "<the saved Task's description>"), address="/project_task_manager")),
]))
w("""

Inside the team the members use their teammates' addresses (S2). From outside, the team is
reached only by IDs: the Project Task Manager answers the coordinator by `solution_designer_4b7d`
(the sender run id) and gives a later Task by `software_engineering_team_8f12`.

### J4 — A task agent delegates further (S8)

""")
w(step_list([
    ("Web Researcher (task agent)", "tool call", call("delegate_task", recipient_address="/summarizer", description="Summarize these three sources in 150 words: …")),
    ("Web Researcher", "tool result (no task_id: this is part of its own Task)", result(delegated=True, target_kind="agent", target_agent_run_id="summarizer_77d0")),
    ("Summarizer (task agent of a task agent)", "first message (task message)", task_msg("web_researcher_5a1c", "Summarize these three sources in 150 words: …")),
    ("Summarizer", "tool call (report back)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="Summary: …")),
]))
w("""

The Web Researcher's address (`/web_researcher`) is never shown to the Summarizer: from where the
Summarizer sits it would reach a configured `/web_researcher` or nobody, never this task agent.

### J5 — Inside an organization (S9, S6, S11)

""")
w(step_list([
    ("Project Task Manager (direct agent of the organization)", "tool call (another organization agent, by address)", call("send_message_to", recipient_address="/concierge", content="Tell the user the release is ready.")),
    ("Project Task Manager", "tool call (delegate to the organization's team: creates a task agent team, not the regular team)", call("delegate_task", recipient_address="/software_engineering_team", task_id="task_4c1a")),
    ("Project Task Manager", "tool result", result(delegated=True, target_kind="team", target_team_run_id="software_engineering_team_19ab", target_team_coordinator_agent_run_id="solution_designer_c3e0")),
    ("Code reviewer of that task agent team → Project Task Manager", "received message", header("code_reviewer", "code_reviewer_e211", "Question about the scope: …")),
    ("Project Task Manager", "tool call (answer by the sender run id)", call("send_message_to", target_agent_run_id="code_reviewer_e211", content="Keep it out of scope.")),
]))
w("""

Answering `/software_engineering_team/code_reviewer` instead would reach the organization's
**regular** code reviewer, a different agent, without an error (§9 S6). That is why the header gives the
address only when it reaches the sender: here it gives only the sender run id.
""")
w("""

### J6 — A Task's life: close, message, reopen, continue (Project Task Manager with `update_task`)

""")
w(step_list([
    ("Project Task Manager", "tool call", call("delegate_task", recipient_address="/web_researcher", description="Collect three benchmark results for model X.")),
    ("Project Task Manager", "tool result (a Task with no Project was created)", result(delegated=True, target_kind="agent", target_agent_run_id="web_researcher_5a1c", task_id="task_8e2f")),
    ("Web Researcher", "tool call (report, by the sender run id)", call("send_message_to", target_agent_run_id="project_task_manager_3c9e", content="Done: …")),
    ("Project Task Manager", "tool call (the work is finished)", call("update_task", task_id="task_8e2f", status="DONE")),
    ("Project Task Manager", "tool result", result(projectId=None, taskId="task_8e2f", status="DONE")),
    ("Project Task Manager", "tool call (a later question, Task still DONE)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="Can you add one more result?")),
    ("Project Task Manager", "tool result (refused)", result(accepted=False, target_agent_run_id=None, message=refusal("M-08", status="DONE"))),
    ("Project Task Manager", "tool call (reopen)", call("update_task", task_id="task_8e2f", status="IN_PROGRESS")),
    ("Project Task Manager", "tool call (the same message again)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="Can you add one more result?")),
    ("Project Task Manager", "tool result", result(accepted=True, target_agent_run_id="web_researcher_5a1c", message=refusal("M-18", **{"run id": "web_researcher_5a1c"}))),
]))
w("""

Only the agent that assigned the Task can continue it; any other agent gets M-07 (§12). An agent
without `update_task` never closes anything: a quiet task agent is shut down after a while and
continues with its conversation when it is messaged again.

### J7 — A task agent asks a question mid-task (S7, S4)

""")
w(step_list([
    ("Web Researcher (task agent)", "tool call (question, by the sender run id from the task message)", call("send_message_to", target_agent_run_id="research_assistant_7f3a", content="Only peer-reviewed sources, or blogs too?")),
    ("Research Assistant", "received message", header("web_researcher", "web_researcher_5a1c", "Only peer-reviewed sources, or blogs too?")),
    ("Research Assistant", "tool call (answer, by the sender run id)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="Peer-reviewed only.")),
    ("Web Researcher", "received message", header("research_assistant", "research_assistant_7f3a", "Peer-reviewed only.", address="/research_assistant")),
    ("Web Researcher", "tool call (final report, by the sender run id)", call("send_message_to", target_agent_run_id="research_assistant_7f3a", content="Done: …")),
]))
w("""

### J8 — A member of a team the user started delegates outside its team (S13, S14)

""")
w(step_list([
    ("Implementation engineer (member, `/implementation_engineer`)", "tool call", call("delegate_task", recipient_address="/web_researcher", description="Find the current API limits of service Y.")),
    ("Implementation engineer", "tool result", result(delegated=True, target_kind="agent", target_agent_run_id="web_researcher_2b9d", task_id="task_33aa")),
    ("Web Researcher (task agent inside the team's run, §2a)", "first message (task message)", task_msg("implementation_engineer_6f01", "Find the current API limits of service Y.", address="/implementation_engineer")),
    ("Web Researcher", "tool call (report, by the sender run id)", call("send_message_to", target_agent_run_id="implementation_engineer_6f01", content="Limits: …")),
    ("Implementation engineer", "received message", header("web_researcher", "web_researcher_2b9d", "Limits: …")),
    ("Implementation engineer", "tool call (its own handoff rule, by address)", call("send_message_to", recipient_address="/code_reviewer", content="Implementation ready; handoff at /abs/handoff.md.")),
]))
w("""

Delegating to a teammate instead (`recipient_address: "/code_reviewer"` in `delegate_task`) is
refused with M-21 (§12).

### J9 — No handoff rule fits (§5.3)

""")
w(step_list([
    ("Solution designer (coordinator of a task agent team)", "tool call", call("get_handoff_rules")),
    ("Solution designer", "tool result (no rule matches its outcome: blocked on a user decision)", result(handoffs=[{"when": "When the design is complete", "recipient_address": "/software_engineering_team/architecture_reviewer"}])),
    ("Solution designer", "tool call (another agent gave the task: tell it, by the sender run id from the task message)", call("send_message_to", target_agent_run_id="project_task_manager_3c9e", content="Blocked: the user must choose between A and B.")),
]))
w("""

An agent that was not given its task by another agent finishes normally instead.

### J10 — The user stops a task agent

""")
w(step_list([
    ("Project Task Manager", "tool call (while the user is stopping the task agent)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…")),
    ("Project Task Manager", "tool result", result(accepted=False, target_agent_run_id=None, message=refusal("M-17"))),
    ("Project Task Manager", "tool call (after it stopped)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…")),
    ("Project Task Manager", "tool result", result(accepted=False, target_agent_run_id=None, message=refusal("M-16", **{"run id": "web_researcher_5a1c"}))),
    ("Project Task Manager", "tool call (start again with a new task agent)", call("delegate_task", recipient_address="/web_researcher", description="…")),
]))
w("""

## 10a. Tool results, success and failure

Each result has the fields its tool description names; a refusal carries the catalogue text
(wording §7.3) as `message`, plus a `code`.

""")
w(step_list([
    ("delegate_task", "success, a task agent (a description-only delegation by an agent nobody delegated to also returns task_id)", result(delegated=True, target_kind="agent", target_agent_run_id="web_researcher_5a1c", task_id="task_8e2f")),
    ("delegate_task", "success, a task agent team", result(delegated=True, target_kind="team", target_team_run_id="software_engineering_team_8f12", target_team_coordinator_agent_run_id="solution_designer_4b7d")),
    ("delegate_task", "success with launch_notes", result(delegated=True, target_kind="agent", target_agent_run_id="web_researcher_5a1c", task_id="task_8e2f", launch_notes=["<which agent runs on a different runtime or model than configured, and on what>"])),
    ("delegate_task", "success when the caller is a task agent (no task_id: the new task agent's work is part of the caller's Task)", result(delegated=True, target_kind="agent", target_agent_run_id="summarizer_77d0")),
    ("delegate_task", "failure (nothing was created)", result(delegated=False, message=refusal("M-22", address="/web_resercher"))),
    ("send_message_to", "delivered", result(accepted=True, target_agent_run_id="research_assistant_7f3a")),
    ("send_message_to", "refused", result(accepted=False, target_agent_run_id=None, message=refusal("M-13"))),
    ("get_handoff_rules", "an agent with rules", result(handoffs=[{"when": "When the review passes", "recipient_address": "/api_e2e_engineer"}])),
    ("get_handoff_rules", "an agent without rules", result(handoffs=[])),
    ("list_available_agents", "result", result(agents=[{"name": "Web Researcher", "kind": "agent", "address": "/web_researcher", "description": "Finds and summarizes sources."}, {"name": "Software Engineering Team", "kind": "agent_team", "address": "/software_engineering_team", "description": "Designs, builds and delivers software changes."}])),
]))
w("""

## 11. The `@` note, by example

The note is written for the agent the user is talking to (wording §8).

The user talks to the code reviewer of a team the user started and mentions itself, a teammate
and a catalog agent:

```text
Please check this with @api_e2e_engineer and @Web Researcher, and @code_reviewer you too.

[Mentioned agents]
- api_e2e_engineer (agent) at /api_e2e_engineer, in your team: talk with it using send_message_to; don't delegate to it.
- Web Researcher (agent) at /web_researcher: delegate the task to it with delegate_task; it returns a run id to follow up with.
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
- Software Engineering Team (agent team) at /software_engineering_team: talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its run id to follow up with.
```

The user talks to a task agent in a standalone run and mentions the agent the user started:

```text
Report this to @Research Assistant.

[Mentioned agents]
- Research Assistant (agent) at /research_assistant: talk with it using send_message_to; you can't delegate to it.
```

""")
w("""

## 12. Every refusal and result text, with a call that triggers it

Generated from the wording file's catalogue (§7.3); the generator stops if an entry has no row
here. Placeholders are filled with example values.

""")
SCEN = {
    "M-01": ("The Project Task Manager answers a task agent team member by its address (S5)", call("send_message_to", recipient_address="/software_engineering_team/code_reviewer", content="…"), {"address": "/software_engineering_team/code_reviewer"}),
    "M-02": ("Both selectors at once", call("send_message_to", recipient_address="/project_task_manager", target_agent_run_id="project_task_manager_3c9e", content="Done."), {}),
    "M-03": ("No selector", call("send_message_to", content="Done."), {}),
    "M-04": ("A task agent answers with a bare name", call("send_message_to", recipient_address="research_assistant", content="Done."), {"address": "research_assistant", "detail": "it must begin with '/'"}),
    "M-05": ("Talking with a task agent team by the team's own run id", call("send_message_to", target_agent_run_id="software_engineering_team_8f12", content="…"), {"run id": "software_engineering_team_8f12", "coordinator run id": "solution_designer_4b7d"}),
    "M-06": ("Messaging an agent that works on a different Task", call("send_message_to", target_agent_run_id="web_researcher_0d4e", content="…"), {}),
    "M-07": ("An agent that did not assign the Task messages a task agent whose Task is closed", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…"), {}),
    "M-08": ("The assigner messages its task agent while the Task is still DONE (J6)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…"), {"status": "DONE"}),
    "M-09": ("The assigner reopened Task task_8e2f, but the task agent was since given Task task_ee74", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…"), {"current task_id": "task_ee74", "status": "IN_PROGRESS", "reopened task_id": "task_8e2f", "run id": "web_researcher_5a1c"}),
    "M-10": ("The assigner reopened a Task whose task agent never started", call("send_message_to", target_agent_run_id="web_researcher_9c3e", content="…"), {}),
    "M-11": ("Messaging a run id that no running agent has", call("send_message_to", target_agent_run_id="research_lead", content="Done."), {"run id": "research_lead"}),
    "M-12": ("The recipient refuses the message", call("send_message_to", target_agent_run_id="concierge_5d21", content="…"), {"run id": "concierge_5d21", "reason": "<the recipient's reason>"}),
    "M-13": ("Messaging yourself", call("send_message_to", target_agent_run_id="code_reviewer_91c2", content="…"), {}),
    "M-14": ("Messaging a run id of an agent that is no longer running here", call("send_message_to", target_agent_run_id="web_researcher_1a2b", content="…"), {}),
    "M-15": ("Messaging a configured agent that is not running", call("send_message_to", target_agent_run_id="concierge_5d21", content="…"), {"run id": "concierge_5d21"}),
    "M-16": ("Messaging a task agent that has stopped (J10)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…"), {"run id": "web_researcher_5a1c"}),
    "M-17": ("Messaging a task agent the user is stopping (J10)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…"), {}),
    "M-18": ("Result: the assigner reopened the Task and messaged the task agent (J6)", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…"), {"run id": "web_researcher_5a1c"}),
    "M-19": ("Result: as M-18, but the message itself was not delivered", call("send_message_to", target_agent_run_id="web_researcher_5a1c", content="…"), {"run id": "web_researcher_5a1c"}),
    "M-20": ("Messaging or delegating while the user stops the whole team or run", call("send_message_to", recipient_address="/code_reviewer", content="…"), {}),
    "M-21": ("A team member delegates to a teammate", call("delegate_task", recipient_address="/api_e2e_engineer", description="…"), {"address": "/api_e2e_engineer"}),
    "M-22": ("Delegating to an address nobody has (a typo)", call("delegate_task", recipient_address="/web_resercher", description="…"), {"address": "/web_resercher"}),
    "M-23": ("Delegating to a bare name", call("delegate_task", recipient_address="web researcher", description="…"), {"address": "web researcher", "detail": "it must begin with '/'"}),
    "M-24": ("Delegating with neither an address nor a run id", call("delegate_task", description="…"), {}),
    "M-25": ("Both target run ids at once", call("delegate_task", target_agent_run_id="web_researcher_5a1c", target_team_run_id="software_engineering_team_8f12", task_id="task_ee74"), {}),
    "M-26": ("A target run id together with a description", call("delegate_task", target_agent_run_id="web_researcher_5a1c", task_id="task_ee74", description="…"), {"arguments": "description"}),
    "M-27": ("An empty description", call("delegate_task", recipient_address="/web_researcher", description=""), {"what is wrong": "description is required"}),
    "M-28": ("A task agent uses task_id", call("delegate_task", recipient_address="/summarizer", task_id="task_91b0"), {}),
    "M-29": ("A task agent whose Task is closed delegates", call("delegate_task", recipient_address="/summarizer", description="…"), {}),
    "M-30": ("Delegating where Tasks are not available", call("delegate_task", recipient_address="/web_researcher", description="…"), {}),
    "M-31": ("Delegating a saved Task that is DONE", call("delegate_task", recipient_address="/software_engineering_team", task_id="task_259d"), {"status": "DONE"}),
    "M-32": ("The Task is closed while the delegation is starting", call("delegate_task", recipient_address="/software_engineering_team", task_id="task_4c1a"), {}),
    "M-33": ("Mode 3: the Task was given but its message did not arrive", call("delegate_task", target_team_run_id="software_engineering_team_8f12", task_id="task_ee74"), {"task_id": "task_ee74", "reason": "<why>", "run id": "solution_designer_4b7d"}),
    "M-34": ("Mode 3 with a run id that is not one of your task agents", call("delegate_task", target_agent_run_id="code_reviewer_91c2", task_id="task_ee74"), {"run id": "code_reviewer_91c2"}),
    "M-35": ("Mode 3 with the coordinator's run id instead of the team's", call("delegate_task", target_agent_run_id="solution_designer_4b7d", task_id="task_ee74"), {"run id": "solution_designer_4b7d", "team run id": "software_engineering_team_8f12"}),
    "M-36": ("Mode 3 with a team's run id as target_agent_run_id", call("delegate_task", target_agent_run_id="software_engineering_team_8f12", task_id="task_ee74"), {"run id": "software_engineering_team_8f12"}),
    "M-37": ("Mode 3 with a team member's run id", call("delegate_task", target_agent_run_id="code_reviewer_e211", task_id="task_ee74"), {"run id": "code_reviewer_e211", "team run id": "software_engineering_team_8f12"}),
    "M-38": ("Mode 3 with a task agent's run id as target_team_run_id", call("delegate_task", target_team_run_id="web_researcher_5a1c", task_id="task_ee74"), {"run id": "web_researcher_5a1c"}),
    "M-39": ("Mode 3 with the Task it already works on", call("delegate_task", target_agent_run_id="web_researcher_5a1c", task_id="task_8e2f"), {}),
    "M-40": ("Mode 3 to a task agent that has no Task (created before Tasks existed)", call("delegate_task", target_agent_run_id="web_researcher_old1", task_id="task_ee74"), {"task_id": "task_ee74"}),
    "M-41": ("Mode 3 to a task agent working on part of another agent's Task", call("delegate_task", target_agent_run_id="summarizer_77d0", task_id="task_ee74"), {"task_id": "task_ee74"}),
    "M-42": ("Mode 3 by an agent that did not give the task agent its last Task", call("delegate_task", target_agent_run_id="web_researcher_5a1c", task_id="task_ee74"), {"task_id": "task_ee74"}),
    "M-43": ("Mode 3 while the task agent's Task is still open", call("delegate_task", target_agent_run_id="web_researcher_5a1c", task_id="task_ee74"), {"current task_id": "task_8e2f", "status": "IN_PROGRESS", "task_id": "task_ee74"}),
    "M-44": ("Mode 3 with the Task the task agent already has", call("delegate_task", target_agent_run_id="web_researcher_5a1c", task_id="task_8e2f"), {"task_id": "task_8e2f"}),
    "M-45": ("Mode 3 to a task agent that never started", call("delegate_task", target_agent_run_id="web_researcher_9c3e", task_id="task_ee74"), {"task_id": "task_ee74"}),
}
missing = sorted(set(CAT) - set(SCEN)); extra = sorted(set(SCEN) - set(CAT))
if missing or extra:
    raise SystemExit(f"views §12 out of step with the catalogue: missing {missing}, unknown {extra}")
w("| ID | Situation | Call | The agent reads |\n| --- | --- | --- | --- |\n")
for mid in CAT:
    situation, c, subs = SCEN[mid]
    w(f"| {mid} | {situation} | `{c}` | {refusal(mid, **subs)} |\n")
w("""
The silent case has no row because nothing is refused: in an organization with a regular team,
answering a task agent team member by its address would be delivered to the regular member
(§9 S6). The wording prevents it by never showing that address.
""")

open(out, "w").write("".join(o))
print("written")
