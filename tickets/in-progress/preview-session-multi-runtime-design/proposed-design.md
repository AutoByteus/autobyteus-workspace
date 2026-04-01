# Proposed Design Document

## Design Version

- Current Version: `v8`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Captured ownership direction, runtime adapter idea, and MVP tool contract, but did not organize the design around an explicit spine inventory | Pre-template-compliance |
| v2 | Stage 5 `Design Impact` re-entry | Rewrote the artifact to be spine-first and template-complete, with explicit data-flow spine inventory, spine narratives, return/event spines, bounded local spine, subsystem reuse, and file placement checks | Round 1 |
| v3 | Stage 5 `Design Impact` re-entry after principles-based self-review | Narrowed v1 by removing preview-specific renderer projection/store work, introduced one backend `PreviewToolService` as the shared owner for capability gating and semantic normalization, and rewired the spine/call-stack basis around that owner | Round 4 |
| v4 | Stage 5 `Design Impact` re-entry after another deep review | Added explicit canonical preview contract examples, tightened the adapter-to-service boundary, added direct MCP-fit evaluation, and corrected the backend capability-area rationale | Round 7 |
| v5 | Stage 5 `Design Impact` re-entry after deeper contract review | Narrowed `wait_until` to Electron-grounded v1 semantics and made `preview_session_closed` versus `preview_session_not_found` lifecycle rules explicit | Round 10 |
| v6 | Stage 5 `Design Impact` re-entry after file-placement review | Moved preview-specific contract and shared server-side coordination into `autobyteus-server-ts/src/agent-tools/preview` and removed the generic backend `desktop-shell` boundary | Round 13 |
| v7 | Stage 6 `Requirement Gap` re-entry | Replaced dedicated preview windows with a right-side shell `Preview` surface backed by per-session `WebContentsView` instances, reintroduced a bounded renderer/main shell bridge, and removed the separate preview-window path from the target architecture | Round 15 |
| v8 | Stage 5 `Design Impact` re-entry during right-side-tab review | Made `PreviewShellController` the sole authority for preview-shell projection state, moved shell-host identity from renderer identity to a main-process-owned shell window/host identity, and added explicit shell reload/reconnect recovery flow so preview tabs do not depend on tool-result replay | Round 16 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`
- Requirements: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`
- Requirements Status: `Refined`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. In this design, `module` is not a synonym for one file and not the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Reading Rule

- This document is organized around the data-flow spine inventory first.
- Main domain subject nodes and ownership boundaries are the primary design story.
- Off-spine concerns are described in relation to the spine they serve.
- Existing capability areas/subsystems are reused or extended when they naturally fit an off-spine need.
- Files are the main concrete mapping target for concerns, and subsystems are the broader ownership context.

## Summary

Keep the existing preview-session backend contract and multi-runtime adapter model, but replace the user-visible preview surface with a shell-embedded `Preview` area on the right side of the Electron workspace.

The new target shape is:

- one outer right-side `Preview` tab that appears only when preview sessions exist,
- multiple internal preview session tabs inside that panel,
- one independent `WebContentsView` per preview session,
- Electron main owns preview sessions, `WebContentsView` lifecycle, active-view attachment, console capture, screenshot capture, JavaScript execution, and DevTools access,
- the renderer owns only snapshot-driven shell tab UI, focus/close requests, and preview-host bounds reporting,
- tool results are only triggers for preview-shell focus requests and are not a second source of preview-shell truth,
- the separate preview `BrowserWindow` path is removed from the target architecture.

The contract remains session-oriented around one opaque `preview_session_id`. The backend still reaches Electron main through the existing local authenticated preview bridge, but shell projection is no longer out of scope: it becomes a required bounded bridge between the renderer shell and the main-process preview owner.

## Goal / Intended Change

The earlier preview implementation proved the backend tool flow, but opening a new native window for every preview session is poor workspace UX. The intended change is to keep preview inside the existing Electron shell so it behaves like an integrated browser workspace while preserving the agent-facing capabilities that matter:

- stable preview sessions,
- screenshots,
- console logs,
- JavaScript execution,
- DevTools access,
- consistent runtime exposure across `autobyteus`, `codex_app_server`, and `claude_agent_sdk`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The separate preview-window behavior is now legacy for this ticket.
- The target implementation must not keep both:
  - dedicated preview `BrowserWindow` sessions, and
  - shell-tab-backed preview sessions.
