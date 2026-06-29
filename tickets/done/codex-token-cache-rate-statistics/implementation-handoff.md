# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/design-review-report.md`

Additional evidence retained for review context:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/live-codex-token-accounting-experiment-summary.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/live-claude-token-accounting-experiment-summary.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/codex-total-vs-last-relationship-report.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/claude-modelusage-production-sample.json`

## What Changed

- Changed Codex token usage parsing so normal accounting is sourced from `tokenUsage.total` as `usage_scope: "cumulative_snapshot"` with a stable `snapshot_series_key` and snapshot-identity idempotency key.
- Preserved Codex `tokenUsage.last` as provider-neutral reconciliation metadata under `autobyteus_cumulative_snapshot_provider_delta_tokens`, and continued using it for latest prompt/current context fields.
- Replaced Codex turn-id pending usage storage with an immediate immutable usage-update queue deduped by idempotency key; same-turn updates no longer overwrite each other.
- Extended the shared `TokenUsageSnapshotDeltaNormalizer` to use provider-delta metadata for first cumulative snapshot baseline, compare later cumulative movement against provider deltas, flag mismatches/regressions/missing metadata, and keep Codex missing-first-delta snapshots non-costing instead of charging historical totals.
- Extracted shared component-basis calculation so provider-delta baselines use the same gross/cache/standard semantics as normal usage payloads.
- Added Claude `usage` vs `modelUsage` mismatch diagnostics while preserving current terminal-result `per_turn` source selection.
- Updated Token Meter copy/localization to show `Latest prompt` and clarify latest-prompt vs cumulative run-total/cache-hit semantics through tooltips.
- Updated/added unit coverage for Codex parser/queue/dispatch, shared cumulative reconciliation, Claude diagnostics, and Token Meter copy.

## Key Files Or Areas

Backend implementation:

- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- `autobyteus-server-ts/src/token-usage/projections/cumulative-snapshot-reconciliation-metadata.ts`
- `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts`
- `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts`
- `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts`

Frontend implementation:

- `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`
- `autobyteus-web/localization/messages/en/shell.ts`
- `autobyteus-web/localization/messages/zh-CN/shell.ts`

Tests:

- `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts`
- `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`

## Important Assumptions

- Codex `tokenUsage.total` remains cumulative per thread and `tokenUsage.last` remains the latest provider-delta metadata, as established by investigation artifacts.
- Historical undercounted Codex ledger rows remain out of scope; this is a forward-correctness implementation.
- Claude Agent SDK remains terminal-result `per_turn`; this change only adds divergence diagnostics and does not switch authority from `usage` to `modelUsage`.
- Token Meter continues to consume server-accounted summaries only; no frontend provider-specific accounting was added.

## Known Risks

- If Codex ever emits a first cumulative snapshot without `last`, the shared normalizer flags it and clears cost-affecting fields for that event to avoid historical overcount; the first missing provider delta would not be recovered unless a later cumulative movement can be diffed from that stored source snapshot.
- Snapshot idempotency uses provider id plus cumulative token tuple when provider id is available, or run/thread/turn/scope/token tuple otherwise. This should dedupe exact replays without dropping cumulative advancements, but provider id stability remains worth exercising in API/E2E coverage.
- Durable docs still mention `Current prompt` in existing web docs; per team ownership, delivery should decide whether docs sync is needed after integrated-state refresh.
- `autobyteus-server-ts` package `typecheck` currently fails due repository tsconfig including `tests` while `rootDir` is `src`; source build typecheck passes with `tsconfig.build.json`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix plus targeted refactor and small UX clarity improvement.
- Reviewed root-cause classification: Local Implementation Defect plus Missing Invariant for Codex exactly-once usage accounting; Claude source-authority remains diagnostic/follow-up only.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for Codex parser/queue and shared cumulative baseline; Claude authority switch deferred.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The implemented path keeps provider raw parsing in runtime adapters, cumulative diff/baseline in the shared projection normalizer, and UI accounting presentation-only.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Removed Codex `pendingTurnTokenUsage`/`readyTurnTokenUsageTurnIds`, `recordTurnTokenUsage`, `getReadyTurnTokenUsages`, and turn-id persistence marking. No changed source implementation file exceeds 500 effective non-empty lines.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics`
- Branch status at implementation time: `codex/codex-token-cache-rate-statistics...origin/personal [behind 16]`.
- `pnpm -C autobyteus-web exec nuxi prepare` was needed before running the web component test because `.nuxt/tsconfig.json` was absent in the worktree.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E execution environments or treat that work as part of this section.
Do not report API, E2E, or broader executable checks as passed in this artifact.

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts` — Passed (`36` tests).
- `pnpm -C autobyteus-server-ts run prepare:shared && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Passed.
- `pnpm -C autobyteus-web exec nuxi prepare && pnpm -C autobyteus-web exec vitest run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — Passed (`4` tests).
- `pnpm -C autobyteus-web exec vitest run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — Passed after `.nuxt` generation (`4` tests).
- `pnpm -C autobyteus-web run guard:localization-boundary` — Passed.
- `git diff --check` — Passed.
- `pnpm -C autobyteus-server-ts run typecheck` — Failed on existing repository configuration issue: TS6059 for many `tests/**` files being included while `rootDir` is `src`. The implementation-scoped source build check above passed.

## Downstream Coverage Hints / Suggested Scenarios

- Codex API/E2E path with multiple `thread/tokenUsage/updated` notifications in one active tool-heavy turn: each unique cumulative advancement should produce an accounted update; output and reasoning totals should include all advancements.
- Codex first cumulative snapshot with large historical `total` and small `last`: first accounted delta should be provider `last`, with `first_cumulative_snapshot_baselined_from_provider_delta`.
- Codex later snapshot with cumulative movement larger than `last`: accounting should use cumulative movement and flag `cumulative_snapshot_provider_delta_mismatch`.
- Codex duplicate/replayed exact cumulative snapshot: should not double-count due idempotency/storage behavior.
- Codex malformed/regressed cumulative counters: should flag and avoid fabricated cost-affecting fields.
- Claude terminal result with `num_turns > 1`: still one `per_turn` event/ledger row.
- Claude `usage` and `modelUsage` divergence: raw payload preserves both and quality flags include `claude_usage_model_usage_mismatch` without changing the selected accounting source.
- Token Meter UI: labels/tooltips should present run totals vs latest prompt clearly and should not parse provider raw JSON.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E engineer should perform the required coverage investigation and executable validation. This implementation did not stand up broader API/E2E environments or claim downstream coverage sign-off.
