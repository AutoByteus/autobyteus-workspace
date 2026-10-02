# Design Review Report

## Review Round Meta

- Package: `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`; 2026-10-02.
- Upstream Requirements Doc: [requirements-doc.md](requirements-doc.md).
- Upstream Investigation Notes: [investigation-notes.md](investigation-notes.md).
- Upstream Solution Revision Record: [solution-revision-record.md](solution-revision-record.md).
- Reviewed Design Spec: [design-spec.md](design-spec.md), exact cumulative **SR-014**.
- Supplemental Task Artifacts Reviewed: [design-handoff-sr-014.md](design-handoff-sr-014.md); the complete inventory in investigation-notes.md; approval SR-010/013; historical Product handoffs, refinement SR-003–009/011/012 and deferred skill-cli-feasibility; external Product spec, approval/receipt/handoff, validation and historical review context. See supplemental verdict below.
- Relevant Solution Revision IDs: SR-014 design; SR-009/010 core approval; SR-012/013 Refresh approval; SR-001–008/011 historical scope/UX context.
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md).
- Current Architecture Review Revision ID: **ARCH-REV-001**.
- Current Review Round: **1**. Trigger: Solution Designer's Architecture Design Complete / Large / High handoff.
- Prior Review Round Reviewed: None; no prior canonical review report or revision record exists. No prior Pass inferred.
- Latest Authoritative Round: **1 — Fail / Design Impact**.
- Assigned workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`.
- Current-State Evidence Basis: source base `e04cfef23550c3b78286a53befc6bd5d71fb1061`; supplied checkpoint `2b01707ea2c06cf974bc7315e5f547f6e94094f5`; inspected HEAD `a3e516a9fff06a1c858e2a565cf8b132d37587a9`. The intervening diff only records the confirmed handoff receipt in design-handoff-sr-014.md; design/requirements/source are unchanged. Base-to-HEAD changes are ticket documentation only.
- Method: independent read-only source, contract, fixture/test-source and artifact inspection against architecture-reviewer design-principles and report template, including reachability Example 9. No production tests, runtime, uploads, microphone, installed profile, feature enablement, integration or push performed. Four representative final screenshots inspected; all 20 exact visual file locators verified present. This is design review, not implementation or acceptance validation.

## Routing Classification Review

- Task size: **Large**.
- Architectural risk: **High**.
- Classification rationale reviewed: multi-subsystem service/persistence/API/native-MCP/renderer/voice changes; new Task byte/reference transaction and async publication boundaries. Evidence supports both classifications independently of document/screenshot volume.
- Independent Architecture Review required by the classification: **Yes**.
- Classification evidence or correction required: None. Preserve Large / High through rework.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Contradicted in one material lifecycle premise**, not in the approved business intent. The remaining basis is confirmed.
- Approved requirements / intended behavior understood: SD-AP-001 approves the exact SR-009 core; SD-AP-002 approves the bounded SR-012 manual Refresh delta; UF-017 approves the unchanged manual UI supplement. Approval records distinguish intended behavior from prototype/production validation.
- Relevant existing behavior and evidence confirmed: embedded Projects/Tasks and locked atomic updates; description-only manual editing; visibility-only default-off flag; selected tool composition; separate collaboration/execution; run-owned uploads; optional local desktop voice; cached board reads; open-only count defect.
- Scope guardrail confirmed: active UC-001/002/003/007; exactly three native/MCP tools plus approved manual authoring/board/detail and Refresh. Manager/team creation, scheduler, assignment/run linkage, sidebar, Done resource stopping, CLI/client/skills, phone delivery and global modal removal stay excluded/deferred.
- Approved change / preserved outcome: explicit TODO creation and known-ID field patch; complete Project/Task reads; durable Task context; ordinary pages; workspace metadata registration; accurate deletion total; manual read-only Refresh. Identity/status/omitted context/workspace originals/history and existing collaboration remain protected.
- Every prospective blocking Design Impact finding traceable to approved authority: **Yes**, ARCH-F-001 protects REQ-009/018 and AC-025 without redefining their behavior.
- Remaining material ambiguity: no product decision is reopened. A design source claim incorrectly presents desktop in-window rebinding as supported; see MP-004 and ARCH-F-001. An ordinary clarification was delivered to the originating Solution Designer before verdict; that request does not itself resolve the canonical artifact.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass — capability service initializes false; feature middleware gates all Projects prefixes, not server CRUD | Pass — DS-007 leaves installation/default/API exposure policy intact | Confirmed | None |
| BEH-002 | System/User | Pass | Pass — manual CRUD exists; SD-AP-001 adds selected create/patch/filter with exact branches | Pass — DS-001/002/005 use current-record updates and preserve omitted fields/status/context | Confirmed | None |
| BEH-003 | System | Pass | Pass — existing eligible collaborator discovery and user-requested reuse | Pass — DS-003 preserves discovery, no invented addresses or Manager delivery | Confirmed | None |
| BEH-004 | System | Pass | Pass — existing fresh delegate/follow-up contracts | Pass — no dispatch/status callback, assignment or stopping added | Confirmed | None |
| BEH-005 | User | Pass | Pass — actual Projects components and UF-017 journeys | Pass — DS-004/005/006 replace pages/rows, retain shell/search/confirmations | Confirmed | None |
| BEH-006 | System | Pass | Pass — registry/catalog/session/native filter/Claude source plus SD-AP-001 selection authority | Pass — shared three-operation manifest and explicit projections | Confirmed | None |
| BEH-007 | User | Pass | Pass — direct workspace authoring approved; existing registration is metadata-only | Pass — aggregate Project command preserves current Tasks and retained link snapshots | Confirmed | None |
| BEH-008 | User | Pass | Pass — explicit voice/attachment/Cancel actions, AC-018/019, actual local IPC/upload policies | Pass — DS-005/008/009 separate Task bytes and voice sink; route/Cancel lifetime has independent support | Confirmed | Do not infer an additional node-switch lifecycle; ARCH-F-001 |
| BEH-009 | Deferred | Pass | Pass — SD-CF-012 explicitly defers CLI/client/skills | Pass — no active spine/deliverable/test obligation | Confirmed | None |
| BEH-010 | User | Pass — manual Refresh and binding safeguards remain approved | Fail only for the additional 'existing node-switch UI' witness; other triggers confirmed | Fail in premise explanation — DS-006/010 ordering model is otherwise coherent | Needs Correction | ARCH-F-001: separate real route/write lifecycle from unsupported desktop rebinding |

## Supplemental Artifact Coherence Verdict

Canonical external Product root: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations`. It is read-only and clean at receipt `f66efa9c5c1d9976137f6c134120529466b34e48`; UI `84ed47bac6877e2cdc6350cca789b0c30ffb55a3`. Source parity pin `e9aa4a7` is not re-certified as `e04cfef`. Historical Draft/open-policy language is explicitly as-of SR-002, not a current approval hold.

