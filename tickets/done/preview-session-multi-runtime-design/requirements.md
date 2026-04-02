# Requirements — Preview Session Multi-Runtime Design

- **Status**: `Refined`
- **Ticket**: `preview-session-multi-runtime-design`
- **Branch**: `codex/preview-session-multi-runtime-design`
- **Date**: `2026-04-01`
- **Scope Classification**: `Large`

---

## Goal / Problem Statement

The first preview implementation proved that the backend tool contract works, but the user experience is wrong for the product. Every `open_preview` call currently creates a separate native window. The new requirement is to keep preview inside the Electron shell on the right side so the feature behaves like an integrated browser workspace instead of a stream of popup windows.

The target behavior is:

- the shell shows one outer `Preview` tab on the right side only when preview content exists,
- inside that shell surface, each preview session appears as its own preview tab,
- each preview tab is backed by its own independent Electron `webContents` / `WebContentsView`,
- preview sessions still behave like browser controls with session listing plus per-session page reading, DOM snapshots, screenshots, and JavaScript execution,
- the existing session-oriented tool contract remains stable across runtimes,
- the old separate-window preview path is removed rather than kept as a compatibility branch.

---

## In-Scope Use Cases

### UC-001 — Agent opens a preview session and the shell reveals the Preview surface

An agent calls `open_preview`. The app creates or reuses a preview session, makes the right-side `Preview` outer tab visible, and activates the corresponding internal preview tab.

### UC-002 — Agent performs follow-up actions against preview sessions

After preview sessions exist, follow-up tools such as session listing, navigation, page reading, DOM snapshot capture, screenshot capture, JavaScript execution, and close operate on the same `preview_session_id` model.

### UC-003 — Multiple preview sessions coexist inside the shell

The app supports more than one preview session at a time. Each session has its own internal preview tab, its own `preview_session_id`, and its own independent browsing state.

### UC-004 — Preview visibility is lazy and self-cleaning

The outer `Preview` tab is hidden when there are no preview sessions. It appears when the first session opens and disappears again after the last session is closed.

### UC-005 — Preview capability remains reusable across supported runtime kinds

The preview feature continues to work for:

- `autobyteus`
- `claude_agent_sdk`
- `codex_app_server`

through one shared preview-session abstraction rather than runtime-specific shell behavior.

### UC-006 — Main-process native view ownership and renderer tab UI remain clearly separated

Electron main owns the `WebContentsView` lifecycle, session-to-native-view binding, and layout attachment. The renderer owns the right-side tab UI state, selection affordances, and bounds reporting for the native preview host surface.

### UC-007 — Preview inspection remains per-session

Each preview session keeps browser-like inspection and control independently, including:

- page reading,
- DOM snapshots,
- screenshots,
- JavaScript execution,
- close semantics.

### UC-008 — Legacy separate preview windows are removed

The target implementation no longer opens dedicated preview `BrowserWindow` instances for normal preview sessions. The shell-tab model replaces that behavior rather than sitting beside it.

---

## Requirements

### R-001 — Session-Oriented Preview Contract

The preview capability MUST remain modeled as a first-class session abstraction with a stable `preview_session_id` returned from the initial open/create operation and reused by subsequent operations.

### R-002 — Shell-Embedded Preview Surface

The user-visible preview surface MUST be embedded in the Electron shell on the right side, not opened as a separate preview window for normal preview sessions.

### R-003 — Lazy Outer Preview Tab

The outer right-side `Preview` tab MUST appear only when at least one preview session exists and MUST disappear again when no preview sessions remain.

### R-004 — Independent Per-Session Browser Control

Each preview session MUST own an independent browser control instance backed by its own `WebContentsView` / `webContents`, with separate navigation state, page lifecycle, and diagnostics.

### R-005 — Shared Multi-Runtime Abstraction

The design and implementation MUST preserve one reusable preview-session model across:

- `autobyteus`
- `claude_agent_sdk`
- `codex_app_server`

instead of introducing runtime-specific preview semantics.

### R-006 — Clear Ownership Boundary

The solution MUST clearly separate ownership for:

- preview session lifecycle,
- native `WebContentsView` creation/attachment/removal,
- renderer tab state and selection UI,
- tool invocation contract,
- runtime adapter responsibilities.

### R-007 — Minimal Event / IPC Surface

The renderer integration MUST stay bounded. It should use a small, purposeful shell state bridge for preview session snapshots, active-session selection, and layout bounds rather than a large set of preview-specific events.

### R-008 — Per-Session Inspection And Control Parity

The shell-tab preview surface MUST preserve the browser-control capabilities that matter for agents, including session listing, per-session page reading, DOM snapshot capture, screenshot capture, JavaScript execution, and close.

### R-009 — Session Cleanup Semantics

