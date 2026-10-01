> Approved in SR-028: user “Well, I think now you can continue with the design. Yeah, I agree with you. Hold A then B flow.” The bounded behavior below is settled. Mechanism is specified in current design-spec.md; proposal-stage confirmation wording below is historical, not an outstanding question.

# SR-027 — Reuse the AgentRun queue for compaction-held input

2026-09-30 · Solution Designer · context-compaction-simplification-analysis.
**Evidence-grounded recommendation for user confirmation, not completed architecture.**

## Request and recommendation

User asks for the simplest approach: cache/hold the submitted message when compaction fails, show the error, accept a later message, retry compression and send the held work after success. Suggests an input queue for each AgentRun, possibly frontend-owned. This establishes the desire to retain the original input, rather than silently discard it; it asks for an opinion on the concrete queue approach.

Recommend reusing the existing server-owned AgentRun input queue, not inventing another queue or making the frontend the authoritative delivery owner. Queue ownership is per run, not per reusable agent definition. The frontend projects queued/held status and permits new input after recoverable compaction failure. CompressionStrategy owns its three total compression attempts; it does not own messages, their delivery or the queue.

Proposed minimal user-visible flow (DEC-021-03 / REQ-004 / proposed REQ-012):
1. User sends A. The run accepts and retains its identity, text and attachments; compaction gates parent dispatch.
2. If all three strategy attempts fail, show a recoverable compaction error and A as held, not completed or silently removed. Stop automatic queue draining for this compaction blockage. No fourth request and no endlessly repeated cycles because an old queued entry exists.
3. A later user message B is admitted behind A and authorizes a fresh strategy call. Pending A remains first; do not append a duplicate A to the conversation or record it as a new user submission.
4. On successful compaction/commit, continue held user inputs in order: A, then B. This is ordinary ordered input handling, not a promise of two simultaneous parent dispatches or replaying already executed turns. On renewed failure, keep both held and stop again.
5. Messages queued before exhaustion do not by themselves authorize repeated recovery cycles. New input while a recovery cycle is already active is queued, not permission for overlapping compaction operations.
6. Explicit cancellation/termination remains a stop action; no promise to keep processing a terminated run. Existing history preservation remains. No new universal durable outbox or historical-message replay is proposed.

State meanings should stay separate from input admission: idle means ready; busy may accept queued input or supported active-turn append; recoverable compaction error pauses dispatch but can accept recovery-triggering input; offline needs normal activation/resume before runtime dispatch. Do not call all of these the same terminal state. Retain each runtime's existing append-versus-wait behavior rather than imposing new behavior on every provider runtime.

## Current source facts

Paths are relative to the worktree; hashes in solution-recovery-evidence/sr027/input-audit.json. Source/test definitions inspected, no tests run.

- **E27-1: the shared queue already exists.** `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` constructs one `AgentRunInputAdmissionState` per AgentRun. `postUserMessage` admits independently of immediate dispatch. `input/agent-run-input-admission-state.ts` stores FIFO entries and claims one dispatch at a time. Capabilities choose start-turn versus active-turn append. This is the relevant shared layer, in addition to the lower-level core AgentEventInbox traced in E25. E25 did not establish absence of a server queue.
- **E27-2: retention after failure is not already solved.** Entries progress reserved/committed/queued/claimed/forwarded/terminal. Turn completion/failure removes matching forwarded entries. `AgentRun.observeInputCanonicalEvents` translates ordinary terminal errors into that removal; a runtime-global failure also closes acceptance. A compaction hold must not be represented solely as an ordinary terminal-input failure if A is meant to survive.
- **E27-3: forwarded is not parent-model consumption.** Native backend `autobyteus-agent-run-backend.ts` returns forwarded after posting into the core runtime; it does not wait for the parent model request. Compaction runs afterward during assembly. Requeue/retention must use an explicit proven-before-parent-dispatch outcome, not generic provider failure or inferred absence from compacted history. Existing `undeliveredRetryAsStart` applies only to a rejected active-turn append where the backend guarantees non-delivery; it is not automatically reusable for this different start-turn failure.
- **E27-4: queue dispatch needs a compaction pause.** `AgentRun` drains after lifecycle/dispatch settlement; merely requeueing A after failure can immediately start another cycle. New-user recovery admission and held-item eligibility must be reconciled across this owner and core compaction gate. The strategy's three attempts remain the only automatic compression loop.
- **E27-5: frontend is not an acknowledged delivery queue.** `localUserSubmission.ts` appends an optimistic message and clears the composer, using a single submissionPending flag. `UserMessage` has optional messageId/dedupeKey but no held delivery state. Standalone streaming sends identified commands; server command registry deduplicates in process. Neither a rendered chat bubble nor forwarded acknowledgment proves parent delivery.
- **E27-6: busy UI differs from backend capability.** `agentPrimaryAction.ts` uses the primary button to interrupt while Running, disables it while Initializing/submissionPending, and otherwise allows send with a usable draft. Backend busy-input acceptance does not prove the current composer offers a separate busy-send action. Preserve existing busy UI in this ticket unless the user explicitly expands scope; recoverable compaction-error input availability is already requested and must be verified.
- **E27-7: these queues are in memory.** Server admission entries and command-registry records use arrays/maps. The core inbox is also in memory. This recommendation does not establish delivery persistence across backend restart or deletion of a run. Existing persisted conversations/raw evidence remain protected, but are not a pending-delivery ledger. Browser reconnect and backend restart are distinct boundaries. Offline send currently enters normal activation through command coordinator/service; this inspection does not claim every activation failure is recoverable.

## Proposed acceptance and scope

- AC-014 refined / REQ-004/012 / SCN-005: retained A and later B resume in order after compaction success, preserving original identity/attachments and without duplicating conversation entries or replaying already-consumed work.
- Proposed AC-017 / REQ-012 / SCN-005: after exhaustion, UI shows compaction error plus held input while allowing a later message; no automatic drain until the permitted recovery trigger; another failure retains pending inputs; cancellation stops; no cross-run mixing.
- Verify genuine submission -> server admission -> native core compaction -> held status -> new input -> successful commit -> ordered parent dispatch. Test the explicit non-delivery fact, late/out-of-order terminal events and the distinction between runtime admission and actual parent dispatch. Existing identity/attachment admission must remain intact.
- Existing busy append capability and queue-order tests must remain valid for other runtimes. A new all-runtime queueing UI, persistent offline outbox, queue editor/reorder controls, generic replay of failures and migration of old messages are not proposed for this compaction ticket.
- No new migration is justified by reusing in-memory queue ownership. If durable pending-delivery continuity is desired, investigate and approve that separate requirement before selecting persistence/transition mechanisms; do not infer it from a schema field or silently promise it.

## Approval and next step

Record the user's hold-original-input direction now. Present this bounded server-queue/held-A-then-B flow for confirmation, instead of repeating the earlier abstract “A or B?” question. Do not label the queue extension implemented or the full requirement baseline Approved yet. After confirmation, complete architecture across server queue/core compaction/UI projection and route independent review. Source facts support reuse, but the exact integration is not a trivial flag change.
