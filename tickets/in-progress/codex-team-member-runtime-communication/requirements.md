# Requirements

## Status

`Refined`

## Ticket

`codex-team-member-runtime-communication`

## Goal / Problem Statement

Enable Codex-backed team runs to support both:
- user-to-member team messaging, and
- agent-to-agent `send_message_to` tool messaging

with deterministic routing, persisted member-runtime bindings, continuation safety, stable event identity, and strict separation of concerns from frontend user-ingress paths.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Cross-layer runtime + persistence + API + streaming + frontend contract impact.
  - New explicit requirement surface for agent-to-agent `send_message_to` semantics in Codex team runtime.
  - Requires architecture-boundary clarity (tool path decoupled from user ingress).

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry)

1. Re-entry investigation did not introduce new business requirements; existing `R-001..R-016` still cover required behavior.
2. Re-entry findings confirmed implementation-edge ownership gaps, but these are design/implementation traceability issues rather than requirement-scope expansion.
3. Scope remains `Medium` and `Refined` requirements remain valid for downstream design/runtime-model review gates.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 2)

1. Newly documented unresolved seams (resolver runtime-mode branch, team stream runtime-mode branch, frontend reopen runtime hydration) are already covered by `R-004`, `R-006`, `R-007`, `R-010`, and `R-016`.
2. No additional requirement IDs were required; acceptance criteria remain `AC-001..AC-016` with unchanged Stage 6 scenario mapping.
3. Requirements remain `Refined`, scope remains `Medium`, and design basis revalidation can proceed.

## Stage 1 Revalidation Notes (After Stage 8 Re-Entry For Team-Scoped Tool Exposure)

1. Requirement gap confirmed: team-only tool exposure behavior for Codex runtime was implemented but not explicitly captured as a requirement/acceptance criterion.
2. Added explicit requirement for `send_message_to` availability gating so non-team Codex sessions do not advertise this tool.
3. Scope remains `Medium`; no product-surface expansion beyond existing team runtime boundaries.

## Stage 1 Revalidation Notes (After Additional Code-Review Reopen)

1. Additional review findings are architecture/separation concerns (module boundary ownership and hotspot concentration), not behavior-scope or contract changes.
2. Existing requirement set `R-001..R-017` and acceptance set `AC-001..AC-017` remain valid with no new IDs required.
3. Scope remains `Medium`; re-entry classification is `Design Impact` and proceeds through design/runtime-model/review gates.

## Stage 1 Revalidation Notes (After Finding-1 Rollback To Investigation)

1. New review finding (`WorkspaceAgentRunsTreePanel.vue` over-coupling) confirms architecture boundary debt, not a behavior-contract gap.
2. Requirement and acceptance sets remain unchanged (`R-001..R-017`, `AC-001..AC-017`).
3. Scope remains `Medium`; this cycle is a design-quality refactor path with no requirement expansion.

## Stage 1 Revalidation Notes (After Process-Topology Clarification)

1. Requirement gap confirmed: current codex runtime service maps one app-server subprocess per member run/session, while required model is one shared app-server process hosting multiple agent-run threads.
2. Added explicit requirement and acceptance criteria for shared-process multi-thread runtime topology (`R-018`, `AC-018`).
3. Scope remains `Medium`; this is an architecture/runtime orchestration requirement expansion, not frontend contract expansion.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 8)

1. Round-8 investigation confirmed unresolved architecture hotspots (shared-process manager not yet implemented, history UI/store coupling), but no new externally visible behavior requirements were discovered beyond existing `R-001..R-018`.
2. Shared-process requirement and validation target remain explicitly covered by `R-018` and `AC-018`; decoupling deltas are treated as Stage-2 design decomposition work, not requirement-ID expansion.
3. Scope remains `Medium`; downstream updates should focus on design/refactor inventory alignment and runtime-model regeneration.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 9)

1. Round-9 investigation narrowed the open issue to history-panel container/section coupling (`C-023`) and did not identify any new product behavior.
2. Requirement and acceptance sets remain unchanged (`R-001..R-018`, `AC-001..AC-018`).
3. Scope remains `Medium`; this loop is a design-quality implementation pass with no requirement expansion.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 10)

