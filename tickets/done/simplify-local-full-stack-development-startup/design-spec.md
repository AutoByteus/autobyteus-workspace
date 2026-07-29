# Design Spec — Simplify Local Full-Stack Development Startup

## Current-State Read

The dedicated task worktree is `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup` on branch `codex/simplify-local-full-stack-development-startup`, based on refreshed `origin/personal@153f3409cd90207f9219cbe20242606271b36104`.

The current root command surface makes `test-support/live-e2e` the owner of manual full-stack development:

- `pnpm dev:test` builds `autobyteus-server-ts`, invokes `run-test-dev.mjs`, starts the built backend on `127.0.0.1:8000`, and starts Nuxt on `127.0.0.1:3000`.
- `pnpm server:test` and `pnpm web:test` start manual halves of the same stack.
- None of those commands owns an assertion suite. The manual stack materializes the strict test template into `autobyteus-server-ts/tests/.tmp/live-e2e-runtime/.env` and uses test-owned database state.
- Deterministic server E2E already has an assertion owner in Vitest, `tests/setup/prisma-*`, and per-test fixtures. Real-provider E2E already has an explicit runner and remains separate.
- The built server already accepts `--data-dir` before AppConfig initialization. AppConfig reads `<data-dir>/.env`, but parent environment values take precedence. It also accepts ambient `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_TEMP_WORKSPACE_DIR`, and `AUTOBYTEUS_MEMORY_DIR` path values, so data isolation cannot be complete if those values are inherited unchanged.
- Nuxt development already derives its HTTP proxy from `BACKEND_NODE_BASE_URL` and allows explicit WebSocket endpoint overrides. The existing combined launcher only supplies the base URL, so a parent endpoint override can still redirect a WebSocket.
- Electron and Docker have independent production data ownership and are not coupled to the manual test launchers.

The target therefore needs a new development owner, not a server or frontend architecture change. It must preserve the existing built backend, Nuxt development entrypoint, test bootstrap, application database/vault behavior, provider/runtime behavior, Electron data selection, and Docker topology.

## Intended Change

Replace the misleading manual test-labelled launchers with one root-owned `pnpm dev` command. The root script builds the real server and invokes a dedicated `scripts/development/run-dev.mjs` supervisor. That supervisor owns:

1. repository-root resolution from its own module URL;
2. strict validation and safe materialization of `autobyteus-server-ts/.env.development` into `<repo>/.autobyteus/development/server-data/.env`;
3. canonical backend data-path and frontend routing environment;
4. fixed-port preflight and readiness checks;
5. backend/frontend child lifecycle, bounded cleanup, deliberate signal handling, and exit-status preservation.

Add root `pnpm test:e2e` as the deterministic assertion command, retaining its existing Vitest test-owned database/runtime lifecycle. Retain `pnpm test:e2e:real:preflight` and `pnpm test:e2e:real` as explicit real-provider commands. Remove `pnpm dev:test`, `pnpm server:test`, `pnpm web:test`, and their three manual-only launcher files with no aliases or compatibility wrappers.

The committed development template remains exactly four non-secret keys. The generated runtime `.env` may retain existing product-managed non-launcher settings, but the launcher always replaces the seven keys it owns:

- `APP_ENV`
- `DB_TYPE`
- `DATABASE_URL`
- `AUTOBYTEUS_SERVER_HOST`
- `AUTOBYTEUS_LOG_DIR`
- `AUTOBYTEUS_MEMORY_DIR`
- `AUTOBYTEUS_TEMP_WORKSPACE_DIR`

The last three are generated as paths below the development data root. This is required because current AppConfig and the memory package accept ambient path overrides independently of `--data-dir`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Approved In-Scope Use Case(s) | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | `UC-001`, `UC-002`, `UC-003`, `UC-008`, `UC-009` | Operational | `REQ-001`, `REQ-006`–`REQ-008`, `REQ-011`; `AC-001`, `AC-003`, `AC-005`, `AC-009`, `AC-010`, `AC-013` | Developer runs `pnpm dev` from the repository root or via `pnpm --dir <repo> dev` | Current `pnpm dev:test` and `run-test-dev.mjs` start the real stack but provide no assertions and use test ownership (`BEH-001`) | `pnpm dev` becomes the sole accurately named full-stack development command, with the same real backend/Nuxt outcome and explicit full readiness | `DS-001` development primary; `DS-003` return/event; `DS-004` materialization |
| `BEH-002` | `UC-003`, `UC-004`, `UC-005`, `UC-010` | Operational | `REQ-002`–`REQ-006`, `REQ-012`, `REQ-013`; `AC-002`–`AC-007`, `AC-011`, `AC-013` | Development start, existing Settings action, existing explicit importer, or documented stopped-stack reset | Current manual stack writes test runtime and test DB (`BEH-002`); AppConfig derives DB/key/data paths from `--data-dir` and current database location logic | Development state is persistent and confined to `<repo>/.autobyteus/development/server-data/`; credentials remain in the selected DB/vault and reset is explicit only | `DS-001`, `DS-004`; the existing Settings/importer paths remain authoritative after startup |
| `BEH-003` | `UC-006`, `UC-007` | Operational | `REQ-009`, `REQ-010`; `AC-004`, `AC-008`, `AC-012` | Operator runs root deterministic E2E or existing explicit real-provider E2E command | Vitest setup owns deterministic reset/per-test state; `run-live-e2e.mjs` owns explicit real-provider state (`BEH-003`) | Root `pnpm test:e2e` executes deterministic assertions only; real-provider commands retain their separate test-owned runtime and opt-in semantics | `DS-002` deterministic-test primary; existing real-E2E runner remains outside the new dev owner |
| `BEH-004` | `UC-001`, `UC-002`, `UC-003`, `UC-008` | Contract | `REQ-002`–`REQ-006`; `AC-002`, `AC-004`–`AC-007`, `AC-011` | `pnpm dev` invokes the launcher under normal or hostile parent/cwd/template conditions | `app.ts` accepts `--data-dir`; AppConfig loads the selected `.env` but prefers parent environment, and path settings can escape that data dir (`BEH-004`) | Launcher resolves one canonical root from `import.meta.url`, validates the four-key template, canonicalizes DB URL, forces seven owned keys, rejects unsafe path/symlink conditions, and leaves tracked templates byte-identical | `DS-004` bounded materialization; `DS-001` backend launch |
| `BEH-005` | `UC-001`, `UC-008`, `UC-009` | System | `REQ-007`, `REQ-008`; `AC-001`, `AC-009`, `AC-010` | Fixed-port bind, backend/frontend readiness, child exit, SIGINT, or SIGTERM | Current launcher awaits only the backend marker, reports frontend as starting, and has incomplete process-tree guarantees (`BEH-005`) | Preflight both ports, wait for backend and frontend readiness on exact endpoints, stop only owned children, and distinguish deliberate shutdown from failure | `DS-001` primary; `DS-003` return/event; `DS-005` bounded lifecycle |
| `BEH-006` | `UC-004`, `UC-005`, `UC-006`, `UC-007` | Contract | `REQ-004`, `REQ-009`, `REQ-010`, `REQ-012`, `REQ-014`; `AC-004`, `AC-008`, `AC-011`, `AC-012` | Existing Settings/importer or test template/runtime contract | Vault credentials are stored in the selected application DB; committed templates are non-secret and importer target is explicit (`BEH-006`) | No plaintext credential import or provider/vault/runtime change; development, deterministic test, real-provider test, and production state remain distinct | `DS-001`, `DS-002`; existing credential and vault owners remain behind their current boundaries |

