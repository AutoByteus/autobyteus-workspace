# API/E2E Execution Coverage Report — anthropic-prompt-caching

## Execution Round Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/`.

- Requirements Doc: `requirements-doc.md` (SR-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-005)
- Supplemental Task Artifacts: `probes/` (evidence only)
- Design Review Report: `design-review-report.md` (ARCH-REV-003)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002` (adds the desktop/Electron round; API-REV-001 = server-boundary round)
- Current Execution Round: 2 (round 2 = real desktop app, requested by the user)
- Trigger: code review pass CRR-001
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 2. Server-boundary evidence = live run 6 (API-REV-001); desktop evidence = DSK-001..005 (API-REV-002)
- Code under validation:
  - round 1: `80845f45e`;
  - round 2 (desktop): a packaged build of `a89fe62cc`, which is the delivery checkpoint `b684a8963` + merge of `origin/personal` @ `e350a194b`.
- The durable test is unchanged in round 2.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (one added gated live E2E file)

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with these deviations:
  1. **Thinking-producing scenario.** In run 1, adaptive thinking appeared on only 1 of 38 calls, too few to prove AC-004, P-005 and AC-013(b) with real thinking blocks. The final scenario is a dependency-cycle audit with the user-selectable `thinking_display: "summarized"`. In run 6, 27 of 44 responses carry thinking.
  2. **Refused prompt.** An arithmetic "compute the next file" prompt was refused by Anthropic's classifier (`stop_reason: refusal`), with or without strict mode or summarized display (`api-e2e-evidence/refusal-probe/`). It was replaced.
  3. **Dropped case.** APC-E2E-006 (Stop with a pending approval → restore) was removed from the durable suite because of a pre-existing Stop hang.
  4. **Case order.** APC-E2E-007 (meter) runs before the restore because of a pre-existing restored-run usage defect. The restore case runs before the Settings change, so the snapshot still holds thinking.
- Existing coverage decisions revised during execution: none. All existing tests remained `Still Valid`.
- Reroute required: `No` for this change. Two pre-existing, base-identical defects were found and are reported as separate items (see Result Summary).

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes` (case results JSON is written after each case; ledger rows after each run)
- Long-running checkpoints: `Yes` (runs 2–5, probes)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: run 6 completed, 7/7 Pass
- Cases still running, interrupted, or not started: none
- Interruption note: run 5 was killed by a machine power-off during APC-E2E-001 and produced no case result. Its temp dirs were removed, and run 6 reran the full suite.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| APC-E2E-001 | Pass | run 6 | `api-e2e-evidence/live-run-6/` | — |
| APC-E2E-002 | Pass | run 6 | same | — |
| APC-E2E-003 | Pass | run 6 | same | — |
| APC-E2E-004 | Pass | run 6 | same | P-005 proven in its strict form |
| APC-E2E-005 | Pass | run 6 | same | — |
| APC-E2E-006 | Not Tested (blocked by pre-existing defect DEF-A) | probe | `api-e2e-evidence/stop-pending-probe/` | Its API-shape risk is covered by APC-E2E-004 (see matrix) |
| APC-E2E-007 | Pass (before restore) | run 6 | same | The restored-run gap is pre-existing defect DEF-B |
| APC-E2E-008 | Pass | run 6 | same | — |

## Compatibility / Legacy Scope Check

- Requirements/design introduce compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Approved persisted-data transition followed: `Yes`. Directly usable: a real snapshot holding thinking was restored through `restoreAgentRun` and continued.
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

Run 6 values are reported per case. "Strict" means the request was sent with `thinking.block_binding.prefix_mismatch_behavior: "error"` and beta `thinking-binding-controls-2026-08-01`.

**APC-E2E-001 — AC-002, AC-004, REQ-003** · New turn on append-only history (studio server → native runtime → Anthropic, strict) · Live, durable · **Pass**
- Evidence: `live-run-6/case-results.json`, `calls-full.json`
- T1 had 13 calls, 11 of them tool-cycle responses with thinking.
- T2's first request carries all 11 thinking blocks.
- It reads 21850 tokens: exactly the previous request's cached prefix (20547 read + 1303 written).
- It writes 254 tokens, the new input only. Strict mode accepted it.
- Every consecutive request is block-level append-only, with identical system and tools.