1. Requirement gap confirmed: team run configuration does not expose a team-level runtime selector, so Codex model catalogs/config schemas cannot be selected deterministically for team runs.
2. Added explicit requirement and acceptance criterion for runtime-kind-driven team model/config behavior (`R-019`, `AC-019`).
3. Scope remains `Medium`; this is a requirement expansion inside existing team runtime boundaries.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 11)

1. User validation confirmed a requirement gap: Codex team runs created via `workspaceId` path must persist workspace-root identity so history grouping remains aligned with selected workspace.
2. Added explicit persistence+projection parity requirement for Codex team workspace-root continuity (`R-020`, `AC-020`), including member-binding and team-manifest history visibility outcomes.
3. Scope remains `Medium`; this closes a behavior gap within existing Codex team runtime history flow.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 12)

1. New finding is design-impact plus correctness hardening for runtime event mapping: MCP tool-call events must resolve tool names from all supported payload fields to avoid `MISSING_TOOL_NAME` activity rows.
2. Added explicit requirement/acceptance coverage for deterministic MCP tool-name mapping in codex runtime event adapter (`R-021`, `AC-021`).
3. Scope remains `Medium`; no product-surface expansion beyond existing Codex activity/event streaming behavior.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 13)

1. User validation confirmed a remaining correctness gap: MCP tool-call argument payloads are present in Codex runtime events but are not projected into activity-card arguments.
2. `R-021`/`AC-021` are refined to require both deterministic tool-name mapping and deterministic argument projection (`metadata.arguments`) for MCP/generic `tool_call` activity parity.
3. Scope remains `Medium`; this is a mapper-contract refinement inside existing Codex activity/event streaming behavior.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 14)

1. Requirement gap confirmed: current Codex team dynamic tool exposure is team-context-gated but not agent-tool-config-gated.
2. `R-017`/`AC-017` are refined to require both conditions for dynamic tool exposure: (a) team-bound session context and (b) member agent definition explicitly contains `send_message_to` in `toolNames`.
3. Scope remains `Medium`; no new product-surface expansion is introduced.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 15)

1. User confirmed the preferred strategy is to keep `send_message_to` as Codex runtime-provided dynamic tooling, not an MCP-defined replacement for this ticket scope.
2. Existing `R-017`/`AC-017` semantics remain valid with no additional requirement IDs required.
3. Scope remains `Medium`; this round is a process-reset confirmation with no behavior-surface expansion.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 16)

1. Round-16 investigation reconfirmed round-15 decisions and introduced no new requirement-level deltas.
2. Requirement and acceptance coverage remains unchanged (`R-001..R-021`, `AC-001..AC-021`).
3. Scope remains `Medium`; proceed with unchanged design/runtime-model basis.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 17)

1. Requirement gap confirmed: Codex team members currently do not receive explicit team-manifest instruction context at thread bootstrap/resume, reducing deterministic recipient awareness for `send_message_to`.
2. Added requirement/acceptance coverage for Codex team-manifest instruction injection and recipient-hint projection (`R-022`, `AC-022`).
3. Scope remains `Medium`; no product-surface expansion beyond existing Codex team runtime flow.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 18)

1. Live UI validation confirmed remaining parity gap for Codex team messaging: sender-side `send_message_to` tool invocation is not surfaced as activity/tool-call segment, and recipient-side structured `From <sender>` inter-agent segment is not emitted.
2. Added explicit parity requirement/acceptance coverage for Codex team stream event contracts (`R-023`, `AC-023`) so sender tool-call visibility and recipient inter-agent segment rendering are testable.
3. Scope remains `Medium`; this is a stream/event-contract refinement within existing Codex team runtime boundaries.

## Stage 1 Revalidation Notes (After Stage 0 Re-Entry Round 19)

1. Round-19 investigation confirmed a payload-shape/method-alias robustness gap in dynamic `send_message_to` interception, not a new behavior-scope requirement.
2. Existing `R-023`/`AC-023` already cover required sender visibility and recipient structured inter-agent projection; no additional requirement IDs were introduced.
3. Scope remains `Medium`; this cycle is a local-fix hardening pass.

## In-Scope Use Cases

