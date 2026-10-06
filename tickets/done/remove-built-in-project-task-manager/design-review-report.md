# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/requirements-doc.md` (SR-001, Approved 2026-10-06)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/investigation-notes.md` (AF-001..AF-011)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: None exist. History reference only: `approval-request.sr001.md`, `architecture-review-handoff.sr002.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Initial architecture review of the SR-002 design (Medium / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Read-only inspection of worktree `codex/remove-built-in-project-task-manager` at base `1aa918298`:
  - `remove-external-messaging-data-migration.ts`, `app-data-migration-registry.ts` and `app-data-migration-runner.ts` (`runPending`, `runMigration`, execution policy)
  - `built-in-agent-bootstrapper.ts` and `built-in-agent-registry.ts`
  - `server-runtime.ts:178/245`, `start-standalone-application-host.ts:146/312`, `application-platform-lifecycle.ts` and `build-application-platform-runtime.ts:202`
  - `file-agent-definition-provider.ts` (`nextAgentId`, `create`) and `agent-definition-service.ts` `createAgentDefinition`
  - `cached-agent-definition-provider.ts`
  - Data Migration Guideline §2, §4, §8, §10
  - `ServerMigrationsManager.vue` (manual retry surface)
  - a full `git grep` of PTM references outside `tickets/`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: Most of the work is deletion inside existing owners, about 15 files. The one structural surface is a new required startup migration that deletes app data permanently, with no backup. Data Migration Guideline §2 item 10 calls for independent review of that risk.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The High rating is justified by the irreversible app-data deletion, not by the code volume.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - The server stops shipping and installing the built-in `autobyteus-project-task-manager`.
  - On upgraded installs, the one installed copy is removed once, without a backup (DEC-001 = A).
  - The removal never blocks startup and retries on the next start.
  - Nothing else in app data changes.
  - Old runs stay readable but can't be continued (DEC-002).
  - Projects and its tools are unchanged.
- Relevant existing behavior and evidence confirmed:
  - The bootstrapper rewrites `agent.md` and `agent-config.json` for every registry ID on every start, and `rm`s and mirrors `skills/`. That makes the installed copy fully platform-owned: anything added between starts is wiped on the next start anyway.
  - The file provider treats every folder under `<appData>/agents` as a shared agent, so the copy survives as a duplicate if it is only de-registered.
  - `runPending()` runs before `prepareBeforeListen()` → `bootstrapBuiltInAgents()` → cache refresh in both entrypoints.
  - In both entrypoints, a FAILED status for this migration only logs a warning. The only startup gate is the unrelated `CUSTOM_PROVIDER_READABLE_ID` check.
  - The runner skips terminal successes and retries anything else.
- Scope guardrail confirmed: `Yes`. In scope: UC-001..004. Out of scope / non-goals: the repository agent, package-root configuration, Projects behavior, rewriting history and Team references, other built-ins, the Memory Compactor folder, downgrades. Preserved boundary and review authority are as written in the requirements.
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (there are none)
- Remaining material ambiguity, if any: UNK-001 (how the "continue" failure looks to the user) is still open. It is an existing deleted-agent behavior the design does not change, and AC-008 covers it in validation. It does not block the design.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (registry and bootstrapper loop verified) | Pass (DS-002: the registry shrinks to 2 entries; the bootstrapper code is unchanged) | Confirmed | None |
| BEH-002 | User | Pass | Pass (file provider reads `<appData>/agents/*` and package roots; the IDs differ) | Pass (DS-001 runs before DS-002, then the cache refresh) | Confirmed | None |
| BEH-003 | System | Pass | Pass (runner semantics and startup order verified in both entrypoints) | Pass (DS-001: lstat → rm → record; FAILED only warns) | Confirmed | None |
| BEH-004 | User | Pass | Pass (AF-011; deleting a shared agent is already a supported state) | Pass (no code change) | Confirmed | AC-008 validation closes UNK-001 |
| BEH-005 | User/Contract | Pass | Pass (tools are registered independently) | Pass (no change) | Confirmed | None |
| BEH-006 | Contract | Pass | Pass (`collaborator-candidate-policy` is derived from the registry; the web mirror has a contract test) | Pass | Confirmed | None |
| BEH-007 | Contract | Pass | Pass (grep confirms the stale passages in `projects.md` in server and web, and TESTING.md "Manager bootstrap") | Pass | Confirmed | None |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Cleanup / feature removal | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`. The bootstrapper and `@` policy are both driven by the registry, which I verified | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `No` | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | One registry row is removed; one migration goes into the existing subsystem | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded local (runner → migration → record) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary: startup → bootstrapper → cache → catalog / `@` | Pass | Pass | N/A | Pass | Pass | Pass (web mirror stays off-spine) | Pass |

The combined primary execution spine (`Server start → runPending → migration → record → prepareBeforeListen → bootstrap → cache refresh → catalog`) covers the full business path.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppDataMigrationRunner` | Pass | Pass | Pass | Pass | Calling `execute()` directly from bootstrap code is explicitly forbidden |
| `BuiltInAgentBootstrapper` | Pass | Pass | Pass | Pass | Explicitly forbidden from taking on deletion duties |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New migration | Pass | Pass | Pass | Pass | Uses only `node:fs/promises` and the migration types; must not import the built-in registry or agent services |
| Current runtime (bootstrapper, providers, policy, web) | Pass | Pass | Pass | Pass | No reference to the old ID |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `new RemoveBuiltInProjectTaskManagerMigration(installedAgentDir: string)` | Pass | Pass | Pass (absolute path resolved by the registry) | Low | Pass |
| `REMOVE_BUILT_IN_PROJECT_TASK_MANAGER_MIGRATION_ID` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| One-time startup deletion with retry | Pass | Pass | N/A | Pass | The app-data migration subsystem is an exact fit |
| Shared "remove roots" helper | Pass | Pass | N/A (not created) | Pass | Keeping released migrations self-contained matches the guideline's frozen-copy stance |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/built-in-agents` | Pass | Pass (shrink) | Pass | Pass | — |
| `src/app-data-migrations` | Pass | Pass (one migration) | Pass | Pass | — |
| `autobyteus-web/utils/agents` | Pass | Pass (shrink) | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| lstat/rm item logic (also in the messaging migration) | Pass | N/A | N/A | Pass | Duplication is deliberate and bounded; it keeps the released migration from depending on new code |

