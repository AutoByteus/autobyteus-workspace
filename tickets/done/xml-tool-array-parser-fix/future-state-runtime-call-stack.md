# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/xml-tool-array-parser-fix/requirements.md`
- Source Artifact:
  - `Small`: `tickets/in-progress/xml-tool-array-parser-fix/implementation.md`
- Source Design Version: `v2`

## Use Case Index

| use_case_id | Spine ID(s) | Governing Owner | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `parseXmlArguments` | `REQ-001`, `REQ-002`, `REQ-005` | Parse repeated scalar `<item>` tags into arrays | Primary |
| `UC-002` | `DS-002`, `DS-003` | `ToolInvocationAdapter` + `BaseTool.execute` | `REQ-003`, `REQ-005`, `REQ-006` | Carry schema-aware XML arrays from the streaming flow into tool validation and execution readiness | Primary |
| `UC-003` | `DS-001` | `parseXmlArguments` | `REQ-004`, `REQ-005` | Preserve scalar XML behavior when array/schema rules do not apply | Primary |
| `UC-004` | `DS-003` | `parseXmlArguments` | `REQ-006`, `REQ-007` | Preserve nested XML as raw string content when the schema expects `string` | Primary |

## Transition Notes

- The authoritative public boundary remains `parseXmlArguments()` in `tool-call-parsing.ts`.
- Schema-aware XML node parsing and coercion are extracted into `xml-schema-coercion.ts` so the boundary stays readable and the changed source files satisfy the Stage 8 size gate.
- Heuristic parsing remains a fallback only when no schema is available.

## Use Case: UC-001 [Repeated Scalar `<item>` Array Parsing]

### Goal

Convert repeated scalar `<item>` children under one `<arg>` into a JavaScript array of decoded strings.

### Primary Runtime Call Stack

```text
[ENTRY] ToolInvocationAdapter.handleEnd(...)
├── parseXmlArguments(content, argumentSchema)
│   ├── extractArgsContent(content)
│   ├── parseXmlArgumentsWithSchema(argsContent, argumentSchema)    [schema-aware path when schema exists]
│   │   ├── parseXmlContent(argsContent)
│   │   ├── coerceNamedElements(elements, schema)
│   │   └── coerceArrayValue(audio_paths, arrayDefinition)
│   └── parseXmlFragment(argsContent)                               [heuristic fallback when schema is absent]
└── return ToolInvocation(toolName, argumentsValue, ...)
```

### Expected Outcome

- `audio_paths` becomes `string[]`
- XML entities inside `<item>` values are decoded once

## Use Case: UC-002 [Schema-Aware XML Validation Compatibility]

### Goal

Ensure XML array arguments survive the full streaming flow, schema coercion, and `BaseTool` validation for both registry-backed and local tools.

### Primary Runtime Call Stack

```text
[ENTRY] LLMUserMessageReadyEventHandler.handle(...)
├── toolArgumentSchemaResolver(toolName)
├── StreamingResponseHandlerFactory.create(..., xmlArgumentSchemaResolver)
├── ParsingStreamingResponseHandler(...)
├── ToolInvocationAdapter.handleEnd(...)
│   ├── xmlArgumentSchemaResolver(toolName)
│   ├── parseXmlArguments(content, argumentSchema)
│   └── return ToolInvocation(...)
├── BaseTool.execute(context, args)
│   ├── coerceArgumentTypes(args)
│   └── validateAgainstSchema(schema, coercedArgs)
└── tool _execute(...)
```

### Expected Outcome

- XML array inputs pass `Array.isArray(...)` validation
- The same path works for MCP-derived schemas and agent-local tool schemas

## Use Case: UC-003 [Scalar Non-Array Regression Safety]

### Goal

Keep simple scalar XML arguments returning scalar strings after the array and schema-aware changes.

### Primary Runtime Call Stack

```text
[ENTRY] ToolInvocationAdapter.handleEnd(...)
├── parseXmlArguments(content, argumentSchema)
│   ├── parseXmlArgumentsWithSchema(argsContent, argumentSchema)    [returns scalar when schema says scalar]
│   ├── parseXmlFragment(argsContent)                               [heuristic fallback]
│   └── parseLegacyArguments(argsContent)                           [last fallback]
└── return ToolInvocation(...)
```

### Expected Outcome

- Existing scalar XML calls remain scalar
- No validator-side XML repair logic is required

## Use Case: UC-004 [Nested XML Raw String Preservation]

### Goal

Preserve nested XML as raw inner markup when the declared parameter type is `string`.

### Primary Runtime Call Stack

```text
[ENTRY] LLMUserMessageReadyEventHandler.handle(...)
├── toolArgumentSchemaResolver("write_markup")
├── ToolInvocationAdapter.handleEnd(...)
│   ├── parseXmlArguments(content, argumentSchema)
│   │   ├── parseXmlArgumentsWithSchema(argsContent, argumentSchema)
│   │   ├── coerceNamedElements(elements, schema)
│   │   └── coerceStringValue(markupNode)                           [returns rawInner]
│   └── return ToolInvocation(...)
├── BaseTool.execute(context, args)
└── local tool receives markup = "<root><item>1</item><item>2</item></root>"
```

### Expected Outcome

- Nested XML string content is preserved exactly
- Array coercion does not incorrectly reinterpret nested markup when schema says `string`

