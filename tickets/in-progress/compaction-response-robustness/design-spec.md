# Design Spec

## Current-State Read

The ticket worktree already contains the reviewed and implemented REQ-001–REQ-010 baseline at commits `ed7f65a5d` and `1f2406ffa`: explicit target-agent prompt framing, the preserved six-array response contract, schema-aware tolerant parsing, one new-child response correction, prompt-contract version 3, direct v1/v2/v3 lineage reads, zero compactor tools, and the existing host-owned accepted-compaction commit. The user has explicitly reconfirmed that boundary. The Memory Compactor system/operation prompt, response schema, episodic/semantic model, parser tolerance, and persistence model are not redesigned in this revision.

User verification and architecture review exposed six defects below or beside that healthy response/commit boundary:

1. `evaluateLlmPhaseCompaction` requests compaction at `triggerRatio × inputBudget`, while `EstimatedMessageBudgetStrategy` independently gives the recent suffix 35% of the full input budget. With a 20% trigger this allowed a planned result above the trigger. Three successful operations in one parent turn reduced 249,416 → 243,153 → 242,812 → 8,755 tokens.
2. `LlmPhase` already represents provider/request/ingestion failure as `LlmPhaseOutcome.isError`, but `LLMResponsePipeline` drops that bit when publishing `ASSISTANT_COMPLETE`. `CompactionRunOutputCollector` therefore accepts generated error prose as usable model output, and `AgentCompactionSummarizer` misclassifies it as JSON extraction failure and launches an inapplicable correction child.
3. `PendingCompactionExecutor` preserves the same pending operation after every failure, and request assembly executes it before a later user message reaches the target agent. The user has now explicitly approved that strict fail-closed/manual-retry boundary. The defect is that a genuine runner failure launches a meaningless correction child and is reported as JSON failure; the platform must perform no autonomous retry after the final failure.
4. Pending presence is also treated as sufficient execution authorization. `InterAgentMessageReceivedEvent` shares the same turn-start/request path, and production team/direct-agent messages commonly arrive as `UserMessageReceivedEvent` with `SenderType.AGENT`; system task notifications use `SenderType.SYSTEM`. Any of them can currently execute the retained operation. Merely leaving an ineligible non-user message at the FIFO head would block a later user `continue`, while consuming it would lose supported work.
5. Provider-facing compaction rendering is not Unicode-safe. In the 2026-08-15 reproduction, `ReadableValueRenderer.omitMiddle` applied `String.slice` at a 2,000-unit UTF-16 boundary inside valid `🛡️`, inserted the omission marker after its high surrogate, and produced one lone U+D83D in the 540,727-unit child prompt. DeepSeek rejected `messages[1].content` with HTTP 400 before inference. `CompactionResponseParser.clampText` has the same end-slice risk for accepted text that can enter a later prompt.
6. Automatic-compaction composition is split across four owners: the server factory creates a runner for every definition, `AgentConfig` carries that nullable runner, `AgentFactory` independently constructs `new CompactionPolicy()` for every runtime, and `LlmPhase` combines both with global strategy resolution. After the Unicode-safe retry, the built-in `autobyteus-memory-compactor` therefore produced its intended response with 176,655 prompt tokens, inherited the global 20% trigger of 123,148, and requested compaction against its own one-shot task. The nested child received the outer 540,257-character task as one rendered trace, shortened it to 2,430 characters, and added a second target-agent wrapper. This is a boundary/ownership defect, not model confusion or migrated-data damage. Source inspection confirms there is only one `CompactionPolicy` and one registered current strategy (`structured-json`); no policy/strategy hierarchy is missing.

The healthy boundary remains: a strategy proposal is normalized; `MemoryManager` validates the baseline and lineage; `AcceptedCompactionBuilder` creates host-owned typed artifacts and finalized context; validation runs before `AcceptedCompactionCommitter`; and only the committer archives selected traces, appends memory/lineage, replaces context/snapshot, and completes the pending operation. The revised design strengthens planning, child outcome transport, and pending-operation control without bypassing this boundary.

Exact evidence and production traces are in `repeated-compaction-runtime-analysis.md`, `compactor-runner-failure-analysis.md`, `compaction-unicode-safety-analysis.md`, `recursive-compaction-root-cause.md`, `compaction-memory-shape-reassessment.md`, and `investigation-notes.md`.

## Intended Change

Preserve the approved prompt and six-array output exactly. Add one trigger-owned planning budget that travels from the observed parent token usage through the pending request into the strategy, planner, accepted result, and postcondition validator. The planner must cap its existing 35% recent-context preference by a trigger-derived target with explicit headroom, reserve required/protected/replacement/estimated-untracked costs, and never override that cap merely to preserve a minimum recent-unit count. A target that cannot preserve mandatory content must fail once before child launch; an actual finalized context estimated above the target must fail before commit.

Accepted success must not substitute its local estimate for the actual below-threshold observation required by REQ-012. The existing accepted-commit hook still clears pending atomically, while the coordinator separately records `awaiting_below_observation` for that budget key. The first fresh same-key provider usage below `T` rearms crossing detection; the first at/above `T` requests no second proactive operation, emits one bounded inadequate-reduction diagnostic, and suppresses further proactive operations until actual-below or budget-key reset. Hard-input-cap safety overrides suppression.

Propagate the existing `isError` outcome through the assistant-complete event contract. The compaction collector must turn an error completion, timeout, interruption, terminal child error, tool approval, rejected task, or launch failure into a typed `CompactionAgentRunnerError`. Only a non-error assistant payload may reach `CompactionResponseParser`; the already-approved correction child remains exclusive to usable but invalid model output.

Preserve the pending compaction as a pre-dispatch gate after any final failure, but do not equate pending presence with executability. A pending operation has an explicit attempt state: a newly requested operation is `initial_attempt_ready` and keeps one automatic first attempt regardless of current turn origin; after final failure it is `awaiting_user_retry`. The failed target-agent turn ends after one truthful terminal error; no target-agent LLM dispatch/tool phase follows it, and the platform schedules no same-turn or background retry. A distinct turn with authoritative USER origin, such as `continue`, may initiate at most one new execution. Success clears the pending operation and resumes that user turn; another failure stops it and leaves the gate waiting. This uniform rule applies to proactive and hard-cap pressure. All raw traces and canonical memory remain untouched on every failure.

Resolve turn origin at the inbox boundary before inter-agent conversion or input processing. Store `user` / `agent` / `system` on each turn-start entry and carry it into `AgentTurn` and request assembly. While `awaiting_user_retry`, a compaction-aware admission policy leaves agent/system entries unclaimed in the existing turn-start queue and allows the scheduler to claim the earliest USER entry behind them. No second deferred queue is needed. If recovery fails, retained entries stay queued. If it succeeds, the user turn runs first; after that active turn settles, ordinary FIFO scheduling resumes over the retained entries. Existing shutdown drain semantics continue to own all queued entries.

Add a narrow provider-safe text boundary for compaction. Raw traces, tool payloads, archives, and canonical memory remain exact. `ReadableValueRenderer` continues to own serialization, redaction, limits, and omission-marker wording, but uses shared surrogate-aware head/tail boundaries and derived-copy normalization. `CompactionResponseParser` uses the same safe end clamp for accepted text. `WorkingContextCompactionPromptBuilder` finalizes the complete derived task prompt to well-formed Unicode, preserves newline/tab, removes non-useful C0/DEL controls, and verifies the invariant before child launch. Valid multilingual text, code, paths, symbols, and emoji remain; there is no ASCII conversion or emoji-specific subsystem.

Make automatic-compaction composition a memory-owned runtime concern without inventing a new policy hierarchy. Add one discriminated `MemoryCompactionConfiguration`: `disabled`, or `enabled` with the single existing `CompactionPolicy` and the current strategy's `CompactionAgentRunner`. `AgentConfig` carries that complete non-null composition into creation; omitted direct-core construction resolves to disabled. `AgentFactory` passes it to `MemoryManager` and stops constructing an independent policy; `MemoryManager` owns and exposes the configuration while its existing coordinator remains the pending/episode/commit lifecycle owner. Remove the top-level `AgentConfig.compactionAgentRunner` cleanly.

`AutoByteusAgentRunBackendFactory` remains the server-side definition-composition owner. It must select disabled and not invoke `compactionAgentRunnerFactory` for `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` on create/restore; normal definitions receive enabled configuration with a fresh current policy and their configured runner, while runner construction failure/null fails normal-agent composition rather than silently disabling compaction. Generic `LlmPhase` remains definition-agnostic and asks the memory boundary once: disabled omits policy application, strategy/executor construction, pre-request pending execution, post-response evaluation, and immediate execution; enabled preserves the existing policy and strategy registry/resolver path. Split common provider/model request-capacity resolution from enabled-only ratio/trigger derivation so a disabled leaf still obeys total context/input caps, output reserve, and ordinary safety but never inherits the 20% automatic-compaction trigger. A large but provider-admissible one-shot child prompt is sent directly and its original completion is returned. A usable invalid response may still create the existing one parent-owned sibling correction child, also disabled. A truly inadmissible task fails through existing planning/pre-launch or typed runner handling. Do not add policy subclasses, a new controller, a second strategy, or chunking in this change.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001, AC-002 | Automatic compactor child receives selected target-agent history | Initial baseline commits and `memory-compactor-prompt-spec.md` | Preserve the exact approved target-agent system and operation prompt; no new wording or separator change | Input composition -> prompt builder -> zero-tool child; DS-001, DS-002 |
| BEH-002 | Contract | REQ-002, REQ-003, REQ-004; AC-003, AC-004, AC-005, AC-006, AC-007 | Non-error child assistant response reaches the structured strategy | Current tolerant schema-aware parser and tests | Preserve all six arrays, episode requirement, benign-format tolerance, and ambiguity rejection | Collector usable output -> summarizer -> parser -> normalized proposal; DS-002, DS-005 |
| BEH-003 | Operational | REQ-005, REQ-006; AC-008, AC-009, AC-010, AC-019 | Usable first response fails extraction/schema validation | Current bounded new-child correction implementation | Preserve exactly one response correction and one parent terminal lifecycle; typed runner failures never enter this branch | Summarizer attempt state -> parser -> correction or typed exhaustion; DS-002, DS-005 |
| BEH-004 | Contract | REQ-007, REQ-008; AC-010, AC-011, AC-021 | Valid proposal and current baseline/lineage | Existing accepted builder/validator/committer and stored data | Preserve typed episodes/semantics, host IDs, lineage, exact-trace archival, projection, atomic commit, and no mutation on failure; add budget postcondition before commit | Manager acceptance -> builder -> output validator -> committer; DS-001, DS-005 |
| BEH-005 | User / Operational | REQ-009; AC-002, AC-012 | Compactor or parent attempts a tool call | Tool-free compactor configuration and runner policy | Preserve zero tools; do not add `run_bash`, `write_file`, or direct parent-memory writes | Child event -> collector failure; DS-002 |
| BEH-006 | Contract | REQ-010; AC-013 | Existing lineage loads or a new compaction commits | Current v1/v2/v3 direct reader and v3 writer | Preserve prompt contract 3 and direct use of existing memory; no migration and no v4 bump | Store read / accepted commit; DS-005 |
| BEH-007 | System | REQ-011, REQ-012; AC-014, AC-015, AC-016, AC-017 | Successful parent usage observation is at/above the active trigger | `repeated-compaction-runtime-analysis.md`; fixed 35% planner mismatch | Derive one planning target from the same budget/trigger, validate the result below it, and prevent a successful operation that remains above target | Usage -> token budget -> eligibility -> pending budget -> target planner -> accepted postcondition; DS-001, DS-003, DS-004 |
| BEH-008 | Operational | REQ-013; AC-018, AC-019, AC-021 | Child request fails before usable output, or produces usable invalid output | `compactor-runner-failure-analysis.md`; four no-assistant/no-usage runs | Preserve the error bit and cause across the event boundary; runner error bypasses parser/repair, while usable invalid output still gets one correction | LlmPhase outcome -> assistant event -> collector -> typed runner result -> summarizer; DS-002, DS-005 |
| BEH-009 | Operational | REQ-014, REQ-015; AC-020–AC-023 | Any required compaction reaches a final failure | Same pending operation reran on the later user-authored `continue`; each runner failure incorrectly created a correction child | Stop that target-agent turn, transition pending to `awaiting_user_retry`, schedule no autonomous retry, and let one distinct USER-origin turn authorize no more than one new attempt | Executor failure -> retained pending attempt state -> terminal turn error -> eligible user request assembly -> one authorized attempt; DS-001, DS-004–DS-006 |
| BEH-010 | System | REQ-015; AC-022, AC-023 | USER, AGENT, or SYSTEM input is queued while failed pending awaits user retry | `ARCH-REV-003` / `MP-002`; core inbox/turn/input/assembler path; server AGENT/SYSTEM carrier builders | Stamp authoritative origin before conversion; non-user entries remain in the existing queue and cause no turn/retry/dispatch/error; an eligible USER entry may pass them only to resolve the gate, then normal FIFO resumes after successful user-turn settlement | Message submit -> origin-stamped inbox entry -> eligibility-aware scheduler -> retained non-user or USER retry turn -> authorized executor -> user dispatch -> queued work resumes; DS-006 |
| BEH-011 | Operational / Contract | REQ-016; AC-024–AC-026 | Selected history or accepted text is shortened at a supplementary-plane Unicode boundary | `compaction-unicode-safety-analysis.md`; exact parent/child traces and proof JSON; unsafe renderer/parser slices | Keep source exact; normalize only the derived copy; prevent split surrogate pairs in middle/end truncation; require well-formed completed prompt before launch; preserve valid multilingual/code/emoji content | Source unit -> provider-safe value renderer -> history/task builder final invariant -> child request; accepted response clamp -> future projection; DS-002, DS-005, DS-007 |
| BEH-012 | Operational / Contract | REQ-017; AC-027–AC-029 | Parent runner creates the built-in Memory Compactor with a child prompt above a configured normal-agent automatic-compaction trigger | `recursive-compaction-root-cause.md`; exact outer/nested traces, log excerpt, proof JSON, and source trace of fragmented runner/policy/strategy composition | Compose automatic compaction at agent creation through one memory-owned disabled/enabled configuration; preserve the single current policy and current pluggable-strategy path for normal agents; select disabled for the built-in leaf; keep provider request capacity independent; preserve direct one-shot execution and parent-owned sibling correction | Parent summarizer -> server child runner -> backend factory selects disabled config -> AgentFactory installs it in MemoryManager -> child LLM response with common request-capacity accounting but no automatic-compaction integration -> collector returns original output; DS-002, DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/memory-compactor-prompt-spec.md` | Exact system and first-attempt message | REQ-001, REQ-002; AC-001–AC-003 | Byte-exact unchanged prompt authority | Approved 2026-08-14 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/prompt-confusion-root-cause.md` | Original wrong-task causal analysis | REQ-001; AC-001, AC-002 | Establishes why the initial prompt correction remains necessary | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/compaction-output-contract-decision.md` | Original structured-output decision | REQ-001–REQ-010; AC-001–AC-013 | Preserved contract and least-authority boundary | Approved 2026-08-14 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/repeated-compaction-runtime-analysis.md` | 80%→20% trigger/planner evidence | REQ-011, REQ-012; AC-014, AC-015, AC-016, AC-017 | Defines the trigger-alignment defect and observed sequence | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/compactor-runner-failure-analysis.md` | Four child failures, pending retry, and corrected re-entry direction | REQ-013–REQ-015; AC-018–AC-023 | Defines the event-boundary defect and aligns recovery with USER-only authorization and queued non-user preservation | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/compaction-runtime-behavior-examples.md` | Concrete intended runtime outcomes | REQ-011–REQ-017; AC-014–AC-029 | Governs ratio lowering, later crossing, runner/output distinction, user-only retry, queued non-user preservation, Unicode-safe rendering, leaf execution, and unattainable target | Approved 2026-08-14/15 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/compaction-memory-shape-reassessment.md` | Response/storage option analysis | REQ-002, REQ-007–REQ-010; AC-003, AC-007–AC-013 | Records why JSON is transient, episodes are continuation-critical, direct writes are rejected, and the existing contract is preserved | Resolved evidence/decision context; user decision 2026-08-14 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/repeated-compaction-at-20-percent.png` | User-visible repeated-success sequence | REQ-011, REQ-012; AC-014–AC-017 | Shows three rapid compaction cards after the ratio change | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/repeated-compaction-server-log-excerpt.txt` | Exact trigger/plan/result logs | REQ-011, REQ-012 | Runtime numbers for planning regression coverage | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/compactor-provider-failure-and-repeat.png` | User-visible later failure sequence | REQ-013, REQ-014; AC-018–AC-021 | Shows two failures and the parent token context | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/compactor-runner-failure-evidence.json` | Correlated parent/child trace summary | REQ-013, REQ-014 | Proves error completion was not model-authored compaction output | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/compaction-unicode-safety-analysis.md` | Unicode request-rejection analysis and intended safety boundary | REQ-016; AC-024–AC-026 | Defines source-versus-derived ownership, safe middle/end truncation, final prompt invariant, and direct coverage | Approved 2026-08-15 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/compaction-unicode-request-rejection.png` | User-visible HTTP 400 reproduction | REQ-016; AC-024, AC-026 | Shows correct trigger and typed provider rejection | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/compaction-unicode-request-rejection-log.txt` | Focused exact trigger/child/failure log | REQ-013, REQ-016; AC-018, AC-024–AC-026 | Proves one pre-inference failure and correct fail-closed transport | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/compaction-unicode-truncation-proof.json` | Machine-readable source-to-wire proof | REQ-016; AC-024–AC-026 | Supplies the exact valid shield source and derived lone-surrogate fixture | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/recursive-compaction-root-cause.md` | Recursive-compactor analysis and intended leaf boundary | REQ-017; AC-027–AC-029 | Defines exact recursion cause, ownership, rejected alternatives, and direct coverage | Approved 2026-08-15 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/recursive-memory-compactor-ui.png` | Visible double-wrapper nested task | REQ-017; AC-027, AC-028 | Shows the user-observed symptom | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/recursive-memory-compactor-server-log-excerpt.txt` | Exact parent/outer/nested log chain | REQ-017; AC-027–AC-029 | Supplies operation IDs, usage thresholds, nested launch, parent commit, and actual-below reset | Evidence; N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/evidence/recursive-memory-compactor-proof.json` | Machine-readable recursion proof | REQ-017; AC-027–AC-029 | Supplies prompt sizes, wrapper counts, source hashes, and target capability outcome | Evidence; N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`, bounded `Behavior Change`, and local `Refactor` on top of the implemented prompt/parser baseline.
- Current design issue found: `Yes`.
- Root cause classification: `Local Implementation Defect` (UTF-16-unsafe middle/end slicing), `Missing Invariant` (provider-facing text, post-compaction target, actual-observation reset, failed-pending authorization, and compactor leaf execution), `Duplicated Policy Or Coordination` (trigger versus fixed retention), `Boundary Or Ownership Issue` (LLM error bit lost before collector, original turn origin absent at pending execution, and automatic-compaction composition fragmented among server runner provisioning, top-level agent config, unconditional factory policy creation, memory ownership, and LLM-phase strategy assembly), and `Shared Structure Looseness` (duplicated/minimal pending request cannot carry the trigger-time budget or attempt state, while pending alone cannot own post-success state after accepted cleanup).
- Refactor needed now: `Yes`.
- Evidence: the supported 20% setting produced three rapid successful operations; four child runs had no assistant trace or usage yet reached the JSON parser; the identical pending operation reran before `continue` could dispatch; supported AGENT/SYSTEM turn starts share the same pending executor and current FIFO head-only selection cannot both preserve them and admit a user behind them; a later valid shield emoji was split into lone U+D83D and rejected by DeepSeek before inference; the Unicode-safe outer child then inherited the 20% policy and launched a nested compactor over its own wrapped task.
- Design response: introduce a single planning-budget DTO and target formula, preserve one coordinator-owned pending gate with explicit attempt state, add authoritative turn-start origin and eligibility-aware same-queue admission, add typed assistant error projection/collector failure, type repair exhaustion, validate the budget before commit, centralize Unicode-safe derived compaction text without touching source stores, and replace the fragmented runner/policy composition with one memory-owned disabled/enabled configuration selected at agent creation. Preserve the one current policy, existing coordinator, and current pluggable strategy path.
- Refactor rationale: local patches such as lowering the 35% constant, matching error-message text, clearing every failed request, treating every pending record as executable, rejecting/dropping non-user messages, adding a second deferred queue, setting the compactor ratio to 100%, retaining a nullable runner while a different owner constructs policy, or changing separators would leave multiple owners for policy/composition, conflate model text with runtime failure, discard supported work, block user recovery, weaken hard-cap safety, or merely hide recursion. Conversely, adding multiple policy classes/controllers/strategies would exceed current evidence.
- Intentional deferrals and residual risk: exact tokenizer admission/chunking for one enormous newly arriving message or genuinely oversized compactor task, provider fallback, provider quota policy, UI denominator redesign, token-ledger database repair, and factual-summary evaluation remain separate. Token estimation can differ from provider accounting; calibration and headroom reduce that risk, and the accepted postcondition fails closed before commit.

