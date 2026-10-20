# autobyteus-workspace

Monorepo workspace for the AutoByteus TypeScript platform.

## Workspace projects

- `autobyteus-web`
- `autobyteus-server-ts`
- `autobyteus-ts`
- `autobyteus-android` native wrapper for the existing `/mobile` shell
- `autobyteus-ios` native wrapper for the existing `/mobile` shell
- `autobyteus-application-sdk-contracts`
- `autobyteus-application-frontend-sdk`
- `autobyteus-application-backend-sdk`
- `autobyteus-application-devkit`
- `applications/*` sample application source projects

## Collaboration model

AutoByteus separates reusable Teams from multi-Team organizations:

- an **AgentTeam** is flat, contains Agent members only, and has one direct
  Agent coordinator;
- an **AgentOrg** is coordinator-free and can contain direct Agents plus
  reusable flat Teams; and
- task delegation may create task-scoped Team executions without creating
  persistent Team-within-Team configuration.

AgentOrg launch configures the complete Org first, then the user selects an exact
Agent or Team before messaging. Team targets enter through that Team's
coordinator. Definitions use target-only Team V2 and AgentOrg V1 contracts;
unsupported nested or legacy definitions fail admission rather than being
silently flattened.

Architecture and UI details:

- [Server AgentTeam definitions](autobyteus-server-ts/docs/modules/agent_team_definition.md)
- [Server AgentOrg model](autobyteus-server-ts/docs/modules/agent_orgs.md)
- [Frontend Agent Teams](autobyteus-web/docs/agent_teams.md)
- [Frontend Agent Orgs](autobyteus-web/docs/agent_orgs.md)

## Setup

```bash
git clone https://github.com/AutoByteus/autobyteus-workspace.git
cd autobyteus-workspace
pnpm install
```

## Custom application development

New external custom applications should start with the reusable
`@autobyteus/application-devkit` CLI and the canonical source/output layout:

- editable source under `src/frontend`, `src/backend`, optional `src/agents`,
  and optional `src/agent-teams`;
- generated importable packages under `dist/importable-package/applications/<app-id>/`;
- runtime package folders named `ui/` and `backend/` only inside the generated
  package root expected by AutoByteus import.

Full guide:
- [`docs/custom-application-development.md`](docs/custom-application-development.md)

## Phone Access / Remote Access

AutoByteus desktop can pair a phone/PWA to a reachable AutoByteus node over a private network path the user already trusts, such as Tailscale/Headscale, company VPN, NetBird, Netmaker, WireGuard, or a trusted Local LAN. The desktop flow lives in **Nodes -> Phone Setup**, where the Tailscale Serve guide and Phone Access controls generate a short-lived `/mobile?pairing=...` QR/link served by the backend at `/mobile`. New desktop-created pairing QR codes support stable private `https://` URLs and acknowledged trusted Local LAN/private `http://` URLs; Tailscale Serve HTTPS remains the recommended setup for Android, iOS, and travel use.

For remote-node Phone Access, create or open the current AutoByteus node in its own desktop window, then create the QR with a phone-facing private-network `/mobile` URL that the phone can reach and that maps to that same node. HTTPS is preferred; trusted private HTTP requires explicit cleartext acknowledgement, and public HTTP or local-only hosts are rejected. Desktop/Electron access to the full backend relies on the trusted private-network product model, while Android/iOS/mobile clients receive separate paired-phone `mra_...` credentials that do not authorize owner-management routes. Do not expose the full backend directly to the public internet. See [`autobyteus-web/docs/remote_access.md`](autobyteus-web/docs/remote_access.md), [`docs/android_mobile_access.md`](docs/android_mobile_access.md), and [`docs/ios_mobile_access.md`](docs/ios_mobile_access.md).

User and packaging details are in [`autobyteus-web/docs/remote_access.md`](autobyteus-web/docs/remote_access.md); backend route/auth details are in [`autobyteus-server-ts/docs/features/remote_access.md`](autobyteus-server-ts/docs/features/remote_access.md).

## Memory Sync / Memory Hub

AutoByteus servers can synchronize persisted agent and agent-team memory into a
hub node without changing the local runtime memory layout. Configure the current
node from **Nodes -> Memory Sync**:

- enable **Memory Hub** on the receiving node and confirm the advertised hub URL
  that sources can reach;
- copy the backend-generated `mhub_...` source token when it is created or
  regenerated, because plaintext tokens are shown only once;
