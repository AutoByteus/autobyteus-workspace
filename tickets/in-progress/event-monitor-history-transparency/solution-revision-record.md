# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Initial solution baseline from user analysis request | N/A | `Initial Baseline` | Requirements and investigation are design-ready proposals; UX supplement is proposed; locked design and architecture handoff await user approval |
| SR-002 | User requested investigation of intended Activity/Event Monitor distinction; 2026-08-20 current-code refresh | N/A | `Investigation Refinement` | Surface responsibilities and per-runtime instruction/request truth boundaries are now evidence-backed; approval still pending |
| SR-003 | User prioritized system prompts and clarified that Activity must remain extensible for future activity/log kinds | N/A | `Scope And Structure Refinement` | Current scope is prompt-first and trajectory-ready: one new visible kind on a reusable typed Activity foundation; broader kinds and archive work are deferred |
| SR-004 | User asked whether Activity should remain event-based and provider-neutral | N/A | `Architecture-Basis Refinement` | Confirmed Activity should remain a provider-neutral event-fed projection, not a raw provider-event feed; instruction capture extends the existing adapter-to-semantic-event seam |
| SR-005 | User proposed raw-trace persistence as the source for post-restart system-instruction Activity | N/A | `Persistence-Basis Refinement` | Raw trace is the proposed durable authority, with bounded retained discovery required because current restart hydration reads only active traces and the latest 100 replay events |
| SR-006 | User challenged proposed `snapshot_id` and `fidelity` metadata as potentially redundant | N/A | `Schema Simplification` | Removed both as required fields: the existing raw-trace ID identifies the record, while runtime/boundary labels convey the observable truth scope |
| SR-007 | User requested a code-backed audit of every proposed attribute and challenged `instruction_boundary` | N/A | `Field-Level Schema Correction` | Reduced the persisted record to five run-scoped fields, removed runtime/boundary/turn/provider metadata, and renamed the canonical fact to `SYSTEM_INSTRUCTIONS_SUPPLIED` |
| SR-008 | Native provider-serialization and live/reload identity audit | N/A | `Truth-Boundary Correction` | Pinned Native to the configured processed prompt, required one raw-trace ID across live/reload, and defined consecutive active-version folding |
| SR-009 | User asked where the semantic event is persisted | N/A | `Persistence-Boundary Clarification` | Pinned the active/archived JSONL lifecycle and made the raw row the only durable authority |
| SR-010 | User requested one current/future Activity/raw-trace/restart model | N/A | `Architecture-Basis Consolidation` | Documented Activity as a typed event-fed projection with live and raw-trace-derived reload inputs |
| SR-011 | User explicitly accepted disappearance after trimming/compaction/rotation | N/A | `Scope Simplification` | Removed retained lookup, archive scan, pinning, and placeholders; active-only bounded visibility is authoritative |
| SR-012 | User approved the prompt-first exact-field basis and instructed the solution to continue; architecture design round | N/A | `Approved Design Baseline` | Requirements and supplements are approved; current-state architecture was completed and the actionable design spec is ready for architecture review |
| SR-013 | `code_reviewer`; `code-review-report.md`; Implementation Review Round 1 / CRR-001 | CR-F-001, MP-CR-001 | `Design Impact` | Superseded by SR-014: this round accepted an unsupported retry premise and must not be used as current authority |
| SR-014 | User convention challenge; solution-designer reachability audit after CRR-001 | CR-F-001, MP-CR-001 | `Reachability Correction` | MP-CR-001 is Not Reachable; restore SR-012 first-capture design and retain only CR-F-002/003 as implementation fixes |
| SR-015 | User requested full design audit against data-migration conventions and README | N/A | `Convention Conformance Audit` | Pass: additive forward-only current model, Directly Usable — No Migration, bounded existing-migration caller rename, and no speculative recovery |

## Revision Entries

### SR-001 — Initial bounded-history and execution-transparency baseline

- **Triggering role, report path, and round:** `solution_designer`; initial investigation round; no prior report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** `N/A`.
- **Current authoritative result:** Requirements and investigation package prepared as an approval-pending baseline.
- **Why this baseline or revision entry is recorded:** The request exposes two related but distinct product needs: deliberate access to older conversation history and a more truthful agent-execution Activity surface. The repository investigation confirmed that both require explicit boundaries rather than simply raising a UI limit.
- **Resolution:** Preserve the existing bounded latest Event Monitor and active-trace paging; recommend an explicit bounded archive/history path; recommend a typed provider-neutral Activity transparency timeline with summary-first sensitive detail and no new chain-of-thought exposure.
- **Approved behavior or requirement IDs affected:** None approved yet. Proposed IDs are BEH-001–BEH-010 and REQ-001–REQ-010.
- **Canonical artifacts and sections updated:** `requirements.md` (all sections); `investigation-notes.md` (all sections).
- **Supplemental artifacts updated, added, or removed:** Added `activity-transparency-ux-spec.md` as an intended-behavior supplement.
- **Downstream and architecture-review impact:** No downstream handoff yet. After approval, produce `design-spec.md`, then send the cumulative package and this revision record to `architecture_reviewer`.
- **Next recipient or routing:** User for approval of the requirements basis and UX supplement; then `solution_designer` design production.
- **Remaining gaps or risks:** Archive surface placement, definition of “sent,” prompt detail/retention/redaction, storage-level paging, provider-managed context fidelity, and dependency setup for executable tests.