- `UC-001` Create a team run with explicit member runtime kinds and deterministic member runtime bindings.
- `UC-002` Send a user turn from frontend to a targeted member in a Codex-backed team run.
- `UC-003` Route team tool approval/denial to the intended targeted member runtime session.
- `UC-004` Stream Codex-backed member runtime events with stable member identity (`agent_name`, `agent_id=memberRunId`).
- `UC-005` Continue/reopen a persisted Codex-backed team run and restore member runtime sessions from persisted bindings.
- `UC-006` Preserve existing non-Codex team runtime behavior with no regression.
- `UC-007` Return deterministic errors for invalid target-member routing and missing/invalid member-runtime binding state.
- `UC-008` Agent A invokes `send_message_to` and runtime resolves Agent B in the same team run.
- `UC-009` Recipient member runtime receives inter-agent envelope (`sender`, `message_type`, `content`) and resumes normal reasoning/input pipeline.
- `UC-010` Sender agent receives deterministic tool-visible failure for unknown recipient / recipient-start failure / unavailable recipient session.
- `UC-011` Codex runtime exposes `send_message_to` tool only for team-bound member sessions where that member agent definition explicitly configures `send_message_to`; standalone sessions or non-configured members must not expose it.
- `UC-012` Codex-backed agent runs in one server node share a single long-lived app-server process while preserving one-thread-per-agent-run semantics.
- `UC-015` Team run config allows selecting runtime kind, then loads runtime-specific model catalogs/config schemas so member overrides can select models/thinking config under that runtime.
- `UC-016` Codex team runs created with `workspaceId` persist deterministic workspace-root paths in team/member history manifests so workspace tree grouping remains aligned with selected workspace.
- `UC-017` Codex runtime event mapper resolves MCP tool names and argument payload projection from supported call payload shapes so activity stream shows deterministic tool labels and arguments.
- `UC-018` Codex team member sessions receive deterministic team-manifest instruction context (teammate names/roles and `send_message_to` usage guidance) at thread start/resume.
- `UC-019` Codex team messaging emits deterministic sender-side `send_message_to` tool-call events and recipient-side structured `INTER_AGENT_MESSAGE` events so frontend conversation/activity parity matches AutoByteus runtime.

## Out Of Scope (This Ticket)

- `OOS-001` Mixed-runtime teams in one run (some members Codex, some AutoByteus).
- `OOS-002` Legacy compatibility wrapper paths for old team manifest schema at runtime routing layer.
- `OOS-003` Cross-team or cross-run inter-agent messaging.

## Requirements

