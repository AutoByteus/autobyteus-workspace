# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Enable the backend mixed team manager to execute nested agent-team members as real runtime team members, not merely flattened leaf agents. A mixed team should be able to contain a member whose referenced definition is another agent team, so higher-level teams can model departments, review squads, or organization-like structures while the mixed manager remains the preferred superset path for AutoByteus, Codex, and Claude Code runtimes.

## Investigation Findings

- Agent-team definitions already support nested team references: `TeamMember.refType` can be `"agent"` or `"agent_team"` and nested team members are validated to omit `refScope`.
- Current backend run launch partially supports nested definitions by flattening them to leaf agent members. `TeamDefinitionTraversalService.collectLeafAgentMembers()` recursively expands `agent_team` nodes and `TeamRunService.buildMemberConfigsFromLaunchPreset()` creates configs only for those leaf agents.
- Current mixed runtime is flat. `MixedTeamMemberContext` stores only agent-oriented fields (`runtimeKind`, `platformAgentRunId`) and `MixedTeamManager.ensureMemberReady()` always creates/restores an `AgentRun` through `AgentRunManager`.
- Current metadata and restore models are also flat-agent oriented: every `TeamRunMemberMetadata` has `runtimeKind`, `platformAgentRunId`, `agentDefinitionId`, model/config fields, and no `memberKind`, child team definition, child team run ID, or recursive members.
- AutoByteus-ts provides the desired shape: `TeamNodeConfig` can wrap either `AgentConfig` or `AgentTeamConfig`; `TeamManager.ensureNodeIsReady()` lazily creates subteams, starts them, bridges events, and shutdown includes subteam stop handling.
- The server AutoByteus backend already builds real nested `AgentTeamConfig` objects for AutoByteus-native runs and converts native `SUB_TEAM` events into server `TeamRunEvent`s with subteam attribution. The mixed backend does not have the equivalent executable member-handle abstraction yet.
- The existing GraphQL/team-definition API can express nested team definitions, but the team-run launch input still describes leaf agent configs. For nested mixed execution, the internal launch/run configuration must become a tree or carry an explicit topology; otherwise subteam boundaries are lost.
- Current WebSocket command payloads and tool-approval routing are bare-name/agent-id oriented (`target_member_name`, `target_agent_name`, `agent_name`, `agent_id`). Nested mixed execution needs path/route selectors in command payloads and must emit those selectors in approval-request events.
- Current `TeamRunEvent` has optional `subTeamNodeName`. The refined design uses `sourcePath` as the canonical domain identity for runtime-sourced events; any one-name subteam display field is derived at transport/projection edges only.
- Verification command attempted in the dedicated worktree failed before tests ran because that worktree has no installed `node_modules`/`tsc` binaries.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Larger Requirement
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Mixed manager directly owns agent-only maps, agent-only runtime creation, agent-only events, and flat member metadata. Adding subteams by patching conditionals into those paths would mix agent and team lifecycle concerns without an explicit member-runtime boundary.
- Requirement or scope impact: The design must introduce a member runtime abstraction and recursive mixed-team topology before adding nested execution; it should not only add another branch to `ensureMemberReady()`.

## Recommendations

- Implement nested-team execution in the mixed backend, not in the single-runtime Codex/Claude/AutoByteus managers.
- Treat any newly launched definition containing `agent_team` nodes as a mixed backend run so the mixed manager becomes the authoritative nested-team path; do not preserve flattening semantics for new nested launches.
- Replace flat leaf-only internal run configuration for mixed nested runs with a recursive member topology that distinguishes `agent` and `agent_team` members.
- Require stable path-based identity for nested members: `memberPath` plus normalized slash-delimited `memberRouteKey`; do not rely on globally unique leaf `memberName`.
- Make `MixedTeamManager` own live member lifecycle through a `MixedTeamMemberHandle` boundary with agent and subteam handle implementations; reserve `TeamMemberNode` for tree/data representation.
- Persist nested topology and runtime IDs recursively so restore does not flatten or lose department/team boundaries.
- Reuse the existing `TeamRun`/`TeamRunBackend` surface for subteam member handles where possible, but create it through a mixed-owned subteam factory so subteams stay internal members of the parent unless explicitly launched as top-level runs.
- Make `sourcePath` the single canonical event-source identity in the team-run domain. Derive legacy/display fields such as `sub_team_node_name` only in WebSocket/GraphQL/projection mappers.
- Store run metadata in the canonical recursive `TeamRunMetadata` shape with no `V2` type name and no `runVersion` field; its `memberTree` should be typed as `TeamRunMemberMetadata[]` rather than `TeamRunMemberMetadataNode[]`. Legacy flat metadata must never be guessed back into nested topology and should fail restore with an explicit unsupported legacy-metadata/topology-lost error.
- Extend command payloads and tool-approval payloads with route/path selectors so nested leaf operations never depend on ambiguous bare member names.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

