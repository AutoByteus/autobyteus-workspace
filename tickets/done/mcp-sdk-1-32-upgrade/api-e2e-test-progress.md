# API/E2E Test Progress — mcp-sdk-1-32-upgrade

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 11:11 | API-07 | Started | — | docker buildx build (background, log /tmp/mcp181/docker-build.log), tag autobyteus-server:mcp-sdk-1-32-validation |
| 11:11 | — | Checkpoint | — | core + server rebuilt at c7f0c18fdc (exit 0) |
| 11:11 | API-01/API-02 | Started | — | built-server redirect/transport e2e, clean env |
| 11:11 | API-01/API-02 | Checkpoint | — | attempt 1: API-02 passed; API-01 failed on a test expectation (preview applies the tool-name prefix); fixed, rerunning |
| 11:12 | API-01/API-02 | Completed | Pass | 2 passed; other origin 0 requests; API-01M red with redirectPolicy follow, restored. Evidence API-01-*. Next: API-03 native LM Studio |
| 11:12 | API-03 | Started | — | native + LM Studio qwen (JIT load), clean env |
| 11:14 | API-03 | Completed | Pass | 1 passed 3 skipped; model unloaded |
| 11:14 | API-04 | Started | — | Codex live gpt-5.6-luna, real HOME |
| 11:14 | API-04 | Completed | (see next row) | codex run finished |
| 11:14 | API-06 | Started | — | Claude live haiku, real HOME |
| 11:15 | API-04 | Completed | Pass | 1 passed 3 skipped |
| 11:15 | API-06 | Completed | Pass | 1 passed 3 skipped. Next: API-05 full server e2e |
| 11:15 | API-05 | Started | — | pnpm test:e2e full suite, clean env (background, log /tmp/mcp181/api05.log) |
| 11:16 | API-07 | Checkpoint | — | image built (exit 0, 9.43GB); container mcp181-sdk-validation on 127.0.0.1:54597 |
| 11:16 | API-07 | Completed | Pass | image SDK 1.32.1 single copy; HTTP token + stdio via gateway; cross-origin refused (0 requests); logs clean; container + image removed |
| 11:25 | API-05 | Completed | Pass | 89 passed / 88 skipped files; 370 passed / 394 skipped tests; exit 0. Next: API-08 Electron isolated-app start --build |
| 11:25 | API-08 | Started | — | pnpm --silent isolated-app start --build (background; stdout /tmp/mcp181/api08-start.json, stderr /tmp/mcp181/api08-build.log) |
| 11:31 | API-08 | Completed | Pass | packaged SDK 1.32.1 only copy; HTTP token + stdio via gateway; cross-origin refused (0 requests); logs clean; instance stopped, data root removed. Next: API-09 scan, report |
| 11:32 | API-09 | Completed | Pass | scan clean; report, investigation, revision record final; committing |
| 12:01 | — | Checkpoint | — | ROUND 2 (IR-002, SR-002+SR-003) begins. Test-owned area /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/mcp-parity-api (server copies, codex home, logs, harness) |
| 12:01 | API-10..13 | Started | — | isolated-app start --build for before and after (background) |
| 12:05 | API-10..12 before | Started | — | both instances up (before iso-59202-159b SDK 1.30.0 :59203; after iso-59206-2e45 SDK 1.32.1 :59207); harness before, runtimes native,claude,codex,agy,grok |
| 12:10 | API-10..12 before | Completed | Pass (codex not run: account usage limit) | native/claude/agy/grok all cells pass; codex ERROR usage limit until Oct 25 |
| 12:10 | API-10..12 after | Started | — | harness after, same runtimes |
| 12:13 | API-17 | Completed | Pass | Codex direct MCP (no model turn; account usage-limited): before and after identical, all 4 tools ok. Two first attempts on before failed on the probe's own result parsing (fixed) |
| 12:16 | API-10..12 after | Completed | Pass | all server, gateway and matrix results SAME as before (codex: same usage-limit block) |
| 12:16 | API-13 | Completed | Pass | no orphans after stop on either side; 4 VideoAudioServer sessions per side alive until stop (same both sides) |
| 12:16 | API-14/15/16 | Completed | Pass | user repos unchanged; SDK import statement confirmed; scan clean |
| 12:18 | API-18 | Started | — | new durable gated suite mcp-runtime-tool-matrix.e2e.test.ts; first AGY scripted + Codex MCP client |
| 12:22 | API-18 | Completed | Pass | durable matrix suite: agy, codex-mcp-client, native, claude, grok pass; ungated all skip; src mutation red (dist mutation invalid for in-process, noted) |
| 12:23 | — | Checkpoint | — | cleanup done (instances stopped, before worktree removed, test-owned area removed, model unloaded); committing |
