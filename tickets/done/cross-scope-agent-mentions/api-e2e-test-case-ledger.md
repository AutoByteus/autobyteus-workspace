# API/E2E Test-Case Ledger — cross-scope-agent-mentions

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions` @ `5dcc5dc82`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope: round 1; many independent live cases on 5 runtimes plus long browser journeys with real models.
- Last updated: 2026-09-30

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RC-01 | Server typecheck | all | tsc | `npx tsc -p tsconfig.build.json --noEmit` | 1 | |
| RC-02 | Contract package tests | AC-002 | contracts | `pnpm test` ×3 | 2 | base comparison |
| RC-03 | Server unit suite vs base | all | vitest unit | `npx vitest run tests/unit` | 3 | |
| RC-04 | Server integration (affected) | AC-003/004, BEH-012 | vitest integration | `npx vitest run tests/integration/...` | 4 | |
| RC-05 | Server deterministic E2E | AC-013 | in-process server | `npx vitest run tests/e2e` | 5 | live files skip unless gated |
| RC-06 | Web suite vs base | AC-001/002/008–010 | vitest nuxt | `NUXT_TEST=true npx vitest run` | 6 | |
| LE-01a..e | Standalone collaborator mention on AutoByteus(LM Studio)/Codex/Claude/AGY/Grok(ACP) | AC-003/004/005/014 | live API, in-process server | new `standalone-agent-collaborator-mention.e2e.test.ts` | 7 | one case per runtime |
| BR-01 | UXJ-005 standalone run journey (menu, chips, send, task Agent+Team, Team tab, open child, chat child, run-row return, exclusion, a11y, small window) | AC-001/002/003/005/007/010/011/012 | browser, `pnpm dev` | new probe | 8 | Claude |
| BR-02 | UXJ-001/002 Team run (VIS-001–006), C-02 observation | AC-001/002/003/005/009/011/012 | browser | probe | 9 | |
| BR-03 | UXJ-004 Org run (VIS-008–010) | AC-001/003/005/009/012 | browser | probe | 10 | |
| BR-04 | UXJ-003 / VIS-007 real add failure; retry reuses address (AR-004) | AC-008 | browser + API | probe | 11 | |
| BR-05 | Stop → reopen → send to child; another run cannot message child | AC-006 | browser + API | probe | 12 | |
| LC-01 | Host crash keeps root; wake; Delete/Archive end root first (with/without collaborators) | AC-006, CR-001/002 | lifecycle | temporary | 13 | |
| PD-01 | Old-shape Team/Org trees reopen and continue | AC-013 | persisted data | temporary | 14 | |
| BR-06 | New chat `@` unchanged | AC-013 | browser | probe | 15 | |
| HX-01 | Helper / application-owned exclusion | AC-014 | repository + API | unit + metadata check | 16 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | RC-01 | 2026-09-30 | Completed | `npx tsc -p tsconfig.build.json --noEmit` after `pnpm prepare:shared`, `prisma generate` | exit 0 | exit 0 | Pass | `/tmp/csam-tsc.log` | — |
| 2 | RC-02 | 2026-09-30 | Completed | `pnpm test` in 3 contract packages; base `/tmp/csam-base` | pass; collab-stream failures only pre-existing | 6/6, 5/5; collab-stream 5/12 with the same 7 failing tests as base (1/8) | Pass | console | — |
| 3 | RC-03 | 2026-09-30 | Completed | `npx vitest run tests/unit` (branch) + failing files on base `/tmp/csam-base` | no branch-only failures | 3930 pass / 78 fail; the same 78 fail on base (test-name diff empty) | Pass | `/tmp/csam-server-unit.json`, `/tmp/csam-base-unit.json` | — |
| 4 | RC-06 | 2026-09-30 | Completed | `NUXT_TEST=true npx vitest run` (web) + 4 failing files on base | no branch-only failures | 3439 pass / 4 fail (org-definition-navigation, font-size audit, TreePanel.regressions ×2) + StartupDelayLifecycle load error; identical on base; font audit offender list identical (token-usage files only) | Pass | `/tmp/csam-web.json` | — |
| 5 | RC-04 | 2026-09-30 | Completed | `npx vitest run tests/integration` + failing files on base | no branch-only failures | 271 pass / 46 fail; identical 46 on base | Pass | `/tmp/csam-server-int.json`, `/tmp/csam-base-int.json` | — |
| 6 | RC-05 | 2026-09-30 | Checkpoint | `npx vitest run tests/e2e` + failing files on base | no branch-only failures | 188 pass / 49 fail; branch-only: `standalone-error-termination-lifecycle` ×2 (stale harness: `lifecycleService: {}` lacks `terminateCollaborationRoot`), `grok-build-runtime-replay` ×4 (`ACP_MCP_SERVER_NOT_READY`: recorded fixtures predate always-on Agent Tools MCP), token-usage-analytics ×2 and gemini catalog (pass in isolation → suite-order) | — | `/tmp/csam-server-e2e.json`, `/tmp/csam-base-e2e.json` | harness updated; Grok replay pending decision |
| 7 | RC-05 | 2026-09-30 | Checkpoint | isolated reruns | — | error-termination passes after harness stub update | — | — | — |
| 8 | LE-01e | 2026-10-01 | Completed | `GROK_BUILD_COMMAND=<tee wrapper> RUN_GROK_E2E=1 npx vitest run tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | pass | Pass after test-side fixes: Grok needs `search_tool`/`use_tool` hint (pre-existing, documented); `agentRunCollaboration` wraps `root_agent`; failed-MCP text not projected on Grok cards (pre-existing projection; wire shows server hint delivered to the model) | Pass | `api-e2e-evidence/le-01-grok.log`, `le-01-grok-acp-wire-summary.txt` | — |
| 9 | LE-01c | 2026-10-01 | Completed | `RUN_CLAUDE_E2E=1 …` | pass | Pass (25 s) | Pass | `api-e2e-evidence/le-01-claude.log` | — |
| 10 | LE-01b | 2026-10-01 | Completed | `RUN_CODEX_E2E=1 …` | pass | Pass (56 s) | Pass | `api-e2e-evidence/le-01-codex.log` | — |
| 11 | LE-01d | 2026-10-01 | Completed | `RUN_AGY_E2E=1 …` | pass | Pass (34 s) after matching AGY `call_mcp_tool` + `ToolName` naming (pre-existing) | Pass | `api-e2e-evidence/le-01-agy.log` | — |
| 12 | LE-01a | 2026-10-01 | Completed | `RUN_LMSTUDIO_E2E=1 …` (AutoByteus, LM Studio qwen) | pass | Pass; collaborator-address send returns operation result `accepted:false` with the hint | Pass | `api-e2e-evidence/le-01-autobyteus.log` | — |
| 13 | BR-01 | 2026-10-01 | Completed | `node autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` case A01 (Claude haiku) | UXJ-005 | Pass | Pass | `api-e2e-evidence/browser/A01-*.png`, evidence JSON | — |
| 14 | BR-05 | 2026-10-01 | Completed | probe A02 (Stop → reload → child send), A03 (backend restart → child send) | AC-006 | Pass / Pass | Pass | evidence JSON | — |

