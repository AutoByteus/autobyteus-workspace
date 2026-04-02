# Proposed Design

- Ticket: `linux-appimage-memory-dir-startup`
- Version: `v2`
- Last Updated: `2026-04-02`
- Scope: `Medium`

## Design Goal

Make server startup deterministic and easy to reason about by establishing effective runtime config before the app graph loads, while preserving the existing external server entry contract and the previously fixed Linux AppImage regression.

## Current Problem Summary

- `src/app.ts` statically imports a broad runtime graph before CLI args are parsed.
- `appConfigProvider` can lazily construct `AppConfig` with fallback defaults before bootstrap has chosen the effective app-data directory.
- `AppConfig` constructor logs the fallback data directory immediately, which is misleading during normal Electron/AppImage startup.
- Some modules in touched scope still derive config-dependent filesystem paths at module scope.

## Target Architecture

### 1. Bootstrap-first entrypoint

- Keep `src/app.ts` as the public server entry module (`dist/app.js` remains unchanged).
- Reduce `src/app.ts` to a bootstrap boundary:
  - parse CLI args,
  - initialize the config provider with effective startup options,
  - dynamically import the runtime module after config bootstrap,
  - delegate actual server startup to that runtime module.

### 2. Separate runtime graph module

- Move the heavy startup/runtime imports from `src/app.ts` into a separate runtime module (for example `src/server-runtime.ts`).
- This module assumes config bootstrap is already complete when it is imported/executed.

### 3. Explicit provider bootstrap path

- Extend `app-config-provider.ts` with explicit initialization semantics so startup can create/configure the singleton before the runtime graph loads.
- Preserve test practicality:
  - do not force a repo-wide strict-throw migration in this ticket,
  - but make production startup use explicit provider initialization rather than accidental first access.

### 4. Truthful `AppConfig` construction/logging

- Allow `AppConfig` to receive the effective initial app-data directory at construction/bootstrap time.
- Remove or reword misleading constructor logging so effective app-data logging happens only after the real startup directory is known.

### 5. Lazy config-derived paths in touched startup-sensitive modules

- Replace module-scope config-derived path constants in touched scope with local resolver functions.
- In-scope example:
  - `src/mcp-server-management/providers/file-provider.ts`

## Data Flow

```text
process.argv / process.env
-> src/app.ts bootstrap parse
-> appConfigProvider.initialize({ appDataDir? })
-> AppConfig constructed with effective startup inputs
-> AppConfig.initialize()
-> dynamic import("./server-runtime.js")
-> runtime graph imports/constructs config-dependent services
-> migrations / Fastify / background tasks / runtime startup
```

## Change Inventory

| Change ID | Type | File | Summary |
| --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/config/app-config.ts` | Support bootstrap-friendly initialization/logging with truthful effective app-data reporting. |
| C-002 | Modify | `autobyteus-server-ts/src/config/app-config-provider.ts` | Add explicit config bootstrap API for startup ownership. |
| C-003 | Modify | `autobyteus-server-ts/src/app.ts` | Convert to bootstrap-first entry flow that initializes config before importing the runtime graph. |
| C-004 | Add | `autobyteus-server-ts/src/server-runtime.ts` | Host the broader runtime/server startup graph behind the bootstrap boundary. |
| C-005 | Modify | `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` | Remove module-scope config-derived path binding in touched startup-sensitive scope. |
| C-006 | Preserve/Modify | `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Keep the lazy memory-layout fix and ensure it fits the new startup flow. |
| C-007 | Add/Modify | `autobyteus-server-ts/tests/**` | Add bootstrap/provider tests and preserve projection import-timing coverage. |
| C-008 | Modify | `autobyteus-server-ts/docs/README.md`, `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md`, `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | Sync docs to explicit bootstrap-first startup architecture. |

## Design Decisions

### Decision A: Keep external entry contract stable

- Keep `dist/app.js` as the server entrypoint.
- This avoids Electron/package script churn.

### Decision B: Prefer dynamic runtime import over widespread eager-import audits

- Dynamic import after config bootstrap gives one strong startup boundary.
- This is cleaner than relying on every imported runtime module to remain lazily safe forever.

### Decision C: Stage provider strictness

- The best eventual design is “config unavailable before bootstrap”.
- For this ticket, use explicit provider initialization in production startup and add tests/docs around that flow without forcing a full repo-wide strict-throw migration in one pass.

## Verification Strategy

- Unit:
  - provider/bootstrap tests,
  - import-timing regression tests,
  - existing team-member projection tests.
- Executable:
  - build Linux AppImage from patched worktree,
  - launch it and verify effective app-data/memory directories in logs.

## Risks / Mitigations

- Risk: dynamic import boundary complicates startup exports.
  - Mitigation: keep `app.ts` bootstrap-only and move runtime exports into a dedicated module with simple function boundary.
- Risk: tests rely on existing provider behavior.
  - Mitigation: stage provider strictness; refactor production bootstrap first and add focused provider tests.
