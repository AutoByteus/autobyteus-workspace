# Code Review Report — projects-left-navigation

## Latest Round: Implementation Review, Targeted Delta (CRR-004)

- Review Entry Point: `Implementation Review`, round 3.
- Review Scope: `Targeted Delta Review`.
- Review Scope Evidence: the delta `8ac0892464..c9972a1581` changes two files: `autobyteus-web/stores/projectRunsStore.ts` and its spec. That is exactly the owner CR-003 named. There is no server change, no shared interface or data shape change, and no fix layered on an earlier fix (c9972a1581 only renames a parameter). The CRR-002 evidence for every other check is carried forward.
- Trigger: IR-003 from the implementation engineer (HEAD `344ccade3d`; code `60499aa479`, `c9972a1581`).
- Prior finding rechecked: CR-003 is **Resolved**.
  - `rereadAfter` is one rule. Through `$onAction` it observes the run history store's removals and the stops of each owner: `agentRunStore.terminateRun(runId)`, `agentTeamRunStore.terminateTeamRun(rootTeamRunId)`, and `agentOrgRunStore.terminate(orgRunId)`, which is the Org Stop path `executeSubjectAction('stop')` → `stopAndInspect` → `terminate`.
  - After each settles, the Projects listing that run ID are read again. A call with no listed ID re-reads every loaded Project.
  - All four actions take the root run ID as a string, so the listing lookup applies.
  - It only runs while the mode is shown, and reads stay coalesced.
  - There is no import cycle: none of the observed stores imports `projectRunsStore`.
  - The observed stores did not grow.
- Evidence:
  - The new spec cases (an Agent stop; a Team and an Org stop) fail on the code before IR-003, as the handoff states.
  - IMP-12: the full API/E2E browser probe passes PLN-01…PLN-10 on `c9972a1581`, and PLN-09 now shows `projectsStopButtonsAfter5s: 0`.
  - IMP-13: web typecheck PASS, 1350 store and history tests pass.
- c9972a1581: the parameter rename avoids a Nuxt auto-import collision on the identifier `actions`, which had broken page load. It has no behavior change, and IMP-12 is the browser proof that the page loads.
- Structural checks affected: re-run for the delta.
  - Ownership: one re-read policy, in `projectRunsStore`. Pass.
  - Repeated coordination: one rule for four stores. Pass.
  - Dependency direction: a store observes other stores' actions as notifications. Pass.
  - Tests: Pass.
- Score changes: Runtime Correctness And Behavioral Fidelity 9.4 (CR-003 resolved); API/E2E Readiness 9.4. The other CRR-002 scores stand. Every category is ≥ 9.4.
- New findings: none. Follow-ups added: none.
- Review Decision: `Pass`.
- Recommended Recipient: API/E2E Engineer, for the rerun and then the deferred proportional test-code review. Informational notice to the implementation engineer.
- task_size Large / architectural_risk High, unchanged.

---

