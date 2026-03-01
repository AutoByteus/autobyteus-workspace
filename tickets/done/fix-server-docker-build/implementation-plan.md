# Implementation Plan - Fix Server Docker Build

## Scope Classification

- Classification: `Medium`
- Reasoning: Implementing a hybrid management script that supports both local collision-safe startup and remote build/push orchestration.
- Workflow Depth: Medium (Solution Sketch -> Call Stack -> Review -> Implementation)

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/fix-server-docker-build/workflow-state.md`
- Investigation notes: `tickets/in-progress/fix-server-docker-build/investigation-notes.md`
- Requirements: `tickets/in-progress/fix-server-docker-build/requirements.md`
  - Current Status: `Design-ready`

## Plan Maturity

- Current Status: `Refined` (Final Re-entry)

## Solution Sketch

- Use Cases In Scope: `UC-001` to `UC-005`
- Requirement Coverage Guarantee: Yes
- Target Architecture Shape: Monorepo-aware Docker management with project isolation, dynamic port mapping, optional runtime sync, and remote push support.
- Touched Files/Modules:
    - `autobyteus-server-ts/docker/Dockerfile.monorepo`
    - `autobyteus-server-ts/docker/entrypoint.sh`
    - `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf`
    - `autobyteus-server-ts/docker/docker-compose.yml`
    - `autobyteus-server-ts/docker/build.sh`
    - `autobyteus-server-ts/docker/build-multi-arch.sh`
    - `autobyteus-server-ts/docker/docker-start.sh`
    - `autobyteus-server-ts/docker/bootstrap.sh` (Restore)
- API/Behavior Delta: Restored Git runtime sync and remote push.

## Step-By-Step Plan

1.  **Modify `autobyteus-server-ts/docker/Dockerfile.monorepo`**:
    -   Add `ARG BASE_IMAGE_TAG=latest`.
    -   Use `FROM autobyteus/chrome-vnc:${BASE_IMAGE_TAG} AS runtime`.
    -   Copy `bootstrap.sh` into the image.
    -   Ensure `entrypoint.sh` is correctly copied and entrypoint is set.
2.  **Restore/Modify `autobyteus-server-ts/docker/bootstrap.sh`**:
    -   Keep the logic to sync repositories but ensure `SKIP_SYNC` check is at the top.
    -   Scrub any hardcoded `repository_prisma` logic.
3.  **Modify `autobyteus-server-ts/docker/entrypoint.sh`**:
    -   Restore call to `bootstrap.sh`.
    -   Keep handover logic.
    -   Consistently target `dist/app.js`.
4.  **Modify `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf`**:
    -   Ensure the command targets `dist/app.js`.
5.  **Modify `autobyteus-server-ts/docker/build.sh`**:
    -   Add `--variant` flag.
    -   Restore `--push` flag.
    -   Update output tagging logic to support both local (`--load`) and remote (`--push`).
6.  **Modify `autobyteus-server-ts/docker/build-multi-arch.sh`**:
    -   Add `--variant` flag.
    -   Restore `--push` flag and ensure multi-platform builds work.
7.  **Modify `autobyteus-server-ts/docker/docker-start.sh`**:
    -   Ensure `AUTOBYTEUS_SKIP_SYNC=1` is the default in generated env.
    -   Provide commented-out placeholders for `GITHUB_PAT` etc. in the generated env.
8.  **Verify `autobyteus-server-ts/docker/docker-compose.yml`**:
    -   Restore all Git/GitHub related environment variables as optional.
    -   Keep `container_name` removed for multi-instance support.
9.  **Validate**:
    -   Build and start locally.
    -   Verify `--push` flag generates correct docker commands (dry-run if needed).
    -   Verify runtime sync works if `SKIP_SYNC=0` and PAT is provided.

## Test Strategy

- Stage 6: Verify build success and variant tagging.
- Stage 7: E2E verify container startup and API responsiveness.
- Stage 8: Code review.

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Expected Outcome | Test Level |
| --- | --- | --- | --- | --- |
| SV-001 | Requirement | AC-001 to AC-005 | Basic build and start works. | E2E |
| SV-002 | Requirement | AC-004 | Remote push logic is available in build scripts. | Integration |
| SV-003 | Requirement | AC-005, AC-006 | Runtime sync logic is available and respects SKIP_SYNC. | E2E |