| Artifact | Purpose / Scope Clear? | Linked To Core? | Internally Complete? | Consistent With Core? | Status / Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| requirements-approval-sr-010.md / sr-013.md; refinement sr-009.md / sr-012.md | Pass | Pass | Pass | Pass | Pass | None — exact core/delta checkpoints and approval questions preserved |
| solution-revision-record.md; historical refinement sr-003–008/011.md and Product handoffs | Pass | Pass | Pass | Pass | Pass | None — superseded scope remains history |
| skill-cli-feasibility.md | Pass | Pass | Pass | Pass | Pass | None — deferred/non-normative |
| External ui-ux-spec.md and VIS-001–020 | Pass | Pass | Pass | Pass | Pass | None — all locators present; approved hierarchy, controls, 752px container threshold, notices and journeys retained; Refresh absence alone superseded |
| External handoff-notes.md / ui-brainstorm-record.md / prototype-ticket.md | Pass | Pass | Pass | Pass | Pass | None — PFI-001–007/UF-017/provenance distinguished from full requirements approval |
| External behavior matrix, final-browser-validation.json, integration-validation.json, final-build-output.txt | Pass | Pass | Pass | Pass | Pass | None — synthetic evidence only; recovered PI-005 not hidden |
| External runbook/change-log, requirement-impact, review-round-1/3/4/5/6, review-evidence including DATA-001 | Pass | Pass | Pass | Pass | Pass | None — rejected alternatives/historical screenshots do not become allowed variants; no mock-store dependency |
| External root prototype-bootstrap-report.md | Pass | Pass | Pass | Pass | Pass | None — distinct accepted source authority |
| design-handoff-sr-014.md | Pass | Pass | Pass | Pass | Pass | Carry this review/result in cumulative reroute; no prior Pass claimed |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present for current posture | Pass | Feature / Behavior Change with bounded prerequisite refactors | None |
| Root-cause classification explicit/evidence-backed | Pass | Missing status/file invariant; run-only owner and AgentContext voice boundary; count/read ordering; unknown-field spreading | Correct only the additional node-switch premise, ARCH-F-001 |
| Refactor/defer/no-refactor decision explicit | Pass | Patch owner, neutral byte policy, voice sink, request publication and obsolete UI removals; collaboration/workspace authority reused | None |
| Decision reflected in concrete design | Pass | Named owners/files, clean-cut removal and staged validation; deferred runtime/orchestration untouched | None |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade / Owner Clear? | Subject Naming Clear? | Ownership Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary reads, selected runtime through service/store to complete result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary one-record create/patch through atomic commit/result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary preserved external discovery/delegate/result/explicit status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Primary Project form/registration/aggregate save/return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Primary Task authoring/context/save/read/delete/return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Primary physical Refresh/service/guarded groups/counts | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Bounded selection/capability composition | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Primary and return local recording/transcript/current text | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Bounded byte preparation/metadata commit/scoped cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | Return/bounded request/write/count settlement | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Spines span meaningful outcomes, not just edited helpers. Structural readability passes do not override ARCH-F-001's premise failure.

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ProjectService / ProjectTaskService | Pass | Pass | Pass | Pass | Tools/GraphQL/REST use services; whole-Project authority cleans captured owned files without recursive same-lock Task delete |
| Task context store/layout | Pass | Pass | Pass | Pass | Bytes/manifest/paths internal; saved membership remains Project metadata |
| VoiceInputStore | Pass | Pass | Pass | Pass | One local provider; explicit lifetime sink, no Task-shaped AgentContext |
| Renderer Project/Task stores and draft owner | Pass | Pass | Pass | Pass | Centralized publication and compound draft transport, no component mutation/store bypass |
| WorkspaceManager | Pass | Pass | Pass | Pass | Registration lookup through existing authority; no registry JSON bypass/backedge |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server transport/tools → services → JSON/byte providers | Pass | Pass | Pass | Pass | Static contract can enter runtime; operation manifest owns invocation |
| Projects ↔ workspace/execution separation | Pass | Pass | Pass | Pass | Projects use workspace public lookup only; no execution/assignment/delegation coupling |
| Task context → neutral upload/path policy | Pass | Pass | Pass | Pass | Run-owner union/migration paths remain unchanged |
| Renderer → owned state/transport/voice | Pass | Pass | Pass | Pass | No core/server/prototype stores imported; new Task file transport not a generic deferred MCP client |

