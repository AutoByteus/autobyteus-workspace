# Investigation Notes — Project Task Manager Foundations

## Investigation Meta
- Package: `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`.
- Current solution revision: `SR-001`; requirements investigation complete enough for Product brainstorming, not for implementation.
- Repository mode: Git. Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`; branch `codex/project-task-manager-foundations`.
- Resolved base: refreshed `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`.
- Finalization target: `origin/personal`; no merge/release/finalization performed or authorized by this analysis.
- Bootstrap succeeded: new isolated worktree; shared checkout and its unrelated untracked files left unchanged.
- Instructions: solution-designer skill, requirements standards/templates, server/web `AGENTS.md`, workspace `TESTING.md`; public agents `AGENTS.md` for read-only context.
- No source changes, runtime settings changes, agent execution launches, or live installed-app data inspection.

## Initial Request And Clarifications
Original user request (2026-10-02, this conversation): continue developing experimental Projects and Tasks while keeping the feature flag off. Foundations now include discovering available collaborators. Create a public Project Task Manager agent, potentially a project management team containing it; give it discovery and task-management tools exposed similarly to MCP artifact/discovery tools. Requested operations include create task, move to In Progress, mark Done. It should discover e.g. Software Engineering Team, delegate work, analyze dependencies and task granularity, and delegate independent work in parallel. After analysis, ask Product Prototyper to brainstorm UI with the user, who is not yet sure what the experience should be.

Clarifications: none yet. User's wording “list available collaborator/agents” maps to the implemented `list_available_agents` tool (agents **and** teams). This is interpretation supported by code, not a new tool-name decision.

## Product And Domain Understanding
- Projects: durable, node-scoped work containers with registered filesystem workspace links.
- Project Tasks: durable work descriptions embedded in a Project; currently user-authored.
- Delegated executions: fresh agent/team instances spawned inside a collaboration root. They are not durable Project Task records and have no business-task completion status.
- A definition/catalog address is not the identity of a particular execution. `delegate_task` returns the child ingress AgentRun ID; follow-ups use exact run IDs.
- “Public” repository package and installed shared catalog entry are separate: discovery lists eligible definitions installed on that node, not arbitrary GitHub packages.

## Source Log
All workspace-relative sources below resolve under the isolated workspace root at the recorded base. Public-repository sources are separately pinned and read-only.

| Evidence ID | Exact source / command | Observation / relevance |
| --- | --- | --- |
| E-001 | `git status --short`; `git symbolic-ref refs/remotes/origin/HEAD`; branch.personal tracking config; `git fetch origin personal`; `git rev-parse origin/personal`; `git worktree add -b codex/project-task-manager-foundations /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations origin/personal` | Default/tracked integration target personal; clean isolated task authoring established at e04cfef23. |
| E-002 | `tickets/done/project-tasks/{requirements-doc.md,handoff-summary.md}`; `tickets/done/projects-concept-introduction/handoff-summary.md` | Prior released intent deliberately excludes assignment/admission/status writes; agent-owned status, no human status controls; full-width grid→Project board is preserved context. Old approvals do not approve this extension. Historical summaries have stale pending/finalization wording; current source governs present behavior. |
| E-003 | `autobyteus-server-ts/src/projects/domain/models.ts`; `src/projects/stores/project-store.ts` | Project/task record shapes; task statuses TODO/IN_PROGRESS/DONE; no dependencies, assignee, attempt/run linkage, completion evidence. Tasks embedded in one projects.json. Missing tasks means []; malformed tasks filtered. |
| E-004 | `autobyteus-server-ts/src/projects/services/project-task-service.ts`; `src/api/graphql/types/project-tasks.ts` | List/create/description edit/delete only; create→TODO; description trimmed/required; IDs/timestamps; Project+task scoping; no status mutation or launch hook. |
| E-005 | `autobyteus-server-ts/src/projects/services/projects-capability-service.ts`; `autobyteus-web/stores/projectsCapabilityStore.ts`; `middleware/feature-flags.global.ts`; `docs/projects.md` | ENABLE_PROJECTS initializes false when unset; UI navigation/routes gated; server CRUD not gated. Disabling preserves data. Actual installed user's setting not inspected or changed. |
| E-006 | `autobyteus-server-ts/src/agent-tools/agent-discovery/{list-available-agents-contract.ts,list-available-agents-tool.ts}`; `src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` | Opt-in zero-input discovery; returns name/kind/address/description. Eligible shared agents/teams only; excludes built-ins and root definition; does not list Agent Orgs. Read-only; definition selection does not start a run. |
| E-007 | `autobyteus-server-ts/src/agent-tools/mcp/providers/{list-available-agents-mcp-adapter-provider.ts,default-agent-tool-mcp-adapter-providers.ts,publish-artifacts-mcp-adapter-provider.ts}`; `src/agent-tools/mcp/{agent-tool-mcp-adapter.ts,agent-tool-mcp-catalog.ts,agent-tool-mcp-session.ts}` | Existing first-party native/tool-picker + session-scoped Agent Tools MCP extension path. Selected names intersect adapter/source availability. No Project Task adapter or Project context in current session execution context. Artifact publication bound to runs, not Project Tasks. |
| E-008 | `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts`; `src/startup/agent-tool-loader.ts` | Discovery opt-in; collaboration tools automatic with valid member context. Server helper/application-owned runs do not have general collaborator discovery. Startup registration explicitly inventories tool units. |
| E-009 | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-delegation-command.ts`; `src/agent-tools/task-delegation/task-delegation-tool-contract.ts`; `docs/modules/agent_tools.md` (Task Delegation); `docs/modules/agent_run_collaboration.md` | delegate_task takes address/description/reference_files, pure fresh spawn; returns run ID or null+reason; independent parallel copies supported. No Project ID/task ID input, business completion, or assignment record. send_message_to continues an existing instance; it is not interchangeable with fresh delegation. Quiet shutdown/restore is execution lifecycle, not Done. |
| E-010 | `autobyteus-web/{components/projects/ProjectTaskBoard.vue,components/projects/ProjectTaskCard.vue,components/projects/ProjectTaskDialog.vue,stores/projectTaskStore.ts,components/projects/ProjectDetail.vue}` | Three columns render all recognized statuses; card→description dialog. Task lists fetch on mount/project/node binding; successful local mutations update cache/count. No subscription/polling for agent writes, manager conversation, task-run navigation or dependency presentation. Project deletion count currently openTaskCount, inaccurate as total after Done becomes possible. |
| E-011 | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts` | Legacy create_task/create_tasks/assign_task_to/update_task_status names are stripped in collaboration runs. Non-delegation tools in TASK_MANAGEMENT category are also stripped. New tools cannot blindly reuse old names/category. |
| E-012 | `autobyteus-server-ts/src/persistence/file/store-utils.ts`; `tests/architecture/projects-boundaries.test.ts`; `tests/unit/projects/project-task-service.test.ts`; `tests/unit/api/graphql/project-tasks-schema.test.ts` | Locked atomic whole-file updates; 10s lock acquisition timeout. Existing boundary and no-status tests are deliberate previous-scope assertions, not proof that new integration must be forbidden. No tests run this turn. |
| E-013 | `autobyteus-web/stores/agentRunCollaborationStore.ts`; `services/agentCollaboration/agentRunCollaborationContext.ts`; `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`; server `src/run-history/domain/run-execution-tree-shared-records.ts` | Existing execution trees already present delegated children and selection; no Project Task link. Product can explore navigation into existing execution experiences, but this is not an approved layout. |
| E-014 | `/Users/normy/autobyteus_org/autobyteus-agents`: `git status --short`, `git remote -v`, `git rev-parse HEAD`, `git ls-tree -r --name-only HEAD`; `README.md`, `AGENTS.md`, `docs/agent-package-authoring.md`, `agent-teams/software-engineering-team/team-config.json`, `agents/research-engineer/agent-config.json` | Public repo https://github.com/AutoByteus/autobyteus-agents.git at e08cacb4b54aa42d3fe72607a1b26f3b429e6104; no committed Project Task Manager package found. Agent shells/config/bundled skills and team configs are independently owned artifacts. Repository has unrelated local changes incl. Product Prototyper; not modified or treated as an approved baseline. Shared Software Engineering Team exists in package catalog; this does not verify installation on any user's node. |

## Relevant Existing Behavior And Supported Product Paths
| Behavior | Current supported trigger/path | Outcome/invariant | Evidence |
| --- | --- | --- | --- |
| BEH-001 | Operator configures ENABLE_PROJECTS; user opens Projects when enabled | Default-off; disabled shell hides route/navigation, retains persisted data; backend API still callable | E-005 |
| BEH-002 | User creates/opens/edits/deletes a Task inside a Project | Description-only task; initial TODO; no user or agent-facing status operation | E-002–004, E-010 |
| BEH-003 | Configured agent calls list_available_agents in eligible run | Shared agent/team definitions listed with usable addresses; no execution started | E-006–008 |
| BEH-004 | Agent delegates a work packet to eligible Agent/Team | Fresh child; exact ingress run ID returned; additional calls can run independently in parallel | E-009 |
| BEH-005 | User inspects existing run workspace/history | Delegated child trees/conversations separate from Project board | E-010, E-013 |
| BEH-006 | Proposed manager operates durable tasks and connects them to child execution | No current supported Project-scoped management path; requested target journey, pending approval | User, E-003–004, E-009–010 |

Synthetic API calls while flag off establish technical reachability, not an approved new experimental tool policy. Manually writing mixed-status files can prove rendering, not that a supported status-change flow exists.

## Relevant Codebase And Technical Facts
1. Create/read/description-edit/delete task foundations are reusable; status writes and first-party tools are genuinely missing.
2. Discovery and fresh delegation exist across eligible collaboration roots. No need to invent a separate collaborator lister or a second general spawning system.
3. Delegation alone cannot assign a durable task, enforce prerequisites, prevent duplicate retries, or declare work complete. A tool success/run-id identifies started execution, not accepted deliverables.
4. A meaningful manager needs read access to project context and tasks, not just three write tools. Proposed tool identities should explicitly distinguish Project Tasks (e.g. create_project_task) from retired task plans; exact names/schemas remain design work after approval.
5. Persisted task identity and execution identity are different. Linking one durable task to one or more attempts, and deciding who updates business state, are product decisions before technical design.
6. Future frequent agent writes make shared projects.json contention relevant; current locking protects file writes, not coordination across task creation/delegation/status operations.
7. Description/workspace links alone do not select a manager run's working directory. Multiple linked workspaces require explicit user/manager context decisions.
8. Existing TASK_MANAGEMENT exposure filtering, API tests and boundary tests need a deliberate scope update if new behavior is approved; bypassing them is not a solution.

## Structural And Payload Surface Inventory
- Payloads: node-local projects.json, public agent.md/agent-config.json/bundled skill, optional team package; existing run-tree records, tool manifests and GraphQL task DTOs.
- Readers/writers: Project/Task services and GraphQL, web stores, collaboration roots/session MCP adapters, run-history projections, agent package importer (not investigated deeply yet).
- Potential impact: additive tool/API contracts; task data/link/dependency fields if chosen; task-to-run lifecycle coordination; UI freshness; definition-versus-run identity; task/run restoration; optional cross-repository public package.
- No target owner/module/schema/migration chosen. Architecture must investigate governing migration conventions before any persisted-data transition design.

## Runtime, Probe, Or Reproduction Findings
Source and test inspection only. No build, tests, live model call, UI probe, or installed-app feature-state verification performed. This is a requirements/Product handoff, not executable validation. Later implementation/API-E2E owners follow TESTING.md using isolated/test-owned state.

## Stakeholder And User Evidence
- Explicit: keep feature flagged/off; continue experimental foundation; task create/progress/done tools; manager discovers/delegates to teams; dependency-aware granularity/parallelism; UI brainstorm directly with Product after analysis.
- Tentative vision: a project management team “maybe”; not a settled member list or implementation scope.
- Prior approved context: simple full-width project board; no human status controls; durable tasks separate from delegated children. New approved requirements may deliberately revise the former strict no-integration boundary, not erase identity separation.

## External Contracts, Standards, And Dependencies
Existing delegate_task/send_message_to/catalog identities and session-scoped tool contracts remain evidence-backed compatibility constraints. Public package being published is insufficient: installed shared definitions must be available and runnable. Software Engineering Team owns requirements approval, review, validation and user verification; a manager must not treat “delegated successfully” as that team's completion receipt.

## Persisted Data And State Facts
- Current location: <node appDataDir>/projects/projects.json; array of Projects with taskId/description/status/createdAt/updatedAt Tasks embedded.
- Volume: unknown; no user data sampled. Existing UI testing targets 100+ tasks; not a concurrency capacity guarantee.
- Required preservation proposal: existing Projects, task identities/descriptions/status/timestamps, links and unrelated run history; no implicit destructive reset. Accepted loss only existing explicit user deletion; active-work deletion policy still open.
- Extra-field behavior: Project rows spread into normalization; valid Task rows retained via filter (not deep reconstructed). Future schema readers/writers must be investigated against approved continuity requirements.
- No migration or new startup gate inferred from potential new fields.

## Product Design Request Context
- Present, purpose New Request.
- User outcome: “after you finish your analysis ... ask a product prototype to brainstorm on the UI. I will talk to the product prototype to brainstorm the UI itself.”
- IDs: BEH-001–006, SCN-001–007, REQ-001–010, DEC-001–010 (requirements-doc.md).
- Journey to explore: select Project/context → instruct manager → inspect generated durable tasks → manager discovers capable team → launch independent work → understand waiting prerequisites/active execution/results → manager confirms Done.
- Questions: where manager conversation lives; entrypoint/run binding; task-to-execution navigation; visible assignee versus attempt; live updates; dependencies; dispatch failures; returned deliverables/completion; stop/retry and active deletion policy.
- Existing context: Projects grid and full-width three-column board; Tasks/Workspaces tabs; description dialog; existing separate run-tree/conversation surfaces. Preserve their simplicity and avoid squeezing the board; alternative UI requires explicit approval.
- Product owns mode/artifacts/repository/ticket lifecycle. No prototype bootstrap/mode prescribed.

## Product Design Findings
Not returned yet. External prototype repository/ticket/revision/UI-UX spec/user confirmation/final references: N/A — not yet available. No prior exploratory visual is promoted to normative UI for this package.

## Supplemental Artifact Inventory
Canonical directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations`.
| Artifact | Owner | Purpose/scope | Related IDs | Status / approval |
| --- | --- | --- | --- | --- |
| requirements-doc.md | Solution Designer | Draft intent, ACs, open Product decisions | All | SR-001 Draft; not approved |
| solution-revision-record.md | Solution Designer | Cumulative solution history | All | SR-001; evidence index |
| product-design-handoff.md | Solution Designer | Full analysis/request/constraints and expected Product outcome | All | Product Design Requested; no behavior approval |
| design-spec.md | Solution Designer | Technical design | All | N/A — requirements not approved; not created |
| External Product artifacts | Product Prototyper | Future reviewed UI/UX evidence | REQ-007 | N/A — not received |
| Independent architecture/code review | Independent specialists | Later applicable gates | All | N/A — not applicable at this phase |

