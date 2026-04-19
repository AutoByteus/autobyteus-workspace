# Requirements

- Ticket: `xml-tool-array-parser-fix`
- Status: `Design-ready`
- Last Updated: `2026-04-19`
- Scope Classification: `Small`
- Scope Classification Rationale: The defect is confined to the XML parsing adapter, its handler wiring, and its tests. The MCP schema and downstream tool implementation are already correct.

## Goal / Problem Statement

`autobyteus-ts` documents XML list arguments as repeated `<item>` tags, but the XML tool-call parser originally handled arrays heuristically and without schema awareness. That caused array-typed MCP inputs like `video_editing_concatenate_audios.audio_paths` to parse into malformed objects such as `{ item: "last-value" }`, and it also left no schema-driven way to preserve nested XML as a string when a tool parameter explicitly expects `string`.

## In-Scope Use Cases

| Use Case ID | Description | Why In Scope |
| --- | --- | --- |
| `UC-001` | Parse scalar XML list arguments encoded as repeated `<item>` tags under one `<arg>` | This is the documented XML array contract and the failing behavior |
| `UC-002` | Execute an MCP-backed tool whose input schema expects `array[string]` using XML arguments | This is the concrete repro path for `video_editing_concatenate_audios.audio_paths` |
| `UC-003` | Preserve existing scalar XML argument parsing for non-array values | The fix must not regress working XML tool calls |
| `UC-004` | Use the tool schema to preserve nested XML markup as a raw string when a parameter expects `string` | This proves XML coercion is driven by declared parameter type rather than by generic tag-shape guessing |

## Requirements

| Requirement ID | Requirement | Covered Use Cases |
| --- | --- | --- |
| `REQ-001` | The XML tool-call argument parser must convert repeated `<item>` elements nested under a single argument into a JavaScript array in output argument objects. | `UC-001`, `UC-002` |
| `REQ-002` | Scalar values inside XML `<item>` elements must remain decoded string values in the resulting array. | `UC-001`, `UC-002` |
| `REQ-003` | Parsed XML array arguments must satisfy Autobyteus tool schema validation for array-typed parameters, including MCP-derived schemas. | `UC-002` |
| `REQ-004` | Existing XML parsing behavior for simple scalar non-array arguments must remain unchanged. | `UC-003` |
| `REQ-005` | Automated tests must cover the previously failing XML array parsing behavior and protect against regression. | `UC-001`, `UC-002`, `UC-003` |
| `REQ-006` | When a tool argument schema is available, XML arguments must be coerced according to declared parameter type instead of relying only on generic repeated-tag heuristics. | `UC-001`, `UC-002`, `UC-004` |
| `REQ-007` | When a parameter schema expects `string`, nested XML inside that argument must be preserved as raw inner XML string content rather than converted into an object shape. | `UC-004` |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Criterion |
| --- | --- | --- |
| `AC-001` | `REQ-001` | Parsing XML like `<arguments><arg name="audio_paths"><item>a</item><item>b</item></arg></arguments>` returns `{ audio_paths: ["a", "b"] }`. |
| `AC-002` | `REQ-002` | XML entities inside scalar `<item>` values are decoded and preserved as strings in the returned array values. |
| `AC-003` | `REQ-003` | A tool schema expecting an array accepts the parsed XML list without the `Expected type compatible with array` validation error. |
| `AC-004` | `REQ-004` | Existing unit coverage for scalar XML arguments continues to pass unchanged after the fix. |
| `AC-005` | `REQ-005` | New automated tests fail on the pre-fix parser behavior and pass after the implementation change. |
| `AC-006` | `REQ-006` | When the tool schema is available in the streaming flow, XML arguments are coerced by declared type for local tools and registry-backed tools alike. |
| `AC-007` | `REQ-007` | Parsing XML like `<arg name="markup"><root><item>1</item></root></arg>` for a `string` parameter returns the raw inner XML string `<root><item>1</item></root>`. |

## Constraints / Dependencies

- The fix should be applied in `autobyteus-ts`, not in the video MCP server.
- The parser output must remain compatible with the existing `ToolInvocationAdapter` and `BaseTool` validation flow.
- XML array behavior must align with the contract already presented to models in the XML tool manifest and example formatter.
- Schema-aware coercion must work for tools that exist only in the current agent context, not just for tools registered in the global tool registry.

## Assumptions

- The immediate required scope includes the concrete scalar-array repro and the schema-aware coercion path needed to avoid type-blind XML guesses when the tool schema is available.
- MCP tool schemas fetched through `FastMCP` remain the source of truth for downstream parameter types.
- No backward-compatibility path should preserve the current malformed `{ item: "last" }` shape for array arguments.

## Open Questions / Risks

- Open Question: Whether nested object arrays beyond the currently exercised shapes should be expanded further in a future ticket.
- Risk: The XML syntax accepted by the streaming parser is intentionally tolerant rather than strict XML, so schema-aware coercion must stay compatible with that tolerant surface.

## Requirement-To-Use-Case Coverage

| Use Case ID | Covered By Requirement IDs |
| --- | --- |
| `UC-001` | `REQ-001`, `REQ-002`, `REQ-005` |
| `UC-002` | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-005`, `REQ-006` |
| `UC-003` | `REQ-004`, `REQ-005` |
| `UC-004` | `REQ-006`, `REQ-007` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Direct parser unit scenario for scalar XML list input |
| `AC-002` | Parser unit scenario for XML entity decoding inside list items |
| `AC-003` | Validation-path scenario showing array-typed tool arguments survive schema checks |
| `AC-004` | Regression scenario for existing scalar XML parsing behavior |
| `AC-005` | Durable automated test coverage across the changed parser path |
| `AC-006` | Streaming-path scenario proving schema-aware coercion is used when the tool schema is available |
| `AC-007` | Parser and agent-flow scenario proving nested XML is preserved as string content for `string` parameters |

## Non-Goals

- Redesigning the full tool-call format away from XML
- Refactoring unrelated MCP tools or the video MCP server implementation