### SR-002 — Activity trajectory and runtime truth-boundary refinement

- **Triggering role, report path, and round:** `solution_designer`; user-requested investigation refresh on 2026-08-20; no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-001 proposed a typed execution-transparency Activity timeline but left the Activity/Event Monitor overlap and cross-runtime system-prompt meaning too abstract.
- **Current authoritative result:** Event Monitor is defined as the bounded readable interaction/result chronology; Activity is defined as the structured agent-execution trajectory. Intentional user/tool overlap uses different density and ownership. Native, Claude, and Codex instruction/request boundaries are recorded precisely without claiming provider-complete prompt fidelity.
- **Why this revision is recorded:** The user explicitly asked for investigation before accepting a conceptual answer and clarified that the central problem is the responsibility split between Activity and Event Monitor.
- **Resolution:** Refreshed the isolated worktree to current `origin/personal`, re-read the frontend projections, prompt composers, runtime request boundaries, event contracts, raw-trace schema, and a representative current trace corpus; aligned requirements and the UX supplement with the evidence.
- **Approved behavior or requirement IDs affected:** No behavior is approved yet. Proposed BEH-004–BEH-009, REQ-004/005/008, and AC-004/005 were refined.
- **Canonical artifacts and sections updated:** `requirements.md` (goal, behaviors, findings, recommendations, requirements/criteria); `investigation-notes.md` (bootstrap refresh, source log, runtime evidence, interpretation); `activity-transparency-ux-spec.md` (surface ownership and runtime truth labels).
- **Supplemental artifacts updated, added, or removed:** Updated `activity-transparency-ux-spec.md`; none added or removed.
- **Downstream and architecture-review impact:** No architecture handoff yet. The refined behavior basis still requires user approval before `design-spec.md` is produced.
- **Next recipient or routing:** User for review/approval of the refined product boundary and detail policy.
- **Remaining gaps or risks:** Archive surface placement, full-detail retention/redaction, Activity grouping/filter density, storage-level paging, provider-managed context opacity, and downstream runtime setup.

### SR-003 — Prompt-first delivery on an extensible trajectory foundation

- **Triggering role, report path, and round:** `solution_designer`; direct user
  clarification on 2026-08-20; no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-002 defined the broader Activity trajectory
  and Event Monitor distinction but still carried user-input, request/context,
  response-status, and archive concepts near the active proposal.
- **Current authoritative result:** The only new visible Activity kind in this
  slice is system instructions. It must be implemented as a first-class variant
  of a reusable typed trajectory contract shared with tool and compaction
  activity, not as a fixed prompt header, generic JSON event, or parallel feed.
- **Why this revision is recorded:** The user stated that system-prompt
  visibility is the immediate necessity while also clarifying that Activity must
  be structurally ready for additional logs/activity kinds later.
- **Resolution:** Reframed `requirements.md` around REQ-SP-001–REQ-SP-007 and
  AC-SP-001–AC-SP-009; added the governing prompt-first UI supplement; marked
  the broader Activity/Event Monitor supplement as deferred context; retained
  truthful native/Claude/Codex capture boundaries and historical honesty.
- **Approved behavior or requirement IDs affected:** Prompt-first priority and
  extensible-trajectory intent are confirmed; final proposed behavior and
  presentation remain approval-pending. Added BEH-SP-008, REQ-SP-007, and
  AC-SP-009.
- **Canonical artifacts and sections updated:** `requirements.md` (status, goal,
  behavior table, design health, requirements, criteria, scope, approval);
  `investigation-notes.md` (status, request refinement, supplement inventory,
  source synthesis, Activity finding, risks).
- **Supplemental artifacts updated, added, or removed:** Added
  `system-prompt-activity-ux-spec.md` as the governing supplement; changed
  `activity-transparency-ux-spec.md` to deferred context.
- **Downstream and architecture-review impact:** No architecture handoff yet.
  After user approval, the design must specify the common trajectory envelope,
  provider-boundary capture adapters, additive persistence/projection, API
  variants, and specialized desktop/mobile rendering.
- **Next recipient or routing:** User for requirements and UI-behavior approval;
  then `solution_designer` for design production.
- **Remaining gaps or risks:** Exact disclosure presentation approval, sensitive
  prompt authorization/redaction, multiple captured versions, persistent
  reachability outside the recent cap, and downstream runtime/coverage setup.

### SR-004 — Provider-neutral event-fed Activity basis

- **Triggering role, report path, and round:** `solution_designer`; direct user
  architecture question on 2026-08-20; no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-003 required a typed trajectory contract but
  did not explicitly state whether provider events, canonical events, or UI
  entries owned the Activity boundary.
- **Current authoritative result:** Activity remains event-based in the sense
  that canonical semantic events drive it, but its UI is a provider-neutral
  projection—not a raw event dump. Provider adapters own native protocol parsing;
  Activity owns stable typed entries.
- **Why this revision is recorded:** The user correctly identified provider
  independence as the key extensibility boundary and asked for confirmation of
  the current and desired event flow.
- **Resolution:** Traced current runtime converters, `AgentRunEventType`, live
  frontend projection, historical replay projection, and Activity store. Added
  REQ-SP-008 and AC-SP-010 requiring all three instruction boundaries to emit
  one semantic `system_instructions_dispatched` event/record and converge on one
  Activity entry.