## Interface Boundary Verdict

| Interface / API / Method | Subject Clear? | Responsibility Singular? | Identity Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| list_projects | Pass | Pass | Pass | Low | Pass |
| list_project_tasks(project_id,status?) | Pass | Pass | Pass | Low | Pass |
| create_or_update_task | Pass | Pass | Pass | Low | Pass — absent vs known vs unknown ID branches explicit |
| ProjectTaskService patch/filter/create and manual GraphQL context delta | Pass | Pass | Pass | Low | Pass — manual API cannot set status or replace stale full arrays |
| Project aggregate form and counts | Pass | Pass | Pass | Low | Pass — omitted links preserve; explicit rows aggregate with current Tasks |
| Task draft REST / saved GET | Pass | Pass | Pass | Low | Pass — compound owner; no detached finalize or final byte DELETE |
| VoiceTranscriptTarget / settings-test specialization | Pass | Pass | Pass | Low | Pass |
| refreshTasks / centralized count publication | Pass | Pass | Pass | Low | Pass — physical read and unfiltered totals, subject to premise correction |
| Commit observation | Pass | Pass | Pass | Low | Pass — non-throwing synchronous observer immediately after rename; other callers unchanged |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Checked? | Reuse / Extension Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Task persistence/status and Project forms | Pass | Pass | Pass | Pass | Existing locked aggregate is authority, no parallel Task DB |
| Native/MCP registry/catalog/exposure | Pass | Pass | Pass | Pass | Thin adapters/shared manifest, exact allowlist, static collision protection |
| Task context bytes | Pass | Pass | Pass | Pass | New Task ownership needed; neutral MIME/writer reused, run owners not generalized |
| Voice capture | Pass | Pass | Pass | Pass | Local owner retained; destination interface tightened |
| Workspace registration and UI request caches | Pass | Pass | N/A | Pass | Existing owners extended, no Saga/global async framework |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Ownership Clear? | Reuse / Extend / New Sound? | Supports Right Owner? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Projects domain/services/stores/context | Pass | Pass | Pass | Pass | Invariants vs serialization vs byte lifecycle separated |
| Agent tools/runtime/API | Pass | Pass | Pass | Pass | Translation/selection only; actual native preparation included |
| Neutral context-files policy | Pass | Pass | Pass | Pass | Byte constraints, no business owner selection |
| Renderer Projects state/drafts/forms/routes | Pass | Pass | Pass | Pass | Current fetched model distinct from unsaved editing |
| Shared voice and existing workspace/capability/collaboration | Pass | Pass | Pass | Pass | Bounded destination change; no execution scope expansion |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Three-tool names/schema/parser/result | Pass | Pass | Pass | Pass | Static contract vs service invocation manifest |
| Task file metadata/compound reference | Pass | Pass | Pass | Pass | Projects-owned; derived locator/path not persisted |
| MIME/name/25MiB/24h/stream policy | Pass | Pass | Pass | Pass | Neutral context-files files; run sequencing stays run-owned |
| Voice target, file rendering, success notice | Pass | Pass | Pass | Pass | Small destination / feature rendering / timer owners, not a generic coordinator |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning / Field? | Redundancy Removed? | Overlap Controlled? | Core / Specialization Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| ProjectTask/context metadata | Pass | Pass | Pass | Pass | Pass | No redundant Project ID, title, assignment/run/status derivative |
| ToolTask | Pass | Pass | Pass | Pass | Pass | Read projection plus validated file locator/localPath, not another record |
| Create vs patch/context add-remove delta | Pass | Pass | Pass | Pass | Pass | Exact field presence; server manifest supplies metadata |
| Project counts | Pass | Pass | Pass | N/A | Pass | Derived total/open values, never persisted |
| Voice sink and client tokens | Pass | Pass | Pass | Pass | Pass | Operation/draft/request lifetimes, no persisted version/recovery state |

