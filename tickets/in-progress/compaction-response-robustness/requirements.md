# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined — user approved 2026-08-14`

## Goal / Problem Statement

Make automatic memory compaction reliably perform the compaction task even when the enclosed conversation resembles an unfinished agent workflow, while preserving the original six-array model response contract and atomic memory persistence.

The reported failure was not caused by Markdown fences or harmless commentary around valid JSON. Two later compactor runs misunderstood the quoted conversation as an active CER/Vue task, emitted source-task `run_bash` calls, and returned no compacted memory object. The target behavior must fix that task/evidence ambiguity, tolerate benign response formatting, recover once from invalid output, and never accept unrelated prose as canonical memory.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The mandatory context-building processor wraps every input with a sender-type Markdown heading: `[User Requirement]`, `[Tool Execution Result]`, `[Message From Agent]`, or `[System Notification]`. The user heading is redundant with the provider user role and often inaccurate. Native tool results are already retained/rendered as provider-native tool messages; the `SenderType.TOOL` object is now primarily an internal continuation carrier and normally produces no additional LLM user message. Current inter-agent and system-notification builders already render explicit source/task wording. The compactor then places generic `<conversation_history>` immediately after `[User Requirement]`; in the reported later attempts the model treated the history as its own requirement and resumed the source task. | Remove the generic sender-heading map globally. Pass message content through unchanged when no readable context is concatenated. When context and message share one payload, use only neutral `[Context]` and `[Message]` section boundaries. Preserve `senderType` metadata and provider-native tool history; let tool, inter-agent, and system-notification owners render any source wording their specific payload requires. Refine only a few words in the compactor description/opening, rename the sole wrapper to `<target_agent_conversation_history>`, preserve its rendered inner content, precede it with one short identification sentence, and surround it with one conspicuous plain-text start/end separator. | Provider role mapping, native tool-call/result pairing, same-turn tool continuation, inter-agent/system notification lifecycle metadata, and generated system-prompt sections remain unchanged. The compaction message contains no duplicated task instructions, post-history command, old-tag alias, dual wrapper, or additional XML hierarchy. | REQ-001; AC-001, AC-002 |
| BEH-002 | The current strategy requests one object with six named arrays and the original prompt explains every category. The parser accepts prose and fences around a valid object, but validates only the first parseable object and rejects harmless extra fields. | Preserve the original six-array prompt section verbatim. As defense in depth, tolerate surrounding prose/fences and harmless extra fields, and select candidates by the preserved compaction schema rather than by first-JSON position. | All six named arrays, their entry shapes, category meanings, and at least one nonblank episode remain required. | REQ-002, REQ-003, REQ-004; AC-003–AC-007 |
| BEH-003 | One invalid or misdirected response immediately fails the compaction lifecycle; entering “continue” causes another full attempt, which can repeat the same misunderstanding. | One bounded corrective attempt occurs automatically before final failure; success commits once, while exhausted repair reports one final diagnostic failure. | No unbounded retry or automatic fallback-model loop is introduced. | REQ-005, REQ-006; AC-008–AC-010 |
| BEH-004 | The host normalizes typed results, assigns IDs/timestamps/salience, archives exact selected raw traces, persists episodic/semantic rows and lineage, builds the Markdown-like memory message, replaces working context, and clears pending state only through the accepted-compaction commit path. | The preserved response contract continues into the same host-owned result and atomic commit path. Invalid attempts never advance any canonical output. | Typed memory categories, Memory Inspector meaning, final prompt headings/order, lineage membership, deterministic identities, and safe-failure invariants remain unchanged. | REQ-007, REQ-008; AC-010, AC-011 |
| BEH-005 | The built-in compactor has zero tools and runs with `autoExecuteTools: false`; tool approval is a compaction failure. A separate Daily Assistant `write_file` call failed because that normal agent lacked the tool, then recovered with `run_bash`. | This robustness fix does not grant generic filesystem tools to the compactor or broaden the normal assistant's tool policy. | Least authority and host-owned validation/commit remain in force. | REQ-009; AC-012 |
| BEH-006 | Existing successful lineage records use prompt contract versions 1 or 2; canonical memory is stored separately from transient model responses. | New successes record prompt contract version 3 while existing versions remain readable without rewriting stored memory. | Existing episodic, semantic, lineage, raw-trace archive, and working-context snapshot data remains usable. | REQ-010; AC-013 |

