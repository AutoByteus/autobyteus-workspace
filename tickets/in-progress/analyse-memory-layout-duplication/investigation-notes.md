# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Analysis complete; requirements approved by user; design spec produced and ready for architecture review.
- Investigation Goal: Determine why both `AgentRunMemoryLayout` and `AgentMemoryLayout` exist in the same code path, whether this is active legacy/dual-version behavior, and what clean-cut design correction is required.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The visible smell is narrow, but memory layout is a cross-cutting path contract for standalone run provisioning, metadata, context files, run history, team members, and task agents.
- Scope Summary: Investigate memory layout ownership and duplicate versioned fields around agent run/team memory allocation.
- Primary Questions Resolved:
  1. Which file contains `agentMemoryLayout` and `agentMemoryLayoutV2`? Answer: `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts`.
  2. Are `AgentRunMemoryLayout` and `AgentMemoryLayout` distinct subjects or old/new versions of the same subject? Answer: they overlap on standalone agent-run path semantics; `AgentMemoryLayout` is the broader current owner.
  3. Which call sites use each layout and which path semantics do they encode? Answer: listed below under relevant files/components.
  4. What legacy/dual-path code must be removed? Answer: remove `AgentRunMemoryLayout` and all production imports; collapse allocator to one non-versioned `AgentMemoryLayout` field.

## Request Context

User reported seeing the following code and called out that it violates the design principles against keeping legacy code and versioned dual paths:

```ts
private readonly agentMemoryLayout: AgentRunMemoryLayout;
private readonly agentMemoryLayoutV2: AgentMemoryLayout;
```

Reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f10f48fcdc2043ad8fc39da8e5667d23/solution_designer_9a134e36c5544320ba322bb7697a195a/context_files/ctx_605d4d201bfa__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication/tickets/in-progress/analyse-memory-layout-duplication`
- Current Branch: `codex/analyse-memory-layout-duplication`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-11.
- Task Branch: `codex/analyse-memory-layout-duplication` created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use this dedicated worktree and artifact folder for downstream work on this task.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-11 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Canonical design reference named by user. | Confirms no backward compatibility or legacy retention; removal is first-class; shared structures must be semantically tight; authoritative boundaries must not be bypassed. | Use during design. |
| 2026-06-11 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree. | Succeeded. | No |
| 2026-06-11 | Command | `git worktree add -b codex/analyse-memory-layout-duplication /Users/normy/autobyteus_org/autobyteus-worktrees/analyse-memory-layout-duplication origin/personal` | Create dedicated task worktree/branch. | Succeeded; HEAD at `d0bf457a chore(release): bump workspace release version to 1.3.51`. | No |
| 2026-06-11 | Command | `rg -n "agentMemoryLayoutV2|AgentRunMemoryLayout|AgentMemoryLayout" . --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!*.map'` | Locate duplicate symbols and current usage. | Found `agentMemoryLayoutV2` only in `agent-run-identity-allocator.ts`; found remaining `AgentRunMemoryLayout` production users in allocator/provisioning/context/run-history stores/services. | Use for removal scope. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | Inspect reported code. | Same class imports both layouts, instantiates both, uses old layout for standalone collision and `AgentMemoryLayout` for team collision. | Refactor to one layout field. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` | Inspect old layout responsibility. | Older class only composes `memory/agents/<runId>` paths and ensures standalone run subtree. | Remove after replacing call sites. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Inspect current layout responsibility. | Newer class composes both `memory/agents/<agentRunId>` and hierarchical `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<agentRunId>`; stricter path segment validation. | Use as sole layout owner. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts` | Inspect public memory location boundary. | Service already uses `AgentMemoryLayout` for standalone, team member, and task-agent memory locations. | Confirms current authoritative boundary. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Inspect standalone provisioning path. | Still uses `AgentRunMemoryLayout` for `getRunsRootDirPath()` cleanup and `getRunDirPath(runId)` fresh run `memoryDir`. | Replace with `AgentMemoryLayout` equivalents. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | Inspect standalone context-file path use. | Uses old layout only for `agent_final` owner path; team final owners already pass explicit `memoryDir`. | Replace with `AgentMemoryLayout.getStandaloneRunDirPath`. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | Inspect metadata path use. | Uses old layout to read/write `memory/agents/<runId>/run_metadata.json` and fallback `metadata.memoryDir`. | Replace with `AgentMemoryLayout.getStandaloneRunDirPath`. |
| 2026-06-11 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts` | Inspect identity resolver path use. | Uses old layout for standalone root and then manually resolves paths. | Replace root with `AgentMemoryLayout.getStandaloneRootDirPath`. |
| 2026-06-11 | Command | `git blame -L 1,140 -- autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | Determine origin of duplicated fields. | All lines, including both layout fields and `V2`, come from commit `0e68304d` on 2026-06-11. | Root cause tied to previous refactor implementation. |
| 2026-06-11 | Command | `git show --stat --oneline 0e68304d` and `git show 0e68304d -- ...` | Inspect commit scope. | Commit `feat: centralize agent run id allocation` added both `AgentRunIdentityAllocator` and `AgentMemoryLayout`; `AgentRunMemoryLayout` was not changed/deleted. | Confirms incomplete migration. |
| 2026-06-11 | Doc | `tickets/done/agent-run-id-global-allocation-refactor/design-spec.md` | Check previous intended design. | Design states `AgentMemoryLayout` composes standalone and hierarchical team directories and `AgentMemoryLocationService` is memory boundary. Removal inventory targeted `team-member-memory-layout.ts` and team resolver, but did not list `agent-run-memory-layout.ts`. | New design must close this omission. |
| 2026-06-11 | Command | `git grep -n "AgentRunMemoryLayout" 0e68304d^ -- autobyteus-server-ts/src autobyteus-server-ts/tests` and `git grep -n "AgentRunMemoryLayout" HEAD -- autobyteus-server-ts/src autobyteus-server-ts/tests` | Compare old/new references. | Before `0e68304d`, old layout had four production consumers. After `0e68304d`, the new allocator added another old-layout consumer while also importing the new layout. | Confirms new work expanded retention instead of finishing cleanup. |
| 2026-06-11 | Command | `rg -n "TeamMemberMemoryLayout|team-member-memory-layout|team-run-member-memory-target-resolver" HEAD -- autobyteus-server-ts/src autobyteus-server-ts/tests tickets/done/agent-run-id-global-allocation-refactor` | Verify previous memory cleanup targets. | No active code references remain for the old team-member layout/resolver targets. | Confirms cleanup was partial and missed standalone layout. |
| 2026-06-11 | Other | User-provided screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f10f48fcdc2043ad8fc39da8e5667d23/solution_designer_9a134e36c5544320ba322bb7697a195a/context_files/ctx_b5d8d9790f61__image.png` | Confirm visible file-level duplication in `agent-memory/store`. | Screenshot shows both `agent-memory-layout.ts` and `agent-run-memory-layout.ts` in the same store folder. | Reinforces removal requirement. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: standalone run creation via `AgentRunService.createAgentRun(...)` / `AgentRunProvisioningService.prepareFreshRun(...)`; team/member ID allocation via `TeamRunService` and `TeamRunLaunchIdentityAssignment`; task-agent allocation via task delegation.
- Current execution flow for standalone allocation:
  1. `AgentRunService.createAgentRun(...)`
  2. `AgentRunProvisioningService.prepareAgentRun(...)`
  3. `AgentRunIdentityAllocator.allocateForAgentDefinition(...)`
  4. `AgentRunIdentityAllocator.hasCollision(...)`
  5. Old `AgentRunMemoryLayout.getRunDirPath(...)` checks standalone filesystem collision
  6. New `AgentMemoryLayout.getTeamAgentRunDirPath(...)` checks team-member filesystem collision
  7. `AgentRunProvisioningService.prepareFreshRun(...)` again uses old `AgentRunMemoryLayout.getRunDirPath(...)` to assign `AgentRunConfig.memoryDir`
- Current team/member memory flow: team services and projection/read services mostly use `AgentMemoryLocationService` and `AgentMemoryLayout` for `agent_teams/<root>/<...teamRunPath>/<memberOrTaskRunId>` paths.
- Ownership or boundary observations:
  - `AgentMemoryLayout` is already the broader memory path owner: standalone root + team root + hierarchical team agent path.
  - `AgentRunMemoryLayout` has no unique remaining subject; it is a subset of `AgentMemoryLayout`'s standalone methods.
  - `AgentRunIdentityAllocator` violates boundary clarity by depending on both a superseding layout boundary and the older subset boundary.
- Current behavior summary: Runtime behavior likely works for valid IDs, but the codebase is in a partially migrated architecture state with a production `V2` field and overlapping memory layout owners.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Legacy Or Compatibility Pressure` plus `Shared Structure Looseness`; secondary `Boundary Or Ownership Issue` in allocator.
- Refactor posture evidence summary: Refactor needed now. Keeping both classes leaves two active path contracts for standalone run memory and normalizes `V2` naming in production code.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agent-run-identity-allocator.ts` | One class holds `agentMemoryLayout: AgentRunMemoryLayout` and `agentMemoryLayoutV2: AgentMemoryLayout`. | Direct dual-boundary and versioned-name smell. | Collapse to one `AgentMemoryLayout` field. |
| `agent-memory-layout.ts` | Contains standalone and team path APIs. | Supersedes old standalone-only layout. | Promote as sole path layout owner. |
| `agent-run-memory-layout.ts` | Contains only standalone `agents/<runId>` APIs. | Redundant subset; no distinct subject left. | Remove after replacing call sites. |
| Previous design spec | Intended `AgentMemoryLayout` as shared path composition owner, but removal inventory omitted old standalone layout. | Root cause is incomplete migration/design scope gap. | New design must name old layout deletion explicitly. |
| Design principles | No backward compatibility/legacy retention; removal first-class; shared structures semantically tight. | Current state violates principles. | Do not use alias/wrapper compatibility. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Compose standalone and hierarchical team memory directories. | Current broad path owner; introduced by the previous global allocation refactor. | Should be sole layout boundary. |
| `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` | Compose standalone run memory directories only. | Older subset of `AgentMemoryLayout`; still imported by five production files. | Remove; no wrapper/alias. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | Allocate unique agent run IDs and check collisions across active, metadata, standalone dirs, team dirs, and member metadata. | Imports/instantiates both layouts; names new one `agentMemoryLayoutV2`. | Highest-priority cleanup target; one `AgentMemoryLayout` field. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Prepare/activate standalone runs; assign memoryDir; cleanup stale prepared runs. | Uses old layout for standalone root and run dir. | Replace with `AgentMemoryLayout` equivalents. |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | Compute draft/final context-file paths. | Uses old layout only for standalone final owner; team final owner already receives `memoryDir`. | Replace standalone with `AgentMemoryLayout`. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | Read/write standalone run metadata. | Uses old layout for metadata path and fallback `memoryDir`. | Replace with `AgentMemoryLayout`. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts` | Resolve safe standalone history identity paths. | Uses old layout to get `agents` root. | Replace root API with `AgentMemoryLayout.getStandaloneRootDirPath()`. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts` | Public memory location boundary. | Already uses `AgentMemoryLayout`, including `getStandaloneLocation`. | Confirms target boundary. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-11 | Static probe | `rg -n "agentMemoryLayoutV2|AgentRunMemoryLayout|AgentMemoryLayout" ...` | `agentMemoryLayoutV2` appears only in allocator; `AgentRunMemoryLayout` remains in active source. | Static cleanup scope is bounded and verifiable. |
| 2026-06-11 | Git history probe | `git blame`, `git show`, `git grep` before/after `0e68304d` | Duplicate fields were introduced with the global allocation refactor; old layout was not removed. | Root cause is incomplete migration, not a necessary long-lived two-version architecture. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static design analysis.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Created dedicated git worktree.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Root cause

The duplicate fields exist because the previous global run-id allocation refactor added a new broader memory layout (`AgentMemoryLayout`) for hierarchical team memory while leaving the older standalone-only layout (`AgentRunMemoryLayout`) in place. The new allocator needed both standalone and team collision checks, so it imported the old standalone layout for `memory/agents/<runId>` and the new layout for `memory/agent_teams/<teamRunId>/<runId>`, naming the latter `agentMemoryLayoutV2`.

This is not acceptable as a steady state. The previous design spec already says `AgentMemoryLayout` composes standalone and team directories, and `AgentMemoryLocationService` is the public memory location boundary. The failure was that the removal inventory named old team-member memory code for deletion but omitted the older standalone `AgentRunMemoryLayout`. As a result, implementation completed the team-memory migration but not the standalone-layout migration.

### Why `V2` exists

There is no domain reason for `V2`. It is an implementation shortcut/name chosen because the allocator already had an `agentMemoryLayout` field of the old `AgentRunMemoryLayout` type, then added `AgentMemoryLayout` for team path checks. A correct design would have renamed the field to `memoryLayout` and converted standalone code to `AgentMemoryLayout.getStandaloneRunDirPath(...)` immediately.

### Why both classes still compile

`AgentMemoryLayout` intentionally uses the same standalone root (`memory/agents`) as `AgentRunMemoryLayout`, so replacing old call sites is mechanically straightforward for normal valid IDs. Existing old consumers kept compiling because their old API names still exist:

- `getRunsRootDirPath()`
- `getRunDirPath(runId)`
- `ensureRunSubtree(runId)`

The new layout exposes equivalent target behavior under semantically clearer names:

- `getStandaloneRootDirPath()`
- `getStandaloneRunDirPath(agentRunId)`
- `ensureStandaloneRunSubtree(agentRunId)`

### Design-principles verdict

Current state violates:

- No legacy/compatibility retention for in-scope replaced behavior.
- Removal is first-class architecture work.
- Shared structures must be semantically tight and avoid overlapping representations.
- Authoritative boundaries should not be bypassed or mixed with their replaced internals.

## Constraints / Dependencies / Compatibility Facts

- Valid generated IDs use `normalizeStoredAgentRunId(...)` and should be path-segment-safe. `AgentMemoryLayout` is stricter than `AgentRunMemoryLayout` for slash/backslash input; this is desirable invariant tightening for path composition.
- Historical standalone metadata stores `memoryDir` in `AgentRunMetadata`. `AgentRunMetadataStore` already preserves non-empty stored `metadata.memoryDir`; replacing fallback path composition with `AgentMemoryLayout` preserves behavior for valid data.
- The team layout shape is already documented as root-hierarchical and implemented by `AgentMemoryLayout`; this task should not alter team topology semantics.

## Open Unknowns / Risks

- Need implementation check for any barrel exports or package-level public exports not covered by source grep.
- Need test selection after implementation; likely unit tests around `AgentMemoryLayout`, `AgentRunIdentityAllocator`, `AgentRunProvisioningService`, `AgentRunMetadataStore`, context files, and run-history identity.
- Need decide whether to add a permanent static regression test for banned old layout symbols or rely on code review/static grep evidence.

## Notes For Architect Reviewer

If the user approves moving forward, design should be a clean-cut deletion/refactor:

1. Make `AgentMemoryLayout` the sole path layout owner.
2. Convert old standalone call sites to `AgentMemoryLayout` methods.
3. Delete `AgentRunMemoryLayout`.
4. Reject aliases/wrappers/compatibility names.
5. Include a removal verification step that greps for `AgentRunMemoryLayout`, `agent-run-memory-layout`, and `agentMemoryLayoutV2`.
