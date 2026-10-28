# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-28T16:23:27Z | API-01..API-08 | Completed | Pass | Reused IMP-00..IMP-08 (code unchanged since b34c2a36ea's code commits) |
| 2026-10-28T16:23:27Z | setup | Completed | Pass | server dist rebuilt (predated f9c1a8d5e3), exit 0, /tmp/ab320e2e/build.log |
| 2026-10-28T16:23:27Z | API-09 | Started | | delegated-launch-defaults DLP-003,DLP-004,DLP-005; out /tmp/ab320e2e/API-09 |
| 2026-10-28T16:26:05Z | API-09 | Checkpoint | | run 1: DLP-003/004/005 Fail; cause: probe expectations built with runtime kinds (actual 'Antigravity CLI', expected 'antigravity_cli'); product correct; probe updated through agentRuntimeName; rerun |
| 2026-10-28T16:28:43Z | API-09 | Completed | Pass | rerun: 3 Pass 0 Fail |
| 2026-10-28T16:28:55Z | API-10 | Started | | system-instruction-activity probe; out /tmp/ab320e2e/API-10 |
| 2026-10-28T16:29:05Z | API-10 | Checkpoint | | run 1 Fail on HARNESS only (label scenario passed): WebSocket errors (app-shell change feeds) and Apollo missing fields (run-history/Org loaders), both added after the probe's last change; cause in the probe's stub -> baseline fix |
| 2026-10-28T16:30:29Z | API-10 | Completed | Pass | rerun with baseline fix: BE2E-SI-001A/B Pass, no failures, cleanup OK |
| 2026-10-28T16:30:29Z | API-11 | Started | | model-routing-decisions probe; out /tmp/ab320e2e/API-11 |
| 2026-10-28T16:32:15Z | API-11 | Completed | Pass | MRD-01..08 Pass (8/8); output moved from autobyteus-web/test-results to /tmp/ab320e2e/API-11/out-moved |
| 2026-10-28T16:32:36Z | API-12 | Started | | isolated-app start --build (CODEX_HOME throwaway /private/tmp/ab320e2e/API-12/codex-home.VacR); start json /tmp/ab320e2e/API-12/start.json |
| 2026-10-28T16:38:55Z | API-12 | Checkpoint | | instance iso-50076-407f up (control 50076, backend 50077) |
| 2026-10-28T16:47:51Z | API-12 | Checkpoint | | looks done: AC-001 sidebar; AC-002 Local Tools, MCP card/modal/bulk, custom provider, Server Settings, Migrations, Extensions, agent detail, Application Setup pills, workspace SearchableSelect; AC-003 composer, model menu, search rows, Agent Runtimes, app setup selects; AC-010 picker. FINDING: Application launch setup authority summary shows raw kinds 'codex_app_server'. Next: voice extension install + AC-011 |
| 2026-10-28T17:04:35Z | API-12 | Completed | Fail (one finding) | journey done; FINDING: Application launch setup summary shows runtime kinds (codex_app_server). AC-011 pass (speech->box, no search; no-speech; failure text; mic denied; language en/zh; same look; hidden when disabled; disabled while search not ready). Focus leaves the voice button on start/stop in chat too (pre-existing). Instance stopped, data root removed, CODEX_HOME removed, LM Studio unloaded |
| 2026-10-28T17:42:05Z | round 2 | Started | | IR-002 (CRR-001 FO-001/FO-002 Local Fix, code 1a4bfd2ae9): rerun by impact: API-09 (DLP-003..005 exercise launch-usability-check.ts) and API-12 affected views (app setup summary, agent detail Default runtime, token-usage Runtime row, a launch-setup issue text) |
| 2026-10-28T17:42:23Z | setup r2 | Completed | Pass | server dist rebuilt on de7482b46f |
| 2026-10-28T17:42:23Z | API-09 (r2) | Started | | DLP-003..005 |
| 2026-10-28T17:45:04Z | API-09 (r2) | Completed | Pass | 3 Pass 0 Fail |
| 2026-10-28T17:45:04Z | API-12 (r2) | Started | | isolated-app start --build; /tmp/ab320e2e/r2/API-12 |
| 2026-10-28T17:46:15Z | API-12 (r2) | Completed | Fail | isolated build BUILD_FAILED: production typecheck 2 errors in ApplicationExecutionResourceSlotEditor.vue(52,78),(64,78) agentRuntimeName(string|null); no instance started; CODEX_HOME removed |
