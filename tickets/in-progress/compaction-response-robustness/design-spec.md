# Design Spec

## Current-State Read

Automatic compaction is initiated during parent LLM request assembly after the memory manager has already recorded a pending compaction operation. `PendingCompactionExecutor` owns that parent operation's `started`/`completed`/`failed` lifecycle. It resolves `StructuredJsonCompactionStrategy`, which plans a settled prefix, calls `AgentCompactionSummarizer`, normalizes the parsed result, and returns an ID-less proposal. `MemoryManager` then owns optimistic baseline/lineage checks, accepted-output construction, validation, and the only canonical commit path.

The failure occurs below that healthy operation/commit boundary. The current summarizer builds one task whose user message is only a renderer-produced `<conversation_history>` block. The mandatory server input processor then prefixes it with `**[User Requirement]**`. The built-in compactor prompt refers to “earlier work” and “the same agent.” In the retained production trace, the enclosed target history itself starts with a continuation instruction and ends after a successful source-task tool result. Two child models consequently selected the enclosed source task and returned commentary/tool markup instead of compaction JSON.

The current parser is more tolerant than the UI error alone suggests: exact JSON, fenced JSON, and prose-wrapped JSON work. Its defect is ordering—`parseObject` returns the first parseable object before checking the six-array schema—and its validation rejects otherwise harmless extra fields. The current summarizer makes one child call only, so any invalid response reaches `PendingCompactionExecutor`, which emits the terminal parent failure immediately.

The existing owners remain appropriate for this scope:

- `UserInputContextBuildingProcessor` owns readable context-file concatenation, but it should not invent sender semantics already represented by `senderType`, provider roles, and source-specific builders.
- `CompactionConversationHistoryRenderer` owns the canonical selected transcript and its sole XML-style delimiter.
- `WorkingContextCompactionPromptBuilder` owns the operation-message framing around that transcript.
- `AgentCompactionSummarizer` owns the model-attempt sequence and the transition from model text to parsed compaction result.
- `CompactionResponseParser` owns candidate extraction and the six-array validation boundary.
- `ServerCompactionAgentRunner` owns exactly one visible child-run lifecycle per call and already guarantees termination in `finally`.
- `PendingCompactionExecutor` owns the single terminal lifecycle for the parent compaction operation.
- `AcceptedCompactionBuilder` / `AcceptedCompactionCommitter` own host-generated identities, lineage, projection, persistence ordering, snapshot installation, and pending-state clearing.

The current-state evidence and exact reproduction are in `investigation-notes.md`, `prompt-confusion-root-cause.md`, and the retained trace/prompt evidence. The target must preserve the healthy planning, accepted-compaction, tool-protocol, provider-role, and parent lifecycle boundaries.

## Intended Change

Make the target-agent boundary unmistakable with the exact approved prompt text; remove the obsolete global sender-heading map; preserve the original six-array model response instructions verbatim; make response candidate selection schema-aware and tolerant of harmless extras; and place one bounded corrective child attempt inside `AgentCompactionSummarizer` before the parent operation may fail.

The first attempt uses the exact approved operation message. A response-validation failure causes one new child run with a short deterministic correction prefix before the same approved task message. A valid first or corrective response flows through the existing normalization/proposal/accept/commit path. If correction is exhausted, one structured error names both validation stages and both available child run IDs; only then does `PendingCompactionExecutor` emit the single parent failure. Runner/transport failure before a first response remains immediately terminal because the approved repair is for invalid returned content, not provider availability or timeout recovery.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001, AC-002 | Parent token budget crosses the supported automatic-compaction threshold before dispatch | Current history-only prompt, generic heading injection, and wrong-task child outputs; investigation rows BEH-001 and source-log rows 63–70 | Exact target-agent system wording, renamed sole wrapper, exact separator message, and no generic sender heading; source transcript content and generated common system sections remain unchanged | Parent request assembly -> pending executor -> structured strategy -> summarizer -> prompt builder/renderer -> new visible child run; DS-001, DS-002, DS-004 |
| BEH-002 | Contract | REQ-002–REQ-004; AC-003–AC-007 | `structured-json` strategy receives public assistant text from a completed compactor child | Parser probe proves prose/fence tolerance and first-unrelated-object masking; investigation BEH-002 | Preserve six arrays and entry meanings; validate all candidates by schema, ignore harmless extras, select one semantic result, reject zero or multiple distinct valid results | Collector -> schema-aware parser -> `CompactionResult`; DS-001, DS-003 |
| BEH-003 | Operational | REQ-005–REQ-007; AC-008–AC-010 | First child returns content that fails extraction, six-array validation, or ambiguity validation | Current one-shot failure reaches pending executor immediately; investigation BEH-003 | Summarizer launches exactly one new correction child before returning/failing; no intermediate parent failed status; exhaustion carries stages and available run IDs | Summarizer bounded attempt loop -> strategy result/error -> pending executor terminal lifecycle; DS-001, DS-003, DS-004 |
| BEH-004 | System / Contract | REQ-007, REQ-008; AC-009–AC-011 | Parser returns one valid typed result and captured baseline is still current | Existing proposal/prepare/validate/commit path is healthy; investigation BEH-004 | Preserve normalization, host-generated identities/salience, lineage membership, exact trace archival, context projection, ordered commit, and single pending clear | Parser -> strategy proposal -> memory manager prepare -> validator -> accepted committer -> completed event; DS-001, DS-003 |
| BEH-005 | User / Operational | REQ-009; AC-002, AC-012 | Parent or compactor attempts a tool call | Compactor config is empty; runner disables auto-execution; collector fails approval; parent `write_file` was separate and recovered | No compactor tool or Daily Assistant tool-policy change; source-task commentary/tool markup still cannot become memory | Child event -> output collector failure or parser rejection -> bounded/content-specific repair or final operation failure; DS-002, DS-003 |
| BEH-006 | Contract | REQ-010; AC-011, AC-013 | Existing/new lineage is loaded or a successful compaction appends lineage | Existing data has schema-v1 lineage with prompt versions 1/2; current reader accepts 1/2; investigation BEH-006 | New records use prompt version 3; version-agnostic reader accepts 1/2/3 directly; no stored data rewrite | Accepted builder -> lineage store; lineage store -> current-output loader/projection; DS-001, DS-005 |

