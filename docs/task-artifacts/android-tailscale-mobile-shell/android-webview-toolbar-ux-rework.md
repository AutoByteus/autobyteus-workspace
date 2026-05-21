# Android WebView Toolbar UX Rework

## Status

Design-impact / implementation rework requested on 2026-05-21 after user review of live Android screenshots.

## User Feedback

The current Android app shows a tall native header above the mobile web shell:

- title: `AutoByteus · AutoByteus Desktop`
- URL: `http://.../mobile`
- buttons: `EDIT NODE`, `RETRY`, `BROWSER`

The user flagged this as poor use of screen space because it pushes the actual AutoByteus mobile content downward. The desired product feel is an app-like full-screen mobile shell, not a browser wrapper with a permanent control bar.

## Root Cause Found

The header is native Android wrapper chrome, not the `/mobile` web page and not Android system UI.

Current implementation path:

- `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/WebShellScreen.kt`
- `WebShellScreen.render()` always calls `root.addView(toolbar(profile, callbacks))` before adding the WebView content.
- `toolbar()` renders two `TextView`s and a horizontal row with three standard Android `Button`s: `Edit node`, `Retry`, and `Browser`.

Those controls are useful recovery/utility actions, but the implementation currently displays them permanently in healthy WebView state.

## Design Decision

Healthy WebView state must be full-screen/immersive for the existing `/mobile` shell.

Do not reserve persistent top layout space for native wrapper controls when the saved node is reachable and no diagnostic is active. The existing mobile web shell already owns its own header/navigation and should get the available application viewport.

## Required Implementation Change

1. Rework `WebShellScreen.render()` so, when `diagnostic == null`, it returns a layout where the WebView occupies the full usable app content area.
2. Remove the permanent native toolbar from healthy WebView state.
3. Keep native utility actions available through one of these acceptable patterns:
   - diagnostic overlay only;
   - connection screen after explicit re-entry/reset;
   - compact overflow menu or bottom sheet that overlays content and does not push content down;
   - another compact affordance approved by the same principle.
4. The diagnostic/error state may still show prominent Retry/Edit/Open actions because recovery is the primary task in that state.
5. Do not weaken `TrustedNavigationPolicy`, WebView security, saved-node persistence, or existing `/mobile` ownership while making the UI change.

## Acceptance Check

- With a saved reachable node and active WebView, screenshot/UI inspection shows no persistent native `EDIT NODE`, `RETRY`, or `BROWSER` header above the mobile web content.
- The `/mobile` content begins at the app's usable top inset and uses the reclaimed vertical space.
- Recovery actions are still reachable when a diagnostic occurs or through the selected compact re-entry/overflow pattern.
- No backend, mobile web run/chat, or pairing protocol behavior changes are introduced.

## Updated Upstream Artifacts

- Requirements: added `REQ-ANDROID-UX-021` and `AC-ANDROID-UX-015`.
- Investigation notes: recorded the implementation root cause in `WebShellScreen.kt`.
- Design spec: added full-screen healthy WebView guidance, file responsibility updates, migration step `7A`, and implementation guidance.
