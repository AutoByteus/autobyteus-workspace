# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Replace copied workspace skill bundles with whole-directory symlinks, remove Codex suffix-based naming, and shift cleanup ownership from marker files to symlink identity checks for both Codex and Claude | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/whole-skill-symlink-materialization/investigation-notes.md`
- Requirements: `tickets/done/whole-skill-symlink-materialization/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. In this template, `module` is not a synonym for one file and not the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Reading Rule

- This document is organized around the runtime bootstrap/materialization spines first.
- The materializers remain the authoritative filesystem owners.
- No new subsystem is introduced; the change extends the current backend-specific owners.

## Summary

Keep the current Codex reuse-vs-materialize policy in `CodexThreadBootstrapper`, but replace the Codex fallback materializer with a whole-directory symlink owner that creates `.codex/skills/<sanitized-skill-name>` symlinks to the original skill roots, performs collision checks explicitly, and infers cleanup ownership from symlink identity instead of a marker file. Apply the same symlink-based materialization pattern to Claude’s `.claude/skills/<sanitized-skill-name>` path because Claude currently has the same stale-copy behavior even though it does not have Codex’s suffix problem. Remove runtime-owned copied-bundle assumptions, marker-file writes, and Codex-only generated `openai.yaml` writes from the changed scope.

## Goal / Intended Change

- Remove stale copied workspace skill bundles from both touched runtimes.
- Make Codex fallback skill paths intuitive by removing the current suffix.
- Preserve original source-root-relative layouts by pointing workspace skill directories back to the true source roots.
- Keep cleanup safe without mutating source skill roots.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove obsolete copied-bundle helpers, marker-file ownership assumptions, and Codex `openai.yaml` generation from the changed materializer scope.
- Treat removal as first-class design work: the new clean-cut target is `workspace symlink -> source root`, not `copy plus compatibility marker`.
- Gate rule: design is invalid if it keeps dual copy/symlink fallback branches only for compatibility.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `R-001` | Keep current architecture owners | `AC-006` | Only current owning subsystem paths change | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-002` | Keep Codex `skills/list` preflight reuse | `AC-001`, `AC-002` | Same-name discoverable Codex skills still skip workspace materialization | `UC-001`, `UC-002` |
| `R-003` | Codex fallback uses whole-directory symlink | `AC-001`, `AC-002`, `AC-003` | Missing Codex skills materialize as symlinks, not copies | `UC-002`, `UC-003`, `UC-005` |
| `R-004` | Codex fallback path has no suffix | `AC-002` | Intuitive `.codex/skills/<name>` paths | `UC-002`, `UC-005` |
| `R-005` | Codex no longer needs runtime `openai.yaml` generation | `AC-001`, `AC-006` | No runtime-owned generated file write into source root | `UC-002` |
| `R-006` | Claude workspace materialization uses whole-directory symlink | `AC-005` | Claude stops copying skill trees into `.claude/skills/` | `UC-004`, `UC-005` |
| `R-007` | No runtime-owned marker writes into source roots | `AC-004`, `AC-005` | Ownership inferred from symlink identity instead of marker file | `UC-002`, `UC-004`, `UC-005` |
| `R-008` | Cleanup removes only runtime-owned symlinks | `AC-004`, `AC-005` | Source roots remain untouched | `UC-002`, `UC-004`, `UC-005` |
| `R-009` | Collisions fail loudly | `AC-004` | No suffix-based hiding or unrelated overwrites | `UC-005` |
| `R-010` | Original relative layout remains valid | `AC-003`, `AC-005` | Sibling/shared paths keep working | `UC-003`, `UC-004` |
| `R-011` | No stale-update behavior from copied bundles | `AC-002`, `AC-005` | Source changes remain visible through symlinked roots | `UC-002`, `UC-004` |
| `R-012` | Validation covers symlink/naming/cleanup behavior | `AC-001` to `AC-006` | Durable validation updated per backend | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Codex bootstrap already separates `reuse vs fallback materialize`; Claude bootstrap still always materializes exposed configured skills | `codex-thread-bootstrapper.ts`, `claude-session-bootstrapper.ts` | None significant |
| Current Ownership Boundaries | Backend-specific materializers already own filesystem behavior for their runtimes | `codex-workspace-skill-materializer.ts`, `claude-workspace-skill-materializer.ts` | None |
| Current Coupling / Fragmentation Problems | Both materializers still assume copied bundles and runtime-owned marker files inside the materialized root; Codex also owns suffix/hash naming and `openai.yaml` generation | same materializer files | None |
| Existing Constraints / Compatibility Facts | Live Codex discovery accepts a directory symlink and does not require `agents/openai.yaml`; existing Claude live integration proves direct `.claude/skills/<name>` loading with only `SKILL.md` | investigation probes, `claude-sdk-client.integration.test.ts` | Live Claude symlink proof remains blocked by auth |
| Relevant Files / Components | The change is localized to the two materializers plus their tests; Codex bootstrapper tests/integration still matter for `skills/list` behavior | backend source + tests | None |