**APC-E2E-002 — AC-011, REQ-010** · Interruption note in place · Live, durable · **Pass**
- Stop generation at a pending approval, then a new turn: no 400.
- The system sha is unchanged (`93b3945c…`) and contains no note.
- The note is block 89 of 91, after the full prior history.
- T4's first call reads 33199 tokens from cache.

**APC-E2E-003 — AC-001, AC-003, AC-012, QR-001, QR-002** · Run-level caching, marker shape, SDK · Live, durable · **Pass**
- 31 calls across 4 turns. Every call after the first has `cache_read_input_tokens > 0`.
- Run-level hit: 679606 / 715809 = **94.9%**.
- All writes are 1h (36115 tokens); 5m writes are 0.
- Every request has exactly 2 `cache_control` markers: the system block and the top-level marker, both `{ephemeral, 1h}`.
- `x-stainless-package-version: 0.132.1` on every live call; the server package resolves 0.132.1.
- There were 0 marker-caused 400s.

**APC-E2E-007 — AC-006, REQ-006** (meter side of AC-007) · Meter pricing · Live (GraphQL `getAgentRunTokenUsageSummary`), durable · **Pass**
- 31/31 reports.
- The summary equals Anthropic's raw usage exactly: input 88, read 679606, 1h write 36115, output 9174.
- Cost $0.6086732 equals the raw usage at catalog prices $4/$0.20/$8/$20.
- `cacheState` is `positive`.

**APC-E2E-005 — AC-013(b)** (persisted data) · Restore with thinking · Live (Stop → `restoreAgentRun`), durable · **Pass**
- The persisted snapshot held thinking, and the last request before Stop carried 17 thinking blocks.
- The first request after restore carries 0 thinking blocks and is accepted. Its tools and system are unchanged.
- It reads 7441 cached tokens (system + tools) and rewrites 24237 (the known one-time restore rewrite).
- Later calls read 31678–34282 tokens and are append-only. New thinking accumulates again (1, 2, 3 blocks).

**APC-E2E-004 — AC-013(a), P-005, REQ-012** · Settings change mid tool round · Live (GraphQL `updateServerSetting` `DEFAULT_IMAGE_GENERATION_MODEL` → `imagen-4`), durable · **Pass**
- The agent waits on approval of call 37's `tool_use`, whose response carried thinking; that request held 3 thinking blocks.
- The Settings change reloads the `generate_image` schema: tools sha changes from `00f08e4b…` to `bb8319c2…` and the tools contain `imagen-4`.
- The continuation (call 38) has 0 thinking blocks. The pending round's assistant turn is sent as `[tool_use]` only, and the last message is the user tool_result.
- Status 200 under strict mode.
- Read 0 / write 36569: tools changed, so the full prefix is rewritten once, as expected.
- Calls 39–42 are append-only again (reads 36569 → 39041).

**APC-E2E-008 — harness validity, RSK-003** · Strict enforcement · Live, durable · **Pass**
- The unchanged captured request (call 37, 3 kept thinking blocks) returns 200.
- The same request with one tool description changed returns 400: "Invalid `signature` in `thinking` block. The block is bound to a different conversation … The `tools` list differs from the one this block was created with."

**APC-E2E-006 — AC-013(b) variant** · Stop with a pending approval · Probe · **Not Tested (blocked by pre-existing DEF-A)**
- `stop-pending-probe/`
- Its provider-acceptance concern is a stripped, unfinished tool round with thinking on. That exact shape is proven accepted by APC-E2E-004 (call 38).

**AC-005, AC-008, AC-009, AC-014** · Unit / static · Durable (existing) · **Pass**
- Core unit: 1859 passed, 1 failed (known base-identical Gemini issue).
- Server unit: 5101 passed.

## Additional Repository Coverage Execution

