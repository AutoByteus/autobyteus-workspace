# Proposed Design Document

## Design Version

- Current Version: `v6`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Captured ownership direction, runtime adapter idea, and MVP tool contract, but did not organize the design around an explicit spine inventory | Pre-template-compliance |
| v2 | Stage 5 `Design Impact` re-entry | Rewrote the artifact to be spine-first and template-complete, with explicit data-flow spine inventory, spine narratives, return/event spines, bounded local spine, subsystem reuse, and file placement checks | Round 1 |
| v3 | Stage 5 `Design Impact` re-entry after principles-based self-review | Narrowed v1 by removing preview-specific renderer projection/store work, introduced one backend `PreviewToolService` as the shared owner for capability gating and semantic normalization, and rewired the spine/call-stack basis around that owner | Round 4 |
| v4 | Stage 5 `Design Impact` re-entry after another deep review | Added explicit canonical preview contract examples, tightened the adapter-to-service boundary so runtime adapters translate into canonical shapes before calling `PreviewToolService`, added direct MCP-fit evaluation, and corrected the backend capability-area rationale to reflect a new backend preview-shell boundary | Round 7 |
| v5 | Stage 5 `Design Impact` re-entry after deeper contract review | Narrowed `wait_until` to Electron-grounded v1 semantics and made `preview_session_closed` versus `preview_session_not_found` lifecycle rules explicit in the canonical contract and bounded local spine | Round 10 |
| v6 | Stage 5 `Design Impact` re-entry after file-placement review | Moved preview-specific contract and shared server-side preview coordination into `autobyteus-server-ts/src/agent-tools/preview`, removed the generic backend `desktop-shell` boundary, and kept preview semantics out of `autobyteus-ts` because the feature only exists with Electron shell support | Round 13 |

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

Add a reusable preview-session capability for the local packaged Electron app by making Electron main the authoritative preview owner, exposing that owner to the backend through one local authenticated preview bridge, and adapting the same session-oriented contract into all three supported runtime kinds.

The design is intentionally narrow in v1:

- one opaque `preview_session_id`
- one dedicated preview window per session
- one shared contract for `open`, `navigate`, `capture screenshot`, `get console logs`, and `close`
- Electron-grounded wait semantics only in v1: `domcontentloaded` or `load`
- one server-side preview tool subsystem under `agent-tools/preview` that owns the preview tool contract, `PreviewToolService`, bridge client, and native runtime preview tool handlers
- runtime-specific exposure differences only at the adapter boundary
- deterministic post-close error semantics owned by `PreviewSessionManager`
- no preview-specific renderer store or IPC surface in v1; renderer visibility comes from the existing tool-result/activity stream

## Goal / Intended Change

The current app lets agents run backend processes, including frontend dev servers, but it does not give agents a first-class preview surface for frontend verification. The intended change is to add a reusable preview capability that:

- works with `autobyteus`, `codex_app_server`, and `claude_agent_sdk`,
- keeps session lifecycle ownership explicit,
- avoids frontend event sprawl,
- avoids runtime-specific semantic drift,
- remains narrow enough that it does not turn the Electron shell into a browser platform rewrite.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Preview is net-new, so there is no existing preview-specific legacy behavior to preserve.
- The implementation must not introduce compatibility wrappers, dual ownership of preview sessions, or fallback branches that keep both a renderer-owned and Electron-main-owned preview lifecycle.
- Existing shell node windows remain shell-only; preview must not be added by retrofitting preview navigation into the current node-bound window helper.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Session-oriented preview contract | AC-002 | stable `preview_session_id` contract | UC-002, UC-003, UC-004, UC-005 |
| R-002 | Shared multi-runtime abstraction | AC-003, AC-008 | same preview core reused across three runtimes | UC-001, UC-002, UC-003, UC-004 |
| R-003 | Clear ownership boundary | AC-001 | authoritative owner and layer boundaries are explicit | UC-001, UC-006, UC-007 |
| R-004 | Minimal event surface | AC-004 | renderer relies on the existing tool-result/activity path in v1 | UC-006 |
| R-005 | UI complexity control | AC-004, AC-006 | dedicated preview window for v1, no dynamic outer tabs | UC-001, UC-006 |
| R-006 | Tool exposure strategy | AC-003, AC-005, AC-008 | layered internal service plus runtime-native adapters | UC-001, UC-002, UC-003, UC-004 |
| R-007 | Session cleanup semantics | AC-001, AC-002 | close and lookup-failure semantics are authoritative | UC-005, UC-006, UC-007 |
| R-008 | Scope discipline | AC-006 | narrow MVP tool set only | UC-002, UC-005 |
| R-009 | Session contract parity across adapters | AC-002, AC-008 | same semantic contract across runtime adapters | UC-002, UC-003, UC-004, UC-005 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Agent execution already splits by runtime kind, but there is no preview spine yet | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | none material |
| Current Ownership Boundaries | Electron main already owns native windows and shell IPC; renderer is projection-oriented for existing shell state | `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/preload.ts` | none material |
| Current Coupling / Fragmentation Problems | Codex, Claude, and native runtime expose tools through different mechanisms; a preview feature added directly to one of them would fragment immediately | Codex dynamic tool files, Claude MCP assembly files, native tool registry files from investigation notes | none material |
| Existing Constraints / Compatibility Facts | right-side tabs are static; current node-bound window helper blocks navigation and popups; tool results already allow arbitrary result payloads | `autobyteus-web/composables/useRightSideTabs.ts`, `autobyteus-web/components/layout/RightSideTabs.vue`, `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | none material |
| Relevant Files / Components | existing shell window ownership, server spawn env injection, runtime adapters, tool registries, and activity store all form the real design boundary set | investigation notes source log | none material |

## Current State (As-Is)

- The server backend supports `autobyteus`, `codex_app_server`, and `claude_agent_sdk`.
- `autobyteus` gets tools from the shared tool registry.
- `codex_app_server` gets optional dynamic tools during thread bootstrap.
- `claude_agent_sdk` can receive SDK-local MCP servers during session execution.
- Electron main owns native windows and shell IPC.
- Renderer right-side tabs are static and not suitable for one-preview-per-tab expansion.
- No preview-session owner, bridge, tool contract, or cleanup model exists.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | packaged app startup | runtime-specific preview tool exposure decision | `PreviewToolService` | preview tools must only appear when the local shell owner is actually available, and that shared decision must not be duplicated across runtime adapters |
| DS-002 | Primary End-to-End | agent preview open request | tool result containing `preview_session_id` | `PreviewSessionManager` | this is the main value spine: create/focus preview and return a stable session handle |
| DS-003 | Primary End-to-End | agent follow-up preview tool call with `preview_session_id` | normalized result for screenshot/navigation/logs/close | `PreviewSessionManager` | follow-up operations must preserve one shared contract across all adapters |
| DS-004 | Return-Event | native preview lifecycle event | authoritative session invalidation and later lookup semantics | `PreviewSessionManager` | async native close/failure must invalidate session truth without adding unnecessary renderer-specific state or events in v1 |
| DS-005 | Bounded Local | bridge command or native preview event enters session owner | session registry invariants, native action, and result/error state are settled | `PreviewSessionManager` | internal lifecycle rules materially shape correctness and must not be left implicit |

Rule:
- The bounded local spine is explicit because preview correctness depends on one owner reconciling bridge commands, native events, and session state transitions.

## Primary Execution / Data-Flow Spine(s)

- `Electron app startup -> preview bridge config injection -> internal server environment -> PreviewToolService support check -> runtime adapter exposure decision`
- `Agent runtime tool call -> runtime adapter -> PreviewToolService -> preview bridge client -> preview bridge server -> PreviewSessionManager -> preview window/webContents -> PreviewSessionManager result -> PreviewToolService normalized result -> tool result`
- `Agent follow-up preview tool call -> runtime adapter -> PreviewToolService -> preview bridge client -> PreviewSessionManager session lookup -> native action -> PreviewToolService normalized result`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| Electron main preview subsystem | authoritative shell owner | native lifecycle, invariants, preview availability |
| `PreviewToolService` | shared backend coordination owner | support checks, semantic validation on canonical inputs, and shared delegation into the shell boundary |
| Runtime adapter | runtime-native exposure boundary | translate one semantic contract into registry/dynamic/MCP tool surfaces |
| Preview bridge client | backend boundary client | normalized requests from tools to local shell owner |
| Preview bridge server | shell boundary server | authenticated local translation into preview owner commands |
| `PreviewSessionManager` | governing owner | session registry, lifecycle, state transitions, cleanup, result normalization |
| Preview window/webContents | native preview surface | actual page loading, capture, logs, close events |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | At app startup, Electron main creates bridge configuration and injects it into the packaged internal server environment. `PreviewToolService` reads that support context, and runtime bootstraps ask it whether preview tools should be exposed. | Electron main preview subsystem, `PreviewToolService`, runtime adapters | `PreviewToolService` | env injection, runtime bootstrap translation |
| DS-002 | An agent asks to open a preview. The runtime-specific adapter translates the tool payload into the canonical preview contract and calls `PreviewToolService`, which checks support, applies semantic validation on the canonical input, and delegates through the shared bridge client to the Electron bridge server. `PreviewSessionManager` creates or reuses a preview session, waits only on Electron-grounded readiness semantics (`domcontentloaded` or `load`), binds it to a preview window, and returns a normalized result containing `preview_session_id`. | runtime adapter, `PreviewToolService`, preview bridge client, preview bridge server, `PreviewSessionManager`, preview window | `PreviewSessionManager` | window factory, console capture attachment, screenshot path policy |
| DS-003 | An agent later uses the same `preview_session_id` for navigation, screenshot capture, log retrieval, or close. The runtime-specific adapter still differs only at the boundary, while `PreviewToolService` preserves semantic validation on canonical inputs, transport delegation, and result semantics before returning the normalized contract. The owner returns `preview_session_closed` for previously issued sessions that have been closed and reserves `preview_session_not_found` for malformed or never-issued identities. | runtime adapter, `PreviewToolService`, preview bridge client, `PreviewSessionManager` | `PreviewSessionManager` | artifact writer, log buffering, error normalization |
| DS-004 | Native preview lifecycle changes, especially close/failure, flow back from Electron into `PreviewSessionManager`, which invalidates authoritative session truth. Existing tool-result events stay unchanged, and v1 adds no preview-specific renderer projection channel. | preview window/webContents, `PreviewSessionManager` | `PreviewSessionManager` | native event attachment, lookup-failure semantics |
| DS-005 | Inside the session owner, one bounded local flow arbitrates bridge commands and native callbacks. It creates, looks up, mutates, invalidates, and settles preview session state while preserving invariants about session existence and session/native binding before returning results or errors. | `PreviewSessionManager` | `PreviewSessionManager` | state transition logic, invariant enforcement |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| Electron main preview subsystem | preview availability, bridge server lifecycle, native preview subsystem startup/shutdown | runtime-specific tool registration semantics | top-level shell owner |
| `PreviewSessionManager` | session registry, session IDs, lifecycle invariants, native binding, cleanup semantics, result normalization | runtime bootstrap policy, renderer UI layout | concrete authoritative owner |
| Preview window factory | isolated preview window construction | session registry or adapter semantics | off-spine constructor concern |
| Preview bridge server | authenticated local request boundary into shell owner | preview business policy beyond request translation and boundary validation | boundary only |
| Preview bridge client | normalized local client for backend tools | session truth or runtime-specific semantics | shared backend-side adapter dependency |
| `PreviewToolService` | support checks, semantic validation on canonical inputs, bridge delegation, shared result/error normalization | native lifecycle, session truth, runtime-specific payload parsing, or tool registration semantics | backend shared coordination owner |
| Runtime adapters | runtime-native exposure mechanism and translation from runtime call payloads into canonical preview tool contract shapes | preview lifecycle, session truth, or divergent semantic contracts | one adapter per runtime path |
| Preview tool contract module | tool names, canonical schemas, parsers/validators, and error codes | runtime behavior or shell lifecycle | reusable owned structure inside the server-side preview tool subsystem |

## Canonical Preview Contract (Concrete Example)

The preview tool contract is application-owned and canonical across all runtimes, but it remains server-side because this feature only exists when the Electron shell is present. Adapters may differ in exposure style, but they must all produce and consume these same shapes.

### Identity Rule

- `preview_session_id` is an opaque application-owned identifier.
- Follow-up operations must accept `preview_session_id` as the only session identity.
- Raw Electron identifiers such as `BrowserWindow` IDs or `webContents.id` must never cross the runtime/tool boundary.
- `preview_session_id` values are never reused within one `PreviewSessionManager` lifetime.

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

type NavigatePreviewResult = {
  preview_session_id: string;
  status: 'navigated';
  url: string;
};

type CapturePreviewScreenshotInput = {
  preview_session_id: string;
  full_page?: boolean;
};

type CapturePreviewScreenshotResult = {
  preview_session_id: string;
  artifact_path: string;
  mime_type: 'image/png';
};

type GetPreviewConsoleLogsInput = {
  preview_session_id: string;
  since_sequence?: number | null;
};

type PreviewConsoleLogEntry = {
  sequence: number;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp_iso: string;
};

type GetPreviewConsoleLogsResult = {
  preview_session_id: string;
  entries: PreviewConsoleLogEntry[];
  next_sequence: number;
};

type ClosePreviewInput = {
  preview_session_id: string;
};

type ClosePreviewResult = {
  preview_session_id: string;
  status: 'closed';
};
```

