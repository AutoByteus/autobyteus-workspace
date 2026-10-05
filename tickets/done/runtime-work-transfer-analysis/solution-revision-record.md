# Solution revision record
Package: runtime-work-transfer-analysis
| Revision | Phase | Trigger | Prior | Current | Result |
|---|---|---|---|---|---|
| SR-001 | Requirements | User requests human-style cross-runtime work-transfer analysis; then says continue | N/A | Ready for Approval | Source-backed analysis and proposed manual standalone first slice |

| SR-002 | Requirements / Evidence | User clarifies runtime-independent work notes and fresh incoming run | Ready for Approval | Draft | Notes-first continuity; existing work-trace projection investigated |

## SR-001 — initial requirements baseline
- Classification: Initial Baseline; findings E01–E14.
- Affects BEH-001–004, UC-001–003, SCN-001–005, REQ-001–008, AC-001–008, DEC-001–002.
- No current supported transfer identified; proposed normal/error scenarios explicitly distinguished.
- Canonical artifacts: requirements-doc.md, investigation-notes.md; supplement/result: analysis-result.md.
- User approval: none; “continue” is not approval. No behavior-defining external supplement.
- Product evidence: N/A. Design/review/implementation: N/A — not applicable before approval.
- Task-size/architectural-risk classification: N/A before completed design; lifecycle and data integrity risks identified, not a finalized route classification.
- Remaining decisions: first-release standalone versus team scope; approve same logical assignment/manual transfer behavior.
- Next: user reviews proposed behavior, then Solution Designer designs only approved scope.
- Routine approval hold stays in requirements conversation; routing recorded in analysis-result.md.


## SR-002 — fresh executor, cumulative work notes
- Classification: Refinement / Requirement Gap against proposed (not approved) SR-001.
- Trigger: E15 user clarification; evidence E16–E21 from common raw traces and existing work-trace projection.
- Affected: BEH-002,003; REQ-002,007,008 / AC-002,007,008; SCN-001,004; DEC-002–004.
- Prior requirements: Ready for Approval, unapproved. Current: Draft. Design: N/A.
- Intended behavior delta: work notes are primary continuity source; fresh incoming execution on every transfer; no summary-only replacement of predecessor history. Existing common envelope/work-trace evidence corrects overly broad runtime-specific framing.
- Canonical notes and requirements updated; analysis-result.md revised. No external supplement/Product artifact.
- Approval: user direction recorded verbatim in meaning; no full-baseline approval. Earlier standalone-first scope remains unapproved.
- Size/risk/review/implementation: N/A before approved requirements and design.
- Gaps: exhaustive reading policy for large history, complete portable content, first-release standalone/Team scope.
- Next: discuss and refine concept with user, no implementation forwarding.

## SR-003 — memory belongs to the continuing agent/work, not the executor
- Phase/classification: Requirements clarification / Refinement; trigger E22.
- Prior/current requirements: Draft → Draft; design N/A.
- Affects BEH-002,003, REQ-002,007 interpretation; adds DEC-005. Existing acceptance criteria unchanged pending memory scope definition.
- Clarifies portable memory versus traces versus runtime-private state; does not equate reading with guaranteed complete understanding.
- Canonical evidence, requirements decisions and analysis-result.md updated. No new supplements.
- Approval impact: no complete baseline approval, no new implementation scope authorized. Prior first-slice/read-in decisions remain open.
- Classification/review/handoff: N/A before design; result remains user discussion.
- Next action: refine notes/memory semantics with user; explicit requirements approval before architecture.

## SR-004 — treat work-trace history as durable memory
- Phase/classification: Requirements/Evidence refinement; trigger E23; supporting E24–E26.
- Prior/current requirements: Draft → Draft. Affects BEH-003, REQ-002 interpretation and DEC-005; AC unchanged.
- Supersedes optional separate-memory framing with traces-as-memory. No separate knowledge-store requirement added.
- Corrects factual premise: memory modules exist, but storage/context management is distinct from cross-runtime continuation.
- Approval state: full baseline not approved; scope/read-in questions remain. No design, implementation or independent-review basis created.
- Canonical requirements, evidence and analysis result updated; no supplement added.
- Next action: return conceptual clarification; finalize intended behavior with user before architecture.

