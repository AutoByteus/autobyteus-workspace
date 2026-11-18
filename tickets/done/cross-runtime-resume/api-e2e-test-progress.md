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
| 2026-10-31T10:10:24Z | R2 build | Completed | Pass | pnpm -C autobyteus-server-ts build at 25c1acb705, exit 0 |
| 2026-10-31T10:10:24Z | R2 API-02..04 | Started | — | RS-01..03 on the fresh build (round 2) |
| 2026-10-31T10:11:27Z | R2 API-04b..06 | Started | — | RS-04 restart, RS-05 failed attempt (native target), RS-06 Grok target (new cases, first run) |
| 2026-10-31T10:22:57Z | R2 API-02..07 | Completed | Pass | RS-01..RS-07 7/7 on the fresh worktree build; mutations M1-M3 (compiled output) fail the matching cases |
| 2026-10-31T10:26:04Z | R2-API-07 | Completed | Pass | clean clone 870b075fb4: install, build exit 0, RS-01..RS-07 7/7 |
| 2026-10-31T10:26:04Z | R2-API-01 | Started | — | focused server + library suites |
| 2026-10-31T10:30:46Z | R2-API-01 | Completed | Pass | server 256 files / 2406 tests, library 43 files / 330 tests |
| 2026-10-31T10:30:46Z | R2-API-10 | Started | — | existing server e2e folders |
| 2026-10-31T10:35:20Z | R2-API-10 | Checkpoint | Fail→fixed | existing e2e recent-run-projection: 5/9 failed (spy sees path reads only; projection now reads the active file by fd, and the manifest for runtime_switch segments); test updated (spy follows descriptors; manifest allowed, no compaction segment); 9/9 pass |
| 2026-10-31T10:35:20Z | R2-API-11 | Started | — | live Claude -> Codex -> scripted AGY |
| 2026-10-31T10:36:04Z | R2-API-11 | Completed | Pass | live Claude->Codex->scripted AGY 1/1 (23 s) |
| 2026-10-31T10:39:25Z | R2 ALL | Completed | Pass | report and revision record API-REV-002 written; test-code review next |
| 2026-10-31T10:41:34Z | R2-API-12 | Started | — | new browser probe runtime-switch-probe.mjs (real Nuxt dev + built backend + scripted models + Chrome); first run |
| 2026-10-31T10:52:20Z | R2-API-12 | Completed | Pass | browser probe RSW-01 real Chrome + Nuxt + built backend: switch in Settings, first message, marker live, reload shows earlier conversation + marker; mutation (chat reader active-only) fails the reload step |
