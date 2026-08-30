# AutoByteus Web Frontend

A modern web application built with Nuxt.js, featuring both web and electron builds.

## CI Build (Tag Trigger)

Desktop CI build setup instructions are documented in:

- `docs/github-actions-tag-build.md`

## Prerequisites

- Node.js (v16 or higher)
- pnpm (via Corepack)
- Git

## Environment Setup

Create a `.env` file in the root directory with the following variables when the frontend should talk to a separately running backend. In local development, Nuxt's Vite proxy uses `BACKEND_NODE_BASE_URL` for `/graphql` and `/rest`, and the WebSocket endpoints default from the same backend base URL.

```env
# Backend node base URL used by the local dev proxy
BACKEND_NODE_BASE_URL=http://localhost:8000

# Optional explicit production endpoint overrides
BACKEND_GRAPHQL_BASE_URL=http://localhost:8000/graphql
BACKEND_REST_BASE_URL=http://localhost:8000/rest
BACKEND_GRAPHQL_WS_ENDPOINT=ws://localhost:8000/graphql
BACKEND_AGENT_WS_ENDPOINT=ws://localhost:8000/ws/agent
BACKEND_TEAM_WS_ENDPOINT=ws://localhost:8000/ws/agent-team
BACKEND_TRANSCRIPTION_WS_ENDPOINT=ws://localhost:8000/ws/transcribe
BACKEND_TERMINAL_WS_ENDPOINT=ws://localhost:8000/ws/terminal
BACKEND_FILE_EXPLORER_WS_ENDPOINT=ws://localhost:8000/ws/file-explorer

# Feature Flags (Optional)
ENABLE_APPLICATIONS=false
```