- **Approved behavior or requirement IDs affected:** Final approval remains
  pending. Added BEH-SP-009, REQ-SP-008, and AC-SP-010.
- **Canonical artifacts and sections updated:** `requirements.md` (behavior,
  findings, functional requirements, criteria, scope, coverage);
  `investigation-notes.md` (request context, source log, design evidence,
  event-versus-projection finding).
- **Supplemental artifacts updated, added, or removed:** Updated
  `system-prompt-activity-ux-spec.md` to require one provider-neutral renderer;
  none added or removed.
- **Downstream and architecture-review impact:** The future design must keep
  provider adapters below the canonical event boundary, type the instruction
  event payload, persist semantic evidence, and make live/reload projections
  equivalent without exposing provider protocols to frontend code.
- **Next recipient or routing:** User for approval of the refined requirements
  basis; then `solution_designer` for the complete design spec.
- **Remaining gaps or risks:** Whether instruction detail is inline in the
  durable record or stored by reference, duplicate application/version folding,
  authorization/redaction, and long-run retention.

### SR-005 — Raw-trace authority with retained restart discovery

- **Triggering role, report path, and round:** `solution_designer`; direct user
  persistence question on 2026-08-20; no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-004 required durable semantic evidence but
  left raw trace versus a separate transparency store undecided.
- **Current authoritative result:** A dedicated typed system-instruction
  raw-trace record is the durable audit/replay authority. Because normal run
  projection reads active traces only and selects the latest 100 replay events,
  a retained trace landmark or trace-derived lookup/read model must preserve
  direct restart visibility without scanning the full archive.
- **Why this revision is recorded:** The user correctly connected restart
  Activity hydration to raw traces and requested that instruction Activity use
  the same durable foundation.
- **Resolution:** Re-read the local projection provider, recent-event selection,
  raw-trace schema/writer/accumulator, and replay transformer. Added REQ-SP-009
  and AC-SP-011; specified raw trace as source of truth while distinguishing
  storage durability from default-projection reachability.
- **Approved behavior or requirement IDs affected:** Final approval remains
  pending. Added BEH-SP-010, REQ-SP-009, and AC-SP-011.
- **Canonical artifacts and sections updated:** `requirements.md` (behavior,
  findings, functional requirement, acceptance criterion, scope, persistence,
  coverage); `investigation-notes.md` (request context, source log, design
  evidence, raw-trace restart finding).
- **Supplemental artifacts updated, added, or removed:** Updated
  `system-prompt-activity-ux-spec.md` with restart/rehydration behavior; none
  added or removed.
- **Downstream and architecture-review impact:** The design must add an explicit
  instruction trace schema, capture/persist it from every supported runtime
  boundary, project it live and historically, and define retained discovery
  across active/archive rotation without a full corpus read.
- **Next recipient or routing:** User for approval of raw-trace authority and the
  refined requirements basis; then `solution_designer` for design production.
- **Remaining gaps or risks:** Retained landmark versus trace-derived index,
  run-scoped versus turn-scoped trace identity, duplicate instruction records,
  prompt size/security, corrupt-index recovery, and archive lifecycle updates.

### SR-006 — Remove redundant prompt-record metadata

- **Triggering role, report path, and round:** `solution_designer`; direct user
  schema-complexity challenge on 2026-08-20; no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** Conceptual examples introduced `snapshot_id`
  and `fidelity` as possible instruction-record metadata.
- **Current authoritative result:** Neither is required for the prompt-first
  slice. The existing raw-trace `id` identifies each recorded version. Runtime
  plus instruction boundary supplies the truthful UI scope, including the fact
  that Claude/Codex provider-managed context is not captured.
- **Why this revision is recorded:** Persisting two concepts already represented
  by existing identity and boundary metadata would complicate the schema without
  improving the required behavior.
- **Resolution:** Removed the separate snapshot-identity and fidelity-field
  requirements. Kept exact content, existing trace identity/time, runtime, and
  instruction boundary as the minimal durable information. Redaction metadata
  remains conditional only if an actual redaction policy is later introduced.
- **Approved behavior or requirement IDs affected:** Final approval remains
  pending. Simplified REQ-SP-002, REQ-SP-003, REQ-SP-009, AC-SP-010, and the
  governing UX supplement without adding new requirement IDs.
- **Canonical artifacts and sections updated:** `requirements.md` (truthful
  boundary, durable identity, raw-trace authority, projection equivalence,
  persistence wording); `investigation-notes.md` (truth-label and trace schema
  wording).
- **Supplemental artifacts updated, added, or removed:** Updated
  `system-prompt-activity-ux-spec.md` to remove fidelity-state and second-ID UI
  requirements; none added or removed.
- **Downstream and architecture-review impact:** The design should begin from
  the minimal raw-trace schema and add no deduplication/hash/redaction field
  without a demonstrated invariant that requires it.
- **Next recipient or routing:** User for approval of the simplified persistence
  basis; then `solution_designer` for design production.
- **Remaining gaps or risks:** Only the run/turn scope, retained lookup,
  duplicate-record policy, and security/size handling remain for design.

### SR-007 — Exact minimal instruction-trace field audit

- **Triggering role, report path, and round:** `solution_designer`; direct user
  request for a non-speculative attribute audit on 2026-08-20; no downstream
  report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-006 removed `snapshot_id` and `fidelity`
  but still proposed duplicated `runtime_kind`/`instruction_boundary` metadata,
  used the overbroad word `DISPATCHED`, and had not resolved the current raw
  trace requirement for `turn_id`/`seq` against Codex thread bootstrap.
