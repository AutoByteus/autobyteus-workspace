# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (Design Impact ARCH-REV-001: AR-001, AR-002 resolved; AR-003, AR-004 adopted). Requirements basis SR-001; AC-003 clarified, intended behavior unchanged.
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the founder's direction (user informed: conversation message and the message to `/project_task_manager`, 2026-11-16)
- Behavior-defining supplements: none
- User approval of the design: `Not required` (the founder: "do it now"; choices within the direction are the team's)
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/search-memory-default-tool-496/investigation-notes.md`
- Authorities read (2026-11-16): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/AGENTS.md`, `TESTING.md` (test layers, choosing the path, environments)
- Project design-principle conflicts or discrepancies: none

## Current-State Read

- **Tools per run.** One rule, `buildRuntimeAgentToolExposure(names, ctx)` (`src/agent-execution/shared/runtime-agent-tool-exposure.ts:67`), turns configured names plus the automatic collaboration tools into a `RuntimeAgentToolExposure`.
  - Every runtime resolves through it: Claude, Codex, AGY, ACP (Grok, DeepSeek) via `resolveRuntimeAgentToolExposure(definition, ctx)`. Native goes through `resolveAutoByteusRuntimeAgentToolExposure`, which prepends `run_bash`, `read_file`, `edit_file`, `write_file` (IN-001, IN-002).
- **Native tools.** `resolveAutoByteusAgentTools` creates the instances. Context-bound tools (`get_project_task`, discovery and communication tools) are created bound; everything else comes from the registry (`autobyteus-agent-tool-resolver.ts:57-150`).
- **MCP runtimes.** They get the tools through the Agent Tools MCP session. The session record holds `runtimeExposure`; `replaceForRun` swaps the whole record. The `search_memory` adapter executes with `session.owner.runId` (IN-005).
- **Running runs.** Definition changes reach them through `AgentRun.applyDefinitionTools` (autobyteus-324). Native `applyDefinitionTools` compares exposures (`isSameRuntimeAgentToolExposure`), then `Agent.replaceTools`, which keeps the existing instance of every name that stays (`autobyteus-agent-run-backend.ts:162-175`; `autobyteus-ts/src/agent/agent.ts:66-86`) (IN-011).
- **Search.** `MemorySearch.search(query, {limit, askingRunId})` → `MemorySearchService.search`:
  - text candidates over all chunks, capped at 4,000;
  - meaning `nearest` over all cards, capped at 300;
  - drops the asking run;
  - `wordsNotFound` via `hasChunk` over the whole index (`memory-search-service.ts:82-104`; `memory-search-store.ts:115-135`; `embedding-index.ts:132-153`) (IN-007).
- **Run records.** `MemoryRun` records are JSON in the disposable index. Discovery knows each attributed run's definition ID but stores it only on `AGENT` subjects (IN-006).
- **Existing exposure.** Measured: the index holds the founder's private runs, and a node-wide search reaches them (PR-001).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 21 production files across existing owners (SR-003 added the two definition readers, the MCP session copy and the two placeholders, all small edits): the shared exposure rule; the native exposure, resolver, factory and backend; the memory tool contract, manifest, native tool and MCP adapter; the memory-search domain, discovery, service, store and facade; `EmbeddingIndex.nearest`; the agent definition model and config; the Model Router template; the GraphQL memory-search mapping. Plus their tests and three docs. No new subsystem, no new runtime owner, no migration.
- Architectural risk: `High`
- Risk rationale:
  - a new privacy boundary (who may see which runs) on a tool every agent gets;
  - shared contracts change: `RuntimeAgentToolExposure` (all runtimes, MCP session record), the `MemorySearch.search` options (its only public boundary), `EmbeddingIndex.nearest` options;
  - a stored record field (disposable);
  - a lifecycle concern: the native kept tool instance must follow scope changes.
- Escalation trigger: any run kind whose recorded definition ID differs from the ID its run was created with (ASM-001). Or any path that builds a `search_memory` without a scope. Either returns to the Solution Designer as a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | IN-002 (`runtime-agent-tool-exposure.ts`, all callers) | One rule for all runtimes | Put the default and its scope in that rule (D1) | — |
| Code read | IN-005, `agent-tool-mcp-session.ts:80-93`, `agent-tool-mcp-adapter.ts:34` | Adapter execute receives the session with its current `runtimeExposure` | MCP reads the scope from `session.runtimeExposure` at call time (D3) | — |
| Code read | IN-011 | Native keeps the instance by name | Native tool reads scope from run-owned current exposure (D4) | — |
| Code read | `autobyteus-agent-run-backend-factory.ts:171-262, 316, 486-512` | Create and restore both go through `buildAgentConfig`, then `createBackendFromAgent` | One place to create the per-run exposure holder | — |
| Code read | IN-007 | Caps and `hasChunk` are node-wide | Filter inside the SQL and inside `nearest` (D6) | — |
| Code read | IN-006, `run-execution-tree-shared-records.ts:36-44`, `team-run-execution-tree-location-service.ts:20,186`, `agent-org-execution-tree-location-service.ts:21`, `agent-run-metadata-types.ts:8` (after the re-base onto `a781007713`) | Definition ID available for every attributed kind | `MemoryRun.agentDefinitionId` (D5) | ASM-001 |
| Code read | IN-013 | The standalone host has its own definition services | Resolve scope where the definition is already loaded, never via a global lookup in the tool (D1) | — |
| Code read | `agent-definition-config.ts:43-91` | `internal`/`semanticMemoryEnabled` pattern; merge filter list | `memorySearchEnabled` the same way (D7) | — |
| Measurement | PR-001, PR-002 | Private runs reachable today; description ≈1,400 characters | REQ-002/003/007 | — |

## Intended Change

`search_memory` becomes a platform default in the shared tool-exposure rule, for every runtime, unless the definition sets `memorySearchEnabled: false`. The exposure carries a memory search scope:

- the agent's own definition by default;
- the whole node when the definition lists the tool explicitly.

Both entry forms (native tool, MCP adapter) read the run's current scope at call time. The search filters inside the index queries, so results, snippets, `wordsNotFound` and `note` come only from the covered runs.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-004. Areas:
  - the shared tool-exposure rule and the native exposure/backend wiring;
  - the memory tool entry forms (native, MCP) and the tool contract text;
  - the memory-search boundary, discovery, service and store;
  - the `EmbeddingIndex.nearest` filter option;
  - the agent definition model, its two config readers and the `agent-config.json` field;
  - the MCP session record's exposure copy;
  - the Model Router template;
  - the GraphQL memory-search subject mapping (field moved, output unchanged);
  - docs `memory_search.md`, `agent_tools_mcp_server.md`, `agent_definition.md`, `GLOSSARY.md` (Memory search entry).
- Derived consumers (`RuntimeAgentToolExposure` and `MemoryRun` change):
  - `isSameRuntimeAgentToolExposure`: include the scope, so a scope-only change applies.
  - MCP catalog / `enabledTools`: unchanged (names drive them).
  - MCP session copy `cloneRuntimeExposure` (`agent-tool-mcp-session-registry.ts:126-138`): copies the exposure field by field into the session the adapter reads. It must copy `memorySearchScope`, as a fresh frozen object (`Object.freeze({...scope})`), because the session's freeze is shallow. The field is required on `RuntimeAgentToolExposure` (`MemorySearchScope | null`, not optional), so any copy that leaves it out fails the typecheck (AR-001).
- Derived consumers (`AgentDefinition.memorySearchEnabled` added):
  - `agent-definition-node-reader.ts:59-60` (package, user and built-in agents, including the Model Router template) and `application-owned-agent-source.ts:96-97` (application-owned agents) build `AgentDefinition` by naming each config field. Both pass `memorySearchEnabled: config.memorySearchEnabled`, as they pass `internal` and `semanticMemoryEnabled`. Without this the switch is never read (AR-001).
  - `normalizeAgentConfigRecord` / `buildAgentConfigRecord` / `mergeAgentConfigRecord` (`agent-definition-config.ts`): read `value?.memorySearchEnabled !== false`; write the key only when false; the key is in the merge filter list, so it is rewritten from the definition.
  - In-app save: `updateAgentDefinition` clones the loaded definition (`agent-definition-edits.ts` `cloneAgent`) and patches only the edited fields, so a loaded `false` survives a save and is written back. Not a GraphQL field and not a personal setting (FU-002).
  - `createAgentDefinition` (`agent-definition-service.ts:199`): a new definition gets the default (on).
  - Seen-tool-names notice: unchanged (names only; a scope change makes no notice).
  - `toRuntimeAgentToolNameSet`: unchanged.
  - GraphQL `MemorySearchRunSubject` output: unchanged shape (`agentDefinitionId` now read from the run).
  - Memory page: unchanged (passes node scope).
  - Evaluation script (`memory-search-evaluation.ts`): passes node scope, unchanged numbers.
- Deliberately left alone:
  - the native default list `AUTOBYTEUS_DEFAULT_TOOL_NAMES` (native-only tools, a different concept);
  - search ranking and chunking (no quality-check rerun needed beyond the existing tests);
  - the seen-tool-names store and notices;
  - the editor UI and personal settings (FU-002);
  - semantic memory (FU-003);
  - node-wide behavior for explicit agents (FU-001);
  - file-tool access to journals (the existing model).
- Follow-ups: FU-001, FU-002, FU-003.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, AC-001, AC-010 | Run create/restore on any runtime | IN-001, IN-002 | Default tool added | DS-001 |
| BEH-002 | Contract | REQ-002, REQ-003, AC-002–004 | `search_memory` call | IN-005, IN-007 | Own-definition scope, filtered inside the queries | DS-002, DS-003 |
| BEH-003 | Contract | REQ-004, AC-005 | Explicit listing | IN-004 | Node scope preserved | DS-001, DS-002 |
| BEH-004 | Contract | REQ-003, AC-003 | Search outcome | IN-007 | `wordsNotFound`/`note` over covered runs | DS-003 |
| BEH-005 | System | REQ-005, REQ-006, AC-006, AC-007 | agent-config.json | IN-010 | Off switch | DS-001 |
| BEH-006 | System | REQ-007, REQ-008, AC-008, AC-009 | Restore, definition change | IN-003, IN-011 | Existing paths, plus scope in equality and the native holder | DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (with a privacy boundary)
- Current design issue found: `No`. The shared exposure rule is the right single owner for "which tools a run has". The memory search facade is the right single owner for "which runs a search covers".
- Structural triggers that fire:
  - *Several kinds or forms* (Principle 1): two entry forms (native tool, MCP adapter) and every run kind (agent run, delegated or not; team member; Org member; folder-only). Response: one scope resolved in the exposure rule and one filter in `MemorySearch`. Both forms only read the scope. Discovery derives the definition ID per kind, each in its existing branch; folder-only runs get `null`.
  - *Persisted-data transition* (Principle 5): the `MemoryRun` JSON record gains `agentDefinitionId`. Decision below.
  - *Derived data* (Principle 11): the exposure feeds equality, the MCP session and the notice. Each is listed in Change Scope. The definition ID was stored on `AGENT` subjects only. It moves to the run, so one record holds the fact once.
  - *Behavior by absence* (Principle 13): a scope must never be inferred from a missing value. `MemorySearch.search` takes a required `scope`. A record without a definition ID is excluded by an explicit rule ("covered = recorded definition ID equals the scope's"), and that rule is tested.
  - *Hidden dependency* (Principle 16): the tool must not look up definitions through `AgentDefinitionService.getInstance()` (wrong in the standalone host, IN-013). Response: the scope comes from the exposure built where the definition is loaded.
  - *Example clarity*: see Concrete Examples.
- Ruled out:
  - *Empty indirection*: no new interface or port. The native holder owns real state (the run's current exposure, written by one owner, read by the tool).
  - *Repeated coordination*: the scope rule lives in one function.
- Deliberate deviations: none.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`. The one small structural move is part of the feature: the definition ID moves from the `AGENT` subject to `MemoryRun`.
- Evidence: IN-002, IN-005, IN-007, IN-011.
- Design response: extend the existing owners as below.
- Intentional deferrals: FU-001 (explicit node-wide exposure; the founder's decision).

## Terminology

- **Memory search scope:** which runs one search covers. `node` means every run on this node. `agentDefinition` means the runs of one agent definition: agent runs (delegated or not), team members and Org members whose recorded definition ID equals it. In both, the asking run is left out. GLOSSARY "Memory search" gains one sentence: "An agent's own `search_memory` covers its own definition's runs unless its definition selects the tool, which covers the whole node."
- **Platform-given tool:** a tool the shared exposure rule adds without a `toolNames` entry (the collaboration tools before; now `search_memory`).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the unbound native `search_memory` creation through the generic registry path, for runs. The registry definition stays, because the agent editor's tool picker and `toolNames` validation list it. Runs always get the bound tool (like `get_project_task`, `autobyteus-agent-tool-resolver.ts:126-131`).
- `MemoryRunSubject` `AGENT.agentDefinitionId` moves to `MemoryRun.agentDefinitionId` (clean cut; records are rewritten by the next pass).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subjects:
  - (1) `memory-search.sqlite` `runs.record` JSON; 3,956 records on the founder's node;
  - (2) `agent-config.json` files (163 package configs + built-ins).
- Change:
  - (1) records gain `agentDefinitionId`, and the `AGENT` subject loses it;
  - (2) optional key `memorySearchEnabled: false`.
- Readers and writers:
  - (1) `MemorySearchStore.listRuns` parses JSON as `MemoryRun`. `findRunsStep` upserts every found run on every `full`/`rebuild`/`catchUp` pass and on a live pass that meets a new run (`memory-index-pipeline.ts:260-279`). The server start runs `catchUp` whenever the index was built.
  - (2) `normalizeAgentConfigRecord` reads tolerantly; `buildAgentConfigRecord`/`mergeAgentConfigRecord` write.
- Required semantics under direct use:
  - (1) a record without `agentDefinitionId` is read as `undefined` → treated as unknown → excluded from `agentDefinition` scope (fail closed). An old `AGENT` subject with an extra `agentDefinitionId` is an ignored extra field until rewritten. The GraphQL subject for such a record shows `agentDefinitionId: null` until the catch-up rewrites it, at most one pass.
  - (2) an absent key means on, so existing files need nothing.
- Decision:
  - (1) `Discard or Rebuild` by the existing catch-up (the index is disposable, the records are derived);
  - (2) `Not Affected` / `Directly Usable — No Migration`.
- Rationale: there is no migration machinery for a derived, disposable index that the next start rewrites. Fail-closed covers the gap.
- Supports: REQ-002 (DEC-008), REQ-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-005 | Run create/restore on a runtime backend | Tool present with its scope (native instance / MCP session) | Shared exposure rule | Where "has the tool, which scope" is decided once for every runtime |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | Agent calls `search_memory` (native or MCP) | Tool result with `scope` | `MemorySearch` facade | The privacy boundary |
| DS-003 | Bounded Local | BEH-002, BEH-004 | `MemorySearchService.search` with a run-key set | Results + `wordsNotFound` | `MemorySearchService` | Filtering before the caps; the oracle |
| DS-004 | Return-Event | BEH-006 | Definition change signal | Run's exposure replaced; next call uses the new scope | `ToolListUpdateService` → `AgentRun.applyDefinitionTools` | Narrowing applies on every runtime, including native kept instances |

## Primary Execution Spine(s)

- DS-001: `Runtime backend factory/bootstrapper (loads definition) -> resolveRuntimeAgentToolExposure(definition, ctx[, nativeDefaults]) -> RuntimeAgentToolExposure {requestedToolNames ∋ search_memory, memorySearchScope} -> native: resolveAutoByteusAgentTools creates the bound SearchMemoryTool reading the run's exposure holder | MCP: AgentToolMcpSessionService.activateForRun(runtimeExposure) -> catalog enables the search_memory adapter`
- DS-002: `Agent tool call -> SearchMemoryTool._execute (native: holder.current.memorySearchScope, agentId) | MemoryToolsMcpAdapterProvider.execute (session.runtimeExposure.memorySearchScope, session.owner.runId) -> executeSearchMemoryTool(raw, askingRunId, scope) -> MemorySearch.search(query, {limit, askingRunId, scope}) -> MemorySearchService.search -> store/embeddings (filtered) -> tool result {scope, results, coverage, wordsNotFound, note}`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each backend already loads the run's definition and resolves its exposure. The rule adds `search_memory` and decides its scope from the same definition: listed means node, else on unless switched off, scoped to the definition. Native builds a bound tool that reads the run's current exposure; MCP enables the existing adapter by name. | Definition, exposure, tool | Shared exposure rule | Native exposure holder |
| DS-002 | Both entry forms parse the arguments, take the asking run and the scope from the run's current exposure, and call the facade. The facade passes the scope to the service and composes `coverage`/`note` from the scoped outcome. Under `agentDefinition` scope, `coverage` carries no node-wide counts: the two count sentences (`memory-search.ts:125`, `:143`) become "Indexing in progress." and "The meaning index is being built."; the other coverage sentences name no runs or counts and stay. Node scope keeps today's text (AR-002). The tool result names the scope. | Query, scope, runs, matches | `MemorySearch` | Secret masking (unchanged) |
| DS-003 | The service turns the scope into the set of covered run keys from the stored run records, minus the asking run. It queries text candidates, meaning neighbours and per-term existence restricted to that set, then orders as today. An empty set returns no results, and every term counts as not found. | Run-key set | `MemorySearchService` | Store, embedding index |
| DS-004 | A definition save signals; the service calls `applyDefinitionTools`. The exposure differs, by names or by scope only. MCP backends replace the session; native writes the new exposure into the run's holder first, then replaces the tools, so a narrowing applies to any call from then on and a newly added instance never reads `null` (AR-003). If `replaceTools` throws, the holder is already the newer exposure, which fails closed for a narrowing. | Exposure | Each backend | Seen-names notice (names only) |

## Spine Actors / Main-Line Nodes

Runtime backends (factory, bootstrapper, `applyDefinitionTools`); the shared exposure rule; the native tool resolver; the Agent Tools MCP session; `SearchMemoryTool` / `MemoryToolsMcpAdapterProvider`; `executeSearchMemoryTool`; `MemorySearch`; `MemorySearchService`; `MemorySearchStore`; `EmbeddingIndex`.

## Ownership Map

- **Shared exposure rule** (`runtime-agent-tool-exposure.ts`): owns which tools a run has and the memory search scope (one function, `memorySearchScopeOf(definition)`).
- **Native backend**: owns the run's current exposure. It writes the holder at creation and in `applyDefinitionTools`.
- **`SearchMemoryTool` / MCP adapter**: entry-form translation only. They read the scope and asking run, call `executeSearchMemoryTool` and map errors. They never decide a scope.
- **`MemorySearch`** (facade, the only public boundary): accepts a required scope; composes `coverage`/`note`.
- **`MemorySearchService`**: owns the covered-run set and the search sequence.
- **`MemorySearchStore`**: owns SQL, filtered by a run-key set.
- **`EmbeddingIndex`**: owns nearest-neighbour selection, with an optional id predicate applied before ordering and limit.
- **`MemoryRunDiscovery`**: owns the run records, including `agentDefinitionId`.
- **Agent definition config**: owns reading and writing `memorySearchEnabled`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SearchMemoryTool` (native), `MemoryToolsMcpAdapterProvider` | `executeSearchMemoryTool` → `MemorySearch` | The two runtime entry forms | Any scope decision or default |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Runs creating the unbound `SearchMemoryTool` via `defaultToolRegistry.createTool("search_memory")` | Every run needs its scope bound | `createBoundSearchMemoryTool(...)` in the resolver, special-cased like `get_project_task` | The registry definition stays for the picker and validation |
| `agentDefinitionId` in `MemoryRunSubject` `AGENT` variant | One fact, one place | `MemoryRun.agentDefinitionId` | The GraphQL mapping reads the run; output unchanged |
| `askingRunId?` optional with no scope in `MemorySearchOptions` | Scope must be explicit | `scope` required; `askingRunId` stays as is | All callers updated: tool, GraphQL (node), evaluation (node) |

## Return Or Event Spine(s) (If Applicable)

DS-004 above.

## Bounded Local / Internal Spines (If Applicable)

DS-003, parent `MemorySearchService`:

`scope -> covered run keys (stored records, minus the asking run) -> textCandidates(fts, 4000, keys) -> nearest(cards, query, {limit: 300, acceptId: key ∈ keys}) -> interleave -> matches -> hasChunk(term, keys) per term`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Native run exposure holder | DS-001, DS-004 | Native backend | Holds the run's current `RuntimeAgentToolExposure`; the backend replaces it; the bound tool reads `memorySearchScope` | `replaceTools` keeps instances by name | A stale scope after narrowing (privacy) |
| Card-id → run-key parsing | DS-003 | `MemorySearchService` | Existing `parseCardId`, reused for the predicate | — | — |

## Ownership Boundaries

- Only the shared exposure rule decides whether a run has `search_memory` and with which scope. Backends pass the definition. The native wrapper only adds its native defaults.
- Only `MemorySearch.search` is called from outside `src/memory-search` (unchanged rule). The scope type lives in `memory-search/domain/` so the exposure module may import it (allowed: `domain/`).
- The store and embedding index know run keys and ids, never scopes or definitions.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemorySearch.search` | `MemorySearchService`, store, embeddings | Memory tool manifest, GraphQL, evaluation | A tool filtering results after the call | Extend the `scope` option |
| `resolveRuntimeAgentToolExposure` | `memorySearchScopeOf` | All backends | A backend adding `search_memory` itself | — |

## Dependency Rules

- `agent-execution/shared` → `memory-search/domain` (the scope type) and `agent-tools/memory/memory-tool-contract` (the tool name): allowed. The exposure module already imports tool contracts.
- `agent-tools/memory` → `memory-search/memory-search.ts`, `domain/`: allowed (unchanged).
- Native tool resolver → `agent-tools/memory/memory-native-tools` (`createBoundSearchMemoryTool`).
- Forbidden:
  - any tool reading `AgentDefinitionService.getInstance()` to decide a scope;
  - any caller outside `memory-search` filtering runs.
- Collaborators:
  - the native holder is created in `buildAgentConfig`, passed to the resolver (the tool's reader) and to `createBackendFromAgent` → backend (its writer), by argument;
  - `getMemorySearch()` stays the existing process-wide accessor used by the manifest (unchanged; the startup loader creates it, and a missing one throws).
- New process-wide lookups: `None`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `type MemorySearchScope = { kind: "node" } \| { kind: "agentDefinition"; agentDefinitionId: string }` | Memory search | Which runs a search covers | Explicit kind + definition ID | `memory-search/domain/memory-search-models.ts` |
| `MemorySearch.search(query, { limit?, askingRunId?, scope })` | Memory search | Search within scope | `scope` required | GraphQL and evaluation pass `{kind:"node"}` |
| `RuntimeAgentToolExposure.memorySearchScope: MemorySearchScope \| null` (required field) | Tool exposure | The run's scope; `null` iff `search_memory` is not in `requestedToolNames` | — | Included in `isSameRuntimeAgentToolExposure`; copied by `cloneRuntimeExposure` |
| `resolveRuntimeAgentToolExposure(definition: Pick<AgentDefinition,"id"\|"toolNames"\|"memorySearchEnabled">, ctx, platformToolNames?: readonly string[])` | Tool exposure | Names + scope from the definition | Definition | Native passes `AUTOBYTEUS_DEFAULT_TOOL_NAMES`; `resolveAutoByteusRuntimeAgentToolExposure` becomes a one-line call or is inlined |
| `buildRuntimeAgentToolExposure(names, ctx, memorySearchScope: MemorySearchScope \| null)` | Tool exposure | Assembles the exposure; adds `search_memory` to the names when the scope is non-null | — | Decides no scope itself (AR-004): `memorySearchScopeOf` is the only scope rule. `resolveRuntimeAgentToolExposure` passes its result; the two placeholders pass `[]` and `null`. Names containing `search_memory` with a `null` scope throw (invariant). |
| `executeSearchMemoryTool(raw, askingRunId, scope)` | Memory tool | Parse, search, shape result incl. `scope` | Run ID + scope | `scope` required; the result's `scope` is `"your runs"` or `"all runs on this node"` |
| `createBoundSearchMemoryTool(readScope: () => MemorySearchScope \| null)` | Native tool | Tool instance reading the run's current scope | — | A `null` scope at call time is a tool error `MEMORY_SEARCH_UNAVAILABLE` (cannot normally happen; loud, not a fallback) |
| `MemorySearchStore.textCandidates(fts, limit, runKeys)`, `hasChunk(phrase, runKeys)` | Index store | SQL restricted to keys | `runKeys: readonly string[] \| "all"` | `f.run_key IN (SELECT value FROM json_each(?))` |
| `EmbeddingIndex.nearest(collection, query, { limit, acceptId? })` | Embeddings | Filter before sort and slice | Item id predicate | Default: accept all |
| `MemoryRun.agentDefinitionId: string \| null` | Run record | Definition of the run | — | `null` for folder-only runs |
| `AgentDefinition.memorySearchEnabled: boolean` | Agent definition | Platform-given search on/off | — | Default `true`; config `false` only |

New interfaces or wrappers that only forward: none. The holder is state with one writer and one reader, not a port.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `MemorySearchScope` | Yes | Yes | Low | — |
| `MemorySearch.search` | Yes | Yes | Low | `scope` required |
| Store `runKeys` | Yes | Yes (`"all"` explicit) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Scope | `MemorySearchScope` (`node` / `agentDefinition`) | Yes | Yes; "scope" here is qualified by memory search (distinct from `skillScope`, `refScope`) | Low | Always use the qualified name |
| Switch | `memorySearchEnabled` | Yes; parallels `semanticMemoryEnabled` | Yes | Low | Docs say it controls the platform-given tool; explicit listing still gives it |
| Result field | `scope: "your runs" \| "all runs on this node"` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Default tools for every runtime | Shared exposure rule | Extend | Already the single rule | — |
| Live tool changes | Tool List Updates (autobyteus-324) | Reuse | Names diff and notice already exist | — |
| Bound native tools | Resolver special cases (`get_project_task`) | Extend | Same pattern | — |
| Run attribution | `MemoryRunDiscovery` | Extend | Already reads the records | — |
| Config booleans | `agent-definition-config.ts` | Extend | `internal`/`semanticMemoryEnabled` precedent | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-execution (shared + autobyteus backend) | Exposure, scope rule, native holder | DS-001, DS-004 | Backends | Extend | — |
| agent-tools/memory (+ mcp provider) | Entry forms, contract text, result `scope` | DS-002 | MemorySearch | Extend | — |
| memory-search | Scope type, filtered search, run attribution | DS-002, DS-003 | — | Extend | — |
| embeddings | `acceptId` | DS-003 | MemorySearchService | Extend | — |
| agent-definition | `memorySearchEnabled` | DS-001 | Exposure rule | Extend | — |
| built-in-agents | Model Router template | DS-001 | — | Extend | — |

## Draft File Responsibility Mapping

See Final mapping (no extraction changed it).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `MemorySearchScope` | `memory-search/domain/memory-search-models.ts` | memory-search | Exposure, tools, facade, service use one type | Yes | Yes (definition ID moved from subject to run) | A general "visibility" policy type |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RuntimeAgentToolExposure.memorySearchScope` | Yes | Yes | Low: `null` iff the name is absent (invariant tested) | — |
| `MemoryRun.agentDefinitionId` | Yes | Yes | Low | Removed from the `AGENT` subject |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/shared/runtime-agent-tool-exposure.ts` | agent-execution | Exposure rule | Adds `memorySearchScope`, `memorySearchScopeOf`, the default name, and equality; `resolveRuntimeAgentToolExposure` takes the definition (+ optional platform names) | Existing owner | `MemorySearchScope` |
| `src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts` | agent-execution | Native defaults | Pass `AUTOBYTEUS_DEFAULT_TOOL_NAMES` through the shared resolver | Existing | — |
| `src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | agent-execution | Native tools | `search_memory` special case → `createBoundSearchMemoryTool(input.readMemorySearchScope)` | Existing | — |
| `src/agent-execution/backends/autobyteus/application-agent-tools/application-agent-tool-composer.ts` | agent-execution | Native tools (application-aware) | Pass the scope reader through | Existing caller of the resolver | — |
| `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | agent-execution | Native factory | Create the per-run exposure holder in `buildAgentConfig`; pass it to the resolver (reader) and `createBackendFromAgent` (writer) | Existing | — |
| `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | agent-execution | Native backend | `toolExposure` becomes the holder; `applyDefinitionTools` writes it | Existing | — |
| `src/agent-tools/memory/memory-tool-contract.ts` | agent-tools | Contract | New ≤ 900-character scope-neutral description (Concrete Examples) | Existing | — |
| `src/agent-tools/memory/memory-tool-manifest.ts` | agent-tools | Entry-form core | `executeSearchMemoryTool(raw, askingRunId, scope)`; result `scope` | Existing | `MemorySearchScope` |
| `src/agent-tools/memory/memory-native-tools.ts` | agent-tools | Native tool | `createBoundSearchMemoryTool(readScope)`; the registry class stays for listing | Existing | — |
| `src/agent-tools/mcp/providers/memory-tools-mcp-adapter-provider.ts` | agent-tools | MCP entry | Scope from `session.runtimeExposure.memorySearchScope` | Existing | — |
| `src/memory-search/domain/memory-search-models.ts` | memory-search | Domain | `MemorySearchScope`; `MemoryRun.agentDefinitionId`; `AGENT` subject without it; `MemorySearchRunResult.agentDefinitionId` (for GraphQL) | Existing | — |
| `src/memory-search/memory-search.ts` | memory-search | Facade | Required `scope` passed to the service; `coverage` without counts under `agentDefinition` scope (AR-002) | Existing | — |
| `src/memory-search/search/memory-search-service.ts` | memory-search | Search sequence | Covered-key set; filtered queries; empty-set path | Existing | — |
| `src/memory-search/store/memory-search-store.ts` | memory-search | SQL | `runKeys` filter on `textCandidates`, `hasChunk` | Existing | — |
| `src/memory-search/runs/memory-run-discovery.ts` | memory-search | Run records | `agentDefinitionId` per kind | Existing | — |
| `src/memory-search/evaluation/memory-search-evaluation.ts` | memory-search | Evaluation | Passes `{kind:"node"}` | Existing | — |
| `src/embeddings/embedding-index.ts` | embeddings | Nearest | `acceptId` predicate before sort and slice | Existing | — |
| `src/api/graphql/types/memory-search.ts` | api | GraphQL | Passes node scope; subject `agentDefinitionId` from the run result | Existing | — |
| `src/agent-definition/domain/models.ts`, `providers/agent-definition-config.ts` | agent-definition | Model/config | `memorySearchEnabled` (default true; written only when false; in the merge filter list) | Existing | — |
| `src/agent-definition/providers/agent-definition-node-reader.ts`, `providers/application-owned-agent-source.ts` | agent-definition | Definition readers | Pass `memorySearchEnabled` from the normalized config (AR-001) | Existing | — |
| `src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | agent-tools/mcp | Session record | `cloneRuntimeExposure` copies `memorySearchScope` (frozen copy) (AR-001) | Existing | — |
| `src/agent-execution/services/agent-run-restore-context-factory.ts`, `backends/codex/backend/codex-agent-run-context.ts` | agent-execution | Placeholders | Pass `null` scope to the builder (AR-004) | Existing | — |
| `src/built-in-agents/templates/model-router/agent-config.json` | built-in-agents | Template | `"memorySearchEnabled": false` | Existing | — |

All MCP-runtime backends (Claude, Codex, AGY, ACP) need no source change beyond what the shared resolver signature requires: they already pass the definition.

## Applied Patterns (If Any)

None beyond the existing bound-tool pattern.

## Target Subsystem / Folder / File Mapping

As the Final File Responsibility Mapping; no new folders or files except tests.

## Folder Boundary Check

N/A: no new folders.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Scope rule | `memorySearchScopeOf(d) = d.toolNames.includes("search_memory") ? {kind:"node"} : d.memorySearchEnabled === false ? null : {kind:"agentDefinition", agentDefinitionId: d.id}` | Each backend appending `"search_memory"` | One rule, all runtimes |
| Native narrowing | Holder `{current}`; backend `applyDefinitionTools`: `holder.current = exposure`, then `replaceTools(...)` (AR-003); tool `_execute` reads `readScope()` | Scope captured in the tool constructor | Kept instances otherwise keep node scope |
| Filtering | `SELECT … WHERE chunk_text MATCH ? AND f.run_key IN (SELECT value FROM json_each(?)) ORDER BY bm25 LIMIT ?` | `textCandidates(…).filter(scope)` | The cap would drop own runs |
| Oracle | `wordsNotFound = terms.filter(t => !store.hasChunk(phrase(t), keys))` | `hasChunk` over the whole index | Reveals words in private runs |
| Description (≤ 900) | "Search the Work Journals of earlier agent runs (what each run did, with dates) by words and by meaning, in any language. Use it when the user or the task refers to earlier work: \"last time\", \"do you remember\", a decision, setup or file from a past conversation. Returns up to limit runs (1 to ${MEMORY_SEARCH_MAX_LIMIT}; default from the server setting, normally 10), best first: who, runId, workspace, days, a source line to cite, and matches (journalFile, lines, day, snippet; matchedWords for a text match). scope names the runs searched. Results are pointers, not facts: read a match's lines with your file tool before you answer, and cite its source. wordsNotFound names query words in no searched journal; coverage says when indexing is incomplete; with no index yet, ask the user to start it on the Memory page." | Two descriptions per scope | A scope change must not change the tool definition |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `agentDefinitionId` in both the `AGENT` subject and the run | Old records | Rejected | Records are rewritten by the catch-up; fail closed meanwhile |
| Default `scope` to node when omitted | Fewer caller edits | Rejected (behavior by absence; privacy) | `scope` required |
| Migrate index records | Fill the field now | Rejected | Catch-up rewrites; disposable index |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Domain: `MemorySearchScope`, `MemoryRun.agentDefinitionId` (move from the subject), discovery per kind, GraphQL mapping. Write the failing AC-002/AC-003/AC-004 tests first.
2. Store `runKeys`, `EmbeddingIndex.nearest` `acceptId`, service covered set, facade required `scope`; GraphQL and evaluation pass node.
3. Tool contract text, manifest `scope` param and result field, MCP adapter reading the session exposure, native bound tool.
4. Exposure rule: `memorySearchScopeOf`, default name, equality; native resolver special case; native holder in factory and backend.
5. Agent definition `memorySearchEnabled` (model, config read/write, merge filter); Model Router template.
6. Docs: `memory_search.md` (Entry Points, Public Boundary, scope; `coverage` under own scope has no counts; `wordsNotFound` counts the asking run under node scope only, since own scope does not cover it), `agent_tools_mcp_server.md` (effective set), `agent_definition.md` (field), `GLOSSARY.md`.

## Key Tradeoffs

- **Explicit listing keeps the node scope (one tool, two scopes).** It preserves existing agents. The cost is that one tool name has a scope that depends on configuration. The result's `scope` field and the docs make it visible. Narrowing is the founder's FU-001.
- **Scope on the exposure, not looked up per call.** Correct per host and current through autobyteus-324, at the cost of the native holder.
- **Notice at restore.** Existing runs get one "Now available: search_memory" line and one cache miss, in exchange for every agent having the tool at once.

## Risks

- ASM-001: if a member's recorded definition ID differs from its run's, own scope misses those runs. It fails closed (no leak), only less recall. The test covers it.
- Until the first catch-up after the upgrade, own-scope searches return nothing (RSK-002).
- Direct file access to journals stays possible for agents with shell or file tools (RSK-001; out of scope, reported).

## Guidance For Implementation

- Reproduction to start from: `None` existing. Write AC-002 (two definitions, text match only in B) and AC-003 (word only in B → `wordsNotFound`) first; they fail on today's code.
- Tests (TESTING.md: server unit/integration; both typechecks):
  - exposure rule (listed / default / off / no definition);
  - equality with a scope-only change;
  - native resolver binds the tool;
  - the native backend narrowing on `applyDefinitionTools` (AC-009);
  - MCP adapter reading the session scope;
  - memory search own vs node, `wordsNotFound`, caps (AC-004: inject a small cap or use a fixture where B dominates);
  - discovery sets `agentDefinitionId` for an agent run, a delegated run, a team member and an Org member (ASM-001);
  - config read/write/merge (AC-006), and one test that reads a real config folder through `agent-definition-node-reader` (`memorySearchEnabled: false` → definition off → exposure without `search_memory`), saves the definition through `updateAgentDefinition` with another field edited, and finds the key still `false` in the file. Same read for an application-owned agent;
  - `cloneRuntimeExposure` keeps `memorySearchScope` (activate and `replaceForRun`), and the MCP adapter's search runs with that scope;
  - `coverage` under `agentDefinition` scope while building and while the meaning index is incomplete: no numbers in the text (AC-003);
  - the builder throws on `search_memory` in names with a `null` scope; placeholders produce `null`;
  - the Model Router template (AC-007);
  - description length ≤ 900 (AC-008).
- Run on Node 22 (TESTING.md). Run `pnpm -C autobyteus-server-ts typecheck` and `pnpm -C autobyteus-web typecheck`.
- Existing tests that assert node-wide search for the tool, or the unbound native creation, must be updated to pass an explicit scope, not kept as they are.
