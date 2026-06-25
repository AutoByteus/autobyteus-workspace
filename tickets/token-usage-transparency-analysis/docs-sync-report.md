# Docs Sync Report

## Scope

- Ticket: `token-usage-transparency-analysis`
- Trigger: Delivery-stage docs sync after post-API/E2E round-4 Codex/Claude browser screenshot evidence re-review passed from `code_reviewer` as code-review round 7.
- Bootstrap base reference: `origin/personal` @ `5bd521ba83e4a2df852be5e8914915959149137d` (`chore(release): bump workspace release version to 1.3.75`) recorded by the upstream package.
- Integrated base reference used for docs sync: `origin/personal` @ `5bd521ba83e4a2df852be5e8914915959149137d` after `git fetch origin personal` on 2026-06-25; local `HEAD` was the same commit and `git rev-list --left-right --count HEAD...origin/personal` returned `0 0`.
- Post-integration verification reference: No base commits were integrated, so upstream source/API/E2E/code-review evidence remains on the same base. Delivery updated docs/artifacts only, then ran `git diff --check origin/personal`, a delivery-owned docs/artifacts whitespace scan, and a long-lived-doc stale-current-assertion scan.

## Why Docs Were Updated

- Summary: The reviewed implementation establishes a server-owned token usage ledger/event path as the current authority, decommissions the old role-split storage/response-processor/extension accounting assumptions, adds trusted/missing/partial/mixed API-cost semantics, exposes a frontend display-only token usage meter, includes successful environment-gated real-runtime E2E evidence for AutoByteus+LM Studio qwen3.5, Codex App Server, and Claude Agent SDK, and now includes real local browser screenshot evidence for AutoByteus, Codex App Server, and Claude Agent SDK Usage panels.
- Why this should live in long-lived project docs: Token usage is a cross-runtime accounting invariant spanning native AutoByteus, Codex App Server, Claude Agent SDK, server event enrichment/persistence, GraphQL statistics, and frontend run/team usage display. Future changes need canonical docs to avoid reintroducing local estimation, optional lossy persistence, cumulative snapshot double-counting, `$0` display for unpriced usage, or ambiguity around estimated-vs-unpriced browser display behavior across runtime kinds.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/README.md` | Module index/common patterns had a stale `TokenUsageStore` statement before delivery docs sync. | Updated | Records ledger-backed `TokenUsageLedgerStore` / `token_usage_ledger_events` authority. Still accurate after round-4 browser evidence. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Canonical server token usage module doc and best place to record real-runtime plus browser-facing validation evidence. | Updated | Documents ledger/event/persistence/GraphQL/frontend contract, includes the exact `RUN_RUNTIME_TOKEN_USAGE_E2E=1` command plus the three passing real runtime cases, and now records AutoByteus/Codex/Claude browser proof for Usage UI/header-chip estimated and unpriced semantics. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex raw mapping previously described token usage as normalized no-op/thread readiness only. | Updated | Documents thread-state-first parsing plus ready `TOKEN_USAGE_UPDATED` emission and cumulative-snapshot guardrail. Still accurate after real Codex runtime and browser evidence. |
| `autobyteus-ts/docs/llm_module_design.md` | LLM module doc previously described `TokenUsageTrackingExtension` as auto-registered accounting. | Updated | Replaced with `LlmTokenUsageObservation`, provider normalizers, shared pricing lookup, and no-extension accounting guidance. Still accurate after AutoByteus+LM Studio real runtime E2E passed. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Streaming design snippet used old `TokenUsage` type for `ChunkResponse.usage`. | Updated | Snippet now uses `LlmTokenUsageObservation`. |
| `autobyteus-ts/docs/agent_memory_design.md` | Active memory doc referenced `TokenUsageTrackingExtension` update work and generic `TokenUsage`. | Updated | Clarifies provider observations drive compaction and server ledger owns durable accounting/cost estimates. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Node.js/TypeScript memory variant duplicated stale extension/token wording. | Updated | Same correction as `agent_memory_design.md`. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend execution architecture needed durable token meter sidecar/event handling docs and multi-runtime browser-facing proof semantics. | Updated | Added token usage meter store, `TOKEN_USAGE_UPDATED` routing, nullable-cost status semantics, Usage tab/header chip responsibilities, and latest AutoByteus/Codex/Claude browser proof expectations. |
| `autobyteus-web/docs/settings.md` | Duplicate frontend architecture doc kept in sync with `agent_execution_architecture.md`. | Updated | Same token meter sidecar/event handling and multi-runtime browser-facing proof addition. |
| `autobyteus-server-ts/docs`, `autobyteus-ts/docs`, `autobyteus-web/docs` stale-current-assertion scan | Corpus-level check for old current-behavior assertions. | No change | Corrected scan found no matches for stale current assertions such as auto-registered `TokenUsageTrackingExtension`, old `TokenUsage` streaming usage snippets, or Codex token no-op wording. Remaining old component names appear only as explicit decommission notes or historical coverage references. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/README.md` | Module common pattern | Replaced stale SQL `TokenUsageStore` statement with ledger-backed authority. | Prevent future subsystem docs from pointing to removed live storage. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Server module canonical docs and validation instructions | Documented ledger scope, TS source owners, event pipeline, reported-vs-accounting deltas, cost status semantics, SQL storage, GraphQL/statistics queries, frontend contract, browser frontend evidence, runtime E2E coverage, and operational notes. Browser evidence now covers AutoByteus unpriced, Codex estimated, and Claude unpriced Usage panels. | Promote the reviewed ledger/event authority, repeatable real-runtime validation path, and observed browser-facing estimated/unpriced Usage UI behavior into long-lived server docs. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Runtime event mapping | Added `codex-thread-token-usage.ts` owner, ready `TOKEN_USAGE_UPDATED` emission, and raw `last` vs cumulative `total` scope guidance. | Prevent Codex cumulative snapshots from being treated as direct deltas and keep raw parsing in thread/backend owners. |
| `autobyteus-ts/docs/llm_module_design.md` | LLM runtime architecture | Replaced auto extension accounting with provider `LlmTokenUsageObservation`, normalizers, pricing lookup, and no local-estimation accounting guidance. | Align native runtime docs with the new observation-only responsibility. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Streaming response type snippet | Updated `ChunkResponse.usage` docs from `TokenUsage` to `LlmTokenUsageObservation`. | Keep streaming/tool docs accurate for provider usage observations. |
| `autobyteus-ts/docs/agent_memory_design.md` | Memory compaction/accounting boundary | Replaced stale `TokenUsageTrackingExtension` instructions and generic provider `TokenUsage` wording. | Clarify compaction can consume provider observations while server ledger owns accounting. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Memory compaction/accounting boundary | Same as above for the Node.js/TypeScript variant. | Keep duplicate active design docs consistent. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend sidecar/event docs | Added `TokenUsageMeterStore`, `TOKEN_USAGE_UPDATED` handler routing, GraphQL hydration, dedupe, nullable cost status, UI surfaces, and multi-runtime browser-facing proof expectations. | Document user-visible Usage tab/header semantics, frontend non-authority, and real-browser estimated/unpriced status display expectations. |
| `autobyteus-web/docs/settings.md` | Frontend sidecar/event docs | Mirrored the architecture update. | Keep duplicate frontend architecture docs consistent. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Ledger/event authority | `token_usage_ledger_events` and `TokenUsageLedgerStore` are the current source of truth; old role-split storage and optional response processor writes are not current accounting paths. | Requirements; design spec; implementation handoff; code review report | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-server-ts/docs/modules/README.md` |
| Runtime ingestion boundaries | Native AutoByteus emits provider observations from `LlmPhase`; Codex parses thread token usage and emits ready scoped events; Claude extracts terminal SDK result/model usage. | Design spec; implementation handoff; coverage reports | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-ts/docs/llm_module_design.md` |
| Reported vs accounting token semantics | Summaries and cost use accounting deltas only; cumulative snapshots are diffed by series and raw reported readings remain for audit. | Requirements; design review; API/E2E coverage | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Cost-status semantics | Estimated API cost is nullable and requires trusted catalog pricing; missing/partial/mixed prices must remain visible and must not be rendered as `$0`. Browser evidence covers both estimated Codex cost cards and unpriced AutoByteus/Claude cost cards. | Requirements; design spec; implementation handoff; API/E2E execution report | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Native usage observations | Provider adapters produce `LlmTokenUsageObservation`; local token estimation/extensions do not feed durable accounting. | Design spec; implementation handoff; code review report | `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/api_tool_call_streaming_design.md`, memory design docs |
| Frontend display-only meter | `tokenUsageMeterStore`, `TokenUsageHeaderChip`, and the right-side Usage tab display server-accounted live/hydrated summaries only; frontend does not compute authoritative accounting or prices. | Implementation handoff; API/E2E coverage; code review report | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/token_usage.md` |
| Real runtime E2E validation path | The repeatable command is gated by `RUN_RUNTIME_TOKEN_USAGE_E2E=1` and was reviewed as passing for AutoByteus+LM Studio qwen3.5, Codex App Server, and Claude Agent SDK. Default runs skip it safely. | API/E2E coverage investigation; API/E2E execution coverage report round 2; code review report rounds 5-7 | `autobyteus-server-ts/docs/modules/token_usage.md`, ticket handoff artifacts |
| Multi-runtime browser frontend proof | Latest evidence covers AutoByteus+LM Studio qwen3.5 unpriced Usage UI, Codex App Server estimated Usage UI, and Claude Agent SDK unpriced Usage UI. Screenshots are retained at `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png`, `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png`, and `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png`. This is proof of the browser contract, not durable committed browser automation. | API/E2E coverage investigation round 4; API/E2E execution coverage report round 4; code review report round 7; retained screenshots | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, ticket handoff artifacts |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `token_usage_records` as live accounting source | Append-oriented `token_usage_ledger_events` plus `TokenUsageLedgerEvent` Prisma model | `autobyteus-server-ts/docs/modules/token_usage.md` |
| `TokenUsageStore` / `SqlTokenUsageRecordRepository` live storage | `TokenUsageLedgerStore` / `SqlTokenUsageLedgerRepository` | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-server-ts/docs/modules/README.md` |
| Optional `TokenUsagePersistenceProcessor` response-processor writes | `TOKEN_USAGE_UPDATED` event enrichment plus async `TokenUsageEventPersistenceProcessor` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Auto-registered `TokenUsageTrackingExtension` / local token estimation as accounting authority | Provider `LlmTokenUsageObservation` and server ledger/cost enrichment | `autobyteus-ts/docs/llm_module_design.md`, memory design docs |
| Codex token usage as normalized no-op/readiness only | Thread-state parsing plus backend `TOKEN_USAGE_UPDATED` emission with `per_turn` or `cumulative_snapshot` scope | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/token_usage.md` |
| Hard-skipped Codex-only real runtime E2E as the only live-runtime coverage artifact | `RUN_RUNTIME_TOKEN_USAGE_E2E=1` environment-gated AutoByteus+LM Studio, Codex, and Claude runtime E2E matrix | `autobyteus-server-ts/docs/modules/token_usage.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` |
| Frontend/default-zero cost interpretation | Nullable estimated API costs with `estimated`, `price_missing`, `partial_price_missing`, and `mixed` status, confirmed by real browser evidence rendering both estimated and unpriced values | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/token_usage.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A` — docs changes were needed and applied.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against branch state confirmed current with `origin/personal` @ `5bd521ba83e4`. `git diff --check origin/personal` passed after docs edits; a delivery-owned docs/artifacts whitespace scan passed for the updated documentation and ticket artifacts. Corrected stale-current-doc assertion scan passed with no matches for old current-behavior claims. Finalization is intentionally paused pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