Every approved use case is represented above. No synthetic or mechanically possible use case is added.

## Material Design Premises (Only When Needed)

| Premise ID | Related Behavior ID(s) | Initiating Basis Kind (`User`/`System`/`Operational`/`Contract`) | Independent Product-Supported Trigger Or Applicable Contract And Support Evidence | Forward Production Path To Claimed State | Lifecycle Preconditions And Material Consequence | Reachability (`Reachable`/`Not Reachable`/`Unclear`) | Design Consequence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MP-001` | `BEH-005` | Operational | A developer-supported `pnpm dev` invocation is an independent trigger; the fixed loopback port may already be occupied by another normal local process | Root script -> launcher port preflight -> bind probe | If `8000` or `3000` is unavailable, partial startup would be misleading and could orphan children | Reachable | Probe both ports before child launch; fail nonzero without killing or attaching to the occupant |
| `MP-002` | `BEH-005` | System | A launched backend/frontend child is an independent system event after `pnpm dev` starts it | Child spawn -> readiness wait or child `close` -> supervisor cleanup | A real child may exit before readiness or unexpectedly after readiness; leaving the peer alive violates the command owner contract | Reachable | Supervisory owner records the first failure, stops the peer, and preserves a nonzero result |
| `MP-003` | `BEH-004` | Operational | The supported shell invocation can include parent environment variables; AppConfig's documented precedence makes them effective | Launcher child env -> AppConfig/Nuxt config -> redirected DB/path/endpoint | Ambient routing/data-path values could redirect development state or frontend WebSockets | Reachable | Force only the seven launcher-owned backend keys and all fixed frontend backend endpoint keys; retain unrelated environment |
| `MP-004` | `BEH-005` | Operational | SIGINT/SIGTERM is the supported terminal/process-manager stop action for a running `pnpm dev` owner | Signal -> launcher supervisor -> owned child groups -> child exit -> launcher exit | Repeated signals or a stuck child must not leave a process behind or affect unrelated processes | Reachable | Idempotent bounded TERM, escalation to KILL only for still-running owned process/group, deliberate exit result |
| `MP-005` | `BEH-004` | Operational | The contract explicitly supports fail-closed handling of a managed-root symlink/path escape rather than following arbitrary filesystem redirection | Launcher path validation -> lstat/realpath checks -> either materialize or fail | A symlinked managed file/directory or escaped DB URL could write outside the ignored root | Reachable | Reject before child startup; do not repair, delete, or follow the unexpected target |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `./development-startup-contract.md` | Exact command, environment, data ownership, materialization, readiness, lifecycle, credential, reset, and non-goal contract | `REQ-001`–`REQ-014`; `AC-001`–`AC-013` | Intended-behavior authority that fixes the seven launcher-owned keys and the clean-cut command surface | Approved for design; intended behavior and therefore approval-applicable |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`, `Refactor`, and `Cleanup`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `File Placement Or Responsibility Drift`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`
- Evidence: Test support currently owns a real manual development stack, test-labelled root commands have no assertion owner, and the stack writes test-owned state. Nuxt endpoint overrides are not fully fixed by the current wrapper. AppConfig path overrides permit ambient logs/memory/temp-workspace locations outside the selected data directory.
- Design response: Create a dedicated development subsystem under `scripts/development`, keep test support as the test owner, strengthen the new launcher’s environment and lifecycle boundary, and remove misleading manual launchers rather than wrapping or aliasing them.
- Refactor rationale: The requested behavior is fundamentally about separating operational ownership and data lifecycles; a local rename alone would leave the test owner and test state coupled to development.
- Intentional deferrals and residual risk, if any: No server/AppConfig redesign, no frontend API redesign, and no Electron/Docker change. The launcher enforces isolation at its child-environment boundary. Cross-platform process-tree behavior remains a bounded implementation risk and must be covered by platform-appropriate tests without broad process discovery.

## Terminology

- **Development data root**: `<repo>/.autobyteus/development/server-data/`, the only backend runtime data root selected by `pnpm dev`.
- **Tracked development template**: `autobyteus-server-ts/.env.development`, a four-key, credential-free declarative input. It is not the server runtime `.env`.
- **Launcher-owned key**: One of the seven backend keys that `pnpm dev` must replace in the child environment/runtime file, regardless of a parent shell or prior generated runtime value.
- **Owned child**: The backend Node process or frontend `pnpm` process group started by this launcher. Cleanup may signal only these handles/groups.

## Design Reading Order

The design is organized from current behavior and approved intent through production paths, ownership, boundaries, subsystem allocation, concrete files, transition/removal, and readiness. The primary design path is `DS-001`; `DS-002` preserves the independent test path; `DS-003`–`DS-005` add the return and bounded local details needed to make lifecycle and isolation reviewable.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove root scripts `dev:test`, `server:test`, and `web:test` from `package.json` with no aliases.
- Remove `test-support/live-e2e/run-test-dev.mjs`, `run-test-server.mjs`, and `run-test-web.mjs`. Their real test bootstrap is not removed because `run-live-e2e.mjs` and deterministic E2E continue to use it.
- Remove documentation that presents those commands as active and replace it with the new development/test command separation.
- Do not add a compatibility `dev:test` wrapper, an alias to `pnpm dev`, a fallback to `.env.test`, or a second development data path. Repository/history scan found no active consumers beyond the commands' own docs/scripts.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Existing packaged production DB/key and server data under `~/.autobyteus/server-data`; ignored test DB/runtime under `autobyteus-server-ts/tests/.tmp` and related test paths; no prior development root. New development state is a fresh SQLite DB and adjacent `.secret.key` below `<repo>/.autobyteus/development/server-data/db/`, plus normal server data directories. No existing user data is read or copied.
- Relevant code-model, serialization, semantic, or physical-store change: None. The design changes only command/configuration ownership and chooses a new empty `--data-dir`.
- Normal reader/writer behavior and representative evidence: Existing `AppConfig`, Prisma migration startup, vault bootstrap, and path consumers already operate from the selected `--data-dir`; `ApplicationDatabaseLocation` canonicalizes the absolute file URL and the adjacent vault key is derived from that DB. Electron’s data selection remains independent.
- Required semantics and invariants under direct use: Existing production/test data remains untouched; a development DB/key pair remains together across restart; all normal development runtime directories stay below the development root.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Development state is ignored, persistent by default, owner-private where the platform supports modes, and reset only by an explicit stopped-stack deletion of `<repo>/.autobyteus/development/`. No plaintext credentials are written by startup. Symlinks/path escapes fail closed.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: No existing persisted subject changes schema or meaning. Copying or migrating production/test state would violate isolation and add I/O/corruption risk without benefit. The new empty DB receives normal current migrations at first development start; no historical-schema branch is needed.
- Acceptance criteria or design constraints supported by this decision: `REQ-002`–`REQ-005`, `REQ-009`, `REQ-013`, `REQ-014`; `AC-002`–`AC-008`, `AC-012`.

### Migration Plan (Only When Decision Is `Migration Required`)

`N/A — decision is Not Affected; no migration boundary or historical-shape handling is introduced.`

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`, `BEH-002`, `BEH-004`, `BEH-005`, `BEH-006` | Root `pnpm dev` invocation | Browser-ready Nuxt app backed by the development server and isolated data root | Development launcher supervisor | Main supported development behavior and its data/process ownership |
| `DS-002` | Primary End-to-End | `BEH-003`, `BEH-006` | Root `pnpm test:e2e` invocation | Deterministic Vitest assertion result using test-owned state | Server test command/Vitest setup | Keeps assertions and test lifecycle separate from development startup |
| `DS-003` | Return-Event | `BEH-001`, `BEH-005` | Child readiness, child close, SIGINT, or SIGTERM | Peer cleanup and deliberate/failure launcher exit result | Development launcher supervisor | Makes failure propagation and owned shutdown explicit |
| `DS-004` | Bounded Local | `BEH-002`, `BEH-004`, `BEH-006` | Development materialization request | Canonical ignored runtime `.env` and validated path set | Development runtime materializer | Contains template/path/security transformations before AppConfig import |
| `DS-005` | Bounded Local | `BEH-005` | Fixed-port and endpoint readiness checks | Both exact loopback endpoints proven ready or a bounded failure | Development lifecycle supervisor | Prevents partial/alternate-port success claims |

