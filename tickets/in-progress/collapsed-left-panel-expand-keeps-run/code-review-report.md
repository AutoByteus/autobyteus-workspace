# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/requirements-doc.md` (Approved, SR-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (referenced via design AF-001..AF-010)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004; D-2, D-4, Terminology "run shown", DS-003)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md` (behavior-defining, via REQ-006/REQ-009 trace)
- Relevant Solution Revision IDs: SR-003 (requirements), SR-004 (design)
- Design Review Report Reviewed As Context: `N/A — not applicable` (direct route)
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable`
- Relevant Architecture Review Revision IDs: `N/A`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001 (commit `1639cba95`)
- Code Review Revision Record: `code-review-revision-record.md` (created this round)
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: API/E2E `Fail` (API-REV-001, FAIL-001) from `/software_engineering_team/api_e2e_engineer`
- Prior Review Round Reviewed: N/A — no prior code review (direct route)
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md` (testing guideline: root `TESTING.md`)
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: PMU-018 step G (in-app New chat → Workspaces); DSK-001 run-4 (packaged desktop, same journey)
- Exact Failing Commands / Execution Mode: `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh> --cases PMU-018` (browser dev path, worktree server build, Chrome); isolated packaged desktop instance of this worktree build (`api-e2e-evidence/isolated-desktop/dsk-001.mjs`, run-4)
- Failure Evidence Paths: `api-e2e-evidence/pmu-018-r6/evidence.json` (`cases.PMU-018.details.dockedOnNewChat`, `inAppBefore`, failure message), `api-e2e-evidence/pmu-018-r6/PMU-018-failure-0.png`, `api-e2e-evidence/isolated-desktop/run-4/evidence.json` (`failure.details.newAfter.row.focused: true` on `#/chat`)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review` (direct route; no prior source review)
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None. The failure is a bounded gating omission inside one composable that already has the needed signal available in the approved design (D-2). It does not indicate the Medium/Low classification is wrong.

## Review Scope

- Changed implementation and behavior reviewed: D-4 bounded reveal (`useRevealSelectedTreeRow`) and its interaction with the tree's selection markers on no-run pages; D-2 run-shown signal (`useShellPrimaryNavigation.isWorkspacesActive`); new `aria-current` on the Agent run row.
- Files / areas reviewed:
  - `autobyteus-web/components/workspace/history/useRevealSelectedTreeRow.ts`
  - `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` (`sectionState.selectedRunId`, `isTeamRunSelected`, `selectedAgentOrg`)
  - `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` (Agent run row `aria-current`)
  - `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` (`selectedRunId`, `isAgentOrgMemberSelected`)
  - `autobyteus-web/composables/useShellPrimaryNavigation.ts` (`isWorkspacesActive`)
  - `WorkspaceStableExecutionRow.vue` / `WorkspaceTransientExecutionRow.vue` (selection markers)
- Explicit exclusions: full source audit and scorecard (failure-origin round); general test-suite review; the other PMU-018 steps A–F and suites that passed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-006 ("When no run is open (e.g. New chat, Agents page, Settings), Workspaces just shows the panel; nothing new is selected, and an open draft and its text are kept"), REQ-009 ("Activating Workspaces so that the panel docks moves focus onto the revealed row (**to the Workspaces section when no run is open**)"), AC-009, SCN-006.
- Design-spec behavior map verified against the implementation: Design Terminology defines "run shown" and explicitly excludes New chat. D-2 computes it (`isWorkspacesActive`). D-4 reveals "the last `[aria-current="true"], [aria-selected="true"]` row" with no run-shown gate; its premise is that a selection marker equals the open run. The implementation follows D-4 literally.
- Design review report and round confirmed: N/A — direct route.
- Behavior-basis status: `Confirmed` (the failing scenario is approved behavior).
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None for the intended behavior. REQ-009 is explicit.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| BEH-001 / REQ-006 / REQ-009 (no-run focus) | `Confirmed` (approved); implementation contradicts it | Strip Workspaces → `activateStrip` redock → D-3 focuses `[data-test="app-left-panel-run-history"]` → tree panel mounts → `useRevealSelectedTreeRow` finds a stale `aria-selected="true"` Team member row (`isTeamRunSelected` reads only `selectionStore`) → scrolls 773→844 and calls `row.focus()` | Evidence: `pmu-018-r6/evidence.json` (`inAppBefore.nav.workspacesLit: false`, `stripChatLit: true`, route `/chat`, selection subject still `team_run`); DSK run-4 `row.focused: true` on `#/chat` |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FO-SCN-001 (= SCN-006 after a prior Team run) | REQ-006, REQ-009, AC-009, SCN-006 | User | Desktop user | Finish looking at a Team run, start a New chat, collapse the panel while drafting, then reopen the tree | Docked Chat row (New chat) → docked collapse control → strip Workspaces | Normal | `/chat` (no id); `selectionStore` keeps the earlier Team selection (pre-existing, unchanged); D-2 says no run shown; D-3 focuses the Workspaces section; D-4 then focuses and scrolls the stale Team member row | Expected: panel docks, focus stays on the Workspaces section, no row revealed. Observed: focus and scroll move to a run row. Keyboard users land on an unrelated run on a no-run page | REQ-009 text; SCN-006; browser + packaged-desktop evidence | `Supported Normal Scenario` | `Use` |
| FO-SCN-002 (same, `/agents` or `/projects` after a Team or Agent run) | REQ-006, REQ-009 | User | Desktop user | Visit another page after a run, collapse, reopen the tree | Strip page icon → collapse → strip Workspaces | Normal | Same D-4 path. On non-`/chat` routes `sectionState.selectedRunId` falls back to `treeState.selectedRunId` (from `selectionStore`), so the Agent run row's new `aria-current` and the Team member's `aria-selected` both remain set | Same consequence expected; not executed | Code path only (`WorkspaceAgentRunsTreePanel.vue` `sectionState`, `useWorkspaceHistoryTreeState.selectedRunId`) | `Supported Normal Scenario` (REQ-006 names the Agents page) | `Use` for scoping the fix; not separately attributed as a failure |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `useRevealSelectedTreeRow` scrolls to and focuses any selected-marked row without checking that a run is shown | FO-SCN-001, FO-SCN-002 | User clicks strip Workspaces on a no-run page after an earlier run | See FO-SCN-001. It breaks REQ-009 focus and REQ-006 "just shows the panel" (it scrolls the tree) | PMU-018 G, DSK-001 run-4; source `useRevealSelectedTreeRow.ts` `reveal()` | `Promote` → CR-001 | Gate both scroll and focus on the existing D-2 run-shown signal |
| C-002 | Tree selection markers (`isTeamRunSelected`; `selectedRunId` off `/chat`) read `selectionStore` and are not route-aware on no-run pages | FO-SCN-001 | Same | The tree visibly highlights the earlier Team member on New chat. This was already true before this change and the diff did not change it | `dockedOnNewChat.selected` | `Reject` as a defect in this change | Pre-existing tree highlight is outside the approved scope (REQ-008 covers strip/Chat-row highlight only). It is not the right fix alone: it would not cover `/agents`/`/projects` and would change unapproved tree highlight behavior. Changing it would need Solution Designer scope. |
| C-003 | Was this a code-review gap? | N/A | N/A | No source review was selected (direct route) | Routing: ARCH-REV/CRR N/A | `Reject` | No review gap exists. The defect is detectable from source plus the pre-existing selection semantics, but no reviewer was in the path. |