## File Responsibility Mapping Verdict

| File / Group | Responsibility Singular/Clear? | Matches Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| projects/domain/models.ts, errors, new project-task-context.ts | Pass | Pass | Pass | Pass | Tight current models/commands/errors |
| Project/Task services; project-store.ts; store-utils.ts | Pass | Pass | Pass | Pass | Service orchestration; known projection/locked persistence; optional commit observation |
| New projects/context layout/store | Pass | Pass | Pass | Pass | Paths separate from byte/manifest lifecycle, no HTTP or Project writes |
| Tool contract/manifest/native classes/MCP provider; loader/exposure/session/Claude/filter | Pass | Pass | Pass | Pass | Shared semantics and explicit selected composition; register provider in existing default provider list |
| GraphQL Project/Task and new REST route/index | Pass | Pass | Pass | Pass | Thin current-service transports |
| Neutral context policy/writer and existing run upload composition | Pass | Pass | Pass | Pass | One byte policy; no duplicated run ownership |
| Web DTO/GraphQL/request stores; Task context client; draft/notice composables | Pass | Pass | Pass | Pass | Authoritative fetched projection vs local edits/transport/feedback |
| Project editor/workspace entry and Task editor/detail/composer/files/row | Pass | Pass | Pass | Pass | Saved read vs draft and repeated presentation split |
| Existing display components/new route entries; generic voice button/store/adapters | Pass | Pass | Pass | Pass | Normal entry and one voice provider; no overlay/button compatibility wrappers |
| Localization/docs/durable tests | Pass | Pass | N/A | Pass | Current truthful operations; test layers follow TESTING.md |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Clear? | Folder Matches Owner? | Mix / Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server projects/domain, services, stores, context | Pass | Pass | Low | Pass | Existing subject with concrete internal byte concern |
| agent-tools/project-tasks and mcp/providers; API files | Pass | Pass | Low | Pass | Tool and transport family placement |
| context-files/domain/services | Pass | Pass | Low | Pass | Neutral byte policy only |
| Web components/projects, composables/projects, services/projects | Pass | Pass | Low | Pass | Feature presentation/draft/transport depth not arbitrary one-file-per-step layering |
| Web components/voiceInput, types/voiceInput; ordinary pages/projects | Pass | Pass | Low | Pass | Generic sink entry and index/edit routes replace non-outlet parent |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece Named? | Replacement Clear? | Removal Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Primary Project/Task/workspace authoring dialogs, Task cards | Pass | Pass | Pass | Pass | Direct form/detail/row replacements; genuine destructive dialogs retained |
| pages/projects/[id].vue | Pass | Pass | Pass | Pass | [id]/index.vue alongside ordinary child entries |
| updateTaskDescription domain method | Pass | Pass | Pass | Pass | Current updateTask field-mask boundary; valid GraphQL subject retained directly |
| Private duplicated byte policy; AgentContext-only voice request/button location | Pass | Pass | Pass | Pass | Neutral extraction / explicit sink and updated consumers |
| force/inflight reuse, failed-refresh erasure, open-only deletion count | Pass | Pass | Pass | Pass | Physical Refresh, retained error state and derived total |
| Retired task-plan names | Pass | Pass | Pass | Pass | Denylist retained; no compatibility aliases |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual Path / Legacy Retention? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Tools/UI/voice | No | Pass | Pass | No old aliases, overlay fallback, mock voice or fake AgentContext |
| Project persisted schema | No | Pass | Pass | Normal known-field projection and optional absence are not version compatibility branches |
| Existing valid manual APIs/collaboration/run file readers | No | Pass | Pass | Remain current separate subjects, not obsolete wrappers |

