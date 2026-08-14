# Compaction Runtime Behavior Examples

## Status And Authority

- **Status:** Approved intended behavior — user approved 2026-08-14, including the later strict fail-closed/manual-retry and non-user deferral clarifications.
- **Purpose:** Make REQ-011–REQ-015 and AC-014–AC-023 concrete without prescribing an arbitrary implementation.
- **Scope:** Trigger-aligned planning, bounded post-compaction behavior, runner-versus-response failure classification, strict fail-closed recovery through a later user-initiated retry, and preservation of non-user inputs while that retry gate is active.
- **Not changed:** The approved Memory Compactor prompt and six-array JSON response contract remain exactly as specified in `memory-compactor-prompt-spec.md`.

## Why These Corrections Are Needed

The current runtime has three independent decisions that must agree but currently do not:

1. **When compaction is requested:** the configured ratio is applied to the model's usable input budget.
2. **How much context the planner retains:** the current planner independently uses a fixed 35% of the input budget.
3. **What happens when the child compactor fails:** a pre-response runner failure currently becomes ordinary text, is parsed as if the model authored invalid JSON, and the unchanged pending operation can be attempted again on the next parent message.

The corrections make those decisions one coherent lifecycle. The configured trigger becomes a real postcondition for planning; only model-authored output is eligible for JSON correction; and any final compaction failure stops the current target-agent turn without an autonomous retry. Canonical memory remains atomic, the pending operation remains available, and a later user-origin turn explicitly initiates one new attempt. Agent/system inputs remain queued rather than being mistaken for that authorization or discarded.

## Example 1 — Ratio Lowered Below The Existing Prompt

**Given**

- usable input budget: `615,744` tokens
- ratio changed from `80%` to `20%`
- new trigger: approximately `123,148` tokens
- current estimated prompt: approximately `249,416` tokens

**Correct behavior**

- The next evaluation requests compaction immediately because `249,416 > 123,148`.
- The planner derives a post-compaction target from the active `123,148` trigger and leaves explicit headroom for the replacement summary and estimation variance.
- One successful operation reduces the estimated prompt below the trigger-derived target.
- Accepted success clears the pending operation but enters an `awaiting actual below-threshold observation` episode; its estimate is not treated as provider usage.
- If the first fresh same-key provider observation is below `123,148`, normal future crossing detection rearms.
- If that first observation is still at/above `123,148`, no second proactive operation starts: emit one inadequate-reduction diagnostic and suppress proactive repeats until an actual-below observation or budget-key change. Hard-cap safety may still override suppression.

**Incorrect current behavior**

- The planner retains approximately `215,510` tokens because of its independent 35% rule, even though that is above the `123,148` trigger.
- The successful result is still over the trigger, so the same parent turn requests another compaction and can repeat.

The exact headroom formula belongs in the reviewed design. The invariant is not optional: the planned result must be below the active trigger, rather than merely below the model's hard input limit.

## Example 2 — A Later, Genuine Threshold Crossing

**Given**

- a previous successful compaction reduced the prompt to approximately `8,755` tokens
- later agent work grows the prompt to approximately `123,520` tokens
- the active trigger is approximately `123,148` tokens

**Correct behavior**

- A new compaction is requested because the prompt was observed below the threshold and later crossed it again.

This is not the rapid-repeat bug. The fix must prevent repeated compactions caused by an inadequate prior reduction without disabling legitimate future compaction after new work accumulates.

## Example 3 — Usable Assistant Output With Invalid JSON

**Given**

- the child compactor request completes normally
- a usable assistant response is captured
- the response contains prose, malformed JSON, the wrong schema, or source-task continuation instead of one valid six-array object

**Correct behavior**

- The host classifies this as a **response-validation failure**.
- The existing bounded response repair is applicable.
- Exactly one correction child may be run.
- Canonical memory is committed only if a schema-valid correction is produced.

**Example response eligible for correction**

```text
I will continue the browser task now and open the project page.
```

The response is usable model output, but it violates the compaction response contract.

## Example 4 — Provider Or Runner Failure Before Any Usable Output

**Given**

- the provider request is rate-limited, times out, loses its connection, is interrupted, or otherwise rolls back before a usable assistant response exists

**Correct behavior**

- The child boundary returns a typed **runner failure** with the original cause and child run ID.
- No JSON extraction or semantic validation is attempted.
- No response-contract correction child is launched, because there is no model-authored response to correct.
- The final diagnostic says that compactor execution failed, not that the model returned invalid JSON.
- The current target-agent turn stops; no target-agent request or tool phase follows the failure.
- The platform schedules no same-turn or background compaction retry.

**Incorrect current behavior**

- The agent loop converts the runner failure into text such as `Error processing your request with the LLM: ...`.
- The collector captures that text as if it were normal assistant output.
- JSON parsing fails, a correction child is launched, and the UI reports a misleading JSON extraction failure.