- **Current authoritative result:** The stored system-instruction record has
  exactly five semantic fields: existing raw-trace `id`, `ts`,
  `trace_type: "system_instruction"`, exact `content`, and
  `source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED"`. It is run-scoped for every
  runtime and stores no `turn_id`, `seq`, `run_id`, `runtime_kind`, boundary,
  snapshot, fidelity, hash, provider ID, correlation, tool, media, or generic
  metadata field.
- **Why this revision is recorded:** The user explicitly rejected speculative
  attributes and required every persisted value to have evidence-backed
  semantics.
- **Resolution:** Audited the raw-trace serializer, discriminated runtime-memory
  inputs, external writer, run metadata, normalized readers, and all three exact
  instruction supply points. Run and runtime are already authoritative outside
  the row; the source is one-to-one with runtime; and Codex proves that a
  provider-neutral instruction record cannot require a turn. Consecutive exact
  duplicates can be folded by direct string comparison without a hash.
- **Approved behavior or requirement IDs affected:** Final approval remains
  pending. Corrected BEH-SP-002–BEH-SP-004, BEH-SP-009, REQ-SP-002,
  REQ-SP-008, REQ-SP-009, AC-SP-010, and AC-SP-011 without adding IDs.
- **Canonical artifacts and sections updated:** `requirements.md` (behavior,
  supplemental inventory, source semantics, provider-neutral event, raw-trace
  fields); `investigation-notes.md` (request context, inventory, source log,
  event and persistence findings).
- **Supplemental artifacts updated, added, or removed:** Added
  `system-instruction-raw-trace-schema.md` as the governing field audit; updated
  `system-prompt-activity-ux-spec.md` to derive source copy from existing run
  runtime and remove persisted boundary semantics.
- **Downstream and architecture-review impact:** The design must introduce a
  run-scoped raw-trace variant instead of fabricating a turn, validate the typed
  canonical event, obtain runtime from run metadata, and keep the five-field
  record discoverable across rotation/restart.
- **Next recipient or routing:** User for approval of the corrected field audit
  and requirements basis; then `solution_designer` for design production.
- **Remaining gaps or risks:** Retained-landmark versus derived-index mechanics,
  exact consecutive-duplicate folding owner, prompt size/security, and browser
  detail loading remain design questions; persisted field semantics are pinned.

### SR-008 — Correct native truth boundary and reuse trace identity live

- **Triggering role, report path, and round:** `solution_designer`; continued
  field-precision investigation requested directly by the user on 2026-08-20;
  no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-007 described Native content as one system-
  role value in the outbound request and gave the live canonical event no
  identity that could equal the persisted Activity identity.
- **Current authoritative result:** The feature records the exact final
  AutoByteus-owned instruction value supplied/configured at each runtime
  handoff. Native content is `currentSystemPrompt` passed to
  `llmInstance.configureSystemPrompt`; it is not described as the complete
  provider-effective request prompt. The live semantic event transports the
  same raw-trace `id` as `trace_id`, so no snapshot/activity ID is added.
- **Why this revision is recorded:** A provider serialization audit proved that
  Native has no single later provider-neutral effective-system-prompt value:
  Anthropic joins all system-role working-context messages, while Gemini uses
  the configured LLM system message and omits those working-context system
  messages from rendered history. A live/reload identity audit also proved that
  Activity requires the persisted record ID on the live path.
- **Resolution:** Corrected the Native capture source and source copy across the
  requirements, investigation notes, UX supplement, and schema supplement;
  added `trace_id` to the conceptual event payload as transport reuse of stored
  `id`; made consecutive identical-version folding mandatory in the proposed
  requirements; and required equal-timestamp readers to preserve raw append/
  segment order rather than treating lexical IDs as causal order.
- **Approved behavior or requirement IDs affected:** Final approval remains
  pending. Corrected BEH-SP-002, REQ-SP-001–REQ-SP-003, REQ-SP-008–REQ-SP-009,
  AC-SP-001, and AC-SP-010 without adding IDs.
- **Canonical artifacts and sections updated:** `requirements.md` (Native truth
  boundary, runtime handoff, version policy, live identity);
  `investigation-notes.md` (request interpretation, source log, behavior path,
  evidence, risks); `solution-revision-record.md` (this entry).
- **Supplemental artifacts updated, added, or removed:** Updated
  `system-prompt-activity-ux-spec.md` and
  `system-instruction-raw-trace-schema.md`; none added or removed.
- **Downstream and architecture-review impact:** The future design must capture
  Native at final prompt configuration rather than claiming a shared provider-
  request boundary, allocate one trace ID before live projection, reuse it on
  persistence/live/reload paths, and preserve source order for equal timestamps.
- **Next recipient or routing:** User for approval of the corrected minimal
  field and truth-boundary proposal; then `solution_designer` for design.
- **Remaining gaps or risks:** Retained-landmark versus derived-index mechanics,
  capture/persistence owner placement, prompt size/security, and browser detail
  loading remain design questions; the proposed persisted row remains exactly
  five fields.

### SR-009 — Pin event persistence location and commit order

