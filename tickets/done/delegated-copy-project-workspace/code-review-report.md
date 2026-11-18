# Code Review Report — delegated-copy-project-workspace (autobyteus-97)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-001…E-012, as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: none
- Relevant Solution Revision IDs: SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Pass; untracked)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (untracked)
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: IR-001 from the implementation engineer. Branch `codex/delegated-copy-project-workspace`, range `94c466ae9c..8959bc507a`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Project design files applied: root `DESIGN.md` (rule 7 for bad data, rule 11), `TESTING.md` rule 9 (for the observed failure).

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High`. Confirmed: within existing owners, but where every local saved-Task and sub-work copy runs changes on all roots and runtimes.
- Selected route: `Implementation Review`. Independent source review required: `Yes`.

## Review Scope

- Reviewed: all 20 source files and the new and extended tests in the range; the proof script `new-copy-folder-proof.mjs` and its evidence, including the Projects-mode screenshot.
- Traced beyond the diff: every caller of `resolveDelegationPlacement`, `catalogTaskSource`, `catalogTaskSourceOf`, `prepareNewCopyWork`, `dispatchNewCopy` and `launchBase`; `new-copy-work.ts`; `task-delegation-target.ts`; the launch resolver's folder use; a search for code assuming a copy's folder equals its root's.
- Checks rerun by this review: none. IMP-01…IMP-06 ran on `8959bc507a` content, and their summary lines match the handoff.
- Explicit exclusions: Team and Org rows in a browser and the packaged app (API/E2E).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-001, Pass; its points 1–3 are applied.
- Behavior-basis status: `Confirmed`.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | Each root: `prepareNewCopyWork` → (inside `delegateToResolvedTarget`'s closure) `newCopyFolder(work)` → `port.projectFolderForNewCopy` → `resolveDelegationPlacement(…, folder)`. A catalog copy resolves from `baseInFolder`, and `launchContextOf(base)` gives the check and the router the folder (`collaborator-launch-resolver.ts` 162, 274). An in-run placement gets `sourceInFolder`: the Agent's launch, or the Team's default and every member. `null` keeps the base, which is the root's launch on all three roots (`standalone-root-collaborators.ts` 30, `team-run-collaborators.ts` 17, `agent-org-run-collaborators.ts` 32). So a kept copy's sub-work under a Task with no link goes to the top-level run's folder, not the sender's (REQ-002). Sub-work and Temp work get `projectId` from `new-copy-work.ts` (`describeTask` / `null`). |
| BEH-002 | Confirmed | `fs.stat(...).isDirectory()` on the first link only. `TASK_PROJECT_FOLDER_UNAVAILABLE` is in `ProjectErrorCode`, `TASK_EXECUTION_RESOURCE_REJECTION_CODES` and `TaskDelegationErrorCode`; `asTaskDelegationError` wraps it; `delegateToResolvedTarget` rethrows it before `dispatchNewCopy`, so before any Task link. AC-006 is asserted through the tool payload, with no Task resources file. |
| BEH-003 | Confirmed | No web code changed. IMP-05 and its screenshot: the copy stays nested under the manager; Files and Terminal show F. |
| BEH-004 | Confirmed | `assignToExistingCopy`, reactivation and restore are not in the diff. AC-007 is asserted on the live and stored tree. |

Other forms checked: the remote path dispatches from `remote-delegation.ts` 99–100 without this step. Peer-started runs use `catalogTaskSourceOf`, whose behavior is unchanged. No code compares a copy's folder with its root's (search of the collaboration, roots, run-history, projects and streaming code).

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…003 | BEH-001 | System | Manager or worker | Delegate a Project's work | `delegate_task` | Normal | BEH-001 trace | Copy in the Project's first link | User decision; requirements | Supported Normal Scenario | Use |
| SCN-004 | BEH-001 | System | Manager | No usable link, or Temp work | `delegate_task` | Normal | `null` → root's base | Inherit | Requirements | Supported Normal Scenario | Use |
| SCN-005 | BEH-002 | System | Manager | Link moved or deleted | `delegate_task` | Explicit Edge | BEH-002 trace | Coded refusal, nothing started | Task; links unchecked on save | Supported Explicit Edge Scenario | Use |
| SCN-006 | BEH-003 | User | User | Inspect the copy | Tree row, Files, Terminal | Normal | Existing web path | Copy's folder shown | User decision | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Refusal text says "which is not an existing folder on this node" instead of the design's "does not exist" | REQ-005, AC-006 | — | A file link also refuses, and the wording stays true | `project-new-copy-folder.ts` | Reject | — | More accurate; names the Project and the folder as required |
| C-02 | A Project gone before this step rejects `PROJECT_NOT_FOUND`, uncoded at the tool | — | Project deleted in the narrow window after the Task was read | Nothing starts; the agent gets an uncoded error | Task read fails earlier, because Project Delete removes the Task files (design review) | Reject | — | Technically possible but narrow; failing is the right direction and inheriting would be wrong. No machinery needed |
| C-03 | `catalogTaskSourceOf` keeps its signature; it and `catalogTaskSource` share private `sourceFromBase` | Peer-started path unchanged | — | — | `collaborator-admission.ts` | Reject | — | Sound; no new parameter on a path that never uses it |
| C-04 | The Task's own Project shows "No runs yet" for a manager started under another Project, and the proof asserts it | REQ-008 | — | Looked like a conflict with projects-left-navigation REQ-003 (hosts listed), but `60fc6161d2` (autobyteus-353) made a Project list only the runs started under it | `project-run-history-service.ts` history | Reject | — | Current product behavior from another ticket, unchanged here |
| C-05 | `placementInFolder`'s `remote_agent` guard | — | — | No in-run path produces it, but the union type needs narrowing to reach `source` | `catalog-delegation.ts` | Reject | — | Type narrowing, not a behavior branch |
| C-06 | The `root-team-run.ts` step is one long line; the file stays at exactly 500 effective lines | Size rule | — | Readable; the design's example has this shape | IMP-06, ARCH-REV-001 point 2 | Reject | — | Within the limit and not grown |
| C-07 | In-run placements have no launch check in the new folder | REQ-006 | — | Existing behavior kept by the requirement; would fail at start through the existing path | ARCH-REV-001 | Reject | — | Hint for API/E2E |
| C-08 | `EXC-E2E-004` failed once ("fenced for root shutdown"); handoff says cause not instrumented | TESTING.md rule 9 | Parallel DONE and follow-up `delegate_task` | The same failure and its cause are already recorded: projects-left-navigation FU-007, `prepareClosedCopyForResume` returns early for a copy the DONE has fenced. The test's Project has no links, and the path is not in this diff. | `tickets/done/projects-left-navigation/follow-ups.md` FU-007; IMP-04 | Promote | Follow-up | Not caused by this change. FU-001 here points to the earlier record so it reaches the Solution Designer. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | One rule owner, one shared apply step, one call per root | — |
| Implementation matches behavior-defining supplements | Pass | None exist; REQ-008 no web change | — |
| Data-flow spine clarity | Pass | DS-001 as designed, in call order | — |
| Ownership boundary preservation | Pass | Collaboration reaches Projects only through the port; no `fs.stat` or store read outside Projects | — |
| Off-spine concern clarity | Pass | `project-new-copy-folder.ts` | — |
| Existing capability reuse | Pass | Launch resolution, snapshot, restore and error wrapper reused | — |
| Reusable owned structures | Pass | `baseInFolder`, `sourceInFolder` beside their types | — |
| Shared-structure tightness | Pass | `DelegationWork` not extended; no shape change | — |
| Repeated coordination ownership | Pass | The rule has one owner; roots add one call in their own sequence | — |
| Empty indirection | Pass | The Team forward matches its sibling forwards on `TeamTaskExecutionService` | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | No new direction | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | As mapped, with the two review additions | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface clarity | Pass | Explicit `newCopyFolder: string \| null`; `null` is the documented "inherit" result | — |
| Naming / one vocabulary | Pass | "new-copy folder" for the result; `workspaceRootPath` stays the stored and launch name | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | None added; no unused export | — |
| Test scenarios clear and requirement-aligned | Pass | Cases name their ACs. Agent and Org roots use real roots with an in-memory port; the Team root uses the real tool and Projects service; the rule test uses real files | — |
| Test fixtures/helpers coherent | Pass | `projectFolders` on the in-memory fixture | — |
| No stale/compat-only tests | Pass | — | — |
| API/E2E readiness | Pass | — | — |

## Source File Size And Structure Audit

Effective non-empty lines, base → HEAD (checked independently of IMP-06).

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 500 | 500 | Pass (not over, not grown) | Pass | Pass | Pass | — | — |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 466 | 475 | Pass | Pass | Pass | Pass | — | — |
| `projects/services/project-task-service.ts` | 445 | 447 | Pass | Pass | Pass | Pass | — | — |
| `projects/services/project-new-copy-folder.ts` | 0 | 18 | Pass | Pass | Pass | Pass | — | — |
| All other changed source files | — | ≤ 298 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy old-behavior retention | Pass | Existing copies keeping their folder is required behavior (REQ-007) |
| Dead code removed in touched files | Pass | — |
| Approved persisted-data transition followed | Pass | `Not Affected`: same fields, new value for new copies |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`.
- Files (delivery): server `docs/modules/projects.md` (Saved-ID delegation, Workspace Registration Boundary), `docs/design/collaboration_model.md` (a sentence under CM-6), `standalone_agent_run_root.md` if it states inheritance. The delivery summary should mention the new Workspaces row.