- The current `PreviewWindowFactory` path becomes obsolete in scope and must be removed or decommissioned.
- Existing node-bound shell windows remain valid as user-facing shells, but their construction path must evolve so the shell can host preview `WebContentsView` instances without a dual-path window model.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Session-oriented preview contract remains stable | AC-003, AC-007 | stable `preview_session_id` and deterministic close semantics | UC-001, UC-002, UC-003, UC-004 |
| R-002 | Preview is embedded in the right-side shell | AC-002, AC-008 | shell-embedded preview replaces separate windows | UC-001, UC-004, UC-008 |
| R-003 | Outer Preview tab is lazy | AC-002, AC-007 | visible only while preview sessions exist | UC-001, UC-004 |
| R-004 | Each preview session owns an independent browser control | AC-003, AC-004 | one independent `WebContentsView` / `webContents` per session | UC-002, UC-003, UC-007 |
| R-005 | Shared multi-runtime abstraction remains intact | AC-005 | same preview-session semantics across three runtimes | UC-001, UC-002, UC-003 |
| R-006 | Ownership boundaries are explicit | AC-001, AC-006 | main-process preview owner and renderer shell ownership stay distinct | UC-005, UC-006 |
| R-007 | Event / IPC surface stays bounded | AC-006 | renderer/main shell bridge is small and purposeful | UC-005, UC-006 |
| R-008 | Per-session diagnostics/control parity is preserved | AC-004 | screenshots, console, JS, DevTools stay per-session | UC-002, UC-007 |
| R-009 | Cleanup semantics are deterministic | AC-007 | close invalidation and shell-hide behavior are authoritative | UC-004, UC-008 |
| R-010 | Adapter contract parity remains intact | AC-005 | runtime adapters preserve one shared preview contract | UC-001, UC-002, UC-003 |
| R-011 | Separate preview-window path is removed | AC-008 | no dual path or compatibility wrapper remains | UC-008 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Preview tool execution already exists end-to-end through a bridge into Electron main, but the shell UI is not part of the preview spine today | `autobyteus-server-ts/src/agent-tools/preview/*`, `autobyteus-web/electron/preview/preview-bridge-server.ts`, `autobyteus-web/electron/preview/preview-session-manager.ts` | none material |
| Current Ownership Boundaries | Electron main owns native windows and tool bridge lifecycle; renderer right-side tabs are pure Vue state; preview currently bypasses the renderer entirely by opening a `BrowserWindow` | `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/preview/preview-runtime.ts`, `autobyteus-web/composables/useRightSideTabs.ts`, `autobyteus-web/components/layout/RightSideTabs.vue` | cleanest shell-host attachment path |
| Current Coupling / Fragmentation Problems | Right-side tabs are static renderer tabs; `WebContentsView` is main-process-owned and not part of the DOM, so a tab-backed preview needs a deliberate shell bridge and cannot be implemented as a normal Vue component only | current right-panel files plus Electron `WebContentsView` model | shell window composition strategy |
| Existing Constraints / Compatibility Facts | Electron’s native composition primitive is `WebContentsView`; `<webview>` is not the desired path; current shell windows are created as `BrowserWindow` instances and current broadcast helpers assume `BrowserWindow.getAllWindows()` | Electron docs + `electron/main.ts` + current preview code | whether to move shell windows to `BaseWindow` in scope |
| Relevant Files / Components | main shell window bootstrap, right-panel width/visibility state, right-side tab list, preview session manager/runtime, preload bridge, and shared preview tool service are the key design edges | `electron/main.ts`, `components/layout/WorkspaceDesktopLayout.vue`, `composables/useRightPanel.ts`, `composables/useRightSideTabs.ts`, `electron/preload.ts`, `agent-tools/preview/*` | none material |

## Current State (As-Is)