## Current State (As-Is)

- Codex:
  - bootstrapper preflights `skills/list`
  - missing skills materialize through `CodexWorkspaceSkillMaterializer`
  - materializer copies the skill tree, dereferences internal symlinks, writes `.autobyteus-runtime-skill.json`, optionally writes `agents/openai.yaml`, and uses an `autobyteus-...-hash` folder name
- Claude:
  - bootstrapper always materializes exposed configured skills
  - materializer copies the skill tree into `.claude/skills/<sanitized-name>` and writes `.autobyteus-runtime-skill.json`
- Both:
  - hold in-memory reference counts by `workingDirectory::sourceRootPath`
  - clean up materialized bundles only after the last holder releases them

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Codex run bootstrap | Codex runtime context with reused or symlink-materialized skills | `CodexThreadBootstrapper` + `CodexWorkspaceSkillMaterializer` | This is the main Codex policy and filesystem path |
| `DS-002` | `Primary End-to-End` | Claude run bootstrap | Claude runtime context with symlink-materialized skills | `ClaudeSessionBootstrapper` + `ClaudeWorkspaceSkillMaterializer` | This is the main Claude policy and filesystem path |
| `DS-003` | `Bounded Local` | Materializer acquire request | Workspace skill path created/reused/validated | Backend-specific workspace skill materializer | Collision handling, symlink creation, reuse, and ownership checks live here |
| `DS-004` | `Bounded Local` | Materializer cleanup request | Runtime-owned workspace symlink removed or preserved | Backend-specific workspace skill materializer | Last-holder cleanup and safe ownership validation live here |

## Primary Execution / Data-Flow Spine(s)

- `Codex run bootstrap -> CodexThreadBootstrapper -> skills/list preflight -> CodexWorkspaceSkillMaterializer -> CodexAgentRunContext`
- `Claude run bootstrap -> ClaudeSessionBootstrapper -> ClaudeWorkspaceSkillMaterializer -> ClaudeAgentRunContext`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `CodexThreadBootstrapper` | Codex policy owner | Decides which configured skills still need workspace fallback |
| `CodexWorkspaceSkillMaterializer` | Codex filesystem owner | Creates/reuses/removes runtime-owned workspace symlinks |
| `ClaudeSessionBootstrapper` | Claude policy owner | Exposes configured skills to Claude runtime bootstrap |
| `ClaudeWorkspaceSkillMaterializer` | Claude filesystem owner | Creates/reuses/removes runtime-owned workspace symlinks |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | A Codex-backed run resolves configured skills, filters out already discoverable same-name skills, and only for missing skills asks the Codex materializer to ensure a workspace symlink at the intuitive path. The run context keeps only the runtime-owned symlink descriptors for later cleanup. | Codex bootstrapper, Codex materializer, Codex run context | `CodexThreadBootstrapper` | live `skills/list` discovery, symlink collision checks, cleanup ownership |
| `DS-002` | A Claude-backed run resolves configured skills and asks the Claude materializer to ensure workspace symlinks under `.claude/skills/`. The run context keeps those descriptors for later cleanup. | Claude bootstrapper, Claude materializer, Claude run context | `ClaudeSessionBootstrapper` | symlink collision checks, cleanup ownership |
| `DS-003` | Inside one materializer, acquire first normalizes the intuitive workspace skill path, checks whether an existing path is a safe reusable symlink to the same source root, rejects unsafe collisions, and otherwise creates the symlink. | Materializer acquire path | Backend-specific materializer | path sanitization, symlink identity checks |
| `DS-004` | Inside one materializer, release decrements the holder count and, on last release, removes the workspace path only if it is still the expected runtime-owned symlink to the same source root. | Materializer cleanup path | Backend-specific materializer | holder-count registry, lstat/readlink/realpath validation |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `CodexThreadBootstrapper` | Same-name discovery preflight and missing-skill selection | Filesystem symlink creation details | Existing owner stays authoritative |
| `CodexWorkspaceSkillMaterializer` | Codex workspace path naming, symlink creation, collision validation, cleanup ownership | Codex discovery policy | Existing owner stays authoritative |
| `ClaudeSessionBootstrapper` | Claude bootstrap/configured-skill exposure policy | Filesystem symlink creation details | Existing owner stays authoritative |
| `ClaudeWorkspaceSkillMaterializer` | Claude workspace path naming, symlink creation, collision validation, cleanup ownership | Claude session policy | Existing owner stays authoritative |

