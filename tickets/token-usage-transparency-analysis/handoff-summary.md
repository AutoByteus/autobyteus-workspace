# Handoff Summary: token-usage-transparency-analysis

## Current Status

Delivery handoff is prepared and waiting for explicit user verification. Repository finalization, ticket archival, push/merge, release, deployment, and cleanup have not been performed because the delivery workflow requires user confirmation first.

## Worktree / Branch

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis`
- Ticket branch: `codex/token-usage-transparency-analysis`
- Recorded base / finalization target: `origin/personal`
- Latest tracked base checked by delivery: `origin/personal` @ `5bd521ba83e4a2df852be5e8914915959149137d`
- Local branch `HEAD` at delivery refresh: `5bd521ba83e4a2df852be5e8914915959149137d`
- Base comparison after `git fetch origin personal` on 2026-06-25: `git rev-list --left-right --count HEAD...origin/personal` = `0 0`
- Integration method: Already current; no merge, rebase, or checkpoint commit was needed.
- Delivery note: because no base commits were integrated, upstream source/API/E2E/code-review evidence remains on the same base. Delivery then synchronized long-lived docs and prepared handoff/release-note artifacts.

## Implementation Summary

The reviewed implementation establishes token usage as a durable server-accounted ledger:

- Native `autobyteus-ts` provider adapters produce `LlmTokenUsageObservation` from provider-reported usage, including raw usage, cache/reasoning fields where available, model identity, and quality flags.
- `LlmPhase` carries usage observations on `CompleteResponse`/stream chunks and emits normalized `TOKEN_USAGE_UPDATED` events.
- Server event enrichment adds canonical run/team/member/task/workspace identity, normalizes `per_call` / `per_turn` / `cumulative_snapshot` accounting deltas, and calculates nullable estimated API costs from trusted shared model-catalog pricing.
- `token_usage_ledger_events` is the current append-oriented source of truth with unique event/idempotency keys and run/team/snapshot indexes.
- Old optional/lossy accounting via `TokenUsagePersistenceProcessor`, `TokenUsageStore`, `SqlTokenUsageRecordRepository`, and live `token_usage_records` source authority is removed from the current path.
- Codex thread token usage now preserves `last` versus cumulative `total` scope and emits ready `TOKEN_USAGE_UPDATED` events without summing cumulative snapshots as direct deltas.
- Claude Agent SDK terminal result/model usage is converted into the same token usage event surface.
- Ledger-backed GraphQL queries provide agent-run, team-run, focused-member, and period statistics summaries.
- The frontend usage meter consumes live `TOKEN_USAGE_UPDATED` events and GraphQL hydration only; it displays nullable estimated cost status as `estimated`, `price_missing`, `partial_price_missing`, or `mixed`, and does not treat unpriced rows as `$0`.
- Real runtime E2E is environment-gated, not hard-skipped, and covers AutoByteus+LM Studio qwen3.5, Codex App Server, and Claude Agent SDK through websocket token events and ledger-backed GraphQL summaries/statistics.
- Real browser-stack evidence now covers all three requested runtime families: AutoByteus+LM Studio/qwen3.5 unpriced Usage UI, Codex App Server estimated Usage UI, and Claude Agent SDK unpriced Usage UI.

## Delivery Docs Sync

Long-lived docs were updated after confirming the branch was current with `origin/personal`:

- `autobyteus-server-ts/docs/modules/README.md`
- `autobyteus-server-ts/docs/modules/token_usage.md`
- `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`
- `autobyteus-ts/docs/llm_module_design.md`
- `autobyteus-ts/docs/api_tool_call_streaming_design.md`
- `autobyteus-ts/docs/agent_memory_design.md`
- `autobyteus-ts/docs/agent_memory_design_nodejs.md`
- `autobyteus-web/docs/agent_execution_architecture.md`
- `autobyteus-web/docs/settings.md`

The canonical server token usage doc now records both validation surfaces:

- Exact environment-gated real-runtime E2E command:

```sh
RUN_RUNTIME_TOKEN_USAGE_E2E=1 \
RUNTIME_TOKEN_USAGE_E2E_TIMEOUT_MS=300000 \
LMSTUDIO_MODEL_ID='qwen3.5-27b:lmstudio@127.0.0.1:1234' \
CODEX_E2E_TOOL_MODEL='gpt-5.4-mini' \
CLAUDE_E2E_MODEL='sonnet' \
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts
```

- Round-3/4 browser frontend evidence across all requested runtime families:
  - AutoByteus + LM Studio qwen3.5 screenshot: header `366 tok · unpriced`, Usage tokens `321 / 45 / 366`, `price_missing`, runtime `autobyteus`, context pressure `12.2%` / `500 / 4.096`, screenshot `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png`.
  - Codex App Server screenshot: header `12.7k tok · 0,0096 $ est`, Usage tokens `12.695 / 26 / 12.721`, estimated cost cards, `price status estimated`, model `gpt-5.4-mini`, runtime `codex_app_server`, events `1`, screenshot `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png`.
  - Claude Agent SDK screenshot: header `22.3k tok · unpriced`, Usage tokens `22.270 / 39 / 22.309`, unpriced cost cards, `price status price_missing`, model `sonnet`, runtime `claude_agent_sdk`, events `1`, screenshot `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png`.

Docs sync artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/docs-sync-report.md`