## Primary Execution Spine(s)

- `DS-001`: `pnpm dev` -> root package build -> development launcher -> secure development materializer -> built server `dist/app.js --data-dir <development-data-root>` -> Fastify backend `127.0.0.1:8000` -> Nuxt development child `127.0.0.1:3000` -> browser application.
- `DS-002`: `pnpm test:e2e` -> server package `test` script -> Vitest `tests/e2e` selection -> existing `prisma-env` / global reset / per-test setup -> deterministic E2E assertions and result.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The root command performs the existing server build, then hands control to the development launcher. The launcher resolves its own repository location, materializes the isolated runtime, preflights ports, starts the built backend with an explicit absolute data directory, proves backend readiness, starts Nuxt with fixed backend routes, proves frontend HTTP readiness, and keeps both owned children alive until a deliberate stop or failure. | Root command boundary; development launcher; development runtime materializer; built backend; Nuxt development frontend; browser | Development launcher supervisor for lifecycle; server and Nuxt retain their existing product/runtime ownership | Root ignore rules; tracked template; child environment construction; filesystem confinement; readiness probes; process-group cleanup; docs |
| `DS-002` | The root test command delegates directly to the existing server package Vitest command with the E2E path. Vitest’s existing setup chooses `tests/.tmp/autobyteus-server-test.db`, resets it, and runs assertions; opt-in external/provider paths remain behind their current explicit commands and guards. | Root test command; server Vitest; test setup; E2E assertion files | Existing test setup and assertion files | Test DB reset, per-test fixtures, opt-in environment guards |
| `DS-003` | The supervisor observes the first meaningful lifecycle event. A child failure or readiness timeout becomes the primary nonzero result and triggers bounded peer termination. A user signal marks deliberate shutdown, forwards once to both owned children, escalates only still-running owned groups, and exits successfully after cleanup. | Child process handles; launcher supervisor; terminal exit status | Development launcher supervisor | Signal forwarding, close-event races, bounded timers, process-group handling |
| `DS-004` | The materializer validates the tracked four-key template, resolves the fixed development root from the launcher module, verifies regular non-symlink paths, canonicalizes the DB URL, creates owner-private directories, merges only retained product settings, writes runtime `.env` atomically, and re-reads the template bytes before returning the child environment. | Development runtime materializer; selected data root; runtime `.env` | Development runtime materializer | Parser, path confinement, symlink checks, atomic write, retained settings, seven owned keys |
| `DS-005` | Before children start, the supervisor proves both exact loopback ports can bind. After each child starts, it waits for the backend marker plus `/rest/health` and for an HTTP-success response from exact `http://127.0.0.1:3000`. It never accepts a different port as readiness. | Port checker; backend readiness probe; frontend readiness probe | Development lifecycle supervisor | TCP bind probe, output marker, bounded HTTP polling, timeout cleanup |

