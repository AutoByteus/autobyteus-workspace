# API E2E Testing

- Ticket: `frontend-boundary-cleanup`
- Date: `2026-04-03`

## Focused Validation Scope

This round is a bounded cleanup/refactor. There is no new user-visible runtime behavior. Validation focused on:
- shared invocation-alias utility correctness
- touched-files store / lifecycle regression safety
- strengthened web boundary guard behavior
- active prepare-server packaging boundary execution
- fresh backend build plus frontend/backend runtime startup after shutting down prior listeners on ports `3000` and `8000`

## Commands

### 1. Focused frontend tests

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web test:nuxt --run \
  utils/__tests__/invocationAliases.spec.ts \
  stores/__tests__/agentArtifactsStore.spec.ts \
  services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts
```

Result:
- `3 files passed`
- `26 tests passed`

### 2. Boundary guard

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web guard:web-boundary
```

Result:
- `Passed`

### 3. Prepare-server packaging boundary

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web prepare-server
```

Result:
- `Passed`
- packaged server bundle rebuilt under `autobyteus-web/resources/server`
- the web script no longer directly builds or imports `autobyteus-ts`; the server boundary still prepares its own shared prerequisites internally via `autobyteus-server-ts` script ownership

### 4. Prepare-server script syntax checks

```bash
node --check /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web/scripts/prepare-server.mjs
bash -n /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web/scripts/prepare-server.sh
```

Result:
- both commands passed

### 5. Fresh backend build

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-server-ts build
```

Result:
- `Passed`

### 6. Fresh runtime startup check

Commands run:

```bash
# stop existing listeners on 3000 / 8000 if present
lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill
lsof -tiTCP:8000 -sTCP:LISTEN | xargs kill

# start backend
PERSISTENCE_PROVIDER=file AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000 \
node /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-server-ts/dist/app.js \
  --host 0.0.0.0 --port 8000 \
  --data-dir /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/.local/backend-test-data

# start frontend
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web dev
```

Observed result:
- backend listening on `127.0.0.1:8000` (`GET /` returned `404`, expected for this server)
- frontend listening on `127.0.0.1:3000` (`GET /` returned `200`)
- runtime logs written under `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/.local/runlogs/`

## Validation Assessment

- Acceptance criteria `3`, `4`, and `6` are directly covered by focused tests and command evidence.
- Acceptance criteria `1`, `2`, and `5` are supported by source inspection plus:
  - passing `guard:web-boundary`
  - passing `prepare-server`
  - passing fresh backend build
- successful fresh frontend/backend startup after clearing prior listeners
- Stage 7 result: `Pass`

### 7. Electron app build (macOS local build, no notarization)

Command used from the README:

```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web build:electron:mac
```

Result:
- `Passed`
- output artifacts created in `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign/autobyteus-web/electron-dist/`
  - `AutoByteus_enterprise_macos-arm64-1.2.55.dmg`
  - `AutoByteus_enterprise_macos-arm64-1.2.55.dmg.blockmap`
  - `AutoByteus_enterprise_macos-arm64-1.2.55.zip`
  - `AutoByteus_enterprise_macos-arm64-1.2.55.zip.blockmap`
