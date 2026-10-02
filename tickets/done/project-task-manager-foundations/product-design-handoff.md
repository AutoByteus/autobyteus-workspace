# Product Design Requested — Project Task Manager Foundations

## Result Identity And Authority
- Result: **Product Design Requested**; purpose: **New Request**.
- Package: `PROJ-TASK-MANAGER-20261002-001`; current solution revision `SR-001`.
- Requirements: **Draft, not approved**. No implementation-ready claim; no architecture design performed.
- Original request reference: user message dated 2026-10-02 in this conversation.
- Sender: Solution Designer. Product owns its modes, UI/UX artifacts, repository and ticket lifecycle.

## User's Requested Outcome
The user wants to continue experimental Projects/Tasks development while keeping the feature flag off. New foundations allow a Project Task Manager to discover available agents/teams, create and progress durable tasks, and delegate to e.g. Software Engineering Team. It should decompose work at useful granularity, understand dependencies and launch independent tasks in parallel. A reusable manager belongs in the public agents project; a project management Team is a possible later composition, not settled scope.

The user explicitly requests: “after you finish your analysis ... ask a product prototype to brainstorm on the UI. I will talk to the product prototype to brainstorm the UI itself.” Please **brainstorm the UI directly with the user**, based on the analysis below; do not interpret this handoff as confirmation of a particular layout or finalized behavior.

## Analysis Summary — What Exists
1. **Durable foundation:** node-scoped Projects, linked registered workspaces, description-only Project Tasks stored in projects.json. GraphQL supports list/create/edit-description/delete.
2. **Three business states already modeled:** TODO / IN_PROGRESS / DONE. New Tasks are TODO. There is deliberately **no status mutation** yet; no agent-facing Project Task tool family.
3. **Collaboration foundation exists:** opt-in `list_available_agents` discovers eligible installed shared Agents **and Teams**. `delegate_task` creates fresh child executions; multiple calls can start independent instances in parallel, including copies of the same Team. `send_message_to` is for ongoing-instance follow-up. A child AgentRun ID identifies execution, not a Project Task.
4. **MCP foundation exists:** selected first-party tools are exposed through session-scoped Agent Tools MCP, with native counterparts. This is distinct from connecting an external MCP server in settings. Current provider list includes discovery, publishing and delegation, but no Project Task tools.
5. **Existing UI:** Projects card grid → full-width Project page; Tasks/Workspaces tabs; 3-column To Do/In Progress/Done board; description-only card → Task dialog. Separate execution trees/conversations already show delegated work.
6. **Flag nuance:** ENABLE_PROJECTS initializes false and hides navigation/routes. It is currently a **UI visibility switch, not server CRUD disablement**. The user's installed setting was neither inspected nor changed. We must decide how new manager/tool operations behave while off.

## Gaps — Product Decisions Before Architecture
- No durable Task→assignee/execution-attempt/result link. Generic delegation returns an exact child ingress ID but records no Project assignment.
- No dependency representation or policy for ready/waiting tasks. More spawning is not automatically safe parallel work, especially in one repository.
- No agreed status owner/transition rules or definition of Done. Spawn success, runtime idle, child shutdown or preliminary response must not be mistaken for accepted work.
- No Project manager launch/context/workspace binding. Projects may link several workspaces; choosing a manager's working directory is not implicit.
- No board refresh for agent-side writes: current store refreshes on mount/project/node change and local UI mutations only.
- Project delete confirmation uses openTaskCount as if total; it will be inaccurate once Done is reachable. What deletion means while execution is active remains undecided.
- Retired task-plan names such as create_task/update_task_status and the generic TASK_MANAGEMENT category are stripped by native collaboration exposure. New Project tools need distinct identity/exposure decisions rather than resurrecting old plans.

