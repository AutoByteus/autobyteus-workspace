# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-012`
- Package identifier: `compaction-prompt-cache-reuse`
- Request / ticket: Project Task `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5`
- Requirements owner: Solution Designer
- Date: 2026-10-09
- Approval state and reference: approved by the user on 2026-10-09. The user proposed "always use the same model … whatever model the agent use, it should use the same model". I recommended removing the compaction-model setting, keeping a same-model fallback for failed attempts, all native providers, a summary covering the whole conversation with the recent tail kept, and Token Meter reporting, then asked "Approve these". The user answered "Yeah, exactly, that's what I mean, because if you don't use the same model, then you do not take advantage of the cache … It seems to be like a flexibility, but actually it's not."
- SR-007 (2026-10-11), after CRR-003 (API-REV-001 Fail). Approved by the user:
  - the v4 summary instruction (SR-007; superseded by v5 in SR-008), built and refined with the user over several rounds; the user's last word was "That's fine … No worries";
  - continuing the cached approach and fixing the Gemini adapter bug in the design: "we should update our design to fix our bug … the big direction is actually correct".
  Adds REQ-008 (system prompt taken from the request's own messages, all adapters), the nine-heading contract (REQ-003), stronger AC-003 checks and AC-010, and corrects the cost premise.
- SR-008 (2026-10-11), after CRR-005 (API-REV-002 Fail). The user explicitly delegated the decisions ("Follow your reasoning skill … make the reasonable decision for me") and set the direction: "we cannot sacrifice every provider … if we cannot make all of them good by just one summary message, I will possibly do it in a … follow-up ticket … different strategy for different models". Decided:
  - the cached summary only for catalog models marked for it: Anthropic now, and DeepSeek if its v5 rerun passes (user: "for DeepSeek, you found a problem … then we can fix that as well"); every other model keeps the transcript summary;
  - instruction v5;
  - an output-limit floor for summary requests;
  - per-model compression strategies go to a follow-up Task.
- SR-009 (2026-10-11), after ARCH-REV-004: the REQ-009 rule is made precise (it only raises a known small limit, bounded by the model maximum and by context ÷ 4; an unknown limit is unchanged), and v5 is the single normative instruction. This refines the delegated SR-008 decision without changing its intent.
- SR-010 (2026-10-11), after CRR-006 CR-004. As written in SR-009, the REQ-009 formula contradicted REQ-009's own guarantee: a summary request whose input still fits the agent's budget could get an output limit that no longer fits the context. That breaks compaction on small local models that work today. The raised limit is now reduced to the room the request leaves, and never goes below the agent's own limit. This decision is the Solution Designer's under the user's SR-008 delegation. It restores the approved intent ("no model may lose today's behavior") and does not change it, so no renewed approval is needed.
- SR-011 (2026-10-11), after CRR-008 (API-REV-003 Fail): F-6, F-7, F-8.
  - User direction: "for this version, we don't overcomplicate things … in the future … the compaction needs to be able to configure it … different types of compaction for different provider, even for different model … for Gemini, let's use the fallback version … use your reasoning skill to do the logical design reasonable design".
  - Decided by the Solution Designer under that delegation:
    - F-6: the parser also accepts a reply that is only the nine-heading summary without the `<compaction_summary>` markers (REQ-003). The prompt texts are unchanged.
    - F-7/F-8: DeepSeek and all Anthropic catalog models keep the cached summary; Gemini and all other models keep the transcript summary (REQ-002).
    - The remaining per-model quality gaps (gap A on DeepSeek and Sonnet 5) go to the follow-up Task, which owns per-provider and per-model compaction strategies (AC-003).
- SR-012 (2026-10-11), after CRR-010 (API-REV-004, F-9): an empty section may carry a short explanation. Example: `(none) — read-only investigation` or `(none — read-only investigation)`. Sonnet 5 always explains the empty "Files created or changed" section on a read-only history, and the strict bare `(none)` rule blocked its fallback summary. This is decided by the Solution Designer under the same user delegation as SR-011 ("use your reasoning skill to do the logical design reasonable design"). Prompt texts are unchanged.
- **SR-013 (proposed 2026-10-11, Ready for Approval — not yet approved):** at the user's request, before the summary output approach is final, compare four approaches with the AC-003 harness:
  - E1 wrapper lines + tolerant parser (SR-011);
  - E2 `write_file`;
  - E3 a dedicated handover-note tool;
  - E4 a forced tool call.

  The models are Opus 5.5, Sonnet 5, DeepSeek and Gemini, on histories A and B. The user then chooses. Plan: `supplements/summary-output-approach-comparison.md`. SR-011 (E1) proceeds meanwhile as the baseline.
- Exact approved requirements baseline / solution revision: SR-002 of this document. SR-004 restates the recorded decision consistently (ARCH-REV-001 ARCH-002), states the attempt budget (ARCH-003) and the existing session-isolation invariant (ARCH-001) as preserved behavior. No change of intended behavior, so no renewed approval is needed. SR-005 (2026-10-10): AC-003 strengthened at the user's request ("I think this should be tested, right?" after the summary-quality discussion): side-by-side comparison on a large real conversation plus user review before release. SR-006 (2026-10-11): the cached summary instruction wording was rewritten in the agent's own voice, approved by the user directly with the implementation engineer ("Exactly. I think now it's much natural. Please update."; IR-002, commit 8d0a98eb5). Continuation check added at the user's request ("the summarization … will directly influence the next agent run … the continuation").
- Behavior-defining supplements: `supplements/cached-summary-instruction.md` (cached instruction **v5** + fallback prompt v6), approved by the user 2026-10-11 (SR-007)

## Problem And Desired Outcome

- **Problem:** when a native agent compacts its memory, the summarizer is a separate call. It has its own system prompt and gets the history as new text, so nothing comes from the prompt cache. It is billed at full price. Correction (SR-007, measured in AC-003): the old summarizer sends only the older, compacted part with each item truncated to 2,000 characters, so its cost is lower than first estimated. Measured on Opus 5.5: $0.08 (history A) and $0.37 (history B) per compaction. This cost also does not appear in the Token Meter.
- **Desired outcome:** compaction always uses the agent's own model; the separate compaction-model setting is removed. The summary request reuses the agent's cached conversation: same model, settings, tools, system prompt and messages, plus one appended summarize instruction. It then reads nearly the whole history from cache. Measured: $0.12 (A) and $0.10 (B), so roughly the same cost or lower. The main benefit is summary quality: the model summarizes the full, untruncated conversation, not a truncated text copy of part of it. The summary keeps the existing format and quality, and compaction cost is visible in the Token Meter.
- **Observable success:** on a native Anthropic run that compacts, the summary call's cache read is nearly the whole history; the summary passes the existing checks; the meter shows the compaction call with its cache read.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Separate summarizer call, no cache reuse; only the older part of the history is sent, as truncated text | With the same model: the summary request appends a summarize instruction to the agent's own conversation request and reads it from cache | Compaction trigger, keep-tail plan (retained recent messages, protected suffix), summary checks (format per REQ-003), commit, recovery, deferral during tool rounds; compaction requests never alter or continue the agent's own provider-side conversation session (e.g. AutoByteus remote sessions), and any session created for compaction is released after each attempt, as today | code; probe F1/F2 vs A |
| BEH-002 | User | SCN-002 | Settings → Compaction lets the user choose a compaction model and LLM config; the summarizer uses it | Setting removed. Compaction always uses the agent's own model and settings. A previously saved value is ignored | Other compaction settings (trigger ratio, context override, debug logs) | `compaction-llm-factory.ts`, `CompactionModelSettings.vue`, `server-settings-service.ts` |
| BEH-003 | System | SCN-001 | Compaction usage is not reported to the Token Meter | Compaction calls (fork or separate) are reported, with cache read and write, and priced like other calls (DEC-003) | Existing per-call usage of agent turns | grep |
| BEH-004 | Contract | SCN-001, SCN-003 | Compaction runs only at settled points; preserved-thinking rules hold | Same; the fork is append-only and runs only after the request prefix is confirmed unchanged (otherwise prefix-bound reasoning is removed first) | Delivered prefix guard | prior ticket |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Native agent compacts → summary from its cached conversation, on its own model | SCN-001 |
| UC-002 | The cached summary request fails → existing separate summarizer on the same model | SCN-003 |
| UC-004 | The compaction-model setting no longer exists | SCN-002 |
| UC-003 | User sees compaction cost in the Token Meter | SCN-001 |

### Out Of Scope

- Changing the trigger, the keep-tail planning, or the commit/recovery rules.
- Model-specific compression strategies, and enabling the cached summary for Gemini and other non-Anthropic models (DeepSeek is decided by this Task's rerun). That is a separate follow-up Task (SR-008). The summary output format changes only as approved in REQ-003 (SR-007, nine headings).
- Anthropic server-side compaction (beta). Claude Agent SDK / Codex / AGY runtimes, which compact on their own.
- A compaction-settings UI change.

### Non-Goals

- Choosing a different compaction model (removed: caches are model-scoped, so a separate model can never reuse the cache).

### Preserved Behavior Boundary

BEH-001..004 preserved columns. Compaction results keep the same shape: leading system run + one summary message + retained messages.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion or preserved-behavior ID.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise or operational contract is a `Requirement Gap` and needs explicit user approval first.
- An adjacent concern outside this boundary may be recorded as a non-blocking risk, recommendation or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Compaction always uses the agent's own model. The summary request is the agent's own conversation request for that point: same model and LLM settings, same tools, same system prompt, same messages in the same order, unchanged. One summarize instruction message is appended, and the request is sent as a cacheable conversation request. | BEH-001 | Must | Cache reuse requires an identical prefix | Task; probe F1; user 2026-10-09 |
| REQ-002 | The cached summary request is used only for models whose catalog entry selects it (`compactionSummaryMode: 'cached_conversation'`). In this Task those are the Anthropic catalog models and the DeepSeek catalog models (SR-011: their cached notes are reliably accepted and reuse the cache; their remaining quality gap A is tracked in the follow-up Task). Gemini and every other model (static or dynamic) use the transcript summary on the agent's own model, as today. Per-provider and per-model compaction strategies and configuration belong to the follow-up Task; in this Task, enabling a model is one catalog value. | BEH-001 | Must | Cache reuse where the cached note is reliably accepted (AC-003 rounds 1–3: Opus better; Gemini thinner, so transcript; DeepSeek and Sonnet 5 accepted 6/6 and 2/2). Accepted trade-off (SR-011, user delegation): DeepSeek and Sonnet 5 keep the cached note despite gap A in some samples (an unchecked claim stated as fact). That is not "never worse" on that one item; it is tracked in follow-up Task `project_task_9bf18aea…` | User 2026-10-11 (SR-008; SR-011 delegation) |
| REQ-003 | Both summary paths produce one summary with the same **nine headings**, validated by one parser. The prompts ask for one `<compaction_summary>` block. The parser accepts that block, or a reply that is only the summary: it starts with the first heading, has all nine headings in order and has no markers (SR-011, F-6). Each section has bullets, or is marked empty with `(none)`; a short explanation after or inside it is allowed, e.g. `(none — read-only investigation)` (SR-012, F-9). The headings are: Task and constraints; Requests and instructions received; Decisions and findings; Unverified points and open conflicts; Files created or changed; Completed work; Current state; Open work and next steps; Essential references. The cached request appends the instruction text of `supplements/cached-summary-instruction.md` (**v5**, normative; v4 is history). The transcript fallback uses `COMPACTION_SUMMARY_PROMPT` v6 from the same supplement (normative). The cached summary covers the whole conversation from the first user message (DEC-002) and does not restate the agent's system instructions. The transcript fallback summarizes only the compactable older part it receives, as today. | BEH-001 | Must | Quality: AC-003 gaps A/B; the user's handover-note requirements (files, requests, unverified points) | User 2026-10-11 (IR-002, SR-007) |
| REQ-004 | If the cached summary request returns no valid summary (for example a tool call, a task answer or an invalid format) after 2 attempts, or would not fit the model's context window including its output reservation, compaction falls back to the existing transcript summarizer (summary prompt + rendered older history) on the agent's own model, with the existing attempt budget (3). Every attempt is exactly one provider call (no hidden SDK retries). | BEH-001 | Must | Robustness; the existing attempt budget is preserved | RSK-001/002; ARCH-REV-001 ARCH-003 |
| REQ-005 | The compaction-model setting is removed: the Settings UI no longer offers a compaction model or compaction LLM config; the server no longer accepts or uses the setting; compaction never creates a separate model. A previously saved value is ignored, and startup is unaffected. | BEH-002 | Must | User decision: a separate model can never reuse the cache | User 2026-10-09 |
| REQ-006 | The summary request never violates Anthropic's preserved-thinking rules. It is only made at settled points (never inside a tool round). If the tools or system prompt changed since the agent's previous request, prefix-bound reasoning is removed first, as for a normal request. | BEH-004 | Must | Prevent 400s | prior ticket REQ-012 |
| REQ-009 | A small known output limit must not make compaction impossible, and no model may lose today's behavior. Let R be the agent's resolved request output limit (`config.maxTokens ?? model.maxOutputTokens`, possibly unknown). If R is unknown or R ≥ 16,384, summary requests use exactly the agent's limit, as today. If R < 16,384, the raised limit is L = max(R, min(16,384, the model's maximum output if known, ⌊effective context capacity ÷ 4⌋ if known)). Each summary request (both paths) then uses L_eff = max(R, min(L, room)). Here room = context − estimated input − safety margin; with an unknown context there is no room bound. A summary request is accepted with the same input budget as the agent's own requests, which reserves R. So the summary never accepts less input than today and never gets an output limit below today's. The limit is a per-request, provider-neutral option. The agent's own requests are unaffected. | BEH-001 | Must | CRR-005 F-3 (1,024-token limit → COMPACTION_BLOCKED); ARCH-REV-004 ARCH-005 (no regression on local models without output metadata; budget-thinking models) | User delegation 2026-10-11 (SR-008/SR-009) |
| REQ-008 | Every native provider adapter takes the system prompt of a request from the leading SYSTEM messages of that request's own message list (the Gemini adapter is aligned with all other adapters). For normal agent requests this is the same text as today. System notes carried to the front by compaction now also reach Gemini. | BEH-001 | Must | The fallback (REQ-004) must work on every provider; the request content has one source | CRR-003 F-1; user 2026-10-11 |
| REQ-007 | Compaction model calls are reported to the Token Meter as usage of the agent run, including cache read/write tokens, and priced with the catalog like other calls, so that the meter's total includes compaction cost (DEC-003). | BEH-003 | Should | Meter = Console; user verification | investigation |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario IDs | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Unit: compaction | Summary request = previous conversation request's system, tools, settings and messages, byte-identical, plus one appended user instruction; sent with the conversation cache scope, on the agent's own LLM | — | Unit test |
| AC-002 | REQ-001, REQ-003 | SCN-001 | Live native Anthropic (Opus 5.5) run reaching compaction | Summary call's `cache_read_input_tokens` ≥ 90 % of its input; summary passes the parser; run continues normally after compaction | — | Live validation (test vault) |
| AC-003 | REQ-003 | SCN-001 | Live, on a large real conversation (≥ 200k tokens; e.g. a long native agent or team-member run) reaching compaction on Claude Opus 5.5 | Both the cached summary request and today's transcript summarizer are run on the **same** history, and the summaries are compared side by side against a checklist: goal and constraints, user decisions and preferences, the latest unresolved request, completed vs open work, exact paths/identifiers/commands/errors, next steps, no invented facts, blocked items kept as blocked, user instructions kept distinct from quoted tool/document content, sufficient detail (not over-compressed). The cached summary is at least as complete and correct as today's. **Continuation check:** from each compacted context (cached-summary version and transcript-summary version of the same run), the agent receives the same next user message(s) and continues for a few calls. Evaluated: it knows the current state, respects earlier decisions and constraints, does not redo completed work or lose open items, and uses correct paths and identifiers. The cached version must continue at least as well. SR-008 rerun scope: Claude Opus 5.5, one other Anthropic catalog model (family check) and DeepSeek (`deepseek-v4-flash`; decides REQ-002 enablement), on the same histories A (464,106 tokens) and B (194,548 tokens), with the **v5** instruction and the v6 fallback prompt. Gemini and other non-Anthropic models use the transcript path in this Task, so their cached-path quality is evaluated in the follow-up Task. Additional pass conditions (SR-007):
  - gap A: the 'pre-existing / unrelated / tests verified' claim appears as unverified;
  - gap B: the 'Skill Improver intentionally visible' finding is kept or flagged as a conflict;
  - every file written, edited or deleted by a tool call in the compacted history is listed with its full path (automatic check);
  - nothing from the system prompt is restated;
  - no path is shortened;
  - every request is marked open, done or cancelled;
  - the note never records the compaction instruction itself as a request (durable `assertNoInstructionEcho`).
  **SR-011 release bar per model:**
  - Opus 5.5 must meet the quality pass conditions above. Round 3 met them.
  - The other cached models (Sonnet 5 as the Anthropic family check, and DeepSeek) must have their cached note accepted by the parser and must read the conversation from cache. Their quality findings (gap A) are recorded for the follow-up Task and do not block this release.
  - On the transcript path, Sonnet 5 and DeepSeek on histories A and B must produce an accepted summary within the attempt budget. This is the F-6 rerun.

  The comparison report (summaries + continuation transcripts + checklist verdicts) is reviewed and accepted by the user before release | Cached summary worse on any checklist item → `Requirement Gap`/`Design Impact` back to the Solution Designer before release | Live comparison (API/E2E) + user review |
