# Implementation Handoff — `agent-settings-focused` (autobyteus-366)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: no independent review; Medium/Low, direct implementation (`solution-handoff.md`).
- Requirements doc: `tickets/in-progress/agent-settings-focused/requirements-doc.md` (SR-002)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (SR-002)
- Supplemental task artifacts: `.../storage-analysis.md`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002: CR-001, CR-002; IR-003: CR-003; all Local Fix)
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (merge of origin/personal; IR-003 the last fix)
- Related solution revision IDs: `SR-002`
- Related revision IDs: code review `CRR-001`, `CRR-002`; API/E2E `API-REV-001`, `API-REV-002`; architecture review and delivery `N/A`
- Triggering finding IDs: CR-003 (CRR-002, from API-REV-002 SSR-003); before it CR-001, CR-002

Web only, on `codex/agent-settings-focused`, on top of autobyteus-348's `3261712e06`.

| Commit | Content |
| --- | --- |
| `3296ee9a8f` | Ticket docs as received |
| `cba2e085e7` | The change, its specs, two probes and the docs |
| 2dd3c665f5 | IR-002: Org row actions keep Settings within the shown Org (CR-001); copies' model choices adopted after an Org Save (CR-002) |
| 38f5a1eb1c | IR-003: a fresh hub-view read after a committed Save, a stop or Refresh, which fails the load when it fails (CR-003) |

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section: design spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence: web only; no server, contract, stream or stored-data change. 11 source files, 2 new ones plus the resolver. One shared behaviour changed beyond the design's list: `selectRun` within the same run (below); it changes no data and no lifecycle.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (read the whole diff; rule table, edit routes, stop owners and removals checked against the design)
- New design impact or escalation trigger: `None`. Neither trigger fired: every focusable agent has a row, and no server change was needed.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Hub or copy focused: one card; a hint on the hub. Stop one copy to change its model stays | `ExistingRunConfigEditor.focusedAgentRunId` → `utils/runSettings/settingsSubject.ts` → `ExistingRunSettings` → `RunSubjectCard` (facts shared with `RunMemberRow` through `useRunMemberFacts`). Edits through `changeDelegated`; stop through `stopDelegated` | Rendered: IMP-08. The Delegated copies list and its strings are gone |
| BEH-002 | Member focused: one card; group settings one switch away. Team-wide change and Org workspaces stay | `resolveSettingsSubject` with `group`; the `run-settings-switch` in `ExistingRunSettings`; the group view is the root card and `RunMembersSection`, today's layout without copies | Rendered for a Team and a Team copy. Org by specs only (below) |
| BEH-003 | One save; the bar names every agent with unsaved edits | `ExistingRunConfigEditor.unsavedNames`; `save` and `cancel` unchanged apart from the re-read; `agentSelectionStore.selectRun` and `AgentOrgWorkspaceView` keep Settings open within a run | Rendered: edit A, focus B, bar names A; Save commits exactly A; Cancel discards |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New: `utils/runSettings/settingsSubject.ts`; `components/run-settings/RunSubjectCard.vue`; `components/run-settings/useRunMemberFacts.ts`.
- Changed: `ExistingRunConfigEditor.vue`, `ExistingRunSettings.vue`, `RunMemberRow.vue` (facts moved to the composable), `RunMembersSection.vue` (dead `testId` and `description` removed), `RunSubjectHeader.vue` (a `details` slot), `runMemberTree.ts` and `delegatedLaunchRows.ts` (`agentRunId` on nodes), `stores/agentSelectionStore.ts`, `components/workspace/org/AgentOrgWorkspaceView.vue`, strings (en, zh-CN), `docs/settings.md`, `docs/agent_execution_architecture.md`.
- Tests: `settingsSubject.spec.ts`, `ExistingRunConfigEditor.subject.spec.ts` (new); `ExistingRunSettings.copies.spec.ts` (renamed from `RunDelegatedLaunchSection.spec.ts`, its assertions now per focused copy); editor, Org and selection specs updated.

## Important Assumptions

Beyond or different from the design, each needed for an AC. Please check them.

