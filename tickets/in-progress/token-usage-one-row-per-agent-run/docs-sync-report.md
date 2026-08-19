# Docs Sync Report

## Current Result

- Delivery revision: `DR-006`
- Result: `Pass — integrated durable docs are synchronized`
- Ticket: `token-usage-one-row-per-agent-run`
- Validated chain: `SR-007` / `ARCH-REV-007` / `IR-007` / `CRR-011`
  source Pass / `API-REV-005` Pass at `97.4%` / `CRR-012` durable-test
  Pass.
- Reviewed-state checkpoint:
  `bb31e469270ee2b032d19c6dbf8a2c9bea91a18a` (local only; not pushed and
  not repository finalization).
- Latest tracked base:
  `origin/personal@1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`.
- Integration result: no merge was required. The fetched base is the checkpoint
  branch's merge base, with divergence `0 behind / 4 ahead`.
- Post-integration server rerun: not duplicated because no new base commit was
  integrated after `API-REV-005` / `CRR-012`. The new Electron build and
  package-integrity suite are the additional integrated-state executable check.
- Live ticket-scope technical verification: Pass.
- Current delivery blocker: `delivery-requirement-gap.md`. Two old successful
  migration summaries remain observable as a 31 MB current status response;
  upstream must clarify their retention/bounding contract before docs can make
  a truthful final claim.
- Explicit user acceptance: not received. Documentation Pass is not user
  acceptance or repository-finalization authorization.

## Why Docs Were Updated

The corrected migration proved a reusable database-adapter rule that did not
exist in the original durable convention: database meaning, SQLite storage
class, ORM result representation, and TypeScript annotation are distinct
contracts. A nullable computed SQLite expression can cause Prisma to represent
safe integers as decimal strings when an ordered result begins with `NULL`
rows. This belongs in canonical migration guidance rather than only in ticket
or incident evidence.

The one-row-per-AgentRun Token Usage runtime and user-facing contracts promoted
in `DR-001` remain accurate. `DR-005` adds the approved adapter/transport
convention and README entry; it does not change current Token Usage semantics.

## Long-Lived Docs Reviewed And Disposition

| Doc Path | DR-005 Result | Disposition |
| --- | --- | --- |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | `Updated` | Added the database adapter/transport representation contract, strict exact decoding rules, real-adapter nullable-result regression guidance, and checklist items. |
| `autobyteus-server-ts/README.md` | `Updated` | Added concise operator/maintainer guidance and retained the canonical convention link. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | `No additional edit` | Existing one-row model, consolidation, readiness, and retry contract remains accurate; adapter mechanics belong in the canonical migration convention. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | `No additional edit` | Existing startup, persistence, and migration ownership remains accurate. |
| `autobyteus-server-ts/docs/modules/README.md` | `No additional edit` | Existing current module owner and canonical convention link remain accurate. |
| `autobyteus-web/docs/agent_execution_architecture.md` | `No additional edit` | Current-record hydration and lifetime-total contract is unchanged. |
| `autobyteus-web/docs/settings.md` | `No additional edit` | Token Statistics behavior is unchanged. |
| `ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md` | `No additional edit` | UI contract is unchanged. |
| `ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md` | `No additional edit` | Behavior matrix is unchanged. |

## Durable Knowledge Promoted

The canonical convention now requires migrations that consume derived database
scalars to:

1. reproduce behavior through the real production ORM/driver and a disposable
   database;
2. choose a deterministic SQL-boundary representation when adapter inference is
   unstable and preserve source type where needed;
3. validate the complete transport grammar;
4. parse integers exactly through `BigInt` or an equivalent mechanism;
5. enforce sign, range, and domain constraints before narrowing;
6. keep adapter-specific decoding migration-only; and
7. preserve exposing result-set conditions, including leading `NULL` rows
   followed by valid values in the same ordered batch.

The guidance explicitly rejects broad `Number(...)`, `parseInt(...)`, truthy
coercion, permissive numeric regexes, unchecked casts, and automated coverage
against a user's live database.

## Prior Durable Sync Retained

The `DR-001` durable baseline remains authoritative for:

- one cumulative current record per canonical AgentRun;
- awaited per-run transactional folding and current-only repositories;
- startup-only legacy consolidation with truthful readiness classification;
- run-creation-time selection with lifetime Token Statistics totals; and
- removal of append-ledger runtime and observed-period semantics.

## Validation

- `git diff --check` over the DR-005 README and canonical convention edits:
  Pass.
- Local Markdown-link audit over both edited files: Pass.
- Promoted-convention marker audit: Pass.
- Initial evidence:
  `delivery-evidence/15-dr005-base-docs-preflight.log`.
- Final base and handoff audit:
  `delivery-evidence/18-final-base-docs-handoff-audit-dr005.log`.
- Original nine-document sync evidence remains
  `delivery-evidence/02-docs-sync-audit-dr001.log`; integrated revalidation
  remains `delivery-evidence/08-final-base-and-docs-audit-dr003.log`.

## Delivery Continuation

- Docs-sync result: `Pass`.
- New Electron build and package integrity: `Pass`; see
  `delivery-evidence/16-electron-build-macos-arm64-dr005.log` and
  `delivery-evidence/17-electron-package-integrity-dr005.log`.
- Technical live gate: Pass for consolidation and current statistics.
- Remaining gates: requirement/design classification of the reachable old
  migration-status payload and explicit informed user acceptance.
- Hold: no push, ticket archival, target merge/push, tag, release, deployment,
  or worktree cleanup until that explicit signal and a final latest-base
  refresh.
- Known non-product limitations remain unchanged: Nuxt `vue-tsc`/TypeScript
  package-export incompatibility and opt-in external-provider exclusions.
