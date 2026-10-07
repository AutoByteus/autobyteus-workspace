# Investigation Notes

## Investigation Meta
- Package identifier: restore-native-workspace-folder-picker
- Repository mode: Git
- Workspace root / task worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker
- Branch: codex/restore-native-workspace-folder-picker
- Resolved base: origin/personal @ 88fad73cbd20201642acdcfe75e69b1897ec135c
- Finalization target: origin/personal; no release/deployment requested.
- Bootstrap result: Success. Refreshed `git fetch origin personal`; created isolated branch/worktree from refreshed tracked integration branch (also origin/HEAD). Shared checkout has unrelated modifications and remains untouched.
- Bootstrap blocker: None
- Current solution revision: SR-007
- Authorities read (2026-10-07): solution-designer SKILL; requirements-engineering reference; requirements, investigation, revision templates; root AGENTS.md, DESIGN.md, TESTING.md; autobyteus-web/AGENTS.md. No more deeply nested web AGENTS.md found.
- Investigation status: R3 approved UREQ-001; Architecture Design Complete, Small / Low

## Initial Request And Clarifications
User: In the Chat page changing workspace now permits string input only. Same issue in Agent, Agent Team, Agent Organization run configuration forms. Earlier Electron could open the native file explorer to choose a folder. Please help.
No clarifications yet. No screenshot or runtime attachment provided. Exact installed version, OS and selected node not yet established.

## Source Log
- `git status --short --branch`, remote/tracking configuration, origin/HEAD, worktree list: shared root is personal with unrelated changes; no matching existing ticket/worktree found.
- `git fetch origin personal && git rev-parse origin/personal && git worktree add -b codex/restore-native-workspace-folder-picker /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker origin/personal`: succeeded at the base above.
- Existing historical package located: `tickets/done/simplify-agent-workspace-to-path-string/` (to inspect).

## Product Design Request Context
Product Design request: Present. On 2026-10-07 user asked “send to @Product Team to work on the UI first. thanks”, then reiterated “delegate a task there”. Purpose: New Request. No Product mode or repository prescribed.

## Runtime, Probe, Or Reproduction Findings
No runtime test performed. Do not test against the user's running app/data. Source investigation only so far.

## Supplemental Artifact Inventory
None yet.

## Architecture Investigation Findings
Not started; explicit requirements approval required first.

## Requirements Discovery Findings (R1 / SR-001)

All source paths below are relative to the isolated worktree recorded above, unless a historical revision is specified. Commands were run on 2026-10-07. No tests or live app interaction were performed.

