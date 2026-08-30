# Browser Sessions

## Purpose

Browser sessions let agent runtimes open and operate browser-like web content inside the Electron shell `Browser` tab.
The public agent-facing surface is session-oriented and uses `tab_id` as the stable handle.

## Stable Tool Surface

The stable browser tools are:

- `open_tab`
- `navigate_to`
- `close_tab`
- `list_tabs`
- `read_page`
- `screenshot`
- `dom_snapshot`
- `run_script`
- `set_device_emulation`

The contract is strict:

- snake_case only
- typed booleans and integers only
- no compatibility aliases
- no string widening for booleans or integers

## Ownership Model

### Electron main

Electron main is the authoritative owner for:

- browser session lifecycle
- `WebContentsView` creation and destruction
- browser shell projection
- shell-host attachment and bounds
- per-tab browser device emulation state

Main-process owners:

- `BrowserSessionProfile`
  - dedicated persistent Browser partition ownership
  - one-time Browser-session policy application
  - popup `webContents` session validation
- `BrowserTabManager`
  - session registry
  - session lifecycle
  - lease state storage
  - per-tab device emulation state
  - available host bounds vs actual native presentation bounds
- `BrowserDeviceEmulationController`
  - mobile profile defaults and normalization
  - mobile presentation bounds and fit-scale computation
  - device metrics vs presentation scale separation
  - Electron `webContents.enableDeviceEmulation` / `disableDeviceEmulation` application
- `BrowserTabNavigation`
  - URL normalization
  - load/readiness waits
  - reuse eligibility
- `BrowserTabPageOperations`
  - page reads
  - screenshot capture
  - DOM snapshots
  - JavaScript execution
- `BrowserShellController`
  - shell-scoped claim/release
  - shell snapshot publishing
  - host-bounds projection

### Navigation Settlement Semantics

`BrowserTabNavigation` is the authoritative readiness and failure boundary for `navigate_to` and `reload`.

The current settlement rules are:

- full document navigation with `wait_until: "load"` settles on the normal document-load path and the underlying Electron navigation promise
- full document navigation with `wait_until: "domcontentloaded"` settles on Electron `dom-ready`
- same-document or in-page navigation settles on Electron `did-navigate-in-page` when the main-frame URL matches the requested target
- main-frame navigation failure rejects on Electron `did-fail-load`, `did-fail-provisional-load`, or an immediate `loadURL()` rejection

This keeps navigation lifecycle policy in one place and prevents Browser session calls from hanging when the URL changes without a full reload or when Electron reports a provisional failure path.

### Server browser boundary

The server owns:

- stable browser tool contract
- input parsing and semantic validation
- browser tool manifest
- runtime-specific tool projection for Codex and Claude
- runtime-specific browser tool event canonicalization before streaming
- bridge client dispatch through `BrowserToolService`

The server does not own browser window or tab lifecycle.

### Renderer

The renderer owns only:

- outer `Browser` tab UI
- internal browser tab strip UI
- browser host rectangle measurement
- snapshot-driven local projection state

The renderer does not own:

- session lifecycle
- shell lease policy
- native browser surface creation
- native device emulation state

### Screenshot artifact contract

`BrowserTabPageOperations` owns screenshot capture and
`BrowserScreenshotArtifactWriter` owns artifact persistence. A screenshot is
successful only when Electron returns a non-empty PNG buffer. Empty capture
buffers fail with the typed `browser_screenshot_failed` browser error before an
artifact path is returned; the writer independently rejects empty buffers
before creating a directory or file. Non-empty captures retain the existing
`{ tab_id, artifact_path, mime_type: 'image/png' }` result shape. This boundary
prevents a false-success zero-byte artifact from becoming invalid LLM media.

## Shell Lease Model

Browser session lifecycle is application-global, but shell projection is not.

Each browser session can have at most one active shell lease at a time.

Rules:

- a shell may focus a session only if that session is unleased or already leased by the same shell
- one shell may not silently steal a session from another shell
- closing a shell releases any leases it owns
- `reuse_existing` reuses only unleased matching sessions

This keeps session lifecycle and shell projection separate:

- session truth stays app-global
- shell ownership stays explicit and bounded

## Popup And New-Tab Behavior

Browser now supports browser-like popup/new-window behavior inside the app.

Rules:

- `window.open()` from a browsered page becomes another in-app Browser tab/session instead of a separate OS window
- Browser tabs use one Browser-owned persistent Electron session instead of Electron's default app session
- popup-created sessions are adopted only when Electron provides popup `webContents` from that same Browser-owned session
- mismatched popup `webContents` are aborted and closed with no child Browser session or `popup-opened` event created
- popup requests are accepted only when the opener session is currently leased into a shell
- popup fan-out is bounded per opener session, so one page cannot create unlimited child tabs
- unsupported protocols are still denied; `about:blank` is allowed because some popup flows bootstrap from it

