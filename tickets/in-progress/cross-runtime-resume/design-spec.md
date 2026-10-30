# Design Spec — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` SR-004, `Approved` by the Solution Designer within the direction (user informed); DEC-4 (single agent first) is the user's own decision of 2026-10-30, relayed by the Project Task Manager. **The Task requires the user's approval of the design before any build: his go for architecture review (2026-10-30: "use your design principle to review your design once again if it's nice then send to architecture review") is recorded in SR-004 note 7; the final approval to build stays his and is asked again after the review.**
- Behavior-defining supplements and their approval references: `run-runtime-switch-contract.md` v2 (layout and data model; approved together with this design, not before).
- Design status: `Ready` (re-audited against the design principles on 2026-10-30; the user said to send it to architecture review once this re-check was clean, SR-004 note 7)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/investigation-notes.md` (F-01…F-32)
- Authorities read (design reading gate; 2026-10-30): `.claude/skills/solution-designer/references/architecture-design.md`, `design-principles.md`; project `DESIGN.md` (repository root) and `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2; `GLOSSARY.md` (Agent Runtimes: agent runtime names, no short forms); `TESTING.md` (layers, rules 1–9); `design-examples.md` not used. Principles 1–15, the structural-trigger table and the health assessment were re-read in full on 2026-10-30 and applied in the section "Design Principles Check" below.
- Project design-principle conflicts with the general principles, or discrepancies (for the user, with my reasoning and recommendation). Both are vocabulary discrepancies (Principle 15) that already exist; this change does not create them, and fixing them is outside it:
  1. **Stored runtime spelling.** The raw-trace manifest stores a segment's runtime as `CODEX/CLAUDE/ANTIGRAVITY/GROK_BUILD/AUTOBYTEUS` (3,786 stored entries, written by five backends) while the code names runtimes `RuntimeKind` (`codex_app_server`, …). The journal needs the runtime of every archived file (REQ-012), so it must read this stored name, and a mapping to `RuntimeKind` is unavoidable. Principle 15 says a rename of stored names is a data migration, never a permanent mapping. Recommendation: keep the stored spelling and put the mapping in one file; a migration would rewrite the raw-trace manifests (the authoritative data) of 820 runs, for no user benefit and with a data-loss risk. Follow-up FU-006. Needs your OK if you want the migration instead.
  2. **`ModelConfig` in the names of the stopped-run edit** (`updateStoppedAgentRunModelConfig`, `updateStoppedModelConfig`, `StoppedRunModelConfigInput`, `StudioRunModelConfigService`, `StandaloneStoppedRunModelConfigUpdater`; the team family `updateStoppedTeamRunModelConfig` shares the words): the edit now also carries the agent runtime, which the name does not say. Renaming only the agent chain would split one family in two; renaming the family touches teams, Orgs and delegated copies, which are out of scope. Recommendation: keep the names now and rename the whole family in the follow-up that extends the switch to teams (FU-007).

## Current-State Read

A stopped standalone Agent run keeps one provider binding (`runtimeKind`, model, settings, `platformAgentRunId`) in `run_metadata.json`. The settings editor changes the model only; the runtime is locked because a run restores only from its own runtime's session (F-06, F-25). The first message to a stopped run goes through `StandaloneAgentRunLifecycleService.activateOnce` inside the run's transition lane: a prepared run starts a fresh session (`activatePrepared`), a started run restores its session (`restoreStarted`) (F-26). Platform notices (tool-list change, skill change) ride along with the next input through `AgentRunInputPreface` (F-27). The chat history is built from raw traces and does not depend on the runtime (F-15). The Work Journal renders every file of a run with the run's one current runtime (F-24), which is wrong for work done by a different runtime earlier. Raw traces already rotate through one idempotent primitive that a switch can reuse (F-20, F-23). Nothing here is structurally broken; the change adds one lifecycle case, one notice source, one marker writer and a per-file journal runtime.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Large**
- Size rationale and supporting evidence: crosses three packages and eight subsystems — `autobyteus-ts` (one type value); the server's run lifecycle, run-history, agent memory (marker + label), Work Journal (per-file runtime), notice route and composition, model selection and the GraphQL contract; the web settings, model menu, store and chat notice label — about 30 files (Target Subsystem / Folder / File Mapping) plus tests.
- Architectural risk: **High**
- Risk rationale and supporting evidence: new persisted fields and a new manifest boundary type (contract/persistence); an activation case with an ordered sequence that must be retry-safe (provider session, memory rotation, metadata commit) in the run's transition lane (concurrency/ownership); changes a derived-data ownership rule (journal runtime per file); GraphQL contract change (clean cut); touches the first-message path of every restored run only through one added branch (blast radius bounded by a test that the existing restore cases are unchanged).
- Escalation trigger if implementation or validation discovers new impact: a native or external memory writer is found that holds the active raw-trace file open across the rotation (the library store appends by path: `run-memory-file-store.ts:404`, so none is known); `recordRunStarted` cannot express removal of the pending field.

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

