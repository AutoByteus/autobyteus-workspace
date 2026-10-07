# Architecture Design Complete — Native Workspace Folder Picker

## Identity / Outcome
- Package: **restore-native-workspace-folder-picker**; current solution revision **SR-007**.
- Requirements **R3 Approved UREQ-001**; Product UI approved UCONF-001; design **Ready**.
- Completed classification: **task_size Small; architectural_risk Low**.
- No implementation, engineering test execution, native verification or delivery completion claimed.

## Original Request / Goal
User reports workspace changing in Chat and Agent/Team/Org run configuration only permits string input; older Electron UI could open the native file explorer to select a folder. Restore that capability without losing manual entry. User explicitly delegated Product UI work first; Product completed its approved design and its delegated task is DONE. User then replied **“approve”** to the reconciled R3 scope and technical-design/implementation-routing question.

## Approved Scope
Every currently editable shared workspace control offers Browse beside the input on local embedded Electron outside mobile runtime. Actual native directory choice fills text only; Use folder validates/applies via existing setting owner. Preserve typing, known/temp/workspace search, deferred registration, correct root/member destination, saved-run locks and launch/save/data semantics. Opening disables Browse/Use folder; cancel/empty silent and non-destructive; invocation failures distinct inline error/retry/manual fallback; approved focus/copy/visual/responsive behavior. Browser/remote/mobile remain manual-only. No new persistence/backend feature, retired-form restoration, global dialog policy, remote browser or release.

## Approval Basis
UREQ-001: user “approve”, 2026-10-07, following the SR-006 request listing native Browse/choose/Use folder, safe cancel/error/retry, manual/local-only eligibility and existing locks/save behavior. Exact preapproval requirement snapshot/hash in requirements-approval.md. Includes R3 REQ-001..005, AC-001..008, SCN-001..005, BEH-001..004 and approved Product UI supplement below. No behavior changed during design.

## Technical Result / Evidence
Source unification dropped Browse from one shared control; native bridge is still complete. Implement the approved presentation and guarded `window.electronAPI.showFolderDialog()` call in ChatWorkspaceMenu plus five English/Chinese message keys. Existing public bridge already returns `{canceled,path,error?}`; check error presence before canceled (main failure also returns canceled:true), handle rejected Promise, preserve text/choice and restore proper focus. No raw native errors in user copy. Existing path-only helper loses failures and serves two other workflows; do not change it or introduce a compatibility wrapper. Public bridge, not that stateless convenience, is host authority.

Only form confirmation emits existing RunWorkspaceChoice; current Agent/Team Chat draft, Org root/member draft and saved-Org configuration owners remain in charge. Include modest local pending/form-lifetime guards, not a global manager. Production changes are one Vue file and two catalogs; supporting tests/caller/preload/native validation within existing test boundaries. Evidence AE-001..010 and full design detail in canonical artifacts. No API/IPC/main/type/schema/security/global concurrency/deployment/owner boundary change. Persistence Not Affected. Root cause Local Implementation Defect; no structural refactor.

## Canonical Software Artifacts (absolute)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/requirements-approval.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/solution-handoff.md` (this file)
- Historical request/receipts: same ticket `product-design-request.md`, `product-review-receipt.md`, `product-completion-reconciliation.md`, `history/requirements-r2-before-product-reconciliation.md`, `history/requirements-r3-as-presented.md`. Current authority is requirements-doc.md, not archived status/preview text.
- Independent architecture/code review artifacts: **N/A — not applicable** on the proposed Small/Low direct route, pending actual rule decision. Implementation handoff and executable validation artifacts: **N/A — not produced yet**, owned downstream.

