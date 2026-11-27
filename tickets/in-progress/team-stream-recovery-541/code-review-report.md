# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002; REQ-001…008, AC-001…010, DEC-001…005)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002 with its amendment `fe0fd54a41`)
- Design Spec Reviewed As Context: `design-spec.md` (A: D-A1…D-A8 and walks; B; C; D and E)
- Supplemental Task Artifacts Reviewed As Context: none
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass; N-4, N-5). It is untracked and was left as found.
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`. Round 2 is the `API/E2E Failure-Origin Review` of API-REV-001 F-1:
  - code tested: `9e508b3adf`;
  - API/E2E's commit: `488e231641`;
  - reproduction: SDD-16;
  - control: SDD-17.

  Round 1 below stays as recorded.
- Previous: `CRR-001`
- Current Review Round: `2`
- Review Scope: `Full Review` of `80420a8bf6..9e508b3adf`:
  - source commits `6dd0950606`, `29fc65eaaf`, `5a2ddf0fa2`;
  - probe commits `12105e8360`, `e0a99d6b6d`, `a9ac2b40df`.
- Trigger: implementation engineer, IR-001, Large / High

## Routing Classification Review

Large / High: the Team stream lifecycle and a concurrent commit rule. `Implementation Review` with independent source review. Confirmed.

## Review Scope

- **Read in full:**
  - `stores/teamStreamRecoveryStore.ts`, `services/runOpen/teamStreamAutoRecovery.ts`, `plugins/teamStreamRecovery.client.ts`;
  - `teamRunOpenCoordinator.ts`, `agentRunOpenCoordinator.ts`;
  - `agentTeamRunStore.ts` (connect, `ensureTeamStreamConnected`, `replaceFailedTeamStream`, `disconnectTeamStream`, `sendMessageToFocusedMember`, `followCurrentMember`);
  - `localUserSubmission.retargetLocalUserSubmissionContext`, `AgentContext.carryAgentContextPageState`;
  - `runHistoryLoadActions.ts` (C), `agentRuntimeStatusState.ts`;
  - `TeamWorkspaceView.vue`, `MobileRunTargetView.vue`, `MessagePrimaryActionButton.vue`;
  - the server `team-tool-approval-command-handler.ts` and its caller;
  - the Org splits (`agentOrgPendingCommands.ts`, `agentOrgConfigWorkspaces.ts`).
- **Also read, for consumers:**
  - `TeamStreamingService`'s option and its effects;
  - `agentTeamContextsStore.removeTeamContext` and its caller `runHistoryMutationActions.cleanupStoredTeamRunLocalState`.
- **Re-run by me at `9e508b3adf`:**
  - web: `services/runOpen`, `services/runSubmission`, `services/agentStreaming`, `services/agentOrgExecution`, `stores/__tests__`, the Team, mobile run-screen, history and composer components; 190 files and 1,875 tests passed;
  - server: the approval handler's test and the agent-streaming tests; 25 files and 218 tests passed.
- **Excluded:** the probes' runs (IMP-003…006 used); the full suites (IMP-002).

## Upstream Behavior And Production-Path Basis Confirmation

Behavior-basis status: `Confirmed`.

| Behavior | Status | Implementation Path And Evidence |
| --- | --- | --- |
| REQ-001 / AC-001, AC-003 (recover by itself; one per Team) | Confirmed | `TeamStreamingService` → `onStreamRecoveryRequired` (required option) → `teamStreamRecoveryStore.publishRequired` (it throws with no owner). The plugin's owner watches; for each `required`, one `LiveStreamReconnectScheduler` attempts `reopenTeamRunAfterStreamLoss({ selectRun: false })`. The coordinator's `recoveriesByTeamRunId` makes it single-flight; a reselect joins it, then loads and focuses its own member. The commit (`replaceFailedTeamStream`) clears the state, and the watch ends the scheduler |
| REQ-002 / AC-002, AC-010 (send, Stop, page state, notice) | Confirmed | `ensureTeamStreamConnected` polls the current service for 10 s, then `not_sent` (540). `followCurrentMember` re-resolves the member after the wait, after the send and before a failure; `retargetLocalUserSubmissionContext` moves a shown row unless its echo is there, and moves a held one without a row (N-5). `carryAgentContextPageState` carries the seven fields in the synchronous commit, not `interruptPending`. The notice shows only for `exhausted`, desktop and phone, localized |
| REQ-003 / AC-004 (C) | Confirmed | `runHistoryLoadActions` no longer applies the placeholder to existing contexts (standalone and Team); a reopen-required Team is skipped (its owner's); `applyActiveRuntimePlaceholder` and the dead coordinator are removed |
| REQ-004 / AC-005 (B1) | Confirmed | An active run opens with `normalizeAgentRuntimeStatus(runStatusStore.statusOf(runId), Initializing)`, a stopped one with `Offline` |
| REQ-005 / AC-006 (B2) | Confirmed | `readAndCommitRun` is called at most twice. A context change or an activity conflict gives `changed`. After a second `changed`, the held context is kept and selected, and the stream connects. The "changed before projection commit" throw is gone |
| REQ-006…008 | Confirmed | The labels are localized. The server's `activeRun` is required and the null branch is gone, with a unit test. The Org files are at 446 and 482 lines; the file is renamed with 0 old importers. The wire has a FIFO queue per link and direction |

## Supported Product Scenario And Reachability Gate

| ID | Scenario | Validity | Use |
| --- | --- | --- | --- |
| S-1 | A Team stream detects a real change-sequence gap or a failed candidate (desktop or phone) and must recover without a reselect | Supported Normal | Use |
| S-2 | The user types, sends or reselects while a recovery runs or keeps failing | Supported Normal | Use |
| S-3 | A history refresh while a stream is merely disconnected | Supported Normal | Use |
| S-4 | Opening a run from Runs, possibly racing a refresh that builds its context | Supported Normal | Use |
| S-5 | A stopped Team, whose open view keeps its stream (N-4), is archived or deleted while its stream is recovering | Supported Explicit Edge | Investigate |

### Candidate Finding And Mechanism Gate

| ID | Observation | Scenario | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| C-1 | When the owner ends a recovery because the Team's context is gone (`stillNeeded` false), it does not clear the store's state. `removeTeamContext`'s caller (`cleanupStoredTeamRunLocalState`, archive and delete) does not call `disconnectTeamStream`, so the failed service and a `recovering` or `exhausted` state can stay behind. A later failure's `publishRequired` is a no-op while a state exists | S-5 | `teamStreamAutoRecovery.ts` (`end`), `runHistoryMutationActions.ts:85-98` | Hold for Evidence | It needs a recovering stopped Team that is archived and later unarchived and reopened in the same page session. The user's reselect still recovers it (the coordinator does not depend on the state). Cheap hardening: when the context is gone, end with `disconnectTeamStream(teamRunId)`, which disposes the service and clears the state |
| C-2 | An automatic attempt focuses the member focused when it began (`preferredAgentRunId`). A member switch during that attempt's hydration (about 100–500 ms) returns to the earlier member at the commit | S-2 | `teamRunOpenCoordinator.runTeamStreamRecovery` | Hold for Evidence | A narrow window; no state is lost (D-A6 carries per member). Re-reading the old context's focus in `beforeContextCommit` would remove it |
| C-3 | `HistoricalTeamLazyHydration.integration.spec.ts:213` still mocks the removed `getTeamStreamRecoveryNotice` | — | `git grep` | Reject (cosmetic) | A dead mock key does nothing; drop it when that spec is next touched |
| C-4 | Deviation 1: the recovery state lives in `teamStreamRecoveryStore`, not `agentTeamRunStore` | Design D-A1 | Handoff Deviations | Pass, deviation recorded, reason holds | The 500-line rule; the direction is unchanged (the store publishes and clears; the owner drives; the coordinator commits through the store) |
| C-5 | Deviation 2: the shared attempt has no selection intent; a superseded reselect selects nothing, but the stream still recovers | D-A3 | The spec was rewritten | Pass, deviation recorded, reason holds | A user's navigation must not leave the stream failed; the selection rules are kept for the caller |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment | Pass | Handoff Routing; no escalation trigger fired |
| Matches behavior-defining artifacts | Pass | The walks are covered as specs (AC-010) |
| Data-flow spine clarity | Pass | Failure → publish → owner → coordinator (single-flight) → `replaceFailedTeamStream` commit (carry, then clear) → views |
| Ownership boundaries | Pass | One commit point; one owner of the cadence; the field list in one helper |
| Off-spine concerns | Pass | — |
| Existing capability reuse | Pass | `LiveStreamReconnectScheduler`, the verified replacement and the 540 notice are reused |
| Shared-structure tightness | Pass | `TeamStreamRecoveryState` is a three-value union |
| Repeated coordination ownership | Pass | `followCurrentMember` is the one re-resolve |
| Empty indirection | Pass | — |
| Visible dependencies | Pass | The required option; the throw with no owner; the plugin as composition root |
| Authoritative Boundary Rule | Pass | The views read the recovery store's state only |
| File placement and size | Pass | The new files are small. `agentTeamRunStore` is 485 lines, `runHistoryLoadActions` 493, the Org files 482 and 446 |
| Interface clarity | Pass | — |
| Naming | Pass | — |
| Dead code removed | Pass | The placeholder, the coordinator, the throw, the literal, the null branch, the old name and the store's notice getter are removed. C-3 is a cosmetic leftover |
| Tests clear and aligned | Pass | 38 reproductions are red on the base (IMP-001); N-2 is covered by the integration spec over the real service |
| API/E2E readiness | Pass | Probes exist for AC-001, AC-002, AC-004 and AC-009 |

## Legacy / Backward-Compatibility Verdict

Pass on every check: no compatibility path, the dead code is removed, and no persisted data is involved.

## Docs-Impact Verdict

`docs/design-cases.md` gains cases 32 and 33. No product docs change.

## Review Scorecard

- Overall: 9.3 / 10

| # | Category | Score | Note |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.4 | — |
| 2 | Ownership and Boundaries | 9.4 | — |
| 3 | Interface Clarity | 9.3 | — |
| 4 | Separation of Concerns and Placement | 9.3 | — |
| 5 | Shared-Structure Tightness | 9.3 | — |
| 6 | Naming and Readability | 9.3 | — |
| 7 | API/E2E Readiness | 9.3 | — |
| 8 | Runtime Correctness | 9.2 | C-1 and C-2 are held edges |
| 9 | No Backward-Compatibility / Legacy | 9.5 | — |
| 10 | Cleanup Completeness | 9.2 | The stale mock (C-3) |

## Round 2 Failure-Origin Finding (CRR-002)

### CR-001 (F-1, formerly held C-2): a navigation to a member during a recovery is undone at the commit

- **Severity:** Medium. Nothing is lost (D-A6 carries the state per member), but the user's navigation is reverted. That breaks REQ-001 ("a user's reselect during a recovery joins it") and AC-010 ("on the member the user sees").
- **Where:**
  - `services/runOpen/teamRunOpenCoordinator.ts`, `runTeamStreamRecovery`: `preferredAgentRunId` is read when the attempt begins and focused on the candidate before `replaceFailedTeamStream` commits it.
  - The workspace-link path (`openWorkspaceExecutionLink` → `inspectTeamMember`, `workspaceNavigationService.ts:138-143`) focuses the member on the current context directly. It does not join the recovery, unlike the run-tree selection (`runHistorySelectionActions.ts:81-82,122`), which SDD-17 shows works.
- **Scenario and evidence:** a Project Task's link to a Team member is a supported trigger (it pushes `/workspace?…&workspaceExecutionAgentRunId=<mate>`).
  - SDD-16 holds the recovery read for 2.5 s to widen the usual 100–500 ms window. Mate is focused at once; at the commit (first attempt, 0 failures) the focus returns to lead. Reproduced twice.
  - Evidence: `evidence/api-e2e/API-010-016-desktop/sdd-16-17-cases.json`, `SDD-16-link-during-recovery.png`.
- **Review gap I own:** CRR-001 held C-2 as a narrow window and did not look for navigation paths that focus a member without going through the coordinator.
- **Required action (Local Fix, implementation, in the coordinator, so any focus path is covered):**
  - At the commit (`beforeContextCommit`), read the focused member of the context being replaced.
  - After the commit, if it differs from the candidate's focus and the member is in the new view, load its projection (`ensureAuthoritativeTeamMemberProjection`) and focus it (`focusAgentForInspection`). That is the rule the joined-reselect branch already applies.
  - The commit itself stays synchronous.
  - Alternatively, make `inspectTeamMember` join a running recovery. The commit-time rule is preferred because it also covers any other focus path.
- **Tests:**
  - a coordinator spec: a focus change on the old context during an automatic attempt's read ends with that member focused after the commit;
  - SDD-16 turns green, and SDD-17 stays green.
- **Other candidates:** C-1 is now `Reject`. API/E2E found the UI has no unarchive control, so the same-session reopen cannot happen through the UI. C-3 (the stale mock) stays cosmetic.

## Findings

Round 1: none that need action. Round 2: CR-001 (above).

## Follow-ups

None added. The handoff's Observations go to the Solution Designer as they are:
- the live stream's invalid snapshot that never enters `reopen_required`;
- recovery waiting while the Team works;
- the two base test failures.

## Classification

N/A (Pass).

## Recommended Recipient

`/api_e2e_engineer`

## Residual Risks

- C-1 and C-2, held.
- A gap in the middle of a turn recovers only after the turn (unchanged by design), so a long turn can show `exhausted` before it recovers.
- AC-005 has no deterministic browser path; a web spec covers it.

## Latest Authoritative Result

- Review Decision: `Fail` (round 2, CRR-002). The failure origin is implementation: CR-001, `Local Fix` in `teamRunOpenCoordinator`.
- Review Entry Point: `API/E2E Failure-Origin Review`
- Recommended Recipient: `/implementation_engineer`. Then a targeted delta code review, then API/E2E (SDD-16, SDD-17).
- Round 1 result (CRR-001, superseded):
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (S-5 investigated and held)
- Score Summary: 9.3 / 10; every category ≥ 9.2
- Recommended Recipient: `/api_e2e_engineer`
