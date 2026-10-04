# Design — Project description voice and clean task completion

## Document status and approved basis
Package: task-voice-success-cleanup. Design: Ready. Solution revision: SR-003.
Approved requirements behavior baseline: SR-002, explicit user “yesss.” after the final two-item confirmation; approval captured in requirements-doc.md. REQ-003/AC-003 withdrawn, never implement mandatory descriptions. Applicable REQ/AC: 001, 002, 004. Supplements: none behavior-defining; user screenshot is current-state evidence only.
Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup
Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/investigation-notes.md
Branch: codex/task-voice-success-cleanup. Base origin/personal 26b555126ebcda7d9fa80d728e24475baba7acb8, refreshed before worktree creation. Finalization target origin/personal, not authorization to release.

## Current-state read and architecture evidence
The task composer already uses shared VoiceInputButton/store and a stable draft-owned transcript target. It separately presents activity and captured terminal results; the success branch is the unwanted message. ProjectEditor owns create/edit text and saves through projectStore, but its optional-description textarea has no voice action. Both fit the existing voice target boundary.
Canonical investigation SR-003 records exact source reads: VoiceInputButton, voiceInputStore, useProjectTaskDraft, mergeTranscriptWithDraft, ProjectEditor/routes, localization and tests. The store distinguishes only settings-test versus target-bound use in delivery; there is no need to alter native capture/IPC. The keyed edit route plus editor alive/node-revision guard provides the existing target-lifetime basis.

## Task size and architectural risk
- task_size: Medium — two authoring surfaces, a small shared presentation component, a renderer source discriminant/button type, locales and focused tests/docs.
- architectural_risk: Low — reuse existing target, cancellation, merge, capture and persistence owners. No new API/IPC, schema, security, deployment, concurrency algorithm or ownership boundary. Source label extension is internal metadata with unchanged target semantics.
- Payload: two obsolete localization entries and docs. Structural delta: presentation extraction and a new consumer of existing voice contract. Size does not derive from document volume.
- Escalate Design Impact if implementation requires changing native capture/IPC, routing ownership, store concurrency or persistence; escalate Requirement Gap for changed behavior. Do not silently expand scope.

## Intended change
Remove success-only task voice feedback. Add a microphone action beneath the project-description textarea, right-aligned in the description area, using the existing large VoiceInputButton styling. Keep textarea ID/test ID, label and optionality. Show only useful voice activity/no-speech/error feedback. Successful text insertion is its own feedback, with no reserved status gap.

## Relevant behavior and production-path map
| Behavior | Approved intent | Trigger | Existing evidence / target path |
|---|---|---|---|
| BEH-001 / SCN-001 | REQ-001, AC-001; REQ-004, AC-004 | Task create/edit dictation | Task composer → shared button/store → native transcription → task draft target → editable text (DS-001/003); remove only success presentation |
| BEH-002 / SCN-002 | REQ-002, AC-002 | Project create/edit dictation | Project editor → shared button/store → native transcription → project description target → editable text (DS-002/003); manual save remains distinct |
| BEH-003 / SCN-003 | REQ-004, AC-004 | Blank/nonblank project create/edit save | ProjectEditor → projectStore → existing GraphQL/service/store → saved project and navigation (DS-004), unchanged optional-description semantics |

## Relevant supplemental task artifacts
Only supplied screenshot, absolute reference in investigation-notes.md; evidence of old success banner, not a new normative UI design. Product artifacts and independent review: N/A — not applicable. No new visualizer requested.

## Task design health assessment
Posture: Feature + Cleanup. Root cause: No Design Issue Found in capture/target architecture; obsolete local success presentation and missing consumer integration explain requested delta. Refactor needed now: Yes, narrowly extract the existing project/task status presentation to avoid duplicating target-scoped result retention and cancellation UI across the two forms. No runtime restructuring. Existing editor remains draft owner; shared status component must not own descriptions or saving. No deferred architectural defect within scope.

## Terminology and reading order
Target is the existing voice transcript sink bound to one editor lifetime; source is its diagnostic origin label, not destination identity. Read approved basis/evidence → behavior/spines → boundaries/files → sequence/verification.

## Legacy removal policy and removal/decommission plan
No backward compatibility; remove legacy code paths.
- Remove transcript-ready → voiceReady mapping, and remove unused voiceReady keys from en/zh-CN projects catalogs after confirming no remaining consumers.
- Move status markup, target ownership computation, sync result retention and cancel action out of TaskDescriptionComposer into ProjectVoiceStatus.vue. Delete replaced local imports/computations/watchers; do not retain parallel presentation policy.
- No feature flag, timeout, hidden success placeholder or old/new status switch. Keep success result in voice store: it is a valid result consumed elsewhere, not obsolete state.