- **Triggering role, report path, and round:** `solution_designer`; direct user
  question on 2026-08-20 asking where the event is persisted; no downstream
  report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-008 pinned the raw record and live event
  identity but did not state the physical file lifecycle or whether the event
  envelope itself was another durable log.
- **Current authoritative result:** The event is not implemented or persisted
  today. In the proposal, the only durable representation is a JSONL row in the
  selected run's `raw_traces_active.jsonl`, later eligible to move unchanged to
  a numbered `raw_traces_NNNNNN.jsonl` segment catalogued by
  `raw_traces_manifest.json`. The live event is published after trace commit and
  carries the same trace ID; it is not separately persisted.
- **Why this revision is recorded:** “Event” otherwise ambiguously refers to a
  transient runtime envelope, a WebSocket message, or its durable semantic
  evidence. The user requested the exact storage boundary.
- **Resolution:** Inspected raw-trace file-name constants, run-store append/
  corpus behavior, archive rotation, and manifest layout. Added the physical
  location and persist-before-publish invariant to the governing schema,
  requirements, acceptance criteria, and investigation notes.
- **Approved behavior or requirement IDs affected:** Final approval remains
  pending. Clarified REQ-SP-008 and AC-SP-011 without adding IDs.
- **Canonical artifacts and sections updated:** `requirements.md` (event commit
  invariant and acceptance evidence); `investigation-notes.md` (request context
  and physical-location source evidence); `solution-revision-record.md` (this
  entry).
- **Supplemental artifacts updated, added, or removed:** Updated
  `system-instruction-raw-trace-schema.md`; none added or removed.
- **Downstream and architecture-review impact:** The future design must use a
  single capture/persistence owner that allocates identity, appends the trace,
  and only then emits live notification; it must not introduce a competing
  durable event log.
- **Next recipient or routing:** User for approval of the refined requirements
  basis; then `solution_designer` for design.
- **Remaining gaps or risks:** The exact retained trace-derived lookup mechanics
  and owner placement remain design questions after approval.

### SR-010 — Clarify current and future Activity/raw-trace mental model

- **Triggering role, report path, and round:** `solution_designer`; direct user
  request on 2026-08-20 for a general current/future Activity and restart model;
  no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** The artifacts specified the prompt-first kind
  and persistence schema but distributed the overall live-versus-restart
  Activity flow across multiple sections.
- **Current authoritative result:** Activity is documented as an event-fed,
  typed projection with two inputs: live semantic lifecycle messages and a raw-
  trace-derived run projection on reopen. Raw traces are selected normalized
  replay/audit facts, not an exhaustive untouched provider-event log. Every
  future durable kind must converge through equivalent live and restart
  projection rules.
- **Why this revision is recorded:** The user explicitly asked how current
  display, future event additions, raw-trace storage, and server restart fit
  together as one architecture.
- **Resolution:** Re-read the local projection provider, run projection service,
  frontend live handlers, hydration mapper, Activity store, and desktop/mobile
  renderers. Added the two-path pipeline and future-kind extension checklist to
  the investigation notes without expanding the visible implementation scope.
- **Approved behavior or requirement IDs affected:** No requirement IDs changed;
  final approval remains pending. The clarification supports REQ-SP-007 through
  REQ-SP-009 and AC-SP-009 through AC-SP-011.
- **Canonical artifacts and sections updated:** `investigation-notes.md`
  (request context and event-versus-projection findings);
  `solution-revision-record.md` (this entry).
- **Supplemental artifacts updated, added, or removed:** None.
- **Downstream and architecture-review impact:** The future design must preserve
  a single typed trajectory model across live/reload paths and must not equate
  raw traces with arbitrary provider events or expose raw records directly to
  renderers.
- **Next recipient or routing:** User for approval of the refined prompt-first
  requirements basis; then `solution_designer` for design.
- **Remaining gaps or risks:** The retained instruction lookup and detailed
  subsystem ownership remain design decisions after approval.

### SR-011 — Accept active-only bounded instruction visibility

- **Triggering role, report path, and round:** `solution_designer`; direct user
  scope acceptance on 2026-08-20; no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-005 through SR-010 required or anticipated
  a pinned/retained instruction entry or trace-derived lookup so compaction,
  rotation, and the recent-100 window could not hide it.
- **Current authoritative result:** The system-instruction record is appended to
  `raw_traces_active.jsonl` and displayed as a normal chronological Activity
  row. Existing active-only and bounded recent-window policies apply. Trimming
  or compaction/rotation may remove the row; reopening then performs no archive
  lookup and shows no placeholder or reconstructed prompt.
- **Why this revision is recorded:** The user explicitly stated that visibility
  after compaction is unnecessary and accepted disappearance as the cost of a
  simpler implementation.
- **Resolution:** Removed retained landmark/index, archive scan, pinning, long-
  run reachability, and explicit unavailable-state requirements. Kept durable
  raw-trace recording, immediate live display, active-trace restart hydration,
  exact content, provider-neutral semantics, and the typed trajectory seam.
- **Approved behavior or requirement IDs affected:** Active-only bounded
  retention is approved. Revised BEH-SP-005, BEH-SP-006, BEH-SP-010,
  REQ-SP-003, REQ-SP-004, REQ-SP-009, AC-SP-005, AC-SP-006, and AC-SP-011.
  Final collapsed-card presentation approval remains pending.
