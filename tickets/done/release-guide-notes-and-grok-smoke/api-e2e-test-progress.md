# API/E2E Test Progress — autobyteus-355

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` → Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-01T05:14Z | API-02 | Started | — | full release_smoke.py, signed-out temp HOME, fake Grok, no override; logs under /private/tmp/ab355-api |
| 2026-11-01T05:16Z | API-02 | Completed | Pass | exit 1 as expected (signed out); rows per runtime with own reasons; models grok-4.5 (pinned grok-4.7 not offered); agy/autobyteus PASS; live step 30 s |
| 2026-11-01T05:16Z | API-04 | Completed | Pass | read-only steps 2-3 on v1.5.11-beta.9; gh release edit not run; note: step 2 merge list includes base-refresh merges |
| 2026-11-01T05:16Z | API-03 | Started | — | full release_smoke.py, as API-02 plus GROK_E2E_MODEL=grok-4.7 |
| 2026-11-01T05:18Z | API-03 | Completed | Pass | grok rows skipped 'not offered'; claude/codex rows ran to their own results; agy/autobyteus PASS |
| 2026-11-01T05:18Z | API-05 | Completed | Pass | gitleaks no leaks x2; key-shape grep 0; temp removed |
