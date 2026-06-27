# Design Spec

## Current-State Read

The original observed bug was `delegate_task` / `review_task_result` under Codex runtime showing a raw MCP result envelope in Activity:

```json
{
  "content": [{ "type": "text", "text": "{ ...escaped JSON... }" }],
  "structuredContent": null,
  "_meta": null
}
```

Native AutoByteus runtime shows the useful/effective result instead. The task service itself returns clean domain DTOs; the difference is the provider/runtime projection path.

Current generic problem:

1. MCP provider/tool boundaries correctly use MCP tool-result envelopes: `content`, optional `structuredContent`, optional `_meta`, optional `isError`.
2. Codex/Claude event conversion may receive that envelope in provider `result` fields.
3. Existing conversion normalizes some built-in families, such as browser/media, but there is no general source-gated MCP effective-result projection.
4. Frontend Activity stores and renders backend `payload.result` directly.
5. Therefore any MCP-backed tool can display confusing protocol wrapper fields when backend emits the raw envelope.

Architecture review round 2 accepted the high-level ownership direction but found two blocking design gaps. This revision resolves them by making MCP projection source-gated/context-aware and by defining exact projection/error shapes for multi-text, mixed/rich content, and `isError: true`.

## Intended Change

Add a general backend MCP effective-result projector and call it only from source-confirmed MCP provider result lanes. The projector must not be a value-only global unwrapping function. Provider converters must either prove the result source is MCP before invoking it or pass an explicit MCP source context.

Conceptual projection:

```text
Provider terminal result lane
  -> if lane is not source-confirmed MCP: do not call projector; emit existing result unchanged
  -> if source-confirmed MCP: call projector with source context
      -> prefer non-null structuredContent
      -> else project content blocks deterministically
      -> surface isError separately as failure information
  -> emit app lifecycle event with effective result or deterministic error
```

Top-level protocol fields (`content`, `structuredContent`, `_meta`, `isError`) must not appear as normal successful Activity result fields. `_meta` may remain available only at explicit protocol/debug/raw boundaries, not as `payload.result`.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug fix / behavior normalization.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small focused refactor.
- Evidence: frontend Activity is a passive renderer; Codex returns `payload.result` unchanged if present; raw MCP envelopes can surface for MCP-backed tools. Existing browser/media normalizers demonstrate backend projection is the right layer.
- Design response: Introduce a source-gated general MCP effective-result projector used by Codex and Claude MCP result conversion.
- Refactor rationale: The issue is broader than task-delegation. A source-gated projector removes future one-off patches while protecting non-MCP exact-envelope-shaped domain values.
- Intentional deferrals and residual risk: Rich/multimodal content may still need better visual rendering later; this change defines a deterministic non-envelope result shape now.

## Terminology

- **MCP tool-result envelope**: protocol shape containing `content` plus optional `structuredContent`, `_meta`, and `isError`.
- **Source-confirmed MCP result lane**: a provider event path where converter evidence proves the tool result came from MCP, e.g. Codex `mcp_tool_call` family or raw wire tool name `mcp__server__tool`.
- **Effective result**: the useful output users expect to see in Activity: structured content, parsed JSON, plain text, joined text, or sanitized rich content items.
- **Protocol boundary**: MCP JSON-RPC/provider boundary where the envelope is still required.
- **Application-facing lifecycle event**: backend event consumed by frontend Activity/history, where the result should be effective output.

## Design Reading Order

1. source eligibility / false-positive boundary
2. data-flow spine
3. projection contract and error contract
4. provider converter integration
5. tests and migration sequence

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the raw MCP envelope as the normal application-facing Activity result for source-confirmed MCP-backed tool calls.
- The MCP envelope remains at the MCP protocol boundary because it is the active protocol, not legacy behavior.
- Reject frontend-side compatibility parsing as the primary fix; backend emits one canonical app-facing result shape.
- Replace/remove any task-delegation-only result normalizer from the implementation path; it is superseded by the general source-gated MCP projector.

## Source Eligibility Contract (Resolves DR-001)

The projector is not a value-only utility. It requires explicit MCP source context and provider converters must not call it from source-unknown/non-MCP lanes.

### Projector interface