The behavior map defines the supported behavior. The following spines show how the target owners carry it.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/memory-compactor-prompt-spec.md` | Exact `agent.md` and first-attempt operation-message wording | REQ-001, REQ-002; AC-001–AC-003 | Exact text authority; implementation must copy, not paraphrase | User approved 2026-08-14 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/prompt-confusion-root-cause.md` | Causal prompt anatomy | REQ-001; AC-001, AC-002 | Establishes why target-agent wording/framing is the root fix and why extra XML hierarchy is rejected | Evidence/context; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/compaction-output-contract-decision.md` | Response/repair/tool/persistence decisions | REQ-001–REQ-010; AC-001–AC-013 | Constrains parser, retry, least-authority, and compatibility design | User approved 2026-08-14 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/failed-compactor-final-system-prompt.md` | Exact failed processed system prompt | REQ-001; AC-001 | Regression comparison authority for unchanged generated section order | Evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/failed-compactor-outputs.json` | Exact wrong-task public output | REQ-001, REQ-003–REQ-007; AC-001, AC-002, AC-008–AC-010 | Parser/repair negative fixture and prompt-boundary evidence | Evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/successful-compactor-output-comparison.json` | Earlier successful same-run outputs | REQ-001, REQ-002, REQ-010; AC-001, AC-003, AC-013 | Proves the six-array contract itself works and must be preserved | Evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/parser-tolerance-probe.jsonl` | Current parser probe | REQ-003, REQ-004; AC-004–AC-007 | Baseline for candidate-order and formatting-tolerance tests | Evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/daily-assistant-compaction-failure.png` | User-visible lifecycle evidence | REQ-006, REQ-009; AC-009, AC-012 | Confirms separate parent tool error and compaction failure presentation | Evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/memory-compactor-user-requirement-view.png` | User-visible child input evidence | REQ-001; AC-001 | Confirms misleading current heading/history adjacency | Evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/daily-assistant-server-log-excerpt.txt` | Operation/run/log correlation | REQ-001, REQ-005–REQ-009; AC-001, AC-008–AC-012 | Confirms current operation ID reuse, child IDs, runner policy, and final failure | Evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` + bounded `Behavior Change` + `Cleanup`.
- Current design issue found: `Yes`.
- Root cause classification: primary `Missing Invariant`; secondary `Legacy Or Compatibility Pressure` in generic sender headings and `Shared Structure Looseness` in first-object parser selection.
- Refactor needed now: `Yes`, confined to prompt ownership, response validation, and the model-attempt loop.
- Evidence: two identical live histories were treated as active source work; the task message did not identify a target agent; the generic processor added a misleading requirement heading; parser probing showed validation occurs after first-object selection; the operation lifecycle currently has no content-repair boundary.
- Design response: clarify the task/evidence boundary with approved text, remove obsolete generic heading policy, move candidate choice behind validation, and make the existing summarizer the bounded two-attempt owner.
- Refactor rationale: these concerns already belong to the named owners. No new transport, persistence abstraction, strategy API, or generic retry service is necessary. The accepted-compaction architecture is healthy and remains untouched.
- Intentional deferrals and residual risk: deterministic validation cannot prove factual summary quality. Provider/model runtime failure is not retried by this content-repair loop. File-backed output, model fallback, and generated common-system-section redesign are out of scope. One repair adds bounded latency/token cost.

## Terminology

- **Target agent:** the parent/task agent whose selected working-context conversation is being compacted.
- **Compactor child / attempt:** one visible Memory Compactor agent run created by one `CompactionAgentRunner.runCompactionTask` call.
- **Parent compaction operation:** the pending operation identified by `compaction_operation_id`; it may contain one or two child attempts but has one terminal lifecycle.
- **Recognized response fields:** the six approved top-level arrays and `summary`/`fact` entry properties. Unknown fields do not become memory.
- **Semantic candidate fingerprint:** a stable serialization of the parsed/clamped `CompactionResult`; candidates with the same host-consumed result are duplicates, not ambiguity.

## Design Reading Order

The remainder follows: legacy/state decisions; spines and owners; boundaries/interfaces; file responsibilities; then sequencing, examples, tests, and risks.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the generic sender-heading map, sender-dependent formatting branch/parameter/import, and current test expectations for `[User Requirement]`, `[Tool Execution Result]`, `[Message From Agent]`, and `[System Notification]`.
- Replace the old `<conversation_history>` output delimiter with the sole `<target_agent_conversation_history>` delimiter and update collision escaping/tests/docs. Do not support both tags, add a parser alias, or render nested wrappers.
- Do not retain a first-parseable-object parser path, strict unknown-field rejection path, one-shot response-validation path, feature flag, or fallback that restores replaced behavior.
- Preserve active `SenderType` metadata and tool/inter-agent/system source builders. They are current routing semantics, not legacy formatting.
- Existing immutable lineage prompt versions 1/2 remain readable as directly usable persisted data; this is a supported version set in the normal version-agnostic reader, not a dual business path or migration shim.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: each agent memory root contains `episodic.jsonl`, `semantic.jsonl`, schema-v1 `compaction_lineage.jsonl`, raw-trace archive/manifest, and `working_context_snapshot.json`. The investigated parent has two lineage records using prompt contract 2; representative episode/semantic rows are typed current shapes.
- Relevant code-model, serialization, semantic, or physical-store change: only the lineage prompt-contract discriminator advances from current 2 to current 3. The transient model response shape is preserved. No episode, semantic, snapshot, archive, or lineage schema-version shape changes.
- Normal reader/writer behavior and representative evidence: the accepted builder writes the current prompt-contract constant; the lineage normalizer reads supported prompt versions. Current episode/semantic/current-output loaders do not depend on the transient model response. Existing v1/v2 records load today.
- Required semantics and invariants under direct use: immutable existing identities, timestamps, categories, salience, membership, raw-trace origin, lineage order, and current snapshot must remain unchanged. New records must be attributable to prompt contract 3.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: memory is user data and must not be rewritten for representational cleanliness. A normal deployment/restart is sufficient; no mixed physical schema exists.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: define a supported version tuple/set `[1, 2, 3]`, set current to 3, and keep the normal reader version-agnostic otherwise. Rewriting stored JSONL provides no semantic benefit and adds nonzero I/O/corruption/recovery risk.
- Acceptance criteria or design constraints supported by this decision: REQ-007, REQ-008, REQ-010; AC-010, AC-011, AC-013.

No migration plan applies.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001–BEH-004, BEH-006 | Parent LLM request assembly with pending compaction | One canonical commit plus parent request continuation, or one final operation failure with no mutation | `PendingCompactionExecutor` for operation lifecycle; `MemoryManager` for acceptance/commit | Full supported business path; prevents the design from stopping at the parser |
| DS-002 | Primary End-to-End | BEH-001, BEH-005 | One summarizer attempt task | Public assistant text/runner failure plus terminated visible child | `ServerCompactionAgentRunner` | Establishes one-new-child-per-attempt and least authority |
| DS-003 | Return-Event | BEH-002–BEH-005 | Child run events/public output | Parsed result or structured attempt failure returned to strategy/executor | `AgentCompactionSummarizer` | Carries response validation, repair, and final diagnostic outcome |
| DS-004 | Bounded Local | BEH-001, BEH-003 | Initial task prompt | Valid first/repair result or exhausted two-attempt error | `AgentCompactionSummarizer` | Makes the fixed two-attempt state transition explicit below the parent lifecycle |
| DS-005 | Primary End-to-End | BEH-006 | Persisted lineage read or accepted lineage append | Current bundle/projection or new schema-v1 record with prompt contract 3 | Lineage store/normalizer and `AcceptedCompactionBuilder` | Proves direct use without migration and correct version attribution |
| DS-006 | Primary End-to-End | BEH-001 | Any sender-type `AgentInputUserMessage` | Provider/user message content with raw authored content or neutral context/message sections | `AgentInputPipeline` with `UserInputContextBuildingProcessor` as mandatory formatting concern | Covers the approved global removal, not only compactor input |

## Primary Execution Spine(s)

**DS-001 — Parent automatic compaction**

`Parent LLMRequestAssembler -> PendingCompactionExecutor -> StructuredJsonCompactionStrategy -> AgentCompactionSummarizer -> CompactionAgentRunner / child model -> CompactionResponseParser -> strategy proposal -> MemoryManager prepare -> output validator -> AcceptedCompactionCommitter -> parent LLM request continuation`

**DS-002 — One child attempt**

`AgentCompactionSummarizer -> WorkingContextCompactionPromptBuilder / history renderer -> ServerCompactionAgentRunner -> AgentRunService / visible child -> child runtime/model -> CompactionRunOutputCollector -> runner result -> child termination`

**DS-005 — Lineage direct read/write**

`AcceptedCompactionBuilder -> schema-v1 lineage record(prompt contract 3) -> lineage store` and `schema-v1 lineage record(prompt contract 1/2/3) -> lineage normalizer/store -> CurrentCompactionOutputLoader -> compacted-memory projection`

**DS-006 — Global input content composition**

`External/tool/inter-agent/system input owner -> AgentInputPipeline -> mandatory UserInputContextBuildingProcessor -> buildLLMUserMessage (or null for text-only tool continuation) -> LLMRequestAssembler -> provider renderer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The pending operation resolves the strategy, plans one prefix, obtains a valid typed result through at most two child attempts, then uses the unchanged accepted-compaction boundary to commit once or fail without mutation. | Parent request, pending operation, compaction proposal, accepted compaction | `PendingCompactionExecutor`; `MemoryManager` at acceptance | Prompt wording, parser extraction, diagnostics, lineage version |
| DS-002 | Each runner invocation creates a new visible zero-tool child, posts one user-role task, collects only public assistant output, and terminates that child regardless of outcome. | Attempt task, child run, public output | `ServerCompactionAgentRunner` | launch resolution, event collection, timeout cleanup |
| DS-003 | Child public text returns to the summarizer, which validates it; one first validation failure becomes a repair task, while final success/error returns once to the strategy and parent operation. | Attempt result, parsed compaction result, exhausted repair error | `AgentCompactionSummarizer` | validation-stage classification, run-ID formatting |
| DS-004 | State is `initial`; a valid result terminates successfully, one typed validation error transitions to `correction`, and the next success/error terminates. No transition leads back to `initial` or launches a third attempt. | Initial attempt, correction attempt | `AgentCompactionSummarizer` | deterministic correction prefix, per-attempt metadata |
| DS-005 | Writers use current prompt contract 3; one normalizer accepts immutable supported versions 1/2/3 and returns the same canonical lineage meaning without rewriting files. | Lineage execution metadata, current bundle | Lineage record normalizer / accepted builder | store integrity checks |
| DS-006 | The processor resolves context files and concatenates readable context; it no longer translates sender type into prose. Sender-specific meaning remains with provider roles and source builders. | Authored message, readable context, LLM user carrier | `AgentInputPipeline` | path security, media continuation, source-specific text |

