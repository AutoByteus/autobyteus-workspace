# Requirements Document

## Document Status
- Status: **Ready for Approval** — canonical requirements approval pending; Product UI already approved.
- Package identifier: restore-native-workspace-folder-picker
- Requirements baseline: **R3 / SR-006**
- Requirements owner: Solution Designer; date 2026-10-07.
- Requirements approval state/reference: None for R3. No canonical baseline has previously been approved.
- Approved UI supplement: /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md; UCONF-001 at /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/user-confirmation.md. UI code a677e01558b2b9d48253950bc2b8db821358625a; completed Product artifact revision 15cb0d9be3b8bfdf3a7ee5f7f7862f7a89baa406.
- Exact requirements approval basis requested: this R3 and the above approved UI spec with VIS-001..012/manifest. UI confirmation is accepted for its actual UI scope, not fabricated as independent R3 approval.
- Authorities read: solution-designer SKILL.md; references/requirements-engineering.md; requirements/investigation/revision templates; applicable root and web AGENTS.md; TESTING.md; returned Product handoff/spec/confirmation/validation/integration and manifest. Architecture gate not entered.

## Product Reconciliation
Product-first work is complete. UCONF-001 approves the rendered Browse-beside-input, choose-then-Use-folder experience, silent cancel/empty, inline failure/retry, eligibility and locks. R3 integrates that externally owned UI basis rather than recreating a competing UI spec. Compared with R2, failure is explicitly distinguished from cancellation, pending/focus/accessibility states are explicit, and visual/copy fidelity is linked to final references. Scope and data/launch/save preservation are unchanged. Earlier R2 is archived in history/requirements-r2-before-product-reconciliation.md; chronological history remains in solution-revision-record.md.

## Problem And Desired Outcome
Chat and run setup no longer let desktop users browse for a workspace folder; the shared menu only accepts typed absolute paths. Restore native folder browsing on the local Electron node, alongside—not instead of—manual path entry. Scope includes Agent/Team new-chat setup, Org setup, and currently editable placed-Team workspace overrides. Do not unlock existing run settings.

## Relevant Scenarios And Journeys
All rows are User scenarios. Product UI portions are approved by UCONF-001; this complete R3 requirements basis awaits explicit approval.

| Scenario | Actor / goal | Supported trigger / starting condition | Product sequence / expected outcome | Alternate / error | Validity / independent evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Desktop user chooses workspace for Agent or Team | New chat or Run opens Agent/Team setup, local embedded node | Open workspace menu → Open another folder → Browse → native directory chooser → chosen path fills input → Use folder selects it | Cancel leaves prior input and workspace unchanged; manual entry remains usable | Supported Normal Scenario; user request; ChatNewSurface; former WorkspaceSelector browse control |
| SCN-002 | Desktop user chooses Org or placed-Team workspace | Org launch settings or an already editable placed-Team override | Same folder-choice sequence as SCN-001; correct setting receives selection | Existing locked/read-only fields remain locked; cancel/save rules unchanged | Supported Normal Scenario; user request; RunSettingsCard, OrgLaunchPage, RunMemberRow, ExistingRunSettings |
| SCN-003 | User enters path on browser, remote node, or mobile | Any supported editable workspace field outside eligible local desktop | Open another folder → type absolute server-side path → Use folder | No local OS browsing action on remote/mobile/browser; invalid/relative path retains current selection and existing error | Supported Normal Scenario; existing menu and mobileFeatureGates; legacy selector also restricted native browsing |
| SCN-004 | User dismisses or cannot open native chooser | Eligible local Electron folder input | Browse → cancel/empty silently preserves input and selection; invocation failure preserves both and shows inline retry/manual-entry feedback | An empty/no-path result never clears or selects a workspace | Supported Explicit Edge Scenario; OS dialog cancel/error contract and approved UI UCONF-001 / UXJ-004; manual fallback is in scope |
| SCN-005 | User reuses workspace or starts with new folder | Choose an existing/temp workspace, or confirm known/new absolute path | Existing selection/search work as before; known path reuses workspace; new path remains pending until existing launch/save lifecycle | Merely browsing does not create workspace, start run, send message or save settings | Supported Normal Scenario; existing confirmFolder and run workspace choice contract |

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Evidence-backed current behavior | Desired delta | Preserved behavior |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001,002 | Shared workspace menu only opens text form; removed form selector had native browse | Add explicit native Browse alongside editable folder path on eligible desktop | User confirms with Use folder; ordinary setup/draft flow unchanged |
| BEH-002 | Contract | SCN-003 | Existing native-picker policy requires embedded node, Electron bridge and non-mobile runtime | Apply same eligibility to restored control | Manual paths on all existing supported surfaces; never mistake local machine for remote filesystem |
| BEH-003 | User | SCN-004 | Existing native helper returns null for cancel/no path/failure | Silent cancel/empty; distinct inline invocation failure; no workspace/input loss; retry/manual fallback | Picker must not apply an empty value |
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
No broad redesign of unrelated Chat or run settings. No browser simulation copied as a custom production folder modal; system chooser chrome remains OS-owned. No full-product or universal-platform certification promised.
### Preserved boundary
BEH-002..004 / REQ-002..004 / AC-004..007. Do not create/select/save/launch anything merely because an OS chooser opens or closes.
### Review authority
Every blocking Design Impact or implementation correction must cite approved REQ/AC/BEH IDs. New policy, behavior, migration or compatibility obligations are Requirement Gaps requiring explicit user approval. Adjacent concerns may be recommendations only. Reviewer findings do not amend this baseline.

