# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-003, REQ-005; AC-003, AC-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited in the handoff)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: none
- Relevant Solution Revision IDs: SR-002
- Design Review Report Reviewed As Context: `N/A`. Direct route (Medium/Low): no architecture review.
- Architecture Review Revision Record Reviewed As Context: `N/A`
- Relevant Architecture Review Revision IDs: `N/A`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (D-IMP-1…D-IMP-8)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Relevant Implementation Revision IDs: IR-001 (`cba2e085e7`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2 (round 1: CRR-001)
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): `N/A`
- Trigger: API/E2E round 1 (API-REV-001) `Fail`, 76%: API-03 (AFS-002), two Org findings
- Prior Review Round Reviewed: none
- Latest Authoritative Round: 2
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` ("Failure Detail (API-03)", Cases, Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001 (head `480db9b530`; tests `48a6412d07`; code `cba2e085e7`)
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: API-03 / AFS-002. Finding 1: AC-005, REQ-005 (D-IMP-1). Finding 2: AC-003, REQ-003 (D-IMP-2).
- Exact Failing Commands / Execution Mode: `env -i PATH HOME USER LOGNAME TMPDIR node autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs --cases AFS-002 --output-dir <fresh>`. ENV-1: real Chrome, Nuxt dev, built server, scripted AGY, owned data.
- Failure Evidence Paths: `evidence/api-e2e/API-03-org-findings.log`, `API-03-AFS-002-org-copy-save-failed.png`. Mine: `evidence/code-review/CRR-001-failure-origin-diagnostics.log`, `CRR-001-run-b-org-copy-save-failed.png`.

## Round 2: API/E2E Failure-Origin Review (API-REV-002, API-05 SSR-003)

- Trigger: API/E2E round 2 (API-REV-002) `Fail`, 89%. Head `c22bb3a915`, probe rework `5f03959a95`, code under test `2dd3c665f5` (IR-002).
- Round 1: CR-001 and CR-002 are resolved by API/E2E evidence. AFS-002 shows `settingsClosedBy []` and `pendingEditKept true`, and the Org copy's Save shows "Saved." with the card on the saved model. AFS-001 and AFS-003 still pass.
- Failing case: SSR-003, 2 of 2 runs: `env -i PATH HOME USER LOGNAME TMPDIR node autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs --cases SSR-003 --output-dir <fresh>`. Evidence: `evidence/api-e2e/API-05-r2-SSR-003-readback-failure.log`, `API-05-r2-SSR-003-saved-with-stale-card.png`.
- Scenario basis: `Confirmed`.
  - A committed Save whose read-back fails must not report success. The user sees "saved, but could not be refreshed", the fields lock, and Refresh reconciles.
  - This is the existing Save contract (`delegatedLaunchDraftStore.save`: "A committed edit is not unsaved work, even if the read fails; the Settings owner exposes read-only Refresh"; `runSettings.existing.savedRefreshFailed`), and AC-003 relies on it.
  - A failed read is a supported operational event (network or server outage). The probe's failing query (`GetAgentRunCollaboration`) was not changed by the rework.

### CR-003: a stopped hub copy's Save reports "Saved." when its view re-read fails, and the card stays stale (AC-003)

- How established: `Read`, matching API/E2E's reproduction (2/2 runs) request by request. I did not rerun it.
- Cause:
  - D-IMP-3 (`ExistingRunConfigEditor.vue` 404–407): for a stopped hub, the Save's reconcile callback awaits `useAgentRunCollaborationStore().inspect(runId)`, then `draftStore.reloadCanonical(true)`.
  - `inspect` (`agentRunCollaborationStore.ts` 151–171) catches a read failure. It records `errors[hostRunId]` and resolves normally, so the Save cannot see that the re-read failed.
  - `reloadCanonical` → `readAgentCanonical` → `viewFor` (177–182). No inspection is pending and the old context is still published, so `viewFor` returns the stale view without a request. The load succeeds, `reconciled` is `true`, and the Save reports "Saved." while the card shows the pre-Save model.
  - Trace: `UpdateDelegatedLaunchSelections` 200 success, then `GetAgentRunCollaboration` 503, then `GetAgentRunResumeConfig` 200, then the "Saved." screen.
  - Refresh has the same gap: `retryCanonicalRefresh` → `reconcileAgentFailure` → `readAgentCanonical` → `viewFor` also reuses the published view. A Refresh would not re-read the view either, so the stale card could not be reconciled.
- Origin: implementation defect in the re-read this change adds (D-IMP-3). Its failure is not propagated, and the canonical loader falls back to the cached view. Before this change, the base did not re-read at all.
- Required action (`Local Fix`, implementation):
  - Give the hub's view owner a fresh read that reports failure: for example, a forced re-read or `viewFor(runId, { fresh: true })` that rejects or returns a failure instead of keeping the published view.
  - Use it on both the committed-Save reload and Refresh for a stopped hub, so a failed read fails the load. The Save then shows `savedRefreshFailed` with the fields locked, and Refresh re-reads the view and shows the saved model.
  - A normal selection keeps the one-read rule from autobyteus-358 (DS-004); only the post-commit reload and Refresh force a re-read.
  - Prefer that this sits in the store or view owner rather than the editor; the editor-side `inspect` call can then go.
  - Add specs: a failed view re-read after a committed Save gives `savedRefreshFailed` and locked fields, not success; Refresh re-reads and shows the new model; a successful Save still shows the saved model (D-IMP-3).
  - SSR-003 is the end-to-end reproduction.
- Classification: `Local Fix` / implementation. Ticket scope: this ticket (code it adds). Medium/Low stays.
- Not part of this finding:
  - FU-001 (another client's stop is not reflected in open Org Settings for 20 s or more) is recorded by API/E2E as a follow-up; not reviewed here.
  - R07 and R08 were not run; that is API/E2E's call and not a source failure.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: none. Both causes are bounded and sit in the code paths this ticket changes or makes reachable. Neither changes ownership, a contract or the design's direction.

## Review Scope

- Changed implementation and behavior reviewed:
  - the Org focus path (`useWorkspaceHistorySubjectActions`, `agentSelectionStore`, `AgentOrgWorkspaceView` watcher);
  - the Org copy Save path (`ExistingRunConfigEditor.save` → `delegatedLaunchDraftStore.save` → `existingRunConfigStore.reloadCanonical` → `agentOrgContextsStore.readRunConfig` → `assertAgentOrgRunConfigChange`; Refresh → `reconcileAgentOrgFailure`).
- Explicit exclusions:
  - no full source audit or scorecard;
  - the API/E2E observation of the first tab's "Running" badge, which was not investigated and is left to API/E2E's recheck;
  - API-05/06 (Not Tested).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis:
  - AC-005: "Editing A, focusing B: A's edit stays pending and the save bar names A".
  - AC-003: "A stopped copy's … model and runtime can be changed there, and the next message uses them".
- Both failing steps are the real user path, and the case enters through real triggers:
  - Finding 1: clicking another agent of the open Org in the left tree while Settings are open.
  - Finding 2: a stopped Org's copy, opened from its own Settings (D-IMP-2), then a model change and Save.
- Behavior-basis status: `Confirmed`

## Failure Origin

### CR-001: In an Org, a focus change returns to the chat and loses pending edits (AC-005)

- How established: `Read` and `Reproduced`.
- Cause:
  - The Org tree's row handlers (`WorkspaceAgentRunsTreePanel.vue` 473–481: `open`, `select`, `inspect`) go through `useWorkspaceHistorySubjectActions.execute`. After selecting the Org agent, it calls `selection.clearSelection()` (line 63).
  - `agentSelectionStore.clearSelection` calls `useWorkspaceCenterViewStore().showChat()` unconditionally (line 87). That closes Settings, unmounts `ExistingRunConfigEditor`, and its `onBeforeUnmount` clears both draft stores. The edit is lost without a warning.
  - IR-001 (D-IMP-1) applied the same-run rule to `selectRun` (hub and Team) and to the Org view's `targetIdentity` watcher, but not to this path. `AgentOrgWorkspaceView.spec` tests only the watcher.
- Reproduction:
  - I patched the path temporarily: when the route already shows this Org, `clearSelectionWithoutShellNavigation()`, otherwise `clearSelection()`.
  - With that patch AFS-002 recorded `settingsClosedBy: []` and `pendingEditKept: true` in two runs. Everything else in the case after the Org journey also passed, including `writerResumed ["dlc-alt-model"]`. So this path alone causes the failure, and a same-Org rule fixes it.
- Origin: implementation defect (D-IMP-1 incomplete). There was no earlier code review on this direct route, so this is not a review gap.

### CR-002: A stopped Org copy's Save is stored, but the reload and Refresh are refused (AC-003)

- How established: `Reproduced`, with temporary console diagnostics; the base path by `Read`.
- Cause, from the browser console in run b:
  - After Save, `reloadCanonical(true)` → `loadAgentOrgCanonical` → `readRunConfig` → `prepareConfigWorkspaces` → `assertAgentOrgRunConfigChange(org.executionTree, tree)` throws "Org configuration changed topology, identity, or locked fields."
  - The only difference: `tree.rootOrg.taskExecutions.0.userLaunchSelection: undefined -> {"llmModelIdentifier":"dlc-alt-model",…}`.
  - The check (`services/agentOrgExecution/agentOrgRunConfigAdoption.ts`) masks only configured members' model and workspace fields. It compares task executions (copies) verbatim, so the copy's new launch selection, which the Save just stored, reads as a locked-field change.
  - The loader catches the error. `reloadCanonical` replaces it with `savedRefreshFailed`, and Refresh (`reconcileAgentOrgFailure`) fails the same way. The Settings stay at `refresh-required` with the old model until the page reloads.
  - `applyRunConfig` (`agentOrgExecutionContext.ts` 195) runs the same check, so it needs the same rule.
  - No GraphQL or page error appears because the error is caught. That matches the API/E2E observation.
- Base:
  - The check and `readRunConfig` are unchanged since before this ticket (`3a52e67ba7`, autobyteus-348).
  - At `3261712e06`, a stopped Org's copy could already be saved from the Org's copy list, which went through the same `reloadCanonical(true)` path (base `ExistingRunConfigEditor.vue` 293, 355). By reading, the defect is pre-existing; I did not run it on base.
  - D-IMP-2 makes it the only way to change an Org copy (REQ-003), and it keeps an in-scope acceptance criterion (AC-003) from passing. Under Ticket Scope it is therefore this ticket's, not a follow-up.
- Origin: implementation defect, pre-existing and exposed by this change. It is bounded to the Org config adoption check.

## Findings

| ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Blocking (AC-005) | `composables/useWorkspaceHistorySubjectActions.ts` (63), `stores/agentSelectionStore.ts` (87) | Above; `API-03-org-findings.log`; `CRR-001-failure-origin-diagnostics.log` (trial runs) | Apply D-IMP-1's same-run rule to the Org path: selecting or inspecting an agent of the Org already shown keeps the center view (Settings stay open with their edits); another run, or the Org opened from elsewhere, opens at its chat. Add a spec through `execute` (or the tree panel's handlers) that would have failed, plus the case where the Org is not the shown one. | `Local Fix` / implementation |
| CR-002 | Blocking (AC-003) | `services/agentOrgExecution/agentOrgRunConfigAdoption.ts`; used by `agentOrgContextsStore.prepareConfigWorkspaces` and `AgentOrgExecutionContext.applyRunConfig` | Console: `CRR-DIAG refused [… taskExecutions.0.userLaunchSelection: undefined -> {…}]`, then "Org configuration changed topology, identity, or locked fields." on Save and on Refresh | Treat a copy's launch selection as a mutable field in the adoption check: `userLaunchSelection` on each task execution, including a Team copy and its members. Keep every other field of a copy locked. Make sure the adopted view then carries the saved selection, so the card shows it. Add specs: the check accepts a copy-selection change and still refuses a topology or identity change; the editor's Org copy Save ends "Saved" and shows the model. | `Local Fix` / implementation |

- Reproduction to start from: AFS-002 (`pnpm -C autobyteus-web test:e2e:agent-settings-focused`, or the command above) fails on both today and asserts both findings at the end.

## Follow-ups

- Follow-ups this review added: None. CR-002 is pre-existing, but it blocks AC-003, so it belongs to this ticket.

## Classification

- `Local Fix`, owned by implementation (CR-001, CR-002).

## Recommended Recipient

- Implementation Engineer (`/software_engineering_team/implementation_engineer`).
- After the fix, this direct route returns to API/E2E: rerun AFS-002 and the planned API-05/06.

## Latest Authoritative Result

- Review Decision (round 2): `Fail`. CR-001 and CR-002 are resolved. CR-003 (a false "Saved." when the stopped hub's view re-read fails after a committed copy Save; Refresh cannot re-read either) is an implementation `Local Fix`. Recipient: Implementation Engineer, then API/E2E (direct route).
- Round 1:
- Review Decision: `Fail`. Origin: implementation (two bounded defects, both reproduced in the real stack).
- Failure Origin: CR-001 is D-IMP-1 not applied to the Org tree's selection path. CR-002 is the Org config adoption check refusing a copy's stored launch selection; it is pre-existing and blocks AC-003.
- Notes:
  - The temporary diagnostics were confined to this worktree, recorded in the evidence log, and reverted before handoff (`git status` clean apart from untracked build output).
  - The "Running" badge in a second tab is not investigated here.
