# Design Spec — AGY embedded open_tab projection

## Solution And Approval Basis
- Package: embedded-browser-open-tab-investigation; SR-005; status **Ready**.
- Approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/requirements-doc.md`, behavior baseline SR-001 REQ-001–003 / AC-001–003; evidence rounds SR-002–004.
- AP-001 user 2026-10-02: “Well, since you found the problem then go ahead. Now, you are approved now.”
- Behavior-defining supplements: None. Product Design N/A — no redesign requested.
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation/investigation-notes.md`, especially SR-005 post-approval observations.
- Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation`; branch codex/embedded-browser-open-tab-investigation; fetched base origin/personal 5e3cb2f720e6fc80173099075daf55594ed58de9. Delivery finalization target origin/personal; no immediate release/push authorization.

## Current-State Read
A real AGY open_tab creates an Electron session, but its emitted result is wrapped under output. The existing renderer requires a direct tab_id, so no shell focus/lease is acquired. Native sessions and visible-window sessions intentionally differ. Existing canonical focus/IPC/bounds path works: isolated release reproduction explicitly attached the same page successfully. Existing adapter ownership is appropriate; AGY fails to meet the established browser result contract. Broader recovery/error concerns are evidence-backed but outside this correction.

## Task Size And Architectural Risk (Mandatory)
- task_size: **Small**. One bounded production converter branch plus existing shared imports; focused tests/fixture and documentation. No new runtime owner or feature surface.
- architectural_risk: **Low**. Restore the existing canonical open_tab event consumed unchanged by UI. No new external tool API, bridge/IPC route, schema, window ownership, security policy, lifecycle/concurrency or deployment mechanism. Historical payload is opaque and directly readable. Generic AGY non-browser semantics stay unchanged.
- Payload surfaces: successful own-MCP open_tab result in stream/new traces; test fixtures/evidence and docs. Structural surface: existing AGY converter depends on existing browser normalizer; no new abstraction/subsystem.
- Escalate if a fix needs renderer envelope parsing, global session adoption, window/run identity mapping, persistence migration, provider semantic changes, shared normalizer changes, or loss of unrelated tool semantics. Return Design Impact/Requirement Gap and reclassify rather than silently broaden.

## Architecture Investigation Evidence
| Evidence | Decision |
| --- | --- |
| Investigation SR-005; converter + MCP name/output projector | Match successful own-MCP open_tab only; leave native/third-party/error/image/background branches intact |
| Existing browser normalizer and Codex/Claude callers | Reuse canonical output conversion; do not teach renderer AGY format |
| Trace writer and generic history readers inspected after approval | Directly Usable — No Migration; preserve old traces untouched |
| SR-002 real desktop + SR-004 ownership audit | Native engine, focus IPC, leases and bounds unchanged; failure localized before focus |
| Existing server MCP transport and renderer guard suites | Extend executable producer coverage, retain consumer guards, require fixed-build desktop journey |

## Intended Change
At AgyStreamEventConverter.tool() successful ordinary-tool emission, if `mcpCall?.toolName === OPEN_TAB_TOOL_NAME`, emit `result = normalizeBrowserMcpToolResult(OPEN_TAB_TOOL_NAME, output)` instead of the generic AGY result envelope. `output` is the already-projected MCP output, not a constructed provider_state/output wrapper. Keep `payload.provider_state = 'DONE'`, tool_name, arguments, invocation_id, turn_id and event order as today. Keep native-image branch and explicit failure/denial branches earlier and unchanged.
Only AutoByteus MCP open_tab is in the changed branch: projectAgyMcpToolCall yields the exact bare name only for server autobyteus_agent_tools. Other servers produce qualified names; native similarly named tools have mcpCall null. Do not use suffix matching or match common.tool_name alone. Other browser tools, generic native/MCP calls and background closures keep existing shape.
This is a narrow contract restoration, not a generalized AGY browser rewrite. No new UI or retry/recovery behavior.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Intent/AC | Trigger | Change/preserve | Target path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001 / AC-001 | SCN-001 user asks local AGY assistant to open page | Return canonical tab identity so existing panel focuses the actual session | DS-001 then DS-002/003 |
| BEH-002 | REQ-002 / AC-002 | SCN-002 other supported runtime canonical open | Preserve existing browser contract and consumer | DS-002/003 unchanged |
| BEH-003 | REQ-002 / AC-002 | SCN-003 remote-bound/unavailable local shell | Keep local projection suppressed and lease policy intact | DS-003 existing eligibility/lease checks |
| BEH-004 | REQ-003 / AC-003 | SCN-004 unrelated AGY tool or failure | Preserve names/args/results/errors and user data | DS-002 generic branches unchanged; DS-004 |

## Relevant Supplemental Task Artifacts
All supplements are evidence-only, not separately approved behavior. Canonical complete inventory is in investigation notes.
- evidence/incident-events.json; third-open-and-list-events.json: exact observed envelopes and three native IDs.
- evidence/replay-probe.cjs + replay-results.json: deterministic causal replay (pre-fix assertions deliberately assert bad behavior; do not turn them into a post-fix pass).
- evidence/installed-code-check.txt: release 1.4.92-beta.9 matched source mechanism.
- evidence/desktop/desktop-reproduction.md and its JSON/PNG/assertion/cleanup inventory: actual real-provider failure and explicit-focus control, not a fixed-build pass.
- evidence/connection-audit.md; deep-connection-probe.cjs/results.json: current-state connection and separate F-002 fault injection. F-002 not in implementation scope.
All paths relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation/tickets/in-progress/embedded-browser-open-tab-investigation`; retain evidence unchanged and put new validation evidence separately.

