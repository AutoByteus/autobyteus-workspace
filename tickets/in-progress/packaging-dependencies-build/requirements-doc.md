# Requirements Document — autobyteus-345 (packaging, dependencies and build)

## Document Status

- Status: `Approved` (SR-001), within the direction. No decision needs the user: the Task and the Project Task Manager (for the user, 2026-11-01) ask for the merged small problems to be checked, decided and solved, and let the Solution Designer drop an item that is already fixed, no longer applies or is not worth the effort. Item 3 of the original description (a smaller Docker release, which changes `RELEASE.md`) is the user's decision and is **not** part of this work.
- Current solution revision ID: `SR-001`
- Package identifier: `packaging-dependencies-build`
- Request / ticket: Project Task `autobyteus-345` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); merged in: 227, 230, 231, 169, 201, 164, 168, 251 (full texts: `task-bundle-packaging.md`); follow-ups FU-005 and FU-008 of autobyteus-305 (`task-follow-ups-305.md`).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Requirements owner: Solution Designer. Approval: the Solution Designer within the direction (user informed through the Project Task Manager's relay of 2026-11-01).
- Behavior-defining supplements: none. Evidence: `investigation-notes.md`, `evidence/measurements.md`.

## Problem And Desired Outcome

- Problem: the packaged server (desktop and Docker) carries content it never reads (tests, sources, internal ticket notes, docs, development packages: 153 MB of 827 MB, measured); installs for release builds do not follow the committed lockfile (a package published minutes before a build broke a Windows build); the desktop build leaves a stray folder in the server package; a dead workflow, an out-of-date generated GraphQL file and undeclared dependencies sit in the repository.
- Desired outcome: release artifacts contain only what runs, are built from the committed lockfile (or, where npm must be used, from versions published before the commit), and the repository is free of the leftovers. Nothing a user sees changes.
- Observable success: a clean-clone build of the server package is about 18% smaller and passes the packaged-server startup check; every install in a release build uses the lockfile; `git status --ignored` after a desktop server build shows nothing under `autobyteus-server-ts/`; the generated GraphQL file equals what codegen prints for the current schema.

## Disposition of the merged items (checked against the code on 2026-11-01)

| Item | Disposition | Evidence |
| --- | --- | --- |
| FU-005 / 227 (problem 2): `files` list for the server package | **Do** (REQ-001) | Deploy carries `src/`, `tests/`, `tickets/`, `docs/`…: M-1 |
| 227 (problem 1): development packages in the macOS/Linux/Docker server | **Do** (REQ-002) | The scripts deploy without `--prod`: M-1, M-3 |
| FU-008: Windows staging `npm install` ignores the lockfile | **Do** (REQ-003, REQ-004) | M-4, M-5 |
| 231: Docker image installs `--no-frozen-lockfile` with 8 of 12 manifests | **Do** (REQ-003) | M-5 |
| 201: stray `autobyteus-server-ts/autobyteus-web/…` after the desktop build | **Do** (REQ-005) | Reproduced: M-6 |
| 230: dead nested `autobyteus-web/.github` workflow | **Do** (REQ-006) | File exists, referenced by nothing |
| 164: `generated/graphql.ts` behind the schema | **Do** (REQ-007) | +102 lines of drift today: M-7 |
| 251: undeclared imports, unused `@nuxtjs/apollo` | **Do, reduced** (REQ-008): `jsdom` no longer applies | M-8 |
| 169: onnxruntime-web files in the Docker image | **Dropped: already fixed** | `Dockerfile.monorepo:57` runs the shared pruning script (commit `01c56f1b95`): M-10 |
| 168: server downloads honour `HTTP(S)_PROXY` | **Dropped from this ticket; recorded as follow-up FU-002** | The fix is a launch-time Node setting in three launchers (desktop, Docker, Android) each needing a proxy-only test; no user report in five weeks; Node provides the mechanism (`NODE_USE_ENV_PROXY=1`, verified in M-9) |
| Item 3 (smaller Docker release) | **Not part of this work** | The user's decision; changes `RELEASE.md` |

## Relevant Current And Desired Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Operational | The server package built by `pnpm deploy` holds the whole server folder and dev packages | It holds `dist`, `prisma`, `application-packages`, `package.json`, `LICENSE`, `README.md` and production packages only | The server starts, migrates and serves exactly as before; Docker server-package description and signing |
| BEH-002 | Operational | `pnpm install --no-frozen-lockfile` re-resolves in desktop and Docker builds; Windows staging runs a floating `npm install` | Installs follow `pnpm-lock.yaml`; the Windows staging install takes nothing published after the checkout's commit | Build outputs' content apart from BEH-001 |
| BEH-003 | Operational | A desktop server build leaves `autobyteus-server-ts/autobyteus-web/resources/server/node_modules/.bin` | Nothing is left outside `autobyteus-web/resources` | The packaged app |
| BEH-004 | Contract | A dead workflow, a stale generated file, undeclared imports | Removed / current / declared, with a repeatable command and a check | Web behavior |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Build the server package for the desktop (macOS, Linux, Windows) and for the Docker image | SCN-001…SCN-004 |
| UC-002 | Regenerate and check the web GraphQL types | SCN-005 |
| UC-003 | Declare imported packages; remove the dead workflow | SCN-006 |

### Out Of Scope

- A smaller Docker release (item 3); changing `RELEASE.md`.
- Server downloads and proxies (FU-002), the `autobyteus-web` Docker/devcontainer files (reported only).
- Changing what the desktop app or the server does at run time; the Electron version, signing, or release versioning.
- Making Windows `npm install` identical to the lockfile (REQ-004 is a bound, not an identity).

### Non-Goals

Faster builds, a smaller `node_modules` beyond dev packages, a new CI test workflow (the repository has only release workflows).

### Preserved Behavior Boundary

Packaged server startup on all targets; Prisma client generation and engine checks; node-pty handling; the onnxruntime-web pruning; the signed server package contents' description (`describe-server-package.mjs`); `RELEASE.md`.

### Prerequisites

None.

### Review Authority

Findings must cite a REQ/AC/BEH ID. New behavior is a `Requirement Gap`.

## Requirements

| ID | Requirement | Behaviors | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | `autobyteus-server-ts/package.json` has a `files` list so that every server package carries only `dist`, `prisma`, `application-packages` (plus the files npm/pnpm always include). The unreferenced `canuse-ok.txt` is removed. | BEH-001 | Must | FU-005, 227 |
| REQ-002 | The packaged server (desktop macOS/Linux, Docker) is made with production dependencies only. A package the running server needs (the Prisma CLI that runs migrations) is declared as a production dependency, not a development one. | BEH-001 | Must | 227 |
| REQ-003 | Every install of a release build follows `pnpm-lock.yaml`: the Docker image and `prepare-server.sh`/`.mjs` use `--frozen-lockfile`; the five installs of `release-desktop.yml` use `--frozen-lockfile`; the Docker image copies the manifest of every workspace importer of the lockfile. A source check fails when a manifest is missing or a `--no-frozen-lockfile` returns. | BEH-002 | Must | FU-008, 231 |
| REQ-004 | The Windows staging `npm install` takes no package published after the commit time of the checkout (`--before`); a variable overrides the time for a rebuild of an older commit; when neither is available the build stops with a clear message. | BEH-002 | Must | FU-008 |
| REQ-005 | After the desktop server preparation nothing remains under `autobyteus-server-ts/` that the build created; the mirrored `…/autobyteus-web/…` folder that `pnpm deploy` leaves is removed by the scripts that deploy. | BEH-003 | Must | 201 |
| REQ-006 | `autobyteus-web/.github/workflows/desktop-tag-build.yml` is removed after confirming nothing refers to it; other nested leftovers of archived standalone repositories are listed. | BEH-004 | Should | 230 |
| REQ-007 | `autobyteus-web/generated/graphql.ts` is regenerated from the current schema; one command prints the schema in-process (no running app, no user data) and regenerates, and one command checks for drift and fails on it; the commands are documented. | BEH-004 | Must | 164 |
| REQ-008 | The packages the code imports are declared where they are imported: `graphql-tag`, `vue`, `vue-router` in `autobyteus-web`; `@autobyteus/application-backend-sdk` in the server's development dependencies; `@nuxtjs/apollo` is removed; a check fails on a newly undeclared import. | BEH-004 | Should | 251 |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | List the files the server package would carry (`npm pack --dry-run`) | Nothing under `src/`, `tests/`, `tickets/`, `docs/`, `docker/`, `scripts/`; `prisma/` and `package.json` present; `canuse-ok.txt` gone | Test |
| AC-002 | REQ-001, 002 | Clean-clone build of the deployed package, `prisma generate`, packaged-server startup check | Startup passes; the folder is 18% smaller or more than the base (827 MB measured) and holds no `src/`, `tests/`; no vitest, typescript, @types in its `node_modules` | Real build + `verify-packaged-server-startup.mjs` |
| AC-003 | REQ-002 | Declared dependencies | `prisma` is under `dependencies`; the lockfile importer agrees | Test |
| AC-004 | REQ-003 | Source check | No `--no-frozen-lockfile` in the Dockerfile, `prepare-server.*`, `release-desktop.yml`; every lockfile importer's `package.json` is copied by the Dockerfile; `pnpm install --frozen-lockfile` passes on the clean clone | Test + clean-clone run |
| AC-005 | REQ-003 | Docker builder stages | The image's builder installs from the lockfile and the server-package stage builds and starts | Real Docker build of the stages up to the server package |
| AC-006 | REQ-004 | Windows staging command | The `npm install` call carries `--before=<time>`; the time comes from the override or the commit; missing both stops the build; a unit test covers the three cases; a build-only desktop release run on Windows passes | Test + build-only run |
| AC-007 | REQ-005 | `git status --ignored` after `prepare-server.sh` | Nothing under `autobyteus-server-ts/` besides `dist/` (and the same after `prepare-server.mjs` rehearsal) | Real run |
| AC-008 | REQ-006 | Reference search | No reference to the removed workflow; list of other leftovers in the report | Search |
| AC-009 | REQ-007 | Schema command then codegen then the check | The regenerated file is committed; the check passes; the check fails on a deliberately stale file (mutation) | Run + mutation |
| AC-010 | REQ-008 | Import check | No hidden-hoist-only import remains for the listed packages; `@nuxtjs/apollo` is gone; web typecheck, web specs and server unit suites pass; the lockfile changes only by these | Run |
| AC-011 | Preserved | Existing suites and the packaged startup of the three desktop targets via a build-only release run | Unchanged results | Existing suites + build-only run |

## Relevant Scenarios And Journeys

| ID | Kind | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | A release builds the desktop app on macOS/Linux | Smaller server, lockfile installs, no stray folder | Supported Normal Scenario | M-1…M-6 |
| SCN-002 | Operational | A release builds the desktop app on Windows | Lockfile pnpm install; staging npm install bounded by the commit time | Supported Normal Scenario | M-4 |
| SCN-003 | Operational | A release builds the Docker image and the signed server package | Frozen install, all manifests, production deploy | Supported Normal Scenario | M-5 |
| SCN-004 | Operational | A developer rebuilds an older commit | `AUTOBYTEUS_NPM_BEFORE` (REQ-004) gives the time | Supported Explicit Edge Scenario | Task FU-008 |
| SCN-005 | Operational | A developer changes the server schema | Regenerate, check | Supported Normal Scenario | M-7 |
| SCN-006 | Operational | A developer adds an import | The check names an undeclared package | Supported Normal Scenario | M-8 |

## Decisions

| ID | Decision | Owner | Reasoning |
| --- | --- | --- | --- |
| DEC-1 | Drop 169 (fixed) and move 168 to a follow-up. | Solution Designer, within the Task's instruction | Evidence in the disposition table. |
| DEC-2 | Move `prisma` to `dependencies` instead of keeping it a development package and special-casing the deploy. | Solution Designer | The server runs `node_modules/prisma/build/index.js migrate deploy` at start (`startup/migrations.ts`): it is a production need; the Windows script already hard-codes this exception. |
| DEC-3 | Bound the Windows npm install with `--before` rather than a derived lockfile or the hoisted linker. | Solution Designer | The lockfile routes were tried and failed or re-resolved (M-4); `--before` is deterministic per commit, small and rehearsable. It is a bound, not identity, and says so. |
| DEC-4 | Change the five `--no-frozen-lockfile` installs of `release-desktop.yml` too. | Solution Designer | 231 asked to report it; FU-008's aim (no packages from minutes before a build) is not met while the workflow re-resolves; `RELEASE.md` already names the root lockfile canonical. Said here as the item asked. |
| DEC-5 | A source/contract check for each guarantee, no new CI workflow. | Solution Designer | The repository has no test workflow; the checks run with the existing unit/Python suites. |

## Assumptions / Unknowns

U-1: whether `pnpm 10.28.2`'s mirrored bin folder (M-6) is fixed in a newer pnpm; not needed (the scripts clean it). U-2: Windows behavior of the changed staging flow can be proven only by a build-only desktop release run on Windows (GitHub Actions); the plan includes it.

## Readiness Check

Requirements are stable, linked and testable; the scope is bounded by the disposition table.
