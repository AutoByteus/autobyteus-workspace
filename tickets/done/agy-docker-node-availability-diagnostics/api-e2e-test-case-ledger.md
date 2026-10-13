# API/E2E Test-Case Ledger — agy-docker-node-availability-diagnostics

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics` (HEAD `87b246c7d`)
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope: repository cases and the live Docker-node + browser cases (long-running, real paid run).
- Last updated: 2026-10-12

## Planned Cases

| Case ID | Case / Journey | REQ / AC | Boundary / Surface | Planned Command Or Entry Point | Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-001 | Focused server unit tests (classifier + consumers) | AC-001, AC-002, AC-007, QR-001/002 | Server unit | `vitest run` focused files | 1 | |
| API-001 | New GraphQL E2E: signed-out / network failure / recovery | AC-001, AC-004 (server) | GraphQL schema | `vitest run tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` | 2 | Durable |
| REPO-002 | Existing runtime-capability GraphQL E2E | DEC-002 contract | GraphQL schema | `vitest run tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts` | 3 | |
| REPO-003 | Web menu + composable specs | AC-003, AC-004, AC-005 | Web component | `vitest run` two specs | 4 | |
| REPO-004 | Localization guards, server typecheck, legacy-key grep | REQ-003, legacy removal | Guards | guard scripts | 5 | |
| LIVE-001 | Docker node signed out, real `agy`: CLI exit + GraphQL reason | AC-001 | Live API (Docker) | probe | 6 | |
| LIVE-002 | Menu on signed-out node (en): "Unavailable" + reason, `title`, `aria-disabled`, no "Not installed" | AC-003 | Browser | probe | 7 | |
| LIVE-003 | Menu on signed-out node (zh-CN): "不可用" + reason | AC-003 | Browser | probe | 8 | SCN-A3 |
| LIVE-004 | Sign in on the node (state streamed in), reopen menu: one forced AGY request; row enabled; real models | AC-004 | Browser + Docker | probe | 9 | |
| LIVE-005 | Third open, all available: no availability request | AC-005 | Browser | probe | 10 | |
| LIVE-006 | Pick an AGY model, send a message: run streams a reply and completes | AC-006 | Browser + Docker + real agy | probe | 11 | Paid run (1 short message) |
| LIVE-007 | Real-agy alternates in the container via the mounted dist: network failure → generic; HOME empty → sign-in; missing command → new not-found text | AC-001 alt, AC-002 | Container CLI/module | probe (`docker exec node -e`) | 12 | SCN-A2 |
| LIVE-008 | Sign-in lapses after use, app reopened: New chat → AGY row Unavailable + reason, label aligned; AGY not preselected | AC-003 | Browser | probe | 13 | SCN-A1 (corrected after run-1) |
| DOCS-001 | Docs review | AC-008 | Docs | `git show` | 14 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-001 | 2026-10-12 16:48 | Completed | clean env `vitest run …agy-runtime-availability-graphql.e2e.test.ts` | 3 pass | 3 passed; against the base classifier 2 of 3 fail (proves sensitivity), source restored | Pass | `api-e2e-evidence/repo/api-001-*.log` | — |
| 2 | REPO-001 | 2026-10-12 16:50 | Completed | focused server unit | pass | 24 files / 384 tests passed (4 gated files skipped) | Pass | `api-e2e-evidence/repo/r1-server-unit-focused.log` | — |
| 3 | REPO-002 | 2026-10-12 16:50 | Completed | clean env, both GraphQL E2E files | pass | 2 files / 7 tests passed | Pass | `api-e2e-evidence/repo/r2-server-graphql-e2e.log` | — |
| 4 | REPO-003 | 2026-10-12 16:51 | Completed | web specs | pass | 2 files / 17 tests passed | Pass | `api-e2e-evidence/repo/r3-web-menu-specs.log` | — |
| 5 | REPO-004 | 2026-10-12 16:52 | Completed | guards + typecheck + `git grep notInstalled\|chat-runtime-not-installed` | pass, no refs | all exit 0; no chat-menu legacy refs | Pass | `api-e2e-evidence/repo/r4-guards-typecheck.log` | — |
| 6 | LIVE-001 | 2026-10-12 (before run-1) | Completed | test node `agy-api-e2e-node` (beta image + branch dist ro), real agy 1.3.3, fresh /root | exit 1 sign-in wording; GraphQL sign-in text | as expected; catalog error = sign-in text; other runtimes enabled | Pass | `api-e2e-evidence/live/live-001-signed-out.txt` | — |
| 7 | LIVE-002 | 2026-10-12 16:31:52Z | Completed | probe run-1 (en, 1512×952) | Unavailable + reason, title, aria, keys skip | as expected | Pass | `live/run-1/` | — |
| 8 | LIVE-003 | 2026-10-12 16:31:58Z | Completed | probe run-1 (zh-CN) | 不可用 + reason | as expected | Pass | `live/run-1/` | — |
| 9 | LIVE-004 | 2026-10-12 16:32:04Z | Completed | token streamed 8001→test node; reopen | 1 forced AGY request; enabled; models | 1 `GetRuntimeAvailability(antigravity_cli)`; enabled at 2.1 s; 18 models | Pass | `live/run-1/` | — |
| 10 | LIVE-005 | 2026-10-12 16:32:07Z | Completed | third open | 0 availability requests | 0 | Pass | `live/run-1/results.json` | — |
| 11 | LIVE-006 | 2026-10-12 16:37:13Z | Completed | run-1, `gemini-3.6-flash-low` | reply + completion | run created on AGY; no reply in 300 s; agy log: 429 "Individual quota reached" | Blocked | `live/run-1/results.json` | retry other models |
| 12 | LIVE-007 | 2026-10-12 16:37:17Z | Completed | `docker exec node` on mounted dist; proxy / empty HOME / missing cmd | generic / sign-in / not-found texts | as expected; raw proxy failure has 0 sign-in-wording lines | Pass | `live/run-1/results.json` | — |
| 13 | LIVE-008 | 2026-10-12 16:37:23Z | Completed | run-1: expected AGY current runtime | dot on AGY | AGY not current: New chat falls back when last-used runtime is disabled (`chatDraftStore.resolveChatNavDefaultModel`) — probe assumption wrong | N/A (probe corrected) | `live/run-1/results.json` | rerun corrected case |
| 14 | LIVE-006 | 2026-10-12 16:49:39Z | Completed | run-2, models gemini-3.1-pro-low, claude-sonnet-5-5-low, gpt-oss-120b-medium, gemini-3.8-flash-low | reply + completion | every model: UI "An Error Occurred — Individual quota reached…" (Gemini resets ~10 h, others ~113 h); status Error | Blocked | `live/run-2/LIVE-006-*.png` | needs quota or another account |
| 15 | LIVE-008 | 2026-10-12 16:49:45Z | Completed | run-2 corrected case | AGY Unavailable + reason; not preselected | as expected; New chat on AutoByteus; label aligned (Δ0.25 px) | Pass | `live/run-2/LIVE-008-*.png` | — |
| 16 | DOCS-001 | 2026-10-12 | Completed | docs diff review | README covers message, fix, per-node /root | as expected | Pass | `git show 87b246c7d` | — |
| 17 | API-001 | 2026-10-12 (round 2, IR-002 `56b11aeae`) | Completed | clean env, both GraphQL E2E files; expected string updated by implementation to the new text | 3+4 pass | 7 passed | Pass | `api-e2e-evidence/repo-r2/api-001-and-repo-002.log` | — |
| 18 | REPO-001 | 2026-10-12 (round 2) | Completed | `tests/unit/runtime-management` + AGY consumers | pass | 474 passed, 1 failed: `grok/grok-build-capability.test.ts` timed out after 938,972 ms (5 s limit) under load average 97–141; rerun alone 5/5 pass. Unrelated (Grok untouched) | Pass (with unrelated timeout, rerun green) | `repo-r2/r1-server-unit-focused.log`, `repo-r2/grok-capability-rerun.log` | — |
| 19 | REPO-003 | 2026-10-12 (round 2) | Completed | web menu specs | pass | 17 passed | Pass | `repo-r2/r3-web-menu-specs.log` | — |
| 20 | REPO-004 | 2026-10-12 (round 2) | Completed | guards + typecheck + `git grep "is not signed in. Run"` | pass, no old text | exit 0; old text gone from server and web source | Pass | `repo-r2/r4-guards-typecheck.log` | — |
| 21 | LIVE-001 | 2026-10-12 (round 2) | Completed | fresh test node with `56b11aeae` dist, real agy signed out | GraphQL reason = new text | exact new text; catalog error = new text | Pass | `live-r2/live-001-signed-out.txt` | — |
| 22 | LIVE-002/003/004/005/007/008 | 2026-10-12 (round 2) | Completed | probe `CASES=…` with `SIGN_IN` = new text | as in round 1 with new text | all 6 Pass; reason shows in 2 lines, not clamped; reopen → 1 AGY request, enabled 2.4 s, 18 models; third open 0 availability requests | Pass | `live-r2/run-1/` | — |
| 23 | LIVE-006 | 2026-10-13 04:5x local (round 3) | Completed | fresh test node, `56b11aeae` dist, token streamed from 8001; `AGY_MODELS=gemini-3.6-flash-low,gemini-3.8-flash-low,gemini-3.1-pro-low` | reply + completion | 3.6-flash-low no longer offered; `gemini-3.8-flash-low`: reply `PONG-7731` in 5.2 s, status Idle, projection has assistant reply | Pass | `api-e2e-evidence/live-r3/run-1/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 23 (LIVE-006 round 3)
- Last completed case and result: LIVE-006 Pass (round 3); every planned case now has a terminal Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation" 
