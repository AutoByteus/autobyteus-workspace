# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: SR-001 (REQ-001..008, AC-001..010), approved by the user on 2026-10-06. DEC-001 = A (delete the installed copy once). DEC-002 consequences accepted. See `requirements-doc.md` → Document Status.
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/investigation-notes.md` (Source Log; Architecture Investigation Findings AF-001..AF-011)

## Current-State Read

- The built-in bootstrapper (`src/built-in-agents/`) loops over `BUILT_IN_AGENT_DEFINITIONS`. On every startup it rewrites each listed agent into `<appData>/agents/<id>/` from `templates/<dir>/`. The Project Task Manager is one registry row plus one template folder; nothing in the bootstrapper is specific to it.
- Two consumers derive behavior from the registry: `@` exclusion on the server (`collaborator-candidate-policy.ts`) and a hand mirror on the web (`builtInAgentDefinitionIds.ts`, pinned by a contract test).
- Removing the registry row stops future writes but leaves an existing `<appData>/agents/autobyteus-project-task-manager/` folder. The file provider reads every folder under `<appData>/agents` as a shared agent, so that folder stays visible as a second "Project Task Manager" (BEH-002/003).
- Startup already has the right place for a one-time cleanup: the app-data migration runner. It runs before the built-in bootstrap and the catalog refresh in both entrypoints, records a status, retries non-terminal results on the next start, and never blocks startup (AF-002, AF-003).
- No structural problem exists. The registry-driven design already absorbs removal of one entry.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: The change touches about 15 files, all inside existing owners (built-in registry and templates, app-data migration registry, web built-in mirror, tests, docs). Most of the delta is deletion and test/doc updates. The only new production code is one small migration (about 60 lines) that copies an existing pattern.
- Architectural risk: `High`
- Risk rationale and supporting evidence: Content volume is small, but one structural surface changes: a new required startup app-data migration that permanently deletes a folder from users' app data, with no backup. The architecture standard lists persistence migrations as High. The Data Migration Guideline (§2 item 10) asks for independent review of the risk. Everything else is payload removal with no API, schema, concurrency, security or ownership change.
- Escalation trigger if implementation or validation discovers new impact: Return a Design Impact if any of the following turns up: a reader other than the file agent provider that depends on the built-in's existence; the migration needing to touch anything beyond the one exact folder; the cleanup's place in startup order differing from AF-003; or continuing a deleted-agent run (AC-008) doing anything worse than the existing "not found" failure (e.g. breaking the history list or crashing the app).

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Predecessor migration | AF-001 | Exact-root deletion pattern with SKIPPED/MIGRATED/FAILED items | Copy its shape for one root | None |
| Runner semantics | AF-002 | Terminal success is skipped; failures retry next start | No custom marker or journal | None |
| Startup order | AF-003 | Migrations run before bootstrap and catalog refresh in both entrypoints | Catalog never shows the removed copy after a successful run | None |
| Agents dir | AF-004 | `getAgentsDir()` is the bootstrapper's target | Root = `getAgentsDir()/autobyteus-project-task-manager` | None |
| Build assets | AF-005 | Templates are re-copied wholesale into a cleaned `dist/` | Deleting the source template is sufficient; smoke asserts absence | None |
| ID allocation | AF-006 | User agents could get this ID only via an exact name on an install that never had the built-in | PREM-001 is contrived; no ownership guard | None |
| Fixture consumer | AF-007 | Historical Org fixture referencing the ID | Keep it unchanged | None |
| Deleted-agent runs | AF-011 | Existing "not found" at run start; listing tolerant | No new handling (REQ-006) | Outward UI confirmed in validation |

## Intended Change

1. Delete the built-in: the registry row and constant, plus the `templates/project-task-manager/` folder.
2. Add a one-time required startup migration, `20261006_remove_built_in_project_task_manager`, that removes exactly `<appData>/agents/autobyteus-project-task-manager/`, without backup.
3. Remove the ID from the web mirror and from tests/probes that list the built-ins. Make the bootstrapper and smoke tests assert that the built-in is retired. Make the node-locality E2E stop depending on a shipped manager.
4. Update the docs (server/web Projects docs, the server README migration list, TESTING.md).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-007; AC-001, AC-009 | Every startup | Bootstrapper writes all registry entries | Registry has only Retrospective Skill Improver and Daily Assistant | DS-002 |
| BEH-002 | User | REQ-001; AC-002 | Catalog listing | File provider lists `<appData>/agents/*` plus package roots | Only the repository `project-task-manager` remains | DS-001 → DS-002 → catalog |
| BEH-003 | System | REQ-002, REQ-003, REQ-004; AC-002..AC-006 | First start of new version | Folder exists on beta/dev installs | Removed once; failure retried; nothing else touched | DS-001 |
| BEH-004 | User | REQ-006; AC-008 | Open/continue old run | History tolerant; run start needs definition | Unchanged code; existing outcome | N/A (no change) |
| BEH-005 | User/Contract | REQ-005; AC-007 | Project tools | Independent tool registrations | Unchanged | N/A (no change) |
| BEH-006 | Contract | REQ-007; AC-009 | `@` eligibility | Derived from registry; web mirror | Mirror drops the ID; server follows registry automatically | DS-002 |
| BEH-007 | Contract | REQ-008; AC-010 | Docs | Docs claim a shipped manager | Rewritten | N/A |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (feature removal)
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: The bootstrapper and `@` policy are registry-driven (Current-State Read). The migration runner already provides one-time, retried and non-blocking semantics (AF-002/003).
- Design response: Delete the registry row and template. Add one migration in the existing migration subsystem.
- Refactor rationale: Owners, boundaries and file placement remain healthy. No new abstraction is warranted (DESIGN.md: prefer deletion and existing owners).
- Intentional deferrals and residual risk, if any: The unrelated pre-existing bad import in `collaborator-admission.test.ts` is out of scope.

## Terminology

- *Installed copy*: the folder `<appData>/agents/autobyteus-project-task-manager/` that earlier builds wrote at startup.

## Design Reading Order

Followed as given in the template; sections below are proportionate.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the registry constant `PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID`, its registry row, and the template folder. No alias, no "retired IDs" list in current code, and no current-runtime reader that knows the old ID. Only the migration file holds the frozen literal `autobyteus-project-task-manager`, as the guideline requires (old shapes live only inside registered migrations). Tests may hold the literal to prove retirement.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: `<appData>/agents/autobyteus-project-task-manager/` holding `agent.md` and `agent-config.json` identical to the shipped template (rewritten every start), about 2 KB, at most one per install. It exists only on installs that ran v1.4.95-beta.1..3 or a dev build since 2026-10-05.
- Relevant code-model, serialization, semantic, or physical-store change: The platform stops owning this ID. Left in place, the folder would change meaning from "platform-owned built-in" to "ordinary shared agent", which is the user-visible duplicate.
- Normal reader/writer behavior and representative evidence: Reader: file agent provider (lists every subfolder). Writer: bootstrapper (removed). Evidence: AF-004, Source Log.
- Required semantics and invariants under direct use: Direct use would keep the duplicate, which contradicts REQ-002.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: The contents are reproducible template copies with no user edits, so disposal is safe. No privacy content.
- Decision: `Migration Required` (an approved feature-removal deletion, guideline §10 precedent `remove-external-messaging-data-migration.ts`)
- Decision rationale: Neither a tolerant reader nor leaving the folder satisfies REQ-002. A runtime filter that hides the ID would be a permanent legacy branch in current code (rejected below). The cost is one `lstat` and one `rm` per install, once.
- Acceptance criteria or design constraints supported by this decision: AC-002..AC-006.

### Data Migration Guideline §2 checklist

1. **Need:** Yes. Explicit user-approved feature removal (DEC-001 = A). A tolerant reader can't remove a visible duplicate without a legacy filter.
2. **Availability:** Yes. The migration can't block startup or new work. FAILED only logs a warning (AF-003). It reads no history.
3. **Source and target:** Source is the exact folder written by beta builds (the template content inspected in the Source Log). The target is absence. There is no predecessor migration for this folder. No current owner admits a target, because the folder simply disappears from the file provider.
4. **Disposition:** Present ⇒ removed (`MIGRATED`). Absent ⇒ `SKIPPED "Not present."`. Inspect/remove error ⇒ `FAILED` with a reason, and the folder is left as is. History, Teams, Orgs and Projects that reference the ID are dependents that are left untouched (REQ-004/006). Aggregate status says only whether this folder was handled. It grants no admission.
5. **Commit and retry:** A single recursive `rm` is the commit. Partial removal on failure is fine: the retry deletes whatever remains. No backup, hash or journal, justified by template-only content and explicit approval.
6. **Current-only boundary:** The literal ID lives only in the migration file. Current runtime code has no reference to the old ID.
7. **Cost:** One `lstat` and at most one recursive `rm` of about 2 files, once per install. Startup after terminal success does nothing.
8. **References:** Outbound references to the ID (run history, Team/Org definitions, featured-items setting) are not rewritten. They follow existing deleted-agent behavior, validated when used (DEC-002).
9. **Evidence:** Unit tests (migration behavior, sibling preservation, failure/retry, symlink) and a startup-path test proving catalog result and restart (AC-002/003/006). See Guidance.
10. **Lessons and review:** Consulted `remove-external-messaging-data-migration.ts` (pattern adopted) and the Memory Compactor retirement in `context-compaction-simplification-analysis` SR-017. Its "leave inert" choice was rejected here because this folder is user-visible as a duplicate. Avoided: backups, ownership heuristics, runtime filters. Independent risk review by the architecture reviewer.

### Migration Plan

- Current canonical schema / version: N/A (no format change; folder absence)
- Older persisted schema version(s) that require transformation: the installed-copy folder from v1.4.95-beta.1..3 and dev builds
- Why direct use and discard/rebuild are insufficient: Direct use keeps the duplicate. Removal *is* the discard.
- Migration trigger: `Startup` (`requiredOnStartup: true`; default `ANYTIME` policy like the predecessor, so a manual retry is also available)
- Migration owner and file / subsystem location: `autobyteus-server-ts/src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.ts`, registered last in `app-data-migration-registry.ts`
- Normal business/runtime path that remains current-schema-only: file agent provider and bootstrapper. Neither knows the old ID.
- Historical-shape types or decoders confined to migration-owned code: only the frozen literal folder name
- Completion marker / version ledger: the existing migration record (runner)
- Restart-safety or idempotency strategy: An absent folder ⇒ SKIPPED/SUCCEEDED. A partially removed folder is removed on retry.
- Validation before current runtime proceeds: `rm` success is the validation. No admission gate.
- Backup / rollback / quarantine / operator-recovery strategy: None (approved deletion of template-only content). Failure shows as FAILED with the runner's retry action.
- Concurrent old/new application access risk and cutover / maintenance / deployment-sequencing decision: Not a supported scenario (one writer, guideline §5). Downgrade then re-upgrade is SCN-007, unsupported.
- Historical migration retention decision: Keep registered until a release declares a minimum upgrade-from version (guideline §4).

| Migration Step | Source Shape / Version | Target Shape / Version | Transformation Owner | Validation | Failure / Recovery Behavior |
| --- | --- | --- | --- | --- | --- |
| Remove installed copy | `<agentsDir>/autobyteus-project-task-manager/` present | absent | `RemoveBuiltInProjectTaskManagerMigration` | `rm` resolves | Item FAILED + aggregate FAILED with message; retried on next start; startup continues |

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | BEH-002, BEH-003 | Startup `runPending()` | Folder absent + migration record | `AppDataMigrationRunner` → new migration | Removes the duplicate once |
| DS-002 | Primary End-to-End | BEH-001, BEH-002, BEH-006 | Startup `prepareBeforeListen()` | Catalog/`@` without the built-in | `BuiltInAgentBootstrapper` (registry-driven) | Ensures it never comes back |

## Primary Execution Spine(s)

`Server start → AppDataMigrationRunner.runPending → RemoveBuiltInProjectTaskManagerMigration.execute (lstat → rm) → record` then `→ prepareBeforeListen → bootstrapBuiltInAgents (2 entries) → AgentDefinition cache refresh → catalog / @ policy`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | On first start, the runner sees no terminal record and runs the migration. The migration removes the one folder if present and returns a summary. The runner records the result and does not run it again after success. | runner, migration, migration record | Runner | Logging of FAILED (existing) |
| DS-002 | The bootstrapper syncs the two remaining built-ins and refreshes the cache. The catalog then contains no `autobyteus-project-task-manager`. `@` exclusion follows the shorter registry. | bootstrapper, registry, definition cache | Bootstrapper | Web mirror parity (contract test) |

## Spine Actors / Main-Line Nodes

`AppDataMigrationRunner`, `RemoveBuiltInProjectTaskManagerMigration`, `BuiltInAgentBootstrapper`, `BUILT_IN_AGENT_DEFINITIONS`.

## Ownership Map

- Runner: ordering, record, retry, status (unchanged).
- New migration: exactly one path's removal and its item detail/summary. It formats no status text (guideline §8).
- Registry: the authoritative list of built-ins (one row fewer).
- Bootstrapper: unchanged code.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No new facade.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID` + registry row (`built-in-agent-registry.ts`) | Built-in retired | Repository agent `project-task-manager` (outside this repo) | In This Change | No alias |
| `src/built-in-agents/templates/project-task-manager/` (`agent.md`, `agent-config.json`) | Built-in retired | — | In This Change | dist follows (AF-005) |
| `'autobyteus-project-task-manager'` in `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts` | Mirror must equal registry | — | In This Change | Contract test enforces |
| PTM prompt/tools test and PTM assertions in `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | Asserted shipped behavior | Retirement assertions | In This Change | Count 3 → 2; agents-dir listing drops the ID |
| PTM dist/sync assertions in `scripts/smoke-built-in-agents-bootstrap.mjs` | Same | `assertDistTemplateAbsent("project-task-manager")` | In This Change | Mirror the memory-compactor pattern |
| Manager lookup/assertions in `tests/e2e/projects/project-mutation-node-locality.e2e.test.ts:84-88` and `managerToolNames` in its receipt log | The node-locality guarantee doesn't depend on a shipped manager | — (tools are called directly over MCP already) | In This Change | Keep the rest of E-008 unchanged |
| PTM entries in `autobyteus-web/utils/collaborators/__tests__/draftMentionEligibility.spec.ts` and `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs:1045` | No longer a built-in | — | In This Change | In the spec, drop the PTM agent row and its `not.toContain` line |
| "Shipped Project Task Manager" doc passages | Stale | Neutral wording (any agent selecting the Project tools, e.g. the agent repository's Project Task Manager) | In This Change | `docs/modules/projects.md`, `autobyteus-web/docs/projects.md`, TESTING.md "Manager bootstrap" |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

DS-001: parent owner is the runner. `lstat → (ENOENT ⇒ SKIPPED) | rm → MIGRATED | error ⇒ FAILED`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Web built-in mirror + contract test | DS-002 | Web `@` candidates | Keep the client list equal to the server list | No catalog marker for built-ins | Drift breaks first-message `@` |
| Server README migration entry | DS-001 | Operators | Document the deletion | Existing convention (AF-009) | — |

## Ownership Boundaries

The migration resolves nothing itself. The registry passes the exact path, as in the predecessor. The runner remains the only owner of status, retry and the attempt log.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AppDataMigrationRunner` | Migration execution, records | Server and standalone startup | Calling the migration's `execute()` from bootstrap or other startup code | N/A |

## Dependency Rules

- The migration file must not import `built-in-agent-registry.ts` (the constant is deleted) or any agent-definition service. It uses only `node:fs/promises` and the migration types.
- Current runtime code (bootstrapper, providers, collaborator policy, web) must not reference `autobyteus-project-task-manager`.
- The bootstrapper must not be given deletion duties ("retired IDs" cleanup inside the bootstrap loop). Removal belongs to the migration subsystem.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir: string)` | One installed-copy folder | Remove it once | Absolute path from the registry | Mirrors the predecessor's constructor-injected roots |
| `REMOVE_BUILT_IN_PROJECT_TASK_MANAGER_MIGRATION_ID` export | Migration ID | Tests/docs | `"20261006_remove_built_in_project_task_manager"` | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Migration constructor | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Migration class | `RemoveBuiltInProjectTaskManagerMigration` | Yes | Low | — |
| Migration file | `remove-built-in-project-task-manager-migration.ts` | Yes | Low | Matches `remove-*-migration.ts` siblings |
| Display name | "Remove built-in Project Task Manager" | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| One-time startup deletion with retry | App-data migrations | Reuse | Exact fit (AF-001/002) | — |
| Built-in list | Built-in registry | Reuse | Delete a row | — |
| Generic "remove roots" helper shared with messaging migration | — | Not created | Two small call sites; a shared helper would couple a released migration to new code | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/built-in-agents` | Built-in list/templates | DS-002 | Bootstrapper | Reuse (shrink) | — |
| `src/app-data-migrations` | One-time removal | DS-001 | Runner | Extend (one migration) | — |
| `autobyteus-web/utils/agents` | Mirror | DS-002 | `@` candidates | Reuse (shrink) | — |

## Draft File Responsibility Mapping

See Final mapping below (no extraction step changed it).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| lstat/rm item-detail logic also in messaging migration | None (kept local) | — | Not shared: released migrations stay self-contained | N/A | N/A | A shared helper that a released migration depends on |

## Shared Structure / Data Model Tightness Check

N/A. No new shared types. Uses existing `AppDataMigrationDefinition`/`AppDataMigrationItemDetail`.

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.ts` (new) | App-data migrations | Migration definition | Remove one folder once; return summary | One migration per file | Migration types |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migrations | Registry | Register last with `path.join(appConfigProvider.config.getAgentsDir(), "autobyteus-project-task-manager")` | Existing | — |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Built-ins | Registry | Two built-ins | Existing | — |
| `autobyteus-server-ts/tests/unit/app-data-migrations/remove-built-in-project-task-manager-migration.test.ts` (new) | Tests | — | Migration behavior | One test per migration | — |

## Applied Patterns (If Any)

Registry (existing built-in and migration registries).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/` | Folder | — | **Delete** | Retired | — |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | File | Registry | Remove constant + row | — | Retired-ID lists |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.ts` | File (new) | Migration | Removal | Sibling `remove-*` migrations | Registry/agent-service imports |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | File | Migration registry | Register (append after `ProjectsPerFolderV1AppDataMigration`) | — | — |
| `autobyteus-server-ts/tests/unit/app-data-migrations/remove-built-in-project-task-manager-migration.test.ts` | File (new) | Tests | See Guidance | — | — |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | File | Tests | Drop PTM test; count 2; agents-dir list; assert a stale `autobyteus-project-task-manager` folder is not rewritten by bootstrap (removal is the migration's job) | — | — |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` | File | Tests | Add PTM retirement (no registry entry, no template) | — | — |
| `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs` | File | Build smoke | Assert dist absence; drop PTM sync assertions | — | — |
| `autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts` | File | Tests | Remove manager lookup/assertions and receipt field | — | — |
| `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts` | File | Web mirror | Drop ID | — | — |
| `autobyteus-web/utils/collaborators/__tests__/draftMentionEligibility.spec.ts` | File | Tests | Drop PTM fixture row/assertion | — | — |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | File | Probe | Drop ID from list | — | — |
| `autobyteus-web/test-support/fixtures/linked-org-history-public.json` | File | Fixture | **Unchanged** (historical data, AF-007) | — | — |
| `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/README.md`, `TESTING.md` | Docs | Docs | Remove shipped-manager claims; add migration paragraph | — | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/app-data-migrations/migrations/` | Persistence-Provider | Yes | Low | Existing convention |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Where cleanup lives | Registered migration, run by the runner, recorded once | A "retiredBuiltInIds" loop in the bootstrapper that deletes folders every start | Keeps current runtime free of old IDs; once-only, with status and retry |
| Hiding vs removing | Delete the folder | Filter `autobyteus-project-task-manager` out of catalog listings | A filter is a permanent legacy branch and leaves data that other paths still load |
| Old references | Leave history/Team refs as they are | Rewrite them to `project-task-manager` | Different agent; guessing identity is forbidden |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the built-in ID as an alias of the repository agent | Keep old conversations continuable | Rejected | DEC-002: existing deleted-agent behavior |
| Catalog filter for the old ID | Avoid deleting data | Rejected | One-time migration |
| Keep the ID in the web mirror / `@` exclusion list | Defensive | Rejected | Mirror equals the registry |
| Backup copy of the folder before deletion | Caution | Rejected | Template-only content; explicit approval (guideline §7) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add the migration and its unit test. Register it last.
2. Remove the registry constant and row. Delete the template folder.
3. Update the web mirror and web tests/probe. Update the bootstrapper/templates unit tests and the smoke script. Update the node-locality E2E.
4. Update the docs (Projects docs, server README migration list, TESTING.md).
5. Run `git grep -n "autobyteus-project-task-manager\|PROJECT_TASK_MANAGER"` outside `tickets/`. Expected remaining hits: the migration file, its test, the registry registration, retirement tests, the historical web fixture and its provenance, and the README paragraph.

## Key Tradeoffs

- Deletion without backup is simpler and approved. The folder never held user edits.
- High risk classification because of the irreversible data change, even though the code delta is small. This buys an independent check of one deletion path.

## Risks

- PREM-001 (Technically Possible but Unsupported/Contrived): on an install that never had the built-in, a user who named an agent exactly "AutoByteus Project Task Manager" would have it deleted. No guard is added (DESIGN.md: no speculative edge handling). Recorded so review doesn't re-raise it as a blocker.
- SCN-007 downgrade re-creation is unsupported.
- A failed removal leaves the duplicate visible until a later start succeeds. This is accepted (REQ-003).

## Guidance For Implementation

- Copy the predecessor's `removeRoot` logic for a single item (`itemId: "installedAgentDir"`). `status` is `FAILED` iff the item failed. The `errorMessage` says the folder could not be removed and that cleanup retries on next start. `description`: "Permanently deletes the retired built-in Project Task Manager agent folder (`agents/autobyteus-project-task-manager`) from app data. No backup is made."
- Unit tests, adapted from `remove-external-messaging-data-migration.test.ts`:
  - ID/required/no prerequisites;
  - deletes the folder (with `agent.md`, `agent-config.json`, and a `skills/` subfolder);
  - missing ⇒ SKIPPED + SUCCEEDED;
  - sibling agents untouched: `<agentsDir>/project-task-manager`, `autobyteus-daily-assistant`, a user agent, plus a memory/run-history file;
  - rm failure ⇒ FAILED, no throw, folder retained;
  - lstat failure;
  - symlink root removed without touching its target;
  - retry succeeds.
- AC-002/003/006 proof: a test on owned temp app data that seeds the installed copy, a package-root `project-task-manager`, a history file and a Project. It runs the runner (`AppDataMigrationRunner` with the real registry or an in-memory record repo) and then `bootstrapBuiltInAgents`. It asserts the catalog has exactly one "Project Task Manager" with ID `project-task-manager`, and that the other files are byte-identical. It then runs a second time and asserts the migration is skipped and the folder stays absent. Pick the smallest real layer per TESTING.md. Never use the user's app data.
- AC-008: confirm in API/E2E that an old run referencing the removed ID still lists and reads, and that continuing it yields the existing not-found error without affecting other runs.
- Run per TESTING.md: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/built-in-agents tests/unit/app-data-migrations tests/unit/agent-collaboration --no-watch`; server build (`build:full` runs the built-in smoke); `tests/e2e/projects`; `pnpm -C autobyteus-web test:nuxt utils/agents utils/collaborators stores/__tests__/runHistoryStore.spec.ts --run`.
- Stage paths explicitly. Never `git add -A`.
