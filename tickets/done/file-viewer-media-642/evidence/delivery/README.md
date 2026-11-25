# Delivery evidence — autobyteus-642 (file-viewer-media-642), delivery round DR-001

Checks the Delivery Engineer ran on the integrated tree: the ticket branch with `origin/personal` `45d1b4309c` merged as `0813c4f30e`,
2026-11-25. macOS, Node v22.23.1, headless Chrome. API/E2E's evidence is in `../api-e2e/` (rounds 1 and 2), the implementation's in
`../implementation/`.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log`, `DEL-01-web-typecheck.log` | both typechecks | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | at baseline (972 in 299 files; 86 in 36 files), 0 production errors, `PASS` |
| `DEL-02-check-contract-dist.log` | the contract packages' tracked `dist/` | `pnpm check:contract-dist` | `PASS` |
| `DEL-03-server-unit-whole.log` | the whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | `Test Files 1089 passed \| 5 skipped (1094)`, `Tests 9105 passed \| 9 skipped (9114)` |
| `DEL-03-server-integration-whole.log` | the whole server integration suite | `test:integration:prepare`; `test:integration` | `92 passed \| 21 skipped (113)`, `523 passed \| 71 skipped (594)` |
| `DEL-03-web-whole-suite-summary.log` | the whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `808 passed`, `6258 passed \| 2 skipped`; 0 `FAIL` lines. The full log (about 2.6 MB) is not kept: its header, the failure count and the summary are |
| `DEL-04-server-build.log`, `DEL-04-mobile-web-build.log` | rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `exit 0` each |
| `DEL-05-phone-probe/` | the cases of this ticket and of the base that share the viewer, on the merged build | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-89,MSP-90,MSP-91,MSP-92,MSP-108,MSP-109,MSP-110,MSP-111,MSP-112,MSP-113,MSP-114 --output-dir=<dir>` | `"result": "Pass"`, eleven cases `Pass`, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0`. MSP-111: 1440×900 and 1280×800 default panel (450 px) stacked, viewer 450; 700 px panel split, tree 250, viewer 449; divider far right: viewer 400. MSP-114: the video reference plays from the route (`bytes=0-0` 206, then `bytes=0-` 206 as media), not a blob. The 23 `failedRequests` are 21 `ERR_ABORTED` and 2 `ERR_CONTENT_LENGTH_MISMATCH` (MSP-91's node-restart read cuts connections on purpose; the same two appear in API/E2E's whole probe and in the 574 delivery run) |
| `DEL-06-build-only-android-run-45535819387.json` | build-only Android release run on the final head | `gh workflow run release-android.yml --ref codex/file-viewer-media-642 -f publish_release=false -f release_ref=codex/file-viewer-media-642` | head `0813c4f30e`; `Build Android APK` success (3 min); publish skipped; nothing published |
| `DEL-06-build-only-ios-run-45535821825.json` | build-only iOS release run on the final head | `gh workflow run release-ios.yml --ref codex/file-viewer-media-642 -f publish_app_store_connect=false -f release_ref=codex/file-viewer-media-642` | head `0813c4f30e`; `Build And Test iOS App` success (22 min 27 s; runs `AutoByteusMobileCoreTests` and `ios-simulator-smoke.sh`); archive and upload skipped; nothing published |

Not rerun, with the reason: the Android and iOS journeys on emulators and simulators and the whole phone probe (API/E2E ran them, with the iOS audio class 10 of 10 and 574's video class 8 of 8 on IR-006; the base's new commits are server-side and touch no file of the ticket); the Android JVM tests and the iOS Core tests (the iOS release job ran the Core tests again on the runner; the Android release job does not run the JVM tests, and API/E2E's report reuses implementation's IMP-06, 130 tests).