## Persisted-Data Transition Verdict

| Stored Subject | Approved Decision | Reader / Semantic / Invariant Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing projects.json / embedded Tasks | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Same location/IDs/three-state meaning. Released no-Tasks fixture and all-status fixture in project-service.test.ts inspected. New optional context absence means none; exact known-field writes |
| Saved Task context | New explicit upload-owned data; existing Tasks directly usable | Pass | Pass | N/A | Pass | Complete immutable bytes precede metadata; authoritative membership; absent/unavailable reference not guessed as path |
| Draft files/cache/search | Transient/rebuilt; 24h draft housekeeping | Pass | Pass | N/A | Pass | Saved refs never TTL-expired; Cancel preserves saved bytes; prepared leftovers require fresh reference proof |
| Workspace registry and unrelated histories/migration records | Not Affected | Pass | Pass | N/A | Pass | No source transformation, Task/run owner union or global startup gate |

Canonical data_migration_guideline inspected. Its tolerant projection/current-only/scoped admission rules support no migration; representative predecessor missing/already-current/warning/failed dispositions remain separate. Installed corpus/volume was not sampled and is not claimed. No journal/backup/corpus rewrite is required merely for an optional field.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup / Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Commit observation / policy extraction / context store before published APIs | Pass | Pass — no premature usable-file publication | Pass | Pass |
| Domain invariants → transports → selected native/MCP | Pass | Pass — real native prepare tests, default provider registration | Pass | Pass |
| Shared voice refactor → Task drafts → clean page/row routes | Pass | Pass — existing composer/settings regression before Task wiring | Pass | Pass |
| Physical reads/count publication → rendered real-stack validation | Pass | Pass — no polling or prototype service dependency | Pass | Pass |