## Docs-Impact Verdict

- Docs impact: `No` (for this fix). If the fix changes the `useRevealSelectedTreeRow` signature, the implementation handoff should record it as a bounded D-4 deviation. TESTING.md PMU-017/PMU-018 lines remain a delivery follow-up, as noted by API/E2E.

## Additional Material Premise Validation (When Required)

### `FO-P-001` — "a selected-marked tree row is the open run" (D-4 premise)

- Origin: `New` (implicit D-4 premise; no architecture review occurred)
- Related approved requirement or established contract: REQ-006, REQ-009; design Terminology "run shown"
- Relevant behavior ID(s): BEH-001, BEH-002, BEH-003
- Coherent product goal or governing event: The user reopens the tree from a no-run page after earlier opening a run
- Scenario validity: `Supported Normal Scenario`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: docked Chat row / strip page icon, then strip Workspaces
- Support evidence: production surfaces exercised in the browser and the packaged desktop app
- Forward production path: see FO-SCN-001
- Lifecycle preconditions and material consequence: `selectionStore` keeps the prior Team/Agent selection when navigating to a no-run page (pre-existing). D-2 correctly returns false there (`workspacesLit: false`). D-4 does not consult D-2, so the premise is false on every no-run page that has a stale selection.
- Reachability: `Reachable`
- Review consequence / proportionate response: The premise holds only while a run is shown. Gate the reveal on the D-2 signal. No new owner, store, or coordinator is needed.

