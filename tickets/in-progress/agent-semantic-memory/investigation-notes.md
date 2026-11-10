# Investigation Notes

## Investigation Meta

- Package identifier: `agent-semantic-memory` (Project Task `autobyteus-12`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Request / ticket: Task autobyteus-12, "Give agents a semantic memory", delegated by `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`)
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory`, branch `codex/agent-semantic-memory`
- Resolved base remote / branch / revision: `origin/personal` at `f78b60dddd0d1a3db97dfbf8b4bced3b61549010` (fetched 2026-11-10)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md: ticket branches `codex/<ticket-name>`, finalized into `personal`)
- Bootstrap result: worktree created from `origin/personal` (the first `git worktree add -b` timed out after creating the branch; the worktree was then added on the existing branch, HEAD `f78b60ddd`).
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-10): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; repository `AGENTS.md`, `DESIGN.md`, `GLOSSARY.md` (Memory section)
- Investigation status: requirements-level investigation complete; architecture-level investigation pending approval.

## Initial Request And Clarifications

- Original request: Task autobyteus-12 (full text in the Task). Agents have episodic memory (work journals, `search_memory`) and procedural memory (skills) but no semantic memory: reusable knowledge that belongs to the agent. The Computer Use Operator saves site knowledge per Project (`<workspace>/web-ui-sites/<site>/site-knowledge.md`), so the same sites are learned again in each Project; it cannot go into the public agent package.
- The user's design (direction): enabled per agent; when enabled the system creates and owns a private location outside every Project workspace and outside the package repository; the path is given in the system instructions with the instruction that reusable knowledge goes there; all runs of the agent share it whatever team or Project; organized as documents whose structure the agent's skill decides.
- Open for the team to settle with the user: location and version history/backup; visibility/editing in the app and search; concurrent writers; how a team member resolves to the same memory as the standalone agent.
- Done when: merged on the base branch and verified (path in instructions, write from one Project, later read from another Project and as a team member; agents without it unchanged; follow-ups recorded). No release unless asked.

## Product And Domain Understanding

- Product area: agent definitions, run instruction composition (all runtimes), agent definition form/detail in the web app, server data directory.
- Affected actors: agent authors (package and in-app), the user, agents at run time (first consumer: Computer Use Operator), runtimes (AutoByteus, Codex, Claude, ACP-based Grok/DeepSeek harness, Antigravity).
- Terminology (GLOSSARY.md § Memory): "Memory (of a run)" is what a run keeps in its own folder, "not a global knowledge base". Semantic memory is therefore a new, distinct term. Precedent: the Model Router's "Knowledge file" `knowledge.md`, its own durable memory in its internal workspace.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | Code | `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts`, `carpenter-prompt-sections.ts` | Where system instructions are built | One composer for all runtimes: `composeSharedCarpenterPrompt` (Codex, Claude, ACP, Antigravity) and `composeNativeAutoByteusPrompt` (AutoByteus). Sections: Agent Identity, Team Instruction + collaboration (members), Project, and native-only Working Environment/Bash/File practice. | Design: add one section here |
| 2026-11-10 | Code | `grep composeSharedCarpenterPrompt` callers: `claude-session-bootstrapper.ts:93`, `codex-thread-bootstrapper.ts:254`, `autobyteus-agent-run-backend-factory.ts:329`, `agy-agent-run-backend-factory.ts:60`, `acp-agent-run-backend-factory.ts:136` (Grok and DeepSeek harness use the ACP factory) | Coverage of every runtime | Every runtime composes from the agent definition; ACP recomposes on restore too. | Verify restore behavior of Codex/Claude in design |
| 2026-11-10 | Code | `agent-execution/domain/agent-run-config.ts` | Run config fields | Holds `agentDefinitionId`, `workspaceId`, `memoryDir`, `memberExecutionContext`, `project`. | |
| 2026-11-10 | Code | `agent-definition/domain/models.ts`, `providers/agent-definition-config.ts` | Where a per-agent setting lives | `agent-config.json` holds per-agent config (`toolNames`, `skillNames`, `skillScope`, `defaultLaunchConfig`, `internal`); normalized with tolerant defaults; written by the app's form via `buildAgentConfigRecord`/`mergeAgentConfigRecord`. | Design: add the enable field here |
| 2026-11-10 | Code | `agent-definition/providers/agent-definition-source-paths.ts`, `file-agent-definition-provider.ts:223-258`, `agent-team-definition/utils/team-local-definition-id.ts`, `application-bundles/utils/application-bundle-identity.ts` | Agent identity | Shared agent ID = its folder name (e.g. `computer-use-operator`), unique across registered packages (`DEFINITION_IDENTITY_DUPLICATED` otherwise). Team-local IDs `team-local-agent:<team>…` (contain `:`), application-owned IDs are prefixed hex, Org-owned agents have their own IDs. | Folder naming must be filesystem-safe (`:` invalid on Windows) |
| 2026-11-10 | Data | `/home/autobyteus/workspace/autobyteus-agents/agent-teams/marketing-team/team-config.json` | How the operator joins a team | Member `computer_use_operator` is `{"ref": "computer-use-operator", "refScope": "shared"}`: the same shared definition as the standalone agent. Event Scouting Team references it too. | Keying by definition ID resolves team membership |
| 2026-11-10 | Data | `/home/autobyteus/workspace/autobyteus-agents/agents/computer-use-operator/agent-config.json` | First consumer | Tools include `read_file`, `write_file`, `edit_file`, `run_bash`; skills `web-ui-automation`, `computer-use-operation`. | Package change is autobyteus-agents-23 |
| 2026-11-10 | Code | `config/app-config.ts:287-345` | Data dir layout | `getAppDataDir()`, `getMemoryDir()` = `<data-dir>/memory` (run memory), `getSkillsDir()`, temp workspace dir; subdirectories created by `ensureDataSubdirectory`. | |
| 2026-11-10 | Data | `ls ~/.autobyteus/server-data/memory` | Existing memory layout | `memory/agents/<run-id>`, `memory/agent_teams/<team-run-id>`, `memory/agent_orgs/…`, run history indexes. | Semantic memory as sibling `memory/semantic/` (user, DEC-001) |
| 2026-11-10 | Code | `memory-sync/shared/memory-sync-path-policy.ts` | What memory sync covers | Sync kinds are only `agents` and `agent_teams` (run memory). | Semantic memory not synced (out of scope) |
| 2026-11-10 | Code | `model-routing/services/model-router-agent.ts` | Precedent for agent-owned knowledge | Model Router keeps `knowledge.md` in its system-owned internal workspace and writes it with file tools. | Precedent for a system-owned location; not changed here |
| 2026-11-10 | Code | `autobyteus-ts/src/tools/file/workspace-path-utils.ts`, `server-runtime.ts:126` | Can native file tools write outside the workspace? | Absolute paths are accepted; only the database, its key and the test vault are denied (`FILE_TOOL_PATH_DENIED`). | Native runtime can write the location |
| 2026-11-10 | Code | `runtime-management/codex/codex-sandbox-mode-setting.ts`, `codex-integration-thread-config.ts` | Codex sandbox | Default sandbox `workspace-write`: writes limited to the working directory (and temp). The app already sends `sandbox_workspace_write` thread config (network access for integration runs). | Codex needs the location as a writable root; verify in design with a probe |
| 2026-11-10 | Code | `claude-session-query-options.ts`, `claude-session-config.ts` | Claude permissions | `permissionMode: "default"`; tool permission checks go to `canUseTool` → app tooling coordinator (auto-approve or user approval). | Verify in design whether writes outside cwd prompt differently; consider additional directories |
| 2026-11-10 | Code | `acp-session-launcher.ts`, `agy-agent-run-backend-factory.ts` | ACP / Antigravity working dirs | ACP sessions get `cwd` = working directory; Antigravity runs in a run capsule. | Verify outside-cwd write access per runtime in design |
| 2026-11-10 | Code | `autobyteus-web/components/agents/AgentDefinitionForm.vue:119-125,465`, `AgentDefinitionDetailSections.vue:26-35` | Existing per-agent switches in the app | The form has a "Use all installed skills" checkbox stored as `skillScope`; the detail page shows it. | Same pattern for a semantic-memory switch |
| 2026-11-10 | Doc | `GLOSSARY.md` § Memory, § Memory Sync, "Knowledge file" | Vocabulary | Run memory is "not a global knowledge base"; memory search covers work journals of runs on this node. | New glossary entry needed |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Run start/restore of any agent | Server composes instructions from the agent definition (+ team/collaboration sections for members, + Project section when started under a Project) and passes them to the runtime | No section about agent-owned knowledge exists | `carpenter-prompt-composer.ts` | High (Read) |
| BEH-002 | User | Agent author edits an agent in the app or in its package | Per-agent config lives in `agent-config.json` and is edited through the agent form | No semantic-memory setting exists | `agent-definition-config.ts`, `AgentDefinitionForm.vue` | High (Read) |
| BEH-003 | System | Agent learns reusable knowledge | No current supported behavior: an agent has no system-owned place for its own knowledge; skills write into the current Project workspace | Knowledge is per Project and relearned | Task facts; operator skill (`computer-use-operation`) | High |
| BEH-004 | System | Shared agent joins a team (`refScope: shared`) | The member resolves to the same shared agent definition ID as the standalone agent | Definition identity is shared | `marketing-team/team-config.json` | High (Read) |
| BEH-005 | System | Run memory | Each run's memory is under `<data-dir>/memory/agents|agent_teams|agent_orgs/<run>`; indexed, searchable, syncable | Per-run, not shared | `app-config.ts`, memory-sync path policy | High (Read) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agent-execution/prompt/*` | Composes instructions for all runtimes | One place gives every runtime the section | Section placement; restore recomposition per runtime |
| `agent-definition/providers/agent-definition-config.ts` | Reads/writes `agent-config.json` tolerantly | Enable flag fits here; unknown fields are tolerated | Field name; GraphQL + web store exposure |
| Codex `workspace-write` sandbox | Restricts writes to the working directory | Location must be writable in the default sandbox | `sandbox_workspace_write.writable_roots` on thread start/resume (probe) |
| Claude `canUseTool` | Approval for tools | Writes must follow the same approval policy as workspace writes | `additionalDirectories` option (probe) |
| Definition IDs with `:` / hex | Identity | Folder must be safe on every desktop OS and distinct per definition | Encoding of the folder name |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- New: a folder of agent-written documents per enabled agent definition, under the server data directory. `agent-config.json` gains one optional field.
- Existing readers/writers: agent definition providers, agent package definition readers, web agent form/detail via GraphQL.

