# Proposed Design Document

## Design Version

- Current Version: `v10`

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
| v9 | Stage 7 `Requirement Gap` re-entry after packaged validation success | Narrowed the stable tool surface to the eight browser-style preview tools, removed console-log and DevTools tools from the contract, and added session listing, page read, and DOM snapshot semantics to the preview owner boundary | Round 19 |
| v10 | Stage 8 `Design Impact` re-entry | Keeps the working shell-tab UX and eight-tool surface, but structurally splits the preview tool boundary, introduces one owned preview tool manifest, removes alias-based compatibility parsing, splits the Electron preview session owner into lifecycle/navigation/page-operation owners, and decomposes Codex payload parsing by subject so the bounded local spines stay readable and Stage 8 file limits remain enforceable | Round 20 |

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

Keep the working shell-embedded preview behavior and the eight-tool preview surface, but redesign the implementation around tighter owned boundaries so the working feature also satisfies the Stage 8 data-spine, ownership, and size-gate rules.

The v10 target shape is:

- one outer right-side `Preview` tab that appears only when preview sessions exist,
- multiple internal preview session tabs inside that panel,
- one independent `WebContentsView` per preview session,
- one canonical snake_case preview tool contract with no alias-based compatibility parsing,
- one owned preview tool manifest that defines the eight-tool surface once and drives native, Codex, and Claude exposure,
- one `PreviewSessionManager` that owns only session registry/lifecycle/reuse/close and delegates navigation/readiness plus page operations to clear internal owned files,
- one `PreviewShellController` that remains the sole owner of shell projection state,
- one decomposed Codex event-parsing structure so preview tool result parsing no longer grows an all-purpose payload blob.

User-visible behavior does not change from v9. This re-entry is structural: it repairs the bounded local spines and ownership boundaries so the current feature can be accepted.

## Goal / Intended Change

The preview tab implementation now works functionally, but the current source shape failed Stage 8 because several ownership boundaries became mixed-concern blobs:

- `preview-tool-contract.ts` is no longer only a contract boundary,
- `preview-session-manager.ts` is no longer only the preview-session lifecycle owner,
- the preview tool surface is duplicated across runtime adapters,
- Codex payload parsing remained an overgrown mixed parser.

The intended change is to keep the approved product behavior while redesigning the implementation basis so:

- the primary preview spines are still the same,
- the bounded local spines are explicit and readable,
- contract, manifest, parsing, navigation, and page-operation concerns each have one clear owner,
- no compatibility aliases or duplicated runtime tool surfaces remain in the target design.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required removals in this re-entry:
  - compatibility aliases for preview tool inputs,
  - duplicated preview tool-surface definitions across Codex and Claude adapters,
  - mixed contract/normalizer/schema/error ownership inside `preview-tool-contract.ts`,
  - mixed lifecycle/navigation/page-operation ownership inside `preview-session-manager.ts`,
  - preview-specific growth inside the monolithic Codex payload parser.
- Previously removed behaviors remain removed:
  - no separate preview `BrowserWindow` path,
  - no preview console-log tool,
  - no preview DevTools tool.

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
| R-008 | Per-session inspection/control parity is preserved | AC-004 | list, read page, DOM snapshot, screenshot, JS, and close stay session-oriented | UC-002, UC-007 |
| R-009 | Cleanup semantics are deterministic | AC-007 | close invalidation and shell-hide behavior are authoritative | UC-004, UC-008 |
| R-010 | Adapter contract parity remains intact | AC-005 | runtime adapters preserve one shared preview contract | UC-001, UC-002, UC-003 |
| R-011 | Separate preview-window path is removed | AC-008 | no dual path or compatibility wrapper remains | UC-008 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | The end-to-end feature path works: runtime preview tool -> server preview tool/service -> preview bridge -> Electron preview owner -> shell projection. The problem is structural ownership inside the implementation, not the high-level spine choice. | `autobyteus-server-ts/src/agent-tools/preview/*`, `autobyteus-web/electron/preview/*`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | none material |
| Current Ownership Boundaries | `PreviewShellController` is already the sole shell projection owner, but `preview-tool-contract.ts` and `preview-session-manager.ts` have absorbed neighboring concerns until their names no longer match their responsibility. | `preview-tool-contract.ts`, `preview-session-manager.ts`, `preview-shell-controller.ts` | exact split surfaces for navigation/page ops |
| Current Coupling / Fragmentation Problems | Codex and Claude preview tool-definition builders duplicate the eight-tool surface. Codex preview result parsing was added into an already-large payload parser instead of splitting by subject. | `build-preview-dynamic-tool-registrations.ts`, `build-claude-preview-tool-definitions.ts`, `codex-item-event-payload-parser.ts` | minimal Codex split that keeps adapters readable |
| Existing Constraints / Compatibility Facts | The stable product surface is eight snake_case preview tools. Current input normalizers still accept alias spellings, which conflicts with the no-backward-compat rule. | `requirements.md`; `preview-tool-contract.ts` parsing helpers | none material |
| Relevant Files / Components | Preview tool layer, runtime adapter builders, Codex event parsing, Electron preview owner/controller, renderer preview panel/store, and shell host remain the key design edges. | preview files above plus `PreviewPanel.vue`, `previewShellStore.ts`, `workspace-shell-window.ts` | none material |