Release notes prepared for a future release/finalization path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/release-notes.md`

## Verification Evidence

Upstream reviewer/API-E2E evidence remains authoritative for source/test validation because no base commits were integrated during delivery:

- Latest authoritative code review: round 7 pass, score 9.6/10 (96/100), no open code-review findings; prior CR-001/CR-002/CR-003 remain resolved.
- API/E2E round 4 Codex/Claude browser screenshot execution coverage: pass for the challenged browser screenshot proof gap.
- Round 4 Codex proof:
  - Real backend GraphQL-created run and WebSocket turn emitted `TOKEN_USAGE_UPDATED` from `codex_thread_token_usage`.
  - Backend GraphQL summary returned model `gpt-5.4-mini`, runtime `codex_app_server`, event count `1`, tokens `12695 / 26 / 12721`, `apiCostStatus=estimated`, and total estimated cost `0.009638250000000001 USD`.
  - Browser Usage screenshot `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png` displays input `12.695`, output `26`, total `12.721`, estimated cost cards, `price status estimated`, model `gpt-5.4-mini`, runtime `codex_app_server`, and events `1`.
- Round 4 Claude proof:
  - Real backend GraphQL-created run and WebSocket turn emitted `TOKEN_USAGE_UPDATED` from `claude_sdk_result`.
  - Backend GraphQL summary returned model `sonnet`, runtime `claude_agent_sdk`, event count `1`, tokens `22270 / 39 / 22309`, `apiCostStatus=price_missing`, and nullable estimated cost fields.
  - Browser Usage screenshot `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png` displays header `22.3k tok · unpriced`, input `22.270`, output `39`, total `22.309`, unpriced cost cards, `price status price_missing`, model `sonnet`, runtime `claude_agent_sdk`, and events `1`.
- Round 3 AutoByteus browser proof remains valid:
  - Screenshot `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png` displays the seeded run, header `366 tok · unpriced`, Usage tokens `321 / 45 / 366`, `price_missing`, model `qwen3.5-27b:lmstudio@127.0.0.1:1234`, runtime `autobyteus`, events `1`, and context pressure `12.2%` / `500 / 4.096`.
- API/E2E round 2 real-runtime execution coverage remains passed for AutoByteus+LM Studio qwen3.5, Codex App Server, and Claude Agent SDK.
- Real runtime command passed:
  - `RUN_RUNTIME_TOKEN_USAGE_E2E=1 RUNTIME_TOKEN_USAGE_E2E_TIMEOUT_MS=300000 LMSTUDIO_MODEL_ID='qwen3.5-27b:lmstudio@127.0.0.1:1234' CODEX_E2E_TOOL_MODEL='gpt-5.4-mini' CLAUDE_E2E_MODEL='sonnet' pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
  - Result: 1 file / 3 tests passed.
  - AutoByteus + LM Studio qwen3.5 case: passed.
  - Codex App Server case: passed.
  - Claude Agent SDK case: passed.
