# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: The behavioral change is coherent but cross-cuts active server runtime code, Electron bootstrap env shaping, Android/Docker scripts, tests, and live docs.
- Investigation Goal: Confirm whether `PERSISTENCE_PROVIDER=file` is still a truthful runtime/build option and identify the minimal simplification that makes persistence subsystem-owned again.
- Primary Questions To Resolve:
  - Is any active runtime behavior besides token usage still selected by `PERSISTENCE_PROVIDER`?
  - What build/runtime/test surfaces still model a file persistence profile?
  - Can token usage be made database-only without reintroducing fake generic persistence selection elsewhere?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-09 | Command | `rg -n "PERSISTENCE_PROVIDER|persistence=file|build:file|dist-file" autobyteus-server-ts autobyteus-web docker scripts -S` | Find all active runtime/build references | Live references are concentrated in `autobyteus-server-ts`, Electron bootstrap env helpers, Android/Docker scripts, tests, and docs | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/persistence/profile.ts` | Check current persistence selection logic | Global profile still supports `sqlite`, `postgresql`, and `file`; Android forcibly resolves to `file` | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/config/app-config.ts` | See whether startup config truly depends on persistence profile | `PERSISTENCE_PROVIDER` only gates whether SQLite `DATABASE_URL` is auto-derived | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/startup/migrations.ts` | Check runtime consequence of file profile | Startup skips Prisma migrations only when profile resolves to `file` | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/token-usage/providers/persistence-proxy.ts`, `.../persistence-provider-registry.ts`, `.../file-persistence-provider.ts` | Verify real live file-vs-db persistence logic | Token usage is the only active subsystem still honoring `PERSISTENCE_PROVIDER`; it still has a file JSONL provider | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/agent-definition/providers/definition-persistence-provider-registry.ts`, `src/agent-team-definition/providers/persistence-provider-registry.ts`, `src/mcp-server-management/providers/persistence-provider-registry.ts` | Validate whether other subsystems still switch providers | These registries already ignore profile semantics in practice and always load file-backed providers; profile names are compatibility aliases only | No |
| 2026-04-09 | Code | `autobyteus-server-ts/package.json`, `tsconfig.build.file.json`, `scripts/build-file-package.mjs`, `scripts/copy-managed-messaging-assets.mjs` | Check build-time file-profile machinery | A dedicated `build:file` / `build:file:package` path still exists solely to support the old file profile and `dist-file` output | No |
| 2026-04-09 | Code | `scripts/android-bootstrap-termux.sh`, `scripts/android-run-server-termux.sh` | Check Android path coupling | Android helpers still build `dist-file`, write `PERSISTENCE_PROVIDER=sqlite`, and launch `dist-file/app.js` even though runtime code forces Android back to file profile | No |
| 2026-04-09 | Code | `autobyteus-web/electron/server/serverRuntimeEnv.ts`, `autobyteus-web/electron/server/services/AppDataService.ts` | Check desktop bootstrap env generation | Electron still writes/exports `PERSISTENCE_PROVIDER=sqlite` as part of default server env despite the user-visible persistence choice no longer being meaningful | No |
| 2026-04-09 | Code | `autobyteus-server-ts/tests/unit/persistence/profile.test.ts`, `tests/integration/token-usage/providers/persistence-proxy.integration.test.ts`, `tests/integration/external-channel/runtime/gateway-callback-delivery-runtime.integration.test.ts` | Measure current test expectations | Tests still encode the old profile contract, including unsupported-profile errors and temp env files with `PERSISTENCE_PROVIDER=file` | No |
| 2026-04-09 | Issue | User clarification in thread | Confirm intended target behavior | User explicitly confirmed token/storage should not support file persistence and database storage is the desired solution for token usage | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-server-ts/src/app.ts:startServer()` -> `server-runtime.ts:startConfiguredServer()`
  - `autobyteus-web/electron/server/serverRuntimeEnv.ts:buildServerRuntimeEnv(...)`
  - Android/Docker bootstrap scripts writing runtime `.env` files
- Execution boundaries:
  - Server config bootstrap in `AppConfig`
  - Startup database migration gate in `runMigrations()`
  - Token-usage persistence boundary in `PersistenceProxy`
- Owning subsystems / capability areas:
  - server config/bootstrap
  - token-usage persistence
  - Electron server runtime bootstrap
  - deployment/bootstrap scripts