- In scope: UC-001, UC-002 (requirements) — the settings choice and save, the switch activation, marker and rotation, the hand-over notice, the per-file journal runtime, the chat marker label, validation as a fresh selection; REQ-001…003, 007, 010…013.
- Derived consumers, when a stored or shared structure changes:
  - Raw-trace manifest (new boundary type): readers of `boundary_type` — the raw-trace file source (lists segments; no branch on type), the compaction recorders (own types only). Decision: no reader branches on the type except the new journal-runtime lookup; verify by grep at implementation.
  - `run_metadata.json` (new optional field): readers — history catalog, resume-config service (tolerates null `platformAgentRunId`), run listings. Decision: no reader needs the field except the lifecycle service and the updater; a test opens, lists and views a pending-switch run.
  - Work Journal manifest (per-file runtime): readers — memory search's journals step (uses file versions and hashes, not the runtime), the journal reader tools. Decision: unchanged outputs for a run that never switched; the journal file text is rendered the same, so content hashes and the evidence hash stay equal and memory search re-indexes nothing.
  - Chat history projection and journal renderer: both already handle `system_task_notification`; no change.
- Deliberately left alone: team members, Org members, delegated copies (FU-003); agent- or Model-Router-started switch (FU-004); the restart notice of 283–289 (FU-005); the five backends' own runtime-label literals (FU-006); the stop reason (FU-001, not needed); the journal wording (done by 331); the native `working_context_snapshot.json` (a switch to or from native never edits it).
- Follow-ups: FU-003, FU-004, FU-005, FU-006 (in `follow-ups.md`); FU-001 stays as recorded.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 013; AC-001 | User saves the settings of a stopped standalone Agent run with another runtime/model | Model-only edit; runtime locked (F-25, F-30) | Same run; pending switch recorded; ineligible runs rejected | DS-001 |
| BEH-002 | System | REQ-002, 003, 007, 010; AC-002, 004, 009 | First input to a run with a pending switch | Restore or prepared start only (F-26) | Switch activation: new session, marker + rotation, notice before the user's text, once | DS-002 |
| BEH-005 | User | REQ-011; AC-002 | Chat shows the run | History from raw traces (F-15, F-28) | Marker where the runtime changed, live and on reload | DS-002 (marker record, live presentation) |
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
- Intentional deferrals and residual risk: the label mapping stays a mapping (see discrepancy above, FU-006); a process crash between activation and the first input would lose the in-memory notice (not a supported scenario; contract 3.3).

## Terminology

Per `GLOSSARY.md`: **agent runtime** (what runs an agent; never "LLM runtime"), the agent runtime names (Claude Agent SDK, Codex App Server, Antigravity CLI, Grok Build, AutoByteus: used in the marker, the notice and the UI, no short forms), Work Journal, Memory. Words this change introduces (added to `GLOSSARY.md`, section Agent Runtimes, in the same change — Principle 15):

