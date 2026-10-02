# SR-004 — Task tools + approved Projects/Tasks UI: bounded requirements result

## Package, workspace and phase
- Package PROJ-TASK-MANAGER-20261002-001; ticket project-task-manager-foundations; date 2026-10-02.
- Outcome: **Ready for Approval — proposed bounded requirements**. Scope/manual UI direction explicitly approved; complete SR-004 baseline not yet approved. No authoritative architecture, implementation or production delivery.
- Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`; branch `codex/project-task-manager-foundations`; source base refreshed `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`; finalization target origin/personal. Previous docs checkpoint 72c14fa842ab13a82889060732b89bcd416b4e43. Only owned docs changed, no push/merge/release/source/runtime/feature-toggle changes.

## Request and authoritative corrections
Original request: continue experimental Projects/Tasks under default-off flag; enable an eventual task manager to discover collaborators, create/progress/complete Tasks and delegate independent work through existing collaboration; ask Product for UI brainstorming.

Latest user sequence, durable in investigation-notes.md E-023:
1. SD-CF-001: **User himself creates the Project Task Manager/team in the separate agents project. It is outside this ticket.** Ticket supplies task tools; delegate_task already exists.
2. SD-CF-002: user briefly requested additional left-side workspace/run-history brainstorming and eventual release of task-working Agent/Team resources after Done.
3. SD-CF-003: user deferred this left-side UI work and prioritized tools.
4. SD-CF-004: user explicitly also defers safely stopping resources, and explicitly includes the **previous small UI updates in Projects/Tasks**. This is the current authority; no new sidebar handoff was sent before deferral.

Do not re-ask Manager-vs-Team or mistake deferring left-side run history for revoking the approved manual UI. Do not treat the earlier resource-cleanup thought as authorization to stop hosts/workers or erase history.

## Proposed bounded behavior for complete approval
- Agent-facing Project/Task discovery/lookup/read and durable Task creation in an existing identified Project, stable IDs, required trimmed description and initial TODO.
- Explicit scoped business status setting among TODO/IN_PROGRESS/DONE. Generic caller-controlled values allow explicit reset/reopen; same-state retry is harmless/idempotent. Reject invalid state/unknown or mismatched identities without unrelated writes. Update metadata only for meaningful status change, preserve description/identity/createdAt and unrelated Project data.
- Opt-in first-party native and Agent Tools MCP capabilities with equivalent results/errors; no automatic tools on unrelated agents or hardcoded Manager role. Existing discovery/delegate_task/send_message_to reused unchanged.
- Keep experimental ENABLE_PROJECTS default false and installation untouched. Proposed continuity is existing visibility-only flag semantics: selected tools do not toggle it or introduce a new existing-backend gate.
- Implement exact previously approved Project/Task forms, optional workspace authoring, simple board/detail, 3-second feedback and Task voice/context interaction. Existing optional local desktop voice/settings/permission/transcription behavior is proposed; editable text only, no auto-install/send/save, cloud provider or retained raw voice recording.
- New folder inherits current normalized metadata workspace registration, **not root directory creation**. Preserve existing Project name/validation and workspace behavior; successful saves contain intended optional links/descriptions, failure/cancel truthful.
- Task context files are real durable node-local, Project/Task-scoped content readable after save/restart in detail/edit/tools. Proposed inherited current upload MIME rules, 25 MiB per-file limit and draft/final validation. Cancel preserves saved context; explicit Remove/Delete may remove only Task-owned copies/records, not original workspace files/unrelated history. Done retains task/context. Required description remains; no file-only Task.
- Preserve durable valid data/node scoping, explicit destructive safeguards and truthful all-Task Project deletion warning when Done exists. Current fetched task data correct; no new automatic sidebar/live-refresh latency guarantee.

These are proposed intended behavior/contracts, not selected tool names/schemas, file owners/modules, endpoints, persistence paths, migration mechanisms or architecture. Read/create/status capabilities and previous manual UI scope are directly requested; detailed continuity choices above require baseline approval.

## Explicit exclusions/deferrals
- Manager/team creation/configuration/publication in agents repository: user-owned, no deliverable here.
- Manager launch/conversation/reuse design, dependency scheduler/enforcement, new task-to-run/attempt tracking or dispatch/retry layer.
- New left-side workspace/run-history redesign/Product brainstorming now.
- New Done-triggered runtime cleanup/stopping: **Done only changes business state**. Existing idle-shutdown/explicit Stop/restore/history behavior stays unchanged. No task/status operation stops unrelated work/Manager, auto-deletes results or invokes whole-host Stop.
- Feature enablement/removal, global modal removal, phone release, unrelated management features and production finalization/release this phase.

## Canonical authorities and supplements
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirements-doc.md`: SR-004 complete proposed intent/AC/scenarios/dispositions.
- Same directory `investigation-notes.md`: E-001–026 and **full absolute-path supplement inventory**, scope/user chronology, source facts, evidence limitations.
- Same directory `solution-revision-record.md`: SR-001–003 unchanged, SR-004 appended. Historical product-design-handoff.md, product-design-handoff-sr-002.md and requirements-refinement-sr-003.md retained as as-of history.
- External approved Product package `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations`: ui-ux-spec.md and all ticket-scoped VIS-001–020 screenshots under visual-references (exact files in spec), UF-017 in ui-brainstorm-record.md, handoff-notes.md PFI-001–007, prototype-ticket.md, runbook/change log/behavior matrix/final-browser-validation.json/integration-validation.json/final-build-output.txt, prior requirement-impact/review reports/review-evidence including DATA-001. All remain read-only and linked by current inventory; no competing spec/new prototype/UI/sidebar approval.
- Exact approved runnable manual UI 84ed47bac6877e2cdc6350cca789b0c30ffb55a3, accepted base df2f5cdaf9b168298dcae79ac47c11f31dd82d7c, final package/promotion 134e8e05169bb96e0b8132ad0f524ffc28c354f0, integrated receipt f66efa9c5c1d9976137f6c134120529466b34e48. Canonical prototype root /Users/normy/autobyteus_org/autobyteus-web-prototype; retained authoring worktree not canonical owner.
- Source authority remains accepted e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71 and /Users/normy/autobyteus_org/autobyteus-web-prototype/prototype-bootstrap-report.md, not newer parity at solution investigation e04cfef. Historical Product in-progress paths are provenance only.
- design-spec.md and engineering review/implementation/test/delivery artifacts: **N/A — phases not reached**.

