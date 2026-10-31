# Design Spec — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (notes 1–15)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` SR-004, `Approved` by the Solution Designer within the direction (user informed); DEC-4 (single agent first) is the user's own decision of 2026-10-30, relayed by the Project Task Manager. **The Task requires the user's approval of the design before any build: his go for architecture review (2026-10-30: "use your design principle to review your design once again if it's nice then send to architecture review") is recorded in SR-004 note 7; the final approval to build stays his and is asked again after the review.**
- Behavior-defining supplements and their approval references: `run-runtime-switch-contract.md` v2 (layout and data model; approved together with this design, not before).
- Design status: `Needs Review` (round 4: ARCH-F-007 fixed — a failed attempt leaves nothing behind; plus two simplifications from the Solution Designer's own data-model review, SR-004 note 15: the contract holds data only, and the hand-over is derived from the raw traces). The user's go for the build (2026-10-31) stands: nothing the user decided changes.
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/investigation-notes.md` (F-01…F-44)
- Authorities read (design reading gate; 2026-10-30): `.claude/skills/solution-designer/references/architecture-design.md`, `design-principles.md`; project `DESIGN.md` (repository root) and `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2; `GLOSSARY.md` (Agent Runtimes: agent runtime names, no short forms); `TESTING.md` (layers, rules 1–9); `design-examples.md` not used. Principles 1–15, the structural-trigger table and the health assessment were re-read in full on 2026-10-30 and applied in the section "Design Principles Check" below.
- Project design-principle conflicts with the general principles, or discrepancies (for the user, with my reasoning and recommendation). **Two decisions (ARCH-F-004, ARCH-F-005): both decided (below).**
  1. **Stored runtime spelling and `DESIGN.md` rule 10 (ARCH-F-004) — decided by the user, 2026-10-30:** fix the naming consistently in a separate prerequisite ticket first (PRE-1 in `requirements-doc.md`): the raw-trace manifest's `runtime_kind` (and what the backends write) become the `RuntimeKind` values through a sealed migration, so current code has no label mapping. PRE-1 is delivered (autobyteus-343, merged 2026-10-30) and this design relies on it: the journal reads a segment's runtime with the existing `runtimeKindFromString`, and the switch recorder writes `from.runtimeKind` as is. The old labels inside old raw-trace records (7,532 snapshots of provider events, never read) are not rewritten (Principle 5: no rewrite of large data for cleanliness). Rule 10 passes once PRE-1 is done; until then this ticket waits.
  2. **`…ModelConfig` names of the stopped-run edit (ARCH-F-005) — decided by the user, 2026-10-31: option A, rename the single-agent chain now.** This change creates the drift (with `runtimeKind` in the input the old name says less than the operation does), so the chain is renamed as a clean cut to say it edits the run's selection (agent runtime, model and settings): GraphQL `updateStoppedAgentRunModelConfig` → `updateStoppedAgentRunSelection` with `UpdateStoppedAgentRunSelectionInput` / `UpdateStoppedAgentRunSelectionResult`; `StudioRunModelConfigService.updateStoppedAgentRunModelConfig` → `updateStoppedAgentRunSelection`; `AgentRunService.updateStoppedModelConfig` and `StandaloneAgentRunLifecycleService.updateStoppedModelConfig` → `updateStoppedSelection`; `StandaloneStoppedRunModelConfigUpdater` (file `standalone-stopped-run-model-config-updater.ts`) → `StandaloneStoppedRunSelectionUpdater` (`standalone-stopped-run-selection-updater.ts`); `StoppedRunModelConfigInput` → `StoppedRunSelectionInput`; web `updateStoppedAgentModelConfig` and its GraphQL document → `updateStoppedAgentSelection`. **Not renamed, because they stay accurate:** the team family (`updateStoppedTeamRunModelConfigs`, `updateStoppedModelConfigs`; teams edit model configuration only), the shared result/editability/field-error types (`RunModelConfigUpdateResult`, `RunModelConfigEditability`, `RunModelConfigFieldError`: the outcome of editing model configuration for every kind), `StudioRunModelConfigService` (the class hosts the agent and team methods), and `commitAgentRunModelConfig` (the commit of a same-runtime model edit). When the switch extends to teams (FU-003) the team names are renamed then.

## Current-State Read

A stopped standalone Agent run keeps one provider binding (`runtimeKind`, model, settings, `platformAgentRunId`) in `run_metadata.json`. The settings editor changes the model only; the runtime is locked because a run restores only from its own runtime's session (F-06, F-25). The first message to a stopped run goes through `StandaloneAgentRunLifecycleService.activateOnce` inside the run's transition lane: a prepared run starts a fresh session (`activatePrepared`), a started run restores its session (`restoreStarted`) (F-26). Platform notices (tool-list change, skill change) ride along with the next input through `AgentRunInputPreface` (F-27). The chat history is built from raw traces and does not depend on the runtime (F-15). The Work Journal renders every file of a run with the run's one current runtime (F-24), which is wrong for work done by a different runtime earlier. Raw traces already rotate through one idempotent primitive that a switch can reuse (F-20, F-23). Nothing here is structurally broken; the change adds one lifecycle case, one notice source, one marker writer and a per-file journal runtime.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Large**
- Size rationale and supporting evidence: crosses three packages and eight subsystems — `autobyteus-ts` (one type value); the server's run lifecycle, run-history, agent memory (marker), Work Journal (per-file runtime), notice route and composition, model selection and the GraphQL contract; the web settings, model menu, store and chat notice label — about 30 files (Target Subsystem / Folder / File Mapping) plus tests.
- Architectural risk: **High**
- Risk rationale and supporting evidence: new persisted fields and a new manifest boundary type (contract/persistence); an activation case with an ordered sequence that must be retry-safe (provider session, memory rotation, metadata commit) in the run's transition lane (concurrency/ownership); changes a derived-data ownership rule (journal runtime per file); GraphQL contract change (clean cut); touches the first-message path of every restored run only through one added branch (blast radius bounded by a test that the existing restore cases are unchanged).
- Escalation trigger if implementation or validation discovers new impact: a native or external memory writer is found that holds the active raw-trace file open across the rotation (the library store appends by path: `run-memory-file-store.ts:404`, so none is known); a registered root with an offline host is found to be reachable on the switch path (MP-1 below: none known for a user-stopped run).

## Architecture Investigation Evidence

Detailed evidence is in the investigation notes; this maps it to decisions.

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Folder test on synthetic data | notes F-23; `probes/runtime-switch-folder.probe.test.ts`; `evidence/folder-test-output.txt` | Marker + rotation + append + idempotent retry work with the real store; only a type value is missing | Marker is the first record of the new active file; rotation by the existing primitive; boundary type `runtime_switch` | None for the folder; native writer handle (escalation trigger) |
| Journal service read + probe + count | notes F-24; `agent-work-journal/services/work-journal-service.ts:166,222`; `agent-memory/services/raw-trace-file-source-service.ts:111-125` | One runtime per run today; segment runtimes exist in the raw manifest but are not exposed; 823 of 825 real journals consistent with their segments' runtime | Per-file runtime, read from the raw manifest's `runtime_kind` (a `RuntimeKind` value after PRE-1); no renderer revision bump | The 2 journals with a null run runtime will render differently (correctly) |
| Settings save path | notes F-25; `api/graphql/types/agent-run.ts:301`; `standalone-stopped-run-selection-updater.ts`; `run-model-selection-service.ts:45-73` | Clean seam in the transition lane; validation needs a fresh-selection mode | Extend the existing mutation with `runtimeKind`; commit a pending switch | None |
| Lifecycle read | notes F-26; `standalone-agent-run-lifecycle-service.ts` (`activateOnce`, `activatePrepared`, `persistAndPublish`) | Fresh session on an existing run ID is an existing case | Third case `activateSwitched` | `isExactTarget` and the removed optional field (trigger above) |
| Notice route | notes F-27, F-28; `compositions/build-studio-server.ts:345`; `agent-run-input-preface.ts` | A third source fits; marker is a notice | New `runtime-handover-notices` source; marker = notice record | None |
| Native facts | notes F-29 | Create appends, snapshot is rewritten, turn ids restart as on any construction | No special native handling | Real run with native not in this slice's plan |
| Activation commit writer (ARCH-F-001) | `run-history/services/agent-run-history-catalog-service.ts:202-232` (`recordRunStarted`); `standalone-agent-run-lifecycle-service.ts:365-375` | `recordRunStarted` takes `{runId, platformAgentRunId?, runtimeKind?, startedAt?}`, reads the stored metadata and writes `{...metadata, runtimeKind, platformAgentRunId, startedAt}`: every other field of the target is ignored, so a pending field would stay in the file and `isExactTarget` (JSON equality) would fail on the success path | One explicit input on `recordRunStarted` clears the pending field; `persistAndPublish`'s retry flag generalized | None |
| First-message path and callers (ARCH-F-002) | `agent-run-service.ts:307-310` (`activate`); `standalone-agent-run-root/domain/standalone-host-agent-handle.ts:50-61`; `standalone-agent-run-root-manager.ts:73-80,202-216,380-400`; `standalone-agent-run-root.ts:147`; `delegated-launch-selection-service.ts:142-160`; `general-process-run-supervisor.ts:311`; `application-execution-scope-kernel-builder.ts:257`; `standalone-root-collaborators.ts:30`; `standalone-root-member-view-projection-service.ts:140`; `token-usage/providers/*` | An eligible run is activated through its root; the root builds its member context per activation from the current metadata; the lifecycle is built at two sites; the combined Save of the host with its delegated copies is a second caller of the stopped-run edit; the root's inherited launch base is read once when the root is created | DS-002 extended with the root hop; derived-consumer decisions in Change Scope; MP-1 statement | MP-1 (no code found that leaves an ordinary run's root registered with an offline host after a user Stop) |
| Journal target runtime (ARCH-F-003) | `memory-search/pipeline/journals-step.ts:63`; `memory-search/runs/memory-run-discovery.ts:146` | The journal target's runtime comes from `metadata.runtimeKind`; while a switch is pending that is the new runtime but the open file holds the previous one | `openRawTraceRuntimeKind(metadata)` is the one owner of the open file's runtime | None |
| Web | notes F-30; `ExistingRunSettings.vue`, `ChatModelMenu.vue:38,253`, `SystemTaskNotificationSegment.vue` | The runtime-grouped menu exists; lock is one attribute | Unlock for eligible runs | Browser probe |

