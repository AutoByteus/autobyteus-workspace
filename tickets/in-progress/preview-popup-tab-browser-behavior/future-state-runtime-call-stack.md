# Future-State Runtime Call Stack

- Ticket: `preview-popup-tab-browser-behavior`
- Version: `v2`
- Date: `2026-04-02`
- Basis: [proposed-design.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/proposed-design.md)

## Scope

This artifact models the future-state runtime behavior after popup/new-window requests are converted into in-app Preview tabs through Electron’s real popup creation hook instead of being denied.

## Use Cases

- `UC-001`: X page requests Google sign-in popup from inside Preview
- `UC-002`: Generic preview page requests a new browsing tab via `window.open()`

## UC-001: X Page Requests Google Sign-In Popup

### Execution Spine

`Preview Page WebContents -> PreviewViewFactory popup callback -> PreviewSessionManager popup flow -> PreviewShellController -> WorkspaceShellWindow -> Renderer Preview UI`

### Step Trace

1. User or page interaction inside the active X Preview tab triggers a Google auth popup request.
2. The active preview view’s `setWindowOpenHandler(...)` path receives the popup details.
3. `PreviewViewFactory` forwards a normalized popup request to the `PreviewSessionManager` callback boundary.
4. `PreviewSessionManager` validates the popup request:
   - allowed protocol set
   - opener session exists and is open
   - popup request should become a child Preview session
5. `PreviewSessionManager` creates a new Preview session backed by another `WebContentsView` in the same persistent Electron browser session/profile.
6. `PreviewSessionManager` returns the child view’s `webContents` through Electron’s `createWindow(...)` contract so popup semantics are preserved.
7. The child session begins loading the popup target URL inside that child `webContents`.
8. `PreviewSessionManager` emits a `popup-opened` event containing:
   - opener session ID
   - child session summary
9. `PreviewShellController` receives the event.
10. `PreviewShellController` looks up the opener session’s lease owner shell.
11. `PreviewShellController` claims the child session lease for that same shell.
12. `PreviewShellController` appends the child session ID to that shell’s Preview session list and marks it active.
13. `PreviewShellController` applies shell projection:
    - update host bounds for the child session
    - attach the child session view into the shell host area
14. `PreviewShellController` publishes the updated shell snapshot.
15. Renderer Preview UI receives the snapshot and renders the child session as a new Preview tab.
16. The Google auth page is now visible inside the Preview tab strip instead of being blocked.
17. If the provider completes inside embedded Preview, the auth flow proceeds normally.
18. If the provider rejects embedded user agents, the page itself surfaces that provider rejection; Preview does not misreport success.

### Governing Owners

- Session lifecycle: `PreviewSessionManager`
- Shell lease/projection: `PreviewShellController`
- Native host attachment: `WorkspaceShellWindow`

### Return/Event Spine

`PreviewSessionManager popup-opened event -> PreviewShellController state update -> preview-shell:snapshot-updated IPC -> Renderer Preview UI`

### Bounded Local Spine

Parent owner: `PreviewSessionManager`

`window-open details -> popup request normalization -> popup allow/deny decision -> child session + child webContents creation -> popup-opened event`

## UC-002: Generic `window.open()` Creates Another Preview Tab

### Execution Spine

`Preview Page WebContents -> PreviewViewFactory popup callback -> PreviewSessionManager -> PreviewShellController -> Renderer Preview UI`

### Step Trace

1. A previewed page calls `window.open('https://example.com/next')`.
2. The preview view’s popup callback fires.
3. `PreviewViewFactory` forwards the popup request to the `PreviewSessionManager`.
4. `PreviewSessionManager` creates a child Preview session for `https://example.com/next`.
5. `PreviewSessionManager` returns the child `webContents` through `createWindow(...)`.
6. The child session loads in the same persistent Electron browser session/profile.
7. `PreviewSessionManager` emits `popup-opened`.
8. `PreviewShellController` attaches the child session to the opener shell and makes it active.
9. Renderer Preview UI shows a new Preview tab for the child session.
10. Existing Preview tools can now operate on that child session by `preview_session_id`.

## Failure / Policy Paths

### FP-001: Disallowed Popup Protocol

1. Popup request arrives with a disallowed or unsupported protocol.
2. `PreviewSessionManager` denies it through the popup boundary.
3. No child session is created.
4. An internal warning is logged.
5. Existing Preview tab remains unchanged.

### FP-002: Popup Originates From Session Without Shell Lease

1. Popup request arrives from an opener session that is not currently leased to a shell.
2. `PreviewSessionManager` may still create the child session.
3. `PreviewShellController` cannot auto-attach it to a shell without a lease owner.
4. The session remains unleased until explicitly focused/attached later, or the implementation may deny this path if that produces a cleaner invariant.

### FP-003: Provider Rejects Embedded OAuth

1. Popup-created tab opens correctly.
2. Provider detects embedded user agent and rejects the auth flow.
3. The rejection is shown in the popup-created Preview tab.
4. The system records the limitation as a best-effort provider compatibility limit, not a Preview routing failure.

## Invariants

1. Popup-created tabs must not bypass `PreviewSessionManager` for session creation.
2. Popup-created tabs must not bypass `PreviewShellController` for shell attachment and activation.
3. Popup-created tabs must reuse the same Electron browser session/profile as the opener tab.
4. Popup-created tabs must remain inside the existing Preview shell UX, not separate OS windows.
5. Existing Preview tools continue to address popup-created tabs by `preview_session_id`.