```ts
export type McpEffectiveResultSource = {
  kind: "mcp_tool_result";
  provider: "codex" | "claude";
  evidence:
    | "codex_item_family_mcp_tool_call"
    | "provider_mcp_wire_tool_name"
    | "explicit_provider_mcp_marker";
  rawToolName: string | null;
  canonicalToolName: string | null;
};

export type McpEffectiveToolResultProjection = {
  matched: boolean;
  result: unknown;
  isError: boolean;
  errorMessage: string | null;
};

export const projectMcpToolResultForApplication = (
  value: unknown,
  source: McpEffectiveResultSource,
): McpEffectiveToolResultProjection;
```

There is intentionally no public `projectMcpToolResultForApplication(value)` overload. Source context is mandatory.

### MCP source evidence rules

- **Codex eligible lanes**:
  - `resolveCodexToolItemFamily(item.type) === "mcp_tool_call"`; or
  - the raw, unnormalized provider tool name matches the general MCP wire-name pattern `^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$`.
- **Codex ineligible lanes**:
  - `command_execution`, `file_change`, `web_search`; and
  - `dynamic_tool_call` without an MCP wire-name raw tool name or explicit provider MCP marker.
- **Claude eligible lanes**:
  - raw `payload.tool_name` matches `^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$`; or
  - a future explicit provider marker states the result source is MCP.
- **Claude ineligible lanes**:
  - `ITEM_COMMAND_EXECUTION_COMPLETED` for raw tool names that do not match MCP wire naming and have no explicit MCP marker.

Provider converters should compute eligibility before canonicalizing tool names for display. Canonical display names can still strip the MCP prefix after source evidence is recorded.

### Envelope matcher rules

When called with MCP source context, the projector matches an envelope if:

- `value` is a non-array object;
- `value.content` is an array;
- every content item is a non-array object with a non-empty string `type`.

Recognized top-level MCP protocol keys are `content`, `structuredContent`, `_meta`, and `isError`. Because source is already confirmed MCP, extra top-level provider/debug keys are tolerated but treated as envelope metadata and excluded from the application-facing `result`. If `content` is missing or malformed, `matched=false`, `result=value`, `isError=false`, `errorMessage=null`; the converter then follows its existing non-projected behavior.

This contract satisfies the non-MCP no-op requirement: an exact envelope-shaped non-MCP domain object is unchanged because the converter never supplies MCP source context for non-MCP lanes.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Tool implementation returns useful output | MCP provider/runtime receives protocol result | Tool owner + MCP adapter | Confirms MCP envelope is transport/protocol, not necessarily the user-facing result. |
| DS-002 | Return-Event | Source-confirmed MCP provider terminal event | Frontend Activity `payload.result` | Provider event converter | This is where raw envelope currently leaks and where source eligibility is known. |
| DS-003 | Bounded Local | Source-confirmed raw MCP envelope | Effective result projection plus error hint | MCP effective-result projector | Defines one reusable projection rule for all MCP-backed results. |

## Primary Execution Spine(s)

`Tool result -> MCP protocol envelope at MCP boundary -> provider completion payload -> provider converter source eligibility -> MCP effective-result projector -> app lifecycle event -> frontend Activity`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A tool produces useful output. If exposed over MCP, the output is wrapped in protocol fields required by MCP. | Tool output, MCP result envelope | Tool owner + Agent Tools MCP/configured MCP adapter | Protocol compliance, error signaling |
| DS-002 | A provider emits a completed tool event. The backend checks whether the raw result lane is source-confirmed MCP, then maps it into an app lifecycle event. | Provider payload, source evidence, lifecycle event, Activity result | Codex/Claude event converters | Source eligibility, canonical tool name, family post-processing, failure status |
| DS-003 | The projector receives only source-confirmed MCP envelopes and derives effective output. It drops top-level protocol metadata from normal result and emits error hint separately. | MCP envelope, structured content, content blocks, effective result | General MCP effective-result projector | JSON parse safety, rich-content sanitization, deterministic error extraction |

## Spine Actors / Main-Line Nodes

