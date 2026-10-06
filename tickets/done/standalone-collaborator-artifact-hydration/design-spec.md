# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001 (REQ-001..003, AC-001..005); user approval 2026-10-06 ("i want to have collaboros of standa aloen agents to be fixed as well").
- Behavior-defining supplements: None
- Authorities read (design reading gate; 2026-10-06): `.claude/skills/solution-designer/references/architecture-design.md`, `.claude/skills/solution-designer/design-principles.md` (including §Project-Specific Design Principles), project `DESIGN.md` at the repository root (the only `DESIGN*.md` found; applies to `autobyteus-web`). `design-examples.md`: not used.
- Design status: `Ready`
- Canonical investigation notes: `/home/autobyteus/workspace/.codex/worktrees/standalone-collaborator-artifact-hydration/tickets/in-progress/standalone-collaborator-artifact-hydration/investigation-notes.md`

## Current-State Read

Base `origin/personal` @ `0d3e6e82f`. Team open, Team lazy and Org member hydration already fetch and commit member state through `services/runHydration/memberRunStateHydration.ts` (predecessor `collaboration-member-artifact-hydration`). Collaborator staging (`services/agentCollaboration/agentRunCollaborationHydration.ts:68-120`) is the last member path still outside it. It fetches only the projection and commits activities through its own copy of the revision-guarded replace (`:112-117`), exposed as `commitActivities` to `stores/agentRunCollaborationStore.ts:67-70,129-130` and `services/agentCollaboration/agentRunCollaborationStreamingService.ts:51,184-189`. So collaborator artifacts are never hydrated. The predecessor design recorded this as a deferral pending REQ-006.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: 3 production files in one capability area (collaborator staging plus 2 callers of the renamed callback), and the specs that use the callback name. It applies an existing owner to one more caller, mirroring the Org change.
- Architectural risk: `Low`
- Risk rationale: no new owner, contract, API, persistence or concurrency semantics. It reuses `fetchMemberRunState` / `commitMemberRunStates` exactly as Org does (same revision-guard-then-merge ordering, same failure coupling). The callback rename is local to the collaboration store and streaming service.
- Escalation trigger: if the server cannot resolve collaborator runIds (ASM-001), or if collaborator staging needs a different commit order or revision source than the shared owner allows, return a `Design Impact`.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision | Uncertainty |
| --- | --- | --- | --- | --- |
| Collaborator staging | `agentRunCollaborationHydration.ts:68-120` | Projection-only fetch; local commit copy | Route through the shared owner | None |
| Org reference | `agentOrgContextHydration.ts:140-185` | `fetchMemberRunState` + `commit()` → `commitMemberRunStates` | Mirror it | None |
| Shared owner | `memberRunStateHydration.ts` | Subject-agnostic; caller supplies the projection fetch and revision | Reuse as is | None |
| Server lookup | `collaboration-execution-location-service.ts:36-50`; `standalone-root-location-service.ts:61-120` | Root-less lookup scans host trees (and Team/Org roots); measured ≈ 20 ms vs ≈ 1 ms | No change in this ticket (FUP-001) | Live collaborator probe pending (no data on node) |

## Intended Change

1. `stageAgentRunCollaborationContext`: for each collaborator, replace `fetchProjection(...)` with `fetchMemberRunState({ runId: child.agentRunId, fetchProjection: () => fetchProjection(input.hostRunId, child) })`. Build the conversation from `projection` as today, and stage a `MemberRunStateCommit` `{ runId, expectedActivityRevision: revisions.get(id)!, activities: buildActivitiesFromProjection(projection.activities), fileChanges }`. The revision source is unchanged.
2. Return `{ context, commit }`. `commit()` keeps the existing ownership-released check, then calls `commitMemberRunStates(states)` and throws the existing conflict error on `conflict`. The local `replaceProjectionActivitiesIfRevisions` call is removed.
3. Rename the callback `commitActivities` → `commit` in `agentRunCollaborationStore.ts` and `agentRunCollaborationStreamingService.ts`, and in their specs.
4. Verify `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` (still contains `commitActivities`, likely a stale mock name from the predecessor ticket). Rename it if it refers to the removed name.
5. Update the `memberRunStateHydration.ts` doc comment to state that it covers collaborators, and update `autobyteus-web/docs/agent_artifacts.md` (owner table) through the normal docs sync.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Req / AC | Trigger | Existing | Change / Preserved | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003 / AC-001, AC-002, AC-005 | Host run open after reload / history row; stream recovery | No collaborator artifacts | Artifacts staged and committed by the shared owner; failure behaves like a projection failure | DS-001 |
| BEH-002 | User | REQ-002 / AC-003 | Live `FILE_CHANGE` | Merge | Preserved (owner merges by `updatedAt`; nothing written on conflict) | DS-002 |
| BEH-003 | User | REQ-003 / AC-004 | Standalone / Team / Org | Correct | Untouched | — |