## Spine Actors / Main-Line Nodes

### `DS-001` main-line nodes

1. **Root command boundary** — receives the supported package command and runs the existing server build.
2. **Development launcher** — the sole coordinator for development child lifecycle, failure, signals, and readiness.
3. **Development runtime materializer** — the authoritative owner for the development data root, template validation, path confinement, and runtime environment file.
4. **Built backend** — existing server entrypoint and server/runtime owner; receives explicit `--data-dir` and fixed bind options.
5. **Nuxt development frontend** — existing frontend development entrypoint; receives fixed backend route environment and fixed bind options.
6. **Browser application** — consumer of the already-existing HTTP/WebSocket frontend/backend surfaces; no browser/API design change.

### `DS-002` main-line nodes

1. **Root test command boundary** — names and delegates deterministic assertions.
2. **Server Vitest command** — existing assertion runner and test process owner.
3. **Existing test setup** — existing reset/isolation owner.
4. **Deterministic E2E assertions** — existing behavior/contract verification.

## Ownership Map

| Main-line node | Concrete ownership |
| --- | --- |
| Root command boundary | Script naming and delegation only. It is a thin public package boundary, not a lifecycle owner. |
| Development launcher | Development process lifecycle, fixed endpoint contract, failure/exit semantics, signal handling, and coordination order. It must not own server business behavior, credentials, or test assertions. |
| Development runtime materializer | Repository-root/data-root identity, tracked-template validation, path confinement, runtime `.env` merge/write, seven owned keys, and template immutability proof. It must not discover production/test files or import credentials. |
| Built backend | Existing AppConfig, Prisma migrations, vault bootstrap, HTTP/API, runtime, and all application data semantics below the explicit data root. It remains the authoritative owner of server behavior. |
| Nuxt development frontend | Existing Nuxt build/dev lifecycle and frontend route consumption. It receives routing configuration but does not choose the development backend. |
| Browser application | Existing user-facing UI behavior. No new UI owner or API surface is introduced. |
| Server Vitest/test setup | Existing deterministic assertion, reset, fixture, and test-runtime ownership. It must not depend on the development launcher. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Root `pnpm dev` script | `scripts/development/run-dev.mjs` | Conventional one-command developer entrypoint | Data parsing, process cleanup, assertions, or alternate fallback paths |
| Root `pnpm test:e2e` script | Existing `autobyteus-server-ts` `test` script plus Vitest setup | Conventional assertion command | Development server startup, frontend supervision, or real-provider capabilities |
| `scripts/development/run-dev.mjs` module entry | Development launcher implementation in the same module | Node executable boundary | Server configuration/business logic or test-state reuse |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Root `dev:test` script | Its name claims test semantics while it starts a manual stack and couples development to test state | Root `dev` script -> `scripts/development/run-dev.mjs` | In This Change | No alias |
| Root `server:test` script | Manual backend half has no assertion owner and duplicates lifecycle entry | Root `dev` supervisor for full stack; test runner for assertions | In This Change | No alias |
| Root `web:test` script | Manual frontend half creates a competing partial-stack owner | Root `dev` supervisor for full stack | In This Change | No alias |
| `test-support/live-e2e/run-test-dev.mjs` | Test support must no longer own development lifecycle | `scripts/development/run-dev.mjs` | In This Change | Preserve actual test bootstrap |
| `test-support/live-e2e/run-test-server.mjs` | Manual test-labelled backend wrapper is obsolete | Existing real-E2E runner or `pnpm dev` as appropriate | In This Change | Do not create `server:dev` |
| `test-support/live-e2e/run-test-web.mjs` | Manual test-labelled frontend wrapper is obsolete | `pnpm dev` supervisor | In This Change | Do not create `web:dev` |
| Old README command sections | They teach removed commands and test-state reuse | Updated root/server/secret-management docs | In This Change | Remove stale references, retain test-runtime detail where still applicable |

## Return Or Event Spine(s) (If Applicable)

`DS-003`: `backend/frontend readiness or child close or SIGINT/SIGTERM -> launcher event handler -> primary result classification -> signal/kill only the other owned child/group -> bounded wait -> terminal exit status`.

The first abnormal child result wins. A later cleanup result cannot overwrite it. A signal received before startup completes is treated as deliberate shutdown only if no primary startup failure has already been recorded. Repeated signals are idempotent; they do not launch a second cleanup or change the selected result.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: **Development runtime materializer**. Chain: `tracked template bytes -> strict parser -> canonical root/path checks -> directory creation -> retained runtime settings -> seven owned assignments -> atomic `.env` write -> template byte re-read`. This matters because the server must not import AppConfig until the template, data path, and runtime file are proven safe.
- Parent owner: **Development lifecycle supervisor**. Chain: `fixed port bind probe -> backend spawn/marker/health -> frontend spawn/HTTP probe -> steady-state supervision -> bounded stop`. This matters because full-stack readiness and cleanup are the launcher’s actual contract, not incidental child output.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Template parser/validator | `DS-004` | Development runtime materializer | Validate exact keys, values, no interpolation, no credentials, and template immutability | Prevent unchecked config input | Materializer would become an opaque parser/launcher blob |
| Path confinement checks | `DS-004` | Development runtime materializer | Reject symlink/escape and prove DB/key/runtime paths remain inside root | Enforce ignored-root invariant | A generic filesystem cleaner could delete or follow unrelated paths |
| Runtime `.env` assignment merger | `DS-004` | Development runtime materializer | Retain non-launcher product settings and replace exactly seven owned keys | Preserve allowed state without sourcing files | Parent launcher would become a second config owner |
| Port/readiness probes | `DS-005` | Development lifecycle supervisor | Probe exact ports and HTTP/marker readiness with bounded polling | Prevent partial or alternate-port success | Backend or frontend would incorrectly own cross-process readiness |
| Child process-group signal adapter | `DS-003` | Development lifecycle supervisor | TERM/KILL owned groups on POSIX and child fallback on Windows | Avoid orphaned pnpm/Nuxt descendants without process discovery | A global process killer would violate ownership and safety |
| Root `.gitignore` and server `.gitignore` entries | `DS-001`, `DS-004` | Repository workflow | Ignore generated development state while tracking the four-key template | Prevent runtime files entering source control | Launcher would need to own repository tracking policy |
| Documentation command/data map | `DS-001`, `DS-002` | Root/server/secret-management docs | Explain command boundaries, URLs, paths, credentials, reset | Make operational ownership discoverable | Launcher code comments cannot replace user-facing workflow docs |