- `open_preview` and follow-up preview tools already work across runtimes.
- Electron main currently creates a dedicated `BrowserWindow` for each preview session.
- Preview tools currently operate on `preview_session_id`, but that identity is not connected to any shell-tab projection state.
- The right-side shell tabs are static and renderer-owned.
- The shell window itself is built as a `BrowserWindow`, while Electron’s official composition model for many independent web views is `BaseWindow` + `WebContentsView`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | packaged app startup | runtime-specific preview tool exposure decision | `PreviewToolService` | preview tools must still appear only when the local shell owner is actually available |
| DS-002 | Primary End-to-End | agent preview open request | tool result containing `preview_session_id` and session metadata | `PreviewSessionManager` | session creation and contract truth remain the main value spine |
| DS-003 | Primary End-to-End | agent follow-up preview tool call | normalized result for screenshot/logs/navigation/JS/devtools/close | `PreviewSessionManager` | per-session browser-control behavior must survive the move into shell tabs |
| DS-004 | Primary End-to-End | renderer requests focus for a preview session in the current shell | authoritative shell snapshot makes the outer `Preview` tab visible and attaches the active `WebContentsView` to the right-side host area | `PreviewShellController` | the preview surface is now a core product requirement, and it needs one authoritative shell projection owner |
| DS-005 | Return-Event | shell host registers, reloads, changes selection, resizes, hides/shows, or manually closes a preview tab | active native preview attachment and authoritative shell snapshot remain correct | `PreviewShellController` | shell layout changes and shell reload/reconnect must not make the renderer the owner of native preview lifecycle |
| DS-006 | Return-Event | tool-driven or native session close | authoritative invalidation plus shell-tab disappearance when last session is gone | `PreviewSessionManager` | close semantics must stay deterministic across tool and shell actions |
| DS-007 | Bounded Local | bridge command enters session owner | session registry invariants, per-session `WebContentsView`, and result/error semantics settle | `PreviewSessionManager` | correctness still depends on one authoritative session owner |
| DS-008 | Bounded Local | shell host rect or active-session request enters shell projection owner | exactly one active preview view is attached to a given shell host and its bounds match the renderer-reported host area | `PreviewShellController` | native view attachment and shell layout are a second correctness center that cannot remain implicit |

Rule:
- The shell projection owner now needs its own bounded local spine because native view attachment, detachment, and bounds sync materially affect correctness.

## Primary Execution / Data-Flow Spine(s)