This keeps Browser browser-like without turning the shell into an uncontrolled multi-window surface.

## Runtime Flow

### Open browser and project a successful result

1. Agent runtime calls `open_tab`.
2. The executing server/runtime parses and validates the arguments, then routes
   the call to its configured browser boundary. Embedded Electron uses the local
   Browser bridge; a Docker or remote node uses its own configured browser
   runtime, such as BrowserServer MCP.
3. The executing browser runtime opens or reuses a session and returns a result
   containing its own `tab_id`.
4. Normal tool-result streaming reports `TOOL_EXECUTION_SUCCEEDED` to the
   renderer. Generic conversation-tool and Activity projection records that
   success for both embedded and remote executions.
5. Automatic local Browser focus and right-side tab selection are a separate,
   embedded-Electron-only presentation step. The renderer performs them only
   when the current window is bound to the embedded node and the local Browser
   shell is available.
6. On that eligible embedded path, the renderer asks Electron main to focus the
   returned local session, `BrowserShellController` publishes the shell
   snapshot, and the renderer selects the `Browser` right-side tab.
7. For a Docker or remote-node result, the renderer does not send the remote
   `tab_id` to Electron's local Browser shell and does not change the current
   right-side selection. The successful tool result remains visible through the
   normal lifecycle/activity surfaces, while the opened tab remains owned by
   the executing node's browser runtime.

### Follow-up operations

All follow-up tools operate by `tab_id`.

Examples:

- `navigate_to`
- `set_device_emulation`
- `read_page`
- `screenshot`
- `dom_snapshot`
- `run_script`
- `close_tab`

These operations go through the server browser boundary to Electron main.
They do not depend on renderer DOM ownership.

### Device emulation

`set_device_emulation` changes an existing tab's native device-emulation mode.

Examples:

- enable the default mobile profile: `set_device_emulation({ "tab_id": "...", "mode": "mobile" })`
- enable a custom mobile viewport: `set_device_emulation({ "tab_id": "...", "mode": "mobile", "width": 390, "height": 844, "device_scale_factor": 3 })`
- restore desktop projection: `set_device_emulation({ "tab_id": "...", "mode": "desktop" })`

Device emulation is tab-local state owned by Electron main.
Its device metrics are separate from native presentation bounds:

- `screenSize`, `viewSize`, and `device_scale_factor` stay equal to the selected mobile profile.
- In desktop mode, the native `WebContentsView` uses the full Browser host rectangle.
- In mobile mode, Electron main computes a centered finite device presentation rectangle from the host rectangle and profile size. If the host is smaller than the profile, the presentation is fit-scaled while the emulated CSS/device metrics remain unchanged.
- `hostBounds` records the available Browser host rectangle; `viewportBounds` records the actual native `WebContentsView` presentation bounds.
- `WorkspaceShellWindow` attaches or detaches the selected Browser view, but must not overwrite the Browser session manager's computed presentation bounds.

Resizing the Browser panel or switching tabs must not overwrite a tab's `deviceEmulation` state.

### Popup-created tabs

Popup-created tabs are first-class browser sessions.

That means:

- they receive their own `tab_id`
- they can be focused and closed through the same Browser shell
- follow-up tools such as `read_page`, `screenshot`, `dom_snapshot`, and `run_script` work on them the same way they work on tabs opened through `open_tab`

## Renderer Projection

The renderer does not render web content directly.

Instead:

1. the renderer displays browser tab chrome and a rectangular host area
2. the renderer reports that host area bounds to Electron main
3. Electron main computes the active session's native presentation bounds
4. Electron main attaches the active session's `WebContentsView` at those bounds

This is why browser content can appear inside the right-side tab while still preserving full `webContents` capabilities.
The renderer does not compute or own mobile device centering, fit scale, or native `webContents` emulation.

## Browser Shell UX

Browser is now a permanent top-level right-side tab in the desktop shell.

The Browser shell UI owns:

- the internal browser tab strip
- manual URL entry
- manual new-tab creation
- mobile/desktop toggle for the active tab
- refresh
- close-current-tab
- full-view / restore toggle

These controls do not create a second browser model.
They reuse the same Browser shell store and the same Browser-shell IPC/controller path that agent-driven `open_tab` uses.
The mobile/desktop toggle calls the Browser shell IPC path and reflects the returned snapshot; it does not emulate mobile mode with renderer CSS.

When no tabs exist, the Browser shell stays visible and shows an empty state instead of disappearing.

## Full-View Mode