| requirement_id | Requirement | Expected Outcome | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Team member runtime kind must be accepted in team run input at member level (`autobyteus` or `codex_app_server`). | Team creation payload carries explicit per-member runtime intent, with deterministic validation failure on invalid runtime kind. | UC-001 |
| R-002 | Team run creation must build and persist member runtime bindings that include `memberRouteKey`, `memberRunId`, and member runtime metadata required for restore. | Persisted team manifest is sufficient to restore member runtime sessions without runtime ambiguity. | UC-001, UC-005 |
| R-003 | For Codex-backed team members, member runtime sessions must be initialized deterministically and keyed by persisted `memberRunId`. | A newly created Codex-backed team has active, addressable member runtime sessions immediately after create. | UC-001 |
| R-004 | Team send-message routing must resolve target member and deliver the user turn to that member runtime session for Codex-backed teams. | A targeted user message reaches exactly one intended member runtime session. | UC-002 |
| R-005 | Team tool approval/denial must route by member identity to the intended member runtime session and invocation. | Approval/denial applies to the correct member and invocation; misrouting does not occur. | UC-003 |
| R-006 | Team websocket rebroadcast for Codex-backed members must include stable member identity metadata (`agent_name`, `agent_id`). | Frontend can deterministically map events to the correct team member context. | UC-004 |
| R-007 | Team continuation/reopen must restore member runtime sessions from persisted runtime bindings before dispatching resumed user turns. | Continued team runs preserve member runtime continuity and respond via restored member sessions. | UC-005 |
| R-008 | Existing AutoByteus team runtime paths must remain behaviorally intact for non-Codex team runs. | Non-Codex team creation, messaging, approvals, and streaming remain functional with no semantic regression. | UC-006 |
| R-009 | Invalid target-member routing or missing runtime binding state must return deterministic failure codes/messages. | Caller receives explicit rejection (`invalid target`/`binding missing`/`session missing`) rather than silent fallback. | UC-007 |
| R-010 | No legacy compatibility branches/wrappers may be introduced for obsolete team-runtime paths in this ticket scope. | New runtime path is clean-cut and obsolete paths are removed where directly impacted by this change. | UC-001, UC-002, UC-003, UC-005 |
| R-011 | Codex team runtime must support core-library-equivalent `send_message_to` tool contract (`recipient_name`, `content`, optional `message_type`) for agent-to-agent messaging inside a team run. | Agent tool invocation can request deterministic inter-agent delivery without frontend mediation. | UC-008 |
| R-012 | `send_message_to.recipient_name` must resolve to exactly one recipient member binding using deterministic normalization rules. | Recipient resolution is unambiguous and stable across runtime sessions and resume. | UC-008, UC-010 |
| R-013 | Inter-agent delivery must pass envelope metadata (`senderAgentId`, `recipientName`, `messageType`, `content`) into the recipient member runtime session. | Recipient receives complete inter-agent context, not just plain text. | UC-009 |
| R-014 | Recipient member runtime must normalize inter-agent envelope into normal reasoning/input pipeline while preserving sender metadata. | Recipient continues reasoning and tool use from standard pipeline, with sender context preserved. | UC-009 |
| R-015 | Inter-agent delivery failure states (unknown recipient, recipient start failure, unavailable session) must return deterministic tool-visible failure messages to sender agent. | Sender agent gets actionable deterministic failure semantics from `send_message_to`. | UC-010 |
| R-016 | Agent-to-agent tool routing must remain decoupled from frontend GraphQL user-ingress message handling boundaries. | Tool path can evolve independently without coupling to user message API flows. | UC-008, UC-009, UC-010 |
| R-017 | Codex runtime must register/expose `send_message_to` only when the run session is both team-bound (`teamRunId` present) and capability-authorized (`send_message_to` exists in that member agent definition `toolNames`). | Standalone/non-team Codex runs and team members without configured `send_message_to` do not expose inter-agent messaging tools and cannot invoke undefined team-target sends. | UC-011 |
| R-018 | Codex runtime in this server process must use one shared long-lived app-server process and manage one thread per agent run/member run via that shared process. | Team/agent runs do not spawn one app-server subprocess per run; per-run isolation is provided by thread identity and runtime routing, not per-run process creation. | UC-012 |
| R-019 | Team run configuration must expose a single team runtime kind (`autobyteus` or `codex_app_server`) and load model catalogs/config schemas from that selected runtime for global model + member overrides. | When team runtime is Codex, users can select Codex models and per-member thinking config; launch payload uses the selected team runtime kind for every member. | UC-015 |
| R-020 | Codex team run creation/resume paths must persist non-null workspace-root paths for team manifest and member bindings when workspace selection is provided via `workspaceId` (without requiring explicit `workspaceRootPath` input). | Team history grouping for Codex runs appears under the selected workspace (for example `Temp Workspace`) and member rows remain discoverable under the same workspace bucket. | UC-016 |
| R-021 | Codex runtime event mapping must resolve MCP tool names from canonical payload fields (`toolName`, `tool_name`, `tool`, nested `tool.name`) and project tool-call arguments into `metadata.arguments` when runtime payload provides them. | Frontend activity for valid MCP tool calls never falls back to `MISSING_TOOL_NAME` when tool identity is present, and MCP/generic `tool_call` cards show provided arguments deterministically. | UC-017 |
| R-022 | Codex team member session startup/resume must inject per-member team-manifest instructions (excluding self) via runtime-supported developer-instruction channel, including teammate names and `send_message_to` recipient guidance; dynamic tool hints may include allowed-recipient names derived from the same manifest. | Each Codex team member receives deterministic teammate awareness context at bootstrap/resume, improving recipient targeting reliability while preserving runtime-side validation as source of truth. | UC-018 |
| R-023 | Codex team inter-agent relay flow must emit deterministic stream-visible events for both sides: sender-side `send_message_to` tool-call lifecycle (`tool_call` segment/activity) and recipient-side structured `INTER_AGENT_MESSAGE` payload (`sender_agent_id`, `recipient_role_name`, `content`, `message_type`). | Frontend parity is preserved: sender sees actual `send_message_to` tool call in conversation/activity and recipient sees `From <sender>` inter-agent segment instead of opaque plain text-only injection. | UC-019 |

## Acceptance Criteria

