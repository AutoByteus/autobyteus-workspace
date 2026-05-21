# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements and design revalidated. A user-identified Android WebView chrome UX issue was investigated on 2026-05-21 and converted into a design/implementation rework requirement.
- Investigation Goal: Bootstrap an Android wrapper/app-shell ticket that reuses existing AutoByteus mobile web and Phone Access over Tailscale, without changing core agent/team/runtime behavior.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The target is mostly packaging/app-shell work, but it crosses Android WebView, native app state, QR/manual pairing UX, existing remote-access protocol, PWA metadata, Tailscale guidance, and validation.
- Scope Summary: Add an Android app shell that loads the existing `/mobile` web app through saved Tailscale/private-network node URLs, with one-time pairing and reconnect/troubleshooting UX.
- Primary Questions Resolved:
  - Existing mobile web/Phone Access already provides the core remote-control protocol.
  - Android should wrap existing mobile web, not implement a full native AutoByteus UI.
  - Travel access should use one stable URL selected before pairing, preferably Tailscale Serve HTTPS or MagicDNS.
  - The app should not integrate with Tailscale APIs or read official Tailscale app device lists in MVP.
  - WebView security requires trusted-origin navigation, careful cleartext handling, and no broad JavaScript bridges.
  - Healthy WebView states should be full-screen/immersive for the existing `/mobile` shell; recovery controls should not be a permanent top toolbar.

## Request Context

The user wants an Android app because the mobile web experience already exists and can control the Electron/home desktop node. The app should make travel use fluid: pair once at home using a stable Tailscale URL, then while traveling connect the phone to Tailscale and open the app to reach the saved home desktop node. The app should not run AutoByteus locally or change core backend/agent/runtime behavior.

