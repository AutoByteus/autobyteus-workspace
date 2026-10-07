# Historical snapshot — R2 / SR-005

Superseded, not current authority. Preserved before approved Product reconciliation. Current authority is ../requirements-doc.md.

# Requirements Document

## Document Status
- Status: Draft — Product UI work requested before approval
- Package identifier: restore-native-workspace-folder-picker
- Requirements baseline: R2 (behavior unchanged); current solution revision SR-005
- Requirements owner: Solution Designer
- Date: 2026-10-07
- Approval state and reference: No approved baseline. User explicitly requested Product Team UI work first on 2026-10-07; this is not approval of the R1 interaction proposal.
- Behavior-defining supplements: Unapproved Product round 1 at /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/review-round-1.md; UI source a677e01558b2b9d48253950bc2b8db821358625a. No final spec/normative references or user confirmation yet. External ownership retained.
- Authorities read (2026-10-07): solution-designer SKILL.md and references/requirements-engineering.md; requirements/investigation/revision templates; root AGENTS.md, DESIGN.md, TESTING.md; autobyteus-web/AGENTS.md.

## Product-First Review Direction (SR-002)
User: “send to @Product Team to work on the UI first. thanks”; followed by “delegate a task there”. Product work is explicitly requested before architecture or implementation. The detailed Browse placement and fill-then-Use-folder sequence below are the Solution Designer's **unapproved R1 proposal**, not constraints on Product's UI exploration. Product should determine the focused folder-selection interaction with the user; returned behavior will be reconciled into this canonical document and explicitly approved before architecture. Preserve established filesystem locality, manual-entry capability, saved-run locks and data/launch lifecycle unless the user explicitly approves a change. Do not prescribe Product's mode, repository or workflow.

## Problem And Desired Outcome
Chat and run setup no longer let desktop users browse for a workspace folder; the shared menu only accepts typed absolute paths. Restore native folder browsing on the local Electron node, alongside—not instead of—manual path entry. Scope includes Agent/Team new-chat setup, Org setup, and currently editable placed-Team workspace overrides. Do not unlock existing run settings.

## Relevant Scenarios And Journeys
All rows are User scenarios. Proposed additions remain unapproved until R1 approval.

| Scenario | Actor / goal | Supported trigger / starting condition | Product sequence / expected outcome | Alternate / error | Validity / independent evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Desktop user chooses workspace for Agent or Team | New chat or Run opens Agent/Team setup, local embedded node | Open workspace menu → Open another folder → Browse → native directory chooser → chosen path fills input → Use folder selects it | Cancel leaves prior input and workspace unchanged; manual entry remains usable | Supported Normal Scenario; user request; ChatNewSurface; former WorkspaceSelector browse control |
| SCN-002 | Desktop user chooses Org or placed-Team workspace | Org launch settings or an already editable placed-Team override | Same folder-choice sequence as SCN-001; correct setting receives selection | Existing locked/read-only fields remain locked; cancel/save rules unchanged | Supported Normal Scenario; user request; RunSettingsCard, OrgLaunchPage, RunMemberRow, ExistingRunSettings |
| SCN-003 | User enters path on browser, remote node, or mobile | Any supported editable workspace field outside eligible local desktop | Open another folder → type absolute server-side path → Use folder | No local OS browsing action on remote/mobile/browser; invalid/relative path retains current selection and existing error | Supported Normal Scenario; existing menu and mobileFeatureGates; legacy selector also restricted native browsing |
| SCN-004 | User dismisses or cannot open native chooser | Eligible local Electron folder input | Browse → cancel or picker failure → unchanged input and selected workspace; retry or type path | An empty/no-path result never clears or selects a workspace | Supported Explicit Edge Scenario; OS dialog cancel/error contract, existing native helper; manual fallback is in scope |
| SCN-005 | User reuses workspace or starts with new folder | Choose an existing/temp workspace, or confirm known/new absolute path | Existing selection/search work as before; known path reuses workspace; new path remains pending until existing launch/save lifecycle | Merely browsing does not create workspace, start run, send message or save settings | Supported Normal Scenario; existing confirmFolder and run workspace choice contract |

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Evidence-backed current behavior | Desired delta | Preserved behavior |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001,002 | Shared workspace menu only opens text form; removed form selector had native browse | Add explicit native Browse alongside editable folder path on eligible desktop | User confirms with Use folder; ordinary setup/draft flow unchanged |
| BEH-002 | Contract | SCN-003 | Existing native-picker policy requires embedded node, Electron bridge and non-mobile runtime | Apply same eligibility to restored control | Manual paths on all existing supported surfaces; never mistake local machine for remote filesystem |
| BEH-003 | User | SCN-004 | Existing native helper returns null for cancel/no path/failure | No workspace/input loss; allow retry/manual fallback | Picker must not apply an empty value |
| BEH-004 | User/System | SCN-002,005 | Existing/temp search, known-path reuse, deferred workspace resolution, and saved-run edit locks | No change | Workspace selection, draft lifecycle, run edit locks, launch/save ownership and existing data |

