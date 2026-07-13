# Working-Context Compaction Domain Contract

## Status

`Refined` — the user approved this supplement and the complete solution direction for architecture review on 2026-07-13. Architecture Review Round 1 requested bounded invariant-enforcement clarification under ARCH-PMCS-003; the reconciliation preserves the approved domain contract. This supplement clarifies REQ-PMCS-001 through REQ-PMCS-007, REQ-PMCS-013, REQ-PMCS-019 through REQ-PMCS-020, REQ-PMCS-023, AC-PMCS-001 through AC-PMCS-004, AC-PMCS-016 through AC-PMCS-017, and AC-PMCS-019 through AC-PMCS-021.

## Purpose

This document records the stable meaning of memory compaction that future implementations must understand before changing algorithms:

```text
current WorkingContext
    -> compact
next WorkingContext
    -> replace current context
next LLM request renders the replacement
```

It separates this invariant domain result from the current strategy's prefix/suffix planning and episodic/semantic implementation.

The related replaceable API is defined in `working-context-compaction-strategy-contract.md`.

## Domain Subjects

### WorkingContext

The ordered logical messages that AutoByteus will render for the next LLM request. It is the agent's bounded active context.

The target `WorkingContext` contains only that message subject. It does not contain:

- an epoch or revision;
- a strategy ID;
- strategy checkpoint/generation state;
- episodic/semantic file state;
- compaction-operation state;
- installation/proposal state.

### MemoryManager

The owner of the live `WorkingContext`. It appends normal runtime messages, persists snapshots, supplies a detached context for compaction, and replaces the live context after successful compaction.

It does not know how the selected strategy chose messages, called an agent, stored internal memory, or constructed the result.

### WorkingContextCompactionStrategy

One implementation of the transformation:

```text
WorkingContext -> WorkingContext
```

The current implementation uses structured JSON plus episodic/semantic memory. A future implementation is not required to use those internal subjects.

### Global Strategy Selection

Which strategy performs the transformation is a process/server setting, not part of an agent's working context or agent definition:

```text
AUTOBYTEUS_COMPACTION_STRATEGY
    -> one selected strategy for subsequent compactions across all agents
```

Changing the global value affects the next compaction operation. It does not rewrite an agent's context and does not interrupt or swap a strategy that is already executing.

## Stable Input and Output

### Input

The input is a detached copy of the complete current logical `WorkingContext` at the compaction safe point.

The input is not a preselected prefix and is not a generic evidence DTO. A strategy may inspect the complete context and choose its own transformation.

### Output

The output is another complete `WorkingContext` that can replace the input for the next LLM request.

The output may contain:

- one compacted-memory user message plus retained messages, as the current strategy does;
- one compacted-memory message containing the entire continuation state;
- several replacement-body messages produced by a future strategy.

The framework does not impose one universal episodic/semantic or prefix/suffix output shape.

## Universal Invariants

Every successful strategy output must satisfy these invariants:

1. It is a complete replacement, not a patch to be merged by `MemoryManager`.
2. The maximal leading run of required system/head messages from the input remains present, in the same order, and logically unchanged in role, content, reasoning, media, tool payload, and metadata/provenance.
3. Every message has a valid provider-neutral role/payload shape, and each supported provider renderer is covered by strategy/integration tests for the resulting sequence.
4. No tool-result message is orphaned from its matching assistant tool call.
5. A complete retained tool interaction is retained as a complete unit.
6. The replacement contains enough task state for the agent to continue coherently.
7. The replacement is smaller/bounded sufficiently for the next LLM request under the active strategy's budget policy.
8. The returned object is a distinct `WorkingContext` detached from both the strategy input and the manager's live context.

These are validation/behavioral rules. They are not a generic `constraints` object passed into every strategy.

### Enforcement Split

The framework can prove structural safety before installation, but it cannot generically prove whether a summary retained every important fact or achieved good compression. Ownership is therefore explicit:

