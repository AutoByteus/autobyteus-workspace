# Investigation Notes

## Investigation Meta

- Package identifier: `remove-built-in-project-task-manager`
- Request / ticket: Remove the built-in "Project Task Manager" agent from the AutoByteus server (request relayed by `/agent_package_creator` on 2026-10-06)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager` on `codex/remove-built-in-project-task-manager`
- Resolved base remote / branch / revision: `origin/personal` @ `1aa91829811866d391bb61d011109aa1a4ea7683` (fetched 2026-10-06; shared checkout `personal` was 115 commits behind and dirty, so it was not used)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/remove-built-in-project-task-manager/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Investigation status: Requirements approved (SR-001); architecture investigation complete (SR-002)

## Initial Request And Clarifications

- Original request: Remove built-in agent template `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/`, registered in `built-in-agent-registry.ts` as `autobyteus-project-task-manager`, plus everything that depends on it existing. Keep the Project Tasks feature and its tools (`list_projects`, `list_project_tasks`, `create_or_update_task`, `delegate_task`) unchanged. Follow DESIGN.md and TESTING.md, including what happens to already-installed copies in users' app data.
- Clarifications received: 2026-10-06 user approved SR-001 ("aprpove. i thin its simple right? just remove the internal built in project task manager?"); recorded as DEC-001 = A, DEC-002 accepted.
- User-supplied facts and constraints: The built-in duplicates the agent-repository agent `/Users/normy/autobyteus_org/autobyteus-agents/agents/project-task-manager/` (own `project-task-management` skill). Both appear under the same name; the user sees the built-in one, which has no own skill and is configured with all installed skills. The user wants only the agent-repository version.
- Initial ambiguity: (1) whether existing installed copies are deleted or left in place; (2) consequence for old conversations/Teams that used the built-in.

## Product And Domain Understanding

- Product area: Built-in (platform-owned) agents; agent catalog; Projects feature.
- Affected actors or systems: Desktop/server users on releases that shipped the built-in; server startup (built-in bootstrap, app-data migrations); web catalog and `@` mention eligibility.
- Existing user or operational purpose: The built-in was the shipped "Manager" for Projects (author Projects, plan Tasks, delegate, set status).
- Relevant terminology: *Built-in agent* = registry-listed definition whose `agent.md`/`agent-config.json`/`skills/` are rewritten from a shipped template on every startup. *Package root* = additional agent repository (e.g. `autobyteus-agents`) read via `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`; its agent IDs are folder names.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | Doc | `AGENTS.md`, `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Project rules | DESIGN: prefer deletion; remove obsolete paths; persisted-data changes must follow the Data Migration Guideline. TESTING: server unit/integration/E2E layers; never test against user's app/data. | Apply in design |
| 2026-10-06 | Doc | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Disposition of installed copies | §1 never lock out startup; §2 checklist; §10: `remove-external-messaging-data-migration.ts` — "Deletion without a backup followed an explicit feature-removal approval. It is not general permission to delete history." | Requires explicit user approval for deletion (DEC-001) |
| 2026-10-06 | Code | `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Registration | `PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID = "autobyteus-project-task-manager"`, first entry of `BUILT_IN_AGENT_DEFINITIONS` | Remove |
| 2026-10-06 | Code | `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Lifecycle | Every startup copies template `agent.md`, `agent-config.json` into `<appData>/agents/<id>/` and mirrors `skills/` (removed when template has none). Only registry IDs are touched; unlisted folders are never touched. | Removing registry entry alone leaves the installed folder in place |
| 2026-10-06 | Code | `templates/project-task-manager/{agent.md,agent-config.json}` | What is installed | name "Project Task Manager", `skillScope: ALL_INSTALLED`, `skillNames: []`, tools `list_projects, list_project_tasks, create_or_update_project, create_or_update_task, list_available_agents, delegate_task, send_message_to, read_file` | Confirms user's observation (no own skill; all installed skills) |
| 2026-10-06 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agents/project-task-manager/` | Replacement agent | Folder ID `project-task-manager` (different from `autobyteus-project-task-manager`); name "Project Task Manager"; `skillNames: ["project-task-management"]`; tools `list_projects, list_project_tasks, create_or_update_task, list_available_agents, delegate_task, send_message_to, read_file, write_file, edit_file, run_bash` | Two different IDs ⇒ both listed; no ID collision |
| 2026-10-06 | Code | `src/agent-definition/providers/file-agent-definition-provider.ts` (`getReadAgentRoots`, `readSharedAgentFromRoot`) | ID resolution | Shared agents are read from `<appData>/agents` plus `<packageRoot>/agents`; ID = folder name | Installed copy remains a visible shared agent after de-registration |
| 2026-10-06 | Command | `git grep -n -I -E "PROJECT_TASK_MANAGER|project-task-manager|Project Task Manager|projectTaskManager"` (excluding `tickets/`) | Dependents | See Codebase table below | Design inventory |
| 2026-10-06 | Code | `src/agent-collaboration/collaborators/collaborator-candidate-policy.ts:64` | `@` eligibility | Excludes all `BUILT_IN_AGENT_DEFINITIONS` IDs from `@` collaborators | Auto-follows registry |
| 2026-10-06 | Code | `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts` + `__tests__/builtInAgentDefinitionIds.contract.spec.ts` | Web mirror | Hand mirror of server built-in IDs; contract test fails on drift | Must drop the ID in the same change |
| 2026-10-06 | Code | `tests/unit/built-in-agents/built-in-agent-templates.test.ts`, bootstrapper test "leaves the old compactor source intact" | Precedent: Memory Compactor retirement | Retired built-in's installed folder was deliberately left untouched/inert (ticket `context-compaction-simplification-analysis`, SR-017: "No Migration … Leave source files untouched/inert"). That folder had no user-facing duplicate problem. | Contrasting precedent for DEC-001 |
| 2026-10-06 | Code | `src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts`, `app-data-migration-registry.ts`, `app-data-migration-runner.ts` | Precedent: approved feature-removal deletion | One-time, `requiredOnStartup`, removes exact roots without backup; missing root ⇒ `SKIPPED "Not present."`; failure ⇒ `FAILED`, retried next start; terminal success never reruns | Candidate mechanism for DEC-001 option A |
| 2026-10-06 | Code | `src/server-runtime.ts:178,245`; `src/standalone-application-host/start-standalone-application-host.ts:146`; `application-platform-lifecycle.ts:57` | Startup ordering / lockout | `runPending()` runs before `prepareBeforeListen()` → `bootstrapBuiltInAgents()` → definition cache refresh. Failed migrations are logged as warnings; startup continues. | Removal can't lock out startup; catalog refresh after removal |
| 2026-10-06 | Code | `src/run-history/services/agent-run-history-catalog-service.ts:513`; `standalone-host-member-context-builder.ts:34`; backend factories (`autobyteus-agent-run-backend-factory.ts:310`, `codex-thread-bootstrapper.ts:242`, `claude-session-bootstrapper.ts:70`) | Old conversations | History listing tolerates a missing definition (falls back to stored name / ID). Starting a runtime for a run requires the definition ("Agent definition … not found"). | Old built-in conversations stay listed/readable but cannot be continued — same as any deleted shared agent (DEC-002) |
| 2026-10-06 | Code | `src/agent-definition/services/agent-definition-service.ts:300` (`deleteAgentDefinition`) | Existing supported state | Users can already delete shared agents; no team/history reference check exists. A history/Team that references a deleted agent is an existing supported state. | Consequences in DEC-002 match existing behavior |
| 2026-10-06 | Command | `git log --diff-filter=A -- …/project-task-manager/agent.md`; `git tag --contains 028cca231` | Released exposure | Template added 2026-10-05 (`028cca231`); shipped only in `v1.4.95-beta.1`, `-beta.2`, `-beta.3` (beta channel) | Installed copies exist only on beta/dev installs |
| 2026-10-06 | Runtime (read-only listing) | `ls ~/.autobyteus/server-data/agents`; `ls ~/Library/Application Support/autobyteus/server-data` | Whether this machine's installed app has a copy | Neither location contains `autobyteus-project-task-manager` (the user's active data dir was not located). No file was read or modified. | Not needed for requirements; no test against user data |
| 2026-10-06 | Doc | `autobyteus-server-ts/docs/modules/projects.md:25-45`, `autobyteus-web/docs/projects.md:233`, `autobyteus-server-ts/docs/modules/agent_definition.md:120-150`, `TESTING.md` "Project Mutation Regressions" ("Manager bootstrap") | Docs describing shipped manager | Server/web Projects docs state the Manager is shipped with template path and ID | Must be updated |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Every server startup (Studio and standalone host) | Bootstrapper writes `<appData>/agents/autobyteus-project-task-manager/{agent.md,agent-config.json}` from template, clears `skills/`, refreshes cache | Built-in "Project Task Manager" always present in agent catalog; user edits revert on restart | `built-in-agent-bootstrapper.ts`; bootstrapper unit test; smoke script | High |
| BEH-002 | User | User opens agent catalog / New chat / `list_available_agents` with the agent repository configured as a package root | Catalog lists both `autobyteus-project-task-manager` (built-in) and `project-task-manager` (repository), same display name | Duplicate "Project Task Manager" entries; the built-in has no own skill and uses all installed skills | file provider roots; both definitions | High (user-reported) |
| BEH-003 | System | Startup on an install that previously ran a beta with the built-in | Folder `<appData>/agents/autobyteus-project-task-manager/` exists and is rewritten each start | Platform-owned content; edits never survive restart | bootstrapper | High |
| BEH-004 | User | User reopens a previous conversation that used the built-in | History list shows the run; opening shows saved messages; continuing starts the runtime, which loads the definition | Works today because the definition exists | history catalog, backend factories | Medium — exact UI for continuing a deleted-agent run to verify in design/validation |
| BEH-005 | User/Contract | Projects feature (`ENABLE_PROJECTS`) and selected tools on any agent | Tools `list_projects`, `list_project_tasks`, `create_or_update_project`, `create_or_update_task`, `delegate_task`, `send_message_to`, `list_available_agents` are registered independently and selected per agent definition | Tools don't depend on the built-in existing | `docs/modules/projects.md`; tool registrations | High |
| BEH-006 | Contract | `@` collaborator eligibility and web mirror | Server excludes registry built-ins from `@`; web mirror list must equal registry (contract test) | PTM currently not `@`-mentionable | `collaborator-candidate-policy.ts`, `builtInAgentDefinitionIds.ts` | High |
| BEH-007 | System | Other built-ins (Daily Assistant, Retrospective Skill Improver) | Synced each startup; Retrospective Skill Improver setting initialized when blank | Unrelated to PTM | registry, bootstrapper tests | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Registers PTM ID + template | Remove registration | Keep remaining entries unchanged |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/` | Shipped template | Remove | Verify build copies templates (dist absence) |
| `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs` | Asserts PTM dist assets and sync | Update | Assert dist absence like `memory-compactor` |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | PTM prompt/tools test; built-in count 3; agents dir listing | Update | Count becomes 2 |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` | Retired-compactor absence test | Extend for PTM retirement | — |
| `autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts:84-88` | Looks up "Project Task Manager" definition by name and asserts its tools | Update | The node-locality guarantee doesn't need the manager; drop/replace the manager assertion |
| `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts` | Web mirror of built-in IDs | Remove ID | Contract test keeps the mirror honest |
| `autobyteus-web/utils/collaborators/__tests__/draftMentionEligibility.spec.ts` | Uses PTM as built-in fixture | Update | — |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs:1045` | Built-in ID list | Update | — |
| `autobyteus-web/test-support/fixtures/linked-org-history-public.json` | Historical Org history fixture with `agentDefinitionId: autobyteus-project-task-manager` | Historical data; a deleted definition in history is a valid state | Likely keep as faithful history fixture; confirm in design |
| `src/app-data-migrations/*` | One-time startup data changes with ledger and retry | Mechanism for DEC-001 option A | Data Migration Guideline checklist required |
| `src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` | Derives `@` exclusions from registry | No direct change | Repository PTM becomes `@`-eligible like any shared agent |
| `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md`, `docs/modules/agent_definition.md`, `TESTING.md` | Describe the shipped manager / built-in list | Update | Delivery docs sync owns final wording |
| `tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts:4` | Imports a non-existent `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` from the registry (pre-existing; resolves `undefined`) | Not in scope | Note only; unrelated |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Template files (2), registry entry (1), web ID mirror (1 entry), docs (4 files), tests/fixtures (≈6 files).
- Installed app-data folder `<appData>/agents/autobyteus-project-task-manager/` (at most one per install; ≤2 small files + empty `skills/` absent).
- Evidence paths: as above.

