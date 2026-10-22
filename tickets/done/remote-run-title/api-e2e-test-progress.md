# API/E2E Test Progress — autobyteus-269 (a remote run's title)

Evidence: `evidence/api-e2e/` (beside this file).

| # | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Investigation written (round 1) | — | `api-e2e-coverage-investigation.md` |
| 2 | Test changes: RC-05, RC-21, RC-22 title checks; RC-30 (long multi-line) | — | test file |
| 3 | API-00 server build | exit 0 | `API-00-server-build.log` |
| 4 | API-01/API-02 two-server E2E | 30/30 | `API-01-run1*` |
| 5 | API-03 browser journey (temporary two nodes, `nuxt dev` against beta) | Agent row shows the packet wrapper (F-001); Team row shows the title; stopped and reloaded: the Agent row shows the title | `API-03-*` |
| 6 | F-001 mechanism read in source (live-context overlay; the packet is a `user` message) | — | `API-03-browser-journey.log` |
| 7 | Report, revision record (API-REV-001 Fail) | → code reviewer | `api-e2e-execution-coverage-report.md` |
| 8 | Round 2: IR-002 (`2aefde62d5`, web only); durable probe `remote-run-title-probe.mjs` written | — | test file |
| 9 | Probe run 1 | stopped: my probe used the start surface's chat box | `API-04-run1*` |
| 10 | Probe run 2 | 6/6 cases, but a browser error: my reload aborted the terminate request in flight | `API-04-run2*` |
| 11 | Probe runs 3, 4 (waiting for the terminate answer, 200) | 6/6 each, no browser errors | `API-04-run3*`, `API-04-run4*` |
| 12 | Probe run 5 (Team row sampled every 100 ms for 6 s after the owner send) | 6/6; one text only | `API-04-run5*` |
| 13 | Report, revision record (API-REV-002 Pass, 95%) | → delivery | `api-e2e-execution-coverage-report.md` |