## Example Adequacy Verdict

| Topic | Example Needed? | Present/Clear? | Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Status patch/unknown supplied ID | Yes | Pass | Pass | Pass | Exact branch and current-record merge |
| File delta/compound owner/metadata commit | Yes | Pass | Pass | Pass | No detached finalize, fake run or arbitrary client path |
| Refresh/voice/ordinary routes | Yes | Pass | Pass | Pass | Physical read vs joined request, lifetime sink vs AgentContext, index vs non-outlet parent |
| Node-switch production witness | Yes, because asserted material premise | Fail | Fail | Fail | ARCH-F-001; generic binding API/tests cannot supply the witness |

## Material Premise Validation

### MP-001 — External Task writes become visible only after deliberate read
- Related authority / behavior: REQ-018/AC-025, BEH-010; SD-CF-013 and SD-AP-002.
- Initiating basis: User/System; supported normal scenario.
- Independent trigger/support: selected agent explicitly creates/updates a Task while the user is viewing that Project; user clicks the approved Refresh toolbar control.
- Forward target path: selected native/MCP tool → ProjectTaskService/current-record commit → existing board cache remains unchanged → Refresh → physical non-deduplicated query → resolver/service/store → matching groups and full-list counts.
- Lifecycle/consequence: board can predate the external commit; joining an earlier read would not establish a click-initiated fresh read.
- Reachability: **Reachable**. Response: physical read plus truthful pending/error state; no live events or latency SLA.

### MP-002 — Earlier read settles after local mutation or Project navigation
- Related authority / behavior: REQ-009/012/018, AC-015/025; BEH-002/005/010.
- Initiating basis: User; supported normal/explicit async scenario.
- Independent trigger/support: ordinary board entry/Refresh followed by exposed Task authoring/Save or navigation to another Project through ordinary routes. These actions are independently approved, not invented from request counters.
- Forward target path: board query → user opens/saves Task or navigates → mutation/route owner updates current lifetime/generation → earlier query returns → guarded publication.
- Lifecycle/consequence: cached Task/count or active route may now be newer/different; older result must not erase a successful local change or populate the wrong Project.
- Reachability: **Reachable**. Response: request/write/deletion/lifetime tokens and token-matched settlement; no new workflow state machine.

### MP-003 — Voice result arrives after Task Cancel/Back
- Related authority / behavior: REQ-013/AC-018, AC-015; BEH-008.
- Initiating basis: User; supported explicit cancellation scenario.
- Independent trigger/support: approved Task composer mic/Stop and Cancel/Back; current optional desktop local voice IPC returns asynchronously.
- Forward path: mic → VoiceInputStore/worklet → flush/capture disposal → Electron transcription → user cancels/leaves Task draft → late result → sink validity check.
- Lifecycle/consequence: old draft no longer owns editable destination; existing stopRecording currently keeps a captured AgentContext after await, and cancellation omits transcribing.
- Reachability: **Reachable**. Response: distinct capture disposal/operation invalidation, flush settlement, discard late text/error, retain global busy until actual promise settles.

