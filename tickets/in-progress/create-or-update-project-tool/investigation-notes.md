# Investigation — create or update Project tool

## Bootstrap
- Package: create-or-update-project-tool
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool
- Repository: Git; isolated branch codex/create-or-update-project-tool.
- Refreshed via `git fetch origin personal`; base origin/personal @ 68261f8111e2f0eb119824c91a2650410c9aeffa.
- Finalization target: origin/personal; no release requested.
- Shared personal checkout has unrelated modifications; left untouched.
- Initial request: missing agent tool for creating/updating a Project.
- Screenshot: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e534fba4fd4c4cb9ae89925e454758d0/solution_designer_0c7ba6fd88d34653a1667f9c7967b6e7/context_files/ctx_f64c4459936b__image.png
- Screenshot shows list_projects, list_project_tasks, create_or_update_task and delegation tools, not create_or_update_project.
- Read solution-designer skill, requirements standard, root DESIGN.md/TESTING.md, server/web AGENTS.md. Testing requires test-owned data, never the installed user's app.
- Approval pending. No target design yet.

## Source Log And Findings (2026-10-06)
Paths below are relative to the isolated workspace unless absolute.
- `src/agent-tools/project-tasks/project-task-tool-contract.ts` (server): names are exactly list_projects, list_project_tasks, create_or_update_task. Strict field-presence parser and shared schema; no Project mutation.
- `src/agent-tools/project-tasks/project-task-native-tools.ts`: three native wrappers registered; native and MCP share execute/parse/error contracts.
- `src/agent-tools/project-tasks/project-task-tool-manifest.ts`: list_projects returns summaries; task mutation returns compact acknowledgement and treats non-domain post-write failures as unconfirmed rather than rollback.
- `src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts`: adapters derive from manifest, static collision protection, session selection remains authoritative; no collaboration membership prerequisite for node-local tools.
- `src/projects/services/project-service.ts:108–143`: existing create normalizes required name and optional description, initializes links []; duplicate normalized name validation occurs inside serialized store write. Existing update requires name and normalizes omitted description to blank: NOT an omission-preserving patch. Workspaces are preserved when omitted. Both return a view after the write; failure behavior needs architecture investigation.
- `src/built-in-agents/templates/project-task-manager/{agent.md,agent-config.json}`: shipped Manager selects three Project tools plus list_available_agents, delegate_task, send_message_to, read_file. Instruction step 1 only resolves Project; cannot create/update it.
- `src/built-in-agents/built-in-agent-bootstrapper.ts:104–120,153–155`: built-in agent.md/config synchronized from template, then cache refreshed. Existing bootstrap path can expose future template change without arbitrary custom-agent rewriting. No runtime/user data was modified.
- `autobyteus-server-ts/docs/modules/projects.md`: node-local Projects with name, optional description, workspace links and Tasks; backend operations not gated by default-off ENABLE_PROJECTS. “Exactly Three Agent Tools” documents omission; saved-ID delegation remains distinct.
- `autobyteus-web/docs/projects.md`: manual Project authoring, existing Tools detail, physical Refresh after external writes; no automatic synchronization guarantee.
- `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/{project-task-tools,project-task-business-results}.test.ts`, `tests/e2e/projects/project-task-boundaries.e2e.test.ts`, `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`: existing contract/parity/permission/bootstrap coverage to extend after design and implementation. Source inspection only; no tests run or pass claimed.
- Commands: `rg -n 'create_or_update_project|create_or_update_task|list_projects' autobyteus-server-ts/src`, service/manifest/template reads, documentation reads. No create_or_update_project source found.
- Existing completed tickets `tickets/done/project-tasks`, `tickets/done/project-task-manager-foundations`, `tickets/done/projects-concept-introduction` exist. New request extends shipped capability; no previous approval inferred.

## Supported Behavior And Scenario Basis
BEH-001: node-local Project discovery and UI creation supported; new agent creation requested, SCN-001 proposed.
BEH-002: UI metadata edit supported; new agent metadata patch proposed, SCN-002.
BEH-003: Manager planning/delegation supported via Chat/@; independent tool selection and malformed-input/authorization edges supported by documented contracts, SCN-003.
Evidence distinguishes current source behavior from proposed requirements. Screenshot corroborates configured tool omission, but no live installed/runtime reproduction was attempted.

