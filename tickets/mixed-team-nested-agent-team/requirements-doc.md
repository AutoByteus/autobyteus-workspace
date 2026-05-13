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
- Full-stack seeded browser validation on 2026-05-13 proved the backend nested runtime and recursive metadata work, but the frontend active workspace/run UI still flattens nested teams into leaf agents. The visible tree showed `program_manager`, `review_lead`, and `qa_specialist` directly under the parent team and omitted the `BuildSquad` `agent_team` node even though backend `memberTree` contained `BuildSquad` with child route keys `BuildSquad/review_lead` and `BuildSquad/qa_specialist`.
- Later full-stack validation on 2026-05-13 proved parent-to-subteam live communication projection now works, but exposed three remaining UI/projection defects: the live child coordinator transcript omits the inbound inter-agent prompt, opened child coordinator projections duplicate timestamped messages with `ts: null` copies, and active nested member rows use agent definition names while restored/history rows use member names. These defects require a focused event/projection/presentation invariant rather than ad hoc component fixes.
- Manual full-stack testing and follow-up requirements discussion on 2026-05-13 exposed the refined communication-boundary requirement: structural subteam nodes remain nested, but `send_message_to` visibility should expose subteam coordinators/representatives as addressable members. A parent member such as `program_manager` should see `review_lead` as the `BuildSquad` representative rather than the abstract `BuildSquad` node, and `BuildSquad/review_lead` should see both local child teammates such as `qa_specialist` and exposed immediate parent-boundary members such as `program_manager`. The design must not use a hidden `reply_to_sender` state/alias; direct visible recipient names are resolved through scoped recipient descriptors.

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
- Extend the frontend active team context, run-history tree, team members panel, grid, spotlight, launch config, streaming router, and communication/activity projections to preserve and render recursive `TeamMemberNode` trees. Leaf-agent lookup maps are allowed only as derived indexes for conversations/projections; they must not be the display source of truth.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

This crosses team-definition traversal, team-run launch config shape, backend selection, mixed member lifecycle, inter-member routing, event propagation, metadata/restore, and validation tests.

## In-Scope Use Cases

- UC-001: Create/run a mixed team whose top-level member is a nested `agent_team` definition.
- UC-002: Send a user message to a subteam member and have the subteam route it to its coordinator by default.
- UC-003: A parent team agent can use team communication to send a message to a subteam coordinator/representative by the representative member name exposed in the parent communication roster, while the runtime routes through the structural subteam boundary.
- UC-004: The nested subteam can internally coordinate among its own agents through the same mixed-team runtime rules.
- UC-005: Parent team streams include nested agent/team/task-plan events with unambiguous subteam path attribution.
- UC-006: Interrupt, terminate, and restore a parent mixed run without orphaning or losing nested subteam runtime state.
- UC-007: Validate and reject circular nested team definitions and ambiguous/duplicate member route identities.
- UC-008: Display active and historical nested team runs as recursive trees that include subteam nodes, not only flattened leaf agents.
- UC-009: Let users select/focus a subteam node as a team member and send work to that subteam boundary, while leaf-agent selection continues to show leaf conversations and projections.
- UC-010: Configure nested team launches from the frontend using canonical leaf route keys under expandable subteam groups.
- UC-011: During live and restored nested runs, show the same recipient-side child leaf conversation, without duplicate projection messages, and with one stable member-label policy across active and history views.
- UC-012: A nested child team coordinator can report upward to allowed immediate parent-boundary recipients by direct visible member name, especially the parent member that delegated work to the subteam.

## Out of Scope

- Deprecating or deleting the AutoByteus, Codex, or Claude team managers in this change.
- Arbitrary cross-level leaf-to-leaf messaging that bypasses team boundaries, including child-to-grandparent, child-to-sibling-internal-leaf, or unrelated-run messaging. Controlled child-to-immediate-parent-boundary reporting is now in scope.
- Arbitrary organization-chart/productivity-suite redesign beyond the minimum nested team tree, launch config, focus/grid/spotlight, history/restore, and activity/communication behavior required for this feature.
- Reworking task-plan semantics across nested mixed teams beyond event propagation and independent child team context.
- Running live external-provider E2E tests as part of this design stage.

## Functional Requirements