- open each Docker, Kubernetes, or remote source node in its own node-bound
  window, set a stable `sourceNodeId`, paste the hub URL/token, and run
  **Test connection** before **Sync now** or background sync.

On a source node, **Test connection** reports its result inline beside the
source action controls. If the token input is blank after source settings have
been saved, the test uses the fully persisted source configuration, including
the saved redacted token. If a token is pasted into the draft field, the test
uses the draft hub URL, source id, and token together. **Sync now** shows a
disabled `Syncing…` state while work is in flight, and the Source card reports
`Current job` plus `Last sync` so a latest error is visible even when an older
success timestamp still exists.

The hub keeps local runtime memory in `memory/agents` and `memory/agent_teams`
unchanged. Imported source corpora are stored separately under
`memory/imports/<sourceNodeId>/` and appear in the Memory page source selector as
read-only imported memory. Imported memory is for browsing and future analysis;
it is not local runnable state and does not enable restore/continue/delete
actions.

For Docker sources on the same host, the hub URL may need a Docker-reachable
address such as `http://host.docker.internal:<port>` rather than desktop
loopback. For Kubernetes or remote deployments, use a Service, Ingress, VPN,
tailnet, or other trusted private route that reaches the hub. Details:
[`autobyteus-server-ts/docs/features/memory_sync.md`](autobyteus-server-ts/docs/features/memory_sync.md)
and [`autobyteus-web/docs/memory.md`](autobyteus-web/docs/memory.md).

## Run The Published Server Docker

If you want to start the released server image without cloning this repository, use the public launcher. It pulls `autobyteus/autobyteus-server:latest`, keeps state outside any source checkout, prefers friendly sequential host ports for indexed Docker nodes when they are available, falls back to non-conflicting random ports when needed, and prints the Backend URL to add in **Nodes -> Manage Nodes -> Add Remote Node**.

