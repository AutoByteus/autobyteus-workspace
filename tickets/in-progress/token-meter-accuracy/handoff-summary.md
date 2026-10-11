# Handoff Summary — token-meter-accuracy

## User Verification

- Verified by the user on 2026-10-11: "i have verified. lets finalize and release a new beta".
  - AC-010 (desktop app: Claude SDK fixes A and B, runtime spot checks): verified.
- Release decision: publish the next beta.
- Follow-up: the code reviewer's refactoring proposal (`code-review-refactoring-proposal.md`, R-1–R-4) is tracked separately as Project Task `project_task_7257984e-19b4-452a-a65b-99316d879bc1` (SR-007). It is not part of this package.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy`
- Branch: `codex/token-meter-accuracy` (local only, not pushed). HEAD is `2f35c00dc` plus the delivery artifacts commit.
- Base and finalization target: `origin/personal`. The branch contains the latest `origin/personal` (`46e94fdea`, fetched 2026-10-09).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` folders of the application SDK packages.
- To try it in an isolated desktop instance: `pnpm --silent isolated-app start --build` from the worktree, and `pnpm --silent isolated-app stop` afterwards.

### Commits on the branch (first parent)

- `9e8e5bf26`: feature (per-call runtime usage and context readings).
- `a5d8d2d31`: refactor (Claude session query options).
- `aa9d949e1`: implementation handoff.
- `f78921e5f`: CR-F-001 fix (ledger consolidation drops released Claude SDK readings).
- `989f31780`: CRR-002 record.
- `7f27bbbf5`, `97e46624c`, `ccb52b171`: labelled baseline test fixes.
- `0a5290aa8`, `9b4ad5d4d`, `81703b021`, `e7f9da408`: durable E2E coverage.
- `2acf9b394`: API-REV-001.
- `313684d16`: delivery checkpoint (SR-006, CRR-003 artifacts).
- `fdf0dd3f0`: merge of `origin/personal` @ `d7029b90a` (gemini-native-cache-hit, anthropic-prompt-caching, beta.9).
- `ce6adb3a7`: merge of `origin/personal` @ `46e94fdea` (ticket-only delivery record).
- `2f35c00dc`: docs sync and AGY fake-CLI per-step replay.

## What Changed

- **Claude Agent SDK.**
  - Every main-loop model call is reported live: `message_start`/`message_delta` usage plus the SDK's `getContextUsage()` reading (tokens in context, window, auto-compaction threshold).
  - The turn-end result only reconciles. It adds the SDK's own compaction calls as `modelUsage` delta minus the live sums.
  - Migration `20261009120000_token_meter_context_readings` clears pre-fix readings once. The ledger-era consolidation drops them too.
- **AGY:** per-step `agy_step` usage, `base_excludes_cache`, latest prompt = input + cache read. The cumulative result is no longer mapped.
- **Codex:** reading from `last.totalTokens`. The post-compaction update is a reading-only save.
- **Grok:** latest prompt.
- **Native:** the compaction threshold.
- **Contracts and UI.**
  - Strict DTOs carry `revision`, `context_compaction_threshold_tokens` and `reports_model_call`.
  - The meter shows the threshold marker and the over-window state.
  - `usageReportCount` counts model calls.
- **Docs:** `token_usage.md`, `agent_execution.md`, the web Token Meter docs and `TESTING.md` (see `docs-sync-report.md`).

## Integration With Upstream (SR-006 / AF-16)

- **Conflict.** `agy-stream-event-converter.ts` was resolved for this branch (D-5): per-step usage, no result usage.
- **Upstream tests adapted to per-step usage.** The design records that stored AGY snapshot state is kept but not read (design-spec § Removal).
  - `agy-stream-event-converter.test.ts`: the two gemini result-semantic tests now drive a DONE `agent_response` step.
  - `token-usage-run-fold.test.ts`: the two AGY fold tests.
    - Per-step totals: 722,113 gross after two calls.
    - Pre-fix continuation: a cumulative-result row stays as stored, and the step adds its own call without a regression flag.
  - `agy-token-usage-upgrade-continuation.e2e.test.ts`: pre-fix history is injected as the old converter emitted it, and the continuation is a per-step call.
    - Expected values: shape A miss 2,100 (was 8,210 via snapshot catch-up); shape B miss 175,287 (was 256,802).
    - Gross and cache reads are unchanged from upstream.
  - `agy-failure-cli.mjs` `usage_report` now replays each recorded turn's DONE `agent_response` step usage before the cumulative result, as real AGY does.
    - The recording's step usage sums exactly to each result (verified for all 11 turns).
    - The gated `agy-token-usage-transport.e2e.test.ts` keeps its numbers and now also asserts `usage_scope: per_call`.
- **Kept from upstream:** the Gemini 3.1 Pro catalog prices, all pricing docs, and the anthropic-prompt-caching `llm-phase.ts` changes (auto-merged with this branch's threshold field).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass |
| Code review | CRR-001 Fail (CR-F-001), then CRR-002 Pass after `f78921e5f`; test-code review CRR-003 Pass |
| API/E2E | API-REV-001 Pass (95%): live Claude, Codex and AGY (LIVE-001–005), isolated desktop DESK-001–003, including a real 1.4.99-beta.8 profile upgrade |
| Delivery on the integrated state | See below |

Delivery checks on the integrated state (`fdf0dd3f0` + `2f35c00dc`):

- `autobyteus-ts`: typecheck and build clean; `tests/unit/agent/loop` and the request assembler: 8 files, 34/34.
- Server typecheck: clean.
- Server `tests/unit/token-usage`, `tests/unit/agent-execution/backends`, `tests/unit/app-data-migrations`, `tests/unit/startup`, the team token transport unit, `tests/integration/token-usage` and `tests/e2e/token-usage`:
  - 1558 pass, with 2 failures in the upstream AGY upgrade-continuation E2E before its adaptation;
  - after the adaptation, the scoped rerun passes 493/493 (6 skipped, 58 files).
- Gated AGY fake-CLI transport E2E (`RUN_AGY_FAILURE_E2E=1`): 1/1.
- Web `TokenUsageMeterPanel.spec.ts` + `tokenUsageMeterStore.spec.ts`: 30/30.

## Follow-Ups (outside this change)

- Stale base E2Es: `team-run-v1-production-upgrade`, `codex-interrupted-compaction` (`prepareNewAgentRun is not a function`).
- Pricing catalog gaps: claude-haiku-5-5, claude-sonnet-5-5, gemini-3.8-flash-low (owned by the caching tasks).
- Duplicate user-message rendering.
- `generated/graphql.ts` base drift.
- Dormant `claude-text-segment-projector.ts` partial-stream path.
- Non-blocking review notes: the C-02 accumulator import; `tokenUsageMeterStore.ts` at 499 lines; record cleanup in the Codex live suite.