## Example 5 — User-Initiated Retry After A Fail-Closed Compaction

**Given**

- prompt: approximately `123,520` tokens
- proactive trigger: approximately `123,148` tokens
- hard usable input limit: `615,744` tokens
- compactor runner fails before producing a response

**Correct behavior**

- The operation fails atomically and retains its source traces.
- The failure remains visible with its true classification.
- The current target-agent turn stops and no parent LLM request is dispatched after the failure.
- The agent worker/runtime remains active; this is a failed turn and retry gate, not agent shutdown.
- The platform performs no automatic provider retry, background retry, or correction child for this runner failure.
- When the user later sends `continue`, that new message is the explicit retry signal. The retained pending compaction executes once before the message can reach the target agent.
- If the retry succeeds, the pending operation clears and `continue` proceeds normally. If it fails, the new turn ends with the new truthful error and remains pending for another later user decision.
- The same fail-closed rule applies below the proactive threshold's hard input limit and at the hard input cap; pressure classification remains useful for diagnosis, not for bypassing required compaction.

The user controls retry timing. Repeated distinct user turns can deliberately request repeated attempts, but the platform must never create an autonomous loop. The existing single correction child remains a separate bounded response-validation mechanism and is never used for runner/provider failure.

## Example 6 — The Target Cannot Be Reached

**Given**

- required system instructions, protected tool-protocol messages, or the replacement summary itself leave an irreducible prompt at or above the active trigger-derived target

**Correct behavior**

- The planner reports that the configured target is unattainable for the current protected context.
- The lifecycle ends with one coherent diagnostic outcome.
- It does not issue a rapid sequence of successful compactor calls that cannot satisfy the postcondition.
- It does not discard protected content merely to make the token number fit.

## Example 7 — Existing 80% Behavior Remains Valid

**Given**

- ratio: `80%`
- usable input budget: `615,744` tokens
- trigger: approximately `492,595` tokens

**Correct behavior**

- The trigger calculation remains unchanged.
- The planner may retain less than the maximum permitted context when that preserves recent-context quality and leaves safe headroom.
- Live tool-protocol protection and current atomic commit behavior remain intact.

Trigger alignment is therefore a constraint on the planner, not a requirement to retain exactly the configured percentage.

## Example 8 — Agent Messages Arrive While User Retry Is Required

**Given**

- a final compaction failure has retained the operation in `awaiting_user_retry`
- the normal turn-start queue contains `AGENT-A`, `USER-continue`, `SYSTEM-S`, then `AGENT-B`
- agent delivery can appear either as `InterAgentMessageReceivedEvent` or as `UserMessageReceivedEvent` with `SenderType.AGENT`

**Correct behavior**

- `AGENT-A` and `SYSTEM-S` do not authorize a compaction attempt, start a target-agent turn, emit another compaction error, or reach the target LLM.
- They stay unclaimed in the existing turn-start queue; no second deferred-message store is created.
- The scheduler selects `USER-continue` behind `AGENT-A` because authoritative USER origin is the only eligible recovery signal.
- The retained compaction executes once for that user turn.
- If it fails, the user turn stops and `AGENT-A`, `SYSTEM-S`, and `AGENT-B` remain queued in that relative order.
- If it succeeds, `USER-continue` proceeds in its active turn. After that turn settles, normal FIFO scheduling resumes with `AGENT-A`, `SYSTEM-S`, then `AGENT-B`.
- A newly requested compaction still receives its automatic initial attempt even when the current turn originated from an agent or system message. The USER-only rule begins only after a final failure.
- Runtime shutdown handles the retained entries exactly like other queued turn-start entries; no persisted queue or migration is added.

**Incorrect behavior**

- treating `AGENT-A` as an implicit retry and calling the provider again;
- dropping or consuming `AGENT-A` because dispatch is currently blocked;
- leaving `AGENT-A` at the queue head while also making the scheduler unable to select `USER-continue`; or
- allowing the target agent to process `AGENT-A` without first resolving required compaction.

## Decision Summary

The recommended correction is proportionate because it preserves the existing product model while repairing mismatched boundaries:

- preserve the configurable ratio and hard model input budget;
- preserve the approved structured compactor output and one correction attempt for actual invalid output;
- make the planner honor the threshold that invoked it;
- require an actual below-threshold provider observation—not an accepted estimate—before rearming the same threshold crossing;
- keep runner failures out of the JSON parser;
- stop the current target-agent turn on any final compaction failure;
- retain the pending operation so a later user-origin turn can explicitly retry it once;
- preserve agent/system inputs in the existing queue and let an eligible user entry pass them only to resolve the gate;
- schedule no autonomous provider retry loop;
- preserve canonical-memory atomicity and protected context.