## Task Design Health Assessment (Mandatory)
- Posture: Bug Fix. Current issue: Yes. Root cause: **Local Implementation Defect / Missing Invariant** at an established adapter boundary.
- Refactor needed now: **No**. AGY converter owns provider-to-canonical event translation, shared browser normalizer owns browser result decoding, renderer/IPC own presentation. Existing API/file placement fit the correction. One scoped emission choice fixes the invariant without introducing another parser or owner.
- Response: canonicalize the browser result at producer, removing AGY wrapper for this replaced branch.
- Deferred: F-002 focus rejection propagation, missing-assignment recovery and visibility acknowledgement. They may cause other issues but were not the incident trigger and are not necessary to make valid canonical open_tab follow the proven existing UI path. Do not claim all intermittent issues fixed.

## Terminology / Design Reading Order
Canonical result = existing browser tool result with direct tab_id. Shell = application window, identified by its renderer webContents ID. Native session = app-global live view/record. Read evidence -> behavior map -> state transition -> spines/ownership -> files -> verification.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove the generic provider_state/output result wrapper **for successful own-MCP open_tab**. No dual outer/inner tab fields, renderer unwrapping fallback, old-event replay into UI, feature flag, or alternate browser execution route. Generic wrappers for unrelated tools are current retained behavior, not legacy fallback. No whole file is made obsolete.

## Persisted Data / State Transition Decision
**Directly Usable — No Migration.**
- Subject: arbitrary tool_result in existing raw-trace JSONL and generic history projection. New own-MCP successful open_tab traces will use canonical result object; envelope of raw trace/turn identity/status remains unchanged.
- Existing original samples contain result.provider_state/output; new value contains tab_id/status/url/title. Both remain valid opaque tool payloads under current reader/writer types.
- Writer: runtime-memory-event-accumulator -> runtime-tool-trace-sequencer.persistToolResult -> appendRawTrace. Reader: raw-trace-record-normalizer -> ToolInteraction builder -> raw-trace-to-historical-replay-events -> historical-replay-events-to-conversation. They preserve result rather than requiring output. Only special provider_state denial detection exists; denial branches unchanged.
- Invariants: preserve exact historic content, identities, success/failure and display; no old tab reopening as a history side effect. Generic current readers need no version conditional.
- No historical rewrite, reset, retention change, migration I/O, startup gate or new ledger. Volume not scanned because no historical transform/admission change is planned. UI sessions/cookies remain untouched.
- Canonical migration guideline sections 1–3 consulted; predecessor migrations/admission source dispositions N/A — no transform. Benefit of rewrite is zero for approved semantics; needless I/O and data risk rejected.
- Verification: existing history with nested result still readable; newly emitted canonical result survives live stream and reopened history unchanged. AC-003.

