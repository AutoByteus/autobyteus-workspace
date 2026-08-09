# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial investigation baseline | N/A | `Initial Baseline` | Draft requirements and investigation establish the observed non-settling `generate_image` call, its lifecycle symptom, and the candidate bounded media-operation direction. |
| SR-002 | User clarification after initial investigation | User requirement clarification: recoverable errors must never permanently kill an agent run | `Requirement Gap` | Requirements now make recoverability a non-negotiable runtime invariant, including live timeout and restart-orphan reconciliation. |
| SR-003 | User clarification of agent lifetime semantics | User requirement clarification: the logical agent must remain continuation-capable for its lifetime; workers/tools/turns are disposable | `Requirement Gap` | Requirements now elevate lifetime-oriented recoverability to a general agent-runtime invariant, with the image path as the immediate enforcement case. |
| SR-004 | User approval of synthetic missing-result recovery rule | Explicit approval: missing tool result must become a synthetic tool error | `Initial Baseline` | Requirements are now Design-ready and approved; the design must complete the tool protocol with a truthful synthetic error before allowing continuation. |
| SR-005 | User clarification that missing-result cause may remain unknown | Cause-independent repair required for every unmatched persisted native call | `Requirement Gap` | Requirements now require one-to-one, idempotent synthetic tool-error repair without diagnosing the original cause; the captured image call is the first instance. |
| SR-006 | Solution designer design pass after approved requirements | REQ-001..REQ-009; AC-001..AC-009; BEH-001..BEH-005 | `Initial Baseline` | Design specifies live terminalization, cause-independent persisted orphan repair, repair-before-validation bootstrap, media signal propagation, and continuation-capable agent lifecycle. |
| SR-007 | `architecture_reviewer` `design-review-report.md`, Round 1 FAIL / Design Impact; plus Bible Study trace probe | ARCH-DES-001..ARCH-DES-004; BEH-001..BEH-005 | `Design Impact` | Design now specifies an actionable timeout policy, raw-trace-first convergent persistence, lease-gated media publication, and concrete recoverable lifecycle transitions. The Bible probe confirms ordinary `edit_file` errors already have terminal results and does not identify a second missing-result cause. |
| SR-008 | `architecture_reviewer` Round 2 FAIL / Design Impact (`ARCH-DES-005`) | ARCH-DES-005; BEH-001, BEH-005 | `Design Impact` | Reconciled the mandatory persisted-data section and final lifecycle mappings with the raw-first/no-transaction/compound-identity protocol and made recovered event/status/turn/worker owners explicit. |
| SR-009 | User clarification of unrelated execution scope after design discussion | Scope expansion later superseded; revised REQ-001/AC-001..AC-007 | `Requirement Gap` / `Design Impact` | Removed the universal five-minute tool timeout; unrelated execution behavior remains outside this ticket. |
| SR-010 | `architecture_reviewer` Round 3 FAIL / Requirement Gap + Design Impact | ARCH-REQ-001; prior scope-expansion finding; BEH-003; REQ-001; AC-001, AC-007 | `Requirement Gap` / `Design Impact` | Made synchronous `generate_image` a mandatory bounded media capability with an explicit owner/default/range; the additional execution-lifecycle material is superseded by SR-011. |
| SR-011 | User scope correction after architecture review | Supersedes the unrequested execution-lifecycle expansion | `Scope Correction` | Removed unrelated execution-lifecycle requirements and design material. The focused ticket retains only the mandatory media bound, cancellation/late-publication safety, terminal-result repair, and continuation-capable recovery; it does not add a universal runtime timeout. |
| SR-012 | `architecture_reviewer` Round 5 focused review | ARCH-DES-009; stale scope wording | `Design Impact` | Removed the remaining stale approval, behavior, rationale, example, and policy wording so the canonical package states only the focused media/recovery fix and the no-universal-timeout constraint. |

## Revision Entries

### SR-001 — Initial bounded-media failure baseline