## SR-005 — correct conflation of work trace, work note and common format
- Phase/classification: Mixed requirements/evidence refinement; user correction E27, inspected source E28.
- Prior/current: Draft → Draft; no approved baseline/design.
- Changes: canonical vocabulary and runtime-normalization requirement REQ-009 / AC-009; clarifies BEH-003, REQ-002,008 and DEC-005.
- Work trace is chronological journal; work notes are selective. Common fields/Markdown are not semantic runtime independence. Earlier interchangeable usage is superseded.
- Canonical requirements, investigation and result revised; historical SR entries retained.
- Approval: user's conceptual correction recorded, not approval of full scope. No implementation/review routing.
- Open: normalized journal meaning/fidelity, selective-note role, read-in policy and release surface.
- Next: confirm shared conceptual understanding without prematurely selecting architecture.

## SR-006 — runtime-independent memory pipeline; notes-first takeover
- Phase/classification: Mixed requirements/evidence refinement; trigger E29 user expansion/history request; evidence E30–34.
- Prior/current: Draft → Draft. Full baseline approval absent; design N/A.
- Scope evolves from runtime-transfer-first to portable journal, agent-generated segment notes, consolidation, then episodic/semantic memory and memory-consuming takeover. Prior standalone-first proposal not accepted.
- Preserves IDs REQ-001–009; updates REQ-002,008 to notes-first/source-drill-down. Adds BEH-005, UC-004–007, SCN-006–009, REQ/AC-010–014 and DEC-006–010.
- DEC-003 resolved by user: read notes first, journal as needed; prior exhaustive reading ambiguity superseded.
- Canonical requirements consolidated to remove conflicting earlier scope/reading language; investigation and result updated.
- Historical finding: September 26 refactor intentionally separated native context compaction from new episodic/semantic generation; independent memory feature is new scope, not rollback of that simplification.
- No new supplements, Product/review artifacts, architecture classification or downstream handoff.
- Remaining: first delivery boundary, supported run scopes, fidelity/chunking/processing cadence, worker configuration/budget, historical-data policy, episodic/semantic semantics.
- Next: user reviews refined staged behavior; explicit selected-baseline approval precedes architecture.

## SR-007 — user confirms memory first; switching deferred
- Phase/classification: Requirements refinement plus ownership evidence; E35 user confirmation, E36 source.
- Prior/current detailed status: Draft → Draft; confirmed scope priority recorded, not ignored or inflated into complete approval.
- Affects DEC-001 and scope guardrail; future-consumer REQ-001,004,006,007 and related transfer AC/scenarios explicitly deferred. Adds DEC-011 memory ownership.
- Current memory work concerns journal, notes/consolidation, evidence retrieval and episodic/semantic semantics, separate from native compaction.
- Later runtime-change detection/crafted takeover message recorded, not designed.
- Canonical requirements, investigation and result updated. No supplement, Product handoff, architecture classification or implementation.
- Next: settle memory ownership and first deliverable behavior, then explicit approval before architecture.

## SR-008 — Product Design Requested: memory UI brainstorming
- Phase/classification: Requirements / user-requested Product coordination; E37, frontend context E38.
- Prior/current requirements: Draft → Draft; result Product Design Requested, purpose New Request.
- User explicitly asks Product Team /product_team to brainstorm and visualize memory UI. This is not a request for backend implementation or approval of unresolved scope.
- Related BEH003/005, UC004–007, SCN006–009, memory REQ/AC002,003,005,008–014 and DEC004–011.
- Added product-design-request.md handoff/context; requirements Product status and evidence updated.
- Full behavior/visual approval: none. Product mode/repository/bootstrap not prescribed. Prior memory-first direction preserved.
- Next: Product works with user and returns durable exploration/decision artifacts to Solution Designer for integration. No duplicate technical handoff.

## SR-009 — independent re-analysis; evidence clarification
- Phase/classification: Evidence-only clarification plus advisory analysis; trigger user request (2026-10-04) to analyze the undecided ticket. Evidence E39–E42.
- Prior/current requirements: Draft → Draft. No intended-behavior change; no approval obtained or implied.
- Corrections: runtime set has five kinds, not three (E40); partial canonical tool vocabulary already exists (E41); journal can be a deterministic projection (E42); base drift is negligible for memory paths (E39).
- Affected for later decision: AC-001, AC-009 runtime coverage; DEC-004, DEC-006, DEC-010, DEC-011. Advisory recommendations are in analysis-result.md and are not requirements until the user approves them.
- Product request SR-008: no Product return found in the ticket folder; still outstanding.
- Design/review/classification: N/A. Routing: result goes back to the user in the requirements conversation.