## Intended Change

A stopped standalone Agent run's settings let the user pick another runtime and model. Saving only records a pending switch. The next message makes the switch in the activation: the new session starts, the old records are archived behind a marker the chat and journal show, the new agent receives a hand-over notice pointing at the journals, and each journal file is read with the runtime that produced it.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002 (requirements) — the settings choice and save, the switch activation, marker and rotation, the hand-over notice, the per-file journal runtime, the chat marker label, validation as a fresh selection; REQ-001…003, 007, 010…013.
- Derived consumers, when a stored or shared structure changes:
  - Raw-trace manifest (new boundary type): readers of `boundary_type` — the raw-trace file source (lists segments; no branch on type), the compaction recorders (own types only). Decision: no reader branches on the type except the new journal-runtime lookup; verify by grep at implementation.
  - `run_metadata.json` (new optional field): readers — history catalog, resume-config service (tolerates null `platformAgentRunId`), run listings. Decision: no reader needs the field except the lifecycle service and the updater; a test opens, lists and views a pending-switch run.
  - Work Journal manifest (per-file runtime): readers — memory search's journals step (uses file versions and hashes, not the runtime), the journal reader tools. Decision: unchanged outputs for a run that never switched; the journal file text is rendered the same, so content hashes and the evidence hash stay equal and memory search re-indexes nothing.
  - Chat history projection (CRR-002 F-2, measured): the projection reads the active file only (`local-memory-run-view-projection-provider.ts:41-45` and `buildActiveTracePage`), so archiving the previous agent's records would empty the chat on reload. Decision: both methods read one new sequence — the run's `runtime_switch` segments, then the active file (contract 3.7); compaction segments stay unread (the earlier ticket's BEH-A4). The journal renderer already handles `system_task_notification`; no change.
  - The run's root (ARCH-F-002): `launchConfigurationOf(metadata)` (`standalone-agent-run-root-manager.ts:73,400`) builds the root's inherited launch base once, when the root is created, and delegated copies inherit it (`standalone-root-collaborators.ts:30`). Decision: no change. After an explicit Stop the root is gone (`stopRoot`/`endRoot` unregister it; fail-stop terminates it), and the first message creates a new root from the new metadata, so the base is the new runtime and model. The member view projection (`standalone-root-member-view-projection-service.ts:140`) reads the launches of the copies, not the host: no change.
  - The combined Save of the host with its delegated copies (`delegated-launch-selection-service.ts:142-160`, case `AGENT`) is the second caller of the stopped-run edit. Decision: the host's own selection in that Save carries its runtime as well (the web's configured patch is the same draft selection); the service passes it on, the root manager validates the host selection with the selection's own runtime (a fresh selection when it differs from the stored one), and the edit goes through the same updater, so the host can switch whether or not copies exist and nothing is dropped silently.
  - Token usage (`token-usage/providers/*`): records and aggregates are per identity facet with `observed_runtime_kinds`, so a run that used two runtimes shows both. Decision: no change; a test records usage on both runtimes of one run.
  - Journal target runtime (`memory-run-discovery.ts:146`): uses `openRawTraceRuntimeKind(metadata)` (ARCH-F-003).
- Material premise MP-1 (a registered root while a switch is saved or the first message is sent), from the code: the root of an ordinary run is unregistered by Stop, by delete or archive, by a terminate and by fail-stop (`stopRoot`, `endRoot`, `onTerminated`, `enterFailStop`); the only code that leaves a root registered with its host offline is the idle shutdown of a run a peer delegated to this node (`standalone-agent-run-root.ts:147`: only when `delegatedFrom` is set; such runs are not eligible for a switch). The settings of a run are editable only when the run is not active (`getActiveRun`), which after a usage-limit stop means after the user's Stop. So for a user-stopped run the root is gone at save time and the first message builds a new one from the new metadata. A host that goes offline without a Stop while its root stays registered (for example after a provider-specific interrupt, `awaitPreviousRuntimeRelease`) was not shown to exist for this path; if it does, the existing model-only edit has the same stale inherited base today, so it is not worsened. No machinery is added; recorded as FU-008 and as an escalation trigger.
- Deliberately left alone: team members, Org members, delegated copies (FU-003); agent- or Model-Router-started switch (FU-004); the restart notice of 283–289 (FU-005); the stored runtime spelling (PRE-1, a separate prerequisite ticket); the stop reason (FU-001, not needed); the journal wording (done by 331); the native `working_context_snapshot.json` (a switch to or from native never edits it).
- Prerequisite: PRE-1, the stored runtime names (a separate ticket, first). Follow-ups: FU-003, FU-004, FU-005, FU-008 (in `follow-ups.md`); FU-001 stays as recorded.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 013; AC-001 | User saves the settings of a stopped standalone Agent run with another runtime/model | Model-only edit; runtime locked (F-25, F-30) | Same run; pending switch recorded; ineligible runs rejected | DS-001 |
| BEH-002 | System | REQ-002, 003, 007, 010; AC-002, 004, 009 | First input to a run with a pending switch | Restore or prepared start only (F-26) | Switch activation: new session, marker + rotation, notice before the user's text, once | DS-002 |
| BEH-005 | User | REQ-011, REQ-014; AC-002, AC-010 | Chat shows the run, live and after a reload | History from the active raw-trace file only (F-15, F-28, measured F-39) | The earlier conversation, the marker where the runtime changed, then the new agent's records, live and on reload | DS-002 (marker record, live presentation), chat reader (contract 3.7) |
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
- Intentional deferrals and residual risk: none open beyond Risks; a process crash no longer loses the hand-over (it is derived from the raw traces, contract 3.6).

