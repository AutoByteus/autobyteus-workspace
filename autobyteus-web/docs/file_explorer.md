# File Explorer Module - Frontend

This document describes the design and implementation of the **File Explorer** module in the autobyteus-web frontend, which provides workspace file browsing, file content viewing, and real-time synchronization with the backend.

## Overview

The File Explorer module enables users to:

- Browse workspace directory trees with expandable folders
- View file contents with type-specific viewers (code, images, audio, video, markdown, Excel)
- Perform file operations (create, rename, delete, move via drag-and-drop)
- Search files within workspaces
- Receive real-time updates when files change on the backend
- **Lazy Load** large directories for performance
- Browse/search/open workspace files from the `/mobile` Phone Access shell using a phone-first, read-only Files surface over the same workspace and file-explorer stores

## Module Structure

```
autobyteus-web/
├── components/fileExplorer/
│   ├── FileExplorer.vue              # Main file explorer panel
│   ├── FileItem.vue                  # File/folder item with actions
│   ├── FileContentViewer.vue         # Multi-tab content viewer
│   ├── FileContextMenu.vue           # Right-click context menu
│   ├── AddFileOrFolderDialog.vue     # Create file/folder dialog
│   ├── ConfirmDeleteDialog.vue       # Delete confirmation dialog
│   ├── MonacoEditor.vue              # Code editing component
│   └── viewers/                      # Type-specific viewers
│       ├── AudioPlayer.vue
│       ├── ExcelViewer.vue
│       ├── HtmlPreviewer.vue
│       ├── ImageViewer.vue
│       ├── MarkdownPreviewer.vue
│       └── VideoPlayer.vue
├── components/mobile/
│   ├── MobileFiles.vue               # Phone-first workspace browser
│   └── MobileFileViewer.vue          # Read-only mobile file viewer/attach sheet
├── composables/mobile/
│   └── useMobileWorkspaceFileExplorer.ts # Mobile workspace resolution, lazy load, search, and open state coordinator
├── services/
│   └── fileExplorerStreaming/        # WebSocket streaming service
│       ├── FileExplorerStreamingService.ts  # WebSocket client
│       ├── types.ts                         # Protocol types
│       └── index.ts                         # Exports
├── stores/
│   ├── workspace.ts                  # Workspace & tree state
│   └── fileExplorer.ts               # File explorer UI state
├── graphql/
│   ├── queries/file_explorer_queries.ts
│   └── mutations/file_explorer_mutations.ts
├── utils/fileExplorer/
│   ├── TreeNode.ts                   # TreeNode class
│   ├── fileUtils.ts                  # Tree manipulation utilities
│   ├── openFolderRefresh.ts          # Visible-session snapshot refresh helpers
│   └── stateSync.ts                  # Mutation echo suppression and path remapping helpers
└── types/
    └── fileSystemChangeTypes.ts      # Change event types
```

## Architecture

```mermaid
flowchart TD
    subgraph "UI Layer"
        FileExplorer[FileExplorer.vue]
        FileItem[FileItem.vue]
        RightSideTabs[RightSideTabs.vue]
        FileContentViewer[FileContentViewer.vue]
        Viewers[Type-Specific Viewers]
    end

    subgraph "State Management"
        WorkspaceStore[workspace.ts]
        FileExplorerStore[fileExplorer.ts]
    end

    subgraph "Communication"
        Queries[GraphQL Queries]
        Mutations[GraphQL Mutations]
        WebSocket[FileExplorerStreamingService]
    end

    subgraph "Backend"
        Server[autobyteus-server]
    end

    FileExplorer --> FileItem
    RightSideTabs --> FileContentViewer
    FileContentViewer --> Viewers

    FileItem --> FileExplorerStore
    FileItem --> WorkspaceStore
    FileContentViewer --> FileExplorerStore

    FileExplorerStore --> Queries
    FileExplorerStore --> Mutations
    WorkspaceStore --> WebSocket

    Queries --> Server
    Mutations --> Server
    WebSocket --> Server
```

## Core Components

### FileExplorer.vue

Main container component for the file browser panel:

