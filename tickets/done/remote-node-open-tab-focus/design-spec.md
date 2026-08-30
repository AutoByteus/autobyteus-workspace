# Design Spec: Remote-node `open_tab` focus behavior

## Current-State Read

The backend behavior is correct: an agent executes `open_tab` inside the node that owns the run, that node's browser runtime opens the URL, and the backend emits the canonical `TOOL_EXECUTION_SUCCEEDED` lifecycle event. Both standalone and team WebSocket streams send that event through `agentStreamMessageProjector.ts`, which first updates generic tool lifecycle/activity state and then calls the browser-specific `browserToolExecutionSucceededHandler.ts`.

The defect is inside that browser-specific presentation reaction. For every successful `open_tab` containing a `tab_id`, the handler asks the desktop's local `BrowserShellStore` to focus the id and then selects the right-side **Browser** tab. It does not consult the current Electron window's node binding. A Docker/VNC tab id is owned by the remote browser runtime rather than Electron's local `BrowserTabManager`; Electron main rejects the unknown id, but `browserShellStore.focusSession` catches the IPC error and resolves, allowing the handler to continue selecting **Browser**. This produces BEH-001.

The current ownership boundaries remain healthy for this scope:

- `windowNodeContextStore` authoritatively owns the renderer window's embedded-versus-remote binding and the endpoints used by both standalone and team streams.
- `browserToolExecutionSucceededHandler.ts` already owns the browser-specific post-success presentation decision.
- `browserShellStore` owns local Electron Browser availability and focus commands.
- `useRightSideTabs` owns right-side selection state.

The defect is therefore a missing invariant in the existing presentation owner, not a reason to change backend lifecycle events, streaming contracts, Electron main, or Docker browser behavior. See the investigation notes' BEH-001/BEH-002 production paths and Source Log.

## Intended Change

Keep `TOOL_EXECUTION_SUCCEEDED` and generic lifecycle/activity projection unchanged. In `handleBrowserToolExecutionSucceeded`, allow the Electron Browser focus and right-side **Browser** selection side effects only when both conditions hold:

1. `windowNodeContextStore.isEmbeddedWindow` is true; and
2. `browserShellStore.browserAvailable` is true.

For a remote/Docker window or unavailable Electron Browser shell, the browser-specific handler returns without requesting local session focus and without changing right-side selection. For an eligible embedded Electron window, the existing `focusSession(tab_id)` followed by `setActiveTab('browser')` behavior remains.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | R-001, R-003, R-004 / AC-001, AC-003, AC-004 | A run in a configured remote/Docker node window successfully executes `open_tab` | Investigation notes BEH-001; user screenshots; handler/store/Electron traces in Source Log | Preserve remote browser opening and tool success/activity; skip local Electron focus and keep current right-side selection unchanged | Remote node open -> canonical success stream -> generic lifecycle projection -> ineligible browser-presentation gate -> unchanged panel; DS-001, DS-003 |
| BEH-002 | User | R-002, R-003, R-004 / AC-002, AC-003, AC-004 | A run in the embedded Electron node window successfully executes `open_tab` with an Electron-owned tab id | Investigation notes BEH-002; `docs/browser_sessions.md`; Electron browser/runtime and existing handler tests | Preserve local session focus and Browser selection when the embedded window has an available Browser shell | Embedded bridge open -> canonical success stream -> generic lifecycle projection -> eligible browser-presentation gate -> local focus -> Browser selection; DS-002, DS-003 |

The behavior map defines what real behavior the design must serve. The later data-flow spine sections define how the target technical structure carries it; they complement this map rather than replace it.

## Relevant Supplemental Task Artifacts

