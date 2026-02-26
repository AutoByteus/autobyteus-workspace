# Proposed Design (v1)

## Current State (As-Is)
- Root repo has no all-in-one Docker orchestration for personal-branch integration testing.
- Backend logging relies mainly on Fastify defaults and environment toggles, without unified runtime file sink.

## Target State (To-Be)
- Root-level all-in-one Docker stack for `autobyteus-server-ts`, `autobyteus-web`, and `autobyteus-message-gateway`.
- One script (`scripts/personal-docker.sh`) manages lifecycle and collision-safe ports.
- Backend logging uses explicit policy config + runtime fanout stream to console and `server.log`.

## Architecture Direction
- Keep existing module boundaries.
- Add dedicated logging module surface in `autobyteus-server-ts/src/logging/*` and config parser in `src/config/logging-config.ts`.
- Add repo-root Docker orchestration boundary under `docker/` + `scripts/`.

## Change Inventory
- Add: `autobyteus-server-ts/src/config/logging-config.ts`
- Add: `autobyteus-server-ts/src/logging/http-access-log-policy.ts`
- Add: `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts`
- Modify: `autobyteus-server-ts/src/app.ts`
- Modify: `autobyteus-server-ts/src/config/app-config.ts`
- Add: unit tests for logging modules
- Add: root docker assets + helper script
- Modify: root `README.md`

## Use-Case Coverage Matrix
- `UC-1`: Yes primary / N/A fallback / Yes error path
- `UC-2`: Yes primary / N/A fallback / Yes error path
- `UC-3`: Yes primary / N/A fallback / Yes error path
- `UC-4`: Yes primary / N/A fallback / Yes error path

## Naming Decisions
- `personal-docker.sh` chosen to avoid confusion with enterprise-only remote-sync semantics.
- `compose.personal-test.yml` chosen to make branch intent explicit.

## Dependency Flow
- `app.ts` -> `config/logging-config` + `logging/*`
- Docker scripts -> `docker/compose.personal-test.yml` + optional seed helper

## Risks and Mitigations
- Risk: over-importing enterprise-only behavior.
- Mitigation: remove remote discovery/sync from default personal script path; keep stack local-first.