## Terminology

Per `GLOSSARY.md`: **agent runtime** (what runs an agent; never "LLM runtime"), the agent runtime names (Claude Agent SDK, Codex App Server, Antigravity CLI, Grok Build, AutoByteus: used in the marker, the notice and the UI, no short forms), Work Journal, Memory. Words this change introduces (added to `GLOSSARY.md`, section Agent Runtimes, in the same change — Principle 15):

- **Agent runtime switch:** replacing the agent runtime, model and model settings of a stopped standalone Agent run, keeping the run. It is made real at the run's next input.
- **Pending agent runtime switch:** the user's choice, saved in the run's metadata, before that input.
- **Hand-over notice:** the system notice the new agent receives with that input (where the journals are, how they are laid out).
- **Switch marker:** the notice record that starts the new raw-trace file; shown in the chat and the journal.
- **Previous agent:** the agent that worked on the run on the earlier agent runtime (wording toward the agent; in code, the earlier segment).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the journal manifest's run-level `runtime_kind` and its use in `reconcile`; the `runtime-locked` attribute for eligible runs in `ExistingRunSettings.vue`; the model-only input shape of `updateStoppedAgentRunSelection` (replaced by runtime + model + settings).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: (a) `run_metadata.json`, one per run (525 on this machine) — a new optional `pendingRuntimeSwitch`; (b) `raw_traces_manifest.json`, 3,794 segment entries in 825 runs (re-measured by autobyteus-343) — a new `boundary_type` value used only by new switches; (c) `work_journal/work_journal_manifest.json`, one per run (~4,000) — a per-file `runtime_kind`.
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
| DS-001 | Primary End-to-End | BEH-001 | User changes runtime/model in the settings of a stopped run and saves | `run_metadata.json` holds the new binding and the pending switch | `StandaloneStoppedRunSelectionUpdater` (server); the web settings and store are the initiating surface | The user's only action; must be undoable and safe |
| DS-002 | Primary End-to-End | BEH-002, 005 | The user's first message to the run | The new agent receives notice + message; chat shows the marker | `StandaloneAgentRunLifecycleService` (transition lane) | The ordered, retry-sensitive heart of the feature |
| DS-003 | Bounded Local | BEH-007 | `ensureCurrent` for a run with several raw files | Each journal file rendered with its own runtime | `WorkJournalService` | Without it, earlier work reads wrongly |

## Primary Execution Spine(s)

DS-001 (initiating surface: the web settings; governing owner: the updater): `ExistingRunSettings.vue -> existingRunConfigStore.saveAgent -> mutation client -> updateStoppedAgentRunSelection (GraphQL) -> StudioRunModelConfigService -> AgentRunService.updateStoppedSelection -> StandaloneAgentRunLifecycleService.updateStoppedSelection (transition lane) -> StandaloneStoppedRunSelectionUpdater -> RunModelSelectionService.validate (fresh selection) -> commitAgentRunRuntimeSwitch -> AgentRunMetadataStore`

DS-002: `first input -> AgentRunService.activate -> StandaloneAgentRunRootManager.resolveRootAndEnsureHost -> StandaloneAgentRunRoot.ensureHostReady -> StandaloneHostAgentHandle.ensureReady (builds the member context from the current metadata) -> StandaloneAgentRunLifecycleService.activateHost (transition lane) -> activateOnce -> activateSwitched -> RuntimeSwitchMemory.begin (ticket: the switch and the watermark) -> AgentRunManager.beginActivation(new).prepare (a candidate may append its own records) -> validateCandidate -> RuntimeSwitchMemory.record(ticket) (one library call: archive through the watermark, marker first) -> persistAndPublish (recordRunStarted with clearPendingRuntimeSwitch); on any failure before `record` succeeds: abort the candidate, then RuntimeSwitchMemory.discard(ticket) -> run returned to the root -> AgentRun dispatch -> AgentRunPlatformNotices.takePreface -> RuntimeHandoverNoticeService (derives "hand-over pending" from the raw traces; WorkJournalService.ensureCurrent / listJournalFiles -> notice builder) -> provider (notice + user text) -> prefaceDelivered -> live SYSTEM_TASK_NOTIFICATION`; a run that is not collaboration-eligible reaches `activateHost` directly (`agent-run-service.ts:307-310`) and cannot have a pending switch.

DS-003: `WorkJournalService.ensureCurrent -> RawTraceFileSourceService.listFiles (segment runtimes) -> runtime of each file (`runtimeKindFromString` of the segment's `runtime_kind` / `openRawTraceRuntimeKind`) -> WorkJournalFileRenderer.render(file runtime) -> manifest entry with runtime_kind`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The settings form lets an eligible stopped run choose any available runtime; the save sends runtime, model and settings. Inside the run's transition lane the updater checks eligibility, validates the pair as a fresh selection of that runtime and commits through a run-history commit function: new binding, `platformAgentRunId` null, `pendingRuntimeSwitch` holding the whole previous binding. Choosing the original runtime again writes the original binding back and clears the pending switch. No memory file is touched. | Settings draft, updater, commit function, metadata | Stopped-run selection updater | Eligibility predicate; fresh-selection validation |
| DS-002 | The first message reaches the lifecycle through the run's root and its host handle, which build the member context from the current metadata once per activation and are unchanged by this design; the lifecycle then finds `pendingRuntimeSwitch` (the explicit field decides, not a missing session ID) and takes the third activation case: take a ticket (the switch and the watermark: the last active raw-trace record), start a fresh session of the new runtime (existing `new` request), validate it, then — before anything is published — archive the records through the watermark behind the marker in one idempotent step, so the candidate's own first records follow the marker, commit the metadata (session set, pending cleared) and publish. A failure before that step aborts the candidate and discards what it wrote after the watermark, so a failed attempt leaves nothing. When the message is dispatched the preface port asks the notice service, which derives from the raw traces that a hand-over is pending (the marker is first and no user record follows), builds the notice from facts (journal made current first) and the provider receives it before the user's text. The live notice shows the marker; on reload the recorded marker does. | Metadata, ticket, candidate session, marker record, notice | Lifecycle service | Switch recorder (memory); notice source; journal service; web notice label |
| DS-003 | For each raw file the journal looks up the runtime that wrote it (an archived segment: its recorded `runtime_kind`; the open file: `openRawTraceRuntimeKind(metadata)`) and renders with that runtime's rules; the manifest records the runtime per file and reuses a closed file only when it matches. | Raw file source, renderer, manifest | `WorkJournalService` | `openRawTraceRuntimeKind` |

## Spine Actors / Main-Line Nodes

Settings draft and store (web); `StandaloneStoppedRunSelectionUpdater`; `commitAgentRunRuntimeSwitch`; `AgentRunMetadataStore`; `StandaloneAgentRunLifecycleService`; the activation candidate (`AgentRunManager.beginActivation`); `RuntimeSwitchRecorder`; `RuntimeHandoverNoticeService`; `AgentRun`/preface port; `WorkJournalService`.

## Ownership Map

