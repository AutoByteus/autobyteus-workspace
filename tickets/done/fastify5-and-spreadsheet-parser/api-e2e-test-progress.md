# API/E2E Test Progress — fastify5-and-spreadsheet-parser

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time (UTC) | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-24T20:57:41Z | API-08 | Checkpoint | — | Image ab-server-api:test built from clean clone /tmp/ab-api/clone (4dcdceea11); log /tmp/ab-api/API-08-build-full.log. Container checks not started |
| 2026-10-24T20:57:41Z | API-03 | Started | — | env -i pnpm test:e2e in worktree, log /tmp/ab-api/API-03-e2e-full.log |
| 2026-10-24T21:03:55Z | API-01 | Checkpoint | — | New test run on base clone: 2 GraphiQL cases fail (expected, base serves GraphiQL), 2 MCP CORS cases pass. Branch run waits for API-03 (shared worktree test DB) |
| 2026-10-24T21:03:55Z | API-04 | Started | — | live dist/app.js base and branch on 0.0.0.0, probe from 127.0.0.1 and 192.168.2.158 |
| 2026-10-24T21:03:55Z | API-04 | Completed | Pass | Only diffs: /graphiql* (DEC-001) and base GraphQL-WS handshake failing (mercurius 13 + websocket 10 TypeError); evidence API-04 |
| 2026-10-24T21:03:55Z | API-05 | Started | — | upload probe base and branch |
| 2026-10-24T21:03:55Z | API-05 | Completed | Pass | NO DIFFERENCE; evidence API-05 |
| 2026-10-24T21:04:13Z | API-08 | Started | — | container ab-server-api-test from ab-server-api:test on 127.0.0.1:<free>, no volumes |
| 2026-10-24T21:05:46Z | API-08 | Completed | Pass | health/GraphQL/WS ack + /ws/projects/upload 200+413/GraphiQL 404 from host; host lines identical to API-04 LAN lines; mobile bundle sanitiser; xlsx 0.20.3 only; container + image removed |
| 2026-10-24T21:07:22Z | API-06 | Started | — | autobyteus-app start --host 0.0.0.0 for applications/brief-studio (worktree) |
| 2026-10-24T21:10:03Z | API-06 | Completed | Pass | printed http://127.0.0.1:<port> for 0.0.0.0 bind; printed URL and LAN URL both 200 text/html; host stopped; throwaway CODEX_HOME removed |
| 2026-10-24T21:10:03Z | API-03 | Completed | Fail (1 test, cause found) | 1 failed / 434 passed / 458 skipped (194 files). phone-access "restores trusted-network…" 503: test lacks configureNodeIdentityCapability(true) (reproduced + confirmed on base clone). API-20/21/22 pass in clean env. Next: baseline test fix + rerun file |
| 2026-10-24T21:10:40Z | API-03b | Started | — | rerun phone-access e2e file after baseline test fix (worktree) |
| 2026-10-24T21:10:53Z | API-01 | Started | — | branch run + mutation run (worktree) |
| 2026-10-24T21:11:20Z | API-01 | Completed | Pass | branch 4/4; base 2 GraphiQL fail + 2 MCP pass (as expected); mutation cors:false → plugin-header case fails at L151 |
| 2026-10-24T21:11:44Z | API-07 | Started | — | isolated-app start --build in clean clone /tmp/ab-api/clone (4dcdceea11); log /tmp/ab-api/API-07-start.log |
| 2026-10-24T21:20:29Z | API-07 | Checkpoint | — | instance iso-57435-8370 up; workspace ws-fixture + LM Studio qwen selected in composer; sending first message |
| 2026-10-24T21:23:47Z | API-07 | Completed | Pass | run streamed over /ws/agent (19 SEGMENT_CONTENT, ASSISTANT_COMPLETE, TURN_COMPLETED), 169 GraphQL 200; xlsx + xls in Files panel: table-only DOM, no attrs/anchors, tabs switch, javascript: cell click inert. Instance stopped, list empty, LM Studio model unloaded |
| 2026-10-24T21:26:53Z | — | Completed | Pass | Round result Pass, 95%. Cleanup done (/tmp/ab-api removed, no containers/images/instances left). Reports + revision record written |