## Earlier Round: API/E2E Failure-Origin Review (CRR-003)

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-003`. Review Scope: `N/A` (failure-origin round). The CRR-002 source review below stays the authoritative source audit and scorecard, apart from the review-gap note and finding CR-003 recorded here.
- Trigger: API-REV-001 `Fail` from the API/E2E engineer.
- Code tested: `467cff24c0`; tests in `dcada6320d`, reports in `8ac0892464`.
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (API-REV-001)
- Project testing guideline: root `TESTING.md` (as the coverage investigation records)
- Failing Scenario IDs: API-04 PLN-09 (AC-012; REQ-011, REQ-014)
- Exact Failing Command / Execution Mode: `env -i PATH HOME TMPDIR USER LOGNAME pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh>`. The probe runs its own stack: the built server, Nuxt dev, headless Chrome and the scripted AGY CLI. Reproduced in 3 of 3 runs.
- Failure Evidence Paths: `evidence/api-e2e/API-04-browser-probe/evidence.json` (`cases.PLN-09.details.stopDiag`), `PLN-09-after-stop-projects.png`, `PLN-09-after-stop-workspaces.png`, `API-04-browser-probe.log`

### Failure context

- Scenario: in Projects mode, the user clicks Stop on a running Agent run listed under P. The run is not open in this window, so it has no live context.
- Expected: the row reads stopped, as it does in Workspaces mode. Archive is then offered, and the group's "Archive all" is no longer blocked. This is REQ-014 ("running runs: Stop, not Archive", parity with Workspaces), REQ-011 ("status changes … appear"), and DS-004 ("status … exactly as Workspaces does").
- Observed: the server reports the run inactive at once (`serverActiveAfterStop: [false]`), and Workspaces mode shows no Stop (`workspacesStopButtons: []`). Projects mode still shows the run green with Stop after 5 s (`projectsStopButtonsAfter5s: 1`) and blocks "Archive all" until the next re-read (`projectsStopButtonsAfterModeSwitch: 0`).

### Scenario validity

- `Supported Normal Scenario`. The user stops a listed running run from its row; the row's Stop action is the product surface (REQ-014).
- A running run with no context in this window is the normal state after a reload, or for a run started earlier and not opened since.
- The probe enters through the real Stop button and the real terminate mutation. It is a valid test, not a stale one.

### Origin

- Classification: an implementation defect, together with an earlier review gap.
- Production path:
  - Row Stop calls `agentRunStore.terminateRun` (`stores/agentRunStore.ts` 456/485). On success it calls `runHistoryStore.markRunAsInactive(runId)` and `runHistoryStore.refreshTreeQuietly()`. Both update only the Workspaces rows. Workspaces also refreshes every 5 s (`WorkspaceAgentRunsTreePanel.vue` 182, 503).
  - `projectRunsStore` re-reads after web actions only for the archive and delete actions in `RUN_REMOVALS` (`stores/projectRunsStore.ts` 28, `$onAction` 160–167).
  - `projectRunsProjection` overlays status only from live agent and team contexts. A run with no context keeps the snapshot's `isActive: true`.
- The same code path applies to a Team stop (`agentTeamRunStore.ts` 246 → `runHistoryStore.markTeamAsInactive`; not in `RUN_REMOVALS`). Org stop (`executeSubjectAction(... 'stop')`) should be checked in the same fix.
- Why it is implementation-owned: the approved intent is explicit. The design's trigger (4) ("the web created, archived or deleted a run → re-read the Projects listing it") and its "exactly as Workspaces" rule already cover this. The fix extends that trigger to the web's Stop of a listed root, in the existing owner `projectRunsStore`. It needs no requirement or design decision and adds no new owner or periodic work.
- The DS-004 sentence "Status changes need no re-read" holds only for runs with a live context. Record the extended trigger in the implementation handoff so the design text and docs can follow at delivery.
- Earlier review gap: in CRR-001 (C-04) and CRR-002 I accepted DS-004's status premise and the `RUN_REMOVALS` set. I did not check how Workspaces updates a run with no context after Stop. The invariant was detectable in source: `agentRunStore.terminateRun` updates the run history store, which the Projects snapshot does not follow. Only the CR-003 rationale is added here; the CRR-002 scores are not rewritten.
- Not attributed:
  - Server-side status changes of top-level runs that are not open in this window. No supported trigger or evidence was shown for them: idle shutdown applies to delegated runs, whose rows come from the collaboration store. Not reviewed further.
  - FU-007 and FU-008 were recorded by API/E2E as pre-existing and out of scope. I agree.

### CR-003: Projects mode keeps a stopped run as running until the next re-read (Local Fix, implementation)

- Protects: REQ-014 and AC-012 (Stop, then Archive or Archive all, in Projects mode as in Workspaces); REQ-011 (status changes appear without a manual refresh).
- Evidence: listed above.
- Required action (implementation engineer):
  - After the web stops a listed root (Agent, Team, and Org if its path behaves the same), Projects mode shows it stopped as Workspaces does. Do this through `projectRunsStore`'s existing DS-004 trigger (4), for example by re-reading the Projects that list the run.
  - Add a store or component test that fails today.
  - Note the trigger extension in the handoff.
- The mechanism is the implementation engineer's choice, within the existing owner.

### Proportional test-code review

The API/E2E engineer asked for this round's test-code review too. It is not done in this round: the skill keeps the test-code review and the failure-origin review as separate entry points, and the test-code review follows a passing API/E2E run. After the CR-003 fix, source review and the API/E2E rerun, these files get their proportional review in `api-e2e-test-review-report.md`:

- `project-run-history.e2e.test.ts`
- `collaboration-root-harness.ts`
- `projects-left-navigation-probe.mjs` and its `package.json` script
- `WorkspaceAgentOrgScopedRows.spec.ts`

### Result (CRR-003)

- Review Decision: `Fail`, confirmed as an implementation defect.
- Failure Origin: implementation defect (CR-003), with a review gap acknowledged.
- Classification: `Local Fix`, owned by implementation.
- Recommended Recipient: Implementation Engineer (`/software_engineering_team/implementation_engineer`). Afterwards: source review (a targeted delta), the API/E2E rerun, then the proportional test-code review.
- task_size Large / architectural_risk High, unchanged.

---

## Source Review (CRR-002) — Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (R4; REQ-008 / DEC-013 / AC-007 refined in SR-008; the Data Continuity constraint is unchanged)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-001…E-042; E-041 and E-042 are new in SR-009)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: Product `ui-ux-spec.md` (UXJ-003/007, TR-004…009); `follow-ups.md` (FU-001…FU-005); `docs/design-cases.md` Case 14
- Relevant Solution Revision IDs: SR-008, SR-009
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass of SR-009)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Full Re-Audit`. The server part is re-audited in full; the web evidence is carried forward.
- Review Scope Evidence: IR-002 moves the stored record from run-history files to a new Projects-owned file. It changes the shared ports (`RunProjectStarts`, `RunProjectContextReader.contextOfRun`, `ProjectRunLinks.startedRunsOf`), the composition and the DS-001/002/005 sequence, and it touches files beyond CR-001/CR-002. All server structural checks were therefore rerun. The web delta from `73d598c008` to `e1d9a58a13` is only `utils/runTreeProjection.ts` (the CR-002 comment move), so round 1's web evidence and checks still hold.
- Trigger: the implementation engineer's request for review of IR-002 (HEAD `e1d9a58a13`; code commit `467cff24c0`)
- Prior Review Round Reviewed: 1 (CRR-001, Fail: CR-001, CR-002)
- Latest Authoritative Round: 2
- Project-specific design files applied: root `DESIGN.md` (rules 7, 9, 10), Data Migration Guideline § Rolling back, `RELEASE.md` § Rollback, server `docs/modules/projects.md` (Task file `hostRoot {kind, runId}` vocabulary)

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Unchanged and confirmed: there is now a new persisted Projects file written on the run-creation path.
- Selected route: `Implementation Review`. Independent source review required: `Yes`.

