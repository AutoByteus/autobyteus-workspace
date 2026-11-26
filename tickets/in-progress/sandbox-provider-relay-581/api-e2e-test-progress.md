# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-26 17:40 | (setup) | Started |  | Validation image `autobyteus-server:581-api-e2e` building from `d624f09ce6` (background; log /tmp/api581/image-build.log) |
| 2026-11-26 17:31 | API-R07 | Completed | Pass | New QR-004 case in provider-relay-peer.integration.test.ts: file 11/11 pass; mutation (route bodyLimit −1) fails it with 502 |
| 2026-11-26 17:31 | API-R10 | Completed | Pass | Skill vs source: tool names, fields and refusal codes match; SANDBOX_TOOL_FAILED (unexpected-error code) undocumented → doc note |
| 2026-11-26 17:55 | (setup) | Checkpoint |  | Local export of the server package stalled at 17:26; killed; rebuilding with `--load` + `COPY --from` (background) |
| 2026-11-26 17:41 | (setup) | Completed | Pass | Image `autobyteus-server:581-api-e2e` (5532578247f4) from `d624f09ce6`: beta + package via `--load`/`COPY --from`; `dropHeaders` count 0 in dist |
| 2026-11-26 17:42 | API-R03 | Started |  | whole server unit suite (background); full log /tmp/api581/API-R03-full.log |
| 2026-11-26 17:50 | API-R03 | Completed | Pass | `Test Files  1094 passed \| 5 skipped (1099)`, `Tests  9124 passed \| 9 skipped`; evidence/API-R03-server-unit-suite.log |
| 2026-11-26 17:50 | API-R04 | Started |  | integration prepare + whole integration (background); /tmp/api581/API-R04-full.log |
| 2026-11-26 17:58 | API-R04 | Completed | Pass | `Test Files  93 passed \| 21 skipped (114)`, `Tests  534 passed \| 71 skipped`; evidence/API-R04-server-integration-suite.log. HEAD moved to 5c6ef6ee86 (docs only; code = d624f09ce6) |
| 2026-11-26 17:59 | API-R05 | Started |  | whole server E2E, env -i (background, ~17 min); /tmp/api581/API-R05-full.log |
| 2026-11-26 18:18 | API-R05 | Completed | Pass | `Test Files 128 passed \| 176 skipped (304)`, `Tests 575 passed \| 829 skipped`; evidence/API-R05-server-e2e-suite-{excerpt.log,full.log.gz} |
| 2026-11-26 18:20 | API-R06 | Completed | Pass | codex-agent-tools-empty-list 1/1; search-memory agy 3/3 (sweep warning in the in-process host: identity pending there; real start applies readiness first, server-runtime.ts:183 vs :199) |
| 2026-11-26 18:23 | API-R02 | Completed | Pass | web typecheck PASS (86 = baseline) |
| 2026-11-26 18:24 | API-R01 | Completed | Pass | server typecheck PASS with the new test files (972 = baseline); replaces the reuse of IMP-14 |
| 2026-11-26 18:25 | API-L01..L08 | Started |  | gated suite SBX-01..08 (background); /tmp/api581/API-L-run1.log; evidence/API-L-sandbox-live/ |
| 2026-11-26 18:45 | API-L01..L08 | Completed | Not Tested | Run 1 invalid (suite defect): the scripted AGY reports tool results as `CALLED:` text, not tool frames; the creates succeeded and 4 containers stayed (failsafe had no host ID). Removed by label. Suite fixed: results from AGY_FAKE_TOOL_LOG, host ID read at start, `teams` omitted when empty (tool result rule) |
| 2026-11-26 18:47 | (note) | Checkpoint |  | One smoke-probe create (sandbox-live-smoke.mjs, image 581-api-e2e) gave SANDBOX_START_FAILED with no leftovers; the next one passed. Watch for recurrence (message now reported) |
| 2026-11-26 19:05 | API-L01 | Checkpoint | Pass | SBX-01 alone passes (ready 10.1 s; 4 runtimes; network; direct turns) |
| 2026-11-26 19:06 | API-L01..L08 | Started |  | run 2, whole suite (background); /tmp/api581/API-L-run2.log |
| 2026-11-26 19:20 | API-L01..L08 | Completed | Fail | Run 2: SBX-01 create `SANDBOX_START_FAILED: The sandbox could not start: fetch failed`; SBX-08 3 ready of 4 expected (one START_FAILED); SBX-06, SBX-07 Pass; SBX-05 test assertion wrong (refusal shown as ERROR frame, turn completes) -> fixed. evidence/API-L-sandbox-live/SBX-0{5..8}.json, run2-vitest.log |
| 2026-11-26 19:25 | API-E01 | Completed | Fail (cause found) | Setup code ready 66-220 ms before the published port answers; 3/4 runs a request in that gap failed UND_ERR_SOCKET; SandboxPairing.connect makes one exchange fetch with no retry. evidence/API-E01-* |
| 2026-11-26 19:27 | API-L01..L08 | Started |  | run 3 (background) to exercise SBX-02..04; evidence/API-L-sandbox-live/run3/ |
| 2026-11-26 19:40 | API-L01..L08 | Completed | Fail | Run 3: SBX-01, 02, 04, 05 Pass; SBX-06/07/08 hit the fetch-failed race; SBX-03 run-memory folder empty. evidence/API-L-sandbox-live/run3/ |
| 2026-11-26 19:50 | API-E02 | Completed | Fail (cause found) | Run memory goes to /home/autobyteus/data/memory/agents, not the mapped run-memory folder: setCustomAppDataDir (starter passes --data-dir) overrides AUTOBYTEUS_MEMORY_DIR (app-config.ts:466-468). evidence/API-E02-* |
| 2026-11-26 19:55 | API-L02 | Completed | Fail | Run 4 (SBX-01+03): delegation answer + file OK, workspace file OK, shared read-only OK, leak scan 0 hits (662 MB, 45 processes); transcripts: none in run-memory (F-2). evidence/API-L-sandbox-live/run4-sbx01-03/ |
| 2026-11-26 19:56 | API-L09 | Started |  | owner relayed node probe |
| 2026-11-26 20:02 | API-L09 | Completed | Pass | run 2 (run 1: probe set CODEX_HOME to a folder it never created -> Codex app-server exited; probe fixed). 5 runtimes relayed 200, B value scan 0 hits/213 files, no role key. evidence/API-L09/ |
| 2026-11-26 20:03 | API-L11 | Started |  | Nodes page label probe |
| 2026-11-26 20:08 | API-L11 | Completed | Pass | label chip on the sandbox row only; gone after destroy. evidence/API-L11/ |
| 2026-11-26 20:09 | API-L10 | Completed | Next Round | needs F-2 fixed (its transcript step) |
| 2026-11-26 20:09 | API-L12 | Completed | Not Tested | DEC-118: waits for the user's Claude setup-token and a fresh Grok login |
| 2026-11-26 20:10 | API-R09 | Started |  | fresh-start desktop build (background), /tmp/api581/API-R09.log |
| 2026-11-26 20:20 | (report) | Checkpoint |  | execution report and revision record written (Fail: F-1, F-2); waiting for API-R09 before commit and handoff |
| 2026-11-26 20:40 | API-R09 | Completed | Pass | fresh clone, frozen install, desktop job build + verify steps all exit 0; clone removed |
| 2026-11-26 21:10 | (round 2) | Started |  | CRR-005 pass of IR-004 (code 7296a698d6). Delta from round 1 (0edd500997): sandbox-pairing.ts, sandbox-manager.ts, sandbox-folders.ts, sandboxes.md, 2 unit tests. Rerun: R01, unit sandboxes+architecture, R10, all live L01-L08 (x2 for F-1 statistics), L10, L11. Still valid: R02 (no web test imports sandboxes), R04, R05 (no E2E creates a sandbox; sweep unchanged), R06, R07, R09 (no build input), L09 (no sandbox) |
| 2026-11-26 21:11 | (setup) | Started |  | image autobyteus-server:581-api-e2e-r2 from 7296a698d6 (background) |
| 2026-11-26 21:25 | (setup) | Completed | Pass | image autobyteus-server:581-api-e2e-r2 (9c9ccab82f1b) from 7296a698d6 (`untilAnswering` in dist); host dist rebuilt from 7296a698d6. HEAD 56faf1ad73 = docs only |
| 2026-11-26 21:27 | API-R01, API-R03b | Completed | Pass | typecheck PASS (972 = baseline); tests/unit/sandboxes + tests/architecture 15 files, 83 tests passed. evidence/API-R01-R03b-round2-typecheck-and-unit.log |
| 2026-11-26 21:28 | API-L01..L08 | Started |  | runs 5 and 6 (round 2), sequential, background; evidence/API-L-sandbox-live/run{5,6}-round2/ |
| 2026-11-26 21:36 | API-L01..L08 | Completed | Pass | runs 5 and 6: 8/8 each; 18 creates, 0 START_FAILED; transcripts under agents/<runId>/ and kept after destroy; leak scan 0 hits |
| 2026-11-26 21:40 | API-L11 | Completed | Pass | round 2 image: one sandbox chip, none on the plain peer, gone after destroy. evidence/API-L11-round2/ |
| 2026-11-26 21:41 | API-L10 | Started |  | evaluator skill journey (Claude, background) |
| 2026-11-26 22:10 | API-L10 | Completed | Pass | Claude evaluator with tools + skill: create, delegate (node), read file + transcripts, link seen and not opened, destroy; canary nowhere. evidence/API-L10/ |
| 2026-11-26 22:15 | (round 2) | Completed | Pass | report rewritten (95%); API-REV-002 |