None. The approved requirements directly define the two interaction states; a separate supplement would duplicate them.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: The only automatic `open_tab` Browser-selection path is the existing browser-success handler. It lacks the embedded-window/browser-availability check even though `windowNodeContextStore` already owns the exact node binding used to establish both standalone and team stream endpoints. The handler's file placement, payload parser, Browser-shell boundary, and shared streaming path are otherwise coherent.
- Design response: Add one eligibility guard at the browser-specific presentation owner; reuse the window-node and Browser-shell public store boundaries; retain all other paths.
- Refactor rationale: No owner, API, folder, or data structure must move. Creating a new policy service, widening the tool event, or branching both stream services would fragment a one-owner decision.
- Intentional deferrals and residual risk, if any: `browserShellStore.focusSession` continues to record and absorb IPC errors. Broader command-result/error propagation is outside the approved scope. The in-scope remote behavior no longer depends on that error contract because the node gate runs before focus.

## Terminology

- **Automatic local Browser projection:** The post-success combination of focusing an Electron-owned browser session and selecting the right-side **Browser** tool.
- **Embedded Electron window:** A renderer window whose authoritative `windowNodeContextStore.isEmbeddedWindow` value is true.
- **Remote/Docker window:** A renderer window bound to a configured non-embedded node; its agent browser is node-owned and is not projected by Electron's local `BrowserTabManager`.

## Design Reading Order

