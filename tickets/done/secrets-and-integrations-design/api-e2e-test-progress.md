# API/E2E Test Progress — autobyteus-244 MCP secrets in the vault

- Execution coverage report: `api-e2e-execution-coverage-report.md`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 09:12 | API-08 | Started | — | docker buildx (background), tag autobyteus-server:s244-validation |
| 09:12 | API-01 | Started | — | core+server build then pnpm test:e2e (background) |
| 09:19 | API-08 | Checkpoint | — | image built (exit 0); running test-owned container |
| 09:19 | API-08 | Completed | Pass | Linux aarch64 root umask 0022: backup mode 600, holds plain value; mcps.json reference only; logs test-dummy=0; container+image removed |
| 09:25 | API-01 | Completed | Pass | 103 passed, 95 skipped, 0 failed |
| 09:25 | API-02a | Started | — | AGY scripted + Codex MCP client on matrix, auth-agent, cleanup files |
| 09:26 | API-02a | Completed | Pass | 9 passed (agy x3 files, codex-mcp-client) |
| 09:26 | API-02b | Started | — | live: LM Studio, Claude, Codex live, Grok on matrix + auth-agent |
| 09:33 | API-02b | Completed | Pass with one unreproduced Codex matrix failure | live: native/claude/grok pass; auth-agent codex x2 pass; matrix codex run 1 taskStatus TODO (secret parts ok); temporary tool-event diagnostic (reverted) + 5 reruns: 5/5 all four tools succeed |
| 09:33 | API-02c | Started | — | GitHub live check strict, test vault |
| 09:33 | API-02c | Completed | Pass | strict live: 1 passed; no token-like string in output |
| 09:33 | API-03 | Started | — | isolated-app start --build (instance A, throwaway CODEX_HOME) |
| 09:42 | API-03 | Completed | Pass | A: JSON->form pre-lock, CONFIGURED, file ref only, stdio env delivered, edit/JSON markers, token wrong/replace/keep/json-keep/invalid/remove, restart ok |
| 09:42 | API-04 | Started | — | instance B on owned data root (seeded plain file) |
| 09:44 | API-04 | Completed | Pass | seeded plain file works; banner 3; dialog untick + move: backup 600 + plain values, refs, moved servers work, banner gone; keep-as-they-are; restart on new port 50101->50240: banner stays hidden |
| 09:44 | API-05 | Started | — | import A's file into B; replace; reimport older copy |
| 09:45 | API-05 | Completed | Pass (+ observation) | A file into B: imported 2, toast names github-like env:GITHUB_TOKEN, card Needs secret, fresh ref (foreign not adopted), discover refuses naming field; Replace -> CONFIGURED + delivered; reimport older copy keeps current ref + works. Observation: reimport also stored two reviewed-plain values in the vault (MDEC-004 rule) |
| 09:45 | API-06 | Started | — | stop B, key aside, start |
| 09:46 | API-06 | Completed | Pass | key aside: vault LOCKED, list loads, cards Needs secret, rows vault-unavailable note, discover refuses naming field, plain server works; key restored: READY, all CONFIGURED, tool works |
| 09:46 | API-07 | Started | — | zh-CN |
| 09:47 | API-07 | Completed | Pass | zh-CN: banner, stored row note, token note, env hint, import toast, card match catalog; switched back to English |
| 09:50 | API-09 | Completed | Pass | logs clean; instances stopped; diagnostic reverted; FU-007 added; committing |