## Terminology

- **Input budget (`B`)**: safety-adjusted maximum combined parent input tokens, currently derived from total context minus reserved output and safety margin.
- **Trigger threshold (`T`)**: `floor(compactionRatio × B)`; proactive compaction begins here.
- **Planning budget**: immutable per-operation values captured from the triggering token observation and carried with the pending request.
- **Post-compaction target (`P`)**: upper bound for the estimated complete finalized prompt, not merely the recent suffix.
- **Usable assistant response**: non-error public assistant completion text. Error completions, interruptions, timeouts, terminal child failures, and tool approvals are runner failures.
- **Pending attempt state**: `initial_attempt_ready` permits the one automatic first execution; `attempt_in_progress` identifies that execution and turn; `awaiting_user_retry` permits no execution until a distinct USER-origin turn authorizes one attempt.
- **Authoritative turn-start origin**: `user`, `agent`, or `system`, resolved from the original inbox event/sender type before input conversion and stored on the turn-start entry and active turn.
- **Fail-closed pending gate**: a requested compaction remains pending until accepted commit clears it. Final failure ends the current target-agent turn and changes authorization to `awaiting_user_retry`; pending presence by itself is not executable authority.
- **Provider-safe derived text**: a temporary rendered copy that is well-formed Unicode, retains valid multilingual/code/symbol content, removes only non-useful unsafe controls, and never splits a surrogate pair. It is not a rewritten raw trace or canonical-memory record.
- **Memory compaction configuration**: runtime-only `disabled`, or `enabled` with the single current `CompactionPolicy` and current strategy runner. It is supplied at agent creation and owned by `MemoryManager`.
- **Non-compactable leaf**: an agent run whose memory compaction configuration is disabled; it still obeys provider/model request capacity and can execute its one-shot model task, but cannot evaluate, request, or execute automatic compaction against itself.

## Design Reading Order

1. Preserve the approved prompt/schema/commit baseline.
2. Carry one observed planning budget through trigger, pending request, strategy, plan, and validation.
3. Preserve the child `isError` contract through server collection.
4. Apply uniform fail-closed/manual-retry behavior with explicit pending attempt state.
5. Admit USER versus non-user turn starts from authoritative origin while retaining one ordinary queue.
6. Make derived compaction input/output clamps Unicode-safe while preserving exact source data.
7. Compose automatic compaction through the memory boundary, provision the built-in Memory Compactor as disabled, and keep provider request capacity independent.
8. Map these owners into current files, remove duplicated policies, and validate without migration.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the independent fixed-35%-of-input suffix decision as the authoritative planner cap. The 35% value survives only as a quality preference capped by the trigger-derived complete-prompt target.
- Remove `enforceBudgetAndCompactablePrefix` behavior that can override the budget by retaining the minimum suffix or collapse an all-fitting candidate set without reference to the target.
- Remove the duplicated reduced `PendingCompactionRequest` definition in `llm-request-recovery.ts`; use the coordinator-owned shared runtime shape containing the trigger-time planning budget.
- Remove pending-presence-only execution checks and any direct derivation of compaction executability from `pendingRequest !== null`.
- Remove the path that treats `ASSISTANT_COMPLETE` with `is_error=true` as candidate compaction text.
- Remove generic `Error` construction for response-repair exhaustion in favor of a typed response-validation failure.
- Remove direct UTF-16 `slice` boundaries from compaction middle/end truncation; one shared safe boundary replaces them without a compatibility switch.
- Remove top-level `AgentConfig.compactionAgentRunner`, unconditional `AgentFactory` policy construction, unconditional runner provisioning for the built-in Memory Compactor, and every code path that lets a disabled runtime evaluate or execute automatic compaction.
- Do not keep old planner behavior behind a flag, accept error prose as a fallback, dual-write pending shapes, or add a v4 prompt alias.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: run-local `episodic.jsonl`, `semantic.jsonl`, `compaction_lineage.jsonl`, raw trace archives/manifests, and `working_context_snapshot.json`; representative Daily Assistant lineage has five successful heads with episode/semantic counts `4/25`, `3/21`, `2/18`, `2/18`, and `5/0`.
- Relevant code-model, serialization, semantic, or physical-store change: no persisted schema change. The expanded pending request/attempt state, post-success threshold episode, authoritative turn origin, ordinary inbox entries, planning assessment, LLM request recovery snapshot, provider-safe rendered text, and memory-compaction configuration are runtime-only objects. Prompt contract remains 3.
- Normal reader/writer behavior and representative evidence: current v1/v2/v3 lineage reader and typed episode/semantic stores already load the representative data; accepted committer remains the only writer.
- Required semantics and invariants under direct use: all existing IDs, timestamps, categories, facts, salience, lineage membership, archived traces, and current projection remain unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: existing user memory must not be rewritten; compactor receives no filesystem authority.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: no stored schema changes. The malformed lone surrogate existed only in one failed child prompt; the valid shield remains in the parent raw trace and a fixed build regenerates a safe derived copy. Recursive child-run archives are retained evidence but are not read as capability configuration or canonical parent memory. Migration or deletion would add I/O and corruption/recovery risk without changing runtime meaning. The runtime-only post-success suppression state may reset on process restart, which can permit one additional proactive operation after restart; this bounded residual does not justify writing lifecycle state into canonical memory.
- Acceptance criteria or design constraints supported: REQ-007–REQ-010, REQ-014–REQ-017; AC-010–AC-013, AC-020–AC-029.

### Migration Plan

N/A — no persisted transformation is required.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004, BEH-007, BEH-009 | Parent token-usage observation or an authorized retained pending gate at request assembly | One accepted commit followed by an observation-governed threshold episode, or one fail-closed turn awaiting a distinct USER-origin retry | `MemoryManagerCompactionCoordinator` for pending/episode/attempt state; `PendingCompactionExecutor` for operation lifecycle | Exposes the full supported automatic-compaction and authorized manual-retry path |
| DS-002 | Primary End-to-End | BEH-001–BEH-003, BEH-005, BEH-008 | Summarizer sends one child task | Typed usable output or typed runner failure with child metadata | `ServerCompactionAgentRunner` | Keeps model output distinct from child execution failure |
| DS-003 | Bounded Local | BEH-007 | Per-operation planning budget | Target-respecting `MessageCompactionPlan` or typed planning failure | `WorkingContextMessageWindowPlanner` | Makes the trigger a planning postcondition instead of a separate policy |
| DS-004 | Bounded Local | BEH-007, BEH-009 | New token-usage observation or accepted operation result | Request, await actual-below observation, bounded inadequate-reduction suppression, actual-below reset, budget-key reset, or hard-cap override | `CompactionThresholdGate` owned by the coordinator | Prevents estimated success from creating another operation before an actual below-threshold observation |
| DS-005 | Return-Event | BEH-002–BEH-004, BEH-006, BEH-008, BEH-009 | Child/strategy result or failure | One parent terminal status and either one commit or no canonical mutation | `PendingCompactionExecutor` | Preserves coherent reporting and atomicity |
| DS-006 | Primary End-to-End | BEH-009, BEH-010 | USER/AGENT/SYSTEM input submission while a failed pending operation awaits user retry | Non-user entry retained without work, or one USER-authorized retry followed by user dispatch and later FIFO resumption | `AgentEventScheduler` for dispatch selection; `CompactionRetryTurnAdmissionPolicy` for eligibility; coordinator/executor for authorization | Prevents autonomous retries and message loss without a second queue or blocked user recovery |
| DS-007 | Bounded Local | BEH-011 | Raw/source value or accepted compactor text requires provider-facing rendering/clamping | Well-formed, control-safe, bounded derived text or typed local construction failure before child launch | `ProviderSafeCompactionText` utility serving `ReadableValueRenderer`, parser clamp, and task-prompt builder | Prevents deterministic request rejection without mutating raw traces or stripping valid Unicode |
| DS-008 | Primary End-to-End | BEH-012 | Parent summarizer asks `ServerCompactionAgentRunner` to execute the built-in Memory Compactor | Original child completion or typed child failure reaches the parent with zero descendant compactor run | `AutoByteusAgentRunBackendFactory` for definition-aware composition; `MemoryManager` for configuration ownership; generic `LlmPhase` for thin lifecycle integration | Prevents recursive self-compaction while cleaning fragmented policy/runner ownership and preserving direct initial/correction sibling execution |

## Primary Execution Spine(s)

**DS-001 — automatic compaction and parent continuation**

`Parent LLM response usage -> TokenBudget -> MemoryManager.evaluateCompactionObservation -> coordinator/threshold gate -> pending request with planning budget + initial attempt state -> authorized request assembly/immediate execution -> PendingCompactionExecutor -> strategy/planner -> summarizer/child -> MemoryManager.prepareCompaction -> accepted budget/output validation -> AcceptedCompactionCommitter -> pending clear + post-success awaiting-observation state -> later authoritative usage observation, or final fail-closed turn with pending retained in awaiting-user state`

**DS-002 — child execution outcome**

`AgentCompactionSummarizer -> ServerCompactionAgentRunner -> child AgentRun/LlmPhase -> assistant-complete event with is_error -> CompactionRunOutputCollector -> CompactionAgentRunnerResult or CompactionAgentRunnerError -> summarizer parser/correction decision`

**DS-006 — external turn admission during failed-pending recovery**

`User/agent/system message submission -> AgentEventInbox origin-stamped turn_start entry -> AgentEventScheduler + CompactionRetryTurnAdmissionPolicy -> non-user remains unclaimed OR earliest USER is claimed -> AgentWorker creates AgentTurn(origin=user) -> LLMRequestAssembler -> PendingCompactionExecutor.begin authorized attempt -> failure retains queue/gate OR success clears pending -> current user turn dispatches -> active turn settles -> normal FIFO resumes retained entries`

**DS-008 — built-in Memory Compactor leaf execution**

`Parent AgentCompactionSummarizer -> ServerCompactionAgentRunner -> AgentRunService.createAgentRun(autobyteus-memory-compactor) -> AutoByteusAgentRunBackendFactory resolves canonical built-in ID and selects MemoryCompactionConfiguration.disabled without runner creation -> AgentFactory installs configuration in MemoryManager -> child resolves common provider request capacity -> LLMRequestAssembler receives no pending executor -> child provider request/response -> LlmPhase skips automatic-compaction policy/strategy/evaluation/immediate execution -> collector returns original completion -> parent parser, or one separately created disabled sibling correction leaf`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The latest successful parent usage is resolved into one immutable planning budget. The threshold gate may create one pending operation with one automatic initial attempt. The operation either commits once, clearing pending while latching that an actual below-threshold observation is still required, or fails once and enters `awaiting_user_retry`; a later authorized USER turn can begin one new attempt. | token observation, threshold episode, planning budget, pending operation/attempt state, proposal, accepted compaction | coordinator/executor | reporting, strategy resolution, request recovery |
| DS-002 | One child run publishes either a non-error completion or an explicit error completion/lifecycle failure. The collector rejects every failure before response parsing and the server runner preserves the run ID and cause in a typed error. | child task, child run, assistant outcome, runner result | server runner | event conversion, timeout, cleanup |
| DS-003 | The planner calculates the complete-prompt target, subtracts required/system/protected/untracked/replacement costs, and selects only a newest natural suffix that fits while leaving a compactable prefix. | budget assessment, message units, compaction plan | message-window planner | token estimation, protected tool protocol |
| DS-004 | One runtime-only state machine survives successful pending cleanup. Accepted success enters `awaiting_below_observation`; only an actual same-key usage below `T` rearms normal proactive eligibility. A first fresh same-key observation at/above `T` emits one inadequate-reduction diagnostic and suppresses another proactive operation until actual-below or budget-key reset; hard cap overrides suppression. | threshold episode, budget key, completed operation identity, first inadequate observation | threshold gate | diagnostic reason codes |
| DS-005 | Parsed output returns through normalization and accepted construction. Finalized prompt cost is validated before the committer. A final failure transitions the pending attempt to `awaiting_user_retry` and terminates the target-agent turn; success commits once and installs the post-success threshold episode. | strategy result, accepted compaction, attempt disposition, terminal outcome | executor/manager | failure classification, reporter enrichment |
| DS-006 | Every external turn-start entry receives immutable origin before input conversion. While the pending attempt awaits user retry, scheduler admission treats non-user entries as temporarily ineligible but leaves them in the sole FIFO queue; it selects the earliest USER behind them. The active turn carries that origin to request assembly, where the coordinator authorizes at most one retry for that turn. Success lets the user turn proceed and normal FIFO resume afterward; failure leaves retained entries untouched. | turn-start entry, authoritative origin, admission decision, authorized retry, retained queue order | scheduler/admission policy + coordinator/executor | inbox availability/wakeup, shutdown drain |
| DS-007 | A raw/source value is serialized and redacted without mutation, normalized into a provider-safe derived copy, and omitted/clamped only at surrogate-safe boundaries. The completed task prompt is finalized and checked before the child runner receives it. Accepted episode/fact text uses the same safe end clamp before it can enter a later context. | exact source text, derived text, safe boundary, completed task prompt | provider-safe text utility + renderer/prompt builder | redaction, omission accounting, local input-construction diagnostics |
| DS-008 | The parent runner creates a normal visible child run. Server provisioning recognizes the canonical built-in definition and supplies disabled automatic compaction; `AgentFactory` installs that composition in the memory boundary; generic core still resolves ordinary request capacity but neither applies a policy, constructs/passes a strategy/executor, nor evaluates post-response compaction. The child returns its original response; an optional correction is a new disabled sibling. | parent child task, built-in definition, memory compaction configuration, request capacity, child response | server backend factory + MemoryManager + generic LLM phase | canonical built-in registry constant, configuration copy semantics, optional detailed skip logging, collector cleanup |

