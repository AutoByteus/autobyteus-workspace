# Design Review Report

## Review Round Meta

- Package: `PROJ-TASK-MANAGER-20261002-001`; ticket `project-task-manager-foundations`; 2026-10-02.
- Upstream Requirements Doc: [requirements-doc.md](requirements-doc.md).
- Upstream Investigation Notes: [investigation-notes.md](investigation-notes.md).
- Upstream Solution Revision Record: [solution-revision-record.md](solution-revision-record.md).
- Reviewed Design Spec: [design-spec.md](design-spec.md), exact cumulative **SR-015**.
- Supplemental Task Artifacts Reviewed: [architecture-clarification-sr-015.md](architecture-clarification-sr-015.md), prior ARCH-REV-001 report/history and [design-handoff-sr-014.md](design-handoff-sr-014.md); the complete inventory in investigation-notes.md; approval SR-010/013; historical Product handoffs, refinement SR-003–009/011/012 and deferred skill-cli-feasibility; external Product spec, approval/receipt/handoff, validation and historical review context. See supplemental verdict below.
- Relevant Solution Revision IDs: SR-015 design rework; SR-014 initial design; SR-009/010 core approval; SR-012/013 Refresh approval; SR-001–008/011 historical scope/UX context.
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md).
- Current Architecture Review Revision ID: **ARCH-REV-002**.
- Current Review Round: **2**. Trigger: Solution Designer's SR-015 response to ARCH-REV-001 / ARCH-F-001; Large / High re-review.
- Prior Review Round Reviewed: **ARCH-REV-001 / Round 1 / SR-014 — Fail / Design Impact**, committed at `1d7d70d0280269d13ee5242c603ab65299e468c3`. The prior finding was rechecked first, not resolved by the designer's assertion. Its baseline/history remains preserved in the revision record.
- Latest Authoritative Round: **2 — Pass**.
- Assigned workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`.
- Current-State Evidence Basis: unchanged source base `e04cfef23550c3b78286a53befc6bd5d71fb1061`; supplied SR-015 checkpoint `5b225685ea6104d662d4981633f58abfb46f4c32`; inspected HEAD `c65f0ca9d280aa81d272cadbc324b01c69929bcd`. The latter differs only by two handoff-receipt lines. Rework changes five upstream ticket documents; no production source change. Original SR-014 checkpoint `2b01707ea2c06cf974bc7315e5f547f6e94094f5` remains the prior review basis.
- Method: prior complete macro-to-detail review retained for unchanged content; independent recheck of the affected behavior basis, exact cumulative diff, consumer dispositions and Node Manager/Electron/bootstrap/mobile/store source paths against architecture-reviewer design-principles, full report template and reachability Example 9. Independently compared 91 normative primary rows and exact approvals/refinements; all unchanged. No production tests, runtime, uploads, microphone, installed profile, feature enablement, integration or push performed. Four representative final screenshots inspected; all 20 exact visual file locators verified present. This is design review, not implementation or acceptance validation.

## Routing Classification Review

- Task size: **Large**.
- Architectural risk: **High**.
- Classification rationale reviewed: multi-subsystem service/persistence/API/native-MCP/renderer/voice changes; new Task byte/reference transaction and async publication boundaries. Evidence supports both classifications independently of document/screenshot volume.
- Independent Architecture Review required by the classification: **Yes**.
- Classification evidence or correction required: None. Preserve Large / High through implementation; no same-window switching premise is needed for either classification.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**. SR-015 corrects the previously contradicted lifecycle premise and separates supported route/Project/local-write/Cancel paths from invariant preservation and unsupported same-window switching.
- Approved requirements / intended behavior understood: SD-AP-001 approves the exact SR-009 core; SD-AP-002 approves the bounded SR-012 manual Refresh delta; UF-017 approves the unchanged manual UI supplement. Approval records distinguish intended behavior from prototype/production validation.
- Relevant existing behavior and evidence confirmed: embedded Projects/Tasks and locked atomic updates; description-only manual editing; visibility-only default-off flag; selected tool composition; separate collaboration/execution; run-owned uploads; optional local desktop voice; cached board reads; open-only count defect.
- Scope guardrail confirmed: active UC-001/002/003/007; exactly three native/MCP tools plus approved manual authoring/board/detail and Refresh. Manager/team creation, scheduler, assignment/run linkage, sidebar, Done resource stopping, CLI/client/skills, phone delivery and global modal removal stay excluded/deferred.
- Approved change / preserved outcome: explicit TODO creation and known-ID field patch; complete Project/Task reads; durable Task context; ordinary pages; workspace metadata registration; accurate deletion total; manual read-only Refresh. Identity/status/omitted context/workspace originals/history and existing collaboration remain protected.
- Every blocking Design Impact finding traceable to approved authority: **Yes** for the prior ARCH-F-001 (REQ-009/018 and AC-025); now independently **Resolved** without redefining behavior. No current blocking finding.
- Remaining material ambiguity: **None**. The explicit node-binding boundary and five-consumer disposition in design-spec.md, E-055–057, DS-010, renderer/form/REST/voice sections and verification plan consistently exclude switching-only machinery/tests. MP-004 remains Not Reachable. The compact DS-008 narrative's node-change wording is read as sink ineligibility under these explicit constraints, not a new event subscription or production journey. Upstream pending-review labels are as-of the delivered SR-015 response; this report supplies the independent result.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass — capability service initializes false; feature middleware gates all Projects prefixes, not server CRUD | Pass — DS-007 leaves installation/default/API exposure policy intact | Confirmed | None |
| BEH-002 | System/User | Pass | Pass — manual CRUD exists; SD-AP-001 adds selected create/patch/filter with exact branches | Pass — DS-001/002/005 use current-record updates and preserve omitted fields/status/context | Confirmed | None |
| BEH-003 | System | Pass | Pass — existing eligible collaborator discovery and user-requested reuse | Pass — DS-003 preserves discovery, no invented addresses or Manager delivery | Confirmed | None |
| BEH-004 | System | Pass | Pass — existing fresh delegate/follow-up contracts | Pass — no dispatch/status callback, assignment or stopping added | Confirmed | None |
| BEH-005 | User | Pass | Pass — actual Projects components and UF-017 journeys | Pass — DS-004/005/006 replace pages/rows, retain shell/search/confirmations | Confirmed | None |
| BEH-006 | System | Pass | Pass — registry/catalog/session/native filter/Claude source plus SD-AP-001 selection authority | Pass — shared three-operation manifest and explicit projections | Confirmed | None |
| BEH-007 | User | Pass | Pass — direct workspace authoring approved; existing registration is metadata-only | Pass — aggregate Project command preserves current Tasks and retained link snapshots | Confirmed | None |
| BEH-008 | User | Pass | Pass — explicit voice/attachment/Cancel actions, AC-018/019, actual local IPC/upload policies | Pass — DS-005/008/009 separate Task bytes and voice sink; route/Cancel lifetime has independent support | Confirmed | None — node eligibility is a bounded sink guard, not a switching lifecycle |
| BEH-009 | Deferred | Pass | Pass — SD-CF-012 explicitly defers CLI/client/skills | Pass — no active spine/deliverable/test obligation | Confirmed | None |
| BEH-010 | User | Pass — manual Refresh and binding safeguards unchanged | Pass — external-write→Refresh and ordinary route/Project/local-write paths; same-window switching separately rejected | Pass — DS-006/010 physical read, retained error state and guarded Task/count publication | Confirmed | None — ARCH-F-001 resolved; preserve the explicit reachability boundary |

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
| design-handoff-sr-014.md | Pass | Pass | Pass | Pass | Pass | None — initial delivered context retained as-of history |
| architecture-clarification-sr-015.md; investigation E-055–057; prior review/history | Pass | Pass | Pass | Pass | Pass | None — correction independently confirmed; ARCH-REV-001 Fail remains historical, this report/ARCH-REV-002 is current |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present for current posture | Pass | Feature / Behavior Change with bounded prerequisite refactors | None |
| Root-cause classification explicit/evidence-backed | Pass | Missing status/file invariant; run-only owner and AgentContext voice boundary; count/read ordering; unknown-field spreading | None — corrected source premise and bounded consumer rationale independently verified |
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

Spines span meaningful outcomes, not just edited helpers. The affected lifecycle basis is now confirmed before accepting these structural verdicts. DS-010 uses real local-write/route ordering; binding checks preserve the approved invariant/existing watcher, not a new switching spine.

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
| refreshTasks / centralized count publication | Pass | Pass | Pass | Low | Pass — physical read and unfiltered totals; corrected premise/guard basis confirmed |
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
| Node-binding reachability and consumer disposition | Yes, prior material premise was contradicted | Pass | Pass | Pass | Source-backed Not Reachable disposition; five consumers separate guard preservation from real lifecycle, no switching-only machinery or product test journey |

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
- Reachability: **Not Reachable**. Review consequence: SR-015 now rejects this scenario as a machinery/test premise while preserving the approved binding invariant/existing watchers. Independently supported route/local-write/Cancel guards remain valid. Consumer dispositions, DS-010, form/REST/voice instructions, file allocation, risks and verification narrow new state to those real lifecycles. Injected binding changes exercise guard contracts only. ARCH-F-001 is **Resolved**; do not recreate the rejected premise downstream merely because bindingRevision or bindNodeContext still exists.

### MP-005 — Metadata commit is observed before post-rename finalization
- Related authority / behavior: REQ-009/014, AC-012/019; BEH-002/008; current atomic writer boundary.
- Initiating basis: Contract, exercised by explicit Task Save.
- Governing contract/support: successfully saved files stay readable; failed precommit writes preserve saved bytes. Current `updateJsonArrayFile` renames before `withFilePathLock` awaits close/unlink in finally. Those are distinct commit/finalization phases, not proof that arbitrary physical failures need recovery infrastructure.
- Forward path: Task save → complete immutable byte copies → locked metadata updater → rename commits refs → finalization completes/reports error → ProjectStore returns only proven committed rows or genuine precommit failure.
- Lifecycle/consequence: exception alone cannot authorize deleting potentially referenced bytes; observing successful rename makes the outcome truthful without rereading a later writer's state.
- Reachability: **Reachable as governing transaction contract**. Response: narrow in-memory non-throwing observation; best-effort postcommit cleanup, no journal/power-loss repair. Failure injection verifies phase behavior, not a new production trigger.

No additional premise search was used. Invalid compound file inputs and abandoned draft expiry are already independently approved AC-019/draft-housekeeping contracts: requested file membership/physical checks and scoped 24h expiry are proportionate. Hidden-store tampering, arbitrary corpus destruction, unlimited dispatch and Done stopping cannot drive a finding or added machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

**None.** No unresolved approved-intent, current-state, supplemental or material-premise gap blocks this reviewed design.

## Review Decision

**Pass.** ARCH-F-001 is independently resolved in cumulative SR-015. The supported behavior basis, ten-spine inventory, ownership, interfaces, removal and persisted-data transition reasoning are coherent and actionable. Current-node safeguards remain approved; unsupported same-window switching does not justify new lifecycle/recovery machinery or product switching tests. Large / High and the selected downstream review gates remain intact.

## Findings

**No open findings.** Prior **ARCH-F-001 — Resolved** (Design Impact, Medium/blocking in ARCH-REV-001). Resolution protects REQ-009/018 and AC-025, with BEH-005/008/010 and AC-015/018 unchanged. Verified against the canonical SR-015 sections and independent source paths in MP-004, not the response's resolution claim. The original finding and its Fail baseline remain in ARCH-REV-001 history and its committed report; the resolution delta is recorded in ARCH-REV-002.

## Classification

**N/A — Pass; no active failure classification.** Prior Design Impact is resolved. No Requirement Gap, new product decision, renewed approval or Product reopening is required. Runtime/volume/device validation remains downstream work, not a design acceptance claim.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` — exact primary Pass recipient returned by get_handoff_rules after persistence. Required informational notification to `/software_engineering_team/solution_designer` follows only after the primary handoff succeeds.