## Review Scope

- Changed implementation reviewed: the whole server source delta `73d598c008..467cff24c0`.
  - Reverted run-record keys.
  - `projects/domain/project-runs.ts`, `projects/stores/project-run-store.ts`, `projects/services/project-run-service.ts`, `ProjectsLayout.projectRunsFile`.
  - The ports in `agent-execution/domain/run-project-context.ts` and `run-history/domain/project-run-links.ts`.
  - The async `compositions/project-run-links-composition.ts` and how the Task resource composition calls it.
  - The Agent provisioning order, the Team manager order, the Team member and restore config readers.
  - The `projectRunHistory` join.
  - The new and updated server tests.
- Also re-verified:
  - The run-history store, type and schema files equal the base: `git diff --stat 0ae78c9b91 e1d9a58a13 -- run-history/store …team-run-execution-tree.ts …team-run-history-index-row-projector.ts` is empty.
  - Startup order: `composeProjectTaskExecutionResources` is awaited before `createGeneralProcessRunSupervisor` in `build-studio-server.ts` 322 and `start-standalone-application-host.ts` 244.
- Explicit exclusions: unchanged web sources (round 1 evidence carried forward); visual fidelity (AC-017; API/E2E and Delivery).
- Checks rerun by this review: none. The recorded IMP-01 (7558 passed), IMP-01b, IMP-02, IMP-06 (132 passed), IMP-10 and IMP-11 ran on the reworked code; their summary lines were confirmed in the logs.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. SR-009 keeps the Data Continuity constraint and changes where the record is stored.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-003, Pass.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Unchanged since round 1 (web) | — |
| BEH-002 | Confirmed | Agent: `prepareAgentRun` → `prepareFreshRun` (allocates the id and writes nothing) → `recordRunProjectStart(projectId, {agent, runId})` → `ProjectRunService.recordStart`. The service refuses an unknown Project with `ProjectError(PROJECT_NOT_FOUND)` and refuses a run already recorded under another Project. It appends under the file lock and then indexes. Metadata and `recordPreparedRun` follow, with the released keys. Team: `AgentTeamRunManager.createTeamRun`, inside `withRootTransition`, calls `recordRunProjectStart(projectId, {agent_team, teamRunId})` before `buildInitialTeamRunExecutionTree`. DS-005: `readRunProjectContext({agent, metadata.runId})` on start and restore; for Team members, `materializeTeamRoot` passes `{agent_team, rootTeam.teamRunId}` → callbacks → `ConfiguredAgentExecutionHandle`. `contextOfRun` returns null for runs not started under a Project and for deleted Projects. | — |
| BEH-003…BEH-006, BEH-008 | Confirmed | Unchanged. `projectRunHistory` now builds `startedUnderProject` from `startedRunsOf(P)` and joins it with the catalog rows. | — |
| BEH-007 | Confirmed | The released index keys are restored (IMP-10, IMP-11, `run-records-rollback-shape.test.ts`). After a rollback, older builds read the index files unchanged and never open `project_runs.json` (E-042). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 / SCN-011 | BEH-002, BEH-005 | User | User | Run under a Project | "+" or chip | Normal | Traced under BEH-002 | Recorded in `project_runs.json`; told its Project; listed | requirements-doc | Supported Normal Scenario | Use |
| SCN-003 / 005 / 009 / 007 | BEH-003, 006, 008 | System | Runs / app | Follow work; stay current | Feed, mode shown | Normal | Unchanged from round 1 | Scoped, live tree | requirements-doc | Supported Normal Scenario | Use |
| OPS-001 | REQ-013, BEH-007; Data Continuity | Operational | Maintainer / Docker user | Roll back a release | `RELEASE.md` § Rollback | Explicit Edge | Released index readers read this build's rows (released key set only); older builds never read `project_runs.json`. An older build's Project Delete keeps other files (E-042). | Older builds keep reading; they ignore the new record | E-041, E-042; IMP-10 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 (CR-001) | The rollback reading of the index rows | OPS-001 | Rollback | Resolved: no file read strictly by older builds gains a key | Store diff against the base is empty; IMP-10; rollback-shape test | Resolved | — | — |
| C-02 (CR-002) | Misplaced doc comment | Readability | — | Resolved: the comment is back above `projectWorkspaceHistoryByWorkspace` | `runTreeProjection.ts` diff | Resolved | — | — |
| C-08 | Orphan entries: the start is recorded before the run's records, so a failed creation, an expired prepared run, or a deleted run leaves an entry | DS-001 / DS-002 ordering | A creation that fails after `recordStart`; prepared-run expiry; delete | `projectRunHistory` joins entries with the catalog rows, so nothing is listed. `contextOfRun` is only asked for runs that exist (fresh UUID ids). | `project-run-history-service.ts` join; orphan unit test | Reject | — | Harmless by construction. The design states this order deliberately ("link before resources", as Task links). |
| C-09 | A Team start for an unknown Project is now refused in the manager, after `TeamRunService` has activated workspaces; in IR-001 the check came before activation | REQ-005 ("never requires, creates, registers or links a folder") | A Project deleted between choosing it and sending | Workspace activation for the chosen folder happens on every Team start, and the start is still refused before any run record. No Project folder link is made. | `team-run-service.ts`; `agent-team-run-manager.ts` | Reject | — | REQ-005 concerns the Project's links; activating the run's own folder is today's behavior for any start. The trigger is a narrow race. |
| C-10 | Every Agent start or restore and every Team member config now asks `contextOfRun`, even for runs not started under a Project | DS-005 | Any run activation | An in-memory map lookup after the one-time `load()`; `getProject` runs only when an entry exists | `project-run-service.ts` | Reject | — | Negligible cost; the view is loaded during composition, before the run supervisor exists. |
| C-11 | `{kind, runId}` sits beside the existing `RootExecutionIdentity {rootSubjectKind, rootRunId}` | Principle 15 | — | The stored sibling, the Task file's `hostRoot`, already uses `{kind, runId}` (server `projects.md` 398, 1060), so the new file matches the Projects stored vocabulary. The narrower kind union, without Orgs, is meaningful (DEC-006). | projects.md | Reject | — | Consistent with the stored vocabulary; the design specifies it. |
| C-12 | The standalone application host also composes its own `ProjectRunService` view | Process model | — | Same pattern as `TaskExecutionResourceService`. Application-owned runs are never started under a Project, so its view only answers null. | `start-standalone-application-host.ts` 244 | Reject | — | No supported path depends on that view being current. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | The row-projector extraction stays as a size refactor that adds no key | — |
| Matches behavior-defining supplements | Pass | No web behavior changed (round 1) | — |
| Data-flow spine clarity | Pass | DS-001/DS-002 have one sequence owner each (provisioning service, Team manager) calling `recordStart` once, in the documented order | — |
| Ownership boundary preservation | Pass | Projects owns every Project ↔ run record: `ProjectRunService` is the only writer of `project_runs.json`. Run records are untouched. | — |
| Off-spine concern clarity | Pass | Ports are bound in the composition and released with it | — |
| Existing capability reuse | Pass | `updateJsonFile` / `readJsonFile` (lock and atomic replace), `ProjectsLayout`, `ProjectError` | — |
| Reusable owned structures | Pass | `appendProjectRun` / `projectRunRootKey` live in the domain file | — |
| Shared-structure tightness | Pass | The entry is `{root, linkedAt}` only; one file per Project | — |
| Repeated coordination ownership | Pass | The existence check exists once, in `ProjectRunService` | — |
| Empty indirection | Pass | `recordRunProjectStart` and `readRunProjectContext` are the port accessors, with refusal and null semantics | — |
| Separation of concerns / file responsibility | Pass | Domain, store and service split as in the existing Task run resources | — |
| Ownership-driven dependency | Pass | agent-execution and agent-team-execution reach Projects only through the port; the Projects boundary guard passes in the full suite (IMP-01) | — |
| Authoritative Boundary Rule | Pass | `ProjectRunHistoryService` uses only `ProjectRunLinks` | — |
| File placement | Pass | `projects/{domain,stores,services}` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface clarity | Pass | `recordStart(projectId, root)`, `contextOfRun(root)`, `startedRunsOf(projectId)`: each takes an explicit identity | — |
| Naming / one vocabulary | Pass | C-11 | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | The IR-001 keys and readers were removed cleanly rather than layered over (store diff against the base is empty) | — |
| Dead code removed in touched files | Pass | `requireRunProjectId`, `optionalProjectId` (both readers) and `runProjectId` callbacks removed; `run-project-id-records.test.ts` removed | — |
| Test scenarios clear and requirement-aligned | Pass | Store and service (exact shape, refusal, deleted Project, tolerant read), Agent order, Team record-before-tree, orphan join, rollback key shape | — |
| Test fixtures/helpers coherent | Pass | — | — |
| No stale/compat-only tests | Pass | The old record tests were removed. The rollback-shape test asserts the released key sets as the current contract, not a compatibility path. | — |
| API/E2E readiness | Pass | — | — |