### Source Log And Factual Technical Inventory
| Evidence ID | Exact source / command | Observation |
| --- | --- | --- |
| EV-001 | `autobyteus-web/components/chat/ChatWorkspaceMenu.vue` | `startFolder` only reveals a text form, clears draft/error and focuses input. No native helper, bridge or eligibility call. `confirmFolder` validates absolute path, reuses known workspace or emits pending folder choice, closes menu. |
| EV-002 | `autobyteus-web/components/chat/ChatNewSurface.vue`; `components/run-settings/{RunSettingsCard,OrgLaunchPage,RunMemberRow,ExistingRunSettings}.vue` | Agent and Team launch configuration now uses New chat. Org root and member rows use shared card/menu. Saved-run root workspace is locked; member workspace is editable only for Org where canEdit permits it. |
| EV-003 | `autobyteus-web/composables/useNativeFolderDialog.ts`; `utils/mobileFeatureGates.ts`; `stores/windowNodeContextStore.ts` | Native helper still exists. Null for cancel/no path/throw. Helper hardcodes embedded eligibility, so callers must check real node context. Canonical feature gate requires embedded node, Electron folder API and non-mobile runtime. Window context derives embedded from node ID. |
| EV-004 | `autobyteus-web/electron/preload.ts:119-120`; `electron/application/electronApplication.ts:318-328`; `types/electron.d.ts` | Existing showFolderDialog → show-folder-dialog IPC → showOpenDialog with openDirectory; returns first directory, canceled/null, or canceled/null/error. Native machinery has not been removed. |
| EV-005 | `git show d45fe62bc^:autobyteus-web/components/workspace/config/WorkspaceSelector.vue` (Browse at lines 79-89, eligibility 168-171, handler 386-394); `git log -6 --oneline -- autobyteus-web/components/run-settings` | Former form selector provided native Browse with same local/mobile gate. `d45fe62bc` (2026-10-05, run-settings unification) replaced retired form controls with the shared Chat menu. The form regression is explained by replacement losing that capability. This does not establish the user's installed version. |
| EV-006 | `autobyteus-web/components/applications/setup/ApplicationWorkspaceRootSelector.vue`; `composables/useWorkspaceHistoryWorkspaceCreation.ts` | Other current UI owners still use existing picker capability; application custom-path input provides Browse. Sidebar creation uses a different immediate-creation workflow, outside this repair scope. |
| EV-007 | `autobyteus-web/services/workspace/runWorkspaceChoice.ts`; `docs/agent_execution_architecture.md:1035-1075` | Existing/folder union is shared; known path is reused; folder creation belongs at existing launch resolution. Browsing must not change this lifecycle. |
| EV-008 | `autobyteus-web/components/chat/__tests__/ChatWorkspaceMenu.spec.ts`; `utils/__tests__/mobileFeatureGates.spec.ts` | Shared menu tests observed cover search, keyboard and placement, but not native browsing. Gate has existing coverage. Read only, not executed. |
| EV-009 | `tickets/done/run-settings-ui-unification/design-spec.md` retirement inventory; related requirements snippets | Historical unification intentionally retired Agent/Team/Org forms and WorkspaceSelector in favor of ChatWorkspaceMenu, and retained workspace choices/locks. Historical approval does not approve new R1. |
| EV-010 | `tickets/done/simplify-agent-workspace-to-path-string/{requirements.md,investigation-notes.md}` | Earlier backend/core runtime path-string change is unrelated to this frontend native input omission; not the root-cause claim. |

Discovery queries included `rg -n 'showFolderDialog' autobyteus-web`, `rg -n 'ChatWorkspaceMenu' autobyteus-web`, and `git log -5 --oneline -- autobyteus-web/components/chat/ChatWorkspaceMenu.vue`. The code comparison is sufficient to establish source-level missing integration, not native-runtime behavior on every OS.

### Supported Behavior Evidence
- BEH-001 / SCN-001,002: user explicitly requests native explorer choice in Chat and Agent/Team/Org configuration; current shared owner lacks it and predecessor proves it was supported in forms (EV-001,002,005).
- BEH-002 / SCN-003: existing product disallows local picker for remote/mobile contexts (EV-003,005,006). Do not broaden to remote filesystem browsing.
- BEH-003 / SCN-004: native cancel/error is explicitly represented by the bridge/helper contract (EV-003,004); proposed non-destructive form outcome awaits R1 approval.
- BEH-004 / SCN-005: selection/search and deferred registration remain supported; never treat an internal picker call as authority to auto-launch (EV-001,007).

### Structural And Payload Surface Inventory
Runtime surfaces: one shared Vue workspace menu, current settings callers, node context store, mobile capability policy, native helper, preload/IPC/main dialog. Existing capabilities already supply folder selection. Payloads: existing/folder run workspace choice and picker path/canceled/error result. Localization label will be needed. No demonstrated need for API, persisted schema, security-boundary, deployment, migration or ownership-boundary changes. Exact design/classification deferred until approval and architecture phase.

### Persisted Data And State Facts
Workspace registration and run launch/save already have owners; picker returns a local absolute path only. No persisted-data modification intended. Existing workspace IDs/paths, histories, draft input and current selection must not be reset. No user data read or modified during investigation.

### Runtime And Verification Limits
No reproduction in the user's app (prohibited testing target per TESTING.md), no modified build, no tests executed. Source-level root cause high confidence. Exact installed version/OS/remote binding unverified. Downstream verification needs an isolated source-current desktop build and actual native open/select/cancel, plus component eligibility/regression cases; mocks or browser-only checks cannot prove OS dialog behavior.

### Assumptions, Unknowns And Risks
- U-001: Actual installed app revision and node context unknown. Repair targets refreshed origin/personal; report source finding honestly.
- R-001: Native chooser can only browse desktop-local filesystem; preserve remote/mobile exclusion.
- R-002: Helper currently collapses errors and cancel to null; manual fallback and preservation must hold. Avoid unrelated helper-wide behavior change without design justification.
- R-003: Restoring selection in shared control must not bypass saved-run locks, cause early workspace registration, or alter which draft/member is updated.
- R-004: Changed-build native proof and multiple caller coverage remain downstream obligations; no certification claim from source reads.