## Spine Actors / Main-Line Nodes

- `evaluateLlmPhaseCompaction`: thin adapter from provider usage observation into the memory boundary and reporter.
- `MemoryManager` / `MemoryManagerCompactionCoordinator`: authoritative pending-operation and post-success threshold-episode boundary.
- `CompactionThresholdGate`: bounded local post-success eligibility transition owner.
- `CompactionPlanningBudgetResolver`: pure owner of `B`, `T`, headroom, quality cap, and `P`.
- `PendingCompactionExecutor`: one operation's start/propose/accept/validate/commit/fail lifecycle.
- `AgentEventInbox`: authoritative turn-start entry/origin and single FIFO storage owner.
- `AgentEventScheduler`: selects the first currently dispatchable entry without consuming deferred non-user entries.
- `CompactionRetryTurnAdmissionPolicy`: narrow adapter from public failed-pending state plus entry origin to dispatch eligibility.
- `AgentTurn`: immutable carrier of authoritative external origin across input conversion and tool continuations.
- `ProviderSafeCompactionText`: narrow pure owner of well-formed derived text, disallowed-control removal, and surrogate-safe head/tail/end boundaries.
- `MemoryCompactionConfiguration`: tight runtime-only composition of disabled, or enabled with the one existing policy and current strategy runner.
- `AutoByteusAgentRunBackendFactory`: server owner of built-in-definition-aware configuration selection and runner construction.
- `AgentFactory`: composition handoff; installs the supplied configuration instead of inventing a policy.
- `LlmPhase`: thin generic integration point that consumes the `MemoryManager` configuration while keeping provider request capacity separate.
- `WorkingContextMessageWindowPlanner`: target-respecting unit selection.
- `AgentCompactionSummarizer`: initial output/correction state.
- `ServerCompactionAgentRunner`: one child execution and typed outcome.
- `MemoryManager.prepareCompaction` / `AcceptedCompactionBuilder`: host-owned accepted result.
- `AcceptedCompactionCommitter`: sole canonical mutation owner.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `MemoryCompactionConfiguration` | one runtime's explicit automatic-compaction enablement and, when enabled, the single current policy plus current strategy runner | provider/model identity, persisted agent settings, policy subclasses, strategy selection registry, pending state, or lifecycle reporting |
| `CompactionPolicy` | threshold and hard-cap pressure classification from prompt tokens and budget for an enabled runtime | enablement, runner/strategy execution, provider capacity, pending state, episode history, or unit selection |
| `CompactionPlanningBudgetResolver` | immutable target formula and budget key | message selection, model output, persistence |
| `MemoryManagerCompactionCoordinator` | the pending request, attempt state/authorization, separate post-success threshold episode, baseline/lineage fencing, and success/failure control transition | provider events, response parsing, token estimation, or inbox storage |
| `CompactionThresholdGate` | pure transitions over the coordinator-owned post-success episode for one budget key | canonical memory, child retries, hard input calculation, or pending-operation mutation |
| `WorkingContextMessageWindowPlanner` | unit costs, protected suffix, fit, compactable prefix, plan assessment | trigger eligibility or pending lifecycle |
| `ServerCompactionAgentRunner` | create/post/collect/terminate one child; typed runner metadata | JSON parsing or response correction |
| `CompactionRunOutputCollector` | event-level success versus execution-failure classification | model schema validation |
| `AgentCompactionSummarizer` | non-error output parsing and one correction | provider retry/backoff or parent pending state |
| `PendingCompactionExecutor` | one authorized execution attempt, fail-closed parent-turn result, and accepted completion invocation | token target formula, event parsing, retry scheduling, or turn-origin inference |
| `AgentEventInbox` / `InboxQueueStore` | immutable entry origin, one queue, matching claim, and shutdown drain | compaction state or provider retry policy |
| `AgentEventScheduler` | priority and first-eligible claim using injected admission policy | pending state mutation or input conversion |
| `CompactionRetryTurnAdmissionPolicy` | whether one turn-start entry is dispatchable under the public `awaiting_user_retry` query | queue mutation, attempt authorization, or message conversion |
| `AgentWorker` / `AgentTurn` | active-turn lifecycle and immutable origin propagation | compaction eligibility decisions |
| `ProviderSafeCompactionText` | derived-copy Unicode normalization, disallowed-control removal, and safe slice-boundary calculation | source mutation, redaction policy, omission-marker wording, parser schema, or provider retry |
| `ReadableValueRenderer` | source serialization/redaction, configured visible limit, and omission-marker semantics using safe boundaries | raw-trace writes or duplicated Unicode repair logic |
| `WorkingContextCompactionPromptBuilder` | exact approved template composition plus final derived-text invariant before child launch | source cleanup, retry policy, or model response validation |
| `AutoByteusAgentRunBackendFactory` | identify `MEMORY_COMPACTOR_AGENT_DEFINITION_ID`; select disabled without runner-factory invocation; compose normal agents as enabled with a fresh current policy and required runner, or fail their composition | core compaction lifecycle, child prompt parsing, policy subclasses, persisted opt-out, or silent disablement |
| `AgentFactory` | pass the supplied memory-compaction configuration into `MemoryManager` on create/restore | choose built-in identity, create a second policy, or infer enablement from a runner |
| `MemoryManager` | own the automatic-compaction configuration and existing coordinator; expose one focused enabled/disabled read and no-work disabled observation result | provider request-capacity calculation, server identity, strategy registry selection, event reporting, or child execution |
| `LlmPhase` | resolve common request capacity and integrate automatic compaction only for the enabled configuration returned by `MemoryManager` | server definition identity, independent policy construction, special ratios, or hidden fallback summarization |
| accepted builder/validator/committer | typed result, final context, postcondition, ordered commit | trigger/retry policy or child tools |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryManager.evaluateCompactionObservation` | coordinator + threshold gate | one authoritative call from LLM phase | duplicate trigger/episode decisions |
| `MemoryManager.prepare/commitAcceptedCompaction` | coordinator + accepted builder/committer | preserve existing public memory boundary | parser/runner internals |
| `WorkingContextCompactionStrategyResolver` | registered strategy factory | binds static dependencies and per-operation planning budget | cached/stale dynamic budget state |
| `MemoryManager.getPendingCompactionGate` / `beginPendingCompactionAttempt` | coordinator attempt state | expose a narrow admission query and atomically authorize one execution | event-type parsing, queue selection, or provider retry |
| `AgentConfig.memoryCompaction` | server composition -> `AgentFactory` -> `MemoryManager` | carry one non-null disabled/enabled runtime composition; copy disabled by value or clone enabled policy scalars while retaining runner identity | built-in identity, ratio interpretation, persistence, or a parallel runner/boolean field |
| `MemoryManager.getAutomaticCompactionConfiguration` | memory-owned configuration | give `LlmPhase` one closed disabled/enabled decision and enabled dependencies | server identity, settings resolution, provider capacity, or coordinator internals |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Fixed 35%-of-input suffix as independent authority | Can exceed low trigger and cause repeated compactions | `CompactionPlanningBudgetResolver` target plus capped quality preference | In This Change | 35% remains only `qualityRetentionCapTokens` |
| Budget-overriding minimum/fallback branch | Violates target and caused abrupt all-candidate collapse | target-respecting suffix selection and typed unattainable/no-prefix errors | In This Change | recent-unit minimum becomes a preference, never an override |
| Split `shouldCompact` then `requestCompaction` policy at LLM caller | Caller coordinates policy and manager internals | `MemoryManager.evaluateCompactionObservation` | In This Change | reporter receives returned decision |
| Duplicated pending request type in recovery | Cannot safely carry nested planning/request metadata | shared coordinator-owned `PendingCompactionRequest` and deep-copy function | In This Change | runtime-only |
| Independent mutable `compactionRequired` boolean/setter and pending-presence executability | Can contradict pending state and lets non-user turns retry a failed operation | coordinator-owned `PendingCompactionAttemptState` plus `beginPendingCompactionAttempt` authorization | In This Change | `hasPendingCompaction` is only presence; execution requires state + turn origin + turn ID |
| Lost assistant error marker | Allows error prose into parser | `is_error` assistant event field and collector rejection | In This Change | normal response content unchanged |
| Generic repair-exhaustion `Error` | Final classifier cannot distinguish response validation | typed `CompactionResponseRepairExhaustedError` | In This Change | no message-compatible fallback |
| Automatic deferred/suppressed failure retry policy proposed in SR-002 | Contradicts the user's approved fail-closed/manual-retry policy and adds unnecessary retry scheduling | retain one pending operation; one automatic initial attempt, then only a distinct USER-origin turn authorizes one attempt | In This Change | preserves REQ-007/AC-010 pending retention and active raw traces |
| Consuming, rejecting, or copying blocked non-user turn starts | Risks message loss, delivery-contract breakage, a second queue lifecycle, or user-retry head blocking | origin-stamped existing entry + eligibility-aware matching claim in the same queue | In This Change | no persisted deferred store and no special shutdown path |
| Top-level nullable `AgentConfig.compactionAgentRunner` | Separates strategy execution from policy/enablement and permits ambiguous enabled-without-runner composition | `AgentConfig.memoryCompaction: MemoryCompactionConfiguration` | In This Change | clean-cut field removal; no alias/parallel boolean |
| Unconditional `new CompactionPolicy()` in `AgentFactory` | Overrides agent-creation composition and enables the specialized leaf | enabled configuration supplied by server and installed in `MemoryManager` | In This Change | no default second policy in factory |
| Unconditional runner-factory invocation for `autobyteus-memory-compactor` | Creates a recursive worker hierarchy and can turn a valid outer response into failure | canonical server built-in ID selects disabled configuration | In This Change | normal definitions invoke the factory exactly once and receive enabled config |
| Disabled-runtime strategy/executor construction and post-response evaluator | Would mutate compaction state or fail late despite explicit disabled configuration | one closed configuration branch in `LlmPhase` | In This Change | assembler already accepts a null executor; no null-object policy/runner |

## Return Or Event Spine(s) (If Applicable)

`LlmPhaseOutcome(isError) -> LLMResponsePipeline -> AgentExternalEventNotifier -> AssistantCompleteResponseData.is_error -> AutoByteusStreamEventConverter -> AgentRunEvent.ASSISTANT_COMPLETE -> CompactionRunOutputCollector -> CompactionAgentRunnerError -> AgentCompactionSummarizer -> PendingCompactionExecutor -> CompactionRuntimeReporter -> UI/log terminal status`

The notifier does not convert ordinary model failures into terminal global agent status. It carries the already-existing per-response error fact. The compaction collector is the adapter that interprets an error response as unusable for this child task.

## Bounded Local / Internal Spines (If Applicable)

### DS-003 — target-respecting planner

Parent: `WorkingContextMessageWindowPlanner`.

`planning budget -> build units/costs -> reserve system + protected suffix + estimation gap + replacement memory -> calculate recent suffix capacity -> select newest fitting units -> ensure compactable natural prefix -> return plan assessment or typed planning error`

### DS-004 — post-success threshold gate

Parent: `MemoryManagerCompactionCoordinator`.

- `ready` + `T <= prompt < B` -> create one pending `threshold_crossing` request carrying the current planning budget.
- Any final execution failure -> transition that pending request to `awaiting_user_retry`, record the failed execution turn, report one terminal error, and stop the target-agent turn. The gate schedules nothing. A distinct USER-origin turn may invoke the retained operation once before dispatch.
- Accepted commit -> clear the pending request through the existing committer hook and set the separate runtime episode to `awaiting_below_observation { budgetKey, completedOperationId }`. The validated estimate `P < T` is not an observation.
- First fresh provider usage under the same budget key:
  - `prompt < T` -> transition to `ready` without requesting compaction; a later actual crossing may create a new operation.
  - `T <= prompt < B` while `awaiting_below_observation` -> do not request another proactive operation; transition to `inadequate_reduction_suppressed`, emit exactly one `post_success_usage_not_below_trigger` diagnostic containing the completed operation ID, observed prompt, `T`, `P`, and budget key.
  - `T <= prompt < B` while already `inadequate_reduction_suppressed` -> remain suppressed and emit only detailed log state, not repeated lifecycle/error cards.
- Budget-key change -> reset the prior episode first, then evaluate the same fresh observation under the new key. If it is at/above the new `T`, one new configuration-driven operation may be requested.
- Any `prompt >= B` -> hard-cap safety overrides `awaiting_below_observation` or suppression and creates one pending `hard_input_cap` request. Failure is still fail-closed and manual-retry only.

There is no timer, background retry, linked deferred operation, retry counter, or persisted cooldown schema. Manual retries reuse the pending operation identity and are distinguished by execution turn ID and child run ID. The post-success episode is separate because accepted commit must continue clearing pending state atomically.

### DS-006 — failed-pending turn admission and execution authorization

Parent: `AgentEventScheduler` for queue selection and `MemoryManagerCompactionCoordinator` for attempt authorization.

- `AgentEventInbox` resolves and stores `TurnStartOrigin` before later conversion:
  - `UserMessageReceivedEvent` + `SenderType.USER` -> `user`;
  - `InterAgentMessageReceivedEvent` or `UserMessageReceivedEvent` + `SenderType.AGENT` -> `agent`;
  - `UserMessageReceivedEvent` + `SenderType.SYSTEM` -> `system`;
  - `SenderType.TOOL` remains invalid as a turn start.
- When no pending request is `awaiting_user_retry`, every turn-start entry is eligible and the current FIFO behavior is unchanged.
- While `awaiting_user_retry`, the admission policy returns eligible only for `origin='user'`. `InboxQueueStore.claimFirstMatching('turn_start', predicate)` claims the first such entry without moving or copying earlier non-user entries.
- Scheduler `hasDispatchable` and `claimNextDispatchable` use the identical predicate. If only retained non-user entries exist, the worker waits rather than spinning; a newly enqueued USER/lifecycle event or a post-turn dispatchability wakeup re-evaluates the queue.
- `TurnStartInboxEventHandler` passes the entry origin into `AgentWorker`; `AgentTurn` retains it unchanged through `AgentInputPipeline` conversion and tool continuations.
- `LLMRequestAssembler` passes `{turnId, turnOrigin}` to `PendingCompactionExecutor.executeIfAuthorized`. The coordinator atomically begins:
  - `initial_attempt_ready` for any origin, once; or
  - `awaiting_user_retry` only for USER origin and only when the current turn ID is not the last failed attempt turn.
- Beginning transitions to `attempt_in_progress {authorization, executionTurnId}`. Accepted commit clears pending. Any final failure transitions to `awaiting_user_retry {lastFailedExecutionTurnId}`. A duplicate/re-entrant call in the same turn is not authorized.
- If a USER-authorized retry succeeds, request assembly appends/renders that user message normally. The active turn prevents other turn-start dispatch until it settles; then the scheduler reverts to ordinary FIFO and retained non-user entries run in their original relative order.
- If the retry fails, the user turn terminates and retained non-user entries remain in place. Another distinct USER entry is required.
- Existing shutdown drain owns every retained entry because none leaves the normal queue.

The scheduler owns selection, not compaction state; the coordinator owns authorization, not queue order. A defensive assembler authorization failure is terminal before the current message is appended, so bypassing admission cannot dispatch target work.

### Existing response repair

Parent: `AgentCompactionSummarizer`.

`non-error output -> parse -> success OR CompactionResponseParseError -> one new child correction -> parse -> success or typed CompactionResponseRepairExhaustedError`.

A `CompactionAgentRunnerError` at either child execution is never converted to a parser stage.

### DS-007 — provider-safe derived text

Parent: `ReadableValueRenderer` for source presentation and `WorkingContextCompactionPromptBuilder` for the completed child task.

`exact source value -> serialize/redact -> toWellFormed derived copy -> normalize CRLF/CR to LF -> remove C0/DEL except LF/TAB -> calculate surrogate-safe head/tail or end boundaries -> insert existing omission marker / clamp -> escape reserved history delimiter -> compose exact approved task template -> final provider-safe normalization + well-formed invariant -> child runner`

The utility does not modify its input. A safe middle boundary moves the head end left when it would leave a high surrogate and moves the tail start right when it would begin with a low surrogate. Omitted-count calculation uses the adjusted retained lengths. The final prompt guard repairs pre-existing lone surrogates in old/external text to U+FFFD on the derived copy; an unexpected failure to produce well-formed text becomes a typed local input-construction failure before any provider call. `CompactionResponseParser.clampText` uses the same safe end primitive so a stored/projection-bound accepted fact cannot recreate the defect later.

### DS-008 — memory-owned automatic-compaction composition and built-in leaf

Parents: `AutoByteusAgentRunBackendFactory` for definition-aware composition, `MemoryManager` for runtime ownership, and `LlmPhase` for thin generic integration.

- Add `MemoryCompactionConfiguration` under `memory/compaction` as exactly two variants:
  - `disabled`, with no policy or runner fields;
  - `enabled`, with `policy: CompactionPolicy` and `runner: CompactionAgentRunner` both required.
- Do not introduce an optional runner inside the enabled variant, alternative policy classes, a strategy ID/config bag, or a second controller. The existing runtime settings/registry still select the current strategy, and the registered `structured-json` strategy consumes the enabled runner.
- Replace `AgentConfig.compactionAgentRunner` with non-null `AgentConfig.memoryCompaction`. The constructor default for an omitted direct-core argument is the complete `disabled` variant, never an enabled partial. `copy()` preserves disabled by value; for enabled it constructs a fresh `CompactionPolicy` from the three scalar settings and retains the runner object identity. This prevents cross-runtime policy mutation without pretending the runner is serializable/cloneable.
- `AgentFactory.createRuntimeWithId` always passes `config.memoryCompaction` into `MemoryManager`; remove its unconditional `new CompactionPolicy()`. `MemoryManager` stores the configuration, exposes a closed read to `LlmPhase`, and uses the enabled policy for observation classification. Its direct-construction default is also the complete disabled variant so memory-store/test consumers do not silently acquire automatic compaction; the production `AgentFactory` path never relies on that default. A disabled observation returns a no-work decision without touching the coordinator.
- Import and compare canonical `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` only in the server backend factory after resolving the requested definition. For that definition, select disabled and do not invoke `compactionAgentRunnerFactory`; shared `buildAgentConfig` applies this to create and restore. Every other production definition invokes the current runner factory once and receives enabled configuration with a fresh current policy. Tighten the runner-factory target contract to return a non-null runner; a thrown failure or a defensive runtime null check fails normal-agent composition at the existing agent-creation error boundary instead of silently converting the normal agent to disabled. Existing tests that returned null merely to bypass compaction must supply an explicit runner stub or construct a disabled core config at the appropriate test boundary.
- Split `agent/token-budget.ts` conceptually into common `LlmRequestCapacity` resolution and enabled-only `CompactionTokenBudget` derivation. Preserve the approved arithmetic: provider/model context and input caps, output reserve, ordinary safety margin, overrides, `B`, `T`, and `P` do not change. The common resolver accepts a scalar fallback safety margin: enabled passes its configured policy value; disabled uses the existing 256-token default. It does not accept or inspect a policy object or ratio. Disabled runs still resolve/log common request capacity, but they do not resolve/apply `compactionRatio` or `triggerThresholdTokens`.
- In core `LlmPhase`, ask `MemoryManager` once. When disabled, do not create `WorkingContextCompactionStrategyResolver` / `PendingCompactionExecutor`; pass null to the already-nullable `LLMRequestAssembler` executor slot, skip post-response `evaluateLlmPhaseCompaction` and immediate execution, and return the original tool/final response. When enabled, preserve the current resolver/registry/strategy path and use its policy for token-budget/pressure evaluation.
- If detailed logs are enabled, one bounded non-lifecycle diagnostic may record `automatic_compaction_disabled`; it must not emit requested/started/completed/failed cards or create manager pending/threshold state.
- `ServerCompactionAgentRunner` and `AgentRunService` remain unchanged: initial and correction calls each create one visible child. Both resolve the canonical definition and receive disabled configuration, so they are parent-owned siblings and leaves.
- The captured outer child usage `176,655` is above the normal-agent proactive threshold `123,148` but below the `615,744` request budget. It goes directly to the provider. Disabled automatic compaction is not unlimited input capacity.
- If task creation or provider execution genuinely cannot proceed, propagate the existing typed failure to the parent. Never compact the compactor's own task as a capacity fallback.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Token estimation/calibration | DS-003, DS-005 | planner/validator | estimate unit/final-message costs and retain observed-provider gap | provider tokenization/tool-schema costs are not fully represented by message characters | target looks precise but is not comparable to provider usage |
| Runtime reporting | DS-001, DS-004, DS-005 | executor/gate | log target, estimates, pressure, request kind, failure kind, post-success observation state, and manual execution turn | operational diagnosis and UI truthfulness | reporter starts deciding lifecycle |
| Assistant event serialization | DS-002 | server runner | preserve `is_error` through typed stream payload | core and server are separate packages | collector must infer from text |
| Request recovery snapshot | DS-001, DS-004 | coordinator | copy pending request and post-success episode around parent request rollback | rollback must not desynchronize eligibility | recovery owns business transitions |
| Child cleanup | DS-002 | server runner | unsubscribe/terminate in `finally` | one child lifecycle per attempt | summarizer leaks server run state |
| Exact prompt templates | DS-002 | summarizer | preserve v3 task wording | user-approved contract | runtime fix accidentally churns prompt |
| Turn-start origin resolution | DS-006 | inbox/active turn | classify original USER/AGENT/SYSTEM source before conversion | later pipeline normalizes different event shapes | sender text or converted event class is mistaken for authority |
| Compaction retry admission | DS-006 | scheduler | use public failed-pending query to filter dispatchability without moving entries | normal FIFO must remain one queue | queue starts owning memory state or a second buffer appears |
| Source redaction and omission marker | DS-007 | readable-value renderer | preserve current privacy and presentation semantics while boundaries become safe | Unicode utility must remain policy-small | utility starts owning redaction or response schema |
| Final prompt invariant | DS-002, DS-007 | task-prompt builder / runner boundary | prevent malformed derived text from reaching provider | old/external source may already contain lone surrogates | provider error is used as validation instead of local construction safety |
| Built-in definition identity | DS-008 | server backend factory | select disabled versus enabled memory-compaction composition | server owns built-in registry and creates core config | core imports a server constant or compares agent name/prompt |
| Configuration-skipped diagnostics | DS-008 | LLM phase / reporter | optionally explain why usage did not enter policy without a lifecycle event | low-ratio child usage may otherwise look surprising in detailed logs | logging creates pending state or user-visible compaction cards |

## Ownership Boundaries

- `evaluateLlmPhaseCompaction` must use one `MemoryManager` observation API. It may resolve/log the token budget but may not independently mutate policy, request state, and retry state.
- The pending request is the immutable carrier of the trigger-time planning budget and request kind. A strategy must receive that dynamic object at `resolve` time, not a stale context captured when `LlmPhase` was constructed.
- The pending request also owns one attempt-state union. Presence answers only whether compaction is pending; `beginPendingCompactionAttempt` is the sole execution-authorization boundary.
- `TurnStartOrigin` is resolved once at inbox entry construction and carried by `AgentTurn`; input conversion must not recompute or overwrite it.
- The scheduler may ask only the narrow public `isCompactionAwaitingUserRetry` query. It must not inspect coordinator internals or mutate pending state. The coordinator never scans or reorders the inbox.
- `CompactionRunOutputCollector` owns event usability; `CompactionResponseParser` owns only the six-array content contract. Neither may infer the other's classification.
- `AgentCompactionSummarizer` owns response correction but not provider retry. `CompactionThresholdGate` owns post-success proactive eligibility but not child correction or manual pending execution.
- The accepted-compaction boundary remains authoritative for host memory. Planning assessment is runtime metadata only and cannot be written by the child model.
- Built-in identity is a server provisioning concern. Core compaction code may inspect only the memory-owned disabled/enabled configuration and must not import `MEMORY_COMPACTOR_AGENT_DEFINITION_ID`, agent names, prompts, or runtime metadata to recognize the leaf.
- Disabled means automatic compaction is not part of that runtime. Core must not apply a policy or construct a strategy/executor, and `MemoryManager.evaluateCompactionObservation` must not mutate pending/threshold state. Provider/model request-capacity resolution remains available and independent.
- Enabled is one valid composition: the current policy and runner are both present. Do not recreate a separate policy in `AgentFactory`, retain a top-level runner in `AgentConfig`, or allow enabled-without-runner.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager.evaluateCompactionObservation` | policy pressure + post-success gate/request | `evaluateLlmPhaseCompaction` | caller invokes `shouldCompact`, interprets post-success state, and requests separately | return explicit decision/reason/operation ID |
| `MemoryManager.retainCompactionFailure` | in-progress attempt to awaiting-user transition | `PendingCompactionExecutor` | executor clears pending, invents retry state, or dispatches parent work | verify operation/turn identity and return fail-closed disposition without scheduling retry |
| `MemoryManager.getPendingCompactionGate` / `beginPendingCompactionAttempt` | pending presence/state and atomic attempt authorization | admission policy (read only) / executor (command) | scheduler reads coordinator fields or assembler authorizes from pending presence | expose closed read result and typed begin result |
| `AgentEventInbox` + `AgentEventScheduler` | origin-stamped FIFO storage and eligible claim | runtime worker | compaction coordinator stores messages or handler consumes/requeues blocked entries | add matching claim and injected admission policy while retaining one queue |
| `WorkingContextCompactionStrategyResolver.resolve(executionContext)` | registry + dynamic planning budget | executor | LLM phase injects stale `inputBudgetTokens` into strategy construction | split static construction and dynamic execution context |
| `ServerCompactionAgentRunner.runCompactionTask` | run service + collector + cleanup | summarizer | summarizer subscribes to events | enrich runner error type/result |
| `MemoryManager.prepare/commitAcceptedCompaction` | builder/validator/committer/coordinator | executor | strategy writes stores or clears pending | strengthen accepted assessment API |
| `AutoByteusAgentRunBackendFactory.buildAgentConfig` | built-in registry identity + enabled/disabled composition + runner factory | create/restore backend | core checks server IDs or runner factory self-disables recursively | use canonical registry constant and return `AgentConfig` with complete memory-compaction configuration |
| `AgentConfig.memoryCompaction` -> `AgentFactory` -> `MemoryManager` | runtime composition handoff and ownership | any AutoByteus runtime | top-level nullable runner plus separately invented policy | pass one discriminated configuration and expose it through memory boundary |
| `MemoryManager.getAutomaticCompactionConfiguration` / `LlmPhase` | closed disabled/enabled automatic-compaction integration | LLM phase | construct resolver/executor from fragmented agent config or discover missing runner during strategy resolution | branch once on memory-owned configuration and pass null executor when disabled |
| `resolveLlmRequestCapacity` / `resolveCompactionTokenBudget` | provider/model request capacity versus enabled policy threshold | LLM phase / compaction evaluator | disabled run receives a fake 100% ratio or skips capacity accounting | common capacity for all; ratio/trigger only for enabled configuration |