This crosses team-definition traversal, team-run launch config shape, backend selection, mixed member lifecycle, inter-member routing, event propagation, metadata/restore, and validation tests.

## In-Scope Use Cases

- UC-001: Create/run a mixed team whose top-level member is a nested `agent_team` definition.
- UC-002: Send a user message to a subteam member and have the subteam route it to its coordinator by default.
- UC-003: A parent team agent can use team communication to send a message to a subteam member by top-level subteam name.
- UC-004: The nested subteam can internally coordinate among its own agents through the same mixed-team runtime rules.
- UC-005: Parent team streams include nested agent/team/task-plan events with unambiguous subteam path attribution.
- UC-006: Interrupt, terminate, and restore a parent mixed run without orphaning or losing nested subteam runtime state.
- UC-007: Validate and reject circular nested team definitions and ambiguous/duplicate member route identities.

## Out of Scope

- Deprecating or deleting the AutoByteus, Codex, or Claude team managers in this change.
- Direct child-to-parent or arbitrary cross-level leaf-to-leaf messaging that bypasses the addressed subteam boundary.
- Full frontend UX redesign for visualizing arbitrary organization trees, beyond maintaining backend payloads needed by existing stream/projection surfaces.
- Reworking task-plan semantics across nested mixed teams beyond event propagation and independent child team context.
- Running live external-provider E2E tests as part of this design stage.

## Functional Requirements

- REQ-001: The mixed backend MUST preserve executable nested team nodes from `AgentTeamDefinition.nodes` where `refType === "agent_team"` instead of flattening them into only leaf agent members.
- REQ-002: Mixed run topology MUST distinguish agent members from subteam members with a clear discriminant and owner-specific fields; agent-only fields MUST NOT be required on subteam members.
- REQ-003: Nested member identity MUST be path-based and stable. Each team member node/handle MUST carry `memberPath` and normalized `memberRouteKey`; direct member lookup by bare `memberName` is allowed only for top-level members or when unambiguous within the relevant team boundary.
- REQ-004: Launch planning MUST map runtime/model/workspace/tool settings to every leaf agent while preserving the top-level and recursive subteam boundaries.
- REQ-005: The backend selection path MUST choose the mixed backend for newly launched team runs whose definition contains nested `agent_team` nodes, even if all leaf agents use one runtime kind; those new nested launches MUST NOT preserve the old flatten-to-leaves execution semantics.
- REQ-006: `MixedTeamManager` MUST lazily create/restore both agent member handles and subteam member handles through one authoritative member-runtime lifecycle boundary.
- REQ-007: Posting to a subteam member MUST dispatch the message to that child team run with its default/coordinator target, not to an arbitrary flattened leaf chosen by the parent.
- REQ-008: Parent-to-subteam inter-agent delivery MUST route through the subteam member boundary and publish a delivery/communication event whose canonical source identity is `sourcePath`; internal subteam routing remains owned by the child team manager.
- REQ-009: Events emitted by nested subteams MUST be rebroadcast to the parent stream with unambiguous canonical `sourcePath` attribution and must preserve the actual leaf agent/team event payloads; `subTeamNodeName` or similar one-name fields MUST be treated only as derived transport/display aliases.
- REQ-010: Interrupt and terminate MUST cascade to all active agent and subteam member handles and clear event subscriptions without orphaning child runs.
- REQ-011: Run metadata and restore context MUST persist recursive mixed topology, parent-owned internal child team run IDs, leaf platform run IDs, and route/path identity so restore reconstructs the same nested runtime graph without registering child teams as independent top-level history runs.
- REQ-012: Validation MUST reject missing referenced teams, circular team references, coordinator nodes that resolve to non-agent member handles, duplicate route keys in a team boundary, and launch configs that cannot be matched to required leaf agents.
- REQ-013: Existing AutoByteus-ts nested-team behavior SHOULD be used as the implementation reference for lazy subteam creation, event bridging, and shutdown sequencing, adapted to server `TeamRun` abstractions.
- REQ-014: `TeamRunEvent` domain identity MUST use `sourcePath` as the canonical runtime-source field. Derived route keys, display names, or legacy fields may be emitted by transport/projection mappers but MUST NOT become independent domain identity.
- REQ-015: GraphQL, WebSocket, and tool-approval command paths MUST accept path/route selectors (`memberPath` or `memberRouteKey`, with bare `memberName` limited to top-level or unambiguous team-boundary use) and emitted tool-approval request events MUST include enough source path/route data to approve the exact nested leaf.
- REQ-016: Metadata restore MUST read the canonical recursive `TeamRunMetadata` shape with no `V2` type name and no `runVersion` field. Legacy flat metadata MUST NOT be inflated into nested teams and MUST fail restore with an explicit unsupported legacy-metadata/topology-lost error.
- REQ-017: Naming MUST distinguish tree/data nodes from live command/lifecycle adapters: `TeamMemberNode` or `TeamMemberTreeNode` for frontend/definition topology, and `MixedTeamMemberHandle` for backend mixed live member adapters. The design MUST NOT introduce `TeamRuntimeNode`.
- REQ-018: The implementation MUST NOT keep backward-compatibility code paths for previous flat team metadata. There must be no migration, fallback, dual schema, topology guessing, or recovery path for historical flat `TeamRunMetadata`; unsupported historical metadata must fail fast with a clear error.
- REQ-019: `TeamMemberSelector` MUST be the authoritative public/domain command identity across `TeamRun`, `TeamRunBackend`, `TeamManager`, and mixed manager command methods. Raw string targets MUST exist only at transport or other edge adapters and MUST be normalized into a selector before entering the domain/backend command chain.
- REQ-020: `TeamRunMetadataStore` MUST validate and persist the canonical recursive `TeamRunMetadata.memberTree` schema, remove support for `runVersion`/flat `memberMetadata`, and throw/report explicit unsupported legacy-metadata/topology-lost errors for historical flat metadata instead of returning generic missing/invalid metadata. Derived flat views MUST be produced only by a projection flattener, not by the store schema.
- REQ-021: Team communication descriptors, delivery requests, events, and projections MUST be member-kind-aware and path-aware so a parent agent can address a subteam member as a recipient while the child team coordinator processes the message internally. Subteam communication projection MUST NOT pretend the subteam is an agent runtime.