### Structural Surfaces

- Instruction composer (all runtimes), runtime sandbox/permission configuration (Codex, Claude, ACP, Antigravity), agent definition domain/GraphQL/web store, app config data subdirectories.

### Potential Structural Impacts To Investigate

- API or external-contract change: GraphQL agent definition type and update input gain a field; `agent-config.json` gains an optional field (package authors' contract).
- Persistence schema or invariant change: new data subdirectory; no migration (absent field = off).
- Security or privacy boundary change: Codex sandbox writable roots widened by one agent-owned folder for enabled agents only.
- Concurrency or lifecycle change: several runs may write the same folder (decided: no locking).
- Confirmed absent: memory sync, memory search, Memory page are not touched.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `codex --version` | Real dependency available for design probes | `codex-cli 0.167.0`; `claude`, `grok`, `agy` installed | Measured | Design can probe outside-workspace writes per runtime | N/A |

- Temporary diagnostics: None
- Reproduction for implementation to start from: None yet (design phase will add runtime write probes).

## Stakeholder And User Evidence

- 2026-11-10 (Read, code): `memory-sync/source/local-memory-export-scanner.ts` walks only `memory/agents` and `memory/agent_teams`; `memory-search/runs/memory-run-discovery.ts` walks only the standalone/team/org roots; `agent-memory/store/memory-file-store.ts` reads `agents`. So `memory/semantic/` is not seen as a run. The memory-search index is at `<data-dir>/memory-search/`, outside `memory/`.
- 2026-11-10 user conversation: the system only provides the folder; the agent manages its semantic memory (a future distiller agent may write into it from work journals); location inside the memory folder as `memory/semantic/`; no renaming of run folders; approved the summary.

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task, 2026-11-09/10) | Operator relearns the same sites per Project; package repos are public | Strong (user's words) | Private, system-owned, per-agent location | Location, history, UI, search |
| Project Task Manager | First consumer is autobyteus-agents-23, waiting on this Task | Strong | The package must be able to enable the feature declaratively | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Codex app-server | codex-cli 0.167.0 | `workspace-write` sandbox blocks writes outside the working directory unless added as writable root | `codex-sandbox-mode-setting.ts`; Codex config docs (`sandbox_workspace_write.writable_roots`) | To probe in design |
| Claude Agent SDK | installed `claude` | Edits outside cwd go through permission checks | `claude-session-query-options.ts` | To probe in design |
| ACP runtimes (Grok, DeepSeek harness), Antigravity | installed | Session `cwd` is the workspace / run capsule | `acp-session-launcher.ts`, `agy-agent-run-backend-factory.ts` | Outside-cwd write policy unknown; probe in design |

## Persisted Data And State Facts

- Affected stored subject: new per-agent folder of documents; optional field in `agent-config.json`.
- Location: under the server data directory (decision DEC-001).
- Volume: small (Markdown documents; the operator today has four site folders per workspace).
- Readers/writers: the agent (its tools); the server only creates the folder. The user may open the files.
- Unknown-field behavior: `normalizeAgentConfigRecord` ignores unknown fields; `mergeAgentConfigRecord` retains unknown fields on save.
- Must be preserved: everything an agent wrote; the system never deletes or rewrites it (also when disabled or the agent is deleted).
- Acceptable loss: none caused by the system. Overwrites by concurrent runs of the agent are an accepted risk (DEC-006).
- Remaining gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The UI change is a small switch and a read-only path line following the existing form/detail pattern.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` | Solution Designer | Follow-ups found | Ticket | — | Current | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether each non-native runtime can write outside its working directory under default settings | REQ-006 | Architecture probes per runtime | Open (design) |
| UNK-002 | Unknown | Whether Codex/Claude restore recompose instructions | REQ-010 | Architecture investigation | Open (design) |
| RSK-001 | Risk | Concurrent runs overwrite each other's edits to the same document | Knowledge loss | DEC-006: no locking; skills may add rules; revisit if observed | Accepted |
| RSK-002 | Risk | Agent stores secrets (passwords, tokens) in plain documents | Privacy | Left to the agent's skills (user: the agent manages its semantic memory; DEC-010) | Accepted |

## Architecture Investigation Findings

(Pending requirements approval.)

## Requirement Implications

- Keying by agent definition ID gives standalone, team-member (`refScope: shared`) and delegated runs the same memory without new team configuration (DEC-005).
- A field in `agent-config.json` lets the package declare the need (autobyteus-agents-23) and the app form edit the same value (DEC-004).
- Codex's default sandbox makes write access an explicit requirement (REQ-006), not an assumption.
- Keeping the location outside `<data-dir>/memory/` avoids run-memory scanners (explorer, index, sync) treating it as a run.

## Notes For Architecture Design

- Map SCN-001..SCN-006 to: config field → definition → run start → folder ensure → instruction section → runtime write access.
- Verify per runtime: outside-workspace write in default settings; instruction recomposition on restore.
- Filesystem-safe, distinct, stable folder name per definition ID (team-local IDs contain `:`).