## Assumptions, Unknowns, And Risks
| ID | Type | Issue | Resolution owner/status |
| --- | --- | --- | --- |
| R-001 | Risk | UI-only flag could let opted-in agents mutate hidden Projects; do not equate visibility with backend disablement | User/Product DEC-001 |
| R-002 | Risk | Pure spawn retry can duplicate work; file lock does not make dispatch/link atomic | User DEC-004; then architecture |
| R-003 | Unknown | Durable dependency fields/enforcement versus manager-owned plan; failure/reopen/block policies | User/Product DEC-003,005,006 |
| R-004 | Unknown | Who is allowed to update status, and what exact Done evidence is required | User DEC-002,005 |
| R-005 | Risk | Parallel agents can conflict on shared repository/files; independent business tasks may not be independent writes | User/architecture DEC-008; no unlimited “maximum” claim |
| R-006 | Unknown | Manager launch Project/run/workspace binding, restart/resume and active deletion | User/Product DEC-007,009 |
| R-007 | Risk | Board remains stale after external writes; completion breaks total-delete-count assumption | Product/architecture REQ-007,009 |
| R-008 | Unknown | Public-agent delivery scope versus tentative management team | User DEC-010 |

## Requirement Implications
Recommend experimenting with one Project Task Manager first; do not create speculative specialists solely to make a team. Give it explicit discovery plus project/task reads, create and state changes. Reuse existing fresh delegation, but explicitly decide durable linking, status ownership, Done evidence and dependency representation. Treat live board/execution visibility as part of the feature, not a cosmetic afterthought. No implementation or architecture design proceeds until Product/user decisions and requirements approval.

## Architecture Investigation Findings / Notes For Architecture Design
Not started. Feasibility facts above are not an authoritative target architecture. After approval, verify native/MCP parity, scoped project context and permission behavior, task/run linkage and dispatch failure recovery, continuity/migration conventions, store concurrency, live update/refresh paths, run-history restoration/navigation, linked-workspace selection/isolation, and public package import/tool availability. Completed-design task size/risk: N/A — not yet classifiable.
