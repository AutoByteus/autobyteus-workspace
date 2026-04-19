# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning: The defect stays within the XML tool-call parsing path, the agent streaming handler wiring that supplies tool schemas, and the validation tests around that path.
- Workflow Depth:
  - `Small` -> `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review -> source implementation -> executable validation -> code review

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/xml-tool-array-parser-fix/workflow-state.md`
- Investigation notes: `tickets/in-progress/xml-tool-array-parser-fix/investigation-notes.md`
- Requirements: `tickets/in-progress/xml-tool-array-parser-fix/requirements.md`
- Runtime call stacks: `tickets/in-progress/xml-tool-array-parser-fix/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/xml-tool-array-parser-fix/future-state-runtime-call-stack-review.md`
- Proposed design (`Medium/Large` only): `N/A`

## Document Status

- Current Status: `In Execution`
- Notes: Stage 6 source work is complete. Schema-driven XML coercion, agent-local schema resolution, and the parser-local extraction all landed in the worktree and passed the focused validation slice.

## Plan Baseline

### Solution Sketch

- Use Cases In Scope:
  - `UC-001` Parse repeated scalar `<item>` elements into arrays
  - `UC-002` Preserve array-typed tool validation and execution readiness for XML-driven tool calls
  - `UC-003` Preserve scalar XML parsing behavior for non-array inputs
  - `UC-004` Preserve nested XML markup as raw string content when the tool schema expects `string`
- Spine Inventory In Scope:
  - `DS-001` XML argument normalization and heuristic fallback at the authoritative parser boundary
  - `DS-002` Tool-schema validation and execution readiness after XML coercion
  - `DS-003` Schema-aware XML coercion plus agent-local tool-schema resolution for XML streaming flows
- Primary Owners / Main Domain Subjects:
  - `tool-call-parsing.ts` owns the public XML parsing boundary used by tool invocation handling
  - `xml-schema-coercion.ts` owns tolerant XML node parsing plus schema-driven coercion details under that boundary
  - `LLMUserMessageReadyEventHandler` plus streaming handler factory/adapter wiring own supplying tool schemas for XML parsing
  - `BaseTool.execute` owns final schema validation and rejects malformed argument shapes
- Requirement Coverage Guarantee:
  - `REQ-001`, `REQ-002` -> `UC-001`, `UC-002`
  - `REQ-003` -> `UC-002`
  - `REQ-004` -> `UC-003`
  - `REQ-005` -> `UC-001`, `UC-002`, `UC-003`, `UC-004`
  - `REQ-006`, `REQ-007` -> `UC-002`, `UC-004`
- Design-Risk Use Cases:
  - `DR-001` The XML surface accepted by the streaming parser is intentionally tolerant, so the schema-aware branch cannot depend on a strict XML library that would reject common LLM pseudo-XML.
- Target Architecture Shape:
  - Keep `parseXmlArguments()` as the single public boundary for XML argument parsing.
  - Extract tolerant XML node parsing and schema-driven coercion into a parser-local helper module so the public parser file stays under the workflow size gate.
  - Resolve argument schemas from both registry-backed tools and agent-local tool instances before XML parsing.
  - Preserve heuristic XML parsing fallback only when no schema is available.
  - Preserve raw nested XML strings when the declared parameter type is `string`.
- API / Behavior Delta:
  - XML `<arg>` blocks with repeated `<item>` children become JavaScript arrays.
  - When schema is available, XML values are coerced by declared type rather than by tag-shape guessing alone.
  - Nested XML under string-typed parameters is preserved as raw inner XML string content.
  - Existing scalar XML arguments remain scalar when schema is absent or scalar.
- Known Risks:
  - Nested object-array XML beyond the explicit ticket scope still depends on tolerant heuristics and is not fully generalized here.
  - The public parser boundary must stay readable even after schema-aware coercion; otherwise the fix would simply move ad hoc complexity into one large file.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 2 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |
| 3 | Fail | Yes | Yes (`UC-004`) | Yes | `Requirement Gap` | `2 -> 3 -> 4 -> 5` | `Reset` | 0 |
| 4 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 5 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Latest review round: `5`
  - Clean streak at latest round: `2`
  - Implementation can start: `Yes`

## Principles

- Keep the authoritative parser boundary singular: callers continue to use `parseXmlArguments()` only.
- Prefer schema-aware coercion when the tool schema is available; use heuristics only as fallback.
- Use the file-size gate as a real design constraint, not a paperwork exception.
- Do not push XML recovery logic into `BaseTool`, MCP tools, or downstream validators.
- Add durable tests at parser, adapter, validation, and deterministic agent-flow levels.
- Do not preserve the malformed `{ item: "last" }` array shape for backward compatibility.

## Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-003` | Parser-local XML coercion module | `autobyteus-ts/src/agent/streaming/adapters/xml-schema-coercion.ts` | Stage 5 `Go Confirmed` | The schema-aware coercion logic should live behind the parser boundary in a dedicated, readable unit |
| 2 | `DS-001`, `DS-003` | Public parser boundary | `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts` | `xml-schema-coercion.ts` | The public parser delegates schema-aware coercion and keeps heuristic fallback intact |
| 3 | `DS-003` | Schema wiring | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`, `autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts`, `autobyteus-ts/src/agent/streaming/handlers/parsing-streaming-response-handler.ts`, `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts` | Parser contract | XML parsing needs the right tool schema for both registry-backed and local tools |
| 4 | `DS-001`, `DS-003` | Parser and adapter regression coverage | `autobyteus-ts/tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/parser/invocation-adapter.test.ts` | Source changes | Prove schema-aware coercion and fallback behavior at the boundary |
| 5 | `DS-002` | Validation-path confidence | `autobyteus-ts/tests/unit/tools/base-tool.test.ts` | Parser output correctness | Prove XML-coerced arrays survive schema validation |
| 6 | `DS-002`, `DS-003` | Agent XML flow confidence | `autobyteus-ts/tests/integration/agent/agent-single-flow-xml.test.ts` | All lower-level work | Prove the full single-agent XML flow works for array and raw-markup cases |

## File Placement Plan

| Item | Current Path | Target Path | Owning Concern | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Public XML parser boundary | `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts` | same | Streaming parser entrypoint | `Keep` | Unit tests |
| Schema-aware XML coercion helper | `N/A` | `autobyteus-ts/src/agent/streaming/adapters/xml-schema-coercion.ts` | Parser-local XML node parsing and coercion | `Create` | Unit tests |
| XML invocation adapter wiring | `autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts` | same | Tool invocation -> XML parser schema handoff | `Keep` | Unit tests |
| XML handler schema wiring | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`, `autobyteus-ts/src/agent/streaming/handlers/parsing-streaming-response-handler.ts`, `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts` | same | Agent runtime schema resolution | `Keep` | Unit + integration tests |
| Parser boundary tests | `autobyteus-ts/tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts` | same | XML parser behavior | `Keep` | Vitest |
| Adapter tests | `autobyteus-ts/tests/unit/agent/streaming/parser/invocation-adapter.test.ts` | same | XML schema handoff | `Keep` | Vitest |
| Validation-path test | `autobyteus-ts/tests/unit/tools/base-tool.test.ts` | same | Schema validation compatibility | `Keep` | Vitest |
| Agent XML integration tests | `autobyteus-ts/tests/integration/agent/agent-single-flow-xml.test.ts` | same | Deterministic agent XML execution | `Keep` | Vitest |

## Implementation Work Table

| Change ID | Spine ID(s) | Concern | Path(s) | Action | Status | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001` | Aggregate repeated scalar `<item>` elements into arrays | `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts` | `Modify` | Completed | Parser unit tests |
| `C-002` | `DS-002` | Preserve array-validation success for XML-parsed arrays | `autobyteus-ts/tests/unit/tools/base-tool.test.ts` | `Modify` | Completed | BaseTool unit tests |
| `C-003` | `DS-002` | Add deterministic single-agent XML array regression coverage | `autobyteus-ts/tests/integration/agent/agent-single-flow-xml.test.ts` | `Modify` | Completed | Agent integration test |
| `C-004` | `DS-003` | Coerce XML by declared tool schema and preserve raw nested XML strings for string fields | `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts`, `autobyteus-ts/tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/parser/invocation-adapter.test.ts`, `autobyteus-ts/tests/integration/agent/agent-single-flow-xml.test.ts` | `Modify` | Completed | Unit + integration tests |
| `C-005` | `DS-003` | Thread registry-backed and local-tool schemas into XML parsing | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`, `autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts`, `autobyteus-ts/src/agent/streaming/handlers/parsing-streaming-response-handler.ts`, `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts` | `Modify` | Completed | Unit + integration tests |
| `C-006` | `DS-001`, `DS-003` | Extract schema-aware coercion into a parser-local helper module so changed source files satisfy the Stage 8 size gate | `autobyteus-ts/src/agent/streaming/adapters/xml-schema-coercion.ts`, `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts` | `Create` + `Modify` | Completed | File-size audit + Vitest |

## Requirement, Spine, And Scenario Traceability

