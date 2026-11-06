# Evidence — S3: Node desktop on the phone (autobyteus-407), implementation IR-001

Date: 2026-11-06. Branch `codex/node-desktop-on-phone`, base `origin/personal` @ `e427a0c9cf`.
Commits: `4f11061ecf` (implementation), `d84d2d0fdd` (keyboard bridge caret fix found by IMP-S3-16).

Environment for device checks (all test-owned; no real node, no user phone, nothing against `autobyteus-server-0/1/2`):

- Test node `abx407-phone-node`: the local `autobyteus/autobyteus-server:beta` image (`9c5aa01bb2fc`) with this worktree's server package (`docker buildx build --builder desktop-linux --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package`) mounted read-only over `/opt/autobyteus/server-package`; backend published on `127.0.0.1:60901` only; `LMSTUDIO_HOSTS=http://host.docker.internal:1234` so a run could be created (no message was ever sent; no model was loaded, `lms ps`: none). After `d84d2d0fdd` the rebuilt package's `mobile-web` (only change; `dist/` identical) was synced into the mounted package and the page reloaded.
- Android emulator `autobyteus277_api35` (API 35, Gboard), the app built from this worktree (`app-debug.apk`), paired over trusted private HTTP to `http://10.0.2.2:60901/mobile`. Page driven by `adb input` (real taps through the system) and, for two-finger gestures and DOM reads, Chrome DevTools Protocol on the app WebView (`cdp-eval.mjs`, `cdp-touch.mjs` → `Input.dispatchTouchEvent`, `cdp-ws-watch.mjs` → `Network.webSocket*`, tokens redacted).
- Node-side truth: `docker exec --user vncuser --env DISPLAY=:99 abx407-phone-node xdotool getmouselocation` (pointer), `xev -event keyboard` in a focused window (keys), `ss -tn | grep :5900` (upstream; one connection = 2 rows), the server log `/var/log/supervisor/autobyteus_server.log`.
- Cleanup done: container and its 4 volumes removed, emulator killed, adb forwards removed.

| Check ID | What | Commit | Files |
| --- | --- | --- | --- |
| MP-001 | Home hides the page (`visibilitychange` hidden), return shows it, same pid | 4f11061ecf | `MP-001/` |
| IMP-S3-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/node-desktop tests/unit/api/websocket tests/integration/node-desktop tests/e2e/node-desktop tests/unit/remote-access --no-watch` | d84d2d0fdd (server unchanged since 4f11061ecf) | `IMP-S3-01-server-node-desktop-tests.log` (15 files, 132 tests) |
| IMP-S3-03 | `pnpm -C autobyteus-server-ts typecheck` | d84d2d0fdd | `IMP-S3-03-server-typecheck.txt` |
| IMP-S3-04 | `pnpm -C autobyteus-web typecheck` | d84d2d0fdd | `IMP-S3-04-web-typecheck.txt` |
| IMP-S3-05 | web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | d84d2d0fdd | `IMP-S3-05-web-guards.txt` |
| IMP-S3-07 | `pnpm -C autobyteus-web exec vitest run components/mobile composables components/workspace/tools utils localization` | d84d2d0fdd | `IMP-S3-07-web-affected-specs.log` (178 files, 1181 tests) |
| IMP-S3-10…15 | AC-017 on the emulator: menu entry, View only fitted (portrait, landscape), pinch/pan/double tap/Fit, full screen in both modes, handle, Back | 4f11061ecf | `IMP-S3-10…15-*.png`, `cdp-touch.mjs` |
| IMP-S3-16 | AC-S3-1 run 1 (Gboard → xev): a b c Return BackSpace arrive; then `d` arrived as `d` + `_` — the caret defect | 4f11061ecf | `xev-run1-keysyms.txt`, `IMP-S3-16-control-keyboard-gboard.png` |
| IMP-S3-17 | AC-S3-1 run 2 after the fix: a b c Return BackSpace d e BackSpace BackSpace f, 10 presses / 10 releases | d84d2d0fdd | `xev-run2-keysyms.txt`, `IMP-S3-17-keyboard-run2.png` |
| IMP-S3-19 | AC-019 on the emulator: Home → `stream ended mode=control … reason=viewer-closed`, upstream 0, same pid; return → "Connected · View only", 1 upstream | 4f11061ecf | `node-desktop-log-lines.txt` (lines 2–3) |
| IMP-S3-20 | AC-012 on the emulator: revoke during a Control stream → closed after 2.3 s `reason=node-closed close=REMOTE_ACCESS_DEVICE_REVOKED`, upstream 0, "This viewer is not allowed on this node"; reopening the view: socket upgraded and closed after 13 ms, still "not allowed", upstream 0 | d84d2d0fdd | `revoke-check.sh`, `ac012-revoke.txt`, `ac012-reconnect.txt`, `IMP-S3-18-revoked-reopen-not-allowed.png` |
| IMP-S3-21 | AC-018: headless Chrome against the test node as `abx407-node.lan` (host-resolver-rule to 127.0.0.1; a trusted private HTTP host for pairing), 1280×800 | d84d2d0fdd | `browser-probe.mjs`, `AC-018/AC018-results.json`, `AC-018/*.png` |
| IMP-S3-22 | Node log scan: `access_token=` values, `mra_` credentials | d84d2d0fdd | `log-scan.txt` (0 everywhere), `node-desktop-log-lines.txt` |
