# Flat AgentTeam Domain Simplification — Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Initial evidence captured; deeper architecture, persisted-data, and concurrent-branch investigation required`
- Investigation Goal: determine how to cleanly replace configured nested AgentTeam membership with flat AgentTeams under native AgentOrg without regressing flat-Team operation, canonical collaboration, task delegation, or required history.
- Scope Classification: `Large`
- Scope Classification Rationale: recursive configured-Team semantics cross definition, resolution, validation, launch, runtime, persistence, GraphQL, frontend, docs, and coverage.
- Scope Summary: definition/runtime/API/UI simplification with an AgentOrg prerequisite and a required distinction between configured nested membership and task-scoped delegated Team execution.
- Primary Questions To Resolve:
  1. What exact current production spines consume configured nested Team definitions?
  2. Which recursive structures are still required by task delegation?
  3. What data must be migrated, retained, rebuilt, or rejected?
  4. What AgentOrg capability must exist before removal?
  5. How should the concurrent dynamic-AgentTeam branch be reconciled?

## Request Context

The user observed that realistic organizations are naturally modeled as one AgentOrg containing independent Agents and flat AgentTeams such as Product Design, Software Engineering, Marketing, Sales, and Finance. Cross-team complexity is already expressible through natural-language handoff edges. A CEO can be an independent root Agent rather than a synthetic parent-Team coordinator, and the requirements engineer can be a direct Software Engineering Team member. The user therefore requested a separate ticket to investigate and implement simplification of nested configured AgentTeams.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-team-domain-simplification`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-team-domain-simplification/tickets/in-progress/flat-agent-team-domain-simplification`
- Current Branch: `codex/flat-agent-team-domain-simplification`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-team-domain-simplification`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-31; base resolved to `80e2bd195c42ea3ced778dbc051d4d00edaef16f` (`docs(delivery): record v1.4.63 hierarchy rollout`).
- Task Branch: `codex/flat-agent-team-domain-simplification`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: none.
- Notes For Downstream Agents: do not work in the shared checkout, which has unrelated local changes. Do not rebase or modify the separate `codex/dynamic-agent-team-runtime` worktree merely to advance this ticket. Reconcile that concurrent feature explicitly during investigation/design.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-team-domain-simplification/tickets/in-progress/flat-agent-team-domain-simplification/flat-agent-team-concept.md` | Domain concept and example scenarios | Flat Team versus AgentOrg boundary, example company, path addresses, configured-versus-task nesting distinction, sequencing | Requirements, future design spec | R-001–R-016 / AC-001–AC-016 | `Draft` | Intended-behavior supplement; user approval required | Align after deeper investigation and AgentOrg prerequisite decision. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-31 | Command | `git fetch origin personal`; `git worktree add -b codex/flat-agent-team-domain-simplification ... origin/personal` | Refresh base and create isolated ticket workspace | Worktree created at current `origin/personal` commit `80e2bd195`. | No |
| 2026-08-31 | Code | `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Verify definition contract | `TeamMember.refType` is `"agent" | "agent_team"`; `AgentTeamDefinition.nodes` is therefore recursive by reference. | Yes |
| 2026-08-31 | Code | `autobyteus-server-ts/src/agent-team-definition/services/team-definition-graph-resolver.ts` | Verify graph owner and coordinator rules | Resolver recursively resolves child definitions, prevents cycles, assigns absolute paths, validates scopes, and requires each Team coordinator to be one direct Agent. | Yes |
| 2026-08-31 | Code | `autobyteus-server-ts/src/agent-team-definition/services/team-handoff-compiler.ts` | Verify collaboration compilation | Compiler recursively visits configured child Teams, requires an Agent source, allows Agent or Team target, and compiles Team target to its coordinator. | Yes |
| 2026-08-31 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Verify launch path | Planner indexes all Team/Agent addresses recursively, requires launch settings per Team, and constructs nested TeamRun nodes. | Yes |
| 2026-08-31 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Verify runtime configuration model | `TeamRunAgentTeamNode.children` recursively contains Agent or Team nodes; cloning validates direct coordinators and canonical parent/child addresses. | Yes |
| 2026-08-31 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts` | Verify persisted runtime shapes | V2 configured execution tree recursively stores configured Team nodes; separate task execution unions also include nested task-Team execution. Subjects must not be conflated. | Yes |
| 2026-08-31 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | Verify public API | GraphQL registers `TeamMemberType.AGENT_TEAM` and maps it into the domain create/update contracts. | Yes |
| 2026-08-31 | Code / Docs | `rg -n "nested|AGENT_TEAM|teamConfigs" autobyteus-web ...`; `autobyteus-web/docs/agent_teams.md` | Identify frontend spread | Nested configured Teams are represented in authoring, detail, launch hierarchy, workspace/history rendering, localization, docs, and tests. | Yes |
| 2026-08-31 | Data | `applications/*/agent-teams/*/team-config.json` | Inspect repository-owned current application examples | Inspected Brief Studio and Socratic Math application teams are flat Agent-only Teams. This does not prove imported/server-data definitions are flat. | Yes |
| 2026-08-31 | Context | User brainstorming and provided organizational screenshot | Identify actual product-model pressure | Synthetic parent Team is being used as an organization container for one independent Agent plus several Teams; the forced Team coordinator is semantically unnatural. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Create/update/import an AgentTeam definition | GraphQL/file/package input -> definition provider/service -> scoped member resolution -> recursive graph validation -> catalog | A definition may include Agent or AgentTeam placements; graph cycles and invalid direct coordinators are rejected. | Domain models, graph resolver, GraphQL types |
| BEH-002 | User / System | Launch a configured AgentTeam | UI launch draft -> GraphQL launch input -> topology planner -> recursive TeamRunConfig -> root/mixed Team runtime -> V2 execution tree/history | Root and nested configured Teams receive Team scope/default configuration and lifecycle identity. | Topology planner, TeamRunConfig, execution-tree schema, frontend launch hierarchy |
| BEH-003 | Contract | Send a message or evaluate an Agent handoff inside a TeamRun | requesting Agent -> collaboration context/tool -> canonical recipient resolver/router -> exact Agent or Team coordinator -> recipient execution | Agent is the handoff source; Team target routes through its direct Agent coordinator using rooted addresses. | handoff compiler and collaboration/address services |
| BEH-004 | User | Create/edit/view/launch a Team containing child Teams | AgentTeam UI -> GraphQL definition contract -> catalog; launch configuration recursively renders Team scopes; workspace/history recursively projects member rows | Nested configured Teams are visible and configurable as first-class Team members. | frontend components, localization, docs, generated GraphQL |
| BEH-005 | User / Contract | Model multiple Teams and independent Agents before AgentOrg exists | synthetic root AgentTeam -> child Team references -> recursive launch/runtime | A company/department can be approximated, but the synthetic root must behave like a Team and declare a coordinator. | User scenario plus current recursive definition contract |
| BEH-006 | User / System | Restore history or delegate work to a Team | stored execution tree/task records -> run-history loaders/projections; task delegation -> task Team execution -> settlement/history | Configured nested Team nodes and task-scoped nested Team executions coexist in related recursive persistence models. | execution-tree schema and task-delegation subsystem file inventory |

