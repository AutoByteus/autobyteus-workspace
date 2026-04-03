# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined browser/tab rename boundary and uniform agent `toolNames` exposure policy | 1 |
| v2 | Stage 8 re-entry (`Design Impact`) | Added one shared configured-tool exposure owner, made prompt guidance depend on actual exposure, and moved Claude allowlist authority to the session boundary | 2 |
| v3 | Stage 9 re-entry (`Requirement Gap`) | Expanded the design to make Browser a permanent shell surface with manual tab open, lightweight browser chrome, and file-viewer-style full-view mode | Pending |

## Artifact Basis

- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/investigation-notes.md`
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/tickets/in-progress/electron-browser-tool-refactor/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`
- Common Design Practices: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md`

## Summary

Keep the already-correct browser/tab rename and agent `toolNames` gating model, then extend the Browser shell so it behaves like a first-class in-app browser surface. The Browser top-level tab becomes permanently visible, the renderer gains a clean manual open/navigate/refresh/close chrome above the same Electron-owned browser tab model, and a Browser full-view mode reuses the file-viewer zen-mode shell pattern so the same native browser tab can occupy a much larger host area without creating a second browser runtime.

## Goal / Intended Change

- Keep the stable capability named as `browser`/`tab`, not `preview`.
- Keep optional tool exposure authoritative at `AgentDefinition.toolNames`.
- Keep `send_message_to` behind the same configured-tool rule.
- Remove the lazy right-side Browser visibility rule that depended on `sessions.length > 0`.
- Make `Browser` permanently visible in the right-side tabs for desktop/Electron contexts.
- Add a manual user open flow that creates the same browser-tab domain object used by agent tool calls.
- Add a lightweight Browser chrome for the active tab:
  - tab strip
  - address bar
  - refresh
  - close current tab
  - maximize/full-view toggle
- Reuse one Browser shell boundary and one native browser runtime. Do not create a second browser engine path for user-driven actions.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - remove old `preview_*` stable tool names and payload keys
  - remove unconditional browser-tool injection in Codex/Claude
  - remove unconditional `send_message_to` injection in team/runtime paths
  - remove the lazy Browser-tab visibility rule based on `sessions.length > 0`
  - remove renderer assumptions that Browser appears only after an agent opens a tab
- Gate rule: design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Rename the capability to browser/tab language only | AC-001, AC-002, AC-007 | Browser/tab names replace preview names in the stable contract and UI | UC-001, UC-002, UC-004 |
| R-002 | Browser tools must respect `agentDef.toolNames` | AC-003, AC-004, AC-006 | Optional browser tools are exposed only when configured | UC-001, UC-002, UC-004 |
| R-003 | `send_message_to` must respect `agentDef.toolNames` | AC-005 | No unconditional special-case exposure remains | UC-003, UC-005, UC-006 |
| R-004 | Browser is a permanent user-facing shell surface | AC-008, AC-009, AC-016 | Browser tab stays visible and offers manual open affordances | UC-007, UC-008 |
| R-005 | Browser chrome lets the user operate the active tab cleanly | AC-010, AC-011, AC-012, AC-015 | Manual open, navigate, refresh, close all live in a minimal chrome | UC-008, UC-009 |
| R-006 | Browser supports full-view mode without changing tab ownership | AC-013, AC-017 | Full-view is only a shell display-mode change over the same browser tab | UC-010 |
| R-007 | Agent-opened and user-opened tabs share one browser-tab model | AC-014 | Browser tools still work after the Browser UX extension | UC-004, UC-008, UC-009, UC-010 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Optional-tool exposure spine | AutoByteus already respects `agentDef.toolNames`; Codex and Claude needed the existing refactor to do the same | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | None |
| Browser shell visibility | Browser top-level tab is still hidden whenever `browserVisible` is false | `autobyteus-web/composables/useRightSideTabs.ts`, `autobyteus-web/stores/browserShellStore.ts`, `autobyteus-web/electron/browser/browser-shell-controller.ts` | Whether `browserVisible` should be removed entirely or reinterpreted as capability availability |
| Browser shell UI | Browser panel only renders the tab strip, attach host, and agent-oriented empty state | `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | None |
| Browser shell IPC boundary | Renderer can fetch snapshot, focus, set active, update host bounds, and close only | `autobyteus-web/electron/preload.ts`, `autobyteus-web/electron/main.ts` | The cleanest shape for manual open/navigate/reload commands |
| Native browser owner | Browser tab manager already owns open/navigate/read/screenshot/dom/script/popup lifecycle; shell controller already owns attachment and active-tab projection | `autobyteus-web/electron/browser/browser-tab-manager.ts`, `autobyteus-web/electron/browser/browser-shell-controller.ts` | None |
| Full-view reference pattern | File content viewer already implements a clean zen-mode with one display-mode store plus `<Teleport to=\"body\">` | `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue`, `autobyteus-web/stores/fileContentDisplayMode.ts` | None |