```vue
<template>
  <div class="file-explorer">
    <!-- Search input -->
    <input v-model="searchQuery" placeholder="Search files..." />

    <!-- File tree -->
    <div v-if="hasWorkspaces">
      <FileItem v-for="file in displayedFiles" :key="file.id" :file="file" />
    </div>
  </div>
</template>
```

**Key Features:**

- Search files within active workspace
- Displays workspace tree or search results
- Collapsible panel integration

### FileItem.vue

Recursive component for files and folders:

| Feature           | Description                                                                           |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Click**         | Open file (preview mode for `.md`/`.html`/`.csv`, edit mode for code) / toggle folder |
| **Context Menu**  | Rename, delete, add file/folder                                                       |
| **Drag & Drop**   | Move files between folders                                                            |
| **Visual States** | Open folder indicator, drag-over highlight                                            |

**Drag & Drop Implementation:**

```typescript
// Set drag data with file path
onDragStart(event: DragEvent) {
  event.dataTransfer?.setData('text/plain', props.file.path)
  event.dataTransfer?.setData('source-is-file', String(props.file.is_file))
}

// Handle drop on valid folder targets
onDrop(event: DragEvent) {
  const sourcePath = event.dataTransfer?.getData('text/plain')
  const destinationPath = `${props.file.path}/${sourceFileName}`
  fileExplorerStore.moveFileOrFolder(sourcePath, destinationPath)
}
```

### FileContentViewer.vue

Multi-tab file content viewer located in the **Right Side Panel** (Files Tab).

For detailed information on supported file types and the rendering architecture (including Markdown and Mermaid support), please refer to the [Content Rendering Documentation](./content_rendering.md).

## State Management

### WorkspaceStore (workspace.ts)

Manages metadata-only workspace lifecycle and visible file-explorer stream ownership:

```typescript
interface WorkspaceInfo {
  workspaceId: string;
  name: string;
  displayName?: string;
  workspaceRootPath?: string | null;
  workspaceConfig: any;
  absolutePath: string | null;
  kind?: "filesystem" | "skill" | "temp";
  isTemp?: boolean;
}
```

**Key Actions:**

| Action | Description |
| --- | --- |
| `createWorkspace()` | Creates/resolves metadata only. It does **not** acquire a file-explorer tree or start a persistent file watcher. |
| `fetchAllWorkspaces()` | Loads workspace metadata on startup or backend-context reset. It does **not** acquire file-explorer trees or start live streams. |
| `fetchFolderChildren()` | **[Lazy Load]** Fetches children for a folder when expanded or when a visible explorer refreshes open folders. |
| `acquireFileExplorerLiveSession(workspaceId, consumerId)` | Registers one visible file explorer consumer. The first consumer opens one WebSocket/live watcher stream for the workspace and returns an idempotent release function. |
| `releaseFileExplorerLiveSession(workspaceId, consumerId)` | Releases a visible consumer. The last release disconnects the WebSocket and lets the backend stop the watcher lease. |
| `connectFileExplorerLiveStream()` / `disconnectFileExplorerLiveStream()` | Internal connection management used by the live-session API; components should not call these directly. |
| `refreshFileExplorerSnapshot()` | Refreshes the root and currently open folders when a file explorer becomes visible so missed changes are reconciled before live events arrive. |
| `handleFileSystemChange()` | Applies local mutation results and WebSocket tree changes, while consuming self-initiated mutation echoes from the stream. |

### FileExplorerStore (fileExplorer.ts)

Manages UI state and file content:

```typescript
interface OpenFileState {
  path: string;
  type: "Text" | "Image" | "Audio" | "Video" | "Excel" | "PDF" | "Unsupported";
  mode: "edit" | "preview";
  content: string | null;
  url: string | null;
  isLoading: boolean;
  error: string | null;
}
```

**Key Actions:**

| Action                                            | Description                  |
| ------------------------------------------------- | ---------------------------- |
| `openFile()`                                      | Opens file in full edit mode |
| `openFilePreview()`                               | Opens file in preview mode   |
| `fetchFileContent()`                              | Loads text file via GraphQL  |
| `saveFileContentFromEditor()`                     | Saves text content via mutation and suppresses self-echo modify events |
| `toggleFolder()`                                  | Expands/collapses folder     |
| `searchFiles()`                                   | Searches files via GraphQL   |
| `navigateToNextTab()` / `navigateToPreviousTab()` | Tab navigation               |

