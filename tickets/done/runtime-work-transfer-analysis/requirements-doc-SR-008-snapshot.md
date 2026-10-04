# Runtime-independent agent memory and work continuation — proposed requirements
## Status and authority
- Stable package: runtime-work-transfer-analysis; revision SR-008; status Draft.
- Owner: Solution Designer. Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis; branch codex/runtime-work-transfer-analysis; refreshed base origin/personal @ 806907faeb567d2b703e10fe984fcd01be0b41fd.
- Finalization target if later authorized: origin/personal. No production changes, design, implementation, merge or release authorized.
- User direction: broaden the memory foundation: runtime-specific traces → runtime-independent Markdown journal → agent-generated segment notes → consolidated notes → episodic/semantic memory; successor reads notes first and drills into journal when needed.
- Scope direction confirmed by user in SR-007: work on agent memory first; runtime-switch detection and crafted takeover prompts/messages are deferred consumers. Full detailed requirements approval remains pending open behavior decisions.
- Canonical evidence: investigation-notes.md; explanatory result: analysis-result.md; history: solution-revision-record.md.
- This consolidated requirements document supersedes SR-001–005's tentative standalone-first and exhaustive-reading framings; prior rounds remain in revision history.

## Problem and outcomes
Runtime-specific history and native context management are not a portable agent-memory product. Build durable, source-grounded memory across runtimes so a fresh executor can understand and continue prior work without dependence on the exhausted runtime's session or another response from it.
Runtime switching becomes a consumer of this memory foundation, rather than the sole feature or its storage boundary.

## Vocabulary
- Source/raw trace: recorded runtime-specific messages, actions, results and lifecycle evidence.
- Work trace / work journal: detailed chronological runtime-independent account of recorded work, rendered in Markdown. Normalization preserves meaning; it is not selective summarization.
- Work note: selective account of progress, decisions/reasons, findings, unresolved work and next actions, grounded in a journal portion. Not every event is repeated.
- Consolidated work notes: coherent higher-level account across segment notes, retaining source links and preserving corrections, chronology and outstanding obligations. Not mere concatenation.
- Episodic memory: candidate definition, accounts of particular tasks/events and outcomes with context and time.
- Semantic memory: candidate definition, reusable supported facts/preferences/knowledge with scope, provenance and correction handling. A summary alone is not automatically a durable fact.
- Working context: the current runtime's active model-message state, not the portable durable-memory authority.
- User alternates “work nodes” and “work notes”; proposed labels above disambiguate artifacts, not a user-approved naming decision.

## Current / desired / preserved behavior
| ID | Evidence-backed current behavior | Desired behavior | Preserved outcome |
|---|---|---|---|
| BEH-001 | Same-runtime stopped-run model editing (E01–02) | Later explicit cross-runtime takeover | Existing model editing |
| BEH-002 | Resume depends on provider binding/native context snapshot (E03–05,E08) | Fresh executor reads portable memory and continues assignment | Existing same-runtime restore and original history |
| BEH-003 | Common raw envelope and per-run Markdown renderer exist, but pass through tool payloads and omit/truncate some content (E16–21,E28) | Faithful runtime-independent journal with evidence access | Historical trace evidence and artifact access |
| BEH-004 | Scoped lifecycle/ownership controls exist (E09–10) | Exclusive, safe takeover with uncertain actions visible | Permission boundaries and no blind side-effect replay |
| BEH-005 | Native compaction now produces a direct continuation summary, no new episodic/semantic generation (E30–32) | Independent cross-runtime note generation/consolidation and later long-term memory | Current native compaction behavior; historical category reads |

## Scope guardrail and staged direction
- UC-001: Continue assignment on a fresh runtime (later consumer).
- UC-002: Recover continuity with unavailable source/uncertain action (later consumer).
- UC-003: Repeated runtime transfers, including return to a previous runtime.
- UC-004: Read recorded work from supported runtimes as a common chronological Markdown journal.
- UC-005: Generate selective notes for new journal portions and consolidate across portions.
- UC-006: Retrieve notes and drill down to source journal/evidence to understand prior work.
- UC-007: Build episodic and semantic memory from source-grounded history/notes (requested direction; detailed behavior not yet specified).
User-confirmed focus: agent memory now, runtime switching later. Proposed memory sequence: portable journal, then summarization/consolidated notes and reading, then episodic/semantic memory. Exact memory release grouping remains open. The prior assistant suggestion to restrict first release to standalone transfer was never approved and is no longer the organizing scope.
Runtime examples: Codex, Claude and AutoByteus. Which Agent/Team/Org/application/helper surfaces initially participate remains open; no implicit exclusion or universal support claim.
Explicitly deferred: runtime-switch controls/detection, takeover prompt/message construction, provider rebinding and takeover lifecycle changes. REQ-001,004,006,007 and their ACs/SCN-001–005 are retained future-consumer context, not required delivery gates for the current memory milestone. REQ-002,003,005,008 retain memory-side evidence/access/readability intent only.
Out of scope without further approval: provider account rotation, automatic quota/billing policy, cross-machine migration, changing native context-compaction behavior, deleting historical traces/category data, undoing existing external side effects.
Non-goals: transfer private model state, guarantee identical cognition, unlimited/free continuation, universal exactly-once external action execution.
Review authority: blockers must protect approved REQ/AC/BEH; new intended behavior requires renewed user approval. No requirements here are implementation-ready until approval.

