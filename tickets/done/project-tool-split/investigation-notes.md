# Investigation Notes

## Investigation Meta

- Package identifier: `project-tool-split`
- Request / ticket: Project Task from `/project_task_manager` (2026-10-17): split `create_or_update_project` into `create_project` and `update_project`, same pattern as the Task tools split; no automatic exposure; existing configurations keep working in the old and new app; old tool removed later when the user decides.
- Workspace root / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split` / `codex/project-tool-split`
- Base: `origin/personal` at `8a970f214c` (fetched 2026-10-17; one docs commit after tag `v1.5.5-beta.2`). Finalization target: `origin/personal`.
- Bootstrap: succeeded (`git worktree add -b codex/project-tool-split … origin/personal`). Blocker: none.
- Current solution revision ID: `SR-002`
- Authorities read: `references/requirements-engineering.md` (2026-10-17, before investigation); `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (2026-10-17, before architecture investigation).
- Status: requirements and architecture investigation complete.

## Initial Request And Clarifications

- Original: the Project Task description (quoted in the handoff file).
- User decisions carried by the Task: two tools with one meaning; no automatic exposure; follow the task-tool-split precedent and record differences; existing configurations keep working in both versions; the user decides when the old tool is removed; the PTM package update is a separate Task after the release.

## Source Log

