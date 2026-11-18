# Emulator evidence — autobyteus-433 API/E2E round 3 (API-REV-003)

Same conventions as `../emulator/README.md` (file names, `.txt`/`.xml`/`.json`/`.png`, the address check, with `webpage ERR_` added to it for the overlay cases), with these differences:

- Commit: app and page code `60adcf3bc8` (IR-004, SR-005); worktree at `9446d19783`. Debug APK sha256 `f9b040f33e36aa88331cf5f7cf01ba89c20eebd4ab541c9bfe1aafcb50cfaca6`. `/mobile` bundle rebuilt from this tree (`../API-02-r3-builds.log`: `files with 'pageReady' in dist/public: 1`). Server `dist` from round 1 (no server source change since `ba3ba5b23e`).
- Date: 2026-11-08, 09:15Z–09:36Z.
- Device: a new ticket-owned AVD `pnnp433_api35` (Android 15, WebView 124.0.6367.219, headless), deleted at the end (`cleanup.log`).
- Nodes: A `127.0.0.1:47331` ("Test Desktop", `hostbox-9f3.home.arpa`), B `127.0.0.1:47332` (typed, then "Test Node", `nodebox-2c7.home.arpa`), typed `hostbox-9f3.example-tailnet.ts.net:47331`. The test proxy `127.0.0.1:47333` → A ("Test Server") ran with modes `pass`, `502`, `drop`, stopped (refused), and `stale`. In `stale` mode it serves `/mobile…` from a read-only copy of the installed 1.5.12-beta.8 app's `mobile-web` folder, which has no `pageReady`; the copy was deleted afterwards. Its log is `API-11-12-proxy.log`.
- Toasts: frames of `adb shell screenrecord` (`*.mp4`, `*-toast.png`, `*-strip.png`).
- `API-10-01-reopen-B-at-1-3-6-10-15s.png`: screenshots 1, 3, 6, 10 and 15 s after tapping the "Test Node" row ("Connected to Test Node / Opening your runs…" at 1 s, the page from 3 s).
- API-13: a second ticket-owned AVD `pnnp433_api34` (Android 14, `google_apis`, WebView 113.0.5672.136), same APK and bundle, node A only; deleted at the end (`cleanup.log`, "API-13 cleanup").