- MCP tool-result envelope: protocol carrier for tool result content.
- Source eligibility helpers: identify Codex/Claude MCP result lanes from item family, raw tool name, or explicit provider marker.
- `CodexToolPayloadParser.resolveToolResult(...)`: extracts provider result candidate.
- `CodexItemEventConverter`: owns Codex provider event to app lifecycle event projection and source eligibility.
- `ClaudeSessionEventConverter`: owns Claude provider event to app lifecycle event projection and source eligibility.
- New MCP effective-result projector: converts source-confirmed MCP envelopes to effective results.
- Frontend Activity projection: stores/renders backend result without MCP-specific parsing.

## Ownership Map

| Node | Concrete Ownership |
| --- | --- |
| Tool/domain implementation | Produces the tool's actual useful output and domain semantics. |
| Agent Tools MCP/configured MCP adapters | Produce MCP-protocol-correct envelopes at provider boundaries. |
| Codex/Claude event converters | Own source eligibility and application lifecycle event type/payload shape. |
| MCP effective-result projector | Owns envelope matching, effective output derivation, rich-content sanitization, and error-message extraction for source-confirmed MCP values. |
| Frontend Activity | Displays already-normalized app-facing results. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Frontend `ToolActivityItem` | Backend lifecycle payload projection | Renders Activity details | MCP envelope parsing or protocol metadata policy |
| MCP JSON-RPC route | MCP adapter/result mapper | Speaks MCP protocol to providers/clients | Application Activity display semantics |
| Provider event converter methods | Provider backend subsystem | Convert provider event payloads to app events | Tool-domain service logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Raw MCP envelope as normal Activity `result` for source-confirmed MCP tools | Users expect effective output, not protocol wrapper | General MCP effective-result projector | In This Change | Applies to all source-confirmed MCP tool results. |
| Task-delegation-only MCP result normalizer | Too narrow; does not solve generic MCP tool issue | General MCP effective-result projector | In This Change | Remove/replace any draft implementation. |
| Frontend MCP envelope parsing | Would duplicate backend projection and leave history/API inconsistent | Backend projection boundary | In This Change | Frontend remains passive. |

## Return Or Event Spine(s) (If Applicable)

`Provider terminal payload -> resolve raw result and raw tool name -> source eligibility -> project MCP effective result if eligible -> combine provider failure with projection.isError -> emit TOOL_EXECUTION_SUCCEEDED/FAILED with effective result or deterministic error`

## Projection Contract (Resolves DR-002)

### Content-block sanitization

- Preserve provider order.
- A text block contributes `{ type: "text", text }` where `text` is the original string value.
- A non-text block contributes a JSON-safe shallow/deep clone of the block with any `_meta` field removed.
- Invalid blocks are not possible for a matched envelope; if any block is invalid, the envelope does not match and projection returns `matched=false`.

### Result precedence

1. If `structuredContent !== null && structuredContent !== undefined`, result is `structuredContent`. Do not parse or transform it.
2. Else if `content` contains exactly one text block and no non-text blocks:
   - try `JSON.parse(text.trim())`;
   - if parsing succeeds, result is the parsed JSON value, including arrays/primitives;
   - if parsing fails, result is the original text string.
3. Else if `content` contains multiple blocks and all blocks are text:
   - result is the original text strings joined in provider order with exactly `"\n\n"`.
   - Do not JSON-parse joined multi-text output.
4. Else if `content` contains any non-text block:
   - result is `{ items: sanitizedBlocks }`, where `sanitizedBlocks` are all content blocks in provider order.
5. Else if `content` is empty and structured content is nullish:
   - result is `null`.

Top-level envelope keys (`content`, `structuredContent`, `_meta`, `isError`) and tolerated extra top-level provider/debug keys are never copied into successful `result`.

### Error contract

`projection.isError` is `value.isError === true` for a matched envelope. The projector returns `errorMessage` only when `isError` is true.

Error-message precedence:

1. provider-converter explicit error, if already present outside the projector;
2. if effective result is a non-empty string, that string;
3. if effective result is an object with `error.message` string, that value;
4. if effective result is an object with `message` string, that value;
5. if effective result is an object with `error` string, that value;
6. first non-empty text block string from `content`;
7. fallback string `MCP tool execution failed.`.

Converter failure behavior:

- If provider already marks the tool failed, emit `TOOL_EXECUTION_FAILED` using provider error first, then projector error as fallback.
- If provider marks success/complete but `projection.isError === true`, emit `TOOL_EXECUTION_FAILED`.
- Failure payload includes `error` and does **not** include a successful `result` field. Converters must overwrite/drop any raw provider `result` from the emitted failure payload.
- Successful payload includes effective `result` and does not include raw top-level MCP envelope fields under `result`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: general MCP effective-result projector.

`Validate source context -> match envelope shape -> choose structuredContent/content -> sanitize/project result -> extract isError/errorMessage -> return projection`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| MCP source eligibility | DS-002, DS-003 | Provider converters | Decide whether projector may be called | Prevents false-positive rewriting of exact-envelope-shaped non-MCP values | Value-only global parsing could corrupt domain outputs. |
| JSON parsing of one text block | DS-003 | Projector | Show JSON text as object/array/primitive | Matches native runtime behavior for JSON-string tool outputs | If left to UI, consumers disagree. |
| Rich content sanitization | DS-003 | Projector | Produce deterministic `{ items: [...] }` | Avoids top-level protocol wrapper while preserving content order | Implementers would invent inconsistent shapes. |
| Error message extraction | DS-002, DS-003 | Projector + converters | Treat `isError: true` as failure when needed | MCP errors can be encoded in result envelope | Otherwise errors may appear as successful raw envelopes. |
| Browser/media post-processing | DS-002 | Existing family owners | Preserve family-specific expectations after generic projection | Existing behavior must not regress | Folding all family behavior into the generic projector would over-own. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Protocol result mapping | `agent-tools/mcp` result mapper | Reuse unchanged | Still needed at MCP boundary | N/A |
| Browser result validation/warnings | browser MCP normalizer | Reuse/keep | Has browser-specific tab semantics | N/A |
| Media result normalization | Claude media normalizer | Reuse/keep | Has media-specific semantics | N/A |
| General app-facing MCP result projection | MCP tool/result projection capability | Create new general projector | The invariant applies to all source-confirmed MCP-backed results | Task-delegation-specific normalizer is too narrow. |
| MCP source naming detection | Existing Agent Tools MCP naming plus new general MCP wire-name helper | Extend | Agent Tools helper only covers one server name; configured MCP tools need general `mcp__server__tool` detection | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/mcp` | MCP protocol/result shape knowledge and general MCP wire-name/source utilities | DS-001, DS-003 | MCP adapters + provider projections | Extend | Best home for generic envelope/result semantics. |
| Codex backend event conversion | Codex provider event -> app lifecycle event | DS-002 | Codex backend | Extend | Invoke projector only after Codex MCP source eligibility is true. |
| Claude backend event conversion | Claude provider event -> app lifecycle event | DS-002 | Claude backend | Extend | Invoke projector only after Claude MCP source eligibility is true. |
| Browser/media tool result normalizers | Family-specific post-processing | DS-002 | Browser/media owners | Reuse | Should operate after generic projection when eligible, or no-op when not relevant. |
| Frontend Activity | Display normalized result | DS-002 | UI | Reuse unchanged | No MCP parser added. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-tools/mcp/mcp-effective-tool-result-projector.ts` | MCP result projection | MCP app-facing projection helper | Source-context-required envelope projection and error extraction | One generic projection policy | Reuses MCP result shape and source context types. |
| `src/agent-tools/mcp/mcp-tool-source.ts` or colocated helper | MCP source detection | MCP wire-name utility | General `mcp__server__tool` detection for providers | Keeps source naming out of task/browser domains | Existing Agent Tools MCP name helpers. |
| `src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex backend | Provider event projection | Determine MCP eligibility and call projector for terminal result events | Existing conversion boundary | Reuses projector + source helper + browser normalizer. |
| `src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude backend | Provider event projection | Determine MCP eligibility and call projector for completed command/tool events | Existing conversion boundary | Reuses projector + source helper + browser/media normalizers. |
| Tests | Unit/converter tests | Regression evidence | Generic projection, source gating, error/rich shapes, provider parity | Existing test folders match affected owners | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| MCP envelope effective-result extraction | `mcp-effective-tool-result-projector.ts` | `agent-tools/mcp` | Used by provider event converters | Yes | Yes | A tool-domain service or frontend renderer. |
| MCP source context/wire-name detection | `mcp-tool-source.ts` or projector-owned helper | `agent-tools/mcp` | Codex and Claude both need the same wire-name rule | Yes | Yes | A value-only projector bypass. |
| Text JSON parsing with depth guard | Projector-private helper | `agent-tools/mcp` | Needed inside projection | N/A | N/A | An unsafe global parser for arbitrary values. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| MCP `content` | Yes at protocol boundary | N/A | Medium when exposed as Activity result | Project to effective result only in source-confirmed MCP lanes. |
| MCP `structuredContent` | Yes as structured tool output | N/A | Medium when shown as wrapper field | Use its value as result, not its field name. |
| MCP `_meta` | Protocol/internal metadata | N/A | High user confusion if displayed | Omit from normal Activity result. |
| `McpEffectiveResultSource` | Yes | Yes | Low | Mandatory context prevents value-only false positives. |
| Native/non-MCP result objects | Domain-specific | N/A | Low after source gating | Never call projector without MCP source evidence. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/mcp-effective-tool-result-projector.ts` | MCP result projection | Application-facing MCP output projector | Convert source-confirmed MCP tool-result envelopes into effective results plus error hint | Centralizes generic policy for all MCP tools | MCP source context type; local safe parsing/sanitization helpers. |
| `autobyteus-server-ts/src/agent-tools/mcp/mcp-tool-source.ts` (or colocated in projector if tiny) | MCP source detection | Provider MCP source utility | General MCP wire-name detection and source evidence helpers | Shared by Codex/Claude | Existing Agent Tools MCP naming pattern. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex backend | Codex app-event projection | Determine MCP source eligibility; invoke projector; apply failure/result emission contract | Existing owner of Codex lifecycle payload shape | Existing browser normalizer. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude backend | Claude app-event projection | Determine MCP source eligibility; invoke projector; apply failure/result emission contract | Existing owner of Claude lifecycle payload shape | Existing browser/media normalizers. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/mcp-effective-tool-result-projector.test.ts` | Tests | Projector unit coverage | Validate source-context projection, result shapes, rich content, and error extraction | Isolates core rule | N/A |
| Codex converter tests | Tests | Codex regression | Prove task/generic MCP projection and non-MCP no-false-positive behavior | Existing converter suite | N/A |
| Claude converter tests | Tests | Claude regression | Prove provider parity and non-MCP no-false-positive behavior | Existing converter suite | N/A |