## Stakeholders And Outcomes
Desktop users regain native folder browsing. Browser/remote/mobile users keep current path-entry behavior. No backend or persisted-state feature change is requested.

## Scope Guardrail (Mandatory)
### In-scope use cases
- UC-001: Select Agent/Team workspace during new-chat/run setup (SCN-001,004,005).
- UC-002: Select Org root or currently editable placed-Team workspace (SCN-002,004,005).
- UC-003: Preserve manual entry and context restrictions (SCN-003).
### Out of scope
Remote filesystem browser, browser File System Access API, mobile native picker, migration/schema changes, backend workspace redesign, release/deployment, restoring retired configuration forms, changing saved-run edit policy, unrelated workspace sidebar/application-selector changes.
### Non-goals
No broad redesign of unrelated Chat or run-settings behavior. The focused folder-selection UI and confirmation interaction are now for Product review; the earlier exact control placement and confirmation-step proposal is not approved.
### Preserved boundary
BEH-002..004 / REQ-002..004 / AC-004..007. Do not create/select/save/launch anything merely because an OS chooser opens or closes.
### Review authority
Every blocking Design Impact or implementation correction must cite approved REQ/AC/BEH IDs. New policy, behavior, migration or compatibility obligations are Requirement Gaps requiring explicit user approval. Adjacent concerns may be recommendations only. Reviewer findings do not amend this baseline.

## Requirements
| ID | Requirement | Behaviors / scenarios | Priority / rationale |
| --- | --- | --- | --- |
| REQ-001 | Every currently editable shared workspace menu in scope offers a labelled, keyboard-operable Browse action beside the path input when local native browsing is available. Choosing a directory fills the input; Use folder applies the selection. | BEH-001; SCN-001,002 | High; restore requested desktop capability without replacing manual entry |
| REQ-002 | Offer native browsing only in Electron connected to its embedded local node and outside mobile runtime. Preserve manual absolute-path entry everywhere it currently works. | BEH-002; SCN-003 | High; existing local/remote filesystem boundary |
| REQ-003 | Cancel, empty response or failed picker invocation changes neither current path input nor selected workspace. Path typing and another Browse attempt remain usable. | BEH-003; SCN-004 | High; non-destructive alternate flow |
| REQ-004 | Preserve existing/temp workspace search and selection, absolute-path validation, known-path reuse, pending new-folder semantics, launch/save behavior and all existing locked/read-only settings. Native browsing is an input aid, not a new workspace registration or run-launch operation. | BEH-004; SCN-002,005 | High; bounded restoration |

## Acceptance Criteria
| ID | REQ / scenario | Trigger / observable expected outcome | Verification intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001; SCN-001 | Agent New chat and Team New chat: local desktop Open another folder displays Browse; activation opens actual OS directory picker. Selected absolute path fills input; Use folder updates only intended draft workspace. | Component plus isolated changed-build Electron journeys |
| AC-002 | REQ-001,004; SCN-002 | Org root and editable placed-Team workspace controls support the same path-pick/confirm outcome. Locked saved-run roots and non-editable member fields expose no newly editable control. | Shared control/caller tests and Org desktop journey |
| AC-003 | REQ-001; SCN-001,002 | Browse is reachable with keyboard and has localized visible or accessible name. It does not accidentally submit the path form. | Component plus keyboard/rendered check |
| AC-004 | REQ-002; SCN-003 | Browser without bridge, remote Electron node and mobile runtime offer no local Browse action and make no native picker call. Existing typed absolute-path flow still works. | Context matrix component/browser checks |
| AC-005 | REQ-003; SCN-004 | With a pre-existing selected workspace and nonempty typed draft, cancel/no-path/failure retains both; retry or manual confirmation remains possible. | Controlled native-boundary cases; real desktop cancel |
| AC-006 | REQ-004; SCN-005 | Selected known directory reuses existing workspace choice after Use folder; new directory remains pending and is resolved only at existing launch/save boundary. Browse alone neither registers a workspace nor sends/starts a run. | Selection/caller assertions and desktop state checks |
| AC-007 | REQ-002,004; SCN-003,005 | Manual valid path, invalid/relative path error, existing/temp selection, workspace search, menu positioning and existing locks remain correct. | Existing and targeted regression coverage |

