# Design Spec

## Current-State Read

The repository has two different read surfaces over overlapping agent evidence:

- **Event Monitor** builds a readable, bounded conversation timeline from normalized user, assistant, reasoning, tool, and compaction replay events. Its latest window is 100 events and its deliberate upward paging remains active-file-only.
- **Activity** stores and renders a bounded, run-keyed list of tool and compaction projections. Live lifecycle messages fold into stable entries; reopening a run replaces that state from the raw-trace-derived run projection.

The current implementation is provider-neutral above the runtime adapters, but it has no system-instruction semantic event, raw-trace record, replay variant, Activity entry, or renderer. Three truthful capture points exist:

1. Native AutoByteus: `currentSystemPrompt` after configured-skill catalog assembly, successfully passed to `llmInstance.configureSystemPrompt`.
2. Claude Agent SDK: `carpenterSystemPrompt` successfully handed to `startQueryTurn` as `systemPrompt`.
3. Codex app server: `codexThreadConfig.baseInstructions` successfully handed to `thread/start` or `thread/resume`.

The capture times do not share one listener lifecycle. Native and Codex establish their instruction boundary during runtime preparation, before the server has constructed an `AgentRun` and before browser/team listeners exist. The supported first-message path later proves the necessary publication seam: `AgentRunCommandCoordinator` calls `onActiveRunReady`, which binds the session/team listener before `AgentRun.postUserMessage` reaches backend input dispatch. Claude establishes its SDK query after its backend listener exists.

CRR-001 proposed a second Native/Codex lifecycle, but SR-014's mandatory
product-reachability audit rejects its initiating premise. An ordinary composer
Send reaches `recordRunStarted`, yet normal writable-storage/filesystem behavior
does not make that operation fail while leaving the exact original prepared
metadata present. Supported cancellation and stale cleanup are guarded while a
command is outstanding. The defensive `unchangedPreparedIsRetryable` branch and
a mocked `recordRunStarted -> null` test prove only downstream mechanical
handling; they do not independently make the required state a supported product
path. `MP-CR-001` is therefore `Not Reachable`. This feature does not change that
fallback or add retry-specific capture/publication machinery or coverage.

Raw-trace storage is one active JSONL file plus numbered archive segments. Shape-neutral readers can retain an additive record, but typed core and server readers currently assume every raw row has a turn and per-turn sequence. `RawTraceItem.fromDict` and `toMemoryTraceEvent` would manufacture `"undefined"`, `""`, or `0` for a run-scoped record. Native working-context, tool-lifecycle, and compaction code also depends on those typed lists being turn-scoped.

One replay array currently feeds recent conversation, Activity, Event Monitor active-page cursors, and `hasEarlierActiveTraceEvents`. Adding an unfiltered replay kind would both displace existing Event Monitor events and fall through its visual projector as if it were compaction. Activity's frontend union lives inside its Pinia store; desktop and mobile each contain closed `tool`/`compaction` branches, while Activity window/completion logic imports Event Monitor-owned utilities. These are the concrete boundaries that need refactoring now.

## Material Premise Reachability Assessment

| Premise ID | Proposed Initiating Basis | Current Production Path | Required State / Consequence | Classification | Design / Coverage Effect |
| --- | --- | --- | --- | --- | --- |
| MP-CR-001 | Ordinary composer Send, followed by a run-start metadata save that fails while the exact original prepared metadata remains readable | Composer Send -> command coordinator -> prepared activation -> runtime candidate -> `recordRunStarted` -> atomic metadata writer | Candidate A has already committed a system row, metadata remains exactly prepared, A aborts, candidate B folds to `created:false`, and the successful run would lack an immediate live system event | `Not Reachable` | None. Preserve the approved first-capture design and existing activation fallback; do not add reused-row publication, rollback, delivery state, registry, or dedicated retry coverage |

**Independent-origin audit:** Composer Send is a supported user action, but it
only reaches the metadata writer; it does not supply the required failure.
Normal repository assumptions provide a stable process, writable storage, and
normal filesystem behavior. `recordRunStarted` reads the current metadata,
atomically writes the target, and returns it. Supported prepared-run cancellation
and stale cleanup refuse or skip mutation while the command is outstanding.
Missing metadata produces a missing/indeterminate disposition rather than the
exact unchanged-present state. The remaining causes are arbitrary I/O/process
failure, unsupported concurrent mutation, or the unit test's mocked
`recordRunStarted -> null`; none is an independent approved product, security,
or operational trigger. The fallback branch may defensively handle such a state,
but its existence cannot prove the state is supported.

## Intended Change

Add **system instructions** as the first new typed Activity trajectory kind without changing Event Monitor or adding archive lookup.

At each successful AutoByteus-owned instruction handoff:

1. capture the exact string and the handoff timestamp;
2. commit one strict five-field `system_instruction` row to the run's active raw trace, folding only consecutive identical active values;
3. publish only a newly created version: Claude emits immediately because its
   listener already exists, while Native/Codex stage that newly committed trace
   until their listener exists;
4. after listener binding, publish one provider-neutral
   `SYSTEM_INSTRUCTIONS_SUPPLIED` semantic event carrying the committed trace
   ID, exact content, and timestamp before the first backend input;
5. project the live event into the same run-keyed Activity state used by tool and compaction entries; and
6. on reopen/restart, restore the same entry from the active raw trace while it remains inside the existing bounded recent horizon.

The UI renders a normal chronological, collapsed `System instructions` row. Its runtime/source copy is derived from the selected run's authoritative configuration rather than stored in the raw row or duplicated in every Activity entry. Expansion shows the exact content with preserved whitespace, selection, keyboard and screen-reader support, and contained scrolling. Standalone and team-member streams use the same browser handler and Activity renderer.

No system row enters working context, compaction input, conversation projection, Event Monitor, active-page cursor identity, telemetry, or a second durable event store.

The first-capture path needs no durable publication status. Native/Codex staging
is a narrow listener-timing seam for a newly committed trace, not a replay queue
or recovery subsystem. Existing activation fallback behavior remains unchanged
and outside this feature's required behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Approved Change Or Preserved Outcome | Evidence-Backed Current Path | Target Production Path / Lifecycle Boundary | Spine IDs | Related IDs |
| --- | --- | --- | --- | --- | --- |
| BEH-SP-001 | Add a chronological system-instruction Activity entry; preserve tool/compaction entries | Run projection/live handlers -> `agentActivityStore` -> desktop/mobile Activity | Runtime capture -> newly committed raw row -> semantic event/replay -> stable-ID typed Activity entry -> exhaustive renderer | DS-001, DS-002, DS-003, DS-004, DS-007 | REQ-SP-001, REQ-SP-006; AC-SP-001, AC-SP-007 |
| BEH-SP-002 | Capture exact native processed prompt, with no provider-effective claim | `SystemPromptProcessingStep` -> `configureSystemPrompt`; no transparency path | Successful configure -> core store capture operation -> if newly created, stage trace -> first bound input publishes -> Activity | DS-001, DS-005 | REQ-SP-001, REQ-SP-002; AC-SP-001, AC-SP-004 |
| BEH-SP-003 | Capture exact Claude SDK `systemPrompt` | `ClaudeSession.executeTurn` -> `startQueryTurn` | Successful SDK query creation -> trace capture -> Claude semantic source event -> common `AgentRunEvent` -> Activity | DS-002, DS-005 | REQ-SP-001, REQ-SP-002; AC-SP-002 |
| BEH-SP-004 | Capture exact Codex `baseInstructions` at start/resume | `CodexThreadManager` -> `thread/start` or `thread/resume` | Successful app-server response -> trace capture -> if newly created, stage trace -> first bound input publishes -> Activity | DS-003, DS-005 | REQ-SP-001, REQ-SP-002; AC-SP-003 |
| BEH-SP-005 | Apply existing bounded Activity lifecycle; no pinning | Recent replay 100, Activity resident 100 | Merge selected system events only into Activity's existing recent horizon; final Activity owner enforces 100 | DS-004, DS-007 | REQ-SP-003; AC-SP-005 |
| BEH-SP-006 | If the selected active window has no valid row, show nothing and infer nothing | Existing runs lack instruction rows | Strict normalizer omits malformed/absent system rows; no archive/current-definition fallback | DS-004, DS-006 | REQ-SP-004; AC-SP-006 |
| BEH-SP-007 | Event Monitor output and behavior remain independent of the new kind | Normal and paged Event Monitor consume replay events | Explicitly filter system events before recent conversation, cursor generation, paging, `hasEarlier`, and Event Monitor projection | DS-004, DS-008 | REQ-SP-006; AC-SP-007 |
| BEH-SP-008 | Establish a narrow extensible Activity contract, not a prompt side channel | Store-owned closed union and repeated desktop/mobile branches | Activity-owned discriminated union + derived presentation contract + exhaustive dispatch components | DS-007 | REQ-SP-007; AC-SP-009 |
| BEH-SP-009 | Use one provider-neutral event/entry kind across runtimes and teams | Runtime adapters normalize other provider events; no instruction kind exists | Runtime capture adapters -> typed canonical event -> standalone/team transport -> stable-ID browser handler/store entry | DS-001, DS-002, DS-003, DS-005 | REQ-SP-008; AC-SP-010 |
| BEH-SP-010 | Restart restores only from active raw trace and current horizon | `includeArchive:false` -> replay -> recent projection -> hydration | Strict run-scoped raw normalization -> system replay event -> Activity-only selection/projection -> hydration | DS-004, DS-006 | REQ-SP-003, REQ-SP-009; AC-SP-005, AC-SP-011 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-prompt-activity-ux-spec.md` | Governing prompt-first Activity interaction and presentation | REQ-SP-001–REQ-SP-009; AC-SP-001–AC-SP-011 | Governs chronological placement, collapsed disclosure, exact detail, active-only states, responsive behavior, and accessibility | Approved design input; SR-014 restores the approved presentation authority |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-instruction-raw-trace-schema.md` | Governing persisted-field audit | REQ-SP-002, REQ-SP-003, REQ-SP-008, REQ-SP-009; AC-SP-001–AC-SP-004, AC-SP-010–AC-SP-011 | Governs exact five stored fields, rejected publication metadata, event payload, capture sources, folding, first-capture publication, and no fabricated turn | Approved minimal schema; SR-014 restores the approved first-capture lifecycle |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/data-migration-conventions-audit.md` | Evidence audit against canonical production data-migration conventions and README | REQ-SP-003, REQ-SP-004, REQ-SP-009; AC-SP-004–AC-SP-006, AC-SP-011 | Confirms additive forward-only current model, `Directly Usable — No Migration`, no synthetic recovery machinery, existing-migration caller scope, and isolated-fixture validation | SR-015 evidence supplement; no product behavior authority |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/activity-transparency-ux-spec.md` | Broader Activity/Event Monitor investigation context | Deferred | Explains longer-term trajectory direction only; it does not authorize any additional visible kind in this change | Context only; not governing this slice |