### Product / Supplements at SR-001 (historical)
At SR-001 Product request was not stated; external UI/UX fields were N/A. No behavior-defining supplements. `requirements-doc.md` R1 contains proposed interaction explicitly. `solution-revision-record.md` indexes SR-001; neither historical tickets nor evidence are user approval.

### Requirement Implications / Notes For Architecture
Restore native browsing as an optional input aid while keeping current form confirmation, manual absolute-path entry, context policy, workspace resolution and locks. User approval pending. Architecture investigation/design has not begun; classification is N/A before completed design.


## SR-002 — Explicit Product-First Request
- User request: “send to @Product Team to work on the UI first. thanks”, reiterated after an interrupted read-only turn as “delegate a task there”.
- Focus: restore a discoverable native-folder-selection experience in Chat and Agent/Team/Org setup; determine the focused UI before implementation.
- Approval: no R1 approval given. Exact Browse placement and fill-then-confirm sequence remain proposals, not Product constraints.
- Related IDs: BEH-001..004, SCN-001..005, REQ-001..004, AC-001..007.
- Established constraints: local desktop versus remote filesystem distinction, preserve manual entry and current locks, cancellation/data continuity and existing launch/save semantics. Changes to intended behavior require user confirmation.
- Product-owned mode, design repository/ticket and artifacts: not chosen here; pending Product work.
- Canonical supplement: `product-design-request.md` (Solution Designer; New Request context; same focused scope; no new behavior approval).
- Current source findings EV-001..010 remain unchanged; no code changed, runtime tests or architecture work performed.


## SR-003 — Resumed Request / Evidence Confirmation (2026-10-07)
- Incoming request restates the original missing native-folder-picker report in Chat and Agent/Team/Org configuration. No approval or new Product instruction is present in this turn.
- Located and read the existing canonical requirements R2, investigation, SR-001/002 history and product-design-request.md before acting; reused the isolated task workspace. Did not create a competing package or overwrite historical records.
- Revalidated HEAD and origin/personal at 88fad73cbd20201642acdcfe75e69b1897ec135c. Branch remains codex/restore-native-workspace-folder-picker; only ticket documents are untracked; production source unchanged. Existing-worktree reuse, no new branch/base resolution.
- Re-read current ChatWorkspaceMenu.vue, native picker helper, current caller references in ChatNewSurface and RunSettingsCard, existing Electron IPC/main handler and predecessor WorkspaceSelector at d45fe62bc^. Findings EV-001..005 remain supported: path form has no native picker call; native bridge exists; predecessor had Browse. This is source confirmation, not reproduction in the user's installed app.
- Reading gates this turn: solution-designer SKILL.md; references/requirements-engineering.md in full; requirements, investigation and solution-revision templates; root AGENTS.md and TESTING.md in full; autobyteus-web/AGENTS.md. No deeper package AGENTS.md found. Architecture gate not entered; no technical design or implementation performed.
- Prior recorded Product-first direction is not silently revoked by the repeated original request. Ask user whether to approve focused restoration or retain Product UI review first. No explicit approval is inferred.
- Existing routing notes are historical results, not a fresh tool result or a current routing prohibition. No new delegation/message or rule lookup was performed during this routine user-decision hold.
- Scenario scope and intended behavior unchanged; no tests, application interaction, persisted user data changes or production edits.


## SR-004 — Explicit Product Delegation
User explicitly requested `delegate_task` to `/product_team` for UI work. Requirements reading gate was read in full in this conversation; existing canonical documents and handoff reread before dispatch. No source/behavior changes or new approvals. The focused task context is persisted in product-design-request.md; its former route-blocker statements are historical and superseded. Apply current rules and explicit user delegation, record exact returned task/run identities, and close the Task only after work completes. Product owns its mode, design repository and artifacts.