This spec follows the template order: approved behavior and current path first, then health/transition decisions, spines and ownership, concrete files, and implementation sequencing.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope behavior: the unconditional assumption that every successful `open_tab` result belongs to the local Electron browser runtime.
- Required action: replace that unconditional side-effect path with the approved embedded-window plus Browser-shell eligibility rule.
- No compatibility wrapper, dual event, legacy result shape, or fallback branch is required.
- Backend `TOOL_EXECUTION_SUCCEEDED` is not legacy behavior and must remain.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: N/A; only transient renderer presentation state is read or conditionally mutated.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: Node binding and Browser-shell availability are existing Pinia store state; no serialization is changed.
- Required semantics and invariants under direct use: Existing configured node registry, run history, browser sessions, and right-panel preference storage remain untouched.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: N/A.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Not Affected
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The change is an in-memory event-reaction guard; migration would have no subject or benefit.
- Acceptance criteria or design constraints supported by this decision: R-001 through R-004; AC-001 through AC-004.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — decision is `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Agent invokes `open_tab` on a remote/Docker node | Remote browser owns the opened tab; frontend records success and preserves right-side selection | Node-owned browser execution plus browser-success presentation handler for the UI consequence | Shows that truthful lifecycle reporting and UI non-projection are separate outcomes |
| DS-002 | Primary End-to-End | BEH-002 | Agent invokes `open_tab` on the embedded node | Electron local session is focused and Browser is selected | Embedded browser runtime plus browser-success presentation handler | Preserves the valid Electron-visible behavior |
| DS-003 | Return-Event | BEH-001, BEH-002 | Canonical backend `TOOL_EXECUTION_SUCCEEDED(open_tab)` reaches the renderer | Generic lifecycle/activity is updated; browser-specific side effect is applied only when eligible | `agentStreamMessageProjector` for generic lifecycle and `browserToolExecutionSucceededHandler` for browser presentation | Prevents backend truth from being suppressed to solve a renderer problem |

## Primary Execution Spine(s)

- **DS-001 — Remote/Docker:** `Agent tool invocation -> remote backend open_tab -> remote node browser/VNC runtime -> canonical TOOL_EXECUTION_SUCCEEDED -> node-bound WebSocket stream -> shared agent stream projector -> generic lifecycle/activity update -> browser-success eligibility gate (remote) -> unchanged local right-panel selection`
- **DS-002 — Embedded Electron:** `Agent tool invocation -> embedded backend BrowserToolService -> Electron browser bridge -> local BrowserTabManager session -> canonical TOOL_EXECUTION_SUCCEEDED -> node-bound WebSocket stream -> shared agent stream projector -> generic lifecycle/activity update -> browser-success eligibility gate (embedded + available) -> BrowserShellStore focus -> BrowserShellController projection -> right-side Browser selection`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The remote backend completes its own browser operation and truthfully streams success. The renderer records that completion, then the browser-specific presentation owner sees the remote window binding and stops before any Electron-local focus or tab-selection mutation. | Remote browser operation, canonical lifecycle event, generic tool projection, browser presentation gate, right-panel state | Browser-success presentation handler governs only the UI consequence | Window-node identity; Browser-shell availability |
| DS-002 | The embedded backend opens an Electron-owned session and streams success. After generic lifecycle projection, the same presentation owner verifies embedded binding and local shell availability, focuses the returned session through the Browser-shell boundary, then selects Browser. | Embedded browser operation, local session, lifecycle event, generic projection, browser presentation gate, Browser-shell focus, right-panel state | Browser-success presentation handler plus existing Browser-shell owner | Window-node identity; payload tab-id parsing |
| DS-003 | Both standalone and team success events converge on one projector. Generic lifecycle handling always runs; only the additional browser-specific projection is conditional. | Canonical event, projector, tool lifecycle state, browser presentation reaction | Agent stream projector owns dispatch order; browser handler owns its side effect | Team DTO adaptation; activity/event-monitor projection |

## Spine Actors / Main-Line Nodes

- Node-owned `open_tab` execution and browser runtime
- Canonical `TOOL_EXECUTION_SUCCEEDED` event
- Standalone/team WebSocket stream
- Shared `agentStreamMessageProjector`
- Generic tool lifecycle handler
- Browser-specific success presentation handler
- Electron Browser-shell boundary, when eligible
- Right-side tab selection, when eligible

## Ownership Map

- **Node backend/browser runtime:** owns executing `open_tab`, URL opening, and the returned tab id within that runtime.
- **Backend tool lifecycle conversion/stream:** owns truthfully emitting successful completion; it does not request a particular frontend panel.
- **`agentStreamMessageProjector`:** owns canonical dispatch ordering and generic lifecycle/activity projection for standalone and team targets.
- **`browserToolExecutionSucceededHandler.ts`:** owns interpreting a successful `open_tab` result for optional local Browser presentation. It owns the eligibility gate and sequencing of focus before selection.
- **`windowNodeContextStore`:** owns authoritative current-window node identity and endpoints. It must not own browser presentation.
- **`browserShellStore`:** owns renderer access to the Electron Browser shell, its availability, snapshots, and focus command. It must not infer which node produced a generic tool event.
- **`useRightSideTabs`:** owns right-side selected-tool state; it must not contain `open_tab`-specific policy.
- **`BrowserShellController` / `BrowserTabManager`:** own Electron-local session resolution, lease, and native view projection; remote identifiers must not reach them through the automatic path.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamingService` / `TeamStreamingService` | Shared agent stream projector and their respective context models | Transport and canonical event dispatch | Browser eligibility or right-panel policy |
| `useBrowserShellStore()` | Electron Browser shell controller/runtime | Stable renderer command/state boundary | Node-origin heuristics or backend lifecycle truth |
| `useRightSideTabs()` | Renderer right-side selection state | Stable generic selection API | Tool-specific node capability rules |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Unconditional Electron focus and `setActiveTab('browser')` for every valid `open_tab` success | It assumes a tab id identifies an Electron-local session regardless of node | Guarded sequencing in `browserToolExecutionSucceededHandler.ts` using existing window-node and Browser-shell boundaries | In This Change | Embedded eligible behavior remains inside the guarded branch |
| Idea of suppressing remote backend `TOOL_EXECUTION_SUCCEEDED` | It would corrupt lifecycle/activity truth to hide a frontend side effect | Always-on generic lifecycle projection plus conditional browser presentation | In This Change | Rejected design alternative; no existing source path should be removed because backend currently emits correctly |

No file is removed or moved.

## Return Or Event Spine(s) (If Applicable)