## Task Design Health Assessment (Mandatory)

- **Change posture:** Feature + behavior-preserving refactor.
- **Current design issue found:** Yes.
- **Root cause classification:** Boundary Or Ownership Issue + Shared Structure Looseness.
- **Refactor needed now:** Yes.
- **Evidence:** Raw-trace types conflate raw-file membership with turn membership; a run-scoped record would be coerced into false identity and leak toward working-context/tool consumers. Activity types and policies are store-local and depend on Event Monitor-owned utilities. Desktop/mobile renderers have duplicate closed branches. One replay collection is not explicitly separated into Event Monitor and Activity subjects. SR-014 separately confirms that CR-F-001's storage-failure premise is not a supported product path and creates no additional design pressure.
- **Design response:** Split run-scoped from turn-scoped trace contracts, narrow turn-only core APIs, make system capture a single persistence-owned operation, explicitly select Event Monitor versus Activity replay sets, and introduce an Activity-owned discriminated entry/presentation/renderer boundary. Preserve the approved newly-created-only live publication behavior.
- **Refactor rationale:** A prompt-only panel or generic metadata blob would satisfy the screenshot superficially but preserve the exact ownership problems exposed by the user's trajectory requirement. The chosen refactor is limited to boundaries exercised by the first new kind.
- **Intentional deferrals and residual risk:** Physical offset-indexed JSONL paging, archive Activity navigation, provider-effective request capture, user-input Activity, and broader trajectory kinds remain deferred. Full prompt content remains sensitive under existing run authorization; no stronger permission/redaction policy was approved. Active-file reads remain whole-file reads, matching current behavior.

## Terminology

- **Supplied system instructions:** The exact AutoByteus-owned string successfully passed/configured at the approved Native, Claude, or Codex handoff. It is not the provider's complete effective context.
- **System-instruction raw trace:** The exact five-field run-scoped JSONL record with `trace_type: "system_instruction"`.
- **Capture outcome:** Transient `{ trace, created }` returned by the persistence owner. `created:false` means the latest active instruction content is equal under direct string comparison, without trimming, normalization, or canonicalization, so no new instruction version exists to publish.
- **Startup event staging:** Holding one newly created committed trace in Native/Codex runtime state until an `AgentRun` listener exists; it is not durable storage, publication status, a replay queue, or failure-recovery state.
- **Turn-scoped trace:** An existing raw row with real `turn_id` and `seq`, eligible for turn/tool/working-context logic.
- **Active recent horizon:** The existing active-file-only recent selection used by run projection, not an archive or retained lookup.
- **Trajectory entry:** A typed Activity projection. Run/member identity and order are owned by the containing run-keyed timeline; summary and detail availability are derived presentation, not redundant persisted fields.

## Design Reading Order

Read the runtime capture spines first, then the one persistence/event contract, then restart projection and Event Monitor exclusion, and finally the Activity state/rendering spine. File mappings derive from those owners rather than defining them.

## Legacy Removal Policy (Mandatory)

- **Policy:** `No backward compatibility; remove legacy code paths.`
- Existing raw-trace files remain directly usable, but current runtime code will not add version checks, dual reads/writes, compatibility fields, or reconstructed fallback prompts.
- Ambiguous typed methods named as if they return every raw record will be replaced by explicitly turn-scoped methods.
- Closed two-kind UI branches, store-local type ownership, and Activity's dependency on Event Monitor policy utilities will be removed rather than wrapped.
- The current full native prompt console log will be removed; it is not retained alongside the selected-run UI.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- **Stored subject, location, representative shape, and approximate volume:** Existing run memory uses `<run-memory-dir>/raw_traces_active.jsonl`, numbered `raw_traces_NNNNNN.jsonl` segments, and `raw_traces_manifest.json`. A representative investigated run had a 98 KB active file and 1.46 MB archive segment; the user has observed 30–40 MB files. Current rows are turn-scoped user/reasoning/assistant/tool/compaction records.
- **Relevant code-model, serialization, semantic, or physical-store change:** Add a run-scoped `SystemInstructionTraceRecord` serialized with exactly `id`, `ts`, `trace_type`, `content`, and `source_event` to the existing active JSONL file. Make normalized/API turn and sequence nullable for this run-scoped kind. No new file or physical format is added.
- **Normal reader/writer behavior and representative evidence:** JSONL storage reads shape-neutral records. Current typed readers are not versioned and can be cleanly split into strict system parsing and turn-only parsing. Existing run-history GraphQL activities are JSON, so the new Activity variant is additive. Old runs have no such row and continue through the same current readers. The existing native working-context snapshot-v5 migration calls the renamed turn-only reader; that is a compile-time/current-subject API update, not a new migration or a change to its released-source transformation.
- **Required semantics and invariants under direct use:** Existing turn rows retain real turn/sequence semantics; system rows never manufacture them. Existing conversation/tool/working-context behavior remains unchanged. New rows use one raw ID for persistence/live/hydration identity. Missing rows produce absence, not reconstruction. Live publication is limited to newly created versions; no durable delivery state is added.
- **Physical-store, privacy/security, disposal/rebuild, and operational constraints:** Full instruction text may contain internal paths/instructions. It stays in existing run memory and selected-run transports only. No telemetry/export/redacted copy is added. Reads remain active-file and whole-file. Rotation may archive the row; Activity does not scan archives.
- **Decision:** `Directly Usable — No Migration`.
- **Decision rationale:** Existing data needs no transformation and cannot truthfully manufacture historical instructions. Existing turn rows remain valid current event-log rows; absence of a system event means only “not recorded,” not an old schema requiring compatibility logic. The current version-agnostic JSONL reader admits those unchanged rows plus the new strict kind. Rewriting large trace corpora would add I/O, downtime, and corruption exposure with no semantic benefit.
- **Acceptance criteria or design constraints supported:** AC-SP-004–AC-SP-007, AC-SP-010, AC-SP-011; no migration, no fallback, active-only restoration, preserved existing surfaces.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — the approved decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-SP-001, BEH-SP-002, BEH-SP-009 | Native agent bootstrap | System row available in Activity | Native bootstrap + AgentRun/Activity boundaries | Establishes exact native content and listener-safe live delivery |
| DS-002 | Primary End-to-End | BEH-SP-001, BEH-SP-003, BEH-SP-009 | Claude turn query creation | System row available in Activity | Claude session + AgentRun/Activity boundaries | Establishes exact SDK argument without exposing Claude protocol to UI |
| DS-003 | Primary End-to-End | BEH-SP-001, BEH-SP-004, BEH-SP-009 | Codex thread start/resume | System row available in Activity | Codex thread manager + AgentRun/Activity boundaries | Establishes exact base instructions before any real turn exists |
| DS-004 | Primary End-to-End | BEH-SP-005, BEH-SP-006, BEH-SP-007, BEH-SP-010 | Reopen/restart run projection | Hydrated Activity with Event Monitor unchanged | Local run view projection | Makes active raw trace the sole reload authority |
| DS-005 | Return-Event | BEH-SP-002, BEH-SP-003, BEH-SP-004, BEH-SP-009 | Committed capture | Standalone/team browser message | AgentRun semantic event + transport adapters | Proves provider neutrality and one live identity |
| DS-006 | Return-Event | BEH-SP-001, BEH-SP-006, BEH-SP-010 | History projection JSON | Run-keyed frontend Activity state | Run hydration adapter | Restores the same typed entry and drops only malformed system detail |
| DS-007 | Bounded Local | BEH-SP-001, BEH-SP-005, BEH-SP-008 | Activity event/DTO | Desktop/mobile specialized row | Activity subsystem | Owns identity, folding, bounded retention, derived presentation, and rendering |
| DS-008 | Bounded Local | BEH-SP-007, BEH-SP-010 | Raw normalized replay set | Separate Event Monitor and Activity selections | Run projection provider | Prevents the new kind from changing central history and cursors |
| DS-009 | Bounded Local | BEH-SP-005, BEH-SP-010 | Accepted compaction / provider boundary | Active row retained or moved to archive | Raw-trace storage/compaction owner | Ensures normal rotation semantics without adding instruction text to LLM compaction |
| DS-010 | Bounded Local | BEH-SP-006, BEH-SP-010 | Selected raw trace file | Truthful Memory Inspector row | Memory view normalization/API | Keeps the stored run-scoped record inspectable without fake turn data |

