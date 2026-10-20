# API/E2E Test Progress — mcp-sdk-v2-migration

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)
- Before worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration-parity-before` (`dc530fdcb0`); after: this worktree. Scratch: `/tmp/mcp182` (logs, scripts, servers).

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 08:40Z | setup | Started | — | before worktree created; both sides building (`/tmp/mcp182/logs/build-{before,after}.log`) |
| 08:50Z | setup | Completed | — | server copies + uv sync + fs v1/v2 installed under `/tmp/mcp182/servers` |
| 08:52Z | API-14 | Started | — | raw dialect probe |
| 08:53Z | API-14 | Completed | Pass | `/tmp/mcp182/logs/dialects.json`; no draft-04 |
| 08:45Z | API-01 | Started | — | MCP unit suite, before then after (verbose rerun for case names) |
| 08:46Z | API-01 | Completed | Pass | before 82/82, after 87/87; every before case passes after; 5 new cases |
| 08:46Z | API-02 | Started | — | core MCP integration, env -i, both sides |
| 08:47Z | API-02 | Completed | Pass | 22 passed + 1 gated skip on both; identical case list |
| 08:48Z | API-06 | Started | — | opt-in real uv folder: pptx, video-audio (+get_media_duration call), ssh; both sides |
| 08:49Z | API-06 | Completed | Pass | same tool counts (4/32/4) and call result both sides |
| 08:49Z | note | Checkpoint | — | the first four rows' times were written from memory (actual: setup 08:39-08:44Z, API-14 08:44Z); order is right |
| 08:49Z | API-03 | Started | — | endpoint integration (agent-tools routes, gateway routes), both sides |
| 08:49Z | API-03 | Completed | Pass | before 13/13 (v1 clients), after 15/15 (13 same + 2 new auto cases) |
| 08:54Z | API-15 | Started | — | packaged contents both sides |
| 08:54Z | API-15 | Completed | Pass | after resolves client 2.3.1 + deps; v1 only as peer; devDeps packaged on both sides (follow-up) |
| 08:54Z | API-10/API-11 | Started | — | instances iso-63196-c9c1 (before, :63197), iso-63262-88ed (after, :63263); harness sections servers,gateway, before then after |
| 08:59Z | API-10/API-11 | Completed | Pass | same on all servers apart from DEC-004 (paging 2→4) and DEC-003 wording; results /tmp/mcp182/results/{before,after}-servers+gateway.json |
| 08:59Z | API-12/API-13 | Started | — | harness sections matrix,cancel; runtimes native,claude; before first |
| 09:06Z | API-12/API-13 | Completed | Pass | native + claude all 4 columns pass both sides; interrupt → notifications/cancelled +50 ms before, +40 ms after |
| 09:06Z | API-16 | Completed | Pass | 6 gateway-scope server processes per side before stop, none after; stop not forced; data roots removed |
| 09:06Z | API-04 | Started | — | three built-server MCP e2e files, env -i, scripted AGY; before then after |
| 09:10Z | API-04 | Completed | Pass | 9/9 both sides, identical case list |
| 09:10Z | API-05 | Started | — | runtime × MCP matrix, gates AGY scripted, Codex MCP, LM Studio, Claude, Grok; before then after |
| 09:13Z | API-05 | Completed | Pass | 5 passed + codex live gated skip on both; summaries identical; grok model 4.5 (before) vs 4.7 (after) by catalog; pinned before rerun hit Grok 429 free-usage-exhausted after create_task (provider quota) — not retried |
| 09:16Z | API-18 | Started | — | docker images both sides building in background (/tmp/mcp182/logs/API-18-build-*.log) |
| 09:16Z | API-19 | Started | — | interleaved timing probe on each side's built autobyteus-ts dist |
| 09:16Z | API-19 | Completed | Pass | connect/close same; list ~3 ms faster; first call per connection +2-5 ms (validator compile), later calls same |
| 09:19Z | API-18 | Checkpoint | — | after image built (09:18Z); container mcp182-after on 127.0.0.1:48180; harness docker profile running; before image still building |
| 09:23Z | API-18 | Completed | Pass | both images built; before: v1 resolves, after: client 2.3.1 resolves; same results apart from DEC-003/DEC-004; containers + images removed |
| 09:23Z | API-17 | Completed | Pass | user repos/mcps.json untouched; call list has no download/SSH/TTS/paid tool |
| 09:24Z | cleanup | Completed | — | before worktree removed; /tmp/mcp182 removed; no probe process left; LM Studio no model loaded; report, revision record, follow-ups written |
