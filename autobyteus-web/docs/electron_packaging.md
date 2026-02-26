# Electron Packaging and Server Management

This document describes the design and implementation of the **Electron desktop packaging** in autobyteus-web, which bundles and manages a local Python backend server for a fully self-contained desktop application.

## Overview

AutoByteus is packaged as an Electron application that:

- Provides a native desktop experience across Windows, macOS, and Linux
- Bundles a pre-compiled Python backend server (compiled via Nuitka)
- Manages the server lifecycle automatically
- Uses IPC for secure communication between main and renderer processes

## Architecture

```mermaid
graph TB
    subgraph Electron
        Main[Main Process<br/>main.ts]
        Preload[Preload Script<br/>preload.ts]
        Renderer[Renderer Process<br/>Nuxt App]
    end

    subgraph ServerManagement
        Factory[ServerManagerFactory]
        Status[ServerStatusManager]
        Base[BaseServerManager]
        Linux[LinuxServerManager]
        Mac[MacOSServerManager]
        Win[WindowsServerManager]
    end

    subgraph Resources
        Server[Bundled Server<br/>autobyteus_server]
        Data[App Data Directory]
    end

    Main --> Factory
    Factory --> Linux & Mac & Win
    Linux & Mac & Win --> Base
    Main --> Status
    Status --> Base
    Main <--> Preload
    Preload <--> Renderer
    Base --> Server
    Base --> Data
```

## Directory Structure

```
autobyteus-web/
├── electron/
│   ├── main.ts                 # Main process entry point
│   ├── preload.ts              # Secure API bridge to renderer
│   ├── logger.ts               # File and console logging
│   ├── types.d.ts              # TypeScript definitions
│   ├── server/
│   │   ├── baseServerManager.ts      # Abstract base class
│   │   ├── linuxServerManager.ts     # Linux implementation
│   │   ├── macOSServerManager.ts     # macOS implementation
│   │   ├── windowsServerManager.ts   # Windows implementation
│   │   ├── serverManagerFactory.ts   # Factory pattern
│   │   ├── serverStatusManager.ts    # Status bridge/events
│   │   ├── serverStatusEnum.ts       # Status enum
│   │   ├── services/                 # Extracted services
│   │   │   ├── AppDataService.ts     # Directory/config management
│   │   │   ├── HealthChecker.ts      # Health polling logic
│   │   │   └── index.ts              # Service exports
│   │   └── __tests__/                # Server tests
│   └── utils/
│       ├── networkUtils.ts     # Local IP detection
│       ├── shellEnv.ts         # PATH from login shell
│       └── __tests__/          # Utils tests
├── build/
│   ├── scripts/
│   │   ├── build.ts            # electron-builder script
│   │   └── generateIcons.ts    # Icon generation
│   └── icons/                  # Platform-specific icons
└── resources/
    └── server/                 # Bundled Node.js server
```

---

## Server Manager System

### BaseServerManager

Abstract class providing platform-agnostic server lifecycle management:

| Method            | Description                             |
| ----------------- | --------------------------------------- |
| `startServer()`   | Initialize and start the backend server |
| `stopServer()`    | Gracefully stop the server process      |
| `isRunning()`     | Check if server is running and ready    |
| `getServerUrls()` | Get all API endpoint URLs               |
| `getServerPort()` | Return the fixed port (29695)           |
| `getAppDataDir()` | Application data directory              |

Key features:

- **EventEmitter-based**: Emits `ready`, `error`, and `stopped` events
- **Fixed port**: Uses port `29695` for the server
- **First-run initialization**: Copies required config files on first launch
- **Validation**: Checks for required server files before starting
- **Port waiting**: Ensures port is free before binding

### Platform-Specific Managers

| Platform | Class                  | Entrypoint              |
| -------- | ---------------------- | ----------------------- |
| Linux    | `LinuxServerManager`   | `dist/app.js` (Node)    |
| macOS    | `MacOSServerManager`   | `dist/app.js` (Node)    |
| Windows  | `WindowsServerManager` | `dist/app.js` (Node)    |

Each extends `BaseServerManager` and implements:

- `getServerRoot()` - Returns path to the bundled server root directory
- `launchServerProcess()` - Spawns the server with correct environment

### ServerStatusManager

Bridges server events to the renderer process:

```typescript
// Events emitted to renderer via IPC
interface ServerStatusEvent {
  status: "starting" | "running" | "error" | "restarting" | "shutting-down";
  urls: { graphql; rest; ws; transcription; health };
  message?: string;
  healthCheckStatus?: string;
}
```

Methods:

- `initializeServer()` - Start server on app launch
- `restartServer()` - Stop and restart the server
- `checkServerHealth()` - Ping health endpoint
- `getStatus()` - Return current status object

---

## Main Process (main.ts)

### Window Creation

- Creates a secure `BrowserWindow` with sandbox enabled
- Blocks unintended navigations and new windows for security
- Registers custom `local-file://` protocol for secure local media access

### IPC Handlers

| Handler                | Purpose                          |
| ---------------------- | -------------------------------- |
| `get-server-status`    | Return current server status     |
| `restart-server`       | Restart the backend server       |
| `check-server-health`  | Ping server health endpoint      |
| `get-log-file-path`    | Get path to app log file         |
| `open-log-file`        | Open log file in system editor   |
| `read-log-file`        | Read last 500 lines of log       |
| `read-local-text-file` | Securely read local file content |
| `open-external-link`   | Open URL in system browser       |
| `reset-server-data`    | Clear server data directory      |
| `get-platform`         | Return OS platform string        |

### App Lifecycle

