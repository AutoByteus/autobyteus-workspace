# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` at SR-002 (REQ-001..009, AC-001..008), approved by the User on 2026-11-10 in the Solution Designer conversation (quoted in the requirements Document Status).
- Behavior-defining supplements: None
- User approval of the design: `Not required` (the direction does not ask for it). The user was told the per-runtime write-access approach and the personal-setting decision on 2026-11-10.
- Design status: `Ready`
- Canonical investigation notes: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/investigation-notes.md` (Architecture Investigation Findings AF-01..AF-26)
- Authorities read (2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2–3, `autobyteus-server-ts/docs/design/collaboration_model.md` §3, `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` (lazy service access), `autobyteus-server-ts/docs/modules/personal_settings.md`, `agent_memory.md`, `agent_definition.md`, runtime module docs (Codex, Claude, Grok, DeepSeek harness, Antigravity), `GLOSSARY.md`, `docs/design-cases.md` (no matching case).
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- Instructions: every runtime composes them through `agent-execution/prompt/carpenter-prompt-composer.ts` (`composeSharedCarpenterPrompt` for Codex, Claude, ACP = Grok + DeepSeek harness, Antigravity; `composeNativeAutoByteusPrompt` for AutoByteus). Each backend reads the agent definition itself just before composing (AF-05, AF-07, AF-09, AF-13, AF-14). Codex, Claude and ACP recompose on restore; Antigravity composes at create only (AF-04, AF-07, AF-09, AF-13).
- Definitions: per-agent config lives in `agent-config.json` (`agent-definition-config.ts`), mapped to `AgentDefinition` by `agent-definition-node-reader.ts` (package, team-local, Org-owned, user's own) and `application-owned-agent-source.ts` (AF-22). For package and built-in agents, tools/skills/avatar/default launch edited in the app are personal settings kept outside the package files (AF-19).
- Identity: a shared team member resolves to the shared definition ID (AF-17, AF-18).
- Memory folder: `AgentMemoryLayout` owns the names of `memory/agents|agent_teams|agent_orgs`; run tooling walks only those (AF-15, AF-16).
- Write access: AutoByteus file tools accept absolute paths; Codex's default `workspace-write` sandbox refuses writes outside the workspace (reproduced AF-01, fixed by a writable root AF-02); Claude asks permission outside its working directories (AF-07); Grok and Antigravity are not sandboxed by us (AF-11, AF-13); the DeepSeek harness asks a sandbox escalation (AF-12).
- No structural problem blocks the feature; two touched files were already over 500 lines and one would cross it (Design Health).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: the change spans several subsystems: agent definitions (config, domain, readers, service), personal settings (record, service, GraphQL enum), agent memory layout plus a new owner, the instruction composer, five runtime backends (AutoByteus, Codex, Claude, ACP, Antigravity) with Codex and Claude runtime configuration, GraphQL agent definition contract, and the web form/detail/store/locales; about 25 source files plus docs.
- Architectural risk: `High`
- Risk rationale: it changes shared contracts (`agent-config.json` package contract, `personal-settings.json` file contract, GraphQL `AgentDefinition` and inputs), a security boundary (Codex sandbox writable roots and Claude working directories widen by one agent-owned folder), and every runtime's instruction path. No migration, no concurrency machinery.
- Escalation trigger: a runtime whose real run cannot write the folder with the designed configuration (AC-002), or instructions of agents without the setting differing from the base branch (AC-005), returns to the Solution Designer as `Design Impact`.

## Architecture Investigation Evidence

See investigation notes AF-01..AF-26; each decision below cites its AF ID.

| Source / Probe | Reference | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Codex sandbox probe | AF-01, AF-02 | Outside write refused; allowed with `writable_roots` | D-CODEX | App-server path validated in E2E |
| Claude SDK | AF-07, AF-08 | `additionalDirectories` exists; outside reads/writes otherwise ask permission | D-CLAUDE | E2E |
| ACP / Grok / dsh / AGY | AF-10..AF-13 | No client fs filter; Grok/AGY unsandboxed; dsh escalation | D-NOCHANGE | dsh not installed (FU-007) |
| Layout & scanners | AF-15, AF-16 | One layout owner; scanners walk run roots only | D-LOCATION | — |
| Identity | AF-17, AF-18 | Shared member → shared ID | D-KEY | — |
| Personal settings | AF-19 | Per-node user choices for package agents live there | D-PERSONAL | — |
| File sizes | AF-14, AF-20, AF-24 | 515 / 499 / 526 lines | Design Health | — |

## Intended Change

Add an optional per-agent `semanticMemoryEnabled` setting. For an agent with it on, the server owns `<memory dir>/semantic/<encoded agent definition ID>/`, creates it when a run is prepared, tells the run its absolute path in a short `## Semantic Memory` instruction section, and makes it writable in the runtimes that would otherwise refuse or prompt. The app's agent form gets a switch (a personal setting for package and built-in agents) and the detail page shows state and path.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Areas: agent definition config/domain/readers/service; personal settings (fifth setting); agent memory layout + new semantic memory owner; instruction composer; runtime wiring in AutoByteus, Codex, Claude, ACP and Antigravity backends; Codex sandbox thread config; Claude session/client options; GraphQL agent definition; web agent form/detail/store/queries/locales; docs and glossary.
- Derived consumers of changed structures (Principle 11):
  - `agent-config.json` → node reader and application-owned reader (add field); `buildAgentConfigRecord`/`mergeAgentConfigRecord` (write when on, drop when off); `fileStore.rendersDifferently` (follows the record); agent package definition store/reloader (read through the node reader, no change); package-update capture of personal edits (add field).
  - `personal-settings.json` record → tolerant reader, `apply`, `setEdited`, `reset`, update capture, GraphQL `PersonalSetting` enum, web reset handling (all extended).
  - `AgentDefinition` → GraphQL converter (new fields), composer input (via owner), agent-definition tools that echo config (`skill_scope`-style echo is not required; no change), web store type.
  - `AgentMemoryLayout` → run tooling unaffected (AF-16).
  - Codex `appServerConfig` → `sandbox_workspace_write` built by one owner (integration builder no longer emits it).