## Ownership Boundaries

1. **Package command -> development launcher**: the root script only delegates after the existing backend build. The launcher is the authoritative development lifecycle boundary.
2. **Development launcher -> materializer**: the launcher asks the materializer for a validated runtime descriptor. It must not reconstruct template parsing or path decisions itself.
3. **Materializer -> filesystem**: the materializer owns only the fixed repository-local development root and its known children. It never searches home, package production state, test templates, or current cwd-derived candidates.
4. **Launcher -> built backend/Nuxt**: the launcher supplies explicit command arguments and child environment. It must not reach inside AppConfig, Nuxt internals, or server business services.
5. **Test command -> Vitest setup**: `pnpm test:e2e` delegates to the existing test owner. It must not call the development materializer or start a manual frontend.
6. **Credentials -> existing Settings/importer/vault**: startup only creates the selected empty/current DB through normal server startup. It never reads credential assignment files or imports from production/home state.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Development launcher | Child handles, readiness state, signal state, result classification | Root `pnpm dev` and lifecycle tests | Root script directly spawning backend and frontend or a caller independently stopping one child | Strengthen launcher options/test seams; do not add another coordinator |
| Development runtime materializer | Template parser, root/path checks, retained assignment merge, atomic write | Development launcher | Launcher or tests independently reading `.env.test`, `.env.example`, home `.env`, or writing runtime `.env` | Expose one descriptor-returning materialization function |
| Existing server `AppConfig`/runtime | `.env` load, DB location, migrations, vault, server startup | Built server entrypoint | Development launcher importing server config classes or modifying server source for local paths | Pass explicit `--data-dir` and owned env only |
| Existing test setup/Vitest | Test DB selection/reset, fixture lifecycle, assertions | Root `pnpm test:e2e` and test files | Development launcher sharing test root or tests calling development runtime | Keep test APIs and roots test-owned |
| Existing Settings/importer/vault | Credential recognition, encryption, target validation | Developer after `pnpm dev`, explicit importer caller | Launcher reading assignment files or inventing a dev import wrapper | Use existing subject-specific APIs/explicit DB URL |

## Dependency Rules

