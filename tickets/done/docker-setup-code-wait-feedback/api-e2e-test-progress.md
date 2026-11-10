# API/E2E Test Progress

- Execution coverage report: `tickets/in-progress/docker-setup-code-wait-feedback/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (API-01..API-08)

| Time (UTC, approx) | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 16:20 | API-03 | Started | — | `bash -n` on both changed bash files, then the silent-socket probe |
| 16:20 | API-03 | Completed | Pass | `OK: no syntax errors`; probe `BOUNDED: ... after 5s ...` |
| 16:21 | (env) | Checkpoint | — | Installed `pwsh` via `brew install powershell` to close the PowerShell-syntax confidence gap before API-01/API-02 |
| 16:25 | API-01 | Started | — | `python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v` |
| 16:25 | API-01 | Completed | Pass | `Ran 9 tests ... OK`, 0 skipped (pwsh case now runs) |
| 16:28 | API-02 | Started | — | `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` |
| 16:28 | API-02 | Completed | Pass | `Ran 60 tests ... OK (skipped=1)` (only the unrelated port-collision precondition) |
| 16:34 | (env) | Checkpoint | — | Confirmed real Docker daemon reachable; confirmed real user node `autobyteus-server-0` running on port 8001, untouched before starting |
| 16:36 | API-05 | Started | — | `new-container --image autobyteus/autobyteus-server --tag beta` against a real, isolated, test-owned environment |
| 16:36 | API-05 | Completed | Pass | Created `autobyteus-server-1` on port 8002; real pull-check + "Waiting for ..." on stderr, code on stdout |
| 16:37 | API-06 | Started | — | `setup-code --name autobyteus-server-1` (still running) |
| 16:37 | API-06 | Completed | Pass | stdout = code lines only; real pull-check + "already running" on stderr |
| 16:37 | API-07 | Started | — | `docker stop autobyteus-server-1`, then `setup-code --name autobyteus-server-1` |
| 16:37 | API-07 | Completed | Pass | Real "Started ..." + one real "Waiting for ..." on stderr; code on stdout |
| 16:38 | API-08 | Started | — | NAS-32 grep across the three real stderr logs; isolation check; cleanup |
| 16:38 | API-08 | Completed | Pass | All three grep checks "not found (good)"; real user node confirmed untouched; test-owned container/volumes/temp dirs removed and confirmed gone |
| (Round 2) | API-09 | Started | — | Unguarded `2>&1`-under-`Stop` comparison probe on real pwsh 7.6.9 |
| (Round 2) | API-09 | Completed | Pass | `no throw: LASTEXITCODE=1 answer=[err-text]` — matches the implementation's guarded IMP-07 result |
| (Round 2) | API-10 | Started | — | `python3 -m unittest scripts/tests/test_public_docker_launcher_setup_code.py -v` on commit `63365f010` |
| (Round 2) | API-10 | Completed | Pass | `Ran 9 tests ... OK`, 0 skipped |
| (Round 2) | API-11 | Started | — | `python3 -m unittest discover -s scripts/tests -p 'test_public_docker_launcher_*.py'` on commit `63365f010` |
| (Round 2) | API-11 | Completed | Pass | `Ran 60 tests ... OK (skipped=1)` (unrelated port-collision precondition) |
| (Round 2) | API-12 | Started | — | `bash -n` on both bash files; real `pwsh` parse of the fixed `Commands.ps1` |
| (Round 2) | API-12 | Completed | Pass | `OK: no syntax errors`; `Commands.ps1 parses OK` |