- Triggering role, report path, and round: Solution designer; user report and initial source/trace/log investigation; Round 1.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: The captured Article Writing Team run stops after a pending `generate_image` invocation with no terminal result; the likely defect is an absent bounded-completion invariant at the server-owned media boundary, compounded by dropped cancellation propagation.
- Why this baseline or revision entry is recorded: Every completed solution handoff must preserve a durable initial baseline, and downstream agents must not infer prior findings from missing records.
- Resolution: Create Draft requirements and investigation notes. Gate design lock and architecture handoff on explicit user approval of scope/requirements.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-004; REQ-001 through REQ-007; AC-001 through AC-007.
- Canonical artifacts and sections updated: `requirements.md` (all sections); `investigation-notes.md` (all sections).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review should inspect the eventual design for provider cancellation, timeout settlement, late completion/artifact safety, and follow-up message usability.
- Next recipient or routing: User for explicit requirements approval; then solution designer design pass and `architecture_reviewer`.
- Remaining gaps or risks: Timeout ownership/value, provider SDK signal support, transfer cancellation, cleanup settlement, and image-only versus shared media scope remain open until design.

### SR-002 — Non-negotiable agent recoverability

- Triggering role, report path, and round: User clarification; Round 1 requirements refinement.
- Triggering finding IDs: BEH-002, REQ-004, AC-003, AC-007.
- Prior authoritative result: The initial baseline treated follow-up usability as a desired bounded-failure outcome but did not state that permanent agent poisoning is prohibited.
- Current authoritative result: Recoverable tool/provider/runtime errors MUST be contained as tool/turn failures; an otherwise valid agent run MUST be returned to idle/ready and accept continuation. Restart-orphaned pending calls require explicit reconciliation.
- Why this baseline or revision entry is recorded: The user clarified that an agent becoming permanently unusable is unacceptable and that recovery is a product invariant, not an optional enhancement.
- Resolution: Strengthen the behavior, functional requirement, acceptance criteria, constraints, investigation findings, and architecture-review guidance in place.
- Approved behavior or requirement IDs affected: BEH-002; REQ-003, REQ-004; AC-003, AC-007.
- Canonical artifacts and sections updated: `requirements.md` current/desired behavior, functional requirements, acceptance criteria; `investigation-notes.md` request context, source log, constraints, reviewer notes.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: The design must include both live bounded failure and startup/message-time reconciliation; a design that leaves the run in terminal Error after a recoverable failure is unacceptable.
- Next recipient or routing: User for requirements approval, then design production and architecture review.
- Remaining gaps or risks: The exact recovery mechanism, timeout policy, and handling of late provider completions remain to be designed and tested.

### SR-003 — Lifetime-oriented logical agent invariant

- Triggering role, report path, and round: User clarification after requirements refinement; Round 1.
- Triggering finding IDs: BEH-005, REQ-008, AC-008.
- Prior authoritative result: Requirements prohibited permanent poisoning from the media failure but framed the work primarily as bounded media recovery.
- Current authoritative result: The product invariant is broader: the durable logical agent must remain continuation-capable for its lifetime; tools, provider calls, workers, and turns are disposable execution units. Recoverable failures must be isolated, reconciled, and followed by a ready state.
- Why this baseline or revision entry is recorded: The user clarified that an agent becoming unusable is fundamentally unacceptable, not merely undesirable for this image bug.
- Resolution: Expand scope classification to Large and add a general logical-agent lifetime behavior, requirement, and acceptance criterion while retaining the media timeout/recovery path as the immediate concrete change.
- Approved behavior or requirement IDs affected: BEH-005; REQ-008; AC-008; scope and design-health sections.
- Canonical artifacts and sections updated: `requirements.md` goal, behavior map, requirements, acceptance criteria, coverage; `investigation-notes.md` scope, request context, behavior map, constraints, reviewer notes.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture must evaluate whether the implementation should introduce/reuse a runtime recovery supervisor or reconciliation boundary, and must reject an image-only fix that leaves the general failure-containment invariant undefined.
- Next recipient or routing: User for explicit requirements approval, then architecture-level design production and review.
- Remaining gaps or risks: The boundary between recoverable runtime faults and genuinely unrecoverable external state, plus the rollout scope for auditing existing tools, remains to be defined.

