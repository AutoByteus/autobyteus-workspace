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

Create a `.env` file in the root directory with the following variables:

```env
# GraphQL endpoint
NUXT_PUBLIC_GRAPHQL_BASE_URL=http://localhost:8000/graphql
# REST API endpoint
NUXT_PUBLIC_REST_BASE_URL=http://localhost:8000/rest
# WebSocket endpoint
NUXT_PUBLIC_WS_BASE_URL=ws://localhost:8000/graphql
# Feature Flags (Optional)
ENABLE_APPLICATIONS=false
```

> **Note for Electron App**: When running as an Electron application with the integrated backend server, these endpoint URLs are automatically configured to the bundled loopback server at `http://127.0.0.1:29695`.

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

## Managed Messaging Setup (WhatsApp Business, WeCom, Discord, Telegram)

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
   - WhatsApp uses the business secret flow.
   - WeCom requires a webhook token plus at least one app account.
   - Discord requires bot token plus account id.
   - Telegram requires bot token plus a stable account label such as `telegram-main`.
   - Managed Telegram is polling-only in the product flow.

6. Use `Channel Binding Setup` to bind provider accounts or discovered peers to AutoByteus targets.
   - Discord and Telegram peer discovery are available through the managed server boundary.
   - WhatsApp and WeCom use the configured business-mode account information.

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
7. Create a channel binding by selecting the target agent definition and launch preset.
8. Run setup verification.

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

#### Data Storage Location

The internal server stores its data in the following locations based on your operating system:

- **Windows**: `C:\Users\<username>\.autobyteus\server-data`
- **macOS**: `~/.autobyteus/server-data`
- **Linux**: `~/.autobyteus/server-data`

These directories contain:

- `db/`: Database files
- `logs/`: Server log files
- `download/`: Downloaded content

#### Configuration

No additional configuration is needed for internal server mode. The application automatically:

- Starts the bundled server
- Uses the canonical embedded base URL `http://127.0.0.1:29695`
- Configures the frontend to connect to that embedded node automatically

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
# For Linux
pnpm build:electron:linux
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
# For Linux with integrated server
pnpm build:electron:linux
# For Windows with integrated server
pnpm build:electron:windows
# For macOS with integrated server
pnpm build:electron:mac
```

#### Embedded Runtime Contract

When the Electron application starts, it:

1. Starts the bundled backend server on the embedded port `29695`
2. Treats the embedded node as `http://127.0.0.1:29695`
3. Automatically configures the frontend to connect to that stable loopback URL
4. Shows a loading screen until the server is ready

The embedded server still binds broadly by default, but the frontend and generated local server URLs use the stable loopback address so Wi-Fi or LAN-IP changes do not make the embedded node URL stale.

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

## GraphQL Codegen

Generate TypeScript types from GraphQL schema:

```bash
pnpm codegen
```

## Available Scripts

- `pnpm dev`: Start development server (browser-based)
- `pnpm build`: Build for web production
- `pnpm test`: Run tests
- `pnpm preview`: Preview web production build
- `pnpm prepare-server`: Prepare the backend server for packaging with Electron
- `pnpm build:electron:linux`: Build desktop application for Linux
- `pnpm build:electron:windows`: Build desktop application for Windows
- `pnpm build:electron:mac`: Build desktop application for macOS
- `pnpm codegen`: Generate GraphQL types

## Project Structure

- `components/`: Vue components
- `pages/`: Application pages and routing
- `store/`: Pinia stores
- `electron/`: Electron-specific code
  - `main.ts`: Main Electron process
  - `preload.ts`: Preload script for renderer process
  - `nodeRegistryStore.ts`: Embedded/remote node registry persistence for Electron
  - `server/`: Backend server lifecycle management
- `shared/`: Shared Electron/Nuxt runtime constants such as the embedded server URL contract
- `resources/`: External resources
  - `server/`: Backend server files (populated by prepare-server script)
- `tests/`: Additional test files
- `composables/`: Vue composables
  - `useServerConfig.ts`: Server configuration management