- Folder / file placement observations:
  - Generic `persistence/profile.ts` is now a leftover policy hub with only three live consumers.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/persistence/profile.ts` | `getPersistenceProfile()` | Global persistence selector | Only meaningful for token-usage provider selection and migration skipping; no longer matches most subsystem behavior | Candidate removal |
| `autobyteus-server-ts/src/token-usage/providers/persistence-proxy.ts` | `PersistenceProxy` | Token-usage provider selection | Only active place still switching on generic profile; file persistence path remains live | Simplify to database-backed default behavior |
| `autobyteus-server-ts/src/token-usage/providers/file-persistence-provider.ts` | file token storage | JSONL token usage persistence | Conflicts with target behavior that token usage should stay in DB | Remove |
| `autobyteus-server-ts/src/config/app-config.ts` | `initialize()` / `initSqlitePath()` | Server env shaping | SQLite URL derivation should depend on DB config, not generic persistence profile | Simplify |
| `autobyteus-server-ts/src/startup/migrations.ts` | `runMigrations()` | Prisma startup gate | File-profile skip is now legacy behavior | Simplify to DB-backed runtime path |
| `autobyteus-server-ts/package.json` | `build:file`, `build:file:package` | File-profile build outputs | Build profile exists only for obsolete file mode | Remove |
| `scripts/android-run-server-termux.sh` | Android launch helper | Builds and launches `dist-file` | Coupled to obsolete file build output | Update to normal build/output |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | runtime env builder | Emits server env values | Still exports `PERSISTENCE_PROVIDER` even though persistence is subsystem-owned | Remove obsolete env field |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-09 | Probe | `rg -n "getPersistenceProfile\\(|PERSISTENCE_PROVIDER" autobyteus-server-ts/src -S` | Only `app-config.ts`, `startup/migrations.ts`, and token-usage proxy consume the profile directly | Simplification surface is bounded |
| 2026-04-09 | Probe | `rg -n "build:file|dist-file|package:file" -S . -g '!**/tickets/**'` | Only Android helpers, package scripts, and one asset-copy script rely on file build outputs | File build removal is straightforward |
| 2026-04-09 | Probe | `rg -n "PERSISTENCE_PROVIDER" autobyteus-web/electron/server autobyteus-server-ts/tests docker scripts -S` | Electron, tests, and deployment scripts still inject the legacy env var | Update bootstrap/test contract |

### Reproduction / Environment Setup

- Required services, mocks, or emulators: none for investigation
- Required config, feature flags, or env vars: none beyond repo defaults
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add -b codex/remove-file-persistence-provider ../autobyteus-workspace-remove-file-persistence-provider origin/personal`

## Constraints

- Technical constraints:
  - Token usage must remain queryable through existing SQL-backed statistics/reporting code.
  - SQLite `DATABASE_URL` auto-derivation still matters for local/default runtime bootstrapping.
- Environment constraints:
  - Android helper scripts currently assume `dist-file`; removing that path requires script changes in the same ticket.
- Third-party / API constraints:
  - Prisma remains the database migration/runtime layer for token usage persistence.

## Unknowns / Open Questions

- Unknown: Whether Android runtime still needs a Prisma-free build/package path for reasons unrelated to persistence.
- Why it matters: Removing `build:file` assumes Android can use the standard build artifact.
- Planned follow-up: Validate the changed scripts/build surface with repo test/build evidence; if build breaks, classify re-entry. No current active code or user requirement suggests a remaining functional need for file-profile behavior itself.

## Implications

### Requirements Implications

- Requirements should treat token usage as database-only persistence.
- Requirements should treat agent/team/MCP persistence as subsystem-owned file storage, not as a user-selectable profile.
- Requirements should explicitly remove the global `PERSISTENCE_PROVIDER` contract from runtime/build surfaces.

### Design Implications

- Remove the generic persistence-profile policy layer instead of narrowing it.
- Replace token-usage provider selection with database-backed behavior that follows DB configuration, not a generic persistence mode.
- Remove the dedicated file build/profile outputs and update Android/Docker/Electron bootstrap code to the standard runtime path.

### Implementation / Placement Implications

- `autobyteus-server-ts/src/persistence/profile.ts` and token file provider code are removal candidates.
- `autobyteus-server-ts/src/config/app-config.ts`, `src/startup/migrations.ts`, token-usage providers, package scripts, Android scripts, Docker env templates, Electron env helpers, and related tests/docs are in scope.
