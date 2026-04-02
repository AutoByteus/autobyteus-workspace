# Preview Sessions

## Purpose

Preview sessions let agent runtimes open and operate browser-like web content inside the Electron shell `Preview` tab.
The public agent-facing surface is session-oriented and uses `preview_session_id` as the stable handle.

## Stable Tool Surface

The stable preview tools are:

- `open_preview`
- `navigate_preview`
- `close_preview`
- `list_preview_sessions`
- `read_preview_page`
- `capture_preview_screenshot`
- `preview_dom_snapshot`
- `execute_preview_javascript`

The contract is strict:

- snake_case only
- typed booleans and integers only
- no compatibility aliases
- no string widening for booleans or integers

## Ownership Model

### Electron main

Electron main is the authoritative owner for:

- preview session lifecycle
- `WebContentsView` creation and destruction
- preview shell projection
- shell-host attachment and bounds

Main-process owners:

- `PreviewSessionManager`
  - session registry
  - session lifecycle
  - lease state storage
- `PreviewSessionNavigation`
  - URL normalization
  - load/readiness waits
  - reuse eligibility
- `PreviewSessionPageOperations`
  - page reads
  - screenshot capture
  - DOM snapshots
  - JavaScript execution
- `PreviewShellController`
  - shell-scoped claim/release
  - shell snapshot publishing
  - host-bounds projection

### Server preview boundary

The server owns:

- stable preview tool contract
- input parsing and semantic validation
- preview tool manifest
- runtime-specific tool projection for Codex and Claude
- bridge client dispatch through `PreviewToolService`

The server does not own preview window or tab lifecycle.

### Renderer

The renderer owns only:

- outer `Preview` tab UI
- internal preview tab strip UI
- preview host rectangle measurement
- snapshot-driven local projection state

The renderer does not own:

- session lifecycle
- shell lease policy
- native browser surface creation

## Shell Lease Model

Preview session lifecycle is application-global, but shell projection is not.

Each preview session can have at most one active shell lease at a time.

Rules:

- a shell may focus a session only if that session is unleased or already leased by the same shell
- one shell may not silently steal a session from another shell
- closing a shell releases any leases it owns
- `reuse_existing` reuses only unleased matching sessions

This keeps session lifecycle and shell projection separate:

- session truth stays app-global
- shell ownership stays explicit and bounded

## Popup And New-Tab Behavior

Preview now supports browser-like popup/new-window behavior inside the app.

Rules:

- `window.open()` from a previewed page becomes another in-app Preview tab/session instead of a separate OS window
- popup-created sessions share the same default Electron browser profile as other Preview tabs
- popup requests are accepted only when the opener session is currently leased into a shell
- popup fan-out is bounded per opener session, so one page cannot create unlimited child tabs
- unsupported protocols are still denied; `about:blank` is allowed because some popup flows bootstrap from it

This keeps Preview browser-like without turning the shell into an uncontrolled multi-window surface.

## Runtime Flow

### Open preview

1. Agent runtime calls `open_preview`.
2. Server parses and validates arguments.
3. `PreviewToolService` sends the request through the local preview bridge.
4. Electron main opens or reuses a preview session.
5. Electron main returns `{ preview_session_id, status, url, title }`.
6. Normal tool-result streaming reaches the renderer.
7. Renderer asks Electron main to focus that session in the current shell.
8. `PreviewShellController` publishes the shell snapshot.
9. The renderer shows the `Preview` tab and internal session tabs.

### Follow-up operations

All follow-up tools operate by `preview_session_id`.

Examples:

- `navigate_preview`
- `read_preview_page`
- `capture_preview_screenshot`
- `preview_dom_snapshot`
- `execute_preview_javascript`
- `close_preview`

These operations go through the server preview boundary to Electron main.
They do not depend on renderer DOM ownership.

### Popup-created tabs

Popup-created tabs are first-class preview sessions.

That means:

- they receive their own `preview_session_id`
- they can be focused and closed through the same Preview shell
- follow-up tools such as `read_preview_page`, `capture_preview_screenshot`, `preview_dom_snapshot`, and `execute_preview_javascript` work on them the same way they work on tabs opened through `open_preview`

## Renderer Projection

The renderer does not render web content directly.

Instead:

1. the renderer displays preview tab chrome and a rectangular host area
2. the renderer reports that host area bounds to Electron main
3. Electron main attaches the active session's `WebContentsView` at those bounds

This is why preview content can appear inside the right-side tab while still preserving full `webContents` capabilities.

## Runtime Adapter Notes

### Codex

Codex preview tools are exposed as dynamic tools.
Runtime-specific raw result shapes are normalized into canonical preview tool events at the Codex event-converter boundary.

### Claude

Claude preview tools are exposed through MCP projection.
MCP-prefixed raw tool names are normalized into canonical preview tool names at the Claude event-converter boundary.

## OAuth / Social Login Limits

Popup support removes the old in-app popup block, which is why popup-driven login flows such as X -> Google can now progress inside Preview tabs.

However, Preview is still an embedded Electron browser surface.
Some providers may reject embedded OAuth/user-agent flows for policy reasons even when popup handling is correct.

Treat social/OAuth behavior as best-effort:

- popup/login flows should no longer fail because Preview denied the popup
- provider-side embedded-login rejection may still happen and is not treated as a Preview-shell regression

## Validation Expectations

Preview changes should keep all of these green:

- Electron preview lifecycle and shell-controller regression suites
- preview contract/parser unit suites
- Codex preview unit suites
- Claude preview unit suites
- live Codex preview integration scenarios
- live Claude preview integration scenarios

For contract or ownership changes, live runtime validation should prove more than `open_preview` alone.
