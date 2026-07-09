# autobyteus-workspace

Monorepo workspace for the AutoByteus TypeScript platform.

## Workspace projects

- `autobyteus-web`
- `autobyteus-server-ts`
- `autobyteus-ts`
- `autobyteus-message-gateway`
- `autobyteus-android` native wrapper for the existing `/mobile` shell
- `autobyteus-ios` native wrapper for the existing `/mobile` shell
- `autobyteus-application-sdk-contracts`
- `autobyteus-application-frontend-sdk`
- `autobyteus-application-backend-sdk`
- `autobyteus-application-devkit`
- `applications/*` sample application source projects

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

If you already cloned this repository and want developer/source-helper behavior, you can use the source helper instead:

```bash
cd autobyteus-server-ts/docker
./docker-start.sh up --pull-remote
./docker-start.sh ports
```

Full guide:
- [`autobyteus-server-ts/docker/README.md`](autobyteus-server-ts/docker/README.md)

## All-in-one Docker startup (personal branch)

Use these commands from the repo root:

```bash
./scripts/personal-docker.sh up
./scripts/personal-docker.sh ports
```

Default `up` behavior includes one remote node and fixture seeding.
If you only want the main all-in-one container:

```bash
./scripts/personal-docker.sh up -r 0 --no-seed-test-fixtures
```

Stop stack:

```bash
./scripts/personal-docker.sh down
```

Full guide:
- [`docker/README.md`](docker/README.md)

## Build examples

```bash
pnpm --filter autobyteus-web build
pnpm --filter autobyteus-server-ts build
pnpm --filter autobyteus-message-gateway build
```

## Testing (Codex Runtime)

For Codex-related tickets, run backend tests with Codex live transport enabled.
Without this env var, Codex live E2E suites are skipped.

```bash
RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run
pnpm -C autobyteus-web test
```

## Codex Runtime Model Configuration

Codex launch and resume flows use schema-driven model configuration. When the
Codex App Server model catalog reports a model with the `fast` speed tier, the
runtime/model config UI exposes **Fast mode** and persists it as
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

- Workflow files:
  - `.github/workflows/release-desktop.yml`
  - `.github/workflows/release-android.yml`
  - `.github/workflows/release-ios.yml`
  - `.github/workflows/release-messaging-gateway.yml`
  - `.github/workflows/release-server-docker.yml`
- Triggers:
  - push tag `v*` (for example: `v1.1.8`)
  - manual run via `workflow_dispatch`
- Artifacts:
  - macOS ARM64 DMG + blockmap
  - macOS Intel x64 DMG + blockmap
  - Linux x64 AppImage + `latest-linux.yml` metadata with embedded AppImage `blockMapSize`
  - Linux ARM64 AppImage + `latest-linux-arm64.yml` metadata with embedded AppImage `blockMapSize`
  - signed Android APK on the same GitHub Release
  - iOS simulator build/test workflow artifacts, plus signed `.ipa` upload to App Store Connect/TestFlight when iOS publish secrets are configured
  - managed messaging runtime package assets on the same GitHub Release
  - Docker Hub server image for `linux/amd64,linux/arm64`
- Release notes:
  - GitHub Releases use curated user-facing notes from `.github/release-notes/release-notes.md` when that file exists in the tagged revision.
  - The release helper prepares that file from the ticket `release-notes.md`.
  - Historical tags that predate the curated file fall back to GitHub generated notes during manual republish.
- Version/tag sync is mandatory:
  - `autobyteus-web/package.json` and `autobyteus-message-gateway/package.json` versions must both match the release tag version (`vX.Y.Z`).
  - The release helper synchronizes both package versions and the bundled managed messaging manifest before tagging.
  - The desktop, Android, and messaging-gateway release workflows enforce those checks and fail on mismatch.
- Desktop Electron runtime baseline validation is mandatory:
  - `autobyteus-web/package.json` pins the reviewed Electron runtime exactly, and the root `pnpm-lock.yaml` is the canonical workspace lockfile.
  - Electron baseline changes must be validated with native-module rebuild evidence, focused Electron tests, and a desktop package smoke build because Chromium, Node.js, native-module ABI, packaging, and updater behavior change together.
- Repository artifact hygiene is mandatory:
  - `scripts/check_repository_artifact_hygiene.py` rejects tracked raw `.xcresult` bundles, generated ticket artifact drops, and checkout-risk path lengths.
  - `.github/workflows/release-desktop.yml` runs this guard in `prepare-release` before platform build jobs fan out, so checkout-hostile evidence cannot break the Windows release job again.
- Desktop macOS terminal runtime validation is mandatory:
  - `.github/workflows/release-desktop.yml` validates staged and final packaged `node-pty` helpers for both Darwin ARM64 and Intel x64, and validates Linux x64/ARM64 AppImage architecture, Prisma engines, updater metadata, and packaged server startup.
  - Matching-architecture runners also execute a real `node-pty` spawn probe so a non-executable packaged `spawn-helper` cannot silently ship.