## Spine Actors / Main-Line Nodes

- `LLMRequestAssembler`: supported trigger surface for executing a pending compaction before the next provider request.
- `PendingCompactionExecutor`: parent operation lifecycle and terminal status owner.
- `StructuredJsonCompactionStrategy`: compaction plan, normalization, and proposal owner.
- `AgentCompactionSummarizer`: bounded content-attempt owner.
- `WorkingContextCompactionPromptBuilder`: initial/correction task-message owner.
- `CompactionConversationHistoryRenderer`: selected transcript and delimiter owner.
- `ServerCompactionAgentRunner`: one child-run lifecycle owner.
- `CompactionResponseParser`: candidate/validation/mapping owner.
- `MemoryManager` compaction coordinator: baseline/lineage acceptance owner.
- `AcceptedCompactionCommitter`: ordered canonical mutation owner.
- `AgentInputPipeline`: sender/turn routing and LLM carrier owner.
- `UserInputContextBuildingProcessor`: readable-context concatenation concern within the input pipeline.

## Ownership Map

| Main-Line Node | Owns | Must Preserve / Enforce |
| --- | --- | --- |
| `PendingCompactionExecutor` | one pending operation's started/completed/failed lifecycle; transition into prepare/commit | one terminal parent status; no attempt-level failed status |
| `StructuredJsonCompactionStrategy` | window planning, normalized result, ID-less proposal | strategy-specific JSON; generic strategy interface remains neutral |
| `AgentCompactionSummarizer` | initial/repair state, child invocation count, attempt metadata, final content failure composition | maximum two calls; retry only typed returned-content validation failures; latest successful metadata for proposal |
| `WorkingContextCompactionPromptBuilder` | exact first-task envelope and exact repair prefix | approved first prompt byte shape; no text after END; no raw failed output in repair |
| `CompactionConversationHistoryRenderer` | transcript roles/tool condensation/redaction/value bounds/sole wrapper | unchanged inner rendering; new-tag collision escaping only |
| `ServerCompactionAgentRunner` | one visible run, posting one task, waiting, output metadata, termination | zero tool auto-execution; one run per call; cleanup on all outcomes |
| `CompactionResponseParser` | candidate extraction, six-array validation, harmless-extra projection, ambiguity detection, text bounds | at least one episode; no arbitrary Markdown; typed validation stage |
| `MemoryManager` / accepted owners | baseline check, identity assignment, lineage, context, persistence, pending clear | no mutation before validated proposal; exactly one commit |
| `UserInputContextBuildingProcessor` | file-path resolution and optional readable-context concatenation | raw content unchanged without context; neutral context/message labels with context; no sender heading policy |
| Lineage record normalizer | supported prompt-contract version set | direct 1/2/3 read; reject unsupported versions |