- Deliberately left alone: run memory folders and their names (user decision); memory sync, memory search, Memory page; Model Router `knowledge.md`; Grok/DeepSeek harness/Antigravity launch arguments; sandbox modes and approval policies; the AutoByteus factory and agent form beyond wiring.
- Follow-ups: FU-001..FU-004 (requirements), FU-005..FU-009 (design).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-004, REQ-005, REQ-008, REQ-009; AC-001, AC-003..AC-005, AC-008 | Run create/restore | AF-04, AF-05, AF-07, AF-09, AF-13, AF-14 | Section with path when on; identical instructions when off | DS-001 |
| BEH-002 | User | REQ-001, REQ-002; AC-007 | Package file or app form | AF-19..AF-24 | Setting read from config + personal settings; switch + detail | DS-002, DS-003 |
| BEH-003 | System | REQ-003, REQ-007; AC-001, AC-006, AC-008 | Run preparation | AF-15, AF-16 | Folder ensured, never deleted | DS-001 |
| BEH-004 | System | REQ-004; AC-004, AC-006 | Team/delegated run | AF-17, AF-18 | Same folder per definition ID | DS-001 |
| BEH-005 | System | REQ-006, REQ-008; AC-002, AC-005 | Runtime start/resume | AF-01..AF-13 | Folder writable; others unchanged | DS-001 (runtime nodes) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `follow-ups.md` | Follow-ups | — | FU-005..FU-009 found in design | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No` for the feature path; size debt in touched files.
- Structural triggers:
  - Capability-area reuse (fires): folder naming belongs to `AgentMemoryLayout` (AF-15); the per-node user choice belongs to personal settings (AF-19). Both extended, not duplicated.
  - Repeated coordination (checked): five backends each need "resolve path → compose → configure write access". The rule "enabled → ensure folder → path" has one owner (`AgentSemanticMemory.prepareForRun`); each backend calls it once because each backend is already the owner of reading its definition and of its runtime-specific configuration (AF-05, AF-07, AF-09, AF-13, AF-14). The composer requires the path in its input so no backend can forget it.
  - Behavior by absence (checked): the section appears because the owner returns a path for an enabled definition by an explicit rule (`definition.semanticMemoryEnabled`), not because a lookup failed.
  - Several kinds (fires): five runtimes traced separately (AF-01..AF-14); definition kinds (shared, team-local, Org-owned, application-owned, built-in, user's own) traced through readers and personal settings (AF-19, AF-22).
  - Persisted-data transition (fires): optional field in two JSON files → Directly Usable, no migration (AF-26).
  - Responsibility overload / size: `agent-definition-service.ts` 499 lines would cross 500 → extract `cloneAgent` and `personalEditsOf` into `agent-definition-edits.ts` now. `autobyteus-agent-run-backend-factory.ts` (515) and `AgentDefinitionForm.vue` (526) were over the limit before; new logic goes into owned files, these files get wiring only; their splits are FU-005, FU-006.
  - Shared folder, empty indirection, authoritative boundary, split sequence: do not fire (no shared/common code; the new owner holds the enable rule and folder creation; callers use only it, never the layout's semantic path method directly except the owner).
  - Vocabulary drift (fires): "semantic memory" gains its product meaning; the dead library "semantic items" remain until FU-009; the glossary entry says which is meant.
- Root cause classification: `No Design Issue Found` (feature fits existing owners).
- Refactor needed now: `Yes`, small: extract `cloneAgent`/`personalEditsOf` from `agent-definition-service.ts`; split the Codex `sandbox_workspace_write` construction out of the integration config.
- Evidence: AF-05, AF-06, AF-20.
- Design response: see file mapping.
- Intentional deferrals: FU-005, FU-006 (size), FU-008 (duplicate mapping), FU-009 (dead library code). Residual risk: none for the feature.

## Terminology

- **Semantic memory** (new GLOSSARY entry): an agent's own folder of documents for reusable knowledge, `memory/semantic/<agent>/` on the node; shared by every run of that agent definition; its contents are written and organized by the agent. Not the run's memory, and not the historical `semantic.jsonl` rows in old run folders.
- **Semantic memory folder**: the absolute path of one agent's semantic memory.
- `semanticMemoryEnabled`: the setting (config, domain, GraphQL, personal settings, web) — one name everywhere.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: `sandbox_workspace_write` emission inside `buildCodexIntegrationThreadConfig` (moved to its owner).
- Compatibility wrappers / dual paths kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subjects: (1) `agent-config.json` gains optional `semanticMemoryEnabled: true`; (2) `personal-settings.json` agent records gain optional `semanticMemoryEnabled: boolean`; (3) new folders `memory/semantic/<encoded id>/` holding agent-written files.
- Reader/writer behavior: `normalizeAgentConfigRecord` reads tolerantly; absent → false (AF-21). `readPersonalSettingRecord` skips unknown/invalid fields; absent → no personal value (AF-19). Writers emit the field only when it carries information (`true` in config; a value differing from base in personal settings).
- Decision: `Directly Usable — No Migration` (guideline §3: an optional field whose absence truthfully means "off"/"not personal").
- Data-migration checklist (§2): 1 Need: none. 2 Availability: absent field = off; a broken semantic folder affects only that agent's run start (mkdir error names the path). 3 Source shapes: current `agent-config.json` and `personal-settings.json` without the field. 4 Disposition: unchanged files stay valid. 5 Commit: existing atomic writers. 6 Current-only boundary: no old-shape code. 7 Cost: one `mkdir -p` per run preparation of an enabled agent; nothing for others. 8 References: definition ID → folder name (encoded). 9 Evidence: AC-005..AC-008 tests. 10 Lessons: no version fields, no mappings.
- The system never deletes semantic folders (REQ-007): no code path removes them; definition delete does not touch them.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 003, 004, 005 | Run create/restore (standalone, member, delegated) | Runtime started with section + writable folder | Each runtime backend (preparation) | Core promise |
| DS-002 | Primary End-to-End | BEH-002 | Agent form save | `agent-config.json` or personal record updated | `AgentDefinitionService` | Turning it on/off |
| DS-003 | Primary End-to-End | BEH-002 | Agent detail/form load | Switch state and path shown | GraphQL `AgentDefinitionConverter` | Visibility |
| DS-004 | Bounded Local | BEH-005 | Codex thread config build | `appServerConfig` | `CodexThreadBootstrapper` | One owner of `sandbox_workspace_write` |

## Primary Execution Spine(s)

- DS-001: `Run activation -> Runtime backend preparation (reads effective AgentDefinition) -> AgentSemanticMemory.prepareForRun(definition) -> carpenter prompt composer (Semantic Memory section) -> runtime-specific write access (Codex writable root / Claude additional directory) -> runtime session start/resume`
- DS-002: `AgentDefinitionForm -> GraphQL updateAgentDefinition -> AgentDefinitionService.update -> (user's own: fileStore -> agent-config.json) | (package/built-in: PersonalSettingsService.setEdited -> personal-settings.json)`
- DS-003: `Agent detail -> GraphQL agentDefinition -> AgentDefinitionConverter -> AgentSemanticMemory.folderOf(definition) -> semanticMemoryPath`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | When a backend prepares a run (create or restore), it reads the effective definition as today, asks the semantic memory owner for the folder (null when off; created when on), composes instructions with it, and, for Codex and Claude, adds the folder to the runtime's writable area. | backend, semantic memory owner, composer, runtime | backend | layout (folder name), sandbox config |
| DS-002 | A save from the form carries `semanticMemoryEnabled`. For the user's own agents it goes into `agent-config.json`; for package and built-in agents it becomes a personal value when it differs from the package's. | form, GraphQL, service | `AgentDefinitionService` | personal settings, config record |
| DS-003 | Reads expose the effective flag and the computed path (pure, no mkdir). | converter, owner | converter | layout |
| DS-004 | The bootstrapper builds `sandbox_workspace_write` once from network access (integration variables present) and writable roots (semantic folder), only for `workspace-write`. | bootstrapper, sandbox config builder | bootstrapper | — |

## Spine Actors / Main-Line Nodes

Runtime backends (AutoByteus factory, `CodexThreadBootstrapper`, `ClaudeSessionBootstrapper`, `AcpAgentRunBackendFactory`, `AgyAgentRunBackendFactory`); `AgentSemanticMemory`; carpenter prompt composer; `AgentDefinitionService`; `PersonalSettingsService`; `AgentDefinitionConverter`.

## Ownership Map

- `AgentSemanticMemory` (new): the rule "a definition with `semanticMemoryEnabled` has a semantic memory folder", the folder's path for a definition, and creating it for a run. Owns no content.
- `AgentMemoryLayout`: the folder name `semantic` and the safe, encoded per-definition path.
- Composer: section text and placement; requires an absolute path or null.
- Each backend: when to prepare (create/restore) and its runtime's write-access translation.
- `CodexThreadBootstrapper` + new `codex-sandbox-workspace-write-config.ts`: the whole `sandbox_workspace_write` object.
- `AgentDefinitionService`: create/update normalization; routes the field to files or personal settings as for the four existing settings.
- `PersonalSettingsService`: fifth personal setting `SEMANTIC_MEMORY` (field `semanticMemoryEnabled`), agents only.

## Thin Entry Facades / Public Wrappers

N/A — no facade added.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| `sandbox_workspace_write` in `buildCodexIntegrationThreadConfig` | Two builders of one key would overwrite each other (AF-05, AF-06) | `buildCodexSandboxWorkspaceWriteConfig` | Integration builder keeps `shell_environment_policy` only; its doc comment moves with the network-access rule; tests updated |
| `cloneAgent`, `personalEditsOf` inside `agent-definition-service.ts` | Size limit (AF-20) | `agent-definition-edits.ts` (moved, not changed except the new field) | — |

No dead code found in the touched files beyond FU-009 (other package).

## Return Or Event Spine(s)

N/A — no events added; definition changes are already announced by the existing definition feed and personal-settings announcements (AF-19).

## Bounded Local / Internal Spines

DS-004 (above): parent `CodexThreadBootstrapper`: `integration variables + sandbox mode + semantic folder -> buildCodexSandboxWorkspaceWriteConfig -> appServerConfig`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Folder naming/encoding | DS-001, DS-003 | `AgentSemanticMemory` | `encodeURIComponent(definitionId)` under `memory/semantic/`, safe join | Windows-safe, injective (QR-001) | Each backend inventing paths |
| Codex sandbox object | DS-004 | Codex bootstrapper | One object, both flags | Key collision | Silent overwrite |
| Claude working directories | DS-001 | Claude bootstrapper | `additionalDirectories` pass-through | Same approval as workspace | Extra prompts |
| Personal settings | DS-002 | `AgentDefinitionService` | Store per-node override | Survives package updates | Lost edits |

## Ownership Boundaries

`AgentSemanticMemory` is the only caller of the layout's semantic path; backends and the converter call `AgentSemanticMemory` only. Backends never compute the folder or check the flag themselves. Personal settings remain behind `PersonalSettingsService`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentSemanticMemory` | Enable rule, `AgentMemoryLayout.getAgentSemanticMemoryDirPath`, `fs.mkdir` | 5 backends, GraphQL converter | Backend reading `semanticMemoryEnabled` and calling the layout itself | Add a method to the owner |
| `PersonalSettingsService` | personal-settings file | `AgentDefinitionService`, readers | — | — |

## Dependency Rules

- `agent-execution/backends/*` → `agent-memory/services/agent-semantic-memory.ts` (allowed); → `agent-memory/store/agent-memory-layout.ts` for semantic paths (forbidden).
- `agent-execution/prompt` stays pure: no fs, no config access; it receives the path.
- `api/graphql/converters` → `AgentSemanticMemory.folderOf` (allowed; no mkdir from reads).
- `runtime-management/claude/client` receives `additionalDirectories` as data; it knows nothing of semantic memory.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `AgentSemanticMemory.folderOf(definition: AgentDefinition): string \| null` | one agent definition | Path when enabled, else null; pure | the definition (its `id` and flag) | Throws if an enabled definition has no ID |
| `AgentSemanticMemory.prepareForRun(definition): Promise<string \| null>` | one agent definition | `folderOf` + `mkdir -p` | same | Used by backends only |
| `AgentMemoryLayout.getAgentSemanticMemoryDirPath(agentDefinitionId: string): string` | one definition ID | `<memoryDir>/semantic/<encodeURIComponent(id)>` via `resolveSafePath` | agent definition ID | Called only by the owner |
| Composer input `semanticMemoryPath: string \| null` (required key) | one run's instructions | Render section when non-null | absolute path | Assert absolute |
| `buildCodexSandboxWorkspaceWriteConfig({ sandbox, networkAccess, writableRoots })` | one Codex thread | `{}` unless `workspace-write` and (networkAccess or roots) | — | — |
| GraphQL `AgentDefinition.semanticMemoryEnabled: Boolean!`, `semanticMemoryPath: String` | one definition | Read | definition ID | Path null when off |
| GraphQL create/update inputs `semanticMemoryEnabled: Boolean` | one definition | Write | definition ID | null/absent = unchanged on update |
| GraphQL `PersonalSetting.SEMANTIC_MEMORY` | one agent | Reset | definition ID | Agents only |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Risk | Action |
| --- | --- | --- | --- | --- |
| `folderOf` / `prepareForRun` | Yes | Yes | Low | — |
| `getAgentSemanticMemoryDirPath` | Yes | Yes | Low | — |
| Codex sandbox builder | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Setting | `semanticMemoryEnabled` | Yes | Yes (config, domain, GraphQL, personal record, web) | Low | — |
| Owner | `AgentSemanticMemory` | Yes | Yes | Low | — |
| Folder | `memory/semantic/` | Yes | Yes | Medium (old `semantic.jsonl`, library `SemanticItem`) | GLOSSARY entry; FU-009 |
| Personal setting | `SEMANTIC_MEMORY` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Folder naming under `memory/` | `AgentMemoryLayout` | Extend | Single owner of memory folder names |
| Per-node user override for package agents | Personal settings | Extend | Exactly its purpose (AF-19) |
| Instructions | Carpenter composer | Extend | All runtimes use it |
| Codex sandbox | thread config builders | Extend + split | Key collision |
| The enable rule + mkdir | — | Create New (`AgentSemanticMemory`) | No owner exists for agent-owned knowledge |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `agent-memory` | Semantic memory owner, layout name | DS-001, DS-003 | Extend |
| `agent-definition` | Field in config/domain/readers/service | DS-002 | Extend |
| `personal-settings` | Fifth setting | DS-002 | Extend |
| `agent-execution/prompt` | Section | DS-001 | Extend |
| `agent-execution/backends/*`, `runtime-management/claude` | Wiring, write access | DS-001, DS-004 | Extend |
| `api/graphql` | Contract | DS-002, DS-003 | Extend |
| `autobyteus-web` agents | Switch, detail | DS-002, DS-003 | Extend |

## Draft File Responsibility Mapping

Folded into the final mapping below (no extraction changed it beyond `agent-definition-edits.ts`).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Decision |
| --- | --- | --- | --- |
| Folder path for a definition | `AgentSemanticMemory.folderOf` | agent-memory | One derivation for runs and GraphQL (Principle 11) |
| `sandbox_workspace_write` object | `codex-sandbox-workspace-write-config.ts` | Codex backend | One builder |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AgentDefinition.semanticMemoryEnabled` | Yes | Yes (path is derived, not stored) | Low | Path is never stored |
| Personal record `semanticMemoryEnabled` | Yes (differs from base) | Yes | Low | Equal to base → removed |

## Final File Responsibility Mapping

Server (`autobyteus-server-ts/src/`):

| File | Change | Concern |
| --- | --- | --- |
| `agent-memory/services/agent-semantic-memory.ts` | Add | `AgentSemanticMemory` (`folderOf`, `prepareForRun`); lazy memory dir per startup guideline; default instance accessor |
| `agent-memory/store/agent-memory-layout.ts` | Modify | `semantic` root + `getAgentSemanticMemoryDirPath(id)` (encoded segment, `resolveSafePath`) |
| `agent-execution/prompt/carpenter-prompt-sections.ts` | Modify | `renderSemanticMemorySection(path)` |
| `agent-execution/prompt/carpenter-prompt-composer.ts` | Modify | Required `semanticMemoryPath: string \| null` in shared input; section after Project, before native-only sections; absolute-path assert |
| `agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Modify (wiring only) | `semanticMemoryPath: await semanticMemory.prepareForRun(agentDef)` |
| `agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Modify | Prepare path; compose; build sandbox object with `writableRoots` |
| `agent-execution/backends/codex/backend/codex-sandbox-workspace-write-config.ts` | Add | `buildCodexSandboxWorkspaceWriteConfig` |
| `agent-execution/backends/codex/backend/codex-integration-thread-config.ts` | Modify | Emit `shell_environment_policy` only |
| `agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Modify | Prepare path; compose; session config `additionalDirectories` |
| `agent-execution/backends/claude/session/claude-session-config.ts` | Modify | `additionalDirectories: readonly string[]` |
| `agent-execution/backends/claude/session/claude-session-query-options.ts` | Modify | Pass through |
| `runtime-management/claude/client/claude-sdk-client.ts` | Modify | Option → SDK `additionalDirectories` when non-empty |
| `agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | Modify | `prepare()` resolves path; `composeInstructions` passes it |
| `agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | Modify | Path in identity at create |
| `agent-definition/domain/models.ts` | Modify | `semanticMemoryEnabled: boolean` (+ update type) |
| `agent-definition/providers/agent-definition-config.ts` | Modify | Read (true only when `=== true`), write only when true, merge drops it |
| `agent-definition/providers/agent-definition-node-reader.ts` | Modify | Map field |
| `agent-definition/providers/application-owned-agent-source.ts` | Modify | Map field |
| `agent-definition/services/agent-definition-service.ts` | Modify | Field in create input/create; uses moved helpers; must end ≤500 lines |
| `agent-definition/services/agent-definition-edits.ts` | Add | Moved `cloneAgent`, `personalEditsOf` (+ new field) |
| `personal-settings/domain/personal-setting-record.ts` | Modify | Field `semanticMemoryEnabled` (agents), setting `SEMANTIC_MEMORY`, boolean validation, field order |
| `personal-settings/services/personal-settings-service.ts` | Modify | `apply`, `setEdited` (equal to base → removed), reset, update capture |
| `api/graphql/types/personal-settings.ts` | Modify | Enum value |
| `api/graphql/types/agent-definition.ts`, `converters/agent-definition-converter.ts` | Modify | Fields; path via `AgentSemanticMemory.folderOf` |

Web (`autobyteus-web/`): `graphql/queries/agentDefinitionQueries.ts`, `graphql/mutations/agentDefinitionMutations.ts`, `generated/graphql.ts` (codegen), `stores/agentDefinitionStore.ts`, `types/personalSettings.ts` (enum), `components/agents/AgentSemanticMemoryField.vue` (Add: checkbox, help text, `PersonalSettingMark`), `components/agents/AgentDefinitionForm.vue` (wiring: field, payload, load, reset branch), `components/agents/AgentDefinitionDetailSections.vue` (On/Off + path), `localization/messages/en/agents.ts`, `zh-CN/agents.ts`.

Docs: `GLOSSARY.md` (Semantic memory), `autobyteus-server-ts/docs/modules/agent_memory.md` (storage layout), `agent_definition.md` (field), `personal_settings.md` (fifth setting), `prompt_engineering.md` (section), `codex_integration.md` and Claude/DeepSeek harness runtime docs (write access), `docs/design/collaboration_model.md` §3 (one line: `semantic/` is agent knowledge, not a run).

## Applied Patterns

None beyond an owner class with a lazily created default instance (existing pattern).

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; no new folders.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `agent-memory/services/agent-semantic-memory.ts` | Main-line domain owner | Yes | Low | Next to memory location services |
| `codex/backend/codex-sandbox-workspace-write-config.ts` | Off-spine | Yes | Low | Next to the integration config it splits from |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Section | `## Semantic Memory\n\nYour semantic memory is the folder \`/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator\`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.` | Rules about structure, locking or secrets | User: the agent manages it (DEC-010) |
| Folder names | `computer-use-operator` → `computer-use-operator`; `team-local-agent:marketing-team:reply-scout` → `team-local-agent%3Amarketing-team%3Areply-scout` | Raw `:` in a Windows path | QR-001 |
| Codex config | `{ sandbox_workspace_write: { network_access: true, writable_roots: ["/…/semantic/computer-use-operator"] } }` from one builder | `{...a, ...b}` where both set `sandbox_workspace_write` | Silent loss of network access |
| Backend wiring | `const semanticMemoryPath = await this.semanticMemory.prepareForRun(definition);` then pass to compose and runtime config | `if (definition.semanticMemoryEnabled) layout.get…` in a backend | One rule owner |
| Config write | `semanticMemoryEnabled` written only when true; merge removes a stale `true` when turned off | Writing `false` into every saved agent | Agents without it keep their files (REQ-008) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep integration builder emitting `sandbox_workspace_write` and merge afterwards | Smaller diff | Rejected | One owner of the key |
| Version field in config/personal record | — | N/A | Tolerant optional field |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server domain: `AgentDefinition` field, config read/write/merge, both readers, `agent-definition-edits.ts` extraction, service create input.
2. Personal settings: record, service, GraphQL enum.
3. `AgentMemoryLayout` semantic path; `AgentSemanticMemory`.
4. Composer section (required input key) and all five backends; Codex sandbox builder split; Claude `additionalDirectories` pass-through.
5. GraphQL fields; web codegen, store, field component, form wiring, detail, locales.
6. Tests (see Guidance), docs and glossary.

## Key Tradeoffs

- Personal setting vs. package-file edit: chosen personal setting so a user's switch survives package updates and matches tools/skills/avatar/launch (AF-19); cost: personal-settings contract grows by one field.
- Backends call the owner (5 call sites) rather than putting the path in `AgentRunConfig`: backends already read the definition and own runtime config; putting it in the config would need the definition at four config-building sites and persist a derived path.
- Claude `additionalDirectories`: same approval as the workspace; side effect: Claude Code treats it as a working directory (it may read `CLAUDE.md`/skills placed there — the agent does not create such files; accepted).

## Risks

- Codex app-server honoring `writable_roots` in the thread `config` is shown via the CLI sandbox (AF-02), not yet via app-server; AC-002 E2E must use a non-temp data dir (AF-03).
- DeepSeek harness: approval prompt when auto-execute is off (FU-007); not testable on this machine.
- Antigravity restored runs keep the instructions of their creation (REQ-009 consistent).

## Guidance For Implementation

- Reproduction to start from: AF-01/AF-02 commands in the investigation notes (Codex sandbox write outside the workspace fails, then succeeds with the writable root).
- Tests to add (TESTING.md layers):
  - Unit: layout path encoding for shared, team-local, application-owned IDs (QR-001, AC-006); `AgentSemanticMemory` null when off, mkdir when on, never deletes; composer snapshot with and without path, and unchanged output for agents without it (AC-005); config read/write/merge (absent, true, turned off); personal settings apply/setEdited/reset/capture for the field; Codex sandbox builder combinations (read-only, workspace-write with/without network/roots, full access); Claude options include `additionalDirectories` only when set.
  - Integration/API: GraphQL create/update/read of `semanticMemoryEnabled` and `semanticMemoryPath` for a user's own agent and a package agent (personal setting + reset) (AC-007, AC-008).
  - Web: field component and form payload; detail line.
  - Real-runtime E2E (AC-001..AC-004): enabled agent, Project A writes a document (AutoByteus, Codex, Claude; Grok/Antigravity as available), Project B standalone run and a team member run read it; data dir outside `/tmp`.
- Keep `agent-definition-service.ts` ≤500 lines; add no logic to the AutoByteus factory or the agent form beyond wiring.
