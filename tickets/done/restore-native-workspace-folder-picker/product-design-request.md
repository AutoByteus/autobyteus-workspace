# Product Design Requested — Native Workspace Folder Selection

## Result And Identity
- Classification: Product Design Requested
- Purpose: New Request
- Package identifier: restore-native-workspace-folder-picker
- Current solution revision: SR-004; requirements R2 Draft (no approved baseline)
- Date: 2026-10-07
- Requested outcome: Product Team works on the UI first, before architecture/implementation.

## User Request
Original: Changing workspace in Chat and Agent, Agent Team and Agent Organization run configuration now only permits a string input. Earlier in Electron the user could open the native file explorer to choose a folder; restore that experience.
Follow-up verbatim: “send to @Product Team to work on the UI first. thanks”. After interrupting a read-only tool turn, user reiterated “delegate a task there”. No handoff had been sent in the interrupted turn.

## Focused Product Work
Work with the user on the focused folder-selection UI across Chat/Agent/Team setup, Org setup and currently editable placed-Team workspace controls. Determine how native folder browsing is discovered, its relationship to manual path entry and applying a selection, and cancel/error/retry feedback. Keep the current product context rather than assuming the retired run forms still exist. Product owns its mode, repository, ticket, design artifacts and review procedure; this request does not choose them.

The Solution Designer's earlier suggestion (Browse beside path input → choose directory → fill path → Use folder) is **unapproved**. It is an option, not a required design. User has requested UI work instead of approving that proposal. Ask for/record explicit user confirmation of final intended UI through Product's workflow; return any unresolved or proposed behavior changes clearly, not as implied approval.

## Evidence And Current Product Context
Source investigation at the base below (no runtime reproduction):
- `autobyteus-web/components/chat/ChatWorkspaceMenu.vue`: current shared picker has search/existing/temp options and Open another folder → absolute-path input, but never calls Electron's picker.
- `components/chat/ChatNewSurface.vue`: Agent/Team setup is now in New chat. `components/run-settings/RunSettingsCard.vue`, `OrgLaunchPage.vue`, `RunMemberRow.vue`: Org and member settings reuse the same menu.
- Old `components/workspace/config/WorkspaceSelector.vue` at `d45fe62bc^` had gated native Browse. Run-settings unification (`d45fe62bc`, 2026-10-05) retired it; shared menu omitted native browsing.
- `composables/useNativeFolderDialog.ts`, `electron/preload.ts`, `electron/application/electronApplication.ts`: native directory dialog remains available.
- `utils/mobileFeatureGates.ts` / `stores/windowNodeContextStore.ts`: local folder picking is for embedded local Electron, not remote nodes or mobile.
- `components/applications/setup/ApplicationWorkspaceRootSelector.vue`: existing related native Browse example, not a mandate to copy its UI.

## Scenario And Requirement Context
SCN-001: Agent/Team user chooses local workspace before starting. SCN-002: Org root or currently editable placed-Team override chooses workspace. SCN-003: browser/remote/mobile uses manually entered server-side path. SCN-004: cancel/no-path/failure does not lose selection or typed input. SCN-005: existing/temp/search/known-path reuse and pending new-folder behavior remain.
Relevant IDs: BEH-001..004, UC-001..003, REQ-001..004, AC-001..007. Read canonical requirements for the proposed baseline; its Product-first direction explicitly makes R1 UI details non-authoritative.

## Established Constraints And Non-Goals
- Preserve manual absolute-path entry and existing/temp search/selection.
- A local desktop chooser cannot browse a remote backend filesystem; preserve current local-only eligibility. Do not introduce remote/mobile/browser native browsing under this restoration.
- Preserve current saved-run locks and editability; no automatic run start, send, workspace registration or save merely from browsing.
- Cancel/no-result must not erase current selection or input; keep manual fallback usable.
- No data/history resets, persistence redesign, migration, unrelated app redesign or release/deployment work.
- Exact final interaction, control placement and copy remain Product/user decisions. Escalate any material change to the boundaries for explicit user approval.

## Expected Returned Result
Return durable Product-owned artifact paths, reviewable UI references, scenario/state coverage, decisions and explicit user-confirmation reference when obtained. Where a final UI/UX package applies, include its specification, source/revision pin, final visual references and declared illustrative content/mocked boundaries. If review remains pending or blocked, state that precisely. Return to Solution Designer for canonical requirements reconciliation/approval and then architecture; this is not implementation authorization.

## Canonical Artifacts
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/requirements-doc.md
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/investigation-notes.md
- Solution revision history: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/solution-revision-record.md
- This handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/product-design-request.md
- Design spec, architecture review, implementation and validation artifacts: N/A — not applicable yet.
- External Product artifacts: pending requested work, remain Product-owned.

