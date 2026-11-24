# IMP-07 (AC-006, preserved) the phone bundle in a browser keeps today's media path: the probe's media cases
# command: pnpm -C autobyteus-server-ts build; pnpm -C autobyteus-web build:mobile-web;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-89,MSP-90,MSP-91,MSP-92 (twice)
# commit: 8e666f6c78
# env: macOS arm64, Node v22.23.1, Chrome headless, loopback nodes
# date: 2026-11-24
# result: Pass. The cases pass both times. The first run's only unknown browser errors were the desktop dev server's
#   "504 (Outdated Optimize Dep)" in MSP-90 (Vite pre-bundling its dependencies on its first start in this fresh
#   worktree); the second run: Pass, unknownBrowserErrors 0.

## first run
[mobile-shell] MSP-89 …
[mobile-shell] MSP-89 Pass
[mobile-shell] MSP-91 …
[mobile-shell] MSP-91 Pass
[mobile-shell] MSP-92 …
[mobile-shell] MSP-92 Pass
[mobile-shell] MSP-90 …
[mobile-shell] MSP-90 Pass
mobile-shell probe: Fail
summary: {'cases': {'MSP-89': 'Pass', 'MSP-91': 'Pass', 'MSP-92': 'Pass', 'MSP-90': 'Pass'}, 'unknownBrowserErrors': 4}
unknown: MSP-90 desktop console: Failed to load resource: the server responded with a status of 504 (Outdated Optimize Dep)
unknown: MSP-90 desktop console: TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:57779/_nuxt/pages/index.vue
unknown: MSP-90 desktop console: [nuxt] error caught during app initialization H3Error: Failed to fetch dynamically imported module: http://127.0.0.1:57779/_nuxt/pages/index.vu
unknown: MSP-90 desktop console: Failed to load resource: the server responded with a status of 504 (Outdated Optimize Dep)

## second run
[mobile-shell] MSP-89 …
[mobile-shell] MSP-89 Pass
[mobile-shell] MSP-91 …
[mobile-shell] MSP-91 Pass
[mobile-shell] MSP-92 …
[mobile-shell] MSP-92 Pass
[mobile-shell] MSP-90 …
[mobile-shell] MSP-90 Pass
mobile-shell probe: Pass
summary: {'cases': {'MSP-89': 'Pass', 'MSP-91': 'Pass', 'MSP-92': 'Pass', 'MSP-90': 'Pass'}, 'unknownBrowserErrors': 0}
