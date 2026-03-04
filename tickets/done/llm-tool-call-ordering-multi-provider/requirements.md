# Requirements

- Ticket: `llm-tool-call-ordering-multi-provider`
- Status: `Design-ready`
- Last Updated: `2026-03-03`

## Goal / Problem Statement

Fix provider-specific tool-call continuation failures (observed with DeepSeek, and potentially Kimi/GLM) where strict OpenAI-compatible APIs reject request history ordering with:

`400 An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'`

At the same time:
- align Kimi + GLM model defaults/catalog to current provider offerings,
- rename user-facing provider naming from `ZHIPU` to `GLM`,
- and add real integration coverage for DeepSeek/Kimi/GLM tool-call flows.

## Scope Triage

- Final Triage: `Medium`
- Rationale: runtime sequencing fix + provider/model catalog updates + integration and flow test coverage.

## In-Scope Use Cases

- `UC-001` Agent run with `deepseek-chat` executes tool calls and continues to follow-up turn without sequencing error.
- `UC-002` Agent run with Kimi latest supported model executes tool calls and continues without sequencing error.
- `UC-003` Agent run with GLM latest supported model executes tool calls and continues without sequencing error.
- `UC-004` Agent-team flow executes at least one tool call using one of DeepSeek/Kimi/GLM and reaches stable completion.
- `UC-005` UI/runtime-facing provider naming shows `GLM` (not `ZHIPU`) for user-facing model/provider displays.

## Out of Scope

- Backward compatibility migration for legacy provider aliases beyond explicit in-repo compatibility requirements.
- Non-related provider rewrites (OpenAI/Anthropic/Gemini behavior changes outside regression-safety scope).

## Functional Requirements

- `REQ-001` Tool-call conversation history sent to OpenAI-compatible providers must maintain strict ordering: assistant tool_calls message must be immediately followed by corresponding tool messages (for all IDs) before next assistant turn.
- `REQ-002` For one LLM response containing multiple tool calls, runtime must persist/send them in a provider-valid grouped representation for that assistant turn.
- `REQ-003` Runtime must avoid injecting extra assistant message content between tool_calls and tool results in follow-up request history.
- `REQ-004` DeepSeek integration tests must validate real tool-call continuation flow (not only plain completion/streaming).
- `REQ-005` Kimi integration tests must validate real tool-call continuation flow and latest-model catalog entries.
- `REQ-006` GLM integration tests must validate real tool-call continuation flow and latest-model catalog entries.
- `REQ-007` User-facing provider naming in relevant app surfaces must use `GLM` label instead of `ZHIPU`.

## Acceptance Criteria

- `AC-001` Investigation artifact shows exact failing sequence path and corrected expected sequence.
- `AC-002` New/updated tests prove valid tool-call ordering for provider-compatible chat payload rendering.
- `AC-003` DeepSeek real integration test passes for tool-call continuation using `.env.test` key.
- `AC-004` Kimi real integration test passes for tool-call continuation using `.env.test` key.
- `AC-005` GLM real integration test passes for tool-call continuation using `.env.test` key.
- `AC-006` At least one real flow test (agent or agent-team) passes with one of the target providers using tool calls.
- `AC-007` Provider/model presentation no longer exposes `ZHIPU` as primary user-facing label where `GLM` should be shown.

## Constraints / Dependencies

- Must use `.env.test` credentials for real provider integration tests.
- Must preserve existing GPT/OpenAI working behavior.
- Must keep no-legacy policy for this ticket’s new behavior direction.
- GLM live verification is dependent on valid `.env.test` key material at execution time.

## Assumptions

- DeepSeek and Kimi `.env.test` keys are valid in this environment.
- GLM key may require rotation if unauthorized at test time.

## Risks

- Provider-specific stream delta behavior may differ in tool-call ID/name emission timing.
- Latest model IDs can drift; stale static lists may regress quickly without periodic update strategy.

## Requirement Coverage Map

- `REQ-001` -> `UC-001`, `UC-002`, `UC-003`, `AC-001`, `AC-002`, `AC-003`, `AC-004`, `AC-005`
- `REQ-002` -> `UC-001`, `UC-002`, `UC-003`, `AC-002`
- `REQ-003` -> `UC-001`, `UC-002`, `UC-003`, `AC-002`
- `REQ-004` -> `UC-001`, `AC-003`
- `REQ-005` -> `UC-002`, `AC-004`
- `REQ-006` -> `UC-003`, `AC-005`
- `REQ-007` -> `UC-005`, `AC-007`

## Acceptance Criteria -> Stage 7 Scenario Coverage Map

- `AC-001` -> `S7-001` (investigation evidence + fixed sequence verification)
- `AC-002` -> `S7-002` (unit/integration assertions on message ordering)
- `AC-003` -> `S7-003` (DeepSeek real tool-call continuation test)
- `AC-004` -> `S7-004` (Kimi real tool-call continuation test)
- `AC-005` -> `S7-005` (GLM real tool-call continuation test)
- `AC-006` -> `S7-006` (agent or agent-team real flow evidence)
- `AC-007` -> `S7-007` (UI/provider label validation)