| AC-004 | REQ-004 | SCN-003 | Unit: fork returns a tool call / invalid summary for all attempts; or context too large | Separate summarizer used; compaction succeeds | — | Unit tests |
| AC-009 | REQ-001, REQ-004 | BEH-001 / SCN-001 | Unit: compaction on an `AutobyteusLLM`-backed agent (fake client) | Each attempt uses its own compaction conversation id (never the agent's id) and releases it after the attempt; the agent's session gets no compaction messages | — | Unit tests |
| AC-010 | REQ-008, REQ-004 | BEH-001 / SCN-003 | Unit + live: transcript fallback on Gemini (API and Vertex); normal Gemini request | Gemini's `systemInstruction` equals the request's leading SYSTEM messages. The fallback summary passes the parser on Gemini. A normal request's `systemInstruction` is unchanged in content (same text as today). With no leading SYSTEM message, no `systemInstruction` is sent | — | Unit tests (request bodies) + live Gemini fallback run |
| AC-011 | REQ-009 | BEH-001 / SCN-001 | (live) the repository's real-provider compaction scenario with `max_tokens: 1024`; (unit) the worked examples in the design (Opus at 1,024; Opus with no limit; Ollama with 8k/32k context and no output metadata, with and without a configured limit; a budget-thinking Anthropic model; DeepSeek at 1,024) | Summary request bodies carry exactly the limit given by the REQ-009 rule (L_eff); compaction succeeds at 1,024; models with an unknown or high limit are unchanged; on Anthropic the summary call still reads the conversation from cache. Near the context limit (SR-010; design boundary examples, e.g. Ollama `maxTokens` 1,024, `num_ctx` 8,192, input 6,500 → 1,436): input + output stays within context − margin. Every input the agent's own budget accepts is accepted on both paths, as today | Unknown limit → no override; context too small → limit bounded by context ÷ 4 and by the room left after the input, never below the agent's own; input above the agent's budget → `input_budget_exceeded`, as today | Unit (port + request bodies) + live |
| AC-005 | REQ-005 | BEH-002 / SCN-002 | Settings page; server with a previously saved compaction-model value | No compaction-model control; the remaining compaction settings work; the saved value has no effect; compaction uses the agent's model | — | Web component test; server unit test |
| AC-006 | REQ-006 | SCN-001 | Unit + live: tools changed before compaction; strict check `"error"` | Prefix-bound reasoning removed before the fork; no 400 | — | Unit + live |
| AC-007 | REQ-007 | SCN-001 | Compaction happens | Token Meter shows the compaction call's tokens (with cache read) and cost in the run totals | — | Unit + user verification |
| AC-008 | REQ-002 | SCN-001 | Compaction on a catalog model marked `cached_conversation` (Anthropic) vs any other model | Marked models send the cached summary request first; all others go straight to the transcript summary on the agent's own LLM; the decision comes from the model entry, with no provider names in memory/agent code | — | Unit tests (summarizer + port + catalog) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Native agent | Keep a long run going | Context reaches the compaction trigger | Default compaction settings (same model) | Compaction at a settled point → fork summary from cache → commit | Cheap compaction, same summary quality, cost visible | Fork fails → separate summarizer | Supported Normal Scenario | code; probe | REQ-001..007 |
| SCN-002 | User | User | Open Settings → Compaction | Settings page | A compaction model may have been saved earlier | View/edit compaction settings | No model choice; the earlier value is ignored | — | Supported Normal Scenario | settings code | REQ-005 |
| SCN-003 | System | Native agent | Robustness | Fork unusable or failing | — | Fallback | Compaction still succeeds | — | Supported Explicit Edge Scenario | RSK-001/002 | REQ-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Measurable Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-002 | Performance (cost) | Summary call cache read ≥ 90 % of its input | Same-model compaction, within cache TTL | Live |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` (compaction output shape unchanged); usage events via the existing pipeline (to confirm in design).

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| Anthropic prompt caching / preserved thinking | Identical prefix; append-only; no edits | platform docs; prior ticket | Prefix drift |
| Delivered caching (anthropic-prompt-caching) | Reuse `promptCacheScope`, the prefix guard and the provider boundary | origin/personal 46e94fdea | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `probes/fork-summary-probe.mjs` + `probes/fork-summary-probe-result.json` + `probes/compaction-prompt.txt` | Feasibility, cost, quality comparison | REQ-001, REQ-003 | Complete | Evidence only |
| `supplements/cached-summary-instruction.md` | **Normative** text of the cached summary instruction (v5 from SR-008; v4 history kept) and the transcript fallback prompt `COMPACTION_SUMMARY_PROMPT` v6 (nine-heading contract) | REQ-003, AC-003 | Approved (SR-007) | Behavior-defining; user-approved 2026-10-11 |
| `supplements/example-self-summary*.md` (v2, v3, v4) | Simulated notes used to refine the instruction with the user | REQ-003 | Complete | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The agent's LLM instance is idle at both compaction sites | Reuse it for the fork | Design | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which providers use the fork? — **Resolved: A (all native providers)** | The fork is the agent's normal request + one message, so OpenAI, DeepSeek and Gemini also benefit from their automatic caching. Only Anthropic is tested live so far | **A (recommended):** every native provider when the compaction model equals the agent model, with the fallback (REQ-004) as the safety net; live validation on Anthropic plus one other provider. **B:** Anthropic only for now | User | Resolved |
| DEC-002 | What does the fork summary cover? — **Resolved: A** | Today the summary covers only the older part, and the recent tail stays word for word. The fork sees the whole conversation | **A (recommended):** keep the keep-tail plan; the summary covers the whole conversation and the recent tail is still kept word for word (some overlap, no loss). **B:** ask the model to summarize only up to the start of the kept tail (fragile). **C:** "simple compaction", summary only, no kept tail (changes compaction behavior) | User | Resolved |
| DEC-003 | Report compaction cost in the Token Meter (REQ-007)? — **Resolved: yes** | Today it is missing, so the meter undercounts against the Console, and you cannot see the cache read when verifying | Recommended: yes | User | Resolved |
| DEC-004 | Compaction LLM settings when the model is the same — **Superseded by REQ-005 (setting removed; the agent's own settings are always used)** | A compaction `llmConfig` (e.g. different thinking) would change the request and break cache reuse | Recommended: the fork always uses the agent's own settings; the compaction `llmConfig` applies only to the separate summarizer | User | Resolved |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-009 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-008 | SCN-001 |
| REQ-003 | UC-001 | BEH-001 | AC-002, AC-003 | SCN-001 |
| REQ-004 | UC-002 | BEH-001 | AC-004 | SCN-003 |
| REQ-005 | UC-004 | BEH-002 | AC-005 | SCN-002 |
| REQ-006 | UC-001 | BEH-004 | AC-006 | SCN-001 |
| REQ-008 | UC-002 | BEH-001 | AC-010 | SCN-003 |
| REQ-009 | UC-001, UC-002 | BEH-001 | AC-011 | SCN-001 |
| REQ-007 | UC-003 | BEH-003 | AC-007 | SCN-001 |

## Architecture Phase Input

- Scenarios to map: SCN-001..003.
- Constraints: identical request prefix; preserved thinking; existing summary contract and compaction shape.
- Deferred to design: where the fork strategy lives and how it gets the agent's LLM, tools and current request prefix; ordering with the prefix guard; fallback wiring; the metering path.
- To verify: the LLM instance is idle at the compaction sites; per-provider behavior (DEC-001).

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: `Yes`; desired/preserved explicit: `Yes`; scope clear: `Yes`; testable: `Yes`; scenarios: `Yes`; assumptions/decisions visible: `Yes`.
- Content ready for user approval: `Yes`. Decisions resolved in SR-002.

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-09, SR-002). Exact basis recorded: `Yes`. Ready for design: `Yes`.
