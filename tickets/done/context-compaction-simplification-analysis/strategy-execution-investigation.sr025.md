> SR-028 authority: this source/proposal supplement is retained for rationale and provenance. Current approved requirements and complete technical architecture are in requirements-doc.md and design-spec.md. Text-to-text strategy, three internal attempts, numeric target removal and held-A-then-B are all settled; prior pending questions/interfaces in this supplement are historical, not current implementation instructions.

> SR-026 supersession: source observations below remain evidence. The earlier recommendation for runtime-owned automatic retries is no longer current: the user directs three total compression attempts inside one strategy call, with no outer loop. Only original/new-message disposition remains unconfirmed. See solution-revision.sr026.md.

# SR-025 — Prepared-content boundary and execution-path investigation

2026-09-30 · context-compaction-simplification-analysis · Solution Designer.
**Evidence and feasibility assessment, not a completed architecture or implementation instruction.** The content boundary is approved; the separate retry-error and message-disposition choices remain pending. No new model calls or executable tests.

## Confirmed behavior: one transformation, not the whole compaction workflow

User reconfirms that content is already prepared when the strategy is called, then asks to continue the ticket. REQ-010 / DEC-021-01 and REQ-011 / AC-016 are settled. The essential content contract remains:

```ts
interface CompressionStrategy {
  compress(content: string): Promise<string>;
}
```

The method receives content to compress and returns compressed content. For this caller the input is rendered selected history and the result is a continuation summary. The method does not receive working-context nodes, select the prefix, know the suffix, load a previous summary separately, or install the result. Cancellation and attempt diagnostics are execution concerns, not extra history or return-value fields. Final binding of these controls must be reconciled with the single retry owner; the illustration does not authorize dropping cancellation.

### Approved responsibility flow

```text
pending-compaction admission
  -> capture valid baseline
  -> existing planner selects eligible prefix / retained suffix
  -> caller prepares selected history as text (previous summary included once)
  -> CompressionStrategy.compress(content)
  -> existing acceptance builds and validates candidate context
  -> existing commit establishes replacement
  -> parent request assembly continues
```

The retry cycle surrounds candidate generation, not commit or the entire parent turn. Its detailed eligibility is a separate pending decision. Do not add a numeric desired-summary-size instruction. Provider output cap, input-capacity checks and final-context fit checks remain separate. ASM-022-01 supplies the natural-compression operating assumption; no further model experiment is needed to justify the settled prompt-target removal.

## Source observations and concrete implications

Paths below are relative to the task worktree. Hashes are in `solution-recovery-evidence/sr025/input-audit.json`. These are source observations, not fresh runtime validation.

### E25-1 — Move preparation, not selection or commit

`autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` currently passes `plan.compactableUnits` plus target/model/control fields to the concrete summarizer. `direct-llm-compaction-summarizer.ts` calls `WorkingContextCompactionPromptBuilder.buildTaskPrompt` inside that implementation. The current call is therefore not yet the agreed text boundary.

`working-context-compaction-prompt-builder.ts` currently combines two responsibilities: rendering units through `CompactionConversationHistoryRenderer`, and adding the target-history introduction/separators plus provider-safe finalization. Implementation planning must separate shared content preparation from model request construction. Preserve role order, existing tool excerpts, supported Unicode and history content. The caller prepares the text; the direct implementation may wrap that text with its existing introduction/separators and unchanged system instructions. Merely moving an LLM instruction prompt wholesale into every generic strategy's input would retain avoidable coupling. Compare old/new final request bodies modulo the sole approved numeric-prefix removal.

For repeated compaction, the planner's compacted-memory unit already supplies the previous summary. Do not prepend another summary. Plan/prepare once for a bounded cycle and reuse the same immutable content across its generation attempts; candidate generation must not receive or mutate live nodes.

### E25-2 — Provider metadata is not needed to build the accepted context

`working-context-compaction-proposal.ts` requires `execution: CompactionExecutionMetadata`, but `accepted-compaction-builder.ts` does not read that field. Its accepted result contains the compaction ID, baseline fingerprint, selected raw-trace IDs, finalized context and budget assessment, not provider execution metadata. A source search found no `proposal.execution` reader in core production sources. The executor consumes `result.execution` only to populate reporting fields before passing it through the proposal.

This supports removing the mandatory provider field from the shared proposal/content result rather than inventing fake provider metadata for a replacement strategy. Keep direct-LLM completion checks and usage reporting; associate optional diagnostics with the runtime-owned attempt separately. Do not remove production token-usage observability merely because it leaves the content contract. Reporter failure must remain unable to fail a successful commit. No arbitrary provider payload bag or category/child-agent result type is needed by the compression interface.

### E25-3 — Bind the current parent model at execution, not at server startup

`autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` currently constructs `DirectLlmCompactionSummarizer` with a provider factory. `autobyteus-ts/src/agent/loop/llm-phase.ts` reads the current `context.state.llmInstance` for each phase and sends its model identifier into request assembly/execution. Therefore a text-only method must not accidentally replace dynamic parent resolution with a model captured only at original run creation.

Candidate composition approach for the eventual design: bind the chosen implementation's provider dependency and execution controls for the current invocation outside the content operation. Shared runtime/configuration depends on the interface, while the server composition root alone chooses the direct implementation. Any composition factory is an invocation-wiring seam, not a strategy registry or user setting. A test implementation can ignore provider wiring and return content without constructing a provider. Exact factory/control API remains to be completed together with retry ownership; this investigation does not freeze a second speculative framework.

### E25-4 — Three actual requests need transport-aware ownership