## SR-005 — Product Interim Result Received
- Read incoming /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/product-handoff.md first, then review-round-1.md, ui-behavior-test-matrix.md, ui-reference-runbook.md, baseline-reevaluation.md and product-ticket.md. Requirements reading gate already read in this conversation; canonical requirements/history reread before recording result.
- Stable package matches; returned source basis SR-004/R2 Draft. Product run product_ui_ux_designer_f1b47b534b5e4da49ef50e43e23fbef3. Outcome explicitly Awaiting User Review; confirmation None. No final UI/UX spec or normative references, no Product integration yet. This is an honest interim result, not a defective approved package needing correction.
- Product design canonical root /Users/normy/autobyteus_org/autobyteus-web-design; active reference /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker; branch design/restore-native-workspace-folder-picker; accepted base 8cd41f886459630909e827d7df1b67910618aaac; review UI a677e01558b2b9d48253950bc2b8db821358625a. Read-only git show confirms this revision exists. Software branch/head unchanged.
- Recommendation: Browse beside manual path within Open another folder; choose fills then Use folder applies. No destructive cancel/empty; visible inline invocation failure, retry/manual fallback, pending disabled controls and specified focus recovery. Same local eligibility and saved-run locks. Refinements remain unapproved; no source/architecture choices inferred from reference adapters.
- Product reports browser journeys for Agent/Team/Org/placed-Team, saved locks, context/narrow/keyboard and alternate states. Build/configured checks pass; extra full-root vue-tsc stack overflow is unresolved, not a passing static check or established pre-existing issue. English reviewed; Chinese rendered layout not independently reviewed. Saved-Org fixture duplicate-row limitation retained.
- Chooser/filesystem/backend/host contexts are synthetic; no actual native dialog, Electron bridge, permission, persistence, run launch or real mobile keyboard proof. Solution Designer did not rerun Product validation or interact with user app.
- Earlier broad baseline refresh/fixture rewrite withdrawn by Product after scoped provenance review; Bootstrapper not resumed. Reuse is focused, not whole-app parity certification.
- Task ad_hoc_task_45079b88-f602-4945-a4a3-57627cd9762e stays open; user review and final Product output outstanding. Future follow-up uses exact Product run ID.

### Historical SR-005 External Supplement Inventory (superseded by SR-006 durable locations)
| Absolute artifact | Purpose | Related IDs | Status / approval |
| --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/product-handoff.md | Interim result, source pin, boundaries | REQ-001..004, AC-001..007 | Awaiting User Review; unapproved |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/review-round-1.md | Proposed behavior, alternatives, non-normative images | REQ-001..004, AC-001..007 | User review pending |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/ui-behavior-test-matrix.md | Browser/command evidence and limits | AC-001..007 | Evidence only; no production pass |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/ui-reference-runbook.md | Review navigation, simulated boundaries, owned process | SCN-001..005 | Supporting evidence; not approval |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/product-ticket.md | Product repository/task/status identity | All in-scope IDs | Interim record |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/baseline-reevaluation.md | Scoped reuse/provenance, withdrawn broad refresh | BEH-001..004 | Supporting evidence |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/scoped-baseline-check.json | Product static baseline comparisons | BEH-001..004 | Linked supporting evidence, not independently rerun |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/ui-baseline-report.md | Historical baseline report | Preserved BEH-004 | Historical supporting authority; not approval of this change |
| /Users/normy/autobyteus_org/autobyteus-web-design-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/review-evidence/ | Review screenshots/logs | AC-001..007 | Non-normative; browser-only evidence |

Next: user feedback/confirmation on Product round 1, Product finalization and canonical requirements reconciliation. No architecture or implementation authorization.