## Data-Flow Spine Inventory
| ID | Scope / behavior | Start -> end | Governing owner |
| --- | --- | --- | --- |
| DS-001 | Primary execution / BEH-001 | User request -> agent -> MCP -> bridge -> native loaded session | Agent runtime orchestration and BrowserTabManager |
| DS-002 | Return-event / BEH-001,002,004 | AGY tool output -> canonical event -> stream -> renderer | AGY converter (changed local conversion), existing stream owners |
| DS-003 | Presentation / BEH-001–003 | renderer handler -> IPC -> lease/snapshot -> bounds -> visible view | BrowserShellController / WorkspaceShellWindow |
| DS-004 | Persistence return / BEH-004 | tool event -> raw trace -> history -> generic tool card | Existing memory and history owners |

## Primary Execution Spine(s)
User chat -> Daily Assistant AGY runtime -> configured AutoByteus MCP open_tab -> BrowserToolService/HTTP bridge -> BrowserTabManager -> loaded WebContentsView -> result. Unchanged.

## Spine Narratives (Mandatory)
DS-001 creates the page but cannot by itself assert visible placement. DS-002 converts the recognized successful own-MCP open_tab output to the already-supported canonical browser result before stream consumers observe it. DS-003 extracts that actual tab ID, preserves embedded-only eligibility, asks IPC to claim it for the current window, selects Browser and supplies host bounds so the same native page is attached. DS-004 persists arbitrary results and shows them as history without re-executing browser focus. No sequencing is moved across those owners.

## Spine Actors / Ownership Map
AGY converter: provider state/errors/event identity and result conversion. Shared browser normalizer: browser result decoding only. Stream mapper: transport unchanged. Renderer handler: local eligibility and focus request. BrowserShellController: per-window session lease/selection/snapshot. WorkspaceShellWindow: native view attachment. BrowserPanel: tab chrome and host measurement. Trace/history owners: opaque result continuity. None assumes a new responsibility.

## Thin Entry Facades / Public Wrappers
Existing preload/IPC wrapper remains the renderer-to-main boundary; no direct manager access or renderer-created native view. MCP open_tab stays agent-facing tool, not a window-management API.

## Removal / Decommission Plan (Mandatory)
| Item | Replacement | Scope |
| --- | --- | --- |
| Generic AGY envelope on successful projected own open_tab | Existing browser canonical normalizer applied to output | This change |
| Any test expectation requiring that wrong open_tab wrapper | Canonical result assertion plus preserved generic-tool matrix | This change |
| Other wrappers / F-002 store handling | Unchanged | Not obsolete / outside scope |

## Return Or Event Spine(s)
Provider tool_info.output -> projectAgyMcpToolOutput -> scoped success result selection -> normalizeBrowserMcpToolResult -> TOOL_EXECUTION_SUCCEEDED -> server mapper -> browser UI handler -> focus IPC. No duplicate terminal event.

## Bounded Local / Internal Spines
Converter turn-local start/terminal tracking remains unchanged: start once -> terminal once -> reject duplicate terminals. Browser window bounds/lease mechanics unchanged. No new worker/retry loop.

## Off-Spine Concerns Around The Spine
Logging/shared missing-tab warning serves normalization, not alternate focus. History serves durable conversation, not browser recovery. Native-image diagnostic/redaction and background task closure remain AGY-owned and outside changed branch. Keep all existing behavior; no new observability service.

