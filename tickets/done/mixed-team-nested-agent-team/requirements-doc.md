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
- Electron build validation on 2026-05-17 exposed a release-blocking upgrade UX gap: historical team runs written with `runVersion` plus flat `memberMetadata[]` trigger raw unsupported-legacy metadata text in the left sidebar. The new recursive `memberTree` schema can semantically represent old non-nested teams, so known legacy flat metadata should be converted by a one-time app data migration before normal runtime/history hydration. Runtime code should still read only the current canonical schema; migration is a separate maintenance boundary with database-recorded status and frontend visibility.
- Delivery/user verification on 2026-05-17 exposed a status-regression design gap after merging the `agent-initializing-status-ux` work into the nested-team branch: individual agents can visibly transition `offline -> initializing -> offline/done` after a user send, and team members do not consistently show the same startup transition. Git comparison shows `origin/personal` contains the initializing UX merge, but current code mixes frontend optimistic `initializing` writes with backend snapshots/events. This violates the backend-runtime-status authoritative boundary. The target design must make backend the only source of canonical runtime status and keep frontend-only pending submit UI separate.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Larger Requirement
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness; Legacy Or Compatibility Pressure; Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Mixed manager directly owns agent-only maps, agent-only runtime creation, agent-only events, and flat member metadata. Adding subteams by patching conditionals into those paths would mix agent and team lifecycle concerns without an explicit member-runtime boundary. The Electron red-sidebar failure shows that clean schema changes also need an explicit app-data migration boundary; otherwise user data upgrade failures leak as raw runtime/UI errors. The delivery/user status regression shows a status ownership violation: frontend currently writes canonical `initializing` while backend snapshots/events remain authoritative for the same field.
- Requirement or scope impact: The design must introduce a member runtime abstraction and recursive mixed-team topology before adding nested execution; it should not only add another branch to `ensureMemberReady()`. It must also add a data-migration subsystem so known legacy persisted data is upgraded once, while normal runtime code remains current-schema-only. It must also refactor runtime status ownership so the backend owns canonical `initializing`/`running` transitions for individual and nested-team sends.

## Recommendations

- Implement nested-team execution in the mixed backend, not in the single-runtime Codex/Claude/AutoByteus managers.
- Treat any newly launched definition containing `agent_team` nodes as a mixed backend run so the mixed manager becomes the authoritative nested-team path; do not preserve flattening semantics for new nested launches.
- Replace flat leaf-only internal run configuration for mixed nested runs with a recursive member topology that distinguishes `agent` and `agent_team` members.
- Require stable path-based identity for nested members: `memberPath` plus normalized slash-delimited `memberRouteKey`; do not rely on globally unique leaf `memberName`.
- Make `MixedTeamManager` own live member lifecycle through a `MixedTeamMemberHandle` boundary with agent and subteam handle implementations; reserve `TeamMemberNode` for tree/data representation.
- Persist nested topology and runtime IDs recursively so restore does not flatten or lose department/team boundaries.
- Reuse the existing `TeamRun`/`TeamRunBackend` surface for subteam member handles where possible, but create it through a mixed-owned subteam factory so subteams stay internal members of the parent unless explicitly launched as top-level runs.
- Make `sourcePath` the single canonical event-source identity in the team-run domain. Derive legacy/display fields such as `sub_team_node_name` only in WebSocket/GraphQL/projection mappers.
- Store run metadata in the canonical recursive `TeamRunMetadata` shape with no `V2` type name and no `runVersion` field; its `memberTree` should be typed as `TeamRunMemberMetadata[]` rather than `TeamRunMemberMetadataNode[]`. Known historical flat metadata must not be guessed by runtime restore, but should be converted by a registered one-time app data migration into canonical `memberTree` before normal history/restore hydration.
- Extend command payloads and tool-approval payloads with route/path selectors so nested leaf operations reject bare member-name or agent-id command targeting entirely.
- Extend the frontend active team context, run-history tree, team members panel, grid, spotlight, launch config, streaming router, and communication/activity projections to preserve and render recursive `TeamMemberNode` trees. Leaf-agent lookup maps are allowed only as derived indexes for conversations/projections; they must not be the display source of truth.
- Add a general app data migration framework with database-recorded migration status and a Settings -> Server -> Migrations UI. The first migration converts legacy team-run metadata (`runVersion` + flat `memberMetadata[]`) to canonical recursive `memberTree`; migration failures must be visible in the migration screen and must not break normal Agents/workspace sidebar rendering.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

