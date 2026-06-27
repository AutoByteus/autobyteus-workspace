# Requirements Doc — Conversation Target Addressing For Runtime Task Executions

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — refined and user-approved on 2026-06-27 after replacing the earlier fixed-kind address draft with a recursive participant-path model.

## Goal / Problem Statement

A human user should be able to focus and send ordinary chat messages to any concrete participant shown in an agent-team workspace, including deeply nested structural members, delegated task-agent runs, delegated task-team runs, members inside delegated task-team runs, and recursively nested combinations of those runtime participants.

The existing structural model is already path-shaped: the websocket session selects the active parent `teamRunId`, and `SEND_MESSAGE` can identify a member inside that team run by either:

- `target_member_route_key`, for example `SoftwareEngineeringTeam/solution_designer`, or
- `target_member_path`, for example `["SoftwareEngineeringTeam", "solution_designer"]`.

Those two forms represent the same structural path. The missing piece is not a fundamentally different addressing system; it is the ability for the same path idea to include runtime segments whose identity is a concrete run id rather than a structural member name.

The target model is therefore a recursive `ConversationTargetAddress`: a path through the active team run's participant tree. Each segment states what kind of participant boundary it selects:

- `member`: a structural member in the current team scope, selected by route key or path;
- `task_team`: a concrete delegated task-team execution under the previously selected team member, selected by `taskTeamRunId`;
- `task_agent`: a concrete delegated task-agent execution under the previously selected agent member, selected by `taskAgentRunId`.

Canonical examples:

```text
# Existing structural member path, still valid
EngineeringOrganization_run_1
└─ SoftwareEngineeringTeam/solution_designer

# Runtime task-team path
EngineeringOrganization_run_1
└─ SoftwareEngineeringTeam
   └─ task_team_run_001
      └─ solution_designer

# Runtime task-agent inside that task team
EngineeringOrganization_run_1
└─ SoftwareEngineeringTeam
   └─ task_team_run_001
      └─ solution_designer
         └─ task_agent_run_002

# Nested task-team inside a task-team
EngineeringOrganization_run_1
└─ SoftwareEngineeringTeam
   └─ task_team_run_001
      └─ BackendTeam
         └─ task_team_run_002
            └─ api_engineer
```

A normal chat message must remain separate from task result submission, review, approval, revision, settlement, and tool approval.

## Investigation Findings

1. Current frontend `SEND_MESSAGE` only sends a structural member selector.
   - `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` sends `target_member_route_key` and does not include runtime task-agent/task-team segments.
   - `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` defines `SendMessagePayload` with structural target aliases and no recursive runtime address.

2. Current structural addressing is already recursive for nested agent-team definitions.
   - Frontend team definition utilities build `memberPath` arrays and `memberRouteKey = memberPath.join('/')` for nested members.
   - Existing tests and payloads use deep route keys such as `BuildSquad/review_lead` and paths such as `["BuildSquad", "review_lead"]`.

3. Current frontend target resolution explicitly blocks runtime task execution focus.
   - `autobyteus-web/utils/teamUserMessageTarget.ts` returns no valid target with reason `task_execution_focus` when the focused node is a task-team instance or task-team child projection.
   - `TeamWorkspaceView.vue` hides the shared composer for task-agent, task-team, and task-team-child projections.

4. Current server `SEND_MESSAGE` parser accepts only structural selectors.
   - `autobyteus-server-ts/src/services/agent-streaming/team-command-selector-parser.ts` permits `target_member_path` / `targetMemberPath` or `target_member_route_key` / `targetMemberRouteKey`.
   - It rejects scalar identity fields such as `member_name` and `target_member_name`; this invariant should remain.
   - `agent-team-stream-handler.ts` calls `teamRun.postMessage(userMessage, targetSelector)` with no runtime path segments.

5. Backend runtime primitives already support parts of the needed path traversal.
   - `TeamRun.postMessage(message, target, targetMemberRunId)` can reach a concrete task-agent run when the logical member and task-agent run id are supplied.
   - `TeamRun.postMessageToTaskTeamInstance(logicalTeamRouteKey, taskTeamRunId, message)` can reach a concrete task-team root/default target.
   - `MixedTaskTeamMemberHandle` can enter the child `TeamRun` for a task-team instance; the new address router should reuse that boundary instead of bypassing it.

6. The earlier five-fixed-kind address draft was less faithful than the recursive path reality.
   - It would cover common one-level task-team cases, but it would artificially special-case shapes such as `task_team_member`.
   - The real invariant is simpler: a conversation target is a typed path from the active parent team run to a concrete participant.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + targeted refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue + Shared Structure Looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis:
  - Existing structural addresses are already path-shaped and can represent deep members.
  - Runtime task-agent/task-team projections are already visible in frontend state but are deliberately blocked from ordinary chat.
  - Backend task-agent and task-team primitives exist, but no owner interprets a full user conversation path across structural and runtime boundaries.