## Current State (As-Is)

- The shell-tab preview UX is the correct product direction and remains the target.
- The stable tool surface for this ticket is:
  - `open_preview`
  - `navigate_preview`
  - `close_preview`
  - `list_preview_sessions`
  - `read_preview_page`
  - `capture_preview_screenshot`
  - `preview_dom_snapshot`
  - `execute_preview_javascript`
- The implementation currently passes behavior validation but fails structural review because:
  - contract parsing/validation/schema-building are mixed,
  - session lifecycle/navigation/page operations are mixed,
  - runtime tool-surface definitions are duplicated,
  - Codex payload parsing remains overgrown.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | packaged app startup | runtime-specific preview tool exposure decision | `PreviewToolService` | preview tools must appear only when the local preview owner is actually available |
| DS-002 | Primary End-to-End | agent `open_preview` request | tool result containing `preview_session_id` and session metadata | `PreviewSessionManager` | session creation and contract truth remain the primary business spine |
| DS-003 | Primary End-to-End | agent follow-up preview tool call | normalized result for navigation/list/read-page/DOM-snapshot/screenshot/JS/close | `PreviewSessionManager` | per-session browser-control behavior must remain stable after the structural split |
| DS-004 | Primary End-to-End | renderer focus request for a preview session | authoritative shell snapshot makes the outer `Preview` tab visible and attaches the active `WebContentsView` | `PreviewShellController` | preview projection stays authoritative in Electron main instead of drifting into the renderer |
| DS-005 | Return-Event | shell host registers/reloads/resizes/hides/selects/closes | active native attachment and shell snapshot remain correct | `PreviewShellController` | shell lifecycle changes must not create a second owner of preview state |
| DS-006 | Return-Event | tool-driven or user-driven session close | authoritative invalidation plus outer-tab disappearance when last session closes | `PreviewSessionManager` | cleanup semantics must stay deterministic |
| DS-007 | Bounded Local | canonical preview request enters session owner | registry/lifecycle invariants settle and a session record is opened/reused/closed/listed | `PreviewSessionManager` | the bounded local session spine must become readable again after the split |
| DS-008 | Bounded Local | open/navigate request enters navigation owner | URL load, ready-state waiting, title settlement, and navigation errors are normalized | `PreviewSessionNavigation` | readiness and navigation sequencing are important enough to be explicit instead of hidden inside the session owner blob |
| DS-009 | Bounded Local | read/snapshot/screenshot/JS request enters page-operations owner | page content artifact/result is produced against one existing session view | `PreviewSessionPageOperations` | page/browser operations are a distinct concern around the session owner and were a main source of size drift |
| DS-010 | Bounded Local | raw preview tool result item enters Codex payload parsing | canonical preview result payload is extracted without growing one all-purpose parser | `CodexToolPayloadParser` | preview parsing must be explicit and owned, not embedded in a monolithic parser |

## Primary Execution / Data-Flow Spine(s)