## SR-010 — two-step plan; Step 1 Work Journal requirements ready for approval
- Phase/classification: Requirements refinement (user scope decision + naming) with evidence E43–E49.
- Prior/current: Draft → Ready for Approval (Step 1 only).
- User decisions: two steps (Step 1 Work Journal, Step 2 per-file summaries → work notes); name "Work Journal" over "Work Trace"; Step 2 artifact "work notes".
- Changes: requirements-doc.md rewritten around Step 1. Adds BEH-006, 007; SCN-010–016; REQ/AC-015–021; AC-003a; DEC-012–017. Refines REQ-009/AC-009 (five runtimes). REQ-002, 008, 010–012 move to Step 2; REQ-001, 004, 006, 007, 013 stay later. Full SR-008 text preserved in requirements-doc-SR-008-snapshot.md.
- Key evidence: journal files currently follow compaction only, so Antigravity/Grok never close a file (E45); renderer mislabels teammate messages as user and drops notifications/attachments (E46); Claude and Antigravity lack canonical tool names (E47); no live freshness (E48).
- Approval: requested for Step 1 baseline and default decisions; not yet given.
- Product SR-008 request still outstanding; Step 1 proposes no UI (DEC-017).
- Design/review/classification: N/A until approval.

## SR-011 — Step 1A rotation correctness; Claude experiment
- Phase/classification: Requirements change (user scope ordering) plus evidence from a live probe and real data (E52–E56).
- Prior/current: Step 1 Ready for Approval (unapproved) → overall Draft. Step 1B content unchanged except DEC-014.
- User decision: fix per-runtime compaction rotation before the Work Journal; a big single raw-trace file is acceptable where compaction is not observable; run experiments one runtime at a time.
- Changes: adds Step 1A REQ/AC-022–026 and DEC-018, DEC-019; DEC-014 revised so journal files follow compaction segments, with the size cap deferred.
- Claude findings: compact_boundary never detected because of a frame-shape mismatch, so Claude raw traces never rotate (0 archives in 8 real runs). The ~30 s repeated "compacting" status creates 2–4 markers per compaction, explaining the user's frontend observation. trigger/pre_tokens are lost; the failed-compaction result is ignored.
- Artifacts: probes/claude-manual-compact-probe.mjs and probes/claude-manual-compact-frames.jsonl (disposable probe evidence retained for traceability).
- Next: Codex verification, then Antigravity and Grok experiments; then Step 1A/1B approval. No design or implementation yet.

## SR-012 — scope narrowed to the Claude rotation fix; design drafted
- Phase/classification: Requirements approval (narrowed scope) + architecture design. Trigger E57; evidence E58–E62. Base refreshed to origin/personal @ 39f2dd008.
- Prior/current: Draft → requirements Approved for the Claude scope (REQ-022–025 Claude, REQ-014, DEC-018), with CONF-001 (latest-segment history after rotation) pending user confirmation. Design: design-spec.md complete pending CONF-001.
- Requirements rewritten for the ticket scope; prior program text preserved in requirements-doc-SR-011-snapshot.md and -SR-008-snapshot.md.
- Design: new per-session ClaudeCompactionOperationTracker; shared operation id as provider_event_id; rotation on the real compact_boundary frame; metadata; explicit failure/abandon close; remove the stateless heuristic. No frontend change, no migration.
- Classification: task_size Medium, architectural_risk Low. Expected route after confirmation: direct implementation per handoff rules.
- Next: user confirms CONF-001, then handoff.

## SR-013 — complete experiments; design finalized; Architecture Design Complete
- Phase/classification: Evidence completion + design revision. Trigger E63 (user: base the solution on complete experiments; requirements clear; continue to handoff). Evidence E64–E70.
- Prior/current: requirements Approved with CONF-001 pending → Approved (CONF-001 confirmed, E63). Design draft → complete.
- Experiments (pinned SDK 0.3.280, system CLI 2.1.283, streaming input like production): manual `/compact` works through streaming input; auto success; auto failure "too_few_groups" with the turn continuing; interrupt failure "API Error: Request was aborted."; long Sonnet compaction; 30 s keepalive confirmed in the CLI source; turn routing and mid-turn rotation convention verified.
- Design changes: explicit state table (failure does not end the turn; ignore requesting/null-without-result); fixtures from recorded frames; live E2E driven by `/compact`; risks updated.
- Classification: task_size Medium; architectural_risk Low (unchanged).
- Artifacts: probes/claude-streaming-compaction-probe.mjs, probes/claude-streaming-{manual,auto,interrupt,long}-frames.jsonl.
- Review: independent architecture review N/A per Medium/Low route. Next: handoff per rules.
