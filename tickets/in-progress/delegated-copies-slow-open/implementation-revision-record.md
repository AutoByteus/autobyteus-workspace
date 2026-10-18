# Implementation Revision Record — delegated-copies-slow-open

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-004 (requirements SR-002), ARCH-REV-002 | Implementation complete; routed to Code Reviewer |

## Revision Entries

### IR-001 — Hub copy rows from the view; copy details on open; hub-scoped copy artifacts

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, round 2 (ARCH-REV-002, Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation of D-1..D-5 complete; implementation-scoped checks IMP-01..IMP-09 recorded in `implementation-handoff.md` (IMP-05 failed once under parallel load in an unrelated Electron test; IMP-05b and IMP-05c pass)
- Related solution revision IDs: SR-004 (design), SR-002 (requirements)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-005; REQ-001..REQ-007; AC-001..AC-007, AC-009 (AC-008 / REQ-008 timings are left to API/E2E).
- Implementation delta:
  - Server (commit `c21d468d9e`):
    - `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection` is extracted, and `readProjectionContext` reuses it.
    - `StandaloneRootMemberViewProjectionService.getFileChanges` is added.
    - The GraphQL query `agentRunCollaborationMemberFileChanges` is added.
    - `RunFileChangeEntryObject` is exported.
  - Web (commit `291545c66f`):
    - `buildAgentRunCollaborationContext` replaces `stageAgentRunCollaborationContext`.
    - New `agentRunCollaborationChildHydration.ts`.
    - Context: the hydrated set, and adoption carry-over with the new view's pending input.
    - Store: `ensureChildHydrated`, the single dedupe owner keyed by `WeakMap<context, Map<child, Promise>>`. Publish has no commit. `selectChild` and publish trigger loads.
    - The streaming service publishes the built context.
    - `fetchMemberRunState` takes an explicit `fetchFileChanges`, and the team and org callers are updated.
    - `overlayPendingUserMessages` is added and shares the merge rule of `upsertPendingUserMessage`.
    - Query and generated types.
    - Specs, the collapse probe and the native-input-history harness are updated.
  - Docs (commit `54e5356ae6`): web `agent_execution_architecture.md` and `chat.md`; server `standalone_agent_run_root.md` and `agent_artifacts.md`.
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: IMP-01..IMP-09 Pass, except IMP-05: one unrelated Electron test timed out under parallel load; it passes alone (IMP-05b) and the full suite passes with nothing else running (IMP-05c). See the handoff's Checks Run table.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Medium / High).
- Remaining limitations or risks:
  - Pending-input preservation on load is an implementation-level addition inside DS-005's commit step. It is flagged for review.
  - Live-tool authority is read at commit time rather than compared across the fetch.
  - R-004 and the FU-1 duplication are accepted residuals.
  - AC-008 timings are not measured here.
