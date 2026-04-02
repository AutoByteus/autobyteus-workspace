# Investigation Notes

- Ticket: `preview-popup-tab-browser-behavior`
- Date: `2026-04-02`
- Scope Triage: `Medium`
- Investigation Status: `Current`

## Problem Statement

The popup-tab refactor removed the old blanket popup block, but packaged-user verification now crashes Electron main during popup-driven Google-login flows on X and LinkedIn. The failure happens after the Google Accounts popup tab opens, which means the remaining problem is the popup `createWindow(options)` integration rather than popup policy itself.

## Evidence

### Code Evidence

1. Popup requests are now handled in [preview-session-manager.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-session-manager.ts#L272), but the current callback returns a child `webContents` that was created before Electron passed the popup `options` object.
2. The preview view factory already owns `WebContentsView` creation and is the correct place to adopt Electron-provided popup `webContents` in [preview-view-factory.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-view-factory.ts#L15).
3. The shell host already knows how to attach and switch one `WebContentsView` into the Preview UI region in [workspace-shell-window.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/shell/workspace-shell-window.ts#L78).
4. The preview shell controller already manages multiple Preview sessions/tabs and lease ownership in [preview-shell-controller.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-shell-controller.ts#L98).

### Runtime Evidence

1. The app log contains repeated blocked Google OAuth popup URLs while trying to sign into X:
   - [app.log](/Users/normy/.autobyteus/logs/app.log)
   - example lines around `2026-04-02T13:14:31Z` and `2026-04-02T13:18:44Z`
2. The blocked URLs are Google popup-based auth endpoints such as:
   - `https://accounts.google.com/o/oauth2/v2/auth?...display=popup...origin=https%3A%2F%2Fx.com`
   - `https://accounts.google.com/gsi/select?...ux_mode=popup...origin=https%3A%2F%2Fx.com`
3. Packaged-user verification on the new popup-tab build reproduces a main-process crash on both X and LinkedIn after clicking the Google-login button:
   - `Error: Invalid webContents. Created window should be connected to webContents passed with options object.`
4. The packaged app opens the Google Accounts popup URL as a Preview tab before crashing, which proves the popup-block rule was removed and the remaining bug is the `createWindow(...)` integration itself.

### External Technical Evidence

1. Electron officially supports controlling renderer-created windows via `webContents.setWindowOpenHandler()`, including custom `createWindow(...) => WebContents` behavior:
   - [Opening windows from the renderer](https://www.electronjs.org/docs/latest/api/window-open)
   - [WindowOpenHandlerResponse Object](https://www.electronjs.org/docs/latest/api/structures/window-open-handler-response)
2. Electron’s `setWindowOpenHandler()` can return `action: 'allow'` with a custom `createWindow` callback that returns another `WebContents`, which is the stronger fit for real popup/browser semantics than denying the popup and synthesizing a second tab later:
   - [webContents: setWindowOpenHandler](https://www.electronjs.org/docs/latest/api/web-contents)
3. Electron requires the created guest content to be connected to the popup `options` object passed into `createWindow(...)`, and `WebContentsView` can adopt an existing `webContents`:
   - [WindowOpenHandlerResponse Object](https://www.electronjs.org/docs/latest/api/structures/window-open-handler-response)
   - [WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)
4. Electron security guidance recommends denying unexpected new windows by default, which explains why the v1 implementation chose the blanket block:
   - [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)
5. Google OAuth policy explicitly warns that OAuth requests from embedded user agents may be rejected with `disallowed_useragent`, so social/OAuth support must be documented as best-effort rather than guaranteed:
   - [Google OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
   - [OAuth for Client-side Web Apps: disallowed_useragent](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)

## Findings

1. The original X + Google login failure was caused by the hard popup block in Preview, and that part has already been removed.
2. The new packaged-app failure is narrower: the popup `createWindow(...)` callback returns a `WebContents` that is not connected to Electron's passed popup `options`, which violates Electron's contract and crashes in main.
3. Supporting browser-like `window.open()` behavior is still technically feasible within the current Preview-shell architecture and does not require abandoning `WebContentsView`.
4. The correct fit is `allow + createWindow(options)` with a child `WebContentsView` that adopts `options.webContents` when Electron provides it.
5. The Preview shell already has most of the plumbing needed to host popup-created content as additional Preview tabs.
6. Full “real browser” parity for all social-login providers still cannot be promised because some providers may reject embedded login even after the Electron contract bug is fixed.

## Scope Judgment

This is a `Medium` ticket because:
- it requires ticketed architecture review and design updates,
- it touches the Preview session lifecycle and shell-projection behavior,
- it likely needs both implementation and executable validation updates,
- but it does not require inventing a brand-new subsystem.

## Recommended Direction

1. Keep treating user-initiated `window.open()` from Preview pages as a request to create another in-app Preview session/tab.
2. Move child-session creation into Electron’s `createWindow(options)` callback so the child `WebContentsView` adopts `options.webContents` instead of returning a separately created `WebContents`.
3. Handle the Electron `background-tab` case truthfully by creating a Preview child session manually only when `options.webContents` is absent and loading the URL ourselves.
4. Keep popup-created tabs in the same persistent Electron browser session/profile so cookie and auth state can participate in the flow.
5. Preserve existing shell-lease and multi-tab ownership rules instead of falling back to OS popup windows.
6. Record social/OAuth support as best-effort and rerun packaged-app validation after the fix.

## Risks To Design Around

1. Popup spam or non-user-initiated window creation needs explicit policy, not blanket allow.
2. The Preview shell must not break its non-stealable lease/ownership rules when a popup creates a new tab.
3. Opener-linked flows may need parent/child metadata or another bounded local structure rather than ad hoc session coupling.