> **Important:** All actions and getters in `FileExplorerStore` require a mandatory `workspaceId` parameter. The store is **workspace-agnostic** and does not assume any "active" workspace.

### useWorkspaceFileExplorer Composable

The `useWorkspaceFileExplorer` composable provides a scoped, workspace-bound interface to the `FileExplorerStore`. It is the recommended way for components to interact with the file explorer.

**Location:** `composables/useWorkspaceFileExplorer.ts`

**Purpose:**

- Binds all file explorer operations to a specific `workspaceId`
- Falls back to `activeWorkspace` if no explicit ID is provided
- Provides a clean API for components without needing to pass `workspaceId` to every call

**Usage:**

```typescript
import { useWorkspaceFileExplorer } from "~/composables/useWorkspaceFileExplorer";

// Option 1: Explicit workspace ID (for Skills, transient workspaces)
const explorer = useWorkspaceFileExplorer(toRef(props, "workspaceId"));

// Option 2: Use the active workspace (for main agent views)
const explorer = useWorkspaceFileExplorer();

// Scoped actions - no need to pass workspaceId
explorer.openFile("/src/main.ts");
explorer.toggleFolder("/src");
explorer.searchFiles("utils");

// Scoped state
const files = explorer.openFiles; // ComputedRef<string[]>
const activeFile = explorer.activeFile; // ComputedRef<string | null>
```

**Provide/Inject Pattern:**

`FileExplorer.vue` provides the composable instance to its children:

```typescript
// FileExplorer.vue
const explorer = useWorkspaceFileExplorer(toRef(props, "workspaceId"));
provide("workspaceFileExplorer", explorer);

// FileItem.vue (child)
const explorer = inject("workspaceFileExplorer")!;
explorer.openFile(props.file.path); // Uses the correct workspace context
```

This pattern is critical for **Skill workspaces**, which are NOT the "active" workspace but need their own isolated file explorer context.

### Mobile Files and `useMobileWorkspaceFileExplorer`

The `/mobile` Phone Access Files tab uses `MobileFiles.vue` and
`useMobileWorkspaceFileExplorer.ts` instead of the desktop split-pane explorer
layout. The mobile surface is read-only and delegates to the same authoritative
workspace/file-explorer owners:

- workspace resolution comes from the current `MobileWorkContext`:
  workspace contexts use their workspace id, and agent/team run contexts resolve
  by workspace root path;
- if a selected run/team-run workspace root cannot be resolved, mobile shows an
  explicit unavailable/retry state instead of falling back to another active or
  first workspace;
- folder taps call `workspaceStore.fetchFolderChildren(workspaceId, path)` for
  unloaded folders before navigating;
- full-workspace search calls `fileExplorerStore.searchFiles(query,
  workspaceId)`, so matches do not depend only on already-loaded tree nodes;
- file taps call `fileExplorerStore.openFilePreview(path, workspaceId)` and
  pass the resulting open-file state into `MobileFileViewer.vue`;
- `MobileFileViewer.vue` reuses the shared `FileViewer` in read-only mode for
  supported text/Markdown/code, image, audio, video, PDF, CSV, and Excel
  previews through protected workspace content URLs and authorized resource
  loading;
- the mobile **Attach** action is owned by
  `useMobileFileContextCoordinator.ts` and adds workspace paths to the active
  run, pending team-run, or next-run draft context without turning Files into an
  editor.

Mobile Files must not import desktop shell/split-pane owners such as
`FileExplorerLayout`, `FileExplorerTabs`, `TeamCommunicationPanel`,
`RightSideTabs`, or Electron APIs. Create/rename/delete/move/edit operations
remain desktop file-explorer responsibilities unless a separate mobile editing
design is approved.

## TreeNode Data Structure

Client-side representation of files/folders:

```typescript
class TreeNode {
  name: string; // File or folder name
  path: string; // Full relative path
  is_file: boolean; // True for files, false for folders
  children: TreeNode[]; // Child nodes (for folders)
  id: string; // Unique identifier
  childrenLoaded: boolean; // False if children need to be fetched via lazy load

  // Sorted insertion (directories first, then alphabetically)
  addChild(node: TreeNode): void;

  // Deserialize from server JSON
  static fromObject(obj: any): TreeNode;
}
```

## File Search

The File Search feature enables users to quickly find files within a workspace by typing a search query. It uses backend snapshot search strategies such as `fuzzysort` and displays results as clickable file items.

### Architecture

```mermaid
sequenceDiagram
    participant User
    participant FileExplorer as FileExplorer.vue
    participant Timer as Debounce Timer
    participant Store as fileExplorer.ts
    participant GraphQL as Apollo Client
    participant Backend as autobyteus-server-ts

    User->>FileExplorer: Types search query
    FileExplorer->>Timer: Start/Reset 500ms timer
    Timer-->>FileExplorer: Timer fires
    FileExplorer->>Store: searchFiles(query)

    Note over Store: Cancel previous request<br/>if still in-flight
    Store->>Store: Set searchLoading=true
    Store->>GraphQL: query SearchFiles
    GraphQL->>Backend: GraphQL request
    Backend-->>GraphQL: Array of file paths
    GraphQL-->>Store: Response data
    Store->>Store: Convert paths to TreeNodes
    Store->>Store: Set searchResults, searchLoading=false
    Store-->>FileExplorer: Reactive state update
    FileExplorer->>User: Display search results
```

### State Management

Search state is maintained per-workspace within `WorkspaceFileExplorerState`:

```typescript
interface WorkspaceFileExplorerState {
  // ... other fields ...

  // State for file search
  searchResults: TreeNode[]; // Array of matching file nodes
  searchLoading: boolean; // True while request is in-flight
  searchError: string | null; // Error message if search fails
  searchAbortController: AbortController | null; // For request cancellation
}
```

**Getters (in `fileExplorer.ts`):**

| Getter | Returns | Description |
| --- | --- | --- |
| `getSearchResults(workspaceId)` | `TreeNode[]` | Array of matching file nodes for the workspace. |
| `isSearchLoading(workspaceId)` | `boolean` | True if a search request is in-flight for the workspace. |
| `getSearchError(workspaceId)` | `string \| null` | Error message if search failed for the workspace. |

### Key Features

#### 1. Debounced Input (500ms)

To avoid overwhelming the backend with requests on every keystroke, the UI debounces the search input:

```typescript
// FileExplorer.vue
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (newQuery) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(() => {
    explorer.searchFiles(newQuery);
  }, 500);
});
```

#### 2. Request Cancellation (AbortController)

If a new search is triggered while a previous request is still in-flight, the previous request is cancelled to prevent stale results from overwriting newer ones:

```typescript
// fileExplorer.ts - searchFiles action
async searchFiles(query: string, workspaceId: string) {
  const wsState = this._getOrCreateWorkspaceState(workspaceId);

  // Cancel any previous in-flight search request
  if (wsState.searchAbortController) {
    wsState.searchAbortController.abort();
  }
  wsState.searchAbortController = new AbortController();

  // Pass signal to Apollo Client
  const { data } = await client.query({
    query: SearchFiles,
    variables: { workspaceId, query },
    context: {
      fetchOptions: {
        signal: wsState.searchAbortController.signal
      }
    }
  });
  // ...
}
```

#### 3. TreeNode Conversion

Search results from the backend are file paths. The frontend converts these to `TreeNode` objects so they can be rendered by the same `FileItem.vue` component used for the directory tree:

```typescript
wsState.searchResults = matchedPaths.map((filePath) => {
  // First try to find existing node in the tree (for proper metadata)
  const existingNode = findFileByPath(
    fileExplorerStore.getWorkspaceTree(workspaceId)?.children || [],
    filePath
  );
  if (existingNode) return existingNode;

  // If not in tree (due to lazy loading), create a simple TreeNode
  const fileName = filePath.split("/").pop() || filePath;
  return new TreeNode(
    fileName, // name
    filePath, // path
    true, // is_file
    [], // children
    `search-${filePath}`, // unique id for search results
    true // childrenLoaded
  );
});
```

