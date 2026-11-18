# Investigation Notes — autobyteus-345 (packaging, dependencies and build)

## Investigation Meta

- Package `packaging-dependencies-build`, Task `autobyteus-345`. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build`, branch `codex/packaging-dependencies-build`, base `origin/personal` @ `efd28d5c4a` (fetched 2026-11-01). Finalization target `origin/personal`.
- Authorities read: `requirements-engineering.md` (all), `architecture-design.md`, `design-principles.md` (Principles 1–15, triggers, health assessment), `ticket-scope.md`; `AGENTS.md`, `DESIGN.md`, `GLOSSARY.md`, `TESTING.md`, `RELEASE.md` (lockfile lines); `autobyteus-server-ts/docs/design/data_migration_guideline.md` (no persisted data is touched: not applicable).
- Method: every merged item was checked against the current code and, where reading could not decide, reproduced or measured in this worktree after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts build`. Nothing was written outside the worktree, the sibling scratch folder (removed) and `/tmp`; no user data, no running app.
- All measurements and commands: `evidence/measurements.md` (M-1…M-10). Probes: `probes/print-graphql-schema.probe.mjs`, `probes/node-env-proxy.probe.mjs`.

## Findings

| ID | Finding | Established by |
| --- | --- | --- |
| F-01 | The deployed server package is 827 MB of which 153 MB is not run time content: 116 MB development packages, 37 MB `tests/ src/ tickets/ docs/ docker/ scripts/`. | Measured (M-1, M-3) |
| F-02 | The running server reads only `dist`, `prisma`, `application-packages`, `package.json` from its package folder, plus `mobile-web` and `download` that the scripts add. `prisma` is needed at run time (`migrate deploy` through `node_modules/prisma/build/index.js`) but declared a development package. | Read (M-2) + Measured (startup check passes with the reduced package) |
| F-03 | A `files` list plus `prisma` as a production dependency plus `deploy --prod` gives 674 MB, passes `verify-packaged-server-startup.mjs` on the host. | Measured (M-3) |
| F-04 | `prepare-server.sh` and `.mjs` test for a lockfile in the server folder (it is at the root), so they always install with `--no-frozen-lockfile`; `release-desktop.yml` and `Dockerfile.monorepo` do so explicitly; the Dockerfile copies 8 of 12 importer manifests. | Read + Measured (M-5) |
| F-05 | A lockfile-faithful flat tree for Windows is not available from pnpm: hoisted deploy re-resolves (tslib 2.9.1), a derived lockfile does not install. `npm install --before=<commit time>` is the available bound. | Measured (M-4) |
| F-06 | `pnpm deploy` (10.28.2) leaves a mirrored `node_modules/.bin` under the project folder: the 201 stray, reproduced. | Measured (M-6) |
| F-07 | `generated/graphql.ts` is behind by 102 lines now; codegen needs a schema source; the schema can be printed in-process without the app. No test workflow exists in the repository, only release workflows. | Measured (M-7) + Read |
| F-08 | Undeclared imports: server `@autobyteus/application-backend-sdk`; web `graphql-tag`, `vue`, `vue-router`. `jsdom` (server) no longer imported. `@nuxtjs/apollo` unused. | Measured (M-8) |
| F-09 | 169 is fixed; 168 needs launcher-level work (Node honours `NODE_USE_ENV_PROXY=1` set at launch only). | Read + Measured (M-9, M-10) |
| F-10 | `autobyteus-web/Dockerfile`, `docker-compose*.yml`, `.devcontainer/` and `.dockerignore` are also standalone-repo era files in `autobyteus-web/`; the `autobyteus-web/tickets/` folder holds old planning notes that refer to the nested workflow. Whether they are used is not shown (reported in 230's list, not removed here). | Read |

## Unknowns

| ID | Unknown | Settled by |
| --- | --- | --- |
| U-1 | Does the changed Windows staging flow work on Windows? | Build-only desktop release run on the branch (Windows job), in validation |
| U-2 | Does the Docker server-package stage still build and start with `--prod`, the frozen install and the `files` list? | Real Docker build of the stages up to the server package, in validation |

## Supplement inventory

| Path | Purpose | Status |
| --- | --- | --- |
| `evidence/measurements.md` | Measurements M-1…M-10 | Evidence |
| `probes/*.probe.mjs` | Reproduction scripts for M-7 and M-9 | Evidence |
| `task-bundle-packaging.md`, `task-follow-ups-305.md` | The Task's attached original texts | Input |
