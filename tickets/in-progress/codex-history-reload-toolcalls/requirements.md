# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Fix Codex run/team-member history reload so tool-call events that exist in Codex thread history are preserved in the backend projection and render after application/server restart or history selection. The immediate user-visible symptom is a reloaded Codex/team member transcript that shows thinking/reasoning and plain text, but lacks the many tool-call cards that should normally appear between those events.

The suspected loss boundary must be proven rather than guessed. Current investigation shows a backend projection gap: `CodexRunViewProjectionProvider` reads Codex `thread/read` history but only reconstructs `fileChange`, `commandExecution`, and `webSearch` tool items; it drops generic Codex `dynamicToolCall` and `mcpToolCall` items. Frontend projection hydration already renders canonical `tool_call` rows when the backend returns them.

## Investigation Findings

- Backend history entrypoints:
  - Standalone history: GraphQL `getRunProjection(runId)` -> `AgentRunViewProjectionService` -> `CodexRunViewProjectionProvider` / local-memory fallback.
  - Team-member history: GraphQL `getTeamMemberRunProjection(teamRunId, memberRouteKey)` -> `TeamMemberRunViewProjectionService` -> local team-member memory projection plus delegated `AgentRunViewProjectionService` Codex provider.
- `CodexRunViewProjectionProvider` transforms `thread/read` turns/items. It maps user messages, reasoning, assistant messages, and only these tool item families: `fileChange`, `commandExecution`, `webSearch`.
- Live Codex normalization already treats `dynamicToolCall`, `mcpToolCall`, and `webSearch` as real tool lifecycles. The historical Codex provider has drifted behind that raw-event mapping.
- A scratch backend repro fixture that fed `thread/read` items with `mcpToolCall` and `dynamicToolCall` into `CodexRunViewProjectionProvider` failed: expected tool names `functions.exec_command` and `send_message_to`; received `[]`. Evidence log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/tmp-dynamic-tool-repro.log`.
- Existing frontend tests show `buildConversationFromProjection` converts canonical `tool_call` projection entries into AI message tool segments, and `runHistoryStore` history hydration tests pass after `.nuxt` preparation. No frontend renderer defect is indicated for canonical tool-call rows.
- Prior ticket context matters:
  - `restart-tool-trace-sync` explicitly recorded that the Codex projection provider was not a generic source for dynamic tools and dynamic tools relied on local raw traces.
  - This new request reopens that deferred/residual gap for histories where local memory is missing, incomplete, or needs Codex-native thread history to complement missing tool facts.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination / Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Live Codex event conversion owns dynamic/MCP/web-search tool lifecycle in `agent-execution/backends/codex/events`, while historical `CodexRunViewProjectionProvider` maintains a separate narrower item-type parser. The scratch repro proves dynamic/MCP `thread/read` items are silently omitted by the history provider.
- Requirement or scope impact: The fix must update backend projection and merge policy, not add a frontend-only placeholder. It must avoid duplicate tool rows when local raw traces and Codex thread history both contain the same invocation.

## Recommendations

1. Fix the backend Codex history projection provider to recognize active Codex tool item families from `thread/read`: `dynamicToolCall`, `mcpToolCall`, `webSearch`, `commandExecution`, and `fileChange`.
2. Extract/reuse a shared Codex history item normalizer or tool payload normalization helper so live event mapping and thread-history replay do not drift again.
3. Strengthen projection merge behavior by invocation identity. When local memory and Codex thread history both include the same invocation, merge/fill missing fields instead of appending duplicate rows or preserving empty args over richer Codex-native facts.
4. Add deterministic backend regression tests using `thread/read` fixtures and an optional live Codex reload/projection test gated by `RUN_CODEX_E2E=1` with raw event logging.
5. Keep frontend changes out of scope unless backend projections contain canonical `tool_call` rows that still fail to render.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Reload a standalone Codex run whose Codex `thread/read` history contains reasoning, assistant text, and generic dynamic tool calls.
- UC-002: Reload a team-member Codex run whose focused member history contains `send_message_to` or other dynamic tool calls.
- UC-003: Reload a Codex run/member where local raw traces are empty, missing, or incomplete but Codex-native thread history still contains tool items.
- UC-004: Merge local-memory projection and Codex-native projection without duplicate activity/transcript tool entries when both sources contain the same invocation.
- UC-005: Preserve existing command execution, file-change, and web-search history projection behavior.
- UC-006: Diagnose future Codex history format changes with debug/log evidence rather than silent omission.

## Out of Scope

- Cosmetic redesign of history UI, conversation cards, or Activity cards.
- Persistent migration/backfill that rewrites old `raw_traces.jsonl` files.
- Replacing Codex-native history or Codex runtime memory management.
- Restoring histories whose Codex thread no longer exists and whose local raw traces never captured the missing tool facts.
- Broad redesign of run-history indexing, archive, or delete semantics.

## Functional Requirements

- FR-001: `CodexRunViewProjectionProvider` must project `dynamicToolCall` Codex `thread/read` items into canonical historical tool events containing invocation id, tool name, arguments, result/error, timestamp when available, and a tool-call activity type.
- FR-002: `CodexRunViewProjectionProvider` must project `mcpToolCall` Codex `thread/read` items into canonical historical tool events with the same field guarantees as FR-001.
- FR-003: Existing `fileChange`, `commandExecution`, and `webSearch` Codex `thread/read` projection behavior must continue to work and must share the same tool-event normalization conventions where practical.
- FR-004: Projection merge logic must deduplicate and merge tool conversation/activity rows by invocation id so local memory and Codex-native thread history cannot create duplicate visible tool calls for the same invocation.
- FR-005: When duplicate invocation rows are merged, non-empty arguments, terminal result/error facts, useful tool names, and terminal status must win over empty/default fields, regardless of whether the richer fields came from local memory or Codex thread history.
- FR-006: Frontend history hydration must continue to consume the unchanged canonical projection contract (`conversation` + `activities`) without Codex-specific rendering branches.
- FR-007: Backend diagnostics must make unsupported Codex history item families inspectable under an explicit debug/log mode when they look tool-like but are not projected.
- FR-008: Regression coverage must include a backend fixture equivalent to: user message -> reasoning -> `mcpToolCall` -> `dynamicToolCall` -> assistant text, and must assert both tool calls reload in order with arguments and result/error facts.
- FR-009: Optional live validation should enable Codex raw/backend logs and verify a stopped/completed Codex run can be read/reloaded through backend projection with the same tool invocation identities observed during execution.

## Acceptance Criteria

- AC-001: Given a Codex `thread/read` payload with `item.type = "dynamicToolCall"`, `CodexRunViewProjectionProvider` returns a `conversation` entry with `kind = "tool_call"`, the original invocation id, tool name, and arguments.
- AC-002: Given a Codex `thread/read` payload with `item.type = "mcpToolCall"`, `CodexRunViewProjectionProvider` returns matching `conversation` and `activities` rows for that invocation.
- AC-003: Given a mixed payload of reasoning, dynamic/MCP tool items, and assistant text, the backend projection retains all entries without dropping the tool rows.
- AC-004: Given local raw-trace projection with an invocation whose args are `{}` and Codex thread projection with the same invocation and non-empty args, the final merged projection has one invocation row with non-empty args.
- AC-005: Given local raw-trace projection and Codex thread projection both contain the same invocation with terminal result/error, the final projection contains one Activity row and one transcript tool segment for that invocation.
- AC-006: Existing provider tests for `fileChange`, `commandExecution`, `webSearch`, reasoning, and missing-workspace fallback remain passing.
- AC-007: Existing frontend projection hydration tests remain passing without Codex-specific UI branches.
- AC-008: The implementation records the confirmed source of any remaining loss as one of: missing Codex thread, missing local memory, unsupported thread item family, projection merge issue, or frontend renderer issue.

## Constraints / Dependencies

- Must use the same backend history loading API/service used by the UI: `getRunProjection` and `getTeamMemberRunProjection` paths.
- Must preserve source invocation identity; do not fabricate unrelated placeholder tool calls.
- Must not duplicate a tool invocation when both local memory and Codex thread history contain it.
- Must not persistently mutate or backfill old memory files as part of read-time projection.
- Live Codex API/E2E remains environment-dependent and must stay gated by `RUN_CODEX_E2E=1`.
- Debug logging must be opt-in and must not spam normal history reads.

## Assumptions

- The screenshot represents a history/reload projection of a Codex or Codex team-member run, not an intentionally summarized message-only view.
- Codex `thread/read` retains enough item detail for recent runs to recover dynamic/MCP tool identities and arguments.
- Frontend can render canonical `tool_call` projection entries, as current tests already demonstrate.

## Risks / Open Questions

- Some historical Codex threads may no longer be materialized; those cannot be recovered unless local raw traces exist.
- Some Codex versions may encode dynamic/MCP results only in `contentItems` text; result/error extraction must be robust but not over-parse unrelated content.
- Merge-by-invocation must avoid collapsing genuinely distinct invocations that accidentally lack stable ids; anonymous fallback ids should remain source-scoped.
- If a thread item lacks timestamp fields, ordering between local-memory rows and Codex-native rows may still be approximate. The implementation should preserve provider-internal order and only reorder when reliable timestamps or invocation identity make it safe.

## Requirement-To-Use-Case Coverage

- UC-001: FR-001, FR-003, FR-008; AC-001, AC-003, AC-006.
- UC-002: FR-001, FR-002, FR-004, FR-008; AC-001, AC-002, AC-003, AC-005.
- UC-003: FR-001, FR-002, FR-003; AC-001, AC-002, AC-003.
- UC-004: FR-004, FR-005; AC-004, AC-005.
- UC-005: FR-003; AC-006.
- UC-006: FR-007, FR-009; AC-008.

## Acceptance-Criteria-To-Scenario Intent

- AC-001/AC-002 validate backend Codex-native thread-history item coverage.
- AC-003 validates the user-visible mixed reasoning/tool/text shape from the screenshot concern.
- AC-004/AC-005 validate local-memory + Codex-thread projection reconciliation.
- AC-006 protects existing history provider behavior.
- AC-007 protects frontend runtime-agnostic rendering assumptions.
- AC-008 forces future investigations to classify the loss boundary explicitly.

## Approval Status

Design-ready based on the user's explicit request to reproduce backend history reload and add regression coverage. No separate user sign-off has been received yet; downstream review should treat this as the proposed requirement basis and flag any requirement gap before implementation.
