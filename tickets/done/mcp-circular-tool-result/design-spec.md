# Design Spec

## Current-State Read

The reported `[Circular]` Activity result is produced on the Codex local MCP terminal-result event path after Browser MCP has already returned a normal structured result.

Current execution path:

1. The configured Browser MCP server runs from `/home/autobyteus/workspace/autobyteus-mcps/browser-mcp` and returns a structured Browser tool result such as `{ url, result, tab_id }` or an MCP envelope containing a text block with that JSON.
2. Codex app-server emits an MCP item completion.
3. `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` emits `codex/local/mcpToolExecutionCompleted` by shallow-spreading raw `params` and adding normalized ids/arguments.
4. `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` converts the local completion into `TOOL_EXECUTION_SUCCEEDED`. It first calls `serializeCodexItemEventPayload(...)`, then resolves the tool result through `CodexToolPayloadParser.resolveToolResult(...)`, then normalizes known Browser MCP result envelopes through `normalizeBrowserMcpToolResult(...)`.
5. `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` currently serializes payloads with one global `WeakSet`. It marks the second observation of the same object identity as `[Circular]`, even when the repeated reference is only a shared sibling value and not an ancestor cycle.
6. If the same MCP result object appears under both `item.result` and top-level `result`, the serializer can turn one of those fields into the literal string `[Circular]`.
7. `CodexToolPayloadParser.resolveToolResult(...)` prefers top-level `payload.result` before `item.result`; therefore the placeholder can become the authoritative emitted result.
8. Frontend Activity renders the received result. It does not create the Activity `[Circular]` marker.

Current ownership boundaries are mostly correct:

- Browser MCP owns browser automation output and should not be changed for this defect.
- Backend event payload serialization owns JSON-safe structural projection and must distinguish true cycles from repeated references.
- Codex event conversion owns selecting/normalizing tool results for Activity events.
- Browser MCP result normalization owns unwrapping known Browser MCP envelopes.
- Frontend Activity owns display only and should not mask backend-corrupted result values.

The target design must preserve JSON safety for genuine cycles while stopping false `[Circular]` substitution for shared result references.

## Intended Change

Replace the global already-seen serialization check in `serializePayload(...)` with path/ancestor-aware circular detection. Repeated shared references must serialize as duplicated JSON-safe values. Only values already present on the current ancestor path must serialize as `[Circular]`.

Add backend regression coverage proving:

- repeated shared references are preserved as duplicated values;
- true ancestor cycles still serialize safely;
- a local Codex Browser MCP completion whose `params.item.result` and `params.result` alias the same MCP envelope emits the normalized Browser result object rather than `[Circular]`.

Do not add a frontend display workaround and do not change Browser MCP behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, localized to the serializer implementation.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor needed.
- Evidence: Direct Browser MCP probes returned normal JSON for serializable `run_script`; a truly circular JavaScript return errored in Browser MCP rather than returning `[Circular]`; built-runtime reproduction showed `serializePayload({ item: { result }, result })` can create top-level `result: "[Circular]"`; `resolveToolResult(...)` then selects that placeholder; frontend Activity renders received strings as-is.
- Design response: Keep existing owners and fix the serializer algorithm. Add targeted regression tests at the serializer boundary and Codex MCP event-conversion boundary.
- Refactor rationale: The current subsystem placement is healthy. The defect is not caused by wrong ownership or fragmented policy; it is a false-positive cycle detector. A contained algorithm replacement plus tests is sufficient.
- Intentional deferrals and residual risk, if any: No broad Codex result-priority refactor is included. A narrow parser fallback may be considered only if implementation discovers persisted or historical already-serialized payloads must be corrected; otherwise avoid placeholder-skipping because a tool could legitimately return the literal string `[Circular]`.

## Terminology

- `JSON-safe payload`: a value safe to pass through `JSON.stringify`/`JSON.parse` for streaming, persistence, and UI rendering.
- `Ancestor cycle`: an object reference that points to an object already on the current traversal path.
- `Shared reference`: the same object identity referenced from multiple sibling or non-ancestor positions in the payload.
- `MCP envelope`: a tool-result wrapper with fields such as `content`, `structuredContent`, or `_meta`.
- `Normalized Browser result`: the direct Browser result object emitted to Activity after `normalizeBrowserMcpToolResult(...)`, e.g. `{ tab_id, url, result }`.