## Proposed Capability Direction (Discussion Only)
A usable manager needs **reads as well as writes**:
- discover/list Projects and read selected Project/workspace context;
- list/read Project Tasks;
- create Project Task;
- progress a Task to In Progress / Done under the decided ownership policy;
- optionally edit descriptions/dependencies if the approved planning workflow needs it;
- discover collaborators via existing list_available_agents;
- delegate independent work via existing delegation foundation, with an explicit durable assignment/attempt association.

Illustrative, non-final tool names: `list_projects`, `get_project`, `list_project_tasks`, `get_project_task`, `create_project_task`, `update_project_task_status`. Separate start/done tools are an alternative. A Project-aware dispatch operation versus separate association around existing delegate_task is an open product lifecycle decision, then an architecture decision; **no contract or schema is approved here**.

Recommend beginning with **one reusable Project Task Manager** rather than inventing multiple project-management roles immediately. It coordinates at the project level; Software Engineering Team continues to own its own investigation, approval, review, validation and delivery. A later Team can compose the manager if real responsibilities justify it.

## Focused UI Brainstorm
Use the critical journey: user selects Project/context and gives goal → manager creates sensible Tasks → manager discovers capable Team → independent Tasks run in parallel → dependent Task visibly waits → user can inspect actual execution/results → manager accepts output and marks Done.

Questions to explore with the user (requirements DEC IDs give fuller options):
1. **Entry and conversation (DEC-007):** how does the user start/revisit the manager, and keep it clearly associated with a Project? Where does the manager conversation belong relative to the board/workspaces/current execution UI?
2. **Task to execution (DEC-004,006):** what does a Task show when assigned; how does the user reach the exact Agent/Team execution? Distinguish a reusable Team from this task's copy and a retry attempt.
3. **Dependencies/parallelism (DEC-003,008):** how does the user understand why work is waiting and which tasks can run together without needing a complicated scheduling dashboard?
4. **Progress/results (DEC-002,005,006):** preserve three board columns or extend them? How do waiting, failure, review and accepted Done differ? What returned result/artifact is useful in task detail?
5. **Updates/control (DEC-001,007,009):** agent changes should become understandable in the open Project; how should failed launch, resume/retry, stop, editing/deleting active work and experimental enablement be explained?
6. **Scope (DEC-010):** manager first or an actual multi-role project management Team? The user's “maybe” must not silently become a fixed Team topology.

Do not choose a squeezed new layout by default: previous user verification rejected a two-pane Projects layout, then approved a clean full-width Project page and board. That is valuable context, not a prohibition on alternatives the user explicitly approves now. No global shell redesign or new human drag-to-change-status control is requested.

## Requirements / Scenario Context
- REQ-001–010 and AC-001–012 are draft proposals with explicit versus recommended source categories.
- SCN-001: default-off experiment; SCN-002: manager plans/creates work; SCN-003: discovery/dispatch; SCN-004: independent A+B, dependent C; SCN-005: progress/result inspection; SCN-006: existing-data/CRUD continuity.
- SCN-007 active-work deletion/ambiguous retry: **Unclear**, not approved edge scope.
- Material open decisions DEC-001–010: flag/tool gating; status authority; dependencies; linkage/retry; Done evidence; board states; manager context/resume; safe parallelism; active deletion; public package/optional Team scope.
- User remains approval authority. A reviewed Product result is evidence for approval, not itself approved intended behavior unless explicit confirmation is attached.

## Constraints And Non-Goals
- Keep ENABLE_PROJECTS default-off; do not enable the user's installation or modify its data.
- Distinguish durable Project Tasks from delegated execution instances. Reuse existing collaboration semantics; do not replace them with retired task-plan/submission/review concepts.
- Preserve existing data, node scoping, workspace linking and unrelated run history. Experimental status is not authorization to reset data.
- No implementation/design yet; no optimization guarantee, unlimited safe concurrency, cross-node distribution or speculative management-team membership.
- Public agents repository is independent and has unrelated local edits; it was inspected read-only, not changed. Publication/import/runtime support must align later.

