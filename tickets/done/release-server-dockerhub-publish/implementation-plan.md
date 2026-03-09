# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: the repository already has a working server Dockerfile and prior Docker Hub publish logic; the missing work is moving that release integration into the superrepo's active root workflow surface and syncing documentation.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> finalize implementation plan -> implementation progress tracking -> API/E2E testing (implement + execute) -> code review gate -> docs sync -> final handoff -> wait for explicit user verification -> move ticket to `done` -> git finalization/release when git repo

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/release-server-dockerhub-publish/workflow-state.md`
- Investigation notes: `tickets/in-progress/release-server-dockerhub-publish/investigation-notes.md`
- Requirements: `tickets/in-progress/release-server-dockerhub-publish/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/release-server-dockerhub-publish/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/release-server-dockerhub-publish/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: runtime review is `Go Confirmed`; no blocking findings remain.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001` normal release tag push triggers server image publishing
  - `UC-002` manual workflow run re-publishes an existing release tag
  - `UC-003` deterministic Docker image tagging from release tag
  - `UC-004` Docker Hub configuration through secrets and workflow input
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases (if any, with risk/objective):
  - `UC-003`: make prerelease tagging explicit so `latest` is not overwritten by prerelease tags
- Target Architecture Shape (for `Small`, mandatory):
  - keep release orchestration at the superrepo root by adding one dedicated root GitHub Actions workflow for server Docker publishing
  - remove the stale nested workflow so workflow ownership and file placement match GitHub Actions discovery behavior
  - keep the existing monorepo Dockerfile as the build boundary and keep Docker Hub tagging logic inside the workflow metadata step
- New Layers/Modules/Boundary Interfaces To Introduce:
  - root workflow file: `.github/workflows/release-server-docker.yml`
- Touched Files/Modules:
  - `.github/workflows/release-server-docker.yml` (new)
  - `autobyteus-server-ts/.github/workflows/release-docker-image.yml` (remove legacy misplaced workflow)
  - `README.md`
  - `autobyteus-server-ts/docker/README.md`
- API/Behavior Delta:
  - pushing the existing repo release tag will start a second workflow that publishes `autobyteus-server-ts` to Docker Hub
  - stable releases publish `<image>:<version>` and `<image>:latest`
  - prereleases publish `<image>:<version-suffix>` only
- Key Assumptions:
  - Docker Hub target image default remains `autobyteus/autobyteus-server`
  - repository maintainers will provide `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`
  - `Dockerfile.monorepo` is release-safe in GitHub-hosted Ubuntu runners
- Known Risks:
  - CI cannot prove Docker Hub login/push without real secrets
  - manual desktop republish and manual server republish remain separate workflows unless a helper script is added later

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `1` | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Candidate Go` | `1` |
| `2` | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Go Confirmed` | `2` |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`
- If `No-Go`, required refinement target:
  - `N/A`
- If `No-Go`, do not continue with dependency sequencing or implementation kickoff.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests and integration tests alongside implementation.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory decoupling rule: preserve clear module boundaries and one-way dependency direction; avoid adding tight coupling/cycles.
- Mandatory module/file placement rule: keep each touched file in the folder/boundary that owns its concern; plan explicit moves when current placement is misleading.
- Choose the proper structural change for architecture integrity; do not prefer local hacks just because they are smaller.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `.github/workflows/release-server-docker.yml` | requirements + runtime review | establishes the active CI behavior and tag/secrets policy |
| 2 | `autobyteus-server-ts/.github/workflows/release-docker-image.yml` | new root workflow | remove the misplaced duplicate after the root workflow owns the concern |
| 3 | `README.md` | root workflow | document repo-wide release behavior after the active workflow exists |
| 4 | `autobyteus-server-ts/docker/README.md` | root workflow | update server Docker docs to point to the correct active workflow path |

