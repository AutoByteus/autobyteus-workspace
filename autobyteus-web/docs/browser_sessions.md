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

Main-process owners:

- `BrowserSessionProfile`
  - dedicated persistent Browser partition ownership
  - one-time Browser-session policy application
  - popup `webContents` session validation
- `BrowserTabManager`
  - session registry
  - session lifecycle
  - lease state storage
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

### Open browser

1. Agent runtime calls `open_tab`.
2. Server parses and validates arguments.
3. `BrowserToolService` sends the request through the local browser bridge.
4. Electron main opens or reuses a browser session.
5. Electron main returns `{ tab_id, status, url, title }`.
6. Normal tool-result streaming reaches the renderer.
7. Renderer asks Electron main to focus that session in the current shell.
8. `BrowserShellController` publishes the shell snapshot.
9. The renderer shows the `Browser` tab and internal session tabs.

### Follow-up operations

All follow-up tools operate by `tab_id`.

Examples:

- `navigate_to`
- `read_page`
- `screenshot`
- `dom_snapshot`
- `run_script`
- `close_tab`

These operations go through the server browser boundary to Electron main.
They do not depend on renderer DOM ownership.

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
3. Electron main attaches the active session's `WebContentsView` at those bounds

This is why browser content can appear inside the right-side tab while still preserving full `webContents` capabilities.

## Browser Shell UX

Browser is now a permanent top-level right-side tab in the desktop shell.

The Browser shell UI owns:

- the internal browser tab strip
- manual URL entry
- manual new-tab creation
- refresh
- close-current-tab
- full-view / restore toggle

These controls do not create a second browser model.
They reuse the same Browser shell store and the same Browser-shell IPC/controller path that agent-driven `open_tab` uses.

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

### Remote node pairing

The embedded desktop server is not the only runtime path anymore.

- Embedded Electron still passes the Browser bridge to its bundled server through environment variables at startup.
- Remote nodes can also use the local Electron browser when desktop `Remote Browser Sharing` is enabled and the user explicitly pairs a specific remote node.
- Pairing sends an expiring bridge descriptor (`baseUrl`, auth token, expiry) to the selected remote node through a runtime GraphQL mutation; the remote server keeps that binding in memory rather than treating it as static startup configuration.
- Revoking, expiry, or replacing the pairing removes the remote node's Browser support until a new descriptor is registered.
- Browser tool visibility still depends on the runtime-specific tool gate. A live bridge binding only makes the Browser capability reachable; it does not bypass per-agent configured tool names.

## Runtime Adapter Notes

### Codex

Codex browser tools are exposed as dynamic tools.
Runtime-specific raw result shapes are normalized into canonical browser tool events at the Codex event-converter boundary.

### Claude

Claude browser tools are exposed through MCP projection.
MCP-prefixed raw tool names are normalized into canonical browser tool names at the Claude event-converter boundary.

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