## Persisted data / state transition decision
Not Affected: description strings and save payloads keep their shape/meaning; no readers/writers/schema modified. Existing optional blank data remains valid and untouched (AC-004). No backfill, migration, reset or data-loss permission. Migration convention investigation/plan N/A because no transformation is proposed.

## Data-flow spine inventory and primary execution spines
| ID / scope | Start → end | Governing owner / purpose |
|---|---|---|
| DS-001 Primary | Task voice click → VoiceInputButton → voiceInputStore → native capture/transcription → task target → draft textarea | Existing task draft + voice store; preserve successful dictation without banner |
| DS-002 Primary | Project voice click → VoiceInputButton → voiceInputStore → native capture/transcription → project target → description textarea | ProjectEditor owns text; voice store owns operation |
| DS-003 Return/Event | latestResult while target owned → ProjectVoiceStatus sync snapshot → active/error/no-speech or no status | Status component owns presentation, avoids losing terminal error after target release |
| DS-004 Primary preserved | Explicit Save → editor/projectStore → GraphQL → project service/store → result/navigation | Existing persistence path; voice alone never saves |

## Spine narratives, actors and ownership map
DS-001/002: clicking the shared button starts/stops the existing single voice operation, whose store captures a target and generation. Native transcription returns text; currentness is checked before appending. The editor target merges into the latest local description/draft, retaining any text typed meanwhile. Only explicit Save reaches persistence.
DS-003: active phases derive from store state only when the target key matches. The sync result observer keeps only this target's result before the store clears ownership. On success/idle/cancel there is no terminal success message; errors and no-speech remain visible. New operation clears stale local feedback as current code does through result updates; unrelated captures never overwrite local feedback.
DS-004: save retains existing name/workspace validation and optional description normalization. While this editor owns an active voice operation, guard submission and disable Save as task drafts already do, preventing a save before the pending transcript lands. The microphone must remain stoppable while recording; do not disable it just because its own recording is active.
Actors/owners: VoiceInputButton owns action/availability presentation; voiceInputStore owns capture and cancellation; target-owning editors own text and lifetime; projectStore owns existing persistence client; ProjectVoiceStatus owns only feedback. No thin facade or new manager needed.

## Return/event and bounded local spines
Return flow is DS-003 plus the target append callback in DS-001/002. Existing store lifecycle: starting → recording → transcribing → result → cleanup. Reuse generation invalidation and cancelOperationForTarget on cancellation/unmount. No new worker loop, polling or retry state machine.

## Off-spine concerns
- Localization serves status/button/form presentation using existing en/zh-CN catalogs.
- mergeTranscriptWithDraft serves both editor sinks; do not implement separate concatenation policy.
- Alive/node-binding/current-project identity checks serve ProjectEditor target eligibility; no global project lookups needed.
- Existing voice availability/setup and error toasts remain store/button concerns; no second permission/extension policy.

## Ownership boundaries, encapsulation and dependency rules
UI calls shared button/store public actions and supplies VoiceTranscriptTarget. ProjectEditor must not call electronAPI, acquire MediaStream, mutate store capture internals or read native state directly. Status may read public reactive store state and cancel by its target key, never by a broad source or global cleanup. Editor text remains local; do not persist voice results via projectStore automatically. Existing save path is authoritative for server communication; no Apollo/HTTP bypass in components.

## Interface boundary mapping and check
| Interface | Decision / identity / singular responsibility |
|---|---|
| VoiceInputRecordingRequest | Extend target-bound source union with 'project-description'; keep required target and settings-test branch unchanged |
| VoiceInputButton source prop | Derive accepted non-settings source from VoiceInputRecordingSource (Exclude) to avoid another drift-prone union |
| VoiceTranscriptTarget | Unchanged key/isCurrent/appendTranscript contract; one stable unique key per editor mount, not just project ID |
| ProjectVoiceStatus target prop | Target identity selects status; no description/save payload or result delivery callback |
| cancelOperationForTarget(key) | Existing exact-target cancellation, never cancels unrelated capture |
All interfaces remain singular and explicitly target-scoped; selector ambiguity Low. No server/interface change.

## Main subject naming, subsystem reuse and allocation
ProjectEditor, VoiceInputButton, VoiceTranscriptTarget, projectStore retain natural names. New ProjectVoiceStatus is project-area feedback for both project and task description surfaces. Reuse voiceInput capability for capture, types and merging; extend Projects presentation only. No general-purpose form framework or kitchen-sink composer. TaskDescriptionComposer keeps task attachments; project editor must not reuse it and accidentally expose files.

## Draft file responsibility mapping and reusable structures check
Initial candidates were direct status copy into ProjectEditor and task-local status deletion. Shared target-scoped feedback is truly repeated, so extract ProjectVoiceStatus instead; retain one status mapping/watch owner. Reuse existing target type and merge utility without a parallel DTO. No redundant saved/derived phase fields; phase/error/message remain computed, local terminal result exists only because the operation owner clears its target.

