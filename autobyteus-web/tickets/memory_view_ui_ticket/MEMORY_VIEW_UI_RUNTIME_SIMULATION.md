# Memory View UI - Runtime Simulation

This is a frontend debug-style call stack simulation for key use cases. The goal is to validate end-to-end data flow and separation of concerns.

Assumptions:
- New page `pages/memory.vue`.
- New store `stores/agentMemoryViewStore.ts`.
- New store `stores/agentMemoryIndexStore.ts`.
- New query `graphql/queries/agentMemoryViewQueries.ts`.
- New query `graphql/queries/agentMemoryIndexQueries.ts`.
- GraphQL is accessed via `utils/apolloClient.ts` like existing stores.

## Use Case 1: Open Memory Page and Load Memory Index

```
pages/memory.vue:setup()
├── useAgentMemoryIndexStore():init()
│   └── agentMemoryIndexStore.fetchIndex(search=null, page=1, pageSize=50)
│       ├── utils/apolloClient.ts:getApolloClient()
│       ├── graphql/queries/agentMemoryIndexQueries.ts:LIST_AGENT_MEMORY_SNAPSHOTS
│       └── apolloClient.query({ query, variables, fetchPolicy="network-only" })
│           └── agentMemoryIndexStore.applyIndex(payload)
├── components/memory/MemorySidebar.vue:render(indexEntries, selectedAgentId)
└── components/memory/MemoryInspector.vue:render(emptyState)
```

Expected outcome:
- Index list is visible even when no agents are running.
- Inspector shows empty state until a memory entry is selected.

## Use Case 1a: Memory Index Empty

```
agentMemoryIndexStore.fetchIndex(search=null, page=1, pageSize=50)
└── apolloClient.query({ query, variables })
    └── server returns: entries=[]
    └── agentMemoryIndexStore.applyIndex(payload)
```

Expected outcome:
- Sidebar shows “No memories found” state.
- Manual Agent Id input remains available.

## Use Case 1b: Memory Index Error

```
agentMemoryIndexStore.fetchIndex(search=null, page=1, pageSize=50)
└── apolloClient.query({ query, variables }) throws
    └── agentMemoryIndexStore.setError(message)
    └── MemorySidebar.vue:renderError(error)
```

Expected outcome:
- Sidebar shows error banner and retry action.
- Last successful index list remains visible.

## Use Case 2: User Selects a Memory Entry from Index

```
components/memory/MemorySidebar.vue:onSelectAgent(agentId="agent-456")
└── agentMemoryViewStore.setSelectedAgentId(agentId="agent-456")
    └── agentMemoryViewStore.fetchMemoryView(agentId="agent-456", rawTraceLimit=500, conversationLimit=200)
        ├── utils/apolloClient.ts:getApolloClient()
        ├── graphql/queries/agentMemoryViewQueries.ts:GET_AGENT_MEMORY_VIEW
        └── apolloClient.query({ query, variables })
            └── agentMemoryViewStore.applyMemoryView(payload)
```

Expected outcome:
- Memory inspector updates to the selected memory entry.
- Previous memory view is replaced cleanly.

## Use Case 3: Manual Agent Id Entry (Fallback)

```
components/memory/MemorySidebar.vue:onSubmitManualId(agentId="agent-legacy-9001")
└── agentMemoryViewStore.setSelectedAgentId(agentId="agent-legacy-9001")
    └── agentMemoryViewStore.fetchMemoryView(agentId="agent-legacy-9001", rawTraceLimit=500, conversationLimit=200)
        ├── utils/apolloClient.ts:getApolloClient()
        ├── graphql/queries/agentMemoryViewQueries.ts:GET_AGENT_MEMORY_VIEW
        └── apolloClient.query({ query, variables })
            └── agentMemoryViewStore.applyMemoryView(payload)
```

Expected outcome:
- Memory view loads even if the agent is not in the index list.
- Sidebar highlights the manual id selection.

## Use Case 4: Missing Memory Files (Server returns empty sets)

