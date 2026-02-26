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
```

> **Note for Electron App**: When running as an Electron application with the integrated backend server, these endpoint URLs are automatically configured with the dynamically allocated port.

### External Messaging Setup Variables (Personal Session)

If you want to set up WhatsApp personal messaging from the web settings UI, add these variables to `.env.local`:

```env
MESSAGE_GATEWAY_BASE_URL=http://localhost:8010
MESSAGE_GATEWAY_ADMIN_TOKEN=
```

- `MESSAGE_GATEWAY_BASE_URL`: URL of `autobyteus-message-gateway`
- `MESSAGE_GATEWAY_ADMIN_TOKEN`: optional bearer token if you protect gateway admin endpoints

These same variables are also used for Discord and WeChat setup flows in `Settings -> External Messaging`.

## Personal WhatsApp Setup (Step-by-Step)

1. Start `autobyteus-message-gateway` with personal mode enabled:

```bash
GATEWAY_WHATSAPP_PERSONAL_ENABLED=true \
GATEWAY_PORT=8010 \
node /Users/normy/autobyteus_org/autobyteus-message-gateway/dist/index.js
```

2. Ensure `autobyteus-web/.env.local` contains:
   - `MESSAGE_GATEWAY_BASE_URL=http://localhost:8010`
   - optional `MESSAGE_GATEWAY_ADMIN_TOKEN=...`

3. Start web app:

```bash
pnpm dev
```

4. Open `Settings -> External Messaging`.

5. In `Gateway Connection`:
   - set gateway URL/token
   - click `Validate Connection` and confirm status becomes `READY`

6. In `WhatsApp Personal Session`:
   - keep provider set to `WHATSAPP`
   - click `Start Session`
   - scan the QR image shown in the web UI using your real WhatsApp mobile app
   - if a session is already running in gateway, the UI automatically attaches to it
   - wait for status to become `ACTIVE` (or click `Refresh Status` if needed)

7. In `Channel Binding Setup`:
   - click `Refresh Peers` (after sending at least one WhatsApp message from another contact)
   - select peer from dropdown (or toggle to manual mode for direct input)
   - select active target from dropdown (or toggle to manual mode for direct input)
   - save and confirm it appears in the bindings list

8. In `Setup Verification`:
   - click `Run Verification`
   - ensure final status is `READY`

## Personal WeChat Setup (Step-by-Step, Experimental)

1. Run a Wechaty-compatible sidecar service that exposes:
   - `POST /api/wechaty/v1/sessions/open`
   - `GET /api/wechaty/v1/sessions/:sessionId/qr`
   - `GET /api/wechaty/v1/sessions/:sessionId/status`
   - `GET /api/wechaty/v1/sessions/:sessionId/peer-candidates`
   - `POST /api/wechaty/v1/sessions/:sessionId/messages`
   - `DELETE /api/wechaty/v1/sessions/:sessionId`
   - push inbound message events to gateway:
     `POST /api/wechat-sidecar/v1/events` with
     `x-autobyteus-sidecar-signature` and `x-autobyteus-sidecar-timestamp` headers
   - reference implementation:
     - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tools/wechaty-sidecar/README.md`

2. Start `autobyteus-message-gateway` with WeChat personal mode enabled:

```bash
GATEWAY_WECHAT_PERSONAL_ENABLED=true \
GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL=http://localhost:8788 \
GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET=<shared-secret> \
GATEWAY_WECHAT_PERSONAL_STATE_ROOT=/Users/normy/autobyteus_org/autobyteus-message-gateway/memory/wechat-personal \
GATEWAY_PORT=8010 \
node /Users/normy/autobyteus_org/autobyteus-message-gateway/dist/index.js
```

3. Ensure `autobyteus-web/.env.local` contains:
   - `MESSAGE_GATEWAY_BASE_URL=http://localhost:8010`
   - optional `MESSAGE_GATEWAY_ADMIN_TOKEN=...`

4. Start web app:

```bash
pnpm dev
```

5. Open `Settings -> External Messaging`.

6. In `Personal Session`:
   - change provider to `WECHAT`
   - click `Start Session`
   - scan/login using your Wechaty sidecar flow
   - wait for status to become `ACTIVE` (or click `Refresh Status`)

7. In `Channel Binding Setup`:
   - set `provider=WECHAT`, `transport=PERSONAL_SESSION`
   - click `Refresh Peers` after receiving at least one inbound WeChat message
   - choose peer + target, then click `Save Binding`

## Discord Bot Setup (Step-by-Step)

1. Start `autobyteus-message-gateway` with Discord enabled:

```bash
GATEWAY_DISCORD_ENABLED=true \
GATEWAY_DISCORD_BOT_TOKEN=<your-discord-bot-token> \
GATEWAY_DISCORD_ACCOUNT_ID=discord-acct-1 \
GATEWAY_PORT=8010 \
node /Users/normy/autobyteus_org/autobyteus-message-gateway/dist/index.js
```

2. Ensure `autobyteus-web/.env.local` contains:
   - `MESSAGE_GATEWAY_BASE_URL=http://localhost:8010`
   - optional `MESSAGE_GATEWAY_ADMIN_TOKEN=...`

3. Start web app:

```bash
pnpm dev
```

4. Open `Settings -> External Messaging`.

5. In `Gateway Connection`:
   - set gateway URL/token
   - click `Validate Connection`
   - confirm capability payload reports Discord enabled

6. In `Channel Binding Setup`:
   - set provider to `DISCORD` (transport auto-resolves to `BUSINESS_API`)
   - `BUSINESS_API` here is AutoByteus terminology for Discord bot integration (Gateway + REST), not a separate Discord paid product
   - `accountId` should match gateway `discordAccountId` (`GATEWAY_DISCORD_ACCOUNT_ID`)
   - click `Refresh Peers` after a user sends at least one message to the bot (DM or guild channel)
   - select peer from discovered candidates (recommended), or set `peerId` manually as:
     - `user:<snowflake>` for DMs
     - `channel:<snowflake>` for guild channels
   - optional `threadId=<snowflake>` is allowed only with `channel:<snowflake>`
   - select target and click `Save Binding`

7. In `Setup Verification`:
   - click `Run Verification`
   - ensure final status is `READY`

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

- Finds an available port
- Starts the server
- Configures the frontend to connect to it

You can force the application to use external server mode by setting `USE_INTERNAL_SERVER=false` in your environment.

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
2. Ensure `autobyteus-ts` is available at `../autobyteus-ts` (workspace dependency)
3. `repository_prisma` is installed from npm via `autobyteus-server-ts` and does not need a local sibling clone
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

#### Dynamic Port Allocation

When the Electron application starts, it:

1. Finds an available port on the system
2. Starts the backend server on that port
3. Automatically configures the frontend to connect to the server on the allocated port
4. Shows a loading screen until the server is ready

This ensures the application works even if the default port (8000) is already in use on the system.

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
  - `serverManager.ts`: Backend server lifecycle management
  - `portFinder.ts`: Utility for finding available ports
- `resources/`: External resources
  - `server/`: Backend server files (populated by prepare-server script)
- `test/`: Test files
- `composables/`: Vue composables
  - `useServerConfig.ts`: Server configuration management
