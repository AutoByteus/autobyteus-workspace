# Investigation Notes — Simplify Local Full-Stack Development Startup

## Investigation Status

- Bootstrap Status: Complete; dedicated latest-base worktree and Draft requirements were created before deep investigation.
- Current Status: Complete for requirements refinement; approved for design by the user's explicit continue instruction.
- Investigation Goal: Establish current development/test/production startup, configuration, data, process, documentation, and compatibility ownership so a conventional isolated `pnpm dev` / `pnpm test:e2e` interface can be designed without product redesign.
- Scope Classification: `Medium`.
- Scope Classification Rationale: Bounded operational refactor across root scripts, launcher/materialization logic, one template, tests/ignore rules, and docs; no product API, persistence schema, provider, runtime, Docker, or Electron redesign.
- Scope Summary: Separate manual development startup from automated test execution and isolate development data from test/packaged production.
- Primary Questions Resolved: What current `*:test` scripts do; which owners select data/config; how test and Electron paths differ; how parent/cwd configuration can redirect; which assertion owners exist; what can be removed cleanly.

## Request Context

The user requests a new ticket from latest tracked `origin/personal`. The finalized Secure Centralized Secret Provisioning ticket/worktree must not be reused. The user wants conventional full-stack development startup, explicit automated test execution, persistent project-local development data, strict development/test/production isolation, credential-free templates, and no provider/vault/runtime/Electron/Docker redesign.

The exact intended behavior is captured in [Development Startup Contract](./development-startup-contract.md); the approval basis is [Requirements](./requirements.md).

## Environment Discovery / Bootstrap Context

