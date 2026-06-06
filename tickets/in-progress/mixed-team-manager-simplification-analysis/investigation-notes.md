# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; user approved moving into design on 2026-06-06. Design is being drafted for user review before any architecture-reviewer handoff.
- Investigation Goal: Determine whether the team manager framework can be simplified by retaining only the mixed team manager and removing/folding specialized team managers.
- Scope Classification (`Small`/`Medium`/`Large`): Large for mixed-only server team manager cutover plus AutoByteus prompt parity refactor and specialized server backend removal.
- Scope Classification Rationale: Latest investigation shows native task-plan preservation no longer justifies specialized AutoByteus team execution, but cutover spans team backend selection, restore, active run dispatch, member prompt parity, tests, and documentation.
- Scope Summary: Design a clean-cut active server architecture where all team runs use `TeamRun -> MixedTeamManager -> AgentRun(runtimeKind per member)`, with AutoByteus prompt/context parity and specialized server backend removal.
- Primary Questions To Resolve:
  - Which team manager variants exist and where are they defined/exported? Resolved.
  - What runtime-selection capabilities and constraints does each manager enforce? Resolved at architecture level.
  - Is mixed team manager truly a behavioral superset of specialized team managers? Resolved: yes for active server execution after task-plan removal, provided AutoByteus prompt/context parity is refactored into the AgentRun path.
  - What would break if specialized managers were removed? Tests/docs/restore selection must change; AutoByteus requires prompt/context parity refactor and file-change projection retargeting before deleting the specialized native server backend.
  - What is the safest clean-cut target design and validation plan? Resolved: use mixed/member-run manager for all server team runs, refactor AutoByteus prompt construction, and remove specialized server team backends after parity tests.

## Request Context

