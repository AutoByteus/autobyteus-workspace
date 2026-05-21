# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready, with UX refinement added on 2026-05-21 after user review of the live Android WebView chrome. Revalidated on 2026-05-21 after refreshing `origin`; `origin/personal` remains `9a27e3d2 chore(ticket): record mobile chat flow finalization`. The user wants an Android app/app-shell ticket that reuses existing AutoByteus mobile web and Phone Access over Tailscale. The Android app is a client shell around the existing mobile UI, not a new backend, not a local runtime, and not a refactor of core agent/team/run logic. The current user instruction authorizes routing to architecture review if the ticket/design is valid; solution-designer review found the requirements and design valid for review. User feedback now clarifies that healthy WebView content must use the full screen and must not be pushed down by a permanent native header containing Edit Node / Retry / Browser controls.

## Goal / Problem Statement

AutoByteus already has a phone-first mobile web shell served under `/mobile` and a Phone Access pairing protocol. The user can currently open the mobile URL in Android Chrome, pair with the desktop node, and control the desktop when the URL is reachable. The requested product improvement is to package this into an Android app experience for travel:

1. at home, the user prepares a stable private URL for the desktop AutoByteus node, preferably through Tailscale MagicDNS or Tailscale Serve;
2. the user pairs the phone once by QR/link/manual URL while that stable URL is reachable;
3. the Android app remembers the saved node URL/profile;
4. while traveling, the user connects the phone to Tailscale and opens the app;
5. the app loads the saved AutoByteus `/mobile` shell and the existing mobile session controls the home desktop node.

This should feel like a simple Android product app while preserving the current core architecture: the backend/server, remote-access authorization, mobile web shell, runs, agents, teams, files, tools, and chat remain owned by existing AutoByteus systems.

## Investigation Findings

- Latest base branch used for this ticket: `origin/personal` at `9a27e3d2`.
- Existing `autobyteus-web/docs/remote_access.md` explicitly states that Android/iOS native wrappers can reuse the same pairing and transport protocol later.
- Existing mobile shell is mounted under `/mobile` and owns mobile Home, Chat, Runs, Files, Tools, and Activity. The latest finalized mobile run UX already supports configure-then-chat, mobile runtime/model selection, and team focus in the appropriate work tabs.
- Existing desktop `PhoneAccessCard.vue` lets the user enable Phone Access, choose a reachable server URL, enter a manual/private-network URL, create a pairing QR/link, and revoke/list paired phones.
- Existing backend pairing creates a `/mobile?pairing=<payload>` URL. The pairing payload contains `serverBaseUrl`, a short-lived code, expiry, and server name.
- Existing mobile session store exchanges the pairing code with `/rest/remote-access/pairing-exchanges`, stores the returned credential in browser `localStorage` under the mobile web origin, and derives REST/GraphQL/WebSocket endpoints from the paired base URL.
- Existing remote-access status endpoint `/rest/remote-access/status` is public health/status for reachability checks and returns Phone Access state, pairing availability, compatibility version, and server name.
- Later implementation inspection found `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/WebShellScreen.kt` rendered a permanent native toolbar above all healthy WebView content. That toolbar exposes useful recovery actions, but as steady-state chrome it duplicates the mobile web shell's own UI, consumes significant vertical space, and should be moved to diagnostic/overflow surfaces.
- No Android project, Gradle files, or Android manifest currently existed at bootstrap; the implementation branch now contains an Android project that must receive the UX rework.
- No explicit mobile PWA manifest/service-worker app-shell files were found. The mobile web build exists via `pnpm -C autobyteus-web build:mobile-web`.
- Tailscale MagicDNS provides stable tailnet device names/FQDNs, and Tailscale Serve can expose a local port as an HTTPS URL within the tailnet. Tailscale Android split tunneling can exclude apps from tailnet routing, so the Android app must warn users when routing appears unavailable.
- Android WebView supports loading remote web content with `loadUrl` and requires the `INTERNET` permission. Android WebView security guidance requires strict URI scheme/host validation and careful avoidance/origin restriction of native JavaScript bridges.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / packaging and app-shell integration.
- Initial design issue signal (`Yes`/`No`/`Unclear`): No core AutoByteus design issue found. There is a product packaging/access gap.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for the existing mobile/Phone Access core. Boundary Or Ownership Issue only if someone tries to implement Android as a new mobile runtime or duplicate backend/client core.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely not needed for core systems. The implementation should add a new Android shell and small, explicit web/mobile app-shell/doc seams only.
- Evidence basis: Existing Phone Access already owns remote authorization and pairing; existing `/mobile` already owns phone UI and run/chat behavior; Android only needs a saved-node launcher, WebView containment, QR/link/manual entry, diagnostics, and package/build docs.
- Requirement or scope impact: The ticket must explicitly reject backend/runtime/core changes and duplicate mobile UI implementations. The Android wrapper must also avoid permanent native WebView chrome in healthy states so it behaves like an app container for the mobile shell rather than a browser-with-toolbar wrapper.