### UI Component (FileExplorer.vue)

The search input and results display are integrated into the main file explorer panel:

```vue
<template>
  <div class="file-explorer">
    <!-- Search input -->
    <input v-model="searchQuery" type="text" placeholder="Search files..." />

    <!-- Results display -->
    <div v-if="searchLoading">Loading search results...</div>
    <div v-else-if="displayedFiles.length === 0 && searchQuery">
      No files match your search.
    </div>
    <div v-else>
      <FileItem v-for="file in displayedFiles" :key="file.id" :file="file" />
    </div>
  </div>
</template>

<script setup>
const displayedFiles = computed(() => {
  if (searchQuery.value) {
    return explorer.searchResults.value || []; // Show search results
  }
  return explorer.tree.value?.children || []; // Show tree
});
</script>
```

### Usage Example

```typescript
const fileExplorerStore = useFileExplorerStore();

// Search for files
await fileExplorerStore.searchFiles("utils", workspaceId);

// Access results
const results = fileExplorerStore.getSearchResults(workspaceId);
const isLoading = fileExplorerStore.isSearchLoading(workspaceId);
const error = fileExplorerStore.getSearchError(workspaceId);
```

### Backend Integration

The frontend sends a `SearchFiles` GraphQL query. Search is a request/response snapshot operation and must not start a live watcher. See [autobyteus-server-ts/docs/modules/file_explorer.md](../../autobyteus-server-ts/docs/modules/file_explorer.md) for backend implementation details including:

- Search strategy pattern (allowing different search algorithms)
- Fuzzy matching using `fuzzysort` and optional ripgrep-backed strategies
- File name index refreshes from snapshot traversal instead of persistent watcher state

---

## GraphQL API

### Queries

```graphql
# Get file content
query GetFileContent($workspaceId: String!, $filePath: String!) {
  fileContent(workspaceId: $workspaceId, filePath: $filePath)
}

# Search files
query SearchFiles($workspaceId: String!, $query: String!) {
  searchFiles(workspaceId: $workspaceId, query: $query)
}

# Get folder children (Lazy Loading)
query GetFolderChildren($workspaceId: String!, $folderPath: String!) {
  folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
}
```

### Mutations

```graphql
# Write file content
mutation WriteFileContent($workspaceId: String!, $filePath: String!, $content: String!)

# Create file or folder
mutation CreateFileOrFolder($workspaceId: String!, $path: String!, $isFile: Boolean!)

# Delete file or folder
mutation DeleteFileOrFolder($workspaceId: String!, $path: String!)

# Move file or folder
mutation MoveFileOrFolder($workspaceId: String!, $sourcePath: String!, $destinationPath: String!)

# Rename file or folder
mutation RenameFileOrFolder($workspaceId: String!, $targetPath: String!, $newName: String!)
```

### Backend Path Boundary Contract

The server treats all File Explorer paths as workspace-relative and validates
them against the workspace root before reading, writing, or mutating tree
state. Frontend callers should pass relative paths returned by the tree/search
APIs and surface backend errors without trying to normalize escaped paths into
valid operations.

Backend-enforced rules include:

- ignored folders such as `.git`, `node_modules`, and `.gitignore`-matched
  paths are rejected by `folderChildren` instead of being projected into the
  tree;
- `folderChildren`, `fileContent`, and `writeFileContent` reject traversal or
  same-prefix sibling escapes that resolve outside the workspace root;
- `renameFileOrFolder.newName` must be a leaf name, not a path; path-like names
  are rejected before filesystem mutation;
- rejected snapshot/boundary operations do not acquire live watcher sessions.

### Subscriptions (Removed)

> [!NOTE]
> The GraphQL subscription `FileSystemChanged` has been removed.
> Real-time file system changes are now delivered via WebSocket (see below).

## Real-Time Synchronization (WebSocket)

Real-time file synchronization is **visibility-driven**. Snapshot APIs such as workspace create/fetch, folder lazy-load, file content reads, file mutations, and search are request/response flows and do **not** keep a backend filesystem watcher open. A live watcher exists only while at least one visible `FileExplorer.vue` consumer has acquired a live session for a workspace.

