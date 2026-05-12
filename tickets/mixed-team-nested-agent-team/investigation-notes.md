# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Deep investigation complete; design refined after architecture-review pause/recheck.
- Investigation Goal: Determine current backend mixed team manager architecture, compare AutoByteus-ts nested team support, and produce a design for nested mixed-team members.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Nested team support crosses definition traversal, launch config shape, mixed member lifecycle, event aggregation, metadata/restore, backend selection, and validation.
- Scope Summary: Add true nested agent-team runtime support to the mixed manager; do not expand the other team managers except where backend selection must direct nested definitions to mixed.
- Primary Questions To Resolve:
  - What does the current backend mixed team manager own and where are member kinds defined?
  - Does the backend already have any nested-team primitives?
  - How does AutoByteus-ts represent and execute nested teams?
  - What model, runtime, event, and validation changes are needed for mixed nested team members?

## Request Context

The user believes the mixed team manager is already a superset of AutoByteus, Codex, and Claude Code team managers and wants to investigate supporting nested agent teams in the mixed manager. The user specifically mentioned AutoByteus-ts already supports nested agent teams and wants that implementation used for inspiration. The motivation is to simulate departments, companies, or organization-like structures where a member such as a code-review function may itself be a team.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team
- Current Branch: codex/mixed-team-nested-agent-team
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-12.
- Task Branch: codex/mixed-team-nested-agent-team
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts are in the dedicated task worktree, not the original shared checkout. Verification commands that require workspace dependencies currently fail in this fresh worktree because `node_modules`/`tsc` are not installed there.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-12 | Command | `git status --short --branch && git remote -v && git branch --show-current && git rev-parse --show-toplevel && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository context. | Original checkout was `personal`, remote default/head is `origin/personal`, repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`. | No |
| 2026-05-12 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task branch/worktree. | Completed successfully. | No |
| 2026-05-12 | Command | `git worktree add -b codex/mixed-team-nested-agent-team /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team origin/personal` | Create dedicated task worktree/branch. | Worktree created from `origin/personal` at commit `be56cab9`. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-definition/domain/models.ts:6-22` | Check whether team definitions already model nested members. | `TeamMember.refType` already supports `"agent" | "agent_team"`; `refScope` is retained only for agent refs. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts:50-63`, `:85-95` | Check definition validation. | Service validates that agent members include `refScope`, nested team members omit `refScope`, and coordinator name matches a direct node. It does not verify coordinator node type is an agent. | Yes: runtime/topology validation should enforce executable coordinator rules. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts:117-157`, `:241-264` | Confirm API can express nested team references. | GraphQL input exposes `TeamMemberInput.refType` with enum `AGENT`/`AGENT_TEAM`, so definition creation already accepts nested team references. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-traversal-service.ts:17-80`, `:83-119` | Understand current nested definition launch support. | Traversal recursively expands nested team definitions into leaf agent members and resolves leaf coordinator names; it detects circular references. | Yes: new design should preserve topology, not only leaf lists. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:81-102`, `:182-214` | Inspect launch/run creation flow. | Launch presets call `collectLeafAgentMembers()` and create only leaf `TeamMemberRunConfig`s; backend kind is selected from runtime kinds in that flat list. | Yes: nested topology planning must replace/augment flat launch planning. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts:6-20` | Inspect internal team member run config shape. | `TeamMemberRunConfig` is agent-only: it requires `agentDefinitionId`, model, skill mode, and `runtimeKind`. It cannot represent a subteam member. | Yes |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-context.ts:4-29` | Inspect mixed member handle state. | `MixedTeamMemberContext` is agent-oriented: `runtimeKind` plus `platformAgentRunId`; no member kind, child team definition, child run ID, or recursive members. | Yes |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts:48-79`, `:89-116` | Inspect mixed context construction. | Factory maps every `TeamMemberRunConfig` into a flat `MixedTeamMemberContext`; memory dirs and member run IDs are generated only for agent members. | Yes |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts:89-175`, `:216-245`, `:285-321`, `:392-428` | Inspect mixed execution owner. | Mixed manager resolves a member by top-level name, ensures an `AgentRun`, posts to that agent, builds `AgentRunConfig`, subscribes to `AgentRun` events, and publishes only `TeamRunEventSourceType.AGENT` events. | Yes |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts:4-35` | Inspect team event contract. | Team events support `AGENT`, `TEAM`, and `TASK_PLAN` plus optional `subTeamNodeName`; no recursive path or explicit subteam source payload. | Yes |
| 2026-05-12 | Code | `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts:5-18` and `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts:28-75`, `:95-138` | Inspect metadata/restore model. | Metadata is flat and agent-oriented: each member has runtime/model/platform-agent fields. Restore rebuilds flat member configs and context from those rows. | Yes |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts:312-388` | Inspect server AutoByteus backend nested implementation. | AutoByteus backend recursively builds `AgentTeamConfig` for `agent_team` refs, aliases subteam config by parent member name, detects cycles, and rejects a team coordinator that is itself a team. | No; use as reference. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts:300-373` | Inspect nested event translation. | Server AutoByteus backend recursively translates native `SUB_TEAM` stream events to parent `TeamRunEvent`s and carries `subTeamNodeName`. | Yes: mixed should add path-based equivalent. |
| 2026-05-12 | Doc | `autobyteus-ts/docs/agent_team_design.md` | Understand intended AutoByteus-ts team architecture. | Documentation states teams are graphs of agents/subteams; `TeamManager` owns node lifecycle/routing, lazy creation, event bridging, and clean shutdown. | No |
| 2026-05-12 | Code | `autobyteus-ts/src/agent-team/context/team-node-config.ts:1-33`, `autobyteus-ts/src/agent-team/agent-team-builder.ts:1-79` | Inspect AutoByteus-ts team config model. | Team nodes wrap either `AgentConfig` or `AgentTeamConfig`; builder provides `addSubTeamNode()`. | No |
| 2026-05-12 | Code | `autobyteus-ts/src/agent-team/context/team-manager.ts:39-125` | Inspect AutoByteus-ts nested runtime lifecycle. | Native `TeamManager.ensureNodeIsReady()` lazily creates subteams through `AgentTeamFactory`, starts them, waits for idle, caches them, and bridges team events. | No; use as reference. |
| 2026-05-12 | Code | `autobyteus-ts/src/agent-team/handlers/process-user-message-event-handler.ts:39-50`, `autobyteus-ts/src/agent-team/handlers/inter-agent-message-request-event-handler.ts:54-89` | Inspect native routing to subteams. | Native handlers post user/inter-agent messages to subteam `postMessage()` when the target node is a team, and to agent methods when target node is an agent. | No; use as reference. |
| 2026-05-12 | Code | `autobyteus-ts/src/agent-team/streaming/agent-event-multiplexer.ts:47-64`, `autobyteus-ts/src/agent-team/streaming/team-event-bridge.ts:40-64` | Inspect native subteam event bridging. | Multiplexer starts a `TeamEventBridge` for subteams; bridge reads child `AgentTeamEventStream` and publishes parent `SUB_TEAM` events. | No; use as reference. |
| 2026-05-12 | Code | `autobyteus-ts/src/agent-team/shutdown-steps/sub-team-shutdown-step.ts:16-26` | Inspect native subteam shutdown. | Shutdown enumerates active subteams from the team manager and stops them. | No; use as reference. |
| 2026-05-12 | Code | `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts:230-360` | Check current backend tests for nested launch. | Tests assert nested definitions are flattened to leaf configs for AutoByteus, Codex, and Claude; this confirms current behavior is flattening rather than runtime subteams. | Yes: update tests for mixed nested behavior. |
| 2026-05-12 | Code | `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts:718-960`, `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts:994-1220` | Check current live nested e2e semantics. | Existing Codex/Claude nested tests pass leaf configs for parent and specialist; parent sends directly to leaf `specialist`, not to subteam node, proving flat execution semantics. | Yes: new mixed tests should target top-level subteam member. |
| 2026-05-12 | Command | `pnpm -C autobyteus-server-ts test --run tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts` | Attempt focused validation of current related tests. | Failed during `pretest` before tests ran: `autobyteus-ts build: sh: tsc: command not found` and warnings that local `node_modules` is missing in the dedicated worktree. | Yes: implementation/validation agents must install/link dependencies or run in prepared environment. |
| 2026-05-12 | Command | `ls -la node_modules autobyteus-server-ts/node_modules 2>/dev/null || true; pnpm -C autobyteus-server-ts exec tsc --version || true` | Confirm cause of validation failure. | No `node_modules` displayed; `pnpm exec tsc` reports command not found. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Team run creation enters through `TeamRunService.createTeamRun()` from GraphQL/application/external-channel launch flows.
- Current execution flow:
  1. Team definitions can contain nested `agent_team` nodes.
  2. Launch preset flow calls `TeamDefinitionTraversalService.collectLeafAgentMembers()` and returns only leaf agent configs.
  3. `TeamRunService.createTeamRun()` normalizes those flat leaf configs and chooses backend kind by leaf runtime kinds.
  4. For heterogeneous leaf runtimes, `AgentTeamRunManager` chooses `MixedTeamRunBackendFactory`.
  5. The mixed factory creates a flat `MixedTeamRunContext.memberContexts` list.
  6. `MixedTeamManager` lazily creates/restores `AgentRun`s only; target member lookup is by flat member name.
  7. Agent events are rebroadcast as parent team AGENT events; status is derived from active agent runs only.
