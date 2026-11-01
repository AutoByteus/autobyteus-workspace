# Implementation Handoff — autobyteus-345 (packaging, dependencies and build)

Result: **Implementation Complete**, ready for independent code review. `task_size` = **Medium**, `architectural_risk` = **High**, unchanged.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (High). `ARCH-REV-001` Pass, findings ARCH-F-001…004 folded into the documents by the Solution Designer (SR-001 note 1); handoff rule → `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build/tickets/in-progress/packaging-dependencies-build/requirements-doc.md`
- Investigation notes: `.../investigation-notes.md`; solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (D-1…D-9; user design approval `Not required`)
- Supplemental task artifacts: `.../evidence/measurements.md` (M-1…M-10, inputs)
- Design review report: `.../design-review-report.md`; architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report: `N/A`

## Current Implementation Summary

Release artifacts carry only what runs, install from the lockfile, and the repository is free of the leftovers (nothing a user sees changes):

- **Server package contents (D-1, D-2):** `autobyteus-server-ts/package.json` has `files: ["dist","prisma","application-packages"]`; `prisma` moved to `dependencies`; `canuse-ok.txt` removed. The Docker builder, `prepare-server.sh` and the stage deploy of `prepare-server.mjs` run `pnpm deploy --legacy --prod`; the Windows script's Prisma-only `devDependencies` and `npm prune --omit=dev` are gone.
- **Frozen installs (D-3):** `--frozen-lockfile` in the Dockerfile (still the 8 manifests it copied; no manifest added), both prepare scripts (the dead "lockfile in the wrong folder" branches removed) and the five installs of `release-desktop.yml`.
- **Windows bound (D-5):** `autobyteus-web/scripts/lib/npm-before.mjs` (`resolveNpmBefore`: `AUTOBYTEUS_NPM_BEFORE` override, else the commit time of the workspace HEAD, else stop; an invalid override is refused) and `npm install … --before=<time>` in `prepare-server.mjs`, decided when the script starts.
- **Stray folder (D-6):** both prepare scripts remove `autobyteus-server-ts/autobyteus-web` after the deploy; `prepare-server.sh` fails when the Prisma CLI is missing from the deployed package.
- **Leftovers (D-7):** nested `autobyteus-web/.github/workflows/desktop-tag-build.yml` removed (referenced by nothing outside planning notes).
- **Generated GraphQL (D-8):** `autobyteus-server-ts/scripts/print-graphql-schema.mjs`; `autobyteus-web/scripts/codegen-local.mjs` with `codegen:local` / `codegen:check` (both build the server first); `codegen.ts` takes `CODEGEN_OUTPUT`; `generated/graphql.ts` regenerated (+102 lines, the M-7 drift); server architecture test `web-generated-graphql-current.test.ts` is the routine runner (schema from source, in-process).
- **Declared imports (D-9):** `graphql-tag`, `vue`, `vue-router` in the web package (devDependencies, the class the web package uses for Nuxt-bundled packages), `@autobyteus/application-backend-sdk` in the server's devDependencies, `@nuxtjs/apollo` removed; `scripts/check-declared-imports.mjs` (class-aware for the server: `src/` runtime code may import production dependencies only; type-only imports exempt; four documented exemptions for web scripts that run inside the server package).
- **Checks:** `scripts/tests/test_install_from_lockfile.py` (with mutations), `scripts/tests/test_declared_imports.py` (fixtures), `autobyteus-server-ts/tests/architecture/server-package-contents.test.ts`, `autobyteus-web/scripts/__tests__/npm-before.spec.ts`.
- **Docs:** `autobyteus-web/docs/electron_packaging.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/README.md` (codegen, declared imports).

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build/tickets/in-progress/packaging-dependencies-build/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001 (note 1); architecture-review IDs: ARCH-REV-001 (ARCH-F-001…004); code-review, API/E2E, delivery IDs: N/A
- Triggering finding IDs: N/A (baseline)

## Routing Classification (Mandatory)