## Dependency Rules

Allowed:

- `LlmPhase` -> common request-capacity resolver, `MemoryManager` configuration read, enabled-only compaction-budget resolver/evaluator, response pipeline.
- thin evaluator -> `MemoryManager.evaluateCompactionObservation`, reporter.
- coordinator -> `CompactionThresholdGate`, accepted builder/committer, stores.
- pending executor -> strategy resolver and authoritative memory methods.
- strategy -> planner, summarizer, normalizer.
- planner/accepted validator -> shared planning-budget and token-estimation structures.
- summarizer -> runner interface and parser.
- server runner -> event collector and agent run service.
- response pipeline/notifier -> generic assistant stream payload.
- inbox origin resolver -> `SenderType` and external event type; worker -> origin-stamped entry/turn.
- scheduler -> injected `CompactionRetryTurnAdmissionPolicy`; policy -> `MemoryManager.isCompactionAwaitingUserRetry` query only.
- assembler/executor -> active turn origin + coordinator attempt-authorization command.
- readable renderer/prompt builder/response clamp -> `ProviderSafeCompactionText` pure functions.
- server backend factory -> canonical built-in registry constant, configuration constructor, and runner factory; `AgentFactory` -> `AgentConfig.memoryCompaction`; core `LlmPhase` -> memory-owned configuration only.

Forbidden:

- planner -> runtime settings resolver, pending coordinator, or stores;
- threshold gate -> LLM provider, parser, child runner, pending execution, or canonical memory;
- collector -> JSON parser or prompt builder;
- parser -> event payload or provider error text;
- LLM phase -> threshold-gate internals or retry scheduling;
- scheduler/admission policy -> pending mutation, executor, input pipeline, or provider;
- coordinator/executor -> inbox scan/reorder/requeue;
- assembler -> infer user authority from converted content or event prose;
- Unicode utility -> raw-trace store, redaction rules, response schema, prompt wording, provider client, or retry policy;
- prompt builder/renderer -> mutate raw source strings or broadly strip valid non-ASCII content;
- core agent loop/memory compaction -> server built-in definition constant, agent name, prompt content, or definition ID;
- server leaf composition -> ratio override, model/provider special case, persisted schema, or mutation/deletion of historical child runs;
- agent factory -> unconditional policy construction or enablement inference from runner presence;
- disabled configuration -> policy/strategy/pending/evaluation work, while common provider request-capacity accounting must remain;
- child compactor -> parent files, lineage, snapshot, or accepted commit;
- any v2/v3 dual prompt or response path.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveCompactionPlanningBudget(TokenBudget, observedPromptTokens)` | one trigger observation | derive budget key, headroom, quality cap, target | finite integer tokens | production auto-request requires a complete budget |
| `MemoryManager.evaluateCompactionObservation(input)` | one parent usage observation | request/await/suppress/reset/hard-cap-override and return decision | turn ID + observation ID + planning budget | sole request entrypoint for supported auto compaction |
| `MemoryManager.getPendingCompactionGate()` | current pending operation | expose `none`, `initial_attempt_ready`, `attempt_in_progress`, or `awaiting_user_retry` without mutable internals | no selector | admission uses only whether USER recovery is required |
| `MemoryManager.beginPendingCompactionAttempt(input)` | current pending attempt | atomically authorize and mark automatic initial or USER retry execution | operation ID + nonblank turn ID + `TurnStartOrigin` | returns closed authorization or typed denial; no provider call |
| `MemoryManager.retainCompactionFailure(operationId, executionTurnId, errorKind)` | current in-progress attempt | verify and transition to `awaiting_user_retry` | exact pending operation and executing turn IDs | returns fail-closed disposition; no retry scheduling |
| `MemoryManager.completePendingAfterAcceptedCommit(operationId)` | accepted pending operation | clear pending and install the post-success episode in the committer's final hook | exact operation ID + its immutable planning budget | runs only after archive/memory/lineage/context/snapshot writes succeed |
| `WorkingContextCompactionStrategyResolver.resolve({planningBudget})` | one pending execution | create strategy with current operation budget | immutable planning budget | no cached prompt usage |
| `MessageBudgetStrategy.calculate(input)` | one baseline context | compute cost map and available suffix budget | units + planning budget | returns complete budget breakdown |
| `CompactionRunOutputCollector.waitForFinalOutput` | one child run | return only non-error assistant text | exact run ID | all other outcomes reject typed |
| `CompactionAgentRunner.runCompactionTask` | one child task | typed success/failure plus metadata | task ID + parent agent ID | no response parsing |
| `resolveTurnStartOrigin(event)` | one external turn-start entry | classify USER/AGENT/SYSTEM before conversion | supported turn-start event + original sender type | rejects TOOL/unknown rather than guessing |
| `InboxQueueStore.claimFirstMatching(lane, predicate)` | one queue | remove first eligible entry while leaving all others in relative order | exact lane + pure predicate | used only where eligibility can temporarily differ from FIFO head |
| `CompactionRetryTurnAdmissionPolicy.isDispatchable(entry)` | one turn-start entry | permit all normally; while awaiting retry permit USER only | origin-stamped entry | read-only memory query; no mutation/log loop |
| `PendingCompactionExecutor.executeIfAuthorized(input)` | one pending attempt | begin authorization, execute once, commit or retain failure | operation/turn ID + immutable turn origin | replaces pending-presence-only `executeIfRequired` |
| `ProviderSafeCompactionText.toWellFormedDerived(value)` | one derived string | normalize lone surrogates/line endings and remove disallowed controls without mutating input | JavaScript string | preserves LF/TAB and every valid Unicode scalar |
| `ProviderSafeCompactionText.omitMiddle(value, limit)` | one rendered visible value | choose surrogate-safe head/tail boundaries and return existing marker semantics within limit | derived string + nonnegative integer limit | omitted count reflects adjusted retained units |
| `ProviderSafeCompactionText.truncateEnd(value, limit)` | one accepted episode/fact string | clamp without ending on a lone high surrogate | derived string + nonnegative integer limit | shared by parser; no schema ownership |
| `WorkingContextCompactionPromptBuilder.buildTaskPrompt` | one selected history | compose approved template and guarantee well-formed final provider-facing text | selected units + max-item limit | throws typed local construction error before runner if invariant cannot be met |
| `createEnabledMemoryCompactionConfiguration(policy, runner)` / disabled constant/factory | one runtime composition | construct only valid closed variants | existing `CompactionPolicy` + non-null current runner, or no fields | runtime-only; no persisted serialization or generic option bag |
| `AgentConfig.memoryCompaction` / `AgentConfig.copy` | one creation-time composition | carry/clone policy configuration without cloning runner | non-null discriminated configuration; omitted direct-core argument becomes complete disabled | top-level runner field removed |
| `MemoryManager.getAutomaticCompactionConfiguration()` | one memory runtime | expose disabled or enabled dependencies without coordinator internals | no selector | sole core enablement boundary |
| `resolveLlmRequestCapacity` | one LLM request | derive context/input capacity, output reserve, safety margin, input budget, and overrides independently of compaction ratio | model + LLM config + runtime capacity override + scalar fallback safety (enabled policy value or existing default 256) | same arithmetic as approved current capacity; all runtimes use it; no policy object |
| `resolveCompactionTokenBudget` | one enabled observation | add compaction ratio and trigger threshold to common capacity | common capacity + existing policy + trigger settings | not callable for disabled configuration |
| `AutoByteusAgentRunBackendFactory.buildAgentConfig` | one runtime definition | select disabled leaf or enabled normal composition | canonical definition ID + resolved run config | compactor path does not call runner factory; create/restore share this owner; normal runner failure/null fails composition |
| `LlmPhase` compaction integration | one memory-owned configuration | construct/pass evaluator/executor only for enabled; common capacity always resolved | `MemoryCompactionConfiguration` from `MemoryManager` | no server identity; disabled returns ordinary LLM response without compaction work |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| planning budget resolver | Yes | Yes | Low | reject non-positive/contradictory target inputs |
| manager observation API | Yes | Yes | Low | remove separate supported request decision path |
| strategy resolve execution context | Yes | Yes | Low | keep static dependencies separate |
| collector final output | Yes | Yes | Low | propagate explicit error flag; no text matching |
| failure retention | Yes | Yes | Low | verify current in-progress operation and leave pending awaiting USER retry |
| pending attempt authorization | Yes | Yes | Low | closed state/origin decision; reject duplicate same-turn execution |
| origin resolver | Yes | Yes | Low | exact event/sender mapping before conversion |
| eligible queue claim | Yes | Yes | Low | preserve relative order and use same predicate in wait logic |
| provider-safe derived text | Yes | Yes | Low | pure input/output; never exposes or mutates a store-backed source |
| completed prompt guard | Yes | Yes | Low | one final invariant at the operation-message owner before child launch |
| memory-compaction configuration | Yes | Yes | Low | two closed variants; enabled requires the one policy and runner |
| backend leaf provisioning | Yes | Yes | Low | exact canonical built-in ID; no agent-name/prompt heuristics |
| LLM phase configuration branch | Yes | Yes | Low | memory-owned disabled/enabled only; provider request capacity remains separate |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| per-operation token limits | `CompactionPlanningBudget` | Yes | Low | do not call it generic `context` or `options` |
| post-success eligibility | `CompactionThresholdGate` | Yes | Low | states use `ready`, `awaiting_below_observation`, `inadequate_reduction_suppressed` |
| pressure | `proactive` / `hard_input_cap` | Yes | Low | do not call both simply `required` |
| child execution failure | `CompactionAgentRunnerError` | Yes | Low | add closed failure kind; do not reuse parse stage |
| finalized budget result | `CompactionBudgetAssessment` | Yes | Low | distinguish planned and finalized estimates |
| original external author | `TurnStartOrigin` | Yes | Low | exactly `user` / `agent` / `system`; do not reuse `SenderType.TOOL` |
| pending execution lifecycle | `PendingCompactionAttemptState` | Yes | Low | distinguish initial, in-progress, and awaiting-user states; do not call all `required` |
| safe rendered text | `ProviderSafeCompactionText` | Yes | Low | do not call it generic sanitizer or let it become content policy |
| automatic-compaction composition | `MemoryCompactionConfiguration` | Yes | Low | exactly disabled/enabled; do not add `disableCompaction`, `isCompactor`, nullable runner, or numeric ratio convention |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| provider request capacity versus compaction trigger | agent token budget + memory compaction policy | Refactor cleanly | current file calculates both; disabled leaf still needs capacity but no ratio/trigger | split two tight pure results without changing arithmetic or creating a subsystem |
| bounded post-success threshold episode | memory compaction coordinator | Extend with one owned gate separate from pending | accepted commit must clear pending while actual-below eligibility survives | gate is a focused local state machine, not a new subsystem |
| target-aware selection | memory compaction planner | Extend | already owns message-unit selection and estimates | N/A |
| child error transport | agent streaming + server compaction runner | Extend | existing `isError` fact and collector boundary already exist | N/A |
| response repair | compaction summarizer/parser | Reuse | correct owner for usable invalid output | N/A |
| persistence | accepted compaction | Reuse | healthy atomic boundary | N/A |
| external origin and deferred admission | agent event inbox/scheduler + active turn | Extend | already own entry identity, FIFO storage, dispatchability, active-turn serialization, wakeup, and shutdown drain | one narrow compaction admission policy is needed because memory owns the gate but must not own the queue |
| Unicode-safe compaction presentation | readable-value renderer + task-prompt builder + response clamp | Extend with one pure memory-presentation utility | existing owners already control the exact derived strings that can enter provider requests | generic provider middleware would alter unrelated requests and hide the local ownership defect |
| automatic-compaction composition / non-recursive built-in worker | memory configuration + `MemoryManager` + server backend factory + agent factory + LLM phase | Refactor/Extend | memory already owns policy/coordinator; server already owns definition-aware construction; agent factory already installs manager; assembler already accepts a null executor | one tight discriminated configuration replaces fragmented runner/policy sources; no persisted flag, core subtype, policy hierarchy, or new controller |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` agent inbox/runtime/loop | origin-stamped entry, eligible same-queue selection, active-turn origin, usage observation, and generic error-response publication | DS-001, DS-002, DS-006 | memory boundary, server collector | Extend | no new queue or UI denominator change |
| `autobyteus-ts` memory compaction/presentation | disabled/enabled runtime composition, the single current policy, planning budget, post-success gate, planner, strategy, acceptance, pending lifecycle, and provider-safe derived text | DS-001, DS-003–DS-005, DS-007, DS-008 | MemoryManager/coordinator/executor/renderers | Refactor/Extend | primary change area; source stores unchanged; no new policy/strategy hierarchy |
| `autobyteus-ts` streaming events | `is_error` typed assistant payload | DS-002 | server runner | Extend | generic truthful event contract |
| `autobyteus-server-ts` compaction execution | one child run and typed collector errors | DS-002 | server runner | Extend | no child retry policy |
| `autobyteus-server-ts` AutoByteus backend provisioning | built-in leaf identity and enabled/disabled composition selection | DS-008 | backend factory | Extend | canonical built-in ID stays server-side; create/restore share config builder |
| `autobyteus-ts` agent factory/context | carry and install one complete memory-compaction configuration | DS-008 | AgentConfig / AgentFactory | Refactor | remove top-level runner and unconditional policy construction |
| `autobyteus-ts` agent LLM phase/token budget | common request-capacity accounting plus generic enabled-only automatic-compaction integration | DS-008 | core agent loop | Refactor/Extend | no built-in identity dependency; null executor path already supported by assembler |
| memory persistence/lineage | existing canonical commit | DS-005 | accepted committer | Reuse unchanged | no migration/version bump |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `compaction-planning-budget.ts` | memory compaction | planning-budget resolver | immutable DTO, key, exact target formula/constants | one shared policy subject | Yes |
| `compaction-threshold-gate.ts` | memory compaction | coordinator-owned local state | post-success await/suppress/reset/hard-cap transitions | state machine survives pending cleanup and deserves focused tests | planning budget |
| `message-budget-strategy.ts` | memory compaction | planner cost concern | context cost map, calibration, required reserves | existing estimation owner | planning budget |
| `working-context-message-window-planner.ts` | memory compaction | planner | target-respecting suffix/prefix plan | existing selection owner | budget assessment |
| `memory-manager-compaction-coordinator.ts` | memory | authoritative state | pending metadata/budget/attempt state, authorization, separate post-success episode, accepted completion | existing lifecycle owner | shared pending/episode shapes |
| inbox entry/store/scheduler | agent runtime | queue/origin/admission | stamp origin, claim first eligible, preserve wait/shutdown behavior | existing event-loop owner | turn-start origin/admission contract |
| `agent-turn.ts` / worker / assembler | agent runtime | origin carrier and execution caller | preserve original origin through conversion and call typed attempt authorization | existing turn/request spine | turn-start origin |
| stream payload/notifier/pipeline files | agent streaming | event contract | retain response error bit | existing event path | boolean field |
| collector/runner files | server compaction | runner boundary | typed execution failure | existing boundary | runner error kinds |
| `unicode-safe-text.ts` | memory presentation | derived-text boundary | well-formed normalization, safe head/tail/end indices, control filtering | one small reusable concern for input and accepted output clamps | strings only; no memory/provider dependencies |
| `readable-value-renderer.ts` / prompt builder / response parser | memory presentation/compaction | render/clamp/final guard | delegate safe slicing; preserve redaction/templates/schema | current owners remain | Unicode utility |
| `memory-compaction-configuration.ts` (new) | memory compaction | runtime composition | closed disabled/enabled variants; enabled binds current policy + runner; disabled default/copy helper | one small domain subject; prevents invalid parallel fields | existing policy and runner types |
| `agent-config.ts` / `agent-factory.ts` | agent creation | composition carrier/handoff | replace top-level runner, default omitted direct-core config to disabled, pass configuration to manager, remove unconditional policy construction | current construction path | memory configuration |
| `memory-manager.ts` | memory | configuration owner/facade | store/expose configuration, default direct construction to disabled, and guard disabled observations before coordinator | memory already owns policy/coordinator | memory configuration |
| `token-budget.ts` | agent request accounting | pure capacity/threshold calculations | separate common request capacity from enabled compaction ratio/trigger | one file already owns both arithmetic layers | request capacity + policy |
| `autobyteus-agent-run-backend-factory.ts` | server AutoByteus backend | configuration composer | canonical compactor gets disabled/no runner factory; normal gets enabled/current policy+runner or fails composition | existing definition-aware config owner | built-in registry constant + configuration constructors |
| `llm-phase.ts` | core agent loop | configuration consumer | resolve common capacity; construct/pass evaluator/executor only when memory config is enabled | existing pre/post-request compaction integration owner | memory configuration + nullable assembler executor |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| planning target values | `compaction-planning-budget.ts` | memory compaction | trigger, request, planner, validator, reporter need identical meanings | Yes | Yes | generic token bag |
| pending/episode recovery copy | coordinator exported types + copy function | memory lifecycle | coordinator and request recovery need the same runtime shapes | Yes | Yes | second recovery-only DTO |
| runner failure kind | `compaction-agent-runner.ts` | core runner interface | core summarizer and server adapter share classification | Yes | Yes | provider-specific error taxonomy |
| budget assessment | `working-context-compaction-proposal.ts` | accepted proposal | planner, builder, validator use one estimate contract | Yes | Yes | persisted lineage metadata |
| turn-start origin | `agent-event-inbox-entry.ts` / `AgentTurn` | agent runtime | inbox, scheduler, worker, turn, and assembler require one immutable author classification | Yes | Yes | sender-content heuristic |
| pending attempt state | coordinator exported type + copy function | memory lifecycle | coordinator, executor, recovery, and admission query require one lifecycle meaning | Yes | Yes | a second retry-state DTO |
| provider-safe Unicode boundaries | `memory/presentation/unicode-safe-text.ts` | memory presentation | history omission and accepted-output clamp need identical safety | Yes | Yes | generic content policy or raw-data mutator |
| automatic-compaction composition | `memory/compaction/memory-compaction-configuration.ts` | memory compaction | server composition, agent creation, manager ownership, and LLM phase need one closed meaning | Yes | Yes | policy hierarchy, generic options bag, or second `isCompactor`/`disableCompaction` flag |
| provider request capacity | `agent/token-budget.ts` common `LlmRequestCapacity` result | agent request accounting | enabled and disabled runs need identical context/input/output/safety arithmetic | Yes | Yes | compaction policy or provider admission subsystem |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CompactionPlanningBudget` | Yes | Yes | Low | integers only; derive rather than duplicate ratios |
| `PendingCompactionRequest` | Yes | Yes | Low | nest planning budget and one closed `PendingCompactionAttemptState`; pending does not imply executable |
| `CompactionBudgetAssessment` | Yes | Yes | Low | separate planned/final estimate fields explicitly |
| runner failure enum/error | Yes | Yes | Low | message/cause/metadata remain singular |
| `CompactionThresholdEpisode` | Yes | Yes | Low | separate runtime-only state is required because accepted commit clears pending before an actual usage observation exists |
| `TurnStartEventInboxEntry.origin` / `AgentTurn.startOrigin` | Yes | Yes | Low | same immutable `TurnStartOrigin`; entry is source, turn carries it rather than recomputing |
| provider-safe derived string | Yes | Yes | Low | source stays exact; utility returns one normalized string and boundary helpers expose no memory state |
| `MemoryCompactionConfiguration` | Yes | Yes | Low | disabled has no policy/runner; enabled requires both; omitted direct-core composition is disabled; normal server composition never treats missing runner as disabled; no parallel top-level runner/boolean/persisted representation |
| `LlmRequestCapacity` / `CompactionTokenBudget` | Yes | Yes | Low | common capacity is shared; ratio/trigger extend it only for enabled compaction |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/compaction-planning-budget.ts` | memory compaction | planning target | formula: `qualityCap=floor(.35B)`, `headroom=max(256,ceil(.10T))`, `P=min(qualityCap,T-headroom)` | one pure policy | N/A |
| `autobyteus-ts/src/memory/compaction/memory-compaction-configuration.ts` | memory compaction | runtime composition | closed disabled/enabled configuration, disabled default, and copy helper; enabled contains current policy + runner | one tight boundary replacing split fields | existing policy/runner types |
| `autobyteus-ts/src/memory/compaction/compaction-threshold-gate.ts` | memory compaction | bounded post-success state owner | await actual below, suppress inadequate reduction, reset, and hard-cap override | independently testable state machine | planning budget |
| `autobyteus-ts/src/memory/policies/compaction-policy.ts` | memory policy | pressure classifier | configured `triggerRatio`/`maxItemChars`/`safetyMarginTokens`; classify `none` / `proactive` / `hard_input_cap` | single existing policy bound to one enabled runtime | token budget |
| `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | agent loop | thin adapter | resolve observation, call manager, report decision | no business state | planning budget |
| `autobyteus-ts/src/memory/memory-manager-compaction-coordinator.ts` | memory lifecycle | authoritative coordinator | pending identity/budget/attempt state, execution authorization, post-success episode, accepted-success and failure-retention transitions | current owner strengthened | pending/episode/budget types |
| `autobyteus-ts/src/memory/memory-manager.ts` | memory facade/configuration owner | public boundary | own/expose compaction configuration; direct construction defaults disabled; disabled no-work observation; enabled observation/failure/commit methods | prevents mixed-level caller and keeps compaction under memory | configuration + coordinator |
| `autobyteus-ts/src/memory/llm-request-recovery.ts` | memory recovery | rollback adapter | copy/restore pending request plus post-success episode | current snapshot owner | shared state types |
| `autobyteus-ts/src/memory/compaction/message-budget-strategy.ts` | memory compaction | cost estimator | current-context estimate, calibration gap, target-scaled replacement reserve, available suffix | existing estimate concern | planning budget |
| `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts` | memory compaction | planner | strict target fit and typed planning errors | existing selection owner | assessment |
| `autobyteus-ts/src/memory/compaction/working-context-message-unit.ts` | memory compaction | plan model | budget breakdown on plan | existing plan shape | assessment |
| `autobyteus-ts/src/memory/compaction/{working-context-compaction-strategy.ts,working-context-compaction-strategy-resolver.ts,working-context-compaction-strategy-registry.ts,default-working-context-compaction-strategy-registry.ts}` | memory compaction | strategy boundary | static dependencies plus dynamic execution planning budget | budget must be current per operation | planning budget |
| `autobyteus-ts/src/memory/compaction/structured-json-compaction-strategy.ts` | memory compaction | production strategy | pass budget to planner and assessment to proposal | existing owner | plan assessment |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-proposal.ts` | memory compaction | proposal/accepted model | runtime-only planning/final assessment | common acceptance contract | planning budget |
| `autobyteus-ts/src/memory/compaction/{accepted-compaction-builder.ts,working-context-compaction-output-validator.ts}` | memory acceptance | builder/validator | estimate finalized complete prompt plus calibration gap and reject over target | precommit invariant | assessment/token estimate |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | memory lifecycle | operation owner | classify failure, retain pending, surface fail-closed result, report once | existing terminal owner | failure kind/disposition |
| `autobyteus-ts/src/agent/event-inbox/agent-event-inbox-entry.ts` | agent runtime | entry contract | closed `TurnStartOrigin` on every turn-start entry | authoritative pre-conversion identity | `SenderType` mapping |
| `autobyteus-ts/src/agent/event-inbox/{inbox-queue-store.ts,agent-event-inbox.ts,agent-event-scheduler.ts}` | agent runtime | queue/selection owner | first-matching claim, same predicate for dispatchability/wait, existing shutdown drain | preserves one queue and relative order | origin-stamped entries/admission policy |
| `autobyteus-ts/src/agent/compaction/compaction-retry-turn-admission-policy.ts` | agent compaction integration | read-only admission policy | allow all normally; while awaiting USER retry, allow only USER entry | one narrow cross-boundary rule | memory gate query + entry origin |
| `autobyteus-ts/src/agent/{agent-turn.ts,runtime/agent-worker.ts,event-inbox/handlers/turn-start-inbox-event-handler.ts}` | agent runtime | active-turn lifecycle | pass immutable entry origin into active turn and preserve it through settlement | existing start boundary | `TurnStartOrigin` |
| `autobyteus-ts/src/agent/{llm-request-assembler.ts,loop/llm-phase.ts}` | agent request execution | authorization caller | pass turn ID/origin to executor at pre-dispatch and immediate initial execution sites | existing request spine | active turn + pending attempt command |
| `autobyteus-ts/src/agent/context/agent-config.ts` | agent composition | runtime configuration carrier | replace top-level runner with non-null memory compaction configuration; omitted direct construction is disabled; exact copy semantics | current agent creation contract | memory configuration |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | agent composition | memory construction handoff | pass configuration to `MemoryManager`; remove `new CompactionPolicy()` | current manager construction owner | memory configuration |
| `autobyteus-ts/src/agent/token-budget.ts` | agent request accounting | common capacity + enabled threshold resolver | preserve capacity arithmetic while separating ratio/trigger | current arithmetic owner | model/config/policy |
| `autobyteus-ts/src/agent/compaction/compaction-runtime-reporter.ts` | diagnostics | reporter | target/pressure/request/failure/post-success-observation diagnostics | existing projection concern | decision/assessment |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts`, `src/agent/events/notifiers.ts`, `src/agent/streaming/events/stream-event-payload-assistant.ts` | agent events | response event contract | propagate `is_error` | one existing path | existing `isError` |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | memory compaction | runner interface | closed runner failure kinds and metadata | cross-package contract | N/A |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | memory compaction | response attempt owner | typed response-repair exhaustion; runner errors bypass parser | existing owner | runner/parser errors |
| `autobyteus-ts/src/memory/presentation/unicode-safe-text.ts` | memory presentation | derived-text safety | well-formed normalization, control filtering, surrogate-safe head/tail/end boundaries | one pure reusable concern; no provider or store dependency | N/A |
| `autobyteus-ts/src/memory/presentation/readable-value-renderer.ts` | memory presentation | serialization/redaction/omission owner | retain exact redaction and marker semantics while delegating safe boundaries | existing presentation owner | Unicode utility |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | memory compaction | completed child task | preserve approved template; final provider-safe normalization/assertion | one operation-message boundary | Unicode utility/history renderer |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | memory compaction | response schema and accepted-text clamp | preserve six-array parser; replace unsafe end slice with shared safe clamp | existing parse owner | Unicode utility |
| `autobyteus-server-ts/src/agent-execution/compaction/{compaction-run-output-collector.ts,server-compaction-agent-runner.ts}` | server compaction | runner adapter | reject error completion/interruption/terminal/timeout/tool/launch and preserve cause/run ID | existing server boundary | runner error kinds |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | server built-ins | canonical definition identity | export/reuse `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` | existing registry owner; no new file | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | server AutoByteus backend | definition-aware configuration composer | skip runner factory and select disabled only for canonical Memory Compactor ID; normal definitions get enabled current policy+runner or fail composition | create and restore already converge here | registry constant + configuration constructors + `AgentConfig` |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | core agent loop | generic configuration integration | always resolve common request capacity; when disabled omit policy/strategy/executor/evaluation, pass null to assembler, preserve original result; when enabled preserve current path | existing owner of both compaction integration points | `MemoryManager` configuration; nullable assembler executor |

## Applied Patterns (If Any)

- **Immutable command context:** the trigger-time planning budget travels with the pending operation rather than being recomputed from later mutable settings.
- **Bounded local state machine:** one coordinator-owned gate expresses post-success observed-below eligibility without a retry scheduler.
- **Typed result/error boundary:** assistant content and child execution failure are disjoint before the parser.
- **Proposal/accept/commit:** unchanged host-owned canonical memory transaction with one additional precommit budget invariant.
- **Hysteresis by authoritative observation:** an accepted estimate cannot reset a crossing; only actual below-threshold provider usage or a budget-key change rearms proactive eligibility.
- **Origin-stamped work item:** external author class is captured once before event conversion and carried through the active turn.
- **Eligibility-aware single queue:** a pure admission predicate changes which entry may be claimed while preserving one FIFO store and ordinary order outside the gate.
- **Bounded pending-attempt state machine:** initial automatic execution, one in-progress identity, and USER-authorized recovery are explicit without a retry scheduler.
- **Configuration by construction:** server composition selects one closed memory-owned disabled/enabled variant; generic core consumes the memory boundary rather than knowing the specialization or correlating a runner with a separately created policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Folder | compaction domain/control | runtime composition, planning budget, post-success gate, planner, strategy, attempt, acceptance | existing coherent capability area | provider run service, UI, or policy hierarchy |
| `autobyteus-ts/src/memory/compaction/memory-compaction-configuration.ts` | File | automatic-compaction composition | disabled/enabled variants, disabled default, and copy helper | memory owns compaction; one type replaces split policy/runner sources | server identity, settings/env lookup, persistence, generic option bag |
| `autobyteus-ts/src/memory/compaction/compaction-planning-budget.ts` | File | planning policy | exact `B/T/P` shape/formula | shared by trigger and plan | state or I/O |
| `autobyteus-ts/src/memory/compaction/compaction-threshold-gate.ts` | File | local state owner | post-success observed-below transitions | serves coordinator | parser/model or retry logic |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | memory boundary | own/expose configuration and delegate enabled lifecycle to existing coordinator | natural module boundary | server identity, provider reporter, strategy construction |
| `autobyteus-ts/src/memory/memory-manager-compaction-coordinator.ts` | File | memory lifecycle authority | pending gate/post-success episode/acceptance lifecycle | existing owner | configuration composition, stream event details |
| `autobyteus-ts/src/agent/event-inbox` | Folder | runtime queue/selection | origin-stamped turn-start entries and first-eligible same-queue claim | existing event-loop capability | compaction mutation or second deferred store |
| `autobyteus-ts/src/agent/compaction/compaction-retry-turn-admission-policy.ts` | File | failed-pending admission adapter | map public gate + entry origin to dispatchability | focused cross-boundary policy | queue mutation, provider retry, or input conversion |
| `autobyteus-ts/src/agent/agent-turn.ts` | File | active-turn identity | carry immutable start origin | existing lifecycle subject | origin inference from processed content |
| `autobyteus-ts/src/agent/streaming/events` | Folder | stream contract | assistant error flag | existing typed event layer | compaction-specific retry |
| `autobyteus-server-ts/src/agent-execution/compaction` | Folder | server child adapter | one child execution outcome | existing server boundary | JSON schema or persistence |
| `autobyteus-ts/src/agent/context/agent-config.ts` / `src/agent/factory/agent-factory.ts` | File set | agent composition/handoff | carry complete memory configuration, default omitted direct-core construction to disabled, and install it without inventing policy | current construction path | top-level runner, built-in identity, or second policy |
| `autobyteus-ts/src/agent/token-budget.ts` | File | request-capacity/threshold arithmetic | common provider capacity for every runtime; ratio/trigger only for enabled | current arithmetic owner | policy subclasses or provider client |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | File | runtime configuration provisioning | canonical built-in disabled composition and normal enabled policy+runner construction with fail-fast required-runner handling | current owner of definition-aware `AgentConfig` construction | ratio hack, core lifecycle, persisted opt-out, or silent disablement |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | File | generic LLM/compaction integration | consume memory-owned configuration at executor/evaluation boundaries; keep common capacity | current owner of both pre-request and post-response hooks | server built-in identity, policy construction, or recursive fallback |
| `autobyteus-{ts,server-ts}/docs/...` | File set | durable docs | current trigger target, observed-below episode, failure typing/manual retry, unchanged prompt/storage | existing architecture docs | obsolete fixed-35/error-text behavior |

The existing flat `memory/compaction` folder remains appropriate: the new files are small peer concerns serving one capability, while persistence, agent-loop transport, and server execution remain at their existing structural depths.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Main-Line Domain-Control | Yes | Low | one small configuration file plus planning-budget/threshold-gate files expose focused composition/policy/state without a new artificial module tree |
| `autobyteus-ts/src/memory` | Main-Line Domain-Control / persistence coordination | Yes | Low | coordinator stays above compaction mechanisms and stores |
| `autobyteus-ts/src/agent` | Transport/control | Yes | Low | inbox owns storage/selection, active turn owns origin, compaction adapter owns admission; memory state stays behind facade |
| `autobyteus-server-ts/src/agent-execution/compaction` | Transport | Yes | Low | server run lifecycle remains isolated |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus` | Runtime provisioning | Yes | Low | definition-aware configuration construction is already here; leaf selection does not belong in child runner or core |
| memory stores/lineage | Persistence-Provider | Yes | Low | unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### Exact target formula

