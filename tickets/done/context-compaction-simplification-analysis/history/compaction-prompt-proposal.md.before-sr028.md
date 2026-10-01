> SR-023 documentation clarification: comparisons removed. Exact prompt-v5 remains approved and unchanged; current intent is in requirements SR-023 and ASM-022-01. Historical proposal-stage wording below is not the current approval/readiness state.

# Single-call continuation checkpoint — prompt proposal

> Current approval: included in the SR-012 scope explicitly approved by the user (“Correct. approve”), captured in SR-013. Historical proposal labels below describe earlier rounds; implementation remains pending.

- Package / revision: `context-compaction-simplification-analysis` / `SR-008/prompt-v5`.
- Owner: Solution Designer. Date: 2026-09-26.
- Status: proposed prompt and integration feasibility, **not an implementation-ready design spec**. User explicitly approved the single-call direction and requested this prompt. SR-005 established the carefully tuned original as the baseline. The latest user request in SR-007 authorizes targeted additions for important continuation requirements, without discarding that baseline. SR-008 additionally proposes explicit output framing and corrects bullet-count pressure after user feedback; these are draft refinements. Full requirements preservation boundary is awaiting confirmation.
- Authority: `requirements-doc.md` REQ-001–006/008; REQ-007 transition not decided by this document.
- Evidence: canonical investigation SR-003 and `design-investigation-probes/`.

## Model-facing output

One Markdown summary inside a proposed `<compaction_summary>` output block. Runtime extracts the Markdown payload and discards the wrapper and any surrounding prose; it does not maintain categorized memory entries. No JSON response schema, category arrays, reasoning block, file writes or tool calls. Headings organize the text rather than becoming separate stores. Markers delimit extraction; they are not proof of factual completeness or a substitute for provider termination checks.

This is **LLM-generated output inside an automatic runtime operation**. Nobody is asked to submit text. Stored runtime metadata can still be JSON; that is separate from asking the model to generate JSON.

## Assessment of the original AutoByteus prompt

Original source: `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` at `046279298f53fb98d7688ee9dc2b2ba0fa827685` (repository built-in template, not a claim about any locally customized persisted definition).

The original is already a continuation-summary prompt, not a poor summary prompt:
- Lines 8–10 explain resuming without rereading and correctly updating an earlier summary with later events.
- Line 12 selects goals, current state, phases, outcomes, decisions/rationale, preferences, constraints, artifacts, validation, issues and next actions.
- Lines 14–16 discourage chatter/repetition/obsolete content and needless fragmentation, while retaining important information.
- Line 18 explicitly prohibits invented facts, tool results, paths, validation, decisions and preferences.

The coupling lies in the episode/fact-specific instructions (14–16) and rigid six-array JSON output contract (20–37). Runtime then parses, stores and reprojects that structure. Rewriting the useful continuation paragraphs is not necessary to separate those concerns. No model-quality evidence shows that the broader SR-003 rewrite is better than these original instructions.

**Recommendation: preserve the original and make targeted continuity improvements.** The original task, rolling-summary, salience and factuality guidance remains. The earlier JSON/category output adaptation is unchanged. At the user’s explicit SR-007 request, five focused points now make unresolved user requests, persistent constraints, truthful work state, exact references and source-only summarization more explicit. [Refinement notes](prompt-refinement-notes.md) distinguish actual gaps from existing implicit coverage and explain each choice against our continuation requirements. No fixed token-target prose or extra output sections are needed. Runtime input selection, no-tools capability and budget enforcement remain separate responsibilities; prompt wording does not replace them.

Historical proposals are retained read-only at `history/compaction-prompt-proposal.sr003.md` and `history/compaction-prompt-proposal.sr004.md`; this file is the sole current proposal. The user confirmed preserving the tuned original and subsequently requested selective additions of important missing points. This authorizes the focused refinement work, not approval of unrelated data policy or every newly authored word. Existing REQ/AC outcomes remain unchanged. The exact preceding literal is retained at `history/proposed-compaction-prompt.sr005.md`; the added lines are visible in `history/prompt-v3-to-v4.diff`.

## Proposed high-priority prompt — original plus targeted continuity guidance

The complete prompt is in [proposed-compaction-prompt.md](proposed-compaction-prompt.md). See [output extraction and coverage](output-format-and-coverage.md) for the latest feedback-driven proposal. That file contains only the proposed model-facing prompt, so it can be read or copied without the investigation and design commentary. It is the canonical literal text for `SR-008/prompt-v5`. SR-007 added targeted continuity guidance; SR-008 now changes the misleading “fewest bullets” wording and adds output boundaries. All six headings remain unchanged.


The original task, rolling-summary, salience and factuality guidance remains. The earlier conversion from “fewest episodes” to “fewest bullets” was not equivalent and is corrected to coverage-first wording. A proposed single marked output block addresses surrounding model chatter. Prior prompt-v4 is retained in `history/proposed-compaction-prompt.sr007.md`; the diff is `history/prompt-v4-to-v5.diff`. The five SR-007 additions and their rationale in `prompt-refinement-notes.md` remain relevant. No model-quality gain or runtime implementation is claimed.

## Source input, separate from the prompt

The runtime supplies one immutable selected-history prefix, already containing the previous checkpoint once when present. The first pass contains ordinary older history; a later pass contains the current checkpoint and newly eligible older messages. Do not pass a second copy of the prior summary or a numeric summary-size target. The runtime owns typed messages, selection and provenance; the strategy produces one replacement Markdown body.