## Design Health Assessment Evidence

- Change posture: `Refactor` / `Cleanup` / `Behavior Change`
- Candidate root cause classification: `Boundary Or Ownership Issue`
- Refactor posture evidence summary: recursive configured-Team composition is not isolated; it is a governing domain choice propagated across core paths. Native AgentOrg provides a more natural owner for organization composition, but removal must not erase valid Team behavior or task-scoped execution.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AgentTeamDefinition.nodes` | One Team definition may reference another Team definition. | AgentTeam owns both Team collaboration and organization composition. | Confirm target model with user. |
| Graph resolver/compiler/planner | Three core owners recursively traverse the same configured graph for different concerns. | Removing nesting is a cross-cutting contraction, not a local validation change. | Trace complete spines before design. |
| TeamRun models and V2 schema | Configured Team recursion is structurally embedded in runtime and persistence. | Persisted-data decision and removal sequencing are mandatory. | Inspect representative stored packages/readers. |
| Task execution unions | Task delegation creates nested Team execution independently of configured membership. | A blanket removal of recursive Team types would be incorrect. | Trace supported task-delegation spines. |
| Frontend/docs search | Nested Team semantics are user-visible in several surfaces. | UI/API/docs contraction must be part of the same product change or explicitly sequenced. | Inventory exact files and coverage. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Definition domain model | Mixed Agent/AgentTeam member reference. | Target contraction begins at the AgentTeam definition owner. |
| `autobyteus-server-ts/src/agent-team-definition/services/team-definition-graph-resolver.ts` | Resolves recursive Team definition graph and scopes | Recursion/cycle handling is configured-nesting-specific; Agent resolution remains needed. | Determine whether resolver becomes a flat definition resolver or is removed behind service validation. |
| `autobyteus-server-ts/src/agent-team-definition/services/team-handoff-compiler.ts` | Compiles local definitions into canonical handoffs | Recursive visit is nesting-specific; endpoint/rule validation remains reusable. | AgentOrg will need a separate composition compiler or shared tight primitives, not a generic mixed owner. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Builds launch configuration and identities | Recursively indexes Team scopes and constructs child Team nodes. | Flat Team planning can become one Team plus direct Agents; AgentOrg planning must remain separate. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Immutable current TeamRun launch aggregate | Recursive Team node union and per-Team scope defaults. | Split configured Team flattening from any task Team hierarchy. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts` | Durable TeamRun V2 shape | Both configured and task execution recursion exist. | Schema changes require subject-specific data analysis. |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | Definition query/mutation contract | Advertises `AGENT_TEAM` member kind. | Clean-cut API contraction required after replacement availability. |
| `autobyteus-web/components/agentTeams/**` | Team authoring/detail | Nested Team library/details/count/cycle UI exists. | Remove nested authoring while preserving Agent-only experience. |
| `autobyteus-web/utils/teamRunLaunchHierarchy.ts` and `components/workspace/config/TeamMemberConfigTree.vue` | Recursive launch authoring/projection | Team defaults and member config are hierarchy-aware. | Flat Team UI becomes simpler; future AgentOrg configuration must not be hidden inside Team UI. |
| `autobyteus-web/docs/agent_teams.md` | Durable AgentTeam documentation | Documents nested definitions, Team-scoped overrides, recursive workspace/history. | Documentation requires later integrated-state update. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/**` | Delegated Agent/Team task lifecycle | Can materialize task-scoped Team executions. | Preserve until evidence proves a specific piece is configured-nesting-only. |

## Runtime / Probe Findings

No runtime was started during bootstrap. The initial ticket records source-backed structure only. Downstream investigation should run representative flat configured-Team, nested configured-Team, and delegated-Team scenarios before finalizing removal and persisted-data decisions.

## External / Public Source Findings

None. This is a repository-native domain decision; no web research was required for bootstrap.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for bootstrap.
- Required config, feature flags, env vars, or accounts: none.
- External repos, samples, or artifacts cloned/downloaded: none.
- Setup command: isolated worktree creation from refreshed `origin/personal`.
- Cleanup notes: no temporary files outside the ticket worktree.

## Findings From Code / Docs / Data / Logs

1. The configured definition graph is genuinely recursive and protected by cycle and scope validation.
2. Every Team, including a configured child Team, must have exactly one direct Agent coordinator.
3. Natural-language handoffs already encode arbitrary collaboration relationships; containment depth is not required to express workflow depth.
4. Canonical addresses are valuable beyond nested configured Teams and should not be removed as part of flattening.
5. Current V2 TeamRun structures mix configured hierarchy and task-execution hierarchy in related types; design must inventory them separately.
6. Current application examples inspected in-repo are flat, but user/server-data and external package use remains unknown.
7. Removing nesting before AgentOrg exists would prevent the user's current composite scenario and violate capability preservation.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Team definition config files and server-data TeamRun V2 packages; representative nested data and volume not yet inspected.
- Relevant code-model, serialization, semantic, or physical-store change: remove configured child Team references/nodes and nested configured TeamRun scopes.
- Normal readers and writers, including unknown/extra-field behavior: file definition providers, GraphQL create/update, topology planner, TeamRun execution-tree store/loaders; detailed extra-field/rejection behavior still to trace.
- Representative direct-read or compatibility evidence: not yet available.
- Required semantics and invariants preserved by direct use: `Undetermined`.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: history and task records may be user-visible and cannot be assumed disposable.
- Concrete benefit, cost, and risk of migration if it remains a candidate: simplification benefit is significant; transformation may be complex because a nested TeamRun is not automatically equivalent to an AgentOrgRun until AgentOrg persistence/history exists.
- Existing migration framework or lifecycle constraints: repository contains app-data migration infrastructure and V1-to-V2 TeamRun migrations; inspect only after a transformation need is established.

## Constraints / Dependencies / Compatibility Facts

- Native AgentOrg must replace actual organization-composition use cases before nested configured-Team support disappears.
- The concurrent dynamic-AgentTeam ticket is based in another worktree/branch and must not be modified or rebased from this ticket without coordination.
- Clean-cut target policy rejects indefinite dual acceptance of nested and flat Team definitions.
- Historical data handling is not synonymous with runtime compatibility; an explicit migration or read-only history boundary may be appropriate only if supported by evidence and approved requirements.
- Task-scoped nested Team executions may remain valid even after configured AgentTeam membership becomes flat.

## Open Unknowns / Risks

- Representative persisted nested definition and TeamRun inventory is missing.
- Exact native AgentOrg runtime/persistence/API readiness and sequencing is unresolved.
- Concurrent dynamic-Team changes may alter the base and affected paths before implementation begins.
- Team-local child-Team ownership may carry packaging semantics not captured by the simple containment example.
- UI history rendering may need to retain historical nested rows even after current authoring becomes flat; this requires an explicit product/data decision.

## Notes For Architecture Reviewer

Not ready for architecture review. Requirements and concept supplement remain Draft; design is intentionally unstarted. The receiving team should first validate product scope with the user, refresh/reconcile the current base and concurrent dynamic-Team branch, inspect persisted data and task-delegation spines, then complete the target design.
