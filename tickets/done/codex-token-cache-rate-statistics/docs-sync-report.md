# Docs Sync Report

## Scope

- Ticket: `codex-token-cache-rate-statistics`
- Trigger: Delivery-stage docs sync after code-review/API-E2E pass and latest-base integration refresh.
- Bootstrap base reference: `origin/personal` @ `f3305f40c990f76614158533c14f16de6f2c3608` (`docs(ticket): record mcp projector finalization`), recorded in investigation notes.
- Integrated base reference used for docs sync: `origin/personal` @ `7d6d6f4b47180ef34bed3e4d6493346ddd9eb16b` (`docs(ticket): record workspace run visibility release finalization`), merged into ticket branch by `1675663e`. A later user-requested Electron-build refresh merged `origin/personal` @ `4938681a487331349cb04936c7977350b25d222d` (`fix(web): declutter workspace path helper text`) by `9e6d0038`; that commit touched workspace selector UI/tests only and did not require additional docs changes.
- Post-integration verification reference: ticket branch `codex/codex-token-cache-rate-statistics` at merge commit `9e6d0038` plus delivery worktree docs/log edits; post-integration checks and the user-requested local Electron build passed in `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/done/codex-token-cache-rate-statistics/delivery-evidence/`.

## Why Docs Were Updated

- Summary: Long-lived token usage docs still described the old `Current prompt` label and outdated Codex ingestion behavior. They now document `Latest prompt`, Codex cumulative `total` snapshot accounting with `last` as provider-delta metadata, immediate same-turn update dispatch, Claude `usage`/`modelUsage` divergence diagnostics, and emitted-model identity expectations in runtime E2E.
- Why this should live in long-lived project docs: Token usage accounting is a shared backend/frontend contract. Future runtime, GraphQL, frontend, and test changes need canonical guidance outside this ticket to avoid reintroducing turn-id overwrite accounting, UI-only provider math, or stale launch-alias/model-identity assertions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical backend token usage accounting and frontend contract doc. | Updated | Promoted final Codex cumulative-snapshot accounting, Claude diagnostic flag, `Latest prompt`, and runtime E2E model-identity behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/agent_execution_architecture.md` | Long-lived frontend architecture doc includes Token Usage Meter sidecar contract. | Updated | Replaced stale `Current prompt` user-facing hierarchy/copy references with `Latest prompt` and matching field wording. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/settings.md` | Long-lived settings/architecture doc mirrors Token Usage Meter contract. | Updated | Replaced stale `Current prompt` user-facing hierarchy/copy references with `Latest prompt` and matching field wording. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-ts/docs/llm_module_design.md` | Shared LLM usage observation doc was checked for stale current-prompt wording. | No change | Existing text already refers generically to latest prompt/context-window hints and did not contain the stale UI label. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` | Backend/runtime accounting contract and frontend Token Meter contract | Updated Codex App Server section to prefer `tokenUsage.total` cumulative snapshots, preserve `tokenUsage.last` as provider-delta metadata, baseline the first snapshot from the provider delta, compare later total movement to provider delta, dispatch same-turn updates immediately, and record `Latest prompt` UI/field semantics. Added Claude `claude_usage_model_usage_mismatch` diagnostic note and runtime E2E emitted-model identity note. | Prevent future regression to same-turn overwrite/lost increments, historical-total overcharge on first Codex snapshot, or stale Claude launch-alias assertions. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture doc copy sync | Replaced Token Meter hierarchy and related current-prompt wording with `Latest prompt` / latest-prompt context pressure terminology. | Align durable frontend docs with current UI copy and component tests. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/settings.md` | Frontend/settings doc copy sync | Replaced Token Meter hierarchy and related current-prompt wording with `Latest prompt` / latest-prompt context pressure terminology. | Align durable frontend docs with current UI copy and component tests. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Codex cumulative token usage | Codex `tokenUsage.total` is a cumulative thread snapshot; aggregate deltas come from snapshot movement, not summing raw cumulative totals or overwriting per-turn slots. | Requirements, investigation notes, design spec, implementation handoff, execution coverage report | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` |
| First Codex snapshot baseline | `tokenUsage.last` provider-delta metadata prevents charging historical thread totals on the first observed cumulative snapshot. | Requirements, design spec, implementation handoff, code review report | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` |
| Same-turn Codex updates | Multiple `thread/tokenUsage/updated` notifications for one active `turnId` must be dispatched/accounted as they arrive and not collapsed behind one map entry. | Investigation notes, requirements, design spec, execution coverage report | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` |
| Claude source divergence | Claude remains terminal-result/per-turn accounting; raw `usage`/`modelUsage` divergence is diagnosable with `claude_usage_model_usage_mismatch` rather than treated as Codex-style cumulative data. | Requirements, investigation notes, design spec, implementation handoff | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` |
| Token Meter latest prompt terminology | The UI label is `Latest prompt`, a latest provider prompt/context snapshot, not a run-total field; gross input/cache hit remain cumulative run totals. | Requirements, design spec, implementation handoff, code review report | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/agent_execution_architecture.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Codex same-turn token usage pending map keyed only by `turnId` as an accounting gate | Immediate ready usage dispatch plus cumulative snapshot normalization/idempotency | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` |
| Codex `last` as the preferred durable accounting source when `total` is available | Codex `total` cumulative snapshots as the accounting source; `last` as provider-delta baseline/diagnostic metadata | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` |
| Token Meter `Current prompt` label in durable docs | Token Meter `Latest prompt` label and latest prompt/context pressure wording | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/agent_execution_architecture.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-web/docs/settings.md` |
| Runtime E2E expectation that summary/statistics model identity must equal a launch alias | Runtime E2E expects GraphQL summary/statistics model identity to match emitted `TOKEN_USAGE_UPDATED.model_identifier` | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/autobyteus-server-ts/docs/modules/token_usage.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete on the integrated branch. `git diff --check` passed after docs sync; evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/done/codex-token-cache-rate-statistics/delivery-evidence/post-docs-sync-git-diff-check.log`.