The user explicitly requested that the ticket bootstrap come from the main repository `origin/personal` because the prior mobile ticket was finalized there. The user also requested that design principles and common design best-practice documents be reloaded before producing the design.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Main Repo Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell`
- Current Branch: `codex/android-tailscale-mobile-shell`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell`
- Bootstrap Base Branch: `origin/personal`
- Latest Base Commit: `9a27e3d2 chore(ticket): record mobile chat flow finalization`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-21 before latest reset.
- Task Branch: `codex/android-tailscale-mobile-shell`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: No implementation code has been changed in this ticket bootstrap. Artifacts only. On 2026-05-21 the user authorized solution-designer to route to architecture review if the ticket/design is valid; this pass found it valid.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-21 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo fetch origin --prune` | Refresh main repo remote refs before bootstrapping from `origin/personal` | Fetch succeeded. `origin/personal` at `9a27e3d2`. | No |
| 2026-05-21 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell reset --hard origin/personal` | Ensure ticket branch/worktree is based on latest finalized mobile code | Worktree reset to `9a27e3d2 chore(ticket): record mobile chat flow finalization`. | No |
| 2026-05-21 | Skill doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Reload design principles per user request | Reaffirmed data-flow spine, ownership, authoritative-boundary, off-spine concern, and no unnecessary core refactor principles. | Use in design |
| 2026-05-21 | Skill doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md` | Reload common design best-practice examples per user request | Reaffirmed spine-first design, explicit file responsibility, and avoiding helper/generic coordinator blobs. | Use in design |
| 2026-05-21 | Code/Doc | `autobyteus-web/docs/remote_access.md` | Understand current Phone Access/mobile contract after latest finalized mobile ticket | Docs now state Android/iOS native wrappers can reuse Phone Access; mobile shell owns Home/Chat/Runs/Files/Tools/Activity; run config is configure-then-chat; draft context files transfer safely; credentials in localStorage for PWA MVP; future native wrapper should move credential to secure storage. | Extend docs for Android/Tailscale journey |
| 2026-05-21 | Code | `autobyteus-web/components/settings/PhoneAccessCard.vue`, `autobyteus-web/stores/phoneAccessStore.ts` | Inspect desktop pairing surface | Desktop lets user enable Phone Access, choose candidate/manual URL, create QR/link, list/revoke devices. Existing `createPairingSession()` posts normalized server base URL. | Reuse; add Tailscale guidance/copy only |
| 2026-05-21 | Code | `autobyteus-server-ts/src/api/rest/remote-access.ts` | Inspect server endpoints | Status, address candidates, settings, pairing sessions, pairing exchanges, devices/revoke APIs already exist. No new backend endpoint needed for Android MVP. | No backend core changes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Inspect QR/link shape | `createPairingSession()` builds `/mobile?pairing=<payload>` from selected `serverBaseUrl`; QR text is the mobile URL. | Android can load scanned QR URL directly |
| 2026-05-21 | Code | `autobyteus-web/stores/mobileNodeSessionStore.ts`, `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts`, `autobyteus-web/types/remoteAccess.ts` | Inspect mobile pairing/session storage | Mobile parses URL pairing param, exchanges code, stores `MobileNodeSession` in browser localStorage, derives base URL from session. | Stable origin is critical for travel |
| 2026-05-21 | Code | `autobyteus-web/utils/nodeEndpoints.ts` | Inspect URL normalization and endpoint derivation | Web normalizes base URLs and derives REST/GraphQL/WebSocket endpoints. Android needs a Kotlin equivalent for saved URL validation/navigation; do not depend on web internals from native. | Implement Android-side normalizer |
| 2026-05-21 | Command | `find . -maxdepth 3 \( -name 'settings.gradle*' -o -name 'build.gradle*' -o -name 'gradlew' -o -name 'AndroidManifest.xml' \) -print` | Check for existing Android project | No Android project/Gradle/manifest found. | Add new `autobyteus-android/` package |
| 2026-05-21 | Command | `find autobyteus-web -maxdepth 4 \( -iname '*manifest*' -o -iname '*pwa*' -o -path '*public*' \) -print` | Check PWA manifest/app-shell state | `public/autobyteus-icon.svg` exists; no explicit mobile PWA manifest found. | Add minimal PWA metadata |
| 2026-05-21 | Web | `https://tailscale.com/docs/features/magicdns` | Verify current Tailscale MagicDNS behavior | MagicDNS registers DNS names for tailnet devices; signed-in devices can use machine names/FQDNs such as `<machine>.<tailnet>.ts.net`; newer tailnets have MagicDNS enabled by default. | Use in docs/setup |
| 2026-05-21 | Web | `https://tailscale.com/docs/features/tailscale-serve` | Verify current Tailscale Serve behavior | Serve can proxy local ports to an HTTPS tailnet URL available within the tailnet; access controls still apply; HTTPS must be enabled. | Recommend `tailscale serve <port>` journey |
| 2026-05-21 | Web | `https://tailscale.com/docs/features/client/android-app-split-tunneling` | Verify Android Tailscale app routing behavior | App-based split tunneling controls which Android apps use or bypass tailnet routing/DNS. Excluded apps will not use Tailscale. | Add troubleshooting copy |
| 2026-05-21 | Web | `https://developer.android.com/develop/ui/views/layout/webapps/webview` | Verify Android WebView basics | WebView can load URLs; app needs `INTERNET` permission; WebView supports customization. | Use for Android shell design |
| 2026-05-21 | Web | `https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges`, `https://developer.android.com/privacy-and-security/risks/unsafe-uri-loading` | Verify WebView security constraints | Native bridges can expose sensitive app capabilities; URI loading must validate scheme and host. HTTPS and allowlisted domains are recommended. | Strict navigation policy/no broad bridge |
| 2026-05-21 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell fetch origin --prune && git status --short --branch && git rev-parse --short HEAD && git rev-parse --short origin/personal` | Revalidate bootstrap base before architecture-review handoff | Fetch succeeded; task branch remains `codex/android-tailscale-mobile-shell`; `HEAD` and `origin/personal` are both `9a27e3d2`; only `docs/task-artifacts/` is untracked. | No |
| 2026-05-21 | Skill doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md` | Revalidate ticket/design against team design principles and best-practice examples before routing | Existing design follows spine-first ownership, boundary encapsulation, explicit file responsibilities, and compatibility rejection. No substantive design repair needed. | Route to architecture review |
| 2026-05-21 | Review | Current solution-designer routing pass over `requirements.md`, `investigation-notes.md`, `design-spec.md` | Determine whether ticket is valid and design is good enough for architecture reviewer | Requirements are verifiable with stable IDs; investigation records code, repo, and external-source basis; design preserves existing `/mobile` and Remote Access authority while adding a bounded Android shell. | Send upstream package to architecture reviewer |
| 2026-05-21 | User screenshot / implementation inspection | User-supplied screenshots showing top native bar with `EDIT NODE`, `RETRY`, `BROWSER`; code path `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/WebShellScreen.kt` | Find why healthy Android WebView content is pushed downward by native chrome | `WebShellScreen.render()` always calls `root.addView(toolbar(profile, callbacks))`; `toolbar()` renders title, full mobile URL, and three full-width Android `Button`s. The controls exist to expose edit/retry/external-browser recovery actions, but they are shown permanently even when the WebView is healthy. | Add UX rework requirement: no persistent native toolbar in healthy WebView; move actions to diagnostic/overflow/re-entry surfaces |

## Current System Summary

### Existing Phone Access and Mobile Web