## UI, Interaction And Experience
Applicable: Yes. Product UI work explicitly requested first. R1 suggested labelled Browse beside the input, fill rather than auto-submit, and retaining Cancel / Use folder; all remain unapproved options for Product/user review. Product round 1 has returned unapproved: /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/product-handoff.md and review-round-1.md. Runnable reference http://127.0.0.1:4581/chat, design source a677e01558b2b9d48253950bc2b8db821358625a in /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker. Final UI/UX spec, normative references and user confirmation remain pending. Product owns these artifacts; no proposal is promoted to approved requirements.

## Quality And Non-Functional Requirements
QR-001 (REQ-001/AC-003): keyboard-operable and localized browse label, matching existing menu accessibility conventions.
QR-002 (REQ-002/AC-004): zero native dialog calls from ineligible contexts.
No new performance, concurrency or platform-coverage promise.

## Data Continuity And Acceptable Loss
No persisted format or migration change requested. Existing workspaces, histories, drafts, current input and selected workspace must be preserved. No resets or deletion authorized. This input capability must preserve existing validation and launch/save persistence behavior; data volumes are immaterial to this bounded change.

## External Contracts And Dependencies
Existing Electron native dialog bridge returns path/canceled/error; local-node/mobile eligibility is established product behavior. Installed user version is unknown; source evidence is not a packaged runtime reproduction.

## Supplemental Artifacts
Product-owned, unapproved proposal: /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/review-round-1.md (REQ-001..004 / AC-001..007). Source, current status and review URL: /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/product-handoff.md. Evidence: /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/ui-behavior-test-matrix.md. Canonical full inventory is in investigation-notes.md. No supplement is approved. Historical tickets do not approve this change.

## Assumptions And Open Decisions
- ASM-001: Current checked-out integration source is the intended repair target; exact installed user build not verified. Does not block source-level restoration proposal.
- DEC-001: Product/user review of the focused UI and subsequent requirements approval is pending. User requested Product first, not approval of R1.
- No technical design or implementation is approved by this document until explicit response is recorded; routing follows completed design.

## Traceability
| REQ | Use cases | Behaviors | AC | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001,002 | BEH-001 | AC-001,002,003 | SCN-001,002 |
| REQ-002 | UC-003 | BEH-002 | AC-004,007 | SCN-003 |
| REQ-003 | UC-001,002 | BEH-003 | AC-005 | SCN-004 |
| REQ-004 | UC-001,002,003 | BEH-004 | AC-002,006,007 | SCN-002,003,005 |

## Architecture Phase Input
Approval pending. After approval trace shared menu owners and picker/IPC path; preserve node/mobile eligibility, deferred registration, current locks, and draft boundaries. Determine smallest integration and tests after reading architecture gate; do not revive retired forms. Product has proposed explicit inline error feedback, pending controls and focus outcomes; these interaction details need user confirmation and requirements reconciliation. Technical ownership remains for architecture after approval.

## Readiness Check
Current behavior evidenced: Yes. Desired/preserved behavior explicit: Yes. Scope clear: Yes. Testable traceability: Yes. Supported scenarios: Yes. Assumptions visible: Yes. Product/supplement approval: N/A. Content now held for requested Product UI work; revise/reconcile after Product result before approval.
User approval received: No. Approved basis ready for design: No. Remaining decision: DEC-001.


## Resume Clarification Hold — SR-003
Source evidence has been revalidated against unchanged task HEAD. Current user restates the original problem; no requirements approval supplied. R2 remains Draft and the prior Product-first direction remains recorded, not silently withdrawn. Ask whether the user approves the focused restoration (native Browse alongside manual entry, selected path filled then explicitly applied, local Electron only, non-destructive cancel and unchanged workspace/run lifecycle) or retains Product UI review first. No design/implementation authorization yet.


## Product-First Decision — SR-004
User explicitly requested delegation to Product Team `/product_team` to work on UI (2026-10-07). This resolves the SR-003 route preference: Product first. Intended UI remains unapproved; requirements R2 remain Draft. Product may revise the unapproved interaction proposal with the user, and returns its evidence/confirmation before canonical reconciliation and architecture.


## Product Round 1 Review Hold — SR-005
Product returned Awaiting User Review, explicitly not Design Completed. R2 remains Draft; no final specification or normative references accepted. Proposal includes Opening… with Browse/Use folder disabled, no error for cancel/empty, inline failure/retry/manual fallback, selection-to-field and cancel-to-Browse focus, and nonlocal connected-node helper copy. These are unapproved behavior refinements, especially distinguishing picker failure from cancellation; reconcile into canonical REQ/ACs after user confirmation, not silently as technical design. No production AC has passed based on prototype browser evidence. Delegated task remains open.