- Ownership or boundary observations:
  - `AgentTeamDefinitionService` owns definition CRUD validation but not executable topology planning.
  - `TeamDefinitionTraversalService` currently owns leaf flattening, which is incompatible with preserving nested runtime boundaries.
  - `MixedTeamManager` is the runtime lifecycle/routing owner for mixed teams, but its internal member boundary is implicitly “agent run,” not “member handle.”
  - `TeamRunMetadataMapper` owns persistence/restore projection but only for flat agent members.
- Current behavior summary: The backend already knows about nested definitions, and AutoByteus-native execution can create real subteam nodes, but mixed execution currently treats all members as flat leaf agents.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Larger Requirement
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness
- Refactor posture evidence summary: Refactor needed now. The current model cannot represent a subteam member without overloading agent fields or adding mixed-level conditionals around `AgentRun` maps. A member-runtime abstraction and recursive topology/metadata model are required.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamMemberRunConfig` | Requires agent-only fields (`agentDefinitionId`, model, runtimeKind). | Shared structure is too loose/wrong for subteams; needs discriminated union or separate config types. | Yes |
| `MixedTeamManager.ensureMemberReady()` | Always creates/restores `AgentRun`. | Member-handle boundary is incorrectly agent-only. | Yes |
| `MixedTeamMemberContext` | Stores `platformAgentRunId`; no child run ID or member kind. | Restore/event state cannot represent team members. | Yes |
| `TeamRunMetadata` | Flat `memberMetadata` rows assume every member is an agent. | Restore/history would lose nested topology. | Yes |
| AutoByteus-ts `TeamManager` | Native runtime cleanly handles `Agent | AgentTeam` as managed nodes. | Mixed should mimic this at server `AgentRun | TeamRun` boundary. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Team definition domain model. | Already permits `refType: "agent_team"`. | Reuse; no new definition model needed for basic nesting. |
| `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | Definition CRUD validation. | Validates direct coordinator name exists, not that coordinator is executable agent. | Add topology/runtime validation outside or extend validation. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-traversal-service.ts` | Recursive definition traversal. | Currently returns leaf agents only. | Replace/extend with topology builder preserving subteam nodes. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Public create/restore orchestration and metadata write. | Uses flat member config list and backend-kind resolution from flat runtimes. | Must use topology planning and choose mixed for nested definitions. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Internal run config model. | Agent-only member config. | Needs discriminated agent/subteam run config shape. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-context.ts` | Mixed runtime context. | Agent-only member context. | Needs member handle contexts for agent and subteam. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed lifecycle/routing/event owner. | Flat `Map<string, AgentRun>`; creates `AgentRun` only. | Must own member handles for agent and subteam. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | Server team event contract. | Optional `subTeamNodeName` is insufficient for deep path. | Add path-based attribution. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | Team run metadata schema. | Flat agent rows only. | Needs recursive member metadata. |
| `autobyteus-ts/src/agent-team/context/team-manager.ts` | Native AutoByteus-ts node lifecycle/routing. | Provides direct reference for `Agent | AgentTeam` node abstraction. | Adapt pattern to server `AgentRun | TeamRun`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts` | Server AutoByteus team config hydration. | Already recursively hydrates nested definitions into native `AgentTeamConfig`. | Reuse ideas: recursion, cycle check, coordinator agent invariant. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-12 | Test | `pnpm -C autobyteus-server-ts test --run tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts` | Failed in pretest because `tsc` was not found and worktree dependencies were not installed. | Need setup before validation; no behavior-level test results were obtained. |
| 2026-05-12 | Probe | `pnpm -C autobyteus-server-ts exec tsc --version` | `Command "tsc" not found`. | Confirms dependency setup blocker. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: No internet/public external source was needed. The relevant reference implementation is the local `autobyteus-ts` package in this superrepo.
- Version / tag / commit / freshness: Dedicated worktree at `origin/personal` commit `be56cab9`.
- Relevant contract, behavior, or constraint learned: AutoByteus-ts docs/source define nested teams as managed executable team nodes and expose `SUB_TEAM` event rebroadcast.
- Why it matters: The requested design should mirror that proven architecture rather than invent a flat special case for mixed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation; future runtime validation will need mocked `AgentRunManager` and possibly provider-backed E2E for live Codex/Claude/AutoByteus paths.
- Required config, feature flags, env vars, or accounts: None for static investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree created.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Definitions are already recursive-capable.
2. Current team-run launch turns recursive definitions into a flat leaf-agent list.
3. The mixed backend is not a superset at runtime yet because it cannot manage a `TeamRun` member.
4. AutoByteus-ts already has the main pattern needed: `ManagedNode = Agent | AgentTeam`, lazy node creation, event bridge, and subteam shutdown.
5. Current server AutoByteus backend proves recursive definition hydration and subteam event conversion exist in the server, but only inside the AutoByteus-native backend.
6. A robust mixed design must introduce member kind/path identity and recursive metadata before implementation.

## Constraints / Dependencies / Compatibility Facts

- `normalizeMemberRouteKey()` already accepts slash-delimited paths and `buildTeamMemberRunId()` hashes the full route key, so path-based route keys are feasible.
- Existing GraphQL team definitions already have `AGENT_TEAM`; no new definition enum is required.
- Existing GraphQL team-run inputs are flat and leaf-agent oriented.
- Existing stream handler surfaces `sub_team_node_name` when present; deep nesting needs a path field to avoid ambiguity.
- Existing run history/projection features use `memberRouteKey`; path-based route keys must remain URI-safe through existing encode/decode paths.

## Open Unknowns / Risks

- Whether product wants nested child runs to appear as standalone run-history entries or only as recursive members under the parent run. The design recommendation is recursive parent-owned metadata to avoid top-level history clutter.
- Whether frontend launch forms can require path-based route keys for nested explicit configs immediately. If not, implementation may need a controlled migration, but the target architecture should remain path-first.
- Whether cross-level child-to-parent direct messaging is desired. Current AutoByteus-ts semantics route messages within the addressed team boundary; the design keeps that boundary.

## Notes For Architect Reviewer

- The key architecture decision is to make `MixedTeamManager` manage member handles (`AgentRun` or child `TeamRun`) rather than manage `AgentRun`s directly.
- The design should avoid a shortcut where nested definitions are “supported” by continuing to flatten leaves. That would not satisfy the user's company/department use case.
- If architecture review prefers smaller scope, the cut line should be a discovery-only outcome, not a partial implementation that overloads agent fields for subteams.


## Design Recheck Addendum (2026-05-12)

Architecture review paused and requested design-owner confirmation on backend selection, child-run ownership, metadata versioning, event identity, and command/tool-approval identity. Recheck findings:

| Date | Source Type | Exact Source / Command | Purpose | Observation | Design Impact? |
| --- | --- | --- | --- | --- | --- |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts:1-35` | Recheck event identity. | `TeamRunEvent` currently carries optional `subTeamNodeName` and no recursive path. | Yes: refined design makes `sourcePath` the canonical domain source identity and derives legacy/display aliases only at transport/projection edges. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:260-386`, `:446-480` | Recheck WebSocket send-message/tool-approval payloads. | WebSocket currently accepts `target_member_name`/`target_agent_name` for messages and `agent_name`/`target_member_name` or `agent_id` for approval; event conversion emits `agent_name`, `agent_id`, and optional `sub_team_node_name`. | Yes: nested operations require path/route selectors and approval request events that include the nested leaf `sourcePath`. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:53-86`, `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts:17-30` | Recheck command API shape. | `postMessage` and `approveToolInvocation` accept raw target member strings. | Yes: design should introduce/adapter-map to `TeamMemberSelector` rather than relying on bare names. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:80-166` | Recheck top-level run registration/history ownership. | `AgentTeamRunManager.createTeamRun/restoreTeamRun` registers active runs and attaches top-level team communication/file-change services. | Yes: child subteam member handles should not be created through this top-level registration path; use a mixed-owned child factory and parent metadata/event bridge. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts:24-138`, `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts:1-23` | Recheck metadata/restore. | Current metadata is flat and agent-only; restore chooses backend kind from flat member runtime kinds. | Yes: canonical recursive `TeamRunMetadata` is required. Legacy flat metadata must never be inferred as nested topology and should fail restore explicitly. |

