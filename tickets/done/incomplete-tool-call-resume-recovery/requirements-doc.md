# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved synthetic interrupted/unknown tool-result recovery and requested ticket kickoff on 2026-06-15.

## Goal / Problem Statement

An AutoByteus-runtime agent/team member can persist an assistant native tool call before the corresponding tool result is available. If the process or computer shuts down in that window, a later restart can restore a schema-valid but provider-invalid working context: the assistant message has `tool_calls`, but no matching `tool` result messages. When the user sends “continue”, the next DeepSeek/OpenAI-compatible request fails with HTTP 400 because the chat history violates native tool-call pairing rules.

The runtime must recover from persisted incomplete native tool-call history after abrupt shutdown. A user must be able to send a later message to continue or redirect the run, without the abandoned tool call permanently poisoning provider requests.

## Investigation Findings

- Affected run: `kids_coloring_story_team_fe532f9ee3904aa888142fa3bc8c0992`, member `coloring_page_illustrator_879c669a220042579c20756deff63257`.
- Runtime/model: AutoByteus / `deepseek-v4-flash`.
- Raw trace shows `generate_image` call `call_00_sV5xrttWiaZHhUHAKgo88012` persisted at seq 109 with no matching `tool_result`.
- Working-context snapshot schema v4 has assistant native tool-call message at index 55 followed by user messages at indexes 56-58.
- User screenshot shows provider error: `400 An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'.`
- Current code has an LLM-safe projection path for explicit `AgentInterruptionError`, but abrupt shutdown does not trigger it.
- Snapshot restore trusts schema-valid cached snapshots and bypasses provider-safety validation/projection.
- Request assembly appends the new user message and renders the working context without pre-render provider-safety enforcement.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / robustness behavior change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with secondary Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, narrow scope.
- Evidence basis: Cached restored working context can be schema-valid while invalid for OpenAI-compatible tool-call protocol. Existing recovery is limited to graceful interruption and is not enforced at restore/pre-render boundaries.
- Requirement or scope impact: The system needs an authoritative provider-safety invariant for working-context messages before any LLM request is rendered/sent, and restore should not leave an unsafe cached snapshot active.

## Recommendations

- Recover provider-visible native tool-call history by inserting an immediate synthetic tool-result/error message for incomplete calls, using product-neutral wording such as: `Tool execution was interrupted by runtime shutdown before a result was recorded. Completion status is unknown. No tool output is available in memory. Do not assume the requested output exists. Retry or verify only if the user asks or task requires it.`
- Enforce provider-safe working-context history at an authoritative boundary that covers both restored snapshots and every pre-render LLM request path.
- Record an auditable recovery/boundary marker when automatic crash recovery closes an incomplete tool-call protocol, while keeping the original raw `tool_call` trace intact.
- Add regression coverage with a schema-valid snapshot containing an assistant native tool call followed by user messages and no tool result.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Resume an AutoByteus-runtime agent/team member run after process/computer shutdown while a native tool call was pending and no tool result was persisted.
- UC-002: Send a new user message after restart to continue, redirect, or ask for recovery from the incomplete tool-call state.
- UC-003: Recover an already-retried run where one or more user messages were appended after the incomplete assistant tool call during failed continue attempts.
- UC-004: Preserve raw traces/history readability for the incomplete tool call without corrupting later turns.
- UC-005: Preserve normal completed native tool-call history unchanged.
- UC-006: Apply the same recovery behavior to standalone AutoByteus runs if they use the same memory/LLM request path.

## Out of Scope

- Automatically retrying the abandoned `generate_image` operation without an explicit later user/model decision.
- Claiming success for an interrupted tool call or inventing a generated file/result that does not exist.
- Changing DeepSeek provider behavior or model selection.
- Rewriting all memory persistence, compaction, or raw-trace recovery beyond the provider-safety invariant needed for incomplete native tool-call recovery.
- Manually repairing this one local run as the primary fix, except as optional verification after the durable runtime fix exists.

## Functional Requirements

- REQ-ITC-001: Persisted run history that contains an assistant native tool call without a corresponding tool result must not prevent the user from sending a subsequent message after restart.
- REQ-ITC-002: Before any OpenAI-compatible/DeepSeek provider request is rendered or sent, the working context must be provider-safe: every native assistant tool-call message must have immediately following tool result messages for each call id; incomplete calls must be closed with a synthetic interrupted/unknown tool result rather than left open.
- REQ-ITC-003: Snapshot restore must not treat schema validity alone as sufficient for provider replay safety. A restored schema-valid snapshot with incomplete native tool-call protocol must be projected/fenced before it can poison later requests.
- REQ-ITC-004: Request assembly must recover already-unsafe working contexts, including contexts where user messages were appended after the incomplete tool call by earlier failed continue attempts.
- REQ-ITC-005: Recovery must preserve auditability of the original incomplete tool call in raw traces/history and record any automatic fencing/recovery marker in a durable, inspectable way.
- REQ-ITC-006: Recovery must not synthesize a successful tool result or otherwise claim that an interrupted tool completed when no real result exists; any synthetic recovery result must explicitly say execution was interrupted, completion status is unknown, and no output is available in memory.
- REQ-ITC-007: Completed native tool-call/tool-result pairs must remain represented as native tool history and must not be degraded by the recovery path.
- REQ-ITC-008: Recovery behavior must apply to AutoByteus runtime team members and standalone AutoByteus runs when they use the same memory and LLM request assembly path.
- REQ-ITC-009: User-facing continuation errors caused solely by incomplete prior native tool-call history must be replaced by successful continuation or an actionable recovery state; the run must not remain permanently poisoned by the abandoned tool call.