- **DS-003:** `Backend TOOL_EXECUTION_SUCCEEDED -> standalone/team adapter -> agentStreamMessageProjector -> handleToolExecutionSucceeded (always) -> browserToolExecutionSucceededHandler (open_tab only) -> eligibility decision -> optional Electron focus and Browser selection`

The generic completion step must precede and remain independent from the optional presentation step.

## Bounded Local / Internal Spines (If Applicable)

N/A. No loop, state machine, queue, or local dispatcher lifecycle is changed. The existing synchronous dispatch plus awaited focus call is sufficient.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Window-node binding | DS-001, DS-002, DS-003 | Browser-success presentation handler | Answer whether the current renderer is bound to the embedded node | It is the authoritative origin context for streams in that window | Widening the event or guessing from tab id duplicates identity policy |
| Browser-shell availability | DS-002, DS-003 | Browser-success presentation handler | Confirm the renderer has a usable Electron Browser surface before projection | Embedded identity alone is insufficient in a non-Electron browser client | Direct `window.electronAPI` checks would bypass the existing Browser-shell boundary |
| `tab_id` result parsing | DS-001, DS-002 | Browser-success presentation handler | Accept canonical object/string result shapes and reject missing ids | Existing runtime normalization contract | Moving parsing into generic lifecycle handling couples all tools to Browser semantics |
| Tool activity/event monitor | DS-001, DS-002, DS-003 | Shared stream projector | Record truthful success independent of UI projection | Users and history require terminal lifecycle state | Making it conditional would leave incomplete activity |

## Ownership Boundaries

The backend/node boundary ends after producing the canonical successful tool result; it does not own renderer tab selection. The shared projector owns generic event projection and must not branch on Electron node type. The browser-success handler is the authoritative browser-specific presentation coordinator and may consult the public window-node and Browser-shell stores. Electron Browser internals remain behind `browserShellStore.focusSession`; the handler must not call preload IPC directly. Right-side selection remains behind `useRightSideTabs.setActiveTab`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `windowNodeContextStore.isEmbeddedWindow` | Canonical embedded node id and Electron window binding bootstrap | Browser-success presentation handler | Reading URL/hostname, node registry internals, or tool-result ids to guess origin | Extend the window-node store, not the tool event, if future capability semantics genuinely exceed node type |
| `browserShellStore.browserAvailable` / `focusSession(tabId)` | Electron preload IPC, snapshots, local Browser-shell state | Browser-success handler and Browser UI | Direct `window.electronAPI.focusBrowserTab` from streaming code | Strengthen Browser-shell store command result explicitly in a separate approved change if needed |
| `handleBrowserToolExecutionSucceeded(payload)` | Browser result parsing, eligibility, focus/selection sequencing | Shared agent stream projector | Duplicated browser branches in standalone/team services | Extend this handler's singular browser presentation contract |
| `useRightSideTabs.setActiveTab` | Renderer active right-tool ref | Browser-specific presentation owner and explicit UI actions | Mutating the module ref from Electron or backend code | Extend generic tab composable only for generic selection needs, not Browser policy |

## Dependency Rules

