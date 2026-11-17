# API/E2E Test Progress — autobyteus-508

Read this first when resuming. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md` (this folder)
- Planned cases: the coverage investigation's Planned Cases (API-01…API-09)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-17T07:37Z | API-01…API-05 | Completed | Pass (Reused) | IMP-01…IMP-05 on e0b58997f3; only ticket docs changed since (4ea7826b87) |
| 2026-11-17T07:37Z | API-08 | Started | | temporary probe tests/app-data-migrations/delegated-runs-own-runs-v1/api08-probe-508-live-save-equivalence.test.ts; move to probes/ after |
| 2026-11-17T07:37Z | API-08 | Completed | Pass | 3/3; probe moved to probes/ |
| 2026-11-17T07:37Z | API-06/API-07 build | Started | | pnpm -C autobyteus-server-ts build (fresh dist for the startup suite) |
| 2026-11-17T07:37Z | API-06/API-07 build | Completed | Pass | dist built 08:37, contains withEdit |
| 2026-11-17T07:37Z | API-06+API-07 | Started | | startup suite, all 3+1 cases in one run (DRO-1,2,3,4), clean env, evidence dir evidence/API-06-07-startup |
| 2026-11-17T07:39Z | API-06+API-07 | Completed | Pass | 3/3 (DRO-1/2, DRO-3, DRO-4); evidence API-06-07-startup-e2e.log + API-06-07-startup/ |
| 2026-11-17T07:39Z | API-07R | Started | | DRO-4 on dist built with run-file-conversion.ts from 298bd7a60a (expected red); MUST restore source + rebuild after |
| 2026-11-17T07:41Z | API-07R | Completed | Pass (red as expected) | 1 failed: /operator claude_agent_sdk, source null; source restored, dist rebuilt |
| 2026-11-17T07:41Z | API-09 | Started | | server typecheck |
| 2026-11-17T07:42Z | API-09 | Completed | Pass | production errors 0; test-file baseline equal |
