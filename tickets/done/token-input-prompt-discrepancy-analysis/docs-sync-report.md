# Docs Sync Report

## Scope

- Ticket: `token-input-prompt-discrepancy-analysis`
- Trigger: Delivery-stage docs sync after post-API/E2E durable coverage code review passed.
- Bootstrap base reference: `origin/personal` at `1f80dc4f0bf3` (recorded worktree creation base in investigation notes).
- Integrated base reference used for docs sync: `origin/personal` at `9c964f056b48` merged into the ticket branch by delivery.
- Post-integration verification reference: ticket branch merge commit `f71b39a42641`; targeted token-usage checks passed before docs edits, and `git diff --check` passed after docs edits.

## Why Docs Were Updated

- Summary: Public token-usage and frontend architecture docs were stale relative to the reviewed implementation. They still described broad Input/Output/Total cards, raw event counts, old context-pressure wording, and a less explicit pricing/cache model.
- Why this should live in long-lived project docs: The new behavior changes the durable public contract for token usage summaries, Token Meter wording, pricing status interpretation, provider cache semantics, and local/no-provider-bill handling. Future implementation and support work needs these semantics outside ticket-local artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical server token-usage architecture and user-facing summary semantics. | Updated | Promoted gross/standard/cache component semantics, cost statuses, GraphQL fields, Token Meter wording, and current evidence. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex raw token usage mapping references current context/cache fields. | Updated | Added canonical promoted fields for Codex token usage updates. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-ts/docs/llm_module_design.md` | Provider observation and pricing metadata ownership. | Updated | Added input semantic/cache state/cache buckets and local/no-bill pricing metadata notes. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-ts/docs/provider_model_catalogs.md` | Shared model catalog pricing contract. | Updated | Added cache-write subtype, pricing policy, custom endpoint, and local/no-bill guidance. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-web/docs/agent_execution_architecture.md` | Frontend Token Meter store/UI contract. | Updated | Replaced stale event-count/Input-card wording with current Token Meter hierarchy and fields. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-web/docs/settings.md` | Duplicate long-lived frontend architecture copy that contained the same stale Token Meter section. | Updated | Kept wording aligned with `agent_execution_architecture.md`. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-server-ts/docs/modules/token_usage.md` | Architecture / runtime semantics / user-facing contract | Documented component-basis resolver, `gross_includes_cache` vs `base_excludes_cache`, gross/standard/cache-read/cache-write fields, cache states, usage reports, current prompt/context-window fields, pricing statuses including `local_no_api_bill`, GraphQL summary fields, and cache-aware Token Meter hierarchy. | Canonical token-usage docs must match the new server-owned contract and UI wording. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex integration mapping | Added explicit promoted token-usage fields for Codex `thread/tokenUsage/updated`. | Prevent future Codex mapping work from leaving cache/reasoning/context fields raw-only or stale. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-ts/docs/llm_module_design.md` | Provider observation / pricing ownership | Documented provider input-token semantic, cache state, cache buckets, reasoning/billable output, latest prompt/context hints, and pricing metadata statuses. | Provider adapters should report usage facts; server owns component basis and pricing. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-ts/docs/provider_model_catalogs.md` | Pricing metadata contract | Documented cache-write subtype prices, policy application, custom endpoint missing pricing, and local/no API bill status. | Prevents future catalog additions from silently treating missing dimensions or custom endpoints as free. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture | Updated Token Usage Meter section for gross input, input breakdown, pricing details, usage reports, current prompt, and local/partial/mixed statuses. | Frontend must remain display-only and use current server-owned fields. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/autobyteus-web/docs/settings.md` | Frontend architecture duplicate | Same Token Usage Meter section update as above. | Keeps duplicate durable docs from preserving obsolete wording. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Gross vs standard/cache input | Gross input is cumulative prompt/input sent to provider context; standard input is uncached/full-price/base; cache read/write are separate discounted/creation components. | `requirements.md`, `provider-probe-matrix.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend docs |
| Provider input semantics | OpenAI-compatible/Codex-style providers report gross input; Anthropic/Claude-style usage can be base/additive and must not use a universal `input - cache` formula. | `provider-probe-matrix.md`, `design-spec.md` | `autobyteus-server-ts/docs/modules/token_usage.md`; `autobyteus-ts/docs/llm_module_design.md` |
| Pricing statuses and missing dimensions | `estimated`, `partial_price_missing`, `price_missing`, `local_no_api_bill`, and `mixed` have distinct meanings; missing dimensions and custom endpoints are not free. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, API/E2E reports | `autobyteus-server-ts/docs/modules/token_usage.md`; `autobyteus-ts/docs/provider_model_catalogs.md`; frontend docs |
| Token Meter wording | The UI hierarchy is `Current prompt`, `Gross input`, `Output`, `Total estimate`, `Input breakdown`, `Pricing details`; raw `events` are demoted to `Usage reports` / model calls. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, implementation evidence | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend docs |
| Current prompt/context-window fields | `latestPromptTokens`, `effectiveContextWindowTokens`, and `contextWindowUsagePercent` describe the latest model call/context pressure, not cumulative usage. | `design-spec.md`, `implementation-handoff.md`, code review report | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Ambiguous primary `Input` Token Meter label | `Gross input` plus `Input breakdown` component rows. | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend docs |
| Raw primary `events` count | Details-only `Usage reports` / model calls using `usageReportCount`. | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend docs |
| Universal cache subtraction pricing formula | Provider-aware component-basis resolver and pricing policy. | `autobyteus-server-ts/docs/modules/token_usage.md`; `autobyteus-ts/docs/llm_module_design.md` |
| Trusted-zero fallback for arbitrary custom OpenAI-compatible endpoints | Explicit trusted pricing or `price_missing`. | `autobyteus-ts/docs/provider_model_catalogs.md`; `autobyteus-server-ts/docs/modules/token_usage.md` |
| Paid-provider `$0 estimate` wording for local runtimes | `local_no_api_bill` status. | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend docs |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after delivery integrated latest `origin/personal` and after post-integration token-usage checks passed. Repository finalization remains held for explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
