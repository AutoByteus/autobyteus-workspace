# Investigation Notes

## Scope

- Ticket: `json-file-persistence-sync-parity`
- Date: `2026-03-03`
- Triage: `Medium`

## Baseline Verified On `personal`

1. Sync behavior is active and functional for:
   - `prompt`
   - `agent_definition`
   - `agent_team_definition`
   - `mcp_server_configuration`
2. `NodeSyncService` currently exports and imports all four entity types.
3. Selective sync dependency expansion currently includes prompt family dependency through agent prompt mapping.

## Current Persistence Snapshot

1. Agent definitions are file-backed JSON array records (`definitions.json`) via `FileAgentDefinitionProvider`.
2. Agent team definitions are file-backed JSON array records (`definitions.json`) via `FileAgentTeamDefinitionProvider`.
3. MCP configs are file-backed JSON array records at `mcp-server-configs.json`.
4. Prompts are managed via prompt service/model and synchronized as first-class `prompt` entities.

## Confirmed Requirement Corrections

1. No YAML for agent/team.
2. Prompts remain Markdown files (`prompt-vN.md`) in agent folders.
3. MCP file is global under data directory root: `<data-dir>/mcps.json`.
4. No `<data-dir>/persistence/` folder requirement for MCP.
5. Existing synchronization capability should be preserved, not dropped.

## Implications For Design Stage

1. Agent/team model can move to per-folder JSON (`agent.json`, `team.json`) without reducing sync scope.
2. Prompt synchronization should be represented through agent-level prompt version payloads instead of standalone prompt DB entities.
3. Node sync selection logic must keep dependency safety for team-to-agent and agent-to-prompt-version coverage.

## Re-Entry Investigation (Schema/Legacy Cleanup)

1. Runtime default profile is `file`, and agent/team/prompt provider registries already resolve to file implementations only (including `sqlite`/`postgresql` aliases).
2. `NodeSyncService` no longer persists tombstones; bundle export always returns `tombstones: {}` and import path does not apply persisted tombstones.
3. Dormant Prisma models remain for migrated domains:
   - `AgentDefinition`
   - `AgentPromptMapping`
   - `Prompt`
   - `AgentTeamDefinition`
   - `McpServerConfiguration`
   - `SyncTombstone`
4. Remaining active SQL-capable domains are outside migrated definition scope:
   - `TokenUsageRecord`
   - `AgentArtifact`
   - external-channel reliability/binding models (`ChannelBinding`, idempotency keys, receipts, delivery events)
5. MCP legacy SQL artifacts still exist in code/tests:
   - SQL provider/repository source files
   - SQL integration tests and converter tests
   even though runtime service path uses file provider (`mcps.json`).

## Re-Entry Investigation (Prompt File-Persistence Mismatch)

1. Live Docker verification shows standalone prompt CRUD still writes legacy JSON:
   - `<data-dir>/memory/persistence/prompt-engineering/prompts.json`
   - records still include `parentId`, which conflicts with the current requirement.
2. Agent JSON persisted by create/update still includes legacy metadata keys:
   - `systemPromptCategory`
   - `systemPromptName`
   These should not be persisted in canonical `agent.json`.
3. Agent creation path currently does not materialize prompt markdown files:
   - missing `agents/<agent-id>/prompt-v1.md` for newly created agents.
4. Personal Docker fixture seeding script still uses prompt GraphQL mutations (`createPrompt` / `updatePrompt`) and system-prompt metadata in agent mutation payloads, which reintroduces legacy persistence shape.
5. Frontend agent create/edit flow still depends on prompt category/name selection and GraphQL fields tied to standalone prompt entities, which is inconsistent with file-first prompt persistence.

## Re-Entry Investigation (MCP Agent-Tool Wrapper Redundancy)

1. MCP persistence is now file-first (`<data-dir>/mcps.json`) and MCP management already has a clear frontend/API path (`previewMcpServerTools`, `configureMcpServer`, `discoverAndRegisterMcpServerTools` in GraphQL).
2. Runtime MCP agent-tool wrappers duplicate this behavior for AI-agent callers and are no longer needed for in-scope persistence/management workflows.
3. Keeping MCP wrappers increases runtime tool-surface and maintenance burden without adding required capability beyond existing settings UI/API flows.
4. Safe removal boundary is isolated:
   - remove MCP wrapper group from `startup/agent-tool-loader`,
   - delete wrapper registration + wrapper tool modules under `src/agent-tools/mcp-server-management`,
   - prune wrapper-only unit tests under `tests/unit/agent-tools/mcp-server-management`.
5. Server-side MCP services and GraphQL resolvers must remain intact so frontend MCP preview/save/discover behavior remains unchanged.

## Re-Entry Investigation (Frontend Prompt Navigation Regression)

1. Frontend route `/prompt-engineering` still exists (`autobyteus-web/pages/prompt-engineering.vue`), so prompt UI entrypoint was not removed at routing level.
2. Primary navigation definitions in both:
   - `autobyteus-web/components/AppLeftPanel.vue`
   - `autobyteus-web/components/layout/LeftSidebarStrip.vue`
   no longer include a prompt-related nav item key/label/route.
3. Regression cause: earlier cleanup removed the Prompts menu entry from nav arrays/switch statements rather than only removing deprecated agent-tool wrappers.
4. Scope impact is frontend-only navigation wiring; no backend model/API/provider change is required.
5. Local fix boundary:
   - re-add prompt nav item in both primary nav components,
   - route target `/prompt-engineering`,
   - ensure active-state detection and key typing include the prompt nav key.

## Re-Entry Investigation (Prompt Engineering Empty List Regression)

1. Prompt Engineering UI `Reload` path calls GraphQL `prompts` query (standalone prompt domain), not agent-local `prompt-vN.md` file discovery.
2. Server prompt resolver was intentionally replaced with deprecated stubs:
   - `prompts` returns `[]`
   - `promptDetails` returns `null`
   - create/update/revision/activate mutations throw deprecation errors
3. This change removed user-visible prompt CRUD/list behavior even though prompt persistence provider and prompt service are still implemented and file-backed.
4. Personal Docker fixture seeding currently creates only agents + team; it does not create standalone prompt records, so Prompt Engineering appears empty after startup.
5. Fix boundary:
   - restore GraphQL prompt resolver to use `PromptService`,
   - keep file-backed prompt persistence path,
   - extend fixture seeding to ensure deterministic initial prompt records for Professor/Student fixtures.

## Re-Entry Investigation (Prompt Activation -> Agent Effective Version Regression)

1. Prompt activation (`markActivePrompt`) currently updates only standalone prompt records; no linked-agent propagation occurs.
2. Agent runtime prompt resolution is file-based (`agents/<agent-id>/prompt-vN.md` using `agent.activePromptVersion`), so missing propagation causes stale runtime behavior.
3. Agent↔prompt-family association persistence path (`agent-definition/prompt-mappings.json`) exists in providers/domain but is no longer being populated in current create/update flows.
4. Because prompt mappings are absent, marking a prompt active cannot determine which agents should adopt the new active version.
5. Fix boundary:
   - restore/maintain agent↔prompt-family mapping population for new agent definitions (default bind to latest active prompt when explicit family is absent),
   - make `markActivePrompt` propagate active version/content to linked agents (`activePromptVersion` + `prompt-vN.md` write),
   - keep per-agent override out of scope for this cycle.