### SR-005 — Cause-independent orphan repair

- Triggering role, report path, and round: User clarification after synthetic-error approval; Round 1.
- Triggering finding IDs: BEH-001, BEH-002, REQ-003, REQ-009, AC-009.
- Prior authoritative result: The design basis required synthetic recovery for the captured missing `generate_image` result but left the original missing-result cause as an open diagnostic question.
- Current authoritative result: The cause may remain unknown. For every persisted native tool call without a matching result, recovery MUST insert exactly one matching synthetic tool-error result, preserve call identity/arguments, persist an idempotent terminal repair, and allow continuation.
- Why this baseline or revision entry is recorded: The user explicitly accepted cause-independent repair as the minimum safe strategy for the current case and future similar cases.
- Resolution: Add a cause-independent orphan-repair requirement and acceptance criterion; retain root-cause diagnosis as valuable but non-blocking.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002; REQ-003, REQ-009; AC-009.
- Canonical artifacts and sections updated: `requirements.md` REQ-009, AC-009, coverage; `investigation-notes.md` primary questions, source log, open risks, reviewer notes.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Design must define matching by `(turnId, toolCallId)`, one-to-one repair, durable terminal-result recording, duplicate suppression, and continuation after repair. Root-cause diagnosis remains observational only.
- Next recipient or routing: Solution designer design pass, then architecture review.
- Remaining gaps or risks: Late execution after repair, strict snapshot validation order, and current persisted-state compatibility still require concrete design decisions.

### SR-006 — Approved bounded terminalization and orphan repair design

- Triggering role, report path, and round: Solution designer; approved requirements and architecture design pass; Round 1.
- Triggering finding IDs: BEH-001 through BEH-005; REQ-001 through REQ-009; AC-001 through AC-009.
- Prior authoritative result: Requirements were approved with cause-independent synthetic tool-error recovery as the minimum behavior.
- Current authoritative result: The target design uses a common live `ToolPhase` terminalizer/guard, canonical memory-owned synthetic error results keyed by `(turnId, toolCallId)`, repair-before-strict-validation snapshot bootstrap, recoverable ready/idle lifecycle, and media/provider signal propagation.
- Why this baseline or revision entry is recorded: The mandatory design spec is now produced and aligned with the approved requirements and investigation evidence before architecture review.
- Resolution: Create the design spec with explicit spines, owners, boundaries, removal plan, persisted-state decision, sequencing, and test guidance.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-005; REQ-001 through REQ-009; AC-001 through AC-009.
- Canonical artifacts and sections updated: `design-spec.md` all sections; `requirements.md` approved persisted-state outcome; `investigation-notes.md` evidence and open-cause framing.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review must validate common terminalizer ownership, strict post-repair validation, idempotent raw-trace writes, late-provider side effects, and the recoverable status contract.
- Next recipient or routing: `architecture_reviewer` for design readiness decision.
- Remaining gaps or risks: Exact timeout configuration owner/default, SDK signal signatures, atomicity of dual raw-trace/snapshot persistence, and scope of the global recoverable-error status audit require reviewer/implementation decisions.