## Ownership Boundaries / Boundary Encapsulation Map
| Boundary | Encapsulation / required callers | Forbidden bypass |
| --- | --- | --- |
| AGY converter | External provider event -> canonical application event | Renderer inspects AGY envelopes |
| Shared browser normalizer | Browser output shapes; used on output, not AGY wrapper | Duplicated JSON-envelope parser in UI |
| Browser-shell IPC/controller | Current shell ID and lease/attachment | Auto-attach all global sessions or steal another window's session |
| History projection | Opaque retained tool results | Replay old browser events to repair current UI |

## Dependency Rules
Converter may import OPEN_TAB_TOOL_NAME and normalizeBrowserMcpToolResult from existing server browser capability. Do not change browser normalizer internals for AGY wrapping; avoid constructing the wrapper at this boundary instead. No web -> server/core imports, including tests; cross-boundary proof belongs in server transport + real desktop, or existing workspace-owned integration harness. Native/remote/window dependencies remain unchanged.

## Interface Boundary Mapping / Check
| Interface | Identity / responsibility | Check |
| --- | --- | --- |
| projectAgyMcpToolCall | Explicit provider name + ServerName/ToolName -> canonical qualified/bare name | Singular; existing exact source discrimination |
| normalizeBrowserMcpToolResult | known open_tab + actual output -> canonical result | Singular; reuse API unchanged |
| TOOL_EXECUTION_SUCCEEDED | invocation_id + turn_id + tool_name + result | Metadata intact; result direct browser fields |
| focusBrowserTab | tab_id, current IPC sender determines shell | Existing explicit identities; no ambiguity introduced |

## Main Domain Subject Naming Check
Keep existing converter/browser-tool/session/shell names. No new domain subject, generic service or mixed identity selector is needed.

## Existing Capability / Subsystem Reuse Check
Reuse browser-tool-contract constant and browser-mcp-result-normalizer. Extend existing AGY converter success emission only. Reuse current server fixture/transport and renderer tests; no new global normalization framework.

## Subsystem / Capability-Area Allocation
AGY stream adaptation owns change; browser capability supplies reusable result contract; renderer/Electron are unchanged consumers; memory/history remain unchanged data owners. Existing runtime-oriented folders are adequate.

## Draft File Responsibility Mapping
Candidate production modification: existing agy-stream-event-converter.ts. Shared normalizer/contract are imports, not modifications. Existing converter unit suite gains positive/negative cases. Existing AGY transport fixture/test gains open_tab case. Existing browser-session docs gain precise AGY note. No new runtime file is required.

## Reusable Owned Structures Check / Shared Structure Tightness
Reuse existing single canonical tab_id result. No duplicated tab_id at outer and inner levels. Provider state remains event metadata as today, not nested browser identity. Generic results retain existing meaningful shape for other tools. No new optional-field mega DTO or compatibility representation.

## Final File Responsibility Mapping / Target Subsystem Folder Mapping
| Action / path (repo-relative) | Responsibility / ownership | Must not contain |
| --- | --- | --- |
| Modify autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts | Scoped successful own-MCP open_tab normalization | UI/window calls, parser duplication, changes to other tool cases |
| Reuse autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts and browser-tool-contract.ts | Existing canonical output contract | AGY legacy wrapper decoder |
| Modify autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts | Own open_tab canonical success/error/identity/scope tests | Assumption all MCP tools become unwrapped |
| Modify autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs and tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts | Deterministic WebSocket + history canonical browser result; preserve existing matrix | Claims fake CLI proves actual browser visibility |
| Verify existing autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts | Canonical result behavior; remote/unavailable suppression | Import of server/core into web tests |
| Update autobyteus-web/docs/browser_sessions.md | Describe AGY open_tab canonicalization accurately | Claim full AGY browser normalization if only open_tab corrected |
| Add ticket-owned new validation evidence (downstream owned) | Fixed-build real desktop proof | Mutate pre-fix evidence or call manual focus as proof of automatic fix |