## Final file responsibility and target folder mapping
All paths below relative to workspace; final layout remains compact in existing concern folders.
| Change / path | Responsibility / boundary |
|---|---|
| Add autobyteus-web/components/projects/ProjectVoiceStatus.vue | Shared activity/no-speech/error/cancel block. Props target and optional selector support if needed for test stability; no input/save ownership |
| Modify autobyteus-web/components/projects/TaskDescriptionComposer.vue | Replace inline status with shared component, retaining task-voice-status/cancel selectors through appropriate attributes/props if tests need them; task attachments/footer untouched |
| Modify autobyteus-web/components/projects/ProjectEditor.vue | Stable target appended into description via merge utility, currentness/lifetime guards, button/status placement and own-voice pending Save guard; optional label/validation unchanged |
| Modify autobyteus-web/types/voiceInput.ts | Add project-description target-bound source label |
| Modify autobyteus-web/components/voiceInput/VoiceInputButton.vue | Reuse source type, no behavior fork |
| Modify autobyteus-web/localization/messages/{en,zh-CN}/projects.ts | Remove unused success copy, reuse existing active/error keys |
| Add/modify colocated specs under components/projects/__tests__, components/voiceInput/__tests__, stores/__tests__ as applicable | Assert changed presentation, project target lifecycle, source acceptance and preserved capture contract |
| Add/extend autobyteus-web/tests/e2e project voice probe | Executable rendered create/edit/task evidence, owned fixture resources, explicit transcription mock boundary |
| Delivery sync autobyteus-web/docs/{projects,electron_packaging}.md | Project voice support, no success notice, new internal source label, optionality unchanged |
No production server files, task store, capture algorithms or page routes need changes. Folder boundary risk Low: presentation in Projects, capture in voice capability, tests colocated. Applied pattern: existing target adapter, not new indirection.

## Concrete shape guidance
Project target: key generated once per editor lifetime, isCurrent includes alive + captured node revision + captured project identity + loaded/eligible editor; append uses that guard and merges latest description. Before unmount mark dead and cancel exact target. VoiceInputButton also cancels on unmount; idempotent existing cancellation is acceptable.
Good: description.value = mergeTranscriptWithDraft(description.value, transcript). Avoid replacing typed text, auto-submit, key regeneration on render, a 'project-task' source for project descriptions, or touching optional description validation.

## Backward-compatibility rejection log and derived layering
Rejected: success-message preference flag, delayed hide timer, attachment composer repurposing, duplicate voice engine, retained local status policy. Clean-cut shared status plus current target contract replaces old rendering. No compatibility/migration layer. Layers remain Projects UI → voice public capability → native implementation; Projects UI → projectStore for explicit save.

## Change/refactor sequence
1. Extend internal source typing; extract task status presentation while deleting success branch and obsolete localization keys.
2. Wire stable project description target/button/status into shared create/edit form; preserve optionality and guard pending voice Save/unmount.
3. Add focused tests and run existing task target/button/store regressions; inspect rendered task and project create/edit at desktop/narrow widths.
4. API/E2E specialist adds durable rendered coverage with explicit boundary limitations. Delivery syncs docs, obtains explicit user verification, finalizes under its gates. No release assumed.

## Key tradeoffs and risks
One small shared status component avoids repeated feedback policy; project draft state stays local instead of extracting an unnecessary generic draft framework. Adding source metadata is more truthful than mislabeling projects as tasks. Main risk is stale/wrong-target text or lost no-speech/error feedback; exact target tests and sync observer protect it. Actual microphone/model availability is unverified here; controlled transcription proves renderer integration only, not native transcription quality. Shared-button/store changes must not regress composer/settings tests.

## Guidance for implementation and verification
Follow root AGENTS/SOLUTION_DESIGN_BEST_PRACTICES, web AGENTS and TESTING.md. No implementation executed in this solution phase. Required matrix:
- Task success keeps appended text and removes status node/gap; active recording/transcribing/cancel/error/no-speech unchanged.
- Project create and edit append once to blank/nonblank/latest typed description, editable afterward, no auto-save or success notice; explicit save carries transcript.
- Blank project description still creates/saves and optional label remains; workspace descriptions optional; no backend validation change.
- Own pending voice prevents premature Save, button can Stop, cancel/unmount denies late append, unrelated targets are not canceled or displayed, unavailable voice retains typing.
- Shared status repeated success clears earlier error/no-speech, no stale banner on unrelated operations.
Use pnpm -C autobyteus-web test:nuxt <focused paths> --run. Renderer changes need browser dev-path probe with DOM assertions and supporting screenshots; native transcription fixtures must be disclosed. If full product/native-shell proof is attempted, use a current-worktree isolated app, never user's installed application/data. API/E2E owns executable validation details and residual risk classification. Do not claim passing tests based only on static review.