## Additional Material Premise Validation

None.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; not the decision rule).

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | One decision point before placement on all three roots | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One rule owner behind the port | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Explicit folder parameters; one new code; no tool change | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Own file for the rule; the 500-line file did not grow | One long line in `root-team-run.ts` | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | No shape change; two small pure rewrites | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Clear names and short comments | — | — |
| 7 | API/E2E Readiness | 9.3 | Real delegation, native `pwd`, browser on an Agent root | A real Codex or Claude working directory is unread (needs the test vault) | API/E2E reads it |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Every kind and form traced; refusal before any link | AC-007 has no real restart | API/E2E restarts once |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | — | — | — |
| 10 | Cleanup Completeness | 9.5 | Nothing left behind | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: FU-001, the existing-copy race behind `EXC-E2E-004`. It points to projects-left-navigation FU-007, which has the cause and whose Sent column is empty. It does not fail this ticket.

## Classification

N/A (Pass).

## Recommended Recipient

API/E2E Engineer (`/software_engineering_team/api_e2e_engineer`). The implementation engineer gets an informational notification.

## Residual Risks

- A real external runtime's working directory is unread. AGY proves `--add-dir` and the capsule's `workspacePath`, not a shell `pwd`. The design's escalation trigger (a runtime that ignores the recorded folder) stays open until a real Codex or Claude copy is read.
- AC-007 has no real process restart; restore code is untouched.
- A folder-scoped model catalog on a configured placement is not exercised (C-07).
- Org root: unit level with a real root and an in-memory port. Not run through real delegation or a browser.
- AC-009 in the packaged app, and Team-member focus in a browser.
- New Workspaces row after the first delegation: accepted in the design; the user should hear it at delivery.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (none needed)
- Score Summary: 9.5 average; every category ≥ 9.3.
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: task_size Medium / architectural_risk High, unchanged.
