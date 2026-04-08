# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Chose bootstrapper-owned installed-skill dedupe plus symlink-safe materialization in the existing Codex backend layout | 1 |
| v2 | Requirement-gap re-entry after live team-agent failure | Replace relative-symlink preservation with self-contained materialized bundles created by dereferencing source symlinks during runtime copy | 3 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/codex-installed-skill-dedup-redo/investigation-notes.md`
- Requirements: `tickets/in-progress/codex-installed-skill-dedup-redo/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Add a bootstrap-time `skills/list` preflight in the current Codex thread bootstrapper so configured skills whose `name` already exists in Codex discovery are filtered out before workspace materialization. Keep the workspace materializer focused on copying only the remaining missing skills, and make that copy produce a self-contained bundle by dereferencing source symlinks on macOS/Linux.

## Goal / Intended Change

Implement the installed-skill dedupe policy in the current `personal` architecture without reintroducing stale `runtime-execution` structures. The runtime should:

1. query Codex skill discovery before materialization,
2. skip copying already discoverable same-name skills,
3. still materialize missing skills,
4. make symlinked source content self-contained when copying,
5. keep cleanup and run lifecycle logic simple.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not add any new compatibility branch for the deleted `runtime-execution` layout, and do not introduce dual bootstrap/materializer paths for old vs new Codex architecture.
- Gate rule: design is invalid if it revives stale runtime service files or adds fallback branches keyed on the removed folder layout.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Implement only in the latest `personal` architecture | `AC-005` | Only current owning paths change | `UC-004` |
| `R-002` | Query `skills/list` before materialization | `AC-001` | Bootstrapper issues discovery preflight | `UC-001`, `UC-002`, `UC-004` |
| `R-003` | Skip materialization when same-name skill is already discoverable | `AC-002` | Discoverable skills are filtered out | `UC-001`, `UC-004` |
| `R-004` | Materialize missing skills normally | `AC-002`, `AC-006` | Missing skills still work through current runtime path | `UC-002`, `UC-004` |
| `R-005` | Fall back to materialization when discovery fails | `AC-003` | Discovery failure does not block startup | `UC-002`, `UC-004` |
| `R-006` | Keep symlinked source content usable after materialization | `AC-004` | Self-contained materialized bundle is covered by tests | `UC-003` |
| `R-007` | Cleanup must only remove runtime-owned copies | `AC-003` | No delete behavior for skipped installed skills | `UC-001`, `UC-002` |
| `R-008` | Validation must cover the touched path | `AC-001`, `AC-002`, `AC-003`, `AC-004`, `AC-006` | Unit plus executable coverage | `UC-001`, `UC-002`, `UC-003`, `UC-004` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Codex bootstrap resolves configured skills and always hands them to the workspace materializer | `codex-thread-bootstrapper.ts`, `prepareWorkspaceSkills(...)` | None |
| Current Ownership Boundaries | Bootstrapper owns skill preparation; materializer owns filesystem copy; client manager owns Codex app-server client lifecycle | `codex-thread-bootstrapper.ts`, `codex-workspace-skill-materializer.ts`, `codex-app-server-client-manager.ts` | None |
| Current Coupling / Fragmentation Problems | No discovery preflight exists, so dedupe policy is missing and materializer over-copies; the prior redo also assumed relative symlink identity could be preserved safely inside `.codex/skills` | `rg 'skills/list'` returned no current call sites; live re-entry experiments showed `.codex/shared/...` breakage under `verbatimSymlinks: true` | None |
| Existing Constraints / Compatibility Facts | Current live app-server protocol exposes `skills/list` with `cwds`; current live configured-skill E2E already exists | generated app-server TS bindings; `agent-runtime-graphql.e2e.test.ts` | Whether Stage 7 needs extra executable proof of skip-vs-copy specifically |
| Relevant Files / Components | Materializer unit tests exist; bootstrapper unit tests do not | `tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Need new bootstrapper test file |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Agent run bootstrap | Prepared Codex runtime context | `CodexThreadBootstrapper` | This is where configured skills are resolved, filtered, and optionally materialized before Codex thread startup |
| `DS-002` | `Return-Event` | Run/thread cleanup | Workspace skill cleanup complete | `CodexThreadCleanup` | Cleanup must stay correct when some configured skills were skipped instead of copied |
| `DS-003` | `Bounded Local` | Missing-skill copy | Materialized self-contained workspace skill bundle | `CodexWorkspaceSkillMaterializer` | Symlink dereferencing is an internal filesystem concern, not the main policy spine |

## Primary Execution / Data-Flow Spine(s)

### `DS-001`

- Arrow chain: `AgentRunService -> Codex backend factory -> CodexThreadBootstrapper -> Codex app-server client manager -> skills/list -> bootstrapper filter -> CodexWorkspaceSkillMaterializer -> CodexAgentRunContext`
- Narrative: The main business path starts when a Codex-backed agent run is prepared. The bootstrapper resolves configured skills, optionally asks Codex which skills are already discoverable for the run workspace, filters out same-name installed skills, materializes only the missing ones, and stores only the copied workspace skills in the runtime context for later cleanup.
- Governing owner: `CodexThreadBootstrapper`
- Why the span is long enough: It covers the initiating run-preparation surface, the authoritative bootstrap boundary, the external Codex discovery dependency, and the downstream runtime-context consequence.

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `AgentRunService` / backend factory | Initiates Codex bootstrap | Starts the run-preparation flow |
| `CodexThreadBootstrapper` | Authoritative boundary for configured skill preparation | Resolves skills, runs preflight, decides what to materialize |
| `CodexAppServerClientManager` | External client owner | Supplies and releases the short-lived discovery client |
| `CodexWorkspaceSkillMaterializer` | Filesystem owner | Copies only missing skills into workspace `.codex/skills` |
| `CodexAgentRunContext` | Runtime state holder | Carries only runtime-owned copied skills forward for cleanup |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Bootstrap asks Codex what is already installed, filters by configured skill name, then materializes only missing skills | Bootstrapper, client manager, materializer, runtime context | `CodexThreadBootstrapper` | Discovery failure fallback, logging |
| `DS-002` | Cleanup releases only the runtime-owned materialized skill descriptors stored in run context | Runtime context, thread cleanup, materializer registry | `CodexThreadCleanup` | None beyond normal release ordering |
| `DS-003` | Materializer copies a skill tree into workspace `.codex/skills`, dereferences symlinked content into local files, and writes marker/config files | Materializer, filesystem | `CodexWorkspaceSkillMaterializer` | Marker file generation, `agents/openai.yaml` generation |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `CodexThreadBootstrapper` | Installed-skill discovery preflight and configured-skill filtering policy | Filesystem copy details | This is the right place for same-name dedupe because it already orchestrates skill preparation |
| `CodexWorkspaceSkillMaterializer` | Copying missing skill bundles into workspace and cleaning them up later | External discovery calls or installed-skill policy | Keep this owner focused on runtime-owned files |
| `CodexAppServerClientManager` | Client acquisition and release | Skill policy | Reuse existing client lifecycle owner instead of constructing ad hoc clients |
| `CodexThreadCleanup` | Releasing runtime-owned materialized bundles and workspace client | Installed-skill filtering | No behavior change beyond continuing to clean up copied bundles |

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `CodexWorkspaceSkillMaterializer`
- Bounded local spine: `missing configured skill -> ensure workspace skills root -> copy tree with dereferenced symlink content -> write ownership marker -> ensure openai.yaml`
- Why it must be explicit: Symlink handling is a filesystem-local concern that must remain off the main policy spine but still be made visible for correctness.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Discovery-failure warning log | `CodexThreadBootstrapper` | Warn and fall back to normal materialization | `Yes` |
| Directory-name hashing and marker files | `CodexWorkspaceSkillMaterializer` | Preserve current runtime-owned bundle semantics | `Yes` |
| Dereferenced copy option | `CodexWorkspaceSkillMaterializer` | Make copied skill tree self-contained on macOS/Linux | `Yes` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Installed-skill preflight | `agent-execution/backends/codex/backend` | `Extend` | Bootstrapper already owns skill-preparation orchestration | N/A |
| Codex app-server transport | `runtime-management/codex/client` | `Reuse` | Existing client manager already owns acquire/release semantics | N/A |
| Missing-skill copy | `agent-execution/backends/codex` materializer | `Extend` | Existing materializer already owns workspace copies | N/A |
| Self-contained symlinked-content tests | existing Codex materializer unit suite | `Extend` | Tests already cover filesystem bundle semantics | N/A |
| Dedupe policy tests | Codex backend unit tests | `Extend` | Bootstrapper has no current unit coverage, so add it beside the backend owner | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/backend` | Discovery preflight, configured-skill filtering | `DS-001` | `CodexThreadBootstrapper` | `Extend` | Add small private helper(s), no new subsystem |
| `runtime-management/codex/client` | Short-lived app-server client acquisition | `DS-001` | `CodexThreadBootstrapper` | `Reuse` | No API change expected if current `acquireClient` / `releaseClient` is enough |
| `agent-execution/backends/codex` | Runtime-owned skill copy behavior | `DS-001`, `DS-003` | `CodexWorkspaceSkillMaterializer` | `Extend` | Replace relative-symlink preservation with self-contained copied content |
| `tests/unit/agent-execution/backends/codex` | Materializer filesystem coverage | `DS-003` | materializer owner | `Extend` | Add symlink regression |
| `tests/unit/agent-execution/backends/codex/backend` | Bootstrapper policy coverage | `DS-001` | bootstrapper owner | `Extend` | Add new bootstrapper unit file |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `CodexThreadBootstrapper -> CodexAppServerClientManager`
  - `CodexThreadBootstrapper -> CodexWorkspaceSkillMaterializer`
  - `CodexThreadCleanup -> CodexWorkspaceSkillMaterializer`