```mermaid
sequenceDiagram
    participant App as Electron App
    participant Window as BrowserWindow
    participant Status as ServerStatusManager
    participant Server as ServerManager

    App->>App: whenReady()
    App->>Window: createWindow()
    App->>Status: initializeServer()
    Status->>Server: startServer()
    Server->>Server: waitForPortToBeFree()
    Server->>Server: launchServerProcess()
    Server->>Server: waitForServerReady()
    Server-->>Status: emit('ready')
    Status-->>Window: IPC 'server-status'

    Note over Window: User closes window
    Window->>App: 'close' event
    App->>Window: send 'app-quitting'
    Window->>App: IPC 'start-shutdown'
    App->>App: app.quit()
    App->>Server: stopServer()
    Server-->>App: resolved
    App->>App: logger.close()
```

---

## Preload Script (preload.ts)

Exposes a secure `electronAPI` to the renderer process via `contextBridge`:

```typescript
window.electronAPI = {
  // Server control
  getServerStatus: () => Promise<ServerStatus>,
  restartServer: () => Promise<ServerStatus>,
  checkServerHealth: () => Promise<HealthStatus>,
  onServerStatus: (callback) => () => void,

  // File operations
  getLogFilePath: () => Promise<string>,
  openLogFile: (path) => Promise<Result>,
  readLogFile: (path) => Promise<Result>,
  readLocalTextFile: (path) => Promise<Result>,
  getPathForFile: (file: File) => string,

  // System
  openExternalLink: (url) => Promise<Result>,
  getPlatform: () => Promise<string>,

  // Recovery
  clearAppCache: () => Promise<Result>,
  resetServerData: () => Promise<Result>,

  // Shutdown
  onAppQuitting: (callback) => void,
  startShutdown: () => void,
}
```

---

## Build System

### electron-builder Configuration

Located in `build/scripts/build.ts`:

```typescript
const options: Configuration = {
  appId: "com.autobyteus.app",
  productName: "AutoByteus",
  directories: { output: "electron-dist" },
  files: ["dist/**/*", "package.json"],
  extraMetadata: { main: "dist/electron/main.js" },
  asar: true,
  extraResources: [
    { from: "resources/server", to: "server" },
    { from: "build/icons", to: "icons" },
  ],
  // Platform-specific configurations...
};
```

### Platform Targets

| Platform | Target         | Artifact Pattern                        |
| -------- | -------------- | --------------------------------------- |
| Linux    | AppImage       | `AutoByteus_<flavor>_linux-{version}.AppImage`   |
| Windows  | NSIS installer | `AutoByteus_<flavor>_windows-{version}.exe`      |
| macOS    | DMG archive    | `AutoByteus_<flavor>_macos-{arch}-{version}.dmg` |

Flavor resolution:

- `personal` -> `AutoByteus_personal`
- `enterprise` -> `AutoByteus_enterprise`
- Resolution order in `build/scripts/build.ts`:
  1. `AUTOBYTEUS_BUILD_FLAVOR` env override (`personal` or `enterprise`)
  2. Git context inference (`personal` / `enterprise` branch detection)
  3. Safe fallback: `enterprise`

### Build Commands

```bash
# Build for current platform
npx ts-node build/scripts/build.ts

# Build for specific platform
npx ts-node build/scripts/build.ts --linux
npx ts-node build/scripts/build.ts --windows
npx ts-node build/scripts/build.ts --mac

# Build for all platforms
npx ts-node build/scripts/build.ts
```

`scripts/prepare-server.sh` now builds the Node server, deploys it into `resources/server`, and rebuilds native modules (e.g., `node-pty`) for the Electron runtime.

---

## Server Resource Packaging

The bundled server is located at `resources/server/` and includes:

| File/Directory       | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `dist/`              | Compiled Node.js server output            |
| `prisma/`            | Prisma schema + migrations                |
| `node_modules/`      | Production dependencies (incl. prisma)   |
| `package.json`       | Server package metadata                   |
| `.env`               | Default environment configuration         |
| `download/`          | Pre-packaged downloadable assets (optional) |

At runtime, the server:

1. Runs on a fixed port (`29695`)
2. Stores data in `~/.autobyteus/server-data/`
3. Provides endpoints: `/graphql`, `/rest`, `/transcribe`

For one-time migration of an existing SQLite DB into `server-data`, use:

```bash
scripts/migrate-legacy-db.sh --from /path/to/production.db --to ~/.autobyteus/server-data
```

---

## Utilities

### Network Utils (`networkUtils.ts`)

- `getLocalIp()` - Finds LAN IP for Docker/network access
- Prioritizes common interfaces: `eth0`, `en0`, `wlan0`, `Wi-Fi`

### Shell Environment (`shellEnv.ts`)

- `getLoginShellPath()` - Inherits PATH from user's login shell
- Essential for macOS/Linux where GUI apps have minimal PATH
- Supports both bash and zsh

### Logger (`logger.ts`)

- Writes to both console and `~/.autobyteus/logs/app.log`
- Overwrites log on each app start
- Methods: `debug()`, `info()`, `warn()`, `error()`

---

## Data Directories

| Directory                          | Purpose                                |
| ---------------------------------- | -------------------------------------- |
| `~/.autobyteus/`                      | Electron user data (logs, preferences) |
| `~/.autobyteus/server-data/`          | Server runtime data                    |
| `~/.autobyteus/server-data/db/`       | SQLite databases                       |
| `~/.autobyteus/server-data/logs/`     | Server logs                            |
| `~/.autobyteus/server-data/download/` | Downloaded assets                      |

Where:

- **Linux**: `~/.autobyteus/`
- **macOS**: `~/.autobyteus/`
- **Windows**: `%USERPROFILE%\\.autobyteus\\`

## Related Documentation

- **[System Architecture](../ARCHITECTURE.md)**: High-level overview of the system including the Electron integration.
- **[Settings](./settings.md)**: Server status and logs can be monitored via the Settings page.
