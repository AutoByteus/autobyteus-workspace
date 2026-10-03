# Design Spec — Stable Composer Voice Destination Lifetime

## Summary
Repair the reproduced unintended voice cancellation by keeping the existing composer-owned voice sink stable while the exact destination and node binding are unchanged. Do not change Team publication, capture/transcription sequencing or generic cancellation APIs.

## Artifact Basis And Status
- Package `voice-recording-unexpected-stop-analysis`; SR-002; date 2026-10-03; owner `/solution_designer`.
- Design status **Ready / Architecture Design Complete**.
- Requirements **Approved**, REQ/AC/BEH/SCN-001–003; explicit approval **AP-001**, `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/requirements-approval.md`; same behavioral baseline presented under SR-001.
- Requirements `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/requirements-doc.md`; investigation `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/investigation-notes.md`; history `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/solution-revision-record.md`.
- No behavior-defining supplements or Product/UI design package. Original screenshot is evidence, not a new visual specification.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis`, branch codex/voice-recording-unexpected-stop-analysis; base origin/personal at 98d8fb36a632ce0f46136cda20129d1fe1ee0ac8. Finalization target personal, with separate Delivery approval/gates.

## Current-State Read
A normal Team communication replaces the Team view publication ref. Active-context and composer computed wrappers regenerate while their exact context is unchanged. The current voice adapter nevertheless produces a new random key. The button's matching-target watcher correctly cancels the old key, which erroneously represents the still-current recording. Resource cleanup stops tracks without FLUSH/transcription or notification. F-001–005 and the current/pre-merge source probe establish this. Plain rerender does not cause cancellation; exact destination replacement must still do so.

## Task Size And Architectural Risk (Mandatory)
- **task_size: Small.** One existing 20-line production adapter has a bounded identity correction; add focused adapter/component-publication tests within existing web infrastructure and documentation sync later. No new runtime subsystem, route or contract.
- **architectural_risk: Low.** Existing architecture owns the work correctly. Restore the established sink-lifetime invariant locally; preserve existing generation/flush/IPC cancellation and single-capture semantics. No material new/changed external contract, persistence, security, concurrency policy, deployment or ownership boundary. Shared Chat callers are directly inventoried; Project/settings sinks are unchanged. Local memoization is not a new cross-owner coordination/state machine.
- Payload volume: task Markdown/JSON/probe evidence is not architectural scope. Structural delta: one local renderer adapter plus tests; no payload conversion or storage transition.
- Escalation: return Design Impact if changing voice store sequencing/IPC, generic sink contract, Team publication, routing, cross-window/global coordination, persistence or new capture policies becomes necessary. Any intended-behavior expansion requires renewed user approval. Reclassify before changing route.

## Architecture Investigation Evidence
AI-001 verifies isolation/approval; AI-002 adapter/button/store boundaries; AI-003 current caller/Task lifetime and documentation contract; AI-004 node revision/exact context replacement/late-result guards; AI-005 test setup and missing regression. Exact commands and observations reside in the canonical investigation, not a separate technical authority.

## Intended Change
Within `useComposerVoiceTarget`, replace per-computed-evaluation sink allocation with **one private current-destination record per mounted hook invocation**. Keep context reference, captured binding revision and sink together. Use no module-wide registry or shared store cache.
1. Read actual ComposerTarget. Null/read-only invalidates/clears the record and returns null.
2. For an eligible target, read exact context reference and current binding revision. If both match the record, return the **same VoiceTranscriptTarget object and key**; wrapper/mention/draft-owner/presentation changes alone do not allocate a new sink.
3. Otherwise create a new sink/key for this eligible destination lifetime and replace the record. Keep existing opaque key allocation, but perform it only when lifetime changes; separate hook instances must have distinct owned keys.
4. Captured sink.isCurrent checks mount alive, node revision, actual current context, current target not read-only/null, and that its captured lifetime still owns the current record. Clear/replace invalidates old sinks; observed leave-and-return must not revive a previous sink. Use existing context identity semantics, not runId equality or globally unwrapped objects.
5. Retain appendTranscript's draft merge behavior and existing lifecycle teardown hook. The generic button remains responsible for matching-target cancellation on replacement/unmount; the voice store remains responsible for media/generation/IPC sequencing.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved intent/AC | Supported trigger | Current evidence | Target production path/lifecycle |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001/AC-001 | Team communication during composer dictation | F-001–004, SCN-001 | TeamStreamingService → Team view publication → activeWorkspaceTarget → composer wrapper → adapter retains sink → button retains recording owner → store/worklet keeps capture; DS-001 |
| BEH-002 | REQ-002/AC-002 | Real member/context change, node rebind, null/read-only destination or teardown | AI-002–004, SCN-002 | Target/lifecycle invalidation → adapter retires sink → button cancels matching old key → store cleanup settles pending flush/disposes capture → existing currentness guards reject stale IPC; DS-002 |
| BEH-003 | REQ-003/AC-003 | User manually Stops | Store source, SCN-003 | Button toggleRecording(current sink) → store stopRecording → worklet FLUSH/WAV → disposeCapture → Electron transcribeVoiceInput → currentness check → sink appends to exact draft; DS-003 |

## Relevant Supplemental Task Artifacts
AP-001 approval file governs unchanged intended behavior; SR-001 evidence runner/current JSON/pre-merge JSON/empty stderr/source-provenance log support the root cause, not a fixed-code pass. All absolute paths and approval applicability are inventoried in investigation-notes.md and cumulative solution-handoff.md. Historical Projects reports contextualize ownership only; no prior review pass applies to this new correction.

## Task Design Health Assessment (Mandatory)
- Posture **Bug Fix**; current issue **Yes**; root cause **Missing Invariant / Local Implementation Defect**: the correct adapter owner fails to preserve identity for the same actual destination.
- Refactor needed now **No architectural refactor**. Existing owner, public type, button/store boundaries, placement and dependency direction are healthy; a bounded local replacement of the faulty allocation enforces the invariant. No duplicated coordination is being moved.
- Evidence: F-001–004, AI-002–004. Response: local lifetime memoization; remove per-refresh random-key churn, not safety cancellation. No refactor deferred in scope.
- Residual risks: real device/desktop behavior remains separately unverified; exact historical incident uncertain. These do not require broad redesign to correct the reproduced source defect.

## Terminology
**Destination lifetime**: one mounted composer's current eligible exact context under one node binding. **Presentation wrapper**: a derived ComposerTarget object that can regenerate without a destination change. **Sink key**: opaque local owned lifetime identity, not a run ID, device ID or security identifier.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove replaced legacy code paths. Clean-cut removal here is the faulty fresh sink/key creation on every computed reevaluation. Do not retain old/new modes, fallback key generation or duplicated composer implementations. No whole production file becomes obsolete.

## Persisted Data / State Transition Decision
**Not Affected.** Private mounted-hook record and transient recording state only; no serialized models/files/schema/writers change. Preserve current draft merging. No migration, startup admission gate, version ledger or user-data reset; repository migration-conventions check is not triggered because no persisted transformation is designed.

## Data-Flow Spine Inventory / Primary Execution Spine(s)
| ID | Scope | Behavior | Start → meaningful end | Governing owners |
| --- | --- | --- | --- | --- |
| DS-001 | Return/Event | BEH-001 | Team event → view publication → active/composer projection → lifetime adapter → button ownership → uninterrupted store/worklet capture | Team view owns publication; adapter owns sink identity; voice store owns media |
| DS-002 | Primary cancellation | BEH-002 | Selection/node/teardown → destination invalidation → button matching cancellation → store cleanup → disposed media/settled flush/stale-output rejection | Composer lifetime and voice store |
| DS-003 | Primary dictation | BEH-003 | Mic/Stop → button → capture store/worklet → WAV → local Electron transcription → guarded sink append → editable draft | Capture/transcription store; composer owns text destination |

## Spine Narratives (Mandatory)
DS-001 carries legitimate background Team activity into presentation without inventing a new recording owner; the sink stays the same and capture continues. DS-002 retires an obsolete destination, cancels only its matching operation and leaves late delivery harmless. DS-003 carries explicit Stop through existing capture/IPC before appending text once; the correction only stabilizes the destination used by this existing path.

## Spine Actors / Main-Line Nodes / Ownership Map
Team view owns publication; active/composer projections own current displayed target; adapter owns that composer's sink lifetime; button is a thin activation/replacement/teardown boundary; store governs exclusive capture and async generation/flush/IPC; worklet owns audio accumulation/WAV; Electron service owns local transcription; captured context owns unsent draft. No authority moves across these boundaries.

## Thin Entry Facades / Public Wrappers
VoiceInputButton activates store actions and cancels matching target only; it must not infer context/run lifetime or own microphone resources. ComposerTarget is presentation/input authority, not proof that wrapper allocation is a new recording lifetime.

## Removal / Decommission Plan (Mandatory)
Remove unconditional random-key/sink creation per wrapper refresh from the adapter; replace with the current-destination record. Keep replacement/unmount cancellation, generation checks, matching-key guard and manual Stop paths. No files moved/deleted, global state, parallel implementation or compatibility shim.

## Return Or Event Spine(s) / Bounded Local Spines
DS-001 is the relevant event path. Inside the adapter: eligible projection read → compare exact context/binding → reuse or retire/create sink → return sink. Inside the unchanged store, asynchronous startup and FLUSH/IPC settlement retain existing generation/currentness guards; no new scheduler or callback state machine.

## Off-Spine Concerns Around The Spine
| Concern | Spine/owner | Decision/placement risk |
| --- | --- | --- |
| Locale/status banner/device selection/startup watchdog | Store/button, DS-001–003 | Reuse unchanged; don't turn these into identity or cancellation policy |
| Node binding revision | Adapter, DS-002 | Existing store supplies authoritative revision; adapter must not query remote nodes or invent binding state |
| Draft merge | Composer sink, DS-003 | Reuse voiceInputCapture.mergeTranscriptWithDraft; no duplicate merge/Send behavior |

## Ownership Boundaries / Boundary Encapsulation Map
Composer lifetime → VoiceTranscriptTarget; activation/teardown → store actions; store → owned capture/IPC mechanisms. Callers must use toggleRecording/cancelOperationForTarget, not edit isRecording/generation or dispose tracks directly. Adapter must not reach into Team internals to suppress publications, nor look up a new active AgentContext during transcript append.

## Dependency Rules
Adapter may depend on Vue lifecycle, ComposerTarget/VoiceTranscriptTarget types, node binding store and draft-merge helper. Button depends on sink contract and voice store actions. Store must stay destination-neutral. No Team/core/server dependency added to web; no cross-owner cache, new library or API change.

## Interface Boundary Mapping / Check
| Interface | Subject/accepted identity | Responsibility/ambiguity |
| --- | --- | --- |
| useComposerVoiceTarget(getTarget) | Actual ComposerTarget/context + node revision, private lifetime | Adapter; singular/explicit; Low ambiguity once wrapper != lifetime |
| VoiceTranscriptTarget {key,isCurrent,appendTranscript} | Opaque per-owner destination lifetime | Existing unchanged contract; each field has one meaning |
| cancelOperationForTarget(key) | Matching stored sink key | Existing owner-scoped cancellation; unchanged |
| toggleRecording(request) | Existing source + current sink | Existing capture activation/Stop; unchanged |

## Main Domain Subject Naming Check
Existing ComposerTarget, VoiceTranscriptTarget, voiceInputStore names remain natural. Private record may be named currentDestination/currentSink; don't create generic Manager/Support/registry terminology.

## Existing Capability Reuse / Subsystem Allocation
Reuse the existing voiceInput renderer capability and its adapter owner; preserve Team view, node binding, generic button, neutral voice store and capture helper. No new subsystem/module required.

## Draft File Responsibility Mapping
Production candidate: existing adapter handles destination lifetime only. Tests: new colocated adapter lifetime checks; integration case joins actual Team publication, composer projection, adapter, button and store using controlled audio boundaries. Existing store/Project/Chat tests remain their own responsibility, not copied policy.

## Reusable Owned Structures / Shared Model Tightness
Reuse existing VoiceTranscriptTarget; no new public optional fields or parallel identity DTO. Private record {context,bindingRevision,sink} has one meaning per field; context is exact object, binding is local revision, sink is owned object. Single current record, not a cache of every prior context; no extraction needed because it has one owner.

## Final File Responsibility Mapping / Target Folder Mapping
| Action/path | Owner/concern | Must not contain |
| --- | --- | --- |
| Modify autobyteus-web/composables/voiceInput/useComposerVoiceTarget.ts | Existing adapter; stable eligible destination lifetime | Media/IPC/Team publication coordination, global registry, runId-only equality |
| Add composables/voiceInput/__tests__/useComposerVoiceTarget.spec.ts | Colocated actual mounted-hook identity/currentness tests | Fake adapter implementation or fixed expectation without pre-change red |
| Add tests/integration/composer-voice-lifetime.integration.test.ts (or equivalent colocated integration scope) | Actual-publication/cancellation/Stop regression with controlled external audio/IPC | Mocked-away adapter/button/composer publication path or claims of real mic proof |
| Verify stores/__tests__/voiceInputStore.spec.ts and existing Chat/Project/composer tests | Preserved sequencing/caller behavior | Production scope expansion to fix unrelated suite failures |
| Delivery docs sync: docs/electron_packaging.md Capture Startup And Ownership, if needed | Existing ownership docs | New UI/policy guarantees beyond approved requirements |

All non-ticket paths above are under autobyteus-web/. Existing folders are clear adapter/component/integration ownership; no artificial hierarchy or new broad shared folder.

## Applied Patterns / Folder Boundary Check / Derived Layering
Local per-mounted-owner memoization in the existing adapter only. Current UI → sink adapter → capture/IPC structure is retained; folder boundaries remain clear. No additional layer, factory, service or module is useful here.

## Concrete Examples / Shape Guidance
- New wrapper with **same context object + same binding + eligible access** → return the exact same sink/key; recording continues.
- New context object with **same runId string** → new lifetime/key; old sink invalid, matching operation cancelled.
- Observed read-only/null then back to the previous context → a new lifetime, not revival of the retired sink.
- Two mounted owners for the same context → distinct keys; tearing down one must not cancel the other.
Avoid keying only by runId, random key on every repaint, global WeakMap recycling old lifetimes, or deleting the cancellation watcher.

## Backward-Compatibility Rejection Log (Mandatory)
Random-per-refresh fallback, feature flag old/new allocation, global identity map and cancellation suppression are **Rejected**. Clean-cut replacement within existing adapter/contract; no compatibility wrapper or old source-only capture path.

## Change / Refactor Sequence
1. Add durable regression tests that fail on unmodified source; retain original analysis evidence.
2. Implement only the local destination-record correction and currentness eligibility/lifetime checks; remove faulty per-refresh allocation.
3. Run focused adapter/integration/store/caller tests including true replacement and explicit Stop. Escalate any required out-of-scope architecture change.
4. Independent API/E2E validation owns executable coverage/browser or isolated-product checks per TESTING.md; Delivery owns docs sync, integrated checks, explicit user verification and any authorized finalization/release.

## Verification Guidance For Implementation
Required: same-context wrappers retain identical sink/key; repeated actual unrelated Team messages leave recording active; after refresh explicit Stop still works and appends once to existing draft; exact context replacement even same runId, member change, binding revision, null/read-only, unmount all retire appropriate lifetime; separate owners/Project/settings work remain isolated. During deferred startup/FLUSH/IPC, unchanged refresh must not invalidate work and genuine invalidation must retain no-stale-output semantics.
Suggested command after test authoring: `pnpm -C autobyteus-web test:nuxt composables/voiceInput/__tests__/useComposerVoiceTarget.spec.ts tests/integration/composer-voice-lifetime.integration.test.ts stores/__tests__/voiceInputStore.spec.ts composables/projects/__tests__/useProjectTaskDraft.spec.ts components/chat/__tests__/ChatComposer.spec.ts --run`, plus relevant agent-input component tests. Actual runner/file paths may follow test ownership conventions without weakening coverage. Use Vitest .mts config, prepare isolated dependencies as needed; do not modify shared installed dependencies.
The old investigation runner expects the defect and will not automatically serve as a green fixed-code test; don't overwrite its historical JSON. Capture new honest red-to-green results in implementation/validation evidence.

## Key Tradeoffs / Risks
Cache only the current eligible lifetime: tiny bounded memory and clear invalidation instead of runId/global reuse. Shared Chat usage benefits from the same correction, but genuine replacement must stay observable. Preserving button/store APIs minimizes blast radius. Real microphone/permissions/model/device paths remain outside the controlled reproduction; validation must report them accurately.

## Guidance For Implementation
No production code is changed by this package. Build the approved design in this same isolated worktree; preserve existing probe/history/approval artifacts. Do not bypass validation or claim desktop reproduction/fix from simulated audio alone. If shell behavior/full user journey is tested, use a worktree-built isolated app; never user's running AutoByteus/data. Release/finalization requires Delivery's gates, not this approval alone.