## Primary Execution Spine(s)

- **DS-001 Native:** `AgentFactory creates MemoryManager -> SystemPromptProcessingStep constructs/configures exact prompt -> RunMemoryFileStore.recordSystemInstructionSupply commits/folds active row -> if created, Native backend stages the trace -> first bound input dispatch publishes canonical event -> standalone/team transport -> stable-ID Activity projector -> SystemInstructionActivityItem`.
- **DS-002 Claude:** `AgentRun input -> ClaudeSession builds query options -> Claude SDK returns query for exact systemPrompt -> system capture service commits/folds active row -> Claude session emits canonical source event -> AgentRun pipeline -> standalone/team transport -> Activity projector -> SystemInstructionActivityItem`.
- **DS-003 Codex:** `Run activation -> CodexThreadManager sends thread/start|resume with exact baseInstructions -> successful response -> system capture service commits/folds active row -> if created, Codex thread/backend stages the trace -> first bound input dispatch publishes canonical event -> Activity projector -> SystemInstructionActivityItem`.
- **DS-004 Restart:** `Run open/restart -> LocalMemoryRunViewProjectionProvider reads active JSONL only -> raw normalizer admits run-scoped row -> replay transformer creates system event -> selection separates Event Monitor-compatible events from Activity -> Activity DTO JSON -> hydration adapter -> run-keyed Activity state -> renderer`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Native persists only after `configureSystemPrompt` returns successfully. A newly created trace is stored transiently because bootstrap precedes listeners, then published before forwarding first input. An equal fold creates no new version/event. | Native prompt boundary, trace capture, pending event, AgentRun, Activity | Native bootstrap for truth; backend for listener-safe publication; run memory store for durability | ID/time allocation, logging redaction, startup cleanup |
| DS-002 | Claude records after `startQueryTurn` returns a query, then emits a Claude session event that its converter maps to the shared event. Identical later turns return `created:false` and emit no duplicate. | Claude query boundary, trace capture, session event, AgentRun, Activity | ClaudeSession | Existing exception propagation/cleanup, direct string equality |
| DS-003 | Codex records only after `thread/start` or `thread/resume` returns a valid thread identity. A newly created trace is staged until backend input dispatch because listeners do not exist during thread preparation; an equal fold creates no new version/event. | Codex request boundary, trace capture, pending event, AgentRun, Activity | CodexThreadManager + Codex backend | Startup cleanup, null/invalid prompt invariant, listener timing |
| DS-004 | History reads only active JSONL. System rows form a run-scoped replay variant. The provider explicitly excludes them from Event Monitor and its pre-existing non-system recent selection, then merges eligible rows into Activity projection. | Raw trace, normalized trace, replay event, run projection, hydration | LocalMemoryRunViewProjectionProvider | Strict malformed-row diagnostics, same-timestamp physical order |
| DS-005 | One typed `AgentRunEvent` is mapped either to standalone server message or through TeamAgentEvent/team contracts. Both reach one frontend handler with `{trace_id, content, ts}`. | Canonical event, transport adapter, browser handler | AgentRun event boundary | Team execution routing/change sequence, debug redaction |
| DS-006 | GraphQL activity JSON is strictly narrowed by kind. A valid system entry reuses raw ID and exact content; an invalid system entry alone is skipped. | Run projection DTO, hydration adapter, Activity state | Frontend run hydration | Date validation, diagnostics |
| DS-007 | The store maintains ordered entries under the authoritative run ID, applies a 100-entry Activity-owned policy, and dispatches each kind through one exhaustive component. Runtime label, summary, detail availability, and completion are derived. | Activity timeline, presentation contract, renderer | Activity subsystem | Localization, accessibility, mobile layout |
| DS-008 | Event Monitor receives only pre-existing replay kinds before its recent/page/cursor code. Its counts and page identities remain based on the same pre-existing non-system set as before. | Replay selection, Event Monitor projection | Run projection provider | Regression tests |
| DS-009 | External boundaries keep current before-marker rotation. Native accepted compaction archives selected turn traces plus preceding/equal system records by physical position, without selecting their content for compaction. | Compaction selection, archive operation, active rewrite | Raw-trace storage | Manifest/idempotency behavior |
| DS-010 | Memory Inspector exposes the row from selected files while nullable turn/sequence fields communicate run scope honestly. | Memory trace DTO, GraphQL, inspector | Agent memory view | Generated GraphQL types |

## Spine Actors / Main-Line Nodes

- Runtime-specific instruction handoff (Native bootstrap, Claude query, Codex thread manager).
- `SystemInstructionTraceRecord` plus the existing run memory store's strict
  `recordSystemInstructionSupply` operation.
- Provider-neutral `AgentRunEvent` boundary.
- Standalone or team stream transport.
- Local raw-trace replay/run projection.
- Run-keyed Activity state and Activity renderer.

## Ownership Map

- **Runtime-specific handoff owner:** decides which exact string and timestamp are truthful and when the handoff has succeeded. It must not define UI copy or persist provider IDs.
- **RunMemoryFileStore.recordSystemInstructionSupply:** owns strict record
  construction, ID allocation, active-only consecutive equality folding, and
  append-before-publication as one physical-store invariant. It returns
  `{trace,created}` and does not know runtimes, teams, Activity, or publication
  status.
- **RunMemoryFileStore / MemoryStore:** owns physical JSONL access and exposes explicit turn-only typed lists plus the system capture command. It does not infer a turn for a run-scoped row.
- **AgentRun event boundary:** owns the typed provider-neutral live fact and canonical event fan-out. It does not persist the fact again.
- **Native/Codex runtime adapters:** own one pending publication only when the
  capture operation appended a new trace. They publish it once after listener
  binding and before first input. They do not interpret equal folding as a new
  event or maintain delivery/recovery state.
