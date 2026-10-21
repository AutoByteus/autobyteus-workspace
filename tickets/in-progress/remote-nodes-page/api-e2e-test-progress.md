# API/E2E Test Progress — autobyteus-267 (Nodes → Remote Collaboration page)

Evidence: `evidence/api-e2e/` (beside this file).

| # | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Investigation written (round 1) | — | `api-e2e-coverage-investigation.md` |
| 2 | Server E2E: `peerNodeOffer` checks added to RC-16, RC-26, RC-27 | — | test file |
| 3 | API-00 server build and Brief Studio package | exit 0 | `API-00-server-build.log` |
| 4 | API-01 two-server E2E | 29/29 | `API-01-run1*` |
| 5 | Browser probe written (`remote-nodes-page-probe.mjs`, script `test:e2e:remote-nodes-page`) | — | test file |
| 6 | API-02 probe run 1 | stopped: my comparison missed Apollo's `__typename` | `API-02-run1*` |
| 7 | API-02 probe run 2 (typename fixed) | RNP-01 … RNP-05 pass; RNP-06: theta not asked on return | `API-02-run2*` |
| 8 | Probe: RNP-06 records instead of stopping | run 3: 8/9; RNP-06 Fail (theta 0 on return) | `API-02-run3*` |
| 9 | Probe: RNP-06 adds switch off/on while theta is in flight (TR-009) | run 4: 8/9; RNP-06 Fail (theta 0 on return, 0 on switch on again) | `API-02-run4*` |
| 10 | Diagnostic: store query with `queryDeduplication: false` (temporary; reverted with `git checkout`) | 9/9, theta asked on both | `API-02-diagnostic-dedup-off*` |
| 11 | F-001 evidence, report, revision record (API-REV-001 Fail) | → code reviewer | `F-001-in-flight-peer-not-asked-again.log` |