- `agentStreamMessageProjector` may call the browser-success handler after generic lifecycle handling; it must not import node or Browser-shell stores for this policy.
- The browser-success handler may depend on `windowNodeContextStore`, `browserShellStore`, and `useRightSideTabs` public APIs.
- The browser-success handler must evaluate embedded-window and Browser-shell availability before calling `focusSession`.
- `setActiveTab('browser')` remains sequenced after the awaited eligible `focusSession` call, preserving current embedded behavior.
- Remote/ineligible handling must return without calling either `focusSession` or `setActiveTab`.
- Backend, team DTO adapters, and tool payload contracts must not gain presentation-only node flags.
- No renderer streaming code may call Electron preload browser APIs directly.
- No URL, hostname, tab-id format, existing-session lookup, or caught focus error may substitute for the authoritative eligibility check.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `handleBrowserToolExecutionSucceeded(payload)` | Successful browser-tool presentation | Parse `open_tab`, decide eligibility, and sequence optional local focus/selection | Canonical `ToolExecutionSucceededPayload`; `tab_id` string inside supported result shapes | Signature remains unchanged |
| `windowNodeContextStore.isEmbeddedWindow` | Current renderer window binding | Identify embedded-node binding | Boolean derived from canonical node id | Governing origin invariant |
| `browserShellStore.browserAvailable` | Local Electron Browser capability | Identify whether local Browser shell API is available | Boolean | Combined with embedded binding |
| `browserShellStore.focusSession(browserSessionId)` | Electron-local browser session | Focus/attach a local session through existing shell IPC | Non-empty local `tab_id` string | Called only after eligibility passes |
| `setActiveTab('browser')` | Right-side selection | Select Browser after eligible focus sequencing | Literal workspace tool name `browser` | Must not alter panel visibility |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser success handler | Yes | Yes | Low after gate | Keep payload signature; add eligibility inside owner |
| Window-node binding | Yes | Yes | Low | Reuse `isEmbeddedWindow`; no URL heuristic |
| Browser-shell focus | Yes | Yes for local runtime | High if called with remote id; Low after gate | Prevent remote calls before boundary crossing |
| Right-side selection | Yes | Yes | Low | Keep generic API free of `open_tab` policy |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Browser tool success presentation | `handleBrowserToolExecutionSucceeded` | Yes | Low | Retain |
| Current window node context | `windowNodeContextStore.isEmbeddedWindow` | Yes | Low | Retain |
| Electron Browser availability | `browserShellStore.browserAvailable` | Yes | Low | Retain |
| Local session focus | `browserShellStore.focusSession` | Yes | Low | Retain |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Browser-specific post-success policy | `services/agentStreaming/browser` | Extend | It already parses `open_tab`, focuses sessions, and selects Browser | N/A |
| Current node identity | `stores/windowNodeContextStore.ts` | Reuse | It is already authoritative for renderer endpoints and embedded-only features | N/A |
| Electron Browser capability/command | `stores/browserShellStore.ts` | Reuse | It already owns availability and focus IPC | N/A |
| Right-panel selection | `composables/useRightSideTabs.ts` | Reuse | It owns generic active tool state | N/A |
| Standalone/team convergence | `agentStreamMessageProjector.ts` | Reuse | Both paths already converge correctly | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent streaming browser presentation | Parse successful `open_tab`; gate and sequence optional Browser projection | DS-001, DS-002, DS-003 | Browser-success presentation handler | Extend | Only implementation source change |
| Window node context | Per-window node identity/endpoints | DS-001, DS-002, DS-003 | Browser-success handler | Reuse | Read-only dependency |
| Electron Browser shell | Local capability and focus command | DS-002 | Browser-success handler | Reuse | No store/Electron change |
| Workspace right-side tools | Active tool selection | DS-002 | Browser-success handler | Reuse | No composable/component change |
| Tool lifecycle projection | Generic success/activity state | DS-001, DS-002, DS-003 | Shared projector | Reuse | Must remain unconditional |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | Agent streaming browser presentation | Browser-success presentation owner | Add embedded-window plus Browser-shell availability eligibility before focus/selection | This file already owns all `open_tab` presentation logic | Yes—existing stores and parser |
| `autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts` | Agent streaming browser presentation tests | Handler contract | Prove remote suppression, unavailable-shell suppression, embedded preservation, and existing ignore cases | Colocated with the one changed owner | Yes—mock existing public stores |
| `autobyteus-web/docs/browser_sessions.md` | Durable Browser architecture documentation | Delivery docs sync | Qualify renderer auto-focus as embedded-Electron-only while backend success remains universal | Existing canonical Browser flow documentation | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Eligibility predicate | None | Agent streaming browser presentation | Used once at the existing owner; extraction would add indirection without reuse | N/A | N/A | Generic capability service or duplicated cross-service helper |

