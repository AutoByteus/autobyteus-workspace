# Runtime-independent agent memory — Step 1A: raw-trace compaction rotation; Step 1B: Work Journal (proposed requirements)

## Status and authority
- Stable package: runtime-work-transfer-analysis; revision SR-011; status **Draft**. Step 1A was added in SR-011 and needs the remaining runtime experiments; Step 1B was Ready for Approval in SR-010 and is unchanged except DEC-014.
- SR-011 user direction (E52): fix each runtime's compaction rotation first (Step 1A), then build the Work Journal (Step 1B). Runtimes without rotation may keep one large raw-trace file for now. Investigate by experiment, one runtime at a time.

## Step 1A — raw-trace compaction rotation correctness (current work)
Problem: rotation is driven by compaction, and it is wrong or missing per runtime. Claude never rotates and records one compaction as 2–4 (E53–E56). Codex has unpaired start/complete markers to verify. Antigravity and Grok compact internally, but AutoByteus does not observe it (E51).
| REQ | Required outcome | Acceptance / verification |
|---|---|---|
| REQ-022 | Each provider compaction that AutoByteus can observe produces exactly one compaction boundary in raw traces, and the active raw traces rotate into an archive segment at that boundary. | AC-022: per runtime, a live manual compaction (and an auto compaction where it can be induced) yields one boundary marker and one new archive segment; real-shape frames are covered by tests, not only pre-classified events. |
| REQ-023 | One compaction operation is one start plus one completion or failure, regardless of repeated progress signals. The event monitor shows it once. | AC-023: replaying Claude's 30 s repeated `status:"compacting"` frames produces one in-progress compaction, not several. |
| REQ-024 | Record compaction metadata when the provider supplies it: trigger (manual/auto), tokens before/after, duration and result. | AC-024: Claude markers carry trigger, pre_tokens and post_tokens from compact_metadata. |
| REQ-025 | A failed or interrupted compaction is recorded as failed, does not rotate, and does not leave a lingering "compacting" state. | AC-025: Claude `compact_result:"failed"` (or an interrupted turn) closes the operation as failed, with no archive segment. |
| REQ-026 | Runtimes whose compaction is not observable keep one active raw-trace file (accepted for now). Detection is added only where the provider exposes a reliable signal, as established by experiment. | AC-026: Antigravity and Grok experiment results are recorded; either detection with AC-022–025 or explicit "not observable" with no false markers. |
Proposed defaults: DEC-018, existing raw traces are not rewritten retroactively (old Claude runs stay one file). DEC-019, experiment order Claude (done, E53–E56) → Codex verification → Antigravity → Grok; AutoByteus native compaction is already rotating and is regression-checked only.

## Step 1B — Work Journal (follows Step 1A)
- Owner: Solution Designer. Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis; branch codex/runtime-work-transfer-analysis; base origin/personal @ 806907faeb567d2b703e10fe984fcd01be0b41fd (77 commits behind; memory paths essentially unchanged, E39 — refresh before design).
- Finalization target if later authorized: origin/personal. No design, implementation, merge or release authorized.
- User decisions so far:
  - SR-007: agent memory first; runtime switching is a later consumer.
  - SR-006: successors read notes first and drill into the journal when needed.
  - SR-010 (E43): two steps. **Step 1 = Work Journal** (current deliverable). **Step 2 = work notes**: one summary per journal file, then combined work notes.
  - SR-010 (E44): the name is **Work Journal**; the Step 2 artifact is **work notes**.
- Not yet approved: the detailed Step 1 behavior below, including the proposed defaults in "Decisions".
- Canonical evidence: investigation-notes.md (E01–E49). History: solution-revision-record.md. Explanatory result: analysis-result.md. Prior consolidated text (SR-008) is preserved in revision history.

## Problem and outcome
Raw traces are recorded in each runtime's own vocabulary and shape. The existing work-trace export passes those names through and silently drops or mislabels several kinds of events (E28, E41, E46, E47). So no runtime-independent record of an agent's work exists that a different agent could read, or that Step 2 could summarize file by file.
Step 1 outcome: every supported run has a **Work Journal**. It is a faithful, chronological, runtime-independent Markdown record of the recorded work, split into stable files that Step 2 can summarize one at a time.

## Vocabulary
- **Raw trace**: runtime-specific recorded messages, tool calls/results and lifecycle events. Remains the authoritative source.
- **Work Journal**: the runtime-independent, chronological Markdown rendering of raw traces. Normalizes names and shapes but does not summarize or select. Replaces the concept and name "work trace".
- **Journal file**: one bounded portion of a Work Journal. **Closed** files no longer change; the single **open** file covers the latest work.
- **Work notes** (Step 2): selective summaries written from journal files, then combined. Not part of Step 1.
- **Working context**: a runtime's active model context. Not the journal.