- **Canonical artifacts and sections updated:** `requirements.md` (goal,
  behaviors, findings, requirements, criteria, scope, persistence, coverage,
  approval status); `investigation-notes.md` (request decision, source log,
  current/future pipeline, risks); `solution-revision-record.md` (this entry).
- **Supplemental artifacts updated, added, or removed:** Updated
  `system-prompt-activity-ux-spec.md` and
  `system-instruction-raw-trace-schema.md`; none added or removed.
- **Downstream and architecture-review impact:** The design must extend only the
  active raw-trace replay/projection path and existing bounded Activity store;
  it must not add a retained lookup, archive reader, pinned entry, or prompt-
  absence placeholder.
- **Next recipient or routing:** User for final presentation/schema approval;
  then `solution_designer` for the complete design spec.
- **Remaining gaps or risks:** Capture/persistence owner placement, prompt size/
  security, and exact collapsed-card composition remain for design or approval.

### SR-012 — Approved prompt-first design baseline

- **Triggering role, report path, and round:** `solution_designer`; direct user
  approval through the exact-field/active-only clarification sequence followed
  by the explicit instruction to `continue`; initial architecture-design round;
  no downstream report (`N/A`).
- **Triggering finding IDs:** `N/A`.
- **Prior authoritative result:** SR-011 approved active-only bounded visibility
  but still described final presentation and the complete implementation
  structure as pending.
- **Current authoritative result:** The requirements basis is `Design-ready` and
  the prompt UX plus five-field raw-trace schema are approved design inputs. The
  design is complete and the task branch is refreshed to repository commit
  `3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`. The sole upstream delta after
  the architecture code read was unrelated completed-ticket delivery evidence;
  the package is ready for architecture review.
- **Why this revision is recorded:** Moving from approved intent into an
  implementation-ready design required a second current-state read of runtime
  activation/listener order, raw-trace type assumptions, native/external
  compaction behavior, replay/Event Monitor coupling, team contracts, Memory
  Inspector, and the frontend Activity ownership boundary.
- **Resolution:** Designed one strict five-field run-scoped record and one
  provider-neutral live event; post-success capture at each runtime handoff;
  Native/Codex listener-safe one-shot staging; explicit turn-only trace APIs;
  no second persistence; Activity-only replay selection; complete Event Monitor
  exclusion; native physical archive membership; one Activity-owned typed
  contract/presentation boundary; and standalone/team plus desktop/mobile
  parity.
- **Approved behavior or requirement IDs affected:** All BEH-SP-001–BEH-SP-010,
  REQ-SP-001–REQ-SP-009, and AC-SP-001–AC-SP-011. REQ-SP-007 was clarified, not
  expanded, so that common trajectory metadata may be owned by the run-keyed
  feed context or derived presentation rather than duplicated per entry.
- **Canonical artifacts and sections updated:**
  `requirements.md` (status, supplement approval, template-complete scope
  guardrail/coverage, REQ-SP-007/009, approval);
  `investigation-notes.md` (architecture sources, bootstrap commit, design
  health, transition evidence, risks, review focus); `design-spec.md` (initial
  complete design); `solution-revision-record.md` (index and this entry).
- **Supplemental artifacts updated, added, or removed:** Confirmed
  `system-prompt-activity-ux-spec.md` as approved design input and
  `system-instruction-raw-trace-schema.md` as the approved minimal schema.
  `activity-transparency-ux-spec.md` remains deferred context only.
- **Downstream and architecture-review impact:** `architecture_reviewer` should
  verify capture success/cleanup semantics, the listener-safe Native/Codex seam,
  the run-scoped/turn-scoped type split, Event Monitor invariance, native
  compaction archive membership, and team/mobile parity before approving
  implementation.
- **Next recipient or routing:** `/architecture_reviewer` with the cumulative
  solution package.
- **Remaining gaps or risks:** Full prompt sensitivity under existing run
  authorization, whole-file active JSONL read cost, and absence after active
  trimming/rotation are explicit accepted constraints. No unresolved product
  decision blocks architecture review.

### SR-013 — Preserve instruction publication across prepared-run retry

- **Triggering role, report path, and round:** `code_reviewer`;
  `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/code-review-report.md`;
  Implementation Review Round 1 / `CRR-001`, after `ARCH-REV-001` passed the
  SR-012 design and `IR-001` implemented it.
- **Triggering finding IDs:** `CR-F-001`, supported by material-premise witness
  `MP-CR-001`. `CR-F-002` and `CR-F-003` are bounded implementation corrections
  and are not design changes.
- **Prior authoritative result:** `ARCH-REV-001` passed SR-012, but CRR-001
  failed implementation review because the Native/Codex startup-event design
  ended at initial listener binding. It did not govern the repository's
  supported unchanged-prepared activation retry after an aborted private
  candidate had already committed the instruction row.
- **Current authoritative result:** The requirements basis and visible product
  behavior remain approved and unchanged. The target design now owns the full
  candidate-A-abort/candidate-B-retry spine and is ready for architecture
  re-review.
- **Why this revision is recorded:** Under the supported composer send path,
  candidate A can successfully supply/configure instructions and commit row R,
  then fail run-start metadata commit and abort without deleting raw memory.
  Candidate B repeats the real handoff and receives R with `created:false`.
  Treating `created` as publication eligibility loses the only immediate live
  notification even though the retry legitimately accepts first input.
