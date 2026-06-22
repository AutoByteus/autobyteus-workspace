# Future-State Runtime Call Stacks: MCP Nullable Schema Mapping

## Design Basis

- Scope Classification: Small
- Call Stack Version: v1
- Requirements: `tickets/done/mcp-nullable-schema-mapping/requirements.md` (Design-ready)
- Source Artifact: `tickets/done/mcp-nullable-schema-mapping/implementation.md` (solution sketch)
- Source Design Version: v1
- Referenced Sections:
  - `Solution Sketch`
  - `Spine Inventory In Scope`
  - `Implementation Work Table`

## Future-State Modeling Rule

This document models the target (`to-be`) mapper behavior after Stage 6 implementation. It is not an as-is trace of the current bug.

## Spine Inventory

| spine_id | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Configured MCP JSON Schema property | Agent Tools MCP-exposed input schema and local tool validation | `McpSchemaMapper` | Preserves upstream MCP array/object contracts through AutoByteus schema mapping. |
| DS-002 | Bounded Local | Single property union schema | Effective non-null schema or conservative original schema | `McpSchemaMapper.resolveEffectivePropertySchema(...)` | Provides safe nullable-single-type unwrapping without guessing complex unions. |
| DS-003 | Validation | Mapper fixture schemas | Vitest assertions and re-emitted JSON Schema output | `schema-mapper.test.ts` | Guards the regression with durable executable coverage. |

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001, DS-002, DS-003 | Primary End-to-End + Bounded Local + Validation | `McpSchemaMapper` | Requirement | R-001, R-002, R-005 | N/A | Nullable MCP array property maps/re-emits as array | Primary/Fallback/Error |
| UC-002 | DS-001, DS-002, DS-003 | Primary End-to-End + Bounded Local + Validation | `McpSchemaMapper` | Requirement | R-001, R-002, R-005 | N/A | Nullable MCP object property maps/re-emits as object | Primary/Fallback/Error |
| UC-003 | DS-001, DS-003 | Primary End-to-End + Validation | `McpSchemaMapper` | Requirement | R-003, R-005 | N/A | Existing direct type schemas preserve current behavior | Primary/Error |
| UC-004 | DS-002, DS-003 | Bounded Local + Validation | `McpSchemaMapper` | Design-Risk | R-004, R-005 | Avoid arbitrary branch selection for true multi-type unions. | Complex multi-non-null union remains conservative | Primary/Error |
| UC-005 | DS-002, DS-003 | Bounded Local + Validation | `McpSchemaMapper` | Requirement | R-001, R-002, R-005 | N/A | JSON Schema `type: ["array", "null"]` shorthand maps as array | Primary/Error |

## Transition Notes

- No temporary migration behavior is needed.
- No legacy/backward-compatibility branch is introduced.
- Existing fallback to string remains only for schemas the mapper still cannot faithfully represent, especially complex multi-non-null unions.

## Use Case: UC-001 Nullable MCP Array Property Maps/Re-Emits As Array

### Spine Context

- Spine ID(s): DS-001, DS-002, DS-003
- Spine Scope: Primary End-to-End + Bounded Local + Validation
- Governing Owner: `McpSchemaMapper`
- Why This Use Case Matters: This is the direct `generate_video.input_images` failure path.

### Goal

Map `anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }]` to an AutoByteus array parameter with string items and preserve `default: null`.

### Preconditions

- MCP server supplies an object root schema with property `input_images`.
- Property has nullable array union and optional default null.

### Expected Outcome

- `ParameterDefinition.type === ParameterType.ARRAY`.
- `ParameterDefinition.arrayItemSchema` is `{ type: "string" }`.
- `ParameterDefinition.defaultValue === null`.
- `ParameterSchema.toJsonSchema().properties.input_images.type === "array"`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/mcp/tool-registrar.ts:registerToolFromMcpDefinition(...)
├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(mcpJsonSchema)
│   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveEffectivePropertySchema(paramSchema)
│   │   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveNullableUnionSchema(paramSchema, "anyOf")
│   │   └── returns effective schema `{ type: "array", items: { type: "string" }, description, default }`
│   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveArrayItemSchema(effectiveParamSchema)
│   ├── autobyteus-ts/src/utils/parameter-schema.ts:ParameterDefinition.constructor({ type: ParameterType.ARRAY, arrayItemSchema }) [STATE]
│   └── autobyteus-ts/src/utils/parameter-schema.ts:ParameterSchema.addParameter(paramDef) [STATE]
├── autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-schema-mapper.ts:AgentToolsMcpSchemaMapper.toMcpInputSchema(argumentSchema)
│   └── autobyteus-ts/src/utils/parameter-schema.ts:ParameterSchema.toJsonSchema()
└── autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts:AgentToolMcpCatalog.toMcpToolDefinition(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if property is optional nullable array with no default
schema-mapper.ts:McpSchemaMapper.resolveEffectivePropertySchema(...)
└── returns effective array schema without forcing default; required flag still comes from root `required` list
```

```text
[ERROR] if root MCP schema is not object
schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(...)
└── throws `MCP JSON schema root 'type' must be 'object'`
```

### State And Data Transformations

- MCP JSON Schema nullable union -> effective array schema with outer metadata -> AutoByteus `ParameterDefinition` -> re-emitted JSON Schema array property.

### Observability And Debug Points

- Existing mapper errors remain thrown for invalid roots.
- Unit tests assert parameter type and re-emitted schema.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: No
- Tight coupling or cyclic dependency introduced: No
- Naming drift detected: No

### Coverage Status

- Primary Path: Covered
- Fallback Path: Covered
- Error Path: Covered

## Use Case: UC-002 Nullable MCP Object Property Maps/Re-Emits As Object

### Spine Context

- Spine ID(s): DS-001, DS-002, DS-003
- Spine Scope: Primary End-to-End + Bounded Local + Validation
- Governing Owner: `McpSchemaMapper`
- Why This Use Case Matters: `generation_config` currently maps to string even though providers expect object configuration.

### Goal

Map `anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }]` to an AutoByteus object parameter.

### Preconditions

- MCP property has nullable object union.
- The object may have no explicit `properties` and may use `additionalProperties: true`.

### Expected Outcome

- `ParameterDefinition.type === ParameterType.OBJECT`.
- `ParameterSchema.toJsonSchema().properties.generation_config.type === "object"`.
- The property is not re-emitted as string.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/mcp/tool-registrar.ts:registerToolFromMcpDefinition(...)
├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(mcpJsonSchema)
│   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveEffectivePropertySchema(paramSchema)
│   │   └── returns effective schema `{ type: "object", additionalProperties: true, description, default }`
│   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(effectiveParamSchema) [only if explicit nested properties exist]
│   ├── autobyteus-ts/src/utils/parameter-schema.ts:ParameterDefinition.constructor({ type: ParameterType.OBJECT, objectSchema? }) [STATE]
│   └── autobyteus-ts/src/utils/parameter-schema.ts:ParameterSchema.addParameter(paramDef) [STATE]
└── autobyteus-ts/src/utils/parameter-schema.ts:ParameterDefinition.toJsonSchemaProperty()
```

