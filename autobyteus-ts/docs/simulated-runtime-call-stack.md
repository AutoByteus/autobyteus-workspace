# Simulated Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` network/file/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Simulation Basis

- Scope Classification: `Small`
- Source Artifact:
  - `docs/implementation-plan.md` (solution sketch)
- Referenced Sections:
  - `Solution Sketch`
  - `Dependency And Sequencing Map`

## Use Case Index

- Use Case 1: Explicit Vertex AI Search provider execution
- Use Case 2: Factory fallback selects Vertex AI Search
- Use Case 3: Vertex API failure propagation

---

## Use Case 1: Explicit Vertex AI Search Provider Execution

### Goal

- `search_web` runs successfully through Vertex AI Search when provider is explicitly configured.

### Preconditions

- `DEFAULT_SEARCH_PROVIDER=vertex_ai_search`
- `VERTEX_AI_SEARCH_API_KEY` is set.
- `VERTEX_AI_SEARCH_SERVING_CONFIG` is set with full serving config path.

### Expected Outcome

- `search_web` returns structured `Search Results:` text or a no-results fallback message.

### Primary Runtime Call Stack

```text
[ENTRY] src/tools/search-tool.ts:constructor(config?)
├── src/tools/search/factory.ts:createSearchClient()
│   ├── src/tools/search/factory.ts:read env + compute provider flags [STATE]
│   ├── src/tools/search/factory.ts:new VertexAISearchStrategy() [STATE]
│   └── src/tools/search/client.ts:constructor(strategy) [STATE]
└── src/tools/search-tool.ts:_execute(context, args)
    └── [ASYNC] src/tools/search/client.ts:search(query, numResults)
        └── [ASYNC] src/tools/search/vertex-ai-search-strategy.ts:search(query, numResults)
            ├── src/tools/search/vertex-ai-search-strategy.ts:build endpoint + payload [STATE]
            ├── [IO] axios.post(discoveryengine ... :searchLite)
            └── src/tools/search/vertex-ai-search-strategy.ts:formatResults(data) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] when API returns 200 with empty results
src/tools/search/vertex-ai-search-strategy.ts:formatResults(data)
└── returns "No relevant information found for the query via Vertex AI Search."
```

### State And Data Transformations

- Tool args -> normalized query/num_results.
- Strategy env vars -> endpoint URL + request headers/params.
- Raw Vertex response -> normalized title/link/snippet text format.

### Observability And Debug Points

- Initialization error logged in `src/tools/search-tool.ts:18`.
- Upstream non-200 status wrapped with response body for diagnosis.

### Design Smells / Gaps

- None identified; responsibility boundaries are clean.

### Open Questions

- None for implementation; runtime credentials remain operator responsibility.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No

---

## Use Case 2: Factory Fallback Selects Vertex AI Search

### Goal

- Factory chooses Vertex AI Search when Serper and SerpApi are unavailable and Vertex config exists.

### Preconditions

- `SERPER_API_KEY` unset.
- `SERPAPI_API_KEY` unset.
- Vertex env vars set.

### Expected Outcome

- `SearchClientFactory` returns client backed by `VertexAISearchStrategy`.

### Primary Runtime Call Stack

```text
[ENTRY] src/tools/search/factory.ts:createSearchClient()
├── read env vars + compute provider flags [STATE]
├── evaluate provider precedence branches [STATE]
└── instantiate src/tools/search/vertex-ai-search-strategy.ts:constructor() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if Vertex not configured and no other provider configured
src/tools/search/factory.ts:createSearchClient()
└── throw "No search provider is configured..."
```

```text
[ERROR] if no provider configured
src/tools/search/factory.ts:createSearchClient()
└── throw "No search provider is configured..."
```

### State And Data Transformations

- Environment variable set -> boolean capability flags -> chosen strategy class.

### Observability And Debug Points

- Explicit provider misconfiguration errors include missing env var names.

### Design Smells / Gaps

- None; fallback chain remains single-owner in factory.

### Open Questions

- None.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No

---

## Use Case 3: Vertex API Failure Propagation

### Goal

- Upstream Vertex failures surface as descriptive errors to callers.

### Preconditions

- Strategy created with required env vars.
- Vertex endpoint returns non-200 (or network error).

### Expected Outcome

- Strategy throws descriptive error including HTTP status and response payload.

### Primary Runtime Call Stack

```text
[ENTRY] src/tools/search/vertex-ai-search-strategy.ts:search(query, numResults)
├── [IO] axios.post(...)
└── [ERROR] src/tools/search/vertex-ai-search-strategy.ts:search()
    ├── map non-200 response to Error with status/body
    └── map axios network error to "network error occurred ..."
```

### Branching / Fallback Paths

```text
[ERROR] malformed/missing config
src/tools/search/vertex-ai-search-strategy.ts:constructor()
└── throw "requires 'VERTEX_AI_SEARCH_API_KEY' and 'VERTEX_AI_SEARCH_SERVING_CONFIG'..."
```

### State And Data Transformations

- Error payload object -> JSON string for deterministic diagnostic messages.

### Observability And Debug Points

- Failures bubble to tool initialization/execution context without silent suppression.

### Design Smells / Gaps

- None.

### Open Questions

- None.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): Yes
- Major smell detected: No