## Requirements
| ID | Requirement | Behaviors / scenarios | Priority / rationale |
| --- | --- | --- | --- |
| REQ-001 | Every currently editable shared workspace menu in scope offers a labelled, keyboard-operable Browse action beside the path input when local native browsing is available. Browse opens the actual native directory chooser. Choosing a directory fills only the input; Use folder applies the selection. While pending show Opening…, disable Browse/Use folder and permit only one chooser request at a time. | BEH-001; SCN-001,002 | High; restore requested desktop capability without replacing manual entry |
| REQ-002 | Offer native browsing only in Electron connected to its embedded local node and outside mobile runtime. Preserve manual absolute-path entry everywhere it currently works. | BEH-002; SCN-003 | High; existing local/remote filesystem boundary |
| REQ-003 | Cancel/Escape in the native chooser or empty response silently preserves current path and selection. Invocation failure preserves both and displays the approved inline error with retry/manual entry available. Returned path clears stale feedback and focuses input; cancel/error returns focus to Browse. Editing clears stale path/picker feedback. | BEH-003; SCN-004 | High; non-destructive alternate flow |
| REQ-004 | Preserve existing/temp workspace search and selection, absolute-path validation, known-path reuse, pending new-folder semantics, launch/save behavior and all existing locked/read-only settings. Native browsing is an input aid, not a new workspace registration or run-launch operation. | BEH-004; SCN-002,005 | High; bounded restoration |
| REQ-005 | Match the approved Product UI/UX spec and final reference details for the affected workspace control: placement, exact copy/localization, visual styling, responsive layout, keyboard/focus and accessible feedback. Honor its explicit illustrative-data, unrelated-surrounding-UI and OS-chrome exceptions; reference fixture/module structure is not a production requirement. | BEH-001..004; SCN-001..005 | High; preserve user-confirmed UI |

## Acceptance Criteria
| ID | REQ / scenario | Trigger / observable expected outcome | Verification intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001; SCN-001 | Agent New chat and Team New chat: local desktop Open another folder displays Browse; activation opens actual OS directory picker. Selected absolute path fills input; Use folder updates only intended draft workspace. | Component plus isolated changed-build Electron journeys |
| AC-002 | REQ-001,004; SCN-002 | Org root and editable placed-Team workspace controls support the same path-pick/confirm outcome. Locked saved-run roots and non-editable member fields expose no newly editable control. | Shared control/caller tests and Org desktop journey |
| AC-003 | REQ-001,003,005; SCN-001,002 | Browse is keyboard reachable and visibly labelled/localized; activation does not submit. Pending shows Opening… and disables Browse/Use folder, preventing duplicate requests and form confirmation. Return focus follows REQ-003; form/menu Escape and Cancel match the final approved spec without applying. | Component plus keyboard/rendered check |
| AC-004 | REQ-002; SCN-003 | Browser without bridge, remote Electron node and mobile runtime offer no local Browse action and make no native picker call. Existing typed absolute-path flow still works. | Context matrix component/browser checks |
| AC-005 | REQ-003,005; SCN-004 | With an existing selection and typed draft, cancel/empty preserves both without cancellation error; invocation failure preserves both and shows the exact approved inline error/alert. Retry/manual entry remain possible; selection/retry and input-editing clear stale feedback as specified. | Controlled native-boundary cases; real desktop cancel |
| AC-006 | REQ-004; SCN-005 | Selected known directory reuses existing workspace choice after Use folder; new directory remains pending and is resolved only at existing launch/save boundary. Browse alone neither registers a workspace nor sends/starts a run. | Selection/caller assertions and desktop state checks |
| AC-007 | REQ-002,004; SCN-003,005 | Manual valid path, invalid/relative path error, existing/temp selection, workspace search, menu positioning and existing locks remain correct. | Existing and targeted regression coverage |
| AC-008 | REQ-005; SCN-001..005 | Affected controls match approved VIS-001..012 and spec at desktop/narrow widths; local Browse fits beside input, nonlocal input remains full width with connected-node hint, error/hint wrap, keyboard/focus/labels/alert conform. English and zh-CN copy follows approved source and existing localization conventions. Only documented illustrative/OS/unrelated-content variations are permitted. | Rendered comparison against final references, keyboard checks and focused locale/layout checks; no inherited Product native/static pass assumed |