- REQ-001: The mixed backend MUST preserve executable nested team nodes from `AgentTeamDefinition.nodes` where `refType === "agent_team"` instead of flattening them into only leaf agent members.
- REQ-002: Mixed run topology MUST distinguish agent members from subteam members with a clear discriminant and owner-specific fields; agent-only fields MUST NOT be required on subteam members.
- REQ-003: Nested member identity MUST be path-based and stable. Each team member node/handle MUST carry `memberPath` and normalized `memberRouteKey`; direct member lookup by bare `memberName` is allowed only for top-level members or when unambiguous within the relevant team boundary.
- REQ-004: Launch planning MUST map runtime/model/workspace/tool settings to every leaf agent while preserving the top-level and recursive subteam boundaries.
- REQ-005: The backend selection path MUST choose the mixed backend for newly launched team runs whose definition contains nested `agent_team` nodes, even if all leaf agents use one runtime kind; those new nested launches MUST NOT preserve the old flatten-to-leaves execution semantics.
- REQ-006: `MixedTeamManager` MUST lazily create/restore both agent member handles and subteam member handles through one authoritative member-runtime lifecycle boundary.
- REQ-007: Posting a user/composer message to a structural subteam member, such as selecting `BuildSquad` itself, MUST dispatch through that subteam member handle and let the child team run choose its configured default/coordinator target. This structural-group command is distinct from representative `send_message_to` delivery, which targets explicit representative leaf routes under REQ-008 and REQ-033.
- REQ-008: Parent-to-subteam inter-agent delivery MUST expose the subteam coordinator/representative as the communication recipient while routing delivery through the structural subteam member boundary. Communication events MUST identify the actual leaf recipient path, for example `BuildSquad/review_lead`, and may include represented-subteam metadata for display; internal subteam routing remains owned by the child team manager.
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
- REQ-021: Team communication descriptors, delivery requests, events, and projections MUST be member-kind-aware, path-aware, and representative-aware. Structural subteam nodes remain `agent_team` nodes, but communication-visible rosters expose their coordinator/representative as an addressable `agent` participant with represented-subteam metadata. Subteam communication projection MUST NOT pretend the structural subteam node itself is an agent runtime.
- REQ-022: Frontend active team context MUST preserve a recursive `TeamMemberNode`/member tree for draft, active, restored, and historical team runs. A flat leaf-agent map may exist only as a derived lookup for agent conversations/projections; it MUST NOT be the source of truth for display, selection, or launch topology.
- REQ-023: Workspace run trees and team member panels MUST render subteam members as expandable/selectable group rows with their nested children, for example `Nested Mixed Runtime Delivery Team -> BuildSquad -> review_lead/qa_specialist`. Nested leaf agents MUST be displayed under their subteam path and MUST NOT appear as parent-level siblings of the subteam.
- REQ-024: Frontend focus, grid, and spotlight modes MUST support both agent leaf nodes and `agent_team` nodes. Selecting an agent leaf focuses its agent conversation/projection; selecting a subteam focuses a team/group view and message target for that subteam rather than trying to hydrate it as an `AgentContext`.
- REQ-025: Sending a user message from the frontend to a selected subteam node MUST target that subteam by `memberRouteKey`/`memberPath` and let the backend route to the child coordinator. Sending to a leaf agent MUST use the leaf canonical route key, such as `BuildSquad/review_lead`.
- REQ-026: Frontend launch config and member override state MUST key leaf-agent runtime/model/workspace overrides by canonical nested `memberRouteKey`, not flat child member names. Subteam group rows may display inherited/default configuration summaries but MUST NOT require or store agent runtime fields.
- REQ-027: Frontend run history, restore, streaming, activity, tool approval, and team communication projections MUST consume canonical recursive metadata/event identity (`memberTree`, `sourcePath`, sender/receiver participant kind/path/route). They MUST NOT require `runVersion`, flat `memberMetadata`, or bare `agent_name` as authoritative nested identity.
- REQ-028: Recipient-side live leaf conversations MUST be driven by backend member-routed input events for the actual receiving leaf agent. The frontend MUST NOT synthesize child leaf conversation messages from parent-level team communication events, because only the backend knows the resolved child coordinator route and exact recipient-visible prompt.
- REQ-029: `getTeamMemberRunProjection` and frontend hydration MUST return/render each logical conversation message once. When multiple projection sources contain the same logical message, deduplication MUST prefer the row with a valid timestamp and richer metadata and MUST not emit a duplicate `ts: null` copy.
- REQ-030: Active, opened, stopped, and historical nested team member rows MUST share one presentation policy. The primary row label is the team membership label (`TeamMemberNode.displayName`/`memberName`), while agent definition names and full route keys are secondary/tooltip/breadcrumb metadata and not the primary label.
- REQ-031: Nested team communication MUST NOT be top-down only. A subteam coordinator/representative MUST be able to send a controlled upward report to allowed immediate parent-boundary recipients such as `program_manager` by direct visible member name.
- REQ-032: `MemberTeamContext` and `send_message_to` tool exposure MUST distinguish structural local members from communication-visible recipients. The authoritative backend recipient model MUST be a descriptor shape with one coordinate system: `delivery.teamRunId` plus a selector relative to that run, and an actual participant address/path/route relative to the same run. `allowedRecipientNames` may exist only as a derived tool-schema list.
- REQ-033: Parent communication visibility MUST expose subteam coordinators/representatives, not abstract subteam nodes, as normal `send_message_to` recipients. For example, `program_manager` should see `review_lead` for `BuildSquad`; the descriptor delivery selector MUST target the absolute/root-relative representative route `BuildSquad/review_lead`, and `MixedSubTeamMemberHandle` MUST translate that route to a child-local selector after entering the `BuildSquad` boundary.
- REQ-034: Upward child-to-parent delivery MUST route through the parent-owned mixed runtime bridge and parent `MixedTeamManager`, not through global top-level run lookup or direct child access to parent internals. The parent communication event MUST use the actual nested leaf sender path, for example `sourcePath: ['BuildSquad', 'review_lead']`, and the parent recipient path, for example `['program_manager']`.
- REQ-035: Upward and downward communication scope MUST be bounded by explicit communication recipient descriptors. A child coordinator may address only local child-team recipients plus exposed immediate parent-boundary recipients; parent members may address direct parent agents plus subteam coordinator representatives. The implementation MUST reject arbitrary grandparents, unrelated runs, sibling subteam internals, hidden members, duplicate visible names, and ambiguous bare names.
- REQ-036: Upward/downward communication UI and projections MUST carry actual sender/receiver participant identity plus represented-subteam metadata end-to-end through backend communication payloads, GraphQL/WebSocket DTOs, and frontend `TeamCommunicationStore`. Views show one linked communication: parent Team Messages (`BuildSquad/review_lead -> program_manager`), parent recipient transcript as a backend-delivered member input, and child/subteam Team Messages as an outbound parent-boundary report.
- REQ-037: Parent-to-child and parent-to-subteam delivered inputs MUST record sender/receiver address trace fields for event/projection/debugging, but routing back upward MUST NOT depend on stored sender state, `replyAddress`, or a `reply_to_sender` alias. Follow-up routing uses the current scoped communication recipient descriptor for `program_manager` or another visible parent-boundary recipient.
- REQ-038: A subteam coordinator/representative MUST receive combined scoped communication visibility: local members from its own child team plus exposed immediate parent-team boundary members while acting as `SubTeam/coordinator`. This MUST NOT expose sibling subteam internals, grandparents, unrelated runs, or make every child member a parent member by default.
- REQ-039: Communication-visible recipient names MUST be unique within each member's scoped roster. If a local child teammate and a parent-boundary recipient or two subteam representatives share the same visible `recipient_name`, tool exposure and delivery MUST fail with a clear ambiguity/configuration error instead of guessing.

