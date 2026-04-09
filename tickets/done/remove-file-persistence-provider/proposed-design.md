# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Removed the generic persistence-profile model, made token usage SQL-only, removed file-profile build/runtime outputs, and scoped env/bootstrap cleanup around the truthful subsystem-owned persistence model. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/remove-file-persistence-provider/investigation-notes.md`
- Requirements: `tickets/in-progress/remove-file-persistence-provider/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

The target architecture removes `PERSISTENCE_PROVIDER` as a cross-cutting contract. Persistence is decided by the owning subsystem:

- token usage persists through the SQL-backed token-usage store only,
- subsystem-native file stores remain file-backed without pretending they are profile-selected,
- startup/migration behavior follows database configuration directly,
- Android/Docker/Electron/bootstrap surfaces stop generating the obsolete profile/build contract.

## Goal / Intended Change

Simplify the project so runtime/build behavior no longer pretends to support a global `file` vs `sql` mode. Keep SQL support. Keep token usage in the database only. Remove file-profile build/runtime machinery and the misleading compatibility aliases that exist only because of the old profile design.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove obsolete `PERSISTENCE_PROVIDER` runtime selection, file token persistence, file-profile build/package outputs, and dead compatibility registries that alias profile names to file-backed subsystems.
- Gate rule: design is invalid if it keeps compatibility wrappers, dual-path behavior, or dormant `file`-profile branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Active runtime/server startup code must stop reading or deriving behavior from `PERSISTENCE_PROVIDER`. | `AC-001` | No active runtime source depends on `PERSISTENCE_PROVIDER`. | `UC-001`, `UC-003` |
| `R-002` | Token usage persistence must support database-backed storage only. | `AC-002` | File token storage removed; SQL-backed token usage still works. | `UC-002` |
| `R-003` | SQLite URL setup and migrations must follow DB config instead of file-profile selection. | `AC-003` | Startup derives SQLite URL when needed and runs the normal migration path. | `UC-001` |
| `R-004` | File-profile build/package/runtime path must be removed. | `AC-004` | No `build:file`, `build:file:package`, or `dist-file` dependency remains. | `UC-003` |
| `R-005` | Active env templates, Electron bootstrap, Docker/scripts, and docs/tests must reflect the simplified contract. | `AC-005` | No active docs/bootstrap/test surfaces advertise `PERSISTENCE_PROVIDER`. | `UC-001`, `UC-003` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | The live persistence-profile contract is already fragmented: only startup config, migration gating, and token usage honor it directly. | `src/persistence/profile.ts`, `src/config/app-config.ts`, `src/startup/migrations.ts`, `src/token-usage/providers/persistence-proxy.ts` | None blocking |
| Current Ownership Boundaries | Agent definition, team definition, and MCP config storage already use subsystem-native file providers regardless of selected profile. | `src/agent-definition/providers/agent-definition-persistence-provider.ts`, `src/agent-team-definition/providers/agent-team-definition-persistence-provider.ts`, `src/mcp-server-management/providers/persistence-provider.ts` | None |
| Current Coupling / Fragmentation Problems | Generic token-usage proxy/registry/file-provider stack keeps the obsolete profile story alive; build/package tooling still carries a file-profile branch. | `src/token-usage/providers/*`, `package.json`, `tsconfig.build.file.json`, `scripts/build-file-package.mjs`, Android scripts | Android build validation after removal |
| Existing Constraints / Compatibility Facts | SQLite URL derivation still matters; Prisma remains the DB/migration layer; Electron/bootstrap scripts currently inject `PERSISTENCE_PROVIDER`. | `src/config/app-config.ts`, Electron runtime env helpers, Docker entrypoints | None blocking |
| Relevant Files / Components | The change stays concentrated in server bootstrap, token usage, build/scripts, Electron bootstrap, tests, and docs. | Investigation notes source log | None |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | Server process entry | Configured runtime after migrations | server startup/bootstrap | Owns truthful runtime startup behavior after global persistence-profile removal |
| `DS-002` | Return-Event | Completed LLM response | token-usage rows stored/queryable in DB | token-usage store | Owns the only database-backed persistence path still in scope |
| `DS-003` | Primary End-to-End | Electron/Docker/Android bootstrap surface | standard server build/runtime env | deployment/bootstrap surfaces | Removes obsolete file-profile build/env contract |

## Primary Execution / Data-Flow Spine(s)

- `DS-001`: `CLI/Electron/Docker Script -> AppConfig -> runMigrations -> startConfiguredServer -> Fastify Runtime`
- `DS-002`: `LLM Response -> TokenUsagePersistenceProcessor -> TokenUsageStore -> SqlTokenUsageRecordRepository -> Database`
- `DS-003`: `Bootstrap Surface -> env/build script -> standard server artifact/env -> AppConfig -> Runtime Startup`

Why the span is long enough:

- `DS-001` starts at the initiating runtime surface, crosses the authoritative config boundary, includes the migration boundary, and reaches the running server.
- `DS-002` starts at the business event that produces token usage, crosses the authoritative persistence boundary, and reaches the final persisted consequence.
- `DS-003` starts at the user-facing bootstrap surface, crosses the build/env shaping boundary, and reaches the normal runtime path that consumes that configuration.

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `AppConfig` | startup config owner | Derives truthful DB/env defaults without a generic persistence profile |
| `runMigrations()` | startup DB gate | Applies the normal Prisma migration path |
| `TokenUsageStore` | authoritative token-usage persistence boundary | Persists and reads token-usage rows through SQL only |
| `SqlTokenUsageRecordRepository` | DB repository | Performs DB IO for token-usage records |
| Electron/Docker/Android bootstrap surfaces | outer bootstrap owners | Generate truthful build/runtime inputs for the server |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Startup initializes config, ensures DB connectivity/defaults are correct, runs migrations, and then boots the server without consulting a global persistence profile. | CLI/script surface, `AppConfig`, `runMigrations`, runtime server | startup/config | logging/bootstrap env helpers |
| `DS-002` | A completed LLM response with usage flows through the token-usage processor into one SQL-backed persistence boundary, which writes queryable records into the database. | response processor, token-usage store, SQL repository | token-usage subsystem | statistics aggregation |
| `DS-003` | Bootstrap scripts and Electron env builders prepare the standard server artifact and DB-related env vars directly, then hand off to the same runtime startup path used elsewhere. | script/env builder, standard build artifact, `AppConfig`, runtime startup | deployment/bootstrap surfaces | env templates, docs |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `AppConfig` | env loading, app-data path setup, SQLite URL derivation when `DB_TYPE=sqlite` | token-usage persistence selection, build-profile policy | DB config only |
| `runMigrations()` | Prisma migration execution | persistence-profile branching | migration skip logic for `file` is removed |
| `TokenUsageStore` | token-usage persistence/query operations | profile lookup, file fallback | becomes authoritative boundary for token usage |
| Electron/Docker/Android bootstrap surfaces | runtime env/build entrypoint preparation | persistence policy decisions | write only truthful DB/runtime settings |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| SQL repository | `TokenUsageStore` | DB row IO | `Yes` |
| release-manifest asset copy | build scripts | Copies messaging assets into standard build output | `Yes` |
| docs/test fixture updates | bootstrap/runtime owners | Keep active repo surfaces truthful | `Yes` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Token-usage persistence boundary | token-usage subsystem | `Extend` | Existing SQL repository and statistics flow are already correct owners; only the profile/proxy layer is wrong. | N/A |
| Runtime DB/env initialization | config/startup subsystem | `Extend` | Existing config/migration owners remain correct after removing profile logic. | N/A |
| Bootstrap env/build shaping | Electron/Docker/Android existing scripts | `Extend` | The work is cleanup of truthful defaults, not a new subsystem. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config` + `src/startup` | DB-aware startup without profile switching | `DS-001` | `AppConfig`, `runMigrations()` | `Extend` | Remove profile dependency |
| `autobyteus-server-ts/src/token-usage` | SQL-only token-usage persistence/query | `DS-002` | `TokenUsageStore` | `Extend` | Collapse proxy/registry/file-provider stack |
| Electron + Docker + Android bootstrap surfaces | truthful runtime env/build contract | `DS-003` | bootstrap owners | `Extend` | Remove file-profile outputs/settings |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - startup entrypoints -> `AppConfig` -> startup utilities
  - token-usage callers -> `TokenUsageStore` -> SQL repository
  - bootstrap surfaces -> standard build/env helpers -> runtime startup
- Authoritative public entrypoints versus internal owned sub-layers:
  - token-usage callers use `TokenUsageStore`, not a registry/proxy plus repository internals
  - startup callers use `AppConfig` and `runMigrations()`, not `persistence/profile.ts`
- Authoritative Boundary Rule per domain subject:
  - token usage has one authoritative persistence boundary: `TokenUsageStore`
- Forbidden shortcuts:
  - no caller reads `PERSISTENCE_PROVIDER`
  - no token-usage caller chooses file-vs-sql provider
  - no bootstrap surface launches `dist-file`

## Architecture Direction Decision (Mandatory)

- Chosen direction: remove the cross-cutting persistence-profile contract entirely and replace the token-usage provider stack with one authoritative SQL-backed store boundary.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: removes a fake abstraction layer and dead compatibility aliases.
  - `testability`: tests assert real owners instead of env-driven profile indirection.
  - `operability`: runtime/bootstrap docs and envs become truthful.
  - `evolution cost`: future persistence changes happen per subsystem instead of through a misleading global mode.
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`

## Change Inventory

| Change ID | Action (`Add`/`Modify`/`Rename/Move`/`Remove`) | Path | Target / Result | Purpose |
| --- | --- | --- | --- | --- |
| `C-001` | Remove | `autobyteus-server-ts/src/persistence/profile.ts` | removed | Delete obsolete global persistence-profile policy |
| `C-002` | Modify | `autobyteus-server-ts/src/config/app-config.ts` | same | Derive SQLite URL from DB config only |
| `C-003` | Modify | `autobyteus-server-ts/src/startup/migrations.ts` | same | Remove file-profile migration skip |
| `C-004` | Rename/Move | `autobyteus-server-ts/src/token-usage/providers/sql-persistence-provider.ts` | `.../token-usage-store.ts` | Make SQL-backed token store the authoritative boundary |
| `C-005` | Modify | `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | same | Depend on `TokenUsageStore` |
| `C-006` | Modify | `autobyteus-server-ts/src/agent-customization/processors/persistence/token-usage-persistence-processor.ts` | same | Depend on `TokenUsageStore` |
| `C-007` | Remove | `autobyteus-server-ts/src/token-usage/providers/file-persistence-provider.ts` | removed | Remove file token persistence |
| `C-008` | Remove | `autobyteus-server-ts/src/token-usage/providers/persistence-proxy.ts`, `.../persistence-provider-registry.ts`, `.../persistence-provider.ts` | removed | Remove obsolete generic provider stack |
| `C-009` | Remove | dead registry files under agent-definition / agent-team-definition / MCP providers | removed | Remove unused compatibility alias registries |
| `C-010` | Modify | `autobyteus-server-ts/package.json`, `autobyteus-server-ts/scripts/copy-managed-messaging-assets.mjs` | same | Remove file build/package scripts and standardize build output |
| `C-011` | Remove | `autobyteus-server-ts/tsconfig.build.file.json`, `autobyteus-server-ts/scripts/build-file-package.mjs` | removed | Remove file-profile build artifacts |
| `C-012` | Modify | Android scripts | same | Use standard build/output and stop writing `PERSISTENCE_PROVIDER` |
| `C-013` | Modify | Electron bootstrap env helpers | same | Remove `PERSISTENCE_PROVIDER` from runtime env/default `.env` |
| `C-014` | Modify | Docker/bootstrap env templates and entrypoints | same | Remove `PERSISTENCE_PROVIDER` from active env generation |
| `C-015` | Modify | tests and active docs | same | Align validation and documentation with truthful model |

## Migration / Refactor Sequence

1. Remove obsolete design-time/runtime contract artifacts (`proposed-design`, call stack, review).
2. Replace token-usage provider selection with one SQL-backed store boundary.
3. Remove startup profile logic and dead compatibility registries.
4. Remove file-profile build outputs and switch Android helpers to the standard artifact.
5. Update Electron/Docker/env templates/tests/docs.
6. Validate build and targeted runtime/test spines.
