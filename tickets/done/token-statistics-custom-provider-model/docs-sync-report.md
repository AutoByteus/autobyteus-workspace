# Docs Sync Report

## Scope

- Ticket: `token-statistics-custom-provider-model`
- Trigger: Delivery-stage synchronization after API/E2E `API-REV-002` passed at 96% confidence and proportional durable test-code review `CRR-006` passed with no findings.
- Bootstrap base reference: `origin/personal` at `596094be191f6aecba6ef37abcda342a20e9af64` (recorded in investigation notes).
- Integrated base reference used for current docs sync: `origin/personal` at `1b8d8c2f22c5f846dd82cdd706f594103d1b4e1e`; `git fetch origin personal --prune` confirmed the tracked base had not advanced beyond the previously integrated merge commit `a503a6920`.
- Post-integration verification reference: No additional base commits were integrated, so no new base-triggered rerun was required. The authoritative current execution package is `API-REV-002` / `execution-coverage-report.md` — targeted and full token-usage E2E, live startup/GraphQL/browser, frontend tests, Nuxt preparation, guards, production build, and diff checks all passed.

## Why Docs Were Updated

- Summary: The final implementation adds an ingestion-time nullable `provider_name` snapshot for AutoByteus ledger events, snapshot-first Token Statistics display, a provider-name legacy backfill (Migration B), and preserved nullable direct Codex/Claude paths. The earlier `model_value` backfill (Migration A), raw/display GraphQL contract, and accounting boundaries remain in force.
- Why this should live in long-lived project docs: Token Usage and frontend architecture/settings docs are the durable references for the ledger schema, ingestion ownership, statistics display semantics, migration ordering/recovery, and raw/display separation. The prior docs described current provider lookup but not the final historical snapshot contract, so leaving them unchanged would preserve stale historical-name behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/docs/modules/token_usage.md` | Canonical server Token Usage, ledger schema, migration, GraphQL/statistics, and frontend-contract documentation. | `Updated` | Added nullable `provider_name`, snapshot-first ingestion/display semantics, Migration A/B ordering and recovery, and preserved direct-runtime null behavior. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture reference for Settings Token Statistics behavior and display ownership. | `Updated` | Clarified persisted snapshot preference and legacy current-registry fallback. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/docs/settings.md` | Duplicate settings-facing architecture reference containing the same Token Statistics contract. | `Updated` | Mirrored snapshot-first provider-label semantics to avoid stale duplicate guidance. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/docs/ARCHITECTURE.md` | Server startup and app-data migration ordering context. | `No change` | Existing startup ordering remains accurate; the specific Token Usage schema and Migration A/B contract is documented in `modules/token_usage.md`. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/docs/modules/llm_management.md` | Custom-provider identity, saved provider IDs, and provider-name lifecycle context. | `No change` | Provider configuration ownership remains unchanged; only token-usage ingestion snapshots provider display metadata. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/README.md` | User-requested local Electron build guidance. | `No change` | Existing README command and integrated-backend instructions were followed; the local package result is recorded in delivery artifacts, not product documentation. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-server-ts/docs/modules/token_usage.md` | Server architecture / persisted-data contract | Documented `provider_name` schema migration, AutoByteus ingestion-time snapshots, nullable direct-runtime paths, Migration A model-value correction, Migration B provider-name recovery, strict scope, CAS/idempotency, preserved-field invariants, retry/status behavior, and snapshot-first display. | Keeps durable storage, runtime, and operational behavior aligned with the final implementation. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture contract | Updated provider-aware label policy to prefer persisted snapshot names and use current provider metadata only for legacy rows without snapshots. | Prevents future UI work from reintroducing rename/deletion instability or frontend provider-ID parsing. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/autobyteus-web/docs/settings.md` | Frontend settings contract mirror | Mirrored the snapshot-first raw/display contract. | Keeps duplicate Settings Token Statistics guidance consistent. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Raw versus display identity | `llmModel` / `models` remain canonical raw grouping/accounting identities; `modelDisplayName` / `modelDisplayNames` are additive server-owned fields. | `requirements.md`, `design-spec.md`, `api-e2e-test-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend architecture/settings docs |
| Provider-name snapshot ownership | New AutoByteus events persist provider display metadata at ingestion; direct Codex/Claude remain nullable and non-AutoByteus labels are unchanged. | `requirements.md`, `design-spec.md`, `execution-coverage-report.md` | Same three long-lived docs |
| Historical-name stability | Rows with snapshots retain the historical provider name after provider rename/deletion; legacy null/empty rows use Migration B or current lookup/fallback. | `requirements.md`, `api-e2e-revision-record.md`, live before/after deletion evidence | Same three long-lived docs |
| Migration A/B operations | Migration A normalizes validated composite `model_value`; Migration B fills only eligible null/empty `provider_name`, preserves all other ledger fields, skips unrecoverable rows, and supports durable recovery. | `design-spec.md`, `execution-coverage-report.md`, `api-e2e-test-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md` |
| Task alignment | `models` and `modelDisplayNames` come from one ordered sequence and remain equal-length/positionally aligned through recursive rows. | `design-spec.md`, `code-review-report.md`, `api-e2e-test-review-report.md` | Same three long-lived docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Statistics-time provider lookup as the source for every historical custom-provider label | Ingestion-time nullable `provider_name` snapshot, with current lookup/fallback only for legacy rows without snapshots. | `autobyteus-server-ts/docs/modules/token_usage.md`; frontend architecture/settings docs |
| Frontend rendering of raw custom-provider composite identity as the only visible Model/Task value | Server-owned display fields alongside unchanged raw fields. | Same three long-lived docs |
| No correction path for legacy provider display metadata | Fixed-ID provider-name snapshot backfill alongside the existing value-only model-value backfill. | `autobyteus-server-ts/docs/modules/token_usage.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`; long-lived docs required updates for the provider snapshot schema, ingestion contract, historical-name policy, and Migration B lifecycle.
- Rationale: `N/A`.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Maintain the current integrated branch and handoff artifacts for explicit user behavioral verification; do not archive, push, merge into `personal`, release, deploy, or clean up before that signal.
- Notes: `origin/personal` remained current with the existing integration. Delivery-owned documentation edits were made after the refresh check and against the API-REV-002 validated state. The README-guided unsigned Electron test package remains available from the prior delivery round; its build and artifact integrity results are recorded in `handoff-summary.md` and `release-deployment-report.md`.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