### Visible Live Session Lifecycle

`FileExplorer.vue` watches its resolved workspace (`props.workspaceId` or the active workspace), acquires a live session when the explorer is mounted for that workspace, and releases it on unmount or workspace switch:

```typescript
const liveSessionConsumerId = `file-explorer:${++fileExplorerConsumerCounter}`;
let releaseLiveSession: (() => void) | null = null;

watch(() => currentWorkspace.value?.workspaceId ?? "", (workspaceId) => {
  releaseLiveSession?.();
  releaseLiveSession = workspaceId
    ? workspaceStore.acquireFileExplorerLiveSession(workspaceId, liveSessionConsumerId)
    : null;
}, { immediate: true });

onUnmounted(() => {
  releaseLiveSession?.();
});
```

The `workspace.ts` store owns de-duplication across visible consumers:

```typescript
acquireFileExplorerLiveSession(workspaceId: string, consumerId: string): () => void {
  let consumers = this.fileExplorerLiveConsumers.get(workspaceId);
  if (!consumers) {
    consumers = new Set();
    this.fileExplorerLiveConsumers.set(workspaceId, consumers);
  }

  const alreadyRegistered = consumers.has(consumerId);
  consumers.add(consumerId);
  if (!alreadyRegistered && consumers.size === 1) {
    this.connectFileExplorerLiveStream(workspaceId);
  }

  this.refreshFileExplorerSnapshot(workspaceId);
  return () => this.releaseFileExplorerLiveSession(workspaceId, consumerId);
}
```

Important guarantees:

- Multiple visible explorer surfaces for the same workspace share one frontend `FileExplorerStreamingService` connection.
- Releasing one consumer does not disconnect the stream while other consumers remain visible.
- The final consumer release disconnects the WebSocket and clears the workspace's live-consumer set.
- Every acquisition refreshes the root and currently open folders through GraphQL so an explorer that was hidden catches up without needing a background watcher.
- Backend binding resets, duplicate workspace replacement, and skill workspace unregister all clear live sessions before removing workspace state.

### WebSocket Service

The `FileExplorerStreamingService` is the low-level WebSocket client. Components normally use the `workspace.ts` live-session API instead of constructing this service directly.

```typescript
import { FileExplorerStreamingService } from "~/services/fileExplorerStreaming";
import { useWindowNodeContextStore } from "~/stores/windowNodeContextStore";

const windowNodeContextStore = useWindowNodeContextStore();
const wsEndpoint = windowNodeContextStore.getBoundEndpoints().fileExplorerWs;

const service = new FileExplorerStreamingService(wsEndpoint, {
  onFileSystemChange: (event) => {
    workspaceStore.handleFileSystemChange(workspaceId, event, "stream");
  },
  onConnect: (sessionId) => {
    console.log("Connected to file explorer stream:", sessionId);
  },
  onDisconnect: (reason) => {
    console.log("Disconnected:", reason);
  },
  onError: (error) => {
    console.error("WebSocket error:", error);
  },
});

service.connect(workspaceId);
service.disconnect();
```

### Backend Watcher Lease Lifecycle

The backend WebSocket route resolves the workspace and asks its file explorer for a watcher lease before subscribing to events. `WorkspaceFileExplorer.acquireWatcherLease("file-explorer-websocket")` starts the underlying `FileSystemWatcher` only for the first active lease and returns an idempotent lease release handle. `subscribe()` is valid only after a lease has started the watcher.

Each WebSocket session owns one watcher lease through `FileExplorerSession`. Disconnecting the WebSocket, ending the async event iterator, early-closing before the `CONNECTED` message is observed, or closing the workspace releases the session and lease. When the lease count reaches zero, the backend stops the chokidar watcher.

Snapshot operations intentionally bypass this lifecycle:

- `createWorkspace`, `fetchAllWorkspaces`, `folderChildren`, `fileContent`, and `searchFiles` return snapshots without acquiring watcher leases.
- File mutations return concrete change events that the frontend applies immediately; the later stream echo is filtered if a live stream is open.
- Search index refresh uses snapshot traversal (`getAllFilePaths`) and does not keep watcher state alive.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant ExplorerA as Visible FileExplorer A
    participant ExplorerB as Visible FileExplorer B
    participant Store as workspace.ts
    participant WebSocket as FileExplorerStreamingService
    participant Backend as FileExplorerStreamHandler
    participant Explorer as WorkspaceFileExplorer
    participant Watcher as FileSystemWatcher
    participant FS as File System

    ExplorerA->>Store: acquireFileExplorerLiveSession(workspaceId, consumerA)
    Store->>WebSocket: connect(workspaceId) because first consumer
    Store->>Store: refreshFileExplorerSnapshot(workspaceId)
    WebSocket->>Backend: /ws/file-explorer/{workspaceId}
    Backend->>Explorer: acquireWatcherLease("file-explorer-websocket")
    Explorer->>Watcher: start() if first lease
    Backend-->>WebSocket: CONNECTED(sessionId)

    ExplorerB->>Store: acquireFileExplorerLiveSession(workspaceId, consumerB)
    Store->>Store: reuse existing stream; refresh snapshot

    FS-->>Watcher: File created/modified/deleted
    Watcher->>Backend: Batched FileSystemChangeEvent
    Backend-->>WebSocket: FILE_SYSTEM_CHANGE
    WebSocket->>Store: handleFileSystemChange(workspaceId, event, "stream")
    Store->>ExplorerA: Reactive tree update
    Store->>ExplorerB: Reactive tree update

    ExplorerA->>Store: release consumerA
    Store->>Store: keep stream because consumerB remains
    ExplorerB->>Store: release consumerB
    Store->>WebSocket: disconnect()
    Backend->>Explorer: release watcher lease
    Explorer->>Watcher: stop() when lease count is zero
```

### Key Files

Frontend:

- `components/fileExplorer/FileExplorer.vue` - visible-session acquisition/release.
- `services/fileExplorerStreaming/FileExplorerStreamingService.ts` - low-level WebSocket client, authenticated remote-access WebSocket URL handling, reconnect policy.
- `services/fileExplorerStreaming/types.ts` - protocol types.
- `stores/workspace.ts` - metadata-only workspace lifecycle and live-consumer tracking, one stream per workspace.
- `utils/fileExplorer/openFolderRefresh.ts` - root/open-folder refresh helpers for newly visible explorers.
- `utils/fileExplorer/stateSync.ts` - structural mutation echo filtering and path remapping helpers.

Backend:

- `autobyteus-server-ts/src/api/websocket/file-explorer.ts` - Fastify WebSocket route and early-close handling.
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts` - watcher lease acquisition, session setup, stream loop, disconnect cleanup.
- `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` - session-owned async iterator cancellation and watcher lease release.
- `autobyteus-server-ts/src/file-explorer/file-explorer.ts` - lazy tree/search/operation/watcher capability boundary and watcher lease counting.
- `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` - chokidar watcher and subscriber fan-out.

### Change Event Types

```typescript
interface FileSystemChangeEvent {
  changes: Array<
    AddChange | DeleteChange | RenameChange | MoveChange | ModifyChange
  >;
}

interface AddChange {
  type: "add";
  parent_id: string;
  node: { id: string; name: string; path: string; is_file: boolean };
}

interface DeleteChange {
  type: "delete";
  parent_id: string;
  node_id: string;
}

interface RenameChange {
  type: "rename";
  parent_id: string;
  node: { id: string; name: string; path: string };
}

interface MoveChange {
  type: "move";
  old_parent_id: string;
  new_parent_id: string;
  node: { id: string; name: string; path: string };
}

interface ModifyChange {
  type: "modify";
  node_id: string;
}
```

### Echo Prevention

The frontend handles two classes of self-initiated event echoes:

1. **Structural mutation echoes** (`add`, `delete`, `rename`, `move`): after a successful GraphQL mutation, `fileExplorer.ts` records the returned change event with `recordRecentStructuralChangeEcho()` and immediately applies it through the file-explorer tree state. If the live stream later emits the same change, `fileExplorer.ts` calls `consumeRecentStructuralChangeEchoes()` before applying stream changes so the tree is not mutated twice.
2. **Content save echoes** (`modify`): before saving text content, the store tags the path in `filesToIgnoreNextModify`. When the corresponding stream `modify` event arrives, the tag is consumed so the editor does not immediately invalidate and refetch its own saved content.