### Normalized Error Vocabulary

```ts
type PreviewErrorCode =
  | 'preview_unsupported_in_current_environment'
  | 'preview_session_closed'
  | 'preview_session_not_found'
  | 'preview_navigation_failed'
  | 'preview_bridge_unavailable';
```

### Session Lifecycle / Error Rules

- `preview_session_closed` means the `preview_session_id` was previously issued by the current `PreviewSessionManager` and was later closed explicitly or by a native window lifecycle event.
- `PreviewSessionManager` keeps a lightweight closed-session tombstone so follow-up operations after close resolve deterministically to `preview_session_closed` instead of degrading into an ambiguous lookup miss.
- `preview_session_not_found` means the provided `preview_session_id` was malformed or was never issued by the current owner.
- Because IDs are never reused, a session ID that has once resolved to `preview_session_closed` must never later resolve to an active session.

### Good-Shape Example

```json
{
  "tool": "open_preview",
  "input": {
    "url": "http://localhost:3000",
    "reuse_existing": true,
    "wait_until": "load"
  },
  "result": {
    "preview_session_id": "preview_sess_01JZ8W8G6WQ7D3P4K3P1V6P2A9",
    "status": "opened",
    "url": "http://localhost:3000",
    "title": "Local Frontend"
  }
}
```