- `Electron startup -> preview bridge startup -> bridge env injection -> PreviewToolService capability decision -> runtime tool exposure`
- `Agent runtime tool call -> runtime adapter -> PreviewToolService -> preview bridge client -> preview bridge server -> PreviewSessionManager -> session/webContentsView creation -> tool result`
- `Tool result/activity stream -> renderer focus request -> PreviewShellController -> authoritative shell snapshot -> renderer preview store -> active session view attachment`
- `Agent follow-up preview tool call -> runtime adapter -> PreviewToolService -> PreviewSessionManager -> per-session webContents action -> normalized result`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `PreviewToolService` | shared backend coordination owner | support checks, semantic validation, shared bridge delegation |
| Runtime adapters | runtime-native exposure boundary | translate registry/dynamic/MCP calls into canonical preview shapes |
| Preview bridge server/client | backend-to-shell boundary | authenticated local transport into Electron main |
| `PreviewSessionManager` | governing preview session owner | session IDs, per-session `WebContentsView`, logs, screenshots, JS, DevTools, close semantics |
| `PreviewShellController` | governing shell projection owner | host window association, active session selection, view attach/detach, bounds sync, shell snapshot broadcasting |
| Renderer preview shell store/panel | shell UI projection | snapshot-driven outer Preview tab, internal preview tabs, focus/close UX, host rect reporting |
| Shell window host | main-process shell surface owner | renderer view plus preview host composition inside one app window |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | At app startup, Electron main starts the preview bridge and injects its env into the packaged server. `PreviewToolService` reads that support context, and runtime bootstraps expose preview tools only when the shell owner is actually available. | Electron main, preview bridge, `PreviewToolService`, runtime adapters | `PreviewToolService` | server env injection, runtime exposure translation |
| DS-002 | An agent asks to open a preview. The runtime adapter translates input into the canonical contract and calls `PreviewToolService`, which delegates through the bridge into `PreviewSessionManager`. The owner creates or reuses a preview session backed by one `WebContentsView`, waits for the requested ready state, and returns one stable `preview_session_id`. | runtime adapter, `PreviewToolService`, bridge, `PreviewSessionManager` | `PreviewSessionManager` | view factory, console capture, screenshot path policy |
| DS-003 | Later preview tools still flow through the same contract and reach the same session owner. The owner performs navigation, screenshot capture, console retrieval, JS execution, DevTools open, or close against the existing session’s `webContents`. | runtime adapter, `PreviewToolService`, bridge, `PreviewSessionManager` | `PreviewSessionManager` | result normalization, error mapping |
| DS-004 | Once a renderer window displaying the run receives the successful tool result, it sends a bounded focus request for the preview session. `PreviewShellController` resolves the main-process shell host identity, updates shell projection state, and emits the authoritative shell snapshot. The renderer then renders the outer `Preview` tab from that snapshot and reports the preview host bounds. | renderer store/panel, preload bridge, `PreviewShellController`, shell window host | `PreviewShellController` | host rect measurement, active-session routing, host-window association |
| DS-005 | When the shell renderer mounts/reloads, the user switches preview tabs, resizes the right panel, collapses it, or closes a preview tab manually, the renderer sends bounded shell events. `PreviewShellController` updates attachment state and bounds, emits the authoritative snapshot, and `PreviewSessionManager` remains authoritative for session validity. | renderer store/panel, preload bridge, `PreviewShellController`, `PreviewSessionManager` | `PreviewShellController` | shell bootstrap/reconnect, resize throttling, detach when hidden, manual close path |
| DS-006 | A close from the tool layer, user shell action, or native lifecycle event flows back into `PreviewSessionManager`, which invalidates the session, updates shell snapshots, and removes the outer `Preview` tab when the last session is gone. | `PreviewSessionManager`, `PreviewShellController`, renderer store | `PreviewSessionManager` | snapshot fanout, active-session fallback selection |
| DS-007 | Inside the session owner, one bounded local flow arbitrates creation, reuse, mutation, invalidation, and result/error settlement for session records and their `WebContentsView` instances. | `PreviewSessionManager` | `PreviewSessionManager` | registry invariants, title updates, closed tombstones |
| DS-008 | Inside the shell projection owner, a second bounded local flow arbitrates host bounds, active session, host visibility, and attached native view so exactly one session view is attached to one shell host at a time. | `PreviewShellController` | `PreviewShellController` | attach/detach ordering, hidden-state handling, host loss cleanup |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `PreviewSessionManager` | session registry, `preview_session_id`, per-session `WebContentsView`, console buffers, screenshots, JS execution, DevTools open, close semantics | renderer tab UI state, host bounds, runtime-specific tool exposure | authoritative preview-session owner |
| `PreviewShellController` | shell-window association, active preview session per shell window, host bounds, attach/detach, shell snapshot broadcasting | session contract semantics, runtime tool parsing, backend bridge policy | authoritative shell projection owner |
| Renderer preview store/panel | snapshot-driven outer Preview tab visibility in UI, internal tab strip UI, focus/close requests, bounds measurement | native view lifecycle, session truth, bridge policy | projection only |
| Shell window host | main shell window composition and renderer host view | preview-session semantics, runtime adapters | composition owner |
| `PreviewToolService` | support checks, semantic validation on canonical inputs, bridge delegation, shared result/error normalization | shell-tab UI state, native session lifecycle, runtime-specific payload parsing | backend coordination owner |
| Runtime adapters | runtime-native exposure/translation | preview lifecycle, shell UI state, divergent semantics | one adapter per runtime path |
| Preview bridge server/client | authenticated local transport | product policy beyond boundary validation/translation | boundary only |

## Canonical Preview Contract (Concrete Example)

The session-oriented contract remains app-owned and canonical across all runtimes. The move from separate windows to shell tabs does not change the session identity model.

### Identity Rule

- `preview_session_id` is an opaque application-owned identifier.
- Follow-up operations use only `preview_session_id`.
- Raw Electron `webContents.id`, `View`, or window identifiers must never cross the tool boundary.
- A preview session may be projected into at most one shell host at a time.
- Shell projection identity is main-process-owned (`shell_window_id` / registered host identity), not renderer-process-owned.

### Canonical Input / Output Shapes