- Task size: `Medium`; Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"; ARCH-REV-001 "Routing Classification Review"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: about 30 files over `autobyteus-server-ts`, `autobyteus-web`, the workflow, the Dockerfile, the lockfile and `scripts/`, all in existing owners; High because every desktop and Docker release changes what it ships and how it installs. Implementation found one more reason to stay High and no reason to lower it: declaring `vue` changed how vue-tsc types the web templates (two production type errors, fixed; see Known Risks).
- Selected route: `Code Review` (`/software_engineering_team/code_reviewer`)
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` for the design's triggers (the packaged-startup check, the Docker stage and a frozen install with 8 manifests all pass). Two **deviations from the written acceptance criteria** are stated below for the reviewers' judgement; neither changes behavior.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Server package holds runtime content only | `autobyteus-server-ts/package.json` (`files`, `prisma`), `Dockerfile.monorepo` deploy, `prepare-server.sh`, `prepare-server.mjs` stage deploy | Implemented; startup passes on the deployed folder, on `resources/server` and in a Linux container (IMP-02…04); size: see deviation 1 |
| BEH-002 | Installs follow the lockfile; Windows bounded | Dockerfile, both prepare scripts, `release-desktop.yml` (5 lines), `lib/npm-before.mjs` | Implemented; frozen install passes in the clean clone and the Docker builder (IMP-01); Windows tail unproven here (not run) |
| BEH-003 | No stray folder after the desktop server build | both prepare scripts `rm` of `autobyteus-server-ts/autobyteus-web` | Implemented; reproduced the mirror, then absent after the script (IMP-03) |
| BEH-004 | Dead workflow gone, generated file current, imports declared | workflow removed; `codegen-local.mjs` etc.; `check-declared-imports.mjs`; manifests | Implemented (IMP-05, IMP-08, IMP-09) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server: `package.json`, `docker/Dockerfile.monorepo`, `docker/README.md`, `scripts/print-graphql-schema.mjs`, `tests/architecture/{server-package-contents,web-generated-graphql-current}.test.ts`. Web: `package.json`, `codegen.ts`, `scripts/{prepare-server.sh,prepare-server.mjs,codegen-local.mjs,lib/npm-before.mjs}`, `scripts/__tests__/npm-before.spec.ts`, `generated/graphql.ts`, `typecheck-baseline.json`, `components/agentTeams/SearchableGroupedSelect.vue`, `components/server/ServerLogViewer.vue`, one spec, `README.md`, `docs/electron_packaging.md`. Root: `.github/workflows/release-desktop.yml`, `pnpm-lock.yaml`, `scripts/check-declared-imports.mjs`, `scripts/tests/test_install_from_lockfile.py`, `scripts/tests/test_declared_imports.py`.

## Important Assumptions

- A `pnpm deploy --prod` package is complete for the server's run time because no non-test `src/` file imports a development package (checked by `check-declared-imports.mjs`, which found none) and the startup check passes.
- `files` also governs `pnpm deploy` (verified: the deployed folder holds only the listed folders).

## Known Risks

- **Declaring `vue` exposed two real template type errors** (`SearchableGroupedSelect.vue` style typing; `ServerLogViewer.vue` passed the click event as the `showLoading` argument — behaviour unchanged, `showLoading` was truthy then and defaults to `true` now). Both fixed minimally (`reactive<CSSProperties>`, `@click="refreshLogs()"`); a scratch worktree of the base shows the errors come only from declaring `vue` (not `vue-router`, not `graphql-tag`). The web typecheck baseline shrank by one (298 → 297) because a stale `@ts-expect-error` naming `@nuxtjs/apollo` was an unused directive; it was removed.
- The Windows path (`prepare-server.mjs` tail, `npm install --before`, Windows junction rules) is proven here only up to the final symlink check on macOS (IMP-06); the Windows runner is the open proof.
- `npm install --before` is a bound, not an identity (DEC-3).
- `generated/graphql.ts` is now compared byte for byte by the server unit suite; any schema change without `pnpm -C autobyteus-web codegen:local` fails `test:unit` (intended, AC-009). The test spawns the web codegen (about 10 s) and needs the web dependencies installed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup`; root cause `Missing Invariant`; refactor `Refactor Needed Now` (small)
- Implementation matched the reviewed assessment: `Yes`; challenged: `N/A`
- Evidence / notes: each invariant has an automated check (contents test, lockfile/deploy source checks with mutations, declared imports, codegen drift). Placement notes: the closure check of the Docker manifests lives in `test_install_from_lockfile.py` and reads the lockfile's `link:` versions (a small parser, no YAML dependency).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`; legacy retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the two lockfile branches, the Prisma-only devDependencies and prune step, `canuse-ok.txt`, the nested workflow, `@nuxtjs/apollo`, the Prisma "skipping generate" branch, a stale `@ts-expect-error`)
- Dead code found elsewhere, added to `follow-ups.md`: none; two observations recorded as FU-003 (`.server-packaging-stage/` left behind) and FU-004 (startup verifier through a symlinked path)
- Shared structures remain tight: `Yes` (no shared structure added)
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrails: `Yes` (`prepare-server.mjs` was about 560 lines and shrank; new files are small)

