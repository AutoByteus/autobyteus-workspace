# Proposed Design Document

## Design Version

- Current Version: `v10`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined file-provider target architecture and Prisma-optional build profiles. | 1 |
| v2 | Naming/ownership hardening | Added explicit composition root and provider-factory ownership boundaries. | 2 |
| v3 | Persistence semantics hardening | Added uniqueness/index semantics and atomic file-write rules per domain. | 3 |
| v4 | Build/runtime hardening | Added explicit compile profiles to skip Prisma and removed static SQL imports from startup/runtime entrypoints. | 4 |
| v5 | Final gate cleanup | Clarified decommission list, rollout order, and review traceability mapping. | 5 |
| v6 | Pattern unification | Standardized to registry+proxy for all domains, removed per-domain factory pattern from target architecture, and added lazy provider loading strategy. | 6 |
| v7 | Deep coverage review | Added missing modeled use cases for agent-team, MCP config, and artifact persistence/runtime paths. | 7 |
| v8 | Callback flow hardening | Added explicit external-channel callback publish/idempotency runtime coverage to match UC scope. | 8 |
| v9 | Packaging dependency hardening | Added explicit file-profile packaging/runtime dependency requirements so Android/edge deployment does not require Prisma dependencies. | 11 |
| v10 | Profile regression coverage hardening | Added explicit SQL-profile regression use case to ensure profile-selection completeness. | 14 |

## Summary

Introduce a first-class file persistence profile in `autobyteus-server-ts` so the server can switch persistence behavior using configuration (`PERSISTENCE_PROVIDER=file`), compile/install/run without Prisma when needed, and use one consistent persistence resolution pattern: `registry + proxy`.

## Goals

- Support runtime persistence profile selection by configuration, with `file` as a first-class provider.
- Ensure all active persisted domains operate via file providers.
- Make Prisma optional in build/install/runtime for file-profile deployments.
- Keep one persistence resolution pattern across domains (`registry + proxy`) and avoid mixed patterns.

## Non-Goals

- No mixed mode inside one domain (for example, file reads + SQL writes).
- No restoration of removed legacy modules (`agent-conversation`, `workflow-definition`).
- No implementation in this document; design + review only.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove hard-wired SQL wrapper/default construction, direct SQL imports in composition roots, and any per-domain factory selection pattern.

## Requirements And Use Cases

- UC-001: Startup with `PERSISTENCE_PROVIDER=file` boots without Prisma migrations.
- UC-002: Prompt CRUD/read persists via file provider.
- UC-003: Agent definition + prompt mapping persists via file providers.
- UC-004: Agent team definition flows persist via file provider.
- UC-005: MCP server config + startup MCP load/register flow persists via file provider.
- UC-006: External-channel ingress and callback flows (idempotency/receipt/binding/callback-idempotency/delivery) persist via file providers.
- UC-007: Token usage persistence/statistics persists via file provider.
- UC-008: Agent artifact create/read persists via file provider.
- UC-009: `build:file` does not require Prisma generation/build artifacts.
- UC-010: All domains use the same provider resolution model (`registry + proxy`).
- UC-011: File-profile package/install/runtime path does not require Prisma dependencies.
- UC-012: SQL-profile startup and provider resolution path remains valid.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Startup always executes Prisma migration path today. | `src/app.ts:startServer`, `src/startup/migrations.ts:runMigrations` | Whether any plugin depends on migration side effects at boot. |
| Current Naming Conventions | Domains use `providers/` + `repositories/sql/`, but many wrappers are SQL-only facades. | `src/*/providers/*persistence-provider.ts`, `src/*/repositories/sql/*` | Final naming for per-domain registry/proxy files. |
| Impacted Modules / Responsibilities | Active persisted domains: agent-definition, agent-team-definition, prompt-engineering, mcp-server-management, token-usage, agent-artifacts, external-channel. | `src/agent-definition`, `src/agent-team-definition`, `src/prompt-engineering`, `src/mcp-server-management`, `src/token-usage`, `src/agent-artifacts`, `src/external-channel` | Artifact retention policy timing (same ticket vs follow-up). |
| Data / Persistence / External IO | SQL adapters import Prisma directly; token-usage already has registry+proxy seam. | `src/token-usage/providers/persistence-proxy.ts`, `src/token-usage/providers/persistence-provider-registry.ts`, `src/*/repositories/sql/*`, `src/external-channel/providers/sql-*` | Lock granularity for file stores. |
| Removed Domain Drift | `src/agent-conversation` and `src/workflow-definition` currently have no implementation files. | Empty dirs + docs markers | Whether to delete empty dirs now or later. |
| Build / Packaging Dependencies | Current package manifest keeps hard dependencies on Prisma packages. | `package.json` (`repository_prisma`, `@prisma/client`) | Choose profile-safe packaging strategy for file deployments. |