### MP-004 — Desktop Node Manager rebinds the same interactive Projects window
- Related authority / behavior: preserved node scoping REQ-009 and explicit AC-025 binding safeguard; BEH-005/008/010. These negative constraints do not create a new node-switch product surface.
- Initiating basis: User, claimed by design as 'existing node-switch UI'.
- Independent trigger/support checked: Node Manager exposes focus/open-node, not switch-this-window. `components/settings/NodeManager.vue:onFocusNode` invokes `electronAPI.openNodeWindow`. `electron/application/electronApplication.ts:openNodeWindow` focuses an existing node-bound window or creates a new one. Removing a node closes its window; renaming does not rebind its endpoint.
- Forward current path: Node Manager action → separate node-bound shell window → `plugins/20.windowNodeBootstrap.client.ts` → initializeFromWindowContext before interactive content → Projects route/query/draft on that fixed node. No in-place bindNodeContext call occurs on this path.
- Other caller checked: `stores/mobileNodeSessionStore.ts:bindSession` calls bindNodeContext for pairing/storage initialization on `/mobile` with its separate shell. Phone delivery is excluded here; that caller or a test fixture manually invoking the store is not an in-scope concurrent Projects switching witness.
- Lifecycle/consequence: opening/focusing another node does not change the original window's pending Project request/draft destination. The claimed same-window cross-node state is therefore absent from this supported path.
- Scenario validity: **Technically Possible but Unsupported/Contrived** for the asserted desktop scenario.
- Reachability: **Not Reachable**. Review consequence: do not use this scenario to justify new lifecycle/recovery machinery or a switching test matrix. Preserve the approved binding invariant/existing watchers; independently supported route/local-write/Cancel guards remain valid. Correct the canonical premise and distinguish consumers whose checks are invariant preservation from those requiring an actual new lifecycle witness. ARCH-F-001.

### MP-005 — Metadata commit is observed before post-rename finalization
- Related authority / behavior: REQ-009/014, AC-012/019; BEH-002/008; current atomic writer boundary.
- Initiating basis: Contract, exercised by explicit Task Save.
- Governing contract/support: successfully saved files stay readable; failed precommit writes preserve saved bytes. Current `updateJsonArrayFile` renames before `withFilePathLock` awaits close/unlink in finally. Those are distinct commit/finalization phases, not proof that arbitrary physical failures need recovery infrastructure.
- Forward path: Task save → complete immutable byte copies → locked metadata updater → rename commits refs → finalization completes/reports error → ProjectStore returns only proven committed rows or genuine precommit failure.
- Lifecycle/consequence: exception alone cannot authorize deleting potentially referenced bytes; observing successful rename makes the outcome truthful without rereading a later writer's state.
- Reachability: **Reachable as governing transaction contract**. Response: narrow in-memory non-throwing observation; best-effort postcommit cleanup, no journal/power-loss repair. Failure injection verifies phase behavior, not a new production trigger.

No additional premise search was used. Invalid compound file inputs and abandoned draft expiry are already independently approved AC-019/draft-housekeeping contracts: requested file membership/physical checks and scoped 24h expiry are proportionate. Hidden-store tampering, arbitrary corpus destruction, unlimited dispatch and Done stopping cannot drive a finding or added machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Unsupported desktop node-rebinding witness in design-spec.md material-premise table | Material gate requires supported origin and full lifecycle; otherwise implementation may add speculative machinery/tests | ARCH-F-001; no new requirements decision needed | Design Impact — unresolved |

## Review Decision

**Fail — Design Impact.** The business basis and most technical structure are coherent. One material premise contradicts the actual desktop lifecycle and must be corrected before implementation handoff. This is not a request to expand scope or remove the approved node-scoping/Refresh invariants.

## Findings