`LLMRequestAssembler` is a thin initiating boundary for this use case; it delegates compaction lifecycle to `PendingCompactionExecutor`. `ServerCompactionAgentRunner` is an authoritative boundary for one child run, not the retry owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LLMRequestAssembler.prepareRequest` | `PendingCompactionExecutor` and `MemoryManager` | ensures pending compaction completes before assembling next parent request | model-attempt policy, parser rules, persistence order |
| `CompactionAgentRunner.runCompactionTask` interface | concrete `ServerCompactionAgentRunner` | core/server inversion for one child attempt | retry count or parent operation terminal status |
| `WorkingContextCompactionStrategy.propose` | `StructuredJsonCompactionStrategy` | strategy registry boundary | universal JSON schema or canonical persistence |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Generic sender header map and fallback `[Input]` | sender meaning already exists outside shared prose formatting | raw or neutral context/message composition in `UserInputContextBuildingProcessor` | In This Change | remove sender argument/import from formatting method |
| Old generic `<conversation_history>` output and collision escapes | sole wrapper becomes target-specific | `CompactionConversationHistoryRenderer` new delimiter | In This Change | no alias/dual wrapper |
| First-parseable-object candidate selection | unrelated object can mask valid compaction | validate every candidate, then choose one semantic result | In This Change | remove strict candidate-position dependence |
| Unknown-field rejection for otherwise valid recognized content | harmless model metadata should not fail compaction | projection of recognized fields only | In This Change | wrong required field types/shapes still fail |
| One-shot response-validation failure path | production-critical invalid output merits one bounded correction | `AgentCompactionSummarizer` two-state loop | In This Change | runner failures before first response are not content repairs |
| Old prompt-contract-current value 2 | framing changes require attribution | current 3 plus supported `[1,2,3]` tuple | In This Change | no data rewrite |
| Stale prompt/tag/version test expectations and current docs | would describe removed behavior | updated exact/unit/integration/E2E expectations and durable docs | In This Change | historical completed-ticket evidence remains historical |

## Return Or Event Spine(s) (If Applicable)

**DS-003**

`Child runtime events -> CompactionRunOutputCollector -> CompactionAgentRunnerResult / RunnerError -> AgentCompactionSummarizer parse/repair -> StructuredJsonCompactionStrategy result/error -> PendingCompactionExecutor completed/failed -> CompactionRuntimeReporter -> notifier/stream -> one parent Activity row`

Only `PendingCompactionExecutor` emits the parent operation's terminal status. A recovered first validation failure remains below it. Child runs remain individually visible through their normal run lifecycle, which preserves attempt-level operational evidence without projecting a failed parent compaction card.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `AgentCompactionSummarizer`.

`Build approved initial task -> run child attempt 1 -> parse`

- valid -> store attempt-1 metadata -> return result;
- typed response-validation failure -> build deterministic correction task from the same initial prompt and stage -> run new child attempt 2 -> parse;
- repair valid -> store attempt-2 metadata -> return result;
- repair parse/runner failure -> throw one exhausted-repair error containing attempt stages and available run IDs.

There is no loop counter exposed to configuration and no third transition. The constant maximum is two attempts. First-attempt runner/transport failure does not enter the content-repair branch because no returned response was available to correct.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Compactor system-template wording | DS-001, DS-002 | prompt builder / child model task | stable identity/task/schema instruction | model needs durable task authority | runtime code would duplicate/paraphrase approved prompt |
| Launch resolution | DS-002 | server runner | choose fixed built-in definition/model/runtime | provider/server concern | summarizer would gain server composition knowledge |
| Output collection | DS-002, DS-003 | server runner | collect public assistant text; fence errors/tool approval | event protocol concern | parser would depend on runtime events/private reasoning |
| Validation-stage classification | DS-003, DS-004 | parser/summarizer | bounded safe correction reason | correction must be deterministic/actionable | arbitrary error strings/raw output would contaminate prompt |
| Result normalization | DS-001 | strategy | dedupe/order/salience before proposal | existing category policy | parser would mix model contract and product normalization |
| Runtime reporting | DS-003 | pending executor | operation-level events/log enrichment | one Activity identity | attempt loop could emit contradictory parent statuses |
| Lineage version set | DS-005 | lineage normalizer / accepted builder | current-write and supported-read contract | provenance without migration | retry/prompt code would leak storage policy |
| Context-file path/security rendering | DS-006 | input processor | safe file resolution and readable context | existing shared concern | sender-specific builders would duplicate filesystem policy |

## Ownership Boundaries

- Above the compaction-strategy boundary, callers see `propose` and do not reach into the summarizer/parser/runner.
- `StructuredJsonCompactionStrategy` calls the summarizer but does not call its runner or parser independently; otherwise it would bypass the attempt owner.
- `AgentCompactionSummarizer` calls `CompactionAgentRunner` once per attempt. It never creates server runs directly and never emits parent operation events.
- `CompactionResponseParser` accepts text and returns a `CompactionResult` or typed validation error. It never runs models, normalizes product salience, or persists.
- `PendingCompactionExecutor` receives only final proposal/error. It never observes attempt 1 as a terminal lifecycle.
- Canonical writes stay behind `MemoryManager.prepareCompaction` / `commitAcceptedCompaction`; no response or repair code reaches stores directly.
- `UserInputContextBuildingProcessor` may concatenate context but must not reinterpret sender type. Inter-agent/tool/system owners remain the only source-specific wording owners.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkingContextCompactionStrategy.propose` | planner, summarizer, normalizer, proposal creation | pending executor | executor calling summarizer/parser directly | extend strategy result/diagnostics, not bypass internals |
| `AgentCompactionSummarizer.summarizeMessageUnits` | initial/correction prompts, two runner calls, parser, attempt metadata | structured strategy | strategy calling runner after parser error | strengthen summarizer error/metadata API |
| `CompactionAgentRunner.runCompactionTask` | visible child create/post/collect/terminate | summarizer | summarizer using `AgentRunService` | extend task/result metadata on runner boundary |
| `CompactionResponseParser.parse` | extraction, candidate validation/dedupe, result mapping | summarizer | summarizer scanning JSON itself | add typed stage/error to parser |
| `MemoryManager.prepareCompaction` / `commitAcceptedCompaction` | baseline/lineage checks, accepted builder/committer/stores | pending executor | strategy or compactor writing memory files | extend accepted boundary only if a proven invariant is missing |
| `AgentInputPipeline.processForLlm` | mandatory processors, sender turn rules, LLM user carrier/null | external/tool input entrypoints | processor changing provider tool history directly | strengthen pipeline/source builder contract |

