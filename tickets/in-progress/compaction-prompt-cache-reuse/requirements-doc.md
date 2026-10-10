# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `compaction-prompt-cache-reuse`
- Request / ticket: Project Task `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5`
- Requirements owner: Solution Designer
- Date: 2026-10-09
- Approval state and reference: approved by the user on 2026-10-09. The user proposed "always use the same model … whatever model the agent use, it should use the same model". I recommended removing the compaction-model setting, keeping a same-model fallback for failed attempts, all native providers, a summary covering the whole conversation with the recent tail kept, and Token Meter reporting, then asked "Approve these". The user answered "Yeah, exactly, that's what I mean, because if you don't use the same model, then you do not take advantage of the cache … It seems to be like a flexibility, but actually it's not."
- Exact approved requirements baseline / solution revision: SR-002 of this document. SR-004 restates the recorded decision consistently (ARCH-REV-001 ARCH-002), states the attempt budget (ARCH-003) and the existing session-isolation invariant (ARCH-001) as preserved behavior. No change of intended behavior, so no renewed approval is needed. SR-005 (2026-10-10): AC-003 strengthened at the user's request ("I think this should be tested, right?" after the summary-quality discussion): side-by-side comparison on a large real conversation plus user review before release. Continuation check added at the user's request ("the summarization … will directly influence the next agent run … the continuation").
- Behavior-defining supplements: None (probe evidence only)

## Problem And Desired Outcome

- **Problem:** when a native agent compacts its memory, the summarizer is a separate call. It has its own system prompt and gets the history as new text, so nothing comes from the prompt cache. The whole history is billed at full price (about $3.20 per Opus 5.5 compaction at 80 % of a 1M window). This cost also does not appear in the Token Meter.
- **Desired outcome:** compaction always uses the agent's own model; the separate compaction-model setting is removed. The summary request reuses the agent's cached conversation: same model, settings, tools, system prompt and messages, plus one appended summarize instruction. It then reads nearly the whole history from cache (about $0.16 instead of $3.20). The summary keeps the existing format and quality, and compaction cost is visible in the Token Meter.
- **Observable success:** on a native Anthropic run that compacts, the summary call's cache read is nearly the whole history; the summary passes the existing checks; the meter shows the compaction call with its cache read.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Separate summarizer call, no cache reuse; only the older part of the history is sent, as truncated text | With the same model: the summary request appends a summarize instruction to the agent's own conversation request and reads it from cache | Compaction trigger, keep-tail plan (retained recent messages, protected suffix), summary format and checks, commit, recovery, deferral during tool rounds; compaction requests never alter or continue the agent's own provider-side conversation session (e.g. AutoByteus remote sessions), and any session created for compaction is released after each attempt, as today | code; probe F1/F2 vs A |
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

- Changing the trigger, the keep-tail planning, the summary prompt's required output format, or the commit/recovery rules.
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
| REQ-002 | The cached summary request is used for every native-runtime provider. Providers without prompt caching still work through the same request. | BEH-001 | Must | — | DEC-001 |
| REQ-003 | The summary keeps the existing contract: one `<compaction_summary>` block with the six headings, validated by the existing parser. Its content covers the conversation as DEC-002 decides, and it does not restate the agent's system instructions, which stay in place. | BEH-001 | Must | Quality unchanged | Task; probe |
| REQ-004 | If the cached summary request returns no valid summary (for example a tool call, a task answer or an invalid format) after 2 attempts, or would not fit the model's context window including its output reservation, compaction falls back to the existing transcript summarizer (summary prompt + rendered older history) on the agent's own model, with the existing attempt budget (3). Every attempt is exactly one provider call (no hidden SDK retries). | BEH-001 | Must | Robustness; the existing attempt budget is preserved | RSK-001/002; ARCH-REV-001 ARCH-003 |
| REQ-005 | The compaction-model setting is removed: the Settings UI no longer offers a compaction model or compaction LLM config; the server no longer accepts or uses the setting; compaction never creates a separate model. A previously saved value is ignored, and startup is unaffected. | BEH-002 | Must | User decision: a separate model can never reuse the cache | User 2026-10-09 |
| REQ-006 | The summary request never violates Anthropic's preserved-thinking rules. It is only made at settled points (never inside a tool round). If the tools or system prompt changed since the agent's previous request, prefix-bound reasoning is removed first, as for a normal request. | BEH-004 | Must | Prevent 400s | prior ticket REQ-012 |
| REQ-007 | Compaction model calls are reported to the Token Meter as usage of the agent run, including cache read/write tokens, and priced with the catalog like other calls, so that the meter's total includes compaction cost (DEC-003). | BEH-003 | Should | Meter = Console; user verification | investigation |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario IDs | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Unit: compaction | Summary request = previous conversation request's system, tools, settings and messages, byte-identical, plus one appended user instruction; sent with the conversation cache scope, on the agent's own LLM | — | Unit test |
| AC-002 | REQ-001, REQ-003 | SCN-001 | Live native Anthropic (Opus 5.5) run reaching compaction | Summary call's `cache_read_input_tokens` ≥ 90 % of its input; summary passes the parser; run continues normally after compaction | — | Live validation (test vault) |
| AC-003 | REQ-003 | SCN-001 | Live, on a large real conversation (≥ 200k tokens; e.g. a long native agent or team-member run) reaching compaction on Claude Opus 5.5 | Both the cached summary request and today's transcript summarizer are run on the **same** history, and the summaries are compared side by side against a checklist: goal and constraints, user decisions and preferences, the latest unresolved request, completed vs open work, exact paths/identifiers/commands/errors, next steps, no invented facts. The cached summary is at least as complete and correct as today's. **Continuation check:** from each compacted context (cached-summary version and transcript-summary version of the same run), the agent receives the same next user message(s) and continues for a few calls. Evaluated: it knows the current state, respects earlier decisions and constraints, does not redo completed work or lose open items, and uses correct paths and identifiers. The cached version must continue at least as well. The comparison report (summaries + continuation transcripts + checklist verdicts) is reviewed and accepted by the user before release | Cached summary worse on any checklist item → `Requirement Gap`/`Design Impact` back to the Solution Designer before release | Live comparison (API/E2E) + user review |
| AC-004 | REQ-004 | SCN-003 | Unit: fork returns a tool call / invalid summary for all attempts; or context too large | Separate summarizer used; compaction succeeds | — | Unit tests |
| AC-009 | REQ-001, REQ-004 | BEH-001 / SCN-001 | Unit: compaction on an `AutobyteusLLM`-backed agent (fake client) | Each attempt uses its own compaction conversation id (never the agent's id) and releases it after the attempt; the agent's session gets no compaction messages | — | Unit tests |
| AC-005 | REQ-005 | BEH-002 / SCN-002 | Settings page; server with a previously saved compaction-model value | No compaction-model control; the remaining compaction settings work; the saved value has no effect; compaction uses the agent's model | — | Web component test; server unit test |
| AC-006 | REQ-006 | SCN-001 | Unit + live: tools changed before compaction; strict check `"error"` | Prefix-bound reasoning removed before the fork; no 400 | — | Unit + live |
| AC-007 | REQ-007 | SCN-001 | Compaction happens | Token Meter shows the compaction call's tokens (with cache read) and cost in the run totals | — | Unit + user verification |
| AC-008 | REQ-002 | SCN-001 | Compaction on any native provider | The cached summary request is used (no provider-specific branch); live check on Anthropic and one other provider | — | Unit |

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
