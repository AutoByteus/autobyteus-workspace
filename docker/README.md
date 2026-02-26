# Personal Branch Docker Stack

This setup provides:

- `autobyteus-server-ts`
- `autobyteus-web`
- `autobyteus-message-gateway`
- optional remote `autobyteus-server-ts` containers for node-sync validation

## Quick Start

From repo root:

```bash
./scripts/personal-docker.sh up
./scripts/personal-docker.sh ports
```

Default `up` behavior includes:

- one remote server node (`--remote-nodes 1`)
- fixture seeding (`--seed-test-fixtures`)
- post-start remote full sync (`--sync-remotes`)

If you only want main all-in-one startup:

```bash
./scripts/personal-docker.sh up -r 0 --no-seed-test-fixtures --no-sync-remotes
```

Stop stack:

```bash
./scripts/personal-docker.sh down
```

## Useful Commands

Status:

```bash
./scripts/personal-docker.sh ps
```

Logs:

```bash
./scripts/personal-docker.sh logs
```

Tail one service:

```bash
./scripts/personal-docker.sh logs main-allinone
```

Seed fixtures on an existing stack:

```bash
./scripts/personal-docker.sh seed
```

Run remote sync on an existing stack:

```bash
./scripts/personal-docker.sh sync-remotes -r 1
```

Reset volumes:

```bash
./scripts/personal-docker.sh down --volumes
```

Delete saved runtime state:

```bash
./scripts/personal-docker.sh down --delete-state
```

## Collision-Safe Ports

Runtime port assignments are saved per project in:

- `docker/.runtime/<project>.env`

Use multiple stacks in parallel by project name:

```bash
./scripts/personal-docker.sh up --project ticket-a
./scripts/personal-docker.sh up --project ticket-b
```

## Persistent Log Files

Main container logs are persisted under:

- `/home/autobyteus/data/logs/server.log`
- `/home/autobyteus/data/logs/web.log`
- `/home/autobyteus/data/logs/gateway.log`

Quick checks:

```bash
docker exec <main-container> ls -l /home/autobyteus/data/logs
docker exec <main-container> tail -n 200 /home/autobyteus/data/logs/server.log
```

Remote server logs are persisted under:

- `/home/autobyteus/logs/server.log`