- **Runtime adapters:** own staging/conversion necessitated by provider lifecycle. They may carry a transient committed capture but not a second replay history or durable publication status.
- **LocalMemoryRunViewProjectionProvider:** owns split selection for conversation/Event Monitor versus Activity and derives Activity JSON from active trace plus run metadata.
- **Activity subsystem:** owns the frontend discriminated union, run-keyed order/window, presentation derivation, and specialized desktop/mobile dispatch. It never parses provider protocols.
- **Event Monitor:** remains the owner of readable conversation paging and is protected by explicit exclusion.
- **GraphQL resolvers/WebSocket handlers:** are thin transport boundaries, not trajectory-policy owners.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryManager.recordSystemInstructionSupply` | `RunMemoryFileStore.recordSystemInstructionSupply` through `MemoryStore` | Lets native bootstrap use its existing memory boundary | Event construction, UI copy, runtime labels |
| `SystemInstructionCaptureService.capture` | `RunMemoryFileStore.recordSystemInstructionSupply` | Gives external runtimes the same persistence invariant from `memoryDir` | Claude/Codex lifecycle sequencing or duplicate storage |
| `AgentRunEventMessageMapper` | Canonical event and standalone protocol contracts | Maps one semantic event to wire casing | Persistence or provider parsing |
| Team event adapter/projector | `TeamAgentEvent` + team stream contracts | Adds team execution routing/change sequence | Content reconstruction or different semantics |
| GraphQL run-history resolvers | Run view projection service | Exposes JSON activities | Selection, labels, or archive lookup |
| `RunActivityItem.vue` | Specialized Activity item components | Exhaustive central dispatch | Generic JSON rendering or provider branching |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Full native prompt `console.info` | Duplicates sensitive content outside selected-run UI | Length-only native log + Activity disclosure | In This Change | Keep non-content operational log |
| Ambiguous `listRawTracesOrdered` / `listRawTraceCorpusOrdered` / `listArchiveRawTracesOrdered` names | They would falsely imply all records while their consumers require turn identity | `listTurnRawTracesOrdered`, `listTurnRawTraceCorpusOrdered`, `listArchiveTurnRawTracesOrdered` | In This Change | Update every production/test caller; no aliases |
| `archiveExactRawTraces` compaction API | Cannot own preceding run-scoped trace lifecycle | `archiveCompactedRawTraces(selectedTurnTraceIds)` | In This Change | Include eligible system rows physically, not semantically |
| Manufactured `turnId:""` and `seq:0` for missing fields | False identity for run-scoped records | Discriminated normalized trace union + nullable API fields | In This Change | No fallback defaults for system rows |
| Activity types declared inside `agentActivityStore.ts` | Store is not the contract owner | `types/activity/RunActivity.ts` | In This Change | Update imports cleanly |
| Activity's imports from Event Monitor limit/completion utilities | Couples two independently governed surfaces | `services/activity/runActivityWindowPolicy.ts` and presentation completion | In This Change | Preserve numeric behavior at 100 |
| Direct tool/else-compaction desktop branch | New kinds would be misrendered | `RunActivityItem.vue` exhaustive dispatcher | In This Change | No default kind renderer |
| Direct two-kind mobile title/status/detail functions | Duplicated closed presentation policy | Activity presentation selector + `MobileRunActivityItem.vue` | In This Change | Preserve first-ten list policy |
| Hydration's “non-compaction means tool” fallback | Would treat malformed/unknown kinds as tools | Exact `tool`, `compaction`, `system_instruction` switch; diagnose/drop unknown | In This Change | Old server already emits explicit `kind:"tool"` |
| Any attempt to route system replay into Event Monitor projector | Would change central history and risk compaction fallthrough | Explicit non-system type guard/selection | In This Change | No Event Monitor card is added |

## Return Or Event Spine(s) (If Applicable)

- **Standalone live:** `SystemInstructionsSuppliedEvent -> AgentRun pipeline -> AgentRunEventMessageMapper -> ServerMessage.SYSTEM_INSTRUCTIONS_SUPPLIED -> AgentStreamingService parser -> dispatchAgentStreamMessage -> systemInstructionActivityHandler -> agentActivityStore`.
- **Team live:** `SystemInstructionsSuppliedEvent -> TeamAgentEventAdapter -> TeamAgentEvent -> team stream Zod contract -> TeamAgentEventWebSocketProjector -> TeamStreamingService adapter -> dispatchAgentStreamMessage -> same systemInstructionActivityHandler/store`.
- **Reload:** `RunProjectionSystemInstructionActivityEntry -> GraphQL JSON -> runProjectionActivityHydration -> SystemInstructionActivity`.

## Bounded Local / Internal Spines (If Applicable)

- **Parent: RunMemoryFileStore.recordSystemInstructionSupply.** `read active rows in reverse -> find latest valid system row -> direct string compare -> return {trace:existing,created:false} OR allocate ID/time record -> append -> return {trace:new,created:true}`. This establishes active-only folding and rotation reset.
- **Parent: PendingSystemInstructionEvent.** `newly created committed trace -> wait for backend input dispatch with listener -> publish canonical event -> mark consumed only after publication call completes`. It holds at most one trace and has no disk, replay, retry, or publication-marker behavior.
- **Parent: LocalMemoryRunViewProjectionProvider.** `normalize all active rows -> build replay -> split system/non-system -> apply unchanged Event Monitor-compatible recent selection -> merge system events inside the same physical horizon for Activity -> build separate conversation and activity projections`.
- **Parent: Activity store.** `strict identity admission -> insert/upsert by activityId -> preserve chronological array order -> apply Activity-owned 100-entry completion-aware window -> update derived flags`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| ID allocation/time validation | DS-001–DS-004 | Trace recorder | Allocate `rt_<ms>_<uuid>` for a created record and validate the handoff-sampled positive-seconds timestamp | One identity across persistence/live/reload | Runtime-specific IDs or duplicate snapshot IDs |
| Strict record validation | DS-004, DS-010 | Raw normalizer/model | Admit exact constants/fields, preserve content bytes, reject malformed system row alone | Honest replay and resilience | Generic coercion creates false trace facts |
| Debug redaction | DS-005 | Server and browser streaming diagnostics | Special-case the system event at both `AgentStreamHandler` raw-event logging and browser `AgentStreamingService.logMessage`; log event type/ID/time/content length, never content/payload JSON | Prevent parallel prompt disclosure under both supported debug controls | Generic diagnostic serialization leaks exact prompts outside Activity |
| Runtime source presentation | DS-007 | Activity presentation | Map existing runtime kind to approved truthful copy | No persisted/runtime duplicate fields | Provider copy leaks into adapters or raw schema |
| Localization | DS-007, DS-010 | Web presentation | English/Chinese labels and accessibility text | Existing localized UI convention | Hard-coded inconsistent copy |
| Same-timestamp ordering | DS-004, DS-010 | Raw normalizer | Preserve physical input ordinal when a run-scoped row participates in a timestamp tie | ID is not causal order | Lexical UUID order silently reorders history |
| Native compaction inclusion | DS-009 | Storage/compaction | Add preceding/equal system rows to physical archive membership | Avoid accidental active pinning | Compaction prompt/count includes sensitive unrelated text |
| GraphQL code generation | DS-006, DS-010 | API/client contracts | Regenerate nullable memory fields and keep JSON Activity union documented in local TS | Compile-time client truth | Hand-edited generated file drift |

## Ownership Boundaries

1. The **runtime handoff** is authoritative for content and observation time. Callers may not recompute content from definitions after the fact.
2. The **run memory store capture operation** is authoritative for stored identity and consecutive folding. Runtime adapters may not allocate separate Activity/snapshot IDs or scan archives.
3. The **Native/Codex runtime adapter** is authoritative for staging and live
   publication of a newly created trace after listener binding. An equal fold is
   not a new version and creates no live event.
4. The **AgentRun semantic event** is authoritative for live meaning. Standalone/team transports may change casing/routing only.
5. The **run view projection** is authoritative for restart selection. Frontend hydration may validate but may not read raw files or reconstruct prompts.
6. The **Activity subsystem** is authoritative for resident trajectory state/presentation. Event Monitor utilities and provider adapters are not allowed dependencies.
7. The **selected run/team context** is authoritative for run/member identity and runtime kind. Those values are not duplicated in the five-field row or per-entry client payload.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `recordSystemInstructionSupply` | Active reverse lookup, equality, ID, strict row, append | Native bootstrap, external capture service | Adapter reads/writes JSONL directly and creates its own hash/ID | Extend capture result, not raw-file access |
| `PendingSystemInstructionEvent` | Listener-safe one-shot ownership of one newly created trace | Native/Codex runtime preparation and backend dispatch | Use it as a replay, retry, or durable delivery tracker | Construct it only for `created:true`; consume after successful fan-out |
| Canonical event constructor/guard | Exact `trace_id/content/ts`, run envelope, `statusHint:null` | Native/Codex pending publisher, Claude converter | Arbitrary `Record<string,unknown>` construction with provider fields | Add a typed constructor/parser |
| Run view projection | Raw normalization, recent split, Activity DTO mapping | GraphQL standalone/team services | Resolver scans archives or derives prompt from definition | Extend provider projection contract |
| Activity store + presentation | Identity/window/folding, summary/detail/completion | Live handler, hydration, desktop/mobile | Prompt-specific store or renderer parses wire DTO | Add explicit Activity variant/presentation branch |
| Event Monitor replay type guard | Non-system replay set | Active-page and recent conversation policy | Event Monitor projector accepts unknown system kind through default branch | Narrow accepted input type/exhaustive switch |

## Dependency Rules

Allowed:

- Runtime adapter -> core/system capture boundary -> raw-trace store.
- Native/Codex capture with `created:true` -> one candidate-local pending event
  for the newly appended trace.
- Runtime adapter -> canonical event constructor -> AgentRun source listener.
- AgentRun -> standalone/team transport adapters.
- Run history -> agent-memory normalized trace -> replay -> separate conversation/Activity projectors.
- Browser live/hydration adapters -> Activity store.
- Activity components -> Activity types/presentation and selected run context.

Forbidden:

- Frontend Activity -> Claude/Codex/native protocol fields.
- Event Monitor -> system-instruction Activity record.
- Runtime adapter -> Activity DTO/component.
- `RuntimeMemoryEventAccumulator` -> second system-instruction append.
- Turn/tool/working-context/compaction selection -> run-scoped system record.
- Trace recorder -> archive scan, runtime kind, run ID duplication, or UI label.
- UI -> current agent/team definition as a prompt fallback.
- GraphQL resolver -> direct JSONL business logic bypassing run projection.
- Activity store -> Event Monitor window/completion service.
- Persistence equality folding -> a new Activity version when `created:false`.
- Pending startup event -> replay/retry state, durable publication status, or archive/UI reconstruction.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `RunMemoryFileStore.recordSystemInstructionSupply(content, suppliedAt)` | Active instruction version | Strict fold-or-append | Raw record ID allocated once by store operation | Direct string equality; active rows only; returns trace on both outcomes |
| `MemoryStore.recordSystemInstructionSupply(...)` | Native memory persistence | Expose recorder through existing memory authority | Store already bound to run path | No `runId`, runtime, turn, or provider input |
| `SystemInstructionCaptureService.capture({memoryDir, content, suppliedAt})` | External runtime persistence | Bind common recorder to selected run directory | Explicit non-empty `memoryDir` | `runId` remains event/context identity, not stored record field |
| `buildSystemInstructionsSuppliedEvent(runId, trace)` | Live semantic fact | Build validated event from committed/reused trace | `runId` + raw trace `id` | Payload only `trace_id`, `content`, `ts` |
| `PendingSystemInstructionEvent.publishOnce(listeners)` | Startup publication | Delay one newly created committed trace until listeners exist, then consume it after successful fan-out | Event's run ID + raw trace ID | No queue/history/retry/durable-status semantics |
| `normalizeRawTraceRecords(records, limit)` | Normalized trace union | Strictly parse system rows; preserve existing turn rows | Physical input order + raw ID | Malformed system row omitted with diagnostic |
| `selectRecentRunProjectionEvents(events)` | Recent projection split | Return unchanged Event Monitor-compatible selection plus Activity selection | Event identity/physical ordinal | Never scans archives |
| `buildRunProjectionActivities(events)` | Activity history DTO | Map tool/compaction/system variants | Invocation ID, activity ID, raw trace ID | System DTO: exactly kind/activityId/content/ts; availability is derived |
| Existing `getAgentRunProjection` / `getTeamMemberRunProjection` | Run history transport | Return JSON activities | Existing run/team-member arguments | No new GraphQL query |
| `upsertSystemInstructionActivity(runId, activity)` | Resident system Activity | Admit/dedupe exact identity | Outer run ID + raw trace activity ID | Same ID with conflicting content/time is rejected diagnostically |
| `getRunActivityPresentation(activity, runtimeKind)` | Activity presentation | Derive title, summary, status, detail availability, completion | Activity + selected run runtime | No stored source label/character count |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Trace recorder | Yes | Yes | Low | Reject any proposed run/provider/turn arguments |
| External capture service | Yes | Yes | Low | Require explicit memory directory; do not guess run paths |
| Startup pending publication | Yes | Yes | Low | Accept only a newly created trace; lifecycle is bounded to one runtime candidate |
| Canonical event constructor | Yes | Yes | Low | Strict payload keys/values |
| Recent projection selector | Yes | Yes | Low | Return named Event Monitor/activity selections, not a boolean flag |
| Activity upsert | Yes | Yes | Low | Outer run identity + inner raw identity |
| Existing GraphQL projection query | Yes | Yes | Low | Keep resolvers thin |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Stored record | `SystemInstructionTraceRecord` | Yes | Low | Keep it distinct from turn-scoped `RawTraceItem` |
| Semantic fact | `SYSTEM_INSTRUCTIONS_SUPPLIED` | Yes | Low | Retain plural `Instructions` matching UI/systemPrompt subject |
| Capture operation | `recordSystemInstructionSupply` | Yes | Low | Name the actual semantic/physical invariant; do not call it snapshot or telemetry recording |
| Staged event | `PendingSystemInstructionEvent` | Yes | Medium | Document one-shot newly-created-trace role; no generic pending-event queue |
| Activity entry | `SystemInstructionActivity` | Yes | Low | Do not call it provider prompt/effective prompt |
| UI title | `System instructions` | Yes | Low | Source subtitle carries runtime-specific boundary |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active JSONL persistence/rotation | Core memory store | Extend | It already owns the exact files and archive lifecycle | N/A |
| External runtime memory path | Server agent-memory | Extend | It already bridges Claude/Codex facts to run memory | N/A |
| Provider-neutral live event | AgentRun event domain/pipeline | Extend | Existing normalization/fan-out boundary | N/A |
| Standalone transport | Agent streaming | Extend | Existing message mapper/handler | N/A |
| Team transport | TeamAgentEvent + team contracts | Extend | Required typed execution routing and validation | N/A |
| Restart projection | Run history local-memory provider | Extend | Existing active-only source of Activity | N/A |
| Trajectory UI contract | Frontend Activity | Extend/refactor | Current store/feed owns the resident surface but lacks a reusable boundary | N/A |
| Archive lookup/paging | Existing raw archive/Memory Inspector | Reuse only as storage behavior; no feature extension | User explicitly excluded archive Activity display | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine IDs | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory | Five-field model, fold/append, turn-only typed lists, compaction archive membership | DS-001, DS-004, DS-009 | Trace recorder/storage | Extend | No runtime or UI vocabulary beyond source constant |
| Server agent memory | External capture binding, normalized run/turn trace union, Memory Inspector API | DS-002–DS-004, DS-010 | Runtime adapters/run history | Extend | External accumulator remains non-owner for system persistence |
| Server AgentRun execution | Canonical event, listener-safe startup staging, runtime adapter emission | DS-001–DS-003, DS-005 | AgentRun/runtime adapter | Extend | Provider protocols terminate here |
| Server team execution/contracts | Team event admission/routing/validation | DS-005 | Root/team stream | Extend | Same semantic fields plus routing |
| Server run history | Replay variant, split selection, Activity DTO | DS-004, DS-006, DS-008 | Local run view projection | Extend | Event Monitor set remains limited to its pre-existing kinds |
| Web Activity | Types, window/folding, presentation, live/hydration, desktop/mobile | DS-005–DS-007 | Activity surface | Extend/refactor | No separate prompt store |
| Web Memory Inspector | Nullable run scope display | DS-010 | Agent memory view | Extend | Natural consequence of the stored row |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `memory/models/system-instruction-trace.ts` | Core memory | Persisted model | Constants, exact record/capture types, strict parser | One semantic record | N/A |
| `memory/store/run-memory-file-store.ts` | Core memory | Physical store | Supply recorder callbacks; turn-list filtering; compaction archive membership | Existing file authority | Uses model/recorder |
| `agent-memory/services/system-instruction-capture-service.ts` | Server memory | External capture facade | Bind `memoryDir` to core recorder | Keeps provider adapters off storage internals | Uses core capture type |
| `agent-execution/domain/system-instructions-supplied-event.ts` | Server execution | Semantic event | Exact typed constructor/guard | Prevent loose payloads | Uses capture result |
| `agent-execution/events/pending-system-instruction-event.ts` | Server execution | Startup seam | One-shot publication of newly created trace after listener attachment | Shared only by Native/Codex listener timing | Uses canonical event |
| `run-history/projection/historical-replay-event-types.ts` | Run history | Replay contract | Add run-scoped system variant | Existing replay owner | Uses normalized system trace |
| `run-history/projection/recent-run-projection-policy.ts` | Run history | Recent selection | Split Event Monitor-compatible and Activity selections | Existing policy owner | Uses replay guard |
| `types/activity/RunActivity.ts` | Web Activity | UI domain contract | Narrow base + specialized variants | Shared across store/render/hydration | N/A |
| `services/activity/runActivityPresentation.ts` | Web Activity | Presentation policy | Derived title/summary/status/detail/completion/source | Removes duplicated stored/presentation fields | Uses runtime kind + union |
| `components/progress/RunActivityItem.vue` | Web Activity | Desktop dispatch | Exhaustive specialized component selection | One extension seam | Uses Activity union |
| `components/progress/SystemInstructionActivityItem.vue` | Web Activity | Desktop system renderer | Disclosure and exact content | One specialized payload | Uses presentation utility |
| `components/mobile/MobileRunActivityItem.vue` | Web Activity | Mobile dispatch/render | Exhaustive compact presentation and system disclosure | Removes branch blob from list | Uses presentation utility |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Five-field row + capture result | `system-instruction-trace.ts` + `RunMemoryFileStore.recordSystemInstructionSupply` | Core memory | Native and external runtimes need identical durability | Yes | Yes | Provider-aware metadata bag or delivery tracker |
| Canonical live payload validation | `system-instructions-supplied-event.ts` | AgentRun execution | Three adapters and two transports use it | Yes | Yes | Generic event factory |
| Native/Codex pre-listener staging | `pending-system-instruction-event.ts` | AgentRun execution | Same listener-timing problem | Yes | Yes | General replay queue or durable delivery tracker |
| Activity union | `types/activity/RunActivity.ts` | Web Activity | Store/hydration/desktop/mobile share it | Yes | Yes | Mostly-optional base |
| Summary/detail/completion/source | `runActivityPresentation.ts` | Web Activity | Desktop/mobile/window all need consistent derived semantics | Yes | Yes | Persistence or provider parser |
| System replay guard | replay types/policy | Run history | Event Monitor and Activity must make opposite admission decisions | Yes | Yes | Scattered string checks |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `SystemInstructionTraceRecord` | Yes | Yes | Low | Exact five keys; strict parser |
| `SystemInstructionsSuppliedEvent` | Yes | Yes | Low | `trace_id` must equal record `id`; no event/snapshot/activity ID |
| `SystemInstructionActivity` | Yes | Yes | Low | Store only `kind`, `activityId`, `content`, `timestamp`; derive source/count/status |
| `RunActivityBase` | Yes | Yes | Low | Only `kind`, `activityId`, `timestamp`; no optional kitchen sink |
| Run-keyed Activity timeline | Yes | Yes | Low | Outer map/context owns run/member identity and array position owns order |
| Normalized memory trace union | Yes | Yes | Medium | Use explicit internal `scope` discriminator; GraphQL exposes nullable turn/seq, not the internal discriminator if unnecessary |
| Replay union | Yes | Yes | Low | System variant has no `turnGroupId`; Event Monitor accepts an explicit non-system subtype |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models/system-instruction-trace.ts` (add) | Core memory | Persisted model | Exact record/capture types, constants, strict parser | One stored subject | N/A |
| `autobyteus-ts/src/memory/store/{base-store,file-store,run-memory-file-store}.ts` | Core memory | Store boundary | Capture method, turn-only typed lists, compaction archive operation | Existing storage authority | Model/recorder |
| `autobyteus-ts/src/memory/{memory-manager,memory-manager-tool-protocol-safety}.ts` | Core memory | Native memory facade/turn safety | Delegate capture and consume renamed turn lists | Existing owner | Capture result |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-committer.ts` | Core memory | Accepted compaction | Call compaction-owned archive method | Existing commit sequence | Store API |
| `autobyteus-server-ts/src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts` | Existing app-data migration | Native snapshot-v5 migration caller | Rename its current active-reference read to `listTurnRawTracesOrdered` without changing the migration ID, historical decoder, source/target mapping, status, cleanup, or recovery behavior | Clean-cut caller update required by the turn-only API rename; released input facts remain identical | Current turn-reader API only |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Native runtime | Transient startup state | Hold a newly created trace until backend construction | Existing runtime state | Capture type |
| `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | Native runtime | Truth boundary | Capture time, successful configure, persist, remove content log | Exact handoff owner | MemoryManager |
| `autobyteus-server-ts/src/agent-memory/services/system-instruction-capture-service.ts` (add) | Server memory | External persistence facade | Capture against explicit memoryDir | Shared Claude/Codex entry | Core store |
| `autobyteus-server-ts/src/agent-execution/domain/{agent-run-event,system-instructions-supplied-event}.ts` | AgentRun | Semantic contract | Enum + strict variant/constructor/type guard | Existing event boundary + specialized contract | Capture result |
| `autobyteus-server-ts/src/agent-execution/events/pending-system-instruction-event.ts` (add) | AgentRun execution | Startup publication | One-shot staging of a newly created trace until listener binding | Shared Native/Codex timing | Canonical event |
| Native backend factory/backend files | Native adapter | Server bridge | Transfer transient capture and publish before input | Existing adapter owner | Pending event |
| Claude session state/event/converter/session files | Claude adapter | SDK boundary | Inject capture, persist after query creation, emit typed session event | Existing query owner | Capture service/event |
| Codex thread manager/thread/backend files | Codex adapter | App-server boundary | Persist after successful thread response, stage, publish before input | Existing thread owner | Capture service/pending event |
| Standalone stream model/mapper/handler debug files | Agent streaming | Transport | New message type/mapping; content-redacted debug | Existing transport | Canonical event |
| Team agent event/adapter/projector + team contract source | Team execution | Team transport | Exact team variant/Zod payload/mapping | Existing team boundary | Canonical fields |
| `agent-memory/domain/models.ts`, raw normalizer, memory GraphQL converter/type | Server memory/API | Normalized trace | Run/turn union, strict prompt parsing, nullable turn/seq | Existing inspection/replay path | System model constants |
| Run history replay/types/policy/provider/activity transformer | Run history | History projection | System replay, split selection, Activity DTO | Existing projection owner | Normalized union |
| `autobyteus-web/types/activity/RunActivity.ts` (add) | Web Activity | Domain contract | Tool/compaction/system variants | One shared UI subject | N/A |
| `autobyteus-web/services/activity/{runActivityPresentation,runActivityWindowPolicy}.ts` (add) | Web Activity | Presentation/window | Derived metadata and 100-entry policy | Removes Event Monitor coupling | Activity union |
| `agentActivityStore.ts`, system live handler, stream protocol/projector, team adapter, hydration | Web Activity | State/adapters | Strict live/reload admission and dedupe | Existing state and ingress boundaries | Activity union |
| `RunActivityItem.vue`, `SystemInstructionActivityItem.vue`, `ActivityFeed.vue` | Web Activity | Desktop UI | Exhaustive dispatch and disclosure | Specialized files | Presentation |
| `MobileRunActivityItem.vue`, `MobileRunActivityList.vue` | Web Activity | Mobile UI | Exhaustive mobile row/disclosure; preserve first ten | Specialized file + thin list | Presentation |
| `RawTracesTab.vue`, web memory type/query/generated GraphQL | Web memory | Inspector | Truthful run-scoped row | Existing raw inspection | Nullable API |
| English/Chinese workspace and memory locale catalogs | Web presentation | Localization | Approved titles/source/a11y/run-scope copy | Existing locale owners | Presentation keys |