## Investigation Findings

- The parent run was `daily_assistant_2a39c68eb96443ada6f5af9f4f81acef`, using strategy `structured-json` and model `deepseek-v4-flash`.
- Earlier compactor runs `memory_compactor_da3d2793f9244876b0c9bc81e95e5be9` and `memory_compactor_d305bed6091947f1984e2159f285e789` returned valid six-array summaries and committed successfully.
- Later runs `memory_compactor_506ea3c502f34687a3f6004a08364364` and `memory_compactor_e1f5d8b1cc884f66a4d4c9918639ba30` received the same 71,043-character input. Both output commentary continuing the CER/Vue task and DSML `run_bash` invocations; neither output contained a compaction object.
- The failed input was prefixed `**[User Requirement]**`, then contained the history, and ended with a normal source-task tool result followed by `</conversation_history>`. `WorkingContextCompactionPromptBuilder` adds no task directive after that boundary. The processed system prompt separately tells the zero-tool compactor to use Bash and perform workspace/file operations.
- The current parser accepts exact JSON, fenced JSON, and prose around a valid object. It fails when an unrelated valid object precedes the intended object because it returns the first parseable object before schema validation.
- The model response structure is transient. Host code, not the model, owns persistent identities, timestamps, salience, lineage, exact trace archival, working-context replacement, and the final Markdown projection.
- Free-form Markdown would be too weak: it could accept the exact wrong-task prose/tool-call output as memory. The user explicitly chose to preserve the original six-array schema because its detailed category explanations are already clear and the authored `agent.md` should receive only minimal wording changes.
- The screenshot's `write_file` failure is a separate normal-agent configuration error and was immediately recovered through `run_bash`; it did not cause compaction failure.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `memory-compactor-prompt-spec.md` | Exact prompt wording and final operation-message shape | REQ-001, REQ-002 | AC-001–AC-003 | Approved 2026-08-14 | Exact implementation text for the target-agent `agent.md`, verbatim original six-array response section, global sender-heading removal effect, and separator framing; implementation must not paraphrase it. |
| `prompt-confusion-root-cause.md` | Evidence-backed final-prompt anatomy and causal analysis | REQ-001 | AC-001, AC-002 | Evidence; approval N/A | Separates the prompt root cause from parser/schema consequences and records why the recurrent continuation projection is confusing. |
| `compaction-output-contract-decision.md` | Intended-behavior decision and option matrix | REQ-001–REQ-010 | AC-001–AC-013 | Approved 2026-08-14 | Defines the approved preserved six-array response contract, task framing, repair boundary, tool decision, and compatibility posture. |
| `evidence/failed-compactor-outputs.json` | Focused runtime evidence | REQ-001, REQ-003–REQ-006 | AC-001, AC-002, AC-008–AC-010 | Evidence; approval N/A | Retains the failed prompt tail and public assistant outputs showing source-task continuation. |
| `evidence/failed-compactor-final-system-prompt.md` | Exact processed-prompt evidence | REQ-001 | AC-001 | Evidence; approval N/A | Preserves the complete 5,466-character system prompt actually configured on the failed compactor model, including generated generic sections. |
| `evidence/successful-compactor-output-comparison.json` | Same-run comparison evidence | REQ-001, REQ-002, REQ-010 | AC-001, AC-003, AC-013 | Evidence; approval N/A | Shows that earlier compactions from the same parent/model produced valid structured summaries and lineage. |
| `evidence/parser-tolerance-probe.jsonl` | Executed parser behavior probe | REQ-003, REQ-004 | AC-004–AC-007 | Evidence; approval N/A | Proves current tolerance for prose/fences and the first-parseable-object defect. |
| `evidence/daily-assistant-compaction-failure.png` | User-provided UI evidence | REQ-006, REQ-009 | AC-009, AC-012 | Evidence; approval N/A | Establishes user-visible error ordering and separate `write_file`/compaction messages. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix` plus bounded `Behavior Change`, local contract refactor, and clean-cut obsolete-format cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant` at the task/evidence boundary, `Legacy Or Compatibility Pressure` in the obsolete generic sender-heading layer, and `Shared Structure Looseness` in response candidate selection.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed` within the compaction prompt/parser/attempt boundary; generic file-backed output is deferred.
- Evidence basis: two identical-input failures continued the source task; the operation prompt is only a history block; the shared processor injects redundant headings even though current native-tool, inter-agent, and system-notification owners already carry the required semantics; parser probing exposes candidate-order coupling. The user determined that the original response section is already clear and must remain unchanged.
- Requirement or scope impact: the fix must cleanly remove obsolete shared sender-heading rendering, minimally refine compactor task framing, harden candidate selection/validation, add one-attempt recovery and diagnostics, and advance lineage prompt-contract metadata while preserving the six-array response contract, active sender metadata, and accepted-compaction commit boundary.

## Recommendations

1. Remove the generic sender-heading map from the shared context-building processor. Use raw message content when no readable context is concatenated and neutral `[Context]` / `[Message]` sections when both share one payload. Preserve `senderType` as runtime metadata, provider-native tool messages, and origin-specific wording owned by tool/inter-agent/system payload builders. For compaction, also make only minimal target-agent/conversation-history wording refinements in the otherwise preserved `agent.md`, preserve the current history block verbatim, and add only a short identification sentence plus one plain-text start/end separator.
2. Preserve the original six-array response instructions verbatim, including every category explanation, empty-array rule, and complete JSON example.
3. As defense in depth, make parsing schema-aware across all exact, fenced, and balanced-object candidates using the preserved six-array schema; accept one distinct valid object and reject zero or multiple valid objects.
4. As defense in depth, make one automatic corrective attempt for invalid/misdirected output, then fail once with actionable attempt metadata.
5. Keep generic `write_file` and arbitrary Markdown out of this fix; retain host-owned validation and atomic commit.
6. Bump the prompt contract to version 3 without rewriting existing persisted memory.
7. Make the sender-heading replacement clean-cut: remove the obsolete heading map and old rendering expectations rather than retaining a feature flag, compatibility branch, alias, or dormant fallback.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`. The changes are bounded but span global input formatting, the compaction task boundary, parser candidate selection, retry lifecycle, diagnostics, tests, documentation, and lineage versioning on a production-critical path. The model response schema itself remains unchanged.