```typescript
// Structural operation result from GraphQL
const changeEvent: FileSystemChangeEvent = JSON.parse(data.moveFileOrFolder);
fileExplorerStore.recordRecentStructuralChangeEcho(workspaceId, changeEvent);
fileExplorerStore.handleFileSystemChange(workspaceId, changeEvent, "mutation");

// Incoming stream event
const effectiveEvent = fileExplorerStore.consumeRecentStructuralChangeEchoes(
  workspaceId,
  event,
);
if (effectiveEvent.changes.length > 0) {
  applyTreeChanges(wsState.tree, wsState.nodeIdToNode, effectiveEvent);
}
```

```typescript
// Before saving text content
wsFileExplorerState.filesToIgnoreNextModify.add(filePath);

// When receiving a modify event
if (wsFileExplorerState.filesToIgnoreNextModify.has(node.path)) {
  wsFileExplorerState.filesToIgnoreNextModify.delete(node.path);
} else {
  fileExplorerStore.invalidateFileContent(node.path, workspaceId);
}
```

## File Utilities

### Tree Manipulation (fileUtils.ts)

| Function                         | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `handleFileSystemChange()`       | Routes change events to handlers               |
| `handleAddChange()`              | Adds node to parent with sorted insertion      |
| `handleDeleteChange()`           | Removes node from parent                       |
| `handleRenameChange()`           | Renames node and updates descendants           |
| `handleMoveChange()`             | Moves node between parents                     |
| `updateDescendantPaths()`        | Recursively updates child paths on rename/move |
| `findFileByPath()`               | Searches tree for node by path                 |
| `createNodeIdToNodeDictionary()` | Builds id→node lookup map                      |

### File Type Detection

```typescript
function determineFileType(
  filePath: string
): "Text" | "Image" | "Audio" | "Video" | "Excel" {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const audioExtensions = [".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac"];
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  const excelExtensions = [".xlsx", ".xls", ".xlsm", ".csv"];
  // ... extension matching logic
}
```

## Usage Examples

### Opening a File

Prefer the workspace-scoped composable inside components:

```typescript
const explorer = useWorkspaceFileExplorer(toRef(props, "workspaceId"));

// Open in full edit mode
explorer.openFile("/src/main.ts");

// Open in preview mode
explorer.openFilePreview("/docs/README.md");
```

If using the store directly, pass `workspaceId` explicitly:

```typescript
const fileExplorerStore = useFileExplorerStore();
await fileExplorerStore.openFile("/src/main.ts", workspaceId);
await fileExplorerStore.openFilePreview("/docs/README.md", workspaceId);
```

### Performing File Operations

```typescript
// Create a new file
await fileExplorerStore.createFileOrFolder("/src/utils/helpers.ts", true, workspaceId);

// Rename a file
await fileExplorerStore.renameFileOrFolder("/src/old-name.ts", "new-name.ts", workspaceId);

// Delete a file
await fileExplorerStore.deleteFileOrFolder("/src/deprecated.ts", workspaceId);

// Move a file
await fileExplorerStore.moveFileOrFolder("/src/utils.ts", "/src/lib/utils.ts", workspaceId);
```

### Navigating Open Files

```typescript
// Navigate between tabs with keyboard
fileExplorerStore.navigateToNextTab(workspaceId); // Arrow Right
fileExplorerStore.navigateToPreviousTab(workspaceId); // Arrow Left

// Close files
fileExplorerStore.closeFile("/src/main.ts", workspaceId);
fileExplorerStore.closeAllFiles(workspaceId);
fileExplorerStore.closeOtherFiles("/src/app.ts", workspaceId); // Keep only app.ts
```

## Related Documentation

- **[Content Rendering](./content_rendering.md)**: Details how file content (Markdown, Code, Media) is displayed.
- **[Terminal](./terminal.md)**: Terminal uses an explicit cwd/root path and is intentionally separate from File Explorer tree/search/watch state.
- **[Skills](./skills.md)**: Skills are file-based and often managed or viewed within the file system context.