## Dependency Rules

Allowed:

- prompt builder -> history renderer;
- prompt builder -> parser validation-stage **type only** for deterministic repair wording;
- summarizer -> prompt builder, runner interface, parser;
- strategy -> summarizer/normalizer/planner;
- pending executor -> strategy boundary, memory manager acceptance, reporter;
- server runner -> core runner/task types and server run service;
- accepted builder -> lineage current-version constant;
- input processor -> message/context/path/context-builder types.

Forbidden:

- prompt builder or renderer -> server runner, strategy, stores, or accepted commit;
- parser -> runner, strategy, logger/reporter, normalizer, or stores;
- server runner -> retry policy or response schema;
- summarizer -> `AgentRunService`, reporter, memory stores, or accepted builder;
- strategy/pending executor -> parsing JSON independently;
- compactor child -> generic filesystem tools or canonical memory files;
- shared input processor -> sender-specific prose policy;
- any normal runtime path -> old/new tag dual rendering, version-specific prompt branches, or response-schema aliases.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkingContextCompactionPromptBuilder.buildTaskPrompt(units, options)` | initial model task | exact approved first-attempt message | selected units + max item chars | returns intro/start/renamed wrapper/end and nothing after END |
| `WorkingContextCompactionPromptBuilder.buildCorrectionTaskPrompt(initialPrompt, validationStage)` | correction model task | prepend exact bounded correction reminder | initial prompt + closed validation-stage union | must not include raw output/error prose |
| `CompactionResponseParser.parse(text)` | compaction response | return one semantic candidate or typed staged error | public assistant text | six arrays preserved; extras projected away |
| `CompactionAgentRunner.runCompactionTask(task)` | one child attempt | run/collect/terminate one child | unique task ID + parent IDs + prompt/counts | unchanged one-run ownership |
| `AgentCompactionSummarizer.summarizeMessageUnits(units)` | one summarization operation | at most two child attempts, return result/final error | selected message units | no retry configuration |
| `AgentCompactionSummarizer.getLastCompactionExecutionMetadata()` | accepted/final attempt | expose latest actual child metadata | no selector | repair success exposes attempt 2 for lineage/status |
| `UserInputContextBuildingProcessor.process(message, context, event)` | LLM input content | path resolve and neutral content composition | `AgentInputUserMessage.senderType` remains metadata | formatting no longer branches on sender type |
| `normalizeCompactionLineageRecord(value)` | persisted lineage record | validate schema 1 and prompt contract 1/2/3 | record content | no migration or fallback read |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Prompt build methods | Yes | Yes | Low | use separate initial/correction methods, not optional kitchen-sink options |
| Parser `parse` | Yes | Yes | Low | typed closed validation stages; semantic candidate fingerprint |
| Runner `runCompactionTask` | Yes | Yes | Low | keep one child per call; unique task ID per attempt |
| Summarizer `summarizeMessageUnits` | Yes | Yes | Low | fixed two-state ownership; no generic retry callback |
| Input processor `process` | Yes | Yes | Low | remove sender formatting branch while retaining path/context concern |
| Lineage normalizer | Yes | Yes | Low | supported tuple owns version discriminator |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Parent model-to-memory orchestration | `AgentCompactionSummarizer` | Yes | Low | retain; it now owns the complete bounded summarization attempt |
| Selected source transcript renderer | `CompactionConversationHistoryRenderer` | Yes | Low | retain; update delimiter constant only |
| Operation task prompt | `WorkingContextCompactionPromptBuilder` | Yes | Low | retain; add explicit correction method |
| Response contract boundary | `CompactionResponseParser` | Yes | Low | retain; parse includes schema validation by existing convention |
| Strategy | `StructuredJsonCompactionStrategy` | Yes | Low | retain; contract remains structured JSON |
| Global message/content concern | `UserInputContextBuildingProcessor` | Yes | Medium | keep existing name; remove misleading `rawRequirement` local naming |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Target-history transcript | memory compaction renderer | Extend | already owns role/tool rendering and delimiter escape | N/A |
| Initial/correction model message | compaction prompt builder | Extend | already owns per-operation task prompt | N/A |
| Candidate/schema validation | compaction response parser | Extend | existing authoritative model-response boundary | N/A |
| Bounded content repair | compaction summarizer | Extend | already sequences prompt -> runner -> parser and retains metadata | N/A |
| Parent terminal lifecycle | pending executor/reporter | Reuse | existing owner already emits once after strategy returns/throws | N/A |
| Canonical memory mutation | accepted compaction owners | Reuse | healthy atomic path | N/A |
| Sender-neutral context concatenation | mandatory input processor | Extend | existing path/security/context owner | N/A |
| Persisted version read/write | lineage record + accepted builder | Extend | existing provenance owner | N/A |
| Generic retry service | none | Do not create | only one narrow two-state repair is needed | A generic service would obscure policy/ownership |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory compaction | rendering, task prompts, parser, bounded summarizer, strategy/proposal | DS-001–DS-004 | summarizer/strategy | Extend | compact flat folder remains appropriate; files have distinct concerns |
| `autobyteus-server-ts` compactor execution | built-in prompt, launch, one child lifecycle, output events | DS-002, DS-003 | server runner | Extend prompt only / reuse runner | no tool config change |
| `autobyteus-server-ts` prompt processing | path/context composition | DS-006 | input pipeline | Extend | cleanly removes sender prose policy |
| `autobyteus-ts` memory lineage | supported versions and current write discriminator | DS-005 | lineage normalizer/accepted builder | Extend | no migration module |
| memory accepted commit | identity/persistence/projection | DS-001, DS-005 | memory manager/committer | Reuse | source unchanged except imported current value effect |
| durable documentation/tests | contract and executable coverage | all | downstream maintainers | Extend | update current docs and direct expectations |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `working-context-compaction-prompt-builder.ts` | memory compaction | prompt boundary | exact initial and correction task messages | both are variants of one operation prompt subject | rendered history + validation-stage type |
| `compaction-conversation-history-renderer.ts` | memory compaction | transcript renderer | inner transcript and sole target wrapper | existing cohesive renderer | current finalizer/renderers |
| `compaction-response-parser.ts` | memory compaction | response boundary | candidates, validation stages, semantic dedupe, mapping | one authoritative response contract | `CompactionResult` |
| `agent-compaction-summarizer.ts` | memory compaction | attempt owner | fixed attempt transitions, metadata, exhausted error | bounded local loop belongs together | runner/parser/prompt APIs |
| `user-input-context-building-processor.ts` | server prompt processing | input content concern | path resolution + neutral context/message concatenation | existing mandatory processor concern | existing context builder |
| `compaction-lineage-record.ts` | memory lineage | persisted contract | supported prompt versions | existing record authority | one supported tuple/type |
| Memory Compactor `agent.md` | server built-in agents | stable model task | exact approved system content | current canonical template | prompt spec |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Response validation stage | export type from `compaction-response-parser.ts` | memory compaction response boundary | parser emits it; prompt builder/summarizer consume it | Yes | Yes | generic error taxonomy |
| Supported lineage prompt versions | constant tuple in `compaction-lineage-record.ts` | memory lineage | drives type and runtime check from one authority | Yes | Yes | migration/version-routing registry |
| Attempt metadata | existing `CompactionAgentExecutionMetadata` per child | compaction runner boundary | already carries run/task/model identity | Yes | Yes | recursive operation DTO |

No new cross-subsystem DTO is needed. The exhausted-repair error may keep its two per-attempt records local to `agent-compaction-summarizer.ts`; only its final message and last metadata cross the current strategy/reporter boundaries.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Six-array model response | Yes | Yes | Low | preserve exactly; project unknown extras away |
| `CompactionResult` | Yes | Yes | Low | retain as sole host result shape |
| Validation-stage union | Yes | Yes | Low | use three closed values only |
| `CompactionAgentExecutionMetadata` | Yes | Yes | Low | one record per actual child; do not overload with parent operation state |
| Prompt-contract supported tuple/type | Yes | Yes | Low | derive type/runtime membership from same tuple |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | memory compaction | prompt builder | exact approved initial framing and exact design-specified correction prefix | one model-task prompt subject | renderer + parser stage type |
| `autobyteus-ts/src/memory/compaction/compaction-conversation-history-renderer.ts` | memory compaction | history renderer | target-agent tag and collision escaping; inner transcript unchanged | one transcript rendering concern | finalizer/value/tool renderers |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | memory compaction | parser | extract/validate all candidates, tolerate extras, fingerprint/dedupe, staged errors | one authoritative response boundary | `CompactionResult` |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | memory compaction | bounded attempt owner | initial then one correction, unique tasks, attempt metadata, exhausted error | one local state flow | prompt/runner/parser |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | built-in agent | system prompt authority | exact approved prompt | canonical template | prompt spec |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | prompt processing | context concatenation | raw pass-through or neutral context/message sections | existing processor concern | context builder/path resolver |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` | memory lineage | record contract | current 3 + supported 1/2/3 | current persisted contract owner | tuple/type/runtime validation |
| Direct unit/integration/E2E tests listed below | respective subsystem | executable contract | exact prompt/parser/repair/lifecycle/version/tool invariants | close to owners | retained evidence fixtures where useful |
| Four current memory architecture docs | respective package docs | durable documentation | target prompt, parser/repair, global formatting, version | existing canonical docs | requirements/design references |