- `Electron startup -> preview runtime -> bridge env injection -> PreviewToolService support decision -> runtime adapter exposure from one preview tool manifest`
- `Agent runtime preview tool call -> runtime adapter -> preview input normalizer -> PreviewToolService -> preview bridge client -> preview bridge server -> PreviewSessionManager -> PreviewSessionNavigation / PreviewSessionPageOperations -> normalized result`
- `Tool success in activity stream -> renderer focus request -> PreviewShellController -> authoritative shell snapshot -> renderer preview store/panel -> active session view attachment`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `PreviewToolService` | shared backend coordination owner | preview support checks, canonical semantic validation, bridge delegation |
| Preview tool manifest | shared tool-surface owner | one authoritative eight-tool definition used by native, Codex, and Claude exposure |
| Runtime adapters | runtime-native exposure boundary | translate the shared preview tool manifest into native/dynamic/MCP definitions |
| Preview bridge server/client | backend-to-shell boundary | authenticated local transport into Electron main |
| `PreviewSessionManager` | session lifecycle owner | preview session identity, registry invariants, reuse/list/close semantics |
| `PreviewSessionNavigation` | navigation/readiness owner | URL normalization, load/wait semantics, title settlement |
| `PreviewSessionPageOperations` | page/browser-operation owner | read-page, DOM snapshot, screenshot, JavaScript execution |
| `PreviewShellController` | shell projection owner | shell host association, active session selection, view attach/detach, snapshot broadcasting |
| Renderer preview store/panel | shell UI projection | snapshot-driven outer Preview tab, internal tabs, bounds reporting |
| `CodexToolPayloadParser` | bounded Codex parsing owner | preview tool argument/result parsing under the Codex adapter path |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | At startup, Electron main starts preview runtime support and seeds the packaged server environment. `PreviewToolService` decides whether preview is supported, and runtime adapters build their exposure from one preview tool manifest instead of duplicating the tool surface. | Electron main, preview runtime, `PreviewToolService`, preview tool manifest, runtime adapters | `PreviewToolService` | env injection, runtime-specific schema rendering |
| DS-002 | An agent calls `open_preview`. The runtime adapter uses the canonical input normalizer, `PreviewToolService` delegates through the bridge, `PreviewSessionManager` creates or reuses a session record, and `PreviewSessionNavigation` settles the ready state before the result returns. | runtime adapter, input normalizer, `PreviewToolService`, bridge, `PreviewSessionManager`, `PreviewSessionNavigation` | `PreviewSessionManager` | view factory, error mapping |
| DS-003 | Follow-up preview tools still flow through the same contract, but once they reach Electron they are delegated to the right owner: lifecycle/list/close stay with `PreviewSessionManager`, navigation stays with `PreviewSessionNavigation`, and read/snapshot/screenshot/JS stay with `PreviewSessionPageOperations`. | runtime adapter, `PreviewToolService`, bridge, session/navigation/page-operation owners | `PreviewSessionManager` | page cleaner, DOM snapshot script, screenshot artifact writer |
| DS-004 | After a successful `open_preview`, the renderer sends a bounded focus request. `PreviewShellController` updates shell projection state, emits the authoritative shell snapshot, and attaches the active native view into the shell host area. | tool lifecycle handler, renderer store/panel, preload bridge, `PreviewShellController` | `PreviewShellController` | host rect measurement, shell-window registry |
| DS-005 | Shell mount/reload, resize, visibility changes, and manual internal-tab selection all flow through the shell projection owner. The renderer stays projection-only and never becomes a second source of preview state. | renderer panel/store, preload bridge, `PreviewShellController` | `PreviewShellController` | hidden-state detach, reconnect bootstrap |
| DS-006 | Tool-driven or user-driven close invalidates the session in `PreviewSessionManager`, updates shell snapshots, and removes the outer Preview tab when the last session disappears. | `PreviewSessionManager`, `PreviewShellController`, renderer store | `PreviewSessionManager` | snapshot fanout, active-session fallback |
| DS-007 | Inside the session owner, one bounded local flow arbitrates registry invariants: create/reuse/list/close and session lookup stay centralized and small. | `PreviewSessionManager` | `PreviewSessionManager` | session types, tombstone retention |
| DS-008 | Inside the navigation owner, open/navigate requests normalize URL and wait semantics so ready-state behavior is explicit rather than hidden in the lifecycle owner. | `PreviewSessionNavigation` | `PreviewSessionNavigation` | load observers, title settlement |
| DS-009 | Inside the page-operations owner, page-reading and inspection requests share one owned browser-operation boundary around a session view. | `PreviewSessionPageOperations` | `PreviewSessionPageOperations` | cleaner, snapshot script, screenshot writer |
| DS-010 | Inside the Codex adapter path, raw tool payloads are parsed by a subject-owned preview/tool payload parser rather than extending the all-purpose item parser. | Codex item converter, `CodexToolPayloadParser` | `CodexToolPayloadParser` | high-level item dispatcher remains separate |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `preview-tool-contract.ts` | canonical tool names, DTOs, error-code vocabulary, env key constants | parsing, semantic validation, schema building, bridge error mapping | contract-only boundary |
| `preview-tool-input-normalizers.ts` | strict snake_case request normalization into canonical DTOs | alias fallback compatibility, runtime-specific tool definitions | clean-cut contract entrypoint |
| `preview-tool-manifest.ts` | one authoritative eight-tool surface: names, descriptions, operation selectors, normalizer bindings | runtime-specific definition duplication, service execution logic | reusable owned structure for adapters |
| `preview-tool-parameter-schemas.ts` | native parameter schema builders derived from the manifest/DTOs | DTO ownership, runtime execution | off-spine schema projection concern |
| `PreviewToolService` | support checks, semantic validation, bridge delegation, shared operation dispatch | shell UI state, native lifecycle, runtime-specific metadata duplication | authoritative server boundary |
| Runtime adapters | native/dynamic/MCP exposure translation | canonical contract ownership, bridge policy, duplicated tool-surface literals | translation only |
| `PreviewSessionManager` | session registry, reuse/list/close, session lookup, session/view identity invariants | navigation/readiness sequencing, page reading, DOM snapshot, screenshots, JS execution | lifecycle owner only |
| `PreviewSessionNavigation` | URL normalization, open/navigate load sequencing, ready-state waiting, title settlement | session registry ownership, shell projection | internal owned sub-layer of preview session boundary |
| `PreviewSessionPageOperations` | read-page, DOM snapshot, screenshot, JS execution against an existing session view | session creation/reuse/close, shell projection | internal owned sub-layer of preview session boundary |
| `PreviewShellController` | shell host identity, active session per shell, attach/detach, bounds sync, shell snapshots | session registry truth, runtime exposure, tool parsing | authoritative shell projection owner |
| `CodexToolPayloadParser` | preview/tool payload parsing for the Codex adapter path | general item classification, shell behavior, preview service policy | subject-oriented adapter concern |

