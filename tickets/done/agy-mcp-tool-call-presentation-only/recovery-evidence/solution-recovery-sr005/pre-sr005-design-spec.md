# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` at SR-002, approved by the user in conversation on 2026-09-30 with DEC-001..005 resolved.
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/agy-mcp-tool-call-presentation/investigation-notes.md`

## Current-State Read

AGY streams every tool as a `step_update` with `tool_name` and `tool_info.parameters`. `AgyStreamEventConverter.tool()` (`autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts:86-129`) is the only place those steps become `AgentRunEvent`s. It copies the provider name and parameters verbatim into `tool_name` / `arguments` and wraps the provider output as `result: {provider_state, output}`. MCP calls therefore surface as `call_mcp_tool` with `{Arguments, ServerName, ToolName}`.

The owner and boundary are healthy: the converter is the AGY provider adapter and already owns provider-to-platform translation (native image handling, denial classification, background-task closure). There is no structural problem; the MCP translation is simply missing. Downstream consumers (file-change processor, trace sequencer, WebSocket stream, web Activity panel, history replay) read `tool_name`, `arguments` and `result` generically and need no change.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: one new small source file and one modified method in the same folder, plus unit tests, three assertion updates in one existing live e2e test, and one documentation paragraph. No frontend change.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: no event schema, API, persistence schema, security boundary, concurrency, deployment or ownership change. Existing event fields carry different values for AGY MCP calls only. Stored data needs no transformation. Provider shape verified live on AGY 1.2.14 and against 1.2.10 evidence. An unusable wrapper falls back to today's behavior.
- Escalation trigger if implementation or validation discovers new impact: any need to change a shared event contract, a downstream processor, the frontend, or history replay; or a live AGY shape that differs from the probe.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `agy-stream-event-converter.ts:86-129` | Single translation point; `common` payload is built once and reused for start, terminal and background-close events | Unwrap once when building `common` (REQ-006) | None |
| Probe | `agy-mcp-call-shape-probe/summary.json` | ACTIVE, DONE and ERROR steps all carry full `parameters`; output is raw text; error is `{type, message}` | Same projection for every state (REQ-001, 002, 006); JSON text projection (REQ-007) | Undocumented provider shape (RSK-001) |
| Code | `src/agent-tools/mcp/agent-tool-mcp-session.ts:16` | `AGENT_TOOLS_MCP_SERVER_NAME = "autobyteus_agent_tools"` | Identify the AutoByteus server by this constant | None |
| Code | `events/processors/file-change/file-change-tool-semantics.ts` | Exact-name matching for file mutation and generated-output tools | `mcp__<server>__<tool>` cannot collide; bare AutoByteus media names are recognized (DEC-005) | None |
| Code | `agent-memory/services/runtime-tool-trace-sequencer.ts:145-152`, `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:96` | Both read `provider_state` and `output` from the AGY result | Keep the `{provider_state, output}` result shape (REQ-007) | None |
| Search | `grep -rn call_mcp_tool` over server `src` and web sources | No production code keyed on `call_mcp_tool` | No consumer needs updating | None |
| Code | `tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts:496, 519, 873` | Live e2e asserts `tool_name === "call_mcp_tool"` and reads the wrapper arguments | These assertions must move to the new name/arguments | Exact assertion bodies to be read by the implementer |
| Code | `tests/unit/.../agy-stream-event-converter.test.ts:53-58` | Fixture has `ToolName` but no `ServerName` | Remains valid as the fallback case (REQ-004, REQ-005) | None |

## Intended Change

When the provider tool name is `call_mcp_tool` and its parameters contain a non-blank `ServerName` and `ToolName`, the converter emits the call as the real tool:

- `tool_name`: the bare `ToolName` when `ServerName` is the AutoByteus agent tools server; otherwise `mcp__<ServerName>__<ToolName>`.
- `arguments`: the `Arguments` object (an absent or non-object value becomes `{}`).
- `result.output`: structured JSON when the provider output is text that parses to a JSON object or array; otherwise unchanged.

Anything else is unchanged, including `invocation_id`, event types, `provider_state`, and the wrapper fallback when the parameters are unusable.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, 002, 006, 007 / AC-001, 002, 004, 008 | AGY model calls an AutoByteus agent tool | Shown as `call_mcp_tool` (notes BEH-001) | Bare canonical name, own arguments, JSON output structured | DS-001 |
| BEH-002 | System | REQ-002, 003, 007 / AC-003, 008 | AGY model calls a third-party MCP tool | Shown as `call_mcp_tool` (notes BEH-002) | `mcp__<server>__<tool>`, own arguments | DS-001 |
| BEH-003 | System | REQ-005 / AC-007 | AGY native tool | Native name (notes BEH-003) | Preserved | DS-001 (unchanged branch) |
| BEH-004 | System | REQ-001, 002, 006 / AC-005, 006 | MCP call fails, is denied, or has an unusable wrapper | Failed `call_mcp_tool` (notes BEH-004) | Failure under real name; unusable wrapper falls back | DS-001 |
| BEH-005 | System | REQ-005 / AC-007 | Native `generate_image` completes | Native path resolution only for native tool | Preserved; decided on the provider name, never on the projected name | DS-001 |
| BEH-006 | User | DEC-004 | User reopens an older AGY run | Stored name replayed | Preserved; no replay change | N/A — no code path changed |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `agy-mcp-call-shape-probe.py`, `agy-mcp-call-shape-probe/` | Raw AGY 1.2.14 stream evidence | REQ-001..004, 006, 007 | Source of unit-test fixtures | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: the converter is the single AGY provider adapter; consumers are name-agnostic; no duplicate translation exists elsewhere.
- Design response: add the missing provider-to-platform translation inside the AGY adapter, as a small named concern beside the converter.
- Refactor rationale: owner, boundary, event shape and file placement remain correct for this scope.
- Intentional deferrals and residual risk, if any: none.

## Terminology

- **MCP call projection**: the platform-facing `{toolName, arguments}` derived from an AGY `call_mcp_tool` step.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The wrapper presentation for well-formed MCP calls is replaced, not kept behind a flag. The REQ-004 fallback is approved behavior for an unusable provider payload, not a legacy path.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: stored AGY run traces holding tool name, arguments and result; volume not measured.
- Relevant code-model, serialization, semantic, or physical-store change: none to schema; new AGY MCP calls store different values in the same fields.
- Normal reader/writer behavior and representative evidence: replay shows the stored tool name and arguments generically and reads `provider_state`/`output`, which keep their shape.
- Required semantics and invariants under direct use: old runs stay readable and keep their recorded presentation (DEC-004).
- Decision: `Directly Usable — No Migration`
- Decision rationale: readers are value-agnostic; the user explicitly declined relabelling history.
- Acceptance criteria or design constraints supported by this decision: BEH-006.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Return-Event | BEH-001..005 | AGY CLI stream step | Activity item in the web app (and stored trace) | `AgyStreamEventConverter` for translation; event pipeline downstream | The only path by which an AGY tool call becomes visible |

## Primary Execution Spine(s)

`AGY CLI stream -> AgyAgentRunBackend -> AgyStreamEventConverter -> agent run event pipeline (processors, trace persistence) -> WebSocket stream -> web tool lifecycle handler -> Activity panel`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The backend reads a provider step and hands it to the converter. The converter builds one common tool payload per step index and emits start and terminal events from it. For an MCP call the payload is now built from the MCP call projection. Everything downstream is unchanged. | AGY step, tool event payload | `AgyStreamEventConverter` | MCP call projection; MCP output projection |

## Spine Actors / Main-Line Nodes

`AgyAgentRunBackend`, `AgyStreamEventConverter`, event pipeline, WebSocket stream, web tool lifecycle handler. Only the converter changes.

## Ownership Map

- `AgyStreamEventConverter`: owns translating AGY steps into platform events, including which provider step is a native image call and how results are wrapped.
- `agy-mcp-tool-call.ts` (new, off-spine, serves the converter): owns recognizing an AGY MCP call and deriving its platform tool name, arguments and output presentation. It owns no sequencing and emits no events.

## Thin Entry Facades / Public Wrappers

N/A — none involved.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Verbatim pass-through of `call_mcp_tool` name and wrapper parameters for well-formed MCP calls | Replaced by the projected name and arguments | `agy-mcp-tool-call.ts` via the converter | In This Change | Fallback for unusable wrappers remains by requirement |
| E2E assertions on `tool_name === "call_mcp_tool"` in `agy-team-inter-agent-roundtrip.e2e.test.ts` | They pin the replaced presentation | Assertions on `send_message_to` and unwrapped arguments | In This Change | Prompt text that tells the model to use `call_mcp_tool` stays; it describes the provider tool |

## Return Or Event Spine(s)

DS-001 above.

## Bounded Local / Internal Spines

Inside `AgyStreamEventConverter.tool()`: `provider step -> resolve provider name -> (MCP call? project name/arguments) -> build common payload -> emit start -> on terminal: classify -> wrap result -> emit terminal`. The native-image decision is taken from the provider name before projection.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| MCP call projection | DS-001 | `AgyStreamEventConverter` | Recognize `call_mcp_tool`, validate `ServerName`/`ToolName`, produce platform tool name and arguments | Provider wrapper hides the real tool | Inlined it would mix naming policy into event sequencing in an already dense method |
| MCP output projection | DS-001 | `AgyStreamEventConverter` | Turn JSON object/array text into structured JSON | Parity with other runtimes | Same |

## Ownership Boundaries

The AGY backend folder is the only place that knows AGY's `call_mcp_tool` wrapper. Shared MCP naming (`src/agent-tools/mcp`) stays provider-agnostic. Downstream processors continue to depend only on the generic event payload.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgyStreamEventConverter` | `agy-mcp-tool-call.ts` | `AgyAgentRunBackend` | Any processor, the frontend or history replay re-deriving the real tool from `ServerName`/`ToolName` | N/A |

