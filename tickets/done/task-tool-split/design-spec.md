# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` at `SR-003` (Solution Designer within the user's direction, user informed; DEC-004 by the user, 2026-10-15)
- Behavior-defining supplements: `temp-task-tool-split-proposal.md`
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (2026-10-15); data migration guideline (not applicable: no persisted data transformation).
- Conflicts or discrepancies: None.

## Current-State Read

One tool, `create_or_update_task`, has two strict modes (create a Project Task; patch any Task by ID). `automaticCollaborationToolNames` adds it to every collaborating agent next to `send_message_to` and `delegate_task`. Static texts tell every agent to close a returned `task_id` and to reopen closed Tasks "with create_or_update_task":
`DELEGATE_TASK_LLM_DESCRIPTION`, `SEND_MESSAGE_TO_LLM_DESCRIPTION`, `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` (all in `agent-team-collaboration-llm-contract.ts`), the `@` note (`autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts`), and reactivation errors (`project-task-service.ts:372`, `task-execution-resources.ts:125,179`). Tool descriptions are static per tool (native classes and the MCP manifest), not per agent.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` — one tool contract split into two, one exposure rule, a set of static texts, docs and ~25 test/probe files; no runtime-owner, persistence or concurrency change.
- Architectural risk: `High` — it changes the public agent tool contract (a tool name disappears, two appear) and default exposure; any agent configuration still naming `create_or_update_task` silently loses task tools (the Project Task Manager package until follow-up FU-1 lands).
- Escalation trigger: a consumer outside this repository other than agent configurations depends on the old name; or a text cannot be made tool-neutral.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported |
| --- | --- | --- | --- |
| Code | `src/agent-execution/shared/runtime-agent-tool-exposure.ts` | single owner of automatic exposure | drop the task tool from the automatic list |
| Code | `src/agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-native-tools.ts`, `project-task-tool-manifest.ts` | single contract (names, descriptions, schema, parser) feeding native tools and MCP | split here; both transports follow |
| Code | `agent-team-collaboration-llm-contract.ts` consumers: `task-delegation-tool-manifest.ts`, `send-message-to-tool-contract.ts`, `member-collaboration-instruction-renderer.ts`, standalone instruction | texts are static, shared by all agents | make them tool-neutral instead of per-agent |
| Data | app data and DBs | no stored config names the tool except the PTM package (out of scope) | no migration |

## Intended Change

Replace `create_or_update_task` with `create_task` (create mode) and `update_task` (patch mode); stop exposing any task tool automatically; make every collaboration text tool-neutral about closing/reopening; put the closing and reopening guidance in `update_task`'s own description, which only agents that have the tool see.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004; project-task tool contract, native tools, MCP manifest, automatic exposure, the AutoByteus runtime tool filter (removed), collaboration texts, `@` note (compose and parse), reactivation error texts, docs, tests.
- Deliberately left alone: temp Task creation and `task_id` in the `delegate_task` result (DEC-003); Task service, closure, reactivation; `list_projects`, `list_project_tasks`, `create_or_update_project`; agent configurations and skills (DEC-004); Task 259ddae7's model changes.
- Follow-ups:
  - FU-1: update the Project Task Manager package (`autobyteus-agents/agents/project-task-manager`: `toolNames` → `create_task`, `update_task`; skill wording) — another agent's Task; must land together with this release.
  - FU-2 (optional, not requested): split `create_or_update_project` the same way for symmetry.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-004; AC-001, AC-006 | run launch builds tool exposure | task tool automatic | not automatic | DS-001 |
| BEH-002 | System | REQ-002, REQ-005; AC-001, AC-002 | description-only delegation | text says close with old tool | neutral texts; guidance in `update_task` | DS-002 |
| BEH-003 | System | REQ-001..REQ-003; AC-003 | PTM tool calls | one tool, two modes | two tools | DS-003 |
| BEH-004 | System | REQ-005; AC-004 | message to a closed copy | error names old tool | neutral wording | DS-004 |
| BEH-005 | User | REQ-005; AC-005 | `@X` | note says close with old tool | sentence removed | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship | Status |
| --- | --- | --- | --- |
| `temp-task-tool-split-proposal.md` | direction | defines the split | Agreed |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (tool contract and exposure).
- Current design issue found: `Yes`.
- Structural triggers: *ambiguous boundary* — one tool whose meaning depends on which argument is present (`task_id` vs `project_id`) serves two subjects (creating a Project Task vs updating any Task); *off-spine coupling* — collaboration texts that every agent sees depend on an optional tool. Ruled out: duplicated policy (the parser already owns both modes in one place).
- Root cause: `Boundary Or Ownership Issue` (one interface for two operations; guidance placed on the wrong tool).
- Refactor needed now: `Yes` — split the interface; move guidance to the owning tool.
- Design response: two tools sharing one parser module with two entry points; guidance lives in `update_task`'s description.
- Deferrals: FU-2 (project tool split) not requested.

## Terminology

- Task tool: `create_task` or `update_task`.
- Tool-neutral text: a collaboration text that does not name a task tool.

## Legacy Removal Policy (Mandatory)

- Obsolete: tool name `create_or_update_task`, its native class, manifest entry, `CREATE_OR_UPDATE_TASK_TOOL_NAME`, its entry in `automaticCollaborationToolNames`, the closing/reopening sentences naming it.
- Compatibility wrappers kept: `None` (no alias; DEC-002).

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: agent configurations' `toolNames` (outside this ticket's scope by DEC-004); historical raw traces and one temp Task description that mention the old name.
- Decision: `Not Affected` for this ticket — no data is read or written differently. Old names in configurations are ignored as unknown tools (existing behavior for retired names); history keeps its text.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | run launch | tool list exposed (native/MCP) | `runtime-agent-tool-exposure.ts` | default exposure |
| DS-002 | Primary | BEH-002, BEH-005 | prompt/tool schema build | agent reads texts | llm contract + presentation contract | texts match tools |
| DS-003 | Primary | BEH-003 | agent calls a task tool | Task service create/update | project-task tool contract → `ProjectTaskService` | split interface |
| DS-004 | Primary | BEH-004 | message to closed copy | error returned | projects services | neutral guidance |

## Primary Execution Spine(s)

- DS-003: `agent tool call (native or MCP) -> project-task tool manifest/native class -> parseCreateTaskInput | parseUpdateTaskInput -> ProjectTaskService.createTaskWithLocalContextFiles | updateTaskById -> {task: …}`
- DS-001: `agent definition toolNames + member context -> buildRuntimeAgentToolExposure (automatic: send_message_to, delegate_task, get_handoff_rules when Team-scoped) -> per runtime: AutoByteus resolveAutoByteusAgentTools (registry lookup; unknown names warned and skipped) | Codex/Claude Agent Tools MCP session (enabledProjectTaskToolNames) -> tools the agent sees`. The AutoByteus step today first passes names through `resolveAutoByteusExecutionToolNames`, which drops `create_task` as a legacy name; that filter is removed (ARCH-F-001).

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-003 | Each tool has one parser and calls the same service method as today's corresponding mode; results and errors are unchanged. | manifest, parser, service | tool contract | error projection |
| DS-001 | The automatic list loses the task tool; configured names pass through as today. | exposure | exposure module | — |
| DS-002 | Collaboration texts describe closing/reopening without naming a tool ("the run that assigned it can reopen the Task …"); `update_task`'s description carries the how-to, including "the task_id a description-only delegate_task returned". | texts | llm contract | — |
| DS-004 | Error strings describe the state and who can act, without a tool name. | error builders | projects services | — |

## Spine Actors / Main-Line Nodes

Project-task tool contract (names, descriptions, schemas, parsers), native tool classes, MCP manifest, exposure module, collaboration text module, presentation-contract mention note, projects services' error strings.

## Ownership Map

- `project-task-tool-contract.ts`: tool names, descriptions, schemas, input parsing for all project-task tools.
- `runtime-agent-tool-exposure.ts`: which tools are automatic.
- `agent-team-collaboration-llm-contract.ts`: shared collaboration texts.
- `collaborator-mention-note.ts`: `@` note wording.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| `project-task-native-tools.ts` classes | tool contract | native registration | parsing rules |
| `project-task-tool-manifest.ts` | tool contract | MCP registration | parsing rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `create_or_update_task` tool (contract entry, native class, manifest entry, `CREATE_OR_UPDATE_TASK_TOOL_NAME`) | split | `create_task`, `update_task` | In This Change |
| task tool in `automaticCollaborationToolNames` | no automatic exposure | configuration | In This Change |
| closing/reopening sentences naming the old tool (llm contract ×4, mention note ×1, errors ×3) | tool-neutral texts | `update_task` description | In This Change |
| `@` note sentence telling the agent to close a returned `task_id` | not every agent can | `update_task` description | In This Change |
| Old-name references in docs, tests, probes, fixtures | superseded | new names | In This Change (released-data fixtures that record history stay as they are) |
| `src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts` (`LEGACY_LOCAL_TASK_PLAN_TOOL_NAMES`, `REMOVED_TASK_DELEGATION_RESULT_TOOL_NAMES`, `TASK_MANAGEMENT` category filter, `isAutoByteusCollaborationMember`, `resolveAutoByteusExecutionToolNames`) and its call in `autobyteus-agent-tool-resolver.ts:50` | Dead: none of the six legacy task-plan names nor the three removed result-tool names is registered in `autobyteus-ts` or the server (`rg` over both `src` trees); the only `TASK_MANAGEMENT` tools are `delegate_task` and the project-task tools, which the filter already passes; the one live effect is harmful (drops `create_task`, ARCH-F-001). The resolver already logs and skips names not in the registry | resolver uses `runtimeToolExposure.requestedToolNames` directly | In This Change |
| `tests/unit/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.test.ts`; the filter assertion in `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts:330-332` | tests of removed code | AutoByteus resolver test: a member context configured with `create_task`, `update_task` gets both native tools; one configured with `create_or_update_task` gets neither and a "not found" warning | In This Change |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility |
| --- | --- | --- | --- |
| error projection | DS-003 | tools | unchanged `{error: {code, message}}` |
| first-party name protection | DS-001 | exposure | protect `create_task`, `update_task` against MCP collisions (replaces old name) |

## Ownership Boundaries

Tools call `ProjectTaskService` only; services are unchanged except error text. Texts stay owned by their modules; no module computes texts from an agent's exposure.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| project-task tool contract | parsing, schemas, descriptions | native classes, MCP manifest | transports parsing arguments themselves |

## Dependency Rules

Unchanged; the presentation-contracts package keeps no dependency on server tool names other than in prose.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `create_task` | new Project Task | create | `{project_id, description, context_files?}`; `status` and `task_id` rejected (`TASK_CREATE_STATUS_UNSUPPORTED`, `PROJECT_TOOL_ARGUMENT_INVALID`) | result `{task: {projectId, taskId, status, attachedContextFiles?}}` |
| `update_task` | any Task by ID | patch description/status/context files; DONE/CANCELLED closure; reopening | `{task_id, description?, status?, context_files?}`; `project_id` rejected; empty patch `TASK_PATCH_REQUIRED` | same result; works for temp Tasks; `context_files` rejected for temp Tasks as today |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `create_task` | Yes | Yes | Low | — |
| `update_task` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Risk | Action |
| --- | --- | --- | --- | --- |
| create tool | `create_task` | Yes | Low (creates Project Tasks only; description says so) | — |
| update tool | `update_task` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| create/patch semantics | `ProjectTaskService` | Reuse unchanged |
| parsing | `parseProjectTaskToolInput` | Extend: two entry points sharing validators |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| `agent-tools/project-tasks` | tool split | Extend |
| `agent-execution/shared` | exposure | Extend |
| `agent-collaboration/domain` | texts | Extend |
| `autobyteus-agent-presentation-contracts` | `@` note | Extend |
| `projects` | error text | Extend |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Why |
| --- | --- | --- |
| Task description / status / context_files validation | `project-task-tool-contract.ts` (private helpers) | shared by both tools |

## Shared Structure / Data Model Tightness Check

| Structure | Tight | Action |
| --- | --- | --- |
| `ProjectTaskToolName` union (`list_projects`, `list_project_tasks`, `create_or_update_project`, `create_task`, `update_task`) | Yes | — |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | Modify | names, descriptions (`update_task` carries closing/reopening guidance incl. temp Tasks from description-only delegation), schemas, `parseCreateTaskInput` / `parseUpdateTaskInput` |
| `…/project-task-native-tools.ts` | Modify | `CreateTaskTool`, `UpdateTaskTool` replace the combined class |
| `…/project-task-tool-manifest.ts` | Modify | MCP entries |
| `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | Modify | automatic list without task tools; doc comment |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Modify | tool-neutral closing/reopening sentences in `SEND_MESSAGE_TO_LLM_DESCRIPTION`, `DELEGATE_TASK_LLM_DESCRIPTION`, `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` |
| `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | Modify | compose: the delegate sentence loses its closing clause for every agent (DEC-005). `guidanceFor` takes the delegate sentence as a parameter; parse accepts `guidanceFor(entries, current)`, `guidanceFor(entries, PREVIOUS_RELEASE_DELEGATE_GUIDANCE)` (the exact sentence composed until this release, frozen as a saved constant next to `SAVED_NOTE_GUIDANCES`), or a `SAVED_NOTE_GUIDANCES` line — so every combination with the in-run and run-agent sentences saved by the previous release still parses (ARCH-F-004, AC-008). Parse tests cover each combination |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts` | Remove | see Removal plan (ARCH-F-001) |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | Modify | iterate `runtimeToolExposure.requestedToolNames` directly |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts`, `src/projects/domain/task-execution-resources.ts` | Modify | neutral error guidance |
| first-party tool-name protection (wherever `PROJECT_TASK_TOOL_NAMES` is used) | Follows the set | — |
| Docs: `docs/modules/projects.md` (§Exactly Four Agent Tools → five tools; Exposure), `agent_tools.md`, `agent_tools_mcp_server.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `prompt_engineering.md`; web `docs/projects.md`, `docs/chat.md` | Modify | new names, no automatic exposure |
| Tests/probes/fixtures listed in investigation notes | Modify | new names; unit tests for parsers, exposure and rendered texts |