- Updater: decides model-only edit vs switch vs undo for a stopped run; owns eligibility and validation call. Commit function: owns the metadata shape written (as `commitAgentRunModelConfig` does for the model).
- Lifecycle service: owns the order of the activation (ticket → candidate → archive step → metadata → publish; discard on failure) and failure behavior; the only writer of `run_metadata.json` at activation.
- `RuntimeSwitchRecorder` (agent-memory): owns writing the marker record and rotating the raw traces for a switch, idempotent by key. It does not know about activation.
- `RuntimeHandoverNoticeService`: owns the pending hand-over per run and the notice text; reads facts from the journal service; knows nothing about activation internals.
- `StandaloneAgentRunRootManager` / the run's root and host handle (`standalone-agent-run-root`, unchanged): own which root exists for an eligible run, hand the lifecycle its member context at each activation, and keep the root's inherited launch base (read from the metadata when the root is created). The switch relies on them unchanged (see MP-1).
- `WorkJournalService`: sole owner of journal files and their per-file runtime. `openRawTraceRuntimeKind(metadata)` (`run-history`) is the sole owner of the fact "which runtime wrote the open raw-trace file".

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `updateStoppedAgentRunSelection` GraphQL mutation, `StudioRunModelConfigService`, `AgentRunService.updateStoppedSelection` | `StandaloneStoppedRunSelectionUpdater` | Existing transport and service chain | The decision model-only/switch/undo; eligibility |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Run-level `runtime_kind` of `WorkJournalManifest` and its check in `reconcile`; its store parse/write | A run's files can have different runtimes | Per-file `runtime_kind` in `WorkJournalManifestFile` | Derived data; old manifests are read tolerantly (entries without the field are rendered again) |
| `runtime-locked` on the root card of `ExistingRunSettings.vue` (line 47) when `kind === 'agent'`; model-only mutation input | The runtime is now part of the selection | Draft carries `runtimeKind`; mutation input has `runtimeKind` | Members and delegated copies keep the lock |
| The `…ModelConfig` names of the single-agent stopped-run edit (list in discrepancy 2) | The edit now carries the agent runtime (Principle 15) | The `…Selection` names, one clean cut across server, GraphQL, generated types and web; no alias | Team family and shared result types keep their names |
| `unchangedPreparedIsRetryable` (parameter) and `isExactOriginalPrepared` (private method) of `persistAndPublish` | The retry rule covers a switch as well as a prepared start | `unchangedIsRetryable` and `isExactOriginal` (JSON equality of stored and `original`), same file | The prepared guard `original.preparedAt && !original.startedAt` becomes the caller's flag; no dead remainder |

Dead code in the touched files (Principle 7): none known. To confirm at implementation: after the change, `lockedModels`/`runtimeLocked` of `ChatModelMenu.vue` are still used by team members and delegated rows (so not dead), and the store's model-only edit path has no remaining caller (remove it if so).

## Return Or Event Spine(s) (If Applicable)

Live marker: `prefaceDelivered -> run publishes SYSTEM_TASK_NOTIFICATION (sender system.runtime_handover, the short marker line) -> web SystemTaskNotificationSegment (label)`. The recorded marker (written at activation) is what the history projection shows after a reload. The live notice is not recorded (the sender id is deliberately not in `RECORDED_SYSTEM_NOTICE_SENDER_IDS`), so there is one record per switch.

## Bounded Local / Internal Spines (If Applicable)

**Activation Sequence** (parent owner: lifecycle service, `activateSwitched`). Process crashes are not a supported scenario (Principle 6); an activation that fails and is sent again is.