## Recommended Product Shape

- Implement a native Android WebView shell first, not a Trusted Web Activity, because the app must load a user-selected private tailnet/LAN URL rather than one public verified domain.
- Use existing `/mobile` as the Android app content. Do not bundle a separate copy of the mobile UI into the APK for normal operation; loading the desktop-served `/mobile` preserves same-origin API/WS/session behavior.
- Recommend Tailscale Serve HTTPS for the smoothest travel journey: `https://<desktop-machine>.<tailnet>.ts.net/mobile`.
- Allow direct MagicDNS/tailnet-IP HTTP private URLs for development/private-network fallback, but prefer HTTPS and require explicit user acknowledgement for HTTP.
- Make the first-run Android screen a connection profile screen with three entry paths: scan QR, paste pairing link, or enter server/mobile URL.
- After a node opens successfully, make the WebView content use the available app viewport. Do not show a persistent native title/URL/action toolbar above the healthy mobile web shell.
- Keep Edit Node, Retry, Browser/Open externally, and Tailscale recovery actions available from a diagnostic overlay, connection screen, or a compact overflow/bottom-sheet affordance that does not reserve vertical layout space during normal use.
- Save the stable node profile URL natively so the user does not need to scan again while traveling.
- Let the existing mobile web store and use the Phone Access credential. If native credential storage is implemented, it must be a narrow, origin-restricted adapter; otherwise leaving credentials in WebView localStorage is acceptable for MVP and must be documented.
- Add lightweight mobile web/PWA app-shell metadata so browser users can install the mobile shell, but do not introduce offline/service-worker caching in this ticket unless a safe no-stale-auth cache strategy is designed.
- Do not attempt to read the official Tailscale app's device list in the MVP. Users can manually paste/select the desktop URL shown by Tailscale/MagicDNS/Serve.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

This is mostly client shell and packaging work, but it crosses Android project bootstrapping, WebView security, native saved-node state, QR/link/manual pairing UX, existing mobile web pairing, Tailscale-oriented docs, light PWA metadata, and Android/Tailscale validation.

## In-Scope Use Cases

- UC-ANDROID-001: First-time Android user pairs with a desktop AutoByteus node by scanning or opening an existing Phone Access QR/link.
- UC-ANDROID-002: Android user manually enters or pastes a Tailscale/MagicDNS/Tailscale Serve URL and the app validates reachability.
- UC-ANDROID-003: Returning Android user opens the app while traveling, Tailscale is connected, and the app loads the saved AutoByteus mobile shell without requiring a new scan.
- UC-ANDROID-004: Android user sees actionable troubleshooting when the saved node is unreachable, Phone Access is disabled, credentials are revoked, WebSocket is blocked, or Tailscale is not routing the app.
- UC-ANDROID-005: Android user can switch/re-pair/remove saved AutoByteus nodes.
- UC-DESKTOP-ACCESS-006: Desktop Phone Access guides users toward stable Tailscale URLs without changing core remote-access authorization.
- UC-PWA-007: A phone browser user can install/open the mobile shell as an app-like PWA shell when served from a reachable desktop node.
- UC-BUILD-008: Developers can build and install an Android debug/release artifact from repository instructions.

## Out of Scope