- **Resolution:** Keep the truthful raw row; do not roll it back or add durable
  publication state. `capture.created` means only append versus fold. Every
  successfully prepared private Native/Codex candidate stages
  `capture.trace`, regardless of `created`, in its own one-shot
  `PendingSystemInstructionEvent`. Candidate abort discards only that transient
  pending notification. A later candidate reacquires the same row through the
  normal exact handoff and fold operation, publishes it after candidate
  publication/listener binding and before first backend input, and uses the
  retained raw ID/timestamp. Stable-ID Activity projection upserts one row.
  Claude retains listener-local new-version emission because its capture occurs
  after its listener exists.
- **Approved behavior or requirement IDs affected:** Added `BEH-SP-011` and
  `UC-SP-007`; clarified `REQ-SP-003`, `REQ-SP-008`, `REQ-SP-009`,
  `AC-SP-010`, and `AC-SP-011` only to preserve the already-supported activation
  retry and already-approved immediate Activity outcome. No new product policy,
  UI state, field, archive behavior, or provider scope was introduced.
- **Canonical artifacts and sections updated:** `requirements.md` (status,
  behavior map, scope guardrail, requirements, acceptance criteria, constraints,
  persistence outcome, and coverage tables); `investigation-notes.md` (review
  status, supported production-path evidence, behavior map, design-health
  evidence, and review guidance); `design-spec.md` (DS-011, ownership,
  candidate/local spines, interfaces, file responsibilities, rejection table,
  sequencing, risks, and review evidence); `solution-revision-record.md`
  (index and this entry).
- **Supplemental artifacts updated, added, or removed:** Updated
  `system-instruction-raw-trace-schema.md` to distinguish durable row creation
  from candidate-local notification responsibility and updated
  `system-prompt-activity-ux-spec.md` to require stable-ID retry upsert with no
  duplicate or retry-specific UI. `activity-transparency-ux-spec.md` remains
  deferred context. No supplement was added or removed.
- **Downstream and architecture-review impact:** `architecture_reviewer` must
  verify the complete supported retry witness, the separation between
  persistence mutation and publication eligibility, candidate-local cleanup,
  stable identity, and the rejected rollback/ledger/global-registry options.
  After architecture approval, `implementation_engineer` must implement this
  design correction plus CR-F-002 log redaction/sentinel coverage and CR-F-003
  TypeScript import/check repair, then return the cumulative package to
  `code_reviewer`. API/E2E must not begin before source review passes.
- **Next recipient or routing:** `/architecture_reviewer` with SR-013, the
  complete current solution package, and the triggering implementation/code-
  review artifacts.
- **Remaining gaps or risks:** The accepted risks remain exact-prompt
  sensitivity under the selected-run boundary, whole-file active JSONL read
  cost, and bounded disappearance after trimming/rotation. CR-F-002 and
  CR-F-003 remain implementation-local blockers; no unresolved requirement or
  design decision remains.

### SR-014 — Reject unsupported metadata-failure premise and restore approved first-capture design

- **Triggering role, report path, and round:** `solution_designer`; user-requested
  convention audit after the proposed SR-013 rework; follows `CRR-001` at
  `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/code-review-report.md`
  and the withdrawn SR-013 architecture re-review request.
- **Triggering finding IDs:** Reassessment of `CR-F-001` and its material premise
  `MP-CR-001`. `CR-F-002` and `CR-F-003` remain bounded implementation fixes.
- **Prior authoritative result:** SR-013 incorrectly accepted ordinary composer
  Send plus a hypothetical run-start metadata failure as a complete supported
  production witness and added all-candidate reused-row publication behavior.
- **Current authoritative result:** `MP-CR-001` is `Not Reachable` under the
  repository's mandatory Product-Reachability Gate and normal operating
  conventions. SR-013 is superseded. The approved SR-012 first-capture design is
  restored: Claude emits and Native/Codex stage/publish only a newly created
  instruction version. No retry-specific requirement, design, or coverage is
  authorized.
- **Why this revision is recorded:** The user explicitly directed the solution
  to read the production data-migration conventions. Those conventions assume a
  stable process, writable storage, and normal filesystem behavior and state
  that arbitrary infrastructure failures do not authorize machinery absent an
  independent product/security/operations contract. The shared design
  principles apply the same gate to material design premises generally.
  Composer Send reaches `recordRunStarted`, but it does not itself cause the
  write to fail while the exact original prepared metadata remains readable.
  Existing fallback code and a mocked unit test cannot prove their own
  initiating path.
- **Resolution:** Traced `recordRunStarted` through
  `AgentRunHistoryCatalogService`, `AgentRunMetadataStore`, and
  `atomicWriteJsonFile`; traced prepared-run cancellation and stale cleanup
  guards; and separately classified possible initiators. Normal storage writes
  the target and returns it. Supported cancellation/cleanup cannot mutate the
  prepared state while the command is outstanding. Missing metadata produces a
  missing/indeterminate state. Only arbitrary I/O/process failure, unsupported
  concurrent mutation, or synthetic mocking produced the premise. Remove
  `BEH-SP-011`, `UC-SP-007`, `DS-011`, all-candidate staging, abort/retry
  ownership, retry UI/schema rules, and retry-specific evidence from the current
  design. Preserve the existing defensive activation branch unchanged.
