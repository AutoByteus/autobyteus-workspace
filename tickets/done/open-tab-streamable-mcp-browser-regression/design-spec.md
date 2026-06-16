# Design Spec

## Current-State Read

The Streamable MCP branch successfully executes `open_tab` through the Electron browser bridge. Persisted runtime traces and a direct `list_tabs` probe show that browser sessions are created (`65ab2c` for `https://example.com/`, `67fb94` for `https://www.google.com/`). The visible Browser panel remains empty because the `TOOL_EXECUTION_SUCCEEDED` event result for `open_tab` reaches the renderer as an MCP CallTool result envelope:

```json
{
  "content": [{ "type": "text", "text": "{ ... "tab_id": "65ab2c" ... }" }],
  "structuredContent": null,
  "_meta": null
}
```

The renderer focus hook in `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` only extracts `tab_id` from a direct object result or raw JSON-string result. It therefore returns before calling `browserShellStore.focusSession(tab_id)`. The Electron Browser shell controller and IPC focus path are not the broken owner; they would attach the existing session if invoked.

The original `personal` branch worked because Codex browser tools were exposed as dynamic tools through `build-browser-dynamic-tool-registrations.ts`; the event parser could parse the dynamic-tool JSON text into the canonical direct browser result object. The Streamable MCP refactor removed that path and now leaks the MCP envelope through Codex Agent Tools MCP result conversion.

## Intended Change

Restore the documented canonical browser event contract after the Streamable MCP refactor: known browser tool success events must reach the renderer with direct browser result objects, especially `open_tab` with `result.tab_id` directly available. Implement normalization at the server runtime event-converter boundary, not as renderer-owned MCP parsing.

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix
- Current design issue found: Yes
- Root cause classification: Missing Invariant with boundary/ownership aspect
- Refactor needed now: Yes, narrow/shared normalizer extraction
- Evidence: Runtime traces show valid browser sessions are created but success events contain raw MCP envelopes; frontend focus handler is intentionally canonical-contract based; docs say server owns runtime-specific browser event canonicalization.
- Design response: Add a shared known-browser-tool MCP result normalizer under server-side Agent Tools MCP/browser event conversion ownership; apply it to Codex Agent Tools MCP terminal success conversion and reuse it in Claude to avoid divergent envelope parsing.
- Refactor rationale: Keeping normalization inside runtime converters preserves the authoritative server boundary. Adding envelope parsing to the renderer would duplicate transport-specific parsing in presentation code and violate the documented Browser ownership model.
- Intentional deferrals and residual risk, if any: No broad Browser shell redesign. If unrelated Browser shell leasing issues exist, they are out of scope unless exposed by the regression tests.

## Terminology

- `Canonical browser result`: direct result object streamed in `TOOL_EXECUTION_SUCCEEDED.payload.result`, for example `{ tab_id, status, url, title }`.
- `MCP result envelope`: CallTool result object with `content` text blocks and optional `structuredContent` / `_meta`.

## Design Reading Order

1. Data-flow spine
2. Server runtime conversion ownership
3. Shared result normalizer
4. Tests and validation

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Do not reintroduce the old Codex dynamic browser tool path. The clean target is unified Agent Tools MCP plus canonical event normalization.
- Obsolete path: none to remove in this bugfix beyond avoiding frontend compatibility parsing as the primary fix.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent calls `open_tab` | Browser panel focuses opened session | Server runtime event conversion + Electron Browser shell | Shows the broken path from MCP result to UI focus. |
| DS-002 | Return-Event | MCP CallTool result envelope | Canonical `TOOL_EXECUTION_SUCCEEDED.result` | Runtime event converter | This is the exact missing invariant. |
| DS-003 | Bounded Local | Renderer receives canonical success | `browserShellStore.focusSession(tab_id)` | Renderer Browser focus handler | Should remain simple and canonical-contract based. |

## Primary Execution Spine(s)

`Agent runtime -> Agent Tools MCP browser adapter -> Electron Browser bridge/session manager -> Runtime event converter -> Renderer Browser focus handler -> Electron Browser shell controller`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The agent invokes `open_tab`; MCP adapter calls BrowserToolService; Electron opens/reuses a session; the runtime streams a canonical success event; renderer focuses the session. | Agent Tools MCP adapter, BrowserToolService, Runtime event converter, Browser focus handler, Browser shell controller | Server runtime conversion for event shape; Electron for session lifecycle | MCP envelope parsing, name canonicalization, renderer tab selection |
| DS-002 | A raw MCP CallTool result must be unwrapped for known browser tools before being emitted as `TOOL_EXECUTION_SUCCEEDED`. | MCP result envelope, Browser result normalizer, AgentRunEvent payload | Runtime event converter | JSON text parsing, structuredContent handling |
| DS-003 | Once the renderer sees `open_tab` plus direct `result.tab_id`, it focuses the browser session and activates the right-side Browser tab. | Browser tool success handler, BrowserShellStore, Electron IPC | Renderer Browser focus handler | Right-side tab activation |

## Spine Actors / Main-Line Nodes

