# API/E2E Coverage Investigation — autobyteus-345 (packaging, dependencies and build)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`; Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `evidence/measurements.md` (M-1…M-10), `task-bundle-packaging.md`, `task-follow-ups-305.md`, `follow-ups.md`
- Design Review Report / Architecture Review Revision Record: `design-review-report.md` (ARCH-REV-001 Pass) / `architecture-review-revision-record.md`
- Implementation Handoff / Revision Record: `implementation-handoff.md` / `implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `code-review-report.md` / `code-review-revision-record.md` (CRR-001 Pass, no findings, 9.4/10)
- Delivery Revision Record: `N/A`; API/E2E Revision Record: `api-e2e-revision-record.md`; Current ID: `API-REV-001`
- Round: 1. Trigger: CRR-001 Pass, which listed what the implementer could not run (it needs the branch pushed). Prior investigation: `N/A`.

## Current Requirement And Design Basis

Release artifacts carry only what runs and install from the lockfile; nothing a user sees changes. Server package: `files: [dist, prisma, application-packages]`, `prisma` a production dependency, `pnpm deploy --legacy --prod` in the Docker builder and both prepare scripts (REQ-001/002). Every release install is frozen (Dockerfile, both prepare scripts, five installs of `release-desktop.yml`) (REQ-003). The Windows staging `npm install` carries `--before=<commit time>`, overridable by `AUTOBYTEUS_NPM_BEFORE`, refused when invalid, and stopping when neither exists (REQ-004). No stray `autobyteus-server-ts/autobyteus-web` after the build (REQ-005). Dead workflow gone, generated GraphQL current with a check, imports declared with a class-aware check (REQ-006…008). Persisted data: `Not Affected` (build inputs and outputs only).

The implementer proved the source-level behavior (unit/source checks with mutations, clean-clone suites at `4db26446cb`, deployed-package startup on macOS, a local Docker stage build, a macOS rehearsal of `prepare-server.mjs` that stops at the Windows-only symlink rule). Left open: the build-only desktop release run on the three platforms (AC-006 Windows part, AC-011), the rebuild/override scenario (SCN-004), the mutations, and a judgement of AC-002.

## Supported Scenarios And Real Usage

- Covered: SCN-001 (release builds the desktop app on macOS/Linux), SCN-002 (Windows), SCN-004 (a developer rebuilds an older commit), SCN-005/006 (codegen drift, undeclared import) at source level. SCN-003 (Docker release and the signed server package): the Docker stage build was done locally by the implementer; the release workflow cannot be run without publishing (see Not Tested).
- Real-use scenarios added from reading the code (real trigger in brackets):
  - SCN-A1: the release run is dispatched on a feature branch with `publish_release=false` [`pnpm release:test --ref <branch>` / `gh workflow run`]; the publish job must be skipped.
  - SCN-A2: a developer sets a wrong override (`yesterday`, a number, `2026-13-45`) or builds from a source without git history [`node autobyteus-web/scripts/prepare-server.mjs`]; the build must stop before any build step.
  - SCN-A3: independently re-measure the package size before and after `prisma generate` (the AC-002 judgement) [clean clone, `pnpm deploy`].
- `Technically Possible but Unsupported/Contrived`: none to skip.

## Changed Behavior Summary

| Behavior | Change | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 server package content | Changed | REQ-001/002, AC-001…003 | contents test (reused, mutated), independent size measurement, packaged startup |
| BEH-002 frozen installs, Windows bound | Changed | REQ-003/004, AC-004/006 | the build-only run on five targets, the override scenarios |
| BEH-003 no stray folder | Changed | REQ-005, AC-007 | implementer's IMP-03 reused (`prepare-server.sh` unchanged since) |
| BEH-004 contract leftovers | Changed | REQ-006…008, AC-008…010 | source checks rerun, mutation of the declared-imports check |

## Changed Surface And Boundary Classification

| Surface | Affected? | Actual Changed Boundary | Repository Evidence | Risk Not Exercised | Candidate Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | No | — | — | — | — |
| API / transport | No | — | — | — | — |
| Frontend / browser / desktop shell | No (two template type fixes; no behavior) | — | web specs | — | not required |
| Process / lifecycle | Yes | release builds on three desktop platforms, packaged-server start | local macOS startup, local Docker stage | the real runners | build-only release run |
| Persisted-data transition | No | — | — | — | — |
| External integration | Yes | npm registry (`--before`), GitHub Actions runners | one macOS rehearsal | bound against the real registry on Windows | build-only run; override run with a registry check |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build`, branch `codex/packaging-dependencies-build`; pnpm monorepo, vitest, Python `unittest` for `scripts/tests`.
- Testing guideline: `TESTING.md` (root), no closer one; `RELEASE.md` ("Build-only release run", "Never skip it because a change does not touch the build"); `AGENTS.md`, `DESIGN.md`.
- Rules applied: one heavy run at a time locally; `env -i` for suites; own temp roots only; clean clones for builds; every failure has a cause (Rule 9); the build-only run publishes nothing (`publish_release=false`).
- Conflicts: none found.
- Remote action: the branch was pushed to `origin` (`AutoByteus/autobyteus-workspace`, the repository's usual practice for ticket branches) because the run needs it; the dispatch used the exact arguments of `pnpm release:test` (`-f publish_release=false -f prerelease=true`). The `publish-release` job's condition requires `publish_release == 'true'` and a tag, so nothing can be published; the Docker workflow was NOT dispatched (it always pushes an image).

## Persisted Data Transition Coverage Basis

`Not Affected`. The lockfile changed by exactly the planned effect (IMP-09, reused).

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/architecture/server-package-contents.test.ts` | `files`, prisma class, packed content | Still Valid | rerun + mutate on a copy |
| `scripts/tests/test_install_from_lockfile.py`, `scripts/tests/test_declared_imports.py` | frozen-install and declared-import checks with mutations | Still Valid | rerun; mutate the declared-imports check on a copy |
| `autobyteus-web/scripts/__tests__/npm-before.spec.ts` | the four cases of the time bound | Still Valid | rerun; exercise through the real script |
| `autobyteus-server-ts/tests/architecture/web-generated-graphql-current.test.ts` | generated GraphQL current | Still Valid | rerun with `codegen:check` |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-004, AC-006, AC-011; REQ-003/004/005 | the build-only desktop release run on macOS arm64/x64, Linux x64/arm64, Windows | Journey (real runners) | push the branch; `gh workflow run release-desktop.yml --ref codex/packaging-dependencies-build -f publish_release=false -f prerelease=true`; read the five job logs | the reviewers' main request |
| API-02 | AC-002 | independent size measurement, base vs new, before and after `prisma generate`, plus packaged startup | Journey (clean clone) | script saved as evidence | the AC-002 judgement |
| API-03 | AC-006 | refusals through the real `prepare-server.mjs`: three invalid overrides and no usable time | Temporary probe | `env -i … AUTOBYTEUS_NPM_BEFORE=… node autobyteus-web/scripts/prepare-server.mjs` | must stop before any build step |
| API-04 | AC-001, AC-003 | mutations of `server-package-contents.test.ts` on a copy: remove `prisma` from `files`, prisma to devDependencies, add `src`, restore `canuse-ok.txt` | Mutation | copy of the server folder | the reviewers' request |
| API-04b | AC-010 | mutations of `check-declared-imports.mjs` on a copy: a dev-only import in `src/`, an undeclared import, a type-only import (exempt) | Mutation | copy with `package.json` and `src/` | the reviewers' request |
| API-05 | AC-006; SCN-004 | rebuild of an older commit with `AUTOBYTEUS_NPM_BEFORE` earlier than that commit | Journey | clean clone at `6777be781f`, frozen install, the script with the override, a registry check of the installed versions | the reviewers' request |
| API-06 | AC-001, AC-003, AC-004, AC-006, AC-009, AC-010 | source-level checks rerun at head | Existing Test | Python unit tests, npm-before spec, server architecture tests, declared imports, `codegen:check` | head differs from the implementer's tested code by two comment lines |
| IMP-01…09 | as in the handoff | implementer's evidence | Reused | `git diff --name-only 4db26446cb HEAD` outside `tickets/`: `prepare-server.mjs` only (two comment lines) | still holds |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add / Update / Remove

None. The existing durable checks are sufficient and each was mutation-checked; the scripts used here (size measurement, published-before check) are evidence tools kept in `evidence/api-e2e/`, not repository tests.

## Desktop Application Validation Plan

Not applicable to a shell or renderer behavior: nothing in Electron main, preload or the renderer changed. The packaged server is what changes; its startup is checked where the project checks it (Linux jobs) and locally on macOS.

## Live Environment And Fixture Plan

- Order: push → dispatch → local cases while the run builds → read logs.
- Owned processes and state: the pushed branch and the workflow run (left in place, see the report), temp clones under `/tmp/api-e2e-345-*` (removed), no user data.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| The Docker release workflow on a runner | it has no build-only mode; every dispatch pushes the image and signs and uploads the server package | the Dockerfile change is proven only by the implementer's local `docker buildx` of the stage | No | FU-007 |
| Packaged-server startup on macOS and Windows runners | the desktop workflow starts the packaged server only in the two Linux jobs (pre-existing) | a Windows- or macOS-specific startup failure of the smaller package is not seen by CI | No | FU-006 |
| An Android/Termux build | left alone on purpose by the design | none for this change | — | — |

## Ambiguities Or Reroute Triggers

None. AC-002's wording is judged in the report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; durable coverage added/updated/removed: `No`; reroute required: `No`.
