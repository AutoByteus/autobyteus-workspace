# Delivery evidence — autobyteus-647 (viewer-polish-647), delivery round DR-001

Checks the Delivery Engineer ran on the integrated tree: the ticket branch with `origin/personal` `2bdfea0444` merged as `694896a154`,
2026-11-25. macOS, Node v22.23.1, headless Chrome. API/E2E's evidence is in `../api-e2e/` (rounds 1 and 2), the implementation's in
`../implementation/`.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log`, `DEL-01-web-typecheck.log` | both typechecks | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | at baseline (972 in 299 files; 86 in 36 files), 0 production errors, `PASS` |
| `DEL-02-check-contract-dist.log` | the contract packages' tracked `dist/` | `pnpm check:contract-dist` | `PASS`; no change in the tree after it |
| `DEL-03-web-whole-suite-summary.log` | the whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `810 passed`, `6264 passed \| 2 skipped`; 0 `FAIL` lines. The full log (about 2.6 MB) is not kept: its header, the failure count and the summary are |
| `DEL-04-server-build.log`, `DEL-04-mobile-web-build.log` | rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `exit 0` each |
| `DEL-05-phone-probe/` | this ticket's cases and the cases that share its viewers, on the merged build | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-89,MSP-90,MSP-91,MSP-92,MSP-108,MSP-109,MSP-110,MSP-111,MSP-112,MSP-113,MSP-114,MSP-115,MSP-116,MSP-117,MSP-118 --output-dir=<dir>` | `"result": "Pass"`, fifteen cases `Pass`, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0`. MSP-108 to 110: 0 line numbers, 0 fold controls, margin 6 px, first character 6 px; MSP-115: the empty reference reads "This video could not be played." with Retry, the deleted one "Reference file unavailable"; MSP-117: one module worker and one `text/javascript` blob for three PDFs opened three times. The 25 `failedRequests` are 22 `ERR_ABORTED`, 2 `ERR_CONTENT_LENGTH_MISMATCH` (MSP-91's node-restart read) and 1 `ERR_REQUEST_RANGE_NOT_SATISFIABLE` (the phone page's empty blob, which MSP-115 expects) |
| `DEL-06-build-only-ios-run-45619979408.json` | build-only iOS release run on the final head | `gh workflow run release-ios.yml --ref codex/viewer-polish-647 -f publish_app_store_connect=false -f release_ref=codex/viewer-polish-647` | head `694896a154`; `Build And Test iOS App` success (29 min 14 s; runs `AutoByteusMobileCoreTests` and `ios-simulator-smoke.sh`); archive and upload skipped; nothing published |

Not rerun, with the reason:
- the server unit and integration suites: the ticket changes no server file; the base's new commits (autobyteus-649, a system prompt section) have their own delivery, and the merged tree's server typecheck and build pass;
- the fresh-start build and the build-only desktop run: the ticket's build inputs (`autobyteus-web/package.json`, `pnpm-lock.yaml`: `pdfjs-dist` as a direct dependency) were built from fresh clones by API/E2E at `812760b2ec` and `adcff4d2b2`, and by the release job in implementation's IMP-007 (run `45584353228` on `da70e7f049`); no build input changed after `da70e7f049`;
- the iOS, Android and packaged-window journeys (API/E2E ran them: API-020, 021, 030 to 033, 040).
