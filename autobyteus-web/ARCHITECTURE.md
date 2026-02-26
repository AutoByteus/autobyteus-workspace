# System Architecture

## Overview

AutoByteus is a modular, extensible platform designed for orchestrating AI agents. The architecture is built around the concept of "Concerns," where distinct functional areas (Agents, Teams, File System, Tools) interact through well-defined interfaces.

The system follows a modern client-server architecture, packaged as a desktop application via Electron.

## High-Level Components

```mermaid
graph TD
    User[User] -->|Interacts| Client[Frontend Client (Nuxt/Vue)]
    Client -->|GraphQL/REST| Server[Backend Server (Python)]
    Client -->|WebSocket| Server
    Client -->|IPC| Electron[Electron Main Process]
    
    subgraph "Frontend Concerns"
        Client --> AgentMgmt[Agent Management]
        Client --> FileExp[File Explorer]
        Client --> Term[Terminal]
        Client --> Rendering[Content Rendering]
    end
    
    subgraph "Backend Concerns"
        Server --> AgentOrch[Agent Orchestration]
        Server --> ToolReg[Tool Registry]
        Server --> LLM[LLM Integration]
        Server --> FS[File System Access]
    end
```

## Core Architectural Pillars

### 1. Frontend Client
Built with **Nuxt 3** and **Vue 3**, the frontend is responsible for state management, UI rendering, and real-time event handling.
*   **State Management**: Uses Pinia stores to manage concerns like `agentRunStore`, `fileExplorerStore`.
*   **Real-time Updates**: heavily relies on WebSockets for streaming agent responses and file system events.

### 2. Backend Server
A Python-based server that handles the heavy lifting: LLM inference (via providers), tool execution, and workspace management.
*   **Communication**: Exposes GraphQL (for CRUD) and WebSocket endpoints.
*   **Execution**: Manages the lifecycle of agents and teams.

### 3. Desktop Integration (Electron)
The application is wrapped in Electron to provide native capabilities.
*   **Server Management**: The Electron main process manages the lifecycle of the Python server (bundling, starting, stopping).
*   **Security**: Uses a preload script and IPC to securely bridge the UI and system level operations.

## Detailed Architectural Documentation

*   **[Agent Execution Architecture](./docs/agent_execution_architecture.md)**: Deep dive into how agents are run, events are routed, and responses are parsed.
*   **[Electron Packaging](./docs/electron_packaging.md)**: Details on how the Python server is bundled and managed within the Electron app.

## Module Concerns & Interactions

The system is divided into functional modules. Each module focuses on a specific concern but interacts with others:

*   **[Agent Management](./docs/agent_management.md)**: Defining what an agent is.
*   **[Agent Teams](./docs/agent_teams.md)**: Composing agents into workflows.
*   **[Skills](./docs/skills.md)** & **[Tools](./docs/tools_and_mcp.md)**: Capabilities that agents can utilize.
*   **[File Explorer](./docs/file_explorer.md)**: The environment where agents operate.
*   **[Terminal](./docs/terminal.md)**: Direct system access for agents and users.

## Testing Strategy

To ensure reliability across the "Concerns," we adopt a colocated testing strategy.

### Philosophy
*   **Colocation**: Tests are located next to the source code they verify in `__tests__` directories (e.g., `components/fileExplorer/__tests__/FileItem.spec.ts`). This ensures that as concerns evolve, their tests evolve with them.
*   **Unit & Component Tests**: We primarily use **Vitest** with Nuxt test utilities to verify individual units (utils) and Vue components.
*   **Scope**: Tests cover both the web frontend logic and the Electron-specific integrations.

### How We Test
1.  **Write**: create a `__tests__` folder in your module's directory. Add `.spec.ts` (for components) or `.test.ts` (for utils) files.
2.  **Run**: Use `pnpm test` for the full suite or `pnpm test:nuxt` for faster web-only iterations.

For detailed commands and performance tips, refer to the **[Testing Section in README](./README.md#testing)**.
