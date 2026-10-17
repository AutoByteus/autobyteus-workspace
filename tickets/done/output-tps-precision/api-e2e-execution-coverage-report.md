# API/E2E Execution Coverage Report — output-tps-precision

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/requirements-doc.md` (R3)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/solution-revision-record.md` (SR-006)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-spec.md` (D3.2)
- Supplemental Task Artifacts: Task screenshots and the user's card screenshot (evidence only)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md` (ARCH-REV-003)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-report.md` (CRR-003)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-revision-record.md`
- Delivery Revision Record: N/A — not applicable
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-revision-record.md`
- Current API/E2E Revision ID: API-REV-002
- Current Execution Round: 2
- Trigger: code_reviewer pass CRR-003 (round 3, targeted delta review of IR-002, the Codex rework for API-L04 / CR-F01)
- Prior Round Reviewed: round 1 (API-REV-001, Fail on API-L04)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: Large
- Architectural risk: High
- Input route: Reviewed
- Successful-output route: Code Review
- Proportional test-code review decision: Required (changed durable test code: `token-meter-tps-live.e2e.test.ts`)

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md` (round 2 section added)
- Investigation completed before durable coverage changes or final execution: Yes
- Investigation plan followed: Yes. One deviation, directed by the user mid-round: "I don't have tokens for Codex now. Try other models." So:
  - the round-2 desktop journeys run on native AutoByteus with DeepSeek (`deepseek-v4-flash`) instead of Codex;
  - credentials were imported from `/Users/normy/.autobyteus/server-data/.env` with `pnpm secrets:import`, as the user instructed. They went into the isolated instance's database and into the persistent test database `autobyteus-server-ts/db/test.db`.

  The Codex live API cases (L03, L04, L08) had already run before that instruction.
- Existing coverage decisions revised: the live suite gained API-L08 (Codex approval wait), API-L09 (native DeepSeek) and an external-server mode (`AUTOBYTEUS_TEST_SERVER_URL`) for running against the built test server on the persistent, key-holding test database.
- Reroute required: No

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: Yes
- Every completed case recorded immediately: Yes
- Ledger reconciled into this report: Yes
- Last durably recorded event: 33
- Cases still running, interrupted or not started: none. API-D01 on Codex (event 25) was not run, at the user's direction; D01 ran on DeepSeek instead.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| API-R01–R04 (round 2) | Pass (integration: known baseline only) | 18, 23 | `evidence/api-e2e/round2/repo/` | — |
| API-R05–R07 | Pass (round 1; packages unchanged in IR-002) | 10 | `evidence/api-e2e/repo/` | — |
| API-E01, E02 | Pass (round 1; AGY, contracts and web unchanged since) | 11, 12 | `evidence/api-e2e/transport/`, `browser-fixture/` | — |
| API-L01, L02, L05, L06, L07 | Pass (round 1; runtimes unchanged since CRR-001) | 2–9 | `evidence/api-e2e/live/` | — |
| API-L03 | Pass (round 2) | 19 | `round2/live/codex/` | — |
| API-L04 | **Pass (round 2; round-1 failure resolved)** | 19 | `round2/live/codex/` | — |
| API-L08 | Pass (round 2) | 21 | `round2/live/codex-approval/` | First attempt: test setup (no approval asked), fixed |
| API-L09 | Pass | 31 | `round2/live/deepseek/` | — |
| API-D01 | Pass (round 1 Codex; round 2 DeepSeek) | 15, 27 | `desktop/D01/`, `round2/desktop/D01/` | — |
| API-D02 | Pass (round 1 Codex; round 2 DeepSeek) | 16, 28 | `desktop/D02/`, `round2/desktop/D02/` | — |
| API-D03 (Org) | Pass | 29 | `round2/desktop/D03/` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate or ambiguously describe backward compatibility: No
- Compatibility-only or legacy-retention behavior observed: No. IR-002 retires the IR-001 tool-freeze rule outright; there is no dual path.
- Approved persisted-data transition followed: Yes (Not Affected)
- Durable coverage for compatibility-only behavior: No
- Compatibility reroute: N/A