- **Agent runtime switch:** replacing the agent runtime, model and model settings of a stopped standalone Agent run, keeping the run. It is made real at the run's next input.
- **Pending agent runtime switch:** the user's choice, saved in the run's metadata, before that input.
- **Hand-over notice:** the system notice the new agent receives with that input (where the journals are, how they are laid out).
- **Switch marker:** the notice record that starts the new raw-trace file; shown in the chat and the journal.
- **Previous agent:** the agent that worked on the run on the earlier agent runtime (wording toward the agent; in code, the earlier segment).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the journal manifest's run-level `runtime_kind` and its use in `reconcile`; the `runtime-locked` attribute for eligible runs in `ExistingRunSettings.vue`; the model-only input shape of `updateStoppedAgentRunModelConfig` (replaced by runtime + model + settings).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: (a) `run_metadata.json`, one per run (525 on this machine) — a new optional `pendingRuntimeSwitch`; (b) `raw_traces_manifest.json`, 3,786 segment entries in 820 runs — a new `boundary_type` value used only by new switches; (c) `work_journal/work_journal_manifest.json`, one per run (~4,000) — a per-file `runtime_kind`.
- Relevant code-model, serialization, semantic, or physical-store change: (a) optional field with its own parse and normalizer line, the way `delegatedFrom` was added; (b) one more union member; old entries and readers unaffected; (c) manifest shape change of derived data.
- Normal reader/writer behavior and representative evidence: (a) absence means "no pending switch"; (b) no existing entry has the new type, every existing entry is read as before (Measured, notes F-21); (c) the store drops an entry without the new field and the run is rendered again (store `readManifest` already drops invalid entries as "render again").
- Required semantics and invariants under direct use: contract §4 I-1…I-9; for runs that never switched the journal text is byte-identical, so content hashes and the evidence hash are unchanged (verified by the test over the real-shaped fixtures and, read-only, by comparing a re-render of an isolated copy with the stored files).
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: no secrets are written (the marker contains agent runtime and model names; the notice contains file paths and numbers); journals are derived and deletable; no user data is read outside the run's own folder; experiments use isolated copies only.
- Decision: (a) `Directly Usable — No Migration`; (b) `Directly Usable — No Migration`; (c) `Discard or Rebuild` (derived; rebuilt from raw traces on the next `ensureCurrent`/catch-up with no model call).
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: a migration would rewrite ~4,000 derived files to add a field the renderer recomputes anyway. Cost of the rebuild: each run renders once on its next catch-up (CPU and disk, no model, no network) — the same kind of one-time pass that autobyteus-331's revision change already caused; content is unchanged so nothing is re-indexed.
- Acceptance criteria or design constraints supported by this decision: AC-006, AC-007, AC-009; DESIGN rule 7 (a run's unreadable manifest only renders that run again).

Data Migration Guideline §2 checklist: new persisted fields are optional and read tolerantly (§3 "avoid migrations by design"); no historical shape is decoded in current business code; no startup gate is added; unreadable/odd data of one run affects only that run.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | User changes runtime/model in the settings of a stopped run and saves | `run_metadata.json` holds the new binding and the pending switch | `StandaloneStoppedRunModelConfigUpdater` (server); the web settings and store are the initiating surface | The user's only action; must be undoable and safe |
| DS-002 | Primary End-to-End | BEH-002, 005 | The user's first message to the run | The new agent receives notice + message; chat shows the marker | `StandaloneAgentRunLifecycleService` (transition lane) | The ordered, retry-sensitive heart of the feature |
| DS-003 | Bounded Local | BEH-007 | `ensureCurrent` for a run with several raw files | Each journal file rendered with its own runtime | `WorkJournalService` | Without it, earlier work reads wrongly |

## Primary Execution Spine(s)

DS-001 (initiating surface: the web settings; governing owner: the updater): `ExistingRunSettings.vue -> existingRunConfigStore.saveAgent -> mutation client -> updateStoppedAgentRunModelConfig (GraphQL) -> StudioRunModelConfigService -> AgentRunService.updateStoppedModelConfig -> StandaloneAgentRunLifecycleService.updateStoppedModelConfig (transition lane) -> StandaloneStoppedRunModelConfigUpdater -> RunModelSelectionService.validate (fresh selection) -> commitAgentRunRuntimeSwitch -> AgentRunMetadataStore`

DS-002: `first input -> StandaloneAgentRunLifecycleService.resolve (transition lane) -> activateOnce -> activateSwitched -> AgentRunManager.beginActivation(new).prepare -> validateCandidate -> RuntimeSwitchRecorder (marker, rotate) -> persistAndPublish (new binding, pending cleared) -> RuntimeHandoverNoticeService.register -> run returned -> AgentRun dispatch -> AgentRunPlatformNotices.takePreface -> RuntimeHandoverNoticeService (WorkJournalService.ensureCurrent / listJournalFiles -> notice builder) -> provider (notice + user text) -> prefaceDelivered -> live SYSTEM_TASK_NOTIFICATION`

DS-003: `WorkJournalService.ensureCurrent -> RawTraceFileSourceService.listFiles (segment labels) -> runtime of each file (label mapping / current runtime) -> WorkJournalFileRenderer.render(file runtime) -> manifest entry with runtime_kind`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The settings form lets an eligible stopped run choose any available runtime; the save sends runtime, model and settings. Inside the run's transition lane the updater checks eligibility, validates the pair as a fresh selection of that runtime and commits through a run-history commit function: new binding, `platformAgentRunId` null, `pendingRuntimeSwitch` holding the whole previous binding. Choosing the original runtime again writes the original binding back and clears the pending switch. No memory file is touched. | Settings draft, updater, commit function, metadata | Stopped-run model-config updater | Eligibility predicate; fresh-selection validation |
| DS-002 | The first message finds `pendingRuntimeSwitch` (the explicit field decides, not a missing session ID) and takes the third activation case: start a fresh session of the new runtime (existing `new` request), validate it, then — before anything is published — append the marker and rotate the old records away (idempotent by key), commit the metadata (session set, pending cleared) and publish. The notice service remembers that a hand-over is pending for this run. When the message is dispatched the preface port hands the notice over; the server builds it from facts (journal made current first) and the provider receives it before the user's text. The live notice shows the marker; on reload the recorded marker does. | Metadata, candidate session, marker record, notice | Lifecycle service | Switch recorder (memory); notice source; journal service; web notice label |
| DS-003 | For each raw file the journal looks up the runtime that wrote it (an archived segment: its recorded label mapped to a runtime kind; the open file: the run's current runtime) and renders with that runtime's rules; the manifest records the runtime per file and reuses a closed file only when it matches. | Raw file source, renderer, manifest | `WorkJournalService` | Label mapping |

## Spine Actors / Main-Line Nodes

Settings draft and store (web); `StandaloneStoppedRunModelConfigUpdater`; `commitAgentRunRuntimeSwitch`; `AgentRunMetadataStore`; `StandaloneAgentRunLifecycleService`; the activation candidate (`AgentRunManager.beginActivation`); `RuntimeSwitchRecorder`; `RuntimeHandoverNoticeService`; `AgentRun`/preface port; `WorkJournalService`.

## Ownership Map

- Updater: decides model-only edit vs switch vs undo for a stopped run; owns eligibility and validation call. Commit function: owns the metadata shape written (as `commitAgentRunModelConfig` does for the model).
- Lifecycle service: owns the order of the activation (candidate → marker → metadata → publish → register notice) and failure behavior; the only writer of `run_metadata.json` at activation.
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
| `runtime-locked` on the root card of `ExistingRunSettings.vue` (line 47) when `kind === 'agent'`; model-only mutation input | The runtime is now part of the selection | Draft carries `runtimeKind`; mutation input has `runtimeKind` | Members and delegated copies keep the lock |

Dead code in the touched files (Principle 7): none known. To confirm at implementation: after the change, `lockedModels`/`runtimeLocked` of `ChatModelMenu.vue` are still used by team members and delegated rows (so not dead), and the store's model-only edit path has no remaining caller (remove it if so).

## Return Or Event Spine(s) (If Applicable)

Live marker: `prefaceDelivered -> run publishes SYSTEM_TASK_NOTIFICATION (sender system.runtime_handover, the short marker line) -> web SystemTaskNotificationSegment (label)`. The recorded marker (written at activation) is what the history projection shows after a reload. The live notice is not recorded (the sender id is deliberately not in `RECORDED_SYSTEM_NOTICE_SENDER_IDS`), so there is one record per switch.

## Bounded Local / Internal Spines (If Applicable)

Activation order inside `activateSwitched` (parent owner: lifecycle service): `prepare -> validate -> record marker/rotate -> persistAndPublish -> register notice`. Why it matters: a failure at any step must leave a state that sending again completes (contract §3.3 failure behavior; process crashes are not a supported scenario, Principle 6): before the marker nothing changed but a discarded candidate (`abortForRetry`); after the marker and before the commit the retry finds the marker/key and skips; `persistAndPublish`'s exactness check decides committed or not. Premise checked (2026-10-30, `standalone-agent-run-lifecycle-service.ts:365-375`): `isExactTarget` compares `JSON.stringify` of the stored and the target metadata, which handles the removed pending field, but the retry branch `isExactOriginalPrepared` is true only for a prepared, never-started run, so for a switch an uncommitted metadata write would be treated as indeterminate and the run quarantined. The design therefore turns that private check into one the caller supplies: a prepared start passes today's rule, the switch passes "stored metadata still equals the pending original". Both stay in the lifecycle service.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Eligibility of a run for a switch | DS-001, DS-002 | Updater | Pure predicate: standalone, started, not application-/system-owned, not a delegated copy | One rule, decided by the server only (the web uses just the coarse run kind) | Duplicated rules in web and server |
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
| `WorkJournalService` | store, renderer, per-file runtime lookup | Notice service, memory search, tools | Reading `work_journal/` files directly in the notice builder | Add a method (`listJournalFiles` already returns size, lines and days, which is all the notice needs) |
| `RuntimeSwitchRecorder` | writer, rotation primitive, marker lookup | Lifecycle service | Lifecycle appending raw traces or calling the rotation primitive | Extend the recorder |
| `RuntimeHandoverNoticeService` | pending state, builder | Lifecycle (`register`), preface composite | Lifecycle building text | Extend the service |

## Dependency Rules

Dependency direction follows ownership (Principle 9). `agent-execution` owns the activation and must not import `agent-memory` or `runtime-handover-notices` (those already depend on `agent-execution` types such as events and the preface port). So the lifecycle service depends on two small ports defined in `agent-execution/domain/runtime-switch-ports.ts` and implemented by the other subsystems; the composition (`build-studio-server.ts`) wires them:

- `RuntimeSwitchMemory.record(switch)` — implemented by `RuntimeSwitchRecorder` (agent-memory): marker + rotation.
- `RuntimeHandoverNotices.register(runId)` — implemented by `RuntimeHandoverNoticeService`.

The notice service depends on `WorkJournalService` and the preface contract, not on the lifecycle; the journal depends on the raw file source and the label mapping, not on the recorder; the recorder and the notice service never depend on each other; the web depends on the GraphQL contract only. Forbidden: the lifecycle appending raw traces or building notice text; the notice builder reading `work_journal/` files directly; any module other than `WorkJournalService` writing journal files.

The value both sides need — the switch itself (`RuntimeSwitch`: key, previous and new agent runtime and model for the user's marker, marker sentence) — is built once, by one pure function in `agent-execution/domain/runtime-switch.ts`, and handed to both ports as data. So the marker sentence, the boundary key and the previous/new names are each computed in one place (Principle 11).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `updateStoppedAgentRunModelConfig(input: { agentRunId, runtimeKind, llmModelIdentifier, llmConfig })` | A stopped standalone run's provider selection | Model-only edit, switch, or undo | `agentRunId` (run ID) | `runtimeKind` required (clean cut); all callers updated |
| `commitAgentRunRuntimeSwitch({ metadata, selection, requestedAt })` | The metadata written by a switch/undo | Build the new metadata | Run metadata | In `run-history/services/`, beside `agent-run-model-config-commit.ts` |
| `RuntimeSwitchMemory.record(runtimeSwitch)` (port; implemented by `RuntimeSwitchRecorder`) | The raw traces at a switch | Marker + rotation, idempotent by `runtimeSwitch.key` | `memoryDir` + run ID + key | `runtimeSwitch` = key, from/to agent runtime kind and model, marker sentence (built once) |
| `RuntimeHandoverNotices.register(runId)` (port) and `RuntimeHandoverNoticeService.takePreface` / `prefaceDelivered` / `prefaceReturned` | The pending hand-over per run | Notice delivery once per switch | Run ID | The service implements the port and `AgentRunInputPreface` |
| `WorkJournalService.listJournalFiles(memoryDir)` | Journal file summaries | Unchanged (size, lines, days already there); the notice shows no runtime | `memoryDir` | Existing method, no change |
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
| Stored runtime spelling | raw trace runtime label | Yes | No: documented discrepancy 1 (stored `CODEX` vs `codex_app_server`) | Medium | FU-006 |
| The stopped-run edit | `…ModelConfig` family | No: it now carries the agent runtime | No: documented discrepancy 2 | Medium | FU-007 (rename with the team family) |
| Runtime names in text | Claude Agent SDK, Codex App Server (`agentRuntimeName`) | Yes | Yes (GLOSSARY: no short forms) | Low | The marker and the UI use the glossary names; the notice names no agent runtime |

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

## Draft File Responsibility Mapping

The draft equals the final mapping in "Target Subsystem / Folder / File Mapping" below: the structures that repeat are few and are extracted in the next two tables before that mapping is final.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| The provider binding (runtime kind, model, model settings, session ID) appears in the metadata and in the pending switch's `from` | `RunProviderBinding = Pick<AgentRunMetadata, "runtimeKind" \| "llmModelIdentifier" \| "llmConfig" \| "platformAgentRunId">` in `run-history/store/agent-run-metadata-types.ts` | run-history | One definition for both uses; no copy of the fields | Yes | Yes | A second metadata-like type with its own fields |
| Stored runtime label ⇄ `RuntimeKind` | `agent-memory/domain/raw-trace-runtime-label.ts` | agent-memory | Needed by the recorder and the journal | Yes | Yes (one table for both directions) | A place for display names (those come from `agentRuntimeName`) |
| The switch's key, from/to names and marker sentence | `agent-execution/domain/runtime-switch.ts` | agent-execution | Needed by the memory port and the notice port; computed once | Yes | Yes | A holder of lifecycle logic |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `pendingRuntimeSwitch {requestedAt, from: RunProviderBinding}` | Yes: `requestedAt` = time of the first pending save; `from` = the previous binding. The new binding lives in the ordinary metadata fields, not repeated here | Yes (no stop reason, no copy of the new binding, no history list) | Low: the switch history is the raw-trace manifest and the markers | None |
| Journal manifest file entry `runtime_kind` | Yes: the agent runtime the file was rendered with (`null` = rendered with the no-runtime rules) | Yes (the run-level field is removed) | Low | None |
| Raw manifest entry (`boundary_type: runtime_switch`) | Yes | Yes | Low | None |
| `RuntimeSwitch` (in memory) | Yes: key, from, to, marker sentence | Yes | Low | None |

## Final File Responsibility Mapping

See "Target Subsystem / Folder / File Mapping".

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
| `agent-memory/services/runtime-switch-recorder.ts` | File (new) | Recorder; implements the `RuntimeSwitchMemory` port | Marker + rotation, idempotent by key | Memory owns its files; mirrors `provider-compaction-boundary-recorder.ts` | Activation logic |
| `agent-execution/domain/runtime-switch.ts`, `agent-execution/domain/runtime-switch-ports.ts` | Files (new) | Switch value and the two ports | `RuntimeSwitch` built once (key, names, marker sentence with `agentRuntimeName`); `RuntimeSwitchMemory` and `RuntimeHandoverNotices` ports | The lifecycle depends on ports, not on other subsystems (Dependency Rules) | Lifecycle logic |
| `agent-execution/domain/system-task-notification-senders.ts` | File (change) | Senders | Add `RUNTIME_HANDOVER_NOTICE_SENDER_ID = "system.runtime_handover"` | Existing place | — |
| `agent-execution/services/standalone-agent-run-eligibility.ts` | File (change) | Eligibility | Add `canSwitchRuntime(metadata)` | Beside the existing predicate | I/O |
| `agent-execution/services/standalone-stopped-run-model-config-updater.ts` | File (change) | Updater | Model-only / switch / undo decision, fresh-selection validation | The seam (F-25) | Metadata shape |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | File (change; 376 lines now, about 60 added: stays under 500, so no extraction — the new branch needs the file's private helpers) | Lifecycle | `activateSwitched` branch in `activateOnce`; `persistAndPublish` takes the "stored metadata still equals the original" check from its caller (prepared start: today's rule; switch: pending original); calls recorder and notice service | Owner of order | Notice text, file writes |
| `run-history/services/agent-run-runtime-switch-commit.ts` | File (new) | Run-history | `commitAgentRunRuntimeSwitch` (switch and undo) | Beside `agent-run-model-config-commit.ts` | Eligibility |
| `run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, new `agent-run-pending-runtime-switch.ts` | Files (change/new) | Metadata store | Type, parse and normalizer entry of the optional field | Precedent `delegatedFrom` | Switch logic |
| `llm-management/services/run-model-selection-service.ts` | File (change) | Selection | Fresh-selection mode of `validate` | Existing validator | — |
| `api/graphql/types/agent-run.ts` | File (change) | GraphQL | `runtimeKind` in the input; rejection messages | Existing mutation | Decisions |
| `run-history/services/studio-run-model-config-service.ts`, `agent-execution/services/agent-run-service.ts` | Files (change) | Existing service chain | Carry `runtimeKind` in `StoppedRunModelConfigInput` through to the updater | Thin pass-through (Thin Entry Facades) | The decision |
| `runtime-handover-notices/runtime-handover-notices.ts` | File (new) | Composition entry | Creates the service and exposes it as both the preface source and the `RuntimeHandoverNotices` port | The two sibling subsystems expose their service the same way (`tool-list-updates/tool-list-updates.ts`: builds the store and the service, returns `{service, close}`); here it only constructs the service, so it stays as small as the sibling's entry or is dropped at implementation if it holds nothing | Logic |
| `runtime-handover-notices/services/runtime-handover-notice-service.ts` | File (new) | Notice | Pending state; implements `AgentRunInputPreface` | The port | Journal rendering |
| `runtime-handover-notices/services/runtime-handover-notice-builder.ts` | File (new) | Notice text | Pure text from facts (contract §3.6) | Pure and testable | I/O |
| `compositions/build-studio-server.ts` | File (change) | Composition | Add the third source and pass the service to the lifecycle | Where the two others are wired | Logic |
| `agent-work-journal/domain/work-journal-models.ts`, `store/work-journal-store.ts`, `services/work-journal-service.ts` | Files (change) | Journal | Per-file `runtime_kind`; remove run-level; lookup rule | DS-003 | Label spelling |
| `autobyteus-web/components/run-settings/ExistingRunSettings.vue`, `RunSettingsCard.vue` | Files (change) | Settings | Unlock the root card's runtime (`runtime-locked`, line 47) only when `kind === 'agent'`; team/Org roots, members (line 60) and delegated rows (line 75) keep it; draft carries `runtimeKind`; hint line | Existing. The web uses only the coarse kind; the server alone decides eligibility (application-/system-owned runs, a not-yet-started run) and rejects with a message the existing `saveError` shows — one rule, not two | Server eligibility rules |
| `GLOSSARY.md` | File (change) | Docs | Add the five words of Terminology to Agent Runtimes | Principle 15 | — |
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

## Design Principles Check

The design was audited against DESIGN.md rules 1–9 and Core Principles 1–15 of the design principles, and the structural-trigger table (2026-10-30). The right-hand column says what the audit found and what changed in this document because of it.

| Principle | Verdict | Evidence / change made |
| --- | --- | --- |
| DESIGN 1, 4, 5 (smallest solution; no avoidable work) | Pass, after cuts | Removed: the optional run summary file, the excerpt fallback, journal sizes in the settings, a new raw-trace record type, a second notice path. Reused: the rotation primitive, `beginActivation(new)`, `persistAndPublish`, the notice route, the notice record, the chat projection. New code is one lifecycle branch, one recorder, one notice service, one port pair, the per-file journal runtime, the settings choice. |
| DESIGN 7 (bad data stays in its run) | Pass | A pending-switch run whose data cannot be read affects only that run; the journal drops invalid manifest entries and renders them again (`work-journal-store.ts` `readManifest`). |
| DESIGN 8 (no version numbers in current names) | Pass | The contract file name has no version; "v2" is only the document's revision. No `V2` identifier. |
| DESIGN 9 (no cross-version compatibility) | Pass | The mutation input changes as a clean cut; no old/new shape side by side. |
| P1 Behavior and production reality | Pass, after fix | Kinds and entry forms traced: the five agent runtimes all start a fresh session on an existing run ID through one request (`{kind:"new", runId, config}`, notes F-18); external runtimes record through the memory recorder, the native one through its memory manager (notes F-29) and the marker is written before either records anything. Standalone run kinds (ordinary, application-owned, system-owned, delegated copy) are separated by the eligibility rule. Added citations: lifecycle (`activateOnce`, `persistAndPublish`, `isExactTarget` at `standalone-agent-run-lifecycle-service.ts:365-375`), notice route (`agent-run-input-preface-dispatch.ts`), web locks (`ExistingRunSettings.vue:47,60,75`). One premise was wrong and is fixed: the retry check of `persistAndPublish` is prepared-run-only. |
| P2 Spines | Pass, after fix | Three spines with real spans (surface → owner → effect), a return/event spine for the live marker, a bounded local spine for the activation order. Fixed: DS-001's owner was written "updater with the store" (an "A + B" owner); now the updater owns it and the web is the initiating surface. |
| P3 Ownership and authoritative boundaries | Pass | Each node owns one thing (Ownership Map). The notice service reads journals only through `WorkJournalService`; nothing else writes journal files; the lifecycle does not touch memory files. No caller uses a boundary and its internals together. |
| P4 Off-spine concerns | Pass | Eligibility, validation, marker writing, notice text and label mapping are off-spine and named by concern. Existing areas reused first (reuse check table). |
| P5 Persisted data | Pass | Per-store decisions with evidence (measured 823 of 825 journals consistent; no existing entry has the new type). No migration; derived journal data rebuilt, not migrated. The stored-name discrepancy is stated, not hidden. |
| P6 Supported scenarios | Pass, after fix | Supported: switch, undo, repeated switch before sending, activation that fails and is sent again. Unsupported and not designed for: process crash (the earlier "crash injection" wording is replaced by failure injection), a runtime unable to read files (withdrawn by the user's reasoning), teams, agent-started switches (follow-ups). |
| P7 No dead code | Pass | Removal plan names what becomes unnecessary and the check to run in the touched files. |
| P8 Clean cut | Pass | Rejection log: no run-level journal runtime beside the per-file one; no second mutation input. |
| P9 Dependency direction | Pass, after fix | The lifecycle (agent-execution) would have imported agent-memory and the notice subsystem, against their dependency on agent-execution. Fixed with two ports owned by agent-execution, wired in the composition. |
| P10 Interfaces follow ownership | Pass with one recorded discrepancy | One boundary per subject; explicit run ID. The mutation keeps its `ModelConfig` name although it now carries the agent runtime (discrepancy 2, FU-007). |
| P11 Tight structures; one owner per fact | Pass, after fix | Fixed three: the previous binding is `Pick<AgentRunMetadata, …>`, not a copy of fields; the marker sentence/key/names are built once (`runtime-switch.ts`) instead of in the recorder and in the notice service; eligibility is decided only by the server (the web uses the coarse run kind). Derived consumers of every changed structure are listed in Change Scope. |
| P12 File responsibility | Pass, after fix | One concern per file. The earlier hedge ("extract if over 460 lines") is replaced by a decision: about 60 lines added to a 376-line file, no extraction. The notice subsystem's entry file is flagged to be dropped if it holds nothing. |
| P13 One owner per sequence; no behavior by absence | Pass, after fix | The lifecycle calls each mechanism itself, in order; no function is passed to reach another collaborator. The switch branch was chosen by "pending present and session ID null" (a branch by absence); now the explicit pending field alone decides. |
| P14 Spine-first document with examples | Pass | Spines before files; good/bad shape table; sequence from current state. |
| P15 Vocabulary | Pass, after fix | Found: the marker and notice used "Claude"/"Codex" and "runtime" where GLOSSARY.md requires the agent runtime names (Claude Agent SDK, Codex App Server) and "agent runtime", with no short forms. Fixed in the contract, requirements and this design. The new words are added to GLOSSARY.md in the same change. Two stored/API-name discrepancies are documented with a recommendation. |
| Structural triggers | None fire unresolved | Repeated coordination: no. Responsibility overload: no (lifecycle file stays under 500 lines). Ambiguous boundary: no. Empty indirection: the notice subsystem entry file is conditional (above). Shared folder: no. Several kinds or forms: traced above. Split sequence: no. Derived data: handled (Change Scope). Behavior by absence: fixed above. Vocabulary drift: fixed/recorded above. |

## Change / Refactor Sequence

1. Library: add the boundary type value; build `autobyteus-ts`.
2. Memory: label mapping; file source exposes the label; writer keeps the notice correlation id; switch recorder (+ tests: rotation, marker, retry, failure injection).
3. Journal: per-file runtime (models, store, service, `listJournalFiles`); remove the run-level field; tests (mixed-runtime fixture, unchanged output for a single-runtime run).
4. Metadata: optional field, parse, normalizer; commit function.
5. Settings save: eligibility, updater (switch/undo), fresh-selection validation, GraphQL input; tests.
6. Activation: `activateSwitched` in the lifecycle; sender id; notice service and builder; composition; tests with scripted runtimes including a failure at each step.
7. Web: unlock, draft, store/client/generated types, hint, notice label; unit tests and a browser probe.
8. Real run on an isolated instance of the worktree build; update docs (`docs/modules` for memory, journal, run history; the GraphQL docs) in the same change.
9. Removal: delete the run-level journal runtime and the locked attribute for eligible runs (done in steps 3 and 7).

## Key Tradeoffs

- Switch at the first input (not at the save): the form stays a simple, undoable edit; the cost is one more activation case. A save-time switch would archive and mark a switch the user may take back.
- Marker as a notice record: the live and recorded views can differ in order by a few milliseconds (live: after the user's message; reload: before it). Accepted; the user sees the marker before the agent's answer in both.
- The notice is held in memory: a server crash (not a supported scenario) between activation and the first input would lose it (the journals and the marker remain; the user can restate the task). Persisting it would add a second stored fact for an edge outside the supported scenarios.
- Journal rebuild instead of migration: one-time local render per run, no model cost.

## Risks

- What the new agent does with the journals is the work of its model; the design only tells it where they are and how they are laid out. The real run checks that the notice arrives and the named journals can be opened; there is no quality promise and no fallback.
- Native writer after rotation (escalation trigger above).
- An activation that fails after the marker, followed by the user undoing the switch instead of sending again, leaves a marker for a switch that did not happen (the chat and journal show it; nothing breaks).
- The restart-and-resume notice (283–289) may later share the next input (FU-005).
- Pending-switch runs with `platformAgentRunId: null` flow through listings, views and resume-config: tested (Change Scope).

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `probes/runtime-switch-folder.probe.test.ts` (copy into `autobyteus-server-ts/tests/`, run `./node_modules/.bin/vitest run <file>` from `autobyteus-server-ts`; it turns into the permanent test of the recorder and the journal's per-file runtime).
- Tests (TESTING.md layers): library type; server unit — label mapping, recorder (rotation, marker, idempotence), journal per-file runtime and reuse, commit function (switch, undo, repeated switch keeps the first `from`), updater (eligible/ineligible, fresh-selection validation), notice builder (text; says where to start; lists the journal files; says "another agent"; names no agent runtime; does not repeat the user's message), notice service (once per switch, `prefaceReturned` keeps it pending); server integration — lifecycle `activateSwitched` with scripted runtimes: success order, failure of the new session (nothing changed), failure after the marker (sending again completes with one marker and one archived segment), existing restore and prepared cases unchanged, pending-switch run opens/lists; GraphQL contract; web — store/menu/settings unit tests, browser probe of the settings journey.
- Real run (TESTING.md rule 1–2: worktree build, isolated instance, never the user's data): `pnpm --silent isolated-app start --build` with imported credentials; a throwaway workspace; a Claude run does a small multi-step task, is stopped by hand (a usage limit cannot be produced on demand; the switch path is identical because no stop reason is recorded), its settings switched to Codex, one message sent; check: same run ID and chat, marker, notice received, the new agent receives the notice before the message and can open the journal files it names, `raw_traces_000001.jsonl` holds the Claude records, journals translated per file. What the agent does next is its model's work and is not graded. Record the evidence in the validation report. Clean up the instance.
- Done means (Task): the user has approved this design; then in this slice a run stopped on one runtime continues on another with the work carried over, shown by the tests and the real run on isolated data; merged to `personal`. No release unless asked. Prove from a clean clone.