This crosses team-definition traversal, team-run launch config shape, backend selection, mixed member lifecycle, inter-member routing, event propagation, metadata/restore, app data migration, frontend settings diagnostics, and validation tests.

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
- UC-013: Upgrading an installation with historical flat team-run metadata runs a recorded app data migration that converts known legacy metadata to canonical `memberTree`, exposes migration status/failures in Settings -> Server -> Migrations, and prevents raw migration/parser errors from rendering in the normal Agents/workspace/sidebar UI.
- UC-014: Starting or sending work to an individual agent, team leaf member, or nested subteam shows a stable startup lifecycle: visible `offline -> initializing -> running`, then `idle`/done only after the accepted user input finishes; passive startup snapshots must not cause `initializing -> offline/idle` flicker.

## Out of Scope

- Deprecating or deleting the AutoByteus, Codex, or Claude team managers in this change.
- Arbitrary cross-level leaf-to-leaf messaging that bypasses team boundaries, including child-to-grandparent, child-to-sibling-internal-leaf, or unrelated-run messaging. Controlled child-to-immediate-parent-boundary reporting is now in scope.
- Arbitrary organization-chart/productivity-suite redesign beyond the minimum nested team tree, launch config, focus/grid/spotlight, history/restore, and activity/communication behavior required for this feature.
- Reworking task-plan semantics across nested mixed teams beyond event propagation and independent child team context.
- Running live external-provider E2E tests as part of this design stage.

## Functional Requirements