## Relevant Supplemental Task Artifacts

| Path | Purpose | Relationship |
| --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/collaboration-member-artifact-hydration/` | Shared owner design (SR-003) and the deferral this completes | Read-only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes` (residual)
- Root cause classification: `Duplicated Policy Or Coordination`. Collaborator staging keeps its own copy of the member-state commit, outside the shared owner, so it lacks artifacts.
- Structural triggers that fire:
  - **Repeated coordination: fires.** The collaborator copy of the revision-guarded commit (`agentRunCollaborationHydration.ts:112-117`) duplicates `commitMemberRunStates`. It is resolved by routing through the owner, which leaves only the 2 deferred standalone copies.
- Triggers checked and ruled out:
  - Authoritative boundary: the collaborator staging will depend on the owner only, with no direct store writes.
  - Empty indirection: no new layer is added.
  - Shared-structure tightness: `MemberRunStateCommit` is reused unchanged.
  - Ambiguous boundary: `getRunFileChanges(agentRunId)` concerns one AgentRun.
  - Capability-area reuse: `services/runHydration` and `services/agentCollaboration` are reused.
  - Legacy cleanup: the old callback name is removed, with no alias.
  - Persisted data: none.
- Project `DESIGN.md` check (root): smallest coherent owner (rule 5, §3), because it reuses the existing owner and adds no new state. No speculative machinery or failure policy (rules 1, 4). §2/§4 (global work, payload): see FUP-001. This change adds one collaborator artifact request per collaborator, as Team/Org do. Each such request does a root-less server lookup that scans stored roots. This is not addressed here: it was not requested, and it is not yet a demonstrated user-visible problem (DESIGN.md Phase 2), so it is recorded as a follow-up candidate.
- Refactor needed now: `Yes` (small; the shared owner absorbs the last member path).
- Evidence: investigation-notes Source Log; predecessor design-spec deferral.
- Design response: route collaborator staging through `memberRunStateHydration`; remove its local commit; rename the callback.
- Intentional deferrals and residual risk:
  - Standalone commit copies (2) remain, as in the predecessor (their cold/live policy differs; preserved).
  - FUP-001 (server global-scan lookups plus eager per-member artifact fetch at open) remains open for a user decision.

## Terminology

Collaborator: an AgentRun started by a standalone host agent run.

## Legacy Removal Policy (Mandatory)

Remove the local `replaceProjectionActivitiesIfRevisions` call in collaborator staging and the `commitActivities` name (production and specs). No aliases.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | User reloads / opens a host run with collaborators | Collaborator artifacts in the Artifacts tab | `agentRunCollaborationHydration` → `memberRunStateHydration` | The gap |
| DS-002 | Return-Event | BEH-002 | Collaborator `FILE_CHANGE` | store merge → Artifacts tab | `fileChangeHandler` | Unchanged |

## Primary Execution Spine(s)