## Acceptance-Criteria Proof

- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/evidence/api-e2e/` (round 1 at the top level; round 2 under `round2/`)

| AC | Critical | Proven By | Evidence Files | Result |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L09, API-D01 (DeepSeek), API-L01, API-E01 | `round2/live/deepseek/API-L09-deepseek.json` (single native DeepSeek call → generation 788 tok / 4,067 ms); `round2/desktop/D01/D01-result.json` + `D01-2-reading-help.png` (the original "Collecting" scenario: DeepSeek Flash single call shows 125.0 tokens/s); `live/autobyteus/` (LM Studio) | Proven |
| AC-002 | Yes | API-L02 (wire) | `live/claude-wire/`: reading 3,135 ms = raw `message_start` → `message_delta` | Proven |
| AC-003 | Yes | API-L06, API-L09, API-L01, API-L03 | `live/agy/API-L06-agy-thinking.json` (thinking > 0 → end_to_end); DeepSeek/LM Studio reasoning streamed first → generation; Codex end_to_end | Proven |
| AC-004 | Yes | API-L03, API-L04, API-L08 (round 2), API-L05, API-L07, API-E01 | `round2/live/codex/` and `round2/live/codex-approval/` (readings equal the boundary → `rawResponse/completed` windows; neither the tool nor a 6.1 s approval wait is in any reading); `live/agy/`; `live/grok/` | Proven |
| AC-005 | Yes | API-D02, API-D03, R02 | `round2/desktop/D02/D02b-result.json` (coordinator, /worker member and delegated copy, each with its own reading); `round2/desktop/D03/D03-result.json` (Org direct agent lead 119.0; Org team member crew/worker 113.0; crew/coordinator without a call "—") | Proven |
| AC-006 | Yes | API-D01, API-E01, API-E02 | `round2/desktop/D01/D01-result.json` (idle keeps the value; switching runs; reload "—"; history "—"); E01 tiny call | Proven |
| AC-007 | Yes | API-D01, API-E02 | Generation card (no qualifier): "TPS / 125.0 tokens/s / deepseek-v4-flash / How TPS is measured"; end-to-end card with qualifier in round-1 D01; zh-CN 320 px in E02 | Proven |
| AC-008 | Yes | API-D01, API-E02, docs review | Generation help: "…from its first streamed output to its end (171 tokens in 1.37 s)…"; end-to-end help in round 1 | Proven (C-004 README stays with delivery) |
| AC-009 | Yes | R01–R07, E01 | `round2/repo/summary.txt`; `transport/run-1/persisted-summary.json` | Proven |
| AC-010 | Yes | Matrix below | this report | Proven |

### AC-010 per-runtime matrix

| Runtime | Live | Scripted | Method observed | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus` | DeepSeek `deepseek-v4-flash` (API key imported into the test DB; desktop instance too); LM Studio `qwen/qwen3.6-35b-a3b` | Unit (LlmPhase) | generation (reasoning streamed first) | Pass | DeepSeek: 193.8 tok/s via API, 125.0 in the desktop single call |
| `claude_agent_sdk` | `haiku`, `sonnet` (round 1) | Unit | generation | Pass | Reading equals the raw frame window exactly |
| `codex_app_server` | `gpt-5.6-luna` (L03, L04, L08 in round 2) | Unit (P5/P6 + live captures replayed) | end_to_end | Pass | Readings equal boundary → `rawResponse/completed`; tool and approval excluded |
| `antigravity_cli` | `gemini-3.8-flash-low`, `-high` (round 1) | Scripted transport e2e | generation / end_to_end | Pass | RSK-005: output includes thinking; cadence streamed |
| `grok_build` | `grok-4.7` (round 1) | Unit | end_to_end | Pass | First call includes setup (documented) |

## Round-2 Codex Evidence (prior failure API-L04)