## Shared Structure / Data Model Tightness Verdict

N/A. No new shared types; the design reuses `AppDataMigrationDefinition` and `AppDataMigrationItemDetail`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `migrations/remove-built-in-project-task-manager-migration.ts` (new) | Pass | Pass | N/A | Pass | — |
| `app-data-migration-registry.ts` | Pass | Pass | N/A | Pass | Appended after `ProjectsPerFolderV1AppDataMigration`; no prerequisites |
| `built-in-agent-registry.ts` | Pass | Pass | N/A | Pass | — |
| Tests, smoke, web mirror, probe, docs | Pass | Pass | N/A | Pass | Matches the full `git grep` inventory; the historical fixture stays unchanged (AF-007) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.ts` | Pass | Pass | Low | Pass | Follows the `remove-*-migration.ts` sibling convention |
| `tests/unit/app-data-migrations/remove-built-in-project-task-manager-migration.test.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Registry constant and row, template folder | Pass | Pass (repository agent, outside this repo) | Pass | Pass | dist follows from `copy-build-assets` (AF-005); the smoke asserts absence |
| Web mirror entry, web spec, live probe | Pass | N/A | Pass | Pass | Contract test enforces parity |
| Bootstrapper and template tests, smoke | Pass | Pass (retirement assertions) | Pass | Pass | — |
| Node-locality E2E manager lookup | Pass | N/A | Pass | Pass | — |
| Stale docs (`projects.md` in server and web, TESTING.md "Manager bootstrap") | Pass | Pass | Pass | Pass | I checked `agent_definition.md`: it lists only the two remaining built-ins, so no change is needed there |
| Final `git grep` sweep with expected residue | Pass | — | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Built-in ID | No (aliases, catalog filter, retired-ID list and mirror retention all explicitly rejected) | Pass | Pass | The frozen literal lives only in the migration file and its tests, per guideline §4 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<appData>/agents/autobyteus-project-task-manager/` | `Migration Required` (an approved feature-removal deletion; DEC-001 = A) | Pass | Pass | Pass | Pass | See the detailed check below |

Detailed check:

- **Need:** Direct use keeps the user-visible duplicate (REQ-002). A runtime filter would be a permanent legacy branch. Deletion is therefore the minimal satisfying transition.
- **Contents:** I verified the folder holds only platform-owned contents. The bootstrapper overwrites both files and `rm`s and mirrors `skills/` on every start, so nothing a user could have put there survives a restart today. Deleting it causes no loss relative to existing behavior.
- **Isolated ownership:** One new migration under the runner, plus one registry entry. The bootstrapper gets no deletion duty.
- **Ordering:** It runs before `prepareBeforeListen` and the cache refresh in both the Studio and standalone entrypoints. I verified this.
- **Validation and completion:** `rm` resolving is the commit. The runner records SUCCEEDED, and terminal success never runs again.
- **Interruption and recovery:** `rm({recursive, force})` is idempotent on a partial tree. FAILED is retried at the next start and never throws to startup (REQ-003, AC-004).
- **Backup:** None. Justified by the template-only contents and explicit approval (DEC-001, guideline §10 precedent).
- **Scope:** Exactly one path is resolved from `getAgentsDir()`. There is no scan (QR-002 and the REQ-004 invariant). Symlink handling follows the predecessor: the link itself is unlinked and its target is never followed.
- **Runner contracts (§8):** The migration returns counts and details and formats no status text.
- **Retention (§4):** Kept registered until a minimum upgrade-from version is declared.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Migration → registry/template removal → web/tests/smoke/E2E → docs → grep sweep | Pass | N/A (no temporary seams) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Where the cleanup lives; hiding vs. removing; old references | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### PREM-001 — A user agent that legitimately owns the ID `autobyteus-project-task-manager` gets deleted by the migration

- Related approved requirement or established contract: REQ-004 (nothing else deleted); the preserved-boundary invariant
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: Creating a shared agent through the agent UI or the `createAgentDefinition` tool, with the name "AutoByteus Project Task Manager", on an install that never ran a beta with the built-in.
- Support evidence: `AgentDefinitionService.createAgentDefinition` never accepts a caller-supplied ID. `FileAgentDefinitionProvider.nextAgentId` takes the slug of the name and adds a suffix if the folder exists. So the only route to the ID is that exact name, on an install without the built-in folder. On any install that did have the built-in, the folder exists and the user agent gets `-2`.
- Forward path: user creates the agent → slug `autobyteus-project-task-manager` → the user upgrades to the new version → the migration removes the folder.
- Lifecycle preconditions and consequence: The window is narrow: only installs that never ran the betas, between now and the upgrade. The user would also have to choose the platform-prefixed product name of a retired built-in.
- Reachability: Mechanically `Reachable`; classified `Technically Possible but Unsupported/Contrived`. No coherent user goal leads to naming an agent with the platform-reserved "AutoByteus …" prefix of a built-in.
- Review consequence: I agree with the design. No ownership guard or content heuristic is required; the guideline forbids guessing ownership. Not a finding.

### PREM-002 — A manual retry from the migrations UI succeeds while the server is running, but the in-memory agent catalog still lists the removed agent

- Related approved requirement or established contract: REQ-003 (retry on next start); BEH-002
- Relevant behavior ID(s): BEH-002, BEH-003
- Initiating basis kind: `User` (preceded by the supported explicit edge SCN-003)
- Independent product-supported initiating trigger: Settings → Server Migrations (`ServerMigrationsManager.vue`) → Retry on a FAILED migration. This is reachable because the design picks the default `ANYTIME` policy, so `runAppDataMigration` → `AppDataMigrationRunner.runMigration` accepts the call.
- Support evidence: SCN-003 (startup removal FAILED) is a supported explicit edge. The retry action is an exposed product surface. `CachedAgentDefinitionProvider` is a full in-memory cache that is populated at startup and refreshed only by the bootstrapper.
- Forward path: startup removal fails → the warning is logged and the cache is built including the copy → the user clicks Retry → `rm` succeeds → the record is SUCCEEDED → the catalog cache still holds the definition until the next refresh or restart.
- Lifecycle preconditions and consequence: The duplicate stays listed until the next restart. Then it disappears for good, because the bootstrap refresh no longer finds the folder. Starting a new run from the stale entry during that window would hit the existing missing-files or "not found" behavior. There is no data loss and no lockout.
- Reachability: `Reachable`
- Review consequence: Non-blocking. No approved requirement promises that an in-session manual retry takes effect immediately. REQ-003 only requires a retry on the next start, which works, and the effect is self-healing. I'm recording it as a recommendation, not a required correction (see Residual Risks).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

The primary pass handoff goes to the recipient returned by `get_handoff_rules`; that is normally `/software_engineering_team/implementation_engineer`. An informational pass notice goes to `/software_engineering_team/solution_designer`.

## Residual Risks

- **REC-001 (non-blocking, PREM-002).** The `ANYTIME` policy exposes a manual mid-session retry. A successful manual retry leaves the stale duplicate in the in-memory catalog until the next restart. The implementer may choose either option without design rework:
  - set `executionPolicy = "STARTUP_ONLY"`, so recovery is "restart to retry", which is exactly REQ-003's wording;
  - or keep `ANYTIME` and mention in the README paragraph that the change takes effect on the next restart.
- **UNK-001.** The user-facing presentation when continuing an old built-in run must be confirmed in API/E2E (AC-008). The design's escalation trigger covers anything worse than the existing "not found" error.
- **SCN-007.** Downgrading to a beta and then upgrading again brings the duplicate back. This is unsupported and recorded as a non-goal.
- **DEC-002 / RSK-001.** A user-authored Team or Org that includes the built-in fails to launch until the member is replaced. The user accepted this; it matches the existing deleted-agent behavior.
- **Test fidelity.** The AC-002/003/006 test must run the real runner and real bootstrap against owned temp app data, with a package root configured that contains `project-task-manager`. Otherwise it cannot prove "exactly one Project Task Manager".

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. PREM-001 is unsupported/contrived, with no machinery added. PREM-002 is reachable, but it is non-blocking and needs no new machinery.
- Notes: The architecture is proportionate:
  - deletion inside existing owners;
  - one isolated, idempotent, non-blocking migration following the approved predecessor pattern;
  - no runtime legacy paths;
  - a complete Data Migration Guideline §2 checklist.
