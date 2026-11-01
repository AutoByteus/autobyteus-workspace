# Handoff Summary — packaging-dependencies-build (autobyteus-345: smaller, reproducible server package and builds)

## Ticket

- Package: `packaging-dependencies-build`; Project Task `autobyteus-345`
- Classification: `task_size=Medium`, `architectural_risk=High`; reviewed route. ARCH-REV-001; source review CRR-001 Pass; API/E2E API-REV-001 Pass (94.2%); test-code review CRR-002 Not Applicable (no durable test changed after the source review).
- Archived ticket folder: `tickets/done/packaging-dependencies-build/` on `personal`

## What Changed

- The server package carries only `dist`, `prisma`, `application-packages` (a `files` list) and is deployed with `pnpm deploy --legacy --prod`; the Prisma CLI is a production dependency. Measured saving 153.2 MB (18.5% before `prisma generate`, 15.5% after); `src/`, `tests/` and development packages are gone; 348 instead of 450 virtual-store packages.
- Every install of a release build (both prepare scripts, the Docker builder, the release workflow) uses `--frozen-lockfile`. The Windows staging `npm install` is bounded by `--before=<commit time>` (override `AUTOBYTEUS_NPM_BEFORE`, ISO 8601; refuses invalid values and no-git without an override). Linux Prisma engine validation kept.
- Generated `autobyteus-web/generated/graphql.ts` is checked (`codegen:local`, `codegen:check`, a server architecture test); declared-imports check (`scripts/check-declared-imports.mjs`) rejects undeclared imports and runtime imports of development dependencies.
- Removed: `canuse-ok.txt`, the nested `desktop-tag-build.yml`, Prisma-only devDependencies and `npm prune`, `@nuxtjs/apollo`.
- Docs: `electron_packaging.md`, `docker/README.md`, `autobyteus-web/README.md` (done in the ticket; verified by delivery).

## Integration

- Merge of `origin/personal` @ `0295553657` (11 commits: release smoke and release-notes template, autobyteus-305 closure) → `a960adf64f`; no conflicts, no overlapping files. Post-integration checks all Pass (`evidence/DEL-01-post-integration-checks.md`).

## Verification

- Judged from the evidence; no user check needed. Every critical AC is proven: the build-only desktop release run 41282003912 succeeded on all five jobs (frozen installs, Linux Prisma engine and packaged startup, Windows bounded install), independent size measurement (API-02), mutation-checked package-content and declared-import tests, refusals through the real script, and a registry check of the override rebuild. AC-002 is met: the criterion's 18% is the figure before `prisma generate`. AC-005 (Docker) is proven by a local `docker buildx` of the server-package stage and a local startup of the same `--prod` package, not on a runner.

## Release

- `No release`: not requested; `RELEASE.md` makes none the default. `release-notes.md` is ready. A beta or stable release needs the build-only desktop run on the merged `personal` first (done for the pre-merge commit; the merged state has no packaging-path difference).
- Remote state API/E2E created (branch `origin/codex/packaging-dependencies-build`, run 41282003912): no tag, release or image published; the branch is deleted after the merge.

## For The Solution Designer

- Follow-ups in `follow-ups.md`, none sent: FU-001, FU-002, FU-003 (`.server-packaging-stage/` left behind and not ignored), FU-004 (startup verifier exits silently through the macOS `/tmp` symlink), FU-006 (macOS and Windows have no packaged-startup proof in the release workflow), FU-007 (Docker release workflow has no build-only mode). FU-005 (`prepare-server.mjs` size) is not needed by the effective-line count.
- The requirement's 18% wording could name the moment of measurement.
- Residual risks: `--before` is a bound, not an identity; the override check covers direct dependencies only; the Docker release path was not run on a runner.