## Acceptance Criteria

- AC-ITC-001: Given a persisted AutoByteus run with assistant `generate_image` tool call id `call_00_sV5xrttWiaZHhUHAKgo88012` and no tool result, after restart the user can send one additional message such as `please continue there was a shutdown`; the runtime prepares a provider-safe request, starts/kicks off LLM execution again, and does not throw/send a provider request that fails because of missing tool messages for that call id.
- AC-ITC-002: Given a schema-valid `working_context_snapshot.json` containing an assistant native tool-call message followed directly by one or more user messages, the next request preparation produces provider-safe rendered messages.
- AC-ITC-003: Given the same run, raw trace/readback still shows the original incomplete `tool_call` and shows any recovery/fencing marker applied by the system.
- AC-ITC-004: Given a normal completed native tool call with matching `tool` result messages, history replay remains unchanged as native tool-call history.
- AC-ITC-005: Given an incomplete tool-call batch with some completed tool results and at least one missing result, completed facts are preserved and every missing call receives an immediate synthetic interrupted/unknown tool result; no synthetic result may imply success or completed output.
- AC-ITC-006: Given repeated failed continue attempts that already appended user messages after the incomplete assistant tool call, a later fixed runtime can still recover that working context before rendering/sending the next provider request.
- AC-ITC-007: Given a restored team member run and a standalone AutoByteus run using the same path, both enforce the same provider-safe working-context invariant.
- AC-ITC-008: The visible user-facing error from the screenshot is not reproduced for the incomplete-tool-call fixture after the fix.

## Constraints / Dependencies

- Must respect OpenAI-compatible provider message validity rules for native tool-call/tool-result pairing.
- Must not invent fake successful tool output or imply `page002.png` exists when it does not.
- Must fit existing AutoByteus runtime, team-run memory, raw-trace, snapshot restore, and LLM request assembly boundaries.
- Must preserve current explicit interruption recovery behavior and tests.
- Must avoid provider-specific workaround logic when the invariant applies to all OpenAI-compatible native tool history.
- Must avoid copying local secrets from `$HOME/.autobyteus` into code, tests, artifacts, or handoffs.

## Assumptions

- The shutdown occurred after the assistant tool call was parsed/persisted but before the tool result was persisted.
- The observed continue error is caused by replaying/submitting invalid incomplete native tool-call history, not by unrelated model/API configuration.
- Existing `working-context-llm-safe-projector` behavior is directionally correct for fencing incomplete native tool-call protocol, though it may need a clearer authoritative invocation point and idempotent recovery-marker handling.

## Risks / Open Questions

- OQ-ITC-001: Which component should own idempotent automatic recovery marker creation: snapshot bootstrapper, memory manager, request assembler, or a new small memory-safety owner?
- OQ-ITC-002: Should automatic crash recovery append an `operation_boundary` raw trace during restore, during pre-render request assembly, or only when an unsafe context is first encountered?
- OQ-ITC-003: Resolved wording direction: provider-visible synthetic result should be product-neutral and should not mention AutoByteus by name. Candidate text: `Tool execution was interrupted by runtime shutdown before a result was recorded. Completion status is unknown. No tool output is available in memory. Do not assume the requested output exists. Retry or verify only if the user asks or task requires it.`
- OQ-ITC-004: Should UI surface a special “previous tool call was cancelled during shutdown” event, or is an internal recovery marker plus normal continuation sufficient for this change?

## Requirement-To-Use-Case Coverage

- REQ-ITC-001: UC-001, UC-002
- REQ-ITC-002: UC-001, UC-002, UC-003
- REQ-ITC-003: UC-001, UC-003
- REQ-ITC-004: UC-003
- REQ-ITC-005: UC-004
- REQ-ITC-006: UC-001, UC-004
- REQ-ITC-007: UC-005
- REQ-ITC-008: UC-001, UC-006
- REQ-ITC-009: UC-002, UC-003

## Acceptance-Criteria-To-Scenario Intent

- AC-ITC-001: Verifies the reported recovery failure is fixed for the incident class.
- AC-ITC-002: Verifies schema-valid cached snapshots are also provider-safe before use.
- AC-ITC-003: Protects auditability and diagnostics.
- AC-ITC-004: Protects normal completed-tool behavior.
- AC-ITC-005: Protects partial-result semantics without fake results.
- AC-ITC-006: Protects recovery from already-poisoned contexts after repeated failed continue attempts.
- AC-ITC-007: Protects runtime-wide applicability, not only this team UI path.
- AC-ITC-008: Verifies the exact user-visible symptom is gone.

## Approval Status

Approved by user on 2026-06-15. User explicitly approved the synthetic interrupted/unknown tool-result design, requested ticket kickoff, and required testing for the case where a persisted tool call has no result but resume succeeds after one additional user message prompt and kicks off LLM execution again.