### Structural Surfaces

- Built-in bootstrap (registry-driven loop; no structural change needed), app-data migration registry (one new entry if DEC-001 = A).
- No API, GraphQL schema, persistence schema, security boundary, or concurrency change identified.

### Potential Structural Impacts To Investigate

- API or external-contract change: None (catalog simply has one fewer agent).
- Persistence schema or invariant change: None; one app-data folder removal if approved.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: None.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Possible one-time app-data migration (DEC-001).
- Confirmed absent, present, or unknown: Confirmed as above.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Code reading (no runtime probe yet) | Upgrade from beta with built-in | Removing only the registry entry leaves `<appData>/agents/autobyteus-project-task-manager/` resolvable as an ordinary shared agent named "Project Task Manager" | Without cleanup the user-reported duplicate persists on upgraded installs | file provider + bootstrapper |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via agent_package_creator) | Sees duplicate "Project Task Manager"; wants only the agent-repository version | Strong (explicit) | Remove built-in and its installed copy | DEC-001 confirmation |
| User | Keep Project Tasks feature/tools unchanged | Strong | Preserve BEH-005 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Data Migration Guideline | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | No lockout; deletion only with explicit feature-removal approval; checklist in design | §1, §2, §10 | — |
| Agent repository package root | `autobyteus-agents` | Provides `project-task-manager` | folder | Package root configuration is user-controlled; not part of this change |

