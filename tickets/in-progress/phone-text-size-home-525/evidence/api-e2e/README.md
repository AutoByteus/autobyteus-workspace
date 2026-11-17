# API/E2E evidence — autobyteus-525, round 1 (API-REV-001)

Commit tested: code `7c7f3d2e79` (branch `codex/phone-text-size-home-525`, HEAD `66691f49d6` adds only ticket docs).
Date: 2026-11-17. Machine: macOS 26 arm64, Node v22.23.1, Chrome (headless) via playwright-core 1.58.2; host load average 75–150.
The JSON and PNG files are raw outputs; this README is their header. The scripts are in `scripts/` (temporary, ticket-owned).

| Folder / file | Case | Produced by | Environment |
| --- | --- | --- | --- |
| `API-00-apk-build.log` | API-08 prep | `./gradlew --no-daemon :app:assembleDebug` in `autobyteus-android` | debug APK of this branch (no Android change on it) |
| `android/` | API-08 | `scripts/android.mjs pair`, `steps`, `restart` (`droid.mjs` for WebView DevTools and real `input tap`) | own AVD `apie2e525_api35` (android-35 google_apis arm64, Pixel 6 1080×2400, page 412 CSS px at DPR 2.625), headless, `emulator-5650`, WebView Chrome/124.0.6367.219; paired with the held probe stack (`node tests/e2e/mobile-shell-probe.mjs --hold`) through its `http://10.0.2.2:<alpha port>` link shared into the app (`ACTION_SEND`). `API-08-android.jsonl`: one line per step (`steps`: withMenu, home, conversation); screenshots `API-08-<step>-{1-home-menu,2-home,3-conversation}.png`; `API-08-restart.mp4` and its frame sheets |
| `walks/head-standard*.json/png`, `walks/head-largest.*`, `walks/base-standard.*` | API-05, API-07 | `scripts/screens.mjs walk <label> <step> walks` | host Chrome as a phone, 412×915 DPR 2, isMobile, en-US, UTC; origin `http://10.0.2.2:<alpha port>` through a local proxy to the same held alpha (Host/Origin as from the emulator); the emulator phone's stored pairing copied in (not in evidence). Bundle served by alpha switched with `scripts/swap.sh` (base = `ff13782f36` built in `/tmp/abtest525/base`, head = this worktree's `dist/public`) |
| `walks/API-05-same.json`, `walks/API-05-pixels.json`, `walks/API-05-diff-*.png` | API-05 | `node compare.mjs same base-standard.json head-standard-2.json`; `python3 pixeldiff.py walks base-standard head-standard-2 walks` | — |
| `walks/API-07-scale.json` | API-07 | `node compare.mjs scale head-standard.json head-largest.json` | — |
| `walks/API-07b-*` | API-07 | `scripts/screens.mjs chips largest|standard walks` | as the walks |
| `upgrade/` | API-06 | `scripts/screens.mjs upgrade upgrade` (base bundle served at start; the script switches to head) | as the walks |
| `desktop/` | API-09 | `scripts/desktop.mjs desktop` (`pnpm dev` of this worktree, desktop page `/`, 1440×1000) | headless Chrome; no node needed |
| `API-02-web-unit-full.log`, `API-03-server-typecheck.log` | API-02, API-03 | headers in the files | macOS, Node v22.23.1 |

| `vnc-live/API-11-*` (round 2) | API-11 | `scripts/node-525.mjs vnc-live` (node log `API-11-node.log`, server log) + `scripts/vnc-live.mjs vnc-live` | code `12ecf1bf29`, 2026-11-17/18; this worktree's server with a node desktop (test-owned container `abtest525-desktop`, `autobyteus/autobyteus-server:beta` Xvnc, on 127.0.0.1:5900); host Chrome phone 360/412×800 DPR 2 through the 10.0.2.2 proxy |
| `vnc-live/API-12-*` (round 2) | API-12 | `scripts/android.mjs pair` (its files renamed `API-12-pairing-*`), `scripts/android-vnc.mjs`, `android-vnc.mjs only360` | own AVD `apie2e525_api35` re-created, `emulator-5650`, WebView 124; 412 CSS px, then 360 CSS px by `wm density 480` (reset after) |

Secret scan of this folder (`own_`/`mra_`/`mhub_` 20+ chars, `pairing=`, `access_token=` with a value): no match.
