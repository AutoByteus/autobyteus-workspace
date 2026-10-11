# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/requirements-doc.md` (SR-012; user delegation 2026-10-11, quotes in Document Status; SR-013 is a separate proposal pending user approval and is not part of this review)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-revision-record.md` (SR-011, SR-012)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-spec.md` (SR-012)
- Supplemental Task Artifacts Reviewed:
  - `supplements/cached-summary-instruction.md` (behavior-defining);
  - `supplements/example-self-summary*.md`;
  - `code-review-report.md` § Round 5 (CRR-005), `ac003-summary-quality-report.md` § Round 2: triggering evidence;
  - `probes/*`.
- Relevant Solution Revision IDs: SR-011, SR-012
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-008`
- Current Review Round: 8
- Trigger: re-review request from `/software_engineering_team/solution_designer` for SR-012, after CRR-010 / API-REV-004 (F-9; implementation at `090353579`).
- Prior Review Round Reviewed: Round 7 (`ARCH-REV-007`, Pass on SR-011)
- Latest Authoritative Round: 8
- Current-State Evidence Basis. Round 8 checked: design Intended Change 8 (explained empty section), REQ-003, SR-012, and that SR-013 content is absent from the design (it appears only as a pending proposal in the requirements' Document Status). The rule `/^\(none(\)|[\s–—-])/i` on a section's first line was checked by hand. It accepts `(none)`, `(None)`, `(none) — reason` and `(none — reason)`. It rejects `(nonexistent …)`, a bare `none`, `(none:` and an empty section. The validator stays validation-only: the body is returned verbatim, and the heading, order, start and marker rules are unchanged. Round 7 (worktree @ `97fd9a814`) checked: `compaction-summary-parser.ts`. `validateCompactionSummaryBody` requires a non-empty body with no markers, the first heading at the start, exactly the nine headings in order, and bullets or `(none)` per section. `compaction-summarizer.ts:75–81` rejects tool-call replies and `completionStatus === 'incomplete'` before parsing. Also checked: REQ-002, REQ-003, the AC-003 release bar, design Intended Change 8 (unwrapped reply) and 10 (DeepSeek final), and SR-011. Round 6 (worktree @ `13648b147`) checked: design Intended Change 11 (fitted `L_eff`, budget, owner, why not reserve L, boundary-examples table); REQ-009 and AC-011 text; `code-review-report.md` C-018/CR-004; SR-010. Every boundary row was recomputed (margin 256): Ollama 8k: input budget 6,912; E 4,000 → 2,048; E 6,500 → 1,436 (= context − margin); E 6,912 → 1,024; E 7,000 → exceeded. Ollama 32k: E 26,000 → 6,512. Opus cached: E 990,000 → 9,744. All match. Round 5 rechecked design Intended Change 11 (the precise rule and the worked-examples table), REQ-009, AC-011, REQ-003, Document Status and the supplement header and sections (lines 1–9, 87, 144, 164). Round 4 basis:
  - **Output limits:** `llm/utils/max-output-tokens.ts:12`: `resolveRequestMaxOutputTokens = config.maxTokens ?? model.maxOutputTokens ?? null`. `llm/utils/llm-config.ts:305`: `maxTokens` defaults to `null`.
  - **Capacity:** `agent/token-budget.ts:43–61`: `resolveLlmRequestCapacity` uses context = override ?? `activeContextTokens` ?? `maxContextTokens`, reserves output = min(config, model max) ?? config ?? model max ?? 0, and gives input cap = context − reserve.
  - **Local model metadata:**
    - `llm/ollama-provider.ts:180–197`: Ollama models carry `maxContextTokens` and `activeContextTokens` (the running `num_ctx` or the configured value) but no `maxOutputTokens`.
    - `llm/lmstudio-provider.ts:119`: LM Studio is the same (`maxContextTokens` only).
    - `openai-compatible-endpoint-model.ts:62–64`: custom endpoints carry a `maxOutputTokens` value only when it was resolved.
  - **Anthropic thinking:** `llm/api/anthropic-llm.ts:160–170`: a budget-thinking model takes `budget_tokens` from `extraParams.thinking_budget_tokens` (default 1024), independent of `max_tokens`. Lines `:314` (non-streaming default) and `:348` (streaming uses `resolveMaxOutputTokens()`).
  - **Supplement:** contains two instruction blocks, v4 (lines 11–47) and v5 (lines 160–196). The header (line 1) says "v4 — approved"; line 136 says v5 is "pending user approval"; line 156 says v5 is "decided".

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged; SR-008 adds a catalog field, a shared invocation option honoured by six adapters, and an instruction revision.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - REQ-009 is now precise. R is the agent's resolved limit. When R is unknown or ≥ 16,384, nothing changes. Otherwise L = max(R, min(16,384, the known model maximum, ⌊context ÷ 4⌋ when known)).
  - REQ-003, Document Status and the supplement all name v5 as the single normative cached instruction.
  - The decision is user-delegated, and SR-009 makes it precise without changing its intent.
- Relevant existing behavior and evidence confirmed: Yes (meta).
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`. None remain.
- Remaining material ambiguity: None.
- SR-012 delta (verified): one validator rule. A section counts as empty when its first line starts with `(none` followed by `)`, whitespace or a dash. Bullets are still required otherwise. Root cause: SR-007 added an often-empty heading under an older bare-`(none)` rule. The response is proportionate: a prompt rewording was rejected with evidence (F-6). No interface, ownership or persistence change.
- SR-011 delta (verified):
  - F-6: one parser and one contract. A reply with no markers is validated whole by the unchanged strict body rules, and every marker case behaves as today. Tool-call and incomplete replies are still rejected before parsing. A false accept needs a complete nine-heading summary from the first line. The prompt texts are unchanged.
  - F-7/F-8: DeepSeek is final `cached_conversation`; Gemini and the other models stay `transcript`; quality gap A goes to the follow-up Task. These are user-delegated decisions with a recorded rationale, and technical review does not reopen them.
  - No interface, ownership or persisted-data change.
- SR-010 delta (verified):
  - Each summary request sends `L_eff = max(R, min(L, room))`, with `room = context − E − margin` and E the estimate of exactly what that request sends. Both paths accept inputs with the agent's own `inputBudget`, and the SR-009 "reserve L" budget is removed.
  - Invariants: an accepted request has `E ≤ context − R − margin`, so `room ≥ R` and `R ≤ L_eff ≤ min(L, room)`. Input + output ≤ context − margin, the same tolerance as the agent's own requests. The summary never accepts less input and never sends less output than today.
  - The cached path keeps cache reuse at the boundary instead of falling back.
  - `max_tokens` varying per request is outside the Anthropic cached prefix and the preserved-thinking check (as verified in ARCH-REV-004).
  - No interface change: the delta is local to `LlmPhaseSummaryPort`.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | The rule only raises a known small limit and is bounded by the model maximum and ⌊context ÷ 4⌋. Local models without output metadata keep today's behavior |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| REQ-002 per-model mode | Contract | Pass | Pass | Pass | Confirmed | — |
| REQ-003 instruction | Contract | Pass | Pass | Pass | Confirmed | v5 is the single normative block; v4 and the proposal are marked as history |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `supplements/cached-summary-instruction.md` | Pass | Pass | Pass | Pass | Pass | The header names exactly two normative blocks (v5 and fallback v6); everything else is history (ARCH-006 resolved) |
| `supplements/example-self-summary*.md`, `probes/*` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | — | — |
| Root-cause classification is explicit and evidence-backed | Pass | F-3 (truncation at 1,024), F-4/F-5 (quality per model) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Per-model strategies deferred to a follow-up Task | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The precise rule plus the worked examples cover unknown, high and small limits, small contexts and budget thinking | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settled point → committed compacted context | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Summarizer: `usesCachedSummary()` → cached or transcript | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003, DS-004 | Metering, setting removal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ConversationSummaryPort` (+ `usesCachedSummary`) | Pass | Pass | Pass | Pass | — |
| `BaseLLM.resolveMaxOutputTokens(options)` | Pass | Pass | Pass | Pass | One shared resolver; adapters pass options through |
| Model catalog (`compactionSummaryMode`) | Pass | Pass | Pass | Pass | Same ownership pattern as `defaultCompactionRatio` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/compaction` → port only | Pass | Pass | Pass | Pass | — |
| `agent/loop` port → `llm` model metadata | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `LLMModel.compactionSummaryMode: 'cached_conversation' \| 'transcript'` | Pass | Pass | Pass | Low | Pass |
| `ConversationSummaryPort.usesCachedSummary()` | Pass | Pass | Pass | Low | Pass |
| `LLMInvocationOptions.maxOutputTokens` + `resolveMaxOutputTokens(options)` | Pass | Pass | Pass | Low | Pass |
| Port output-limit rule (R → ceiling L → per-request `L_eff`; both paths use the agent's `inputBudget`) | Pass | Pass | Pass | Low | Pass. One private method in the port (`summaryOutputLimit(E)`); no public interface change |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Output limit | Pass | Pass | Pass | Pass | Reuses the shared resolver |
| Input budget | Pass | Pass | N/A | Pass | Reuses `resolveLlmRequestCapacity`; the agent's own reservation is kept unless the override applies |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm` (catalog, base, six adapters) | Pass | Pass | Pass | Pass | — |
| `agent/loop` (port) | Pass | Pass | Pass | Pass | — |
| `memory/compaction` (summarizer) | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Output-limit resolution | Pass | Pass | Pass | Pass | One resolver in `BaseLLM` |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `LLMModel.compactionSummaryMode` | Pass | Pass | Pass | N/A | Pass | — |
| `LLMInvocationOptions.maxOutputTokens` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm/base.ts` + six adapters | Pass | Pass | N/A | Pass | — |
| Catalog definitions (Anthropic, DeepSeek) | Pass | Pass | N/A | Pass | — |
| `agent/loop/llm-phase-summary-port.ts` | Pass | Pass | N/A | Pass | Owns the REQ-009 rule |
| `memory/compaction/compaction-summarizer.ts`, `compaction-summary-prompt.ts` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new folders | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Instruction v4 → v5 | Pass | Pass | Pass | Pass | v4 and the proposal are marked as history; only v5 and v6 are normative |
| OBS-1 accepted risk | Pass | Pass | Pass | Pass | Superseded by REQ-009 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Per-model mode | No | Pass | Pass | Two strategies selected by a model fact are not a legacy dual path: the transcript path is today's behavior for those models, by approved decision |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Setting key, stored summaries, usage rows | As in ARCH-REV-003 | Pass | Pass | N/A | Pass | Design § Persisted Data now states why stored summaries need no transition (ARCH-004 resolved) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Resume at `1153984ee` → mode → floor → v5 → tests → AC-003 rerun (Opus 5.5, another Anthropic model, DeepSeek) | Pass | Pass | Pass | Pass. The DeepSeek value is conditional on the rerun; API/E2E confirms it or routes it back |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Floor computation | Yes | Pass | N/A | Pass | Worked-examples table (8 rows) plus the SR-010 boundary table (7 rows, transcript path plus one cached row), required as unit cases by AC-011 |

## Material Premise Validation (Only When Needed)

- **P-003** (local models, no output metadata): still handled. R is null, so there is no override.
- **P-004** (budget thinking): still resolved by definition.
- **P-005 — CR-004: the summary output overflows the context near the limit.**
  - Trigger: the user configures a small `maxTokens` on an Ollama or LM Studio model, and compaction runs with the input near the agent's budget.
  - Status: `Reachable`, established by CRR-006 with the design's own worked examples. It is now handled by `L_eff ≤ room`.
- No new premise drives machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None blocking. ARCH-001..006 remain resolved.

- ARCH-007 (Low, editorial; REQ-002 rationale versus the accepted DeepSeek gap A) is still open and non-blocking; SR-012 did not touch it.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)

## Residual Risks

- **N-4 (implementation note):** unit-test the new rule's boundaries.
  - Accepted: `(none)`, `(None)`, `(none) — x`, `(none — x)`, `(none) - x`.
  - Rejected: `(nonexistent x)`, a bare `none`, an empty section, a non-bullet sentence.
  - A section starting with `(none)` and followed by bullets is accepted, which is harmless because the body is kept verbatim.
- **N-3 (truncation detection for unwrapped replies on `'unknown'`-status providers):** unchanged, non-blocking. N-1 and N-2 still apply.
- **Sequencing:** SR-013 (a comparison of output approaches, pending approval) may later change the output approach. SR-012 is a self-contained, low-cost fix that does not constrain SR-013.
- **Delivery's final run:** the load-sensitive server test `native-compaction-terminal-drain.test.ts`, as recorded by code review.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (F-9 reachable on read-only histories, established live; handled)
- Notes: the SR-012 delta is one tightly scoped validator rule.
