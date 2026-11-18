# Solution Designer Handoff — autobyteus-345 (package `packaging-dependencies-build`)

Result: **Architecture Design Complete**. Current solution revision: **SR-001**.

## Identity and context
- Task `autobyteus-345` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: "Packaging, dependencies and build: a files list for the server package, lockfile installs, smaller packaged server, dead workflow, generated schema (8 older Tasks merged in)". Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build/tickets/in-progress/packaging-dependencies-build/`
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build`, branch `codex/packaging-dependencies-build`, base `origin/personal` @ `efd28d5c4a`; finalization target `origin/personal`.

## Original request, goals, constraints
Merged packaging, dependency and build problems: check each against the current code, drop what is fixed or not worth it (reporting why), solve the rest with tests, proven from a clean clone and a real build, finalized on the base branch. Item 3 (a smaller Docker release, which changes `RELEASE.md`) is the user's decision: do not start it. Constraints: isolated copies and test data only; no release unless asked; do not write "the user has verified" into any Done-when; other teams work in parallel on 318, 357, 358, 285, 337, 355: keep to this area.

## Dispositions
Do: FU-005/227 (files list, production-only package), FU-008/231 (lockfile installs), 201 (stray folder, reproduced), 230 (nested workflow), 164 (generated GraphQL, +102 lines behind), 251 reduced (declare `graphql-tag`, `vue`, `vue-router`, backend SDK; drop `@nuxtjs/apollo`; `jsdom` no longer applies). Dropped: 169 (already fixed: `Dockerfile.monorepo:57`), 168 (FU-002 follow-up: needs launch-time `NODE_USE_ENV_PROXY=1` in three launchers). Evidence per line: `requirements-doc.md` "Disposition", `evidence/measurements.md`.

## Approval basis
Requirements `Approved` (SR-001) within the direction. User design approval: `Not required` (the Task asks to solve the items; no product behavior, scope or `RELEASE.md` decision is open).

## Classification
`task_size` **Medium**; `architectural_risk` **High** (changes what every release ships and how it installs; the Windows path is unprovable locally, needs a build-only Windows run). Escalation trigger: the packaged-server startup check, the Docker server-package stage or the Windows build-only run fails for a missing package/folder; frozen install fails in the Docker builder.

## Design in one paragraph
Server `package.json`: `files` allowlist, `prisma` a production dependency; `pnpm deploy --legacy --prod` in the Dockerfile and both prepare scripts (measured: 827 MB to 674 MB, startup check passes); every install of a release build `--frozen-lockfile` (the scripts' lockfile test looks in the wrong folder; the Dockerfile copies 8 of 12 importer manifests; five workflow installs float); the Windows staging `npm install` gets `--before=<commit time>` (lockfile routes were tried and fail, M-4); the mirrored `autobyteus-server-ts/autobyteus-web` folder that pnpm 10.28.2's deploy leaves is removed (reproduced); schema-print + `codegen:local`/`codegen:check`; declared imports + a check; nested workflow removed. Source/contract checks for each.

## Evidence
`evidence/measurements.md` (measured on this worktree, nothing outside it and `/tmp`), probes in `probes/`.

## Open points for the reviewer
Windows cannot be run here (build-only run planned); whether the Docker builder with all importer manifests under `--frozen-lockfile` behaves; `--before` as a bound rather than identity (DEC-3); changing `release-desktop.yml` flags (DEC-4).

## Follow-ups
FU-001 (autobyteus-web standalone-era Docker/devcontainer files), FU-002 (proxy support), in `follow-ups.md`, not yet sent.

## Documents
`solution-designer-handoff.md`, `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `follow-ups.md`, `evidence/measurements.md`, `probes/`, inputs `task-bundle-packaging.md`, `task-follow-ups-305.md`.

## Route
Architecture Design Complete with architectural_risk=High → `/software_engineering_team/architecture_reviewer` (rule from `get_handoff_rules`, the only matching rule).