Current `autobyteus-ts/src/llm/base.ts` exposes signal/turn ID in invocation options but no per-invocation retry control. `openai-compatible-llm.ts` creates an SDK client with its defaults and forwards only signal as request options. `deepseek-llm.ts` inherits that path. API's existing six offline probes demonstrate three HTTP requests for repeated 503 under default SDK retries, one for 401 and one for a successfully returned but unusable summary. They were read, not rerun.

An application loop of three calls over this unchanged adapter can make nine actual requests. Neither renaming the summarizer nor counting calls to `compress` proves the actual-request ceiling. The completed design must assign one owner of the generation request budget, disable nested retries for compaction or share the same budget through the transport boundary, and preserve normal parent-provider retry behavior. Do not globally disable retries on a shared parent client. Investigation of other adapter families is not complete; no all-provider request-count guarantee is claimed by this source inspection. Eligible error classes, waits and deadlines must be specified before implementation, with deterministic adapter tests rather than live failure hunting.

### E25-5 — Existing terminal-turn errors are distinct from a dead worker

`LlmPhase` currently emits a turn diagnostic on compaction failure, returns a final response with `isError`, and the turn runner/worker finish as completed then idle. This corroborates the existing API observation; it is not newly a violation of the old authority.

There is an existing error vocabulary worth reusing before adding states: server `agent-run-error-evidence.ts` distinguishes `TURN_DIAGNOSTIC`, `TURN_TERMINAL` and `RUNTIME_GLOBAL`; the native stream converter projects the latter two as an error status hint. `agent-turn-lifecycle-state.ts` can retire the failed turn, retain an error through an empty idle snapshot, and accept a later command/start. `AgentRuntime.submitEvent` tests worker liveness/stopping, not the status enum alone. Conversely, `AgentStatus.isTerminal(ERROR)` and other status consumers mean blindly emitting a fatal runtime error is not a proven solution.

This is a candidate reuse path, not proof that changing one error flag fixes the journey. The completed design must reconcile core settlement, event ordering, explicit status updates, server lifecycle, frontend display/input availability and reconnect/resume. In particular, `observeExplicitStatus` can set a later idle status; snapshot stickiness alone does not prove the visible error survives. No worker termination or new global status enum is justified merely to display a recoverable compaction failure. Full client/team journey remains untested.

### E25-6 — Trace preservation is not a replay queue

`MemoryIngestInputProcessor` records the user trace before request assembly; `MemoryManager.ingestUserMessage` calls the raw store. `LLMRequestAssembler` executes pending compaction before appending its current user message to working context. Thus A can be recorded without ever entering a parent request, while a later invocation supplies B.

`agent/event-inbox/inbox-queue-store.ts` stores queues in arrays/maps, and claiming an entry removes it. This inbox is not evidence of a durable pending-A delivery ledger. The input pipeline also catches individual processor errors and continues with the preceding message, so successful pipeline return alone is not proof the raw write succeeded. Do not infer pending delivery by replaying every raw user trace absent from the current compacted context: compaction legitimately removes already-consumed messages.

DEC-021-03 therefore still matters: after success, send A then B once, or send only B with A visibly failed. A-then-B is the current recommendation, not an approved delivery/restart contract. If chosen, investigate the smallest explicit retention/identity mechanism and its ordinary restart behavior before proposing storage changes. This does not establish a need for a data migration, blanket historical replay, attachment-owner bypass or an exactly-once guarantee across arbitrary network/power failures.

## Change/verification map for the eventual approved design

| Concern | Existing owner / likely affected paths | Required verification |
| --- | --- | --- |
| Content-only seam | core compaction configuration, executor, direct implementation, prompt builder/renderer, core exports; server composition | Independent strategy without concrete inheritance/cast; plain string in/string out; no provider/category metadata fabrication |
| Content preparation | executor + existing history renderer; direct request wrapper | First/repeated history order, prior summary once, Unicode/tool excerpts unchanged; no numeric prompt target; exact v5 |
| Acceptance | proposal/builder/output validator/committer | Empty or rejected candidate cannot commit; same tool/provenance/final-fit checks; reporting cannot undo committed success |
| Invocation lifecycle | executor/coordinator + provider adapters + current model resolution | One actual-request budget, first-success stop, no fourth; cancellation during call/wait and ignored late output; no storage/postcommit model retry |
| Recoverable failure | LLM phase, runner/worker, native event converter, server lifecycle, existing frontend handlers/composer | Failure remains visibly failed with input enabled; new distinct user retries before dispatch; no agent/system bypass; reconnect coverage |
| Original/new user messages | input pipeline/assembly/turn ownership, possibly current persistence owner after approval | Chosen A/B policy with identity/attachments intact; no replay of already-consumed work; supported restart behavior explicit |

No second production algorithm, selector, registry, legacy settings import, semantic repair pass or new long-term-memory store. Product Design coordination N/A — no user request for it; minimal existing-surface error corrections remain in scope. New user-visible scope beyond that returns for approval.

## Migration and remaining approval boundary

Re-read `autobyteus-server-ts/docs/design/data_migration_guideline.md`: migrate only for a demonstrated changed meaning/new required historical fact; compatible optional fields and obsolete-field removal need no migration; no startup history audit or global lockout. Prepared-text interface and prompt-envelope changes do not themselves change saved data meaning. Existing SR-018/019 preservation design is not reopened. No migration is introduced here. Do not promise or add a retry-message migration before the message policy and actual storage need are established.

Two focused choices remain with the user: DEC-021-02 permanent-error early stop, and DEC-021-03 A/B disposition. Questions are already presented; no answer received when this result was persisted. Continue from those answers rather than asking again about the settled content boundary or numeric target. Affected architecture remains Needs Revision until the consolidated approved basis is internally consistent. This source investigation does not restart interrupted API005 or authorize new provider calls.
