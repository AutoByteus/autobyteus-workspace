# API/E2E evidence — autobyteus-534, round 1 (API-REV-001)

Commits tested: IR-001 code `d4a14666a4` (API-05…07) and IR-002 code `a8f2680e2a`, HEAD `6df3a5c12f` (API-02, API-03, API-08, API-09); branch `codex/phone-text-size-three-steps-534`.
Date: 2026-11-18. macOS 26 arm64, Node v22.23.1, Chrome headless via playwright-core 1.58.2; host load average 60–140.
The JSON and PNG files are raw outputs; this README is their header. Scripts in `scripts/` (temporary, ticket-owned; copied
from autobyteus-525's API/E2E harness with this worktree's paths; `screens.mjs` gained `small-upgrade` and `menu-zh`;
`pixeldiff.py` takes a `DIFF_PREFIX`).

Environment of API-05…07 (on IR-001 `d4a14666a4`): the probe stack held with `node tests/e2e/mobile-shell-probe.mjs --hold` (alpha and
beta from this worktree's `autobyteus-server-ts/dist`, scripted runtimes, the probe's runs); alpha serves
`autobyteus-web/dist/public`, which `scripts/swap.sh` points at this ticket's bundle (built by the implementation at
`d4a14666a4`) or at the base bundle (`bd2053ee51`, built in `/tmp/abtest534/base`, removed after). The phone is host
Chrome at 412×915 (360×800 where named), DPR 2, isMobile, en-US, UTC, origin `http://10.0.2.2:<alpha port>` through a
local proxy, paired with the stack's own pairing link (`screens.mjs pair`; the stored pairing is not evidence).

| Folder / file | Case | Produced by |
| --- | --- | --- |
| `upgrade/API-05-small-upgrade.json`, `upgrade/API-05-*.png` | API-05 | `screens.mjs small-upgrade upgrade` (base served at start; the script switches to head) |
| `menu-zh/API-06-menu-zh.json`, `menu-zh/API-06-zh-*.png` | API-06 | `screens.mjs menu-zh menu-zh` (zh-CN preference) |
| `walks/{base,head}-{standard,largest}.json/png`, `walks/API-07-same-{standard,largest}.json`, `walks/API-07-pixels-{standard,largest}.json`, `walks/API-07-diff-*.png` | API-07 | `screens.mjs walk`; `compare.mjs same`; `DIFF_PREFIX=API-07-diff-<step> python3 pixeldiff.py walks base-<step> head-<step> walks` |
| `API-02-web-unit-full.log` (excerpt), `API-03-server-typecheck.log` | API-02, API-03 | headers in the files (API-02 on IR-002 `6df3a5c12f`) |
| `menu-order/` | API-08 | IR-002: `scripts/node-534.mjs menu-order` (this worktree's server with a node desktop; test-owned container `abtest534-desktop`, `autobyteus/autobyteus-server:beta` Xvnc on 127.0.0.1:5900; an agent run and a Team run) + `scripts/menu-order.mjs menu-order` |
| `android/`, `API-00-apk-build.log` | API-09 | IR-002: debug APK of this branch; own AVD `apie2e534_api35` (`emulator-5650`, WebView 124, 412 CSS px); node-534 again (`API-09-node.log`); `scripts/android.mjs pair`, `steps`, `run-menu` (`droid.mjs` for WebView DevTools and real taps) |

Secret scan of this folder (`own_`/`mra_`/`mhub_` 20+ chars, `pairing=`, `access_token=` with a value): no match.