## Applied Patterns (If Any)

- **Bounded two-state attempt flow:** explicit `initial -> correction -> terminal`, owned by the summarizer rather than a generic retry helper.
- **Validate then select:** extract candidates, validate each through the preserved contract, deduplicate by host-consumed meaning, then require exactly one result.
- **Host-owned proposal/accept/commit:** unchanged safety pattern prevents model output from mutating canonical memory directly.
- **Projection of recognized fields:** harmless extras are ignored without adding old/new response aliases.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | File | prompt builder | initial/correction message framing | existing memory compaction prompt concern | system-template prose duplication, runner logic |
| `autobyteus-ts/src/memory/compaction/compaction-conversation-history-renderer.ts` | File | transcript renderer | new sole wrapper/collision escape | existing transcript concern | operation instruction or response schema |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | File | parser | staged schema-aware candidate handling | existing response contract concern | model calls, normalization, persistence |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | File | attempt owner | bounded two-attempt sequence | already spans prompt/runner/parser | server run service, parent events, stores |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` | File | lineage record | supported/current prompt versions | existing persistence contract | migration logic |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | File | built-in task prompt | exact approved system prompt | canonical built-in definition | repair-specific dynamic stage text |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | File | input context processor | secure context files + neutral composition | existing mandatory processor | sender header map/source-specific wording |
| `autobyteus-{ts,server-ts}/docs/...` | File set | durable docs | current compaction protocol | existing memory docs | obsolete old tag/one-shot/current-v2 statements |

The existing flat `memory/compaction` layout is retained because these are small, clearly named peer concerns under one capability area; adding a new retry or parser subfolder would over-split this bounded change.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Main-Line Domain-Control | Yes | Low | established capability folder; peer files retain singular responsibilities |
| `autobyteus-server-ts/src/agent-execution/compaction` | Transport | Yes | Low | one child execution remains server-owned and unchanged |
| `autobyteus-server-ts/src/agent-customization/processors/prompt` | Off-Spine Concern | Yes | Low | mandatory input composition only; remove sender policy drift |
| `autobyteus-ts/src/memory/lineage` | Persistence-Provider | Yes | Low | record/version validation remains isolated from prompt runtime |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor` | Off-Spine Concern | Yes | Low | stable model task definition and zero-tool config |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| First operation message | exact sentence -> START -> one `<target_agent_conversation_history>` block -> END, with no trailing text | `[User Requirement]` immediately followed by generic history or several nested XML sections | fixes the causal target/evidence ambiguity without prompt inflation |
| Context composition | no readable context: `message.content` byte-for-byte; with context: `**[Context]**\n...\n\n**[Message]**\n...` | sender-specific heading map or fallback `[Input]` | shared processor should separate payload regions, not invent sender semantics |
| Candidate choice | unrelated `{ "note": ... }` ignored, one later valid six-array candidate selected | return first parseable object, then reject it | validation must govern selection |
| Ambiguity | identical duplicated extraction/fence representations dedupe to one semantic fingerprint; different valid summaries fail | silently choose earliest/latest valid compaction | avoids arbitrary memory selection |
| Attempt flow | `initial invalid -> new child correction -> valid -> one parent completed` | emit failed parent status, then retry and emit completed; or reuse misdirected child conversation | preserves coherent lifecycle and clean model context |
| Commit | valid parsed result -> strategy proposal -> manager prepare -> accepted committer | compactor writes memory Markdown/JSON files | keeps integrity and least authority host-owned |