All commands run from the worktree root unless noted.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | worktree root | Core production typecheck | Pass | `api-e2e-evidence/core-tsc-build.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree root | Server typecheck on SDK 0.132.1 | Pass | `api-e2e-evidence/server-typecheck.log` |
| 3 | `pnpm -C autobyteus-ts exec vitest run tests/unit --no-watch` | worktree root | Core unit, incl. all new unit tests | 1859 Pass / 1 Fail (known base-identical Gemini retry product issue, already reported by implementation) | `api-e2e-evidence/core-unit.log` |
| 4 | `pnpm -C autobyteus-server-ts test:unit` | worktree root | Server unit baseline, incl. pricing | 666 files / 5101 tests Pass, 4 files / 7 tests skipped | `api-e2e-evidence/server-unit.log` |
| 5 | `env -i PATH HOME=<temp> TMPDIR LANG RUN_ANTHROPIC_CACHE_E2E=1 ANTHROPIC_API_KEY=<from user's server .env, not logged> ANTHROPIC_CACHE_E2E_EVIDENCE_DIR=<ticket>/api-e2e-evidence/live-run-6 ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` | `autobyteus-server-ts` | APC-E2E-001..005, 007, 008 | 7/7 Pass (run 6) | `api-e2e-evidence/live-run-6.log`, `live-run-6/` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | 96% | +36 | Every critical AC proven live under strict mode: AC-001/002/003/004/011/012/013(a)/(b), plus AC-006 meter pricing | AC-007 Console comparison is user verification; AC-005 is unit-only |
| Changed-boundary execution directness | 60% | 97% | +37 | Real production request bodies captured at the wire; real Anthropic acceptance and usage | — |
| Cross-boundary integration realism and mock gap | 50% | 95% | +45 | Real studio server, HTTP GraphQL, agent WebSocket, native runtime, file-backed memory, real restore and real Settings mutation | Whole-process restart not separately exercised (same restore path) |
| Environment, configuration, identity, and fixture fidelity | 70% | 95% | +25 | Test-owned DB vault key; clean env; SDK 0.132.1 header on every call; realistic thinking-producing workload | Strict mode is a harness-only beta (proven enforcing by the control) |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | 92% | +32 | Interruption, mid-round Settings change with a thinking-bearing pending tool_use, restore with thinking, strict negative control | Restore with a pending tool_use blocked by pre-existing DEF-A (its API shape is covered by 004); restored-run meter gap is pre-existing DEF-B |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | No UI or shell change; the meter UI already renders cache rows | — |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | Gated live E2E with per-call evidence, a strict control, and exact meter reconciliation; repeatable | Live, paid, gated; not part of the default suite |

- Overall post-repository confidence: 64%
- Overall final confidence: **95%** (simple average of 6 applicable categories: 96 + 97 + 95 + 95 + 92 + 95 = 570 / 6)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual risks:
  - pre-existing DEF-A and DEF-B (outside this change, but DEF-B affects AC-007 for restored runs);
  - P-004;
  - one cache rewrite per restore (measured: about 24k tokens written for a 31k-token history).

## Broader Validation Decision And Execution

- Decision: `Required`. Mode: Live API through the real server boundary, as planned.
- Gap addressed:
  - provider acceptance under strict prefix binding;
  - the real cache hit rate;
  - the Settings → `reloadMediaToolSchemas` → running agent path;
  - restore with a real snapshot;
  - meter reconciliation.
- Startup: Vitest global setup creates the test DB. The test then:
  1. installs the strict transport wrapper on `globalThis.fetch`;
  2. saves the key into the test DB vault (`initializeLiveRuntimeSecretVaultFromEnvironment`);
  3. starts `startStudioE2eRuntimeServer()` on a free port;
  4. creates the definition (`read_file`, `generate_image`) and the run (`claude-opus-5-5`, `autoExecuteTools: false`, `thinking_display: "summarized"`) over HTTP GraphQL;
  5. opens `/ws/agent/<runId>` and waits for `CONNECTED`.
