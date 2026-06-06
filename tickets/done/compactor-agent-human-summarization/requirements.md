# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved the clarified scope on 2026-06-06: remove agent Fork/Duplicate, overwrite/sync only AutoByteus internal built-in agents, and reject backward-compatibility/legacy paths.

## Goal / Problem Statement

Kick off a focused cleanup for AutoByteus internal built-in agents and the Memory Compactor prompt.

The Memory Compactor should match the intended mental model: the working agent is like a human who has reached context/brain bandwidth, intentionally preserves important progress, clears short-term working memory, and then continues from the preserved summary. The current source prompt is partially improved, but active Electron/app-data installs can still show stale internal wording because built-in agents were copied once and never overwritten.

The application also has an obsolete agent Duplicate/Fork path that creates unmanaged local copies. Product direction is package-centric instead: users customize their own local/Git/GitHub package sources directly; AutoByteus internal agents are product-managed and should sync from bundled source.

## Investigation Findings

- Current source built-in agent registry has exactly two AutoByteus internal built-in agents in `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`:
  - `autobyteus-memory-compactor` — `Memory Compactor`
  - `autobyteus-skill-evolver` — `Skill Self-Evolver`
- Their source templates are sibling folders under `autobyteus-server-ts/src/built-in-agents/templates/`.
- In Electron/app data they materialize as sibling folders under `~/.autobyteus/server-data/agents/`.
- The active user Electron data contains stale `~/.autobyteus/server-data/agents/autobyteus-memory-compactor/agent.md` wording (`AutoByteus Memory Compactor`, `settled AutoByteus`, strict JSON-only language) because `BuiltInAgentBootstrapper.seedFileIfMissing(...)` preserves existing files.
- User-owned local agents can also live in the same app-data `agents/` root, so sync must target known built-in registry ids, not overwrite the whole directory.
- User registered packages such as `/Users/normy/autobyteus_org/autobyteus-agents` are local path packages and must not be overwritten by internal built-in sync.
- Bundled application-owned teams/agents belong to application packages and are out of this internal-agent sync scope.
- Duplicate/Fork is currently implemented as `duplicateAgentDefinition`: frontend `AgentDuplicateButton.vue`, GraphQL mutation, service/provider duplicate methods. It copies `agent.md` and `agent-config.json` into the default app-data agents root; it is not a Git/package fork.
- File-based compaction result handoff was analyzed but is not included in this kickoff ticket.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Refactor / Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift / Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now
- Evidence basis:
  - Built-in internal agents are product-managed but current bootstrap treats existing app-data files as user-owned forever.
  - Internal built-in agents and standalone local agents share the same app-data root, so update behavior must be registry-id scoped.
  - Duplicate/Fork creates unmanaged copies that conflict with package-source customization.
  - The compactor prompt exposes backend/internal language to a human-like agent role.
- Requirement or scope impact: The task includes prompt cleanup, registry-scoped internal built-in agent sync, Duplicate/Fork removal, tests, and docs. It excludes file-based result handoff.

## Recommendations

1. Rewrite the Memory Compactor built-in `agent.md` around the human-resume mental model.
2. Keep exact automated JSON schema ownership in memory compaction task-prompt/parser code, not only editable `agent.md`.
3. Replace built-in agent seed-if-missing behavior with registry-id-scoped sync/overwrite for AutoByteus internal built-in agents only.
4. Do not overwrite user-owned local agents, user local/GitHub packages, or bundled application-owned agents/teams.
5. Remove Duplicate/Fork completely across UI, GraphQL, service/provider interfaces, generated client code, localization, and tests.
6. Do not add backward-compatibility branches, legacy fallback modes, or dual old/new behavior paths.
7. Defer file-based compaction result handoff to a separate ticket; preserve the current final assistant-text JSON result channel in this change.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-001: A normal AutoByteus parent run triggers compaction; the compactor receives a natural, human-continuation summarization task without internal bookkeeping language.
- UC-002: A user opens the default Memory Compactor as a normal agent and can understand/test what it does from its instructions without backend-specific terms.
- UC-003: A server with already-materialized internal built-in agents syncs `autobyteus-memory-compactor` and `autobyteus-skill-evolver` from current bundled templates on startup.
- UC-004: User-owned local agents and user-registered local/GitHub package sources are not overwritten by internal built-in sync.
- UC-005: The application no longer presents or exposes agent Duplicate/Fork as a customization path.
- UC-006: Existing automated compaction continues to parse the compactor final assistant-text JSON result successfully after prompt cleanup.

## Out of Scope

- File-based/temp-file compaction result handoff.
- Redesigning compaction planning, retained suffix policy, raw-trace archival, semantic memory categories, or snapshot rebuilding.
- Adding arbitrary new filesystem powers to compactor agents.
- Bundled application-owned teams/agents and application package materialization behavior.
- User-owned local/GitHub package update mechanics beyond ensuring they are not overwritten.
- Creating a built-in internal agent-team registry; if needed later, that should be a separate design.
- Keeping Duplicate/Fork as a hidden or legacy API.

## Functional Requirements

