# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Improve the Tools UI so object parameters such as `generate_speech.generation_config` show their nested model-specific fields. When the default speech generation model is `OpenAI / gpt-4o-mini-tts`, the current Tool Details modal shows only a generic `generation_config` object row, hiding valid nested fields such as `voice`, `format`, and `instructions`. The UI should make those nested fields discoverable without changing the actual tool invocation contract.

## Investigation Findings

- The current persisted server setting is `DEFAULT_SPEECH_GENERATION_MODEL=gpt-4o-mini-tts`.
- The live audio model catalog exposes `gpt-4o-mini-tts.configSchema.properties.voice`, plus `format` and `instructions`.
- The live `generate_speech` local tool schema exposes a top-level `generation_config` object parameter for configured `gpt-4o-mini-tts`.
- The GraphQL tool definition DTO currently returns only flat parameter fields (`name`, `paramType`, `description`, `required`, `defaultValue`, `enumValues`) and drops nested `objectSchema`/JSON-schema properties.
- `ToolDetailsModal.vue` renders only the flat `argumentSchema.parameters` array, so it has no data or UI path to show `generation_config.voice`.
- Runtime Agent Tools MCP schema cache behavior is intentionally out of scope for this ticket; this ticket targets the frontend/tool-details visibility gap only.
- Architecture review found that the reload path must explicitly synchronize the open Tool Details modal after the store immutably replaces a tool object. `ToolsManagementWorkspace.vue` owns the selected tool reference and must update it from the reload result so the modal rerenders without close/reopen.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / UX Improvement
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, small and schema-boundary-local
- Evidence basis: The backend `ParameterSchema` can render nested object JSON schema, but the GraphQL `ToolParameterDefinition` and frontend `ToolParameter` types omit nested schema fields. The UI only renders flat rows.
- Requirement or scope impact: The fix must preserve the real invocation contract (`generation_config: { voice: ... }`) while expanding the schema projection/UI display enough to show nested object properties.

## Recommendations

- Extend the GraphQL tool schema projection to include either:
  - a `jsonSchema`/`schema` field on each parameter containing the JSON Schema property for that parameter, or
  - explicit nested object/array parameter fields that can represent object properties recursively.
- Prefer preserving semantic shape over flattening. Do not promote `generation_config.voice` to a top-level `voice` parameter.
- Update frontend generated GraphQL/types/store interfaces and `ToolDetailsModal.vue` to render nested object parameters under their owning object parameter, using indentation or a collapsible/sectioned display.
- Add regression coverage proving `generate_speech` with `gpt-4o-mini-tts` can display `generation_config.voice` and its enum values.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user opens Tool Details for `generate_speech` while `gpt-4o-mini-tts` is the configured speech model and sees nested `generation_config` options including `voice`, `format`, and `instructions`.
- UC-002: A user can tell from the UI that `voice` belongs inside `generation_config`, not as a top-level argument.
- UC-003: Existing flat tool parameters for other tools remain readable and unchanged in behavior.

## Out of Scope

- Changing the runtime invocation format for `generate_speech`.
- Flattening model-specific generation options into top-level tool arguments.
- Fixing or changing Agent Tools MCP runtime schema cache behavior.
- Updating OpenAI voice enum freshness beyond what the existing model catalog currently exposes.
- Executing real OpenAI paid speech generation calls.

## Functional Requirements

- REQ-001: The backend tool-definition GraphQL projection must expose enough nested schema data for object parameters to render object properties such as `generation_config.voice`.
- REQ-002: The frontend Tool Details modal must render nested object properties under the parent object parameter, preserving the parent-child relationship.
- REQ-003: Nested properties must show the same core metadata available for flat parameters where present: name, type, required status, description, default, and enum values.
- REQ-004: The UI must not imply that nested object properties are top-level invocation arguments.
- REQ-005: Existing flat parameter display and reload-schema behavior must continue to work.
- REQ-006: When Reload Schema succeeds while Tool Details remains open, the modal must display the returned updated schema without requiring the user to close and reopen it.

## Acceptance Criteria

- AC-001: With `DEFAULT_SPEECH_GENERATION_MODEL=gpt-4o-mini-tts`, Tool Details for `generate_speech` shows `generation_config` and nested entries for `voice`, `format`, and `instructions`.
- AC-002: `generation_config.voice` displays as nested under `generation_config` and includes its enum values from the model schema.
- AC-003: The displayed invocation relationship remains accurate: users can infer they should pass `{ generation_config: { voice: "..." } }`, not `{ voice: "..." }`.
- AC-004: Tools with only flat parameters still render their parameter table correctly.
- AC-005: Reload Schema continues to refresh the displayed tool metadata in the modal.
- AC-006: Backend and frontend tests cover nested object schema projection/rendering for at least one representative object parameter.
- AC-007: In an already-open Tool Details modal, after Reload Schema returns a tool whose `generation_config.jsonSchema` contains nested `voice`, the visible modal displays the updated nested `voice` row without close/reopen.

## Constraints / Dependencies

- The source of truth remains `ParameterSchema` / JSON Schema generated from current tool definitions.
- The GraphQL schema, generated frontend GraphQL types, store types, Tool Details modal, and parent workspace selected-tool state must remain aligned.
- Existing GraphQL consumers of `ToolParameterDefinition` should not be broken unnecessarily.

## Assumptions

- The user-facing missing-field complaint is about the Tools UI screenshot showing only a generic `generation_config` object row.
- It is acceptable for runtime Agent Tools MCP schema refresh behavior to remain unchanged for this ticket.
- Nested object display can be implemented without changing the tool execution parser, because `generation_config` already accepts arbitrary object values.

## Risks / Open Questions

- The design chooses full JSON Schema per parameter instead of recursive GraphQL parameter types; implementation must keep frontend parsing bounded and graceful for unsupported JSON Schema constructs.
- Need confirm whether any frontend generated GraphQL workflow must be run after schema changes.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002
- REQ-002 -> UC-001, UC-002
- REQ-003 -> UC-001
- REQ-004 -> UC-002
- REQ-005 -> UC-003
- REQ-006 -> UC-001, UC-003

## Acceptance-Criteria-To-Scenario Intent

- AC-001 verifies the specific reported `generate_speech`/OpenAI TTS scenario.
- AC-002 verifies model-specific enum metadata is visible.
- AC-003 verifies contract fidelity.
- AC-004 guards against regressions for existing flat tools.
- AC-005 guards the existing reload workflow.
- AC-006 ensures durable coverage for backend projection and frontend rendering.
- AC-007 guards the open-modal reload/rerender path so the displayed selected tool cannot remain a stale object after immutable store updates.

## Approval Status

Approved by user on 2026-06-20 in conversation: "approve". Refined after architecture review AR-001 to make the already-required reload refresh behavior explicit; no runtime MCP-cache scope was added.
