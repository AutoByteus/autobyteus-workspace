# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved for architecture review; design spec produced for delegation model
- Investigation Goal: Analyze and design the first ticket for simplifying task-management into server-owned task delegation tools before any general MCP exposure.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Cross-cuts runtime tool registration, backend application services, UI/browser-control gateways, authorization, session identity, and possible MCP transport hosting.
- Scope Summary: Feasibility/design analysis only unless the user later requests implementation.
- Primary Questions To Resolve:
  - Where are current runtime tools defined and registered?
  - Are tool semantics already owned by reusable application services, or embedded in runtime adapter code?
  - What MCP server shape would safely expose these tools to multiple runtime clients?
  - Which transport, stdio or streamable HTTP MCP, fits this project best?

## Request Context

User observed that project tools such as `send_message_to`, `open_tab`, and `create_tasks` feel limited because they are created for different runtimes. User asks to analyze whether these tools can instead be provided as MCP tools, either stdio or streamable MCP, so multiple runtimes such as Codex and possible future runtimes can use one set of code and one MCP config/address.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis`
- Current Branch: `codex/runtime-tool-mcp-unification-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis`
- Bootstrap Base Branch: `origin/personal` (`56c6d4bfa27ced68678e4d21dccd4acbcb31aa76`, 2026-05-28 14:46:17 +0200, `docs(delivery): record mobile artifacts finalization`)
- Remote Refresh Result: `git fetch --all --prune` completed successfully on 2026-05-28.
- Task Branch: `codex/runtime-tool-mcp-unification-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Analysis artifacts are in the dedicated ticket worktree/branch; no implementation has been requested yet.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-28 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover initial workspace and branch | Initial shared checkout is git repo on `personal...origin/personal`; dedicated task worktree required. | No |
| 2026-05-28 | Command | `git remote show origin`; `git worktree list --porcelain` | Determine remote default and existing worktrees | Remote HEAD branch is `personal`; no existing exact task worktree found. | No |
| 2026-05-28 | Command | `git fetch --all --prune`; `git rev-parse origin/personal`; `git show -s --format='%H %ci %s' origin/personal` | Refresh base and record base commit | `origin/personal` refreshed to `56c6d4bfa27ced68678e4d21dccd4acbcb31aa76`. | No |
| 2026-05-28 | Command | `git worktree add -b codex/runtime-tool-mcp-unification-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis origin/personal` | Create dedicated ticket worktree/branch | Worktree created and branch tracks `origin/personal`. | No |
| 2026-05-28 | Command | `mkdir -p tickets/in-progress/runtime-tool-mcp-unification-analysis` and artifact creation commands | Create required draft artifacts before deep investigation | Draft requirements and investigation notes created in task worktree. | No |
| 2026-05-28 | Command | `rg -n "send[_-]?message|open[_-]?tab|create[_-]?tasks?|MCP|mcp" ...` | Locate relevant tool surfaces | Found browser server-owned tools, Codex/Claude projections, local send-message/task tools, MCP client management, and docs. | No |
| 2026-05-28 | Code | `autobyteus-server-ts/src/agent-tools/browser/browser-tool-contract.ts`, `browser-tool-manifest.ts`, `browser-tool-service.ts` | Inspect `open_tab` ownership | Browser tools have canonical names, manifest schemas/parsers/executors, semantic validators, and a shared service delegating to the browser bridge. | No |
| 2026-05-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts` | Inspect Codex exposure | Browser manifest is converted to Codex dynamic tool specs/handlers. | No |
| 2026-05-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/browser/*`, `build-claude-session-mcp-servers.ts`, `claude-session-tooling-options.ts` | Inspect Claude exposure | Browser/team/media/publish tools are projected to Claude SDK in-process MCP servers with allowlisted MCP-prefixed tool names. | No |
| 2026-05-28 | Code | `autobyteus-ts/src/tools/mcp/*`, `autobyteus-server-ts/src/mcp-server-management/*` | Inspect existing MCP support | Repo consumes external MCP servers through managed clients/configs; no general first-party MCP host was found. | No |
| 2026-05-28 | Code | `autobyteus-ts/src/agent/message/send-message-to.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/*`, `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/*` | Inspect send-message tool | Local BaseTool exists and server runtime-specific projections exist; external MCP would need scoped team/member context and canonical service ownership. | Yes if implementing |
| 2026-05-28 | Code | `autobyteus-ts/src/task-management/tools/task-tools/*` | Inspect task-plan tools | Task tools are local `BaseTool`s bound to `context.customData.teamContext.state.taskPlan`. | Yes if implementing |
| 2026-05-28 | Code | `autobyteus-web/electron/browser/browser-bridge-server.ts`, `browser-runtime.ts`, `autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts` | Inspect browser bridge/session binding | Browser commands require Electron/remote bridge base URL and auth token; remote nodes register expiring bindings. | No |
| 2026-05-28 | Doc | `autobyteus-web/docs/browser_sessions.md`, `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` | Verify documented runtime tool behavior | Docs confirm Codex browser tools are dynamic tools, Claude browser/team tools are MCP projections, and bridge pairing controls remote browser access. | No |
| 2026-05-28 | Artifact | `tickets/in-progress/runtime-tool-mcp-unification-analysis/analysis.md` | Record itemized analysis | Captures feasibility, transport recommendation, target shape, migration phases, and risks. | No |
| 2026-05-29 | Code | `autobyteus-ts/src/agent-team/task-notification/system-event-driven-agent-task-notifier.ts`, `task-activator.ts`, `activation-policy.ts` | Inspect current task activation/orchestration loop after user narrowed scope to server-owned task tools and auto-exit | Existing native AutoByteus loop already reacts to task creation/status events, finds runnable tasks, marks them `QUEUED`, and activates assignees with a system message. Activation policy remembers activated agents and resets on new tasks. | Yes if designing cross-runtime task orchestration |
| 2026-05-29 | Code | `autobyteus-ts/src/agent-team/context/team-manager.ts`, `autobyteus-ts/src/agent/runtime/agent-worker.ts`, `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | Inspect whether members can be safely stopped/exited | Native agent runtime can stop and emits stopped/offline-like status, but immediate stop during a tool call interrupts active turn. Auto-exit must be delayed until current turn/tool result is safe. | Yes |
| 2026-05-29 | Code | `autobyteus-ts/src/task-management/base-task-plan.ts`, `in-memory-task-plan.ts`, `tools/task-tools/*` | Inspect task semantics and local tool behavior | Tasks have statuses `not_started`, `queued`, `in_progress`, `completed`, `blocked`, `failed`; runnable tasks are `not_started` with completed dependencies. Tools are local `BaseTool`s bound to `context.customData.teamContext.state.taskPlan`. | Yes |
| 2026-05-29 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts`, related unit tests | Verify current server-managed mixed-team task-tool exposure | Mixed AutoByteus standalone members filter out `ToolCategory.TASK_MANAGEMENT`, confirming current task tools are not cross-runtime-safe. | Yes |
| 2026-05-29 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts`, `codex-team-manager.ts`, `claude-team-manager.ts`, `mixed-team-manager.ts`, mixed member handles | Inspect server-managed team lifecycle APIs | Team managers support post message, inter-agent delivery, approvals, member interrupt, and whole-team terminate. There is no explicit cross-runtime `terminateMember`/`settleMemberWhenIdle` API, although backend internals have member run termination handles. | Yes |
| 2026-05-29 | Code | `autobyteus-server-ts/src/agent-tools/browser/*`, Codex/Claude browser projection files | Re-check canonical server-owned tool pattern to reuse | Browser tool manifest/service/projection pattern is the closest target shape for server-owned task tools. | No |
| 2026-05-29 | Artifact | `tickets/in-progress/runtime-tool-mcp-unification-analysis/task-management-server-migration-analysis.md` | Record narrowed analysis | Companion analysis recommends first building server-owned task tools and member auto-settlement; general MCP is deferred. | User review |

| 2026-05-29 | User Requirement Refinement | User clarified that activated members should receive task details directly in the activation message and should not need to call `get_my_tasks` first. | Refine happy-path task orchestration semantics | Updated requirement: activation message is a task work packet; `get_my_tasks` remains optional recovery/read tool. | User review |
| 2026-05-29 | User Requirement Refinement | User proposed removing `get_my_tasks` entirely from the simplified framework and removing duplicate `create_task` because `create_tasks` handles a one-item list. | Refine tool-surface simplification | Updated recommendation: no worker-visible `get_my_tasks`; no `create_task`; core model-facing task tools are `create_tasks`, `update_task_status`, and optional coordinator/debug `get_task_plan_status`. | User review |
| 2026-05-29 | User Requirement Refinement | User clarified coordinator should be notified by the framework when a task completes/fails with deliverables, rather than polling task-plan status. | Refine simplified delegation loop | Updated recommendation: core model tools are `create_tasks` and `update_task_status`; terminal status updates emit coordinator notification plus team event, then member auto-settles when safe. | User review |
| 2026-05-29 | User Requirement Refinement | User asked whether a more delegation-oriented task tool may be better than `create_tasks`. | Refine model-facing API naming | Added open naming decision: `delegate_tasks`/`assign_tasks` may better express coordinator intent than `create_tasks` in push-based orchestration. | User review |
| 2026-05-29 | User Requirement Refinement | User emphasized `create_tasks` is not explicit enough because the coordinator is delegating work to team members, and asked whether an internal task plan is needed. | Refine architecture semantics | Updated recommendation: model-facing tool should be `delegate_tasks`; keep internal delegation ledger/task-state store for correlation, dependencies, notifications, audit, and auto-settlement, hidden behind `TaskDelegationService`. | User review |
| 2026-05-29 | Artifact | `tickets/in-progress/runtime-tool-mcp-unification-analysis/design-spec.md` | Produce draft design spec after refined delegation requirements | Design spec defines `delegate_tasks`/`update_task_status`, internal delegation ledger, work-packet activation, coordinator completion notification, and safe member settlement. | User review / possible architecture review after approval |
| 2026-05-29 | User Approval | User confirmed simplified task-delegation model and requested downstream architecture review. | Mark requirements ready for architecture review | Requirements status updated to Design-ready; design package ready for architecture_reviewer handoff. | Architecture review |
## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Agent definition tool names and runtime bootstrap expose tools differently per runtime. AutoByteus local tools come from `defaultToolRegistry`; Codex receives explicit dynamic tool registrations; Claude receives SDK-created in-process MCP server configs.
- Current execution flow:
  - AutoByteus/native local tools: `registerTools()` -> `defaultToolRegistry` -> `BaseTool.execute(...)` -> tool `_execute(...)` with `AgentContext` / team context.
  - Browser tools: `agent-tools/browser` manifest/service -> AutoByteus wrappers, Codex dynamic tools, Claude SDK in-process MCP tools.
  - External MCP consumption: persisted MCP config -> `McpToolRegistrar` discovers remote tools -> `GenericMcpTool` calls via `McpServerProxy` and managed MCP client instances.
- Ownership or boundary observations: The repo owns MCP client management and first-party runtime projections, but it does not currently host one general first-party MCP endpoint for arbitrary external runtimes. `open_tab` already has canonical server ownership; `send_message_to` and task-plan tools still require more consolidation before safe external MCP exposure.
- Current behavior summary: Multi-runtime tool reuse is already solved for selected tool families by a canonical service plus per-runtime projection pattern. The proposed MCP unification should extend that pattern by adding a first-party MCP exposure adapter, not by moving tool semantics into transport code.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Refactor Analysis
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Duplicated Policy Or Coordination risk
- Refactor posture evidence summary: Likely needed if implementation proceeds. Existing browser/media/publish patterns are healthy and reusable; send-message/task-plan tools need a server-owned command boundary before external MCP exposure.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Current runtime-specific tools feel limited and repeated across runtimes. | Likely boundary/adapter concern if tool semantics are coupled to runtime-specific surfaces. | Done |
| `autobyteus-server-ts/src/agent-tools/browser/*` | Browser tools already use canonical contracts/manifests/services and runtime projections. | Strong precedent for first-party MCP exposure adapter. | No |
| `autobyteus-ts/src/agent/message/send-message-to.ts` and server Codex/Claude send-message projection files | `send_message_to` has local and runtime-specific implementations/projections. | Needs canonical server-owned send-message command service before one external MCP surface. | Yes if implementing |
| `autobyteus-ts/src/task-management/tools/task-tools/*` | Task tools depend on `context.customData.teamContext.state.taskPlan`. | External MCP needs scoped team-run/member context and task-plan command boundary. | Yes if implementing |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-contract.ts` | Browser tool names/types/errors | Defines canonical browser tool names including `open_tab`. | Good candidate source for MCP catalog entries. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-manifest.ts` | Browser manifest | Maps schemas/parsers/executors to `BrowserToolService`. | Reusable for external MCP list/call handlers. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts` | Browser command service | Validates semantics and delegates to Electron/remote browser bridge. | MCP server should delegate here, not duplicate browser logic. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts` | Codex browser projection | Converts browser manifest to Codex dynamic tools. | Current projection pattern. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/browser/*` | Claude browser projection | Converts browser manifest to Claude SDK in-process MCP tools. | Not a reusable external address. |
| `autobyteus-ts/src/tools/mcp/*` | MCP client management | Consumes external MCP servers via stdio/streamable HTTP/websocket and registers remote tools. | Existing MCP support is client-side; server-hosting is new work. |
| `autobyteus-server-ts/src/mcp-server-management/*` | MCP config persistence/API | Saves/imports/discovers external MCP server configs. | Could inform config UX but does not host first-party MCP. |
| `autobyteus-web/electron/browser/browser-bridge-server.ts` | Electron browser bridge | HTTP endpoints `/browser/open`, `/browser/navigate`, etc. with token auth. | External MCP browser calls must still require bridge binding/auth. |
| `autobyteus-ts/src/task-management/tools/task-tools/create-tasks.ts` | Task-plan local tool | Adds tasks through in-memory `teamContext.state.taskPlan`. | Needs server-owned task-plan command boundary for external MCP. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Not used yet.
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: N/A
- Why it matters: Current task can be answered from local project architecture unless exact external runtime MCP support is required later.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for analysis so far.
- Required config, feature flags, env vars, or accounts: None for analysis so far.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation commands above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- A general external first-party MCP server does not currently exist in the repo.
- Streamable HTTP is already supported as a consumed MCP transport, and the repo has dependencies on `@modelcontextprotocol/sdk`.
- Browser tools are the strongest candidate for first MCP hosting because canonical contracts/services already exist.
- `send_message_to` requires member/team identity, allowed recipients, approval/lifecycle handling, and Team Communication projection.
- Task-plan tools require authoritative team-run/member routing because their current state is not globally addressable.
- Claude SDK in-process MCP tooling proves the tool definitions can be expressed as MCP-like tools, but it does not solve sharing one address with other runtimes.

## Constraints / Dependencies / Compatibility Facts

- Existing external MCP config/management is client-side; hosting first-party tools needs new server-side MCP transport code.
- Streamable HTTP should use scoped auth headers or run-scoped URLs; a single global token would be unsafe for team/browser/task tools.
- Browser tools require an active Electron/remote browser bridge binding and must keep honoring remote-browser-sharing pairing controls.
- `send_message_to` must enforce allowed recipients and sender/member identity before delivery.
- Task-plan tools need a stable team-run/member task-plan command/query owner before external MCP calls can mutate state.
- Runtime event normalization must preserve canonical tool lifecycle events for Activity/history/artifacts; external MCP names may need allowlisted normalization similar to the current Claude browser/media handling.
- Exact support for any future runtime such as Antigravity must be verified before implementation, especially transport, auth header support, approval/elicitation, cancellation, and result rendering.

## Open Unknowns / Risks

- Whether a target external runtime can accept per-run dynamic headers/tokens in its MCP configuration, or only static user-level config.
- Whether the first implementation should expose only tool calls or also MCP resources/prompts for run metadata and team manifest discovery.
- How long-lived MCP sessions should be cleaned up when an AutoByteus run/team/member terminates.
- Whether approval UI should be mediated entirely by AutoByteus or delegated to external MCP client elicitation when available.
- Whether task-plan state should remain in live runtime memory or be promoted to a server-persisted command model before MCP exposure.

## Notes For Architect Reviewer

Analysis-only at this stage; do not treat as implementation-ready until the user approves a concrete scope.