- REQ-001 `human_resume_prompt`: The default Memory Compactor instructions must frame compaction as preserving important working memory so the same work can continue after summarization.
- REQ-002 `avoid_internal_language`: The default compactor instructions and automated task prompt must avoid normal-mode backend/internal terms, including `settled blocks`, `[SETTLED_BLOCKS]`, `parser-compatible`, `output contract` as user-facing wording, `AutoByteus memory`, `raw trace`, `block id`, `turn id`, and `source event`.
- REQ-003 `manual_testable_agent`: The default compactor `agent.md` must remain understandable and useful when manually run as a normal agent with pasted conversation/progress history.
- REQ-004 `schema_owner_remains_memory`: The exact automated compaction schema must remain owned by memory compaction code and included/generated per task, not solely by editable agent instructions.
- REQ-005 `platform_internal_sync_only`: Startup/bootstrap must sync/overwrite only AutoByteus internal built-in agents listed in `BUILT_IN_AGENT_DEFINITIONS`, currently `autobyteus-memory-compactor` and `autobyteus-skill-evolver`, from their authoritative bundled template source.
- REQ-006 `no_user_package_overwrite`: Startup/bootstrap must not overwrite user-owned or user-registered agent packages from local folders, Git/GitHub packages, imported local path packages, bundled application-owned definitions, or standalone local agents not listed in the built-in registry.
- REQ-007 `source_owned_customization`: Customization of package-managed agents happens in package source itself, such as a local package folder or Git/GitHub-backed package branch; app-data duplicate copies are not a supported customization mechanism.
- REQ-008 `remove_duplicate_fork_surface`: Remove the agent Fork/Duplicate UI, GraphQL mutation, backend service/provider duplicate methods, generated frontend client usage, localization entries, and tests. Existing duplicate-created local agents, if any, remain as ordinary standalone local agents, but no new unmanaged copies are created through Duplicate/Fork.
- REQ-009 `existing_result_channel_preserved`: This ticket must preserve the existing automated compaction result channel where backend memory compaction parses the compactor's final assistant text as JSON.
- REQ-010 `compatibility_rejection`: The implementation must not add backward-compatibility branches, legacy fallback modes, dual seed/sync paths for internal built-ins, or retained hidden Duplicate/Fork API paths.

## Acceptance Criteria

- AC-001: Template tests verify the default compactor prompt includes the human-resume mental model and manual-test guidance.
- AC-002: Template/task-prompt tests verify normal compactor prompts do not include `AutoByteus Memory Compactor`, `settled`, `[SETTLED_BLOCKS]`, `raw trace`, `block id`, `turn id`, or `source event`.
- AC-003: A built-in bootstrap test starts with stale `autobyteus-memory-compactor/agent.md` and verifies startup overwrites/syncs it to the current built-in template.
- AC-004: A built-in bootstrap test verifies `autobyteus-skill-evolver` is also overwritten/synced from the current built-in template.
- AC-005: A bootstrap/sync test verifies a standalone non-built-in local agent under the app-data agents root is not overwritten or deleted.
- AC-006: Tests or static checks verify user-registered package roots and bundled application package roots are not part of built-in agent sync.
- AC-007: Task-prompt/parser tests verify the exact facts-only schema is still generated by memory compaction code and the existing final assistant-text JSON path still parses.
- AC-008: Frontend tests verify Duplicate is not rendered on agent detail views.
- AC-009: Backend/API tests or static type checks verify `duplicateAgentDefinition` is no longer exposed as a GraphQL mutation and backend duplicate provider methods are removed.
- AC-010: Existing compaction planner, parser, normalizer, memory store, snapshot rebuilder, agent definition, and relevant frontend tests continue passing.

## Constraints / Dependencies

- `autobyteus-ts` cannot import `autobyteus-server-ts`; server-specific bootstrap stays in `autobyteus-server-ts`.
- Compaction must remain synchronous with parent dispatch.
- Built-in sync must target registry-defined internal ids, not the whole app-data `agents/` directory.
- User local/GitHub package roots are authoritative user sources and must not be modified by built-in sync.
- No backward-compatibility or legacy code paths should be added or retained for the removed behavior.

## Assumptions

- The user wants the compactor prompt written for the compactor as an agent/person, not for backend implementation internals.
- Current internal built-ins are exactly the two registry entries found during investigation.
- If true AutoByteus internal agent teams are added later, they will get an explicit built-in team registry/materializer rather than sharing application-package or user-package behavior.
- Existing duplicate-created local agents, if present, do not require migration; they are already standalone local agents.

## Risks / Open Questions

- OQ-001: File-based result handoff is deferred to a separate ticket and must not be implemented partially here.
- OQ-002: If AutoByteus later introduces true platform-internal agent teams outside application packages, should they use a dedicated built-in team registry/materializer analogous to built-in agents?

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002 |
| REQ-003 | UC-002 |
| REQ-004 | UC-001, UC-006 |
| REQ-005 | UC-003 |
| REQ-006 | UC-004 |
| REQ-007 | UC-004, UC-005 |
| REQ-008 | UC-005 |
| REQ-009 | UC-006 |
| REQ-010 | UC-003, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Confirms prompt mental-model change. |
| AC-002 | Confirms removal of internal prompt language. |
| AC-003 | Confirms stale memory compactor built-in is synced from source. |
| AC-004 | Confirms skill evolver built-in uses the same sync behavior. |
| AC-005 | Confirms standalone local agents are preserved. |
| AC-006 | Confirms user/application package roots are out of sync scope. |
| AC-007 | Confirms schema ownership/result parsing remain intact. |
| AC-008 | Confirms Duplicate is removed from frontend. |
| AC-009 | Confirms Duplicate is removed from backend/API. |
| AC-010 | Confirms no regressions in relevant existing behavior. |

## Approval Status

Approved for design on 2026-06-06 with explicit constraints: remove Fork/Duplicate; sync only AutoByteus internal built-in agents; no backward-compatibility or legacy code paths; defer file-based compaction result handoff.