| acceptance_criteria_id | mapped_requirement_ids | Testable Criteria |
| --- | --- | --- |
| AC-001 | R-001 | `createAgentTeamRun` accepts member runtime kind and rejects unknown runtime kinds with deterministic error. |
| AC-002 | R-002 | Team manifest for created run persists member runtime metadata and is readable by continuation flow without schema ambiguity. |
| AC-003 | R-003 | After team creation with Codex members, each member has an active runtime session keyed by its `memberRunId`. |
| AC-004 | R-004 | Sending targeted user message in Codex-backed team routes to exactly one intended member runtime session. |
| AC-005 | R-005 | Team tool approval/denial targeting succeeds only for intended member/invocation and fails deterministically for invalid targets. |
| AC-006 | R-006 | Team websocket runtime events for Codex-backed members include `agent_name` and `agent_id` mapped to the correct member identity. |
| AC-007 | R-007 | Continuing a persisted Codex-backed team run restores member runtime sessions from manifest and handles resumed targeted message. |
| AC-008 | R-008 | Existing non-Codex team runs continue to pass create/send/approval/streaming behavior checks with no regressions. |
| AC-009 | R-009 | Unknown target member or missing binding/session state returns explicit deterministic error code/message. |
| AC-010 | R-010 | Impacted legacy runtime-routing paths are removed/refactored; no dual-path compatibility wrapper remains in changed scope. |
| AC-011 | R-011 | Agent invocation of `send_message_to` inside Codex-backed team run is accepted with required fields and routed into inter-agent delivery pipeline. |
| AC-012 | R-012 | Recipient resolution for `recipient_name` is deterministic and rejects ambiguous/unknown recipients with deterministic failure. |
| AC-013 | R-013 | Recipient member receives inter-agent envelope with sender metadata + `message_type` + `content` preserved. |
| AC-014 | R-014 | Recipient runtime converts inter-agent envelope into normal reasoning/input pipeline and can continue tool reasoning. |
| AC-015 | R-015 | Sender receives deterministic tool-visible failure for recipient missing/start failure/session unavailable cases. |
| AC-016 | R-016 | Agent-to-agent tool routing path executes without depending on frontend-originated GraphQL user-message code path. |
| AC-017 | R-017 | Codex standalone run sessions do not advertise `send_message_to`; team-bound member sessions advertise it only when the member agent definition includes `send_message_to`; otherwise it remains hidden. |
| AC-018 | R-018 | When multiple codex agent runs are active concurrently (including team members), runtime diagnostics/process inspection confirms one shared Codex app-server process is used while each run keeps a distinct thread identity. |
| AC-019 | R-019 | Team config runtime selector controls runtime-specific model lists/config schemas; selecting Codex enables Codex model + member thinking-config selection and team launch sends uniform `runtimeKind=codex_app_server` member configs. |
| AC-020 | R-020 | Creating a Codex team run with only `workspaceId` in member config persists non-null `workspaceRootPath` in `listTeamRunHistory` team row + member rows, and frontend workspace history shows the team under the selected workspace instead of unassigned/missing grouping. |
| AC-021 | R-021 | For Codex `mcpToolCall` runtime events containing tool identity in `payload.tool` (string) or `payload.tool.name` (object) and arguments in `payload.arguments`/`payload.item.arguments`, activity mapping emits the concrete tool name (not `MISSING_TOOL_NAME`) and includes those arguments in activity-card payload. |
| AC-022 | R-022 | For Codex team member session create/restore, runtime startup payload (`thread/start` and `thread/resume`) includes non-null `developerInstructions` with teammate manifest context (teammate names present; self name excluded), and `send_message_to` dynamic tool metadata exposes deterministic recipient hints derived from teammate names when capability is enabled. |
| AC-023 | R-023 | In live Codex team runtime E2E (`RUN_CODEX_E2E=1`), when member A calls `send_message_to` targeting member B, team websocket stream includes (a) sender member `SEGMENT_START/SEGMENT_END` `tool_call` for `send_message_to` with arguments, and (b) recipient member `INTER_AGENT_MESSAGE` payload carrying sender id/name, recipient role, message type, and content for `From <sender>` rendering. |

## Constraints / Dependencies

