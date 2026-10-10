# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/requirements-doc.md` (SR-004; the approved baseline is SR-002, and SR-004 restates it without changing intended behavior)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed: `probes/fork-summary-probe.mjs`, `probes/fork-summary-probe-result.json`, `probes/compaction-prompt.txt` (evidence only)
- Relevant Solution Revision IDs: SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: re-review request from `/software_engineering_team/solution_designer` after SR-004 (resolution of ARCH-001..003)
- Prior Review Round Reviewed: Round 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: round 1 trace (below) still holds. Round 2 rechecked the SR-004 requirements rows (BEH-001/002, UC-001, REQ-001/004, AC-001/009, SCN-002), design-spec Intended Change 5–6, the port interface, examples and tests, `AutobyteusClient.cleanup(conversationId, options)` (`clients/autobyteus-client.ts:303`), and that `logicalConversationId` is in `INTERNAL_PROVIDER_REQUEST_KWARG_KEYS` (`provider-request-kwargs.ts:2`). Round 1 basis: worktree `codex/compaction-prompt-cache-reuse` @ `46e94fdea` (clean apart from the ticket folder).
  - Core code read:
    - `memory/compaction/{direct-llm-compression-strategy,pending-compaction-executor,memory-compaction-configuration}.ts`;
    - `agent/loop/llm-phase.ts`: the executor is built per call at `:127`; after-final compaction at `:363`; the conversation call at `:191` with `logicalConversationId: agentId`;
    - `agent/llm-request-assembler.ts`;
    - `llm/base.ts` (`retryMode`);
    - the providers' `retryMode === 'single_attempt'` → `maxRetries: 0` (anthropic, openai-compatible, openai-responses, gemini);
    - `llm/api/autobyteus-llm.ts`: `logicalConversationId` → remote `conversationId`; `usedConversationIds` cleaned only in `cleanup()`;
    - `llm/prompt-renderers/autobyteus-prompt-renderer.ts`;
    - `llm/autobyteus-provider.ts:153`: AutoByteus models carry `maxContextTokens`.
  - Docs: `autobyteus-ts/docs/llm_module_design_nodejs.md` §9: "On the RPA server, an existing cached session sends only the current user message to the remote UI."
  - Server consumers of the removed setting/factories: `create-process-agent-provider-factory-builder.ts`, `agent-provider-factory-builder.ts`, `autobyteus-agent-run-backend-factory.ts:459`, `server-settings-service.ts`, `compaction-llm-factory.ts`, `config/compaction-model-settings.ts`. No other consumer was found.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed:
  - three packages (core, server, web);
  - the shared compaction configuration contract changes;
  - interaction with the preserved-thinking contract;
  - removal of a persisted setting.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
  - SR-004 aligns the requirements with REQ-005: the BEH-002 row is repaired; UC-001, REQ-001, AC-001 and SCN-002 are corrected; REQ-004 no longer traces to BEH-002.
  - SR-004 states two existing behaviors as preserved behavior: session isolation (BEH-001) and the attempt budget (REQ-004). It adds AC-009.
  - Intended behavior is unchanged, so the SR-002 approval still governs.
  - Remaining historical wording: DEC-001's option text (a resolved decision) still says "when the compaction model equals the agent model". It is non-governing.