## Current State (As-Is)

- `package.json` prebuild always builds `repository_prisma`.
- `runMigrations()` runs unconditionally.
- Multiple services/providers construct `Sql*` classes directly.
- Token usage registry supports only SQL profiles.
- `package.json` includes hard Prisma dependencies even for file-profile deployment artifacts.

## Target State (To-Be)

### 1) Persistence Profile Contract

- Shared profile contract:
  - `PERSISTENCE_PROVIDER=sqlite|postgresql|file`
  - optional build profile env: `AUTOBYTEUS_BUILD_PROFILE=full|file`
- `src/persistence/profile.ts` normalizes and validates the profile.

### 2) Single Pattern: Registry + Proxy Per Domain

For each persisted domain, standardize to:

- `persistence-provider.ts` (domain interface)
- `persistence-provider-registry.ts` (provider key -> lazy loader)
- `persistence-proxy.ts` (runtime profile resolution + delegated operations)

No per-domain factory pattern in final architecture.

### 3) Lazy Provider Loading

- Registries store lazy loaders (`() => import(...)`), not static SQL imports.
- SQL adapters are loaded only for SQL profiles.
- File build/profile does not include SQL module graph.

### 4) File Persistence Subsystem

- Add shared primitives under `src/persistence/file/`:
  - atomic write utility
  - lock utility
  - JSON collection store
  - JSONL append store
- Domain file providers persist under app data root (for example `memory/persistence/...`).

### 5) Startup Behavior

- Startup migration gate is profile-aware:
  - SQL profiles -> run migrations
  - file profile -> skip migrations

### 6) Build Profiles

- `build:full`: current Prisma-enabled path.
- `build:file`: file-only compile path (exclude SQL/Prisma graph).
- `tsconfig.build.file.json` enforces file-only compile graph.

### 7) Packaging And Runtime Dependency Profiles

- File-profile artifact path must avoid mandatory Prisma package/runtime loading.
- SQL dependencies remain required only for SQL profile paths (`build:full` and SQL runtime).
- Build/install scripts and package manifest shape must make Prisma dependency edges explicit by profile.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `src/persistence/profile.ts` | Centralize profile parsing/validation. | Startup + all domains | Shared contract. |
| C-002 | Add | N/A | `src/persistence/file/*` | Reusable file primitives. | All file adapters | Atomicity + locking. |
| C-003 | Modify | `src/startup/migrations.ts` | same | Skip Prisma in file profile. | Startup | SQL behavior retained. |
| C-004 | Modify | `src/app.ts` | same | Invoke profile-aware migration path. | Startup | Preserve ordering. |
| C-005 | Modify | `src/token-usage/providers/persistence-provider-registry.ts` | same | Convert to lazy loaders + file provider. | Token usage | Existing seam generalized. |
| C-006 | Add | N/A | `src/token-usage/providers/file-persistence-provider.ts` | File token usage provider. | Token usage | JSONL append + scan stats. |
| C-007 | Modify | Domain persistence wrappers (agent/prompt/team/mcp/artifact/external-channel) | same paths | Convert to registry+proxy trios. | Cross-domain | Remove SQL defaults. |
| C-008 | Add | N/A | Domain `file-*` provider modules | File adapters per domain. | Cross-domain | Preserve behavior semantics. |
| C-009 | Modify | Composition roots (`src/app.ts`, startup, GraphQL/REST/processors) | same | Depend on proxies/interfaces only. | Cross-cutting | Remove direct `new Sql...`. |
| C-010 | Modify | `package.json` | same | Add `build:full` + `build:file`. | Build pipeline | File build skips Prisma path. |
| C-011 | Add | N/A | `tsconfig.build.file.json` | Exclude SQL/Prisma graph. | Build pipeline | Prisma-free compile path. |
| C-012 | Remove | Static SQL imports in registries/composition roots | lazy loaders + proxy usage | Prevent Prisma linkage in file mode. | Cross-cutting | Required for one pattern. |
| C-013 | Modify | `docs/modules/workflow_definition.md`, `docs/modules/README.md` | same | Keep docs aligned with active modules. | Docs | Already reflected. |
| C-014 | Modify | `package.json` + file-profile packaging scripts | same | Ensure file-profile deployable artifact does not require Prisma dependencies at install/runtime. | Build + packaging | Mandatory for Android/edge objective. |
| C-015 | Modify | profile-selection verification model | same | Add explicit SQL-profile regression verification path in design/runtime artifacts. | Review + verification | Prevent profile-coverage blind spots. |

