# Investigation Notes

## Investigation Meta

- Package identifier: `imported-app-codex-runtime-folder` (Project Task `autobyteus-238`)
- Request / ticket: autobyteus-238 (FU-006 of autobyteus-207)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `fix/imported-app-codex-runtime-folder`
- Resolved base: `origin/personal` @ `1138e8fbefadeb3b30fdb88eb4a5a09beaf372ea` (fetched 2026-10-24)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-server-ts test:integration:prepare` (builds the SDKs and Brief Studio's importable package; their `dist/` folders show as untracked and are not committed)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-24): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; design gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md`
- Investigation status: complete

## Initial Request And Clarifications

- Original request: Task autobyteus-238, see requirements doc. "Reproduce first."
- Clarifications: bundled with autobyteus-265, -232, -208 (independent). FU-004 of autobyteus-207 may be done together; this ticket keeps it separate (DEC-002).

## Product And Domain Understanding

- Product area: application packages (import/reload) and application launch readiness.
- Terms: *runtime folder*, `<data>/applications/<storage key>/runtime`, the application's working directory (`buildApplicationStorageLayout`, `application-storage-paths.ts:47-72`); *catalog transition*, the in-process import/reload/remove of packages; *readiness*, `ApplicationDefinitionRuntimeReadiness.prepare`.

## Source Log

