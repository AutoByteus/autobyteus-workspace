# Requirements: MCP Nullable Schema Mapping

- Status: Design-ready
- Date: 2026-06-22
- Ticket: mcp-nullable-schema-mapping
- Scope Classification: Small

## Goal / Problem Statement

Configured MCP tools whose JSON Schema uses nullable unions must keep their real non-null type when AutoByteus TypeScript maps MCP tool schemas into AutoByteus `ParameterSchema`. The active bug maps schemas such as `anyOf: [{ type: "array" }, { type: "null" }]` to `ParameterType.STRING`, causing configured MCP `generate_video.input_images` to be exposed and validated as a string instead of an optional array of strings.

## In-Scope Use Cases

| use_case_id | Source | Description | Primary Expected Outcome |
| --- | --- | --- | --- |
| UC-001 | Requirement | Map a configured MCP media schema where `input_images`, `input_audios`, and `input_videos` are nullable arrays of strings. | AutoByteus `ParameterSchema` parameters are arrays and re-emitted JSON Schema properties are `type: "array"` with string items. |
| UC-002 | Requirement | Map a configured MCP schema where `generation_config` is a nullable object with additional properties. | AutoByteus `ParameterSchema` parameter is object and re-emitted JSON Schema property is object-like, not string. |
| UC-003 | Requirement | Preserve existing mapping behavior for non-union primitive, enum, array, and nested-object schemas. | Existing mapper tests continue to pass unchanged. |
| UC-004 | Design-Risk | Encounter complex unions with multiple non-null branches. | Mapper does not aggressively guess one branch; only nullable single non-null unions are unwrapped. |
| UC-005 | Requirement | Accept JSON Schema shorthand `type: ["array", "null"]` for nullable single-type schemas. | Mapper resolves the non-null type and preserves related schema details such as `items`. |

## Requirements

| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| R-001 | The TypeScript MCP schema mapper must resolve nullable `anyOf`/`oneOf` schemas with exactly one non-null branch before selecting the AutoByteus parameter type. | Nullable array/object schemas map to their non-null branch type rather than falling back to string. |
| R-002 | The mapper must preserve relevant schema metadata from the outer property when unwrapping nullable unions. | Description, default value, enum/min/max/pattern metadata, and array item schemas remain available to `ParameterDefinition` where applicable. |
| R-003 | The mapper must preserve current behavior for existing direct `type` schemas. | Existing unit tests for primitive, enum, array, nested object, and root-type validation pass. |
| R-004 | The mapper must not implement broad lossy guessing for complex multi-branch unions. | Multi-non-null unions continue to avoid accidental coercion to an arbitrary branch. |
| R-005 | Durable tests must cover nullable array/object MCP schema mapping and JSON Schema re-emission. | The regression is guarded by unit tests in the mapper test suite. |

## Acceptance Criteria

| acceptance_criteria_id | Requirement(s) | Expected, Testable Outcome | Stage 7 Scenario Intent |
| --- | --- | --- | --- |
| AC-001 | R-001, R-002, R-005 | Given `input_images` with `anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }]`, mapper returns `ParameterType.ARRAY`, preserves `defaultValue: null`, and `toJsonSchema()` emits a property with `type: "array"` and string items. | SCN-001 unit validation |
| AC-002 | R-001, R-002, R-005 | Given `generation_config` with nullable object `anyOf`, mapper returns `ParameterType.OBJECT` and `toJsonSchema()` emits `type: "object"`, not `type: "string"`. | SCN-002 unit validation |
| AC-003 | R-003 | Existing mapper tests for direct primitive/enum/array/object schemas pass. | SCN-003 regression suite |
| AC-004 | R-004 | Given an `anyOf` schema with more than one non-null branch, mapper does not silently select one arbitrary branch as array/object. | SCN-004 unit validation |
| AC-005 | R-001, R-002, R-005 | Given `type: ["array", "null"]` with string `items`, mapper returns `ParameterType.ARRAY` and preserves items. | SCN-005 unit validation |

## Constraints / Dependencies

- Active fix scope is `autobyteus-ts`; the downstream Python MCP schema and RPA video server contracts are already list/object-compatible.
- No source code edits are allowed until Stage 6 unlocks in `workflow-state.md`.
- The ticket should avoid broad compatibility wrappers or legacy dual-path behavior; fix the mapper directly.
- The fresh ticket worktree does not currently have Node dependencies installed; validation will need dependency installation or available workspace tooling.

## Assumptions

- JSON Schema `anyOf`/`oneOf` with exactly one non-null branch is a nullable single-type schema and should use that non-null branch for AutoByteus typing.
- JSON Schema `type: ["T", "null"]` should be treated equivalently to nullable single-type schema shorthand.
- For nullable object schemas with `additionalProperties: true` and no explicit properties, re-emitting `type: "object"` is sufficient because JSON Schema permits additional properties by default unless explicitly false.

## Open Questions / Risks

- Python `autobyteus` has an analogous mapper pattern; this ticket records it as a parity follow-up unless user expands scope.
- If some configured MCP tools rely on complex multi-non-null unions, future work may need a richer `ParameterSchema` union representation. This ticket intentionally avoids guessing.

## Requirement-to-Use-Case Coverage

| requirement_id | Covered Use Cases |
| --- | --- |
| R-001 | UC-001, UC-002, UC-005 |
| R-002 | UC-001, UC-002, UC-005 |
| R-003 | UC-003 |
| R-004 | UC-004 |
| R-005 | UC-001, UC-002, UC-003, UC-004, UC-005 |

## Acceptance-Criteria-to-Scenario Map

| acceptance_criteria_id | Planned Stage 7 Scenario(s) |
| --- | --- |
| AC-001 | SCN-001 |
| AC-002 | SCN-002 |
| AC-003 | SCN-003 |
| AC-004 | SCN-004 |
| AC-005 | SCN-005 |

## Triage Rationale

Small: one source mapper and its existing unit test suite are the core scope. No new runtime service boundary, storage contract, network endpoint, or UI flow is required.
