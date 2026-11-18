# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-10T12:29:39Z | API-01..API-08, API-10 | Started | | deterministic suite tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts (scripted AGY) |
| 2026-11-10T12:31:01Z | API-01..API-08, API-10 | Completed | Pass | 9/9 passed; evidence/API-SM-deterministic/ |
| 2026-11-10T12:31:01Z | API-05b | Started | | collaboration-prompt-wording.e2e.test.ts (scripted AGY) |
| 2026-11-10T12:31:52Z | API-05b | Completed | Pass | 11/11 |
| 2026-11-10T12:31:52Z | API-09 | Started | | package-personal-settings.e2e.test.ts |
| 2026-11-10T12:32:16Z | API-09 | Completed | Pass | 7/7 |
| 2026-11-10T12:36:05Z | API-11..API-14 | Started | | live suite, Codex cells (RUN_CODEX_E2E=1) |
| 2026-11-10T12:37:38Z | API-11..API-14 | Completed | Pass | Codex 5/5 (Claude-only case skipped) |
| 2026-11-10T12:37:38Z | API-15, API-16 | Started | | live suite, Claude cells (RUN_CLAUDE_E2E=1) |
| 2026-11-10T12:38:30Z | API-15, API-16 | Completed | Pass | Claude 3/3 |
| 2026-11-10T12:38:30Z | API-17 | Started | | live suite, native AutoByteus (vault Anthropic) |
| 2026-11-10T12:39:51Z | API-17 | Completed | Pass | native 2/2 (rerun once to add the instruction excerpt to the evidence) |
| 2026-11-10T12:39:51Z | API-18 | Started | | live suite, Grok (RUN_GROK_E2E=1) |
| 2026-11-10T12:40:40Z | API-18 | Completed | Pass | Grok 2/2 |
| 2026-11-10T12:40:46Z | API-19 | Started | | live suite, AGY live (RUN_AGY_E2E=1, throwaway HOME with copied token) |
| 2026-11-10T12:41:49Z | API-19 | Completed | Pass | AGY live 2/2; throwaway HOME removed |
| 2026-11-10T12:45:53Z | API-FS | Started | | fresh clone of 595990347 at /root/.autobyteus-e2e/fs-clone, install + build:electron:linux:arm64 (background); log /tmp/sm-fs.log |
| 2026-11-10T12:47:30Z | API-TC | Completed | Pass | typecheck baseline equal (run before API-FS) |
| 2026-11-10T13:00:24Z | API-FS | Completed | Pass | attempt 2 (GITHUB_REPOSITORY set as the runner does) built the AppImage; verify steps passed; clone removed |