## Applied Patterns / Folder Boundary Check / Derived Layering
Existing Adapter pattern at AGY stream boundary, existing reusable browser output normalizer. Runtime conversion remains server-side; presentation stays renderer/Electron. No folder creation, move or broader layering change; flat local file delta is clearer than a one-function forwarding file.

## Concrete Examples / Shape Guidance
Input: own MCP open_tab output `{"tab_id":"abc123","status":"opened","url":"about:blank","title":"Probe"}` (or its JSON text).
Target event: `{"tool_name":"open_tab","provider_state":"DONE","result":{"tab_id":"abc123","status":"opened","url":"about:blank","title":"Probe"},"invocation_id":"unchanged","turn_id":"unchanged"}`.
Avoid: `result.output.tab_id`, duplicated `result.tab_id` plus retained `output`, or UI parsing `provider_state`.
Third-party ToolName=open_tab remains `mcp__other__open_tab` and generic output wrapper. Native provider tool called open_tab without recognized MCP projection is untouched. Explicit provider errors/denials remain failures, not canonical success. Null/malformed output must never synthesize a tab ID.

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision / clean cut |
| --- | --- |
| Renderer accepts result.output.tab_id | Rejected: leaks provider contract into UI; producer must meet existing contract |
| Duplicate inner and outer tab_id | Rejected: competing representations; canonical result only for changed success |
| Rewrite/replay historical results to attach old sessions | Rejected: unrelated history mutation and unsafe UI side effects |
| New retry/global-discovery behavior | Not approved; separate policy/design needed |

## Change / Refactor Sequence
1. Add failing converter regression for actual own open_tab JSON output; assert direct result.tab_id and preserved metadata/one start/terminal.
2. Implement scoped success emission using shared normalizer. Remove wrong result wrapper on that branch only.
3. Extend fixture/server transport/history assertions; retain generic/native/image/failure/third-party cases. Verify existing renderer and Electron suites.
4. Build corrected task worktree desktop app and launch isolated instance; exercise real Daily Assistant/AGY with same model and harmless page. Assert automatic Browser selection, matching native tab in shell snapshot and visible page/positive viewport, with no manual focus or payload injection. Repeat after selecting Activity and with another open; preserve remote guard test.
5. Reopen saved run for generic historical result preservation, no historical I/O migration; document outcome and cleanup. Route failures by origin; no green claim if provider/build prerequisite fails.
6. Sync docs and hand off through normal implementation/validation/delivery workflow. User's currently running app is not a test target.

## Key Tradeoffs / Risks
Small producer correction restores proven path without redesigning valid window ownership. Only successful own-MCP open_tab normalization is changed; unrelated browser operations retain current behavior intentionally. It does not retroactively attach three old user tabs or guarantee visibility under every IPC/window failure. F-002 and missing-event recovery remain separately documented. Other intermittent cases remain unknown until captured.

## Guidance For Implementation / Verification
Implementation Engineer owns code and scoped checks, API/E2E owner executable validation, Delivery Engineer user verification/finalization. Ensure server converter tests cover object/JSON result, reuse status, duplicate terminal, native/third-party same-name exclusion, explicit error/denial, non-browser generic output, null/missing ID no fabricated focus. Shared normalizer already supports content envelopes; reuse rather than invent new shapes. Add a history test with retained nested and new canonical opaque results (no migration). Real desktop is mandatory; backend success alone is insufficient. Existing ticket desktop procedure provides reproduction steps, but use a corrected worktree build, a test-owned local page if practical, and assert automatic attachment rather than diagnostic focus. Record model/runtime/build revision, tool event, shell tab ID, panel selection, native content/viewport, screenshots and cleanup. Route any scope-changing recovery request back to Solution Designer.
