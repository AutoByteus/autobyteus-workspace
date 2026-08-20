# Docs Sync Report

## Current Result

- Delivery revision: `DR-009`
- Result: `Pass — integrated durable documentation matches the current
  restart-recovery scope`
- Ticket: `token-usage-one-row-per-agent-run`
- Validated chain: `SR-012` / `ARCH-REV-012` / `IR-011` / `CRR-019` source
  Pass / `API-REV-008` Pass at `97.9%` / `CRR-020` durable-test Pass.
- Reviewed-state checkpoint:
  `d4ec609132cf075d513c9754269e76ff267a43d4` (local only; not pushed and
  not repository finalization).
- Latest tracked base:
  `origin/personal@1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`.
- Integration result: no merge required. Repeated pre/post-build fetches kept
  the base unchanged and the branch at `0 behind / 6 ahead`.
- Post-integration server rerun: not duplicated because no base commit was
  integrated after `API-REV-008` / `CRR-020`. The fresh Electron build and
  nonlaunch integrity suite supply the delivery-stage executable package check.
- Explicit user verification: `Pass` under `DR-009`.

## Why Docs Were Updated

The current product contract separates automatic startup scheduling from
public recovery capability. A migration status now carries one server-owned,
nonpersisted recovery action:

- `MANUAL_RETRY` when the public manual entrypoint can execute now;
- `RESTART_TO_RETRY` when ordinary later startup is the supported executor; or
- `NONE` when no truthful public recovery action exists.

The API/client/UI must carry that action rather than reconstructing policy.
Settings may show localized restart guidance and a disabled Retry control for
`RESTART_TO_RETRY`, but it must dispatch no manual mutation. `canRetry` is true
only for `MANUAL_RETRY`.

The docs also need a clean boundary around the user-directed SR-010 rescope:
the prior audit summary projection/compactor, historical-log rewrite, retention,
and filesystem-recovery expansion is withdrawn. The two large historical
summaries and reachable migration-status response remain an explicitly
accepted residual for separate future scope, not behavior to document as fixed.

## Long-Lived Docs Reviewed And Disposition

| Doc Path | DR-008 Result | Disposition |
| --- | --- | --- |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | `Updated` | Added the closed recovery-action contract, exact startup-only classification boundary, derived `canRetry`, API/UI ownership, and explicit prohibition on inferring unrelated audit/log/retention/filesystem scope. |
| `autobyteus-server-ts/README.md` | `Updated` | Added concise runner/API/Settings guidance and the same no-audit-expansion boundary. |
| `autobyteus-web/docs/settings.md` | `Updated` | Added user-surface behavior for `MANUAL_RETRY`, `RESTART_TO_RETRY`, and `NONE`, exact disabled/no-dispatch restart-only posture, and English/zh-CN localization ownership. |
| `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | `No additional edit` | Existing startup runner/registry ownership remains accurate; the reusable policy belongs in the canonical production-data migration convention. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | `No additional edit` | One-row current storage, consolidation, readiness, and statistics behavior are unchanged. |
| Other DR-001 durable Token Usage documents | `No additional edit` | No current record model, range, pricing, or statistics UI contract changed in SR-012. |

## Durable Knowledge Promoted

The durable docs now require:

1. runner-owned current recovery classification rather than UI inference;
2. `canRetry` derived only from `MANUAL_RETRY`;
3. `RESTART_TO_RETRY` only when ordinary `runPending()` can actually select the
   required startup-only work in the relevant current state;
4. direct manual startup-only invocation to remain rejected;
5. non-null API/client transport of the server action;
6. localized English/zh-CN restart guidance with disabled/no-dispatch Retry;
   and
7. separate requirements before adding historical-summary projection,
   compaction, retention, log rewriting, or filesystem recovery.

## Prior Durable Sync Retained

- DR-001: one cumulative current Token Usage record per AgentRun, forward-only
  runtime, run-created range/lifetime semantics, and removal of event-ledger
  runtime ownership.
- DR-005: deterministic nullable Prisma/SQLite scalar transport, exact parsing
  and range validation, and real leading-NULL adapter-fixture guidance.
- SR-010: audit projection/compactor behavior is absent; the existing large
  historical summaries/status response are accepted residual, not silently
  described as bounded.

## Validation

- `git diff --check` over all three edited durable docs: Pass.
- Relative Markdown link audit over all three edited docs: Pass.
- Recovery marker and zh-CN ownership audit: Pass.
- Withdrawn audit claim scan: Pass; no compactor/projection or bounded-current-
  response claim was revived.
- Four withdrawn durable audit-only paths: confirmed absent.
- Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/26-dr008-latest-base-refresh.log`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/27-dr008-docs-sync-preflight.log`.

## Delivery Continuation

- Docs sync: `Pass`.
- Fresh DR-008 Electron build/integrity: `Pass`.
- Remaining gate: none. DR-009 records explicit acceptance, and the final
  latest-base refresh found no advancement.
- Continuation: archive the ticket and perform the authorized ticket-branch /
  `personal` repository finalization. No version/tag/release/deployment scope
  was requested.
- Known unchanged non-product limitations: Nuxt `vue-tsc`/TypeScript package-
  export incompatibility and opt-in external-provider exclusions.