## Design Reading Order

1. Data-flow spine: Codex local MCP completion to Activity success result.
2. Serialization owner: JSON-safe payload projection.
3. Result projection owner: tool-result candidate resolution plus Browser MCP normalization.
4. Concrete file changes and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: decommission the global `WeakSet` “seen ever” circular-detection behavior in `serializePayload(...)` for all future serialized payloads.
- No compatibility wrapper, dual serializer, feature flag, or frontend masking fallback should be introduced for the old false-positive behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Browser MCP structured tool result / Codex local MCP completion | `TOOL_EXECUTION_SUCCEEDED.payload.result` consumed by Activity | Codex item event conversion, with serializer as structural projection owner | This is where the real result currently becomes `[Circular]`. |
| DS-002 | Bounded Local | Arbitrary backend event payload object | JSON-safe record from `serializePayload(...)` | `payload-serialization.ts` | This local serialization algorithm must distinguish shared refs from true cycles. |
| DS-003 | Return-Event | `TOOL_EXECUTION_SUCCEEDED` AgentRunEvent | Frontend Activity tool card result display | Agent streaming/store/UI pipeline | Confirms the UI should receive corrected data rather than hide corruption. |

## Primary Execution Spine(s)

`Browser MCP result -> Codex MCP completion params -> Codex local MCP completed event -> serializeCodexItemEventPayload / serializePayload -> CodexToolPayloadParser.resolveToolResult -> normalizeBrowserMcpToolResult -> TOOL_EXECUTION_SUCCEEDED -> Activity result display`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A Browser MCP completion arrives with a result envelope. Codex event conversion creates the terminal tool event, normalizes tool identity, extracts arguments/result, unwraps Browser MCP envelopes, and emits the success event. | Browser MCP result, Codex local completion, AgentRunEvent payload | `CodexItemEventConverter` for event shape; `serializePayload` for JSON-safety | Provider-name redaction, Browser result unwrapping, error/failure branching |
| DS-002 | The serializer walks an unknown object graph and projects it into JSON-safe data. It must preserve repeated non-cyclic values and replace only actual cycle edges. | Input payload object graph, ancestor path, JSON-safe output record | `payload-serialization.ts` | BigInt conversion, JSON.stringify-compatible omission/null behavior, fallback error object |
| DS-003 | The success event streams to the frontend store and tool card. The UI formats the result it receives; it does not decide whether a backend placeholder is legitimate. | AgentRunEvent, tool activity store, tool card | Agent streaming handlers / Activity UI | Display formatting only |

## Spine Actors / Main-Line Nodes

- Browser MCP tool implementation (`run_script`, `open_tab`, etc.)
- Codex MCP completion notification
- `CodexThreadNotificationHandler`
- `CodexItemEventConverter`
- `serializeCodexItemEventPayload(...)`
- `serializePayload(...)`
- `CodexToolPayloadParser.resolveToolResult(...)`
- `normalizeBrowserMcpToolResult(...)`
- `TOOL_EXECUTION_SUCCEEDED` event payload
- Frontend Activity renderer

## Ownership Map