## Current State (As-Is)

The underlying browser capability is already correct: Electron main owns persistent browser tabs and the shell controller projects them into the workspace Browser panel. The reopened problem is at the shell/UI boundary. The current Browser tab still behaves like a lazy projection surface that appears only after agent activity, its renderer contract has no manual command path, and the shell snapshot still encodes visibility from current session count rather than from Browser capability availability.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `AgentDefinition.toolNames` | Runtime-visible optional tool set | Configured Tool Exposure Owner | This remains the authoritative exposure spine for browser tools and `send_message_to` |
| DS-002 | Primary End-to-End | Agent/browser tool call | Electron browser action result | Browser Tool Boundary + Electron Browser Runtime | This preserves the existing browser capability while the shell changes around it |
| DS-003 | Primary End-to-End | User selects top-level Browser tab | Browser panel visible with zero or more browser tabs | Right-side tabs + Browser shell store | This is the new always-visible Browser-shell surface |
| DS-004 | Primary End-to-End | User manual browser command (`open`, `navigate`, `refresh`, `close`) | Updated browser shell snapshot + visible browser tab state | Browser shell store + Browser shell controller | This is the new user-driven command spine |
| DS-005 | Primary End-to-End | User toggles Browser full-view | Same native browser tab reprojected into large host bounds | Browser display-mode owner + Browser shell controller | This is the new shell-layout spine, separate from browser semantics |
| DS-006 | Return-Event | Runtime/browser success event | Browser shell store + Browser UI update | Runtime event converters + Browser success handler | The return/event path must remain clean after the Browser rename |
| DS-007 | Bounded Local | Browser host rectangle changes | Attached native browser view bounds update | Browser shell controller | This local projection loop materially shapes the UI behavior |

## Primary Execution / Data-Flow Spine(s)