For `B=615,744`, `T=123,148`:

```text
qualityRetentionCap = floor(0.35 × 615,744) = 215,510
triggerHeadroom      = max(256, ceil(0.10 × 123,148)) = 12,315
triggerDerivedCap    = 123,148 - 12,315 = 110,833
postCompactionTarget = min(215,510, 110,833) = 110,833
```

The target applies to the estimated complete finalized parent prompt. The cost strategy then subtracts:

```text
leading system units
+ protected live tool suffix
+ max(0, observed provider prompt - estimated current working context)
+ replacement-memory allowance `min(8,192, max(1,024, floor(0.20 × P)))`
```

Only the remainder may retain recent natural units. The finalized replacement memory is estimated again before commit; if the complete estimate plus the calibration gap exceeds 110,833, the operation fails without commit.

For the default 80% trigger, the trigger-derived cap is above the 35% quality cap, so the 35% preference continues to limit retained context. For a low ratio, the trigger cap becomes authoritative.

### Threshold episode and manual-retry examples

The coordinator-owned runtime shape is explicit and separate from the pending request:

```ts
type CompactionThresholdEpisode =
  | { kind: 'ready' }
  | {
      kind: 'awaiting_below_observation';
      budgetKey: string;
      completedOperationId: string;
      postCompactionTargetTokens: number;
    }
  | {
      kind: 'inadequate_reduction_suppressed';
      budgetKey: string;
      completedOperationId: string;
      postCompactionTargetTokens: number;
      firstObservedPromptTokens: number;
      diagnosticEmitted: true;
    };
```

`AcceptedCompactionCommitter` keeps its existing final `clearPending` hook. The coordinator supplies that hook as `completePendingAfterAcceptedCommit`: after every durable write and snapshot installation succeeds, it verifies the operation ID, clears `pendingRequest`, and installs `awaiting_below_observation` from that operation's immutable planning budget. A commit failure before the final hook transitions the in-progress pending request to `awaiting_user_retry` and does not install an episode.

| Observation / outcome | Coordinator/gate result |
| --- | --- |
| First `249,416 >= 123,148` after ratio change | request `threshold_crossing` |
| Successful accepted estimate `<=110,833` | clear pending and enter `awaiting_below_observation`; estimate does not reset the crossing |
| First fresh same-key provider usage `110,950 < 123,148` | enter `ready`; no request now; a later actual crossing is legitimate |
| First fresh same-key provider usage `123,520 >= 123,148` | no second proactive operation; emit one `post_success_usage_not_below_trigger` diagnostic and enter `inadequate_reduction_suppressed` |
| Later same-key usage remains between 123,148 and 615,744 | remain suppressed; detailed log only, no repeated card or operation |
| Budget key changes while suppressed and current usage exceeds the new trigger | reset the old episode and request one configuration-driven operation under the new key |
| Prompt reaches/exceeds 615,744 while awaiting/suppressed | request `hard_input_cap`; hard-cap safety overrides suppression |
| Derived task cannot satisfy the local well-formed-text invariant | zero child/provider calls; one typed input-construction failure; transition the attempt through the same final fail-closed path |
| Child runner fails for any in-progress request | one final fail-closed error; transition the same pending operation to `awaiting_user_retry`; no parser, correction child, target dispatch, or scheduled retry |
| Distinct USER-origin turn later sends `continue` | authorize and execute the retained pending operation once before dispatch; success clears it and continues, failure records that execution turn and stops again |
| AGENT/SYSTEM input arrives while awaiting | leave its origin-stamped entry in the normal queue; no turn, child, error, or target dispatch |

The pending attempt shape is closed and runtime-only:

```ts
type PendingCompactionAttemptState =
  | { kind: 'initial_attempt_ready' }
  | {
      kind: 'attempt_in_progress';
      authorization: 'automatic_initial' | 'user_retry';
      executionTurnId: string;
    }
  | {
      kind: 'awaiting_user_retry';
      lastFailedExecutionTurnId: string;
    };
```

Pending presence is deliberately not a boolean execution flag. `beginPendingCompactionAttempt` is the only transition into `attempt_in_progress`.

### USER versus non-user queue example

Given the turn-start queue below while the pending attempt is `awaiting_user_retry`:

```text
AGENT-A -> USER-continue -> SYSTEM-S -> AGENT-B
```

The scheduler uses the admission predicate to claim only `USER-continue`; it does not claim/requeue `AGENT-A`. During the active user turn the remaining queue is still:

```text
AGENT-A -> SYSTEM-S -> AGENT-B
```

If compaction fails, that queue stays unchanged. If it succeeds, `USER-continue` reaches the target model and, after the user turn settles, ordinary FIFO resumes with `AGENT-A`, then `SYSTEM-S`, then `AGENT-B`. A queue containing only non-user entries while awaiting retry is not considered dispatchable, so the worker waits for a user/lifecycle event rather than busy-looping.

### Output versus runner failure

Good:

```text
ASSISTANT_COMPLETE { content: "not json", is_error: false }
  -> parser failure -> one correction child

ASSISTANT_COMPLETE { content: "Error processing ... rate limit ...", is_error: true }
  -> collector runner error -> no parser -> no correction child
```

Bad:

```text
if response.content startsWith("Error processing") then runner failure
```

Text matching is forbidden because valid model-authored content can contain those words and provider wording can change.

### Unicode-safe omission example

Captured source text is valid and remains unchanged:

```text
icon: '\uD83D\uDEE1\uFE0F'  // 🛡️
```

The old head boundary ended after `\uD83D` and inserted the omission marker before `\uDEE1`, producing a lone high surrogate. The target renderer adjusts that boundary so either the complete scalar is retained or the complete scalar is omitted. The complete derived prompt must be safe without being character-clamped as a whole:

```ts
isWellFormedUnicode(taskPrompt) === true
containsDisallowedControls(taskPrompt) === false

renderedValue.length <= configuredRenderedValueLimit
acceptedText.length <= configuredAcceptedTextLimit
```