## Persisted Data And State Facts

- Affected stored or external subject: `<appData>/agents/autobyteus-project-task-manager/` (`agent.md`, `agent-config.json`).
- Location and representative shape: identical to the shipped template (rewritten every startup).
- Approximate volume: one folder, ~2 KB, per install that ran v1.4.95-beta.1..3 or a dev build since 2026-10-05.
- Current readers and writers: writer = built-in bootstrapper; reader = file agent definition provider.
- Current unknown/extra-field behavior: N/A.
- Required semantics or data that must be preserved: run history (including old PTM conversations), Projects/Tasks/context files/agent run resources, all other agents, settings.
- Acceptable loss, reset, rebuild, or regeneration: the installed built-in folder (platform-owned; edits never persisted). Pending DEC-001.
- Privacy, retention, compliance, downtime, or operational constraints: none beyond startup non-lockout.
- Remaining evidence gap: exact UI behavior when continuing an old conversation whose agent was deleted (to confirm in design/validation).

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Other fields: N/A — no UI design change; catalog simply lists one fewer agent.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Exact UI when continuing a deleted-agent conversation | DEC-002 consequence wording | Verify in design/validation | Open |
| RSK-001 | Risk | A user may have placed the built-in in a Team/Org they authored; that Team/Org would fail to launch until the member is replaced | Same as deleting any shared agent today | User decision DEC-002 | Open |
| RSK-002 | Risk | Downgrading to a beta that ships the built-in recreates the folder; after re-upgrade the one-time cleanup does not run again | Downgrade isn't a supported path | Recorded as unsupported (SCN-007) | Accepted pending approval |
| ASM-001 | Assumption | The user's agent repository is configured as a package root where they want the Project Task Manager | Otherwise no Project Task Manager would be listed after removal | User confirmation | Open |

