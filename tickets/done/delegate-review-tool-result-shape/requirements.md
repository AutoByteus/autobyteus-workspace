# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Generalize runtime result projection so application-facing tool Activity shows the effective result of MCP tool calls instead of the raw MCP protocol envelope (`content`, `structuredContent`, `_meta`, `isError`). The original symptom was observed on `delegate_task` / `review_task_result` under Codex runtime, but the requirement is broader: every source-confirmed MCP-backed tool result shown to users should be projected into a useful result shape comparable to native AutoByteus runtime output.

## Investigation Findings

- The task-delegation domain service returns typed domain objects; it does **not** add `content`, `structuredContent`, `_meta`, or other MCP envelope fields.
- Native AutoByteus runtime does not expose the MCP protocol envelope for these tools, so Activity shows the usable result object/string.
- Codex/Claude MCP-backed runtime paths can receive provider MCP tool results shaped like `{ content, structuredContent, _meta, isError }`.
- The frontend Activity panel stores and renders backend `payload.result` directly; therefore any raw MCP envelope emitted by backend projection is visible to users.
- The issue is not unique to task-delegation. It is a missing app-facing MCP effective-result projection boundary.
- Architecture review round 2 confirmed the high-level direction but required two design tightenings: source-confirmed MCP eligibility rather than value-only projection, and deterministic projection/error shapes for multi-text, rich, and `isError: true` envelopes.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug fix / behavior normalization.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small focused refactor needed now.
- Evidence basis: Codex result parsing preserves `payload.result` unchanged when present; existing browser/media normalizers show backend projection is already the right layer for provider protocol envelopes; Activity renders backend result directly.
- Requirement or scope impact: Implement a general MCP effective-result projector, but call it only from source-confirmed MCP result lanes or with explicit MCP source context.

## Recommendations

1. Add a general MCP effective-result projector at the backend projection boundary.
2. Make projector eligibility explicit: converters must call it only for source-confirmed MCP tool-result lanes, and/or pass an explicit source context proving MCP origin.
3. Apply it to Codex and Claude MCP-success/completion paths before emitting application-facing lifecycle events.
4. Project effective results deterministically:
   - prefer non-null `structuredContent`;
   - for one text block, parse JSON when valid, otherwise return text;
   - for multiple text blocks, join in provider order with `\n\n`;
   - for mixed/rich blocks, return `{ items: [...] }` with sanitized content blocks in provider order;
   - omit top-level MCP envelope metadata from normal Activity `result`.
5. Treat MCP `isError: true` as failure information, not as successful result metadata.
6. Preserve the MCP protocol envelope only at the actual MCP JSON-RPC/provider boundary or explicit debug/raw payloads, not as the user-facing Activity result.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-small. The core implementation is simple, but it affects all source-confirmed MCP-backed tool results in app-facing events and therefore needs explicit eligibility/error/rich-content contracts and regression tests.

## In-Scope Use Cases

- UC-001: Codex runtime receives a source-confirmed MCP result envelope with text JSON content; Activity shows the parsed JSON value.
- UC-002: Codex runtime receives a source-confirmed MCP result envelope with plain text content; Activity shows the plain text.
- UC-003: Codex runtime receives a source-confirmed MCP result envelope with non-null `structuredContent`; Activity shows `structuredContent` as the effective result.
- UC-004: Source-confirmed MCP results with multiple text blocks are shown as one deterministic joined string.
- UC-005: Source-confirmed MCP results with mixed/rich content are shown as deterministic sanitized `{ items: [...] }`, not as top-level MCP envelope metadata.
- UC-006: Source-confirmed MCP results with `isError: true` emit a failed lifecycle event/error rather than a successful raw envelope.
- UC-007: Claude runtime receives the same source-confirmed envelope shapes and emits the same effective result/error behavior.
- UC-008: Task-delegation MCP results (`delegate_task`, `submit_task_result`, `review_task_result`) show the task-domain result object, matching native AutoByteus behavior.
- UC-009: Exact envelope-shaped non-MCP/native/provider results remain unchanged because the projector is not invoked without MCP source evidence.

## Out of Scope

- Changing MCP JSON-RPC protocol responses returned to MCP clients/providers.
- Changing the task-delegation service/domain DTOs.
- Adding frontend special-case parsing for MCP envelopes.
- Redesigning rich media rendering beyond deterministic result payload projection.
- Applying MCP projection to source-unknown or non-MCP result lanes.

## Functional Requirements

