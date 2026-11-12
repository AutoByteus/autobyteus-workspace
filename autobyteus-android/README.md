# AutoByteus Android Mobile Shell

This project builds the Android WebView shell for the existing AutoByteus `/mobile` experience. It does **not** run AutoByteus locally on Android and it does not implement agent/team/run/chat behavior natively.

## What the app owns

- the node list: a scan-first start screen (**Scan**, the saved nodes with their reachability, **Other ways to connect** with **Type an address** and **Paste a link**) and the same list as **Switch node** from inside a node's page (`ui/start/`);
- app-owned QR scanning in its own Scan screen (journeyapps `BarcodeView`), Android camera permission handling, and denial recovery (`ui/connect/ScanScreen.kt`, `shell/QrScanCoordinator.kt`);
- the connect sequence (`shell/NodeConnectionFlow.kt`): parse the scanned, pasted, shared or typed text, check the address answers, open the node's page, and save the node under the name from the QR only when the page reports a successful pairing; plain-words reasons on the Can't reach screen when it fails;
- native persistence of clean saved node entries, one per node, each with its own name and address;
- showing a node by its name, never by its address (`connection/SavedNodeEntry.kt`, `shownName`): the node list, **Switch node**, Connecting, Connected, Can't reach, the ⋮ sheet and their accessibility labels show the name from the QR or the page's pairing, else "AutoByteus node" (a typed address that never paired, or an entry whose stored name is its own host, shown as is and not rewritten). A typed node takes the QR name when its page pairs. A typed address that cannot be used says "Can't connect" without repeating it. Connection diagnostics never carry an exception's text or an address;
- reachability checks against `/rest/remote-access/status` (`shell/NodeReachability.kt` checks every saved node in parallel while the list is open);
- the shell bridge (`web/ShellBridge.kt`, `androidx.webkit` web messages): `window.AutoByteusShell`, only for the main frame of the open node's origin. The page asks it (`hello`) for the phone's model name, the number of saved nodes and the open node's name as the app shows it (`""` when it has none), reports itself ready (`pageReady`) and a pairing, asks for the node list or the scanner, and turns the VNC Viewer's desktop full screen on or off. It carries no credential and, of the entry, only the open node's name;
- saving the page's PDFs and images to the phone's Downloads (`web/DownloadsSaver.kt`, bridge message `saveFile`, autobyteus-472): only a PDF or an image under a plain file name whose extension matches its type; Android 10 and newer write straight into Downloads (`MediaStore.Downloads`, no permission), Android 8–9 use the system's Save dialog, whose pending bytes wait in the app's cache so a re-created activity still finishes the save. Base64 is decoded and the file written off the main thread; the app shows "Saved to Downloads: <name>" or "Couldn't save the file." and logs neither the bytes nor the name;
- WebView containment for the saved AutoByteus origin;
- when the open page shows (`shell/OpenPageState.kt`): only the node's own page reporting itself ready (`pageReady`) shows it or closes an overlay over it. WebView's own error page has no bridge, so a failed load (first load, reload, **Retry**, Back, also over a page that had loaded) never shows it. While any overlay is up ("Can't reach <node>", a link that can't open here, no app for a link) the WebView stays laid out but invisible under an opaque overlay, so neither a screenshot nor a screen reader gets the page or its URL; the overlay stays across **Switch node** and back. Toasts and overlays name the node, never a URL ("Opening outside AutoByteus"). An updated app therefore needs the node's updated `/mobile` page: an older page never sends `pageReady`, and the app stays on "Connecting to …";
- the system-bar, display-cutout and keyboard insets: Android 15 draws a targetSdk 35 app edge-to-edge, so each screen's root takes them as padding (`ui/SystemBarInsets.kt`); before Android 15 the window keeps the bars apart and nothing moves;
- keeping the open page across rotation, window-size changes (split screen, a foldable unfolding) and a hardware keyboard: `MainActivity` declares them in `android:configChanges`, so Android re-lays out the same WebView and page instead of recreating the screen (dark mode, language and font size still recreate it);
- desktop full screen for the page's VNC Viewer (`ui/DesktopFullScreenController.kt`): sensor landscape, even with auto-rotate off, Android's bars hidden until a swipe, and the shown screen's root dark like the viewer's stage (so the display-cutout padding is not a light strip); off gives the root its own background back and hands the orientation back to the phone's own setting (the activity declares none) and shows the bars. Whether it is on is read from the window, because Android keeps a requested orientation when it ends the app in the background. The page's request is applied only while the plain page shows (`ui/DesktopFullScreenRequest.kt`): a request that comes before the page is ready or under an overlay is remembered and applied when the plain page appears, and `off` applies at once. A new main-frame document (`onPageStarted`, its only use) or closing the page clears the request and turns full screen off; another screen, the page under an overlay included, turns it off but keeps the request, so Back to the plain page turns it on again. No permission;
- network diagnostics and recovery actions (**Open Tailscale**, **Scan again**).

The existing desktop Phone Access service still owns pairing sessions and credentials. The existing `/mobile` web shell still owns the phone's screens (the run list, the run screen, its views, New run and the connection sheet) and credential storage in WebView-local `localStorage` for this MVP.

Agent/team run setup is not native Android code. The WebView-served **Start new** flow owns the `Auto approve tools` switch, workspace selection, and **Load workspace by server path** behavior. Workspace paths entered there are absolute paths on the paired AutoByteus node or container, not paths on the Android filesystem.

## Connecting to a node

1. In the desktop AutoByteus app, open the node's window and go to **Nodes -> Phone Setup**. The desktop picks and checks the address itself and marks the best way **Recommended** (Tailscale, your VPN, a company address, or the same Wi-Fi or LAN after "Allow phones on this network?").
2. Press **Show QR code**.
3. In AutoByteus Android, tap **Scan** and scan it. The app checks the address answers and pairs: no checkbox, no device name (it uses the phone's model name), no extra tap. The node appears in the list under its own name.

For a phone that travels, install Tailscale on the computer and the phone and use the **Tailscale** tab: that address works away from home and at home. The full desktop flow is in `../autobyteus-web/docs/remote_access.md`, Connecting a phone.

Credentials are origin-scoped because the web shell stores the MVP credential in WebView localStorage, so a saved node keeps the address it was paired with.

## Entry forms

| Entry | Input | Pairs |
| --- | --- | --- |
| **Scan** | Pairing QR | At once |
| **Paste a link** | Pairing link | At once |
| Shared text from another app (`ACTION_SEND`) | Pairing link | At once; other text opens **Type an address**, pre-filled |
| **Type an address** | Plain node address | The page opens unpaired and offers its own pairing; a plain `http://` address needs the sheet's tick |

Users do not need to install a separate ZXing-compatible scanner app. Denying camera permission shows a note that the link can be pasted instead; closing the scanner returns to the node list. On a WebView without web-message support the app shows "Update Android System WebView" instead of the page.

## Build

Prerequisites:

- JDK 17+;
- Android SDK with platform 35;
- `ANDROID_HOME` pointing at the Android SDK when it is not discoverable automatically.

From the repository root:

```bash
cd autobyteus-android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug
```

The debug APK is written to:

```text
autobyteus-android/app/build/outputs/apk/debug/app-debug.apk
```

## Release signing and CI artifacts

The Android app reads release version and signing inputs from environment variables so CI can build from a tag without editing source files:

- `ANDROID_VERSION_NAME` overrides the manifest version name.
- `ANDROID_VERSION_CODE` overrides the manifest version code and must be an integer from `1` to `2100000000`.
- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

When all signing variables are present, `./gradlew :app:assembleRelease` produces a signed release APK at:

```text
autobyteus-android/app/build/outputs/apk/release/app-release.apk
```

The repository release workflow `.github/workflows/release-android.yml` decodes `ANDROID_KEYSTORE_B64` from GitHub Secrets into `ANDROID_KEYSTORE_PATH`, exports the version variables from the release tag, and publishes only signed release APK assets named like:

```text
AutoByteus_personal_android-1.3.25-release.apk
```

Manual workflow-dispatch build-only runs may upload a private debug workflow artifact named like `AutoByteus_personal_android-0.1.0-ci.123-debug.apk` when signing secrets are absent. Debug APKs must not be uploaded to GitHub Releases or surfaced by the website download flow.

The launcher icon is an Android adaptive icon. Keep foreground artwork within the common launcher safe area before packaging; the current AutoByteus foreground vector scales the logo group to `0.66` around the `54,54` viewport center so circle, rounded, and squircle masks do not crop the mark. When changing `app/src/main/res/drawable/ic_launcher_foreground.xml` or launcher mipmaps, rebuild the APK and capture resource inspection plus mask preview or device-launcher evidence.

## Install and launch with adb

```bash
adb devices
adb install -r autobyteus-android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm clear org.autobyteus.mobile
adb shell am start -n org.autobyteus.mobile/.MainActivity
```

## Implementation-scoped checks

```bash
cd autobyteus-android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:testDebugUnitTest
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug :app:compileDebugAndroidTestKotlin
```

The instrumented tests (`app/src/androidTest`: `SystemBarInsetsTest`, `WebShellWindowInsetsTest`, `AutoByteusMobileShellSmokeTest`, `MainActivityConfigurationChangeTest`, `DesktopFullScreenWindowTest`, `DownloadsSaverTest`) run on a running emulator or a connected device. No CI job runs them:

```bash
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:connectedDebugAndroidTest
```

## Real-device validation handoff

API/E2E owns live validation. Use `scripts/android-live-smoke.sh` to install, clear app data, launch, and collect initial evidence on a USB-connected Android phone. Then complete the app-owned QR scan, scan-cancel/permission, pairing, chat attachment upload, restore, stale-mobile-bundle, and unreachable-node checklist in `../docs/android_mobile_access.md`.

If a source change touches the web mobile shell, rebuild and refresh the desktop-served `/mobile` bundle as well as the APK. The Android app loads `/mobile` from the desktop/server node; installing a fresh APK alone cannot update stale packaged `mobile-web/` assets.
