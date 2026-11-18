# API/E2E evidence — autobyteus-534, round 1 (API-REV-001)

Commit tested: code `d4a14666a4` (branch `codex/phone-text-size-three-steps-534`; HEAD `7aef58aac3` adds only ticket docs).
Date: 2026-11-18. macOS 26 arm64, Node v22.23.1, Chrome headless via playwright-core 1.58.2; host load average 60–85.
The JSON and PNG files are raw outputs; this README is their header. Scripts in `scripts/` (temporary, ticket-owned; copied
from autobyteus-525's API/E2E harness with this worktree's paths; `screens.mjs` gained `small-upgrade` and `menu-zh`;
`pixeldiff.py` takes a `DIFF_PREFIX`).

Environment of every browser case: the probe stack held with `node tests/e2e/mobile-shell-probe.mjs --hold` (alpha and
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
| `API-02-web-unit-full.log` (excerpt), `API-03-server-typecheck.log` | API-02, API-03 | headers in the files |

Secret scan of this folder (`own_`/`mra_`/`mhub_` 20+ chars, `pairing=`, `access_token=` with a value): see the execution report's cleanup table.