### Translation Rule

- Runtime adapters parse runtime-native tool payloads into these canonical input shapes before calling `PreviewToolService`.
- `PreviewToolService` accepts canonical inputs, not runtime-specific raw payloads.
- Bridge client/server and `PreviewSessionManager` preserve these canonical identities/results and may only add transport-local metadata internally.

## Return / Event Spine(s) (If Applicable)

- `Preview window/webContents event -> PreviewSessionManager -> authoritative session invalidation`
- `Preview tool result -> existing tool lifecycle stream -> renderer activity store`

The first line is new and preview-specific, and it deliberately stops at authoritative owner state in v1. The second line deliberately reuses the existing tool-result path so renderer visibility comes from normal activity UI rather than a new preview IPC/store surface.

## Bounded Local / Internal Spines (If Applicable)

### DS-005 — Preview Session Owner Internal Lifecycle Spine

- Parent owner: `PreviewSessionManager`
- Start: bridge command or native preview window event
- End: session registry invariants, native action, and result/error state are settled
- Arrow chain:
  - `bridge/native input -> normalize request/event -> resolve or create session record -> apply native action or invalidation -> update session state -> build result/error semantics`
- Why it must be explicit:
  - this owner is the correctness center;
  - it arbitrates open/reuse/lookup/close semantics;
  - it enforces `preview_session_id` validity;
  - it retains closed-session tombstones so later lookups fail deterministically with `preview_session_closed` for previously issued closed IDs and `preview_session_not_found` for malformed or never-issued IDs.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Preview window factory | `PreviewSessionManager` | create isolated preview windows with the correct Electron security defaults | Yes |
