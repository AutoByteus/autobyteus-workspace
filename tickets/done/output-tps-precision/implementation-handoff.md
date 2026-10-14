# Implementation Handoff — output-tps-precision

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Large/High). It passed in round 2 (ARCH-REV-002) and in round 3 (ARCH-REV-003, D3.2 Codex fix). The route after implementation comes from `get_handoff_rules` (Large/High → code review).
- Requirements doc (R3, user-approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/solution-revision-record.md`
- Design spec (D3.2 / SR-006): `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-spec.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/solution-handoff.md`
- Supplemental task artifacts: the Task screenshots and the user's card screenshot, listed in the requirements doc. They are evidence only.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/architecture-review-revision-record.md`
- Triggering rework report: code review failure-origin CRR-002 / CR-F01 (`code-review-report.md`) on API/E2E API-REV-001, API-L04 (`api-e2e-execution-coverage-report.md`). This was resolved by SR-006 and re-reviewed as ARCH-REV-003 with binding constraint IC-2. Live wire evidence: `evidence/api-e2e/live/codex/codex-wire.jsonl` and `evidence/api-e2e/live/codex-repeat/codex-wire.jsonl` (same folder).

## Current Implementation Summary

**What changed for the user.** Each runtime integration now times every model call on the server clock, chooses the call's method per DEC-002, and reports `output_throughput { method, output_tokens, duration_ms }` with the call's usage.

**Server.**
- `createTokenUsageUpdatedPayload` normalizes the field through `acceptModelCallThroughput`. This is the only shape and minimum-sample check (≥ 20 tokens, ≥ 250 ms, integer values), and it runs before accounting.
- Accounting passes the field through untouched and never reads it. Nothing is stored.
- The strict presentation DTO requires the nullable field, and the Team DTO inherits it. The collaboration adapter, the presentation projector and the Team projector map it explicitly.

**Codex (IR-002, D3.2).**
- A Codex call ends at the receipt of `rawResponse/completed`, and `params.usage.outputTokens` is the call's output.
- The reading is held pending per turn. It attaches to the next model-call `thread/tokenUsage/updated` only when `last.outputTokens` matches; otherwise the value is null.
- Usage arrival is never a call end or a boundary.
- Only reasoning/agentMessage output freezes the request boundary (IC-2).
- Approval replies count as boundaries.

**Web.**
- Each live intake records the newest TPS per exact run right after the seen-key check, independent of the summary.
- The pairing estimator, its states, locale keys and tests are removed.
- The card follows REQ-006.

**Revision references.**
- Implementation cycle: Rework
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/implementation-revision-record.md`
- Current implementation revision ID: IR-002 (baseline IR-001)
- Related solution revision IDs: SR-006 (D3.2); earlier SR-005 (requirements R3 / SR-004)
- Related architecture-review revision IDs: ARCH-REV-003 (earlier ARCH-REV-002)
- Related code-review revision IDs: CRR-002 (earlier CRR-001 Pass)
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-F01, API-L04 and IC-2. IC-1 and recommendations R-2, R-3 and R-4 from IR-001 remain applied.

**Workspace.** All work is uncommitted in worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision`, branch `codex/output-tps-precision`, base `origin/personal@1ea74caa2d`. Review the diff with `git status` / `git diff`.

The untracked `dist/` folders came from `test:integration:prepare` and are not part of the change:
- `applications/brief-studio/dist/`
- `autobyteus-application-backend-sdk/dist/`
- `autobyteus-application-sdk-contracts/dist/`

The tracked contract `dist/` changes are part of the change, as TESTING.md requires.

## Routing Classification (Mandatory)

- Task size: Large
- Architecture risk: High
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: Confirmed
- Evidence and rationale:
  - About 30 production files across four packages plus two contract packages.
  - The metric's authority moved to the runtimes and the run event.
  - A new nullable field on the strict stream DTOs.
  - None of the escalation triggers fired:
    - nothing persisted;
    - no accounting step drops the field (tested);
    - no new message type;
    - no provider-request change;
    - Claude ordering is unchanged from the probe.
- Selected route: Code Review
- Lightweight implementation self-review for the direct route: Not Applicable (Large/High route)
- New design impact or escalation trigger: None. Two evidence-based refinements of the DS-003 boundary rows are recorded under Important Assumptions. They stay within the design's stated principle.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Minimal card: "TPS", value + unit, model line, end-to-end qualifier only for `end_to_end`; "—" only without a reading; collapsed "How TPS is measured" help with method, tokens and seconds | `TokenUsageThroughputCard.vue` (prop `tps`); `TokenUsageMeterPanel.vue`; `localization/messages/{en,zh-CN}/shell.ts` (old 19 keys replaced by 7) | Implemented. The help toggle stays in the "—" state with only the general line (REQ-006 "keep one collapsed help toggle"). Covers AC-007 and AC-008 |
| BEH-002 | Each completed model call measured by its own runtime timing; one call is enough; DEC-002 methods; minimum sample DEC-003; report-interval method removed | Native `autobyteus-ts/src/agent/loop/llm-call-throughput.ts` + `llm-phase.ts`; Claude `claude-call-usage-tracker.ts`; Codex `codex-model-call-timing.ts` + `codex-thread-notification-handler.ts` + `codex-thread-token-usage.ts`; AGY `agy-stream-event-converter.ts`; ACP `acp-agent-session.ts` + `backends/shared/model-call-request-boundary.ts`; run side `domain/model-call-throughput.ts` + `agent-run-token-usage.ts` | Implemented. Claude stamps `message_delta` receipt before `await readContextUsage()`. Codex numerator is `last.outputTokens`. AGY rounds `duration_seconds × 1000` (IC-1). Covers AC-001 to AC-004 |
| BEH-003 | Exact selected run; Team double dispatch and duplicates never change the reading | `tokenUsageMeterStore.applyTokenUsageUpdated` / `applyTeamTokenUsage` record right after the seen-key check; `getRunTps(runId)`; `useTokenUsageWorkspaceScope.tps` uses `context.state.runId` | Implemented and tested on the standalone, Team (two effects), Org (four target kinds) and collaboration routes. Covers AC-005 |
| BEH-004 | Newest received TPS shown until a newer one; tiny calls do not replace it; nothing on the server or persisted; "—" after reload, for history, and for a run with no value | `stores/tokenUsageThroughput.ts` (session map `record` / `getRunTps`); no server state | Implemented. A persisted-record test shows no TPS data. The browser probe shows "—" after reload. Covers AC-006 and AC-009 |

- Changes stayed within the requirements doc's Scope Guardrail: Yes

## Key Files Or Areas

**Added (source)**

| File | Purpose |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/model-call-throughput.ts` | Type, `MIN_TPS_OUTPUT_TOKENS` / `MIN_TPS_DURATION_MS`, `acceptModelCallThroughput` |
| `autobyteus-server-ts/src/agent-execution/backends/shared/model-call-request-boundary.ts` | `ModelCallRequestBoundary` (mark / freeze / complete / reset) |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-model-call-timing.ts` | Codex boundary and output rules plus injected clock. A new file, because `codex-thread.ts` was already 428 lines |
| `autobyteus-ts/src/agent/loop/llm-call-throughput.ts` | Native `LlmCallTiming`, plus a type and threshold copy (`MIN_GENERATION_WINDOW_MS`) |

**Modified (source)**

- autobyteus-ts:
  - `llm-phase.ts`
  - `events/notifiers.ts`
  - `streaming/events/stream-event-payload-token-usage.ts`: the native stream payload lists fields explicitly, so it must carry the field. This file was not in the design mapping.
- Server domain: `agent-run-token-usage.ts`
- Server adapters:
  - `codex/events/codex-thread-event-name.ts` (`RAW_RESPONSE_COMPLETED`, IR-002)
  - `claude-call-usage-tracker.ts`
  - `codex-thread.ts`
  - `codex-thread-notification-handler.ts`
  - `codex-thread-token-usage.ts`
  - `codex-agent-run-backend.ts` (explicit field copy)
  - `agy-stream-event-converter.ts`
  - `acp-agent-session.ts`
- Server routes:
  - `agent-presentation-event.ts`
  - `team-agent-event.ts`
  - `collaboration-agent-presentation-adapter.ts`
  - `agent-presentation-message-projector.ts`
  - `team-agent-event-websocket-projector.ts`
- Server migration boundary: `legacy-token-usage-row.ts` (`output_throughput: null` to satisfy the payload type; no historical-schema logic).
- Contracts: `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts`, plus the rebuilt `dist/` of the presentation and Team contracts. The Team schema inherits the field, so `team-agent-message-dtos.ts` source needed no edit.
- Web:
  - `types/tokenUsageMeter.ts`
  - `stores/tokenUsageThroughput.ts` (rewritten)
  - `stores/tokenUsageMeterStore.ts`
  - `composables/useTokenUsageWorkspaceScope.ts`
  - `TokenUsageThroughputCard.vue`
  - `TokenUsageMeterPanel.vue`
  - en and zh-CN `shell.ts`
- Web adapters: `teamStreamDtoAdapters.ts` and `agentStreamMessageProjector.ts` already spread the payload, so they needed no change. Tests prove the field passes through.
- Docs:
  - `autobyteus-web/docs/token_meter.md` (rewritten, with the per-runtime method table)
  - `autobyteus-web/docs/agent_execution_architecture.md` (TPS lines)
  - `autobyteus-server-ts/docs/modules/token_usage.md` (TPS paragraph)

**Tests**

- New server tests:
  - `domain/model-call-throughput.test.ts`: acceptance table; builder; survival through enrichment, CHANGED and SUPPRESSED folds and the persistence-failure path; no TPS in the persisted record; R-4 threshold equality.
  - `shared/model-call-request-boundary.test.ts`
  - `claude/session/claude-call-usage-tracker-throughput.test.ts`
  - `codex/thread/codex-model-call-timing.test.ts` (IR-002), which covers:
    - both live 0.162.1 wire captures: L03 210 / 2,987 ms; L04 112 / 1,881 ms and 173 / 2,381 ms; sample 2: 115 / 1,517 ms and 158 / 2,259 ms;
    - an approval reply as a boundary (wait excluded);
    - a token mismatch → null;
    - a missing `rawResponse/completed` → null, on the recorded P5 trace;
    - a P6 compaction frame, which leaves the pending value intact;
    - a repeat after pairing → null;
    - turn end clearing the pending value.
  - `antigravity/agy-call-throughput.test.ts`: IC-1 fractional case with 250 tokens and 2.673724 s → 2674 ms.
  - `acp/acp-call-throughput.test.ts`: recorded Grok `prompt` and `mcp` turns.
- Extended server tests:
  - `team-agent-token-usage-event-transport.test.ts` (Team and collaboration strict-DTO pass-through)
  - `token-usage-model-call-fold.test.ts` (new required input)
  - `acp-fake-agent-harness.ts` (`now` pass-through)
- autobyteus-ts: `tests/unit/agent/loop/llm-call-throughput.test.ts`, covering the timing table, an LlmPhase single-call integration and the stream payload pass-through.
- Web: `tokenUsageThroughput.spec.ts`, `tokenUsageMeterStore.spec.ts` (TPS blocks), `useTokenUsageWorkspaceScope.spec.ts`, `TokenUsageThroughputCard.spec.ts`, `TokenUsageMeterPanel.spec.ts` (AC-006 sequence).
- Contracts: presentation (new TPS case and fixture) and Team (fixture).
- R-2:
  - `autobyteus-web/tests/e2e/token-meter-tps-probe.mjs` and `tests/e2e/fixtures/token-meter-tps.page.vue` rewritten for `getRunTps` and the new card.
  - Scripted `autobyteus-server-ts/tests/fixtures/agy-tps-cli.mjs` now emits: an end-to-end call (thinking 5, `duration_seconds` 2.673724, 999 tokens), a streamed generation call (thinking 0, about 900 ms window, 200 tokens) and a tiny 12-token call.
  - `tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts` now expects 1,211 persisted output tokens.

## Important Assumptions

1. **Codex output markers (IR-002, IC-2).** The IR-001 refinement, where any non-input `item/started` (tools included) froze the boundary, is **retired**.
   - Only reasoning/agentMessage `item/started` and their deltas freeze the boundary.
   - A tool's `item/started` arrives after its model call ended (`rawResponse/completed`), so freezing on it would freeze the *next* call before the tool runs. Instead, the tool's `item/completed` is a boundary.
   - `rawResponseItem/completed` is a different event and is neither a call end nor a boundary.
   - The server's reply to an app-server request is a boundary. It is marked in `CodexThread` after `applyAppServerRequest` resolves (auto-accept, errors, dynamic tool results) and after a pending approval is answered.
2. **ACP output markers.** Only `agent_message_chunk` and `agent_thought_chunk` freeze the boundary. `tool_call` does not.
   - Evidence: recorded Grok traffic (`prompt.jsonl`, `permission.jsonl`, `mcp.jsonl`) announces `tool_call` (Pending) *after* that call's `response_completed`.
   - Freezing on it, as the DS-003 row literally lists, would count tool execution and permission waits in the next call.
   - A terminal `tool_call_update` (completed or failed) moves the boundary.
   - The shared ACP layer stays runtime-neutral, as the existing neutrality test enforces.
3. **Native hidden reasoning.** When a provider reports `reasoning_output_tokens` as null, a content-first call uses generation speed, as DEC-002 states ("0 or null"). A provider that hides reasoning without a count would therefore read high. This is a documented limitation.
4. **Clocks.** `Date.now` on one process gives integer milliseconds. All adapters take an injectable clock: a constructor or option `now`, or `CodexThread` `modelCallTiming`.
5. **Collaboration adapter.** The adapter casts `output_throughput` without re-validating it, because the run's payload builder already accepted or nulled it. The strict DTO validates again at the projection boundary.

## Known Risks

- RSK-002: Codex ships end to end.
  - The call end is now `rawResponse/completed`.
  - A tool-ending call's reading reaches the UI only when its usage update is published, after the tool. The value still excludes tool and approval time.
  - A Codex CLI without raw events (`experimentalRawEvents`) would give no Codex readings; there is no fallback.
  - The API/E2E rerun of API-L04 is still required.
- RSK-005: whether AGY output includes thinking tokens.
- AGY `text_delta` cadence on long outputs. A burst window under 250 ms falls back to the provider duration.
- Grok's first call may include CLI setup time.
- Native providers that hide reasoning without a count.
- Recording happens before the summary check. So a standalone payload whose `run_summary_after_event` names a different run (the mapper then throws) still records TPS for `payload.run_id`. The TPS identity is the payload's own run, and the design explicitly makes TPS independent of the summary check. The Team intake rejects a mismatched `agent_run_id` before recording.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision: Refactor Needed Now (metric authority moved; estimator removed)
- Implementation matched the reviewed assessment: Yes
- If challenged, routed as `Design Impact`: N/A
- Evidence / notes:
  - Adapters own their measurement and method.
  - `acceptModelCallThroughput` is the only validity and minimum-sample check. Its only caller is the payload builder; AGY reads only `MIN_TPS_DURATION_MS`, for its own window choice.
  - Accounting never reads the field.
  - The web computes no method or threshold.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No. The pairing estimator, `observeMissingSummary`, the throughput state and identity types, 16 locale keys, estimator tests and docs are removed.
- Dead code in the touched files and modules removed: Yes.
  - The `advanced` local in the Team intake was used only by the old estimator.
  - The `AgentStatus` import in the scope composable is gone.
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: Yes. There is one three-field shape from adapter to UI, with no timestamps or `tokens_per_second` carried.
- Canonical shared design guidance reapplied: Yes
- Changed source files stayed within size guardrails: Yes. The largest is `tokenUsageMeterStore.ts` at 459 effective lines (+22). The largest delta is the `tokenUsageThroughput.ts` rewrite (124 changed lines, now 25 lines).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: Not Affected
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision: Yes
- Direct-use evidence: `model-call-throughput.test.ts` encodes the folded record with `toPrismaTokenUsageRunRecordData` and finds no throughput or duration data.
- Migration implementation: N/A
- Deviation: None

## Environment Or Dependency Notes

- Setup run: `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-ts build`; server `prebuild`; contract builds (presentation, Team, collaboration); `test:integration:prepare`.
- The server resolves `autobyteus-ts` from its `dist`. Rebuild autobyteus-ts after pulling these changes.
- No credentials were used, and no provider calls were made.

## Local Implementation Checks Run

**IR-002 (Codex rework)**

| Check | Result |
| --- | --- |
| `pnpm -C autobyteus-server-ts typecheck` | Pass (0 errors) |
| `pnpm -C autobyteus-server-ts test:unit` (full) | 5,494 passed, 0 failed, 7 skipped |
| Codex, domain, token-usage and runtime-management unit folders | 595/595 |

Other packages were not re-run: only server Codex source and docs changed in IR-002. The IR-001 results below still stand for them.

**IR-001 (baseline)**

| Check | Result |
| --- | --- |
| `pnpm -C autobyteus-server-ts typecheck` | Pass (0 errors), re-run after the final edits |
| `pnpm -C autobyteus-server-ts test:unit` (full) | 5,484 passed, 6 failed, 7 skipped. All 6 failures came from two causes in this change and are fixed: the ACP neutrality guard rejected the word "Grok" in a shared-layer comment (reworded), and an existing fold test lacked the new `completeModelCall` input (added). Both files re-run: 7/7 pass |
| `pnpm -C autobyteus-server-ts test:integration` | 371 passed, 2 failed, 68 skipped. The 2 failures are the two content-cadence cases in `agent-status-websocket.integration.test.ts`, which TESTING.md lists as a known baseline exception |
| `pnpm -C autobyteus-ts exec vitest run tests/unit` | 2,025/2,025 pass |
| Web `NUXT_TEST=true vitest run` (full) | 4,394 passed, 5 skipped |
| `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass |
| `pnpm -C autobyteus-agent-presentation-contracts test` | 18/18 |
| `pnpm -C autobyteus-team-stream-contracts test` | 16/16 |
| `pnpm -C autobyteus-collaboration-stream-contracts test` | 27/27 |
| Web `tsc -p .nuxt/tsconfig.json` | Baseline-noisy (cannot resolve `.vue` modules without vue-tsc; unrelated errors). No new errors in the touched non-test web files. The one test-file type note (`TokenUsageMeterPanel.spec.ts` summary DTO `run_id: string \| null`) matches the pre-existing pattern of the case it replaced |

These are implementation-scoped checks, not API/E2E sign-off.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surface:** the Token tab's TPS card, inside `TokenUsageMeterPanel`.
- **References:** REQ-006 and REQ-007 copy and states, AC-006 to AC-008, DEC-005. The existing Token Meter card language is kept: the same card shell, typography and help `<details>` styling.
- **Surface used:** the TESTING.md browser probe, `pnpm -C autobyteus-web test:e2e:token-meter-tps` in fixture mode. It runs a probe-owned Nuxt dev server and headless Chrome, with the real panel, store and card.
- **States and interactions inspected:**
  - "—" with no reading;
  - a single generation call at 120.0 tokens/s, with the long model id wrapping;
  - a tiny call that keeps the value;
  - totals roll-up versus the exact model;
  - the keyboard-opened help (focus kept), showing the method with "2,400 tokens in 20.0 s";
  - offline status keeping the value;
  - an end-to-end reading at 90.0 tokens/s with "incl. time to first token" and its help;
  - zh-CN at 320 px width (no card overflow; scroll width equals client width);
  - switching runs ("—", then back to the value);
  - page reload ("—").
- **Visual or interaction issues found:** none needing a change. I inspected the screenshots directly as well as reading the assertions.
- **Evidence:** `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/evidence/implementation/browser-probe-1791963756/` contains `result.json` (pass, no browser errors, cleanup complete) and the screenshots `no-reading.png`, `generation-en.png`, `end-to-end-en.png`, `end-to-end-zh-narrow.png` and `no-reading-zh-narrow.png`.
- **Not run:** the probe's live mode (scripted AGY → real server → WS) and the isolated Electron desktop instance. Both belong to downstream validation.

## Downstream Coverage Hints / Suggested Scenarios

- Scripted live transport (no paid inference):
  ```
  ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-tps-cli.mjs RUN_TOKEN_TPS_E2E=1 TEST_TPS_OUTPUT_DIR=<fresh dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts --no-watch
  ```
  It expects:
  - call 1: end to end, 999 tokens, 2,674 ms;
  - call 2: generation, 200 tokens, at least 850 ms;
  - call 3: null;
  - the card keeps call 2's value;
  - persisted output of 1,211 tokens.
  Its probe needs `--browser-executable` or `PLAYWRIGHT_CHROME_EXECUTABLE_PATH` on macOS (default `/usr/bin/chromium`).
- Live single-call turns per runtime, where credentials allow (AC-001, AC-004, AC-010):
  - native DeepSeek Flash (or LM Studio);
  - Claude (expect generation; about 104 tok/s in the probe);
  - Codex (record a timeline for RSK-002);
  - AGY with thinking > 0 if available (RSK-005);
  - Grok.
- Team, Org and delegated-copy selection in an isolated desktop instance (AC-005, AC-006), plus reload and history showing "—".
- Confirm in a live AGY run that `text_delta` cadence gives a window of at least 250 ms on long outputs.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The AC-010 per-runtime matrix (live, scripted or not run, with reasons).
- The scripted live transport run.
- Live runs per runtime where credentials allow.
- Isolated desktop-instance journeys (Team, Org, delegated copy, reload).
- A live Codex timeline for RSK-002, and an AGY thinking sample for RSK-005.