> **Note for Electron App**: A normal Electron launch configures these endpoints
> to the bundled loopback server at `http://127.0.0.1:29695`. An explicit
> packaged E2E launch uses the selected non-default loopback port instead; the
> main process supplies that active endpoint to the renderer. See
> [Packaged Electron E2E Launches](#packaged-electron-e2e-launches).

### Messaging Setup

The default messaging flow is now server-managed. `autobyteus-web` no longer needs
`MESSAGE_GATEWAY_BASE_URL` or `MESSAGE_GATEWAY_ADMIN_TOKEN` in `.env.local` for the
standard setup path.

When a user enables messaging from `Settings -> Messaging`, the selected node's
server:

1. resolves the compatible `autobyteus-message-gateway` artifact for that server version
2. downloads it on demand if it is not already installed
3. verifies and extracts it into server-owned storage
4. starts it as a managed child process
5. reports lifecycle state, version, and diagnostics back to the frontend

## Managed Messaging Setup (Discord, Telegram)

For a user-facing managed setup guide, including the recommended Telegram polling flow, see:

- `docs/messaging.md`

1. Start the target AutoByteus node.
   - For Electron, this is the bundled local server.
   - For a remote deployment, use the node you want the window to control.

2. Start the frontend:

```bash
pnpm dev
```

3. Open `Settings -> Messaging`.

4. In `Managed Messaging Gateway`:
   - click `Install and Start Gateway` or `Start Gateway`
   - wait for the lifecycle state to move through `INSTALLING` and `STARTING`
   - confirm the card reports `RUNNING`

5. Enter provider configuration in the provider card directly below the provider selector and save it.
   - Discord requires bot token plus account id.
   - Telegram requires bot token plus a stable account label such as `telegram-main`.
   - Managed Telegram is polling-only in the product flow.

6. Use `Channel Binding Setup` to bind provider accounts or discovered peers to AutoByteus targets.
   - Discord and Telegram peer discovery are available through the managed server boundary.
   - Bound team channels deliver eligible coordinator or entry-node outputs while the linked run remains active, including follow-up outputs triggered by internal team handoffs.

7. If troubleshooting is needed, use the managed gateway diagnostics shown in the UI.
   - The port, bind address, active version, and lifecycle message are read-only diagnostics.
   - Users should not need to enter raw gateway connection details in the normal flow.

## Telegram Setup Summary

For most users, Telegram setup should stay close to a fully in-app flow:

1. Create a bot in BotFather and copy the bot token.
2. Open `Settings -> Messaging`.
3. Start the managed gateway from the top runtime card.
4. Select `Telegram Bot`.
5. Paste the bot token and enter a stable account label.
6. Save configuration, send a real Telegram message to the bot, then use `Refresh Peers`.
7. Create a channel binding by selecting the target agent or team definition and launch preset.
8. Team bindings deliver eligible coordinator or entry-node outputs back to Telegram while the linked run remains active.
9. Run setup verification.

The main thing users still do outside AutoByteus is the initial Telegram bot creation. The gateway install, runtime lifecycle, provider configuration, binding flow, runtime preset selection, and verification are handled from the app.

## Localization

AutoByteus Web now ships with a client-side localization foundation for product UI copy.

- Supported locales: `English (en)` and `Simplified Chinese (zh-CN)`
- User preference modes: `System`, `English`, `简体中文`
- Settings location: `Settings -> Language`
- System resolution source:
  - browser mode uses the browser locale list
  - Electron uses `app.getLocale()` through the preload bridge
- Unsupported system locales fall back to English
- Product UI waits behind a neutral bootstrap gate until localization initialization finishes; if bootstrap fails, the app still releases in English instead of staying stuck on the boot surface

For runtime details and contributor workflow, see:

- `docs/localization.md`

## Delivery Reliability

The managed runtime summary now shows delivery reliability information from the gateway:

- queue heartbeat timestamps
- inbound dead-letter count
- inbound unbound count
- outbound dead-letter count

Under the hood, the gateway persists inbound and outbound queues, retries transient failures, and surfaces lock-loss as a critical runtime state.

## Unsupported Or Non-Default Messaging Flows

- WhatsApp Business and WeCom App are excluded from the current default managed
  messaging setup because these provider flows are not currently available in
  the managed distribution.
- WeChat is excluded from the managed messaging capability described above.
- The old direct gateway URL/token setup flow is no longer the default product path.
- Personal-session messaging flows are not part of this managed setup.

## Server Modes

AutoByteus supports two server operation modes: internal and external.

### Internal Server

The internal server is a bundled backend server that runs within the Electron application. This mode is:

- **Default for desktop applications** (Electron builds)
- Completely self-contained with no additional setup required
- Automatically started and managed by the application

#### Default Production Data Storage Location

An ordinary internal-server launch stores server data in the following locations:

- **Windows**: `C:\Users\<username>\.autobyteus\server-data`
- **macOS**: `~/.autobyteus/server-data`
- **Linux**: `~/.autobyteus/server-data`

These directories contain:

- `db/`: Database files
- `logs/`: Server log files
- `download/`: Downloaded content

Electron/Chromium also keeps its normal product-named `userData` and session
state in the operating system's application-data location. An explicit E2E
launch does not use any of these production paths: its backend, AutoByteus,
Electron, Chromium, registry, local-storage, and session state are descendants
of the caller-selected isolated root documented below.

#### Configuration

No additional configuration is needed for internal server mode. The application automatically:

- Starts the bundled server
- Uses the production embedded base URL `http://127.0.0.1:29695` unless the
  explicit packaged E2E launch profile is selected
- Configures the frontend to connect to that embedded node automatically

#### Phone Access / Remote Access

The desktop app can expose its bundled server to a paired phone/PWA over a LAN, Tailscale/Headscale, company VPN, NetBird, Netmaker, WireGuard, or another private network that already reaches the desktop node. Open **Nodes -> Phone Setup**, then enable **Phone Access**, choose the reachable private-network URL, and scan/open the generated `/mobile?pairing=...` QR link from the phone. The phone stores a paired mobile session and then uses authenticated REST, GraphQL, WebSocket, and protected-resource transports.

See `docs/remote_access.md` for setup, security, mobile-gating, and packaging details.

### External Server

The external server mode connects to a separately running AutoByteus server. This mode is:

- **Default for web-based development** (browser mode)
- Requires a separately installed and running backend server
- Configured through environment variables

To use external server mode, ensure your `.env` file contains the correct URLs for your server as shown in the Environment Setup section.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd autobyteus-web
```

2. Install dependencies:

```bash
corepack enable
pnpm install
```

## Development

### Web Development (Browser-based)

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000` in your web browser. Use this command for normal frontend development when you want to work on the web version of the application.

## Building

### Web Build

For deploying the web version:

```bash
pnpm build
pnpm preview  # To preview the build
```

### Desktop Application Build

To build the desktop application, use the appropriate command for your operating system:

```bash
# For Linux (host architecture: x64 on x64 hosts, arm64 on arm64 hosts)
pnpm build:electron:linux
# Explicit Linux targets require a matching native Linux host/runner
pnpm build:electron:linux:x64
pnpm build:electron:linux:arm64
# For Windows
pnpm build:electron:windows
# For macOS
pnpm build:electron:mac
```

The built applications will be available in the `electron-dist` directory. Use these commands when you want to create a standalone desktop application for distribution.

#### macOS Build With Logs (No Notarization)

For local macOS builds with verbose electron-builder logs and without notarization/timestamping:

```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac
```

### Desktop Application with Integrated Backend

The Electron application includes the AutoByteus backend server, which is automatically started when the application launches.

#### Preparing the Server

Before building the Electron application with the integrated server:

1. Ensure `autobyteus-server-ts` is available at `../autobyteus-server-ts` (relative to this project)
2. `repository_prisma` is installed from npm via `autobyteus-server-ts` and does not need a local sibling clone
3. The server project owns any additional shared build prerequisites; the web project should only call the server packaging boundary.
4. Run the prepare-server script to copy the server files:

```bash
pnpm prepare-server
```

This script copies the built backend server and its configurations to the `resources/server` directory.

#### Building with Integrated Server

The standard build commands for Electron automatically include the backend server:

```bash
# For Linux with integrated server (host architecture)
pnpm build:electron:linux
# Explicit Linux x64/ARM64 targets require matching native hosts/runners
pnpm build:electron:linux:x64
pnpm build:electron:linux:arm64
# For Windows with integrated server
pnpm build:electron:windows
# For macOS with integrated server
pnpm build:electron:mac
```

#### Embedded Runtime Contract

With no E2E selector, the Electron application:

1. Starts the bundled backend server on the embedded port `29695`
2. Treats the embedded node as `http://127.0.0.1:29695`
3. Automatically configures the frontend to connect to that stable loopback URL
4. Shows a loading screen until the server is ready

The embedded server retains its existing broad bind policy, but the frontend
and generated local server URLs use loopback so Wi-Fi or LAN-IP changes do not
make the embedded-node URL stale. In explicit E2E mode, the same packaged
artifact starts the backend on the selected non-default port and supplies the
corresponding `http://127.0.0.1:<port>` endpoint to status, registry, HTTP, and
WebSocket consumers. E2E mode also redirects all application-owned mutable
state under its isolated root and suppresses updater activity. Production
defaults, data, and updater behavior remain unchanged.

## Testing

This project uses [Vitest](https://vitest.dev/) for testing with the Nuxt test utilities.

### Test Organization (Best Practice)

Tests are **colocated** with source files in `__tests__` directories:

```
utils/
  fileExplorer/
    TreeNode.ts
    __tests__/
      treeNode.test.ts    # Tests for TreeNode.ts
components/
  fileExplorer/
    FileItem.vue
    __tests__/
      FileItem.spec.ts    # Tests for FileItem.vue
```

This keeps tests close to the code they test, making them easier to find and maintain.

### Running Tests

```bash
# Run ALL tests (nuxt + electron)
pnpm test

# Run only Nuxt tests (recommended for most development)
pnpm test:nuxt

# Run only Electron tests
pnpm test:electron
```

### Running Specific Test Files

Use `pnpm test:nuxt` with the file path to run specific tests:

```bash
# Run a specific test file
pnpm test:nuxt utils/fileExplorer/__tests__/treeNode.test.ts --run

# Run component tests
pnpm test:nuxt components/fileExplorer/__tests__/FileItem.spec.ts --run

# Run with pattern matching (all files matching path)
pnpm test:nuxt components/settings --run
```

> **Note**: Use `--run` flag to run once and exit (non-watch mode).

### Packaged Electron E2E Launches

Use the reusable packaged launcher when a real Electron instance needs a
non-default backend port and isolated state. It builds the current host package
by default, chooses a safe free port and temporary root, waits for backend
health, prints machine-readable launch metadata, and cleans up only its owned
process tree and temporary root:

```bash
pnpm test:e2e:electron --adapter direct
pnpm test:e2e:electron --adapter playwright
```

To reuse an existing current-worktree artifact, pass `--skip-build`. An explicit
executable, port, or already-existing absolute data root may also be supplied:

```bash
pnpm test:e2e:electron \
  --skip-build \
  --adapter playwright \
  --executable /absolute/path/to/AutoByteus \
  --port 31001 \
  --data-root /absolute/path/to/existing-safe-e2e-root
```

The launcher preserves the caller environment and overlays only
`AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`,
`AUTOBYTEUS_ELECTRON_SERVER_PORT`, and
`AUTOBYTEUS_ELECTRON_DATA_ROOT`. It does not define an API-key, provider,
search, Codex, or other credential policy; existing application/server
provisioning remains authoritative. Do not place the three isolation values in
a repository `.env`, production data-root `.env`, build profile, or alternate
product name.

For the complete five-scenario coexistence, routing, invalid-profile,
parallelism, updater, and cleanup probe, run:

```bash
pnpm test:e2e:electron:isolation \
  --skip-build \
  --executable /absolute/path/to/AutoByteus \
  --output-dir test-results/electron-launch-profile
```

The application requires an explicit data root to exist already and rejects a
symlink, filesystem root, relative path, or overlap with protected production
paths before stateful startup. Preparation-created temporary roots are removed
only after the selected adapter affirmatively confirms its whole process tree
is gone. Caller-supplied roots are retained. Port state is diagnostic only and
never authorizes process signaling or root deletion. See
[`docs/electron_packaging.md`](docs/electron_packaging.md#packaged-e2e-launch-profile)
for the full launch and ownership contract.

### Running Specific Test Cases

```bash
# Run tests matching a description
pnpm test:nuxt utils/fileExplorer/__tests__/treeNode.test.ts -t "childrenLoaded" --run

# Run with verbose output
pnpm test:nuxt components/fileExplorer/__tests__/FileItem.spec.ts --run --reporter=verbose
```

### Performance Tips

If your environment limits worker processes (e.g., containers):

```bash
pnpm test:nuxt components/settings/__tests__/ProviderAPIKeyManager.spec.ts --run --pool threads --maxWorkers 1 --no-file-parallelism --no-isolate
```

### Workspace Responsive Browser Probe

The adaptive `/workspace` shell has a focused browser probe that verifies the standard workspace route across narrow, constrained, short-height, and wide viewports while also checking that `/mobile` remains isolated to the phone/PWA shell. Start a frontend/backend target first, then run:

```bash
pnpm test:e2e:workspace-responsive -- --base-url http://127.0.0.1:3000 --output-dir ../tickets/<ticket-name>/probes/api-e2e
```

The probe uses Chrome/Chromium through Playwright Core. If automatic discovery does not find a browser, pass `--browser-executable <path>` or set `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=<path>`.

### Diagram Zoom Viewer Browser Probe

The shared Markdown Mermaid viewer has a self-starting browser probe covering inline sizing; fine-pointer rest/hover/focus chrome; no-hover, coarse-pointer, and hybrid fine-primary/coarse-secondary fallbacks; the four uniform icon-only viewer actions; open/fit/zoom/pan; keyboard and touch input; link routing; render lifecycle; localization; focus containment; narrow/200%-text layouts; and a diagram opened from an already-maximized artifact preview. The nested scenario checks viewer-over-host stacking and hit ownership, retained artifact path/content/Preview/maximize state, one-live-SVG restoration, layer-scoped close/backdrop/first-`Escape` dismissal, later host dismissal by a distinct `Escape`, and repeated-cycle cleanup. It installs a temporary Nuxt fixture route, starts an owned development server, runs Chrome through Playwright Core, and removes owned resources before returning:

```bash
pnpm test:e2e:diagram-zoom-viewer -- --output-dir test-results/diagram-zoom-viewer
```

The probe chooses a free local port by default. Use `--port <port>` to pin it. If automatic browser discovery does not find Chrome/Chromium, pass `--browser-executable <path>` or set `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=<path>`.

### Nested Team Aggregate Status Browser Probe

The Workspaces/Teams history tree has a self-starting browser probe for the
presentation-only aggregate status on stable configured nested-Team rows. It
covers the full five-state presentation, recursive and task-scoped Agent
aggregation, sibling isolation, expanded/collapsed rendering, collapsed live
patching without a new request, English and Simplified Chinese accessibility
copy, exactly-once row/disclosure interaction, and root/Agent/transient-Team
route exclusions. The probe installs a temporary Nuxt fixture route, starts an
owned development server on a free loopback port, runs Chrome through
Playwright Core, captures evidence, and removes only the resources it owns:

```bash
pnpm test:e2e:nested-team-aggregate-status -- --output-dir test-results/nested-team-aggregate-status
```

Use `--port <port>` to pin the port. If automatic discovery does not find
Chrome/Chromium, pass `--browser-executable <path>` or set
`PLAYWRIGHT_CHROME_EXECUTABLE_PATH=<path>`.

### Nested Team Hierarchy Browser Probe

The Workspace-history nested-Team hierarchy has a self-starting Chromium probe
covering the production printed-tree components and current execution-row
contracts. It verifies configured, transient, and deep mixed-node identity;
continuous ancestor rails and terminating right-only elbows; orthogonal
selection; the complete 260/320/520px by Default/Large/Extra Large matrix;
narrow metadata and full-identity recovery; localized tree/treeitem accessibility
output; pointer and keyboard disclosure; exact selection and Stop action routing;
quiet-refresh preservation; runtime errors; and owned cleanup. The probe installs
a temporary Nuxt fixture route, starts an owned development server on a free
loopback port, writes evidence, and removes only the resources it owns:

```bash
pnpm test:e2e:nested-team-hierarchy -- --output-dir test-results/nested-team-hierarchy
```

Use `--port <port>` to pin the port. If automatic browser discovery does not find
Chrome/Chromium, pass `--browser-executable <path>` or set
`PLAYWRIGHT_CHROME_EXECUTABLE_PATH=<path>`.

## GraphQL Codegen

Generate TypeScript types from GraphQL schema:

```bash
pnpm codegen
```

## Available Scripts

- `pnpm dev`: Start development server (browser-based)
- `pnpm build`: Build for web production
- `pnpm test`: Run tests
- `pnpm test:e2e:electron`: Build or reuse a packaged app and run one isolated direct/Playwright launch smoke
- `pnpm test:e2e:electron:isolation`: Run the complete packaged Electron isolation probe and write evidence
- `pnpm test:e2e:workspace-responsive`: Run the standard workspace responsive browser probe against a running frontend/backend target
- `pnpm test:e2e:diagram-zoom-viewer`: Run the self-starting shared Markdown Mermaid viewer browser probe
- `pnpm test:e2e:nested-team-hierarchy`: Run the self-starting Workspace-history nested-Team hierarchy browser probe
- `pnpm preview`: Preview web production build
- `pnpm prepare-server`: Prepare the backend server for packaging with Electron
- `pnpm build:electron:linux`: Build desktop application for Linux host architecture
- `pnpm build:electron:linux:x64`: Build desktop application for Linux x64 on a native x64 Linux host
- `pnpm build:electron:linux:arm64`: Build desktop application for Linux ARM64 on a native ARM64 Linux host
- `pnpm build:electron:windows`: Build desktop application for Windows
- `pnpm build:electron:mac`: Build desktop application for macOS
- `pnpm codegen`: Generate GraphQL types

## Project Structure

- `components/`: Vue components
- `pages/`: Application pages and routing
- `store/`: Pinia stores
- `electron/`: Electron-specific code
  - `main.ts`: Main Electron process
  - `launch-profile/`: Early production/E2E profile validation and path planning
  - `preload.ts`: Preload script for renderer process
  - `nodeRegistryStore.ts`: Embedded/remote node registry persistence for Electron
  - `server/`: Backend server lifecycle management
- `scripts/electron-e2e/`: Shared preparation, direct/Playwright adapters, owned process-tree control, and cleanup session
- `shared/`: Shared Electron/Nuxt runtime constants such as the embedded server URL contract
- `resources/`: External resources
  - `server/`: Backend server files (populated by prepare-server script)
- `tests/`: Additional test files
- `composables/`: Vue composables
  - `useServerConfig.ts`: Server configuration management