## Surface Inventory / Data / Risks
Payloads: shared tool name/schema/description/manifest; built-in template config/prompt; native tool class; result summaries and MCP exposure; docs/tests. Structural surfaces: existing ProjectService/ProjectStore serialized mutations, native registry and session-owned MCP selection. Persistence: existing node-local projects/<projectId>/project.json; Tasks/context/agent_run_resources remain unchanged by proposed metadata edits. Schema migration not established or proposed. Source owners/call semantics still need architecture investigation after approval. No deployment, feature-default, UI shell or workspace filesystem change requested.
Risk U-001: user may intend workspace-link authoring too; proposed minimal scope excludes it and needs explicit approval.
Risk U-002: existing service update is replacement-style metadata, not partial patch; atomic preservation must be resolved in architecture.
Risk U-003: service view generation follows writes; error acknowledgements must remain truthful.
Volumes/performance: no capacity requirement; no benchmarking needed at intake.

## Supplements And Product
Screenshot absolute path above: user-owned evidence, not normative UI specification; related REQ-004/AC-004, no supplement approval needed. No Product request or externally owned design package. No scratch probe promoted.

## Current Outcome
SR-003 Architecture Design Complete. Requirements SR-002 Approved via AP-001; design Ready. task_size Medium, architectural_risk High. No implementation or validation pass claimed. Next action: configured independent review/handoff gate. Earlier pending states are historical.


## SR-002 — Optional Workspace Links Investigation
- User clarification: “I think it makes sense to also have workspaces as optional, right? Because a projector can have workspaces.” Interpreted as Project workspace links, not filesystem workspace creation.
- User changes scope to optional workspace links. This is not approval of the complete revised mutation semantics; approval still pending.
- Read `src/projects/domain/models.ts:57–68`: create and update already accept optional aggregate `workspaces` with workspaceId and optional description.
- Read `src/projects/services/project-service.ts:130–143,202–216`: omitted workspace list preserves links; explicit list replaces all links and [] clears. Duplicate IDs rejected. Newly linked IDs require workspace registration on current node; retained links reuse stored root snapshot and addedAt. Existing resolveFormLinks clears an omitted retained-link description; proposed new tool instead preserves omission consistently with partial patch. Architecture must account for this difference.
- Read `src/api/graphql/types/projects.ts:84–108`: existing aggregate workspace inputs are part of create/edit contracts.
- Read `autobyteus-web/components/projects/ProjectEditor.vue`: Workspaces marked optional; form can select existing registered workspace or separately register a new path, then passes complete list. This tool scope covers linking, not the separate registration step.
- `rg -n 'list_workspaces|workspace_id|listWorkspaces' autobyteus-server-ts/src/agent-tools` found no workspace-discovery tool. Callers need known registered workspace IDs; no implicit run-workspace binding or invented IDs is authorized. Creating discovery/registration tools requires separate approval.
- Requirements revision retains BEH/REQ/AC IDs; adds SCN-004/UC-004 and REQ-006/AC-006. Input proposal: `workspaces?: [{workspace_id, description?}]`; replacement semantics must be user-confirmed. Task/history data and physical workspace registrations/directories unchanged by link edits.
- Earlier U-001 metadata-only assumption is superseded. U-002 partial-update preservation and U-003 truthful post-write error concerns remain. No runtime tests performed; no new authoritative architecture persisted.