- Project Type: `Git` superrepository workspace.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/done/simplify-local-full-stack-development-startup`.
- Current Branch: `codex/simplify-local-full-stack-development-startup`.
- Current Worktree / Working Directory: dedicated task worktree above.
- Bootstrap Base Branch: refreshed `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-28; base resolved to `153f3409cd90207f9219cbe20242606271b36104`.
- Task Branch: tracks `origin/personal`.
- Expected Base Branch: `origin/personal`.
- Expected Finalization Target: `personal` through normal delivery workflow after review/test approval.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not use the shared dirty checkout or finalized prior-ticket worktree. No source implementation is authorized before architecture approval.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
|---|---|---|---|---|---|---|---|
| [requirements.md](./requirements.md) | Mandatory requirements basis | Scope, behavior, requirements, criteria, use cases, persisted-data outcome | Requirements | All | Design-ready | Approved by user instruction | Keep aligned with design |
| [investigation-notes.md](./investigation-notes.md) | Mandatory evidence record | Bootstrap, source/history findings, production paths, ownership, risks | All core artifacts | All | Current | `N/A` evidence | Update only for new evidence |
| [development-startup-contract.md](./development-startup-contract.md) | Intended-behavior supplement | Exact command, data, template, materialization, frontend, process, test, credential, and reset contract | Requirements; future design | `REQ-001`–`REQ-014`; `AC-001`–`AC-013` | Approved for design | Intended-behavior authority; approved by user instruction | Keep aligned with design |
| `./design-spec.md` | Mandatory target design | Not created before requirements approval | Design | All | Not started | Pending design completion | Create before handoff |
| `./solution-revision-record.md` | Mandatory solution round index | Will record `SR-001` before completed handoff | All | All | Not started | `N/A` record | Create before handoff |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
|---|---|---|---|---|---|
| 2026-07-28 | Command | `git fetch origin personal`; `git worktree add -b codex/simplify-local-full-stack-development-startup ... origin/personal` | Refresh base and isolate task | Dedicated worktree created at tracked base `153f3409...`; shared dirty checkout not used | No |
| 2026-07-28 | Doc | Solution-designer `SKILL.md`; shared `design-principles.md`; requirements/investigation templates | Apply canonical workflow/design standard | Evidence, narrow ownership, clean-cut removal, spine readiness, user approval, and mandatory artifacts are required | No |
| 2026-07-28 | Code | Root `package.json`; `test-support/live-e2e/run-test-dev.mjs`; `run-test-server.mjs`; `run-test-web.mjs` | Establish current command behavior | `dev:test` starts real backend/Nuxt but no assertions; server/web commands are manual halves | No |
| 2026-07-28 | Code | `test-support/live-e2e/test-runtime-bootstrap.mjs`; `autobyteus-server-ts/.env.test` | Establish test materialization and isolation | Strict four-key template, absolute `--data-dir`, sanitized child env, constrained DB root, persistent real-E2E runtime | No |
| 2026-07-28 | Code | `test-support/live-e2e/run-live-e2e.mjs`; server `vitest.config.ts`; `tests/setup/prisma-*`; `find tests/e2e` and opt-in guard scans | Identify actual assertion owners | Real-provider command runs one explicit capability suite; deterministic server E2E has 61 files with reset/per-test state and opt-in live guards | No |
| 2026-07-28 | Code | `autobyteus-server-ts/src/app.ts`; `src/config/app-config.ts`; database-location and vault-key references | Establish startup order and target authority | CLI data dir precedes config load; parent environment has precedence; relative DB URL resolves from server app root; vault key is DB sibling | No |
| 2026-07-28 | Code | `autobyteus-web/nuxt.config.ts`; web `package.json` | Establish frontend route/start owner | Nuxt dev supports fixed host/port, backend base, and explicit WS overrides; current combined wrapper does not prove frontend readiness | No |
| 2026-07-28 | Code | `autobyteus-web/electron/appDataPaths.ts`; Electron AppDataService/server-manager references | Establish packaged-production boundary | Packaged Electron owns `~/.autobyteus/server-data`, generated production `.env`, and explicit `--data-dir` | No |
| 2026-07-28 | Code | `autobyteus-server-ts/src/config/app-config.ts`; `src/config/config-value-parsers.ts`; `autobyteus-ts/src/memory/path-resolver.ts` | Verify all ambient path overrides before locking isolation requirements | `AUTOBYTEUS_LOG_DIR` and `AUTOBYTEUS_TEMP_WORKSPACE_DIR` can escape an app data dir; `AUTOBYTEUS_MEMORY_DIR` is consumed by the memory package when supplied; the dev launcher must force all three below the canonical root | Requirements/contract updated |
| 2026-07-28 | Doc | Root/server README; secret-management docs; `.env.example`; root/server `.gitignore` | Establish docs/templates/ignore ownership | Active manual-stack docs are isolated; `.env.example` is production-oriented; root lacks `.autobyteus` ignore; server ignore must admit `.env.development` | No |
| 2026-07-28 | Repo | `git log`/`git blame` for scripts/templates/launchers/docs; `rg` reference scan | Check compatibility need | Manual `*:test` commands/files arrived together and have no active consumer beyond own docs/scripts | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
|---|---|---|---|---|---|
| `BEH-001` | Operational | Root `pnpm dev:test` | Root builds server; `run-test-dev.mjs` starts built server `8000` then Nuxt `3000`; signal/close handlers stop children | Real manual stack, no assertion runner, test-labelled output | Root scripts and launcher source |
| `BEH-002` | Operational | Manual stack materialization | `.env.test` -> `tests/.tmp/live-e2e-runtime/.env`; DB -> `autobyteus-server-ts/db/test.db` | A development session currently mutates persistent test-owned state | Test bootstrap/template source |
| `BEH-003` | Operational | Server Vitest E2E; root `test:e2e:real(:preflight)` | Deterministic tests use reset/per-test paths; real-provider wrapper starts built server on test runtime and runs selected suite | Assertion owners already exist and real external operations are explicit opt-ins | Vitest config/setup, 61-file scan, real wrapper |
| `BEH-004` | Contract | `node dist/app.js --data-dir ...` | `app.ts` parses CLI; AppConfig loads `<data-dir>/.env`; `get()` prefers parent env, including path settings | Launcher must own data dir plus log/memory/temp path keys; file alone cannot defeat hostile parent routing/path values | `app.ts`, `app-config.ts`, `config-value-parsers.ts`, `autobyteus-ts/src/memory/path-resolver.ts` |
| `BEH-005` | System | Combined launcher child lifecycle | Backend readiness marker awaited; frontend only “starting”; fixed ports; close/signal handlers stop owned children | Partial readiness and port behavior are not explicit enough for canonical dev | `run-test-dev.mjs`, Nuxt config |
| `BEH-006` | Contract | Existing Settings and explicit importer | Vault credentials live in selected app DB; importer requires explicit DB target; templates contain no credentials | Startup does not need plaintext credentials or automatic import | Current docs/source from tracked base |