## SR-006 — Approved Product Package / Requirements Reconciliation
- Authorities: requirements gate/template files already read in this conversation. Incoming completed handoff read first, canonical R2/SR-005 and latest investigation/history read before revisions. Root/web AGENTS and TESTING remain applicable. Architecture gate not entered.
- Returned Product Design Completed result: /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-handoff.md; approved spec, UCONF-001, final validation/integration/runbook/manifest read. No final UI decision pending. Native chooser clarification preceded explicit UI confirmation.
- Read-only checks: `git rev-parse HEAD origin/personal design/restore-native-workspace-folder-picker` in canonical design repo returned 15cb0d9be3b8bfdf3a7ee5f7f7862f7a89baa406 for all; `git status --short` empty. `git diff --name-only a677e01558b2b9d48253950bc2b8db821358625a HEAD` contains only ticket artifacts. Python SHA-256 verification matches all VIS-001..012 manifest entries; historical Product worktree is absent. This checks artifact integrity, not rendering/native execution.
- Product source/design/spec/reference identity consistent: source88fad73cbd20201642acdcfe75e69b1897ec135c; design base8cd41f886459630909e827d7df1b67910618aaac; approved UI a677e01558b2b9d48253950bc2b8db821358625a; artifact integration10d10419a1dd804204e52512044d4e0b8909f5dd; closure15cb0d9be3b8bfdf3a7ee5f7f7862f7a89baa406. Product cleanup/process/port verification is reported by Product; not redone. Preview is stopped.
- Final Product spec clarifies retained form/menu Escape closes popover through existing document listener, unlike old round-1 wording. No UI source changed after approval; treat final specification and integration evidence as current authority.
- R3 reconciles native Browse, pending controls, explicit apply, focus/recovery, silent cancel versus visible failure and exact Product fidelity. New REQ-005/AC-008 reference externally owned normative UI rather than duplicate it. Source helper conflates error/cancel, so eventual architecture must realize approved distinction; no implementation choice made now.
- UI approval UCONF-001 is valid for UI supplement only. Canonical R3 full requirements approval remains DEC-001. Requirements Ready for Approval, not Approved. R2 snapshot preserved; earlier history not rewritten. No material scenario or scope expansion beyond approved Product work.
- Limits preserved: synthetic native/filesystem/backend/data/host contexts; no actual Electron/permissions/platform/save proof; full-root vue-tsc stack overflow unresolved; configured tests14/boundary checks13/build narrower passes; Chinese not independently QA-approved; inherited saved-Org fixture duplicate; dependencies unchanged with uninvestigated remote vulnerability summary.
- Owned software workspace/head remains unchanged production source. No technical design, source/test edits or runtime validation done. Product delegated task may now be closed; actual tool result belongs in product-completion-reconciliation.md.

### Current Canonical Supplement Inventory (SR-006)
All Product entries below are externally owned, preserved read-only. Their current paths replace old worktree locations for downstream packages.
| Absolute artifact | Purpose / scope | Related IDs | Status / approval |
| --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md | Normative affected UI, full journeys/states/fidelity/exceptions | REQ-001..005, AC-001..008 | Approved UCONF-001 |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/visual-references/manifest.json and VIS-001..012 images in same directory | Normative final app references; native chrome/fixture content excluded as specified | REQ-005, AC-008 | Approved UI basis; hashes verified |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/user-confirmation.md | Exact UI approval and scope | All UI requirements | UCONF-001, not canonical R3 approval |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-handoff.md | Completed Product result/provenance/limits | All in-scope IDs | Design Completed |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/final-validation.md | Final reference/browser/configured-check evidence | AC-001..008 | Evidence only, no native production pass |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-behavior-test-matrix.md | Round-1 cases reused where unchanged | AC-001..007 | Supporting evidence with explicit limits |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/integration-record.md | Product publication/default-entry/cleanup receipts | Package | Completed; not production deployment |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-ticket.md | Durable Product identity/lifecycle | Package | Completed |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-reference-runbook.md | Canonical runnable root, simulation/reset instructions | SCN-001..005 | Supporting operational context; old preview stopped |
| /Users/normy/autobyteus_org/autobyteus-web-design/ui-baseline-report.md | Historical accepted baseline | BEH-004 | Historical authority only |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/baseline-reevaluation.md; scoped-baseline-check.json | Scoped reuse/correction evidence | BEH-001..004 | No broad refresh/blanket parity claim |
| /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/review-round-1.md; review-evidence/; final-evidence/ | Historical choices, non-normative images/raw evidence | SCN-001..005 | Final spec supersedes draft wording |
| /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/history/requirements-r2-before-product-reconciliation.md | Previous R2 at SR-005 | REQ-001..004 | Archived, not current authority |
| /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/product-completion-reconciliation.md | Owned receipt, R3 reconciliation/approval hold and task closure | SR-006 | Current result context |

Next: present R3 plus approved supplement to user for explicit requirements approval; then complete architecture under its reading gate. Do not replay Product work or call native/browser checks a production fix.