### Exact correction-task prefix

The first-attempt message remains byte-exact to `memory-compactor-prompt-spec.md`. Only a new correction child receives this prefix, followed by one blank line and then the complete first-attempt message unchanged:

```text
A prior compaction attempt failed host validation at the `<validation_stage>` stage. This is the single corrective attempt. Return exactly one JSON object with all six required arrays: `episodes`, `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, and `important_artifacts`. At least one `episodes` entry must contain a non-empty `summary`; entries in the five fact arrays use `fact`. Do not add Markdown fences or prose.
```

`<validation_stage>` is replaced only with one parser-owned closed value:

- `json_object_extraction`
- `six_array_schema_validation`
- `multiple_valid_objects`

Do not include the previous model output, arbitrary exception message, source-task commentary, stack trace, IDs, or a second JSON example in the correction prompt. Because the unchanged first-attempt message follows the prefix, the correction task still ends at the approved END separator.

### Parser candidate algorithm

1. Extract the trimmed response, fenced bodies, and balanced object substrings; deduplicate identical candidate strings.
2. JSON-parse object candidates. If none parse, throw `CompactionResponseParseError(stage='json_object_extraction')`.
3. Validate every parsed object against the six required array fields and host entry rules. Unknown top-level fields and unknown fields beside a valid `summary`/`fact` are ignored. Missing/non-array required fields and nonempty object entries lacking their category's recognized property are invalid. Null/primitive/empty-object or blank/non-string recognized entries may be discarded, but at least one nonblank episode must remain.
4. For each valid candidate, build the clamped `CompactionResult` and fingerprint `JSON.stringify` of that host-consumed result.
5. Zero valid candidates -> `six_array_schema_validation`, reporting the most relevant candidate failure (highest required-field coverage, then earliest candidate) without treating an unrelated nested object as authority.
6. One distinct fingerprint -> return that result.
7. More than one distinct fingerprint -> `multiple_valid_objects` error.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old generic sender headings behind a setting | global behavior change | Rejected | delete map/branch/old expectations |
| Render both old and target-agent history tags | old tests/docs may refer to old tag | Rejected | sole renamed tag; update current sources/docs/tests |
| Parse both six-array and `items` schema | earlier design exploration | Rejected | preserve six-array only; no alias DTO/mapper |
| Keep first-object selection as fallback | perceived leniency | Rejected | validate all candidates and require one semantic result |
| Retry indefinitely or by configurable count | reliability | Rejected | fixed maximum of two attempts in summarizer |
| Reuse the same child conversation for correction | fewer visible runs | Rejected | new child prevents wrong-task context carryover and preserves distinct run IDs/cleanup |
| Rewrite v1/v2 lineage to v3 | representational uniformity | Rejected | direct reader support `[1,2,3]`; writers use 3 |
| Grant `write_file` / staged generic workspace output | response robustness | Rejected | retain zero-tool child and host text validation/commit |

## Derived Layering (If Useful)

Explanatory only:

- parent operation/control: request assembler -> pending executor -> strategy;
- bounded model adaptation: summarizer -> prompt/runner/parser;
- domain acceptance: memory manager -> accepted builder/validator;
- persistence/projection: committer -> stores/snapshot/lineage/context;
- external return: reporter/notifier -> UI activity.

No higher layer bypasses the named owner below it.

## Change / Refactor Sequence

1. Update the built-in Memory Compactor `agent.md` and its byte-exact template test from the approved prompt specification. Verify the response section from `Return one JSON object...` through the example remains byte-identical to the old file.
2. Change the history renderer's sole tag and collision escaping. Update focused renderer/prompt tests before changing operation framing so inner-output preservation is explicit.
3. Change `WorkingContextCompactionPromptBuilder.buildTaskPrompt` to assemble the exact approved intro/START/rendered block/END message. Add the exact correction builder method/prefix and closed validation-stage input. Verify nothing follows END.
4. Remove sender-specific heading formatting from `UserInputContextBuildingProcessor`. Rename `rawRequirement` to neutral message content, remove `SenderType` formatting dependency, return raw content without readable context, and use only bold Markdown `[Context]`/`[Message]` sections when context exists. Update active TS tests and remove stale old-heading expectations from any checked-in counterpart affected by this test source; do not alter sender metadata or source builders.
5. Refactor `CompactionResponseParser` from first-object selection to validate-all/select-one. Add staged errors, harmless-extra projection, wrong-shape/empty-episode rules, semantic fingerprint dedupe, and ambiguity rejection. Preserve current bounds and `CompactionResult` mapping.
6. Extend `AgentCompactionSummarizer` with the fixed two-state attempt flow. Build the source history once, run the exact initial prompt, retry only `CompactionResponseParseError`, create a new task/run for correction, and preserve the actual prompt hash/metadata for each call. On repair success, expose correction metadata. On exhaustion, throw one error whose message lists attempt number, stage (`runner_execution` if the second runner fails), and each available `compactionRunId`; set last metadata to the last attempt for existing reporter enrichment.
7. Keep `StructuredJsonCompactionStrategy`, `PendingCompactionExecutor`, `CompactionRuntimeReporter`, runner, collector, manager, accepted builder/committer behavior structurally unchanged. Add regression assertions proving recovered validation does not reach the parent failed event and exhausted validation reaches it once.
8. Set lineage current prompt contract to 3 and derive the supported type/runtime validation from `[1,2,3]`; update writer/read tests and version expectations. Do not add a migration.
9. Update direct unit/integration/E2E coverage and current memory architecture docs. Use the retained wrong-task outputs/parser probe as fixtures where practical. Do not edit completed-ticket historical evidence as if it described current behavior.
10. Run package-focused tests/typechecks, then downstream API/E2E coverage investigation and execution per team workflow.

No temporary dual path is permitted at any step.

## Key Tradeoffs

- A new child for correction costs launch latency but gives a clean system/user context, avoids reinforcing the first child's wrong task, fits the existing one-run runner contract, guarantees cleanup, and supplies distinct run IDs.
- Preserving the six arrays retains some syntactic burden, but avoids unrelated prompt/schema churn and keeps proven category semantics.
- Ignoring harmless extras improves resilience; requiring all recognized arrays and one episode preserves sufficient signal to reject wrong-task prose.
- Semantic fingerprint dedupe treats extraction duplicates and output-equivalent candidates as one; truly different memory candidates remain an actionable ambiguity.
- Error messages carry both run IDs without expanding the external compaction status schema. The existing last-run fields remain stable, while the final `error_message` supplies both IDs.
- No content repair for first-attempt provider/timeout failure avoids converting an availability policy into an implicit retry policy. A correction is only meaningful after the host receives invalid content.

## Risks

- The model may still produce a plausible but factually poor valid summary; the current typed contract cannot prove fidelity.
- The correction child adds up to one full additional model latency/token cost on invalid content.
- A long history is resent on correction. This is deliberate because a new child must receive the target evidence; input budgeting remains the existing planner's responsibility.
- Unknown extra-field tolerance must not accidentally admit a wrong recognized entry shape. Tests must separate “extra beside correct property” from “missing required property.”
- Candidate extraction can yield nested JSON objects. Highest-required-field-coverage error selection and semantic validation prevent nested objects from masking the intended candidate.
- If the second child fails at the runner/transport layer, there is only one invalid returned response plus one failed correction execution. The final error must say so accurately rather than claim two parsed outputs.
- Existing old lineage remains directly readable; unsupported future versions must still fail closed.
- The mandatory input processor is global. Tests must cover USER/TOOL/AGENT/SYSTEM content preservation, readable context, media/context tool continuation, text-only null tool continuation, and source-specific inter-agent/system wording.

## Guidance For Implementation

### Exactness and invariants

- Copy the approved `agent.md` and first-attempt operation message exactly from `memory-compactor-prompt-spec.md`. Do not improvise wording.
- Preserve every line of the original response section, including all six explanations, empty-array instruction, and full JSON example.
- Use `**[Context]**` and `**[Message]**` only when readable context is actually concatenated; otherwise do not trim, label, or rewrite authored content.
- Render exactly one opening and closing target-agent history tag; escape literal occurrences of those new tags inside all user/assistant/tool content. Do not specially escape the obsolete tag.
- Hash the actual prompt sent on each child. A repair success's lineage metadata should therefore use the repair task's hash and child metadata.
- Do not retry `CompactionAgentRunnerError` from the first attempt. Do wrap a second-attempt runner error after a first validation failure so final diagnostics retain both available attempt records.
- Do not emit parent lifecycle events from the summarizer, runner, or parser.
- Do not mutate canonical memory before parser success, strategy proposal, accepted validation, and commit.

### Targeted executable coverage

At minimum update/add:

- `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts`: byte-exact approved prompt and preserved six-array tail.
- `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts`: exact first message, sole renamed tag/escapes, unchanged inner ordering/redaction/bounds, exact repair prefix, no content after END.
- `autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts`: raw pass-through for all sender types; neutral context/message form; no generic headings; path/media behavior unchanged. Keep checked-in test counterparts consistent with repository policy.
- `autobyteus-ts/tests/unit/memory/compaction-response-parser.test.ts`: exact/fenced/prose; unrelated-first; missing/wrong fields; blank entries; harmless top/entry extras; identical duplicate candidate; two distinct candidates; captured wrong-task output.
- `autobyteus-ts/tests/unit/memory/agent-compaction-summarizer.test.ts`: first success one call; first parse failure then repair success two new tasks/runs; two parse failures final stages/both IDs; second runner failure; first runner failure no retry; last metadata/hash follows accepted/final attempt.
- `autobyteus-ts/tests/unit/memory/structured-json-compaction-strategy.test.ts` and `pending-compaction-executor.test.ts`: final metadata/error propagation, no intermediate failed lifecycle, one final failure.
- `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts`: final framed prompt and one completed parent operation; add recovered-first-response scenario if the existing fake runner supports queued outputs.
- `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts`: renamed wrapper, native tool protocol unchanged, prompt contract 3.
- `autobyteus-ts/tests/unit/memory/file-compaction-lineage-store.test.ts` plus related loader/committer fixtures: mixed 1/2/3 succeeds; unsupported 4 fails without write.
- `autobyteus-server-ts/tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts` / collector tests: retain one-run cleanup and no-tools invariants; no runner-owned retry expectation.
- `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts`: current completed compactions expect prompt contract 3 when this scenario is in downstream execution scope.
- Regression of final compacted memory: `Earlier progress` and populated existing category headings/order remain unchanged.

### Durable documentation

Update current descriptions in:

- `autobyteus-ts/docs/agent_memory_design.md`
- `autobyteus-ts/docs/agent_memory_design_nodejs.md`
- `autobyteus-server-ts/docs/modules/agent_memory.md`
- `autobyteus-server-ts/docs/modules/agent_work_traces.md`
- `autobyteus-server-ts/docs/ARCHITECTURE.md`

Document exact target-agent framing, schema-aware parser tolerance, bounded new-child correction, one parent terminal lifecycle, zero tools, accepted commit, and prompt version 3 with direct 1/2/3 reads.
