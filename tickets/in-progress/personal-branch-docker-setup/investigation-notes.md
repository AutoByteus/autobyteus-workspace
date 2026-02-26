# Investigation Notes

## Context
- Task: bring enterprise-style Docker test workflow to `personal` branch and align default server log behavior so Docker runtime produces persistent logs by default.
- Working branch: `codex/personal-docker-setup` (from `personal`).

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md`
- `git diff --name-status personal..enterprise`
- `git show enterprise:README.md`
- `git show enterprise:docker/README.md`
- `git show enterprise:docker/compose.enterprise-test.yml`
- `git show enterprise:docker/Dockerfile.allinone`
- `git show enterprise:docker/Dockerfile.remote-server`
- `git show enterprise:docker/allinone-start-server.sh`
- `git show enterprise:docker/allinone-start-web.sh`
- `git show enterprise:docker/allinone-start-gateway.sh`
- `git show enterprise:scripts/enterprise-docker.sh`
- `git show enterprise:autobyteus-server-ts/src/config/logging-config.ts`
- `git show enterprise:autobyteus-server-ts/src/logging/http-access-log-policy.ts`
- `git show enterprise:autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/app.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/config/app-config.ts`

## Key Findings
- `enterprise` has root-level all-in-one Docker assets (`docker/*`, `scripts/enterprise-docker.sh`) missing in `personal`.
- `enterprise` server logging adds:
  - typed logging config parsing from env,
  - explicit HTTP access log filtering policy,
  - runtime bootstrap that fans out logs to both stdout/stderr and `server.log`.
- `personal` currently uses Fastify default request logging toggle (`DISABLE_HTTP_REQUEST_LOGS`) and does not create a unified runtime log file sink by default.
- `enterprise` Docker helper defaults include remote-node discovery/sync behavior. `personal` does not expose the same discovery REST endpoints (`/rest/node-discovery/*`), so remote-sync defaults would break if copied directly.

## Constraints
- Keep `personal` branch behavior stable outside logging/docker scope.
- Deliver Docker setup usable immediately for local ticket testing.
- Avoid enterprise-only distributed assumptions in default workflow.

## Open Unknowns
- Whether fixture seed mutations all exist identically in `personal`; if not, seed should be optional.

## Implications
- Port logging primitives with minimal integration into current `personal` app bootstrap.
- Create a personal-compatible all-in-one Docker stack and script; include safe defaults (no remote-sync dependency by default).
