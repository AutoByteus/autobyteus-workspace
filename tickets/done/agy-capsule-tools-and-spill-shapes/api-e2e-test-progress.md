# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 19:1x | API-01 | Completed | Pass, with a finding | scripted linked-skills e2e passes (10) but logs the new warning for every run: the scripted CLI emits `init.tools: []`, which the check reads as "all eight missing" (the handoff said the scripted CLI emits no tools field) |
| 19:2x | API-02 | Completed | Pass | fixture default changed to the eight registry names plus `AGY_FAKE_INIT_TOOLS`; CR-01..03 pass (two runs) |
| 19:2x | API-03 | Completed | Pass | live CR-04 twice: tools used read_file, edit_file, write_file, run_command; no warning |
| 19:3x | X-A | Completed | Fail (expected) | warning removed from dist: CR-01 fails; restored with cmp |
| 19:3x | API-04 | Completed | Pass | five scripted e2e files 50 passed, 0 warning lines; unit 395; typecheck baseline |