- REQ-001: Backend provider event conversion must not expose raw MCP tool-result envelope fields as the normal application-facing `payload.result` when the result comes from a source-confirmed MCP tool-result lane.
- REQ-002: MCP projection must be source-gated. A value that merely looks like an MCP envelope must remain unchanged when emitted by a non-MCP/native/source-unknown lane.
- REQ-003: Projector invocation must carry explicit MCP source context or be limited by converter-side source-confirmed MCP eligibility rules.
- REQ-004: For a source-confirmed MCP envelope with non-null `structuredContent`, the application-facing result must be the `structuredContent` value.
- REQ-005: For a source-confirmed MCP envelope without usable `structuredContent`, content projection must be deterministic: single text parses JSON when valid, single text otherwise remains text, multiple text blocks join with `\n\n`, and mixed/rich blocks become `{ items: [...] }` with sanitized blocks in provider order.
- REQ-006: Top-level MCP protocol fields such as `_meta`, `structuredContent`, `content`, and `isError` must not appear in normal successful Activity `result` output.
- REQ-007: If a source-confirmed MCP envelope has `isError: true`, provider conversion must emit a tool failure unless the provider already emitted a failure; the failure payload must include `error` and must not include a successful `result` value.
- REQ-008: Error-message extraction for `isError: true` must use a deterministic precedence: provider error first if present, then effective string result, then `error.message`, then `message`, then string `error`, then fallback content text, then `MCP tool execution failed.`.
- REQ-009: Existing family-specific result handling for browser/media tools must continue to work after generic MCP effective-result projection.
- REQ-010: The frontend must remain a passive consumer that renders the already-normalized backend result.

## Acceptance Criteria

- AC-001: A Codex `TOOL_EXECUTION_SUCCEEDED` event for source-confirmed `delegate_task` MCP text JSON content emits `payload.result` as the parsed task-domain object and does not include `content`, `structuredContent`, or `_meta` in that result.
- AC-002: A Codex source-confirmed generic MCP tool with text JSON content emits the parsed JSON value as `payload.result`.
- AC-003: A Codex source-confirmed generic MCP tool with plain text content emits that plain text as `payload.result`.
- AC-004: A source-confirmed MCP tool with non-null `structuredContent` emits that structured value as `payload.result` and omits `_meta` from the result.
- AC-005: A source-confirmed MCP tool with multiple text blocks emits those blocks joined in provider order with `\n\n`.
- AC-006: A source-confirmed MCP tool with mixed/rich content emits `{ items: [...] }` with sanitized blocks in provider order and no top-level MCP envelope fields.
- AC-007: An exact envelope-shaped non-MCP Codex/Claude result remains unchanged because MCP projection is not eligible.
- AC-008: A source-confirmed MCP envelope with `isError: true` is emitted as `TOOL_EXECUTION_FAILED` with deterministic `error`, and no successful `result` is emitted.
- AC-009: Equivalent Claude converter coverage proves the same effective-result projection and no-false-positive behavior.
- AC-010: Frontend Activity code requires no MCP-specific parsing changes for this behavior.

## Constraints / Dependencies

- Must preserve MCP protocol-correct envelopes at the MCP server/provider boundary.
- Must avoid applying MCP projection to non-MCP/source-unknown lanes.
- Must keep provider-specific browser/media post-processing behavior valid.
- Must keep raw diagnostic/provider payloads available only where already intentionally retained; the normal Activity `result` should be the effective result.

## Assumptions

- Source-confirmed MCP result lanes can be identified from provider item family/type and/or raw MCP wire tool names such as `mcp__server__tool`.
- A recognizable MCP tool-result envelope has a protocol shape centered on `content` blocks plus optional `structuredContent`, `_meta`, and `isError`.
- Users expect Activity `result` to mean the tool's useful output, not transport/protocol metadata.

## Risks / Open Questions

- Rich/multimodal content may need a later UI-specific renderer; this change only ensures the normal result is deterministic and not wrapped in top-level protocol metadata.
- If a provider introduces a new MCP source marker or wire-name convention, the source eligibility helper may need extension.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002, UC-003, UC-004, UC-005, UC-008
- REQ-002 -> UC-009
- REQ-003 -> UC-001, UC-007, UC-009
- REQ-004 -> UC-003
- REQ-005 -> UC-001, UC-002, UC-004, UC-005
- REQ-006 -> UC-001, UC-003, UC-005, UC-008
- REQ-007 -> UC-006
- REQ-008 -> UC-006
- REQ-009 -> UC-007
- REQ-010 -> all use cases

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> original task-delegation regression scenario.
- AC-002 -> generic JSON MCP result scenario.
- AC-003 -> generic text MCP result scenario.
- AC-004 -> structured-content scenario.
- AC-005 -> multi-text scenario.
- AC-006 -> rich/mixed-content scenario.
- AC-007 -> no false-positive source-gating scenario.
- AC-008 -> MCP error scenario.
- AC-009 -> second-provider parity scenario.
- AC-010 -> frontend-passive-consumer scenario.

## Approval Status

Design-ready after round-2 review rework. User approved the general product direction; architecture review required explicit source gating and deterministic projection/error shapes, now incorporated here and in the design spec.