Design-owner decisions after recheck:

1. New nested definitions should always route to `TeamBackendKind.MIXED`; old flattening must not remain a new nested execution mode.
2. Child team runs should be parent-owned internal member handles, persisted recursively in parent metadata, not registered/listed as separate top-level runs unless explicitly launched by the user.
3. Canonical recursive `TeamRunMetadata` is authoritative. Do not introduce a version-suffixed metadata type or `runVersion`; legacy flat metadata is rejected with an explicit unsupported legacy-metadata/topology-lost error and is never guessed into nested topology.
4. `sourcePath` is the only canonical domain event-source identity. Route keys and legacy/display fields are derived at edges.
5. GraphQL/WebSocket/tool approval must carry path/route selectors for nested operations and reject ambiguous bare-name approvals.


## No-Backward-Compatibility Storage Clarification (2026-05-12)

The user explicitly confirmed that historical flat team metadata should not be recovered, migrated, or compatibility-read after the canonical recursive `TeamRunMetadata` shape is introduced. The codebase should reflect the current model only. `TeamRunMetadataMapper` should therefore replace the old flat restore path with recursive metadata restore and fail fast for unsupported historical flat metadata, instead of adding migration, fallback, dual-schema, or topology-guessing code.


## Architecture Review Round 7 Design-Impact Rework Notes (2026-05-12)

