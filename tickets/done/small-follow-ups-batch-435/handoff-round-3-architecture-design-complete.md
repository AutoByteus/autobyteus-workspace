# Handoff — Architecture Design Complete, round 3 (autobyteus-435, SR-003)

## Result

- Classification: `Architecture Design Complete` (revised after code review CRR-001, Design Impact CR-001)
- Package: `small-follow-ups-batch-435` (Task `autobyteus-435`); solution revision `SR-003`; `task_size=Medium`, `architectural_risk=High` (unchanged)
- Next expected action: architecture re-review of the DS-006 delta; then implementation rework limited to DS-006 entry form 2 / DS-006b on top of IR-001 (`e5ca0e1da7`, `6ca743fee0`, docs `49c64e47ee`); then the code reviewer's Targeted Delta Review (as CRR-001 states).

## What changed (CR-001)

- Premise corrected: `onLaunched(runId)` receives the draft's `temp-*` ID (`useMobileRunLaunchCoordinator.ts:50-53` → `agentContextsStore.createRunFromTemplate`, `agentContextsStore.ts:90-111`); the node run exists only after the first send, which re-keys the same context (`agentRunStore.ts:214-223` → `promoteTemporaryId`, `agentContextsStore.ts:160-173`).
- New DS-006b: `useMobileRouteRunSync` (mounted once by `MobilePairedShell`) detects the promotion with the desktop chat's existing rule (`useChatRouteRunSync.ts`, D-13: selection R → P and the same context object under P), records R → P for the page, and calls `useMobileNavigation.replaceRowKey(agentRunRowKey(P))` for the current entry at promotion and on any later route change whose `row` is a recorded `agent:R` (Back to entries pushed before the send). `useMobileNavigation` stays the only route writer; stores stay unaware of the phone route.
- Requirements (within the direction, user informed): AC-005-6 precondition "first message sent; route names the node's run ID"; AC-005-8 "reload before the first send → list" (DEC-016: nothing exists on the node yet; drafts are never listed, `runListProjection.ts:89-91`; New run would imply the draft was kept).
- Tests required: follow a real draft through promotion (no stubbed ID), including a view pushed before the send and Back to earlier entries; reload before the send → list; a non-promotion selection change leaves the route alone.
- Also: FU-002 now lists `teamExecutionViewState.ts` (516); `docs/design-cases.md` Case 20 added (uncommitted, commit with the ticket documents). C-05 left as the code reviewer's optional tidy-up.

## Approval basis

Requirements SR-003 approved by the Solution Designer within the Task's direction; user informed in the conversation (2026-11-10). No `Needs user` decision.

## Workspace

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435` (IR-001 committed), base `origin/personal` @ `310fc27452`; target `origin/personal`.

## Artifacts (ticket folder)

requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md (SR-003), follow-ups.md, code-review-report.md (CRR-001, reviewer-owned), design-review-report.md (reviewer-owned); `docs/design-cases.md`.

## Route

Handoff rules applied (2026-11-10): "Architecture Design Complete with … architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`.
