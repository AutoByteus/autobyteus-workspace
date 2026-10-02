# Design Spec — Project Task Manager Foundations

## Solution And Approval Basis
- Package `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`; design revision **SR-015**, 2026-10-02, Solution Designer. **Design status: Ready for re-review** of ARCH-F-001 after ARCH-REV-001 / SR-014 **Fail — Design Impact**. This revised SR-015 has no independent verdict, implementation or production validation. SR-014 remains the historical initial handoff.
- Core intended behavior: SD-AP-001 user “confirmed”, SR-009 checkpoint `299f2a2f85847f5b85fcc7beb8b79188dd688807`, active REQ-001–004/007/009–016 and AC-001–004/008–010/012–022. Refresh: SD-AP-002 user “approve” to the explicit addition approval question, SR-012 checkpoint `b750447d8e842b98890baf25a887b75cde3835d2`, REQ-018/AC-025/BEH-010/SCN-013/DEC-017. Exact approval references: requirements-doc.md and requirements-approval-sr-010.md / requirements-approval-sr-013.md in the canonical directory below.
- UI: externally owned `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and exact ticket-scoped VIS-001–020 listed there, UF-017, approved UI `84ed47bac6877e2cdc6350cca789b0c30ffb55a3`, integrated receipt `f66efa9c5c1d9976137f6c134120529466b34e48`. All defining details remain normative except that SD-AP-002 adds Refresh beside New task. No further Product review, new screenshot approval or competing UI spec.
- Canonical directory `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations`; requirements-doc.md owns intent, investigation-notes.md owns evidence. References to local documents resolve here; production paths below resolve at the isolated repository root.
- Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`, branch `codex/project-task-manager-foundations`; refreshed base `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`; finalization target origin/personal, not integrated/pushed. Approval captured at local checkpoint `b03e1761b9e7da23979ac886963283136c9e5f4d` before target design.
- User creates Manager/team separately in agents repository. No Manager, scheduler, Task/run assignment/attempt layer, dependency enforcement, sidebar/run-history redesign, new Agent/Team stopping, CLI/client/scripts/skill, phone delivery or global-modal removal. Feature remains experimental/default-off and installation untouched. Three tools only; existing discovery/delegation/follow-up unchanged.

## Current-State Read
E-038–045, post-approval E-048–054 and review clarification E-055/056 establish a usable Projects owner, not a greenfield service. ProjectService governs names and workspace links; ProjectTaskService governs embedded Task identity/description/TODO/time/list ordering; ProjectStore uses shared process/cross-process locking and atomic rename of `<appDataDir>/projects/projects.json`. Tasks have no file metadata and no status setter. Parent Project metadata is deliberately independent of Task-only writes. ProjectView reports openTaskCount but not all-Task count. Normalization currently spreads unknown fields.

Agent registry and selected Agent Tools MCP already provide registration, schemas, session eligibility, collision protection and execution observation. New adapters fit there; native collaboration filtering would otherwise remove TASK_MANAGEMENT tools and Claude's enumerated fallback would omit them. Do not replace collaboration or the MCP gateway.

Production UI currently opens primary Project/Task overlays and renders floating Task cards. Approved Product pages/continuous rows replace those paths. Prototype services are synthetic and not production dependencies. Current Task cache joins in-flight reads even for force=true, clears rows on error, and lacks read-to-Project count synchronization. Task/Project stores already use binding revisions; keep that invariant consistent at readiness, dispatch and publication in the new paths. Workspace registration already captures its client. E-055/056 distinguish these bounded guards from a same-window node-switch journey: no supported in-scope interactive rebind trigger was identified. Existing desktop voice owns capture/transcription but targets AgentContext; existing context-file ownership is run-specific. These last two cannot represent a durable Task by fabricating an AgentRun.

## Task Size And Architectural Risk (Mandatory)
- **task_size: Large.** Actual structural delta spans server domain/persistence APIs and filesystem transactions, native/MCP registration/exposure, renderer routes/forms/caches and the shared voice destination. Approximately three dozen existing production files plus bounded new tool/context/UI files and seven ordinary route entries; multiple subsystems, not just catalog or Markdown volume.
- **architectural_risk: High.** Material new agent write contract/status semantics, durable Task-owned file/reference boundaries, multipart/file containment, atomic metadata-to-byte sequencing, local read/write/count ordering and shared voice cancellation. Same-window node switching is not a sizing or risk premise. Existing lock infrastructure absorbs writes but does not make these invariants trivial.
- Payload distinction: twenty Product screenshots and long requirements/history are supporting content, not the sizing reason. No production corpus conversion or broad execution refactor is in scope.
- Escalation: report Design Impact if registration/filtering, Task file ownership or ordinary-route integration requires a different structure; Requirement Gap and renewed approval if proposing live refresh, assignment/run linkage, stopping, retention changes, real folder creation, CLI or new policy. Do not silently broaden, downgrade risk or bypass review.

## Architecture Investigation Evidence
The canonical evidence log supplies exact commands/source paths and uncertainty; no production probes/tests were run by Solution Designer.

| Evidence | Exact source reference | Verified fact | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| E-038/048 | server src/projects/domain, services and stores; persistence/file/store-utils.ts; tests/unit/projects | Embedded Tasks, locked updater, atomic rename; meaningful Task writes leave parent metadata alone; exception can follow rename during lock release | Extend existing service/store; patch current record, never write stale full arrays; observe the atomic commit before post-commit finalization; never rollback bytes on an unproven failed commit | Fault/concurrency assertions planned, installed profile not inspected |
| E-039/053 | server docs/design/data_migration_guideline.md and released predecessor/admission paths in investigation log | Optional absence can mean no files; scoped admission and preserved history, no global audit/gate | Directly Usable — No Migration; known-field projections/exact writers | Actual installed volume unknown, representative released fixtures only |
| E-040/051 | server agent-tools/mcp, startup/agent-tool-loader.ts, runtime-agent-tool-exposure.ts, native filter, Claude tooling; core BaseTool | Selected adapter and preparation hooks exist; legacy task filtering and enumerated projections need explicit extension | Shared three-entry manifest/raw parser, native preparation adapter, static MCP provider and selected-name group | Runtime-native/MCP parity tests pending |
| E-041/049 | server context-files upload/layout/path/read services, api/rest/index.ts, api/security/remote-access-route-policy.ts | Run ownership differs; neutral byte policy/path checks usable; new REST families protected by default | Project/Task-owned context store and routes; extract neutral MIME/name/writer/TTL policy only | Real upload/HTTP/path/security tests pending |
| E-042/050 | web voiceInputStore.ts, VoiceInputButton.vue, voiceInputCapture.ts | Captured AgentContext mutation occurs after transcription; cleanup and cancellation do not protect that stage | Explicit text sink, operation generation and lifecycle-safe transcript publication | Real optional extension/device availability untested |
| E-045/052 | web projectTaskStore.ts/projectStore.ts/workspace.ts and production Apollo hydration paths | Existing force can join old reads, row/error/count gap; dedup override already used in production | Physical fresh Refresh and guarded count/cache/draft/node publication | Browser ordering assertions pending |
| E-043/054 | external Product spec/handoff/source and clean Git receipt; TESTING.md | Exact approved manual UI unchanged, mocks/search stores are illustrative mechanisms | Reuse presentation intent, real services, same-node transient search and ordinary routes | No new Refresh screenshot; no phone delivery claim |
| E-055/056 | web NodeManager.vue:282–285; electronApplication.ts:125–169; plugins/20.windowNodeBootstrap.client.ts:12–38; mobileNodeSessionStore.ts:88–102; mobile session bootstrap/runtime; projectTaskStore.ts:81–108/184–188 | Desktop node focus opens/focuses a node-specific window; initial window binding precedes interaction. Only production bindNodeContext caller found is the excluded mobile session owner. Existing Task read guards/watcher do not establish an interactive desktop switch | Preserve AC-025 current-node isolation and existing guards; route/Project/local-write ordering independently justifies request state | Source inspection only; injected binding changes are guard-contract tests, not supported user journeys |

## Intended Change
1. Register `list_projects`, `list_project_tasks`, `create_or_update_task` on existing native and selected Agent Tools MCP surfaces. Three semantic operations, not a wrapper CLI or separate find/create/status tools.
2. Extend ProjectTaskService with exact status-filter and patch semantics; use the same locked Project aggregate as manual CRUD. Add durable Task context without dependency on execution owners. Tool writes preserve context and never upload/replace files.
3. Add aggregate manual Project form input for optional workspace links/descriptions and computed all-Task count. Preserve existing API subjects and visibility-only capability.
4. Replace primary overlays/cards with approved pages/continuous rows/detail/composer; connect real local voice and node-local uploaded bytes. Add manual Refresh with scoped fresh-read and truthful pending/error handling.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved REQ / AC | Approved trigger | Existing behavior/evidence | Change or preserved outcome | Target path / lifecycle / spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001/009; AC-001/012 | Default startup or intentional test-owned visibility toggle | Visibility-only false default, E-005/024 | No installed toggle/server CRUD gate; data retained | Existing capability → navigation/middleware; DS-007 |
| BEH-002 | System/User | REQ-002/003/009/012/014/015; AC-002/003/008/012/015/019/020 | Selected caller lists/creates/patches; user authors Task | Task service/embedded records, E-038/048 | TODO creation; explicit three-state patch; stable identity/context; durable authoring | Tool or GraphQL → Task service → locked store → scoped result; DS-001/002/004/005 |
| BEH-003 | System | REQ-004; AC-004 | Caller discovers eligible collaborators | Existing list_available_agents, E-006/040 | Unchanged eligible addresses; no Manager package | Existing discovery caller → collaboration catalog → result; DS-003 |
| BEH-004 | System | REQ-004; existing regression context | Caller uses existing delegate_task/follow-up | Fresh-copy exact run ID, E-009/025 | Task tool does not launch or stop, no association table | Existing delegate spine external to ticket → caller explicitly patches Task; DS-003 |
| BEH-005 | User | REQ-007/009/012; AC-008/009/013/015/016/017 | User browses/edits/confirms deletion in Projects | Overlays/cards/count defect E-010/018/052 | Approved pages/board/detail and truthful count, no new sidebar | Routes → domain UI stores → GraphQL → services; DS-004/005/006 |
| BEH-006 | System | REQ-010/015/016; AC-010/021/022 | Definition selects new tools; Project discovery call | Registry/catalog/exposure E-040/051 | Equivalent domain results/errors; explicit selection/current node | Definition → registry or session catalog → thin adapter → service; DS-001/002/007 |
| BEH-007 | User | REQ-011; AC-012/014/017 | New/Edit Project with optional Existing/New rows | WorkspaceManager metadata registration E-026/042/048 | Single direct form, optional descriptions, no mkdir/unlink-file deletion | Project editor → workspace registration if needed → Project service → store; DS-004 |
| BEH-008 | User | REQ-013/014; AC-018/019 | User explicitly records or attaches then saves Task | Run-owned upload/captured AgentContext E-049/050 | Editable local transcript; durable Task copies; Cancel preserves saved files; Done retains files | Task draft → voice owner or Task-context service → explicit metadata save/read; DS-005/008/009 |
| BEH-009 | Deferred | REQ-017 / AC-023/024 inactive | No active trigger | Historical client exploration only | No client/skill implementation | N/A, retained history only |
| BEH-010 | User | REQ-018; AC-025 | Click Refresh after saved agent write | No control, stale cache E-045/052 | Latest complete scoped read, search retained, errors/races guarded | Board → Task store fresh query → Task service/store → guarded rows/counts; DS-006/010 |