## SR-007 — Architecture Investigation After Explicit Approval
### Approval, Isolation And Reading Gates
User replied “approve” to the R3 scope/technical-design question. Captured UREQ-001 in requirements-approval.md with exact pre-approval R3 hash/snapshot; Product UCONF-001/spec/VIS-001..012 remain approved supplements. No intended behavior changed. Task branch codex/restore-native-workspace-folder-picker remains isolated at88fad73cbd20201642acdcfe75e69b1897ec135c, production source clean, only this ticket untracked. Base/finalization context unchanged.

Read in full before architecture investigation: solution-designer references/architecture-design.md, design-principles.md, task-root DESIGN.md, design-spec template (all under authoritative .codex skills in shared source checkout where needed). Applicable AGENTS and TESTING already read in this conversation. `find autobyteus-web -name 'DESIGN*.md' ...` found no closer web design document. No conflict between general and project principles. A first relative template lookup inside the worktree failed because skills are outside that checkout; absolute/shared skill-root reads succeeded. No workspace prerequisite failed.

### Architecture Evidence (paths relative to task worktree unless stated)
| ID | Exact sources / inspection | Observation | Decision implication |
| --- | --- | --- | --- |
| AE-001 | components/chat/ChatWorkspaceMenu.vue under autobyteus-web; existing EV-001 and fresh caller search | Menu owns ephemeral path/adding/error and uses props workspace plus select event; only confirmFolder trims/validates/maps known workspace/emits. No registration or native call | Extend this one UI owner, retain select contract and existing confirmation |
| AE-002 | autobyteus-web/electron/preload.ts:119-120; electron/application/electronApplication.ts:318-328; types/electron.d.ts:89; electron/types.d.ts:79 | Public showFolderDialog returns `{ canceled, path, error? }`; existing IPC already opens `openDirectory`. Main catches return canceled:true/path:null/error; native success/cancel and promise rejection are distinct available outcomes | No main/preload/type change needed; handle error BEFORE canceled; public bridge supplies complete contract |
| AE-003 | `rg -n 'pickFolderPath|showFolderDialog' autobyteus-web`; useNativeFolderDialog.ts; useWorkspaceHistoryWorkspaceCreation.ts; ApplicationWorkspaceRootSelector.vue | Only current runtime path-only helper consumers are sidebar history (injected through WorkspaceAgentRunsTreePanel) and application selector. Helper deliberately returns path/null, catches errors, and hardcodes embedded flag. It owns no domain state. New menu has no dependency on it | Avoid routing error-sensitive UI through lossy convenience helper; call existing public bridge, not raw ipcRenderer. Do not change unrelated caller semantics or introduce a compatibility wrapper |
| AE-004 | stores/windowNodeContextStore.ts; utils/mobileFeatureGates.ts; popover/useAnchoredPopover.ts | Real isEmbeddedWindow derives nodeId; gate combines embedded, bridge and non-mobile (not viewport width). Binding revision exists. Popover registers capture Escape and outside-click; unmount closes/removes listeners. No blur-close handler | Reuse gate/context; preserve shared popover. Local in-flight flag, form lifetime check and focus after native result are enough; no global manager |
| AE-005 | ChatNewSurface.vue; chatDraftStore.ts:449; services/chat/chatLaunchService.ts:110,169; services/workspace/runWorkspaceChoice.ts | Agent/Team menu select only sets draft workspace; resolution/registration happens on existing Send launch path | Browse/return must only edit local text; Use folder retains draft-only semantics |
| AE-006 | OrgLaunchPage.vue; RunMemberRow.vue; agentOrgLaunchDraftStore.ts:238,291; services/agentOrgExecution/agentOrgLaunchService.ts:27-76 | Root change and placed-Team address-specific override are distinct draft operations; resolution occurs during Org launch and dedupes by choice | Reuse caller bindings; do not copy per-form native handlers or alter Org/member ownership |
| AE-007 | ExistingRunSettings.vue:145-150; workspace/config/ExistingRunConfigEditor.vue:237-249; existingRunConfigStore.ts:352-374,442 | Saved roots locked; member workspace editable only for stopped/editable Org. Shared menu output converted with toWorkspaceSelection into draft, guard checks lifecycle, Save remains separate | No unlocking or bypassing save; ensure tests exercise root locks and correct member change propagation |
| AE-008 | ChatWorkspaceMenu.spec.ts; electron/__tests__/preload.spec.ts; components/run-settings/__tests__/ listing; package.json scripts; electron/vitest.config.ts | Menu coverage is search/keyboard/placement, no native states; preload exposes bridge in mocked Electron test but no folder assertion yet. test:nuxt/test:electron support one-shot Vitest | Add bounded regression coverage and actual isolated native proof; mock tests alone insufficient |
| AE-009 | Approved design repository components/chat/ChatWorkspaceMenu.vue and ui-ux-spec.md, final-validation.md/integration-record.md | Native bridge is simulated; approved UI has one Browse row/pending/error/hints/cancel-focus. Field Escape effectively handled by document capture, closes popover. Final spec accurately clarifies earlier review prose | Reuse approved presentation only, not fixture/dialog/host code or synthetic delay |

