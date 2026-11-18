# API/E2E Test Progress

- Execution coverage report: `tickets/in-progress/daily-assistant-delegation-target/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-10 06:58 CET | setup | Completed | Pass | `prebuild`, `build`, `test:integration:prepare` in the worktree; `dist/app.js` and Brief Studio package present |
| 2026-11-10 07:00 CET | DAC-01…06 | Started | | new suite `tests/e2e/projects/daily-assistant-collaborator.e2e.test.ts`, scripted AGY, clean env |
| 2026-11-10 07:05 CET | DAC-01…06 | Completed | Fail | 5 passed, DAC-04 failed: re-delegation by address from a PM run holding a DA copy started a new copy. Cause: test assumption; delegated copies are not in-run placements (`collaborator-root-port.ts:47`), every delegate_task by address starts a new copy (tool contract). DAC-04 rewritten: Team with a DA member + mode (3). Rerun the file. |
| 2026-11-10 07:08 CET | DAC-01…06 | Started | | rerun after DAC-04 rewrite |
| 2026-11-10 07:12 CET | DAC-01…06 | Completed | Fail | DAC-04 again: Team with DA at /mate refuses '/daily_assistant' as unknown address (catalog maps an in-run definition to its member address), not "already in this run". Existing behavior, no instance created; assertion adjusted. Rerun the file. |
| 2026-11-10 07:13 CET | DAC-01…06 | Started | | third run |
| 2026-11-10 07:16 CET | DAC-01…06 | Completed | Pass | 6/6 passed (`DAC-suite-pass.log`, `DAC-suite-results.json`) |
| 2026-11-10 07:18 CET | DAC-base | Completed | Pass | sensitivity: on base policy+registry 5 failed, DAC-05 (preserved guard) passed; source restored, git clean |
| 2026-11-10 06:51 CET | RC-04u, RC-26u, RC-38u, RC-42 | Started | | full two-server suite (cases share nodes and run in order), dist built from fbc9b3c2e9 source |
| 2026-11-10 06:59 CET | RC-04u, RC-26u, RC-38u, RC-42 | Completed | Pass | 42/42 passed (443 s); `RC-two-server-suite.log`, `RC-two-server-receipt-excerpt.json` |
| 2026-11-10 06:59 CET | API-09 | Started | | server typecheck |
| 2026-11-10 07:00 CET | API-09 | Completed | Pass | `production errors: 0; test-file errors: 1181 in 365 files (baseline 1181 in 365 files)` |
| 2026-11-10 07:00 CET | API-F01 | Started | | fresh clone of c4f004d7fc + docker buildx --target server-package |
| 2026-11-10 07:06 CET | API-F01 | Completed | Pass | frozen install + server build + bootstrap smoke in fresh clone; clone/output removed |
| 2026-11-10 07:26 CET | — | Checkpoint | | Correction: the times of the rows from `setup` to `DAC-base` were typed by hand and are wrong; those runs happened between about 06:35 and 06:50 CET, in the order listed. Rows from RC-04u on are taken from `date`. Waiting for another worktree's vitest run to end before API-10. |
| 2026-11-10 07:58 CET | API-10 | Started | | model-routing-decisions-probe (scripted two nodes, Nuxt dev, headless Chrome) |
| 2026-11-10 08:00 CET | API-10 | Completed | Pass | 8/8 probe cases; MRD-08 options include autobyteus-daily-assistant, no Model Router; cleanup temp root removed |
| 2026-11-10 08:01 CET | — | Completed | Pass | Round 1 complete: report, revision record, investigation updated; committing and handing to delivery |