## Source File Size And Structure Audit

Effective non-empty lines.

| Source File | Base | After IR-002 | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `server/.../configured-agent-execution-handle.ts` | 487 | 491 | Pass | Pass | Pass | Pass | — | — |
| `server/.../agent-team-run-manager.ts` | 449 | 453 | Pass | Pass | Pass | Pass | — | — |
| `server/.../agent-run-history-catalog-service.ts` | 499 | 486 | Pass | Pass | Pass | Pass | — | — |
| `server/.../autobyteus-agent-run-backend-factory.ts` | 499 | 481 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/services/project-run-service.ts` | 0 | ≈80 | Pass | Pass | Pass | Pass | — | — |
| `server/src/projects/stores/project-run-store.ts` | 0 | ≈65 | Pass | Pass | Pass | Pass | — | — |
| `web/stores/chatDraftStore.ts`, `WorkspaceAgentRunsTreePanel.vue`, other web files | — | as in round 1 (≤ 495) | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No dual writes; one record |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Approved persisted-data transition followed | Pass | `Not Affected` for existing data. A new additive file; run-history files are byte-equal to the base |
| No version-specific dual reads/writes | Pass | The tolerant reader is current-shape only |
| Transition mechanics match design | Pass | Per-file lock, atomic replace, tolerant read; an unreadable file affects only its own Project (DESIGN rule 7) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`.
- Files: as in the design spec, plus server `docs/modules/projects.md` § Persistence Layout (`project_runs.json`) and § Delete (the file is kept). Release notes: per `RELEASE.md` § Rollback, rolling back is possible.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001, MP-002 | Confirmed | Unchanged |
| OPS-001 (CRR-001) | Confirmed, now satisfied | Older builds read the index rows unchanged and never open `project_runs.json` (E-041, E-042, IMP-10) |

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; not the decision rule).

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | One sequence owner per start; the record comes before the run records, as designed | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Projects owns every Project ↔ run record; run records are untouched | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit root identities; `PROJECT_NOT_FOUND` comes from one owner | The resolver cast (`as unknown as`) remains, as elsewhere | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Domain, store and service mirror the Task run resources | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | A minimal entry; vocabulary matches the sibling Task files | Mirror types on the two sides of each port (deliberate) | — |
| 6 | Naming Quality and Local Readability | 9.4 | CR-002 fixed; clear comments | — | — |
| 7 | API/E2E Readiness | 9.4 | 132 targeted tests; dev stack shows the file, the released keys and listing after restart | The restore and Team-member prompt still need a live run (API/E2E) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | All in-scope paths, plus the rollback constraint | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | A clean revert of the IR-001 keys; no dual paths | — | — |
| 10 | Cleanup Completeness | 9.5 | The removed helpers, callbacks and tests are listed under dead code | — | — |

## Findings

CR-001 and CR-002 were resolved in CRR-002; CR-003 was resolved in CRR-004. None are open.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

API/E2E Engineer (`/software_engineering_team/api_e2e_engineer`). The implementation engineer gets an informational notification.

## Residual Risks

- The `## Project` section after a restore and for Team members is verified only in unit tests; check it in a live run (AC-003).
- A Team run started under a Project appears after one re-read rather than from its context (round 1 C-03); observe in AC-005 / UXJ-003.
- The Task line of a multi-Project copy listed under P may show Q's Task; check in the AC-007 browser run.
- The Org scope filter has no dedicated component test (handoff).
- Real delegation, closure and reactivation, opening beyond the cap, and the integrated desktop journey (AC-006, 008, 009, 014) are still to be run.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 average; every category ≥ 9.4.
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: IR-002 resolves CR-001 by moving "started under a Project" into a Projects-owned file that older builds never open. task_size Large / architectural_risk High, unchanged.