## Acceptance Criteria

- AC-001: Given a root definition with top-level agent `Coordinator` and subteam member `CodeReviewTeam`, creating a team run selects `TeamBackendKind.MIXED` and stores top-level member handles for `Coordinator` and `CodeReviewTeam`.
- AC-002: Posting a user message to `CodeReviewTeam` creates/starts a child mixed team run and dispatches to that child team's coordinator without exposing the child coordinator as a top-level parent member.
- AC-003: A parent agent using `send_message_to` with recipient `CodeReviewTeam` results in an accepted operation, a parent-level communication event addressed to `CodeReviewTeam`, and child team processing by its coordinator.
- AC-004: Child team events appear on the parent team stream with canonical `sourcePath` such as `['CodeReviewTeam', 'ReviewLead']`; deeper nested events include the full source path, e.g. `['EngineeringDept', 'CodeReviewTeam', 'ReviewLead']`.
- AC-005: Child leaf agent events retain their leaf member identity within the event payload while also exposing canonical `sourcePath`; WebSocket/GraphQL may include derived `source_route_key` or legacy display aliases, but those are derived from `sourcePath`.
- AC-006: Restoring a parent mixed team run from recursive `TeamRunMetadata` after at least one agent member and one subteam member have runtime IDs recreates the recursive graph with previous IDs where supported; attempting to restore legacy flat metadata as nested topology is rejected with a clear unsupported legacy-metadata/topology-lost error.
- AC-007: Terminating a parent mixed run terminates all active child agent runs and child team runs, unsubscribes all event bridges, and removes active member handles.
- AC-008: A circular team definition A -> B -> A is rejected before runtime creation with a clear circular dependency error.
- AC-009: A nested definition with duplicate leaf names in different subteams is accepted only if route/path identity is unique; ambiguous bare-name targeting is rejected with a clear error.
- AC-010: Unit/integration tests cover topology planning, mixed manager agent/subteam member routing, nested event rebroadcast, metadata restore, and lifecycle cascade.
- AC-011: A nested leaf tool approval request emitted by `CodeReviewTeam/SecurityReviewer` includes enough path/route identity for WebSocket or GraphQL approval to approve exactly that leaf; approving by ambiguous bare `SecurityReviewer` is rejected.
- AC-012: Active/history run listings show the parent mixed run as the top-level run; child team runtime IDs are persisted inside parent recursive metadata and are not listed as separate top-level runs unless the child team definition was explicitly launched as its own run.
- AC-013: Public command tests prove `TeamRun.postMessage`, `TeamRunBackend.postMessage`, `TeamManager.postMessage`, and `approveToolInvocation` route by `TeamMemberSelector`/route key/path; duplicate nested leaf names cannot be targeted by ambiguous bare strings.
- AC-014: Metadata store tests prove canonical recursive `memberTree` metadata reads/writes, derived flattening for history/projection consumers, and fail-fast unsupported legacy-metadata/topology-lost behavior for old flat metadata containing `runVersion` or `memberMetadata`.
- AC-015: A parent communication event for `Coordinator -> CodeReviewTeam` records sender and receiver member kind/path/route identity in the parent team communication projection, while child coordinator processing appears separately through the child event bridge under `sourcePath: ['CodeReviewTeam', '<childCoordinator>']`.