### SR-007 — Architecture-impact rework and Bible Study corroboration

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/design-review-report.md`; Round 1 architecture review, FAIL / Design Impact. Additional evidence: `bible-study-trace-probe.md`.
- Triggering finding IDs: ARCH-DES-001, ARCH-DES-002, ARCH-DES-003, ARCH-DES-004.
- Prior authoritative result: SR-006 design baseline was not actionable enough for implementation because timeout policy, dual-store convergence, late media publication, and recoverable status semantics were underspecified.
- Current authoritative result: The design resolves all four findings with a concrete common timeout policy (`AgentConfig.toolExecutionTimeoutMs`, server key `NATIVE_TOOL_EXECUTION_TIMEOUT_MS`, default `300_000` ms, validated range, precedence, and full invocation scope), raw-trace-first convergent repair, operation-owned staging/lease publication, and explicit recoverable lifecycle events/status transitions.
- Why this revision entry is recorded: Architecture review requires a durable round index, and the new Bible Study evidence materially sharpens the distinction between explicit tool errors and missing terminal results.
- Resolution: Update the design spec, investigation notes, and supplement inventory in place; retain the no-migration decision; route the complete cumulative package back to architecture review after this revision.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-005; REQ-001 through REQ-009; AC-001 through AC-009.
- Canonical artifacts and sections updated: `design-spec.md` Architecture Finding Resolutions, lifecycle matrix, persistence protocol, media publication, sequence, risks, guidance, and supplements; `investigation-notes.md` status, source log, runtime findings, and Bible comparison; `bible-study-trace-probe.md` added as evidence supplement.
- Supplemental artifacts updated, added, or removed: Added `bible-study-trace-probe.md`; architecture review artifacts remain authoritative review records.
- Downstream and architecture-review impact: The next architecture round should verify that the specified policy is implementable in current config/runtime owners, that raw-first persistence recovery is testable without a transaction, that late providers cannot publish, and that recoverable events actually clear active turns and accept follow-up input. The Bible probe does not add a new requirement; it supports generic tool-agnostic repair.
- Next recipient or routing: `architecture_reviewer` for Round 2 design-readiness decision.
- Remaining gaps or risks: Exact SDK method overloads and existing event naming/types remain implementation-level verification items; genuinely unrecoverable storage/corruption boundaries must be tested rather than inferred. The original provider stall phase remains unknown by evidence.

### SR-008 — Canonical artifact consistency rework

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/design-review-report.md`; Round 2 architecture review, FAIL / Design Impact.
- Triggering finding IDs: ARCH-DES-005.
- Prior authoritative result: SR-007 resolved the four substantive design impacts, but stale wording remained in the mandatory persisted-data section and final lifecycle file mapping.
- Current authoritative result: The persisted-data decision now explicitly states raw terminal-result append/flush followed by derived snapshot replacement, no cross-store transaction, raw-result canonical authority, compound `(turnId, toolCallId)` duplicate suppression, and correlation ID as diagnostic only. Lifecycle mappings now explicitly assign recovered events to `agent-events.ts`, turn recovery to `agent-turn-runner.ts`, active-turn clearing/restart to `agent-worker.ts`, and `IDLE` derivation to `status-deriver.ts`.
- Why this revision entry is recorded: Architecture review identified contradictory canonical instructions that could cause implementation to choose obsolete atomic/optional-event behavior.
- Resolution: Remove stale wording, add the ARCH-DES-005 consistency section, update the mandatory persisted-data constraints, replace the optional lifecycle mapping with concrete owners, and revise the cross-store risk wording.
- Approved behavior or requirement IDs affected: BEH-001, BEH-005; REQ-003, REQ-004, REQ-009; AC-003, AC-008, AC-009.
- Canonical artifacts and sections updated: `design-spec.md` ARCH-DES-005, persisted-data decision, final/target file mappings, risks, and implementation guidance; `solution-revision-record.md` this entry.
- Supplemental artifacts updated, added, or removed: None; `bible-study-trace-probe.md` remains accepted evidence-only.
- Downstream and architecture-review impact: Request Round 3 review. If accepted, the package is ready for implementation review routing; no requirements change is needed.
- Next recipient or routing: `architecture_reviewer` for Round 3 design-readiness decision.
- Remaining gaps or risks: Implementation must verify concrete current event/config APIs and test the raw-first crash windows; these are implementation validation items, not unresolved design contradictions.

### SR-009 — Universal-timeout correction

