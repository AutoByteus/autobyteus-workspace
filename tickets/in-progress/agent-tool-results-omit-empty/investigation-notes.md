# Investigation Notes — Agent tool results without empty fields, and a Task title

## Investigation Meta

- Package identifier: `agent-tool-results-omit-empty`
- Request / ticket: Project Task `autobyteus-260`, reassigned to this team on 2026-10-25 by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), with the first team's handover (`evidence/first-team-handoff-reassignment.md`).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty`, branch `codex/agent-tool-results-omit-empty` (new; the first team's worktree and branch were removed)
- Base: `origin/personal` @ `fc06a7355d1c4d76a55c812011e3718709c035d6`, fetched 2026-10-25; finalization target `origin/personal`
- Second repository touched by REQ-012: `/Users/normy/autobyteus_org/autobyteus-agents` (`origin/main` @ `d8cf242`); its worktree is created at implementation time.
- Bootstrap: worktree created; no blocker.
- Current solution revision ID: `SR-007`
- Authorities read (2026-10-25): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; `DESIGN.md` (mandatory rules, project-specific documents), `design-principles.md` § 15, `GLOSSARY.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §§ 1–4.

## Initial Request And Clarifications

- The user (2026-10-21): "for the fields which don't have any value, why do we even send those fields back? It's just a waste of tokens … I think this is a general problem … maybe the changes are in some central place."
- The user (2026-10-24, Task comments): work on this first; check all platform tools on both routes and the web app and skills that read these fields. Decisions recorded in comments: the empty-field rule, compact JSON, context files as `{name, path}`, the title field (required on new Tasks; old Tasks fall back to the first line "with a generous safety cut"), short entries by default with the full text on request.
- 2026-10-25: reassigned; four points open with the user (confirmation; DEC-009; DEC-013; Principle 15 / glossary).

## Source Log

How established: `Read` = read the source at the base revision; `Measured` = ran a read-only script; `Observed` = seen in this runtime.

| Source | Finding | How |
| --- | --- | --- |
| first team's notes (2026-10-24, base `8b34e8ae10`) | Inventory and serialization points; re-checked below at `fc06a7355d` (149 commits later) | Re-read |
| `git diff 8b34e8ae10..fc06a7355d -- autobyteus-server-ts/src/agent-tools …` | `list_available_nodes` was renamed `list_peer_nodes` (`agent-discovery/list-peer-nodes-*.ts`, MCP provider renamed); no other serialization change | Read |
| `src/startup/agent-tool-loader.ts` | Tool units: core (autobyteus-ts `registerTools`), project_tasks, browser, task_delegation, agent_communication, agent_discovery, published_artifact, media, search | Read |
| `grep JSON.stringify\|toJsonString` over `src/agent-tools`, `src/agent-communication` | No central serializer. Compact `JSON.stringify`: Project Task native tools and MCP provider, `get_handoff_rules` (native + MCP), `send_message_to` (`serializeSendMessageToResult`, Zod-parsed), agent-discovery refusal / MCP result, `publish_artifacts` native. Pretty (indent 2): agent/team definition tools (`JSON.stringify(…, null, 2)`), delegation (`task-delegation-tool-serialization.ts`), browser (`browser-tool-serialization.ts`), media (`media-tool-serialization.ts`), `publish_artifacts` MCP (`toJsonString`) | Read |
| `src/agent-tools/json-utils.ts` | `toJsonString(value, indent = 2)`; Date → ISO string replacer | Read |
| `mcp/agent-tools-mcp-structured-json-result.ts` | MCP results carry the same JSON twice: `content[0].text` and `structuredContent` | Read |
| own tool calls (Claude runtime, MCP route) | The model sees one copy | Observed |
| `evidence/SD-codex-0.164-mcp-result-to-model.txt` (openai/codex `rust-v0.164.0`, `codex-rs/protocol/src/models.rs:2467-2506`, test `preserves_structured_mcp_content`) | Codex gives the model only `serde_json::to_string(structuredContent)` when it is present; `content` is ignored. So the model reads one copy, and on Codex it is `structuredContent` that must follow the rule. DEC-006 resolved: no change to the two copies | Read (upstream source at the installed version's tag) |
| `project-task-tool-manifest.ts` | list: `projectId` per Task; `dependsOn: []`, `partOf: null`, `parts: []`, `contextFiles: [...6 fields]`, `assignments: []`, `closedAssignments: []` always present; search: `partOf: null`, `parts: []`, `summary` (first line, 160 chars), `meaningSearch` every call; acks: `dependsOn: []`, `partOf: null`. Already omitted when empty: `comments`, `commentCount`, `closedParts`, `partsNotClosed`, `attachedContextFiles` | Read |
| `autobyteus-ts/src/llm/prompt-renderers/native-tool-payload-format.ts` | Native route: a string result passes through; an object result is `JSON.stringify` (compact) by the provider renderer | Read |
| `autobyteus-ts/src/tools/terminal/types.ts` | `TerminalResult.toJSON` already omits empty `stdout`, `stderr`, `timedOut: false`, empty `backgroundProcesses` | Read |
| `autobyteus-ts/src/tools/terminal/tools/get-background-processes.ts`, `get-process-output.ts` | Object results: `{processes: []}`; `{output: "", …}` on a missing process | Read |
| `autobyteus-ts/src/tools/file/*`, `web/read-url-tool.ts`, `multimedia/*` | Return text | Read |
| `src/projects/domain/models.ts` | `ProjectTask` "has no title; the description is the content"; stored in `<projectId>/tasks/<taskId>/task.json` | Read |
| `src/projects/domain/ad-hoc-task.ts` | Temp tasks are a separate model (`ad-hoc-tasks/<taskId>/task.json`), created only by a description-only `delegate_task` | Read |
| `src/projects/stores/project-store.ts` `readTaskFile` | Tolerant reader that requires its used fields (`taskKey`, `description`, …); a file failing it is skipped (`null`) | Read |
| `src/app-data-migrations/migrations/project-task-keys-v1/` | Precedent: a new required Task fact (`taskKey`) written into existing `task.json` files by a registered migration with frozen released shapes | Read |
| `data_migration_guideline.md` § 3 | "a new required fact that only old data can supply" justifies a migration; "Tolerant reading is not a compatibility branch … no fallback reads" | Read |
| Project Task creation paths | `create_task` (manifest), GraphQL `createProjectTask` (`api/graphql/types/project-tasks.ts`), the app (`stores/projectTaskStore.ts`, `composables/projects/useProjectTaskDraft.ts`) | Read |
| `autobyteus-web/utils/projects/taskSummary.ts` and 10 users | Derived one-liner `taskSummary` / `taskCardSummary` / `taskSummaryLabel` / `taskCardPreview`: board row, dependency / part rows and pickers, part-of marker, delete confirmation (i18n `{summary}`), Workspaces-tree `TaskWorkerTaskSummary.vue`, `WorkspaceTransientExecutionRow.vue` | Read |
| `GLOSSARY.md`, `design-principles.md` § 15 | Glossary is the domain-word authority; no Task title / summary entry | Read |
| `autobyteus-agents` `project-task-management/SKILL.md` | Line 21 search "first line"; line 22 list for "full descriptions, comments or assignments"; line 56 already asks for "a short title … in the title field when the Task tools have one"; line 84 "an empty `closedParts`" (already absent today). No text relies on an empty field being present | Read |
| `autobyteus-agents` other skills | Opportunity Scout creates Project Tasks with `create_task` (generic text; the tool description and refusal will name the title); Solution Designer uses `update_task` status only | Read |
| `evidence/SD-measure-sizes.py` → `-output-20261025.txt` | AutoByteus Project: open 153 Tasks 481,648 B; omit-empty 468,844 (−2.7%); + context files `{name, path}` 418,303; descriptions 335,371 (70%). All 300: 1,287,231 B | Measured (read-only, numbers only) |
| `evidence/SD-measure-summary.py` → `-output-20261025.txt` | Short entries: open 31,126 B (−94%); all 59,528 B (−95%) | Measured |
| `evidence/SD-first-line-lengths.py` → `-output-20261025.txt` | 376 Tasks: first line median 133, p90 254, max 2,688; ≤120: 157; ≤160: 242; ≤200: 303; empty: 0 | Measured |
| `ls ~/.autobyteus/server-data` (counts only) | 11 Projects, 376 Project Task files, 15 Temp task files | Measured |

## Consumers Of The Changed Shapes

| Consumer | Reads | Impact |
| --- | --- | --- |
| Web activity view (tool results) | Prefers `structuredContent`, renders what is present | None expected; design verifies |
| Project Task Manager skill | Field names by name | REQ-012 sentences |
| Server tests | Exact shapes | Updated with each family |
| `send_message_to` Zod output schemas + `docs/modules/agent_communication.md` null rule | Require `target_agent_run_id: null` on refusal | Schemas and doc change with the shape |

## Persisted Data

- `task.json` of Project Tasks gains `title` (376 files in the user's data). Temp tasks unchanged.

## Requirement Implications

- Empty fields are 2–3% of `list_project_tasks`, 10–25% of small results; pretty-printing ~37% of structured results; descriptions 70% of lists — so the title + short entries carry most of the saving.
- One rule needs one owner reachable from both autobyteus-ts core tools and server tools.

## Supplement Inventory

| Path | Purpose | Owner | REQ | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `evidence/SD-measure-sizes.py`, `evidence/SD-measure-sizes-output-20261025.txt` | Before sizes | Solution Designer | REQ-010 | Current | In basis |
| `evidence/SD-measure-summary.py`, `evidence/SD-measure-summary-output-20261025.txt` | Short-entry size | Solution Designer | REQ-007 | Current | In basis |
| `evidence/SD-first-line-lengths.py`, `evidence/SD-first-line-lengths-output-20261025.txt` | Title limit | Solution Designer | REQ-003, REQ-005 | Current | In basis |
| `evidence/SD-codex-0.164-mcp-result-to-model.txt` | Codex model view of MCP results | Solution Designer | DEC-006 | Current | Design evidence |
| `evidence/SD-task-file-shape-inventory.py`, `evidence/SD-task-file-shape-inventory-output-20261025.txt` | Released Task file shapes (keys only) | Solution Designer | REQ-005, AC-004 | Current | Design evidence |
| `evidence/first-team-handoff-reassignment.md`, `evidence/first-team-SD-measure-*-20261024.txt` | First team's record | First team | — | Historical | N/A |

## Architecture Investigation Findings

Preliminary (2026-10-25, asked by the user before approval; the design spec follows approval). Authorities read: `architecture-design.md`, `design-principles.md` (whole), `design-examples.md` case studies (Case 7: one rule applied by several callers).

| Source | Finding | How |
| --- | --- | --- |
| `project-task-tool-manifest.ts`, `browser/browser-tool-manifest.ts`, `task-delegation/task-delegation-tool-manifest.ts`, `media/media-tool-manifest.ts` | Each family already has one shared manifest whose `execute` returns a plain object, used by both routes | Read |
| native tools (`project-task-native-tools.ts:16`, `browser/open-tab.ts:42` and 10 browser files, `task-delegation/delegate-task.ts:50`, `agent-management/*`, `agent-team-management/*`, `get-handoff-rules.ts:38`, `publish-artifacts-tool.ts:150`) | Each route adapter turns the object into text with its family's own call | Read |
| `media/media-autobyteus-tools.ts:54` | Native media tools return the object; the autobyteus-ts provider renderer stringifies it | Read |
| MCP providers (`project-task-tools-…:11`, `task-delegation-tools-…:57`, `browser-tools-…:45`, `media-tools-…:51`, `publish-artifacts-…:50`, `get-handoff-rules-…:31`, `agent-discovery-mcp-result.ts:11`, `send-message-to-…:46`) | Same per family on the MCP route; some return text + `structuredContent`, some text only | Read |
| `task-delegation-tool-serialization.ts` `toDelegateTaskResult`, `project-task-tool-manifest.ts` (`comments`, `closedParts` …), `autobyteus-ts/src/tools/terminal/types.ts` `TerminalResult.toJSON` | "Leave out when empty" is hand-written in at least three places; `send-message-to-tool-result-contract.ts:17,33,47` requires the opposite (`target_agent_run_id: null`) | Read |
| `agent-discovery-mcp-result.ts:9`, `agent-discovery-refusal.ts:36-39` | A discovery refusal is plain error text on both routes (MCP `isError` text; native throws `Error(message)`); only successes are JSON. Correction (2026-10-25): an earlier reading in this conversation said native sends JSON; it does not | Read |
| `grep` count | 53 lines in `src/agent-tools` and `src/agent-communication/services` call or define a result serializer | Measured |
| `autobyteus-server-ts/` | No ESLint/Biome config; a guard would be a test | Read |

Preliminary design-health reading: root cause `Duplicated Policy Or Coordination` (one serialization policy in ~10 owners with three different rules); refactor needed now: yes, bounded to the serialization step (manifests and routes keep their shape).