## Design Health Assessment Evidence

- Change posture: `Behavior Change`, `Refactor`, and `Cleanup`.
- Candidate root cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`.
- Refactor posture evidence summary: development startup is owned by test support and shares test config/data; one new narrow development owner and clean removal are proportional.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
|---|---|---|---|
| Root scripts + manual launchers | `*:test` names start processes and do not execute tests | Command semantics and lifecycle owner are misleading | Replace cleanly with `pnpm dev` |
| Test bootstrap | Strong materialization/supervision patterns exist but are test-specific | Reuse patterns, not test ownership or test state | Design separate dev owner |
| AppConfig | Data-dir CLI is early; parent variables override file | Launcher can solve target isolation locally | Define exact owned keys |
| Electron data owners | Production path is independently explicit | No Electron change is causally necessary | Preserve and diff-guard |
| Reference/history scan | No active compatibility consumer found | Aliases/wrappers would add unjustified legacy surface | Remove without aliases |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
|---|---|---|---|
| `package.json` | Root operational command surface | Manual stack is test-labelled; no `dev`/deterministic `test:e2e` | Add exact new commands; remove misleading ones |
| `test-support/live-e2e/run-test-dev.mjs` | Combined manual test-labelled stack | Real development behavior inside test support | Remove after dedicated dev launcher exists |
| `run-test-server.mjs`, `run-test-web.mjs` | Manual half-stack launchers | No assertion owner or active consumer | Remove with scripts/docs |
| `test-runtime-bootstrap.mjs` | Strict test template/runtime/server lifecycle | Good test-specific reference and still used by real E2E | Preserve test owner; avoid turning it into generic env framework |
| `.env.test` | Strict non-secret full-server test template | Correct test responsibility | Retain unchanged unless focused test-root design requires otherwise |
| `.env.example` | Deployment/packaged-production example | Wrong input for normal dev | Keep, never consult from dev |
| `src/app.ts`, `src/config/app-config.ts` | Real server CLI/config startup | Existing explicit data-dir path is sufficient | Reuse; no server redesign |
| `nuxt.config.ts`, web `dev` | Real frontend development/proxy owner | Existing route variables support exact binding | Launcher supplies fixed target; no web API redesign |
| Electron app-data/server owners | Installed production data selection | Already isolated under home and explicit | No source changes |
| Root/server docs and ignore files | Workflow/data documentation and tracked-state rules | Current wording teaches `dev:test`; new root state not ignored | Update narrowly |
| New `.env.development` | No current supported artifact | Needed credential-free dev intent | Add exact four-key template |
| New `scripts/development/*` owner | No current supported owner | Needed for dev-only materialization/process lifecycle | Add one cohesive subsystem |

## Runtime / Probe Findings

No application, database, vault, credential-bearing source, or packaged user data was started/opened during investigation. Static source/history evidence was sufficient.

| Date | Method | Exact Command / Method | Observation | Implication |
|---|---|---|---|---|
| 2026-07-28 | Script inspection | Read launchers/bootstrap and traced imports/children | `dev:test` launches real stack without assertions | Rename/re-own rather than retain test label |
| 2026-07-28 | Static path trace | Trace CLI `--data-dir` -> AppConfig -> DB location/key | Relative template DB path would resolve from server root; absolute runtime URL is required | Materializer owns canonical absolute target |
| 2026-07-28 | Reference scan | `rg` command/template/launcher references | No external internal consumer for manual commands | Clean-cut removal is supported |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required.
- Version / tag / commit / freshness: Local tracked `origin/personal@153f3409...` is authoritative for this repository workflow.
- Relevant contract learned: Not applicable.
- Why it matters: The task is repository-specific; local production/test source is stronger than generic industry examples.

## Reproduction / Environment Setup

- Required services/mocks/emulators/fixtures: None for solution investigation.
- Required config/flags/accounts: None.
- External repos/samples/artifacts: None.
- Setup commands: remote refresh and dedicated worktree creation only.
- Cleanup notes: No processes, temp runtime, DB, key, or external artifact was created.

## Findings From Code / Docs / Data / Logs

1. Relative `DATABASE_URL=file:./db/development.db` cannot be passed unchanged if the DB must be below the development data root; materialization must write an absolute canonical file URL.
2. Runtime `.env` alone cannot defeat hostile parent `DATABASE_URL` or path overrides; the launcher must force `APP_ENV`, `DB_TYPE`, `DATABASE_URL`, `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_MEMORY_DIR`, and `AUTOBYTEUS_TEMP_WORKSPACE_DIR`, not sanitize the whole developer shell.
3. Frontend HTTP proxy and WebSocket targets are independently overrideable; the launcher must set the current base and explicit WS route variables.
4. A canonical development command must preflight fixed ports and verify frontend HTTP readiness before reporting full-stack success.
5. `pnpm test:e2e` can directly run the existing deterministic server E2E suite; external/provider scenarios remain behind existing explicit guards/commands.
6. Root `server:dev`/`web:dev` would create avoidable partial-stack coordination authority. Package-native focused commands are sufficient for specialists.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject/location: packaged production under `~/.autobyteus/server-data`; ignored test DB/runtime under existing test paths; no development-specific root exists.
- Relevant model/serialization/physical-store change: None.
- Normal readers/writers: existing server migration/vault startup reads the DB named by AppConfig; Electron owns packaged target; tests own test targets.
- Direct-use evidence: `Yes` — new empty development DB/key can be created by existing startup with no data transformation.
- Physical/privacy/disposal constraints: development DB and adjacent key are one pair; both remain ignored and must be reset together; production/test state must not be touched.
- Migration benefit/cost/risk: no migration benefit; copying any existing data would violate isolation.
- Existing migration framework constraints: existing startup migrations apply naturally to the new development DB; no ticket-specific data migration.

## Constraints / Dependencies / Compatibility Facts

- New ticket is based only on latest tracked `origin/personal`; prior finalized worktree is excluded.
- Root launcher must use real built server and Nuxt dev entrypoints.
- Fixed loopback endpoints follow current repository conventions.
- Templates contain no credentials; existing vault/Settings/importer remain authoritative.
- Cross-platform file permissions may be best-effort where the OS lacks POSIX modes, but path confinement/symlink rejection remains required.
- No compatibility alias is supported by repository evidence.

## Open Unknowns / Risks

No blocking requirement unknown remains besides user approval.

Implementation/review risks:

- Define a stable frontend readiness probe and ensure Nuxt cannot auto-select another port unnoticed.
- Preserve primary failure exit status through cleanup.
- Make shutdown idempotent and process-owned across platforms.
- Classify any pre-existing deterministic E2E failure downstream instead of silently narrowing assertions.

## Notes For Implementation And Code Review

No implementation authority exists. After approval and architecture-reviewed design, downstream should expect a narrow operational diff: root scripts, development template/launcher/tests, clean removal of manual launchers, ignore rules, and docs. Any provider/vault/runtime/Electron/Docker change is presumptively out of scope and requires a new design-impact reroute.