| 15 | RC-05 | 2026-10-01 | Completed | isolated reruns after durable test updates: `standalone-error-termination-lifecycle.e2e`, `grok-build-runtime-replay.e2e`, ACP/Grok unit dirs, improver-session test | pass | error-termination 2/2 (harness stub `terminateCollaborationRoot`); Grok replay 6/6 (`FAKE_ACP_REPORT_MCP_READY=1`, `mcpServers` assertion updated to REQ-012); ACP+Grok unit 7 files pass; improver `launchPurpose` assertion passes | Pass | console | — |
| 16 | LE-01 | 2026-10-01 | Completed | all five runtimes in one run | pass | AutoByteus, Codex, Claude, AGY pass; Grok failed at the last step with provider quota `429 free-usage-exhausted` (environment); Grok passed every step in the isolated run (seq 8) | Pass (Grok: env-limited rerun) | `api-e2e-evidence/le-01-all-runtimes.log` | — |
| 17 | BR-02 | 2026-10-01 | Checkpoint | probe T01 (Claude), first attempt | UXJ-001 | probe bug: New chat `@review` + Enter picked "Code Reviewer" (fixed: click the exact target) | — | `api-e2e-evidence/browser/` | rerun |
| 18 | BR-02 | 2026-10-01 | Completed | probe T01 rerun (`browser-2`) | UXJ-001 | menu VIS-001 OK; task Team created and coordinator report reached the Team tab; **F-01** second send from the focused member fails "already has a pending Team message admission"; **F-02** task Team row collapsed (not opened once); **F-03** raw "product_team" label and "product_prototyper" sender | Fail | `browser-2/T01-02-*.png`, `T01-failure.png` | route |
| 19 | F-01 | 2026-10-01 | Completed | temporary web unit probe (see `api-e2e-evidence/F-01-team-mention-send-probe.md`) | mention send settles | `{"observedSettled":false,"nextSendError":"AgentRun 'worker-run' already has a pending Team message admission."}` | Fail (reproduced) | `F-01-team-mention-send-probe.md` | route |
| 20 | BR-03 | 2026-10-01 | Completed | probe O01 (Claude) | UXJ-004 / VIS-008/009 | Pass: menu excludes Org, members, mounted team and its members; footer names analyst; two chips; task Agent + task Team rows (spaced names, opened), no visible "Started by"; Org tab | Pass | `browser-2/O01-*.png` | — |
| 21 | BR-03 | 2026-10-01 | Checkpoint | probe O02 | VIS-010 | probe timing: sent while the task Agent was still running (composer holds text; existing behavior); probe now waits for Idle | — | `browser-2/O02-failure.png` | rerun |
| 22 | PD-01 | 2026-10-01 | Completed | probe P01 (Claude) | AC-013 | Pass: Team and Org trees rewritten without `collaborators` reopen, `@` offered (internal built-ins excluded), member replies OLD-TEAM-OK / OLD-ORG-OK | Pass | `browser-2/cross-scope-agent-mentions-evidence.json` | — |
| 23 | BR-06 | 2026-10-01 | Completed | probe N01 | AC-013 | Pass: New chat `@` is the launch-target picker (run menu absent) | Pass | evidence JSON | — |
| 24 | LC-01 | 2026-10-01 | Checkpoint | probe L01/L02 on Claude | RS-003 | SIGKILL of the host's own `claude` process (under the probe backend only) logged, but a Claude run stays active after a CLI process exit (session resumes lazily; pre-existing) → RS-003 not reachable on Claude by process crash | — | `browser-2/backend.log` | rerun on AGY (`isActive = active && processAlive`) |
| 25 | C-02 | 2026-10-01 | Completed | temporary live observation (Claude, in-process server) | observe | coordinator `get_handoff_rules` → `recipient_address: "/obs_team/mate"`; `send_message_to("/obs_team/mate")` → `COLLABORATION_TARGET_NOT_FOUND`; coordinator reports "Cannot complete handoff rule" | Observed (raise upstream) | `/tmp/csam-c02.log` (summary in report) | route upstream |
| 26 | VIS-013 | 2026-10-01 | Completed | A01 screenshots vs VIS-013 | fidelity | **F-04** Agent-root child header lacks ⚙/+ controls and placeholder reads "Type a message…" (VIS-013: "Message computer use agent…"); the notice avatar difference is pre-existing (same on live Org child) | Fail (fidelity) | `browser/A01-05-*.png` | route |

