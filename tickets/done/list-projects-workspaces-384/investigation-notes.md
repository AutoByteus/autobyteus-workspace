# Investigation Notes — autobyteus-384 (list_projects returns each Project's linked folders)

## Investigation Meta

- Package identifier: `list-projects-workspaces-384`
- Request / ticket: Project Task `autobyteus-384` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), plus the PM's message of 2026-11-05.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-projects-workspaces-384`
- Repository mode: `Git`; branch `codex/list-projects-workspaces-384`
- Resolved base: `origin/personal` `1964ce9874` (fetched 2026-11-05); finalization target `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile` OK; blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-05): the updated solution-designer skill (SKILL.md and the changed references and templates, including the new `references/project-documents.md`); `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `DESIGN.md` (read in this conversation).
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: `list_projects` (and its tool description) returns each Project's linked workspace folders (the path, and the link's description when it has one), compactly (autobyteus-260: no empty fields). The tool description says what the field is for. Check the other places a Project is shown to an agent for consistency.
- Why: the Project Task Manager must check whether a folder the user gives already belongs to a Project before creating one (skill change autobyteus-agents-84 waits for this Task). On the user's desktop all 12 Projects have workspaces, but only 6 descriptions name their folder.

## Current Behavior (Read, `1964ce9874`)

| Place | Fact |
| --- | --- |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts` L120 | `list_projects` returns `{ projects: await getProjectService().listProjectSummaries() }` |
| `src/projects/services/project-service.ts` L123-125 | `listProjectSummaries()` maps the stored records to `{projectId, name, description}`, sorted by name |
| `project-task-tool-manifest.ts` L16-19 | `projectAcknowledgement(project)` = `{projectId, name, description, workspaces: [{workspaceRootPath, description}]}`, used by `create_project` and `update_project` (L121-137) |
| `src/projects/domain/models.ts` L6-10 | `ProjectWorkspaceLink {workspaceRootPath, description}` is stored on each Project record |
| `src/agent-tools/project-tasks/project-task-tool-contract.ts` L16 | `list_projects` description: "List every Project on the current node with its stable projectId, name and description. Does not select or change a Project." |
| `autobyteus-ts/src/tools/tool-result-json.ts` | The tool result rule drops `null`, `""`, `[]` and `{}` at any depth |
| `project-task-native-tools.ts` L26 (native) and `project-task-tool-manifest.ts` L195 (the manifest used for the other runtimes' MCP tools) | Both call `executeProjectTaskTool`: one change covers every runtime |
| `src/compositions/project-task-execution-resource-composition.ts` L72 | Task search also calls `listProjectSummaries` (it reads projectId and name; `project-task-search-service.ts` L102) |
| `src/agent-execution/prompt/carpenter-prompt-sections.ts` L41-44 | The run-start Project section names the Project and its ID only, so the run uses that ID with the Project tools; the run's own folder is in its Working Environment section |
| `src/agent-work-journal/rendering/platform/project-task-tool-converters.ts` L65 | The journal shows `List projects` with a read outcome; it does not render the result fields |

## Consistency Check (Places A Project Is Shown To An Agent)

- `create_project` / `update_project`: already show workspaces, in the projection `list_projects` will share.
- `get_project_task`, `list_project_tasks`, `search_project_tasks`: they show Tasks; a Task's Project is known by the `project_id` the caller supplied. No change.
- Run-start Project section (autobyteus-347): left as is. Adding the folders would change the prompt of every run under a Project for a need `list_projects` meets.
- Work Journal `List projects` line: unchanged (it does not render fields).

## Runtime Findings

- None run. Every fact above was established by reading. The change is additive to one tool result.

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-01 | Risk | Result size grows with many folders | Typical node: 12 Projects, one or two folders each; paths only, descriptions only when set | Accepted |