## Approved Product Package (external ownership retained)
Canonical runnable root `/Users/normy/autobyteus_org/autobyteus-web-design`, normal `/chat`; historical preview is stopped and authoring worktree removed. Use runbook, not a dead URL.
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-ux-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/user-confirmation.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/visual-references/manifest.json` and **VIS-001..012** images in that directory
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/product-ticket.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/final-validation.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-behavior-test-matrix.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/integration-record.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/ui-reference-runbook.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/baseline-reevaluation.md`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/scoped-baseline-check.json`
- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/restore-native-workspace-folder-picker/review-round-1.md`, `review-evidence/`, `final-evidence/` under this ticket
- `/Users/normy/autobyteus_org/autobyteus-web-design/ui-baseline-report.md`

Product UCONF-001; approved UI source `a677e01558b2b9d48253950bc2b8db821358625a`; accepted design base `8cd41f886459630909e827d7df1b67910618aaac`; integration `10d10419a1dd804204e52512044d4e0b8909f5dd`; final artifacts `15cb0d9be3b8bfdf3a7ee5f7f7862f7a89baa406`. Twelve screenshot hashes and unchanged post-approval UI source verified on receipt. All affected app-control appearance/copy/interactions normative except explicit spec variation (invented data, OS chrome, unrelated surrounding surfaces). Do not import prototype HTML dialog/adapters/fixtures/synthetic delay into production.

## Workspace / Base / Finalization
- Isolated software workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker`.
- Branch `codex/restore-native-workspace-folder-picker`.
- Existing bootstrap refreshed base `origin/personal@88fad73cbd20201642acdcfe75e69b1897ec135c`; HEAD unchanged during solution work.
- Eventual finalization target `origin/personal`; no release/deployment requested. Shared checkout has unrelated changes; do not author there.
- Current solution documents untracked in owned ticket, ready for implementation branch history; no production modifications by Solution Designer. Do not discard task documents or user/unrelated work.

## Validation / Risks / Escalation
No blocker to implementation. Current source omission established, user's installed version not reproduced. Product reference tests/build are not production native proof: simulated chooser/context/backend, full-root extra vue-tsc stack overflow unresolved, narrower configured checks passed; Chinese copy authored but QA incomplete; no native/platform/permissions/save durability certification. Remote dependency vulnerability summary uninvestigated, dependencies unchanged.

Implementation must self-check supported UI and preserve fidelity. Subsequent API/E2E must maintain durable regression coverage and validate actual native open/select/cancel through a source-current **isolated** Electron build, never installed user app/data. Include actual Agent/Team/Org/member binding/locks, typed-path/context matrix, error+canceled and rejection, pending duplicate/Enter guards, cancel state/focus, known-path reuse, no browse-triggered registration/send/save, desktop/narrow/locale views and owned cleanup. Tests may model error/empty returns but label boundary limitations. TESTING.md governs layers; model inference is unnecessary for selection/setup checks. Delivery still owns integrated verification and explicit user confirmation.

Return Design Impact before material IPC/main/window ownership/global coordination/persistence/helper-consumer change. New behavior/policy is Requirement Gap requiring renewed approval. Do not expand a Small/Low route silently.

## Expected Next Output
Implementation against approved requirements/design, implementation-scoped evidence/rendered fidelity and durable implementation handoff; then normal configured validation/delivery routes. Rule lookup and exact dispatch receipt follow. Stop solution authoring after required handoff succeeds.

## Applied Handoff Rule
Fresh get_handoff_rules selects the single matching condition: Architecture Design Complete with task_size Small and architectural_risk Low → exact recipient **/implementation_engineer**. Independent architecture review **N/A — not applicable** under this route. This skips independent review only, not design, implementation self-checks, executable/native validation or delivery/user verification. Other returned architecture-review/delivery-gap conditions do not apply. Dispatch via send_message_to with this file attached; no delegation or duplicate recipients.

## Confirmed Dispatch Receipt
send_message_to returned accepted:true, code:DELIVERED to /implementation_engineer; target_agent_run_id **implementation_engineer_193b5f16868c49ad99c05bb6976f6e30**. This file and canonical approved requirements/approval/evidence/design/history plus key Product artifacts were attached. Solution work stops after this confirmed handoff; no polling or implementation performed by Solution Designer.
