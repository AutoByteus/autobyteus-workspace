# Docs Sync Report

## Current Re-entry Status

- Delivery revision: `DR-002`
- Result: `Blocked`
- Latest fetched base:
  `origin/personal@1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`
- Reason: latest-base merge has one implementation-owned conflict in
  `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`.
- Documentation disposition: the report below remains the authoritative DR-001
  prior-base sync, but it is not promoted as current with latest base until the
  conflict is resolved, integrated checks pass, and durable docs are re-audited.
- Long-lived docs edited in DR-002: `None`.
- Canonical blocker: `delivery-integration-blocker.md`.

## Scope

- Delivery revision: `DR-001` historical integrated-state result
- Ticket: `token-usage-one-row-per-agent-run`
- Trigger: `CRR-008` proportional durable-test review Pass after authoritative
  source review `CRR-007` Pass and API/E2E execution `API-REV-003` Pass.
- Bootstrap base reference:
  `origin/personal@0194fb4fffa69037a46aeace491024fdf816dde7`
- Integrated base reference used for docs sync:
  `origin/personal@0194fb4fffa69037a46aeace491024fdf816dde7`
- Post-integration verification reference:
  `delivery-evidence/01-initial-integration-refresh-dr001.log` — fetched base
  remained identical to bootstrap and ticket `HEAD`; divergence `0/0`, no
  unmerged paths, no integration commit.

## Why Docs Were Updated

- Summary: Current Token Usage storage changed from append-per-observation
  ledger rows to one cumulative current record per canonical AgentRun. The
  period contract now selects runs by creation time and displays lifetime
  totals. Startup distinguishes ready, capability-degraded, and critical
  current-schema states. Released ledger interpretation is migration-only.
- Why this should live in long-lived project docs: These are current runtime,
  database, GraphQL, frontend, upgrade, and operator contracts. Leaving the old
  ledger owner or observed-period meaning in durable docs would direct future
  code and users toward removed behavior. The approved migration conventions
  are reusable governance and were explicitly designed for a canonical
  repository destination.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | Canonical production migration entry point | `Updated` | Linked the promoted convention; currentized forward-only ownership and final-state classification. |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Designed durable destination for the approved governance supplement | `Updated` | New canonical reusable convention. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Startup, persistence, and shutdown ownership | `Updated` | Current record owner, readiness classification, awaited persistence, and migration order. |
| `autobyteus-server-ts/docs/modules/README.md` | Module-owner index and common patterns | `Updated` | Replaced ledger-backed owner with run-record owner; linked migration convention. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Canonical module behavior | `Updated` | Rewritten against the reviewed current implementation and migration lifecycle. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Token Meter and Settings-side data contracts | `Updated` | Current-record hydration, authoritative live contribution, creation-time range, lifetime totals, and current hierarchy. |
| `autobyteus-web/docs/settings.md` | Durable Settings behavior | `Updated` | Same current Token Statistics semantics and degraded-history guidance. |
| `ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md` | Existing durable UI specification contained the retired observed-period/ledger contract | `Updated` | Aligned helper copy, current fields, current query shape, and lifetime semantics. |
| `ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md` | Existing behavior matrix encoded retired ledger/event grouping | `Updated` | Current record, exact run/root, creation-time, and lifetime expectations. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | New canonical design guidance | Deterministic known-source mapping, operating assumptions, termination equivalence, reachability, forward-only runtime, final-state classification, residue rules, examples, checklist | Promotes the explicitly approved ticket supplement into reusable repository truth. |
| `autobyteus-server-ts/README.md` | Canonical link and summary | Added convention link; replaced blanket nonfatal wording with platform/core/capability classification | README must point maintainers to the authoritative practice and not contradict it. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Module rewrite | One-row record model, transactional fold, bounded checkpoint/idempotency state, adapters, pricing, migration, readiness, GraphQL, UI, and verification | The prior document described removed append/list/rebuild owners and observed-period semantics. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md`; `docs/modules/README.md` | Architecture/index sync | Current store/repository, migration order/readiness, awaited shutdown behavior | Prevent obsolete owner references at higher-level entry points. |
| `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-web/docs/settings.md` | Frontend contract sync | Current-record hydration, creation-time selection, lifetime helper, current children/identity, degraded/fatal evidence | Matches implemented GraphQL and Settings behavior. |
| `ui-prototypes/token-statistics-task-cost/*` | Durable UI spec/matrix sync | Removed ledger/event-period and execution-path assumptions; added current run record/lifetime behavior | Keeps existing implementation guidance from contradicting production behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Production data-migration governance | Deterministic source-to-target mapping, product reachability, forward-only runtime, truthful final-state classification, bounded warnings, proportional recovery | `data-migration-conventions.md`; `requirements.md`; `design-spec.md` | `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; server README link |
| Current token persistence | One cumulative row per canonical `run_id`; awaited per-run transactional fold; no current event-ledger runtime | `design-spec.md`; `implementation-handoff.md`; `code-review-report.md` | `autobyteus-server-ts/docs/modules/token_usage.md`; architecture/module index |
| Upgrade and readiness | Same-ID bounded source shaping; atomic startup-only consolidation; critical schema versus degraded history/restore; corrected-release retry | `requirements.md`; `design-spec.md`; `api-e2e-execution-coverage-report.md` | Token module; architecture; production migration convention |
| Settings range meaning | Range selects `runCreatedAt`, fallback `firstObservedAt`; each selected run shows lifetime totals; no exact arbitrary-period history | `requirements.md`; `design-spec.md`; Chrome/API evidence | Server token module; web docs; UI prototype/matrix |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `TokenUsageLedgerStore`, `SqlTokenUsageLedgerRepository`, and append-oriented `token_usage_ledger_events` runtime | `TokenUsageRunStore` + `TokenUsageRunAccumulator` + `SqlTokenUsageRunRepository` over `token_usage_run_records` | Server token module; architecture; module index |
| Detached `TokenUsageEventPersistenceProcessor` append queue/drain | Awaited `TokenUsageRunPersistenceTransformer` and per-run transaction | Server token module; architecture |
| Summing event arrays for summaries/statistics | Direct current-record reads and exact record aggregation | Server token module; web docs |
| Usage events observed inside arbitrary date range | Runs created inside range with lifetime cumulative totals | Server token module; web docs; UI spec/matrix |
| Current runtime legacy decoding/fallback | Registered migration-only legacy interpretation plus explicit degraded/fatal disposition | Migration convention; server token module |

## Validation

- `git diff --check` — Pass.
- Stale-owner/retired-period scan across durable Markdown — Pass, no matches.
- Local Markdown link-target audit across all nine reviewed/updated documents —
  Pass.
- Evidence: `delivery-evidence/02-docs-sync-audit-dr001.log`.
- No product/test rerun was added: the remote base did not advance or integrate
  any commit, and delivery changed documentation/artifacts only. The executable
  basis remains `API-REV-003` and `CRR-008`.

## Delivery Continuation

- Result: `Blocked` in DR-002; DR-001 remains the historical prior-base Pass.
- Next delivery action: `/implementation_engineer` resolves and checks the
  latest-base source conflict. Delivery then revalidates docs against the
  integrated state, reads the current Electron packaging README, and builds the
  requested local verification artifact before asking for user verification.
- Notes: The known Nuxt typecheck package-export incompatibility remains a
  transparent toolchain blocker, not a product/docs failure. Production Nuxt
  build, components, server build, current API, Chrome, scale, lifecycle, and
  migration checks passed upstream.
