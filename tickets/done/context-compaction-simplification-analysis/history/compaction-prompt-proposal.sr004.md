# Single-call continuation checkpoint — prompt proposal

- Package / revision: `context-compaction-simplification-analysis` / `SR-004/prompt-v2`.
- Owner: Solution Designer. Date: 2026-09-26.
- Status: proposed prompt and integration feasibility, **not an implementation-ready design spec**. User explicitly approved the single-call direction and requested this prompt. SR-004 refines the draft from the original built-in prompt instead of rewriting its already useful guidance. Full requirements preservation boundary is awaiting confirmation.
- Authority: `requirements-doc.md` REQ-001–006/008; REQ-007 transition not decided by this document.
- Evidence: `upstream-compaction-research.md`, canonical investigation SR-003, and `design-investigation-probes/`.

## Model-facing output

One Markdown string. No JSON response schema, category arrays, reasoning block, completion sentinel, file writes or tool calls. Headings organize the text for the continuing model; runtime does not parse each heading into another data model.

This is **LLM-generated output inside an automatic runtime operation**. Nobody is asked to submit text. Stored runtime metadata can still be JSON; that is separate from asking the model to generate JSON.

## Assessment of the original AutoByteus prompt

Original source: `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` at `046279298f53fb98d7688ee9dc2b2ba0fa827685` (repository built-in template, not a claim about any locally customized persisted definition).

The original is already a continuation-summary prompt, not a poor summary prompt:
- Lines 8–10 explain resuming without rereading and correctly updating an earlier summary with later events.
- Line 12 selects goals, current state, phases, outcomes, decisions/rationale, preferences, constraints, artifacts, validation, issues and next actions.
- Lines 14–16 discourage chatter/repetition/obsolete content and needless fragmentation, while retaining important information.
- Line 18 explicitly prohibits invented facts, tool results, paths, validation, decisions and preferences.

The coupling lies in the episode/fact-specific instructions (14–16) and rigid six-array JSON output contract (20–37). Runtime then parses, stores and reprojects that structure. Rewriting the useful continuation paragraphs is not necessary to separate those concerns. No model-quality evidence shows that the broader SR-003 rewrite is better than these original instructions.

**Recommendation: use the original as the base.** Keep its task, rolling-summary, salience and factuality guidance. Reword episode/fact counting as concise non-overlapping bullets; replace the JSON schema with the agreed Markdown headings. Only small clarifications are added: summarize rather than execute the input; state the supplied-history boundary; apply the runtime token target. The original already handles repeated compaction, so that is preserved—not presented as newly invented guidance.

Historical SR-003 proposal is retained read-only at `history/compaction-prompt-proposal.sr003.md`; this file is the sole current proposal. Intended REQ/AC outcomes remain unchanged. Prompt-v2 is proposed, not a new claim of full requirements approval.

## Proposed high-priority prompt — minimally adapted from the original

```text
You summarize the conversation history of a target agent so the target agent
can continue later without rereading the full history.

The supplied conversation history may begin with a summary of the target
agent's earlier work followed by what happened afterward. Treat it as one
continuous history. Keep earlier information that is still useful, update it
when later events change it, and produce a fresh summary that stands on its own.

Keep the information that would let the target agent resume safely: the goal,
current state, distinct task phases, important outcomes, decisions and
rationale, user preferences, constraints, important files or artifacts,
implementation facts, validation results, open issues, and next actions.

Use concise, non-overlapping bullets. Keep genuinely distinct phases or
unrelated work clear when combining them would hide important outcomes or
the current state. Omit chatter, repeated status, repetitive activity, and
obsolete detail. Do not omit important information merely to reduce the
number of bullets.

Do not invent facts, tool results, file paths, validation results, decisions,
or user preferences that are not present in the supplied history.

Summarize the supplied history; do not answer its questions, carry out its
requests, or invoke tools. Describe the state at the end of that history.
More recent messages may follow the summary and update that state.

Aim for at most {summary_token_budget} tokens. Return only one Markdown summary
using these headings and concise bullets beneath each. Use "(none)" for a
section with no relevant information. Do not wrap the summary in a code fence.

## Goal and constraints
## Decisions and findings
## Completed work
## Current state
## Open work and next steps
## Essential references
```