### Material mechanism premise classifications
This is not an additional requirement list. Each mechanism is bounded by an independently approved action or governing contract, rather than justified by its implementation/test alone.

| Premise | Validity / independent basis | Production witness and consequence | Bounded response |
| --- | --- | --- | --- |
| External Task writes unseen until deliberate read | Supported Normal Scenario, SD-CF-013/SD-AP-002, SCN-013 | Selected agent commits Task → user remains on cached board → clicks Refresh → latest saved list must render | Physical read and scoped publication, no live event system |
| Read settles after local save or route/Project navigation | Supported Explicit Edge Scenario, AC-025 and approved data preservation; ordinary authoring/navigation | Board read begins → local Task save/delete succeeds or user navigates to another Project/route → earlier read settles → stale rows/counts/errors must not overwrite newer or different displayed state | Request/write generations and route/Project lifetime checks within current stores |
| Current-node isolation of a read/save | Governing approved invariant, AC-025/AC-012, existing binding guards/watcher; E-055/056 | A node-specific window is initially bound → its captured client/endpoints dispatch and return scoped data → current store/draft only publishes eligible results. Desktop node focus uses a different node-specific window, not rebind of this interactive draft | Preserve bindingRevision watcher/checks and bounded captured-client dispatch/publication; no node-switch/recovery workflow |
| Same-window node switch while Projects draft/read is active | Technically Possible but Unsupported/Contrived; Not Reachable through the inspected desktop Node Manager path (ARCH-REV-001 MP-004); no in-scope trigger identified, E-055 | bindNodeContext can be called mechanically; inspected desktop UI opens/focuses separate windows, bootstrap initializes before interaction, mobile caller is excluded | Not a product premise, new journey or reason for extra switching/reset/recovery machinery; injected token changes verify guards only |
| Voice result arrives after Cancel/Back | Supported Explicit Edge Scenario, approved Cancel/voice errors AC-015/018 and existing local IPC path | User records/stops → local transcription pending → user cancels/leaves draft → return must not edit the next draft | Sink lifetime and settlement guard; no new IPC cancellation service |
| Save failure or post-rename finalization error | Supported Explicit Edge Scenario under approved data continuity/AC-012/019 and governing atomic-write/recovery convention E-048/053 | Explicit Task save → current atomic JSON writer; metadata references must never expose incomplete bytes or be rolled back merely because lock finalization reports an error after rename | One in-memory commit observation and immutable preparation; injected failures only verify this contract, not a new infrastructure fault-management product |
| File read/upload supplied with wrong owner/path/type/size | Supported Explicit Edge Scenario, inherited context validation plus approved AC-019 | Real Task file HTTP/save boundary receives an invalid compound reference/upload → reject rather than read outside owned regular bytes | Current MIME/limit/membership/containment guards; no new host-adversary or corpus-corruption framework |
| Abandoned/cancelled upload expires | Supported Explicit Edge Scenario, approved draft TTL/Cancel continuity | User uploads then cancels/abandons draft → existing draft housekeeping contract after 24h → saved references must not be deleted | Locked Task-scoped draft cleanup and fresh reference proof for unpublished copies |
| Hidden-file tampering, arbitrary historical destruction, forced power-loss/corpus recovery | Technically Possible but Unsupported/Contrived for this ticket absent additional contract | No approved user surface for hand-editing internal Project/run records or rewriting all history | Do not add backup/journal/version forks/global startup gates; reject unavailable requested files through normal validation |
| Unlimited parallel dispatch, Task/run assignment, automatic Done stopping | Explicitly deferred/excluded by SD-CF-001–004/012 | External Manager may reason/delegate; this ticket provides data tools, not these mechanisms | Preserve separation; no scheduler/cleanup guarantee inferred |


### Node-binding reachability boundary — SR-015
The preliminary clarification and formal ARCH-REV-001 / ARCH-F-001 / MP-004 source finding are correct: this source basis provides no identified supported trigger that rebinds an already interactive in-scope Projects window or draft. NodeManager.onFocusNode and node creation call Electron openNodeWindow, which focuses the window registered to that node or creates a separate node-bound window. The asynchronous window bootstrap initializes its context before interaction. The only non-test bindNodeContext caller found is mobileNodeSessionStore; mobile session bootstrap is gated to /mobile or the separate mobile build, neither of which is this ticket's delivered Projects journey. Do not turn browser-width inspection into phone scope.

AC-025's other-node exclusion remains an approved result invariant, not evidence for a new switching action. Keep the existing synchronous bindingRevision invalidation watcher and bounded checks when extending current stores/new draft transport; use the same captured node/client throughout an operation. No new binding owner, endpoint-switch control, cross-window transfer, draft recovery/rebind policy or reset coordinator is required. Ordinary route/Project navigation, local save/delete ordering, Cancel and external writes independently justify their existing lifecycle/generation controls. If unit tests inject a binding revision, label them invariant/guard preservation tests, not a production switch journey or proof of new UI reachability.

#### ARCH-F-001 consumer/mechanism disposition
| Consumer / mechanism | Retained independent basis | Narrowed or excluded switching-only interpretation |
| --- | --- | --- |
| ProjectTaskStore / ProjectStore | Existing bindingRevision checks and synchronous invalidation watcher; AC-025 current-node isolation. Request/write/deletion/count generations separately serve real local mutations and route/Project navigation | No new rebind counter, node-switch state machine, reset coordinator or cross-window cache transfer |
| Project form / workspace create action | Existing captured-client registration plus bounded token/result/error checks; approved same-node authoring, Cancel and separate-owner save semantics | No new node registry/window change, draft rebinding, registration rollback or recovery UI |
| Task draft / REST client | Captured endpoints/credential and compound owner; real upload/save/Cancel/unmount lifetime. Rejected mismatched binding is guard preservation only | No old-node/new-node migration or draft recovery. Best-effort Cancel discard uses captured endpoint, not a switching protocol |
| Voice text sink | Cancel/route/target lifetime and uncancellable late IPC result independently require generation/sink checks; node token remains part of eligibility only | No NodeManager event subscription or new same-window rebind-triggered cancellation/recovery flow |
| Verification | Real server-write→Refresh, ordinary route/Project/local-save/delete ordering and Cancel/late-voice journeys; injected binding changes separately exercise retained guards/watcher | Remove the product same-window switching journey/test obligation; token injection is not reachability or phone acceptance |

ARCH-F-001 is addressed in this owned design response, **pending independent confirmation**. No new lifecycle machinery remains whose sole production premise is same-window node switching. Existing/new request and draft lifecycle state serves the independently supported operations above; the binding dimension uses existing bindingRevision only. Prior reviewer report/history remain externally owned/read-only at their exact SR-014 basis.

## Relevant Supplemental Task Artifacts
Canonical complete inventory (including purpose/status/absolute paths) remains investigation-notes.md. Every still-relevant item travels in the result; historical prose is not current intent.