- REQ-001: The mixed backend MUST preserve executable nested team nodes from `AgentTeamDefinition.nodes` where `refType === "agent_team"` instead of flattening them into only leaf agent members.
- REQ-002: Mixed run topology MUST distinguish agent members from subteam members with a clear discriminant and owner-specific fields; agent-only fields MUST NOT be required on subteam members.
- REQ-003: Nested member identity MUST be path-based and stable. Each team member node/handle MUST carry `memberPath` and normalized `memberRouteKey`. Public runtime command targets MUST use path/route identity. The only bare-name-like input is the LLM tool's scoped `send_message_to.recipient_name`, which is a human-visible roster label rather than a command selector; `communicationRecipients` descriptors immediately normalize that label to a route/path selector before delivery.
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
- REQ-015: GraphQL, WebSocket, and tool-approval command paths MUST accept only structured path/route selectors (`memberPath`/`sourcePath` or `memberRouteKey`/`sourceRouteKey`/`targetMemberRouteKey`) for team member targets. Scalar command target aliases such as `target_member_name`, `target_agent_name`, command-side `agent_name`, command-side `agent_id`, and camelCase equivalents MUST be removed/rejected rather than normalized. Emitted tool-approval request events MUST include enough source path/route data to approve the exact nested leaf without scalar aliases.
- REQ-016: Metadata restore MUST read the canonical recursive `TeamRunMetadata` shape with no `V2` type name and no `runVersion` field. Normal runtime restore MUST NOT contain backward-compatible inflation logic for flat metadata. Known historical flat metadata MUST be handled by the app data migration subsystem before restore/history hydration; if unmigrated legacy metadata is encountered at runtime, it MUST be classified as legacy-unmigrated/unavailable rather than guessed into topology.
- REQ-017: Naming MUST distinguish tree/data nodes from live command/lifecycle adapters: `TeamMemberNode` or `TeamMemberTreeNode` for frontend/definition topology, and `MixedTeamMemberHandle` for backend mixed live member adapters. The design MUST NOT introduce `TeamRuntimeNode`.
- REQ-018: The implementation MUST NOT keep backward-compatibility code paths for previous flat team metadata inside normal runtime readers, restore mappers, frontend current-schema parsers, or projection consumers. Historical flat metadata handling is allowed only inside registered app data migration code and maintenance diagnostics; runtime code after migration remains current-schema-only with no dual read path, fallback schema, or topology guessing.
- REQ-019: `TeamMemberSelector` MUST be the authoritative public/domain command identity across `TeamRun`, `TeamRunBackend`, `TeamManager`, and mixed manager command methods. It MUST be constructed from explicit path/route selector fields, not raw string target aliases. Transport and GraphQL edges MUST reject scalar target aliases instead of treating them as compatibility inputs.
- REQ-020: `TeamRunMetadataStore` MUST validate and persist only the canonical recursive `TeamRunMetadata.memberTree` schema and remove support for `runVersion`/flat `memberMetadata` as valid runtime schema. It may expose typed legacy-unmigrated diagnostics for migration/history callers, but MUST NOT silently migrate, fallback-read, or return generic missing metadata for known legacy flat payloads. Derived flat views MUST be produced only by a projection flattener, not by the store schema.
- REQ-021: Team communication descriptors, delivery requests, events, and projections MUST be member-kind-aware, path-aware, and representative-aware. Structural subteam nodes remain `agent_team` nodes, but communication-visible rosters expose their coordinator/representative as an addressable `agent` participant with represented-subteam metadata. Subteam communication projection MUST NOT pretend the structural subteam node itself is an agent runtime.
- REQ-022: Frontend active team context MUST preserve a recursive `TeamMemberNode`/member tree for draft, active, restored, and historical team runs. A flat leaf-agent map may exist only as a derived lookup for agent conversations/projections; it MUST NOT be the source of truth for display, selection, or launch topology.
- REQ-023: Workspace run trees and team member panels MUST render subteam members as expandable/selectable group rows with their nested children, for example `Nested Mixed Runtime Delivery Team -> BuildSquad -> review_lead/qa_specialist`. Nested leaf agents MUST be displayed under their subteam path and MUST NOT appear as parent-level siblings of the subteam.
- REQ-024: Frontend focus, grid, and spotlight modes MUST support both agent leaf nodes and `agent_team` nodes. Selecting an agent leaf focuses its agent conversation/projection; selecting a subteam focuses a team/group view and message target for that subteam rather than trying to hydrate it as an `AgentContext`.
- REQ-025: Sending a user message from the frontend to a selected subteam node MUST target that subteam by `memberRouteKey`/`memberPath` and let the backend route to the child coordinator. Sending to a leaf agent MUST use the leaf canonical route key, such as `BuildSquad/review_lead`.
- REQ-026: Frontend launch config and member override state MUST key leaf-agent runtime/model/workspace overrides by canonical nested `memberRouteKey`, not flat child member names. Subteam group rows may display inherited/default configuration summaries but MUST NOT require or store agent runtime fields.
- REQ-027: Frontend run history, restore, streaming, activity, tool approval, and team communication projections MUST consume canonical recursive metadata/event identity (`memberTree`, `sourcePath`, sender/receiver participant kind/path/route). They MUST NOT require `runVersion`, flat `memberMetadata`, or bare `agent_name`/`agent_id` as authoritative nested identity.
- REQ-028: Recipient-side live leaf conversations MUST be driven by backend member-routed input events for the actual receiving leaf agent. The frontend MUST NOT synthesize child leaf conversation messages from parent-level team communication events, because only the backend knows the resolved child coordinator route and exact recipient-visible prompt.
- REQ-029: `getTeamMemberRunProjection` and frontend hydration MUST return/render each logical conversation message once. When multiple projection sources contain the same logical message, deduplication MUST prefer the row with a valid timestamp and richer metadata and MUST not emit a duplicate `ts: null` copy.
- REQ-030: Active, opened, stopped, and historical nested team member rows MUST share one presentation policy. The primary row label is the team membership label (`TeamMemberNode.displayName`/`memberName`), while agent definition names and full route keys are secondary/tooltip/breadcrumb metadata and not the primary label.
- REQ-031: Nested team communication MUST NOT be top-down only. A subteam coordinator/representative MUST be able to send a controlled upward report to allowed immediate parent-boundary recipients such as `program_manager` by direct visible member name.
- REQ-032: `MemberTeamContext` and `send_message_to` tool exposure MUST distinguish structural local members from communication-visible recipients. The authoritative backend recipient model MUST be a descriptor shape with one coordinate system: `delivery.teamRunId` plus a selector relative to that run, and an actual participant address/path/route relative to the same run. `allowedRecipientNames` may exist only as a derived tool-schema list.
- REQ-033: Parent communication visibility MUST expose subteam coordinators/representatives, not abstract subteam nodes, as normal `send_message_to` recipients. For example, `program_manager` should see `review_lead` for `BuildSquad`; the descriptor delivery selector MUST target the absolute/root-relative representative route `BuildSquad/review_lead`, and `MixedSubTeamMemberHandle` MUST translate that route to a child-local selector after entering the `BuildSquad` boundary.
- REQ-034: Upward child-to-parent delivery MUST route through the parent-owned mixed runtime bridge and parent `MixedTeamManager`, not through global top-level run lookup or direct child access to parent internals. The parent communication event MUST use the actual nested leaf sender path, for example `sourcePath: ['BuildSquad', 'review_lead']`, and the parent recipient path, for example `['program_manager']`.
- REQ-035: Upward and downward communication scope MUST be bounded by explicit communication recipient descriptors. A child coordinator may address only local child-team recipients plus exposed immediate parent-boundary recipients; parent members may address direct parent agents plus subteam coordinator representatives. The implementation MUST reject arbitrary grandparents, unrelated runs, sibling subteam internals, hidden members, and duplicate/ambiguous visible `recipient_name` values.
- REQ-036: Upward/downward communication UI and projections MUST carry actual sender/receiver participant identity plus represented-subteam metadata end-to-end through backend communication payloads, GraphQL/WebSocket DTOs, and frontend `TeamCommunicationStore`. Views show one linked communication: parent Team Messages (`BuildSquad/review_lead -> program_manager`), parent recipient transcript as a backend-delivered member input, and child/subteam Team Messages as an outbound parent-boundary report.
- REQ-037: Parent-to-child and parent-to-subteam delivered inputs MUST record sender/receiver address trace fields for event/projection/debugging, but routing back upward MUST NOT depend on stored sender state, `replyAddress`, or a `reply_to_sender` alias. Follow-up routing uses the current scoped communication recipient descriptor for `program_manager` or another visible parent-boundary recipient.
- REQ-038: A subteam coordinator/representative MUST receive combined scoped communication visibility: local members from its own child team plus exposed immediate parent-team boundary members while acting as `SubTeam/coordinator`. This MUST NOT expose sibling subteam internals, grandparents, unrelated runs, or make every child member a parent member by default.
- REQ-039: Communication-visible recipient names MUST be unique within each member's scoped roster. If a local child teammate and a parent-boundary recipient or two subteam representatives share the same visible `recipient_name`, tool exposure and delivery MUST fail with a clear ambiguity/configuration error instead of guessing.
- REQ-040: Runtime instructions for `send_message_to` MUST render scoped recipients as a real organization-style team membership roster manifest, grouped by human team names and roles, not by implementation labels such as `local` or `parent-boundary`. The manifest MUST show each team context the current member participates in, the current member's role in that team, the team members in that context, representative/subteam context when applicable, and the exact `recipient_name` values that may be used. This manifest is prompt presentation only; routing authority remains `communicationRecipients` descriptors.
- REQ-041: Command API cleanup MUST be a clean-cut no-legacy change for team member targeting. WebSocket, GraphQL, frontend protocol types, tests, and E2E helpers MUST use structured path/route selector fields for team commands and tool approvals. The system MUST reject scalar alias command fields (`target_member_name`, `target_agent_name`, command-side `agent_name`, command-side `agent_id`, and camelCase equivalents) with a clear invalid-target error. Outbound event/display aliases, if still emitted for presentation, MUST remain non-authoritative and MUST NOT be accepted as command target inputs.
- REQ-042: The backend MUST provide a general app data migration framework distinct from Prisma/database schema migrations. It MUST have a code registry of migrations, a database-backed migration record store, startup execution for required pending migrations, idempotent retry behavior, and typed statuses such as `NOT_RUN`, `RUNNING`, `SUCCEEDED`, `FAILED`, and `SUCCEEDED_WITH_WARNINGS`.
- REQ-043: Add a registered migration `20260517_team_run_metadata_member_tree` (exact ID may follow project timestamp naming) that scans stored team-run metadata files, converts known legacy flat metadata with `runVersion` and `memberMetadata[]` into canonical `TeamRunMetadata.memberTree`, validates the converted payload through the current metadata validator, creates a backup before writing, and writes atomically. Current-format metadata is skipped as already migrated.
- REQ-044: App data migration failures MUST be safe and diagnosable. A failed item MUST NOT corrupt the source file; the migration MUST continue processing independent items where safe, record counts/details/errors in the database summary/log, and support manual retry. A stale `RUNNING` record from a crashed process MUST be resolved to a retryable failed/aborted state before the next attempt.
- REQ-045: The frontend settings area MUST expose a Server -> Migrations view that lists registered migrations, current status, last attempt timestamps, counts/summary, failure details, and actions to refresh and retry failed/not-run migrations. Technical details may be expandable, but normal users should see concise friendly explanations.
- REQ-046: Normal Agents/workspace/sidebar/history hydration MUST NOT display raw legacy metadata parser errors. If unmigrated or failed legacy metadata is encountered despite startup migration, the affected historical team run is skipped or shown as a scoped "legacy data not upgraded" item, and the detailed failure is available in the Migrations view/logs.
- REQ-047: Backend runtime lifecycle owners MUST be the only source of canonical runtime status (`offline`, `initializing`, `idle`, `running`, `error`). Frontend stores/components MUST NOT set canonical `currentStatus` to `initializing` on accepted send/start; they may only set separate local UI-pending state such as `isSending`, disabled controls, or optimistic message rows.
- REQ-048: When the backend accepts a user send/start/create/restore command for an offline or idle individual agent, it MUST transition that run to canonical `initializing` before acknowledging the accepted operation or emitting/snapshotting runtime status. `getStatusSnapshot()` MUST return `initializing` while backend startup is in progress, then `running` when runtime work begins, then `idle`/done, `error`, or `offline` only after actual completion/failure/termination.
- REQ-049: Public runtime status payloads emitted to the frontend MUST remain canonical (`offline`, `initializing`, `idle`, `running`, `error`). Raw provider lifecycle tokens such as `bootstrapping`, `starting`, `startup`, and `uninitialized` are not public API aliases, but provider/backend adapters MUST still map those internal states to canonical `initializing` before publishing status.
- REQ-050: Team and nested-team sends MUST follow the same backend-owned status semantics. Backend mixed member handles/subteam handles MUST emit and snapshot route/path-identified `initializing` for the focused leaf, structural subteam/group where applicable, aggregate team, and backend-resolved child coordinator leaf; frontend routing renders those backend statuses by canonical route/path identity and does not infer canonical status from focus or display names.