## Ownership Boundaries

The MCP adapter/result mapper owns protocol correctness and continues returning MCP envelopes where MCP clients/providers expect them. The new projector owns application-facing projection only after source eligibility is established by provider converters. Provider event converters own when to call the projector and whether `isError` changes lifecycle event type. Frontend Activity does not own MCP protocol interpretation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| MCP adapter/result mapper | JSON-RPC/MCP envelope construction | MCP provider/client routes | App UI assuming protocol envelope is user result | Add app-facing projector, not protocol mutation. |
| MCP effective-result projector | Source-context-required envelope matching, structured/text/content projection, error hint | Source-confirmed Codex/Claude MCP converter paths | Value-only global unwrapping | Extend source context/projection contract. |
| Provider event converters | Source eligibility and lifecycle event type/payload shape | Streaming/run-history/frontend consumers | Raw MCP envelope as normal `payload.result` | Invoke projector only with source evidence. |

## Dependency Rules

- The projector may depend on MCP result shape/source context types and local safe-clone/parse helpers.
- The projector must not depend on task-delegation, browser, media, frontend, run history, or domain service internals.
- Codex/Claude converters may depend on the projector and MCP source helper.
- MCP JSON-RPC route/result mapper must not use the app-facing projector to build protocol responses.
- Frontend Activity must not parse MCP envelopes for this fix.
- Forbidden shortcut: do not apply MCP projection to command/file/web/native/source-unknown lanes merely because the value shape resembles an MCP envelope.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `projectMcpToolResultForApplication(value, source)` | MCP app-facing result projection | Return effective result and error hint for source-confirmed MCP envelopes | Unknown raw provider result plus mandatory `McpEffectiveResultSource` | No value-only overload. |
| `isMcpWireToolName(value)` | MCP source detection | Detect `mcp__server__tool` raw provider names | Raw unnormalized tool name | General, not Agent-Tools-only. |
| `CodexItemEventConverter` terminal result path | Codex lifecycle event | Determine MCP eligibility and emit normalized result/error | Provider payload, item family, raw tool name | Combine provider failure with `projection.isError`. |
| `ClaudeSessionEventConverter` completed command path | Claude lifecycle event | Determine MCP eligibility and emit normalized result/error | Provider payload, raw tool name | Preserve browser/media post-processing. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `projectMcpToolResultForApplication(value, source)` | Yes | Yes | Low | Mandatory source context. |
| Codex source eligibility | Yes | Yes | Low | Use item family or raw MCP wire name. |
| Claude source eligibility | Yes | Yes | Low | Use raw MCP wire name or explicit provider marker. |