| Invariant | Enforcement Owner | Enforcement Time |
| --- | --- | --- |
| Complete replacement | `WorkingContext` return type plus `MemoryManager.replaceWorkingContext` replacement semantics | Runtime |
| Required leading system/head messages unchanged | `WorkingContextCompactionOutputValidator` | Runtime, after `compact` and before replacement |
| Provider-neutral message role/payload validity | `WorkingContextCompactionOutputValidator` | Runtime, before replacement |
| No orphaned tool result; every retained tool-call group complete; nonblank IDs unique within each assistant batch; no duplicate result within a group; role/payload match | `WorkingContextCompactionOutputValidator` | Runtime, before replacement |
| Distinct/detached value | `WorkingContext` deep-copy construction plus `WorkingContextCompactionOutputValidator` identity check | Runtime, before replacement |
| Enough task state for coherent continuation | Each strategy's implementation, deterministic scenario tests, and broader API/E2E evaluation | Strategy/test enforced |
| Sufficient size reduction under the active strategy budget | Each strategy's budget logic and focused budget/next-render tests | Strategy/test enforced |
| Provider-specific render quality | Supported renderer integration/API-E2E coverage | Test enforced; normal render remains authoritative |

`WorkingContextCompactionOutputValidator` accepts a stable pre-call baseline, the detached value actually passed to the strategy, and the returned context directly. It does not receive a generic constraints DTO and does not return a proposal/result wrapper.

Pre-install sequence:

```text
baseline = MemoryManager.getWorkingContext()
strategyInput = baseline.copy()
next = await strategy.compact(strategyInput)
WorkingContextCompactionOutputValidator.assertValid(baseline, strategyInput, next)
MemoryManager.replaceWorkingContext(next)
```

The separate baseline is necessary because `WorkingContext` remains a practical mutable value for manager-owned append/enrichment operations. A strategy may mutate its detached input without touching live state, but that mutation must not redefine the original required head used for validation.

If validation fails, replacement is never called, the live context and pending request remain unchanged, the failed lifecycle identifies the violated invariant, and completed is not emitted. Strategy-owned durable side effects that occurred before an invalid return are not rolled back; that pre-existing non-transactional risk remains outside this structural ticket.

## Compaction Safe Point

Current normal tool-calling order is:

```text
LLM emits assistant tool call
    -> compaction may be requested, but does not run yet
    -> tool executes
    -> matching tool result is ingested
    -> pending compaction runs
    -> next LLM request renders the replacement context
```

Therefore, normal strategy input contains no live tool execution. A matching assistant call and tool result are one atomic logical unit.

```text
[assistant tool call][matching tool result]
```

The current strategy may retain this pair or compact an earlier complete pair according to its current window policy. It must not retain only the result or only the call.

## Current Structured-JSON Strategy Partition

The following partition is important for understanding the current strategy, but it is not the universal strategy contract:

```text
H = system/head messages
Q = previous synthetic compacted-memory message, if present
P = settled earlier messages selected for compaction
R = recent settled messages retained exactly/logically unchanged
T = protected tool-protocol group at the suffix, when current planning retains it
```

Current strategy input:

```text
[ H ][ Q ][ P ][ R ][ T ]
```

Current strategy output:

```text
[ H ][ Qnext ][ R ][ T ]
```

Meaning of each part:

- **H — System/head:** instructions and system context needed by the next render. The current strategy preserves them.
- **Q — Previous compacted memory:** a synthetic user message derived during an earlier compaction. It is replaceable context, not a new user event to append again.
- **P — Compactable settled prefix:** earlier user, assistant, and complete tool-interaction units chosen by the current window planner.
- **R — Retained recent suffix:** recent local conversation kept so the next LLM can continue with immediate detail that should not be summarized yet.
- **T — Protected tool-protocol suffix:** a complete/current tool interaction retained atomically by current planning. Normal compaction waits for terminal tool results before execution.
- **Qnext — Next compacted memory:** the current strategy's derived compacted-memory user message after processing `P` and its internal durable memory.