- **Approved behavior or requirement IDs affected:** No approved product behavior
  changes. REQ-SP-001–REQ-SP-009, AC-SP-001–AC-SP-011, UC-SP-001–UC-SP-006,
  and BEH-SP-001–BEH-SP-010 return to their SR-012 meaning. Arbitrary
  infrastructure-recovery behavior is explicitly outside this ticket.
- **Canonical artifacts and sections updated:** `requirements.md` (status,
  findings, scope guardrail, constraints, coverage); `investigation-notes.md`
  (source log, material-premise audit, current status, architecture guidance);
  `design-spec.md` (current state, explicit reachability assessment, behaviors,
  spines, ownership, interfaces, sequencing, risks, implementation evidence);
  `solution-revision-record.md` (index and this entry).
- **Supplemental artifacts updated, added, or removed:** Restored the
  first-capture lifecycle in `system-instruction-raw-trace-schema.md`; removed
  retry-specific presentation/error rules from
  `system-prompt-activity-ux-spec.md`; retained
  `activity-transparency-ux-spec.md` as deferred context only. No supplement was
  added or removed.
- **Downstream and architecture-review impact:** `architecture_reviewer` must
  review the SR-014 reachability classification and confirm that CR-F-001 does
  not require design rework. After approval, `implementation_engineer` should
  keep the approved first-capture behavior and apply only CR-F-002 prompt-safe
  diagnostics plus CR-F-003 `ToolApprovalTarget` import/semantic-check repair,
  then return the cumulative package to `code_reviewer`. Source review should
  correct CR-F-001's classification before API/E2E begins.
- **Next recipient or routing:** `/architecture_reviewer` with SR-014 and the
  cumulative solution, implementation, and review package.
- **Remaining gaps or risks:** Exact-prompt sensitivity, whole-file active JSONL
  reads, and bounded disappearance after trimming/rotation remain accepted
  product constraints. CR-F-002/003 remain implementation-local blockers. No
  unresolved requirement or supported retry-lifecycle design gap remains.

### SR-015 — Audit the complete persisted-data design against production migration conventions

- **Triggering role, report path, and round:** `solution_designer`; direct user
  request to verify the design against the canonical data-migration conventions
  and README after SR-014; no new downstream report.
- **Triggering finding IDs:** `N/A`. This is a convention-conformance audit of
  the complete persisted-data decision, including the already rejected
  `MP-CR-001` premise.
- **Prior authoritative result:** SR-014 correctly classified MP-CR-001 as `Not
  Reachable` and restored the approved first-capture design, but it had not yet
  recorded a checklist-level audit of every applicable migration convention or
  explicitly mapped the existing snapshot-v5 migration caller affected by the
  raw-reader rename.
- **Current authoritative result:** The design passes the canonical convention.
  The transition remains `Directly Usable — No Migration`: released turn rows
  are unchanged current event-log data, absence of a system event is honest
  current meaning, and new observations append one strict current row type.
  Current runtime remains forward-only and adds no version branch, old-file
  fallback, dual read/write, historical prompt reconstruction, or speculative
  recovery machinery.
- **Why this revision is recorded:** The user asked for an actual audit rather
  than another assurance. The audit read the entire canonical convention, the
  server README's production-migration practice, the shared design principles,
  representative persisted data, normal raw readers/writers/rotation,
  run-history normalization, and the existing native snapshot-v5 migration
  caller.
- **Resolution:** Added `data-migration-conventions-audit.md` with applicability,
  supported released source, fixed current target, and a disposition for each
  relevant convention/checklist item. Added three explicit design alignments:
  (1) map the existing snapshot-v5 migration's caller-only rename to
  `listTurnRawTracesOrdered` while forbidding any migration ID/decoder/transform/
  status/cleanup/recovery change; (2) call current replay kinds Event Monitor-
  compatible rather than “legacy”; and (3) require isolated disposable fixtures
  for persisted-data validation, never a live user profile.
- **Approved behavior or requirement IDs affected:** No product behavior or
  acceptance outcome changes. REQ-SP-003, REQ-SP-004, REQ-SP-009 and
  AC-SP-004–AC-SP-006/AC-SP-011 receive additional evidence only.
- **Canonical artifacts and sections updated:** `requirements.md` (status,
  supplement inventory, approval); `investigation-notes.md` (status, supplement
  inventory, source log, transition evidence, constraints, architecture-review
  notes); `design-spec.md` (supplement inventory, transition evidence/rationale,
  current-model terminology, existing-migration file/sequence mapping, and
  isolated validation guidance); `solution-revision-record.md` (index and this
  entry).
- **Supplemental artifacts updated, added, or removed:** Added
  `data-migration-conventions-audit.md` as evidence/context with no product
  behavior authority. No governing product supplement changed.
- **Downstream and architecture-review impact:** `architecture_reviewer` should
  review SR-015 together with SR-014 and confirm both the `Not Reachable`
  classification and the complete `Directly Usable — No Migration`/
  forward-only-runtime audit. Implementation keeps its existing caller-only
  snapshot-v5 migration edit, uses current-subject naming, and validates only
  with disposable fixtures. No new migration or recovery code is authorized.
- **Next recipient or routing:** `/architecture_reviewer` with the updated
  cumulative package and new evidence supplement.
- **Remaining gaps or risks:** Exact prompt sensitivity, whole-file active JSONL
  reads, and accepted disappearance after trimming/rotation remain. CR-F-002/003
  remain implementation-local blockers. The convention audit found no
  requirement or architecture violation.
