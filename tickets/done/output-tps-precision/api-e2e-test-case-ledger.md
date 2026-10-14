# API/E2E Test-Case Ledger — output-tps-precision

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope: round 1. It covers many independent cases, including long live runs and desktop journeys.
- Last updated: 2026-10-14

## Planned Cases

| Case ID | Case / Journey | REQ / AC | Boundary / Surface | Planned Command Or Entry Point | Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-R01–R07 | Repository checks | all | Unit/contract/web | See investigation | 1 | Background script `/tmp/tps-repo-checks.sh` |
| API-E01 | Scripted AGY transport: real server → WS → browser card | AC-001,004,006,007,009,010 | Server+WS+browser | `token-meter-tps-transport.e2e.test.ts` | 2 | Scripted, not inference |
| API-E02 | Browser probe, fixture mode | AC-006–008 | Browser | `pnpm -C autobyteus-web test:e2e:token-meter-tps` | 3 | |
| API-L01 | Live native AutoByteus (LM Studio qwen3.6) single call | AC-001,003 | Live server+WS | `token-meter-tps-live.e2e.test.ts` | 4 | One local model run at a time |
| API-L02 | Live Claude single call | AC-002 | Live | same | 5 | |
| API-L03 | Live Codex single call | AC-004 | Live | same | 6 | Throwaway CODEX_HOME |
| API-L04 | Live Codex tool turn (~3 s tool): raw order + TPS | AC-004, RSK-002, C-001 | Live + wire stamps | same + stamp wrapper | 7 | |
| API-L05 | Live AGY long output: `text_delta` cadence | AC-004 | Live + wire stamps | same + stamp wrapper | 8 | |
| API-L06 | Live AGY thinking > 0 sample | AC-003/004, RSK-005 | Live + wire stamps | same | 9 | If the model reports thinking |
| API-L07 | Live Grok single call | AC-004 | Live | same | 10 | |
| API-D01 | Desktop: standalone agent TPS, reload "—", history "—" | AC-001,006,007 | Isolated desktop | isolated-app + browser tools | 11 | |
| API-D02 | Desktop: Team member selection | AC-005 | Isolated desktop | same | 12 | |
| API-D03 | Desktop: delegated copy / Org member selection | AC-005 | Isolated desktop | same | 13 | Round 1 covered the delegated copy inside D02; round 2 adds the Org member selection as D03 |
| API-L08 | Live Codex tool approval held ~6 s (round 2) | AC-004, SCN-002 | Live + wire stamps | `token-meter-tps-live.e2e.test.ts -t API-L08` | R2 | Added in round 2 at code_reviewer's request |

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected | Observed | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-R01–R07 | 2026-10-14 09:57 | Started | `bash /tmp/tps-repo-checks.sh` (background) | All pass | — | — | `evidence/api-e2e/repo/` | Wait |
| 2 | API-L02 | 10:05 | Completed | Live Claude `haiku` (clean env, host login) | Generation reading | First attempt failed on my test's model assertion: the reading carries the call's reported model `claude-haiku-5-5`, which is correct per REQ-004. Test fixed. Rerun: generation, 348 tok / 2,003 ms | Pass | `live/API-L02-claude.json` | — |
| 3 | API-L02 (wire) | 10:07 | Completed | Live Claude `sonnet` via `CLAUDE_CODE_EXECUTABLE_PATH` = stamp wrapper | Reading equals raw `message_start`→`message_delta` | Raw 3,088→6,223 ms = 3,135 ms; reading 3,135 ms (329 tok, 104.9 tok/s) | Pass | `live/claude-wire/` | — |
| 4 | API-L03 | 10:09 | Completed | Live Codex `gpt-5.6-luna`, throwaway CODEX_HOME, stamp wrapper | End-to-end from the request boundary | Boundary `userMessage` item/completed 2,523 → usage 5,515 = 2,992 ms; reading 2,992 ms, 210 tok = `last.outputTokens` | Pass | `live/codex/API-L03-codex.json`, `codex-wire.jsonl` | — |
| 5 | API-L04 | 10:09 | Completed | Live Codex tool turn (`sleep 3`) | No reading spans the tool (SCN-002) | **Usage for the tool-calling call arrives after the tool's item/completed** (rawResponse/completed 3,687; tool 3,998→6,885; tokenUsage 6,888). Reading 5,082 ms / 22.0 tok/s includes ~2.9 s tool time; the call itself was 1,881 ms (59.5 tok/s) | **Fail** | `live/codex/API-L04-codex-tool.json`, `codex-wire.jsonl` | Failure-origin review |
| 6 | API-L04 (repeat) | 10:11 | Completed | Same, `-t API-L04` | — | Reproduced: rawResponse/completed 3,183; tool 3,382→6,267; tokenUsage 6,270. Reading 4,604 ms (25.0 tok/s) vs call 1,517 ms (75.8 tok/s) | **Fail** | `live/codex-repeat/` | Same |
| 7 | API-L05, L06 | 10:12 | Completed | Live AGY via `ANTIGRAVITY_CLI_COMMAND` = stamp wrapper, host login | L05 generation with streamed deltas; L06 thinking → end_to_end | L05: 151 deltas over 5.5 s (median gap 26 ms, max 207 ms); reading generation 599 tok / 5,514 ms = raw first delta→DONE 5,515 ms. L06: thinking 3,138 ⊂ output 3,284; end_to_end 23,203 ms = `duration_seconds` 23.203072 | Pass | `live/agy/` | — |
| 8 | API-L07 | 10:13 | Completed | Live Grok `grok-4.7`, low effort | End-to-end | 245 tok / 13,456 ms (18.2 tok/s), includes ~4.2 s TTFT | Pass | `live/grok/` | — |
| 9 | API-L01 | 10:17 | Completed | Live native, LM Studio `qwen/qwen3.6-35b-a3b` (already loaded, idle; left loaded) | Generation (reasoning streamed first) | First two attempts were test setup errors: model discovery needed `reloadModels(LMSTUDIO)`. Fixed. Pass: generation 271 tok / 4,275 ms; WS content 64,779→69,058 ms; 64.8 s prompt processing excluded | Pass | `live/autobyteus/` | — |
| 10 | API-R01–R07 | 10:08 | Completed | Repository checks | Pass | All exit 0 (see summary.txt) | Pass | `repo/summary.txt` | — |
| 11 | API-E01 | 10:19 | Completed | Scripted transport e2e (clean env, Chrome) | 999/2,674 e2e; 200/≥850 gen; null; persisted 1,211 | 999/2,674 end_to_end; 200/901 generation; 12 → null; card 222.0; persisted 1,211 / 3 reports; cleanup complete | Pass | `transport/run-1/` | — |
| 12 | API-E02 | 10:21 | Completed | Browser probe fixture mode | 11 checks | 11 checks pass, no browser errors, cleanup complete | Pass | `browser-fixture/` | — |
| 13 | API-R04 | 10:22 | Started | `test:integration:prepare` + `test:integration` (background) | Pass except the known baseline exception | — | — | `repo/R04-server-integration.log` | Wait |
| 14 | API-R04 | 10:19 | Completed | same | Same | 72 files pass; the only failures are the 2 TESTING.md baseline content-cadence cases | Pass | `repo/R04-server-integration.log` | — |
| 15 | API-D01 | 10:27 | Completed | `CODEX_HOME=<tmp> isolated-app start --build` → iso-63601-1414; `probes/desktop-standalone.mjs` | "—"; reading = wire; help; idle; switch; reload "—"; history "—" | Attempts 1–2 were harness issues: the drawer covered the composer at 1,200 px, and the WS opened before the listener (attempt-2 screenshot shows the correct card, 59.8). Attempt 3: all 8 checks pass, 68.1 = 185/2.716 s | Pass | `desktop/D01/` | — |
| 16 | API-D02 | 10:34 | Completed | `desktop-team-send.mjs`, then `desktop-team-select.mjs` | Each selection shows its own run's newest reading | First selection attempt clicked chat text instead of the tree row (harness). Rerun: coordinator 46.9, `/worker` member 78.0, delegated copy 47.2, each matching its run | Pass | `desktop/D02/` | — |
| 17 | Cleanup | 10:35 | Completed | `isolated-app stop iso-63601-1414`; temp dirs removed; wire logs redacted | — | Stopped, not forced; data root removed; ports released | N/A | `desktop/stop.json` | — |