```
agentMemoryViewStore.fetchMemoryView(agentId="agent-missing", rawTraceLimit=500, conversationLimit=200)
└── apolloClient.query({ query, variables })
    └── server returns:
        workingContext=null
        episodic=[]
        semantic=[]
        rawTraces=[]
        conversation=[]
    └── agentMemoryViewStore.applyMemoryView(payload)
```

Expected outcome:
- UI renders empty states for all tabs without crashing.
- Error state is not triggered (empty data is valid).

## Use Case 5: GraphQL Error (network or server error)

```
agentMemoryViewStore.fetchMemoryView(agentId="agent-123", rawTraceLimit=500, conversationLimit=200)
└── apolloClient.query({ query, variables }) throws
    └── agentMemoryViewStore.setError(message)
    └── agentMemoryViewStore.loading=false
        └── MemoryInspector.vue:renderError(error)
```

Expected outcome:
- Memory inspector shows an error banner.
- Previous memory view remains visible (stale) unless explicitly cleared.

## Use Case 6: User Opens Raw Traces Tab (On Demand)

```
components/memory/MemoryInspector.vue:onOpenRawTraces()
└── agentMemoryViewStore.setIncludeRawTraces(true)
    └── agentMemoryViewStore.fetchMemoryView(agentId="agent-123", includeRawTraces=true, rawTraceLimit=500, conversationLimit=200)
        ├── utils/apolloClient.ts:getApolloClient()
        ├── graphql/queries/agentMemoryViewQueries.ts:GET_AGENT_MEMORY_VIEW
        └── apolloClient.query({ query, variables })
            └── agentMemoryViewStore.applyMemoryView(payload)
```

Expected outcome:
- Raw traces load only when the tab is opened.
- Default tab remains lightweight.

## Use Case 7: User Adjusts Raw Trace Limit

```
components/memory/MemoryInspector.vue:onChangeRawTraceLimit(limit=200)
└── agentMemoryViewStore.setRawTraceLimit(200)
    └── agentMemoryViewStore.fetchMemoryView(agentId="agent-123", includeRawTraces=true, rawTraceLimit=200, conversationLimit=200)
        ├── utils/apolloClient.ts:getApolloClient()
        ├── graphql/queries/agentMemoryViewQueries.ts:GET_AGENT_MEMORY_VIEW
        └── apolloClient.query({ query, variables })
            └── agentMemoryViewStore.applyMemoryView(payload)
```

Expected outcome:
- Raw traces are re-fetched with the new limit.
- Other tabs remain consistent with the returned payload.

## Use Case 8: Search Filter in Memory Index

```
components/memory/MemorySidebar.vue:onSearch(query="agent-2025")
└── agentMemoryIndexStore.setSearch(query="agent-2025")
    └── agentMemoryIndexStore.fetchIndex(search="agent-2025", page=1, pageSize=50)
        ├── utils/apolloClient.ts:getApolloClient()
        ├── graphql/queries/agentMemoryIndexQueries.ts:LIST_AGENT_MEMORY_SNAPSHOTS
        └── apolloClient.query({ query, variables })
            └── agentMemoryIndexStore.applyIndex(payload)
```

Expected outcome:
- Sidebar list updates to matching agent ids.
- Selection remains even if not present; sidebar shows “Manual selection” chip if out of list.

## Use Case 9: Pagination in Memory Index

```
components/memory/MemorySidebar.vue:onNextPage()
└── agentMemoryIndexStore.setPage(page=2)
    └── agentMemoryIndexStore.fetchIndex(search=currentSearch, page=2, pageSize=50)
        ├── utils/apolloClient.ts:getApolloClient()
        ├── graphql/queries/agentMemoryIndexQueries.ts:LIST_AGENT_MEMORY_SNAPSHOTS
        └── apolloClient.query({ query, variables })
            └── agentMemoryIndexStore.applyIndex(payload)
```

Expected outcome:
- Sidebar updates to next page of memory entries.
- Selected agent remains even if not on the page; sidebar marks it as manual selection.

## Separation of Concern Validation
- Page owns layout and wiring of stores.
- Sidebar only emits selected id + search inputs.
- Index store owns list fetching and search state.
- View store owns memory view fetching and state.
- Inspector only renders data and tab selection.
- GraphQL query definitions are isolated in `graphql/queries`.