- Environment choices: `env -i` with a temp HOME, so no live-app variables are inherited (`AUTOBYTEUS_MEMORY_DIR`, `DATABASE_URL`, compaction knobs, and so on). Temp app-data and workspace dirs.
- Fixtures: 30 data-only chunk files. The test approves each tool call as a user would.

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| T1, T2 tool-cycle turns | Append-only; new turn writes new input only; thinking kept | As expected (see 001) | `live-run-6/calls-summary.json` 0–25 | Pass |
| T3 interrupt at approval → T4 | No 400; system unchanged; note after history | As expected | calls 26–30 | Pass |
| Meter query | = raw usage | Exact | `case-results.json` APC-E2E-007 | Pass |
| Stop → restore → T5 | One strip; accepted; append-only after | As expected | calls 31–35 | Pass |
| T6 Settings change while a thinking `tool_use` waits | Tools changed; all thinking stripped once; accepted | As expected | calls 36–42 | Pass |
| Strict control | 200 / 400 | 200 / 400 (prefix-binding error) | calls 43–44 | Pass |


## Desktop Application Validation (Round 2, API-REV-002)

The user asked for real Electron testing, so this round used the real desktop app.

**Setup**
- An isolated desktop instance (`iso-64203-6f86`) was built from the worktree (`pnpm --silent isolated-app start --build`; packaged `build:electron:mac` of HEAD `a89fe62cc`). It had its own ports and data root, and the user's app was untouched.
- **Key:** only `ANTHROPIC_API_KEY` from the user's server `.env` was copied into a one-line temp file (mode 600). It was imported with the unchanged `pnpm secrets:import` into the instance DB (dry run: `provider.anthropic.api-key MISSING CREATE`, then `IMPORT`), and the instance was restarted. The temp file was deleted. Settings → API Keys showed **Anthropic: Configured**.
- **How the app was driven:** the browser-automation skill (CDP on the instance control port, attach-only), clicking the same controls a user clicks. The Daily Assistant has `read_file`, `generate_image` and `edit_image` among 20 tools, a realistic large prefix (about 27.8k tokens).
  - Composer: Temp workspace, **Ask first** (approvals on), `claude-opus-5-5 · AutoByteus`, thinking display **Summarized**.
  - Every tool call was approved with the UI's **Approve** button.
- **Per-call usage:** a read-only renderer observer copies the `TOKEN_USAGE_UPDATED` frames the app already receives; it doesn't change them. The meter's run record and the persisted working-context snapshot were read from the instance's own data.
- **Strict mode** cannot be injected into the packaged app. Thinking removal is proven from the persisted snapshot, and acceptance from the absence of any error. The server-boundary round proved acceptance under strict mode.

