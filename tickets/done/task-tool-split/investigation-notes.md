# Investigation Notes

## Investigation Meta

- Package identifier: `task-tool-split`
- Request / ticket: Project Task `project_task_ee74d72b-3733-4383-9e5d-20372867e06a` (revised): split `create_or_update_task` into `create_task` and `update_task`; no automatic exposure. Handed over by `/project_task_manager` on 2026-10-15 at the user's instruction ("send to the same team because he analyzed this task a lot"); formal assignment follows when 259ddae7 is DONE.
- Workspace root / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split` / `codex/task-tool-split`
- Base: `origin/personal` at `35eacddb25` (fetched 2026-10-15). Finalization target: `origin/personal`.
- Bootstrap: succeeded. Blocker: none.
- Current solution revision ID: `SR-003`
- Authorities read: `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md`, data migration guideline (this conversation, 2026-10-15).
- Status: requirements and architecture investigation complete (SR-003).

## Initial Request And Clarifications

- Original: `temp-task-tool-split-proposal.md` (this folder).
- User decisions (2026-10-15): temp Tasks stay; unclosed temp Tasks may accumulate ("we shouldn't block us"); root cause is the mixed meaning of `create_or_update_task`; split into two tools; the user configures which agents get them and their skills decide usage.

## Source Log

| Date | Source | Exact Source | Finding | Implication |
| --- | --- | --- | --- | --- |
| 2026-10-15 | Code | `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts#automaticCollaborationToolNames` | Every member context gets `send_message_to`, `delegate_task`, `create_or_update_task` (+ `get_handoff_rules` when Team-scoped) | Remove `create_or_update_task` from the automatic list |
| 2026-10-15 | Code | `src/agent-tools/project-tasks/project-task-tool-contract.ts` | One tool, two strict modes: create `{project_id, description, context_files?}`, patch `{task_id, description?, status?, context_files?}`; `PROJECT_TASK_TOOL_NAMES` has 4 names | Two tools with one mode each |
| 2026-10-15 | Code | `src/agent-tools/project-tasks/project-task-native-tools.ts`, `project-task-tool-manifest.ts` | Native tool class + MCP manifest per tool name | Add/rename entries |
| 2026-10-15 | Code | `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:34,69,149,168` | `delegate_task` description and prompt sections tell every agent to close a returned `task_id` with `create_or_update_task` and to reopen with it | Must depend on the agent having `update_task` |
| 2026-10-15 | Code | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts:55` | `@` note: "If it also returns a task_id, call create_or_update_task … DONE" | Same |
| 2026-10-15 | Code | `src/projects/services/project-task-service.ts:372`; `src/projects/domain/task-execution-resources.ts:125,179` | Error guidance names `create_or_update_task` for reactivation | Rename to `update_task` |
| 2026-10-15 | Docs | `docs/modules/projects.md` §Exactly Four Agent Tools (Exposure: "opt-in … except create_or_update_task"), `agent_tools.md`, `agent_tools_mcp_server.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `prompt_engineering.md`; web `docs/projects.md`, `docs/chat.md` | Docs describe the combined tool and automatic exposure | Update |
| 2026-10-15 | Tests | ~25 server/web test and probe files reference the tool name | Update with the change | — |
| 2026-10-15 | Data | `grep -rl create_or_update_task` in `~/.autobyteus/server-data/{agents,agent-teams,agent-packages,skills}` | No app-managed definition or installed package references it | — |
| 2026-10-15 | Data | `/Users/normy/autobyteus_org/autobyteus-agents/agents/project-task-manager/agent-config.json` (`toolNames` includes `create_or_update_task`) and `skills/project-task-management/SKILL.md` (lines 43, 89, 93) | The Project Task Manager package (separate repo `AutoByteus/autobyteus-agents`, a registered package root) is the only configured user | DEC-004 |
| 2026-10-15 | Doc | `docs/modules/agent_team_execution.md` ("legacy configured tool names are ignored") | Unknown configured tool names are ignored | An old `create_or_update_task` in a config would silently give no tool |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current | Evidence |
| --- | --- | --- | --- | --- |
| BEH-001 | System | any collaborating agent | gets `create_or_update_task` automatically | exposure code |
| BEH-002 | System | description-only `delegate_task` from an unowned agent | creates a temp Task, returns `task_id`; text tells the agent to close it with `create_or_update_task` | llm contract |
| BEH-003 | System | Project Task Manager | creates Tasks (create mode) and updates/closes/reopens them (patch mode) | PTM config + skill |
| BEH-004 | System | reactivation guidance errors | name `create_or_update_task` | projects services |
| BEH-005 | User | `@X` | note tells the agent to close a returned `task_id` | presentation contract |

## Persisted Data And State Facts

- No stored Task, run or tree data names the tool; only agent configurations (`toolNames`) and skills do. Locally: one configuration (the Project Task Manager package in `autobyteus-agents`).
- Raw traces of past runs contain historical `create_or_update_task` calls; they are history and are not rewritten.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | Same prompt/tool texts as Task 259ddae7 | rebase order; whichever lands second rebases | Open |
| RSK-002 | Risk | Other users' agent packages may list `create_or_update_task` | DEC-004 | Open |
| UNK-001 | Unknown | How tool texts become per-agent (exposure-aware `delegate_task` description, mention note per focused agent) | architecture | Open |

## Architecture Investigation Findings

| Source | Path | Finding | Design Implication |
| --- | --- | --- | --- |
| Review ARCH-F-001, code | `src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts`; `autobyteus-agent-tool-resolver.ts:50` | AutoByteus filter drops `create_task` (listed in `LEGACY_LOCAL_TASK_PLAN_TOOL_NAMES`) for every member context. No legacy task-plan or removed result tool is registered in `autobyteus-ts` or the server; the only `TASK_MANAGEMENT` tools are `delegate_task` and the project-task tools, which the filter already passes. The resolver already warns and skips unknown names (`autobyteus-agent-tool-resolver.ts` ~line 125) | the whole filter is dead except for the harmful entry: remove the file |
| Review ARCH-F-004, code | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | parser accepts `guidanceFor(entries)` or two exact saved lines; the current delegate sentence also appears combined with in-run and run-agent sentences | parser must accept the previous delegate sentence in every combination |


| Source | Path | Finding | Design Implication |
| --- | --- | --- | --- |
| Code | `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | `SEND_MESSAGE_TO_LLM_DESCRIPTION`, `DELEGATE_TASK_LLM_DESCRIPTION`, `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` are static constants shared by all agents; consumers: `send-message-to-tool-contract.ts`, `task-delegation-tool-manifest.ts`, `member-collaboration-instruction-renderer.ts` | Make texts tool-neutral; no per-agent texts |
| Code | `project-task-native-tools.ts` (static `getDescription`), `project-task-tool-manifest.ts` | tool descriptions are static per tool | guidance belongs in `update_task`'s own description |
| Data | `~/.autobyteus/server-data` JSON files and `db/*.db` | only one old temp Task description mentions the old name (history); no DB rows | no migration |