### Round 2 (IR-002 / CRR-003)

| Seq | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected | Observed | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | API-R01, R02 | 11:04 | Completed | server typecheck; Codex unit dir + acceptance/boundary/fold | Pass | exit 0; 25 files pass | Pass | `round2/repo/` | — |
| 19 | API-L03, API-L04 (prior failure recheck) | 11:07 | Completed | Live Codex, new throwaway CODEX_HOME, wire stamps | L04 reading excludes the tool | L03 216/2,788 = boundary 2,420→rawResponse 5,208. L04 call 1 110/1,529 = 1,525→3,054 (tool 3,281→6,170 excluded; reading published at 6,184 after the tool); call 2 162/2,134 = tool item/completed 6,170→8,303 | Pass | `round2/live/codex/` | — |
| 20 | API-L08 | 11:07 | Completed | Same run, `autoExecuteTools:false`, default ON_REQUEST policy | Approval requested | Codex ran `echo … > file` without asking (ON_REQUEST lets the model decide), so the test got no approval. Test fixed to use the server's `CODEX_APP_SERVER_APPROVAL_POLICY=untrusted` for its own run | Fail (test setup) | `round2/live/codex/` | Rerun |
| 21 | API-L08 | 11:10 | Completed | `-t API-L08`, untrusted policy | Wait in no reading | Approval requested 8,128, approved after 6.1 s (14,231). Call 1 121/4,777 = 3,360→rawResponse 8,137 (tool item/started 8,128 came 9 ms before rawResponse; call had reasoning, C-011 observation). Call 2 184/8,943 = tool item/completed 14,295→23,237. Wait excluded from both | Pass | `round2/live/codex-approval/` | — |
| 22 | API-R03, R04 | 11:12 | Started | full server unit; integration prepare + suite (background) | Pass except the known baseline | — | — | `round2/repo/` | Wait |
| 23 | API-R03, R04 | 11:19 | Completed | same | same | Unit 693 files pass; integration 72 pass, only the 2 TESTING.md baseline cases fail | Pass | `round2/repo/` | — |
| 24 | Desktop build | 11:21 | Completed | `CODEX_HOME=<tmp> isolated-app start --build` → iso-50466-56b5 | Packaged server has IR-002 code | `codex-model-call-timing.js` contains `rawResponse/completed` handling | N/A | `round2/desktop/start.json`, `app-asar.sha256` | — |
| 25 | API-D01 (Codex) | 11:22 | Not Tested | Seed + D01 on Codex | — | User stopped the step: no Codex tokens available. Switched the desktop journeys to native DeepSeek | Not Tested | — | Use other models |
| 26 | Key import | 11:25 | Completed | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url <isolated instance DB>` (TTY confirm via pty), then `isolated-app restart` | 9 keys configured | Dry run CREATE 9 → import → dry run SKIP_CONFIGURED 9 | Pass | ledger only (no values) | — |
| 27 | API-D01 (DeepSeek) | 11:27 | Completed | `desktop-seed.mjs … autobyteus deepseek-v4-flash`; `desktop-standalone.mjs` | AC-001 original scenario | Single call: 125.0 tokens/s = 171/1.368 s, generation (no qualifier), help "…first streamed output… (171 tokens in 1.37 s)"; idle/switch/reload/history all pass | Pass | `round2/desktop/D01/` | — |
| 28 | API-D02 (DeepSeek) | 11:29 | Completed | `desktop-team-send.mjs` + `desktop-team-select.mjs` | Own readings | coordinator 165.0, /worker member 151.4, delegated copy 155.2 | Pass | `round2/desktop/D02/` | — |
| 29 | API-D03 (Org, DeepSeek) | 11:40 | Completed | `desktop-org-seed.mjs` (Org: lead agent + crew team); `desktop-org.mjs` | Org direct agent + Org team member own readings | Attempts 1–3 were harness issues: nested Org frame parsing, member row selector, strict locator; screenshots kept. Attempt 4: lead "—" before → 119.0; crew/coordinator (no call) "—"; crew/worker 113.0; each matches its Org-stream frame | Pass | `round2/desktop/D03/` | — |
| 30 | Test-env import | 11:45 | Completed | Same importer into `autobyteus-server-ts/db/test.db` (the persistent test DB); `pnpm test:e2e:real:preflight` | READY | 9 keys; preflight 16/16; deepseek.llm READY | Pass | `round2/live/real-preflight.log` | — |
| 31 | API-L09 | 11:48 | Completed | `probes/run-against-test-server.mjs` (built test server on db/test.db) `-t API-L09` | Generation | deepseek-v4-flash 788 tok (595 reasoning) / 4,067 ms = 193.8 tok/s; WS content 1,168→5,237 ms | Pass | `round2/live/deepseek/` | — |
| 32 | C-011 scan | 11:50 | Completed | All four Codex wire captures | Record if observed | 12 calls; the only tool item/started before its own rawResponse/completed is L08 (9 ms, call had reasoning). C-011 shape not observed | N/A | ledger | — |
| 33 | Cleanup | 11:50 | Completed | `isolated-app stop iso-50466-56b5`; temp dirs removed; wire logs redacted | — | Stopped, not forced; data root removed; ports released | N/A | `round2/desktop/stop.json` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 33 (round 2)
- Last completed case and result: cleanup; API-L09 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none (round 2 complete)
- Reconciled into execution coverage report: Yes — `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
