# Docs Sync Report

## Current Result

- Delivery revision: `DR-007`
- Result: `Pass — integrated durable migration documentation synchronized`
- Ticket: `token-usage-one-row-per-agent-run`
- Validated chain: `SR-009` / `ARCH-REV-009` / `IR-008` / `IR-009` /
  `CRR-014` source Pass / `API-REV-007` Pass at `97.7%` / `CRR-016`
  durable-test Pass.
- Reviewed-state checkpoint:
  `0e2eb777d1071f00fa8016696349536ba4709616` (local only; not pushed and
  not repository finalization).
- Latest tracked base:
  `origin/personal@1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`.
- Integration result: no merge required. The fetched base is the checkpoint
  branch's merge base; divergence is `0 behind / 5 ahead`.
- Post-integration server rerun: not duplicated because no base commit was
  integrated after `API-REV-007` / `CRR-016`. The fresh Electron build and
  package-integrity suite are the additional integrated-state executable check.
- Explicit user verification: pending. Documentation Pass is not authorization
  to archive, push, finalize, release, or deploy.

## Why Docs Were Updated

Live DR-006 evidence proved that already-terminal released migration summaries
are a reachable current status/API source. A repaired same-ID definition cannot
reach an already-successful record. SR-009 therefore established a reusable
ownership rule that belongs in durable project guidance:

- current migration status/prerequisite/API/UI reads are bounded before Node
  materialization;
- a separate registered migration owns explicitly supported historical
  terminal audit shapes and preserves the complete outcome tuple while
  compacting only row-linear evidence;
- generic current repositories do not learn migration-specific legacy detail
  semantics or mutate audit records opportunistically on read; and
- startup selection, retryability, capability gating, and failure criticality
  are derived from verified caller/gate paths rather than a metadata field name.

The one-row Token Usage model, scalar-adapter convention, successful live
consolidation, and user-facing statistics semantics are unchanged.

## Long-Lived Docs Reviewed And Disposition

| Doc Path | DR-007 Result | Disposition |
| --- | --- | --- |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | `Updated` | Added terminal audit records/bounded current reads, the two-owner split, complete-outcome preservation, log ownership, and scheduling-versus-criticality rules plus review checklist items. |
| `autobyteus-server-ts/README.md` | `Updated` | Added concise current-read, separate-compactor, and scheduling/criticality guidance while retaining the canonical link. |
| `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | `No additional edit` | Existing registry-order and noncritical migration behavior remains accurate; reusable scheduling nuance belongs in the canonical convention. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | `No additional edit` | Current one-row store, consolidation, readiness, statistics, and retry semantics are unchanged; historical audit compaction is app-data infrastructure rather than token accounting. |
| Other DR-001 server/web/UI documents | `No additional edit` | No runtime Token Usage or UI-statistics behavior changed. |

## Durable Knowledge Promoted

The canonical convention now requires:

1. a bounded uniform current summary envelope at the repository/query boundary;
2. no loading of oversized historical detail arrays merely to obtain status or
   aggregate counts;
3. a separate registered migration for each supported historical terminal
   audit shape;
4. preservation of migration identity, display name, terminal status, attempts,
   timestamps, error state, log ownership, and aggregate counts;
5. deterministic replacement only of row-linear detail evidence;
6. preservation of malformed/unowned evidence with bounded warning status;
7. no opportunistic write-on-read, same-ID business rerun, or generic current
   migration-specific legacy decoder; and
8. explicit separation of startup scheduling from failure criticality and
   status-specific retry semantics.

## Prior Durable Sync Retained

- DR-001: one cumulative current record per AgentRun, forward-only current
  runtime, run-created range/lifetime totals, and removal of event-ledger
  runtime semantics.
- DR-005: deterministic typed scalar transport, exact parsing/range validation,
  and real leading-`NULL` Prisma/SQLite regression guidance.

## Validation

- `git diff --check` over both DR-007 durable documentation edits: Pass.
- Relative Markdown link audit over both edited files: Pass.
- Promoted-section marker audit: Pass.
- Base/docs preflight: `delivery-evidence/21-dr007-latest-base-refresh.log` and
  `delivery-evidence/22-dr007-docs-sync-preflight.log`.
- Build/integrity evidence: `delivery-evidence/23-*` and `24-*`.
- Final audit: `delivery-evidence/25-dr007-final-base-docs-handoff-audit.log`.

## Delivery Continuation

- Docs sync: `Pass`.
- Fresh DR-007 Electron build/integrity: `Pass`.
- Remaining gate: renewed explicit user verification of the DR-007 package and
  ordinary startup audit compaction/status behavior.
- Hold: no push, archive, target merge/push, version/tag, release, deployment,
  or ticket-worktree cleanup before that explicit signal and another final
  latest-base refresh.
- Known non-product limitations remain unchanged: Nuxt `vue-tsc`/TypeScript
  package-export incompatibility and opt-in external-provider exclusions.
