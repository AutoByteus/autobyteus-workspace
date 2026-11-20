# Investigation Notes

## Investigation Meta

- Package identifier: `semantic-memory-for-every-agent` (autobyteus-554)
- Request / ticket: Project Task autobyteus-554, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. Description as delivered by `/project_task_manager` on 2026-11-19. `get_project_task` is scoped to the sibling autobyteus-555, so the message text is the source.
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent`, `codex/semantic-memory-for-every-agent`
- Base: `origin/personal` @ `8430d9ef12` (fetched 2026-11-19); finalization target `origin/personal`
- Current solution revision ID: `SR-001`
- Authorities read: requirements, architecture and design references (read in this conversation for 493/491); `DESIGN.md`; Data Migration Guideline (tolerant readers); `GLOSSARY.md` § Memory
- Status: complete for requirements and design

## Source Log

| ID | Type | Source | Finding |
| --- | --- | --- | --- |
| INV-1 | Command | `git grep -n -i "semanticMemoryEnabled\|SEMANTIC_MEMORY\|AgentSemanticMemoryField\|prepareForRun\|semanticMemoryPath"` | About 80 files. Source:<br>• server: `agent-definition/domain/models.ts:53-135`; `providers/agent-definition-config.ts:24,57,74,83-84`; `agent-definition-node-reader.ts:60`; `application-owned-agent-source.ts:97`; `services/agent-definition-service.ts:64,99,230,430`; `agent-definition-edits.ts:35`; `api/graphql/types/agent-definition.ts:125-129,192,246,332`; `converters/agent-definition-converter.ts:70-71`; `personal-settings/domain/personal-setting-record.ts:27,33,43,56,96`; `personal-settings/services/personal-settings-service.ts:38,47,155,198-199,246-248`; `api/graphql/types/personal-settings.ts:11`; `agent-packages/services/package-edit-capture.ts:52,60-61`; `agent-memory/services/agent-semantic-memory.ts:9-31`.<br>• web: `AgentSemanticMemoryField.vue`, `AgentDefinitionForm.vue`, `AgentDefinitionDetailSections.vue:50-52`, `stores/agentDefinitionStore.ts:55-98`, `graphql/queries/agentDefinitionQueries.ts`, `graphql/mutations/agentDefinitionMutations.ts`, `types/personalSettings.ts:6`, localization `agents.ts` (en, zh-CN).<br>• docs: `agent_definition.md`, `agent_memory.md`, `personal_settings.md`, `prompt_engineering.md`, `agent_execution.md`, `credential_proxy.md`, web `agent_management.md`, `GLOSSARY.md:193-199`.<br>• Tests: about 40 files. |
| INV-2 | Code | `AgentSemanticMemory.folderOf/prepareForRun` (`agent-semantic-memory.ts:21-33`) | The one gate: `semanticMemoryEnabled !== true` → null. Every runtime asks it at run start: Claude `claude-session-bootstrapper.ts:103-116`, Codex `codex-thread-bootstrapper.ts:213-236`, ACP `acp-agent-run-backend-factory.ts:166` (Grok and DeepSeek harness are built on the ACP factory: `grok-build-agent-run-backend-factory.ts:7,20`), Antigravity `agy-agent-run-backend-factory.ts:63`, AutoByteus `autobyteus-agent-run-backend-factory.ts:345`. The prompt section is added when the path is non-null (`carpenter-prompt-composer.ts:57-61`). Claude adds the folder as an additional directory; Codex adds it as a writable root |
| INV-3 | Code | `agent-definition-config.ts:72-87` | The writer writes the key only when on. `mergeAgentConfigRecord` drops `semanticMemoryEnabled` and the retired `selfEvolution` from the existing file, then rewrites from the definition. The precedent for dropping a retired key at the next save is already here |
| INV-4 | Code | `personal-setting-record.ts:94-127`, `personal-settings-store.ts:96-97` | A tolerant reader: an unknown field is skipped, and the store logs `PERSONAL_SETTINGS_ENTRY_SKIPPED:<key>: <fields>` at each read. It is dropped when that record is next written |
| INV-5 | Data (read-only) | `~/.autobyteus/server-data/agent-packages/personal-settings.json` | Two records carry it: `agent:agent-package-creator` (`defaultLaunchConfig`, `semanticMemoryEnabled`) and `agent:project-task-manager` (`defaultLaunchConfig`, `semanticMemoryEnabled`, `skillsAdded`). Existing folders: `memory/semantic/{agent-package-creator, computer-use-operator, project-task-manager, team-local-agent%3Aarticle-writing-team%3Aarticle-writer}` |
| INV-6 | Repo | `/Users/normy/autobyteus_org/autobyteus-agents` | Two packages carry `"semanticMemoryEnabled": true`: `agents/computer-use-operator/agent-config.json` and `agent-teams/article-writing-team/agents/article-writer/agent-config.json` |
| INV-7 | Code | built-in templates | Daily Assistant has `read_file`, `run_bash`, …; Model Router (internal, run by `ModelRouterAgent` through `createAgentRun`, `model-router-agent.ts:134`) has `read_file`, `write_file`, `edit_file`. Native AutoByteus agents get only the tools their definition lists; the other runtimes have built-in file tools |
| INV-8 | Code | `autobyteus-web/components/memory/MemoryHome.vue`, `AgentMemoryDetail.vue`, `agent-memory-explorer-service.ts:93-180` | The Memory page has the sections Browse, Search and Index. Browse has tabs; its Agents tab groups standalone runs by definition id and opens the agent's runs. Team members appear inside team runs, so a team-local agent has no Agents entry. Sources: local, and memory imported by Memory Sync (read-only) |
| INV-9 | Code | `node-files/node-file-reader.ts`, `api/rest/node-files.ts`, web `utils/fileExplorer/nodeFileContent.ts` | One read-only loader for a node file by absolute path, `GET /rest/node-files/content?path=`. Owner and paired phone are gated by the node access model. Desktop Files panel and phone viewer both use it |
| INV-10 | Code | `autobyteus-web/components/mobile/views/*` | The phone has no Memory page (Files, Activity, Messages, …). Nothing to add there |
| INV-11 | Code | `memory-sync/shared/memory-sync-path-policy.ts` | Memory Sync carries `agents/` and `agent_teams/` only. The `semantic/` folder is not synced, so imported sources have no semantic memory |

## Notes For Architecture Design

- One gate to remove (INV-2); every runtime already passes the path through.
- Clean-cut removal of the field from model, config, GraphQL, personal settings, web and docs; tolerant readers already exist (INV-3, INV-4).
- The view: a listing API confined to the folder, plus the existing node-file loader for content (INV-9).

## SR-005 feasibility: one agent's runs across every place (round 3's Episodic tab)

- INV-12 (Read, 2026-11-19): two existing owners can supply it.
  - (a) `EpisodicCatalog` (autobyteus-493) keeps each definition's entries in memory: `runId`, `memoryDir`, `root`, `startedAt`, `lastActivityAt` (`agent-episodic-catalog/services/episodic-catalog.ts:59`, `domain/episodic-catalog-models.ts:15-29`). But it covers the local node only, and it is complete only after its start pass.
  - (b) `RunFolderDiscovery` (`agent-memory/services/run-folder-discovery.ts`) is built over a memory folder. It gives every run folder with `agentDefinitionId`, `root` and the memory-search `subject` (AGENT / TEAM_MEMBER / ORG_MEMBER), which the existing inspector opens.
  - (b) works for the local source and for an imported source alike (a source's memory folder), so the design will use (b) behind a memory-explorer query. Feasible; it is no longer marked unproven.