## UI, Interaction And Experience
- Applicable: Yes; externally owned Product specification **approved UCONF-001**.
- Normative specification: /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md.
- User confirmation: /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/user-confirmation.md.
- Runnable design repository: /Users/normy/autobyteus_org/autobyteus-web-design; normal /chat, run instructions /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-reference-runbook.md. Historical preview server is stopped, not an always-live URL.
- Product ticket: /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-ticket.md; original ticket branch design/restore-native-workspace-folder-picker. Authoring worktree has been cleaned up; use canonical paths.
- Approved UI source a677e01558b2b9d48253950bc2b8db821358625a; final durable artifact revision 15cb0d9be3b8bfdf3a7ee5f7f7862f7a89baa406; accepted design base 8cd41f886459630909e827d7df1b67910618aaac.
- Normative VIS-001..012: /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/visual-references/ and manifest.json. Affected workspace-control appearance, copy, placement, interaction, responsive and feedback details are authoritative. The spec explicitly excludes invented records/paths/counts, unrelated surrounding UI, OS dialog chrome, fixture architecture and synthetic delay as requirements.
- Exact new English copy, authored zh-CN copy, TR-001..010, UXJ-001..005 and accessibility/responsive rules remain in Product's spec, not a duplicated UI authority.
- No open UI design decision. No claim of real native picker, platform, persistence or runtime validation from the browser reference.

## Quality And Non-Functional Requirements
QR-001 (REQ-001,003,005/AC-003,008): keyboard-operable and localized browse label, matching existing menu accessibility conventions.
QR-002 (REQ-002/AC-004): zero native dialog calls from ineligible contexts.
QR-003 (REQ-005/AC-008): scoped visual/copy/layout fidelity to the approved reference, with only stated permitted variation. No new performance or universal-platform promise; chooser-pending interaction is REQ-001, not a new backend concurrency policy.

## Data Continuity And Acceptable Loss
No persisted format or migration change requested. Existing workspaces, histories, drafts, current input and selected workspace must be preserved. No resets or deletion authorized. This input capability must preserve existing validation and launch/save persistence behavior; data volumes are immaterial to this bounded change.

## External Contracts And Dependencies
Existing Electron native dialog bridge returns path/canceled/error; local-node/mobile eligibility is established product behavior. Installed user version is unknown; source evidence is not a packaged runtime reproduction.

## Supplemental Artifacts
| Absolute path | Purpose / related IDs | Status / approval |
| --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md | Normative affected UI; REQ-001..005, AC-001..008 | Approved UCONF-001; included in R3 basis |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/visual-references/manifest.json and VIS-001..012 in same directory | Normative app visual references; REQ-005 / AC-008 | Approved UI basis; verified hashes |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/user-confirmation.md | Exact UI approval and limitations | UCONF-001; not canonical R3 approval |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-handoff.md | Completed Product result/provenance | Completed; non-production delivery |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/final-validation.md; ui-behavior-test-matrix.md; integration-record.md; ui-reference-runbook.md; product-ticket.md | Supporting evidence and lifecycle | Product-owned; browser/reference limits retained |
The complete supporting inventory, including baseline/review evidence, is in investigation-notes.md. Historical drafts are evidence, not current authority.

## Assumptions And Open Decisions
- ASM-001: Current checked-out integration source is the intended repair target; exact installed user build not verified. Does not block source-level restoration proposal.
- DEC-001: Explicit approval of reconciled R3 + approved Product UI supplement remains pending. Product UI review is complete, not reopened.
- No technical design or implementation is approved by this document until explicit response is recorded; routing follows completed design.

## Traceability
| REQ | Use cases | Behaviors | AC | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001,002 | BEH-001 | AC-001,002,003 | SCN-001,002 |
| REQ-002 | UC-003 | BEH-002 | AC-004,007 | SCN-003 |
| REQ-003 | UC-001,002 | BEH-003 | AC-003,005 | SCN-001,002,004 |
| REQ-004 | UC-001,002,003 | BEH-004 | AC-002,006,007 | SCN-002,003,005 |
| REQ-005 | UC-001,002,003 | BEH-001..004 | AC-003,005,008 | SCN-001..005 |

## Architecture Phase Input
Canonical R3 approval pending. After approval map SCN-001..005/BEH-001..004 to the actual shared-menu callers/native picker path, preserving eligibility, locks and deferred apply/save/launch. Production helper currently collapses failure and cancellation; approved UI needs distinct outcomes. Engineering owns the proportionate technical realization, not reference adapters or simulated browser dialog. Native open/select/cancel needs a source-current isolated Electron build; no tests against the user's running app/data. Investigate lifecycle/pending interactions after the architecture reading gate. No persisted-data format change or migration requested.

## Readiness Check
Current behavior evidenced: Yes. Desired/preserved behavior explicit: Yes. Scope/non-goals clear: Yes. Stable testable traceability: Yes. Supported scenario basis: Yes. Product approval/spec/source/final references mutually consistent: Yes. Supplemental/illustrative boundaries and validation limits visible: Yes. No material UI decision remains. Content Ready for Approval: Yes.

Canonical R3 requirements approval received: **No**. Approved UI supplement received: **Yes**, UCONF-001. Approved complete basis ready for architecture: **No**, pending DEC-001. Architecture spec, task-size/risk, independent review, implementation and native validation: N/A — not applicable yet.