User proposes simplification: the mixed team manager may be inclusive of all other team managers. A mixed manager can model a team where every member uses the same runtime, while specialized managers cannot model mixed-runtime teams. The user asks to analyze whether the framework should start simplifying by keeping only the mixed team manager.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git superrepo/workspace
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis`
- Current Branch: `codex/mixed-team-manager-simplification-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-30. `origin/personal` resolved to `21d05cf9e685b99f08de2b2e02a0b15a9e76a3b7`.
- Task Branch: `codex/mixed-team-manager-simplification-analysis` created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not use the original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` for authoritative artifacts or changes; it was on `personal`, behind `origin/personal`, with an untracked `blingda.txt`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-30 | Command | `pwd`; `ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Resolve initial workspace and repo shape | Workspace is a Git superrepo with multiple package directories. | No |
| 2026-05-30 | Command | `git status --short --branch`; `git remote -v`; `git branch --show-current`; `git symbolic-ref refs/remotes/origin/HEAD`; `git worktree list --porcelain` | Bootstrap branch/worktree/base discovery | Initial checkout was `personal...origin/personal [behind 1]`, remote default points to `origin/personal`, and many task worktrees exist. | No |
| 2026-05-30 | Command | `git fetch origin --prune`; `git rev-parse --verify origin/personal`; `git rev-list --left-right --count personal...origin/personal` | Refresh tracked remote refs before task branch/worktree creation | Fetch succeeded; `origin/personal` is `21d05cf9e685b99f08de2b2e02a0b15a9e76a3b7`; local `personal` was behind by 1. | No |
| 2026-05-30 | Command | `git worktree add -b codex/mixed-team-manager-simplification-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis origin/personal` | Create mandatory dedicated task worktree/branch | Dedicated worktree/branch created successfully. | No |
| 2026-05-30 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design guidance | Design must be spine-led, ownership-led, avoid compatibility wrappers, and make removal first-class. | Continue applying during design. |
| 2026-05-30 | Doc | Solution designer templates under `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/templates/` | Required artifact structure | Requirements, investigation notes, and design spec templates define mandatory sections. | Continue using. |
| 2026-05-30 | Command | `find autobyteus-ts autobyteus-server-ts autobyteus-web autobyteus-application-* -path '*/node_modules' -prune -o -path '*/dist' -prune -o -type f \( -iname '*team*manager*' -o -iname '*manager*team*' -o -iname '*mixed*' \) -print`; `rg -n "(MixedTeam|mixed team|TeamManager|team manager|AgentTeamRunManager|Team.*Manager|Manager.*Team|mixed.*manager|manager.*mixed)" ...` | Discover team manager variants and docs/tests references | Key server files are under `autobyteus-server-ts/src/agent-team-execution/backends/{mixed,codex,claude,autobyteus}`; native `autobyteus-ts/src/agent-team/context/team-manager.ts` is separate runtime code. | No |
| 2026-05-30 | Doc | `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Understand documented backend selection and behavior contracts | Docs state non-nested single-runtime teams use native/Codex/Claude paths; mixed/nested teams use `MixedTeamManager`; native AutoByteus preserves task-plan-aware behavior; mixed AutoByteus standalone members are communication-only. | Update if simplification proceeds. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Verify backend selection owner | Nested topology selects `MIXED`; non-nested single-runtime uses `resolveSingleRuntimeTeamBackendKind`; non-nested multi-runtime selects `MIXED`. | Change needed if approved. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts` | Verify backend kind model | `TeamBackendKind` contains `AUTOBYTEUS`, `CODEX_APP_SERVER`, `CLAUDE_AGENT_SDK`, and `MIXED`; single runtime maps runtime kind to team backend kind. | Change needed if removing specialized kinds. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Inspect authoritative create/restore dispatcher | Manager owns four backend factories and resolves by `TeamBackendKind`; file-change service attaches only for `AUTOBYTEUS` team runs. | Change needed if approved. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/*`, `.../claude/*`, `.../mixed/*` | Compare manager/factory/backend responsibilities | Codex/Claude managers duplicate standalone-agent orchestration. Mixed manager delegates to registry/handles and already uses per-member runtime via `MixedAgentMemberHandle`. | Design should remove duplicated managers rather than wrap them. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/*` | Check whether native AutoByteus is behaviorally equivalent to mixed | Native backend creates an `autobyteus-ts` `AgentTeam`, owns native event bridge/status projection, root/native command statuses, and native team commands. Not equivalent to mixed standalone members. | Keep out of first removal unless behavior change approved. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Verify mixed manager can run same-runtime members | `MixedAgentMemberHandle` builds `AgentRunConfig` from member config, uses `AgentRunManager.createAgentRun/restoreAgentRun`, and restores Codex/Claude runtime contexts based on member runtime kind. | Add parity tests if approved. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts`, `.../team-run-metadata-mapper.ts`, `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | Inspect restore and persistence shape | Metadata stores member runtime kinds and tree, not team backend kind; restore currently infers specialized backend for single-runtime metadata. | Change restore inference for Codex/Claude if approved. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | Check public create API contract | GraphQL create input includes member runtime but not team backend kind; backend kind is internal. | Lower public API risk. |
| 2026-05-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts`, `.../autobyteus-agent-run-backend-factory.ts` | Verify mixed AutoByteus standalone behavior | Mixed AutoByteus standalone members strip task-management tools; AutoByteus standalone members receive team communication context via `initialCustomData`. | Native behavior not equivalent. |
| 2026-05-30 | Doc | `autobyteus-web/docs/agent_teams.md` | Inspect frontend contract around mixed/nested launches | Frontend docs already state nested definitions use mixed topology even when all leaf members use same runtime and preserve per-member runtime/model identity. | Docs may need wording update after backend simplification. |
| 2026-05-30 | Command | `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts tests/unit/agent-team-execution/team-definition-topology-planner.test.ts` | Attempt targeted validation of current state | Failed immediately with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`; this worktree lacks package-local test dependencies. | Downstream validation must install/link deps or use a prepared worktree. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - GraphQL `createAgentTeamRun(input)` accepts `teamDefinitionId` and per-leaf `memberConfigs` with optional `runtimeKind`; it does not accept a `teamBackendKind`.
- Current execution flow:
  - `AgentTeamRunResolver.createAgentTeamRun(...)` -> `TeamRunService.createTeamRun(...)` -> `TeamDefinitionTopologyPlanner.buildPlan(...)` -> `AgentTeamRunManager.createTeamRun(...)` -> selected backend factory -> `TeamRun`.
  - Restore flow: `TeamRunService.restoreTeamRun(...)` -> `TeamRunMetadataMapper.buildRestoreContext(...)` -> `resolveTeamBackendKindFromMetadata(...)` -> `AgentTeamRunManager.restoreTeamRun(...)` -> selected backend factory.
- Ownership or boundary observations:
  - `TeamRunService` owns launch preparation, workspace normalization, topology planning, metadata/history recording.
  - `TeamDefinitionTopologyPlanner` owns topology and team backend selection policy.
  - `AgentTeamRunManager` owns active `TeamRun` registration and backend factory dispatch.
  - `MixedTeamManager` owns mixed/nested top-level runtime member orchestration and delegates member-specific execution to handles.
  - `CodexTeamManager` and `ClaudeTeamManager` own standalone same-runtime member orchestration but duplicate much of mixed/member-handle behavior.
  - `AutoByteusTeamRunBackend` owns native `AgentTeam` adaptation rather than the same standalone member-run model.
- Current behavior summary:
  - Mixed manager is currently a superset for topology/runtimes at the model level, but the framework still routes homogeneous Codex/Claude teams through specialized managers.
  - Native AutoByteus single-runtime teams intentionally bypass mixed to preserve native team semantics.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; Legacy Or Compatibility Pressure if old wrappers are kept.
- Refactor posture evidence summary: Refactor is warranted for Codex/Claude standalone team managers. It should not remove native AutoByteus backend in the first pass.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Mixed team manager can model same-runtime and mixed-runtime teams. | Valid design pressure: specialized same-runtime managers may be redundant. | Verify parity and native exception. |
| `TeamDefinitionTopologyPlanner` | Current selection keeps specialized backends for non-nested single-runtime teams. | Mixed is not authoritative today; policy duplicated by backend kind. | Change if approved. |
| `CodexTeamManager` / `ClaudeTeamManager` | Very similar standalone member-run lifecycle, restore, event, status, delivery, interrupt, termination logic. | Duplicated coordination likely removable. | Design removal and parity tests. |
| `MixedAgentMemberHandle` | Builds per-member `AgentRunConfig`, restores by runtime kind, and delegates to `AgentRunManager`. | Mixed/member-run path can model homogeneous Codex/Claude teams. | Add explicit homogeneous tests. |
| `AutoByteusTeamRunBackend` + docs | Native team backend preserves `autobyteus-ts` team behavior; mixed AutoByteus standalone strips task tools. | Mixed is not a full behavioral superset of native AutoByteus teams. | Keep native backend or approve behavior change. |
| GraphQL/metadata | Backend kind not public create input and not stored in metadata. | Internal refactor has manageable contract risk. | Update restore inference/tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Build recursive topology and select team backend | Chooses specialized backend for single-runtime non-nested teams. | Selection policy is main first change. |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Create/restore active `TeamRun`s through backend factories | Has four factory dependencies and backend dispatch branches. | Can simplify by removing Codex/Claude factories from this owner. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Top-level mixed/nested team manager | Delegates members to registry/handles; supports parent-boundary delivery. | Should become authoritative standalone-agent/member-run team manager. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Agent member execution in mixed teams | Uses `AgentRunManager` and per-member runtime kind; supports AutoByteus/Codex/Claude standalone agents. | Existing core for homogeneous Codex/Claude replacement. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Top-level subteam member execution | Creates/restores child mixed team run and bridges events. | Existing nested topology owner should remain. |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Codex same-runtime standalone team manager | Duplicates mixed handle/manager concerns with Codex thread-specific restore. | Removal candidate. |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Claude same-runtime standalone team manager | Duplicates mixed handle/manager concerns with Claude session/tool-exposure-specific restore. | Removal candidate; verify configured tool exposure parity. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native AutoByteus team adapter | Owns native event bridge/status projection/root statuses/native team commands. | Keep for first pass. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | Build restore runtime contexts and infer backend kind from metadata | Re-selects specialized Codex/Claude for single-runtime metadata. | Must route Codex/Claude to mixed if approved. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | Persisted team run metadata | Stores recursive member tree and runtime kinds, not backend kind. | Clean cutover feasible without metadata compatibility wrapper. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | GraphQL team launch mutations | No team backend kind input/output in create mutation. | Public API impact low. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Backend behavior documentation | Currently documents four paths. | Must update. |
| `autobyteus-web/docs/agent_teams.md` | Frontend team launch documentation | Already documents mixed path for nested/same-runtime nested teams. | Minor wording update. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-30 | Test attempt | `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/agent-team-execution/mixed-team-run-backend-factory.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts tests/unit/agent-team-execution/team-definition-topology-planner.test.ts` | Failed before running tests: `Command "vitest" not found`. | Dedicated worktree dependencies are not installed; downstream validation must fix environment before relying on test results. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, `autobyteus-server-ts` test dependencies must be available in this worktree.
- Required config, feature flags, env vars, or accounts: None identified for unit/integration parity tests; E2E/runtime tests may need existing server test harness setup.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Current team execution has four server backend kinds, but only three are conceptually distinct after mixed-member support:
   - Native AutoByteus `AgentTeam` backend.
   - Unified standalone member-run backend (currently named mixed).
   - Historical Codex/Claude same-runtime backends that now mostly duplicate the standalone member-run path.
2. The mixed manager is inclusive for runtime heterogeneity and homogeneous standalone-agent teams, because homogeneous is just a degenerate case of per-member runtime assignment.
3. The mixed manager is not inclusive of native AutoByteus team semantics because native teams expose task-plan-aware behavior and native team event handling that mixed standalone members intentionally do not expose.
4. Public API blast radius is manageable because backend kind is selected internally; however tests and internal restore/type code assume specialized contexts.
5. The clean first simplification should remove duplicated Codex/Claude manager paths without wrapper compatibility.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatibility wrappers should be designed for Codex/Claude specialized managers; removal should be clean-cut if approved.
- Existing metadata does not persist backend kind, so restoring historical Codex/Claude teams through mixed can be a direct resolver behavior change.
- Native AutoByteus single-runtime behavior must remain unless explicitly approved as a product behavior change.
- If `TeamBackendKind.CODEX_APP_SERVER` and `TeamBackendKind.CLAUDE_AGENT_SDK` are removed, internal tests/imports and any TypeScript consumers must be updated. If enum values remain temporarily, they must not imply active manager ownership.

## Open Unknowns / Risks

- Whether to rename `MIXED` / mixed files during the first pass or defer rename to avoid bloating the change.
- Whether hidden external consumers observe `TeamRun.teamBackendKind` from TypeScript imports rather than GraphQL.
- Whether current tests fully cover Claude configured tool exposure restore parity through the mixed path.
- Whether team-level file-change attachment behavior differs observably between native AutoByteus teams and mixed standalone AutoByteus members.

## Notes For Architect Reviewer

No architecture-review handoff has been sent yet because requirements are pending user approval. If approved, the design should be scoped as:

- Keep native AutoByteus backend.
- Make mixed/member-run backend authoritative for all Codex, Claude, heterogeneous, and nested team runs.
- Remove Codex/Claude team managers/backends/factories/contexts or decommission their active use with first-class removal.
- Update topology and restore backend selection to the new owner.
- Add explicit homogeneous Codex/Claude mixed-path parity validation.

## Follow-Up Investigation: Native AutoByteus Team Removal Hypothesis (2026-05-30)

User clarified the broader target: if the mixed manager permits each member to select any runtime, then a native AutoByteus-only team should also be representable as a mixed team whose members all use `RuntimeKind.AUTOBYTEUS`; therefore the `autobyteus-ts` native `AgentTeam` may also be removable.

Additional sources consulted:

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-30 | Code | `autobyteus-ts/src/agent-team/context/team-manager.ts` | Inspect native team manager responsibilities | Native manager lazily creates agents/subteams, bridges native events through `AgentEventMultiplexer`, tracks agent-id/name mapping, initializes coordinator, and interrupts running nodes. Much overlaps with server mixed manager/handles. | Port or replace residual behavior before removal. |
| 2026-05-30 | Code | `autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts`, `autobyteus-ts/src/agent-team/runtime/agent-team-worker.ts` | Inspect native runtime spine | Native runtime owns a worker loop, event queues, bootstrap/shutdown sequencing, status derivation, and event dispatch. Server mixed manager already owns a different orchestration path through `TeamRun` and member handles. | Decide which native runtime semantics remain product requirements. |
| 2026-05-30 | Code | `autobyteus-ts/src/agent-team/bootstrap-steps/*.ts` | Inspect native bootstrap capabilities | Native bootstrap creates shared `TaskPlan`, optionally starts `SystemEventDrivenAgentTaskNotifier`, injects native `teamContext`, attaches `TeamManifestInjectorProcessor`, and eagerly initializes coordinator. | Port shared task-plan capability if full removal proceeds. |
| 2026-05-30 | Code | `autobyteus-ts/src/agent-team/task-notification/*.ts` | Inspect task activation behavior | Event-driven task notifier observes task-plan events, queues runnable tasks, ensures assigned agents are ready, and posts system task notifications. | Missing from current mixed standalone path. |
| 2026-05-30 | Code | `autobyteus-ts/src/task-management/tools/task-tools/*`, `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | Check task tool dependency | Task tools require `customData.teamContext.state.taskPlan`. Current mixed AutoByteus standalone members strip `ToolCategory.TASK_MANAGEMENT`, proving parity is intentionally absent today. | Full mixed-only requires a server-owned task-plan context or intentional removal of task tools. |
| 2026-05-30 | Code | `autobyteus-ts/src/agent-team/context/create-scoped-native-team-context.ts`, `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | Compare native vs standalone AutoByteus team context | Native context exposes full team state/config/teamManager plus communication context. Standalone mixed context currently exposes communication context only. | Expand mixed AutoByteus member context if native task tools remain supported. |

Updated analysis:

- The user's model is correct as an architectural end-state: a single team orchestrator with per-member runtime assignment can include homogeneous AutoByteus, homogeneous Codex, homogeneous Claude, and heterogeneous teams.
- The current implementation does **not** yet make native AutoByteus team removal a pure manager-selection cleanup because native `autobyteus-ts` `AgentTeam` also owns shared task-plan state, task-management tool context, task-plan event streaming, and system task activation.
- Therefore, full mixed-only is viable, but it is a larger refactor than Codex/Claude folding. It needs a first-class replacement for native task-plan semantics inside the server mixed/member-run team owner, or an explicit product decision to remove task-management behavior.
- Preferred revised direction: treat mixed/member-run manager as the eventual sole team execution owner, but stage the work:
  1. Fold Codex/Claude managers into mixed.
  2. Add/port AutoByteus task-plan parity into the mixed/member-run path: shared team task plan, task tool context, task-plan event projection, system task notifier if still desired, and no task-tool stripping for AutoByteus mixed members once parity exists.
  3. Route flat AutoByteus teams through mixed.
  4. Remove `autobyteus-ts` native team runtime/factory/manager or reduce it to non-runtime shared types only after no active caller depends on native team behavior.

## User Clarification: Task Plan Refactor Is In Flight (2026-05-30)

User clarified that task-plan functionality is itself being refactored. This changes the interpretation of the native AutoByteus-team caveat:

- The current native `autobyteus-ts` `AgentTeam` task-plan behavior should not be treated as a permanent reason to preserve the native team runtime.
- Instead, task-plan behavior should become an independent team-run capability owned outside provider/native runtime managers.
- Once task-plan state/tools/events are extracted behind a runtime-neutral team-run boundary, the mixed/member-run manager can be the sole execution owner for all runtime compositions, including all-AutoByteus teams.

Design implication:

- The target mixed-only design should not port task-plan logic *into* a member/runtime-specific AutoByteus adapter.
- It should depend on or define a separate task-plan subsystem that serves `TeamRun` / the unified team manager and exposes task context to members through the same member-team context mechanism used for communication.
- This further supports removing native `autobyteus-ts` `AgentTeam` execution after the task-plan boundary is extracted.

## Clarification: TeamRun Is Already The Higher-Level Team Boundary (2026-05-30)

User asked whether current agent teams are already managed at a higher level using `TeamRun`. Code evidence supports this:

- Server entrypoints create/restore through `TeamRunService` and `AgentTeamRunManager`.
- `AgentTeamRunManager` registers active `TeamRun` instances and delegates backend creation/restore by current backend kind.
- `TeamRun` is the runtime-neutral command/status/event facade for server team execution: `postMessage`, `deliverInterAgentMessage`, `approveToolInvocation`, `interruptMember`, `terminate`, `getStatusSnapshot`, `getMemberStatusSnapshots`, and `subscribeToEvents`.
- Backend-specific objects (`AutoByteusTeamRunBackend`, `MixedTeamRunBackend`, older Codex/Claude backends) sit below `TeamRun` as execution adapters.
- The native `autobyteus-ts` `AgentTeam` is currently only the execution primitive used inside `AutoByteusTeamRunBackend`, not the top-level server team-run boundary.

Design implication: the simplification should strengthen `TeamRun` / unified team-manager ownership and move runtime-neutral concerns such as task plan to this level or an attached subsystem, rather than preserving native `autobyteus-ts` `AgentTeam` as a parallel higher-level owner.

## Simplification Thesis Confirmed By User (2026-05-30)

User confirmed the intended simplification thesis:

- The mixed manager is a superset because it permits per-member runtime assignment.
- Homogeneous teams are degenerate cases of mixed teams:
  - all AutoByteus members,
  - all Codex members,
  - all Claude members,
  - or any other future single-runtime composition.
- Therefore, runtime homogeneity should not be modeled as a distinct team-manager/backend kind.
- Removing specialized managers can substantially reduce code volume and conceptual surface area.

Additional design implication:

The existing split between `AutoByteusTeamRunBackend`, `CodexTeamManager`, `ClaudeTeamManager`, and `MixedTeamManager` is not an essential domain distinction. The essential distinction is:

- `TeamRun` owns team lifecycle/commands/status/events at the server team boundary.
- A unified member-run manager owns per-member routing and lifecycle.
- `AgentRun` owns runtime-specific execution per member.
- Runtime-specific behavior belongs at the `AgentRun` adapter layer, not in separate team managers.

This strengthens the recommendation to target a single unified/mixed team manager and remove specialized team manager code after runtime-neutral task-plan extraction.

## Naming Decision: Keep `MixedTeamManager` (2026-05-30)

User clarified that the target owner should continue to be called `MixedTeamManager`, not `UnifiedTeamManager`.

Rationale:

- "Mixed" is understood as the superset capability: each member can independently choose its runtime.
- Homogeneous teams are included naturally because every member can choose the same runtime.
- The desired simplification is not a rename-first effort; it is to make `MixedTeamManager` the general team manager by removing specialized same-runtime managers.

Design implication:

- Target code should keep the `MixedTeamManager` naming unless a specific local file/type needs a narrower helper name.
- Documentation should explain that `MixedTeamManager` is the sole/general server team manager because mixed runtime capability includes homogeneous runtime cases.
- Avoid introducing a new `UnifiedTeamManager` alias/wrapper; that would add indirection without ownership value.

## Core Target Invariant: TeamRun -> MixedTeamManager Handles All Runtime Compositions (2026-06-01)

User confirmed the core target invariant:

- `TeamRun -> MixedTeamManager` should handle all team runtime compositions.
- Runtime composition is data/configuration on members, not a reason to select a different team manager.
- Required combinations include:
  - all members `AUTOBYTEUS`,
  - all members `CODEX_APP_SERVER`,
  - all members `CLAUDE_AGENT_SDK`,
  - any heterogeneous mix of supported runtimes,
  - nested teams/subteam member topologies.

Design implication:

- `MixedTeamManager` is the single team orchestration owner below `TeamRun`.
- `AgentRun` remains the runtime-specific execution boundary per agent member.
- Runtime-specific adapters/factories belong under `AgentRun`, not under separate team managers.
- Any team-level concerns such as task plan, communication, status aggregation, and lifecycle policy must attach to `TeamRun`/`MixedTeamManager` or dedicated runtime-neutral subsystems.

## Branch Refresh And Latest Native AutoByteus Analysis (2026-06-06)

User requested that the ticket branch be based on the newest `origin/personal` before continuing the AutoByteus/native analysis.

### Branch refresh evidence

| Date | Command | Result |
| --- | --- | --- |
| 2026-06-06 | `git status --short --branch` | Branch was `codex/mixed-team-manager-simplification-analysis...origin/personal`; only untracked ticket artifacts existed. |
| 2026-06-06 | `git fetch origin --prune` | Remote refs refreshed successfully. |
| 2026-06-06 | `git rebase origin/personal` | Succeeded: `Successfully rebased and updated refs/heads/codex/mixed-team-manager-simplification-analysis.` |
| 2026-06-06 | `git rev-parse HEAD` | Current HEAD is `c4a7c61394bda6789809473c4e170ce96b2c79ed`, matching latest `origin/personal` at rebase time. |

Current worktree/branch after refresh:

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Branch: `codex/mixed-team-manager-simplification-analysis`
- Base/tracking branch: `origin/personal`
- Current status: only untracked ticket artifacts under `tickets/in-progress/mixed-team-manager-simplification-analysis/`.

### Latest sources consulted after rebase

| Source Type | Exact Source / Command | Current Finding | Design Implication |
| --- | --- | --- | --- |
| Code search | `rg -n "TeamBackendKind|MixedTeamManager|AutoByteusTeamRunBackend|TaskPlan|taskPlan|TASK_MANAGEMENT|StartTaskAgentInstance|TaskAgent" autobyteus-server-ts/src autobyteus-ts/src` | No current `TaskPlan` / `taskPlan` implementation remains in server or native team code. Server now has `agent-team-execution/task-delegation/*` and `agent-tools/task-delegation/*`. | Earlier notes about native `AgentTeam` owning active task-plan behavior are superseded by current code. The remaining task behavior is now largely server-owned task delegation. |
| Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | `buildPlan(...)` still selects `TeamBackendKind.MIXED` only for subteams or multi-runtime flat teams; flat single-runtime teams still route through `resolveSingleRuntimeTeamBackendKind(...)`. | Backend-selection simplification is still needed. |
| Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | Restore still infers specialized backend kind for single-runtime historical metadata and builds `CodexTeamRunContext`, `ClaudeTeamRunContext`, or `AutoByteusTeamRunContext`; mixed restore is used for nested/multi-runtime metadata. | Restore inference must change to mixed-only for the target invariant. |
| Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Manager still owns four factories and branches by `TeamBackendKind`; task delegation registry is detached on unregister. `RunFileChangeService.attachToTeamRun(...)` is currently registered only for native `AUTOBYTEUS` team runs. | Mixed-only removes factory branching; file-change behavior should be verified because mixed member `AgentRun`s already attach file-change recording through `AgentRunManager`, while native teams require team-level bridging. |
| Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/*` | `MixedTeamManager` delegates agent members through `MixedAgentMemberHandle`, which builds per-member `AgentRunConfig`, creates/restores via `AgentRunManager`, binds events, handles communication, interrupt, approval, and server-managed task-agent instances. `MixedSubTeamMemberHandle` creates/restores child mixed team runs and prefixes events. | This path already implements the required `TeamRun -> MixedTeamManager -> AgentRun(runtimeKind per member)` execution spine, including nested teams and task-agent lifecycle. |
| Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Standalone AutoByteus `AgentRun` creation uses explicit member run IDs/memory dirs, injects `TeamManifestInjectorProcessor` when `memberTeamContext` is present, and places server-built team context in native `initialCustomData.teamContext`. | All-AutoByteus through mixed can create native agents as member `AgentRun`s without needing native `AgentTeam` construction. |
| Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | Mixed AutoByteus standalone team context now includes `teamRunId`, `teamDefinitionId`, `teamName`, current member path/route/run ID, coordinator route, task-agent identity fields, all member descriptors, and a `communicationContext` bridge. | Current mixed AutoByteus member context is richer than the older communication-only note; it is sufficient for server task-delegation context extraction. |
| Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | In mixed AutoByteus standalone members, legacy local task tools (`assign_task_to`, `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, `update_task_status`) are filtered out, but server task-delegation tools are allowed if configured (`TASK_DELEGATION_TOOL_NAMES`). | Current mixed path intentionally favors server-owned task delegation, not old native local task-plan tools. This supports the target simplification. |
| Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/*` | Server-owned `TaskDelegationService` owns ledger, activation, completion notification, event publication, input resolution, and settlement. It calls `TeamRun.startTaskAgentInstance(...)` and `TeamRun.settleTaskAgentInstance(...)`. | Task delegation is runtime-neutral at `TeamRun` boundary and therefore fits the mixed-only target. |
| Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`, `backends/team-run-backend.ts` | `TeamRun` exposes task-agent APIs in addition to post/deliver/approval/interrupt/settle/terminate/publish. | `TeamRun` is already the correct higher-level boundary for task delegation and manager simplification. |
| Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native `AutoByteusTeamRunBackend` explicitly returns unsupported for task-agent-targeted `postMessage`, task-agent-targeted inter-agent messages, `settleMember`, `startTaskAgentInstance`, and `settleTaskAgentInstance`. | Native AutoByteus team backend is now behind the server task-delegation capability; all-AutoByteus through mixed is not just feasible, it is the path that can support server task delegation. |
| Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts` | Native pure AutoByteus team config builder skips server task-delegation tools with a warning because native per-member settlement is unavailable. | Current native `AgentTeam` is not the richer task path anymore; it lacks new task-agent settlement semantics. |
| Code | `autobyteus-ts/src/agent-team/*` | Native `AgentTeam` still owns a separate worker/event-queue/bootstrap/shutdown runtime, lazy native node creation, native subteam creation, native event multiplexing, coordinator eager start, scoped native team context, and CLI/event-stream support. | These are removal/migration concerns, but they are orchestration duplication rather than permanent task-plan blockers in current code. |
| Code search | `rg -n "AgentTeamBuilder|AgentTeamFactory|AgentTeamEventStream|autobyteus-ts/agent-team|defaultAgentTeamFactory" ...` | Native `autobyteus-ts` `agent-team` exports are still used by server native backend, CLI, examples, docs, and native tests. Some utility paths such as `agent-team/utils/team-local-definition-id` are used outside native execution. | Do not delete the whole `autobyteus-ts/src/agent-team` subtree in the first server simplification unless CLI/examples/docs/tests and reusable utilities are migrated too. Stop server execution usage first, then prune package API in a separate removal pass. |

### Updated current-state conclusion after rebase

The latest code is closer to the user's desired architecture than the earlier investigation showed:

1. The old native `TaskPlan`/`taskPlan` blocker is not present in the rebased code. Server-owned task delegation has replaced the old native task-plan-style responsibility in the inspected sources.
2. The mixed path already supports AutoByteus members as standalone `AgentRun`s, with per-member runtime, explicit member run IDs, memory directories, team communication context, team manifest injection, task-agent identity propagation, and server task-delegation tool eligibility.
3. The native pure AutoByteus team backend is now the path with weaker task-agent parity: it skips task-delegation tools and returns unsupported for task-agent start/settlement APIs.
4. Therefore, moving all-AutoByteus teams to `TeamRun -> MixedTeamManager -> AutoByteus AgentRun`s is likely achievable as part of the simplification, not a separate task-plan-preservation project.
5. The hard part is not preserving an active native task plan; the hard part is removing/replacing the duplicated native team runtime/event/CLI/export surface safely.

### Native AutoByteus behavior that still needs parity checks before server cutover

The following native `AgentTeam` responsibilities still need explicit parity or intentional removal when all-AutoByteus teams route through `MixedTeamManager`:

- Native worker/event queue lifecycle in `AgentTeamRuntime` / `AgentTeamWorker`.
- Native event stream conversion through `AgentTeamEventStream`, `AgentEventMultiplexer`, and `AutoByteusTeamRunEventProcessor`; mixed uses `AgentRun` event streams instead.
- Native eager coordinator initialization in `CoordinatorInitializationStep`; mixed starts the coordinator lazily when `TeamRun.postMessage(..., target=null)` resolves the coordinator route.
- Native subteam creation through native `AgentTeam` nodes; mixed uses `MixedSubTeamMemberHandle` and child `TeamRun`s.
- Native scoped `teamContext` shape (`config`, `state`, `teamManager`) versus server-built `MemberTeamContext`/`AutoByteusStandaloneTeamContext` shape. Current task delegation and communication use the server-built shape; old tools that depend on native `state` should remain filtered or be removed/migrated.
- Native CLI/examples/tests/exported API in `autobyteus-ts`, which are outside server team execution and require a separate deprecation/removal decision.

### Updated migration implication

A stronger staged target is now reasonable:

1. Make `TeamDefinitionTopologyPlanner` and restore inference return `TeamBackendKind.MIXED` for all active team runs, including all-AutoByteus, all-Codex, all-Claude, heterogeneous, and nested teams.
2. Simplify `AgentTeamRunManager` so `TeamRunConfig.teamBackendKind` no longer selects same-runtime or native AutoByteus team backends for server execution; preserve only mixed backend creation/restore in the target.
3. Keep `RuntimeKind` selection solely inside member `AgentRunConfig` and `AgentRunManager`.
4. Preserve server-owned task delegation through the existing `TeamRun`/`TaskDelegationService` boundary; verify all runtimes, especially AutoByteus mixed members, can delegate, run task-agent instances, report completion/failure, accept, and settle.
5. Remove `AutoByteusTeamRunBackend`, `AutoByteusTeamRunBackendFactory`, `AutoByteusTeamRunEventProcessor`, `AutoByteusTeamMemberStatusProjector`, and related native adapter tests after all-AutoByteus mixed parity is validated.
6. Treat deletion of `autobyteus-ts/src/agent-team/*` as a separate package/API cleanup after server no longer imports it; migrate or intentionally remove CLI/examples/docs/tests and move reusable utilities if needed.

## Targeted `autobyteus-ts` Task-Plan Removal Verification (2026-06-06)

User clarified that the task-plan functionality had already been completely removed from `autobyteus-ts`. I rechecked the rebased ticket branch specifically for that point.

### Verification evidence

| Evidence Type | Source / Command | Finding |
| --- | --- | --- |
| Branch state | `git status --short --branch` and `git rev-parse HEAD` | Still on `codex/mixed-team-manager-simplification-analysis...origin/personal` at `c4a7c61394bda6789809473c4e170ce96b2c79ed`; only ticket artifacts are untracked. |
| Search | `rg -n "TaskPlan|taskPlan|task plan|TaskNotifier|SystemEventDriven|TaskNotification|task-notification|assign_task_to|create_tasks|get_my_tasks|get_task_plan_status|update_task_status|create_task\\b" autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/examples autobyteus-ts/docs --glob '!**/node_modules/**' --glob '!**/dist/**'` | No active native `TaskPlan` / `taskPlan` source implementation was found. Hits are documentation about removal, generic agent streaming `SYSTEM_TASK_NOTIFICATION`, generic XML parser tests using `create_tasks` as parser text, and the legacy-removal test. |
| Documentation | `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | States that `autobyteus-ts` owns native team lifecycle/routing/communication/event streaming, but no longer owns a native team task ledger. It explicitly says the old native task-plan subsystem was removed: no `TaskPlan`, `BaseTaskPlan`, `InMemoryTaskPlan`, task-plan schemas/reports/deliverables/converters/stream payloads, task-plan bootstrap, task notification mode/env var, native task-plan stream source, or CLI task-plan panel. |
| Documentation | `autobyteus-ts/docs/agent_team_design.md` | States the `agent-team` package does not own team task state, has no task-plan bootstrap step/task-notification mode/task notifier, and that native `TASK_PLAN` stream events have been removed. |
| Removal test | `autobyteus-ts/tests/unit/task-management/tools/task-tools/legacy-task-tools-removed.test.ts` | Asserts the default local tool registry does not register legacy model-facing team task-plan tools: `assign_task_to`, `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, `update_task_status`; confirms `add_todo` remains registered. |
| Source inspection | `find autobyteus-ts/src/task-management -maxdepth 4 -type f ...` | `src/task-management` contains only personal ToDo models/tools: `create_todo_list`, `add_todo`, `get_todo_list`, and `update_todo_status`. These are local per-agent checklist tools, not a team task-plan ledger. |
| Public exports | `autobyteus-ts/src/index.ts` | Still exports `task-management` and `agent-team` package surfaces. The remaining `agent-team` export is lifecycle/routing/streaming/CLI surface, not an active task-plan API. |

### Corrected conclusion

The user is correct: on the current rebased code, the old native `autobyteus-ts` team task-plan functionality is already fully removed from active source. The remaining native `agent-team` package is not a task-plan owner; it is a native lifecycle/routing/communication/streaming/CLI package surface.

This tightens the recommendation:

1. Do **not** preserve native `autobyteus-ts` `AgentTeam` server execution for task-plan behavior; that behavior is gone.
2. Keep legacy task-plan tool names removed/filtered; do not recreate them during mixed-only migration.
3. Treat all-AutoByteus migration to `MixedTeamManager` as a server execution simplification and parity exercise for lifecycle, routing, events, communication, memory/workspace/file-change behavior, approvals, interrupt, and server task-delegation identity—not as a task-plan port.
4. The remaining cleanup question is how far to delete native package/API surfaces after server execution stops depending on them. Deleting `autobyteus-ts/src/agent-team/*` entirely is still separate from making server `TeamRun` use `MixedTeamManager` for all combinations because CLI/examples/docs/tests and reusable utility imports still reference that package surface.

## Legacy Removal-Test And Legacy-Reference Reclassification (2026-06-06)

User clarified that once task-plan functionality is removed, a dedicated unit test whose only purpose is to assert old task-plan tools are absent should itself be treated as redundant legacy surface. This aligns with the shared design principles read from `solution-designer/design-principles.md`:

- no backward compatibility or legacy retention for in-scope behavior;
- removal is first-class architecture work;
- prefer clean-cut replacement over compatibility wrappers or dual-path behavior;
- explicitly remove/decommission obsolete paths.

### Additional source evidence

| Evidence Type | Source / Command | Finding | Updated Classification |
| --- | --- | --- | --- |
| Search | `rg -n "assign_task_to|create_task\\b|create_tasks|get_my_tasks|get_task_plan_status|update_task_status" autobyteus-ts autobyteus-server-ts --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/.next/**'` | Old team task-plan names still appear in active docs, examples, server instructions, server filtering code, and tests. They also appear in historical ticket artifacts. | Active source/docs/tests references should be audited as legacy-retention pressure. Historical ticket artifacts are lower priority unless project policy also wants them pruned. |
| Test | `autobyteus-ts/tests/unit/task-management/tools/task-tools/legacy-task-tools-removed.test.ts` | Test only preserves a list of removed task-plan tool names and asserts they are absent from the default local registry. | Reclassified from useful removal evidence to legacy cleanup target. In the target design, delete this test or replace it with positive tests for current ToDo tool registration and server task-delegation exposure. |
| Server filtering code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | Contains `LEGACY_LOCAL_TASK_TOOL_NAMES` and filters those names for mixed AutoByteus members. | Potentially redundant after native tools are fully removed. It is a transitional guard unless there is evidence that external/custom registries can still inject those names. Target design should either remove it or justify it with a current, non-legacy invariant. |
| Server/docs/tests references | `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts`, `task-delegation-work-packet-renderer.ts`, related docs/tests | Current instructions tell agents not to call removed tool names such as `get_my_tasks` / `create_task`. | These references preserve legacy vocabulary in active runtime instructions. Target cleanup should rewrite instructions around the positive current workflow: use the provided task packet and server task-delegation tools, without naming removed tools unless a temporary migration warning is explicitly required. |
| Parser tests | `autobyteus-ts/tests/integration/agent/streaming/full-streaming-flow.test.ts`, `tests/unit/agent/streaming/parser/states/xml-tool-parsing-state.test.ts` | Generic parser tests use `create_tasks` as sample tool text. | Not semantically a task-plan test, but still carries stale legacy naming. Prefer renaming sample tool names to neutral/current examples. |

### Updated investigation conclusion

The previous note used `legacy-task-tools-removed.test.ts` as evidence that old task-plan tools were gone. That evidence is valid historically, but the test itself should not be part of the clean target if the code has already moved on.

For the mixed-only simplification design, classify legacy-name assertions and legacy-name runtime instructions as cleanup candidates:

1. Remove `autobyteus-ts/tests/unit/task-management/tools/task-tools/legacy-task-tools-removed.test.ts` or replace it with current positive coverage.
2. Remove/rewrite active docs and examples that center old task-plan tool names, replacing them with current server task-delegation and personal ToDo descriptions.
3. Audit server-side legacy filters/instructions. If the old names cannot be produced by active tool registries anymore, remove the guard list. If a temporary guard is required for externally configured tools, mark it explicitly as transitional with a deletion condition; do not normalize it as steady-state architecture.
4. Rename generic parser-test sample tool names away from removed task-plan names so active tests do not keep legacy vocabulary alive.

This makes the target stronger: not only should native task-plan implementation be removed, but dedicated tests/instructions/filters that exist only to remember removed task-plan names should also be decommissioned during cleanup unless they are proven to protect a current non-legacy boundary.

## CLI Surface Removal Scope Clarification (2026-06-06)

User clarified that the `autobyteus-ts` CLI is unused and should be removed completely rather than preserved as a reason to keep native agent-team code. This materially changes the earlier risk classification around native package cleanup: CLI compatibility should no longer block removal.

### CLI surface inspected

| Evidence Type | Source / Command | Finding | Design Implication |
| --- | --- | --- | --- |
| File inventory | `find autobyteus-ts/src/cli -maxdepth 5 -type f -print` | Current CLI surface consists of single-agent CLI files (`src/cli/agent/agent-cli.ts`, `src/cli/agent/cli-display.ts`) and native agent-team Ink TUI files (`src/cli/agent-team/app.tsx`, `state-store.ts`, and widgets). | CLI is a distinct package surface that can be removed as a unit. |
| Public exports | `autobyteus-ts/src/index.ts` and `autobyteus-ts/src/cli/index.ts` | Root package exports `./cli/index.js` and `./cli/agent-team/widgets/index.js`; CLI index exports `runAgentCli`, `InteractiveCliDisplay`, and `runAgentTeamCli`. | Removal must delete these exports; do not leave public compatibility aliases/wrappers. |
| Package metadata | `autobyteus-ts/package.json` | No `bin` entry was found. CLI is exported as library API rather than installed as an executable command. | Removal risk is narrower than a shipped command-line binary; no executable command contract was identified in package metadata. |
| Source dependencies | `rg -n "from 'ink'|from \"ink\"|from 'react'|from \"react\"" autobyteus-ts/src autobyteus-ts/tests` | `ink`/`react` imports are confined to `src/cli/agent-team/*`. | Removing CLI/TUI should allow removal of `ink`, `react`, and `@types/react` if no other transitive project need remains. |
| Unit tests | `find autobyteus-ts/tests/unit/cli -type f ...` | CLI has dedicated tests for `InteractiveCliDisplay`, `TuiStateStore`, focus-pane history, and agent-team renderables. | These tests become deletion targets with the CLI; they should not be retained as orphaned coverage. |
| Native team dependency | `src/cli/agent-team/app.tsx`, `state-store.ts` | Agent-team TUI imports native `AgentTeam`, `AgentTeamEventStream`, native team stream event shapes, and native team status. | Removing CLI eliminates one current reason to preserve native `autobyteus-ts/src/agent-team` package surface. |

### Updated investigation conclusion

The CLI should be treated as unused legacy product surface, not as a migration compatibility constraint. The clean target should remove:

1. `autobyteus-ts/src/cli/**` completely;
2. root exports for `./cli/index.js` and `./cli/agent-team/widgets/index.js`;
3. `autobyteus-ts/tests/unit/cli/**`;
4. CLI-focused documentation/examples if any remain after broader docs cleanup;
5. CLI-only dependencies such as `ink`, `react`, and `@types/react` if package graph verification confirms they are no longer used.

This reduces the native-agent-team cleanup risk: earlier notes said full deletion of `autobyteus-ts/src/agent-team/*` had to account for CLI usage. With the CLI explicitly out of scope for preservation, CLI is no longer a blocker. Remaining blockers are native tests/examples/docs and any non-CLI reusable utility imports.

### Design-principle classification

- Change posture: cleanup/refactor as part of larger mixed-manager simplification.
- Root-cause classification: legacy or compatibility pressure plus file responsibility drift.
- Refactor needed now: yes, if CLI deletion is included in the implementation scope.
- Reason: preserving an unused CLI would keep native team event/status/rendering code alive and contradict the clean-cut removal principle. The target should delete it rather than adapt it to the mixed-manager path.

## TUI Removal Clarification (2026-06-06)

User corrected the wording to TUI and clarified the intended requirement: all terminal UI code should be removed. This refers especially to the Ink/React native agent-team TUI under `autobyteus-ts/src/cli/agent-team/**`, including widgets, state store, app shell, renderables, and related tests.

This is not a migration-to-mixed requirement. The TUI is unused legacy product surface and should be deleted outright. The broader CLI-removal requirement still includes the single-agent CLI too unless user later narrows the scope.

## Specialized Team Manager Removal Feasibility Analysis (2026-06-06)

User asked whether separate Codex/Claude/native team managers can really be removed so that only `MixedTeamManager` remains under `TeamRun`.

### Sources inspected

| Evidence Type | Source / Command | Finding | Implication |
| --- | --- | --- | --- |
| Backend inventory | `find autobyteus-server-ts/src/agent-team-execution/backends -maxdepth 4 -type f -print` | Current server has four active team backend families: `autobyteus`, `codex`, `claude`, and `mixed`. | The current code still models runtime homogeneity as a separate team-backend choice. |
| Backend selection | `team-definition-topology-planner.ts` | `buildPlan(...)` chooses `TeamBackendKind.MIXED` only for subteams or multi-runtime leaf sets; single-runtime teams route through `resolveSingleRuntimeTeamBackendKind(...)`. | Mixed-only requires changing planner selection to always produce `TeamBackendKind.MIXED` for launchable team runs. |
| Restore selection | `team-run-runtime-context-support.ts` | Restore infers specialized backend kinds for single-runtime metadata and builds `CodexTeamRunContext`, `ClaudeTeamRunContext`, or `AutoByteusTeamRunContext`; only nested/multi-runtime metadata builds `MixedTeamRunContext`. | Mixed-only requires restore to build `MixedTeamRunContext` for all team metadata. |
| Run-manager dispatch | `agent-team-run-manager.ts` | `AgentTeamRunManager` owns AutoByteus, Codex, Claude, and Mixed factories, and dispatches create/restore by `TeamBackendKind`. | Mixed-only removes three factory fields/imports/branches and keeps only mixed create/restore. |
| Codex/Claude managers | `codex-team-manager.ts`, `claude-team-manager.ts` | Codex and Claude managers implement the same team manager surface as Mixed: status aggregation, post message, inter-agent message, tool approval, interrupt, settlement, task-agent start/settle, terminate, event subscription. They create/restore member runs through `AgentRunManager`. | These are runtime-homogeneous duplicates of behavior the mixed manager already generalizes. Runtime-specific execution is already delegated to `AgentRunManager`. |
| Mixed manager | `mixed-team-manager.ts`, `mixed-agent-member-handle.ts`, `mixed-team-member-registry.ts`, `mixed-sub-team-member-handle.ts` | Mixed manager routes commands by member route, handles agent and subteam members, builds `MemberTeamContext`, creates/restores member `AgentRun`s via `AgentRunManager`, publishes member events, handles approvals/interrupt/settlement, and supports server-managed task-agent instances. | The mixed path is the right general team orchestration spine and can represent homogeneous teams as all members using the same `runtimeKind`. |
| Agent-run dispatch | `agent-run-manager.ts` | Runtime-specific factories already live under `AgentRunManager`: AutoByteus, Codex, Claude. `AgentRunConfig.runtimeKind` selects the concrete runtime per member. | Runtime-specific behavior does not need team-manager-level branching. It belongs at the member `AgentRun` boundary. |
| Code-size signal | `wc -l` on backend folders | Codex team backend files are ~975 lines, Claude team backend files are ~988 lines, AutoByteus team backend adapter files are ~2013 lines, and mixed backend files are the generalized path. | Mixed-only can remove thousands of lines of duplicated team-orchestration code, though tests/docs also need cleanup. |
| Test assumptions | `rg` across `autobyteus-server-ts/tests/*/agent-team-execution` | Many current tests assert specialized backend selection/dispatch for single-runtime teams and have dedicated Codex/Claude/AutoByteus backend tests. Mixed tests already cover mixed creation and event behavior but not yet all homogeneous compositions through mixed. | Tests must be rewritten: remove specialized-backend assertions and add all-AutoByteus/all-Codex/all-Claude-through-mixed coverage. |

### Feasibility conclusion

Yes, based on current code, removing separate Codex and Claude team managers is feasible and desirable. They are not essential runtime owners; they are team-level orchestration duplicates for homogeneous runtime cases. The real runtime-specific ownership already exists below them in `AgentRunManager` and the Codex/Claude/AutoByteus `AgentRun` backend factories.

The target shape is:

```text
TeamRun
  -> MixedTeamManager
      -> MixedAgentMemberHandle
          -> AgentRunManager
              -> AgentRun(runtimeKind = AUTOBYTEUS | CODEX_APP_SERVER | CLAUDE_AGENT_SDK)