## Shared Structure / Data Model Tightness Check

No new shared structure, type, schema, or serialized model is introduced. Existing boolean store properties retain one clear meaning each.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | Agent streaming browser presentation | Browser-success presentation owner | Parse supported `open_tab` success; skip projection unless embedded and Browser available; otherwise preserve focus-then-select sequence | Singular browser presentation reaction | Existing tool parser, window-node store, Browser-shell store, right-tab composable |
| `autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts` | Browser presentation tests | Handler contract | Validate approved eligibility matrix and preserved ignore behavior | Singular colocated contract suite | Mocked existing public boundaries |
| `autobyteus-web/docs/browser_sessions.md` | Browser architecture docs | Delivery documentation owner | Describe universal lifecycle event plus conditional local projection | Canonical existing flow doc | N/A |

## Applied Patterns (If Any)

- **Policy at the side-effect owner:** The eligibility decision sits immediately before the Electron-local side effects in the existing browser-success handler.
- **Capability/context composition:** Authoritative node binding and Browser-shell availability are combined without introducing a new general-purpose capability abstraction.
- **Always-project truth, conditionally-project UI:** Generic tool lifecycle remains unconditional; only the optional client-local presentation effect is gated.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts` | File | Browser-success presentation handler | Implement eligibility and existing focus/selection sequencing | Existing browser-specific event reaction folder | Backend emission suppression, direct Electron IPC, URL/node heuristics |
| `autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts` | File | Browser-success handler tests | Exercise embedded/remote and shell-availability matrix | Colocated source contract | Full Docker setup or unrelated Browser UI tests |
| `autobyteus-web/docs/browser_sessions.md` | File | Browser architecture documentation | Correct the documented renderer-flow qualification | Existing canonical Browser flow document | Remote-browser bridge design not approved by this ticket |

The compact existing layout is clearer than adding folders or a new policy file: there is one policy owner, one test file, and no new structural depth.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/agentStreaming/browser/` | Main-Line Domain-Control | Yes | Low | Browser-specific stream presentation policy already lives here |
| `stores/` | Off-Spine Concern | Yes | Low | Existing node context and Browser-shell boundaries are reused read-only/through commands; no new files |
| `electron/browser/` | Persistence-Provider | Yes | Low | Native browser runtime remains encapsulated and unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Eligibility | `if (!windowNodeContextStore.isEmbeddedWindow || !browserShellStore.browserAvailable) return; await focusSession(tabId); setActiveTab('browser');` | Call `focusSession(tabId)` for every node and treat success/failure as origin detection | Origin is known before the side effect and must not be guessed from an error |
| Lifecycle versus presentation | Always run generic `handleToolExecutionSucceeded`; conditionally run local Browser projection | Suppress remote `TOOL_EXECUTION_SUCCEEDED` in the backend | Tool truth/history must not be corrupted to fix UI focus |
| Shared standalone/team path | Keep one browser handler invoked by the shared projector | Add `if remote` branches independently to `AgentStreamingService` and `TeamStreamingService` | One browser policy should not be duplicated across transports |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Suppress `TOOL_EXECUTION_SUCCEEDED(open_tab)` for remote nodes | Would incidentally prevent the frontend handler from running | Rejected | Keep canonical lifecycle event; gate only local browser presentation |
| Add a remote-specific event/result shape or node flag to preserve old handler behavior | Could let the renderer branch on new payload data | Rejected | Reuse authoritative window binding already governing the stream |
| Detect remote origin from focus failure, URL, hostname, or tab-id format | Avoids importing window-node context | Rejected | Evaluate embedded-window and Browser-shell availability before focus |
| Keep unconditional focus and add a second corrective tab switch afterward | Could restore the prior tab after the wrong switch | Rejected | Remove the wrong side effect entirely for ineligible windows |