- Running AutoByteus backend, agents, team runtimes, LLM runtimes, workspaces, or tools locally on Android.
- Public internet exposure or Tailscale Funnel.
- Implementing a Tailscale VPN client inside AutoByteus Android.
- Reading Tailscale's signed-in device list from the official Tailscale Android app.
- Tailscale API/admin OAuth device discovery in the MVP.
- iOS app packaging.
- Push notifications/background run control.
- Replacing the existing Phone Access pairing protocol.
- Replacing, forking, or duplicating the existing mobile web UI in native Android.
- Changing backend core agent/team/runtime/run/chat semantics.
- Offline mobile operation or service-worker caching of authenticated AutoByteus content.

## Functional Requirements

- REQ-ANDROID-SHELL-001: Add a standalone Android app package/project that can be built independently from the Electron desktop app.
- REQ-ANDROID-SHELL-002: The Android app must load the existing AutoByteus mobile web shell in a WebView using a saved or newly entered `/mobile` URL.
- REQ-ANDROID-SHELL-003: The WebView must support required web app capabilities for the existing mobile shell: JavaScript, DOM storage/session persistence, REST/GraphQL calls, WebSockets, file/download handling as needed by mobile features, and normal back navigation.
- REQ-ANDROID-SHELL-004: The Android shell must not implement agent/team/runtime/run/chat behavior locally. It is a client to a desktop/server node.
- REQ-ANDROID-PAIR-005: The Android app must provide first-run connection options: scan QR, paste QR/link, or manually enter a server/mobile URL.
- REQ-ANDROID-PAIR-006: When a QR/link is provided, the app must load the existing `/mobile?pairing=...` flow or call the existing pairing flow without inventing a separate protocol.
- REQ-ANDROID-PAIR-007: After successful QR/link parsing or URL validation, the app must remember the saved node/mobile URL and reopen it by default on subsequent launches.
- REQ-ANDROID-PAIR-008: The app must support removing/resetting the saved node and pairing another node.
- REQ-ANDROID-TAILSCALE-009: The recommended setup path must support Tailscale MagicDNS or Tailscale Serve URL shapes, especially `https://<machine>.<tailnet>.ts.net/mobile`.
- REQ-ANDROID-TAILSCALE-010: The app must detect connection failure to the saved URL and show Tailscale-specific recovery hints: connect Tailscale, ensure the desktop is online, ensure Phone Access is enabled, ensure this Android app is not excluded by split tunneling, and verify the saved URL.
- REQ-DESKTOP-TAILSCALE-011: Desktop Phone Access documentation or UI copy must guide users to prefer stable Tailscale/MagicDNS/Tailscale Serve URLs for Android travel pairing.
- REQ-SECURITY-012: The app must restrict WebView navigation to the saved AutoByteus node origin and expected mobile/remote-access/API/WebSocket routes; unrelated external links must open outside the WebView.
- REQ-SECURITY-013: The app must not add broad JavaScript bridges to untrusted pages. If a native storage/status bridge is introduced, it must be origin-restricted and callable only from the saved AutoByteus mobile origin.
- REQ-SECURITY-014: The app must use HTTPS URLs by default in the recommended Tailscale Serve path. HTTP tailnet/LAN URLs may be allowed only with explicit user acknowledgement for private-network development/MVP use.
- REQ-STORAGE-015: Saved node metadata must persist in Android app storage. Sensitive Phone Access credentials must either remain in existing WebView/mobile web storage as an explicit MVP limitation or move through a narrowly scoped native secure storage adapter.
- REQ-BUILD-016: Add developer documentation for building, installing, and smoke-testing the Android app with a Tailscale-connected desktop node.
- REQ-VALIDATION-017: Add tests or manual validation scripts covering URL normalization, saved-node restore, QR/link input handling, WebView navigation allowlist behavior, connection diagnostics, PWA metadata, and packaging smoke checks.
- REQ-VALIDATION-017A: Add a real-device Android/Tailscale E2E validation procedure for API/E2E using a USB-connected Android phone with Tailscale installed and signed in, `adb` available on the computer, a reachable AutoByteus desktop/server node running, and Phone Access enabled. The procedure must include APK install, app data reset, launch, saved URL setup, pairing, reopen/restore, unreachable-node diagnostic, and evidence capture via `adb`, screenshots, logs, and backend run/status checks.
- REQ-VALIDATION-017B: Define two valid desktop-node test modes: (a) development-node mode, where API/E2E starts or uses the repository's desktop/server development stack that serves `/mobile` and remote-access endpoints; and (b) packaged-Electron mode, where API/E2E runs a built Electron desktop app. Development-node mode is sufficient for iterative Android wrapper validation; packaged-Electron mode is required for final release smoke when the ticket claims packaged desktop + Android end-user readiness.
- REQ-NOREG-018: Existing mobile web, desktop Electron, backend Phone Access, and core run/chat behavior must not regress.
- REQ-PWA-SHELL-019: Add minimal mobile web app-shell metadata for browser installability: manifest, app name, icons, standalone display mode, and mobile route head link. Do not add offline authenticated caching in this ticket.
- REQ-ANDROID-ORIGIN-020: Documentation and app copy must explain that the user should pair using the same stable URL they expect to use while traveling; changing from a LAN origin to a Tailscale origin can require re-pairing because WebView/localStorage credentials are origin-scoped.
- REQ-ANDROID-UX-021: In healthy WebView states, the Android app must give the existing `/mobile` shell the full available application viewport and must not render a permanent native title/URL/button toolbar that pushes web content downward. Native actions such as Edit Node, Retry, Browser/Open externally, and Tailscale recovery must be available only through diagnostic UI, the connection screen, or a compact non-layout-reserving overflow/bottom-sheet affordance.

