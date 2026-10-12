# Handoff Summary — token-meter-accuracy

## User Verification

- Verified by the user on 2026-10-11: "i have verified. lets finalize and release a new beta".
  - AC-010 (desktop app: Claude SDK fixes A and B, runtime spot checks): verified.
- Release decision: no release (user, 2026-10-12). This replaces the 2026-10-11 request for a beta.
- **Renewed verification received (DR-004), 2026-10-12:** "finalize no need to release a new version". The user accepts the DR-003 package (AC-011, AC-012) and changes the release decision to **no release**.
- Earlier request (DR-003): **renewed verification needed.** After that verification, the package gained D-12 and D-13 (SR-008–SR-014) and the 1.5.1 base. Waiting for the user on:
  - AC-011: during a native compaction, "Latest prompt" keeps its value; on the agent's next call it shows a smaller value.
  - AC-012: after a completed native or Claude Agent SDK compaction (for example a manual `/compact`), the value is greyed with "Compacted — updates on the next model call", and the note clears on the next model call. A Codex compaction shows no note.
- Follow-up: the code reviewer's refactoring proposal (`code-review-refactoring-proposal.md`, R-1–R-4) is tracked separately as Project Task `project_task_7257984e-19b4-452a-a65b-99316d879bc1` (SR-007). It is not part of this package.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy`
- Branch: `codex/token-meter-accuracy` (local only, not pushed). HEAD is `0ba052b0f` plus the DR-003 delivery artifacts commit.
- Base and finalization target: `origin/personal`. The branch contains the latest `origin/personal` (`beb6b3b49`, re-checked for DR-003).
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
- `f3245cdb0`, `ea4e8fa5c`: DR-001 artifacts; checkpoint with the user verification and SR-007.
- `168900db7`: merge of `origin/personal` @ `beb6b3b49` (1.5.1, compaction-prompt-cache-reuse); `15bdb2d62`: DR-002.
- `5b48c2b47` → `2cd590603`: D-11 reset, then reverted (D-12: native compaction keeps the reading).
- `d6a89cbdd`, `8dd8fdf3e`, `c0f1b9a80`: the D-13 "Compacted" note and its clear-rule corrections (SR-012, SR-014).
- `88f03cb27`, `be39baf40`: live native-compaction meter E2E; runtime token-usage E2E statistics-window fix.
- `21974ba2a`: API-REV-003.
- `23cf64003`: delivery checkpoint (SR-008–SR-014, ARCH-REV-004–009, CRR-009).
- `0ba052b0f`: DR-003 docs sync.

## What Changed

- **Claude Agent SDK.**
  - Every main-loop model call is reported live: `message_start`/`message_delta` usage plus the SDK's `getContextUsage()` reading (tokens in context, window, auto-compaction threshold).
  - The turn-end result only reconciles. It adds the SDK's own compaction calls as `modelUsage` delta minus the live sums.
  - Migration `20261009120000_token_meter_context_readings` clears pre-fix readings once. The ledger-era consolidation drops them too.
- **AGY:** per-step `agy_step` usage, `base_excludes_cache`, latest prompt = input + cache read. The cumulative result is no longer mapped.
- **Codex:** reading from `last.totalTokens`. The post-compaction update is a reading-only save.
- **Grok:** latest prompt.
- **Native:** the compaction threshold.
  - The compaction summary call, on the agent's own model since 1.5.1 (`autobyteus_compaction`), counts as a model call with tokens and cost but carries no reading. "Latest prompt" keeps its value until the agent's next call (D-12).
  - The upstream `token-usage-compaction-ingestion.test.ts` is adapted to "reading kept".
- **Contracts and UI.**
  - Strict DTOs carry `revision`, `context_compaction_threshold_tokens` and `reports_model_call`.
  - The meter shows the threshold marker and the over-window state.
  - After a completed native or Claude Agent SDK compaction, the meter keeps the previous value greyed, with "Compacted — updates on the next model call". Only the run's next live model call clears it. Codex shows no note (D-13).
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
| Rework after DR-002 | ARCH-REV-004–009 Pass; IR-003–IR-006; CRR-004–CRR-008 (CRR-008 Pass); API-REV-002 Fail (F-API-002-01), then API-REV-003 Pass (94%); test-code review CRR-009 Pass |
| Delivery on the integrated state | See below (DR-001); DR-003 checks follow |

Delivery checks on the integrated state (`fdf0dd3f0` + `2f35c00dc`):

- `autobyteus-ts`: typecheck and build clean; `tests/unit/agent/loop` and the request assembler: 8 files, 34/34.
- Server typecheck: clean.
- Server `tests/unit/token-usage`, `tests/unit/agent-execution/backends`, `tests/unit/app-data-migrations`, `tests/unit/startup`, the team token transport unit, `tests/integration/token-usage` and `tests/e2e/token-usage`:
  - 1558 pass, with 2 failures in the upstream AGY upgrade-continuation E2E before its adaptation;
  - after the adaptation, the scoped rerun passes 493/493 (6 skipped, 58 files).
- Gated AGY fake-CLI transport E2E (`RUN_AGY_FAILURE_E2E=1`): 1/1.
- Web `TokenUsageMeterPanel.spec.ts` + `tokenUsageMeterStore.spec.ts`: 30/30.

Delivery checks on `0ba052b0f` (DR-003, base `beb6b3b49`):

- Server typecheck: clean.
- Server scoped set (token-usage unit/integration/E2E, agent-execution backends, app-data migrations, startup, team token transport, and the gated native compaction suite, which skips without its gate): 174 files; 1567 passed, 7 skipped.
- Gated AGY fake-CLI transport E2E: 1/1.
- Web Token Meter panel, meter store and `agentStatusHandler` specs: 68/68.
- `autobyteus-ts` loop + compaction: 145/145.

## Follow-Ups (outside this change)

- Stale base E2Es: `team-run-v1-production-upgrade`, `codex-interrupted-compaction` (`prepareNewAgentRun is not a function`).
- Pricing catalog gaps: claude-haiku-5-5, claude-sonnet-5-5, gemini-3.8-flash-low (owned by the caching tasks).
- Duplicate user-message rendering.
- `generated/graphql.ts` base drift.
- Dormant `claude-text-segment-projector.ts` partial-stream path.
- Non-blocking review notes: the C-02 accumulator import; record cleanup in the Codex live suite.
- Refactoring R-1–R-4: Project Task `project_task_7257984e-19b4-452a-a65b-99316d879bc1`. R-3 is urgent because `tokenUsageMeterStore.ts` is at 499 lines.
- Candidate ticket (pre-existing, not a regression): the standalone roll-up call count does not refresh live while a delegated copy makes calls; it updates at the host's next save.
- Residual risks (API-REV-003):
  - The Claude auto-compaction note path cannot be run in the app.
  - Live AGY is quota-blocked; the fake-CLI transport passes.
  - The failed Claude compaction case was proven in round 2 only.
  - RR-7 is accepted.
  - The 3 TeamRun V1 base-drift E2E cases still fail.