- Requirement or scope impact:
  - The feature requires a normalized recursive `ConversationTargetAddress`, not five ad hoc fixed address kinds and not overloaded string route keys containing untyped run ids.
  - Existing flat structural selector payloads should be parsed as a one-segment `member` address for compatibility, but internal routing should use the unified address model.

## Recommendations

1. Introduce `ConversationTargetAddress` as a typed recursive path through the active team run's participant tree.
2. Use typed segments instead of pretending runtime run ids are structural member names.
3. Keep existing `target_member_route_key` and `target_member_path` payloads working by normalizing them into `ConversationTargetAddress.segments = [{ kind: 'member', ... }]` at the parser boundary.
4. Keep the websocket-bound parent `teamRunId` authoritative. A payload-provided parent id may be accepted only for validation/debugging and must not redirect the session.
5. Preserve scalar/name-only selector rejection.
6. Make malformed, stale, inactive, or mismatched runtime segments fail with explicit invalid-target errors; never silently fall back to a structural member.
7. Keep task lifecycle commands and tool-approval payloads separate unless a later scoped design explicitly reuses the same address model.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-Large.

Rationale: the change crosses frontend focus/composer behavior, websocket protocol typing, server parser normalization, domain runtime routing, mixed backend recursion through task-team child runs, optimistic frontend message placement, and durable coverage.

## In-Scope Use Cases

- UC-001: A user focuses an ordinary structural leaf agent at any depth and sends chat using the existing structural route/path behavior.
- UC-002: A user focuses an ordinary structural subteam at any depth and sends chat to that subteam's default/coordinator target.
- UC-003: A user focuses a delegated task-agent projection under a structural member and sends chat to that exact `taskAgentRunId`.
- UC-004: A user focuses a delegated task-team root projection under a structural team member and sends chat to that exact `taskTeamRunId`'s default/coordinator target.
- UC-005: A user focuses a member inside a delegated task-team execution and sends chat to that member inside that exact task-team run.
- UC-006: A user focuses a task-agent projection spawned by a member inside a delegated task-team execution and sends chat to that exact task-agent run.
- UC-007: A user addresses nested runtime paths such as task-team inside task-team inside task-team, as long as the UI/runtime has the concrete segment identities.
- UC-008: The UI labels and composer context make clear whether the focused target is structural, a task agent, a task team, or a member under a task-team execution.
- UC-009: Existing task lifecycle and tool approval behavior continues to work unchanged.
- UC-010: Concurrent task-team or task-agent executions under the same logical member are addressable without ambiguity because runtime segments include concrete run ids.

## Out of Scope

- Changing how tasks are delegated, submitted, reviewed, accepted, revised, settled, dismissed, or approved.
- Changing model-facing `send_message_to` tool semantics unless a later design explicitly scopes that reuse.
- Treating untyped slash strings that mix member names and runtime run ids as the authoritative backend route.
- Supporting scalar/name-only selectors such as `member_name`, `agent_name`, `target_member_name`, or display-name routing.
- Historical chat to already-archived runtime participants beyond current read-only history behavior.
- Guaranteeing delivery to terminal/offline runtime participants; deterministic rejection or disabled composer is acceptable.

## Functional Requirements