| 27 | BR-02/BR-04 | 2026-10-01 | Completed | probe T01–T03 (`browser-4-team`, Claude) | — | T01 Fail with F-01, F-02, F-03 (asserted explicitly); T02 Pass (collapsed task Team expanded manually); T03 Pass (VIS-007 live) | T01 Fail / T02 Pass / T03 Pass | `browser-4-team/` | route |
| 28 | LC-01 | 2026-10-01 | Completed | probe L01/L02 `--runtime antigravity_cli` | RS-003, CR-001/002 | L02 Pass (Archive ends lingering root); L01 Pass after probe fixes (crash keeps root+child, child answers, child send restores host, Delete ends root first, child process stops, run dir removed) | Pass | `browser-agy-lifecycle/` | — |
| 29 | RC-05 | 2026-10-01 | Completed | full e2e on base and on branch after updates | no branch-only failures | base 195/43, branch 197/41; no branch-only failure | Pass | `/tmp/csam-base-e2e-full.json`, `/tmp/csam-server-e2e-2.json` | — |
| 30 | final | 2026-10-01 | Completed | full probe (`browser-final`) + standalone cases on the final file (`browser-final-standalone`) | — | A01–A03, P01, N01 Pass on the final file; T01 Fail (F-01–F-03); T02, T03, O01, O02 Pass; L01/L02 not applicable on Claude | — | `browser-final*/` | — |
| 31 | cleanup | 2026-10-01 | Completed | remove `/tmp/csam-base`, `/tmp/csam-grok-wire`, shared `dist/`; process check | none left | done | N/A | — | — |

