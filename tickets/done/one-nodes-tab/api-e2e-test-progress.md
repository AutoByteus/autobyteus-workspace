# API/E2E Test Progress — one-nodes-tab

Working log. Read it first when resuming. Rows are only added.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases (same case IDs)

| Time (UTC) | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-23T04:50Z | API-00 | Started | — | server build (setup) |
| 2026-10-23T04:57Z | API-00 | Completed | Pass | exit=0, evidence/api-e2e/API-00-server-build.log |
| 2026-10-23T04:58Z | API-05 | Started | — | test:integration:prepare (rebuilds dist) then test:integration, background; log API-05-server-integration.full.log |
| 2026-10-23T05:20Z | API-05 | Completed | Pass | Test Files 78 passed / 20 skipped; Tests 421 passed / 69 skipped; exit=0 |
| 2026-10-23T05:21Z | API-06 | Started | — | two-server E2E, background, env -i; evidence API-06-* |
| 2026-10-23T05:28Z | API-06 | Completed | Pass | Tests 29 passed (29), exit=0, ~307 s |
| 2026-10-23T05:30Z | API-07 | Started | — | remote-nodes-page probe (rewritten), output evidence/api-e2e/API-07-remote-nodes-page/ |
| 2026-10-23T05:15Z | API-07 | Checkpoint | — | run1 failed on probe text normalization (ⓘ spacing), kept in API-07-remote-nodes-page-run1; probe fixed; run2 started |
| 2026-10-23T05:18Z | API-07 | Checkpoint | — | run2: NP-07 product defect (row line drops the name); NP-11 quiet and NP-12 audit counted app health polling and icon CDN (probe scope) → fixed; run3 started |
| 2026-10-23T05:21Z | API-07 | Checkpoint | — | run3 stopped in NP-06: ENFILE (system file table full; Docker VM holds ~218k of 491k); run4 started with an fd sampler |
| 2026-10-23T05:24Z | API-07 | Completed | Fail | run4: NP-01…NP-06, NP-08…NP-12 Pass; NP-07 Fail (product: row line 'mu already has a node named .'); evidence API-07-remote-nodes-page-run4 |
| 2026-10-23T05:24Z | API-08 | Started | — | nodes-docker-address probe, test-owned container, output API-08-nodes-docker-address-run1 |
| 2026-10-23T05:27Z | API-08 | Completed | Pass | ND-01…ND-05 Pass; container removed (containerLeft null); evidence API-08-nodes-docker-address-run1 |
| 2026-10-23T05:27Z | API-09 | Checkpoint | — | Electron build (build:electron:mac) started in background |
| 2026-10-23T05:35Z | API-09 | Started | — | Electron build exit=0; journey run1 started, output API-09-electron-journey-run1 |
| 2026-10-23T05:37Z | API-09 | Checkpoint | — | run1: EL-01/04/02/03 Pass; EL-05 Nodes page did not show in the Docker window within 60 s (journey set the route once); retry + diagnostics added; run2 started |
| 2026-10-23T05:38Z | API-09 | Checkpoint | — | run2: EL-01…EL-06 Pass; EL-07 text changed across restart (startup save normalizes key order; content same) → EL-07 compares content and needs byte-identical over a second restart; run3 started |
| 2026-10-23T05:40Z | API-09 | Completed | Pass | run3: EL-01…EL-07 Pass; instance stopped, container removed; evidence API-09-electron-journey-run3 |
| 2026-10-23T05:41Z | — | Completed | Fail | round 1 result recorded: Fail (NP-07), 92% |
| 2026-10-23T05:52Z | API-03 | Started | — | round 2 on 02fd7bcd9a: web unit suite (rerun: NodeRow/nodeRowStatus changed) |
| 2026-10-23T05:59Z | API-03 | Completed | Pass | Test Files 658 passed / 2 skipped; Tests 4736 passed / 3 skipped; exit=0 |
| 2026-10-23T05:59Z | API-07 | Started | — | round 2 run5 on 02fd7bcd9a, output API-07-remote-nodes-page-run5 (server dist unchanged since API-05) |
| 2026-10-23T06:01Z | API-07 | Completed | Pass | run5: NP-01…NP-12 Pass; NP-07 row line names Embedded Node |
| 2026-10-23T06:02Z | — | Completed | Pass | round 2 result recorded: Pass, 95% (API-REV-002) |
| 2026-10-23T06:04Z | API-08 | Started | — | round 3 (CRR-005 TR-001/TR-002 fixed in the probe): run2, output API-08-nodes-docker-address-run2 |
| 2026-10-23T06:06Z | API-08 | Completed | Pass | run2: ND-01…ND-05 Pass; container removed |
| 2026-10-23T06:07Z | — | Completed | Pass | round 3 recorded (API-REV-003) |
