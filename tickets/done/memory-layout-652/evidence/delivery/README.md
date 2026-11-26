# Delivery evidence — autobyteus-652 (memory-layout-652), delivery round DR-001

Checks the Delivery Engineer ran on the ticket branch at `0ed17c64a4` (the branch was already current with `origin/personal` `9f803aa84d`; no
merge), 2026-11-26. macOS, Node v22.23.1, headless Chrome. API/E2E's evidence is in `../api-e2e/` (rounds 1 to 3), the implementation's in
`../implementation/`. The base had not moved, so the guide does not require a rerun; delivery ran these because the ticket changes shared Files
panel components and the whole Memory page.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log`, `DEL-01-web-typecheck.log` | both typechecks | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | at baseline (972 in 299 files; 86 in 36 files), 0 production errors, `PASS` |
| `DEL-02-check-contract-dist.log` | the contract packages' tracked `dist/` | `pnpm check:contract-dist` | `PASS`; no change in the tree after it |
| `DEL-03-web-whole-suite-summary.log` | the whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `812 passed`, `6296 passed \| 2 skipped` (API/E2E's API-017: the same); 0 `FAIL` lines. The full log (about 2.6 MB) is not kept: its header, the failure count and the summary are |
| `DEL-04-memory-probe/` | the ticket's rendered probe: a real node with invented data, headless Chrome at 1440×900, 1280×800, 1024×768 and 390×844 | `pnpm -C autobyteus-web test:e2e:semantic-memory-view` | `semantic memory view probe: Pass (55/55 checks)`, `failures: []`, 0 page errors. SMV-110 owner content at 85 px; SMV-119 Global at 74 px; SMV-111 the panel 20 px above the window bottom, no page scroll; SMV-112 22 / 17.6 / 14 px; SMV-113 the list 300 px; SMV-115 the clipboard holds the folder path, "Copied" for 1547 ms; SMV-116 a 40-character read-only tab 285 px, whole; SMV-120 and SMV-122 the agent name whole (153 of 153 px) at 1280 and 1024 px; SMV-121 the Episodic cards end at 370 px in a 390 px window. The screenshots the probe writes are not kept (API/E2E's are in `../api-e2e/`) |

Not rerun, with the reason:
- the fresh-start build and a build-only release run: no build input changed (no `package.json`, lockfile, tsconfig, script or workflow) and no iOS or Android file changed;
- API/E2E's other rendered journeys (every VIS view at three viewports, the header-width sweeps at 1440, 1280, 1024, 900 and 768 px, the imported source, keyboard order, the short window, the file icons on the Files panel and the Skills page): they ran on the head, which no product file has changed since;
- the server unit and integration suites: the ticket changes no server file.