- Browser MCP owns executing browser actions and returning structured results. It must not own AutoByteus Activity serialization defects.
- `CodexThreadNotificationHandler` owns adapting raw Codex item-completed notifications into local event names and enriched identifiers. It may preserve raw reference identity; it is not responsible for deep cloning results.
- `serializePayload(...)` owns JSON-safety of backend event payloads. It must be semantically correct for graph traversal: ancestor cycles are placeholders; shared references are duplicated values.
- `serializeCodexItemEventPayload(...)` owns Agent Tools MCP provider redaction after JSON-safe serialization.
- `CodexToolPayloadParser` owns candidate extraction from a serialized payload.
- `normalizeBrowserMcpToolResult(...)` owns known Browser MCP envelope unwrapping after candidate extraction.
- Frontend Activity owns presentation of the already-normalized result.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `serializeCodexItemEventPayload(...)` | `serializePayload(...)` for JSON-safety; Agent Tools MCP sanitizer for provider redaction | Single Codex event-payload entrypoint before conversion emits events | Cycle-detection policy beyond calling the serializer |
| `ToolActivityItem.vue` `formatJson(...)` | Backend AgentRunEvent payload contract | Render string/object values for users | Backend result repair or Browser MCP envelope normalization |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Global `WeakSet` “seen ever” circular detector in `serializePayload(...)` | It conflates shared references with true cycles and causes false `[Circular]` results | Path/ancestor-aware cycle detection in `payload-serialization.ts` | In This Change | Preserve the literal `[Circular]` only for actual cycle edges. |
| Any temptation to add a frontend `[Circular]` masking workaround | It would hide a backend data corruption and leave memory/history projections wrong | Correct backend serializer and event-converter tests | In This Change | No frontend change planned. |
| Broad parser placeholder-skipping logic | It risks corrupting legitimate tool results equal to the string `[Circular]` | Serializer correctness plus converter regression coverage | In This Change | Only consider an explicitly scoped fallback if implementation uncovers unavoidable already-serialized inputs. |

## Return Or Event Spine(s) (If Applicable)

`Codex local MCP completed event -> createTerminalToolExecutionEvent(...) -> AgentRunEventType.TOOL_EXECUTION_SUCCEEDED -> streaming payload -> frontend tool activity store -> ToolActivityItem result panel`

The return/event spine should carry a normalized Browser result object. It should not carry serializer artifacts unless the original result truly contained a circular edge.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `payload-serialization.ts`
- Local spine: `Input value -> JSON.stringify-compatible replacer with ancestor stack -> JSON.parse -> record-or-wrapper fallback`
- Why it matters: the serializer is used broadly for event payload projection; fixing it must preserve JSON-safe behavior while changing only the false-positive shared-reference case.

Recommended implementation shape:

```ts
const ancestors: object[] = [];
const serialized = JSON.parse(
  JSON.stringify(data, function (_key: string, value: unknown): unknown {
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (!value || typeof value !== "object") {
      return value;
    }
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(value)) {
      return "[Circular]";
    }
    ancestors.push(value);
    return value;
  }),
);
```

