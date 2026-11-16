# Investigation Notes

## Investigation Meta

- Package identifier: `search-memory-default-tool-496`
- Request / ticket: Project Task `autobyteus-496`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/search-memory-default-tool-496`
- Resolved base remote / branch / revision: `origin/personal` @ `1e8b6e5d0abb4ec7f64f7939725e08c94dacfbdc` (fetched 2026-11-16)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from the fresh `origin/personal`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: requirements gate `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-16); for design, see design-spec.md
- Investigation status: complete for requirements and design

## Initial Request And Clarifications

- Original request: Task autobyteus-496 (description plus the founder's decision comment, 2026-11-16): make `search_memory` a default tool for every agent; investigate default tools, autobyteus-324, privacy, prompt/cache cost, the off switch, the semantic/reflection folders and runtime compatibility; implement it as a small change; do not ship a leak of the founder's private data; tell the PM; releases only on his word.
- Clarifications received: none needed.
- User-supplied facts and constraints: privacy first; choices within the direction (default on with a per-agent off switch, minimal prompt text, no change to running conversations' prompts) are the team's.
- Initial ambiguity: what "no change to running conversations' prompts" means given autobyteus-324's notices. Resolved in DEC-004: no system-prompt text; one notice at restore.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts` | Default tools today | IN-001 | — |
| 2026-11-16 | Code | `src/agent-execution/shared/runtime-agent-tool-exposure.ts` and its callers (grep `resolveRuntimeAgentToolExposure`) | Where tools are decided for all runtimes | IN-002 | — |
| 2026-11-16 | Doc | `docs/modules/tool_list_updates.md` | autobyteus-324 | IN-003 | — |
| 2026-11-16 | Data | `grep -rl search_memory` over `autobyteus-agents`, `autobyteus-private-agents`, `~/.autobyteus/server-data/agents` agent-config.json | Who has the tool | IN-004 | — |
| 2026-11-16 | Code/Doc | `src/memory-search/**`, `docs/modules/memory_search.md`, `src/agent-tools/memory/**`, `src/agent-tools/mcp/providers/memory-tools-mcp-adapter-provider.ts` | What a search returns | IN-005, IN-006, IN-007 | — |
| 2026-11-16 | Data | `sqlite3 -readonly ~/.autobyteus/server-data/memory-search/memory-search.sqlite` (counts only) | What the index holds | PR-001 | — |
| 2026-11-16 | Doc/Code | `docs/modules/agent_memory.md` § Semantic Memory; `.claude/skills/reflection/SKILL.md` | Semantic/reflection folders | IN-009 | — |
| 2026-11-16 | Code | `src/built-in-agents/**`, `src/agent-definition/providers/agent-definition-config.ts` | Built-ins and config fields | IN-010 | — |
| 2026-11-16 | Code | `src/agent-tools/mcp/agent-tool-mcp-session.ts`, `autobyteus-agent-run-backend.ts` `applyDefinitionTools`, `autobyteus-ts/src/agent/agent.ts` `replaceTools` | Running runs, native kept instances | IN-011 | — |
| 2026-11-16 | Code | `src/embeddings/embedding-index.ts` `nearest` | Meaning filter | IN-007 | — |
| 2026-11-16 | Code | `src/standalone-application-host/start-standalone-application-host.ts` | Definition service per host | IN-013 | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Run creation/restore | The backend resolves the exposure from `definition.toolNames` (+ native defaults; + automatic collaboration tools for members) | Tool only when listed | IN-001, IN-002 | High (Read) |
| BEH-002 | Contract | `search_memory` call | `MemorySearch.search(query, {limit, askingRunId})` over every indexed run except the asking one | Node-wide | IN-005 | High (Read + Measured PR-001) |
| BEH-003 | Contract | Explicit listing | As BEH-002 | — | IN-004 | High |
| BEH-004 | Contract | Search outcome | `wordsNotFound` by `hasChunk` over the whole index | Node-wide oracle | IN-007 | High (Read) |
| BEH-005 | System | Config | No switch | — | IN-010 | High |
| BEH-006 | System | Definition change / restore | autobyteus-324 paths | Live apply; notice | IN-003 | High (Read) |

## Relevant Codebase And Technical Facts

| ID | Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Design Implication |
| --- | --- | --- | --- | --- |
| IN-001 | `autobyteus-runtime-tool-exposure.ts` | Native-only defaults: `run_bash`, `read_file`, `edit_file`, `write_file`, prepended to `toolNames`. No switch. | The platform has a default-tool precedent, but native-only | The new default must be in the shared rule, not the native list |
| IN-002 | `runtime-agent-tool-exposure.ts` | `buildRuntimeAgentToolExposure(names, ctx)` is the one rule for all runtimes: configured names + automatic collaboration tools (`send_message_to`, `delegate_task`, `get_handoff_rules` for Team members). Callers: native factory (create + `exposureOf`), Claude bootstrapper/backend, Codex bootstrapper/backend, AGY factory/backend, ACP (Grok, DeepSeek) factory/backend. Placeholders `buildRuntimeAgentToolExposure([])` in restore context and the Codex context are replaced at bootstrap. | One place reaches every runtime (DEC-009) | Add the default and the scope to this rule |
| IN-003 | `docs/modules/tool_list_updates.md` | On a definition change: native `Agent.replaceTools` (live), Claude/AGY session replace (live), Codex/Grok reopen at next turn. A seen-tool-names record per run; a restored run whose tools differ hears "Your tools changed. Now available: …" with its first input. | REQ-008 needs no new delivery path | Exposure equality must include the scope so a scope-only change is applied |
| IN-004 | Package configs | `search_memory` listed in: `autobyteus-agents/agents/{project-task-manager,deep-researcher,agent-package-creator}`, `agent-teams/marketing-team/agents/marketing-content-creator`, `agent-teams/article-writing-team/agents/article-writer` (5 of 106 public configs, excluding a ticket eval copy); 0 of 57 private; 0 built-in | Existing node-wide users to preserve | — |
| IN-005 | `memory-tool-manifest.ts`, `memory-native-tools.ts`, MCP adapter | Native tool: `askingRunId = this.agentId`; MCP: `session.owner.runId`. Both call `getMemorySearch().search` with no scope | — | Both entry forms gain a scope |
| IN-006 | `memory-search-models.ts` `MemoryRun` | The run record holds names, workspace, runtime, subject; the definition ID only on `AGENT` subjects. Discovery has the definition ID for every attributed kind: `metadata.agentDefinitionId` / task metadata / catalog row (agents), `configuredPlacement.agentDefinitionId` (team and Org members), `member.agentDefinitionId` (task teams); folder-only runs have none | Own scope is possible | Add `agentDefinitionId` to `MemoryRun`; records are rewritten by every full/catchUp pass (`findRunsStep` upserts all) and by a full find when a new run appears |
| IN-007 | `memory-search-service.ts`, `memory-search-store.ts`, `embedding-index.ts` | Text: `textCandidates(fts, 4000)` over all chunks, then filter. Meaning: `nearest(collection, query, {limit: 300})` sorts all fresh vectors then slices. `hasChunk` checks the whole index. | A filter applied after the caps drops own runs; `wordsNotFound` leaks | The scope filter goes inside the SQL queries and inside `nearest` before the slice |
| IN-008 | `memory-tool-contract.ts` | Description ≈1,400 characters (1,504 source characters including quotes), plus a 2-parameter schema | Cost per call ≈ 330 + 60 tokens | Trim to ≤ 900, scope-neutral |
| IN-009 | `agent_memory.md` § Semantic Memory; reflection skill | Semantic memory is per definition, opt-in (`semanticMemoryEnabled` in agent-config.json or a personal setting); off by default; adds a prompt section when on. The reflection skill writes `<semantic memory>/reflections/`, else `<workspace>/reflections/`. 4 public agents enable it. | The PM's premise "already reaches agents without package configuration" holds only through the personal setting | DEC-007: unchanged; FU-003 |
| IN-010 | `agent-definition-config.ts`; `built-in-agents/` | Config booleans `internal` and `semanticMemoryEnabled` are read tolerantly and written only when true; `mergeAgentConfigRecord` keeps unknown keys. Built-ins: Daily Assistant and Model Router (`internal: true`); templates replace their files at each start. | A file-only boolean has a precedent | `memorySearchEnabled` written only when false |
| IN-011 | `AutoByteusAgentRunBackend.applyDefinitionTools`; `Agent.replaceTools` | On a changed exposure it builds the tools again and `replaceTools` keeps the existing instance of every name that stays | A native scope change would leave the old scope in the kept instance (AC-009) | The native tool must read its scope from run-owned current state |
| IN-012 | Package skills | PM: "before you ask the user something he may already have told an agent, call `search_memory`". agent-package-creator: "how an agent or team behaved in real runs … the journals are the user's private data, so read them in place and quote nothing". marketing-content-creator: past runs. | Node-wide is their purpose | DEC-002 |
| IN-013 | `start-standalone-application-host.ts` | Its own `HostDefinitionServices` instance, not `AgentDefinitionService.getInstance()` | A tool must not read definitions through the global singleton | Resolve the scope where the run's definition is already known (exposure), not inside the tool |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `memory-search.sqlite` `runs.record` JSON (derived, disposable); `agent-config.json` (new optional key); the `search_memory` tool result (new `scope` field).
- Readers and writers: the memory search store and discovery; agent definition providers; the native tool and the MCP adapter.

### Structural Surfaces

- Shared tool exposure (`RuntimeAgentToolExposure`), carried in the MCP session record and in the native backend.
- The memory search public boundary `MemorySearch.search` options.
- `EmbeddingIndex.nearest` options.

### Potential Structural Impacts To Investigate

- API or external-contract change: tool result gains `scope`; the description changes. The GraphQL `memorySearch` is unchanged.
- Persistence schema: no SQLite schema change (JSON record field); config key optional.
- Security or privacy boundary change: yes, new scope boundary (fail closed).
- Concurrency or lifecycle change: the native scope must follow definition changes (IN-011).
- Deployment or migration: none (disposable index, rewritten at start).

## Runtime, Probe, Or Reproduction Findings

| ID | Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- | --- |
| PR-001 | `sqlite3 -readonly memory-search.sqlite`: runs grouped by org/team/agent; `files` per team; `chunk_text MATCH 'bible'` grouped by run | What a node-wide search reaches | 3,956 runs indexed, among them Daily Assistant (166 + 15 + 2), Bible Study Group (study_leader 16, careful_reader 12, context_guide 12), Job Search Application Team, AudioTranscriber 54, Kids Coloring Story Team. Journal files are indexed for 416 files; Daily Assistant has 4 runs with 8 files. A text search for "bible" matches 2 Daily Assistant runs (besides solution_designer, PM, agent-package-creator). The Bible Study runs have no indexed journal file today (the reason was not investigated). | Measured | A node-wide default would hand pointers and snippets into the founder's private Daily Assistant journals to any agent. A Rebuild may index Bible Study journals too. | Command in this row; read-only, counts and names only, no content read |
| PR-002 | Count of the description text | Prompt cost | ≈1,400 characters today | Measured | REQ-007 limit | `memory-tool-contract.ts` |

- Temporary diagnostics: none.
- Reproduction for implementation to start from: none (new behavior). AC-002/AC-003 are the failing tests to write first.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (via PM, his words) | Every agent sees what happened before; never expose his private data; do it now, simple | Direct | REQ-001, REQ-002 | FU-001 (explicit node-wide agents) |
| PM | Per-package tool lists do not scale (autobyteus-agents-99: 34 + 18 files) | Strong | REQ-001 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| MCP `tools/list` / `tools/call` | Agent Tools MCP server | Follows the session exposure | agent_tools_mcp_server.md | None |
| Provider prompt cache | Anthropic/OpenAI | Tools are part of the cached prefix | Provider behavior | One cache miss per restored run |

## Persisted Data And State Facts

- Affected stored subject: `memory-search.sqlite` `runs.record` (JSON) and `agent-config.json`.
- Location and shape: `<app data>/memory-search/memory-search.sqlite`; `{"runKey", "memoryDir", "runId", "agentName", …, "subject"}`.
- Approximate volume: 3,956 run records on the founder's node.
- Current readers and writers: `MemorySearchStore.upsertRun` / `listRuns`; JSON parsed as `MemoryRun`; extra/missing fields tolerated by `JSON.parse`.
- Required semantics: a record without `agentDefinitionId` is treated as unknown (excluded from own scope).
- Acceptable loss: none needed; records are refreshed by the catch-up at server start.
- Privacy constraint: fail closed.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` | Solution Designer | Follow-ups FU-001…FU-003 | Outside this ticket | — | Current | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Team/Org member records carry the same definition ID that the member run is created with | Own scope across run kinds | Implementation test (design § Verification) | Open |
| RSK-001 | Risk | Agents with shell or file tools can read any journal file directly | Not a search issue; the existing file-access model | Out of scope; stated in the report to the PM | Accepted |
| RSK-002 | Risk | Until the first catch-up after the upgrade, own-scope searches find nothing (records lack the field) | A short window | Fail closed; catch-up runs at start | Accepted |

## Architecture Investigation Findings

- The exposure is resolved where the definition is known: native factory `createAgent` and the `exposureOf` used by `applyDefinitionTools`; every MCP runtime's bootstrapper and `applyDefinitionTools`. The MCP session holds `runtimeExposure` and `replaceForRun` replaces it as one frozen object, so an MCP adapter reading `session.runtimeExposure` at call time is always current (IN-002, IN-003).
- Native: the backend holds `this.toolExposure` and updates it after `replaceTools`; the kept tool instance cannot see it (IN-011).
- `isSameRuntimeAgentToolExposure` compares names and flags only; a scope-only change would return `unchanged` today.
- `MemorySearchStore` keeps the runs table as JSON records; scoping by run keys can use `json_each(?)` with a JSON array parameter in SQLite.
- `EmbeddingIndex.nearest` computes every fresh vector's score before slicing; a predicate on IDs before the sort costs nothing extra.

## Requirement Implications

- The privacy measurement (PR-001) makes own-definition scope mandatory for the default (REQ-002), and the oracle finding makes REQ-003 necessary.
- The 5 explicit agents (IN-004, IN-012) make node scope a preserved behavior (REQ-004), reported to the founder (FU-001).

## Notes For Architecture Design

- Realize SCN-001 to SCN-006. Keep the scope decision in the shared exposure rule; carry it to the native tool through run-owned state and to MCP through the session's exposure; filter inside the index queries.
