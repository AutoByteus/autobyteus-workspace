# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-008`
- Package identifier: `anthropic-incomplete-content-block`
- Request / ticket: Project Task `project_task_3c6c098c-2a8b-4f46-b020-1c2f30eeb5f9`
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-10
- Approval state and reference: **Approved** by the user on 2026-10-10 in the desktop conversation: "follow your design suggestions and use design principles to guide you thanks". This approves the SR-005 package and all recommendations: output limit = model's real maximum; DEC-001 = C and DEC-002 = Claude Code style; DEC-003 = refactor all AutoByteus-runtime providers now; DEC-004 = two delivery steps. SR-006 records one clarification made under that directive (REQ-002: `model_context_window_exceeded` is a clear error, as in Claude Code, not an output-limit recovery).
- Exact approved requirements baseline / solution revision: SR-005 requirements text plus the SR-006 REQ-002 clarification. SR-007 made editorial corrections only (ARCH-REV-001 AR-005: table repairs and stale Out-of-Scope/DEC-003 text aligned with the recorded approval) and clarified AC-005's observable (AR-006). Intended behavior is unchanged
- Behavior-defining supplements and their approved versions: None (probe artifacts are evidence only)

## Problem And Desired Outcome

- Problem: On the native AutoByteus runtime, Claude requests use a hardcoded default `max_tokens` of 8,192, while Claude Opus 5.5 supports 128,000 output tokens (thinking counts too). A large `write_file` hits the cap mid-tool-call. The API ends the stream with `stop_reason: max_tokens` without closing the open block, and the adapter treats that as a protocol error. Every retry regenerates the same oversized call. Investigation found the underlying design gap in every provider: no streaming adapter reports how a response ended (finish reason), and the shared tool-call handler executes a tool call whose arguments are cut off or invalid with empty `{}` arguments.
- Affected actors or systems: Users of AutoByteus-runtime agents and teams on any provider (Anthropic, OpenAI, Gemini, DeepSeek, Kimi, Qwen, GLM, MiniMax, Grok, Mistral, Ollama, LM Studio, OpenAI-compatible endpoints); the agent loop.
- Desired outcome: Large tool inputs work up to the model's real output limit. A genuine truncation is reported clearly (what happened, which limit, what to do), never executes a partial tool call, and leaves the run recoverable with its history intact.
- Observable definition of success: In the desktop app on the native runtime with Opus 5.5, a large `write_file` succeeds. The user's stuck run continues and writes its design spec. A forced truncation in tests shows the clear message, with no tool execution and unchanged history.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | When `max_tokens` is unset, Claude requests use 8,192, regardless of the model's output limit | When `max_tokens` is unset, streaming Claude requests use the model's own maximum output tokens (128,000 for Opus 5.5) | An explicitly configured `max_tokens` is still sent unchanged (BEH-004) | investigation-notes Source Log; probe |
| BEH-002 | System | SCN-002 | A tool call cut off by `max_tokens` fails with the opaque "Anthropic content block is incomplete."; the turn ends; retrying regenerates the same oversized call | The cut-off tool call is discarded (never executed, never stored). The agent gets one hidden note per attempt (the output limit was hit while generating `<tool>`; it was not run; break the work into smaller pieces, e.g. write the file in parts), and the turn continues automatically. After 3 recovery attempts in a row, the turn ends with a clear error naming the limit | Rollback of the cut-off output; signed history never altered | Probe; `llm-phase.ts`; Claude Code `max_output_tokens_recovery` |
| BEH-003 | System | SCN-003 | A text/thinking-only response cut off by `max_tokens` fails with the same opaque error (a regression since `704e2108e`) | The partial text is kept in the conversation as the agent's response so far (shown to the user). The agent gets a hidden note to resume directly from where it stopped (no apology, no recap), and the turn continues automatically. The same 3-attempt limit and final clear error apply | — | Code trace; Claude Code |
| BEH-004 | System | SCN-001 | A configured `max_tokens` is respected | Unchanged | Unchanged | `anthropic-llm.ts` |
| BEH-005 | System | SCN-004 | A stream that genuinely violates the protocol (e.g., ends without `message_stop`, or a block left open with no terminal stop reason) fails and is rolled back | Unchanged; still fails, clearly | Unchanged | `anthropic-llm.ts` l.375-377 |
| BEH-006 | System | SCN-002, SCN-005 | Failed requests are rolled back; stored native turns (signed thinking and tool use) stay intact | Unchanged; a truncated response is never stored as a provider-native turn and never replayed | Unchanged | `llm-request-recovery.ts`; user run snapshot |
| BEH-007 | System | SCN-006 | Non-streaming Claude calls default to 8,192 | Non-streaming calls keep a bounded default that the SDK accepts without streaming | Unchanged | SDK `calculateNonstreamingTimeout` |
| BEH-008 | Contract | SCN-007 | No streaming adapter reports how a response ended: OpenAI Responses ignores `response.incomplete`/`response.failed`; OpenAI-compatible, Mistral and Ollama ignore `finish_reason`/`done_reason`; Gemini ignores `finishReason` (including `MAX_TOKENS` and `MALFORMED_FUNCTION_CALL`); Anthropic ignores `stop_reason`. Non-streaming paths already record `completionStatus`/`completionReason` | Every streaming adapter reports a provider-neutral finish reason (completed, tool calls, output limit, content filter/refusal, context window exceeded, other/unknown) together with the raw provider reason | Non-streaming completion metadata | Code trace (investigation notes) |
| BEH-009 | System | SCN-007 | The shared stream handler builds an executable tool invocation with `{}` arguments when the accumulated arguments are not valid JSON (`llm-streaming-response-handler.ts`) | A tool call with cut-off or invalid arguments never executes. A cut-off call follows the output-limit recovery. An invalid (non-truncated) call is not run; the model gets an error tool result telling it the call was malformed and to retry (as in Claude Code: "Your tool call was malformed and could not be parsed. Please retry.") | — | Code trace; Claude Code binary |
| BEH-010 | System | SCN-008 | When unconfigured, non-Anthropic adapters send no output limit, so each provider's own default applies. Some provider defaults are below the model's real maximum (to be verified per provider in design) | When unconfigured, each request uses the model's real maximum output tokens where the catalog/live metadata knows it, either by sending it or by verified-equivalent omission. Models with unknown limits keep the provider default | An explicitly configured limit (BEH-004) | Code trace |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Agent user (desktop app) | Get agents to write large files | Large writes succeed; a real truncation is understandable and recoverable | No lost or corrupted run history |
| Agent (LLM) | Complete tool calls | Never receives a half-executed or empty-argument tool result from a truncated call | Stored signed history stays valid for replay |
| Anthropic caching team copy | Owns recent changes in the same adapter | No conflicting edits | Coordinate through the Project Task Manager |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent on a native-runtime Claude model makes a large tool call (e.g., `write_file` with long content) | SCN-001 |
| UC-002 | A Claude streamed response is truncated by the output limit (or another terminal stop such as `refusal`) while a block is open, and the agent recovers by itself | SCN-002, SCN-003 |
| UC-003 | The user continues a run after a failed/truncated request, including the currently stuck run | SCN-005 |
| UC-004 | Any AutoByteus-runtime provider: a response ends by output limit, content filter, or with a malformed tool call, and the agent handles it the same way as for Claude | SCN-007 |
| UC-005 | Any AutoByteus-runtime model with a known output limit is called without a configured limit | SCN-008 |