- `package.json` may depend on `scripts/development/run-dev.mjs` and the existing server package command; it must not depend on test support for `pnpm dev`.
- `scripts/development/run-dev.mjs` may depend on `development-runtime.mjs`, Node standard-library process/net/fs/url modules, and the existing built server/Nuxt package entrypoints.
- `development-runtime.mjs` may depend on Node filesystem/path/url modules only. It must not import application config, Prisma, vault, frontend, or test bootstrap.
- The development launcher may pass values to the built backend and Nuxt but may not call internal backend/frontend APIs directly.
- `pnpm test:e2e` may depend on the server package’s existing Vitest setup; it must not depend on `scripts/development` or production/Electron data paths.
- `test-support/live-e2e/test-runtime-bootstrap.mjs` remains a test owner and must not be imported by development code.
- No code may use `process.cwd()` to resolve the development root. Caller cwd is an input only for package resolution, not data selection.
- No code may search for or kill unrelated processes. Process cleanup requires the child handle/PID created by this launcher.
- No generic “environment manager,” “server manager,” or compatibility fallback is introduced; names remain concrete to development runtime and process supervision.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Root `pnpm dev` | Development startup command | Build and enter the canonical full-stack development owner | No user selector; fixed repository-local target | Thin package boundary |
| `materializeDevelopmentRuntime()` | Development runtime materializer | Return validated root, template, DB URL, runtime env path, child backend env, and fixed endpoint descriptor | No external path/selector; derives from module URL | No caller-supplied data root or template path |
| `startDevelopmentStack()` / launcher entry | Development lifecycle | Preflight, start, await readiness, supervise, stop owned children | Fixed `127.0.0.1:8000` and `127.0.0.1:3000` | May expose test-only dependency injection for child/probe functions without changing production identity |
| Root `pnpm test:e2e` | Deterministic E2E command | Run existing `tests/e2e` assertions via server package Vitest | Existing Vitest CLI path/flags only | Does not own dev startup |
| Existing `pnpm test:e2e:real(:preflight)` | Real-provider E2E command | Keep explicit capability runner and test runtime | Existing scenario argument/env contract | No change in this design |
| Existing `pnpm secrets:import -- --database-url <absolute-file-url>` | Explicit credential importer | Import to exactly the operator-selected DB | Absolute SQLite file URL | No automatic development target inference |
| Documented `rm -rf .autobyteus/development` from repo root while stopped | Development reset operation | Delete only the repository-local development state | Fixed path, no selector | Documentation-only operational action; no automatic reset |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `pnpm dev` | Yes | Yes | Low | Keep one fixed command and target |
| `materializeDevelopmentRuntime()` | Yes | Yes | Low | Derive all identity from module location; reject caller path overrides |
| `startDevelopmentStack()` | Yes | Yes | Low | Keep fixed endpoints and injectable mechanics only for tests |
| `pnpm test:e2e` | Yes | Yes | Low | Delegate to existing test path; no mode guessing |
| `secrets:import` | Yes | Yes | Low | Preserve explicit `--database-url` subject boundary |
| Reset command | Yes | Yes | Low | Hard-code one bounded development path and stop precondition |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Development startup owner | `development launcher` | Yes | Could drift into generic server manager | Keep names `run-dev` / `development runtime` |
| Config/data materializer | `development runtime materializer` | Yes | Could become generic environment framework | Restrict to `.env.development` and the fixed root |
| Lifecycle owner | `development stack supervisor` | Yes | Could be confused with managed messaging supervisor | Keep scope to the two children started by `pnpm dev` |
| Test owner | Existing Vitest/test setup | Yes | Could be coupled to dev launcher | Preserve `test-support` and server test ownership |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Built backend entrypoint and data-dir contract | `autobyteus-server-ts` startup/AppConfig | Reuse | Already owns server data, migrations, vault, and listen behavior | N/A |
| Nuxt dev entrypoint and route variables | `autobyteus-web` Nuxt config | Reuse | Already owns frontend development server and endpoint consumption | N/A |
| Strict test template parser/materialization patterns | `test-support/live-e2e` | Reuse patterns, not code ownership | Proven validation/atomic-write patterns apply, but test paths and test semantics must not leak into dev | A new dev materializer is necessary because the target root/template/ownership differ |
| Process-group cleanup pattern | Existing web E2E browser probe | Reuse pattern | Existing local code proves detached POSIX process-group handling and bounded escalation | N/A |
| Development command/process/data owner | No current capability | Create New | Current owner is test support and is the root problem | No existing area should own both persistent dev state and test assertions |
| Deterministic assertion command | Existing server Vitest | Extend root command surface | Assertions and isolation already belong there | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Root workspace command surface | `dev`, `test:e2e`, removal of misleading scripts | `DS-001`, `DS-002` | Package boundary; development launcher; Vitest | Extend | No coordination logic in `package.json` beyond build/delegate |
| Development startup | Root resolution, data-root materialization, child lifecycle, endpoint readiness | `DS-001`, `DS-003`–`DS-005` | Development launcher/materializer | Create New | Narrow `scripts/development` owner |
| Server application runtime | Server CLI, AppConfig, Prisma, vault, server API | `DS-001` | Existing server `app.ts`/runtime | Reuse | No source change expected |
| Frontend development runtime | Nuxt process, proxy, WebSocket endpoint consumption | `DS-001` | Existing Nuxt config | Reuse | Launcher supplies fixed env only |
| Automated server E2E | Vitest assertions, test DB/reset/fixtures | `DS-002` | Existing test setup | Extend | Add root command only; no dev coupling |
| Repository workflow/docs | Ignore rules, command/data/credential/reset documentation | All | Root/server/secret-management docs | Extend | Narrow operational docs sync |
| Packaged production / Docker | Home data root and container topology | Preservation only | Existing Electron/Docker owners | Reuse unchanged | Diff guard against accidental scope expansion |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/development/run-dev.mjs` | Development startup | Development stack supervisor | Root entry, child start/readiness/signal/exit lifecycle | One process owner must coordinate both children and result classification | Uses runtime descriptor; no shared test structure |
| `scripts/development/development-runtime.mjs` | Development startup | Development runtime materializer | Template parser, path confinement, runtime `.env`, child env descriptor | Filesystem/config ownership is distinct from process lifecycle | Reuses patterns from test bootstrap, not its code |
| `scripts/development/run-dev.test.mjs` | Development startup verification | Test boundary for development owner | Parser/path/env/lifecycle regression tests | One durable test file can exercise exported pure seams and subprocess scenarios | No |
| Root `package.json` | Workspace command surface | Thin command boundary | Add `dev`/`test:e2e`, remove `*:test` | Existing script registry is the one command authority | N/A |
| `autobyteus-server-ts/.env.development` | Server template/configuration | Development template contract | Four exact non-secret declarative assignments | One committed template is the reviewed input | N/A |
| Root `.gitignore` | Repository workflow | Tracked-state policy | Ignore `.autobyteus/development/` | Root owns repository-local generated state | N/A |
| `autobyteus-server-ts/.gitignore` | Server workflow | Template/runtime tracked-state policy | Unignore tracked `.env.development` | Server owns `.env.*` policy | N/A |
| Root/server/secret docs | Documentation | Operational documentation boundaries | Replace command and data ownership guidance | Each doc owns its existing audience/context | N/A |
| `test-support/live-e2e/run-test-*.mjs` | Test support | Obsolete manual wrappers | Remove three files | They no longer have an owner after command removal | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Fixed backend/frontend endpoint descriptor | `scripts/development/development-runtime.mjs` exported frozen descriptor | Development startup | Materializer and supervisor need one canonical identity for root/ports/routes | Yes | Yes | A global environment schema or application config model |
| Child lifecycle result / shutdown state | Local types/objects in `run-dev.mjs` | Development startup | Supervisor events and cleanup need one result shape | Yes | Yes | A cross-project process manager |
| Test runtime template structure | Existing test bootstrap | Test support | Test-only current owner | N/A | N/A | A shared dev/test environment framework |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Development runtime descriptor | Yes: workspace root, data root, DB URL/path, runtime env path, owned env, fixed endpoints | Yes | Low | Keep it immutable and local to `scripts/development` |
| Supervisor result state | Yes: primary outcome, deliberate signal, child handles, cleanup status | Yes | Low | Keep lifecycle state private to launcher |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/development/run-dev.mjs` | Development startup | Stack supervisor | Entry, fixed-port probes, backend/frontend child lifecycle, readiness, signal/exit behavior | Process coordination and result classification must have one owner | Consumes descriptor from `development-runtime.mjs` |
| `scripts/development/development-runtime.mjs` | Development startup | Runtime materializer | Fixed-root identity, strict template parsing, path/symlink checks, retained env merge, atomic write, child env | Config/data ownership is independent of process event handling | No test-runtime import; pattern-informed only |
| `scripts/development/run-dev.test.mjs` | Development startup verification | Durable development test boundary | Unit and subprocess checks for target behavior | Keeps security/path/lifecycle regression evidence near owner | Uses test fixtures only |
| Root `package.json` | Workspace command surface | Thin command boundary | `dev`, `test:e2e`, removals | One command registry | N/A |
| `autobyteus-server-ts/.env.development` | Development configuration | Committed template boundary | Four exact non-secret keys | Declarative input only | N/A |
| Root `.gitignore` | Repository workflow | Generated-state policy | Ignore development root | Correct physical owner for root-local state | N/A |
| `autobyteus-server-ts/.gitignore` | Server workflow | Env template policy | Track `.env.development`, ignore generated `.env` | Correct physical owner for server templates | N/A |
| `README.md` | Workspace docs | Root developer workflow | Canonical commands, URLs, data/credential/reset distinction | Root audience needs complete flow | N/A |
| `autobyteus-server-ts/README.md` | Server docs | Server developer workflow | Server/test/vault details and explicit importer target | Server audience needs local runtime specifics | N/A |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Secret-management docs | Credential boundary | Explain non-secret templates and explicit development DB importer target | Keeps credential ownership in its subsystem docs | N/A |