- Approved requirements / intended behavior understood: Yes.
- Relevant existing behavior and evidence confirmed: Yes (round 1, plus the round-2 rechecks in the meta).
- Scope guardrail confirmed: Yes.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`. None remain.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | Each attempt uses a compaction-scoped id and releases it through `BaseLLM.releaseConversation`; one provider call per attempt. See note N-1 on the release signal |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | Requirements aligned with REQ-005 |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | Server projection test (as designed) |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | Guard → compaction → guard |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/fork-summary-probe.*`, `probes/compaction-prompt.txt` | Pass | Pass | Pass | Pass | Pass | — (Anthropic only; other providers go to validation, as the design states) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change + Refactor + Performance | — |
| Root-cause classification is explicit and evidence-backed | Pass | The server injects factories only to choose a model; the summary never reuses the conversation | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes; core-owned summarizer behind a port | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership, port, removal plan, sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settled point → committed compacted context | Pass | Pass | Pass | Pass | Pass | Pass | Pass. The port owns the compaction conversation id and its release |
| DS-002 | Summarizer fork → fallback | Pass | Pass | N/A | Pass | Pass | Pass | Pass. 2 cached + 3 transcript attempts, each one provider call; the budget includes the output reservation |
| DS-003 | Compaction usage → meter | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Setting removal | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ConversationSummaryPort` (implemented by `LlmPhase`) | Pass | Pass | Pass | Pass | Memory and compaction never hold `BaseLLM`, the notifier or the tools |
| `PendingCompactionExecutor` | Pass | Pass | Pass | Pass | — |
| `BaseLLM` / provider adapters | Pass | Pass | Pass | Pass | Unchanged |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/compaction` → `llm/utils`, own prompt/parser (not `agent`, `llm/api`, server) | Pass | Pass | Pass | Pass | The existing `direct-llm-compression-strategy.ts` imports `agent/token-budget.js`; the new design moves the budget check behind the port (`fitsInputBudget`), which removes that memory → agent import. Good |
| `agent/loop` → `memory/compaction` port type | Pass | Pass | Pass | Pass | Port pattern |
| server/web ↛ compaction strategy or model | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ConversationSummaryPort.requestCachedSummary / requestTranscriptSummary / fitsInputBudget` | Pass | Pass | Pass | Low | Pass. Id `compaction_<operationId>_<attempt>`; release after each attempt; `retryMode: 'single_attempt'` |
| `BaseLLM.releaseConversation(conversationId, {signal?})` (new) | Pass | Pass | Pass | Low | Pass. One provider-side conversation; default no-op; `AutobyteusLLM` overrides it with `client.cleanup(id)` and drops the id from `usedConversationIds` |
| `CompactionSummarizer.summarize(...)` | Pass | Pass | Pass | Low | Pass |
| `PendingCompactionExecutorOptions.summaryPort` | Pass | Pass | Pass | Low | Pass |
| `createEnabledMemoryCompactionConfiguration(policy)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent request construction | Pass | Pass | N/A | Pass | Shared private helper in `llm-phase.ts` (or a sibling file) |
| Summary prompt/parser, transcript builder, notifier | Pass | Pass | N/A | Pass | — |
| Summarizer | Pass | Pass | Pass | Pass | Replaces the Direct strategy |
| Per-attempt isolation and cleanup of the summarizer LLM (today: new LLM per attempt plus bounded `llm.cleanup`) | Pass | Pass | Pass | Pass | Replaced by a compaction-scoped id plus `BaseLLM.releaseConversation`, bounded to 10 s |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Pass | Pass | Pass | Pass | — |
| `autobyteus-ts/src/agent` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts` | Pass | Pass | Pass | Pass | Removal list matches the grep |
| `autobyteus-web` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Conversation request construction | Pass | Pass | Pass | Pass | One builder for the normal call and the fork |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SummaryAttemptResult` | Pass | Pass | Pass | N/A | Pass | — |
| `CompactionExecutionMetadata` + `mode` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/compaction/compaction-summarizer.ts`, `conversation-summary-port.ts` (new) | Pass | Pass | N/A | Pass | — |
| `pending-compaction-executor.ts`, `compaction-execution.ts`, `memory-compaction-configuration.ts`, `memory/index.ts` | Pass | Pass | N/A | Pass | — |
| `agent/loop/llm-phase.ts` (+ optional port file), `agent/llm-request-assembler.ts` | Pass | Pass | Pass | Pass | Prefer the separate port file; `llm-phase.ts` is already large |
| Server and web removal files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New files in `memory/compaction/` and optionally `agent/loop/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct strategy, factory types, configuration injection | Pass | Pass | Pass | Pass | — |
| Server factory, settings key, wiring | Pass | Pass | Pass | Pass | — |
| Web model UI and i18n | Pass | Pass | Pass | Pass | — |
| Per-attempt LLM isolation and cleanup | Pass | Pass | Pass | Pass | The replacement lifecycle is explicit (ARCH-001 resolved) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Compaction-model setting | No | Pass | Pass | The inert leftover key is a tolerant-reader decision, not legacy behavior |
| Transcript path | No | Pass | Pass | Recovery path of one summarizer, not a mode |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` config value | Directly Usable — No Migration (inert) | Pass | Pass | N/A | Pass | The implementer verifies that a generic settings listing does not show it as editable |
| Compaction output, snapshots | Not Affected | Pass | Pass | N/A | Pass | — |
| Usage rows | New rows via the existing pipeline | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Core port/summarizer → executor/config → `LlmPhase` port → assembler → server → web → tests/docs/live | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cached request, fallback, ordering, usage | Yes | Pass | Pass | Pass | Examples now use `compaction_<operationId>_<attempt>`, `retryMode: 'single_attempt'` and the release |

## Material Premise Validation (Only When Needed)

### P-001 — The cached summary request on an AutoByteus (RPA) model reuses the agent's live remote session

- Round 1: `Reachable`; drove ARCH-001.
- Round 2 status: handled. Every attempt uses `compaction_<operationId>_<attempt>`, never the agent id, and releases it through `BaseLLM.releaseConversation` → `AutobyteusClient.cleanup(id)` (`clients/autobyteus-client.ts:303`), removing it from `usedConversationIds`.
- The agent's LLM is never cleaned up by compaction.
- API providers filter `logicalConversationId` (`provider-request-kwargs.ts:2`), so the cached prefix is unaffected.
- AC-009 tests isolation and release.

### P-002 — SDK-level retries inside each summary attempt

- Round 1: `Reachable`; drove ARCH-003.
- Round 2 status: handled. Both port requests pass `retryMode: 'single_attempt'`. REQ-004 states the budget (2 cached, then 3 transcript, one provider call each), and port tests cover it.

No new material premise was introduced in SR-004.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None blocking. ARCH-001, ARCH-002 and ARCH-003 are resolved; see the `ARCH-REV-002` prior-finding table.

### N-1 — Release-signal note (non-blocking implementation note, no finding ID)

The design says the release is "bounded to 10 s like today's cleanup" and passes `{signal}`. The implementer must:
- run the release in a `finally` for every attempt outcome: success, failure, tool call, and abort or interruption;
- drive it with its own bounded controller, not the compaction operation's signal. That signal may already be aborted on interruption, which would skip the release and leak the remote session. Today's `DirectLlmCompressionStrategy.cleanup` uses its own `AbortController` plus a 10 s timer;
- add the abort case to the AC-009 tests.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)

## Residual Risks

- **Non-Anthropic providers:** instruction following → parser and fallback; validate one provider.
- **Server projection:** `autobyteus_compaction` with a null latest prompt → server tests.
- **Post-compaction size:** the summary overlaps the kept tail (DEC-002); existing `post_compaction_target_exceeded` handling applies.
- **AutoByteus RPA:** compaction gets no cache benefit there (fresh session per attempt). This is accepted and recorded in the design.
- **Wording:** DEC-001's historical option text, non-governing.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 and P-002 are handled)
- Notes: the port-based architecture is ready for implementation. N-1 is an implementation note.
