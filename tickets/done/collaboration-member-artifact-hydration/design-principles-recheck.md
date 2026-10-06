# Design-Principles And Requirements-Standards Recheck — SR-002

- Date: 2026-10-06. Author: Solution Designer.
- Trigger: the user found that `design-principles.md` and `references/requirements-engineering.md` had not been read when SR-001/SR-002 were authored, and asked for a recheck. Implementation is paused on user instruction (work in progress is uncommitted in the worktree).
- Authorities read: `.claude/skills/solution-designer/design-principles.md`, `references/requirements-engineering.md`, `references/architecture-design.md`.

## Findings: Requirements (`requirements-engineering.md`)

| ID | Rule | Finding | Required Action |
| --- | --- | --- | --- |
| RF-1 | "Never mark the package `Approved` without explicit user approval"; scope changes need explicit approval (L26, L40) | REQ-006 (standalone-agent collaborators) was added by me and marked `Approved` with "flagged for veto". A veto option is not explicit approval. | Set REQ-006 to pending; ask the user. |
| RF-2 | Same rules; plus Principle 6: infrastructure failure is out of scope by default unless a contract makes it relevant | REQ-005 / AC-007 (an artifact-fetch failure must not block other members) is a new resilience policy I introduced. The user did not request it, and it **diverges** from each path's existing policy (Org/collaborator projections fail the whole open; Team uses exact-for-focused and best-effort for others). | Replace it with preserved behavior: a member's artifacts follow the same failure policy as that member's projection in that path. This needs user approval because it removes REQ-005. |
| RF-3 | Investigation must cover the real production path | The SR-001 investigation missed the Team open staging owner (DI-001). Fixed in SR-002. | None further. |
| RF-4 | Every scenario needs supported-scenario evidence | SCN-006 had "Code" only. Evidence now: collaborators appear as task rows (`components/workspace/history/AgentRunTaskRows.vue`), selecting one makes it the active context, and `ArtifactsTab.vue:41` reads `activeAgentContext.state.runId`. This is a Supported Normal Scenario **if** REQ-006 is approved. | Record the evidence. |

## Findings: Design (`design-principles.md`)

| ID | Principle / Trigger | Finding | Design Response |
| --- | --- | --- | --- |
| DF-1 | **Repeated coordination trigger**; `Duplicated Policy Or Coordination`; "removal is first-class" | The revision-guarded activity commit (`replaceProjectionActivitiesIfRevisions` + conflict handling) is already repeated at 6 production sites: `agentRunOpenCoordinator.ts:79`, `runContextHydrationService.ts:175`, `teamRunHydrationCommit.ts:10`, `teamMemberProjectionHydrationService.ts:100`, `agentOrgContextHydration.ts:179`, `agentRunCollaborationHydration.ts:117`. SR-002 adds a **second parallel policy** (artifact merge) beside 4 of them, and a "fetch artifacts next to the projection" step in 4 stagings. This is the same duplication that caused the bug: artifacts were added to one path only, and later paths copied the others without them. My SR-001/002 "shared fetch helper only" decision does not satisfy the trigger. | **Refactor now:** one owner for *member-run state hydration*: stage (projection ∥ artifacts, with the expected activity revision) and commit (activity replace → artifact merge, returning `applied`/`conflict`). Each member path supplies only its subject-specific projection fetch and its own conflict reaction (throw vs retry). Adding artifacts then happens once, and a future member path cannot omit them. |
| DF-2 | Shared-structure tightness; no overlapping representations | SR-002 adds `fileChangesByAgentRunId` beside the existing `activityReplacements: ActivityProjectionReplacement[]`, i.e. two parallel per-member collections keyed by runId. | Use one staged per-member record that carries activities and artifacts. Do not create a parallel map. |
| DF-3 | Ambiguous-boundary trigger | `getRunFileChanges(runId)` takes a bare runId while member projections use compound identities. **Not triggered:** the subject is always one AgentRun's file changes, `agentRunId` is unique, and the server resolves location, not subject. | Record as considered; no change. |
| DF-4 | Spine Span Sufficiency (4–5 meaningful nodes, initiating surface to consequence) | DS-001/002/005 start at the service and end at the store. They omit the UI trigger, the server boundary and the Artifacts tab outcome. | Restate spines, e.g. `Workspace history row / page reload → Team open coordinator → teamRunContextHydration (stage) → GraphQL getRunFileChanges (server RunFileChangeProjectionService) → member-run hydration commit → runFileChangesStore → ArtifactsTab`. |
| DF-5 | Empty-indirection trigger | `fetchMemberRunFileChanges` (best-effort wrapper) existed only for REQ-005. | Remove it if RF-2 is approved; artifacts follow each path's projection policy. |
| DF-6 | Naming / authoritative boundary | No bypass found: member services will depend on the new owner, not on the store and the owner at the same time. The `commitActivities` → `commit` rename stays valid. | Keep it. |
| DF-7 | Scenario gate (Principle 6) | The conflict/retry and live-merge race (SCN-005) is a Supported Normal Scenario: live events arrive during active-run hydration. | Keep it, handled inside the new commit owner. |

## Design-Health Reassessment

- Change posture: `Bug Fix`
- Root cause: `Duplicated Policy Or Coordination`, now evidenced as six copies of the member-state commit policy plus per-path fetch staging, not merely an inline query.
- Refactor needed now: `Yes`. Extract a member-run state hydration owner (stage + commit), remove the per-path commit copies in the member paths, and use one staged record (DF-1, DF-2, DF-5).
- Standalone path: it keeps its own commit (replace vs KEEP_LIVE merge differs, and REQ-004 is preserved). It only reuses the strict artifact fetch. This is deferred with residual risk: the standalone commit remains a separate copy, kept out of scope because its live/cold policy differs.
- Expected classification after revision: `Medium`; `architectural_risk` likely `High` (a new shared owner across 4 member paths, a changed commit sequencing contract, about 15 files). Final classification follows the revised design spec.

## Pending User Decisions

1. REQ-006: include collaborators of standalone agents? (RF-1)
2. ~~Replace REQ-005…?~~ **Resolved without a user decision (SR-003):** REQ-005 was never approved, so withdrawing it needs no approval. AC-007 records *preserved* per-path behavior (no new policy). The failure premise is out of scope by default (design-principles Principle 6), and ARCH-REV-001 accepted this as MP-001.

The design revision (SR-003) proceeds after these answers.