## Applied Patterns (If Any)

- Adapter/projection pattern: provider-specific events are adapted into app-facing lifecycle events.
- Source-gated effective-result projector pattern: protocol envelopes are mapped to user-meaningful output only after source evidence proves MCP origin.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/mcp-effective-tool-result-projector.ts` | File | MCP result projection | Generic source-confirmed envelope-to-effective-result projection | MCP subsystem owns envelope semantics | UI rendering, provider event construction, task lifecycle logic |
| `autobyteus-server-ts/src/agent-tools/mcp/mcp-tool-source.ts` | File | MCP source helper | General MCP raw tool-name/source evidence helpers | Shared by provider converters | Provider event emission logic |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | File | Codex provider projection | Source eligibility and projector invocation in tool lifecycle event mapping | Existing Codex event owner | Generic projector internals |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | File | Claude provider projection | Source eligibility and projector invocation in command/tool completion mapping | Existing Claude event owner | Generic projector internals |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/` | Folder | MCP projection tests | Projector/source helper behavior tests | Mirrors source owner | Provider-specific event tests |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Source Eligible? | Input Result | App-Facing Output | Why |
| --- | --- | --- | --- | --- |
| JSON text content | Yes | `{ content: [{ type: "text", text: "{\"ok\":true}" }], _meta: {...} }` | success `result = { "ok": true }` | Shows useful JSON output, not metadata. |
| Plain text content | Yes | `{ content: [{ type: "text", text: "completed" }], structuredContent: null }` | success `result = "completed"` | Simple text remains simple text. |
| Multiple text blocks | Yes | `{ content: [{ type: "text", text: "one" }, { type: "text", text: "two" }] }` | success `result = "one\n\ntwo"` | Deterministic ordering/separator. |
| Structured content plus fallback text | Yes | `{ structuredContent: { answer: 42 }, content: [{ type: "text", text: "fallback" }] }` | success `result = { "answer": 42 }` | Structured result is preferred. |
| Mixed/rich content | Yes | `{ content: [{ type: "text", text: "see image" }, { type: "image", data: "...", mimeType: "image/png", _meta: { hidden: true } }], _meta: {...} }` | success `result = { "items": [{ "type": "text", "text": "see image" }, { "type": "image", "data": "...", "mimeType": "image/png" }] }` | Removes top-level envelope and block `_meta`, preserves useful ordered items. |
| Empty content | Yes | `{ content: [], structuredContent: null }` | success `result = null` | Deterministic empty output. |
| `isError` with parsed error | Yes | `{ isError: true, content: [{ type: "text", text: "{\"error\":{\"message\":\"bad input\"}}" }] }` | failed event `error = "bad input"`, no `result` | Error object precedence. |
| `isError` with plain text | Yes | `{ isError: true, content: [{ type: "text", text: "bad input" }] }` | failed event `error = "bad input"`, no `result` | Text error precedence. |
| Exact envelope-shaped non-MCP object | No | `{ content: [{ type: "text", text: "domain value" }] }` from command/native/source-unknown lane | unchanged existing result | Source gate prevents false positive. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Task-delegation-only normalizer | Initial symptom was task delegation | Rejected for final design | General source-gated MCP effective-result projector. |
| Value-only global MCP projector | Simpler API | Rejected | Mandatory source context / converter source eligibility. |
| Frontend parses raw MCP envelopes | Quick display fix | Rejected | Backend emits canonical effective result. |
| Keep showing raw `_meta` and document it | Avoids backend change | Rejected | `_meta` is not normal user-facing result content. |
| Mutate MCP protocol response itself | Would remove wrapper everywhere | Rejected | Keep protocol boundary correct; only app-facing projection changes. |

