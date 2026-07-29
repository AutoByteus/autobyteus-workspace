# Requirements — Simplify Local Full-Stack Development Startup

## Status (`Design-ready`)

`Design-ready — the user-authorized ticket request approved this investigation-backed requirements basis and linked development startup contract for design work. Implementation, API/E2E, and delivery remain downstream responsibilities.`

## Goal / Problem Statement

Provide one conventional local-development command, `pnpm dev`, that starts the real AutoByteus backend and frontend against persistent repository-local development data. Keep automated E2E execution under an assertion-running `pnpm test:e2e` command, and keep both development and test state isolated from packaged Electron production data.

The current `pnpm dev:test` name is misleading: it starts a manual real backend/frontend stack and does not execute assertions. The final interface must separate development startup from test execution without redesigning the server, encrypted vault, providers, runtimes, Docker, or Electron.

Task context:

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup`
- Branch: `codex/simplify-local-full-stack-development-startup`
- Latest tracked base used at bootstrap: `origin/personal@153f3409cd90207f9219cbe20242606271b36104`
- Intended-behavior supplement: [Development Startup Contract](./development-startup-contract.md)
- Evidence: [Investigation Notes](./investigation-notes.md)

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
|---|---|---|---|---|
| `BEH-001` | Root `pnpm dev:test` builds the server and runs a real backend plus Nuxt frontend, but executes no assertion suite | `pnpm dev` is the sole accurately named full-stack development command | Real built backend and Nuxt development application behavior | `REQ-001`, `REQ-006`, `REQ-011`; `AC-001`, `AC-013` |
| `BEH-002` | The manual stack reuses `.env.test`, `tests/.tmp/live-e2e-runtime`, and `autobyteus-server-ts/db/test.db` | Development uses persistent ignored `<repo>/.autobyteus/development/server-data/`; tests retain separate state | Packaged Electron alone defaults to `~/.autobyteus/server-data` | `REQ-002`–`REQ-005`, `REQ-014`; `AC-002`–`AC-007` |
| `BEH-003` | Deterministic E2E files run through Vitest; opt-in real-provider E2E already has explicit root commands | `pnpm test:e2e` runs deterministic assertions; real-provider commands remain explicit | Existing test semantics, opt-ins, evidence scanning, and fixture ownership | `REQ-009`, `REQ-010`; `AC-008` |
| `BEH-004` | Server parses `--data-dir` before AppConfig reads `<data-dir>/.env`, but AppConfig prefers parent environment values and supports ambient log/temp/memory path overrides | One root launcher selects an immutable development location, safely materializes `.env`, and replaces its seven owned routing/data-path keys | General shell inheritance and AppConfig behavior outside this launcher | `REQ-002`–`REQ-006`; `AC-004`–`AC-006` |
| `BEH-005` | Current combined launcher uses fixed ports and owns both children, but claims only web “starting,” not ready | New launcher proves both endpoints ready, rejects occupied fixed ports, propagates failure, and shuts down only owned children | Backend `8000` and frontend `3000` local defaults | `REQ-007`, `REQ-008`; `AC-001`, `AC-009`, `AC-010` |
| `BEH-006` | Provider credentials are encrypted in the selected application DB; `.env.test` is non-secret; importer requires explicit target | Development/test templates remain credential-free; existing Settings/importer provision the selected database | Vault, importer, provider, and runtime contracts | `REQ-004`, `REQ-010`, `REQ-012`, `REQ-014`; `AC-004`, `AC-011`, `AC-012` |

## Investigation Findings

1. `dev:test`, `server:test`, and `web:test` are manual launch commands, not test assertion owners; repository references are confined to their scripts/launchers/documentation.
2. Server CLI data-dir selection already occurs before AppConfig initialization, so a root launcher can own development location without changing server architecture.
3. AppConfig resolves relative SQLite URLs against the server app root and prefers parent `process.env`; therefore the generated development `.env` needs an absolute database file URL and the launcher must replace only its four owned keys.
4. Existing test support already demonstrates strict template validation, atomic owner-private materialization, template immutability, explicit `--data-dir`, backend readiness, and bounded server control. A current-state check also found that `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_MEMORY_DIR`, and `AUTOBYTEUS_TEMP_WORKSPACE_DIR` can be supplied by the parent environment; the development launcher must own these path keys to make the stated all-data-under-root isolation invariant true.
5. The server E2E directory contains deterministic Vitest coverage with test-owned setup; the existing real-provider runner is a distinct opt-in external capability path.
6. Electron already owns `~/.autobyteus/server-data` and passes its own explicit `--data-dir`; no Electron source change is needed.
7. Nuxt already supports a fixed backend base plus specific WebSocket endpoint variables; no web API redesign is needed.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
|---|---|---|---|---|---|
| [development-startup-contract.md](./development-startup-contract.md) | Intended-behavior command/configuration/data/process contract | `REQ-001`–`REQ-014` | `AC-001`–`AC-013` | Ready for user review; approval required | Makes the approved command surface, materialization, isolation, supervision, E2E, credential, and reset outcomes exact |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`, `Refactor`, and `Cleanup`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`.
- Refactor posture: `Likely Needed` in this change.
- Evidence basis: manual development is owned by `test-support/live-e2e`, consumes test configuration/state, and uses test-labelled root commands. Development, test, and process lifecycle ownership are coupled even though the real product stack already has stable server/web entrypoints.
- Requirement or scope impact: create one narrow development launcher and remove three misleading manual test commands; retain existing server, frontend, test, vault, importer, Electron, and Docker owners.

## Recommendations

1. Add a small root development launcher under `scripts/development/` that reuses current server/web entrypoints and adapts proven test materialization/supervision patterns.
2. Add strict credential-free `.env.development`; generate one ignored development `.env` with a canonical absolute SQLite URL.
3. Preserve normal developer shell inheritance, replacing only launcher-owned environment/routing keys.
4. Add root `pnpm test:e2e` as a deterministic assertion command, retain explicit real-provider E2E commands, and remove manual `*:test` launchers without aliases.
5. Keep one canonical full-stack development command; do not add root `server:dev`/`web:dev` coordination alternatives.
6. Update only command/configuration/data-root documentation and ignore rules; do not broaden into product/runtime redesign.

## Scope Classification (`Medium`)

The change is operationally bounded but crosses root scripts, a new launcher, a new committed template, test command wiring, ignore rules, and documentation. It does not require a product API, database schema, provider, runtime, Docker, or Electron redesign.

## In-Scope Use Cases

- `UC-001` Developer starts the complete local stack from the repository root.
- `UC-002` Developer invokes the root command through an explicit repository directory from another cwd.
- `UC-003` Developer stops and restarts the stack while retaining development data.
- `UC-004` Developer configures provider credentials through existing Settings against the development database.
- `UC-005` Developer imports approved credentials explicitly into the development database using the existing importer target argument.
- `UC-006` Test operator runs deterministic E2E assertions against isolated test state.
- `UC-007` Test operator runs opt-in real-provider preflight/execution against the dedicated test runtime.
- `UC-008` Developer receives an occupied-port or child-start failure without an orphaned partial stack.
- `UC-009` Developer shuts down the owned stack with SIGINT/SIGTERM.
- `UC-010` Developer deliberately resets only repository-local development state while the stack is stopped.

## Out of Scope

- Encrypted one-application-database vault redesign or schema change.
- Provider, model, Gemini, Claude, Codex, custom-provider, importer, or credential mapping behavior changes.
- Automatic credential import from user, production, or ambient files.
- Docker or packaged Electron data-root behavior changes.
- Backend hot-reload design, random-port fallback, profiles, or a general-purpose environment manager.
- Reuse or reopening of the finalized Secure Centralized Secret Provisioning worktree.

## Functional Requirements

- `REQ-001` The root package must expose `pnpm dev` as the sole canonical command for starting the complete real local development stack.
- `REQ-002` The development launcher must derive the repository root from its own module location, not `process.cwd()`, and select exactly `<repo>/.autobyteus/development/server-data/` as its absolute backend data directory.
- `REQ-003` Development runtime state, including `.env`, SQLite database, adjacent vault root key, logs, memory, workspaces, and other server data, must remain inside the ignored development root and persist across normal restarts.
- `REQ-004` A committed `autobyteus-server-ts/.env.development` must contain exactly the approved non-secret development keys and remain byte-identical. The launcher must validate it and materialize an owner-private runtime `.env` atomically rather than copy it unchecked.
- `REQ-005` The launcher must canonicalize `DATABASE_URL` to an absolute SQLite file URL under `<development-data-root>/db/development.db`. Parent `DATABASE_URL`, `APP_ENV`, `DB_TYPE`, `AUTOBYTEUS_SERVER_HOST`, caller cwd, root `.env`, `.env.test`, `.env.example`, and symlink/path escape must not redirect the selected development target.
- `REQ-006` The launcher must start the real built backend with an explicit absolute `--data-dir` and the real Nuxt development server against that backend. It must force launcher-owned routing and data-path keys to the canonical development targets while leaving unrelated developer shell environment behavior unchanged. Launcher-owned backend keys are `APP_ENV`, `DB_TYPE`, `DATABASE_URL`, `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_MEMORY_DIR`, and `AUTOBYTEUS_TEMP_WORKSPACE_DIR`.
- `REQ-007` Backend `127.0.0.1:8000` and frontend `127.0.0.1:3000` are the default development endpoints. An occupied required port or child startup failure must fail truthfully and return nonzero; no silent alternate port is allowed.
- `REQ-008` SIGINT/SIGTERM and abnormal child exit must trigger bounded shutdown of both owned children without killing unrelated processes. Normal deliberate shutdown must not be reported as a startup/runtime failure.
- `REQ-009` Root `pnpm test:e2e` must execute deterministic E2E assertions using existing test-owned isolated database/runtime lifecycles. It must not target development or packaged-production state. Existing opt-in `pnpm test:e2e:real:preflight` and `pnpm test:e2e:real` remain separate.
- `REQ-010` The committed `.env.test` remains the strict non-secret source for the real full-server E2E bootstrap. `.env.example` remains a deployment/packaged-production example and must not be a development input.
- `REQ-011` Root `dev:test`, `server:test`, and `web:test`, their manual-only launchers, and their documentation must be removed without compatibility aliases because repository evidence shows no active consumers beyond their own documentation/scripts.
- `REQ-012` Development credentials must be configured through the existing Settings UI or existing `pnpm secrets:import` with an explicit absolute development database URL. No development/test startup command may read or import credentials automatically.
- `REQ-013` Documentation must define exact commands, fixed URLs, development/test/production data ownership, credential provisioning, occupied-port behavior, and a bounded reset command that deletes only `<repo>/.autobyteus/development/` while the development stack is stopped.
- `REQ-014` No implementation change may alter packaged Electron `~/.autobyteus/server-data`, Docker startup, vault schema/crypto, provider/model/runtime behavior, importer semantics, or the contents of production/test data.

## Acceptance Criteria

- `AC-001` From a clean checkout after `pnpm install --frozen-lockfile`, root `pnpm dev` builds/starts the real backend and frontend without manual `.env` copying and reports both readiness URLs.
- `AC-002` A first development start creates only ignored state beneath `<repo>/.autobyteus/development/server-data/`, including `.env`, `db/development.db`, and `db/development.db.secret.key` when vault initialization requires it.
- `AC-003` After a clean stop and restart, `pnpm dev` reopens the same development database and vault key, preserving development configuration.
- `AC-004` The tracked `.env.development`, `.env.test`, and `.env.example` remain byte-identical before/after startup, tests, restart, and cleanup.
- `AC-005` From the root and through `pnpm --dir <repo> dev` from an alternate cwd, launcher path resolution selects the same canonical development root.
- `AC-006` Hostile parent launcher-owned variables, including database, routing, log, memory, and temp-workspace paths, a root `.env`, `.env.test`, `.env.example`, and relative/symlink escape attempts cannot redirect development state or frontend backend endpoints.
- `AC-007` `pnpm dev` does not read, write, migrate, or clean `~/.autobyteus/server-data` or any existing packaged-production database/key.
- `AC-008` `pnpm test:e2e` executes E2E assertions and uses test-owned database/runtime locations distinct from development and production; real external-provider scenarios remain opt-in under their explicit commands.
- `AC-009` Occupying port `8000` or `3000`, backend startup failure, or frontend startup failure produces a stable nonzero result and leaves no owned child running.
- `AC-010` SIGINT and SIGTERM terminate both children cleanly; repeated shutdown is idempotent and does not affect unrelated processes.
- `AC-011` Tracked scans show no credential value in development/test/deployment templates and no automatic import path from home-directory or production files.
- `AC-012` Source/diff and focused regression evidence show no changes to Electron data-path selection, Docker, vault/provider/runtime/importer behavior, or unrelated product surfaces.
- `AC-013` Documentation accurately distinguishes development startup, deterministic E2E, real-provider E2E, credential provisioning, and bounded development reset.

## Constraints / Dependencies

- Node/pnpm workspace installation must be available; the standard clean-checkout prerequisite is `pnpm install --frozen-lockfile`.
- The root launcher must use existing production server/Nuxt entrypoints rather than mocks or a development-only backend.
- Existing AppConfig environment precedence is not redesigned; the launcher owns its exact routing variables locally.
- No investigation or validation may open production database/vault values or credential-bearing files.
- The new ticket remains isolated from the finalized prior ticket worktree.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: existing packaged-production data under `~/.autobyteus/server-data`; existing ignored test data; new ignored development data under `<repo>/.autobyteus/development/server-data`.
- Required outcome: `Not Affected` for existing data; new development state is initialized through normal current application startup.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve all existing production/test state unchanged; no transformation, copy, deletion, or quarantine.
- Unacceptable data loss or corruption: any access/mutation of packaged-production data by development/test commands; any automatic deletion of development/test data; mismatched development DB/key reuse.
- Availability/rollout constraints: development reset is explicit and stack-stopped; fixed-port conflict fails before partial startup.
- Related IDs: `REQ-002`–`REQ-005`, `REQ-009`, `REQ-013`, `REQ-014`; `AC-002`–`AC-008`, `AC-012`.

## Assumptions

- Local development uses loopback backend/frontend endpoints and SQLite, matching current repository conventions.
- The existing server build command remains the correct way to produce the real backend entrypoint.
- Existing deterministic E2E files remain valid under the existing test setup; final test selection/coverage evidence remains owned by `api_e2e_engineer`.
- Existing UI and importer remain sufficient to provision development credentials after the development DB exists.

## Risks / Open Questions

No blocking requirement question remains other than user approval.

Non-blocking implementation risks to address in design/review:

- Cross-platform symlink and file-permission behavior must fail safely without claiming unsupported guarantees.
- Frontend readiness needs one stable bounded probe that does not mistake an auto-selected alternate Nuxt port for success.
- Shutdown must preserve the original abnormal child result instead of being overwritten by cleanup outcomes.
- The deterministic E2E command may expose pre-existing suite failures; those must be classified downstream rather than hidden by narrowing the command without evidence.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
|---|---|
| `REQ-001` | `UC-001`, `UC-002` |
| `REQ-002` | `UC-001`, `UC-002`, `UC-003`, `UC-010` |
| `REQ-003` | `UC-003`, `UC-004`, `UC-005`, `UC-010` |
| `REQ-004` | `UC-001`, `UC-002`, `UC-003` |
| `REQ-005` | `UC-001`, `UC-002`, `UC-003`, `UC-008` |
| `REQ-006` | `UC-001`, `UC-002`, `UC-008`, `UC-009` |
| `REQ-007` | `UC-001`, `UC-008` |
| `REQ-008` | `UC-008`, `UC-009` |
| `REQ-009` | `UC-006`, `UC-007` |
| `REQ-010` | `UC-006`, `UC-007` |
| `REQ-011` | `UC-001`, `UC-006` |
| `REQ-012` | `UC-004`, `UC-005` |
| `REQ-013` | `UC-001`, `UC-004`–`UC-010` |
| `REQ-014` | `UC-001`–`UC-010` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
|---|---|
| `AC-001` | Clean-checkout full-stack start and both readiness endpoints |
| `AC-002` | First-start filesystem/database/key confinement scan |
| `AC-003` | Stop/restart and persistent development state proof |
| `AC-004` | Tracked-template before/after byte comparison |
| `AC-005` | Root and alternate-cwd root-package invocation |
| `AC-006` | Hostile parent/cwd/env/template/symlink redirection matrix |
| `AC-007` | Sentinel/hash monitoring of packaged-production path with no content read |
| `AC-008` | Deterministic E2E execution plus development/test/production path isolation |
| `AC-009` | Backend port, frontend port, build/start, and child-failure matrix |
| `AC-010` | SIGINT/SIGTERM, repeat-stop, escalation, and unrelated-process preservation |
| `AC-011` | Value-safe tracked-source/template/import-trigger scan |
| `AC-012` | Diff scope scan and focused preservation tests |
| `AC-013` | Documentation command/path/credential/reset verification |

## Approval Status

`Approved for design by the user's explicit instruction to continue working on this ticket when the solution designer judges it sound. The linked intended-behavior supplement is approved as the requirements authority, including the clarified seven launcher-owned backend keys. The mandatory design specification and SR-001 solution baseline are now authorized; implementation remains downstream of an Implementation Ready handoff.`
