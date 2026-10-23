# Design Spec: seal-migrations-per-folder

## Solution And Approval Basis

- Current solution revision ID: SR-002 (ARCH-REV-001 AR-001..AR-005)
- Approved requirements: SR-001 (the user's direction and his sharing decision DEC-001; the rest within the direction, with the user informed)
- Supplements: none
- Design status: `Ready`
- Investigation notes: `tickets/in-progress/seal-migrations-per-folder/investigation-notes.md` (S-01..S-12), plus autobyteus-204's notes (F-01, A-05, O-1)
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (the 2026-10-23 version), `references/design-examples.md` (cases from our own reviews), the design-spec template (the 2026-10-23 version), `DESIGN.md` (rules 7, 8, 9), the data migration guideline, `TESTING.md`
- Conflicts or discrepancies: guideline §4 currently says "A migration may import current code only to validate its output". This design withdraws that allowance (REQ-003) and updates §4.

## Current-State Read

- **The migration contract:** `AppDataMigrationDefinition` has `id`, `displayName`, `description`, `requiredOnStartup`, `executionPolicy`, `prerequisiteMigrationIds` and `execute()` (`app-data-migrations/domain/app-data-migration-types.ts:38-46`).
- **The runner** (`app-data-migration-runner.ts:37-263`) offers `listStatuses()` (:46), `runPending()` (:56) and `runMigration(id)` (:81). It records statuses through `repositories/app-data-migration-record-repository.ts`, which uses `config/prisma-client-factory.ts` (:2).
- **The registry** (`app-data-migration-registry.ts`) builds 31 definitions and passes them paths from `appConfigProvider` (F-01).
- **Migrations to production:** 74 modules imported (S-07), including deep service graphs, plus `autobyteus-ts` (S-08).
- **Production to migrations** (A-05, S-09, S-10, S-11, S-12):
  - `server-runtime.ts:192-241`: G-1 at :230-241, G-2 at :201-213, and the TeamRun V2 warning at :214-229;
  - the same in `standalone-application-host/start-standalone-application-host.ts:22-24,147-180`;
  - `token-usage/providers/token-usage-migration-readiness.ts:1-85`, used by 10 files;
  - `api/graphql/types/app-data-migrations.ts:8,116-120`;
  - `context-files/services/context-file-record-locators.ts:7,43`.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - about 130 migration files reorganized;
  - about 74 production dependencies replaced by frozen copies or rewritten inside the migration area;
  - about 75 test files moved;
  - the runner contract extended (capabilities);
  - about 15 production files changed (both startup hosts, token-usage readiness and its 10 users, GraphQL, context-file locators);
  - `autobyteus-ts` (folder moved out);
  - the guideline.
- Architectural risk: `High`
- Risk rationale:
  - released migrations that run on users' data are rewritten internally;
  - a startup gate changes (G-1);
  - shared readiness used by 10 runtime files changes shape;
  - a cross-package move.
- Escalation trigger: return to the Solution Designer if
  - any migration's output on a released input would change (other than REQ-008);
  - a migration needs production behavior that cannot be frozen without copying a deep service graph;
  - G-2's protection cannot be expressed as a capability.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision |
| --- | --- | --- | --- |
| Transitive closure | S-01 | Copying whole dependency trees is infeasible | D-2: freeze only what each migration uses |
| Direct dependencies | S-02, S-07 | 46 of 74 are small; a handful are deep | D-2, D-3 |
| Strict versus shared | S-03, S-04, S-06 | about 114,000 versus about 12,000 lines; the user chose sharing | D-1 |
| Gates | S-11, S-12 | G-1 locks out the whole server; G-2 protects data integrity | D-4, D-5 |
| Library migration code | S-08 | Only a migration uses it | D-6 |
| Legacy constant | S-10 | Current-format pattern stored in `legacy/` | D-7 |
| GraphQL retry special case | S-09 | Rebuilds readiness after one migration's retry | D-8 |

## Intended Change

Put all migration code into a sealed migration area: one folder per migration, plus one shared frozen layer that only migrations use. Cut every import between the area and production code in both directions, enforced by a test. Replace production checks of named migration statuses with capability readiness. Repair the 205 migration. Move the library's migration code. Write the rule into the guideline.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-004. Areas:
  - `autobyteus-server-ts/src/app-data-migrations/` (structure, frozen layer, contract, registry);
  - startup in `server-runtime.ts` and `start-standalone-application-host.ts`;
  - `token-usage/providers/token-usage-migration-readiness.ts` and its 10 users;
  - `api/graphql/types/app-data-migrations.ts`;
  - `context-files/services/context-file-record-locators.ts`;
  - the custom-provider capability consumers (D-5);
  - `autobyteus-ts/src/memory/migration/` and its tests;
  - migration tests (moved);
  - a new architecture test and the frozen-file report;
  - `autobyteus-server-ts/docs/design/data_migration_guideline.md`;
  - module docs that link moved files.
- **Deliberately left alone:**
  - what migrations convert (except REQ-008);
  - the ledger table;
  - the Settings migration page (it keeps listing statuses and retrying);
  - Prisma SQL migrations;
  - any retirement (autobyteus-204).
- **Derived consumers** (Principle 11): the runner's status snapshots feed GraphQL `getAppDataMigrations`, the web `appDataMigrationsStore` and `ServerMigrationsManager.vue`. Their shape is unchanged. Capability readiness is a new runner query, consumed only by the readiness owner (AR-004). The token-usage error codes `TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED` and `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED` are **kept** because the web matches them (`autobyteus-web/components/token-usage/TokenUsageAnalyticsView.vue:60`, `TokenUsageRunDetailsView.vue:105`, and their specs; AR-003). The new code `CUSTOM_PROVIDERS_MIGRATION_PENDING` reaches the Settings provider page and model availability. `RootRunPackageReadinessIndex` is rebuilt after `runPending()` (`server-runtime.ts:214`) and, newly, after any manual retry (D-8).
- **Follow-ups:** none yet.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001..005, REQ-007 / AC-001, AC-002 | Startup; manual retry | Same results; sealed code | DS-001, DS-003 |
| BEH-002 | REQ-006 / AC-003 | Token-usage history read; existing-run restore | Capability asked instead of a migration id | DS-002 |
| BEH-003 | REQ-006 / AC-004 | Startup with the custom-provider migration pending | Server starts; custom providers unavailable | DS-001, DS-002 |
| BEH-004 | REQ-008 / AC-005 | First start of the next release | Compactor runs survive | DS-001 |
| BEH-005 | REQ-010 / AC-007 | — | Guideline | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor`.
- Current design issue found: `Yes`.
  - Two-way coupling between migration code and production code (S-07, A-05).
  - A whole-server startup block tied to one migration (S-11).
  - Production readiness keyed by a migration id (S-12).
- Structural triggers:
  - **Authoritative boundary** (Principle 3): production code reads migration internals.
  - **Several kinds** (Principle 1): two startup hosts carry the same gates; both are traced and both changed.
  - **Behavior by absence** (Principle 13): today "token usage is degraded" follows from "the status is not SUCCEEDED"; the new capability answer is an explicit result.
  - **Derived data** (Principle 11): consumers of the status snapshot are listed above.
  - **Legacy cleanup** (Principle 8).
- Root cause: `Boundary Or Ownership Issue`.
- Refactor needed now: `Yes`.
- Deferrals: retirement (autobyteus-204).

## Terminology

- **Migration area:** `autobyteus-server-ts/src/app-data-migrations/`.
- **Migration folder:** `migrations/<name>/`, one per registered migration.
- **Frozen layer:** `frozen/` inside the migration area. Shared code that only migrations import: frozen copies of production and library code, and old data shapes.
- **Runner contract:** `domain/` and `repositories/`, the runner and the registry. This is the only part production code may import.
- **Capability:** a named piece of production functionality that a pending migration holds back.

## Legacy Removal Policy (Mandatory)

- Removed:
  - every production import of migration code;
  - the legacy constant import;
  - the GraphQL id special case;
  - the TeamRun V2 warning;
  - the migration-id readiness state in token usage;
  - `autobyteus-ts/src/memory/migration/` (moved, not copied);
  - 197's D-8 bridge `asSourceIndependentIndexInput`, made unnecessary because the four migrations it served use frozen indexes.
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Decision: `Not Affected`, with one exception. No stored data changes shape; migrations convert exactly as before. The exception is REQ-008, a narrowing of 205's deletion: it deletes less, never more. The ledger rows are unchanged.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary (startup, server host) | `server-runtime.ts` startup | Pending migrations done; capabilities answered | `AppDataMigrationRunner` | Main path |
| DS-001b | Primary (startup, standalone application host) | `start-standalone-application-host.ts` | Same | `AppDataMigrationRunner` | The second host traced separately (Principle 1) |
| DS-002 | Primary (gated feature) | A token-usage history read or an existing-run restore; custom-provider listing | Allowed, or refused with the capability error | Capability owners (token-usage readiness; custom-provider capability) | G-1, G-2 |
| DS-003 | Primary (manual retry) | Settings → Retry | Status updated; readiness index rebuilt | GraphQL resolver → runner | S-09 |
| DS-004 | Bounded local (build) | `vitest` architecture test | Pass or fail on imports; the unused-frozen-files report | Architecture test | Enforcement |

## Primary Execution Spine(s)

- DS-001 (call order): `server-runtime: initializePrisma -> assertTokenUsageCurrentSchema -> markCapabilitiesPending() -> vault -> runner.runPending() -> applyCapabilityReadiness(runner.capabilityReadiness()) -> RootRunPackageReadinessIndex.rebuild() -> serve`
- DS-001b: the same calls in `start-standalone-application-host.ts`. Both hosts call the same two functions of the one owner; no host-specific rule.
- DS-002: `history read / restore -> TokenUsageCapability.assertHistoricalReadReady() / assertExistingRunRestoreReady()` (the state set by the readiness owner) `-> proceed or the unchanged codes TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED / TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED` (AR-003), and `any custom-provider entry form -> CustomLlmProviderStore (gate) -> proceed or CUSTOM_PROVIDERS_MIGRATION_PENDING`, with each form's outcome as in the Ownership Map.
- DS-003: `GraphQL runAppDataMigration -> runner.runMigration(id) -> if not FAILED: RootRunPackageReadinessIndex.rebuild() -> applyCapabilityReadiness(runner.capabilityReadiness()) -> return status`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The runner runs pending migrations as today. It then answers `capabilityReadiness()`: for each capability name declared by any registered migration, ready if and only if every migration declaring it has a terminal success status (`SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`). A capability no registered migration declares is ready. The host passes the answers to the two capability owners. The rule is explicit; production never sees a migration id | Runner |
| DS-002 | Token usage refuses history reads and restore exactly as today while its capability is not ready (G-2 unchanged). Custom providers report unavailable while theirs is not ready; the server keeps running (G-1 narrowed) | Capability owners |
| DS-003 | A manual retry rebuilds the readiness index for every migration, not one named id, and refreshes the capabilities, so retrying the token-usage or custom-provider migration takes effect without a restart | GraphQL resolver |
| DS-004 | The test reads every `.ts` under the migration area and under production `src/`, resolves relative and package imports, and fails on: production → `migrations/` or `frozen/`; migration area → production `src/` outside the allowed list; migration area → `autobyteus-ts`. It also lists `frozen/` files that no migration folder reaches | Architecture test |

## Spine Actors / Main-Line Nodes

Startup hosts (2); `AppDataMigrationRunner`; registry; migration definitions; capability owners (`TokenUsageCapability`, `CustomProviderCapability`); GraphQL resolver; architecture test.

## Ownership Map

- **Runner** owns: running, statuses, and the capability answer (`capabilityReadiness(): Readonly<Record<AppDataCapability, boolean>>`).
- **Contract** (`domain/app-data-migration-types.ts`) owns:
  - `AppDataCapability = "token_usage_history" | "custom_llm_providers"`;
  - `AppDataMigrationDefinition.holdsBackCapabilities?: readonly AppDataCapability[]`.
- **Each migration** declares its own capabilities:
  - `20260819_token_usage_run_records_v1` → `token_usage_history`;
  - `20260803_custom_provider_readable_identity` → `custom_llm_providers`.
- **`TokenUsageCapability`** (renamed from `token-usage-migration-readiness.ts`) owns token-usage readiness: `READY` / `HISTORY_MIGRATION_PENDING` / `CRITICAL_CURRENT_SCHEMA_FAILURE`.
- **`CustomLlmProviderStore`** is the single gate for custom providers (AR-002). While `custom_llm_providers` is pending, every read (`listProviders`, `getProviderById`) and every write throws `CustomLlmProviderStoreError('CUSTOM_PROVIDERS_MIGRATION_PENDING')`. No caller checks the capability itself.
- **Pending outcome for each entry form** (AR-002):

  | Entry form (file:line) | Outcome while pending |
  | --- | --- |
  | Model catalog listing (`model-catalog-service.ts:88`, already `.catch(() => [])`) | No custom models are listed; built-in providers list normally |
  | Run start or model resolution with a custom model (`model-catalog-service.ts:201,334`; `model-availability-service.ts:73`) | The model is reported unavailable with reason `CUSTOM_PROVIDERS_MIGRATION_PENDING`; that run is not started; other runs are unaffected |
  | Runtime sync (`custom-llm-provider-runtime-sync-service.ts:27`) | Skipped, with one log line naming the code |
  | Settings CRUD (`llm-provider-service.ts:149-192, 297, 344, 378`) | Refused with the code; Settings shows it |
  | Token-usage display lookups (catching callers) | Fall back to the raw model id, as on any lookup failure |
- **One owner applies capability readiness** (AR-004): `startup/app-data-capability-readiness.ts` exports `markCapabilitiesPending()` and `applyCapabilityReadiness(readiness)`, which set `TokenUsageCapability` and `CustomLlmProviderStore`'s gate together. Both hosts call `markCapabilitiesPending()` right after the token-usage schema check (today's pending state, `server-runtime.ts:161-168`) and `applyCapabilityReadiness(runner.capabilityReadiness())` after `runPending()`. The retry resolver calls `applyCapabilityReadiness` after a retry. Before the runner answers, both capabilities are pending; no default is left implicit.
- **The registry** is the only place that wires migrations: it passes paths from `appConfigProvider` into constructors (production → migration-area wiring through the runner).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Behind it | Must not own |
| --- | --- | --- |
| `app-data-migration-registry.ts` | Migration definitions | Any migration logic |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| Production imports of `migrations/*` ids (`server-runtime.ts:11-12`, `start-standalone-application-host.ts:23-24`, `api/graphql/types/app-data-migrations.ts:8`) | Boundary | Capability readiness; the generic retry | In This Change |
| `TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID` and the `CURRENT_SCHEMA_DEGRADED` (migration-status) state | Behavior keyed by a migration id | `TokenUsageCapability` with `HISTORY_MIGRATION_PENDING` from the capability | In This Change |
| G-1 `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED` (`server-runtime.ts:230-241`) | Whole-server lockout | `CustomProviderCapability` | In This Change |
| TeamRun V2 warning (`server-runtime.ts:214-229`) and the same in the standalone host | Reads a migration id; logs only | — (the runner's own FAILED log at `server-runtime.ts:193-199` stays) | In This Change |
| `legacy/` folder name and the shared `predecessor-task-delegation-records.ts` | Restructured | `frozen/` | In This Change |
| D-8 bridge `asSourceIndependentIndexInput` | Its migrations use frozen indexes | — | In This Change |
| `autobyteus-ts/src/memory/migration/**` and its tests | Only a migration uses it | `frozen/autobyteus-ts/memory/migration/` (moved) | In This Change |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

DS-004 (the test).

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Frozen layer | Migrations | Shared frozen code |
| Unused-frozen-files report | Retirement | Lists files no migration reaches (part of DS-004) |

## Ownership Boundaries

- Migration area ↔ production: the only crossing is the runner contract, used by production (runner, registry, domain types) and by migrations (domain types, the database client).
- Production may import, from the migration area, only the **contract**: `app-data-migration-runner.ts`, `app-data-migration-registry.ts`, `domain/**`, `repositories/**`.
- **Split rule (AR-001):**
  - `migrations/**` and `frozen/**` may import only `domain/**` (contract types and ports), `config/prisma-client-factory.ts` (DEC-005), node APIs and third-party libraries;
  - the **contract** (runner, registry, repositories) may also import production config and services, because it is the wiring point.
- **Registry wiring, in call order** (one owner, the registry):
  1. the registry reads paths from `appConfigProvider`;
  2. it builds each migration with explicit constructor arguments: paths; for `20260803_custom_provider_readable_identity`, a `SecretRemovalOwner` port (the type moves into `domain/`, implemented by `getSecretVaultRuntime().requireService()` passed in by the registry, so the live vault stays the only writer) and the built-in provider names (passed **live** from `getBuiltInLlmProviderCatalog()`, exactly the input the migration reads today, so the output is unchanged);
  3. the runner calls `execute()`;
  4. the migration calls the port.
- **Constructor defaults to remove** (they read production config or services): `migrations/custom-provider-readable-id-app-data-migration.ts:140-146` (`appConfigProvider`, `getSecretVaultRuntime`, `getBuiltInLlmProviderCatalog`), `migrations/custom-provider-v1-app-data-migration.ts`, `migrations/custom-provider-migration-name-snapshot.ts`, `migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts` (all `appConfigProvider`), and any further one the architecture test reports.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden |
| --- | --- | --- | --- |
| Runner contract | Migration folders, frozen layer | Startup hosts, GraphQL, capability owners | Production importing a migration id or a frozen file |

## Dependency Rules

As in Ownership Boundaries, enforced by DS-004. Third-party libraries (zod, Prisma generated types, node APIs) are allowed in the migration area. `autobyteus-ts` is not (S-08): what migrations use from it is frozen into `frozen/autobyteus-ts/`.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `AppDataMigrationDefinition.holdsBackCapabilities?` | Add |
| `AppDataMigrationRunner.capabilityReadiness()` | Add |
| `TokenUsageCapability` (renamed module) | States renamed and keyed by capability |
| `CustomProviderCapability.assertReady()` | Add; error code `CUSTOM_PROVIDERS_MIGRATION_PENDING` |
| GraphQL `runAppDataMigration` | Generic post-retry rebuild and capability refresh |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Risk |
| --- | --- | --- | --- |
| `capabilityReadiness()` | Yes | Capability names (closed union) | Low |

## Main Domain Subject Naming Check

| Subject | Name | OK |
| --- | --- | --- |
| Shared migrations-only layer | `frozen/` | Yes; inside it, frozen copies keep their source path (`frozen/server/<path>`, `frozen/autobyteus-ts/<path>`) and the existing old shapes keep their period names (`released-*-before-*`, DESIGN rule 8) |
| Migration folders | the existing folder names; single-file migrations get a folder of the same name | Yes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Status queries | Runner `listStatuses` | Reuse inside `capabilityReadiness` |
| Architecture tests | `tests/architecture/application-framework-boundaries.test.ts` (pattern) | Add `app-data-migration-boundaries.test.ts` in the same style |

## Subsystem / Capability-Area Allocation

Migration area (structure, frozen layer, contract, registry); token-usage (capability); llm-management (custom-provider capability); startup hosts; GraphQL; `autobyteus-ts` (removal); tests; docs.

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

| Repeated | Shared file | Owner | Must not become |
| --- | --- | --- | --- |
| Frozen copies used by several migrations | `frozen/` | Migration area | Imported by production |

## Shared Structure / Data Model Tightness Check

| Structure | Action |
| --- | --- |
| Token-usage readiness state | `CURRENT_SCHEMA_DEGRADED{migrationStatus, logPath}` becomes the internal state `HISTORY_MIGRATION_PENDING` (no migration id or log path in production; the Settings page shows the migration's log). The error codes users see are unchanged (AR-003) |

## Final File Responsibility Mapping

| File or folder | Change | Concern |
| --- | --- | --- |
| `src/app-data-migrations/migrations/<name>/` (31) | Move or Modify | Each migration's own code; single files become folders; imports repointed to `frozen/` |
| `src/app-data-migrations/frozen/server/<original path>` | Add | Frozen copies of production modules **limited to the members migrations use** (S-02, S-07). For the deep ones (catalog services, definition providers, validators, stores) the frozen code reproduces only the read and write behavior the migration exercises, not the service |
| `src/app-data-migrations/frozen/autobyteus-ts/<path>` | Add | Frozen copies of the library members used (S-08), plus the moved `memory/migration/` |
| `src/app-data-migrations/frozen/released-*` | Move | Today's `legacy/` contents |
| `src/app-data-migrations/domain/app-data-migration-types.ts` | Modify | `AppDataCapability`, `holdsBackCapabilities` |
| `src/app-data-migrations/app-data-migration-runner.ts` | Modify | `capabilityReadiness()` |
| `src/app-data-migrations/app-data-migration-registry.ts` | Modify | Imports from the folders; passes paths |
| `src/server-runtime.ts`, `src/standalone-application-host/start-standalone-application-host.ts` | Modify | DS-001 / DS-001b |
| `src/token-usage/providers/token-usage-capability.ts` (rename) and its 10 users | Modify | DS-002 |
| `src/startup/app-data-capability-readiness.ts` | Add | The one owner (AR-004) |
| `src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` | Modify | The single custom-provider gate (AR-002) |
| `model-catalog-service.ts`, `model-availability-service.ts`, `custom-llm-provider-runtime-sync-service.ts`, `llm-provider-service.ts` | Modify only where needed | Map the gate's code to each form's outcome (table above) |
| `src/api/graphql/types/app-data-migrations.ts` | Modify | DS-003 |
| `src/context-files/services/context-file-record-locators.ts` and the current message-log owner (`run-history/store/task-agent-message-logs.ts` or the append-only log store) | Modify | The current pattern is owned by the message-log owner |
| `migrations/remove-skill-improvement-data/` | Modify | REQ-008, **a same-ID repair** of `20261020_remove_skill_improvement_data` (guideline §7: it fixes pending or failed installs; terminal installs skip it). M1 identifies helper runs only by the improver agent id, the records' `improverRunId`/`evolverRunId` and the improver session files, no longer by `server_helper`. **M4 is guarded like M5** (AR-005): a session folder is deleted only when every run it names is fully removed (its M2 and M3 succeeded) or absent; an unreadable session file is preserved and reported `PRESERVED_UNREADABLE`. So a session-only helper run whose M3 failed is found again on the next start |
| `tests/app-data-migrations/<name>/` | Move | Each migration's tests (REQ-011); the e2e startup suites stay in `tests/e2e/app-data-migrations/`, named after the migration |
| `tests/architecture/app-data-migration-boundaries.test.ts` | Add | DS-004, with a negative case |
| `autobyteus-ts/src/memory/migration/**` and its tests | Remove (moved) | REQ-009 |
| `docs/design/data_migration_guideline.md` | Modify | REQ-010 |

## Applied Patterns (If Any)

Registry (existing).

## Target Subsystem / Folder / File Mapping

```
src/app-data-migrations/
  app-data-migration-runner.ts      # contract (production may import)
  app-data-migration-registry.ts    # contract (production may import)
  domain/  repositories/            # contract
  migrations/<one folder each>/     # migrations only
  frozen/                           # migrations only, shared
    server/<path>   autobyteus-ts/<path>   released-*/
```

## Folder Boundary Check

| Folder | Clear | Note |
| --- | --- | --- |
| `migrations/`, `frozen/` | Yes | Enforced by DS-004 |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| A migration needs an address helper | `import { parseAgentTeamAddress } from "../../frozen/server/agent-collaboration/domain/agent-team-address.js"` | `from "../../../agent-collaboration/domain/agent-team-address.js"` |
| A migration needs to list runs | A frozen reader of the index file it reads (just the fields it uses) | Importing `AgentRunHistoryCatalogService` (980 files) |
| Production checks token usage | `TokenUsageCapability.assertHistoricalReadReady()` set from `runner.capabilityReadiness().token_usage_history` | `statuses.find(s => s.migrationId === "20260819_…")` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the allowance "a migration may import current code to validate output" | Rejected (REQ-003); validation inside a migration uses frozen validators |
| Strict per-folder copies | Rejected by the user (DEC-001) |

## Derived Layering (If Useful)

N/A.

## Decisions (design)

- **D-1:** one shared frozen layer inside the migration area (the user).
- **D-2:** freeze only the members used; for deep services, reproduce only the exercised behavior. The existing tests prove the output is unchanged.
- **D-3:** the database client is the one allowed production import (DEC-005).
- **D-4:** capability readiness replaces migration-id checks, with an explicit rule (Principle 13).
- **D-5:** G-1 is narrowed to the custom-provider capability.
- **D-6:** the library's migration code is moved, not copied.
- **D-7:** the current message-log pattern moves to its owner.
- **D-8:** a manual retry rebuilds readiness and refreshes the capabilities, generically.

## Change / Refactor Sequence

1. **Contract and enforcement first:** add `AppDataCapability`, `holdsBackCapabilities` and `capabilityReadiness()`, and the architecture test with an allow-list that initially records today's violations as known exceptions. Each later step must shrink the list and never grow it; it is empty at the end.
2. **Production side:**
   - capability owners;
   - both hosts;
   - GraphQL;
   - the context-file pattern;
   - G-1 narrowing, with tests AC-003 and AC-004.
3. **Migration side, one migration at a time, newest first:** move it into its folder, repoint its imports to `frozen/` (adding frozen copies as needed), move its tests, run them unchanged.
   - The 205 repair comes with its folder (REQ-008 tests).
   - The deep ones (S-07) are last, each with a frozen reader or writer covering only what it exercises.
4. **Library:** move `autobyteus-ts/src/memory/migration/` into `frozen/autobyteus-ts/` and delete it from the library, building the library.
5. **Docs:** the guideline (REQ-010), and module docs whose links moved.
6. **Final:**
   - the architecture test's exception list is empty;
   - the unused-frozen-files report is empty;
   - all suites pass (migration unit, integration and startup e2e; server unit and integration; the library).

## Key Tradeoffs

- **Shared frozen layer versus strict copies:** a tenth of the code; retirement is one extra step, listed by the test.
- **Freezing members versus whole modules:** smaller and sealed, but a frozen reproduction of a deep service must match the behavior the migration used. The existing tests are the proof, and any change there is an escalation.

## Risks

- **Rewriting the deep dependencies of released migrations** (S-07): behavior drift. Mitigation: newest-first sequencing, unchanged test assertions per migration, and the escalation trigger.
- **G-1 narrowing:** custom-provider callers must handle "unavailable" instead of a startup failure (AC-004).
- **The size of `frozen/`:** an estimated 7,000–12,000 lines. The estimate is unverified until step 3.

## Guidance For Implementation

- Never run anything on the user's data (TESTING.md). The fixtures are the existing migration fixtures, plus REQ-008's compactor fixture and the pending-migration fixtures for AC-003 and AC-004.
- Keep each migration's test assertions byte-identical. If a frozen copy forces an assertion change, stop and escalate.
- **205 fixtures** (AR-005):
  1. a v1.4.92-beta.5-era compactor run carrying `server_helper` survives;
  2. an M3 failure for a session-only helper run: the session file stays, and the next start deletes both;
  3. an unreadable session file is preserved.
- **AC-004 fixtures** (AR-002): with `custom_llm_providers` pending, the server starts; listing shows only built-in models; a run start with a custom model is refused with `CUSTOM_PROVIDERS_MIGRATION_PENDING` while a built-in run starts; a Settings CRUD attempt is refused with the code.
- **G-1 retry safety** (confirmed by the reviewer): while pending, the store's current parser refuses writes to an unconverted file (`custom-llm-provider-store.ts:80-116`, and now the gate). After the migration has published the V3 file, a retry skips (`custom-provider-readable-id-app-data-migration.ts:179-186`). So narrowing G-1 cannot let production write a half-converted file.
- Record each file freeze in the implementation handoff: source path, members kept, and the commit it was frozen from.