- Agent Tools MCP browser adapter
- BrowserToolService / Electron Browser bridge
- Runtime event converter
- Renderer browser success handler
- Browser shell controller

## Ownership Map

- Agent Tools MCP browser adapter owns browser tool execution through the stable tool contract and returns MCP-compliant tool results.
- BrowserToolService owns dispatch to the Electron browser bridge, not UI shell focus.
- Runtime event converter owns transforming runtime/provider/MCP-specific result shapes into canonical AutoByteus tool lifecycle events.
- Renderer browser success handler owns focusing Browser UI only after receiving canonical `open_tab` success with direct `tab_id`.
- Electron Browser shell controller owns shell lease, native view attachment, snapshot publication, and active session projection.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `BrowserToolsMcpAdapterProvider.execute` | BrowserToolService + runtime event converter | MCP tool execution entry | Renderer event canonicalization |
| `handleBrowserToolExecutionSucceeded` | BrowserShellStore / Electron shell controller | UI focus reaction | MCP envelope parsing policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Reintroduction of old Codex dynamic browser registrations | Would undo Streamable MCP direction | Agent Tools MCP + canonical converter normalization | In This Change | Do not restore old path. |
| Runtime-specific duplicated browser envelope parsers | Would diverge Codex and Claude behavior | Shared browser MCP result normalizer | In This Change | Extract/reuse Claude logic. |

## Return Or Event Spine(s) (If Applicable)

`MCP CallTool result -> Shared browser MCP result normalizer -> Canonical AgentRunEvent TOOL_EXECUTION_SUCCEEDED -> Renderer browser focus handler`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: runtime event converter
- Chain: `resolve tool name -> identify known browser tool -> unwrap MCP content/structured result -> parse JSON text if needed -> emit canonical result`
- Why it matters: this local conversion prevents transport envelopes from leaking into renderer UI logic.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Browser tool name allowlist | DS-002 | Runtime event converter | Normalize only known AutoByteus browser tools | Avoid rewriting unrelated MCP servers | Could corrupt non-browser MCP results |
| JSON text parsing | DS-002 | Shared normalizer | Parse MCP text block payloads into result objects | Browser tools serialize JSON text | Renderer would become transport-aware |
| Renderer right-tab activation | DS-003 | Browser focus handler | Switch right-side tab to Browser after focus | UI behavior only | Server would start owning UI state |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Browser MCP result envelope parsing | Claude browser result normalizer | Extend / extract shared | Existing code already unwraps content blocks for browser tools | Not new; should become shared |
| Browser shell focus | BrowserShellStore + Electron BrowserShellController | Reuse | Existing path works if called with `tab_id` | N/A |
| Tool name canonicalization | Agent Tools MCP tool-name utilities | Reuse | Already maps prefixed names to canonical names | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/browser` or `agent-tools/mcp` shared normalizer | Known browser MCP result normalization | DS-002 | Runtime event converters | Extend | Prefer server-side shared utility. |
| Codex event conversion | Apply shared normalizer before terminal success event emission | DS-002 | Codex runtime events | Modify | Directly fixes observed branch. |
| Claude event conversion | Reuse shared normalizer instead of private duplicate | DS-002 | Claude runtime events | Modify | Keeps behavior aligned. |
| Renderer browser handler | Consume canonical result only | DS-003 | UI focus | Reuse | No primary envelope parsing added. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Browser tools / Agent Tools MCP boundary | Browser result normalization | Unwrap known browser tool MCP envelopes into direct result objects | Browser-specific and runtime-agnostic | Uses browser tool name allowlist |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` or parser path | Codex runtime events | Codex terminal event conversion | Apply normalizer to success result for known browser tools | Existing terminal event owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-browser-tool-result-normalizer.ts` | Claude runtime events | Claude compatibility wrapper/removal | Replace or delegate to shared normalizer | Avoid duplication | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| MCP content-envelope unwrap + JSON text parse for known browser tools | `browser-mcp-result-normalizer.ts` | Browser tools / MCP boundary | Needed by Codex and Claude | Yes | Yes | Generic parser for all tools |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Normalized browser result object | Yes | Yes | Low | Return parsed direct object; leave unknown shapes unchanged. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Browser tools / MCP boundary | Shared browser result normalizer | `normalizeBrowserMcpToolResult(toolName, result)` for known browser tool envelopes | Centralizes invariant | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` and/or `codex-item-event-converter.ts` | Codex runtime events | Codex event conversion | Ensure terminal success payload uses normalized browser result | Existing result extraction owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-browser-tool-result-normalizer.ts` | Claude runtime events | Claude adapter | Delegate to shared normalizer or remove if imports can update cleanly | Prevent duplication | Yes |
| Tests under `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/` | Server runtime tests | Codex converter coverage | Assert observed MCP envelope normalizes to direct `result.tab_id` | Captures regression | Yes |
| Tests under Claude event converter/normalizer coverage | Server runtime tests | Cross-runtime coverage | Assert Claude still normalizes browser MCP envelopes | Prevent regression | Yes |
| Optional renderer test only if needed | Web agent streaming tests | UI focus contract | Assert canonical direct `result.tab_id` still focuses Browser | Existing coverage likely enough | No MCP parsing |

## Ownership Boundaries

The server runtime conversion boundary is authoritative for canonical event shape. Renderer Browser code must not need to understand provider-specific or MCP-specific content envelopes. Electron Browser shell remains authoritative for native session lifecycle and shell projection.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Runtime event converter | MCP envelope parsing and tool-result canonicalization | Renderer streaming services | Renderer parsing `content[0].text` MCP envelopes as primary behavior | Strengthen converter output |
| BrowserShellStore / Electron BrowserShellController | IPC focus, shell lease, native view attach | Browser success handler | Direct manipulation of Electron view from stream handler | Add/adjust shell API only if needed |

## Dependency Rules

- Codex/Claude runtime converters may depend on shared browser MCP result normalizer.
- Shared normalizer may depend on stable browser tool-name allowlist (`isBrowserToolName` / `BROWSER_TOOL_NAME_LIST`).
- Renderer must depend on canonical `TOOL_EXECUTION_SUCCEEDED` contract, not on raw MCP envelopes.
- Do not reintroduce Codex dynamic browser registrations for this fix.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `normalizeBrowserMcpToolResult(toolName, result)` | Known browser MCP result normalization | Return canonical parsed browser result when applicable, else original result | Canonical tool name string + unknown result | Tool-name allowlisted. |
| `handleBrowserToolExecutionSucceeded(payload)` | Browser focus reaction | Focus tab for `open_tab` canonical result | `result.tab_id` | Should stay transport-agnostic. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared normalizer | Yes | Yes | Low | Normalize only known browser tool names. |
| Browser focus handler | Yes | Yes | Low | Keep direct `tab_id` contract. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser result normalizer | `browser-mcp-result-normalizer` | Yes | Low | Avoid vague `helper`. |
| Runtime event converter | Existing names | Yes | Low | Apply shared normalizer. |

## Applied Patterns (If Any)

- Adapter/normalizer pattern: translates external MCP result envelope into internal canonical Browser result at the runtime boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | File | Browser tools / MCP boundary | Shared browser-specific MCP result normalization | Browser-specific, runtime-independent | Generic MCP policy for unrelated tools |
| `autobyteus-server-ts/src/agent-execution/backends/codex/...` | Files | Codex event conversion | Apply normalization to terminal success result | Existing Codex event owner | Browser shell UI behavior |
| `autobyteus-server-ts/src/agent-execution/backends/claude/...` | Files | Claude event conversion | Reuse shared normalizer | Existing Claude event owner | Duplicate parser logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/browser` | Interface-boundary/off-spine concern | Yes | Low | Browser contract/serialization already lives here. |
| runtime backend event folders | Runtime adapter | Yes | Low | Only apply shared normalization there. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Canonical event result | `result: { tab_id: "65ab2c", status: "opened" }` | `result: { content: [{ text: "{...}" }] }` reaching renderer | Browser focus needs direct `tab_id`. |
| Ownership | Server converter unwraps MCP envelope | Renderer parses MCP envelope | Keeps provider/MCP transport out of UI. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Add MCP envelope parsing to renderer focus handler as primary fix | Quick local workaround | Rejected | Normalize at server event boundary. |
| Reintroduce old Codex dynamic browser tools | Would restore personal behavior | Rejected | Keep Streamable MCP; fix canonicalization. |

