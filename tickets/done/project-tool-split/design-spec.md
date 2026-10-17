# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at `SR-001` (Solution Designer within the direction, user informed 2026-10-17)
- Behavior-defining supplements: None. Precedent (read-only): `tickets/done/task-tool-split/` on `personal`.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (2026-10-17). Data Migration Guideline: not applicable (no persisted data read or written differently). `docs/design/collaboration_model.md`: checked; project tools are not part of the collaboration contract.
- Conflicts or discrepancies: the general principle "no backward compatibility or legacy retention" vs the user's direction that `create_or_update_project` keeps working during a transition. Resolved by the user's direction (scope authority) and bounded: the old tool is a thin dispatcher onto the two new tools' parsers and execution (no second validation or service path), and its removal is a scheduled user decision (DEC-006). Recorded as a deliberate, time-boxed exception, not a precedent for aliases.

## Current-State Read

`project-task-tool-contract.ts` owns the names, descriptions, schemas and parsing of all five project/task tools; `create_or_update_project` uses one parser (`parseProjectMutation`) whose meaning depends on whether `project_id` is present. `project-task-tool-manifest.ts#executeProjectTaskTool` maps the parsed input to `ProjectService.createProjectRecord` or `patchProjectRecord` and projects `{project: …}`. Native classes (`project-task-native-tools.ts`) and the MCP provider (`project-task-tools-mcp-adapter-provider.ts`, `protect_static_adapter`) are both generated from that contract and manifest. Exposure (`runtime-agent-tool-exposure.ts`) passes configured names that are in `PROJECT_TASK_TOOL_NAMES`; no project tool is automatic. Unknown configured names are skipped (AutoByteus warning; MCP filter). The `create_task`/`update_task` split followed exactly this shape.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` — one contract module (two parsers, two descriptions, two schemas, old tool re-pointed), native classes, manifest dispatch, ~15 test/probe/fixture files and three docs; no service, exposure, persistence or UI change.
- Architectural risk: `High` — it adds two public agent tool contracts (native and MCP) and two protected first-party names that shadow any configured MCP tool of the same name; it also fixes a transition contract across two app versions (REQ-004/REQ-005). No persistence, concurrency, security or ownership-boundary change.
- Evidence: investigation SRC-01..SRC-12; structural surfaces in scope are the project-task tool contract and manifest only.
- Escalation trigger: a consumer other than agent configurations depends on `create_or_update_project`'s parser internals; or the current release does not skip unknown names (AC-005 probe fails).

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported |
| --- | --- | --- | --- |
| Code | `src/agent-tools/project-tasks/project-task-tool-contract.ts` | single owner of names, descriptions, schemas, parsers | split here (same as Task split) |
| Code | `…/project-task-tool-manifest.ts`, `…/project-task-native-tools.ts`, `src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts` | both transports derive from the contract/manifest; protection follows the name set | add entries; no transport-specific logic |
| Code | `src/agent-execution/shared/runtime-agent-tool-exposure.ts`; `…/autobyteus-agent-tool-resolver.ts:119-123` | configured-only exposure; unknown names skipped | no exposure change; REQ-005 holds |
| Git | `git diff v1.5.5-beta.2 HEAD` on those paths: empty | release behaves like base | AC-005 probe target |
| Data | SRC-07 | only the PTM package names the old tool | no migration |

## Intended Change

Add `create_project` and `update_project`, each with one parser, description and schema, executing the same `ProjectService` calls and result/error projection as today's two modes. Keep `create_or_update_project` registered with its unchanged name, description and schema; its parsing and execution dispatch on the presence of `project_id` to the new tools' parser/execution, so there is one validation and one service path. Update docs, tests, probes and write release notes.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Files: project-task tool contract, native tools, manifest; docs `autobyteus-server-ts/docs/modules/projects.md`, `agent_tools_mcp_server.md`, `autobyteus-web/docs/projects.md`; tests/probes/fixtures listed below; `release-notes.md` in the ticket folder.
- Deliberately left alone: `ProjectService` and project semantics; `list_projects`, `list_project_tasks`, Task tools; runtime exposure and the AutoByteus resolver; MCP catalog; agent configuration UI; released-data fixtures `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/*` (they record history); agent packages (`autobyteus-agents`).
- Follow-ups:
  - FU-1 (PM creates after release): Project Task Manager package lists `create_or_update_project`, `create_project`, `update_project`; skill names the new tools; later drops the old name after the new release is installed (precedent `autobyteus-agents` 80825d4 / df65728).
  - FU-2 (user decides timing, DEC-006): remove `create_or_update_project` from the app (contract entry, native class, dispatcher, docs, tests that prove REQ-004) in the first release after FU-1's old-name drop.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001, AC-006 | `create_project` call | create mode of combined tool | own tool | DS-001 |
| BEH-002 | System | REQ-002; AC-002, AC-006 | `update_project` call | patch mode | own tool | DS-001 |
| BEH-003 | System | REQ-003; AC-003 | run launch | configured-only | unchanged; new names join set | DS-002 |
| BEH-004 | Contract | REQ-004, REQ-005; AC-004, AC-005 | old-name call; mixed lists | old tool; unknown skipped | old tool dispatches to new parsers/execution; skip unchanged | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship | Status |
| --- | --- | --- | --- |
| `tickets/done/task-tool-split/design-spec.md`, `release-notes.md` | precedent | same contract/manifest pattern; release-notes structure | Archived |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (tool contract).
- Current design issue found: `Yes`.
- Structural trigger: *ambiguous boundary* — one command whose meaning depends on whether an ID is present.
- Root cause: `Boundary Or Ownership Issue` (one interface, two operations).
- Refactor needed now: `Yes` — split the interface; the old interface becomes a thin dispatcher for the transition only.
- Design response: two parsers (`parseCreateProjectInput`, `parseUpdateProjectInput`) sharing private validators for `name`, `description`, `workspaces`; `parseProjectMutation` removed.
- Deferrals: removal of the old tool (FU-2, user decision).

## Terminology

- Project tools: `create_project`, `update_project`; transition tool: `create_or_update_project` (deprecated).

## Legacy Removal Policy (Mandatory)

- Obsolete now: `parseProjectMutation` (replaced by two parsers); the combined branch in `executeProjectTaskTool`.
- Compatibility kept: `create_or_update_project` as a registered tool, by the user's direction (REQ-004), dispatching to the new code paths. Removal: FU-2.

## Persisted Data / State Transition Decision

- Stored subject: agent configurations' `toolNames`. Decision: `Not Affected` — every existing value keeps working; nothing is rewritten.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-002, BEH-004 | agent tool call (native or MCP) | `{project}` result or `{error}` | project-task tool contract → `ProjectService` | the split |
| DS-002 | Primary | BEH-003, BEH-004 | run launch | tools the agent sees | `runtime-agent-tool-exposure.ts` (unchanged) | configured-only, unknown skipped |

## Primary Execution Spine(s)

- DS-001: `agent tool call (AutoByteus native class | MCP manifest entry) -> parseProjectTaskToolInput(name) -> parseCreateProjectInput | parseUpdateProjectInput (create_or_update_project: chosen by presence of project_id) -> executeProjectTaskTool -> ProjectService.createProjectRecord | patchProjectRecord -> {project: projectAcknowledgement}` (errors: `projectTaskToolError`).
- DS-002: `agent definition toolNames -> buildRuntimeAgentToolExposure (enabledProjectTaskToolNames ∩ PROJECT_TASK_TOOL_NAMES) -> AutoByteus resolver (registry; unknown skipped with warning) | Agent Tools MCP session (manifest, protect_static_adapter) -> tools the agent sees`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | Each tool's parser validates only its own arguments; execution maps to the same service method and projection as today. The old tool chooses the create or update path by `project_id` presence and then behaves exactly like that tool. | transports, contract, manifest, service | contract | error projection |
| DS-002 | Unchanged; new names become known project-task names, so configured lists pick them up on both transports. | exposure | exposure module | collision protection |

## Spine Actors / Main-Line Nodes

Native classes, MCP manifest, project-task tool contract (names, descriptions, schemas, parsers), `executeProjectTaskTool`, `ProjectService`.

## Ownership Map

- `project-task-tool-contract.ts`: names, descriptions, schemas, parsing (incl. the old tool's dispatch rule).
- `project-task-tool-manifest.ts`: execution mapping and result/error projection.
- `project-task-native-tools.ts`: native registration only.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| native classes, MCP manifest entries | contract + manifest | transport registration | parsing rules |
| `create_or_update_project` | `create_project` / `update_project` paths | transition (REQ-004) | its own validation or service calls |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `parseProjectMutation` | ambiguous parser | `parseCreateProjectInput`, `parseUpdateProjectInput` (shared private validators) | In This Change |
| combined `create_or_update_project` branch in `executeProjectTaskTool` | split | one `create_project` and one `update_project` branch; the old name routes by `project_id` | In This Change |
| `create_or_update_project` tool (contract entry, description, schema, native class, dispatch) | transition over | — | FU-2 (user decides) |

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility |
| --- | --- | --- | --- |
| error projection | DS-001 | tools | unchanged `{error: {code, message}}`, `PROJECT_OPERATION_UNCONFIRMED` |
| first-party name protection | DS-002 | exposure | `create_project`, `update_project` protected by joining the manifest |

## Ownership Boundaries / Dependency Rules

Tools call `ProjectService` only through `executeProjectTaskTool`. Transports never parse. No module outside `agent-tools/project-tasks` names the new tools except exposure via `isProjectTaskToolName` (unchanged).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `create_project` | new Project | create | `{name, description?, workspaces?: [{workspace_path, description?}]}`; `project_id` or other keys → `PROJECT_TOOL_ARGUMENT_INVALID` "Unsupported tool argument."; missing/blank name → `PROJECT_NAME_REQUIRED` | result `{project: {projectId, name, description, workspaces: [{workspaceRootPath, description}]}}` |
| `update_project` | known Project | patch | `{project_id, name?, description?, workspaces?}`; missing `project_id` → `PROJECT_TOOL_ARGUMENT_INVALID` (`project_id must be a non-empty string.`); no change field → `PROJECT_PATCH_REQUIRED`; blank name → `PROJECT_NAME_REQUIRED` | same result; supplied `workspaces` replaces all links, `[]` unlinks all; omitted fields kept |
| `create_or_update_project` | either | transition | unchanged | `project_id` present → `update_project` path; absent → `create_project` path. Non-object args → same invalid error as today |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `create_project` | Yes | Yes | Low | — |
| `update_project` | Yes | Yes | Low | — |
| `create_or_update_project` | No | presence-based | accepted for the transition | FU-2 |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| create/patch semantics | `ProjectService` | Reuse unchanged |
| field validation | `parseProjectMutation` body | Split into shared private validators |
| exposure, collision protection | exposure module, MCP catalog | Reuse unchanged |

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Why |
| --- | --- | --- |
| name / description / workspaces validation | `project-task-tool-contract.ts` (private helpers) | both project tools and the old dispatcher |
| `workspaces` schema definition | same file (one builder) | identical in both schemas |

## Shared Structure Tightness Check

| Structure | Tight | Action |
| --- | --- | --- |
| `ProjectTaskToolName` (`list_projects`, `list_project_tasks`, `create_project`, `update_project`, `create_or_update_project`, `create_task`, `update_task`) | Yes | — |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | Modify | names (+2), descriptions (split of today's text, see examples; old description unchanged), schemas (shared workspaces definition), `parseCreateProjectInput`, `parseUpdateProjectInput`, old-name dispatch; remove `parseProjectMutation` |
| `…/project-task-tool-manifest.ts` | Modify | `create_project` → `createProjectRecord`, `update_project` → `patchProjectRecord`; old name routes by `project_id` |
| `…/project-task-native-tools.ts` | Modify | `CreateProjectTool`, `UpdateProjectTool` registered; `CreateOrUpdateProjectTool` kept with a comment pointing to FU-2 |
| `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` | Modify | new tools: schemas, parity native/MCP, collision policy, parser errors; old tool: unchanged description/schema and both modes equal the new tools' results (AC-004); exposure: each new name alone, mixed list, old-only (AC-003) |
| `tests/e2e/projects/*.e2e.test.ts` (7 files, SRC-12) | Modify | agents and calls use `create_project`/`update_project`; `project-task-boundaries` keeps one old-name call per mode and adds the collision case for the new names |
| `tests/fixtures/codex-native-multi-agent-system.mjs`, `project-mutation-http-node.mjs` | Modify | new names (the "disabled" assertion targets `create_project`) |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`, `task-closure-tree-probe.mjs` | Modify | manager tool lists use the new names |
| Docs: `autobyteus-server-ts/docs/modules/projects.md` (§"Exactly Five Agent Tools" → seven tools incl. the deprecated one; line 42), `agent_tools_mcp_server.md` (lines 201, 252, 317; anchors), `autobyteus-web/docs/projects.md` (§Agent Tools) | Modify | new tools; deprecation of the old one |
| `tickets/in-progress/project-tool-split/release-notes.md` | Add | DEC-005 |
| AC-005 probe script + outputs under the ticket's `evidence/` | Add | both versions' tool resolution |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| `create_project` description | "Create a Project on the current node: required name, optional description and workspaces (absolute node-local folder paths; registration not required). Returns the saved Project (projectId, name, description, workspaces). Does not delegate work." | "…or patch a known project_id…" | one meaning |
| `update_project` description | "Update a known Project by its project_id: name, description and/or workspaces. Omitted fields are kept; blank description clears. A supplied workspaces list replaces ALL links ([] unlinks all, folders are not deleted); retained links keep omitted descriptions. Returns the saved Project." | naming `create_or_update_project` | descriptions name no other tool (precedent DEC-005) |
| old tool dispatch | `Object.hasOwn(input,'project_id') ? parseUpdateProjectInput(input) : parseCreateProjectInput(input)` after the plain-object check | a copy of today's parser kept beside the new ones | one validation path |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| remove old tool now (precedent) | clean cut | Rejected by user direction (REQ-004) | FU-2 later |
| map old name to the two new tools at exposure | fewer tools | Rejected (DEC-002) | old tool kept unchanged |
| deprecation sentence in old description | warn agents | Rejected (DEC-004) | docs + release notes |
| keep `parseProjectMutation` for the old tool | zero-risk parity | Rejected | dispatcher onto new parsers; parity tests |

## Change / Refactor Sequence

1. Contract: names, descriptions, schemas, two parsers, old-name dispatch; remove `parseProjectMutation`.
2. Manifest execution; native classes.
3. Unit tests; e2e/fixtures/probes renamed.
4. Docs; release notes.
5. AC-005 probe against `v1.5.5-beta.2` release code (read-only, e.g. the tag's built server or installed app) and the new build; real-app check in an isolated instance (TESTING.md) with a test data package defining one agent with the new tools and one with only the old tool.

## Key Tradeoffs

- Keeping the old tool costs one dispatcher and a later removal Task; in exchange no configuration loses its project tool at any point and the release is not coupled to the package update (the Task split's main risk).

## Risks

- A third-party configured MCP tool named `create_project` or `update_project` is replaced by the first-party tool (release note).
- During the transition, agents configured with all three see two ways to do the same thing; their skill chooses (PTM skill update in FU-1).

## Guidance For Implementation

- Results and error codes must equal today's corresponding mode exactly (AC-001, AC-002, AC-004): assert with parity tests against fixed expected outputs, including the old tool for both modes.
- Keep the old tool's description and schema byte-identical (AC-004).
- Release notes per DEC-005 (structure of `tickets/done/task-tool-split/release-notes.md`).