- `AgentDefinition.toolNames -> Configured Tool Exposure Owner -> Runtime Bootstrap / Session Builder -> Runtime-visible optional tool set -> Agent/tool prompt surface`
- `Agent/browser tool call -> Browser Tool Boundary -> Browser Tool Service -> Electron bridge client -> Electron browser runtime -> Browser result`
- `Right-side tab selection -> Browser shell store -> Browser panel -> Browser host bounds sync -> Browser shell controller -> Attached native browser view`
- `User Browser chrome action -> Browser shell store command -> Browser-shell IPC boundary -> Browser shell controller -> Browser tab manager -> Snapshot publication -> Browser shell store`
- `Browser full-view toggle -> Browser display-mode store -> Browser panel teleport/layout change -> Browser host bounds sync -> Browser shell controller -> Same native browser view with larger bounds`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Owns |
| --- | --- | --- |
| Agent Definition | authoritative optional tool selector | `toolNames` contract |
| Configured Tool Exposure Owner | shared resolved exposure policy | configured tool normalization and derived browser/send-message exposure |
| Runtime Bootstrap / Session Builder | runtime-specific optional tool assembly | runtime-visible tool set, prompt/tool/MCP allowlist alignment |
| Browser Tool Boundary | stable browser contract | browser tool names, validation, result shape |
| Electron Browser Runtime | native browser capability | browser tabs, navigation, page operations, popup adoption |
| Browser Shell Controller | shell projection authority | shell lease, active tab, attached view, host-bounds projection |
| Browser Shell Store | renderer authoritative Browser-shell boundary | Browser snapshot, browser-shell commands, active Browser UI state |
| Browser Display Mode Store | renderer display-mode authority | normal vs full-view Browser shell layout |
| Browser Panel UI | Browser shell chrome | tab strip, address bar, empty state, maximize controls |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The agent definition remains the authoritative source of optional tool exposure. A shared exposure owner resolves browser/send-message exposure once, and runtime bootstrap/session builders consume that result instead of reconstructing policy locally. | Agent Definition, Configured Tool Exposure Owner, Runtime Bootstrap / Session Builder | Configured Tool Exposure Owner | runtime-specific name shaping |
| DS-002 | A browser tool call crosses one stable browser boundary, reaches the Electron-backed browser runtime, and returns a `tab_id` result with browser/tab naming only. | Browser Tool Boundary, Electron Browser Runtime | Browser Tool Boundary | serialization, runtime adapter translation |
| DS-003 | The user can select Browser even before any browser tabs exist. The Browser shell store and panel render a clean empty state instead of hiding the capability entirely. | Right-side Tabs, Browser Shell Store, Browser Panel UI | Browser Shell Store | Electron availability detection |
| DS-004 | Manual Browser commands from the renderer go through the Browser shell store into one browser-shell IPC boundary, which calls the shell controller and browser tab manager, then publishes an updated snapshot back to the renderer. | Browser Shell Store, Browser shell IPC boundary, Browser Shell Controller, Browser Tab Manager | Browser Shell Controller + Browser Shell Store | URL normalization, error surfacing |
| DS-005 | Browser full-view is a shell display-mode change only. The same Browser panel chrome and native browser view are reused; only the host rectangle and layout mode change. | Browser Display Mode Store, Browser Panel UI, Browser Shell Controller | Browser Display Mode Store + Browser Shell Controller | Teleport/full-screen shell layout |
| DS-006 | Browser-related success events coming back from Codex or Claude stop at runtime event-converter boundaries, flow through generic streaming services, and then reach the browser-specific success handler and Browser shell store. | Runtime Event Converter, AgentStreamingService, Browser success handler, Browser Shell Store | Browser success handler + Browser Shell Store | runtime-specific payload normalization |
| DS-007 | Host-rectangle updates from normal or full-view Browser panel layouts remain inside the Browser shell controller’s bounded local projection loop and keep the same native browser view attached to the correct bounds. | Browser Panel UI, Browser Shell Controller | Browser Shell Controller | resize observation and bounds deduplication |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| Agent Definition | authoritative optional tool selection via `toolNames` | runtime-specific unconditional exceptions for browser tools or `send_message_to` | unchanged from earlier refactor |
| Configured Tool Exposure Owner | normalized configured tool names, derived browser/send-message exposure | renderer Browser-shell behavior or SDK transport details | shared server-side policy owner |
| Runtime Bootstrap / Session Builder | runtime-specific tool surface assembly, prompt/tool/MCP alignment | browser shell UI behavior | unchanged from earlier refactor |
| Browser Tool Boundary | stable browser contract and browser service API | Browser shell chrome or shell layout | server/browser capability boundary |
| Electron Browser Runtime | native browser tab lifecycle and page operations | Browser shell display mode or top-level tab visibility policy | native browser owner |
| Browser Shell Controller | shell-specific tab attachment, active tab, shell leases, host bounds, shell snapshot | direct renderer UI concerns like toolbar layout or input state | authoritative Electron shell boundary |
| Browser Shell Store | authoritative renderer Browser boundary for state + commands | direct `window.electronAPI` use from BrowserPanel, or lower-level browser runtime semantics | renderer-side public entrypoint |
| Browser Display Mode Store | Browser full-view state | browser tab lifecycle or browser tool semantics | renderer-only layout owner |
| Browser Panel UI | minimal Browser chrome and empty-state rendering | direct Electron IPC or browser-tab lifecycle ownership | consume stores only |

## Off-Spine Concerns Around The Spine

