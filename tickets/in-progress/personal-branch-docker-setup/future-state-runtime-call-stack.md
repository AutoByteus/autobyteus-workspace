# Future-State Runtime Call Stack

## Use Case UC-1: Start all-in-one personal Docker stack
1. User runs `bash ./scripts/personal-docker.sh up`.
2. Script computes/loads project runtime env under `docker/.runtime/<project>.env`.
3. Script allocates host ports if state missing/fresh.
4. Script executes `docker compose -f docker/compose.personal-test.yml up -d --build`.
5. Container `main-allinone` starts supervisor programs:
   - `allinone-start-server.sh`
   - `allinone-start-gateway.sh`
   - `allinone-start-web.sh`
6. Server startup initializes app config -> logging config -> runtime logger bootstrap -> Fastify app.
7. Logs stream to stdout/stderr and persist to `/home/autobyteus/data/logs/server.log`.

## Use Case UC-2: Tail logs
1. User runs `bash ./scripts/personal-docker.sh logs`.
2. Script loads runtime env path and forwards to compose `logs -f`.
3. User sees combined process logs and can inspect persisted files inside volume.

## Use Case UC-3: Backend HTTP access logging policy
1. App boot resolves logging policy from env.
2. Fastify request default logging disabled.
3. Custom `onResponse` hook emits logs based on mode and noisy-route filter.
4. Output passes through fanout stream and lands in console + server log file.