## Current / desired / preserved behavior
| ID | Current (evidence) | Desired (Step 1) | Preserved |
|---|---|---|---|
| BEH-003 | Common raw envelope; per-run Markdown export passes runtime tool names through, drops some events, labels teammates as "user", truncates without pointers (E16–21, E28, E41, E45–47) | Faithful runtime-independent Work Journal with source links | Raw traces and archives unchanged; history display unaffected |
| BEH-006 | Journal-like files exist only when generated on demand by skill improvement; all files rewritten each time (E48) | Journal kept current as the run progresses; closed files stable | Skill improvement still receives its rendered history |
| BEH-007 | File boundaries = compaction segments only; Antigravity/Grok never close a file (E45) | Journal-owned file boundaries that work for every runtime | Raw-trace archive segmentation unchanged |
| BEH-005 | Native compaction writes a direct continuation summary; no episodic/semantic generation (E30–33) | Unchanged in Step 1 | Native compaction behavior (REQ-014) |

## Scope
- **In scope (Step 1)**: Work Journal generation, file segmentation, runtime-independent vocabulary, source links, freshness, the rename from work trace, and existing consumers.
- **Runtimes**: AutoByteus, Claude Agent SDK, Codex App Server, Antigravity CLI and Grok Build (E40). Proposed default: all five (DEC-012).
- **Run kinds**: standalone agent runs and team-member runs, the two targets the existing export supports (E48). Org-member coverage: DEC-013.
- **Next (Step 2, not in this approval)**: per-file summaries, combined work notes and notes-first reading (REQ-002, 008, 010–012, UC-005–006, SCN-006–008).
- **Later**: episodic/semantic memory (REQ-013, UC-007, SCN-009); runtime-switch consumer (REQ-001, 004, 006, 007, UC-001–003, SCN-001–005); cross-run memory sharing and ownership (DEC-011).
- **Out of scope**: changing native compaction; changing raw-trace recording or archive format; deleting historical data; summarization of any kind; provider account rotation; cross-machine migration.
- **Non-goals**: recovering hidden model reasoning or private provider state; guaranteeing records lost before they were written (E06); exactly-once semantics for external actions.

## Scenarios (proposed)
| ID | Trigger / sequence / outcome | Alternate | Validity |
|---|---|---|---|
| SCN-010 | An agent run on any supported runtime does work; its Work Journal shows messages, actions and outcomes in order, in the same vocabulary for every runtime | Event with no known mapping appears flagged, not dropped | Supported Normal |
| SCN-011 | A team-member run receives teammate messages and system notices; the journal shows who each message came from | Unknown sender shown as unknown | Supported Normal |
| SCN-012 | A long run never compacts (e.g. Antigravity/Grok); the journal still closes files at bounded sizes on turn boundaries | — | Supported Normal |
| SCN-013 | A run is interrupted mid-tool or restarted; the journal shows the action with "no recorded outcome" and continues correctly after restart | Missing records are not invented | Supported Explicit Edge |
| SCN-014 | A tool output exceeds the display limit; the journal shows the shortened value and says where the full original is | — | Supported Explicit Edge |
| SCN-015 | A run recorded before this feature is opened; its journal is generated from the retained raw traces | Missing raw-trace files reported | Supported Normal (if DEC-016 default accepted) |
| SCN-016 | A closed journal file is regenerated; its content is identical, so a Step 2 summary of it stays valid | Content changes only if the source raw traces changed, and this is detectable | Supported Normal |