## AP-001 And Architecture Investigation (2026-10-06)
- Approval AP-001: latest user message, “Yes, that makes sense then. Just I think it makes sense. Currently it's so we need to support an optional like workspaces in the arguments as well.” This follows the expanded-scope approval question and clarification of persisted workspaces objects. SR-002 is approved; no new behavior was introduced by clarification. See requirements Approval Record for exact basis. Earlier pending states above are historical.
- Isolation reconfirmed: branch codex/create-or-update-project-tool, HEAD 68261f8111e2f0eb119824c91a2650410c9aeffa; only this task's documents untracked. No shared-checkout changes or workspace/user data writes.
- Read architecture-design standard, design-principles and mandatory design template at /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/. Revisited worktree DESIGN.md, TESTING.md and server/web AGENTS.md. No conflict found. Read canonical `autobyteus-server-ts/docs/design/data_migration_guideline.md` §§1–4: current schema directly usable; no transformation/startup gate necessary.
- `src/projects/stores/project-store.ts` readProjectFile/projectFileContent: version-agnostic tolerant current reader projects known fields, filters malformed links; exact writer includes the same seven Project attributes and link workspaceId/workspaceRootPath/description/addedAt. No shape change is needed. Representative current fixtures in `tests/unit/projects/project-service.test.ts` exercise stored links with registered-ID/root snapshots and string descriptions. No installed private data inspected; approximate real volume unknown and immaterial to schema compatibility.
- Same store createProject/updateProject: catalog lock spans list-current-projects, service validation callback, exact atomic JSON write. Update callback gets current record under lock, preserves projectId. Lock release after a completed operation is recognized and returns committed result. Schema/name uniqueness must stay here; adapter-level pre-read/merge/write would lose freshness.
- Store assertMigrated: existing projects.json existence causes capability-local PROJECTS_MIGRATION_PENDING; do not change that migration or its predecessor dispositions. No new migration trigger/source conversion proposed.
- `src/persistence/file/store-utils.ts`: process-local + cross-process locks, temp-write/rename atomic writer. Reuse; no new journal/CAS/caches.
- `src/projects/services/project-service.ts`: full-form create/update return ProjectView; toView scans Tasks to count them and resolves workspace availability after persistence. A compact command acknowledgement does not need these derived reads. Existing create body can be extracted within the same ProjectService into record-returning command method; form method can keep its normal view. New partial-patch method must operate inside updateProjectRecord callback and return committed record. This avoids toView post-write uncertainty and Task dependencies for tool writes.
- Existing resolveFormLinks preserves root snapshot/addedAt for retained links but normalizes omitted row descriptions to blank. One shared resolver with explicit clear-vs-preserve omission semantics can serve full forms and new partial patch without duplicated validation or silently changing existing GraphQL/UI forms.
- `autobyteus-ts/src/utils/parameter-schema.ts` supports ARRAY with nested ParameterSchema as arrayItemSchema. `autobyteus-ts/src/tools/base-tool.ts:87–132,300–325` preserves absent keys, recursively coerces present values (including empty array string), then validates. Existing ProjectTaskNativeTool.prepareExecution strict parse BEFORE BaseTool is essential; new parser branch must reject workspaces:""/null and invalid nested values before coercion.
- `src/agent-execution/shared/runtime-agent-tool-exposure.ts`: selects Project tool names through isProjectTaskToolName. `src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts`: explicitly allows recognized Project tools rather than all TASK_MANAGEMENT. Shared names-set extension is sufficient; no permissive runtime rewrite needed.
- `src/agent-tools/mcp/agent-tool-mcp-catalog.ts`: default providers produce protected static adapters and sessions resolve explicit names. Existing Project provider derives from shared manifest; adding manifest name reaches MCP without new transport policy. `agent-tools-mcp-structured-json-result.ts` provides JSON text+structuredContent parity.
- Built-in config currently has 7 tool names; new Project mutator gives 8. Bootstrap sync is existing lifecycle, so later fresh/current definition resolution receives it; do not rewrite custom agents or claim running sessions automatically gain it.
- Existing unit tools/service/bootstrap tests and real-HTTP E2E project-task-boundaries are suitable validation owners. E2E starts test-owned Studio server, session authority, real provider and native tool; no live model. It currently hardcodes three tool names; extend explicitly, retain single-name/read-only authorization rejection.
- Residual known constraint: no workspace-list/discovery tool in current agent surface; list_projects returns metadata summaries only. Users/callers must supply actual IDs and complete desired lists when changing workspaces. Manager must ask, not infer IDs or silently clear unknown links. Discovery/registration remains separate scope.
- No execution checks run at architecture phase; no implementation/test pass claimed. Canonical design is design-spec.md, current solution round SR-003. Screenshot remains only supplemental user evidence; Product and independent review artifacts currently N/A — not applicable yet.
