# API / E2E Testing

- Ticket: `server-docker-codex-claude-cli`
- Status: `Pass`
- Last Updated: `2026-03-10`

## Acceptance Coverage

1. Image builds with Codex CLI and Claude Code preinstalled: `Passed`
2. Container starts successfully with the modified compose configuration: `Passed`
3. Both CLIs are available inside the running container: `Passed`
4. `/root` is persisted through a per-project Docker-managed volume: `Passed`
5. The same project retains `/root` state across forced recreate: `Passed`
6. The server still answers GraphQL after the change: `Passed`
7. `down --volumes` clears the disposable test instance state: `Passed`

## Commands Run

```bash
docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-server:test-cli-root .
AUTOBYTEUS_IMAGE_TAG=test-cli-root AUTOBYTEUS_BACKEND_PORT=18001 AUTOBYTEUS_VNC_PORT=15908 AUTOBYTEUS_WEB_VNC_PORT=16080 AUTOBYTEUS_CHROME_DEBUG_PORT=19228 docker compose -p cli-root-test -f autobyteus-server-ts/docker/docker-compose.yml up -d
docker exec cli-root-test-autobyteus-server-1 bash -lc 'whoami; echo HOME=$HOME; codex --version; claude --version'
docker inspect cli-root-test-autobyteus-server-1 --format '{{json .Mounts}}'
docker exec cli-root-test-autobyteus-server-1 bash -lc 'echo persisted > /root/.codex/persist-check.txt'
AUTOBYTEUS_IMAGE_TAG=test-cli-root AUTOBYTEUS_BACKEND_PORT=18001 AUTOBYTEUS_VNC_PORT=15908 AUTOBYTEUS_WEB_VNC_PORT=16080 AUTOBYTEUS_CHROME_DEBUG_PORT=19228 docker compose -p cli-root-test -f autobyteus-server-ts/docker/docker-compose.yml up -d --force-recreate
docker exec cli-root-test-autobyteus-server-1 bash -lc 'cat /root/.codex/persist-check.txt'
curl -s -X POST http://127.0.0.1:18001/graphql -H 'content-type: application/json' --data '{"query":"{ __typename }"}'
AUTOBYTEUS_IMAGE_TAG=test-cli-root AUTOBYTEUS_BACKEND_PORT=18001 AUTOBYTEUS_VNC_PORT=15908 AUTOBYTEUS_WEB_VNC_PORT=16080 AUTOBYTEUS_CHROME_DEBUG_PORT=19228 docker compose -p cli-root-test -f autobyteus-server-ts/docker/docker-compose.yml down --volumes
```

## Notes

1. The verification was local and container-focused; it did not exercise a full interactive browser login for Codex or Claude.
2. The critical persistence contract for such a login was verified by persisting a marker file under `/root/.codex` across recreate.