## Acceptance Criteria

- AC-ANDROID-SHELL-001: A developer can build an Android debug artifact from the repository and install it on an Android device or emulator.
- AC-ANDROID-SHELL-002: On first launch with no saved node, the app shows a native connection screen instead of a blank WebView.
- AC-ANDROID-PAIR-003: Scanning or pasting an existing Phone Access QR/link opens the existing mobile pairing flow and results in a usable paired mobile session.
- AC-ANDROID-PAIR-004: Manually entering `https://<machine>.<tailnet>.ts.net/mobile` or a base node URL validates `/rest/remote-access/status` and saves the node when reachable.
- AC-ANDROID-RETURN-005: After pairing through the stable Tailscale URL, closing and reopening the app while on another network but connected to Tailscale loads the saved mobile shell without requiring another QR scan.
- AC-ANDROID-TROUBLE-006: When Tailscale is disconnected or the node is unreachable, the app shows actionable recovery copy and a retry/open Tailscale action rather than a raw WebView error page.
- AC-ANDROID-TROUBLE-007: If Phone Access is disabled or the device credential is revoked, the app shows the existing mobile diagnostic or a native wrapper diagnostic with a clear re-pair/reset action.
- AC-ANDROID-NAV-008: Links to the saved AutoByteus origin stay inside the WebView; unrelated external links open in the system browser.
- AC-SECURITY-009: No native JavaScript interface is available to arbitrary external origins.
- AC-STORAGE-010: Saved node URL survives app restart. Credential storage behavior is documented and, if native secure storage is implemented, verified by unit/instrumentation test.
- AC-DESKTOP-TAILSCALE-011: Phone Access docs/UI show the recommended Tailscale/MagicDNS/Tailscale Serve setup and clarify that the first pairing should use the stable travel URL.
- AC-NOREG-012: Existing Phone Access web/PWA pairing tests still pass, and no backend agent/team/runtime tests require changes for the Android wrapper.
- AC-ANDROID-E2E-012A: With a physical Android phone connected by USB, visible in `adb devices`, and connected to the same Tailscale tailnet as the desktop/server node, API/E2E can install the debug APK, launch it, pair through a stable Tailscale URL, reopen the app after force-stop, confirm the existing `/mobile` session restores, and capture validation evidence.
- AC-ELECTRON-SMOKE-012B: API/E2E records which desktop-node mode was used. If packaged-Electron mode is in release scope or a packaged desktop build is available, API/E2E runs at least one smoke path against the packaged Electron app to confirm the packaged server serves `/mobile`, Phone Access QR/link creation works, and the Android app can pair/open through that packaged node.
- AC-PWA-SHELL-013: A mobile browser can discover the mobile web manifest for `/mobile`; no offline service worker caches authenticated content.
- AC-ORIGIN-014: Manual validation or documentation demonstrates that pairing with LAN URL and reopening with a different Tailscale origin may require re-pairing, while pairing with the stable Tailscale URL works across travel.
- AC-ANDROID-UX-015: When a saved node is reachable and the WebView is active without a diagnostic, screenshots or UI inspection show no persistent native Edit Node / Retry / Browser header above the mobile web shell; the web content starts at the app's usable top inset and existing native recovery actions remain reachable through diagnostic/overflow/re-entry paths.