1. `ticket = memory.begin(switch)`: the switch and the watermark (the last active raw-trace record id, or none). Writes nothing.
2. `beginActivation({kind:"new"}).prepare()`; `validateCandidateOrAbort`. **A candidate can write its own raw-trace records while it prepares** (premise corrected, CRR-002 F-1; the first design said preparing "publishes nothing" and assumed it also writes nothing). Per target: native — the bootstrap `SystemPromptProcessingStep` appends its `system_instruction` (`system-prompt-processing-step.ts:39` → `run-memory-file-store.ts:128-152`, measured); Grok (ACP factory) — `captureInstructions` at backend creation (`acp-agent-run-backend-factory.ts:176-185`, read, not yet exercised); Claude (when its process opens, `claude-session.ts:366`), Codex (when its thread starts, `codex-thread-manager.ts:201`) and Antigravity (no capture call) write after the marker, measured clean live. The design does not depend on the list.
3. `memory.record(ticket)`: the archive step (contract 3.3): archive through the watermark, marker first; idempotent.
4. `persistAndPublish` with `clearPendingRuntimeSwitch`: the new session ID, `startedAt` unchanged, the pending field removed in the same write (stored before/after: contract 3.1). Premise checked (ARCH-F-001): `recordRunStarted` overrode only `runtimeKind`, `platformAgentRunId` and `startedAt`, so it could not clear the field and `isExactTarget` would have quarantined every switch; it gets one explicit input and stays the one writer (it also resets the history row's `terminatedAt`). Retry rule: `unchangedPreparedIsRetryable` → `unchangedIsRetryable` (true for a prepared start and a switch), `isExactOriginalPrepared` → `isExactOriginal` (stored metadata equals `original` by the same JSON comparison as `isExactTarget`; for a switch `original` is the pending metadata).
5. Publish. Nothing else: the hand-over is derived later from the raw traces, not registered.

**Failure rules (ARCH-F-007, CRR-002 F-1).** A failed attempt leaves nothing behind:
- *Before step 3 succeeds* (a throw from prepare, from validation, or from `record`): abort the candidate (`abortForRetry`), then — after the abort has completed — `memory.discard(ticket)`, which removes the records written after the watermark (the failed candidate's own `S`) from the active file. The previous era's file is again exactly what it was; no marker was written; the next attempt takes a new ticket from the same tail. An abandoned attempt (undo, or a third runtime) therefore leaves no record of the abandoned runtime in the previous agent's file.
- *Guards and bounds (ARCH-F-008).* `discard` / `removeActiveRawTracesAfter` is a no-op when a record with THIS switch's key as correlation id is in the active file (an unkeyed "a hand-over marker is in the file" guard would make `discard` a no-op on every later switch, because the active file then starts with the earlier marker), and removes nothing when the watermark id is not in the file. The lifecycle calls `discard` only after the candidate's cleanup is confirmed released: when `prepare` throws it holds the activation operation and inspects it; when the cleanup is quarantined or pending it does not discard. A test covers a failed attempt on a run that already switched once. The reads of `hasPendingRuntimeHandover` and of `begin`'s last-record id are bounded and read-only (no whole-file `readJsonl`, no `readMemoryDicts`, which cuts a damaged end and therefore writes); `hasPendingRuntimeHandover` returns the marker record itself, not a boolean, because the live presentation shows its content.
- *Step 4 fails after step 3 succeeded*: the metadata is still pending (the stored metadata equals `original`), the candidate is aborted, no discard (the marker is in the file; `discard` is a no-op then). The retry takes a ticket whose watermark is ignored (archive rule 1), the marker is present, an identical instruction is not written twice, and the commit is tried again. Abandoning after this particular failure (a metadata write error, not a normal failure) is not a supported scenario: the marker names the first target.
- *Unclear (no mechanism required, consequence stated):* if the previous era's latest `system_instruction` equals the candidate's instruction, `recordSystemInstructionSupply` writes nothing for the new era (it dedupes against the active file's latest one) and the previous equal record is archived, so the new era's file lacks its own system instruction record. Whether this can happen for native or Grok targets is not shown. Consequence: none for the chat or the journal; the new agent still runs with its instruction.

Why one ticket and three calls (`begin`, `record`, `discard`) and not more state: the attempt is the window of the active file after the watermark; success archives through it and starts the new era behind the marker, failure removes it. The ticket is a plain value, so a retry rebuilds it from the current tail.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Eligibility of a run for a switch | DS-001, DS-002 | Updater | Pure predicate: standalone, started, not application-/system-owned, not a delegated copy | One rule, decided by the server only (the web uses just the coarse run kind) | Duplicated rules in web and server |
| Fresh-selection validation | DS-001 | Updater | Validate the model for a runtime with no current model (skip the native capacity rule) | A switch has no previous model on the new runtime | Wrong rejections |
| Switch recorder | DS-002 | Lifecycle | Marker + rotation, idempotent | Memory owns its files | Lifecycle writing memory files |
| Notice source | DS-002 | Preface port | Pending state, text from journal facts | The port's contract | Lifecycle knowing journal layout |
| Web notice label | DS-002 | Chat | Label for the sender id | Existing pattern | Raw sender id shown to the user |

## Ownership Boundaries

Authority changes hands at: web → GraphQL (transport only); updater → commit function (shape of metadata); lifecycle → recorder (memory files: `begin`, `record`, `discard`) and manager (candidate); the notice service is reached only through the preface port, never by the lifecycle. The journal files are written only by `WorkJournalService`; the notice service reads them through its public methods only. `run_metadata.json` is written only by the lifecycle service/commit function through the metadata store.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkJournalService` | store, renderer, per-file runtime lookup | Notice service, memory search, tools | Reading `work_journal/` files directly in the notice builder | Add a method (`listJournalFiles` already returns size, lines and days, which is all the notice needs) |
| `RuntimeSwitchRecorder` | writer, rotation primitive, marker lookup | Lifecycle service | Lifecycle appending raw traces or calling the rotation primitive | Extend the recorder |
| `RuntimeHandoverNoticeService` | derivation of "hand-over pending" from the raw traces, builder | Preface composite (`AgentRunPlatformNotices`) | Lifecycle building text or remembering a pending flag | Extend the service |

## Dependency Rules

Dependency direction follows ownership (Principle 9). `agent-execution` owns the activation and must not import `agent-memory` (which already depends on `agent-execution` types such as events). So the lifecycle service depends on one small port defined in `agent-execution/domain/runtime-switch-memory-port.ts` and implemented by `agent-memory`; the composition (`build-studio-server.ts`) wires it:

- `RuntimeSwitchMemory.begin(switch)` — reads the watermark (the id of the last active raw-trace record, or none); writes nothing; returns a plain-value ticket `{switch, watermarkTraceId | null}` that a retry can rebuild.
- `RuntimeSwitchMemory.record(ticket)` — one library call: archive through the watermark, marker first (contract 3.3).
- `RuntimeSwitchMemory.discard(ticket)` — removes the records written after the ticket's watermark from the active file; a no-op when the marker is already in the file (the attempt reached `record`). Safe because the run is stopped and in its transition lane: nothing else writes its raw traces between `begin` and `discard`.

The lifecycle service is constructed at two sites: `general-process-run-supervisor.ts:311` (ordinary runs; the supervisor receives the port in its options from `build-studio-server.ts`) and `application-execution-scope-kernel-builder.ts:257` (application-owned runs, which cannot switch: `canSwitchRuntime` excludes them). The port travels as one optional dependency, `switching: { memory } | null`: the supervisor site passes it, the application site passes none. A lifecycle without it that finds a pending switch fails that activation with a precise error before anything changes (it fails closed); that state cannot arise, because the save of a switch is rejected for such runs.

The notice service (`runtime-handover-notices`) is not called by the lifecycle at all: it is a preface source that reads the run's raw traces through `agent-memory` and the journal through `WorkJournalService`. The recorder and the notice service never depend on each other.

The value both sides need — the switch itself (`RuntimeSwitch`: key, previous and new agent runtime and model for the user's marker, marker sentence) — is built once, by one pure function in `agent-execution/domain/runtime-switch.ts`, and handed to the one port as data; the notice service never receives it (it reads the marker record). The marker id is derived by one function, `runtimeSwitchMarkerId(key)`, in the same file (`rt_runtime_switch_` + the first 24 hex characters of the SHA-256 of the key). So the marker sentence, the boundary key, the marker id and the previous/new names are each computed in one place (Principle 11).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `updateStoppedAgentRunSelection(input: { agentRunId, runtimeKind, llmModelIdentifier, llmConfig })` | A stopped standalone run's provider selection | Model-only edit, switch, or undo | `agentRunId` (run ID) | `runtimeKind` required (clean cut); all callers updated |
| `AgentRunHistoryCatalogService.recordRunStarted({ runId, platformAgentRunId?, runtimeKind?, startedAt?, clearPendingRuntimeSwitch? })` | The activation commit of a started run | Writes the new session ID, `startedAt`, resets the history row's `terminatedAt`, and removes `pendingRuntimeSwitch` when told to | `runId` | One new explicit input; the only writer of the activation commit (ARCH-F-001) |
| `openRawTraceRuntimeKind(metadata)` (`run-history/store/agent-run-pending-runtime-switch.ts`, beside the pending-switch parse) | Which runtime wrote the open raw-trace file | `pendingRuntimeSwitch.from.runtimeKind` while pending, otherwise `metadata.runtimeKind` | Run metadata | Used by `memory-run-discovery.ts` for the journal target (ARCH-F-003) |
| `commitAgentRunRuntimeSwitch({ metadata, selection, switchId })` | The metadata written by a switch/undo | Build the new metadata | Run metadata | In `run-history/services/`, beside `agent-run-model-config-commit.ts` |
| `RuntimeSwitchMemory.begin(runtimeSwitch)` → ticket; `.record(ticket)`; `.discard(ticket)` (port; implemented by `RuntimeSwitchRecorder`) | The raw traces at a switch | `begin`: the watermark, no write; `record`: archive through the watermark and start the active file with the marker, idempotent by the key and the marker's correlation id; `discard`: remove what a failed attempt wrote after the watermark (no-op once the marker is in the file) | `memoryDir` + run ID + key | `runtimeSwitch` = key, from/to agent runtime kind and model, marker sentence (built once); the ticket holds the watermark |
| `RunMemoryFileStore.rotateActiveRawTracesForRuntimeSwitch({ boundary, marker, throughTraceId })` (library, new) | The active raw-trace file at a switch | Archive the records through `throughTraceId` as one segment, rewrite the active file as `[marker, …the rest]`; built on the same private `archiveAndRewriteActive` as the other rotations | Boundary key + marker correlation id | Idempotent; no records through the watermark → no segment, marker first |
| `MemoryFileStore.readChatRawTraces(runId)` / `AgentMemoryService.getChatRawTraceSnapshot(runId)` (new) | The records the chat is built from | `runtime_switch` segments in index order, then the active file; one reader for `buildProjection` and `buildActiveTracePage` | `runId` | Compaction segments are not read (unchanged) |
| `RuntimeHandoverNoticeService.takePreface` / `prefaceDelivered` / `prefaceReturned` / `runPublished` / `runReleased` | Whether a hand-over is pending for a run | Notice delivery once per switch; pending derived from the raw traces (the marker is first and no user record follows), cached per publication | Run | Implements `AgentRunPlatformNoticeSource`; no port from the lifecycle |
| `WorkJournalService.listJournalFiles(memoryDir)` | Journal file summaries | Unchanged (size, lines, days already there); the notice shows no runtime | `memoryDir` | Existing method, no change |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `updateStoppedAgentRunSelection` | Yes (one stopped run's selection; three outcomes are one decision by one owner) | Yes (`agentRunId`) | Low | None |
| `RuntimeSwitchRecorder.record` | Yes | Yes | Low | None |
| `RuntimeHandoverNoticeService` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere (Glossary, P15)? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Changing the provider binding of a stopped run | switch / `pendingRuntimeSwitch` | Yes | Yes (runtime = Agent Runtime) | Low | None |
| Notice to the new agent | hand-over notice / `runtime-handover-notices` | Yes | Yes | Low | None |
| Previous backend | previous agent (user-facing), earlier segment (code) | Yes | Yes | Low | The notice says "previous agent" |
| The stopped-run edit | `…Selection` (agent chain); team family keeps `…ModelConfig(s)` | Yes | Yes: each name says what it edits | Low | Decided (option A); rename list in discrepancy 2 |
| Runtime names in text | Claude Agent SDK, Codex App Server (`agentRuntimeName`) | Yes | Yes (GLOSSARY: no short forms) | Low | The marker and the UI use the glossary names; the notice names no agent runtime |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Settings save + validation | Stopped-run selection updater, `RunModelSelectionService` | Extend | Same seam, same lane | — |
| Fresh session on an existing run ID | `beginActivation({kind:"new"})`, `persistAndPublish` | Reuse | Already used by prepared runs | — |
| Archive records at a boundary | `rotateActiveRawTracesBeforeBoundary` | Reuse (+ one type value) | Idempotent, tested | — |
| Marker in chat and journal | `system_task_notification` records, projection, renderer | Reuse | F-28 | — |
| Notice before the next input | `AgentRunInputPreface` + `AgentRunPlatformNotices` | Extend (third source) | F-27 | A new source only |
| Journal listing facts | `WorkJournalService.listJournalFiles` | Extend | Already has size, lines, days | — |
| Runtime display name | `agentRuntimeName` (agent-presentation-contracts) | Reuse | Already used server-side | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory store | Boundary type value | DS-002 | Recorder | Extend | Type only |
| `agent-execution` (lifecycle, eligibility, updater) | Activation order, eligibility, settings decision | DS-001, DS-002 | Lifecycle, updater | Extend | |
| `run-history` | Metadata shape, commit function | DS-001, DS-002 | Updater | Extend | |
| `agent-memory` | Marker + rotation, file source segment runtime | DS-002, DS-003 | Recorder, journal | Extend + Create | |
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
| The switch's key, from/to names and marker sentence | `agent-execution/domain/runtime-switch.ts` | agent-execution | Needed by the memory port and the notice port; computed once | Yes | Yes | A holder of lifecycle logic |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `pendingRuntimeSwitch {switchId, from: RunProviderBinding}` | Yes: `switchId` = the identity of the switch (one meaning; a time stamp is not an identity); `from` = the previous binding. The new binding lives in the ordinary metadata fields, not repeated here | Yes (no stop reason, no copy of the new binding, no history list) | Low: the switch history is the raw-trace manifest and the markers | None |
| Journal manifest file entry `runtime_kind` | Yes: the agent runtime the file was rendered with (`null` = rendered with the no-runtime rules) | Yes (the run-level field is removed) | Low | None |
| Raw manifest entry (`boundary_type: runtime_switch`) | Yes | Yes | Low | None |
| `RuntimeSwitch` (in memory) | Yes: key, from, to, marker sentence | Yes | Low | None |

## Final File Responsibility Mapping

See "Target Subsystem / Folder / File Mapping".

## Applied Patterns (If Any)

Strategy already used by the journal renderer (translation per runtime); notice source implements the existing preface port.

## Target Subsystem / Folder / File Mapping

Server paths under `autobyteus-server-ts/src/`, library under `autobyteus-ts/src/`, web under `autobyteus-web/`.

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | File (change) | Library | Add `'runtime_switch'` to `RawTraceArchiveBoundaryType` | The type lives here | Switch logic |
| `agent-memory/services/raw-trace-file-source-service.ts` | File (change) | Raw file source | Expose the segment's runtime (`runtimeKindFromString(entry.runtime_kind)`, null when absent or unknown) on `RawTraceFileSource` | The source already reads the entries | A spelling table |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` (also the boundary type, above) | File (change) | Library | Add `rotateActiveRawTracesForRuntimeSwitch` (and a read of the last active record id for the watermark) | Beside the other rotations; one private archive-and-rewrite | Server concerns |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` (second change) | File (change) | Library | `removeActiveRawTracesAfter(traceId \| null)` for `discard` (guarded: no-op when the marker is in the file) | Same store | Server concerns |
| `agent-memory/store/memory-file-store.ts`, `agent-memory/services/agent-memory-service.ts` | Files (change) | Memory reads | `hasPendingRuntimeHandover(runId)`: the first record of the active file is the hand-over marker and no `user` record follows (scan stops at the first `user` record) | The notice service's only raw-trace read | Notice text |
| `agent-memory/store/memory-file-store.ts`, `agent-memory/services/agent-memory-service.ts`, `run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Files (change) | Chat reader | `readChatRawTraces` / `getChatRawTraceSnapshot`; both projection methods use it | One reader, both methods (CRR-002 F-2) | Compaction segments |
| `agent-execution/services/stopped-run-selection-context.ts` | File (change) | Selection context | While `pendingRuntimeSwitch` is present there is no current model (a fresh selection): the pending model has never run (CRR-002 F-3) | Same function, one rule | — |
| `agent-memory/store/external-runtime-memory-writer.ts` | File (change) | Writer | Keep `correlationId` for `system_task_notification` records | Marker lookup | Switch logic |
| `agent-memory/services/runtime-switch-recorder.ts` | File (new) | Recorder; implements the `RuntimeSwitchMemory` port | Marker + rotation, idempotent by key | Memory owns its files; mirrors `provider-compaction-boundary-recorder.ts` | Activation logic |
| `agent-execution/domain/runtime-switch.ts`, `agent-execution/domain/runtime-switch-memory-port.ts` | Files (new) | Switch value and the one port | `RuntimeSwitch` built once (key, names, marker sentence with `agentRuntimeName`); the `RuntimeSwitchMemory` port (`begin`, `record`, `discard`) | The lifecycle depends on a port, not on `agent-memory` (Dependency Rules) | Lifecycle logic |
| `agent-execution/domain/system-task-notification-senders.ts` | File (change) | Senders | Add `RUNTIME_HANDOVER_NOTICE_SENDER_ID = "system.runtime_handover"` | Existing place | — |
| `agent-execution/services/standalone-agent-run-eligibility.ts` | File (change) | Eligibility | Add `canSwitchRuntime(metadata)` | Beside the existing predicate | I/O |
| `agent-execution/services/standalone-stopped-run-selection-updater.ts` (renamed from `standalone-stopped-run-model-config-updater.ts`) | File (rename + change) | Updater | Model-only / switch / undo decision, fresh-selection validation | The seam (F-25) | Metadata shape |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | File (change; 376 lines now, about 60 added: stays under 500, so no extraction — the new branch needs the file's private helpers) | Lifecycle | `activateSwitched` branch in `activateOnce`; `persistAndPublish` takes the "stored metadata still equals the original" check from its caller (prepared start: today's rule; switch: pending original); calls recorder and notice service | Owner of order | Notice text, file writes |
| `run-history/services/agent-run-history-catalog-service.ts` (+ its test) | File (change) | Run-history catalog | `clearPendingRuntimeSwitch` input of `recordRunStarted` | The existing writer of the activation commit | A second writer |
| `memory-search/runs/memory-run-discovery.ts` | File (change) | Memory discovery | Supply the journal target's runtime with `openRawTraceRuntimeKind(metadata)` for standalone runs | One owner of the fact | Its own pending-switch rule |
| `agent-execution/runtime/general-process-run-supervisor.ts` | File (change) | Supervisor | Receive the port in its options (from `build-studio-server.ts`) and pass `switching` to the lifecycle service | Construction site of the lifecycle for ordinary runs | Switch logic |
| `application-platform/execution/application-execution-scope-kernel-builder.ts` | File (no change; decision) | Application scope | Passes no `switching`: application-owned runs cannot switch | Construction site 2 (ARCH-F-002) | — |
| `run-history/services/delegated-launch-selection-service.ts`, `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` (`updateStoppedDelegatedLaunchSelections`, host validation context), the GraphQL input of the configured patch (`api/graphql/types/run-history.ts`) and the web's `DelegatedConfiguredPatch` | Files (change) | Combined Save of a host with its copies | The host's own selection carries `runtimeKind`; the call to the stopped-run edit passes it; the host validation context uses the selection's own runtime | Second caller of the changed input (ARCH-F-002) | A separate switch rule |
| `standalone-agent-run-root/**` | Decision only | Root | No change (MP-1) | The root is rebuilt from the new metadata after Stop | — |
| `run-history/services/agent-run-runtime-switch-commit.ts` | File (new) | Run-history | `commitAgentRunRuntimeSwitch` (switch and undo) | Beside `agent-run-model-config-commit.ts` | Eligibility |
| `run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, new `agent-run-pending-runtime-switch.ts` | Files (change/new) | Metadata store | Type, parse and normalizer entry of the optional field | Precedent `delegatedFrom` | Switch logic |
| `llm-management/domain/run-model-selection.ts`, `llm-management/services/run-model-selection-service.ts` | Files (change) | Selection | `RunModelSelectionContext.currentModelIdentifier` becomes `string \| null`; the native capacity comparison runs only when it is not null (a fresh selection of a runtime has no current model) | Existing validator and its context type (F-37) | — |
| `agent-execution/services/stopped-run-selection-context.ts` | File (new) | Selection context | One function `selectionContextFor(metadata, selection)`: the selection's runtime, the stored model as current only when the runtime is unchanged, the workspace | Used by the updater and by the root manager's host validation, so the "fresh selection" rule has one owner (Principle 13) | Validation itself |
| `api/graphql/types/agent-run.ts` | File (change) | GraphQL | Mutation, input and result types renamed to `…Selection`; `runtimeKind` in the input; rejection messages | Existing mutation | Decisions |
| `run-history/services/studio-run-model-config-service.ts`, `agent-execution/services/agent-run-service.ts` | Files (change) | Existing service chain | `updateStoppedAgentRunSelection` / `updateStoppedSelection` carry `runtimeKind` in `StoppedRunSelectionInput` through to the updater; the delegated-launch service's call is renamed | Thin pass-through (Thin Entry Facades) | The decision |
| `runtime-handover-notices/runtime-handover-notices.ts` | File (new) | Composition entry | Creates the service and exposes it as the preface source | The two sibling subsystems expose their service the same way (`tool-list-updates/tool-list-updates.ts`); dropped at implementation if it holds nothing | Logic |
| `runtime-handover-notices/services/runtime-handover-notice-service.ts` | File (new) | Notice | Satisfies `AgentRunPlatformNoticeSource` (`AgentRunInputPreface` and `AgentRunLifecycleObserver`): `runPublished` forgets the run's cached state, `takePreface` derives "pending" once per publication (reads the start of the run's active raw-trace file through `agent-memory`: the first record is the hand-over marker and no `user` record follows) and returns the notice, `prefaceDelivered` marks it done, `prefaceReturned` keeps it pending, `runReleased` forgets the run. The input record that ends "pending" is a `user` record of any sender (including agent-to-agent), which the recorder writes only when the forward result has a turn id (`recordForwardedUserMessage`): a first input forwarded without one and followed by a restart carries the notice once more (harmless) | The port | Journal rendering; the lifecycle calling it |
| `runtime-handover-notices/services/runtime-handover-notice-builder.ts` | File (new) | Notice text | Pure text from facts (contract §3.6) | Pure and testable | I/O |
| `compositions/build-studio-server.ts` | File (change) | Composition | Add the hand-over source FIRST in `AgentRunPlatformNotices([handover, toolList, skill])` (one notice per input; a pending tool-list notice must not delay the hand-over by one input) and pass the port to the supervisor's options | Where the two others are wired | Logic |
| `agent-work-journal/domain/work-journal-models.ts`, `store/work-journal-store.ts`, `services/work-journal-service.ts` | Files (change) | Journal | Per-file `runtime_kind`; remove run-level; lookup rule | DS-003 | A spelling table |
| `autobyteus-web/components/run-settings/ExistingRunSettings.vue`, `RunSettingsCard.vue` | Files (change) | Settings | Unlock the root card's runtime (`runtime-locked`, line 47) only when `kind === 'agent'`; team/Org roots, members (line 60) and delegated rows (line 75) keep it; draft carries `runtimeKind`; hint line | Existing. The web uses only the coarse kind; the server alone decides eligibility (application-/system-owned runs, a not-yet-started run) and rejects with a message the existing `saveError` shows — one rule, not two | Server eligibility rules |
| `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue` | File (change) | Config editor | It passes `:root-locked-models="lockedModelsFor('/')"` (the current runtime's replacements) and handles `change-root`: for an eligible agent root (kind `agent`) it handles a runtime change in the draft and does not pass the old runtime's locked list; without `runtimeLocked` the model menu uses the chosen runtime's catalog | The editor feeds the settings card | Server eligibility rules |
| `autobyteus-server-ts/docs/modules/run_history.md` (lines 56, 158), `autobyteus-web/docs/settings.md` (line 1692) | Files (change) | Docs | The renamed mutation and method names; the switch and the pending switch described (`agent_team_execution.md:165` names the team method, which keeps its name) | Same change | — |
| `GLOSSARY.md` | File (change) | Docs | Add the five words of Terminology to Agent Runtimes | Principle 15 | — |
| `autobyteus-web/components/chat/ChatModelMenu.vue` | File (change if needed) | Menu | Show all runtimes when not locked (existing mode) | Existing | — |
| `autobyteus-web/stores/existingRunConfigStore.ts`, `services/runConfigEditing/existingRunModelConfigMutationClient.ts`, `graphql/mutations/runHistoryMutations.ts`, `generated/graphql.ts` | Files (change) | Web state/client | Pass the runtime; `updateStoppedAgentModelConfig` and its GraphQL document → `updateStoppedAgentSelection`; the agent-only result type `AgentModelConfigMutationResult` (`existingRunModelConfigMutationClient.ts:17`) → `AgentSelectionMutationResult` (`ExistingRunModelConfigMutationResult` is shared with teams and stays); `generated/graphql.ts` regenerated | Existing | — |
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

## Derived Layering (If Useful)

N/A.

## Design Principles Check

The design was audited against DESIGN.md rules 1–9 and Core Principles 1–15 of the design principles, and the structural-trigger table (2026-10-30). The right-hand column says what the audit found and what changed in this document because of it.

| Principle | Verdict | Evidence / change made |
| --- | --- | --- |
| DESIGN 1, 4, 5 (smallest solution; no avoidable work) | Pass, after cuts | Removed: the optional run summary file, the excerpt fallback, journal sizes in the settings, a new raw-trace record type, a second notice path. Reused: the rotation primitive, `beginActivation(new)`, `persistAndPublish`, the notice route, the notice record, the chat projection. New code is one lifecycle branch, one recorder, one notice service, one port pair, the per-file journal runtime, the settings choice. |
| DESIGN 7 (bad data stays in its run) | Pass | A pending-switch run whose data cannot be read affects only that run; the journal drops invalid manifest entries and renders them again (`work-journal-store.ts` `readManifest`). |
| DESIGN 8 (no version numbers in current names) | Pass | The contract file name has no version; "v2" is only the document's revision. No `V2` identifier. |
| DESIGN 10 (stored names stay in sync) | Pass once PRE-1 is delivered | The user decided (2026-10-30) to make the naming consistent first, in a separate ticket with a sealed migration; this design has no label mapping and reads `RuntimeKind` values. |
| DESIGN 9 (no cross-version compatibility) | Pass | The mutation input changes as a clean cut; no old/new shape side by side. |
| P1 Behavior and production reality | Pass, after two fixes (round 2: the first-message path was traced from `AgentRunService.activate` through the root; `recordRunStarted` was read, not assumed) | Kinds and entry forms traced: the five agent runtimes all start a fresh session on an existing run ID through one request (`{kind:"new", runId, config}`, notes F-18); external runtimes record through the memory recorder, the native one through its memory manager (notes F-29) and the archive step puts the marker first before the new runtime's recorder starts (the recorder attaches at publication). Standalone run kinds (ordinary, application-owned, system-owned, delegated copy) are separated by the eligibility rule. Added citations: lifecycle (`activateOnce`, `persistAndPublish`, `isExactTarget` at `standalone-agent-run-lifecycle-service.ts:365-375`), notice route (`agent-run-input-preface-dispatch.ts`), web locks (`ExistingRunSettings.vue:47,60,75`). One premise was wrong and is fixed: the retry check of `persistAndPublish` is prepared-run-only. Round 3 (CRR-002): two more premises measured wrong and fixed — "preparing a candidate writes nothing to the run's raw traces" (it writes its own records; watermark order) and "the chat shows all raw-trace files" (it reads the active file only; one chat reader). Lesson recorded: say what was verified in the real code path ("nothing is written"), not what a comment promises ("nothing is published"). |
| P2 Spines | Pass, after fix | Three spines with real spans (surface → owner → effect), a return/event spine for the live marker, a bounded local spine for the activation order. Fixed: DS-001's owner was written "updater with the store" (an "A + B" owner); now the updater owns it and the web is the initiating surface. |
| P3 Ownership and authoritative boundaries | Pass | Each node owns one thing (Ownership Map). The notice service reads journals only through `WorkJournalService`; nothing else writes journal files; the lifecycle does not touch memory files. No caller uses a boundary and its internals together. |
| P4 Off-spine concerns | Pass | Eligibility, validation, marker writing, notice text and label mapping are off-spine and named by concern. Existing areas reused first (reuse check table). |
| P5 Persisted data | Pass | Per-store decisions with evidence (measured 823 of 825 journals consistent; no existing entry has the new type). No migration; derived journal data rebuilt, not migrated. The stored-name discrepancy is stated, not hidden. |
| P6 Supported scenarios | Pass, after fix | Supported: switch, undo, repeated switch before sending, activation that fails and is sent again. Unsupported and not designed for: process crash (the earlier "crash injection" wording is replaced by failure injection), a runtime unable to read files (withdrawn by the user's reasoning), teams, agent-started switches (follow-ups). |
| P7 No dead code | Pass | Removal plan names what becomes unnecessary and the check to run in the touched files. |
| P8 Clean cut | Pass | Rejection log: no run-level journal runtime beside the per-file one; no second mutation input. |
| P9 Dependency direction | Pass, after fix | The lifecycle (agent-execution) would have imported agent-memory and the notice subsystem, against their dependency on agent-execution. Fixed with one port owned by agent-execution (`RuntimeSwitchMemory`), wired in the composition; the notice service is not called by the lifecycle (it derives the hand-over from the raw traces); the earlier second port is gone. |
| P10 Interfaces follow ownership | Pass | One boundary per subject; explicit run ID. The mutation is renamed to say it edits the run's selection (discrepancy 2, decided by the user). |
| P11 Tight structures; one owner per fact | Pass, after fix | Fixed three: the previous binding is `Pick<AgentRunMetadata, …>`, not a copy of fields; the marker sentence/key/names are built once (`runtime-switch.ts`) instead of in the recorder and in the notice service; eligibility is decided only by the server (the web uses the coarse run kind). Derived consumers of every changed structure are listed in Change Scope. |
| P12 File responsibility | Pass, after fix | One concern per file. The earlier hedge ("extract if over 460 lines") is replaced by a decision: about 60 lines added to a 376-line file, no extraction. The notice subsystem's entry file is flagged to be dropped if it holds nothing. |
| P13 One owner per sequence; no behavior by absence | Pass, after fix | The lifecycle calls each mechanism itself, in order; no function is passed to reach another collaborator. The switch branch was chosen by "pending present and session ID null" (a branch by absence); now the explicit pending field alone decides. |
| P14 Spine-first document with examples | Pass | Spines before files; good/bad shape table; sequence from current state. |
| P15 Vocabulary | Pass, after fix | Found: the marker and notice used "Claude"/"Codex" and "runtime" where GLOSSARY.md requires the agent runtime names (Claude Agent SDK, Codex App Server) and "agent runtime", with no short forms. Fixed in the contract, requirements and this design. The new words are added to GLOSSARY.md in the same change. The stored-label discrepancy is resolved by autobyteus-343; the `…ModelConfig` drift is removed by the rename. |
| Structural triggers | None fire unresolved | Repeated coordination: no. Responsibility overload: no (lifecycle file stays under 500 lines). Ambiguous boundary: no. Empty indirection: the notice subsystem entry file is conditional (above). Shared folder: no. Several kinds or forms: traced above. Split sequence: no. Derived data: handled (Change Scope). Behavior by absence: fixed above. Vocabulary drift: fixed/recorded above. |

## Change / Refactor Sequence

0. Prerequisite: autobyteus-343 (stored runtime names) is delivered and merged.
1. Library: add the boundary type value; build `autobyteus-ts`.
2. Memory: file source exposes the segment's runtime; writer keeps the notice correlation id; switch recorder (+ tests: rotation, marker, retry, failure injection).
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
- The hand-over is derived from the raw traces (the marker is first and no user record follows), not remembered: it survives a restart, and no `register` call couples the lifecycle to the notice subsystem. Cost: the notice service reads the first records of a run's active file once per publication.
- Journal rebuild instead of migration: one-time local render per run, no model cost.

## Risks

- After a later compaction in the new era the marker (archived by that compaction) is no longer part of the chat; the previous era stays. Compaction's rule applies to the new era (contract 3.7).
- A failed native start leaves its `system_instruction` record at the tail of the previous era's file (as any failed native start does); an undo then leaves a record of a runtime that never ran, deduplicated by the next identical instruction.

- What the new agent does with the journals is the work of its model; the design only tells it where they are and how they are laid out. The real run checks that the notice arrives and the named journals can be opened; there is no quality promise and no fallback.
- Native writer after rotation (escalation trigger above).
- An activation that fails after the marker, followed by the user undoing the switch instead of sending again, leaves a marker for a switch that did not happen (the chat and journal show it; nothing breaks).
- The restart-and-resume notice (283–289) may later share the next input (FU-005).
- Pending-switch runs with `platformAgentRunId: null` flow through listings, views and resume-config: tested (Change Scope).

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `probes/runtime-switch-folder.probe.test.ts` (copy into `autobyteus-server-ts/tests/`, run `./node_modules/.bin/vitest run <file>` from `autobyteus-server-ts`; it turns into the permanent test of the recorder and the journal's per-file runtime).
- Tests (TESTING.md layers): library type; server unit — recorder (rotation, marker, idempotence; a throw aborts the candidate), journal per-file runtime and reuse, `recordRunStarted` with `clearPendingRuntimeSwitch` (the stored metadata equals the target, the history row is reactivated), commit function (switch, undo with the same and with a different model of the original runtime, repeated switch keeps the first `from`), `openRawTraceRuntimeKind` and the journal target of a pending run, updater (eligible/ineligible, fresh-selection validation), notice builder (text; says where to start; lists the journal files; says "another agent"; names no agent runtime; does not repeat the user's message), notice service (once per switch, `prefaceReturned` keeps it pending); server integration — lifecycle `activateSwitched` with scripted runtimes: success order, failure of the new session (nothing changed), failure after the marker (sending again completes with one marker and one archived segment), existing restore and prepared cases unchanged (the generalized retry rule keeps their outcomes), the first message through the real root and host handle, the combined Save of a host with copies, the hand-over notice delivered first when a tool-list notice is also pending, a token-usage record on both runtimes, pending-switch run opens/lists; GraphQL contract; web — store/menu/settings unit tests, browser probe of the settings journey.
- Added by ARCH-F-007: a native start that throws after its instruction was written, then a retry (the instruction is in the new era and not in the previous segment); a failed attempt that is abandoned (undo, third runtime) leaves the previous file untouched; the three cases of the contract table; the library method with an empty watermark, a repeated call, an interrupted rewrite and an existing segment; the hand-over derived from the raw traces (a restart between activation and the first input still delivers it; once per switch); a chat test native → other → native (turn ids restart at `turn_0001`).
- Added by CRR-002: the red test `tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-01) turns green; Grok as a target (its prepare appends a system instruction) with the watermark; the library method (records through the watermark, none through it, repeated call, a crash between archive and rewrite completed by the retry); the chat after a reload for a run that switched once and twice and for a run that compacted before and after; a second save with a switch to native pending (F-3).
- Real run (TESTING.md rule 1–2: worktree build, isolated instance, never the user's data): `pnpm --silent isolated-app start --build` with imported credentials; a throwaway workspace; a Claude run does a small multi-step task, is stopped by hand (a usage limit cannot be produced on demand; the switch path is identical because no stop reason is recorded), its settings switched to Codex, one message sent; check: same run ID and chat, marker, notice received, the new agent receives the notice before the message and can open the journal files it names, `raw_traces_000001.jsonl` holds only the previous runtime's records (I-7, asserted on each runtime pair tried, because scripted runtimes cannot show a real backend writing a record between `prepare()` and the marker), journals translated per file. What the agent does next is its model's work and is not graded. Record the evidence in the validation report. Clean up the instance.
- Done means (Task): the user has approved this design; then in this slice a run stopped on one runtime continues on another with the work carried over, shown by the tests and the real run on isolated data; merged to `personal`. No release unless asked. Prove from a clean clone.
