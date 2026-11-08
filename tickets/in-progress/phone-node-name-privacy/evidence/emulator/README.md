# Emulator evidence — autobyteus-433 API/E2E round 1 (API-REV-001)

Header for every file in this folder (the files themselves are raw dumps):

- Cases: API-04 … API-10 of `../../api-e2e-execution-coverage-report.md`; the file name starts with its case ID and step number.
- Commit: `8f87b1ef49` + `f7bb05f5ec` (probe-only); app and page code `ba3ba5b23e`. Debug APK sha256 `9d47eab3db264f49fb3aed37089616b00959b780085731e8ea1b241938e0c99a` (same as IMP-07); `/mobile` bundle rebuilt at 06:58Z (`API-02-builds.log`).
- Date: 2026-11-08, 07:36Z–07:58Z.
- Device: ticket-owned AVD `pnnp433_api35` (Android 15, `google_apis` arm64, `sdk_gphone64_arm64`, WebView 124.0.6367.219, 1080×2400 at 420 dpi), headless (`-no-window`), `-dns-server 127.0.0.1`. Deleted at the end (`cleanup.log`).
- Nodes: two test-owned servers from this worktree's `autobyteus-server-ts/dist/app.js`, each with its own temp data root and HOME, on `127.0.0.1:47331` (A) and `127.0.0.1:47332` (B). The emulator reached them as `10.0.2.2` through a test-only DNS responder that answered `hostbox-9f3.home.arpa`, `nodebox-2c7.home.arpa` and `hostbox-9f3.example-tailnet.ts.net` with `10.0.2.2` (only for 127.0.0.1 clients). So the phone's Host header was the real test name, as on a LAN or tailnet.
- Names: "Test Desktop" (A's pairing link), "Test Node" (B's pairing link). No user name or address was used.
- How each file was made:
  - `*.txt`: the visible texts and content descriptions of the native screen, from `uiautomator dump` (the `.xml` beside it is the raw dump). The WebView's own content does not appear in these dumps, except Chromium's error page (API-08-03, -05, -11).
  - `*.json`: a read of the `/mobile` page over WebView DevTools (`adb forward tcp:47390 localabstract:webview_devtools_remote_<pid>`). It holds the header name, state and aria label, the banner, the sheet's text, `document.body.innerText`, every `aria-label` and `title`, and the session's `nodeName`. `helloReply` is a fresh `hello` posted to `window.AutoByteusShell` and the app's answer.
  - `*.png`: `adb exec-out screencap -p`; `*-toast.png` and `*-strip.png` are frames of `adb shell screenrecord` (`*.mp4`), because a toast cannot be dumped.
  - "no address" lines: the texts were checked case-insensitively for `hostbox nodebox home.arpa example-tailnet ts.net 10.0.2.2 127.0.0.1 47331 47332 http:// https:// ://`.
- Harness (outside the repository, kept for the rerun): `/tmp/pnnp-e2e/scripts/{dns.py,cdp.mjs,ui.sh,page.sh,page-state.js,link.sh,node.sh}`.