Install the local launcher once:

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.ps1 | iex; autobyteus-docker install"
```

The installer writes the launcher entry and its adjacent support modules into
the local install directory, so installed `autobyteus-docker` commands do not
need a repository checkout. On macOS/Linux it prints the installed executable
path, a direct-path command that works immediately, current-shell
`export PATH=...` guidance, and persistent shell-profile setup/update status.
When automatic profile update is skipped, unavailable, or blocked by an
existing different managed block, it also prints copy/paste persistent setup
commands for the detected profile. A child installer process cannot update the
already-running parent shell, so use the direct path, run the printed export in
the current shell, or open a new terminal after a successful persistent profile
update.

Then use direct local commands. `new-container` checks/pulls the image and creates the next indexed managed container:

```bash
autobyteus-docker new-container
```

Repeated `new-container` calls create `autobyteus-server-0`, then
`autobyteus-server-1`, then `autobyteus-server-2`, and so on. Fresh indexed
nodes prefer friendly sequential ports when those ports are free: server-0 uses
Backend/VNC/noVNC/debug ports `8001`/`5908`/`6080`/`9228`, server-1 uses
`8002`/`5909`/`6081`/`9229`, server-2 uses
`8003`/`5910`/`6082`/`9230`, and later nodes continue the same offsets. If a
preferred port is unavailable, that service uses a safe random fallback port.
Existing nodes keep their saved ports during normal inspect/start paths unless
those ports become unavailable and the launcher must recreate with fresh ports.

Use the printed Backend URL in **Nodes -> Manage Nodes -> Add Remote Node**, then open
that Docker node window only over a trusted LAN, VPN, tailnet, or equivalent
private-network path. Desktop/Electron access to that node follows the trusted
private-network product model; do not expose the full backend directly to the
public internet. Paired phones receive only separate `mra_...` mobile credentials,
and those credentials do not authorize owner-management routes. Current server
Docker images package the `/mobile` web shell so the QR target is served by the
container itself.

For managed containers, the public launcher keeps private Docker named volumes
outside the container writable layer:
`<node>-data` stays mounted at `/home/autobyteus/data`, `<node>-root-home`
stays mounted at `/root`, `<node>-chromium-profile` stays mounted at
`/home/vncuser/.config/chromium` for private Chromium browser profile state,
and `<node>-workspace` stays mounted at `/app/autobyteus-server-ts/workspace`.
It also creates a host-visible shared workspace root outside the source tree:

- macOS / Linux default: `$HOME/.autobyteus/docker-server/shared-workspace`
- Windows default: `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace`
- Override: `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`

Inside each managed container, user files land in simple stable paths:
`/home/autobyteus/workspace` is backed by that node's host folder, and
`/home/autobyteus/shared` is backed by one shared host folder visible to every
managed Docker node. The launcher sets
`AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`, so default
terminal/agent work appears in the host-visible node workspace.

Inspect path, storage, URL, and port mappings. These read-only commands show
all managed nodes by default; use `--name autobyteus-server-1` to narrow
`workspace paths` or `storage`, and use either `--name autobyteus-server-1` or
`autobyteus-docker urls autobyteus-server-1` /
`autobyteus-docker ports autobyteus-server-1` for one node:

```bash
autobyteus-docker workspace paths
autobyteus-docker storage
autobyteus-docker urls
autobyteus-docker ports
```

Existing containers need a one-time safe recreate before they receive the
current launcher volume and bind-mount set. This keeps named volumes and host
folders:

```bash
autobyteus-docker workspace apply --all
```

Any existing files under `/home/autobyteus/data/temp_workspace` remain preserved
in the data named volume, but `/home/autobyteus/workspace` becomes the default
temp workspace after apply. On Linux hosts, files written from the current
root-running container into bind-mounted host folders may be root-owned.

Claude Agent SDK sessions automatically read Claude Code filesystem settings.
For this Docker image, the `user` Claude Code settings source resolves to
`/root/.claude/settings.json` inside the container because the server process
runs as `root`. Keep the `/root` volume mounted if you want Claude Code auth,
gateway, or model settings to survive container recreation.

Useful endpoints after startup:

```text
Backend: printed by the launcher, usually http://localhost:8001
GraphQL: <Backend>/graphql
REST:    <Backend>/rest/*
WS:      ws://localhost:<Backend port>/ws/...
noVNC:   printed by the launcher, usually http://localhost:6080
VNC:     printed by the launcher, usually localhost:5908
```

Upgrade every managed Docker node while keeping named volumes. A plain upgrade
uses each node's saved image ref, so mixed fleets stay on their current image
line (for example, `latest` nodes stay on `latest` and `latest-zh` nodes stay
on `latest-zh`):

```bash
autobyteus-docker upgrade --all
```

To intentionally retarget every managed node to a new tag or image, make that
explicit:

```bash
autobyteus-docker upgrade --all --tag latest-zh
autobyteus-docker upgrade --all --image autobyteus/custom-server:latest-zh
```

Remove every managed Docker node while keeping named volumes:

```bash
autobyteus-docker destroy --all
```

Remove one launcher-managed node, including stale launcher state left after a
manual `docker rm`, without deleting its named volumes or host workspaces:

```bash
autobyteus-docker destroy --name autobyteus-server-5
autobyteus-docker new-container  # reuses the lowest available indexed slot
```

The targeted form accepts only AutoByteus-managed server nodes and refuses
ambiguous, conflicting, or unmanaged containers. It does not own Docker
Buildx infrastructure. Remove the separate builder through its owner:

```bash
docker buildx rm multi-platform-builder
```

Reset to one fresh managed Docker node:

```bash
autobyteus-docker reset
```

Show all managed Docker node URLs again:

```bash
autobyteus-docker urls
```

Stop the default node without removing named volumes. Pass a node name to stop
one explicit node, or use `--all` when you intentionally want to stop every
managed node:

```bash
autobyteus-docker stop
```

If you already cloned this repository, the source helper can build the monorepo server image from your checkout or use a published image:

```bash
cd autobyteus-server-ts/docker

# Build and start from local source (the default)
./docker-start.sh up --build-local

# Or start from the published release image
./docker-start.sh up --pull-remote
./docker-start.sh ports
```

Full guide:
- [`autobyteus-server-ts/docker/README.md`](autobyteus-server-ts/docker/README.md)

## Build examples

```bash
pnpm --filter autobyteus-web build
pnpm --filter autobyteus-server-ts build
```

## Isolated app instances (agents, tutorials, screenshots, video)

Agents and developers can start a disposable AutoByteus desktop instance beside
the main app. It has its own ports and data, never touches production data, and
has no update checks. They can drive it like a person with a visible cursor,
take screenshots and record MP4 video:

```bash
pnpm isolated-app start            # installed app; --from-worktree / --build for this worktree
pnpm isolated-app list
pnpm isolated-app stop <instanceId>
```

`start` picks free ports and reports `instanceId` and `controlPort`; pass that
`controlPort` to browser-automation and that `instanceId` to `stop`/`restart`,
so several worktrees can run instances in parallel.

For when to use an isolated instance in validation, see [TESTING.md](TESTING.md).
See the [isolated app instances guide](docs/isolated-app-instances.md) and the
agent skill [`skills/autobyteus-isolated-app`](skills/autobyteus-isolated-app/SKILL.md).

## Packaged Electron API/E2E testing

How this workspace is tested, and which path to choose for a change, is summarized in
[TESTING.md](TESTING.md).

After the root [`Setup`](#setup), run packaged Electron checks from the frontend
project. The thin launcher builds the current host package by default, selects a
free non-`29695` loopback port and isolated temporary data root, waits for
readiness, and cleans up only the process tree and temporary root it owns:

```bash
cd autobyteus-web
pnpm test:e2e:electron --adapter direct
pnpm test:e2e:electron --adapter playwright
```

Add `--hold-ms <milliseconds>` for hands-on inspection. To exercise an existing
current-worktree artifact without rebuilding it, pass its executable rather
than a DMG/ZIP:

```bash
pnpm test:e2e:electron \
  --skip-build \
  --adapter playwright \
  --executable /absolute/path/to/AutoByteus
```

Run the durable five-scenario isolation probe when validating coexistence,
renderer routing, parallel launches, rejected configurations, updater
suppression, and cleanup ownership:

```bash
pnpm test:e2e:electron:isolation \
  --skip-build \
  --executable /absolute/path/to/AutoByteus \
  --output-dir test-results/electron-launch-profile
```

Do not insert a standalone `--` after either package-script name; these thin
CLIs receive their options directly. The launcher removes an inherited
`ELECTRON_RUN_AS_NODE`, preserves the rest of the caller environment for the
desktop process and overlays the three documented isolation variables. The
isolated app's embedded server receives only a system-baseline environment, so
production AutoByteus, database and provider settings from the caller never
reach it. For model access, start it with `AUTOBYTEUS_TEST_VAULT` set: the
embedded server receives that selector and reads the test vault read-only (see
[TESTING.md](TESTING.md#test-vault)).

See the frontend [packaged Electron E2E guide](autobyteus-web/README.md#packaged-electron-e2e-launches)
and the [canonical launch/ownership contract](autobyteus-web/docs/electron_packaging.md#packaged-e2e-launch-profile)
for platform executable paths, explicit port/data-root options, safe-root
validation, and cleanup behavior.

## Local full-stack development

Start the real built backend and Nuxt development frontend with the one
canonical development command:

```bash
pnpm dev
```

The launcher validates the credential-free
`autobyteus-server-ts/.env.development` template, creates an owner-private
runtime environment, and reports readiness only after both exact endpoints are
available:

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:3000`

Development state persists under
`<repo>/.autobyteus/development/server-data/` (database, vault key, logs,
memory, workspaces, and runtime `.env`). It is separate from test state and
packaged Electron state. The launcher does not read `.env`, `.env.test`,
`.env.example`, or a home-directory environment file. Press `Ctrl+C` in the
owning terminal to stop both owned processes.

Configure development credentials through the existing Settings UI, or use
the existing importer with the displayed absolute development database URL:

```bash
pnpm secrets:import -- \
  --source /absolute/path/to/assignments \
  --database-url file:/absolute/path/to/.autobyteus/development/server-data/db/development.db
```

To reset only development state, stop `pnpm dev` and run this from the
repository root:

```bash
rm -rf .autobyteus/development
```

Deterministic E2E assertions are separate from the manual development stack:

```bash
pnpm test:e2e
```

The command runs the existing server Vitest E2E suite with its test-owned
isolated database/runtime. External-provider capabilities remain explicit:

```bash
pnpm test:e2e:real:preflight
pnpm test:e2e:real
```

Preflight and execution report unconfigured or unavailable external
capabilities explicitly; they must not be represented as passed. See the
server README for server-specific test and credential details.

## Testing (Codex Runtime)

See [TESTING.md](TESTING.md) for the complete testing guideline.

For Codex-related tickets, run backend tests with Codex live transport enabled.
Without this env var, Codex live E2E suites are skipped.

```bash
RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run
pnpm -C autobyteus-web test
```

## Codex Runtime Model Configuration

Codex launch and resume flows use schema-driven model configuration. When a
Codex App Server model-catalog row advertises provider tier ID `priority` in
its structured `serviceTiers` metadata, the runtime/model config UI exposes
**Fast mode** and persists the distinct AutoByteus product value as
`llmConfig.service_tier = "fast"`. Reasoning effort remains a separate setting
such as `llmConfig.reasoning_effort = "high"`.

The launch UI displays valid schema defaults as effective values without writing
them into `llmConfig`. For example, a Codex model whose catalog default is
`reasoning_effort = "medium"` shows **Thinking** on, opens **Advanced** by
default, and displays `Reasoning Effort = medium` while the launch config can
remain unset. If a Codex schema does not advertise an off/`none` value, the UI
keeps that enabled state read-only instead of emitting an unsupported disable
payload.

Fast mode applies to new or restored Codex sessions and subsequent turns through
the Codex App Server `serviceTier` request field. Leaving the control at
Default/off omits the setting and keeps Codex's default service tier.

## Runtime Sandbox Overrides

Codex full filesystem access can be toggled from the UI at **Settings -> Server
Settings -> Basics -> Codex full access**. The toggle is backed by the
`CODEX_APP_SERVER_SANDBOX` server setting / environment variable for scripted or
headless runs.

- Codex runtime: `CODEX_APP_SERVER_SANDBOX=danger-full-access`
  - Basic UI toggle on: saves `danger-full-access`
  - Basic UI toggle off: saves `workspace-write`
  - Advanced/API supported values: `read-only`, `workspace-write`, `danger-full-access`
  - Default: `workspace-write`
  - UI and server-setting changes apply to new/future Codex sessions, not already-active sessions.
  - `danger-full-access` disables filesystem sandboxing; use only for trusted tasks and environments.
  - Codex run launch `autoExecuteTools=true` is a separate high-trust per-run
    policy. For that standalone or team-member run it automatically approves
    tool calls and Codex access/permission requests, and the backend
    starts/resumes Codex with an effective `danger-full-access` sandbox even if
    the saved full-access setting is off. Leave auto-approve off when you want
    visible approval prompts.
- Claude Agent SDK runtime: standard standalone and team-member launches use
  Claude Code provider `permissionMode: "default"`.
  - AutoByteus run launch `autoExecuteTools=true` is a separate per-run approval
    policy. For Claude Agent SDK runs, it auto-approves permission callbacks
    through AutoByteus orchestration; it does not switch Claude Code into
    `bypassPermissions`.
  - Do not use `bypassPermissions` as the Docker/root steady-state launch mode.
    Claude Code rejects its dangerous skip-permissions mode when the process runs
    with root/sudo privileges.
  - If a future feature needs explicit Claude provider permission modes such as
    `plan`, `acceptEdits`, or `bypassPermissions`, treat that as a separate
    provider-level setting with runtime validation, not as auto-approve behavior.

Example:

```bash
CODEX_APP_SERVER_SANDBOX=danger-full-access \
pnpm -C autobyteus-server-ts dev
```

## Android (Termux) Quick Start

Run inside Termux:

```bash
pnpm android:bootstrap
pnpm android:server:start
```

Useful commands:

```bash
pnpm android:bootstrap:check
pnpm android:server:start:bg
pnpm android:server:status
pnpm android:server:stop
```

## Release workflow

Releases are cut from the `personal` branch by pushing a `v*` tag, which starts
the desktop, Android, iOS and server Docker release workflows. The procedure,
checks, channels, workflow details and required secrets are in
[RELEASE.md](RELEASE.md).

## License

AutoByteus is dual-licensed:

- **Open source** under the [GNU Affero General Public License v3.0 only](./LICENSE)
  (AGPL-3.0-only). If you distribute AutoByteus or a modified version, or let
  others use a modified version over a network, you must publish your complete
  source code under AGPL-3.0.
- **Commercial license** for closed-source products or services without the
  AGPL-3.0 obligations. Contact **ryan.zheng.work@gmail.com**.

The application SDK, devkit and contract packages are licensed under the Apache
License 2.0, so applications built on them may use any license. Releases up to
and including v1.4.97 remain available under the Apache License 2.0.

See [`LICENSING.md`](./LICENSING.md) for the component map and details, and
[`NOTICE`](./NOTICE) for attribution.

Contributions: see [CONTRIBUTING.md](./CONTRIBUTING.md); outside contributions require accepting the [CLA](./CLA.md).