## Real-Device API/E2E Validation Setup

The API/E2E phase should treat a USB-connected Android phone with Tailscale installed as the preferred live validation environment when the user provides it. Required setup:

1. Desktop computer is running the latest ticket build of AutoByteus desktop/server.
2. Desktop computer is signed into Tailscale and reachable by MagicDNS or Tailscale Serve.
3. Android phone is signed into the same Tailscale tailnet and AutoByteus Android is not excluded by Android Tailscale split tunneling.
4. Computer has `adb` installed and `adb devices` shows the phone as `device`.
5. Phone Access is enabled on the desktop/server node.
6. The QR/link or manual entry uses the same stable Tailscale URL expected for travel, preferably `https://<machine>.<tailnet>.ts.net/mobile`.

Desktop-node modes for live E2E:

- **Development-node mode:** API/E2E may run the repository development stack or an already-running AutoByteus desktop/server node, as long as it serves `/mobile`, `/rest/remote-access/*`, GraphQL, and WebSocket endpoints through the same stable Tailscale URL. This mode does **not** require building the Electron app and is the preferred fast iteration path.
- **Packaged-Electron mode:** API/E2E launches a built Electron desktop app and runs at least one smoke scenario through its bundled server/mobile-web assets. This is required only when final release readiness includes the packaged desktop application, or when the Android ticket could be affected by packaged `/mobile` asset serving. The API/E2E engineer may use a prebuilt Electron artifact from delivery/CI; they do not need to rebuild Electron themselves unless no valid packaged artifact exists.

Minimum live E2E scenarios:

- Build/install: build debug APK, install with `adb install`, launch with `adb shell am start`.
- First-run setup: clear app data, open the app, enter/paste the stable Tailscale URL or pairing link, and verify the WebView opens `/mobile`.
- Pairing: pair via pasted QR/link or QR scan and confirm the mobile shell reaches Home/Chat. Pasted link is acceptable for deterministic automation; camera QR scan may remain a manual smoke check.
- Restore: force-stop the app, reopen it, and verify the saved node opens without another QR scan.
- Travel simulation/reachability: keep phone on Tailscale while not relying on LAN-only URL; validate the stable tailnet URL works. If practical, test with Wi-Fi disabled or on a different network.
- Failure diagnostic: disconnect Tailscale or use an unreachable saved URL and verify native recovery copy appears instead of a raw WebView error.
- Evidence: capture `adb logcat` excerpt, screenshots/screen recording, installed version/build, selected URL shape, backend status/pairing evidence, and any run/chat smoke evidence.

This live validation can be partly automated through Android instrumentation/UIAutomator, but the requirement is not that every step be fully headless. The API/E2E engineer should classify any inability to access a physical phone or tailnet as an environment limitation, not as a product failure.

## Constraints / Dependencies

- Android app depends on the official Tailscale app or another tailnet client being connected; AutoByteus Android must not implement Tailscale VPN itself.
- Desktop AutoByteus must be running, awake, and reachable through the selected tailnet/LAN/private-network URL.
- Existing app-level Phone Access credentials remain required. Tailscale reachability alone is not sufficient authorization.
- Preferred production travel URL is HTTPS via Tailscale Serve; plain HTTP private URLs are secondary and should be user-acknowledged.
- Android WebView must be maintained as a wrapper around existing `/mobile`; do not fork a separate Android-native AutoByteus UI.
- Credential persistence is origin-sensitive if the MVP keeps credentials in WebView localStorage.

## Assumptions

- The existing mobile web shell remains usable in Android WebView once loaded.
- Users who want travel access can keep their home desktop awake, online, running AutoByteus, and signed into Tailscale.
- Tailscale MagicDNS is enabled for most tailnets or can be enabled by the user/admin.
- Tailscale Serve can proxy the desktop AutoByteus local service to an HTTPS tailnet URL when configured by the user.
- The first Android release may be distributed as a sideload/debug/internal build before Play Store packaging.