### ARCH-F-001 — Separate the supported async lifecycle from unsupported in-window node switching
- Type: **Design Impact**; severity: **Medium, blocking this architecture gate**.
- Approved authority protected: **REQ-009 / REQ-018 / AC-025**; related BEH-005/008/010. Also preserve AC-015/018 Cancel/voice outcomes.
- Scope status: **Within Approved Scope**.
- Required update changes approved behavior: **No**. No renewed user or Product approval requested.
- Affected behavior/contract: same-node authoring/read publication and approved Refresh stale-response safeguard; explicit supported route/write/Cancel lifecycle must remain distinct from a nonexistent switching journey.
- Evidence: design-spec.md line 64 classifies 'existing node-switch UI' / 'supported window node switch' as a witness for late reads, then uses binding/endpoints/currentness in DS-010 and renderer/workspace/Task draft continuation rules (lines 207, 288, 298, 301). Actual NodeManager/openNodeWindow/bootstrap/mobile callers are detailed in **MP-004**. The generic method/revision or synthetic node-switch test does not establish desktop reachability.
- Material-premise validation: **MP-004 — Not Reachable** for the asserted desktop scenario. MP-002/003 independently validate route/local-write/Cancel mechanisms and must not be weakened.
- Required update: split the combined premise into supported local-write/Project-navigation/Cancel conditions and the separately classified desktop node-binding condition. Remove the false source-supported switch claim. State which binding checks merely retain the approved invariant/existing binding watcher. Remove or narrow any new lifecycle machinery/tests whose sole justification is same-window rebinding; if any remaining mechanism truly depends on it, supply an independent supported initiating surface/event and forward lifecycle witness before retaining it. Update the related rationale/verification text consistently. Do not add a node switch, phone workflow, global client refactor or new recovery protocol to manufacture the witness.
- Proportionality: a focused premise/consumer-rationale correction is sufficient; no change to three tools, Task persistence/context, voice provider, visual supplement or approved Refresh behavior is required. Common request/lifetime guards for real supported paths remain sound.
- Recommended recipient: **Solution Designer**, exact accountable address resolved by handoff rules below.

## Classification

**Design Impact**. No Requirement Gap is identified. Existing source makes the asserted desktop witness contradicted rather than an unknown production fact; Blocked is not necessary. Runtime/volume/device validation remains downstream work, not missing design approval.

## Recommended Recipient

`/software_engineering_team/solution_designer` — exact accountable recipient returned by get_handoff_rules after this result was persisted. **Do not hand off to Implementation Engineer on this result.**

## Residual Risks

- High-risk bytes/metadata/path/membership/cleanup and commit-observation timing require real implementation tests; draft/global JSON locks and installed volume are unmeasured. Inaccessible leftovers after cleanup failure are disclosed, not secure erasure.
- Actual native prepare+execute/MCP error/selection parity and all enumerated runtime clones/fallbacks need deterministic validation; adding a provider file alone is not registration in the existing default provider list.
- Physical fresh Project deletion-count read must not silently join an older query; explicitly fresh in the design means a new read, with loading/error preventing cached-count fallback. No freeze/revision-confirmation deletion policy is introduced.
- Voice sink/flush/busy settlement needs existing composer/settings regressions and optional real desktop capability; missing mic/extension is reported, not counted as a sample-based pass.
- UI tokens/routes/continuous columns/search/notice/inline delete and bounded Refresh need real rendered assertions. Product evidence remains synthetic; no production, newer-source parity or phone certification is inferred.
- Separate workspace registration can remain after a later failed Project Save; no cross-registry rollback or mkdir promise.
- External Manager status quality/create retries, scheduling, task/run linkage and runtime stopping remain outside this package.

## Latest Authoritative Result

- Review Decision: **Fail**.
- Material-Premise Gate: **Fail — ARCH-F-001 / MP-004**.
- Notes: **ARCH-REV-001**, cumulative **SR-014**, **Large / High** preserved. Rework is narrow and evidence-related; no implementation/acceptance verdict or prior Pass. Re-review the corrected canonical package and this finding before forward implementation handoff.

## Routing Record

After report and ARCH-REV-001 persistence, get_handoff_rules returned the Fail/Blocked-with-finding rule to `/software_engineering_team/solution_designer`. This is the single most-specific applicable rule. No pass rule applies and no Implementation Engineer message is authorized. send_message_to confirmed accepted=true / DELIVERED to `/software_engineering_team/solution_designer`, target AgentRun `solution_designer_63a39e72fb2442918628d96c3ae49963`, with 127 absolute-file references covering the cumulative package and retained external context; an earlier delivered clarification was investigative communication, not this result handoff.

Documentation checks: all mandatory report sections present; review/revision IDs and Markdown tables checked; exact visual locators present; owned-output diff/whitespace checked. These are documentation checks only. No other recipient was notified for this result.