## Residual Risks

- High-risk bytes/metadata/path/membership/cleanup and commit-observation timing require real implementation tests; draft/global JSON locks and installed volume are unmeasured. Inaccessible leftovers after cleanup failure are disclosed, not secure erasure.
- Actual native prepare+execute/MCP error/selection parity and all enumerated runtime clones/fallbacks need deterministic validation; adding a provider file alone is not registration in the existing default provider list.
- Physical fresh Project deletion-count read must not silently join an older query; explicitly fresh in the design means a new read, with loading/error preventing cached-count fallback. No freeze/revision-confirmation deletion policy is introduced.
- Voice sink/flush/busy settlement needs existing composer/settings regressions and optional real desktop capability; missing mic/extension is reported, not counted as a sample-based pass.
- UI tokens/routes/continuous columns/search/notice/inline delete and bounded Refresh need real rendered assertions. Product evidence remains synthetic; no production, newer-source parity or phone certification is inferred.
- Separate workspace registration can remain after a later failed Project Save; no cross-registry rollback or mkdir promise.
- External Manager status quality/create retries, scheduling, task/run linkage and runtime stopping remain outside this package.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass** — supported premises retained; **MP-004 Not Reachable** and excluded as a machinery/journey premise.
- Notes: **ARCH-REV-002**, cumulative **SR-015**; prior ARCH-F-001 resolved; **Large / High** preserved. Ready for implementation under the approved scope. No implementation, runtime, production acceptance, installed-data, feature/default, integration or push validation is claimed.

## Routing Record

Report and ARCH-REV-002 persisted before get_handoff_rules. Selected the primary Pass-ready-for-implementation rule to `/software_engineering_team/implementation_engineer`. The returned informational Pass rule to `/software_engineering_team/solution_designer` applies only after that primary delivery succeeds. Fail/Blocked does not apply. Both messages remain pending; confirmed receipts will be recorded after tool success. No recipient is polled.

Documentation checks: mandatory report shape retained; unaffected structural evidence reused from ARCH-REV-001; exact rework/source/approval comparison and all 91 primary normative rows checked. Current report/history, Markdown table widths, preserved ARCH-REV-001 body, 128 existing absolute cumulative reference files and all20 exact visual locators checked before handoff. These are documentation/source-inspection checks only, not product tests or AC Pass.
