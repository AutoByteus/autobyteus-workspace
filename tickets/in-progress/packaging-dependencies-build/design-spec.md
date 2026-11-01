# Design Spec — autobyteus-345 (packaging, dependencies and build)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001, `Approved` by the Solution Designer within the direction (user informed through the Project Task Manager). Behavior-defining supplements: none.
- User approval of the design, when the direction requires it: `Not required` (the Task asks for the items to be checked, decided and solved; no product behavior, scope or `RELEASE.md` decision is open; the Project Task Manager's instruction of 2026-11-01).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build/tickets/in-progress/packaging-dependencies-build/investigation-notes.md` (F-01…F-10; measurements M-1…M-10 in `evidence/measurements.md`)
- Authorities read (2026-11-01): `architecture-design.md`, `design-principles.md`, `requirements-engineering.md`, `ticket-scope.md`; `DESIGN.md`, `GLOSSARY.md`, `TESTING.md`, `RELEASE.md`; `data_migration_guideline.md` (not applicable: no persisted data).
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

Three scripts make the server package from `pnpm deploy --legacy`: the Dockerfile's server-package stage (`Dockerfile.monorepo:53`), `prepare-server.sh` (macOS, Linux) and `prepare-server.mjs` (Windows, which then rebuilds `node_modules` with `npm install` in a staging folder). None passes `--prod`; the server's `package.json` has no `files`, so the whole folder is carried (M-1). The three also install with `--no-frozen-lockfile` (the two scripts through a lockfile test that looks in the wrong folder), as do the five installs of `release-desktop.yml` (M-5). pnpm 10.28.2's deploy leaves a mirrored `node_modules/.bin` folder (M-6). `generated/graphql.ts` is maintained by hand and is 102 lines behind (M-7). The scripts, the workflow and the Dockerfile are the owners of their steps; nothing here is structurally broken except that each repeats the "install, deploy, prepare" sequence in its own language (bash, Node, Dockerfile) because the platforms differ; this is existing and stays.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Medium** — about 20 files in `autobyteus-server-ts` (package, Dockerfile, schema script), `autobyteus-web` (two prepare scripts, package.json, a helper, a codegen script, generated file, docs, the removed workflow), `.github/workflows/release-desktop.yml`, the lockfile, `scripts/` (a check) and four test files; all within existing owners.
- Architectural risk: **High** — it changes what every desktop and Docker release ships and how every release installs; a wrong `files` list or `--prod` deploy would ship a server that does not start, and the Windows path cannot be run on the development machine (a build-only Windows run is needed). No persisted user data, no run-time code and no contracts change.
- Escalation trigger: the packaged-server startup check, the Docker server-package stage or the Windows build-only run fails because a package or folder is missing; or `pnpm install --frozen-lockfile` fails in the Docker builder with a subset of manifests.

## Architecture Investigation Evidence

See `investigation-notes.md` F-01…F-10 and `evidence/measurements.md`. Decisions map as: F-01…F-03 → D-1, D-2; F-04 → D-3, D-4; F-05 → D-5; F-06 → D-6; F-07 → D-8; F-08 → D-9; `RELEASE.md:351` (the root `pnpm-lock.yaml` is the canonical lockfile) supports D-3.

## Intended Change

Ship only what runs; install from the lockfile; bound the one install that cannot; clean the build; and remove or declare the leftovers.

## Design Decisions

| ID | Decision | Requirement |
| --- | --- | --- |
| D-1 | `autobyteus-server-ts/package.json`: `files: ["dist","prisma","application-packages"]`; `prisma` moves to `dependencies`; `canuse-ok.txt` removed | REQ-001, 002 |
| D-2 | `pnpm deploy --legacy --prod` in the Dockerfile, `prepare-server.sh` and the stage deploy of `prepare-server.mjs` | REQ-002 |
| D-3 | `--frozen-lockfile` for every install of a release build (Dockerfile, both prepare scripts, five workflow steps); the Dockerfile copies the manifest of every lockfile importer; the dead lockfile branches go | REQ-003 |
| D-4 | Source checks for D-2, D-3 and D-6 in one Python test file, with a mutation on a copy | REQ-003, 005 |
| D-5 | Windows staging: `npm install … --before=<time>`; time = `AUTOBYTEUS_NPM_BEFORE` else the commit time of the workspace HEAD else stop | REQ-004 |
| D-6 | After each `pnpm deploy`, the prepare scripts remove `autobyteus-server-ts/autobyteus-web` | REQ-005 |
| D-7 | Remove the nested workflow; list other leftovers (FU-001) | REQ-006 |
| D-8 | `print-graphql-schema.mjs`, `codegen:local`, `codegen:check`, regenerated file, documented | REQ-007 |
| D-9 | Declare the imported packages (`graphql-tag`, `vue`, `vue-router` in web; backend SDK in the server's devDependencies), drop `@nuxtjs/apollo`, add `check-declared-imports.mjs` with a test | REQ-008 |

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003; REQ-001…008.
- Derived consumers: the server package is read by the Docker starter and `describe-server-package.mjs` (`prisma/migrations`, `dist/app-data-migrations/migrations`, both kept), the desktop's Electron builder (`build.ts` copies `resources/server`), `verify-packaged-server-startup.mjs`; none reads a removed folder (M-2). The lockfile importer of the server changes by three lines (D-1). `generated/graphql.ts` is read by web code and web tests (types only added). Decision for each: no code change besides this list.
- Deliberately left alone: item 3 (smaller Docker release); proxies (FU-002); `autobyteus-web` Docker/devcontainer files (FU-001); `RELEASE.md` (its statements stay true: release runners "start from `pnpm install` alone", the root lockfile is canonical); `describe-server-package.mjs`; the Electron version and signing.
- Follow-ups: FU-001, FU-002 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirement / AC | Trigger | Existing behavior | Change / preserved | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, 002; AC-001…003 | A release builds the server package | Whole folder + dev packages | Runtime content only | DS-001 |
| BEH-002 | Operational | REQ-003, 004; AC-004…006 | A release installs | Floating | Lockfile; bounded npm | DS-001, DS-002 |
| BEH-003 | Operational | REQ-005; AC-007 | Desktop server preparation | Stray folder | Removed | DS-001, DS-002 |
| BEH-004 | Contract | REQ-006…008; AC-008…010 | A developer changes schema or imports | Hand edits, undeclared imports | Commands + checks | DS-003 |

## Relevant Supplemental Task Artifacts

`evidence/measurements.md` (evidence), `task-bundle-packaging.md`, `task-follow-ups-305.md` (inputs). None is behavior-defining.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`.
- Current design issue found: `Yes` — (a) a lockfile test in the wrong folder makes a safe branch unreachable and the unsafe one permanent (dead branch and wrong behavior); (b) three scripts keep a special case ("keep only Prisma in devDependencies") for a package that is a production need; (c) hand-maintained generated file.
- Structural triggers that fire: *Behavior by absence / dead branch* (the lockfile `else` branches are never taken or never right: Principle 13, 7); *Vocabulary/declaration drift* (undeclared dependencies: Principle 11, "declare what you import"). Ruled out: repeated coordination across the three build scripts — they differ by platform, and sharing code between bash, Node and Dockerfile has no honest common owner.
- Root cause classification: `Missing Invariant` (nothing enforces "the package holds only runtime content", "installs follow the lockfile", "imports are declared", "generated file is current").
- Refactor needed now: `Yes`, small — remove the dead lockfile branches and the Prisma special case; add one check per invariant.
- Design response: D-1…D-9 below; each invariant gets an automated check (Principle 6 "prove the result").
- Intentional deferrals and residual risk: Windows npm install is a bound, not an identity (DEC-3); verified only by a build-only run.

## Terminology

Per `GLOSSARY.md`; no new domain word. "Server package" is the existing term (`describe-server-package.mjs`).

## Legacy Removal Policy (Mandatory)

- Obsolete and removed: the `if [ -f "${SERVER_REPO_DIR}/pnpm-lock.yaml" ] … else --no-frozen-lockfile` branches in `prepare-server.sh` and the equivalent in `prepare-server.mjs`; `prepare-server.mjs`'s `devDependencies = {prisma}` special case and its `npm prune --omit=dev` step (the stage manifest has no development packages after D-2); `canuse-ok.txt`; the nested `autobyteus-web/.github/workflows/desktop-tag-build.yml`; `@nuxtjs/apollo` from the web package.
- Compatibility wrappers, dual paths, fallbacks kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`: build inputs and outputs only. No stored user data, no schema, no migration. The one data-like change is the lockfile (three lines for `prisma`, plus the declarations of D-9) which `pnpm install --lockfile-only` writes.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Governing owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 003 | A release job builds the server package (macOS, Linux; Docker) | A package that starts, in the Electron resources or the image | `prepare-server.sh` / `Dockerfile.monorepo` (each for its target) | The release path |
| DS-002 | Primary End-to-End | BEH-002, 003 | The Windows release job | The staged package with a rebuilt flat `node_modules` | `prepare-server.mjs` | The one install that cannot follow the lockfile |
| DS-003 | Bounded Local | BEH-004 | A developer changes the schema or an import | A current generated file; a failing check for drift or an undeclared import | `codegen-local.mjs`, `check-declared-imports.mjs` | Keeps the repository honest |

## Primary Execution Spine(s)

DS-001 (shell): `release-desktop.yml job -> pnpm install --frozen-lockfile (workspace) -> prepare-server.sh -> pnpm install --frozen-lockfile -> prisma generate -> server build -> web mobile build -> pnpm deploy --legacy --prod (files list applies) -> remove the mirrored bin folder -> clean workspace symlinks -> prisma generate in the package -> onnxruntime-web pruning -> electron-rebuild node-pty -> verify-packaged-server-startup (workflow step)`.

DS-001 (Docker): `Dockerfile builder: COPY all importer manifests -> pnpm install --frozen-lockfile -> COPY sources -> builds -> pnpm deploy --legacy --prod -> prisma generate -> onnxruntime-web pruning -> mobile-web copy -> describe-server-package -> image`.

DS-002: `release-desktop.yml Windows job -> pnpm install --frozen-lockfile -> prepare-server.mjs -> pnpm install --frozen-lockfile (server) -> build -> pnpm deploy --legacy --prod into the stage -> remove the mirrored bin folder -> remove the stage node_modules -> rewrite the stage manifest (workspace packages as packed tarballs, devDependencies empty) -> npm install --before=<time> -> prisma generate -> import validation -> prune prebuilds -> electron-rebuild`.

DS-003: `codegen:local: server schema script (in-process, temp HOME and data dir, writes the SDL file) -> graphql-codegen with the file as schema -> generated/graphql.ts`; `codegen:check`: the same into a temporary copy and a byte comparison; `check-declared-imports.mjs: scan imports of a package -> compare with its package.json -> exit 1 on a hidden-hoist-only import`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-spine concerns |
| --- | --- | --- | --- |
| DS-001 | The server's `package.json` states what is shipped (`files`) and what the running server needs (`prisma` among the production dependencies); `pnpm deploy --prod` applies both, so the package holds runtime content only; every install in the chain is frozen to the lockfile. | The build script for each target | Stray-folder cleanup |
| DS-002 | The same as DS-001 up to the deploy; Windows then needs a flat tree, which pnpm cannot produce from the lockfile (M-4), so `npm install` rebuilds it, bounded by the commit time. | `prepare-server.mjs` | The `--before` helper |
| DS-003 | Two small scripts and one check keep generated and declared facts current. | The scripts | — |

## Spine Actors / Main-Line Nodes

`release-desktop.yml`, `prepare-server.sh`, `prepare-server.mjs`, `Dockerfile.monorepo`, the server `package.json` (the `files` list and dependency classes), `pnpm deploy`, `verify-packaged-server-startup.mjs`, `codegen-local.mjs`, `check-declared-imports.mjs`.

## Ownership Map

- The server `package.json` owns the contents statement (what ships, what is a production need). The build scripts own the order of their steps. `release-desktop.yml` owns the job order and calls the scripts. `npm-before.mjs` owns the Windows time bound. The lockfile owns resolved versions.

## Thin Entry Facades

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| Lockfile `if/else` in `prepare-server.sh` and `.mjs` | The lockfile is at the workspace root and always committed; the test is always false | One `--frozen-lockfile` install | Dead branch (Principle 7): `pnpm -C <server> install` already installs the workspace |
| `prepare-server.mjs` Prisma-only `devDependencies`, `npm prune --omit=dev` | After D-2 the stage manifest has no development packages | `devDependencies = {}` | |
| `canuse-ok.txt` | Referenced by nothing (`git grep`) | — | Tracked since an old test |
| `autobyteus-web/.github/workflows/desktop-tag-build.yml` | GitHub runs only the root workflows; it targets an archived repository | — | |
| `@nuxtjs/apollo` | Imported and registered by nothing | Direct declarations (D-9) | |
| `--no-frozen-lockfile` (Dockerfile, workflow ×5) | The goal is reproducible release builds | `--frozen-lockfile` | |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

`resolveNpmBefore`: `override variable -> else git commit time of the workspace HEAD -> else error`. Pure apart from one `git` call.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Risk if on the main line |
| --- | --- | --- | --- | --- |
| Mirrored bin folder cleanup | DS-001, DS-002 | The prepare scripts | Remove `autobyteus-server-ts/autobyteus-web` after a deploy | A build leaves files in the source tree |
| `--before` time | DS-002 | `prepare-server.mjs` | Decide the time | Floating installs |
| Source/contract checks | all | The suites | One check per invariant | Silent regression |

## Ownership Boundaries / Boundary Encapsulation / Dependency Rules

Each script depends on `pnpm`, `npm`, `git` and node only. The Dockerfile depends on build-context files only. The checks read repository files and invoke no network. `check-declared-imports.mjs` reads package manifests; it does not import application code.

## Interface Boundary Mapping

| Interface | Subject | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/package.json` `files` | Server package contents | The allowlist |
| `pnpm --filter autobyteus-server-ts deploy <dir> --legacy --prod` | Server package | The deploy |
| `AUTOBYTEUS_NPM_BEFORE` (environment) | Windows staging | Overrides the time (ISO 8601) for rebuilding an older commit |
| `pnpm -C autobyteus-web codegen:local` / `codegen:check` | Generated GraphQL | Regenerate / verify |
| `node scripts/check-declared-imports.mjs <pkgDir>…` | Declared imports | Exit 1 on a hidden-hoist-only import |
| `node autobyteus-server-ts/scripts/print-graphql-schema.mjs <outFile>` | The server schema | Writes SDL; prints nothing to stdout |

Interface boundary check: each is singular with an explicit subject; ambiguity risk Low.

## Main Domain Subject Naming Check

Names follow existing patterns (`codegen`, `prepare-server`, `…-packaging`). `AUTOBYTEUS_NPM_BEFORE` follows `AUTOBYTEUS_ELECTRON_LINUX_TARGET_ARCH`.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Packaged-server startup proof | `verify-packaged-server-startup.mjs` | Reuse |
| Source-only packaging checks | `scripts/tests/test_docker_build_context_sources.py` family (Python `unittest`) | Extend with a sibling file |
| Web script unit tests | `autobyteus-web/scripts/__tests__/*.spec.ts` | Add one |
| Schema build | `buildGraphqlSchema()` (`api/graphql/schema.ts`) | Reuse in the new script |
| Import scanning | `tickets/done/dependency-security-and-unused-cleanup/probes/import-provider-check.mjs` | Promote into `scripts/check-declared-imports.mjs` (the probe's logic, with a failing exit and the exemptions) |

## Subsystem Allocation, Reusable Structures, Tightness, File Mapping

No shared structure is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/package.json`, `pnpm-lock.yaml` | Change | D-1: `files: ["dist","prisma","application-packages"]`; `prisma` from devDependencies to dependencies; D-9: devDependency `@autobyteus/application-backend-sdk: workspace:*`; lockfile by `pnpm install --lockfile-only` |
| `autobyteus-server-ts/canuse-ok.txt` | Remove | D-1 |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Change | D-2 `--prod` on the deploy (line 53); D-3 `COPY` the four missing importer manifests, `pnpm install --frozen-lockfile` |
| `autobyteus-web/scripts/prepare-server.sh` | Change | D-2 `--prod`; D-3 one frozen install, drop the dead branch; D-6 remove the mirrored folder after the deploy |
| `autobyteus-web/scripts/prepare-server.mjs` | Change | D-2 `--prod` in the stage deploy, empty stage `devDependencies`, drop the prune; D-3 frozen install, drop the dead branch; D-5 `--before`; D-6 cleanup |
| `autobyteus-web/scripts/lib/npm-before.mjs` (+ `scripts/__tests__/npm-before.spec.ts`) | New | D-5: `resolveNpmBefore({ env, workspaceRoot })` |
| `.github/workflows/release-desktop.yml` | Change | D-3: five installs `--frozen-lockfile` |
| `autobyteus-web/.github/workflows/desktop-tag-build.yml` | Remove | D-7 |
| `autobyteus-server-ts/scripts/print-graphql-schema.mjs` | New | D-8: writes the SDL of `buildGraphqlSchema()` to a file; runs with a temp data dir; stdout silent |
| `autobyteus-web/scripts/codegen-local.mjs`, `autobyteus-web/package.json` | New / change | D-8: `codegen:local`, `codegen:check`; D-9: declare `graphql-tag`, `vue`, `vue-router`, remove `@nuxtjs/apollo` |
| `autobyteus-web/generated/graphql.ts` | Change | D-8: regenerated, committed in full |
| `scripts/check-declared-imports.mjs` | New | D-9 |
| `scripts/tests/test_install_from_lockfile.py`, `scripts/tests/test_declared_imports.py` | New | Source/contract checks for D-2, D-3, D-6, D-9 |
| `autobyteus-server-ts/tests/architecture/server-package-contents.test.ts` | New | Check for D-1 |
| Docs: `autobyteus-web/docs/` page that describes codegen (create a short section if none), `autobyteus-server-ts/docs/` page that describes the server package or Docker image (update the contents statement) | Change | Same change |

Folder boundary check: new files sit beside their siblings; no new folder except none.

## Concrete Examples / Shape Guidance

The server package after D-1/D-2: `LICENSE README.md application-packages/ dist/ node_modules/ package.json prisma/` (+ `mobile-web/`, `download/`, `server-package.json` added by the scripts). Windows: `npm install --no-audit --no-fund --before=2026-11-01T09:12:44+01:00`. Good shape avoided: a `files` list plus a post-deploy `rm -rf` of folders (two owners of "what ships").

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision |
| --- | --- | --- |
| Keep `prisma` a devDependency and special-case it in each deploy | Smaller diff | Rejected (three scripts would keep an exception for a runtime need) |
| Pin Windows direct dependencies exactly from the deploy output | More fidelity | Rejected: transitive packages (the actual incident) stay floating; `--before` covers both |
| Hoisted pnpm deploy for Windows | Flat tree from pnpm | Rejected: re-resolves (M-4) |
| A post-deploy prune script for contents instead of `files` | No package.json change | Rejected: two owners |

## Change / Refactor Sequence

1. Server package: `files`, `prisma` to dependencies, remove `canuse-ok.txt`, lockfile; contents test.
2. Scripts and Dockerfile: `--prod`, frozen installs, manifests, cleanup, `--before` with its spec; workflow flags; Python checks.
3. Web: generated file, codegen scripts, declarations, `@nuxtjs/apollo` out, declared-imports check; nested workflow removed.
4. Docs.
5. Real proofs (below).

## Key Tradeoffs

- 18% smaller packages for a changed deploy contract; the packaged-startup check and a Docker stage build guard it.
- Frozen installs fail a release build loudly when the lockfile and a manifest disagree (intended).
- The Windows install stays a bound (DEC-3).

## Risks

- The `files` list or `--prod` omits something a target needs: guarded by the startup check on a clean-clone package, a Docker stage build and the Windows build-only run.
- `--frozen-lockfile` in the Docker builder with all importers installs the applications' packages too (builder time only); measured in validation.
- `vue`/`vue-router` declared with ranges that differ from the resolved versions would move them: the lockfile diff must show no version change for them.
- The mirrored-folder cleanup removes a path that is never legitimate (`autobyteus-server-ts/autobyteus-web`).

## Guidance For Implementation

- Reproduction to start from: `evidence/measurements.md` (M-1, M-3 commands; M-6 `git status --ignored` after `prepare-server.sh`; M-7 schema print and codegen diff).
- Tests: server `server-package-contents.test.ts` (files allowlist exact, `prisma` in dependencies, `npm pack --dry-run --json --ignore-scripts` lists nothing under `src/ tests/ tickets/ docs/ docker/ scripts/` and includes `prisma/schema.prisma`); Python `test_install_from_lockfile.py` (no `--no-frozen-lockfile` in the Dockerfile, both prepare scripts and the workflow; Dockerfile copies the manifest of every importer in `pnpm-lock.yaml`; deploys use `--prod`; both prepare scripts remove the mirrored folder) with a mutation on a copy; `test_declared_imports.py` (runs the check, plus a fixture package with a hidden-hoist import fails); web `npm-before.spec.ts` (override, commit time via a fake runner, neither → error).
- Real proofs (TESTING.md; from a clean clone, isolated data only): (1) `pnpm install --frozen-lockfile`, server build, `pnpm deploy --legacy --prod`, `prisma generate`, `verify-packaged-server-startup.mjs`: size and contents against M-1; (2) `bash autobyteus-web/scripts/prepare-server.sh` then `git status --ignored` clean under `autobyteus-server-ts/` and the packaged startup check on `resources/server`; (3) `node autobyteus-web/scripts/prepare-server.mjs` rehearsal on macOS if it runs there, else read-only review plus (4); (4) Docker: `docker build --target server-package` of `Dockerfile.monorepo` (or the nearest stage) and the starter tests (`pnpm -C autobyteus-server-ts test:starter`); (5) a build-only desktop release run on the pushed branch for macOS, Linux and Windows (as in autobyteus-305's DR-003), including the packaged-server startup steps; (6) `codegen:check` passes, and fails on a mutated generated file; (7) web typecheck and specs, server unit suites, `pnpm install --frozen-lockfile` and the import check.
- Done means (Task): items 1, 2 and the merged items fixed with tests, proven from a clean clone and a real build, finalized on `origin/personal`; item 3 not started. No release unless asked. Do not write "the user has verified" into any Done-when.

## Design Principles Check

| Principle | Verdict | Note |
| --- | --- | --- |
| DESIGN 1, 4, 5 smallest solution | Pass | `files` + `--prod` + flags; no new packaging tool; the Windows bound is one flag |
| DESIGN 7, 8, 9 | Pass | No persisted data; no version numbers; no compatibility paths |
| DESIGN 10 stored names | N/A | |
| P1 production reality | Pass | Every claim measured or cited (M-1…M-10); the Windows path's limit is stated |
| P2/P3 spines and ownership | Pass | Two build spines and one local spine; one owner for contents (`package.json`) |
| P6 supported scenarios | Pass | Release builds on three targets, developer regeneration; a rebuild of an older commit has its override |
| P7 dead code | Pass | The dead lockfile branches, `canuse-ok.txt`, the nested workflow, `@nuxtjs/apollo`, the prune step are removed with evidence |
| P8 clean cut | Pass | No fallback kept |
| P11 one owner per fact | Pass | Contents in one list; Prisma class in one place |
| P12 file placement | Pass | New files beside siblings |
| P13 no behavior by absence | Pass | The `--before` helper fails explicitly when it has no time |
| P15 vocabulary | Pass | No new word |