- **D-IMP-1, Settings stay open within a run.** The design's Current-State Read says they do; in the running app they did not. `selectRun` always returned to chat, and the Org view left Settings on every focus change, each of which unmounts the editor and loses pending edits (AC-005). Now another agent of the selected run keeps Settings open, and another run opens at its chat. Side effect: clicking the selected run's row no longer closes Settings; the panel's back arrow does.
- **D-IMP-2, an Org's copies open their own Settings.** Only configured Org members could (`configurationTarget`, `headerActionsAvailable`). With the list gone, a copy's settings would have been unreachable (REQ-003). So every focused Org agent now has the header actions, a stopped Org's copy included, which also shows its "+". The spec `keeps historical task actions excluded` asserted the old rule and now asserts this one.
- **D-IMP-3, a Save on a stopped hub re-reads its view.** Classified as this ticket, not a prerequisite: it is in the functionality this ticket changes and AC-003 needs it. The cause came from autobyteus-358 and is on `personal` now: after a Save the old copy list showed the old model too. The fix is in the editor, because `existingRunConfigStore.ts` is over the size limit (FU-003 of autobyteus-358). **Revised in IR-003 (CR-003):** the re-read moved into the view's owner, `agentRunCollaborationStore.viewFor(id, { fresh: true })`, which rejects when the read fails. The editor's `inspect` call swallowed a failure and so reported "Saved." over a stale card. **IR-004:** fresh after a committed Save and on Refresh only; a stop's re-read is `syncHost`'s (348).
- **D-IMP-4, focus comes from each root's own store,** not `activeContextStore`: a hub's `selectedChild`, a Team's `getFocusedAgentRunId`, an Org's selection. They are the same sources the active target reads, without bringing the route and its store graph into the editor.
- **D-IMP-5, the resolver's shape.** A union with `origin: 'none'` for no row, and `rootAgentRunId` in place of the design's `runKind`.
- **D-IMP-6, status in the header.** A copy shows its own running state (a Team copy's member: its Team copy's). A member shows the run's status, because its lock and its stop belong to the run; a member idle inside a running Team reads "Active".
- **D-IMP-7, the stop hint.** The design quotes "Stop one to change its model; its next message resumes it on the new model.", part of the removed description. On one card "Stop this copy…" reads right, so `runSettings.delegated.stopToChange` became "Stop this copy to change its model; its next message resumes it on the new model." (en, zh-CN).
- **D-IMP-9 (IR-002), the same-run rule covers the Org tree.** `useWorkspaceHistorySubjectActions.execute` keeps the view when the route already shows that Org (CR-001).
- **D-IMP-10 (IR-002), copies' model choices are mutable in the Org adoption check** (CR-002): an Agent copy's, a Team copy's and its members', at any depth; every other copy field stays locked.
- **D-IMP-8, source line.** The card also shows the copy's source ("Inherited from the run"), which the row's summary showed, so nothing is lost.

## Known Risks

- (IR-002) Org now rendered by API/E2E's AFS-002, which passes on this fix (IMP-10).
- A Team-wide Save was not driven: Save needs every scope's model schema, and the seed's runtime is not signed in here. Names, edit routes and the unchanged save are covered by specs.
- The panel title stays "Team Configuration" over a member's card. Left as is; not in the design.
- (IR-004) autobyteus-348 is on `origin/personal` and merged in; the merge-order constraint is cleared.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`. The Current-State mismatch (D-IMP-1) does not change the design's direction; it is the same intended behaviour made true.
- Evidence / notes: IMP-08.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (the list, `runSettings.delegated.title` and `.description`, `RunMembersSection` `testId` and `description`, `DELEGATED` list props)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. One mapper for facts; `agentRunId` optional because New chat rows have none.
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`. `ExistingRunConfigEditor.vue` 456, `ExistingRunSettings.vue` 270. `existingRunConfigStore.ts` not touched.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prepare:shared`, `prebuild` and `build` were run in this worktree. `pnpm typecheck` needs `prepare:shared` first in a fresh worktree: without it, its cross-package project reports 392 errors from a missing `autobyteus-ts`.
- `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` show as untracked build output; not committed.
- The large-hub seed needs `--teams` of about 12; `--teams 2` fails with "Cannot read properties of undefined (reading 'members')".

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web typecheck` | `cba2e085e7` tree | macOS, isolated HOME | web | all | Pass | `evidence/IMP-local-checks.log` | `[typecheck] PASS` |
| IMP-02 | web Nuxt suite, full | `cba2e085e7` tree | isolated HOME | web | AC-001…AC-005 | Pass | same | `Tests  5036 passed` |
| IMP-03 | three web guards, each alone | `cba2e085e7` tree | isolated HOME | web | — | Pass | same | exit 0 ×3 |
| IMP-04 | `settingsSubject.spec.ts` | in IMP-02 | isolated HOME | the resolver | BEH-001, BEH-002 | Pass | same | one case per rule-table row |
| IMP-05 | `ExistingRunSettings.copies.spec.ts`, `.runtime.spec.ts` | in IMP-02 | isolated HOME | the view | AC-001…AC-003 | Pass | same | stop owner, switch, hint, names |
| IMP-06 | `ExistingRunConfigEditor.subject`, `.savedSnapshot`, `.delegatedSave` specs | in IMP-02 | isolated HOME | focus per root, AC-005, the re-read | AC-003, AC-005 | Pass | same | `edits across focus changes` |
| IMP-07 | `agentSelectionStore.spec.ts`, `AgentOrgWorkspaceView.spec.ts` | in IMP-02 | isolated HOME | Settings stay open; Org copy | AC-005, REQ-003 | Pass | same | named cases |
| IMP-08 | Browser on this worktree's server and Nuxt dev, seeded test data (scripted AGY) | `cba2e085e7` tree | temp HOME and data root; removed | hub, Team copy, Team root | AC-001…AC-003, AC-005 | Pass, with the limits under Known Risks | `evidence/IMP-08-rendered-check.log`, `IMP-08-*.png` | `"list":0`; `Unsaved changes: code reviewer` |
| IMP-09 | specs for CR-001, CR-002 (`useWorkspaceHistorySubjectActions.spec.ts`, `agentOrgRunConfigAdoption.spec.ts`); web typecheck; guards; full web suite | 2dd3c665f5 | isolated HOME | Org row actions; Org adoption check | AC-003, AC-005 | Pass | `evidence/IMP-IR002-checks.log` | see the log |
| IMP-10 | AFS-002 (`delegated-launch-defaults-probe.mjs --cases AFS-002`) | 2dd3c665f5 tree | probe-owned stack | Org focus, copy Save | AC-002, AC-003, AC-005 | Pass | `evidence/IMP-10-AFS-002.log`, `IMP-10-AFS-002-*.png` | `"settingsClosedBy": []`, `"pendingEditKept": true` |
| IMP-11 | CR-003 specs; web typecheck; guards; full web suite | 38f5a1eb1c | isolated HOME | `viewFor` fresh and failure; Save and Refresh reload | AC-003 | Pass | `evidence/IMP-IR003-checks.log` | see the log |
| IMP-12 | SSR-003 (`delegated-launch-defaults-probe.mjs --cases SSR-003`) | 38f5a1eb1c tree | probe-owned stack | committed Save with a failed read, then Refresh | AC-003, AC-005, AC-006 | Pass | `evidence/IMP-12-SSR-003.log`, `IMP-12-SSR-003-*.png` | `committed read failure locks, read-only Refresh reconciles` |
| IMP-13 | after merging origin/personal: typecheck, guards, full web suite, then SSR-003, AFS-001, AFS-002 | `58fdf50f33` | isolated HOME; probe-owned stack | the merged tree | AC-001…AC-005 | Pass (one merge resolution corrected) | `evidence/IMP-13-merge-checks.log` | `Summary: 3 Pass, 0 Fail` |

