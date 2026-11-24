# Delivery evidence — autobyteus-574 (phone-video-574), round DR-002

Checks the Delivery Engineer ran on the integrated tree: the ticket branch with `origin/personal` `6cdd1b7bd4` merged as `0ee8e7fb8b`
(on top of DR-001's merge `d7399a925b` of `c1147c8917`), 2026-11-24. macOS, Node v22.23.1, headless Chrome. API/E2E's evidence is in
`../api-e2e/` (rounds 1 to 5; `R3-O4/` is the answer to DR-001's request), the implementation's in `../implementation/`.
DR-001 ran no check (it asked API/E2E for the O-4 controls).

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log`, `DEL-01-web-typecheck.log` | both typechecks | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | at baseline (972 in 299 files; 86 in 36 files), 0 production errors, `PASS` |
| `DEL-02-check-contract-dist.log` | the contract packages' tracked `dist/` | `pnpm check:contract-dist` | `PASS` |
| `DEL-03-server-unit-whole.log` | the whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | `Test Files 1085 passed \| 5 skipped (1090)`, `Tests 9076 passed \| 9 skipped (9085)` |
| `DEL-03-web-whole-suite-summary.log` | the whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `806 passed`, `6156 passed \| 2 skipped`; 0 `FAIL` lines. The full log (2.6 MB) is not kept: its header, the failure count and the summary are |
| `DEL-04-server-build.log`, `DEL-04-mobile-web-build.log` | rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `exit 0` each |
| `DEL-05-phone-probe-media/` | the media phone cases (the viewer the ticket changes) on the merged build | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-89,MSP-90,MSP-91,MSP-92 --output-dir=<dir>` | `"result": "Pass"`, four cases `Pass`, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0`; the 19 `failedRequests` are `net::ERR_ABORTED` (health polls, revoked blob URLs, aborted media loads) |
| `DEL-06-build-only-run-45478679986.json` | build-only Android release run on the final head | `gh workflow run release-android.yml --ref codex/phone-video-574 -f publish_release=false -f release_ref=codex/phone-video-574` | head `0ee8e7fb8b`; `Build Android APK` success; publish skipped; nothing published |
| `DEL-06-build-only-run-45478686275.json` | build-only iOS release run on the final head | `gh workflow run release-ios.yml --ref codex/phone-video-574 -f publish_app_store_connect=false -f release_ref=codex/phone-video-574` | head `0ee8e7fb8b`; `Build And Test iOS App` success (Xcode 27; 26 min 52 s; runs `AutoByteusMobileCoreTests`); archive and upload skipped; nothing published |

Not rerun, with the reason: the Android and iOS journeys on emulators and simulators, the whole server integration and E2E suites and the whole phone probe (API/E2E ran them: SI-1, SE-1, WS-1, R5-*; the server is unchanged since `8e666f6c78` and the base's new commits are web-only); the fresh-start Android build (IMP-08 on `8e666f6c78`; no Gradle file changed since, and the build-only Android run above builds the final source).