| Preview console log buffer | `PreviewSessionManager` | collect, sequence, and return console-log entries per session | Yes |
| Preview screenshot artifact writer | `PreviewSessionManager` | persist captured page images to managed artifact/temp paths | Yes |
| Preview bridge client | `PreviewToolService` | perform authenticated local transport to the Electron shell owner | Yes |
| Preview tool contract module | runtime adapters, `PreviewToolService`, and bridge client/server | keep canonical request/response/error semantics tight and provide shared parsers/validators for canonical shapes | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| native window and shell lifecycle ownership | `autobyteus-web/electron` | Extend | preview is a shell/native responsibility | not new, just a new owned preview area inside Electron shell |
| internal server process env injection | Electron server manager/base server env building | Extend | bridge config should follow the same packaged-server startup path | not new |
| native runtime tool exposure | shared local tool registry | Extend | `autobyteus` already exposes tools this way | not new |
| Codex runtime tool exposure | existing Codex dynamic tool bootstrap | Extend | preview should reuse the existing dynamic tool channel | not new |
| Claude runtime tool exposure | existing Claude SDK-local MCP assembly | Extend | preview should reuse Claude's current runtime-native MCP path | not new |
| preview lifecycle owner | none | Create New | no existing preview-specific owner exists | shell node-window helper is shell-only and blocks navigation by design |
| server-side preview tool coordination and contract | `autobyteus-server-ts/src/agent-tools` | Extend | preview tool semantics, canonical preview schemas, and shared bridge delegation all belong to the server tool layer that already owns tool-facing behavior | a generic backend shell boundary would be broader than the actual concern, and `autobyteus-ts` should not own Electron-only preview semantics |
| renderer visibility for preview actions | existing tool-result activity stream | Reuse | v1 can show preview outcomes through existing activity UI without a preview-specific store or IPC path | a dedicated preview renderer subsystem would be premature in v1 |
| preview-specific request/response schemas | `autobyteus-server-ts/src/agent-tools` | Extend | the schemas are preview-tool-specific and shared only by server-side runtime adapters and the local bridge boundary | promoting them into `autobyteus-ts` would incorrectly imply the feature exists outside the Electron-backed server environment |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron preview subsystem (`autobyteus-web/electron/preview`) | preview session lifecycle, native preview surfaces, and bridge server | DS-001, DS-002, DS-003, DS-004, DS-005 | Electron main preview subsystem, `PreviewSessionManager` | Create New inside existing Electron shell | new capability area under existing shell |
| Server-side preview tool subsystem (`autobyteus-server-ts/src/agent-tools/preview`) | canonical preview tool contract, `PreviewToolService`, bridge client, and native runtime preview tools | DS-001, DS-002, DS-003 | `PreviewToolService`, native runtime adapter | Extend existing agent-tooling subsystem | server tool ownership for all preview-specific non-native concerns |
| Codex preview adapter (`autobyteus-server-ts/src/agent-execution/backends/codex/preview`) | dynamic tool registrations and Codex result serialization | DS-001, DS-002, DS-003 | Codex runtime adapter | Create New inside existing Codex backend | adapter only, no session ownership |
| Claude preview adapter (`autobyteus-server-ts/src/agent-execution/backends/claude/preview`) | preview MCP tool definitions and run-level MCP server merge support | DS-001, DS-002, DS-003 | Claude runtime adapter | Create New inside existing Claude backend | adapter only, no session ownership |
| Existing renderer activity projection (`autobyteus-web/services/agentStreaming` + `autobyteus-web/stores/agentActivityStore.ts`) | user-visible tool results for preview actions | DS-002, DS-003 | renderer shell | Reuse | no preview-specific store added in v1 |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - runtime adapters -> preview tool contract -> `PreviewToolService` -> preview bridge client -> preview bridge server -> `PreviewSessionManager` -> preview window factory/native Electron
  - `PreviewToolService` / preview bridge client / preview bridge server -> preview tool contract
  - preview console/screenshot support files -> `PreviewSessionManager`
  - renderer activity store -> existing tool lifecycle stream
- Forbidden shortcuts:
  - runtime adapters directly calling preview bridge client, Electron IPC, or renderer APIs
  - `PreviewToolService` accepting runtime-specific raw tool payloads instead of canonical preview contract shapes
  - adding a preview-specific renderer store or preload IPC path in v1
  - MCP server state owning preview sessions
  - preview code reusing the current shell node-window helper for navigable preview pages
  - one runtime adapter defining different preview result semantics from the shared contract