```

A homogeneous Codex team becomes a normal mixed team whose member configs all have `runtimeKind: CODEX_APP_SERVER`. Same for Claude and AutoByteus.

### What would change

1. `TeamDefinitionTopologyPlanner` stops using `resolveSingleRuntimeTeamBackendKind(...)` and emits `TeamBackendKind.MIXED` for every team topology.
2. Restore inference stops constructing `CodexTeamRunContext`, `ClaudeTeamRunContext`, and `AutoByteusTeamRunContext`; it constructs `MixedTeamRunContext` for all metadata.
3. `AgentTeamRunManager` keeps only `MixedTeamRunBackendFactory` for active create/restore.
4. `TeamBackendKind` can be simplified so `MIXED` is the only active team backend kind. Runtime kinds remain on `TeamRunMemberConfig` / `AgentRunConfig`.
5. Delete specialized team backend families after parity tests pass:
   - `backends/codex/*team*`
   - `backends/claude/*team*`
   - `backends/autobyteus/*team*` server adapter files
6. Keep runtime-specific `agent-execution/backends/codex`, `agent-execution/backends/claude`, and `agent-execution/backends/autobyteus`; these are still needed by `AgentRunManager`.

### Main parity risks before deletion

The mixed path is architecturally sufficient, but validation must prove these behaviors for all-AutoByteus, all-Codex, and all-Claude teams:

- launch and restore with stable member run IDs and platform thread/session/native IDs;
- coordinator default routing when no explicit target is provided;
- inter-agent messaging and member-team context content;
- tool approval routing;
- interrupt/settle behavior;
- file-change/memory/workspace projection;
- server task-delegation task-agent start/complete/accept/settle;
- event projection compatibility expected by API/WebSocket/UI clients.

The expected implementation is still a refactor, not a speculative rewrite: `MixedTeamManager` already has the target spine. The work is to remove selection branches and obsolete backend families, then adjust tests/docs around the mixed-only invariant.

## Branch Refresh And Latest TUI / Team-Manager State (2026-06-06)

User reported that `origin/personal` had been updated again and that the TUI may already be removed upstream. I refreshed and rebased the ticket branch before rechecking current code.

### Branch refresh evidence

| Date | Command | Result |
| --- | --- | --- |
| 2026-06-06 | `git status --short --branch` | Branch was `codex/mixed-team-manager-simplification-analysis...origin/personal [behind 11]`; only untracked ticket artifacts existed. |
| 2026-06-06 | `git fetch origin --prune` | Remote refs refreshed successfully. |
| 2026-06-06 | `git rev-parse origin/personal` | Latest `origin/personal` is `74c0fd5905c85a4f52b7fecec16bf4c644a745de`. |
| 2026-06-06 | `git rebase origin/personal` | Succeeded: `Successfully rebased and updated refs/heads/codex/mixed-team-manager-simplification-analysis.` |
| 2026-06-06 | `git rev-parse HEAD` | Current ticket HEAD is `74c0fd5905c85a4f52b7fecec16bf4c644a745de`. |

Current worktree/branch after refresh:

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Branch: `codex/mixed-team-manager-simplification-analysis`
- Base/tracking branch: `origin/personal`
- Current status: only untracked ticket artifacts under `tickets/in-progress/mixed-team-manager-simplification-analysis/`.

### Latest TUI / CLI state after rebase

| Evidence Type | Source / Command | Finding | Impact |
| --- | --- | --- | --- |
| File inventory | `find autobyteus-ts/src/cli -maxdepth 5 -type f -print` | `autobyteus-ts/src/cli` is absent. | The CLI/TUI removal requirement is now already satisfied by latest base code. |
| Root exports | `autobyteus-ts/src/index.ts` | Root exports no longer include `./cli/index.js` or `./cli/agent-team/widgets/index.js`. | No CLI/TUI public export removal remains for this ticket. |
| Dependency audit | `autobyteus-ts/package.json` plus `rg` for `ink`/`react` imports | `ink`, `react`, and `@types/react` are no longer listed in package dependencies/devDependencies; `rg` found no active source imports. | TUI-only dependencies have already been removed upstream. |
| Regression test | `autobyteus-ts/tests/integration/public-surface/cli-tui-removal.test.ts` | Upstream added public-surface coverage asserting removed CLI/TUI symbols are not exported and source module stubs are gone. | The target should keep this non-regression coverage; it is current positive public-surface protection, unlike the old task-plan negative fixture. |
| Documentation | `autobyteus-ts/docs/nodejs_architecture.md` | New section states native CLI/TUI was removed, `autobyteus-ts` is a programmatic runtime/library package, and `src/cli/**`, `runAgentCli`, `runAgentTeamCli`, Ink widgets, and compatibility wrappers must not be reintroduced without new design. | This aligns with user direction and removes CLI/TUI from remaining implementation scope. |
| Native agent-team inventory | `find autobyteus-ts/src/agent-team -maxdepth 4 -type f -print` | Native `autobyteus-ts/src/agent-team/**` still exists, including runtime, factory, streaming, status, handlers, and utility files. | CLI/TUI is no longer a blocker, but native agent-team package cleanup is still separate if desired; non-CLI references remain. |

### Latest team-manager state after rebase

| Evidence Type | Source / Command | Finding | Impact |
| --- | --- | --- | --- |
| Backend inventory | `find autobyteus-server-ts/src/agent-team-execution/backends -maxdepth 4 -type f -print` | Specialized server team backend families still exist: `autobyteus`, `codex`, `claude`, plus `mixed`. | Mixed-only server team-manager simplification has not yet landed upstream. |
| Backend kind model | `autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts` | `TeamBackendKind` still includes `AUTOBYTEUS`, `CODEX_APP_SERVER`, `CLAUDE_AGENT_SDK`, and `MIXED`; `resolveSingleRuntimeTeamBackendKind(...)` still maps runtime homogeneity to specialized team backends. | Runtime homogeneity is still modeled as a team-backend distinction in latest code. |
| Planner | `team-definition-topology-planner.ts` | `buildPlan(...)` still chooses `MIXED` only for subteams or multi-runtime leaf sets; single-runtime teams still route to specialized backends. | Planner still needs mixed-only cutover. |
| Restore support | `team-run-runtime-context-support.ts` | Restore inference still can resolve specialized backend kinds and build `CodexTeamRunContext`, `ClaudeTeamRunContext`, or `AutoByteusTeamRunContext`. | Restore path still needs mixed-only normalization. |
| Run manager | `agent-team-run-manager.ts` | `AgentTeamRunManager` still imports and owns AutoByteus, Codex, Claude, and Mixed factories; `resolveBackendFactory(...)` still dispatches across all four. | The main server simplification target remains unchanged. |

### Updated impact assessment

The rebase simplifies the task by removing the CLI/TUI cleanup from the remaining implementation burden. The latest base already deleted `autobyteus-ts/src/cli/**`, removed CLI/TUI exports, removed Ink/React dependencies, documented the removal, and added public-surface regression coverage.

However, the core mixed-manager simplification is still not done. The latest code still has specialized server team managers/backends and still routes homogeneous teams away from `MixedTeamManager`. The remaining work is therefore narrower and clearer:

1. Keep the already-completed CLI/TUI removal as a non-regression invariant.
2. Cut over server team launch/restore/dispatch to `TeamBackendKind.MIXED` / `MixedTeamManager` for all runtime compositions.
3. Remove specialized server team backend families after mixed parity is validated.
4. Treat any later deletion of native `autobyteus-ts/src/agent-team/**` as package/API cleanup independent of CLI/TUI, because CLI/TUI no longer depends on it.

## MixedTeamManager Member Creation Path And Specialized-Manager Dependency (2026-06-06)

User asked whether `MixedTeamManager` depends on the other team managers when different members use different runtimes, and whether specialized managers really need to be removed.

### Code path traced

| Step | Source | Behavior |
| --- | --- | --- |
| Team command routing | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | `postMessage`, inter-agent delivery, approval, interrupt, settlement, and task-agent start/settle route through `MixedTeamMemberRegistry`. |
| Member handle creation | `backends/mixed/members/mixed-team-member-registry.ts` | For `memberKind === "agent"`, registry creates `MixedAgentMemberHandle`; for `memberKind === "agent_team"`, it creates `MixedSubTeamMemberHandle`. It does not instantiate Codex/Claude/AutoByteus team managers. |
| Agent member run creation | `backends/mixed/members/mixed-agent-member-handle.ts` | `ensureReady()` builds an `AgentRunConfig` using `this.options.config.runtimeKind`, builds a `memberTeamContext`, then calls `AgentRunManager.createAgentRun(memberRunConfig, memberRunId)` or `AgentRunManager.restoreAgentRun(...)`. |
| Runtime dispatch | `agent-execution/services/agent-run-manager.ts` | `AgentRunManager.resolveBackendFactory(runtimeKind)` chooses the per-agent runtime backend: AutoByteus, Codex, or Claude. This is the correct runtime-specific boundary. |
| Subteam creation | `backends/mixed/members/mixed-sub-team-member-handle.ts` and `mixed-sub-team-run-factory.ts` | Subteams are created/restored as child `TeamRun`s with `TeamBackendKind.MIXED` and `MixedTeamRunBackend`; this recurses through mixed, not specialized team managers. |
| Task-agent instance creation | `MixedTeamMemberRegistry.startTaskAgentInstance(...)` | Task-agent handles use the logical member's `runtimeKind` and create a `MixedAgentMemberHandle`, so task agents also go through `AgentRunManager`, not specialized team managers. |

### Clarified behavior

If a mixed team has two agent members with different supported runtimes, for example:

```text
Member A: runtimeKind = CODEX_APP_SERVER
Member B: runtimeKind = CLAUDE_AGENT_SDK
```

then `MixedTeamManager` does not call `CodexTeamManager` or `ClaudeTeamManager`. It lazily creates each member's `AgentRun` through `AgentRunManager`:

```text
TeamRun
  -> MixedTeamManager
      -> MixedTeamMemberRegistry
          -> MixedAgentMemberHandle(A)
              -> AgentRunManager.createAgentRun(runtimeKind=CODEX_APP_SERVER)
                  -> Codex AgentRun backend
          -> MixedAgentMemberHandle(B)
              -> AgentRunManager.createAgentRun(runtimeKind=CLAUDE_AGENT_SDK)
                  -> Claude AgentRun backend
```

If a member is configured with an unsupported runtime kind, the failure happens at `AgentRunManager.resolveBackendFactory(...)` / `createAgentRun(...)`. If the runtime is supported but semantically wrong for the intended member, mixed will faithfully create that runtime; semantic correctness belongs to team definition/member config validation, not a separate team manager.

### Updated conclusion

Specialized Codex/Claude/AutoByteus **team** managers are not dependencies of the mixed path. They remain needed only because current launch/restore selection still routes homogeneous teams to them. Once planner/restore/run-manager selection is changed to always use `TeamBackendKind.MIXED`, those specialized team managers become unreachable legacy code and should be removed in the clean target.

A staged implementation can first route all teams through mixed and validate parity, then delete specialized team backends. But steady state should not keep inactive managers, because they preserve old runtime-homogeneity architecture and invite drift.

## AutoByteus Mixed Member System-Prompt Construction Analysis (2026-06-06)

User asked how a team member's system prompt is constructed when the member runtime is `AUTOBYTEUS` under the mixed team path, because the old native AutoByteus team runtime had its own agent-config preparation step that knew the team members.

### Sources inspected

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | `MixedAgentMemberHandle.buildMemberRunConfig()` builds a server `MemberTeamContext` for each member, sets `teamBackendKind: TeamBackendKind.MIXED`, then passes that context into `new AgentRunConfig({ runtimeKind: member.runtimeKind, memberTeamContext, ... })`. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | Builds the runtime-neutral team/member context: team name, team instruction, current member identity, roster descriptors, communication recipients, allowed recipient names, `sendMessageToEnabled`, parent-boundary context, task-agent identity, and the inter-agent delivery callback. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | For `AUTOBYTEUS` agent runs, the base system prompt is `AgentDefinition.instructions` with `AgentDefinition.description` fallback. If `memberTeamContext` exists, the factory injects `TeamManifestInjectorProcessor` and puts `teamContext: buildAutoByteusStandaloneTeamContext(memberTeamContext)` into `AgentConfig.initialCustomData`. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | Converts the server `MemberTeamContext` into a native-compatible standalone `teamContext` object containing current member identity, roster, task-agent ids, coordinator route, and a `communicationContext` bridge whose dispatch calls server mixed inter-agent delivery. |
| `autobyteus-ts/src/agent-team/system-prompt-processor/team-manifest-injector-processor.ts` | The processor reads `context.customData.teamContext.communicationContext`, generates a simple team manifest, replaces `{{team}}` if present, otherwise appends a `## Team Manifest` section. It does not inject the server `teamInstruction`, current member identity, allowed-recipient instructions, or task-delegation protocol. |
| `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` and `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | Native AutoByteus agents process the base system prompt through the configured `systemPromptProcessors`; the final processed prompt is configured on the LLM instance. `TeamManifestInjectorProcessor` order is 450, before normal tool/skill manifest processors. |
| `autobyteus-ts/src/agent-team/bootstrap-steps/agent-configuration-preparation-step.ts` | Old native team bootstrap also attached `TeamManifestInjectorProcessor` and wrote `createScopedNativeTeamContext(...)` into `initialCustomData.teamContext`, but it sourced that context from native `AgentTeamContext`/`TeamManager` instead of server `MemberTeamContext`. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` plus Codex/Claude uses | Codex and Claude team-member paths use `composeMemberRunInstructions(...)` to inject team instruction, agent instruction, current member name, send-message recipient guidance, roster, and task-delegation protocol. No current AutoByteus path uses this composer. |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | Native `send_message_to` resolves `context.customData.teamContext.communicationContext` and dispatches an `InterAgentMessageRequestEvent`; the mixed standalone AutoByteus context provides this compatible communication bridge. |

### Current construction path for an AutoByteus member under mixed

```text
TeamRun / MixedTeamManager
  -> MixedTeamMemberRegistry
      -> MixedAgentMemberHandle(member runtimeKind = AUTOBYTEUS)
          -> MemberTeamContextBuilder.build(...)
              produces server MemberTeamContext
          -> AgentRunConfig(memberTeamContext, runtimeKind=AUTOBYTEUS)
          -> AgentRunManager.createAgentRun(...)
              -> AutoByteusAgentRunBackendFactory.buildAgentConfig(...)
                  base prompt = AgentDefinition.instructions || AgentDefinition.description
                  add TeamManifestInjectorProcessor if missing
                  initialCustomData.teamContext = buildAutoByteusStandaloneTeamContext(MemberTeamContext)
              -> autobyteus-ts Agent bootstrap
                  -> SystemPromptProcessingStep
                      -> TeamManifestInjectorProcessor appends/replaces team manifest
```

### Parity assessment

The mixed path does preserve the essential runtime bridge needed by the native AutoByteus agent:

- the AutoByteus member receives a native-compatible `teamContext` in `AgentConfig.initialCustomData`;
- the native `send_message_to` tool can dispatch through that `teamContext.communicationContext` back to server mixed delivery;
- incoming inter-agent messages can resolve sender run ids to teammate names through the mapped communication context;
- the old native team bootstrap and the mixed AutoByteus path both rely on `TeamManifestInjectorProcessor` for prompt-level team-member visibility.

However, the current mixed AutoByteus prompt construction is **not fully equivalent to Codex/Claude mixed members**. Codex and Claude use the server `MemberRunInstructionComposer`, while AutoByteus only adds the native `TeamManifestInjectorProcessor`. Therefore, on current code, an AutoByteus mixed member receives its agent definition prompt plus a simple team manifest, but not necessarily:

- the team definition's `instructions` as an explicit `Team Instruction` section;
- a clear `Current team member: <memberName>` runtime instruction;
- the richer allowed-recipient roster rendered by server `MemberCommunicationRosterBuilder`;
- explicit `send_message_to` usage rules from `MemberRunInstructionComposer`;
- server task-delegation protocol instructions, even when task-delegation tools are available.

### Additional prompt correctness risks

1. `TeamManifestInjectorProcessor` excludes the current member by comparing roster `member.memberName` with `context.config.name`. In the mixed AutoByteus path, `context.config.name` comes from `AgentDefinition.name`, not necessarily the team member's configured `memberName`. If those names differ, the prompt may include the current member as a teammate. This may also have existed in the old native path when node names differed from agent config names, but it is still a parity risk for mixed-only execution.
2. The standalone AutoByteus `teamContext` is intentionally slimmer than old native `createScopedNativeTeamContext(...)`: it contains server identity and communication bridge data, but not native `AgentTeamContext.config`, native team state, or a native `teamManager`. That is acceptable for mixed-only server execution only if active native tools/processors no longer require native team config/state/teamManager.
3. The current AutoByteus mixed tool filter still contains old task-plan tool names as a guard (`LEGACY_LOCAL_TASK_TOOL_NAMES`) despite user preference to remove permanent legacy references. This is a cleanup item separate from prompt composition, but it intersects with runtime instructions if task delegation is documented.

### Design implication

The mixed-only design should not recreate the old native AutoByteus team bootstrap. Instead, it should make AutoByteus member prompt construction consume the same server `MemberTeamContext` semantics as Codex/Claude. The clean target is:

```text
server MemberTeamContext
  -> runtime-neutral member instruction composition
      -> AutoByteus system prompt processor / prompt composition adapter
          -> native AgentConfig.systemPrompt + processors
```

This keeps the single team spine (`TeamRun -> MixedTeamManager -> AgentRun`) while preserving team prompt parity for native AutoByteus members.

## AutoByteus Prompt Refactor Recommendation (2026-06-06)

The AutoByteus issue should be handled as a small server-side member-prompt refactor, not as a reason to keep native AutoByteus team execution.

Recommended target shape:

1. Keep `buildAutoByteusStandaloneTeamContext(...)` because native AutoByteus tools still need `initialCustomData.teamContext` for `send_message_to`, task-delegation tool context, and sender-name resolution.
2. Add an AutoByteus-specific server prompt composition adapter near the AutoByteus agent-run backend, for example under `autobyteus-server-ts/src/agent-execution/backends/autobyteus/`.
3. That adapter should call shared `composeMemberRunInstructions(...)` with:
   - `teamInstruction: memberTeamContext.teamInstruction`
   - `agentInstruction: AgentDefinition.instructions || AgentDefinition.description`
   - `memberTeamContext`
   - `sendMessageToEnabled` derived from configured/resolved tool exposure plus `memberTeamContext.sendMessageToEnabled`
   - `taskDelegationEnabled` derived from configured/resolved task-delegation tool exposure
4. Because AutoByteus has one native system prompt channel rather than Codex-style base/developer split, render the composition into one markdown prompt with sections such as `Team Instruction`, `Agent Instruction`, and `Runtime Instruction`.
5. For mixed AutoByteus members, do not also append the old `TeamManifestInjectorProcessor` if the new runtime instruction already renders the server roster; otherwise the prompt can duplicate/conflict with roster instructions.
6. Fix current-member exclusion by using `MemberTeamContext.memberRouteKey`/`memberName` in the server-rendered roster rather than relying on `AgentConfig.name`.

This is a bounded parity refactor inside the AutoByteus `AgentRun` backend. It preserves the intended architecture:

```text
TeamRun
  -> MixedTeamManager
      -> AgentRunManager
          -> AutoByteusAgentRunBackendFactory
              -> server-composed member prompt + native-compatible teamContext
```

It avoids reintroducing native `AgentTeam` bootstrap, while making AutoByteus prompt behavior align with Codex and Claude mixed members.

## User Design-Review Decision: Native autobyteus-ts Agent-Team Package Stays For This Ticket (2026-06-06)

User reviewed the design direction and agreed that this ticket does not need to remove the entire exported native package surface under `autobyteus-ts/src/agent-team/**` first.

Decision recorded:

- In scope: server mixed-only execution cutover and AutoByteus member prompt/context parity refactor.
- In scope: active server execution must not instantiate native `AgentTeam`, native team manager, or native team bootstrap.
- Out of scope for this ticket: deleting the full native `autobyteus-ts/src/agent-team/**` package surface and its package-local tests/utilities.
- Follow-up cleanup candidate: decommission or relocate native package utilities after server execution no longer depends on native team runtime and after still-used helpers such as team-local definition-id utilities are migrated if desired.

## User Design-Review Decision: No `{{team}}` Placeholder For Server AutoByteus Team Prompts (2026-06-06)

User confirmed that server-managed AutoByteus team prompts do not need to preserve or rely on `{{team}}` placeholder replacement. This aligns with Codex/Claude server team-member prompt construction, where team semantics are rendered as explicit instruction sections/runtime instructions rather than placeholder substitution.

Decision recorded:

- In scope: AutoByteus mixed member prompt construction should use explicit rendered sections from server `MemberRunInstructionComposer`.
- Out of scope: preserving `{{team}}` placeholder behavior for server-managed AutoByteus team members.
- Remaining native package behavior may keep `TeamManifestInjectorProcessor` if native `autobyteus-ts/src/agent-team` remains for now, but the server AutoByteus member path must not depend on it.


## User Approval For Architecture Review Handoff (2026-06-06)

User reviewed the architecture design and approved sending it to `architecture_reviewer`. The approved scope remains:

- server mixed-only team execution via `TeamRun -> MixedTeamManager -> AgentRunManager`;
- remove specialized server team backends after parity validation;
- refactor AutoByteus member prompt/context parity inside the AutoByteus `AgentRun` path;
- do not delete the full `autobyteus-ts/src/agent-team/**` package surface in this ticket; keep that as a later cleanup;
- use explicit AutoByteus server-managed team prompt sections, not `{{team}}` placeholder replacement.