| Concern | Serves Which Owner | Responsibility | Existing Subsystem Reuse |
| --- | --- | --- | --- |
| Runtime-specific browser definition projection | Runtime Bootstrap / Session Builder | shape Codex and Claude tool definitions from the shared browser manifest | Reuse existing browser runtime-adapter folders |
| Browser result/event normalization | Browser Tool Boundary + runtime event converters | normalize runtime/browser results into the stable contract and Browser shell events | Reuse existing event converter + browser success handler path |
| Browser display mode | Browser Panel UI | store full-view state and provide one renderer layout switch | Create one new renderer store under Browser shell ownership |
| URL normalization / reload behavior | Browser Tab Manager | keep manual renderer commands using the same browser-tab semantics as tool calls | Reuse/extend existing browser-tab manager/navigation |
| Snapshot publication | Browser Shell Controller | publish browser shell state back to the renderer | Reuse existing shell controller snapshot channel |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Shared browser contract | `autobyteus-server-ts/src/agent-tools/browser` | Reuse | It already owns the renamed browser capability boundary | N/A |
| Shared configured-tool exposure | `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Reuse | It already owns the correct gating policy | N/A |
| Electron browser runtime | `autobyteus-web/electron/browser` | Reuse/Extend | It already owns tab lifecycle and page operations; only shell commands need extension | N/A |
| Browser shell renderer state | `autobyteus-web/stores/browserShellStore.ts` | Reuse/Extend | It already owns snapshot state and shell commands | N/A |
| Full-view layout pattern | file viewer zen-mode pattern | Reuse/Adapt | The existing display-mode + teleport pattern is already proven and clean | N/A |
| Browser UI surface | `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Reuse/Extend | One Browser panel should keep owning Browser shell chrome | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/browser` | stable browser contract, manifest, validators, service | DS-001, DS-002, DS-006 | Browser Tool Boundary | Reuse | no new server/browser subsystem needed |
| `autobyteus-server-ts/src/agent-execution/shared` | configured-tool normalization and derived optional-tool exposure | DS-001 | Configured Tool Exposure Owner | Reuse | earlier refactor already created this owner |
| `autobyteus-server-ts/src/agent-execution/backends/*/browser` | runtime-specific browser projection | DS-001, DS-002, DS-006 | runtime bootstrap/session builders | Reuse | earlier refactor already moved this boundary |
| `autobyteus-web/electron/browser` | native browser runtime and Browser shell controller | DS-002, DS-004, DS-005, DS-007 | Electron Browser Runtime + Browser Shell Controller | Extend | add shell command methods and snapshot cleanup |
| `autobyteus-web/stores/browserShellStore.ts` | renderer Browser shell boundary for snapshot + commands | DS-003, DS-004, DS-006 | Browser Shell Store | Extend | renderer should not bypass this boundary |
| `autobyteus-web/stores/browserDisplayMode.ts` | Browser full-view display mode | DS-005 | Browser Display Mode Store | Create New | this is a new UI-only owner, analogous to file viewer zen mode |
| `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Browser shell chrome and host projection | DS-003, DS-004, DS-005, DS-007 | Browser Panel UI | Extend | may stay primary owner if file size remains healthy |
| `autobyteus-web/composables/useRightSideTabs.ts` | top-level Browser tab visibility rule | DS-003 | Right-side tabs shell owner | Modify | remove session-count visibility coupling |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `AgentDefinition -> Configured Tool Exposure Owner -> Runtime Bootstrap / Session Builder -> Runtime-specific browser definitions`
  - `Browser tool callers -> Browser Tool Boundary -> Browser Tool Service -> Electron bridge client`
  - `BrowserPanel -> BrowserShellStore -> browser-shell IPC boundary -> BrowserShellController -> BrowserTabManager`
  - `BrowserPanel -> BrowserDisplayModeStore`
  - `BrowserDisplayModeStore -> BrowserPanel layout only`
- Authoritative public entrypoints:
  - optional-tool selection authority: `AgentDefinition.toolNames`
  - renderer Browser shell authority: `BrowserShellStore`
  - native Browser shell authority: `BrowserShellController`
  - browser capability authority: `Browser Tool Boundary` and `BrowserTabManager`
- Forbidden shortcuts:
  - BrowserPanel must not call `window.electronAPI` directly
  - BrowserPanel must not reach directly into browser runtime internals
  - top-level Browser visibility must not depend on `sessions.length > 0`
  - Browser full-view must not create a second browser runtime path or duplicate tab state
  - browser manual-open must not create a separate UI-only tab model
  - runtime builders must not expose browser tools or `send_message_to` outside `toolNames`

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Keep the browser rename/gating architecture, then extend the Browser shell through the existing browser-shell boundaries instead of adding a second browser UX path.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): this preserves the already-correct browser runtime and tool exposure model, adds only one renderer display-mode owner plus a few browser-shell commands, and keeps Browser manual and agent actions unified on the same native tab model.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep`, `Add`, `Modify`, `Remove`

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Longer primary spine inventory | Browser shell visibility + manual command + full-view spines | makes the user-facing Browser UX path explicit instead of treating it as a local BrowserPanel tweak | Browser shell owners | matches the user’s requested review discipline |
| Authoritative Boundary Rule | Browser renderer command path | keeps BrowserPanel above `BrowserShellStore` instead of mixing UI with low-level IPC | Browser Shell Store | critical for clean Browser shell UX |
| Existing capability reuse | Browser runtime + file-viewer zen-mode pattern | prevents duplicate browser engines and duplicate fullscreen patterns | Electron Browser Runtime + Browser Display Mode | reuse rather than parallel invention |
| Bounded local spine | host-bounds projection loop | makes resize/full-view effects on the native view explicit | Browser Shell Controller | important for later Stage 8 review |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Browser shell renderer commands should all land on `BrowserShellStore` instead of direct IPC calls from multiple components | Extend existing owner |
| Responsibility overload exists in one file or one optional module grouping | No | Browser UX can stay within current Browser shell subsystem plus one display-mode store | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | Browser shell store and controller each own one real boundary | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | full-view display mode, runtime projections, snapshot publication all attach to clear owners | Keep |
| Authoritative Boundary Rule is preserved | Yes | BrowserPanel consumes Browser shell stores; lower layers do not re-own UI behavior | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | browser runtime, browser shell store, and file-viewer zen-mode pattern are all reused | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | browser capability and configured-tool exposure owners already exist; only one new display-mode store is needed | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | No | keeping `browserVisible` tied to session count and hiding Browser until agent activity would preserve the old lazy-preview mental model | Change |

## Change Inventory (Delta)

| Change Type | Path / Area | Summary |
| --- | --- | --- |
| Add | `autobyteus-web/stores/browserDisplayMode.ts` | Browser full-view state owner, patterned after the file viewer zen-mode store |
| Modify | `autobyteus-web/composables/useRightSideTabs.ts` | Browser becomes a permanent top-level right-side tab |
| Modify | `autobyteus-web/types/browserShell.ts` | remove or reshape `browserVisible` if it only represented session-count visibility |
| Modify | `autobyteus-web/stores/browserShellStore.ts` | add manual Browser shell commands and renderer-side Browser capability state |
| Modify | `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | add empty state, manual open, address bar, refresh, close-current-tab, and full-view controls |
| Modify | `autobyteus-web/electron/preload.ts` | expose browser-shell open/navigate/reload commands needed by the Browser UI |
| Modify | `autobyteus-web/electron/main.ts` | add IPC handlers for the new browser-shell commands |
| Modify | `autobyteus-web/electron/browser/browser-shell-controller.ts` | add shell-owned open/navigate/reload orchestration and snapshot publication updates |
| Modify | `autobyteus-web/electron/browser/browser-tab-manager.ts` | add reload helper and any shell-facing open/navigate convenience needed by the Browser shell controller |
| Remove | Browser top-level tab visibility coupling to `sessions.length > 0` | Browser no longer hides when no tabs exist |

## Target File / Folder Responsibility Mapping

| Target Path | Responsibility |
| --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-tools/browser/` | stable browser contract and browser tool service |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | configured-tool exposure authority |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/browser/browser-tab-manager.ts` | native browser tab lifecycle and page operations |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/browser/browser-shell-controller.ts` | Browser shell orchestration, tab attachment, shell snapshots, user-command orchestration |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/stores/browserShellStore.ts` | renderer Browser shell state + command boundary |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/stores/browserDisplayMode.ts` | Browser full-view display-mode state |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Browser chrome, empty state, host rectangle, full-view projection |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/composables/useRightSideTabs.ts` | top-level Browser tab visibility rule |

## Migration / Refactor Sequence

1. Keep the existing browser rename/gating architecture as the baseline; do not fork the ticket or reintroduce preview naming.
2. Remove the top-level Browser visibility rule that depends on active sessions and make Browser visible whenever the Browser shell capability exists in the desktop app.
3. Extend the Browser shell controller/preload/main IPC boundary with shell-owned `open`, `navigate`, and `reload` commands for renderer-driven Browser actions.
4. Extend the Browser shell store so BrowserPanel can perform all shell actions through one authoritative renderer boundary.
5. Add Browser full-view display-mode ownership with a zen-mode-style renderer store and reuse the same Browser host projection surface.
6. Extend BrowserPanel with:
   - clean empty state
   - manual open affordance
   - minimal browser chrome
   - full-view toggle
7. Update tests for:
   - top-level Browser visibility without sessions
   - manual tab open
   - Browser shell command path
   - Browser full-view projection
   - regression coverage for existing agent-driven browser flows
8. Regenerate future-state runtime artifacts and rerun deep review before unlocking code edits.
