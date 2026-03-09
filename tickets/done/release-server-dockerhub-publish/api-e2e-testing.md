# API/E2E Testing

Use this document for Stage 7 API/E2E test implementation and execution.
Do not use this file for unit/integration tracking; that belongs in `implementation-progress.md`.
Stage 7 starts after Stage 6 implementation (source + unit/integration) is complete.

## Testing Scope

- Ticket: `release-server-dockerhub-publish`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/release-server-dockerhub-publish/workflow-state.md`
- Requirements source: `tickets/in-progress/release-server-dockerhub-publish/requirements.md`
- Call stack source: `tickets/in-progress/release-server-dockerhub-publish/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`

## Coverage Rules

- Every critical requirement must map to at least one scenario.
- Every in-scope acceptance criterion (`AC-*`) must map to at least one executable scenario.
- Every in-scope use case must map to at least one scenario, or explicitly `N/A` with rationale.
- `Design-Risk` scenarios must include explicit technical objective/risk and expected outcome.
- Use stable scenario IDs with `AV-` prefix.
- Manual testing is not part of the default workflow.
- Stage 7 cannot close while any acceptance criterion is `Unmapped`, `Not Run`, `Failed`, or `Blocked` unless explicitly marked `Waived` by user decision for infeasible cases.
- During Stage 7 execution, `workflow-state.md` should show `Current Stage = 7` and `Code Edit Permission = Unlocked`.
- Stage 7 includes test-file/harness implementation and test execution.

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-001` | Root workflow runs on release tag pushes | `AV-001` | `Waived` | `2026-03-09` |
| `AC-002` | `REQ-002` | Workflow uses monorepo Dockerfile and multi-arch build | `AV-001` | `Waived` | `2026-03-09` |
| `AC-003` | `REQ-004`, `REQ-005` | Stable release publishes version and `latest` | `AV-001` | `Waived` | `2026-03-09` |
| `AC-004` | `REQ-004`, `REQ-005` | Prerelease release publishes version tag only | `AV-002` | `Waived` | `2026-03-09` |
| `AC-005` | `REQ-006` | Manual dispatch supports republish and image override | `AV-003` | `Waived` | `2026-03-09` |
| `AC-006` | `REQ-003`, `REQ-006` | Docker Hub setup values are documented | `AV-004` | `Passed` | `2026-03-09` |

## Scenario Catalog

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | `Requirement` | `AC-001`, `AC-002`, `AC-003` | `REQ-001`, `REQ-002`, `REQ-004`, `REQ-005` | `UC-001` | `E2E` | Verify stable release tag push triggers publish workflow and emits version plus `latest` tags | GitHub Actions run on a stable release tag pushes the server image to Docker Hub with both tags | Requires merged workflow in GitHub Actions with Docker Hub secrets present | `N/A` |
| `AV-002` | `Design-Risk` | `AC-004` | `REQ-004`, `REQ-005` | `UC-002` | `E2E` | Prevent prerelease workflow from mutating `latest` | GitHub Actions run on a prerelease tag pushes only the prerelease version tag | Requires merged workflow in GitHub Actions with Docker Hub secrets present | `N/A` |
| `AV-003` | `Requirement` | `AC-005` | `REQ-006` | `UC-003` | `E2E` | Verify manual recovery path for existing release tag and image override | `workflow_dispatch` accepts `release_tag` and optional `image_name` and publishes accordingly | Requires merged workflow in GitHub Actions with Docker Hub secrets present | `N/A` |
| `AV-004` | `Requirement` | `AC-006` | `REQ-003`, `REQ-006` | `UC-003` | `API` | Verify Docker Hub secret/config documentation exists in repo | Docs enumerate `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and default image naming | `rg -n "DOCKERHUB_USERNAME|DOCKERHUB_TOKEN|release-server-docker" README.md autobyteus-server-ts/docker/README.md` | `Passed` |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `Yes`
- If `Yes`, concrete infeasibility reason per scenario:
  - `AV-001`: cannot trigger the new workflow on a remote release tag from this local worktree because the workflow is not yet merged to the repository default branch.
  - `AV-002`: same remote-workflow availability constraint as `AV-001`, plus Docker Hub secret-backed publish behavior is only observable in GitHub Actions.
  - `AV-003`: `workflow_dispatch` cannot be validated end-to-end against the repository until the new workflow file exists remotely and Docker Hub secrets are configured.
- Environment constraints (secrets/tokens/access limits/dependencies):
  - Docker Hub secrets are configured in GitHub, but their runtime behavior is only observable from a GitHub Actions run
  - no safe end-to-end GitHub Actions execution surface for the unmerged workflow
- Compensating automated evidence:
  - workflow YAML parses successfully
  - `git diff --check` passes
  - local Docker build of `autobyteus-server-ts/docker/Dockerfile.monorepo` succeeds
  - documentation coverage check for Docker Hub setup values passes
- Residual risk notes:
  - end-to-end publish behavior remains unverified until the workflow runs in GitHub Actions with valid Docker Hub credentials
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `Yes`
- If `Yes`, waiver reference (date/user decision): `2026-03-09 user instructed ticket finalization and merge without waiting for remote workflow execution`

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `Yes`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Stage 7 remote-execution scenarios were infeasible in the local environment and were explicitly waived by the user after GitHub secrets were configured.
