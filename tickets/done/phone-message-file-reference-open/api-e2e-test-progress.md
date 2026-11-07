# API/E2E Test Progress

- Execution coverage report: `tickets/in-progress/phone-message-file-reference-open/api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-07 | API-01 | Completed | Pass | Reused IMP-02/IMP-03 (code unchanged since 61c886c0fe) |
| 2026-11-07 | API-02 | Completed | Pass | Reused IMP-04 |
| 2026-11-07 | API-03 | Completed | Pass | Reused IMP-05 |
| 2026-11-07 20:51 | API-05 | Started | — | MSP-16 on the base-code phone bundle, output /tmp/427-runs/API-05-msp16-base |
| 2026-11-07 20:53 | API-05 | Completed | Fail (expected) | Base bundle: tap leaves screen=run; TypeError reading 'query' at openFile; cleanup ok. Next: rebuild bundle at HEAD, API-06 |
| 2026-11-07 20:54 | API-06 | Started | — | MSP-08,MSP-16 on the HEAD phone bundle (built 20:53), output /tmp/427-runs/API-06-msp08-16-head |
| 2026-11-07 20:55 | API-06 | Completed | Pass | MSP-08 Pass, MSP-16 Pass, 0 unknown browser errors, cleanup ok. Next: API-04 test:nuxt |
| 2026-11-07 20:55 | API-04 | Started | — | pnpm -C autobyteus-web test:nuxt, log /tmp/427-runs/API-04-test-nuxt.out |
| 2026-11-07 21:02 | API-04 | Completed | Pass | 713 files, 5312 passed, 2 skipped. Next: API-07 desktop probe |
| 2026-11-07 21:02 | API-07 | Started | — | event-monitor-file-preview-probe (isolated-app start --build), output /tmp/427-runs/API-07-desktop, log /tmp/427-runs/API-07.out |
| 2026-11-07 21:11 | API-07 | Completed | Fail | First run (build): N-001 'Saved Agent Org data is unavailable'; cause in the probe fixture (GetAgentOrgMemberFileChanges not answered, since 03f2d4da05). Baseline fix in the probe; rerun as API-07 run 2 |
| 2026-11-07 21:11 | API-07 | Started | — | Run 2 with the probe fix, --skip-build, output /tmp/427-runs/API-07b-desktop |
| 2026-11-07 21:12 | API-07 | Completed | Fail | Run 2: Org loads; N-001 target root null: the selected delegated copy runs from its recorded launch snapshot (since 7d689455ad) which the probe left null. Second baseline fix; run 3 next |
| 2026-11-07 21:12 | API-07 | Started | — | Run 3, --skip-build, output /tmp/427-runs/API-07c-desktop |
| 2026-11-07 21:13 | API-07 | Completed | Pass | Run 3: N-001..N-009 Pass, no page errors, own instance stopped. Next: report, revision record, commit, handoff |