- Desktop macOS signing policy validation is mandatory:
  - `.github/workflows/release-desktop.yml` runs `scripts/verify-macos-signing-policy.mjs` for both macOS ARM64 and Intel x64 before artifact upload.
  - The verifier requires Squirrel, ShipIt, frameworks, `.dylib` files, `.node` native modules, and bundled server native binaries to have no entitlement keys while the root app and Electron helper app executables retain role-specific entitlements.
  - If an installed macOS app already has a broken updater helper signature, users may need one manual fixed-DMG install before future auto-updates can apply from the corrected source app.
- Android APK release:
  - public Android publishing uses `.github/workflows/release-android.yml`
  - release tags and publish-enabled manual runs require signing secrets and build `AutoByteus_personal_android-X.Y.Z-release.apk`
  - manual workflow-dispatch build-only runs can upload a private `android-apk` workflow artifact without publishing a GitHub Release
  - debug APKs are allowed only as manual build-only workflow artifacts and must not be uploaded to GitHub Releases
- iOS App Store Connect/TestFlight release:
  - iOS automation uses `.github/workflows/release-ios.yml`
  - release tags and publish-enabled manual runs build/test first, then require complete iOS/App Store Connect secrets before signed archive/export/upload
  - manual workflow-dispatch build-only runs use `publish_app_store_connect=false` and upload private simulator build/test artifacts without requiring Apple distribution secrets
  - simulator build/test and App Store archive/upload jobs select Xcode 26 or newer through `IOS_XCODE_APP_PATH` (default `/Applications/Xcode_26.3.app`) and log the selected Xcode plus iPhoneOS SDK before invoking `xcodebuild`
  - publish requests with missing iOS secrets fail fast with exact missing `IOS_*` / `APP_STORE_CONNECT_*` names before keychain/profile/archive/upload
  - prerelease tags split metadata for App Store compatibility: `v1.2.7-rc1` builds with `MARKETING_VERSION=1.2.7`, uses numeric GitHub run number for `CURRENT_PROJECT_VERSION`, and keeps `1.2.7-rc1` only in artifact names/summaries
  - `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` drive generated Xcode target bundle IDs, simulator build/test/smoke, profile verification, archive/export mapping, and summaries
  - the workflow uploads to App Store Connect/TestFlight only; final public App Store review, listing, privacy, and release approval remain external
- Server Docker tags:
  - stable release tags publish `autobyteus/autobyteus-server:X.Y.Z` and `autobyteus/autobyteus-server:latest`
  - prerelease tags such as `v1.2.7-rc1` publish only `autobyteus/autobyteus-server:1.2.7-rc1`
- Required GitHub repository secrets for Android APK publish:
  - `ANDROID_KEYSTORE_B64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- Required GitHub repository secrets for iOS App Store Connect/TestFlight publish:
  - `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`
  - `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`
  - `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`
  - `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64`
  - `IOS_DEVELOPMENT_TEAM`
  - `APP_STORE_CONNECT_KEY_ID`
  - `APP_STORE_CONNECT_ISSUER_ID`
  - `APP_STORE_CONNECT_API_KEY_P8_BASE64`
- Required GitHub repository secrets for Docker Hub publish:
  - `DOCKERHUB_USERNAME`
  - `DOCKERHUB_TOKEN`
- Optional GitHub repository variable:
  - `DOCKERHUB_IMAGE_NAME`
  - use this if the image repo should not be `autobyteus/autobyteus-server`
- Optional GitHub repository variables for iOS publish defaults:
  - `IOS_BUNDLE_ID`
  - `IOS_SHARE_EXTENSION_BUNDLE_ID`
  - `IOS_APP_SCHEME`
  - `IOS_ARTIFACT_PREFIX`
  - `IOS_XCODE_APP_PATH`
- No git submodules are required in this workspace.

### Consistent release commands

Use the release helper script from repo root:

```bash
# Normal new personal release:
# 1) Write short functional release notes in the ticket, for example:
#    tickets/done/<ticket-name>/release-notes.md
# 2) Prepare the release (bump desktop + gateway package versions, sync curated notes and managed messaging manifest, commit, create tag, push branch+tag)
#    This starts the desktop, Android APK, iOS, messaging-gateway, and server Docker release workflows because the pushed tag matches v*.
pnpm release 1.2.7 -- --release-notes tickets/done/<ticket-name>/release-notes.md

# Optional manual build-only validation (no GitHub release publish)
pnpm release:test --ref personal

# Manual publish/update for an existing tag only
# Use this when you need to re-run publish for a tag that already exists.
pnpm release:manual-dispatch v1.2.7 --ref personal
```

Important:

- Do not run `release:manual-dispatch` immediately after a fresh `release` for the same version.
- `release` already pushes `vX.Y.Z`, and the tag push starts `.github/workflows/release-desktop.yml`, `.github/workflows/release-android.yml`, `.github/workflows/release-ios.yml`, `.github/workflows/release-messaging-gateway.yml`, and `.github/workflows/release-server-docker.yml`.
- `release:manual-dispatch` is the manual recovery / re-publish path for an existing tag, not the normal second step of a new release.
- Curated release notes should stay user-facing and functional only; use `.github/release-notes/template.md` as the repo-level format reference.

Script file:
- `scripts/desktop-release.sh`

## License

This repository is licensed under [Apache License 2.0](./LICENSE).

Commercial use and modification are allowed. If you redistribute this software
or derivatives, keep the license and attribution notices (see [`NOTICE`](./NOTICE)).
