# Requirements

## Status
Refined

## Goal / Problem Statement
Provide `personal` branch with an enterprise-style Docker-based local testing workflow and default runtime server logging so developers can boot the stack quickly, seed deterministic fixtures, verify node sync with at least one remote node, and inspect durable logs.

## Scope Triage
- Size: Medium
- Rationale: cross-project Docker orchestration + backend logging behavior changes + seed/sync automation + docs and validation.

## In-Scope Use Cases
- `UC-1`: Start one all-in-one Docker stack for web/server/gateway from repo root.
- `UC-2`: Stop, inspect status, and tail logs from one command wrapper.
- `UC-3`: Persist runtime logs in container volumes with predictable paths.
- `UC-4`: Backend runtime writes to default `server.log` while still streaming to container logs.
- `UC-5`: `up` can seed deterministic test fixtures automatically.
- `UC-6`: `up` can start at least one remote server and run node sync automatically.

## Out of Scope
- Full enterprise discovery-registry API parity.

## Requirements
- `REQ-1`: Add root Docker assets for a local all-in-one stack and a wrapper script for `up/down/ps/logs/ports`.
  - Expected outcome: one script command boots the stack with dynamically assigned host ports.
- `REQ-2`: Docker wrapper must persist project runtime state under `docker/.runtime/` and avoid host port collisions.
  - Expected outcome: each project name gets a reusable port mapping file.
- `REQ-3`: Backend logging config must support `LOG_LEVEL`, `AUTOBYTEUS_HTTP_ACCESS_LOG_MODE`, and `AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY` with safe defaults.
  - Expected outcome: parsed config drives logger level and HTTP access logging policy.
- `REQ-4`: Backend runtime must write console and Fastify logs into `server.log` by default when `AUTOBYTEUS_LOG_DIR` is set/derived.
  - Expected outcome: Docker users can inspect `/home/autobyteus/data/logs/server.log` while `docker logs` still shows output.
- `REQ-5`: `up` default path should include fixture seeding and remote sync readiness for one remote node.
  - Expected outcome: after `up`, seeded fixtures exist and sync run reports success to at least one target.
- `REQ-6`: Documentation must describe startup/teardown commands, seed/sync behavior, and log locations.
  - Expected outcome: root README and Docker README include a working quick-start.

## Acceptance Criteria
- `AC-1`: `bash ./scripts/personal-docker.sh up` generates runtime env, starts compose services, seeds fixtures, and syncs to one remote node by default.
- `AC-2`: `bash ./scripts/personal-docker.sh ports` prints host URLs/ports for web/backend/gateway/noVNC/VNC.
- `AC-3`: `bash ./scripts/personal-docker.sh logs` streams compose logs.
- `AC-4`: logging unit tests pass.
- `AC-5`: workspace build succeeds (`pnpm -r build`) after changes.

## Constraints / Dependencies
- Requires Docker Engine + Compose and Python 3.
- Uses existing monorepo pnpm workspace build chain.

## Assumptions
- Node sync in personal uses explicit source/target endpoints, not discovery REST.

## Risks / Open Questions
- Docker image build duration may be substantial on first run.
- Remote container DNS naming assumptions depend on compose project naming.

## Requirement Coverage Map
- `REQ-1` -> `UC-1`, `UC-2`
- `REQ-2` -> `UC-1`, `UC-2`
- `REQ-3` -> `UC-4`
- `REQ-4` -> `UC-3`, `UC-4`
- `REQ-5` -> `UC-5`, `UC-6`
- `REQ-6` -> `UC-1`, `UC-3`, `UC-5`, `UC-6`