## Derived Layering (If Useful)

`Node backend/tool lifecycle -> shared renderer event projection -> browser-specific presentation policy -> Browser-shell/right-tab public boundaries -> Electron native browser internals`

This is explanatory only. The important rule is that generic lifecycle truth precedes and is independent from optional local presentation.

## Change / Refactor Sequence

1. Extend the focused handler test harness with mock `windowNodeContextStore.isEmbeddedWindow` and explicit `browserShellStore.browserAvailable` state.
2. Add failing contract cases for remote/Docker suppression and unavailable local Browser shell; retain the embedded positive, unrelated-tool, and missing-tab-id cases.
3. Update `browserToolExecutionSucceededHandler.ts` to obtain the current window-node store and apply the combined eligibility guard before local focus/selection.
4. Keep the existing awaited `focusSession` then `setActiveTab('browser')` sequence inside the eligible path.
5. Run the focused handler suite and relevant agent/team streaming projector suites; run the frontend boundary guard. Implementation-scoped checks do not replace downstream API/E2E coverage investigation.
6. Confirm no server, protocol, Electron main, right-tab composable, or Browser-shell store files changed.
7. During delivery documentation sync, update `docs/browser_sessions.md` to describe the embedded-only automatic projection rule and remote lifecycle-only outcome.

No temporary seam, compatibility path, or migration is needed.

## Key Tradeoffs

- **Use window binding rather than event enrichment:** This keeps the event contract truthful and stable, relies on the same authority that chose the stream endpoint, and avoids presentation metadata in the backend. It assumes the existing invariant that one renderer window is bound to one node, which current source establishes.
- **Use both embedded identity and Browser availability:** Embedded identity alone would incorrectly permit a non-Electron browser client whose default node id is embedded. Browser availability alone is true in remote Electron windows. Their conjunction expresses the approved capability.
- **Keep the guard local rather than add a policy abstraction:** There is one caller and one side-effect owner. A new service/type would increase indirection without reuse.
- **Do not redesign focus error propagation:** The pre-focus eligibility gate fully corrects remote behavior. Changing `focusSession`'s error contract would broaden scope and affect other Browser callers.

## Risks

- If a future product allows one renderer window to consume simultaneous streams from different nodes, window binding would no longer identify event origin. That is not current supported behavior; such a feature would require a new approved event-origin contract.
- Existing `focusSession` error absorption means an eligible embedded event can still select Browser after an unrelated local focus failure. This is pre-existing and outside the approved remote-node bug; it should not be used as the remote detector.
- A full realistic check needs both embedded and Docker/remote browser environments. Downstream coverage investigation must classify whether existing fixtures are sufficient and record any environment limitation.

## Guidance For Implementation

- Modify only the existing browser-success presentation handler and its focused test unless implementation evidence reveals a requirement gap.
- Import and use `useWindowNodeContextStore`; do not read node registry storage, base URLs, or Electron window globals directly.
- Require `isEmbeddedWindow && browserAvailable` before any `focusSession` or `setActiveTab` call.
- Preserve parsing of object and JSON-string result shapes, `open_tab` name filtering, missing-id behavior, and focus-before-select sequencing.
- Preserve backend `TOOL_EXECUTION_SUCCEEDED`, generic `handleToolExecutionSucceeded`, activity/event-monitor projection, and both streaming-service call paths.
- Test at least:
  - remote window + Browser shell available -> no focus and no tab selection;
  - embedded window + Browser shell unavailable -> no focus and no tab selection;
  - embedded window + Browser shell available + valid `tab_id` -> focus id then select Browser;
  - unrelated tool and missing `tab_id` -> unchanged ignore behavior.
- Keep explicit user selection of Browser and Browser visibility policy unchanged.
- Do not add a remote-to-Electron browser bridge, auto-switch to VNC, or hide Browser in remote windows.