- Authoritative public entrypoints versus internal owned sub-layers:
  - Upper layers continue to call only the bootstrapper for skill preparation.
  - Upper layers continue to call only thread cleanup for release behavior.
- Authoritative Boundary Rule per domain subject:
  - installed-skill filtering policy is authoritative in `CodexThreadBootstrapper`
  - runtime-owned filesystem copy is authoritative in `CodexWorkspaceSkillMaterializer`
- Forbidden shortcuts:
  - no direct `skills/list` calls from the materializer
  - no direct cleanup policy in callers above `CodexThreadCleanup`

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Keep current ownership boundaries; add bootstrapper preflight filter; keep materializer runtime-owned only with self-contained copied bundles`
- Rationale: lowest complexity, smallest change set, preserves cleanup simplicity, avoids `.codex/shared` coupling, and matches the user’s “check before materialize” intent directly
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep` existing structure and `Add` bounded logic inside current owners

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | `Yes` | Dedupe policy would otherwise be duplicated or pushed into callers | Extract clear owner in bootstrapper |
| Responsibility overload exists in one file or one optional module grouping | `No` | Bootstrapper already owns skill preparation | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | `Yes` | Bootstrapper preflight helper owns materialize-vs-skip policy | Keep |
| Every off-spine concern has a clear owner on the spine | `Yes` | Logging and symlink copy each map to one owner | Keep |
| Primary spine is stretched far enough to expose the real business path instead of only a local edited segment | `Yes` | Spine includes run preparation through runtime context result | Keep |
| Authoritative Boundary Rule is preserved | `Yes` | No caller reaches through bootstrapper into discovery plus materializer separately | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | `Yes` | No new subsystem required | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | `No` | Small helper methods inside bootstrapper are enough | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | `Yes` | Only local extensions needed | Keep |

## Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| `A` | Bootstrapper preflights `skills/list`, filters configured skills, materializer only copies missing ones and dereferences symlinked content | Smallest diff, no new cleanup state, matches product intent, produces self-contained bundles | Needs refreshed symlink regression coverage | `Chosen` | Best fit for current boundaries |
| `B` | Materializer owns discovery and returns descriptors for both copied and reused external skills | Centralizes policy in one owner | Adds unnecessary descriptor complexity and cleanup branching | `Rejected` | Over-engineered for this ticket |
| `C` | Preserve relative symlinks and also materialize a symmetric `.codex/shared/...` tree | Keeps link identity | Couples runtime bundles to workspace-global shared mirrors and risks collisions across teams | `Rejected` | More fragile than dereferencing within the copied bundle |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | same | Add `skills/list` preflight and filter missing skills only | bootstrap policy | Acquire/release probe client in `finally` |
| `C-002` | `Modify` | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | same | Dereference symlinked source content during copy so runtime bundles are self-contained | filesystem correctness | No ownership-model redesign |
| `C-003` | `Add` | N/A | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Cover dedupe and discovery-failure policy | unit validation | New file |
| `C-004` | `Modify` | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | same | Add symlink regression coverage | unit validation | Existing suite extension |
| `C-005` | `Modify` | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | maybe same / maybe none | Reuse current configured-skill executable validation path if an assertion tweak is needed | Stage 7 | Only if current assertions need explicit support |

## Removal / Decommission Plan (Mandatory)

- Do not add or restore any `src/runtime-execution/...` Codex file.
- Do not introduce a second materializer path for “installed skill” versus “workspace copy”; the installed-skill case is represented by filtering before copy.
- Keep cleanup unchanged except for naturally consuming the smaller set of runtime-owned copied skills.