- REQ-001: The system must define a normalized `ConversationTargetAddress` contract for human/user `SEND_MESSAGE` routing in agent-team workspaces.
- REQ-002: `ConversationTargetAddress` must contain an ordered list of typed path segments interpreted from the websocket-bound parent team run.
- REQ-003: Supported segment kinds must include at least `member`, `task_team`, and `task_agent`.
- REQ-004: A `member` segment must identify a structural member in the current team scope using `memberRouteKey` or `memberPath`.
- REQ-005: A `task_team` segment must identify a concrete delegated task-team execution using `taskTeamRunId` and must be interpreted under the previously selected structural team member.
- REQ-006: A `task_agent` segment must identify a concrete delegated task-agent execution using `taskAgentRunId` and must be interpreted under the previously selected structural agent member.
- REQ-007: A terminal `member` segment targeting an agent must route ordinary chat to that member agent.
- REQ-008: A terminal `member` segment targeting an agent-team must route ordinary chat to that team's existing default/coordinator target.
- REQ-009: A terminal `task_team` segment must route ordinary chat to that exact task-team execution's default/coordinator target.
- REQ-010: A terminal `task_agent` segment must route ordinary chat to that exact task-agent run.
- REQ-011: A `task_team` segment followed by additional segments must enter that concrete task-team run and continue interpreting following segments relative to the task-team's own team scope.
- REQ-012: Address traversal must support arbitrary structural member depth and arbitrary runtime task-team depth where concrete segment identities are available.
- REQ-013: The websocket session's parent `teamRunId` is authoritative. Payload `parentTeamRunId`, if present, is validation/debug metadata only and must be rejected or ignored on mismatch; it must not redirect routing.
- REQ-014: Existing flat `SEND_MESSAGE` payloads with `target_member_route_key`, `targetMemberRouteKey`, `target_member_path`, or `targetMemberPath` must continue to work by normalizing to a one-segment `member` address.
- REQ-015: The server must continue rejecting scalar/name-only selectors for `SEND_MESSAGE`.
- REQ-016: The server parser must reject malformed addresses, unknown segment kinds, missing required ids, invalid segment order, or ambiguous payloads with explicit invalid-target errors.
- REQ-017: The backend runtime layer must have one explicit owner for converting `ConversationTargetAddress` segments into runtime delivery calls.
- REQ-018: The websocket handler must not parse runtime traversal itself; it should normalize payloads and call the `TeamRun` conversation-address boundary.
- REQ-019: The frontend target resolver must build `ConversationTargetAddress` from focused `TeamMemberNode` metadata and task projection identity, rather than returning `task_execution_focus` for valid runtime projections.
- REQ-020: The frontend shared composer must be visible and enabled when the focused projection can produce a valid `ConversationTargetAddress`.
- REQ-021: The frontend must still hide or disable the composer when no valid concrete target exists, with an explanatory reason.
- REQ-022: Runtime target labels in the UI must distinguish structural members from runtime task executions.
- REQ-023: Existing task-agent activity bar behavior and task-team projection lifecycle behavior must not regress except that valid runtime participants become chat-addressable.
- REQ-024: Existing tool approval target routing and interrupt-generation behavior must not regress.
- REQ-025: Runtime target failures such as inactive run, route mismatch, or missing run id must fail deterministically and must not fall back to a structural target.
- REQ-026: Ordinary chat must not submit task results, review results, accept tasks, request revision, settle tasks, or alter lifecycle state except normal conversation/activity timestamps.
- REQ-027: The implementation must include frontend unit coverage for address construction from structural nodes, task-agent projections, task-team roots, task-team children, and nested runtime segment paths.
- REQ-028: The implementation must include server parser coverage for flat legacy selectors, nested address payloads, invalid segment order, scalar selector rejection, and parent-team mismatch handling.
- REQ-029: The implementation must include backend runtime coverage proving exact delivery for structural member, structural subteam, task agent, task-team root, task-team child member, and nested task-team/task-agent paths.
- REQ-030: Documentation or code comments must clarify that route-key strings are structural member selectors, while runtime run ids must be typed path segments.

## Acceptance Criteria

- AC-001: Existing structural member chat still works with current flat route-key/path payloads.
- AC-002: Existing structural subteam chat still routes to the structural subteam's default/coordinator target.
- AC-003: A nested structural leaf such as `BuildSquad/review_lead` remains addressable.
- AC-004: When the user focuses a delegated task-agent projection, the composer is visible and the outbound payload contains typed segments selecting the logical member and exact `taskAgentRunId`.
- AC-005: Chat sent to a delegated task-agent projection is delivered to that concrete task-agent run, not to the structural member.
- AC-006: When the user focuses a delegated task-team root projection, the composer is visible and the outbound payload contains typed segments selecting the logical team member and exact `taskTeamRunId`.
- AC-007: Chat sent to a delegated task-team root is delivered to that exact task-team runtime's default/coordinator target, not to the structural team template.
- AC-008: When the user focuses a member inside a delegated task-team execution, the outbound payload includes the parent logical team member, exact `taskTeamRunId`, and member selector relative to that task-team scope.
- AC-009: Chat sent to a task-team child member is delivered to that member inside the exact task-team run.
- AC-010: Chat sent to a task-agent inside a task-team child member is delivered to that exact task-agent run.
- AC-011: A nested path containing more than one `task_team` segment routes by concrete runtime segment ids and does not choose latest/single-active fallbacks.
- AC-012: If two task-team executions for the same logical team are active concurrently, their target addresses route to different runtime contexts by distinct `taskTeamRunId` values.
- AC-013: If two task-agent executions for the same logical member are active concurrently, their target addresses route to different runtime contexts by distinct `taskAgentRunId` values.
- AC-014: Missing, malformed, inactive, mismatched, or ambiguous runtime segments are rejected with explicit errors and no structural fallback.
- AC-015: No name-only selector compatibility is introduced; tests verify scalar names remain rejected.
- AC-016: UI labels and composer context clearly identify runtime execution targets.
- AC-017: Ordinary chat messages do not change task lifecycle state.
- AC-018: Existing projection cleanup, badges, active-execution bar, approval affordances, and interrupts remain intact.
- AC-019: Unit tests cover frontend address construction and server parser normalization/rejection.
- AC-020: Backend integration tests cover exact runtime delivery for all supported segment combinations in scope.