## Findings

### CR-001 — Reveal and focus are not gated on "run shown" (REQ-009 / REQ-006 violated on no-run pages)

- Severity: Must fix (REQ-009 is `Should`; REQ-006 is `Must`, and scrolling to an unrelated run breaks "just shows the panel")
- Linked candidate: C-001; premise FO-P-001
- Location: `autobyteus-web/components/workspace/history/useRevealSelectedTreeRow.ts` `reveal()`, wired from `WorkspaceAgentRunsTreePanel.vue`
- Evidence: PMU-018 step G (`inAppBefore.nav.workspacesLit: false`, route `/chat`, selection subject `team_run` retained; focus lands on `workspace-team-member-…-/manager`; scroll 773→844). DSK-001 run-4 shows `row.focused: true` on `#/chat` for the Team-hosted worker.
- Required action (implementation_engineer):
  - Give the reveal a run-shown input that comes from the existing D-2 authority. For example, the tree panel passes `useShellPrimaryNavigation().isWorkspacesActive` (or an equivalent computed from the same owner) into `useRevealSelectedTreeRow`. Do not duplicate the predicate.
  - When no run is shown, do not scroll and do not move focus. Focus stays on `[data-test="app-left-panel-run-history"]` per D-3.
  - This also covers app start and drawer open on a no-run page.
  - Do not change the tree's selection or highlight semantics (C-002) and do not clear `selectionStore`; that is outside the approved scope.
  - Add unit coverage for "selected row present, no run shown → no scroll, no focus" next to the existing `useRevealSelectedTreeRow.spec.ts` cases.
  - Record the D-4 signature change as a bounded deviation in the implementation handoff and revision record (IR-002).
  - Recheck the run-shown-but-row-loads-late cases (PMU-018 B/C/E) still pass. They should, because D-2 is true there.

## Classification

- `Local Fix` — bounded implementation defect. The intended behavior is unambiguous (REQ-009, REQ-006, SCN-006). The approved design already defines the needed signal (Terminology "run shown", D-2). The correction fits inside the D-4 owner with no new boundary, store, or coordinator, so it does not trip the design's own `Design Impact` triggers. The design's D-4 text omitted the gate. That is a small design-text omission, not a structural design flaw. The implementation handoff records the deviation, and Solution Designer can align the D-4 wording at delivery/docs sync if desired.

## Recommended Recipient

- `/software_engineering_team/implementation_engineer`
- Routing note: after the fix, run implementation-scoped checks and return through API/E2E (PMU-018 full, including step G, plus DSK-001). The direct route remains: Medium/Low, so no independent source review is required.

## Residual Risks

- FO-SCN-002 (`/agents`, `/projects` after a run) is unexecuted. The gated fix covers it by construction; API/E2E should add or extend a quick check in PMU-018.
- The pre-existing stale tree highlight on no-run pages (C-002) remains visible. It is out of scope for this ticket; Solution Designer may consider a follow-up.
- REQ-005/AC-002 wording about a "right Team tab member" (messages-only tab) is a non-blocking requirement-text note raised by API/E2E. It is not part of this failure.

## Latest Authoritative Result

- Review Decision: `Fail` (failure origin confirmed)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (FO-SCN-001 is a supported normal scenario; C-001 promoted, C-002/C-003 rejected)
- Material-Premise Gate: `Pass` (FO-P-001 reachable; it is a false premise in D-4)
- Score Summary: N/A — failure-origin round; no scorecard
- Failure Origin: Implementation defect (CR-001). The new D-4 reveal does not consult the D-2 run-shown signal, and a pre-existing, unchanged stale selection marker exposes this. It is not an invalid test, environment problem, or review gap (no source review on the direct route).
- Recommended Recipient (when applicable): `/software_engineering_team/implementation_engineer` (`Local Fix`)
- Notes: The test assertion in PMU-018 G matches REQ-009 and SCN-006 and is valid.
