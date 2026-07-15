# Docs Sync Report

## Scope

- Ticket: `token-statistics-run-team-analysis`
- Trigger: Round 5 post-API/E2E coverage-code re-review passed and handed the cumulative package to delivery.
- Bootstrap base reference: `origin/personal`; ticket branch previously protected the reviewed state with local checkpoint `e3c19bada9bb` and earlier delivery merge commits `468ecbde7a8d` and `f399c2d34e0c`.
- Integrated base reference used for docs sync: `origin/personal@b633fa774a1909b89abcb4fdff6a6d5bb04c768c`, refreshed again on 2026-06-29 after the Electron build; merge-base with the ticket branch is the same commit, so no new base commits required integration in this Round 5 delivery pass.
- Post-integration verification reference: current ticket branch `codex/token-statistics-run-team-analysis` at `f399c2d34e0c` plus uncommitted Round 5 implementation, generated GraphQL, docs, coverage, and delivery artifacts.

## Why Docs Were Updated

- Summary: Round 5 finalizes Settings > Token Statistics as a usage/cost report, not a roster viewer. Long-lived docs now record the self-contained five-field display policy, usage-derived team-member expansion, observed-usage period semantics, By Task default behavior, retained By Model runtime/model diagnostics, generated GraphQL maintenance, and focused coverage expectations.
- Why this should live in long-lived project docs: Token usage statistics span persistence, provider projection, GraphQL, generated frontend types, Pinia state, and Settings UI. Future maintainers need the canonical behavior outside ticket-local artifacts so they do not reintroduce obsolete roster/no-usage rows, member-created-time fields, range-mode selectors, workspace display metadata, or stale generated GraphQL output.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical backend token ledger/statistics contract. | Updated | Documents `tokenUsageTaskStatisticsInPeriod`, the five display fields, observed-usage filtering, By Model runtime/model grouping, codegen maintenance, and focused coverage. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture doc for sidecar stores and Settings token-statistics ownership. | Updated | Adds `tokenUsageStatisticsStore` behavior, By Task default, usage-derived team expansion, first-usage fallback labelling, and forbidden MVP concepts. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/settings.md` | Settings-page documentation entrypoint. | Updated | Mirrors the Settings Token Statistics ownership and behavior notes in the settings documentation. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Root workspace overview and setup guide. | No change | The root README does not own detailed token-statistics semantics; it was read for workspace context. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/README.md` | Frontend/electron README and build instructions. | No change | It already documents `pnpm build:electron:mac`, macOS verbose no-notarization flags, `electron-dist`, and integrated-server packaging; no token-statistics docs belong there. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/README.md` | Backend package README. | No change | The module doc is the correct durable home for token usage semantics. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/token_usage.md` | Backend/API and frontend contract documentation | Recorded the task-statistics GraphQL projection, five persisted display fields (`teamName`, `agentName`, `runSummary`, `runCreatedAt`, `memberName`), no workspace/roster metadata in Settings statistics, observed-usage period semantics, By Model runtime/model diagnostics, Settings UI contract, coverage, and generated GraphQL refresh expectations. | Makes the server-owned accounting/statistics contract durable and prevents future projection or generated-artifact drift. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture docs | Added Settings Token Statistics as a historical sidecar-store surface distinct from the live Token Meter. | Clarifies store ownership, UI semantics, and Round 5 forbidden concepts for maintainers. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/settings.md` | Settings docs | Added the Settings Token Statistics sidecar-store and UI behavior notes. | Ensures the named Settings doc does not omit the new behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Usage/cost report boundary | Settings > Token Statistics reports ledger usage/cost, not full live roster state. | `requirements.md`, `design-spec.md`, `design-rework-round5-final-field-policy.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Five self-contained display fields | Token usage owns only `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName` beyond existing ledger identity/runtime/cost fields. | `design-rework-round5-final-field-policy.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Team expansion policy | Expanded team rows include only members with selected-period usage; inactive roster/no-usage members are not synthesized. | `design-rework-round5-final-field-policy.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Date range and created-time semantics | The MVP filters by ledger usage observed during the period, has no `rangeMode`, and top-level rows fall back to first observed usage when `runCreatedAt` is unavailable; member rows do not expose member-created-time fields. | `requirements.md`, `design-rework-round5-final-field-policy.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Runtime/model diagnostics | By Model remains a secondary diagnostics tab grouped by runtime/model pair with server-owned cost/status semantics. | `requirements.md`, `design-spec.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Generated GraphQL artifact freshness | Frontend generated GraphQL must be refreshed when token-usage schema/documents change. | `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `TokenUsageRunHistoryEnricher` roster/no-usage direction | Tight display-field capture via `TokenUsageDisplayFieldCapturer` and ledger-owned display fields. | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Model-only Settings token statistics as the primary view | By Task default table plus retained By Model diagnostics tab. | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Roster/no-usage team-member rows in Settings statistics | Usage-derived nested member rows only. | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Workspace/source-node/broad display-context metadata in Settings statistics | Only the five Round 5 display fields plus existing ledger identity/runtime/path/cost fields. | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Member-created-time fields/assertions | Top-level `runCreatedAt`/`createdTimeSource`; no member-created-time API for Settings statistics. | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| `rangeMode` / `Tasks created in period` MVP selector | Static `Usage during period` observed-ledger semantics. | `autobyteus-server-ts/docs/modules/token_usage.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest tracked `origin/personal@b633fa774a19` integrated state. The residual generated GraphQL drift reported by API/E2E/code review was resolved in delivery by running web codegen against the Round 5 built backend schema. The macOS Electron build also completed successfully for user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