## In-Scope Use Cases

- **UC-001:** Automatic recurring compaction succeeds on the first model response without continuing an enclosed source task.
- **UC-002:** A valid response remains acceptable when fenced or surrounded by commentary, or when unrelated JSON-like content is also present.
- **UC-003:** An invalid/misdirected first output is corrected automatically by one repair attempt.
- **UC-004:** Two invalid outputs fail safely with one final user-visible failure and actionable operational evidence.
- **UC-005:** Successful output continues to populate typed current memory, lineage, Memory Inspector categories, and the final continuation projection.
- **UC-006:** Runs with existing prompt-contract-v1/v2 lineage and memory continue without migration.

## Out of Scope

- Granting the compactor `write_file`, `run_bash`, or any generic workspace tool.
- Broadening the Daily Assistant's ordinary tool configuration.
- Accepting arbitrary Markdown as canonical compactor output.
- Adding a nested or multi-section XML prompt hierarchy or retaining the obsolete `<conversation_history>` tag as an alias/second wrapper; `<target_agent_conversation_history>` is the sole target envelope.
- Changing provider-level role mapping, native tool-call/result rendering, or the semantic content rendered by inter-agent/system-notification owners.
- Removing the active `SenderType` metadata model or the active internal `SenderType.TOOL` continuation carrier; these are runtime semantics, not the obsolete Markdown-heading layer.
- Reordering or removing the generated `Working Environment`, `Bash Operating Practice`, or `File And Directory Practice` sections as part of this prompt-clarity correction.
- Building an isolated file-backed compaction provider.
- Adding unbounded retries, automatic provider/model fallback, or human approval during automatic compaction.
- Changing memory category semantics, salience policy, selection policy, exact-trace archival policy, Memory Inspector information architecture, or compaction thresholds.
- Rewriting existing memory or lineage solely to match the new transient response contract.