## Derived Layering (If Useful)

Transport/MCP adapter -> runtime event converter -> canonical stream event -> renderer focus -> Electron shell projection.

## Migration / Refactor Sequence

1. Add shared browser MCP result normalizer with tests for direct object, JSON string, MCP `content` text envelope, nested content envelope, and unknown non-browser passthrough.
2. Apply shared normalizer in Codex terminal MCP success conversion for known browser tool names before emitting `TOOL_EXECUTION_SUCCEEDED`.
3. Replace/delegate Claude-specific browser result normalizer to the shared implementation and preserve existing Claude tests.
4. Add Codex regression test with exact observed `open_tab` envelope asserting direct `payload.result.tab_id`.
5. Run focused server unit tests and, if feasible, web browser success handler test; downstream API/E2E should perform live/manual Electron smoke.

## Key Tradeoffs

- Server-side normalization is slightly more work than frontend parsing, but preserves documented ownership and fixes all renderer consumers.
- Shared normalizer reduces divergence between Claude and Codex but requires careful allowlisting to avoid rewriting unrelated MCP tool results.

## Risks

- Codex result extraction may have multiple terminal-event paths; implementation must cover the local MCP completion path actually seen in traces.
- Overbroad normalization could parse unrelated MCP text as browser results; mitigate by requiring known browser tool name.
- Live Electron smoke may require built app/runtime environment; if unavailable, unit coverage plus trace-shape regression should still be required.

## Guidance For Implementation

- Use the exact trace shape from investigation in tests.
- Do not move Browser shell focus logic into server code.
- Do not teach UI to depend on MCP envelopes as the primary contract.
- Ensure `open_tab` result is direct object before frontend receives it.
- Validate both single-agent and team-member streams if feasible.