- Reviewer round-7 validation:
  - Reviewed latest round-4 coverage investigation/execution report and screenshots.
  - Runtime E2E source had no accidental `.only`; the only `describe.skip` is the intentional `RUN_RUNTIME_TOKEN_USAGE_E2E=1` gate.
  - Runtime E2E with gate disabled passed as 3 skipped, proving default safety.
  - `git diff --check origin/personal` passed after code-review report update.
- Earlier deterministic/package evidence remains recorded in API/E2E and code-review artifacts:
  - `autobyteus-ts` targeted Vitest passed: 4 files / 8 tests.
  - `autobyteus-server-ts` targeted Vitest passed: 12 files / 66 tests.
  - `autobyteus-web` `tokenUsageMeterStore` Vitest passed: 1 file / 3 tests.
  - `pnpm -C autobyteus-ts run build`, `pnpm -C autobyteus-server-ts run build:full`, and web guards/build passed in round 1 evidence.
  - Broad web `nuxi typecheck` still has a known baseline failure outside token usage surfaces; token-usage diagnostic grep had no matches.

Delivery-run checks after docs/artifact updates:

- `git fetch origin personal` — Passed; latest tracked base remained `5bd521ba83e4a2df852be5e8914915959149137d`.
- `git rev-parse --short=12 HEAD && git rev-parse --short=12 origin/personal && git rev-list --left-right --count HEAD...origin/personal` — Passed; both refs were `5bd521ba83e4`, ahead/behind was `0 0`.
- `git diff --check origin/personal` — Passed after delivery docs/artifact edits.
- Delivery-owned docs/artifacts whitespace scan — Passed for the updated long-lived docs and ticket artifacts.
- Corrected long-lived-doc stale-current-assertion scan — Passed/no matches for stale current assertions such as auto-registered `TokenUsageTrackingExtension`, old `TokenUsage` streaming usage snippets, or Codex token no-op wording. Old component names remain only where the docs explicitly mark them as replaced/decommissioned or in historical coverage references.
- `cmp -s autobyteus-web/docs/agent_execution_architecture.md autobyteus-web/docs/settings.md` — Passed; duplicate frontend docs remain synchronized.

## Residual Risks / Notes

- Round-3/4 browser proofs are temporary one-off real-stack/screenshot evidence, not committed durable browser or screenshot automation. Future CI-grade Playwright/browser coverage would further reduce regression risk if this UI surface becomes a recurring release gate.
- Real runtime E2E is environment-gated and depends on configured LM Studio, Codex App Server, and Claude Agent SDK runtimes; default CI without `RUN_RUNTIME_TOKEN_USAGE_E2E=1` skips it by design.
- Provider schema drift remains possible outside the exercised runtime/model paths.
- Pixel-level visual diff assertions were not performed; the browser checks used DOM/state assertions plus retained screenshot evidence.
- Real runtime coverage exercises one successful turn per runtime, not repeated-turn, failure, shutdown, or high-concurrency persistence scenarios.
- Broad web `nuxi typecheck` still fails on a known baseline outside token usage surfaces.
- Async persistence shutdown/drain under abrupt process termination remains a deferred lifecycle risk; current evidence covers append/idempotency/event handling under normal execution.
- Worktree currently contains the reviewed implementation, durable coverage, docs, ticket artifacts, and prepared release notes staged for user verification and eventual finalization.

## Cumulative Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-spec.md`
- Analysis report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/analysis-report.md`
- Latest origin/personal refresh report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/latest-origin-personal-refresh-report.md`
- Design review round-1 rework report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-round-1-rework-report.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-report.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/implementation-handoff.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/api-e2e-execution-coverage-report.md`
- Changed real-runtime durable coverage: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
- AutoByteus browser screenshot evidence: `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png`
- Codex browser screenshot evidence: `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png`
- Claude browser screenshot evidence: `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png`
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/docs-sync-report.md`
- Release/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/release-deployment-report.md`
- Release notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/release-notes.md`

## User Verification / Finalization Approval

No explicit user verification/finalization approval has been received yet. To proceed beyond this handoff, the user should verify the prepared state and explicitly approve finalization. After that signal, delivery must refresh `origin/personal` again, protect/re-integrate if the target advanced, move the ticket folder to `tickets/done/token-usage-transparency-analysis/`, commit/push the ticket branch, merge to the recorded target branch, and run release/deployment only if explicitly requested or project policy requires it.