## Architecture Overview

- Profile selected once via shared resolver.
- Each persisted domain resolves provider via registry+proxy.
- SQL and file adapters are peer registry entries.
- Build profile controls whether SQL graph is compiled.
- Packaging profile controls whether Prisma dependencies are required for install/runtime artifacts.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `src/persistence/profile.ts` | Add | Profile normalization | `getPersistenceProfile()` | env -> profile | `process.env` |
| `src/persistence/file/*` | Add | Shared file primitives | read/write/lock | domain rows <-> file records | `node:fs`, `node:path` |
| `src/<domain>/providers/persistence-provider-registry.ts` | Modify/Add | Lazy registration | `registerProvider`, `getProviderLoader` | provider key -> loader | dynamic import |
| `src/<domain>/providers/persistence-proxy.ts` | Modify/Add | Runtime provider resolution | domain persistence methods | domain IO | registry + profile |
| `src/startup/migrations.ts` | Modify | Migration gate | `runMigrations()` | profile -> migrate/skip | profile resolver |
| `package.json`, `tsconfig.build.file.json` | Modify/Add | Build profile split | `build:file`, `build:full` | source -> dist | pnpm + tsc |
| `package.json` + packaging scripts | Modify | Profile-safe dependency surface | file/full package artifacts | build profile -> dependency graph | package manager + build scripts |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| Pattern | Mixed styles | `registry + proxy` for all domains | One codebase-wide pattern. | Avoid architecture drift. |
| Module | ad-hoc env reads | `src/persistence/profile.ts` | Single source of truth for profile. | Shared by all proxies. |
| Registry API | static class map | lazy loader map | Avoid static SQL imports. | Enables Prisma-free file builds. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `src/persistence/profile.ts` | Env/config | all proxies | Low | Keep pure utility. |
| Domain registries | profile + dynamic import | domain proxies | Medium | Keep loaders domain-local; avoid cycles. |
| Domain proxies | registries + interfaces | services/composition | Medium | Interface-first boundary; no SQL imports. |
| Build profile scripts | scripts + tsconfig variants | CI/local builds | Medium | CI matrix for `build:full` + `build:file`. |
| Package manifest/profile scripts | dependency declarations + packaging commands | deployment artifacts | High | Define explicit file-profile artifact flow that omits required Prisma dependencies. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| SQL-default wrappers | Replace with registry+proxy and remove SQL defaults. | SQL stays as adapter entry only. | unit tests + grep |
| Static SQL imports in registry/composition | Replace with lazy loader registration + proxy usage. | Required for Prisma-free file build. | grep `from "@prisma/client"` in file graph |
| Per-domain factory selection concept | Remove from docs/code artifacts. | Enforce one pattern. | review checklist |
| File-profile hard Prisma dependency edge | Remove/relax mandatory Prisma dependencies for file-profile artifacts. | Keep SQL dependency path only for SQL profile builds/runtimes. | file-profile install/startup smoke on Android/edge-like env |