## Risks / Open Questions

- Whether to use pure native Kotlin/Compose WebView or Capacitor. Recommendation: native Kotlin/Compose WebView for Android-only MVP; reconsider Capacitor only if iOS parity becomes immediate.
- Whether to implement native secure storage for remote-access credentials in the first ticket or keep existing WebView localStorage for MVP. Native secure storage is better but needs a carefully origin-restricted bridge.
- Android WebView mixed-content and cleartext behavior may complicate HTTP private URLs. Prefer HTTPS Tailscale Serve.
- Tailscale Serve setup cannot be fully automated from AutoByteus without OS-specific permission and Tailscale CLI considerations; MVP should guide/copy commands rather than silently configuring it.
- Wake/sleep of the home computer is outside the Android app's control.

## Requirement-To-Use-Case Coverage

- UC-ANDROID-001: REQ-ANDROID-SHELL-001, REQ-ANDROID-SHELL-002, REQ-ANDROID-PAIR-005, REQ-ANDROID-PAIR-006, REQ-STORAGE-015
- UC-ANDROID-002: REQ-ANDROID-PAIR-005, REQ-ANDROID-PAIR-007, REQ-ANDROID-TAILSCALE-009, REQ-ANDROID-ORIGIN-020
- UC-ANDROID-003: REQ-ANDROID-PAIR-007, REQ-ANDROID-TAILSCALE-009, REQ-ANDROID-TAILSCALE-010, REQ-ANDROID-ORIGIN-020, REQ-ANDROID-UX-021
- UC-ANDROID-004: REQ-ANDROID-TAILSCALE-010, REQ-SECURITY-012, REQ-SECURITY-014, REQ-ANDROID-UX-021
- UC-ANDROID-005: REQ-ANDROID-PAIR-008
- UC-DESKTOP-ACCESS-006: REQ-DESKTOP-TAILSCALE-011, REQ-ANDROID-ORIGIN-020
- UC-PWA-007: REQ-PWA-SHELL-019
- UC-BUILD-008: REQ-BUILD-016, REQ-VALIDATION-017, REQ-VALIDATION-017A, REQ-VALIDATION-017B

## Acceptance-Criteria-To-Scenario Intent

- AC-ANDROID-SHELL-001 validates build/package bootstrap.
- AC-ANDROID-SHELL-002 validates first-run native app shell.
- AC-ANDROID-PAIR-003 validates QR/link reuse of existing pairing.
- AC-ANDROID-PAIR-004 validates manual Tailscale URL entry.
- AC-ANDROID-RETURN-005 validates travel scenario after one-time setup.
- AC-ANDROID-TROUBLE-006 and AC-ANDROID-TROUBLE-007 validate actionable diagnostics.
- AC-ANDROID-NAV-008 and AC-SECURITY-009 validate WebView containment.
- AC-STORAGE-010 validates saved-node persistence and credential storage decision.
- AC-DESKTOP-TAILSCALE-011 validates desktop/user journey guidance.
- AC-NOREG-012 validates this is not a core backend/runtime change.
- AC-ANDROID-E2E-012A validates the live phone + Tailscale + adb end-to-end path that the user intends API/E2E to run.
- AC-ELECTRON-SMOKE-012B validates that the desktop-node environment used for testing is explicit, and that packaged Electron receives a smoke test when release readiness requires it.
- AC-PWA-SHELL-013 validates browser installability metadata without unsafe offline caching.
- AC-ORIGIN-014 validates stable-origin travel guidance.
- AC-ANDROID-UX-015 validates full-screen healthy WebView use and prevents native app chrome from wasting vertical space in the main mobile shell.

## Approval Status

Approved for architecture review by current user instruction on 2026-05-21: assess the ticket/design, improve if needed, and send to architecture reviewer if valid. Solution-designer review found the requirements/design valid. Updated on 2026-05-21 after user UX feedback to add the full-screen healthy WebView requirement (`REQ-ANDROID-UX-021`, `AC-ANDROID-UX-015`).
