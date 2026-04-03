# Requirements

## Status

`Design-ready`

## Ticket

`electron-browser-tool-refactor`

## Problem Statement

The current Electron-backed in-app browser capability is still named and surfaced as `preview`, even though it now behaves as a real internal browser with persistent state, multiple tabs, popup-created tabs, scripting, page reading, DOM snapshotting, and screenshots. The current runtime exposure model is also inconsistent: the native AutoByteus runtime respects agent-definition `toolNames`, while Codex, Claude, and team `send_message_to` injection still bypass the same agent-level tool gate. In addition, now that the capability is a real in-app browser, the Browser UI itself should behave more like a browser for users: always available, manually operable, and able to enter a clean full-view mode.

## User Intent Captured

1. Rename the capability away from `preview` because the feature is now an internal browser, not just a preview surface.
2. Make the UI label use `Browser`.
3. Rename the agent-facing tools to browser/tab terminology.
4. Make browser-tool exposure respect agent-definition `toolNames` across runtimes.
5. Apply the same explicit exposure rule to `send_message_to` instead of unconditional runtime injection.
6. Avoid long-term compatibility aliases for old `preview_*` names in the stable contract.
7. Make `Browser` a permanent right-side top-level tab rather than a lazy tab that appears only after the first browser session exists.
8. Let users manually open browser tabs from the Browser UI instead of requiring agent tool calls.
9. Add a clean browser chrome with URL entry, refresh, and close-current-tab controls without cluttering the UI.
10. Add a maximize/full-view Browser mode using the same clean shell pattern as the file content viewer.

## Scope Classification

- Confirmed Scope: `Large`

## In-Scope Use Cases

| Use Case ID | Title | Summary |
| --- | --- | --- |
| UC-001 | Browser tools exposed only when configured | AutoByteus, Codex, and Claude expose browser tools only when the agent definition includes them in `toolNames`. |
| UC-002 | Browser tools omitted when not configured | Browser tools stay unavailable even when the Electron-backed browser runtime exists. |
| UC-003 | `send_message_to` exposed only when configured | Team/member runtime paths stop treating `send_message_to` as an unconditional special case. |
| UC-004 | Agent opens and uses browser tabs end to end | `open_tab` and follow-up browser tools still work against the Electron-backed browser runtime after the rename/refactor. |
| UC-005 | Browser is always visible to the user | The right-side Browser tab exists before any agent opens a tab. |
| UC-006 | User manually opens a browser tab | The user can open a tab themselves from the Browser UI without using an agent tool call. |
| UC-007 | User operates active tab with clean browser chrome | The user can inspect/edit the address, refresh, and close the active tab without a cluttered toolbar. |
| UC-008 | User expands Browser into full-view mode | Browser can enter a near-full-window mode and exit cleanly while reusing the same browser tab model. |

## Functional Requirements

- `FR-001`: The Electron-backed browser capability must be renamed from `preview` to a browser/tab naming model across the stable tool contract, runtime adapters, result payloads, durable docs, and UI label.
- `FR-002`: The workspace right-side tool tab must be labeled `Browser`.
- `FR-003`: The stable agent-facing tool surface must use the following names:
  - `open_tab`
  - `navigate_to`
  - `list_tabs`
  - `read_page`
  - `screenshot`
  - `dom_snapshot`
  - `run_script`
  - `close_tab`
- `FR-004`: The stable identifier returned by this capability must be `tab_id`, not `preview_session_id`.
- `FR-005`: Browser-tool exposure for AutoByteus, Codex, and Claude runtimes must require explicit inclusion in the agent definition `toolNames`.
- `FR-006`: `send_message_to` exposure must no longer be injected unconditionally; it must follow the same agent-definition tool gate as ordinary agent tools.
- `FR-007`: The packaged desktop app must continue to expose the internal Electron-backed browser capability automatically when the runtime supports it and the agent definition includes the browser tool names; no new user-managed enablement setting is required in this ticket.
- `FR-008`: The stable browser contract must not keep backward-compatibility aliases for old `preview_*` tool names or payload keys.
- `FR-009`: The workspace right-side `Browser` tab must be permanently visible, even when no browser tabs currently exist.
- `FR-010`: When no browser tabs exist, the Browser panel must render a clean empty state with a clear path to open a tab manually.
- `FR-011`: A user must be able to create a browser tab manually from the Browser UI by entering a URL.
- `FR-012`: The Browser UI must provide lightweight browser chrome for the active tab:
  - URL entry / address bar
  - manual open affordance when tabs already exist
  - refresh
  - close current tab