```ts
type OpenPreviewInput = {
  url: string;
  title?: string | null;
  reuse_existing?: boolean;
  wait_until?: 'domcontentloaded' | 'load';
};

type OpenPreviewResult = {
  preview_session_id: string;
  status: 'opened' | 'reused';
  url: string;
  title: string | null;
};

type NavigatePreviewInput = {
  preview_session_id: string;
  url: string;
  wait_until?: 'domcontentloaded' | 'load';
};

type CapturePreviewScreenshotInput = {
  preview_session_id: string;
  full_page?: boolean;
};

type GetPreviewConsoleLogsInput = {
  preview_session_id: string;
  since_sequence?: number | null;
};

type ExecutePreviewJavascriptInput = {
  preview_session_id: string;
  javascript: string;
};

type ExecutePreviewJavascriptResult = {
  preview_session_id: string;
  result_json: string;
};

type OpenPreviewDevToolsInput = {
  preview_session_id: string;
  mode?: 'detach';
};

type OpenPreviewDevToolsResult = {
  preview_session_id: string;
  status: 'opened';
};

type ClosePreviewInput = {
  preview_session_id: string;
};
```

### Normalized Error Vocabulary

```ts
type PreviewErrorCode =
  | 'preview_unsupported_in_current_environment'
  | 'preview_session_closed'
  | 'preview_session_not_found'
  | 'preview_navigation_failed'
  | 'preview_javascript_execution_failed'
  | 'preview_bridge_unavailable';
```

### Session Lifecycle / Shell Projection Rules

- Closing an internal preview tab closes the corresponding preview session.
- When the last preview session closes, the outer `Preview` tab disappears.
- `preview_session_closed` means the ID was previously issued by the owner and later closed.
- `preview_session_not_found` means malformed, never-issued, or already-evicted identity.
- A session can exist before it is attached to a shell host; attachment is driven by renderer shell projection after the tool result arrives.
- A successful tool result may trigger a shell focus request, but it does not directly create renderer preview-shell truth.
- The renderer derives visible preview sessions, active preview selection, and outer-tab visibility from the authoritative shell snapshot published by `PreviewShellController`.
- Shell association and recovery are keyed by the owning shell window / host identity, not by renderer process identity.

## Return / Event Spine(s) (If Applicable)

- `tool result -> renderer focus request -> electronAPI.preview.focusSession -> PreviewShellController snapshot update -> renderer preview store updates from snapshot`
- `renderer mount/reload + bounds/visibility -> electronAPI.preview.registerHost/updateHostRect -> PreviewShellController attach/detach + snapshot update`
- `session close -> PreviewSessionManager invalidation -> PreviewShellController snapshot update -> renderer hides Preview tab when empty`

## Bounded Local / Internal Spines (If Applicable)

### BL-001 — Preview Session Lifecycle

- Parent owner: `PreviewSessionManager`
- Start / end: bridge command or shell close request enters -> authoritative session state/result/error is settled
- Flow:
  - `lookup/reuse/create session -> own one WebContentsView -> attach observers -> settle ready state -> update metadata -> return result or normalized error`
- Why explicit:
  - session existence, close semantics, and per-session browser-control behavior remain the contract center.

### BL-002 — Preview Shell Attachment Lifecycle

- Parent owner: `PreviewShellController`
- Start / end: shell host registration, shell host rect, or active-session change enters -> attached native preview view matches the active shell state for that shell window
- Flow:
  - `resolve shell window / host identity -> resolve active session -> detach previous active view -> attach new view to host -> apply bounds -> detach when hidden/host missing -> emit snapshot`
- Why explicit:
  - native view attachment is now separate from session creation and must remain coherent under resize, tab change, and close events.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Preview bridge server/client | `PreviewToolService`, `PreviewSessionManager` | authenticated transport between backend and shell owner | Yes |