Times are ms after send, from wrapper stamps (`round2/live/codex/codex-wire.jsonl`, `round2/live/codex-approval/codex-wire.jsonl`). Model `gpt-5.6-luna`, codex-cli 0.162.1.

| Case | Call | Boundary → end | Reading | Excluded |
| --- | --- | --- | --- | --- |
| L03 | single | `userMessage` completed 2,420 → `rawResponse/completed` 5,208 | 216 tok / 2,788 ms (77.5 tok/s) | 2.4 s of turn setup before the boundary |
| L04 | 1 (tool-ending) | 1,525 → 3,054 | 110 tok / 1,529 ms (71.9 tok/s), published at 6,184 with its usage update after the tool (expected, documented) | `sleep 3` tool 3,281 → 6,170 |
| L04 | 2 | tool `item/completed` 6,170 → 8,303 | 162 tok / 2,134 ms (75.9 tok/s) | — |
| L08 | 1 (tool-ending, approval) | 3,360 → 8,137 | 121 tok / 4,777 ms | Approval wait 8,128 → 14,231 (6.1 s) |
| L08 | 2 | tool `item/completed` 14,295 → 23,237 | 184 tok / 8,943 ms | Approval and tool |

- Round 1 compared with round 2: the same tool-ending call shape read 22.0 / 25.0 tok/s in round 1 (tool time included). It now reads 71.9 tok/s with the tool excluded.
- C-011 (held for evidence) is not observed. Across 4 captures and 12 calls, the only tool `item/started` before its own call's `rawResponse/completed` is L08 call 1 (9 ms earlier), and that call had a reasoning item. Its reading is still correct.

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC | Changed Boundary | Surface / Mode | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API-R01–R04 (round 2) | all | Server | Repository suites | Durable | Pass | `round2/repo/` |
| API-L03/L04/L08 | AC-004, SCN-002 | Codex timing (IR-002) | Live server + codex app-server + wire stamps | Live (durable gated) | Pass | `round2/live/codex*/` |
| API-L09 | AC-001/003 | Native LlmPhase + DeepSeek | Built test server on the persistent test DB (imported keys) | Live (durable gated) | Pass | `round2/live/deepseek/` |
| API-D01 | AC-001,006–008 | Full product, standalone | Isolated desktop, DeepSeek | Desktop | Pass | `round2/desktop/D01/` |
| API-D02 | AC-005 | Team member + delegated copy | Isolated desktop, DeepSeek | Desktop | Pass | `round2/desktop/D02/` |
| API-D03 | AC-005 | Org direct agent + Org team member | Isolated desktop, DeepSeek | Desktop | Pass | `round2/desktop/D03/` |
| Round 1 cases | see API-REV-001 | — | — | — | Pass (except L04, now resolved) | top-level `evidence/api-e2e/` |

## Additional Repository Coverage Execution

| Order | Command | Configuration | Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| R2-1 | `pnpm -C autobyteus-server-ts typecheck` | — | Type policy | Pass | `round2/repo/R01-server-typecheck.log` |
| R2-2 | `vitest run tests/unit/agent-execution/backends/codex …/domain/model-call-throughput.test.ts …/backends/shared …/token-usage-model-call-fold.test.ts` | — | Codex timing + acceptance | Pass (25 files) | `round2/repo/R02-server-codex-tps-unit.log` |
| R2-3 | `pnpm -C autobyteus-server-ts test:unit` | — | Regression | Pass (693 files) | `round2/repo/R03-server-unit.log` |
| R2-4 | `test:integration:prepare` + `test:integration` | — | Regression | Pass except the 2 TESTING.md baseline cases | `round2/repo/R04-server-integration.log` |
| R2-5 | `pnpm test:e2e:real:preflight` | after the test-DB import | Credential readiness | Pass (16/16; deepseek.llm READY) | `round2/live/real-preflight.log` |

## Validation Confidence Scorecard