- Triggering role, report path, and round: User clarification during design discussion after the Round 2 architecture review; no new architecture report yet. The clarification is recorded in `investigation-notes.md` and the requirements/design artifacts.
- Triggering finding IDs: material correction to the earlier ARCH-DES-001 timeout design.
- Prior authoritative result: SR-008 design assigned a common five-minute `AgentConfig.toolExecutionTimeoutMs` wall-clock deadline to every native tool invocation.
- Current authoritative result: A universal tool-call timeout is rejected. Bounded provider/transport controls belong to the owning capability; unrelated execution behavior is not redesigned; server/worker interruption uses orphan repair.
- Why this revision entry is recorded: The user identified that a global timeout would break unrelated legitimate work. This is a material approved-behavior clarification, not a minor wording change.
- Resolution: Revise REQ-001 and related scenarios, keep capability-owned media duration, remove generic timeout ownership, and retain cancellation plus restart repair as the recovery mechanisms.
- Approved behavior or requirement IDs affected: BEH-001, BEH-004, BEH-005; REQ-001 through REQ-009; AC-001 through AC-009.
- Canonical artifacts and sections updated: `requirements.md` goal, behavior map, recommendations, use cases, functional requirements, acceptance criteria, coverage, and approval status; `design-spec.md` intended change, ARCH-DES-001/003/004, behavior map, spines, ownership, interfaces, subsystem/file mapping, patterns, sequence, tradeoffs, risks, and guidance; `investigation-notes.md` status, source log, and findings.
- Supplemental artifacts updated, added, or removed: None; the Bible Study probe remains accepted evidence-only.
- Downstream and architecture-review impact: The previous Round 3 review request must be superseded by a new review of the corrected duration model. Architecture must verify that the design still guarantees terminal results after explicit cancellation, provider failure, and restart without imposing a universal deadline.
- Next recipient or routing: User confirmation is recorded through the current clarification; then `architecture_reviewer` for the next architecture round.
- Remaining gaps or risks: Provider-specific transport controls remain implementation validation items; unrelated execution behavior is outside this ticket.

