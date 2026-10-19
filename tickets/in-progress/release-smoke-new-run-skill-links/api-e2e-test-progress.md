# API/E2E Test Progress

Read this first when picking the run back up. Only add rows.

- Execution coverage report: `tickets/in-progress/release-smoke-new-run-skill-links/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)
- Note: do not create new files in the worktree while a `release_smoke.py` run is in progress (its `git status --porcelain` guard would see them). Write evidence files after each run.

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-19T03:58Z | API-01, API-02, API-03, API-07 | Completed | Pass | Reused IMP-01, IMP-02, IMP-04/05, IMP-08 (code unchanged since; see investigation) |
| 2026-10-19T03:53Z | API-04 | Completed | Pass | Doc review of RELEASE.md/TESTING.md at HEAD; evidence file to write after the runs |
| 2026-10-19T03:53Z | API-05 | Started | | Reverse-applying src part of 810408bcee (temporary), then release_smoke.py with grok off PATH; restore afterwards with git checkout + remove re-created files |
| 2026-10-19T03:55Z | API-05 | Completed | Pass | Regression detected: 8/9 live FAIL with beta.2 symptoms, exit 1; fix restored, git status identical; evidence API-05-smoke-regression-mutation.txt |
| 2026-10-19T03:55Z | API-06 | Started | | release_smoke.py with throwaway HOME=/private/tmp/api-e2e-149/home-SCGSdR (signed-out CLIs), background; output /tmp/api-e2e-149/api06-output.txt |
| 2026-10-19T03:56Z | API-06 | Completed | Pass | Fail-closed exit 1 in ~40 s; codex 'not signed in' named; grok signed-out shows 'grok-4.7 is not offered' (misleading reason, observation); evidence API-06-smoke-signed-out.txt |
| 2026-10-19T03:56Z | API-06b | Started | | release_smoke.py, HOME=/private/tmp/api-e2e-149/home-EsQlI6, PATH without any grok (~/.grok/bin, ~/.local/bin/grok hidden via a filtered bin dir); background; output /tmp/api-e2e-149/api06b-output.txt |
| 2026-10-19T03:57Z | API-06b | Completed | Pass | Fail-closed exit 1 in ~60 s; Claude 'Not logged in' named; codex preflight names sign-in; evidence API-06b-smoke-signed-out-no-grok.txt; throwaway homes removed. Next: API-08 after ~09:50Z (Grok quota) |