## Module/File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Server Docker release workflow | `autobyteus-server-ts/.github/workflows/release-docker-image.yml` | `.github/workflows/release-server-docker.yml` | superrepo GitHub Actions release automation | `Move` | root workflow exists and nested workflow is removed |
| Release docs | `README.md` | `README.md` | repo-level operator documentation | `Keep` | root release section mentions server Docker release path |
| Server Docker docs | `autobyteus-server-ts/docker/README.md` | `autobyteus-server-ts/docker/README.md` | server Docker operator documentation | `Keep` | workflow path and Docker Hub setup notes are current |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `REQ-001` | `AC-001` | `Solution Sketch` | `UC-001` | `TASK-001` | workflow syntax / trigger inspection | `SCN-001` |
| `REQ-002` | `AC-002` | `Solution Sketch` | `UC-001` | `TASK-001` | workflow build configuration inspection | `SCN-001` |
| `REQ-003` | `AC-006` | `Solution Sketch` | `UC-004` | `TASK-001`, `TASK-003` | workflow secret references inspection | `SCN-004` |
| `REQ-004` | `AC-003`, `AC-004` | `Solution Sketch` | `UC-003` | `TASK-001` | tag computation inspection | `SCN-001`, `SCN-002` |
| `REQ-005` | `AC-003`, `AC-004` | `Solution Sketch` | `UC-003` | `TASK-001` | prerelease branching inspection | `SCN-001`, `SCN-002` |
| `REQ-006` | `AC-005`, `AC-006` | `Solution Sketch` | `UC-002`, `UC-004` | `TASK-001`, `TASK-003` | workflow dispatch + docs inspection | `SCN-003`, `SCN-004` |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001` | release tag starts server publish workflow | `SCN-001` | `E2E` | `Planned` |
| `AC-002` | `REQ-002` | workflow uses monorepo Dockerfile and multi-arch build | `SCN-001` | `E2E` | `Planned` |
| `AC-003` | `REQ-004`, `REQ-005` | stable release publishes version + latest | `SCN-001` | `E2E` | `Planned` |
| `AC-004` | `REQ-004`, `REQ-005` | prerelease publishes version tag only | `SCN-002` | `E2E` | `Planned` |
| `AC-005` | `REQ-006` | manual dispatch supports republish and image override | `SCN-003` | `E2E` | `Planned` |
| `AC-006` | `REQ-003`, `REQ-006` | Docker Hub setup values documented | `SCN-004` | `API` | `Planned` |

## Step-By-Step Plan

1. Add a root workflow that computes release metadata from tag push or manual dispatch, logs into Docker Hub, builds `autobyteus-server-ts/docker/Dockerfile.monorepo`, and pushes the correct tags.
2. Remove the misplaced nested workflow so only the root workflow owns this release concern.
3. Update repo-level and server Docker documentation to describe the new active workflow and the required Docker Hub secrets/configuration.
4. Validate workflow behavior with static inspection and any local workflow checks available in the environment.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | trigger, metadata, Docker login, buildx, push, summary are present | workflow expression inspection passes | manual/tag scenarios map cleanly to requirements | main behavior file |
| `autobyteus-server-ts/.github/workflows/release-docker-image.yml` | removed | n/a | n/a | eliminate misleading duplicate |
| `README.md` | release section mentions server Docker publishing and secrets | doc diff reviewed | docs align with workflow inputs | repo-level doc |
| `autobyteus-server-ts/docker/README.md` | workflow path and setup notes are accurate | doc diff reviewed | docs align with workflow behavior | server Docker doc |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/release-server-dockerhub-publish/code-review.md`
- Scope (source + tests): root workflow plus release docs
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - not expected to trigger; if triggered, split workflow responsibilities or simplify shell logic.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - review workflow and docs separately; if the workflow grows too large, extract shell logic into a script.
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - any oversized workflow would trigger `Design Impact` and require a split between metadata prep and publish steps.
- module/file placement review approach (how wrong-folder placements will be detected and corrected):
  - workflow ownership is correct only at root `.github/workflows`; nested workflow duplicates are treated as misplacement.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | `TBD` | `Yes` | `Low` | `Keep` | `Local Fix` |
| `README.md` | `TBD` | `Yes` | `Low` | `Keep` | `Local Fix` |
| `autobyteus-server-ts/docker/README.md` | `TBD` | `Yes` | `Low` | `Keep` | `Local Fix` |

## Test Strategy

- Unit tests: static workflow/diff inspection
- Integration tests: local Docker build check if feasible; workflow syntax and tag-path review in repository
- Stage 6 boundary: file/module/service-level verification only (unit + integration).
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `6`
  - critical flows to validate (API/E2E):
    - tag push path
    - prerelease tag path
    - workflow_dispatch republish path
  - expected scenario count: `4`
  - known environment constraints:
    - no Docker Hub secrets available locally
    - GitHub-hosted Actions execution cannot be run end-to-end from this environment
- Stage 8 handoff notes for code review:
  - predicted design-impact hotspots:
    - prerelease/latest tag branching
  - predicted module/file placement hotspots:
    - leaving a stale nested workflow behind
  - files likely to exceed size/SoC thresholds:
    - none expected

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| `SCN-001` | `Requirement` | `AC-001`, `AC-002`, `AC-003` | `REQ-001`, `REQ-002`, `REQ-004`, `REQ-005` | `UC-001`, `UC-003` | `E2E` | stable tag push publishes multi-arch image with version and `latest` tags |
| `SCN-002` | `Design-Risk` | `AC-004` | `REQ-004`, `REQ-005` | `UC-001`, `UC-003` | `E2E` | prerelease tag push publishes only the prerelease version tag |
| `SCN-003` | `Requirement` | `AC-005` | `REQ-006` | `UC-002`, `UC-004` | `E2E` | workflow_dispatch accepts release tag and optional image override |
| `SCN-004` | `Requirement` | `AC-006` | `REQ-003`, `REQ-006` | `UC-004` | `API` | docs enumerate `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and target image name expectation |