## Canonical Preview Contract (Concrete Example)

The stable preview surface remains eight snake_case tools:

- `open_preview`
- `navigate_preview`
- `close_preview`
- `list_preview_sessions`
- `read_preview_page`
- `capture_preview_screenshot`
- `preview_dom_snapshot`
- `execute_preview_javascript`

### Identity Rule

- `preview_session_id` is an opaque application-owned identifier.
- Follow-up operations use only `preview_session_id`.
- Raw Electron identifiers must never cross the tool boundary.
- Tool input normalization is strict snake_case only in v10. No camelCase or alternate-key fallback is part of the target contract.

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

type ListPreviewSessionsResult = {
  sessions: Array<{
    preview_session_id: string;
    title: string | null;
    url: string;
  }>;
};

type ReadPreviewPageInput = {
  preview_session_id: string;
  cleaning_mode?: 'none' | 'light' | 'thorough';
};

type CapturePreviewScreenshotInput = {
  preview_session_id: string;
  full_page?: boolean;
};

type PreviewDomSnapshotInput = {
  preview_session_id: string;
  include_non_interactive?: boolean;
  include_bounding_boxes?: boolean;
  max_elements?: number;
};

type ExecutePreviewJavascriptInput = {
  preview_session_id: string;
  javascript: string;
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
  | 'preview_page_read_failed'
  | 'preview_dom_snapshot_failed'
  | 'preview_javascript_execution_failed'
  | 'preview_bridge_unavailable';
```

### Session Lifecycle / Shell Projection Rules

- Closing an internal preview tab closes the corresponding preview session.
- When the last preview session closes, the outer `Preview` tab disappears.
- `preview_session_closed` means the ID was previously issued by the owner and later closed.
- `preview_session_not_found` means malformed, never-issued, or already-evicted identity.
- A session can exist before it is projected into a shell host.
- Tool success may trigger a shell focus request, but tool results are not shell-truth themselves.
- The renderer derives visible preview sessions and active preview selection from `PreviewShellController` snapshots only.

## Return / Event Spine(s) (If Applicable)

- `tool result -> renderer focus request -> electronAPI.preview.focusSession -> PreviewShellController snapshot update -> renderer preview store update`
- `renderer mount/reload + bounds/visibility -> electronAPI.preview.registerHost/updateHostRect -> PreviewShellController attach/detach + snapshot update`
- `session close -> PreviewSessionManager invalidation -> PreviewShellController snapshot update -> renderer hides Preview tab when empty`

## Bounded Local / Internal Spines (If Applicable)

### BL-001 — Preview Session Registry Lifecycle

- Parent owner: `PreviewSessionManager`
- Start / end: canonical session operation enters -> registry invariant and session result/error are settled
- Flow:
  - `lookup session -> reuse or create record -> mutate registry/tombstones -> return canonical result or canonical error`
- Why explicit:
  - this is the bounded local spine that was obscured by the oversized `preview-session-manager.ts` file and must become readable again.

### BL-002 — Preview Navigation / Ready-State Settlement

- Parent owner: `PreviewSessionNavigation`
- Start / end: open/navigate request enters -> load/ready/title state settles
- Flow:
  - `normalize URL -> invoke webContents load -> wait for requested ready state -> settle title and navigation result`
- Why explicit:
  - navigation sequencing is a real local spine and should not be hidden inside the session registry owner.

### BL-003 — Preview Page Operation Execution

- Parent owner: `PreviewSessionPageOperations`
- Start / end: read/snapshot/screenshot/JS request enters -> browser-operation result artifact/result_json/content settles
- Flow:
  - `resolve session view -> run cleaner/snapshot/script/capture path -> normalize response -> map domain errors`
- Why explicit:
  - page/browser operations are a coherent off-spine owner around the session owner and were a main source of responsibility overload.

### BL-004 — Shell Attachment Lifecycle

- Parent owner: `PreviewShellController`
- Start / end: shell host event or focus request enters -> attached native preview view matches shell state
- Flow:
  - `resolve shell window -> resolve active session -> attach/detach active view -> apply bounds -> emit snapshot`
- Why explicit:
  - native attachment remains a separate correctness center.

### BL-005 — Codex Tool Payload Parsing

- Parent owner: `CodexToolPayloadParser`
- Start / end: raw preview/tool payload item enters -> canonical preview/tool payload leaves the adapter layer
- Flow:
  - `inspect item type -> parse tool args/result subject -> normalize JSON payload -> return canonical parsed structure`
- Why explicit:
  - Stage 8 found that preview parsing had become hidden inside a mixed parser instead of one clear bounded owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Preview tool manifest | `PreviewToolService`, runtime adapters | one shared eight-tool surface definition | Yes |
| Preview input normalizers | tool entrypoints and runtime adapters | strict DTO normalization at the contract boundary | Yes |
| Preview parameter schema builders | native tool registration path | render parameter schemas from canonical DTO/manifest ownership | Yes |
| Preview bridge server/client | `PreviewToolService`, preview session boundary | authenticated local transport between backend and shell | Yes |
| Preview DOM snapshot script | `PreviewSessionPageOperations` | DOM candidate extraction inside preview pages | Yes |
| Preview page cleaner | `PreviewSessionPageOperations` | cleaned page-read output | Yes |
| Screenshot artifact writer | `PreviewSessionPageOperations` | persisted screenshot output | Yes |
| Shell window registry | `PreviewShellController` | resolve the correct shell host and renderer sink | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Preview tool boundary and shared server coordination | `autobyteus-server-ts/src/agent-tools/preview` | Reuse/Extend | it already owns the preview tool surface and should also own the manifest/normalizer/schema split | N/A |
| Runtime-specific exposure | existing Codex/Claude backend folders | Reuse | still the correct adapter boundaries | N/A |
| Codex event parsing subject split | existing Codex events subsystem | Extend | the parser split belongs in the Codex event layer, not in preview or generic utilities | N/A |
| Main-process preview lifecycle and browser operations | `autobyteus-web/electron/preview` | Reuse/Extend | preview-native behavior still belongs here; it just needs clearer internal owners | N/A |
| Shell host composition | existing `autobyteus-web/electron/shell` | Reuse | shell host/registry ownership already exists and remains the right boundary | N/A |
| Renderer preview panel/store | existing renderer right-panel capability | Reuse | projection-only UI still belongs here | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/preview` | canonical preview contract, strict normalizers, tool manifest, parameter schemas, preview tool service, bridge client, per-tool entrypoints | DS-001, DS-002, DS-003 | `PreviewToolService` | Reuse/Extend | becomes the single preview tool-boundary home |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events` | high-level item parsing plus subject-owned tool payload parsing | DS-010 | `CodexToolPayloadParser` | Extend | split within existing Codex events ownership |
| runtime backend preview folders | runtime-specific exposure builders | DS-001, DS-002, DS-003 | runtime adapters | Reuse | should render from one shared manifest |
| `autobyteus-web/electron/preview` | preview session manager, navigation, page operations, shell controller, bridge server, helper scripts/writers | DS-002, DS-003, DS-004, DS-005, DS-006, DS-007, DS-008, DS-009 | preview owners | Reuse/Extend | clear internal owner files replace oversized blobs |
| `autobyteus-web/electron/shell` | shell-window host and registry | DS-004, DS-005 | shell host | Reuse | no architecture change here |
| renderer preview panel/store | preview tab visibility, internal preview tabs, bounds reporting | DS-004, DS-005, DS-006 | renderer projection boundary | Reuse | projection only |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - runtime adapter -> preview tool manifest / input normalizers / `PreviewToolService`
  - preview tool entrypoint -> input normalizer -> `PreviewToolService`
  - `PreviewToolService` -> preview bridge client -> preview bridge server -> `PreviewSessionManager`
  - `PreviewSessionManager` -> `PreviewSessionNavigation` / `PreviewSessionPageOperations`
  - renderer preview store/panel -> preload preview IPC -> `PreviewShellController` -> `PreviewSessionManager`
  - Codex item event converter -> high-level item payload parser -> `CodexToolPayloadParser`
- Authoritative public entrypoints versus internal owned sub-layers:
  - callers above the server preview boundary use `PreviewToolService`; they do not talk to the bridge client directly.
  - callers above the Electron preview boundary use `PreviewSessionManager`; they do not talk to navigation/page-operation owners directly.
  - runtime exposure builders use the shared preview tool manifest; they do not own local copied tool metadata.
- Forbidden shortcuts:
  - no runtime adapter may hardcode a preview tool surface that diverges from the manifest.
  - no preview tool parser may accept compatibility aliases outside the canonical snake_case contract.
  - no caller above the session owner may call both `PreviewSessionManager` and one of its internal owners.
  - renderer must not own or instantiate `WebContentsView`.
  - Codex preview result parsing must not live inside a generic all-purpose payload blob.
- Boundary bypasses that are not allowed:
  - no separate preview `BrowserWindow` path,
  - no `<webview>` renderer embed,
  - no direct shell-truth reconstruction from tool-result payloads.

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - keep the v9 shell-tab preview architecture, but structurally split the mixed owners so the implementation matches the spine and ownership model.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - complexity: lower long-term than continuing to patch the current oversized owners.
  - testability: each owner gets smaller, sharper responsibilities and clearer regression surfaces.
  - operability: no user-visible behavior change is required; the change is structural and internal.
  - evolution cost: one manifest and one clean contract boundary reduce future preview-tool drift.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Boundary encapsulation assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Split`, `Remove`

### Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Keep the current working code and apply only local line-count trims | smallest short-term delta | keeps mixed owners, duplicated tool surfaces, and alias compatibility behavior | Rejected | functional success alone is not enough after the Stage 8 fail |
| B | Deep rewrite to a brand-new preview subsystem with different public APIs | could maximize greenfield purity | unnecessary churn; no user-visible problem requires a new public model | Rejected | over-scoped for the re-entry |
| C | Preserve the approved v9 behavior but split the oversized owners and remove compatibility/duplication debt | repairs the Stage 8 failures with minimal product churn | still requires coordinated multi-file refactor | Chosen | best fit for the re-entry classification |

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| repeated-structure extraction | preview tool surface | eliminates duplicated Codex/Claude tool definitions | preview tool manifest | one owned surface |
| contract/input split | preview server boundary | keeps canonical contract clean while still giving one parser owner | preview contract + input normalizers | removes alias fallback |
| bounded local spine extraction | Electron preview owners | keeps lifecycle, navigation, and page operations readable | session/navigation/page-operation owners | addresses Stage 8 spine failure |
| subject-oriented parser split | Codex events | stops preview tool parsing from bloating a generic parser | `CodexToolPayloadParser` | adapter concern only |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | runtime exposure currently duplicates the same tool surface | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | Yes | current contract, session manager, and Codex parser are overloaded | Split |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | manifest, normalizers, navigation, page operations each own a real concern | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | manifest/normalizers/schema builders/cleaners/scripts all serve named owners | Keep |
| Authoritative public boundaries stay authoritative; callers do not depend on both an outer owner and one of its internal owned mechanisms | Yes | session manager stays the public Electron preview boundary; service stays the public server preview boundary | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | all new structure stays under existing preview/Codex/shell ownership | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | preview tool surface becomes one manifest | Extract |
| Current structure can remain unchanged without spine/ownership degradation | No | Stage 8 already proved the current shape degrades the bounded local spine and naming alignment | Change |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | same path | reduce to contract-only ownership: canonical names, DTOs, error codes, env keys | server preview boundary | no parsing or schemas remain here |
| C-002 | Add | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-normalizers.ts` | strict snake_case input normalization for all eight tools | server preview boundary | no compatibility aliases |
| C-003 | Add | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-manifest.ts` | one owned eight-tool surface reused by native/Codex/Claude | server preview boundary | resolves adapter duplication |
| C-004 | Add | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-parameter-schemas.ts` | native parameter schema projection separate from DTO ownership | server preview boundary | off-spine concern |
| C-005 | Modify | runtime preview adapter builders | same paths | render runtime-specific definitions from the shared preview tool manifest | Codex/Claude preview adapters | remove duplicated literals and dispatch tables |
| C-006 | Add | N/A | `autobyteus-web/electron/preview/preview-session-types.ts` | preview session record/types/selectors in one owned file | Electron preview boundary | tight shared structure |
| C-007 | Modify | `autobyteus-web/electron/preview/preview-session-manager.ts` | same path | narrow to registry/lifecycle/reuse/list/close/view lookup only | Electron preview boundary | stay under hard limit |
| C-008 | Add | N/A | `autobyteus-web/electron/preview/preview-session-navigation.ts` | open/navigate load sequencing, ready-state wait, title settlement | Electron preview boundary | bounded local spine owner |
| C-009 | Add | N/A | `autobyteus-web/electron/preview/preview-session-page-operations.ts` | read page, DOM snapshot, screenshot, and JS execution | Electron preview boundary | bounded local spine owner |
| C-010 | Modify | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | same path | shrink to high-level item coordination | Codex events | delegates subject parsing |
| C-011 | Add | N/A | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` | tool argument/result parsing for Codex, including preview tool result decoding | Codex events | explicit preview/tool parsing owner |
| C-012 | Add | N/A | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-payload-parser.ts` | reasoning/web-search subject parsing split out of the generic parser | Codex events | keeps coordinator small enough |
| C-013 | Remove | compatibility alias parsing branches | N/A | no-backward-compat rule for the stable preview contract | server preview boundary | clean-cut target |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| alias-based preview input parsing | stable snake_case preview contract is already approved | `preview-tool-input-normalizers.ts` strict parsing | In This Change | remove camelCase and alternate keys |
| duplicated runtime preview tool definitions | one shared preview tool manifest now owns the surface | `preview-tool-manifest.ts` | In This Change | Codex and Claude render from it |
| parsing/schema/error logic inside `preview-tool-contract.ts` | contract-only boundary is clearer and smaller | input normalizers / parameter schemas / bridge client error mapping | In This Change | contract file becomes semantically honest |
| page/browser operations inside `preview-session-manager.ts` | lifecycle owner should not absorb browser operations | `preview-session-page-operations.ts` | In This Change | restores bounded local session spine clarity |
| navigation/readiness sequencing inside `preview-session-manager.ts` | load/wait sequencing is a distinct concern | `preview-session-navigation.ts` | In This Change | separates BL-007 and BL-008 concerns |
| preview/tool parsing inside the monolithic Codex payload parser | subject parsing needs a clear owner | `codex-tool-payload-parser.ts` | In This Change | explicit Stage 8 response |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `preview-tool-contract.ts` | server preview boundary | contract boundary | canonical names, DTOs, error vocabulary | one contract source | Yes |
| `preview-tool-input-normalizers.ts` | server preview boundary | normalizer boundary | strict request normalization | one normalization owner | Yes |
| `preview-tool-manifest.ts` | server preview boundary | tool-surface owner | eight-tool catalog and dispatch metadata | one reusable structure | Yes |
| `preview-tool-parameter-schemas.ts` | server preview boundary | schema projection concern | `ParameterSchema` building | one schema concern | Yes |
| `preview-session-manager.ts` | Electron preview boundary | lifecycle owner | session registry/lifecycle only | one lifecycle owner | Yes |
| `preview-session-navigation.ts` | Electron preview boundary | navigation owner | open/navigate load sequencing | one navigation concern | Yes |
| `preview-session-page-operations.ts` | Electron preview boundary | page-operations owner | read/snapshot/screenshot/JS | one browser-operation concern | Yes |
| `codex-tool-payload-parser.ts` | Codex events | subject parser | tool/result parsing | one subject parser | No |
| `codex-reasoning-payload-parser.ts` | Codex events | subject parser | reasoning/web-search parsing | one subject parser | No |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| preview tool names/descriptions/operation selectors | `preview-tool-manifest.ts` | server preview boundary | used by native tool registration plus Codex and Claude exposure | Yes | Yes | a new runtime-specific abstraction blob |
| preview session record shape and selectors | `preview-session-types.ts` | Electron preview boundary | used by lifecycle/navigation/page-operation owners | Yes | Yes | a kitchen-sink utility file |
| preview DOM snapshot/page cleaning helpers | existing helper files | Electron preview boundary | already distinct and specific | Yes | Yes | a generic helper bucket |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| preview contract DTOs | Yes | Yes | Low | Yes | keep contract file DTO-only |
| preview tool manifest entries | Yes | Yes | Low | Yes | keep runtime-specific rendering outside the manifest |
| preview session record / types | Yes | Yes | Medium | Yes | keep view/browser-operation outputs outside the session record |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | server preview boundary | contract boundary | canonical tool names, DTOs, error codes, env keys | one clean contract source | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-normalizers.ts` | server preview boundary | input boundary | strict snake_case parsing for all eight tools | one parsing owner | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-manifest.ts` | server preview boundary | shared surface owner | one eight-tool manifest reused by native/Codex/Claude | one reusable structure | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-parameter-schemas.ts` | server preview boundary | schema concern | native parameter schemas | one projection concern | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | server preview boundary | service boundary | capability gating, semantic validation, bridge delegation | one authoritative service | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Codex events | coordinator | high-level item payload coordination only | one coordinator | No |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` | Codex events | subject parser | tool argument/result parsing | one subject parser | No |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-payload-parser.ts` | Codex events | subject parser | reasoning/web-search parsing | one subject parser | No |
| `autobyteus-web/electron/preview/preview-session-types.ts` | Electron preview boundary | shared types owner | session record and selectors | one tight shared structure | Yes |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | Electron preview boundary | lifecycle owner | session registry/lifecycle/reuse/list/close/view lookup | one lifecycle owner | Yes |
| `autobyteus-web/electron/preview/preview-session-navigation.ts` | Electron preview boundary | navigation owner | load and ready-state sequencing | one navigation concern | Yes |
| `autobyteus-web/electron/preview/preview-session-page-operations.ts` | Electron preview boundary | page-operations owner | read page, DOM snapshot, screenshot, JS execution | one browser-operation concern | Yes |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | Electron preview boundary | shell projection owner | active preview attachment and shell snapshots | one projection owner | Yes |
| `autobyteus-web/components/workspace/tools/PreviewPanel.vue` | renderer shell UI | panel boundary | internal preview tabs and native-host rect measurement | one panel | Yes |
| `autobyteus-web/stores/previewShellStore.ts` | renderer shell UI | projection store | preview shell snapshots and user focus/close requests | one store | Yes |

## Derived Implementation Mapping (Secondary)

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `preview-tool-contract.ts` | Modify | DS-001, DS-002, DS-003 | contract boundary | canonical preview names and DTOs only | DTOs, error codes, env keys | strip mixed concerns |
| `preview-tool-input-normalizers.ts` | Add | DS-002, DS-003 | off-spine input concern | strict DTO parsing | `parseOpenPreviewInput`, etc. | no aliases |
| `preview-tool-manifest.ts` | Add | DS-001, DS-002, DS-003 | off-spine reusable structure | one eight-tool surface | manifest entries keyed by tool name | removes duplication |
| runtime adapter builder files | Modify | DS-001, DS-002, DS-003 | runtime adapters | render runtime-specific definitions from the manifest | native/dynamic/MCP builders | no hardcoded duplicate surface |
| `preview-session-manager.ts` | Modify | DS-002, DS-003, DS-006, DS-007 | lifecycle owner | registry/lifecycle only | open/list/close/reuse/session lookup | delegates navigation/page ops |
| `preview-session-navigation.ts` | Add | DS-002, DS-008 | internal owner | load/wait/title sequencing | `openSessionView`, `navigateSession` | explicit bounded local spine |
| `preview-session-page-operations.ts` | Add | DS-003, DS-009 | internal owner | read/snapshot/screenshot/JS | `readPage`, `captureDomSnapshot`, `captureScreenshot`, `executeJavascript` | explicit bounded local spine |
| `codex-item-event-payload-parser.ts` | Modify | DS-010 | coordinator | route raw payloads to subject parsers | item classification | shrink below hard limit |
| `codex-tool-payload-parser.ts` | Add | DS-010 | subject parser | tool args/results including preview result payloads | `parseToolResultPayload` | explicit preview parse owner |
| `codex-reasoning-payload-parser.ts` | Add | DS-010 | subject parser | reasoning/web-search parsing | reasoning parse helpers | keeps coordinator small |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| preview contract file | `agent-tools/preview/preview-tool-contract.ts` | same path | preview tool contract boundary | Yes | Low | Split | keep path, narrow concern |
| preview tool definitions duplicated in runtime adapters | runtime-specific builder files | same files + shared manifest | runtime translation around one preview surface | Yes | Low | Promote Shared | manifest belongs in `agent-tools/preview` |
| session owner blob | `electron/preview/preview-session-manager.ts` | same path + new sibling files | Electron preview lifecycle boundary | Yes | Low | Split | keep subsystem placement, repair ownership |
| Codex payload parser blob | `codex/events/codex-item-event-payload-parser.ts` | same path + new sibling subject parsers | Codex event parsing | Yes | Low | Split | subject split belongs in same subsystem |
| renderer preview panel/store | same paths | same paths | renderer projection | Yes | Low | Keep | not the Stage 8 problem |

Rules:
- The design is invalid if `preview-tool-contract.ts` again becomes a mixed contract/normalizer/schema/error file.
- The design is invalid if callers above `PreviewSessionManager` depend directly on `PreviewSessionNavigation` or `PreviewSessionPageOperations`.
- The design is invalid if runtime adapters keep their own copied preview tool surface instead of rendering from the shared manifest.
- The design is invalid if preview input parsing keeps alias compatibility behavior after the v10 clean-cut contract change.
