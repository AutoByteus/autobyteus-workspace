# Design Spec — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` SR-004, `Approved` by the Solution Designer within the direction (user informed); DEC-4 (single agent first) is the user's own decision of 2026-10-30, relayed by the Project Task Manager. **This design is `Draft` until the user approves it (Task constraint: no build before that).**
- Behavior-defining supplements and their approval references: `run-runtime-switch-contract.md` v2 (layout and data model; approved together with this design, not before).
- Design status: `Draft` (awaiting the user's approval)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/investigation-notes.md` (F-01…F-32)
- Authorities read (design reading gate; 2026-10-30): `.claude/skills/solution-designer/references/architecture-design.md`, `design-principles.md`; project `DESIGN.md` (repository root) and `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2; `GLOSSARY.md`; `TESTING.md` (layers, rules 1–9); `design-examples.md` not used.
- Project design-principle conflicts with the general principles, or discrepancies (for the user): **one.** The raw-trace manifest spells a segment's runtime as `CODEX/CLAUDE/ANTIGRAVITY/GROK_BUILD/AUTOBYTEUS` (3,786 stored entries, written by five backends) while code names runtimes `RuntimeKind` (`codex_app_server`, …). Principle 15 treats a permanent mapping between a stored name and a different code name as a signal. Recommendation: keep the stored spelling and put the mapping in one file (`raw-trace-runtime-label.ts`); renaming 3,786 entries in 820 runs would be a data rewrite for no user benefit. Follow-up `FU-006` (converge later). I decide this; it changes no user-visible behavior.

## Current-State Read

A stopped standalone Agent run keeps one provider binding (`runtimeKind`, model, settings, `platformAgentRunId`) in `run_metadata.json`. The settings editor changes the model only; the runtime is locked because a run restores only from its own runtime's session (F-06, F-25). The first message to a stopped run goes through `StandaloneAgentRunLifecycleService.activateOnce` inside the run's transition lane: a prepared run starts a fresh session (`activatePrepared`), a started run restores its session (`restoreStarted`) (F-26). Platform notices (tool-list change, skill change) ride along with the next input through `AgentRunInputPreface` (F-27). The chat history is built from raw traces and does not depend on the runtime (F-15). The Work Journal renders every file of a run with the run's one current runtime (F-24), which is wrong for work done by a different runtime earlier. Raw traces already rotate through one idempotent primitive that a switch can reuse (F-20, F-23). Nothing here is structurally broken; the change adds one lifecycle case, one notice source, one marker writer and a per-file journal runtime.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Large**
- Size rationale and supporting evidence: crosses four packages/subsystems — `autobyteus-ts` (one type value), server run lifecycle and run-history, agent memory (marker + label), Work Journal (per-file runtime), notice route and composition, GraphQL contract, web settings/model menu/store/chat notice label — about 26 files (Target Subsystem / Folder / File Mapping) plus tests.
- Architectural risk: **High**
- Risk rationale and supporting evidence: new persisted fields and a new manifest boundary type (contract/persistence); an activation case with an ordered, crash-sensitive sequence (provider session, memory rotation, metadata commit) in the run's transition lane (concurrency/ownership); changes a derived-data ownership rule (journal runtime per file); GraphQL contract change (clean cut); touches the first-message path of every restored run only through one added branch (blast radius bounded by a test that the existing restore cases are unchanged).
- Escalation trigger if implementation or validation discovers new impact: the native runtime's memory writer cannot tolerate rotation of its active file between prepare and first input (F-29 says it appends by path; if a held file handle is found, the order of marker/rotation vs candidate preparation changes); `isExactTarget`/`recordRunStarted` cannot express removal of the pending field; a runtime whose file tool cannot read the run folder (U-2) forces the excerpt fallback in this slice.

## Architecture Investigation Evidence

Detailed evidence is in the investigation notes; this maps it to decisions.

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Folder test on synthetic data | notes F-23; `probes/runtime-switch-folder.probe.test.ts`; `evidence/folder-test-output.txt` | Marker + rotation + append + idempotent retry work with the real store; only a type value is missing | Marker is the first record of the new active file; rotation by the existing primitive; boundary type `runtime_switch` | None for the folder; native writer handle (escalation trigger) |
| Journal service read + probe + count | notes F-24; `agent-work-journal/services/work-journal-service.ts:166,222`; `agent-memory/services/raw-trace-file-source-service.ts:111-125` | One runtime per run today; segment labels exist but are not exposed; 823 of 825 real journals consistent with their segments' label | Per-file runtime, label read from the raw manifest; no renderer revision bump | The 2 journals with a null run runtime will render differently (correctly) |
| Settings save path | notes F-25; `api/graphql/types/agent-run.ts:301`; `standalone-stopped-run-model-config-updater.ts`; `run-model-selection-service.ts:45-73` | Clean seam in the transition lane; validation needs a fresh-selection mode | Extend the existing mutation with `runtimeKind`; commit a pending switch | None |
| Lifecycle read | notes F-26; `standalone-agent-run-lifecycle-service.ts` (`activateOnce`, `activatePrepared`, `persistAndPublish`) | Fresh session on an existing run ID is an existing case | Third case `activateSwitched` | `isExactTarget` and the removed optional field (trigger above) |
| Notice route | notes F-27, F-28; `compositions/build-studio-server.ts:345`; `agent-run-input-preface.ts` | A third source fits; marker is a notice | New `runtime-handover-notices` source; marker = notice record | None |
| Native facts | notes F-29 | Create appends, snapshot is rewritten, turn ids restart as on any construction | No special native handling | Real run with native not in this slice's plan |
| Web | notes F-30; `ExistingRunSettings.vue`, `ChatModelMenu.vue:38,253`, `SystemTaskNotificationSegment.vue` | The runtime-grouped menu exists; lock is one attribute | Unlock for eligible runs | Browser probe |

## Intended Change

A stopped standalone Agent run's settings let the user pick another runtime and model. Saving only records a pending switch. The next message makes the switch in the activation: the new session starts, the old records are archived behind a marker the chat and journal show, the new agent receives a hand-over notice pointing at the journals, and each journal file is read with the runtime that produced it.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002 (requirements) — the settings choice and save, the switch activation, marker and rotation, the hand-over notice, the per-file journal runtime, the chat marker label, validation as a fresh selection; REQ-001…003, 006…008, 010…013.
- Derived consumers, when a stored or shared structure changes:
  - Raw-trace manifest (new boundary type): readers of `boundary_type` — the raw-trace file source (lists segments; no branch on type), the compaction recorders (own types only). Decision: no reader branches on the type except the new journal-runtime lookup; verify by grep at implementation.
  - `run_metadata.json` (new optional field): readers — history catalog, resume-config service (tolerates null `platformAgentRunId`), run listings. Decision: no reader needs the field except the lifecycle service and the updater; a test opens, lists and views a pending-switch run.
  - Work Journal manifest (per-file runtime): readers — memory search's journals step (uses file versions and hashes, not the runtime), the journal reader tools. Decision: unchanged outputs for a run that never switched; the journal file text is rendered the same, so content hashes and the evidence hash stay equal and memory search re-indexes nothing.
  - Chat history projection and journal renderer: both already handle `system_task_notification`; no change.
- Deliberately left alone: team members, Org members, delegated copies (FU-003); agent- or Model-Router-started switch (FU-004); the restart notice of 283–289 (FU-005); the five backends' own runtime-label literals (FU-006); the stop reason (FU-001, not needed); the journal wording (done by 331); the native `working_context_snapshot.json` (a switch to or from native never edits it).
- Follow-ups: FU-003, FU-004, FU-005, FU-006 (in `follow-ups.md`); FU-001, FU-002 stay as recorded.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 013; AC-001 | User saves the settings of a stopped standalone Agent run with another runtime/model | Model-only edit; runtime locked (F-25, F-30) | Same run; pending switch recorded; ineligible runs rejected | DS-001 |
| BEH-002 | System | REQ-002, 003, 006…008, 010; AC-002, 004, 009 | First input to a run with a pending switch | Restore or prepared start only (F-26) | Switch activation: new session, marker + rotation, notice before the user's text, once | DS-002 |
| BEH-005 | User | REQ-011; AC-002 | Chat shows the run | History from raw traces (F-15, F-28) | Marker where the runtime changed, live and on reload | DS-002 (marker record, live presentation) |
| BEH-006 | System | REQ-008 | New runtime cannot read the run folder | Unknown (U-2) | Excerpt fallback only if the real run shows it is needed | DS-002 (builder), decided after the real run |
| BEH-007 | System | REQ-012; AC-006 | Journal is made current | One runtime for all files (F-24) | Per-file runtime; runs that never switched unchanged | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `run-runtime-switch-contract.md` | Layout, data model, write order, invariants | REQ-001, 002, 010, 012; AC-001…009 | The data contract this design implements; section numbers are cited below | v2, approved with this design |
| `probes/runtime-switch-folder.probe.test.ts`, `evidence/folder-test-output.txt` | Folder test | REQ-010, 012 | Evidence for rotation/marker/journal findings; the test is reused and extended in the build | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes` — one: the journal assumes one runtime per run (F-24). It does not break any run today and becomes wrong the moment a run can switch.
- Structural triggers that fire: *Shared structure looseness* — the journal manifest's run-level `runtime_kind` is the wrong granularity (evidence F-24). *Plausible, ruled out:* a new god-service for "switching" (the work splits across the existing owners: updater/commit for the settings save, lifecycle for the activation, memory for the marker, notice source for the notice, journal for rendering); a second notice path (the existing preface port is used); a new raw-trace record type (a notice record is enough, F-28).
- Root cause classification: `Shared Structure Looseness` (the journal manifest's granularity); the rest is `No Design Issue Found`.
- Refactor needed now: `Yes` — small: per-file runtime in the journal manifest replaces the run-level field (clean cut; Principle 8).
- Evidence: F-24 (reproduced and measured).
- Design response: the manifest entry of each file carries the runtime used to render it; the run-level `runtime_kind` is removed; reuse compares per file.
- Refactor rationale: keeping both would be a dual path; the run-level field has no other reader (grep of `src/agent-work-journal`, `src/memory-search`).
- Intentional deferrals and residual risk: the label mapping stays a mapping (see discrepancy above, FU-006); a crash between activation and the first input loses the in-memory notice (contract 3.3).

## Terminology

Per `GLOSSARY.md`: Agent, Agent Run, Agent Runtime, Work Journal, Raw Trace. Task-specific: **switch** (replacing the provider binding of a stopped run), **pending switch** (the settings choice not yet made real), **previous agent** (the backend of an earlier segment), **hand-over notice**, **marker** (contract §1, §3.3).

## Section Fill Order

(Template guidance; sections below follow the template order.)

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the journal manifest's run-level `runtime_kind` and its use in `reconcile`; the `runtime-locked` attribute for eligible runs in `ExistingRunSettings.vue`; the model-only input shape of `updateStoppedAgentRunModelConfig` (replaced by runtime + model + settings).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: (a) `run_metadata.json`, one per run (525 on this machine) — a new optional `pendingRuntimeSwitch`; (b) `raw_traces_manifest.json`, 3,786 segment entries in 820 runs — a new `boundary_type` value used only by new switches; (c) `work_journal/work_journal_manifest.json`, one per run (~4,000) — a per-file `runtime_kind`.
- Relevant code-model, serialization, semantic, or physical-store change: (a) optional field with its own parse and normalizer line, the way `delegatedFrom` was added; (b) one more union member; old entries and readers unaffected; (c) manifest shape change of derived data.
- Normal reader/writer behavior and representative evidence: (a) absence means "no pending switch"; (b) no existing entry has the new type, every existing entry is read as before (Measured, notes F-21); (c) the store drops an entry without the new field and the run is rendered again (store `readManifest` already drops invalid entries as "render again").
- Required semantics and invariants under direct use: contract §4 I-1…I-9; for runs that never switched the journal text is byte-identical, so content hashes and the evidence hash are unchanged (verified by the test over the real-shaped fixtures and, read-only, by comparing a re-render of an isolated copy with the stored files).
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: no secrets are written (the marker and notice contain runtime names, model names and file paths); journals are derived and deletable; no user data is read outside the run's own folder; experiments use isolated copies only.
- Decision: (a) `Directly Usable — No Migration`; (b) `Directly Usable — No Migration`; (c) `Discard or Rebuild` (derived; rebuilt from raw traces on the next `ensureCurrent`/catch-up with no model call).
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: a migration would rewrite ~4,000 derived files to add a field the renderer recomputes anyway. Cost of the rebuild: each run renders once on its next catch-up (CPU and disk, no model, no network) — the same kind of one-time pass that autobyteus-331's revision change already caused; content is unchanged so nothing is re-indexed.
- Acceptance criteria or design constraints supported by this decision: AC-006, AC-007, AC-009; DESIGN rule 7 (a run's unreadable manifest only renders that run again).

Data Migration Guideline §2 checklist: new persisted fields are optional and read tolerantly (§3 "avoid migrations by design"); no historical shape is decoded in current business code; no startup gate is added; unreadable/odd data of one run affects only that run.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | User changes runtime/model in the settings of a stopped run and saves | `run_metadata.json` holds the new binding and the pending switch | Stopped-run model-config updater (server) with `existingRunConfigStore` (web) | The user's only action; must be undoable and safe |
| DS-002 | Primary End-to-End | BEH-002, 005, 006 | The user's first message to the run | The new agent receives notice + message; chat shows the marker | `StandaloneAgentRunLifecycleService` (transition lane) | The ordered, crash-sensitive heart of the feature |
| DS-003 | Bounded Local | BEH-007 | `ensureCurrent` for a run with several raw files | Each journal file rendered with its own runtime | `WorkJournalService` | Without it, earlier work reads wrongly |

## Primary Execution Spine(s)

DS-001: `ExistingRunSettings.vue -> existingRunConfigStore.saveAgent -> mutation client -> updateStoppedAgentRunModelConfig (GraphQL) -> StudioRunModelConfigService -> AgentRunService.updateStoppedModelConfig -> StandaloneAgentRunLifecycleService.updateStoppedModelConfig (transition lane) -> StandaloneStoppedRunModelConfigUpdater -> RunModelSelectionService.validate (fresh selection) -> commitAgentRunRuntimeSwitch -> AgentRunMetadataStore`

DS-002: `first input -> StandaloneAgentRunLifecycleService.resolve (transition lane) -> activateOnce -> activateSwitched -> AgentRunManager.beginActivation(new).prepare -> validateCandidate -> RuntimeSwitchRecorder (marker, rotate) -> persistAndPublish (new binding, pending cleared) -> RuntimeHandoverNoticeService.register -> run returned -> AgentRun dispatch -> AgentRunPlatformNotices.takePreface -> RuntimeHandoverNoticeService (WorkJournalService.ensureCurrent / listJournalFiles -> notice builder) -> provider (notice + user text) -> prefaceDelivered -> live SYSTEM_TASK_NOTIFICATION`

DS-003: `WorkJournalService.ensureCurrent -> RawTraceFileSourceService.listFiles (segment labels) -> runtime of each file (label mapping / current runtime) -> WorkJournalFileRenderer.render(file runtime) -> manifest entry with runtime_kind`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The settings form lets an eligible stopped run choose any available runtime; the save sends runtime, model and settings. Inside the run's transition lane the updater checks eligibility, validates the pair as a fresh selection of that runtime and commits through a run-history commit function: new binding, `platformAgentRunId` null, `pendingRuntimeSwitch` holding the whole previous binding. Choosing the original runtime again writes the original binding back and clears the pending switch. No memory file is touched. | Settings draft, updater, commit function, metadata | Stopped-run model-config updater | Eligibility predicate; fresh-selection validation |
| DS-002 | The first message finds `pendingRuntimeSwitch` with no session ID and takes the third activation case: start a fresh session of the new runtime (existing `new` request), validate it, then — before anything is published — append the marker and rotate the old records away (idempotent by key), commit the metadata (session set, pending cleared) and publish. The notice service remembers the hand-over for this run. When the message is dispatched the preface port hands the notice over; the server builds it from facts (journal made current first) and the provider receives it before the user's text. The live notice shows the marker; on reload the recorded marker does. | Metadata, candidate session, marker record, notice | Lifecycle service | Switch recorder (memory); notice source; journal service; web notice label |
| DS-003 | For each raw file the journal looks up the runtime that wrote it (an archived segment: its recorded label mapped to a runtime kind; the open file: the run's current runtime) and renders with that runtime's rules; the manifest records the runtime per file and reuses a closed file only when it matches. | Raw file source, renderer, manifest | `WorkJournalService` | Label mapping |

## Spine Actors / Main-Line Nodes

Settings draft and store (web); `StandaloneStoppedRunModelConfigUpdater`; `commitAgentRunRuntimeSwitch`; `AgentRunMetadataStore`; `StandaloneAgentRunLifecycleService`; the activation candidate (`AgentRunManager.beginActivation`); `RuntimeSwitchRecorder`; `RuntimeHandoverNoticeService`; `AgentRun`/preface port; `WorkJournalService`.

## Ownership Map

- Updater: decides model-only edit vs switch vs undo for a stopped run; owns eligibility and validation call. Commit function: owns the metadata shape written (as `commitAgentRunModelConfig` does for the model).
- Lifecycle service: owns the order of the activation (candidate → marker → metadata → publish → register notice) and crash behavior; the only writer of `run_metadata.json` at activation.
- `RuntimeSwitchRecorder` (agent-memory): owns writing the marker record and rotating the raw traces for a switch, idempotent by key. It does not know about activation.
- `RuntimeHandoverNoticeService`: owns the pending hand-over per run and the notice text; reads facts from the journal service; knows nothing about activation internals.
- `WorkJournalService`: sole owner of journal files and their per-file runtime.
- `raw-trace-runtime-label.ts` (agent-memory): sole owner of the stored label ⇄ `RuntimeKind` mapping.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `updateStoppedAgentRunModelConfig` GraphQL mutation, `StudioRunModelConfigService`, `AgentRunService.updateStoppedModelConfig` | `StandaloneStoppedRunModelConfigUpdater` | Existing transport and service chain | The decision model-only/switch/undo; eligibility |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Run-level `runtime_kind` of `WorkJournalManifest` and its check in `reconcile`; its store parse/write | A run's files can have different runtimes | Per-file `runtime_kind` in `WorkJournalManifestFile` | Derived data; old manifests are read tolerantly (entries without the field are rendered again) |
| `runtime-locked` on `ExistingRunSettings.vue` for eligible runs; model-only mutation input | The runtime is now part of the selection | Draft carries `runtimeKind`; mutation input has `runtimeKind` | Members and delegated copies keep the lock |

## Return Or Event Spine(s) (If Applicable)

Live marker: `prefaceDelivered -> run publishes SYSTEM_TASK_NOTIFICATION (sender system.runtime_handover, the short marker line) -> web SystemTaskNotificationSegment (label)`. The recorded marker (written at activation) is what the history projection shows after a reload. The live notice is not recorded (the sender id is deliberately not in `RECORDED_SYSTEM_NOTICE_SENDER_IDS`), so there is one record per switch.

## Bounded Local / Internal Spines (If Applicable)

Activation order inside `activateSwitched` (parent owner: lifecycle service): `prepare -> validate -> record marker/rotate -> persistAndPublish -> register notice`. Why it matters: a failure at any step must leave a state a retry completes (contract §3.3 crash behavior): before the marker nothing changed but a discarded candidate (`abortForRetry`); after the marker and before the commit the retry finds the marker/key and skips; `persistAndPublish`'s exactness check decides committed or not as it does for prepared runs.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Eligibility of a run for a switch | DS-001, DS-002 | Updater | Pure predicate: standalone, started, not application-/system-owned, not a delegated copy | One rule for server check and web decision | Duplicated rules in web and server |
| Fresh-selection validation | DS-001 | Updater | Validate the model for a runtime with no current model (skip the native capacity rule) | A switch has no previous model on the new runtime | Wrong rejections |
| Switch recorder | DS-002 | Lifecycle | Marker + rotation, idempotent | Memory owns its files | Lifecycle writing memory files |
| Notice source | DS-002 | Preface port | Pending state, text from journal facts | The port's contract | Lifecycle knowing journal layout |
| Label mapping | DS-002, DS-003 | Recorder, journal | `RuntimeKind` ⇄ stored label | One owner of stored spelling | Five literals |
| Web notice label | DS-002 | Chat | Label for the sender id | Existing pattern | Raw sender id shown to the user |

## Ownership Boundaries

Authority changes hands at: web → GraphQL (transport only); updater → commit function (shape of metadata); lifecycle → recorder (memory files) and notice service (notice text) and manager (candidate). The journal files are written only by `WorkJournalService`; the notice service reads them through its public methods only. `run_metadata.json` is written only by the lifecycle service/commit function through the metadata store.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkJournalService` | store, renderer, per-file runtime lookup | Notice service, memory search, tools | Reading `work_journal/` files directly in the notice builder | Add a method (`listJournalFiles` already returns size/lines/days; add the file's runtime) |
| `RuntimeSwitchRecorder` | writer, rotation primitive, marker lookup | Lifecycle service | Lifecycle appending raw traces or calling the rotation primitive | Extend the recorder |
| `RuntimeHandoverNoticeService` | pending state, builder | Lifecycle (`register`), preface composite | Lifecycle building text | Extend the service |

## Dependency Rules

Lifecycle depends on the recorder and the notice service through narrow ports (as it already does for `historyCatalogService`); the notice service depends on `WorkJournalService` and the preface contract, not on the lifecycle; the journal depends on the raw file source and the label mapping, not on the recorder; web depends only on the GraphQL contract. The recorder and the notice service must not depend on each other.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `updateStoppedAgentRunModelConfig(input: { agentRunId, runtimeKind, llmModelIdentifier, llmConfig })` | A stopped standalone run's provider selection | Model-only edit, switch, or undo | `agentRunId` (run ID) | `runtimeKind` required (clean cut); all callers updated |
| `commitAgentRunRuntimeSwitch({ metadata, selection, requestedAt })` | The metadata written by a switch/undo | Build the new metadata | Run metadata | In `run-history/services/`, beside `agent-run-model-config-commit.ts` |
| `RuntimeSwitchRecorder.record({ memoryDir, runId, key, from, to })` | The raw traces at a switch | Marker + rotation, idempotent | `memoryDir` + run ID + key | `from`/`to` carry runtime kind and model |
| `RuntimeHandoverNoticeService.register(runId, handover)` / `takePreface` / `prefaceDelivered` / `prefaceReturned` | The pending hand-over per run | Notice delivery once per switch | Run ID | Implements `AgentRunInputPreface` |
| `WorkJournalService.listJournalFiles(memoryDir)` | Journal file summaries | Adds `runtimeKind` per file | `memoryDir` | Existing method extended |
| `rawTraceRuntimeLabel(kind)` / `runtimeKindFromRawTraceLabel(label)` | Stored label spelling | Mapping | `RuntimeKind` / stored label | Unknown label → null (rendered with the no-runtime rules, as today) |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `updateStoppedAgentRunModelConfig` | Yes (one stopped run's selection; three outcomes are one decision by one owner) | Yes (`agentRunId`) | Low | None |
| `RuntimeSwitchRecorder.record` | Yes | Yes | Low | None |
| `RuntimeHandoverNoticeService` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere (Glossary, P15)? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Changing the provider binding of a stopped run | switch / `pendingRuntimeSwitch` | Yes | Yes (runtime = Agent Runtime) | Low | None |
| Notice to the new agent | hand-over notice / `runtime-handover-notices` | Yes | Yes | Low | None |
| Previous backend | previous agent (user-facing), earlier segment (code) | Yes | Yes | Low | The notice says "previous agent" |
| Stored runtime spelling | raw trace runtime label | Yes | Documented discrepancy | Medium | FU-006 |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Settings save + validation | Stopped-run model-config updater, `RunModelSelectionService` | Extend | Same seam, same lane | — |
| Fresh session on an existing run ID | `beginActivation({kind:"new"})`, `persistAndPublish` | Reuse | Already used by prepared runs | — |
| Archive records at a boundary | `rotateActiveRawTracesBeforeBoundary` | Reuse (+ one type value) | Idempotent, tested | — |
| Marker in chat and journal | `system_task_notification` records, projection, renderer | Reuse | F-28 | — |
| Notice before the next input | `AgentRunInputPreface` + `AgentRunPlatformNotices` | Extend (third source) | F-27 | A new source only |
| Journal listing facts | `WorkJournalService.listJournalFiles` | Extend | Already has size, lines, days | — |
| Runtime display name | `agentRuntimeName` (agent-presentation-contracts) | Reuse | Already used server-side | — |
| Runtime label mapping | none (five literals) | Create New | A single owner is needed by recorder and journal | Literals live in backends; no shared file exists |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory store | Boundary type value | DS-002 | Recorder | Extend | Type only |
| `agent-execution` (lifecycle, eligibility, updater) | Activation order, eligibility, settings decision | DS-001, DS-002 | Lifecycle, updater | Extend | |
| `run-history` | Metadata shape, commit function | DS-001, DS-002 | Updater | Extend | |
| `agent-memory` | Marker + rotation, label mapping, file source label | DS-002, DS-003 | Recorder, journal | Extend + Create | |
| `runtime-handover-notices` | Hand-over notice | DS-002 | Preface port | Create New (folder like the two existing notice folders) | |
| `agent-work-journal` | Per-file runtime | DS-003 | Journal service | Extend | |
| `llm-management` | Fresh-selection validation | DS-001 | Updater | Extend | |
| `api/graphql` | Mutation input | DS-001 | — | Extend | |
| `autobyteus-web` | Runtime choice, hint, notice label | DS-001, DS-002 | Settings, chat | Extend | |

## Draft File Responsibility Mapping / Reusable Owned Structures Check / Shared Structure Tightness / Final File Responsibility Mapping

Combined (the structures are few): the only shared structure is the **pending switch**: `{requestedAt, from: {runtimeKind, llmModelIdentifier, llmConfig, platformAgentRunId}}` — one meaning per field, no field duplicates another (the new binding lives in the ordinary metadata fields), no parallel representation (the raw manifest records the history). The second is the **label mapping** (one file). File responsibilities are the rows of the next table; each file has one concern. Redundant attributes removed: yes; overlapping representations removed: yes (run-level journal runtime removed).

## Applied Patterns (If Any)

Adapter/mapping (label ⇄ kind); Strategy already used by the journal renderer (translation per runtime); notice source implements the existing preface port.

## Target Subsystem / Folder / File Mapping

Server paths under `autobyteus-server-ts/src/`, library under `autobyteus-ts/src/`, web under `autobyteus-web/`.

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | File (change) | Library | Add `'runtime_switch'` to `RawTraceArchiveBoundaryType` | The type lives here | Switch logic |
| `agent-memory/domain/raw-trace-runtime-label.ts` | File (new) | Label owner | Mapping `RuntimeKind` ⇄ stored label | One owner of stored spelling | Rendering or recording |
| `agent-memory/services/raw-trace-file-source-service.ts` | File (change) | Raw file source | Expose the segment's runtime label on `RawTraceFileSource` | The source already reads the entries | Mapping |
| `agent-memory/store/external-runtime-memory-writer.ts` | File (change) | Writer | Keep `correlationId` for `system_task_notification` records | Marker lookup | Switch logic |
| `agent-memory/services/runtime-switch-recorder.ts` | File (new) | Recorder | Marker + rotation, idempotent by key | Memory owns its files; mirrors `provider-compaction-boundary-recorder.ts` | Activation logic |
| `agent-execution/domain/system-task-notification-senders.ts` | File (change) | Senders | Add `RUNTIME_HANDOVER_NOTICE_SENDER_ID = "system.runtime_handover"` | Existing place | — |
| `agent-execution/services/standalone-agent-run-eligibility.ts` | File (change) | Eligibility | Add `canSwitchRuntime(metadata)` | Beside the existing predicate | I/O |
| `agent-execution/services/standalone-stopped-run-model-config-updater.ts` | File (change) | Updater | Model-only / switch / undo decision, fresh-selection validation | The seam (F-25) | Metadata shape |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | File (change; 376 → ≤ ~460 lines, else extract `activateSwitched` into `standalone-agent-run-switch-activation.ts`) | Lifecycle | `activateSwitched` branch in `activateOnce`; calls recorder and notice service | Owner of order | Notice text, file writes |
| `run-history/services/agent-run-runtime-switch-commit.ts` | File (new) | Run-history | `commitAgentRunRuntimeSwitch` (switch and undo) | Beside `agent-run-model-config-commit.ts` | Eligibility |
| `run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, new `agent-run-pending-runtime-switch.ts` | Files (change/new) | Metadata store | Type, parse and normalizer entry of the optional field | Precedent `delegatedFrom` | Switch logic |
| `llm-management/services/run-model-selection-service.ts` | File (change) | Selection | Fresh-selection mode of `validate` | Existing validator | — |
| `api/graphql/types/agent-run.ts` | File (change) | GraphQL | `runtimeKind` in the input; rejection messages | Existing mutation | Decisions |
| `runtime-handover-notices/runtime-handover-notices.ts` | File (new) | Composition entry | Creates the service | Mirrors `tool-list-updates.ts` | Logic |
| `runtime-handover-notices/services/runtime-handover-notice-service.ts` | File (new) | Notice | Pending state; implements `AgentRunInputPreface` | The port | Journal rendering |
| `runtime-handover-notices/services/runtime-handover-notice-builder.ts` | File (new) | Notice text | Pure text from facts (contract §3.6) | Pure and testable | I/O |
| `compositions/build-studio-server.ts` | File (change) | Composition | Add the third source and pass the service to the lifecycle | Where the two others are wired | Logic |
| `agent-work-journal/domain/work-journal-models.ts`, `store/work-journal-store.ts`, `services/work-journal-service.ts` | Files (change) | Journal | Per-file `runtime_kind`; remove run-level; `listJournalFiles` returns `runtimeKind`; lookup rule | DS-003 | Label spelling |
| `autobyteus-web/components/run-settings/ExistingRunSettings.vue`, `RunSettingsCard.vue` | Files (change) | Settings | Unlock the runtime for eligible runs; draft carries `runtimeKind`; hint line | Existing | Server rules |
| `autobyteus-web/components/chat/ChatModelMenu.vue` | File (change if needed) | Menu | Show all runtimes when not locked (existing mode) | Existing | — |
| `autobyteus-web/stores/existingRunConfigStore.ts`, `services/runConfigEditing/existingRunModelConfigMutationClient.ts`, `graphql/mutations/runHistoryMutations.ts`, `generated/graphql.ts` | Files (change) | Web state/client | Pass the runtime | Existing | — |
| `autobyteus-web/components/.../SystemTaskNotificationSegment.vue` + locale files | Files (change) | Chat | Label for the hand-over sender | Pattern of the two existing labels | — |
| `tickets/.../probes/runtime-switch-folder.probe.test.ts` | File | Test | Extended into unit/integration tests in the build | — | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `runtime-handover-notices/` | Off-Spine Concern | Yes | Low | Same shape as `tool-list-updates/` and `skill-update-notices/` |
| `agent-memory/services/runtime-switch-recorder.ts` | Off-Spine Concern | Yes | Low | Beside its precedent |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Where the switch happens | At the first input, in the activation, after the new session exists | At the settings save (archiving and a marker for a switch the user may undo, and nothing to retry the new session) | A save is a form edit; the real work belongs where a run is started |
| Marker | An ordinary notice record the existing readers show | A new record type with new readers in the projection, the journal and the web | Fewer changed readers |
| Notice | Server-built from facts, journals named | A model-written summary, a summary file, or a fixed journal excerpt copied into the prompt | The user: the agent reads and decides; no limits |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the run-level journal runtime beside the per-file one | Old manifests have it | Rejected | Old entries without the per-file field are rendered again |
| Keep a model-only mutation input beside the new one | Old web clients | Rejected | The web and the server are built together (DESIGN rule 9); one input shape |
| Rename stored runtime labels | Principle 15 | Rejected (cost, no user benefit) | Documented discrepancy and FU-006 |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Library: add the boundary type value; build `autobyteus-ts`.
2. Memory: label mapping; file source exposes the label; writer keeps the notice correlation id; switch recorder (+ tests: rotation, marker, retry, crash injection).
3. Journal: per-file runtime (models, store, service, `listJournalFiles`); remove the run-level field; tests (mixed-runtime fixture, unchanged output for a single-runtime run).
4. Metadata: optional field, parse, normalizer; commit function.
5. Settings save: eligibility, updater (switch/undo), fresh-selection validation, GraphQL input; tests.
6. Activation: `activateSwitched` in the lifecycle; sender id; notice service and builder; composition; tests with scripted runtimes including a crash at each step.
7. Web: unlock, draft, store/client/generated types, hint, notice label; unit tests and a browser probe.
8. Real run on an isolated instance of the worktree build; update docs (`docs/modules` for memory, journal, run history; the GraphQL docs) in the same change.
9. Removal: delete the run-level journal runtime and the locked attribute for eligible runs (done in steps 3 and 7).

## Key Tradeoffs

- Switch at the first input (not at the save): the form stays a simple, undoable edit; the cost is one more activation case. A save-time switch would archive and mark a switch the user may take back.
- Marker as a notice record: the live and recorded views can differ in order by a few milliseconds (live: after the user's message; reload: before it). Accepted; the user sees the marker before the agent's answer in both.
- The notice is held in memory: a server crash between activation and the first input loses it (the journals and the marker remain; the user can restate the task). Persisting it would add a second stored fact for an edge outside the supported scenarios.
- Journal rebuild instead of migration: one-time local render per run, no model cost.

## Risks

- Quality of the continuation depends on the new agent's model and on its file tool reaching the run folder (U-2, U-4): checked in the real run; the excerpt fallback (REQ-008) is added only if the real run shows it is needed.
- Native writer after rotation (escalation trigger above).
- A crash between the marker and the commit followed by the user undoing the switch leaves a marker for a switch that did not happen (a few-millisecond window; the journal and chat show the marker, nothing breaks).
- The restart-and-resume notice (283–289) may later share the next input (FU-005).
- Pending-switch runs with `platformAgentRunId: null` flow through listings, views and resume-config: tested (Change Scope).

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `probes/runtime-switch-folder.probe.test.ts` (copy into `autobyteus-server-ts/tests/`, run `./node_modules/.bin/vitest run <file>` from `autobyteus-server-ts`; it turns into the permanent test of the recorder and the journal's per-file runtime).
- Tests (TESTING.md layers): library type; server unit — label mapping, recorder (rotation, marker, idempotence), journal per-file runtime and reuse, commit function (switch, undo, repeated switch keeps the first `from`), updater (eligible/ineligible, fresh-selection validation), notice builder (text, partial-reading instruction, says "previous agent", does not repeat the user's message), notice service (once per switch, `prefaceReturned` keeps it pending); server integration — lifecycle `activateSwitched` with scripted runtimes: success order, failure of the new session (nothing changed), crash after marker (retry completes with one marker and one archived segment), existing restore and prepared cases unchanged, pending-switch run opens/lists; GraphQL contract; web — store/menu/settings unit tests, browser probe of the settings journey.
- Real run (TESTING.md rule 1–2: worktree build, isolated instance, never the user's data): `pnpm --silent isolated-app start --build` with imported credentials; a throwaway workspace; a Claude run does a small multi-step task, is stopped by hand (a usage limit cannot be produced on demand; the switch path is identical because no stop reason is recorded), its settings switched to Codex, one message sent; check: same run ID and chat, marker, notice received, the new agent reads the journals and continues, `raw_traces_000001.jsonl` holds the Claude records, journals translated per file. A scripted Antigravity run covers U-2 for that runtime. Record the evidence in the validation report. Clean up the instance.
- Done means (Task): the user has approved this design; then in this slice a run stopped on one runtime continues on another with the work carried over, shown by the tests and the real run on isolated data; merged to `personal`. No release unless asked. Prove from a clean clone.