## Derived Layering

- Tool/domain layer: produces useful output.
- MCP protocol layer: wraps output for MCP providers/clients.
- Provider projection layer: proves MCP source, projects effective result/error, and emits app lifecycle events.
- Presentation layer: displays app-facing result.

## Migration / Refactor Sequence

1. Remove/avoid the previous task-delegation-specific normalizer approach.
2. Add MCP source helper under `agent-tools/mcp`:
   - `isMcpWireToolName(value)` with `^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$`.
   - source context builders for Codex/Claude if useful.
3. Add `mcp-effective-tool-result-projector.ts` under `agent-tools/mcp` with mandatory `McpEffectiveResultSource` parameter.
4. Implement envelope matching exactly as specified: source context required, object result, `content` array, all blocks records with non-empty string `type`; tolerate but drop extra top-level provider/debug keys.
5. Implement deterministic projection rules for structured content, single text JSON/text, multi-text joined by `\n\n`, mixed/rich `{ items }`, empty content `null`.
6. Implement deterministic `isError`/`errorMessage` extraction rules.
7. Update Codex terminal tool conversion:
   - compute raw tool name before canonical display normalization;
   - mark MCP eligible for `mcp_tool_call` family or raw MCP wire tool name;
   - do not call projector for command/file/web/native/source-unknown lanes;
   - if projected and `projection.isError`, emit failure with error and no successful result;
   - on success, emit effective result and then apply existing browser normalizer where relevant.
8. Update Claude completed command/tool conversion similarly:
   - compute raw tool name before canonical display normalization;
   - mark MCP eligible only for raw MCP wire tool name or explicit provider MCP marker;
   - do not call projector for non-MCP raw tool names even if result shape looks like an envelope;
   - preserve browser/media post-processing after effective projection.
9. Ensure terminal event payload builders overwrite/drop raw provider `result` when emitting failure so Activity cannot see the raw envelope as `result`.
10. Add projector/source-helper unit tests.
11. Add Codex converter regressions for task-delegation, generic JSON/text/structured/multi/rich/error MCP results, and non-MCP exact-envelope-shaped no-op.
12. Add Claude converter regressions for equivalent MCP projection and non-MCP no-op.
13. Run targeted server unit tests and record any environment blockers.

## Key Tradeoffs

- Source-gated projection is slightly more plumbing than a value-only normalizer, but it safely preserves non-MCP domain outputs.
- A general projector fixes future MCP tools without one-off family patches.
- Rich content is represented as `{ items: [...] }` now to avoid top-level protocol wrapper confusion while leaving richer UI rendering as a later concern.
- `_meta` is omitted from normal result to reduce user confusion, while raw provider/protocol payloads can remain available in explicit debug paths.

## Validation Plan

- Unit-test source helper and projector directly.
- Regression-test Codex and Claude event conversion.
- Verify the original task-delegation screenshot scenario would now show the parsed task object.
- Verify a generic source-confirmed MCP result with `_meta` no longer shows `_meta` as Activity result.
- Verify an exact envelope-shaped non-MCP result remains unchanged.
- Verify `isError: true` emits failure with deterministic `error` and no successful `result`.

## Review Rework Notes

This revision addresses architecture review findings:

- DR-001: projector is no longer value-only; mandatory source context and converter eligibility rules prevent false-positive non-MCP rewrites.
- DR-002: deterministic projection shapes and error-message precedence are specified for one text, multi-text, mixed/rich content, structured-content fallback, empty content, and `isError: true`.

## Handoff Notes

The implementation should supersede any narrow task-delegation-specific result normalizer currently present in the working tree. The intended design is a general, source-gated MCP effective-result projection applied at provider event conversion boundaries.