### SR-010 — Mandatory media bound

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/architecture-review-revision-record.md`; Round 3 architecture review, FAIL / Requirement Gap + Design Impact.
- Triggering finding IDs: `ARCH-REQ-001` and the superseded scope-expansion finding.
- Prior authoritative result: SR-009 correctly removed the universal five-minute runtime watchdog, but the package also contained an unrequested execution-lifecycle expansion.
- Current authoritative result: `generate_image` is a synchronous bounded media capability. `MediaGenerationService` MUST enforce `MEDIA_OPERATION_TIMEOUT_MS`, resolved by explicit internal media options -> server setting -> `DEFAULT_MEDIA_OPERATION_TIMEOUT_MS = 300_000` ms, with inclusive validation `10_000..3_600_000` ms, covering provider generation, transfer, and pre-settlement cleanup. This is not a runtime-wide timeout. Unrelated execution behavior remains outside scope.
- Why this revision is recorded: Architecture review confirmed the mandatory media-bound direction; the user then clarified that the additional execution-lifecycle model was not requested.
- Resolution: Keep REQ-001/AC-001 and the design’s media/recovery sections authoritative; remove the unrequested execution-lifecycle material and preserve the no-universal-watchdog decision.
- Approved behavior or requirement IDs affected: BEH-003; REQ-001, REQ-002, REQ-007; AC-001, AC-007.
- Canonical artifacts and sections updated: `requirements.md` functional requirements, acceptance criteria, and risks; `design-spec.md` media/recovery sections and mappings; `investigation-notes.md` status/source log; this revision record.
- Supplemental artifacts updated, added, or removed: None; `bible-study-trace-probe.md` remains evidence-only.
- Downstream and architecture-review impact: Request a focused architecture review. Implementation remains blocked until the reviewer confirms the mandatory media bound and recovery behavior are coherent with the no-universal-timeout requirement.
- Next recipient or routing: `architecture_reviewer` with the cumulative artifact package.
- Remaining gaps or risks: Provider SDK signal support and exact repository integration points remain implementation validation items. A provider that ignores cancellation must still be contained by the media lease/publication gate and late-settlement observer.

### SR-011 — Focused ticket scope correction

- Triggering role, report path, and round: User clarification relayed through `architecture_reviewer` after Round 4; current architecture package review.
- Prior authoritative result: The package had expanded the no-universal-timeout constraint into unrelated execution-lifecycle functionality.
- Current authoritative result: That expansion is not part of this ticket. The authoritative scope is limited to `generate_image` bounded completion, signal propagation, safe media publication, synthetic terminal-result repair, and recoverable agent lifecycle/status behavior.
- Resolution: Remove the unrelated requirements, acceptance criteria, behaviors, design spines, ownership entries, file mappings, tests, and investigation claims. Preserve only the constraint that this fix must not impose a universal runtime watchdog or alter unrelated execution behavior.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-005; REQ-001 through REQ-009; AC-001 through AC-009.
- Canonical artifacts and sections updated: `requirements.md`, `design-spec.md`, `investigation-notes.md`, and this revision record.
- Supplemental artifacts updated, added, or removed: None; `bible-study-trace-probe.md` remains evidence-only.
- Downstream and architecture-review impact: Request a focused architecture review. The prior scope-expansion findings are superseded and must not be implemented.
- Next recipient or routing: `architecture_reviewer` with the focused cumulative package.
- Remaining gaps or risks: Provider-specific cancellation and exact runtime integration points remain implementation validation items; the original missing-result phase remains unknown and is intentionally handled cause-independently.

### SR-012 — Canonical scope wording cleanup

- Triggering role, report path, and round: `architecture_reviewer`; Round 5 focused architecture review, FAIL / Design Impact.
- Triggering finding ID: `ARCH-DES-009`.
- Prior authoritative result: The unrelated scope expansion had been removed structurally, but stale wording in the requirements/design still described it as an approved constraint or rationale.
- Current authoritative result: Canonical requirements/design state only that this ticket must not add a universal runtime watchdog or alter unrelated execution behavior. No unrelated execution feature, contract, or implementation is required.
- Resolution: Remove stale approval wording, behavior references, examples, rationale, and policy language; retain the focused media bound, terminal-result repair, safe publication, and recoverable lifecycle design.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-005; REQ-001 through REQ-009; AC-001 through AC-009.
- Canonical artifacts and sections updated: `requirements.md`, `design-spec.md`, `investigation-notes.md`, and this revision record.
- Supplemental artifacts updated, added, or removed: None; `bible-study-trace-probe.md` remains evidence-only.
- Downstream and architecture-review impact: Request another focused architecture review; implementation remains blocked until approval.
- Next recipient or routing: `architecture_reviewer` with the cumulative focused package.
- Remaining gaps or risks: Provider-specific cancellation and exact runtime integration points remain implementation validation items; the original missing-result phase remains unknown and is intentionally handled cause-independently.

### SR-004 — Approved synthetic tool-error recovery

- Triggering role, report path, and round: User approval after investigation clarification; Round 1.
- Triggering finding IDs: BEH-001, BEH-002, BEH-005; REQ-003, REQ-004, REQ-008; AC-002, AC-003, AC-008.
- Prior authoritative result: Requirements required bounded and recoverable failure but did not yet state the exact protocol repair for a registered call with no result.
- Current authoritative result: A missing tool result MUST be converted into a matching truthful synthetic tool error, such as `generate_image failed: operation did not complete or was interrupted.`, then the stale turn must be settled and the logical agent returned to continuation-capable state.
- Why this baseline or revision entry is recorded: The user explicitly approved this as the minimum acceptable behavior and made the requirements design-ready.
- Resolution: Lock the requirements and proceed to design the runtime boundary, live timeout path, and restart/orphan reconciliation around this invariant.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-005; REQ-003, REQ-004, REQ-008; AC-002, AC-003, AC-008.
- Canonical artifacts and sections updated: `requirements.md` status, REQ-003, AC-008, approval status; `investigation-notes.md` status and reviewer notes.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review must verify that every registered native tool call has a terminal result path and that recovery creates the correct tool-call/tool-result pairing before accepting new user input.
- Next recipient or routing: Solution designer design pass, then `architecture_reviewer`.
- Remaining gaps or risks: Exact ownership of global orphan detection, durable pending-call metadata, late-result suppression, and whether existing trace state can support synthetic results without schema migration.