- `FR-013`: The Browser UI must support a maximize/full-view mode so browser content can occupy a near-full-window experience.
- `FR-014`: Browser maximize/full-view should reuse the existing clean shell pattern already used by the file content viewer rather than inventing an unrelated maximize mechanism.
- `FR-015`: Agent-driven browser flows and manually opened browser tabs must share the same underlying browser-tab model and Electron ownership.
- `FR-016`: The Browser UI must stay visually clean; the added controls must not produce a cluttered or chaotic toolbar.
- `FR-017`: The Browser UI must provide one clear manual-open affordance both:
  - in the empty state when there are no tabs
  - in the populated browser chrome when tabs already exist
- `FR-018`: Browser full-view must remain the same Browser surface and must be exit-able without closing the active tab.

## Non-Goals

- Remote-node or Docker-node routing of browser commands back into the connected Electron client is not required in this ticket.
- Building a future external browser MCP provider is not required in this ticket.
- Adding new server settings or environment-variable controls for browser-provider selection is not required in this ticket.
- Remote-node browser routing remains out of scope.

## Contract Rename Map

| Current | Target |
| --- | --- |
| `open_preview` | `open_tab` |
| `navigate_preview` | `navigate_to` |
| `list_preview_sessions` | `list_tabs` |
| `read_preview_page` | `read_page` |
| `capture_preview_screenshot` | `screenshot` |
| `preview_dom_snapshot` | `dom_snapshot` |
| `execute_preview_javascript` | `run_script` |
| `close_preview` | `close_tab` |
| `preview_session_id` | `tab_id` |
| UI tab label `Preview` | UI tab label `Browser` |

## Acceptance Criteria

- `AC-001`: The stable agent-facing tool names use browser/tab terminology only; old `preview_*` names are removed from the active contract.
- `AC-002`: The workspace right-side tab is labeled `Browser`.
- `AC-003`: An agent that does not include the browser tools in `toolNames` cannot access them in AutoByteus, Codex, or Claude runtimes.
- `AC-004`: An agent that includes the browser tools in `toolNames` can access them in AutoByteus, Codex, or Claude runtimes when the internal Electron-backed browser capability is available.
- `AC-005`: `send_message_to` is not exposed when it is absent from the agent definition `toolNames`, including Codex and Claude team/runtime paths.
- `AC-006`: A packaged Electron desktop user does not need any new browser enablement setting or environment variable for the internal Electron-backed browser path when the agent definition includes the tool names.
- `AC-007`: No stable public contract element continues to use backward-compatibility aliases for the removed `preview_*` naming.
- `AC-008`: `Browser` is always visible as a right-side top-level tab.
- `AC-009`: When no browser tabs exist, the Browser panel shows a clean empty state with a visible manual-open affordance.
- `AC-010`: A user can manually open a browser tab from the Browser UI by entering a URL.
- `AC-011`: A user can refresh the active browser tab from the Browser UI.
- `AC-012`: A user can close the active browser tab from the Browser UI.
- `AC-013`: A user can maximize Browser into a full-view mode and exit that mode cleanly.
- `AC-014`: Existing agent-driven browser flows (`open_tab` and follow-up tools) continue to work after the Browser UI extension.
- `AC-015`: The Browser chrome remains intentionally minimal and visually clean.
- `AC-016`: A manual-open affordance exists both when Browser has no tabs and when Browser already has tabs open.
- `AC-017`: Entering and exiting full-view mode does not destroy the active browser tab or require the tab to be reopened.

