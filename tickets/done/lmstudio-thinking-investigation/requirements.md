# Requirements

## Document Status

- Status: `Design-ready`
- Ticket: `lmstudio-thinking-investigation`
- Scope Classification: `Small`
- Last Updated: `2026-04-05`

## Goal / Problem Statement

The `autobyteus-ts` LM Studio integration routes through the generic OpenAI-compatible chat-completions adapter. LM Studio already returns reasoning for applicable models such as `google/gemma-4-26b-a4b`, but the generic adapter drops that reasoning before it reaches the Autobyteus reasoning stream/UI. The fix must preserve LM Studio reasoning in both sync and streaming flows without regressing existing OpenAI-compatible content or tool-call handling.

## In-Scope Use Cases

- `UC-001`: Preserve LM Studio/OpenAI-compatible reasoning returned in non-streaming chat-completion responses so the complete response object contains reasoning text.
- `UC-002`: Preserve LM Studio/OpenAI-compatible reasoning returned in streamed chat-completion responses so reasoning chunks reach the Autobyteus reasoning segment pipeline.
- `UC-003`: Preserve existing OpenAI-compatible normal content and tool-call streaming behavior while adding reasoning parsing.

## Refined Requirements

| Requirement ID | Requirement | Priority |
| --- | --- | --- |
| `R-001` | The system shall map OpenAI-compatible chat-completion reasoning fields from the assistant message into `CompleteResponse.reasoning` when the provider returns reasoning separate from normal content. | Must |
| `R-002` | The system shall map OpenAI-compatible chat-completion streamed reasoning fields from the assistant delta into `ChunkResponse.reasoning` without blocking normal content emission. | Must |
| `R-003` | The system shall support the LM Studio field names observed in investigation, including `reasoning_content`, and shall also accept the documented alternate `reasoning` field shape when it is string-compatible. | Must |
| `R-004` | The system shall preserve existing OpenAI-compatible normal content and tool-call parsing behavior while adding reasoning support. | Must |
| `R-005` | The system shall include automated regression coverage proving that reasoning fields are not dropped in sync or streaming OpenAI-compatible flows. | Must |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Criterion |
| --- | --- | --- |
| `AC-001` | `R-001` | Given an OpenAI-compatible non-streaming response containing `choices[0].message.reasoning_content`, `OpenAICompatibleLLM` returns a `CompleteResponse` whose `reasoning` matches that field. |
| `AC-002` | `R-002` | Given an OpenAI-compatible streaming response containing `choices[0].delta.reasoning_content`, `OpenAICompatibleLLM` emits at least one `ChunkResponse` whose `reasoning` contains that delta. |
| `AC-003` | `R-003` | Given an OpenAI-compatible response containing `reasoning` instead of `reasoning_content`, the same reasoning normalization path still populates `reasoning`. |
| `AC-004` | `R-004` | Existing streamed text output and tool-call parsing continue to function after the reasoning parsing change. |
| `AC-005` | `R-005` | Targeted automated tests fail if sync or streaming OpenAI-compatible reasoning fields are ignored. |

## Constraints / Dependencies

- The scope stays localized to `autobyteus-ts` OpenAI-compatible response parsing and its direct unit coverage.
- LM Studio native capability discovery via `/api/v1/models` is explicitly out of scope for this fix; that is a separate metadata enhancement.
- The implementation must not special-case LM Studio in the streaming pipeline when a generic OpenAI-compatible normalization change is sufficient.

## Assumptions

- Reasoning fields returned by the OpenAI-compatible chat-completions path are string-like for the target LM Studio cases under investigation.
- Emitting reasoning in a separate `ChunkResponse` from normal text preserves current consumer behavior and is sufficient for the frontend reasoning segment UI.
- The generic OpenAI-compatible adapter can safely support `reasoning_content` and `reasoning` without regressing providers that simply never return those fields.

## Open Questions / Risks

- Some future OpenAI-compatible providers may return richer non-string reasoning objects; this fix will only normalize string-compatible payloads.
- LM Studio model-capability discovery remains absent from the current UI config schema because discovery still uses `GET /v1/models`.

## Requirement-To-Use-Case Coverage

| Requirement ID | Use Case(s) | Planned Validation Intent |
| --- | --- | --- |
| `R-001` | `UC-001` | Sync unit test with `message.reasoning_content` |
| `R-002` | `UC-002` | Streaming unit test with `delta.reasoning_content` |
| `R-003` | `UC-001`, `UC-002` | Sync/stream alternate `reasoning` field assertions |
| `R-004` | `UC-003` | Preserve text and tool-call assertions in targeted tests |
| `R-005` | `UC-001`, `UC-002`, `UC-003` | Automated regression suite plus live LM Studio repro |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Mocked sync OpenAI-compatible response with `reasoning_content` |
| `AC-002` | Mocked stream OpenAI-compatible response with `reasoning_content` |
| `AC-003` | Mocked sync/stream alternate `reasoning` field coverage |
| `AC-004` | Mocked streaming response that mixes reasoning, content, and tool calls |
| `AC-005` | Targeted vitest run plus live LM Studio verification command |

## Confirmed Scope Classification

- Classification: `Small`
- Reasoning: The change is localized to one provider adapter file plus its unit tests. No frontend redesign, provider registry changes, or LM Studio metadata integration are required to restore reasoning display.