| Category | Round-1 Final | Round-2 Final | Change | Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 95% | +20 | Every AC directly proven; AC-004 Codex fixed and proven live | — |
| Changed-boundary execution directness | 95% | 95% | 0 | Codex readings matched against raw wire again | — |
| Cross-boundary integration realism | 95% | 95% | 0 | Desktop Team, delegated, Org on real DeepSeek | — |
| Environment / identity / fixture fidelity | 90% | 95% | +5 | Keys imported through the documented importer into the instance DB and the test DB; preflight READY; DeepSeek run as originally requested | AGY still on the host login (TESTING.md recipe outdated) |
| Failure, edge-case, lifecycle, recovery | 75% | 95% | +20 | Tool and approval-wait exclusion; reload, history, idle, tiny call | Codex desktop journey not rerun on IR-002 (no Codex tokens); covered by the live API cases through the same server code |
| User surface / browser / desktop | 95% | 95% | 0 | Generation and end-to-end cards both seen in the real app; Org added | — |
| Durable regression coverage | 95% | 95% | 0 | Live suite: 9 gated cases incl. approval wait and DeepSeek | — |

- Overall final confidence: 95% (simple average)
- Every critical AC directly proven: Yes
- Final categories below 90%: No
- Default 95% target met: Yes
- Confidence-limiting residual risks (non-material):
  - the Codex desktop journey was not repeated on the IR-002 build (user out of Codex tokens);
  - the AGY live runs used the host login.

## Broader Validation Decision And Execution

- Decision: Required; executed (Live API, Project Desktop Validation).
- Deviations: DeepSeek instead of Codex for the desktop journeys (user direction); credentials imported with `pnpm secrets:import` (user direction).
- Startup:
  - `CODEX_HOME=<tmp> pnpm --silent isolated-app start --build` → `iso-50466-56b5`. Packaged server verified to contain the IR-002 `rawResponse/completed` handling.
  - Import into the instance database, then `isolated-app restart`.
  - Built test server via `probes/run-against-test-server.mjs` (`startBuiltTestServer`, persistent runtime root, `db/test.db`).
- Seed data: public GraphQL only (`probes/desktop-seed.mjs` with `autobyteus deepseek-v4-flash`; `probes/desktop-org-seed.mjs`).

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| D01 single DeepSeek call | Reading, no qualifier (generation) | 125.0 tokens/s = 171/1.368 s; "deepseek-v4-flash" | D01-result.json, D01-2-reading-help.png | Pass |
| D01 help / idle / switch / reload / history | Per AC-006/008 | All as expected | D01-result.json, D01-3/4 screenshots | Pass |
| D02 Team member, delegated copy | Own readings | 165.0 / 151.4 / 155.2 | D02b-result.json | Pass |
| D03 Org lead / crew coordinator / crew worker | Own reading / "—" / own reading | 119.0 / "—" / 113.0 | D03-result.json, D03-2/3 screenshots | Pass |

## Desktop Application Validation

- Approach: isolated worktree build, CDP attach with ticket-owned scripts, viewport 1700×1050.
- Web-equivalent behavior: proven in the real app for standalone, Team, delegated copy and Org.
- Shell-specific behavior: none changed.
- Effect on the user's running app and others' instances: none. `iso-55100-137c`, `iso-51775-c59d` and `iso-56817-5e44` were untouched.
- Not proven: the Codex desktop journey on the IR-002 build. The renderer is runtime-agnostic, and the Codex server path is proven live in L03/L04/L08.

## Platform / Runtime Targets