| ID | Date | Source | Exact Source | Finding | Implication |
| --- | --- | --- | --- | --- | --- |
| SRC-01 | 2026-10-17 | Code | `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` (`PROJECT_TASK_TOOL_NAMES`, `PROJECT_TASK_TOOL_DESCRIPTIONS.create_or_update_project`, `buildProjectTaskToolSchema`, `parseProjectMutation`) | One contract owns names, descriptions, schemas and parsing for all five project/task tools. `parseProjectMutation`: allowed keys `project_id, name, description, workspaces`; no `project_id` → create, `name` required (`PROJECT_NAME_REQUIRED`); with `project_id` → patch, at least one of name/description/workspaces (`PROJECT_PATCH_REQUIRED`); unknown key → `PROJECT_TOOL_ARGUMENT_INVALID`; blank name → `PROJECT_NAME_REQUIRED`; workspace rows `{workspace_path, description?}` | Split here, as `create_task`/`update_task` were |
| SRC-02 | 2026-10-17 | Code | `…/project-task-tool-manifest.ts#executeProjectTaskTool` | create → `ProjectService.createProjectRecord`, patch → `patchProjectRecord`; result `{project: {projectId, name, description, workspaces:[{workspaceRootPath, description}]}}`; non-`ProjectError` failures → `PROJECT_OPERATION_UNCONFIRMED` | Both new tools call the same service methods with the same result/error projection |
| SRC-03 | 2026-10-17 | Code | `src/agent-execution/shared/runtime-agent-tool-exposure.ts` | Automatic tools are only `send_message_to`, `delegate_task` (+ `get_handoff_rules` Team-scoped); `enabledProjectTaskToolNames` = configured names in `PROJECT_TASK_TOOL_NAMES` | New names need only to join the name set; nothing automatic |
| SRC-04 | 2026-10-17 | Code | `src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts:119-123` | Unknown names: `logger.warn("Tool '…' … not found in registry. Skipping.")`, continue | No error in either version on AutoByteus |
| SRC-05 | 2026-10-17 | Code | `runtime-agent-tool-exposure.ts` (`isProjectTaskToolName` filter), `src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts` (manifest, `protect_static_adapter`), `agent-tool-mcp-catalog.ts` | MCP exposes only manifest names that the agent lists; unknown names are not in the filter; first-party names block configured-MCP collisions | Same skip on Codex/Claude; new names protected automatically by joining the manifest |
| SRC-06 | 2026-10-17 | Git | `git diff --stat v1.5.5-beta.2 HEAD -- …/project-tasks …/runtime-agent-tool-exposure.ts …/autobyteus-agent-tool-resolver.ts …/agent-tools/mcp` → empty; `git log v1.5.5-beta.2..HEAD` = 1 commit (docs) | The current release resolves tool names exactly as the base | AC-005 "old app" = v1.5.5-beta.2 (installed app is 1.5.5-beta.1, same code path) |
| SRC-07 | 2026-10-17 | Data | `grep -rl create_or_update_project ~/.autobyteus/server-data/{agents,agent-teams,agent-packages,skills}` → none; `autobyteus-agents/agents/project-task-manager/{agent-config.json,skills/project-task-management/SKILL.md}`; `autobyteus-private-agents` → none | Only the PTM package names the tool | No data migration; PTM update is the follow-up Task |
| SRC-08 | 2026-10-17 | Git | `autobyteus-agents` commits `80825d4` (list old+new names, probes of v1.5.4 and new release), `df65728` (drop old name after release installed) | Precedent transition mechanism and evidence style | Reuse for AC-005 |
| SRC-09 | 2026-10-17 | Precedent | `tickets/done/task-tool-split/{requirements-doc,design-spec,release-notes,release-deployment-report,handoff-summary}.md` | Contract split into two parsers; native classes; manifest; first-party protection; release notes structure; old name removed at once (DEC-002 there) | Follow; record difference (old tool kept here, DEC-002) |
| SRC-10 | 2026-10-17 | Code | `src/api/graphql/types/agent-customization-options.ts#availableToolNames` (registry names); `autobyteus-web/components/agents/AgentDefinitionForm.vue` (tool picker by category) | Picker lists every registered tool; no tool-name validation at save or package import (`grep` in `src/agent-definition`) | Old tool stays visible in the picker during transition; no UI change |
| SRC-11 | 2026-10-17 | Docs | `autobyteus-server-ts/docs/modules/projects.md` §"Exactly Five Agent Tools" (+ line 42 "five Project/Task tools"), `agent_tools_mcp_server.md` (lines 201, 252, 317, anchors `#exactly-five-agent-tools`), `autobyteus-web/docs/projects.md` §"Agent Tools / Scope Exclusions" | Docs list five tools | Update to the new set and anchors |
| SRC-12 | 2026-10-17 | Tests | `rg -c create_or_update_project` (excl. tickets): unit `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` (17); e2e `tests/e2e/projects/{project-task-boundaries(6), project-mutation-node-locality(5), project-change-feed(2), task-closure-root-visibility, task-reactivation-root-visibility, project-task-context-files-delegation, task-existing-copy-assignment}.e2e.test.ts`; fixtures `tests/fixtures/{codex-native-multi-agent-system.mjs, project-mutation-http-node.mjs}`; web probes `autobyteus-web/tests/e2e/{project-manager-ux-probe,task-closure-tree-probe}.mjs`; released-data fixtures `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/*` | Most switch to new names; some keep the old name to prove REQ-004; released-data fixtures stay | Design file mapping |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current | Evidence |
| --- | --- | --- | --- | --- |
| BEH-001 | System | `create_or_update_project` without `project_id` | creates Project | SRC-01, SRC-02 |
| BEH-002 | System | with `project_id` | patches Project | SRC-01, SRC-02 |
| BEH-003 | System | run launch | project tools only when configured | SRC-03 |
| BEH-004 | Contract | configured unknown tool name | skipped, warning on AutoByteus, silent on MCP | SRC-04..SRC-06 |

## Technical Feasibility

- The split needs no service, persistence or exposure change: new names join `PROJECT_TASK_TOOL_NAMES`, the manifest and native registration follow; two parser entry points share today's validation.

## Architecture Investigation

| Path | Observation |
| --- | --- |
| DS-001 tool call | native `ProjectTaskNativeTool.prepareExecution` → `parseProjectTaskToolInput(name)`; `_execute` → `executeProjectTaskTool(name)`; MCP manifest → `executeProjectTaskTool(name)`; both projections `projectTaskToolError` |
| DS-002 exposure | `buildRuntimeAgentToolExposure` → AutoByteus resolver (registry lookup, skip unknown) / MCP session (`enabledProjectTaskToolNames`, catalog collision policy) |
| Migration conventions | Not applicable: no persisted data is read or written differently (requirements Data Continuity) |

## Supplement Inventory

| Artifact | Purpose | Owner | Scope / IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `tickets/done/task-tool-split/` | precedent | delivered ticket | all | archived, read-only | N/A |

## Unknowns

- None blocking. ASM-001 (release skips unknown names) is source-backed and proven by AC-005's probe.