### Branching / Fallback Paths

```text
[FALLBACK] object branch has explicit nested properties
schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(effectiveObjectSchema)
└── recursively maps nested properties using their own required list
```

```text
[ERROR] malformed object branch has non-object `properties`
schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(effectiveObjectSchema)
└── returns empty nested ParameterSchema, matching existing nested-object behavior
```

### State And Data Transformations

- MCP nullable object union -> effective object schema with metadata -> AutoByteus object parameter -> re-emitted object JSON Schema property.

### Coverage Status

- Primary Path: Covered
- Fallback Path: Covered
- Error Path: Covered

## Use Case: UC-003 Existing Direct Type Schemas Preserve Current Behavior

### Spine Context

- Spine ID(s): DS-001, DS-003
- Spine Scope: Primary End-to-End + Validation
- Governing Owner: `McpSchemaMapper`
- Why This Use Case Matters: The fix must not regress already-supported direct schemas.

### Goal

Direct `type: "string"`, `"integer"`, `"boolean"`, `"array"`, and nested `"object"` schemas continue to map exactly as existing tests expect.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/tests/unit/tools/mcp/schema-mapper.test.ts:existing mapper tests
├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(mcpJsonSchema)
│   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveEffectivePropertySchema(paramSchema)
│   │   └── direct string `type` detected; returns original schema unchanged
│   ├── existing mapping via MCP_TYPE_TO_AUTOBYTEUS_TYPE_MAP
│   └── autobyteus-ts/src/utils/parameter-schema.ts:ParameterDefinition.constructor(...) [STATE]
└── vitest assertions pass
```

### Branching / Fallback Paths

```text
[ERROR] unsupported root schema type
schema-mapper.test.ts:rejects unsupported root schema types
└── schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(...) throws as before
```

### Coverage Status

- Primary Path: Covered
- Fallback Path: N/A
- Error Path: Covered

## Use Case: UC-004 Complex Multi-Non-Null Union Remains Conservative

### Spine Context

- Spine ID(s): DS-002, DS-003
- Spine Scope: Bounded Local + Validation
- Governing Owner: `McpSchemaMapper`
- Source Type: Design-Risk
- Risk Objective: Avoid creating a misleading schema by selecting one arbitrary branch from a true union.

### Goal

For `anyOf: [{ type: "array" }, { type: "string" }, { type: "null" }]`, the mapper must not select array or string branch just because one is present.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(mcpJsonSchema)
├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveEffectivePropertySchema(paramSchema)
│   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveNullableUnionSchema(paramSchema, "anyOf")
│   └── multiple non-null branches detected; returns original schema unchanged
├── mcpParamType is undefined because original schema has no direct string `type`
└── existing conservative fallback maps to `ParameterType.STRING`
```

### Branching / Fallback Paths

- N/A; this path intentionally preserves current fallback behavior for unsupported true unions.

### Coverage Status

- Primary Path: Covered
- Fallback Path: N/A
- Error Path: Covered by assertion that it is not array/object

## Use Case: UC-005 JSON Schema Type Array Shorthand Maps As Array

### Spine Context

- Spine ID(s): DS-002, DS-003
- Spine Scope: Bounded Local + Validation
- Governing Owner: `McpSchemaMapper`
- Why This Use Case Matters: Some JSON Schema emitters use `type: ["array", "null"]` instead of `anyOf`.

### Goal

Resolve a property with `type: ["array", "null"]` and `items: { type: "string" }` as an array parameter.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.mapToAutobyteusSchema(mcpJsonSchema)
├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveEffectivePropertySchema(paramSchema)
│   ├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveNullableTypeArraySchema(paramSchema)
│   └── returns schema copy with `type: "array"`
├── autobyteus-ts/src/tools/mcp/schema-mapper.ts:McpSchemaMapper.resolveArrayItemSchema(effectiveParamSchema)
└── autobyteus-ts/src/utils/parameter-schema.ts:ParameterDefinition.constructor({ type: ParameterType.ARRAY, arrayItemSchema }) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] type array has multiple non-null types, e.g. `["array", "string", "null"]`
schema-mapper.ts:McpSchemaMapper.resolveNullableTypeArraySchema(...)
└── returns original schema unchanged; existing fallback behavior applies
```

### Coverage Status

- Primary Path: Covered
- Fallback Path: N/A
- Error Path: Covered