- macOS (darwin arm64), Node 22.23.1
- codex-cli 0.162.1, DeepSeek API (`deepseek-v4-flash`); round-1 runtimes as recorded in API-REV-001
- Packaged Electron worktree build (round 2 `app.asar` hash in `round2/desktop/app-asar.sha256`)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: Not Affected; full suites green; no TPS stored.
- Version-specific branch or fallback: No.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-live.e2e.test.ts` | Added (round 1); updated (round 2) | REQ-009/AC-010; AC-001–004 per runtime; SCN-002 for Codex tools (L04) and approval waits (L08, new); native DeepSeek (L09, new); external built-test-server mode (`AUTOBYTEUS_TEST_SERVER_URL`) | L01–L07 pass (round 1; L03/L04 rerun pass in round 2); L08, L09 pass. Gate off: 9 skipped |

- Added and updated paths are attached for proportional test-code review.
- Removed paths: none.

## Other Execution Artifacts

| Artifact Path | Type | Retained | Notes |
| --- | --- | --- | --- |
| `evidence/api-e2e/round2/repo/` | Repository logs | Retained | — |
| `evidence/api-e2e/round2/live/` | Live JSON timelines, raw Codex wire (account frames redacted), preflight log | Retained | No key values anywhere (scanned) |
| `evidence/api-e2e/round2/desktop/` | start/stop receipts, asar hash, instance log, D01–D03 results/screenshots, harness-attempt screenshots | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| `probes/stdout-stamp-wrapper.mjs` | Raw Codex wire timing | Used for L03/L04/L08 | Retained |
| `probes/desktop-seed.mjs` (now runtime/model arguments), `desktop-standalone.mjs` (method-agnostic), `desktop-team-send.mjs`, `desktop-team-select.mjs`, `desktop-org-seed.mjs`, `desktop-org.mjs`, `org-frame-probe.mjs`, `ws-probe.mjs`, `cdp.mjs` | Ticket-owned desktop journeys and diagnostics | Pass | Retained; instance stopped |
| `probes/run-against-test-server.mjs` | Run a live-suite case against the built test server on the key-holding test DB | L09 pass; server stopped | Retained |

## Dependencies Mocked Or Emulated

None in round 2.

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | All round-2 cases: R01–R04, L03, L04, L08, L09, D01, D02, D03; carried-over round-1 passes | — |
| Not Tested | Codex desktop journey on the IR-002 build | User has no Codex tokens; the Codex server path is proven live |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-50466-56b5` (and its data root with imported keys) | Mine | `isolated-app stop` | Stopped, not forced; data root removed; ports released |
| Built test server for L09 | Mine | `server.stop()` | Stopped |
| `/tmp/tps-codex-home.*`, `/tmp/tps-desktop-ws`, `/tmp/tps-r2-*.sh`, `/tmp/tps-wsprobe.mjs` | Mine | `rm -rf` | Removed |
| Persistent test DB `autobyteus-server-ts/db/test.db` with the imported vault | Created at the user's direction | Kept (gitignored `/db/`), for further API testing | Delivery: removed with the worktree at cleanup |
| Definitions/runs created by L08/L09 on the external test server | Test-owned | Runs terminated and definitions deleted by the suite; token rows remain in the test DB | — |

## Preliminary Classification

N/A (Pass).

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 95%
- Default 95% target met: Yes
- Final categories below 90%: No
- Broader validation decision: Required, executed
- Critical ACs lacking direct proof: None
- Behavior only the user can check: None
- Next recipient: per `get_handoff_rules` (proportional test-code review, Large/High)
- Notes for delivery:
  - C-004: stale `autobyteus-web/README.md` Token Meter paragraph (lines 64–68).
  - C-010: `codex-model-call-timing.test.ts` reads live captures from `tickets/in-progress/output-tps-precision/evidence/...`. When the ticket moves to `tickets/done/`, repoint the path or copy the captures into `autobyteus-server-ts/tests/fixtures/`, then rerun the test. My `round2/live/codex*/` captures are additional evidence and are not read by tests.
  - TESTING.md: the agy token-file recipe does not apply to agy 1.3.5. The user's instruction to import credentials into the test env (`pnpm secrets:import -- --source <.env> --database-url file:<abs>/autobyteus-server-ts/db/test.db`) worked, and the preflight reports READY. The live suite's external-server mode is the way to run native-provider cases on that database.
  - Observation outside scope: the other Token Meter cards format numbers with the system locale ("13.481"); TPS uses the app locale (pre-existing).