## Workspace And Source Basis
- Software task worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker
- Branch: codex/restore-native-workspace-folder-picker
- Refreshed base: origin/personal @ 88fad73cbd20201642acdcfe75e69b1897ec135c
- Eventual software finalization target: origin/personal, no release requested.
- Shared source checkout: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo (unrelated changes; do not author there).
- This context does not prescribe Product's repository/bootstrap lifecycle.

## Open Risks / Evidence Limits
No code changes, tests or user-app interactions. Installed version/OS/node binding unknown. Source omission is evidenced; actual native behavior must later be proven with an isolated source-current desktop build, not the user's installed app or browser mocks. Requirements and exact UI are not approved; no architecture begun. No external blocker to starting Product UI work.

## Historical Route Attempts (SR-002; superseded)
The following records preserve previous attempts, not current routing authority. The earlier statement that a missing configured Product rule prevents an explicit user-directed delegation is superseded by SR-004 below.

`get_handoff_rules` returned only Architecture Design Complete → /architecture_reviewer (Large/High), Architecture Design Complete → /implementation_engineer (Small/Medium and Low), and Delivery Receipt Evidence Gap → /delivery_engineer. None matches Product Design Requested. No Product recipient was returned.

Dispatch status: Not sent. The user supplied /product_team explicitly, but the required result-based routing protocol supplies no applicable cross-team Product route and requires returning the result to the caller when none matches. Do not substitute delegate_task or misclassify this as implementation-ready to bypass routing.

Routing blocker: User/External Prerequisite — enable the Product Design Requested cross-team handoff to /product_team, then re-read this package, refresh rules and send it with this file attached. UI request itself is ready; requirements remain Draft and unapproved. No task or AgentRun was created. Result returned to user with this precise blocker.

### Dispatch Recheck — User “@Product Team go ahead”
User renewed the Product-first instruction on 2026-10-07. Re-read this handoff and current artifact context, then re-ran get_handoff_rules. The same three internal rules were returned; still no Product Design Requested route. No message/delegation was sent and no task/run ID exists. This reconfirms Product-first intent, not approval of the proposed R1 UI or implementation. Prepared brief remains available for Product to receive directly or for dispatch when the cross-team route is configured.


## Current Delegation — SR-004
- User request, verbatim (2026-10-07): “could you delegate a task to @Product Team to work on the UI?”
- User supplied exact collaborator address `/product_team` and explicitly requested `delegate_task`; use delegation, not a duplicate message.
- Purpose remains New Request. This reconfirms Product-first UI work, not approval of the proposed Browse placement/confirmation interaction or production implementation.
- The software source and canonical findings remain at the recorded isolated-worktree base. No new runtime evidence, production changes or behavior-defining supplements.
- Current policy permits explicit user-directed delegation even when no configured rule matches; this is not an architecture-review/implementation-route bypass. Prior missing-route blocker is no longer applicable.
- Expected output and constraints are the focused Product work above. Reply to the assigning Solution Designer run with the durable Product handoff path and review/approval state; do not hand off an unapproved proposal as implementation-ready.
- Dispatch status: Ready; refresh handoff rules before delegation and record its confirmed task/run receipt here.
- Lifecycle: follow up only using the returned target_agent_run_id. Mark returned task_id DONE after the delegated UI work is finished, not at dispatch or while review is pending.

### SR-004 Rule Decision
Fresh get_handoff_rules returned Architecture Design Complete → /architecture_reviewer (Large/High), Architecture Design Complete → /implementation_engineer (Small/Medium, Low), and Delivery Receipt Evidence Gap → /delivery_engineer. No rule matches Product Design Requested. Proceed with the explicitly requested delegate_task to canonical /product_team; none of the internal route recipients should receive this outcome.


### SR-004 Confirmed Delegation Receipt
- Tool: delegate_task; recipient_address: /product_team
- Success: target_kind=team
- target_agent_run_id: product_ui_ux_designer_f1b47b534b5e4da49ef50e43e23fbef3
- task_id: ad_hoc_task_45079b88-f602-4945-a4a3-57627cd9762e
- Full Product request and canonical artifact references were delivered by delegation; no duplicate message sent.
- Work is dispatched, not completed. Await Product's result; all follow-up uses the exact run ID above. On completed delegated work, call create_or_update_task with this task_id and status DONE. Do not close the Task while Product review/work remains pending.


## Completion Update — SR-006
Product UI work completed and approved UCONF-001; earlier review/worktree/live-preview states above are historical. Current durable Product paths, reconciliation and delegation closure are in product-completion-reconciliation.md. R3 requirements Ready for Approval; no architecture/implementation authorization yet.