## Requirements and acceptance criteria
| REQ / BEH / SCN | Required outcome | Acceptance criteria / verification intent |
|---|---|---|
| REQ-009 / BEH-003 / SCN-010 | Convert each supported runtime's raw traces into a chronological, runtime-independent Markdown Work Journal that preserves who did what, in what order, with what outcome. | AC-009: for fixture runs on each supported runtime performing equivalent work (send message, run a command, edit a file, read a file, search the web, call a teammate/MCP tool), the journals are readable without knowledge of any runtime SDK and use the same action names and argument labels. |
| REQ-015 / BEH-003 / SCN-010 | Use one canonical action vocabulary. Equivalent actions get the same name across runtimes; runtime-only actions keep their original name and are marked runtime-specific; the original runtime tool name stays traceable. | AC-015: Claude `Bash` / Antigravity `run_command` / Codex command execution / Grok shell / AutoByteus `run_bash` render as the same action with the same command field. An unmapped tool renders with its original name and a "runtime-specific" marker. |
| REQ-016 / BEH-003 / SCN-010, 011 | No silent omission. Every raw-trace record appears in the journal or is listed as intentionally omitted, with the reason. Message sender (user vs named teammate/agent), attachments/media references, system task notifications and the executing runtime are shown. | AC-016: a team fixture's agent-to-agent message shows the sending agent, not "user"; attachments appear as references; Claude background-task notices appear; a per-file record count reconciles rendered + declared-omitted = source records. |
| REQ-017 / BEH-003 / SCN-014 | Any shortened value says it was shortened and points to the full original in the raw trace. | AC-017: a >20,000-char tool result renders with a truncation marker and a resolvable raw-trace reference. |
| REQ-018 / BEH-003 / SCN-010, 016 | Each journal entry links back to its source raw-trace record(s), so Step 2 summaries and readers can drill down. | AC-018: for any journal entry, the referenced raw-trace record ID resolves in the run's raw traces or archives. |
| REQ-019 / BEH-007 / SCN-012, 016 | Split the journal into files using a journal-owned boundary that works on every runtime, never splitting a turn. Closed files are stable: rebuilding from the same raw traces yields identical content. | AC-019: a non-compacting run longer than the boundary produces multiple closed files plus one open file; every file starts and ends on turn boundaries; regenerating a closed file is byte-identical. A content fingerprint per file lets Step 2 detect change. |
| REQ-020 / BEH-006 / SCN-010, 013 | Keep the journal current as the run progresses, without waiting for an on-demand request. Failure to write the journal must not affect the run or its raw traces, and must be visible. | AC-020: after a turn completes, the open journal file reflects it (exact latency set in design); a forced journal-write failure leaves the run and raw traces unaffected and records the failure. |
| REQ-021 / BEH-003, 006 | "Work Journal" is the single name in code, storage, API and UI. The existing work-trace export is replaced, not kept as a parallel concept; existing consumers (skill improvement) use the Work Journal. | AC-021: no remaining production "work trace" concept or file name; skill-improvement tests pass using Work Journal output; any old work_traces folders are handled per the migration-conventions check in design. |
| REQ-003 (memory side) / BEH-003 | Producing the journal never requires the source runtime or any model call. | AC-003a: journal generation succeeds with the source runtime unavailable and no LLM configured. |
| REQ-014 / BEH-005 | Do not change native compaction, restore, raw-trace recording or historical display. | AC-014: existing compaction/restore/history tests unchanged and passing. |

Retained, not part of Step 1 approval: REQ-001, 002, 004–008, 010–013 and their ACs (full text preserved in requirements-doc-SR-008-snapshot.md; Step 2 and later stages will reissue them).

## Decisions (proposed defaults — approving this document approves these unless you change them)
- DEC-012 Runtimes: **all five**. Codex and Grok already mostly map; Claude and Antigravity need mapping (E47).
- DEC-013 Run kinds: **standalone + team-member runs** now. Org-member runs included if they reuse the same per-member raw-trace layout (to be confirmed in design); otherwise next increment.
- DEC-014 File boundary (revised SR-011 per E52): **journal files follow raw-trace compaction segments (one journal file per archive segment plus the open file)**. Runtimes without observable compaction produce one large journal file for now. A size/turn cap is deferred to Step 2, if per-file summarization needs it.
- DEC-015 Reasoning: **excluded** from the journal (unchanged from today). Records only what the agent said and did.
- DEC-016 Existing runs: **generated from retained raw traces** when first needed (cheap, deterministic, no model call).
- DEC-017 UI: **no new UI in Step 1**. The journal is agent-readable files plus the existing consumer. A journal view waits for the Product exploration (SR-008).
- DEC-004 (fidelity mapping) is resolved by REQ-015–018 at requirements level; exact per-tool mappings are a design deliverable.
- Still open, not blocking Step 1: DEC-006/008 (Step 2 portions and consolidation), DEC-007 (summarizer model/budget), DEC-009 (episodic/semantic), DEC-010 retention, DEC-011 memory ownership across runs.

## Quality, data continuity and dependencies
- Raw traces remain the only authority; the journal is a regenerable derivative and never the sole retained evidence.
- No throughput target proposed; journal work must not slow or block the agent's turn.
- Records never written because of abrupt failure (E06) cannot appear; the journal must not imply completeness beyond its sources.
- Persisted-data transition (rename of work_traces, manifest schema) requires the mandatory migration-conventions investigation in architecture.

## Readiness
- Step 1 is internally consistent and testable. Approval is requested for: scope, REQ-009, 015–021, REQ-003 (journal part), REQ-014, AC-009, 015–021, AC-003a, AC-014, and the default decisions DEC-012–017.
- Architecture, review and task-size/risk classification: N/A until approval.