Implementation may adjust TypeScript typing for `this`, but must keep JSON.stringify-compatible behavior such as `toJSON`, object-property omission, array null substitution, and BigInt string conversion.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP provider-name/token redaction | DS-001 | `serializeCodexItemEventPayload(...)` | Remove internal server names/secrets from emitted payloads | Security and provider abstraction | Could leak provider internals or mix redaction with result selection |
| Browser MCP envelope unwrapping | DS-001 | `normalizeBrowserMcpToolResult(...)` | Convert known Browser MCP envelopes into direct result objects | Activity should show usable Browser result content | Frontend would need tool-protocol knowledge |
| BigInt conversion | DS-002 | `serializePayload(...)` | Preserve JSON-safety for BigInt values | JSON.stringify throws on raw BigInt | Events could crash instead of stream |
| True-cycle substitution | DS-002 | `serializePayload(...)` | Replace only actual cycle edges with `[Circular]` | Unknown payloads may contain cycles | Incorrect algorithm can corrupt non-cyclic shared values |
| UI formatting | DS-003 | `ToolActivityItem.vue` | Display strings and JSON objects | Separation of rendering from backend projection | UI masking would leave corrupted data elsewhere |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| JSON-safe event serialization | `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` | Extend | Existing serializer is the exact owner; only algorithm is wrong | N/A |
| Codex MCP event regression | Existing Codex thread event converter unit tests | Extend | Existing test file already covers local MCP completions and Browser MCP normalization | N/A |
| Browser MCP result normalization | `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Reuse | Normalizer already unwraps real envelopes correctly | N/A |
| Frontend result display | Existing Activity UI | Reuse unchanged | UI contract remains receiving normalized result payloads | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent streaming payload serialization | JSON-safe unknown-payload projection, BigInt conversion, cycle safety | DS-002 | Event streaming and Codex event conversion | Extend | Replace only false-positive cycle detection. |
| Codex backend event conversion | MCP terminal event projection, tool name/result/argument normalization | DS-001 | Runtime Activity event model | Extend tests only unless implementation reveals a converter bug | Add aliased result regression. |
| Browser agent-tools normalization | Browser MCP envelope unwrapping | DS-001 | Activity result payload | Reuse | No code change expected. |
| Web Activity UI | Tool card display | DS-003 | User-facing Activity panel | Reuse unchanged | No frontend workaround. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` | Agent streaming payload serialization | `serializePayload(...)` | Implement ancestor-aware cycle detection while preserving JSON-safe payload output | Existing owner of payload serialization | N/A |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts` | Serializer tests | Serializer contract | Add shared-reference vs true-cycle tests | Existing test owner | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex event conversion tests | Local MCP completion contract | Add aliased Browser MCP result regression | Existing converter test owner | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Codex result extraction | Result candidate parser | No planned change; possible explicitly scoped fallback only if required | Existing parser is susceptible only because serializer corrupts candidate | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Ancestor-aware circular detection | None; keep private in `payload-serialization.ts` | Agent streaming payload serialization | Only one production owner currently needs it | Yes | Yes | A generic utility prematurely used for unrelated cloning semantics |
| Browser MCP envelope fixture for tests | None; local test constant | Codex event conversion tests | Scope is one regression scenario | Yes | Yes | A cross-suite fixture before multiple suites need it |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| JSON-safe serialized payload record | Yes | Yes | Low after serializer fix | Preserve existing output shape; change only false-positive cycle substitution. |
| Browser MCP normalized result object | Yes | Yes | Low | Reuse current normalizer; tests assert direct result object. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` | Agent streaming payload serialization | `serializePayload(...)` | Convert unknown object payloads into JSON-safe records; preserve shared references as duplicated values; replace only ancestor cycles with `[Circular]`; keep fallback error behavior | Single authoritative serializer used by event payload paths | No |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts` | Serializer tests | Serializer unit contract | Prove non-object, true-cycle, shared-reference, and BigInt behavior | Existing focused suite | No |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex event conversion tests | Codex MCP terminal event contract | Prove aliased Browser MCP result envelope normalizes to direct Browser result and does not emit `[Circular]` | Existing suite already constructs converter and local MCP events | No |

## Ownership Boundaries

`serializePayload(...)` must not know Browser MCP semantics. It only decides how object identity and JSON-unsafe values become JSON-safe data.

`CodexItemEventConverter` must not implement a custom deep clone. It should depend on the shared serializer for JSON safety and on the Browser normalizer for Browser-specific result unwrapping.

`normalizeBrowserMcpToolResult(...)` must not compensate for serializer-created placeholders; it should continue accepting real Browser MCP envelopes and direct Browser result objects.

Frontend Activity must not infer that `[Circular]` means “look elsewhere.” If a placeholder reaches the UI, that should mean the backend intentionally represented an actual cycle edge.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `serializePayload(data)` | JSON.stringify-compatible replacer, BigInt conversion, cycle-edge handling, fallback record | Codex event payload serializers and agent streaming payload paths | Ad hoc deep clones or local WeakSet serializers in event converters | Extend serializer tests/implementation, not callers |
| `serializeCodexItemEventPayload(payload)` | Serializer plus Agent Tools MCP redaction | Codex item event conversion | Emitting raw Codex MCP provider names/secrets | Extend sanitizer if redaction fails |
| `normalizeBrowserMcpToolResult(toolName, result)` | Browser tool-name recognition and envelope parsing | Codex terminal tool event creation | Frontend or parser-specific Browser envelope unwrapping | Extend normalizer tests/logic |

## Dependency Rules

- Codex event conversion may call `serializeCodexItemEventPayload(...)`, `CodexToolPayloadParser`, and `normalizeBrowserMcpToolResult(...)`.
- Payload serialization must not depend on Codex, MCP, Browser, frontend, or Activity-specific types.
- Browser MCP normalizer may depend on Browser tool contract names only, not on frontend rendering.
- Frontend Activity must not depend on Browser MCP envelope internals for this fix.
- Tests may construct aliased object references explicitly to prove serializer and converter behavior.

Forbidden shortcuts:

- Do not fix by changing Browser MCP source.
- Do not fix by adding `if (result === "[Circular]")` rendering logic in the frontend.
- Do not add a second serializer for Codex MCP payloads.
- Do not broadly skip top-level `[Circular]` in `resolveToolResult(...)` unless there is a narrowly documented unavoidable serialized-input case and tests that preserve a legitimate literal `[Circular]` result.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `serializePayload(data: unknown): Record<string, unknown>` | Unknown event payload | Return JSON-safe record/wrapper/fallback | Any object graph; primitives return `{}` as today | Must duplicate shared references and mark only ancestor cycles. |
| `serializeCodexItemEventPayload(payload)` | Codex event payload | JSON-safe serialization plus Agent Tools provider redaction | Codex item/local event payload records | Should receive corrected serializer output. |
| `resolveToolResult(payload)` | Serialized Codex tool payload | Select result candidate from known fields | JSON-safe event payload record | Candidate priority can stay unchanged if serializer no longer corrupts top-level result. |
| `normalizeBrowserMcpToolResult(toolName, result)` | Browser MCP result value | Unwrap known Browser MCP result envelopes | Browser tool name plus real result/envelope | Should receive actual result, not serializer placeholder. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `serializePayload` | Yes | Yes | Low | Add tests for graph identity cases. |
| `serializeCodexItemEventPayload` | Mostly; serializer + redaction | Yes | Low | Keep redaction after serialization; no result semantics. |
| `resolveToolResult` | Yes | Yes | Medium only if fed corrupted placeholders | Prefer serializer fix; avoid broad placeholder fallback. |
| `normalizeBrowserMcpToolResult` | Yes | Yes | Low | Reuse unchanged unless tests reveal a normalization gap. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Payload serializer | `serializePayload` | Yes | Low | None. |
| Ancestor stack | `ancestors` or equivalent | Yes | Low | Use name that distinguishes ancestors from globally seen objects. |
| Browser result normalizer | `normalizeBrowserMcpToolResult` | Yes | Low | None. |

## Applied Patterns (If Any)

- Path-aware JSON replacer pattern: keep an ancestor stack aligned with `JSON.stringify` holder traversal using a normal `function` replacer so `this` identifies the current holder. This preserves JSON.stringify semantics while detecting only current-path cycles.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts` | File | Agent streaming payload serialization | Implement corrected path-aware cycle detection and keep fallback behavior | Existing serializer owner | Browser/Codex-specific result rules |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts` | File | Serializer unit tests | Cover shared refs vs cycles and existing BigInt behavior | Existing focused tests | Browser-specific fixtures |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | File | Codex event conversion tests | Cover aliased Browser MCP result envelope through local completion conversion | Existing local MCP/Browser normalization tests | Serializer internals assertions beyond observed event result |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming` | Off-Spine Concern | Yes | Low | Serialization supports multiple event paths without knowing their domain semantics. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events` | Main-Line Domain-Control | Yes | Low | Converts Codex events into AgentRunEvents. Tests belong with this boundary. |
| `autobyteus-server-ts/src/agent-tools/browser` | Off-Spine Concern | Yes | Low | Browser-specific normalization remains isolated and unchanged. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shared reference serialization | `{ item: { result: envelope }, result: envelope }` serializes both locations with duplicate `envelope` content | Top-level `result` becomes `[Circular]` only because `item.result` was visited first | This is the reported Activity failure mode. |
| True cycle serialization | `payload.self = payload` serializes `self: "[Circular]"` | Recursing until stack overflow or throwing from streaming | Cycle safety must remain. |
| Browser MCP Activity result | Aliased `open_tab`/`run_script` envelope emits `{ tab_id, url, ... }` | Frontend sees string `[Circular]` and tries to repair it | Backend must emit faithful normalized result. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old global `WeakSet` behavior and add a Codex-specific workaround | Would minimize serializer change | Rejected | Replace false-positive serializer algorithm at the owner. |
| Frontend maps `[Circular]` to hidden/empty/alternate result | It could make the screenshot less confusing | Rejected | Emit correct backend result; UI remains a renderer. |
| Dual serializer selected by feature flag | Could reduce perceived risk | Rejected | Add focused regression tests and use one correct serializer. |
| Parser always skips top-level `[Circular]` in favor of nested candidates | Could repair this scenario | Rejected as primary design | Serializer fix preserves legitimate literal string results; parser fallback only if explicitly justified by additional evidence. |

## Derived Layering (If Useful)

Layering after the fix remains:

`Provider/MCP output -> Codex backend event conversion -> shared JSON-safe serialization/redaction -> domain event payload -> frontend rendering`

The serializer is a shared infrastructure layer below Codex event semantics. Browser MCP result normalization remains a backend adapter concern before the domain event reaches UI.

## Migration / Refactor Sequence

1. Update `payload-serialization.ts` to use path/ancestor-aware circular detection instead of the global `WeakSet`.
2. Preserve existing behavior for:
   - non-object inputs returning `{}`;
   - top-level arrays/primitives wrapping as `{ value }` after JSON round-trip;
   - BigInt string conversion;
   - fallback error payload when serialization unexpectedly fails.
3. Add serializer unit test for shared references:
   - construct one shared result/envelope object;
   - place it in two non-ancestor fields;
   - assert both serialized fields contain the duplicated JSON-safe object and neither is `[Circular]`.
4. Keep/adjust true-cycle serializer unit test to assert only the cycle edge is `[Circular]` and output is JSON-stringifiable.
5. Add Codex local MCP Browser completion regression:
   - create a single MCP envelope object containing Browser JSON text;
   - set both `params.item.result` and `params.result` to that exact object, with `item` appearing before top-level `result` in the test literal to reproduce the old failure;
   - assert the converted event payload has canonical Browser tool name and direct normalized result object.
6. Run focused backend tests for serializer, Browser MCP result normalizer, and Codex thread event converter.
7. Do not modify frontend unless a test or source check reveals a separate display regression.

## Key Tradeoffs

- Fixing the serializer is broader than adding a Codex-specific fallback, but it corrects the shared infrastructure invariant that only true cycles should become `[Circular]`.
- A JSON.stringify replacer with an ancestor stack is preferred over a fully manual recursive clone because it preserves existing JSON.stringify semantics such as `toJSON`, undefined/function omission, array null handling, and property traversal behavior.
- Not adding parser placeholder-skipping avoids corrupting legitimate literal string results.

## Risks

- The path-aware replacer must use a normal function, not an arrow, so `this` identifies the current holder during JSON.stringify traversal.
- TypeScript may require an explicit `this: unknown` annotation or local cast in the replacer.
- If future payloads contain custom objects whose `toJSON` returns cyclic values, tests may need extension; current design follows JSON.stringify behavior plus cycle-edge protection.
- Raw Codex events from the original screenshot were not captured, but the reproduced built-runtime failure mode is sufficient and regression-testable.

## Guidance For Implementation

- Keep the change small and backend-focused.
- Prefer replacing only the serializer’s `WeakSet` block; do not restructure the event converter.
- Use test names that document the actual invariant, e.g. “preserves shared references as duplicated JSON-safe values” and “normalizes aliased Browser MCP completion results without circular placeholders.”
- In the Codex converter regression, assert both:
  - `payload.result` equals the direct Browser result object;
  - `payload.result` is not `[Circular]` and does not expose the raw `content` envelope.
- Run at minimum:
  - `pnpm --dir autobyteus-server-ts vitest tests/unit/services/agent-streaming/payload-serialization.test.ts`
  - `pnpm --dir autobyteus-server-ts vitest tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - `pnpm --dir autobyteus-server-ts vitest tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts`