## Dependency Rules

- `agy-mcp-tool-call.ts` may import `AGENT_TOOLS_MCP_SERVER_NAME` from `src/agent-tools/mcp/agent-tool-mcp-session.ts` and the local `agy-stream-message.ts` helpers. It must not import event types or other backends.
- Only `agy-stream-event-converter.ts` imports `agy-mcp-tool-call.ts`.
- No change under `events/processors`, `agent-memory`, `run-history`, `src/agent-tools/mcp`, or `autobyteus-web`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `projectAgyMcpToolCall(providerToolName, parameters)` | AGY MCP call | Return `{ toolName, arguments }` for a well-formed MCP call, or `null` | Provider tool name string; provider parameters record or null | `null` means "present as the provider reported it" |
| `projectAgyMcpToolOutput(output)` | AGY MCP call output | Return structured JSON for object/array JSON text; otherwise return the input unchanged | Unknown provider output | Called only for calls that projected non-null |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `projectAgyMcpToolCall` | Yes | Yes | Low | None |
| `projectAgyMcpToolOutput` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| New file | `agy-mcp-tool-call.ts` | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Identify the AutoByteus agent tools server | `src/agent-tools/mcp/agent-tool-mcp-session.ts` | Reuse | Constant already authoritative | — |
| Canonical AutoByteus tool name | `agent-tools-mcp-tool-name.ts` | Not needed | AGY already supplies the bare tool name separately from the server name; there is no prefix to strip | — |
| Third-party name format | `agent-tools-mcp-tool-name.ts` (`buildAgentToolsMcpWireToolName`) | Create local | That builder is fixed to the AutoByteus server name | A one-line template local to the AGY projection is clearer than generalizing a shared helper for one caller |
| JSON text result projection | `mcp-effective-tool-result-projector.ts` | Create local | The shared projector takes an MCP `{content: [...]}` envelope and a provider union that excludes AGY; AGY delivers already-flattened text | Forcing AGY text into a fake envelope would misuse that contract |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/antigravity/stream` | AGY stream translation, including MCP call projection | DS-001 | `AgyStreamEventConverter` | Extend | — |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `stream/agy-mcp-tool-call.ts` | AGY stream | Converter's off-spine concern | MCP call and output projection | One provider-wrapper concern | `AGENT_TOOLS_MCP_SERVER_NAME` |
| `stream/agy-stream-event-converter.ts` | AGY stream | Converter | Use the projection when building the tool payload and wrapping output | Existing owner | — |

## Reusable Owned Structures Check

None — no repeated structure arises.

## Shared Structure / Data Model Tightness Check

N/A — no shared structure added or changed.

## Final File Responsibility Mapping

Same as the draft mapping; no extraction changed it.

## Applied Patterns

Adapter: the converter remains the provider adapter; the projection is a pure function it calls.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-mcp-tool-call.ts` | File (Add) | Converter | `AGY_MCP_CALL_TOOL_NAME`, `projectAgyMcpToolCall`, `projectAgyMcpToolOutput` | AGY-specific provider wrapper knowledge | Event emission, turn state, native image logic |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` | File (Modify) | Converter | Build `common` from the projection; decide `nativeImage` from the provider name; project output for projected MCP calls | Existing owner | Inline `ServerName`/`ToolName` parsing |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-mcp-tool-call.test.ts` | File (Add) | — | Unit tests of both projections | Mirrors source | — |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` | File (Modify) | — | Event-level tests for AC-001..008 | Existing suite | — |
| `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | File (Modify) | — | Expect `send_message_to` and unwrapped arguments at lines ~496, ~519, ~873 | Pins the live presentation | — |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | File (Modify) | — | State that MCP calls are presented under the real tool name, and the naming rule | Runtime doc | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/antigravity/stream` | Persistence-Provider (provider adapter) | Yes | Low | One small sibling file beside its only caller |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| AutoByteus tool | Provider `tool_name: "call_mcp_tool"`, `parameters: {ServerName: "autobyteus_agent_tools", ToolName: "delegate_task", Arguments: {description, recipient_address}}` → event `tool_name: "delegate_task"`, `arguments: {description, recipient_address}` | Keeping `ServerName`/`ToolName` alongside the arguments | AC-001 |
| Third-party tool | `ServerName: "shape-test"`, `ToolName: "echo_args"` → `tool_name: "mcp__shape-test__echo_args"` | `tool_name: "echo_args"` (could collide with platform names such as `write_file`) | AC-003, DEC-002 |
| Unusable wrapper | `parameters: {ToolName: "generate_image"}` (no `ServerName`) → unchanged `call_mcp_tool` with provider parameters | Guessing the server, or throwing | AC-006 |
| Native image guard | `nativeImage = providerName === "generate_image"` evaluated before projection | `nativeImage = common.tool_name === "generate_image"` — an AutoByteus MCP `generate_image` would trigger native path resolution | AC-007 |
| JSON output | output `"{\n \"target_agent_run_id\": \"x\"}"` → `result: {provider_state: "DONE", output: {target_agent_run_id: "x"}}`; output `"CAPSULE-MCP-MARKER-7318"` or `"42"` → unchanged | Replacing the whole `result` with the parsed object (breaks `provider_state` readers) | AC-008 |
| Same name at start and end | The ACTIVE step stores the projected `common`; terminal and background-close events reuse that shape | Projecting only on DONE | REQ-006 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Setting or flag to keep the `call_mcp_tool` presentation | Old runs keep it | Rejected | New calls always project; old stored runs are untouched data, not a code path |
| Relabelling old runs at replay time | Consistent history | Rejected (DEC-004) | None |
| Frontend-side unwrapping | Request mentioned the frontend | Rejected | Server adapter projection so every consumer sees the real tool |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add `agy-mcp-tool-call.ts` with its unit tests (fixtures taken from the probe output).
2. Update `AgyStreamEventConverter.tool()`: compute the provider name, take `nativeImage` from it, build `common` from the projection when non-null, and apply the output projection in the generic failure and generic success branches for projected calls.
3. Extend the converter unit tests for AC-001..008; keep the existing `ToolName`-only fixture as the fallback case.
4. Update the three live e2e assertions and the runtime doc paragraph.

## Key Tradeoffs

- Local one-line name template and local JSON projection instead of generalizing shared MCP helpers: less reuse, but no change to contracts shared with Codex, Claude and Grok.
- Requiring both `ServerName` and `ToolName`: a wrapper missing the server stays generic instead of being shown under a possibly misleading bare name.

## Risks

- RSK-001: AGY may change the wrapper shape; mitigated by the fallback and unit fixtures tied to observed versions.
- A third-party server named exactly `autobyteus_agent_tools` cannot occur in an AutoByteus run: `agy-mcp-config-materializer.ts` rejects that collision before the run starts.
- Live e2e for AGY depends on the local AGY CLI and model quota; validation ownership is downstream.

## Guidance For Implementation

- "Usable" means `ServerName` and `ToolName` are both non-blank strings (use `agyString`). `Arguments` that is absent or not a plain object becomes `{}`.
- Do not trim or alter the names beyond what `agyString` validates; build the third-party name as `` `mcp__${server}__${tool}` ``.
- JSON projection: only for string output; `JSON.parse` in a try/catch; accept only a non-null object or array result; otherwise return the original value.
- Apply output projection only when the call projected non-null. Do not touch the native image branches or the `BACKGROUND_TOOL_OUTPUT` result.
- The error message passed as `error`/`reason` stays the provider's error text; denial classification is unchanged.
- No changes outside the files listed in the target mapping. If one seems necessary, stop and return a Design Impact.
