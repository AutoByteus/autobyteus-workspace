# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` (Planned Cases)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-31T08:21:27Z | build | Completed | Pass | pnpm -C autobyteus-server-ts build at 60c3ac4ec8, exit 0 |
| 2026-10-31T08:22:37Z | API-02 | Started | — | new built-server test RS-01 first run |
| 2026-10-31T08:25:24Z | API-02 | Checkpoint | Fail | RS-01 native pair: AGY->native leaks the native candidate's system_instruction into the archived AGY segment (I-7); defect found, test keeps strict soft assertions; investigating the rest (RS-02, RS-03) |
| 2026-10-31T08:31:11Z | API-05 | Started | — | base-vs-new journal probe done (value variant 3/3 identical on 5 runtimes); durable unit test next |
| 2026-10-31T08:31:30Z | API-05 | Completed | Pass | durable unit test 5/5; mutation (segments rendered with no runtime) fails it; base-vs-new probe: value variant 15/15 files byte-identical |
| 2026-10-31T08:31:36Z | API-06 | Started | — | codegen against the built server |
| 2026-10-31T08:32:40Z | API-06 | Completed | Pass (drift fixed) | codegen diff: runtimeKind added to the generated canonicalSelection, doc-comment name, 3 scalar description lines dropped (tool env); web specs 87 passed |
| 2026-10-31T08:32:40Z | API-07 | Started | — | updated server e2e suites + delegated-copy suite |
| 2026-10-31T08:35:42Z | API-07 | Completed | Pass (after 1 test fix) | 16 files pass; the 331 journal E2E needed its stale top-level runtime_kind assertion updated (by design in 316) |
| 2026-10-31T08:35:42Z | API-08 | Started | — | live Claude -> Codex -> scripted AGY (runtime-switch-live) |
| 2026-10-31T08:36:22Z | API-08 | Completed | Pass | live Claude->Codex->scripted AGY 1/1 (21 s) |
| 2026-10-31T08:36:22Z | API-01 | Started | — | focused unit suites of the changed parts |