## Constraints / Dependencies

- The ticket must stay on the existing `electron-browser-tool-refactor` worktree because the Browser UX scope depends directly on the current browser rename/gating state.
- The Browser shell must keep the current ownership split:
  - Electron main owns browser tabs and native `WebContentsView`
  - renderer owns Browser chrome, empty state, and layout mode
- The maximize/full-view behavior should reuse the existing file-viewer zen-mode pattern rather than invent a second fullscreen system.
- No new provider-selection settings, environment variables, or remote-node browser-routing work are allowed in this ticket.

## Assumptions

- Browser chrome actions from the renderer can be modeled as thin UI commands over the same Electron browser-tab owner already used by the agent tools.
- Browser manual-open and agent-open paths should produce the same browser-tab domain object and appear in the same Browser tab strip.
- The Browser top-level tab being permanently visible is acceptable product behavior now that the capability is a first-class browser rather than a lazy preview surface.

## Open Questions / Risks

- The Browser shell store and snapshot currently encode `browserVisible` from `sessions.length > 0`; the design must decide whether to remove that field or reinterpret it so Browser can remain visible with zero tabs.
- The current preload/main IPC surface does not yet include manual-open, navigate-active-tab, refresh-active-tab, or fullscreen-mode commands; these boundaries must be designed cleanly so the renderer still depends on authoritative browser-shell boundaries instead of browser runtime internals.

## Requirement To Use-Case Coverage

| Requirement ID | Covered By Use Case IDs |
| --- | --- |
| FR-001 | UC-001, UC-002, UC-004 |
| FR-002 | UC-005 |
| FR-003 | UC-001, UC-002, UC-004 |
| FR-004 | UC-004 |
| FR-005 | UC-001, UC-002 |
| FR-006 | UC-003 |
| FR-007 | UC-001, UC-004 |
| FR-008 | UC-001, UC-004 |
| FR-009 | UC-005 |
| FR-010 | UC-005, UC-006 |
| FR-011 | UC-006 |
| FR-012 | UC-006, UC-007 |
| FR-013 | UC-008 |
| FR-014 | UC-008 |
| FR-015 | UC-004, UC-006, UC-008 |
| FR-016 | UC-005, UC-006, UC-007, UC-008 |
| FR-017 | UC-005, UC-006, UC-007 |
| FR-018 | UC-008 |

## Acceptance Criteria To Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Verify the runtime/browser contract no longer exposes preview naming. |
| AC-002 | Verify the right-side top-level label is `Browser`. |
| AC-003 | Verify agents without browser tools configured do not receive them. |
| AC-004 | Verify agents with browser tools configured do receive them. |
| AC-005 | Verify `send_message_to` is absent when not configured. |
| AC-006 | Verify packaged desktop Browser capability works without new settings. |
| AC-007 | Verify no public stable browser contract still accepts preview aliases. |
| AC-008 | Verify Browser tab is visible before any browser tab exists. |
| AC-009 | Verify empty-state UI offers a clear manual open path. |
| AC-010 | Verify user manual tab open creates a working browser tab. |
| AC-011 | Verify active-tab refresh works from Browser chrome. |
| AC-012 | Verify active-tab close works from Browser chrome. |
| AC-013 | Verify Browser enters and exits full-view mode cleanly. |
| AC-014 | Verify existing agent-driven browser tool flows still work after the UX extension. |
| AC-015 | Verify the Browser toolbar remains intentionally minimal and readable. |
| AC-016 | Verify manual-open affordance is present in both empty and populated Browser states. |
| AC-017 | Verify full-view does not destroy the active browser tab state. |

## Final Scope Clarification

- This ticket now includes the browser UI shell extension in addition to the refactor/rename and strict agent `toolNames` gating.
- Provider-selection settings, remote-node browser routing, and external browser MCP integration are explicitly out of scope.