- DS-001: `Workspace history row / reload / stream recovery → agentRunCollaborationStore (or agentRunCollaborationStreamingService) → stageAgentRunCollaborationContext → fetchMemberRunState ⇄ server (getAgentRunCollaborationMemberProjection ∥ getRunFileChanges → RunFileChangeProjectionService) → publish(context, commit) → commitMemberRunStates → agentActivityStore + runFileChangesStore → ArtifactsTab (activeAgentContext.state.runId)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | Hydrating a host run's collaborators stages each collaborator's projection and artifacts. Publishing commits activities under revision guards, then merges artifacts, through the shared owner | collaborator run state | collaborator staging + shared owner | GraphQL fetch |

## Spine Actors / Main-Line Nodes

Collaboration store / streaming service (trigger), `agentRunCollaborationHydration` (staging), `memberRunStateHydration` (owner), server, stores, `ArtifactsTab`.

## Ownership Map

- `memberRunStateHydration`: what member state contains, and commit sequencing (unchanged).
- `agentRunCollaborationHydration`: collaborator enumeration, the projection query, the revision source, conversation application, the ownership-released check, and the conflict reaction (throw).

## Thin Entry Facades / Public Wrappers (If Applicable)

The collaborator `commit()` is a thin facade over `commitMemberRunStates` plus the ownership check; it must not re-implement the commit.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| Local revision-guarded replace in collaborator staging | Duplicated policy | `commitMemberRunStates` | In This Change |
| `commitActivities` name (collaborator production + specs) | Commits full member state | `commit` | In This Change |

## Return Or Event Spine(s) (If Applicable)

DS-002 unchanged.

## Bounded Local / Internal Spines (If Applicable)

N/A. There is no loop (single staged commit).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Owner | Responsibility |
| --- | --- | --- | --- |
| Artifact fetch | DS-001 | `runFileChangeHydrationService.fetchRunFileChanges` (via the owner) | query + errors |

## Ownership Boundaries

Collaborator staging must not call `replaceProjectionActivitiesIfRevisions` or `mergeHydratedRunFileChanges` directly.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `memberRunStateHydration` | guarded activity commit + artifact merge + parallel artifact fetch | Team open, Team lazy, Org, **collaborators** | direct store writes from member staging |

## Dependency Rules

`agentCollaboration` → `runHydration/memberRunStateHydration`. Not the reverse.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `stageAgentRunCollaborationContext(...) → { context, commit }` | host run's collaborators | stage; deferred commit | `hostRunId` |
| `fetchMemberRunState`, `commitMemberRunStates` | unchanged | — | — |

## Interface Boundary Check

Singular; explicit identity; low risk.

## Main Domain Subject Naming Check

`commit` matches Org's staged `commit`, so it is consistent.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Member state fetch/commit | `memberRunStateHydration` | Reuse |

## Subsystem / Capability-Area Allocation

`services/agentCollaboration` (Extend), `stores` (call site).

## Draft File Responsibility Mapping

See final.

## Reusable Owned Structures Check

`MemberRunStateCommit` reused; no new structure.

## Shared Structure / Data Model Tightness Check

Unchanged.

## Final File Responsibility Mapping

| File (autobyteus-web/) | Change | Concern |
| --- | --- | --- |
| `services/agentCollaboration/agentRunCollaborationHydration.ts` | Modify | stage/commit via the owner; `commit` |
| `stores/agentRunCollaborationStore.ts` | Modify | rename the callback |
| `services/agentCollaboration/agentRunCollaborationStreamingService.ts` | Modify | rename the callback |
| `services/runHydration/memberRunStateHydration.ts` | Modify (comment) | coverage note |
| Specs: `stores/__tests__/agentRunCollaborationStore.spec.ts`, `stores/__tests__/agentRunCollaborationStoreClosure.spec.ts`, `services/agentCollaboration/__tests__/agentRunCollaborationStreamingService.spec.ts`, a collaborator hydration spec (add if absent: AC-001/002 artifacts committed, AC-003 conflict → nothing written, AC-005 failure parity), `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` (verify the stale name) | Modify/Add | coverage |

## Applied Patterns (If Any)

Staged commit through the shared owner (existing).

## Target Subsystem / Folder / File Mapping

No new files except a spec if absent.

## Folder Boundary Check

Unchanged.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Staging | `const { projection, fileChanges } = await fetchMemberRunState({ runId: child.agentRunId, fetchProjection: () => fetchProjection(input.hostRunId, child) })` | a separate `fetchRunFileChanges` call with its own error handling |
| Commit | `commit: () => { ownershipCheck(); if (commitMemberRunStates(states) === 'conflict') throw … }` | keeping `replaceProjectionActivitiesIfRevisions(replacements)` and adding a merge beside it |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep `commitActivities` as an alias | Rejected | rename |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Collaborator staging via the owner; `commit`.
2. Callers and specs renamed; new or updated collaborator hydration spec.
3. Docs sync (`agent_artifacts.md`) by the delivery owner.
4. API/E2E: create a standalone run with a collaborator that produces ≥ 2 artifacts; verify after reload and on history (AC-001/002). This also verifies ASM-001.

## Key Tradeoffs

Failure coupling stays as today (an artifact failure fails collaboration hydration, as a projection failure does). This matches Team/Org and adds no new policy.

## Risks

- ASM-001 is not probed live (no collaborator data on node 8001).
- FUP-001 (server global-scan lookups) applies to collaborators as to Team/Org; it is open for a user decision.

## Guidance For Implementation

- Mirror `agentOrgContextHydration.ts:140-185`.
- Keep the ownership-released check before committing.
- Tests for AC-001/AC-002 must fail on base.