Another strategy may choose no `P/R` window at all. For example, it could transform the entire eligible body into one new compacted-memory message while still satisfying the universal invariants.

## First-Compaction Example

Before the first compaction:

```text
SYSTEM: You are a coding agent working on authentication.
USER: Investigate the refresh-token failure.
ASSISTANT: I found a race in token-service.ts.
USER: Fix it without changing the database schema.
ASSISTANT: The code is fixed and unit tests pass.
USER: Now run integration verification.
```

One possible current-strategy partition:

```text
H = SYSTEM
Q = absent
P = first two user/assistant work exchanges
R = USER: Now run integration verification.
T = absent
```

After current-strategy compaction:

```text
SYSTEM: You are a coding agent working on authentication.
USER [compacted_memory]:
  The refresh-token race in token-service.ts was fixed without a database
  schema change. Unit tests pass. Integration verification remains.
USER: Now run integration verification.
```

Two consecutive logical user messages are allowed in the working context. The first is synthetic memory and the second is the retained real user request. Provider renderers remain responsible for any provider-specific formatting.

## Second-Compaction Example

Assume work continues:

```text
SYSTEM
USER [Q1 compacted_memory]
USER: Now run integration verification.
ASSISTANT: Integration test A passed; test B failed because the fixture is stale.
USER: Repair only the fixture.
ASSISTANT: Fixture repaired and the integration suite now passes.
```

At the next current-strategy compaction, `Q1` is not accumulated as a second permanent memory message. The current strategy uses its internal memory state and new settled work to create `Q2`:

```text
SYSTEM
USER [Q2 compacted_memory]:
  The refresh-token race in token-service.ts was fixed without a schema
  change. Unit and integration tests now pass; a stale fixture was repaired.
```

The result again contains one current synthetic compacted-memory message, not `Q1 + Q2` as two growing summaries.

## Current Strategy's Internal Memory

The current strategy internally performs:

```text
selected prefix/tool-safe units
    -> structured JSON from one compaction agent
    -> episodic and semantic memory writes
    -> bounded retrieval
    -> compacted-memory user message
    -> reconstructed WorkingContext
```

This explains why current compacted memory contains a selected projection of episodic/semantic information. It does not make episodic and semantic memory mandatory outputs of the `WorkingContextCompactionStrategy` interface.

Procedural memory/skill improvement is a different domain and is outside this ticket.

## Failure Contract

- Until a strategy returns and the framework validates it successfully, the live `WorkingContext` remains owned and installed by `MemoryManager`.
- A thrown strategy error does not provide a partial replacement.
- A returned context that changes/removes required leading head messages, violates canonical message/tool structure, contains incomplete/orphaned tool protocol, or aliases the input is rejected before replacement.
- Validation failure leaves the pending compaction request in place, emits failed with the violated invariant, and never emits completed.
- `MemoryManager` replaces only with the complete framework-validated returned `WorkingContext`.
- Internal strategy files/checkpoints, if any, are strategy-owned and do not appear in the outer context API.

## Epoch Decision

`epochId` is not part of this contract.

Current evidence shows that it increments only on reset, does not cover append mutations, and has no behavioral reader. The compaction lifecycle is awaited before the next request proceeds. Therefore this ticket removes it rather than pretending it is an optimistic-concurrency protocol.

If a future runtime introduces genuine concurrent working-context mutation, that future design must establish concurrency control at the actual lifecycle owner. It must not leak a speculative epoch into every compression strategy.

## Human-Memory Analogy Boundary

The functional analogy is limited but useful:

- working context resembles bounded active attention;
- episodic memory records what happened;
- semantic memory records durable facts;
- skills/procedural memory record how to perform work;
- compaction prepares a smaller active context so work can continue.

This ticket models the functional continuation result, not biological memory mechanisms.

## Approval

The user approved this domain contract and explicitly authorized architecture review on 2026-07-13. ARCH-PMCS-003 adds the pre-install enforcement split without changing the approved context-to-context contract. Architecture re-review is authorized.