### Supported Lifecycle And Rejected Machinery
SCN-001..005 already approved and independently witnessed in user UI/source/predecessor. Native cancellation and invocation failure are explicit SCN-004 contract cases, not test-invented requirements. Pending duplicate-click/Enter guard is explicit REQ-001/AC-003. A dismissed/unmounted form has no result destination (existing outside/Escape/unmount lifecycle); discard its pending reply and avoid moving focus to an unrelated field. This is a bounded callback-lifetime guard, not a new application navigation policy or global cancellation API. Actual desktop modality/event delivery remains validation work; main handler is currently unparented and no assumed app-wide lock is used.

Rejected: changing other two path-only helper consumers, dual result adapters/wrappers, a global dialog manager/queue, IPC redesign, new filesystem browser, restored retired forms, backend/schema changes, polling/retry timers or hidden workspace registration. No unrelated history/catalog reads are needed for Browse. Existing map lookup occurs only at Use folder, as before.

### Persisted State / Runtime Evidence
Not Affected: existing RunWorkspaceChoice existing/folder union, draft setters, resolver and save APIs stay unchanged. New picking/error/form-lifetime state is transient renderer state only. No stored model/serialization/store change; migration investigation/plan N/A. No user data accessed, no current-source test/build/native UI run performed by Solution Designer. Source confidence high; native validation/locale typing risks remain explicitly downstream.

### Architecture Decision Summary
Keep existing public native bridge as host authority and shared menu as UI state owner. One Vue component and two message catalogs change in production; supporting tests/probe/documentation remain within existing boundaries. Path-only helper is not an authoritative workspace lifecycle boundary and the menu does not mix that helper with internals. Exact target is recorded in design-spec.md. Classification to follow completed design, not inferred from size of these notes.

AE-010 follow-up: read autobyteus-web/plugins/20.windowNodeBootstrap.client.ts in full: async Nuxt bootstrap awaits registry and actual Electron getWindowContext, throws on context failure, then initializes node binding before UI; no new bootstrap gate needed. ExistingRunConfigStore.saveAgentOrg passes model/teamWorkspace patches through current saveRunConfig, confirming separate Save ownership. Approved reference form markup inspected for matching control layout/copy and documented Escape capture. No extra runtime test was run.


### SR-007 Completion / Additional Owned Supplements
Completed design-spec.md is Ready: task_size Small, architectural_risk Low. Three production files within existing renderer/localization ownership; existing bridge/result/types, persistence/security/global concurrency/deployment and draft/save/launch boundaries unchanged. Direct public host API is deliberate, not a lossy-helper compatibility path. Full source/contract evidence AE-001..010 and residual native/type/locale validation limits retained. No tests, build or native validation run by Solution Designer.

- requirements-approval.md: Solution Designer, UREQ-001 user “approve”, R3/supplement scope, preapproval SHA-256; approved behavior reference for REQ-001..005/AC-001..008.
- history/requirements-r3-as-presented.md: archived exact R3 reviewed by user; not a competing current authority.
- design-spec.md: technical solution, Ready, actual scope/classification and future checks.
- solution-handoff.md: cumulative Architecture Design Complete result, absolute canonical/Product paths, route and dispatch receipt.
All these files are under this canonical software ticket directory. Product task is already DONE; do not reactivate it without an actual Product revision need. Current expected action after configured handoff is implementation with self-checks and later executable/native validation, not more requirements approval.
