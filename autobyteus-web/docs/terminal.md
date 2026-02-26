# Terminal Module - Frontend

This document describes the design and implementation of the **Terminal** module in the autobyteus-web frontend, which provides an interactive command-line interface for executing terminal commands within workspace context.

## Overview

The Terminal module enables users to:

- Execute terminal commands in the active workspace directory
- View command output with syntax-highlighted results
- Navigate command history with arrow keys
- Use keyboard shortcuts (Ctrl+C for interrupt)

## Module Structure

```
autobyteus-web/
├── components/workspace/tools/
│   └── Terminal.vue              # xterm.js terminal component
├── components/layout/
│   ├── RightSideTabs.vue         # Tab container with Terminal tab
│   └── RightSidebarStrip.vue     # Collapsed sidebar with Terminal icon
├── composables/
│   ├── useRightSideTabs.ts       # Tab state management
│   └── useTerminalSession.ts     # Terminal WebSocket session
```

## Architecture

```mermaid
flowchart TD
    subgraph "UI Layer"
        RightSideTabs[RightSideTabs.vue]
        Terminal[Terminal.vue]
        XTerm[xterm.js Library]
    end

    subgraph "Backend"
        Server[autobyteus-server]
    end

    RightSideTabs --> Terminal
    Terminal --> XTerm
    Terminal --> WorkspaceStore
    Terminal --> TerminalSession[useTerminalSession.ts]
    TerminalSession --> Server
```

## Core Components

### Terminal.vue

Main terminal component using xterm.js for rich terminal emulation.

**Libraries Used:**

| Library              | Version | Purpose                           |
| -------------------- | ------- | --------------------------------- |
| `@xterm/xterm`       | ^5.5.0  | Terminal emulator core            |
| `@xterm/addon-fit`   | ^0.10.0 | Auto-resize terminal to container |
| `@xterm/addon-webgl` | ^0.19.0 | GPU-accelerated rendering         |

**Key Features:**

- **Workspace-aware prompt**: Displays active workspace name in colored prompt
- **Command history**: Navigate with Up/Down arrow keys
- **Input handling**: Backspace, Enter, character input
- **Ctrl+C support**: Interrupt current input
- **Responsive sizing**: Auto-fits container with ResizeObserver

**Terminal Configuration (Light Theme):**

```typescript
terminalInstance.value = new Terminal({
  cursorBlink: true,
  cursorStyle: "bar",
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontSize: 13,
  theme: {
    background: "#ffffff",
    foreground: "#383a42",
    cursor: "#528bff",
    green: "#50a14f", // Workspace name
    blue: "#4078f2", // Prompt path
  },
  scrollback: 5000,
});
```

**Input Handling Flow:**

```mermaid
sequenceDiagram
    participant User
    participant Terminal as Terminal.vue
    participant XTerm as xterm.js
    participant Session as useTerminalSession.ts
    participant Backend as WebSocket

    User->>XTerm: Types command
    XTerm->>Terminal: onData callback
    Terminal->>Session: sendInput(data)
    Session->>Backend: WebSocket input (base64)
    Backend-->>Session: WebSocket output (base64)
    Session-->>Terminal: onOutput callback
    Terminal->>XTerm: write(output)
```

### useTerminalSession.ts (Composable)

Manages the terminal WebSocket session and streaming I/O.

**Key Responsibilities:**

- Connect/disconnect WebSocket sessions per workspace
- Send input and resize events to the backend
- Receive output streams and forward to xterm.js

**Core API:**

| Function       | Description                          |
| -------------- | ------------------------------------ |
| `connect()`    | Opens the WebSocket session          |
| `disconnect()` | Closes the session                   |
| `sendInput()`  | Sends user input (base64 encoded)    |
| `sendResize()` | Sends terminal resize events         |
| `onOutput()`   | Registers output callback for xterm  |

### RightSideTabs.vue

Tab container that hosts the Terminal alongside other workspace tools.

**Available Tabs:**

| Tab Name      | Label      | Visibility | Component          |
| ------------- | ---------- | ---------- | ------------------ |
| `files`       | Files      | Always     | FileExplorerLayout |
| `teamMembers` | Team       | Team mode  | TeamOverviewPanel  |
| `todoList`    | To-Do      | Agent mode | TodoListPanel      |
| `terminal`    | Terminal   | Always     | Terminal           |
| `vnc`         | VNC Viewer | Always     | VncViewer          |

## WebSocket Protocol (Summary)

The terminal session communicates via WebSocket using JSON messages:

- **Input**: `{ "type": "input", "data": "<base64>" }`
- **Resize**: `{ "type": "resize", "rows": number, "cols": number }`
- **Output**: `{ "type": "output", "data": "<base64>" }`
- **Error**: `{ "type": "error", "message": "..." }`

## Styling

The Terminal uses a light theme matching the application design:

- **Background**: White (`#ffffff`)
- **Text**: Dark gray (`#383a42`)
- **Cursor**: Blue (`#528bff`)
- **Prompt Workspace**: Bright green (`#50a14f`)
- **Prompt Path**: Bright blue (`#4078f2`)
- **Scrollbar**: Gray-300 with Gray-400 hover

**Custom CSS:**

```css
.terminal-container {
  background-color: #ffffff;
  cursor: text;
  padding: 0;
}

.xterm {
  padding: 12px 0 0 12px; /* Internal padding for text */
}
```

## Usage Example

The Terminal is automatically available when a workspace is active:

1. Open a workspace
2. Click the "Terminal" tab in the right panel (or the Terminal icon in the collapsed sidebar)
3. Type commands and press Enter
4. View output directly in the terminal

**Prompt Format:**

```
workspace-name:~$ <your-command>
```

## Related Documentation

- **[File Explorer](./file_explorer.md)**: The terminal executes commands within the directory context of the File Explorer.
- **[Agent Execution Architecture](./agent_execution_architecture.md)**: Agents can sometimes execute terminal commands (via tools), which is a separate but related capability.