## Evidence and known technical gaps
E-024 verifies existing Task model/service/GraphQL and capability behavior: three statuses, creation/read/description edit/delete, no status write/tool. E-025 verifies existing quiet/lease/grace shutdown is separate from whole-host Stop/history and has no Project Task Done hook; no runtime operations performed. E-026 verifies current optional desktop voice target is AgentContext, existing context owner union is run/member-based, uploads have MIME/25 MiB restrictions, New-folder path registration is metadata-only. **Durable Project Task attachment ownership and a non-AgentContext voice destination still need genuine design/integration**; do not invent a runtime merely to attach files or ship fake sample/object URLs.

These are technical design gaps, not further Manager/sidebar requirements. Investigate repository migration conventions before choosing any data transition. Product validation remains synthetic/session-only/no real mic/upload/persistence/API/MCP/parallel execution; PI-005 recovered cold imports remains disclosed. No phone/WCAG/security/new-source-parity/production-test claim. Source inspection is not executable verification; no production tests/model calls/installed flag inspection or changes.

Documentation integrity checks pass: stable IDs/dispositions, Markdown tables (initial split evidence table corrected), unchanged SR-001–003/historical handoffs, approved external spec/all 20 normative reference paths and git diff --check. No product tests claimed.

## Approval and next expected output
The user explicitly approves the bounded **scope** and previously approved manual UI. Complete SR-004 approval is not inferred. Present the proposed read/create/three-state/native-MCP/continuity contracts and exact existing Product supplement, request explicit approval, then produce architecture/design only for this bounded slice. Preserve retired IDs/dispositions rather than dropping history. No new Product sidebar request or Manager/team delivery question.

## Handoff rules
`get_handoff_rules` called after full result persistence on 2026-10-02. **No rule matches**: latest user explicitly defers the additional sidebar Product request; no new Product correction/marketing work, approved/classified complete architecture or production Delivery Completed receipt gap exists. Return to user for complete SR-004 approval. No send_message_to/delegation performed or claimed.