- Temporary exceptions and removal plan:
  - none planned; Codex text-result serialization is an adapter translation, not a semantic exception

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - `Electron-main-owned preview subsystem + server-side preview tool subsystem + local authenticated bridge + runtime-native adapters over one canonical preview tool contract`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - complexity stays centralized at the correct native owner;
  - testability improves because the contract and owner are explicit;
  - operability is better because bridge availability and session ownership are inspectable;
  - evolution cost stays bounded because the UI surface can change later without changing session semantics.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`
- Note:
  - the new capability is additive, but it is intentionally designed to avoid future dual-path cleanup by making ownership and adapters explicit now.

## MCP Fit Evaluation

| Question | Decision | Rationale |
| --- | --- | --- |
| Should MCP be the source of truth for preview sessions? | No | session lifecycle belongs to Electron main and must not migrate into an adapter protocol surface |
| Is MCP appropriate anywhere in the design? | Yes, as a Claude runtime adapter surface only | Claude already consumes run-level MCP servers, so MCP is the correct exposure mechanism at that boundary |
| Where does the MCP boundary sit? | outside `PreviewToolService` and outside `PreviewSessionManager` | MCP translates runtime-facing tool calls into the canonical preview tool contract; it does not own lifecycle truth |
| What complexity does MCP add? | one extra protocol adapter for Claude only | the layered approach keeps MCP optional and bounded instead of forcing all runtimes through it |

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Small explicit spine inventory | whole design basis | prevents adapter-specific fragments from becoming the architecture story | all spines | required by workflow and useful here |
| Adapter pattern | runtime-specific preview exposure | runtime differences are real but must stay at the boundary | runtime adapters | matches current Codex and Claude integration styles |
| Repeated coordination trigger | server-side preview tool subsystem | shared capability gating and semantic normalization should not repeat across adapters | `PreviewToolService` | real policy owner, not passthrough |
| Example-clarity trigger | canonical preview contract section | concrete contract shapes remove ambiguity at the adapter, service, and bridge boundaries | preview tool contract | names alone were under-specified |
| Registry reuse | `autobyteus` tool path | avoids inventing another native runtime exposure mechanism | native runtime adapter | existing capability reuse |
| Bounded local spine | `PreviewSessionManager` | makes session invariants and result/error semantics explicit | `PreviewSessionManager` | avoids hidden state-machine behavior |
| Clean omission of non-essential renderer work | renderer integration strategy | dedicated preview windows plus existing activity UI satisfy v1 without new preview IPC/store work | existing renderer activity projection | avoids premature UI/event sprawl |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | support gating and semantic normalization would otherwise repeat across all runtime adapters | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | Yes | Electron main alone would become too mixed if preview owner, bridge, and window construction all stayed inline | Split |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | `PreviewToolService` owns support checks plus semantic/result normalization; bridge client/server and runtime adapters are real boundary translations | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | all support files serve Electron main or `PreviewSessionManager` | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | `agent-tools`, Codex dynamic tools, Claude MCP assembly, Electron shell ownership, and existing renderer activity stream were reused or extended at their natural boundaries | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | preview tool contract and error codes | Extract |
| Current structure can remain unchanged without spine/ownership degradation | No | preview has no existing owner; leaving it implicit would fragment immediately | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Electron main owns preview sessions; backend uses local bridge; runtimes use thin adapters | one owner, clean semantics, runtime reuse, future UI flexibility | adds one local boundary | Chosen | best spine and ownership fit |
| B | each runtime implements preview integration separately and opens UI through ad hoc renderer events | fewer shared abstractions up front | semantics drift, messy event model, duplicate lifecycle logic, poor rollback story | Rejected | fails spine and ownership clarity |
| C | renderer owns preview sessions and backend pushes UI events directly | easy to prototype UI | wrong owner for native lifecycle, stale-state risk, incompatible with shell truth | Rejected | violates ownership clarity |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-web/electron/preview/preview-session-manager.ts` | create authoritative preview owner | Electron shell | governing owner |
| C-002 | Add | N/A | `autobyteus-web/electron/preview/preview-window-factory.ts` | isolate preview window construction | Electron shell | off-spine support |
| C-003 | Add | N/A | `autobyteus-web/electron/preview/preview-bridge-server.ts` | provide local shell boundary | Electron shell + backend | authenticated local boundary |
| C-004 | Modify | `autobyteus-web/electron/main.ts` | same path | wire preview startup/shutdown and bridge env injection | Electron shell | shell integration |
| C-005 | Add | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | centralize preview-specific schemas and names inside the server tool layer | server-side preview tool subsystem | reusable owned structure |
| C-006 | Add | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | own support gating, semantic validation on canonical inputs, result/error normalization, and shared bridge delegation | server-side preview tool subsystem | repeated-coordination owner |
| C-007 | Add | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | normalized backend bridge client | server-side preview tool subsystem | transport boundary |
| C-008 | Add | N/A | `autobyteus-server-ts/src/agent-tools/preview/*.ts` | native runtime preview tools and registration entrypoints | server-side preview tool subsystem | registry-backed exposure |
| C-009 | Add | N/A | `autobyteus-server-ts/src/agent-execution/backends/codex/preview/*` | Codex preview dynamic tools | Codex runtime | text-result adapter |
| C-010 | Add | N/A | `autobyteus-server-ts/src/agent-execution/backends/claude/preview/*` | Claude preview MCP tools | Claude runtime | run-level MCP adapter |
| C-011 | Modify | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | same path | merge preview MCP server map with existing team MCP map | Claude runtime | no team-only gating |