## Re-entry And Reconciliation

- Last durably recorded event: 31
- Cases still running or not started: none
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"

## Round 2 (API-REV-002, IR-004 @ `bcff48200`, SR-008/SR-010)

### Planned Cases (round 2)

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Notes |
| --- | --- | --- | --- | --- | --- |
| RC-01–06 | repository suites vs base | all | tsc, vitest | as round 1 (+ `tests/skill-improvement`, autobyteus-ts memory) | base worktree recreated for new files |
| LE-01a–e | per-runtime collaborator journey (SR-010) | AC-003/004/005/006/011/012/014/015/016 | live API | rewritten `standalone-agent-collaborator-mention.e2e.test.ts` | |
| LE-02a–e | collaborator Team handoff | AC-003 (DI-001) | live API | same file, second case | |
| BR-01…A05 | standalone journeys incl. replay, old trace, view-doesn't-restore | UXJ-005, AC-006/007/012/016 | browser | rewritten probe A01–A05 | |
| BR-02 T01/T02 | Team journeys incl. CR-003, F-02/F-03 | UXJ-001/002, VIS-001/004/005/006/015 | browser | probe | |
| BR-03 O01/O02 | Org journeys | UXJ-004, VIS-008/009/010 | browser | probe | |
| BR-04 F01 | real add failure, three transports | AC-008/011, VIS-007 | browser + settings | probe | LM Studio host changed |
| LC-01 L01/L02 | AGY host crash | RS-003 | browser + process | probe `--runtime antigravity_cli` | |
| PD-01 P01, BR-06 N01 | old data, New chat | AC-013 | browser | probe | |
| LAT-01 | admission latency in the root gate | CR item 7 | owned backend + WS | temporary `api-e2e-evidence/r2-latency/latency-probe.mjs` | |

### Execution Events (round 2)

