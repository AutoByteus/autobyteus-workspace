# Memory View API Design (autobyteus-server-ts)

## Goal
Expose agent memory snapshots (working context, episodic, semantic, conversation view, raw traces) via GraphQL, backed by the memory files on disk. This mirrors the Python implementation and is designed for the new Memory Inspector UI.

## Data Sources
All data is read from the memory directory returned by `appConfigProvider.config.getMemoryDir()`.
Each agent has a folder: `memory/agents/<agentId>/`.

Files used:
- `working_context_snapshot.json`
- `episodic.jsonl`
- `semantic.jsonl`
- `raw_traces.jsonl`
- `raw_traces_archive.jsonl`

## Domain Models (src/agent-memory-view/domain/models.ts)
Plain TypeScript types that represent the memory view output.

- `MemoryMessage`
  - `role: string`
  - `content?: string | null`
  - `reasoning?: string | null`
  - `toolPayload?: Record<string, unknown> | null`
  - `ts?: number | null`

- `MemoryTraceEvent`
  - `traceType: string`
  - `content?: string | null`
  - `toolName?: string | null`
  - `toolArgs?: Record<string, unknown> | null`
  - `toolResult?: unknown | null`
  - `toolError?: string | null`
  - `media?: Record<string, string[]> | null`
  - `turnId: string`
  - `seq: number`
  - `ts: number`

- `MemoryConversationEntry`
  - `kind: string`
  - `role?: string | null`
  - `content?: string | null`
  - `toolName?: string | null`
  - `toolArgs?: Record<string, unknown> | null`
  - `toolResult?: unknown | null`
  - `toolError?: string | null`
  - `media?: Record<string, string[]> | null`
  - `ts?: number | null`

- `AgentMemoryView`
  - `agentId: string`
  - `workingContext?: MemoryMessage[] | null`
  - `episodic?: Array<Record<string, unknown>> | null`
  - `semantic?: Array<Record<string, unknown>> | null`
  - `conversation?: MemoryConversationEntry[] | null`
  - `rawTraces?: MemoryTraceEvent[] | null`

- `MemorySnapshotSummary`
  - `agentId: string`
  - `lastUpdatedAt?: string | null`
  - `hasWorkingContext: boolean`
  - `hasEpisodic: boolean`
  - `hasSemantic: boolean`
  - `hasRawTraces: boolean`
  - `hasRawArchive: boolean`

- `MemorySnapshotPage`
  - `entries: MemorySnapshotSummary[]`
  - `total: number`
  - `page: number`
  - `pageSize: number`
  - `totalPages: number`

## Store (src/agent-memory-view/store/memory-file-store.ts)
Single responsibility: file system access and parsing.

API:
- `listAgentDirs(): string[]`
- `getAgentDir(agentId: string): string`
- `getFileInfo(path: string): { exists: true; mtime: number } | null`
- `readJson(path: string): Record<string, unknown> | null`
- `readJsonl(path: string, limit?: number): Array<Record<string, unknown>>`
- `readWorkingContextSnapshot(agentId: string): Record<string, unknown> | null`
- `readRawTracesActive(agentId: string, limit?: number): Array<Record<string, unknown>>`
- `readRawTracesArchive(agentId: string, limit?: number): Array<Record<string, unknown>>`
- `readEpisodic(agentId: string, limit?: number): Array<Record<string, unknown>>`
- `readSemantic(agentId: string, limit?: number): Array<Record<string, unknown>>`

Behavior:
- Missing file returns `null` or `[]` (no throw).
- Invalid JSON/JSONL lines are skipped with warning logs.

## Transformers (src/agent-memory-view/transformers/raw-trace-to-conversation.ts)
Pure transformation of raw traces into conversation entries.

API:
- `buildConversationView(rawTraces: Array<Record<string, unknown>>, collapseTools = true): MemoryConversationEntry[]`

Rules:
- `user` and `assistant` traces are rendered as `kind = "message"`.
- `tool_call` + `tool_result` are collapsed into a single entry when possible.
- Orphaned tool results are preserved as `kind = "tool_result_orphan"`.

## Services

### AgentMemoryViewService (src/agent-memory-view/services/agent-memory-view-service.ts)
Composes store + transformer to create a full `AgentMemoryView`.

API:
- `getAgentMemoryView(agentId: string, options: AgentMemoryViewOptions): AgentMemoryView`

Options:
- `includeWorkingContext?: boolean`
- `includeEpisodic?: boolean`
- `includeSemantic?: boolean`
- `includeConversation?: boolean`
- `includeRawTraces?: boolean`
- `includeArchive?: boolean`
- `rawTraceLimit?: number | null`
- `conversationLimit?: number | null`

Behavior:
- Working context parsed from `working_context_snapshot.json` when enabled.
- Raw traces are merged from active + archive, sorted by `(ts, turnId, seq)`.
- Limits apply after merge/sort.

### AgentMemoryIndexService (src/agent-memory-view/services/agent-memory-index-service.ts)
Creates a paged list of memory snapshot summaries.

API:
- `listSnapshots(search?: string | null, page = 1, pageSize = 50): MemorySnapshotPage`

Behavior:
- Sorts summaries by most recently updated file (descending).
- Search filters by `agentId` substring.

## GraphQL Types & Resolvers (src/api/graphql/types)

### Types
- `MemoryMessage`
- `MemoryTraceEvent`
- `MemoryConversationEntry`
- `AgentMemoryView`
- `MemorySnapshotSummary`
- `MemorySnapshotPage`

JSON fields use `GraphQLJSON` from `graphql-scalars`.

### Resolvers
- `MemoryViewResolver.getAgentMemoryView(...)`
- `MemoryIndexResolver.listAgentMemorySnapshots(...)`

Resolvers obtain base memory directory via `appConfigProvider.config.getMemoryDir()` and instantiate `MemoryFileStore` + services.

## GraphQL Converters (src/api/graphql/converters)

- `MemoryViewConverter.toGraphql(domain: AgentMemoryView): AgentMemoryView`
- `MemoryIndexConverter.toGraphql(domain: MemorySnapshotPage): MemorySnapshotPage`

Converters isolate GraphQL shape from domain models.

## Error Handling
- Missing files: return empty structures for list, null for snapshots.
- Invalid JSON: skip and return partial results.
- Page bounds: clamp to `>= 1` in service.

## Separation of Concerns
- Store: file IO only.
- Transformer: pure trace transformation.
- Services: composition, sorting, limits.
- GraphQL: resolver orchestration + GraphQL types.
- Converters: domain to GraphQL mapping.
