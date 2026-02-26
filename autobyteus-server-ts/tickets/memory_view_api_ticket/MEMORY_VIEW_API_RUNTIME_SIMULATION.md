# Runtime Simulation (Memory View API - TypeScript)

This simulation mirrors the production call path for the new GraphQL queries. Each case shows a debug-style call stack with key arguments and the expected data flow.

## Case 1: List Memory Snapshots

```
api/graphql/schema.ts:buildGraphqlSchema()
└── api/graphql/types/memory-index.ts:MemoryIndexResolver.listAgentMemorySnapshots(search="agent", page=1, pageSize=50)
    ├── config/app-config-provider.ts:appConfigProvider.config.getMemoryDir()
    ├── agent-memory-view/store/memory-file-store.ts:constructor(baseDir)
    ├── agent-memory-view/services/agent-memory-index-service.ts:listSnapshots(search="agent", page=1, pageSize=50)
    │   ├── agent-memory-view/store/memory-file-store.ts:listAgentDirs()
    │   ├── agent-memory-view/services/agent-memory-index-service.ts:_buildSummary(agentId)
    │   │   ├── agent-memory-view/store/memory-file-store.ts:getFileInfo(working_context_snapshot.json)
    │   │   ├── agent-memory-view/store/memory-file-store.ts:getFileInfo(episodic.jsonl)
    │   │   ├── agent-memory-view/store/memory-file-store.ts:getFileInfo(semantic.jsonl)
    │   │   ├── agent-memory-view/store/memory-file-store.ts:getFileInfo(raw_traces.jsonl)
    │   │   └── agent-memory-view/store/memory-file-store.ts:getFileInfo(raw_traces_archive.jsonl)
    │   └── agent-memory-view/services/agent-memory-index-service.ts:_sortAndPage(...)
    └── api/graphql/converters/memory-index-converter.ts:toGraphql(page)
```

Expected result: `MemorySnapshotPage` containing the newest snapshots (sorted by mtime), with paging info.

## Case 2: Memory View (Working Context + Conversation)

```
api/graphql/types/memory-view.ts:MemoryViewResolver.getAgentMemoryView(
  agentId="agent-123",
  includeWorkingContext=true,
  includeEpisodic=false,
  includeSemantic=false,
  includeConversation=true,
  includeRawTraces=false,
  includeArchive=false,
  rawTraceLimit=null,
  conversationLimit=200
)
├── config/app-config-provider.ts:appConfigProvider.config.getMemoryDir()
├── agent-memory-view/store/memory-file-store.ts:constructor(baseDir)
├── agent-memory-view/services/agent-memory-view-service.ts:getAgentMemoryView(agentId, options)
│   ├── agent-memory-view/store/memory-file-store.ts:readWorkingContextSnapshot(agentId)
│   ├── agent-memory-view/services/agent-memory-view-service.ts:_parseWorkingContext(snapshot)
│   ├── agent-memory-view/store/memory-file-store.ts:readRawTracesActive(agentId)
│   ├── agent-memory-view/services/agent-memory-view-service.ts:_mergeAndSortTraces(active, archive=[])
│   ├── agent-memory-view/transformers/raw-trace-to-conversation.ts:buildConversationView(traces, collapseTools=true)
│   └── agent-memory-view/services/agent-memory-view-service.ts:_applyConversationLimit(entries, 200)
└── api/graphql/converters/memory-view-converter.ts:toGraphql(view)
```

Expected result: `workingContext` contains parsed messages; `conversation` contains collapsed tool calls and messages; `rawTraces` is null.

## Case 3: Memory View (Raw Traces + Archive)

```
api/graphql/types/memory-view.ts:MemoryViewResolver.getAgentMemoryView(
  agentId="agent-123",
  includeWorkingContext=false,
  includeEpisodic=false,
  includeSemantic=false,
  includeConversation=false,
  includeRawTraces=true,
  includeArchive=true,
  rawTraceLimit=500,
  conversationLimit=null
)
├── config/app-config-provider.ts:appConfigProvider.config.getMemoryDir()
├── agent-memory-view/store/memory-file-store.ts:constructor(baseDir)
├── agent-memory-view/services/agent-memory-view-service.ts:getAgentMemoryView(agentId, options)
│   ├── agent-memory-view/store/memory-file-store.ts:readRawTracesActive(agentId)
│   ├── agent-memory-view/store/memory-file-store.ts:readRawTracesArchive(agentId)
│   ├── agent-memory-view/services/agent-memory-view-service.ts:_mergeAndSortTraces(active, archive)
│   ├── agent-memory-view/services/agent-memory-view-service.ts:_applyRawTraceLimit(traces, 500)
│   └── agent-memory-view/services/agent-memory-view-service.ts:_toTraceEvent(...)
└── api/graphql/converters/memory-view-converter.ts:toGraphql(view)
```

Expected result: `rawTraces` contains the newest 500 merged trace events.

## Case 4: Missing Files (Safe Degradation)

```
agent-memory-view/services/agent-memory-view-service.ts:getAgentMemoryView(agentId="missing")
├── memory-file-store.ts:readWorkingContextSnapshot() -> null
├── memory-file-store.ts:readEpisodic() -> []
├── memory-file-store.ts:readSemantic() -> []
├── memory-file-store.ts:readRawTracesActive() -> []
└── raw-trace-to-conversation.ts:buildConversationView([]) -> []
```

Expected result: GraphQL returns empty lists or null without errors.

## Case 5: Invalid JSON / JSONL Lines

```
memory-file-store.ts:readJson(path)
└── returns null if JSON.parse fails

memory-file-store.ts:readJsonl(path)
├── skip malformed lines
└── return valid parsed objects only
```

Expected result: GraphQL returns partial results; malformed lines are ignored.

## Separation of Concerns Check
- File IO stays in `memory-file-store`.
- Aggregation and limits in services.
- Trace-to-conversation is a pure transformer.
- GraphQL resolvers only orchestrate and map to GraphQL.
- Converters isolate GraphQL schema types.