### Out Of Scope

- The AutoByteus remote-server provider (`autobyteus-llm.ts` and related): the remote server no longer exists, and its removal is a separate follow-up ticket (user, 2026-10-10). REQ-009..REQ-012 do not apply to it. It gets only a compile-only edit.
- Server/web stream protocol and compaction report contract changes (the compaction report keeps `completion_status`/`completion_reason`).
- Enabling `eager_input_streaming` / live progress for large tool inputs (RSK-002, separate-ticket candidate).
- Automatic retry of failures other than output-limit truncation, and automatic splitting of content by the system (the model itself decides how to split after the note).
- Non-native runtimes (Claude Agent SDK, Codex, other external runtimes): they own their own limits and recovery.
- Truncation by `refusal`: no automatic recovery (Claude Code also does not resume refusals the same way); a clear error, and no tool runs.
- Changing rollback semantics for user messages on failed requests.
- Changes to provider model catalogs beyond output-limit metadata needed for BEH-010.
- UI changes beyond the existing error display.

### Non-Goals

- Guaranteeing that any arbitrarily large single tool input succeeds in one call; content beyond the model's real output limit must be produced in smaller pieces by the agent after the recovery note.

### Preserved Behavior Boundary

BEH-004, BEH-005, BEH-006, BEH-007; the prefix-bound reasoning and signed-turn rules from `anthropic-prompt-caching` (native turns stored only when complete; thinking replayed unchanged).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When no `max_tokens` is configured, a streamed native-runtime Claude request must use the model's maximum output tokens from the model catalog (128,000 for Opus 5.5; equal to Claude Code's default for Opus 5.5). A configured value is sent unchanged | BEH-001, BEH-004 | Must | Root cause of the user's failure; no rate-limit cost for a higher cap | User decision 2026-10-10; rate-limit docs; Claude Code model table |
| REQ-002 | When a streamed response ends because it hit the output limit (Claude `max_tokens`, or each provider's equivalent) while a tool call is incomplete, the response must be discarded and the agent must continue the same turn automatically with a hidden recovery note. The note says the output limit was hit while generating the named tool call, that the call was not executed, and that the agent should break the work into smaller pieces (e.g., write the file in parts). With `refusal`/content filter, or with `model_context_window_exceeded`, the request fails with a clear message and no recovery (as in Claude Code) | BEH-002 | Must | Learn from Claude Code (`max_output_tokens_recovery`; context-window stops surface as errors); never replay a cut-off call | DEC-001 = C; SR-006 |
| REQ-003 | A truncated or incomplete tool call must never be executed (not even with empty or partial arguments), and a truncated response must never be stored as a provider-native assistant turn (signed thinking or tool use) | BEH-002, BEH-006 | Must | Safety and history integrity (signed-turn rules) | Task; claude-api tool-use guidance |
| REQ-004 | When a streamed Claude response without any `tool_use` block is truncated by `max_tokens`, its partial text must be kept as the agent's response so far (visible to the user, stored as plain text without prefix-bound reasoning), and the agent must continue the same turn automatically with a hidden note to resume directly from where it stopped, with no apology or recap | BEH-003 | Must | Learn from Claude Code; avoids losing long answers | DEC-002 = Claude Code style |
| REQ-005 | Automatic recovery is limited to 3 consecutive truncated responses within a turn (Claude Code's limit). On the next truncation the turn ends with a clear error naming the output limit value and suggesting smaller pieces. Committed history stays valid: earlier signed turns are unchanged, no cut-off tool call is stored, and the next user message produces a valid request | BEH-006 | Must | Bounded cost; recoverability | DEC-001 = C |
| REQ-006 | Genuine stream-protocol violations (a stream ending without `message_stop`, or an incomplete block without a terminal stop reason) must still fail and roll back | BEH-005 | Must | Keep the strict integrity guard from signed-turn support | Preserved |
| REQ-007 | Non-streaming Claude calls must keep a bounded default `max_tokens` that the SDK accepts without streaming (the current 8,192 unless configured) | BEH-007 | Must | Avoid the SDK's "Streaming is required" error | SDK evidence |
| REQ-008 | The currently stuck user run must continue after the fix without losing history | BEH-006 | Must | Explicit "Done when" | Task |
| REQ-009 | Every streaming provider adapter on the AutoByteus runtime must report, at the end of each response, a provider-neutral finish reason (completed, tool calls, output limit, content filter/refusal, context window exceeded, other/unknown) plus the raw provider reason | BEH-008 | Must | Industry practice (normalized finish reasons, as in Vercel AI SDK and LangChain); prerequisite for uniform handling | DEC-003 |
| REQ-010 | The output-limit recovery (REQ-002..REQ-005) and the content-filter/refusal handling apply to every AutoByteus-runtime provider through the agent loop, independent of the provider | BEH-008 | Must | One behavior for all models | DEC-003 |
| REQ-011 | A tool call whose arguments are invalid JSON or not an object, outside an output-limit truncation, must never execute. The model receives an error tool result stating that the call was malformed and asking it to retry | BEH-009 | Must | Learn from Claude Code; safety | DEC-003 |
| REQ-012 | When no output limit is configured, every AutoByteus-runtime request for a model with a known maximum output limit must allow that full maximum: sent explicitly, or omitted only where the provider is verified to default to it. Models with unknown limits keep the provider default. A configured value is sent unchanged | BEH-010, BEH-004 | Must | "Always use the model's real output limit" | User decision 2026-10-10 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Opus 5.5 on the native runtime; no configured `max_tokens`; streamed request | The request carries `max_tokens: 128000` | With a configured value (e.g., 4096), the request carries 4096 | Unit test on request params |
| AC-002 | REQ-001, REQ-003 | SCN-001 | Recorded stream of a large `write_file` (multi-delta input JSON, `content_block_stop`, `stop_reason: tool_use`) | One `write_file` invocation with the full content; native turn stored | — | Unit/integration happy-path test |
| AC-003 | REQ-002, REQ-003 | BEH-002 / SCN-002 | Recorded stream: `tool_use` start, input deltas, `message_delta stop_reason=max_tokens`, `message_stop`, with no block stop; then a normal second response | No tool runs for the cut-off call, and no native turn is stored for it. The next request in the same turn carries the hidden recovery note (naming the tool and the limit) and no trace of the cut-off call. The second response's tool runs normally | — | Agent-level test (LLM phase/turn) and adapter unit test |
| AC-004 | REQ-002, REQ-003 | SCN-002 | Same as AC-003 with `stop_reason=refusal` | The turn ends with a clear refusal message; no tool runs; no recovery attempt | — | Unit test |
| AC-005 | REQ-004 | BEH-003 / SCN-003 | Recorded stream: text block deltas, `stop_reason=max_tokens`, `message_stop`, with no block stop; then a normal second response | The partial text is shown and stored as the agent's text so far. The next request carries the hidden resume note. The conversation shows both parts as consecutive assistant text (live and after a history reload), and the working context holds both (clarified in SR-007; the final `CompleteResponse` carries only the last part) | — | Agent-level test |
| AC-006 | REQ-005 | SCN-005 | Four truncated responses in a row in one turn | Exactly 3 recovery attempts. Then the turn ends with a clear error naming the limit value. History contains no cut-off tool call and the signed turns are unchanged; a following user message yields a valid request | — | Agent-level test |
| AC-007 | REQ-006 | BEH-005 / SCN-004 | Stream ends without `message_stop` after a `tool_use` start; or an unstopped block with `stop_reason=end_turn`/`tool_use` | Fails and is rolled back as today | — | Unit test |
| AC-008 | REQ-007 | BEH-007 / SCN-006 | Non-streaming call with no configured `max_tokens` | Request carries 8,192, and the SDK does not throw | — | Unit test |
| AC-009 | REQ-001, REQ-008 | SCN-005 | Desktop app, native runtime, Opus 5.5, the stuck run `software_engineering_team_107698…` / `solution_designer_08a92ade…` | After the user sends a message, the agent writes its design spec with `write_file` successfully, and earlier history is intact | — | User verification in the desktop app |
| AC-010 | REQ-009 | BEH-008 / SCN-007 | Recorded streams per adapter family (Anthropic, OpenAI Responses, OpenAI-compatible, Gemini, Mistral, Ollama) ending normally, with tool calls, with output limit, and with content filter | The final chunk carries the matching normalized finish reason and the raw reason | — | Adapter unit tests |
| AC-011 | REQ-010 | SCN-007 | A non-Anthropic adapter (e.g. OpenAI-compatible `finish_reason=length` mid tool call; OpenAI Responses `response.incomplete` with `max_output_tokens`) | Same outcome as AC-003/AC-005/AC-006: discarded call or kept text, hidden note, automatic continuation, max 3 | Content filter: clear error, no tool runs | Agent-level test |
| AC-012 | REQ-011 | BEH-009 | A completed response with a tool call whose arguments are invalid JSON | The tool does not run; the next request carries an error tool result for that call ("malformed … retry"); the turn continues | — | Handler and agent-level tests |
| AC-013 | REQ-012 | BEH-010 / SCN-008 | Each provider family, catalog model with a known output limit, no configured limit | The request allows the model's full maximum (parameter value asserted, or omission justified by a verified provider default) | Unknown-limit model: parameter omitted | Adapter request-param tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Agent user / agent | Write a large file via a tool | Agent chat or team run, native runtime, Claude model | Run active | Agent thinks, then calls `write_file` with long content; the tool runs | File written and the turn continues | — | Supported Normal Scenario | User report and screenshot | REQ-001, AC-001, AC-002 |
| SCN-002 | Contract | Anthropic Messages streaming contract | Response hits the output limit or is refused mid tool call | Any streamed request | Output exceeds the limit | Stream ends `stop_reason=max_tokens`/`refusal` with an open `tool_use` | `max_tokens`: cut-off call discarded, hidden note, automatic continuation (max 3); `refusal`: clear error | After 3 attempts, clear error; user can continue | Supported Explicit Edge Scenario (API contract; probe reproduced; Claude Code precedent) | Probe; Claude Code binary | REQ-002, REQ-003, REQ-005, AC-003, AC-004, AC-006 |
| SCN-003 | Contract | Same | Text answer exceeds the output limit | Streamed request with a very long text answer | — | Stream ends `max_tokens` inside a text block | Partial text kept; hidden resume note; automatic continuation (max 3) | After 3 attempts, clear error | Supported Explicit Edge Scenario | Code trace; Claude Code binary | REQ-004, REQ-005, AC-005, AC-006 |
| SCN-004 | Contract | Same | Stream breaks the protocol | Network cut / malformed stream | — | No `message_stop`, or unstopped block without a terminal reason | Failure and rollback | — | Supported Explicit Edge Scenario | Existing guard | REQ-006, AC-007 |
| SCN-005 | User | Agent user | Continue a run after a failure | Send a message in the same run | The previous request failed and was rolled back | User sends "continue" (or a new instruction) | Valid request; agent proceeds | — | Supported Normal Scenario | User run traces | REQ-005, REQ-008, AC-006, AC-009 |
| SCN-006 | System | Internal one-shot calls | Non-streaming Claude call | e.g., summarizers | No configured `max_tokens` | `sendMessages` | Succeeds with the bounded default | — | Supported Normal Scenario | Code | REQ-007, AC-008 |
| SCN-007 | Contract | Each provider's streaming contract | A response ends by output limit, content filter, or with a malformed tool call | Any streamed request on any AutoByteus-runtime provider | — | Provider stream ends with its own reason (`length`, `MAX_TOKENS`, `incomplete`, `content_filter`, …) | Uniform handling per REQ-009..REQ-011 | — | Supported Explicit Edge Scenario (provider contracts) | Code trace; provider docs (verified in design) | REQ-009, REQ-010, REQ-011, AC-010..AC-012 |
| SCN-008 | System | Agent user | Use any model without configuring an output limit | Agent/team run on the AutoByteus runtime | No configured limit | Request sent | Full model maximum available | — | Supported Normal Scenario | User decision | REQ-012, AC-013 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (the existing error display is reused; only the message text changes)
- All Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003, REQ-005 | Reliability | Zero tool executions and zero stored native turns from truncated responses | All terminal stop reasons | Tests AC-003..AC-006 |
| QR-002 | REQ-002, REQ-005 | Operability | The recovery note and the final error are human-readable and include the limit value (and tool name for tool calls) | — | Test assertion on messages |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (no schema or stored-data change)
- Data or state that must be preserved: all committed working-context history, including signed native turns; the user's stuck run as-is.
- Loss, reset, rebuild, or regeneration that is acceptable: the truncated response output itself.
- Retention, privacy, compliance, volume, downtime, or operational constraints: None.
- Unknowns requiring downstream investigation: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Anthropic streaming events | An open block gets no `content_block_stop` on `max_tokens`; `message_delta.stop_reason` is authoritative | Live probe 2026-10-10 | Refusal shape assumed equivalent |
| Anthropic output limits | Model catalog `maxOutputTokens` (128k Opus 5.5) | Catalog; claude-api skill | Catalog stays accurate |
| `@anthropic-ai/sdk` non-streaming guard | Above ~21,333 `max_tokens` non-streaming throws without a timeout | SDK source | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/max-tokens-tool-use-probe.cjs`, `probes/max-tokens-400.out.json` | Reproduction evidence | REQ-002, AC-003 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's design spec is well under 128k output tokens | REQ-008 relies on REQ-001 alone | AC-009 user verification | Open |
| ASM-002 | A `refusal` mid-block omits `content_block_stop` like `max_tokens` | AC-004 shape | Generic handling covers either shape | Open, low risk |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | On a truncated tool call, who is told, and does the run recover by itself? | Decides whether the agent recovers alone | Options A/B/C (see SR-003). Decided: **C**, learn from Claude Code: discard the cut-off call, hidden note, automatic continuation up to 3 attempts, then a clear error. Deviation from Claude Code: the cut-off output is regenerated, not resumed, because a cut-off tool call and prefix-bound thinking cannot be stored or replayed | User | Decided 2026-10-10 |
| DEC-002 | Text-only truncated answers | Behavior change versus the current regression | Decided: learn from Claude Code: keep the partial text, add a hidden resume note, continue automatically (REQ-004) | User | Decided 2026-10-10 |
| DEC-003 | Other providers on the AutoByteus runtime: now or as a follow-up? | They share the design gap (BEH-008..BEH-010) | Decided: **refactor now**, following industry best practice (normalized finish reasons; never execute malformed or cut-off tool calls; uniform recovery in the agent loop; the model's real output limit) | User | Decided 2026-10-10 |
| DEC-004 | Delivery order within this ticket | The stuck run is blocked until a fix ships; the full refactor is large | Decided: one ticket and one design, delivered in two steps. Step 1: real output limits (REQ-001, REQ-007, REQ-012), which unblocks the stuck run (AC-009). Step 2: the refactor (REQ-002..REQ-006, REQ-009..REQ-011) | User | Decided 2026-10-10 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-004 | AC-001, AC-002, AC-009 | SCN-001 | probe |
| REQ-002 | UC-002 | BEH-002 | AC-003, AC-004 | SCN-002 | probe; Claude Code binary |
| REQ-003 | UC-002 | BEH-002, BEH-006 | AC-002, AC-003, AC-004 | SCN-002 | — |
| REQ-004 | UC-002 | BEH-003 | AC-005 | SCN-003 | Claude Code binary |
| REQ-005 | UC-002, UC-003 | BEH-006 | AC-006 | SCN-002, SCN-003, SCN-005 | Claude Code binary |
| REQ-006 | UC-002 | BEH-005 | AC-007 | SCN-004 | — |
| REQ-007 | UC-001 | BEH-007 | AC-008 | SCN-006 | — |
| REQ-008 | UC-003 | BEH-006 | AC-009 | SCN-005 | — |
| REQ-009 | UC-004 | BEH-008 | AC-010 | SCN-007 | — |
| REQ-010 | UC-004 | BEH-008 | AC-011 | SCN-007 | — |
| REQ-011 | UC-004 | BEH-009 | AC-012 | SCN-007 | Claude Code binary |
| REQ-012 | UC-005 | BEH-010, BEH-004 | AC-013 | SCN-008 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-008.
- Product and system constraints architecture must preserve: rollback semantics; signed native turn integrity; the explicit `max_tokens` override; bounded non-streaming default.
- Decisions intentionally deferred to architecture design: where the default limit is resolved; how truncation is classified and surfaced (error type/code); how the error survives the adapter's rewrap.
- Technical facts architecture should verify: no `ToolInvocation` can be built before classification; the token-budget reservation stays consistent with the sent limit.
- Known feasibility or integration risks: overlap with the caching team's work (RSK-001). Resolved 2026-10-10: there is no file overlap. Technical constraint CON-001 (investigation notes): the compaction trigger budget must not move, so derive the default output limit at request-build time without writing a different value into `config.maxTokens`.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-10)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