## Acceptance Criteria

- AC-001: Given a root definition with top-level agent `Coordinator` and subteam member `CodeReviewTeam`, creating a team run selects `TeamBackendKind.MIXED` and stores top-level member handles for `Coordinator` and `CodeReviewTeam`.
- AC-002: Posting a user message to `CodeReviewTeam` creates/starts a child mixed team run and dispatches to that child team's coordinator without exposing the child coordinator as a top-level parent member.
- AC-003: A parent agent using `send_message_to` with the exposed coordinator/representative name, e.g. `ReviewLead`, results in an accepted operation, a parent-level communication event addressed to `CodeReviewTeam/ReviewLead` with represented-subteam metadata for `CodeReviewTeam`, and child team processing by that coordinator.
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
- AC-015: A parent communication event for `Coordinator -> CodeReviewTeam/ReviewLead` records sender identity, actual coordinator receiver identity, and represented-subteam identity in the parent team communication projection, while child coordinator processing appears separately through the child event bridge under `sourcePath: ['CodeReviewTeam', 'ReviewLead']`.
- AC-016: In the seeded full-stack browser scenario, the workspace run tree shows `Nested Mixed Runtime Delivery Team` with a visible expandable `BuildSquad` team node and nested `BuildSquad/review_lead` and `BuildSquad/qa_specialist` leaves; `review_lead` and `qa_specialist` do not appear as flat parent-level siblings.
- AC-017: Frontend store tests prove active team context contains a recursive member tree including `BuildSquad`, a member-node index keyed by `BuildSquad`, `BuildSquad/review_lead`, and `BuildSquad/qa_specialist`, and a leaf-agent context lookup keyed only by canonical leaf route keys.
- AC-018: Selecting `BuildSquad` in tree/grid/spotlight focuses a subteam/group view and sending a message emits a route/path target for `BuildSquad`; selecting `BuildSquad/review_lead` focuses that leaf agent and uses the leaf route key.
- AC-019: Launch configuration UI groups nested leaf overrides under the subteam node and sends `TeamMemberConfigInput.memberRouteKey` values such as `BuildSquad/review_lead`; override lookup by flat `review_lead` is rejected for nested children.
- AC-020: Opening/restoring a historical nested team run uses backend `metadata.memberTree` as the authoritative display tree and does not require or parse `runVersion`/flat `memberMetadata` as the current schema.
- AC-021: Activity, tool approval, and team communication panels display nested breadcrumbs/badges from `sourcePath` and participant kind/path/route, including parent-level `program_manager -> BuildSquad/review_lead` communication with represented-subteam context and child-level `BuildSquad/review_lead` events.
- AC-022: In the seeded browser scenario, after `program_manager` sends to the exposed representative `review_lead`, focusing `BuildSquad/review_lead` live shows the inbound `You received a message from sender name: program_manager ...` prompt followed by the child coordinator reply, in the same order as `getTeamMemberRunProjection`.
- AC-023: `getTeamMemberRunProjection(teamRunId, "BuildSquad/review_lead")` for the seeded run returns one row per logical user/assistant message; timestamped rows are not repeated by `ts: null` duplicates, and opening/restoring the run renders each message once.
- AC-024: The active/new workspace tree and opened/history tree for the seeded nested team use the same primary row labels (`program_manager`, `BuildSquad`, `review_lead`, `qa_specialist`, or configured membership display names) while route breadcrumbs and agent definition names remain available as secondary metadata.
- AC-025: In the seeded full-stack scenario, after `program_manager` delegates to the exposed representative `review_lead`, `BuildSquad/review_lead` can call `send_message_to` with `recipient_name: "program_manager"` and the operation is accepted as an upward parent-boundary report. No `reply_to_sender` alias is required or exposed.
- AC-026: The upward report publishes a parent communication record with sender `BuildSquad/review_lead`, receiver `program_manager`, canonical sender `sourcePath: ['BuildSquad', 'review_lead']`, receiver route/path identity, and represented-subteam metadata for the sender when acting as `BuildSquad` representative; it also delivers one recipient-side member input into the live and durable `program_manager` transcript.
- AC-027: The child/subteam Team Messages perspective shows the upward report as outbound to a parent-boundary recipient, while parent Team Messages shows it as received from the nested child leaf; neither view duplicates the same logical communication row.
- AC-028: A child team attempt to send to an unexposed parent member, grandparent, sibling subteam internal leaf, unrelated run, or ambiguous duplicate bare name is rejected with a clear not-allowed/ambiguous selector error.
- AC-029: When `program_manager -> BuildSquad/review_lead` is delivered, the child input/event metadata records sender and receiver address fields for projection/traceability only; follow-up routing back to `program_manager` is driven by the child coordinator's current communication recipient descriptor, not by stored reply state or a `reply_to_sender` alias.
- AC-030: `BuildSquad/review_lead` runtime instructions/tool schema expose a separate parent-boundary recipient section including `program_manager` and any other exposed immediate parent members, while `BuildSquad/qa_specialist` does not automatically receive parent-boundary visibility unless it is also configured as a representative.
- AC-031: `program_manager` runtime instructions/tool schema expose subteam representative `review_lead` as the recipient for `BuildSquad`, not abstract `BuildSquad`; the descriptor target is `BuildSquad/review_lead` and represented-subteam metadata is present in backend and frontend communication DTOs. If two visible recipients would both be named `review_lead`, tool exposure fails with a clear ambiguous-recipient error.