| Requirement | Acceptance Criteria | Spine ID(s) | Use Case(s) | Planned / Completed Work | Verification |
| --- | --- | --- | --- | --- | --- |
| `REQ-001` | `AC-001` | `DS-001` | `UC-001` | `C-001` | Parser unit test |
| `REQ-002` | `AC-002` | `DS-001` | `UC-001` | `C-001` | Parser unit test |
| `REQ-003` | `AC-003` | `DS-002` | `UC-002` | `C-002`, `C-003` | BaseTool unit + agent integration |
| `REQ-004` | `AC-004` | `DS-001` | `UC-003` | `C-001`, `C-004` | Parser + streaming regression tests |
| `REQ-005` | `AC-005` | `DS-001`, `DS-002`, `DS-003` | `UC-001`, `UC-002`, `UC-003`, `UC-004` | `C-002`, `C-003`, `C-004`, `C-005`, `C-006` | Focused Vitest suite |
| `REQ-006` | `AC-006` | `DS-003` | `UC-002`, `UC-004` | `C-004`, `C-005`, `C-006` | Adapter unit + agent integration |
| `REQ-007` | `AC-007` | `DS-003` | `UC-004` | `C-004`, `C-006` | Parser unit + agent integration |

## Stage 7 Planned Coverage Mapping

| Acceptance Criteria ID | Requirement ID | Scenario ID(s) | Expected Outcome | Status |
| --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `AV-001` | Repeated scalar `<item>` elements parse into arrays | Planned |
| `AC-002` | `REQ-002` | `AV-002` | XML entities inside array items decode into strings | Planned |
| `AC-003` | `REQ-003` | `AV-003`, `AV-005` | Array-typed schema validation accepts parsed XML arrays | Planned |
| `AC-004` | `REQ-004` | `AV-004` | Scalar non-array XML parsing remains stable | Planned |
| `AC-005` | `REQ-005` | `AV-001` - `AV-007` | Durable regression coverage exists across parser, adapter, validation, and agent flow | Planned |
| `AC-006` | `REQ-006` | `AV-006`, `AV-007` | XML coercion uses declared schema for registry-backed and local tools | Planned |
| `AC-007` | `REQ-007` | `AV-006`, `AV-007` | Nested XML is preserved as raw inner XML string for string parameters | Planned |

## Backward-Compat And Structural Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy malformed array behavior retained: `No`
- XML repair moved into validators or MCP tools: `No`
- Changed source implementation files under the `<=500` effective non-empty-line gate: `Yes`
- New tight coupling or cyclic dependencies introduced: `No`
- Dead or obsolete code left in the changed scope: `No`

## Test Strategy

- Unit tests:
  - `autobyteus-ts/tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/invocation-adapter.test.ts`
  - `autobyteus-ts/tests/unit/tools/base-tool.test.ts`
- Integration tests:
  - `autobyteus-ts/tests/integration/agent/streaming/full-streaming-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/agent-single-flow-xml.test.ts`
- Focused command:
  - `pnpm exec vitest --run tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts tests/unit/agent/streaming/parser/invocation-adapter.test.ts tests/unit/tools/base-tool.test.ts tests/integration/agent/streaming/full-streaming-flow.test.ts tests/integration/agent/agent-single-flow-xml.test.ts`
- Typecheck note:
  - repo-wide `pnpm exec tsc -p tsconfig.json --noEmit` still has unrelated pre-existing failures; this ticket only uses focused verification plus fixes for touched-test errors exposed during that run

## Execution Tracking

### Progress Log

- 2026-04-19: Root cause traced to `parseXmlArguments()` collapsing repeated `<item>` tags into `{ item: ... }` instead of `string[]`.
- 2026-04-19: Added parser array regression coverage, BaseTool validation coverage, and deterministic single-agent XML array coverage.
- 2026-04-19: Expanded the ticket scope to schema-aware XML coercion and raw-markup preservation for string parameters.
- 2026-04-19: Added local-tool schema resolution to the XML streaming flow and covered it with adapter and agent-level tests.
- 2026-04-19: Re-entered the workflow as a `Requirement Gap` to formalize the broader schema-driven scope.
- 2026-04-19: Identified that `tool-call-parsing.ts` exceeded the Stage 8 `<=500` effective-line gate and approved `C-006` extraction as part of the re-entered design.
- 2026-04-19: Extracted schema-aware XML node parsing/coercion into `xml-schema-coercion.ts`, reducing `tool-call-parsing.ts` to `124` effective non-empty lines while keeping the new helper at `456`.
- 2026-04-19: Passed `pnpm exec vitest --run tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts tests/unit/agent/streaming/parser/invocation-adapter.test.ts tests/unit/tools/base-tool.test.ts tests/integration/agent/streaming/full-streaming-flow.test.ts tests/integration/agent/agent-single-flow-xml.test.ts` with `56` tests passed and `1` skipped.