| Case ID | Journey (real UI) | Expected | Actual (evidence under `api-e2e-evidence/electron/`) | Result |
| --- | --- | --- | --- | --- |
| DSK-001 (AC-001/003/004, AC-006 UI) | Turns 1 and 2, 12-file audits each, approvals in the UI | No error; the new turn writes only new input; meter cache rows | T1: 13 calls; Token Meter **cache hit 90.2%**. T2 first call: read 27,873 (= T1's last prompt 27,875 − 2 uncached), wrote 420. Later calls read the full previous prompt and wrote about 857, all 1h, 0 × 5m. Meter **95.0%** after T2 (`shots/06`, `07`, `usage-t2.json`) | Pass |
| DSK-002 (AC-011) | T3: **Stop generation** while the chunk-25 approval is pending; T4 new message | Idle; no 400; system unchanged | Idle; chunk-25 never executed. T4 first call read 40,036 = the full T3 prompt (39,610 + 426), so the top-level system was unchanged. The note is persisted as its own `system` message (snapshot msg 59) | Pass |
| DSK-003 (AC-013a, P-005) | T6: agent waits on **Thinking → read_file chunk-28**; Settings → Server Settings → Default media models → Image generation **Gemini / imagen-4** → save → "Default media models saved."; back → **Approve** | Accepted; thinking stripped once | Continuation accepted: read 0, wrote 48,851 (tools changed, a full rewrite once, as expected). Calls 3–8 are append-only. Snapshot: msg 83 (the pending tool_use that came with thinking) and every earlier turn have 0 thinking blocks; thinking exists only after the change (85–95). 0 errors in the UI or server log (`shots/13–17`, `usage-through-t6.json`, `snapshot-before-restart.json`) | Pass |
| DSK-004 (AC-013b, whole-process restart) | `pnpm isolated-app restart` (new pid), reopen the run from the workspace tree, T7 | Accepted; one strip; append-only after | First request read 48,851, wrote 6,108, accepted. Calls 2–5 append-only. Snapshot: thinking 85–95 removed, new thinking kept (99, 101, 105). The meter recorded all 5 calls (47 → 52 reports) | Pass |
| DSK-005 (REQ-006, DEF-B check) | Left panel **Terminate run** (idle), then continue in the same app session | Meter records the new calls | 2 calls, no error. Their usage frames had empty usage fields, and the run record stayed at 52 reports / $1.536216: **the calls are missing from the meter** | DEF-B reproduced in the product (pre-existing) |

**Meter totals in the app**
- At 52 reports: input 120 uncached, 1,871,598 cache read, 113,472 1h write; output 12,682.
- **Hit 94.3%**, estimate **$1.536**. The same calls uncached would cost about $8.19.
- Model `claude-opus-5-5`, runtime `autobyteus`, "Complete estimate".

**Cleanup:** recordings saved (`recording-dsk.mp4`, 17.7 min; `recording-dsk-after-restart.mp4`, 3.6 min). `isolated-app stop` (not forced) removed the data root and the vault with the key, and released both ports. There's no temp key file and no key material in the evidence. Other people's instances were not touched.

## Platform / Runtime Targets

- macOS (Darwin 25.5), Node 22.23.1, Vitest 4.0.18
- `@anthropic-ai/sdk` 0.132.1
- Model `claude-opus-5-5` (first-party Anthropic API)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`.
- Representative data: a working-context snapshot written by the current runtime, holding Anthropic native turns with thinking (the `provider_native_assistant_turn` key). It was read back through `restoreAgentRun`.
- Result: restored and continued. The first request strips once and is accepted.
- Version-specific branch or fallback observed: `No`.
- Residual risk: a whole OS-process restart was not separately run. Stop → restore builds a new runtime and `MemoryManager` from disk, the same code path.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` | Added (uncommitted) | AC-001/002/003/004/006/011/012/013(a)/(b), P-005, RSK-003; gated by `RUN_ANTHROPIC_CACHE_E2E=1` + `ANTHROPIC_API_KEY` | 7/7 Pass (run 6). Skips cleanly without the gate |

- Attached for proportional test-code review: `Yes`
- Removed paths: none

## Other Execution Artifacts

| Artifact Path (under `api-e2e-evidence/`) | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `live-run-6/` + `live-run-6.log` | Authoritative live evidence: per-call bodies, usage, frames, case results | Retained | No secrets (scanned) |
| `live-run-1/`, `live-run-4/` + logs | Earlier rounds (DEF-A/DEF-B discovery) | Retained | — |
| `live-run-2-aborted/`, `live-run-3-aborted/`, `live-run-5-interrupted-by-poweroff.log` | Refusal discovery; power-off | Retained | — |
| `stop-pending-probe/`, `restore-usage-probe/` | Base-vs-HEAD reproduction of DEF-A and DEF-B | Retained | Probe test files lived in `tests/e2e/runtime/zz-*` only during the run and were removed |
| `refusal-probe/` | Isolates the refused prompt; selects the audit prompt | Retained | Direct HTTPS, key not logged |
| `core-*.log`, `server-*.log` | Repository checks | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Temporary detached base worktree `/tmp/apc-base-api` (symlinked deps and dist) | Base comparison for DEF-A and DEF-B | Both base-identical | Removed (`git worktree remove`); targets intact |
| `zz-*-probe.e2e.test.ts` copied into `tests/e2e/runtime/` | Run the probes | See probes | Removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Anthropic strict prefix-binding check | Test-only `globalThis.fetch` wrapper adds the beta header + `block_binding: "error"` | Production must not ship it (design); it makes violations visible as 400s | None: APC-E2E-008 proves enforcement |
| Desktop shell / renderer | Not used | No UI or shell change | None for this change |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | APC-E2E-001, 002, 003, 004, 005, 007, 008 | All critical live ACs proven under strict mode; P-005 proven in its strict form (thinking-bearing pending `tool_use`) |
| Not Tested | APC-E2E-006 | Blocked by pre-existing DEF-A |
| Out Of Scope (pre-existing, base-identical, reported) | DEF-A, DEF-B | See below |

### Pre-existing defects found (TESTING Rule 9; not caused by this change; recommended separate tickets)

**DEF-A: Stop (`terminateAgentRun`) of a native run hangs while a tool approval is pending.**
- The GraphQL Stop does not return; the client times out at 300 s.
- Measured: HEAD 300864 ms, base `927796780` 300797 ms (`stop-pending-probe/{head,base}-result.json`).
- No `AgentRuntime.stop` log appears, so it blocks in the server Stop path (`AgentRunService.terminateAgentRun` → `standaloneRuns.stopRoot` → `root.stop()` / `terminateHost`) before the runtime stop.
- In run 1 it also blocked the meter write of the call completed milliseconds before the Stop, and server teardown.
- Owner: native run lifecycle / standalone run root.

**DEF-B: the Token Meter drops usage of a native run after Stop → restore in the same app session.**
- **Confirmed in the real desktop app (DSK-005):** Terminate run, then continue, then the calls are missing from the meter.
- **After a whole-app restart (DSK-004),** the post-restart calls were recorded in this run.
- So the trigger is the in-session restore path, or the key's collision with the run's recent-digest window (64 entries). The owner should confirm the exact dedupe rule.
- The rest of this description comes from the server-boundary round.
- A restored native runtime numbers turns from `turn_0001` again. The usage idempotency keys (`<runId>:turn_NNNN:llm:N`) collide with the pre-restore keys, and `TokenUsageRunStore.recordObservation` dedupes them.
- Run 4: 12 post-restore calls, exactly 12 duplicate keys, 12 missing reports.
- Probe on HEAD and base: the post-restore `TOKEN_USAGE_UPDATED` is emitted, but the run summary stays at 1 report (`restore-usage-probe/`).
- Impact: for any restored run, the meter undercounts against the Anthropic Console, which affects the AC-007 user check.
- Owner: native runtime turn-id allocation on restore, or token-usage idempotency (server `token-usage`).

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Studio server, agent runs, WebSockets | Test-owned | `afterAll`: terminate run (60 s guard), close server | Done (run 6 exit 0) |
| Temp app-data, workspace and HOME dirs | Test-owned | Removed (also orphans from runs 1, 3 and 5) | 0 remaining |
| Token-usage rows of test runs | Test DB | Deleted in `afterAll`; DB reset by global setup | Done |
| Temporary base worktree, probe files | Mine | Removed | Done |
| `globalThis.fetch` wrapper | Test process | Restored in `afterAll` | Done |
| User app and data | Not touched | The key was read in-process only (user-permitted) | — |

## Preliminary Classification

Not applicable (Pass). DEF-A and DEF-B are pre-existing product defects outside this change. They are reported as separate items, recommended to the Solution Designer / Delivery for ticketing.

## Latest Authoritative Result

- Result: **Pass** (round 1 server-boundary + round 2 real desktop app)
- Final validation confidence: **96%**. The real desktop journey raised cross-boundary realism and the desktop-shell category; the scorecard values are kept from round 1 except these
- Default 95% target met: `Yes`
- Any final applicable category below 90%: `No`
- Broader validation decision: `Required` → executed (Live API through the real server), passed
- Critical acceptance criteria lacking direct proof: none. AC-007 Console comparison remains user verification at delivery, and DEF-B affects it for restored runs.
- Next recipient: per `get_handoff_rules` (proportional test-code review of the added live E2E file)
- Notes:
  - Measured: run-level hit **94.9%** over 31 calls / 4 turns.
  - Whole live run: $1.28 actual versus $4.95 uncached for the same calls.