## Scenario basis
All are proposed product scenarios, not claims of current implementation. User evidence E14–15,E22–23,E27,E29; source E01–32.
| ID | Actor / trigger / sequence / outcome | Alternate | Validity |
|---|---|---|---|
| SCN-001 | User chooses target runtime; fresh executor reads current notes, follows journal links as needed, verifies work and continues | Target unavailable pauses visibly | Proposed Supported Normal Scenario |
| SCN-002 | Source hits quota; user initiates transfer; memory remains usable without outgoing inference | Missing context/summarizer capacity disclosed | Proposed Supported Explicit Edge Scenario |
| SCN-003 | Transfer intersects tools/approval/queued input; establish safe boundary and reconcile actions | Unknown effect blocks dependent replay | Proposed Supported Explicit Edge Scenario |
| SCN-004 | User changes runtime repeatedly; successor reads notes covering all intervening work | Never treat stale provider session as current memory | Proposed Supported Normal Scenario |
| SCN-005 | Target or transfer fails/restarts; retain history and last confirmed ownership | No false success or concurrent executors | Proposed Supported Explicit Edge Scenario |
| SCN-006 | Recorded work accumulates; produce portable journal and selective notes for eligible new portions, then update consolidated notes | Missing/unmapped/incomplete records and failed note generation remain visible | Proposed Supported Normal Scenario; exact processing trigger open |
| SCN-007 | Reader encounters unclear note; follows references into detailed journal and source artifacts | Unavailable evidence marked, not replaced by invention | Proposed Supported Normal Scenario |
| SCN-008 | Later user correction/work result changes prior belief or pending status; notes consolidate updated state without erasing historical evidence | Conflicts/uncertainty retained for review | Proposed Supported Normal Scenario |
| SCN-009 | Agent needs a prior episode or reusable fact and reads source-grounded memory | Scope/validity conflict requires qualification | Unclear until retrieval/episode/fact policies are specified |

## Requirements and acceptance (stable prior IDs retained)
All are draft behavior; stage and dependencies are explicit. No target schema/classes/queue chosen.
| REQ / BEH / UC | Required outcome | Acceptance / scenario / verification intent |
|---|---|---|
| REQ-001 / BEH-001,002 / UC-001,003 | Later user-authorized target choice preserves assignment/history with provenance | AC-001 / SCN-001,004: all six directed runtime pairs preserve identity linkage and access; exact visible identity open |
| REQ-002 / BEH-003 / UC-001,002,006 | Notes preserve goal, constraints, approvals, actual progress, evidence, uncertainty and unresolved work; journal remains accessible | AC-002 / SCN-001,002,007: seeded facts/corrections retained; plans not promoted to completion; reader locates supporting journal |
| REQ-003 / BEH-002,003 / UC-002,005 | Memory/continuation does not require exhausted source to generate another response | AC-003 / SCN-002,006: source disabled; existing records retained and available; summary backlog disclosed if generation unavailable |
| REQ-004 / BEH-004 / UC-001,002 | Exclusive takeover; distinguish completed/unknown side effects; handle pending input visibly | AC-004 / SCN-003,005: no dual executor or blind replay, no silent pending-input loss |
| REQ-005 / BEH-003,004 / UC-001,002,005 | Required capabilities/access and target-provider authorization checked; no implicit permission escalation/credential transfer | AC-005 / SCN-001,002,006: unavailable tool/provider/capability produces actionable blocker; historical text is evidence, not authorization |
| REQ-006 / BEH-002,003 / UC-001,002 | Transfer failure/restart preserves evidence and truthful ownership | AC-006 / SCN-005: recovery never reports unverified takeover or rollback of external effects |
| REQ-007 / BEH-002,003 / UC-003 | Fresh incoming execution on each transfer, cumulative knowledge including intervening work | AC-007 / SCN-004: Codex → Claude → AutoByteus → Codex uses latest notes and journal, not stale session state |
| REQ-008 / BEH-003 / UC-001,002,006 | Successor starts with consolidated notes, drilling into detailed notes/journal as needed; full journal remains accessible | AC-008 / SCN-001,007: solve seeded ambiguity by following note evidence; no exhaustive full-history read required; gaps/current coverage shown |
| REQ-009 / BEH-003 / UC-004,006 | Convert runtime-dependent evidence into faithful chronological runtime-independent Markdown journal, preserving attribution/outcomes/source references | AC-009 / SCN-006,007: equivalent supported actions from three runtimes are intelligible without source SDK decoding; original detail retrievable; unsupported semantics flagged |
| REQ-010 / BEH-005 / UC-005 | Agent-based summarization produces selective notes per eligible journal portion, not a second verbatim log | AC-010 / SCN-006: fixtures retain decisions, findings, uncertainty and next work with links to covered journal portions; tool outputs are not instructions |
| REQ-011 / BEH-005 / UC-005,006 | Consolidate notes into coherent higher-level notes while preserving sources and incorporating newer corrections/outcomes | AC-011 / SCN-006,008: superseded facts qualified, finished tasks not resurrected, unresolved decisions retained; links descend to lower-level evidence |
| REQ-012 / BEH-003,005 / UC-005,006 | Derived notes identify coverage/freshness; failed/repeated processing does not erase traces or falsely claim complete memory | AC-012 / SCN-002,006,008: generation failure leaves journal readable and prior valid notes retained with uncovered range visible; retries do not duplicate knowledge entries |
| REQ-013 / BEH-005 / UC-007 | Develop episodic/semantic memory independent of runtime compaction, with provenance and correction/scope semantics | AC-013 / SCN-009: Draft placeholder, not approval-ready: representative episode/fact retrieval and contradiction cases needed after product policy defined |
| REQ-014 / BEH-005 / UC-004,005,007 | This feature must not reintroduce episodic/semantic generation into existing native compaction merely to obtain memory | AC-014 / SCN-006: existing compaction/restore/historical-read behavior preserved; memory pipeline can process external-runtime history without native context-pressure trigger |