## Removal / Decommission Plan (Mandatory)

There is no existing preview-specific code to delete, but the design still removes incompatible future directions from the implementation scope.

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Reusing shell node-bound windows for preview | node-bound windows intentionally block navigation and are keyed to shell node context, not preview lifecycle | `electron/preview/preview-window-factory.ts` and `preview-session-manager.ts` | In This Change | keep node windows shell-only |
| Adding preview-specific renderer IPC/store work in v1 | dedicated preview windows plus existing tool-result activity already satisfy the MVP, so extra renderer state would be premature | existing tool-result flow and activity UI | In This Change | keeps v1 aligned with scope discipline and minimal event surface |
| Dynamic outer right-side preview tabs for v1 | static tab shell would become cluttered and harder to own | dedicated preview window surface | In This Change | future fixed `Preview` tab remains possible later |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | Electron preview subsystem | `PreviewSessionManager` | session registry, lifecycle invariants, native action coordination | single authoritative owner file | Yes |
| `autobyteus-web/electron/preview/preview-window-factory.ts` | Electron preview subsystem | preview window boundary | preview `BrowserWindow` construction and security defaults | construction concern only | No |
| `autobyteus-web/electron/preview/preview-bridge-server.ts` | Electron preview subsystem | local boundary | authenticated request translation into preview owner calls | boundary concern only | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | server-side preview tool subsystem | shared backend coordination owner | support gating, semantic validation on canonical inputs, error normalization, and bridge delegation | one subject-owned backend policy file | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | server-side preview tool subsystem | preview bridge client boundary | normalized local HTTP client for preview commands | one backend-side shared dependency | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | server-side preview tool subsystem | preview tool contract owner | names, canonical schemas, parsers/validators, and error codes | reusable shared structure close to the tool subsystem that consumes it | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts` | Codex preview adapter | Codex runtime adapter | dynamic tool exposure translation | adapter-specific concern only | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts` | Claude preview adapter | Claude runtime adapter | preview MCP tool definition translation | adapter-specific concern only | Yes |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| preview tool names, canonical input/output schemas, parsers/validators, and session error codes | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | server-side preview tool subsystem | all server-side adapters and bridge code need one semantic contract without implying a common-library capability | Yes | Yes | kitchen-sink runtime helper |
| capability checks, semantic validation on canonical inputs, bridge delegation, and error normalization | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | server-side preview tool subsystem | prevents each runtime adapter from owning preview policy while avoiding raw-payload parsing drift | Yes | Yes | empty passthrough service |
| preview bridge request/response normalization | `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | server-side preview tool subsystem | prevents each runtime adapter from owning transport details | Yes | Yes | second business owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| `PreviewSessionRecord` | Yes | Yes | Low | Yes | keep owner-local |
| `OpenPreviewInput` / `OpenPreviewResult` | Yes | Yes | Low | Yes | keep shared |
| shared preview error codes | Yes | Yes | Low | N/A | keep shared |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | Electron preview subsystem | `PreviewSessionManager` | authoritative preview session lifecycle, state transitions, cleanup, and result normalization | one governing owner | Yes |
| `autobyteus-web/electron/preview/preview-window-factory.ts` | Electron preview subsystem | preview window boundary | create isolated preview windows and attach shell-safe defaults | one constructor boundary | No |
| `autobyteus-web/electron/preview/preview-console-log-buffer.ts` | Electron preview subsystem | log support concern | session-local console log collection and sequencing | off-spine support owner | Yes |
| `autobyteus-web/electron/preview/preview-screenshot-artifact-writer.ts` | Electron preview subsystem | artifact support concern | persist screenshot outputs to managed file paths | off-spine support owner | No |
| `autobyteus-web/electron/preview/preview-bridge-server.ts` | Electron preview subsystem | shell boundary | local authenticated request translation | one boundary file | Yes |
| `autobyteus-web/electron/main.ts` | Electron shell | top-level shell integration | startup, shutdown, and bridge config injection | shell lifecycle integration point | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | server-side preview tool subsystem | shared backend coordination owner | support gating, semantic validation on canonical inputs, error normalization, and bridge delegation | one policy owner file | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | server-side preview tool subsystem | preview tool contract owner | schemas, names, parsers/validators, and error codes | reusable shared structure colocated with preview tool semantics | N/A |
| `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | server-side preview tool subsystem | preview bridge client boundary | normalized bridge transport client | one client boundary | Yes |
| `autobyteus-server-ts/src/agent-tools/preview/*.ts` | server-side preview tool subsystem | native runtime adapter | registry-backed preview tool exposure and registration | one file per tool keeps registry integration simple | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/preview/*.ts` | Codex preview adapter | Codex runtime adapter | dynamic tool specs/handlers and text-result serialization | runtime-specific translation only | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/preview/*.ts` | Claude preview adapter | Claude runtime adapter | preview MCP tool definitions and server map assembly | runtime-specific translation only | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude runtime | session integration owner | merge preview MCP server map with any team MCP server map | existing owner must assemble run-level MCP config | Yes |

## Derived Implementation Mapping (Secondary)

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | Add | DS-002, DS-003, DS-004, DS-005 | Governing owner | open/reuse, lookup, navigate, capture, close, and invalidate | `openSession`, `navigateSession`, `captureScreenshot`, `getConsoleLogs`, `closeSession` | central owner |
| `autobyteus-web/electron/preview/preview-bridge-server.ts` | Add | DS-001, DS-002, DS-003 | Boundary concern | authenticated local request entrypoint | route handlers for preview commands | no business ownership beyond translation |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | Add | DS-001, DS-002, DS-003 | Shared backend coordination owner | support checks, semantic validation on canonical inputs, bridge delegation, and result/error normalization | `isPreviewSupported`, `openPreview`, `navigatePreview`, `capturePreviewScreenshot`, `getPreviewConsoleLogs`, `closePreview` | adapters depend on this with canonical inputs, not raw payloads |
| `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | Add | DS-002, DS-003 | Boundary concern | shared backend transport client | `openPreview`, `navigatePreview`, `capturePreviewScreenshot`, `getPreviewConsoleLogs`, `closePreview` | used by all adapters |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | Add | DS-002, DS-003 | Contract concern | canonical preview tool shapes, parsers/validators, and error vocabulary | `parseOpenPreviewInput`, `parseCapturePreviewScreenshotInput`, error/result types | shared only inside the server preview tool subsystem |
| `autobyteus-server-ts/src/agent-tools/preview/*` | Add | DS-002, DS-003 | Native runtime adapter | local tool exposure for `autobyteus` | tool `execute()` methods | registry-backed |
| `autobyteus-server-ts/src/agent-execution/backends/codex/preview/*` | Add | DS-001, DS-002, DS-003 | Codex runtime adapter | dynamic tool exposure and Codex result translation | registration builder and handlers | JSON text result |
| `autobyteus-server-ts/src/agent-execution/backends/claude/preview/*` | Add | DS-001, DS-002, DS-003 | Claude runtime adapter | preview MCP tool definitions | tool definition builders | run-level MCP merge |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| preview session owner | N/A | `autobyteus-web/electron/preview/preview-session-manager.ts` | Electron preview lifecycle | Yes | Low | Keep | native lifecycle belongs under Electron shell |
| preview bridge server | N/A | `autobyteus-web/electron/preview/preview-bridge-server.ts` | Electron shell boundary | Yes | Low | Keep | bridge server is shell-owned |
| preview tool service | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts` | server-side preview tool policy | Yes | Low | Keep | adapters should not own repeated preview policy |
| preview bridge client | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts` | server-side preview bridge boundary | Yes | Low | Keep | adapters should not own transport |
| preview tool contract | N/A | `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | server-side canonical preview tool contract | Yes | Low | Keep | preview semantics belong with the server-side tool subsystem, not the common library |
| preview support files | N/A | `autobyteus-web/electron/preview/*` | Electron preview support concerns | Yes | Medium | Keep | these support owners stay close to session owner |
| current node-bound window helper | `autobyteus-web/electron/main.ts` | same path | shell node windows | Yes | Low | Keep | do not repurpose for preview |

Rules:
- The Electron preview files stay in a small dedicated folder because they share one native owner and one subject.
- The server-side preview tool subsystem stays flat because one contract file, one policy owner, one transport boundary, and a small set of tool handlers are enough.
- No preview-specific renderer files are added in v1; the existing tool-result/activity UI is the user-visible shell projection.