The latter two assertions apply independently to each renderer or accepted-text clamp and use the lengths produced after safe-boundary adjustment. There is no `plannedRenderedLimit` and no whole-task UTF-16 length clamp: the captured valid child prompt was 540,727 UTF-16 units, and the approved B/T/P token planning and accepted-result validation remain the only complete-prompt budget controls. The prompt builder performs final well-formed/control-safety normalization and assertion without dropping otherwise selected history.

If a store-backed old/external value already contains an unpaired surrogate, the source is not edited. The derived copy contains U+FFFD at that position. Valid `ä`, `中文`, code, paths, and complete emoji remain intact.

### Automatic-compaction configuration shape

The target type is deliberately smaller than a general policy framework:

```ts
type MemoryCompactionConfiguration =
  | Readonly<{ kind: 'disabled' }>
  | Readonly<{
      kind: 'enabled';
      policy: CompactionPolicy;
      runner: CompactionAgentRunner;
    }>;

const DEFAULT_MEMORY_COMPACTION_CONFIGURATION:
  MemoryCompactionConfiguration = Object.freeze({ kind: 'disabled' });
```

The enabled variant is complete: it cannot exist without both the one current pressure policy and the execution dependency required by the current registered strategy. Strategy selection remains in the existing `CompactionRuntimeSettingsResolver` / `WorkingContextCompactionStrategyRegistry`; the configuration does not duplicate `strategyId`. The disabled variant is not a `CompactionPolicy` subclass and carries no numeric sentinel. `AgentConfig` and a directly constructed `MemoryManager` use the disabled constant when the new argument is omitted, but `AgentFactory` always passes the config and the production server always chooses explicitly. A normal server definition cannot become disabled because its runner factory failed or returned null; that is an agent-composition failure.

Request-capacity and compaction-budget arithmetic remain related but distinct:

```text
model/provider caps + output reserve + ordinary safety -> LlmRequestCapacity (all runs)
LlmRequestCapacity + enabled policy + ratio setting     -> CompactionTokenBudget B/T (enabled only)
CompactionTokenBudget                                  -> CompactionPlanningBudget B/T/P
```

This is a responsibility split inside the existing token-budget owner, not a new capacity subsystem.

### Built-in Memory Compactor leaf example

Captured supported condition:

```text
parent Daily Assistant operation: compaction_operation_msu088l2_1
outer Memory Compactor prompt:     176,655 tokens
global 20% trigger:                123,148 tokens
resolved input budget:             615,744 tokens
```

The outer prompt is above the target-agent proactive trigger but below provider/request capacity. Correct behavior is therefore:

```text
parent summarizer
  -> create Memory Compactor child (memory compaction = disabled)
  -> resolve ordinary provider/model request capacity
  -> send 176,655-token one-shot request
  -> receive original usable response
  -> zero policy application or strategy resolution
  -> zero child-owned compaction observations
  -> zero pending self-operation
  -> zero descendant Memory Compactor runs
```

If the original response is usable but violates the six-array contract, the parent summarizer may create one correction child. It is a sibling, and the same server factory provisions it with disabled memory compaction. The forbidden shape is:

```text
outer Memory Compactor -> compaction_operation_msu09qwk_1 -> nested Memory Compactor
```

The outer task's single START/END pair must not be stripped or rewritten to conceal authentic quoted source text. Preventing the recursive child removes the extra pair structurally.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old fixed planner when ratio >=35% and new planner below | reduce test churn | Rejected | one target formula; 35% is a capped quality preference for all ratios |
| Keep old `requestCompaction(turnId)` as supported auto path | existing tests call it | Rejected | auto path uses explicit observation/budget; tests construct complete request state |
| Accept error completion as text if collector lacks flag | older events may omit flag | Rejected | all newly emitted assistant events carry boolean default false; compaction success requires explicit non-error event |
| Match known error prose | minimal patch | Rejected | propagate typed `is_error` and runner failure kind |
| Keep SR-002 deferred/suppressed failure states | allow parent work and automatic recovery below hard cap | Rejected by approved fail-closed policy | one pending attempt gate remains until commit; after failure only a distinct USER-origin turn authorizes execution |
| Treat any turn-start event or pending presence as retry authorization | minimal change to request assembly | Rejected | stamp authoritative origin and require coordinator attempt authorization; non-user events remain queued |
| Consume/requeue non-user entries into a compaction-specific deferred buffer | bypass FIFO head | Rejected as unnecessary lifecycle state | one ordinary queue plus first-matching claim preserves order, wakeup, and shutdown behavior |
| Store post-success episode in pending request | avoid a second runtime shape | Rejected | accepted commit must clear pending; coordinator separately owns runtime-only `CompactionThresholdEpisode` until actual-below/key reset |
| Persist post-success suppression in memory files | restart continuity | Rejected | runtime-only state; no stored-schema change or migration |
| Prompt-contract v4 | runtime behavior changed | Rejected | model prompt/output bytes do not change; retain v3 |
| Direct child file write or single text memory | simplify output | Rejected | preserve approved six arrays and accepted host commit |
| Strip emoji or convert all compaction input to ASCII | avoid malformed characters | Rejected as lossy and unnecessary | preserve valid Unicode; repair malformed derived text and make boundaries surrogate-safe |
| Add global provider middleware that silently rewrites every request | broad defense | Rejected as wrong ownership and excessive scope | final guard lives at the compaction task-prompt boundary; shared utility stays pure and memory-presentation-owned |
| Set Memory Compactor ratio to 100% | avoid the 20% self-trigger | Rejected as numeric coupling; global override/hard cap can still apply | select disabled automatic compaction for the built-in leaf |
| Keep top-level nullable runner as the final capability boundary | smallest SR-007 patch | Superseded because `AgentFactory` still invents policy and `LlmPhase` still assembles the subsystem from split sources | one memory-owned discriminated configuration; remove top-level runner and factory-created policy |
| Add `disableCompaction` to stored agent definitions/run config | represent specialization explicitly | Rejected as redundant schema/versioning/migration surface | canonical server identity selects runtime-only disabled configuration |
| Add ratio/capacity policy subclasses or a new controller | anticipate future policies | Rejected as speculative and duplicative | retain the single policy and existing coordinator under the configuration |
| Add a second/chunked strategy now | anticipate a genuinely oversized child | Rejected because the reproduced request fits and no new strategy behavior is approved | retain current registry/`structured-json`; future chunking requires evidence and separate approval |
| Change/remove nested separators | hide double-wrapper symptom | Rejected; legitimate source may quote delimiters and recursion/cost/failure risk remains | remove descendant execution by disabled configuration |
| Recursively summarize or whole-task-clamp an oversized compactor prompt | force it under capacity | Rejected as task-changing data loss | direct execution while provider-admissible; truthful planning/pre-launch/runner failure otherwise; future chunking is separate |
| Delete existing nested run archives | clean up confusing history | Rejected as unnecessary and destructive | retain historical evidence; future runs use leaf provisioning; no migration |

## Derived Layering (If Useful)

- Observation/control: token budget -> manager observation -> post-success gate/pending request.
- Turn admission/control: origin-stamped inbox entry -> eligibility-aware scheduler -> active turn -> authorized pending attempt.
- Planning/model adaptation: dynamic strategy context -> planner -> summarizer -> runner/parser.
- Domain acceptance: manager baseline -> accepted builder -> structural and budget postcondition.
- Persistence/projection: committer -> stores/lineage/snapshot/context.
- Event return: child response flag -> collector -> typed error/result -> executor reporter -> UI/log.
- Derived text: exact source -> compaction presentation -> provider-safe boundary -> child request; accepted text -> safe clamp -> later projection.
- Leaf composition: canonical server definition -> disabled memory-compaction configuration -> AgentFactory/MemoryManager ownership -> common request capacity plus generic omission of automatic-compaction integration -> original child response.

No caller depends on both an authoritative boundary and its internal gate/planner/collector.

## Change / Refactor Sequence

1. Add `CompactionPlanningBudget` and pure resolver with the exact quality cap, 10%/256-token headroom, target, validation, and budget-key tests. Preserve `resolveTokenBudget` arithmetic unchanged.
2. Add `CompactionThresholdGate` as pure transition logic over a coordinator-owned runtime episode, with exhaustive tests for initial request, accepted success awaiting observation, first actual-below reset, first same-key at/above inadequate-reduction suppression, repeated suppression without repeated cards, budget-key reset, and hard-cap override.
3. Strengthen `MemoryManagerCompactionCoordinator`/`MemoryManager` so the LLM evaluator submits one observation, accepted commit atomically clears pending while installing the separate post-success episode, and executor failure verifies the in-progress attempt before transitioning it to `awaiting_user_retry`. Replace the independent mutable `compactionRequired` boolean/setter and pending-presence executability with public presence/gate queries plus atomic `beginPendingCompactionAttempt`; include the immutable planning budget and closed attempt state in the shared pending shape. Replace the recovery-local duplicate type and copy pending/attempt plus episode state in LLM request recovery.
4. Refactor `llm-phase-compaction.ts` to use the authoritative observation result and report requested/awaiting/suppressed/reset decisions. Remove supported split `shouldCompact` + direct request coordination. A first post-success same-key observation at/above `T` emits one bounded diagnostic rather than requesting another proactive operation.
5. Split strategy creation into static construction dependencies and dynamic per-operation execution context. `PendingCompactionExecutor` supplies the pending planning budget to resolver/registry/strategy; remove stale static `inputBudgetTokens` injection from `LlmPhase`.
6. Replace independent suffix budgeting with complete-target budgeting. Estimate all units, calibrate with observed provider prompt usage, reserve system/protected/replacement costs, make minimum recent units a preference only, require a compactable natural prefix/raw traces, and emit typed `target_unattainable` / `no_compactable_prefix` errors. Remove the budget-override/fallback method.
7. Carry `CompactionBudgetAssessment` through plan/proposal/accepted result. After host rendering, estimate the actual finalized context plus calibration gap and reject `post_compaction_target_exceeded` before committer invocation. Add plan/result diagnostics.
8. Propagate `isError` from `LlmPhaseOutcome` through `LLMResponsePipeline`, notifier, `AssistantCompleteResponseData.is_error`, event conversion, and server collector. Add typed collector/runner failure kinds for error completion, interruption, terminal error, timeout, tool approval, rejection, launch, and collection failure.
9. Make summarizer repair exhaustion typed. Assert first runner failure performs zero parser/correction calls; a runner failure on the second child after one actual invalid response preserves attempt 1 validation and attempt 2 runner metadata.
10. Add `ProviderSafeCompactionText` under memory presentation. Replace unsafe middle/end slices in `ReadableValueRenderer` and `CompactionResponseParser`, preserve source values, and finalize/assert the completed child task in `WorkingContextCompactionPromptBuilder`. Cover the exact shield fixture, boundary cases, controls, multilingual/code preservation, response clamp, and local pre-launch failure.
11. Update `PendingCompactionExecutor` and both LLM-phase call sites to use `executeIfAuthorized({turnId, turnOrigin})`. Initial-ready requests execute once for any origin. Every final failure retains the pending request as `awaiting_user_retry`, emits one truthful terminal status, and stops the current target-agent turn. A distinct USER-origin turn may begin one pre-dispatch retry; success resumes it and failure records that turn and stops it again.
12. Add authoritative `TurnStartOrigin` to inbox entries and active turns. Extend the existing queue store with first-matching claim. Inject `CompactionRetryTurnAdmissionPolicy` into scheduler selection and use the same predicate in `hasDispatchable`/wait logic. Preserve all non-user entries in place; do not create a second queue. Preserve existing lifecycle/active-turn priority and shutdown drain.
13. Add the tight `MemoryCompactionConfiguration` union, disabled constant/default, and copy helper. Replace top-level `AgentConfig.compactionAgentRunner` with non-null `memoryCompaction`; an omitted direct-core argument becomes disabled, and `AgentConfig.copy()` copies disabled by value or clones enabled policy scalars while retaining runner identity. Add no optional runner, generic dependency bag, persisted field, or policy hierarchy.
14. Refactor `AgentFactory.createRuntimeWithId` to pass the supplied configuration into `MemoryManager`; remove unconditional `new CompactionPolicy()`. Update `MemoryManager` to own/expose the configuration, default direct construction to disabled, and return a no-work disabled observation without coordinator mutation; retain the existing coordinator for enabled pending/episode/commit lifecycle. Production `AgentFactory` never relies on the manager default.
15. Refactor `agent/token-budget.ts` into common request-capacity resolution and enabled-only compaction ratio/trigger derivation while preserving every approved capacity and B/T/P formula. Disabled leaves still resolve ordinary provider/model capacity and safety but never apply the 20% ratio.
16. Import canonical `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` into `AutoByteusAgentRunBackendFactory`. In shared `buildAgentConfig`, select disabled and bypass `compactionAgentRunnerFactory` for that exact definition on create/restore; for every normal definition, invoke the required non-null factory once and create enabled configuration with a fresh existing `CompactionPolicy` plus the runner. A thrown failure or defensive null result fails agent composition rather than silently selecting disabled.
17. In `LlmPhase`, ask `MemoryManager` once. Construct the strategy resolver/executor and compaction budget only for enabled, pass null to `LLMRequestAssembler` for disabled, skip `evaluateLlmPhaseCompaction` and immediate execution for the leaf, and return the original tool/final response. Add no server identity to core. If detailed skip logging is added, keep it non-lifecycle and bounded.
18. Keep the current `CompactionPolicy`, `MemoryManagerCompactionCoordinator`, strategy registry/resolver, sole `structured-json` registration, `memory-compactor/agent.md`, approved operation-prompt template, parser schema, prompt-contract version 3, tool config, episodic/semantic shapes, lineage reader/writer, and accepted committer behavior unchanged. Add regression assertions that these contracts did not drift; only unsafe derived characters may be normalized.
19. Update current memory architecture documentation and diagnostics. Do not rewrite completed historical tickets, existing memory, or nested run archives. Record the token-ledger database mismatch separately rather than altering this fix.
20. Run focused core/server unit and integration checks, then route through code review and API/E2E coverage investigation. Re-run the real 80%→20% parent scenario, exact shield-source request, enabled normal-agent path, disabled high-usage Memory Compactor leaf, one invalid-output sibling correction, controlled child error-completion scenario, and direct USER-versus-AGENT/SYSTEM admission scenarios when provider/environment access permits.

No temporary dual path is permitted.

## Key Tradeoffs