## Architecture Investigation Findings

Recorded 2026-10-06 after SR-001 approval. Data Migration Guideline reviewed at base `1aa918298`.

| ID | Source / Command | Observation | Design Implication |
| --- | --- | --- | --- |
| AF-001 | `src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts` + `tests/unit/app-data-migrations/remove-external-messaging-data-migration.test.ts` | Closest predecessor. Exact roots are passed in by the registry. `lstat` → ENOENT ⇒ `SKIPPED "Not present."`; `rm({recursive, force})` (unlinks a symlink without following it) ⇒ `MIGRATED`. Any inspect/remove error ⇒ item `FAILED`, aggregate `FAILED` with an `errorMessage`, no throw. `requiredOnStartup: true`, default `ANYTIME` policy, no prerequisites. Tests cover delete, missing, siblings untouched, rm failure, lstat failure, symlink, retry. | Reuse the same shape for one root |
| AF-002 | `src/app-data-migrations/app-data-migration-runner.ts:56-80` | `runPending` skips terminal `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS`; otherwise runs; exceptions become `FAILED` records; never throws to startup | One-time semantics and retry-on-next-start come from the runner; no extra marker |
| AF-003 | `src/server-runtime.ts:178` vs `:245`; `src/standalone-application-host/start-standalone-application-host.ts:146`; `application-platform-lifecycle.ts:57` | Both entrypoints run `runPending()` before `prepareBeforeListen()` → `bootstrapBuiltInAgents()` → cache refresh. A FAILED migration only logs a warning. | Removal lands before the catalog is built; no lockout |
| AF-004 | `src/config/app-config.ts:354` | `getAgentsDir()` = `ensureDataSubdirectory("agents")`; same dir the bootstrapper writes | Registry resolves the root as `path.join(getAgentsDir(), "autobyteus-project-task-manager")` |
| AF-005 | `scripts/copy-build-assets.mjs`, `scripts/clean-build-output.mjs`, `package.json` `build:full` | `dist/` is deleted, then templates are re-copied wholesale; `build:full` runs the built-in smoke | Deleting the template removes it from built output; the smoke must assert its absence |
| AF-006 | `src/agent-definition/providers/file-agent-definition-provider.ts:49-58,218-226` | New shared agents get slug IDs from their name, with a numeric suffix if the folder exists | A user agent gets ID `autobyteus-project-task-manager` only if named exactly "AutoByteus Project Task Manager" on an install without the built-in: Technically Possible but Unsupported/Contrived (design premise PREM-001) |
| AF-007 | `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts:5` | Only consumer of `test-support/fixtures/linked-org-history-public.json`; it is historical Org-history data | Keep the fixture unchanged: history may reference a removed agent |
| AF-008 | `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs:1045` | Hard-coded built-in list mirrors server policy | Drop the PTM ID |
| AF-009 | `autobyteus-server-ts/README.md:174-190` | Each required startup migration is documented in the server README | Add a paragraph for the new migration |
| AF-010 | `git grep -n -i "the Manager"` in server/web docs | Generic "the Manager" (non-owned delegator run) wording in `projects.md:219,278`, `agent_team_execution.md:383,506` stays valid for any managing agent; only the "shipped Project Task Manager" passages (`docs/modules/projects.md:25-45`, `autobyteus-web/docs/projects.md:233-243`) and TESTING.md "Manager bootstrap" are stale | Docs delta is bounded |
| AF-011 | Backend factories (`autobyteus-agent-run-backend-factory.ts:310`, `codex-thread-bootstrapper.ts:242`, `claude-session-bootstrapper.ts:70`); `agent-run-history-catalog-service.ts:513` | Continuing a run whose definition is missing raises the existing "not found" error at run start; listing falls back to the stored name or ID | AC-008 is existing deleted-agent behavior; validation confirms the outward result (closes UNK-001 at validation) |

## Requirement Implications

- Removing the registry entry and template is necessary but not sufficient: upgraded installs keep a visible shared agent with the same name, so the user's problem is only solved by also removing the installed copy (DEC-001 option A).
- Project rules allow deletion of platform-owned app data only with explicit feature-removal approval, and require that cleanup never blocks startup.
- Old conversations and any user Team/Org references follow the existing "deleted shared agent" behavior; rewriting them to the repository agent would guess identity (forbidden by the guideline) and the two agents differ in tools and instructions.

## Notes For Architecture Design

- Candidate mechanism: new one-time app-data migration modeled on `remove-external-messaging-data-migration.ts`, removing exactly `<appData>/agents/autobyteus-project-task-manager`; answer the guideline §2 checklist.
- Confirm migration runs before catalog refresh in both startup entrypoints (evidence: `server-runtime.ts:178` vs `:245`).
- Update tests/docs listed in the codebase table; keep the web mirror contract test green.