## Acceptance Criteria

- AC-001: Given a root definition with top-level agent `Coordinator` and subteam member `CodeReviewTeam`, creating a team run selects `TeamBackendKind.MIXED` and stores top-level member handles for `Coordinator` and `CodeReviewTeam`.
- AC-002: Posting a user message to `CodeReviewTeam` creates/starts a child mixed team run and dispatches to that child team's coordinator without exposing the child coordinator as a top-level parent member.
- AC-003: A parent agent using `send_message_to` with the exposed coordinator/representative name, e.g. `ReviewLead`, results in an accepted operation, a parent-level communication event addressed to `CodeReviewTeam/ReviewLead` with represented-subteam metadata for `CodeReviewTeam`, and child team processing by that coordinator.
- AC-004: Child team events appear on the parent team stream with canonical `sourcePath` such as `['CodeReviewTeam', 'ReviewLead']`; deeper nested events include the full source path, e.g. `['EngineeringDept', 'CodeReviewTeam', 'ReviewLead']`.
- AC-005: Child leaf agent events retain their leaf member identity within the event payload while also exposing canonical `sourcePath`; WebSocket/GraphQL may include derived `source_route_key` or non-authoritative display aliases, but those are derived from `sourcePath` and are not command target inputs.
- AC-006: Restoring a parent mixed team run from recursive `TeamRunMetadata` after at least one agent member and one subteam member have runtime IDs recreates the recursive graph with previous IDs where supported; normal restore does not parse legacy flat metadata directly, and any unmigrated legacy metadata is surfaced as a controlled legacy-unmigrated/unavailable condition.
- AC-007: Terminating a parent mixed run terminates all active child agent runs and child team runs, unsubscribes all event bridges, and removes active member handles.
- AC-008: A circular team definition A -> B -> A is rejected before runtime creation with a clear circular dependency error.
- AC-009: A nested definition with duplicate leaf names in different subteams is accepted only if route/path identity is unique; any public command that targets by bare member name is rejected with a clear invalid-target error.
- AC-010: Unit/integration tests cover topology planning, mixed manager agent/subteam member routing, nested event rebroadcast, metadata restore, and lifecycle cascade.
- AC-011: A nested leaf tool approval request emitted by `CodeReviewTeam/SecurityReviewer` includes enough path/route identity for WebSocket or GraphQL approval to approve exactly that leaf; approving by bare `SecurityReviewer` or agent id/name alias is rejected.
- AC-012: Active/history run listings show the parent mixed run as the top-level run; child team runtime IDs are persisted inside parent recursive metadata and are not listed as separate top-level runs unless the child team definition was explicitly launched as its own run.
- AC-013: Public command tests prove `TeamRun.postMessage`, `TeamRunBackend.postMessage`, `TeamManager.postMessage`, and `approveToolInvocation` route by path/route `TeamMemberSelector`; scalar/bare string targets are rejected before domain/backend command boundaries.
- AC-014: Metadata store tests prove canonical recursive `memberTree` metadata reads/writes and derived flattening for history/projection consumers. Runtime metadata readers reject/diagnose old flat metadata containing `runVersion` or `memberMetadata` without silently converting it; conversion coverage belongs to the app data migration tests.
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
- AC-028: A child team attempt to send to an unexposed parent member, grandparent, sibling subteam internal leaf, unrelated run, or ambiguous duplicate visible `recipient_name` is rejected with a clear not-allowed/ambiguous selector error.
- AC-029: When `program_manager -> BuildSquad/review_lead` is delivered, the child input/event metadata records sender and receiver address fields for projection/traceability only; follow-up routing back to `program_manager` is driven by the child coordinator's current communication recipient descriptor, not by stored reply state or a `reply_to_sender` alias.
- AC-030: `BuildSquad/review_lead` runtime instructions/tool schema expose a separate parent-boundary recipient section including `program_manager` and any other exposed immediate parent members, while `BuildSquad/qa_specialist` does not automatically receive parent-boundary visibility unless it is also configured as a representative.
- AC-031: `program_manager` runtime instructions/tool schema expose subteam representative `review_lead` as the recipient for `BuildSquad`, not abstract `BuildSquad`; the descriptor target is `BuildSquad/review_lead` and represented-subteam metadata is present in backend and frontend communication DTOs. If two visible recipients would both be named `review_lead`, tool exposure fails with a clear ambiguous-recipient error.
- AC-032: In the seeded nested scenario, `BuildSquad/review_lead` instructions present a team membership roster manifest with named team contexts such as `BuildSquad` and `Delivery Leadership Team`, mark `review_lead` as the current member/coordinator/representative, list `qa_specialist` and `program_manager` under their respective team contexts, and include an exact allowed `send_message_to` recipient list. The LLM-facing roster MUST NOT use implementation labels like `local child-team recipients` or `parent-boundary recipients` as the primary grouping language.
- AC-033: WebSocket/GraphQL team command and approval requests that use `target_member_name`, `target_agent_name`, command-side `agent_name`, command-side `agent_id`, or camelCase equivalents are rejected with a clear invalid-target response. Equivalent requests using `target_member_route_key`, `target_member_path`, `source_route_key`, `source_path`, `member_route_key`, or `member_path` succeed when the referenced member is valid. Runtime E2E helpers and frontend protocol send methods use only the structured selector fields.
- AC-034: On first startup after upgrade, the app data migration runner records `20260517_team_run_metadata_member_tree` in the database, converts legacy team metadata files to canonical `memberTree`, and reports migrated/skipped/failed counts. A second startup skips already-succeeded migration work.
- AC-035: Given legacy metadata shaped as `runVersion: 1` plus flat `memberMetadata[]`, the migration output removes `runVersion`, replaces `memberMetadata` with `memberTree`, adds `memberKind: "agent"`, and sets each top-level member `memberPath` to `[memberRouteKey]` while preserving run IDs, agent definition IDs, model/config, workspace, and archived timestamps.
- AC-036: Migration tests prove backup and atomic-write behavior: invalid converted metadata leaves the original file intact, successful conversion leaves a recoverable backup, and retrying after partial success skips already-current files.
- AC-037: GraphQL/API tests prove migration status and retry endpoints expose registered migrations with statuses, timestamps, summary JSON/counts, error messages, and prevent concurrent duplicate runs of the same migration.
- AC-038: Frontend tests cover Settings -> Server -> Migrations listing, failed migration detail expansion, refresh, and retry action wiring. The view displays friendly failure text while preserving technical details for diagnostics.
- AC-039: A seeded Electron/browser scenario with legacy team-run metadata no longer renders raw unsupported metadata text in the left sidebar or main Agents/workspace UI. If conversion fails for one historical run, normal UI remains usable and the failure is visible through the Migrations view.
- AC-040: In an Electron/browser user-send scenario for an individual agent that starts from `offline`, the frontend does not call a local canonical `applyAcceptedStartupStatus`/`currentStatus = initializing` path. Instead, the backend accepted operation emits or snapshots `AGENT_STATUS { status: "initializing" }`, and the visible status follows backend `offline -> initializing -> running -> idle/done` without an intervening backend `offline`/`idle` snapshot after acceptance.
- AC-041: In a focused team leaf send, backend mixed runtime status events/snapshots set the selected member row and aggregate team state to `initializing`, then `running`, then terminal/idle; frontend tests prove canonical member/team status changes come from backend payloads rather than local status mutation.
- AC-042: In a focused subteam/group send such as `BuildSquad`, backend mixed subteam handling emits/snapshots `initializing` for the structural group/aggregate and route/path status or member-input events move `BuildSquad/review_lead` to `initializing`/`running` without relying on flat `agent_name` fallback or frontend focus inference.
- AC-043: Backend/provider status tests prove internal raw lifecycle tokens such as `bootstrapping`, `starting`, `startup`, and `uninitialized` are projected to canonical `initializing` before WebSocket/GraphQL/frontend payloads. Public payload tests still reject non-canonical status tokens at public boundaries where applicable.
- AC-044: Team initial member status snapshot messages include canonical `member_route_key` and/or `source_path` for each member, and frontend routing tests prove strict nested identity dispatch works without bare display-name fallback.