Browser full-view is a display-mode change, not a second runtime path.

Rules:

- full-view reuses the same active browser session and the same native `WebContentsView`
- the renderer only changes the Browser host bounds and shell chrome layout
- Electron main reprojects the same browser surface into the larger host rectangle
- leaving full-view does not destroy or recreate the active browser session

This mirrors the file-viewer zen-mode pattern: layout changes are renderer-owned, while native browser lifecycle stays in the Browser subsystem.

## Browser Runtime Availability

Browser availability has two separate meanings:

- desktop capability exists because the Electron preload API is present
- Browser runtime has actually started successfully in Electron main

If Browser runtime startup fails, Browser shell IPC now returns an explicit error instead of silently returning an empty snapshot.

That means Browser startup failure is surfaced as a user-visible Browser-shell error state rather than looking like "Browser is available but has no tabs."

### Docker and remote nodes

Embedded Electron still passes the Browser bridge to its bundled local server through environment variables at startup.
Docker and remote nodes do not pair back to the host Electron browser.

Browser automation for Docker or remote nodes should be configured as an MCP server inside that node, for example with BrowserServer MCP.
If no browser MCP is configured and selected for the agent, those nodes should expose no browser tools.
When a configured remote browser reports a successful `open_tab`, the canonical
tool-success event and its conversation/Activity presentation are still
preserved. Only Electron-local Browser focus and automatic right-side
`Browser` selection are suppressed for the remote-bound window.

## Runtime Adapter Notes

### Codex

Codex browser-capable tools are exposed through the server-hosted
`autobyteus_agent_tools` Agent Tools MCP descriptor. Embedded Electron browser
tools are included only when the agent is configured for them and the Browser
bridge is available. Docker/remote BrowserServer MCP tools are included as
configured MCP-origin routes when those registered tool names are configured for
the agent; they do not require the host Electron Browser bridge.
Runtime-specific raw result shapes are normalized into canonical browser tool
events at the Codex event-converter boundary; for example,
`mcp__autobyteus_agent_tools__open_tab` must stream as `open_tab` with
`result.tab_id` available directly before the renderer sees
`TOOL_EXECUTION_SUCCEEDED`. Browser tools are not Codex dynamic tools.

### Claude

Claude browser-capable tools are exposed through the same server-hosted
`autobyteus_agent_tools` Agent Tools MCP descriptor. Embedded Electron browser
tools require the Browser bridge, while Docker/remote BrowserServer MCP tools
are configured MCP-origin routes selected from that node's MCP registry.
MCP-prefixed raw tool names are normalized into canonical browser tool names at
the Claude event-converter boundary. Successful Claude browser MCP content-block
or content-envelope results are also normalized there into the same canonical
browser result objects used by other runtimes. For example,
`mcp__autobyteus_agent_tools__open_tab` must stream as `open_tab` with
`result.tab_id` available directly before the renderer sees
`TOOL_EXECUTION_SUCCEEDED`.

Browser normalization is intentionally limited to the AutoByteus Agent Tools MCP
prefix and known stable browser tool names.
Unknown browser-like suffixes and tools from other MCP servers must remain raw so the converter does not rewrite unrelated MCP traffic.
Conversation tool cards, Activity rows, and Browser-shell focus handling consume the backend-provided canonical event contract; they should not strip MCP prefixes or parse Claude MCP result envelopes as presentation logic.

## OAuth / Social Login Limits

Popup support removes the old in-app popup block, which is why popup-driven login flows such as X -> Google can now progress inside Browser tabs.

Browser now keeps its own persistent Electron session, so auth stored in the old default app session does not migrate into Browser automatically.
Users may need one-time re-login after rollout, but Browser auth should then persist across Browser tabs, popup flows, and app restarts.

However, Browser is still an embedded Electron browser surface.
Some providers may reject embedded OAuth/user-agent flows for policy reasons even when popup handling is correct.

Treat social/OAuth behavior as best-effort:

- popup/login flows should no longer fail because Browser denied the popup
- provider-side embedded-login rejection may still happen and is not treated as a Browser-shell regression

## Validation Expectations

Browser changes should keep all of these green:

- Electron browser lifecycle and shell-controller regression suites
- Browser shell renderer/store regression suites
- browser contract/parser unit suites
- Codex browser unit suites
- Claude browser unit suites
- live Codex browser integration scenarios
- live Claude browser integration scenarios

Electron browser lifecycle regression coverage should explicitly protect:

- full-document navigation success at `load`
- full-document navigation success at `domcontentloaded`
- same-document/in-page navigation success
- provisional or cancelled main-frame navigation failure

For contract or ownership changes, live runtime validation should prove more than `open_tab` alone.