## Applied Patterns (If Any)

None beyond the existing contract/manifest pattern.

## Target Subsystem / Folder / File Mapping

As above; no new files or folders.

## Folder Boundary Check

No folder changes.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| delegation text | "A description-only delegation by an agent that is not working on a Task also returns a `task_id` for that Task." | "…call create_or_update_task with that task_id and status DONE" | only agents with `update_task` should be told how to close |
| `update_task` description | "Update a Task by its task_id: a Project Task, or the Task a description-only delegate_task created. Status DONE … stops its copies …; to continue it later, set TODO or IN_PROGRESS, then message the copy's agent run ID …" | per-agent generated tool descriptions | static texts, owned by the tool that acts |
| reactivation error | "This Task is DONE. The run that assigned it can reopen the Task and message this copy again." | "…with create_or_update_task…" | sender may not have the tool (AC-004) |
| `@` note | "Delegate the work with delegate_task to its address; it returns a run ID to follow up with." | "…If it also returns a task_id, call create_or_update_task …" | DEC-005 (AC-005) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| alias `create_or_update_task` → both tools | keep old configs working | Rejected (DEC-002) | FU-1 updates the only known config |
| startup rewrite of configs | same | Rejected (out of scope, DEC-004) | FU-1 |
| per-agent generated tool descriptions | conditional texts | Rejected | tool-neutral texts + guidance in `update_task` |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Contract: names, descriptions, schemas, parsers; native classes; manifest.
2. Exposure: remove automatic task tool.
3. Texts: llm contract, mention note, error strings.
4. Tests (parsers, exposure per runtime, rendered texts snapshot) and docs.
5. Release notes: agents that need task tools must list `create_task` and/or `update_task`; coordinate with FU-1.

## Key Tradeoffs

- Tool-neutral texts plus guidance on the acting tool, instead of per-agent texts: simpler and static; an agent with `update_task` learns closing from that tool's description rather than from the delegation text.

## Risks

- PTM loses task tools between this release and FU-1 → release must ship together with FU-1.
- Overlap with Task 259ddae7 (same llm contract file): whichever lands second rebases.

## Guidance For Implementation

- Results and error codes of both tools must equal today's corresponding mode exactly (AC-003).
- Rendered prompts/tool schemas must contain neither `create_or_update_task` nor an instruction to close a `task_id` for agents without `update_task` (AC-001, AC-005); assert with snapshot tests on AutoByteus, Codex and Claude (AC-006), and an AutoByteus resolver test that a configured `create_task` and `update_task` produce both native tools for a member context (ARCH-F-001).
- Release notes: agents needing task tools must list `create_task` and/or `update_task`; a third-party MCP tool named `create_task` or `update_task` is now replaced by the first-party tool (with a logged warning), as for other first-party names.
- An agent configured with the old name launches normally without task tools (AC-007).