- A 10% trigger headroom and target-scaled replacement reserve are deliberately conservative. They may retain less recent context, but avoid repeated expensive compactions and preserve the existing 35% cap at the default ratio.
- Provider-observed calibration improves comparability without adding a provider tokenizer dependency. It is still an estimate; the post-render validation fails closed.
- Strict fail-closed behavior sacrifices availability below the hard cap, but it matches the user's priority that required compaction succeed before target work continues. Retry timing is user-controlled; retained operation ID plus execution turn/child IDs keep attempts diagnosable without an automatic scheduler.
- Letting a USER entry bypass earlier non-user entries is a deliberate, narrow ordering exception needed to resolve the gate. It is safer than letting AGENT/SYSTEM trigger provider retries, dropping them, or blocking user recovery. Their relative order and ordinary FIFO resume immediately after successful user-turn settlement.
- First-matching claim adds a small queue primitive but avoids a second deferred store, message-copy lifecycle, separate shutdown handling, and data migration.
- A separate post-success episode adds one runtime shape, but accepted commit must clear the pending operation while REQ-012 still requires an actual provider observation before rearming. Combining both states would either violate commit cleanup or lose the threshold-crossing invariant.
- Adding `is_error` to the generic assistant-complete payload is broader than a compaction-only text heuristic, but it preserves an existing core fact truthfully and benefits any typed run consumer without changing ordinary response content.
- Preserving valid Unicode while repairing only malformed derived text is slightly more careful than deleting every emoji, but it avoids corrupting multilingual instructions, code, paths, and meaningful symbols. Surrogate-safe code-unit boundaries plus one final `toWellFormed` guard are sufficient; grapheme-aware visual editing and emoji classification are unnecessary.
- A definition-specific composition decision in the server factory is deliberate because that layer owns canonical built-in identity and runtime construction. The resulting configuration is owned by memory so core remains definition-agnostic. This adds one small discriminated type but removes two fragmented sources (`AgentConfig.compactionAgentRunner` and `AgentFactory`'s unconditional policy), prevents invalid enabled-without-runner states, and avoids a generic core `isCompactor` flag or numeric ratio convention.
- Splitting common request capacity from enabled-only compaction thresholds adds one pure result shape, not a new capacity subsystem. It is necessary because disabled means “do not automatically compact,” not “ignore provider/model input limits.” All arithmetic remains unchanged.
- Retaining one current policy and one registered strategy is deliberate. The configuration is an ownership boundary, not a framework for speculative ratio/capacity policy classes or new strategies. A future strategy can be added through the existing registry when a real requirement exists.
- The leaf gives up automatic compaction protection inside the one-shot child. That is intentional: recursively summarizing the compaction instruction/history changes the task and cannot make capacity handling correct. Provider-admissible requests run directly; genuinely oversized requests fail truthfully until a separately approved strategy exists.

## Risks

- Token estimation may undercount provider-native tool schemas or media. The observed calibration gap and 10% headroom mitigate this, but cannot replace a future pre-dispatch tokenizer/admission system.
- At very low ratios, mandatory system/protected content or the replacement reserve may exceed the target. The design reports `target_unattainable` and does not discard required content.
- A huge model summary can exceed the reserve. Final accepted-budget validation prevents commit but consumes one child call; it is not automatically treated as JSON repair.
- Runtime-only post-success suppression resets on process restart. One new proactive attempt after restart is possible and avoids a persistence migration; repeated restarts can therefore repeat one operation for an inadequately reduced same-key context.
- A syntactically valid six-array summary can still be factually poor. Deterministic shape and budget validation do not prove factual fidelity.
- The assistant event field must be carried across every AutoByteus conversion path. Missing propagation in one layer would recreate the misclassification; contract tests must span notifier through server collector.
- Existing uncommitted delivery documentation belongs to the previous completed round. Implementation must preserve unrelated edits and update it only through the delivery workflow after review/testing.
- A process shutdown before successful recovery drains retained non-user entries under existing runtime semantics; this ticket does not add persistent inbox delivery. That is unchanged from other queued turn-start work and requires no migration.
- A pre-existing lone surrogate in old/external source text is rendered as U+FFFD, so that one malformed character is not exact in the provider-facing copy. The authoritative source remains unchanged and directly inspectable; transport safety takes priority for the derived prompt.
- A future Memory Compactor prompt may genuinely exceed provider capacity. The leaf will not recursively reduce it; the current operation fails through the existing planning/pre-launch/typed runner boundary. Multi-pass compaction remains an explicit future requirement, not an implicit fallback.
- If another backend outside `AutoByteusAgentRunBackendFactory` can launch the canonical built-in definition in the future, it must select the same disabled configuration at its own composition boundary. Current production evidence reaches the AutoByteus backend path; coverage should keep the canonical factory behavior explicit.
- `CompactionPolicy` is mutable because runtime settings apply the active ratio/safety values. Reusing one enabled configuration across concurrent runtimes would share mutation; the configuration copy/factory contract must create a fresh policy instance per runtime while retaining the runner identity intended for that run.
- The independent `token_usage_ledger_events.member_name` schema mismatch can reduce accounting persistence and flood logs. It is not repaired here and must not be mistaken for a leaf-compaction or memory-migration failure.

## Guidance For Implementation

### Exact invariants

- Do not edit the approved Memory Compactor system prompt, first-attempt task prompt, six-array response section, correction prefix, target-agent tag/separators, or prompt-contract version 3 in this revision.
- `P` must be a complete-prompt target: `min(floor(0.35B), T - max(256, ceil(0.10T)))`, clamped to nonnegative integer. A planner suffix budget must never exceed the remainder after required reserves.
- `replacementMemoryReserveTokens = min(8_192, max(1_024, floor(0.20 × P)))`; the finalized replacement is measured rather than pessimistically reserving the old summary size, so a large old summary can still be compacted and supported low ratios are not made impossible by a fixed 8,192-token floor.
- Preserve protected live tool protocol; recent-unit minimum is soft and may not violate `P`.
- No child launch when mandatory estimated costs already meet/exceed `P`, or when no selected settled natural unit contributes a new raw trace.
- No accepted commit when `estimatedFinalizedContextTokens + estimatedUntrackedOverheadTokens > P`.
- Accepted success must enter `awaiting_below_observation`; neither `P` nor the finalized local estimate counts as an actual below-threshold usage observation. A first same-key observation at/above `T` suppresses another proactive operation with exactly one diagnostic; actual-below or budget-key change resets, and hard cap overrides.
- Any final failed operation must retain its pending record as `awaiting_user_retry`, not generally executable. It must not archive raw traces, append memory/lineage, replace snapshot/context, delete source traces, schedule retry, or allow target-agent dispatch in that turn.
- Final compaction failure ends only the active turn. It must not stop the agent worker/runtime; the inbox remains available for retained non-user entries and a later USER recovery signal.
- `initial_attempt_ready` authorizes exactly one automatic first execution for any turn origin. After failure, only `TurnStartOrigin='user'` can authorize; the same failed execution turn ID cannot authorize again.
- Resolve origin before input conversion. `InterAgentMessageReceivedEvent`, `SenderType.AGENT`, and `SenderType.SYSTEM` are non-user; event names, rendered sender prose, and converted LLM messages are not authorization evidence.
- While awaiting user retry, non-user entries remain in the existing turn-start queue and are not claimed/requeued. The scheduler's wait predicate must ignore them yet wake for a new USER or lifecycle event. Normal FIFO, active-turn serialization, and shutdown drain remain unchanged outside this gate.
- Error assistant completion is a runner failure even if its text contains valid-looking JSON. Non-error invalid assistant completion is a response-validation failure even if its prose resembles a provider error.
- Raw trace, tool payload, archive, lineage, and canonical memory values are never sanitized in place. Provider-safe normalization operates on a derived string only.
- Compaction middle/end truncation must never leave a high surrogate without its low surrogate or begin a retained tail with an unmatched low surrogate. Adjusted boundaries, not pre-adjustment estimates, govern the omission count and maximum length.
- Derived compaction text preserves valid Unicode. It normalizes CRLF/CR to LF, preserves LF/TAB, removes C0 U+0000–U+0008/U+000B/U+000C/U+000E–U+001F and DEL U+007F, and replaces pre-existing lone surrogates with U+FFFD.
- The completed first/correction task prompt must be well formed before `CompactionAgentRunner.runCompactionTask`. Failure at this boundary is a typed local input-construction failure with zero child/provider calls and zero response-repair attempts.
- No whole-task character clamp is introduced. Complete-prompt size remains governed by the approved B/T/P token planning and validation path; only an individual rendered value or accepted episode/fact is shortened to its own configured limit.
- Accepted episode/fact clamps must use the same safe end primitive because their output can enter a later provider request.
- `MemoryCompactionConfiguration` has exactly `disabled` and `enabled`. Disabled contains no policy/runner. Enabled requires the single current `CompactionPolicy` and non-null current strategy runner. Omitted direct-core construction resolves to disabled; normal server runner construction failure/null fails agent composition and never selects disabled. No parallel top-level runner, boolean, ratio sentinel, or persisted representation exists.
- `AgentConfig` carries the non-null configuration; `AgentFactory` must not construct another policy. `MemoryManager` owns the installed configuration and its existing coordinator remains the only pending/attempt/episode/commit state owner.
- `autobyteus-memory-compactor` must receive disabled configuration on both create and restore; the server runner factory must not be called for it. Every normal production definition receives enabled configuration with a fresh policy and its current runner, or its creation fails truthfully if that required runner cannot be constructed.
- Core LLM-loop code must use only the memory boundary's configuration decision. It must not import server built-in identity or inspect name, prompt, model, provider, ratio, or hard-cap reason.
- Common provider/model request capacity is resolved for enabled and disabled runs. The scalar safety fallback is the enabled policy's configured value or the existing 256-token default when disabled. Compaction ratio/trigger budget is derived and applied only for enabled runs; disabled is not a 100% policy and is not unlimited capacity.
- A disabled LLM phase constructs/passes no strategy or pending executor, performs no automatic compaction evaluation, emits no compaction lifecycle, creates no pending/threshold state, and launches no descendant; it returns the original LLM tool/final outcome.
- The default strategy registry remains pluggable but contains only the existing `structured-json` registration. No second policy or strategy is added by this change.
- Initial and response-correction Memory Compactor runs are parent-owned siblings. Both are leaves; there is no nested child even when the child usage is above proactive or hard-cap thresholds.
- A normal-agent 20% trigger is not derived or applied inside a disabled leaf. This is independent of the fact that `176,655` fits the provider/request budget, which remains the existing admission/failure authority.
- No string matching to classify execution failure.

### Targeted executable coverage

Core unit/integration:

- `token-budget` / new planning-budget tests: exact 1%, 20%, and 80% arithmetic; 10%/256 headroom; target-scaled replacement reserve; invalid/low target.
- new threshold-gate tests: initial crossing, accepted success awaiting actual observation, first actual-below reset, first same-key at/above suppression with one diagnostic, repeated suppression without another card, budget-key reset/re-evaluation, hard-cap override, and no token usage.
- `working-context-message-window-planner.test.ts`: complete-target budget; required/system/protected/replacement/calibration deductions; low-ratio plan under 123,148; soft recent minimum; unattainable target; compactable raw-trace prefix; removal of 35%-above-trigger and all-fitting collapse.
- strategy registry/resolver tests: dynamic pending planning budget reaches the strategy on both immediate and next-dispatch execution; no stale budget captured before token usage.
- accepted builder/output validator/executor tests: actual projected summary under target commits once; commit clears pending and installs `awaiting_below_observation`; oversize summary fails before every store mutation and retains pending as `awaiting_user_retry`.
- coordinator/recovery tests: pending/planning/attempt and episode copies without aliasing; `initial_attempt_ready -> attempt_in_progress -> awaiting_user_retry`, USER-only retry, duplicate same-turn denial, accepted clear, rollback restores both shapes; direct v1/v2/v3 stored memory remains unchanged.
- `llm-phase-compaction` integration: enabled configuration at 249,416/20% requests once; resulting target below 123,148; default 80% remains governed by the 35% quality cap.
- summarizer tests: first typed runner failure -> one child, zero parser/correction; invalid non-error output -> two children; second runner failure after invalid output -> typed exhausted response failure with both run IDs.
- provider-safe text tests: exact shield source at middle head boundary, shield at tail/end boundary, isolated high/low surrogate, variation-selector emoji, German/Chinese text, code/path symbols, CRLF/CR, LF/TAB, NUL/C0/DEL, limit 0/tiny limits, exact omitted count after boundary adjustment, no input mutation, and no-truncation/redaction regressions.
- prompt/parser integration: exact captured tool result builds a complete well-formed/control-safe task that survives JSON serialization/strict parsing without whole-prompt character truncation; every individual rendered value and accepted episode/fact clamp stays within its own configured limit after safe-boundary adjustment; accepted text clamped at an emoji boundary remains well formed in the later continuation projection; an injected final invariant failure creates no child and no correction.
- memory-compaction-configuration tests: only disabled or complete enabled values; enabled requires current policy+runner; omitted direct `AgentConfig` and `MemoryManager` construction each resolve to the complete disabled variant; copy creates a fresh policy with the same `triggerRatio`/`maxItemChars`/`safetyMarginTokens` and retains runner identity; no enabled-without-runner/top-level runner state.
- agent-factory/manager tests: supplied configuration reaches `MemoryManager`; factory creates no independent policy and never relies on the manager default; disabled observation produces a no-work decision and no coordinator mutation; enabled uses the supplied policy.
- token-budget tests: common request capacity is identical for enabled/disabled; 1%, 20%, and 80% ratio/trigger derivation occurs only for enabled; provider input/context caps, output reserve, safety margin, and active-context override retain current arithmetic.
- disabled-config LLM-phase integration: with valid usage above proactive and policy-hard-cap thresholds, assembler has no executor, strategy resolver/evaluator/policy application are not called, manager pending/episode state remains untouched, no reporter lifecycle is emitted, ordinary request capacity is still resolved, and the original tool/final response is returned. Cover absent usage and tool-invocation responses without changing ordinary behavior.
- enabled-config regression: existing single policy classifies `none`/`proactive`/`hard_input_cap`; current registry resolves `structured-json`; current runner reaches the strategy on immediate and next-dispatch execution; no second policy/strategy exists.

Event/server:

- response pipeline/notifier/stream payload tests: `isError` becomes `is_error` and defaults false for ordinary responses.
- AutoByteus event converter test: error flag survives to `AgentRunEvent.ASSISTANT_COMPLETE`.
- collector tests: non-error output success; error completion failure with exact message; terminal child error; interruption; timeout; tool approval; empty success; error text containing JSON never returns output.
- server runner tests: every collector failure becomes `CompactionAgentRunnerError` with closed kind, cause, task ID, and child run ID; cleanup always runs.
- backend-factory tests: canonical Memory Compactor ID skips `compactionAgentRunnerFactory` and receives disabled configuration on create/config build and restore; a normal definition invokes the factory with the unchanged definition/workspace/runtime/model tuple and receives enabled configuration containing a fresh current policy and its runner. Separate thrown-factory and defensive-null fixtures assert truthful agent-composition failure and no normal-agent disabled fallback. Existing unrelated fixtures that injected null must use an explicit runner stub. Use the registry constant, not a duplicated literal expectation.
- inbox/scheduler unit tests: exact origin resolution for direct `InterAgentMessageReceivedEvent` and USER/AGENT/SYSTEM carriers; first-matching claim leaves skipped entries/order intact; same predicate governs dispatchability/wait; non-user-only queue does not spin; lifecycle priority and shutdown drain unchanged.
- parent runtime integration: runner failure produces one truthful failed status, one child and zero correction children, retains `awaiting_user_retry`, performs no target dispatch, and schedules no retry; a distinct user `continue` executes once before dispatch and either resumes on success or stops again on failure. The same rule covers proactive and hard-cap pending requests.
- direct origin-gate integration: with `AGENT-A, USER-continue, SYSTEM-S, AGENT-B`, no non-user turn/child/error occurs before USER; failure retains all three entries; success dispatches USER first and retained entries later as A/S/B. Repeat with the direct inter-agent event representation and the production `SenderType.AGENT` carrier. Verify a newly requested initial operation still auto-executes from AGENT/SYSTEM turns.
- exact Unicode runtime regression: replay the captured selected source units containing `icon: '🛡️'`; assert the child receives a well-formed prompt and the request is not rejected with `unexpected end of hex escape`. If a live DeepSeek run is available, retain provider evidence; otherwise the exact deterministic serialization fixture is mandatory.
- recursive-compactor integration: force the global trigger to 20% and execute a provider-admissible built-in child above 123,148 tokens. Assert exactly one initial child, disabled memory compaction, common request-capacity accounting, original completion collected, zero policy/strategy/compaction operation/events/pending on the child, and zero descendant. Repeat with usable invalid initial output: exactly one disabled correction sibling and zero descendants. Confirm parent accepted commit and the next actual 73,102-token observation reset.

Regression/API/E2E intent:

- exact prompt contract and parser tests remain byte/behavior stable;
- no tool is added to Memory Compactor or Daily Assistant;
- no episodic/semantic/lineage migration or prompt version change;
- real or deterministic 80%→20% run produces one compaction rather than a rapid chain;
- after accepted success, first fresh same-key provider usage below `T` rearms; at/above `T` produces one bounded inadequate-reduction diagnostic and no second proactive operation;
- controlled child error completion is reported as runner failure, never `json_object_extraction`, and never launches correction;
- genuine malformed non-error model output still launches exactly one correction;
- AGENT/SYSTEM delivery during `awaiting_user_retry` creates no compactor attempt and is preserved until a successful USER retry; USER recovery is not blocked by an earlier non-user queue head;
- generated compaction history and clamped continuation text contain no lone surrogate or disallowed control, while raw source traces and valid multilingual/code/emoji content remain unchanged;
- built-in Memory Compactor never compacts itself at 20% or policy-hard-cap pressure; normal target agents still use the one current enabled policy/strategy path, and an optional repair is a disabled sibling rather than a descendant;
- existing run archives remain readable and untouched; no migration or cleanup is introduced;
- Memory Inspector and continuation projection retain existing episode/category behavior.

### Durable documentation

Update the current sections in:

- `autobyteus-ts/docs/agent_memory_design.md`
- `autobyteus-ts/docs/agent_memory_design_nodejs.md`
- `autobyteus-server-ts/docs/modules/agent_memory.md`
- `autobyteus-server-ts/docs/modules/agent_work_traces.md`
- `autobyteus-server-ts/docs/ARCHITECTURE.md`

Document trigger-derived complete-prompt target, calibration/headroom/reserve, post-success actual-observation gate, typed runner-versus-response outcome, pending attempt states, authoritative USER-only retry admission with existing-queue non-user preservation, hard-cap override, memory-owned disabled/enabled automatic-compaction composition, provider-capacity separation, built-in Memory Compactor leaf provisioning, and unchanged single-policy/current-strategy/six-array/v3/tool-free/accepted-commit contracts.
