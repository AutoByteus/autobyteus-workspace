# Investigation Notes

## Investigation Meta

- Package identifier: `standalone-collaborator-artifact-hydration`
- Request / ticket: The Artifacts tab of a collaborator started by a standalone agent must load its full list after a reload and on historical runs, consistent with standalone agents, Team members and Org members.
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/standalone-collaborator-artifact-hydration`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/standalone-collaborator-artifact-hydration`
- Resolved base: `origin/personal` @ `0d3e6e82f` (fetched 2026-10-06; includes `collaboration-member-artifact-hydration` merge `4e66fce54`)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `.claude/skills/solution-designer/SKILL.md` (updated reading gates), `references/requirements-engineering.md`, `references/architecture-design.md`, `design-principles.md` (including the new §Project-Specific Design Principles), root `DESIGN.md` (no closer `DESIGN*.md` exists; `find . -name "DESIGN*.md"`), `autobyteus-web/AGENTS.md`.
- Investigation status: Complete.

## Initial Request And Clarifications

- User (2026-10-06): "i want to have collaboros of standa aloen agents to be fixed as well."
- Origin: `collaboration-member-artifact-hydration` REQ-006 (pending there, now approved by the user as its own ticket). Archived predecessor: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/collaboration-member-artifact-hydration/`.

## Product And Domain Understanding

- A standalone agent can start collaborators (agent-initiated collaborators). They appear as task rows under the host run (`components/workspace/history/AgentRunTaskRows.vue`). Selecting one makes its AgentContext active, and `components/workspace/agent/ArtifactsTab.vue:41` shows `runFileChangesStore` entries for `activeAgentContext.state.runId`.

## Source Log

| Date | Source Type | Source | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | Code | `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts:68-120` (`stageAgentRunCollaborationContext`) | Collaborator hydration | Eagerly stages every collaborator: projection (`GetAgentRunCollaborationMemberProjection`, exact, throws), conversation, activities; deferred `commitActivities()` does the revision-guarded replace. **No artifacts.** Revision: `input.activityRevisions` or captured before the fetch | Gap confirmed |
| 2026-10-06 | Code | Callers: `stores/agentRunCollaborationStore.ts:67-70,129-130`; `services/agentCollaboration/agentRunCollaborationStreamingService.ts:51,184-189` | Commit callback | `commitActivities` passed to `publish` | Rename to `commit` (consistent with Org) |
| 2026-10-06 | Code | `services/runHydration/memberRunStateHydration.ts` (`fetchMemberRunState`, `commitMemberRunStates`) | Existing shared owner | Used by Team open, Team lazy and Org; designed to absorb collaborators (predecessor design-spec deferral) | Reuse |
| 2026-10-06 | Code | `services/agentOrgExecution/agentOrgContextHydration.ts:140-185` | Reference shape | Org staging calls `fetchMemberRunState` per member and returns `commit()` → `commitMemberRunStates` | Mirror |
| 2026-10-06 | Command | `grep -rln commitActivities autobyteus-web` | Rename scope | Production: `agentRunCollaborationHydration.ts`, `agentRunCollaborationStore.ts`, `agentRunCollaborationStreamingService.ts`. Specs: `stores/__tests__/agentRunCollaborationStore.spec.ts`, `stores/__tests__/agentRunCollaborationStoreClosure.spec.ts`, `services/agentCollaboration/__tests__/agentRunCollaborationStreamingService.spec.ts`, and `services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts` (likely a stale name left from the predecessor ticket; verify) | — |
| 2026-10-06 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/services/collaboration-execution-location-service.ts:36-50`; `standalone-agent-run-root/services/standalone-root-location-service.ts:61-67,88-120` | Server resolution of collaborator runIds | `getRunFileChanges(agentRunId)` without a root → `findAgent` default branch runs teams, orgs and standalone hosts in parallel; the standalone branch lists all host collaboration dirs and reads each tree until found | Works (code); global-scan cost noted (FUP-001) |
| 2026-10-06 | Runtime | `/home/autobyteus/data/memory`: 70 team roots, 1 org root, 50 standalone runs, 0 host collaboration trees | Live data | No collaborator run with artifacts on node 8001 | Validation must create one (API/E2E) |
| 2026-10-06 | Runtime | `curl getRunFileChanges` timing ×3: Org member `solution_designer_f8f18a3a…` ≈ 19–27 ms; standalone `daily_assistant_15a40b86…` ≈ 1–2 ms | Cost of root-less member lookup | Member lookups scan stored roots; cost grows with history (DESIGN.md §2) | FUP-001 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Reload / open a historical standalone run with collaborators; select a collaborator | `agentRunCollaborationStore` → stage → publish/commit (no artifacts) | Collaborator Artifacts empty | Code (same mechanism as the fixed Team/Org gap) | High (code-evident) |
| BEH-002 | User | Live `FILE_CHANGE` from a collaborator | Stream → `runFileChangesStore` merge | Works | Shared adapters | High |
| BEH-003 | User | Standalone, Team, Org Artifacts | Fixed / unchanged | Correct | Predecessor tickets | High |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Implication |
| --- | --- | --- |
| `memberRunStateHydration.ts` | Shared member-run state owner | Collaborators become its 4th user; the last member-path commit copy is removed |
| `agentRunCollaborationHydration.ts` | Collaborator staging | Use `fetchMemberRunState`; return `commit` |

## Structural And Payload Surface Inventory

- Payload: none.
- Structural: collaborator staging + 2 caller files + specs. No API, persistence or server change.
- Potential impacts: concurrency is handled by the shared owner (existing); no new owner.

## Runtime, Probe, Or Reproduction Findings

As in the Source Log. No reproduction is possible on node 8001 (no collaborator data); expected by code identity with the B-003/B-004 mechanism.

## Stakeholder And User Evidence

| Source | Need | Implication |
| --- | --- | --- |
| User | Collaborators fixed like Team/Org | REQ-001 |

## External Contracts, Standards, And Dependencies

GraphQL `getRunFileChanges(runId)`: unchanged.

## Persisted Data And State Facts

Not affected.

## Product Design Request Context

`Not stated`; N/A.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| Predecessor folder `tickets/done/collaboration-member-artifact-hydration/` | Shared owner design, REQ-006 origin | Read-only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | No live collaborator data to reproduce | API/E2E creates a collaborator run (TESTING.md) | Open |
| FUP-001 | Risk / follow-up candidate | Root-less `getRunFileChanges` and `/file-change-content` lookups for members scan stored Team/Org/host trees (measured ≈ 20 ms vs ≈ 1 ms at 70 team roots; grows linearly). Combined with eager per-member artifact loading at Team/Org/collaborator open (predecessor receipt note DSN-1): M members × scan. DESIGN.md §2/§3 and its anti-patterns flag this kind of global work | **Out of scope** (performance was not requested and is not yet user-visible; DESIGN.md Phase 2). Ask the user about a follow-up ticket | Open |

## Architecture Investigation Findings

- Collaborator staging has the same shape as Org staging before the predecessor ticket. The shared owner applies directly, which removes the last member-path copy of the revision-guarded commit (predecessor deferral "collaborator commit copy, pending REQ-006").

## Requirement Implications

- REQ-001 (collaborator artifacts on hydration), preserved live/other paths, preserved failure policy (collaborator projection fetch is exact, so an artifact failure fails the collaboration hydration as a projection failure does today).

## Notes For Architecture Design

- Mirror the Org pattern; rename `commitActivities` → `commit`; keep the revision source (`activityRevisions` or captured before the fetch).