The architecture reviewer completed a full pass and returned three Design Impact findings. Additional code boundaries checked for the rework:

| Date | Source Type | Exact Source / Command | Purpose | Observation | Design Impact? |
| --- | --- | --- | --- | --- | --- |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:53-86`, `backends/team-run-backend.ts:17-30`, `backends/team-manager.ts:1-24` | Verify command selector boundary. | Public/domain/backend command APIs still accept raw target member strings. | Yes: `TeamMemberSelector` must be threaded through the public command chain, not only mixed internals. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts:1-230` | Verify metadata persistence boundary. | Store validates/normalizes old `runVersion` + flat `memberMetadata` and returns `null` for invalid metadata. | Yes: store must validate canonical `memberTree`, remove old schema fields, and fail fast for unsupported historical metadata. |
| 2026-05-12 | Code | `grep -R "metadata.memberMetadata\|memberMetadata" autobyteus-server-ts/src/run-history autobyteus-server-ts/src/agent-team-execution autobyteus-server-ts/src/api` | Identify flat metadata consumers. | History index, history service, member projection, file-change projection, runtime context restore, and mapper read flat `memberMetadata`. | Yes: introduce a flattener-derived view over canonical `memberTree` and update concrete consumers. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts`, `services/member-team-context-builder.ts`, `domain/inter-agent-message-delivery.ts`, `services/inter-agent-message-router.ts`, `services/inter-agent-message-runtime-builders.ts` | Verify team communication shape. | Descriptors and delivery requests are agent/name/runtimeKind oriented. | Yes: descriptors and delivery must be member-kind/path/selector aware for subteam recipients. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/services/team-communication/team-communication-service.ts`, `team-communication-types.ts`, `team-communication-normalizer.ts` | Verify communication projection. | Projection consumes only agent-shaped events and sender/receiver agent fields. | Yes: projection must support sender/receiver participant identities with member kind/path/route. |

Design response added to `design-spec.md`:

1. `TeamMemberSelector` is now required across `TeamRun`, `TeamRunBackend`, and `TeamManager` command signatures; strings are edge adapters only.
2. `TeamRunMetadataStore` and `team-run-metadata-flattener.ts` are explicit owned files; concrete flat projection consumers are named.
3. Team communication has member-kind-aware descriptors, selector/path delivery request fields, canonical communication event payloads, and projection participant identities for subteam recipients.