## Bounded Local / Internal Spines (If Applicable)

- `DS-003` parent owner: each backend-specific workspace skill materializer
  - Arrow chain: `acquire -> normalize intuitive path -> inspect existing path -> reuse same-source symlink OR remove safe stale same-source symlink OR reject collision -> create symlink -> return descriptor`
  - Why explicit: this is where suffix removal and marker-file removal become safe or unsafe
- `DS-004` parent owner: each backend-specific workspace skill materializer
  - Arrow chain: `release -> decrement holder count -> if last holder, validate workspace path is expected symlink -> unlink workspace path`
  - Why explicit: cleanup safety now depends on symlink identity rather than marker files

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Path sanitization | Both materializers | Produce deterministic intuitive workspace folder names | `Yes` |
| Symlink ownership validation | Both materializers | Distinguish safe same-source symlink reuse/removal from unsafe collisions | `Yes` |
| Live runtime validation | Backend test owners | Prove runtime compatibility where possible | `Yes` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Codex reuse-vs-materialize policy | `agent-execution/backends/codex/backend` | `Reuse` | Existing bootstrapper already owns this decision | N/A |
| Backend-specific workspace filesystem behavior | `agent-execution/backends/codex` and `agent-execution/backends/claude` materializers | `Extend` | Existing materializers are already the filesystem owners | N/A |
| Cleanup ownership | Same materializers | `Extend` | No new subsystem needed; just replace marker-file logic with symlink identity checks | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/codex/backend` | Codex bootstrap policy and `skills/list` preflight | `DS-001` | `CodexThreadBootstrapper` | `Reuse` | No new owner needed |
| `src/agent-execution/backends/codex` | Codex workspace symlink materialization and cleanup | `DS-001`, `DS-003`, `DS-004` | `CodexWorkspaceSkillMaterializer` | `Extend` | Main changed Codex owner |
| `src/agent-execution/backends/claude/backend` | Claude bootstrap policy | `DS-002` | `ClaudeSessionBootstrapper` | `Reuse` | No policy split needed |
| `src/agent-execution/backends/claude` | Claude workspace symlink materialization and cleanup | `DS-002`, `DS-003`, `DS-004` | `ClaudeWorkspaceSkillMaterializer` | `Extend` | Main changed Claude owner |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - Bootstrapper -> backend-specific materializer
  - Materializer -> filesystem primitives
- Authoritative public entrypoints versus internal owned sub-layers:
  - Bootstrappers remain the authoritative upper-layer entrypoints for runtime preparation.
  - Materializers remain the authoritative filesystem entrypoints for workspace skill exposure.
- Authoritative Boundary Rule per domain subject (no boundary bypass / no mixed-level dependency):
  - Callers above bootstrapper level must not start depending on materializer internals directly.
- Forbidden shortcuts:
  - No caller outside a materializer should decide whether an existing workspace skill path is safe to replace.
- Boundary bypasses that are not allowed:
  - No separate cleanup helper should bypass the materializer’s ownership logic.
- Temporary exceptions and removal plan:
  - None.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Keep the current backend owners, replace copied bundles with whole-directory symlinks, remove Codex suffix naming, and remove marker-file-based ownership.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - lowest complexity: extends current owners rather than inventing new ones
  - better operability: source updates are immediately reflected without rematerialization
  - better testability: ownership checks collapse to symlink identity and collision cases
  - lower evolution cost: no more copied-bundle drift or Codex-only generated file semantics
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep + Modify + Remove`
- Note: owners remain the same, but copied-bundle and marker-file logic are removed.

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Registry-backed holder counting | Existing materializer registry in both backends | Keeps cleanup tied to runtime holders | Materializers | Keep existing pattern |
| Boundary-local collision validation | Both materializers | Prevents suffix-based hiding and unrelated overwrites | Materializers | New local policy inside existing owner |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | `No` | Collision/cleanup policy belongs inside each materializer, not in callers | Keep |
| Responsibility overload exists in one file or one optional module grouping | `No` | The added symlink logic still belongs to the existing materializer owners | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | `Yes` | No empty new layer is introduced | Keep |
| Every off-spine concern has a clear owner on the spine | `Yes` | Naming, collision validation, and cleanup all stay under materializers | Keep |
| Authoritative Boundary Rule is preserved: authoritative public boundaries stay authoritative; callers do not depend on both an outer owner and one of its internal owned mechanisms | `Yes` | Bootstrappers still call only their materializers | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | `Yes` | Both backends extend current owners only | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | `No` | The logic is backend-local enough to stay in each materializer unless later duplication becomes noisy | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | `No` | Behavior change requires removal of copy/marker assumptions | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| `A` | Replace copied bundles with whole-directory symlinks, remove Codex suffix, and use symlink identity for ownership | Solves stale updates directly, keeps shared-relative layouts intact, removes Codex suffix complexity | Needs collision handling and marker-file removal | `Chosen` | Best fit for the user goal and proven Codex runtime behavior |
| `B` | Keep copied bundles but add rematerialization/refresh logic | Avoids changing current cleanup model | Still stale between refreshes, keeps Codex suffixes, keeps copy complexity | `Rejected` | Does not solve the core user problem cleanly |
| `C` | Use a hybrid symlink plus runtime-owned metadata files written inside the source root | Could preserve current marker-style cleanup | Mutates source skills and violates the user’s clean symlink intent | `Rejected` | Wrong ownership boundary |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | same | Replace copy/suffix/marker/openai-yaml behavior with symlink/no-suffix/symlink-identity behavior | Codex runtime filesystem path | Primary Codex implementation owner |
| `C-002` | `Modify` | `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | same | Replace copy/marker behavior with symlink/symlink-identity behavior | Claude runtime filesystem path | Primary Claude implementation owner |
| `C-003` | `Modify` | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | same | Update Codex durable validation to symlink/no-suffix/collision semantics | Codex unit validation | Required |
| `C-004` | `Modify` | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | same | Update Codex live integration expectations from copied bundle to symlinked fallback | Codex live validation | Required if executable env available |
| `C-005` | `Modify` | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | same | Update Claude durable validation to symlink semantics | Claude unit validation | Required |
| `C-006` | `Modify` | `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | same or none | Add/adjust Claude live project-skill validation only if needed for symlink behavior | Claude executable validation | Depends on environment feasibility |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Codex copied tree helper (`copySkillTree`) | Whole-directory symlink replaces copied bundle creation | `CodexWorkspaceSkillMaterializer` symlink creation path | `In This Change` | Remove |
| Codex directory hash/suffix naming | Explicit intuitive path plus collision error replaces hidden disambiguation | `CodexWorkspaceSkillMaterializer` path validation | `In This Change` | Remove |
| Codex runtime `agents/openai.yaml` generation | Real discovery does not require it | None | `In This Change` | Remove |
| Codex/Claude marker-file ownership model | Source-root mutation is invalid for symlink materialization | Symlink identity validation inside each materializer | `In This Change` | Remove |
| Claude copied bundle assumptions in tests | New runtime contract is symlink-based | Updated Claude test expectations | `In This Change` | Remove |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Codex backend | Codex workspace skill materializer | Codex workspace symlink semantics | All Codex filesystem behavior already lives here | No |
| `src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Claude backend | Claude workspace skill materializer | Claude workspace symlink semantics | All Claude filesystem behavior already lives here | No |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Symlink identity helpers | None for now | Backend-local materializers | The logic is short and backend-local; extracting now would create cross-backend indirection without strong reuse pressure | `N/A` | `N/A` | A generic shared helper blob |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Existing materialized skill descriptors | `Yes` | `Yes` | `Low` | `Yes` | Keep |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Codex backend | `CodexWorkspaceSkillMaterializer` | Codex intuitive path naming, symlink creation, safe reuse, collision rejection, and cleanup | One backend-specific filesystem owner | No |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Claude backend | `ClaudeWorkspaceSkillMaterializer` | Claude intuitive path naming, symlink creation, safe reuse, collision rejection, and cleanup | One backend-specific filesystem owner | No |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Codex backend tests | Codex materializer validation | Durable Codex symlink/naming/cleanup/shared-path coverage | One coherent test owner | No |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | Claude backend tests | Claude materializer validation | Durable Claude symlink/naming/cleanup coverage | One coherent test owner | No |