## Data Models (If Needed)

- File record schemas mirror current domain converter outputs.
- Preserve externally visible string IDs.

## Error Handling And Edge Cases

- Corrupt file records: fail closed for writes, safe read fallback where valid.
- Concurrency: lock discipline per domain file store.
- TTL idempotency semantics preserved for external-channel.
- Unsupported profile: fail fast at startup.
- Loader failure: explicit provider key + profile error.
- Profile/package mismatch: fail fast with explicit dependency guidance for selected profile.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Startup in file mode skips Prisma migrations | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-001 |
| UC-002 | Prompt CRUD via file provider | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-002 |
| UC-003 | Agent definition + mapping via file providers | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-003 |
| UC-004 | Agent team definition via file provider | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-004 |
| UC-005 | MCP config + startup load/register via file provider | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-005 |
| UC-006 | External-channel ingress+callback flows via file providers | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-006 |
| UC-007 | Token usage persistence/statistics via file provider | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-007 |
| UC-008 | Artifact create/read via file provider | Yes | Yes | Yes | `future-state-runtime-call-stack.md` -> UC-008 |
| UC-009 | File build profile skips Prisma | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-009 |
| UC-010 | Single pattern across domains (`registry + proxy`) | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-010 |
| UC-011 | File-profile package/install/runtime is Prisma-free | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-011 |
| UC-012 | SQL-profile startup/provider path remains valid | Yes | N/A | Yes | `future-state-runtime-call-stack.md` -> UC-012 |

## Performance / Security Considerations

- File profile avoids Prisma startup/native engine requirements.
- Lazy loader strategy avoids loading unused adapters.
- File stores remain confined to app data directory.
- File-profile packaging reduces deployment footprint and removes Prisma-native runtime constraints on edge targets.

## Migration / Rollout (If Needed)

- Phase 1: profile resolver + shared file primitives.
- Phase 2: domain-by-domain registry+proxy refactor with file adapters.
- Phase 3: build profile split + CI matrix.
- Phase 4: package/dependency profile split for file deployment artifacts.
- Phase 5: Android/Termux validation with file-profile artifacts.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001..C-004 | startup/profile foundation | startup integration tests (file + SQL profiles) | Planned |
| C-005..C-009 | registry+proxy + domain adapters | provider/service unit + integration tests | Planned |
| C-010..C-012 | build-profile + lazy-loader tasks | CI + local build smoke | Planned |
| C-013 | docs alignment | docs review | Planned |
| C-014 | package/dependency profile hardening | file-profile install/startup smoke + artifact dependency inspection | Planned |
| C-015 | profile-regression coverage hardening | SQL-profile startup/provider smoke checks | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-14 | Review round 6 | Mixed persistence selection patterns | Standardized architecture to registry+proxy (`v6`). | Closed |
| 2026-02-14 | Review round 7 | Missing modeled use cases for team/MCP/artifact paths | Added explicit UC-004/UC-005/UC-008 coverage and runtime modeling requirements (`v7`). | Closed |
| 2026-02-14 | Review round 8 | External-channel callback flow not explicitly modeled in UC-006 runtime stack | Added callback publish + callback-idempotency path under UC-006 (`v8`). | Closed |
| 2026-02-20 | Review round 11 | Compile-only Prisma decoupling was insufficient for Android/edge deploy objective. | Added UC-011 and packaging/dependency profile requirements (`v9`). | Closed |
| 2026-02-20 | Review round 14 | SQL profile regression path not explicitly modeled in use-case set. | Added UC-012 and profile-regression coverage requirements (`v10`). | Closed |

## Open Questions

- Keep file persistence root under `memory/persistence/` or dedicated `data/persistence/`.
- File-profile packaging strategy: dedicated manifest artifact vs optional dependency strategy.
- Delete empty `src/workflow-definition` and `src/agent-conversation` dirs now or in follow-up cleanup.