## Applied Patterns (If Any)

- `test-support/live-e2e/test-runtime-bootstrap.mjs`: strict assignment parsing, canonical URL/path validation, atomic owner-private runtime `.env` writing, template byte immutability checks, readiness marker polling, and child stop timeouts. These are patterns only; the new development module must not import test roots or use `.env.test`.
- `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs`: detached POSIX process-group signaling, bounded TERM/KILL escalation, and process-group exit verification. Adapt only the ownership-safe mechanics for the two development children.
- Existing Nuxt configuration: `BACKEND_NODE_BASE_URL` plus explicit backend WebSocket variables. Reuse the existing endpoint names rather than creating a new frontend configuration contract.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/development/` | Folder | Development startup subsystem | Isolate developer-only materialization and lifecycle code | Keeps development ownership distinct from `test-support` and product runtime | Test runtime bootstrap, provider/vault logic, generic environment framework |
| `scripts/development/development-runtime.mjs` | File | Development runtime materializer | Resolve fixed root, validate template, confine paths, write runtime env, build child env descriptor | One concrete filesystem/config concern | Child process event loop or assertions |
| `scripts/development/run-dev.mjs` | File | Development stack supervisor | Build-complete entry, port/readiness checks, child lifecycle, signal/exit | One concrete process/lifecycle concern | Template parsing, DB/vault/business logic |
| `scripts/development/run-dev.test.mjs` | File | Development test boundary | Durable unit/subprocess regression checks | Co-located with the owned scripts | Product E2E assertions or production data |
| `autobyteus-server-ts/.env.development` | File | Development template | Four exact non-secret assignments | Server package owns its env templates | Credentials, extra settings, generated absolute DB path |
| `autobyteus-server-ts/tests/.tmp/` | Existing Folder | Test setup | Deterministic/real test state | Preserve existing test owner | Development state |
| `.autobyteus/development/` | Generated Folder | Development runtime | Ignored persistent state under the repo | Makes ownership and reset boundary visible | Production/test state or tracked source |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/development/` | Main-Line Domain-Control plus off-spine materialization | Yes | Low | Two files separate process lifecycle from filesystem/runtime config without artificial subsystem sprawl |
| `test-support/live-e2e/` | Test support / bounded test lifecycle | Yes after removal | Low | Retains only assertion/test-runtime concerns |
| `.autobyteus/development/` | Persistence / runtime state | Yes | Low | Generated state is below one explicit ignored root |
| `autobyteus-server-ts/` | Product runtime plus templates | Yes | Low | Only a committed development template is added; server source remains unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Command ownership | `pnpm dev -> scripts/development/run-dev.mjs -> backend + Nuxt` and `pnpm test:e2e -> server Vitest -> assertions` | `dev:test`, `server:test`, and `web:test` all reach into test support and share a runtime | Makes command names, assertion ownership, and state ownership truthful |
| Runtime isolation | `DATABASE_URL=file:/abs/repo/.autobyteus/development/server-data/db/development.db` plus the three canonical path keys below the same root | Copy `.env.test` or read root `.env` and let parent `DATABASE_URL`/path variables win | Prevents cross-mode data mutation and ambient redirection |
| Process cleanup | Spawn detached owned children, signal their own group/handle, await bounded exit, escalate only the still-running owned group | `pkill -f node`, kill a port owner, or search the process table | Demonstrates the ownership-safe cleanup boundary |
| Readiness | Backend marker + `/rest/health` and exact frontend `http://127.0.0.1:3000` HTTP success | Print `TEST_WEB_STARTING` and accept whichever port Nuxt chooses | Prevents a false full-stack-ready report |
| Template handling | Parse four exact tracked assignments, set seven launcher-owned runtime values, preserve unrelated product settings, atomically write generated `.env`, re-read template bytes | `cp .env.test .env`, source it, or mutate the tracked template | Keeps declarative templates and runtime state separate |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| `dev:test` alias to `dev` | Could reduce disruption for developers with old muscle memory | `Rejected` | Remove script and update docs; repository scan found no active consumer outside its own workflow |
| Retain `server:test`/`web:test` wrappers | Could preserve separate-terminal workflows | `Rejected` | One canonical full-stack owner; use package-native specialist commands only when needed, with no root partial-stack authority |
| Import/reuse `test-runtime-bootstrap.mjs` directly | Could avoid duplicate validation code | `Rejected` | New dev-specific materializer reuses patterns but owns a different template/root/lifecycle; test support remains test-owned |
| Fall back to `.env.test`, `.env.example`, root `.env`, or home `.env` | Could make startup work when development template/runtime is missing | `Rejected` | Fail closed with stable validation/path error; only `.env.development` and canonical generated runtime are inputs |
| Random port fallback | Could make startup work when a fixed port is occupied | `Rejected` | Preflight fixed ports and fail nonzero; URLs and frontend route contract remain deterministic |
| Generic environment manager or server manager | Could centralize future modes | `Rejected` | Keep a narrow development runtime materializer and stack supervisor; no new cross-mode abstraction |