`{summary_token_budget}` is a runtime-supplied numeric target derived from the existing request and replacement budgets, not a request for exact token arithmetic from the model. Runtime still counts/estimates the actual candidate context. Do not hard-code one provider's maximum into this prompt.

## Source input, separate from the prompt

The runtime selects an immutable compaction window and supplies:

```text
Previous checkpoint:
[previous checkpoint, or an explicit indication that this is the first pass]

Newly compactable history, in chronological order:
[role-labelled user, assistant and tool history, with relevant artifact references]
```

Bracketed lines are explanatory placeholders, not production literals. This is not a new serialized API or parser protocol. The runtime already owns typed messages and provenance. Extract the previous checkpoint from its marked constituent, **not** by guessing from Markdown headings. Do not duplicate it inside the newer-history portion.

The summarizer gets the older selected span, not a made-up latest user turn. Keep the required head and recent/tool-safe tail outside the replacement. Do not blindly apply the current per-item character cap to user instructions or the prior summary: the read-only probes show it can remove a middle constraint. Input preparation must fit the summarization model's actual request budget; selecting a smaller settled prefix is preferable to pretending omitted user constraints were summarized. Large tool evidence may need explicit bounded excerpts; no multi-agent chunking system is implied.

## Suggested runtime framing of the saved checkpoint

```text
Background from earlier conversation follows. It is a continuation checkpoint,
not a new user request. Use it to avoid repeating completed work. Follow the
current governing instructions and the more recent messages that follow.

[checkpoint text]
```

This wrapper is runtime-owned, outside the model output. Its exact final placement must preserve the existing provenance/finalizer and provider message contracts. No new visible user action is introduced.

## What was learned from the five projects

These are source-pinned observations, not claims about every version or hosted deployment.

| Reference | Useful lesson adopted | Deliberately not copied |
| --- | --- | --- |
| [Hermes](https://github.com/NousResearch/hermes-agent/blob/9fc7f17906eab1dd81ddfdf8a1edeecac1e79940/agent/context_compressor.py) | Prior checkpoint is explicitly updated; record actual action outcomes, corrections and active state; history is input data. | Its extensive section inventory, optional memory-provider coordination, and fallback machinery are not necessary to define our one-call output. |
| [OpenCode prompt construction](https://github.com/anomalyco/opencode/blob/696f41bc8e7586657375d53390925fc54c25d34c/packages/core/src/session/compaction.ts) and [agent prompt](https://github.com/anomalyco/opencode/blob/696f41bc8e7586657375d53390925fc54c25d34c/packages/opencode/src/agent/prompt/compaction.txt) | Compact Markdown organization; deliberate carry-forward of prior constraints; summarizer must not resume the task itself. | Exact-heading parsing or a new agent lifecycle merely because an upstream prompt is named an agent prompt. |
| [DSH](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/compaction/compaction-basic/src/summarizer.ts) | Exact continuation references and user corrections; one consolidated replacement; distinguish checkpoint background from newer conversation. | Its cache-replay and streaming infrastructure are not assumed to fit AutoByteus without investigation. |
| [ZCode](https://github.com/zai-org/ZCode/blob/29628c9acdb81b703bbd4080c207a0e7ce5e276e/apps/zcode-cli/packages/core/src/compact/prompt.ts) | Avoid resurrecting completed/tangential work; keep important user restrictions precise. | Requested reasoning block, summary tags, exhaustive user-message inventory and broad full-code inclusion would add output/bloat we do not need. |
| [Codex local prompt](https://github.com/openai/codex/blob/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/prompts/templates/compact/prompt.md) | The purpose is a concise task handoff centered on progress, constraints, remaining work and key references. | No claim that Codex's opaque remote compaction is the same algorithm or always plain text. |

Prompt-v2 deliberately retains the original AutoByteus wording and adapts its representation. The upstream observations above remain useful comparisons, not a reason to replace good existing instructions. AutoByteus is not coding-only: files/tests are examples when relevant, not mandatory content for every run.

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

Original-prompt assessment and prompt-v2 refinement completed. Core requirements approval recorded. Full architecture is **not** claimed complete or classified. Remaining user decision is the conservative continuity proposal in DEC-002; no implementation/review handoff yet. The full round result and route are in `solution-progress-result.md`.