## Applied Patterns (If Any)

- **Event-fed projection:** one semantic event updates a typed Activity entry; raw provider events never reach UI.
- **Persist-before-publish:** the live event always references an already-committed raw record.
- **Strict discriminated variants:** run-scoped system data and turn-scoped operational traces do not share false optional identity.
- **Thin facade over governing owner:** MemoryManager/external capture service expose the recorder without duplicating policy.
- **Shared shell, specialized body:** Activity uses a narrow common contract and explicit kind renderers rather than generic JSON.
- **Explicit projection split:** one normalized evidence stream produces separate Event Monitor and Activity selections.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models/` | Folder | Core memory models | New exact system trace model | Raw record is memory domain data | Runtime/UI/provider fields |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | File | Physical store + capture invariant | Fold or commit active record and report whether it appended | Existing JSONL owner; one synchronous invariant | Runtime kind, publication status, Activity policy |
| `autobyteus-ts/src/memory/store/` | Folder | Persistence provider | Physical read/append/archive and turn-list APIs | Existing JSONL authority | Activity projection |
| `autobyteus-server-ts/src/agent-memory/services/` | Folder | Server memory bridge | External capture and raw normalization | Existing runtime-memory integration | Provider UI copy |
| `autobyteus-server-ts/src/agent-execution/domain/` | Folder | AgentRun semantics | Typed supplied event | Existing provider-neutral vocabulary | Raw provider event types |
| `autobyteus-server-ts/src/agent-execution/events/` | Folder | AgentRun event concern | Bounded one-shot startup event | Native/Codex share listener timing | General event persistence or delivery ledger |
| Runtime-specific backend folders | Folder | Runtime adapter | Exact capture placement/conversion/staging | Truth remains closest to handoff | Raw trace schema invention |
| `autobyteus-server-ts/src/run-history/projection/` | Folder | History projection | Replay types, selection, Activity mapping | Existing reopen owner | Archive browsing |
| `autobyteus-team-stream-contracts/src/` | Folder | Team wire schema | New exact team payload variant | Existing shared contract | Provider metadata |
| `autobyteus-web/types/activity/` | Folder | Activity domain | Shared discriminated UI types | Separates contract from state | Pinia mutations |
| `autobyteus-web/services/activity/` | Folder | Activity policy | Derived presentation/window behavior | Removes Event Monitor ownership leak | Provider protocol parsing |
| `autobyteus-web/components/progress/` | Folder | Desktop Activity | Exhaustive dispatcher + system detail card | Existing Activity surface | Raw transport parsing |
| `autobyteus-web/components/mobile/` | Folder | Mobile Activity | Mobile exhaustive item + thin list | Existing mobile surface | Duplicate title/status rules |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Core `memory/models` | Main-Line Domain-Control | Yes | Low | One record model beside current memory models |
| Core `memory/store` | Persistence-Provider | Yes | Low | Keep folding policy extracted so store does not become a domain blob |
| Server `agent-memory/services` | Off-Spine Concern | Yes | Low | Thin external-runtime binding only |
| Server runtime backend folders | Main-Line Domain-Control | Yes | Medium | Only lifecycle-specific timing stays here; common event/storage stays outside |
| Server `run-history/projection` | Main-Line Domain-Control | Yes | Low | Projection split is its current responsibility |
| Web `types/activity` + `services/activity` | Main-Line Domain-Control / Off-Spine presentation | Yes | Low | Separates domain shape from Pinia and components without artificial modules |
| Web component folders | Transport/Presentation | Yes | Low | Dispatcher and specialized items match current UI layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### Exact Stored Row

```json
{"id":"rt_1787241600123_f3ad...","ts":1787241600.123,"trace_type":"system_instruction","content":"You are the workspace agent.\nPreserve this spacing.\n","source_event":"SYSTEM_INSTRUCTIONS_SUPPLIED"}
```

There is deliberately no `turn_id`, `seq`, `run_id`, `runtime_kind`, `instruction_boundary`, `snapshot_id`, `fidelity`, hash, provider ID, or metadata object.

### Canonical Live Event

```ts
{
  eventType: AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED,
  runId: "solution_designer_d402...",
  payload: {
    trace_id: "rt_1787241600123_f3ad...",
    content: "You are the workspace agent.\nPreserve this spacing.\n",
    ts: 1787241600.123,
  },
  statusHint: null,
}
```

### Tight Frontend Entry

The server-side run-projection variant is also narrow and is not persisted:

```ts
type RunProjectionSystemInstructionActivityEntry = {
  kind: "system_instruction";
  activityId: string; // persisted raw-trace id
  content: string;
  ts: number; // positive finite Unix seconds
};
```

The frontend hydration adapter validates that DTO and produces:

```ts
type RunActivityKind = "tool" | "compaction" | "system_instruction";