The solution MUST define how preview sessions are invalidated, how closing an internal preview tab affects the outer `Preview` tab, and how later tool lookups report `closed` versus `not_found`.

### R-010 — Adapter Contract Parity

All runtime exposure paths MUST preserve the same preview session contract and semantics so that `preview_session_id` means the same thing regardless of runtime kind.

### R-011 — Legacy Removal

The separate preview-window behavior MUST be removed from the target implementation rather than retained as a parallel compatibility path.

---

## Acceptance Criteria

### AC-001 — Governing owner for native preview lifecycle is explicit

The design names the authoritative owner for preview session state, native view lifecycle, and session-to-`webContents` binding.

### AC-002 — Outer Preview tab is lazy

When the first preview session opens, the right-side `Preview` tab becomes visible. When the last preview session closes, the outer `Preview` tab is removed or hidden.

### AC-003 — Each preview session maps to its own internal preview tab

The design and implementation define one independent preview tab per `preview_session_id`, with clear behavior for create, select, reuse, and close.

### AC-004 — Per-session browser-control capabilities are preserved

Session listing, page reading, DOM snapshot capture, screenshot capture, JavaScript execution, and close remain available through the preview-session model after the move from separate windows to shell tabs.

### AC-005 — Runtime reuse remains consistent

`autobyteus`, `claude_agent_sdk`, and `codex_app_server` still reach the same preview session contract without runtime-specific semantic drift.

### AC-006 — Main/renderer coordination is bounded

The renderer does not become the owner of native preview lifecycle. Electron main owns native views, and the renderer only coordinates shell selection/presentation with a bounded state bridge.

### AC-007 — Session cleanup is deterministic

Closing an internal preview tab removes its native view, invalidates its session consistently, and hides the outer `Preview` tab when no sessions remain.

### AC-008 — Legacy preview-window path is removed

The target design removes the dedicated preview `BrowserWindow` path from normal preview operation instead of keeping both window and tab behaviors alive.

---

## Constraints / Dependencies

- The solution must respect the existing Electron `main` / `preload` / renderer separation.
- The existing right-side tab UI is renderer-owned and static today, so a shell-tab preview solution must bridge renderer selection state with main-process native view ownership.
- The solution must preserve the existing session-oriented tool contract shape unless a justified contract change is explicitly recorded.
- The solution must avoid `<webview>` and use Electron-native `WebContentsView` / `webContents` ownership for preview content.
- The solution must not keep separate-window preview as a backward-compatibility path.
- The solution must respect the existing agent tool lifecycle and runtime abstractions already present in the codebase.
- The stable preview tool surface for this ticket is:
  - `open_preview`
  - `navigate_preview`
  - `close_preview`
  - `list_preview_sessions`
  - `read_preview_page`
  - `capture_preview_screenshot`
  - `preview_dom_snapshot`
  - `execute_preview_javascript`

---

## Assumptions

- Electron main can host one or more preview `WebContentsView` instances in the shell layout when given renderer-reported bounds for the right-side preview host area.
- A single outer `Preview` tab with internal preview-session tabs is acceptable UX for the product.
- Session-oriented preview tools are still preferred over one-shot preview commands.

---

## Open Questions / Risks

- What is the cleanest shell host model for attaching a main-process `WebContentsView` into the current BrowserWindow-backed shell?
- Should inactive preview sessions keep their native view alive offscreen, or should the shell remount only the active session view?
- What is the minimum renderer-to-main state bridge needed for selection, close, and bounds sync without creating event sprawl?
- What page-read cleaning level should the preview tool return by default so agents get useful structure without excessive HTML noise?

---

## Requirement To Use-Case Coverage

| Requirement ID | Covered By Use Case IDs |
| --- | --- |
| R-001 | UC-001, UC-002, UC-003 |
| R-002 | UC-001, UC-006, UC-008 |
| R-003 | UC-001, UC-004 |
| R-004 | UC-002, UC-003, UC-007 |
| R-005 | UC-005 |
| R-006 | UC-006 |
| R-007 | UC-006 |
| R-008 | UC-002, UC-007 |
| R-009 | UC-004, UC-008 |
| R-010 | UC-002, UC-005 |
| R-011 | UC-008 |

## Acceptance-Criteria To Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | The authoritative main-process owner for tab-backed preview sessions is explicit and defensible. |
| AC-002 | The shell only exposes `Preview` when it is actually needed. |
| AC-003 | The internal preview-tab model is concrete enough to drive implementation and validation. |
| AC-004 | Moving from windows to shell tabs does not degrade the important browser-control capabilities. |
| AC-005 | Runtime-specific adapters still preserve one shared preview-session contract. |
| AC-006 | The shell architecture stays bounded instead of pushing native preview ownership into the renderer. |
| AC-007 | Session close and shell-hide behavior are deterministic and testable. |
| AC-008 | The design removes the old separate-window preview behavior instead of retaining a dual path. |