## Constraints / Dependencies

- Base branch: `origin/personal` at commit `820bce31` during bootstrap verification.
- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing`.
- The websocket session is already bound to one parent `TeamRun`; that binding is the root of every address.
- Current structural member selectors are `TeamMemberSelector` values backed by `memberRouteKey` / `memberPath`.
- Existing frontend projection nodes store enough identity for current one-level task-agent and task-team projections; deeper runtime projection support may require carrying the complete typed segment path on projection nodes.
- Existing task-team child UI route keys like `<taskTeamRunId>/<relativeRouteKey>` are frontend state keys, not sufficient as untyped backend routing addresses.
- Current task lifecycle commands have their own payload semantics and must not be overloaded by ordinary chat.

## Assumptions

- The primary user is a human using the frontend team workspace.
- `taskAgentRunId` and `taskTeamRunId` are stable concrete runtime identifiers emitted by task-delegation events.
- A task-team root message routes to that task team's coordinator/default entrypoint.
- Runtime segments must be terminal unless their kind naturally opens a new scope (`task_team`).
- Terminal/offline runtime targets may be rejected rather than silently accepted.

## Risks / Open Questions

- RISK-001: Existing optimistic local message insertion uses one focused `AgentContext`; runtime/team targets need explicit local-placement rules.
- RISK-002: Some current projection nodes may not carry a full recursive runtime address stack for deeply nested runtime task-team cases; implementation may need to add this metadata at projection creation time.
- RISK-003: A rushed implementation could encode runtime run ids into `target_member_route_key` slash strings, losing type information and causing ambiguous routing.
- RISK-004: Backend recursion must avoid bypassing the `TeamRun` / task-team handle boundary when entering child task-team runs.
- RISK-005: Concurrent runtime executions under the same logical member are the primary ambiguity stress case and need durable coverage.
- OPEN-001: Exact payload alias support should be finalized in design; preferred frontend emission is snake_case `conversation_target_address` with camelCase accepted by parser only if consistent with existing protocol style.
- OPEN-002: The design must decide whether projection nodes store full address segments directly or whether the resolver reconstructs them from existing node/root metadata.

## Requirement-To-Use-Case Coverage

| Use Case | Covering Requirements |
| --- | --- |
| UC-001 structural leaf chat | REQ-001, REQ-004, REQ-007, REQ-014 |
| UC-002 structural subteam chat | REQ-004, REQ-008, REQ-014 |
| UC-003 delegated task-agent chat | REQ-003, REQ-006, REQ-010, REQ-019 |
| UC-004 delegated task-team root chat | REQ-003, REQ-005, REQ-009, REQ-019 |
| UC-005 task-team child member chat | REQ-005, REQ-011, REQ-019 |
| UC-006 task-agent inside task-team member | REQ-006, REQ-010, REQ-011, REQ-019 |
| UC-007 arbitrary nested runtime path | REQ-002, REQ-011, REQ-012, REQ-025 |
| UC-008 UI clarity | REQ-020, REQ-021, REQ-022 |
| UC-009 lifecycle preservation | REQ-024, REQ-026 |
| UC-010 concurrent executions | REQ-012, REQ-025 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 through AC-003 | Protect existing structural route/path behavior, including deep nested structural members. |
| AC-004 / AC-005 | Prove task-agent projections become chat-addressable by concrete run id. |
| AC-006 / AC-007 | Prove task-team roots become chat-addressable by concrete run id. |
| AC-008 / AC-009 | Prove members inside task-team executions are addressed relative to the concrete task-team scope. |
| AC-010 / AC-011 | Prove the path model supports nested runtime participants, not only one fixed task-team level. |
| AC-012 / AC-013 | Prove no ambiguous latest/single-active runtime fallback. |
| AC-014 / AC-015 | Prove invalid targets fail safely and scalar name selectors remain rejected. |
| AC-016 through AC-018 | Prove UI clarity and lifecycle/tool-command preservation. |
| AC-019 / AC-020 | Define durable frontend/parser/backend coverage requirements. |

## Approval Status

Approved by user on 2026-06-27 for design kickoff, with explicit direction to follow the team design principles and design examples constructively.