## Evidence And Source Context
Workspace source pin: `e04cfef23550c3b78286a53befc6bd5d71fb1061`. Detailed E-001–014 source log in investigation-notes.md.
Useful current-product sources (under workspace root):
- autobyteus-web/docs/projects.md; components/projects/{ProjectDetail,ProjectTaskBoard,ProjectTaskCard,ProjectTaskDialog}.vue; stores/projectTaskStore.ts.
- autobyteus-server-ts/docs/modules/{projects,agent_tools,agent_run_collaboration}.md.
- autobyteus-server-ts/src/projects/{domain/models.ts,services/project-task-service.ts}; src/agent-tools/agent-discovery; src/agent-tools/mcp/providers.
- Existing execution presentation: web stores/agentRunCollaborationStore.ts and services/agentCollaboration/agentRunCollaborationContext.ts; workspace/history components.
Historical intent: tickets/done/project-tasks/{requirements-doc.md,handoff-summary.md}; projects-concept-introduction/handoff-summary.md. Old approvals do not cover this extension; stale finalization wording is not a current code claim.
Public definitions: `/Users/normy/autobyteus_org/autobyteus-agents`, origin https://github.com/AutoByteus/autobyteus-agents.git; committed inventory pin `e08cacb4b54aa42d3fe72607a1b26f3b429e6104`; README.md, docs/agent-package-authoring.md, agent-teams/software-engineering-team/team-config.json. No committed manager package found. Installed catalog availability was not tested.
Investigation was source/test inspection only, not a live runtime test or UI screenshot claim.

## Canonical Artifact Paths
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/investigation-notes.md`
- Solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/solution-revision-record.md`
- Full handoff (this file): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/product-design-handoff.md`
- Design spec / independent architecture or code review: **N/A — not applicable at this pre-approval phase**.
- External Product artifacts / approval supplement: **N/A — not returned yet**.

## Workspace / Approval / Classification Context
- Isolated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`, branch `codex/project-task-manager-foundations`.
- Base refreshed origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061; finalization target origin/personal, no finalization now.
- Public repo separate/read-only, dirty unrelated work left untouched.
- Approval state Draft; no behavior-defining supplement approved. Design/task-size/architectural-risk classification N/A — only completed designs are classified for implementation routing.
- Risks/open questions: disabled-tool reachability, task/run identity and retries, dependencies and safe shared-file parallelism, result/completion ownership, freshness, active deletion/resume and scope.
- Blockers to forward implementation: Product/user decisions and explicit requirements approval; **not a blocker to requested Product discussion**.

## Expected Product Outcome / Next Action
Engage the user directly in the requested UI brainstorm and clarify the experience in Product's workflow. Return durable evidence/decisions and any remaining unknowns tied to this package/scenarios. If a final normative prototype/UI-UX package is produced, include its explicit user confirmation, accepted revision/source pin, runnable references and final visual baseline; if discussion remains exploratory, truthfully identify it as clarification rather than final approved UI.

Solution Designer will integrate returned decisions, refine the intended-behavior baseline and obtain explicit requirements approval, then do proportionate architecture investigation/design before any implementation route.

## Routing Record
get_handoff_rules returned the matching Product rule:
> When Solution Designer classifies the outcome as Product Design Requested because the user explicitly or after clarification asks Product Team to help understand or evolve an experience. Include the focused decision, relevant requirement and behavior IDs, established constraints, non-goals, canonical requirements paths, and supplied existing-product context when applicable.

Selected exact recipient: `/product_team/product_prototyper`. This is the sole applicable/most-specific rule: user explicitly requested Product UI brainstorming, and the persisted result is Product Design Requested. Marketing, completed architecture and delivery-receipt rules do not apply. Delivery mechanism: send_message_to with this absolute path mentioned and the same file attached in reference_files. Send status: **Confirmed accepted** by send_message_to; target AgentRun `product_prototyper_3395cb44d81e4df5a6460dec32215585`. Required Product handoff succeeded; Solution Designer stops pending returned Product/user input. No delegation used.