type RunActivityBase<K extends RunActivityKind> = {
  kind: K;
  activityId: string;
  timestamp: Date;
};

type SystemInstructionActivity = RunActivityBase<"system_instruction"> & {
  content: string;
};

// activityId is the raw trace id; timestamp is derived from ts.
// run/member identity is the outer timeline context.
// source label and character count are presentation derived from runtimeKind/content.
```

### Projection Split

```ts
const all = buildHistoricalReplayEvents(activeRawTraces);
const eventMonitorCompatible = all.filter(isEventMonitorReplayEvent);
const recentEventMonitor = eventMonitorCompatible.slice(-100); // unchanged Event Monitor basis
const activityEvents = mergeSystemEventsInsideEventMonitorHorizon(all, recentEventMonitor);

const conversation = buildRunProjectionConversation(recentEventMonitor);
const activities = buildRunProjectionActivities(activityEvents);
```

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Persistence | One exact row + event reusing row ID | Separate prompt snapshot/event store with `snapshot_id` | Prevents redundant authority |
| Runtime truth | Capture successful method argument at handoff | Recompose from current agent definition on reopen | Preserves historical exactness |
| Trace scope | Run-scoped system variant, nullable API turn | `turn_id:"startup"`, `seq:0` | Avoids false causal identity |
| UI contract | Narrow base + specialized system body | `{kind, payload:any, metadata:any}` | Enables future kinds without weakening type meaning |
| Source label | Derived from locked run runtime | Persist `runtime_kind` + `instruction_boundary` | Avoids duplicate fields |
| Event Monitor | Filter before policy/cursor/projector | Let projector default branch guess new kind | Preserves the central surface |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Retain old ambiguous raw-list names as wrappers | Many callers exist | Rejected | Rename all callers in one change; APIs explicitly say turn-scoped |
| Parse system rows through `RawTraceItem.fromDict` with empty turn/zero seq | Avoid union changes | Rejected | Strict run-scoped model/normalizer; nullable external turn/seq |
| Store optional new fields on generic `RawTraceItem` | Smaller diff | Rejected | Separate exact five-field class |
| Add prompt-only GraphQL query/store/panel | Fast visible delivery | Rejected | Existing run projection + Activity union/feed |
| Scan archive if active prompt missing | Stronger restart visibility | Rejected | Honest absence under approved active-only lifecycle |
| Reconstruct from current definitions | Could populate old runs | Rejected | No row when not historically recorded |
| Keep Activity's Event Monitor policy imports | Preserves current file layout | Rejected | Activity-owned policy with same 100 behavior |
| Allow optional `kind` and treat unknown history rows as tools | Existing frontend tolerance | Rejected | Exact discriminant switch; malformed entry-only omission |
| Dual-persist via runtime accumulator and capture recorder | Could reuse external recorder | Rejected | Capture recorder is sole durable authority; accumulator ignores event |
| Persist runtime/source/display fields | Simplifies card | Rejected | Derive from run context/content |

## Derived Layering (If Useful)

1. **Runtime observation:** Native/Claude/Codex exact handoff.
2. **Durable semantic evidence:** core system trace record in active JSONL.
3. **Listener-safe observability:** Native/Codex stage only a newly created trace until their listener exists.
4. **Canonical execution event:** typed AgentRun event.
5. **Transport:** standalone or team projection.
6. **History projection:** normalized trace -> replay -> Activity DTO.
7. **Client trajectory:** live/hydration adapters -> Activity state.
8. **Presentation:** derived source/summary/detail -> specialized desktop/mobile card.

Dependencies only move downward through the owning boundaries above; restart begins at layer 2 and joins at layer 6.

## Change / Refactor Sequence

1. Add the strict core record/capture types and recorder tests.
2. Replace ambiguous typed raw-list APIs with turn-scoped names and update all callers, including the existing native snapshot-v5 migration's active-reference call. Do not change that migration's ID, historical converter, source/target mapping, status, cleanup, or recovery semantics. Make generic current raw deserialization admit the explicit union where needed.
3. Add store/MemoryManager capture commands and update native compaction archiving to carry preceding/equal system rows without selecting their content.
4. Capture Native at successful prompt configuration and remove the full prompt console log; transfer a newly created trace to the private backend for listener-safe staging.
5. Add the server external capture service and canonical event constructor/guard.
6. Add Native/Codex one-shot newly-created-trace pending publication and Claude post-query capture/emission; cover initial, identical, changed, reversion, supported handoff rejection, and restore paths.
7. Extend standalone and team event/contract projections; add content-safe specialized logging for both server `RUNTIME_RAW_EVENT_DEBUG` and browser streaming diagnostics with sentinel non-disclosure tests.
8. Introduce normalized run/turn trace union, nullable Memory Inspector API fields, strict malformed system-row omission, and physical-order tie handling.
9. Add system replay and Activity DTO variants. Split recent Event Monitor-compatible selection from Activity selection before any Event Monitor cursor or visual projection.
10. Move Activity types and window/presentation policy to Activity-owned files; remove Event Monitor imports and non-compaction-as-tool fallback.
11. Add live handler/hydration for the exact system entry, exhaustive desktop/mobile dispatchers, disclosure UI, and English/Chinese copy.
12. Regenerate GraphQL client types, update Memory Inspector run-scope rendering, and remove all decommissioned branches/APIs.
13. Run implementation-scoped type/build/unit checks, including a production-source web semantic check that catches missing imported types. Downstream API/E2E owns broader coverage investigation and realistic standalone/team/browser execution.

No temporary dual write/read or compatibility wrapper is permitted between steps. Intermediate commits may be non-green; the completed change must contain only the target path.

## Key Tradeoffs

- **Post-success capture versus attempted invocation:** The record is committed after the local handoff call returns a usable configured/query/thread result. This avoids claiming a supplied boundary for a call that failed before establishment. Timestamp is sampled immediately at invocation and preserved through the post-success append.
- **Staging versus a replayable event bus:** Native/Codex need a narrow one-shot staging seam because preparation precedes listeners. A general replay bus would duplicate history and broaden scope; raw trace plus reopen hydration already owns replay.
- **Exact content versus redaction:** Exactness is the approved purpose. The design contains it through the existing selected-run boundary and explicit disclosure, removes redundant logging, and does not invent redaction state.
- **Active-only simplicity versus long-term visibility:** No archive index/scan/pinning is added. The prompt may disappear from Activity after recent trimming/rotation exactly as approved.
- **Run-scoped union versus optional turn fields everywhere:** A discriminated internal union is more work but prevents prompt records from entering turn/LLM logic and eliminates fake identity.
- **Event Monitor preservation versus a single universal replay slice:** Explicitly split presentation sets. This adds one policy function but prevents silent cursor/count/UI changes.

## Risks

- **Sensitive content disclosure:** Full instructions can include internal paths/policies. Mitigation: selected-run authorization, collapsed detail, no new telemetry/export, remove full native log, and special-case both supported server/browser streaming diagnostics so neither generic serializer receives content.
- **Startup event loss:** Native/Codex listeners do not exist during capture. Mitigation: stage each newly created trace, then publish it after `onActiveRunReady` binding and before backend input.
- **Duplicate large rows:** Claude can supply every turn; restores can reconfigure. Mitigation: active-only consecutive direct string folding; no hashes.
- **False turn leakage:** Existing readers assume turn fields. Mitigation: renamed turn-only APIs, normalized union, strict compiler narrowing, no default turn/seq.
- **Event Monitor regression:** Shared replay currently falls through unknown kinds. Mitigation: explicit non-system subtype before recent/page/generation/projector paths and regression fixtures comparing old outputs.
- **Native compaction pinning:** Exact selected-ID archive would leave system rows active. Mitigation: compaction-specific physical archive membership by selected position, without changing semantic compaction inputs/counts.
- **Content/time mismatch for same ID:** Live and hydration could conflict if adapters allocate again. Mitigation: recorder allocates once, event constructor consumes the record, store rejects conflicting duplicate IDs.
- **Malformed row isolation:** A bad system row must not erase tools. Mitigation: row-local strict admission with diagnostic; valid existing-turn normalization continues.
- **Existing whole-file read cost:** Unchanged and potentially large. It is an acknowledged deferred performance risk, not worsened by archive scanning.

## Guidance For Implementation

### Capture and normal exception semantics

- Sample `suppliedAt = Date.now() / 1000` immediately before the handoff call.
- Persist only after the handoff returns successfully:
  - Native: after `configureSystemPrompt` returns.
  - Claude: after `startQueryTurn` returns a usable query and before output iteration.
  - Codex: after a valid thread ID returns and before startup is marked ready.
- Do not catch a persistence exception and publish an uncommitted event. Let the
  existing owning runtime's normal exception propagation/cleanup apply; add no
  feature-specific retry, rollback, or storage-failure recovery path.
- `capture.created` means “a new instruction version was appended.” Claude
  emits and Native/Codex stage/publish only for `created:true`; `created:false`
  is equal active-version folding and creates no new semantic event.
- Do not add `published`/`pending` fields, a sidecar delivery ledger, a retry
  registry, archive lookup, or definition reconstruction.
- Empty strings, whitespace, and line endings are content and must not be trimmed or normalized. Validate type, not presentation value.

### Exact storage invariants

- The constructed `SystemInstructionTraceRecord` written to JSONL must contain
  exactly five keys.
- `parseSystemInstructionTraceRecord` must require a non-empty ID, positive finite seconds, exact constants, a string content value, and no extra keys.
- Search only the active records in reverse for the latest system row. Do not read archives and do not compare hashes.
- A changed value and a later reversion each append. When rotation removed the latest system row, the next supply appends.
- Preserve raw physical ordinal when timestamp comparison cannot use real turn/sequence identity.

### Event and transport invariants

- Add `AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED` without including it in status/lifecycle processors.
- The canonical payload is exactly `{trace_id, content, ts}`; `statusHint` is `null`.
- The external `RuntimeMemoryEventAccumulator` must explicitly ignore it because persistence already occurred.
- Standalone wire payload stays the canonical three fields. Team wire adds only existing `change_sequence` and `agent_run_id` routing.
- The frontend team adapter removes team routing and yields the same standalone-shaped message to `dispatchAgentStreamMessage`.
- Both supported diagnostics require an explicit system-event safe case:
  server `AgentStreamHandler` under `RUNTIME_RAW_EVENT_DEBUG=1`, and browser
  `AgentStreamingService.logMessage` under the documented localStorage/global
  debug controls. They may report event type, `trace_id`, `ts`, and a derived
  content length only; they must not pass the event/payload/content to generic
  JSON/object logging.

### History and Event Monitor invariants

- Create an internal normalized trace discriminator such as `scope:"run"|"turn"`; do not persist it.
- A system replay event uses raw `id` as `eventId` and has no turn group. Do not synthesize one.
- Compute the Event Monitor-compatible recent set, `hasEarlierActiveTraceEvents`, active generation, page cursor, and Event Monitor visuals only from non-system events. Name new current-model variables by their subject (for example `eventMonitorCompatibleEvents`), not `legacyEvents`; these are current event kinds, not a compatibility path.
- For normal Activity, merge system events whose physical/replay ordinal is at or after the first selected recent Event Monitor-compatible event; if fewer than 100 Event Monitor-compatible events exist, all active system events are eligible. Let the Activity store enforce its final 100-entry bound.
- A valid system DTO always carries its exact `content`; the UI therefore
  derives detail availability. Do not add a constant `detailLevel:"full"`
  field to the system DTO or persisted row.

### Activity and UI invariants

- `RunActivityBase` contains only `kind`, `activityId`, and `timestamp`.
- Frontend `timestamp` is a valid `Date` derived from the server DTO's positive
  finite seconds-valued `ts`; malformed system timestamps cause only that
  system entry to be omitted rather than falling back to `new Date()`.
- `SystemInstructionActivity` adds only `content`. The run-keyed map/team context owns run/member identity; the array owns order; presentation derives title/source/character count/detail/completion.
- Derive the displayed character count as Unicode code points with `Array.from(content).length`; do not store it or use UTF-8 byte length/UTF-16 code-unit length as the user-facing count.
- Runtime source labels:
  - `autobyteus`: `AutoByteus-supplied · Native configured system prompt`
  - `claude_agent_sdk`: `AutoByteus-supplied · Claude SDK systemPrompt`
  - `codex_app_server`: `AutoByteus-supplied · Codex baseInstructions`
- For an unexpected runtime string, use neutral `AutoByteus-supplied system instructions`; do not invent a provider boundary.
- Use an exhaustive switch with an unreachable assertion in presentation and dispatch. Do not use a generic fallback component.
- The system item starts collapsed; use a real button with `aria-expanded`, `aria-controls`, and an accessible name containing title/runtime/availability.
- Render exact content in a selectable monospaced `<pre>`/equivalent with `white-space: pre-wrap`, safe word breaking, contained max height, and internal scrolling.
- Preserve desktop auto-follow/highlight behavior and mobile's current first-ten list policy. A system disclosure on mobile may be inline full-width; no drawer is required.

### Required implementation evidence

Implementation-scoped tests should demonstrate the following using isolated temporary/disposable run-memory fixtures only; they must never read or mutate a user's live profile:

- exact five-key serialization, folding initial/identical/change/reversion/rotation-reset, positive timestamps, and raw ID reuse;
- no system row returned by turn-only readers or used in tool/working-context/compaction prompt selection;
- the existing native snapshot-v5 migration still consumes the same turn reference facts for supported released fixtures after its caller-only API rename; no new migration registration or behavior is introduced;
- native/Claude/Codex content equality to their real successful handoff arguments and persist-before-publish ordering;
- Native/Codex pending event delivery after listener binding and before first runtime input, exactly once;
- server and browser debug-log sentinel tests proving exact prompt content is
  absent while type/trace ID/timestamp/derived length remain observable;
- standalone and team transport contract parity;
- restart restoration from active file and absence after active selection/rotation without archive reads;
- Event Monitor recent/page/cursor/count outputs unchanged when the same fixture gains a system row;
- malformed system row omission without losing tool/compaction activities;
- GraphQL Memory Inspector nullable run scope without fake turn/sequence;
- live/hydrated Activity identity and presentation equivalence;
- desktop/mobile disclosure accessibility, exact whitespace, long-line containment, tool/compaction regressions, and the Activity 100/mobile ten policies.
- an explicit production-source TypeScript semantic check after importing
  `ToolApprovalTarget` from its authoritative segment type module; build and
  transpilation-only test passes are not sufficient evidence for CR-F-003.
