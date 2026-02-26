# Memory View UI (Frontend) - Design

## Goal
Expose the new server memory view in the frontend without using the current conversation history UI. The memory module is different and conversation history will be removed later.

Users should be able to:
- Browse stored agent memories (even when no agents are running).
- Select a memory snapshot by agent id.
- Inspect memory: working context, episodic summaries, semantic facts.
- Inspect raw traces when needed.

## Placement (Recommended)
Top-level navigation: `Memory`.

Placement details:
- Add a new sidebar item in `components/Sidebar.vue` alongside Agents, Tools, Media.
- Create a dedicated page `pages/memory.vue`.
- Keep Settings free of memory to avoid coupling with conversation history.

## Proposed UI Structure

### 1) Page Layout
Use `ResponsiveMasterDetail` like `pages/agents.vue`.

Sidebar (left):
- **Memory Index** list (from backend index API, not running agents).
- Search/filter input (agent id or name).
- Manual Agent Id input (fallback).
- Pagination controls (page / next / previous).

Content (right):
- Memory inspector with tabs.
- Tab: Working Context (default).
- Tab: Episodic.
- Tab: Semantic.
- Tab: Raw Traces.

### 2) Data Source
Two GraphQL queries:

1. `listAgentMemorySnapshots(filter, page, pageSize)`  
   Returns the memory index list used by the sidebar. Minimal fields:
   - `agentId`
   - `lastUpdatedAt`
   - `hasWorkingContext`
   - `hasEpisodic`
   - `hasSemantic`
   - `hasRawTraces`
   - optional `label` or `agentName` if available

2. `getAgentMemoryView(agentId, rawTraceLimit, conversationLimit)`  
   Returns the memory details for the inspector.

Data mapping for inspector:
- Working Context tab: `memoryView.workingContext`.
- Episodic tab: `memoryView.episodic`.
- Semantic tab: `memoryView.semantic`.
- Raw Traces tab: `memoryView.rawTraces`.

### 3) New Store (Pinia)
Create two stores:

1. `stores/agentMemoryIndexStore.ts`:
- `entries` list.
- loading/error state.
- search/filter inputs.
- pagination (page/pageSize).

2. `stores/agentMemoryViewStore.ts`:
- `selectedAgentId`.
- `memoryView` payload.
- loading/error state.
- `rawTraceLimit` and `conversationLimit` controls.
- `includeRawTraces` flag (default false; turn on when user opens Raw Traces tab).

Selection policy:
- `selectedAgentId` lives only in the view store (single source of truth).
- Index refresh/search/pagination does **not** clear `selectedAgentId`.
- If `selectedAgentId` is not present in the current index page, the sidebar renders a small “Manual selection” chip/row (with a clear action).
- Selecting an index entry replaces the manual selection.

Error policy:
- **Index fetch error**: keep the last successful list, show an error banner with retry.
- **View fetch error**: keep the last successful memory view, show an error banner with retry.
- If there is no prior data, show an empty/error state.

### 4) New Components
Proposed components:
- `components/memory/MemorySidebar.vue` for memory index list + manual id entry.
- `components/memory/MemoryInspector.vue` for tabs and layout.
- `components/memory/WorkingContextTab.vue`.
- `components/memory/EpisodicTab.vue`.
- `components/memory/SemanticTab.vue`.
- `components/memory/RawTracesTab.vue`.

### 5) GraphQL Types
Best practice: use **codegen** (`pnpm -C autobyteus-web codegen`) and consume types from `generated/graphql.ts`.

Sources:
- GraphQL documents live in `graphql/queries/agentMemoryIndexQueries.ts` and `graphql/queries/agentMemoryViewQueries.ts`.
- `codegen.ts` reads all `graphql/**/*.ts` documents and outputs `generated/graphql.ts`.

Frontend types should come from generated operations:
- `ListAgentMemorySnapshotsQuery`, `ListAgentMemorySnapshotsQueryVariables`
- `GetAgentMemoryViewQuery`, `GetAgentMemoryViewQueryVariables`

Local TS interfaces are only a fallback when codegen is unavailable. Long‑term, prefer generated types to keep frontend/backend schema aligned.

## Separation of Concerns
- Index store: fetch and cache memory list, no UI formatting.
- View store: fetch and cache memory view, no UI formatting.
- Sidebar: selection UI only.
- Inspector: presentation only, relies on store data.
- GraphQL layer: query definition only.

## Open Questions
- Default `rawTraceLimit` and `conversationLimit` values for performance.
- Backend should expose the memory index API (list) to avoid relying on running agents.
- Should manual agent id selections appear as a temporary “pinned” entry in the sidebar?