| Artifact path | Purpose / related IDs | Relationship | Approval applicability |
| --- | --- | --- | --- |
| Canonical requirements-doc.md and requirements-approval-sr-010.md / requirements-approval-sr-013.md | All active REQ/ACs, exact SD-AP-001/002 | Sole intended-behavior authority and approval evidence | Cumulative Approved |
| Canonical solution-revision-record.md, requirements-refinement-sr-003–009.md / sr-011.md / sr-012.md, product-design-handoff.md / product-design-handoff-sr-002.md | Chronology and earlier routes | Preserve as-of records; no superseded scope reactivated | Historical; exact approvals linked separately |
| Canonical skill-cli-feasibility.md | Deferred REQ-017/DEC-016 | Retained history only; not design dependency/validation gate | Non-normative/deferred |
| Canonical design-review-report.md and architecture-review-revision-record.md | ARCH-REV-001 / ARCH-F-001 / MP-004, reviewed SR-014 checkpoint 2b01707ea2c06cf974bc7315e5f547f6e94094f5 | Independent Fail — Design Impact; this SR-015 responds with corrected premise/consumer/test basis | Prior authoritative verdict retained; no Pass inferred for SR-015 |
| Canonical architecture-clarification-sr-015.md | Full current rework and re-review context | Current cumulative Architecture Design Complete result; route/receipt recorded after tools | Intent Approved; re-review pending |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and its exact VIS-001–020 | Manual UI REQ-007/009/011–014 and AC-013–019 | Normative visual/interaction basis, except added Refresh absence | UF-017 plus SD-AP-001 continuity; Refresh SD-AP-002 |
| Same external package: handoff-notes.md, ui-brainstorm-record.md, prototype-ticket.md, behavior matrix, final/integration JSON, build log, runbook/change log | PFI-001–007, provenance, validation limits | Read-only evidence; earlier SR-002 unresolved active policies now resolved canonically | UI-only approval; synthetic results not production acceptance |
| Same external package: requirement-impact.md, review-round-1/3/4/5/6.md, relevant review-evidence/ including DATA-001 | Alternatives/history/data provenance | Preserve rejected alternatives/limitations, not extra UI options | Historical/non-normative unless final spec incorporates |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype-bootstrap-report.md` | Source authority e9aa4a7 | Distinct from investigated e04cfef; no newer parity claim | Accepted Product source provenance |

## Task Design Health Assessment (Mandatory)
- Change posture: **Feature / Behavior Change** with bounded prerequisite refactors.
- Current design issue: **Yes, within this new scope**. Existing Projects service boundary is healthy for ordinary Tasks. The extension exposes Missing Invariant (status patch/byte reference atomicity, response generation/counts), Boundary Or Ownership Issue (run-only files and AgentContext-only voice), and Shared Structure Looseness (unknown-field spreading/private reusable byte policy). UI overlay/card lifecycle becomes obsolete by approved intent, not a claim that all modals are defective.
- Refactor needed now: **Yes, bounded**. Extract neutral upload policy/writer from run upload owner; introduce Task-owned byte store behind Project services; replace description-only Task service method with field-mask patch; generalize voice text destination and separate capture disposal from operation invalidation; centralize scoped Task reads/cache/count publication; remove replaced overlays/rows/imports.
- Evidence: E-048–052 and E-055/056 reachability correction; proposed refactors map to approved production scenarios/contracts, not arbitrary architectural cleanup. Binding checks stay a bounded invariant-preservation concern; unsupported same-window switching does not justify additional refactoring or recovery state.
- No refactor needed for discovery/delegation, Team execution lifecycle, MCP gateway/security policy, existing workspace authority, or app-data migration framework. Their owners absorb or remain outside the delta.
- Intentional deferrals: sidebar/live update, assignment/run linkage, safe Agent/Team cleanup, shared-repository scheduling, client/skill conversion. Residual limitations remain visible: manually fetched data can grow stale between clicks; file/global JSON lock scalability not newly guaranteed; physical cleanup failures can retain inaccessible owned copies; unavailable optional voice requires typed fallback.

## Terminology
- Project Task: durable description/status/context record inside a Project, not an execution-internal delegated task.
- Task context: bytes copied into a Project/Task-owned namespace plus authoritative saved metadata. Original workspace files are never that namespace.
- Draft context: transient upload bytes/metadata for one Project and optional existing Task; unpublished until explicit Task save.
- Binding token: current node identity/endpoints and bindingRevision captured before async dispatch. Request/write generations are client-only ordering state, not stored Task revisions.

## Design Reading Order
Current-state/evidence → approved behavior map → health/removals/data decision → spines/owners → interfaces/subsystems/files → sequencing/verification. This document supplies all material target decisions; source code/tests remain implementation work.

## Legacy Removal Policy (Mandatory)
**No backward compatibility; remove legacy code paths.** No alias tool names, old task-plan adapters, dual files, version-specific reader branches, mock-store import, fallback fake voice or compatibility overlay. Existing public Project/Task CRUD subjects remain supported current APIs, not wrappers preserved for obsolete behavior: adapt their domain paths directly. Optional context absence is normal current meaning, not an old-version branch.

## Persisted Data / State Transition Decision (Mandatory)
- Subject/location: Project array at `<appDataDir>/projects/projects.json`, workspace registry unchanged, new Task context namespaces below. Representative released no-Tasks Project fixture v1.4.86 and current TODO/IN_PROGRESS/DONE fixtures in server tests/unit/projects; not a user's profile. User expects practical small lists, not an actual measured volume or a 1,000 limit.
- Delta: optional Task `contextFiles` metadata; explicit status patch; Project count is derived, never stored; optional aggregate workspace form command; new file directories only for new explicit uploads. Existing IDs/description/status/timestamps/link root snapshots retain meaning/location.
- Decision: **Directly Usable — No Migration** for existing Projects/Tasks. **Not Affected** for workspace registry and unrelated run/history/migration records. Draft context is transient with existing 24h per-file expiry; not authority for successfully saved context. Client caches/search/authoring drafts rebuild from server/interaction, not a persisted format transition.
- Proof: current normal reader accepts valid fields irrespective of version, absent tasks truthfully means none and absent contextFiles truthfully means no saved files. Tighten it to explicit known-field Project/link/Task/file projections; ignore irrelevant extras and never emit them on ordinary save. No Task is re-IDed, reopened, moved or reinterpreted. Validate optional file metadata without discarding otherwise valid Task text solely for unusable file entries; invalid references must not become usable paths. No dual-path lookups or mandatory historical conversion.
- Commit proof: add an optional synchronous, non-throwing `onCommitted(rows)` observation to the existing updateJsonArrayFile provider, invoked immediately after successful rename and before lock finalization. ProjectStore captures committed rows there. If lock finalization subsequently throws, ProjectStore reports/logs a post-commit warning and returns those proven committed rows; before rename it propagates the actual failed write. Other callers' existing behavior is unchanged when no observer is supplied. This is a narrow transaction-boundary extension, not a new journal, runtime compatibility path or global retry/admission policy. Test callback timing and pre/post-rename outcomes.
- Writer: emit exact current recognized fields; do not persist derived counts, Project ID inside Task, absolute file paths, URLs, client request generations or schemaVersion. Empty context may be normalized to an empty array consistently. Keep original values of required Task fields, not a semantic rewrite for representational cleanliness.
- Governing convention: `autobyteus-server-ts/docs/design/data_migration_guideline.md` at e04cfef, E-039/053. Released predecessor skipped/missing/already-current, preserved invalid/missing sources, warning reference dispositions and failed attempts remain distinct. Current run/reference admission remains physical/owner checked; no aggregate migration status becomes a Project/global startup gate.
- Checklist: no migration needed; application/new work availability unchanged; actual source fixtures and predecessor dispositions inspected; no converted/excluded corpus promised; current atomic writer plus a bounded in-memory commit observation sufficient; no new durable journal or historical decoder or new marker; no startup byte audit/extra trace pass; Task files reference only their compound Task owner; run references untouched; mixed fixtures/restart/fault checks below prove transition; independent review requested because new file/reference/write boundaries are High risk.
- Cost/recovery: avoid startup rewriting/corpus scan/new journal/backup. Normal Project read/write remains whole-file O(Project+Task records). Saved file reads validate requested current membership and physical containment, not every historical package. No secure-erasure/power-loss guarantee beyond current persistence conventions is invented. Unknown real installed volume remains a limitation, not a forward-ready fabricated benchmark.
- Migration Plan: N/A — no meaning/required-history transformation, registry change or admission gate.

### Current stored and transport shape
Persisted Task gains a metadata-only optional field, using one identity per file:
```ts
// Project ID is supplied by its enclosing Project, not repeated here.
type ProjectTaskContextFile = {
  storedFilename: string; displayName: string; mimeType: string; sizeBytes: number;
};
// ProjectTask retains taskId, description, status, createdAt, updatedAt.
contextFiles?: ProjectTaskContextFile[];
```
Filename is opaque server-generated/sanitized, not an arbitrary path; displayName is presentation only. Saved file identity is `{projectId, taskId, storedFilename}`. Derive REST locator on read. Tool projection also supplies a validated node-local `localPath` when the referenced regular file is present; never persist/guess that path or treat a locator as proof. An unavailable reference may still identify saved metadata, but HTTP/local resolution fails closed and never points into workspace/run data.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Governing owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002/006 | Selected agent Project/Task read | Complete current-node result | ProjectService / ProjectTaskService | Discovery of durable data, no arbitrary default |
| DS-002 | Primary End-to-End | BEH-002/006 | Selected create_or_update_task | Durable patch/create and returned Task | ProjectTaskService | Shared native/MCP invariant and identity preservation |
| DS-003 | Primary End-to-End, preserved external | BEH-003/004 | Caller chooses discovery/delegation | Existing run ID, later caller status write | Existing collaboration; external caller workflow | Separates dispatch from business status and cleanup |
| DS-004 | Primary End-to-End | BEH-005/007 | New/Edit Project page | Saved aggregate links/details and origin route | Project editor / ProjectService | One direct form, real registration, no stale Task replacement |
| DS-005 | Primary End-to-End | BEH-002/005/008 | Task composer/save/detail/delete | Durable Task/files or explicit removal and return route | Task draft / ProjectTaskService | Real authoring rather than prototype state |
| DS-006 | Primary End-to-End | BEH-005/010 | Board entry or Refresh | Correct groups and counts in same bound Project | ProjectTaskStore | External write becomes visible through deliberate read |
| DS-007 | Bounded Local | BEH-001/006 | Definition selection / capability read | Runtime exposure or UI visibility | Existing exposure/capability owners | No auto-enable/exposure/collaboration weakening |
| DS-008 | Primary End-to-End / Return-Event | BEH-008 | Explicit mic action | Editable current draft text | VoiceInputStore + destination owner | Local capture and async target safety |
| DS-009 | Bounded Local | BEH-008/002 | Upload or save context delta | Published refs with prior bytes preserved | Task service / context store | Prepare-byte and metadata commit ordering |
| DS-010 | Return-Event / Bounded Local | BEH-010/005 | Read/write promise settles | Guarded cache/count/error publication | ProjectTaskStore / ProjectStore | Reject stale responses without faking success |

## Primary Execution Spine(s)
- DS-001: definition selection → native registry or MCP session catalog → shared tool operation → Project/Task service → ProjectStore current node → projected complete result to caller.
- DS-002: selected call → shared raw contract parser → ProjectTaskService → locked current Project record patch/create → atomic ProjectStore rename → Task result to runtime.
- DS-003: caller reads Task → unchanged list_available_agents → caller chooses exact returned address → unchanged delegate_task → exact run result to caller → caller explicitly uses DS-002. No server link/callback from delegate to Task status.
- DS-004: page draft → bound-node workspace registration only for New paths on Save → aggregate Project GraphQL command → ProjectService → locked current record → result/cache → origin tab and 3000ms notice.
- DS-005: composer text/optional uploads → bound-node GraphQL Task command with explicit context delta → Task service prepares bytes → locked current Task metadata commit → saved detail/board → owner-validated byte read. Explicit Task/Project deletion removes metadata and only its owned copies, not executions.
- DS-006: current board Refresh → Task store fresh physical GraphQL query → resolver → Task service → ProjectStore → DS-010 guarded cache/groups/counts; search is applied locally after read, not a new server filter.
- DS-008: Task/agent sink + explicit mic start → VoiceInputStore → existing permission/audio worklet → existing Electron local transcription → operation/sink validity check → append editable text, never save/send.

## Spine Narratives (Mandatory)

| Spine | Narrative | Subject nodes | Owner | Off-spine summary |
| --- | --- | --- | --- | --- |
| DS-001/002 | Catalog/registry validates selected names; both thin adapters share parser/schema/result projection. Services read/write node-local records. Update reads current state under the existing lock; only supplied description/status or explicit manual context delta changes. Commit result returns, with no launch/judgment/stop. | Caller, tool boundary, Project/Task service, ProjectStore, result | Domain services | Manifest/schema/serialization and atomic file provider |
| DS-003/007 | External Manager can reuse discovery and fresh-copy delegation. Only explicit definition selection adds Project/Task tools; UI capability remains a distinct visibility setting. Legacy task-plan tools stay removed. | Definition/session, collaboration caller, existing execution | Existing exposure and collaboration | Eligibility catalog and native filter |
| DS-004 | Editor keeps links local until Save. New paths register metadata with existing workspace authority; Project mutation saves intended details/links together using latest stored Tasks. Cancel sends no form mutation. Successful destination reflects zero/nonzero links or captured origin. | Editor, workspace authority, Project service/store | ProjectService | Draft normalization, notice/focus handling |
| DS-005/009 | Upload has an explicit Project/optional Task draft owner. Server records authoritative upload metadata. Save validates additions/removals and copies new bytes before metadata references publish. Failed/uncertain commit never deletes saved bytes. Read/deletion validates compound membership and containment. | Draft, Task service, context store, ProjectStore, saved Task | ProjectTaskService | Shared MIME/writer/path policy and draft housekeeping |
| DS-006/010 | Clicking Refresh starts a non-deduplicated network query after the click; it does not join an earlier promise. State publication checks node, Project/request generation and local-write generation. Previously successful data remains on refresh error with explicit error feedback. Current full data drives Project totals; local search drives existing lane counts. | Board, Task request/cache owner, GraphQL/domain, Project count cache | ProjectTaskStore | Request tokens and Project count generation |
| DS-008 | The recording request carries a destination key and currentness/append functions, not an invented AgentContext. Capture cleanup is distinct from operation invalidation. Cancel/navigation/node changes invalidate the destination; a late local transcript is discarded without saving or targeting the new draft. | Destination, voice capture, Electron transcript, current text | VoiceInputStore + draft owner | Resource disposal and transcript merging |

## Spine Actors / Main-Line Nodes
Caller/definition; current route/draft; existing native registry/MCP session; thin transport adapter/resolver; ProjectService/ProjectTaskService; ProjectStore; Task-context store for byte preparation/read; existing WorkspaceManager; VoiceInputStore and existing Electron transcriber; renderer request/cache publication. Tool manifest, locators, validation and persistence implementation are not extra business coordinators.

## Ownership Map
- ProjectService: Project identity/name uniqueness/link aggregate, registration lookup, all/open count projection and whole-Project deletion.
- ProjectTaskService: Task identity/description/status/time, exact current-state patch, manual context publication, compound Task/file membership, scoped draft/read/delete entry methods. It delegates all byte/path/manifest mechanics to the internal Task-context store rather than doing stream/HTTP work itself.
- ProjectStore: known-field persistence projection, shared locked aggregate update and atomic commit, no business status or context policy.
- ProjectTaskContextStore/Layout: transient draft manifest, bounded byte preparation/read/removal, layout/containment and TTL. Never selects business status, starts a runtime or writes Project metadata.
- Tool contract/manifest: input/result translation and registration metadata; thin native/MCP adapters use domain owners, not another task database.
- Web stores: bound-node API requests, transient cached models/search, publication ordering/counts. Draft composables own unsaved form edits and attachment/voice lifecycle, not durable state.
- Existing WorkspaceManager and VoiceInputStore remain authoritative for their own subjects; upstream UI must not directly open registry JSON or add a second recording provider.

## Thin Entry Facades / Public Wrappers

| Entry | Governing owner | Purpose | Must not own |
| --- | --- | --- | --- |
| Native three tools / MCP provider | Project/Task services via shared manifest | Name/schema/raw input/JSON result/error projection | Persistence, inferred Project, status scheduling |
| Project/Task GraphQL resolvers | ProjectService/ProjectTaskService | Typed manual command/read mapping and errors | Direct stores, file finalize races |
| REST project-task-context-files.ts | ProjectTaskService | Multipart/HTTP status/stream response mapping | Ad hoc filenames, guessed run owners, metadata publication |
| Nuxt pages | Project editor/detail/Task components | Route identity/mode entry | Duplicate business state or hidden overlay lifecycle |

## Removal / Decommission Plan (Mandatory)

| Remove/decommission | Reason | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| web ProjectFormDialog.vue and ProjectTaskDialog.vue; their active imports/obsolete tests | Primary overlays replaced by approved pages | ProjectEditor.vue, ProjectTaskEditor.vue, ProjectTaskDetail.vue and new routes | In this change | No fallback overlay or dual authoring |
| web ProjectWorkspaceLinkDialog.vue primary add/edit entry | Workspace entries now part of same direct Project form | ProjectWorkspaceEntry.vue plus editor-focus navigation | In this change | Keep genuine Unlink/destructive confirmations, not global modal removal |
| web ProjectTaskCard.vue and card gaps/shadows | Approved contiguous row semantics | ProjectTaskRow.vue | In this change | Update tests/imports, no List alternative |
| web pages/projects/[id].vue | Non-outlet parent conflicts with ordinary child routes | pages/projects/[id]/index.vue | In this change | Static new route and task index/edit render independently |
| server updateTaskDescription method/command name | Description-only domain method duplicates new patch boundary | updateTask with explicit field presence | In this change | Existing GraphQL updateProjectTask directly maps description/context, no compatibility wrapper method |
| Private MIME/name/stream policy in run upload service | Task uploads need identical neutral policy | context-file-upload-policy.ts / writer.ts | In this change | Existing run upload service retains run-owner sequencing; move callers, no duplicate implementation |
| Voice AgentContext-only request/store destination and old agentInput/VoiceInputButton.vue location | Task not an agent; late transcript target can drift | types/voiceInput.ts sink, generic voiceInput/VoiceInputButton.vue, current composer call-site adapters | In this change | No retained old request shape/button wrapper; settings-test remains supported |
| Treating every ProjectStore write exception as uncommitted | Release may fail after atomic rename; false failure could trigger unsafe byte rollback | ProjectStore commit observation and distinct post-commit warning | In this change | Shared provider observer only, no global caller behavior change |
| Task force/inflight reuse and failed-refresh row erasure; open-only delete warning | Conflicts with AC-025 and all-Task deletion | Explicit refresh/read ordering, retained rows/error, total count | In this change | Replace cache internals, no polling added |
| Retired execution task-plan names | Already excluded; must not resurrect | Existing denylist plus explicit new-name allowlist | Preserve removal | No alias create_task/update_task_status |

## Return Or Event Spine(s)
DS-008: local transcription promise → valid operation/destination → text merge → draft rerender. DS-010: read/write settlement → binding/request/write generation check → Task cache + Project counts or persistent error → existing board. Server has no new Task-change event, subscription, delegation callback or automatic completion propagation.

## Bounded Local / Internal Spines
- DS-007, exposure owner: definition names → normalize/dedupe → selected Project-tool group → registry/catalog availability → native/Claude/session projection. Automatic collaboration set unchanged.
- DS-009, Task service: parse explicit file delta → prepare immutable new copies under draft ownership → validate current Task and prepared files under Project lock → merge current metadata → atomic commit → best-effort scoped old-copy/draft cleanup. Draft locks never hold while acquiring the Project lock; no nested same-path writer locks.
- DS-010, web stores: capture the current node/client and request/write generations → readiness/currentness check → physical request → currentness check → one publication path. Preserve the existing binding watcher/check discipline and verify the captured token before dispatch/publication. Local write and ordinary route/Project ordering are the supported async premise; binding mismatch is a rejected stale operation, not a new switching/recovery spine.
- DS-008, VoiceInputStore: start operation → capture → flush → dispose capture only → transcribe → validate generation/sink → append → settle operation. Cancel separately invalidates publication and settles a pending flush; it does not pretend an uncancellable existing IPC request was stopped.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves owner | Responsibility | Why | Risk if promoted to business main line |
| --- | --- | --- | --- | --- | --- |
| Three-tool contract/manifest/result mapping | DS-001/002/007 | Tool boundary | Exact names, schemas, parsing, safe JSON errors | Native/MCP equality | New scheduler/service wrapper |
| Atomic JSON provider/lock | DS-002/004/005 | ProjectStore | Serialize current aggregate, atomic rename | Preserve independent writes | Domain status logic in generic persistence |
| Neutral upload MIME/name/writer policy | DS-005/009 | Context stores | Allowlist/25MiB truncated-stream cleanup/safe stored names | One inherited byte policy | Run ownership leaking into Tasks |
| Task-context layout/manifest/TTL | DS-005/009 | Task service/context store | Explicit roots, prepared immutable copies, draft bookkeeping | Durable references/cleanup without run | Separate Task authority/database |
| Path and membership validation | DS-005/009 | Task service/context store | Requested saved reference plus contained regular file | Prevent cross-Task/directory escape | Broad corpus scan/security product expansion |
| Draft focus/notice/attachment display | DS-004/005/006 | Form/detail components | Required labels/focus/3000ms notice/object URL disposal | Approved interaction continuity | Durable state hidden in UI component |
| Client generation/count projection | DS-006/010 | Task/Project stores | Reject stale publication, derive all/open count | Truthful current fetch | Task assignment/liveness policy |
| Voice destination adapter | DS-008 | Agent composer or Task draft | Explicit key/currentness/text append | Reuse one capture owner | Fake AgentContext or alternate voice service |

## Ownership Boundaries
Upstream API/tools use Project or ProjectTask services only. Metadata mutations and context additions/removals publish through Task service; HTTP upload/read routes do not depend on its byte store. Whole-Project deletion is ProjectService's container authority and may use the shared internal Task-context store for captured owned-copy cleanup; it must not call Task deletion recursively while holding the same aggregate lock. Workspace remains unaware of Projects. Project services remain unaware of execution/delegation owners. Tool contracts imported by runtime exposure contain names/types/schema only, not domain-service imports; the operation manifest performs domain invocation at the agent-tools boundary.

## Boundary Encapsulation Map

| Authoritative boundary | Internals | Required callers | Forbidden bypass | Boundary delta |
| --- | --- | --- | --- | --- |
| ProjectService | ProjectStore, workspace lookup, whole-container file cleanup | GraphQL Project resolver and Project list manifest | API → ProjectStore or workspace registry | Summary/catalog method, aggregate links and total count |
| ProjectTaskService | ProjectStore, Task-context layout/store | Tool manifest, GraphQL Task resolver, new REST file routes | Transport → file store plus Task service; standalone finalize then detached metadata write | Patch/filter/file/draft/read methods with compound identities |
| VoiceInputStore | Existing audio capture/worklet/Electron local service | Generic voice button/settings, explicit destination adapters | Task component builds AgentContext or its own getUserMedia/transcriber | Tight text sink and operation validity |
| Web Project/Task request stores | Captured Apollo/binding/order state | Route components and draft save owners | Component direct GraphQL mutation + independent stale cache updates | Current dispatch/publication/count path |
| Task draft context client | Captured REST origin/credential and trusted endpoint builders | Task draft/detail file UI | Arbitrary URL fetch or current-node reassignment after await | Task-scoped FormData/Blob/read/delete-draft operations |

## Dependency Rules
1. Transport/tool adapters → service; service → its persistence/file mechanisms. Never API → projects/stores or file layout, never execution service → Projects service, and never Project service → agent-collaboration/execution/task-delegation.
2. Agent-tools manifest → Project services is the allowed application-tool boundary. Runtime exposure imports only the tool contract's static names; do not make collaborator context a prerequisite for ordinary node-local Task tools.
3. Projects → WorkspaceManager public registration lookup; no registry-store dependency. Form New paths use existing workspace registration, not fs.mkdir or a workspace→Projects backedge.
4. Projects context store → neutral context-file upload/contained-path mechanisms; run/Team/Org owner resolver stays unchanged. No synthetic run owner, no Task branch in run history/migration/local-path resolver. Tool context localPath is produced by Task authority itself.
5. Web imports its own types/GraphQL/transport, never core/server/prototype stores. No compatibility overlay or mocked audio/file branch. A scoped test double does not become shipped fallback.
6. Metadata is authoritative for saved membership; directory enumeration is not Task admission. Paths/locators/counts are read projections. Draft upload cannot set status/create a durable Task.
7. Use existing per-path locks, with strict order. Draft prepare/release first, then Project commit; draft housekeeping uses only its draft lock. No same-path nested writeJsonFile call while holding that file's lock; use a separate draft lifecycle lock anchor and atomic manifest writer.

## Interface Boundary Mapping

| Interface | Subject / responsibility | Identity/input | Output / notes |
| --- | --- | --- | --- |
| list_projects | Current-node Project metadata catalog | No arguments | `{projects:[{projectId,name,description}]}`, complete, existing case-insensitive name/ID order; empty array |
| list_project_tasks | Task list, exact optional business status | `project_id:string`, optional `status` exact TODO/IN_PROGRESS/DONE | `{projectId,tasks:[ToolTask]}`, full descriptions/context refs, existing updatedAt-descending/ID tie order; no paging/implicit selection |
| create_or_update_task | One Task create or explicit patch | `project_id`, optional `task_id`, optional description/status governed by branch below | `{task:ToolTask}` after commit; no run/result linkage |
| ProjectService.listProjectSummaries | Read-only Project projection without workspace resolution | Current server/store only | Metadata summary, no unrelated workspace errors on catalog |
| ProjectStore.updateRecords / updateJsonArrayFile commit observation | Locked Project aggregate commit | Current-record updater + in-memory onCommitted observer | Proven committed rows returned even on later lock-finalization warning; precommit failure still throws |
| ProjectTaskService.listTasks/updateTask/createTask | Current Task invariant boundary | Explicit Project ID, and Task ID for patch; exact presence mask; optional manual context delta | Current TaskView; GraphQL manual edit never supplies status |
| Project GraphQL create/update | Project details and optional aggregate workspace draft | Existing name/description/Project ID; optional workspaces array of workspaceId/description | Saved ProjectView with `taskCount` and openTaskCount; omitted links preserve, supplied array intentionally updates form links |
| Task GraphQL create/update | Manual description and context save | Existing required description and IDs; create `contextDraft`, edit `contextChanges` | Durable Task with read-only status; no new human status operation |
| Task context draft REST lifecycle | Begin/upload/read/delete transient Task context | Project ID + server-generated draft ID; draft records optional target Task ID; storedFilename for one file | Server-authoritative metadata/locator, no client path/metadata override |
| Saved Task context GET | Read one saved reference | Compound Project ID + Task ID + storedFilename | Contained regular bytes or not-found, no guessed run/local path |
| VoiceInputRecordingRequest | Explicit capture destination or settings test | source composer/project-task + `{key,isCurrent,appendTranscript}`, or settings-test with no sink | Editable text only; one active capture/transcription owner |
| refreshTasks / task-cache publication | Physical current Project list read | Captured node/binding + Project ID + read/write generations | Full list/cache/count state, no search mutation or task/run write |

### Exact tool parsing/result/error contract
- Shared `project-task-tool-contract.ts` owns names, descriptions, status schema and strict raw argument parsers; manifest owns service invocation and result projection. Reject non-object/unsupported keys, missing/blank/non-string Project ID, explicit null/blank Task ID, non-string description/status, invalid status and empty patch. Do not coerce numeric IDs or interpret blank IDs as creation.
- Creation branch: task_id absent; description required and trimmed nonempty; status must be omitted (initial TODO only). Generated identity, createdAt=updatedAt, current Project tasks append under lock. Supplied unknown task_id always fails; no upsert-on-not-found or import path.
- Update branch: task_id present and found in the named Project; description and/or status required; validate presence exactly, preserve all omitted fields including context. TODO/IN_PROGRESS/DONE generic reset/reopen allowed, not runtime-derived. Identical values return current Task without metadata change; meaningful change updates only Task.updatedAt. No parent updatedAt or unrelated row change.
- Success ToolTask fields: projectId/taskId/description/status and contextFiles with display metadata + derived same-node locator and optional verified localPath. IDs remain tool/API data, not visible Task-detail fields. Complete saved context metadata is retained by status/description writes; tool has no attachment-write/delete parameters.
- Extend ProjectError codes for `TASK_STATUS_INVALID`, `TASK_PATCH_REQUIRED`, `PROJECT_TOOL_ARGUMENT_INVALID`, `TASK_CREATE_STATUS_UNSUPPORTED`, and scoped context/draft validation failures. Existing PROJECT_NOT_FOUND/TASK_NOT_FOUND/TASK_DESCRIPTION_REQUIRED unchanged. Serialize known failures `{error:{code,message}}`; unexpected storage failures use a stable `PROJECT_OPERATION_FAILED` message and log details locally, not raw filesystem internals as a tool result.
- Native three small classes share a local preparation implementation: run the same raw parser before `super.prepareExecution`; it accepts already-normalized arguments, so BaseTool validation cannot replace the domain error contract. Catch parser errors there and service errors at execution and throw the same JSON error payload. Do not change global BaseTool or reclassify aborted execution as invalid input. MCP uses shared manifest/parser and structured JSON/text result with isError=true on the equivalent domain failure. Test real native execute/preparation, not only `_execute` or parser calls. Session/unselected/abort transport errors remain existing protocol errors, outside domain-parity comparison.
- All three use current `ToolCategory.TASK_MANAGEMENT`. Extend the native collaboration filter to explicitly allow exactly the three new selected names in addition to delegation; preserve legacy/removed-name rejections and category filtering for others. No new core enum/category or broad category allowance.
- Registration unit `project_tasks` loads the server-owned native classes; MCP static provider has protect_static_adapter and node-local availability. Catalog already intersects requested names and availability. Add selected `enabledProjectTaskToolNames` to RuntimeAgentToolExposure, its session clone and Claude enumerated fallback; descriptor-derived enabledTools remain authoritative. Automatic collaboration names unchanged, no flag-driven auto exposure. Generic other MCP runtimes use existing descriptor/catalog routes.

### Manual context API and transaction
No separate public finalize endpoint: successful Task metadata save is the only finalization boundary.
- `POST /rest/projects/:projectId/task-context-drafts` body optional taskId creates an opaque draft for create or that existing Task. Validate current Project and, when present, exact Task membership. Draft manifest owns `{projectId,taskId?:string,files:[file metadata]}`; no schemaVersion/path/URL. Draft ID generated server-side.
- `POST .../task-context-drafts/:draftId/context-files` uploads one multipart File. `GET`/`DELETE .../context-files/:storedFilename` reads/removes a draft file. `DELETE .../task-context-drafts/:draftId` discards only that draft. A deleted/mismatched Project/Task/draft never becomes a new durable owner.
- `GET /rest/projects/:projectId/tasks/:taskId/context-files/:storedFilename` validates saved metadata membership then physical containment. No final-file DELETE route bypassing metadata: saved Remove/Clear is an explicit edit delta, committed through Task save. Stream allowed images for inline preview; other allowed types download rather than embedding HTML/scripts. Preserve existing protected network policy; use safe Content-Disposition and nosniff. No public-route exemption, remote gateway or new ACL system.
- Layout: `<appDataDir>/projects/task_context_drafts/<encodedProjectId>/<draftId>/` holds manifest and uploads; `<appDataDir>/projects/task_context_files/<encodedProjectId>/<encodedTaskId>/<storedFilename>` holds saved copies. Separate from run draft/memory roots so run cleanup cannot remove Task manifests. Encode/validate identities and filenames as single segments; validate ancestors/files against the configured Projects root (root itself may be symlink, descendant ownership redirection rejected). Do not accept absolute client paths, traversal, arbitrary original workspace paths or symlinked descendants. Writer uses generated exclusive names, rejects truncated/oversize files and removes incomplete temporary upload bytes before adding manifest entry.
- Share current MIME allowlist, stored-filename normalization, stream/truncation writer and 25MiB/24h constants under neutral context-files concern; keep Task draft manifest and ownership in Projects. MIME/size are server-derived from upload, not trusted final-save descriptors. Existing run upload still owns run validation/layout/locator; no Task union variant needed there.
- Create payload contextDraft: `{draftId,storedFilenames}`. Update contextChanges: `{draftId?:string,addStoredFilenames?:string[],removeStoredFilenames?:string[]}`. Addition requires matching create/existing-Task draft ownership and server manifest entries; removal requires current Task references. Omitted context leaves it untouched. Do not send an old full Task/status/context list as a replacement. Context-only edit can be represented by unchanged required description plus explicit file delta in existing GraphQL update.
- Prepare immutable new final copies with new generated final names from validated draft bytes; finish and validate copies before Project metadata commit. Draft lifecycle lock covers upload/remove/prepare/TTL, then releases before acquiring Project lock. Metadata updater revalidates current Project/Task/removal membership and prepared regular-file references, merges only supplied fields, and commits atomically. Never delete old saved files before metadata succeeds. Successful text/status updates preserve file metadata and bytes.
- Commit outcome: ProjectStore observes rename as described in the persisted-data section, so normal precommit failure and confirmed commit with a finalization warning are distinct. Do not infer uncommitted from an exception alone. If an outcome still cannot be proven (process interruption or a provider outside this contract), retain prepared bytes and original drafts; do not remove any potentially committed reference. They are unpublished unless current metadata names them. After confirmed success, clean consumed drafts and removed copies best-effort; cleanup failure must not turn a committed mutation into fake rollback or resend. Log scoped cleanup failure; inaccessible unreferenced owned bytes may remain until scoped housekeeping or explicit deletion, no secure-erasure guarantee.
- Draft TTL is 24h per-file mtime, as existing behavior. Housekeeping under the draft lifecycle lock removes expired draft files and corresponding manifest entries; remove manifest/directory only when expired/empty. Cancel discards draft uploads best-effort; TTL covers abandoned/offline cleanup. Never TTL-expire saved references. Unpublished prepared copies older than 24h may be reclaimed only by Task-scoped housekeeping after a fresh locked reference check during explicit context operations; ordinary description/status/Done tools do not trigger this cleanup. Never scan all history at startup or delete files solely from directory enumeration. Missing/failed proof preserves bytes.
- Explicit Task/Project deletion captures removed metadata, commits deletion, then removes only contained owned-copy namespaces/files; never original workspace paths or unrelated memory. Same generated final name is never rebound from old metadata by a caller. Done retains files and performs no byte/runtime cleanup. Failed deletion preserves referenced records/bytes; post-commit cleanup failure is distinct from metadata failure.

### Project form API
Extend existing create/update inputs with optional workspace rows `{workspaceId,description}`. Omission means existing current API semantics (create none/edit preserve), not a compatibility branch; supplied rows mean the intended form aggregate. Resolve added registered IDs through WorkspaceManager, reject duplicates, keep existing root snapshots/addedAt for retained links (including now-unregistered links), and allow their description edit/unlink. New IDs require registration. Save Project details/links inside the same current-record updater, preserve latest Tasks; don't replay separate link mutations as an apparent atomic form Save.

New folder remains normalized metadata registration. Editor holds raw paths until Save, then uses existing bound workspace create/ensure operation for each new path before the Project command. Keep the captured-client binding check before dispatch/publication as a bounded consistency guard for the existing action; this is not a new same-window node-switch or workspace recovery path. Registration and Project JSON are separate existing owners: if registration succeeds but Project Save fails, Project record stays unchanged and normal registered metadata may remain for retry. Do not invent distributed rollback, claim a folder was created, or silently unregister/delete a folder. Cancel before Save sends no registration/Project mutation. Individual current workspace-link APIs remain direct current operations through ProjectService; no obsolete method wrappers.

ProjectView/GraphQL adds computed `taskCount=tasks.length` alongside openTaskCount; same compound aggregate read, no persisted total. Delete warning uses all-Task count and an explicitly fresh Project read when opening confirmation, with loading/error preventing a stale fallback count. Count is truthful as of that read, not a new freeze/expected-revision deletion policy. Container deletion still deletes current embedded Tasks atomically without runtime cancellation.

### Renderer reads, routes and lifecycle
- Replace `/projects/[id].vue` with `[id]/index.vue`; add ordinary `/projects/new`, `/:id/edit`, `/:id/tasks/new`, `/:id/tasks/:taskId` (index route), `/:id/tasks/:taskId/edit`. Routes are thin identity/mode entries. Existing feature middleware covers every /projects prefix; do not alter shell/sidebar or auto-enable it.
- ProjectEditor shares create/edit direct form, repeated workspace row component and origin-tab/focus hints. TaskEditor shares create/edit composer; TaskDetail is saved-state/read-only-status/inline confirmation, not an overloaded legacy overlay. Save/create/delete notices use one composable with exact 3000ms, role=status, no focus steal, marker removal preserving other query/tab, disposed timers. Keep ProjectDialogFrame only for actual destructive dialogs.
- Task search is transient per Project in ProjectTaskStore, cleared on node invalidation; not persisted domain data. Cancel/back/detail navigation retains it. Successful create clears it before returning to full same-Project board. Refresh never clears it. Derive lane groups/counts from current matching Tasks, and Project all/open totals from full unfiltered list.
- Add `refreshTasks(projectId)` distinct from cache-sharing entry reads. Always dispatch a physical network-only query with `context:{queryDeduplication:false}` (existing production pattern), rather than return cache/join a prior entry promise. Maintain per-binding/Project latest read sequence, write generation and deletion/invalidation epoch; capture generation at dispatch and publish only if current. Increment write generation at mutation start and settlement so any older read cannot replace a newer successful local mutation. Discard old/inactive request bookkeeping only if its own token matches; never clear newer pending state in an old finally.
- List state distinguishes hasLoaded/initialPending/refreshPending/error and retains last successful Tasks on refresh failure (including successfully loaded empty lists). Render error with previous rows clearly not refreshed, persistent actionable retry/Refresh; never turn failure into empty success. Repeated Refresh disabled while that Refresh pending, aria-busy/pending feedback. Initial load failure with no prior success uses existing recovery state. No auto polling/subscription, mutation or resource effect.
- Before any read/write, capture bindingRevision and bound client/endpoints; await readiness then verify the captured binding **before dispatch**, then again before publishing or navigation. Preserve the existing synchronous binding invalidation watcher. A mismatched token cannot publish rows/errors/counts or dispatch a draft to a different node; this is the approved isolation/guard contract, not a supported same-window rebind journey. No new switching/recovery state or navigation is added. An already dispatched request may finish at its captured endpoint; no cancellation/undo guarantee. Independently guard ordinary route/Project/draft lifetime and newer local writes. Task-detail read may use complete projectTasks then exact Task selection; no fourth agent get tool or extra GraphQL get query required.
- Centralize Task cache publication for fetch and successful local mutations. Apply current returned Task to latest loaded list; when no complete list has been loaded, fetch a complete current snapshot before claiming totals. On current valid snapshot, update both Project counts. ProjectStore keeps per-Project count publication generation; Project responses that started before a newer Task-count publication preserve those newer counts while updating other Project fields. Prevent old Project list reads from resurrecting deleted cache entries via mutation/read generation, as for Task lists. No count snapshot becomes a Task-status/liveness authority.
- `useProjectTaskDraft` owns local text, saved refs/removal mask, draft-upload refs, pending operations and lifetime token. File add/drag/file-paste uses real FormData on captured same-node transport; do not intercept ordinary text paste. Use neutral file icon/type utilities without AgentContext or run-owner coercion. Authoritative server bytes supply saved previews; object URLs are ephemeral blob views and revoked on remove/change/unmount. Missing/failed preview does not invent saved bytes. Required text remains, pending file add/capture/transcription/save blocks own submit; typed text survives failure. Cancel removes only unpublished draft resources, never saved refs until explicit Save.
- Task REST client captures REST endpoint and active remote credential at creation and uses existing fetchWithRemoteAccessCredential; reject normal dispatch on a mismatched binding token as invariant preservation. Best-effort Cancel discard always addresses its own captured draft endpoint, never the current endpoint of another owner; this is ordinary draft disposal, not node-switch recovery. Never recalculate origin/credential after await or fetch arbitrary locator URLs; build validated Task endpoints. No global ApiService/credential policy refactor.

### Voice integration
New `VoiceTranscriptTarget={key,isCurrent,appendTranscript}` plus request source composer/project-task/settings-test replaces AgentContext destination storage. Composer call sites make a sink from their real context/current composer lifetime; Task draft makes a sink from captured node/route/draft generation. Move generic button into components/voiceInput, update AgentUserInputTextArea/ChatComposer and TaskDescriptionComposer; preserve existing button availability/styling/settings behavior. No wrapper at the old path and no alternate microphone provider.

Keep one capture/transcription at a time. Separate operation generation/target invalidation from capture disposal used before transcription. On explicit Cancel/unmount/route or target-lifetime change invalidate the sink and settle/cancel pending audio flush, stop media tracks/close AudioContext. Captured-node eligibility is a bounded sink check, not a new node-switch-triggered lifecycle or event subscription. Existing Electron transcribe request may be uncancellable: discard its late text, retain global busy until that promise settles, and clear only its own in-flight operation. Check operation ID and target.isCurrent before every result/error publication and text append; cancellation must not strand isTranscribing or an unresolved flush promise. Merge transcript into current editable text with existing mergeTranscriptWithDraft, no autosave/send/audio persistence/install/cloud provider. Test existing agent composer/settings as well as Task sinks; real optional extension checks require an isolated desktop, not a sample transcription.

## Interface Boundary Check

| Interface group | Singular responsibility | Explicit identity | Selector risk | Action |
| --- | --- | --- | --- | --- |
| Three tools | Yes, distinct read catalog/list/one-record command | Current node and explicit Project/Task | Low | Strict branch/presence parsing, no guessed Project |
| Manual Task save | Yes | Project+Task, draft owner and explicit file delta | Low | No replacement snapshot/status from UI |
| Context draft/read | Yes | Project+draft or Project+Task+filename | Low | Dedicated routes/store, no ambiguous run ID |
| Project aggregate form | Yes, Project details/links | Project ID plus registered workspace IDs | Low | Preserve current Tasks/snapshots under lock |
| Voice target | Yes, editable text destination | Lifetime key/currentness | Low | No AgentContext-shaped Task/fallback sink |
| Refresh/count publication | Yes, scoped current fetched projection | Binding/Project/read/write token | Low | Never attach totals to a status-filtered list |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift risk | Action |
| --- | --- | --- | --- | --- |
| Durable Task | ProjectTask / ProjectTaskService | Yes | Confusion with delegated task plan | Use qualified names and separate tool names |
| Task-owned files | ProjectTaskContextStore/Layout | Yes | Generic run storage reuse | Namespace under Projects, no fake run |
| Tool contract | ProjectTaskToolContract / manifest | Yes | Manager-specific packaging | Three general operations only |
| Editable voice destination | VoiceTranscriptTarget | Yes | Generic AgentContext accumulation | Small explicit sink, settings-test separate |
| Board row | ProjectTaskRow | Yes | Legacy card presentation | Rename/remove card |

## Existing Capability / Subsystem Reuse Check

| Need | Existing area | Decision | Reason / new ownership justification |
| --- | --- | --- | --- |
| Status/filter/identity write | Projects | Extend | Existing aggregate and invariant owner |
| Native/MCP tools | agent-tools/registry/session | Extend | Existing registration/catalog/exposure, no new gateway |
| Task bytes | Projects plus neutral context-files policy | Create new Task-owned layout/store; reuse policy | Run owner roots/validators cannot supply durable Task identity; no parallel Task DB |
| Upload byte limits/path guards | context-files | Extract/Reuse | Same MIME/name/stream/containment policy, no duplicate list |
| Local voice | voiceInputStore/extension | Extend | One actual capture provider, sink not AgentContext |
| New folder | WorkspaceManager/store | Reuse | Existing normalization/registration semantics, no mkdir |
| Manual UI | Projects components/routes | Extend/replace | Approved pages/board, retain shell/destructive dialogs |
| Ordering/counts | Project/Task web stores | Extend | Existing node/caches; no event system or scheduler |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| Server Projects domain/services/stores | Project/Task invariants, record/files commit, known projection | DS-001/002/004/005/009 | Extend with Task context concern |
| Server agent-tools + runtime exposure | Input/registry/native/MCP/selection mapping | DS-001/002/007 | Extend |
| Server API | Typed GraphQL commands/reads and Task file REST | DS-004/005/006/009 | Extend thin transports |
| Server neutral context-files | Shared byte policy/writer/containment, existing run uploads | DS-009 | Reuse/extract; run owners unchanged |
| Web Projects | Routes/components/authoring, domain caches, notice/context transport | DS-004/005/006/010 | Extend/replace |
| Web voice | Single local capture, explicit text target | DS-008 | Bounded refactor |
| Existing workspace/capability/collaboration | Registration/visibility/discovery/delegation | DS-003/004/007 | Reuse; bounded workspace cache guard only |

## Draft File Responsibility Mapping

| Candidate | Owner | Concern | Reason for file / reuse |
| --- | --- | --- | --- |
| projects/domain/models.ts | Projects | Task/Project views/commands | Existing model authority; extract tight file metadata type |
| projects/services/project-task-service.ts | Task | Patch/status/filter/context orchestration | Current Task boundary; IO kept out |
| projects/context/* | Task context | Initially layout+bytes+manifest in one candidate | Split path mapping from IO lifecycle, reuse neutral byte policy |
| agent-tools/project-tasks/* | Tool boundary | Names/schema/parse/native/operations | Contract imported by runtime, operations not imported there |
| web Task page/form candidate | Projects UI | Initially read/edit/create draft | Split saved-detail and editor lifetime; share composer |
| voiceInputStore/request candidate | Voice | Captured target | Extract small destination contract and generic button, keep one capture owner |
| ProjectTaskStore/count candidate | Web cache | Fresh reads and state projection | Stay in existing stores, no general async framework |

## Reusable Owned Structures Check

| Repeated structure | Shared file | Owner | Why | Redundancy/overlap removed | Must not become |
| --- | --- | --- | --- | --- | --- |
| Tool names/schema/raw parse | agent-tools/project-tasks/project-task-tool-contract.ts | Tool boundary | Same native/MCP contract, static exposure imports | Yes; one authoritative schema/parser | Domain service/runtime singleton import |
| Task file metadata/compound locators | projects/domain/project-task-context.ts | Projects | Store/GraphQL/tool/file routes share meaning | Yes; no repeated IDs/path/URL persisted | Run-owner union with optional Project fields |
| MIME/filename/limit/stream | context-files/domain/context-file-upload-policy.ts + services/context-file-upload-writer.ts | Neutral bytes | Existing run and new Task upload | Yes; one allowlist/writer | Business owner selection |
| Voice destination | web types/voiceInput.ts | Voice | Composer/Task/settings shape is explicit | Yes; no fake AgentContext | Optional-field catch-all |
| Success timer/query cleanup | web composables/projects/useProjectNotice.ts | Project UI | Forms/detail/board identical feedback | Yes; no repeated timer/router policy | Task persistence or modal manager |
| Saved-file rendering/icons | TaskContextFiles.vue + existing neutral contextAttachmentIcons | Project UI | Editor/detail share file view | Yes, draft/saved identities remain distinct | Generic run resolver/client |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning/field? | Redundancy removed? | Parallel risk | Constraint |
| --- | --- | --- | --- | --- |
| ProjectTask / context metadata | Yes | Yes, Project ID and locator/path absent in stored Task | Low | No title/assignee/run/dependency fields |
| ToolTask projection | Yes | Yes, metadata plus derived references only | Low | Projection not second authoritative record |
| Create vs update/context delta | Yes | Yes, field presence explicit | Low | Unknown provided ID never creates; draft add differs from saved remove |
| ProjectView counts | Yes | Yes, both derived from same Tasks | Low | open count not deletion total |
| Voice sink | Yes | Yes | Low | Destination callback/lifetime only, audio state stays in store |
| Client request tokens | Yes | Yes, no persisted revisions | Low | Scope counters to binding/Project/operation, not runtime workflow |

## Final File Responsibility Mapping
Paths below are relative to package source unless prefixed. New filenames are target design, not claims of existing code.

| File/group | Area / boundary | Concrete responsibility | Cohesion/reuse |
| --- | --- | --- | --- |
| server projects/domain/models.ts, project-errors.ts; new project-task-context.ts | Domain | Exact commands/status/errors, Task metadata/identity/locator contract | Current subject definitions, neutral byte names |
| server projects/stores/project-store.ts; persistence/file/store-utils.ts | Persistence | Known-field decode/exact write, locked current records, bounded after-rename commit observation | Existing writer/locks with optional non-throwing observation; no business rules/global caller behavior change |
| server projects/services/project-task-service.ts | Task authority | Complete/filter/read/patch/TODO/save/delete, context orchestration and membership | Internal context store, existing aggregate |
| server projects/services/project-service.ts | Project authority | Summaries, aggregate links, both counts, Project delete cleanup | WorkspaceManager, shared byte owner |
| new server projects/context/project-task-context-layout.ts | Task file persistence | Safe encoded roots/names/locators/ancestor validation | Neutral containment primitives |
| new server projects/context/project-task-context-store.ts | Task byte lifecycle | Draft manifest/locks/upload/read/immutable prepare/cleanup/TTL | Layout and shared upload writer; no Project writes |
| new server agent-tools/project-tasks/project-task-tool-contract.ts | Tool boundary | Constants, schema, strict parsing, argument types | No service/runtime imports |
| new server agent-tools/project-tasks/project-task-tool-manifest.ts | Tool boundary | Three operations/service invocation/result/error projection | Shared parser, services, file access projection |
| new server agent-tools/project-tasks/project-task-tools.ts | Native entry | Three small classes/shared preparation, registerProjectTaskTools | BaseTool/manifest, no new global base behavior |
| new server agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts | MCP entry | Same manifest, structured JSON/errors, static collision policy | Existing adapter/catalog |
| server startup/agent-tool-loader.ts; shared/runtime-agent-tool-exposure.ts; MCP session registry; native collaboration filter; Claude session tooling options | Runtime composition | Load/select/clone/allow exact new names | Contract only; automatic collaboration unchanged |
| server api/graphql/types/projects.ts and project-tasks.ts | GraphQL entry | Counts/aggregate form/context fields, direct current service mapping | withProjectErrors, no stores |
| new server api/rest/project-task-context-files.ts; api/rest/index.ts | HTTP entry | Dedicated Task draft/read routes, multipart/response mapping | Task service, existing auth/global multipart composition |
| new server context-files/domain/context-file-upload-policy.ts and services/context-file-upload-writer.ts; existing upload service/draft cleanup constants and compositions/build-studio-server.ts multipart limit | Neutral byte policy | Move MIME/name/limit/TTL constants and bounded stream writer | Existing run-owner layout/locator unchanged |
| web types/project.ts; GraphQL Project/Task fragments/inputs; projectStore.ts/projectTaskStore.ts | Client model/request | Context/count DTOs, scoped writes/fresh reads/search/ordered publication | Bound Apollo; no imported server types |
| new web services/projects/projectTaskContextClient.ts | Task transport | Captured node/credential, validated REST endpoints, multipart/blob/draft requests | Existing authorized fetch; no generic gateway/client deliverable |
| new web composables/projects/useProjectTaskDraft.ts, useProjectNotice.ts | Draft/feedback lifecycle | Text/files/pending lifetime, explicit add/remove mask, notice disposal | Task stores/context client/voice sink |
| new web components/projects/ProjectEditor.vue, ProjectWorkspaceEntry.vue | Project form | Direct New/Edit, same repeated source rows/focus | Current workspaces and Project store |
| new web components/projects/ProjectTaskEditor.vue, ProjectTaskDetail.vue, TaskDescriptionComposer.vue, TaskContextFiles.vue, ProjectTaskRow.vue | Task UI | Separate draft/read/delete/composer/file/row concerns | Approved UX/VIS, real stores/voice/files |
| existing web ProjectsList/ProjectCard/ProjectDetail/ProjectWorkspacesPanel/ProjectWorkspaceRow/ProjectTaskBoard.vue | Projects display/navigation | Page links/origin hints/total delete count/continuous lanes/Refresh | Preserve shell/tabs/destructive frame |
| web types/voiceInput.ts; voiceInputStore.ts; components/voiceInput/VoiceInputButton.vue; AgentUserInputTextArea.vue / ChatComposer.vue | Voice boundary | Sink contract/generation/disposal, updated explicit composer adapters | Existing local extension/merge/capture primitives |
| web workspace.ts createWorkspace action | Existing workspace boundary | Preserve captured client; bounded token check for cache/error/current continuation | No registry/registration meaning change, new binding owner or node-switch recovery |
| ordinary pages/projects route entries | Route transport | ID/mode props and top-level rendering | No non-outlet parent/duplicate state |
| en/projects.ts, zh-CN/projects.ts and impacted voice labels; server docs/modules/projects.md / docs/modules/agent_tools_mcp_server.md / web docs/projects.md | Labels/docs | Truthful real operation and new contract documentation | No sample/mock copy or marketing scope |

## Applied Patterns
Use current repository/service and adapter/manifest patterns; immutable byte preparation with metadata commit, per-owner draft locks, scoped generation for async projections and small voice text sink. No Task execution state machine, retry queue, event bus, generic draft framework or Saga.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Ownership / contents | Why here / must not contain |
| --- | --- | --- | --- |
| autobyteus-server-ts/src/projects/domain/ | Folder | Existing domain + project-task-context.ts | Project/Task types, not execution/run owner types |
| autobyteus-server-ts/src/projects/context/ | Folder | New layout and context store | Concrete byte lifecycle internal to Projects, not API/Task status coordinator |
| autobyteus-server-ts/src/projects/services/ and stores/ | Folders | Extend existing governing services/current aggregate | Domain/persistence separation; no transport |
| autobyteus-server-ts/src/agent-tools/project-tasks/ | Folder | Three compact contract/manifest/native files | Tool boundary at same level as discovery/delegation; no Manager package |
| autobyteus-server-ts/src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts | File | Static adapter projection | Existing MCP provider family, no duplicated domain logic |
| autobyteus-server-ts/src/api/rest/project-task-context-files.ts | File | New dedicated Task file HTTP routes | Transport owns response mapping, not file layout directly |
| autobyteus-server-ts/src/context-files/domain/context-file-upload-policy.ts and services/context-file-upload-writer.ts | Files | Neutral byte policy/execution | Existing byte concern, no Task/run identity guessing |
| autobyteus-web/components/projects/ | Folder | New form/detail/composer/row files and existing display extensions | Compact feature UI, domain state remains in stores/drafts |
| autobyteus-web/composables/projects/ and services/projects/ | Folders | Authoring/notice lifecycle and scoped Task file transport | Different concerns explicit, no catch-all UI manager |
| autobyteus-web/components/voiceInput/VoiceInputButton.vue and types/voiceInput.ts | Files | Generic existing voice entry/sink | Not named agent-only; no duplicated audio service |
| autobyteus-web/pages/projects/new.vue, [id]/index.vue, [id]/edit.vue | Files | Project routes | Replace old [id].vue, preserve feature prefix; no overlay fallback |
| autobyteus-web/pages/projects/[id]/tasks/new.vue, [taskId]/index.vue, [taskId]/edit.vue | Files | Task routes | Separate ordinary content pages; no invisible parent without outlet |
| autobyteus-server-ts/tests/unit/projects/, tests/unit/agent-tools/, tests/integration/api/rest/, tests/e2e/projects/; colocated web tests and web tests/e2e/ | Folders | Planned durable tests | Match TESTING.md; not user data/prototype fixture imports |

Concrete changed runtime source paths listed above use their existing package prefix: `src/agent-execution/shared/runtime-agent-tool-exposure.ts`, `src/agent-tools/mcp/agent-tool-mcp-session-registry.ts`, `src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts`, `src/agent-execution/backends/claude/session/claude-session-tooling-options.ts`. Any consumer constructing exposure literals/types must add the new selected array; keep descriptor authority rather than fallback new tools automatically. No core source modification is designed.

## Folder Boundary Check

| Folder | Depth | Clear? | Split/mix risk | Justification |
| --- | --- | --- | --- | --- |
| Projects domain/services/stores/context | Domain-Control / Persistence-Provider | Yes | Low | Existing authority plus concrete byte ownership, not flat APIs/IO blob |
| agent-tools/project-tasks and mcp/providers | Transport/adapter | Yes | Low | Shared semantic contract with native/MCP wrappers |
| context-files/domain/services | Off-Spine byte policy | Yes | Low | Only proven neutral extraction, run owners not generalized |
| web components/projects | Feature UI | Yes | Low | Related presentation files, no extra intermediate modules |
| web stores/composables/services | State / draft lifecycle / transport | Yes | Low | Explicit async authority/draft boundary, no parallel Task repository |
| web voiceInput | Existing shared capture | Yes | Low | Sink/button extend one concrete owner, not common catch-all |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoid | Reason |
| --- | --- | --- | --- |
| Status patch | `{project_id:'p',task_id:'t',status:'IN_PROGRESS'}` merges under lock | UI/caller sends old Project.tasks array | Independent agent edits/files/status preserved |
| Unknown ID | Supplied missing task_id → TASK_NOT_FOUND | Silently create because not found | Identity branch approved |
| File delta | Add draft filenames and remove current saved filenames on explicit Save | Finalize REST first, then unrelated GraphQL snapshot write | References publish only with Task metadata |
| File ownership | Project+Task+opaque filename → membership → contained regular file | Pretend Task ID is agentRunId or accept client absolute file path | No execution dependence/cross-owner escape |
| Refresh | Click → fresh physical query → generation guard → current data with same search | Return cached/in-flight earlier promise, clear rows on error | Agent writes and truthful recovery |
| Voice | Captured lifetime sink + local transcription + currentness guard | A Task-shaped AgentContext with late unconditional mutation | One capture owner; no hidden data destination |
| Routes | `[id]/index.vue` alongside `[id]/edit.vue` | `[id].vue` with no NuxtPage outlet and child folder | Approved content actually renders |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism considered | Why | Decision | Replacement |
| --- | --- | --- | --- |
| Alias old create_task/update_task_status names | Superficial reuse | Rejected | Exact new three names and legacy denylist |
| Keep overlay if new route fails | Incremental UI shortcut | Rejected | Clean page routes, remove imports/components |
| Fake run-owner union/AgentContext | Reuse existing upload/voice code | Rejected | Task-owned context plus explicit voice sink |
| Version-field/migration/old-file fallback | New context schema | Rejected | Truthful optional absence/known projection in same file |
| Dual Task-file store outside authoritative metadata | Apparent easy attachments | Rejected | Immutable owned bytes referenced only by committed Task metadata |
| Native-to-MCP/CLI wrapper | Earlier exploration | N/A, explicitly deferred | Native current service + existing MCP adapter |
| updateTaskDescription compatibility service | Existing GraphQL method name | Rejected | Resolver maps direct current updateTask; retain valid API subject, not obsolete service |
| Scripted sample voice/object URL as storage | Prototype fidelity shortcut | Rejected | Local extension and real server bytes; URLs display blobs only |

## Derived Layering
Server transport/adapters → Projects domain services → internal JSON/byte providers → existing filesystem primitives. Runtime selection uses static tool contract, not Project internals. Renderer routes/components → owned draft/request state → captured GraphQL/REST/voice boundaries. Workspace and execution remain separate authorities. Layers follow these spines, not arbitrary directory symmetry.

## Change / Refactor Sequence
1. Lock approval/reference basis and preserve existing Project/Task fixture/boundary tests. Add bounded commit observation to the existing JSON provider/ProjectStore without changing unrelated callers; prove pre-rename failure and post-rename finalization warning. Extract neutral byte policy/writer and add tight context type; wire existing multipart composition and draft cleanup constants to that one policy. Known-field reader/exact writer tests prove no migration.
2. Add Task-owned layout/draft/byte store and path/membership/fault tests; no APIs or tool names should publish fake usable files while unfinished.
3. Extend Task service patch/filter/context commit/delete and Project service summary/aggregate links/counts. Test concurrent independent writes, failure-before-commit and uncertain-after-rename retention. Update old no-status-method assertion to approved behavior, not remove preservation tests.
4. Extend GraphQL/manual context fields and new REST routes; use services only. Add byte/read/restart/cross-identity/MIME/oversize/expiry/Cancel and deletion tests. Retain run-context and architectural boundaries.
5. Add shared three-entry tool contract/manifest/native classes/MCP provider, registration and exact selected exposure projections. Verify actual native prepare+execute/MCP result+error equivalence, legacy filtering, selected-only availability and default-off.
6. Refactor existing voice destination/button/call sites and scoped Task draft/transport; verify late-operation cancellation and existing composer/settings regressions before wiring Task UI.
7. Replace primary UI overlays/card imports and routes clean-cut; aggregate direct workspace editor, real composer/detail/delete, transient per-Project search, notices and approved visuals. Add fresh Refresh/cache/count/binding guards; remove obsolete authoring/tests/labels rather than ship parallel paths.
8. Implementation owner renders exact approved UI plus bounded Refresh with normal entry and actual data; scoped tests/build/lint/typecheck, then independent source review and API/E2E per selected route. Delivery owns docs/final verification/integration/release/cleanup, not this design turn. No installed default enable, remote push or Product runtime restart is authorized here.

## Key Tradeoffs
- Existing JSON/lock retained over a new Task database: satisfies practical complete-list workflow and preserves identity/location; no high-volume/concurrency capacity promise.
- Task-owned context store plus neutral byte reuse over a generic run-owner union: slightly more concrete code but avoids execution/migration coupling and fake identity.
- Immutable copies before metadata versus a new journal/Saga: normal crash safety keeps saved references usable; uncommitted/inaccessible leftovers need bounded scoped cleanup, not blind rollback.
- Aggregate Project form command over a sequence of link mutations: correct save boundary for one form; workspace registration remains its existing separate authority and may survive a subsequent Project error.
- Client generations/physical Refresh versus server event subscription: explicit user action and correct returned snapshots now, live updates intentionally deferred.
- Native local preparation override over changing core BaseTool: matches domain validation/errors without expanding global tool semantics; native preparation tests are essential.
- Separate editor/detail and explicit draft ownership over porting prototype stores: exact UI preserved with real persistence, at the cost of substantial integration/testing.

## Risks
- High-risk file containment/metadata-byte atomicity and uncertain commits: verify failure injection and current membership; never delete potentially committed copies on a catch alone. Cleanup failures preserve inaccessible bytes; no secure erasure claim.
- Whole-file lock timeout (10s) and unmeasured volume: prepare byte copying outside Project lock, commit only validation/metadata. No new Task/file count cap, pagination or benchmark claim.
- Late route/Project/read/write/voice operations: capture endpoints/generations and gate dispatch/publication; preserve current-node isolation without a new same-window switching premise. Task update response alone is not a complete list/count. Electron transcription may be uncancellable; late results must be ignored and global busy eventually cleared.
- Registered workspace metadata may remain after failed form save; no real directory creation or atomic cross-registry saga promised. Preserve unavailable saved links.
- Product fixture/prototype coupling and source pin e9aa4a7 versus e04cfef: never import mock stores or advertise new parity/production/phone pass. Exact UI and Refresh addition need production rendered assertions.
- User-owned external Manager can choose poor status ordering or duplicate creates after uncertain delivery; this ticket has no assignment/retry/completion assurance layer. Done is not proof of engineering acceptance or resource release.
- Expanding scope during implementation/review: use approved IDs, keep deferred policies non-authoritative. Missing real optional voice/device capability is reported, not passed using sample text.

## Guidance For Implementation
Use the existing isolated workspace/source conventions; do not edit Product-owned artifacts or install/toggle the user's feature. All file names above are proposed concrete targets; implementation may make evidence-backed local names/cohesion adjustments, but material ownership/interface/transition changes return Design Impact. Keep explicit presence parsing and current-record patching; test the true runtime entry, not just shared helpers. Do not introduce a fourth agent tool or agent attachment mutation because internal manual APIs exist. No prototype fixture data becomes production seed/state.

### Verification intent (planned, not executed)
Follow root TESTING.md and package AGENTS; non-watch commands, isolated test-owned roots/databases, screenshots secondary to assertions. Exact new test names may be refined by test owners within these owners/layers.

| Scope / AC | Layer and durable target | Required assertions / limits |
| --- | --- | --- |
| AC-001/010/021/022 | Server unit startup/exposure/native/MCP catalog/session tests and new tests/unit/agent-tools/project-tasks/*.test.ts | Three exact selected tools, protected collision, zero/partial selection, default flag off, actual native preparation/result/error parity, Claude clone/fallback, legacy tools still removed |
| AC-002/003/008/020 | tests/unit/projects/project-task-service.test.ts; tests/e2e/projects/projects-graphql.e2e.test.ts plus deterministic tool calls | TODO create/filter/empty/missing/invalid/unknown ID/same state/reset/reopen, no parent/context/unrelated writes, independent concurrent patches preserved, no spawn/stop |
| AC-009/012/019 | New tests/unit/projects/project-task-context-store.test.ts and tests/integration/api/rest/project-task-context-files.integration.test.ts; isolated E2E real byte/restart | MIME/25MiB/truncation, wrong owner/traversal/symlink, server metadata, saved read/tool reference after restart, remove/Cancel/Done/Project delete, original workspace/history intact, precommit and post-rename failure/cleanup states |
| Continuity/migration boundary | Existing released Project fixtures + tests/architecture/projects-boundaries.test.ts + run context regression | Missing optional context and mixed three-state/no-Tasks data preserved; exact written keys, no schema version/run Task imports/global migration gate; unrelated malformed history doesn't create new Task startup admission |
| AC-013/014/017 | Colocated Project editor/workspace/cache/notice tests; browser dev-path probe | Dedicated pages, optional Existing/New direct rows, unavailable retained links, create/edit/Cancel tab/focus/search, truthful errors, 3000ms notice and no new folder bytes |
| AC-015/016/019 | Colocated Task editor/detail/row/composer/file tests; real-stack browser/isolated desktop | Description once/read-only status/no ID/dates, board continuous rows and 752px container behavior, create clears search/Cancel preserves, keyboard/inline delete focus, real saved bytes/previews, pending required text guard |
| AC-018 | voiceInputStore and generic button/draft tests + isolated worktree desktop instance | Optional extension availability/settings/permission/error/no speech, editable result/no autosave/audio retention, Cancel/route/late transcription, existing composer/settings and injected binding-token sink guards (contract only, not a node-switch journey), real configured local capture when available; missing capability reported not simulated pass |
| AC-025 and fetched counts | ProjectTaskStore/ProjectStore deferred-promise tests, existing production Apollo context test, real server-to-browser write/Refresh journey | Tool/API creates and changes TODO/IN_PROGRESS/DONE while board open; click starts new physical query, retains search/route, correct filtered lane/unfiltered total counts, loaded-empty/error retains old data, duplicate clicks, old request/local write/delete/route/Project ordering; separately injected binding-token guards and preserved synchronous watcher, not a product node-switch journey |
| AC-004 and preserved collaboration | Existing discovery/delegate integration only if affected | Installed eligible Team/address behavior unchanged, no Manager publication/model workflow needed |
| Rendered/full product | TESTING.md browser probes plus `pnpm --silent isolated-app start --build` and normal Projects entry on test-owned enabled node | Exact external VIS/UX states plus Refresh desktop/narrow, no horizontal overflow, true feature-off default elsewhere; stop only instances started. Narrow browser is not shipped phone validation |

Planned commands: server `pnpm -C autobyteus-server-ts exec vitest run <scoped paths> --no-watch`, web `pnpm -C autobyteus-web test:nuxt <scoped paths> --run`, repository-configured lint/typecheck/build, then deterministic `pnpm test:e2e` for real APIs and isolated desktop where required. No real model call or public Manager test is necessary to prove the new data tools; drive actual selected native/MCP adapters deterministically. This document is not a test report or implementation handoff.