The summarizer gets the older selected span, not a made-up latest user turn. Keep the required head and recent/tool-safe tail outside the replacement. Do not blindly apply the current per-item character cap to user instructions or the prior summary: the read-only probes show it can remove a middle constraint. Input preparation must fit the summarization model's actual request budget; selecting a smaller settled prefix is preferable to pretending omitted user constraints were summarized. Large tool evidence may need explicit bounded excerpts; no multi-agent chunking system is implied.

## Suggested runtime framing of the saved checkpoint

```text
Background from earlier conversation follows. It is a continuation checkpoint,
not a new user request. Use it to avoid repeating completed work. Follow the
current governing instructions and the more recent messages that follow.

[checkpoint text]
```

This wrapper is runtime-owned, outside the model output. Its exact final placement must preserve the existing provenance/finalizer and provider message contracts. No new visible user action is introduced.

## Rationale within this product

The prompt preserves the tuned original's continuation purpose and information-selection guidance. Explicit handling of pending requests, constraints, work status, exact references and source-only summarization follows REQ-001/006/009 and the supported first/repeated-compaction scenarios. Files and tests are relevant examples, not mandatory content for every kind of task. The natural-compression assumption ASM-022-01 explains why the model receives no numeric summary-length target; provider/runtime safeguards remain separate.

## Lean integration direction — feasibility, not final architecture

```text
Normal agent run reaches its existing compaction threshold
  -> runtime selects older settled history and previous checkpoint
  -> one direct model call, with no tools
  -> runtime checks the response and candidate next-request budget
  -> runtime saves/installs one checkpoint plus protected recent context
  -> the same agent continues its work
```

Existing `MemoryManager`/pending executor remain the context-operation boundary. Existing LLM creation/secret resolution/provider adapters supply the direct call. The summarizer does not own run management or storage. Existing snapshot/finalizer/raw-trace owners retain their actual responsibilities; no parallel generic memory service is proposed.

### Remove rather than wrap

The target should remove the child compactor AgentRun launch/collection lifecycle, six-array parser and normalization/JSON correction, category row construction, and category-to-summary projection from this path. Do not retain both strategies behind a legacy switch. Historical inspection, if approved, is independent read access rather than a reason to keep obsolete generation.

### Strong candidate: reuse the working-context snapshot

The current v5 snapshot already includes the summary string in a provenance-marked message. Four source probes confirm serializer round-trip feasibility and current clipping behavior. A new Markdown file plus an identical snapshot copy would create another authority without an established need.

However, **the current restore path additionally requires categorized lineage**, and commit ordering moves raw traces before saving the new snapshot. Removing those dependencies requires a concrete safe-transition design. Serializer round-trips alone do not prove it. Existing supported snapshots may be directly usable without rewriting, but do not claim a completed migration decision before inspecting representative persisted shapes and the approved continuity requirement.

### Checks belong to real existing boundaries

- Response must be nonempty and not known to be cut off. Provider termination status is the right evidence for output-limit truncation—not heading parsing or guessing from the last character.
- The final composed context must meet the computed budget and preserve required messages/tool groups; existing validation already owns these concerns.
- Errors use existing compaction status and explicit retry, not a new autonomous recovery agent.
- Direct `BaseLLM.sendMessages` exists. Its response currently omits termination metadata; provider mapping needs investigation. Native AutoByteus calls also require a logical conversation ID and cleanup. Do not assume every provider can use an empty kwargs object or silently disable providers.
- A separate invocation must not mutate the parent agent's prompt, tool policy or shared model-instance lifecycle.

Unknowns remain technical, not an excuse to introduce a new subsystem: normalized terminal status across supported direct adapters; how the existing compaction model choice is expressed after helper-run removal; exact snapshot/trace commit order and normal resume integrity. A full design must settle these after the preservation approval.

## Prompt evaluation plan — not yet executed against a live model

| Fixture from supported workflow | Must preserve / avoid |
| --- | --- |
| First compaction during ordinary work | Actual goal, constraints, observed outcomes, active work and a supported next step. No invented task completion. |
| Second and third compactions | Older still-relevant constraints even when not repeated; one replacement; no duplicated old summaries. |
| User correction or change of priority | Corrected state and current request; stale decisions must not override newer user direction. |
| Investigation followed by a code change | Distinguish findings, edits and executed tests; a suggested test is not a passing result. |
| Unanswered question or pending approval | Preserve it as unresolved; do not invent authorization or a substantive answer. |
| Completed work followed by a new request | No reopening completed actions as pending. |
| Long user instruction plus verbose tool output | Important instruction survives input preparation and summary; logs do not consume the entire budget. |
| A recent uncompressed tail | Summary describes only its source boundary; more recent tail remains unchanged and governs continuation. |
| Image/document references | Keep supplied artifact references and observed findings without fabricating unseen content. |

Quality evaluation should inspect actual first/repeated model outputs using approved evaluation inputs/provider configuration. Deterministic checks should cover call count, no-tools, budget, failure and replacement. Do not build an LLM-as-judge service or permanent eval platform just for this task. No paid/live quality experiment has been run in this round.

## Readiness

Feedback-driven prompt-v5 extraction/detail proposal completed and presented for reading; original-based approach retained. Output framing is proposed, not already implemented or user-approved. Core requirements approval recorded. Full architecture is **not** claimed complete or classified. Remaining user decision is the conservative continuity proposal in DEC-002; no implementation/review handoff yet. The full round result and route are in `solution-progress-result.md`.