## Functional Requirements

- **REQ-001 — Accurate input and compaction task boundaries:** Remove the generic sender-heading map (`[User Requirement]`, `[Tool Execution Result]`, `[Message From Agent]`, and `[System Notification]`) from the mandatory context-building processor. Preserve raw message content without a replacement header when no readable context is concatenated. When readable `[Context]` and a message share one payload, delimit the latter with the neutral `[Message]` label. This is a clean-cut replacement: remove the obsolete heading-rendering branch and its old test expectations without a compatibility flag, dual-format path, alias, or fallback. Preserve the active `senderType` metadata model and existing source-specific payload rendering. Preserve provider-native tool-call/result messages and the rule that a text-only `SenderType.TOOL` continuation produces no additional LLM user message; a media/context continuation may still produce the auxiliary user/media carrier required by the provider, using its builder-owned self-describing content rather than a generic wrapper. Refine the Memory Compactor description and opening wording so they state that the compactor summarizes the conversation history of a target agent so the target agent can continue later. Preserve the remaining authored compactor instructions except for corresponding minimal references from generic `agent`/`history` wording to `target agent`/`conversation history`; do not add prohibitive instructions about continuing tasks or performing actions. Rename the sole outer history wrapper from `<conversation_history>...</conversation_history>` to `<target_agent_conversation_history>...</target_agent_conversation_history>` and preserve the rendered inner history content and other rendering rules; update delimiter-collision escaping for the renamed tag. Do not retain the old tag as an alias or second wrapper. Add only the approved concise sentence identifying the block as the conversation history of the target agent whose conversation history needs to be compacted and saying that this conversation history lies between the following separators. Surround the renamed block with one plain-text `START OF TARGET AGENT CONVERSATION HISTORY` / `END OF TARGET AGENT CONVERSATION HISTORY` separator pair. Add no task restatement after the end separator. Preserve the current generated system-prompt section order and common sections. The complete approved text in `memory-compactor-prompt-spec.md` is authoritative and must be applied exactly; implementation must not invent, paraphrase, or reorder the prompt wording.
- **REQ-002 — Preserve the original structured response:** Preserve verbatim the original `agent.md` response section beginning `Return one JSON object with these fields:` through its complete six-array JSON example. The required fields remain `episodes`, `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, and `important_artifacts`; episode entries retain `summary`, fact-category entries retain `fact`, every array remains required, and at least one non-empty episode remains required. Do not introduce an `items`/`kind`/`text` contract.
- **REQ-003 — Benign-format tolerance:** Response handling must accept one valid envelope when it is the whole response, inside a Markdown JSON fence, or surrounded by visible prose; unrelated parseable JSON objects must not mask it.
- **REQ-004 — Semantic validation:** A successful response must contain all six required arrays and at least one nonblank `episodes[].summary`; the five fact categories retain `fact` entries. Multiple distinct schema-valid compaction objects must be rejected; blank/non-string entries may be discarded when the required episode invariant still holds; harmless extra fields must not cause failure.
- **REQ-005 — Bounded repair:** When the first output contains no unambiguous valid envelope or fails semantic validation, the same pending operation must make exactly one automatic corrective attempt and must not commit the first output.
- **REQ-006 — Coherent lifecycle and diagnostics:** A repair success must produce one completed operation without an intermediate user-visible failed lifecycle. Exhausted repair must produce one final failed lifecycle that identifies the validation stage and both attempt run IDs when available.
- **REQ-007 — Atomic safe failure:** No failed attempt may archive selected raw traces, add or change episodic/semantic rows, append lineage, replace working context/snapshot, or clear the pending compaction. A successful operation must use the existing accepted-compaction commit boundary and commit exactly once.
- **REQ-008 — Preserve typed memory outcome:** The parsed six-array response must continue producing the existing typed internal result so current normalization, deduplication, category ordering/salience, IDs/timestamps, Memory Inspector categories, and final Markdown-like continuation message remain behaviorally unchanged.
- **REQ-009 — Preserve least authority:** The compactor must remain tool-free for this change, and ordinary agent tool policy must not be changed as a side effect.
- **REQ-010 — Version and stored-data compatibility:** New successful lineage must record prompt contract version 3; normal lineage reading must accept versions 1, 2, and 3; existing canonical memory and lineage must remain directly usable without migration.

## Acceptance Criteria

- **AC-001 (UC-001):** Any sender-type input without concatenated readable context retains its authored content without a generic sender heading; an input with concatenated readable context uses `[Context]` and `[Message]` as separate sections. No compatibility option or normal runtime branch can restore the removed generic headings. `senderType` metadata, native tool-call/result rendering, null additional LLM message for text-only tool continuation, and source-specific inter-agent/system content remain intact. Given a history ending in a source-task tool result, the final processed system prompt describes compaction in terms of a target agent and otherwise preserves its current section order, while the compaction user message preserves the rendered inner history content, uses exactly one `<target_agent_conversation_history>...</target_agent_conversation_history>` wrapper with no old-tag alias/additional XML hierarchy, identifies it as the target agent's conversation, surrounds it with exactly one plain-text start/end separator pair, and contains no text after the end separator.
- **AC-002 (UC-001):** A compactor output consisting only of source-task commentary and/or tool-call markup is not accepted or committed as memory.
- **AC-003 (UC-001/UC-005):** The exact original six-array object with at least one nonblank `episodes[].summary` parses into the same episode and semantic categories consumed by the accepted-compaction path; no `items` contract is requested or required.
- **AC-004 (UC-002):** Exact valid envelope JSON parses successfully.
- **AC-005 (UC-002):** The same valid envelope parses successfully when fenced or surrounded by prose.
- **AC-006 (UC-002):** An unrelated JSON object before one valid compaction envelope does not cause false rejection; the schema-valid compaction candidate is selected.
- **AC-007 (UC-002):** A missing required array, no nonblank episode, wrong recognized entry shape, or two distinct valid compaction objects produces a validation error and no commit; harmless extra fields do not.
- **AC-008 (UC-003):** An invalid first output causes exactly one automatic corrective attempt under the same pending compaction operation and does not mutate canonical memory before the correction is validated.
- **AC-009 (UC-003):** If the corrective output is valid, the operation emits one completed lifecycle, performs one canonical commit, and does not surface a failed compaction card for the recovered first attempt.
- **AC-010 (UC-004):** If both outputs are invalid, the operation emits one final failed lifecycle with validation-stage context and available run IDs, retains the pending operation, and leaves raw archives, memory rows, lineage, and working context/snapshot unchanged.
- **AC-011 (UC-005):** A successful version-3 compaction still renders `Earlier progress` plus only the populated existing category headings in current category order, and current Memory Inspector category semantics remain unchanged.
- **AC-012 (UC-001/UC-004):** The built-in compactor agent configuration still exposes no generic tools, and the Daily Assistant tool list is unchanged by this work.
- **AC-013 (UC-006):** Representative existing lineage chains containing prompt contract versions 1 and/or 2 load successfully beside new version-3 records without rewriting stored files.

## Constraints / Dependencies

- Model instructions improve behavior but are not treated as deterministic syntax enforcement; host parsing and validation remain authoritative.
- Automatic repair adds one additional model invocation only on invalid output and must remain bounded.
- Canonical memory commit ordering and optimistic baseline/lineage checks remain host-owned.
- Compactor private reasoning is not part of the collected assistant output and must remain irrelevant to parsing.
- The response envelope is strategy-specific; the generic `WorkingContextCompactionStrategy` abstraction must not be redefined as universally JSON-based.
- Documentation and tests must preserve the six-array prompt contract while updating task framing, parser robustness, repair behavior, global input formatting, and prompt contract version 3.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: run-local `episodic.jsonl`, `semantic.jsonl`, `compaction_lineage.jsonl`, exact raw-trace archive/manifest, and `working_context_snapshot.json` under the existing agent memory root.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve all existing canonical memory, snapshots, archives, and prompt-contract-v1/v2 lineage unchanged.
- Unacceptable data loss or corruption: advancing any canonical store from an invalid/misdirected attempt; rejecting existing supported lineage solely because new responses use version 3; accepting source-task prose as memory.
- Relevant availability, maintenance-window, or rollout constraints: normal process restart/deployment is sufficient; in-flight old transient model responses need no compatibility conversion.
- Related requirement and acceptance-criteria IDs: REQ-007, REQ-008, REQ-010; AC-003, AC-008–AC-011, AC-013.

## Assumptions

- The user's word “adjacent” means JSON.
- The captured local traces correspond to the screenshot's supported Daily Assistant run.
- The six semantic distinctions remain product-relevant because they drive stored type, ordering/salience, Memory Inspector presentation, and final continuation headings.
- One automatic repair attempt provides a proportionate reliability improvement without hiding persistent provider or prompt failures.

## Risks / Open Questions

- A model can still produce semantically poor but syntactically valid memory; deterministic validation can enforce shape and minimum continuation content, not factual summarization quality.
- The approved bounded-repair behavior is now resolved in `design-spec.md` as a new child run with a deterministic correction prefix; both available child run IDs remain observable on exhausted repair.
- Adding one repair attempt increases worst-case compaction latency and token cost.
- If future evidence shows response transport truncation rather than task drift, an isolated staged-file provider may deserve a separate design; generic workspace file access remains unsafe.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-003 |
| REQ-002 | UC-001, UC-005 |
| REQ-003 | UC-002 |
| REQ-004 | UC-002, UC-004 |
| REQ-005 | UC-003, UC-004 |
| REQ-006 | UC-003, UC-004 |
| REQ-007 | UC-003, UC-004, UC-005 |
| REQ-008 | UC-005 |
| REQ-009 | UC-001, UC-004 |
| REQ-010 | UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001–AC-003 | Prevent the exact observed source-task continuation and prove the preserved six-array response still feeds canonical memory. |
| AC-004–AC-007 | Exercise exact, fenced, prose-wrapped, unrelated-object, missing-array, wrong-entry-shape, empty-episode, extra-field, and ambiguous-candidate parser scenarios. |
| AC-008–AC-010 | Exercise first-attempt recovery and exhausted-repair lifecycle/atomicity, including store snapshots before and after. |
| AC-011 | Regression-check final prompt projection and typed category behavior. |
| AC-012 | Regression-check least-authority agent definitions and launch configuration. |
| AC-013 | Load representative v1/v2 and mixed v1/v2/v3 lineage without migration. |

## Approval Status

Approved by the user on 2026-08-14. After reviewing the proposed `items` alternative, the user explicitly chose to preserve the original six-array response section verbatim because the existing `agent.md` is already approximately 99% correct and only minimal target-agent/conversation-history wording should change. `memory-compactor-prompt-spec.md` is the exact approved implementation authority; downstream implementation must not author alternate wording or introduce an `items` schema.
