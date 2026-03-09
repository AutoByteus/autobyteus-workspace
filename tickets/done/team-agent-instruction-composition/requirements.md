# Requirements

- Ticket: `team-agent-instruction-composition`
- Status: `Design-ready`
- Scope: `Medium`
- Scope Rationale: The change crosses team-runtime bootstrap, shared runtime metadata, and two member-runtime adapters (`codex_app_server`, `claude_agent_sdk`) that currently compose instruction text independently.

## Goal / Problem Statement

For member-runtime team sessions, the effective instruction context for each current agent must be derived from two persisted definition sources:

1. the team definition instructions for the current team run, and
2. the current agent definition instructions for that member.

Today Codex and Claude do not use those two sources as the main instruction content. Instead, they generate runtime-owned hard-coded guidance strings for teammate awareness and `send_message_to`. The desired behavior is to make definition-derived instructions the canonical source, while keeping teammate/tool constraints as a separate runtime-generated adjunct.

## In-Scope Use Cases

| Use Case ID | Description | Expected Outcome |
| --- | --- | --- |
| UC-001 | Create or restore member-runtime bootstrap metadata for a team member | Runtime metadata contains enough definition-derived information to build the member’s effective instruction context without hard-coded runtime-owned prompt text being the primary source |
| UC-002 | Start or resume a Codex member-runtime thread for a team member | Codex receives definition-derived instruction content for that member and only uses runtime-generated text for teammate/tool constraints |
| UC-003 | Send a Claude member-runtime turn for a team member | Claude receives definition-derived instruction content for that member and only uses runtime-generated text for teammate/tool constraints |
| UC-004 | A member delegates work with `send_message_to` | Recipient restrictions and teammate visibility still match the active team manifest after the instruction refactor |
| UC-005 | Team instructions or agent instructions are empty/unavailable | The effective instruction context degrades deterministically to the available source(s) without inventing unrelated hard-coded persona text |

## Requirements

| Requirement ID | Requirement | Expected Outcome |
| --- | --- | --- |
| R-001 | Member-runtime bootstrap must resolve the current team definition instructions for the active team run | Team-level collaboration guidance is available as a first-class input to runtime instruction composition |
| R-002 | Member-runtime bootstrap must resolve the current member agent instruction body for the active agent definition | Agent-specific operating guidance is available as a first-class input to runtime instruction composition |
| R-003 | The effective member-runtime instruction contract must include both sources for the current member, not just one or neither | Each team member runtime gets instruction content that reflects both team-level and agent-level intent |
| R-004 | Runtime-generated teammate/tool guidance must remain separate from definition-derived instructions | Tool availability, recipient restrictions, and teammate naming stay accurate without replacing the canonical instruction sources |
| R-005 | Codex and Claude must consume one shared server-side instruction composition contract | Cross-runtime behavior stays aligned and future changes do not require duplicating prompt-shaping logic in both adapters |
| R-006 | Missing instruction sources must degrade predictably | If team instructions or agent instructions are unavailable, the runtime uses the remaining source(s) plus minimal runtime constraints and does not synthesize unrelated hard-coded role/persona text |
| R-007 | The change must not preserve the current hard-coded instruction behavior as a compatibility fallback path | The runtime transitions cleanly to the new composition contract without dual-path legacy prompt behavior |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID(s) | Measurable Expected Outcome |
| --- | --- | --- |
| AC-001 | R-001, R-002, R-003 | Member-runtime bootstrap persists or passes a shared instruction-source contract for the current team member that includes both team instructions and current agent instructions when available |
| AC-002 | R-004, R-005 | Codex no longer relies on `renderTeamManifestDeveloperInstructions()` as the primary instruction source; it maps shared definition-derived content plus separate runtime constraints into the Codex thread instruction fields |
| AC-003 | R-004, R-005 | Claude no longer relies on `renderTeamManifestSystemPromptAppend()` as the primary instruction source; it maps shared definition-derived content plus separate runtime constraints into the Claude turn/session input path |
| AC-004 | R-004 | `send_message_to` enablement, teammate list visibility, and recipient validation continue to reflect the active team manifest after the refactor |
| AC-005 | R-006 | If either instruction source is absent, the produced instruction context contains the available source(s), excludes fabricated persona text, and still preserves runtime teammate/tool truthfulness |
| AC-006 | R-007 | No compatibility wrapper or dual prompt-composition path remains that keeps the old runtime-owned hard-coded instruction block as an equal first-class path |

## Constraints / Dependencies

- `AgentDefinition.instructions` already exists and is loaded from `agent.md` through `prompt-loader.ts`.
- `AgentTeamDefinition.instructions` already exists and is loaded from `team.md` through the team-definition provider/service path.
- Team member runtime session bootstrap currently happens in `team-member-runtime-session-lifecycle-service.ts`.
- Codex currently passes `baseInstructions: null` and only sets `developerInstructions`.
- Claude currently injects runtime-owned `<team_context>` text per turn and exposes `send_message_to` through MCP tooling.
- Existing teammate manifest handling and recipient validation must remain accurate.

## Assumptions

- Team definition instructions are intended to apply to all member-runtime agents in that team run, not only the coordinator.
- The “current agent instruction” means the instruction body for the specific member agent currently being bootstrapped or sent a turn.
- Minimal runtime-generated adjunct text is still acceptable when it is limited to factual teammate/tool constraints and does not replace definition-derived instructions.

## Open Questions / Risks

- Whether Codex should map the shared contract into `baseInstructions + developerInstructions` or a precomposed single string plus adjunct.
- Whether Claude should continue turn-level wrapping or gain a cleaner session-level prompt field if the SDK exposes one later.
- Whether the restore path should persist raw instruction sources in runtime metadata or re-resolve them from definitions on each restore.

## Requirement Coverage Map

| Requirement ID | Mapped Use Cases |
| --- | --- |
| R-001 | UC-001, UC-002, UC-003 |
| R-002 | UC-001, UC-002, UC-003 |
| R-003 | UC-001, UC-002, UC-003 |
| R-004 | UC-002, UC-003, UC-004 |
| R-005 | UC-002, UC-003 |
| R-006 | UC-005 |
| R-007 | UC-002, UC-003 |

## Acceptance Criteria Coverage Map

| Acceptance Criteria ID | Planned Stage 7 Scenario IDs |
| --- | --- |
| AC-001 | S7-001 |
| AC-002 | S7-002 |
| AC-003 | S7-003 |
| AC-004 | S7-004 |
| AC-005 | S7-005 |
| AC-006 | S7-006 |