| Date | Source Type | Exact Source / Command | Why | Finding | ID |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-catalog-transition-service.ts:118-156` | Import/reload path | `commitAndRecover`: commit catalog → `catalogReconciliation.reconcile` → `definitionReadiness.prepare()` → recoverable = ready apps → `recoverParticipants`. No storage step | E-01 |
| 2026-10-24 | Code | same file `:41-116` (`runPackageTransition`, `reloadAndReenter`) | Which actions use it | Import, reload and remove of a package; single-application reload | E-02 |
| 2026-10-24 | Code | `src/application-platform/runtime/application-platform-lifecycle.ts:51-58` | Startup order | `ensureRuntimeDirectoryPrepared` for each selected application, then readiness | E-03 |
| 2026-10-24 | Code | `src/application-platform/runtime/create-application-orchestration-services.ts:158-169`; `src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` (`resolveAuthority` → `codex_workspace` with the workspace root; `getReadiness` → `signInReader.read(CODEX, { cwd })`); `src/runtime-management/agent-runtimes/strategies/codex-agent-runtime-strategy.ts:27-46` | What readiness spawns | The workspace root is the runtime folder; Codex `account/read` runs through `beginAcquire(cwd)`; any error → `unknown` → "Codex authentication is unavailable: …" | E-04 |
| 2026-10-24 | Code | `src/application-orchestration/services/application-reentry-service.ts:103-114`; `src/application-platform/runtime/application-definition-runtime-readiness.ts:63-110` | Why quarantine | A readiness issue puts a diagnostic; `isApplicationReady` false → "Application setup is required after catalog transition." | E-05 |
| 2026-10-24 | Code | `src/application-storage/services/application-storage-lifecycle-service.ts:66-72,116-121` | Existing owner | `ensureRuntimeDirectoryPrepared(applicationId)` (cached per call, requires the bundle in the catalog, `mkdirSync recursive`) | E-06 |
| 2026-10-24 | Code | `src/application-platform/runtime/build-application-platform-runtime.ts:72,178-189,211` | Wiring | `storageLifecycleService` exists where `ApplicationCatalogTransitionService` is built | E-07 |
| 2026-10-24 | Code | `src/application-orchestration/*` imports | Dependency direction | Orchestration already depends on `application-storage` stores | E-08 |
| 2026-10-24 | Command | SD-01, SD-02 below | Reproduce + control | see below | SD-01, SD-02 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Import | import → catalog commit → readiness (Codex spawn, cwd missing → ENOENT) → quarantine | 503 QUARANTINED until restart | E-01, E-04, E-05, SD-01 | Reproduced |
| BEH-002 | System | Startup | runtime folders → readiness | ACTIVE | E-03 | Read |
| BEH-003 | User | Reload | same as BEH-001 | Same defect when the folder is missing (e.g. never prepared) | E-02 | Read |

## Relevant Codebase And Technical Facts

| Path / Component | Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `ApplicationCatalogTransitionService.commitAndRecover` | Brings a changed catalog to ready/quarantined | Missing storage step | Add the step here, before readiness |
| `ApplicationStorageLifecycleService.ensureRuntimeDirectoryPrepared` | Owns the folder | Reuse | Inject a `Pick` |

## Structural And Payload Surface Inventory

- Payload: none.
- Structural: one service's dependency set and one step; wiring in `build-application-platform-runtime.ts`; tests.
- API/persistence/security/deployment: absent (an empty folder at an existing path).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| SD-01: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/zz-probe-imported-app-codex-launch.e2e.test.ts --no-watch` on base 1138e8fbef (real studio server, scripted Codex CLI, Brief Studio imported by GraphQL) | SCN-001 | `[CodexAppServerClient] Failed to spawn … ENOENT … cwd=".../applications/bundle-app__brief-studio__…/runtime"`; GET launch settings → 503 `QUARANTINED`, "Application setup is required after catalog transition." | Reproduced | BEH-001 | `evidence/SD-01-repro-base.log` |
| SD-02: same probe with a TEMPORARY diagnostic in `commitAndRecover` that created each current application's runtime folder before readiness | Control | Pass: launch settings 200 `RUNNABLE`, draft run `ATTACHED`, Codex thread started | Reproduced | DEC-001 (sufficient) | `evidence/SD-02-control-runtime-folder-prepared.log` |

- Temporary diagnostics: SD-02's `mkdirSync` in `application-catalog-transition-service.ts` before `definitionReadiness.prepare()`, to prove the cause. Reverted with `git checkout` right after the run; never committed.
- Reproduction for implementation to start from: `evidence/repro-imported-app-codex-launch.e2e.test.ts`. Copy it into `autobyteus-server-ts/tests/e2e/runtime/` and run with the command above (after `test:integration:prepare`). It fails on base.

## Persisted Data And State Facts

- Not affected.

## Product Design Request Context

- `Not stated`.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro-imported-app-codex-launch.e2e.test.ts` | Solution Designer | Reproduction, E2E basis | SCN-001 | REQ-002, AC-001 | Current | Evidence |
| `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-runtime-folder-prepared.log` | Solution Designer | Outputs | — | — | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| R-01 | Risk | Folder creation fails (permissions, disk) | Import then fails | Error propagates like any transition failure; the transition's rollback path handles it, as for startup | Accepted |

## SR-002 Evidence (code review CRR-001)

| Date | Type | Source | Finding | Established |
| --- | --- | --- | --- | --- |
| 2026-10-24 | Report | `code-review-report.md` C-01; API/E2E `api-e2e-execution-coverage-report.md` API-06 | Reload or repair of a previously ACTIVE Brief Studio ends QUARANTINED: `recoverParticipants` (`application-reentry-service.ts:150-155`) starts the worker before `activateApplication`; the worker's start hook calls `listRunBindings`, which `requireApplicationActive` refuses in REENTERING | Reproduced by API/E2E (base and fix identical); read and confirmed by the Solution Designer in the report's cited evidence (`evidence/API-06-cause-stack-diagnostic.log`) |
| 2026-10-24 | Doc | `autobyteus-server-ts/docs/modules/application_orchestration.md:175-180`, `applications.md:111` | Docs say reentry activates with the worker stopped | Read (via the report) |

Disposition: not caused by this ticket and not a prerequisite (the Task's goal is proven without it). AC-003 narrowed; follow-up FU-003 (requirements DEC-004).

## Architecture Investigation Findings

- Startup and catalog transition both bring catalog applications to readiness; only startup prepares the runtime folder first (E-01, E-03). The owner of the folder exists (E-06) and is available at the wiring site (E-07).

## Requirement Implications

- The fix is the missing storage step; readiness rules stay.

## Notes For Architecture Design

- Add the step in `commitAndRecover` after the catalog commit (the storage service requires the bundle to be in the catalog) and before readiness.