- Runtime abstraction boundaries remain under `autobyteus-server-ts/src/runtime-execution/*`.
- Team websocket protocol must continue exposing member identity in existing frontend-consumed shape.
- Team manifest/history schema changes must remain consumable by run-history and team resume flows.
- Agent-to-agent tool path must be decoupled from frontend user-ingress APIs.
- `send_message_to` availability is team-context gated and must not appear in non-team Codex sessions.
- Codex runtime topology must use shared process + multi-thread session management; per-run subprocess spawning is prohibited in target state.
- Team runtime selection is single-value per run; member runtime overrides are not allowed to diverge from selected team runtime.
- No backward compatibility shim paths (workflow modernization policy).

## Assumptions

- First delivery is all-members-same-runtime for team runs; mixed-runtime is deferred.
- Codex app-server can host multiple concurrent threads in one long-lived process for this runtime node.
- `send_message_to` remains team-internal and does not cross team-run boundaries.
- Recipient session auto-start policy will be explicit and deterministic (either ensure-start or fail-fast) and consistently documented.

## Risks

- `RISK-001` Persistence/schema drift if member runtime metadata is inconsistently propagated through create/history/continue/read paths.
- `RISK-002` Routing ambiguity if member identity normalization (`memberRouteKey`, `memberName`, `memberRunId`) diverges across ingress/stream/tool paths.
- `RISK-003` Regression risk for non-Codex teams if shared ingress paths are refactored without runtime-specific boundaries.
- `RISK-004` Semantic drift from core-library `send_message_to` behavior if inter-agent envelope mapping is underspecified.
- `RISK-005` Shared-process lifecycle bugs (unexpected process exit/restart) could affect multiple active runs if thread/session recovery is not deterministic.

## Open Questions

- `Q-001` Should phase-2 mixed-runtime teams require per-member capability gating in UI before launch?
- `Q-002` Should coordinator-only Codex support be enabled together with mixed-runtime or treated separately?
- `Q-003` Should Stage 1 recipient behavior strictly auto-start recipient session (core parity) or fail-fast when recipient session is unavailable?
- `Q-004` Should `message_type` remain open string or be constrained to enum in Stage 1 delivery?

## Requirement Coverage Map

| requirement_id | covered_by_use_case_ids |
| --- | --- |
| R-001 | UC-001 |
| R-002 | UC-001, UC-005 |
| R-003 | UC-001 |
| R-004 | UC-002 |
| R-005 | UC-003 |
| R-006 | UC-004 |
| R-007 | UC-005 |
| R-008 | UC-006 |
| R-009 | UC-007 |
| R-010 | UC-001, UC-002, UC-003, UC-005 |
| R-011 | UC-008 |
| R-012 | UC-008, UC-010 |
| R-013 | UC-009 |
| R-014 | UC-009 |
| R-015 | UC-010 |
| R-016 | UC-008, UC-009, UC-010 |
| R-017 | UC-011 |
| R-018 | UC-012 |
| R-019 | UC-015 |
| R-020 | UC-016 |
| R-021 | UC-017 |
| R-022 | UC-018 |
| R-023 | UC-019 |

## Acceptance-Criteria Coverage Map To Stage 6 Scenarios

| acceptance_criteria_id | requirement_id | stage_6_scenario_id | validation_level (`API`/`E2E`) |
| --- | --- | --- | --- |
| AC-001 | R-001 | AV-001 | API |
| AC-002 | R-002 | AV-002 | API |
| AC-003 | R-003 | AV-003 | API |
| AC-004 | R-004 | AV-004 | API |
| AC-005 | R-005 | AV-005 | E2E |
| AC-006 | R-006 | AV-006 | E2E |
| AC-007 | R-007 | AV-007 | API |
| AC-008 | R-008 | AV-008 | API |
| AC-009 | R-009 | AV-009 | API |
| AC-010 | R-010 | AV-010 | API |
| AC-011 | R-011 | AV-011 | E2E |
| AC-012 | R-012 | AV-012 | API |
| AC-013 | R-013 | AV-013 | E2E |
| AC-014 | R-014 | AV-014 | E2E |
| AC-015 | R-015 | AV-015 | API |
| AC-016 | R-016 | AV-016 | Integration/E2E |
| AC-017 | R-017 | AV-017 | E2E |
| AC-018 | R-018 | AV-018 | Integration/E2E |
| AC-019 | R-019 | AV-019 | E2E |
| AC-020 | R-020 | AV-020 | API/E2E |
| AC-021 | R-021 | AV-021 | API/E2E |
| AC-022 | R-022 | AV-022 | API/E2E |
| AC-023 | R-023 | AV-023 | E2E |