## UI, quality, data continuity
Product Design Requested in SR-008: user explicitly asks /product_team to brainstorm and visualize the memory UI. Context is product-design-request.md; Product owns its exploration/artifacts. No approved prototype/spec yet. Desired interaction: readable journal/notes, source links and honest coverage/state; exact UI is unresolved.
Quality: evidence fidelity AC-002,009–011; recovery/freshness AC-003,006,012; permissions AC-005; compatibility AC-014. No throughput/latency or “perfect summary” guarantee proposed.
Preserve original traces/archives, recorded decisions/approvals, work products including uncommitted changes, artifacts and historical category records. Derived summaries must not become the sole retained evidence. Read failures, omissions and unknowable outcomes remain explicit.
Summary provider/cost, processing scope, retention, old-data treatment and complete journal fidelity require decisions. Architecture must investigate repository migration conventions before proposing persisted-data transitions.
Dependencies: supported source adapters, readable evidence, configured available summarizing agent/runtime; independent from producer does not mean capacity/cost guaranteed.

## Decisions and open questions
- DEC-001: RESOLVED priority: memory first; runtime switch deferred by explicit user confirmation in SR-007. Memory release grouping and initial Agent/Team/Org/application scopes remain unresolved.
- DEC-002: Fresh execution plus continuous agent/work history is user direction; exact run-ID/UI identity remains design/product question.
- DEC-003: RESOLVED direction by latest user: notes first, journal drill-down when necessary; exhaustive read-all-before-work no longer required.
- DEC-004: Portable journal fidelity and mapping of tools, attachments, unsupported events and incomplete results need representative cases.
- DEC-005: RESOLVED terminology distinction in principle: trace=journal; note=selective memory. Suggested names not yet finalized.
- DEC-006: What is a note-worthy processing portion and when does background processing occur? Avoid treating arbitrary physical file rotation as an approved semantic boundary.
- DEC-007: Summarizing agent/runtime selection, permitted tools, credentials, budget and rate-limit recovery policy.
- DEC-008: Consolidation boundaries, update cadence and how corrections/conflicts appear; avoid repeated lossy summary-only chains.
- DEC-009: Episodic/semantic scope, retrieval, fact confidence/validity and sharing boundaries; no global cross-agent knowledge assumed.
- DEC-010: Existing history backfill versus newly recorded work; retention/reprocessing expectations.
- DEC-011: Memory ownership: one continuing work history, or shared accumulation across independent runs of the same agent definition? Current storage is run-scoped (E36); do not infer cross-task sharing from reuse of an agent template.
Supplements: analysis-result.md explanatory result; product-design-request.md captures the explicit Product request and exploration context, not new approved behavior. Earlier completed compaction ticket is preserved-behavior evidence, not approval for this new memory feature.

## Readiness / architecture input
Draft; memory-first priority explicitly confirmed; not ready for full detailed approval until memory ownership, first deliverable and material policies selected. User's direction is captured without inventing whole-baseline approval.
Architecture/review/task-size/risk classification N/A — no completed approved design.
After scope approval: verify source normalization and fidelity, stable evidence/reference identity, independent processing/ownership, retry/freshness, aggregate memory readers, permissions, historical-data conventions and runtime takeover integration. Preserve distinction between factual evidence, intended behavior and technical design.