## Constraints / Dependencies

- Current authoritative worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`.
- Base/finalization branch: `origin/personal` / `personal`.
- Existing team-definition API already supports `agent_team`; design should reuse it.
- Existing `TeamRun`, `TeamRunBackend`, and `TeamRunEvent` contracts should be strengthened rather than bypassed.
- Existing single-runtime team managers should not be expanded for nested execution in this change.
- The dedicated worktree currently lacks installed dependencies; validation commands requiring `tsc`/Vitest need environment setup before execution.

## Assumptions

- A subteam is an executable child team member with its own team manager/runtime boundary, not a static group label.
- Parent team agents address a subteam as one member; the child team decides how to handle the work internally.
- Child team members are not directly exposed as parent top-level members unless future product requirements add explicit cross-boundary addressing.
- Mixed manager is the long-term superset manager, but this change should not remove existing managers yet.

## Risks / Open Questions

- GraphQL/create-run inputs currently accept leaf-oriented member configs. Implementation should require path/route-keyed launch config matching for nested explicit launches while keeping bare names only for top-level/unambiguous cases.
- WebSocket/tool-approval payloads currently use bare names or agent IDs; nested approval requires emitted `sourcePath`/derived route identity and command selectors that can route to a nested leaf.
- Run history UX may need later updates to display tree topology instead of flat member lists, but top-level history should not be cluttered with internal child team runs.
- Application binding summaries currently collect leaf descriptors with team paths; those paths should align with the new mixed topology route keys.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-006 |
| REQ-003 | UC-001, UC-005, UC-007 |
| REQ-004 | UC-001, UC-004 |
| REQ-005 | UC-001 |
| REQ-006 | UC-002, UC-004, UC-006 |
| REQ-007 | UC-002 |
| REQ-008 | UC-003 |
| REQ-009 | UC-005 |
| REQ-010 | UC-006 |
| REQ-011 | UC-006 |
| REQ-012 | UC-007 |
| REQ-013 | UC-002, UC-005, UC-006 |
| REQ-014 | UC-005 |
| REQ-015 | UC-002, UC-003, UC-005, UC-007 |
| REQ-016 | UC-006 |
| REQ-017 | UC-001, UC-005, UC-007 |
| REQ-018 | UC-006 |
| REQ-019 | UC-002, UC-003, UC-007 |
| REQ-020 | UC-006 |
| REQ-021 | UC-003, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Backend selection and topology preservation for nested mixed launch. |
| AC-002 | User-to-subteam routing follows child team boundary/coordinator. |
| AC-003 | Parent agent-to-subteam communication is supported. |
| AC-004 | Parent stream preserves subteam path. |
| AC-005 | Leaf event identity remains visible under nested path. |
| AC-006 | Recursive restore works after active runtime IDs exist. |
| AC-007 | Lifecycle cascade prevents orphaned child runs. |
| AC-008 | Cycle prevention is enforced before runtime creation. |
| AC-009 | Path identity prevents duplicate leaf-name ambiguity. |
| AC-010 | Durable validation covers the new architecture. |
| AC-011 | Nested leaf tool approval has unambiguous path/route identity. |
| AC-012 | Child team run ownership stays internal to the parent run/history record. |
| AC-013 | Public command chain uses selector identity, not raw strings. |
| AC-014 | Metadata store and projection flattening own canonical schema/fail-fast legacy behavior. |
| AC-015 | Team communication projection supports subteam recipients without agent impersonation. |

## Approval Status

Scope inferred from the user's explicit investigation/design request. After review and user clarification, the requirements were refined to lock the design posture on mixed-only nested execution for new nested launches, parent-owned child runs, canonical `sourcePath`, canonical recursive `TeamRunMetadata` with no version suffix/field, and path-aware command/tool-approval payloads. Re-open only if the user wants a smaller discovery-only deliverable or a different API compatibility posture.