## Derived Layering (If Useful)

The useful explanation is a boundary sequence rather than a generic layered architecture: `root command boundary -> development supervisor -> development materializer / owned child processes -> existing server/Nuxt owners -> browser`. The test path is parallel and independent: `root test command -> existing Vitest setup -> assertions`. No higher boundary skips an owner to reach an internal lower-level concern.

## Change / Refactor Sequence

1. Update the approved requirements/investigation/contract authority to record the seven launcher-owned backend keys required by the current AppConfig path behavior. This upstream correction is complete before implementation handoff.
2. Add the new tracked template, root ignore entry, server template allow-list entry, and the two development modules/tests. Keep the generated development root absent from source control.
3. Add root `dev` and deterministic `test:e2e` scripts. Remove the three root manual test scripts in the same change so no duplicate command surface is temporarily retained beyond the local edit sequence.
4. Implement the runtime materializer first: module-relative root, strict template parser, confinement, retained runtime settings, seven owned values, atomic write, byte re-read, and descriptor tests.
5. Implement the supervisor: fixed-port preflight, backend spawn/readiness, frontend spawn/readiness, exact route env, owned process-group cleanup, signal/idempotency, and exit semantics.
6. Remove the three obsolete manual launcher files and all documentation references that claim they are active. Preserve `test-runtime-bootstrap.mjs`, `run-live-e2e.mjs`, `.env.test`, and real-provider documentation as test-owned.
7. Add/adjust durable tests and implementation-scoped checks. Downstream API/E2E decides which broader scenarios should be executed and whether additional test code is warranted.
8. Verify diff scope against the preservation list: no Electron, Docker, provider, vault, importer, server API, or Nuxt API changes. Route any such change as `Design Impact` before implementation continues.

No temporary compatibility seam is required. No persisted-data migration occurs.

## Key Tradeoffs

- **Dedicated development code versus importing test bootstrap:** a small amount of focused validation/lifecycle code is duplicated structurally, but ownership remains truthful and test state cannot leak into development. Sharing a generic mode framework would increase coupling and path ambiguity.
- **Seven owned backend environment keys versus preserving every ambient setting:** owning the data/path keys is necessary for the explicit isolation requirement; all unrelated variables remain inherited, preserving developer customization outside the selected runtime paths.
- **Fixed ports versus random fallback:** fixed ports make frontend routing, browser probes, documentation, and failure diagnosis deterministic. Occupied ports fail before partial startup.
- **Absolute generated DB URL versus changing AppConfig:** materializing the canonical URL uses existing server behavior and avoids a product runtime redesign.
- **Full HTTP readiness versus marker-only readiness:** the backend marker is retained as the existing startup signal and paired with a health probe; the frontend requires exact-port HTTP success so readiness is meaningful without inventing a new API.

## Risks

- **Cross-platform process trees:** POSIX detached groups can be signaled as a unit; Windows needs child-handle fallback and bounded verification. Tests must avoid claiming POSIX-only guarantees on Windows.
- **Symlink races:** preflight lstat/realpath checks reduce path-redirection risk; implementation should use exclusive temporary writes and post-write checks, but no generic filesystem sanitizer is introduced.
- **Nuxt compile timing:** frontend readiness timeout must be long enough for a clean checkout while remaining bounded; timeout is a launcher failure and cleans the backend.
- **Existing deterministic E2E failures:** adding the root command exposes existing suite behavior but must not hide or narrow assertions. API/E2E will classify failures with exact command context.
- **Generated runtime settings:** retained product-managed non-launcher assignments are intentionally preserved inside the development root; they are never sourced by the launcher and do not change production/test state.

## Implementation Readiness (Mandatory)

- Status: `Implementation Ready`
- Approved use-case and behavior-map coverage: `Pass` — all ten approved use cases map to `BEH-001`–`BEH-006`, and every behavior has approved requirement/acceptance references.
- Production-path and data-flow-spine coverage for every mapped use case and behavior: `Pass` — `DS-001` spans command, materializer, server, frontend, and browser; `DS-002` spans deterministic test command through assertions; `DS-003`–`DS-005` cover return, materialization, port, and readiness lifecycle paths.
- Complete shared-design-principles validation: `Pass` — behavior/production reality, spine span, ownership/boundaries, off-spine placement, dependency direction, explicit identities, reuse, tight structures, path/file responsibility, no compatibility retention, no migration, removal, and proportionality were rechecked.
- Corrections made and affected checks repeated: Updated requirements, contract, and investigation notes to make ambient log/memory/temp path overrides part of the seven launcher-owned keys; repeated behavior-map, isolation, and boundary checks against current `AppConfig` and memory path code. Confirmed dedicated worktree/base remains authoritative.
- Remaining non-blocking risks: Cross-platform process-tree details, symlink race hardening, frontend readiness timing, and pre-existing deterministic E2E failures; all have proportional downstream checks.
- Blocking requirement, evidence, or design gaps: `None`

## Guidance For Implementation

- Work only in `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup` on `codex/simplify-local-full-stack-development-startup`.
- Treat `requirements.md`, `investigation-notes.md`, `development-startup-contract.md`, and this design spec as authoritative. Do not infer behavior from old `dev:test` docs after they are removed.
- Implement no product server/frontend/Electron/Docker/provider/vault/importer changes. A need for one is a design-impact reroute.
- Keep module-relative fixed-root resolution and seven-key ownership explicit. Do not use `process.cwd()` for data selection, read `.env.test`/`.env.example`/home `.env`, or add aliases/random ports.
- Preserve non-launcher runtime assignments inside the canonical generated development `.env`, but never source that file in the launcher.
- Use the existing server build and Nuxt dev entrypoints. Readiness must prove exact `127.0.0.1:8000` and `127.0.0.1:3000`; output must never contain credentials or vault contents.
- Maintain the cumulative artifact package and produce `implementation-handoff.md` only in the implementation stage. After implementation source review and API/E2E pass, downstream test-code review and delivery continue through the team flow.