- Desktop/Electron starts the server and exposes Phone Access in Settings -> Nodes.
- Desktop Phone Access can create a pairing session for a selected `serverBaseUrl` and renders a QR/link that points to `/mobile?pairing=<payload>`.
- Mobile web under `/mobile` parses the pairing payload, exchanges the short-lived pairing code, stores the returned credential in localStorage, binds the node context, and then uses the existing mobile shell to control server-owned work.
- Backend Phone Access owns authorization, pairing code lifecycle, paired device records, revocation, and status.

### Existing Latest Mobile UX State

The latest `origin/personal` already includes the mobile configure-then-chat work. The mobile shell can start new agent/team runs with runtime/model and workspace selection, then opens Chat for the user to send the first message. Team message focus is shown only where it applies. This Android ticket must not revisit or refactor that behavior.

### Android Gap

Bootstrap finding: there was no Android package. Android users previously used Chrome directly. The missing capability was a product app shell that remembers the stable URL, provides QR/paste/manual setup, opens the mobile shell in WebView, and gives native troubleshooting around Tailscale connectivity.

Follow-up implementation finding on 2026-05-21: the new Android shell currently renders a permanent native toolbar above the WebView through `WebShellScreen.toolbar()`. That explains the screenshots: it is not Android system UI and not the mobile web page; it is native wrapper chrome added by the Android shell. The toolbar's actions are legitimate recovery/utilities, but showing them all the time wastes vertical space and weakens the app-like experience.

### PWA Gap

The mobile web has a static/mobile build and icon asset, but no explicit mobile PWA manifest/app-install metadata was found. Browser installability can be improved without adding offline caching or changing core behavior.

## Network / Travel Model

AutoByteus Phone Access only requires that the phone can reach the desktop/server node URL selected during pairing. Tailscale is one supported private-network path, not a special backend mode.

Recommended travel model:

1. Desktop and phone both sign into the same tailnet.
2. Desktop AutoByteus is running and Phone Access is enabled.
3. User configures a stable URL before pairing, preferably Tailscale Serve HTTPS, for example `https://desktop.tailnet.ts.net/mobile`.
4. User creates/scans the QR that embeds that stable base URL.
5. Android app saves that same URL/profile.
6. While traveling, the user connects Tailscale on the phone and opens the Android app. The app loads the saved `/mobile` origin, so WebView localStorage/session still match.

Important origin detail: if the user pairs at home through `http://192.168.x.x:29695/mobile` and later opens `https://desktop.tailnet.ts.net/mobile`, the WebView origin changes. Existing browser localStorage credentials are origin-scoped, so the user may need to pair again unless a native credential bridge is intentionally implemented.

## Design Constraints From Investigation

- Do not change backend run/agent/team/runtime behavior.
- Do not create an Android-native AutoByteus UI clone.
- Do not load arbitrary external pages in the app WebView.
- Do not add broad JavaScript bridges.
- Do not reserve persistent top layout space for native WebView controls when the mobile web shell is healthy; use diagnostic overlay, overflow, or connection-screen re-entry instead.
- Prefer HTTPS Tailscale Serve for production travel.
- Keep existing mobile web as the source of product behavior.
- Any native Android saved state should own only app-shell connection profiles unless the secure credential bridge is explicitly accepted.

## API/E2E Environment Note

The user's proposed validation environment is sufficient for live end-to-end testing if all pieces are available simultaneously: Android phone connected over USB and visible to `adb`, Tailscale installed and connected on the phone, desktop computer signed into the same tailnet, an AutoByteus desktop/server node running, and Phone Access enabled. API/E2E should use this as a preferred live validation path, while still keeping unit/instrumentation tests for deterministic checks that do not require the user's physical tailnet.

Electron packaging is not required for every Android wrapper E2E run. API/E2E can use development-node mode as long as the node serves `/mobile`, `/rest/remote-access/*`, GraphQL, and WebSocket endpoints through the stable Tailscale URL. A packaged Electron smoke should be added when final release readiness includes the packaged desktop app or when a packaged desktop artifact is available from delivery/CI.

## Open Unknowns For Implementation

- Exact Android stack choice: native Kotlin/Compose WebView is recommended; Capacitor remains a future option only if iOS becomes immediate.
- Whether credential storage bridge is in first implementation. Design permits MVP localStorage with explicit docs, or secure native storage with strict origin gating.
- Whether Play Store packaging is in first ticket; initial debug/internal APK is enough unless delivery scope expands.
- Exact compact affordance for healthy-state native actions after removing the persistent toolbar: acceptable choices are an overflow menu, bottom sheet, long-press/debug affordance, or exposing actions only on diagnostic/connection screens, as long as normal content is not pushed down.