## Persisted Data Transition Check (When Applicable)

`Not Affected` (build inputs and outputs only). The lockfile changed by exactly the planned effect (IMP-09).

## Environment Or Dependency Notes

`pnpm install --frozen-lockfile` for the whole workspace before any web or server check; `ELECTRON_SKIP_BINARY_DOWNLOAD=1` for installs on a development machine. On macOS use real paths (`/private/tmp/...`) for the packaged-startup verifier (FU-004). The server unit suite needs the web dependencies (the codegen test).

## Checks Run

Code under test: `6777be781f` (feature) and `4db26446cb` (two web fixes; HEAD of the code). Evidence files are in `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build/tickets/in-progress/packaging-dependencies-build/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | clean clone, `pnpm install --frozen-lockfile`; the same in the Docker builder | 4db26446cb | macOS arm64, node 22.23.1, pnpm 10.28.2; Docker 29.0.1 | lockfile, manifests, Dockerfile | REQ-003, AC-004, AC-005 | Pass | `IMP-01-frozen-install.txt` | `INSTALL_EXIT=0`; `Lockfile is up to date, resolution step is skipped`; `Scope: all 9 workspace projects`; `Done in 54.1s` |
| IMP-02 | clean clone: build server, `pnpm deploy --legacy --prod`, `prisma generate`, packaged startup; base at `efd28d5c4a` deployed the same way | 4db26446cb | same | `files`, `prisma` class, `--prod` | REQ-001/002, AC-002, AC-003 | Pass (size: deviation 1) | `IMP-02-deploy-prod-package.txt` | `Packaged server startup validation passed`; no `src/ tests/`; no top-level `@types/vitest/typescript`; virtual store 348 vs 450 packages; 796 vs 928 MB |
| IMP-03 | clean clone: `bash autobyteus-web/scripts/prepare-server.sh`, `git status --short --ignored autobyteus-server-ts`, startup on `resources/server` | 4db26446cb | same | script, cleanup, Prisma checks | REQ-005, AC-007 | Pass | `IMP-03-prepare-server-sh.txt` | `EXIT=0`; only `dist/` and `node_modules/` under `autobyteus-server-ts/` (ignored); the mirror reproduced by a plain deploy and absent after the script; `validation passed for …/resources/server` |
| IMP-04 | clean clone: `docker buildx build -f …Dockerfile.monorepo --target server-package --output type=local,dest=…`; the package in `node:22-bookworm` with the startup verifier; `pnpm -C autobyteus-server-ts test:starter` | 4db26446cb | Docker 29.0.1 (arm64 Linux VM) | Dockerfile stage | REQ-003, AC-005 | Pass | `IMP-04-docker-server-package-stage.txt` | `DOCKER_EXIT=0 SECONDS=167`; `validation passed for /pkg`; `tests 49 … pass 49` |
| IMP-05 | `pnpm -C autobyteus-web codegen:local`, `codegen:check`, `codegen:check` on a stale file; server architecture test | 6777be781f | macOS | codegen scripts, drift test | REQ-007, AC-009 | Pass (mutation fails as required) | `IMP-05-codegen-local-check.txt` | `generated/graphql.ts is current.`; stale file → `is out of date` and exit 1 |
| IMP-06 | `node autobyteus-web/scripts/prepare-server.mjs` rehearsal on macOS | 4db26446cb | macOS | Windows staging script | REQ-004, REQ-005 | Partial by design: stops at the Windows-only symlink check | `IMP-06-prepare-server-mjs-rehearsal.txt` | `npm install is bounded to packages published before 2026-11-01T07:04:07+01:00`; `added 321 packages`; `Error: Found 8 symlink/junction entries` (npm `.bin` links on POSIX) |
| IMP-07 | clean clone: server `test:unit`; all Python script tests; web `test:nuxt run`; guards; declared-imports; `test:starter` | 4db26446cb | same | all new and existing suites | AC-001…AC-011 (source-level) | Pass | `IMP-07-clean-clone-suites.txt` | server `Test Files  904 passed \| 5 skipped (909)`, `Tests  7666 passed`; Python `OK (skipped=2)`; web `Test Files  679 passed`, `Tests  4927 passed \| 2 skipped` |
| IMP-08 | `pnpm -C autobyteus-web typecheck` | 4db26446cb | macOS | web templates under the new declarations | REQ-008, AC-010 | Pass | `IMP-08-web-typecheck.txt` | `production errors: 0; test-file errors: 297 … (baseline 297 …)`, `PASS` |
| IMP-09 | lockfile diff against the base; declared-imports; reference searches | 4db26446cb | macOS | lockfile, manifests | REQ-006/008, AC-008, AC-010 | Pass | `IMP-09-lockfile-and-declared-imports.txt` | exactly `@nuxtjs/apollo`, `@rollup/plugin-graphql`, `@vue/apollo-option` removed; `Imports are declared: …` |

- **Deviations from the written acceptance criteria:**
  1. **AC-002 size.** The criterion says "18% smaller or more than the base (827 MB measured)". Like for like the package is 154 MB (15.6%, `du`) / 132 MB (14.2%, apparent bytes) smaller: base 987 MB vs 833 MB when both have had `prisma generate`, which every release package has. The 18% / 674 MB of M-3 does not reproduce (base before generate is 827 MB as in M-1; my `--prod` package before the generate step was not measured separately). The contents and the dev-package removal (102 virtual-store packages) are as designed. Needs the Solution Designer's or reviewer's acceptance of the like-for-like number.
  2. **AC-002 "no @types".** No development `@types/*` remains; three `@types/*` directories stay in the virtual store because production packages (`p-retry`, `protobufjs`, `type-graphql`) depend on them; there is no top-level `@types` folder.
- Not run, and why:
  - **Build-only desktop release run on the pushed branch (macOS, Linux, Windows; AC-006 Windows part, AC-011).** It needs the branch pushed to `origin` and a `workflow_dispatch` run on GitHub-hosted runners. That is a remote action beyond local implementation checks; left to API/E2E (`publish_release` stays false). The Linux job's checks should include the Prisma Linux engine validation that `prepare-server.sh` runs.
  - `prepare-server.mjs` end to end (Windows only), the Android Termux script (left alone on purpose).
  - Server integration/E2E suites and the live gated suites (not affected by this change).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no rendered behavior changes. The two template fixes keep their behavior (a style type annotation; a click handler called without the event argument, which defaulted to the same value). Covered by the web specs for those components (IMP-07).

## Downstream Coverage Hints / Suggested Scenarios

- The build-only run above, read for: `pnpm install --frozen-lockfile` steps, the packaged-server startup steps, Windows `npm install` line carrying `--before=`, the Linux engine validation.
- A rebuild of an older commit with `AUTOBYTEUS_NPM_BEFORE` set (SCN-004), and with an invalid value (clear error before any build step).
- A `files`-list mutation on a copy (remove `prisma`) must fail `server-package-contents.test.ts`; a dev-only import in `src/` must fail the declared-imports check (both covered by tests).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes, after the code review: the build-only release run (three desktop platforms) and a rebuild/override scenario.