## Constraints / Dependencies

- Current authoritative worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`.
- Base/finalization branch: `origin/personal` / `personal`.
- Existing team-definition API already supports `agent_team`; design should reuse it.
- Existing `TeamRun`, `TeamRunBackend`, and `TeamRunEvent` contracts should be strengthened rather than bypassed.
- Existing single-runtime team managers should not be expanded for nested execution in this change.
- The dedicated worktree currently lacks installed dependencies; validation commands requiring `tsc`/Vitest need environment setup before execution.
- Full-stack browser validation must use the worktree backend/frontend setup recorded in `fullstack-nested-team-ui-validation-failure.md` and assert the seeded nested UI tree, because backend-only E2E is no longer sufficient for this feature.

## Assumptions

- A subteam is an executable child team member with its own team manager/runtime boundary, not a static group label.
- Parent team agents see subteam coordinators/representatives as communication-visible members; the runtime still routes through the structural subteam boundary and the child team decides how to handle work internally.
- A subteam coordinator acts as that subteam's boundary representative for parent communication: the parent addresses the coordinator by member name, while backend descriptors retain the represented subteam node. This does not flatten child members into the parent or require a separate dual-membership runtime feature.
- Child team members are not exposed as parent top-level members for arbitrary commands, but their actual nested leaf identity is visible when they report upward through a controlled parent-boundary communication bridge.
- A child team's default upward recipients are immediate parent-boundary recipients exposed by policy, not the whole organization graph.
- Mixed manager is the long-term superset manager, but this change should not remove existing managers yet.

## Risks / Open Questions

- GraphQL/create-run inputs currently accept leaf-oriented member configs. Implementation should require path/route-keyed launch config matching for nested explicit launches while keeping bare names only for top-level/unambiguous cases.
- WebSocket/tool-approval payloads currently use bare names or agent IDs; nested approval requires emitted `sourcePath`/derived route identity and command selectors that can route to a nested leaf.
- Run history UX is now in scope for nested display: it must show recursive member trees under the parent top-level team while still not listing internal child team runs as independent top-level runs.
- Application binding summaries currently collect leaf descriptors with team paths; those paths should align with the new mixed topology route keys.
- Upward reporting must not be implemented by simply appending all parent/sibling/grandparent members to a child flat teammate list; that would erase the hierarchy and create ambiguous or unsafe cross-boundary messaging.

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
| REQ-022 | UC-008, UC-009 |
| REQ-023 | UC-008 |
| REQ-024 | UC-008, UC-009 |
| REQ-025 | UC-009 |
| REQ-026 | UC-010 |
| REQ-027 | UC-005, UC-008, UC-009 |
| REQ-028 | UC-003, UC-009, UC-011 |
| REQ-029 | UC-006, UC-011 |
| REQ-030 | UC-008, UC-011 |
| REQ-031 | UC-012 |
| REQ-032 | UC-003, UC-004, UC-012 |
| REQ-033 | UC-005, UC-012 |
| REQ-034 | UC-007, UC-012 |
| REQ-035 | UC-008, UC-011, UC-012 |
| REQ-036 | UC-003, UC-012 |
| REQ-037 | UC-003, UC-012 |
| REQ-038 | UC-003, UC-012 |
| REQ-039 | UC-007, UC-012 |

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
| AC-016 | Browser workspace tree renders subteam nodes and nested leaves. |
| AC-017 | Frontend active context stores recursive tree plus derived leaf lookup maps. |
| AC-018 | Selecting/sending to subteam vs leaf uses correct group/leaf semantics. |
| AC-019 | Frontend launch config uses canonical nested route keys. |
| AC-020 | Historical nested runs display from recursive `memberTree`. |
| AC-021 | Activity/tool/team communication panels display nested source/recipient identity. |
| AC-022 | Live child coordinator transcript includes the backend-delivered inbound prompt. |
| AC-023 | Durable and hydrated child coordinator projections dedupe timestamped/null duplicates. |
| AC-024 | Active and history nested member rows use one primary label policy. |
| AC-025 | Child coordinator can send a controlled upward report to the parent delegator. |
| AC-026 | Upward report has canonical nested sender and parent-recipient event/transcript identity. |
| AC-027 | Parent and child Team Messages show the same upward report from the appropriate perspectives without duplicate rows. |
| AC-028 | Upward reporting rejects out-of-scope cross-boundary targets. |
| AC-029 | Sender/receiver trace metadata exists, but upward routing uses current scoped recipient descriptors rather than stored reply state. |
| AC-030 | Subteam coordinator has parent-boundary visibility without flattening all child members into parent members. |
| AC-031 | Parent member communication roster exposes subteam representative names and rejects duplicate visible recipient names. |

## Approval Status

Scope inferred from the user's explicit investigation/design request. After review and user clarification, the requirements were refined to lock the design posture on mixed-only nested execution for new nested launches, parent-owned child runs, canonical `sourcePath`, canonical recursive `TeamRunMetadata` with no version suffix/field, and path-aware command/tool-approval payloads. The 2026-05-13 full-stack validation and follow-up discussion re-opened the requirements only for frontend nested-team tree/config/workspace/history/activity behavior, live transcript/projection/presentation invariants in REQ-028 through REQ-030, and the communication roster/representative model in REQ-031 through REQ-039; backend nested runtime direction remains unchanged except that nested communication is no longer top-down-only and no longer uses abstract subteam names as the normal `send_message_to` target.
