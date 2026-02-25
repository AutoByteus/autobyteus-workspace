# Enterprise Test Docker Stack (Single Main Container)

This setup is optimized for your requested model:

- one **main all-in-one container** running:
  - `autobyteus-server-ts`
  - `autobyteus-web`
  - `autobyteus-message-gateway`
- optional **remote server-only containers** for distributed-node tests

## Why this model

- lower operational overhead for normal ticket testing
- one container to start/stop/log for the core stack
- remote nodes only when you explicitly need them

## Quick Start

From repo root:

```bash
./scripts/enterprise-docker.sh up
./scripts/enterprise-docker.sh ports
```

Default `up` behavior now includes:

- `--remote-nodes 1`
- `--seed-test-fixtures`
- `--sync-remotes`

Use opt-out flags if needed:

```bash
./scripts/enterprise-docker.sh up -r 0 --no-seed-test-fixtures --no-sync-remotes
```

Start and auto-seed Professor/Student test fixtures explicitly:

```bash
./scripts/enterprise-docker.sh up --seed-test-fixtures
```

Stop stack:

```bash
./scripts/enterprise-docker.sh down
```

## Remote server-only nodes

Start 2 remote server containers:

```bash
./scripts/enterprise-docker.sh up --remote-nodes 2
```

Those remote nodes join discovery as `client` and connect to the main all-in-one container (`registry` by default).

Run startup + fixture seed + automatic full sync to remotes:

```bash
./scripts/enterprise-docker.sh up --remote-nodes 1 --seed-test-fixtures --sync-remotes
```

Run remote full sync manually on an already-running stack:

```bash
./scripts/enterprise-docker.sh sync-remotes -r 1
```

## Port collision avoidance

Ports are auto-selected per project and saved in:

- `docker/.runtime/<project>.env`

Run multiple stacks in parallel with different project names:

```bash
./scripts/enterprise-docker.sh up --project ticket-a
./scripts/enterprise-docker.sh up --project ticket-b
```

## LLM host envs (LM Studio / Ollama)

Both main and remote server containers now receive:

- `LMSTUDIO_HOSTS` (default: `http://host.docker.internal:1234`)
- `OLLAMA_HOSTS` (default: `http://host.docker.internal:11434`)
- `AUTOBYTEUS_LLM_SERVER_HOSTS` (pass-through, optional)

Example with explicit LM Studio host list:

```bash
LMSTUDIO_HOSTS=http://host.docker.internal:1234 \
bash ./scripts/enterprise-docker.sh up --project ticket-a
```

## Access (TigerVNC / browser)

After startup:

```bash
./scripts/enterprise-docker.sh ports
```

Use printed values:

- `web`: frontend UI
- `backend`: server API
- `gateway`: message gateway
- `noVNC`: browser VNC page
- `VNC (TigerVNC)`: `127.0.0.1:<port>`

## Useful commands

Status:

```bash
./scripts/enterprise-docker.sh ps
```

Logs:

```bash
./scripts/enterprise-docker.sh logs
```

Tail only main all-in-one container:

```bash
./scripts/enterprise-docker.sh logs main-allinone
```

Tail only remote servers:

```bash
./scripts/enterprise-docker.sh logs remote-server
```

## Persistent log files

Server process logs are now written by backend runtime logging (not shell `tee`) to files and also streamed to `docker logs`.

Main all-in-one container (persisted in `main-allinone-data` volume):

- `/home/autobyteus/data/logs/server.log`
- `/home/autobyteus/data/logs/web.log`
- `/home/autobyteus/data/logs/gateway.log`

Remote server containers (persisted in `remote-server-logs` volume):

- `/home/autobyteus/logs/server.log`

Quick checks:

```bash
docker exec <main-container> ls -l /home/autobyteus/data/logs
docker exec <main-container> tail -n 200 /home/autobyteus/data/logs/server.log

docker exec <remote-container> ls -l /home/autobyteus/logs
docker exec <remote-container> tail -n 200 /home/autobyteus/logs/server.log
```

Reset volumes:

```bash
./scripts/enterprise-docker.sh down --volumes
```

Delete runtime state file:

```bash
./scripts/enterprise-docker.sh down --delete-state
```

Seed fixtures on an already-running stack:

```bash
./scripts/enterprise-docker.sh seed
```
