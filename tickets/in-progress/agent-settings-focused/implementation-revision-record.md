# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `solution-handoff.md` / SR-002 | N/A | `Initial Baseline` | `SR-002` | Implemented; API-REV-001 Fail → CRR-001 |
| IR-002 | Code Reviewer / `code-review-report.md` / CRR-001 (failure-origin review of API-REV-001) | CR-001, CR-002 | `Local Fix` | `API-REV-001`, `CRR-001` | AFS-002 passes; API-REV-002 → CRR-002 (CR-003) |
| IR-003 | Code Reviewer / `code-review-report.md` / CRR-002 (failure-origin review of API-REV-002) | CR-003 | `Local Fix` | `API-REV-002`, `CRR-002` | Fixed; SSR-003 passes; ready for API/E2E |

## Revision Entries

### IR-001 — Settings show the focused agent

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `solution-handoff.md`, SR-002.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: `cba2e085e7`, plus the IR-001 records commit.
- Related revision IDs: `SR-002`; architecture review, code review, API/E2E, delivery `N/A`.
- Why recorded: the initial implementation handoff.
- Approved behaviour or requirement IDs affected: REQ-001…REQ-005; AC-001…AC-005.
- Implementation delta and locations: see the handoff's Behavior Trace and Key Files.
- Implementation-time corrections, found by driving the real page:
  - Selecting another agent of the same run left Settings (`selectRun` always returned to chat), which contradicted the design's Current-State Read and would have lost pending edits. Fixed in `agentSelectionStore.selectRun`.
  - After a successful Save on a stopped hub, the copy's card showed its old model: Save's re-read got the hub's published view from `viewFor` (autobyteus-358). The specs mocked `viewFor` as a fresh read, so they could not catch it. Fixed in the editor: it runs `inspect` first.
- Local validation and result: `evidence/IMP-local-checks.log`, `evidence/IMP-08-rendered-check.log`.
- Next recipient or routing: `get_handoff_rules` → direct API/E2E (Medium/Low).
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-002 — CR-001 and CR-002: an Org keeps Settings across focus; a stopped Org copy's Save is adopted

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-001. This was the failure-origin review of API/E2E round 1 (API-REV-001, API-03, AFS-002).
- Triggering finding IDs: CR-001, CR-002.
- Classification: `Local Fix`.
- Prior authoritative result: IR-001 at `cba2e085e7`.
- Current authoritative result: 2dd3c665f5, plus the IR-002 records commit.
- Related revision IDs: `API-REV-001`, `CRR-001`; solution and delivery `N/A`.
- Approved behaviour or requirement IDs affected: AC-005 (CR-001), AC-003 (CR-002).
- Implementation delta:
  - CR-001: `composables/useWorkspaceHistorySubjectActions.ts`. Org row actions (select, inspect, open) used `clearSelection()`, which always returns to chat. When the route already shows that Org they now use `clearSelectionWithoutShellNavigation()`, so Settings and their unsaved edits stay; another run, or the Org opened from elsewhere, still opens at its chat. This is the same rule as `selectRun` (D-IMP-1), which missed this path.
  - CR-002: `services/agentOrgExecution/agentOrgRunConfigAdoption.ts`. The adoption check now treats each task execution's model choice as mutable: an Agent copy's `userLaunchSelection`, and a Team copy's `userTeamLaunchSelection` and its members' `userLaunchSelection`, nested copies included, in the root's and each placed team's task executions. Every other copy field stays locked. The reload after Save, Refresh and `applyRunConfig` all use this check, and the adopted view carries the saved choice.
  - Pre-existing (since autobyteus-348): the old list saved Org copies on the same path. It is fixed here because D-IMP-2 makes this card the only way to change an Org copy.
- Tests:
  - `useWorkspaceHistorySubjectActions.spec.ts`: select and inspect within the shown Org keep the view; the Org opened from elsewhere, or another Org, opens at chat.
  - `agentOrgRunConfigAdoption.spec.ts`: copy choices (an Agent copy, a Team copy and its member) are adopted and published; a copy's address, start time or started launch changed alongside a choice is still refused, with no partial publication.
  - The reviewer's reproduction AFS-002 passes: `settingsClosedBy: []`, `pendingEditKept: true`, and the stopped Org copy's Save ends "Saved…".
- Local validation and result: `evidence/IMP-10-AFS-002.log` and its screenshots; `evidence/IMP-IR002-checks.log`.
- Next recipient or routing: `get_handoff_rules` → API/E2E (Medium/Low direct route), for AFS-002 and the planned API-05/06.
- Remaining limitations or risks: the second-tab "Running" badge observation was not investigated (left to API/E2E's recheck).

### IR-003 — CR-003: a failed re-read after a stopped hub's Save fails the load

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-002. This was the failure-origin review of API/E2E round 2 (API-REV-002, API-05, SSR-003).
- Triggering finding IDs: CR-003.
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 at `2dd3c665f5`. D-IMP-3's editor-side `inspect` swallowed a read failure, so `viewFor` returned the published (pre-Save) view: "Saved." with a stale card. Refresh never re-read either.
- Current authoritative result: 38f5a1eb1c, plus the IR-003 records commit.
- Related revision IDs: `API-REV-002`, `CRR-002`; solution and delivery `N/A`.
- Approved behaviour or requirement IDs affected: AC-003 (and the established Save contract: a committed edit whose read fails shows `savedRefreshFailed`, locks, and Refresh reconciles).
- Implementation delta (in the view's owner, as asked; the editor-side `inspect` call is gone):
  - `stores/agentRunCollaborationStore.ts`: a read in flight now ends with its failure's reason. `viewFor(hostRunId, { fresh })` is a new read, never the published view nor a read started before it, and it rejects when that read fails. Without `fresh` it keeps autobyteus-358's one read per selection (DS-004), and a read that failed rejects too, rather than showing a hub with no copies. `inspect` keeps its contract: a failure stays the hub's error.
  - `stores/existingRunConfigStore.ts` (`readAgentCanonical`, `loadAgentCanonical`) carries `fresh` to `viewFor`; the file stays at 501 effective lines, not grown (FU-003 of autobyteus-358).
  - `stores/existingRunConfigEditActions.ts` `reloadCanonical` (after a committed Save or a stop) and `stores/existingRunConfigResultActions.ts` (Refresh, a failed load's retry) read fresh.
  - `ExistingRunConfigEditor.vue`: Save's reconcile is `reloadCanonical(true)` again.
- Tests:
  - `agentRunCollaborationStore.spec.ts`: a normal selection reads once; `fresh` reads and publishes; a failed fresh read rejects with its reason, then recovers; a failed first read rejects.
  - `ExistingRunConfigEditor.savedSnapshot.spec.ts`: the first load reads `fresh: false`, the committed Save `fresh: true`; a failed re-read gives no success and the `refresh-required` (locked) state; Refresh re-reads fresh and shows the saved model.
  - `existingRunConfigStore.spec.ts`: the first load's argument.
  - The reviewer's reproduction SSR-003 passes.
- Local validation and result: `evidence/IMP-12-SSR-003.log` and its screenshots; `evidence/IMP-IR003-checks.log`.
- Next recipient or routing: `get_handoff_rules` → API/E2E (Medium/Low direct route).
- Remaining limitations or risks: none new. FU-001 (stale "active" in open Org Settings) is API/E2E's follow-up.