## Constraints / Dependencies

- Current authoritative worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team`.
- Base/finalization branch: `origin/personal` / `personal`.
- Existing team-definition API already supports `agent_team`; design should reuse it.
- Existing `TeamRun`, `TeamRunBackend`, and `TeamRunEvent` contracts should be strengthened rather than bypassed.
- Existing single-runtime team managers should not be expanded for nested execution in this change.
- The dedicated worktree currently lacks installed dependencies; validation commands requiring `tsc`/Vitest need environment setup before execution.
- Full-stack browser validation must use the worktree backend/frontend setup recorded in `fullstack-nested-team-ui-validation-failure.md` and assert the seeded nested UI tree, because backend-only E2E is no longer sufficient for this feature.
- App data migrations run after Prisma/database schema migrations and before normal server services expose history to frontend clients. The migration record store uses the application database; migrated team metadata remains in the existing file-based memory/run-history layout.
- The merged `agent-initializing-status-ux` behavior from `origin/personal` is an integration baseline for this branch. The nested-team/status cleanup may keep the public status contract clean, but it must not remove backend/provider-edge startup mapping or move canonical `initializing` ownership into the frontend.

## Assumptions

- A subteam is an executable child team member with its own team manager/runtime boundary, not a static group label.
- Parent team agents see subteam coordinators/representatives as communication-visible members; the runtime still routes through the structural subteam boundary and the child team decides how to handle work internally.
- A subteam coordinator acts as that subteam's boundary representative for parent communication: the parent addresses the coordinator by member name, while backend descriptors retain the represented subteam node. This does not flatten child members into the parent or require a separate dual-membership runtime feature.
- Child team members are not exposed as parent top-level members for arbitrary commands, but their actual nested leaf identity is visible when they report upward through a controlled parent-boundary communication bridge.
- A child team's default upward recipients are immediate parent-boundary recipients exposed by policy, not the whole organization graph.
- Mixed manager is the long-term superset manager, but this change should not remove existing managers yet.
- Known flat v1 team metadata represents non-nested top-level agent members and can be mechanically converted to a one-level `memberTree`; this conversion is data migration, not runtime backward compatibility.
- `idle`/done is a valid backend-settled state after a user input completes, but after the backend accepts startup it should not snapshot `offline`/`idle` until the startup either fails/terminates or completes.

## Risks / Open Questions

- GraphQL/create-run inputs currently accept leaf-oriented member configs. Implementation should require path/route-keyed launch config matching for nested explicit launches. If any authoring-time convenience remains for non-nested launch config matching, it must be explicitly scoped outside runtime command/approval APIs and must not reintroduce command target aliases.
- WebSocket/tool-approval payloads currently use bare names or agent IDs; the target contract requires emitted `sourcePath`/route identity and rejects scalar command target aliases.
- Run history UX is now in scope for nested display: it must show recursive member trees under the parent top-level team while still not listing internal child team runs as independent top-level runs.
- Application binding summaries currently collect leaf descriptors with team paths; those paths should align with the new mixed topology route keys.
- Upward reporting must not be implemented by simply appending all parent/sibling/grandparent members to a child flat teammate list; that would erase the hierarchy and create ambiguous or unsafe cross-boundary messaging.
- App data migrations must not become hidden best-effort startup work with no user visibility. Failed or partially successful migrations need durable records and Settings -> Server -> Migrations visibility so release validation and user support can see upgrade health.
- Migration code must remain isolated from normal runtime parsers; otherwise the project recreates the dual-schema compatibility branches this design is trying to avoid.
- Status cleanup must not confuse no-legacy public API cleanup with internal provider adaptation. Removing provider-edge mappings for startup states makes canonical `initializing` disappear and regresses the merged personal-branch UX. Moving canonical `initializing` to frontend optimistic state is also forbidden because it creates two status authorities.

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
| REQ-040 | UC-003, UC-012 |
| REQ-041 | UC-003, UC-005, UC-007, UC-009, UC-012 |
| REQ-042 | UC-013 |
| REQ-043 | UC-013 |
| REQ-044 | UC-013 |
| REQ-045 | UC-013 |
| REQ-046 | UC-008, UC-013 |
| REQ-047 | UC-014 |
| REQ-048 | UC-009, UC-014 |
| REQ-049 | UC-005, UC-014 |
| REQ-050 | UC-008, UC-009, UC-014 |

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
| AC-032 | LLM instructions render scoped recipients as named team membership manifests, not technical routing-scope sections. |
| AC-033 | Team command/approval scalar target aliases are rejected; structured route/path selectors are required and used by tests/E2E helpers. |
| AC-034 | Startup app data migration is recorded, idempotent, and converts legacy team metadata. |
| AC-035 | Legacy flat team metadata converts mechanically into canonical `memberTree`. |
| AC-036 | Migration writes are safe, backed up, atomic, and retryable. |
| AC-037 | Migration status/retry API exposes durable operational state and prevents duplicate concurrent runs. |
| AC-038 | Settings -> Server -> Migrations shows friendly status, details, refresh, and retry. |
| AC-039 | Legacy metadata/migration failures do not leak raw parser errors into normal app UI. |
| AC-040 | Individual agent initializing is backend-emitted/snapshotted, not frontend-authored. |
| AC-041 | Team leaf initializing is backend-emitted/snapshotted, not frontend-authored. |
| AC-042 | Subteam/group and resolved child coordinator initializing are backend-emitted/snapshotted by route/path. |
| AC-043 | Provider startup lifecycle tokens map internally to canonical public initializing. |
| AC-044 | Team member status snapshots include canonical route/path identity for nested dispatch. |

## Approval Status

Scope inferred from the user's explicit investigation/design request. After review and user clarification, the requirements were refined to lock the design posture on mixed-only nested execution for new nested launches, parent-owned child runs, canonical `sourcePath`, canonical recursive `TeamRunMetadata` with no version suffix/field, and path-aware command/tool-approval payloads. The 2026-05-13 full-stack validation and follow-up discussion re-opened the requirements only for frontend nested-team tree/config/workspace/history/activity behavior, live transcript/projection/presentation invariants in REQ-028 through REQ-030, and the communication roster/representative model in REQ-031 through REQ-041. The 2026-05-17 Electron upgrade UX finding adds REQ-042 through REQ-046 for app data migration and migration visibility. Backend nested runtime direction remains unchanged: runtime code uses only current canonical metadata, while known historical flat metadata is upgraded by isolated data migration before normal history/restore use.