- Not run, and why: the Electron suite (no Electron file changed); server suites (no server file changed); the probes below (real-stack, left to API/E2E).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings of a stopped hub, a Team copy's member, a stopped Team's coordinator and members; the group switch; the save bar.
- Approved references: design "Subject and group rules"; DEC-002, DEC-004.
- Existing components reviewed: `RunSettingsCard`, `RunMemberRow`, `RunMembersSection`, `RunSubjectHeader`, `RemoteNodeChip`; reused.
- Surface used: real page per TESTING.md, on isolated seeded data.
- States inspected: hub with copies; member with switch; group view; model menu open on the card; edit pending across focus; Save; Cancel; reload after Save.
- Issues found and corrected: Settings closing on focus change (D-IMP-1); a saved copy's card showing the old model (D-IMP-3).
- Remaining unverified: Org; a running root and a running copy's stop in a browser (specs only); a remote copy; narrow viewports; zh-CN text in a browser.

## Downstream Coverage Hints / Suggested Scenarios

- AC-003 on a real run: change a stopped copy's and a stopped member's model and runtime; the next message uses them. A running copy shows the stop hint, and its header stops it.
- AC-004: a Team-wide change reaches followers (needs a signed-in runtime).
- An Org: focus a direct agent, a placed team's member and a copy; the switch says "Organization settings"; a stopped Org's copy opens Settings; a workspace change in the group view.
- A remote copy: read-only, with its chip.

## API / E2E / Executable Coverage Investigation And Execution Still Required

**Probes that still read the removed list.** They need navigating to each copy instead, which I left to you as the owner of executable coverage:

- `tests/e2e/delegated-launch-defaults-probe.mjs`: `delegatedRows` (reads `run-delegated-launches`).
- `tests/e2e/delegated-copy-own-file-cases.mjs`: `delegatedRow`, `:257`, `:476`.
- `tests/e2e/settings-saved-model-refresh-cases.mjs`: `sectionOf`.
- `tests/e2e/model-routing-decisions-probe.mjs`: `:258` ("View decision" is now on the copy's card).

**Updated, syntax-checked, not run:** `run-settings-live-probe.mjs` (R07, R08 click the switch) and `workspace-folder-picker-probe.mjs` (Org case).

**To check:** `chat-entry-live-probe.mjs` `savedRunLocked` and `existing-run-model-config-probe.mjs`. I read them as an Agent run's root card and a fixture page with no focused agent, so unchanged.

Any probe that clicks a selected run's row expecting to leave Settings would now stay in Settings (D-IMP-1).