| Renderer preview store | `PreviewShellController` | authoritative snapshot-driven shell UI state plus user focus/close requests | Yes |
| Preload preview IPC | renderer + `PreviewShellController` | typed bounded bridge for shell projection requests, host registration, and snapshots | Yes |
| Screenshot artifact writer | `PreviewSessionManager` | write screenshot artifacts to disk | Yes |
| Console log buffer | `PreviewSessionManager` | per-session console accumulation | Yes |
| Shell window registry | `PreviewShellController` | locate the correct shell host and renderer view for IPC/snapshot fanout | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Backend preview contract and shared coordination | `autobyteus-server-ts/src/agent-tools/preview` | Reuse | already owns preview tool contract and bridge client | N/A |
| Runtime-specific exposure | existing runtime backend folders | Reuse | still the correct adapter boundaries | N/A |
| Renderer shell tab selection | existing right-side tab composable/components | Extend | preview becomes one more shell tab plus internal preview-tab panel | N/A |
| Main-process preview session owner | existing `electron/preview` capability area | Extend | preview-specific native lifecycle still belongs here | N/A |
| Shell window composition / host registration | current `electron/main.ts` inline window helpers | Create New | current inline BrowserWindow helpers are too monolithic for a tab-backed native-view host model | existing inline helpers do not own reusable shell composition concerns cleanly |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/preview` | canonical contract, service, bridge client, native runtime tools | DS-001, DS-002, DS-003 | `PreviewToolService` | Reuse/Extend | add JS/devtools contract extensions if accepted |
| runtime backend folders | Codex and Claude exposure adapters | DS-001, DS-002, DS-003 | runtime adapters | Reuse | translation only |
| `autobyteus-web/electron/preview` | preview session owner, shell projection owner, bridge server, screenshot/log concerns | DS-002, DS-003, DS-004, DS-005, DS-006, DS-007, DS-008 | `PreviewSessionManager`, `PreviewShellController` | Extend | preview-native core |
| `autobyteus-web/electron/shell` | composable shell window creation, shell host registration, renderer host lookup | DS-004, DS-005 | shell window host | Create New | extracted from monolithic `main.ts` |
| `autobyteus-web/electron/preload.ts` + typed declarations | renderer/main preview IPC bridge | DS-004, DS-005 | renderer preview store | Extend | typed preview shell bridge |
| renderer stores/components for right panel | Preview tab visibility, internal preview tab strip, host bounds reporting | DS-004, DS-005, DS-006 | renderer preview store/panel | Extend/Create New | one new preview panel plus small store |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - runtime adapter -> `PreviewToolService` -> preview bridge client -> preview bridge server -> `PreviewSessionManager`
  - renderer preview store/panel -> preload preview IPC -> `PreviewShellController` -> `PreviewSessionManager`
  - shell window host -> renderer host webContents + preview shell controller registration
- Authoritative public entrypoints versus internal owned sub-layers:
  - backend callers use `PreviewToolService`, not the bridge client directly
  - renderer callers use preload preview IPC, not `ipcRenderer` ad hoc
  - renderer preview UI uses `PreviewShellController` snapshots for preview-shell truth and does not infer that truth from tool result payloads
  - shell projection uses `PreviewShellController`, not `PreviewSessionManager` internals directly from renderer
- Forbidden shortcuts:
  - renderer must not own or instantiate `WebContentsView`
  - renderer must not treat tool-result payloads as a second authoritative source of preview-shell state
  - runtime adapters must not parse raw bridge results themselves
  - backend must not target a shell window directly
  - shell projection must not infer session truth without the session owner
- Boundary bypasses that are not allowed:
  - no separate preview `BrowserWindow` fallback path
  - no `<webview>` renderer embed
  - no direct DOM ownership of preview content

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - shell-embedded preview via renderer-visible `Preview` tab plus main-process-owned `WebContentsView` sessions and one bounded shell IPC bridge
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - complexity: higher than popup windows, but aligned with the actual UX requirement
  - testability: session contract stays stable; shell projection can be tested separately from backend bridge
  - operability: preview remains a local desktop capability and becomes easier for users to manage in one workspace
  - evolution cost: this creates a clean future path for more browser-like preview tooling without adding more popup windows
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Boundary encapsulation assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Split`, `Move`, `Remove`

### Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Keep dedicated preview `BrowserWindow` sessions | smallest delta from current implementation | bad UX, popup proliferation, fails updated requirement | Rejected | user requirement changed |
| B | Embed preview as a normal renderer DOM tab (`iframe`/`webview`) | simpler visual integration | wrong ownership model, weaker browser control, `<webview>` not desired | Rejected | does not preserve native preview control cleanly |
| C | Shell-embedded preview with one `WebContentsView` per session and bounded renderer/main bridge | preserves browser-control capabilities and matches desired UX | requires shell composition work and a new shell projection owner | Chosen | best fit for product requirement and Electron native primitives |

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| authoritative owner for repeated coordination | `PreviewToolService`, `PreviewSessionManager`, `PreviewShellController` | keeps runtime adapters and renderer thin | spine owners | repeated coordination is not duplicated across callers |
| snapshot-only renderer projection state | preview store/panel | renderer stays UI-only, not native-view owner or shell-truth owner | renderer off-spine concern | preserves main/preload boundary |
| one identity, many surfaces | `preview_session_id` contract | backend tool contract survives surface refactor | shared contract | decouples API from window/tab choice |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | shell attach/detach, runtime capability gating, adapter parity | keep clear owners (`PreviewToolService`, `PreviewShellController`) |
| Responsibility overload exists in one file or one optional module grouping | Yes | current `electron/main.ts` inline window logic is already overloaded | Split |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | preload preview IPC and `PreviewShellController` own real shell projection concerns | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | bridge, store, screenshot writer, shell registry all map cleanly | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | server preview subsystem and runtime adapters stay reused | Reuse/Extend |
| Current structure can remain unchanged without spine/ownership degradation | No | popup-window design and inline main-window helpers no longer fit target behavior | Change |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-web/electron/preview/preview-session-manager.ts` | same path | replace `BrowserWindow` ownership with per-session `WebContentsView` ownership and expanded per-session actions | Electron preview subsystem | authoritative owner remains |
| C-002 | Remove | `autobyteus-web/electron/preview/preview-window-factory.ts` | N/A | separate preview windows are legacy in scope | Electron preview subsystem | replace with view-oriented concern |
| C-003 | Add | N/A | `autobyteus-web/electron/preview/preview-shell-controller.ts` | explicit owner for shell projection, active session, bounds, attach/detach | Electron preview subsystem | new owner required |
| C-004 | Add | N/A | `autobyteus-web/electron/shell/*` | extract composable shell window host/registry from monolithic `main.ts` | Electron shell subsystem | supports preview host composition |
| C-005 | Modify | `autobyteus-web/electron/preload.ts`, typed declarations | same paths | expose bounded preview shell IPC to renderer | preload/types | typed bridge |
| C-006 | Add | N/A | renderer preview store + `PreviewPanel.vue` | outer Preview tab and internal preview tabs | renderer shell UI | projection only |
| C-007 | Modify | `autobyteus-web/composables/useRightSideTabs.ts`, `RightSideTabs.vue` | same paths | add lazy outer Preview tab | renderer shell UI | dynamic visible tab |
| C-008 | Modify | server preview tool contract/service/bridge/adapters | same subsystem | add JS/devtools support if kept in v1 and preserve contract parity | backend preview subsystem | no runtime drift |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| dedicated preview `BrowserWindow` creation path | shell-embedded preview replaces popup-window UX | `PreviewSessionManager` + `PreviewShellController` + shell preview panel | In This Change | remove dual path |
| `PreviewWindowFactory` | session owner no longer creates separate windows | `WebContentsView` creation inside preview session owner / view factory concern | In This Change | remove obsolete file |
| v6 assumption that renderer stays off the main preview line | shell embedding requires a bounded renderer projection spine | renderer preview store/panel + preload preview IPC | In This Change | keep renderer projection minimal, not absent |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `electron/preview/preview-session-manager.ts` | Electron preview subsystem | `PreviewSessionManager` | session registry, per-session `WebContentsView`, per-session actions | one authoritative session owner | Yes |
| `electron/preview/preview-shell-controller.ts` | Electron preview subsystem | `PreviewShellController` | active shell projection, attach/detach, shell snapshots | one authoritative shell projection owner | Yes |
| `electron/shell/workspace-shell-window.ts` | Electron shell subsystem | shell window host | one composable shell window with renderer host + preview host registration | one shell host boundary | No |
| `components/workspace/tools/PreviewPanel.vue` | renderer shell UI | renderer panel boundary | internal preview tabs + host div + session actions | one visible shell panel | Yes |
| `stores/previewShellStore.ts` | renderer shell UI | renderer projection owner | preview shell snapshot + selection state | one projection store | Yes |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| preview snapshot payload | `electron/preview/preview-shell-contract.ts` or existing preview contract file | Electron preview subsystem | shared between main IPC, preload types, and renderer store | Yes | Yes | a second source of session truth |
| shell window registration / lookup | `electron/shell/workspace-shell-registry.ts` | Electron shell subsystem | preview shell controller and app lifecycle both need it | Yes | Yes | generic catch-all global manager |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| preview shell snapshot | Yes | Yes | Medium | Yes | keep shell projection metadata separate from canonical backend tool contract |
| canonical preview tool contract | Yes | Yes | Low | Yes | preserve as server-side source of truth for runtime adapters |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | backend preview subsystem | contract boundary | canonical tool schemas, validators, error vocabulary | one tool contract source | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | backend preview subsystem | `PreviewToolService` | support checks, semantic validation, bridge delegation, result normalization | one backend coordination owner | Yes |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | Electron preview subsystem | `PreviewSessionManager` | authoritative preview sessions and per-session browser-control actions | one session owner | Yes |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | Electron preview subsystem | `PreviewShellController` | shell host association, active-session selection, attach/detach, snapshot updates | one shell projection owner | Yes |
| `autobyteus-web/electron/shell/workspace-shell-window.ts` | Electron shell subsystem | shell window host | composable shell window creation and renderer host ownership | one shell host boundary | Yes |
| `autobyteus-web/electron/preload.ts` | preload bridge | typed boundary | preview shell IPC API exposure to renderer | one typed renderer bridge | Yes |
| `autobyteus-web/stores/previewShellStore.ts` | renderer shell UI | renderer projection store | preview shell snapshots and user selection state | one renderer projection store | Yes |
| `autobyteus-web/components/workspace/tools/PreviewPanel.vue` | renderer shell UI | renderer panel boundary | internal preview tabs and native-host rect measurement | one visible preview panel | Yes |

## Derived Implementation Mapping (Secondary)

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `electron/preview/preview-session-manager.ts` | Modify | DS-002, DS-003, DS-006, DS-007 | `PreviewSessionManager` | refactor to per-session `WebContentsView` + JS/devtools | `view.webContents`, `capturePage`, `executeJavaScript`, `openDevTools` | remove window path |
| `electron/preview/preview-shell-controller.ts` | Add | DS-004, DS-005, DS-008 | `PreviewShellController` | attach/detach active session view based on shell state | shell snapshot contract, host rect API | new owner |
| `electron/shell/workspace-shell-window.ts` | Add | DS-004, DS-005 | shell window host | composable shell window + preview host registration | `BaseWindow`, renderer `WebContentsView` | chosen direction |
| `electron/preload.ts` + typings | Modify | DS-004, DS-005 | preload bridge | preview shell snapshot / selection / bounds IPC | `electronAPI.preview.*` | typed |
| `stores/previewShellStore.ts` + `PreviewPanel.vue` | Add | DS-004, DS-005, DS-006 | renderer projection | outer Preview tab visibility + internal preview tabs | `ResizeObserver`, preview IPC | bounded UI state |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| preview tool contract/service | backend preview subsystem | same subsystem | backend preview coordination | Yes | Low | Keep/Extend | still the correct server owner |
| separate preview window factory | `electron/preview/preview-window-factory.ts` | N/A | obsolete popup-window concern | No | Low | Remove | legacy after requirement change |
| shell window composition logic | `electron/main.ts` inline helpers | `electron/shell/*` | shell window host concern | Yes | Medium | Split | reduce main-file overload and create clean composition owner |
| renderer preview shell UI | none | `stores/previewShellStore.ts`, `components/workspace/tools/PreviewPanel.vue` | renderer projection concern | Yes | Low | Add | necessary but bounded |

Rules:
- The design is invalid if a renderer store becomes the owner of native preview lifecycle.
- The design is invalid if both separate preview windows and shell preview tabs remain live target behavior.
- The design is invalid if shell composition concerns stay as ad hoc logic inside `main.ts` without a clear owner once `WebContentsView` embedding is introduced.