| Sequence | Case ID | Timestamp | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-1 | RC-01 | 2026-10-01 | Completed | `pnpm prepare:shared`, `prisma generate`, `tsc -p tsconfig.build.json`, `pnpm build` | clean | clean | Pass | `/tmp/csam2-tsc.log` | — |
| R2-2 | RC-06/RC-02 | 2026-10-01 | Completed | web vitest; 3 contract packages; autobyteus-ts message/memory/input-processor | no new failures | web 3455/4 fail (base set) + 1 load error (base); contracts unchanged (7 pre-existing); autobyteus-ts 56 files pass | Pass | `/tmp/csam2-web.json` | — |
| R2-3 | RC-03 | 2026-10-01 | Completed | `vitest run tests/unit tests/skill-improvement` | no branch-only | 3967/82 fail: 78 base set + 4 skill-improvement tests that fail identically on base | Pass | `/tmp/csam2-unit.json` | — |
| R2-4 | RC-04/RC-05 | 2026-10-01 | Completed | integration, e2e (full) | no branch-only | integration 267/46 (base set); e2e 197/41 (all in base; updated round-1 tests pass) | Pass | `/tmp/csam2-int.json`, `/tmp/csam2-e2e.json` | — |
| R2-5 | LAT-01 | 2026-10-01 | Completed | latency probe, Team run, Claude haiku / Codex gpt-5.5 / AutoByteus qwen | bounded; other commands not blocked | admission ≈0.9–1.1 s (Claude), 554 ms first then 23–36 ms (Codex), 34–65 ms (AutoByteus); concurrent plain send to another member 2–10 ms | Pass | `api-e2e-evidence/r2-latency/` | — |
| R2-6 | LAT-01 note | 2026-10-01 | Completed | Codex Team run on `gpt-5.4-mini` (not in this machine's Codex catalog) | — | every mention refused `COLLABORATOR_ADD_FAILED` "The model 'gpt-5.4-mini' is not available on codex_app_server." — correct per REQ-008 (unlisted root model) | Observation | console | — |
| R2-7 | LE-01c/LE-02c | 2026-10-01 | Completed | `RUN_CLAUDE_E2E=1` | pass | both pass | Pass | `r2-le-claude.log` | — |
| R2-8 | LE-01b/LE-02b | 2026-10-01 | Completed | `RUN_CODEX_E2E=1` | pass | both pass | Pass | `r2-le-codex.log` | — |
| R2-9 | LE-01e/LE-02e | 2026-10-01 | Completed | `RUN_GROK_E2E=1` | pass | first turn `ACP_PROMPT_FAILED` 429 free-usage-exhausted (only model `grok-4.7`) | Blocked (provider quota) | `r2-le-grok.log` | rerun when quota resets |
| R2-10 | LE-01d / LE-01a | 2026-10-01 | Checkpoint | AGY / AutoByteus first attempt | — | test-side: AGY model's first briefing used `message` (server rejected `INVALID_MESSAGE_CONTENT`, model retried); AutoByteus argument shape; test now waits for the first accepted call | — | `r2-le-agy.log`, `r2-le-lmstudio.log` | rerun |
| R2-11 | BR (run 1) | 2026-10-01 | Completed | probe all cases (Claude) `r2-browser-1` | — | A01–A03, T01, T02, O01, O02, P01, N01 Pass; L01/L02 n/a on Claude; A04 test bug (`sender_id` key); F01 probe restore bug | — | `r2-browser-1/` | fixed |
| R2-12 | BR (run 2) | 2026-10-01 | Completed | A01–A04, F01 `r2-browser-2` | — | A01, A02, A04, F01 Pass; A03 precondition (host inactive after restart) false: open page's stream reconnect restores the root by design | — | `r2-browser-2/` | A05 added |
| R2-13 | A05 | 2026-10-01 | Completed | `--cases A05` | viewing a stopped run's collaborator does not restore the host | afterReloadHostSelected=false, afterClickingCollaborator=false, afterReloadWithCollaboratorSelected=false | Pass | `r2-browser-a05/` | A01 in that session: coordinator skipped its handoff (model) → DI-001 made an observation in the probe |
| R2-14 | LE-01/LE-02 | 2026-10-01 | Completed | AGY rerun; AutoByteus rerun; AutoByteus DI-001 with `COLLABORATOR_E2E_STEP_TIMEOUT_MS=1500000` | pass | AGY 2/2; AutoByteus journey Pass (14 min), DI-001 Pass (10 min) | Pass | `r2-le-agy.log`, `r2-le-lmstudio*.log` | — |
| R2-15 | BR final | 2026-10-01 | Completed | full probe on the final file (Claude) `r2-browser-final` | all pass | 14/14 Pass, 0 page errors | Pass | `r2-browser-final/` | — |
| R2-16 | L01/L02 | 2026-10-01 | Completed | `--runtime antigravity_cli --cases L01,L02` | pass | both Pass | Pass | `r2-browser-agy-lifecycle/` | — |
| R2-17 | LE final | 2026-10-01 | Completed | Claude + Codex on the final test file | pass | 4/4 | Pass | `r2-le-claude-codex-final.log` | — |

### Re-entry And Reconciliation (round 2)

- Last durably recorded event: R2-17; nothing running or unstarted.
- Reconciled into `api-e2e-execution-coverage-report.md` (round 2): `Yes`.

### TR-001 Local Fix (API-REV-003)

| Sequence | Case ID | Timestamp | Event | Command | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R3-1 | TR-001 | 2026-10-01 | Checkpoint | `--cases N01,L01` (Claude) | — | backend start failed: `pnpm prepare:shared` output missing after round-2 cleanup | environment | `r2-browser-tr001/backend.log` |
| R3-2 | TR-001 | 2026-10-01 | Completed | `pnpm prepare:shared`, then `--cases N01,L01` (Claude) | L01 Not Applicable, not counted; N01 Pass; exit 0 | `L01 Not Applicable — host-crash cases need a process-bound runtime…`, `N01 Pass`, `Summary: 1 Pass, 0 Fail, 1 Not Applicable`, exit 0 | Pass | `r2-browser-tr001/` |

### Desktop real-use journeys (API-REV-004, user-requested)

Isolated Electron instance built from this worktree (`pnpm --silent isolated-app start --build`, `iso-65265-a875`), public agent package imported through Settings, Claude Agent SDK `haiku`. Driver: `api-e2e-evidence/r3-desktop/desktop-journeys.mjs` (playwright-core over the instance's control port). Evidence: `api-e2e-evidence/r3-desktop/` (screenshots, `desktop-journeys-report.json`).

| Sequence | Case ID | Timestamp | Event | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R4-1 | D0 | 2026-10-01 | Completed | public package imports; SE Team, Product Team, Marketing Team, Product Prototyper available | imported (`agent-package-row-github_repository`); all four definitions found | Pass | `D0-public-package-imported.png` |
| R4-2 | D1 | 2026-10-01 | Completed | Daily Assistant (standalone) `@` Software Engineering Team | menu offers SE Team, not Daily Assistant; Team added at once, opened, 6 members Offline; briefed with `send_message_to`; Team tab "to solution designer"; solution designer view starts "From Daily Assistant:" (no task notice); direct chat answered | Pass | `D1-0*.png`, `D1-05-solution-designer-view.png` |
| R4-3 | D2 | 2026-10-01 | Completed | SE Team run: solution designer `@` Product Prototyper, then `@` Product Team | menu offers Product Prototyper/Product Team/Marketing Team, not its own Team; footer names solution designer; Product Prototyper added Offline, started on first message, view "From Solution Designer:"; second `@` accepted (CR-003); Product Team added opened with members; coordinator started; Team tab shows both briefings | Pass | `D2-0*.png` |
| R4-4 | D3 | 2026-10-01 | Completed | delivery engineer `@` Marketing Team | menu offers Marketing Team, not the already-added Product Team / Product Prototyper; footer names delivery engineer; Marketing Team added with members; coordinator started and answered. Driver Team-tab check ✗: when it ran, the focused view was marketing content creator (its Team tab showed the same briefing "from delivery engineer"); the driver did not click that row — see observation OBS-D3 | Pass (the failed driver check was caused by a manual click in the shared window — OBS-D3) | `D3-0*.png` |
| R4-5 | BI-1…4 | 2026-10-01 | Completed | open each added collaborator (stopped), message it directly, it replies to its host with `send_message_to` | BI-1 Product Prototyper → solution designer `ACK-PROTOTYPER-1`; BI-2 Product Team coordinator → solution designer `ACK-PRODUCT-TEAM-2`; BI-3 marketing content creator → delivery engineer `ACK-MARKETING-3`; BI-4 SE Team solution designer → Daily Assistant `ACK-SE-TEAM-4`. Each collaborator Idle when opened; host received an inter-agent message (server projection) and shows "From <collaborator>:" | Pass (4/4) | `BI-*-0[123]-*.png` |
| R4-6 | SNAP | 2026-10-01 | Completed | baseline before restart | 14 collaborator rows; 3 host + 4 collaborator conversations recorded | — | `RESTORE-00-before-tree.png`; baseline in report JSON (reconstructed from console output after an overwrite in the driver; tails = last 80 chars) |
| R4-7 | RESTORE | 2026-10-01 | Completed | `isolated-app restart` (app + server, same data root): same tree, same conversations, collaborators Offline; sending continues both ways | same 14 rows; all collaborators Offline; all 7 conversations unchanged; RS-1…4: each Offline collaborator messaged directly woke and replied to its host (`RS-*` tokens, "From <collaborator>:" in the host view); each host then sent `PING-RS-n` with `send_message_to` and the collaborator received it "From <host>:" | Pass (9 + 16 checks) | `RESTORE-01-after-tree.png`, `RS-*-0[1234]-*.png` |

- OBS-D1: in D1/D2 the collaborator answered in its own conversation without `send_message_to` back to its host (the solution designer's re-briefing dropped "report back"). Agent behaviour; the explicit round trips (BI/RS) prove both directions.
- OBS-D3: in D3 the focused view changed from delivery engineer to marketing content creator between the send and the Team-tab check, with no click by the driver. Screenshot `D3-02` (right after the add) still shows delivery engineer focused. Not seen in D2 (same sequence, solution designer stayed focused), BI or RESTORE. Explained: the user confirmed they clicked the UI manually during the run; not a product behaviour.
- Reconciled into `api-e2e-execution-coverage-report.md`: `Yes`. Instance stopped (`isolated-app stop iso-65265-a875`; owned data root removed).
