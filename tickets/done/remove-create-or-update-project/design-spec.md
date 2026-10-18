# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at `SR-001` (Solution Designer within the direction, user informed 2026-10-18)
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (incl. rules 7–8 added since the split). Data Migration Guideline: not applicable.
- Conflicts or discrepancies: None. This removes the time-boxed compatibility exception recorded in the split's design.

## Current-State Read

The split left `create_or_update_project` as a registered tool whose name, description and schema are unchanged and whose calls run as `create_project` or `update_project` via `effectiveProjectTaskToolName` (contract) — the one place that decides, called by `parseProjectTaskToolInput` and `executeProjectTaskTool`. Native registration (`CreateOrUpdateProjectTool`) and the MCP manifest (from `PROJECT_TASK_TOOL_NAMES`) expose it; first-party protection follows the same set.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` — three source files lose one tool's entries and its dispatch; tests, three docs, one web probe, release notes.
- Architectural risk: `High` — it removes a public agent tool contract (native and MCP) and its protected name; definitions still listing it lose that tool (bounded: they skip it without an error, and the only known one also lists the new tools).
- Evidence: SRC-01..SRC-08. Structural surface: the project-task tool contract only.
- Escalation trigger: any consumer other than agent definitions depends on the old name or on `effectiveProjectTaskToolName`.

## Intended Change

Delete `create_or_update_project` from the contract (name, type, description, schema, dispatch), the native tools and the manifest; delete the dispatch helper that becomes dead; update tests, docs and the web probe; write the release note.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003. Files listed below.
- Deliberately left alone: `create_project`/`update_project` and all other tools; exposure and resolver; MCP catalog; the migration fixture `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/*` (DEC-002); `.github/release-notes/release-notes.md` (written by the release step, DEC-004); other docs' mention of the removed `create_or_update_task`; archived tickets.
- Follow-ups: none from design. (The PTM package PR runs in parallel under the PM.)

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | REQ / AC | Trigger | Existing | Change | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-003; AC-001, AC-003 | tool call / picker | old tool exposed | removed; new tools untouched | DS-001 |
| BEH-002 | REQ-002; AC-002 | launch with old name | old tool given | name skipped as unknown | DS-002 |
| BEH-003 | REQ-004..006; AC-004, AC-005 | docs, notes | deprecation text | removed; removal note | — |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (planned removal).
- Current design issue found: `Yes` — `Legacy Or Compatibility Pressure` (the transition dispatcher).
- Refactor needed now: `Yes` — clean-cut removal.
- Design response: remove the old tool and its dispatch so every project/task tool runs under its own name.

## Legacy Removal Policy (Mandatory)

- Obsolete: everything in the Removal plan. Compatibility kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected`: definitions keep their `toolNames`; the old name is skipped at launch. No migration, no rewrite.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | agent tool call (native/MCP) | `{project}` / `{error}` | project-task tool contract → `ProjectService` | one name per tool |
| DS-002 | Primary | run launch | tools the agent sees | `runtime-agent-tool-exposure.ts` + AutoByteus resolver / MCP session (unchanged) | old name skipped |

## Primary Execution Spine(s)

- DS-001: `native class | MCP manifest entry -> parseProjectTaskToolInput(name) -> parseCreateProjectInput | parseUpdateProjectInput | … -> executeProjectTaskTool(name) -> ProjectService.createProjectRecord | patchProjectRecord -> {project}`
- DS-002: `definition toolNames (may contain create_or_update_project) -> buildRuntimeAgentToolExposure (isProjectTaskToolName drops it) -> AutoByteus resolver (registry miss → warn "not found in registry. Skipping.") | MCP session (not in enabled names) -> tools the agent sees`

## Ownership Map

Unchanged: contract (names, descriptions, schemas, parsers), manifest (execution, projection), native tools (registration).

## Removal / Decommission Plan (Mandatory)

| Item | Where | Why | Replaced By |
| --- | --- | --- | --- |
| `"create_or_update_project"` in `PROJECT_TASK_TOOL_NAMES` and `ProjectTaskToolName` | contract l.4-5 | removed tool | — |
| `EffectiveProjectTaskToolName` | contract l.6-7 | dead: equals `ProjectTaskToolName` | `ProjectTaskToolName` |
| description entry + deprecation comment | contract l.14-15 | removed tool | — |
| schema branch | contract l.52-58 | removed tool | — |
| `effectiveProjectTaskToolName` | contract l.146-153 | dead: every name runs as itself | direct `name` |
| its calls | contract `parseProjectTaskToolInput` l.223-224; manifest `executeProjectTaskTool` l.58-60 (+ import) | dead | dispatch on `name` |
| `workspacesDefinition` doc comment "the three Project mutation tools" | contract | stale count | "both Project mutation tools" |
| `CreateOrUpdateProjectTool` class and its registration | native tools l.41-44, 58 | removed tool | — |
| old-tool tests (REQ-004 of the split: unchanged description/schema, parity with the new tools, e2e old-tool calls, collision case, `CreateOrUpdateProjectTool` imports) | `project-task-tools.test.ts`, `project-tool-runtime-parity.test.ts`, `project-task-boundaries.e2e.test.ts` | tests of removed code | skip tests below |
| doc mentions | server `projects.md` (l.59-62 sentence, l.454 table row), `agent_tools_mcp_server.md` (l.253, l.327), web `docs/projects.md` (l.457) | removed tool | — (DEC-005) |
| `'create_or_update_project', 'create_or_update_task'` in the manager tool list | `autobyteus-web/tests/e2e/team-status-live-probe.mjs:141` | removed tools (REQ-006) | `'create_project', 'update_project', 'create_task', 'update_task'` (keep the manager's intended capabilities) |

Keep `projectInput` (used by both project parsers).

## Tests To Add (REQ-002, DEC-003)

- `project-tool-runtime-parity.test.ts`: a definition listing `create_or_update_project` + `read_file` (and one also listing `create_project`, `update_project`) gives no tool from the old name on AutoByteus, Codex and Claude, the other listed tools stay, no error is logged; the MCP adapters and native registry contain no `create_or_update_project`. Mirror `task-tool-runtime-parity.test.ts:60-76`.
- `autobyteus-agent-tool-resolver.test.ts`: old name → warning naming it, no error (mirror lines 114-123).
- `project-task-tools.test.ts`: `PROJECT_TASK_TOOL_NAMES` is exactly the six current names; `isProjectTaskToolName("create_or_update_project")` is false.

## Off-Spine Concerns

- First-party protection follows `PROJECT_TASK_TOOL_NAMES`; the old name is no longer protected (release note).

## Interface Boundary Mapping

| Interface | Subject | Identity Shape | Notes |
| --- | --- | --- | --- |
| `create_project` | new Project | unchanged | — |
| `update_project` | known Project | unchanged | — |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Why |
| --- | --- | --- |
| alias old name → new tools | Rejected | user: legacy not needed; skip is harmless |
| startup rewrite of definitions | Rejected | not needed; data `Not Affected` |
| keep the dispatcher "just in case" | Rejected | dead after removal |

## Change Sequence

1. Contract, manifest, native tools; delete dead helper/type.
2. Tests: remove old-tool tests; add skip tests.
3. Docs; web probe.
4. `release-notes.md` in the ticket folder (structure of `tickets/done/project-tool-split/release-notes.md`): Upgrade Notes — "`create_or_update_project` is removed. Agents that still list it launch normally without it (the name is skipped). Select `create_project` and/or `update_project` for agents that create or change Projects."
5. Real-app check (TESTING.md): isolated instance of the worktree build with a test data package containing an agent listing `create_or_update_project` (+ another tool) and an agent listing the new tools.

## Risks

- A definition relying only on the old tool can no longer change Projects until it selects the new tools (release note). Locally none (SRC-07).

## Guidance For Implementation

- `git grep create_or_update_project -- ':!tickets'` must return only: the new skip tests, the migration fixture (DEC-002), and `.github/release-notes/release-notes.md` (replaced at release, DEC-004).
- New tools' descriptions and schemas must stay byte-identical (AC-003).
